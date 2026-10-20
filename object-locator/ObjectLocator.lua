--[[
    ObjectLocator.lua — ĐỊNH VỊ VẬT THỂ THEO TÊN / PATH (Roblox LocalScript)

    Mục đích: thay thế khối "🌳 Định vị vật" trong tab 👥 Người Chơi của
    script.js, nhưng viết lại từ đầu với các giới hạn hiệu năng rõ ràng.

    Điểm khác biệt chính so với bản trong script.js:
      * Quét workspace theo NGÂN SÁCH mỗi khung hình (số node + ms), không
        quét đồng bộ toàn bộ workspace khi gõ/kéo.
      * Không giữ mảng slot tăng vô hạn; hàng đợi hiển thị có trần.
      * Path không phân giải được thì GIỮ LẠI và thử lại ở lần quét sau,
        không bị đổi thành "tên" rác.
      * Preset lưu/khôi phục đủ query + entries + khoảng cách + màu + style.
      * Có AutoRestoreSaved thật (bản script.js chỉ gọi hàm không tồn tại).
      * Danh sách cập nhật khoảng cách theo thời gian thực (bản cũ đóng băng
        khoảng cách vì chữ ký dòng không chứa dist).

    Cách dùng:
      1) Dán cả tệp này vào MỘT LocalScript trong
         StarterPlayer > StarterPlayerScripts (hoặc chạy bằng executor).
      2) Màn hình hiện nút 🌳 / bảng điều khiển.
      3) Gõ tên vật (VD: cây, đá, rương) hoặc path
         (VD: Workspace.Rừng.Cây Lớn), Enter.
      4) Bấm 🧭 trên một dòng để nhân vật đi bộ tới vật (Humanoid:MoveTo).

    GIỚI HẠN ĐÃ BIẾT:
      * Chỉ quét Workspace (không quét ReplicatedStorage, Lighting...).
      * Chỉ thấy vật đã được client stream/replicate. Vật chưa stream sẽ
        xuất hiện ở lần quét sau.
      * Tên trùng nhau được gộp theo Model/Folder cha gần nhất khớp cùng
        khoá; một Model chỉ có một Highlight (không phải mỗi part một cái).
      * "Đi tới" là Humanoid:MoveTo (đi bộ), không phải teleport/fly; server
        có thể từ chối nếu game chặn.
      * Lưu preset chỉ hoạt động khi môi trường có writefile/readfile
        (executor). Trong Studio thuần, preset chỉ sống trong phiên.
      * Không có wallhack/exploit: chỉ dùng Instance, Highlight, BillboardGui,
        BoxHandleAdornment, SelectionBox — các API công khai của Roblox.
]]

local ObjectLocator = {}
ObjectLocator.VERSION = "1.0.0"

-- ===========================================================================
-- 1. CẤU HÌNH
-- ===========================================================================

local Config = {
    keybind = "RightShift",          -- Enum.KeyCode.* hoặc nil để tắt phím tắt
    rescanEvery = 1.0,               -- giây giữa 2 lần quét khi bảng đang mở
    hiddenRescanEvery = 2.5,         -- giây giữa 2 lần quét khi bảng thu nhỏ
    scanNodesPerFrame = 320,         -- trần số instance xử lý mỗi khung hình
    scanMsPerFrame = 1.2,            -- trần thời gian quét mỗi khung hình (ms)
    frameBudgetMs = 3.0,             -- trần thời gian cả khối định vị/khung
    makePerFrame = 8,                -- số Highlight/Billboard tạo mới mỗi khung
    tickEvery = 0.22,                -- giây giữa 2 lần cập nhật nhãn
    tickPerFrame = 30,               -- số vật cập nhật nhãn mỗi lần
    uiEvery = 0.25,                  -- giây giữa 2 lần làm mới danh sách UI
    maxItems = 80,                   -- trần số vật được hiển thị
    maxHits = 4000,                  -- trần số hit thu thập mỗi lượt quét
    headless = false,                -- true = không tự nối RenderStepped (test)
    maxDistance = 0,                 -- 0 = không giới hạn (stud)
    maxDistanceLimit = 100000,
    labelMaxDistance = 5000,         -- BillboardGui.MaxDistance
    listRows = 14,                   -- số dòng kết quả hiện trong bảng
    maxPresets = 24,
    presetsPath = "ObjectLocator/presets.json",
    autoRestore = true,              -- tự nạp preset lần trước (không tự bật)
    autoStart = false,               -- true = bật định vị ngay nếu preset active
    skipPlayers = true,              -- bỏ qua nhân vật người chơi
    showLabel = true,
    showXYZ = true,
    showBox = false,
    throughWall = true,
    colorIndex = 1,
}

ObjectLocator.Config = Config

-- ===========================================================================
-- 2. TIỆN ÍCH CHUNG
-- ===========================================================================

local function trim(value)
    local s = tostring(value or "")
    s = s:gsub("^%s+", "")
    s = s:gsub("%s+$", "")
    return s
end

local function clampNumber(value, low, high, fallback)
    local n = tonumber(value)
    if n == nil or n ~= n then
        return fallback
    end
    if n < low then
        return low
    end
    if n > high then
        return high
    end
    return n
end

local function clampInt(value, low, high, fallback)
    local n = math.floor(clampNumber(value, low, high, fallback) + 0.5)
    if n < low then n = low end
    if n > high then n = high end
    return n
end

local function round(value)
    return math.floor((tonumber(value) or 0) + 0.5)
end

local function safeCall(fn, ...)
    local ok, result = pcall(fn, ...)
    if ok then
        return result
    end
    return nil
end

local function nowClock()
    return os.clock()
end

-- ===========================================================================
-- 3. CORE — logic thuần, không tạo GUI, dùng được ngoài Roblox
-- ===========================================================================

local Core = {}
ObjectLocator.Core = Core

Core.trim = trim
Core.clampNumber = clampNumber
Core.clampInt = clampInt
Core.round = round

-- Bảng gấp dấu tiếng Việt (đủ cho tên vật thường gặp).
local foldMap = nil
local function getFoldMap()
    if foldMap ~= nil then
        return foldMap
    end
    foldMap = {}
    local groups = {
        a = "áàảãạăắằẳẵặâấầẩẫậÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬ",
        e = "éèẻẽẹêếềểễệÉÈẺẼẸÊẾỀỂỄỆ",
        i = "íìỉĩịÍÌỈĨỊ",
        o = "óòỏõọôốồổỗộơớờởỡợÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢ",
        u = "úùủũụưứừửữựÚÙỦŨỤƯỨỪỬỮỰ",
        y = "ýỳỷỹỵÝỲỶỸỴ",
        d = "đĐ",
    }
    if type(utf8) == "table" and type(utf8.codes) == "function" and type(utf8.char) == "function" then
        for base, chars in pairs(groups) do
            local ok = pcall(function()
                for _, cp in utf8.codes(chars) do
                    foldMap[cp] = base
                end
            end)
            if not ok then
                foldMap = {}
                break
            end
        end
    end
    return foldMap
end

--- Chuẩn hoá tên: bỏ dấu tiếng Việt, gộp khoảng trắng, chữ thường.
function Core.normalize(value)
    local text = value
    if text == nil then
        return ""
    end
    text = tostring(text)
    if text == "" then
        return ""
    end

    local mapping = getFoldMap()
    local out = {}
    local count = 0
    local usedUtf8 = false

    if type(utf8) == "table" and type(utf8.codes) == "function" and type(utf8.char) == "function" then
        usedUtf8 = pcall(function()
            for _, cp in utf8.codes(text) do
                count = count + 1
                out[count] = mapping[cp] or utf8.char(cp)
            end
        end)
        if not usedUtf8 then
            out = {}
            count = 0
        end
    end

    if not usedUtf8 or count == 0 then
        out = { text }
        count = 1
    end

    local joined = table.concat(out, "", 1, count)
    joined = joined:gsub("%s+", " ")
    joined = trim(joined)
    return joined:lower()
end

function Core.isPathLike(raw)
    local text = tostring(raw or "")
    return text:find(".", 1, true) ~= nil
        or text:find("/", 1, true) ~= nil
        or text:find("\\", 1, true) ~= nil
end

--- "game.Workspace/Rừng Cây.Cây" -> {"rung cay", "cay"}
function Core.pathSegments(raw)
    local text = tostring(raw or ""):gsub("[/\\]", ".")
    local segs = {}
    for part in text:gmatch("[^%.]+") do
        local seg = Core.normalize(trim(part))
        if seg ~= "" then
            segs[#segs + 1] = seg
        end
    end
    local guard = 0
    while #segs > 0 and (segs[1] == "game" or segs[1] == "workspace") and guard < 4 do
        table.remove(segs, 1)
        guard = guard + 1
    end
    return segs
end

--- Một mục thô -> entry chuẩn {raw, kind="name"|"path", key, segs}
function Core.parseEntry(raw)
    local text = trim(raw)
    if text == "" then
        return nil
    end
    if Core.isPathLike(text) then
        local segs = Core.pathSegments(text)
        if #segs == 0 then
            return nil
        end
        return {
            raw = text,
            kind = "path",
            key = table.concat(segs, "."),
            segs = segs,
        }
    end
    local key = Core.normalize(text)
    if key == "" then
        return nil
    end
    return {
        raw = text,
        kind = "name",
        key = key,
        segs = nil,
    }
end

--- Tách chuỗi người dùng nhập: "cây, đá; rương" -> danh sách entry (đã dedupe)
function Core.parseList(raw)
    local out = {}
    local seen = {}
    for part in tostring(raw or ""):gmatch("[^,;]+") do
        local entry = Core.parseEntry(part)
        if entry ~= nil then
            local dedupe = entry.kind .. ":" .. entry.key
            if not seen[dedupe] then
                seen[dedupe] = true
                out[#out + 1] = entry
            end
        end
    end
    return out
end

--- Gộp entry đã ghim + entry từ ô tìm kiếm, giữ thứ tự, chống trùng.
function Core.merge(pinned, parsed)
    local out = {}
    local seen = {}
    local function add(entry)
        if type(entry) ~= "table" then
            return
        end
        local kind = entry.kind or "name"
        local key = entry.key
        if key == nil then
            local reparsed = Core.parseEntry(entry.raw)
            if reparsed == nil then
                return
            end
            kind, key = reparsed.kind, reparsed.key
        end
        local dedupe = tostring(kind) .. ":" .. tostring(key)
        if not seen[dedupe] then
            seen[dedupe] = true
            out[#out + 1] = {
                raw = entry.raw or key,
                kind = kind,
                key = key,
                segs = entry.segs,
            }
        end
    end
    for i = 1, #(pinned or {}) do
        add(pinned[i])
    end
    for i = 1, #(parsed or {}) do
        add(parsed[i])
    end
    return out
end

--- Cache tên đã chuẩn hoá theo instance (weak key, tránh giữ instance sống).
function Core.nameOf(inst, cache)
    if inst == nil then
        return ""
    end
    local raw = inst.Name
    local cached = cache and cache[inst]
    if cached ~= nil and cached.raw == raw then
        return cached.norm
    end
    local norm = Core.normalize(raw)
    if cache then
        cache[inst] = { raw = raw, norm = norm }
    end
    return norm
end

--- Trả về khoá đầu tiên khớp (khớp chuỗi con, không dùng pattern Lua).
function Core.matchKey(normName, keys)
    if normName == "" or type(keys) ~= "table" then
        return nil
    end
    for i = 1, #keys do
        local key = keys[i]
        if key ~= "" and normName:find(key, 1, true) ~= nil then
            return key
        end
    end
    return nil
end

function Core.resolvePath(root, segs, cache)
    if root == nil or type(segs) ~= "table" or #segs == 0 then
        return nil
    end
    local current = root
    for i = 1, #segs do
        if current == nil then
            return nil
        end
        local ok, children = pcall(function()
            return current:GetChildren()
        end)
        if not ok or type(children) ~= "table" then
            return nil
        end
        local want = segs[i]
        local found = nil
        for k = 1, #children do
            local child = children[k]
            if child ~= nil and Core.nameOf(child, cache) == want then
                found = child
                break
            end
        end
        if found == nil then
            return nil
        end
        current = found
    end
    return current
end

function Core.isA(inst, className)
    if inst == nil then
        return false
    end
    local ok, result = pcall(function()
        return inst:IsA(className)
    end)
    return ok and result == true
end

function Core.isAlive(inst)
    if inst == nil then
        return false
    end
    local ok, parent = pcall(function()
        return inst.Parent
    end)
    return ok and parent ~= nil
end

function Core.isVector(value)
    if value == nil then
        return false
    end
    local okX, x = pcall(function() return value.X end)
    local okY, y = pcall(function() return value.Y end)
    local okZ, z = pcall(function() return value.Z end)
    return okX and okY and okZ
        and type(x) == "number" and type(y) == "number" and type(z) == "number"
end

function Core.distance(a, b)
    if not Core.isVector(a) or not Core.isVector(b) then
        return nil
    end
    local dx = a.X - b.X
    local dy = a.Y - b.Y
    local dz = a.Z - b.Z
    return math.sqrt(dx * dx + dy * dy + dz * dz)
end

--- BasePart đại diện cho một Instance (part, model, folder...).
function Core.basePartOf(inst)
    if inst == nil then
        return nil
    end
    if Core.isA(inst, "BasePart") then
        return inst
    end
    local okPrimary, primary = pcall(function()
        return inst.PrimaryPart
    end)
    if okPrimary and primary ~= nil then
        return primary
    end
    local okFind, found = pcall(function()
        return inst:FindFirstChildWhichIsA("BasePart", true)
    end)
    if okFind and found ~= nil then
        return found
    end
    return nil
end

--- Vị trí để vẽ/khoảng cách. Trả nil nếu không xác định được.
function Core.positionOf(inst)
    if inst == nil then
        return nil
    end
    local okPos, pos = pcall(function()
        return inst.Position
    end)
    if okPos and Core.isVector(pos) then
        return pos
    end
    local part = Core.basePartOf(inst)
    if part ~= nil and part ~= inst then
        local okPart, partPos = pcall(function()
            return part.Position
        end)
        if okPart and Core.isVector(partPos) then
            return partPos
        end
    end
    local okCf, cf = pcall(function()
        return inst.CFrame
    end)
    if okCf and cf ~= nil then
        local okP, cfPos = pcall(function()
            return cf.Position
        end)
        if okP and Core.isVector(cfPos) then
            return cfPos
        end
    end
    return nil
end

function Core.pathOf(inst)
    if inst == nil then
        return "nil"
    end
    local parts = {}
    local current = inst
    local guard = 0
    while current ~= nil and current ~= game and guard < 40 do
        table.insert(parts, 1, tostring(current.Name))
        current = current.Parent
        guard = guard + 1
    end
    return table.concat(parts, ".")
end

function Core.coordsText(pos)
    if not Core.isVector(pos) then
        return ""
    end
    return string.format("%.0f, %.0f, %.0f", pos.X, pos.Y, pos.Z)
end

function Core.copyList(list)
    local out = {}
    for i = 1, #(list or {}) do
        local item = list[i]
        if type(item) == "table" then
            local copy = {}
            for k, v in pairs(item) do
                copy[k] = v
            end
            out[#out + 1] = copy
        else
            out[#out + 1] = item
        end
    end
    return out
end

-- ===========================================================================
-- 4. SCANNER — quét workspace theo ngân sách, không chặn khung hình
-- ===========================================================================

local Scanner = {}
Scanner.__index = Scanner

function Scanner.new(options)
    options = options or {}
    local self = setmetatable({}, Scanner)
    self.workspace = options.workspace
    self.clock = options.clock or nowClock
    self.nameCache = setmetatable({}, { __mode = "k" })
    self.keys = {}
    self.paths = {}
    self.skipSet = {}
    self.skipRoots = {}
    self.maxDistance = 0
    self.maxItems = 80
    self.maxHits = 4000
    self.origin = nil
    self.posCache = setmetatable({}, { __mode = "k" })
    self.pathCache = {}

    self.queue = {}
    self.qn = 0
    self.scanning = false
    self.scanned = 0
    self.hits = {}
    self.list = {}
    self.hitsCount = 0
    self.grouped = 0
    self.unlocatable = 0
    self.errors = 0
    self.scanMs = 0
    self.capped = false
    self.truncated = false
    self.unresolvedPaths = 0
    self.pathSet = {}
    self.lastError = nil
    return self
end

function Scanner:reset()
    self.queue = {}
    self.qn = 0
    self.scanning = false
    self.scanned = 0
    self.hits = {}
    self.list = {}
    self.hitsCount = 0
    self.grouped = 0
    self.unlocatable = 0
    self.errors = 0
    self.scanMs = 0
    self.capped = false
    self.truncated = false
    self.unresolvedPaths = 0
    self.pathSet = {}
    self.posCache = setmetatable({}, { __mode = "k" })
end

function Scanner:begin()
    self:reset()
    self.queue = { self.workspace }
    self.qn = 1
    self.scanning = true

    -- Phân giải path MỘT lần đầu mỗi lượt quét; path chưa thấy sẽ được thử
    -- lại ở lượt sau, KHÔNG bị biến thành khoá tên rác.
    for i = 1, #self.paths do
        local entry = self.paths[i]
        if type(entry) == "table" then
            local segs = entry.segs
            if segs == nil then
                segs = Core.pathSegments(entry.raw or entry.key)
                entry.segs = segs
            end
            local cacheKey = "path:" .. tostring(entry.key or entry.raw)
            local cached = self.pathCache[cacheKey]
            local target = nil
            if cached ~= nil and cached.target ~= nil and Core.isAlive(cached.target)
                and (self.clock() - (cached.at or 0)) < 2.0 then
                target = cached.target
            else
                local okResolve, resolved = pcall(Core.resolvePath, self.workspace, segs, self.nameCache)
                if okResolve then
                    target = resolved
                end
                self.pathCache[cacheKey] = { target = target, at = self.clock() }
            end
            if target ~= nil then
                self.pathSet[target] = true
            else
                self.unresolvedPaths = self.unresolvedPaths + 1
            end
        end
    end

    if self.workspace == nil then
        self.scanning = false
        self:finish()
    end
end

function Scanner:position(inst)
    local cached = self.posCache[inst]
    if cached ~= nil then
        return cached or nil
    end
    local pos = Core.positionOf(inst)
    self.posCache[inst] = pos or false
    return pos
end

--- Model/Folder cha gần nhất cùng khớp khoá -> part con bị gộp.
function Scanner:groupedBy(inst, key)
    local parent = inst.Parent
    local depth = 0
    while parent ~= nil and parent ~= self.workspace and depth < 24 do
        if Core.isA(parent, "Model") or Core.isA(parent, "Folder") then
            local parentKey = Core.matchKey(Core.nameOf(parent, self.nameCache), self.keys)
            if parentKey == key then
                local parentPos = self:position(parent)
                local parentDist = 0
                if parentPos ~= nil and self.origin ~= nil then
                    parentDist = Core.distance(parentPos, self.origin) or 0
                end
                local inside = (self.maxDistance <= 0) or (parentPos ~= nil and parentDist <= self.maxDistance)
                if inside then
                    return parent
                end
            end
        end
        parent = parent.Parent
        depth = depth + 1
    end
    return nil
end

function Scanner:onNode(inst)
    if inst == self.workspace then
        return
    end

    local isPath = self.pathSet[inst] == true
    local key = nil

    if not isPath then
        key = Core.matchKey(Core.nameOf(inst, self.nameCache), self.keys)
        if key == nil then
            return
        end
        if self:groupedBy(inst, key) ~= nil then
            self.grouped = self.grouped + 1
            return
        end
    end

    local pos = self:position(inst)
    if pos == nil then
        self.unlocatable = self.unlocatable + 1
        return
    end

    -- Gốc chưa biết (spectate/freecam/chưa có nhân vật): KHÔNG được coi là
    -- dist = 0 rồi lọc mù, cũng không được bịa "0m" trên nhãn.
    local dist = 0
    local unknownDist = false
    if self.origin ~= nil then
        dist = Core.distance(pos, self.origin) or 0
    else
        unknownDist = true
    end
    if self.maxDistance > 0 and not unknownDist and dist > self.maxDistance then
        return
    end

    local part = Core.basePartOf(inst)
    if part == nil and not Core.isA(inst, "Model") then
        -- Folder/Instance không có BasePart thì không vẽ được.
        return
    end

    if self.maxHits > 0 and #self.hits >= self.maxHits then
        self.truncated = true
        return
    end

    self.hits[#self.hits + 1] = {
        inst = inst,
        part = part,
        pos = pos,
        dist = dist,
        unknownDist = unknownDist or nil,
        key = key,
        isPath = isPath or nil,
    }
end

--- Quét tối đa maxNodes / maxMs. Trả true khi xong cả lượt.
function Scanner:step(maxNodes, maxMs)
    if not self.scanning then
        return true
    end
    maxNodes = tonumber(maxNodes) or 300
    if maxNodes < 1 then maxNodes = 1 end
    maxMs = tonumber(maxMs) or 0

    local started = self.clock()
    local processed = 0

    while self.qn > 0 do
        local inst = self.queue[self.qn]
        self.queue[self.qn] = nil
        self.qn = self.qn - 1

        if inst ~= nil then
            self.scanned = self.scanned + 1

            local okChildren, children = pcall(function()
                return inst:GetChildren()
            end)
            if okChildren and type(children) == "table" then
                for i = 1, #children do
                    local child = children[i]
                    if child ~= nil and not self.skipSet[child] and not self.skipRoots[child] then
                        self.qn = self.qn + 1
                        self.queue[self.qn] = child
                    end
                end
            else
                self.errors = self.errors + 1
                self.lastError = "GetChildren lỗi ở " .. tostring(inst.Name)
            end

            if inst ~= self.workspace then
                local okNode, errNode = pcall(self.onNode, self, inst)
                if not okNode then
                    self.errors = self.errors + 1
                    self.lastError = tostring(errNode)
                end
            end
        end

        processed = processed + 1
        if processed >= maxNodes then
            break
        end
        if maxMs > 0 and (self.clock() - started) * 1000 >= maxMs then
            break
        end
    end

    local elapsedMs = (self.clock() - started) * 1000
    if elapsedMs > 0 then
        self.scanMs = self.scanMs + elapsedMs
    end

    if self.qn == 0 then
        self:finish()
        return true
    end
    return false
end

function Scanner:finish()
    self.scanning = false
    self.queue = {}
    self.qn = 0

    local sorted = {}
    for i = 1, #self.hits do
        local hit = self.hits[i]
        if hit ~= nil and Core.isAlive(hit.inst) then
            sorted[#sorted + 1] = hit
        end
    end

    table.sort(sorted, function(a, b)
        if a.dist == b.dist then
            return tostring(a.inst.Name) < tostring(b.inst.Name)
        end
        return a.dist < b.dist
    end)

    local limit = math.max(1, tonumber(self.maxItems) or 80)
    local kept = {}
    for i = 1, math.min(#sorted, limit) do
        kept[#kept + 1] = sorted[i]
    end

    self.hitsCount = #sorted
    self.list = kept
    self.capped = (#sorted > #kept) or self.truncated
    self.hits = {}
end

-- ===========================================================================
-- 5. VISUALS — Highlight / BillboardGui / Box / SelectionBox
-- ===========================================================================

local PALETTE = {
    { name = "Xanh nước",  fill = { 0, 170, 255 },   outline = { 186, 231, 255 } },
    { name = "Xanh ngọc",  fill = { 0, 255, 170 },   outline = { 255, 255, 255 } },
    { name = "Cam",        fill = { 255, 165, 0 },   outline = { 255, 240, 210 } },
    { name = "Hồng",       fill = { 255, 105, 180 }, outline = { 255, 214, 236 } },
    { name = "Tím",        fill = { 170, 120, 255 }, outline = { 232, 222, 255 } },
    { name = "Vàng",       fill = { 255, 225, 80 },  outline = { 255, 252, 214 } },
    { name = "Đỏ",         fill = { 255, 70, 70 },   outline = { 255, 214, 214 } },
    { name = "Xanh dương", fill = { 90, 170, 255 },  outline = { 222, 240, 255 } },
}

local function color3(rgb)
    local ok, color = pcall(function()
        return Color3.fromRGB(rgb[1], rgb[2], rgb[3])
    end)
    if ok then
        return color
    end
    return nil
end

local Visuals = {}
Visuals.__index = Visuals

function Visuals.new(options)
    options = options or {}
    local self = setmetatable({}, Visuals)
    self.workspace = options.workspace
    self.instance = options.instance or Instance
    self.state = options.state
    self.items = {}
    self.order = {}
    self.slotOf = {}
    self.index = 0
    self.folder = nil
    self.error = nil
    self.errorCount = 0
    self.disabled = false
    self.onError = options.onError
    return self
end

function Visuals:palette()
    local index = clampInt(self.state.colorIndex, 1, #PALETTE, 1)
    local entry = PALETTE[index]
    return {
        name = entry.name,
        fill = color3(entry.fill),
        outline = color3(entry.outline),
        index = index,
    }
end

function Visuals:container()
    if self.folder ~= nil and self.folder.Parent ~= nil then
        return self.folder
    end
    if self.workspace == nil then
        return nil
    end
    local ok, folder = pcall(function()
        local created = self.instance.new("Folder")
        created.Name = "ObjectLocator_Viz"
        created.Parent = self.workspace
        return created
    end)
    if ok and folder ~= nil then
        self.folder = folder
        return folder
    end
    return nil
end

function Visuals:newInstance(className, properties)
    local ok, inst = pcall(function()
        return self.instance.new(className)
    end)
    if not ok or inst == nil then
        return nil
    end
    for key, value in pairs(properties or {}) do
        local okSet = pcall(function()
            inst[key] = value
        end)
        if not okSet then
            pcall(function()
                inst:Destroy()
            end)
            return nil
        end
    end
    return inst
end

function Visuals:createHighlight(adornee, palette, parent)
    if adornee == nil or parent == nil or palette == nil then
        return nil
    end
    local highlight = self:newInstance("Highlight", {
        Name = "OL_Highlight",
        Adornee = adornee,
        FillColor = palette.fill,
        OutlineColor = palette.outline,
        FillTransparency = 0.72,
        OutlineTransparency = 0,
        DepthMode = self.state.throughWall and Enum.HighlightDepthMode.AlwaysOnTop
            or Enum.HighlightDepthMode.Occluded,
        Parent = parent,
    })
    return highlight
end

function Visuals:createSelection(adornee, palette, parent)
    if adornee == nil or parent == nil or palette == nil then
        return nil
    end
    return self:newInstance("SelectionBox", {
        Name = "OL_Selection",
        Adornee = adornee,
        Color3 = palette.fill,
        LineThickness = 0.08,
        Transparency = 0.25,
        SurfaceTransparency = 1,
        Parent = parent,
    })
end

function Visuals:createLabel(part, inst, palette)
    if part == nil or palette == nil then
        return nil, nil
    end
    local height = self.state.showXYZ and 42 or 24
    local billboard = self:newInstance("BillboardGui", {
        Name = "OL_Label",
        Adornee = part,
        AlwaysOnTop = self.state.throughWall,
        MaxDistance = self.state.labelMaxDistance or 5000,
        StudsOffset = Vector3.new(0, 2.4, 0),
        Size = UDim2.new(0, 250, 0, height),
        LightInfluence = 0,
        ResetOnSpawn = false,
        Enabled = self.state.showLabel,
        Parent = part,
    })
    if billboard == nil then
        return nil, nil
    end
    local label = self:newInstance("TextLabel", {
        Name = "Text",
        Size = UDim2.new(1, 0, 1, 0),
        BackgroundTransparency = 1,
        Text = tostring(inst.Name),
        TextColor3 = palette.outline,
        Font = Enum.Font.GothamBold,
        TextSize = 12,
        TextStrokeColor3 = Color3.fromRGB(0, 0, 0),
        TextStrokeTransparency = 0.35,
        TextWrapped = false,
        TextXAlignment = Enum.TextXAlignment.Center,
        TextYAlignment = Enum.TextYAlignment.Center,
        Parent = billboard,
    })
    if label == nil then
        pcall(function()
            billboard:Destroy()
        end)
        return nil, nil
    end
    return billboard, label
end

function Visuals:createBox(part, palette, parent)
    if part == nil or parent == nil or palette == nil then
        return nil
    end
    local okSize, size = pcall(function()
        return part.Size
    end)
    if not okSize or not Core.isVector(size) then
        size = Vector3.new(4, 4, 4)
    end
    return self:newInstance("BoxHandleAdornment", {
        Name = "OL_Box",
        Adornee = part,
        Size = size + Vector3.new(0.25, 0.25, 0.25),
        Color3 = palette.fill,
        Transparency = 0.45,
        AlwaysOnTop = self.state.throughWall,
        ZIndex = 2,
        Visible = self.state.showBox,
        Parent = parent,
    })
end

function Visuals:addOrder(inst)
    self.index = self.index + 1
    self.order[self.index] = inst
    self.slotOf[inst] = self.index
end

function Visuals:removeOrder(inst)
    local slot = self.slotOf[inst]
    if slot == nil then
        return
    end
    local lastIndex = #self.order
    local last = self.order[lastIndex]
    if slot ~= lastIndex and slot <= lastIndex then
        self.order[slot] = last
        self.slotOf[last] = slot
    end
    self.order[lastIndex] = nil
    self.slotOf[inst] = nil
    if self.index > #self.order then
        self.index = #self.order
    end
end

function Visuals:make(hit, origin)
    if hit == nil or hit.inst == nil or self.disabled then
        return false
    end
    if self.items[hit.inst] ~= nil then
        return false
    end

    local palette = self:palette()
    local inst = hit.inst
    local part = hit.part
    local adornee = inst
    if not Core.isA(inst, "Model") then
        adornee = part
    end
    if adornee == nil then
        return false
    end

    local container = self:container()
    local highlight = self:createHighlight(adornee, palette, container)
    local selection = nil
    if highlight == nil then
        selection = self:createSelection(adornee, palette, container)
    end

    local billboard, label = self:createLabel(part, inst, palette)
    local box = nil
    if self.state.showBox and part ~= nil then
        box = self:createBox(part, palette, container)
    end

    if highlight == nil and selection == nil and billboard == nil then
        self.errorCount = self.errorCount + 1
        self.error = "executor chặn Highlight/BillboardGui/SelectionBox — chỉ giữ danh sách"
        if self.onError then
            pcall(self.onError, self.error)
        end
        if self.errorCount >= 3 then
            self.disabled = true
        end
        return false
    end

    local pos = hit.pos or Core.positionOf(inst)
    local dist = hit.dist or 0
    if origin ~= nil and pos ~= nil then
        dist = Core.distance(pos, origin) or dist
    end

    self.items[inst] = {
        inst = inst,
        part = part,
        adornee = adornee,
        highlight = highlight,
        selection = selection,
        billboard = billboard,
        label = label,
        box = box,
        dist = dist,
        unknownDist = hit.unknownDist == true or nil,
        txtAt = -1e9,
        slot = nil,
    }
    self:addOrder(inst)
    if label ~= nil then
        local text = self:textFor(self.items[inst], origin)
        pcall(function()
            label.Text = text
        end)
    end
    return true
end

function Visuals:kill(inst)
    local item = self.items[inst]
    if item == nil then
        return
    end
    pcall(function()
        if item.highlight ~= nil then item.highlight:Destroy() end
    end)
    pcall(function()
        if item.selection ~= nil then item.selection:Destroy() end
    end)
    pcall(function()
        if item.billboard ~= nil then item.billboard:Destroy() end
    end)
    pcall(function()
        if item.box ~= nil then item.box:Destroy() end
    end)
    self.items[inst] = nil
    self:removeOrder(inst)
end

function Visuals:prune(keep)
    local dead = {}
    for inst in pairs(self.items) do
        if keep == nil or keep[inst] ~= true then
            dead[#dead + 1] = inst
        end
    end
    for i = 1, #dead do
        self:kill(dead[i])
    end
end

function Visuals:clear()
    local all = {}
    for inst in pairs(self.items) do
        all[#all + 1] = inst
    end
    for i = 1, #all do
        self:kill(all[i])
    end
    self.items = {}
    self.order = {}
    self.slotOf = {}
    self.index = 0
    if self.folder ~= nil then
        pcall(function()
            self.folder:Destroy()
        end)
        self.folder = nil
    end
    self.error = nil
    self.errorCount = 0
    self.disabled = false
end

function Visuals:textFor(item, origin)
    local pos = item.part and Core.positionOf(item.part) or nil
    local dist = item.dist or 0
    local unknown = item.unknownDist == true
    if origin ~= nil and pos ~= nil then
        dist = Core.distance(pos, origin) or dist
        unknown = false
    end
    local distanceText = unknown and "--" or tostring(round(dist))
    local text = tostring(item.inst.Name) .. "  ·  📏 " .. distanceText .. "m"
    if self.state.showXYZ and pos ~= nil then
        text = text .. "\n🧭 " .. Core.coordsText(pos)
    end
    return text, dist
end

function Visuals:updateOne(inst, origin, now, forceText)
    local item = self.items[inst]
    if item == nil then
        return false
    end
    if not Core.isAlive(item.inst) or (item.part ~= nil and not Core.isAlive(item.part)) then
        self:kill(inst)
        return false
    end

    local text, dist = self:textFor(item, origin)
    item.dist = dist
    local far = self.state.maxDistance > 0 and dist > self.state.maxDistance
    if far then
        self:kill(inst)
        return false
    end

    if item.highlight ~= nil then
        pcall(function()
            item.highlight.Enabled = true
            item.highlight.Adornee = item.adornee
        end)
    end
    if item.selection ~= nil then
        pcall(function()
            item.selection.Adornee = item.adornee
        end)
    end
    if item.billboard ~= nil then
        pcall(function()
            item.billboard.Enabled = self.state.showLabel
            item.billboard.AlwaysOnTop = self.state.throughWall
            item.billboard.Size = UDim2.new(0, 250, 0, self.state.showXYZ and 42 or 24)
        end)
    end
    if item.box ~= nil then
        pcall(function()
            item.box.Visible = self.state.showBox
            item.box.AlwaysOnTop = self.state.throughWall
        end)
    end

    if item.label ~= nil and (forceText or now - item.txtAt >= 0.18) then
        item.txtAt = now
        if item.label.Text ~= text then
            pcall(function()
                item.label.Text = text
            end)
        end
    end
    return true
end

function Visuals:tick(origin, quota, now)
    if #self.order == 0 then
        return 0
    end
    quota = math.max(1, tonumber(quota) or 20)
    local updated = 0
    local guard = 0
    local total = #self.order
    while quota > 0 and guard < total * 2 do
        guard = guard + 1
        self.index = (self.index % total) + 1
        local inst = self.order[self.index]
        if inst == nil then
            -- Dọn lỗ hổng nếu có (bình thường mảng luôn kín).
            table.remove(self.order, self.index)
            total = #self.order
            if total == 0 then
                break
            end
            self.index = self.index - 1
        elseif self.items[inst] == nil then
            self:removeOrder(inst)
            total = #self.order
            if total == 0 then
                break
            end
            self.index = math.min(self.index, total)
        else
            quota = quota - 1
            if self:updateOne(inst, origin, now, false) then
                updated = updated + 1
            end
        end
    end
    return updated
end

function Visuals:applyStyle()
    local palette = self:palette()
    for inst, item in pairs(self.items) do
        if Core.isAlive(inst) then
            if item.highlight ~= nil then
                pcall(function()
                    item.highlight.FillColor = palette.fill
                    item.highlight.OutlineColor = palette.outline
                    item.highlight.DepthMode = self.state.throughWall
                        and Enum.HighlightDepthMode.AlwaysOnTop
                        or Enum.HighlightDepthMode.Occluded
                end)
            end
            if item.selection ~= nil then
                pcall(function()
                    item.selection.Color3 = palette.fill
                end)
            end
            if item.billboard ~= nil then
                pcall(function()
                    item.billboard.AlwaysOnTop = self.state.throughWall
                    item.billboard.Enabled = self.state.showLabel
                end)
            end
            if item.label ~= nil then
                pcall(function()
                    item.label.TextColor3 = palette.outline
                end)
            end
            if item.box ~= nil then
                pcall(function()
                    item.box.Visible = self.state.showBox
                    item.box.Color3 = palette.fill
                    item.box.AlwaysOnTop = self.state.throughWall
                end)
            elseif self.state.showBox and item.part ~= nil then
                item.box = self:createBox(item.part, palette, self:container())
            end
        end
    end
end

function Visuals:count()
    return #self.order
end

function Visuals:destroy()
    self:clear()
end

-- ===========================================================================
-- 6. STORE — lưu preset (chỉ khi môi trường có file IO)
-- ===========================================================================

local Store = {}
Store.__index = Store
ObjectLocator.Store = Store

function Store.new(options)
    options = options or {}
    local self = setmetatable({}, Store)
    self.path = options.path or Config.presetsPath
    self.codec = options.codec or nil
    self.io = options.io or nil
    self.folder = options.folder or "ObjectLocator"
    return self
end

function Store:getCodec()
    if self.codec ~= nil then
        return self.codec
    end
    local ok, http = pcall(function()
        return game:GetService("HttpService")
    end)
    if ok and http ~= nil and type(http.JSONEncode) == "function" and type(http.JSONDecode) == "function" then
        return {
            encode = function(value)
                return http:JSONEncode(value)
            end,
            decode = function(text)
                return http:JSONDecode(text)
            end,
        }
    end
    return nil
end

function Store:getIO()
    if self.io ~= nil then
        return self.io
    end
    if type(readfile) ~= "function" or type(writefile) ~= "function" then
        return nil
    end
    return {
        read = readfile,
        write = writefile,
        isfolder = type(isfolder) == "function" and isfolder or nil,
        makefolder = type(makefolder) == "function" and makefolder or nil,
        folder = self.folder,
    }
end

function Store:load()
    local ioLayer = self:getIO()
    local codec = self:getCodec()
    if ioLayer == nil or codec == nil then
        return nil
    end
    local okRead, content = pcall(ioLayer.read, self.path)
    if not okRead or type(content) ~= "string" or content == "" then
        return nil
    end
    local okDecode, data = pcall(codec.decode, content)
    if not okDecode or type(data) ~= "table" then
        return nil
    end
    return data
end

function Store:save(data)
    local ioLayer = self:getIO()
    local codec = self:getCodec()
    if ioLayer == nil or codec == nil then
        return false, "không có nơi lưu (cần executor có writefile + HttpService)"
    end
    if ioLayer.folder ~= nil and ioLayer.isfolder ~= nil and ioLayer.makefolder ~= nil then
        pcall(function()
            if not ioLayer.isfolder(ioLayer.folder) then
                ioLayer.makefolder(ioLayer.folder)
            end
        end)
    end
    local okEncode, text = pcall(codec.encode, data)
    if not okEncode or type(text) ~= "string" then
        return false, "JSONEncode lỗi"
    end
    local okWrite, err = pcall(ioLayer.write, self.path, text)
    if not okWrite then
        return false, tostring(err)
    end
    return true
end

function Store.sanitizeOptions(raw)
    local out = {}
    if type(raw) ~= "table" then
        raw = {}
    end
    out.showLabel = raw.showLabel ~= false
    out.showXYZ = raw.showXYZ ~= false
    out.showBox = raw.showBox == true
    out.throughWall = raw.throughWall ~= false
    out.skipPlayers = raw.skipPlayers ~= false
    return out
end

function Store.validatePresets(data)
    local out = {}
    if type(data) ~= "table" then
        return out
    end
    local list = data.presets
    if type(list) ~= "table" then
        return out
    end
    for i = 1, #list do
        local rawPreset = list[i]
        if type(rawPreset) == "table" and type(rawPreset.entries) == "table" then
            local entries = {}
            local seen = {}
            for j = 1, #rawPreset.entries do
                local rawEntry = rawPreset.entries[j]
                local rawText = rawEntry
                if type(rawEntry) == "table" then
                    rawText = rawEntry.raw
                end
                local entry = Core.parseEntry(rawText)
                if entry ~= nil then
                    local dedupe = entry.kind .. ":" .. entry.key
                    if not seen[dedupe] then
                        seen[dedupe] = true
                        entries[#entries + 1] = {
                            raw = entry.raw,
                            kind = entry.kind,
                            key = entry.key,
                            segs = entry.segs,
                        }
                    end
                end
            end
            if #entries > 0 then
                out[#out + 1] = {
                    title = tostring(rawPreset.title or rawPreset.query or ("Preset " .. tostring(i))),
                    query = tostring(rawPreset.query or ""),
                    entries = entries,
                    maxDistance = clampNumber(rawPreset.maxDistance, 0, Config.maxDistanceLimit, 0),
                    colorIndex = clampInt(rawPreset.colorIndex, 1, #PALETTE, 1),
                    options = Store.sanitizeOptions(rawPreset.options),
                    active = rawPreset.active == true,
                    at = tonumber(rawPreset.at) or 0,
                }
            end
        end
    end
    return out
end

-- ===========================================================================
-- 7. CONTROLLER — trạng thái + lịch quét + preset
-- ===========================================================================

local Controller = {}
Controller.__index = Controller

local function getService(name)
    local ok, service = pcall(function()
        return game:GetService(name)
    end)
    if ok then
        return service
    end
    return nil
end

function ObjectLocator.defaultEnv()
    local players = getService("Players")
    local localPlayer = players and players.LocalPlayer or nil
    local playerGui = nil
    if localPlayer ~= nil then
        playerGui = safeCall(function()
            return localPlayer:FindFirstChildOfClass("PlayerGui")
        end)
    end
    return {
        workspace = workspace,
        players = players,
        localPlayer = localPlayer,
        playerGui = playerGui,
        camera = workspace and workspace.CurrentCamera or nil,
        runService = getService("RunService"),
        userInputService = getService("UserInputService"),
        instance = Instance,
        httpService = getService("HttpService"),
    }
end

function ObjectLocator.newController(options)
    options = options or {}
    local env = options.env or ObjectLocator.defaultEnv()

    local cfg = {}
    for key, value in pairs(Config) do
        cfg[key] = value
    end
    for key, value in pairs(options.config or {}) do
        cfg[key] = value
    end

    local state = {
        maxDistance = clampNumber(cfg.maxDistance, 0, cfg.maxDistanceLimit, 0),
        maxItems = clampInt(cfg.maxItems, 1, 500, 80),
        colorIndex = clampInt(cfg.colorIndex, 1, #PALETTE, 1),
        showLabel = cfg.showLabel ~= false,
        showXYZ = cfg.showXYZ ~= false,
        showBox = cfg.showBox == true,
        throughWall = cfg.throughWall ~= false,
        skipPlayers = cfg.skipPlayers ~= false,
        labelMaxDistance = clampNumber(cfg.labelMaxDistance, 100, 100000, 5000),
    }

    local self = setmetatable({}, Controller)
    self.env = env
    self.cfg = cfg
    self.state = state
    self.now = 0
    self.active = false
    self.bound = false
    self.conn = nil
    self.destroyed = false
    self.queryRaw = ""
    self.pinned = {}
    self.entries = {}
    self.keys = {}
    self.paths = {}
    self.pending = {}
    self.pendingIndex = 1
    self.nextScanAt = 0
    self.tickAt = 0
    self.uiAt = 0
    self.uiVisible = true
    self.observer = nil
    self.lastMessage = ""
    self.lastError = nil
    self.errorCount = 0
    self.scanCount = 0
    self.presets = {}
    self.lastUsed = 0
    self.store = options.store or Store.new({ path = cfg.presetsPath })
    self.autoRestore = options.autoRestore
    if self.autoRestore == nil then
        self.autoRestore = cfg.autoRestore ~= false
    end

    self.nameCache = setmetatable({}, { __mode = "k" })
    self.scanner = Scanner.new({ workspace = env.workspace, clock = nowClock })
    self.visuals = Visuals.new({
        workspace = env.workspace,
        instance = env.instance or Instance,
        state = state,
        onError = function(message)
            self.lastMessage = message
        end,
    })

    self:rebuild()

    if self.autoRestore then
        pcall(self.restore, self)
    end
    return self
end

function Controller:hasTargets()
    return #self.entries > 0
end

function Controller:entryText()
    local parts = {}
    for i = 1, #self.entries do
        parts[#parts + 1] = tostring(self.entries[i].raw)
    end
    return table.concat(parts, ", ")
end

function Controller:rebuild()
    local parsedQuery = Core.parseList(self.queryRaw)
    self.entries = Core.merge(self.pinned, parsedQuery)
    self.keys = {}
    self.paths = {}
    for i = 1, #self.entries do
        local entry = self.entries[i]
        if entry.kind == "path" then
            self.paths[#self.paths + 1] = entry
        else
            self.keys[#self.keys + 1] = entry.key
        end
    end
    self.scanner.keys = self.keys
    self.scanner.paths = self.paths
    self.scanner.maxDistance = self.state.maxDistance
    self.scanner.maxItems = self.state.maxItems
end

function Controller:origin()
    local localPlayer = self.env.localPlayer
    if localPlayer ~= nil then
        local okChar, character = pcall(function()
            return localPlayer.Character
        end)
        if okChar and character ~= nil then
            local okRoot, root = pcall(function()
                return character:FindFirstChild("HumanoidRootPart")
            end)
            if okRoot and root ~= nil then
                local okPos, pos = pcall(function()
                    return root.Position
                end)
                if okPos and Core.isVector(pos) then
                    return pos
                end
            end
        end
    end
    local camera = self.env.camera or (self.env.workspace and self.env.workspace.CurrentCamera)
    if camera ~= nil then
        local okCf, cf = pcall(function()
            return camera.CFrame
        end)
        if okCf and cf ~= nil then
            local okPos, pos = pcall(function()
                return cf.Position
            end)
            if okPos and Core.isVector(pos) then
                return pos
            end
        end
    end
    return nil
end

function Controller:buildSkipSet()
    local set = {}
    if not self.state.skipPlayers then
        return set
    end
    local players = self.env.players
    if players == nil then
        return set
    end
    local okList, list = pcall(function()
        return players:GetPlayers()
    end)
    if not okList or type(list) ~= "table" then
        return set
    end
    for i = 1, #list do
        local okChar, character = pcall(function()
            return list[i].Character
        end)
        if okChar and character ~= nil then
            set[character] = true
        end
    end
    return set
end

function Controller:prepareScan()
    self.scanner.keys = self.keys
    self.scanner.paths = self.paths
    self.scanner.maxDistance = self.state.maxDistance
    self.scanner.maxItems = self.state.maxItems
    self.scanner.maxHits = tonumber(self.cfg.maxHits) or 4000
    self.scanner.origin = self:origin()
    self.lastError = nil
    self.scanner.skipSet = self:buildSkipSet()
    self.scanner.skipRoots = {}
    local camera = self.env.camera or (self.env.workspace and self.env.workspace.CurrentCamera)
    if camera ~= nil then
        self.scanner.skipRoots[camera] = true
    end
    if self.env.workspace ~= nil and self.env.workspace.Terrain ~= nil then
        self.scanner.skipRoots[self.env.workspace.Terrain] = true
    end
    if self.visuals.folder ~= nil then
        self.scanner.skipRoots[self.visuals.folder] = true
    end
end

function Controller:resetResults()
    self.scanner:reset()
    self.visuals:clear()
    self.pending = {}
    self.pendingIndex = 1
    self.nextScanAt = self.now
end

function Controller:onScanFinished()
    self.scanCount = self.scanCount + 1
    if self.lastMessage ~= "" and self.lastMessage:find("⚠️", 1, true) ~= 1 then
        self.lastMessage = ""
    end
    local keep = {}
    for i = 1, #self.scanner.list do
        keep[self.scanner.list[i].inst] = true
    end
    self.visuals:prune(keep)

    self.pending = {}
    for i = 1, #self.scanner.list do
        local hit = self.scanner.list[i]
        if self.visuals.items[hit.inst] == nil then
            self.pending[#self.pending + 1] = hit
        end
    end
    self.pendingIndex = 1

    local interval = self.uiVisible and self.cfg.rescanEvery or self.cfg.hiddenRescanEvery
    self.nextScanAt = self.now + math.max(0.2, tonumber(interval) or 1)
end

function Controller:drainPending(origin, frameStart)
    if self.pendingIndex > #self.pending then
        return
    end
    local quota = math.max(1, tonumber(self.cfg.makePerFrame) or 8)
    while quota > 0 and self.pendingIndex <= #self.pending do
        local hit = self.pending[self.pendingIndex]
        self.pendingIndex = self.pendingIndex + 1
        if hit ~= nil and self.visuals.items[hit.inst] == nil then
            local ok = pcall(self.visuals.make, self.visuals, hit, origin)
            if not ok then
                self.errorCount = self.errorCount + 1
                self.lastError = "không tạo được hiển thị cho " .. tostring(hit.inst and hit.inst.Name)
            end
        end
        quota = quota - 1
        if frameStart ~= nil and (nowClock() - frameStart) * 1000 >= (self.cfg.frameBudgetMs or 3) then
            break
        end
    end
    if self.pendingIndex > #self.pending then
        self.pending = {}
        self.pendingIndex = 1
    end
end

function Controller:step(dt)
    if not self.active or self.destroyed then
        return
    end
    dt = tonumber(dt) or 0.016
    if dt < 0 then dt = 0 end
    if dt > 0.5 then dt = 0.5 end
    self.now = self.now + dt

    if not self:hasTargets() then
        self:setActive(false)
        return
    end

    local frameStart = nowClock()
    local origin = self:origin()

    if self.scanner.scanning then
        if self.scanner:step(self.cfg.scanNodesPerFrame, self.cfg.scanMsPerFrame) then
            self:onScanFinished()
        end
    elseif self.now >= self.nextScanAt then
        self:prepareScan()
        self.scanner:begin()
        if self.scanner:step(self.cfg.scanNodesPerFrame, self.cfg.scanMsPerFrame) then
            self:onScanFinished()
        end
    end

    self:drainPending(origin, frameStart)

    if self.now >= self.tickAt then
        self.tickAt = self.now + (tonumber(self.cfg.tickEvery) or 0.22)
        pcall(self.visuals.tick, self.visuals, origin, self.cfg.tickPerFrame, self.now)
    end

    if self.observer ~= nil and self.now >= self.uiAt then
        self.uiAt = self.now + (tonumber(self.cfg.uiEvery) or 0.25)
        local ok, err = pcall(self.observer, self:snapshot())
        if not ok then
            self.lastError = tostring(err)
        end
    end
end

function Controller:safeStep(dt)
    if self.destroyed then
        return
    end
    local ok, err = pcall(self.step, self, dt)
    if not ok then
        self.errorCount = self.errorCount + 1
        self.lastError = tostring(err)
        if self.errorCount <= 5 then
            warn("[ObjectLocator] " .. tostring(err))
        end
    end
end

function Controller:bind()
    if self.bound then
        return true
    end
    local runService = self.env.runService or getService("RunService")
    if runService == nil or runService.RenderStepped == nil then
        return false
    end
    local ok, connection = pcall(function()
        return runService.RenderStepped:Connect(function(dt)
            self:safeStep(dt)
        end)
    end)
    if not ok or connection == nil then
        return false
    end
    self.conn = connection
    self.bound = true
    return true
end

function Controller:unbind()
    if self.conn ~= nil then
        pcall(function()
            self.conn:Disconnect()
        end)
        self.conn = nil
    end
    self.bound = false
end

function Controller:setActive(on)
    on = on == true
    if on and not self:hasTargets() then
        self.active = false
        self:unbind()
        self:resetResults()
        self.lastMessage = "⚠️ chưa nhập tên vật (ô 🔎) hoặc chưa ghim mục nào"
        self:notify()
        return false, self.lastMessage
    end

    if self.active == on then
        if on then
            self.nextScanAt = self.now
            self:notify()
        end
        return true
    end

    self.active = on
    if on then
        self:resetResults()
        self.nextScanAt = self.now
        if not self.cfg.headless and not self:bind() then
            self.active = false
            self.lastMessage = "⚠️ không kết nối được RunService.RenderStepped"
            self:notify()
            return false, self.lastMessage
        end
        self.lastMessage = "🌳 đã bật định vị — bắt đầu quét ở khung hình sau"
    else
        self:unbind()
        self:resetResults()
        self.lastMessage = "🌳 đã tắt định vị"
    end
    self:notify()
    return true
end

function Controller:toggle()
    return self:setActive(not self.active)
end

function Controller:setQuery(raw)
    raw = tostring(raw or "")
    if raw == self.queryRaw then
        if not self.active and self:hasTargets() then
            return self:setActive(true)
        end
        return self:hasTargets()
    end
    self.queryRaw = raw
    self:rebuild()

    if not self:hasTargets() then
        if self.active then
            self:setActive(false)
        else
            self:notify()
        end
        return false
    end

    if not self.active then
        local ok, err = self:setActive(true)
        if not ok then
            return false, err
        end
    else
        self:resetResults()
        self.nextScanAt = self.now
        self:notify()
    end
    return true
end

function Controller:addPinned(raw)
    local parsed = Core.parseList(raw)
    if #parsed == 0 then
        return false, "chưa nhập gì"
    end
    local added = 0
    for i = 1, #parsed do
        local candidate = parsed[i]
        local duplicate = false
        for j = 1, #self.pinned do
            local existing = self.pinned[j]
            if existing.kind == candidate.kind and existing.key == candidate.key then
                duplicate = true
                break
            end
        end
        if not duplicate then
            self.pinned[#self.pinned + 1] = {
                raw = candidate.raw,
                kind = candidate.kind,
                key = candidate.key,
                segs = candidate.segs,
            }
            added = added + 1
        end
    end
    if added == 0 then
        return false, "mục này đã được ghim rồi"
    end
    self:rebuild()
    if self.active then
        self:resetResults()
        self.nextScanAt = self.now
    else
        self:setActive(true)
    end
    self:notify()
    return true, added
end

function Controller:removePinned(index)
    index = tonumber(index) or 0
    if index < 1 or index > #self.pinned then
        return false, "mục ghim không tồn tại"
    end
    local removed = table.remove(self.pinned, index)
    self:rebuild()
    if not self:hasTargets() then
        self:setActive(false)
    else
        self:resetResults()
        self.nextScanAt = self.now
        self:notify()
    end
    return true, removed
end

function Controller:clearAll()
    self.pinned = {}
    self.queryRaw = ""
    self:rebuild()
    self:setActive(false)
    self.lastMessage = "🧹 đã xoá mọi mục định vị"
    self:notify()
    return true
end

function Controller:requestRescan(delay)
    local wait = tonumber(delay) or 0
    local at = self.now + math.max(0, wait)
    if not self.scanner.scanning and at < self.nextScanAt then
        self.nextScanAt = at
    end
end

function Controller:setMaxDistance(value)
    local maxValue = tonumber(self.cfg.maxDistanceLimit) or 100000
    local distance = clampNumber(value, 0, maxValue, self.state.maxDistance)
    self.state.maxDistance = distance
    self.scanner.maxDistance = distance
    if self:hasTargets() then
        self:resetResults()
        self.nextScanAt = self.now
    end
    self:notify()
    return distance
end

function Controller:setMaxItems(value)
    self.state.maxItems = clampInt(value, 1, 500, self.state.maxItems)
    self.scanner.maxItems = self.state.maxItems
    if self.active then
        self:requestRescan(0)
    end
    self:notify()
    return self.state.maxItems
end

function Controller:setOption(key, value)
    if key == "showBox" or key == "showLabel" or key == "showXYZ" or key == "throughWall" then
        self.state[key] = value == true
    elseif key == "skipPlayers" then
        self.state.skipPlayers = value == true
        if self.active then
            self:resetResults()
            self.nextScanAt = self.now
        end
    else
        return false
    end
    self.visuals:applyStyle()
    self:notify()
    return true
end

function Controller:cycleColor()
    self.state.colorIndex = (self.state.colorIndex % #PALETTE) + 1
    self.visuals:applyStyle()
    self:notify()
    return self:colorName()
end

function Controller:colorName()
    local entry = PALETTE[self.state.colorIndex] or PALETTE[1]
    return entry.name
end

function Controller:statusText()
    if not self.active then
        if self:hasTargets() then
            return string.format("🌳 Định vị vật: TẮT · %d mục đã nhập — bấm Bật", #self.entries)
        end
        return "🌳 Định vị vật: TẮT — nhập tên vật để bắt đầu"
    end
    if not self:hasTargets() then
        return "⚠️ chưa nhập tên vật"
    end

    local scanner = self.scanner
    if scanner.scanning then
        return string.format(
            "⏳ đang quét… %d vật · thấy %d · %.0fms",
            scanner.scanned,
            #scanner.hits,
            scanner.scanMs
        )
    end
    if self.lastError ~= nil then
        return "⚠️ " .. tostring(self.lastError)
    end
    if #scanner.list == 0 then
        local extra = ""
        if scanner.unresolvedPaths > 0 then
            extra = string.format(" · %d path chưa tìm thấy (sẽ thử lại)", scanner.unresolvedPaths)
        end
        if scanner.errors > 0 then
            extra = extra .. string.format(" · %d lỗi đọc", scanner.errors)
        end
        return string.format(
            "⚠️ không thấy vật nào khớp \"%s\" (đã quét %d)%s",
            self.queryRaw ~= "" and self.queryRaw or self:entryText(),
            scanner.scanned,
            extra
        )
    end

    local text = string.format(
        "🌳 %d/%d vật · quét %dms",
        #scanner.list,
        scanner.hitsCount,
        round(scanner.scanMs)
    )
    if scanner.capped then
        text = text .. string.format(" · giữ %d gần nhất", self.cfg.maxItems)
    end
    if scanner.truncated then
        text = text .. " · chạm trần hit"
    end
    if scanner.grouped > 0 then
        text = text .. " · gộp " .. tostring(scanner.grouped) .. " part"
    end
    if self.state.maxDistance > 0 then
        text = text .. " · ≤" .. tostring(round(self.state.maxDistance)) .. "m"
    end
    if scanner.unresolvedPaths > 0 then
        text = text .. " · ⏳ " .. tostring(scanner.unresolvedPaths) .. " path"
    end
    if scanner.errors > 0 then
        text = text .. " · ⚠️ " .. tostring(scanner.errors) .. " lỗi"
    end
    if self.visuals.error ~= nil then
        text = text .. " · ⚠️ " .. self.visuals.error
    end
    return text
end

function Controller:snapshot()
    local scanner = self.scanner
    local origin = self:origin()
    local list = {}

    for i = 1, #scanner.list do
        local hit = scanner.list[i]
        if hit ~= nil and Core.isAlive(hit.inst) then
            local pos = Core.positionOf(hit.inst) or hit.pos
            local dist = hit.dist or 0
            local unknown = hit.unknownDist == true
            if origin ~= nil and pos ~= nil then
                dist = Core.distance(pos, origin) or dist
                unknown = false
            end
            list[#list + 1] = {
                inst = hit.inst,
                name = tostring(hit.inst.Name),
                class = tostring(hit.inst.ClassName),
                dist = dist,
                unknownDist = unknown or nil,
                pos = pos,
                coords = Core.coordsText(pos),
                path = hit.isPath == true,
            }
        end
    end

    local entries = {}
    for i = 1, #self.entries do
        entries[i] = {
            raw = self.entries[i].raw,
            kind = self.entries[i].kind,
            key = self.entries[i].key,
        }
    end
    local pinned = {}
    for i = 1, #self.pinned do
        pinned[i] = {
            raw = self.pinned[i].raw,
            kind = self.pinned[i].kind,
            key = self.pinned[i].key,
        }
    end

    return {
        active = self.active,
        scanning = scanner.scanning,
        query = self.queryRaw,
        entries = entries,
        pinned = pinned,
        keys = Core.copyList(self.keys),
        paths = Core.copyList(self.paths),
        scanned = scanner.scanned,
        found = scanner.hitsCount,
        kept = #scanner.list,
        capped = scanner.capped,
        grouped = scanner.grouped,
        unlocatable = scanner.unlocatable,
        truncated = scanner.truncated,
        unresolvedPaths = scanner.unresolvedPaths,
        scanErrors = scanner.errors,
        scanMs = round(scanner.scanMs),
        items = self.visuals:count(),
        visualError = self.visuals.error,
        maxDistance = self.state.maxDistance,
        maxItems = self.state.maxItems,
        colorIndex = self.state.colorIndex,
        colorName = self:colorName(),
        options = {
            showLabel = self.state.showLabel,
            showXYZ = self.state.showXYZ,
            showBox = self.state.showBox,
            throughWall = self.state.throughWall,
            skipPlayers = self.state.skipPlayers,
        },
        status = self:statusText(),
        message = self.lastMessage,
        list = list,
        presetCount = #self.presets,
        lastUsed = self.lastUsed,
        errors = self.errorCount,
        bound = self.bound,
    }
end

function Controller:nearest()
    local list = self.scanner.list
    if #list == 0 then
        return nil, nil
    end
    local origin = self:origin()
    local best = list[1]
    local bestDist = best.dist or 0
    if origin ~= nil then
        for i = 1, #list do
            local pos = Core.positionOf(list[i].inst)
            local dist = pos and Core.distance(pos, origin) or nil
            if dist ~= nil and dist < bestDist then
                best = list[i]
                bestDist = dist
            end
        end
    end
    return best.inst, bestDist
end

function Controller:walkTo(inst)
    local part = Core.basePartOf(inst)
    if part == nil then
        return false, "vật không có BasePart để đi tới"
    end
    local localPlayer = self.env.localPlayer
    local okChar, character = pcall(function()
        return localPlayer and localPlayer.Character
    end)
    if not okChar or character == nil then
        return false, "chưa có nhân vật"
    end
    local okHumanoid, humanoid = pcall(function()
        return character:FindFirstChildOfClass("Humanoid")
    end)
    if not okHumanoid or humanoid == nil then
        return false, "chưa có Humanoid"
    end
    local okPos, pos = pcall(function()
        return part.Position
    end)
    if not okPos or not Core.isVector(pos) then
        return false, "vật không còn toạ độ"
    end
    local okMove, err = pcall(function()
        humanoid:MoveTo(pos)
    end)
    if not okMove then
        return false, "MoveTo lỗi: " .. tostring(err)
    end
    self.lastMessage = "🧭 đang đi tới " .. tostring(inst.Name)
    self:notify()
    return true, pos
end

function Controller:presetSignature(preset)
    local parts = {}
    for i = 1, #(preset.entries or {}) do
        local entry = preset.entries[i]
        parts[#parts + 1] = tostring(entry.kind or "name") .. ":" .. tostring(entry.key or Core.normalize(entry.raw))
    end
    table.sort(parts)
    return table.concat(parts, "|")
        .. "#" .. tostring(preset.maxDistance or 0)
        .. "#" .. tostring(preset.colorIndex or 1)
end

function Controller:buildPreset(title)
    local entries = {}
    for i = 1, #self.entries do
        local entry = self.entries[i]
        entries[#entries + 1] = {
            raw = entry.raw,
            kind = entry.kind,
            key = entry.key,
            segs = entry.segs,
        }
    end
    local defaultTitle = self.queryRaw ~= "" and self.queryRaw or self:entryText()
    local okTime, stamp = pcall(os.time)
    return {
        title = tostring(title or defaultTitle),
        query = self.queryRaw,
        entries = entries,
        maxDistance = self.state.maxDistance,
        colorIndex = self.state.colorIndex,
        options = {
            showLabel = self.state.showLabel,
            showXYZ = self.state.showXYZ,
            showBox = self.state.showBox,
            throughWall = self.state.throughWall,
            skipPlayers = self.state.skipPlayers,
        },
        active = self.active,
        at = okTime and stamp or 0,
    }
end

function Controller:savePreset(title)
    if not self:hasTargets() then
        return false, "chưa có mục nào để lưu"
    end
    local preset = self:buildPreset(title)
    local signature = self:presetSignature(preset)

    local existing = nil
    for i = 1, #self.presets do
        if self:presetSignature(self.presets[i]) == signature then
            existing = i
            break
        end
    end

    local index
    if existing ~= nil then
        self.presets[existing] = preset
        index = existing
    else
        self.presets[#self.presets + 1] = preset
        index = #self.presets
        local maxPresets = math.max(1, tonumber(self.cfg.maxPresets) or 24)
        while #self.presets > maxPresets do
            table.remove(self.presets, 1)
            index = index - 1
            if self.lastUsed > 0 then
                self.lastUsed = math.max(0, self.lastUsed - 1)
            end
        end
    end

    self.lastUsed = index
    self:persist()
    self:notify()
    return true, index
end

function Controller:applyPreset(index, activate, quiet)
    index = tonumber(index) or 0
    local preset = self.presets[index]
    if type(preset) ~= "table" then
        return false, "preset không tồn tại"
    end

    self.pinned = {}
    for i = 1, #(preset.entries or {}) do
        local entry = preset.entries[i]
        local parsed = Core.parseEntry(entry.raw)
        if parsed ~= nil then
            local duplicate = false
            for j = 1, #self.pinned do
                if self.pinned[j].kind == parsed.kind and self.pinned[j].key == parsed.key then
                    duplicate = true
                    break
                end
            end
            if not duplicate then
                self.pinned[#self.pinned + 1] = parsed
            end
        end
    end
    self.queryRaw = tostring(preset.query or "")
    self:rebuild()

    self.state.maxDistance = clampNumber(preset.maxDistance, 0, self.cfg.maxDistanceLimit, 0)
    self.state.colorIndex = clampInt(preset.colorIndex, 1, #PALETTE, 1)
    local options = Store.sanitizeOptions(preset.options)
    self.state.showLabel = options.showLabel
    self.state.showXYZ = options.showXYZ
    self.state.showBox = options.showBox
    self.state.throughWall = options.throughWall
    self.state.skipPlayers = options.skipPlayers
    self.scanner.maxDistance = self.state.maxDistance
    self.visuals:applyStyle()

    self.lastUsed = index
    self:resetResults()
    if activate ~= false then
        self:setActive(true)
    else
        self:setActive(false)
    end

    if quiet ~= true then
        self:persist()
        self:notify()
    end
    return true, preset
end

function Controller:loadPreset(index)
    return self:applyPreset(index, true, false)
end

function Controller:deletePreset(index)
    index = tonumber(index) or 0
    if index < 1 or index > #self.presets then
        return false, "preset không tồn tại"
    end
    table.remove(self.presets, index)
    if self.lastUsed == index then
        self.lastUsed = 0
    elseif self.lastUsed > index then
        self.lastUsed = self.lastUsed - 1
    end
    self:persist()
    self:notify()
    return true
end

function Controller:restore()
    local data = self.store:load()
    if type(data) ~= "table" then
        return false
    end
    self.presets = Store.validatePresets(data)
    local lastUsed = clampInt(data.lastUsed, 0, #self.presets, 0)
    self.lastUsed = lastUsed
    if lastUsed > 0 and self.presets[lastUsed] ~= nil then
        local activate = (self.cfg.autoStart == true) and (self.presets[lastUsed].active == true)
        self:applyPreset(lastUsed, activate, true)
    end
    return #self.presets > 0
end

function Controller:persist()
    local data = {
        version = 1,
        presets = self.presets,
        lastUsed = self.lastUsed,
    }
    local ok, err = self.store:save(data)
    if not ok and err ~= nil then
        self.lastMessage = "⚠️ chưa lưu được preset: " .. tostring(err)
    end
    return ok
end

function Controller:setObserver(fn)
    self.observer = fn
end

function Controller:notify()
    if self.observer ~= nil then
        pcall(self.observer, self:snapshot())
    end
end

function Controller:destroy()
    if self.destroyed then
        return true
    end
    self.destroyed = true
    self.active = false
    self:unbind()
    self:resetResults()
    self.visuals:destroy()
    self.observer = nil
    self:persist()
    return true
end

-- ===========================================================================
-- 8. UI — bảng điều khiển tiếng Việt
-- ===========================================================================

local UI = {}
UI.__index = UI
ObjectLocator.UI = UI

local UI_COLORS = {
    BG = { 14, 16, 22 },
    SURFACE = { 24, 27, 36 },
    SURFACE2 = { 34, 38, 50 },
    BORDER = { 58, 64, 82 },
    TEXT = { 236, 239, 246 },
    MUTED = { 148, 156, 176 },
    ACCENT = { 86, 156, 255 },
    GREEN = { 52, 208, 150 },
    RED = { 230, 88, 88 },
    YELLOW = { 245, 196, 90 },
    PURPLE = { 155, 128, 245 },
}

local function rgb(key)
    local value = UI_COLORS[key] or UI_COLORS.TEXT
    local ok, color = pcall(function()
        return Color3.fromRGB(value[1], value[2], value[3])
    end)
    return ok and color or nil
end

local function bestText(color)
    if color == nil then
        return nil
    end
    local ok, luminance = pcall(function()
        return color.R * 0.299 + color.G * 0.587 + color.B * 0.114
    end)
    if ok and luminance > 0.62 then
        return rgb("BG")
    end
    return rgb("TEXT")
end

local function makeInstance(className, properties, parent)
    local ok, inst = pcall(function()
        return Instance.new(className)
    end)
    if not ok or inst == nil then
        return nil
    end
    for key, value in pairs(properties or {}) do
        pcall(function()
            inst[key] = value
        end)
    end
    if parent ~= nil then
        pcall(function()
            inst.Parent = parent
        end)
    end
    return inst
end

function ObjectLocator.newUI(controller, options)
    options = options or {}
    local env = controller.env
    local playerGui = env.playerGui
    if playerGui == nil and env.localPlayer ~= nil then
        playerGui = safeCall(function()
            return env.localPlayer:FindFirstChildOfClass("PlayerGui")
                or env.localPlayer:WaitForChild("PlayerGui", 5)
        end)
    end
    if playerGui == nil then
        controller.lastMessage = "⚠️ không tìm thấy PlayerGui — chỉ chạy định vị, không mở bảng"
        return nil
    end

    local self = setmetatable({}, UI)
    self.controller = controller
    self.connections = {}
    self.rows = {}
    self.rowInstances = {}
    self.chipSignature = nil
    self.presetSignature = nil
    self.queryApplyToken = 0
    self.panelVisible = true
    self.minimized = false
    self.lastSnap = nil

    local root = makeInstance("ScreenGui", {
        Name = "ObjectLocatorUI",
        ResetOnSpawn = false,
        IgnoreGuiInset = true,
        DisplayOrder = 1000000,
        ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
        Parent = playerGui,
    }, nil)
    if root == nil then
        controller.lastMessage = "⚠️ không tạo được ScreenGui"
        return nil
    end
    self.root = root

    local panel = makeInstance("Frame", {
        Name = "Panel",
        Size = UDim2.new(0, 384, 0, 548),
        Position = UDim2.new(1, -404, 0, 84),
        BackgroundColor3 = rgb("SURFACE"),
        BackgroundTransparency = 0.04,
        BorderSizePixel = 0,
        ClipsDescendants = true,
        ZIndex = 10,
        Parent = root,
    }, nil)
    if panel == nil then
        pcall(function()
            root:Destroy()
        end)
        return nil
    end
    self.panel = panel

    makeInstance("UICorner", { CornerRadius = UDim.new(0, 10) }, panel)
    local stroke = makeInstance("UIStroke", {
        Thickness = 1,
        Color = rgb("BORDER"),
        Transparency = 0.2,
        ApplyStrokeMode = Enum.ApplyStrokeMode.Border,
        Parent = panel,
    }, nil)
    if stroke ~= nil then
        stroke.Parent = panel
    end

    local header = makeInstance("Frame", {
        Name = "Header",
        Size = UDim2.new(1, 0, 0, 34),
        BackgroundColor3 = rgb("SURFACE2"),
        BackgroundTransparency = 0.1,
        BorderSizePixel = 0,
        ZIndex = 11,
        Parent = panel,
    }, nil)
    self.header = header

    makeInstance("TextLabel", {
        Name = "Title",
        Size = UDim2.new(1, -84, 1, 0),
        Position = UDim2.new(0, 10, 0, 0),
        BackgroundTransparency = 1,
        Text = "🌳 ĐỊNH VỊ VẬT THỂ",
        TextColor3 = rgb("TEXT"),
        Font = Enum.Font.GothamBold,
        TextSize = 12,
        TextXAlignment = Enum.TextXAlignment.Left,
        ZIndex = 12,
        Parent = header,
    }, nil)

    local minimize = makeInstance("TextButton", {
        Name = "Minimize",
        Size = UDim2.new(0, 26, 0, 22),
        Position = UDim2.new(1, -62, 0, 6),
        BackgroundColor3 = rgb("SURFACE"),
        Text = "—",
        TextColor3 = rgb("TEXT"),
        Font = Enum.Font.GothamBold,
        TextSize = 12,
        BorderSizePixel = 0,
        AutoButtonColor = false,
        ZIndex = 12,
        Parent = header,
    }, nil)
    local close = makeInstance("TextButton", {
        Name = "Close",
        Size = UDim2.new(0, 26, 0, 22),
        Position = UDim2.new(1, -32, 0, 6),
        BackgroundColor3 = rgb("RED"),
        Text = "✕",
        TextColor3 = rgb("TEXT"),
        Font = Enum.Font.GothamBold,
        TextSize = 11,
        BorderSizePixel = 0,
        AutoButtonColor = false,
        ZIndex = 12,
        Parent = header,
    }, nil)

    local body = makeInstance("ScrollingFrame", {
        Name = "Body",
        Size = UDim2.new(1, -12, 1, -42),
        Position = UDim2.new(0, 6, 0, 38),
        BackgroundTransparency = 1,
        BorderSizePixel = 0,
        ScrollBarThickness = 3,
        ScrollBarImageColor3 = rgb("BORDER"),
        CanvasSize = UDim2.new(0, 0, 0, 0),
        AutomaticCanvasSize = Enum.AutomaticSize.Y,
        ZIndex = 10,
        Parent = panel,
    }, nil)
    self.body = body

    local layout = makeInstance("UIListLayout", {
        Padding = UDim.new(0, 6),
        SortOrder = Enum.SortOrder.LayoutOrder,
        Parent = body,
    }, nil)
    if layout ~= nil then
        layout.Parent = body
    end
    local padding = makeInstance("UIPadding", {
        PaddingTop = UDim.new(0, 2),
        PaddingLeft = UDim.new(0, 2),
        PaddingRight = UDim.new(0, 4),
        PaddingBottom = UDim.new(0, 8),
        Parent = body,
    }, nil)
    if padding ~= nil then
        padding.Parent = body
    end

    local order = 1
    local function nextOrder()
        local value = order
        order = order + 1
        return value
    end

    local function rowFrame(height)
        return makeInstance("Frame", {
            Size = UDim2.new(1, 0, 0, height),
            BackgroundTransparency = 1,
            LayoutOrder = nextOrder(),
            ZIndex = 10,
            Parent = body,
        }, nil)
    end

    local function textLabel(parent, text, size, position, colorKey, textSize, bold)
        return makeInstance("TextLabel", {
            Size = size,
            Position = position or UDim2.new(0, 0, 0, 0),
            BackgroundTransparency = 1,
            Text = text,
            TextColor3 = rgb(colorKey or "TEXT"),
            Font = bold and Enum.Font.GothamBold or Enum.Font.GothamMedium,
            TextSize = textSize or 10,
            TextXAlignment = Enum.TextXAlignment.Left,
            TextYAlignment = Enum.TextYAlignment.Center,
            TextWrapped = false,
            ZIndex = 11,
            Parent = parent,
        }, nil)
    end

    local function button(parent, name, text, size, position, colorKey, textSize)
        local btn = makeInstance("TextButton", {
            Name = name,
            Size = size,
            Position = position or UDim2.new(0, 0, 0, 0),
            Text = text,
            BackgroundColor3 = rgb(colorKey or "SURFACE2"),
            TextColor3 = bestText(rgb(colorKey or "SURFACE2")),
            Font = Enum.Font.GothamBold,
            TextSize = textSize or 9,
            BorderSizePixel = 0,
            AutoButtonColor = false,
            ZIndex = 12,
            Parent = parent,
        }, nil)
        if btn ~= nil then
            makeInstance("UICorner", { CornerRadius = UDim.new(0, 5) }, btn)
        end
        return btn
    end

    -- Hàng 1: ô tìm kiếm + ghim
    local searchRow = rowFrame(30)
    local queryBox = makeInstance("TextBox", {
        Name = "Query",
        Size = UDim2.new(1, -54, 0, 28),
        Position = UDim2.new(0, 0, 0, 1),
        BackgroundColor3 = rgb("SURFACE2"),
        BackgroundTransparency = 0.05,
        Text = controller.queryRaw,
        PlaceholderText = "VD: cây, đá, rương… hoặc Workspace.Rừng.Cây",
        PlaceholderColor3 = rgb("MUTED"),
        ClearTextOnFocus = false,
        TextColor3 = rgb("TEXT"),
        Font = Enum.Font.GothamMedium,
        TextSize = 10,
        TextXAlignment = Enum.TextXAlignment.Left,
        BorderSizePixel = 0,
        ZIndex = 11,
        Parent = searchRow,
    }, nil)
    self.queryBox = queryBox
    if queryBox ~= nil then
        makeInstance("UIPadding", { PaddingLeft = UDim.new(0, 8), PaddingRight = UDim.new(0, 6) }, queryBox)
        makeInstance("UICorner", { CornerRadius = UDim.new(0, 6) }, queryBox)
    end
    local pinButton = button(searchRow, "Pin", "➕", UDim2.new(0, 46, 0, 28), UDim2.new(1, -46, 0, 1), "ACCENT", 12)
    self.pinButton = pinButton

    -- Hàng 2: các mục đã ghim
    local chipsRow = rowFrame(26)
    local chips = makeInstance("ScrollingFrame", {
        Name = "Chips",
        Size = UDim2.new(1, 0, 1, 0),
        BackgroundColor3 = rgb("SURFACE"),
        BackgroundTransparency = 0.35,
        BorderSizePixel = 0,
        ScrollBarThickness = 2,
        ScrollingDirection = Enum.ScrollingDirection.X,
        CanvasSize = UDim2.new(0, 0, 0, 0),
        ZIndex = 10,
        Parent = chipsRow,
    }, nil)
    if chips ~= nil then
        makeInstance("UICorner", { CornerRadius = UDim.new(0, 6) }, chips)
        local chipsLayout = makeInstance("UIListLayout", {
            Padding = UDim.new(0, 4),
            FillDirection = Enum.FillDirection.Horizontal,
            VerticalAlignment = Enum.VerticalAlignment.Center,
            SortOrder = Enum.SortOrder.LayoutOrder,
            Parent = chips,
        }, nil)
        if chipsLayout ~= nil then
            chipsLayout.Parent = chips
        end
        makeInstance("UIPadding", { PaddingLeft = UDim.new(0, 4), PaddingTop = UDim.new(0, 3) }, chips)
    end
    self.chips = chips

    -- Hàng 3: nút hành động
    local actionRow = rowFrame(26)
    local rescanButton = button(actionRow, "Rescan", "🔄 Quét", UDim2.new(0, 76, 0, 24), UDim2.new(0, 0, 0, 1), "SURFACE2")
    local clearButton = button(actionRow, "Clear", "🧹 Xoá", UDim2.new(0, 68, 0, 24), UDim2.new(0, 80, 0, 1), "RED")
    local saveButton = button(actionRow, "Save", "💾 Lưu", UDim2.new(0, 68, 0, 24), UDim2.new(0, 152, 0, 1), "GREEN")
    local presetButton = button(actionRow, "Presets", "📂 Preset (0)", UDim2.new(1, -74, 0, 24), UDim2.new(0, 224, 0, 1), "YELLOW")
    if presetButton ~= nil then
        presetButton.Size = UDim2.new(1, -224, 0, 24)
    end
    self.rescanButton = rescanButton
    self.clearButton = clearButton
    self.saveButton = saveButton
    self.presetButton = presetButton

    -- Hàng 4 + 5: công tắc
    local toggleRow1 = rowFrame(26)
    local toggleRow2 = rowFrame(26)
    local boxButton = button(toggleRow1, "Box", "🔲 Hộp", UDim2.new(0.32, -3, 0, 24), UDim2.new(0, 0, 0, 1), "SURFACE2")
    local labelButton = button(toggleRow1, "Label", "💬 Nhãn", UDim2.new(0.32, -3, 0, 24), UDim2.new(0.33, 1, 0, 1), "GREEN")
    local xyzButton = button(toggleRow1, "XYZ", "🧭 Toạ độ", UDim2.new(0.32, -3, 0, 24), UDim2.new(0.66, 2, 0, 1), "GREEN")
    local wallButton = button(toggleRow2, "Wall", "🕶 Xuyên tường", UDim2.new(0.48, -3, 0, 24), UDim2.new(0, 0, 0, 1), "GREEN")
    local skipButton = button(toggleRow2, "Skip", "🚫 Bỏ qua người chơi", UDim2.new(0.48, -3, 0, 24), UDim2.new(0.49, 2, 0, 1), "GREEN")
    self.boxButton = boxButton
    self.labelButton = labelButton
    self.xyzButton = xyzButton
    self.wallButton = wallButton
    self.skipButton = skipButton

    -- Hàng 6: khoảng cách + màu
    local distRow = rowFrame(26)
    textLabel(distRow, "📏 Xa nhất:", UDim2.new(0, 74, 1, 0), UDim2.new(0, 2, 0, 0), "MUTED", 9)
    local distBox = makeInstance("TextBox", {
        Name = "Distance",
        Size = UDim2.new(0, 58, 0, 24),
        Position = UDim2.new(0, 78, 0, 1),
        BackgroundColor3 = rgb("SURFACE2"),
        BackgroundTransparency = 0.05,
        Text = tostring(round(controller.state.maxDistance)),
        TextColor3 = rgb("TEXT"),
        PlaceholderText = "0 = ∞",
        PlaceholderColor3 = rgb("MUTED"),
        Font = Enum.Font.GothamMedium,
        TextSize = 10,
        BorderSizePixel = 0,
        ZIndex = 11,
        Parent = distRow,
    }, nil)
    if distBox ~= nil then
        makeInstance("UICorner", { CornerRadius = UDim.new(0, 5) }, distBox)
        makeInstance("UIPadding", { PaddingLeft = UDim.new(0, 6) }, distBox)
    end
    self.distBox = distBox
    local applyDistButton = button(distRow, "ApplyDist", "Đặt", UDim2.new(0, 44, 0, 24), UDim2.new(0, 140, 0, 1), "SURFACE2")
    local colorButton = button(distRow, "Color", "🎨 " .. controller:colorName(), UDim2.new(1, -188, 0, 24), UDim2.new(0, 188, 0, 1), "PURPLE")
    self.applyDistButton = applyDistButton
    self.colorButton = colorButton

    -- Hàng 7: trạng thái
    local statusRow = rowFrame(38)
    local statusLabel = makeInstance("TextLabel", {
        Name = "Status",
        Size = UDim2.new(1, 0, 1, 0),
        BackgroundColor3 = rgb("SURFACE"),
        BackgroundTransparency = 0.4,
        Text = controller:statusText(),
        TextColor3 = rgb("ACCENT"),
        Font = Enum.Font.GothamMedium,
        TextSize = 9,
        TextWrapped = true,
        TextXAlignment = Enum.TextXAlignment.Left,
        TextYAlignment = Enum.TextYAlignment.Center,
        BorderSizePixel = 0,
        ZIndex = 11,
        Parent = statusRow,
    }, nil)
    if statusLabel ~= nil then
        makeInstance("UICorner", { CornerRadius = UDim.new(0, 5) }, statusLabel)
        makeInstance("UIPadding", { PaddingLeft = UDim.new(0, 6), PaddingRight = UDim.new(0, 4) }, statusLabel)
    end
    self.statusLabel = statusLabel

    -- Hàng 8: tiêu đề danh sách
    local listHeader = rowFrame(18)
    textLabel(listHeader, "📋 KẾT QUẢ", UDim2.new(0.5, 0, 1, 0), UDim2.new(0, 2, 0, 0), "MUTED", 9, true)
    local countLabel = textLabel(listHeader, "", UDim2.new(0.5, -2, 1, 0), UDim2.new(0.5, 0, 0, 0), "MUTED", 9)
    if countLabel ~= nil then
        countLabel.TextXAlignment = Enum.TextXAlignment.Right
    end
    self.countLabel = countLabel

    -- Hàng 9: danh sách
    local list = makeInstance("ScrollingFrame", {
        Name = "Results",
        Size = UDim2.new(1, 0, 0, 176),
        BackgroundTransparency = 1,
        BorderSizePixel = 0,
        ScrollBarThickness = 3,
        ScrollBarImageColor3 = rgb("BORDER"),
        CanvasSize = UDim2.new(0, 0, 0, 0),
        LayoutOrder = nextOrder(),
        ZIndex = 10,
        Parent = body,
    }, nil)
    if list ~= nil then
        local listLayout = makeInstance("UIListLayout", {
            Padding = UDim.new(0, 3),
            SortOrder = Enum.SortOrder.LayoutOrder,
            Parent = list,
        }, nil)
        if listLayout ~= nil then
            listLayout.Parent = list
        end
    end
    self.list = list

    -- Hàng 10: khu preset
    local presetPanel = makeInstance("Frame", {
        Name = "PresetPanel",
        Size = UDim2.new(1, 0, 0, 96),
        BackgroundColor3 = rgb("SURFACE"),
        BackgroundTransparency = 0.25,
        BorderSizePixel = 0,
        Visible = false,
        LayoutOrder = nextOrder(),
        ZIndex = 10,
        Parent = body,
    }, nil)
    local presetList = nil
    if presetPanel ~= nil then
        makeInstance("UICorner", { CornerRadius = UDim.new(0, 6) }, presetPanel)
        presetList = makeInstance("ScrollingFrame", {
            Name = "PresetList",
            Size = UDim2.new(1, -8, 1, -8),
            Position = UDim2.new(0, 4, 0, 4),
            BackgroundTransparency = 1,
            BorderSizePixel = 0,
            ScrollBarThickness = 3,
            CanvasSize = UDim2.new(0, 0, 0, 0),
            ZIndex = 11,
            Parent = presetPanel,
        }, nil)
        if presetList ~= nil then
            local presetLayout = makeInstance("UIListLayout", {
                Padding = UDim.new(0, 3),
                SortOrder = Enum.SortOrder.LayoutOrder,
                Parent = presetList,
            }, nil)
            if presetLayout ~= nil then
                presetLayout.Parent = presetList
            end
        end
    end
    self.presetPanel = presetPanel
    self.presetList = presetList

    -- Hàng 11: gợi ý
    local hintRow = rowFrame(16)
    textLabel(hintRow, "Enter = áp dụng · ➕ = ghim nhiều mục · " .. tostring(Config.keybind or "—") .. " = bật/tắt",
        UDim2.new(1, 0, 1, 0), UDim2.new(0, 2, 0, 0), "MUTED", 8)

    -- Nút nổi khi đóng bảng
    local floating = makeInstance("TextButton", {
        Name = "Toggle",
        Size = UDim2.new(0, 46, 0, 46),
        Position = UDim2.new(0, 16, 0.4, -23),
        BackgroundColor3 = rgb("ACCENT"),
        Text = "🌳",
        TextColor3 = rgb("TEXT"),
        Font = Enum.Font.GothamBold,
        TextSize = 20,
        BorderSizePixel = 0,
        AutoButtonColor = false,
        Visible = false,
        ZIndex = 20,
        Parent = root,
    }, nil)
    self.floating = floating
    if floating ~= nil then
        makeInstance("UICorner", { CornerRadius = UDim.new(1, 0) }, floating)
        makeInstance("UIStroke", { Thickness = 1.5, Color = rgb("TEXT"), Transparency = 0.4, Parent = floating }, nil)
    end

    -- ---------------------------------------------------------------- helpers
    local function connect(signal, callback)
        if signal == nil then
            return nil
        end
        local ok, connection = pcall(function()
            return signal:Connect(callback)
        end)
        if ok and connection ~= nil then
            self.connections[#self.connections + 1] = connection
            return connection
        end
        return nil
    end

    local function applyQueryNow()
        if queryBox == nil then
            return
        end
        self.queryApplyToken = self.queryApplyToken + 1
        local text = tostring(queryBox.Text or "")
        controller:setQuery(text)
        self:refresh()
    end

    local function applyQuerySoon()
        self.queryApplyToken = self.queryApplyToken + 1
        local token = self.queryApplyToken
        if type(task) == "table" and type(task.delay) == "function" then
            task.delay(0.3, function()
                if token == self.queryApplyToken and queryBox ~= nil and queryBox.Parent ~= nil then
                    controller:setQuery(tostring(queryBox.Text or ""))
                    self:refresh()
                end
            end)
        end
    end

    if queryBox ~= nil then
        connect(queryBox:GetPropertyChangedSignal("Text"), applyQuerySoon)
        connect(queryBox.FocusLost, function(enterPressed)
            if enterPressed then
                applyQueryNow()
            end
        end)
    end

    connect(pinButton and pinButton.Activated, function()
        local ok, result = controller:addPinned(tostring(queryBox and queryBox.Text or ""))
        if ok then
            if queryBox ~= nil then
                queryBox.Text = ""
            end
            controller:setQuery("")
            self:refresh()
        else
            controller.lastMessage = "⚠️ " .. tostring(result)
            self:refresh()
        end
    end)

    connect(rescanButton and rescanButton.Activated, function()
        controller:requestRescan(0)
        if queryBox ~= nil then
            controller:setQuery(tostring(queryBox.Text or ""))
        end
        controller.lastMessage = "🔄 đang quét lại (có ngân sách, không treo)"
        self:refresh()
    end)

    connect(clearButton and clearButton.Activated, function()
        if queryBox ~= nil then
            queryBox.Text = ""
        end
        controller:clearAll()
        self:refresh()
    end)

    connect(saveButton and saveButton.Activated, function()
        local ok, result = controller:savePreset()
        if not ok then
            controller.lastMessage = "⚠️ " .. tostring(result)
        else
            controller.lastMessage = "💾 đã lưu preset #" .. tostring(result)
        end
        self:refresh()
    end)

    connect(presetButton and presetButton.Activated, function()
        if presetPanel ~= nil then
            presetPanel.Visible = not presetPanel.Visible
            self:refreshPresets()
        end
    end)

    connect(boxButton and boxButton.Activated, function()
        controller:setOption("showBox", not controller.state.showBox)
        self:refresh()
    end)
    connect(labelButton and labelButton.Activated, function()
        controller:setOption("showLabel", not controller.state.showLabel)
        self:refresh()
    end)
    connect(xyzButton and xyzButton.Activated, function()
        controller:setOption("showXYZ", not controller.state.showXYZ)
        self:refresh()
    end)
    connect(wallButton and wallButton.Activated, function()
        controller:setOption("throughWall", not controller.state.throughWall)
        self:refresh()
    end)
    connect(skipButton and skipButton.Activated, function()
        controller:setOption("skipPlayers", not controller.state.skipPlayers)
        self:refresh()
    end)
    connect(colorButton and colorButton.Activated, function()
        controller:cycleColor()
        self:refresh()
    end)
    connect(applyDistButton and applyDistButton.Activated, function()
        local text = tostring(distBox and distBox.Text or "0")
        local number = tonumber(text:match("%-?%d+%.?%d*") or "") or 0
        local value = controller:setMaxDistance(number)
        if distBox ~= nil then
            distBox.Text = tostring(round(value))
        end
        self:refresh()
    end)

    connect(minimize and minimize.Activated, function()
        self.minimized = not self.minimized
        if body ~= nil then
            body.Visible = not self.minimized
        end
        panel.Size = UDim2.new(0, 384, 0, self.minimized and 34 or 548)
        if minimize ~= nil then
            minimize.Text = self.minimized and "▣" or "—"
        end
    end)

    connect(close and close.Activated, function()
        self.panelVisible = false
        panel.Visible = false
        if floating ~= nil then
            floating.Visible = true
        end
        controller.uiVisible = false
    end)

    connect(floating and floating.Activated, function()
        self.panelVisible = true
        panel.Visible = true
        if floating ~= nil then
            floating.Visible = false
        end
        controller.uiVisible = true
        controller:requestRescan(0)
        self:refresh()
    end)

    -- Kéo bảng bằng tiêu đề
    local dragging = false
    local dragStart = nil
    local panelStart = nil
    connect(header and header.InputBegan, function(input)
        local okType, userInputType = pcall(function()
            return input.UserInputType
        end)
        if okType and (userInputType == Enum.UserInputType.MouseButton1 or userInputType == Enum.UserInputType.Touch) then
            dragging = true
            dragStart = input.Position
            panelStart = panel.Position
        end
    end)
    local userInputService = env.userInputService or getService("UserInputService")
    if userInputService ~= nil then
        connect(userInputService.InputEnded, function(input)
            if dragging then
                local okType, userInputType = pcall(function()
                    return input.UserInputType
                end)
                if okType and (userInputType == Enum.UserInputType.MouseButton1 or userInputType == Enum.UserInputType.Touch) then
                    dragging = false
                end
            end
        end)
        connect(userInputService.InputChanged, function(input)
            if not dragging or dragStart == nil or panelStart == nil then
                return
            end
            local okPos, current = pcall(function()
                return input.Position
            end)
            if not okPos or current == nil then
                return
            end
            local okDelta, delta = pcall(function()
                return current - dragStart
            end)
            if not okDelta or delta == nil then
                return
            end
            local okX, dx = pcall(function() return delta.X end)
            local okY, dy = pcall(function() return delta.Y end)
            if not okX or not okY then
                return
            end
            pcall(function()
                panel.Position = UDim2.new(
                    panelStart.X.Scale, panelStart.X.Offset + dx,
                    panelStart.Y.Scale, panelStart.Y.Offset + dy
                )
            end)
        end)
    end

    -- Bấm vào dòng kết quả = đi tới vật
    self.onRowActivated = function(inst)
        local ok, result = controller:walkTo(inst)
        if not ok then
            controller.lastMessage = "⚠️ " .. tostring(result)
        end
        self:refresh()
    end

    self:refresh()
    controller:setObserver(function(snapshot)
        self.lastSnap = snapshot
        if self.panelVisible and not self.minimized then
            self:refresh(snapshot)
        end
    end)

    if options.startHidden == true then
        self.panelVisible = false
        panel.Visible = false
        if floating ~= nil then
            floating.Visible = true
        end
    end

    return self
end

function UI:paintToggle(button, text, enabled, enabledColor)
    if button == nil then
        return
    end
    button.Text = text
    local color = enabled and rgb(enabledColor or "GREEN") or rgb("SURFACE2")
    pcall(function()
        button.BackgroundColor3 = color
        button.TextColor3 = bestText(color)
    end)
end

function UI:refreshChips(snapshot)
    if self.chips == nil then
        return
    end
    local pinned = snapshot.pinned or {}
    local parts = {}
    for i = 1, #pinned do
        parts[i] = tostring(pinned[i].kind) .. ":" .. tostring(pinned[i].raw)
    end
    local signature = table.concat(parts, "|")
    if signature == self.chipSignature then
        return
    end
    self.chipSignature = signature

    for _, child in ipairs(self.chips:GetChildren()) do
        if not child:IsA("UIListLayout") and not child:IsA("UIPadding") then
            pcall(function()
                child:Destroy()
            end)
        end
    end
    if #pinned == 0 then
        makeInstance("TextLabel", {
            Name = "Empty",
            Size = UDim2.new(1, -8, 0, 18),
            Position = UDim2.new(0, 4, 0, 3),
            BackgroundTransparency = 1,
            Text = "chưa ghim mục nào — gõ tên rồi bấm ➕ để chạy nhiều mục cùng lúc",
            TextColor3 = rgb("MUTED"),
            Font = Enum.Font.GothamMedium,
            TextSize = 8,
            TextXAlignment = Enum.TextXAlignment.Left,
            ZIndex = 11,
            Parent = self.chips,
        }, nil)
        return
    end
    local width = 0
    for i = 1, #pinned do
        local raw = tostring(pinned[i].raw)
        local short = #raw > 24 and (raw:sub(1, 21) .. "...") or raw
        local chipWidth = math.max(54, math.min(170, 34 + #short * 5))
        local chip = makeInstance("TextButton", {
            Name = "Chip_" .. tostring(i),
            Size = UDim2.new(0, chipWidth, 0, 18),
            LayoutOrder = i,
            Text = "✕ " .. short,
            BackgroundColor3 = pinned[i].kind == "path" and rgb("ACCENT") or rgb("SURFACE2"),
            TextColor3 = rgb("TEXT"),
            Font = Enum.Font.GothamBold,
            TextSize = 8,
            BorderSizePixel = 0,
            AutoButtonColor = false,
            ZIndex = 11,
            Parent = self.chips,
        }, nil)
        if chip ~= nil then
            makeInstance("UICorner", { CornerRadius = UDim.new(0, 4) }, chip)
            local index = i
            chip.Activated:Connect(function()
                local ok, removed = self.controller:removePinned(index)
                if not ok then
                    self.controller.lastMessage = "⚠️ " .. tostring(removed)
                end
                self.chipSignature = nil
                self:refresh()
            end)
            width = width + chipWidth + 4
        end
    end
    pcall(function()
        self.chips.CanvasSize = UDim2.new(0, width + 20, 0, 0)
    end)
end

function UI:refreshPresets()
    if self.presetList == nil then
        return
    end
    local presets = self.controller.presets or {}
    local parts = {}
    for i = 1, #presets do
        parts[i] = tostring(presets[i].title) .. ":" .. tostring(presets[i].maxDistance) .. ":" .. tostring(presets[i].colorIndex)
    end
    local signature = table.concat(parts, "|")
    if signature == self.presetSignature then
        return
    end
    self.presetSignature = signature

    for _, child in ipairs(self.presetList:GetChildren()) do
        if not child:IsA("UIListLayout") then
            pcall(function()
                child:Destroy()
            end)
        end
    end
    for i = 1, #presets do
        local preset = presets[i]
        local row = makeInstance("Frame", {
            Name = "PresetRow_" .. tostring(i),
            Size = UDim2.new(1, 0, 0, 24),
            BackgroundColor3 = rgb("SURFACE2"),
            BackgroundTransparency = 0.2,
            BorderSizePixel = 0,
            LayoutOrder = i,
            ZIndex = 11,
            Parent = self.presetList,
        }, nil)
        if row ~= nil then
            makeInstance("UICorner", { CornerRadius = UDim.new(0, 4) }, row)
            local title = tostring(preset.title or ("Preset " .. tostring(i)))
            if #title > 30 then
                title = title:sub(1, 27) .. "..."
            end
            makeInstance("TextLabel", {
                Size = UDim2.new(1, -104, 1, 0),
                Position = UDim2.new(0, 6, 0, 0),
                BackgroundTransparency = 1,
                Text = string.format("#%d %s · %dm", i, title, round(preset.maxDistance or 0)),
                TextColor3 = rgb("TEXT"),
                Font = Enum.Font.GothamMedium,
                TextSize = 9,
                TextXAlignment = Enum.TextXAlignment.Left,
                TextTruncate = Enum.TextTruncate.AtEnd,
                ZIndex = 12,
                Parent = row,
            }, nil)
            local use = makeInstance("TextButton", {
                Size = UDim2.new(0, 68, 0, 18),
                Position = UDim2.new(1, -98, 0, 3),
                Text = "▶ Dùng",
                BackgroundColor3 = rgb("GREEN"),
                TextColor3 = rgb("TEXT"),
                Font = Enum.Font.GothamBold,
                TextSize = 8,
                BorderSizePixel = 0,
                ZIndex = 12,
                Parent = row,
            }, nil)
            local delete = makeInstance("TextButton", {
                Size = UDim2.new(0, 22, 0, 18),
                Position = UDim2.new(1, -26, 0, 3),
                Text = "✕",
                BackgroundColor3 = rgb("RED"),
                TextColor3 = rgb("TEXT"),
                Font = Enum.Font.GothamBold,
                TextSize = 8,
                BorderSizePixel = 0,
                ZIndex = 12,
                Parent = row,
            }, nil)
            local index = i
            if use ~= nil then
                use.Activated:Connect(function()
                    local ok, result = self.controller:loadPreset(index)
                    if not ok then
                        self.controller.lastMessage = "⚠️ " .. tostring(result)
                    end
                    self.presetSignature = nil
                    self:refresh()
                end)
            end
            if delete ~= nil then
                delete.Activated:Connect(function()
                    self.controller:deletePreset(index)
                    self.presetSignature = nil
                    self:refresh()
                end)
            end
        end
    end
    pcall(function()
        self.presetList.CanvasSize = UDim2.new(0, 0, 0, math.max(0, #presets * 27))
    end)
end

function UI:refreshList(snapshot)
    if self.list == nil then
        return
    end
    local source = snapshot.list or {}
    local limit = math.min(#source, self.controller.cfg.listRows or 14)

    local same = (#self.rowInstances == limit)
    if same then
        for i = 1, limit do
            if self.rowInstances[i] ~= source[i].inst then
                same = false
                break
            end
        end
    end

    if not same then
        for _, child in ipairs(self.list:GetChildren()) do
            if not child:IsA("UIListLayout") then
                pcall(function()
                    child:Destroy()
                end)
            end
        end
        self.rows = {}
        self.rowInstances = {}
        for i = 1, limit do
            local item = source[i]
            local row = makeInstance("TextButton", {
                Name = "Row_" .. tostring(i),
                Size = UDim2.new(1, 0, 0, 24),
                Text = "",
                BackgroundColor3 = item.path and rgb("ACCENT") or rgb("SURFACE2"),
                BackgroundTransparency = 0.35,
                TextColor3 = rgb("TEXT"),
                Font = Enum.Font.GothamMedium,
                TextSize = 9,
                TextXAlignment = Enum.TextXAlignment.Left,
                TextTruncate = Enum.TextTruncate.AtEnd,
                BorderSizePixel = 0,
                AutoButtonColor = false,
                LayoutOrder = i,
                ZIndex = 11,
                Parent = self.list,
            }, nil)
            if row ~= nil then
                makeInstance("UICorner", { CornerRadius = UDim.new(0, 4) }, row)
                makeInstance("UIPadding", { PaddingLeft = UDim.new(0, 6), PaddingRight = UDim.new(0, 5) }, row)
                row.Activated:Connect(function()
                    self.onRowActivated(item.inst)
                end)
                self.rows[i] = row
                self.rowInstances[i] = item.inst
            end
        end
        pcall(function()
            self.list.CanvasSize = UDim2.new(0, 0, 0, math.max(0, limit * 27))
        end)
    end

    for i = 1, limit do
        local row = self.rows[i]
        local item = source[i]
        if row ~= nil and item ~= nil then
            local distance = item.unknownDist and "--" or tostring(round(item.dist or 0))
            local coords = item.coords ~= "" and (" · " .. item.coords) or ""
            local text = string.format("%d. %s [%s] · 📏 %sm%s", i, item.name, item.class, distance, coords)
            if row.Text ~= text then
                row.Text = text
            end
        end
    end

    if self.countLabel ~= nil then
        self.countLabel.Text = string.format("%d/%d", #source, snapshot.found or #source)
    end
end

function UI:refresh(snapshot)
    if self.root == nil or self.root.Parent == nil then
        return
    end
    snapshot = snapshot or self.controller:snapshot()
    self.lastSnap = snapshot

    if self.statusLabel ~= nil then
        local status = snapshot.status
        if snapshot.message ~= nil and snapshot.message ~= "" then
            status = snapshot.message .. "\n" .. status
        end
        if self.statusLabel.Text ~= status then
            self.statusLabel.Text = status
        end
        local color = snapshot.active and rgb("ACCENT") or rgb("MUTED")
        if snapshot.scanning then
            color = rgb("YELLOW")
        elseif snapshot.active and #(snapshot.list or {}) > 0 then
            color = rgb("GREEN")
        end
        pcall(function()
            self.statusLabel.TextColor3 = color
        end)
    end

    self:paintToggle(self.boxButton, "🔲 Hộp", snapshot.options.showBox, "GREEN")
    self:paintToggle(self.labelButton, "💬 Nhãn", snapshot.options.showLabel, "GREEN")
    self:paintToggle(self.xyzButton, "🧭 Toạ độ", snapshot.options.showXYZ, "GREEN")
    self:paintToggle(self.wallButton, "🕶 Xuyên tường", snapshot.options.throughWall, "GREEN")
    self:paintToggle(self.skipButton, "🚫 Bỏ qua người chơi", snapshot.options.skipPlayers, "GREEN")

    if self.colorButton ~= nil then
        self.colorButton.Text = "🎨 " .. tostring(snapshot.colorName)
    end
    if self.presetButton ~= nil then
        self.presetButton.Text = string.format("📂 Preset (%d)", snapshot.presetCount or 0)
    end
    if self.rescanButton ~= nil then
        self.rescanButton.Text = snapshot.scanning and "⏳ Đang quét" or "🔄 Quét"
    end

    if self.distBox ~= nil then
        local focused = false
        if type(self.distBox.IsFocused) == "function" then
            local ok, value = pcall(function()
                return self.distBox:IsFocused()
            end)
            focused = ok and value == true
        end
        if not focused then
            local value = tostring(round(snapshot.maxDistance or 0))
            if self.distBox.Text ~= value then
                self.distBox.Text = value
            end
        end
    end

    if self.queryBox ~= nil then
        local focused = false
        if type(self.queryBox.IsFocused) == "function" then
            local ok, value = pcall(function()
                return self.queryBox:IsFocused()
            end)
            focused = ok and value == true
        end
        if not focused and tostring(self.queryBox.Text or "") ~= tostring(snapshot.query or "") then
            self.queryBox.Text = tostring(snapshot.query or "")
        end
    end

    self:refreshChips(snapshot)
    self:refreshList(snapshot)
    if self.presetPanel ~= nil and self.presetPanel.Visible then
        self:refreshPresets()
    end
end

function UI:destroy()
    for i = 1, #self.connections do
        pcall(function()
            self.connections[i]:Disconnect()
        end)
    end
    self.connections = {}
    if self.root ~= nil then
        pcall(function()
            self.root:Destroy()
        end)
        self.root = nil
    end
    self.controller:setObserver(nil)
end

-- ===========================================================================
-- 9. BOOTSTRAP
-- ===========================================================================

local startedInstance = nil

function ObjectLocator.start(options)
    options = options or {}
    if startedInstance ~= nil then
        return startedInstance
    end

    local controller = ObjectLocator.newController(options)
    local ui = nil
    if options.ui ~= false then
        ui = ObjectLocator.newUI(controller, options)
    end

    local connections = {}
    local function connect(signal, callback)
        if signal == nil then
            return
        end
        local ok, connection = pcall(function()
            return signal:Connect(callback)
        end)
        if ok and connection ~= nil then
            connections[#connections + 1] = connection
        end
    end

    local keyCode = nil
    if Config.keybind ~= nil and type(Enum.KeyCode) == "table" then
        keyCode = Enum.KeyCode[Config.keybind]
    end
    local userInputService = controller.env.userInputService or getService("UserInputService")
    if keyCode ~= nil and userInputService ~= nil then
        connect(userInputService.InputBegan, function(input, processed)
            if processed then
                return
            end
            if input.KeyCode == keyCode then
                controller:toggle()
                if ui ~= nil then
                    ui:refresh()
                end
            end
        end)
    end

    local localPlayer = controller.env.localPlayer
    if localPlayer ~= nil then
        connect(localPlayer.CharacterAdded, function()
            controller:requestRescan(0.25)
        end)
    end

    -- Khai báo `instance` TRƯỚC khi tạo closure: nếu viết
    -- `local instance = { destroy = function() ... instance ... end }` thì
    -- `instance` trong closure là biến TOÀN CỤC (nil), không phải bảng này.
    -- Đây là lỗi thật đã bị test UI-002 phát hiện.
    local instance = {}
    instance.controller = controller
    instance.ui = ui
    instance.destroy = function()
        for i = 1, #connections do
            pcall(function()
                connections[i]:Disconnect()
            end)
        end
        connections = {}
        if ui ~= nil then
            pcall(ui.destroy, ui)
        end
        pcall(controller.destroy, controller)
        if startedInstance == instance then
            startedInstance = nil
        end
        if _G.ObjectLocator == instance then
            _G.ObjectLocator = nil
        end
    end
    startedInstance = instance
    _G.ObjectLocator = instance
    return instance
end

function ObjectLocator.stop()
    if startedInstance ~= nil then
        startedInstance.destroy()
    end
    return true
end

-- Chỉ tự chạy khi thật sự ở Roblox (game/workspace là userdata). Máy ảo test
-- dùng bảng Lua nên không tự chạy — test gọi start()/newController() thủ công.
local isRoblox = (type(game) == "userdata") and (type(workspace) == "userdata")
if isRoblox then
    if _G.ObjectLocator ~= nil and type(_G.ObjectLocator.destroy) == "function" then
        pcall(_G.ObjectLocator.destroy)
    end
    local ok, err = pcall(ObjectLocator.start)
    if not ok then
        pcall(warn, "[ObjectLocator] " .. tostring(err))
    end
end

return ObjectLocator
