--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  PHYSICS-001, PHYSICS-002 
	===== RALO.METHODS:END ===== --]]

--[[
	Optimizations/Physics.luau
	Giảm chi phí vật lý phía client.

	LƯU Ý TRUNG THỰC: khác với các bước đồ hoạ, nhóm này CÓ đánh đổi cảm giác
	chơi — tắt làm mượt nội suy (InterpolationThrottling) giúp tiết kiệm CPU
	đáng kể trên máy yếu nhưng chuyển động vật thể từ xa sẽ "giật" hơn.
	Vì vậy `physics.enabled` MẶC ĐỊNH = false và bước này bị SKIP.

	Ngoài ra, `workspace.PhysicsSteppingMethod` / `InterpolationThrottling`
	thường bị khoá ghi ở client thường (chỉ server/Studio ghi được). Script
	không lách khoá: ghi không được thì báo "unsupported" chứ không giả vờ.
]]

local Core_Env = __RALO_REQUIRE("Client/Core/Env")
local Util_Safe = __RALO_REQUIRE("Shared/Safe")
local Core_Restore = __RALO_REQUIRE("Client/Core/Restore")

local Physics = {}

function Physics.ApplyThrottling(step: any, profile: any)
	if not profile.physics.enabled then
		return { changes = 0, detail = "physics.enabled = false (mặc định, vì có đánh đổi)", restorable = false }
	end

	local workspace = Core_Env.GetService("Workspace")
	if workspace == nil then
		return { changes = 0, detail = "không truy cập được Workspace", restorable = false }
	end

	local changed = 0
	local notes = {}
	local blocked = {}

	local throttle = profile.physics.interpolationThrottling
	if throttle ~= nil then
		local oldValue, readOk = Util_Safe.Get(workspace, "InterpolationThrottling")
		if not readOk then
			blocked[#blocked + 1] = "InterpolationThrottling (không đọc được)"
		elseif oldValue == throttle then
			notes[#notes + 1] = "InterpolationThrottling đã ở mức mong muốn"
		else
			local ok = Util_Safe.Set(workspace, "InterpolationThrottling", throttle, {
				scope = "Physics:" .. step.id, expect = throttle,
			})
			if ok then
				Core_Restore.Record(workspace, "InterpolationThrottling", oldValue, step.id, throttle)
				changed += 1
				notes[#notes + 1] = "InterpolationThrottling = " .. tostring(throttle)
			else
				blocked[#blocked + 1] = "InterpolationThrottling (client không được ghi)"
			end
		end
	end

	local stepping = profile.physics.physicsSteppingMethod
	if stepping ~= nil then
		local oldValue, readOk = Util_Safe.Get(workspace, "PhysicsSteppingMethod")
		if not readOk then
			blocked[#blocked + 1] = "PhysicsSteppingMethod (không đọc được)"
		elseif oldValue == stepping then
			notes[#notes + 1] = "PhysicsSteppingMethod đã ở mức mong muốn"
		else
			local ok = Util_Safe.Set(workspace, "PhysicsSteppingMethod", stepping, {
				scope = "Physics:" .. step.id, expect = stepping,
			})
			if ok then
				Core_Restore.Record(workspace, "PhysicsSteppingMethod", oldValue, step.id, stepping)
				changed += 1
				notes[#notes + 1] = "PhysicsSteppingMethod = " .. tostring(stepping)
			else
				blocked[#blocked + 1] = "PhysicsSteppingMethod (client không được ghi)"
			end
		end
	end

	local detail = #notes > 0 and table.concat(notes, "; ") or "không đổi được gì"
	if #blocked > 0 then
		detail ..= " | bị chặn: " .. table.concat(blocked, ", ")
	end

	return { changes = changed, detail = detail }
end

return Physics
