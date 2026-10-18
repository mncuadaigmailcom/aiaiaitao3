--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  HEAVY-002, HEAVY-003, HEAVY-004, MEAS-001,
	  MEAS-003, MEAS-005, MEAS-006, MEAS-007,
	  SAFE-006 
	===== RALO.METHODS:END ===== --]]

--[[
	Client/Core/Profile.luau
	===== RALO.METHODS:MEAS-001, MEAS-002, MEAS-003, MEAS-004, MEAS-005,
	                    HEAVY-001, HEAVY-002, HEAVY-003, HEAVY-004, RES-004 =====

	Đo lường. Đây là phần quyết định tính TRUNG THỰC của cả dự án:
	mọi con số báo cáo đều phải sinh ra từ đây, không có con số nào
	được viết sẵn trong mã.

	Nguồn số liệu thật:
	  * frame time = delta thật giữa hai lần RenderStepped
	  * Luau heap  = collectgarbage("count")  (KB)
	  * chi phí của CHÍNH công cụ tối ưu = thời gian Scheduler.Tick tiêu tốn
	  * số connection / instance / pool = đếm từ Registry & Pool

	Nếu không lấy được một chỉ số, hàm trả về `available = false`
	và pipeline ghi rõ "chưa có số liệu" — KHÔNG suy ra số gần đúng.
]]

local Client_Env = __RALO_REQUIRE("Client/Core/Env")
local Client_Perf = __RALO_REQUIRE("Client/Core/Perf")
local Shared_Log = __RALO_REQUIRE("Shared/Log")
local Client_Scheduler = __RALO_REQUIRE("Client/Core/Scheduler")
local Client_Registry = __RALO_REQUIRE("Client/Core/Registry")
local Shared_Safe = __RALO_REQUIRE("Shared/Safe")

local SCOPE = "Profile"

local Profile = {}

Profile.live = nil           -- Perf buffer đang nhận mẫu (cho chỉ số tức thời)
Profile.last = nil
Profile.longFrames = 0       -- số khung hình vượt ngưỡng
Profile.longFrameThresholdMs = 33.3   -- dưới 30 FPS
Profile.worstFrameMs = 0

--[[
	Đọc chỉ số tức thời MỘT lần. Không throw, không bịa.
]]
function Profile.Instant()
	local runService = Client_Env.GetService("RunService")

	local frameTimeMs, frameOk = 0, false
	if runService ~= nil then
		-- Shared_Safe.Call trả về (ok, result) và không bao giờ throw.
		local ok, value = Shared_Safe.Call(runService, "GetRenderStepTime")
		if ok and type(value) == "number" and value == value then
			frameTimeMs = value * 1000
			frameOk = true
		end
	end

	local heapKb, heapOk = 0, false
	if collectgarbage ~= nil then
		local ok2, value2 = pcall(collectgarbage, "count")
		if ok2 and type(value2) == "number" then
			heapKb, heapOk = value2, true
		end
	end

	return {
		frameTimeMs = frameTimeMs,
		frameTimeAvailable = frameOk,
		fps = (frameOk and frameTimeMs > 0) and (1000 / frameTimeMs) or nil,
		heapKb = heapKb,
		heapAvailable = heapOk,
		scheduler = Client_Scheduler.Stats(),
		registry = Client_Registry.Stats(),
		time = Client_Env.now(),
	}
end

--[[
	Đếm đối tượng trong Workspace để làm NGỮ CẢNH cho kết quả đo.
	Đây không phải chỉ số chất lượng, mà để biết hai lần đo có tương đương.
]]
function Profile.WorldCensus(workspace)
	local target = workspace or Client_Env.GetService("Workspace")
	local census = {
		scanned = 0, parts = 0, shadowCasters = 0, emitters = 0,
		models = 0, available = target ~= nil,
	}
	if target == nil then
		return census
	end

	local ok, descendants = pcall(function()
		return target:GetDescendants()
	end)
	if not ok then
		census.note = "GetDescendants thất bại"
		return census
	end

	census.scanned = #descendants
	for _, instance in descendants do
		local className = instance.ClassName
		if className == "Part" or className == "MeshPart" or className == "UnionOperation" then
			census.parts += 1
			local okCast, cast = pcall(function()
				return instance.CastShadow
			end)
			if okCast and cast == true then
				census.shadowCasters += 1
			end
		elseif className == "ParticleEmitter" then
			census.emitters += 1
		elseif className == "Model" then
			census.models += 1
		end
	end
	return census
end

--[[
	Đo trong `durationSeconds`.
	options = { label, window, onSample }
]]
function Profile.Run(durationSeconds, options)
	options = options or {}
	local duration = math.max(0.1, tonumber(durationSeconds) or 1.0)
	local runService = Client_Env.GetService("RunService")

	local perf = Client_Perf.New(options.window or 180)
	Profile.live = perf

	local meta = {
		label = options.label or "sample",
		duration = duration,
		source = "none",
		samples = 0,
		note = nil,
	}

	local startedAt = Client_Env.now()
	local connection
	if runService ~= nil and runService.RenderStepped ~= nil then
		meta.source = "RenderStepped"
		local ok, conn = pcall(function()
			return runService.RenderStepped:Connect(function(deltaTime)
				if deltaTime ~= nil and deltaTime > 0 then
					local ms = deltaTime * 1000
					perf:Push(ms)
					meta.samples += 1
					if ms > Profile.longFrameThresholdMs then
						Profile.longFrames += 1
					end
					if ms > Profile.worstFrameMs then
						Profile.worstFrameMs = ms
					end
					if options.onSample then
						options.onSample(ms, meta.samples)
					end
				end
			end)
		end)
		if ok then
			connection = conn
		else
			meta.note = "không kết nối được RenderStepped"
		end
	elseif runService ~= nil and runService.Heartbeat ~= nil then
		meta.source = "Heartbeat (fallback, không phải thời gian render)"
		local ok, conn = pcall(function()
			return runService.Heartbeat:Connect(function(deltaTime)
				if deltaTime ~= nil and deltaTime > 0 then
					perf:Push(deltaTime * 1000)
					meta.samples += 1
				end
			end)
		end)
		if ok then
			connection = conn
		end
	else
		meta.note = "runtime không có RenderStepped/Heartbeat -> không có số đo khung hình"
		Shared_Log.Warn(SCOPE, meta.note)
	end

	Client_Env.Wait(duration)

	if connection ~= nil then
		pcall(function()
			connection:Disconnect()
		end)
	end

	meta.elapsed = Client_Env.now() - startedAt
	if meta.source ~= "none" and meta.samples == 0 then
		meta.note = "có kết nối nhưng không nhận được mẫu nào"
	end

	local summary = perf:Summarize("ms")
	local heapKb, heapOk = 0, false
	if collectgarbage ~= nil then
		local ok, value = pcall(collectgarbage, "count")
		if ok and type(value) == "number" then
			heapKb, heapOk = value, true
		end
	end

	local result = {
		meta = meta,
		frame = summary,
		fps = {
			mean = summary.fps_mean or 0,
			p1 = summary.fps_p1 or 0,
			p5 = summary.fps_p5 or 0,
			p50 = summary.fps_p50 or 0,
		},
		frameTimeMs = { mean = summary.mean, p95 = summary.p95, max = summary.max },
		heapKb = heapKb,
		heapAvailable = heapOk,
		scheduler = Client_Scheduler.Stats(),
		registry = Client_Registry.Stats(),
		census = Profile.WorldCensus(),
		time = Client_Env.now(),
	}

	Profile.last = result
	Shared_Log.Info(SCOPE, ("đo '%s': %d mẫu / %.2fs (nguồn %s)")
		:format(meta.label, meta.samples, meta.elapsed, meta.source))
	return result
end

--[[
	So sánh hai lần đo. Chỉ tính từ số liệu thật đã truyền vào.
	Thiếu mẫu -> valid = false, nêu lý do, KHÔNG kết luận.
]]
function Profile.Compare(before, after)
	local out = { valid = true, reason = nil, rows = {}, summary = {} }

	if before == nil or after == nil then
		out.valid = false
		out.reason = "thiếu dữ liệu before/after"
		return out
	end
	local beforeSamples = before.meta and before.meta.samples or 0
	local afterSamples = after.meta and after.meta.samples or 0
	if beforeSamples == 0 or afterSamples == 0 then
		out.valid = false
		out.reason = ("một trong hai lần đo có 0 mẫu (trước=%d, sau=%d) -> không kết luận được")
			:format(beforeSamples, afterSamples)
		return out
	end

	local function addRow(label, beforeValue, afterValue, betterWhenLower, decimals)
		decimals = decimals or 1
		local diff = afterValue - beforeValue
		local pct = beforeValue ~= 0 and (diff / beforeValue) * 100 or 0
		local format = "%." .. decimals .. "f"
		out.rows[#out.rows + 1] = {
			label = label,
			before = format:format(beforeValue),
			after = format:format(afterValue),
			delta = ("%+.1f%%"):format(pct),
			better = betterWhenLower and diff < 0 or (not betterWhenLower and diff > 0),
			worse = betterWhenLower and diff > 0 or (not betterWhenLower and diff < 0),
			pct = pct,
		}
	end

	addRow("FPS trung bình", before.fps.mean, after.fps.mean, false)
	addRow("FPS p1 (khung tệ nhất)", before.fps.p1, after.fps.p1, false)
	addRow("FPS p5", before.fps.p5, after.fps.p5, false)
	addRow("Frame time TB (ms)", before.frameTimeMs.mean, after.frameTimeMs.mean, true)
	addRow("Frame time p95 (ms)", before.frameTimeMs.p95, after.frameTimeMs.p95, true)
	if before.heapAvailable and after.heapAvailable then
		addRow("Luau heap (MB)", before.heapKb / 1024, after.heapKb / 1024, true, 2)
	end

	local improved, regressed, unchanged = 0, 0, 0
	for _, row in out.rows do
		if row.better then
			improved += 1
		elseif row.worse then
			regressed += 1
		else
			unchanged += 1
		end
	end

	local verdict
	if improved > 0 and regressed == 0 then
		verdict = "improved"
	elseif regressed > 0 and improved == 0 then
		verdict = "regressed"
	elseif improved > 0 and regressed > 0 then
		verdict = "mixed"
	else
		verdict = "unchanged"
	end

	out.summary = {
		improved = improved,
		regressed = regressed,
		unchanged = unchanged,
		verdict = verdict,
		baselineSamples = beforeSamples,
		afterSamples = afterSamples,
		durationBefore = before.meta.duration,
		durationAfter = after.meta.duration,
		sourceBefore = before.meta.source,
		sourceAfter = after.meta.source,
		censusBefore = before.census,
		censusAfter = after.census,
	}
	return out
end

-- Định dạng thành các dòng để in ra Output / hiện lên GUI.
function Profile.FormatComparison(comparison)
	local rows = { { "Chỉ số", "Trước", "Sau", "Thay đổi" } }
	for _, row in comparison.rows do
		rows[#rows + 1] = { row.label, row.before, row.after, row.delta }
	end

	local widths = { 0, 0, 0, 0 }
	for _, row in rows do
		for i = 1, 4 do
			local length = #tostring(row[i] or "")
			if length > widths[i] then
				widths[i] = length
			end
		end
	end

	local lines = {}
	if comparison.valid then
		lines[#lines + 1] = ("Kết luận: %s (cải thiện %d, suy giảm %d, không đổi %d / %d chỉ số)")
			:format(comparison.summary.verdict, comparison.summary.improved, comparison.summary.regressed,
				comparison.summary.unchanged, #comparison.rows)
	else
		lines[#lines + 1] = "Không kết luận được: " .. tostring(comparison.reason)
	end

	for _, row in rows do
		local line = ""
		for i = 1, 4 do
			local cell = tostring(row[i] or "")
			line ..= cell .. string.rep(" ", widths[i] - #cell + 2)
		end
		lines[#lines + 1] = line
	end

	if comparison.valid then
		lines[#lines + 1] = ("Số mẫu: trước=%d (%.1fs, %s) · sau=%d (%.1fs, %s)")
			:format(comparison.summary.baselineSamples, comparison.summary.durationBefore,
				tostring(comparison.summary.sourceBefore),
				comparison.summary.afterSamples, comparison.summary.durationAfter,
				tostring(comparison.summary.sourceAfter))
	end
	return lines
end

--[[
	Chi phí do CHÍNH hệ thống tối ưu tạo ra (RES-004).
	Đây là chỉ số bắt buộc phải có: một công cụ chống lag mà tự gây lag
	thì vô nghĩa.
]]
function Profile.SelfCost()
	local scheduler = Client_Scheduler.Stats()
	return {
		frameCostMs = scheduler.lastFrameCostMs,
		frameBudgetMs = scheduler.frameBudgetMs,
		overruns = scheduler.overruns,
		tasks = scheduler.tasks,
		executions = scheduler.executions,
		connections = scheduler.connections + Client_Registry.ConnectionCount(),
		longFrames = Profile.longFrames,
		longFrameThresholdMs = Profile.longFrameThresholdMs,
		worstFrameMs = Profile.worstFrameMs,
	}
end

function Profile.Reset()
	Profile.longFrames = 0
	Profile.worstFrameMs = 0
	Profile.last = nil
	Profile.live = nil
end

return Profile
