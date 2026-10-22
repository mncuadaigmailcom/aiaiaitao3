-- Standalone local object discovery, visualization and soft night vision.
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
    local supportedAlerts = {Rush = true, Ambush = true, Seek = true, Screech = true}
    for _, preset in ipairs(presets) do
        if supportedAlerts[preset.name] then
            for _, alias in ipairs(preset.aliases) do
                alertNames[alias:lower()] = preset.name
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
        if inst:IsA("Model") or inst:IsA("Folder") or inst:IsA("Tool") then
            if inst:IsA("Tool") then
                local handle = inst:FindFirstChild("Handle")
                if handle and handle:IsA("BasePart") then return handle end
            end
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
            if (parent:IsA("Model") or parent:IsA("Tool")) and self:matches(parent) and partOf(parent) then return true end
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
                            if node:IsA("Model") or node:IsA("Tool") then candidates = {} end
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
                            -- One marker for a matching Model/Tool, not one per child part.
                            grouped = inst:IsA("Model") or inst:IsA("Tool")
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
        if not self.enabled and not self.alerts.enabled then return end
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
-- Independent item controller; shares the tested scanner, not entity selections/state.
local function createItemTracker(deps)
    local engine = createTracker(deps)
    engine:setAlertsEnabled(false)
    engine.scanBudget, engine.sliceSeconds = 150, 0.001
    engine.eventBudget, engine.eventSliceSeconds, engine.markerBudget = 16, 0.0005, 4
    engine.presets = {}
    local groups = {
        {id = "lights", title = "🔦 Nguồn sáng & đèn", rgb = {170, 100, 255}, items = {
            "Lighter", "Candle", "Moonlight Candle", "Flashlight", "Bulklight", "Straplight",
            "Glowstick", "Flare", "Laser Pointer", "Shakelight"}},
        {id = "healing", title = "🩹 Hồi máu, tăng lực & đồ ăn", rgb = {255, 155, 55}, items = {
            "Bandage", "Bandage Pack", "Vitamins", "Starlight Vial", "Starlight Bottle", "Starlight Jug",
            "Moonlight Float", "Gween Soda", "Pack of Gween Soda", "Smoothie", "Pizza", "Bread", "Cheese",
            "Donut", "Peach Cobbler", "Water Cup", "Honey Pot"}},
        {id = "tools", title = "🗝️ Mở khóa, công cụ & hỗ trợ", rgb = {180, 245, 85}, items = {
            "Lockpick", "Skeleton Key", "Battery", "Battery Pack", "Shears", "Alarm Clock", "Scanner",
            "Scanner Module", "Compass", "Multitool"}},
        {id = "magic", title = "✨ Ma thuật & đặc biệt", rgb = {255, 105, 180}, items = {
            "Crucifix", "Lotus Petal", "The World Lotus", "Rift Jar", "Glitch Fragment", "Pocket Mirror",
            "Holy Egg Grenade", "Sallys Toy"}},
        {id = "quest", title = "🔑 Nhiệm vụ & bắt buộc", rgb = {65, 210, 95}, items = {
            "Key", "Hotel Key", "Backdoor Key", "Electrical Room Key", "Iron Key", "Garage Key", "Book", "Paper",
            "Breaker Pole", "Fuse", "Waiting Ticket", "Storage Box", "Salvage Scrap", "Lotus Petal", "Water Cup"}},
        {id = "misc", title = "📦 Tương tác, trao đổi & khác", rgb = {255, 220, 70}, items = {
            "Salvage Scrap", "Storage Box", "Briefcase", "Lunchbox", "Fih Flakes", "Ceramic Stem", "Paper Plane",
            "Mugg", "Tophat", "Coin Roll", "Tip Jar"}},
    }
    local controller = {engine = engine, groups = groups, byId = {}, query = "", paused = false,
        aliasColors = {}, destroyed = false}
    for _, group in ipairs(groups) do
        group.enabled, group.selected, group.known = false, {}, {}
        controller.byId[group.id] = group
        for _, name in ipairs(group.items) do
            group.known[name] = true
            -- Exact spaced, compact and underscore spellings, never a broad substring "Key".
            local aliases = {name, name:gsub("%s+", ""), (name:gsub("%s+", "_"))}
            engine.presets[#engine.presets + 1] = {name = group.id .. ":" .. name, aliases = aliases}
        end
    end
    function controller:refresh()
        if self.destroyed then return false end
        local selections, colors = {}, {}
        for _, group in ipairs(self.groups) do
            for _, name in ipairs(group.items) do
                if group.enabled and group.selected[name] then
                    selections[group.id .. ":" .. name] = true
                    for _, alias in ipairs({name, name:gsub("%s+", ""), (name:gsub("%s+", "_"))}) do
                        local key = engine.normalize(alias)
                        if not colors[key] then colors[key] = group.rgb end
                    end
                end
            end
        end
        self.aliasColors, engine.selectedPresets = colors, selections
        engine:setQuery(self.query)
        if self.paused then engine:setEnabled(false)
        elseif not engine.enabled then engine:setEnabled(true) end
        return engine.enabled
    end
    function controller:setItem(id, name, selected)
        local group = self.byId[id]
        if self.destroyed or not group or not group.known[name] then return false end
        group.selected[name] = selected == true or nil
        if selected then group.enabled, self.paused = true, false
        elseif next(group.selected) == nil then group.enabled = false end
        self:refresh()
        return true
    end
    function controller:setGroupEnabled(id, enabled)
        local group = self.byId[id]
        if self.destroyed or not group then return false end
        group.enabled = enabled == true
        if enabled then self.paused = false end
        self:refresh()
        return true
    end
    function controller:selectGroup(id, selected)
        local group = self.byId[id]
        if self.destroyed or not group then return false end
        group.selected = {}
        if selected then
            for _, name in ipairs(group.items) do group.selected[name] = true end
            self.paused = false
        end
        group.enabled = selected == true
        self:refresh()
        return true
    end
    function controller:setAll(selected)
        if self.destroyed then return false end
        for _, group in ipairs(self.groups) do
            group.selected, group.enabled = {}, selected == true
            if selected then for _, name in ipairs(group.items) do group.selected[name] = true end end
        end
        if selected then self.paused = false end
        self:refresh()
        return true
    end
    function controller:setEnabled(enabled)
        if self.destroyed then return false end
        self.paused = enabled ~= true
        return self:refresh()
    end
    function controller:setQuery(text)
        if self.destroyed then return false end
        self.query, self.paused = tostring(text or ""), false
        return self:refresh()
    end
    function controller:colorFor(inst)
        return self.aliasColors[engine.normalize(inst.Name)]
    end
    function controller:clear()
        if self.destroyed then return end
        self.query = ""
        engine.disabledObjects = setmetatable({}, {__mode = "k"})
        self:setAll(false)
    end
    function controller:destroy()
        if self.destroyed then return end
        self.destroyed = true
        engine:destroy()
    end
    return controller
end
-- Bounded numbered-door index, independent of entity/item filtering and alerts.
local function createDoorTracker(deps)
    local self = {enabled = false, destroyed = false, current = 1, byNumber = {}, list = {}, items = {},
        queue = {}, queued = {}, head = 1, tail = 0, cursor = 1, elapsed = 0, characters = {},
        scanBudget = 180, eventBudget = 24, nearestBudget = 128, sliceSeconds = 0.001,
        queueLimit = 512, showBox = true, showLabel = true, showXYZ = false, throughWalls = true,
        colorIndex = 1, visited = 0}
    local clock = deps.now or os.clock
    local function integer(text)
        local n = tonumber(text)
        return n and n >= 1 and n <= 2000 and n == math.floor(n) and n or nil
    end
    local function numberOf(inst)
        -- Exact identity chain: Workspace.CurrentRooms.<1..2000>.Door.Door.
        -- Only the numeric room segment varies; legacy name aliases no longer match.
        if inst.Name ~= "Door" then return nil end
        local outer = inst.Parent
        local room = outer and outer.Parent
        local rooms = room and room.Parent
        if not outer or outer.Name ~= "Door" or not rooms or rooms.Name ~= "CurrentRooms"
            or rooms.Parent ~= deps.root then return nil end
        local n = integer(room.Name)
        return n and tostring(n) == room.Name and n or nil
    end
    self.numberOf = numberOf
    local function pointOK(p)
        return p and p.X == p.X and p.Y == p.Y and p.Z == p.Z
            and math.abs(p.X) < math.huge and math.abs(p.Y) < math.huge and math.abs(p.Z) < math.huge
    end
    local function skip(inst)
        if deps.ignore and deps.ignore(inst) then return true end
        local ancestor, depth = inst, 0
        while ancestor and ancestor ~= deps.root do
            if self.characters[ancestor] then return true end
            ancestor, depth = ancestor.Parent, depth + 1
            if depth > 32 then return true end
        end
        return ancestor ~= deps.root
    end
    local function valid(hit)
        return hit and hit.inst:IsDescendantOf(deps.root) and hit.part:IsDescendantOf(deps.root)
            and (hit.inst == hit.part or hit.part:IsDescendantOf(hit.inst))
            and numberOf(hit.inst) == hit.number and not skip(hit.inst) and pointOK(hit.part.Position)
    end
    local function get(n)
        local hit = self.byNumber[n]
        if hit and not valid(hit) then self.byNumber[n] = nil; return nil end
        return hit
    end
    local function distance(hit, origin)
        return (hit.part.Position - origin).Magnitude
    end
    function self:refreshCharacters()
        self.characters = {}
        for _, p in ipairs(deps.players:GetPlayers()) do
            if p.Character then self.characters[p.Character] = true end
        end
    end
    function self:inspect(part)
        if not part:IsA('BasePart') or skip(part) then return end
        local ancestor, inst, number, depth = part, nil, nil, 0
        while ancestor and ancestor ~= deps.root and depth < 8 do
            local n = numberOf(ancestor)
            if n and (ancestor:IsA('BasePart') or ancestor:IsA('Model') or ancestor:IsA('Folder')) then
                inst, number = ancestor, n
            end
            ancestor, depth = ancestor.Parent, depth + 1
        end
        if not inst then return end
        if inst:IsA('BasePart') then part = inst end -- The exact leaf itself is the physical target.
        local representative = inst:IsA('Model') and inst.PrimaryPart or nil
        if representative and representative:IsA('BasePart') and representative:IsDescendantOf(inst) then part = representative end
        if not pointOK(part.Position) then return end
        local previous = get(number)
        if previous and previous.inst == inst then
            -- Keep a stable door plane: visiting another panel must not move the anchor.
            return
        end
        if previous then
            local p = self.origin
            if not p or distance(previous, p) <= (part.Position - p).Magnitude then return end
        end
        self.byNumber[number] = {inst = inst, part = part, number = number,
            path = "Workspace.CurrentRooms." .. number .. ".Door.Door"}
        -- Newly streamed nearby doors can be considered without waiting for the global cursor.
        self.newCandidate = number
    end
    function self:beginScan()
        if not self.enabled or self.destroyed then return end
        local rooms = deps.root:FindFirstChild("CurrentRooms")
        self.stack = {{children = rooms and rooms:GetChildren() or {}, index = 1}}
        self.elapsed = 0
    end
    function self:scanSlice()
        local deadline, count = clock() + self.sliceSeconds, 0
        while self.stack and count < self.scanBudget and clock() < deadline do
            local frame = self.stack[#self.stack]
            if frame.index > #frame.children then
                table.remove(self.stack)
                if #self.stack == 0 then self.stack = nil end
            else
                local node = frame.children[frame.index]; frame.index = frame.index + 1
                count, self.visited = count + 1, self.visited + 1
                if not skip(node) then
                    self:inspect(node)
                    local children
                    local parent = node.Parent
                    if parent and parent.Name == "CurrentRooms" and parent.Parent == deps.root then
                        -- Jump directly from each canonical numbered room to its exact leaf.
                        local n = integer(node.Name)
                        local outer = n and tostring(n) == node.Name and node:FindFirstChild("Door")
                        local leaf = outer and outer:FindFirstChild("Door")
                        children = leaf and {leaf} or {}
                    else children = node:GetChildren() end
                    if #children > 0 then self.stack[#self.stack + 1] = {children = children, index = 1} end
                end
            end
        end
    end
    function self:notifyAdded(inst)
        if not self.enabled or self.destroyed or self.queued[inst] or (deps.ignore and deps.ignore(inst)) then return end
        local ancestor, depth = inst, 0
        while ancestor and ancestor ~= deps.root and depth < 32 do
            if ancestor.Name == "CurrentRooms" and ancestor.Parent == deps.root then break end
            ancestor, depth = ancestor.Parent, depth + 1
        end
        if not ancestor or ancestor == deps.root or depth >= 32 then return end
        if self.tail - self.head + 1 >= self.queueLimit then self.rescan = true; return end
        self.tail = self.tail + 1; self.queue[self.tail] = inst; self.queued[inst] = true
    end
    local function nextAvailable(n, direction)
        for i = n + direction, direction > 0 and 2000 or 1, direction do
            if get(i) then return i end
        end
    end
    function self:chooseCurrent()
        local origin = self.origin
        if not origin then
            -- Respawning/spectating must not let the camera move the tracked door.
            if not self.hasOrigin or not get(self.current) then
                for n = 1, 2000 do if get(n) then self.current = n; break end end
            end
            self.lastOrigin, self.lock, self.newCandidate = nil, nil, nil
            return
        end
        self.hasOrigin = true
        local best, bestDistance
        local function consider(n)
            local hit = get(n)
            if not hit then return end
            local d = origin and distance(hit, origin) or n
            if not bestDistance or d < bestDistance - 0.001 or (math.abs(d-bestDistance) <= 0.001 and n == self.current) then
                best, bestDistance = n, d
            end
        end
        consider(self.current)
        for n = math.max(1, self.current - 2), math.min(2000, self.current + 2) do consider(n) end
        if self.newCandidate then consider(self.newCandidate); self.newCandidate = nil end
        local deadline = clock() + self.sliceSeconds
        for _ = 1, self.nearestBudget do
            if clock() >= deadline then break end
            consider(self.cursor)
            self.cursor = self.cursor % 2000 + 1
        end
        if not best then
            -- Numeric lookup only; no Workspace traversal or part search in this fallback.
            for n = 1, 2000 do if get(n) then best = n; break end end
        end
        if not best then self.lastOrigin, self.lock = nil, nil; return end
        local crossed = false
        if origin and self.lastOrigin then
            local hit = get(best)
            local nextN, prevN = nextAvailable(best, 1), nextAvailable(best, -1)
            local ahead, behind = nextN and get(nextN), prevN and get(prevN)
            local direction = ahead and (ahead.part.Position - hit.part.Position)
                or behind and (hit.part.Position - behind.part.Position)
                or (hit.part.CFrame and hit.part.CFrame.LookVector)
            local movement = (origin - self.lastOrigin).Magnitude
            -- Derive forward from numbered neighbours, not a possibly reversed door CFrame.
            -- Reject large teleports and crossings far from the physical door plane.
            if direction and direction.Magnitude > 0.01 and movement > 0.01 and movement <= 64 then
                local a, b = self.lastOrigin - hit.part.Position, origin - hit.part.Position
                local before = a.X*direction.X + a.Y*direction.Y + a.Z*direction.Z
                local after = b.X*direction.X + b.Y*direction.Y + b.Z*direction.Z
                local sign = before <= 0 and after > 0 and 1 or before >= 0 and after < 0 and -1 or nil
                local nearPlane = math.min(a.Magnitude, b.Magnitude) <= 12
                local target = sign and (nextAvailable(best, sign) or integer(best + sign))
                if sign and nearPlane then
                    if target then
                        self.lock = {source = best, target = target, direction = sign}
                        best, crossed = target, true
                    else self.lock = nil end
                end
            end
        end
        if not crossed and self.lock then
            if best == self.lock.source and bestDistance and bestDistance > 0.05 then
                -- Keep the next numeric slot while streaming, then skip to the next available door.
                local available = get(self.lock.target) and self.lock.target or nextAvailable(self.lock.source, self.lock.direction)
                self.lock.target = available or self.lock.target
                best = self.lock.target
            else self.lock = nil end
        end
        self.current, self.lastOrigin = best, origin
    end
    function self:refreshMarkers()
        local wanted, list = {}, {}
        for n = math.max(1, self.current - 1), math.min(2000, self.current + 1) do
            local hit = get(n)
            if hit then
                hit.distance = self.origin and distance(hit, self.origin) or nil
                wanted[n] = hit; list[#list + 1] = hit
            end
        end
        for n, entry in pairs(self.items) do
            if not wanted[n] or wanted[n].inst ~= entry.hit.inst or wanted[n].part ~= entry.hit.part then
                deps.removeMarker(entry.marker); self.items[n] = nil
            end
        end
        for n, hit in pairs(wanted) do
            local entry = self.items[n]
            if not entry then entry = {hit = hit, marker = deps.createMarker(hit)}; self.items[n] = entry end
            deps.updateMarker(entry.marker, hit, self, true)
        end
        self.list = list
    end
    function self:setEnabled(value)
        if self.destroyed then return false end
        self.enabled = value == true
        self.lastOrigin, self.lock = nil, nil
        if self.enabled then self:refreshCharacters(); self:beginScan()
        else
            for _, entry in pairs(self.items) do deps.removeMarker(entry.marker) end
            self.items, self.list, self.queue, self.queued = {}, {}, {}, {}
            self.head, self.tail, self.stack = 1, 0, nil
        end
        return self.enabled
    end
    function self:step(dt)
        if not self.enabled or self.destroyed or type(dt) ~= 'number' or dt ~= dt or dt < 0 or dt == math.huge then return end
        self:refreshCharacters()
        local origin = deps.getOrigin()
        self.origin = pointOK(origin) and origin or nil
        self.elapsed = self.elapsed + dt
        if not self.stack and (self.rescan or self.elapsed >= 2) then self.rescan = false; self:beginScan() end
        local deadline, processed = clock() + self.sliceSeconds, 0
        while self.head <= self.tail and processed < self.eventBudget and clock() < deadline do
            local inst = self.queue[self.head]; self.queue[self.head] = nil; self.queued[inst] = nil
            self.head, processed = self.head + 1, processed + 1
            self:inspect(inst)
        end
        if self.head > self.tail then self.head, self.tail = 1, 0 end
        self:scanSlice(); self:chooseCurrent(); self:refreshMarkers()
    end
    function self:destroy()
        if self.destroyed then return end
        self:setEnabled(false); self.byNumber = {}; self.destroyed = true
    end
    return self
end

-- Soft, local night vision. No sun/time/fog changes or per-frame world traversal.
local function createNightVision(deps)
    local self = {enabled = false, destroyed = false, elapsed = 0, effects = {}, effectCount = 0,
        saved = {}, applied = {}, cursors = {}, lastError = nil}
    local targets = {Ambient = Color3.fromRGB(100, 105, 115), OutdoorAmbient = Color3.fromRGB(110, 115, 125),
        Brightness = 1.2, ExposureCompensation = -0.15, GlobalShadows = false,
        EnvironmentDiffuseScale = 0.5, EnvironmentSpecularScale = 0.15}
    local function same(a, b)
        if a == b then return true end
        local kind = type(a)
        if (kind == 'table' or kind == 'userdata') and type(b) == kind then
            local ok, equal = pcall(function() return a.R == b.R and a.G == b.G and a.B == b.B end)
            return ok and equal
        end
        return false
    end
    local function restoreEffect(effect, entry)
        pcall(function() if effect.Enabled == false then effect.Enabled = entry.enabled end end)
    end
    function self:restore()
        for key, value in pairs(self.saved) do
            pcall(function()
                if same(deps.lighting[key], self.applied[key]) then deps.lighting[key] = value end
            end)
        end
        for effect, entry in pairs(self.effects) do restoreEffect(effect, entry) end
        if self.correction then pcall(function() self.correction:Destroy() end) end
        self.correction, self.effects, self.effectCount, self.saved, self.applied, self.cursors = nil, {}, 0, {}, {}, {}
    end
    function self:apply()
        for key, value in pairs(targets) do
            local current = deps.lighting[key]
            if self.applied[key] ~= nil and not same(current, self.applied[key]) then self.saved[key] = current end
            if not same(current, value) then deps.lighting[key] = value end
            self.applied[key] = value
        end
        if not self.correction or self.correction.Parent ~= deps.lighting then
            if self.correction then self.correction:Destroy() end
            self.correction = deps.createCorrection()
        end
        local correction = self.correction
        correction.Enabled, correction.Brightness, correction.Contrast, correction.Saturation = true, 0.01, -0.06, -0.08
        correction.TintColor = Color3.fromRGB(235, 242, 255)
        local camera = deps.getCamera()
        -- Only direct Lighting/Camera post-effects affect this view. Leave other instances alone.
        for effect, entry in pairs(self.effects) do
            if not effect.Parent or (effect.Parent ~= deps.lighting and effect.Parent ~= camera) then
                restoreEffect(effect, entry); self.effects[effect] = nil; self.effectCount = self.effectCount - 1
            elseif effect.Enabled ~= false then
                entry.enabled = effect.Enabled; effect.Enabled = false
            end
        end
        local roots, cursors = {deps.lighting}, {}
        if camera and camera.GetChildren then roots[#roots + 1] = camera end
        for _, root in ipairs(roots) do
            local children, cursor = root:GetChildren(), self.cursors[root] or 1
            for _ = 1, math.min(64, #children) do
                cursor = (cursor - 1) % #children + 1
                local effect = children[cursor]
                if effect ~= correction and (effect:IsA('BloomEffect') or effect:IsA('SunRaysEffect') or effect:IsA('ColorCorrectionEffect')) then
                    if not self.effects[effect] and self.effectCount < 128 then
                        self.effects[effect] = {enabled = effect.Enabled}; self.effectCount = self.effectCount + 1
                    end
                    if self.effects[effect] then effect.Enabled = false end
                end
                cursor = cursor + 1
            end
            cursors[root] = cursor
        end
        self.cursors = cursors
    end
    function self:setEnabled(value)
        if self.destroyed then return false, 'Night vision was destroyed' end
        if value ~= true then self.enabled = false; self:restore(); return false end
        if self.enabled then return true end
        self.lastError, self.elapsed = nil, 0
        for key in pairs(targets) do self.saved[key] = deps.lighting[key] end
        self.enabled = true
        local ok, err = pcall(function() self:apply() end)
        if not ok then
            self.enabled = false; self:restore(); self.lastError = tostring(err)
            return false, self.lastError
        end
        return true
    end
    function self:step(dt)
        if not self.enabled or self.destroyed or type(dt) ~= 'number' or dt ~= dt or dt < 0 or dt == math.huge then return end
        self.elapsed = self.elapsed + dt
        if self.elapsed >= 0.25 then self.elapsed = 0; self:apply() end
    end
    function self:destroy()
        if self.destroyed then return end
        self:setEnabled(false); self.destroyed = true
    end
    return self
end

-- END TRACKER CORE

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")
local Lighting = game:GetService("Lighting")
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
local itemEffects = new("Folder", {Name = "ItemTrackerLocalEffects"}, workspace)
local doorEffects = new("Folder", {Name = "DoorTrackerLocalEffects"}, workspace)
local connections, stopped = {}, false
local cleanupRows = function() end
local cleanupItemRows = function() end
local palette = {Color3.fromRGB(0, 190, 255), Color3.fromRGB(80, 255, 160),
    Color3.fromRGB(255, 185, 60), Color3.fromRGB(230, 110, 255)}
local function origin()
    local char = player.Character
    local root = char and char:FindFirstChild("HumanoidRootPart")
    if root then return root.Position end
    return workspace.CurrentCamera and workspace.CurrentCamera.CFrame.Position or nil
end
local trackerDeps = {
    root = workspace, players = Players, getOrigin = origin, now = os.clock,
    getAlertOrigin = function()
        local char = player.Character
        local head = char and char:FindFirstChild("Head")
        local root = char and char:FindFirstChild("HumanoidRootPart")
        if head and head:IsA("BasePart") then return head.Position end
        if root and root:IsA("BasePart") then return root.Position end
        return nil -- No camera distance pretending to be distance to the player.
    end,
    ignore = function(inst)
        return inst == effects or inst:IsDescendantOf(effects) or inst == itemEffects or inst:IsDescendantOf(itemEffects)
            or inst == doorEffects or inst:IsDescendantOf(doorEffects)
    end,
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
        local color = state.markerColorFor and state.markerColorFor(hit.inst) or palette[state.colorIndex] or palette[1]
        -- Folders/Tools use a representative BasePart rather than the container as Highlight adornee.
        marker.hl.Adornee = (hit.inst:IsA("Model") or hit.inst:IsA("BasePart")) and hit.inst or hit.part
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
}
local tracker = createTracker(trackerDeps)
local itemDeps = {}
for key, value in pairs(trackerDeps) do itemDeps[key] = value end
itemDeps.createMarker = function(hit)
    local marker = trackerDeps.createMarker(hit)
    marker.container.Name, marker.container.Parent = "ItemMarker", itemEffects
    return marker
end
local itemTracker = createItemTracker(itemDeps)
itemTracker.engine.markerColorFor = function(inst)
    local rgb = itemTracker:colorFor(inst) or {240, 201, 122}
    return Color3.fromRGB(rgb[1], rgb[2], rgb[3])
end
local doorDeps = {}
for key, value in pairs(trackerDeps) do doorDeps[key] = value end
doorDeps.getOrigin = function()
    local char = player.Character
    local root = char and char:FindFirstChild("HumanoidRootPart")
    return root and root:IsA("BasePart") and root.Position or nil
end
doorDeps.createMarker = function(hit)
    local marker = trackerDeps.createMarker(hit)
    marker.container.Name, marker.container.Parent = "DoorMarker", doorEffects
    marker.label.TextStrokeColor3 = Color3.fromRGB(255, 255, 255)
    marker.label.TextStrokeTransparency = 0
    return marker
end
doorDeps.updateMarker = function(marker, hit, state, visible)
    trackerDeps.updateMarker(marker, hit, state, visible)
    local text = "doors " .. hit.number .. " | " .. (hit.distance and string.format("%.1f stud", hit.distance) or "? stud")
    if state.showXYZ then
        local p = hit.part.Position
        text = text .. string.format("\nX %.1f  Y %.1f  Z %.1f", p.X, p.Y, p.Z)
    end
    marker.label.Text = text
end
local doorTracker = createDoorTracker(doorDeps)
doorTracker.markerColorFor = function() return Color3.fromRGB(0, 0, 0) end
local nightVision = createNightVision({lighting = Lighting,
    getCamera = function() return workspace.CurrentCamera end,
    createCorrection = function()
        return new("ColorCorrectionEffect", {Name = "TrackerSoftNightVision"}, Lighting)
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
    itemTracker:destroy()
    doorTracker:destroy()
    nightVision:destroy()
    cleanupRows(); cleanupItemRows()
    effects:Destroy(); itemEffects:Destroy(); doorEffects:Destroy()
    gui:Destroy()
end
connect(workspace.DescendantAdded, function(inst)
    tracker:notifyAdded(inst)
    itemTracker.engine:notifyAdded(inst)
    doorTracker:notifyAdded(inst)
    tracker:notifyAlert(inst)
end)
connect(stopEvent.Event, shutdown)
connect(gui.Destroying, shutdown)
if script and script.Destroying then connect(script.Destroying, shutdown) end
-- NOIR shell: one player tab with independent tracking and soft night-vision cards.
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
local itemCard, itemCardScale
local doorCard, doorCardScale
local nightCard, nightCardScale
local function fitContent()
    cardScale.Scale = math.min(1, (panel.Size.X.Offset - 72) / 548)
    local bottom = 16 + 1000 * cardScale.Scale
    if itemCard then
        itemCardScale.Scale = cardScale.Scale
        itemCard.Position = UDim2.fromOffset(8, bottom)
        bottom = bottom + 8 + itemCard.Size.Y.Offset * cardScale.Scale
    end
    if doorCard then
        doorCardScale.Scale = cardScale.Scale
        doorCard.Position = UDim2.fromOffset(8, bottom)
        bottom = bottom + 8 + doorCard.Size.Y.Offset * cardScale.Scale
    end
    if nightCard then
        nightCardScale.Scale = cardScale.Scale
        nightCard.Position = UDim2.fromOffset(8, bottom)
        bottom = bottom + 8 + nightCard.Size.Y.Offset * cardScale.Scale
    end
    page.CanvasSize = UDim2.fromOffset(0, bottom)
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
local function input(text, hint, x, y, w, parent)
    local box = new("TextBox", {Position = UDim2.fromOffset(x, y), Size = UDim2.fromOffset(w, 30),
        Text = text, PlaceholderText = hint, ClearTextOnFocus = false, TextColor3 = ink,
        PlaceholderColor3 = C.MUTED, Font = Enum.Font.Gotham, TextSize = 11,
        BackgroundColor3 = C.SURFACE2, BorderSizePixel = 0}, parent or card)
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
    Position = UDim2.new(1, -56, 0, 12), Size = UDim2.fromOffset(280, 66),
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
        -- Reserve the rightmost 36px button plus an 8px gap and 12px screen margin.
        -- Viewport-only scaling: entity count cannot resize the notification.
        alertScale.Scale = math.max(0.1, math.min(1, (view.X - 68) / 280, (view.Y - 24) / 66))
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
local restore = new("TextButton", {Name = "MenuToggle", Position = UDim2.new(1, -48, 0, 12),
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
label("Định vị & nhìn tối · không bay / không chạy script ngoài", 150, 960, 364, 28)
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
-- Item locator is a sibling card, never part of the entity preset list.
itemCard = new("Frame", {Name = "ItemTrackerPanel", Size = UDim2.fromOffset(548, 800),
    BackgroundColor3 = C.SURFACE, BackgroundTransparency = 0.12, BorderSizePixel = 0}, page)
corner(itemCard, 10); stroke(itemCard); gradient(itemCard, C.SURFACE2, C.SURFACE)
itemCardScale = new("UIScale", {Scale = 1}, itemCard)
local itemTitle = label("📦 ĐỊNH VỊ VẬT PHẨM · 6 NHÓM RIÊNG", 12, 8, 510, 24, itemCard)
itemTitle.Font, itemTitle.TextColor3 = Enum.Font.GothamBold, C.ACCENT
label("Chọn món riêng hoặc bật/chọn cả nhóm. Mở tiêu đề nhóm để xem các món. Không đổi định vị thực thể hay cảnh báo.", 12, 36, 510, 38, itemCard)
local itemQuery = input("", "VP: tên/path tùy chọn", 12, 80, 338, itemCard)
local itemMaster, itemStatus
local groupWidgets, itemRows, itemView, itemSelected = {}, {}, {}, nil
local itemDetail = label("Chọn một vật phẩm trong kết quả để xem path và XYZ.", 12, 380, 510, 36, itemCard)
local itemCopy = input("", "VP: path và XYZ", 12, 422, 496, itemCard)
itemCopy.TextEditable = false
local itemList = new("ScrollingFrame", {Name = "ItemResults", Position = UDim2.fromOffset(12, 262),
    Size = UDim2.fromOffset(496, 110), BackgroundColor3 = C.SURFACE2, BorderSizePixel = 0,
    ScrollBarThickness = 4, CanvasSize = UDim2.fromOffset(0, 0)}, itemCard)
local function paintItemControls()
    itemMaster.Text = itemTracker.engine.enabled and "Vật phẩm: BẬT" or "Vật phẩm: TẮT"
    itemMaster.TextColor3 = itemTracker.engine.enabled and C.GREEN or C.MUTED
    for _, group in ipairs(itemTracker.groups) do
        local widgets = groupWidgets[group.id]
        if widgets then
            local selectedCount = 0
            for _, name in ipairs(group.items) do
                local chosen = group.selected[name] == true
                if chosen then selectedCount = selectedCount + 1 end
                widgets.items[name].Text = name .. (chosen and ": ✓" or ": —")
                widgets.items[name].TextColor3 = chosen and widgets.color or C.MUTED
            end
            widgets.toggle.Text = (group.enabled and "Nhóm: BẬT" or "Nhóm: TẮT") .. " (" .. selectedCount .. ")"
            widgets.toggle.TextColor3 = group.enabled and widgets.color or C.MUTED
            widgets.title.Text = (widgets.expanded and "▼ " or "▶ ") .. group.title
        end
    end
end
local function applyItemQuery()
    itemTracker:setQuery(itemQuery.Text)
    paintItemControls()
end
button("VP Tìm tên/path", 360, 80, 148, applyItemQuery, itemCard)
connect(itemQuery.FocusLost, function(enter) if enter then applyItemQuery() end end)
itemMaster = button("Vật phẩm: TẮT", 12, 118, 156, function()
    itemTracker:setEnabled(not itemTracker.engine.enabled)
    paintItemControls()
end, itemCard)
button("VP Quét lại", 176, 118, 156, function()
    if itemQuery.Text ~= itemTracker.query then applyItemQuery()
    elseif itemTracker.engine.enabled then itemTracker.engine:beginScan() end
end, itemCard)
button("VP Xóa lựa chọn", 340, 118, 168, function()
    itemQuery.Text, itemSelected = "", nil
    itemTracker:clear(); paintItemControls()
end, itemCard)
local function itemOption(text, key, x, width)
    local b
    local function paint()
        b.Text = "VP " .. text .. (itemTracker.engine[key] and ": BẬT" or ": TẮT")
        b.TextColor3 = itemTracker.engine[key] and C.GREEN or C.MUTED
    end
    b = button("", x, 154, width, function()
        itemTracker.engine[key] = not itemTracker.engine[key]
        itemTracker.engine:refreshMarkers(); paint()
    end, itemCard)
    paint()
end
itemOption("Hộp", "showBox", 12, 108)
itemOption("Nhãn", "showLabel", 128, 108)
itemOption("XYZ", "showXYZ", 244, 108)
itemOption("Xuyên tường", "throughWalls", 360, 148)
local itemDistance = input("0", "VP stud; 0 = vô hạn", 12, 190, 118, itemCard)
button("VP Đặt xa", 138, 190, 106, function()
    if not itemTracker.engine:setDistance(itemDistance.Text) then itemStatus.Text = "VP: khoảng cách phải là số hữu hạn >= 0." end
end, itemCard)
button("VP Chọn tất cả", 252, 190, 124, function() itemTracker:setAll(true); paintItemControls() end, itemCard)
button("VP Bỏ tất cả", 384, 190, 124, function() itemTracker:setAll(false); paintItemControls() end, itemCard)
itemStatus = label("Vật phẩm tắt · chưa chọn món nào", 12, 226, 510, 28, itemCard)
itemStatus.TextColor3 = C.ACCENT
local itemExit = button("Dừng & thoát", 12, 0, 128, shutdown, itemCard)
local function layoutItems()
    local y = 468
    for _, group in ipairs(itemTracker.groups) do
        local widgets = groupWidgets[group.id]
        local bodyHeight = 80 + math.ceil(#group.items / 2) * 30
        local height = widgets.expanded and bodyHeight or 44
        widgets.frame.Position, widgets.frame.Size = UDim2.fromOffset(12, y), UDim2.fromOffset(524, height)
        widgets.body.Visible = widgets.expanded
        y = y + height + 8
    end
    itemExit.Position = UDim2.fromOffset(12, y)
    itemCard.Size = UDim2.fromOffset(548, y + 40)
    fitContent()
end
for _, group in ipairs(itemTracker.groups) do
    local color = Color3.fromRGB(group.rgb[1], group.rgb[2], group.rgb[3])
    local frame = new("Frame", {Name = "ItemGroup_" .. group.id, BackgroundColor3 = C.SURFACE2,
        BorderSizePixel = 0}, itemCard)
    corner(frame, 7); stroke(frame, color)
    local body = new("Frame", {Name = "GroupItems", Position = UDim2.fromOffset(0, 44),
        Size = UDim2.fromOffset(524, 40 + math.ceil(#group.items / 2) * 30),
        BackgroundTransparency = 1, BorderSizePixel = 0, Visible = false}, frame)
    local widgets = {frame = frame, body = body, expanded = false, color = color, items = {}}
    groupWidgets[group.id] = widgets
    widgets.title = button("", 4, 4, 310, function()
        widgets.expanded = not widgets.expanded
        paintItemControls(); layoutItems()
    end, frame)
    widgets.title.Name, widgets.title.Size = "ExpandGroup", UDim2.fromOffset(310, 34)
    widgets.title.TextWrapped, widgets.title.TextColor3 = true, color
    widgets.toggle = button("", 322, 6, 196, function()
        if not group.enabled and next(group.selected) == nil then itemTracker:selectGroup(group.id, true)
        else itemTracker:setGroupEnabled(group.id, not group.enabled) end
        paintItemControls()
    end, frame)
    widgets.toggle.Name = "ToggleGroup"
    button("Chọn cả nhóm", 4, 0, 244, function() itemTracker:selectGroup(group.id, true); paintItemControls() end, body).Name = "SelectGroup"
    button("Bỏ chọn cả nhóm", 256, 0, 244, function() itemTracker:selectGroup(group.id, false); paintItemControls() end, body).Name = "ClearGroup"
    for i, name in ipairs(group.items) do
        local b = button("", 4 + ((i - 1) % 2) * 252, 36 + math.floor((i - 1) / 2) * 30, 244, function()
            itemTracker:setItem(group.id, name, not group.selected[name]); paintItemControls()
        end, body)
        b.Name, b.TextWrapped = "Item_" .. name, true
        widgets.items[name] = b
    end
end
paintItemControls(); layoutItems()
button("Vật phẩm ↓", 200, 8, 140, function()
    page.CanvasPosition = Vector2.new(0, itemCard.Position.Y.Offset)
end)
local function renderItems()
    local engine, changed = itemTracker.engine, #itemView ~= #itemTracker.engine.list
    for i, hit in ipairs(engine.list) do if itemView[i] ~= hit.inst then changed = true end end
    if changed then
        cleanupItemRows()
        itemView = {}
        for i, hit in ipairs(engine.list) do
            itemView[i] = hit.inst
            local inst = hit.inst
            local b = new("TextButton", {Size = UDim2.new(1, -76, 0, 26), Position = UDim2.fromOffset(4, (i - 1) * 28),
                TextColor3 = C.DARK, BackgroundColor3 = C.BG, TextSize = 11, Font = Enum.Font.Gotham,
                TextXAlignment = Enum.TextXAlignment.Left, RichText = false, BorderSizePixel = 0}, itemList)
            local c = b.Activated:Connect(function() itemSelected = inst end)
            local toggle = new("TextButton", {Name = "ToggleItemResult", Position = UDim2.new(1, -68, 0, (i - 1) * 28),
                Size = UDim2.fromOffset(56, 26), BackgroundColor3 = C.SURFACE3, TextColor3 = C.ACCENT,
                TextSize = 10, BorderSizePixel = 0}, itemList)
            local tc = toggle.Activated:Connect(function() engine:setObjectEnabled(inst, engine.disabledObjects[inst] == true) end)
            itemRows[#itemRows + 1] = {button = b, connection = c, toggle = toggle, toggleConnection = tc}
        end
        itemList.CanvasSize = UDim2.fromOffset(0, #itemRows * 28)
    end
    local selectedHit
    for i, hit in ipairs(engine.list) do
        local row = itemRows[i]
        row.button.Text = "VP " .. hit.inst.Name .. " | " .. (hit.distance and string.format("%.1f", hit.distance) or "?") .. " stud"
        row.button.TextColor3 = engine.markerColorFor(hit.inst)
        row.toggle.Text = engine.disabledObjects[hit.inst] and "VP Bật" or "VP Tắt"
        if hit.inst == itemSelected then selectedHit = hit end
    end
    if selectedHit then
        local p = selectedHit.part.Position
        itemDetail.Text = selectedHit.inst.Name .. " · " .. selectedHit.inst.ClassName
        itemCopy.Text = string.format("%s | X %.3f, Y %.3f, Z %.3f", selectedHit.path, p.X, p.Y, p.Z)
    else itemSelected = nil; itemDetail.Text = "Chọn một vật phẩm để xem path và XYZ."; itemCopy.Text = "" end
    itemStatus.Text = string.format("Vật phẩm: %s · %d/%d vật · tối đa %d · nhóm/màu riêng",
        engine.enabled and "BẬT" or "TẮT", #engine.list, engine.found, engine.maxItems)
    paintItemControls()
end
cleanupItemRows = function()
    for _, row in ipairs(itemRows) do
        row.connection:Disconnect(); row.toggleConnection:Disconnect()
        row.button:Destroy(); row.toggle:Destroy()
    end
    itemRows = {}
end

-- One door feature, one switch. Display and rescanning are automatic.
local function createDoorPanel()
    doorCard = new("Frame", {Name = "DoorTrackerPanel", Size = UDim2.fromOffset(548, 212),
        BackgroundColor3 = C.SURFACE, BorderSizePixel = 0}, page)
    corner(doorCard, 10); stroke(doorCard, Color3.fromRGB(0, 0, 0), 2)
    doorCardScale = new("UIScale", {Scale = 1}, doorCard)
    local heading = label("⬛ Định vị cửa", 12, 8, 524, 32, doorCard)
    heading.TextColor3, heading.BackgroundColor3, heading.BackgroundTransparency = Color3.fromRGB(0, 0, 0), Color3.fromRGB(215, 215, 215), 0
    corner(heading)
    label("Đường dẫn: Workspace.CurrentRooms.1.Door.Door", 12, 48, 524, 26, doorCard)
    local master
    local function paint()
        master.Text = doorTracker.enabled and "Định vị cửa: BẬT" or "Định vị cửa: TẮT"
    end
    master = button("Định vị cửa: TẮT", 12, 84, 524, function()
        doorTracker:setEnabled(not doorTracker.enabled); paint()
    end, doorCard)
    master.Name = "ToggleDoorTracker"
    label("Tự tìm cửa 1–2000, hiện màu đen và theo dõi tiến/lùi. Chỉ giữ 3 cửa lân cận.", 12, 120, 524, 32, doorCard)
    local statusLabel = label("Định vị cửa đang tắt.", 12, 158, 524, 40, doorCard)
    statusLabel.Name = "DoorStatus"
    -- Navigation only; no second switch or duplicate feature in the original card.
    button("Cửa ↓", 348, 8, 160, function()
        page.CanvasPosition = Vector2.new(0, doorCard.Position.Y.Offset)
    end)
    local function render()
        paint()
        if not doorTracker.enabled then
            statusLabel.Text = "Định vị cửa đang tắt."
        elseif #doorTracker.list == 0 then
            statusLabel.Text = "Đang tự tìm Workspace.CurrentRooms.<1–2000>.Door.Door..."
        else
            local numbers = {}
            for _, hit in ipairs(doorTracker.list) do numbers[#numbers + 1] = tostring(hit.number) end
            statusLabel.Text = "Cửa hiện tại: " .. doorTracker.current .. " · Đang định vị: " .. table.concat(numbers, " / ")
                .. (doorTracker.origin and "" or " · Chờ nhân vật")
        end
    end
    return render, statusLabel
end
local renderDoors, doorStatus = createDoorPanel()

-- A single independent, soft night-vision switch; no extra Player tab.
local function createNightPanel()
    nightCard = new("Frame", {Name = "NightVisionPanel", Size = UDim2.fromOffset(548, 190),
        BackgroundColor3 = C.SURFACE, BorderSizePixel = 0}, page)
    corner(nightCard, 10); stroke(nightCard)
    nightCardScale = new("UIScale", {Scale = 1}, nightCard)
    label("🌙 Nhìn trong bóng tối · ánh sáng dịu", 12, 8, 524, 30, nightCard)
    label("Tăng sáng vùng tối vừa phải, giảm bloom/chói. Không đổi giờ hay xóa sương mù.", 12, 44, 524, 34, nightCard)
    local master, statusLabel
    local function render()
        master.Text = nightVision.enabled and "Nhìn bóng tối: BẬT" or "Nhìn bóng tối: TẮT"
        statusLabel.Text = nightVision.lastError and ("Lỗi ánh sáng: " .. nightVision.lastError)
            or (nightVision.enabled and "Ánh sáng dịu đang bật · tắt để khôi phục ánh sáng game."
                or "Đang tắt · không thay đổi ánh sáng của game.")
    end
    master = button("Nhìn bóng tối: TẮT", 12, 86, 524, function()
        nightVision:setEnabled(not nightVision.enabled); render()
    end, nightCard)
    master.Name = "ToggleNightVision"
    statusLabel = label("", 12, 124, 524, 50, nightCard)
    statusLabel.Name = "NightVisionStatus"
    -- The last (23rd) entity preset leaves the right-hand grid cell free.
    button("Bóng tối ↓", 264, 914, 244, function()
        page.CanvasPosition = Vector2.new(0, nightCard.Position.Y.Offset)
    end).Name = "NightVisionShortcut"
    render()
    return render
end
local renderNightVision = createNightPanel()

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
    local refreshItemUi = false
    local ok, err = pcall(function()
        tracker:step(dt)
        renderAlerts()
        ringGradient.Rotation = (ringGradient.Rotation + dt * 90) % 360
        uiElapsed = uiElapsed + dt
        if uiElapsed >= 0.10 then
            uiElapsed = 0
            fit(); fitContent(); renderList(); paintToggle()
            refreshItemUi = true
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
    -- A failure in the new item module must not disable the existing tracker or alerts.
    local itemOk, itemError = pcall(function()
        itemTracker.engine:step(dt)
        if refreshItemUi then renderItems() end
    end)
    if not itemOk then
        itemTracker:setEnabled(false)
        paintItemControls()
        itemStatus.Text = "Lỗi vật phẩm: " .. tostring(itemError)
        warn("[ItemTracker] " .. tostring(itemError))
    end
    local doorOk, doorError = pcall(function()
        doorTracker:step(dt)
        if refreshItemUi then renderDoors() end
    end)
    if not doorOk then
        doorTracker:setEnabled(false)
        renderDoors()
        doorStatus.Text = "Lỗi định vị cửa: " .. tostring(doorError)
        warn("[DoorTracker] " .. tostring(doorError))
    end
    local nightOk, nightError = pcall(function()
        nightVision:step(dt)
        if refreshItemUi then renderNightVision() end
    end)
    if not nightOk then
        nightVision:setEnabled(false)
        nightVision.lastError = tostring(nightError)
        renderNightVision()
        warn("[NightVision] " .. tostring(nightError))
    end
end)
fit(); fitContent()
