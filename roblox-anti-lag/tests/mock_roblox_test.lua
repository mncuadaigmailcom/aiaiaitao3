-- Mo phong moi truong Roblox de kiem chung thong bao (toast) tao dung cau truc:
-- goc phai duoi, vien cau vong, trong xam trong suot, hien 30s roi tu bien mat.

local registry = {}
local function newObj(class)
	local o = { _class = class, _children = {}, _destroyed = false }
	if class == "UIGradient" then o.Rotation = 0 end
	local mt = {
		__newindex = function(self, k, v)
			rawset(self, k, v)
			if k == "Parent" and type(v) == "table" and v._children then
				v._children[#v._children + 1] = self
			end
		end,
		__index = function(self, k)
			if k == "FindFirstChildOfClass" then
				return function(_, cls)
					for _, c in ipairs(self._children) do
						if c._class == cls then return c end
					end
					return nil
				end
			end
			if k == "Destroy" then
				return function(s) s._destroyed = true end
			end
			return nil
		end,
	}
	registry[#registry + 1] = setmetatable(o, mt)
	return registry[#registry]
end

local function fakeSignal()
	local sig = { handlers = {} }
	function sig:Connect(fn)
		local conn = { dead = false, fn = fn }
		function conn:Disconnect() self.dead = true end
		self.handlers[#self.handlers + 1] = conn
		return conn
	end
	return sig
end

local heartbeat = fakeSignal()
local player = newObj("Player")
local playerGui = newObj("PlayerGui")
playerGui.Parent = player

local services = {
	RunService = { Heartbeat = heartbeat },
	Players = { LocalPlayer = player },
}
game = { GetService = function(_, name) return services[name] end }
Instance = { new = newObj }
Color3 = { fromRGB = function(r, g, b) return { r = r, g = g, b = b } end }
ColorSequenceKeypoint = { new = function(t, c) return { t = t, c = c } end }
ColorSequence = { new = function(k) return { k = k } end }
Vector2 = { new = function(x, y) return { x = x, y = y } end }
UDim2 = { new = function(a, b, c, d) return { a = a, b = b, c = c, d = d } end }
UDim = { new = function(s, o) return { s = s, o = o } end }
Enum = { Font = { GothamBold = "GothamBold" }, TextXAlignment = { Left = "Left" } }

--__LOAD_ANTILAG__ (test_antilag.py se ghep ma nguon AntiLag.lua vao dung vi tri nay)

local passed, failed = 0, 0
local function check(name, cond)
	if cond then passed += 1; print("PASS  " .. name)
	else failed += 1; print("FAIL  " .. name) end
end

local function find(class, name)
	for _, o in ipairs(registry) do
		if o._class == class and (name == nil or o.Name == name) then return o end
	end
	return nil
end

-- 1) Tu kich hoat khi co Roblox + RunService
check("tu kich hoat AntiLag.Default", AntiLag.Default ~= nil)

-- 2) Toast da duoc tao ngay khi khoi chay, nam trong PlayerGui
local screen = find("ScreenGui", "AntiLagToast")
check("toast duoc tao khi khoi chay", screen ~= nil and screen.Parent == playerGui)

-- 3) Cau truc: ngoai cau vong + trong xam trong suot + goc phai duoi + khong keo duoc
local outer = find("Frame", "RainbowBorder")
local inner = find("Frame", "Body")
local grad = find("UIGradient")
local label = find("TextLabel")
check("khung o goc phai duoi, co dinh", outer ~= nil and outer.AnchorPoint.x == 1 and outer.AnchorPoint.y == 1
	and outer.Position.a == 1 and outer.Position.c == 1 and outer.Active == false)
check("vien ngoai co gradient cau vong", grad ~= nil and grad.Color ~= nil and #grad.Color.k == 7)
check("ben trong xam trong suot 0.35", inner ~= nil and inner.BackgroundTransparency == 0.35
	and inner.BackgroundColor3.r == 128 and inner.BackgroundColor3.g == 128)
check("chu thong bao DA GIAM LAG", label ~= nil and string.find(label.Text, "ĐÃ GIẢM LAG", 1, true) ~= nil)

-- 4) Vien cau vong chuyen dong khi co frame moi
local rot0 = grad.Rotation
for _, c in ipairs(heartbeat.handlers) do if not c.dead then c.fn(0.016) end end
check("gradient xoay theo frame", grad.Rotation ~= rot0)

-- 5) Hien dung 30 giay roi tu bien mat (dong ho gia lap)
local inst = AntiLag.Default
local fakeT = 1000
inst._now = function() return fakeT end
inst._cfg.toastDurationSec = 30
check("hien lai toast de do 30 giay", inst:ShowToast("kiem tra 30 giay") == true)
local screen2 = nil
for idx = #registry, 1, -1 do -- thong bao MOI NHAT (cai cu da bi HideToast thay the)
	if registry[idx]._class == "ScreenGui" then screen2 = registry[idx]; break end
end
fakeT += 29
inst:Step()
check("sau 29 giay van con hien", screen2._destroyed == false)
fakeT += 2 -- tong 31 giay
inst:Step()
check("sau 30 giay tu bien mat", screen2._destroyed == true)

-- 6) Destroy don ca toast
inst:Destroy()
check("Destroy khong loi va tat heartbeat", heartbeat.handlers[1].dead == true)

print(("MOCK ROBLOX: %d PASS, %d FAIL"):format(passed, failed))
if failed > 0 then error("CO TEST THAT BAI") end
print("ANTILAG_MOCK_OK")
