-- Roblox mock (validated against API dump) for running LocalScripts under luau CLI
local API = API_DATA
local T = { now = 0, queue = {}, errors = {} }
MOCK = T

local function classChain(name)
	local chain = {}
	while name and API.classes[name] do
		table.insert(chain, name)
		name = API.classes[name].super
		if name == "<<<ROOT>>>" then break end
	end
	return chain
end

local function findMember(className, kind, member)
	for _, c in classChain(className) do
		local m = API.classes[c][kind][member]
		if m then return m end
	end
	return nil
end

-- scheduler -------------------------------------------------------------
local function schedule(co, at, ...)
	T.seq = (T.seq or 0) + 1
	table.insert(T.queue, { co = co, at = at, seq = T.seq, args = table.pack(...) })
end
local function resume(co, ...)
	local ok, err = coroutine.resume(co, ...)
	if not ok then
		table.insert(T.errors, tostring(err) .. "\n" .. debug.traceback(co))
		print("SCRIPT ERROR: " .. tostring(err))
		print(debug.traceback(co))
	end
end
task = {}
function task.spawn(f, ...)
	local co = type(f) == "thread" and f or coroutine.create(f)
	resume(co, ...)
	return co
end
function task.defer(f, ...)
	local co = type(f) == "thread" and f or coroutine.create(f)
	schedule(co, T.now, ...)
	return co
end
function task.delay(t, f, ...)
	local co = coroutine.create(f)
	schedule(co, T.now + (t or 0), ...)
	return co
end
function task.wait(t)
	local co = coroutine.running()
	schedule(co, T.now + math.max(t or 0, 1 / 60))
	return coroutine.yield()
end
function T.run(seconds)
	local target = T.now + seconds
	while true do
		table.sort(T.queue, function(a, b) if a.at ~= b.at then return a.at < b.at end return a.seq < b.seq end)
		local item = T.queue[1]
		if not item or item.at > target then break end
		table.remove(T.queue, 1)
		T.now = math.max(T.now, item.at)
		if coroutine.status(item.co) == "suspended" then
			resume(item.co, table.unpack(item.args, 1, item.args.n))
		end
	end
	T.now = target
end
local realOs = os
os = { clock = function() return T.now end, time = function() return 1700000000 + math.floor(T.now) end,
	date = function(fmt, t) assert(fmt == "*t" or fmt == "!*t", "Roblox os.date only supports *t") return realOs.date(fmt, t) end }

-- typeof ------------------------------------------------------------------
local rawtypeof = typeof
typeof = function(v)
	if type(v) == "table" then
		local mt = getmetatable(v)
		if mt and mt.__type then return mt.__type end
	end
	return rawtypeof(v)
end

local function dt(typename, fields, extra)
	local mt = { __type = typename, __index = extra, __tostring = function() return typename end,
		__newindex = function(_, k) error(typename .. " is read-only: " .. tostring(k), 2) end }
	return setmetatable(fields, mt)
end
local function num(v, what) assert(type(v) == "number", what .. " expects number, got " .. type(v)) return v end

UDim = { new = function(s, o) return dt("UDim", { Scale = num(s or 0, "UDim"), Offset = num(o or 0, "UDim") }) end }
UDim2 = {}
function UDim2.new(a, b, c, d)
	if typeof(a) == "UDim" then
		return dt("UDim2", { X = a, Y = b, Width = a, Height = b })
	end
	local x, y = UDim.new(a or 0, b or 0), UDim.new(c or 0, d or 0)
	return dt("UDim2", { X = x, Y = y, Width = x, Height = y })
end
function UDim2.fromOffset(x, y) return UDim2.new(0, x or 0, 0, y or 0) end
function UDim2.fromScale(x, y) return UDim2.new(x or 0, 0, y or 0, 0) end
local v2mt
Vector2 = {}
function Vector2.new(x, y) return dt("Vector2", { X = num(x or 0, "Vector2"), Y = num(y or 0, "Vector2") }) end
Vector2.zero = Vector2.new(0, 0)
Vector3 = { new = function(x, y, z) return dt("Vector3", { X = x or 0, Y = y or 0, Z = z or 0 }) end }
Color3 = {}
function Color3.new(r, g, b) return dt("Color3", { R = num(r or 0, "Color3"), G = g or 0, B = b or 0 }) end
function Color3.fromRGB(r, g, b)
	assert(r <= 255 and g <= 255 and b <= 255, "fromRGB range")
	return Color3.new(r / 255, g / 255, b / 255)
end
Rect = { new = function(x0, y0, x1, y1)
	return dt("Rect", { Min = Vector2.new(x0, y0), Max = Vector2.new(x1, y1), Width = x1 - x0, Height = y1 - y0 })
end }
Font = { new = function(family, weight, style)
	assert(type(family) == "string", "Font family")
	if weight ~= nil then assert(typeof(weight) == "EnumItem" and weight.EnumType == "FontWeight", "Font weight") end
	return dt("Font", { Family = family, Weight = weight })
end }
TweenInfo = { new = function(t, style, dir)
	assert(type(t) == "number")
	if style then assert(style.EnumType == "EasingStyle") end
	if dir then assert(dir.EnumType == "EasingDirection") end
	return dt("TweenInfo", { Time = t })
end }

-- Enum --------------------------------------------------------------------
local enumCache = {}
Enum = setmetatable({}, { __index = function(_, enumName)
	local items = API.enums[enumName]
	assert(items, "Unknown Enum: " .. tostring(enumName))
	enumCache[enumName] = enumCache[enumName] or setmetatable({}, { __index = function(t, itemName)
		assert(items[itemName] ~= nil, "Unknown EnumItem: Enum." .. enumName .. "." .. tostring(itemName))
		local item = dt("EnumItem", { Name = itemName, Value = items[itemName], EnumType = enumName })
		rawset(t, itemName, item)
		return item
	end })
	return enumCache[enumName]
end })

-- Signals -----------------------------------------------------------------
local function Signal(name)
	local s = { handlers = {}, name = name }
	function s:Connect(fn)
		assert(type(fn) == "function", "Connect expects function for " .. tostring(name))
		local c = { fn = fn, connected = true }
		table.insert(s.handlers, c)
		function c:Disconnect() c.connected = false end
		return c
	end
	function s:Fire(...)
		for _, c in table.clone(s.handlers) do
			if c.connected then task.spawn(c.fn, ...) end
		end
	end
	function s:Wait()
		local co = coroutine.running()
		local conn
		conn = s:Connect(function(...) conn:Disconnect() resume(co, ...) end)
		return coroutine.yield()
	end
	return s
end
T.Signal = Signal

-- Instances ---------------------------------------------------------------
local INST = {}
local function defaultFor(m)
	local t = m.t
	if m.cat == "Primitive" then
		if t == "bool" then return false end
		if t == "string" then return "" end
		return 0
	end
	if t == "UDim2" then return UDim2.new() end
	if t == "UDim" then return UDim.new() end
	if t == "Vector2" then return Vector2.new() end
	if t == "Vector3" then return Vector3.new() end
	if t == "Color3" then return Color3.new(1, 1, 1) end
	return nil
end

local function checkType(className, key, m, value)
	if value == nil then
		if m.cat == "Class" or m.cat == "DataType" and (m.t == "Content" or m.t == "Font") then return end
		error("cannot set " .. className .. "." .. key .. " to nil", 3)
	end
	if m.cat == "Enum" then
		assert(typeof(value) == "EnumItem" and value.EnumType == m.t,
			("%s.%s expects Enum.%s, got %s"):format(className, key, m.t, typeof(value) == "EnumItem" and value.EnumType or typeof(value)))
	elseif m.cat == "Primitive" then
		local map = { bool = "boolean", string = "string", float = "number", double = "number", int = "number", int64 = "number" }
		local want = map[m.t]
		if want then
			assert(type(value) == want, ("%s.%s expects %s, got %s"):format(className, key, want, type(value)))
		end
	elseif m.cat == "Class" then
		assert(INST[value], ("%s.%s expects Instance"):format(className, key))
	elseif m.cat == "DataType" then
		if m.t == "Content" or m.t == "ContentId" then
			assert(type(value) == "string", key .. " expects string")
		else
			assert(typeof(value) == m.t, ("%s.%s expects %s, got %s"):format(className, key, m.t, typeof(value)))
		end
	end
end

local Instance_ = {}
Instance = Instance_

local function newInstance(className, internal)
	local cdata = API.classes[className]
	assert(cdata, "Unknown class: " .. tostring(className))
	if not internal then
		assert(not cdata.notCreatable, "Class not creatable: " .. className)
	end
	local self = {}
	local st = { ClassName = className, Name = className, Parent = nil, children = {}, props = {}, signals = {},
		changed = {}, custom = {} }
	INST[self] = st

	local function propSignal(prop)
		st.changed[prop] = st.changed[prop] or Signal(prop .. "Changed")
		return st.changed[prop]
	end
	st.propSignal = propSignal

	local methods = {}
	function methods.Destroy()
		if st.Parent then self.Parent = nil end
		for _, c in table.clone(st.children) do c:Destroy() end
		st.destroyed = true
	end
	function methods.FindFirstChild(_, name)
		for _, c in st.children do if INST[c].Name == name then return c end end
		return nil
	end
	function methods.WaitForChild(_, name) return methods.FindFirstChild(nil, name) or error("WaitForChild would hang: " .. name) end
	function methods.GetChildren() return table.clone(st.children) end
	function methods.IsA(_, c) return table.find(classChain(className), c) ~= nil end
	function methods.GetPropertyChangedSignal(_, prop)
		assert(findMember(className, "props", prop), "GetPropertyChangedSignal: bad prop " .. className .. "." .. prop)
		return propSignal(prop)
	end
	function methods.ClearAllChildren() for _, c in table.clone(st.children) do c:Destroy() end end
	function methods.IsFocused() return st.focused == true end
	function methods.CaptureFocus()
		if not st.focused then st.focused = true; T.focusedBox = self; self.Focused:Fire() end
	end
	function methods.ReleaseFocus(_, enter)
		if st.focused then st.focused = false; T.focusedBox = nil; self.FocusLost:Fire(enter == true) end
	end

	local mt = {}
	mt.__type = "Instance"
	mt.__tostring = function() return st.Name end
	mt.__index = function(_, key)
		if key == "Parent" or key == "Name" or key == "ClassName" then return st[key] end
		if st.custom[key] ~= nil then return st.custom[key] end
		if st.props[key] ~= nil then return st.props[key] end
		local m = findMember(className, "props", key)
		if m then
			if key == "AbsoluteContentSize" then
				local n = 0
				if st.Parent then for _, c in INST[st.Parent].children do if c:IsA("GuiObject") then n += 1 end end end
				return Vector2.new(300, n * 20)
			end
			if key == "AbsoluteSize" then return Vector2.new(120, 20) end
			if key == "AbsoluteWindowSize" then return Vector2.new(400, 190) end
			return defaultFor(m)
		end
		if findMember(className, "events", key) then
			st.signals[key] = st.signals[key] or Signal(key)
			return st.signals[key]
		end
		if methods[key] then
			return function(selfArg, ...) assert(selfArg == self, "method " .. key .. " called with '.' instead of ':'") return methods[key](selfArg, ...) end
		end
		if findMember(className, "funcs", key) then
			local impl = T.funcs[className .. "." .. key] or T.funcs[key]
			if impl then return function(selfArg, ...) assert(selfArg == self, "':' expected for " .. key) return impl(self, ...) end end
			return function() return nil end
		end
		for _, c in st.children do if INST[c].Name == key then return c end end
		error(("%s is not a valid member of %s \"%s\""):format(tostring(key), className, st.Name), 2)
	end
	mt.__newindex = function(_, key, value)
		if key == "Parent" then
			if value ~= nil then assert(INST[value], "Parent must be Instance") end
			local oldParent = st.Parent
			if oldParent == value then return end
			if oldParent then
				local list = INST[oldParent].children
				table.remove(list, table.find(list, self))
				T.childrenChanged(oldParent)
			end
			st.Parent = value
			if value then
				table.insert(INST[value].children, self)
				T.childrenChanged(value)
			end
			propSignal("Parent"):Fire()
			return
		end
		if key == "Name" then st.Name = tostring(value); return end
		local m = findMember(className, "props", key)
		if not m then error(("%s is not a valid property of %s"):format(tostring(key), className), 2) end
		if m.ro and not T.internalWrite then error(("%s.%s is read-only"):format(className, key), 2) end
		checkType(className, key, m, value)
		local old = st.props[key]
		st.props[key] = value
		if old ~= value then propSignal(key):Fire() end
	end
	setmetatable(self, mt)
	return self
end

function T.childrenChanged(parent)
	for _, c in INST[parent].children do
		if INST[c].ClassName == "UIListLayout" then
			INST[c].propSignal("AbsoluteContentSize"):Fire()
		end
	end
end

function Instance_.new(className, parent)
	local inst = newInstance(className)
	if parent then inst.Parent = parent end
	return inst
end

function T.set(inst, key, value)
	T.internalWrite = true
	inst[key] = value
	T.internalWrite = false
end
T.INST = INST
T.newInstance = function(c) return newInstance(c, true) end
T.funcs = {}

-- Services ------------------------------------------------------------------
local services = {}
game = newInstance("DataModel", true)
local function service(name)
	if not services[name] then
		services[name] = newInstance(name, true)
		services[name].Parent = game
		services[name].Name = name
	end
	return services[name]
end
T.funcs["DataModel.GetService"] = function(_, name) return service(name) end

workspace = service("Workspace")
local camera = newInstance("Camera", true)
camera.Parent = workspace
T.set(camera, "ViewportSize", Vector2.new(1280, 720))
T.set(workspace, "CurrentCamera", camera)

local Players = service("Players")
local lp = newInstance("Player", true)
lp.Name = "TestPlayer"
T.set(lp, "DisplayName", "Tester")
T.set(lp, "UserId", 1)
lp.Parent = Players
local pg = newInstance("PlayerGui", true)
pg.Name = "PlayerGui"
pg.Parent = lp
T.set(Players, "LocalPlayer", lp)
T.funcs["Players.GetPlayers"] = function() return { lp } end

local UIS = service("UserInputService")
T.set(UIS, "TouchEnabled", false)
T.set(UIS, "KeyboardEnabled", true)
T.mouse = Vector2.new(2000, 2000)
T.funcs["UserInputService.GetMouseLocation"] = function() return T.mouse end
T.funcs["UserInputService.GetFocusedTextBox"] = function() return T.focusedBox end

T.funcs["TweenService.Create"] = function(_, obj, info, goal)
	assert(INST[obj], "Tween target must be Instance")
	assert(typeof(info) == "TweenInfo", "TweenInfo expected")
	return { Play = function()
		for k, v in goal do
			local m = findMember(INST[obj].ClassName, "props", k)
			assert(m, "Tween bad property " .. k)
			assert(m.t == "float" or m.t == "double" or m.t == "UDim2" or m.t == "Color3" or m.t == "Vector2", "property not tweenable: " .. k)
			obj[k] = v
		end
	end }
end
T.coreChat = true
T.funcs["StarterGui.SetCoreGuiEnabled"] = function(_, typ, on)
	assert(typ.EnumType == "CoreGuiType")
	T.coreChat = on
end
local GS = service("GuiService")
T.set(GS, "TopbarInset", Rect.new(64, 0, 1200, 58))
T.funcs["GuiService.GetGuiInset"] = function() return Vector2.new(0, 58), Vector2.new() end

local TCS = service("TextChatService")
local cwc = newInstance("ChatWindowConfiguration", true)
cwc.Name = "ChatWindowConfiguration"; cwc.Parent = TCS
local cic = newInstance("ChatInputBarConfiguration", true)
cic.Name = "ChatInputBarConfiguration"; cic.Parent = TCS
service("TweenService"); service("StarterGui")
