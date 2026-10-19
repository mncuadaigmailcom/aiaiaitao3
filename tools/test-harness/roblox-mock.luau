--[[
	tools/test-harness/roblox-mock.luau

	Mock API Roblox đủ để CHẠY THẬT src/**.luau ngoài client.

	GIỚI HẠN — đọc kỹ, đừng hiểu nhầm kết quả:
	  * Mock mô phỏng NGỮ NGHĨA API (Instance/Parent/property/signal/
	    GetDescendants/FindFirstChild...) theo tài liệu Roblox.
	  * Mock KHÔNG phải engine Roblox: nó không render, không tính vật lý,
	    không replicate. "Frame time" trong harness do MÔ HÌNH CHI PHÍ bên
	    dưới sinh ra, không phải số đo từ GPU/CPU thật.
	  * Vì vậy harness chứng minh: logic, thứ tự thực thi, đếm thay đổi,
	    auto-hide, restore... chạy đúng trên mã nguồn thật.
	    Harness KHÔNG chứng minh mức tăng FPS trên máy bạn.
	    Chỉ lần chạy trong game thật mới cho con số đó.

	Mô hình chi phí khung hình (khai báo rõ, không ẩn):
	  cost = 1
	       + 0.02  × số Part/MeshPart/UnionOperation có Visible ≠ false
	       + 0.012 × số part trong số đó có CastShadow = true
	       + 0.006 × tổng ParticleEmitter.Rate đang bật
	  frameTime(ms) = BASE_FRAME_MS + SCALE × cost
	Nghĩa là: tắt CastShadow hay giảm Rate SẼ làm frame time giảm trong
	harness, đúng như cơ chế thật — nhưng độ lớn thì chỉ có đo thật mới biết.
]]

local Mock = {}

Mock.BASE_FRAME_MS = 8.0
Mock.COST_SCALE = 0.6

--------------------------------------------------------------------- Signals
local Signal = {}
Signal.__index = Signal

function Signal.new()
	return setmetatable({ handlers = {} }, Signal)
end

function Signal:Connect(handler)
	if type(self) ~= "table" or type(rawget(self, "handlers")) ~= "table" then
		error(("mock Signal:Connect nhận self không phải Signal (type=%s, handlerType=%s)")
			:format(type(self), type(handler)))
	end
	if type(handler) ~= "function" then
		error("mock Signal:Connect cần handler là function, nhận " .. type(handler))
	end
	-- Ghi lại signal để closure Disconnect không phụ thuộc upvalue `self`
	-- (dễ debug hơn khi có lỗi).
	local signal = self
	table.insert(signal.handlers, handler)
	local connection = { Connected = true }
	function connection:Disconnect()
		connection.Connected = false
		local handlers = rawget(signal, "handlers")
		if type(handlers) ~= "table" then
			error("mock Disconnect: signal đã mất handlers")
		end
		for i = #handlers, 1, -1 do
			if handlers[i] == handler then
				table.remove(handlers, i)
				break
			end
		end
	end
	return connection
end

function Signal:Fire(...)
	if type(self) ~= "table" or type(rawget(self, "handlers")) ~= "table" then
		error(("mock Signal:Fire được gọi với self không phải Signal (type=%s, className=%s)")
			:format(type(self), type(self) == "table" and tostring(self.ClassName) or "-"))
	end
	-- Sao chép danh sách để handler có quyền Disconnect ngay trong callback
	local snapshot = {}
	for i, handler in pairs(self.handlers) do
		snapshot[i] = handler
	end
	for _, handler in pairs(snapshot) do
		handler(...)
	end
end

function Signal:Wait()
	-- Không dùng trong dự án này; giữ để mock đủ hình dạng API.
	error("mock Signal:Wait chưa cài (dự án không dùng)")
end

Mock.Signal = Signal

------------------------------------------------------------------ Value types
local function makeVector3(x, y, z)
	local v = { X = x or 0, Y = y or 0, Z = z or 0 }
	v.Magnitude = math.sqrt(v.X * v.X + v.Y * v.Y + v.Z * v.Z)
	return setmetatable(v, {
		__sub = function(a, b) return makeVector3(a.X - b.X, a.Y - b.Y, a.Z - b.Z) end,
		__add = function(a, b) return makeVector3(a.X + b.X, a.Y + b.Y, a.Z + b.Z) end,
		__tostring = function(a) return ("%.3f, %.3f, %.3f"):format(a.X, a.Y, a.Z) end,
	})
end

local function makeCFrame(x, y, z)
	return { Position = makeVector3(x or 0, y or 0, z or 0) }
end

local function makeColor3(r, g, b)
	return { R = r or 0, G = g or 0, B = b or 0 }
end

Mock.Vector2 = { new = function(x, y) return { X = x or 0, Y = y or 0 } end }
Mock.Vector3 = { new = makeVector3 }
Mock.CFrame = { new = makeCFrame }
Mock.Color3 = {
	new = makeColor3,
	fromRGB = function(r, g, b) return makeColor3(r / 255, g / 255, b / 255) end,
}

Mock.UDim = { new = function(s, o) return { Scale = s or 0, Offset = o or 0 } end }
Mock.UDim.fromOffset = function(x, y) return { X = x, Y = y } end
Mock.UDim2 = {
	new = function(sx, ox, sy, oy)
		return { X = { Scale = sx or 0, Offset = ox or 0 }, Y = { Scale = sy or 0, Offset = oy or 0 } }
	end,
}
Mock.UDim2.fromOffset = function(x, y)
	return { X = { Scale = 0, Offset = x }, Y = { Scale = 0, Offset = y } }
end
Mock.UDim2.new = Mock.UDim2.new

Mock.ColorSequenceKeypoint = { new = function(t, c) return { Time = t, Value = c } end }
Mock.ColorSequence = { new = function(keypoints) return { Keypoints = keypoints } end }
Mock.NumberSequence = { new = function(v) return { Value = v } end }
Mock.TweenInfo = { new = function(t, style, dir) return { Time = t, Style = style, Direction = dir } end }

Mock.Enum = {
	Font = { GothamMedium = "GothamMedium", GothamBold = "GothamBold", RobotoMono = "RobotoMono" },
	TextXAlignment = { Left = "Left", Center = "Center", Right = "Right" },
	TextYAlignment = { Top = "Top", Center = "Center", Bottom = "Bottom" },
	TextTruncate = { None = "None", AtEnd = "AtEnd" },
	FillDirection = { Horizontal = "Horizontal", Vertical = "Vertical" },
	HorizontalAlignment = { Left = "Left", Center = "Center", Right = "Right" },
	VerticalAlignment = { Top = "Top", Center = "Center", Bottom = "Bottom" },
	SortOrder = { LayoutOrder = "LayoutOrder", Name = "Name" },
	ApplyStrokeMode = { Border = "Border", Contextual = "Contextual" },
	ZIndexBehavior = { Sibling = "Sibling", Global = "Global" },
	AutomaticSize = { None = "None", X = "X", Y = "Y", XY = "XY" },
	EasingStyle = { Quad = "Quad", Linear = "Linear" },
	EasingDirection = { Out = "Out", In = "In" },
	QualityLevel = { Automatic = "Automatic" },
}

-------------------------------------------------------------------- Instance
local CLASS_DEFAULTS = {
	Part = { CastShadow = true, Transparency = 0, Visible = true, Anchored = false, CanCollide = true },
	MeshPart = { CastShadow = true, Transparency = 0, Visible = true, Anchored = false, CanCollide = true },
	UnionOperation = { CastShadow = true, Transparency = 0, Visible = true, Anchored = false, CanCollide = true },
	ParticleEmitter = { Rate = 10, ParticleCount = 20, Enabled = true },
	Beam = { Enabled = true },
	Trail = { Enabled = true },
	Decal = { Transparency = 0 },
	Texture = { Transparency = 0 },
	Humanoid = { AutomaticScalingEnabled = true },
	ScreenGui = { Enabled = true, ResetOnSpawn = true },
	BillboardGui = { Enabled = true },
	Frame = { Visible = true, BackgroundTransparency = 0 },
	TextLabel = { Visible = true, Text = "", BackgroundTransparency = 1 },
	TextButton = { Visible = true, Text = "", AutoButtonColor = true },
	Folder = {},
	Model = {},
	Camera = {},
	Terrain = { Decoration = true },
	DataModel = {},
	Player = {},
	PlayerGui = {},
	CoreGui = {},
	Workspace = {},
	Lighting = { QualityLevel = 10, GraphicsQualityMode = true },
	Players = {},
}

--[[
	Mỗi instance là một bảng rỗng mang metatable RIÊNG (closure over props/api).
	Không dùng chung một metatable để tránh nhầm lẫn giữa "bảng API" và
	"bảng metamethod" — lỗi đã gặp khi viết bản đầu.
]]

-- Cho phép code ngoài (BuildWorld, test) đọc/ghi property trực tiếp.
local registry = setmetatable({}, { __mode = "k" })

local function getProps(instance)
	return registry[instance]
end

Mock.getProps = getProps

local function makeInstance(className)
	local props = { ClassName = className, Name = className }
	local api = {}
	local children = {}
	local changedSignals = {}
	local attributes = {}
	local parentSignal = Signal.new()

	local self = {}
	registry[self] = props

	local meta = {}

	function meta.__index(_t, key)
		-- Roblox thật NÉM LỖI khi truy cập instance đã Destroy. Mock phải
		-- giống vậy, nếu không các chốt an toàn (POOL-005, LEAK-002) sẽ
		-- không bao giờ được kích hoạt trong test và ta tưởng chúng đúng.
		if rawget(self, "__destroyed") and key ~= "Parent" then
			error(("%s is not a valid member of %s (instance đã bị Destroy)")
				:format(tostring(key), tostring(props.ClassName)))
		end
		if key == "Parent" then
			return props.Parent
		end
		local value = props[key]
		if value ~= nil then
			return value
		end
		return api[key]
	end

	function meta.__newindex(_t, key, value)
		if rawget(self, "__destroyed") then
			error("không thể ghi vào instance đã bị Destroy")
		end
		if key == "Parent" then
			local oldParent = props.Parent
			if oldParent ~= nil then
				-- __children phải đọc/ghi bằng rawget/rawset: nếu dùng cú pháp
				-- thường thì __index/__newindex sẽ đẩy nó vào bảng props.
				local oldChildren = rawget(oldParent, "__children")
				if oldChildren then
					for i, child in pairs(oldChildren) do
						if child == self then
							table.remove(oldChildren, i)
							break
						end
					end
				end
			end
			props.Parent = value
			if value ~= nil then
				local newChildren = rawget(value, "__children")
				if newChildren == nil then
					newChildren = {}
					rawset(value, "__children", newChildren)
				end
				table.insert(newChildren, self)
			end
			parentSignal:Fire(value)
			return
		end
		props[key] = value
		if changedSignals[key] then
			changedSignals[key]:Fire(value)
		end
	end

	rawset(self, "__children", children)

	------------------------------------------------------------- API methods
	function api.FindFirstChild(_self, name)
		for _, child in pairs(children) do
			if registry[child] and registry[child].Name == name then
				return child
			end
		end
		return nil
	end

	function api.FindFirstChildOfClass(_self, name)
		for _, child in pairs(children) do
			if registry[child] and registry[child].ClassName == name then
				return child
			end
		end
		return nil
	end

	function api.GetChildren(_self)
		local out = {}
		for i, child in pairs(children) do
			out[i] = child
		end
		return out
	end

	function api.GetDescendants(_self)
		local out = {}
		local function walk(node)
			for _, child in pairs(rawget(node, "__children") or {}) do
				out[#out + 1] = child
				walk(child)
			end
		end
		walk(self)
		return out
	end

	function api.WaitForChild(_self, name)
		return api.FindFirstChild(self, name)
	end

	function api.IsA(_self, name)
		if props.ClassName == name then
			return true
		end
		if name == "BasePart" then
			return props.ClassName == "Part" or props.ClassName == "MeshPart"
				or props.ClassName == "UnionOperation" or props.ClassName == "WedgePart"
				or props.ClassName == "CornerWedgePart" or props.ClassName == "TrussPart"
		end
		return false
	end

	function api.Destroy(_self)
		-- Gỡ con trước (Roblox huỷ cả cây con)
		for _, child in pairs(rawget(self, "__children") or {}) do
			if registry[child] and not rawget(child, "__destroyed") then
				pcall(child.Destroy, child)
			end
		end
		self.Parent = nil
		rawset(self, "__destroyed", true)
		registry[self] = nil
	end

	function api.GetPropertyChangedSignal(_self, property)
		if not changedSignals[property] then
			changedSignals[property] = Signal.new()
		end
		return changedSignals[property]
	end

	function api.SetAttribute(_self, name, value)
		if type(name) ~= "string" then
			error("mock SetAttribute cần tên string")
		end
		attributes[name] = value
	end

	function api.GetAttribute(_self, name)
		return attributes[name]
	end

	function api.GetAttributes(_self)
		local out = {}
		for name, value in pairs(attributes) do
			out[name] = value
		end
		return out
	end

	function api.CountDescendants(_self)
		return #api.GetDescendants(self)
	end

	function api.Clone(_self)
		return makeInstance(props.ClassName)
	end

	------------------------------------------------------- per-class extras
	if className == "TextButton" then
		api.Activated = Signal.new()
		api.MouseButton1Click = Signal.new()
	end

	-- BindableEvent theo ĐÚNG API Roblox:
	--   instance.Event  -> RBXScriptSignal để Connect
	--   instance:Fire() -> bắn tín hiệu
	-- (Phiên bản cũ của mock đặt signal dưới .Changed, là SAI: .Changed là
	--  PropertyChangedSignal, không phải tín hiệu của BindableEvent. Lỗi này
	--  sẽ che giấu hỏng hóc thật của Progress/Notifier.)
	if className == "BindableEvent" then
		local inner = Signal.new()
		api.Event = inner
		api.Fire = function(_self, ...)
			inner:Fire(...)
		end
	end

	if className == "RunService" then
		api.RenderStepped = Signal.new()
		api.Heartbeat = Signal.new()
		api.Stepped = Signal.new()
		api.IsStudio = function()
			return true
		end
		-- GetRenderStepTime trả về độ dài khung hình do scheduler ảo tính
		-- từ mô hình chi phí (xem ComputeFrameCost). Không hard-code.
		api.GetRenderStepTime = function()
			if __RALO_FRAME_SECONDS then
				return __RALO_FRAME_SECONDS()
			end
			return 1 / 60
		end
	end

	if className == "TweenService" then
		api.Create = function(_s, instance, info, goal)
			local completed = Signal.new()
			return {
				Completed = completed,
				Play = function()
					for key, value in pairs(goal) do
						instance[key] = value
					end
					completed:Fire("Completed")
				end,
				info = info,
			}
		end
	end

	setmetatable(self, meta)

	-- Mặc định theo lớp
	for key, value in pairs(CLASS_DEFAULTS[className] or {}) do
		props[key] = value
	end

	return self
end

local Instance = { new = makeInstance }
Mock.Instance = Instance

-- Gắn một method vào instance (dùng cho service mock như GetService).
function Mock.AttachApi(instance, key, fn)
	-- metatable.__index đọc api[key]; ta ghi thẳng qua debug-free path:
	-- gán vào props cũng được vì __index kiểm tra props trước.
	instance[key] = fn
end


------------------------------------------------------------------- Services
local function makeService(name)
	local service = Instance.new(name)
	service.Name = name
	return service
end

local DataModel = {}

function Mock.CreateGame()
	local game = makeInstance("DataModel")
	game.Name = "Game"
	local services = {}
	local tagsByInstance = setmetatable({}, { __mode = "k" })
	local instancesByTag = {}
	local addedSignals = {}
	local removedSignals = {}

	local function getTagSignal(signalMap, tag)
		if signalMap[tag] == nil then
			signalMap[tag] = Signal.new()
		end
		return signalMap[tag]
	end

	local function attachCollectionApi(service)
		Mock.AttachApi(service, "GetTagged", function(_self, tag)
			local source = instancesByTag[tag] or {}
			local out = {}
			for _, instance in ipairs(source) do
				local tags = tagsByInstance[instance]
				if tags ~= nil and tags[tag] == true then
					table.insert(out, instance)
				end
			end
			return out
		end)
		Mock.AttachApi(service, "GetInstanceAddedSignal", function(_self, tag)
			return getTagSignal(addedSignals, tag)
		end)
		Mock.AttachApi(service, "GetInstanceRemovedSignal", function(_self, tag)
			return getTagSignal(removedSignals, tag)
		end)
		Mock.AttachApi(service, "AddTag", function(_self, instance, tag)
			local tags = tagsByInstance[instance]
			if tags == nil then
				tags = {}
				tagsByInstance[instance] = tags
			end
			if tags[tag] == true then
				return
			end
			tags[tag] = true
			instancesByTag[tag] = instancesByTag[tag] or {}
			table.insert(instancesByTag[tag], instance)
			getTagSignal(addedSignals, tag):Fire(instance)
		end)
		Mock.AttachApi(service, "RemoveTag", function(_self, instance, tag)
			local tags = tagsByInstance[instance]
			if tags == nil or tags[tag] ~= true then
				return
			end
			tags[tag] = nil
			local list = instancesByTag[tag] or {}
			for index = #list, 1, -1 do
				if list[index] == instance then
					table.remove(list, index)
					break
				end
			end
			getTagSignal(removedSignals, tag):Fire(instance)
		end)
		Mock.AttachApi(service, "HasTag", function(_self, instance, tag)
			local tags = tagsByInstance[instance]
			return tags ~= nil and tags[tag] == true
		end)
		Mock.AttachApi(service, "GetTags", function(_self, instance)
			local out = {}
			for tag, present in pairs(tagsByInstance[instance] or {}) do
				if present then table.insert(out, tag) end
			end
			return out
		end)
	end

	-- GetService là method, phải đưa vào bảng api (không phải property thường).
	Mock.AttachApi(game, "GetService", function(_self, name)
		if services[name] == nil then
			local service = makeInstance(name)
			service.Name = name
			service.Parent = game
			services[name] = service
			if name == "CollectionService" then
				attachCollectionApi(service)
			end
		end
		return services[name]
	end)

	rawset(game, "__services", services)
	return game
end

function Mock.BuildWorld(game, options)
	options = options or {}
	local workspace = game:GetService("Workspace")
	local lighting = game:GetService("Lighting")
	local players = game:GetService("Players")

	workspace.Terrain = Instance.new("Terrain")
	workspace.Terrain.Parent = workspace
	workspace.Terrain.Decoration = true

	local camera = Instance.new("Camera")
	camera.Parent = workspace
	camera.CFrame = makeCFrame(0, 0, 0)
	workspace.CurrentCamera = camera

	local partsFolder = Instance.new("Folder")
	partsFolder.Parent = workspace
	partsFolder.Name = "Props"

	local partCount = options.parts or 220
	local emitterCount = options.emitters or 24
	local farDistance = options.farDistance or 400
	local nearCount = math.floor(partCount * 0.2)

	for i = 1, partCount do
		local part = Instance.new(i % 5 == 0 and "MeshPart" or "Part")
		part.Parent = partsFolder
		part.Name = "Prop" .. i
		local far = i > nearCount
		local d = far and farDistance or 20
		part.CFrame = makeCFrame(d, 0, d)
		part.CastShadow = true
	end

	local effectsFolder = Instance.new("Folder")
	effectsFolder.Parent = workspace
	effectsFolder.Name = "Fx"

	for i = 1, emitterCount do
		local emitter = Instance.new("ParticleEmitter")
		local host = Instance.new("Part")
		host.Parent = effectsFolder
		host.Name = "FxHost" .. i
		emitter.Parent = host
		emitter.Rate = options.emitterRate or 80
		emitter.ParticleCount = options.emitterCount or -1
		emitter.Enabled = true
	end

	-- Nhân vật người chơi
	local player = Instance.new("Player")
	player.Parent = players
	player.Name = "LocalPlayer"
	local character = Instance.new("Model")
	character.Parent = workspace
	character.Name = "Character"
	local humanoid = Instance.new("Humanoid")
	humanoid.Parent = character
	for i = 1, 6 do
		local limb = Instance.new("Part")
		limb.Parent = character
		limb.Name = "Limb" .. i
		limb.CastShadow = true
	end
	player.Character = character
	players.LocalPlayer = player

	local playerGui = Instance.new("PlayerGui")
	playerGui.Parent = player
	playerGui.Name = "PlayerGui"

	local coreGui = game:GetService("CoreGui")
	coreGui.Name = "CoreGui"

	lighting.QualityLevel = options.qualityLevel or 10
	lighting.GraphicsQualityMode = true

	return {
		workspace = workspace,
		lighting = lighting,
		players = players,
		coreGui = coreGui,
		parts = partCount,
		emitters = emitterCount,
	}
end

--[[
	Mô hình chi phí khung hình — xem ghi chú ở đầu tệp.
	Chỉ đếm từ cây instance THẬT của mock, không hard-code kết quả.
]]
function Mock.ComputeFrameCost(game)
	local cost = 1
	-- Gán ra biến local + ipairs: tệp mock này là Lua 5.3 thuần nên KHÔNG
	-- dùng được cú pháp Luau  `for x in <bảng> do`.
	local descendants = game:GetDescendants()
	local ok, err = pcall(function()
		for _, instance in ipairs(descendants) do
			local props = getProps(instance)
			local className = props.ClassName
			if className == "Part" or className == "MeshPart" or className == "UnionOperation" then
				if props.Visible ~= false then
					cost = cost + 0.02
					if props.CastShadow == true then
						cost = cost + 0.012
					end
				end
			elseif className == "ParticleEmitter" then
				if props.Enabled ~= false then
					local rate = tonumber(props.Rate) or 0
					cost = cost + 0.006 * rate
				end
			end
		end
	end)
	if not ok then
		-- Không nuốt lỗi: trả nil kèm thông báo để harness in ra được.
		Mock.lastCostError = tostring(err)
		return nil
	end
	return cost
end

Mock.getProps = getProps

return Mock
