-- ============================================================================
-- MOCK Roblox API tối thiểu — đủ để CHẠY THỬ khối "👕 TRANG PHỤC NGƯỜI CHƠI"
-- (chỉ dùng cho test, không phải code chạy thật)
-- ============================================================================
local LOG = {}
_G.__CONNS = {}
_G.__LOG = LOG
local function log(...) local t = {} for i=1,select('#',...) do t[#t+1] = tostring(select(i,...)) end table.insert(LOG, table.concat(t, " ")) end

local function Signal(owner, name)
    local sig = { owner = owner, event = name, handlers = {} }
    function sig:Connect(f) table.insert(self.handlers, f) table.insert(_G.__CONNS, { obj = self.owner, event = self.event, f = f }) return { Disconnect = function() end, Connected = true } end
    function sig:Once(f) return self:Connect(f) end
    function sig:Wait() return nil end
    return sig
end

_G = _G or {}
local CREATED = {}
_G.__CREATED = CREATED          -- mọi instance đã tạo (để test tìm lại theo Text)
local CONNS = {}            -- mọi :Connect (để test bấm nút)

local INST_MT
local function mkInstance(class, props)
    local o = { ClassName = class, Name = class, _props = {}, _children = {} }
    o.Parent = nil
    INST_MT = INST_MT or {
        __index = function(t, k)
            local p = rawget(t, "_props")[k]
            if p ~= nil then return p end
            local ev = rawget(t, "_events")
            if ev and ev[k] then return ev[k] end
            local M = {
                GetChildren = function(s)
                    local c = {}
                    for _, v in ipairs(s._children) do if not v._destroyed then c[#c+1] = v end end
                    return c
                end,
                GetDescendants = function(s) return s:GetChildren() end,
                FindFirstChild = function(s, n) for _, v in ipairs(s._children) do if v.Name == n then return v end end return nil end,
                FindFirstChildOfClass = function(s, c) for _, v in ipairs(s._children) do if v.ClassName == c then return v end end return nil end,
                WaitForChild = function(s, n) return s:FindFirstChild(n) end,
                Destroy = function(s) s._destroyed = true end,
                IsA = function(s, n) return n == s.ClassName or n == "Instance" or n == "GuiObject" end,
                Clone = function(s) local c = mkInstance(s.ClassName, s._props) return c end,
                GetPropertyChangedSignal = function(s) return Signal(s, "prop") end,
                TweenPosition = function() end, TweenSize = function() end,
                SetAttribute = function() end, GetAttribute = function() return nil end,
                ClearAllChildren = function(s) s._children = {} end,
            }
            if M[k] then return M[k] end
            -- sự kiện: tự tạo Signal
            local EVENTS = { Activated=true, MouseButton1Click=true, MouseButton1Down=true, FocusLost=true,
                             Changed=true, ChildAdded=true, ChildRemoved=true, Destroying=true, InputBegan=true }
            if EVENTS[k] then
                local ev = rawget(t, "_events") if not ev then ev = {} rawset(t, "_events", ev) end
                ev[k] = Signal(t, k)
                return ev[k]
            end
            return nil
        end,
        __newindex = function(t, k, v)
            if k == "Parent" then
                local old = rawget(t, "_parent")
                if old then for i, c in ipairs(old._children) do if c == t then table.remove(old._children, i) break end end end
                rawset(t, "_parent", v)
                rawget(t, "_props").Parent = v
                if v and v._children then table.insert(v._children, t) end
                return
            end
            if k == "Name" then rawset(t, "Name", v) end
            rawget(t, "_props")[k] = v
        end,
    }
    setmetatable(o, INST_MT)
    if props then for k, v in pairs(props) do o[k] = v end end
    table.insert(CREATED, o)
    return o
end

-- New(class, props, parent)    (giống helper New() của script)
local function New(class, props, parent)
    local o = mkInstance(class, props or {})
    if parent then o.Parent = parent end
    return o
end
local function Corner() end
local function Stroke() end

-- Enum giả: Enum.Font.GothamBold -> "Font.GothamBold"
local Enum = setmetatable({}, { __index = function(_, group)
    return setmetatable({}, { __index = function(_, item) return group .. "." .. item end })
end })

-- kiểu dữ liệu Roblox
local UDim2 = { new = function(xs, xo, ys, yo) return { X = { Scale = xs, Offset = xo }, Y = { Scale = ys, Offset = yo } } end }
local UDim  = { new = function(s, o) return { Scale = s, Offset = o } end }
local Vector2 = { new = function(x, y) return { X = x, Y = y } end }
local Color3 = { fromRGB = function(r, g, b) return { R = r/255, G = g/255, B = b/255 } end }

-- màu sắc của hub
local C = setmetatable({}, { __index = function(_, k) return "Color3(" .. k .. ")" end })
local D = { playerY = 46, playerTab = mkInstance("ScrollingFrame"), BestText = function() return "TextColor" end }

-- mock game services
local RS = { FindFirstChild = function(_, n) return nil end }          -- chưa cài OutfitServer
local game = { GetService = function(_, n) if n == "ReplicatedStorage" then return RS end return {} end }

-- mock nhân vật
local function mkPart(name, class)
    return { Name = name, ClassName = class, Color = "COLOR", Material = "MATERIAL", _children = {},
        IsA = function(_, n) return n == class end,
        GetChildren = function(s) return s._children end,
        Clone = function(s) return mkPart(s.Name, s.ClassName) end,
        Destroy = function() end }
end

local APPLIED = { apply = 0, reset = 0, accessory = 0 }
_G.__APPLIED = APPLIED
local hum = { ClassName = "Humanoid", RigType = "R15",
    ApplyDescription = function() APPLIED.apply = APPLIED.apply + 1 return true end,
    ApplyDescriptionReset = function() APPLIED.reset = APPLIED.reset + 1 return true end,
    GetAppliedDescription = function() return { Clone = function() return {} end } end,
    AddAccessory = function() APPLIED.accessory = APPLIED.accessory + 1 return true end,
    FindFirstChildOfClass = function(self, n) if n == "Humanoid" then return hum end end }

local char = mkInstance("Model")
char.FindFirstChildOfClass = function(self, n) if n == "Humanoid" then return hum end end
char._children = { mkPart("Shirt", "Shirt"), mkPart("Pants", "Pants"), mkPart("BodyColors", "BodyColors"), hum }
for _, c in ipairs(char._children) do c.Parent = char end
char.GetChildren = function() return { mkPart("Shirt", "Shirt"), mkPart("Pants", "Pants") } end

local player = { UserId = 1, Character = char, Name = "LocalPlayer" }

local descMock = { Clone = function() return descMock end }
local Players = {
    GetUserIdFromNameAsync = function(_, name) if name == "TestUser" then return 12345 end return nil, "not found" end,
    GetNameFromUserIdAsync = function() return "TestUser" end,
    GetUserThumbnailAsync = function() return "rbxthumb://type=Avatar&id=12345&w=420&h=420" end,
    GetHumanoidDescriptionFromUserId = function(_, uid) return descMock end,
    CreateHumanoidModelFromDescription = function() return char end,
}
local task = { spawn = function(f, ...) local ok, err = pcall(f, ...) if not ok then log("TASK ERROR:", err) end end,
               wait = function() end, defer = function(f, ...) return task.spawn(f, ...) end, delay = function(_, f) return task.spawn(f) end }
