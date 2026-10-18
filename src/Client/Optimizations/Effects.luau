--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  EFFECTS-001, EFFECTS-002 
	===== RALO.METHODS:END ===== --]]

--[[
	Optimizations/Effects.luau
	GIẢM CHI PHÍ EFFECT — không xoá effect.

	Sai lầm phổ biến của mấy script "anti lag" là `Destroy()` sạch
	ParticleEmitter/Beam/Trail. Cách đó phá gameplay (mất hiệu ứng kỹ năng,
	mất dấu vết đường đạn) và KHÔNG hoàn tác được.

	Cách làm ở đây:
	  * GIỚI HẠN Rate và ParticleCount về mức trần -> effect vẫn hiện, nhẹ hơn.
	  * Beam/Trail/Decal mặc định GIỮ NGUYÊN; chỉ tắt khi người dùng bật cờ.
	  * Mọi giá trị cũ được ghi vào Restore để hoàn tác 100%.
]]

local Util_Safe = __RALO_REQUIRE("Shared/Safe")
local Util_Log = __RALO_REQUIRE("Shared/Log")
local Core_Restore = __RALO_REQUIRE("Client/Core/Restore")
local Opt_Scan = __RALO_REQUIRE("Client/Optimizations/Scan")

local SCOPE = "Effects"

local Effects = {}

local function change(instance: any, property: string, newValue: any, stepId: string, expect: any)
	local oldValue, readOk = Util_Safe.Get(instance, property)
	if not readOk then
		return false
	end
	if oldValue == newValue then
		return false
	end
	local ok = Util_Safe.Set(instance, property, newValue, { scope = SCOPE .. ":" .. stepId, expect = expect })
	if ok then
		-- Truyền newValue để khi hoàn tác, Guard.Change biết giá trị script
		-- đã đặt và TỪ CHỐI ghi đè nếu game đã đổi nó sau đó (REC-002).
		Core_Restore.Record(instance, property, oldValue, stepId, newValue)
	end
	return ok
end

function Effects.CapParticles(_step: any, profile: any)
	local rateCap = profile.effects.particleRateCap or 40
	local countCap = profile.effects.particleMaxCountCap or 120

	local cappedRate, cappedCount, alreadyOk = 0, 0, 0

	local stats = Opt_Scan.Descendants({
		maxScan = profile.effects.maxInstancesScanned or 3000,
		yieldEvery = 400,
		filter = function(instance)
			return instance.ClassName == "ParticleEmitter"
		end,
		onFound = function(instance)
			local touched = false

			local rate, okRate = Util_Safe.Get(instance, "Rate")
			if okRate and type(rate) == "number" and rate > rateCap then
				if change(instance, "Rate", rateCap, "effects.particles", rateCap) then
					cappedRate += 1
					touched = true
				end
			end

			local count, okCount = Util_Safe.Get(instance, "ParticleCount")
			-- ParticleCount = -1 nghĩa là "không giới hạn"; ta quy về mức trần.
			if okCount and type(count) == "number" and (count < 0 or count > countCap) then
				if change(instance, "ParticleCount", countCap, "effects.particles", countCap) then
					cappedCount += 1
					touched = true
				end
			end

			if not touched then
				alreadyOk += 1
			end
			return touched
		end,
	})

	if stats.error then
		return { changes = 0, detail = "lỗi khi quét: " .. stats.error, restorable = false }
	end

	return {
		changes = cappedRate + cappedCount,
		detail = ("giới hạn Rate cho %d emitter, ParticleCount cho %d emitter; %d emitter vốn đã nhẹ; đã quét %d (khớp %d%s)")
			:format(cappedRate, cappedCount, alreadyOk, stats.scanned, stats.matched,
				stats.truncated and ", có cắt bớt" or ""),
	}
end

function Effects.ApplyOptionalEffects(_step: any, profile: any)
	local doBeams = profile.effects.disableBeams == true
	local doTrails = profile.effects.disableTrails == true
	local doDecals = profile.effects.dimDecals == true

	if not doBeams and not doTrails and not doDecals then
		return {
			changes = 0,
			detail = "giữ nguyên Beam/Trail/Decal theo cấu hình mặc định (ưu tiên giữ tính năng)",
		}
	end

	local beams, trails, decals = 0, 0, 0
	local stats = Opt_Scan.Descendants({
		maxScan = profile.effects.maxInstancesScanned or 3000,
		yieldEvery = 400,
		filter = function(instance)
			local cls = instance.ClassName
			return (doBeams and cls == "Beam")
				or (doTrails and cls == "Trail")
				or (doDecals and (cls == "Decal" or cls == "Texture"))
		end,
		onFound = function(instance)
			local cls = instance.ClassName
			if cls == "Beam" then
				if change(instance, "Enabled", false, "effects.optional", false) then
					beams += 1
					return true
				end
			elseif cls == "Trail" then
				if change(instance, "Enabled", false, "effects.optional", false) then
					trails += 1
					return true
				end
			else
				if change(instance, "Transparency", 1, "effects.optional", 1) then
					decals += 1
					return true
				end
			end
			return false
		end,
	})

	return {
		changes = beams + trails + decals,
		detail = ("tắt %d Beam, %d Trail, làm mờ %d Decal (đã quét %d)")
			:format(beams, trails, decals, stats.scanned),
	}
end

return Effects
