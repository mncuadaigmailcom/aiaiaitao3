--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  CFG-001, CFG-002, CFG-005, LOWEND-001,
	  LOWEND-002, LOWEND-003, LOWEND-004 
	===== RALO.METHODS:END ===== --]]

--[[
	Client/Core/Devices.luau
	===== RALO.METHODS:LOWEND-001, LOWEND-002, LOWEND-003, LOWEND-004,
	                    CFG-001, CFG-002 =====

	Phân hạng thiết bị và chọn mức tối ưu phù hợp.

	Lý do: cùng một mức giảm đồ hoạ có thể "không đủ" trên điện thoại cũ
	nhưng lại "thừa và làm xấu hình" trên PC. Nên mặc định phải là
	NHẸ, và chỉ nâng dần khi thiết bị thật sự yếu.

	LOWEND-001  Nhận diện nền tảng (PC / mobile / console) qua UserInputService
	LOWEND-002  Chọn bậc chất lượng theo nền tảng + FPS đo được
	LOWEND-003  Giảm mật độ hạt mạnh hơn trên mobile
	LOWEND-004  Rút gọn GUI (bỏ hoạt ảnh không cần thiết) trên máy yếu
	CFG-001     Bật/tắt theo nhóm
	CFG-002     Bật/tắt từng phương pháp riêng lẻ

	GIỚI HẠI TRUNG THỰC: UserInputService không cho biết cấu hình CPU/GPU.
	Nên "hạng thiết bị" ở đây là ƯỚC LƯỢNG từ nền tảng + FPS đo được,
	không phải thông số phần cứng. Điều này được nêu rõ trong báo cáo.
]]

local Client_Env = __RALO_REQUIRE("Client/Core/Env")
local Shared_Log = __RALO_REQUIRE("Shared/Log")

local SCOPE = "Devices"

local Devices = {}

-- Bậc chất lượng: 1 = nhẹ nhất (giảm nhiều nhất), 3 = giữ gần nguyên bản
Devices.TIERS = {
	[1] = { name = "low",    qualityLevel = 3, particleScale = 0.40, animateGui = false },
	[2] = { name = "medium", qualityLevel = 5, particleScale = 0.70, animateGui = true },
	[3] = { name = "high",   qualityLevel = 7, particleScale = 1.00, animateGui = true },
}

Devices.detected = nil
Devices.tier = 3             -- MẶC ĐỊNH là bậc cao nhất = can thiệp ít nhất

-- LOWEND-001: nhận diện nền tảng. Không throw nếu service không có.
function Devices.DetectPlatform()
	if Devices.detected ~= nil then
		return Devices.detected
	end

	local info = { platform = "unknown", touch = false, gamepad = false, keyboardMouse = false }

	local userInput = Client_Env.GetService("UserInputService")
	if userInput ~= nil then
		local okTouch, touch = pcall(function()
			return userInput.TouchEnabled
		end)
		if okTouch then
			info.touch = touch == true
		end
		local okPad, pad = pcall(function()
			return userInput.GamepadEnabled
		end)
		if okPad then
			info.gamepad = pad == true
		end
		local okKm, km = pcall(function()
			return userInput.KeyboardEnabled and userInput.MouseEnabled
		end)
		if okKm then
			info.keyboardMouse = (km == true)
		end
	end

	-- UserInputService không có trên server; ở đó giữ "unknown"
	if info.touch then
		info.platform = "mobile"
	elseif info.gamepad then
		info.platform = "console"
	elseif info.keyboardMouse then
		info.platform = "pc"
	end

	Devices.detected = info
	Shared_Log.Info(SCOPE, ("nền tảng: %s (touch=%s, gamepad=%s, kb+mouse=%s)")
		:format(info.platform, tostring(info.touch), tostring(info.gamepad), tostring(info.keyboardMouse)))
	return info
end

--[[
	LOWEND-002: chọn bậc chất lượng.
	measuredFps: FPS trung bình ĐO ĐƯỢC (nếu có). Không có thì chỉ dựa nền tảng.

	QUAN TRỌNG: hàm này KHÔNG tự quyết định khi người dùng đã đặt tier
	thủ công trong Config (autoTier = false).
]]
function Devices.ChooseTier(measuredFps, options)
	options = options or {}
	local platform = Devices.DetectPlatform().platform

	local tier = 3
	if platform == "mobile" then
		tier = 1
	elseif platform == "console" then
		tier = 2
	end

	-- Chỉ hạ bậc theo FPS khi có số đo THẬT và được phép tự động
	if options.autoTier ~= false and type(measuredFps) == "number" and measuredFps > 0 then
		if measuredFps < 30 then
			tier = 1
		elseif measuredFps < 45 and tier > 2 then
			tier = 2
		end
	end

	if Devices.TIERS[tier] == nil then
		tier = 3
	end
	Devices.tier = tier
	return tier, Devices.TIERS[tier]
end

function Devices.CurrentTier()
	return Devices.tier, Devices.TIERS[Devices.tier]
end

-- LOWEND-003: hệ số giới hạn hạt theo bậc thiết bị.
function Devices.ParticleScale()
	local _, tier = Devices.CurrentTier()
	return tier.particleScale
end

-- LOWEND-004: có nên chạy hoạt ảnh GUI không.
function Devices.ShouldAnimateGui()
	local _, tier = Devices.CurrentTier()
	return tier.animateGui
end

--[[
	CFG-001 / CFG-002: kiểm tra một phương pháp có được phép chạy không.
	profile.groups[groupKey] = false  -> tắt cả nhóm
	profile.methods[methodId] = false -> tắt riêng phương pháp đó
	Mặc định: BẬT (trừ những gì Config khai báo tắt sẵn).
]]
function Devices.IsEnabled(profile, groupKey, methodId)
	if type(profile) ~= "table" then
		return true
	end
	if profile.enabled == false then
		return false
	end
	if groupKey ~= nil and type(profile.groups) == "table" and profile.groups[groupKey] == false then
		return false
	end
	if methodId ~= nil and type(profile.methods) == "table" and profile.methods[methodId] == false then
		return false
	end
	return true
end

-- Liệt kê những gì đang tắt — dùng cho báo cáo và GUI (CFG-005)
function Devices.DisabledList(profile)
	local out = { groups = {}, methods = {} }
	if type(profile) ~= "table" then
		return out
	end
	if type(profile.groups) == "table" then
		for key, value in pairs(profile.groups) do
			if value == false then
				out.groups[#out.groups + 1] = key
			end
		end
	end
	if type(profile.methods) == "table" then
		for key, value in pairs(profile.methods) do
			if value == false then
				out.methods[#out.methods + 1] = key
			end
		end
	end
	table.sort(out.groups)
	table.sort(out.methods)
	return out
end

function Devices.Reset()
	Devices.detected = nil
	Devices.tier = 3
end

return Devices
