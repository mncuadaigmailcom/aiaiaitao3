--[[
	doors-entity-radar/src/Client/Core/SelfCheck.luau
	ModuleScript — đặt tại: DoorsEntityRadar.Client.Core.SelfCheck

	TỰ KIỂM TRA TRƯỚC KHI CHẠY. Yêu cầu "chỉ báo hoàn thành khi chức năng
	tương ứng đã được kiểm tra" được thực hiện ở đây: mỗi hạng mục có id,
	kết quả và chi tiết, và UI in đúng bảng này thay vì một lời khẳng định.

	severity:
	  "error" — không đạt thì KHÔNG được báo là hệ thống sẵn sàng
	  "warn"  — chạy được nhưng thiếu một khả năng (ví dụ không có camera
	            thì không tính được hướng). Phải hiện rõ, không được giấu.
]]

local Shared_Config = __DER_REQUIRE("Shared/Config")
local Shared_Catalog = __DER_REQUIRE("Shared/EntityCatalog")
local Shared_Areas = __DER_REQUIRE("Shared/Areas")
local Client_Matcher = __DER_REQUIRE("Client/Core/Matcher")

local SelfCheck = {}

-- Dựng một báo cáo rỗng.
function SelfCheck.NewReport()
	return { items = {}, errors = 0, warnings = 0, ok = false, finishedAt = nil }
end

local function addItem(report, id, label, severity, ok, detail)
	report.items[#report.items + 1] = {
		id = id,
		label = label,
		severity = severity,
		ok = ok == true,
		detail = tostring(detail),
	}
	if ok then
		return
	end
	if severity == "error" then
		report.errors = report.errors + 1
	else
		report.warnings = report.warnings + 1
	end
end

--[[
	CHẠY TOÀN BỘ KIỂM TRA.
	deps = { env, scanner, scheduler, guiParent }  (mọi trường đều tuỳ chọn;
	thiếu trường nào thì hạng mục tương ứng báo thiếu, không ném lỗi).
]]
function SelfCheck.Run(deps)
	deps = deps or {}
	local report = SelfCheck.NewReport()

	-- 1) Cấu hình
	local configOk, configProblems = Shared_Config.Validate()
	addItem(report, "config", "Cấu hình hợp lệ", "error", configOk,
		configOk and "Config.Validate() đạt." or ("Config sai: " .. table.concat(configProblems, " | ")))

	-- 2) Danh mục
	local catalogOk, catalogProblems = Shared_Catalog.Validate()
	addItem(report, "catalog", "Danh mục thực thể hợp lệ", "error", catalogOk,
		catalogOk and ("Đạt. %d mục, %d cặp mục-khu vực.")
			:format(Shared_Catalog.Count(), Shared_Catalog.CountMemberships())
			or ("Danh mục sai: " .. table.concat(catalogProblems, " | ")))

	-- 3) Mỗi khu vực phải có mục; khu vực lạ phải bị phát hiện
	local areaCounts = Shared_Catalog.GetAreaCounts()
	local areaDetail = {}
	local areaProblem = nil
	for _, areaId in ipairs(Shared_Areas.GetOrderedIds()) do
		local count = areaCounts[areaId] or 0
		areaDetail[#areaDetail + 1] = ("%s=%d"):format(areaId, count)
		if count == 0 and areaProblem == nil then
			areaProblem = ("khu vực '%s' không có mục nào"):format(areaId)
		end
	end
	addItem(report, "areas", "Phủ đủ khu vực", "error", areaProblem == nil,
		areaProblem or ("Số mục theo khu vực: " .. table.concat(areaDetail, ", ")))

	-- 4) Bộ khớp tên
	local detectionConfig = nil
	if type(deps.config) == "table" then
		detectionConfig = deps.config.Detection
	end
	local matcher = Client_Matcher.Build(detectionConfig)
	local matcherStats = Client_Matcher.Stats(matcher)
	addItem(report, "matcher", "Bộ khớp tên đã dựng", "error",
		matcherStats.entities > 0 and matcherStats.patterns > 0,
		("%d mục quét được, %d mẫu tên, %d luật chứa, %d mục không hỗ trợ, %d mục đã xác minh.")
			:format(matcherStats.entities, matcherStats.patterns, matcherStats.containsRules,
				matcherStats.unsupported, matcherStats.confirmed))

	-- 5) Số mục "đã xác minh" — đây là điều kiện để được nói "Không phát hiện"
	addItem(report, "confirmed", "Có mẫu tên đã xác minh", "warn", matcherStats.confirmed > 0,
		matcherStats.confirmed > 0
			and ("%d mục đã xác minh: được phép kết luận 'Không phát hiện'."):format(matcherStats.confirmed)
			or "Chưa xác minh mẫu nào: mọi kết quả 'không thấy' sẽ hiển thị 'Chưa xác minh'. Thêm tên vào Config.Detection.confirmedPatterns.")

	-- 6) Môi trường
	local env = deps.env
	if env == nil then
		addItem(report, "env", "Môi trường client", "error", false, "Không có Env để kiểm tra.")
	else
		local capabilities = env.Capabilities()
		for _, key in ipairs({ "workspace", "localPlayer", "playerGui", "playerPosition", "camera", "userInput" }) do
			local entry = capabilities[key]
			local severity = "warn"
			if key == "workspace" or key == "localPlayer" then
				severity = "error"
			end
			addItem(report, "env." .. key, "Môi trường: " .. key, severity,
				entry ~= nil and entry.ok, entry ~= nil and entry.detail or "Không có thông tin.")
		end
	end

	-- 7) Scanner
	local scanner = deps.scanner
	if scanner == nil then
		addItem(report, "scanner", "Bộ quét", "error", false, "Chưa tạo Scanner.")
	else
		local stats = scanner:Stats()
		addItem(report, "scanner.attached", "Bộ quét đã gắn vào Workspace", "warn", stats.attached,
			stats.attached and "Đang nghe DescendantAdded/Removing."
				or "Chưa gắn: chỉ dựa vào quét đầy đủ theo chu kỳ.")
		addItem(report, "scanner.enabled", "Cơ chế quét đang bật", "warn",
			not (deps.config and deps.config.Scan and deps.config.Scan.enabled == false),
			(deps.config and deps.config.Scan and deps.config.Scan.enabled == false)
				and "Config.Scan.enabled = false: hệ thống chỉ là danh mục, không định vị."
				or "Đang bật.")
	end

	-- 8) Scheduler
	local scheduler = deps.scheduler
	if scheduler == nil then
		addItem(report, "scheduler", "Bộ lập lịch", "error", false, "Chưa tạo Scheduler.")
	else
		local stats = scheduler:Stats()
		local taskCount = 0
		for _ in pairs(stats.tasks) do
			taskCount = taskCount + 1
		end
		addItem(report, "scheduler.tasks", "Đã đăng ký công việc định kỳ", "error", taskCount > 0,
			("%d công việc; trạng thái '%s'."):format(taskCount, tostring(stats.state)))
		addItem(report, "scheduler.connection", "Chỉ có một connection nền", "error",
			stats.hasConnection == (stats.state == "running"),
			("state=%s, hasConnection=%s, blockedStarts=%d")
				:format(tostring(stats.state), tostring(stats.hasConnection), stats.blockedStarts))
	end

	-- 9) Nơi gắn GUI
	if deps.guiParent ~= nil then
		addItem(report, "guiParent", "Có nơi gắn giao diện", "warn", true, "PlayerGui sẵn sàng.")
	else
		addItem(report, "guiParent", "Có nơi gắn giao diện", "warn", false,
			"Chưa có PlayerGui: hệ thống vẫn chạy nền và ghi log.")
	end

	report.ok = report.errors == 0
	report.finishedAt = os.clock()
	return report
end

-- Tóm tắt một dòng để in ra Output.
function SelfCheck.Summary(report)
	if report == nil then
		return "Chưa chạy tự kiểm tra."
	end
	return ("Tự kiểm tra: %s — %d hạng mục, %d lỗi, %d cảnh báo.")
		:format(report.ok and "ĐẠT" or "CHƯA ĐẠT", #report.items, report.errors, report.warnings)
end

-- Danh sách chuỗi các hạng mục chưa đạt — dùng cho UI và cho test.
function SelfCheck.Failures(report)
	local failures = {}
	if report == nil then
		return failures
	end
	for _, item in ipairs(report.items) do
		if not item.ok then
			failures[#failures + 1] = ("%s [%s]: %s"):format(item.id, item.severity, item.detail)
		end
	end
	return failures
end

return SelfCheck
