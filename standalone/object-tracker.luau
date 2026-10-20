-- Object Tracker standalone: only local object discovery and visualization.
-- Paste into a LocalScript in StarterPlayerScripts, then Play.
-- No executor, HTTP, hooks, loadstring, teleport, or server remotes required.
-- BEGIN TRACKER CORE (also loaded verbatim by the automated tests)
local function createTracker(deps)
    local Tracker = {}
    Tracker.__index = Tracker
    -- Name aliases are configurable hints, not a guarantee about a game's internals.
    local presets = {
        {name = "Rush", aliases = {"Rush", "RushMoving"}},
        {name = "Ambush", aliases = {"Ambush", "AmbushMoving"}},
        {name = "Eyes", aliases = {"Eyes"}},
        {name = "Screech", aliases = {"Screech"}},
        {name = "Figure", aliases = {"Figure", "FigureRig"}},
        {name = "Seek", aliases = {"Seek", "SeekMoving", "SeekRig"}},
        {name = "Dupe", aliases = {"Dupe", "DupeRig"}},
        {name = "Halt", aliases = {"Halt", "HaltMoving", "Shade"}},
        {name = "Hide", aliases = {"Hide"}},
        {name = "Timothy", aliases = {"Timothy"}},
        {name = "Sally (Window)", aliases = {"Sally", "Window", "WindowEntity", "Sally (Window)"}},
        {name = "Dread", aliases = {"Dread"}},
        {name = "Jeff", aliases = {"Jeff"}},
        {name = "El Goblino", aliases = {"El Goblino", "ElGoblino", "El_Goblino"}},
        {name = "Bob", aliases = {"Bob"}},
        {name = "Jack", aliases = {"Jack"}},
        {name = "Moonlight", aliases = {"Moonlight"}},
        {name = "Weirdo", aliases = {"Weirdo"}},
        {name = "Glitch", aliases = {"Glitch"}},
        {name = "Void", aliases = {"Void"}},
        {name = "Red Barrier", aliases = {"Red Barrier", "RedBarrier", "Red_Barrier"}},
        {name = "Snare", aliases = {"Snare"}},
        {name = "Fallen Chandeliers", aliases = {"Fallen Chandeliers", "FallenChandeliers", "FallenChandelier", "ChandelierFallen"}},
    }
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
            presets = presets, selectedPresets = {}, disabledObjects = setmetatable({}, {__mode = "k"}),
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
        local seen = {}
        for _, preset in ipairs(self.presets) do
            if self.selectedPresets[preset.name] then
                for _, alias in ipairs(preset.aliases) do
                    local value = normalize(alias)
                    if not seen[value] then
                        seen[value] = true
                        self.terms[#self.terms + 1] = {value = value, exact = true}
                    end
                end
            end
        end
        self:clear() -- Drop stale markers immediately, including during a partial scan.
        if #self.terms == 0 then self.enabled = false end
        if self.enabled then self:beginScan() end
        return #self.terms > 0
    end
    function Tracker:setPreset(name, enabled)
        if self.destroyed then return false end
        local exists = false
        for _, preset in ipairs(self.presets) do if preset.name == name then exists = true; break end end
        if not exists then return false end
        self.selectedPresets[name] = enabled == true or nil
        self:setQuery(self.query)
        return true
    end
    function Tracker:setAllPresets(enabled)
        if self.destroyed then return false end
        self.selectedPresets = {}
        if enabled then
            for _, preset in ipairs(self.presets) do self.selectedPresets[preset.name] = true end
        end
        self:setQuery(self.query)
        return true
    end
    function Tracker:setObjectEnabled(inst, enabled)
        if self.destroyed or not inst then return false end
        self.disabledObjects[inst] = enabled ~= true or nil
        self:refreshMarkers()
        return true
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
            elseif term.exact then
                if name == term.value then return true end
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
                visible = visible and not self.disabledObjects[hit.inst]
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
-- NOIR shell: one player tab, with only the object tracker inside it.
local C = {
    BG = Color3.fromRGB(11, 12, 17), SURFACE = Color3.fromRGB(20, 22, 30),
    SURFACE2 = Color3.fromRGB(29, 32, 43), SURFACE3 = Color3.fromRGB(44, 49, 64),
    BORDER = Color3.fromRGB(60, 66, 84), MUTED = Color3.fromRGB(154, 162, 180),
    ACCENT = Color3.fromRGB(240, 201, 122), ACCENT2 = Color3.fromRGB(198, 141, 62),
    ACCENT3 = Color3.fromRGB(255, 238, 203), DARK = Color3.fromRGB(238, 241, 248),
    GREEN = Color3.fromRGB(64, 214, 152), RED = Color3.fromRGB(230, 88, 88),
}
local bg, surface, ink = C.BG, C.SURFACE2, C.DARK
local function corner(obj, radius)
    new("UICorner", {CornerRadius = UDim.new(0, radius or 6)}, obj)
end
local function stroke(obj, color, thickness)
    return new("UIStroke", {Color = color or C.BORDER, Thickness = thickness or 1,
        Transparency = 0.15, ApplyStrokeMode = Enum.ApplyStrokeMode.Border}, obj)
end
local function gradient(obj, first, last, rotation)
    return new("UIGradient", {Color = ColorSequence.new(first, last), Rotation = rotation or 90}, obj)
end
local panel = new("Frame", {Name = "Main", Visible = true, Size = UDim2.fromOffset(620, 380),
    AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.5),
    BackgroundColor3 = bg, BorderSizePixel = 0}, gui)
corner(panel, 16); stroke(panel, C.BORDER, 1.2)
gradient(panel, C.SURFACE2, C.BG)
local scale = new("UIScale", {Scale = 1}, panel)
local function fit()
    local camera = workspace.CurrentCamera
    if not camera then return end
    local view = camera.ViewportSize
    local width, height = panel.Size.X.Offset, panel.Size.Y.Offset
    scale.Scale = math.min(1, math.max(0.1, math.min(view.X / (width + 20), view.Y / (height + 20))))
    local limitX = math.max(0, (view.X - width * scale.Scale) / 2)
    local limitY = math.max(0, (view.Y - height * scale.Scale) / 2)
    panel.Position = UDim2.new(0.5, math.max(-limitX, math.min(limitX, panel.Position.X.Offset)),
        0.5, math.max(-limitY, math.min(limitY, panel.Position.Y.Offset)))
end
local titleBar = new("Frame", {Name = "TitleBar", Size = UDim2.new(1, 0, 0, 30),
    BackgroundColor3 = C.SURFACE2, BorderSizePixel = 0}, panel)
corner(titleBar, 16); gradient(titleBar, C.SURFACE3, C.SURFACE)
new("Frame", {Name = "TitleAccent", Position = UDim2.new(0, 1, 1, -1),
    Size = UDim2.new(1, -2, 0, 2), BackgroundColor3 = C.ACCENT, BorderSizePixel = 0}, titleBar)
local rail = new("Frame", {Name = "TabBar", Size = UDim2.new(0, 56, 1, -30),
    Position = UDim2.fromOffset(0, 30), BackgroundColor3 = C.SURFACE, BorderSizePixel = 0}, panel)
gradient(rail, C.SURFACE, C.BG)
new("Frame", {Name = "TabRailDivider", Position = UDim2.fromOffset(56, 30),
    Size = UDim2.new(0, 1, 1, -30), BackgroundColor3 = C.BORDER, BorderSizePixel = 0}, panel)
local header = new("Frame", {Name = "PageHeader", Size = UDim2.new(1, -56, 0, 24),
    Position = UDim2.fromOffset(56, 30), BackgroundColor3 = C.SURFACE, BorderSizePixel = 0}, panel)
gradient(header, C.SURFACE2, C.SURFACE)
local page = new("ScrollingFrame", {Name = "PlayerTab", Size = UDim2.new(1, -56, 1, -54),
    Position = UDim2.fromOffset(56, 54), BackgroundTransparency = 1, BorderSizePixel = 0,
    ScrollBarThickness = 3, ScrollBarImageColor3 = C.ACCENT2,
    ScrollingDirection = Enum.ScrollingDirection.Y, CanvasSize = UDim2.fromOffset(0, 510)}, panel)
local card = new("Frame", {Name = "HubObjTrack_Panel", Position = UDim2.fromOffset(8, 8),
    Size = UDim2.fromOffset(548, 1000), BackgroundColor3 = C.SURFACE,
    BackgroundTransparency = 0.12, BorderSizePixel = 0}, page)
corner(card, 10); stroke(card); gradient(card, C.SURFACE2, C.SURFACE)
local cardScale = new("UIScale", {Scale = 1}, card)
local function fitContent()
    cardScale.Scale = math.min(1, (panel.Size.X.Offset - 72) / 548)
    page.CanvasSize = UDim2.fromOffset(0, 16 + 1000 * cardScale.Scale)
end
local function label(text, x, y, w, h, parent)
    return new("TextLabel", {Position = UDim2.fromOffset(x, y), Size = UDim2.fromOffset(w, h),
        Text = text, TextColor3 = ink, Font = Enum.Font.Gotham, TextSize = 11,
        BackgroundTransparency = 1, TextXAlignment = Enum.TextXAlignment.Left,
        TextWrapped = true, RichText = false}, parent or card)
end
local function button(text, x, y, w, callback, parent)
    local b = new("TextButton", {Position = UDim2.fromOffset(x, y), Size = UDim2.fromOffset(w, 28),
        Text = text, TextColor3 = ink, Font = Enum.Font.GothamBold, TextSize = 10,
        BackgroundColor3 = surface, BorderSizePixel = 0}, parent or card)
    corner(b); stroke(b)
    connect(b.Activated, callback)
    return b
end
local function input(text, hint, x, y, w)
    local box = new("TextBox", {Position = UDim2.fromOffset(x, y), Size = UDim2.fromOffset(w, 30),
        Text = text, PlaceholderText = hint, ClearTextOnFocus = false, TextColor3 = ink,
        PlaceholderColor3 = C.MUTED, Font = Enum.Font.Gotham, TextSize = 11,
        BackgroundColor3 = C.SURFACE2, BorderSizePixel = 0}, card)
    corner(box); stroke(box)
    return box
end
local title = label("taodepzai v5.0 NOIR", 12, 0, 164, 30, titleBar)
title.Name, title.Active, title.TextColor3, title.Font = "Title", true, C.ACCENT3, Enum.Font.GothamBold
local pill = new("Frame", {Name = "VersionPill", Position = UDim2.fromOffset(178, 7),
    Size = UDim2.fromOffset(70, 16), BackgroundColor3 = C.BG, BorderSizePixel = 0}, titleBar)
corner(pill, 8); stroke(pill, C.ACCENT2)
local version = label("v5.0 · NOIR", 6, 0, 64, 16, pill)
version.TextColor3, version.TextSize = C.ACCENT3, 8
local pageTitle = label("👥 Người Chơi", 10, 0, 180, 24, header)
pageTitle.TextColor3, pageTitle.Font = C.ACCENT, Enum.Font.GothamBold
local onlyFeature = label("🌳 Định vị vật thể", 230, 0, 270, 24, header)
onlyFeature.TextColor3 = C.MUTED
local playerTab = new("TextButton", {Name = "PlayerTabButton", Position = UDim2.fromOffset(4, 8),
    Size = UDim2.fromOffset(46, 58), Text = "👥\nNgười\nChơi", TextSize = 10,
    TextColor3 = C.ACCENT3, BackgroundColor3 = C.SURFACE2,
    Font = Enum.Font.GothamBold, BorderSizePixel = 0}, rail)
corner(playerTab, 6); stroke(playerTab, C.ACCENT2)
new("Frame", {Name = "ActiveTabBar", Position = UDim2.fromOffset(0, 8),
    Size = UDim2.new(0, 2, 1, -16), BackgroundColor3 = C.ACCENT, BorderSizePixel = 0}, playerTab)
connect(playerTab.Activated, function() page.Visible = true end)
local restore = new("TextButton", {Name = "MenuToggle", Position = UDim2.new(1, -48, 1, -48),
    Size = UDim2.fromOffset(36, 36), Text = "✕", BackgroundColor3 = C.BG,
    TextColor3 = C.ACCENT3, Font = Enum.Font.GothamBold, TextSize = 18,
    BorderSizePixel = 0, ZIndex = 1000}, gui)
corner(restore, 18)
local ring = stroke(restore, C.ACCENT, 2)
local ringGradient = gradient(ring, C.ACCENT2, C.ACCENT3, 0)
local function showMenu(visible)
    panel.Visible = visible
    restore.Text = visible and "✕" or "☰"
end
connect(restore.Activated, function() showMenu(not panel.Visible) end)
local dragLocked, lockButton = true, nil
lockButton = button("🔒", 0, 3, 24, function()
    dragLocked = not dragLocked
    lockButton.Text = dragLocked and "🔒" or "🔓"
end, titleBar)
lockButton.Name, lockButton.Size = "DragLock", UDim2.fromOffset(24, 24)
lockButton.Position = UDim2.new(1, -54, 0, 3)
local closeButton = button("X", 0, 3, 24, function() showMenu(false) end, titleBar)
closeButton.Name, closeButton.Size = "CloseMenu", UDim2.fromOffset(24, 24)
closeButton.Position, closeButton.TextColor3 = UDim2.new(1, -28, 0, 3), C.RED
local featureTitle = label("🌳 ĐỊNH VỊ VẬT THỂ", 12, 8, 496, 24)
featureTitle.TextColor3, featureTitle.Font = C.ACCENT, Enum.Font.GothamBold
button("Chọn thực thể ↓", 350, 8, 158, function()
    page.CanvasPosition = Vector2.new(0, 450 * cardScale.Scale)
end)
label("Tên chứa từ khóa; nhiều mục cách nhau bằng dấu , hoặc ;", 12, 36, 496, 22)
local query = input("", "VD: cây, rương; Workspace.Map.Chest", 12, 66, 496)
local status = label("Nhập tên/path rồi bật. X chỉ ẩn menu; dùng Dừng & thoát để dọn sạch.", 12, 204, 496, 38)
status.TextColor3 = C.ACCENT
local detail = label("Chọn một dòng để xem đường dẫn và tọa độ.", 12, 386, 496, 36)
local copyBox = input("", "Thông tin vật được chọn", 12, 428, 496)
copyBox.TextEditable = false
local exitButton = button("Dừng & thoát", 12, 960, 128, shutdown)
exitButton.TextColor3 = C.RED
label("Chỉ định vị · không bay / không chạy script ngoài", 150, 960, 364, 28)
local selected, rows, toggle, viewObjects = nil, {}, nil, {}
local paintPresets = function() end
local function paintToggle()
    toggle.Text = tracker.enabled and "Định vị: BẬT" or "Định vị: TẮT"
    toggle.TextColor3 = tracker.enabled and C.GREEN or C.MUTED
end
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
    query.Text = ""; tracker:setAllPresets(false); tracker:setQuery("")
    tracker.disabledObjects = setmetatable({}, {__mode = "k"})
    selected = nil; paintToggle(); paintPresets()
end)
connect(query.FocusLost, function(enter) if enter then applyQuery() end end)
-- Presets are exact-name filters; arbitrary manual names/paths remain available above.
local presetTitle = label("HỖ TRỢ ĐỊNH VỊ · CHỌN TỪNG THỰC THỂ", 12, 464, 496, 24)
presetTitle.TextColor3, presetTitle.Font = C.ACCENT, Enum.Font.GothamBold
label("Chọn BẬT/TẮT từng mục. Chỉ thấy đối tượng đã xuất hiện ở client; tên nội bộ có thể khác. Muốn tìm tên khác, dùng ô phía trên.", 12, 492, 496, 44)
local presetButtons = {}
paintPresets = function()
    for _, preset in ipairs(tracker.presets) do
        local b = presetButtons[preset.name]
        local on = tracker.selectedPresets[preset.name] == true
        b.Text = preset.name .. (on and ": BẬT" or ": TẮT")
        b.TextColor3 = on and C.GREEN or C.MUTED
    end
end
local function applyPresetChange()
    tracker:setQuery(query.Text)
    tracker:setEnabled(true) -- Remains off when no manual filter/preset is selected.
    selected, viewObjects = nil, {}
    paintToggle(); paintPresets()
end
button("Bật tất cả mục hỗ trợ", 12, 548, 244, function()
    tracker:setAllPresets(true); applyPresetChange()
end)
button("Tắt tất cả mục hỗ trợ", 264, 548, 244, function()
    tracker:setAllPresets(false); applyPresetChange()
end)
for i, preset in ipairs(tracker.presets) do
    local x, y = 12 + ((i - 1) % 2) * 252, 584 + math.floor((i - 1) / 2) * 30
    local b = button("", x, y, 244, function()
        tracker:setPreset(preset.name, not tracker.selectedPresets[preset.name])
        applyPresetChange()
    end)
    b.Name = "Preset_" .. tostring(i)
    presetButtons[preset.name] = b
end
paintPresets()
local function option(text, field, x, y, w)
    local b
    local function paint()
        b.Text = text .. (tracker[field] and ": BẬT" or ": TẮT")
        b.TextColor3 = tracker[field] and C.GREEN or C.MUTED
    end
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
    Name = "ObjTrackList", CanvasSize = UDim2.fromOffset(0, 0)}, card)
local function renderList()
    local changed = #viewObjects ~= #tracker.list
    for i, hit in ipairs(tracker.list) do
        if viewObjects[i] ~= hit.inst then changed = true end
    end
    if changed then
        viewObjects = {}
        for i, hit in ipairs(tracker.list) do viewObjects[i] = hit.inst end
        for _, row in ipairs(rows) do row.connection:Disconnect(); row.toggleConnection:Disconnect(); row.button:Destroy(); row.toggle:Destroy() end
        rows = {}
        for i, hit in ipairs(tracker.list) do
            local inst = hit.inst
            local b = new("TextButton", {Position = UDim2.fromOffset(4, (i - 1) * 28), Size = UDim2.new(1, -76, 0, 26),
                BackgroundColor3 = bg, TextColor3 = ink, Font = Enum.Font.Gotham, TextSize = 11,
                TextXAlignment = Enum.TextXAlignment.Left, RichText = false}, listGui)
            local connection = b.Activated:Connect(function() selected = inst end)
            local perObject = new("TextButton", {Name = "ToggleObject", Position = UDim2.new(1, -68, 0, (i - 1) * 28),
                Size = UDim2.fromOffset(56, 26), BackgroundColor3 = C.SURFACE3, TextSize = 10,
                TextColor3 = C.ACCENT, Font = Enum.Font.GothamBold, BorderSizePixel = 0}, listGui)
            corner(perObject)
            local toggleConnection = perObject.Activated:Connect(function()
                tracker:setObjectEnabled(inst, tracker.disabledObjects[inst] == true)
            end)
            rows[#rows + 1] = {button = b, connection = connection, toggle = perObject, toggleConnection = toggleConnection}
        end
        listGui.CanvasSize = UDim2.fromOffset(0, #rows * 28)
    end
    for i, hit in ipairs(tracker.list) do
        rows[i].toggle.Text = tracker.disabledObjects[hit.inst] and "Bật" or "Tắt"
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
    for _, row in ipairs(rows) do row.connection:Disconnect(); row.toggleConnection:Disconnect() end
    rows = {}
end
local dragging, dragInput, dragStart, startPosition
local resizing, resizeInput, resizeStart, resizeSize, resizePosition
for _, spec in ipairs({
    {name = "TL", x = 0, xo = 2, y = 0, yo = 2, text = "↖"},
    {name = "TR", x = 1, xo = -18, y = 0, yo = 2, text = "↗"},
    {name = "BL", x = 0, xo = 2, y = 1, yo = -18, text = "↙"},
    {name = "BR", x = 1, xo = -18, y = 1, yo = -18, text = "↘"},
}) do
    local handle = new("TextButton", {Name = "Resize" .. spec.name,
        Position = UDim2.new(spec.x, spec.xo, spec.y, spec.yo), Size = UDim2.fromOffset(16, 16),
        Text = spec.text, TextColor3 = C.MUTED, BackgroundColor3 = C.SURFACE3,
        TextSize = 9, BorderSizePixel = 0, ZIndex = 20}, panel)
    corner(handle, 4)
    connect(handle.InputBegan, function(i)
        if i.UserInputType == Enum.UserInputType.MouseButton1 or i.UserInputType == Enum.UserInputType.Touch then
            resizing, resizeInput, resizeStart = spec.name, i, i.Position
            resizeSize, resizePosition = panel.Size, panel.Position
            dragging = false
        end
    end)
end
local function beginDrag(i)
    if not dragLocked and (i.UserInputType == Enum.UserInputType.MouseButton1 or i.UserInputType == Enum.UserInputType.Touch) then
        dragging, dragInput, dragStart, startPosition = true, i, i.Position, panel.Position
        resizing = nil
    end
end
connect(title.InputBegan, beginDrag)
connect(titleBar.InputBegan, beginDrag)
connect(UserInputService.InputChanged, function(i)
    if resizing and (i.UserInputType == Enum.UserInputType.MouseMovement or i == resizeInput) then
        local d = i.Position - resizeStart
        local right, bottom = resizing:sub(2, 2) == "R", resizing:sub(1, 1) == "B"
        local factor = scale.Scale
        local width = math.max(560, math.min(900, resizeSize.X.Offset + (right and d.X or -d.X) / factor))
        local height = math.max(280, math.min(700, resizeSize.Y.Offset + (bottom and d.Y or -d.Y) / factor))
        panel.Size = UDim2.fromOffset(width, height)
        panel.Position = UDim2.new(0.5, resizePosition.X.Offset + (width - resizeSize.X.Offset) * factor * (right and 0.5 or -0.5),
            0.5, resizePosition.Y.Offset + (height - resizeSize.Y.Offset) * factor * (bottom and 0.5 or -0.5))
        fit()
    elseif dragging and (i.UserInputType == Enum.UserInputType.MouseMovement or i == dragInput) then
        local d = i.Position - dragStart
        panel.Position = UDim2.new(startPosition.X.Scale, startPosition.X.Offset + d.X,
            startPosition.Y.Scale, startPosition.Y.Offset + d.Y)
        fit()
    end
end)
connect(UserInputService.InputEnded, function(i)
    if i == dragInput then dragging, dragInput = false, nil end
    if i == resizeInput then resizing, resizeInput = nil, nil end
end)
connect(UserInputService.InputBegan, function(i, processed)
    if not processed and i.KeyCode == Enum.KeyCode.RightControl then showMenu(not panel.Visible) end
end)
local uiElapsed = 0
connect(RunService.Heartbeat, function(dt)
    local ok, err = pcall(function()
        tracker:step(dt)
        ringGradient.Rotation = (ringGradient.Rotation + dt * 90) % 360
        uiElapsed = uiElapsed + dt
        if uiElapsed >= 0.25 then
            uiElapsed = 0
            fit(); fitContent(); renderList(); paintToggle()
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
fit(); fitContent()
