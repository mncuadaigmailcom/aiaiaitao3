--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  REC-003 
	===== RALO.METHODS:END ===== --]]

--[[
	Core/Runner.luau
	Thực thi kế hoạch. Mỗi bước:
	  1. báo trạng thái RUNNING cho UI,
	  2. gọi handler thật,
	  3. đọc KẾT QUẢ TRẢ VỀ của handler (không đoán),
	  4. ghi applied / skipped / failed + detail.

	Sai sót ở một bước KHÔNG làm sập cả pipeline: pcall bao quanh, bước đó
	đánh dấu failed và các bước sau vẫn chạy.
]]

local Util_Types = __RALO_REQUIRE("Shared/Types")
local Util_Log = __RALO_REQUIRE("Shared/Log")

local SCOPE = "Runner"

local Runner = {}

--[[
	options = {
		onStep  = function(step, index, total)  -- hook tiến trình cho UI
		onLog   = function(level, stepId, message)
		delayBetween = số giây nghỉ giữa các bước (mặc định 0)
		wait    = function(seconds)
	}
]]
function Runner.Execute(plan: any, options: any)
	options = options or {}
	local onStep = options.onStep or function() end
	local results = {}

	for index, step in plan.steps do
		step.status = Util_Types.STATUS_RUNNING
		onStep(step, index, plan.total)

		local handler = nil
		if not step.available then
			step.status = Util_Types.STATUS_SKIPPED
			step.detail = step.reason or "không khả dụng"
			Util_Log.Info(SCOPE, ("BỎ QUA [%s]: %s"):format(step.id, tostring(step.detail)))
		else
			handler = step.module and step.module[step.handler]
			if type(handler) ~= "function" then
				step.status = Util_Types.STATUS_FAILED
				step.detail = ("thiếu handler %s"):format(tostring(step.handler))
				Util_Log.Error(SCOPE, ("LỖI [%s]: %s"):format(step.id, step.detail))
				handler = nil
			end
		end

		if handler ~= nil then
			local ok, payload = pcall(handler, step.module, step, plan.profile)
			if not ok then
				step.status = Util_Types.STATUS_FAILED
				step.detail = ("handler throw: %s"):format(tostring(payload))
				Util_Log.Error(SCOPE, ("LỖI [%s]: %s"):format(step.id, step.detail))
			else
				payload = payload or {}
				step.changes = payload.changes or 0
				step.detail = payload.detail or ""
				step.restored = payload.restoredValues or 0
				step.restorable = payload.restorable ~= false and step.restorable

				if step.changes > 0 then
					step.status = Util_Types.STATUS_APPLIED
				else
					step.status = Util_Types.STATUS_SKIPPED
					if step.detail == "" then
						step.detail = "không có đối tượng nào cần thay đổi"
					end
				end
				Util_Log.Info(SCOPE, ("%s [%s]: %d thay đổi — %s")
					:format(step.status == Util_Types.STATUS_APPLIED and "ÁP DỤNG" or "BỎ QUA",
						step.id, step.changes, step.detail))
			end
		end

		results[step.id] = step
		onStep(step, index, plan.total)

		if options.delayBetween and options.delayBetween > 0 and index < plan.total then
			(options.wait or function() end)(options.delayBetween)
		end
	end

	plan.results = results
	return results
end

function Runner.Tally(plan: any)
	local tally = { applied = 0, skipped = 0, failed = 0, changes = 0, total = plan.total }
	for _, step in plan.steps do
		if step.status == Util_Types.STATUS_APPLIED then
			tally.applied += 1
			tally.changes += step.changes or 0
		elseif step.status == Util_Types.STATUS_FAILED then
			tally.failed += 1
		else
			tally.skipped += 1
		end
	end
	return tally
end

return Runner
