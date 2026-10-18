--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  GRAPHICS-001, GRAPHICS-002, GRAPHICS-003 
	===== RALO.METHODS:END ===== --]]

--[[
	Optimizations/Graphics.luau
	Giảm tải RENDER phía client. Tất cả đều là property client-writable
	trong Roblox Luau và đều được hoàn tác được (trừ QualityLevel vốn là
	cài đặt phiên, vẫn khôi phục được bằng cách ghi lại giá trị cũ).

	KHÔNG có thao tác nào ở đây đụng vào gameplay: không tắt va chạm vật thể
	chơi được, không xoá model, không tắt âm thanh gameplay.
]]

local Core_Env = __RALO_REQUIRE("Client/Core/Env")
local Util_Safe = __RALO_REQUIRE("Shared/Safe")
local Util_Log = __RALO_REQUIRE("Shared/Log")
local Core_Restore = __RALO_REQUIRE("Client/Core/Restore")
local Opt_Scan = __RALO_REQUIRE("Client/Optimizations/Scan")

local SCOPE = "Graphics"

local Graphics = {}

-- Ghi lại giá trị cũ rồi mới đổi; chỉ đếm khi đổi thật sự thành công.
local function change(instance: any, property: string, newValue: any, stepId: string, expect: any)
	local oldValue, readOk = Util_Safe.Get(instance, property)
	if not readOk then
		return false
	end
	if oldValue == newValue then
		return false                       -- đã ở sẵn trạng thái mong muốn
	end
	local ok = Util_Safe.Set(instance, property, newValue, {
		scope = SCOPE .. ":" .. stepId,
		expect = expect,
	})
	if ok then
		Core_Restore.Record(instance, property, oldValue, stepId, newValue)
	end
	return ok
end

function Graphics.ApplyQualityLevel(_step: any, profile: any)
	local lighting = Core_Env.GetService("Lighting")
	if lighting == nil then
		return { changes = 0, detail = "không truy cập được Lighting", restorable = false }
	end

	local target = math.clamp(math.floor(profile.graphics.qualityLevel or 4), 1, 10)
	local changed = 0

	if change(lighting, "QualityLevel", target, "graphics.quality", target) then
		changed += 1
	end
	-- GraphicsQualityMode: tự động chỉnh chất lượng theo thiết bị. Tắt nó đi
	-- để mức ta đặt không bị engine ghi đè.
	if change(lighting, "GraphicsQualityMode", false, "graphics.quality", false) then
		changed += 1
	end
	-- Technology: chỉ đổi khi người dùng chỉ định rõ (mặc định GIỮ NGUYÊN).
	local tech = profile.graphics.technology
	if tech ~= nil and change(lighting, "Technology", tech, "graphics.quality", tech) then
		changed += 1
	end

	local current = Util_Safe.Get(lighting, "QualityLevel")
	return {
		changes = changed,
		detail = ("QualityLevel -> %s (đang là %s), GraphicsQualityMode=false")
			:format(tostring(target), tostring(current)),
	}
end

function Graphics.ApplyTerrain(_step: any, profile: any)
	local workspace = Core_Env.GetService("Workspace")
	if workspace == nil then
		return { changes = 0, detail = "không truy cập được Workspace", restorable = false }
	end
	local terrain, ok = Util_Safe.Get(workspace, "Terrain")
	if not ok or terrain == nil then
		return { changes = 0, detail = "không có Terrain", restorable = false }
	end

	local target = profile.graphics.terrainDecoration == true
	local changed = 0
	if change(terrain, "Decoration", target, "graphics.terrain", target) then
		changed += 1
	end
	return {
		changes = changed,
		detail = ("Terrain.Decoration -> %s (chi tiết cỏ/đá nhỏ; địa hình vẫn giữ nguyên)")
			:format(tostring(target)),
	}
end

--[[
	Giảm tầm bóng đổ và tắt CastShadow cho part ở XA camera.
	Part gần vẫn giữ bóng -> hình ảnh tổng thể gần như không đổi.
]]
function Graphics.ApplyShadowBudget(step: any, profile: any)
	local lighting = Core_Env.GetService("Lighting")
	local workspace = Core_Env.GetService("Workspace")
	if lighting == nil or workspace == nil then
		return { changes = 0, detail = "thiếu Lighting/Workspace", restorable = false }
	end

	local changed = 0
	local distance = profile.graphics.disableCastShadowDistance or 0

	-- Ghi chú: ta KHÔNG đổi ShadowSoftness / ShadowColor / Ambient — những thứ
	-- đó làm thay đổi rõ rệt tông màu của game, trái với yêu cầu "giảm nhẹ nhàng".
	_ = lighting -- lighting được lấy để đảm bảo service tồn tại trước khi quét

	if distance <= 0 then
		return { changes = changed, detail = "disableCastShadowDistance = 0 nên bỏ qua quét part" }
	end

	local camera, camOk = Util_Safe.Get(workspace, "CurrentCamera")
	if not camOk or camera == nil then
		return { changes = changed, detail = "không có CurrentCamera -> không đo được khoảng cách" }
	end
	local camPos, posOk = Util_Safe.Get(camera, "CFrame")
	if not posOk or camPos == nil then
		return { changes = changed, detail = "không đọc được CFrame camera" }
	end

	local isRenderable = { Part = true, MeshPart = true, UnionOperation = true }
	local stats = Opt_Scan.Descendants({
		maxScan = profile.effects.maxInstancesScanned or 3000,
		yieldEvery = 400,
		root = workspace,
		filter = function(instance)
			return isRenderable[instance.ClassName] == true
		end,
		onFound = function(instance)
			local casting, okCast = Util_Safe.Get(instance, "CastShadow")
			if not okCast or casting ~= true then
				return false
			end
			local cf, okCf = Util_Safe.Get(instance, "CFrame")
			if not okCf or cf == nil then
				return false
			end
			local dist = (cf.Position - camPos.Position).Magnitude
			if dist < distance then
				return false
			end
			return change(instance, "CastShadow", false, step.id, false)
		end,
	})

	if stats.error then
		return { changes = changed, detail = "lỗi khi quét: " .. stats.error, restorable = false }
	end

	changed += stats.changed
	return {
		changes = changed,
		detail = ("tắt CastShadow cho %d part xa hơn %d stud (đã quét %d, khớp %d%s)")
			:format(stats.changed, distance, stats.scanned, stats.matched,
				stats.truncated and ", có cắt bớt" or ""),
	}
end

function Graphics.ApplyCharacter(_step: any, profile: any)
	local players = Core_Env.GetService("Players")
	if players == nil then
		return { changes = 0, detail = "không truy cập được Players", restorable = false }
	end
	local player, ok = Util_Safe.Get(players, "LocalPlayer")
	if not ok or player == nil then
		return { changes = 0, detail = "không có LocalPlayer", restorable = false }
	end
	local character = player.Character
	if character == nil then
		return { changes = 0, detail = "nhân vật chưa spawn" }
	end

	local changed = 0
	local notes = {}

	if profile.character.disableShadows then
		local descendants, dOk = pcall(function() return character:GetDescendants() end)
		if dOk then
			for _, instance in descendants do
				local cls = instance.ClassName
				if cls == "Part" or cls == "MeshPart" or cls == "Accessory" then
					if change(instance, "CastShadow", false, "graphics.character", false) then
						changed += 1
					end
				end
			end
			notes[#notes + 1] = "tắt bóng nhân vật"
		end
	end

	if profile.character.disableAutoScaling then
		local humanoid = character:FindFirstChildOfClass("Humanoid")
		if humanoid ~= nil then
			if change(humanoid, "AutomaticScalingEnabled", false, "graphics.character", false) then
				changed += 1
				notes[#notes + 1] = "tắt auto-scaling"
			end
		end
	end

	if #notes == 0 then
		return { changes = 0, detail = "không có gì để đổi trên nhân vật" }
	end
	return {
		changes = changed,
		detail = table.concat(notes, ", ") .. " (nhân vật và animation giữ nguyên)",
	}
end

--[[
	GHI CHÚ VỀ GIỚI HẠN FPS (FPS-005, trạng thái E trong danh mục):

	Phiên bản trước của dự án có hàm Graphics.ApplyFpsCap dùng
	`setrbxsetting("Render", "FrameRateMax", ...)`. Hàm đó ĐÃ BỊ XOÁ vì:

	  * `setrbxsetting` là API của executor, không tồn tại trong Roblox
	    Studio hay client chính thức. Dùng nó nghĩa là dự án nhắm tới
	    môi trường exploit — trái với phạm vi đã thống nhất (Studio +
	    game do bạn sở hữu, không executor).
	  * Không có API công khai nào cho phép LocalScript đổi FrameRateMax.

	Nếu bạn muốn giới hạn FPS, hãy tự chỉnh trong
	Settings -> Rendering của client Roblox. Script không làm thay được,
	và dự án không giả vờ làm được.
]]

return Graphics
