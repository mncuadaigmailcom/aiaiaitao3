--[[
	doors-entity-radar/tools/mock-extensions.luau

	MỞ RỘNG MOCK ROBLOX cho riêng dự án Doors Entity Radar.
	Tệp này CHỈ chạy trong máy ảo kiểm thử (fengari), không bao giờ được
	nạp trong Roblox Studio.

	Lý do cần mở rộng (nói rõ để không ai tưởng harness "thần kỳ"):
	  * mock gốc không có DescendantAdded/Removing -> Scanner không test được;
	  * mock gốc không có Enum.KeyCode/ScrollingDirection/... -> UI không nạp được;
	  * mock gốc không có TextBox.FocusLost, Model:GetPivot, Camera.ViewportSize;
	  * mock gốc không tự bắn DescendantAdded khi set Parent -> phải có hàm
	    mô phỏng rõ ràng (Mock.SimulateAdd) để test điều khiển được thời điểm.

	Mọi thứ ở đây là MÔ PHỎNG NGỮ NGHĨA theo tài liệu Roblox, không phải
	engine thật. Kết quả test chứng minh LOGIC đúng, không chứng minh API
	Roblox thật hành xử giống hệt.
]]

-- Mock được harness nạp vào global __RALO_MOCK TRƯỚC khi chạy tệp này.
local Mock = __RALO_MOCK

if type(Mock) ~= "table" then
	error("mock-extensions.luau cần __RALO_MOCK (nạp tools/test-harness/roblox-mock.luau trước)")
end

---------------------------------------------------------------- Enum còn thiếu
Mock.Enum.Font.Gotham = "Gotham"
Mock.Enum.Font.GothamBold = Mock.Enum.Font.GothamBold or "GothamBold"
Mock.Enum.KeyCode = { F2 = "F2", F1 = "F1", Unknown = "Unknown" }
Mock.Enum.UserInputState = { Begin = "Begin", Change = "Change", End = "End", None = "None" }
Mock.Enum.ContextActionResult = { PassThrough = "PassThrough", Sink = "Sink" }
Mock.Enum.ScrollingDirection = { X = "X", Y = "Y", XY = "XY" }
Mock.Enum.KeyModifierNames = { None = "None" }
Mock.Enum.UserInputType = {
	MouseButton1 = "MouseButton1", MouseButton2 = "MouseButton2", MouseButton3 = "MouseButton3",
	Touch = "Touch", Keyboard = "Keyboard", MouseMovement = "MouseMovement",
	MouseWheel = "MouseWheel", Gamepad1 = "Gamepad1",
}
Mock.Enum.SpecialKey = { ChatHotkey = "ChatHotkey" }

---------------------------------------------------------------- Instance extras
local rawNew = Mock.Instance.new

-- Các class cần tín hiệu DescendantAdded/Removing theo API Roblox.
local DESCENDANT_SIGNAL_CLASSES = {
	Workspace = true, Folder = true, Model = true, DataModel = true, PlayerGui = true,
}

-- Các class GUI: mock gốc chỉ có MouseButton1Click, thiếu InputBegan/InputEnded
-- nên tính năng KÉO THẢ bằng chuột/cảm ứng không test được nếu không bổ sung.
local GUI_CLASSES = {
	Frame = true, TextLabel = true, TextButton = true, TextBox = true,
	ScrollingFrame = true, ImageButton = true, ScreenGui = true,
}

-- Đánh dấu instance đã được bổ sung API để KHÔNG gắn lại lần hai
-- (gắn lại sẽ tạo bộ attribute mới và mất dữ liệu test đang có).
local upgraded = setmetatable({}, { __mode = "k" })

--[[
	Mock.UpgradeInstance(instance, className)

	Gắn các API mà mock gốc chưa có. Được gọi từ HAI nơi:
	  1) Mock.Instance.new (instance do test tạo ra);
	  2) Mock.UpgradeExisting (instance/service do mock gốc tạo TRƯỚC khi tệp
	     này chạy — ví dụ game:GetService("ContextActionService")).
	Hàm phải IDEMPOTENT vì một instance có thể đi qua cả hai đường.
]]
function Mock.UpgradeInstance(instance, className)
	if instance == nil or upgraded[instance] then
		return false
	end
	upgraded[instance] = true
	className = className or instance.ClassName

	-- Attribute API (mock gốc chưa có). Scanner dùng nó cho cầu dữ liệu
	-- nhà phát triển, nên bắt buộc phải mô phỏng đúng ngữ nghĩa đọc/ghi.
	do
		local attributes = {}
		Mock.AttachApi(instance, "SetAttribute", function(_self, key, value)
			attributes[key] = value
		end)
		Mock.AttachApi(instance, "GetAttribute", function(_self, key)
			return attributes[key]
		end)
		Mock.AttachApi(instance, "GetAttributes", function(_self)
			local copy = {}
			for key, value in pairs(attributes) do
				copy[key] = value
			end
			return copy
		end)
	end

	if DESCENDANT_SIGNAL_CLASSES[className] then
		Mock.AttachApi(instance, "DescendantAdded", Mock.Signal.new())
		Mock.AttachApi(instance, "DescendantRemoving", Mock.Signal.new())
	end

	-- GuiObject thật có InputBegan/InputEnded (dùng cho kéo thả bằng chuột/cảm ứng).
	if GUI_CLASSES[className] then
		Mock.AttachApi(instance, "InputBegan", Mock.Signal.new())
		Mock.AttachApi(instance, "InputEnded", Mock.Signal.new())
		Mock.AttachApi(instance, "MouseEnter", Mock.Signal.new())
		Mock.AttachApi(instance, "MouseLeave", Mock.Signal.new())
		Mock.AttachApi(instance, "GetPropertyChangedSignal", function(_self, property)
			local signals = rawget(instance, "__changedSignals")
			if signals == nil then
				signals = {}
				rawset(instance, "__changedSignals", signals)
			end
			if signals[property] == nil then
				signals[property] = Mock.Signal.new()
			end
			return signals[property]
		end)
	end

	if className == "TextBox" then
		Mock.AttachApi(instance, "FocusLost", Mock.Signal.new())
		Mock.AttachApi(instance, "ReleaseFocus", function() end)
	end

	if className == "Model" then
		-- GetPivot: ưu tiên PrimaryPart, rồi tới part con đầu tiên.
		Mock.AttachApi(instance, "GetPivot", function(self)
			local primary = self.PrimaryPart
			if primary ~= nil and primary.CFrame ~= nil then
				return primary.CFrame
			end
			for _, child in ipairs(self:GetChildren()) do
				if child.CFrame ~= nil then
					return child.CFrame
				end
			end
			return { Position = Mock.Vector3.new(0, 0, 0) }
		end)
		Mock.AttachApi(instance, "GetPrimaryPartCFrame", function(self)
			local primary = self.PrimaryPart
			if primary == nil then
				error("Model không có PrimaryPart")
			end
			return primary.CFrame
		end)
	end

	if className == "Camera" then
		instance.ViewportSize = Mock.Vector2.new(1280, 720)
		instance.FieldOfView = 70
	end

	if className == "Player" then
		Mock.AttachApi(instance, "CharacterAdded", Mock.Signal.new())
	end

	if className == "PlayerGui" or className == "CoreGui" then
		-- Không cần thêm gì ngoài tín hiệu DescendantAdded ở trên.
	end

	if className == "ContextActionService" then
		local bound = {}
		Mock.AttachApi(instance, "BindAction", function(_self, actionName, fn, createTouchButton, ...)
			bound[actionName] = { fn = fn, touch = createTouchButton, inputs = { ... } }
		end)
		Mock.AttachApi(instance, "UnbindAction", function(_self, actionName)
			bound[actionName] = nil
		end)
		Mock.AttachApi(instance, "GetBoundActionInfo", function(_self, actionName)
			return bound[actionName] or {}
		end)
		Mock.AttachApi(instance, "UnbindAllActions", function()
			for actionName in pairs(bound) do
				bound[actionName] = nil
			end
		end)
		Mock.__boundActions = bound
	end

	if className == "UserInputService" then
		Mock.AttachApi(instance, "InputBegan", Mock.Signal.new())
		Mock.AttachApi(instance, "InputChanged", Mock.Signal.new())
		Mock.AttachApi(instance, "InputEnded", Mock.Signal.new())
		Mock.AttachApi(instance, "GetMouseLocation", function()
			return Mock.Vector2.new(0, 0)
		end)
		instance.TouchEnabled = false
		instance.KeyboardEnabled = true
	end

	return true
end

Mock.Instance.new = function(className)
	local instance = rawNew(className)
	Mock.UpgradeInstance(instance, className)
	return instance
end

--------------------------------------------------------- Mô phỏng sự kiện cây
--[[
	Gắn một instance vào cây VÀ bắn DescendantAdded dọc lên tổ tiên, giống
	hành vi Roblox. Test phải gọi hàm này thay vì set Parent trực tiếp nếu
	muốn Scanner "nhìn thấy" instance mới.
]]
function Mock.SimulateAdd(root, instance, parent)
	if parent ~= nil then
		instance.Parent = parent
	else
		instance.Parent = root
	end
	-- Bắn từ nút cha lên tới gốc.
	local node = instance.Parent
	local guard = 0
	while node ~= nil and guard < 64 do
		local signal = node.DescendantAdded
		if signal ~= nil and signal.Fire ~= nil then
			signal:Fire(instance)
		end
		node = node.Parent
		guard = guard + 1
	end
	return instance
end

-- Bắn DescendantRemoving rồi mới gỡ khỏi cây (đúng thứ tự của Roblox).
function Mock.SimulateRemove(instance)
	local node = instance.Parent
	local chain = {}
	local guard = 0
	while node ~= nil and guard < 64 do
		chain[#chain + 1] = node
		node = node.Parent
		guard = guard + 1
	end
	for _, ancestor in ipairs(chain) do
		local signal = ancestor.DescendantRemoving
		if signal ~= nil and signal.Fire ~= nil then
			signal:Fire(instance)
		end
	end
	instance.Parent = nil
	return true
end

--------------------------------------------------------------- Nhân vật/camera
-- Đặt vị trí nhân vật người chơi (tạo HumanoidRootPart nếu chưa có).
function Mock.SetupPlayerPosition(game, x, y, z)
	local players = game:GetService("Players")
	local player = players.LocalPlayer
	local character = player.Character
	if character == nil then
		character = Mock.Instance.new("Model")
		character.Name = "Character"
		character.Parent = game:GetService("Workspace")
		player.Character = character
	end
	local rootPart = character:FindFirstChild("HumanoidRootPart")
	if rootPart == nil then
		rootPart = Mock.Instance.new("Part")
		rootPart.Name = "HumanoidRootPart"
		rootPart.Parent = character
	end
	rootPart.CFrame = Mock.CFrame.new(x, y, z)
	return rootPart
end

-- Đặt hướng nhìn của camera (mặc định nhìn về -Z, đúng quy ước Roblox).
function Mock.SetupCamera(game, x, y, z, lookX, lookY, lookZ)
	local camera = game:GetService("Workspace").CurrentCamera
	if camera == nil then
		camera = Mock.Instance.new("Camera")
		camera.Parent = game:GetService("Workspace")
		game:GetService("Workspace").CurrentCamera = camera
	end
	lookX = lookX or 0
	lookY = lookY or 0
	lookZ = lookZ or -1
	-- right = look × up, khớp với RightVector thật của Roblox.
	local rightX = -lookZ
	local rightZ = lookX
	camera.CFrame = {
		Position = Mock.Vector3.new(x or 0, y or 0, z or 0),
		LookVector = Mock.Vector3.new(lookX, lookY, lookZ),
		RightVector = Mock.Vector3.new(rightX, 0, rightZ),
		UpVector = Mock.Vector3.new(0, 1, 0),
	}
	return camera
end

-- Tạo một instance "thực thể giả" có vị trí, đặt tên theo ý test.
function Mock.SpawnEntity(game, name, x, y, z, className, parent)
	local instance = Mock.Instance.new(className or "Model")
	instance.Name = name
	if className == "Model" or className == nil then
		local part = Mock.Instance.new("Part")
		part.Name = "Root"
		part.CFrame = Mock.CFrame.new(x or 0, y or 0, z or 0)
		part.Parent = instance
		instance.PrimaryPart = part
	else
		instance.CFrame = Mock.CFrame.new(x or 0, y or 0, z or 0)
	end
	Mock.SimulateAdd(game:GetService("Workspace"), instance, parent)
	return instance
end

--[[
	Nâng cấp các instance ĐÃ TỒN TẠI trước khi tệp này chạy (Workspace,
	Camera, các Folder do BuildWorld tạo). Không có bước này thì Workspace
	sinh ra trước sẽ thiếu DescendantAdded và Scanner không test được.
]]
function Mock.UpgradeExisting(game)
	if game == nil then
		return 0
	end
	local upgraded = 0
	local targets = { game }
	for _, descendant in ipairs(game:GetDescendants()) do
		targets[#targets + 1] = descendant
	end
	-- mock gốc tạo service bằng makeInstance() NỘI BỘ, không đi qua
	-- Mock.Instance.new, nên service (ContextActionService, UserInputService...)
	-- sẽ thiếu API nếu ta không bọc GetService ở đây.
	if rawget(game, "__derServiceHook") == nil then
		local rawGetService = game.GetService
		Mock.AttachApi(game, "GetService", function(self, name)
			local service = rawGetService(self, name)
			Mock.UpgradeInstance(service, name)
			return service
		end)
		rawset(game, "__derServiceHook", true)
	end

	for _, instance in ipairs(targets) do
		local className = instance.ClassName
		Mock.UpgradeInstance(instance, className)
		if DESCENDANT_SIGNAL_CLASSES[className] then
			if instance.DescendantAdded == nil then
				Mock.AttachApi(instance, "DescendantAdded", Mock.Signal.new())
				upgraded = upgraded + 1
			end
			if instance.DescendantRemoving == nil then
				Mock.AttachApi(instance, "DescendantRemoving", Mock.Signal.new())
			end
		end
		if className == "Camera" and instance.ViewportSize == nil then
			instance.ViewportSize = Mock.Vector2.new(1280, 720)
		end
		-- Roblox thật phơi player.PlayerGui như một PROPERTY (không chỉ là con).
		if className == "Player" and instance.PlayerGui == nil then
			instance.PlayerGui = instance:FindFirstChild("PlayerGui")
		end
		if className == "Model" and instance.GetPivot == nil then
			Mock.AttachApi(instance, "GetPivot", function(self)
				local primary = self.PrimaryPart
				if primary ~= nil and primary.CFrame ~= nil then
					return primary.CFrame
				end
				return { Position = Mock.Vector3.new(0, 0, 0) }
			end)
		end
	end
	return upgraded
end

-- Trả về `true` chứ KHÔNG trả bảng Mock: harness đọc giá trị trả về sang
-- JS bằng cách duyệt đệ quy, mà bảng Mock thì lớn và có tham chiếu vòng.
return true
