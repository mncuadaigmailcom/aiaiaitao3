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
