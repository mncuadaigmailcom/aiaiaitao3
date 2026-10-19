--[[
	bundle/doors-entity-radar.luau
	TỆP SINH TỰ ĐỘNG bởi doors-entity-radar/tools/bundle.js — ĐỪNG SỬA TAY.
	Nguồn: doors-entity-radar/src/**.luau  (23 module)

	CÁCH NẠP (Roblox Studio):
	  1. StarterPlayer > StarterPlayerScripts > Insert Object > LocalScript
	  2. Dán TOÀN BỘ nội dung tệp này vào LocalScript đó
	  3. Play. Bảng điều khiển hiện ra; mặc định tự khởi động.

	KHÔNG dùng loadstring, KHÔNG dùng executor: bundle là mã Luau nằm sẵn
	trong game của bạn. Nó chỉ ĐỌC những gì client được phép đọc.
]]

local __DER_MODULES = {
	["Client/Bootstrap"] = [=[
--[[
	doors-entity-radar/src/Client/Bootstrap.luau
	**LocalScript** — đây là TỆP DUY NHẤT bạn phải đặt/chạy phía client.

	Vị trí:
	  Cách A (nhiều tệp / Rojo):
	    StarterPlayer > StarterPlayerScripts > DoorsEntityRadar  (LocalScript, tệp này)
	    ReplicatedStorage > DoorsEntityRadar > Shared/*, Client/*  (ModuleScript)
	  Cách B (một tệp):
	    StarterPlayer > StarterPlayerScripts > (LocalScript) rồi dán
	    nội dung dist/doors-entity-radar.luau vào. Bundle tự cài bộ nạp nên
	    tệp này KHÔNG cần cây thư mục.

	Nhiệm vụ:
	  1. Cài bộ nạp module (__DER_REQUIRE) nếu chưa có.
	  2. Tạo Radar, gắn phím tắt, tự khởi động nếu cấu hình cho phép.
	  3. Phơi `_G.__DER_RADAR` để bạn điều khiển/kiểm tra từ Command Bar.

	Tệp này KHÔNG sửa gì trong trò chơi: không đổi Lighting, không đổi
	nhân vật, không đụng script khác.
]]

local function ensureLoader()
	-- Bundle một tệp đã cài sẵn __DER_REQUIRE.
	if _G.__DER_REQUIRE ~= nil then
		return true, "Dùng bộ nạp của bundle."
	end

	local ok, replicatedStorage = pcall(function()
		return game:GetService("ReplicatedStorage")
	end)
	if not ok or replicatedStorage == nil then
		return false, "Không lấy được ReplicatedStorage để tìm module."
	end

	local root = replicatedStorage:FindFirstChild("DoorsEntityRadar")
	if root == nil then
		-- Chờ một chút: LocalScript có thể chạy trước khi module được nhân bản.
		local okWait, waited = pcall(function()
			return replicatedStorage:WaitForChild("DoorsEntityRadar", 10)
		end)
		if okWait then
			root = waited
		end
	end
	if root == nil then
		return false, "Không thấy ReplicatedStorage.DoorsEntityRadar. Kiểm tra lại vị trí đặt thư mục."
	end

	local shared = root:FindFirstChild("Shared")
	local shimModule = shared and shared:FindFirstChild("RequireShim")
	if shimModule == nil then
		return false, "Không thấy ReplicatedStorage.DoorsEntityRadar.Shared.RequireShim."
	end

	local okRequire, shim = pcall(require, shimModule)
	if not okRequire then
		return false, "require(RequireShim) thất bại: " .. tostring(shim)
	end
	shim.Install({ game = game })
	return _G.__DER_REQUIRE ~= nil, "Đã cài bộ nạp module từ cây instance."
end

local loaderOk, loaderMessage = ensureLoader()
if not loaderOk then
	warn("[DER] Không khởi động được: " .. tostring(loaderMessage))
	return
end

local Shared_Log = __DER_REQUIRE("Shared/Log")
local Shared_Config = __DER_REQUIRE("Shared/Config")
local Shared_Safe = __DER_REQUIRE("Shared/Safe")
local Client_Registry = __DER_REQUIRE("Client/Core/Registry")
local Client_Radar = __DER_REQUIRE("Client/Radar")

Shared_Log.SetLevel((Shared_Config.Log and Shared_Config.Log.level) or "info")
Shared_Log.Info(("Khởi động %s v%s"):format(Shared_Config.Meta.name, Shared_Config.Meta.version))
Shared_Log.Info(loaderMessage)
Shared_Log.Info("Bản chất hệ thống: " .. Shared_Config.Meta.purpose)

local radar = Client_Radar.new(Shared_Config)
_G.__DER_RADAR = radar

--[[
	PHÍM TẮT. Ưu tiên ContextActionService vì nó hỗ trợ luôn nút cảm ứng
	trên điện thoại. Luôn trả về PassThrough: hệ thống KHÔNG được nuốt
	phím của trò chơi.
]]
local function bindToggleKey()
	local systemConfig = Shared_Config.System or {}
	local keyCode = systemConfig.toggleKeyCode
	if keyCode == nil then
		return false, "Không cấu hình phím tắt."
	end

	local contextAction, contextErr = Shared_Safe.GetService("ContextActionService")
	if contextAction ~= nil then
		local bindMethod = Shared_Safe.Read(contextAction, "BindAction")
		if bindMethod ~= nil then
			local ok, err = pcall(function()
				contextAction:BindAction("DER_TogglePanel", function(_actionName, inputState)
					if inputState == Enum.UserInputState.Begin then
						radar:ToggleVisible()
					end
					-- Luôn nhường phím lại cho trò chơi.
					return Enum.ContextActionResult.PassThrough
				end, systemConfig.allowTouchToggle ~= false, keyCode)
			end)
			if ok then
				-- Đăng ký cách gỡ: ContextActionService không trả về connection,
				-- nên phải nhớ mà UnbindAction khi huỷ hệ thống.
				Client_Registry.AddCleanup(function()
					contextAction:UnbindAction("DER_TogglePanel")
				end, "unbindTogglePanel")
				return true, "Đã gắn phím tắt qua ContextActionService."
			end
			Shared_Log.Warn("BindAction thất bại: " .. tostring(err))
		end
	else
		Shared_Log.Warn("Không có ContextActionService: " .. tostring(contextErr))
	end

	-- Dự phòng: UserInputService.
	local userInput = Shared_Safe.GetService("UserInputService")
	if userInput == nil then
		return false, "Không có ContextActionService lẫn UserInputService: bỏ qua phím tắt."
	end
	local inputBegan = Shared_Safe.Read(userInput, "InputBegan")
	local connection, connectErr = Client_Registry.Connect(inputBegan, function(input, gameProcessed)
		if gameProcessed then
			return -- không giành phím khi người chơi đang gõ chat
		end
		if input ~= nil and input.KeyCode == keyCode then
			radar:ToggleVisible()
		end
	end, "Radar.InputBegan")
	if connection == nil then
		return false, "Không nối được InputBegan: " .. tostring(connectErr)
	end
	return true, "Đã gắn phím tắt qua UserInputService."
end

local bindOk, bindMessage = bindToggleKey()
if bindOk then
	Shared_Log.Info(bindMessage)
else
	Shared_Log.Warn(bindMessage .. " (vẫn dùng được các nút trên bảng điều khiển)")
end

-- Chế độ kiểm thử: harness nạp Bootstrap nhưng muốn TỰ gọi Start() để
-- kiểm soát thời điểm. Cờ này không tồn tại trong Roblox Studio.
if _G.__DER_NO_AUTORUN == true then
	Shared_Log.Info("__DER_NO_AUTORUN = true: bỏ qua autoStart (chế độ kiểm thử).")
elseif Shared_Config.System and Shared_Config.System.autoStart == true then
	local ok, message = radar:Start()
	if ok then
		Shared_Log.Info("Sẵn sàng: " .. tostring(message))
	else
		Shared_Log.Warn("Khởi động chưa trọn vẹn: " .. tostring(message))
	end
else
	Shared_Log.Info("autoStart = false: bấm nút 'Khởi động' trên bảng để chạy.")
end

--[[
	CÁCH ĐIỀU KHIỂN TỪ COMMAND BAR (Studio > View > Command Bar):
	  _G.__DER_RADAR:Start()        -- khởi động
	  _G.__DER_RADAR:Pause()        -- tạm dừng
	  _G.__DER_RADAR:Resume()       -- tiếp tục
	  _G.__DER_RADAR:Stop()         -- dừng hẳn
	  _G.__DER_RADAR:Refresh()      -- quét lại ngay
	  _G.__DER_RADAR:SetArea("hotel")
	  _G.__DER_RADAR:SetQuery("rush")
	  _G.__DER_RADAR:Select("rush")        -- xem chi tiết một mục
	  print(_G.__DER_RADAR:Stats())        -- bộ đếm, connection, số lần quét

	TAB / LỰA CHỌN / THEO DÕI:
	  _G.__DER_RADAR:SetTab("hotel")       -- chuyển tab (home, all, hotel, mines,
	                                       --   backdoor, archives, outdoors,
	                                       --   stairwell, rooms, events, selected,
	                                       --   settings, log)
	  _G.__DER_RADAR:ToggleSelect("rush")  -- chọn/bỏ chọn một mục
	  _G.__DER_RADAR:SelectScope(true)     -- chọn tất cả TRONG PHẠM VI đang xem
	  _G.__DER_RADAR:SelectAllAreas()      -- chọn toàn bộ 82 mục
	  _G.__DER_RADAR:ClearSelection()      -- bỏ chọn toàn bộ
	  _G.__DER_RADAR:SetSelectionFilter("selected")  -- all | selected | unselected
	  _G.__DER_RADAR:ToggleTrack("rush")   -- bật/tắt ghi nhật ký khi thấy mục này
	  _G.__DER_RADAR:SetTrackedForSelection(true)    -- theo dõi cả nhóm đã chọn
	  print(_G.__DER_RADAR.selection:Count())        -- số mục đang chọn
	  _G.__DER_RADAR:Destroy()      -- huỷ sạch (connection và GUI về 0)
]]

return radar
]=],
	["Client/Core/Env"] = [=[
--[[
	doors-entity-radar/src/Client/Core/Env.luau
	ModuleScript — đặt tại: DoorsEntityRadar.Client.Core.Env

	CỔNG TRUY CẬP MÔI TRƯỜNG. Mọi nơi cần service, người chơi, nhân vật,
	camera đều đi qua đây để:
	  * không nơi nào tự gọi game:GetService rồi ném lỗi khi service vắng mặt;
	  * có MỘT bảng năng lực (capabilities) để UI nói thật những gì đang
	    thiếu, thay vì âm thầm cho ra kết quả sai.

	Tệp này chỉ ĐỌC. Không ghi property nào của trò chơi.
]]

local Shared_Safe = __DER_REQUIRE("Shared/Safe")
local Shared_Log = __DER_REQUIRE("Shared/Log")
local Shared_Geometry = __DER_REQUIRE("Shared/Geometry")

local Env = {}

-- Cache service theo tên. `false` nghĩa là đã thử và không lấy được.
Env.services = {}
Env.lastError = nil

-- Lấy service có cache. Trả về (service, errorMessage).
function Env.GetService(name)
	local cached = Env.services[name]
	if cached ~= nil then
		if cached == false then
			return nil, Env.lastError or ("service '%s' không khả dụng"):format(name)
		end
		return cached, nil
	end
	local service, err = Shared_Safe.GetService(name)
	if service == nil then
		Env.services[name] = false
		Env.lastError = err
		return nil, err
	end
	Env.services[name] = service
	return service, nil
end

function Env.GetWorkspace()
	return Env.GetService("Workspace")
end

function Env.GetPlayers()
	return Env.GetService("Players")
end

-- Người chơi cục bộ. Trong Script phía server giá trị này không có nghĩa.
function Env.GetLocalPlayer()
	local players = Env.GetPlayers()
	if players == nil then
		return nil
	end
	local ok, player = pcall(function()
		return players.LocalPlayer
	end)
	if not ok or player == nil then
		return nil
	end
	return player
end

function Env.GetPlayerGui()
	local player = Env.GetLocalPlayer()
	if player == nil then
		return nil
	end
	local ok, playerGui = pcall(function()
		return player:WaitForChild("PlayerGui")
	end)
	if not ok or playerGui == nil then
		return nil
	end
	return playerGui
end

function Env.GetCharacter()
	local player = Env.GetLocalPlayer()
	if player == nil then
		return nil
	end
	local ok, character = pcall(function()
		return player.Character
	end)
	if not ok or character == nil then
		return nil
	end
	return character
end

function Env.GetCamera()
	local workspace = Env.GetWorkspace()
	if workspace == nil then
		return nil
	end
	local ok, camera = pcall(function()
		return workspace.CurrentCamera
	end)
	if not ok or camera == nil then
		return nil
	end
	return camera
end

--[[
	VỊ TRÍ NGƯỜI CHƠI. Trả về (position, reason).
	Thử HumanoidRootPart trước, rồi tới các part thân người quen thuộc.
	Không có vị trí người chơi thì KHÔNG tính được khoảng cách — và hệ
	thống phải nói rõ điều đó chứ không lấy vị trí của thứ khác thế vào.
]]
Env.ROOT_PART_NAMES = { "HumanoidRootPart", "UpperTorso", "Torso", "LowerTorso" }

function Env.GetPlayerPosition()
	local character = Env.GetCharacter()
	if character == nil then
		return nil, "Chưa có nhân vật (Character = nil) — có thể đang chết hoặc chưa spawn."
	end
	for _, partName in ipairs(Env.ROOT_PART_NAMES) do
		local part = character:FindFirstChild(partName)
		if part ~= nil then
			local position, reason = Shared_Geometry.ReadPosition(part)
			if position ~= nil then
				return position, ("Lấy từ %s. %s"):format(partName, tostring(reason))
			end
		end
	end
	return nil, "Nhân vật tồn tại nhưng không tìm thấy HumanoidRootPart/Torso hợp lệ."
end

--[[
	VECTOR HƯỚNG NHÌN của camera. Trả về (lookVector, rightVector).
	rightVector có thể nil — Geometry tự suy ra từ lookVector.
]]
function Env.GetCameraBasis()
	local camera = Env.GetCamera()
	if camera == nil then
		return nil, nil
	end
	local look, cframe = Shared_Safe.Read(camera, "CFrame")
	if not cframe or look == nil then
		return nil, nil
	end
	local lookVector = nil
	local okLook, value = pcall(function()
		return look.LookVector
	end)
	if okLook and Shared_Geometry.IsPositionVector(value) then
		lookVector = value
	end
	local rightVector = nil
	local okRight, rightValue = pcall(function()
		return look.RightVector
	end)
	if okRight and Shared_Geometry.IsPositionVector(rightValue) then
		rightVector = rightValue
	end
	return lookVector, rightVector
end

--[[
	BẢNG NĂNG LỰC. Trả về bảng { tên = { ok = bool, detail = string } }.
	UI hiển thị đúng bảng này: thiếu gì nói nấy, không đoán.
]]
function Env.Capabilities()
	local report = {}

	local workspace, workspaceErr = Env.GetWorkspace()
	report.workspace = {
		ok = workspace ~= nil,
		detail = workspace ~= nil and "Đã lấy được Workspace." or ("Không lấy được Workspace: " .. tostring(workspaceErr)),
	}

	local player = Env.GetLocalPlayer()
	report.localPlayer = {
		ok = player ~= nil,
		detail = player ~= nil and ("Người chơi: " .. tostring(player.Name)) or "Không có Players.LocalPlayer (script không chạy ở client?).",
	}

	local position, positionReason = Env.GetPlayerPosition()
	report.playerPosition = {
		ok = position ~= nil,
		detail = tostring(positionReason),
	}

	local lookVector = Env.GetCameraBasis()
	report.camera = {
		ok = lookVector ~= nil,
		detail = lookVector ~= nil and "Đọc được hướng camera (tính được hướng tương đối)."
			or "Không đọc được hướng camera: chỉ hiện khoảng cách, không hiện hướng.",
	}

	local playerGui = Env.GetPlayerGui()
	report.playerGui = {
		ok = playerGui ~= nil,
		detail = playerGui ~= nil and "Có PlayerGui để gắn giao diện." or "Không có PlayerGui: không dựng được giao diện.",
	}

	local userInput, uisErr = Env.GetService("UserInputService")
	local hasInputBegan = false
	if userInput ~= nil then
		local signal = Shared_Safe.Read(userInput, "InputBegan")
		hasInputBegan = signal ~= nil
	end
	report.userInput = {
		ok = userInput ~= nil and hasInputBegan,
		detail = userInput == nil and ("Không có UserInputService: " .. tostring(uisErr))
			or (hasInputBegan and "Có UserInputService (phím tắt hoạt động)."
				or "UserInputService tồn tại nhưng thiếu InputBegan: bỏ qua phím tắt."),
	}

	return report
end

-- Đếm số năng lực đạt — dùng cho dòng tóm tắt trên UI.
function Env.CountReady(report)
	local ready, total = 0, 0
	for _, entry in pairs(report or {}) do
		total = total + 1
		if entry.ok then
			ready = ready + 1
		end
	end
	return ready, total
end

-- Ghi toàn bộ năng lực thiếu ra Output để người dùng biết vì sao thiếu dữ liệu.
function Env.LogMissing(report)
	local missing = 0
	for name, entry in pairs(report or {}) do
		if not entry.ok then
			missing = missing + 1
			Shared_Log.Warn(("thiếu năng lực '%s': %s"):format(name, tostring(entry.detail)))
		end
	end
	return missing
end

-- Đặt lại cache (chỉ dùng trong kiểm thử).
function Env.Reset()
	Env.services = {}
	Env.lastError = nil
end

return Env
]=],
	["Client/Core/Matcher"] = [=[
--[[
	doors-entity-radar/src/Client/Core/Matcher.luau
	ModuleScript — đặt tại: DoorsEntityRadar.Client.Core.Matcher

	BỘ KHỚP TÊN. Biến danh mục + cấu hình thành cấu trúc tra cứu nhanh:
	  exact[key]    = { entityId, ... }   — khoá tên bằng nhau
	  contains      = { { key, id }, ... } — khoá tên có chứa mẫu
	  unsupported   = { [entityId] = lý do }
	  confirmed     = { [entityId] = true }

	VÌ SAO PHẢI TÁCH: khớp tên chạy với MỌI instance mới xuất hiện, nên
	nó phải là tra cứu O(1) thay vì duyệt toàn bộ mẫu. Duyệt mẫu chỉ xảy
	ra với các luật "contains" (rất ít).
]]

local Shared_Catalog = __DER_REQUIRE("Shared/EntityCatalog")

local Matcher = {}

-- Dùng đúng hàm chuẩn hoá của danh mục để hai bên không lệch nhau.
Matcher.Normalize = Shared_Catalog.NormalizeKey

--[[
	Dựng bộ khớp.
	config là Config.Detection (có thể nil khi kiểm thử -> dùng mặc định).
]]
function Matcher.Build(detectionConfig)
	detectionConfig = detectionConfig or {}
	local matcher = {
		exact = {},
		contains = {},
		unsupported = {},
		confirmed = {},
		entityIds = {},
		patternCount = 0,
		aliasCount = 0,
	}

	local extras = detectionConfig.extraPatterns or {}
	local forcedUnsupported = detectionConfig.unsupported or {}
	local confirmedEntities = detectionConfig.confirmedEntities or {}
	local confirmedPatterns = detectionConfig.confirmedPatterns or {}

	-- Tập tên đã xác minh (đã chuẩn hoá) để tra nhanh.
	local confirmedKeys = {}
	for _, rawName in ipairs(confirmedPatterns) do
		local key = Matcher.Normalize(rawName)
		if #key > 0 then
			confirmedKeys[key] = true
		end
	end
	matcher.confirmedKeys = confirmedKeys

	for _, entry in ipairs(Shared_Catalog.List) do
		-- 1) Ép "không hỗ trợ" từ cấu hình có ưu tiên cao nhất.
		local forcedReason = forcedUnsupported[entry.id]
		if forcedReason ~= nil then
			matcher.unsupported[entry.id] = tostring(forcedReason)
		elseif entry.detect.method == "unsupported" then
			matcher.unsupported[entry.id] = entry.detect.reason or "Không có cơ chế phát hiện hợp lệ."
		else
			matcher.entityIds[#matcher.entityIds + 1] = entry.id

			-- 2) Gom mẫu: mẫu của mục + mẫu của alias + mẫu người dùng thêm.
			local keys = Shared_Catalog.GetMatchKeys(entry)
			if entry.detect.aliasOf ~= nil then
				matcher.aliasCount = matcher.aliasCount + 1
			end
			for _, extra in ipairs(extras[entry.id] or {}) do
				local key = Matcher.Normalize(extra)
				if #key > 0 then
					keys[#keys + 1] = key
				end
			end

			-- 3) Nạp vào chỉ mục, bỏ trùng.
			local seen = {}
			for _, key in ipairs(keys) do
				if not seen[key] then
					seen[key] = true
					matcher.patternCount = matcher.patternCount + 1
					if entry.detect.matchMode == "contains" then
						matcher.contains[#matcher.contains + 1] = { key = key, id = entry.id }
					else
						if matcher.exact[key] == nil then
							matcher.exact[key] = {}
						end
						local bucket = matcher.exact[key]
						bucket[#bucket + 1] = entry.id
					end
					if confirmedKeys[key] then
						matcher.confirmed[entry.id] = true
					end
				end
			end

			-- 4) Xác minh trực tiếp theo id (không cần biết tên instance).
			if confirmedEntities[entry.id] == true then
				matcher.confirmed[entry.id] = true
			end
		end
	end

	table.sort(matcher.entityIds)
	return matcher
end

-- Một tên instance có khớp luật nào không? Trả về bảng id (có thể rỗng).
function Matcher.Match(matcher, instanceName)
	local hits = {}
	if matcher == nil or type(instanceName) ~= "string" then
		return hits
	end
	local key = Matcher.Normalize(instanceName)
	if #key == 0 then
		return hits
	end

	local exactHits = matcher.exact[key]
	if exactHits ~= nil then
		for _, entityId in ipairs(exactHits) do
			hits[entityId] = true
		end
	end

	-- Chỉ duyệt các luật "contains" — số lượng nhỏ và cố định.
	for _, rule in ipairs(matcher.contains) do
		if string.find(key, rule.key, 1, true) ~= nil then
			hits[rule.id] = true
		end
	end

	return hits
end

-- Trả về danh sách id (mảng) thay vì bảng băm, tiện cho vòng lặp.
function Matcher.MatchList(matcher, instanceName)
	local hits = Matcher.Match(matcher, instanceName)
	local list = {}
	for entityId in pairs(hits) do
		list[#list + 1] = entityId
	end
	table.sort(list)
	return list
end

-- Mục này có được coi là "đã xác minh mẫu tên" không?
function Matcher.IsConfirmed(matcher, entityId)
	if matcher == nil then
		return false
	end
	return matcher.confirmed[entityId] == true
end

-- Mục này có bị coi là không hỗ trợ phát hiện không? Trả về (bool, lý do).
function Matcher.GetUnsupportedReason(matcher, entityId)
	if matcher == nil then
		return false, nil
	end
	local reason = matcher.unsupported[entityId]
	if reason == nil then
		return false, nil
	end
	return true, reason
end

-- Số luật khớp — dùng cho bảng chẩn đoán và kiểm thử.
function Matcher.Stats(matcher)
	if matcher == nil then
		return { exactKeys = 0, containsRules = 0, patterns = 0, entities = 0, confirmed = 0, unsupported = 0 }
	end
	local exactKeys = 0
	for _ in pairs(matcher.exact) do
		exactKeys = exactKeys + 1
	end
	local confirmedCount = 0
	for _ in pairs(matcher.confirmed) do
		confirmedCount = confirmedCount + 1
	end
	local unsupportedCount = 0
	for _ in pairs(matcher.unsupported) do
		unsupportedCount = unsupportedCount + 1
	end
	return {
		exactKeys = exactKeys,
		containsRules = #matcher.contains,
		patterns = matcher.patternCount,
		entities = #matcher.entityIds,
		confirmed = confirmedCount,
		unsupported = unsupportedCount,
		aliases = matcher.aliasCount,
	}
end

return Matcher
]=],
	["Client/Core/Registry"] = [=[
--[[
	doors-entity-radar/src/Client/Core/Registry.luau
	ModuleScript — đặt tại: DoorsEntityRadar.Client.Core.Registry

	SỔ ĐĂNG KÝ TÀI NGUYÊN. Mọi connection và mọi instance do dự án tạo đều
	phải đăng ký ở đây, để khi tắt hệ thống ta dọn được SẠCH và chứng minh
	được là đã sạch (ConnectionCount/InstanceCount về 0 — có test kiểm tra).

	Không đăng ký = rò rỉ. Đó là lý do tệp này tồn tại.
]]

local Shared_Safe = __DER_REQUIRE("Shared/Safe")
local Shared_Log = __DER_REQUIRE("Shared/Log")

local Registry = {}

-- Danh sách connection: { connection, label }
Registry.connections = {}
-- Danh sách instance do dự án tạo: { instance, label }
Registry.instances = {}
-- Danh sách hàm dọn dẹp không phải connection/instance (ví dụ UnbindAction).
Registry.cleanups = {}

--[[
	Nối signal và đăng ký. Trả về (connection, errorMessage).
	Nếu signal không tồn tại (service vắng mặt), trả nil + thông báo:
	hệ thống phải chạy tiếp được, không được chết vì thiếu một phím tắt.
]]
function Registry.Connect(signal, handler, label)
	if type(handler) ~= "function" then
		return nil, ("Registry.Connect cần function (%s)"):format(tostring(label))
	end
	local connection, err = Shared_Safe.Connect(signal, handler, label)
	if connection == nil then
		return nil, err
	end
	Registry.connections[#Registry.connections + 1] = {
		connection = connection,
		label = tostring(label),
	}
	return connection, nil
end

-- Nối signal chỉ chạy một lần (dùng cho CharacterAdded kiểu chờ).
function Registry.ConnectOnce(signal, handler, label)
	local holder = {}
	local connection, err = Registry.Connect(signal, function(...)
		if holder.done then
			return
		end
		holder.done = true
		-- Ngắt TRƯỚC khi gọi handler để handler có thể nối lại chính nó.
		for index = #Registry.connections, 1, -1 do
			if Registry.connections[index].connection == holder.connection then
				Shared_Safe.Disconnect(holder.connection)
				table.remove(Registry.connections, index)
				break
			end
		end
		handler(...)
	end, label)
	holder.connection = connection
	return connection, err
end

-- Ngắt và gỡ MỘT connection khỏi sổ.
function Registry.Release(connection)
	if connection == nil then
		return false
	end
	for index = #Registry.connections, 1, -1 do
		if Registry.connections[index].connection == connection then
			Shared_Safe.Disconnect(connection)
			table.remove(Registry.connections, index)
			return true
		end
	end
	return false
end

-- Đăng ký một instance do dự án tạo (thường là GUI).
function Registry.Track(instance, label)
	if instance == nil then
		return nil
	end
	Registry.instances[#Registry.instances + 1] = {
		instance = instance,
		label = tostring(label),
	}
	return instance
end

-- Huỷ và gỡ MỘT instance khỏi sổ.
function Registry.Untrack(instance)
	if instance == nil then
		return false
	end
	for index = #Registry.instances, 1, -1 do
		if Registry.instances[index].instance == instance then
			table.remove(Registry.instances, index)
			return true
		end
	end
	return false
end

--[[
	Đăng ký một HÀM DỌN DẸP. Dùng cho tài nguyên không phải connection
	cũng không phải instance — ví dụ ContextActionService:UnbindAction.
	Trả về hàm huỷ đăng ký.
]]
function Registry.AddCleanup(fn, label)
	if type(fn) ~= "function" then
		return nil
	end
	local entry = { fn = fn, label = tostring(label) }
	Registry.cleanups[#Registry.cleanups + 1] = entry
	return function()
		for index = #Registry.cleanups, 1, -1 do
			if Registry.cleanups[index] == entry then
				table.remove(Registry.cleanups, index)
				return true
			end
		end
		return false
	end
end

function Registry.CleanupCount()
	return #Registry.cleanups
end

-- Chạy mọi hàm dọn dẹp (mỗi hàm được pcall để một hàm lỗi không chặn hàm khác).
function Registry.RunCleanups()
	local ran = 0
	for index = #Registry.cleanups, 1, -1 do
		local entry = Registry.cleanups[index]
		Registry.cleanups[index] = nil
		local ok, err = pcall(entry.fn)
		if not ok then
			Shared_Log.Warn(("hàm dọn dẹp '%s' ném lỗi: %s"):format(entry.label, tostring(err)))
		end
		ran = ran + 1
	end
	return ran
end

function Registry.ConnectionCount()
	return #Registry.connections
end

function Registry.InstanceCount()
	return #Registry.instances
end

-- Danh sách nhãn đang giữ — dùng khi chẩn đoán rò rỉ.
function Registry.Labels()
	local labels = {}
	for _, entry in ipairs(Registry.connections) do
		labels[#labels + 1] = "conn:" .. entry.label
	end
	for _, entry in ipairs(Registry.instances) do
		labels[#labels + 1] = "inst:" .. entry.label
	end
	for _, entry in ipairs(Registry.cleanups) do
		labels[#labels + 1] = "cleanup:" .. entry.label
	end
	return labels
end

--[[
	DỌN SẠCH: ngắt mọi connection, huỷ mọi instance do dự án tạo.
	Gọi khi tắt hệ thống. Chạy lại lần hai phải an toàn (idempotent).
]]
function Registry.Shutdown()
	-- Dọn tài nguyên "không phải instance" trước, để chúng không tạo thêm
	-- instance mới trong lúc ta đang huỷ.
	Registry.RunCleanups()

	local disconnected = 0
	for index = #Registry.connections, 1, -1 do
		local entry = Registry.connections[index]
		Registry.connections[index] = nil
		if Shared_Safe.Disconnect(entry.connection) then
			disconnected = disconnected + 1
		end
	end

	local destroyed = 0
	for index = #Registry.instances, 1, -1 do
		local entry = Registry.instances[index]
		Registry.instances[index] = nil
		if Shared_Safe.Destroy(entry.instance) then
			destroyed = destroyed + 1
		end
	end

	if disconnected > 0 or destroyed > 0 then
		Shared_Log.Debug(("Shutdown: ngắt %d connection, huỷ %d instance")
			:format(disconnected, destroyed))
	end
	return disconnected, destroyed
end

return Registry
]=],
	["Client/Core/Scanner"] = [=[
--[[
	doors-entity-radar/src/Client/Core/Scanner.luau
	ModuleScript — đặt tại: DoorsEntityRadar.Client.Core.Scanner

	CƠ CHẾ PHÁT HIỆN DUY NHẤT của dự án. Nó làm đúng MỘT việc: trả lời
	"trong phạm vi được phép đọc, có instance nào khớp tên với mục X không".

	CÁCH HOẠT ĐỘNG (không có gì bí ẩn, không có phép màu):
	  1. Nối Workspace.DescendantAdded / DescendantRemoving: instance mới
	     xuất hiện được đưa vào HÀNG ĐỢI, không xử lý ngay trong sự kiện.
	  2. Mỗi nhịp, hàng đợi được xử lý theo NGÂN SÁCH (Config.Scan.
	     descendantsPerStep) nên không khựng khung hình.
	  3. Thỉnh thoảng (Config.Scan.fullScanIntervalSeconds) quét đầy đủ một
	     lần để bắt những instance xuất hiện trước khi hệ thống chạy.
	     Nếu số descendant vượt trần, kết quả bị đánh dấu "có thể thiếu"
	     và UI phải hiển thị cảnh báo đó — KHÔNG im lặng.
	  4. Cầu dữ liệu nhà phát triển (tuỳ chọn, mặc định tắt): đọc Attribute
	     do chính bạn phát ra. Đây là dữ liệu được cung cấp, không suy đoán.

	Scanner KHÔNG tính khoảng cách, KHÔNG tạo GUI, KHÔNG đổi trạng thái.
	Nó chỉ đưa ra ứng viên; Tracker mới là nơi kết luận.
]]

local Shared_Safe = __DER_REQUIRE("Shared/Safe")
local Shared_Log = __DER_REQUIRE("Shared/Log")
local Shared_Geometry = __DER_REQUIRE("Shared/Geometry")
local Shared_Catalog = __DER_REQUIRE("Shared/EntityCatalog")
local Client_Matcher = __DER_REQUIRE("Client/Core/Matcher")

local Scanner = {}
Scanner.__index = Scanner

-- Lấy phần cấu hình phát hiện, không dùng `and/or` để tránh nuốt giá trị.
local function detectionPartOf(config)
	if type(config) ~= "table" then
		return nil
	end
	return config.Detection
end

function Scanner.new(config)
	local self = setmetatable({}, Scanner)
	self.config = config
	self.matcher = Client_Matcher.Build(detectionPartOf(config))

	-- Kết quả khớp: [entityId] = { { instance, name, firstSeenAt }, ... }
	self.matches = {}
	-- Tra ngược instance -> danh sách entityId (khoá yếu để không giữ rác).
	self.instanceIds = setmetatable({}, { __mode = "k" })

	self.pendingAdded = {}
	self.pendingAddedCursor = 1
	self.pendingRemoved = {}
	self.attachedRoot = nil
	self.connections = {}

	self.descendants = nil
	self.cursor = 1
	self.fullScanRequested = true
	self.lastFullScanAt = nil
	self.lastFullScanDuration = nil
	self.truncated = false

	self.stats = {
		addedSeen = 0,
		removedSeen = 0,
		indexedInstances = 0,
		fullScans = 0,
		descendantsSeenTotal = 0,
		errors = 0,
		bridgeReads = 0,
		bridgeHits = 0,
	}
	return self
end

-- Dựng lại bộ khớp (sau khi người dùng sửa Config.Detection lúc chạy).
function Scanner:RebuildMatcher()
	self.matcher = Client_Matcher.Build(detectionPartOf(self.config))
	-- Chỉ mục cũ có thể chứa mục nay đã thành unsupported: quét lại từ đầu.
	self:ClearMatches()
	self.fullScanRequested = true
	return Client_Matcher.Stats(self.matcher)
end

function Scanner:ClearMatches()
	self.matches = {}
	self.instanceIds = setmetatable({}, { __mode = "k" })
	self.pendingAdded = {}
	self.pendingAddedCursor = 1
	self.pendingRemoved = {}
	self.descendants = nil
	self.cursor = 1
end

-- Tên có nằm trong danh sách bỏ qua không?
function Scanner:_isIgnored(instanceName)
	local ignoreList = self.config and self.config.Scan and self.config.Scan.ignoreNames
	if type(ignoreList) ~= "table" then
		return false
	end
	for _, ignored in ipairs(ignoreList) do
		if ignored == instanceName then
			return true
		end
	end
	return false
end

-- Thêm một ứng viên vào kết quả khớp của một mục (có giới hạn số lượng).
function Scanner:_addMatch(entityId, instance, instanceName, now)
	local bucket = self.matches[entityId]
	if bucket == nil then
		bucket = {}
		self.matches[entityId] = bucket
	end
	for _, existing in ipairs(bucket) do
		if existing.instance == instance then
			return false -- đã có, không thêm trùng
		end
	end
	local limit = (self.config and self.config.Scan and self.config.Scan.maxMatchesPerEntity) or 8
	if #bucket >= limit then
		return false
	end
	bucket[#bucket + 1] = {
		instance = instance,
		name = instanceName,
		firstSeenAt = now or os.clock(),
	}
	return true
end

-- Phân loại MỘT instance: khớp mục nào thì ghi vào mục đó.
function Scanner:_indexInstance(instance, now)
	if not Shared_Safe.IsAlive(instance) then
		return 0
	end
	local instanceName = Shared_Safe.GetName(instance)
	if instanceName == nil or self:_isIgnored(instanceName) then
		return 0
	end
	local ids = Client_Matcher.MatchList(self.matcher, instanceName)
	if #ids == 0 then
		return 0
	end
	local added = 0
	for _, entityId in ipairs(ids) do
		if self:_addMatch(entityId, instance, instanceName, now) then
			added = added + 1
		end
	end
	if added > 0 then
		self.instanceIds[instance] = ids
		self.stats.indexedInstances = self.stats.indexedInstances + 1
	end
	return added
end

-- Gỡ một instance khỏi mọi mục (khi nó bị xoá khỏi Workspace).
function Scanner:_unindexInstance(instance)
	local ids = self.instanceIds[instance]
	if ids == nil then
		return 0
	end
	local removed = 0
	for _, entityId in ipairs(ids) do
		local bucket = self.matches[entityId]
		if bucket ~= nil then
			for index = #bucket, 1, -1 do
				if bucket[index].instance == instance then
					table.remove(bucket, index)
					removed = removed + 1
				end
			end
		end
	end
	self.instanceIds[instance] = nil
	return removed
end

--[[
	Gắn vào gốc quét (thường là Workspace). Trả về (ok, message).
	Thiếu signal DescendantAdded không phải lỗi chí mạng: hệ thống vẫn chạy
	bằng quét đầy đủ theo chu kỳ, chỉ kém nhạy hơn — và điều đó được ghi log.
]]
function Scanner:Attach(root)
	if root == nil then
		return false, "Không có gốc để gắn (Workspace = nil)."
	end
	if self.attachedRoot == root then
		return true, "Đã gắn sẵn vào gốc này."
	end
	self:Detach()

	local addedSignal = Shared_Safe.Read(root, "DescendantAdded")
	local connection, err = Shared_Safe.Connect(addedSignal, function(instance)
		self.stats.addedSeen = self.stats.addedSeen + 1
		self.pendingAdded[#self.pendingAdded + 1] = instance
	end, "Scanner.DescendantAdded")
	if connection ~= nil then
		self.connections[#self.connections + 1] = connection
	end

	local removingSignal = Shared_Safe.Read(root, "DescendantRemoving")
	local removeConnection = Shared_Safe.Connect(removingSignal, function(instance)
		self.stats.removedSeen = self.stats.removedSeen + 1
		self.pendingRemoved[#self.pendingRemoved + 1] = instance
	end, "Scanner.DescendantRemoving")
	if removeConnection ~= nil then
		self.connections[#self.connections + 1] = removeConnection
	end

	self.attachedRoot = root
	self.fullScanRequested = true

	if connection == nil then
		return false, ("Không nối được DescendantAdded (%s); chỉ dùng quét theo chu kỳ."):format(tostring(err))
	end
	return true, "Đã gắn sự kiện DescendantAdded/Removing."
end

function Scanner:Detach()
	for _, connection in ipairs(self.connections) do
		Shared_Safe.Disconnect(connection)
	end
	self.connections = {}
	self.attachedRoot = nil
end

-- Yêu cầu quét đầy đủ ở nhịp kế tiếp (nút "Làm mới" gọi hàm này).
function Scanner:RequestFullScan()
	self.fullScanRequested = true
	return true
end

function Scanner:_shouldStartFullScan(now)
	if not self.fullScanRequested then
		return false
	end
	local interval = (self.config and self.config.Scan and self.config.Scan.fullScanIntervalSeconds) or 2.5
	if self.lastFullScanAt ~= nil and (now - self.lastFullScanAt) < interval then
		-- Chưa tới lúc: giữ yêu cầu lại, không huỷ.
		return false
	end
	return true
end

-- Chụp danh sách descendant một lần (một lời gọi engine, không lặp lại).
function Scanner:_snapshotDescendants(root)
	local ok, descendants = pcall(function()
		return root:GetDescendants()
	end)
	if not ok or type(descendants) ~= "table" then
		self.stats.errors = self.stats.errors + 1
		return nil
	end
	return descendants
end

--[[
	MỘT NHỊP LÀM VIỆC. Trả về báo cáo để Tracker/UI hiển thị trung thực:
	  { processed, queued, truncated, scanComplete, scannedTotal }
]]
function Scanner:Update(now)
	local scanConfig = (self.config and self.config.Scan) or {}
	local budget = scanConfig.descendantsPerStep or 1200
	local report = { processed = 0, queued = 0, truncated = self.truncated, scanComplete = false, scannedTotal = 0 }
	now = now or os.clock()

	-- Người dùng tắt quét: trả báo cáo rỗng, không làm gì thêm.
	if scanConfig.enabled == false then
		return report
	end

	-- 1) Instance bị xoá: xử lý hết vì mỗi lần gỡ rất rẻ.
	for index = #self.pendingRemoved, 1, -1 do
		local instance = self.pendingRemoved[index]
		self.pendingRemoved[index] = nil
		self:_unindexInstance(instance)
	end

	-- 2) Instance mới: xử lý theo ngân sách.
	-- Dùng con trỏ thay vì table.remove(.., 1) vì cách đó dịch cả mảng (O(n)).
	-- KHÔNG gán nil khi tiêu phần tử: mảng có lỗ hổng sẽ làm '#' trả về
	-- biên không xác định. Ta chỉ dời con trỏ, rồi nén mảng khi cần.
	local processedQueue = 0
	local queueLength = #self.pendingAdded
	while self.pendingAddedCursor <= queueLength and processedQueue < budget do
		local instance = self.pendingAdded[self.pendingAddedCursor]
		processedQueue = processedQueue + 1
		self:_indexInstance(instance, now)
		self.pendingAddedCursor = self.pendingAddedCursor + 1
	end
	if self.pendingAddedCursor > queueLength then
		-- Tiêu hết hàng đợi: trả lại bảng rỗng.
		self.pendingAdded = {}
		self.pendingAddedCursor = 1
	elseif self.pendingAddedCursor > 32 then
		-- Còn tồn nhiều: dồn về đầu mảng để mảng không phình vô hạn.
		local remaining = {}
		for index = self.pendingAddedCursor, queueLength do
			remaining[#remaining + 1] = self.pendingAdded[index]
		end
		self.pendingAdded = remaining
		self.pendingAddedCursor = 1
	end
	report.queued = processedQueue

	-- 3) Quét đầy đủ (có nhịp, có trần).
	local root = self.attachedRoot
	if root == nil then
		return report
	end

	if self.descendants == nil and self:_shouldStartFullScan(now) then
		local snapshot = self:_snapshotDescendants(root)
		if snapshot == nil then
			return report
		end
		local limit = scanConfig.maxDescendantsPerFullScan or 20000
		self.descendants = snapshot
		self.cursor = 1
		self.truncated = #snapshot > limit
		self.fullScanRequested = false
		self.lastFullScanAt = now
		self.stats.fullScans = self.stats.fullScans + 1
		if self.truncated then
			Shared_Log.Warn(("Quét đầy đủ bị cắt: Workspace có %d descendant, trần cho phép %d. Kết quả có thể thiếu.")
				:format(#snapshot, limit))
		end
	end

	-- Snapshot được giữ NGUYÊN VẸN tới khi quét xong (không gán nil từng
	-- phần tử) vì '#' trên mảng có lỗ hổng là không xác định. Chi phí là
	-- một mảng tham chiếu tạm, đổi lại việc quét không bao giờ bỏ sót.
	if self.descendants ~= nil then
		local limit = scanConfig.maxDescendantsPerFullScan or 20000
		local total = math.min(#self.descendants, limit)
		local processed = 0
		local startedAt = os.clock()
		while self.cursor <= total and processed < budget do
			local instance = self.descendants[self.cursor]
			self.cursor = self.cursor + 1
			processed = processed + 1
			if instance ~= nil then
				self:_indexInstance(instance, now)
			end
		end
		report.processed = processed
		report.scannedTotal = self.cursor - 1
		self.stats.descendantsSeenTotal = self.stats.descendantsSeenTotal + processed
		self.lastFullScanDuration = os.clock() - startedAt
		if self.cursor > total then
			self.descendants = nil
			self.cursor = 1
			report.scanComplete = true
			report.truncated = self.truncated
		end
	end

	return report
end

-- Dọn các instance đã chết còn sót trong kết quả (gọi theo chu kỳ chậm).
function Scanner:Prune()
	local pruned = 0
	for entityId, bucket in pairs(self.matches) do
		for index = #bucket, 1, -1 do
			if not Shared_Safe.IsAlive(bucket[index].instance) then
				table.remove(bucket, index)
				pruned = pruned + 1
			end
		end
		if #bucket == 0 then
			self.matches[entityId] = nil
		end
	end
	return pruned
end

--[[
	Danh sách ứng viên của một mục. Trả về bảng (có thể rỗng).
	Instance chết bị loại ngay tại đây để Tracker không đọc phải rác.
]]
function Scanner:GetCandidates(entityId)
	local bucket = self.matches[entityId]
	if bucket == nil then
		return {}
	end
	local alive = {}
	for index = #bucket, 1, -1 do
		if Shared_Safe.IsAlive(bucket[index].instance) then
			alive[#alive + 1] = bucket[index]
		else
			table.remove(bucket, index)
		end
	end
	-- Trả về theo thứ ổn định: instance thấy trước đứng trước.
	table.sort(alive, function(a, b)
		if a.firstSeenAt == b.firstSeenAt then
			return tostring(a.name) < tostring(b.name)
		end
		return a.firstSeenAt < b.firstSeenAt
	end)
	return alive
end

function Scanner:HasCandidates(entityId)
	local bucket = self.matches[entityId]
	if bucket == nil then
		return false
	end
	for _, entry in ipairs(bucket) do
		if Shared_Safe.IsAlive(entry.instance) then
			return true
		end
	end
	return false
end

--[[
	CẦU DỮ LIỆU NHÀ PHÁT TRIỂN (tuỳ chọn).
	Đọc Attribute dạng  <prefix>entity_<id> = "x,y,z"  (hoặc Vector3)
	trên folder <folderName> trong Workspace.

	Đây là đường DUY NHẤT để có dữ liệu "chắc chắn" mà không cần đoán tên
	instance — và nó chỉ tồn tại nếu BẠN tự phát dữ liệu đó.
	Trả về (positions, message); positions = { [entityId] = Vector3 }.
]]
function Scanner:ReadDeveloperBridge(root)
	local bridge = self.config and self.config.Detection and self.config.Detection.developerBridge
	local empty = {}
	if bridge == nil or bridge.enabled ~= true then
		return empty, "Cầu dữ liệu nhà phát triển đang tắt (Config.Detection.developerBridge.enabled = false)."
	end
	if root == nil then
		return empty, "Không có Workspace để tìm folder cầu nối."
	end
	local folder = root:FindFirstChild(bridge.folderName or "DER_Bridge")
	if folder == nil then
		return empty, ("Không thấy folder '%s' trong Workspace."):format(tostring(bridge.folderName))
	end
	local okAttributes, attributes = pcall(function()
		return folder:GetAttributes()
	end)
	if not okAttributes or type(attributes) ~= "table" then
		return empty, "Không đọc được Attribute của folder cầu nối (API không khả dụng?)."
	end

	local prefix = (bridge.attributePrefix or "DER_") .. "entity_"
	local positions = {}
	for attributeName, value in pairs(attributes) do
		if string.sub(attributeName, 1, #prefix) == prefix then
			local entityId = string.sub(attributeName, #prefix + 1)
			if Shared_Catalog.Get(entityId) ~= nil then
				local position = nil
				if Shared_Geometry.IsPositionVector(value) then
					position = value
				elseif type(value) == "string" then
					local numbers = {}
					for token in string.gmatch(value, "[-+0-9.eE]+") do
						numbers[#numbers + 1] = tonumber(token)
					end
					if #numbers == 3
						and Shared_Geometry.IsFiniteNumber(numbers[1])
						and Shared_Geometry.IsFiniteNumber(numbers[2])
						and Shared_Geometry.IsFiniteNumber(numbers[3]) then
						position = Vector3.new(numbers[1], numbers[2], numbers[3])
					end
				end
				if position ~= nil then
					positions[entityId] = position
				else
					Shared_Log.Warn(("Attribute '%s' không phải toạ độ hợp lệ, đã bỏ qua."):format(attributeName))
				end
			else
				Shared_Log.Warn(("Attribute '%s' trỏ tới id không có trong danh mục: %s")
					:format(attributeName, tostring(entityId)))
			end
		end
	end

	local hits = 0
	for _ in pairs(positions) do
		hits = hits + 1
	end
	self.stats.bridgeReads = self.stats.bridgeReads + 1
	self.stats.bridgeHits = self.stats.bridgeHits + hits
	return positions, ("Đọc được %d vị trí từ cầu nhà phát triển."):format(hits)
end

function Scanner:Stats()
	local matchCount = 0
	local entitiesWithMatch = 0
	for _, bucket in pairs(self.matches) do
		if #bucket > 0 then
			entitiesWithMatch = entitiesWithMatch + 1
			matchCount = matchCount + #bucket
		end
	end
	local matcherStats = Client_Matcher.Stats(self.matcher)
	return {
		matcher = matcherStats,
		entitiesWithMatch = entitiesWithMatch,
		matchCount = matchCount,
		pendingAdded = math.max(0, #self.pendingAdded - self.pendingAddedCursor + 1),
		pendingRemoved = #self.pendingRemoved,
		scanInProgress = self.descendants ~= nil,
		scanCursor = self.descendants ~= nil and self.cursor or 0,
		truncated = self.truncated,
		attached = self.attachedRoot ~= nil,
		lastFullScanAt = self.lastFullScanAt,
		lastFullScanDuration = self.lastFullScanDuration,
		counters = self.stats,
	}
end

function Scanner:Destroy()
	self:Detach()
	self:ClearMatches()
	self.matcher = nil
end

return Scanner
]=],
	["Client/Core/Scheduler"] = [=[
--[[
	doors-entity-radar/src/Client/Core/Scheduler.luau
	ModuleScript — đặt tại: DoorsEntityRadar.Client.Core.Scheduler

	BỘ LẬP LỊCH MỘT VÒNG LẶP. Toàn hệ thống chỉ có MỘT connection
	RunService.Heartbeat; các công việc đăng ký theo chu kỳ riêng và chỉ
	chạy khi ĐẾN HẠN. Nhờ vậy:
	  * không có vòng lặp `while true do task.wait() end` trôi nổi;
	  * không có nhiều task nền trùng nhau (Start hai lần không nhân đôi);
	  * Pause/Stop/Destroy ngắt đúng connection đó và không để lại gì.

	Trạng thái: "idle" -> "running" <-> "paused" -> "stopped".
]]

local Shared_Safe = __DER_REQUIRE("Shared/Safe")
local Shared_Log = __DER_REQUIRE("Shared/Log")

local Scheduler = {}
Scheduler.__index = Scheduler

Scheduler.STATE = {
	Idle = "idle",
	Running = "running",
	Paused = "paused",
	Stopped = "stopped",
}

function Scheduler.new(options)
	options = options or {}
	local self = setmetatable({}, Scheduler)
	self.state = Scheduler.STATE.Idle
	self.tasks = {}            -- [tên] = { interval, nextRun, fn, calls, errors }
	self.order = {}            -- thứ tự đăng ký, để chạy tất định
	self.connection = nil
	self.lastTickAt = nil
	self.stats = {
		ticks = 0,
		taskCalls = 0,
		taskErrors = 0,
		overruns = 0,          -- số lần một task chạy trễ hơn chu kỳ của nó
		startCount = 0,
		blockedStarts = 0,     -- số lần Start bị chặn vì đang chạy (chống trùng)
	}
	-- Trần thời gian cho MỘT nhịp (giây). Vượt thì ghi log: dấu hiệu máy yếu.
	self.frameBudgetSeconds = options.frameBudgetSeconds or 0.02
	return self
end

--[[
	Đăng ký một công việc định kỳ.
	  name     — tên duy nhất
	  interval — giây giữa hai lần chạy
	  fn       — hàm nhận (nowSeconds)
	Ghi đè cùng tên sẽ thay thế, không tạo task thứ hai.
]]
function Scheduler:SetTask(name, interval, fn)
	if type(name) ~= "string" or type(fn) ~= "function" then
		error("Scheduler:SetTask cần (name: string, interval: number, fn: function)", 2)
	end
	if type(interval) ~= "number" or interval <= 0 then
		error(("Scheduler:SetTask('%s') cần interval > 0"):format(tostring(name)), 2)
	end
	if self.tasks[name] == nil then
		self.order[#self.order + 1] = name
	end
	self.tasks[name] = {
		interval = interval,
		nextRun = 0,
		fn = fn,
		calls = 0,
		errors = 0,
	}
	return true
end

-- Đổi chu kỳ của task đã có. Trả về false nếu task chưa đăng ký.
function Scheduler:SetInterval(name, interval)
	local task = self.tasks[name]
	if task == nil then
		return false
	end
	if type(interval) ~= "number" or interval <= 0 then
		return false
	end
	task.interval = interval
	return true
end

function Scheduler:HasTask(name)
	return self.tasks[name] ~= nil
end

function Scheduler:State()
	return self.state
end

function Scheduler:IsRunning()
	return self.state == Scheduler.STATE.Running
end

-- Chạy ngay MỘT task bất kể đến hạn chưa (nút "Làm mới" dùng cái này).
function Scheduler:RunNow(name, now)
	local task = self.tasks[name]
	if task == nil then
		return false, ("không có task '%s'"):format(tostring(name))
	end
	local timestamp = now or os.clock()
	self:_runTask(name, task, timestamp)
	task.nextRun = timestamp + task.interval
	return true, nil
end

function Scheduler:_runTask(name, task, now)
	task.calls = task.calls + 1
	self.stats.taskCalls = self.stats.taskCalls + 1
	local ok, err = pcall(task.fn, now)
	if not ok then
		task.errors = task.errors + 1
		self.stats.taskErrors = self.stats.taskErrors + 1
		-- Không ném lỗi ra ngoài: một task hỏng không được kéo sập các task khác.
		Shared_Log.Error(("task '%s' ném lỗi: %s"):format(name, tostring(err)))
	end
	return ok
end

-- Một nhịp Heartbeat: chạy các task đến hạn.
function Scheduler:_onHeartbeat(now)
	self.stats.ticks = self.stats.ticks + 1

	-- Ghi nhận trễ: nếu một task đáng lẽ chạy từ lâu thì đếm overrun.
	for _, name in ipairs(self.order) do
		local task = self.tasks[name]
		if task ~= nil and now >= task.nextRun then
			if task.nextRun > 0 and now - task.nextRun > task.interval then
				self.stats.overruns = self.stats.overruns + 1
			end
			self:_runTask(name, task, now)
			task.nextRun = now + task.interval
		end
	end

	if self.lastTickAt ~= nil then
		local elapsed = now - self.lastTickAt
		if elapsed > self.frameBudgetSeconds then
			Shared_Log.Debug(("nhịp scheduler mất %.3fs (trần %.3fs)"):format(elapsed, self.frameBudgetSeconds))
		end
	end
	self.lastTickAt = now
end

--[[
	Khởi động. Trả về (ok, message).
	Start khi đang chạy sẽ bị CHẶN và đếm lại — đây là chốt chống tạo nhiều
	vòng lặp nền trùng nhau.
]]
function Scheduler:Start()
	if self.state == Scheduler.STATE.Running then
		self.stats.blockedStarts = self.stats.blockedStarts + 1
		return false, "Scheduler đang chạy sẵn (không tạo vòng lặp thứ hai)."
	end
	if self.state == Scheduler.STATE.Stopped then
		return false, "Scheduler đã Stop; tạo instance mới hoặc gọi Reset()."
	end
	if self.connection ~= nil then
		-- Phòng hờ: connection cũ còn sót thì ngắt trước khi nối mới.
		Shared_Safe.Disconnect(self.connection)
		self.connection = nil
	end

	local runService, err = Shared_Safe.GetService("RunService")
	if runService == nil then
		return false, "Không có RunService: " .. tostring(err)
	end
	local heartbeat = Shared_Safe.Read(runService, "Heartbeat")
	local connection, connectErr = Shared_Safe.Connect(heartbeat, function()
		self:_onHeartbeat(os.clock())
	end, "Scheduler.Heartbeat")
	if connection == nil then
		return false, "Không nối được Heartbeat: " .. tostring(connectErr)
	end

	self.connection = connection
	self.state = Scheduler.STATE.Running
	self.stats.startCount = self.stats.startCount + 1

	-- Đặt mốc chạy ngay cho mọi task để lần Start có tác dụng tức thì.
	local now = os.clock()
	for _, name in ipairs(self.order) do
		local task = self.tasks[name]
		task.nextRun = now
	end
	self.lastTickAt = nil
	return true, "Scheduler đã chạy."
end

-- Tạm dừng: giữ nguyên task, chỉ ngừng chạy. Dữ liệu cũ bị đánh dấu cũ.
function Scheduler:Pause()
	if self.state ~= Scheduler.STATE.Running then
		return false, ("Không thể tạm dừng từ trạng thái '%s'"):format(tostring(self.state))
	end
	self.state = Scheduler.STATE.Paused
	if self.connection ~= nil then
		Shared_Safe.Disconnect(self.connection)
		self.connection = nil
	end
	return true, "Đã tạm dừng."
end

function Scheduler:Resume()
	if self.state ~= Scheduler.STATE.Paused then
		return false, ("Không thể tiếp tục từ trạng thái '%s'"):format(tostring(self.state))
	end
	-- Reset mốc để không "trả nợ" hàng loạt lần chạy bị bỏ qua khi tạm dừng.
	local now = os.clock()
	for _, name in ipairs(self.order) do
		local task = self.tasks[name]
		task.nextRun = now
	end
	self.state = Scheduler.STATE.Idle
	return self:Start()
end

-- Dừng hẳn: ngắt connection, giữ task để có thể Reset và chạy lại.
function Scheduler:Stop()
	if self.connection ~= nil then
		Shared_Safe.Disconnect(self.connection)
		self.connection = nil
	end
	self.state = Scheduler.STATE.Stopped
	return true, "Đã dừng."
end

-- Cho phép Start lại sau Stop (dùng khi bật/tắt hệ thống nhiều lần).
function Scheduler:Reset()
	if self.connection ~= nil then
		Shared_Safe.Disconnect(self.connection)
		self.connection = nil
	end
	self.state = Scheduler.STATE.Idle
	self.lastTickAt = nil
	return true
end

-- Huỷ hoàn toàn: ngắt connection và xoá task.
function Scheduler:Destroy()
	if self.connection ~= nil then
		Shared_Safe.Disconnect(self.connection)
		self.connection = nil
	end
	self.tasks = {}
	self.order = {}
	self.state = Scheduler.STATE.Stopped
end

function Scheduler:HasConnection()
	return self.connection ~= nil
end

function Scheduler:Stats()
	local perTask = {}
	for _, name in ipairs(self.order) do
		local task = self.tasks[name]
		perTask[name] = { calls = task.calls, errors = task.errors, interval = task.interval }
	end
	return {
		state = self.state,
		ticks = self.stats.ticks,
		taskCalls = self.stats.taskCalls,
		taskErrors = self.stats.taskErrors,
		overruns = self.stats.overruns,
		startCount = self.stats.startCount,
		blockedStarts = self.stats.blockedStarts,
		hasConnection = self.connection ~= nil,
		tasks = perTask,
	}
end

return Scheduler
]=],
	["Client/Core/Selection"] = [=[
--[[
	doors-entity-radar/src/Client/Core/Selection.luau
	ModuleScript — đặt tại: DoorsEntityRadar.Client.Core.Selection

	TRẠNG THÁI LỰA CHỌN (dữ liệu thuần, KHÔNG có GUI).

	Tại sao tách riêng:
	  * Yêu cầu "trạng thái lựa chọn đồng bộ giữa các tab" chỉ làm được khi
	    lựa chọn nằm NGOÀI giao diện. Nếu để trong RadarUi thì mỗi lần đổi tab
	    hoặc dựng lại UI sẽ mất lựa chọn.
	  * Test được bằng Lua thuần, không cần mock GUI.

	RÀNG BUỘC:
	  * Chỉ chấp nhận id CÓ THẬT trong danh mục (Shared_Catalog.ById) — không
	    cho rác lọt vào, nếu không bộ đếm "12/50" sẽ nói dối.
	  * `version` tăng MỖI LẦN có thay đổi thật. UI so version để biết khi nào
	    cần vẽ lại; dữ liệu không đổi thì không vẽ (giống Tracker).
	  * Không tạo instance, không nối sự kiện — không có gì để rò rỉ.
]]

local Shared_Catalog = __DER_REQUIRE("Shared/EntityCatalog")

local Selection = {}
Selection.__index = Selection

function Selection.new()
	local self = setmetatable({}, Selection)
	self.ids = {}          -- [entityId] = true
	self.count = 0
	self.version = 0
	self.stats = { toggles = 0, rejected = 0, clears = 0, bulkOps = 0 }
	return self
end

-- id có thật trong danh mục không? Trả về (bool, lý do nếu từ chối).
function Selection.IsValidId(entityId)
	if type(entityId) ~= "string" then
		return false, "id phải là chuỗi"
	end
	if Shared_Catalog.ById[entityId] == nil then
		return false, "không có mục '" .. entityId .. "' trong danh mục"
	end
	return true, nil
end

function Selection:IsSelected(entityId)
	if type(entityId) ~= "string" then
		return false
	end
	return self.ids[entityId] == true
end

function Selection:Count()
	return self.count
end

-- Danh sách id đã chọn, CÓ sắp xếp để UI hiển thị ổn định giữa các lần vẽ.
function Selection:Ids()
	local list = {}
	for entityId in pairs(self.ids) do
		list[#list + 1] = entityId
	end
	table.sort(list)
	return list
end

--[[
	Đặt trạng thái chọn cho MỘT mục. Trả về (changed, ok, message).
	changed = true chỉ khi trạng thái thật sự đổi — UI dựa vào đó để không
	vẽ lại khi người dùng bấm vào ô đã ở đúng trạng thái.
]]
function Selection:Set(entityId, selected)
	local valid, reason = Selection.IsValidId(entityId)
	if not valid then
		self.stats.rejected = self.stats.rejected + 1
		return false, false, reason
	end
	local wantSelected = selected == true
	local currentlySelected = self.ids[entityId] == true
	if currentlySelected == wantSelected then
		return false, true, "không đổi"
	end
	if wantSelected then
		self.ids[entityId] = true
		self.count = self.count + 1
	else
		self.ids[entityId] = nil
		self.count = self.count - 1
	end
	self.version = self.version + 1
	return true, true, nil
end

-- Đảo trạng thái chọn. Trả về (nowSelected, ok, message).
function Selection:Toggle(entityId)
	self.stats.toggles = self.stats.toggles + 1
	local valid, reason = Selection.IsValidId(entityId)
	if not valid then
		self.stats.rejected = self.stats.rejected + 1
		return false, false, reason
	end
	local nowSelected = self.ids[entityId] ~= true
	local changed = self:Set(entityId, nowSelected)
	return nowSelected, true, changed
end

--[[
	Đặt hàng loạt (dùng cho "Chọn tất cả trong phạm vi đang xem").
	`ids` là mảng; hàm KHÔNG tạo bảng trung gian ngoài bộ đếm.
	Trả về (changedCount, rejectedCount).
]]
function Selection:SetMany(ids, selected)
	local changedCount = 0
	local rejectedCount = 0
	if type(ids) ~= "table" then
		return 0, 0
	end
	self.stats.bulkOps = self.stats.bulkOps + 1
	local wantSelected = selected == true
	for _, entityId in ipairs(ids) do
		local changed, ok = self:Set(entityId, wantSelected)
		if changed then
			changedCount = changedCount + 1
		elseif not ok then
			rejectedCount = rejectedCount + 1
		end
	end
	return changedCount, rejectedCount
end

-- Xoá toàn bộ lựa chọn. Trả về số mục đã bị bỏ chọn.
function Selection:Clear()
	local removed = self.count
	if removed == 0 then
		return 0
	end
	self.ids = {}
	self.count = 0
	self.version = self.version + 1
	self.stats.clears = self.stats.clears + 1
	return removed
end

-- Toàn bộ id của danh mục (dùng cho nút "Chọn tất cả khu vực").
function Selection.AllCatalogIds()
	local list = {}
	for _, entry in ipairs(Shared_Catalog.List) do
		list[#list + 1] = entry.id
	end
	return list
end

-- Toàn bộ id thuộc một khu vực (khu vực = id thật, "all" = mọi khu vực).
function Selection.AreaIds(areaId)
	local list = {}
	if areaId == nil or areaId == "" or areaId == "all" then
		return Selection.AllCatalogIds()
	end
	for _, entry in ipairs(Shared_Catalog.List) do
		for _, entryArea in ipairs(entry.areas) do
			if entryArea == areaId then
				list[#list + 1] = entry.id
				break
			end
		end
	end
	return list
end

function Selection:Version()
	return self.version
end

function Selection:Stats()
	return {
		count = self.count,
		version = self.version,
		toggles = self.stats.toggles,
		rejected = self.stats.rejected,
		clears = self.stats.clears,
		bulkOps = self.stats.bulkOps,
	}
end

return Selection
]=],
	["Client/Core/SelfCheck"] = [=[
--[[
	doors-entity-radar/src/Client/Core/SelfCheck.luau
	ModuleScript — đặt tại: DoorsEntityRadar.Client.Core.SelfCheck

	TỰ KIỂM TRA TRƯỚC KHI CHẠY. Yêu cầu "chỉ báo hoàn thành khi chức năng
	tương ứng đã được kiểm tra" được thực hiện ở đây: mỗi hạng mục có id,
	kết quả và chi tiết, và UI in đúng bảng này thay vì một lời khẳng định.

	severity:
	  "error" — không đạt thì KHÔNG được báo là hệ thống sẵn sàng
	  "warn"  — chạy được nhưng thiếu một khả năng (ví dụ không có camera
	            thì không tính được hướng). Phải hiện rõ, không được giấu.
]]

local Shared_Config = __DER_REQUIRE("Shared/Config")
local Shared_Catalog = __DER_REQUIRE("Shared/EntityCatalog")
local Shared_Areas = __DER_REQUIRE("Shared/Areas")
local Client_Matcher = __DER_REQUIRE("Client/Core/Matcher")

local SelfCheck = {}

-- Dựng một báo cáo rỗng.
function SelfCheck.NewReport()
	return { items = {}, errors = 0, warnings = 0, ok = false, finishedAt = nil }
end

local function addItem(report, id, label, severity, ok, detail)
	report.items[#report.items + 1] = {
		id = id,
		label = label,
		severity = severity,
		ok = ok == true,
		detail = tostring(detail),
	}
	if ok then
		return
	end
	if severity == "error" then
		report.errors = report.errors + 1
	else
		report.warnings = report.warnings + 1
	end
end

--[[
	CHẠY TOÀN BỘ KIỂM TRA.
	deps = { env, scanner, scheduler, guiParent }  (mọi trường đều tuỳ chọn;
	thiếu trường nào thì hạng mục tương ứng báo thiếu, không ném lỗi).
]]
function SelfCheck.Run(deps)
	deps = deps or {}
	local report = SelfCheck.NewReport()

	-- 1) Cấu hình
	local configOk, configProblems = Shared_Config.Validate()
	addItem(report, "config", "Cấu hình hợp lệ", "error", configOk,
		configOk and "Config.Validate() đạt." or ("Config sai: " .. table.concat(configProblems, " | ")))

	-- 2) Danh mục
	local catalogOk, catalogProblems = Shared_Catalog.Validate()
	addItem(report, "catalog", "Danh mục thực thể hợp lệ", "error", catalogOk,
		catalogOk and ("Đạt. %d mục, %d cặp mục-khu vực.")
			:format(Shared_Catalog.Count(), Shared_Catalog.CountMemberships())
			or ("Danh mục sai: " .. table.concat(catalogProblems, " | ")))

	-- 3) Mỗi khu vực phải có mục; khu vực lạ phải bị phát hiện
	local areaCounts = Shared_Catalog.GetAreaCounts()
	local areaDetail = {}
	local areaProblem = nil
	for _, areaId in ipairs(Shared_Areas.GetOrderedIds()) do
		local count = areaCounts[areaId] or 0
		areaDetail[#areaDetail + 1] = ("%s=%d"):format(areaId, count)
		if count == 0 and areaProblem == nil then
			areaProblem = ("khu vực '%s' không có mục nào"):format(areaId)
		end
	end
	addItem(report, "areas", "Phủ đủ khu vực", "error", areaProblem == nil,
		areaProblem or ("Số mục theo khu vực: " .. table.concat(areaDetail, ", ")))

	-- 4) Bộ khớp tên
	local detectionConfig = nil
	if type(deps.config) == "table" then
		detectionConfig = deps.config.Detection
	end
	local matcher = Client_Matcher.Build(detectionConfig)
	local matcherStats = Client_Matcher.Stats(matcher)
	addItem(report, "matcher", "Bộ khớp tên đã dựng", "error",
		matcherStats.entities > 0 and matcherStats.patterns > 0,
		("%d mục quét được, %d mẫu tên, %d luật chứa, %d mục không hỗ trợ, %d mục đã xác minh.")
			:format(matcherStats.entities, matcherStats.patterns, matcherStats.containsRules,
				matcherStats.unsupported, matcherStats.confirmed))

	-- 5) Số mục "đã xác minh" — đây là điều kiện để được nói "Không phát hiện"
	addItem(report, "confirmed", "Có mẫu tên đã xác minh", "warn", matcherStats.confirmed > 0,
		matcherStats.confirmed > 0
			and ("%d mục đã xác minh: được phép kết luận 'Không phát hiện'."):format(matcherStats.confirmed)
			or "Chưa xác minh mẫu nào: mọi kết quả 'không thấy' sẽ hiển thị 'Chưa xác minh'. Thêm tên vào Config.Detection.confirmedPatterns.")

	-- 6) Môi trường
	local env = deps.env
	if env == nil then
		addItem(report, "env", "Môi trường client", "error", false, "Không có Env để kiểm tra.")
	else
		local capabilities = env.Capabilities()
		for _, key in ipairs({ "workspace", "localPlayer", "playerGui", "playerPosition", "camera", "userInput" }) do
			local entry = capabilities[key]
			local severity = "warn"
			if key == "workspace" or key == "localPlayer" then
				severity = "error"
			end
			addItem(report, "env." .. key, "Môi trường: " .. key, severity,
				entry ~= nil and entry.ok, entry ~= nil and entry.detail or "Không có thông tin.")
		end
	end

	-- 7) Scanner
	local scanner = deps.scanner
	if scanner == nil then
		addItem(report, "scanner", "Bộ quét", "error", false, "Chưa tạo Scanner.")
	else
		local stats = scanner:Stats()
		addItem(report, "scanner.attached", "Bộ quét đã gắn vào Workspace", "warn", stats.attached,
			stats.attached and "Đang nghe DescendantAdded/Removing."
				or "Chưa gắn: chỉ dựa vào quét đầy đủ theo chu kỳ.")
		addItem(report, "scanner.enabled", "Cơ chế quét đang bật", "warn",
			not (deps.config and deps.config.Scan and deps.config.Scan.enabled == false),
			(deps.config and deps.config.Scan and deps.config.Scan.enabled == false)
				and "Config.Scan.enabled = false: hệ thống chỉ là danh mục, không định vị."
				or "Đang bật.")
	end

	-- 8) Scheduler
	local scheduler = deps.scheduler
	if scheduler == nil then
		addItem(report, "scheduler", "Bộ lập lịch", "error", false, "Chưa tạo Scheduler.")
	else
		local stats = scheduler:Stats()
		local taskCount = 0
		for _ in pairs(stats.tasks) do
			taskCount = taskCount + 1
		end
		addItem(report, "scheduler.tasks", "Đã đăng ký công việc định kỳ", "error", taskCount > 0,
			("%d công việc; trạng thái '%s'."):format(taskCount, tostring(stats.state)))
		addItem(report, "scheduler.connection", "Chỉ có một connection nền", "error",
			stats.hasConnection == (stats.state == "running"),
			("state=%s, hasConnection=%s, blockedStarts=%d")
				:format(tostring(stats.state), tostring(stats.hasConnection), stats.blockedStarts))
	end

	-- 9) Nơi gắn GUI
	if deps.guiParent ~= nil then
		addItem(report, "guiParent", "Có nơi gắn giao diện", "warn", true, "PlayerGui sẵn sàng.")
	else
		addItem(report, "guiParent", "Có nơi gắn giao diện", "warn", false,
			"Chưa có PlayerGui: hệ thống vẫn chạy nền và ghi log.")
	end

	report.ok = report.errors == 0
	report.finishedAt = os.clock()
	return report
end

-- Tóm tắt một dòng để in ra Output.
function SelfCheck.Summary(report)
	if report == nil then
		return "Chưa chạy tự kiểm tra."
	end
	return ("Tự kiểm tra: %s — %d hạng mục, %d lỗi, %d cảnh báo.")
		:format(report.ok and "ĐẠT" or "CHƯA ĐẠT", #report.items, report.errors, report.warnings)
end

-- Danh sách chuỗi các hạng mục chưa đạt — dùng cho UI và cho test.
function SelfCheck.Failures(report)
	local failures = {}
	if report == nil then
		return failures
	end
	for _, item in ipairs(report.items) do
		if not item.ok then
			failures[#failures + 1] = ("%s [%s]: %s"):format(item.id, item.severity, item.detail)
		end
	end
	return failures
end

return SelfCheck
]=],
	["Client/Core/Tracker"] = [=[
--[[
	doors-entity-radar/src/Client/Core/Tracker.luau
	ModuleScript — đặt tại: DoorsEntityRadar.Client.Core.Tracker

	NƠI KẾT LUẬN TRẠNG THÁI. Nhận ứng viên từ Scanner + vị trí người chơi
	+ hướng camera + (tuỳ chọn) dữ liệu nhà phát triển, rồi sinh ra bản
	ghi trạng thái theo ĐÚNG luật trong Shared/Status.

	HAI VIỆC QUAN TRỌNG:
	  1. Trung thực: không có vị trí hợp lệ thì không có khoảng cách.
	     Không tìm thấy gì và mẫu tên chưa xác minh thì nói "Chưa xác minh",
	     KHÔNG nói "Không phát hiện".
	  2. Chống nhấp nháy: so chữ ký trạng thái trước/sau; chỉ tăng version
	     và báo dirty khi có thay đổi thật. UI nhờ vậy không vẽ lại vô ích.
]]

local Shared_Signal = __DER_REQUIRE("Shared/Signal")
local Shared_Status = __DER_REQUIRE("Shared/Status")
local Shared_Geometry = __DER_REQUIRE("Shared/Geometry")
local Shared_Catalog = __DER_REQUIRE("Shared/EntityCatalog")
local Client_Matcher = __DER_REQUIRE("Client/Core/Matcher")

local Tracker = {}
Tracker.__index = Tracker

function Tracker.new(config)
	local self = setmetatable({}, Tracker)
	self.config = config
	self.active = false
	self.states = {}
	self.dirty = {}
	self.version = 0
	self.changed = Shared_Signal.new()
	self.lastRefreshAt = nil
	self.lastScanReport = nil
	self.faultMessage = nil
	--[[
		TẬP "ĐANG THEO DÕI" (focus). Đây là tập CON của những mục người dùng
		đã chọn và bật theo dõi. Nó KHÔNG đổi trạng thái của mục nào: một mục
		vẫn là UNVERIFIED/NOT_FOUND như cũ. Focus chỉ dùng để:
		  * ghi một dòng nhật ký khi mục đó THẬT SỰ chuyển sang/thoát khỏi
		    "Đã phát hiện" (xem Tracker:_noteFocusChange);
		  * đánh dấu trên giao diện để người dùng biết mình đang theo dõi gì.
		Nói cách khác: theo dõi = chú ý hơn, KHÔNG PHẢI = định vị được.
	]]
	self.focus = {}
	self.alerts = {}
	self.stats = {
		refreshes = 0,
		changes = 0,
		unchanged = 0,
		uiPushes = 0,
		focusChanges = 0,
		alerts = 0,
	}
	return self
end

-- Bật/tắt. Khi tắt, mọi trạng thái thành DISABLED và xoá dữ liệu vị trí:
-- không được để vị trí cũ tiếp tục hiển thị như thể còn hiệu lực.
function Tracker:SetActive(active)
	local nextActive = active == true
	if self.active == nextActive then
		return false
	end
	self.active = nextActive
	if not nextActive then
		self.faultMessage = nil
		local now = os.clock()
		for _, entry in ipairs(Shared_Catalog.List) do
			self:_apply(entry.id, Shared_Status.MakeRecord(
				Shared_Status.Code.Disabled, entry.id, nil, nil, true), now)
		end
		self.lastRefreshAt = nil
	end
	return true
end

function Tracker:IsActive()
	return self.active
end

-- Ghi lỗi quét thật (nếu có) để mọi mục đang quét chuyển sang FAULT.
function Tracker:SetFault(message)
	self.faultMessage = message
end

function Tracker:ClearFault()
	self.faultMessage = nil
end

-- Chữ ký dùng để phát hiện thay đổi. Làm tròn khoảng cách để 0.01 stud
-- dao động không làm UI vẽ lại liên tục.
local function signatureOf(record)
	if record == nil then
		return "none"
	end
	local observation = record.observation
	if observation == nil then
		return record.code .. "|" .. tostring(record.stale)
	end
	local distanceText = "nil"
	if Shared_Geometry.IsFiniteNumber(observation.distance) then
		distanceText = ("%.1f"):format(observation.distance)
	end
	return table.concat({
		record.code,
		tostring(record.stale),
		tostring(observation.instanceName),
		distanceText,
		tostring(observation.direction),
		tostring(observation.source),
	}, "|")
end

function Tracker:_apply(entityId, record, now)
	local previous = self.states[entityId]
	local previousSignature = signatureOf(previous)
	local nextSignature = signatureOf(record)

	record.sampledAt = now
	self.states[entityId] = record

	-- Mục đang theo dõi mà đổi giữa "thấy / không thấy" thì ghi nhận để báo.
	self:_noteFocusChange(entityId, previous, record, now)

	if previousSignature ~= nextSignature then
		self.stats.changes = self.stats.changes + 1
		self.dirty[entityId] = true
		self.version = self.version + 1
		return true
	end
	self.stats.unchanged = self.stats.unchanged + 1
	return false
end

--========================== THEO DÕI (FOCUS) ==========================

function Tracker:IsFocused(entityId)
	if type(entityId) ~= "string" then
		return false
	end
	return self.focus[entityId] == true
end

-- Bật/tắt theo dõi một mục. Trả về true nếu trạng thái có đổi.
function Tracker:SetFocus(entityId, focused)
	if type(entityId) ~= "string" or Shared_Catalog.ById[entityId] == nil then
		return false
	end
	local wantFocus = focused == true
	local hasFocus = self.focus[entityId] == true
	if hasFocus == wantFocus then
		return false
	end
	if wantFocus then
		self.focus[entityId] = true
	else
		self.focus[entityId] = nil
	end
	self.focusCount = (self.focusCount or 0) + (wantFocus and 1 or -1)
	self.stats.focusChanges = self.stats.focusChanges + 1
	return true
end

function Tracker:ClearFocus()
	local removed = self.focusCount or 0
	self.focus = {}
	self.focusCount = 0
	return removed
end

function Tracker:FocusCount()
	return self.focusCount or 0
end

-- Danh sách id đang theo dõi (có sắp xếp, để UI hiển thị ổn định).
function Tracker:FocusIds()
	local list = {}
	for entityId in pairs(self.focus) do
		list[#list + 1] = entityId
	end
	table.sort(list)
	return list
end

--[[
	Ghi nhận chuyển trạng thái "thấy / không thấy" của mục đang theo dõi.
	CHỈ dựa trên record thật do _buildRecord sinh ra — không có nhánh nào bịa
	khoảng cách. Nếu không có vị trí thì alert ghi distance = nil và nhật ký
	sẽ nói "không rõ khoảng cách" thay vì in một con số.

	`Scan.interestingDistance` được dùng ở đây: mục ở quá xa thì không đáng
	để làm phiền người dùng bằng một dòng nhật ký (nhưng trạng thái trên UI
	vẫn đúng như cũ).
]]
function Tracker:_noteFocusChange(entityId, previous, record, now)
	if self.focus[entityId] ~= true then
		return
	end
	local wasDetected = previous ~= nil and previous.code == Shared_Status.Code.Detected
	local isDetected = record.code == Shared_Status.Code.Detected
	if wasDetected == isDetected then
		return
	end

	local observation = record.observation
	local distance = observation and observation.distance or nil
	local direction = observation and observation.direction or nil

	local limit = nil
	if self.config ~= nil and self.config.Scan ~= nil then
		limit = self.config.Scan.interestingDistance
	end
	if isDetected and Shared_Geometry.IsFiniteNumber(distance)
		and Shared_Geometry.IsFiniteNumber(limit) and distance > limit then
		return -- quá xa mức quan tâm: không báo, nhưng UI vẫn hiện đúng trạng thái
	end

	local entry = Shared_Catalog.Get(entityId)
	self.alerts[#self.alerts + 1] = {
		entityId = entityId,
		name = entry ~= nil and entry.name or entityId,
		detected = isDetected,
		distance = distance,
		direction = direction,
		at = now,
	}
	self.stats.alerts = self.stats.alerts + 1

	-- Không để danh sách alert phình ra nếu người dùng không đọc kịp.
	while #self.alerts > 20 do
		table.remove(self.alerts, 1)
	end
end

-- Lấy và XOÁ danh sách alert đang chờ (Radar gọi mỗi nhịp để ghi nhật ký).
function Tracker:TakeAlerts()
	local pending = self.alerts
	self.alerts = {}
	return pending
end

--======================== HẾT PHẦN THEO DÕI =========================

--[[
	Chọn ứng viên tốt nhất trong danh sách: ưu tiên ứng viên có vị trí hợp
	lệ và GẦN người chơi nhất. Trả về (entry, position, reason).
	Không có vị trí hợp lệ nào thì trả (entry, nil, reason) — vẫn báo là
	"có instance" nhưng KHÔNG bịa toạ độ.
]]
function Tracker:_pickBest(candidates, playerPosition)
	local bestEntry = nil
	local bestPosition = nil
	local bestDistance = nil
	local lastReason = nil
	-- Ứng viên đầu tiên luôn được ghi nhớ: khi KHÔNG đọc được vị trí của bất
	-- kỳ ứng viên nào, ta vẫn phải nói được "thấy instance tên gì".
	local firstCandidate = candidates[1]

	for _, candidate in ipairs(candidates) do
		local position, reason = Shared_Geometry.ReadPosition(candidate.instance)
		lastReason = reason
		if position ~= nil then
			local distance = nil
			if playerPosition ~= nil then
				distance = Shared_Geometry.Distance(playerPosition, position)
			end
			if bestPosition == nil then
				bestEntry = candidate
				bestPosition = position
				bestDistance = distance
			elseif distance ~= nil and bestDistance ~= nil and distance < bestDistance then
				bestEntry = candidate
				bestPosition = position
				bestDistance = distance
			elseif bestDistance == nil then
				bestEntry = candidate
				bestPosition = position
				bestDistance = distance
			end
		end
	end

	if bestEntry == nil then
		bestEntry = firstCandidate
	end
	return bestEntry, bestPosition, bestDistance, lastReason
end

--[[
	MỘT LẦN CẬP NHẬT TOÀN BỘ TRẠNG THÁI.
	tham số (đều có thể nil, và nil đều được xử lý tường minh):
	  now                 — mốc thời gian
	  scanner             — Client/Core/Scanner
	  playerPosition      — Vector3 của người chơi
	  lookVector,rightVector — hướng camera
	  developerPositions  — { [entityId] = Vector3 } từ cầu nhà phát triển
]]
function Tracker:Refresh(now, scanner, playerPosition, lookVector, rightVector, developerPositions)
	now = now or os.clock()
	self.stats.refreshes = self.stats.refreshes + 1
	self.lastScanReport = nil

	if not self.active then
		-- Không active thì không suy diễn gì thêm; SetActive(false) đã dọn.
		self.lastRefreshAt = now
		return self:CountByStatus()
	end

	local staleAfter = (self.config and self.config.System and self.config.System.staleAfterSeconds) or 3.0
	local matcher = nil
	if scanner ~= nil then
		matcher = scanner.matcher
	end

	for _, entry in ipairs(Shared_Catalog.List) do
		local record = self:_buildRecord(entry, scanner, matcher, playerPosition,
			lookVector, rightVector, developerPositions, now, staleAfter)
		self:_apply(entry.id, record, now)
	end

	self.lastRefreshAt = now
	return self:CountByStatus()
end

function Tracker:_buildRecord(entry, scanner, matcher, playerPosition, lookVector, rightVector,
	developerPositions, now, staleAfter)
	local code = Shared_Status.Code
	local entityId = entry.id

	-- 0) Nếu lần quét vừa rồi lỗi, nói thẳng là lỗi — không giả vờ có kết quả.
	if self.faultMessage ~= nil then
		return Shared_Status.MakeRecord(code.Fault, entityId, self.faultMessage, nil, true)
	end

	-- 1) Không hỗ trợ phát hiện (luôn kèm lý do).
	local unsupported, unsupportedReason = Client_Matcher.GetUnsupportedReason(matcher, entityId)
	if unsupported then
		return Shared_Status.MakeRecord(code.Unsupported, entityId, unsupportedReason, nil, false)
	end

	-- 2) Dữ liệu do nhà phát triển cung cấp — nguồn rõ ràng, không suy đoán.
	local developerPosition = nil
	if developerPositions ~= nil then
		-- Không viết `x and x[k] or nil`: dạng đó nuốt giá trị false.
		developerPosition = developerPositions[entityId]
	end
	if developerPosition ~= nil and Shared_Geometry.IsPositionVector(developerPosition) then
		local distance = nil
		if playerPosition ~= nil then
			distance = Shared_Geometry.Distance(playerPosition, developerPosition)
		end
		local direction = nil
		if lookVector ~= nil and playerPosition ~= nil then
			direction = Shared_Geometry.RelativeDirection(lookVector, rightVector, playerPosition, developerPosition)
		end
		local reason = "Vị trí do nhà phát triển cung cấp qua Attribute (Config.Detection.developerBridge)."
		if distance == nil then
			reason = reason .. " Không tính được khoảng cách vì thiếu vị trí người chơi."
		end
		return Shared_Status.MakeRecord(code.Detected, entityId, reason, {
			instanceName = "(dữ liệu nhà phát triển)",
			distance = distance,
			direction = direction,
			position = developerPosition,
			source = "developer",
			observedAt = now,
		}, false)
	end

	-- 3) Không có scanner (người dùng tắt quét) -> chưa xác minh, không đoán.
	if scanner == nil then
		return Shared_Status.MakeRecord(code.Unverified, entityId,
			"Chế độ quét đang tắt (Config.Scan.enabled = false): chỉ có danh mục, không có dữ liệu trực tiếp.", nil, true)
	end

	-- 4) Có ứng viên trong Workspace không?
	local candidates = scanner:GetCandidates(entityId)
	if #candidates > 0 then
		local best, position, distance, positionReason = self:_pickBest(candidates, playerPosition)
		local instanceName = nil
		if best ~= nil then
			instanceName = best.name
		end
		if position ~= nil then
			local direction = nil
			if lookVector ~= nil and playerPosition ~= nil then
				direction = Shared_Geometry.RelativeDirection(lookVector, rightVector, playerPosition, position)
			end
			local reason = ("Khớp instance '%s'. %s"):format(tostring(instanceName), tostring(positionReason))
			if distance == nil then
				reason = reason .. " Không tính được khoảng cách vì thiếu vị trí người chơi."
			elseif direction == nil then
				reason = reason .. " Không tính được hướng vì thiếu hướng camera hợp lệ."
			end
			return Shared_Status.MakeRecord(code.Detected, entityId, reason, {
				instanceName = instanceName,
				distance = distance,
				direction = direction,
				position = position,
				source = "workspace",
				observedAt = now,
				matchCount = #candidates,
			}, false)
		end
		return Shared_Status.MakeRecord(code.NoPosition, entityId,
			("Thấy instance '%s' nhưng %s"):format(tostring(instanceName), tostring(positionReason)), nil, false)
	end

	-- 5) Không thấy gì: chỉ được nói "Không phát hiện" nếu mẫu tên đã xác minh.
	if Client_Matcher.IsConfirmed(matcher, entityId) then
		local stats = scanner:Stats()
		local reason = "Đã quét xong, không có instance nào khớp mẫu đã xác minh."
		if stats.truncated then
			reason = reason .. " LƯU Ý: lần quét bị cắt ngắn theo trần, kết quả có thể thiếu."
		end
		return Shared_Status.MakeRecord(code.NotFound, entityId, reason, nil, false)
	end

	return Shared_Status.MakeRecord(code.Unverified, entityId,
		"Chưa tìm thấy instance khớp mẫu, nhưng mẫu tên chưa được xác minh nên không kết luận là không có.", nil, false)
end

function Tracker:Get(entityId)
	return self.states[entityId]
end

function Tracker:GetVersion()
	return self.version
end

-- Lấy danh sách id vừa thay đổi và XOÁ cờ dirty (UI gọi sau khi vẽ).
function Tracker:ConsumeDirty()
	local ids = {}
	for entityId in pairs(self.dirty) do
		ids[#ids + 1] = entityId
	end
	self.dirty = {}
	if #ids > 0 then
		self.stats.uiPushes = self.stats.uiPushes + 1
		self.changed:Fire(ids, self.version)
	end
	table.sort(ids)
	return ids
end

function Tracker:HasDirty()
	for _ in pairs(self.dirty) do
		return true
	end
	return false
end

-- Đếm số mục theo từng trạng thái — dùng cho dòng tóm tắt trên UI.
function Tracker:CountByStatus()
	local counts = {}
	for _, entry in ipairs(Shared_Catalog.List) do
		local record = self.states[entry.id]
		local code = record and record.code or Shared_Status.Code.Disabled
		counts[code] = (counts[code] or 0) + 1
	end
	return counts
end

--[[
	Danh sách để UI hiển thị, đã lọc và sắp xếp:
	  * theo khu vực (areaId = nil/"all" thì bỏ qua);
	  * theo chuỗi tìm kiếm (dùng chính Catalog.Search để không lệch logic);
	  * sắp theo trạng thái (quan trọng trước) rồi theo tên.
	Trả về mảng { entry, record }.
]]
function Tracker:BuildView(query, areaId)
	local entries = Shared_Catalog.Search(query, (areaId == "all" or areaId == "") and nil or areaId)
	local rows = {}
	for _, entry in ipairs(entries) do
		rows[#rows + 1] = {
			entry = entry,
			record = self.states[entry.id],
		}
	end
	table.sort(rows, function(a, b)
		local codeA = a.record and a.record.code or Shared_Status.Code.Disabled
		local codeB = b.record and b.record.code or Shared_Status.Code.Disabled
		local weightA = Shared_Status.GetSortWeight(codeA)
		local weightB = Shared_Status.GetSortWeight(codeB)
		if weightA ~= weightB then
			return weightA < weightB
		end
		-- Cùng trạng thái: cái có khoảng cách gần hơn lên trước.
		local distanceA = a.record and a.record.observation and a.record.observation.distance
		local distanceB = b.record and b.record.observation and b.record.observation.distance
		if Shared_Geometry.IsFiniteNumber(distanceA) and Shared_Geometry.IsFiniteNumber(distanceB) then
			if distanceA ~= distanceB then
				return distanceA < distanceB
			end
		elseif Shared_Geometry.IsFiniteNumber(distanceA) then
			return true
		elseif Shared_Geometry.IsFiniteNumber(distanceB) then
			return false
		end
		return string.lower(a.entry.name) < string.lower(b.entry.name)
	end)
	return rows
end

-- Tuổi của dữ liệu (giây) kể từ lần cập nhật cuối; nil nếu chưa có.
function Tracker:GetDataAge(now)
	if self.lastRefreshAt == nil then
		return nil
	end
	local age = (now or os.clock()) - self.lastRefreshAt
	if not Shared_Geometry.IsFiniteNumber(age) or age < 0 then
		return nil
	end
	return age
end

function Tracker:IsStale(now)
	local age = self:GetDataAge(now)
	if age == nil then
		return true
	end
	local limit = (self.config and self.config.System and self.config.System.staleAfterSeconds) or 3.0
	return age > limit
end

function Tracker:Stats()
	return {
		active = self.active,
		version = self.version,
		refreshes = self.stats.refreshes,
		changes = self.stats.changes,
		focused = self:FocusCount(),
		alerts = self.stats.alerts,
		pendingAlerts = #self.alerts,
		unchanged = self.stats.unchanged,
		uiPushes = self.stats.uiPushes,
		lastRefreshAt = self.lastRefreshAt,
		fault = self.faultMessage,
	}
end

function Tracker:Destroy()
	self:ClearFocus()
	self.alerts = {}
	self.changed:DisconnectAll()
	self.states = {}
	self.dirty = {}
	self.active = false
end

return Tracker
]=],
	["Client/Radar"] = [=[
--[[
	doors-entity-radar/src/Client/Radar.luau
	ModuleScript — đặt tại: DoorsEntityRadar.Client.Radar (trong StarterPlayerScripts)

	BỘ ĐIỀU PHỐI. Đây là nơi duy nhất biết tất cả các mảnh: SelfCheck,
	Scanner, Tracker, Scheduler, RadarUi. Các mảnh KHÔNG biết nhau.

	VÒNG ĐỜI:
	  new -> Start (kiểm tra rồi mới chạy) -> Pause/Resume -> Stop -> Destroy
	Start chỉ báo "đã chạy" khi SelfCheck không còn lỗi mức error.
]]

local Shared_Log = __DER_REQUIRE("Shared/Log")
local Shared_Safe = __DER_REQUIRE("Shared/Safe")
local Shared_Config = __DER_REQUIRE("Shared/Config")
local Shared_Status = __DER_REQUIRE("Shared/Status")
local Shared_Geometry = __DER_REQUIRE("Shared/Geometry")
local Shared_Catalog = __DER_REQUIRE("Shared/EntityCatalog")
local Client_Env = __DER_REQUIRE("Client/Core/Env")
local Client_Registry = __DER_REQUIRE("Client/Core/Registry")
local Client_Scheduler = __DER_REQUIRE("Client/Core/Scheduler")
local Client_Scanner = __DER_REQUIRE("Client/Core/Scanner")
local Client_Tracker = __DER_REQUIRE("Client/Core/Tracker")
local Client_SelfCheck = __DER_REQUIRE("Client/Core/SelfCheck")
local Client_Selection = __DER_REQUIRE("Client/Core/Selection")
local Client_Matcher = __DER_REQUIRE("Client/Core/Matcher")
local Ui_RadarUi = __DER_REQUIRE("Client/Ui/RadarUi")
local Ui_Theme = __DER_REQUIRE("Client/Ui/Theme")

local Radar = {}
Radar.__index = Radar

Radar.STATE = {
	Stopped = "stopped",
	Running = "running",
	Paused = "paused",
	Faulted = "faulted",
}

function Radar.new(config)
	local self = setmetatable({}, Radar)
	self.config = config or Shared_Config
	self.state = Radar.STATE.Stopped
	self.scanner = Client_Scanner.new(self.config)
	self.tracker = Client_Tracker.new(self.config)
	self.scheduler = Client_Scheduler.new()
	self.ui = nil
	self.report = nil
	self.query = ""
	self.areaId = (self.config.System and self.config.System.defaultAreaId) or "all"
	self.selectedId = nil
	--[[
		LỰA CHỌN và THEO DÕI nằm ở Radar (KHÔNG nằm trong UI) nên:
		  * đổi tab / tìm kiếm / dựng lại giao diện vẫn GIỮ nguyên lựa chọn;
		  * test được bằng Lua thuần;
		  * UI chỉ đọc `selection.ids` để vẽ ô chọn.
		`tracked` là tập con của những mục được bật theo dõi; nó chỉ ảnh hưởng
		nhật ký và dấu hiệu trên UI, KHÔNG đổi trạng thái phát hiện.
	]]
	self.selection = Client_Selection.new()
	self.tracked = {}
	self.trackedCount = 0
	self.tabId = (self.config.Ui and self.config.Ui.defaultTab) or "home"
	self.selectionFilter = (self.config.Ui and self.config.Ui.selectionFilter) or "all"
	self.lastSyncAt = nil
	self.warnings = {}
	self.startedAt = nil
	self.stats = { starts = 0, pauses = 0, resumes = 0, stops = 0, refreshes = 0, syncs = 0, faults = 0 }
	return self
end

function Radar:State()
	return self.state
end

function Radar:IsRunning()
	return self.state == Radar.STATE.Running
end

function Radar:SelfCheckReport()
	return self.report
end

-- Gom cảnh báo từ nhiều nguồn thành một chuỗi ngắn cho thanh trạng thái.
function Radar:_collectWarnings()
	local warnings = {}
	-- Người dùng phải thấy ngay trên UI rằng dữ liệu KHÔNG CÒN TRỰC TIẾP
	-- khi hệ thống tạm dừng hoặc đang lỗi.
	if self.state == Radar.STATE.Paused then
		warnings[#warnings + 1] = "hệ thống tạm dừng nên dữ liệu đã cũ, không còn trực tiếp"
	elseif self.state == Radar.STATE.Faulted then
		warnings[#warnings + 1] = "hệ thống đang lỗi, dữ liệu đã cũ"
	end
	local stats = self.scanner:Stats()
	if stats.truncated then
		warnings[#warnings + 1] = "quét bị cắt ngắn, kết quả có thể thiếu"
	end
	if not stats.attached then
		warnings[#warnings + 1] = "không nghe được sự kiện Workspace"
	end
	local position = Client_Env.GetPlayerPosition()
	if position == nil then
		warnings[#warnings + 1] = "chưa có vị trí người chơi"
	end
	local lookVector = Client_Env.GetCameraBasis()
	if lookVector == nil then
		warnings[#warnings + 1] = "chưa đọc được hướng camera"
	end
	if self.report ~= nil and self.report.warnings > 0 then
		warnings[#warnings + 1] = ("tự kiểm tra còn %d cảnh báo"):format(self.report.warnings)
	end
	self.warnings = warnings
	return table.concat(warnings, "; ")
end

-- Đọc môi trường một lần cho mỗi nhịp (tránh gọi lặp nhiều nơi).
function Radar:_readEnvironment()
	local playerPosition, positionReason = Client_Env.GetPlayerPosition()
	local lookVector, rightVector = Client_Env.GetCameraBasis()
	return {
		playerPosition = playerPosition,
		playerPositionReason = positionReason,
		lookVector = lookVector,
		rightVector = rightVector,
	}
end

-- Một nhịp làm việc: quét -> kết luận -> đẩy lên UI nếu có thay đổi.
function Radar:_tick(now)
	local ok, err = pcall(function()
		local workspace = Client_Env.GetWorkspace()
		if workspace == nil then
			self.tracker:SetFault("Không lấy được Workspace nên không quét được.")
			return
		end

		local scanReport = self.scanner:Update(now)
		local environment = self:_readEnvironment()

		local developerPositions = nil
		local bridge = self.config.Detection and self.config.Detection.developerBridge
		if bridge ~= nil and bridge.enabled == true then
			developerPositions = self.scanner:ReadDeveloperBridge(workspace)
		end

		self.tracker:ClearFault()
		self.tracker:Refresh(now, self.scanner, environment.playerPosition,
			environment.lookVector, environment.rightVector, developerPositions)

		-- Ghi nhật ký cho những mục người dùng ĐANG THEO DÕI (nếu được phép).
		if (self.config.System == nil or self.config.System.alertOnTrack ~= false) then
			self:_drainAlerts(now)
		end

		if self.ui ~= nil and self.tracker:HasDirty() then
			self:_syncUi(now)
		end
		return scanReport
	end)

	if not ok then
		self.stats.faults = self.stats.faults + 1
		self.state = Radar.STATE.Faulted
		self.tracker:SetFault(tostring(err))
		-- Phải Refresh để mọi mục chuyển sang FAULT; nếu không, UI sẽ tiếp
		-- tục hiển thị kết quả của nhịp trước như thể mọi thứ vẫn ổn.
		self.tracker:Refresh(now, nil, nil, nil, nil, nil)
		Shared_Log.Error("nhịp radar lỗi: " .. tostring(err))
		if self.ui ~= nil then
			self:_syncUi(now, true)
		end
	end
	return ok
end

-- Nút "Làm mới": yêu cầu quét đầy đủ và chạy ngay các task.
function Radar:Refresh()
	self.stats.refreshes = self.stats.refreshes + 1
	self.scanner:RequestFullScan()
	local now = os.clock()
	self.scheduler:RunNow("scan", now)
	self:_syncUi(now, true)
	Shared_Log.Info("Đã yêu cầu quét lại theo yêu cầu người dùng.")
	return true
end

function Radar:_syncUi(now, force)
	if self.ui == nil or not self.ui:IsBuilt() then
		return false
	end
	local counts = self.tracker:CountByStatus()
	local age = self.tracker:GetDataAge(now)
	local stale = self.tracker:IsStale(now)

	local stateText, stateColor, primaryLabel = self:_statePresentation()
	-- Tab quyết định tập mục đem hiển thị (UI chỉ lọc thêm theo lựa chọn).
	local rowsArea = self:_rowsArea()
	local rows = self.tracker:BuildView(self.query, rowsArea)

	local view = {
		rows = rows,
		records = self.tracker.states,
		counts = counts,
		selectedId = self.selectedId,
		areaId = self.areaId,
		tabId = self.tabId,
		stateText = stateText,
		stateColor = stateColor,
		primaryLabel = primaryLabel,
		lastUpdateText = age == nil and "chưa có dữ liệu" or Shared_Geometry.FormatAge(age),
		warningText = (stale and "dữ liệu đã cũ; " or "") .. self:_collectWarnings(),
		confirmedIds = self.scanner.matcher and self.scanner.matcher.confirmed or nil,
		-- Lựa chọn/theo dõi: truyền BẢNG DỮ LIỆU, UI không tự quyết định gì.
		selectionIds = self.selection.ids,
		selectedCount = self.selection:Count(),
		selectionFilter = self.selectionFilter,
		scopeCount = #rows,
		trackedIds = self.tracked,
		trackedCount = self.trackedCount,
	}
	self.ui:Sync(view)
	self.tracker:ConsumeDirty()
	self.stats.syncs = self.stats.syncs + 1
	self.lastSyncAt = now
	return true
end

function Radar:_statePresentation()
	if self.state == Radar.STATE.Running then
		return "ĐANG CHẠY", Ui_Theme.Color.ok, "Tạm dừng"
	end
	if self.state == Radar.STATE.Paused then
		return "TẠM DỪNG (dữ liệu không còn trực tiếp)", Ui_Theme.Color.warning, "Tiếp tục"
	end
	if self.state == Radar.STATE.Faulted then
		return "LỖI — xem Output", Ui_Theme.Color.danger, "Khởi động lại"
	end
	return "ĐÃ TẮT", Ui_Theme.Color.textMuted, "Khởi động"
end

--[[
	KHỞI ĐỘNG. Trả về (ok, message).
	Thứ tự: kiểm tra cấu hình/danh mục -> tự kiểm tra môi trường -> gắn quét
	-> đăng ký task -> chạy scheduler -> dựng UI -> đồng bộ lần đầu.
]]
function Radar:Start()
	if self.state == Radar.STATE.Running then
		return false, "Hệ thống đang chạy sẵn."
	end

	-- 1) Cấu hình và danh mục: sai là DỪNG, không chạy liều.
	local configOk, configProblems = Shared_Config.Validate()
	if not configOk then
		Shared_Log.Error("Cấu hình không hợp lệ, từ chối khởi động: " .. table.concat(configProblems, " | "))
		return false, "Cấu hình sai: " .. table.concat(configProblems, "; ")
	end
	Shared_Log.SetLevel((self.config.Log and self.config.Log.level) or "info")

	-- 2) Dựng các mảnh còn thiếu (trường hợp Start lại sau Stop).
	self.scheduler:Reset()
	if self.scanner.matcher == nil then
		self.scanner = Client_Scanner.new(self.config)
	end

	-- 3) Gắn bộ quét vào Workspace.
	local workspace = Client_Env.GetWorkspace()
	local attachOk, attachMessage = self.scanner:Attach(workspace)
	if not attachOk then
		Shared_Log.Warn("Gắn sự kiện Workspace không thành công: " .. tostring(attachMessage))
	end

	-- 4) Đăng ký công việc định kỳ (một lần duy nhất cho mỗi tên).
	local scanConfig = self.config.Scan or {}
	self.scheduler:SetTask("scan", scanConfig.refreshMatchesSeconds or 0.5, function(now)
		self:_tick(now)
	end)
	self.scheduler:SetTask("prune", math.max(2.0, (scanConfig.fullScanIntervalSeconds or 2.5) * 2), function()
		self.scanner:Prune()
	end)
	self.scheduler:SetTask("clock", (self.config.System and self.config.System.clockRefreshSeconds) or 1.0, function(now)
		if self.ui ~= nil and self.ui:IsBuilt() then
			local age = self.tracker:GetDataAge(now)
			local text = ("Cập nhật: %s"):format(age == nil and "chưa có dữ liệu" or tostring(Shared_Geometry.FormatAge(age)))
			self.ui:SetClockText(text)
		end
	end)

	-- 5) Tự kiểm tra TRƯỚC khi tuyên bố đã chạy.
	self.report = Client_SelfCheck.Run({
		config = self.config,
		env = Client_Env,
		scanner = self.scanner,
		scheduler = self.scheduler,
		guiParent = Client_Env.GetPlayerGui(),
	})
	Shared_Log.Info(Client_SelfCheck.Summary(self.report))
	for _, failure in ipairs(Client_SelfCheck.Failures(self.report)) do
		Shared_Log.Warn("  - " .. failure)
	end

	-- 6) Dựng UI (nếu được phép và có nơi gắn).
	if self.config.Ui and self.config.Ui.enabled ~= false then
		self:_buildUi()
	end

	-- 7) Chạy scheduler.
	local startOk, startMessage = self.scheduler:Start()
	if not startOk then
		Shared_Log.Error("Không khởi động được scheduler: " .. tostring(startMessage))
		return false, tostring(startMessage)
	end

	self.state = Radar.STATE.Running
	self.stats.starts = self.stats.starts + 1
	self.startedAt = os.clock()
	self.tracker:SetActive(true)
	self.scanner:RequestFullScan()

	-- 8) Một nhịp ngay để có dữ liệu hiển thị, không chờ tới chu kỳ đầu.
	self:_tick(os.clock())
	self:_syncUi(os.clock(), true)

	if not self.report.ok then
		return false, ("Hệ thống chạy ở chế độ hạn chế. Tự kiểm tra có %d lỗi: %s")
			:format(self.report.errors, table.concat(Client_SelfCheck.Failures(self.report), " | "))
	end
	return true, ("Hệ thống đang chạy. %s"):format(Client_SelfCheck.Summary(self.report))
end

function Radar:_buildUi()
	if self.ui ~= nil and self.ui:IsBuilt() then
		return true
	end
	local playerGui = Client_Env.GetPlayerGui()
	if playerGui == nil then
		Shared_Log.Warn("Không có PlayerGui: bỏ qua giao diện, hệ thống vẫn chạy nền.")
		return false
	end
	-- Đọc kích thước thật của màn hình để UI tự co giãn. Đọc không được thì
	-- bỏ qua (UI sẽ dùng kích thước trong cấu hình) chứ không đoán.
	local viewport = nil
	local camera = Client_Env.GetCamera()
	if camera ~= nil then
		local value, ok = Shared_Safe.Read(camera, "ViewportSize")
		if ok and value ~= nil then
			local okRead, x = pcall(function()
				return value.X
			end)
			if okRead and Shared_Geometry.IsFiniteNumber(x) then
				viewport = value
			end
		end
	end
	self.ui = Ui_RadarUi.new(self.config, {
		onPrimary = function()
			self:Primary()
		end,
		onStop = function()
			self:Stop()
		end,
		onRefresh = function()
			self:Refresh()
		end,
		onClose = function()
			self:SetVisible(false)
		end,
		onSearch = function(text)
			self:SetQuery(text)
		end,
		onArea = function(areaId)
			self:SetArea(areaId)
		end,
		onSelect = function(entityId)
			self:Select(entityId)
		end,
		onTab = function(tabId)
			self:SetTab(tabId)
		end,
		onToggleSelect = function(entityId)
			self:ToggleSelect(entityId)
		end,
		onSelectScope = function(selected)
			self:SelectScope(selected)
		end,
		onSelectAllAreas = function()
			self:SelectAllAreas()
		end,
		onClearSelection = function()
			self:ClearSelection()
		end,
		onSelectionFilter = function(filter)
			self:SetSelectionFilter(filter)
		end,
		onToggleTrack = function(entityId)
			self:ToggleTrack(entityId)
		end,
		onTrackSelection = function(turnOn)
			self:SetTrackedForSelection(turnOn)
		end,
		onSetting = function(key, value)
			self:ApplySetting(key, value)
		end,
		onClearLog = function()
			self:ClearLog()
		end,
	})
	local ok, message = self.ui:Build(playerGui, viewport)
	if not ok then
		Shared_Log.Warn("Không dựng được giao diện: " .. tostring(message))
		return false
	end
	Shared_Log.Info("Giao diện: " .. tostring(message))
	return true
end

-- Nút ngữ cảnh trên UI: khởi động / tạm dừng / tiếp tục.
function Radar:Primary()
	if self.state == Radar.STATE.Running then
		return self:Pause()
	end
	if self.state == Radar.STATE.Paused then
		return self:Resume()
	end
	return self:Start()
end

function Radar:Pause()
	if self.state ~= Radar.STATE.Running then
		return false, ("Không thể tạm dừng từ trạng thái '%s'"):format(tostring(self.state))
	end
	local ok, message = self.scheduler:Pause()
	if not ok then
		return false, message
	end
	self.state = Radar.STATE.Paused
	self.stats.pauses = self.stats.pauses + 1
	-- Dữ liệu vẫn còn nhưng KHÔNG còn là trực tiếp: đánh dấu để UI nói rõ.
	self.tracker:Refresh(os.clock(), nil, nil, nil, nil, nil)
	for _, record in pairs(self.tracker.states) do
		if record ~= nil and record.code == Shared_Status.Code.Detected then
			record.stale = true
		end
	end
	if self.ui ~= nil then
		self:_syncUi(os.clock(), true)
	end
	Shared_Log.Info("Đã tạm dừng. Dữ liệu đang hiển thị là dữ liệu cũ.")
	return true, "Đã tạm dừng."
end

function Radar:Resume()
	if self.state ~= Radar.STATE.Paused then
		return false, ("Không thể tiếp tục từ trạng thái '%s'"):format(tostring(self.state))
	end
	local ok, message = self.scheduler:Resume()
	if not ok then
		return false, message
	end
	self.state = Radar.STATE.Running
	self.stats.resumes = self.stats.resumes + 1
	self.scanner:RequestFullScan()
	self:_tick(os.clock())
	if self.ui ~= nil then
		self:_syncUi(os.clock(), true)
	end
	Shared_Log.Info("Đã tiếp tục.")
	return true, "Đã tiếp tục."
end

--[[
	DỪNG HẲN: ngắt scheduler, gỡ sự kiện Workspace, xoá trạng thái.
	Không huỷ UI (để bật lại nhanh); muốn huỷ luôn thì gọi Destroy().
]]
function Radar:Stop()
	self.scheduler:Stop()
	self.scanner:Detach()
	self.tracker:SetActive(false)
	self.state = Radar.STATE.Stopped
	self.stats.stops = self.stats.stops + 1
	if self.ui ~= nil then
		self:_syncUi(os.clock(), true)
	end
	Shared_Log.Info("Đã dừng hệ thống. Không còn vòng lặp nền nào.")
	return true, "Đã dừng."
end

function Radar:SetQuery(query)
	self.query = type(query) == "string" and query or ""
	if self.ui ~= nil then
		self:_syncUi(os.clock(), true)
	end
	return true
end

--[[
	Bộ lọc khu vực. Vì mỗi khu vực có MỘT tab riêng nên đổi khu vực cũng
	đổi tab (giữ hành vi cũ: người dùng vẫn bấm được "Tất cả" để xem cả 82 mục).
]]
function Radar:SetArea(areaId)
	if type(areaId) ~= "string" then
		return false
	end
	self.areaId = areaId
	if Shared_Config.GetTab(areaId) ~= nil then
		self.tabId = areaId
	end
	if self.ui ~= nil then
		self:_syncUi(os.clock(), true)
	end
	return true
end

--======================== TAB / LỰA CHỌN / THEO DÕI ========================

--[[
	Khu vực dùng để dựng danh sách dòng, suy ra từ tab đang mở:
	  * tab khu vực  -> đúng khu vực đó ("all" = mọi khu vực);
	  * tab Đã chọn  -> MỌI khu vực, vì lựa chọn là xuyên khu vực. Nếu giữ
	    bộ lọc khu vực cũ thì tab "Đã chọn" sẽ hiện thiếu mục người dùng
	    đã chọn ở khu vực khác (lỗi thật, test TAB-003 bắt được);
	  * tab khác     -> không có danh sách.
]]
function Radar:_rowsArea()
	local tab = Shared_Config.GetTab(self.tabId)
	if tab == nil then
		return self.areaId
	end
	if tab.kind == "area" then
		return tab.area
	end
	if tab.kind == "selected" then
		return "all"
	end
	return self.areaId
end

-- Chuyển tab. Trả về (ok, message).
function Radar:SetTab(tabId)
	local tab = Shared_Config.GetTab(tabId)
	if tab == nil then
		return false, ("Không có tab '%s'"):format(tostring(tabId))
	end
	self.tabId = tab.id
	-- Tab khu vực thì đồng bộ luôn bộ lọc khu vực (hai nơi phải khớp nhau).
	if tab.kind == "area" and type(tab.area) == "string" then
		self.areaId = tab.area
	end
	if self.ui ~= nil then
		self:_syncUi(os.clock(), true)
	end
	return true, tab.label
end

function Radar:ActiveTab()
	return self.tabId
end

-- Danh sách id đang hiển thị trong phạm vi hiện tại (tab + tìm kiếm).
-- Dùng cho nút "Chọn tất cả" — PHẠM VI, không phải toàn bộ danh mục.
function Radar:VisibleEntityIds()
	local rowsArea = self:_rowsArea()
	local ids = {}
	for _, data in ipairs(self.tracker:BuildView(self.query, rowsArea)) do
		local entry = data.entry
		local isSelected = self.selection:IsSelected(entry.id)
		local keep = true
		if self.selectionFilter == "selected" and not isSelected then
			keep = false
		elseif self.selectionFilter == "unselected" and isSelected then
			keep = false
		end
		if keep then
			ids[#ids + 1] = entry.id
		end
	end
	return ids
end

-- Bấm vào ô chọn của một dòng.
function Radar:ToggleSelect(entityId)
	local nowSelected, ok, message = self.selection:Toggle(entityId)
	if not ok then
		Shared_Log.Warn("Không chọn được mục: " .. tostring(message))
		return false, tostring(message)
	end
	-- Bỏ chọn thì tắt luôn theo dõi của mục đó: không theo dõi thứ không chọn.
	if nowSelected == false and self.tracked[entityId] == true then
		self:_setTracked(entityId, false)
	end
	if self.ui ~= nil then
		self:_syncUi(os.clock(), true)
	end
	return true, nowSelected
end

function Radar:SetSelected(entityId, selected)
	local changed, ok, message = self.selection:Set(entityId, selected)
	if not ok then
		return false, tostring(message)
	end
	if changed and selected == false and self.tracked[entityId] == true then
		self:_setTracked(entityId, false)
	end
	if changed and self.ui ~= nil then
		self:_syncUi(os.clock(), true)
	end
	return true, changed
end

-- Chọn/bỏ chọn mọi mục TRONG PHẠM VI ĐANG XEM (không phải toàn danh mục).
function Radar:SelectScope(selected)
	local ids = self:VisibleEntityIds()
	local changedCount, rejectedCount = self.selection:SetMany(ids, selected)
	if selected == false then
		for _, entityId in ipairs(ids) do
			if self.tracked[entityId] == true then
				self:_setTracked(entityId, false)
			end
		end
	end
	if self.ui ~= nil then
		self:_syncUi(os.clock(), true)
	end
	Shared_Log.Info(("Đã %s %d mục trong phạm vi đang xem (%d mục bị từ chối).")
		:format(selected and "chọn" or "bỏ chọn", changedCount, rejectedCount))
	return changedCount, rejectedCount
end

-- Chọn toàn bộ danh mục (mọi khu vực).
function Radar:SelectAllAreas()
	local ids = Client_Selection.AllCatalogIds()
	local changedCount = self.selection:SetMany(ids, true)
	if self.ui ~= nil then
		self:_syncUi(os.clock(), true)
	end
	Shared_Log.Info(("Đã chọn toàn bộ danh mục: %d mục mới, tổng %d mục.")
		:format(changedCount, self.selection:Count()))
	return changedCount
end

function Radar:ClearSelection()
	local removed = self.selection:Clear()
	if removed > 0 then
		-- Bỏ chọn toàn bộ thì cũng ngừng theo dõi toàn bộ.
		for entityId in pairs(self.tracked) do
			self.tracker:SetFocus(entityId, false)
		end
		self.tracked = {}
		self.trackedCount = 0
	end
	if self.ui ~= nil then
		self:_syncUi(os.clock(), true)
	end
	return removed
end

function Radar:SetSelectionFilter(filter)
	local valid = { all = true, selected = true, unselected = true }
	if valid[filter] ~= true then
		return false, ("Bộ lọc lạ: %s"):format(tostring(filter))
	end
	self.selectionFilter = filter
	if self.ui ~= nil then
		self:_syncUi(os.clock(), true)
	end
	return true
end

function Radar:IsTracked(entityId)
	return self.tracked[entityId] == true
end

function Radar:TrackedCount()
	return self.trackedCount
end

-- Bật/tắt theo dõi. Chỉ mục CÓ cơ chế phát hiện (method = scan) mới theo dõi
-- được; mục "không hỗ trợ" thì từ chối và nói rõ lý do (không hứa suông).
function Radar:_setTracked(entityId, tracked)
	local entry = Shared_Catalog.Get(entityId)
	if entry == nil then
		return false, "không có mục này trong danh mục"
	end
	if entry.detect == nil or entry.detect.method ~= "scan" then
		return false, ("mục '%s' không có cơ chế phát hiện từ client"):format(entry.name)
	end
	local wantTracked = tracked == true
	local hasTracked = self.tracked[entityId] == true
	if hasTracked == wantTracked then
		return false, "không đổi"
	end
	if wantTracked then
		self.tracked[entityId] = true
		self.trackedCount = self.trackedCount + 1
	else
		self.tracked[entityId] = nil
		self.trackedCount = self.trackedCount - 1
	end
	self.tracker:SetFocus(entityId, wantTracked)
	return true, nil
end

function Radar:ToggleTrack(entityId)
	local ok, message = self:_setTracked(entityId, self.tracked[entityId] ~= true)
	if not ok then
		Shared_Log.Warn("Không theo dõi được: " .. tostring(message))
		if self.ui ~= nil then
			self:_syncUi(os.clock(), true)
		end
		return false, tostring(message)
	end
	local isTracked = self.tracked[entityId] == true
	Shared_Log.Info(("%s theo dõi '%s'.")
		:format(isTracked and "Bật" or "Tắt", tostring(Shared_Catalog.Get(entityId).name)))
	if self.ui ~= nil then
		self:_syncUi(os.clock(), true)
	end
	return true, isTracked
end

-- Bật/tắt theo dõi cho NHÓM mục (chỉ những mục đã chọn và hỗ trợ phát hiện).
function Radar:SetTrackedForSelection(tracked)
	local applied = 0
	local skipped = 0
	for _, entityId in ipairs(self.selection:Ids()) do
		local ok = self:_setTracked(entityId, tracked)
		if ok then
			applied = applied + 1
		else
			skipped = skipped + 1
		end
	end
	if self.ui ~= nil then
		self:_syncUi(os.clock(), true)
	end
	return applied, skipped
end

--============================= CÀI ĐẶT TRỰC TIẾP ============================

--[[
	Áp dụng một tuỳ chọn từ tab Cài đặt. `key` dạng "Ui.showSearch".
	Các tuỳ chọn CẤU TRÚC (thêm/bớt cả một khối giao diện) phải DỰNG LẠI UI;
	Radar huỷ UI cũ trước khi dựng cái mới nên không bao giờ có hai bản.
]]
local STRUCTURAL_SETTINGS = {
	["Ui.showTabs"] = true,
	["Ui.showSearch"] = true,
	["Ui.showAreaFilter"] = true,
	["Ui.showDetailPanel"] = true,
	["Ui.showStatusBar"] = true,
	["Ui.showSelectionBar"] = true,
}

function Radar:ApplySetting(key, value)
	local group, field = nil, nil
	for part in string.gmatch(tostring(key), "[^%.]+") do
		if group == nil then
			group = part
		else
			field = part
		end
	end
	-- Chỉ chấp nhận khoá CÓ SẴN trong cấu hình: nếu không, một lần gõ nhầm
	-- sẽ âm thầm tạo ra trường rác mà không ai dùng (và người dùng tưởng
	-- mình đã tắt được thứ gì đó).
	if group == nil or field == nil or type(self.config[group]) ~= "table"
		or self.config[group][field] == nil then
		return false, ("Không nhận ra tuỳ chọn '%s'"):format(tostring(key))
	end
	if type(self.config[group][field]) ~= "boolean" then
		return false, ("Tuỳ chọn '%s' không phải công tắc bật/tắt"):format(tostring(key))
	end
	if type(value) ~= "boolean" then
		return false, ("Tuỳ chọn '%s' chỉ nhận true/false"):format(tostring(key))
	end

	self.config[group][field] = value
	Shared_Log.Info(("Đã đổi %s = %s"):format(tostring(key), tostring(value)))

	if STRUCTURAL_SETTINGS[key] == true then
		self:RebuildUi()
	elseif key == "Ui.enableDrag" then
		-- Kéo thả bật/tắt được mà không cần dựng lại: chỉ cần nối/ngắt handler.
		if self.ui ~= nil then
			if value == true then
				self.ui:_enableDrag()
			end
		end
	end

	if self.ui ~= nil then
		self:_syncUi(os.clock(), true)
	end
	return true, value
end

-- Huỷ UI cũ rồi dựng lại (giữ nguyên tab, tìm kiếm, lựa chọn).
function Radar:RebuildUi()
	if self.ui ~= nil then
		self.ui:Destroy()
		self.ui = nil
	end
	if self.config.Ui == nil or self.config.Ui.enabled == false then
		return false, "Giao diện đang tắt trong cấu hình."
	end
	return self:_buildUi()
end

-- Xoá nhật ký hiển thị trên giao diện (Output của Studio không bị ảnh hưởng).
function Radar:ClearLog()
	local removed = Shared_Log.ClearHistory()
	if self.ui ~= nil then
		self.ui:_syncLog(true)
	end
	Shared_Log.Info(("Đã xoá %d dòng nhật ký trên giao diện."):format(removed))
	return removed
end

--[[
	ĐỌC alert từ Tracker và ghi nhật ký. Chỉ chạy khi có alert (danh sách rỗng
	thì hàm thoát ngay) nên không tốn gì trong nhịp bình thường.
]]
function Radar:_drainAlerts(now)
	if self.tracker:FocusCount() == 0 then
		return 0
	end
	local alerts = self.tracker:TakeAlerts()
	if #alerts == 0 then
		return 0
	end
	local logged = 0
	for _, alert in ipairs(alerts) do
		if alert.detected then
			local distanceText = "không rõ khoảng cách"
			if Shared_Geometry.IsFiniteNumber(alert.distance) then
				distanceText = tostring(Shared_Geometry.FormatDistance(alert.distance))
				if alert.direction ~= nil then
					distanceText = distanceText .. ", " .. tostring(alert.direction)
				end
			end
			Shared_Log.Info(("[THEO DÕI] Thấy %s — %s"):format(alert.name, distanceText))
		else
			Shared_Log.Info(("[THEO DÕI] Không còn thấy %s"):format(alert.name))
		end
		logged = logged + 1
	end
	return logged
end

function Radar:Select(entityId)
	self.selectedId = entityId
	if self.ui ~= nil then
		self:_syncUi(os.clock(), true)
	end
	return true
end

-- Ẩn/hiện bảng. Hệ thống KHÔNG bị dừng khi ẩn.
function Radar:SetVisible(visible)
	if self.ui == nil or not self.ui:IsBuilt() then
		return false, "Chưa có giao diện."
	end
	self.ui:SetOpen(visible)
	return true, visible and "Đã mở bảng." or "Đã ẩn bảng (hệ thống vẫn chạy)."
end

function Radar:ToggleVisible()
	if self.ui == nil or not self.ui:IsBuilt() then
		return false, "Chưa có giao diện."
	end
	return self:SetVisible(not self.ui:IsOpen())
end

function Radar:Stats()
	return {
		state = self.state,
		radar = self.stats,
		scheduler = self.scheduler:Stats(),
		scanner = self.scanner:Stats(),
		tracker = self.tracker:Stats(),
		ui = self.ui ~= nil and self.ui:Stats() or nil,
		matcher = self.scanner.matcher ~= nil and Client_Matcher.Stats(self.scanner.matcher) or nil,
		registry = {
			connections = Client_Registry.ConnectionCount(),
			instances = Client_Registry.InstanceCount(),
		},
		selection = self.selection:Stats(),
		tracked = self.trackedCount,
		tab = self.tabId,
		selectionFilter = self.selectionFilter,
	}
end

--[[
	HUỶ HOÀN TOÀN: ngắt mọi connection, huỷ GUI, dừng scheduler.
	Sau lời gọi này số connection và instance do dự án tạo phải về 0.
]]
function Radar:Destroy()
	self.scheduler:Destroy()
	self.scanner:Destroy()
	self.tracker:Destroy()
	if self.ui ~= nil then
		self.ui:Destroy()
		self.ui = nil
	end
	self.state = Radar.STATE.Stopped
	local disconnected, destroyed = Client_Registry.Shutdown()
	Shared_Log.Info(("Đã huỷ hệ thống: ngắt %d connection, huỷ %d instance.")
		:format(disconnected, destroyed))
	return disconnected, destroyed
end

return Radar
]=],
	["Client/Ui/RadarUi"] = [=[
--[[
	doors-entity-radar/src/Client/Ui/RadarUi.luau
	ModuleScript — đặt tại: DoorsEntityRadar.Client.Ui.RadarUi

	GIAO DIỆN CHÍNH (nhiều tab). Chỉ làm hai việc: dựng widget và ĐỔ dữ liệu.
	Mọi kết luận (có phát hiện hay không, khoảng cách bao nhiêu) đều do
	Tracker quyết định — UI không bao giờ tự suy ra.

	CẤU TRÚC:
	  ScreenGui
	  └─ Panel                       (kéo được bằng thanh tiêu đề)
	     ├─ Header    : tiêu đề, trạng thái, thu nhỏ, làm mới, chạy/dừng, đóng
	     ├─ TabBar    : 13 tab (Trang chủ, Tất cả, 8 khu vực, Đã chọn, Cài đặt, Nhật ký)
	     ├─ FilterBar : ô tìm kiếm + dải lọc khu vực + bộ lọc lựa chọn
	     ├─ SelectionBar : Chọn tất cả / Bỏ chọn / Chọn tất cả khu vực / Bỏ chọn toàn bộ
	     │                 + bộ đếm "Đã chọn 12/50"
	     ├─ Body
	     │  ├─ ListPage  : danh sách mục (ô chọn, chấm trạng thái, tên, loại,
	     │  │              trạng thái, khoảng cách) + bảng chi tiết
	     │  ├─ HomePage  : trạng thái hệ thống, bộ đếm, thao tác nhanh
	     │  ├─ SettingsPage : các công tắc giao diện/hành vi
	     │  └─ LogPage   : nhật ký hoạt động
	     └─ StatusBar : đồng hồ cập nhật (nhãn riêng) + bộ đếm + cảnh báo

	BA RÀNG BUỘC ĐÃ KIỂM THỬ:
	  1. Chỉ hiển thị khoảng cách/hướng/toạ độ khi record.code = DETECTED
	     (hỏi Shared_Status.MayShowPosition chứ không tự quyết).
	  2. Không ghi lại property khi giá trị không đổi — Widgets.SetText/SetColor
	     tự bỏ qua và đếm vào stats.skipped.
	  3. CHUYỂN TAB KHÔNG DỰNG LẠI GÌ: mọi trang được tạo MỘT lần lúc Build,
	     chuyển tab chỉ đổi Visible. Số widget tạo ra (stats.widgetsCreated)
	     phải giữ nguyên sau bao nhiêu lần chuyển tab cũng vậy.
]]

local Shared_Safe = __DER_REQUIRE("Shared/Safe")
local Shared_Log = __DER_REQUIRE("Shared/Log")
local Shared_Status = __DER_REQUIRE("Shared/Status")
local Shared_Geometry = __DER_REQUIRE("Shared/Geometry")
local Shared_Catalog = __DER_REQUIRE("Shared/EntityCatalog")
local Shared_Areas = __DER_REQUIRE("Shared/Areas")
local Shared_Config = __DER_REQUIRE("Shared/Config")
local Client_Env = __DER_REQUIRE("Client/Core/Env")
local Client_Registry = __DER_REQUIRE("Client/Core/Registry")
local Ui_Theme = __DER_REQUIRE("Client/Ui/Theme")
local Ui_Widgets = __DER_REQUIRE("Client/Ui/Widgets")

local RadarUi = {}
RadarUi.__index = RadarUi

--[[
	callbacks (mọi hàm đều tuỳ chọn; thiếu thì nút tương ứng chỉ không làm gì):
	  onPrimary                 — nút ngữ cảnh: khởi động / tạm dừng / tiếp tục
	  onStop                    — dừng hẳn hệ thống
	  onRefresh                 — quét lại ngay
	  onClose                   — đóng bảng (hệ thống vẫn chạy nền)
	  onMinimize(minimized)     — thu nhỏ / mở lại
	  onSearch(text)            — ô tìm kiếm
	  onArea(areaId)            — dải lọc khu vực
	  onTab(tabId)              — chuyển tab
	  onSelect(entityId)        — bấm vào một dòng (xem chi tiết)
	  onToggleSelect(entityId)  — bấm vào Ô CHỌN của một dòng
	  onSelectScope(selected)   — chọn/bỏ chọn mọi mục trong phạm vi đang xem
	  onSelectAllAreas()        — chọn toàn bộ danh mục
	  onClearSelection()        — bỏ chọn toàn bộ
	  onSelectionFilter(filter) — "all" | "selected" | "unselected"
	  onToggleTrack(entityId)   — bật/tắt theo dõi một mục
	  onSetting(key, value)     — đổi một tuỳ chọn trong tab Cài đặt
	  onClearLog()              — xoá nhật ký trên giao diện
]]
function RadarUi.new(config, callbacks)
	local self = setmetatable({}, RadarUi)
	self.config = config or {}
	self.callbacks = callbacks or {}
	self.gui = nil
	self.parts = {}
	self.pages = {}
	self.rows = {}
	self.areaButtons = {}
	self.tabButtons = {}
	self.settingButtons = {}
	self.filterButtons = {}
	self.built = false
	self.open = false
	self.minimized = false
	self.selectedId = nil
	self.activeTab = nil
	self.activeKind = nil
	self.lastQuery = nil
	self.lastAreaId = nil
	self.lastTabId = nil
	self.lastFilter = nil
	self.lastSelectionCount = nil
	self.lastLogCount = nil
	self.lastLogText = nil
	self.narrow = false
	self.renderedRows = 0
	self.lastRowCount = 0
	-- Bảng tái sử dụng để lọc dòng theo bộ lọc lựa chọn (không tạo bảng mới
	-- mỗi lần Sync — Sync chạy vài lần mỗi giây).
	self.filteredRows = {}
	self.drag = nil
	self.stats = { syncs = 0, rowsUpdated = 0, tabSwitches = 0, drags = 0, selectionClicks = 0 }
	return self
end

-- Gọi một callback nếu có, bọc pcall để lỗi UI không kéo sập hệ thống.
function RadarUi:_call(name, ...)
	local handler = self.callbacks[name]
	if type(handler) ~= "function" then
		return false
	end
	local ok, err = pcall(handler, ...)
	if not ok then
		warn(("[DER] callback UI '%s' ném lỗi: %s"):format(tostring(name), tostring(err)))
		return false
	end
	return true
end

-- Danh sách tab (đọc từ cấu hình — thêm tab không cần sửa tệp này).
function RadarUi:_tabs()
	local uiConfig = self.config.Ui
	if uiConfig == nil or type(uiConfig.TABS) ~= "table" then
		return Shared_Config.Ui.TABS
	end
	return uiConfig.TABS
end

-- Tính bố cục theo kích thước màn hình thật (nếu đọc được).
function RadarUi:_computeLayout(viewportSize)
	local uiConfig = (self.config.Ui) or {}
	local panelWidth = uiConfig.panelWidth or 760
	local panelHeight = uiConfig.panelHeight or 520
	local narrowThreshold = uiConfig.narrowViewportWidth or 700
	local scale = 1

	local viewportX, viewportY = nil, nil
	if type(viewportSize) == "table" or type(viewportSize) == "userdata" then
		local okRead, x, y = pcall(function()
			return viewportSize.X, viewportSize.Y
		end)
		if okRead and Shared_Geometry.IsFiniteNumber(x) and Shared_Geometry.IsFiniteNumber(y) then
			viewportX = x
			viewportY = y
		end
	end

	if viewportX ~= nil then
		if viewportX < narrowThreshold then
			self.narrow = true
			scale = 0.85
		end
		-- Không bao giờ để bảng tràn màn hình.
		if panelWidth > viewportX - 20 then
			panelWidth = math.max(280, viewportX - 20)
		end
		if viewportY ~= nil and panelHeight > viewportY - 20 then
			panelHeight = math.max(240, viewportY - 20)
		end
		-- Nhớ kích thước thật để kẹp bảng khi kéo (không cho bay khỏi màn hình).
		self.viewport = { x = viewportX, y = viewportY }
	else
		self.viewport = nil
		-- Không đọc được ViewportSize: giữ kích thước cấu hình, không đoán.
		self.narrow = false
	end

	local metrics = Ui_Theme.Metrics
	local showTabs = uiConfig.showTabs ~= false
	local tabBarHeight = showTabs and metrics.tabBarHeight or 0
	local filterHeight = (uiConfig.showSearch or uiConfig.showAreaFilter) and metrics.filterHeight or 0
	local selectionHeight = (uiConfig.showSelectionBar ~= false) and metrics.selectionBarHeight or 0
	local statusHeight = uiConfig.showStatusBar and metrics.statusHeight or 0
	local bodyTop = metrics.headerHeight + tabBarHeight + filterHeight + selectionHeight + 8
	local bodyHeight = panelHeight - bodyTop - statusHeight - 8

	return {
		panelWidth = panelWidth,
		panelHeight = panelHeight,
		scale = scale,
		showTabs = showTabs,
		tabBarHeight = tabBarHeight,
		filterHeight = filterHeight,
		selectionHeight = selectionHeight,
		statusHeight = statusHeight,
		bodyTop = bodyTop,
		bodyHeight = math.max(120, bodyHeight),
	}
end

-- Dựng toàn bộ cây widget. Trả về (ok, message).
function RadarUi:Build(parent, viewportSize)
	if self.built then
		return true, "Giao diện đã dựng sẵn."
	end
	if parent == nil then
		return false, "Không có nơi gắn giao diện (PlayerGui = nil)."
	end

	local layout = self:_computeLayout(viewportSize)
	self.layout = layout

	local gui = Ui_Widgets.ScreenGui(parent, {
		Name = "DoorsEntityRadar",
		ResetOnSpawn = false,
		IgnoreGuiInset = true,
		ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
		DisplayOrder = 20,
		Enabled = true,
	})
	if gui == nil then
		return false, "Không tạo được ScreenGui."
	end
	self.gui = gui

	local panel = Ui_Widgets.Frame(gui, {
		Name = "Panel",
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.new(0.5, 0, 0.5, 0),
		Size = UDim2.fromOffset(layout.panelWidth, layout.panelHeight),
		BackgroundColor3 = Ui_Theme.Color.background,
		BorderColor3 = Ui_Theme.Color.panelEdge,
		ClipsDescendants = true,
	}, "ui:Panel")
	Ui_Widgets.Corner(panel)
	Ui_Widgets.Stroke(panel, Ui_Theme.Color.panelEdge, 1)
	if layout.scale ~= 1 then
		Ui_Widgets.Scale(panel, layout.scale)
	end
	self.parts.panel = panel

	self:_buildHeader(panel, layout)
	if layout.showTabs then
		self:_buildTabBar(panel, layout)
	end
	self:_buildFilterBar(panel, layout)
	self:_buildSelectionBar(panel, layout)
	self:_buildBody(panel, layout)
	self:_buildStatusBar(panel, layout)
	self:_enableDrag()

	self.built = true
	self.open = true

	-- Tab mặc định: lấy từ cấu hình; id lạ thì về tab ĐẦU TIÊN (không đoán mò).
	local wantedTab = (self.config.Ui and self.config.Ui.defaultTab) or "home"
	if Shared_Config.GetTab(wantedTab) == nil then
		local tabs = self:_tabs()
		wantedTab = tabs[1] and tabs[1].id or "home"
	end
	self:SetTab(wantedTab, true)

	if (self.config.Ui and self.config.Ui.startMinimized) == true then
		self:SetMinimized(true)
	end

	return true, ("Đã dựng giao diện %dx%d, %d tab (thu nhỏ %.2f, chế độ hẹp: %s).")
		:format(layout.panelWidth, layout.panelHeight, #self:_tabs(), layout.scale, tostring(self.narrow))
end

--=============================== HEADER ===============================

function RadarUi:_buildHeader(panel, layout)
	local metrics = Ui_Theme.Metrics
	local header = Ui_Widgets.Frame(panel, {
		Name = "Header",
		Position = UDim2.new(0, 0, 0, 0),
		Size = UDim2.new(1, 0, 0, metrics.headerHeight),
		BackgroundColor3 = Ui_Theme.Color.headerBackground,
	}, "ui:Header")
	Ui_Widgets.Corner(header)
	self.parts.header = header

	self.parts.title = Ui_Widgets.Label(header, {
		Name = "Title",
		Position = UDim2.new(0, metrics.padding, 0, 0),
		Size = UDim2.new(0.5, -metrics.padding, 1, 0),
		Text = "DOORS ENTITY RADAR",
		Font = Ui_Theme.Font.title,
		TextSize = Ui_Theme.TextSize.title,
	}, "ui:Title")

	self.parts.stateLabel = Ui_Widgets.Label(header, {
		Name = "State",
		Position = UDim2.new(0.5, 0, 0, 2),
		Size = UDim2.new(0.5, -metrics.padding * 2 - metrics.buttonWidth * 3 - 88, 0, 18),
		Text = "chưa khởi động",
		TextSize = Ui_Theme.TextSize.small,
		TextColor3 = Ui_Theme.Color.textSecondary,
		TextXAlignment = Enum.TextXAlignment.Right,
	}, "ui:State")

	-- Hàng nút bên phải: thu nhỏ / làm mới / chạy-dừng / đóng.
	local buttonRow = Ui_Widgets.Frame(header, {
		Name = "Buttons",
		AnchorPoint = Vector2.new(1, 0.5),
		Position = UDim2.new(1, -metrics.padding, 0.5, 0),
		Size = UDim2.fromOffset(metrics.buttonWidth * 3 + 88, 28),
		BackgroundTransparency = 1,
	}, "ui:ButtonRow")
	Ui_Widgets.ListLayout(buttonRow, {
		FillDirection = Enum.FillDirection.Horizontal,
		Padding = UDim.new(0, 6),
		HorizontalAlignment = Enum.HorizontalAlignment.Right,
		VerticalAlignment = Enum.VerticalAlignment.Center,
	})

	self.parts.minimizeButton = Ui_Widgets.Button(buttonRow, {
		Name = "Minimize",
		Size = UDim2.fromOffset(28, 28),
		Text = "—",
		LayoutOrder = 1,
	}, "ui:MinimizeButton")
	Ui_Widgets.Corner(self.parts.minimizeButton, UDim.new(0, 6))
	Ui_Widgets.OnClick(self.parts.minimizeButton, function()
		self:ToggleMinimized()
	end, "ui:clickMinimize")

	self.parts.primaryButton = Ui_Widgets.Button(buttonRow, {
		Name = "Primary",
		Size = UDim2.fromOffset(metrics.buttonWidth, 28),
		Text = "Khởi động",
		LayoutOrder = 2,
	}, "ui:PrimaryButton")
	Ui_Widgets.Corner(self.parts.primaryButton, UDim.new(0, 6))
	Ui_Widgets.OnClick(self.parts.primaryButton, function()
		self:_call("onPrimary")
	end, "ui:clickPrimary")

	self.parts.refreshButton = Ui_Widgets.Button(buttonRow, {
		Name = "Refresh",
		Size = UDim2.fromOffset(metrics.buttonWidth, 28),
		Text = "Làm mới",
		LayoutOrder = 3,
	}, "ui:RefreshButton")
	Ui_Widgets.Corner(self.parts.refreshButton, UDim.new(0, 6))
	Ui_Widgets.OnClick(self.parts.refreshButton, function()
		self:_call("onRefresh")
	end, "ui:clickRefresh")

	self.parts.closeButton = Ui_Widgets.Button(buttonRow, {
		Name = "Close",
		Size = UDim2.fromOffset(54, 28),
		Text = "Đóng",
		BackgroundColor3 = Ui_Theme.Color.accentDark,
		LayoutOrder = 4,
	}, "ui:CloseButton")
	Ui_Widgets.Corner(self.parts.closeButton, UDim.new(0, 6))
	Ui_Widgets.OnClick(self.parts.closeButton, function()
		self:_call("onClose")
	end, "ui:clickClose")

	self.parts.stopButton = Ui_Widgets.Button(header, {
		Name = "Stop",
		AnchorPoint = Vector2.new(1, 1),
		Position = UDim2.new(1, -metrics.padding, 1, -3),
		Size = UDim2.fromOffset(60, 14),
		Text = "dừng hệ thống",
		TextSize = Ui_Theme.TextSize.tiny,
		BackgroundColor3 = Ui_Theme.Color.headerBackground,
		TextColor3 = Ui_Theme.Color.textMuted,
	}, "ui:StopButton")
	Ui_Widgets.OnClick(self.parts.stopButton, function()
		self:_call("onStop")
	end, "ui:clickStop")
end

--=============================== TAB BAR ==============================

function RadarUi:_buildTabBar(panel, layout)
	local metrics = Ui_Theme.Metrics
	local bar = Ui_Widgets.Scrolling(panel, {
		Name = "TabBar",
		Position = UDim2.new(0, 0, 0, metrics.headerHeight),
		Size = UDim2.new(1, 0, 0, layout.tabBarHeight),
		BackgroundColor3 = Ui_Theme.Color.headerBackground,
		ScrollingDirection = Enum.ScrollingDirection.X,
	}, "ui:TabBar")
	Ui_Widgets.ListLayout(bar, {
		FillDirection = Enum.FillDirection.Horizontal,
		Padding = UDim.new(0, 4),
		VerticalAlignment = Enum.VerticalAlignment.Center,
	})
	Ui_Widgets.Padding(bar, 6)
	self.parts.tabBar = bar

	for order, tab in ipairs(self:_tabs()) do
		local button = Ui_Widgets.Button(bar, {
			Name = "Tab_" .. tostring(tab.id),
			Size = UDim2.new(0, self.narrow and 96 or 112, 0, layout.tabBarHeight - 12),
			Text = tostring(tab.label),
			TextSize = Ui_Theme.TextSize.small,
			BackgroundColor3 = Ui_Theme.Color.rowBackground,
			TextColor3 = Ui_Theme.Color.textSecondary,
			TextTruncate = Enum.TextTruncate.AtEnd,
			LayoutOrder = order,
		}, "ui:TabButton")
		Ui_Widgets.Corner(button, UDim.new(0, 6))
		self.tabButtons[tab.id] = button
		Ui_Widgets.OnClick(button, function()
			self:_call("onTab", tab.id)
		end, "ui:clickTab")
	end
end

--============================== FILTER BAR ============================

function RadarUi:_buildFilterBar(panel, layout)
	local uiConfig = self.config.Ui or {}
	if layout.filterHeight <= 0 then
		self.parts.filterBar = nil
		return
	end
	local metrics = Ui_Theme.Metrics
	local bar = Ui_Widgets.Frame(panel, {
		Name = "FilterBar",
		Position = UDim2.new(0, 0, 0, metrics.headerHeight + layout.tabBarHeight),
		Size = UDim2.new(1, 0, 0, layout.filterHeight),
		BackgroundTransparency = 1,
	}, "ui:FilterBar")
	self.parts.filterBar = bar

	if uiConfig.showSearch ~= false then
		self.parts.searchBox = Ui_Widgets.TextBox(bar, {
			Name = "Search",
			Position = UDim2.new(0, metrics.padding, 0.5, -13),
			Size = self.narrow and UDim2.new(1, -metrics.padding * 2, 0, 26)
				or UDim2.new(0, 200, 0, 26),
			PlaceholderText = "Tìm thực thể…",
			Text = "",
		}, "ui:Search")
		Ui_Widgets.Corner(self.parts.searchBox, UDim.new(0, 6))
		Ui_Widgets.OnTextChanged(self.parts.searchBox, function()
			local text, ok = Shared_Safe.Read(self.parts.searchBox, "Text")
			if not ok then
				return
			end
			if text == self.lastQuery then
				return -- không đổi thì không báo, tránh dựng lại danh sách vô ích
			end
			self.lastQuery = text
			self:_call("onSearch", text)
		end, "ui:searchChanged")
	end

	if uiConfig.showAreaFilter ~= false then
		local strip = Ui_Widgets.Scrolling(bar, {
			Name = "Areas",
			Position = self.narrow and UDim2.new(0, metrics.padding, 0, 32)
				or UDim2.new(0, metrics.padding + 208, 0.5, -13),
			Size = self.narrow and UDim2.new(1, -metrics.padding * 2, 0, 26)
				or UDim2.new(1, -metrics.padding * 2 - 216, 0, 26),
			ScrollingDirection = Enum.ScrollingDirection.X,
		}, "ui:AreaStrip")
		Ui_Widgets.ListLayout(strip, {
			FillDirection = Enum.FillDirection.Horizontal,
			Padding = UDim.new(0, 4),
			VerticalAlignment = Enum.VerticalAlignment.Center,
		})
		self.parts.areaStrip = strip

		local areaIds = { "all" }
		for _, areaId in ipairs(Shared_Areas.GetOrderedIds()) do
			areaIds[#areaIds + 1] = areaId
		end
		for order, areaId in ipairs(areaIds) do
			local label = areaId == "all" and "Tất cả" or Shared_Areas.GetShortName(areaId)
			local button = Ui_Widgets.Button(strip, {
				Name = "Area_" .. areaId,
				Size = UDim2.new(0, 74, 0, 24),
				Text = label,
				TextSize = Ui_Theme.TextSize.small,
				LayoutOrder = order,
			}, "ui:AreaButton")
			Ui_Widgets.Corner(button, UDim.new(0, 6))
			self.areaButtons[areaId] = button
			Ui_Widgets.OnClick(button, function()
				self:_call("onArea", areaId)
			end, "ui:clickArea")
		end

		-- Bộ lọc theo trạng thái lựa chọn: Tất cả / Đã chọn / Chưa chọn.
		local filterStrip = Ui_Widgets.Frame(bar, {
			Name = "SelectionFilter",
			AnchorPoint = Vector2.new(1, 0.5),
			Position = UDim2.new(1, -metrics.padding, 0.5, 0),
			Size = UDim2.fromOffset(210, 26),
			BackgroundTransparency = 1,
		}, "ui:SelectionFilter")
		Ui_Widgets.ListLayout(filterStrip, {
			FillDirection = Enum.FillDirection.Horizontal,
			Padding = UDim.new(0, 4),
			VerticalAlignment = Enum.VerticalAlignment.Center,
		})
		self.parts.selectionFilter = filterStrip

		local filters = {
			{ id = "all", label = "Tất cả" },
			{ id = "selected", label = "Đã chọn" },
			{ id = "unselected", label = "Chưa chọn" },
		}
		for order, filter in ipairs(filters) do
			local button = Ui_Widgets.Button(filterStrip, {
				Name = "Filter_" .. filter.id,
				Size = UDim2.new(0, 66, 0, 24),
				Text = filter.label,
				TextSize = Ui_Theme.TextSize.tiny,
				LayoutOrder = order,
			}, "ui:FilterButton")
			Ui_Widgets.Corner(button, UDim.new(0, 6))
			self.filterButtons[filter.id] = button
			Ui_Widgets.OnClick(button, function()
				self:_call("onSelectionFilter", filter.id)
			end, "ui:clickSelectionFilter")
		end
	end
end

--============================ SELECTION BAR ===========================

function RadarUi:_buildSelectionBar(panel, layout)
	if layout.selectionHeight <= 0 then
		self.parts.selectionBar = nil
		return
	end
	local metrics = Ui_Theme.Metrics
	local bar = Ui_Widgets.Frame(panel, {
		Name = "SelectionBar",
		Position = UDim2.new(0, 0, 0, metrics.headerHeight + layout.tabBarHeight + layout.filterHeight),
		Size = UDim2.new(1, 0, 0, layout.selectionHeight),
		BackgroundTransparency = 1,
	}, "ui:SelectionBar")
	self.parts.selectionBar = bar

	local strip = Ui_Widgets.Scrolling(bar, {
		Name = "SelectionButtons",
		Position = UDim2.new(0, metrics.padding, 0, 0),
		Size = UDim2.new(1, -metrics.padding * 2 - 130, 1, 0),
		ScrollingDirection = Enum.ScrollingDirection.X,
	}, "ui:SelectionStrip")
	Ui_Widgets.ListLayout(strip, {
		FillDirection = Enum.FillDirection.Horizontal,
		Padding = UDim.new(0, 4),
		VerticalAlignment = Enum.VerticalAlignment.Center,
	})
	self.parts.selectionStrip = strip

	-- `part` là khoá trong self.parts — đặt sẵn để không phải suy ra từ tên
	-- (trước đây suy ra "TrackSelection".."Button" thành "TrackSelectionButton"
	-- trong khi mọi nơi khác đọc "trackSelectionButton" -> nút không dùng được).
	local buttons = {
		{ name = "SelectView", part = "selectViewButton", label = "Chọn tất cả", handler = function()
			self:_call("onSelectScope", true)
		end },
		{ name = "DeselectView", part = "deselectViewButton", label = "Bỏ chọn tất cả", handler = function()
			self:_call("onSelectScope", false)
		end },
		{ name = "SelectAllAreas", part = "selectAllAreasButton", label = "Chọn tất cả khu vực", handler = function()
			self:_call("onSelectAllAreas")
		end },
		{ name = "ClearSelection", part = "clearSelectionButton", label = "Bỏ chọn toàn bộ", handler = function()
			self:_call("onClearSelection")
		end },
		{ name = "TrackSelection", part = "trackSelectionButton", label = "Theo dõi mục đã chọn", handler = function()
			-- Bật nếu còn mục chưa được theo dõi; tắt nếu tất cả đang theo dõi.
			-- Chỉ là công tắc cho nhóm — mục không có cơ chế phát hiện vẫn bị
			-- Radar từ chối và ghi rõ lý do (không hứa suông).
			-- TÊN TRƯỜNG là lastSelectionCount (không phải lastSelectedCount):
			-- đọc sai tên sẽ luôn ra nil và nút này chỉ bật được, không tắt được.
			local selectedCount = self.lastSelectionCount or 0
			local trackedCount = self.lastTrackedCount or 0
			local trackedAll = selectedCount > 0 and trackedCount >= selectedCount
			self:_call("onTrackSelection", not trackedAll)
		end },
	}
	for order, spec in ipairs(buttons) do
		local button = Ui_Widgets.Button(strip, {
			Name = spec.name,
			Size = UDim2.new(0, self.narrow and 108 or 124, 0, 24),
			Text = spec.label,
			TextSize = Ui_Theme.TextSize.tiny,
			LayoutOrder = order,
		}, "ui:SelectionButton")
		Ui_Widgets.Corner(button, UDim.new(0, 6))
		self.parts[spec.part] = button
		Ui_Widgets.OnClick(button, spec.handler, "ui:click" .. spec.name)
	end

	self.parts.selectionCounter = Ui_Widgets.Label(bar, {
		Name = "SelectionCounter",
		AnchorPoint = Vector2.new(1, 0.5),
		Position = UDim2.new(1, -metrics.padding, 0.5, 0),
		Size = UDim2.fromOffset(124, 20),
		Text = "Đã chọn 0/0",
		TextSize = Ui_Theme.TextSize.small,
		TextColor3 = Ui_Theme.Color.accent,
		Font = Ui_Theme.Font.mono,
		TextXAlignment = Enum.TextXAlignment.Right,
	}, "ui:SelectionCounter")
end

--================================ BODY ================================

function RadarUi:_buildBody(panel, layout)
	local metrics = Ui_Theme.Metrics
	local uiConfig = self.config.Ui or {}
	local body = Ui_Widgets.Frame(panel, {
		Name = "Body",
		Position = UDim2.new(0, 0, 0, layout.bodyTop),
		Size = UDim2.new(1, 0, 0, layout.bodyHeight),
		BackgroundTransparency = 1,
	}, "ui:Body")
	self.parts.body = body

	self:_buildListPage(body, layout, metrics, uiConfig)
	self:_buildHomePage(body, layout)
	self:_buildSettingsPage(body, layout)
	self:_buildLogPage(body, layout)
end

function RadarUi:_buildListPage(body, layout, metrics, uiConfig)
	local page = Ui_Widgets.Frame(body, {
		Name = "ListPage",
		Position = UDim2.new(0, 0, 0, 0),
		Size = UDim2.new(1, 0, 1, 0),
		BackgroundTransparency = 1,
	}, "ui:ListPage")
	self.pages.list = page
	self.parts.listPage = page

	local listWidth = (self.narrow or uiConfig.showDetailPanel == false)
		and UDim2.new(1, -metrics.padding * 2, 1, 0)
		or UDim2.new(0.58, -metrics.padding, 1, 0)

	local listScroll = Ui_Widgets.Scrolling(page, {
		Name = "List",
		Position = UDim2.new(0, metrics.padding, 0, 0),
		Size = listWidth,
		ScrollingDirection = Enum.ScrollingDirection.Y,
	}, "ui:List")
	Ui_Widgets.ListLayout(listScroll, { Padding = UDim.new(0, 3) })
	self.parts.list = listScroll

	-- Nhãn hiện khi danh sách rỗng (ví dụ tab "Đã chọn" lúc chưa chọn gì).
	self.parts.emptyLabel = Ui_Widgets.Label(page, {
		Name = "Empty",
		Position = UDim2.new(0, metrics.padding, 0, 8),
		Size = UDim2.new(1, -metrics.padding * 2, 0, 40),
		Text = "",
		TextSize = Ui_Theme.TextSize.small,
		TextColor3 = Ui_Theme.Color.textMuted,
		TextWrapped = true,
		TextYAlignment = Enum.TextYAlignment.Top,
		Visible = false,
	}, "ui:EmptyLabel")

	if uiConfig.showDetailPanel ~= false and not self.narrow then
		local detail = Ui_Widgets.Frame(page, {
			Name = "Detail",
			Position = UDim2.new(0.58, 4, 0, 0),
			Size = UDim2.new(0.42, -metrics.padding - 4, 1, 0),
			BackgroundColor3 = Ui_Theme.Color.detailBackground,
		}, "ui:Detail")
		Ui_Widgets.Corner(detail)
		self.parts.detail = detail

		self.parts.detailTitle = Ui_Widgets.Label(detail, {
			Name = "DetailTitle",
			Position = UDim2.new(0, 10, 0, 8),
			Size = UDim2.new(1, -20, 0, 20),
			Text = "Chưa chọn mục nào",
			Font = Ui_Theme.Font.heading,
			TextSize = Ui_Theme.TextSize.heading,
		}, "ui:DetailTitle")

		self.parts.detailBody = Ui_Widgets.Label(detail, {
			Name = "DetailBody",
			Position = UDim2.new(0, 10, 0, 32),
			Size = UDim2.new(1, -20, 1, -74),
			Text = "",
			TextSize = Ui_Theme.TextSize.small,
			TextColor3 = Ui_Theme.Color.textSecondary,
			TextYAlignment = Enum.TextYAlignment.Top,
			TextWrapped = true,
		}, "ui:DetailBody")

		-- Hai nút hành động của mục đang xem chi tiết.
		self.parts.detailSelectButton = Ui_Widgets.Button(detail, {
			Name = "DetailSelect",
			Position = UDim2.new(0, 10, 1, -32),
			Size = UDim2.new(0.5, -14, 0, 24),
			Text = "Chọn",
			TextSize = Ui_Theme.TextSize.small,
		}, "ui:DetailSelect")
		Ui_Widgets.Corner(self.parts.detailSelectButton, UDim.new(0, 6))
		Ui_Widgets.OnClick(self.parts.detailSelectButton, function()
			if self.selectedId ~= nil then
				self:_call("onToggleSelect", self.selectedId)
			end
		end, "ui:clickDetailSelect")

		self.parts.detailTrackButton = Ui_Widgets.Button(detail, {
			Name = "DetailTrack",
			Position = UDim2.new(0.5, 4, 1, -32),
			Size = UDim2.new(0.5, -14, 0, 24),
			Text = "Theo dõi",
			TextSize = Ui_Theme.TextSize.small,
		}, "ui:DetailTrack")
		Ui_Widgets.Corner(self.parts.detailTrackButton, UDim.new(0, 6))
		Ui_Widgets.OnClick(self.parts.detailTrackButton, function()
			if self.selectedId ~= nil then
				self:_call("onToggleTrack", self.selectedId)
			end
		end, "ui:clickDetailTrack")
	end
end

function RadarUi:_buildHomePage(body, layout)
	local metrics = Ui_Theme.Metrics
	local page = Ui_Widgets.Frame(body, {
		Name = "HomePage",
		Position = UDim2.new(0, 0, 0, 0),
		Size = UDim2.new(1, 0, 1, 0),
		BackgroundTransparency = 1,
		Visible = false,
	}, "ui:HomePage")
	self.pages.home = page
	self.parts.homePage = page

	self.parts.homeState = Ui_Widgets.Label(page, {
		Name = "HomeState",
		Position = UDim2.new(0, metrics.padding, 0, 4),
		Size = UDim2.new(1, -metrics.padding * 2, 0, 22),
		Text = "chưa khởi động",
		Font = Ui_Theme.Font.heading,
		TextSize = Ui_Theme.TextSize.heading,
	}, "ui:HomeState")

	self.parts.homeCounts = Ui_Widgets.Label(page, {
		Name = "HomeCounts",
		Position = UDim2.new(0, metrics.padding, 0, 30),
		Size = UDim2.new(0.58, -metrics.padding, 1, -110),
		Text = "",
		TextSize = Ui_Theme.TextSize.small,
		TextColor3 = Ui_Theme.Color.textSecondary,
		TextYAlignment = Enum.TextYAlignment.Top,
		TextWrapped = true,
	}, "ui:HomeCounts")

	self.parts.homeWarnings = Ui_Widgets.Label(page, {
		Name = "HomeWarnings",
		Position = UDim2.new(0.58, 4, 0, 30),
		Size = UDim2.new(0.42, -metrics.padding - 4, 1, -110),
		Text = "",
		TextSize = Ui_Theme.TextSize.small,
		TextColor3 = Ui_Theme.Color.warning,
		TextYAlignment = Enum.TextYAlignment.Top,
		TextWrapped = true,
	}, "ui:HomeWarnings")

	-- Thao tác nhanh. Nút dùng lại callback y hệt các nút ở nơi khác — không
	-- có nút "trang trí" nào ở đây.
	local quick = Ui_Widgets.Frame(page, {
		Name = "QuickActions",
		Position = UDim2.new(0, metrics.padding, 1, -66),
		Size = UDim2.new(1, -metrics.padding * 2, 0, 62),
		BackgroundTransparency = 1,
	}, "ui:QuickActions")
	Ui_Widgets.ListLayout(quick, {
		FillDirection = Enum.FillDirection.Horizontal,
		Padding = UDim.new(0, 6),
		VerticalAlignment = Enum.VerticalAlignment.Center,
	})

	local quickButtons = {
		{ name = "HomePrimary", label = "Khởi động", handler = function()
			self:_call("onPrimary")
		end },
		{ name = "HomeRefresh", label = "Làm mới dữ liệu", handler = function()
			self:_call("onRefresh")
		end },
		{ name = "HomeList", label = "Xem danh sách", handler = function()
			self:_call("onTab", "all")
		end },
		{ name = "HomeSelected", label = "Xem mục đã chọn", handler = function()
			self:_call("onTab", "selected")
		end },
		{ name = "HomeSelectAll", label = "Chọn tất cả khu vực", handler = function()
			self:_call("onSelectAllAreas")
		end },
		{ name = "HomeLog", label = "Nhật ký", handler = function()
			self:_call("onTab", "log")
		end },
	}
	for order, spec in ipairs(quickButtons) do
		local button = Ui_Widgets.Button(quick, {
			Name = spec.name,
			Size = UDim2.new(0, 132, 0, 26),
			Text = spec.label,
			TextSize = Ui_Theme.TextSize.small,
			LayoutOrder = order,
		}, "ui:QuickButton")
		Ui_Widgets.Corner(button, UDim.new(0, 6))
		self.parts[spec.name .. "Button"] = button
		Ui_Widgets.OnClick(button, spec.handler, "ui:click" .. spec.name)
	end
end

function RadarUi:_buildSettingsPage(body, layout)
	local metrics = Ui_Theme.Metrics
	local page = Ui_Widgets.Scrolling(body, {
		Name = "SettingsPage",
		Position = UDim2.new(0, 0, 0, 0),
		Size = UDim2.new(1, 0, 1, 0),
		BackgroundTransparency = 1,
		ScrollingDirection = Enum.ScrollingDirection.Y,
		Visible = false,
	}, "ui:SettingsPage")
	Ui_Widgets.ListLayout(page, { Padding = UDim.new(0, 4) })
	Ui_Widgets.Padding(page, metrics.padding)
	self.pages.settings = page
	self.parts.settingsPage = page

	--[[
		Mỗi công tắc là MỘT nút: bấm để đổi giá trị. Giá trị mới được gửi lên
		Radar qua callback onSetting — UI KHÔNG tự sửa cấu hình, vì cấu hình là
		dữ liệu dùng chung với Scanner/Tracker.
	]]
	local toggles = {
		{ key = "Ui.showTabs", label = "Hiện thanh tab", path = { "Ui", "showTabs" } },
		{ key = "Ui.showSearch", label = "Hiện ô tìm kiếm", path = { "Ui", "showSearch" } },
		{ key = "Ui.showAreaFilter", label = "Hiện bộ lọc khu vực", path = { "Ui", "showAreaFilter" } },
		{ key = "Ui.showDetailPanel", label = "Hiện bảng chi tiết", path = { "Ui", "showDetailPanel" } },
		{ key = "Ui.showStatusBar", label = "Hiện thanh trạng thái", path = { "Ui", "showStatusBar" } },
		{ key = "Ui.showCounters", label = "Hiện bộ đếm trạng thái", path = { "Ui", "showCounters" } },
		{ key = "Ui.showSelectionBar", label = "Hiện thanh chọn thực thể", path = { "Ui", "showSelectionBar" } },
		{ key = "Ui.enableDrag", label = "Cho phép kéo thả bảng", path = { "Ui", "enableDrag" } },
		{ key = "System.alertOnTrack", label = "Ghi nhật ký khi mục theo dõi xuất hiện", path = { "System", "alertOnTrack" } },
	}

	for order, toggle in ipairs(toggles) do
		local row = Ui_Widgets.Frame(page, {
			Name = "Setting_" .. toggle.key:gsub("%.", "_"),
			Size = UDim2.new(1, -metrics.padding * 2, 0, 28),
			BackgroundColor3 = Ui_Theme.Color.rowBackground,
			LayoutOrder = order,
		}, "ui:SettingRow")
		Ui_Widgets.Corner(row, UDim.new(0, 6))

		Ui_Widgets.Label(row, {
			Name = "Label",
			Position = UDim2.new(0, 10, 0, 0),
			Size = UDim2.new(1, -110, 1, 0),
			Text = toggle.label,
			TextSize = Ui_Theme.TextSize.small,
			TextTruncate = Enum.TextTruncate.AtEnd,
		}, "ui:SettingLabel")

		local button = Ui_Widgets.Button(row, {
			Name = "Toggle",
			AnchorPoint = Vector2.new(1, 0.5),
			Position = UDim2.new(1, -8, 0.5, 0),
			Size = UDim2.fromOffset(86, 22),
			Text = "bật",
			TextSize = Ui_Theme.TextSize.small,
		}, "ui:SettingToggle")
		Ui_Widgets.Corner(button, UDim.new(0, 6))
		self.settingButtons[toggle.key] = { button = button, path = toggle.path }
		Ui_Widgets.OnClick(button, function()
			local currentValue = self:_readConfig(toggle.path)
			self:_call("onSetting", toggle.key, currentValue ~= true)
		end, "ui:clickSetting")
	end

	-- Nút xoá nhật ký (hành động thật, không phải nút trang trí).
	local clearRow = Ui_Widgets.Frame(page, {
		Name = "Setting_LogActions",
		Size = UDim2.new(1, -metrics.padding * 2, 0, 28),
		BackgroundTransparency = 1,
		LayoutOrder = #toggles + 1,
	}, "ui:SettingLogRow")
	local clearButton = Ui_Widgets.Button(clearRow, {
		Name = "ClearLog",
		Size = UDim2.new(0, 160, 0, 24),
		Text = "Xoá nhật ký trên giao diện",
		TextSize = Ui_Theme.TextSize.small,
	}, "ui:ClearLogButton")
	Ui_Widgets.Corner(clearButton, UDim.new(0, 6))
	self.parts.clearLogButton = clearButton
	Ui_Widgets.OnClick(clearButton, function()
		self:_call("onClearLog")
	end, "ui:clickClearLog")
end

function RadarUi:_buildLogPage(body, layout)
	local metrics = Ui_Theme.Metrics
	local page = Ui_Widgets.Frame(body, {
		Name = "LogPage",
		Position = UDim2.new(0, 0, 0, 0),
		Size = UDim2.new(1, 0, 1, 0),
		BackgroundTransparency = 1,
		Visible = false,
	}, "ui:LogPage")
	self.pages.log = page
	self.parts.logPage = page

	self.parts.logText = Ui_Widgets.Scrolling(page, {
		Name = "LogText",
		Position = UDim2.new(0, metrics.padding, 0, 0),
		Size = UDim2.new(1, -metrics.padding * 2, 1, -34),
		BackgroundColor3 = Ui_Theme.Color.inputBackground,
		ScrollingDirection = Enum.ScrollingDirection.Y,
	}, "ui:LogScroll")
	Ui_Widgets.Corner(self.parts.logText)

	self.parts.logBody = Ui_Widgets.Label(self.parts.logText, {
		Name = "LogBody",
		Position = UDim2.new(0, 8, 0, 6),
		Size = UDim2.new(1, -16, 1, -12),
		Text = "(chưa có dòng nào)",
		TextSize = Ui_Theme.TextSize.tiny,
		Font = Ui_Theme.Font.mono,
		TextColor3 = Ui_Theme.Color.textSecondary,
		TextYAlignment = Enum.TextYAlignment.Top,
		TextWrapped = true,
	}, "ui:LogBody")

	local actions = Ui_Widgets.Frame(page, {
		Name = "LogActions",
		Position = UDim2.new(0, metrics.padding, 1, -28),
		Size = UDim2.new(1, -metrics.padding * 2, 0, 26),
		BackgroundTransparency = 1,
	}, "ui:LogActions")
	Ui_Widgets.ListLayout(actions, {
		FillDirection = Enum.FillDirection.Horizontal,
		Padding = UDim.new(0, 6),
		VerticalAlignment = Enum.VerticalAlignment.Center,
	})

	self.parts.logRefreshButton = Ui_Widgets.Button(actions, {
		Name = "LogRefresh",
		Size = UDim2.fromOffset(120, 24),
		Text = "Làm mới nhật ký",
		TextSize = Ui_Theme.TextSize.small,
	}, "ui:LogRefresh")
	Ui_Widgets.Corner(self.parts.logRefreshButton, UDim.new(0, 6))
	Ui_Widgets.OnClick(self.parts.logRefreshButton, function()
		self:_syncLog(true)
	end, "ui:clickLogRefresh")

	self.parts.logClearButton = Ui_Widgets.Button(actions, {
		Name = "LogClear",
		Size = UDim2.fromOffset(120, 24),
		Text = "Xoá nhật ký",
		TextSize = Ui_Theme.TextSize.small,
	}, "ui:LogClear")
	Ui_Widgets.Corner(self.parts.logClearButton, UDim.new(0, 6))
	Ui_Widgets.OnClick(self.parts.logClearButton, function()
		self:_call("onClearLog")
	end, "ui:clickLogClear")
end

-- Đọc một giá trị cấu hình theo đường dẫn { "Ui", "showTabs" }.
function RadarUi:_readConfig(pathList)
	local node = self.config
	for _, key in ipairs(pathList) do
		if type(node) ~= "table" then
			return nil
		end
		node = node[key]
	end
	return node
end

--============================= KÉO THẢ BẢNG ============================

--[[
	Kéo bảng bằng thanh tiêu đề. Dùng InputBegan trên Header + InputChanged
	của UserInputService, cùng một công thức cho chuột và cảm ứng.

	RÀNG BUỘC:
	  * Toàn bộ lời đọc API đều qua pcall: thiếu service/thiếu property thì
	    tính năng kéo tắt chứ không ném lỗi.
	  * Connection được đăng ký vào Registry nên Destroy() dọn được.
	  * KHÔNG giữ vòng lặp nào: chỉ có handler chạy khi có input.
]]
function RadarUi:_enableDrag()
	local uiConfig = self.config.Ui or {}
	if uiConfig.enableDrag == false then
		return false
	end
	if self.parts.header == nil or self.parts.panel == nil then
		return false
	end

	local uis = Client_Env.GetService("UserInputService")
	if uis == nil then
		return false
	end

	local mouseType = Enum.UserInputType and Enum.UserInputType.MouseButton1 or nil
	local touchType = Enum.UserInputType and Enum.UserInputType.Touch or nil

	local began = Shared_Safe.Read(self.parts.header, "InputBegan")
	Client_Registry.Connect(began, function(input, gameProcessed)
		if gameProcessed == true then
			return
		end
		local inputType = Shared_Safe.Read(input, "UserInputType")
		if inputType ~= mouseType and inputType ~= touchType then
			return
		end
		local position, ok = Shared_Safe.Read(input, "Position")
		if not ok or position == nil then
			return
		end
		local startX, startY = position.X, position.Y
		if not (Shared_Geometry.IsFiniteNumber(startX) and Shared_Geometry.IsFiniteNumber(startY)) then
			return
		end
		local current, okPosition = Shared_Safe.Read(self.parts.panel, "Position")
		if not okPosition or current == nil then
			return
		end
		self.drag = {
			startX = startX,
			startY = startY,
			originX = current.X.Offset,
			originY = current.Y.Offset,
			scaleX = current.X.Scale,
			scaleY = current.Y.Scale,
		}
	end, "ui:dragBegan")

	local changed = Shared_Safe.Read(uis, "InputChanged")
	Client_Registry.Connect(changed, function(input, gameProcessed)
		if self.drag == nil or gameProcessed == true then
			return
		end
		local inputType = Shared_Safe.Read(input, "UserInputType")
		if inputType ~= mouseType and inputType ~= touchType then
			return
		end
		local position, ok = Shared_Safe.Read(input, "Position")
		if not ok or position == nil then
			return
		end
		local deltaX = position.X - self.drag.startX
		local deltaY = position.Y - self.drag.startY
		if not (Shared_Geometry.IsFiniteNumber(deltaX) and Shared_Geometry.IsFiniteNumber(deltaY)) then
			return
		end
		local nextX = self.drag.originX + deltaX
		local nextY = self.drag.originY + deltaY

		-- KẸP TRONG MÀN HÌNH: bảng neo giữa (AnchorPoint 0.5, 0.5) nên offset
		-- tối đa là (kích thước màn hình - kích thước bảng) / 2. Không đọc được
		-- ViewportSize thì bỏ qua bước kẹp (không đoán kích thước màn hình).
		local viewport = self.viewport
		if viewport ~= nil and self.layout ~= nil then
			local scale = self.layout.scale or 1
			local halfWidth = (self.layout.panelWidth * scale) / 2
			local halfHeight = ((self.minimized and Ui_Theme.Metrics.headerHeight
				or self.layout.panelHeight) * scale) / 2
			local limitX = math.max(0, (viewport.x / 2) - halfWidth)
			local limitY = math.max(0, (viewport.y / 2) - halfHeight)
			-- Không dùng math.clamp: đó là hàm Luau-only, Lua 5.3 của harness
			-- không có (lint cũng chặn). Viết tường minh bằng math.min/math.max.
			nextX = math.max(-limitX, math.min(limitX, nextX))
			nextY = math.max(-limitY, math.min(limitY, nextY))
		end

		self.stats.drags = self.stats.drags + 1
		Ui_Widgets.Set(self.parts.panel, "Position", UDim2.new(
			self.drag.scaleX, nextX, self.drag.scaleY, nextY
		))
	end, "ui:dragChanged")

	local ended = Shared_Safe.Read(uis, "InputEnded")
	Client_Registry.Connect(ended, function(input)
		if self.drag == nil then
			return
		end
		local inputType = Shared_Safe.Read(input, "UserInputType")
		if inputType == mouseType or inputType == touchType then
			self.drag = nil
		end
	end, "ui:dragEnded")

	return true
end

--=========================== THU NHỎ / MỞ LẠI =========================

function RadarUi:SetMinimized(minimized)
	if self.parts.panel == nil then
		return false
	end
	local wantMinimized = minimized == true
	if self.minimized == wantMinimized then
		return false
	end
	self.minimized = wantMinimized

	local metrics = Ui_Theme.Metrics
	local layout = self.layout
	local height = wantMinimized and metrics.headerHeight or layout.panelHeight
	Ui_Widgets.Set(self.parts.panel, "Size", UDim2.fromOffset(layout.panelWidth, height))
	Ui_Widgets.SetText(self.parts.minimizeButton, wantMinimized and "+" or "—")

	-- Ẩn/hiện từng khối: dùng SetVisible (có so sánh) nên không ghi thừa.
	Ui_Widgets.SetVisible(self.parts.tabBar, not wantMinimized)
	Ui_Widgets.SetVisible(self.parts.filterBar, not wantMinimized)
	Ui_Widgets.SetVisible(self.parts.selectionBar, not wantMinimized)
	Ui_Widgets.SetVisible(self.parts.body, not wantMinimized)
	Ui_Widgets.SetVisible(self.parts.statusBar, not wantMinimized)

	self:_call("onMinimize", wantMinimized)
	return true
end

function RadarUi:ToggleMinimized()
	return self:SetMinimized(not self.minimized)
end

function RadarUi:IsMinimized()
	return self.minimized
end

--=============================== CHUYỂN TAB ============================

--[[
	CHUYỂN TAB. Chỉ đổi Visible + tô sáng nút, KHÔNG dựng lại widget nào.
	Trả về (ok, message). `silent` = true khi gọi từ Build (không báo callback).
]]
function RadarUi:SetTab(tabId, silent)
	local tab = Shared_Config.GetTab(tabId)
	if tab == nil then
		return false, ("Không có tab '%s'"):format(tostring(tabId))
	end
	if not self.built then
		return false, "Giao diện chưa dựng."
	end

	local changed = self.activeTab ~= tab.id
	self.activeTab = tab.id
	self.activeKind = tab.kind

	-- 1) Tô sáng nút tab đang mở.
	for id, button in pairs(self.tabButtons) do
		local active = id == tab.id
		Ui_Widgets.SetColor(button, "BackgroundColor3",
			active and Ui_Theme.Color.accentDark or Ui_Theme.Color.rowBackground)
		Ui_Widgets.SetColor(button, "TextColor3",
			active and Ui_Theme.Color.textPrimary or Ui_Theme.Color.textSecondary)
	end

	-- 2) Hiện đúng MỘT trang. Trang nào cũng đã tồn tại từ lúc Build.
	local showList = tab.kind == "area" or tab.kind == "selected"
	Ui_Widgets.SetVisible(self.pages.list, showList)
	Ui_Widgets.SetVisible(self.pages.home, tab.kind == "home")
	Ui_Widgets.SetVisible(self.pages.settings, tab.kind == "settings")
	Ui_Widgets.SetVisible(self.pages.log, tab.kind == "log")

	if changed then
		self.stats.tabSwitches = self.stats.tabSwitches + 1
	end
	if silent ~= true and changed then
		self:_call("onTabApplied", tab.id)
	end
	return true, tab.label
end

function RadarUi:ActiveTab()
	return self.activeTab
end

function RadarUi:ActiveKind()
	return self.activeKind
end

--============================= DÒNG DANH SÁCH ==========================

-- Tạo (hoặc lấy lại) một dòng ở vị trí `slot`. Dòng được TÁI SỬ DỤNG.
function RadarUi:_row(slot)
	local existing = self.rows[slot]
	if existing ~= nil then
		return existing
	end
	local metrics = Ui_Theme.Metrics
	local frame = Ui_Widgets.Button(self.parts.list, {
		Name = "Row" .. slot,
		Size = UDim2.new(1, -4, 0, metrics.rowHeight),
		BackgroundColor3 = Ui_Theme.Color.rowBackground,
		Text = "",
		LayoutOrder = slot,
	}, "ui:Row")
	Ui_Widgets.Corner(frame, UDim.new(0, 6))

	-- Ô CHỌN. Là nút con nên bấm vào ô không kích hoạt lựa chọn "xem chi tiết"
	-- của cả dòng (Roblox không lan sự kiện click từ TextButton con lên cha).
	local check = Ui_Widgets.Button(frame, {
		Name = "Check",
		Position = UDim2.new(0, 6, 0.5, -11),
		Size = UDim2.fromOffset(22, 22),
		Text = "",
		TextSize = Ui_Theme.TextSize.small,
		BackgroundColor3 = Ui_Theme.Color.inputBackground,
	}, "ui:RowCheck")
	Ui_Widgets.Corner(check, UDim.new(0, 4))
	Ui_Widgets.Stroke(check, Ui_Theme.Color.panelEdge, 1)

	local dot = Ui_Widgets.Frame(frame, {
		Name = "Dot",
		Position = UDim2.new(0, 34, 0.5, -4),
		Size = UDim2.fromOffset(8, 8),
		BackgroundColor3 = Ui_Theme.Color.textMuted,
	}, "ui:RowDot")
	Ui_Widgets.Corner(dot, UDim.new(1, 0))

	local nameLabel = Ui_Widgets.Label(frame, {
		Name = "Name",
		Position = UDim2.new(0, 48, 0, 0),
		Size = UDim2.new(0.42, -48, 1, 0),
		TextTruncate = Enum.TextTruncate.AtEnd,
	}, "ui:RowName")

	local kindLabel = Ui_Widgets.Label(frame, {
		Name = "Kind",
		Position = UDim2.new(0.42, 0, 0, 0),
		Size = UDim2.new(0.16, 0, 1, 0),
		TextSize = Ui_Theme.TextSize.tiny,
		TextColor3 = Ui_Theme.Color.textMuted,
		TextTruncate = Enum.TextTruncate.AtEnd,
	}, "ui:RowKind")

	local statusLabel = Ui_Widgets.Label(frame, {
		Name = "Status",
		Position = UDim2.new(0.58, 0, 0, 0),
		Size = UDim2.new(0.42, -64, 1, 0),
		TextSize = Ui_Theme.TextSize.tiny,
		TextXAlignment = Enum.TextXAlignment.Right,
		TextTruncate = Enum.TextTruncate.AtEnd,
	}, "ui:RowStatus")

	local distanceLabel = Ui_Widgets.Label(frame, {
		Name = "Distance",
		Position = UDim2.new(1, -56, 0, 0),
		Size = UDim2.new(0, 50, 1, 0),
		TextSize = Ui_Theme.TextSize.tiny,
		Font = Ui_Theme.Font.mono,
		TextColor3 = Ui_Theme.Color.accent,
		TextXAlignment = Enum.TextXAlignment.Right,
	}, "ui:RowDistance")

	-- Dấu chấm nhỏ báo "đang theo dõi" (chỉ hiện khi người dùng bật theo dõi).
	local trackDot = Ui_Widgets.Frame(frame, {
		Name = "TrackDot",
		Position = UDim2.new(1, -64, 0.5, -3),
		Size = UDim2.fromOffset(6, 6),
		BackgroundColor3 = Ui_Theme.Color.ok,
		Visible = false,
	}, "ui:RowTrack")
	Ui_Widgets.Corner(trackDot, UDim.new(1, 0))

	local row = {
		frame = frame,
		check = check,
		dot = dot,
		nameLabel = nameLabel,
		kindLabel = kindLabel,
		statusLabel = statusLabel,
		distanceLabel = distanceLabel,
		trackDot = trackDot,
		entityId = nil,
	}

	Ui_Widgets.OnClick(check, function()
		if row.entityId ~= nil then
			self.stats.selectionClicks = self.stats.selectionClicks + 1
			self:_call("onToggleSelect", row.entityId)
		end
	end, "ui:clickRowCheck")

	Ui_Widgets.OnClick(frame, function()
		if row.entityId ~= nil then
			self:_call("onSelect", row.entityId)
		end
	end, "ui:clickRow")

	self.rows[slot] = row
	return row
end

--=============================== ĐỔ DỮ LIỆU ============================

function RadarUi:_syncHeader(view)
	if self.parts.stateLabel == nil then
		return
	end
	Ui_Widgets.SetText(self.parts.stateLabel, view.stateText or "chưa khởi động")
	Ui_Widgets.SetColor(self.parts.stateLabel, "TextColor3",
		view.stateColor or Ui_Theme.Color.textSecondary)
	Ui_Widgets.SetText(self.parts.primaryButton, view.primaryLabel or "Khởi động")
	Ui_Widgets.SetText(self.parts.homePrimaryButton, view.primaryLabel or "Khởi động")
end

function RadarUi:_syncFilters(view)
	-- Tô sáng nút khu vực đang chọn.
	local activeArea = view.areaId or "all"
	if self.lastAreaId ~= activeArea then
		for areaId, button in pairs(self.areaButtons) do
			local selected = areaId == activeArea
			Ui_Widgets.SetColor(button, "BackgroundColor3",
				selected and Ui_Theme.Color.accentDark or Ui_Theme.Color.rowBackground)
			Ui_Widgets.SetColor(button, "TextColor3",
				selected and Ui_Theme.Color.textPrimary or Ui_Theme.Color.textSecondary)
		end
		self.lastAreaId = activeArea
	end

	-- Tô sáng bộ lọc lựa chọn.
	local activeFilter = view.selectionFilter or "all"
	if self.lastFilter ~= activeFilter then
		for filterId, button in pairs(self.filterButtons) do
			local selected = filterId == activeFilter
			Ui_Widgets.SetColor(button, "BackgroundColor3",
				selected and Ui_Theme.Color.accentDark or Ui_Theme.Color.rowBackground)
			Ui_Widgets.SetColor(button, "TextColor3",
				selected and Ui_Theme.Color.textPrimary or Ui_Theme.Color.textSecondary)
		end
		self.lastFilter = activeFilter
	end

	-- Tô sáng tab đang mở (khi Radar đổi tab từ bên ngoài, ví dụ SetArea).
	if self.lastTabId ~= self.activeTab then
		for tabId, button in pairs(self.tabButtons) do
			local active = tabId == self.activeTab
			Ui_Widgets.SetColor(button, "BackgroundColor3",
				active and Ui_Theme.Color.accentDark or Ui_Theme.Color.rowBackground)
			Ui_Widgets.SetColor(button, "TextColor3",
				active and Ui_Theme.Color.textPrimary or Ui_Theme.Color.textSecondary)
		end
		self.lastTabId = self.activeTab
	end
end

--[[
	Lọc danh sách dòng theo:
	  * tab "selected"  -> chỉ giữ mục đã chọn;
	  * bộ lọc lựa chọn -> "selected" / "unselected" / "all".
	Ghi vào self.filteredRows (bảng tái sử dụng) để không tạo rác mỗi nhịp.
]]
function RadarUi:_filterRows(rows, selectionIds, filter)
	local out = self.filteredRows
	for index = #out, 1, -1 do
		out[index] = nil
	end
	local onlySelected = filter == "selected" or self.activeKind == "selected"
	local onlyUnselected = filter == "unselected"
	for _, data in ipairs(rows) do
		local entry = data.entry
		local isSelected = entry ~= nil and selectionIds ~= nil and selectionIds[entry.id] == true
		local keep = true
		if onlySelected and not isSelected then
			keep = false
		end
		if onlyUnselected and isSelected then
			keep = false
		end
		if keep then
			out[#out + 1] = data
		end
	end
	return out
end

function RadarUi:_syncList(view)
	if self.parts.list == nil then
		return
	end
	-- Trang danh sách không mở thì không tốn công vẽ (tab Nhật ký/Cài đặt...).
	if self.activeKind ~= "area" and self.activeKind ~= "selected" then
		self.renderedRows = 0
		self.lastRowCount = 0
		return
	end

	local selectionIds = view.selectionIds
	local rows = self:_filterRows(view.rows or {}, selectionIds, view.selectionFilter)
	-- Tên trường cấu hình là maxVisibleRows (không phải maxRows): đọc sai
	-- tên trường sẽ khiến config của người dùng bị bỏ qua âm thầm.
	local maxRows = (self.config.Ui and self.config.Ui.maxVisibleRows) or Ui_Theme.Metrics.maxRows
	local visibleCount = math.min(#rows, maxRows)
	local trackedIds = view.trackedIds

	for slot = 1, visibleCount do
		local data = rows[slot]
		local row = self:_row(slot)
		local entry = data.entry
		local record = data.record
		local code = record and record.code or Shared_Status.Code.Disabled

		Ui_Widgets.SetVisible(row.frame, true)
		row.entityId = entry.id
		Ui_Widgets.SetText(row.nameLabel, entry.name)
		Ui_Widgets.SetColor(row.nameLabel, "TextColor3",
			entry.id == self.selectedId and Ui_Theme.Color.textPrimary or Ui_Theme.Color.textPrimary)
		Ui_Widgets.SetText(row.kindLabel, Shared_Catalog.KindLabel[entry.kind] or entry.kind)
		Ui_Widgets.SetColor(row.kindLabel, "TextColor3", Ui_Theme.KindColor(entry.kind))

		local statusText = Shared_Status.GetLabel(code)
		if record ~= nil and record.stale then
			statusText = statusText .. " (dữ liệu cũ)"
		end
		Ui_Widgets.SetText(row.statusLabel, statusText)
		Ui_Widgets.SetColor(row.statusLabel, "TextColor3", Ui_Theme.StatusColor(code))
		Ui_Widgets.SetColor(row.dot, "BackgroundColor3", Ui_Theme.StatusColor(code))

		-- CHỐT TRUNG THỰC: chỉ DETECTED mới được hiện khoảng cách.
		local distanceText = "—"
		if Shared_Status.MayShowPosition(code) and record.observation ~= nil then
			local formatted = Shared_Geometry.FormatDistance(record.observation.distance)
			if formatted ~= nil then
				distanceText = formatted
			else
				distanceText = "không rõ"
			end
		end
		Ui_Widgets.SetText(row.distanceLabel, distanceText)

		-- Ô chọn: "X" + viền xanh khi đã chọn; rỗng + viền xám khi chưa.
		local isSelected = selectionIds ~= nil and selectionIds[entry.id] == true
		Ui_Widgets.SetText(row.check, isSelected and "X" or "")
		Ui_Widgets.SetColor(row.check, "BackgroundColor3",
			isSelected and Ui_Theme.Color.accentDark or Ui_Theme.Color.inputBackground)

		-- Dấu "đang theo dõi".
		local isTracked = trackedIds ~= nil and trackedIds[entry.id] == true
		Ui_Widgets.SetVisible(row.trackDot, isTracked)

		Ui_Widgets.SetColor(row.frame, "BackgroundColor3",
			entry.id == self.selectedId and Ui_Theme.Color.rowSelected
				or (slot % 2 == 0 and Ui_Theme.Color.rowBackgroundAlt or Ui_Theme.Color.rowBackground))

		self.stats.rowsUpdated = self.stats.rowsUpdated + 1
	end

	-- Ẩn các dòng thừa (không huỷ: tái sử dụng ở lần sau).
	for slot = visibleCount + 1, #self.rows do
		local row = self.rows[slot]
		row.entityId = nil
		Ui_Widgets.SetVisible(row.frame, false)
	end

	self.renderedRows = visibleCount
	self.lastRowCount = #rows

	-- Nhãn "rỗng" cho trường hợp không có dòng nào (tab Đã chọn lúc chưa chọn).
	if self.parts.emptyLabel ~= nil then
		local emptyText = ""
		if visibleCount == 0 then
			if self.activeKind == "selected" then
				emptyText = "Chưa chọn thực thể nào. Mở tab khu vực và bấm vào ô vuông bên trái tên để chọn."
			else
				emptyText = "Không có mục nào khớp bộ lọc hiện tại."
			end
		end
		Ui_Widgets.SetText(self.parts.emptyLabel, emptyText)
		Ui_Widgets.SetVisible(self.parts.emptyLabel, visibleCount == 0)
	end

	-- CanvasSize là bảng mới mỗi lần tạo, nên phải SO SÁNH chiều cao trước
	-- khi ghi; nếu không mỗi lần Sync sẽ tốn một lần ghi property thừa.
	local canvasHeight = visibleCount * (Ui_Theme.Metrics.rowHeight + 3)
	if self.lastCanvasHeight ~= canvasHeight then
		Ui_Widgets.Set(self.parts.list, "CanvasSize", UDim2.fromOffset(0, canvasHeight))
		self.lastCanvasHeight = canvasHeight
	end
end

-- Bộ đếm "Đã chọn 12/50": 12 = tổng số đã chọn, 50 = số mục trong phạm vi xem.
function RadarUi:_syncSelectionBar(view)
	if self.parts.selectionCounter == nil then
		return
	end
	local selectedCount = view.selectedCount or 0
	local trackedCount = view.trackedCount or 0
	local changed = self.lastSelectionCount ~= selectedCount
		or self.lastScopeCount ~= view.scopeCount
		or self.lastTrackedCount ~= trackedCount
	self.lastSelectionCount = selectedCount
	self.lastScopeCount = view.scopeCount
	self.lastTrackedCount = trackedCount
	if not changed then
		return
	end
	Ui_Widgets.SetText(self.parts.selectionCounter,
		("Đã chọn %d/%d"):format(selectedCount, view.scopeCount or selectedCount))

	-- Nút theo dõi nhóm: đổi nhãn theo trạng thái thật.
	if self.parts.trackSelectionButton ~= nil then
		local trackedAll = selectedCount > 0 and trackedCount >= selectedCount
		Ui_Widgets.SetText(self.parts.trackSelectionButton,
			trackedAll and "Ngừng theo dõi" or "Theo dõi mục đã chọn")
		Ui_Widgets.SetColor(self.parts.trackSelectionButton, "BackgroundColor3",
			trackedAll and Ui_Theme.Color.accentDark or Ui_Theme.Color.rowBackground)
	end
end

function RadarUi:_syncHome(view)
	if self.parts.homeState == nil then
		return
	end
	Ui_Widgets.SetText(self.parts.homeState, view.stateText or "chưa khởi động")
	Ui_Widgets.SetColor(self.parts.homeState, "TextColor3",
		view.stateColor or Ui_Theme.Color.textSecondary)

	local counts = view.counts or {}
	local lines = {}
	lines[#lines + 1] = ("Danh mục: %d thực thể, %d khu vực")
		:format(Shared_Catalog.Count(), Shared_Areas.Count())
	lines[#lines + 1] = ("Đã phát hiện: %d"):format(counts[Shared_Status.Code.Detected] or 0)
	lines[#lines + 1] = ("Không phát hiện: %d"):format(counts[Shared_Status.Code.NotFound] or 0)
	lines[#lines + 1] = ("Không hỗ trợ phát hiện: %d"):format(counts[Shared_Status.Code.Unsupported] or 0)
	lines[#lines + 1] = ("Chưa xác minh: %d"):format(counts[Shared_Status.Code.Unverified] or 0)
	lines[#lines + 1] = ("Đang theo dõi: %d"):format(view.trackedCount or 0)
	lines[#lines + 1] = ("Đã chọn: %d"):format(view.selectedCount or 0)
	lines[#lines + 1] = ("Cập nhật: %s"):format(tostring(view.lastUpdateText or "chưa có"))
	lines[#lines + 1] = ""
	lines[#lines + 1] = "Ghi nhớ: có tên trong danh mục KHÔNG có nghĩa là định vị được."
	Ui_Widgets.SetText(self.parts.homeCounts, table.concat(lines, "\n"))

	local warningText = view.warningText
	Ui_Widgets.SetText(self.parts.homeWarnings,
		(warningText == nil or warningText == "") and "Không có cảnh báo." or ("Cảnh báo:\n" .. warningText))
end

function RadarUi:_syncLog(force)
	if self.parts.logBody == nil then
		return
	end
	-- Chỉ đọc nhật ký khi tab đang mở: đọc mỗi nhịp trên tab khác là phí.
	if force ~= true and self.activeKind ~= "log" then
		return
	end
	local count = #Shared_Log.history
	if force ~= true and count == self.lastLogCount then
		return
	end
	self.lastLogCount = count
	local history = Shared_Log.History(40)
	local lines = {}
	if #history == 0 then
		lines[#lines + 1] = "(chưa có dòng nào)"
	else
		for _, entry in ipairs(history) do
			lines[#lines + 1] = entry.text
		end
	end
	Ui_Widgets.SetText(self.parts.logBody, table.concat(lines, "\n"))
end

function RadarUi:_syncSettings()
	-- Cập nhật chữ trên các công tắc theo cấu hình hiện tại.
	for key, spec in pairs(self.settingButtons) do
		local value = self:_readConfig(spec.path)
		Ui_Widgets.SetText(spec.button, value == true and "bật" or "tắt")
		Ui_Widgets.SetColor(spec.button, "BackgroundColor3",
			value == true and Ui_Theme.Color.accentDark or Ui_Theme.Color.rowBackground)
	end
end

function RadarUi:_syncDetail(view)
	if self.parts.detailBody == nil then
		return
	end
	local entityId = view.selectedId
	if entityId == nil then
		Ui_Widgets.SetText(self.parts.detailTitle, "Chưa chọn mục nào")
		Ui_Widgets.SetText(self.parts.detailBody,
			"Chọn một mục trong danh sách để xem chi tiết.\n\n"
			.. "Lưu ý: danh sách này là DANH MỤC. Có tên ở đây không có nghĩa là hệ thống định vị được mục đó.")
		Ui_Widgets.SetText(self.parts.detailSelectButton, "Chọn")
		Ui_Widgets.SetText(self.parts.detailTrackButton, "Theo dõi")
		return
	end

	local entry = Shared_Catalog.Get(entityId)
	local record = view.records and view.records[entityId] or nil
	if entry == nil then
		Ui_Widgets.SetText(self.parts.detailTitle, "Mục không tồn tại")
		Ui_Widgets.SetText(self.parts.detailBody, "Id: " .. tostring(entityId))
		return
	end

	Ui_Widgets.SetText(self.parts.detailTitle, entry.name)

	local areaNames = {}
	for _, areaId in ipairs(entry.areas) do
		areaNames[#areaNames + 1] = Shared_Areas.GetName(areaId)
	end

	local lines = {}
	lines[#lines + 1] = ("Loại: %s (chưa xác minh bằng instance)"):format(Shared_Catalog.KindLabel[entry.kind] or entry.kind)
	lines[#lines + 1] = "Khu vực: " .. table.concat(areaNames, ", ")

	local isSelected = view.selectionIds ~= nil and view.selectionIds[entityId] == true
	local isTracked = view.trackedIds ~= nil and view.trackedIds[entityId] == true
	lines[#lines + 1] = ("Đã chọn: %s   ·   Đang theo dõi: %s")
		:format(tostring(isSelected), tostring(isTracked))

	local code = record and record.code or Shared_Status.Code.Disabled
	lines[#lines + 1] = ""
	lines[#lines + 1] = "TRẠNG THÁI: " .. Shared_Status.GetLabel(code)
	if record ~= nil then
		lines[#lines + 1] = "Lý do: " .. tostring(record.reason)
		if record.stale then
			lines[#lines + 1] = "DỮ LIỆU CŨ: đây không phải dữ liệu trực tiếp."
		end
	end

	local observation = record and record.observation or nil
	if observation ~= nil and Shared_Status.MayShowPosition(code) then
		lines[#lines + 1] = ""
		lines[#lines + 1] = "Nguồn dữ liệu: " .. tostring(observation.source)
		lines[#lines + 1] = "Instance: " .. tostring(observation.instanceName)
		local formatted = Shared_Geometry.FormatDistance(observation.distance)
		lines[#lines + 1] = "Khoảng cách: " .. (formatted or "không tính được (thiếu vị trí người chơi)")
		lines[#lines + 1] = "Hướng: " .. tostring(observation.direction or "không tính được (thiếu hướng camera)")
		if observation.matchCount ~= nil and observation.matchCount > 1 then
			lines[#lines + 1] = ("Số instance khớp: %d (hiển thị cái gần nhất)"):format(observation.matchCount)
		end
		if Shared_Geometry.IsPositionVector(observation.position) then
			lines[#lines + 1] = ("Toạ độ: %.1f, %.1f, %.1f")
				:format(observation.position.X, observation.position.Y, observation.position.Z)
		end
	else
		lines[#lines + 1] = ""
		lines[#lines + 1] = "Không có vị trí để hiển thị — hệ thống không suy đoán toạ độ."
	end

	local matchKeys = Shared_Catalog.GetMatchKeys(entry)
	lines[#lines + 1] = ""
	if #matchKeys > 0 then
		lines[#lines + 1] = "Mẫu tên đang dò: " .. table.concat(matchKeys, ", ")
	else
		lines[#lines + 1] = "Mẫu tên đang dò: (không có)"
	end
	lines[#lines + 1] = "Đã xác minh mẫu: " .. tostring(view.confirmedIds ~= nil and view.confirmedIds[entityId] == true)

	local aliasName = Shared_Catalog.GetAliasName(entry)
	if aliasName ~= nil then
		lines[#lines + 1] = ("Biến thể của: %s (chú thích, không dùng để khớp)")
			:format(aliasName)
	end

	-- Nút theo dõi chỉ có nghĩa khi mục này CÓ cơ chế phát hiện hợp lệ.
	local trackable = entry.detect ~= nil and entry.detect.method == "scan"
	if trackable then
		lines[#lines + 1] = isTracked
			and "Theo dõi: BẬT — sẽ ghi nhật ký khi mục này xuất hiện/biến mất."
			or "Theo dõi: TẮT — bấm nút \"Theo dõi\" để ghi nhật ký khi mục này xuất hiện."
	else
		lines[#lines + 1] = "Theo dõi: không áp dụng (mục này không có cơ chế phát hiện từ client)."
	end

	if entry.notes ~= "" then
		lines[#lines + 1] = ""
		lines[#lines + 1] = "Ghi chú: " .. entry.notes
	end

	Ui_Widgets.SetText(self.parts.detailBody, table.concat(lines, "\n"))
	Ui_Widgets.SetText(self.parts.detailSelectButton, isSelected and "Bỏ chọn" or "Chọn")
	Ui_Widgets.SetText(self.parts.detailTrackButton, isTracked and "Ngừng theo dõi" or "Theo dõi")
	Ui_Widgets.SetColor(self.parts.detailTrackButton, "BackgroundColor3",
		trackable and (isTracked and Ui_Theme.Color.accentDark or Ui_Theme.Color.rowBackground)
			or Ui_Theme.Color.rowBackground)
end

function RadarUi:_syncStatusBar(view)
	if self.parts.statusLabel == nil then
		return
	end
	local counts = view.counts or {}
	local detected = counts[Shared_Status.Code.Detected] or 0
	local noPosition = counts[Shared_Status.Code.NoPosition] or 0
	local notFound = counts[Shared_Status.Code.NotFound] or 0
	local unverified = counts[Shared_Status.Code.Unverified] or 0
	local unsupported = counts[Shared_Status.Code.Unsupported] or 0

	-- Đồng hồ nằm ở nhãn riêng để không ghi đè bộ đếm.
	Ui_Widgets.SetText(self.parts.clockLabel, "Cập nhật: " .. tostring(view.lastUpdateText or "chưa có"))

	local showCounters = (self.config.Ui and self.config.Ui.showCounters) ~= false
	local pieces = {}
	if showCounters then
		pieces[#pieces + 1] = ("Phát hiện %d"):format(detected)
		if noPosition > 0 then
			pieces[#pieces + 1] = ("thiếu vị trí %d"):format(noPosition)
		end
		pieces[#pieces + 1] = ("không thấy %d"):format(notFound)
		pieces[#pieces + 1] = ("chưa xác minh %d"):format(unverified)
		pieces[#pieces + 1] = ("không hỗ trợ %d"):format(unsupported)
	end
	pieces[#pieces + 1] = ("hiển thị %d/%d mục"):format(self.renderedRows, self.lastRowCount)
	if (view.selectedCount or 0) > 0 then
		pieces[#pieces + 1] = ("đã chọn %d"):format(view.selectedCount)
	end

	local text = table.concat(pieces, "  •  ")
	if view.warningText ~= nil and view.warningText ~= "" then
		text = text .. "  ⚠ " .. view.warningText
	end
	Ui_Widgets.SetText(self.parts.statusLabel, text)
	Ui_Widgets.SetColor(self.parts.statusLabel, "TextColor3",
		(view.warningText ~= nil and view.warningText ~= "") and Ui_Theme.Color.warning
			or Ui_Theme.Color.textSecondary)
end

function RadarUi:_buildStatusBar(panel, layout)
	if layout.statusHeight <= 0 then
		self.parts.statusBar = nil
		return
	end
	local metrics = Ui_Theme.Metrics
	local bar = Ui_Widgets.Frame(panel, {
		Name = "StatusBar",
		Position = UDim2.new(0, 0, 1, -layout.statusHeight),
		Size = UDim2.new(1, 0, 0, layout.statusHeight),
		BackgroundColor3 = Ui_Theme.Color.headerBackground,
	}, "ui:StatusBar")
	Ui_Widgets.Corner(bar)
	self.parts.statusBar = bar

	-- Hai nhãn RIÊNG: đồng hồ cập nhật và bộ đếm/cảnh báo.
	-- Nếu dùng chung một nhãn thì task đồng hồ sẽ ghi đè mất bộ đếm
	-- (lỗi này đã xảy ra và được test RAD-004/RAD-005 bắt lại).
	self.parts.clockLabel = Ui_Widgets.Label(bar, {
		Name = "ClockLabel",
		Position = UDim2.new(0, metrics.padding, 0, 0),
		Size = UDim2.new(0, 150, 1, 0),
		Text = "chưa có dữ liệu",
		TextSize = Ui_Theme.TextSize.small,
		TextColor3 = Ui_Theme.Color.textMuted,
		Font = Ui_Theme.Font.mono,
		TextTruncate = Enum.TextTruncate.AtEnd,
	}, "ui:ClockLabel")

	self.parts.statusLabel = Ui_Widgets.Label(bar, {
		Name = "StatusLabel",
		Position = UDim2.new(0, metrics.padding + 156, 0, 0),
		Size = UDim2.new(1, -metrics.padding * 2 - 156, 1, 0),
		Text = "chưa có dữ liệu",
		TextSize = Ui_Theme.TextSize.small,
		TextColor3 = Ui_Theme.Color.textSecondary,
		TextTruncate = Enum.TextTruncate.AtEnd,
	}, "ui:StatusLabel")
end

--[[
	ĐỔ DỮ LIỆU. view = {
	  rows, records, counts, selectedId, areaId, stateText, stateColor,
	  primaryLabel, lastUpdateText, warningText, confirmedIds,
	  tabId, selectionIds, trackedIds, selectionFilter, selectedCount,
	  scopeCount, trackedCount
	}
]]
function RadarUi:Sync(view)
	if not self.built or view == nil then
		return false
	end
	self.selectedId = view.selectedId

	-- Radar là nguồn sự thật về tab: nếu nó đổi (do SetArea/tìm kiếm) thì
	-- UI theo, nhưng KHÔNG dựng lại gì.
	if view.tabId ~= nil and view.tabId ~= self.activeTab then
		self:SetTab(view.tabId, true)
	end

	self.stats.syncs = self.stats.syncs + 1
	self:_syncHeader(view)
	self:_syncFilters(view)
	self:_syncList(view)
	self:_syncSelectionBar(view)
	self:_syncHome(view)
	self:_syncDetail(view)
	self:_syncSettings()
	self:_syncLog(false)
	self:_syncStatusBar(view)
	return true
end

-- Chỉ cập nhật đồng hồ "cập nhật lần cuối" (rẻ hơn Sync đầy đủ).
-- Ghi vào clockLabel, KHÔNG đụng statusLabel.
function RadarUi:SetClockText(text)
	if self.parts.clockLabel == nil then
		return false
	end
	return Ui_Widgets.SetText(self.parts.clockLabel, tostring(text))
end

function RadarUi:SetOpen(open)
	if self.gui == nil then
		return false
	end
	self.open = open == true
	return Ui_Widgets.Set(self.gui, "Enabled", self.open)
end

function RadarUi:IsOpen()
	return self.open
end

function RadarUi:IsBuilt()
	return self.built
end

function RadarUi:Stats()
	return {
		built = self.built,
		open = self.open,
		minimized = self.minimized,
		activeTab = self.activeTab,
		tabSwitches = self.stats.tabSwitches,
		drags = self.stats.drags,
		selectionClicks = self.stats.selectionClicks,
		syncs = self.stats.syncs,
		rowsUpdated = self.stats.rowsUpdated,
		renderedRows = self.renderedRows,
		rowPool = #self.rows,
		widgetWrites = Ui_Widgets.stats.writes,
		widgetSkipped = Ui_Widgets.stats.skipped,
		widgetsCreated = Ui_Widgets.stats.created,
	}
end

-- Dọn dẹp: huỷ ScreenGui (kéo theo toàn bộ con) và xoá tham chiếu.
-- Connection kéo thả do Registry giữ nên Shutdown của Radar sẽ ngắt.
function RadarUi:Destroy()
	if self.gui ~= nil then
		Client_Registry.Untrack(self.gui)
		Shared_Safe.Destroy(self.gui)
		self.gui = nil
	end
	self.parts = {}
	self.pages = {}
	self.rows = {}
	self.areaButtons = {}
	self.tabButtons = {}
	self.settingButtons = {}
	self.filterButtons = {}
	self.drag = nil
	self.built = false
	self.open = false
	self.minimized = false
	return true
end

return RadarUi
]=],
	["Client/Ui/Theme"] = [=[
--[[
	doors-entity-radar/src/Client/Ui/Theme.luau
	ModuleScript — đặt tại: DoorsEntityRadar.Client.Ui.Theme

	CHỦ ĐỀ GIAO DIỆN. Chỉ chứa màu, phông, kích thước — không có logic.
	Tách riêng để đổi giao diện không đụng vào code hành vi.

	LƯU Ý: dự án KHÔNG đổi đồ hoạ/âm thanh/vật lý của DOORS. Mọi thứ ở đây
	chỉ vẽ lên ScreenGui của chính người chơi.
]]

local Theme = {}

Theme.Font = {
	title = Enum.Font.GothamBold,
	heading = Enum.Font.GothamMedium,
	body = Enum.Font.Gotham,
	mono = Enum.Font.RobotoMono,
}

Theme.TextSize = {
	title = 17,
	heading = 14,
	body = 13,
	small = 11,
	tiny = 10,
}

Theme.Color = {
	background = Color3.fromRGB(18, 20, 26),
	panelEdge = Color3.fromRGB(46, 52, 66),
	headerBackground = Color3.fromRGB(24, 27, 34),
	rowBackground = Color3.fromRGB(28, 32, 40),
	rowBackgroundAlt = Color3.fromRGB(32, 36, 45),
	rowSelected = Color3.fromRGB(40, 56, 78),
	detailBackground = Color3.fromRGB(24, 27, 34),
	textPrimary = Color3.fromRGB(228, 232, 240),
	textSecondary = Color3.fromRGB(158, 166, 180),
	textMuted = Color3.fromRGB(112, 120, 134),
	accent = Color3.fromRGB(96, 165, 250),
	accentDark = Color3.fromRGB(37, 62, 96),
	danger = Color3.fromRGB(235, 96, 96),
	warning = Color3.fromRGB(240, 190, 80),
	ok = Color3.fromRGB(86, 220, 130),
	inputBackground = Color3.fromRGB(14, 16, 21),
}

Theme.Metrics = {
	cornerRadius = UDim.new(0, 8),
	rowHeight = 30,
	headerHeight = 46,
	-- Chiều cao thanh tab và thanh chọn thực thể (tab system mới).
	tabBarHeight = 34,
	selectionBarHeight = 30,
	filterHeight = 36,
	statusHeight = 30,
	padding = 10,
	gap = 6,
	buttonWidth = 84,
	-- Số dòng tối đa được dựng trong danh sách. Danh mục có 82 mục nên 200
	-- là đủ; giới hạn này chỉ để không bao giờ dựng vô hạn frame.
	maxRows = 200,
}

-- Màu chấm trạng thái lấy từ Shared/Status để không lệch nhau.
local Shared_Status = __DER_REQUIRE("Shared/Status")

function Theme.StatusColor(code)
	local rgb = Shared_Status.Color[code]
	if rgb == nil then
		return Theme.Color.textMuted
	end
	return Color3.fromRGB(rgb[1], rgb[2], rgb[3])
end

function Theme.KindColor(kind)
	if kind == "entity" then
		return Theme.Color.danger
	end
	if kind == "npc" then
		return Theme.Color.ok
	end
	if kind == "prop" then
		return Theme.Color.textSecondary
	end
	if kind == "event" then
		return Theme.Color.warning
	end
	return Theme.Color.textMuted
end

return Theme
]=],
	["Client/Ui/Widgets"] = [=[
--[[
	doors-entity-radar/src/Client/Ui/Widgets.luau
	ModuleScript — đặt tại: DoorsEntityRadar.Client.Ui.Widgets

	XƯỞNG TẠO WIDGET. Mọi instance GUI do dự án tạo đều đi qua đây và được
	đăng ký vào Registry để dọn dẹp được.

	ĐIỂM QUAN TRỌNG NHẤT VỀ HIỆU NĂNG: SetText/SetColor so sánh giá trị
	trước khi ghi. Nhờ vậy khi dữ liệu không đổi, số lần ghi property bằng 0
	(và bộ đếm Widgets.stats.skipped chứng minh điều đó trong test).
]]

local Shared_Safe = __DER_REQUIRE("Shared/Safe")
local Client_Registry = __DER_REQUIRE("Client/Core/Registry")
local Ui_Theme = __DER_REQUIRE("Client/Ui/Theme")

local Widgets = {}

Widgets.stats = { created = 0, writes = 0, skipped = 0, destroyed = 0 }

-- Ghi một property, có đếm. Chỉ dùng cho instance của dự án.
function Widgets.Set(instance, key, value)
	if instance == nil then
		return false
	end
	Widgets.stats.writes = Widgets.stats.writes + 1
	return Shared_Safe.Write(instance, key, value)
end

-- Ghi Text chỉ khi khác giá trị cũ. Trả về true nếu đã ghi.
function Widgets.SetText(instance, text)
	if instance == nil then
		return false
	end
	local nextText = tostring(text)
	local current, ok = Shared_Safe.Read(instance, "Text")
	if ok and current == nextText then
		Widgets.stats.skipped = Widgets.stats.skipped + 1
		return false
	end
	return Widgets.Set(instance, "Text", nextText)
end

-- Ghi màu chỉ khi khác. So sánh từng kênh để không phụ thuộc == của Color3.
function Widgets.SetColor(instance, key, color)
	if instance == nil or color == nil then
		return false
	end
	local current, ok = Shared_Safe.Read(instance, key)
	if ok and type(current) == "table" and type(color) == "table" then
		if current.R == color.R and current.G == color.G and current.B == color.B then
			Widgets.stats.skipped = Widgets.stats.skipped + 1
			return false
		end
	end
	return Widgets.Set(instance, key, color)
end

-- Ghi Visible chỉ khi khác.
function Widgets.SetVisible(instance, visible)
	if instance == nil then
		return false
	end
	local current, ok = Shared_Safe.Read(instance, "Visible")
	if ok and current == (visible == true) then
		Widgets.stats.skipped = Widgets.stats.skipped + 1
		return false
	end
	return Widgets.Set(instance, "Visible", visible == true)
end

local function create(className, parent, props, label)
	local ok, instance = pcall(function()
		return Instance.new(className)
	end)
	if not ok or instance == nil then
		return nil
	end
	Widgets.stats.created = Widgets.stats.created + 1
	if type(props) == "table" then
		for key, value in pairs(props) do
			Shared_Safe.Write(instance, key, value)
		end
	end
	if parent ~= nil then
		Shared_Safe.Write(instance, "Parent", parent)
	end
	if label ~= nil then
		Client_Registry.Track(instance, label)
	end
	return instance
end

function Widgets.ScreenGui(parent, props)
	return create("ScreenGui", parent, props, "gui:ScreenGui")
end

function Widgets.Frame(parent, props, label)
	return create("Frame", parent, props, label)
end

function Widgets.Label(parent, props, label)
	local defaults = {
		BackgroundTransparency = 1,
		Text = "",
		TextColor3 = Ui_Theme.Color.textPrimary,
		Font = Ui_Theme.Font.body,
		TextSize = Ui_Theme.TextSize.body,
		TextXAlignment = Enum.TextXAlignment.Left,
		TextYAlignment = Enum.TextYAlignment.Center,
	}
	if type(props) == "table" then
		for key, value in pairs(props) do
			defaults[key] = value
		end
	end
	return create("TextLabel", parent, defaults, label)
end

function Widgets.Button(parent, props, label)
	local defaults = {
		BackgroundColor3 = Ui_Theme.Color.rowBackground,
		TextColor3 = Ui_Theme.Color.textPrimary,
		Font = Ui_Theme.Font.heading,
		TextSize = Ui_Theme.TextSize.body,
		AutoButtonColor = true,
		Text = "",
	}
	if type(props) == "table" then
		for key, value in pairs(props) do
			defaults[key] = value
		end
	end
	return create("TextButton", parent, defaults, label)
end

function Widgets.TextBox(parent, props, label)
	local defaults = {
		BackgroundColor3 = Ui_Theme.Color.inputBackground,
		TextColor3 = Ui_Theme.Color.textPrimary,
		PlaceholderColor3 = Ui_Theme.Color.textMuted,
		Font = Ui_Theme.Font.body,
		TextSize = Ui_Theme.TextSize.body,
		Text = "",
		ClearTextOnFocus = false,
	}
	if type(props) == "table" then
		for key, value in pairs(props) do
			defaults[key] = value
		end
	end
	return create("TextBox", parent, defaults, label)
end

function Widgets.Scrolling(parent, props, label)
	local defaults = {
		BackgroundTransparency = 1,
		ScrollBarThickness = 6,
		CanvasSize = UDim2.new(0, 0, 0, 0),
	}
	if type(props) == "table" then
		for key, value in pairs(props) do
			defaults[key] = value
		end
	end
	return create("ScrollingFrame", parent, defaults, label)
end

function Widgets.Corner(instance, radius)
	return create("UICorner", instance, { CornerRadius = radius or Ui_Theme.Metrics.cornerRadius })
end

function Widgets.Stroke(instance, color, thickness)
	return create("UIStroke", instance, {
		Color = color or Ui_Theme.Color.panelEdge,
		Thickness = thickness or 1,
		ApplyStrokeMode = Enum.ApplyStrokeMode.Border,
	})
end

function Widgets.ListLayout(instance, props)
	local defaults = {
		FillDirection = Enum.FillDirection.Vertical,
		SortOrder = Enum.SortOrder.LayoutOrder,
		Padding = UDim.new(0, Ui_Theme.Metrics.gap),
	}
	if type(props) == "table" then
		for key, value in pairs(props) do
			defaults[key] = value
		end
	end
	return create("UIListLayout", instance, defaults)
end

function Widgets.Padding(instance, amount)
	local value = amount or Ui_Theme.Metrics.padding
	return create("UIPadding", instance, {
		PaddingTop = UDim.new(0, value),
		PaddingBottom = UDim.new(0, value),
		PaddingLeft = UDim.new(0, value),
		PaddingRight = UDim.new(0, value),
	})
end

function Widgets.Scale(instance, value)
	return create("UIScale", instance, { Scale = value })
end

-- Nối sự kiện chuột của nút, trả về (connection, errorMessage).
function Widgets.OnClick(button, handler, label)
	if button == nil then
		return nil, "Không có nút để nối sự kiện."
	end
	local signal = Shared_Safe.Read(button, "MouseButton1Click")
	return Client_Registry.Connect(signal, handler, label or "ui:click")
end

-- Nối sự kiện đổi nội dung ô tìm kiếm.
function Widgets.OnTextChanged(textBox, handler, label)
	if textBox == nil then
		return nil, "Không có ô nhập liệu."
	end
	local signal = nil
	local okSignal, changedSignal = pcall(function()
		return textBox:GetPropertyChangedSignal("Text")
	end)
	if okSignal then
		signal = changedSignal
	end
	return Client_Registry.Connect(signal, handler, label or "ui:text")
end

function Widgets.ResetStats()
	Widgets.stats = { created = 0, writes = 0, skipped = 0, destroyed = 0 }
end

return Widgets
]=],
	["Server/Diagnostics"] = [=[
--[[
	doors-entity-radar/src/Server/Diagnostics.luau
	**Script (Server)** — TUỲ CHỌN, mặc định TẮT.

	Vị trí: ServerScriptService > DoorsEntityRadarServer > Diagnostics (Script)

	TỆP NÀY TỒN TẠI ĐỂ LÀM GÌ?
	Radar phía client chỉ đoán được tên instance. Muốn chuyển một mục từ
	"Chưa xác minh" sang trạng thái tin cậy, bạn cần biết TÊN THẬT của
	instance trong game. Script này in ra đúng thông tin đó:
	  * liệt kê tên instance khớp từng mục danh mục (mỗi bên nhìn một phía:
	    server thấy toàn bộ, client chỉ thấy phần được nhân bản);
	  * so sánh với những gì client thấy để biết mục nào KHÔNG được nhân bản.

	Sau khi đọc Output, bạn chép tên thật vào
	Config.Detection.confirmedPatterns (hoặc extraPatterns) phía client.

	RÀNG BUỘC:
	  * MẶC ĐỊNH TẮT (ENABLED = false) — không chạy thì không làm gì cả.
	  * CHỈ ĐỌC. Không di chuyển, không đổi thuộc tính đối tượng của game,
	    không tạo RemoteEvent ảnh hưởng lối chơi.
	  * Chế độ PUBLISH (tạo Folder Attribute cho cầu nhà phát triển) cũng
	    mặc định TẮT và chỉ nên bật trong game BẠN có quyền chỉnh sửa.
]]

--============================= CẤU HÌNH CỦA SCRIPT =============================
local ENABLED = false          -- bật lên true nếu bạn muốn chạy chẩn đoán
local PUBLISH = false          -- bật lên true nếu muốn phát dữ liệu qua Attribute
local SCAN_INTERVAL = 5        -- giây giữa hai lần quét
local MAX_REPORT_PER_ENTITY = 5
local BRIDGE_FOLDER = "DER_Bridge"
local BRIDGE_PREFIX = "DER_"
local MAX_DESCENDANTS = 20000
--==============================================================================

if not ENABLED then
	print("[DER][Server] Diagnostics đang TẮT (ENABLED = false). Không làm gì cả.")
	return
end

-- Nạp bộ module dùng chung (cùng cơ chế với client, không có gì đặc biệt).
local replicatedStorage = game:GetService("ReplicatedStorage")
local root = replicatedStorage:WaitForChild("DoorsEntityRadar", 10)
if root == nil then
	warn("[DER][Server] Không thấy ReplicatedStorage.DoorsEntityRadar — dừng chẩn đoán.")
	return
end
local shimModule = root.Shared:WaitForChild("RequireShim", 10)
local shim = require(shimModule)
shim.Install({ game = game })

local Catalog = __DER_REQUIRE("Shared/EntityCatalog")

-- Chuẩn hoá tên giống hệt phía client (dùng chung một hàm).
local normalize = Catalog.NormalizeKey

-- Dựng luật khớp từ danh mục: exact + contains.
local exactRules = {}
local containsRules = {}
for _, entry in ipairs(Catalog.List) do
	if entry.detect.method ~= "unsupported" then
		for _, key in ipairs(Catalog.GetMatchKeys(entry)) do
			if entry.detect.matchMode == "contains" then
				containsRules[#containsRules + 1] = { key = key, id = entry.id }
			else
				if exactRules[key] == nil then
					exactRules[key] = {}
				end
				local bucket = exactRules[key]
				bucket[#bucket + 1] = entry.id
			end
		end
	end
end

local function matchName(instanceName)
	local hits = {}
	local key = normalize(instanceName)
	if #key == 0 then
		return hits
	end
	local direct = exactRules[key]
	if direct ~= nil then
		for _, id in ipairs(direct) do
			hits[id] = true
		end
	end
	for _, rule in ipairs(containsRules) do
		if string.find(key, rule.key, 1, true) ~= nil then
			hits[rule.id] = true
		end
	end
	return hits
end

-- Đọc vị trí (chỉ đọc, không đổi gì).
local function looksLikeVector(value)
	if value == nil then
		return false
	end
	local okX, x, y, z = pcall(function()
		return value.X, value.Y, value.Z
	end)
	if not okX then
		return false
	end
	return type(x) == "number" and x == x and type(y) == "number" and y == y and type(z) == "number" and z == z
end

local function readPosition(instance)
	local okDirect, direct = pcall(function()
		return instance.Position
	end)
	if okDirect and looksLikeVector(direct) then
		return direct
	end
	local okPivot, pivot = pcall(function()
		return instance:GetPivot()
	end)
	if okPivot and pivot ~= nil then
		local okPivotPos, pivotPos = pcall(function()
			return pivot.Position
		end)
		if okPivotPos and looksLikeVector(pivotPos) then
			return pivotPos
		end
	end
	return nil
end

local function readClassName(instance)
	local ok, className = pcall(function()
		return instance.ClassName
	end)
	if ok and type(className) == "string" then
		return className
	end
	return "?"
end

-- Folder cầu dữ liệu (chỉ tạo khi PUBLISH = true).
local bridgeFolder = nil
if PUBLISH then
	bridgeFolder = workspace:FindFirstChild(BRIDGE_FOLDER)
	if bridgeFolder == nil then
		bridgeFolder = Instance.new("Folder")
		bridgeFolder.Name = BRIDGE_FOLDER
		bridgeFolder.Parent = workspace
	end
	print(("[DER][Server] Đã bật cầu dữ liệu: workspace.%s (prefix %s)"):format(BRIDGE_FOLDER, BRIDGE_PREFIX))
end

local function scanOnce()
	local ok, descendants = pcall(function()
		return workspace:GetDescendants()
	end)
	if not ok or type(descendants) ~= "table" then
		warn("[DER][Server] Không đọc được Workspace:GetDescendants().")
		return
	end

	local total = math.min(#descendants, MAX_DESCENDANTS)
	local found = {}
	local seenNames = {}

	for index = 1, total do
		local instance = descendants[index]
		local okName, instanceName = pcall(function()
			return instance.Name
		end)
		if okName and type(instanceName) == "string" then
			local hits = matchName(instanceName)
			for entityId in pairs(hits) do
				if found[entityId] == nil then
					found[entityId] = {}
				end
				local bucket = found[entityId]
				if #bucket < MAX_REPORT_PER_ENTITY then
					bucket[#bucket + 1] = {
						name = instanceName,
						className = readClassName(instance),
						position = readPosition(instance),
					}
				end
				seenNames[instanceName] = true
			end
		end
	end

	print(("[DER][Server] Đã duyệt %d/%d descendant. Khớp %d mục danh mục.")
		:format(total, #descendants, (function()
			local count = 0
			for _ in pairs(found) do
				count = count + 1
			end
			return count
		end)()))
	if #descendants > MAX_DESCENDANTS then
		warn(("[DER][Server] Workspace có %d descendant, vượt trần %d: kết quả có thể thiếu.")
			:format(#descendants, MAX_DESCENDANTS))
	end

	for _, entry in ipairs(Catalog.List) do
		local bucket = found[entry.id]
		if bucket ~= nil then
			for _, hit in ipairs(bucket) do
				local positionText = "không có vị trí"
				if hit.position ~= nil then
					positionText = ("%.1f, %.1f, %.1f"):format(hit.position.X, hit.position.Y, hit.position.Z)
					if PUBLISH and bridgeFolder ~= nil then
						bridgeFolder:SetAttribute(
							BRIDGE_PREFIX .. "entity_" .. entry.id,
							("%.2f,%.2f,%.2f"):format(hit.position.X, hit.position.Y, hit.position.Z))
					end
				end
				print(("  [KHỚP] %s <- instance '%s' (%s) tại %s")
					:format(entry.id, hit.name, hit.className, positionText))
			end
		end
	end

	-- Gợi ý dòng cấu hình để người dùng chép vào Config.Detection.confirmedPatterns.
	local suggestions = {}
	for instanceName in pairs(seenNames) do
		suggestions[#suggestions + 1] = ('"%s"'):format(instanceName)
	end
	if #suggestions > 0 then
		table.sort(suggestions)
		print("[DER][Server] Chép vào Config.Detection.confirmedPatterns nếu bạn đã tự kiểm chứng: { "
			.. table.concat(suggestions, ", ") .. " }")
	end
end

print("[DER][Server] Diagnostics BẬT. Script này chỉ đọc, không đổi trò chơi.")

-- Một vòng lặp duy nhất, chờ theo giây. Không bám Heartbeat vì việc quét
-- không cần độ chính xác khung hình — bám Heartbeat chỉ tổ tốn tài nguyên.
task.spawn(function()
	while ENABLED do
		scanOnce()
		task.wait(SCAN_INTERVAL)
	end
end)
]=],
	["Shared/Areas"] = [=[
--[[
	doors-entity-radar/src/Shared/Areas.luau
	ModuleScript — đặt tại: ReplicatedStorage.DoorsEntityRadar.Shared.Areas

	DANH MỤC KHU VỰC. Tách riêng khỏi EntityCatalog để bộ lọc khu vực
	trong UI và dữ liệu thực thể không dính vào nhau.

	Mỗi khu vực có:
	  id     — khoá ổn định dùng trong code và trong cấu hình
	  name   — tên hiển thị
	  short  — nhãn ngắn cho nút lọc (màn hình hẹp)
	  order  — thứ tự hiển thị
	  note   — ghi chú trung thực về khả năng phát hiện trong khu vực đó
]]

local Areas = {}

Areas.List = {
	{
		id = "hotel",
		name = "The Hotel",
		short = "Hotel",
		order = 1,
		note = "Khu khách sạn (cửa 1-100). Nhiều thực thể spawn dưới dạng Model trong Workspace.",
	},
	{
		id = "mines",
		name = "The Mines",
		short = "Mines",
		order = 2,
		note = "Khu hầm mỏ. Dùng chung nhiều thực thể với Hotel, thêm các thực thể riêng.",
	},
	{
		id = "backdoor",
		name = "The Backdoor",
		short = "Backdoor",
		order = 3,
		note = "Khu Backdoor. Danh sách thực thể ngắn, phần lớn là tên suy đoán.",
	},
	{
		id = "archives",
		name = "The Archives",
		short = "Archives",
		order = 4,
		note = "Khu lưu trữ. Nhiều mục là tên do cộng đồng gọi, chưa chắc trùng tên instance.",
	},
	{
		id = "outdoors",
		name = "The Outdoors",
		short = "Outdoors",
		order = 5,
		note = "Khu ngoài trời. Một số mục là vật thể môi trường chứ không phải thực thể.",
	},
	{
		id = "stairwell",
		name = "The Stairwell",
		short = "Stairwell",
		order = 6,
		note = "Khu cầu thang. Nhiều mục là đạo cụ/mối nguy hơn là thực thể đuổi.",
	},
	{
		id = "rooms",
		name = "The Rooms",
		short = "Rooms",
		order = 7,
		note = "Chế độ The Rooms (A-60, A-90, A-120).",
	},
	{
		id = "events",
		name = "Chế độ đặc biệt & sự kiện",
		short = "Sự kiện",
		order = 8,
		note = "Sự kiện/mùa và các biến thể tên bị làm nhiễu. Phần lớn KHÔNG phải instance riêng.",
	},
}

-- Bảng tra nhanh theo id, dựng một lần khi module được nạp.
Areas.ById = {}
for _, area in ipairs(Areas.List) do
	if Areas.ById[area.id] ~= nil then
		error(("Areas: trùng id khu vực '%s'"):format(area.id), 2)
	end
	Areas.ById[area.id] = area
end

function Areas.IsValid(areaId)
	return type(areaId) == "string" and Areas.ById[areaId] ~= nil
end

function Areas.GetName(areaId)
	local area = Areas.ById[areaId]
	if area == nil then
		return tostring(areaId)
	end
	return area.name
end

function Areas.GetShortName(areaId)
	local area = Areas.ById[areaId]
	if area == nil then
		return tostring(areaId)
	end
	return area.short
end

-- Danh sách id khu vực đã sắp xếp theo `order` (dùng cho nút lọc).
function Areas.GetOrderedIds()
	local sorted = {}
	for _, area in ipairs(Areas.List) do
		sorted[#sorted + 1] = area.id
	end
	table.sort(sorted, function(a, b)
		return Areas.ById[a].order < Areas.ById[b].order
	end)
	return sorted
end

-- Số khu vực — dùng trong tự kiểm tra khởi động.
function Areas.Count()
	return #Areas.List
end

return Areas
]=],
	["Shared/Config"] = [=[
--[[
	doors-entity-radar/src/Shared/Config.luau
	ModuleScript — đặt tại: ReplicatedStorage.DoorsEntityRadar.Shared.Config

	CẤU HÌNH DUY NHẤT CỦA DỰ ÁN. Mọi con số có thể chỉnh đều nằm ở đây;
	không tệp nào được hard-code ngưỡng riêng.

	NHÓM QUAN TRỌNG NHẤT: Config.Detection.
	  * confirmedPatterns — tên instance BẠN đã tự xác minh trong game.
	    Chỉ những tên này mới cho phép trạng thái "Không phát hiện";
	    ngoài ra hệ thống chỉ dám nói "Chưa xác minh".
	  * unsupported       — ép một mục thành "Không hỗ trợ phát hiện".
	  * extraPatterns     — thêm mẫu tên cho một mục có sẵn.
	  * developerBridge   — chỉ dùng nếu BẠN là người có quyền sửa game
	    và chủ động phát dữ liệu (xem Server/Diagnostics.luau).
]]

local Areas = __DER_REQUIRE("Shared/Areas")

local Config = {}

Config.Meta = {
	name = "DOORS Entity Radar",
	version = "1.0.0",
	-- Ghi rõ bản chất để không ai hiểu nhầm đây là công cụ can thiệp game.
	purpose = "Bảng thông tin/danh mục và định vị THỤ ĐỘNG từ dữ liệu client hợp lệ.",
}

Config.Log = {
	-- "error" | "warn" | "info" | "debug"
	level = "info",
	-- Số dòng giữ lại cho tab "Nhật ký" trên giao diện (vòng lưu trữ).
	historySize = 60,
}

Config.System = {
	-- Tự khởi động khi vào game. Đặt false nếu muốn bấm nút mới chạy.
	autoStart = true,
	-- Phím bật/tắt bảng điều khiển.
	toggleKeyCode = Enum.KeyCode.F2,
	-- Có tạo nút cảm ứng trên thiết bị di động không (ContextActionService).
	allowTouchToggle = true,
	-- Khu vực được chọn sẵn khi mở UI lần đầu. "all" = tất cả.
	defaultAreaId = "all",
	-- Bao lâu thì coi dữ liệu là CŨ (giây). Dữ liệu cũ vẫn hiện nhưng bị
	-- gắn nhãn, không bao giờ được trình bày như dữ liệu trực tiếp.
	staleAfterSeconds = 3.0,
	-- Chu kỳ cập nhật đồng hồ "cập nhật lần cuối" trên UI (giây).
	clockRefreshSeconds = 1.0,
	--[[
		Ghi một dòng nhật ký khi MỘT MỤC ĐANG THEO DÕI chuyển sang/thoát khỏi
		"Đã phát hiện". Chỉ áp dụng cho mục bạn tự bật theo dõi; không theo dõi
		thì không có dòng nào được ghi (không làm trôi Output).
	]]
	alertOnTrack = true,
}

Config.Scan = {
	-- Bật cơ chế quét instance. Tắt = hệ thống chỉ còn là danh mục.
	enabled = true,
	-- Gốc quét. Chỉ hỗ trợ "Workspace": quét ReplicatedStorage dễ đụng
	-- dữ liệu không liên quan và tốn ngân sách vô ích.
	root = "Workspace",
	-- Trần số descendant được duyệt trong MỘT lần quét đầy đủ.
	-- Vượt trần -> quét bị cắt và UI báo "kết quả có thể thiếu" (không im lặng).
	maxDescendantsPerFullScan = 20000,
	-- Số descendant xử lý mỗi nhịp (tránh khựng một khung hình).
	descendantsPerStep = 1200,
	-- Giãn cách tối thiểu giữa hai lần quét đầy đủ (giây).
	fullScanIntervalSeconds = 2.5,
	-- Số instance khớp tối đa giữ cho mỗi mục (chống phình bộ nhớ).
	maxMatchesPerEntity = 8,
	-- Khoảng cách tối đa còn coi là "đáng quan tâm" (stud). Ngoài ngưỡng
	-- vẫn được ghi nhận nhưng UI xếp xuống cuối và ghi rõ khoảng cách.
	interestingDistance = 400,
	-- Tên instance bỏ qua tuyệt đối (chữ thường, đã chuẩn hoá tuỳ chọn).
	ignoreNames = {},
	-- Chu kỳ cập nhật vị trí của các mục ĐÃ khớp (giây). Nhỏ hơn chu kỳ
	-- quét đầy đủ vì bước này chỉ đọc vài instance, rất rẻ.
	refreshMatchesSeconds = 0.5,
}

Config.Detection = {
	--[[
		Tên instance đã xác minh. Cách dùng:
		  1. Vào game, mở Output, chạy Script chẩn đoán (Server/Diagnostics)
		     hoặc tự in tên các instance con của Workspace.
		  2. Chép đúng tên instance vào đây, ví dụ { "Rush", "RushMoving" }.
		  3. Mục danh mục tương ứng mới được phép báo "Không phát hiện".
		Để rỗng = toàn bộ kết quả "không thấy" đều hiển thị "Chưa xác minh".
	]]
	confirmedPatterns = {},

	-- Ép mục thành không hỗ trợ phát hiện, ví dụ { "portrait" = "Là tranh tĩnh, không cần định vị" }.
	unsupported = {},

	-- Thêm mẫu tên cho mục có sẵn, ví dụ { rush = { "rushmoving" } }.
	extraPatterns = {},

	-- Ép trạng thái mẫu đã xác minh cho một mục cụ thể (id -> true).
	confirmedEntities = {},

	--[[
		CẦU DỮ LIỆU NHÀ PHÁT TRIỂN (tuỳ chọn, mặc định TẮT).
		Chỉ bật nếu bạn có quyền sửa game và tự phát dữ liệu, ví dụ đặt
		Attribute lên một Folder:
		  workspace.DER_Bridge:SetAttribute("DER_entity_rush", "12.5,4.0,-88.25")
		Khi đó trạng thái có source = "developer" và được coi là dữ liệu
		hợp lệ do nhà phát triển cung cấp — KHÔNG phải suy đoán.
	]]
	developerBridge = {
		enabled = false,
		-- Folder chứa Attribute; đường dẫn từ Workspace.
		folderName = "DER_Bridge",
		-- Tiền tố Attribute, dạng <prefix>entity_<id> = "x,y,z".
		attributePrefix = "DER_",
	},
}

Config.Ui = {
	-- Bật giao diện. Tắt thì hệ thống vẫn chạy nền và ghi log.
	enabled = true,
	-- Các khối có thể bật/tắt độc lập mà không làm hỏng hệ thống.
	showSearch = true,
	showAreaFilter = true,
	showDetailPanel = true,
	showStatusBar = true,
	showCounters = true,
	-- Thanh chứa các nút chọn/bỏ chọn và bộ đếm "Đã chọn x/y".
	showSelectionBar = true,
	-- Kích thước bảng trên màn hình rộng (pixel).
	panelWidth = 760,
	panelHeight = 520,
	-- Dưới ngưỡng này coi là màn hình hẹp (điện thoại): xếp dọc, thu nhỏ chữ.
	narrowViewportWidth = 700,
	-- Số dòng tối đa hiển thị trong danh sách (phần còn lại cuộn).
	maxVisibleRows = 40,
	-- Vị trí neo bảng.
	anchor = "center",

	--[[
		HỆ THỐNG TAB.
		  showTabs       — bật thanh tab (tắt thì giao diện về dạng một màn hình).
		  defaultTab     — tab mở đầu. Phải là id có thật trong Ui.TABS.
		  enableDrag     — cho phép kéo thả bảng bằng thanh tiêu đề.
		  startMinimized — mở ở trạng thái thu nhỏ (chỉ còn thanh tiêu đề).
		  selectionFilter— bộ lọc mặc định của danh sách: "all" | "selected" | "unselected".
	]]
	showTabs = true,
	defaultTab = "home",
	enableDrag = true,
	startMinimized = false,
	selectionFilter = "all",
}

--[[
	DANH SÁCH TAB (nguồn dữ liệu DUY NHẤT cho thanh điều hướng).
	UI đọc bảng này để dựng nút — thêm tab mới thì chỉ cần thêm một dòng ở đây,
	không phải sửa code dựng giao diện.

	kind:
	  "home"     — trang tổng quan (trạng thái + thao tác nhanh)
	  "area"     — danh sách thực thể của MỘT khu vực (area = id trong Areas)
	  "selected" — tổng hợp các mục người dùng đã chọn
	  "settings" — tuỳ chọn giao diện/hành vi
	  "log"      — nhật ký hoạt động
]]
Config.Ui.TABS = {
	{ id = "home", label = "Trang chủ", kind = "home" },
	-- Tab "Tất cả" GIỮ LẠI tính năng cũ của dải lọc khu vực: xem cả 82 mục
	-- trong một danh sách. area = "all" nghĩa là không lọc theo khu vực.
	{ id = "all", label = "Tất cả", kind = "area", area = "all" },
	{ id = "hotel", label = "The Hotel", kind = "area", area = "hotel" },
	{ id = "mines", label = "The Mines", kind = "area", area = "mines" },
	{ id = "backdoor", label = "The Backdoor", kind = "area", area = "backdoor" },
	{ id = "archives", label = "The Archives", kind = "area", area = "archives" },
	{ id = "outdoors", label = "The Outdoors", kind = "area", area = "outdoors" },
	{ id = "stairwell", label = "The Stairwell", kind = "area", area = "stairwell" },
	{ id = "rooms", label = "The Rooms", kind = "area", area = "rooms" },
	{ id = "events", label = "Sự kiện đặc biệt", kind = "area", area = "events" },
	{ id = "selected", label = "Đã chọn", kind = "selected" },
	{ id = "settings", label = "Cài đặt", kind = "settings" },
	{ id = "log", label = "Nhật ký", kind = "log" },
}

-- Tra tab theo id. Trả về nil nếu id lạ (người gọi phải xử lý, không đoán).
function Config.GetTab(tabId)
	if type(tabId) ~= "string" then
		return nil
	end
	for _, tab in ipairs(Config.Ui.TABS) do
		if tab.id == tabId then
			return tab
		end
	end
	return nil
end

--[[
	TỰ KIỂM TRA CẤU HÌNH. Trả về (ok, problems).
	Gọi trước khi khởi động: cấu hình sai thì dừng và nói rõ sai ở đâu,
	thay vì chạy với giá trị lạ rồi sinh kết quả khó hiểu.
]]
function Config.Validate()
	local problems = {}

	local function requireNumber(path, value, minValue)
		if type(value) ~= "number" then
			problems[#problems + 1] = path .. " phải là số, nhận " .. type(value)
			return
		end
		if value ~= value then
			problems[#problems + 1] = path .. " là NaN"
			return
		end
		if minValue ~= nil and value < minValue then
			problems[#problems + 1] = ("%s phải >= %s, nhận %s"):format(path, tostring(minValue), tostring(value))
		end
	end

	local function requireBoolean(path, value)
		if type(value) ~= "boolean" then
			problems[#problems + 1] = path .. " phải là true/false, nhận " .. type(value)
		end
	end

	local function requireTable(path, value)
		if type(value) ~= "table" then
			problems[#problems + 1] = path .. " phải là bảng, nhận " .. type(value)
		end
	end

	requireBoolean("System.autoStart", Config.System.autoStart)
	requireNumber("System.staleAfterSeconds", Config.System.staleAfterSeconds, 0.1)
	requireNumber("System.clockRefreshSeconds", Config.System.clockRefreshSeconds, 0.1)

	requireBoolean("Scan.enabled", Config.Scan.enabled)
	requireNumber("Scan.maxDescendantsPerFullScan", Config.Scan.maxDescendantsPerFullScan, 1)
	requireNumber("Scan.descendantsPerStep", Config.Scan.descendantsPerStep, 1)
	requireNumber("Scan.fullScanIntervalSeconds", Config.Scan.fullScanIntervalSeconds, 0.05)
	requireNumber("Scan.refreshMatchesSeconds", Config.Scan.refreshMatchesSeconds, 0.05)
	requireNumber("Scan.maxMatchesPerEntity", Config.Scan.maxMatchesPerEntity, 1)
	requireTable("Scan.ignoreNames", Config.Scan.ignoreNames)

	if Config.Scan.descendantsPerStep > Config.Scan.maxDescendantsPerFullScan then
		problems[#problems + 1] = "Scan.descendantsPerStep lớn hơn Scan.maxDescendantsPerFullScan (vô nghĩa)"
	end
	if Config.Scan.refreshMatchesSeconds > Config.Scan.fullScanIntervalSeconds then
		-- Không phải lỗi chí mạng nhưng chắc chắn là cấu hình nhầm.
		problems[#problems + 1] = "Scan.refreshMatchesSeconds lớn hơn Scan.fullScanIntervalSeconds"
	end

	requireTable("Detection.confirmedPatterns", Config.Detection.confirmedPatterns)
	requireTable("Detection.unsupported", Config.Detection.unsupported)
	requireTable("Detection.extraPatterns", Config.Detection.extraPatterns)
	requireTable("Detection.confirmedEntities", Config.Detection.confirmedEntities)
	requireBoolean("Detection.developerBridge.enabled", Config.Detection.developerBridge.enabled)

	requireBoolean("Ui.enabled", Config.Ui.enabled)
	requireNumber("Ui.panelWidth", Config.Ui.panelWidth, 100)
	requireNumber("Ui.panelHeight", Config.Ui.panelHeight, 100)
	requireNumber("Ui.maxVisibleRows", Config.Ui.maxVisibleRows, 1)

	local validAnchors = { center = true, topLeft = true, topRight = true, bottomRight = true }
	if not validAnchors[Config.Ui.anchor] then
		problems[#problems + 1] = "Ui.anchor lạ: " .. tostring(Config.Ui.anchor)
	end

	-- Nhóm tab/lựa chọn: cấu hình sai thì báo rõ, không âm thầm dùng giá trị lạ.
	requireBoolean("Ui.showTabs", Config.Ui.showTabs)
	requireBoolean("Ui.enableDrag", Config.Ui.enableDrag)
	requireBoolean("Ui.startMinimized", Config.Ui.startMinimized)
	requireNumber("Log.historySize", Config.Log.historySize, 1)
	requireBoolean("System.alertOnTrack", Config.System.alertOnTrack)

	if Config.GetTab(Config.Ui.defaultTab) == nil then
		problems[#problems + 1] = "Ui.defaultTab lạ: " .. tostring(Config.Ui.defaultTab)
	end

	local validSelectionFilters = { all = true, selected = true, unselected = true }
	if not validSelectionFilters[Config.Ui.selectionFilter] then
		problems[#problems + 1] = "Ui.selectionFilter lạ: " .. tostring(Config.Ui.selectionFilter)
	end

	-- Danh sách tab: id duy nhất, khu vực phải có thật.
	do
		local seenTabs = {}
		for _, tab in ipairs(Config.Ui.TABS) do
			if type(tab.id) ~= "string" or tab.id == "" then
				problems[#problems + 1] = "Ui.TABS có mục thiếu id"
			elseif seenTabs[tab.id] then
				problems[#problems + 1] = "Ui.TABS trùng id: " .. tab.id
			else
				seenTabs[tab.id] = true
			end
			-- "all" là giá trị hợp lệ của tab khu vực (nghĩa là không lọc).
			if tab.kind == "area" and tab.area ~= "all" and Areas.IsValid(tab.area) ~= true then
				problems[#problems + 1] = ("Ui.TABS '%s' trỏ tới khu vực không tồn tại: %s")
					:format(tostring(tab.id), tostring(tab.area))
			end
		end
		-- Mỗi khu vực phải có ĐÚNG MỘT tab, nếu không sẽ có khu vực không xem được.
		for _, areaId in ipairs(Areas.GetOrderedIds()) do
			if seenTabs[areaId] ~= true then
				problems[#problems + 1] = "Ui.TABS thiếu tab cho khu vực: " .. areaId
			end
		end
	end

	return #problems == 0, problems
end

return Config
]=],
	["Shared/EntityCatalog"] = [=[
--[[
	doors-entity-radar/src/Shared/EntityCatalog.luau
	ModuleScript — đặt tại: ReplicatedStorage.DoorsEntityRadar.Shared.EntityCatalog

	DANH MỤC THỰC THỂ THEO KHU VỰC. Đây là DỮ LIỆU THUẦN: không service,
	không instance, không logic định vị. Logic nằm ở Client/Core/Scanner.

	===== ĐỌC KỸ TRƯỚC KHI DÙNG =====
	1. Tên trong `patterns` là ỨNG VIÊN được suy ra từ tên hiển thị mà cộng
	   đồng dùng. Chúng CHƯA được xác minh bằng cách chạy trong DOORS thật.
	   Vì vậy mặc định mọi mục có `patternSource = "unconfirmed"` và trạng
	   thái khi không tìm thấy là UNVERIFIED — KHÔNG phải "Không phát hiện".
	2. Muốn một mục chuyển sang "Không phát hiện" (nghĩa là đã quét và thật
	   sự không thấy), bạn phải xác nhận mẫu tên bằng một trong hai cách:
	     a) thêm tên instance vào Config.ConfirmedPatterns;
	     b) chạy Script chẩn đoán (Server/Diagnostics) trong game bạn có
	        quyền chỉnh sửa và đối chiếu tên instance thật.
	   Đây là con đường duy nhất; dự án KHÔNG tự phong "đã xác minh".
	3. `kind` là phân loại tốt nhất có thể từ mô tả công khai, và
	   `kindConfirmed = false` cho MỌI mục — xem Catalog.KIND_DISCLAIMER.
	4. Danh mục này KHÔNG tạo ra khả năng phát hiện. Có tên ở đây chỉ để
	   liệt kê và tìm kiếm.
]]

local Shared_Areas = __DER_REQUIRE("Shared/Areas")

local Catalog = {}

-- Nhãn tiếng Việt cho từng loại mục. Dùng để phân biệt thực thể đang tồn
-- tại / sự kiện / vật thể môi trường / tên chưa xác minh (yêu cầu mục 2).
Catalog.KindLabel = {
	entity = "Thực thể",
	npc = "NPC / nhân vật",
	prop = "Vật thể môi trường",
	event = "Sự kiện / cơ chế",
	unverified = "Chưa phân loại",
}

Catalog.KIND_DISCLAIMER = "Phân loại theo mô tả công khai, chưa xác minh bằng instance trong game."

-- Phương pháp phát hiện được hỗ trợ. Chỉ hai giá trị, cố tình ít:
--   scan        — tìm instance khớp tên trong phạm vi cho phép
--   unsupported — không có cơ chế hợp lệ nào từ client
Catalog.MethodLabel = {
	scan = "Quét instance trong phạm vi cho phép",
	unsupported = "Không có cơ chế phát hiện hợp lệ",
}

--[[
	Hàm dựng một dòng danh mục. Dùng hàm thay vì viết bảng thô để không
	mục nào quên trường bắt buộc — thiếu trường là lỗi ngay khi nạp.
]]
local function E(id, name, areas, kind, patterns, notes, options)
	options = options or {}
	assert(type(id) == "string" and #id > 0, "EntityCatalog: thiếu id")
	assert(type(name) == "string" and #name > 0, "EntityCatalog: thiếu name cho " .. tostring(id))
	assert(type(areas) == "table" and #areas > 0, "EntityCatalog: thiếu areas cho " .. tostring(id))
	assert(Catalog.KindLabel[kind] ~= nil, "EntityCatalog: kind lạ '" .. tostring(kind) .. "' cho " .. id)

	local method = options.method or "scan"
	assert(Catalog.MethodLabel[method] ~= nil, "EntityCatalog: method lạ cho " .. id)
	if method == "scan" then
		assert(type(patterns) == "table" and #patterns > 0,
			"EntityCatalog: mục scan phải có patterns (" .. id .. ")")
	end

	return {
		id = id,
		name = name,
		areas = areas,
		kind = kind,
		kindConfirmed = false,
		notes = notes or "",
		detect = {
			method = method,
			patterns = patterns or {},
			-- "exact": so khoá tên đã chuẩn hoá bằng nhau.
			-- "contains": khoá tên có chứa mẫu (dùng khi tên instance hay có hậu tố).
			matchMode = options.matchMode or "exact",
			-- aliasOf: CHỈ LÀ CHÚ THÍCH "biến thể của mục nào" (không mượn
			-- mẫu tên; xem Catalog.GetMatchKeys).
			aliasOf = options.aliasOf,
			-- Lý do bắt buộc phải có khi method = "unsupported".
			reason = options.reason,
		},
		-- Mặc định là "chưa xác nhận" — chỉ Config.ConfirmedPatterns mới đổi được.
		patternSource = "unconfirmed",
	}
end

--======================== DANH MỤC (82 mục duy nhất) =========================
-- Thứ tự trong bảng không quan trọng: Catalog tự sắp theo tên khi dựng chỉ mục.
local ROWS = {
	-- ------------------------- THE HOTEL / THE MINES -------------------------
	E("rush", "Rush", { "hotel", "mines" }, "entity", { "rush" },
		"Lao dọc hành lang. Thường được nhân bản xuống client dưới dạng Model/Part khi sắp xuất hiện."),
	E("ambush", "Ambush", { "hotel", "mines" }, "entity", { "ambush" },
		"Như Rush nhưng đổi hướng nhiều lần."),
	E("eyes", "Eyes", { "hotel", "mines" }, "entity", { "eyes" },
		"Xuất hiện trong phòng; gây hại khi nhìn thẳng vào nó."),
	E("screech", "Screech", { "hotel", "mines" }, "entity", { "screech" },
		"Xuất hiện trong phòng tối, có âm thanh báo trước."),
	E("figure", "Figure", { "hotel", "mines" }, "entity", { "figure" },
		"Thực thể mù ở thư viện; truy đuổi bằng âm thanh."),
	E("seek", "Seek", { "hotel", "mines" }, "entity", { "seek" },
		"Rượt trong hành lang; phần rượt thường có instance riêng."),
	E("dupe", "Dupe", { "hotel", "mines" }, "entity", { "dupe" },
		"Cửa giả. Dấu hiệu nằm ở cửa nên có thể không có Model tên 'Dupe'."),
	E("halt", "Halt", { "hotel", "mines" }, "entity", { "halt" },
		"Xuất hiện ở hành lang dài, buộc người chơi đổi hướng."),
	E("hide", "Hide", { "hotel", "mines" }, "event", {},
		"Ẩn nấp là HÀNH ĐỘNG của người chơi (tương tác tủ/cửa), không phải instance.",
		{
			method = "unsupported",
			reason = "Không có instance riêng để định vị: đây là trạng thái của người chơi, không phải thực thể trong Workspace.",
		}),
	E("timothy", "Timothy", { "hotel", "mines" }, "entity", { "timothy" },
		"Nhện trong ngăn kéo; Model nhỏ, không phải mối đe doạ lớn."),
	E("sally", "Sally (Window)", { "hotel" }, "entity", { "sally" },
		"Xuất hiện ở cửa sổ. Tên hiển thị thường ghi 'Sally (Window)'."),
	E("dread", "Dread", { "hotel", "mines" }, "entity", { "dread" },
		"Có trong danh sách khu vực; tên instance chưa xác minh."),
	E("jeff", "Jeff", { "hotel", "mines" }, "npc", { "jeff" },
		"NPC bán hàng trong phòng shop."),
	E("el_goblino", "El Goblino", { "hotel", "mines" }, "npc", { "el goblino", "elgoblino" },
		"NPC bán hàng, thường gặp trong The Mines."),
	E("bob", "Bob", { "hotel", "mines" }, "npc", { "bob" },
		"NPC trong shop (bức tranh biết nói)."),
	E("jack", "Jack", { "hotel", "mines" }, "entity", { "jack" },
		"Có thể xuất hiện trong tủ; tên instance chưa xác minh."),
	E("moonlight", "Moonlight", { "hotel", "mines" }, "npc", { "moonlight" },
		"NPC trong khu vực bí mật."),
	E("weirdo", "Weirdo", { "hotel", "mines" }, "entity", { "weirdo" },
		"Thực thể hiếm; tên instance chưa xác minh."),
	E("glitch", "Glitch", { "hotel", "mines", "backdoor", "archives", "outdoors", "stairwell" }, "entity", { "glitch" },
		"Xuất hiện ở nhiều khu vực, thường gắn với phòng bị lỗi."),
	E("void", "Void", { "hotel", "mines" }, "entity", { "void" },
		"Khoảng không khi rơi khỏi bản đồ; có thể không tồn tại dưới dạng instance riêng."),
	E("red_barrier", "Red Barrier", { "hotel", "mines" }, "event", { "red barrier" },
		"Rào chắn đỏ chặn đường; là đối tượng sự kiện hơn là thực thể."),
	E("snare", "Snare", { "hotel", "outdoors" }, "prop", { "snare" },
		"Bẫy đặt trên sàn — vật thể môi trường, không di chuyển."),
	E("fallen_chandeliers", "Fallen Chandeliers", { "hotel" }, "prop", { "fallen chandelier", "chandelier" },
		"Đèn chùm rơi — đạo cụ/mối nguy tĩnh. Tên instance hay có hậu tố nên dùng phép chứa.",
		{ matchMode = "contains" }),

	-- ------------------------------ THE MINES --------------------------------
	E("giggle", "Giggle", { "mines" }, "entity", { "giggle" },
		"Thực thể riêng của The Mines."),
	E("gloombats", "Gloombats", { "mines" }, "entity", { "gloombat", "gloombats" },
		"Đàn dơi trong khu tối của The Mines."),
	E("grumble", "Grumble", { "mines" }, "entity", { "grumble" },
		"Thực thể trong The Mines; có biến thể Queen."),
	E("queen_grumble", "Queen Grumble", { "mines" }, "entity", { "queen grumble" },
		"Biến thể lớn hơn của Grumble."),
	E("charles", "Charles", { "mines" }, "npc", { "charles" },
		"NPC trong The Mines."),
	E("dam_seek", "Dam Seek", { "mines" }, "entity", { "dam seek" },
		"Biến thể của Seek ở khu đập nước. Chỉ dò mẫu tên riêng \"dam seek\"; aliasOf chỉ là chú thích.",
		{ aliasOf = "seek" }),
	E("louie", "Louie", { "mines" }, "npc", { "louie" },
		"NPC trong The Mines."),

	-- ----------------------------- THE BACKDOOR ------------------------------
	E("blitz", "Blitz", { "backdoor" }, "entity", { "blitz" },
		"Thực thể trong The Backdoor."),
	E("haste", "Haste", { "backdoor" }, "entity", { "haste" },
		"Thực thể trong The Backdoor."),
	E("lookman", "Lookman", { "backdoor" }, "entity", { "lookman" },
		"Thực thể trong The Backdoor."),
	E("starlight", "Starlight", { "backdoor", "archives", "outdoors" }, "entity", { "starlight" },
		"Xuất hiện ở nhiều khu vực sau Hotel."),
	E("vacuum", "Vacuum", { "backdoor" }, "prop", { "vacuum" },
		"Đối tượng trong The Backdoor; có thể là vật thể hơn là thực thể."),

	-- ----------------------------- THE ARCHIVES ------------------------------
	E("drone", "Drone", { "archives" }, "entity", { "drone" },
		"Thực thể bay trong The Archives."),
	E("bash", "Bash", { "archives" }, "entity", { "bash" },
		"Thực thể trong The Archives."),
	E("scribbles", "Scribbles", { "archives" }, "entity", { "scribbles" },
		"Thực thể trong The Archives."),
	E("ransom", "Ransom", { "archives" }, "entity", { "ransom" },
		"Thực thể trong The Archives."),
	E("forget_me_not", "Forget-Me-Not", { "archives" }, "entity",
		{ "forget me not", "forgetmenot", "forget me nots" },
		"Còn được viết 'Forget Me Nots'. Nhiều biến thể chính tả nên có nhiều mẫu."),
	E("teller", "Teller", { "archives" }, "entity", { "teller" },
		"Thực thể trong The Archives."),
	E("alma", "Alma", { "archives" }, "entity", { "alma" },
		"Thực thể trong The Archives."),
	E("honcho", "Honcho", { "archives" }, "entity", { "honcho" },
		"Thực thể trong The Archives."),
	E("fih", "Fih", { "archives" }, "entity", { "fih" },
		"Tên ngắn, dễ trùng với tên instance khác — cần xác minh kỹ."),
	E("portrait", "Portrait", { "archives" }, "entity", { "portrait" },
		"Tranh chân dung; có thể là đạo cụ được đặt tên giống thực thể."),
	E("currents", "Currents", { "archives" }, "entity", { "currents" },
		"Thực thể trong The Archives."),
	E("office_chair", "Office Chair", { "archives", "stairwell" }, "prop", { "office chair" },
		"Đạo cụ môi trường, không phải thực thể."),

	-- ----------------------------- THE OUTDOORS ------------------------------
	E("mandrake", "Mandrake", { "outdoors" }, "entity", { "mandrake" },
		"Thực thể trong The Outdoors."),
	E("surge", "Surge", { "outdoors" }, "entity", { "surge" },
		"Thực thể trong The Outdoors."),
	E("monument", "Monument", { "outdoors" }, "prop", { "monument" },
		"Công trình tĩnh trong The Outdoors."),
	E("eyestalk", "Eyestalk", { "outdoors" }, "entity", { "eyestalk" },
		"Thực thể trong The Outdoors."),
	E("bramble", "Bramble", { "outdoors" }, "entity", { "bramble" },
		"Thực thể trong The Outdoors."),
	E("the_caw", "The Caw", { "outdoors" }, "entity", { "the caw", "caw" },
		"Thực thể trong The Outdoors."),
	E("grampy", "Grampy", { "outdoors" }, "npc", { "grampy" },
		"NPC trong The Outdoors."),
	E("groundskeeper", "Groundskeeper", { "outdoors" }, "npc", { "groundskeeper" },
		"NPC trong The Outdoors."),
	E("world_lotus", "World Lotus", { "outdoors" }, "prop", { "world lotus" },
		"Thực vật/đạo cụ trong The Outdoors."),
	E("flood", "Flood", { "outdoors" }, "event", { "flood" },
		"Sự kiện nước dâng; có thể chỉ tồn tại dưới dạng mực nước/Terrain."),

	-- ---------------------------- THE STAIRWELL ------------------------------
	E("creak", "Creak", { "stairwell" }, "entity", { "creak" },
		"Thực thể trong The Stairwell."),
	E("noise", "Noise", { "stairwell" }, "event", { "noise" },
		"Tên rất dễ trùng với instance âm thanh thường — kết quả khớp cần kiểm tra kỹ."),
	E("stem", "Stem", { "stairwell" }, "entity", { "stem" },
		"Thực thể trong The Stairwell."),
	E("hijack", "Hijack", { "stairwell" }, "entity", { "hijack" },
		"Thực thể trong The Stairwell."),
	E("meld", "Meld", { "stairwell" }, "entity", { "meld" },
		"Thực thể trong The Stairwell."),
	E("cobbler", "Cobbler", { "stairwell" }, "entity", { "cobbler" },
		"Thực thể trong The Stairwell."),
	E("fire_sprinklers", "Fire Sprinklers", { "stairwell" }, "prop", { "fire sprinkler", "sprinkler" },
		"Đầu phun nước — đạo cụ/mối nguy tĩnh."),
	E("crusher", "Crusher", { "stairwell" }, "prop", { "crusher" },
		"Mối nguy cơ khí trong The Stairwell."),
	E("shopping_cart", "Shopping Cart", { "stairwell" }, "prop", { "shopping cart" },
		"Đạo cụ môi trường."),
	E("television_set", "Television Set", { "stairwell" }, "prop", { "television set", "television" },
		"Đạo cụ môi trường."),

	-- ------------------------------ THE ROOMS --------------------------------
	E("a60", "A-60", { "rooms" }, "entity", { "a-60", "a 60" },
		"Thực thể trong The Rooms. Tên instance có thể kèm hậu tố phòng.",
		{ matchMode = "contains" }),
	E("a90", "A-90", { "rooms" }, "entity", { "a-90", "a 90" },
		"Thực thể trong The Rooms. Tên instance có thể kèm hậu tố phòng.",
		{ matchMode = "contains" }),
	E("a120", "A-120", { "rooms" }, "entity", { "a-120", "a 120" },
		"Thực thể trong The Rooms. Tên instance có thể kèm hậu tố phòng.",
		{ matchMode = "contains" }),

	-- ------------------- CHẾ ĐỘ ĐẶC BIỆT VÀ SỰ KIỆN -------------------------
	E("jeff_the_killer", "Jeff The Killer", { "events" }, "event", { "jeff the killer" },
		"Biến thể của Jeff trong sự kiện. Chỉ dò mẫu tên riêng \"jeff the killer\"; aliasOf chỉ là chú thích.",
		{ aliasOf = "jeff" }),
	E("greed", "Greed", { "events" }, "event", { "greed" },
		"Sự kiện/nhân vật theo mùa."),
	E("evil_key", "Evil Key", { "events" }, "event", { "evil key" },
		"Vật phẩm sự kiện; có thể chỉ là Tool trong balô người chơi."),
	E("drakobloxxers", "DRAKOBLOXXERS", { "events" }, "event", { "drakobloxxer", "drakobloxxers" },
		"Mini-game/sự kiện; số lượng instance có thể rất nhiều."),
	E("seeking_wall", "SEEKING WALL!!!", { "events" }, "event", { "seeking wall" },
		"Sự kiện tường Seek; đối tượng có thể là một Part lớn chứ không phải Model."),
	E("lava", "LAVA!", { "events" }, "event", { "lava" },
		"Sự kiện dung nham; có thể chỉ là Part/Terrain dâng lên."),
	E("cringle", "Cringle", { "events" }, "event", { "cringle" },
		"Nhân vật sự kiện mùa đông."),
	E("treater", "Treater", { "events" }, "event", { "treater" },
		"Nhân vật sự kiện Halloween."),
	E("rushing_light", "Rushing Light", { "events" }, "event", { "rushing light" },
		"Sự kiện ánh sáng lao đi."),
	E("rniushcg", "RNIUSHCg==", { "events" }, "event", { "rniushcg" },
		"Tên Rush bị làm nhiễu trong sự kiện. Chỉ dò mẫu tên riêng \"rniushcg\"; aliasOf chỉ là chú thích.",
		{ aliasOf = "rush" }),
	E("aroxmbush", "AROxMBUSH", { "events" }, "event", { "aroxmbush" },
		"Tên Ambush bị làm nhiễu. Chỉ dò mẫu tên riêng \"aroxmbush\"; aliasOf chỉ là chú thích.",
		{ aliasOf = "ambush" }),
	E("scjvereech", "SCJVEREECH", { "events" }, "event", { "scjvereech" },
		"Tên Screech bị làm nhiễu. Chỉ dò mẫu tên riêng \"scjvereech\"; aliasOf chỉ là chú thích.",
		{ aliasOf = "screech" }),
}

--=========================== CHUẨN HOÁ TÊN ===========================
--[[
	Chuẩn hoá một cái tên thành khoá tra cứu: chữ thường, chỉ giữ a-z0-9.
	Ví dụ: "A-60 (Room 3)" -> "a60room3"; "El Goblino" -> "elgoblino".
	Cả Scanner và ô tìm kiếm đều dùng HÀM NÀY để hai bên không lệch nhau.
]]
function Catalog.NormalizeKey(text)
	if type(text) ~= "string" then
		return ""
	end
	local lowered = string.lower(text)
	local cleaned = string.gsub(lowered, "[^a-z0-9]", "")
	return cleaned
end

--=========================== DỰNG CHỈ MỤC ============================
Catalog.List = {}
Catalog.ById = {}
Catalog.ByArea = {}

for _, entry in ipairs(ROWS) do
	if Catalog.ById[entry.id] ~= nil then
		error(("EntityCatalog: trùng id '%s'"):format(entry.id), 2)
	end
	Catalog.List[#Catalog.List + 1] = entry
	Catalog.ById[entry.id] = entry
	for _, areaId in ipairs(entry.areas) do
		if Catalog.ByArea[areaId] == nil then
			Catalog.ByArea[areaId] = {}
		end
		local bucket = Catalog.ByArea[areaId]
		bucket[#bucket + 1] = entry
	end
end

-- Sắp theo tên để danh sách UI ổn định giữa các lần chạy (dễ kiểm thử).
table.sort(Catalog.List, function(a, b)
	if a.name == b.name then
		return a.id < b.id
	end
	return string.lower(a.name) < string.lower(b.name)
end)
for _, bucket in pairs(Catalog.ByArea) do
	table.sort(bucket, function(a, b)
		if a.name == b.name then
			return a.id < b.id
		end
		return string.lower(a.name) < string.lower(b.name)
	end)
end

function Catalog.Count()
	return #Catalog.List
end

function Catalog.Get(entityId)
	if type(entityId) ~= "string" then
		return nil
	end
	return Catalog.ById[entityId]
end

-- Danh sách mục của một khu vực (bản sao nông: không cho sửa bảng gốc).
function Catalog.GetByArea(areaId)
	local bucket = Catalog.ByArea[areaId]
	if bucket == nil then
		return {}
	end
	local copy = {}
	for index, entry in ipairs(bucket) do
		copy[index] = entry
	end
	return copy
end

-- Số mục của từng khu vực — dùng cho kiểm thử đối chiếu danh sách yêu cầu.
function Catalog.GetAreaCounts()
	local counts = {}
	for areaId, bucket in pairs(Catalog.ByArea) do
		counts[areaId] = #bucket
	end
	return counts
end

-- Tổng số cặp (mục, khu vực) — dùng để phát hiện thiếu/sót khi sửa dữ liệu.
function Catalog.CountMemberships()
	local total = 0
	for _, entry in ipairs(Catalog.List) do
		total = total + #entry.areas
	end
	return total
end

--[[
	Danh sách mẫu tên đã chuẩn hoá của MỘT mục.

	CHỐT TRUNG THỰC: `aliasOf` KHÔNG được dùng để mượn mẫu tên. Nếu một
	instance tên "Rush" mà ta kết luận luôn cả RNIUSHCg== "Đã phát hiện"
	thì đó là báo sai (false positive) — người dùng sẽ tin có hai thực thể
	trong khi chỉ có một. Vì vậy:
	  * mỗi mục chỉ khớp theo mẫu tên RIÊNG của nó;
	  * `aliasOf` chỉ là CHÚ THÍCH hiển thị ("biến thể của ..."), xem
	    Catalog.GetAliasName;
	  * muốn một mục dùng chung luật với mục khác thì PHẢI khai báo mẫu tên
	    đó trong `patterns` của chính nó (kèm bằng chứng).
]]
function Catalog.GetMatchKeys(entry)
	if entry == nil then
		return {}
	end
	local keys = {}
	for _, pattern in ipairs(entry.detect.patterns) do
		local key = Catalog.NormalizeKey(pattern)
		if #key > 0 then
			keys[#keys + 1] = key
		end
	end
	return keys
end

-- Tên hiển thị của mục mà mục này là biến thể (nil nếu không phải biến thể).
function Catalog.GetAliasName(entry)
	if entry == nil or entry.detect.aliasOf == nil then
		return nil
	end
	local target = Catalog.ById[entry.detect.aliasOf]
	if target == nil then
		return tostring(entry.detect.aliasOf)
	end
	return target.name
end

--[[
	TÌM KIẾM. Trả về danh sách mục thoả cả hai điều kiện:
	  * khớp `query` (rỗng = bỏ qua) theo tên hiển thị, id, hoặc mẫu tên;
	  * thuộc `areaId` (nil = mọi khu vực).
	Không sắp xếp lại: thứ tự đã ổn định từ Catalog.List.
]]
function Catalog.Search(query, areaId)
	local needle = Catalog.NormalizeKey(query)
	local results = {}
	for _, entry in ipairs(Catalog.List) do
		local passesArea = true
		-- "all" là giá trị mặc định của bộ lọc khu vực trong UI; nó có nghĩa
		-- "không lọc". Nếu không xử lý ở đây thì mở radar lên sẽ thấy DANH
		-- SÁCH RỖNG dù có 82 mục (lỗi thật, đã được test RAD-010 bắt).
		if areaId ~= nil and areaId ~= "" and areaId ~= "all" then
			passesArea = false
			for _, entryArea in ipairs(entry.areas) do
				if entryArea == areaId then
					passesArea = true
					break
				end
			end
		end
		if passesArea then
			if needle == "" then
				results[#results + 1] = entry
			else
				local haystack = Catalog.NormalizeKey(entry.name)
					.. "|" .. Catalog.NormalizeKey(entry.id)
				for _, pattern in ipairs(entry.detect.patterns) do
					haystack = haystack .. "|" .. Catalog.NormalizeKey(pattern)
				end
				if string.find(haystack, needle, 1, true) ~= nil then
					results[#results + 1] = entry
				end
			end
		end
	end
	return results
end

--[[
	TỰ KIỂM TRA DỮ LIỆU. Trả về (ok, problems).
	Được gọi khi khởi động (Client/Core/SelfCheck) và trong test: dữ liệu
	hỏng thì hệ thống phải BÁO, không được chạy với danh mục sai.
]]
function Catalog.Validate()
	local problems = {}

	local ids = {}
	for _, entry in ipairs(Catalog.List) do
		if ids[entry.id] then
			problems[#problems + 1] = "trùng id: " .. tostring(entry.id)
		end
		ids[entry.id] = true

		if #entry.areas == 0 then
			problems[#problems + 1] = entry.id .. ": không thuộc khu vực nào"
		end
		for _, areaId in ipairs(entry.areas) do
			if not Shared_Areas.IsValid(areaId) then
				problems[#problems + 1] = entry.id .. ": khu vực lạ '" .. tostring(areaId) .. "'"
			end
		end

		if Catalog.KindLabel[entry.kind] == nil then
			problems[#problems + 1] = entry.id .. ": kind lạ '" .. tostring(entry.kind) .. "'"
		end

		local detect = entry.detect
		if detect.method == "scan" and #Catalog.GetMatchKeys(entry) == 0 then
			problems[#problems + 1] = entry.id .. ": method scan nhưng không có mẫu tên nào dùng được"
		end
		if detect.method == "unsupported" and (detect.reason == nil or detect.reason == "") then
			problems[#problems + 1] = entry.id .. ": unsupported phải có lý do"
		end
		if detect.aliasOf ~= nil and Catalog.ById[detect.aliasOf] == nil then
			problems[#problems + 1] = entry.id .. ": aliasOf trỏ tới mục không tồn tại"
		end
	end

	-- alias không được tạo chu trình
	for _, entry in ipairs(Catalog.List) do
		local seen = {}
		local cursor = entry
		local hops = 0
		while cursor ~= nil and cursor.detect.aliasOf ~= nil and hops < 16 do
			if seen[cursor.id] then
				problems[#problems + 1] = entry.id .. ": aliasOf tạo chu trình"
				break
			end
			seen[cursor.id] = true
			cursor = Catalog.ById[cursor.detect.aliasOf]
			hops = hops + 1
		end
	end

	return #problems == 0, problems
end

return Catalog
]=],
	["Shared/Geometry"] = [=[
--[[
	doors-entity-radar/src/Shared/Geometry.luau
	ModuleScript — đặt tại: ReplicatedStorage.DoorsEntityRadar.Shared.Geometry

	TOÁN ĐỊNH VỊ. Tệp này thuần tuý tính toán và đọc vị trí — không tạo
	instance, không nối signal, không đụng trò chơi. Tách ra để kiểm thử
	được bằng máy (mọi hàm đều có test riêng trong tests/suites/geometry).

	HAI CHỐT TRUNG THỰC nằm ở đây:
	  * Geometry.IsPositionVector: từ chối toạ độ NaN/vô hạn/thiếu thành phần.
	  * Geometry.ReadPosition: chỉ trả vị trí khi THẬT SỰ đọc được từ instance;
	    mọi nhánh thất bại đều trả kèm LÝ DO để UI in ra thay vì im lặng.
]]

local Geometry = {}

-- Toạ độ lớn hơn ngưỡng này gần như chắc chắn là rác (Roblox giới hạn
-- không gian làm việc quanh 2^17 stud). Dùng để loại giá trị vô nghĩa.
Geometry.MAX_REASONABLE_STUDS = 1000000

-- 8 hướng la bàn, chia theo dải góc |góc| so với hướng nhìn.
-- Mỗi dải hoặc có một nhãn chung (trước/sau) hoặc một cặp phải/trái.
Geometry.DIRECTION_BANDS = {
	{ limit = 22.5, label = "phía trước" },
	{ limit = 67.5, labelRight = "trước phải", labelLeft = "trước trái" },
	{ limit = 112.5, labelRight = "bên phải", labelLeft = "bên trái" },
	{ limit = 157.5, labelRight = "sau phải", labelLeft = "sau trái" },
	{ limit = 180.1, label = "phía sau" },
}

-- Số có phải số hữu hạn không (loại cả NaN lẫn inf).
function Geometry.IsFiniteNumber(value)
	if type(value) ~= "number" then
		return false
	end
	if value ~= value then
		return false -- NaN
	end
	return value < math.huge and value > -math.huge
end

--[[
	Kiểm tra một giá trị có dùng được như Vector3 không.
	Cố tình KHÔNG dùng typeof(): hàm này phải chạy được cả trong máy ảo
	kiểm thử, và duck-typing đủ chặt cho mục đích đọc toạ độ.
]]
function Geometry.IsPositionVector(value)
	if type(value) ~= "table" and type(value) ~= "userdata" then
		return false
	end
	local okRead, x, y, z = pcall(function()
		return value.X, value.Y, value.Z
	end)
	if not okRead then
		return false
	end
	if not Geometry.IsFiniteNumber(x) then
		return false
	end
	if not Geometry.IsFiniteNumber(y) then
		return false
	end
	if not Geometry.IsFiniteNumber(z) then
		return false
	end
	local magnitude = math.sqrt(x * x + y * y + z * z)
	if magnitude > Geometry.MAX_REASONABLE_STUDS then
		return false
	end
	return true
end

-- Khoảng cách giữa hai điểm. Trả nil nếu đầu vào không hợp lệ.
function Geometry.Distance(fromPosition, toPosition)
	if not Geometry.IsPositionVector(fromPosition) then
		return nil
	end
	if not Geometry.IsPositionVector(toPosition) then
		return nil
	end
	local dx = toPosition.X - fromPosition.X
	local dy = toPosition.Y - fromPosition.Y
	local dz = toPosition.Z - fromPosition.Z
	local distance = math.sqrt(dx * dx + dy * dy + dz * dz)
	if not Geometry.IsFiniteNumber(distance) then
		return nil
	end
	return distance
end

--[[
	ĐỌC VỊ TRÍ THẬT của một instance.
	Trả về (position, reason). position = nil nghĩa là KHÔNG CÓ vị trí,
	và `reason` luôn giải thích vì sao — không bao giờ trả vị trí bịa.

	Thứ tự thử (đều là API Roblox hợp lệ):
	  1. instance.Position             — BasePart
	  2. instance.CFrame.Position     — BasePart/PVInstance không phơi Position
	  3. instance:GetPivot().Position — Model (API hiện đại)
	  4. instance.PrimaryPart.Position— Model kiểu cũ
	  5. part con trực tiếp đầu tiên  — Folder/Accessory; reason nói rõ nguồn
]]
function Geometry.ReadPosition(instance)
	if instance == nil then
		return nil, "Không có instance để đọc vị trí."
	end

	-- Instance đã Destroy sẽ ném lỗi khi truy cập bất cứ thứ gì.
	local okParent, parent = pcall(function()
		return instance.Parent
	end)
	if not okParent then
		return nil, "Instance không còn hợp lệ (đã bị Destroy)."
	end
	if parent == nil then
		return nil, "Instance không còn nằm trong cây (Parent = nil)."
	end

	-- 1) BasePart
	local okDirect, direct = pcall(function()
		return instance.Position
	end)
	if okDirect and Geometry.IsPositionVector(direct) then
		return direct, "Đọc từ BasePart.Position."
	end

	-- 2) CFrame.Position (BasePart luôn có CFrame; một số class không có Position)
	local okCFrame, cframeValue = pcall(function()
		return instance.CFrame
	end)
	if okCFrame and cframeValue ~= nil then
		local okCFramePos, cframePos = pcall(function()
			return cframeValue.Position
		end)
		if okCFramePos and Geometry.IsPositionVector(cframePos) then
			return cframePos, "Đọc từ CFrame.Position."
		end
	end

	-- 3) GetPivot
	local okMethod, pivotMethod = pcall(function()
		return instance.GetPivot
	end)
	if okMethod and type(pivotMethod) == "function" then
		local okPivot, pivot = pcall(function()
			return instance:GetPivot()
		end)
		if okPivot and pivot ~= nil then
			local okPivotPos, pivotPos = pcall(function()
				return pivot.Position
			end)
			if okPivotPos and Geometry.IsPositionVector(pivotPos) then
				return pivotPos, "Đọc từ Model:GetPivot()."
			end
		end
	end

	-- 3) PrimaryPart
	local okPrimary, primary = pcall(function()
		return instance.PrimaryPart
	end)
	if okPrimary and primary ~= nil then
		local okPrimaryPos, primaryPos = pcall(function()
			return primary.Position
		end)
		if okPrimaryPos and Geometry.IsPositionVector(primaryPos) then
			return primaryPos, "Đọc từ Model.PrimaryPart."
		end
	end

	-- 5) Con trực tiếp đầu tiên có vị trí — chỉ xét MỘT cấp để không quét sâu.
	-- Gọi đệ quy chính ReadPosition (không đọc thẳng .Position) để part con
	-- chỉ phơi CFrame vẫn được xử lý đúng.
	local okChildren, children = pcall(function()
		return instance:GetChildren()
	end)
	if okChildren and type(children) == "table" then
		for _, child in ipairs(children) do
			local childPosition = Geometry.ReadPosition(child)
			if childPosition ~= nil then
				local childName = "?"
				pcall(function()
					childName = child.Name
				end)
				return childPosition, ("Đọc từ part con '%s' (instance gốc không có vị trí riêng).")
					:format(tostring(childName))
			end
		end
	end

	return nil, "Không đọc được vị trí hợp lệ từ instance này (không có Position, GetPivot hay PrimaryPart)."
end

--[[
	HƯỚNG TƯƠNG ĐỐI so với camera của người chơi.
	Trả về (label, angleDegrees) hoặc (nil, nil) nếu thiếu dữ liệu.

	  lookVector  — Camera.CFrame.LookVector (hướng nhìn)
	  rightVector — Camera.CFrame.RightVector; nếu nil sẽ tự suy ra
	                từ lookVector theo đúng quy ước trục của Roblox
	  fromPosition— vị trí người chơi
	  toPosition  — vị trí thực thể

	góc = 0  -> thẳng phía trước, dương -> lệch phải, âm -> lệch trái.
	Chỉ chiếu lên mặt phẳng ngang: người chơi không cần biết lệch bao
	nhiêu độ theo trục dọc khi tìm thực thể trong hành lang.
]]
function Geometry.RelativeDirection(lookVector, rightVector, fromPosition, toPosition)
	if not Geometry.IsPositionVector(lookVector) then
		return nil, nil
	end
	if not Geometry.IsPositionVector(fromPosition) then
		return nil, nil
	end
	if not Geometry.IsPositionVector(toPosition) then
		return nil, nil
	end

	local deltaX = toPosition.X - fromPosition.X
	local deltaZ = toPosition.Z - fromPosition.Z
	local deltaLength = math.sqrt(deltaX * deltaX + deltaZ * deltaZ)
	if deltaLength < 0.05 then
		-- Quá gần để nói về hướng; nói "ngay tại vị trí" sẽ trung thực hơn.
		return "ngay cạnh", 0
	end

	local lookX = lookVector.X
	local lookZ = lookVector.Z
	local lookLength = math.sqrt(lookX * lookX + lookZ * lookZ)
	if lookLength < 0.001 then
		-- Camera nhìn thẳng đứng: phép chiếu ngang vô nghĩa.
		return nil, nil
	end
	lookX = lookX / lookLength
	lookZ = lookZ / lookLength

	local rightX, rightZ
	if Geometry.IsPositionVector(rightVector) then
		rightX = rightVector.X
		rightZ = rightVector.Z
	else
		-- Suy ra trục phải từ trục nhìn: right = look × up.
		-- Với look = (0,0,-1) cho right = (1,0,0), đúng quy ước Roblox.
		rightX = -lookZ
		rightZ = lookX
	end
	local rightLength = math.sqrt(rightX * rightX + rightZ * rightZ)
	if rightLength < 0.001 then
		return nil, nil
	end
	rightX = rightX / rightLength
	rightZ = rightZ / rightLength

	local unitX = deltaX / deltaLength
	local unitZ = deltaZ / deltaLength
	local forward = unitX * lookX + unitZ * lookZ
	local side = unitX * rightX + unitZ * rightZ

	-- math.atan(y, x) có trong cả Luau lẫn Lua 5.3 (không dùng math.atan2).
	local angle = math.deg(math.atan(side, forward))

	local absolute = math.abs(angle)
	for _, band in ipairs(Geometry.DIRECTION_BANDS) do
		if absolute <= band.limit then
			if band.label ~= nil then
				return band.label, angle
			end
			if angle >= 0 then
				return band.labelRight, angle
			end
			return band.labelLeft, angle
		end
	end

	-- Không tới được đây (dải cuối phủ tới 180.1 độ), nhưng không trả nil im lặng.
	return "phía sau", angle
end

-- Định dạng khoảng cách cho UI. Không làm tròn thành số nguyên:
-- 0.4 stud và 1.2 stud khác nhau khi đứng nép sau cánh cửa.
function Geometry.FormatDistance(studs)
	if not Geometry.IsFiniteNumber(studs) then
		return nil
	end
	return ("%.1f stud"):format(studs)
end

-- Tuổi dữ liệu theo giây, làm tròn 1 chữ số. Trả nil nếu đầu vào sai.
function Geometry.FormatAge(seconds)
	if not Geometry.IsFiniteNumber(seconds) then
		return nil
	end
	if seconds < 0 then
		return nil
	end
	if seconds < 10 then
		return ("%.1fs trước"):format(seconds)
	end
	return ("%ds trước"):format(math.floor(seconds + 0.5))
end

return Geometry
]=],
	["Shared/Log"] = [=[
--[[
	doors-entity-radar/src/Shared/Log.luau
	ModuleScript — đặt tại: ReplicatedStorage.DoorsEntityRadar.Shared.Log

	GHI LOG CÓ CẤP ĐỘ. Toàn bộ thông điệp của dự án đi qua tệp này để
	Output của Roblox Studio nhất quán và lọc được bằng tiền tố "[DER]".

	Cấp độ:
	  error > warn > info > debug
	Config.Log.level quyết định mức thấp nhất được in. Mặc định "info":
	đủ để đọc lỗi khi kiểm thử, không làm trôi Output khi chơi.

	Tệp này KHÔNG đọc service nào, KHÔNG tạo instance, KHÔNG đổi trò chơi.
]]

local Log = {}

local LEVEL_ORDER = { error = 1, warn = 2, info = 3, debug = 4 }

-- Mức đang bật. Đổi bằng Log.SetLevel("debug") khi cần soi chi tiết.
Log.level = "info"

-- Đếm số dòng đã in theo từng cấp — dùng cho kiểm thử và cho bảng chẩn đoán.
Log.counts = { error = 0, warn = 0, info = 0, debug = 0 }

-- Tiền tố cố định. Giữ nguyên để người dùng gõ "[DER]" vào bộ lọc Output.
Log.PREFIX = "[DER]"

--[[
	VÒNG LƯU TRỮ DÒNG LOG (cho tab "Nhật ký" trên giao diện).
	Chỉ giữ `Log.historySize` dòng CUỐI CÙNG: bộ nhớ không phình ra dù chơi
	cả buổi, và không có vòng lặp nào phải duyệt toàn bộ lịch sử.
	Chỉ ghi những dòng ĐƯỢC IN (qua ShouldPrint) — tab Nhật ký vì vậy luôn
	khớp với những gì người dùng thấy trong Output, không có dòng "ma".
]]
Log.historySize = 60
Log.history = {}

--[[
	Đặt mức log. Trả về mức thực tế đang áp dụng.
	Giá trị lạ bị từ chối và giữ mức cũ (không im lặng chấp nhận).
]]
function Log.SetLevel(level)
	if type(level) ~= "string" or LEVEL_ORDER[level] == nil then
		warn(("[DER] Log.SetLevel bỏ qua mức không hợp lệ: %s"):format(tostring(level)))
		return Log.level
	end
	Log.level = level
	return Log.level
end

-- Trả về true nếu cấp `level` được phép in ở mức hiện tại.
function Log.ShouldPrint(level)
	local threshold = LEVEL_ORDER[Log.level] or LEVEL_ORDER.info
	local current = LEVEL_ORDER[level]
	if current == nil then
		return false
	end
	return current <= threshold
end

-- Nối các tham số thành một chuỗi, bỏ qua nil.
local function join(...)
	local parts = {}
	local count = select("#", ...)
	for index = 1, count do
		local value = select(index, ...)
		parts[#parts + 1] = tostring(value)
	end
	return table.concat(parts, " ")
end

-- Thêm một dòng vào vòng lưu trữ, cắt bớt phần thừa.
local function pushHistory(level, text)
	local entry = { level = level, text = text, at = os.clock() }
	local history = Log.history
	history[#history + 1] = entry
	local limit = Log.historySize
	if type(limit) ~= "number" or limit < 1 then
		limit = 60
	end
	while #history > limit do
		table.remove(history, 1)
	end
	return entry
end

-- In một dòng theo cấp độ. Trả về true nếu đã in.
function Log.Write(level, ...)
	if not Log.ShouldPrint(level) then
		return false
	end
	Log.counts[level] = (Log.counts[level] or 0) + 1
	local text = ("%s [%s] %s"):format(Log.PREFIX, string.upper(level), join(...))
	pushHistory(level, text)
	if level == "error" then
		-- `warn` thay vì `error`: hệ thống hỗ trợ không được làm sập trò chơi.
		warn(text)
	elseif level == "warn" then
		warn(text)
	else
		print(text)
	end
	return true
end

function Log.Error(...)
	return Log.Write("error", ...)
end

function Log.Warn(...)
	return Log.Write("warn", ...)
end

function Log.Info(...)
	return Log.Write("info", ...)
end

function Log.Debug(...)
	return Log.Write("debug", ...)
end

--[[
	Bọc một lời gọi trong pcall và ghi lỗi có ngữ cảnh.
	Trả về (ok, result) — ĐÚNG thứ tự của pcall, đừng đảo.
	Dùng cho mọi chỗ chạm vào API có thể vắng mặt (service, instance đã huỷ).
]]
function Log.Try(context, fn, ...)
	local ok, result = pcall(fn, ...)
	if not ok then
		Log.Error(("lỗi trong %s: %s"):format(tostring(context), tostring(result)))
	end
	return ok, result
end

-- Đặt lại bộ đếm (chỉ dùng trong kiểm thử).
function Log.ResetCounts()
	Log.counts = { error = 0, warn = 0, info = 0, debug = 0 }
end

--[[
	Đọc các dòng log gần nhất (bản SAO, để UI không giữ tham chiếu vào vòng
	lưu trữ đang chạy). `limit` tuỳ chọn; mặc định trả toàn bộ vòng.
]]
function Log.History(limit)
	local history = Log.history
	local count = #history
	local wanted = count
	if type(limit) == "number" and limit >= 0 and limit < count then
		wanted = limit
	end
	local copy = {}
	for index = count - wanted + 1, count do
		local entry = history[index]
		copy[#copy + 1] = { level = entry.level, text = entry.text, at = entry.at }
	end
	return copy
end

-- Xoá nhật ký trên giao diện (KHÔNG xoá log đã in ra Output).
function Log.ClearHistory()
	local removed = #Log.history
	Log.history = {}
	return removed
end

-- Đổi cỡ vòng lưu trữ. Giá trị sai thì giữ nguyên và trả về cỡ hiện tại.
function Log.SetHistorySize(size)
	if type(size) ~= "number" or size ~= size or size < 1 then
		warn(("[DER] Log.SetHistorySize bỏ qua giá trị không hợp lệ: %s"):format(tostring(size)))
		return Log.historySize
	end
	Log.historySize = math.floor(size)
	while #Log.history > Log.historySize do
		table.remove(Log.history, 1)
	end
	return Log.historySize
end

return Log
]=],
	["Shared/RequireShim"] = [=[
--[[
	doors-entity-radar/src/Shared/RequireShim.luau
	ModuleScript — đặt tại: ReplicatedStorage.DoorsEntityRadar.Shared.RequireShim

	BỘ NẠP MODULE THỐNG NHẤT. Dự án phải chạy được ở hai kiểu nạp:
	  (1) Rojo / Studio: mỗi tệp là một ModuleScript trong cây instance,
	      nạp bằng require() thật của Roblox;
	  (2) Một tệp duy nhất (dist/): mọi module nằm trong một bảng, không có
	      cây instance — nạp từ bảng đó.

	Cả hai nhánh đều là cơ chế CÓ THẬT của Roblox. Không loadstring, không
	executor, không fetch mã từ mạng.

	Cách dùng: LocalScript khởi động gọi RequireShim.Install{ game = game }
	TRƯỚC khi require bất kỳ module nào khác. Sau đó mọi tệp dùng
	__DER_REQUIRE("Shared/Status") thay vì require(script.Parent...).
]]

local RequireShim = {}

RequireShim.globalName = "__DER_REQUIRE"

-- Các nhánh con được coi là gốc dự án khi tìm trong service.
RequireShim.rootNames = { "Shared", "Client", "Server" }
RequireShim.projectFolderName = "DoorsEntityRadar"

-- Duyệt "Client/Core/Scanner" thành instance con từ một gốc.
local function resolveFrom(root, modulePath)
	if root == nil then
		return nil
	end
	local node = root
	for segment in string.gmatch(modulePath, "[^/]+") do
		if node == nil then
			return nil
		end
		node = node:FindFirstChild(segment)
	end
	return node
end

-- Tìm gốc dự án: instance cha có chứa thư mục "Shared".
local function findProjectRoot(gameRef)
	if gameRef == nil then
		return nil
	end
	local okStarter, starterPlayer = pcall(function()
		return gameRef:GetService("StarterPlayer")
	end)
	local candidates = {}

	local okRs, replicatedStorage = pcall(function()
		return gameRef:GetService("ReplicatedStorage")
	end)
	if okRs then
		candidates[#candidates + 1] = replicatedStorage
	end
	if okStarter and starterPlayer ~= nil then
		candidates[#candidates + 1] = starterPlayer:FindFirstChild("StarterPlayerScripts")
	end
	local okSss, serverScriptService = pcall(function()
		return gameRef:GetService("ServerScriptService")
	end)
	if okSss then
		candidates[#candidates + 1] = serverScriptService
	end

	for _, service in ipairs(candidates) do
		if service ~= nil then
			-- (a) thư mục dự án đặt tên rõ ràng
			local named = service:FindFirstChild(RequireShim.projectFolderName)
			if named ~= nil then
				return named
			end
			-- (b) cây phẳng: service chứa trực tiếp Shared/Client/Server
			for _, rootName in ipairs(RequireShim.rootNames) do
				local child = service:FindFirstChild(rootName)
				if child ~= nil and child.Parent ~= nil
					and child.Parent:FindFirstChild("Shared") ~= nil then
					return child.Parent
				end
			end
		end
	end
	return nil
end

--[[
	Cài __DER_REQUIRE vào _G. Gọi MỘT lần.
	options:
	  game   — DataModel (mặc định: game)
	  bundle — bảng { ["Shared/Status"] = <chuỗi mã nguồn hoặc bảng module> }
	  force  — cài lại dù đã có (chỉ dùng trong kiểm thử)
]]
function RequireShim.Install(options)
	options = options or {}
	local globalEnv = _G

	if globalEnv[RequireShim.globalName] ~= nil and options.force ~= true then
		return globalEnv[RequireShim.globalName]
	end

	if options.bundle ~= nil then
		globalEnv.__DER_BUNDLE = options.bundle
	end

	local cache = {}
	local gameRef = options.game or game
	local rootResolved = false

	local function resolver(modulePath)
		if type(modulePath) ~= "string" then
			error(("__DER_REQUIRE cần chuỗi đường dẫn, nhận %s"):format(type(modulePath)), 2)
		end
		if cache[modulePath] ~= nil then
			return cache[modulePath]
		end

		-- (a) bundle một tệp
		local bundle = globalEnv.__DER_BUNDLE
		if type(bundle) == "table" and bundle[modulePath] ~= nil then
			local entry = bundle[modulePath]
			local result
			if type(entry) == "string" then
				local chunk, compileError = load(entry, "DER:" .. modulePath)
				if chunk == nil then
					error(("lỗi biên dịch module '%s': %s"):format(modulePath, tostring(compileError)), 2)
				end
				result = chunk()
			else
				result = entry
			end
			if type(result) ~= "table" then
				error(("module '%s' phải return một bảng, nhận %s"):format(modulePath, type(result)), 2)
			end
			cache[modulePath] = result
			return result
		end

		-- (b) require() thật theo đường dẫn tuyệt đối trong cây instance
		if not rootResolved then
			globalEnv.__DER_ROOT = findProjectRoot(gameRef) or false
			rootResolved = true
		end
		local root = globalEnv.__DER_ROOT
		local target = resolveFrom(root, modulePath)
		if target ~= nil then
			local ok, result = pcall(require, target)
			if not ok then
				error(("require('%s') thất bại: %s"):format(modulePath, tostring(result)), 2)
			end
			cache[modulePath] = result
			return result
		end

		error(("không tìm thấy module '%s' (gốc=%s). Kiểm tra lại cây thư mục trong Studio.")
			:format(modulePath, tostring(root)), 2)
	end

	globalEnv[RequireShim.globalName] = resolver
	return resolver
end

-- Gỡ shim (chỉ dùng trong kiểm thử).
function RequireShim.Reset()
	_G[RequireShim.globalName] = nil
	_G.__DER_BUNDLE = nil
	_G.__DER_ROOT = nil
end

return RequireShim
]=],
	["Shared/Safe"] = [=[
--[[
	doors-entity-radar/src/Shared/Safe.luau
	ModuleScript — đặt tại: ReplicatedStorage.DoorsEntityRadar.Shared.Safe

	ĐỆM AN TOÀN khi chạm API Roblox. Hệ thống này chạy cạnh trò chơi của
	người khác nên MỌI truy cập có thể ném lỗi đều phải đi qua đây:
	  * service có thể không tồn tại trong một số chế độ;
	  * instance có thể bị Destroy giữa lúc ta đang đọc;
	  * property có thể không tồn tại trên class đó.

	QUY TẮC BẤT DI BẤT DỊCH: tệp này chỉ ĐỌC thế giới. Hàm duy nhất được
	ghi là SetParent/Destroy và chỉ dùng cho instance do CHÍNH dự án tạo.
]]

local Safe = {}

--[[
	Lấy service, không ném lỗi. Trả về (service, errorMessage).
	Ví dụ: local uis, err = Safe.GetService("UserInputService")
]]
function Safe.GetService(name)
	if type(name) ~= "string" then
		return nil, "Tên service phải là chuỗi"
	end
	local ok, service = pcall(function()
		return game:GetService(name)
	end)
	if not ok then
		return nil, tostring(service)
	end
	if service == nil then
		return nil, ("game:GetService('%s') trả về nil"):format(name)
	end
	return service, nil
end

-- Instance còn sống không (chưa Destroy, còn Parent).
function Safe.IsAlive(instance)
	if instance == nil then
		return false
	end
	local ok, parent = pcall(function()
		return instance.Parent
	end)
	if not ok then
		return false
	end
	return parent ~= nil
end

-- Đọc Name an toàn; trả nil nếu không đọc được.
function Safe.GetName(instance)
	if instance == nil then
		return nil
	end
	local ok, name = pcall(function()
		return instance.Name
	end)
	if not ok or type(name) ~= "string" then
		return nil
	end
	return name
end

-- Đọc ClassName an toàn.
function Safe.GetClassName(instance)
	if instance == nil then
		return nil
	end
	local ok, className = pcall(function()
		return instance.ClassName
	end)
	if not ok or type(className) ~= "string" then
		return nil
	end
	return className
end

--[[
	Kiểm tra class. Nhận nhiều tên để bù cho việc IsA trong một số môi
	trường kiểm thử chỉ so khớp chính xác ClassName.
	  Safe.IsClass(part, "Part", "MeshPart", "BasePart")
]]
function Safe.IsClass(instance, ...)
	if instance == nil then
		return false
	end
	local className = Safe.GetClassName(instance)
	if className == nil then
		return false
	end
	local count = select("#", ...)
	for index = 1, count do
		local wanted = select(index, ...)
		if className == wanted then
			return true
		end
		local ok, matched = pcall(function()
			return instance:IsA(wanted)
		end)
		if ok and matched == true then
			return true
		end
	end
	return false
end

-- Đọc một property bất kỳ, không ném lỗi. Trả về (value, ok).
function Safe.Read(instance, propertyName)
	if instance == nil or type(propertyName) ~= "string" then
		return nil, false
	end
	local ok, value = pcall(function()
		return instance[propertyName]
	end)
	if not ok then
		return nil, false
	end
	return value, true
end

--[[
	Ghi một property. CHỈ dùng cho instance do dự án tạo (UI).
	Trả về true nếu ghi được. Không bao giờ ném lỗi ra ngoài.
]]
function Safe.Write(instance, propertyName, value)
	if instance == nil or type(propertyName) ~= "string" then
		return false
	end
	local ok = pcall(function()
		instance[propertyName] = value
	end)
	return ok == true
end

--[[
	Nối signal một cách phòng vệ. Nhiều service không tồn tại trong mọi
	môi trường (ví dụ UserInputService ở một số chế độ Studio), và signal
	có thể là nil — khi đó trả về nil kèm thông báo, hệ thống vẫn chạy.
]]
function Safe.Connect(signal, handler, context)
	if signal == nil then
		return nil, ("Không có signal để nối (%s)"):format(tostring(context))
	end
	local connectMethod = nil
	local okGet = pcall(function()
		connectMethod = signal.Connect
	end)
	if not okGet or type(connectMethod) ~= "function" then
		return nil, ("Signal không có :Connect (%s)"):format(tostring(context))
	end
	local ok, connection = pcall(function()
		return signal:Connect(handler)
	end)
	if not ok then
		return nil, ("Nối signal thất bại (%s): %s"):format(tostring(context), tostring(connection))
	end
	return connection, nil
end

-- Ngắt connection an toàn, chấp nhận nil và connection đã ngắt.
function Safe.Disconnect(connection)
	if connection == nil then
		return false
	end
	local ok = pcall(function()
		connection:Disconnect()
	end)
	return ok == true
end

-- Huỷ instance do dự án tạo. Trả về true nếu đã huỷ (hoặc vốn đã nil).
function Safe.Destroy(instance)
	if instance == nil then
		return true
	end
	local ok = pcall(function()
		instance:Destroy()
	end)
	return ok == true
end

-- Đếm con trực tiếp an toàn (dùng cho kiểm tra dọn dẹp).
function Safe.CountChildren(instance)
	if instance == nil then
		return 0
	end
	local ok, children = pcall(function()
		return instance:GetChildren()
	end)
	if not ok or type(children) ~= "table" then
		return 0
	end
	return #children
end

return Safe
]=],
	["Shared/Signal"] = [=[
--[[
	doors-entity-radar/src/Shared/Signal.luau
	ModuleScript — đặt tại: ReplicatedStorage.DoorsEntityRadar.Shared.Signal

	TÍN HIỆU THUẦN LUAU, không dùng BindableEvent/BindableFunction.
	Lý do: tín hiệu nội bộ giữa Tracker và UI không cần vượt ranh giới
	script, và BindableEvent bắt buộc tạo instance (thêm rác phải dọn).

	Hợp đồng:
	  local s = Signal.new()
	  local conn = s:Connect(function(a, b) ... end)
	  s:Fire(1, 2)
	  conn:Disconnect()
	  s:DisconnectAll()

	Đảm bảo đã kiểm thử:
	  * handler Disconnect ngay trong callback không làm hỏng lần Fire đó
	    (danh sách handler được sao chép trước khi gọi);
	  * Disconnect hai lần không báo lỗi và không trừ trùng;
	  * Fire sau DisconnectAll không gọi handler nào.
]]

local Signal = {}
Signal.__index = Signal

function Signal.new()
	return setmetatable({ _handlers = {}, _alive = true }, Signal)
end

--[[
	Đăng ký handler. Trả về object có :Disconnect().
	Ném lỗi nếu signal đã bị huỷ — đó là lỗi lập trình, không được im lặng.
]]
function Signal:Connect(handler)
	if type(handler) ~= "function" then
		error(("Signal:Connect cần function, nhận %s"):format(type(handler)), 2)
	end
	if not self._alive then
		error("Signal:Connect trên signal đã DisconnectAll", 2)
	end

	local handlers = self._handlers
	local entry = { fn = handler, connected = true }
	handlers[#handlers + 1] = entry

	local connection = {}
	function connection:Disconnect()
		if not entry.connected then
			return false
		end
		entry.connected = false
		for index = #handlers, 1, -1 do
			if handlers[index] == entry then
				table.remove(handlers, index)
				break
			end
		end
		return true
	end
	function connection:IsConnected()
		return entry.connected
	end
	return connection
end

-- Số handler đang nối — dùng cho kiểm thử rò rỉ kết nối.
function Signal:HandlerCount()
	return #self._handlers
end

-- Bắn tín hiệu. Handler lỗi bị pcall để không chặn các handler còn lại.
function Signal:Fire(...)
	if not self._alive then
		return 0
	end
	local snapshot = {}
	for index, entry in ipairs(self._handlers) do
		snapshot[index] = entry
	end
	local called = 0
	for _, entry in ipairs(snapshot) do
		if entry.connected then
			called = called + 1
			local ok, err = pcall(entry.fn, ...)
			if not ok then
				warn(("[DER] handler của Signal ném lỗi: %s"):format(tostring(err)))
			end
		end
	end
	return called
end

-- Ngắt toàn bộ handler và đánh dấu signal đã chết.
function Signal:DisconnectAll()
	for _, entry in ipairs(self._handlers) do
		entry.connected = false
	end
	self._handlers = {}
	self._alive = false
end

function Signal:IsAlive()
	return self._alive
end

return Signal
]=],
	["Shared/Status"] = [=[
--[[
	doors-entity-radar/src/Shared/Status.luau
	ModuleScript — đặt tại: ReplicatedStorage.DoorsEntityRadar.Shared.Status

	TRẠNG THÁI PHÁT HIỆN. Đây là nơi duy nhất định nghĩa ý nghĩa của từng
	trạng thái và QUYỀN được hiển thị dữ liệu. Không tệp nào khác được tự
	quyết định "có được hiện khoảng cách hay không".

	NGUYÊN TẮC TRUNG THỰC (ràng buộc của toàn dự án):
	  1. Chỉ DETECTED mới được hiển thị khoảng cách/hướng/toạ độ.
	  2. Không bao giờ suy ra vị trí từ tên có trong danh mục.
	     "Có tên trong catalog" chỉ quyết định trạng thái UNVERIFIED,
	     không bao giờ quyết định DETECTED.
	  3. Không có dữ liệu mới thì không trình bày dữ liệu cũ như dữ liệu
	     trực tiếp — cờ `stale` do Tracker đặt, UI phải hiển thị cờ đó.
]]

local Status = {}

Status.Code = {
	-- Đã tìm thấy instance khớp VÀ đọc được vị trí hợp lệ từ môi trường.
	Detected = "DETECTED",
	-- Quét xong, không có instance nào khớp, VÀ mẫu tên đã được xác nhận.
	NotFound = "NOT_FOUND",
	-- Có instance khớp nhưng không đọc được vị trí hợp lệ (thiếu CFrame,
	-- PrimaryPart, hoặc toạ độ NaN). Biết là "có tồn tại", không biết ở đâu.
	NoPosition = "NO_POSITION",
	-- Mục này về bản chất không phát hiện được từ client (ví dụ cơ chế
	-- ẩn nấp của chính người chơi). Luôn kèm lý do.
	Unsupported = "UNSUPPORTED",
	-- Mẫu tên CHƯA được xác minh trong game thật. Không khẳng định có
	-- hay không có thực thể; chỉ nói "chưa đủ căn cứ".
	Unverified = "UNVERIFIED",
	-- Hệ thống đang tắt/tạm dừng: không có dữ liệu nào được coi là hiện hành.
	Disabled = "DISABLED",
	-- Lần quét ném lỗi. Kèm thông điệp lỗi thật, không che giấu.
	Fault = "FAULT",
}

-- Nhãn tiếng Việt hiển thị trên giao diện.
Status.Label = {
	DETECTED = "Đã phát hiện",
	NOT_FOUND = "Không phát hiện",
	NO_POSITION = "Thấy instance, không đọc được vị trí",
	UNSUPPORTED = "Không hỗ trợ phát hiện",
	UNVERIFIED = "Chưa xác minh",
	DISABLED = "Hệ thống đang tắt",
	FAULT = "Lỗi khi quét",
}

-- Màu chấm trạng thái (RGB 0-255). Chỉ là màu, không mang logic.
Status.Color = {
	DETECTED = { 86, 220, 130 },
	NOT_FOUND = { 150, 158, 172 },
	NO_POSITION = { 240, 190, 80 },
	UNSUPPORTED = { 120, 128, 140 },
	UNVERIFIED = { 120, 170, 235 },
	DISABLED = { 105, 110, 120 },
	FAULT = { 235, 96, 96 },
}

-- Thứ tự sắp xếp trong danh sách: trạng thái "có thông tin" lên trước.
Status.SortWeight = {
	DETECTED = 1,
	NO_POSITION = 2,
	NOT_FOUND = 3,
	UNVERIFIED = 4,
	UNSUPPORTED = 5,
	FAULT = 6,
	DISABLED = 7,
}

function Status.IsValid(code)
	return type(code) == "string" and Status.Label[code] ~= nil
end

function Status.GetLabel(code)
	if not Status.IsValid(code) then
		return "Trạng thái không xác định (" .. tostring(code) .. ")"
	end
	return Status.Label[code]
end

function Status.GetSortWeight(code)
	return Status.SortWeight[code] or 99
end

--[[
	QUYỀN HIỂN THỊ VỊ TRÍ. Chỉ DETECTED được trả true.
	Mọi nơi muốn in khoảng cách/toạ độ phải hỏi hàm này — nếu bỏ qua,
	đó là lỗi logic và test QUYỀN-001 sẽ bắt được.
]]
function Status.MayShowPosition(code)
	return code == Status.Code.Detected
end

-- Trạng thái này có nghĩa là "đã quét và có kết luận" (dù kết luận là không thấy).
function Status.IsScanned(code)
	return code == Status.Code.Detected
		or code == Status.Code.NotFound
		or code == Status.Code.NoPosition
end

-- Lý do mặc định theo trạng thái, dùng khi nơi phát sinh không cấp lý do riêng.
Status.DefaultReason = {
	DETECTED = "Tìm thấy instance khớp mẫu và đọc được vị trí hợp lệ.",
	NOT_FOUND = "Đã quét xong phạm vi cho phép, không có instance nào khớp mẫu.",
	NO_POSITION = "Có instance khớp mẫu nhưng không lấy được vị trí hợp lệ.",
	UNSUPPORTED = "Mục này không phát hiện được từ client.",
	UNVERIFIED = "Mẫu tên chưa được xác minh trong game thật.",
	DISABLED = "Hệ thống đang tắt hoặc tạm dừng.",
	FAULT = "Lần quét gặp lỗi.",
}

function Status.GetReason(code, customReason)
	if type(customReason) == "string" and #customReason > 0 then
		return customReason
	end
	return Status.DefaultReason[code] or "Không có thông tin."
end

--[[
	Tạo một bản ghi trạng thái. Đây là khuôn DUY NHẤT của dữ liệu mà UI
	được phép đọc; mọi trường đều có mặt để UI không phải đoán nil.

	tham số:
	  code       — một trong Status.Code
	  entityId   — id trong danh mục
	  reason     — chuỗi giải thích (tuỳ chọn)
	  observation— { instanceName, distance, direction, position, source, age }
	               CHỈ được khác nil khi code == DETECTED
	  stale      — true nếu dữ liệu không còn là dữ liệu trực tiếp
]]
function Status.MakeRecord(code, entityId, reason, observation, stale)
	if not Status.IsValid(code) then
		error(("Status.MakeRecord nhận mã trạng thái lạ: %s"):format(tostring(code)), 2)
	end

	-- Chốt an toàn: không cho observation lọt ra ngoài trạng thái DETECTED.
	-- Nếu một nơi nào đó cố gắn khoảng cách vào UNVERIFIED, ta bỏ nó và
	-- báo lỗi — thà mất dữ liệu còn hơn hiển thị dữ liệu không có căn cứ.
	local safeObservation = nil
	if observation ~= nil then
		if code == Status.Code.Detected then
			safeObservation = observation
		else
			warn(("[DER] Chặn hiển thị vị trí ở trạng thái %s (entity=%s)")
				:format(tostring(code), tostring(entityId)))
		end
	end

	return {
		code = code,
		entityId = entityId,
		label = Status.GetLabel(code),
		reason = Status.GetReason(code, reason),
		stale = stale == true,
		observation = safeObservation,
	}
end

return Status
]=],
}

local __DER_CACHE = {}

local function __DER_REQUIRE(key)
	if type(key) ~= "string" then
		error("__DER_REQUIRE cần chuỗi đường dẫn, nhận " .. type(key), 2)
	end
	if __DER_CACHE[key] ~= nil and __DER_CACHE[key] ~= true then
		return __DER_CACHE[key]
	end
	if __DER_CACHE[key] == true then
		error("require vòng lặp: '" .. key .. "' đang được nạp", 2)
	end
	local source = __DER_MODULES[key]
	if source == nil then
		error("không có module '" .. key .. "' trong bundle", 2)
	end
	__DER_CACHE[key] = true
	local chunk, compileError = load(source, "DER:" .. key)
	if chunk == nil then
		__DER_CACHE[key] = nil
		error("lỗi biên dịch module '" .. key .. "': " .. tostring(compileError), 2)
	end
	local ok, result = pcall(chunk)
	if not ok then
		__DER_CACHE[key] = nil
		error("lỗi khi chạy module '" .. key .. "': " .. tostring(result), 2)
	end
	if type(result) ~= "table" then
		__DER_CACHE[key] = nil
		error("module '" .. key .. "' phải return một bảng, nhận " .. type(result), 2)
	end
	__DER_CACHE[key] = result
	return result
end

-- Cài ra _G để mọi module (và cả Bootstrap) dùng chung MỘT bộ nạp.
_G.__DER_REQUIRE = __DER_REQUIRE

-- Nạp điểm khởi động (LocalScript thật sẽ chạy dòng này).
local __DER_BOOTSTRAP = __DER_REQUIRE("Client/Bootstrap")
return __DER_BOOTSTRAP
