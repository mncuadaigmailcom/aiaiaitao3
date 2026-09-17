--[[
    tests/roblox-mock.lua — môi trường GIẢ LẬP Roblox/executor đủ để NẠP VÀ CHẠY THẬT
    toàn bộ script.js bên ngoài Roblox (dùng wasmoon = Lua 5.4 WASM).

    Mục đích: chạy được code thật, không phải viết lại logic để test. Mọi hàm của hub
    được gọi đúng như trong game; chỉ có API Roblox là đồ giả.

    Không đầy đủ 100% API Roblox — chỉ đủ cho những đường code mà test đi qua.
    Chỗ nào mock thiếu thì test sẽ lộ ra bằng lỗi, không âm thầm bỏ qua.
]]

-- ============================ ENUM (proxy, cache) ============================
local enumCache = {}
Enum = setmetatable({}, {
    __index = function(_, group)
        if not enumCache[group] then
            local items = {}
            enumCache[group] = setmetatable({}, {
                __index = function(_, k)
                    if not items[k] then items[k] = {Name = k, group = group, Value = #items + 1} end
                    return items[k]
                end,
            })
        end
        return enumCache[group]
    end,
})

-- ============================ typeof() cua Luau ============================
local function tagged(t, tag) t.__class_tag = tag return t end
function typeof(v)
    local tv = type(v)
    if tv ~= "table" then
        if tv == "number" then return "number" end
        if tv == "string" then return "string" end
        if tv == "boolean" then return "boolean" end
        if tv == "function" then return "function" end
        if tv == "nil" then return "nil" end
        return tv
    end
    return v.__class_tag or "table"
end

-- ============================ kieu gia tri ============================
local function mkColor(r, g, b)
    local c = {R = r, G = g, B = b}
    return tagged(setmetatable(c, {
        __eq = function(a, b) return a.R == b.R and a.G == b.G and a.B == b.B end,
        __tostring = function(a) return string.format("%.3f, %.3f, %.3f", a.R, a.G, a.B) end,
    }), "Color3")
end
Color3 = {
    fromRGB = function(r, g, b) return mkColor((r or 0) / 255, (g or 0) / 255, (b or 0) / 255) end,
    new     = function(r, g, b) return mkColor(r or 0, g or 0, b or 0) end,
    fromHSV = function() return mkColor(1, 1, 1) end,
}
Color3.new(1, 1, 1)

local function mkUDim(s, o) return tagged({Scale = s or 0, Offset = o or 0}, "UDim") end
UDim = {new = mkUDim}

local function mkUDim2(xs, xo, ys, yo)
    return tagged({
        X = mkUDim(xs, xo), Y = mkUDim(ys, yo),
    }, "UDim2")
end
UDim2 = {
    new = mkUDim2,
    fromScale = function(x, y) return mkUDim2(x, 0, y, 0) end,
    fromOffset = function(x, y) return mkUDim2(0, x, 0, y) end,
}

local function mkVec3(x, y, z)
    local v = {X = x or 0, Y = y or 0, Z = z or 0}
    v.Magnitude = math.sqrt(v.X ^ 2 + v.Y ^ 2 + v.Z ^ 2)
    return tagged(setmetatable(v, {
        __sub = function(a, b) return mkVec3(a.X - b.X, a.Y - b.Y, a.Z - b.Z) end,
        __add = function(a, b) return mkVec3(a.X + b.X, a.Y + b.Y, a.Z + b.Z) end,
        __eq  = function(a, b) return a.X == b.X and a.Y == b.Y and a.Z == b.Z end,
    }), "Vector3")
end
Vector3 = {new = mkVec3, zero = mkVec3(0, 0, 0)}

local function mkVec2(x, y)
    return tagged({X = x or 0, Y = y or 0}, "Vector2")
end
Vector2 = {new = mkVec2, zero = mkVec2(0, 0)}

CFrame = {
    new = function(x, y, z)
        return tagged({
            Position = mkVec3(x or 0, y or 0, z or 0),
            LookVector = mkVec3(0, 0, -1),
            ToOrientation = function() return 0, 0, 0 end,
        }, "CFrame")
    end,
    lookAt = function() return CFrame.new(0, 0, 0) end,
}

TweenInfo = {
    new = function(d, e, dir, rc, rev, delay)
        return {Time = d or 1, EasingStyle = e, EasingDirection = dir,
                RepeatCount = rc, Reverses = rev, DelayTime = delay}
    end,
}

local function seqKeypoint(t, v) return {Time = t, Value = v} end
ColorSequenceKeypoint = {new = function(t, c) return seqKeypoint(t, c) end}
NumberSequenceKeypoint = {new = function(t, v, e) return {Time = t, Value = v, Envelope = e} end}
ColorSequence = {
    new = function(a, b)
        if type(a) == "table" and a.__class_tag == nil and a[1] then return {Keypoints = a} end
        return {Keypoints = {seqKeypoint(0, a), seqKeypoint(1, b or a)}}
    end,
}
NumberSequence = {
    new = function(a, b)
        if type(a) == "table" and a[1] then return {Keypoints = a} end
        return {Keypoints = {seqKeypoint(0, a), seqKeypoint(1, b or a)}}
    end,
}
Font = {new = function(family, weight, style) return {Family = family, Weight = weight, Style = style} end}

RaycastParams = {new = function() return {FilterType = nil, FilterDescendantsInstances = {}} end}
OverlapParams = {new = function() return {FilterType = nil, FilterDescendantsInstances = {}, MaxParts = 0} end}
Region3 = {new = function() return {} end}

-- ============================ math.clamp (Luau) ============================
if not math.clamp then
    math.clamp = function(v, lo, hi) return math.min(math.max(v, lo), hi) end
end
if not math.round then
    math.round = function(v) return math.floor(v + 0.5) end
end
if not math.sign then
    math.sign = function(v) return v > 0 and 1 or (v < 0 and -1 or 0) end
end

-- Lua 5.4 khong co loadstring
loadstring = loadstring or function(src, nm) return load(src, nm or "=(load)", "t") end

-- ============================ SIGNAL ============================
local Signal = {}
Signal.__index = Signal
function Signal.new(name)
    return setmetatable({name = name, handlers = {}, _connCount = 0}, Signal)
end
function Signal:Connect(fn)
    self._connCount = self._connCount + 1
    local conn
    conn = setmetatable({
        Connected = true,
        _fn = fn,
        Disconnect = function() conn.Connected = false end,
    }, {__call = function() end})
    conn.Disconnect = function(c) if type(c) == "table" then c.Connected = false end conn.Connected = false end
    table.insert(self.handlers, conn)
    return conn
end
function Signal:Fire(...)
    local n = 0
    for _, c in ipairs(self.handlers) do
        if c.Connected then local ok, err = pcall(c._fn, ...) if not ok then MOCK_ERRORS[#MOCK_ERRORS + 1] = tostring(err) end n = n + 1 end
    end
    return n
end
function Signal:Wait() end

-- ============================ INSTANCE ============================
MOCK_ERRORS = {}
MOCK_INSTANCES = {}

local DEFAULTS = {
    Text = "", Visible = true, BackgroundTransparency = 0, BackgroundColor3 = nil,
    TextColor3 = nil, Position = nil, Size = nil, ZIndex = 1, BorderSizePixel = 0,
    Active = false, AutoButtonColor = true, ClipsDescendants = false, Enabled = true,
    TextSize = 14, Font = nil, Name = "", Parent = nil, LayoutOrder = 0,
    ScrollBarThickness = 4, CanvasSize = nil, ImageTransparency = 0, ImageColor3 = nil,
    Thickness = 1, Transparency = 0, CornerRadius = nil, Rotation = 0,
    TextXAlignment = nil, TextYAlignment = nil, TextWrapped = false,
    TextTruncate = nil, ScaleType = nil, TileSize = nil, Image = "",
    FilterType = nil, MaxParts = 0, IgnoreGuiInset = false, ResetOnSpawn = true,
    ZIndexBehavior = nil, CanvasPosition = nil, ScrollingDirection = nil,
    ScrollingEnabled = true, ElasticBehavior = nil, AutomaticCanvasSize = nil,
    MouseBehavior = nil, TouchEnabled = false, MouseEnabled = true, KeyboardEnabled = true,
    GamepadEnabled = false, HttpEnabled = true, Health = 100, MaxHealth = 100,
    PlaceholderText = "", ClearTextOnFocus = true, MultiLine = false, TextEditable = true,
    ApplyStrokeMode = nil, Color = nil, FillDirection = nil, SortOrder = nil, Padding = nil,
    PaddingTop = nil, PaddingLeft = nil, PaddingRight = nil, PaddingBottom = nil,
    HorizontalAlignment = nil, VerticalAlignment = nil, Selectable = false,
}

local SIGNAL_NAMES = {
    Activated = 1, MouseButton1Down = 1, MouseButton1Up = 1, MouseEnter = 1, MouseLeave = 1,
    InputBegan = 1, InputEnded = 1, InputChanged = 1, Focused = 1, FocusLost = 1,
    ChildAdded = 1, ChildRemoved = 1, DescendantAdded = 1, Changed = 1, AncestryChanged = 1,
    MouseButton1Click = 1, MouseMoved = 1, TouchTap = 1, SelectionGained = 1,
}

local Instance_mt = {}
Instance_mt.__index = function(self, key)
    -- 1) method
    local m = rawget(Instance_mt, key)
    if type(m) == "function" and key ~= "__index" then return m end
    -- 2) property da dat
    local raw = rawget(self, "_props")
    if raw[key] ~= nil then return raw[key] end
    -- 3) signal (tu tao, cache de on dinh)
    if SIGNAL_NAMES[key] then
        raw["_sig"] = raw["_sig"] or {}
        if not raw["_sig"][key] then raw["_sig"][key] = Signal.new(key) end
        return raw["_sig"][key]
    end
    -- 4) default
    local d = DEFAULTS[key]
    if d ~= nil then return d end
    return nil
end
Instance_mt.__newindex = function(self, key, value)
    if key == "Parent" then
        local old = rawget(self, "_props").Parent
        if old and old._children then
            for i, c in ipairs(old._children) do if c == self then table.remove(old._children, i) break end end
        end
        rawget(self, "_props").Parent = value
        if value and value._children then table.insert(value._children, self) end
        return
    end
    rawget(self, "_props")[key] = value
end
Instance_mt.__eq = function(a, b) return rawequal(a, b) end
Instance_mt.__tostring = function(self) return rawget(self, "_props").Name or "?" end

local function newInstance(cls)
    local self = setmetatable({_props = {}, _children = {}, _attrs = {}, _destroyed = false}, Instance_mt)
    self._props.ClassName = cls
    self._props.Name = cls
    self._props.Position = mkUDim2(0, 0, 0, 0)
    self._props.Size = mkUDim2(0, 0, 0, 0)
    self._props.BackgroundColor3 = mkColor(1, 1, 1)
    self._props.TextColor3 = mkColor(1, 1, 1)
    self._props.CanvasSize = mkUDim2(0, 0, 0, 0)
    self._props.CanvasPosition = mkVec2(0, 0)
    self._props.AbsolutePosition = mkVec2(0, 0)
    self._props.AbsoluteSize = mkVec2(0, 0)
    self._props.CFrame = CFrame.new(0, 0, 0)
    self._props.Size0 = mkVec3(4, 1, 2)
    self._props.Size = mkUDim2(0, 0, 0, 0)
    self._props.Color = mkColor(1, 1, 1)
    MOCK_INSTANCES[#MOCK_INSTANCES + 1] = self
    return self
end

function Instance_mt:Destroy()
    self._destroyed = true
    local p = self._props.Parent
    if p and p._children then
        for i, c in ipairs(p._children) do if c == self then table.remove(p._children, i) break end end
    end
    self._props.Parent = nil
end
function Instance_mt:IsA(cls) return self._props.ClassName == cls end
function Instance_mt:FindFirstChild(name)
    for _, c in ipairs(self._children) do if c._props.Name == name then return c end end
    return nil
end
function Instance_mt:FindFirstChildOfClass(cls)
    for _, c in ipairs(self._children) do if c._props.ClassName == cls then return c end end
    return nil
end
function Instance_mt:FindFirstChildWhichIsA(cls) return self:FindFirstChildOfClass(cls) end
function Instance_mt:GetChildren() return self._children end
function Instance_mt:GetDescendants()
    local out = {}
    local function walk(n) for _, c in ipairs(n._children) do out[#out + 1] = c walk(c) end end
    walk(self)
    return out
end
function Instance_mt:IsDescendantOf(other)
    local p = self._props.Parent
    while p do if p == other then return true end p = p._props.Parent end
    return false
end
function Instance_mt:ClearAllChildren()
    for _, c in ipairs(self._children) do c:Destroy() end
    self._children = {}
end
function Instance_mt:Clone() return newInstance(self._props.ClassName) end
function Instance_mt:GetPropertyChangedSignal(prop)
    self._props["_gps"] = self._props["_gps"] or {}
    if not self._props["_gps"][prop] then self._props["_gps"][prop] = Signal.new("prop:" .. prop) end
    return self._props["_gps"][prop]
end
function Instance_mt:GetChangedSignal() return self:GetPropertyChangedSignal("_any") end
function Instance_mt:SetAttribute(k, v) self._attrs[k] = v end
function Instance_mt:GetAttribute(k) return self._attrs[k] end
function Instance_mt:GetAttributes() return self._attrs end
function Instance_mt:WaitForChild(name) return self:FindFirstChild(name) end
function Instance_mt:GetPropertyChangedSignal2() end
function Instance_mt:GetFullName()
    local parts, cur = {}, self
    while cur do parts[#parts + 1] = tostring(cur._props.Name) cur = cur._props.Parent end
    local out = {}
    for i = #parts, 1, -1 do out[#out + 1] = parts[i] end
    return table.concat(out, ".")
end
function Instance_mt:TweenSize() return true end
function Instance_mt:TweenPosition() return true end
function Instance_mt:GetPropertyChangedSignalSafe() end
function Instance_mt:GetState() return Enum.HumanoidStateType.Running end
function Instance_mt:GetPropertyChangedSignalNoop() end
function Instance_mt:MoveTo() end
function Instance_mt:GetPropertyChangedSignalX() end
function Instance_mt:FindFirstAncestor(n) local p=self._props.Parent while p do if p._props.Name==n then return p end p=p._props.Parent end return nil end
function Instance_mt:GetPropertyChangedSignalY() end

-- Part-specific
function Instance_mt:GetPropertyChangedSignalZ() end
function Instance_mt.Raycast() return nil end

Instance = {
    new = function(cls, parent)
        local i = newInstance(cls)
        if parent then i.Parent = parent end
        return i
    end,
}

-- ============================ SERVICES ============================
local services = {}

local function makeService(name)
    local s = newInstance("Service")
    s.Name = name
    s._props.ClassName = name
    return s
end

local Players = makeService("Players")
local LocalPlayer = newInstance("Player")
LocalPlayer.Name = "LocalPlayer"
LocalPlayer.UserId = 1
local playerGui = newInstance("PlayerGui")
playerGui.Name = "PlayerGui"
playerGui.Parent = LocalPlayer
LocalPlayer._children = {playerGui}

local character = newInstance("Model")
character.Name = "Character"
local hrp = newInstance("Part")
hrp.Name = "HumanoidRootPart"
hrp._props.Position = mkVec3(10, 5, 20)
hrp._props.Size = mkVec3(2, 2, 1)
hrp.Parent = character
local humanoid = newInstance("Humanoid")
humanoid.Name = "Humanoid"
humanoid.Parent = character
character._children = {hrp, humanoid}
LocalPlayer._props.Character = character
Players._props.LocalPlayer = LocalPlayer
Players.LocalPlayer = LocalPlayer

local TweenService = makeService("TweenService")
function TweenService:Create(obj, info, props)
    return {
        Play = function(s)
            -- ap dung ngay de test doc duoc gia tri sau tween
            for k, v in pairs(props or {}) do pcall(function() obj[k] = v end) end
            s._done = true
        end,
        Cancel = function(s) s._cancelled = true end,
    }
end

local RunService = makeService("RunService")
RunService._rs = {}
function RunService:BindToRenderStep(name, prio, fn) self._rs[name] = fn end
function RunService:UnbindFromRenderStep(name) self._rs[name] = nil end
RunService._props.RenderStepped = Signal.new("RenderStepped")
RunService._props.Heartbeat = Signal.new("Heartbeat")

local UserInputService = makeService("UserInputService")
UserInputService._props.InputBegan = Signal.new("InputBegan")
UserInputService._props.InputEnded = Signal.new("InputEnded")
UserInputService._props.InputChanged = Signal.new("InputChanged")
UserInputService._props.WindowFocusReleased = Signal.new("WindowFocusReleased")
UserInputService._props.TextBoxFocused = Signal.new("TextBoxFocused")
UserInputService._props.TextBoxFocusReleased = Signal.new("TextBoxFocusReleased")

local HttpService = makeService("HttpService")
MOCK_HTTP_LOG = {}
function HttpService:JSONEncode(t)
    -- dung json that neu co, khong thi dung ban don gian
    if MOCK_JSON_ENCODE then return MOCK_JSON_ENCODE(t) end
    return "{}"
end
function HttpService:JSONDecode(s)
    if MOCK_JSON_DECODE then return MOCK_JSON_DECODE(s) end
    return {}
end
function HttpService:RequestAsync(opts)
    MOCK_HTTP_LOG[#MOCK_HTTP_LOG + 1] = opts
    if MOCK_HTTP_HANDLER then return MOCK_HTTP_HANDLER(opts) end
    return {Success = false, StatusCode = 0, Body = "", Headers = {}}
end
function HttpService:GenerateGUID(w) return "00000000-0000-0000-0000-000000000000" end

local TeleportService = makeService("TeleportService")
MOCK_TELEPORTS = {}
function TeleportService:TeleportToPlaceInstance(pid, jid, plr)
    MOCK_TELEPORTS[#MOCK_TELEPORTS + 1] = {kind = "instance", placeId = pid, jobId = jid}
end
function TeleportService:Teleport(pid, plr)
    MOCK_TELEPORTS[#MOCK_TELEPORTS + 1] = {kind = "place", placeId = pid}
end

local MarketplaceService = makeService("MarketplaceService")
function MarketplaceService:GetProductInfo(id) return {Name = "MockPlace"} end

local CoreGui = makeService("CoreGui")
local ReplicatedStorage = makeService("ReplicatedStorage")
local Lighting = makeService("Lighting")
local StarterGui = makeService("StarterGui")

services = {
    Players = Players, TweenService = TweenService, RunService = RunService,
    UserInputService = UserInputService, HttpService = HttpService,
    TeleportService = TeleportService, MarketplaceService = MarketplaceService,
    CoreGui = CoreGui, ReplicatedStorage = ReplicatedStorage, Lighting = Lighting,
    StarterGui = StarterGui,
}

local workspace = newInstance("Workspace")
workspace.Name = "Workspace"
workspace._props.CurrentCamera = newInstance("Camera")
workspace.CurrentCamera._props.ViewportSize = mkVec2(1280, 720)
workspace.CurrentCamera._props.CFrame = CFrame.new(0, 10, 30)
workspace.CurrentCamera.ViewportPointToRay = function(_, x, y)
    return {Origin = mkVec3(0, 10, 30), Direction = mkVec3(0, 0, -1)}
end
workspace.CurrentCamera.WorldToViewportPoint = function(_, p) return 640, 360, 10, true end
workspace.CurrentCamera.ScreenPointToRay = workspace.CurrentCamera.ViewportPointToRay
function workspace:Raycast(o, d, p) return nil end
function workspace:GetPartBoundsInRadius(pos, r, op) return {} end
function workspace:FindPartOnRay() return nil end

local game = newInstance("DataModel")
game.Name = "game"
game._props.PlaceId = 123456789
game._props.JobId = "mock-job-id-0001"
game._props.PlaceVersion = 1
function game:GetService(name)
    if not services[name] then services[name] = makeService(name) end
    return services[name]
end
function game:HttpGet(url)
    MOCK_HTTP_LOG[#MOCK_HTTP_LOG + 1] = {Url = url, Method = "GET", _via = "game:HttpGet"}
    -- MOCK_YIELD_HTTP = true: giả lập HttpGet CHẶN thật (ở Roblox nó yield luồng hiện tại).
    -- Cần có để phân biệt được một handler nút gọi ĐỒNG BỘ hay đã được đẩy sang luồng riêng:
    -- nếu còn đồng bộ thì luồng gọi sẽ yield ngay bên trong đây và chưa kịp trả về.
    if MOCK_YIELD_HTTP and coroutine.isyieldable() then coroutine.yield("http", url) end
    if MOCK_HTTPGET_HANDLER then return MOCK_HTTPGET_HANDLER(url) end
    return ""
end
game.HttpGetAsync = game.HttpGet
function game:GetObjects() return {} end

-- ============================ executor globals ============================
gethui = function() return CoreGui end
getgenv = function() return _G end
identifyexecutor = function() return "MockExecutor", "1.0" end
setclipboard = function(t) MOCK_CLIPBOARD = tostring(t) return true end
toclipboard = setclipboard

-- writefile/readfile CO Y KHONG (de test nhanh "memory" mode).
-- test nao can disk se bat MOCK_DISK = true.
MOCK_DISK = false
MOCK_FILES = {}
local function diskReady() return MOCK_DISK == true end
writefile = function(p, c) if not diskReady() then error("writefile not available") end MOCK_FILES[tostring(p)] = tostring(c) return true end
readfile  = function(p) if not diskReady() then error("readfile not available") end
    local v = MOCK_FILES[tostring(p)] if v == nil then error("File not found") end return v end
isfile    = function(p) if not diskReady() then return false end return MOCK_FILES[tostring(p)] ~= nil end
delfile   = function(p) MOCK_FILES[tostring(p)] = nil return true end
listfiles = function() return {} end
makefolder = function() return true end
isfolder  = function() return false end
appendfile = function(p, c) MOCK_FILES[tostring(p)] = (MOCK_FILES[tostring(p)] or "") .. tostring(c) return true end
getcustomasset = function(_, p) return tostring(p) end

-- ============================ task / time ============================
MOCK_CLOCK = 0
local TASK_QUEUE = {}
local THREADS = {}
local nextThreadId = 0

task = {}
function task.spawn(fn, ...)
    nextThreadId = nextThreadId + 1
    local id = nextThreadId
    local co = coroutine.create(fn)
    THREADS[id] = co
    local ok, err = coroutine.resume(co, ...)
    if not ok then MOCK_ERRORS[#MOCK_ERRORS + 1] = "task.spawn: " .. tostring(err) end
    if coroutine.status(co) == "dead" then THREADS[id] = nil end
    return id
end
function task.defer(fn, ...) return task.spawn(fn, ...) end
function task.delay(secs, fn, ...)
    local args = table.pack(...)          -- phai goi vao bang: closure ben trong khong phai vararg
    return task.spawn(function()
        coroutine.yield("delay", secs)
        fn(table.unpack(args, 1, args.n))
    end)
end
function task.wait(secs)
    coroutine.yield("wait", secs or 0)
    return secs or 0
end
function task.cancel(id)
    if THREADS[id] then THREADS[id] = nil end
end
function task.synchronize(fn) return fn() end
function task.desynchronize(fn) return fn() end

-- chay tat ca coroutine dang treo (khong doi thoi gian that)
function MOCK_DRAIN(maxSteps)
    local steps = 0
    local progressed = true
    while progressed and steps < (maxSteps or 5000) do
        progressed = false
        for id, co in pairs(THREADS) do
            if coroutine.status(co) == "suspended" then
                local ok, err = coroutine.resume(co)
                if not ok then MOCK_ERRORS[#MOCK_ERRORS + 1] = "drain: " .. tostring(err) THREADS[id] = nil
                elseif coroutine.status(co) == "dead" then THREADS[id] = nil end
                progressed = true
                steps = steps + 1
            end
        end
    end
    return steps
end

tick = function() MOCK_CLOCK = MOCK_CLOCK + 0.001 return MOCK_CLOCK end
os.clock = function() return MOCK_CLOCK end
wait = function(s) return task.wait(s) end
spawn = function(fn) return task.spawn(fn) end
delay = function(s, fn) return task.delay(s, fn) end
warn = function(...) end   -- chan de test output sach; test can thi doc MOCK_ERRORS

-- ============================ JSON that (de Store.save/load chay duoc) ============================
local function encode(v, depth)
    depth = depth or 0
    if depth > 32 then return "null" end
    local t = type(v)
    if t == "nil" then return "null" end
    if t == "boolean" then return v and "true" or "false" end
    if t == "number" then
        if v ~= v or v == math.huge or v == -math.huge then return "null" end
        return tostring(v)
    end
    if t == "string" then
        return '"' .. v:gsub('[%z\1-\31\\"]', function(c)
            local m = {['"'] = '\\"', ["\\"] = "\\\\", ["\n"] = "\\n", ["\r"] = "\\r", ["\t"] = "\\t"}
            return m[c] or string.format("\\u%04x", string.byte(c))
        end) .. '"'
    end
    if t == "table" then
        local isArr, n = true, 0
        for k in pairs(v) do n = n + 1 if type(k) ~= "number" then isArr = false end end
        if isArr and n == #v then
            local parts = {}
            for i = 1, #v do parts[i] = encode(v[i], depth + 1) end
            return "[" .. table.concat(parts, ",") .. "]"
        end
        local parts = {}
        for k, val in pairs(v) do
            parts[#parts + 1] = encode(tostring(k), depth + 1) .. ":" .. encode(val, depth + 1)
        end
        return "{" .. table.concat(parts, ",") .. "}"
    end
    return "null"
end

local function decode(str)
    local pos = 1
    local function ws() while pos <= #str and str:sub(pos, pos):match("%s") do pos = pos + 1 end end
    local parseValue
    local function parseString()
        pos = pos + 1
        local buf = {}
        while pos <= #str do
            local c = str:sub(pos, pos)
            if c == '"' then pos = pos + 1 return table.concat(buf) end
            if c == "\\" then
                pos = pos + 1
                local e = str:sub(pos, pos)
                if e == "n" then buf[#buf + 1] = "\n"
                elseif e == "r" then buf[#buf + 1] = "\r"
                elseif e == "t" then buf[#buf + 1] = "\t"
                elseif e == "u" then
                    local hex = str:sub(pos + 1, pos + 4)
                    buf[#buf + 1] = utf8 and utf8.char(tonumber(hex, 16)) or "?"
                    pos = pos + 4
                else buf[#buf + 1] = e end
                pos = pos + 1
            else
                buf[#buf + 1] = c
                pos = pos + 1
            end
        end
        error("chuoi JSON khong dong")
    end
    local function parseNumber()
        local s = pos
        while pos <= #str and str:sub(pos, pos):match("[%d%.%-eE%+]") do pos = pos + 1 end
        return tonumber(str:sub(s, pos - 1))
    end
    parseValue = function()
        ws()
        local c = str:sub(pos, pos)
        if c == "{" then
            pos = pos + 1
            local o = {}
            ws()
            if str:sub(pos, pos) == "}" then pos = pos + 1 return o end
            while true do
                ws()
                local k = parseString()
                ws()
                pos = pos + 1   -- ':'
                o[k] = parseValue()
                ws()
                local d = str:sub(pos, pos)
                pos = pos + 1
                if d == "}" then return o end
            end
        elseif c == "[" then
            pos = pos + 1
            local a = {}
            ws()
            if str:sub(pos, pos) == "]" then pos = pos + 1 return a end
            while true do
                a[#a + 1] = parseValue()
                ws()
                local d = str:sub(pos, pos)
                pos = pos + 1
                if d == "]" then return a end
            end
        elseif c == '"' then return parseString()
        elseif c == "t" then pos = pos + 4 return true
        elseif c == "f" then pos = pos + 5 return false
        elseif c == "n" then pos = pos + 4 return nil
        else return parseNumber() end
    end
    return parseValue()
end

MOCK_JSON_ENCODE = encode
MOCK_JSON_DECODE = decode
HttpService.JSONEncode = function(_, t) return encode(t) end
HttpService.JSONDecode = function(_, s) return decode(s) end

-- ============================ bien toan cuc khac ============================
_G = _G
-- ============================ xuat ra global cho script dung ============================
-- script.js goi thang `game:GetService(...)` va `workspace.CurrentCamera` nen 2 bien nay
-- PHAI la global. Cac service con lai lay qua game:GetService() nen khong can global.
_G.game = game
_G.workspace = workspace
_G.Instance = Instance
_G.Enum = Enum
_G.Color3 = Color3
_G.UDim = UDim
_G.UDim2 = UDim2
_G.Vector2 = Vector2
_G.Vector3 = Vector3
_G.CFrame = CFrame
_G.TweenInfo = TweenInfo
_G.ColorSequence = ColorSequence
_G.ColorSequenceKeypoint = ColorSequenceKeypoint
_G.NumberSequence = NumberSequence
_G.NumberSequenceKeypoint = NumberSequenceKeypoint
_G.RaycastParams = RaycastParams
_G.OverlapParams = OverlapParams
_G.Font = Font
_G.task = task
_G.tick = tick
_G.loadstring = loadstring

MOCK = {
    game = game, workspace = workspace, Players = Players, LocalPlayer = LocalPlayer,
    playerGui = playerGui, CoreGui = CoreGui, HttpService = HttpService,
    RunService = RunService, UserInputService = UserInputService,
    TeleportService = TeleportService, TweenService = TweenService,
    newInstance = newInstance, Signal = Signal,
}

-- dung cho test tim instance theo ten
function MOCK_FIND(root, name)
    if root._props.Name == name then return root end
    for _, c in ipairs(root._children) do
        local r = MOCK_FIND(c, name)
        if r then return r end
    end
    return nil
end
function MOCK_COUNT_CLASS(root, cls)
    local n = 0
    for _, d in ipairs(root:GetDescendants()) do if d._props.ClassName == cls then n = n + 1 end end
    return n
end

return MOCK
