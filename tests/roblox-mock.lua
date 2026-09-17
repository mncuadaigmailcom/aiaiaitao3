--[[
    tests/roblox-mock.lua — MÔI TRƯỜNG GIẢ LẬP ROBLOX + EXECUTOR (chạy trên Lua 5.4 / wasmoon)

    Mục đích: nạp và CHẠY THẬT `script.js` (Banana Cat Hub) ngay trong Node, để test
    hành vi thay vì chỉ soi cú pháp. Bộ mock này KHÔNG phải Roblox thật: nó chỉ đủ
    mặt phẳng API mà hub dùng tới (Instance, events, task, service, JSON...).

    Cách dùng từ tests/tests.lua:
        local Mock = require("roblox-mock")     -- (đã chạy sẵn khi nạp file này)
        Mock.player.Character = Mock.makeCharacter()
        Mock.click(nút)                          -- bấm 1 TextButton
        Mock.advance(0.5)                        -- chạy scheduler + render step
        Mock.get("S")                            -- đọc biến local của hub (do run.js export)
--]]

-- ============================================================================
-- 1. KIỂU DỮ LIỆU CƠ BẢN
-- ============================================================================
local function mkClass(name, fields, methods, metamethods)
    local cls = { __className = name }
    cls.new = function(...)
        local o = {}
        for k, v in pairs(fields or {}) do o[k] = v end
        return setmetatable(o, { __index = methods, __tostring = function(s)
            return name .. "(" .. table.concat((function()
                local t = {}
                for i, k in ipairs(fields and fields.__order or {}) do t[#t + 1] = tostring(s[k]) end
                return t
            end)(), ", ") .. ")"
        end, __name = name, unpack(metamethods or {}, 1, 20) })
    end
    return cls
end

-- ---------- Vector3 ----------
local function v3(x, y, z)
    return setmetatable({ X = x or 0, Y = y or 0, Z = z or 0 }, {
        __name = "Vector3",
        __add = function(a, b) return v3(a.X + b.X, a.Y + b.Y, a.Z + b.Z) end,
        __sub = function(a, b) return v3(a.X - b.X, a.Y - b.Y, a.Z - b.Z) end,
        __mul = function(a, b)
            if type(b) == "number" then return v3(a.X * b, a.Y * b, a.Z * b) end
            if type(a) == "number" then return v3(a * b.X, a * b.Y, a * b.Z) end
            return v3(a.X * b.X, a.Y * b.Y, a.Z * b.Z)
        end,
        __div = function(a, b)
            if type(b) == "number" then return v3(a.X / b, a.Y / b, a.Z / b) end
            return v3(a.X / b.X, a.Y / b.Y, a.Z / b.Z)
        end,
        __unm = function(a) return v3(-a.X, -a.Y, -a.Z) end,
        __eq = function(a, b) return a.X == b.X and a.Y == b.Y and a.Z == b.Z end,
        __tostring = function(s) return string.format("Vector3(%g, %g, %g)", s.X, s.Y, s.Z) end,
        __index = function(t, k)
            if k == "Magnitude" then return math.sqrt(t.X ^ 2 + t.Y ^ 2 + t.Z ^ 2) end
            if k == "Unit" then
                local m = math.sqrt(t.X ^ 2 + t.Y ^ 2 + t.Z ^ 2)
                if m == 0 then return v3(0, 0, 0) end
                return v3(t.X / m, t.Y / m, t.Z / m)
            end
            if k == "zero" then return v3(0, 0, 0) end
            return nil
        end,
    })
end
Vector3 = {
    new = function(x, y, z) return v3(x, y, z) end,
    zero = v3(0, 0, 0), one = v3(1, 1, 1),
    xAxis = v3(1, 0, 0), yAxis = v3(0, 1, 0), zAxis = v3(0, 0, 1),
    fromAxis = function() return v3(0, 1, 0) end,
    fromNormalId = function() return v3(0, 1, 0) end,
}

-- ---------- Vector2 ----------
local function v2(x, y)
    return setmetatable({ X = x or 0, Y = y or 0 }, {
        __name = "Vector2",
        __add = function(a, b) return v2(a.X + b.X, a.Y + b.Y) end,
        __sub = function(a, b) return v2(a.X - b.X, a.Y - b.Y) end,
        __mul = function(a, b) return v2(a.X * b, a.Y * b) end,
        __div = function(a, b) return v2(a.X / b, a.Y / b) end,
        __unm = function(a) return v2(-a.X, -a.Y) end,
        __eq = function(a, b) return a.X == b.X and a.Y == b.Y end,
        __tostring = function(s) return string.format("Vector2(%g, %g)", s.X, s.Y) end,
        __index = function(t, k)
            if k == "Magnitude" then return math.sqrt(t.X ^ 2 + t.Y ^ 2) end
            if k == "Unit" then
                local m = math.sqrt(t.X ^ 2 + t.Y ^ 2)
                if m == 0 then return v2(0, 0) end
                return v2(t.X / m, t.Y / m)
            end
            return nil
        end,
    })
end
Vector2 = { new = function(x, y) return v2(x, y) end, zero = v2(0, 0), one = v2(1, 1) }

-- ---------- UDim / UDim2 ----------
UDim = setmetatable({ new = function(s, o) return setmetatable({ Scale = s or 0, Offset = o or 0 },
    { __name = "UDim", __tostring = function(x) return string.format("{%g, %g}", x.Scale, x.Offset) end }) end },
    { __call = function(_, s, o) return UDim.new(s, o) end })
UDim2 = setmetatable({
    new = function(xs, xo, ys, yo)
        return setmetatable({ X = { Scale = xs or 0, Offset = xo or 0 }, Y = { Scale = ys or 0, Offset = yo or 0 } },
            { __name = "UDim2", __tostring = function(u)
                return string.format("{%g, %g}, {%g, %g}", u.X.Scale, u.X.Offset, u.Y.Scale, u.Y.Offset) end })
    end,
    fromOffset = function(x, y) return UDim2.new(0, x, 0, y) end,
    fromScale = function(x, y) return UDim2.new(x, 0, y, 0) end,
}, { __call = function(_, a, b, c, d) return UDim2.new(a, b, c, d) end })

-- ---------- Color3 ----------
local function c3(r, g, b)   -- r,g,b: 0..1 (đúng chuẩn Roblox: .R/.G/.B là 0..1)
    return setmetatable({ R = r, G = g, B = b }, {
        __name = "Color3",
        __eq = function(a, o) return a.R == o.R and a.G == o.G and a.B == o.B end,
        __tostring = function(s) return string.format("Color3(%g,%g,%g)", s.R, s.G, s.B) end,
        __index = function(t, k)
            if k == "r" or k == "g" or k == "b" then return t[k:upper()] end
            if k == "Lerp" then return function(a, o, al)
                return c3(a.R + (o.R - a.R) * al, a.G + (o.G - a.G) * al, a.B + (o.B - a.B) * al) end
            end
            return nil
        end,
    })
end
Color3 = {
    new = function(r, g, b) return c3(r or 0, g or 0, b or 0) end,
    fromRGB = function(r, g, b) return c3((r or 0) / 255, (g or 0) / 255, (b or 0) / 255) end,
    fromHSV = function() return c3(1, 1, 1) end,
    fromHex = function() return c3(1, 1, 1) end,
    white = c3(1, 1, 1), black = c3(0, 0, 0),
}

-- ---------- CFrame ----------
local function cf(x, y, z, look)
    if type(x) == "table" then x, y, z = x.X or 0, x.Y or 0, x.Z or 0 end
    local pos = v3(x or 0, y or 0, z or 0)
    local lookVec = look or v3(0, 0, -1)
    return setmetatable({ Position = pos, LookVector = lookVec, RightVector = v3(1, 0, 0), UpVector = v3(0, 1, 0) }, {
        __name = "CFrame",
        __mul = function(a, b)
            if type(b) == "table" and b.__name == "CFrame" then
                return cf(a.Position + b.Position)
            elseif type(b) == "table" and b.__name == "Vector3" then
                return a.Position + b
            end
            return a
        end,
        __add = function(a, b) return cf(a.Position + (b.X and b or v3(0, 0, 0))) end,
        __sub = function(a, b) return cf(a.Position - (b.X and b or v3(0, 0, 0))) end,
        __eq = function(a, b) return a.Position == b.Position end,
        __tostring = function(s) return "CFrame(" .. tostring(s.Position) .. ")" end,
        __index = function(t, k)
            local m = {
                VectorToWorldSpace = function(_, v) return v end,
                VectorToObjectSpace = function(_, v) return v end,
                PointToWorldSpace = function(_, v) return t.Position + v end,
                PointToObjectSpace = function(_, v) return v - t.Position end,
                ToWorldSpace = function(_, o) return o end,
                ToObjectSpace = function(_, o) return o end,
                Inverse = function(_) return cf(-t.Position.X, -t.Position.Y, -t.Position.Z, t.LookVector) end,
                components = function(_) return t.Position.X, t.Position.Y, t.Position.Z end,
                Lerp = function(_, o, a) return cf(t.Position + (o.Position - t.Position) * a) end,
                ToEulerAnglesXYZ = function(_) return 0, 0, 0 end,
                GetComponents = function(_) return t.Position.X, t.Position.Y, t.Position.Z, 1, 0, 0, 0, 1, 0, 0, 0, 1 end,
                ToOrientation = function(_) return 0, 0, 0 end,
            }
            return m[k]
        end,
    })
end
CFrame = {
    new = function(x, y, z) return cf(x, y, z) end,
    lookAt = function(from, to)
        local d = to - from
        local m = d.Magnitude
        local look = (m == 0) and v3(0, 0, -1) or v3(d.X / m, d.Y / m, d.Z / m)
        return cf(from, look)
    end,
    Angles = function() return cf(0, 0, 0) end,
    fromEulerAnglesXYZ = function() return cf(0, 0, 0) end,
    identity = cf(0, 0, 0),
}

-- ---------- các kiểu còn lại (rỗng nhưng tồn tại để script không lỗi) ----------
TweenInfo = { new = function(t, s, d, r, l, b)
    return setmetatable({ Time = t or 1, EasingStyle = s, EasingDirection = d, RepeatCount = r or 0,
        Reverses = l or false, DelayTime = b or 0 }, { __name = "TweenInfo" }) end }
BrickColor = setmetatable({ new = function() return setmetatable({ Name = "White", Color = c3(1, 1, 1) }, { __name = "BrickColor" }) end,
    White = setmetatable({ Name = "White", Color = c3(1, 1, 1) }, { __name = "BrickColor" }) },
    { __call = function(_, n) return BrickColor.new(n) end })
NumberRange = { new = function(a, b) return { Min = a or 0, Max = b or 0 } end }
NumberSequence = { new = function() return { Keypoints = {} } end }
ColorSequence = { new = function() return { Keypoints = {} } end }
Rect = { new = function() return {} end }
Faces = { new = function() return {} end }
Axes = { new = function() return {} end }
PhysicalProperties = { new = function() return {} end }
RaycastParams = { new = function() return { FilterType = 0, FilterDescendantsInstances = {}, IgnoreWater = false } end }
OverlapParams = { new = function() return { FilterDescendantsInstances = {} } end }
Region3 = { new = function() return {} end }
Font = { new = function(f, w, s) return setmetatable({ Family = f, Weight = w, Style = s }, { __name = "Font" }) end,
    fromEnum = function() return Font.new("rbxasset://fonts/families/GothamSSo.json") end }
Ray = { new = function() return {} end }
DateTime = { now = function() return { UnixTimestamp = os.time() } end }
Random = { new = function() return { NextNumber = function() return math.random() end } end }
CatalogSearchParams, PathWaypoint, Vector3int16, Vector2int16 = nil, nil, nil, nil

-- ============================================================================
-- 2. Enum (tự sinh, có CACHE để so sánh == vẫn đúng danh tính)
-- ============================================================================
local enumCache = {}
Enum = setmetatable({}, {
    __index = function(t, enumName)
        if enumCache[enumName] then return enumCache[enumName] end
        local holder = setmetatable({ __enum = enumName }, {
            __index = function(h, item)
                h[item] = setmetatable({ Name = tostring(item), Value = 0, EnumType = h },
                    { __tostring = function() return "Enum." .. enumName .. "." .. tostring(item) end })
                return h[item]
            end,
        })
        -- Enum.RenderPriority.Camera.Value
        if enumName == "RenderPriority" then
            holder.Camera = setmetatable({ Name = "Camera", Value = 200 }, { __tostring = function() return "Enum.RenderPriority.Camera" end })
        end
        enumCache[enumName] = holder
        return holder
    end,
})

-- ============================================================================
-- 3. INSTANCE (cây object, property tự do, event, method)
-- ============================================================================
local Mock = {}
Mock.unknownKeys = {}      -- ghi lại mọi property/event bị đọc mà mock không biết (để soi bug)
Mock.created = {}          -- mọi Instance từng được tạo (theo class)
Mock.instanceCount = 0

local EVENT_NAMES = {
    Activated = 1, MouseEnter = 1, MouseLeave = 1, MouseButton1Click = 1, MouseButton1Down = 1,
    MouseButton1Up = 1, MouseButton2Click = 1, InputBegan = 1, InputEnded = 1, InputChanged = 1,
    FocusLost = 1, Focused = 1, FocusedLost = 1, Changed = 1, AncestryChanged = 1, ChildAdded = 1,
    ChildRemoved = 1, DescendantAdded = 1, DescendantRemoving = 1, Idled = 1, CharacterAdded = 1,
    CharacterRemoving = 1, PlayerAdded = 1, PlayerRemoving = 1, RenderStepped = 1, Stepped = 1,
    Heartbeat = 1, JumpRequest = 1, TouchStarted = 1, TouchEnded = 1, TouchMoved = 1,
    TouchTap = 1, Touched = 1, SelectionGained = 1, SelectionLost = 1, Died = 1,
    HealthChanged = 1, StateChanged = 1, Running = 1, FreeFalling = 1, Jumping = 1, Seated = 1,
    Completed = 1, PlaybackCompleted = 1, MouseWheelForward = 1, MouseWheelBackward = 1,
    WindowFocusReleased = 1, TextChanged = 1, Moved = 1, Resized = 1,
}

local instMT = {}
local function isInstance(o) return type(o) == "table" and o.__isInstance == true end
Mock.isInstance = isInstance

local function newSignal(inst, name)
    local sig = { __isSignal = true, _list = {}, _name = name, _inst = inst }
    function sig:Connect(fn)
        local conn = { Connected = true, _fn = fn, _sig = sig }
        function conn:Disconnect()
            if not self.Connected then return end
            self.Connected = false
            for i, c in ipairs(sig._list) do if c == self then table.remove(sig._list, i) break end end
        end
        table.insert(sig._list, conn)
        return conn
    end
    function sig:Fire(...)
        for _, c in ipairs({ table.unpack(sig._list) }) do
            if c.Connected then
                local ok, err = pcall(c._fn, ...)
                if not ok then
                    Mock.errors[#Mock.errors + 1] = string.format("event %s.%s: %s", tostring(inst.Name), name, tostring(err))
                end
            end
        end
    end
    function sig:Wait() end
    function sig:Once(fn) return sig:Connect(fn) end
    return sig
end

local function makeInstance(className)
    local inst = {
        __isInstance = true,
        ClassName = className,
        Name = className,
        Parent = nil,
        _children = {},
        _signals = {},
        _attrs = {},
        _destroyed = false,
    }
    -- Roblox luôn có sẵn mấy thuộc tính này (hub đọc khi đo kích thước thật của GUI)
    if className == "Frame" or className == "TextButton" or className == "TextLabel"
        or className == "TextBox" or className == "ImageButton" or className == "ImageLabel"
        or className == "ScrollingFrame" or className == "ScreenGui" or className == "BillboardGui" then
        inst.AbsolutePosition = v2(0, 0)
        inst.AbsoluteSize = v2(200, 50)
    end
    Mock.instanceCount = Mock.instanceCount + 1
    Mock.created[className] = (Mock.created[className] or 0) + 1
    return setmetatable(inst, instMT)
end

instMT.__tostring = function(s) return s.Name end
instMT.__index = function(t, k)
    -- 0) Position/CFrame là CÙNG MỘT thứ (nguồn duy nhất: _cf) — xem __newindex.
    if k == "CFrame" then
        local c = rawget(t, "_cf")
        if c == nil then c = cf(0, 0, 0); rawset(t, "_cf", c) end   -- Roblox: luôn có giá trị
        return c
    end
    if k == "Position" then
        local c = rawget(t, "_cf")
        if c ~= nil then return c.Position end      -- BasePart: lấy từ CFrame
        return nil                                   -- GUI object: Position là UDim2 (đã rawset)
    end
    -- 1) method chung
    local m = instMT.__methods[k]
    if m then return m end
    -- 2) event
    if EVENT_NAMES[k] then
        if not t._signals[k] then t._signals[k] = newSignal(t, k) end
        return t._signals[k]
    end
    -- 3) property chưa từng gán -> ghi nhận (giúp soi typo) rồi trả nil
    if type(k) == "string" and k:sub(1, 1) ~= "_" then
        Mock.unknownKeys[tostring(t.ClassName) .. "." .. tostring(k)] =
            (Mock.unknownKeys[tostring(t.ClassName) .. "." .. tostring(k)] or 0) + 1
    end
    return nil
end
instMT.__newindex = function(t, k, v)
    -- Roblox thật: với BasePart, Position và CFrame.Position LÀ MỘT (đổi cái này cái kia
    -- đổi theo). LƯU Ý QUAN TRỌNG: Lua chỉ gọi __newindex khi khóa CHƯA có trong bảng,
    -- nên không thể "ghi cả 2 trường" ở đây — lần gán thứ hai sẽ ghi thẳng mà không nối.
    -- Cách đúng: lưu CFrame làm NGUỒN DUY NHẤT (_cf) và tính Position từ nó khi đọc.
    -- (GUI object cũng có thuộc tính Position nhưng là UDim2 -> phân biệt bằng Vector3: có Z.)
    -- Dùng rawget: nếu v là một Instance thì đọc v.X sẽ kích hoạt __index và ghi log rác.
    local isVec3 = (type(v) == "table" and rawget(v, "X") ~= nil
        and rawget(v, "Y") ~= nil and rawget(v, "Z") ~= nil)
    if k == "CFrame" then
        rawset(t, "_cf", v)
        local chg = t._signals["Changed"]
        if chg then pcall(function() chg:Fire(k) end) end
        return
    end
    if k == "Position" and isVec3 then
        local c = rawget(t, "_cf")
        rawset(t, "_cf", cf(v, c and c.LookVector or nil))
        local chg = t._signals["Changed"]
        if chg then pcall(function() chg:Fire(k) end) end
        return
    end
    if k == "Parent" then
        local old = rawget(t, "Parent")
        if isInstance(old) then
            for i, c in ipairs(old._children) do if c == t then table.remove(old._children, i) break end end
            local rem = old._signals["ChildRemoved"]
            if rem then pcall(function() rem:Fire(t) end) end
        end
        rawset(t, "Parent", v)
        if isInstance(v) then
            table.insert(v._children, t)
            local add = v._signals["ChildAdded"]
            if add then pcall(function() add:Fire(t) end) end
        end
        local anc = t._signals["AncestryChanged"]
        if anc then pcall(function() anc:Fire(t, v) end) end
        return
    end
    rawset(t, k, v)
    local chg = t._signals["Changed"]
    if chg then pcall(function() chg:Fire(k) end) end
end

instMT.__methods = {
    Destroy = function(self)
        if self._destroyed then return end
        self._destroyed = true
        for _, c in ipairs({ table.unpack(self._children) }) do pcall(function() c:Destroy() end) end
        self._children = {}
        -- Roblox thật: Destroy() tự ngắt mọi connection của object đó (Connected -> false)
        for _, s in pairs(self._signals) do
            for _, c in ipairs(s._list) do c.Connected = false end
            s._list = {}
        end
        local p = rawget(self, "Parent")
        if isInstance(p) then
            for i, c in ipairs(p._children) do if c == self then table.remove(p._children, i) break end end
        end
        rawset(self, "Parent", nil)
    end,
    Clone = function(self)
        local c = makeInstance(self.ClassName)
        for k, v in pairs(self) do
            if k ~= "Parent" and k:sub(1, 1) ~= "_" then c[k] = v end
        end
        return c
    end,
    GetChildren = function(self) return { table.unpack(self._children) } end,
    GetDescendants = function(self)
        local out = {}
        local function rec(n)
            for _, c in ipairs(n._children) do out[#out + 1] = c; rec(c) end
        end
        rec(self)
        return out
    end,
    ClearAllChildren = function(self)
        for _, c in ipairs({ table.unpack(self._children) }) do pcall(function() c:Destroy() end) end
        self._children = {}
    end,
    FindFirstChild = function(self, name, recursive)
        for _, c in ipairs(self._children) do if c.Name == name then return c end end
        if recursive then
            for _, c in ipairs(self._children) do
                local f = c:FindFirstChild(name, true); if f then return f end
            end
        end
        return nil
    end,
    FindFirstChildOfClass = function(self, cls)
        for _, c in ipairs(self._children) do if c.ClassName == cls then return c end end
        return nil
    end,
    FindFirstAncestor = function(self, name)
        local p = rawget(self, "Parent")
        while isInstance(p) do if p.Name == name then return p end p = rawget(p, "Parent") end
        return nil
    end,
    FindFirstAncestorOfClass = function(self, cls)
        local p = rawget(self, "Parent")
        while isInstance(p) do if p.ClassName == cls then return p end p = rawget(p, "Parent") end
        return nil
    end,
    WaitForChild = function(self, name, timeout)
        local f = self:FindFirstChild(name)
        if f then return f end
        return nil      -- test không bao giờ đợi thật
    end,
    IsA = function(self, cls)
        if self.ClassName == cls then return true end
        local SUPER = { TextButton = "GuiButton", ImageButton = "GuiButton", TextBox = "GuiObject",
            TextLabel = "GuiObject", Frame = "GuiObject", ScrollingFrame = "GuiObject",
            Part = "BasePart", MeshPart = "BasePart", WedgePart = "BasePart", UnionOperation = "BasePart",
            Model = "Instance", Folder = "Instance", ScreenGui = "LayerCollector", BillboardGui = "LayerCollector",
            UICorner = "UIComponent", UIStroke = "UIComponent", UIGradient = "UIComponent",
            UIPadding = "UIComponent", UIListLayout = "UILayout", Highlight = "Instance",
            Camera = "Instance", Humanoid = "Instance", BodyVelocity = "Instance", BodyGyro = "Instance",
            Tool = "BackpackItem", Accessory = "Accoutrement", LocalScript = "LuaSourceContainer",
            Script = "LuaSourceContainer", ModuleScript = "LuaSourceContainer", RemoteEvent = "Instance" }
        local c = self.ClassName
        while SUPER[c] do if SUPER[c] == cls then return true end c = SUPER[c] end
        return false
    end,
    IsDescendantOf = function(self, anc)
        local p = rawget(self, "Parent")
        while isInstance(p) do if p == anc then return true end p = rawget(p, "Parent") end
        return false
    end,
    GetFullName = function(self)
        local parts, p = {}, self
        while isInstance(p) do table.insert(parts, 1, p.Name); p = rawget(p, "Parent") end
        return table.concat(parts, ".")
    end,
    SetAttribute = function(self, k, v) self._attrs[k] = v end,
    GetAttribute = function(self, k) return self._attrs[k] end,
    GetAttributes = function(self) return self._attrs end,
    GetPropertyChangedSignal = function(self, prop)
        if not self._signals["Changed_" .. tostring(prop)] then
            self._signals["Changed_" .. tostring(prop)] = newSignal(self, prop)
        end
        return self._signals["Changed_" .. tostring(prop)]
    end,
    AddTag = function() end, HasTag = function() return false end, RemoveTag = function() end,
    GetTags = function() return {} end,
    GetPivot = function(self) return cf(0, 0, 0) end,
    PivotTo = function(self, c) self.PrimaryPart = self.PrimaryPart end,
    BreakJoints = function() end,
    Remove = function(self) self:Destroy() end,
    SetPrimaryPartCFrame = function() end,
    GetMass = function() return 1 end,
    TakeDamage = function() end,
    MoveTo = function(self, pos) if self.PrimaryPart then self.PrimaryPart.Position = pos end end,
    Kick = function(self) Mock.kicked = (Mock.kicked or 0) + 1 end,
    IsFriendsWith = function(self, id) return Mock.friends[id] == true end,
    DistanceFromCharacter = function() return 0 end,
    GetMouse = function() return { Hit = cf(0, 0, 0), Target = nil, X = 0, Y = 0,
        Button1Down = function() end, Move = function() end } end,
    GetPlayers = function(self) return self._players or {} end,
    GetPlayerByUserId = function(self, id)
        for _, p in ipairs(self._players or {}) do if p.UserId == id then return p end end
        return nil
    end,
    GetService = function(self, n) return Mock.services[n] end,
    FindService = function(self, n) return Mock.services[n] end,
    HttpGet = function(self, url) return Mock.httpGet(url) end,
    HttpGetAsync = function(self, url) return Mock.httpGet(url) end,
    HttpPost = function() return "" end,
    JSONEncode = function(_, v) return Mock.jsonEncode(v) end,
    JSONDecode = function(_, s) return Mock.jsonDecode(s) end,
    GenerateGUID = function(_) return string.format("GUID-%d", math.random(1, 1e9)) end,
    CaptureController = function() end, ClickButton1 = function() end, ClickButton2 = function() end,
    -- UserInputService
    GetFocusedTextBox = function() return nil end,
    GetMouseLocation = function() return v2(0, 0) end,
    GetKeysPressed = function() return {} end,
    GetConnectedGamepads = function() return {} end,
    -- MarketplaceService (tab Hỗ Trợ đọc tên game)
    GetProductInfo = function(_, id) return { Name = "MockPlace", Description = "" } end,
    Teleport = function(_, pid, pl) Mock.teleports[#Mock.teleports + 1] = { place = pid, job = nil } end,
    TeleportToPlaceInstance = function(_, pid, jid, pl)
        Mock.teleports[#Mock.teleports + 1] = { place = pid, job = jid } end,
    BindToRenderStep = function(_, name, prio, fn) Mock.renderSteps[name] = fn end,
    UnbindFromRenderStep = function(_, name) Mock.renderSteps[name] = nil end,
    IsClient = function() return true end, IsServer = function() return false end,
    IsStudio = function() return false end,
    IsKeyDown = function(_, key) return Mock.keysDown[tostring(key)] == true end,
    SetAttribute_ = nil,
}
Instance = { new = function(cls, parent)
    local i = makeInstance(cls)
    if parent then i.Parent = parent end
    return i
end }

-- ============================================================================
-- 4. JSON (dùng cho Store.save / Store.load)
-- ============================================================================
function Mock.jsonEncode(v)
    local seen = {}
    local function esc(s)
        return s:gsub('[%z\1-\31\\"]', function(c)
            if c == '\\' then return '\\\\' end
            if c == '"' then return '\\"' end
            if c == '\n' then return '\\n' end
            if c == '\r' then return '\\r' end
            if c == '\t' then return '\\t' end
            return string.format('\\u%04X', string.byte(c))
        end)
    end
    local function ser(x, ind)
        local t = type(x)
        if x == nil then return "null" end
        if t == "boolean" then return tostring(x) end
        if t == "number" then
            if x ~= x or x == math.huge or x == -math.huge then return "null" end
            if x == math.floor(x) then return string.format("%d", x) end
            return string.format("%.14g", x)
        end
        if t == "string" then return '"' .. esc(x) .. '"' end
        if t ~= "table" then return '"' .. esc(tostring(x)) .. '"' end
        if seen[x] then return "null" end
        seen[x] = true
        local isArr = (#x > 0)
        if not isArr then
            local n = 0
            for _ in pairs(x) do n = n + 1 end
            if n == 0 then return "{}" end
        end
        local parts = {}
        if isArr then
            for i, e in ipairs(x) do parts[#parts + 1] = ser(e, ind) end
        else
            for k, e in pairs(x) do
                if type(k) == "string" then parts[#parts + 1] = '"' .. esc(k) .. '":' .. ser(e, ind) end
            end
        end
        seen[x] = nil
        if #parts == 0 then return (isArr and "[]" or "{}") end
        return (isArr and "[" or "{") .. table.concat(parts, ",") .. (isArr and "]" or "}")
    end
    return ser(v, 0)
end

function Mock.jsonDecode(s)
    local pos = 1
    local function err(m) error("JSON: " .. m .. " at " .. pos) end
    local function skip()
        while pos <= #s and s:sub(pos, pos):match("%s") do pos = pos + 1 end
    end
    local parse
    local function str()
        pos = pos + 1
        local out = {}
        while true do
            local c = s:sub(pos, pos)
            if c == "" then err("unterminated string") end
            if c == '"' then pos = pos + 1 break end
            if c == '\\' then
                local n = s:sub(pos + 1, pos + 1)
                local map = { n = "\n", t = "\t", r = "\r", b = "\b", f = "\f", ['"'] = '"', ['\\'] = '\\', ['/'] = '/' }
                if map[n] then out[#out + 1] = map[n]; pos = pos + 2
                elseif n == 'u' then out[#out + 1] = string.char(tonumber(s:sub(pos + 2, pos + 5), 16) or 63); pos = pos + 6
                else out[#out + 1] = n; pos = pos + 2 end
            else out[#out + 1] = c; pos = pos + 1 end
        end
        return table.concat(out)
    end
    parse = function()
        skip()
        local c = s:sub(pos, pos)
        if c == '{' then
            pos = pos + 1
            local t = {}
            skip()
            if s:sub(pos, pos) == '}' then pos = pos + 1 return t end
            while true do
                skip()
                local k = str()
                skip()
                if s:sub(pos, pos) ~= ':' then err("expected :") end
                pos = pos + 1
                t[k] = parse()
                skip()
                local d = s:sub(pos, pos)
                pos = pos + 1
                if d == '}' then return t end
                if d ~= ',' then err("expected , or }") end
            end
        elseif c == '[' then
            pos = pos + 1
            local t = {}
            skip()
            if s:sub(pos, pos) == ']' then pos = pos + 1 return t end
            while true do
                t[#t + 1] = parse()
                skip()
                local d = s:sub(pos, pos)
                pos = pos + 1
                if d == ']' then return t end
                if d ~= ',' then err("expected , or ]") end
            end
        elseif c == '"' then return str()
        elseif s:sub(pos, pos + 3) == 'true' then pos = pos + 4 return true
        elseif s:sub(pos, pos + 4) == 'false' then pos = pos + 5 return false
        elseif s:sub(pos, pos + 3) == 'null' then pos = pos + 4 return nil
        else
            local num = s:match('^-?%d+%.?%d*[eE]?[-+]?%d*', pos)
            if not num then err("bad token") end
            pos = pos + #num
            return tonumber(num)
        end
    end
    local ok, v = pcall(parse)
    if not ok then error(v) end
    return v
end

-- ============================================================================
-- 5. task (lịch trình ảo): wait / spawn / defer / delay / cancel
-- ============================================================================
Mock.time = 0
Mock.tasks = {}
Mock.renderSteps = {}
Mock.errors = {}
Mock.teleports = {}
Mock.keysDown = {}
Mock.friends = {}
Mock.files = {}

local function schedule(fn, at, co)
    Mock.tasks[#Mock.tasks + 1] = { fn = fn, at = at or Mock.time, co = co }
end

task = {
    spawn = function(fn, ...) local args = { ... }; schedule(function() return fn(table.unpack(args)) end, Mock.time) end,
    defer = function(fn, ...) local args = { ... }; schedule(function() return fn(table.unpack(args)) end, Mock.time) end,
    delay = function(t, fn, ...) local args = { ... }; schedule(function() return fn(table.unpack(args)) end, Mock.time + (t or 0)) end,
    wait = function(t)
        local co = coroutine.running()
        if co then
            schedule(nil, Mock.time + (t or 0), co)
            return coroutine.yield()
        end
        return t or 0
    end,
    cancel = function(co)
        for i, tk in ipairs(Mock.tasks) do if tk.co == co then tk.dead = true end end
    end,
    synchronously = function(fn) return fn() end,
}
wait = function(t) return task.wait(t) end
spawn = function(f, ...) return task.spawn(f, ...) end
delay = function(t, f, ...) return task.delay(t, f, ...) end
tick = function() return Mock.time end
os.clock = function() return Mock.time end

-- Chạy scheduler: chạy hết task tới hạn, tăng thời gian, gọi render step.
function Mock.advance(seconds, stepDt)
    local dt = stepDt or 1 / 60
    local target = Mock.time + (seconds or 0)
    local guard = 0
    while Mock.time < target and guard < 100000 do
        guard = guard + 1
        Mock.time = Mock.time + math.min(dt, target - Mock.time)
        -- task tới hạn
        local due = {}
        for i = #Mock.tasks, 1, -1 do
            if Mock.tasks[i].at <= Mock.time then
                due[#due + 1] = Mock.tasks[i]
                table.remove(Mock.tasks, i)
            end
        end
        for i = #due, 1, -1 do
            local tk = due[i]
            if not tk.dead then
                if tk.co then
                    local ok, err = coroutine.resume(tk.co)
                    if not ok and coroutine.status(tk.co) ~= "dead" then
                        Mock.errors[#Mock.errors + 1] = "task coroutine: " .. tostring(err)
                    end
                else
                    local co = coroutine.create(tk.fn)
                    local ok, err = coroutine.resume(co)
                    if not ok then Mock.errors[#Mock.errors + 1] = "task: " .. tostring(err) end
                end
            end
        end
        -- render step (BindToRenderStep) + các event theo frame
        for name, fn in pairs(Mock.renderSteps) do
            local ok, err = pcall(fn, dt)
            if not ok then Mock.errors[#Mock.errors + 1] = "renderstep " .. name .. ": " .. tostring(err) end
        end
        for _, svc in pairs({ Mock.services.RunService }) do
            for _, ev in ipairs({ "RenderStepped", "Stepped", "Heartbeat" }) do
                local sig = svc._signals[ev]
                if sig then
                    for _, c in ipairs({ table.unpack(sig._list) }) do
                        if c.Connected then
                            local ok, err = pcall(c._fn, dt)
                            if not ok then Mock.errors[#Mock.errors + 1] = ev .. ": " .. tostring(err) end
                        end
                    end
                end
            end
        end
    end
end
function Mock.pump() Mock.advance(0.001, 0.001) end

-- ============================================================================
-- 6. SERVICES + GAME
-- ============================================================================
Mock.services = {}

local function svc(name, extra)
    local s = makeInstance(name)
    s.Name = name
    if extra then for k, v in pairs(extra) do rawset(s, k, v) end end
    Mock.services[name] = s
    return s
end

local Players = svc("Players")
Players._players = {}
local RunService = svc("RunService")
local UserInputService = svc("UserInputService")
UserInputService.TouchEnabled = false
UserInputService.MouseEnabled = true
UserInputService.MouseBehavior = Enum.MouseBehavior.Default
UserInputService.WindowFocused = true
local TweenService = svc("TweenService")
function TweenService:Create(obj, info, props)
    local tw = setmetatable({ __isTween = true, obj = obj, info = info, props = props, PlaybackState = 0 },
        { __index = function(t, k)
            if k == "Play" then return function()
                pcall(function() for pk, pv in pairs(props) do obj[pk] = pv end end)
                local sig = t._signals and t._signals.Completed
                if sig then sig:Fire() end
            end end
            if k == "Cancel" then return function() end end
            if k == "Completed" then
                t._signals = t._signals or {}
                if not t._signals.Completed then t._signals.Completed = newSignal({ Name = "Tween" }, "Completed") end
                return t._signals.Completed
            end
            return nil
        end })
    return tw
end
local HttpService = svc("HttpService")
local TeleportService = svc("TeleportService")
local Lighting = svc("Lighting")
Lighting.ClockTime = 14; Lighting.Brightness = 1; Lighting.FogEnd = 100000
Lighting.Ambient = c3(0.5, 0.5, 0.5); Lighting.OutdoorAmbient = c3(0.7, 0.7, 0.7)
Lighting.FogColor = c3(1, 1, 1); Lighting.GlobalShadows = true
local VirtualUser = svc("VirtualUser")
local CoreGui = svc("CoreGui")
local StarterGui = svc("StarterGui")
local ReplicatedStorage = svc("ReplicatedStorage")
local RunService2 = RunService

workspace = makeInstance("Workspace")
workspace.Name = "Workspace"
workspace.Terrain = makeInstance("Terrain")
local camera = makeInstance("Camera")
camera.Name = "Camera"
camera.CFrame = cf(0, 10, 0)
camera.ViewportSize = v2(1280, 720)
camera.FieldOfView = 70
camera.CameraType = Enum.CameraType.Custom
camera.CameraSubject = nil
camera.Parent = workspace
rawset(workspace, "CurrentCamera", camera)
Mock.camera = camera
function workspace:GetPartBoundsInRadius(pos, r, params) return {} end
function workspace:Raycast(origin, dir, params) return nil end
function workspace:FindPartOnRay(ray, ignore) return nil, v3(0, 0, 0), v3(0, 1, 0), Enum.Material.Air end
function workspace:GetChildren() return self._children end

game = makeInstance("DataModel")
game.Name = "game"
game.PlaceId = 123456789
game.JobId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
game.GameId = 999
game.CreatorId = 1
rawset(game, "Players", Players)
rawset(game, "RunService", RunService)
rawset(game, "UserInputService", UserInputService)
rawset(game, "TweenService", TweenService)
rawset(game, "HttpService", HttpService)
rawset(game, "TeleportService", TeleportService)
rawset(game, "Lighting", Lighting)
rawset(game, "VirtualUser", VirtualUser)
rawset(game, "CoreGui", CoreGui)
rawset(game, "StarterGui", StarterGui)
rawset(game, "ReplicatedStorage", ReplicatedStorage)
rawset(game, "workspace", workspace)
rawset(game, "Workspace", workspace)
function game:GetService(n)
    if n == "Workspace" then return workspace end
    return Mock.services[n] or svc(n)
end
function game:FindFirstChild(n) return rawget(game, n) end
function game:IsLoaded() return true end
function game:HttpGet(url) return Mock.httpGet(url) end
function game:GetObjects() return {} end

-- Player
local me = makeInstance("Player")
me.Name = "LocalPlayer"
me.UserId = 1001
me.Character = nil
me.Parent = Players
Players.LocalPlayer = me
Players._players = { me }
function Players:GetPlayers() return { table.unpack(self._players) } end
function Players:GetLocalPlayer() return me end
Mock.player = me

-- ============================================================================
-- 7. EXECUTOR API (mô phỏng một executor ĐẦY ĐỦ để hub không phải tự bù)
-- ============================================================================
function Mock.httpGet(url)
    Mock.httpCalls = (Mock.httpCalls or 0) + 1
    Mock.lastUrl = url
    if Mock.httpReply then return Mock.httpReply end
    return '{"data":[{"id":"job-1","playing":3,"maxPlayers":10},{"id":"job-2","playing":10,"maxPlayers":10}],"nextPageCursor":null}'
end
function writefile(p, c) Mock.files[tostring(p)] = tostring(c) end
function readfile(p)
    if Mock.files[tostring(p)] == nil then error("File not found: " .. tostring(p)) end
    return Mock.files[tostring(p)]
end
function isfile(p) return Mock.files[tostring(p)] ~= nil end
function appendfile(p, c) Mock.files[tostring(p)] = (Mock.files[tostring(p)] or "") .. tostring(c) end
function delfile(p) Mock.files[tostring(p)] = nil end
function listfiles() local t = {} for k in pairs(Mock.files) do t[#t + 1] = k end return t end
function makefolder() return true end
function isfolder() return true end
function isfile2() return true end
function setclipboard(t) Mock.clipboard = tostring(t) return true end
function getclipboard() return Mock.clipboard or "" end
function toclipboard(t) return setclipboard(t) end
function identifyexecutor() return "MockExecutor", "1.0" end
function getexecutorname() return "MockExecutor" end
function getgenv() return _G end
function getrenv() return _G end
function request(o) return { StatusCode = 200, Success = true, Body = Mock.httpGet(o and o.Url or "") } end
http_request = request
function queue_on_teleport() return true end
function gethui() return CoreGui end
function typeof(v)
    local t = type(v)
    if t ~= "table" then return t end
    if v.__isInstance then return "Instance" end
    if v.__isTween then return "Tween" end
    if v.__name then return v.__name end
    return "table"
end
function checkcaller() return true end
function setreadonly() return true end
function isreadonly() return false end
function newcclosure(f) return f end
function hookfunction(a, b) return b or a end
function getrawmetatable(t) return getmetatable(t) or {} end
function getconnections() return {} end
function isrbxactive() return true end
Drawing = nil

-- ============================================================================
-- 8. API HỖ TRỢ TEST
-- ============================================================================
Mock.exports = {}     -- run.js nhét các biến local của hub vào đây qua _G.__HUBTEST
function Mock.get(name)
    return _G.__HUBTEST and _G.__HUBTEST[name] or nil
end

-- Tạo nhân vật đầy đủ (Humanoid + HumanoidRootPart + vài part)
function Mock.makeCharacter(parent)
    local m = makeInstance("Model")
    m.Name = "LocalPlayer"
    local hrp = makeInstance("Part")
    hrp.Name = "HumanoidRootPart"
    hrp.Size = v3(2, 2, 1)
    hrp.Position = v3(0, 5, 0)
    hrp.CFrame = cf(0, 5, 0)
    hrp.CanCollide = true
    hrp.Anchored = false
    hrp.AssemblyLinearVelocity = v3(0, 0, 0)
    hrp.Parent = m
    local hum = makeInstance("Humanoid")
    hum.Name = "Humanoid"
    hum.Health = 100
    hum.MaxHealth = 100
    hum.WalkSpeed = 16
    hum.JumpPower = 50
    hum.AutoRotate = true
    hum.PlatformStand = false
    hum.Sit = false
    hum.MoveDirection = v3(0, 0, 0)
    hum.Parent = m
    function hum:GetState() return Enum.HumanoidStateType.Running end
    function hum:ChangeState(s) self._state = s end
    for _, nm in ipairs({ "Head", "Torso", "LeftLeg", "RightLeg" }) do
        local p = makeInstance("Part")
        p.Name = nm
        p.CanCollide = true
        p.Parent = m
    end
    local hat = makeInstance("Part")
    hat.Name = "HatPart"
    hat.CanCollide = false     -- phụ kiện: CanCollide gốc là FALSE (regression test cho lỗi NoClip)
    hat.Parent = m
    m.PrimaryPart = hrp
    rawset(m, "HumanoidRootPart", hrp)
    rawset(m, "Humanoid", hum)
    m.Parent = parent or workspace
    return m
end

function Mock.click(inst)
    local sig = inst and inst._signals and inst._signals.Activated
    if not sig then error("không có event Activated trên " .. tostring(inst and inst.Name)) end
    sig:Fire()
end
function Mock.fire(inst, ev, ...)
    local sig = inst and inst._signals and inst._signals[ev]
    if not sig then error("không có event " .. tostring(ev) .. " trên " .. tostring(inst and inst.Name)) end
    sig:Fire(...)
end
function Mock.key(code, down) Mock.keysDown[tostring(code)] = (down == true) end
function Mock.findChild(parent, name) return parent and parent:FindFirstChild(name, true) or nil end

-- tiện ích cho test: trỏ thẳng vào các service hay dùng
Mock.workspace = workspace
Mock.game = game
Mock.RunService = RunService
Mock.UserInputService = UserInputService
Mock.HttpService = HttpService
Mock.Players = Players
Mock.CoreGui = CoreGui
Mock.camera = camera

_G.Mock = Mock
return Mock
