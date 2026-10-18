--[[
	Core/Measure.luau
	LẤY MẪU HIỆU NĂNG THẬT. Không có con số nào trong tệp này được sinh ra
	từ không khí:

	  * frame time  = delta thật giữa hai lần RenderStepped (hoặc Heartbeat).
	  * fps         = 1 / frame time, suy ra từ số đo, không phải giá trị gán.
	  * gcHeapKb    = collectgarbage("count") — heap Luau do runtime báo cáo.
	  * fpsCrossCheck = Stats.Workspace.FramesPerSecond (nếu runtime cho đọc);
	                    chỉ dùng để ĐỐI CHIẾU, và được ghi rõ trong meta.

	Nếu runtime không có RenderStepped, Run() trả về meta.source = "none"
	và samples = 0 — tuyệt đối không bịa số.
]]

local Core_Env = __RALO_REQUIRE("Client/Core/Env")
local Core_Perf = __RALO_REQUIRE("Client/Core/Perf")
local Util_Log = __RALO_REQUIRE("Shared/Log")

local SCOPE = "Measure"

local Measure = {}

Measure.live = nil          -- Perf buffer đang nhận mẫu (để UI đọc tức thời)
Measure.last = nil          -- bảng kết quả lần đo gần nhất

--[[
	Đọc chỉ số tức thời một lần. Luôn an toàn, không throw.
]]
function Measure.Instant()
	local runService = Core_Env.GetService("RunService")

	local frameTimeMs, frameOk = 0, false
	if runService ~= nil then
		local ok, value = pcall(function() return runService:GetRenderStepTime() end)
		if ok and type(value) == "number" and value == value then
			frameTimeMs = value * 1000
			frameOk = true
		end
	end

	local gcKb, gcOk = 0, false
	if collectgarbage ~= nil then
		local ok2, value2 = pcall(collectgarbage, "count")
		if ok2 and type(value2) == "number" then
			gcKb = value2
			gcOk = true
		end
	end

	local statsFps, statsOk = Measure.ReadStatsFps()

	return {
		frameTimeMs = frameTimeMs,
		frameTimeAvailable = frameOk,
		fps = frameOk and frameTimeMs > 0 and (1000 / frameTimeMs) or 0,
		gcHeapKb = gcKb,
		gcAvailable = gcOk,
		statsFps = statsFps,
		statsAvailable = statsOk,
		time = Core_Env.now(),
	}
end

--[[
	Đọc FPS do engine báo cáo, nếu có. Roblox khóa service `Stats` ở nhiều
	ngữ cảnh nên hàm này luôn pcall và trả về nil khi không đọc được.
]]
function Measure.ReadStatsFps(): (number?, boolean)
	local stats = Core_Env.GetService("Stats")
	if stats == nil then return nil, false end
	local ok, workspaceStats = pcall(function() return stats.Workspace end)
	if not ok or workspaceStats == nil then return nil, false end
	local ok2, fps = pcall(function() return workspaceStats.FramesPerSecond end)
	if not ok2 or type(fps) ~= "number" then return nil, false end
	return fps, true
end

--[[
	Đếm "đối tượng đang được render" — chỉ số ngữ cảnh, KHÔNG phải chỉ số
	chất lượng. Dùng để giải thích vì sao kết quả giữa hai lần đo khác nhau.
]]
function Measure.WorldStats()
	local game = Core_Env.game
	if game == nil then return { scanned = 0, note = "no DataModel" } end

	local scanned, parts, shadowCasters, emitters, characters = 0, 0, 0, 0, 0
	local ok, err = pcall(function()
		-- Gán ra biến local trước khi lặp: vừa dễ đọc, vừa tránh một khác biệt
		-- của máy ảo Lua khi method được phân giải qua __index ngay trong
		-- biểu thức for-in (harness fengari báo lỗi ở dạng viết inline).
		local descendants = game:GetDescendants()
		scanned = #descendants
		for _, instance in descendants do
			local className = instance.ClassName
			if className == "Part" or className == "MeshPart" or className == "UnionOperation" then
				parts += 1
				local okCast, cast = pcall(function() return instance.CastShadow end)
				if okCast and cast then shadowCasters += 1 end
			elseif className == "ParticleEmitter" then
				emitters += 1
			elseif className == "Model" then
				local okHum = pcall(function() return instance:FindFirstChildOfClass("Humanoid") end)
				if okHum then characters += 1 end
			end
		end
	end)

	if not ok then
		Util_Log.Warn(SCOPE, "không quét được thế giới:", tostring(err))
		return { scanned = scanned, note = "partial", error = tostring(err) }
	end

	return {
		scanned = scanned,
		parts = parts,
		shadowCasters = shadowCasters,
		particleEmitters = emitters,
		characters = characters,
	}
end

--[[
	Đo trong `durationSeconds` giây.
	options = {
		label       = "baseline" | "after",
		window      = kích thước ring buffer (mặc định 180),
		onSample    = function(instant, index) — hook cho UI
	}
]]
function Measure.Run(durationSeconds: number, options: any)
	options = options or {}
	local duration = math.max(0.1, durationSeconds or 1.0)
	local runService = Core_Env.GetService("RunService")

	local perf = Core_Perf.New(options.window or 180)
	Measure.live = perf

	local startedAt = Core_Env.now()
	local meta = {
		label = options.label or "sample",
		duration = duration,
		source = "none",
		samples = 0,
		statsCrossCheck = nil,
		note = nil,
	}

	local connection = nil
	if runService ~= nil and runService.RenderStepped ~= nil then
		meta.source = "RenderStepped"
		connection = runService.RenderStepped:Connect(function(deltaTime: number)
			if deltaTime ~= nil and deltaTime > 0 then
				perf:Push(deltaTime * 1000)
				meta.samples += 1
				if options.onSample then
					options.onSample(Measure.Instant(), meta.samples)
				end
			end
		end)
	elseif runService ~= nil and runService.Heartbeat ~= nil then
		meta.source = "Heartbeat (fallback)"
		connection = runService.Heartbeat:Connect(function(deltaTime: number)
			if deltaTime ~= nil and deltaTime > 0 then
				perf:Push(deltaTime * 1000)
				meta.samples += 1
			end
		end)
	else
		meta.note = "runtime không có RenderStepped/Heartbeat -> không có số đo khung hình"
		Util_Log.Warn(SCOPE, meta.note)
	end

	-- Chờ đủ thời lượng bằng đồng hồ của runtime (task.wait thật trong Roblox)
	Core_Env.Wait(duration)

	if connection ~= nil then
		connection:Disconnect()
	end

	local endedAt = Core_Env.now()
	meta.elapsed = endedAt - startedAt

	local summary = perf:Summarize("ms")
	local gcKb, gcOk = 0, false
	if collectgarbage ~= nil then
		local ok, value = pcall(collectgarbage, "count")
		if ok and type(value) == "number" then gcKb, gcOk = value, true end
	end

	local statsFps, statsOk = Measure.ReadStatsFps()
	if statsOk then
		meta.statsCrossCheck = statsFps
	end
	if meta.source ~= "none" and meta.samples == 0 then
		meta.note = "có kết nối signal nhưng không nhận được mẫu nào"
	end

	local result = {
		meta = meta,
		frame = summary,
		fps = {
			mean = summary.fps_mean or 0,
			p1   = summary.fps_p1 or 0,
			p5   = summary.fps_p5 or 0,
			p50  = summary.fps_p50 or 0,
			min  = summary.fps_min or 0,
		},
		frameTimeMs = {
			mean = summary.mean,
			p95  = summary.p95,
			max  = summary.max,
		},
		gcHeapKb = gcKb,
		gcAvailable = gcOk,
		statsFps = statsFps,
		statsAvailable = statsOk,
		world = Measure.WorldStats(),
		time = endedAt,
	}

	Measure.last = result
	Util_Log.Info(SCOPE, ("đo '%s' xong: %d mẫu trong %.2fs (nguồn: %s)")
		:format(meta.label, meta.samples, meta.elapsed, meta.source))
	return result
end

--[[
	So sánh hai lần đo. CHỈ tính toán từ số liệu thật đã truyền vào.
	Nếu một bên không có mẫu, trả về valid = false và nêu lý do — không suy diễn.
]]
function Measure.Compare(before: any, after: any)
	local out = {
		valid = true,
		reason = nil,
		rows = {},
	}

	if before == nil or after == nil then
		out.valid = false
		out.reason = "thiếu dữ liệu before/after"
		return out
	end
	if (before.meta and before.meta.samples or 0) == 0
		or (after.meta and after.meta.samples or 0) == 0 then
		out.valid = false
		out.reason = "một trong hai lần đo có 0 mẫu khung hình -> không kết luận được"
		return out
	end

	local function deltaRow(label, beforeValue, afterValue, formatter, betterWhenLower)
		local diff = afterValue - beforeValue
		local pct = beforeValue ~= 0 and (diff / beforeValue) * 100 or 0
		out.rows[#out.rows + 1] = {
			label = label,
			before = formatter(beforeValue),
			after = formatter(afterValue),
			delta = ("%+.1f%%"):format(pct),
			better = betterWhenLower and diff < 0 or (not betterWhenLower and diff > 0),
			rawBefore = beforeValue,
			rawAfter = afterValue,
			pct = pct,
		}
	end

	local function f1(v: number) return ("%.1f"):format(v) end
	local function f0(v: number) return ("%.0f"):format(v) end

	deltaRow("FPS trung bình", before.fps.mean, after.fps.mean, f1, false)
	deltaRow("FPS p1 (tệ nhất)", before.fps.p1, after.fps.p1, f1, false)
	deltaRow("FPS p5", before.fps.p5, after.fps.p5, f1, false)
	deltaRow("Frame time TB (ms)", before.frameTimeMs.mean, after.frameTimeMs.mean, f1, true)
	deltaRow("Frame time p95 (ms)", before.frameTimeMs.p95, after.frameTimeMs.p95, f1, true)

	if before.gcAvailable and after.gcAvailable then
		deltaRow("Luau heap (MB)", before.gcHeapKb / 1024, after.gcHeapKb / 1024, f1, true)
	end

	out.summary = {}
	local improved, regressed = 0, 0
	for _, row in out.rows do
		if row.better then improved += 1 else regressed += 1 end
	end
	out.summary.improved = improved
	out.summary.regressed = regressed
	out.summary.verdict = improved > regressed and "improved"
		or (regressed > improved and "regressed" or "unchanged")

	out.summary.baselineSamples = before.meta.samples
	out.summary.afterSamples = after.meta.samples
	out.summary.durationBefore = before.meta.duration
	out.summary.durationAfter = after.meta.duration

	return out
end

-- Bản in ra Output (dùng khi không có UI hoặc muốn log đầy đủ).
function Measure.FormatComparison(comparison: any): { string }
	local rows = { { "Chỉ số", "Trước", "Sau", "Thay đổi" } }
	for _, row in comparison.rows do
		rows[#rows + 1] = { row.label, row.before, row.after, row.delta }
	end
	local lines = Util_Log.FormatRows(rows)
	table.insert(lines, 1, ("Kết luận: %s (cải thiện %d/%d chỉ số)")
		:format(comparison.summary.verdict, comparison.summary.improved, #comparison.rows))
	table.insert(lines, 2, ("Số mẫu: trước=%d (%.1fs) sau=%d (%.1fs)")
		:format(comparison.summary.baselineSamples, comparison.summary.durationBefore,
			comparison.summary.afterSamples, comparison.summary.durationAfter))
	return lines
end

return Measure
