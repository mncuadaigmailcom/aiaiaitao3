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
