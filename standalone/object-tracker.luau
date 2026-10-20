-- Object Tracker standalone: only local object discovery and visualization.
-- Paste into a LocalScript in StarterPlayerScripts, then Play.
-- No executor, HTTP, hooks, loadstring, teleport, or server remotes required.
-- BEGIN TRACKER CORE (also loaded verbatim by the automated tests)
local function createTracker(deps)
    local Tracker = {}
    Tracker.__index = Tracker
    local folds = {}
    for base, chars in pairs({
        a = "áàảãạăắằẳẵặâấầẩẫậÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬ",
        e = "éèẻẽẹêếềểễệÉÈẺẼẸÊẾỀỂỄỆ", i = "íìỉĩịÍÌỈĨỊ",
        o = "óòỏõọôốồổỗộơớờởỡợÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢ",
        u = "úùủũụưứừửữựÚÙỦŨỤƯỨỪỬỮỰ", y = "ýỳỷỹỵÝỲỶỸỴ", d = "đĐ",
    }) do
        for _, cp in utf8.codes(chars) do folds[cp] = base end
    end
    local function normalize(value)
        local text, out = tostring(value or ""), {}
        local ok = pcall(function()
            for _, cp in utf8.codes(text) do
                -- Ignore decomposed combining accents as well as precomposed Vietnamese.
                if cp < 0x300 or cp > 0x36F then
                    out[#out + 1] = folds[cp] or utf8.char(cp)
                end
            end
        end)
        if not ok then out = {text} end
        return (table.concat(out):lower():gsub("%s+", " "):gsub("^%s+", ""):gsub("%s+$", ""))
    end
    local function parse(query)
        local terms, seen = {}, {}
        for raw in tostring(query or ""):gmatch("[^,;\n]+") do
            local value = normalize(raw)
            local isPath = value:find(".", 1, true) or value:find("/", 1, true) or value:find("\\", 1, true)
            if isPath then
                value = value:gsub("[/\\]", "."):gsub("^game%.", "")
                value = value:gsub("%s*%.%s*", ".")
                if value:sub(1, 10) ~= "workspace." and value ~= "workspace" then
                    value = "workspace." .. value
                end
            end
            if value ~= "" and not seen[value] then
                seen[value] = true
                terms[#terms + 1] = {value = value, path = not not isPath}
            end
        end
        return terms
    end
    local function finite(n) return type(n) == "number" and n == n and n ~= math.huge and n ~= -math.huge end
    local function live(inst) return inst and inst:IsDescendantOf(deps.root) end
    local function partOf(inst)
        if inst:IsA("BasePart") then return inst end
        if inst:IsA("Model") or inst:IsA("Folder") then
            if inst:IsA("Model") and inst.PrimaryPart and inst.PrimaryPart:IsDescendantOf(inst) then
                return inst.PrimaryPart
            end
            return inst:FindFirstChildWhichIsA("BasePart", true)
        end
        return nil
    end
    local function pathOf(inst)
        local names, cur = {}, inst
        while cur and cur ~= deps.root do
            table.insert(names, 1, cur.Name)
            cur = cur.Parent
        end
        table.insert(names, 1, "Workspace")
        return table.concat(names, ".")
    end
    function Tracker.new()
        return setmetatable({
            enabled = false, destroyed = false, query = "", terms = {},
            maxDistance = 0, maxItems = 50, scanBudget = 150, sliceSeconds = 0.002,
            skipPlayers = true, showBox = false, showLabel = true, showXYZ = true,
            throughWalls = true, colorIndex = 1, items = {}, list = {},
            stack = nil, hits = {}, found = 0, scanElapsed = 0, labelElapsed = 0,
            refreshEvery = 1, lastError = nil,
        }, Tracker)
    end
    function Tracker:clear()
        for inst, marker in pairs(self.items) do
            deps.removeMarker(marker)
            self.items[inst] = nil
        end
        self.list, self.hits, self.stack, self.found = {}, {}, nil, 0
        self.scanElapsed = 0
    end
    function Tracker:setQuery(query)
        if self.destroyed then return false end
        self.query, self.terms = tostring(query or ""), parse(query)
        self:clear() -- Drop stale markers immediately, including during a partial scan.
        if #self.terms == 0 then self.enabled = false end
        if self.enabled then self:beginScan() end
        return #self.terms > 0
    end
    function Tracker:setEnabled(enabled)
        if self.destroyed then return false end
        self.enabled = enabled == true and #self.terms > 0
        self:clear()
        if self.enabled then self:beginScan() end
        return self.enabled
    end
    function Tracker:setDistance(raw)
        if self.destroyed then return false end
        local value = tonumber(raw)
        if not finite(value) or value < 0 then return false end
        self.maxDistance = value
        self:clear()
        if self.enabled then self:beginScan() end
        return true
    end
    function Tracker:matches(inst)
        local name, path = normalize(inst.Name), nil
        for _, term in ipairs(self.terms) do
            if term.path then
                path = path or normalize(pathOf(inst))
                if path == term.value then return true end
            elseif name:find(term.value, 1, true) then return true end
        end
        return false
    end
    function Tracker:isCharacter(inst)
        if not self.skipPlayers then return false end
        for _, player in ipairs(deps.players:GetPlayers()) do
            local char = player.Character
            if char and (inst == char or inst:IsDescendantOf(char)) then return true end
        end
        return false
    end
    function Tracker:beginScan()
        if not self.enabled or self.destroyed then return false end
        self.stack, self.hits, self.found = {deps.root}, {}, 0
        self.origin = deps.getOrigin()
        self.scanElapsed = 0
        return true
    end
    function Tracker:addHit(inst, part)
        local distance = self.origin and (part.Position - self.origin).Magnitude or nil
        -- A missing character/camera must not make every distance look like zero.
        if self.maxDistance > 0 and (not distance or distance > self.maxDistance) then return end
        self.found = self.found + 1
        local hit = {inst = inst, part = part, distance = distance, path = pathOf(inst)}
        local index = #self.hits + 1
        for i, old in ipairs(self.hits) do
            if (distance or math.huge) < (old.distance or math.huge) then index = i; break end
        end
        if index <= self.maxItems then
            table.insert(self.hits, index, hit)
            if #self.hits > self.maxItems then table.remove(self.hits) end
        end
    end
    function Tracker:finishScan()
        local keep, list = {}, {}
        for _, hit in ipairs(self.hits) do
            if live(hit.inst) and live(hit.part) and not self:isCharacter(hit.inst) then
                keep[hit.inst] = true
                list[#list + 1] = hit
            end
        end
        for inst, marker in pairs(self.items) do
            if not keep[inst] then deps.removeMarker(marker); self.items[inst] = nil end
        end
        for _, hit in ipairs(list) do
            if not self.items[hit.inst] then self.items[hit.inst] = deps.createMarker(hit) end
        end
        self.list, self.stack, self.hits = list, nil, {}
        self:refreshMarkers()
    end
    function Tracker:scanSlice()
        if not self.stack then return end
        local started, count = deps.now(), 0
        while #self.stack > 0 do
            local inst = table.remove(self.stack)
            if inst == deps.root or live(inst) then
                local ignored = (deps.ignore and deps.ignore(inst)) or self:isCharacter(inst)
                if not ignored then
                    local grouped = false
                    if inst ~= deps.root and self:matches(inst) then
                        local part = partOf(inst)
                        if part and live(part) then
                            self:addHit(inst, part)
                            -- One marker for a matching Model, not one per child part.
                            grouped = inst:IsA("Model")
                        end
                    end
                    if not grouped then
                        -- A child cursor avoids pushing an entire wide tree onto the stack at once.
                        -- GetChildren itself is a Roblox native call and cannot be time-sliced.
                        local kids = inst:GetChildren()
                        if #kids > 0 then
                            self.stack[#self.stack + 1] = {children = kids, index = 1}
                        end
                    end
                end
            end
            count = count + 1
            -- Expand one child cursor per iteration rather than visiting all siblings.
            while #self.stack > 0 and type(self.stack[#self.stack]) == "table" and self.stack[#self.stack].children do
                local cursor = self.stack[#self.stack]
                local child = cursor.children[cursor.index]
                cursor.index = cursor.index + 1
                if not child then table.remove(self.stack) else
                    self.stack[#self.stack + 1] = child
                    break
                end
            end
            if count >= self.scanBudget or deps.now() - started >= self.sliceSeconds then break end
        end
        if #self.stack == 0 then self:finishScan() end
    end
    function Tracker:refreshMarkers()
        local origin, list = deps.getOrigin(), {}
        for _, hit in ipairs(self.list) do
            local part = live(hit.inst) and partOf(hit.inst) or nil
            if part and live(part) and not self:isCharacter(hit.inst) then
                hit.part, hit.path = part, pathOf(hit.inst)
                hit.distance = origin and (part.Position - origin).Magnitude or nil
                local visible = self.maxDistance == 0 or (hit.distance ~= nil and hit.distance <= self.maxDistance)
                local marker = self.items[hit.inst]
                if marker then deps.updateMarker(marker, hit, self, visible) end
                list[#list + 1] = hit
            else
                local marker = self.items[hit.inst]
                if marker then deps.removeMarker(marker); self.items[hit.inst] = nil end
            end
        end
        self.list = list
    end
    function Tracker:step(dt)
        if not self.enabled or self.destroyed then return end
        if not finite(dt) or dt < 0 then return end
        self.scanElapsed, self.labelElapsed = self.scanElapsed + dt, self.labelElapsed + dt
        if not self.stack and self.scanElapsed >= self.refreshEvery then self:beginScan() end
        self:scanSlice()
        if self.labelElapsed >= 0.15 then self.labelElapsed = 0; self:refreshMarkers() end
    end
    function Tracker:destroy()
        if self.destroyed then return end
        self.enabled, self.destroyed = false, true
        self:clear()
    end
    Tracker.normalize, Tracker.parse, Tracker.pathOf = normalize, parse, pathOf
    return Tracker.new()
end
-- END TRACKER CORE

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")
local player = Players.LocalPlayer
assert(player, "Object Tracker phải chạy phía client (LocalScript).")
local playerGui = player:WaitForChild("PlayerGui")
local GUI_NAME = "StandaloneObjectTracker"
local previous = playerGui:FindFirstChild(GUI_NAME)
if previous then
    local stop = previous:FindFirstChild("StopTracker")
    if stop and stop:IsA("BindableEvent") then stop:Fire() end
    previous:Destroy()
end
local function new(class, props, parent)
    local obj = Instance.new(class)
    for key, value in pairs(props or {}) do obj[key] = value end
    obj.Parent = parent
    return obj
end
local gui = new("ScreenGui", {Name = GUI_NAME, ResetOnSpawn = false,
    ZIndexBehavior = Enum.ZIndexBehavior.Sibling}, playerGui)
local stopEvent = new("BindableEvent", {Name = "StopTracker"}, gui)
local effects = new("Folder", {Name = "ObjectTrackerLocalEffects"}, workspace)
local connections, stopped = {}, false
local cleanupRows = function() end
local palette = {Color3.fromRGB(0, 190, 255), Color3.fromRGB(80, 255, 160),
    Color3.fromRGB(255, 185, 60), Color3.fromRGB(230, 110, 255)}
local function origin()
    local char = player.Character
    local root = char and char:FindFirstChild("HumanoidRootPart")
    if root then return root.Position end
    return workspace.CurrentCamera and workspace.CurrentCamera.CFrame.Position or nil
end
local tracker = createTracker({
    root = workspace, players = Players, getOrigin = origin, now = os.clock,
    ignore = function(inst) return inst == effects or inst:IsDescendantOf(effects) end,
    createMarker = function(hit)
        local container = new("Folder", {Name = "Marker"}, effects)
        local hl = new("Highlight", {Adornee = hit.inst, FillTransparency = 0.7,
            OutlineTransparency = 0}, container)
        local box = new("BoxHandleAdornment", {Adornee = hit.part, Transparency = 0.65,
            ZIndex = 1}, container)
        local bb = new("BillboardGui", {Adornee = hit.part, Size = UDim2.fromOffset(240, 52),
            StudsOffsetWorldSpace = Vector3.new(0, 3, 0)}, container)
        local label = new("TextLabel", {Size = UDim2.fromScale(1, 1), BackgroundTransparency = 1,
            Font = Enum.Font.GothamBold, TextSize = 12, TextStrokeTransparency = 0.25,
            TextWrapped = true, RichText = false}, bb)
        return {container = container, hl = hl, box = box, bb = bb, label = label}
    end,
    removeMarker = function(marker) marker.container:Destroy() end,
    updateMarker = function(marker, hit, state, visible)
        local color = palette[state.colorIndex] or palette[1]
        -- Folders cannot be Highlight adornees: use their representative BasePart.
        marker.hl.Adornee = hit.inst:IsA("Folder") and hit.part or hit.inst
        marker.hl.Enabled = visible
        marker.hl.FillColor, marker.hl.OutlineColor = color, color
        marker.hl.DepthMode = state.throughWalls and Enum.HighlightDepthMode.AlwaysOnTop or Enum.HighlightDepthMode.Occluded
        marker.box.Adornee, marker.box.Size = hit.part, hit.part.Size + Vector3.new(0.1, 0.1, 0.1)
        marker.box.Visible, marker.box.Color3 = visible and state.showBox, color
        marker.box.AlwaysOnTop = state.throughWalls
        marker.bb.Adornee, marker.bb.Enabled = hit.part, visible and state.showLabel
        marker.bb.AlwaysOnTop = state.throughWalls
        local distance = hit.distance and string.format("%.1f stud", hit.distance) or "? stud"
        local text = hit.inst.Name .. " | " .. distance
        if state.showXYZ then
            local p = hit.part.Position
            text = text .. string.format("\nX %.1f  Y %.1f  Z %.1f", p.X, p.Y, p.Z)
        end
        marker.label.Text, marker.label.TextColor3 = text, color
    end,
})
local function connect(signal, fn)
    local connection = signal:Connect(fn)
    connections[#connections + 1] = connection
    return connection
end
local function shutdown()
    if stopped then return end
    stopped = true
    for _, connection in ipairs(connections) do connection:Disconnect() end
    tracker:destroy()
    cleanupRows()
    effects:Destroy()
    gui:Destroy()
end
connect(stopEvent.Event, shutdown)
connect(gui.Destroying, shutdown)
if script and script.Destroying then connect(script.Destroying, shutdown) end
local bg, surface, ink = Color3.fromRGB(17, 21, 30), Color3.fromRGB(35, 44, 60), Color3.fromRGB(230, 237, 248)
local panel = new("Frame", {Size = UDim2.fromOffset(520, 480), Position = UDim2.new(0.5, -260, 0.5, -240),
    BackgroundColor3 = bg, BorderSizePixel = 0}, gui)
new("UICorner", {CornerRadius = UDim.new(0, 12)}, panel)
local scale = new("UIScale", {Scale = 1}, panel)
local function fit()
    local camera = workspace.CurrentCamera
    if camera then scale.Scale = math.min(1, math.max(0.1, math.min(camera.ViewportSize.X / 540, camera.ViewportSize.Y / 500))) end
    -- Keep the menu reachable after dragging or changing viewport size.
    if camera then
        local view = camera.ViewportSize
        local limitX = math.max(0, (view.X - 520 * scale.Scale) / 2)
        local limitY = math.max(0, (view.Y - 480 * scale.Scale) / 2)
        panel.Position = UDim2.new(0.5, math.max(-limitX, math.min(limitX, panel.Position.X.Offset)),
            0.5, math.max(-limitY, math.min(limitY, panel.Position.Y.Offset)))
    end
end
panel.AnchorPoint, panel.Position = Vector2.new(0.5, 0.5), UDim2.fromScale(0.5, 0.5)
local function label(text, x, y, w, h, parent)
    return new("TextLabel", {Position = UDim2.fromOffset(x, y), Size = UDim2.fromOffset(w, h),
        Text = text, TextColor3 = ink, Font = Enum.Font.Gotham, TextSize = 12,
        BackgroundTransparency = 1, TextXAlignment = Enum.TextXAlignment.Left,
        TextWrapped = true, RichText = false}, parent or panel)
end
local function button(text, x, y, w, callback)
    local b = new("TextButton", {Position = UDim2.fromOffset(x, y), Size = UDim2.fromOffset(w, 28),
        Text = text, TextColor3 = ink, Font = Enum.Font.GothamBold, TextSize = 11,
        BackgroundColor3 = surface, BorderSizePixel = 0}, panel)
    new("UICorner", {CornerRadius = UDim.new(0, 6)}, b)
    connect(b.Activated, callback)
    return b
end
local function input(text, hint, x, y, w)
    local box = new("TextBox", {Position = UDim2.fromOffset(x, y), Size = UDim2.fromOffset(w, 30),
        Text = text, PlaceholderText = hint, ClearTextOnFocus = false, TextColor3 = ink,
        PlaceholderColor3 = Color3.fromRGB(145, 156, 178), Font = Enum.Font.Gotham, TextSize = 12,
        BackgroundColor3 = surface, BorderSizePixel = 0}, panel)
    new("UICorner", {CornerRadius = UDim.new(0, 6)}, box)
    return box
end
local title = label("ĐỊNH VỊ VẬT THỂ · kéo thanh này để di chuyển", 12, 4, 418, 32)
title.Active = true
local restore = new("TextButton", {Position = UDim2.fromOffset(12, 12), Size = UDim2.fromOffset(135, 32),
    Text = "Mở định vị vật thể", Visible = false, BackgroundColor3 = surface,
    TextColor3 = ink, TextSize = 12}, gui)
connect(restore.Activated, function() panel.Visible = true; restore.Visible = false end)
button("_", 438, 8, 30, function() panel.Visible = false; restore.Visible = true end)
button("X", 476, 8, 30, shutdown)
label("Tên chứa từ khóa; nhiều mục cách nhau bằng dấu , hoặc ;", 12, 40, 496, 22)
local query = input("", "VD: cây, rương; Workspace.Map.Chest", 12, 66, 496)
local status = label("Nhập tên/path rồi bấm Bật. X = dừng và dọn sạch.", 12, 204, 496, 38)
local detail = label("Chọn một dòng để xem đường dẫn và tọa độ (có thể chọn/copy ô bên dưới).", 12, 386, 496, 36)
local copyBox = input("", "Thông tin vật được chọn", 12, 428, 496)
copyBox.TextEditable = false
local selected, rows, toggle, viewObjects = nil, {}, nil, {}
local function paintToggle() toggle.Text = tracker.enabled and "Định vị: BẬT" or "Định vị: TẮT" end
local function applyQuery()
    tracker:setQuery(query.Text)
    tracker:setEnabled(true)
    paintToggle()
    selected, viewObjects = nil, {}
end
toggle = button("Định vị: TẮT", 12, 104, 156, function()
    if tracker.enabled then tracker:setEnabled(false) else applyQuery() end
    paintToggle()
end)
button("Quét lại", 176, 104, 156, function()
    if query.Text ~= tracker.query then applyQuery() elseif tracker.enabled then tracker:beginScan() end
end)
button("Xóa kết quả", 340, 104, 168, function()
    query.Text = ""; tracker:setQuery(""); selected = nil; paintToggle()
end)
connect(query.FocusLost, function(enter) if enter then applyQuery() end end)
local function option(text, field, x, y, w)
    local b
    local function paint() b.Text = text .. (tracker[field] and ": BẬT" or ": TẮT") end
    b = button("", x, y, w, function()
        tracker[field] = not tracker[field]
        if field == "skipPlayers" then
            tracker:clear()
            if tracker.enabled then tracker:beginScan() end
        else tracker:refreshMarkers() end
        paint()
    end)
    paint()
end
option("Hộp", "showBox", 12, 140, 108)
option("Nhãn", "showLabel", 128, 140, 108)
option("XYZ", "showXYZ", 244, 140, 108)
option("Xuyên tường", "throughWalls", 360, 140, 148)
option("Bỏ người chơi", "skipPlayers", 12, 176, 156)
local colorButton
colorButton = button("Màu: 1", 176, 176, 100, function()
    tracker.colorIndex = tracker.colorIndex % #palette + 1
    colorButton.Text = "Màu: " .. tracker.colorIndex
    tracker:refreshMarkers()
end)
local distance = input("0", "Stud; 0 = vô hạn", 284, 176, 142)
button("Đặt xa", 434, 176, 74, function()
    if not tracker:setDistance(distance.Text) then status.Text = "Khoảng cách phải là số hữu hạn >= 0." end
end)
local listGui = new("ScrollingFrame", {Position = UDim2.fromOffset(12, 248), Size = UDim2.fromOffset(496, 132),
    BackgroundColor3 = surface, BorderSizePixel = 0, ScrollBarThickness = 5,
    CanvasSize = UDim2.fromOffset(0, 0)}, panel)
local function renderList()
    local changed = #viewObjects ~= #tracker.list
    for i, hit in ipairs(tracker.list) do
        if viewObjects[i] ~= hit.inst then changed = true end
    end
    if changed then
        viewObjects = {}
        for i, hit in ipairs(tracker.list) do viewObjects[i] = hit.inst end
        for _, row in ipairs(rows) do row.connection:Disconnect(); row.button:Destroy() end
        rows = {}
        for i, hit in ipairs(tracker.list) do
            local inst = hit.inst
            local b = new("TextButton", {Position = UDim2.fromOffset(4, (i - 1) * 28), Size = UDim2.new(1, -12, 0, 26),
                BackgroundColor3 = bg, TextColor3 = ink, Font = Enum.Font.Gotham, TextSize = 11,
                TextXAlignment = Enum.TextXAlignment.Left, RichText = false}, listGui)
            local connection = b.Activated:Connect(function() selected = inst end)
            rows[#rows + 1] = {button = b, connection = connection}
        end
        listGui.CanvasSize = UDim2.fromOffset(0, #rows * 28)
    end
    for i, hit in ipairs(tracker.list) do
        rows[i].button.Text = string.format("%d. %s | %s stud", i, hit.inst.Name,
            hit.distance and string.format("%.1f", hit.distance) or "?")
    end
    local found
    for _, hit in ipairs(tracker.list) do if hit.inst == selected then found = hit; break end end
    if found then
        local p = found.part.Position
        detail.Text = found.inst.Name .. " · " .. found.inst.ClassName
        copyBox.Text = string.format("%s | X %.3f, Y %.3f, Z %.3f", found.path, p.X, p.Y, p.Z)
    else
        selected = nil; detail.Text = "Chọn một dòng để xem path và XYZ. Khoảng cách tính bằng stud."
        copyBox.Text = ""
    end
end
-- Row signals are tracked separately to avoid an ever-growing connection registry.
cleanupRows = function()
    for _, row in ipairs(rows) do row.connection:Disconnect() end
    rows = {}
end
local dragging, dragInput, dragStart, startPosition
connect(title.InputBegan, function(i)
    if i.UserInputType == Enum.UserInputType.MouseButton1 or i.UserInputType == Enum.UserInputType.Touch then
        dragging, dragInput, dragStart, startPosition = true, i, i.Position, panel.Position
    end
end)
connect(UserInputService.InputChanged, function(i)
    if dragging and (i.UserInputType == Enum.UserInputType.MouseMovement or i == dragInput) then
        local d = i.Position - dragStart
        panel.Position = UDim2.new(startPosition.X.Scale, startPosition.X.Offset + d.X,
            startPosition.Y.Scale, startPosition.Y.Offset + d.Y)
    end
end)
connect(UserInputService.InputEnded, function(i)
    if i == dragInput then dragging, dragInput = false, nil end
end)
connect(UserInputService.InputBegan, function(i, processed)
    if not processed and i.KeyCode == Enum.KeyCode.RightControl then
        panel.Visible = not panel.Visible; restore.Visible = not panel.Visible
    end
end)
local uiElapsed = 0
connect(RunService.Heartbeat, function(dt)
    local ok, err = pcall(function()
        tracker:step(dt)
        uiElapsed = uiElapsed + dt
        if uiElapsed >= 0.25 then
            uiElapsed = 0
            fit(); renderList(); paintToggle()
            status.Text = string.format("%s | %d/%d vật | tối đa %d | %s",
                tracker.enabled and "BẬT" or "TẮT", #tracker.list, tracker.found, tracker.maxItems,
                tracker.stack and "đang quét..." or "tự quét mỗi giây")
        end
    end)
    if not ok then
        tracker.lastError = tostring(err)
        tracker:setEnabled(false)
        status.Text = "Lỗi: " .. tostring(err)
        warn("[ObjectTracker] " .. tostring(err))
    end
end)
fit()
