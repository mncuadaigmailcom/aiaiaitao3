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
    local alertNames = {}
    local supportedAlerts = {Rush = true, Ambush = true, Seek = true, Screech = true, ["Sally (Window)"] = true}
    for _, preset in ipairs(presets) do
        if supportedAlerts[preset.name] then
            for _, alias in ipairs(preset.aliases) do
                alertNames[alias:lower()] = preset.name == "Sally (Window)" and "Sally" or preset.name
            end
        end
    end
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
        if not text:find("[\128-\255]") then
            return (text:lower():gsub("%s+", " "):gsub("^%s+", ""):gsub("%s+$", ""))
        end
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
            maxDistance = 0, maxItems = 50, scanBudget = 300, sliceSeconds = 0.002,
            skipPlayers = true, showBox = false, showLabel = true, showXYZ = true,
            throughWalls = true, colorIndex = 1, items = {}, list = {},
            stack = nil, hits = {}, found = 0, scanElapsed = 0, labelElapsed = 0,
            refreshEvery = 1, lastError = nil, labelEvery = 0.05,
            nameCache = setmetatable({}, {__mode = "k"}), exactNames = {}, nameKeys = {}, paths = {},
            chars = nil, eventQueue = {}, eventHead = 1, eventTail = 0, queued = {},
            eventBudget = 32, eventSliceSeconds = 0.001, maxPending = 2048,
            scanSeen = setmetatable({}, {__mode = "k"}), hitsDirty = false,
            markerBudget = 8, markerPending = false,
            alerts = {enabled = true, active = {}, queue = {}, queued = {}, head = 1, tail = 0,
                seen = setmetatable({}, {__mode = "k"}),
                budget = 32, sliceSeconds = 0.001, maxPending = 256},
        }, Tracker)
    end
    function Tracker:clear()
        for inst, marker in pairs(self.items) do
            deps.removeMarker(marker)
            self.items[inst] = nil
        end
        self.list, self.hits, self.stack, self.found = {}, {}, nil, 0
        self.scanElapsed = 0
        self.eventQueue, self.queued, self.eventHead, self.eventTail = {}, {}, 1, 0
        self.scanSeen = setmetatable({}, {__mode = "k"})
        self.hitsDirty, self.markerPending = false, false
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
        self.exactNames, self.nameKeys, self.paths = {}, {}, {}
        for _, term in ipairs(self.terms) do
            if term.path then self.paths[term.value] = true
            elseif term.exact then self.exactNames[term.value] = true
            else self.nameKeys[#self.nameKeys + 1] = term.value end
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
    function Tracker:normalizedName(inst)
        local raw = inst.Name
        local cached = self.nameCache[inst]
        if cached and cached.raw == raw then return cached.norm end
        local name = normalize(raw)
        self.nameCache[inst] = {raw = raw, norm = name}
        return name
    end
    function Tracker:matches(inst)
        local name = self:normalizedName(inst)
        if self.exactNames[name] then return true end
        for _, key in ipairs(self.nameKeys) do
            if name:find(key, 1, true) then return true end
        end
        return next(self.paths) ~= nil and self.paths[normalize(pathOf(inst))] == true
    end
    function Tracker:refreshCharacters()
        self.chars = {}
        for _, player in ipairs(deps.players:GetPlayers()) do
            if player.Character then self.chars[#self.chars + 1] = player.Character end
        end
    end
    function Tracker:isPlayerCharacter(inst)
        if not self.chars then self:refreshCharacters() end
        for _, char in ipairs(self.chars) do
            if inst == char or inst:IsDescendantOf(char) then return true end
        end
        return false
    end
    function Tracker:isCharacter(inst)
        return self.skipPlayers and self:isPlayerCharacter(inst) or false
    end
    function Tracker:coveredByModel(inst)
        local parent = inst.Parent
        while parent and parent ~= deps.root do
            if parent:IsA("Model") and self:matches(parent) and partOf(parent) then return true end
            parent = parent.Parent
        end
        return false
    end
    -- Event handlers enqueue only. Matching, marker creation and ancestor lookup stay budgeted.
    function Tracker:notifyAdded(inst)
        if not self.enabled or self.destroyed or self.queued[inst] then return false end
        if deps.ignore and deps.ignore(inst) then return false end
        if self.eventTail - self.eventHead + 1 >= self.maxPending then
            self.scanElapsed = self.refreshEvery -- Fallback sweep repairs overflow.
            return false
        end
        self.eventTail = self.eventTail + 1
        self.eventQueue[self.eventTail], self.queued[inst] = inst, true
        return true
    end
    function Tracker:drainEvents()
        local started, count = deps.now(), 0
        self.origin = deps.getOrigin()
        while self.eventHead <= self.eventTail do
            local inst = self.eventQueue[self.eventHead]
            self.eventQueue[self.eventHead], self.queued[inst] = nil, nil
            self.eventHead = self.eventHead + 1
            if live(inst) and not self:isCharacter(inst) and not (deps.ignore and deps.ignore(inst)) then
                local node, candidates = inst, {}
                while node and node ~= deps.root do
                    if self:matches(node) then
                        local part = partOf(node)
                        if part and live(part) then
                            if node:IsA("Model") then candidates = {} end
                            candidates[#candidates + 1] = {inst = node, part = part}
                        end
                    end
                    node = node.Parent
                end
                for _, hit in ipairs(candidates) do self:addHit(hit.inst, hit.part) end
            end
            count = count + 1
            if count >= self.eventBudget or deps.now() - started >= self.eventSliceSeconds then break end
        end
        if self.eventHead > self.eventTail then
            self.eventQueue, self.eventHead, self.eventTail = {}, 1, 0
        end
        if self.hitsDirty then self:commitHits(true) end
    end
    function Tracker:beginScan()
        if not self.enabled or self.destroyed then return false end
        self.stack, self.hits, self.found = {deps.root}, {}, 0
        self.origin = deps.getOrigin()
        self.scanSeen = setmetatable({}, {__mode = "k"})
        self.hitsDirty = false
        self:refreshCharacters()
        self.scanElapsed = 0
        return true
    end
    function Tracker:addHit(inst, part)
        if self.scanSeen[inst] then return end
        local distance = self.origin and (part.Position - self.origin).Magnitude or nil
        -- A missing character/camera must not make every distance look like zero.
        if self.maxDistance > 0 and (not distance or distance > self.maxDistance) then return end
        self.scanSeen[inst] = true
        self.found = self.found + 1
        local hit = {inst = inst, part = part, distance = distance, path = pathOf(inst)}
        local index = #self.hits + 1
        for i, old in ipairs(self.hits) do
            if (distance or math.huge) < (old.distance or math.huge) then index = i; break end
        end
        if index <= self.maxItems then
            table.insert(self.hits, index, hit)
            self.hitsDirty = true
            if #self.hits > self.maxItems then table.remove(self.hits) end
        end
    end
    function Tracker:commitHits(partial)
        local candidates, seen, keep, list = {}, {}, {}, {}
        local function collect(source)
            for _, hit in ipairs(source) do
                if not seen[hit.inst] and live(hit.inst) and live(hit.part)
                    and self:matches(hit.inst) and not self:isCharacter(hit.inst)
                    and not self:coveredByModel(hit.inst) then
                    seen[hit.inst] = true
                    candidates[#candidates + 1] = hit
                end
            end
        end
        collect(self.hits)
        if partial then collect(self.list) end -- Don't flicker old markers while sweeping.
        table.sort(candidates, function(a, b) return (a.distance or math.huge) < (b.distance or math.huge) end)
        for i = 1, math.min(#candidates, self.maxItems) do
            local hit = candidates[i]
            keep[hit.inst], list[#list + 1] = true, hit
        end
        for inst, marker in pairs(self.items) do
            if not keep[inst] then deps.removeMarker(marker); self.items[inst] = nil end
        end
        self.list, self.hitsDirty = list, false
        self:refreshMarkers()
    end
    function Tracker:finishScan()
        self:commitHits(false)
        self.stack = nil
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
        if #self.stack == 0 then self:finishScan()
        elseif self.hitsDirty then self:commitHits(true) end
    end
    function Tracker:refreshMarkers()
        local origin, list = deps.getOrigin(), {}
        local made, allowed = 0, self.markerRemaining or self.markerBudget
        self.markerPending = false
        for _, hit in ipairs(self.list) do
            local part = live(hit.inst) and partOf(hit.inst) or nil
            if part and live(part) and not self:isCharacter(hit.inst) then
                hit.part = part
                if hit.pathName ~= hit.inst.Name or hit.pathParent ~= hit.inst.Parent then
                    hit.path, hit.pathName, hit.pathParent = pathOf(hit.inst), hit.inst.Name, hit.inst.Parent
                end
                hit.distance = origin and (part.Position - origin).Magnitude or nil
                local visible = self.maxDistance == 0 or (hit.distance ~= nil and hit.distance <= self.maxDistance)
                visible = visible and not self.disabledObjects[hit.inst]
                local marker = self.items[hit.inst]
                if not marker and made < allowed then
                    marker = deps.createMarker(hit)
                    self.items[hit.inst], made = marker, made + 1
                end
                if not marker then self.markerPending = true end
                if marker then deps.updateMarker(marker, hit, self, visible) end
                list[#list + 1] = hit
            else
                local marker = self.items[hit.inst]
                if marker then deps.removeMarker(marker); self.items[hit.inst] = nil end
            end
        end
        self.list = list
        if self.markerRemaining then self.markerRemaining = math.max(0, self.markerRemaining - made) end
    end
    function Tracker:setAlertsEnabled(enabled)
        if self.destroyed then return false end
        local alerts = self.alerts
        alerts.enabled = enabled == true
        alerts.active, alerts.queue, alerts.queued, alerts.head, alerts.tail = {}, {}, {}, 1, 0
        alerts.seen = setmetatable({}, {__mode = "k"})
        return alerts.enabled
    end
    function Tracker:notifyAlert(inst)
        local alerts = self.alerts
        if self.destroyed or not alerts.enabled then return false end
        if deps.ignore and deps.ignore(inst) then return false end
        -- Cheap name-only ancestor filter: unrelated scenery cannot fill the alert queue.
        -- Part lookup and distance work still happen in the budgeted Heartbeat worker.
        local node, target = inst, nil
        while node and node ~= deps.root do
            if alertNames[node.Name:lower()] then target = node end
            node = node.Parent
        end
        if not target or alerts.seen[target] or alerts.queued[target] then return false end
        if alerts.tail - alerts.head + 1 >= alerts.maxPending then return false end
        alerts.tail = alerts.tail + 1
        alerts.queue[alerts.tail], alerts.queued[target] = target, true
        return true
    end
    function Tracker:pruneAlerts()
        local alerts = self.alerts
        for i = #alerts.active, 1, -1 do
            local entry = alerts.active[i]
            local part = live(entry.inst) and partOf(entry.inst) or nil
            local name = alertNames[entry.inst.Name:lower()]
            if not part or not live(part) or not name or self:isPlayerCharacter(entry.inst) then
                alerts.seen[entry.inst] = nil
                table.remove(alerts.active, i)
            else
                entry.name, entry.part = name, part
            end
        end
    end
    function Tracker:stepAlerts()
        local alerts = self.alerts
        if not alerts.enabled then return end
        -- Presence, not a countdown, controls the notification lifetime.
        self:pruneAlerts()
        local started, count = deps.now(), 0
        while alerts.head <= alerts.tail do
            local inst = alerts.queue[alerts.head]
            alerts.queue[alerts.head], alerts.queued[inst] = nil, nil
            alerts.head = alerts.head + 1
            if live(inst) and not self:isPlayerCharacter(inst) and not (deps.ignore and deps.ignore(inst)) then
                local node, target, name, part = inst, nil, nil, nil
                -- Prefer the outer named entity over its identically named children.
                while node and node ~= deps.root do
                    local kind = alertNames[node.Name:lower()]
                    if kind then
                        local candidate = partOf(node)
                        if candidate and live(candidate) then target, name, part = node, kind, candidate end
                    end
                    node = node.Parent
                end
                if target and not alerts.seen[target] then
                    alerts.seen[target] = true
                    -- Keep every live instance, including two instances of the same kind.
                    alerts.active[#alerts.active + 1] = {name = name, inst = target, part = part}
                end
            end
            count = count + 1
            if count >= alerts.budget or deps.now() - started >= alerts.sliceSeconds then break end
        end
        if alerts.head > alerts.tail then alerts.queue, alerts.head, alerts.tail = {}, 1, 0 end
        local origin = deps.getAlertOrigin and deps.getAlertOrigin() or nil
        if not deps.getAlertOrigin then origin = deps.getOrigin() end
        for _, entry in ipairs(alerts.active) do
            entry.distance = origin and (entry.part.Position - origin).Magnitude or nil
        end
    end
    function Tracker:step(dt)
        if self.destroyed or not finite(dt) or dt < 0 then return end
        self:refreshCharacters()
        self:stepAlerts()
        if not self.enabled then return end
        self.markerRemaining = self.markerBudget
        self.scanElapsed, self.labelElapsed = self.scanElapsed + dt, self.labelElapsed + dt
        -- Never restart a sweep before draining the fast queue: pending spawn events win.
        self:drainEvents()
        if not self.stack and self.scanElapsed >= self.refreshEvery then self:beginScan() end
        self:scanSlice()
        if self.markerPending or self.labelElapsed >= self.labelEvery then
            self.labelElapsed = 0; self:refreshMarkers()
        end
        self.markerRemaining = nil
    end
    function Tracker:destroy()
        if self.destroyed then return end
        self:setAlertsEnabled(false)
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
    getAlertOrigin = function()
        local char = player.Character
        local head = char and char:FindFirstChild("Head")
        local root = char and char:FindFirstChild("HumanoidRootPart")
        if head and head:IsA("BasePart") then return head.Position end
        if root and root:IsA("BasePart") then return root.Position end
        return nil -- No camera distance pretending to be distance to the player.
    end,
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
connect(workspace.DescendantAdded, function(inst)
    tracker:notifyAdded(inst)
    tracker:notifyAlert(inst)
end)
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
local onlyFeature = label("🌳 Định vị vật thể", 190, 0, 150, 24, header)
onlyFeature.TextColor3 = C.MUTED
-- One fixed-size notification, independent of menu visibility and entity count.
local alertLayer = new("Frame", {Name = "EntityAlerts", AnchorPoint = Vector2.new(1, 0),
    Position = UDim2.new(1, -12, 0, 12), Size = UDim2.fromOffset(280, 66),
    BackgroundTransparency = 1, BorderSizePixel = 0, ZIndex = 2000, Visible = false}, gui)
local alertScale = new("UIScale", {Scale = 1}, alertLayer)
local alertCard = new("Frame", {Name = "CombinedAlert", Size = UDim2.fromOffset(280, 66),
    Position = UDim2.fromOffset(0, 0), BackgroundColor3 = C.SURFACE,
    BorderSizePixel = 0, ZIndex = 2001}, alertLayer)
corner(alertCard, 7); stroke(alertCard, C.ACCENT2, 1.2)
local alertHeading = label("", 10, 3, 260, 18, alertCard)
alertHeading.Name, alertHeading.Font = "AlertTitle", Enum.Font.GothamBold
alertHeading.TextColor3, alertHeading.ZIndex = C.ACCENT3, 2002
local alertBody = label("", 10, 23, 260, 40, alertCard)
alertBody.Name, alertBody.TextColor3, alertBody.ZIndex = "AlertEntities", C.DARK, 2002
alertBody.TextScaled, alertBody.TextWrapped = true, true
alertBody.TextYAlignment = Enum.TextYAlignment.Center
local alertTextLimit = new("UITextSizeConstraint", {MinTextSize = 1, MaxTextSize = 18}, alertBody)
local function renderAlerts()
    local entries, lines = tracker.alerts.active, {}
    for _, entry in ipairs(entries) do
        local distance = entry.distance and string.format("%.1f stud", entry.distance) or "chưa có vị trí nhân vật"
        lines[#lines + 1] = entry.name .. ": " .. distance
    end
    local count = #entries
    alertLayer.Visible = tracker.alerts.enabled and count > 0
    alertHeading.Text = count == 1 and (entries[1].name .. " xuất hiện!") or (tostring(count) .. " thực thể xuất hiện!")
    alertBody.Text = table.concat(lines, "\n")
    -- The panel never grows with the count. Only the text budget changes.
    local sizes = {18, 16, 12, 10, 8}
    local size = sizes[math.max(1, count)] or math.max(1, math.floor(40 / count))
    alertBody.TextSize, alertTextLimit.MaxTextSize = size, size
    local camera = workspace.CurrentCamera
    if camera then
        local view = camera.ViewportSize
        -- Viewport-only scaling: adding a second or third entity cannot resize the panel.
        alertScale.Scale = math.max(0.1, math.min(1, (view.X - 24) / 280, (view.Y - 24) / 66))
    end
end
local alertToggle
alertToggle = button("Cảnh báo: BẬT", 0, 2, 140, function()
    tracker:setAlertsEnabled(not tracker.alerts.enabled)
    alertToggle.Text = tracker.alerts.enabled and "Cảnh báo: BẬT" or "Cảnh báo: TẮT"
    alertToggle.TextColor3 = tracker.alerts.enabled and C.GREEN or C.MUTED
    renderAlerts()
end, header)
alertToggle.Name, alertToggle.Size = "AlertToggle", UDim2.fromOffset(140, 20)
alertToggle.Position, alertToggle.TextColor3 = UDim2.new(1, -148, 0, 2), C.GREEN
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
    if not tracker.enabled then tracker:setEnabled(true) end
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
    if query.Text ~= tracker.query then tracker:setQuery(query.Text) end
    if not tracker.enabled then tracker:setEnabled(true) end -- No filters means it stays off.
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
        renderAlerts()
        ringGradient.Rotation = (ringGradient.Rotation + dt * 90) % 360
        uiElapsed = uiElapsed + dt
        if uiElapsed >= 0.10 then
            uiElapsed = 0
            fit(); fitContent(); renderList(); paintToggle()
            status.Text = string.format("%s | %d/%d vật | tối đa %d | %s",
                tracker.enabled and "BẬT" or "TẮT", #tracker.list, tracker.found, tracker.maxItems,
                tracker.stack and "đang quét..." or "nhanh: sự kiện + quét dự phòng")
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
