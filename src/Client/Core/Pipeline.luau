--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  CFG-001, LOOP-005, MEAS-001, MEAS-003, MEAS-007, REC-003 
	===== RALO.METHODS:END ===== --]]

--[[
	Client/Core/Pipeline.luau
	===== RALO.METHODS:CFG-001, LOOP-005, MEAS-001, MEAS-003, MEAS-007, REC-003 =====

	Dàn nhạc của toàn bộ chương trình:

	  1. ĐO TRƯỚC                    (Measure.Run baselineSeconds)
	  2. lập kế hoạch theo cấu hình  (Plan.Build)
	  3. dựng GUI + thanh tiến trình (Ui/Notifier, Ui/Progress)
	  4. thực thi từng bước          (Runner.Execute)
	  5. nghỉ settle
	  6. ĐO SAU                      (Measure.Run afterSeconds)
	  7. so sánh, in Output + hiện GUI (Measure.Compare)

	HAI NGUYÊN TẮC KHÔNG ĐƯỢC VI PHẠM:
	  * Không bước nào sinh số liệu giả. Nếu không đo được (0 mẫu),
	    pipeline nói rõ "không kết luận được" thay vì in ra con số.
	  * Thất bại KHÔNG được trình bày như thành công. Nếu có bước lỗi,
	    GUI chuyển sang trạng thái lỗi thật và Output ghi rõ lỗi.
]]

local Core_Env = __RALO_REQUIRE("Client/Core/Env")
local Core_Measure = __RALO_REQUIRE("Client/Core/Measure")
local Core_Plan = __RALO_REQUIRE("Client/Core/Plan")
local Core_Restore = __RALO_REQUIRE("Client/Core/Restore")
local Core_Runner = __RALO_REQUIRE("Client/Core/Runner")
local Shared_Config = __RALO_REQUIRE("Shared/Config")
local Shared_Log = __RALO_REQUIRE("Shared/Log")
local Shared_Safe = __RALO_REQUIRE("Shared/Safe")
local Shared_Types = __RALO_REQUIRE("Shared/Types")
local Ui_Notifier = __RALO_REQUIRE("Client/Ui/Notifier")
local Ui_Progress = __RALO_REQUIRE("Client/Ui/Progress")

local SCOPE = "Pipeline"

local Pipeline = {}

Pipeline.lastResult = nil

--[[
	Tìm nơi treo GUI.
	LocalScript -> Players.LocalPlayer.PlayerGui (đây là đường ĐÚNG duy nhất
	cho LocalScript; CoreGui không ghi được từ LocalScript thường).
]]
function Pipeline.GetGuiParent()
	local players = Core_Env.GetService("Players")
	if players ~= nil then
		local ok, player = pcall(function()
			return players.LocalPlayer
		end)
		if ok and player ~= nil then
			local okGui, playerGui = pcall(function()
				return player:FindFirstChildOfClass("PlayerGui")
			end)
			if okGui and playerGui ~= nil then
				return playerGui
			end
		end
	end
	-- Không có PlayerGui (ví dụ chạy trong harness) -> trả về game để test
	return Core_Env.game
end

-- Dựng bảng kết quả đo từ chỉ số tức thời (dùng khi options.instant = true)
local function instantSnapshot(label)
	local instant = Core_Measure.Instant()
	local value = instant.frameTimeMs
	return {
		meta = {
			label = label,
			samples = instant.frameTimeAvailable and 1 or 0,
			duration = 0,
			source = "instant",
			note = "chỉ số tức thời một lần đọc, KHÔNG phải phân bố khung hình",
		},
		frame = { mean = value, p95 = value, max = value },
		fps = {
			mean = instant.fps, p1 = instant.fps, p5 = instant.fps, p50 = instant.fps, min = instant.fps,
		},
		frameTimeMs = { mean = value, p95 = value, max = value },
		gcHeapKb = instant.gcHeapKb,
		gcAvailable = instant.gcAvailable,
		statsFps = instant.statsFps,
		statsAvailable = instant.statsAvailable,
		world = Core_Measure.WorldStats(),
		time = instant.time,
	}
end

--[[
	options = {
		profile = bảng cấu hình (mặc định Shared_Config.PROFILE)
		buildUi = true/false (mặc định true)
		onPhase = function(phase, payload)
		instant = true -> bỏ qua lấy mẫu khung hình, chỉ đọc chỉ số tức thời
	}
	Trả về bảng kết quả. KHÔNG throw: lỗi được bắt và ghi vào result.error.
]]
function Pipeline.Run(options)
	options = options or {}
	local profile = options.profile or Shared_Config.PROFILE
	local buildUi = options.buildUi
	if buildUi == nil then
		buildUi = true
	end
	local onPhase = options.onPhase or function() end
	local measure = profile.measure or Shared_Config.PROFILE.measure

	local ok, result = pcall(function()
		onPhase(Shared_Types.PHASE_IDLE, nil)

		------------------------------------------------------ 1. đo TRƯỚC
		onPhase(Shared_Types.PHASE_BASELINE, nil)
		local before
		if options.instant then
			before = instantSnapshot("baseline")
		else
			Shared_Log.Info(SCOPE, ("đang đo nền %.1f giây — đừng làm gì để số đo sạch")
				:format(measure.baselineSeconds))
			before = Core_Measure.Run(measure.baselineSeconds, {
				label = "baseline",
				window = measure.frameWindow,
			})
		end

		------------------------------------------------------ 2. kế hoạch
		local plan = Core_Plan.Build(profile)
		for _, line in ipairs(Core_Plan.Describe(plan)) do
			Shared_Log.Info(SCOPE, line)
		end

		----------------------------------------------------------- 3. GUI
		local progress = Ui_Progress.New(plan.total)
		local notifier = nil
		if buildUi then
			notifier = Ui_Notifier.Build({
				parent = Pipeline.GetGuiParent(),
				progress = progress,
				steps = plan.steps,
				profile = profile,
				onRestore = function(restored, failed)
					if notifier ~= nil then
						notifier:SetResults({
							("đã hoàn tác %d property (lỗi %d)"):format(restored, failed),
							"đồ hoạ đã trở về trạng thái trước khi tối ưu",
						}, "restored")
					end
				end,
			})
		end

		------------------------------------------------------- 4. thực thi
		progress:SetPhase(Shared_Types.PHASE_OPTIMIZING, "đang tối ưu")
		onPhase(Shared_Types.PHASE_OPTIMIZING, plan)

		Core_Runner.Execute(plan, {
			onStep = function(step, index)
				progress:Mark(index, step.status, step.name .. ": " .. tostring(step.detail or ""))
				if notifier ~= nil then
					notifier:SetCurrentTask(step.name)
				end
			end,
		})

		local tally = Core_Runner.Tally(plan)
		Shared_Log.Info(SCOPE, ("thực thi xong: áp dụng %d, bỏ qua %d, lỗi %d, tổng %d thay đổi")
			:format(tally.applied, tally.skipped, tally.failed, tally.changes))

		-------------------------------------------------------- 5. settle
		if measure.settleSeconds > 0 and not options.instant then
			progress:SetPhase(Shared_Types.PHASE_SETTLE, "đang chờ FPS ổn định")
			Core_Env.Wait(measure.settleSeconds)
		end

		----------------------------------------------------- 6. đo SAU
		local after
		if options.instant then
			after = instantSnapshot("after")
		else
			progress:SetPhase(Shared_Types.PHASE_REMEASURE, "đang đo lại")
			Shared_Log.Info(SCOPE, ("đang đo sau tối ưu %.1f giây"):format(measure.afterSeconds))
			after = Core_Measure.Run(measure.afterSeconds, {
				label = "after",
				window = measure.frameWindow,
			})
		end

		----------------------------------------------------- 7. so sánh
		progress:SetPhase(Shared_Types.PHASE_COMPARE, "đang so sánh")
		local comparison = Core_Measure.Compare(before, after)

		local lines
		if comparison.valid then
			lines = Core_Measure.FormatComparison(comparison)
		else
			lines = {
				"Không kết luận được: " .. tostring(comparison.reason),
				("mẫu trước=%d, mẫu sau=%d")
					:format(before.meta.samples or 0, after.meta.samples or 0),
				"Chạy lại ở nơi có cảnh nặng hơn, hoặc tăng baselineSeconds/afterSeconds.",
			}
		end

		-- In ra Output: bản ghi đầy đủ, kể cả khi GUI đã ẩn
		Shared_Log.Info(SCOPE, "=== KẾT QUẢ ĐO TRƯỚC / SAU ===")
		for _, line in ipairs(lines) do
			Shared_Log.Info(SCOPE, line)
		end
		Shared_Log.Info(SCOPE, ("nguồn số liệu: trước=%s, sau=%s")
			:format(tostring(before.meta.source), tostring(after.meta.source)))

		-- THẤT BẠI KHÔNG ĐƯỢC TRÌNH BÀY NHƯ THÀNH CÔNG
		local verdict
		if tally.failed > 0 then
			verdict = "error"
			lines[#lines + 1] = ("CÓ %d BƯỚC LỖI — xem Output để biết chi tiết"):format(tally.failed)
		elseif comparison.valid then
			verdict = comparison.summary.verdict
		end

		if notifier ~= nil then
			notifier:SetResults(lines, verdict)
		end
		progress:SetPhase(Shared_Types.PHASE_DONE, "hoàn tất")
		onPhase(Shared_Types.PHASE_DONE, comparison)

		return {
			version = Shared_Config.VERSION,
			environment = Core_Env.mode,
			before = before,
			after = after,
			comparison = comparison,
			plan = plan,
			tally = tally,
			restoreEntries = Core_Restore.Count(),
			logLines = lines,
			safeRecords = #Shared_Safe.Records,
			verdict = verdict,
			error = nil,
		}
	end)

	if not ok then
		-- Lỗi thật: ghi log, báo GUI bằng trạng thái LỖI, và trả về error
		Shared_Log.Error(SCOPE, "pipeline lỗi: " .. tostring(result))
		local notifier = nil
		local okNotifier, built = pcall(function()
			return Ui_Notifier.Get()
		end)
		if okNotifier then
			notifier = built
		end
		if notifier ~= nil then
			pcall(function()
				notifier:SetResults({ "Tối ưu thất bại.", tostring(result) }, "error")
			end)
		end
		Pipeline.lastResult = { verdict = "error", error = tostring(result) }
		return Pipeline.lastResult
	end

	Pipeline.lastResult = result
	return result
end

--[[
	Hoàn tác mọi thay đổi mà hệ thống đã thực hiện.
	Trả về: số property đã khôi phục, số lần thất bại.
]]
function Pipeline.Restore()
	return Core_Restore.All()
end

-- Dừng hẳn hệ thống: ngắt kết nối, huỷ GUI, giải phóng bộ lập lịch.
function Pipeline.Shutdown()
	local notifier = Ui_Notifier.Get()
	if notifier ~= nil then
		notifier:Destroy()
	end
	return true
end

return Pipeline
