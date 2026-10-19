--[[
	doors-entity-radar/src/Shared/Config.luau
	ModuleScript — đặt tại: ReplicatedStorage.DoorsEntityRadar.Shared.Config

	CẤU HÌNH DUY NHẤT CỦA DỰ ÁN. Mọi con số có thể chỉnh đều nằm ở đây;
	không tệp nào được hard-code ngưỡng riêng.

	NHÓM QUAN TRỌNG NHẤT: Config.Detection.
	  * confirmedPatterns — tên instance BẠN đã tự xác minh trong game.
	    Chỉ những tên này mới cho phép trạng thái "Không phát hiện";
	    ngoài ra hệ thống chỉ dám nói "Chưa xác minh".
	  * unsupported       — ép một mục thành "Không hỗ trợ phát hiện".
	  * extraPatterns     — thêm mẫu tên cho một mục có sẵn.
	  * developerBridge   — chỉ dùng nếu BẠN là người có quyền sửa game
	    và chủ động phát dữ liệu (xem Server/Diagnostics.luau).
]]

local Areas = __DER_REQUIRE("Shared/Areas")

local Config = {}

Config.Meta = {
	name = "DOORS Entity Radar",
	version = "1.0.0",
	-- Ghi rõ bản chất để không ai hiểu nhầm đây là công cụ can thiệp game.
	purpose = "Bảng thông tin/danh mục và định vị THỤ ĐỘNG từ dữ liệu client hợp lệ.",
}

Config.Log = {
	-- "error" | "warn" | "info" | "debug"
	level = "info",
	-- Số dòng giữ lại cho tab "Nhật ký" trên giao diện (vòng lưu trữ).
	historySize = 60,
}

Config.System = {
	-- Tự khởi động khi vào game. Đặt false nếu muốn bấm nút mới chạy.
	autoStart = true,
	-- Phím bật/tắt bảng điều khiển.
	toggleKeyCode = Enum.KeyCode.F2,
	-- Có tạo nút cảm ứng trên thiết bị di động không (ContextActionService).
	allowTouchToggle = true,
	-- Khu vực được chọn sẵn khi mở UI lần đầu. "all" = tất cả.
	defaultAreaId = "all",
	-- Bao lâu thì coi dữ liệu là CŨ (giây). Dữ liệu cũ vẫn hiện nhưng bị
	-- gắn nhãn, không bao giờ được trình bày như dữ liệu trực tiếp.
	staleAfterSeconds = 3.0,
	-- Chu kỳ cập nhật đồng hồ "cập nhật lần cuối" trên UI (giây).
	clockRefreshSeconds = 1.0,
	--[[
		Ghi một dòng nhật ký khi MỘT MỤC ĐANG THEO DÕI chuyển sang/thoát khỏi
		"Đã phát hiện". Chỉ áp dụng cho mục bạn tự bật theo dõi; không theo dõi
		thì không có dòng nào được ghi (không làm trôi Output).
	]]
	alertOnTrack = true,
}

Config.Scan = {
	-- Bật cơ chế quét instance. Tắt = hệ thống chỉ còn là danh mục.
	enabled = true,
	-- Gốc quét. Chỉ hỗ trợ "Workspace": quét ReplicatedStorage dễ đụng
	-- dữ liệu không liên quan và tốn ngân sách vô ích.
	root = "Workspace",
	-- Trần số descendant được duyệt trong MỘT lần quét đầy đủ.
	-- Vượt trần -> quét bị cắt và UI báo "kết quả có thể thiếu" (không im lặng).
	maxDescendantsPerFullScan = 20000,
	-- Số descendant xử lý mỗi nhịp (tránh khựng một khung hình).
	descendantsPerStep = 1200,
	-- Giãn cách tối thiểu giữa hai lần quét đầy đủ (giây).
	fullScanIntervalSeconds = 2.5,
	-- Số instance khớp tối đa giữ cho mỗi mục (chống phình bộ nhớ).
	maxMatchesPerEntity = 8,
	-- Khoảng cách tối đa còn coi là "đáng quan tâm" (stud). Ngoài ngưỡng
	-- vẫn được ghi nhận nhưng UI xếp xuống cuối và ghi rõ khoảng cách.
	interestingDistance = 400,
	-- Tên instance bỏ qua tuyệt đối (chữ thường, đã chuẩn hoá tuỳ chọn).
	ignoreNames = {},
	-- Chu kỳ cập nhật vị trí của các mục ĐÃ khớp (giây). Nhỏ hơn chu kỳ
	-- quét đầy đủ vì bước này chỉ đọc vài instance, rất rẻ.
	refreshMatchesSeconds = 0.5,
}

Config.Detection = {
	--[[
		Tên instance đã xác minh. Cách dùng:
		  1. Vào game, mở Output, chạy Script chẩn đoán (Server/Diagnostics)
		     hoặc tự in tên các instance con của Workspace.
		  2. Chép đúng tên instance vào đây, ví dụ { "Rush", "RushMoving" }.
		  3. Mục danh mục tương ứng mới được phép báo "Không phát hiện".
		Để rỗng = toàn bộ kết quả "không thấy" đều hiển thị "Chưa xác minh".
	]]
	confirmedPatterns = {},

	-- Ép mục thành không hỗ trợ phát hiện, ví dụ { "portrait" = "Là tranh tĩnh, không cần định vị" }.
	unsupported = {},

	-- Thêm mẫu tên cho mục có sẵn, ví dụ { rush = { "rushmoving" } }.
	extraPatterns = {},

	-- Ép trạng thái mẫu đã xác minh cho một mục cụ thể (id -> true).
	confirmedEntities = {},

	--[[
		CẦU DỮ LIỆU NHÀ PHÁT TRIỂN (tuỳ chọn, mặc định TẮT).
		Chỉ bật nếu bạn có quyền sửa game và tự phát dữ liệu, ví dụ đặt
		Attribute lên một Folder:
		  workspace.DER_Bridge:SetAttribute("DER_entity_rush", "12.5,4.0,-88.25")
		Khi đó trạng thái có source = "developer" và được coi là dữ liệu
		hợp lệ do nhà phát triển cung cấp — KHÔNG phải suy đoán.
	]]
	developerBridge = {
		enabled = false,
		-- Folder chứa Attribute; đường dẫn từ Workspace.
		folderName = "DER_Bridge",
		-- Tiền tố Attribute, dạng <prefix>entity_<id> = "x,y,z".
		attributePrefix = "DER_",
	},
}

Config.Ui = {
	-- Bật giao diện. Tắt thì hệ thống vẫn chạy nền và ghi log.
	enabled = true,
	-- Các khối có thể bật/tắt độc lập mà không làm hỏng hệ thống.
	showSearch = true,
	showAreaFilter = true,
	showDetailPanel = true,
	showStatusBar = true,
	showCounters = true,
	-- Thanh chứa các nút chọn/bỏ chọn và bộ đếm "Đã chọn x/y".
	showSelectionBar = true,
	-- Kích thước bảng trên màn hình rộng (pixel).
	panelWidth = 760,
	panelHeight = 520,
	-- Dưới ngưỡng này coi là màn hình hẹp (điện thoại): xếp dọc, thu nhỏ chữ.
	narrowViewportWidth = 700,
	-- Số dòng tối đa hiển thị trong danh sách (phần còn lại cuộn).
	maxVisibleRows = 40,
	-- Vị trí neo bảng.
	anchor = "center",

	--[[
		HỆ THỐNG TAB.
		  showTabs       — bật thanh tab (tắt thì giao diện về dạng một màn hình).
		  defaultTab     — tab mở đầu. Phải là id có thật trong Ui.TABS.
		  enableDrag     — cho phép kéo thả bảng bằng thanh tiêu đề.
		  startMinimized — mở ở trạng thái thu nhỏ (chỉ còn thanh tiêu đề).
		  selectionFilter— bộ lọc mặc định của danh sách: "all" | "selected" | "unselected".
	]]
	showTabs = true,
	defaultTab = "home",
	enableDrag = true,
	startMinimized = false,
	selectionFilter = "all",
}

--[[
	DANH SÁCH TAB (nguồn dữ liệu DUY NHẤT cho thanh điều hướng).
	UI đọc bảng này để dựng nút — thêm tab mới thì chỉ cần thêm một dòng ở đây,
	không phải sửa code dựng giao diện.

	kind:
	  "home"     — trang tổng quan (trạng thái + thao tác nhanh)
	  "area"     — danh sách thực thể của MỘT khu vực (area = id trong Areas)
	  "selected" — tổng hợp các mục người dùng đã chọn
	  "settings" — tuỳ chọn giao diện/hành vi
	  "log"      — nhật ký hoạt động
]]
Config.Ui.TABS = {
	{ id = "home", label = "Trang chủ", kind = "home" },
	-- Tab "Tất cả" GIỮ LẠI tính năng cũ của dải lọc khu vực: xem cả 82 mục
	-- trong một danh sách. area = "all" nghĩa là không lọc theo khu vực.
	{ id = "all", label = "Tất cả", kind = "area", area = "all" },
	{ id = "hotel", label = "The Hotel", kind = "area", area = "hotel" },
	{ id = "mines", label = "The Mines", kind = "area", area = "mines" },
	{ id = "backdoor", label = "The Backdoor", kind = "area", area = "backdoor" },
	{ id = "archives", label = "The Archives", kind = "area", area = "archives" },
	{ id = "outdoors", label = "The Outdoors", kind = "area", area = "outdoors" },
	{ id = "stairwell", label = "The Stairwell", kind = "area", area = "stairwell" },
	{ id = "rooms", label = "The Rooms", kind = "area", area = "rooms" },
	{ id = "events", label = "Sự kiện đặc biệt", kind = "area", area = "events" },
	{ id = "selected", label = "Đã chọn", kind = "selected" },
	{ id = "settings", label = "Cài đặt", kind = "settings" },
	{ id = "log", label = "Nhật ký", kind = "log" },
}

-- Tra tab theo id. Trả về nil nếu id lạ (người gọi phải xử lý, không đoán).
function Config.GetTab(tabId)
	if type(tabId) ~= "string" then
		return nil
	end
	for _, tab in ipairs(Config.Ui.TABS) do
		if tab.id == tabId then
			return tab
		end
	end
	return nil
end

--[[
	TỰ KIỂM TRA CẤU HÌNH. Trả về (ok, problems).
	Gọi trước khi khởi động: cấu hình sai thì dừng và nói rõ sai ở đâu,
	thay vì chạy với giá trị lạ rồi sinh kết quả khó hiểu.
]]
function Config.Validate()
	local problems = {}

	local function requireNumber(path, value, minValue)
		if type(value) ~= "number" then
			problems[#problems + 1] = path .. " phải là số, nhận " .. type(value)
			return
		end
		if value ~= value then
			problems[#problems + 1] = path .. " là NaN"
			return
		end
		if minValue ~= nil and value < minValue then
			problems[#problems + 1] = ("%s phải >= %s, nhận %s"):format(path, tostring(minValue), tostring(value))
		end
	end

	local function requireBoolean(path, value)
		if type(value) ~= "boolean" then
			problems[#problems + 1] = path .. " phải là true/false, nhận " .. type(value)
		end
	end

	local function requireTable(path, value)
		if type(value) ~= "table" then
			problems[#problems + 1] = path .. " phải là bảng, nhận " .. type(value)
		end
	end

	requireBoolean("System.autoStart", Config.System.autoStart)
	requireNumber("System.staleAfterSeconds", Config.System.staleAfterSeconds, 0.1)
	requireNumber("System.clockRefreshSeconds", Config.System.clockRefreshSeconds, 0.1)

	requireBoolean("Scan.enabled", Config.Scan.enabled)
	requireNumber("Scan.maxDescendantsPerFullScan", Config.Scan.maxDescendantsPerFullScan, 1)
	requireNumber("Scan.descendantsPerStep", Config.Scan.descendantsPerStep, 1)
	requireNumber("Scan.fullScanIntervalSeconds", Config.Scan.fullScanIntervalSeconds, 0.05)
	requireNumber("Scan.refreshMatchesSeconds", Config.Scan.refreshMatchesSeconds, 0.05)
	requireNumber("Scan.maxMatchesPerEntity", Config.Scan.maxMatchesPerEntity, 1)
	requireTable("Scan.ignoreNames", Config.Scan.ignoreNames)

	if Config.Scan.descendantsPerStep > Config.Scan.maxDescendantsPerFullScan then
		problems[#problems + 1] = "Scan.descendantsPerStep lớn hơn Scan.maxDescendantsPerFullScan (vô nghĩa)"
	end
	if Config.Scan.refreshMatchesSeconds > Config.Scan.fullScanIntervalSeconds then
		-- Không phải lỗi chí mạng nhưng chắc chắn là cấu hình nhầm.
		problems[#problems + 1] = "Scan.refreshMatchesSeconds lớn hơn Scan.fullScanIntervalSeconds"
	end

	requireTable("Detection.confirmedPatterns", Config.Detection.confirmedPatterns)
	requireTable("Detection.unsupported", Config.Detection.unsupported)
	requireTable("Detection.extraPatterns", Config.Detection.extraPatterns)
	requireTable("Detection.confirmedEntities", Config.Detection.confirmedEntities)
	requireBoolean("Detection.developerBridge.enabled", Config.Detection.developerBridge.enabled)

	requireBoolean("Ui.enabled", Config.Ui.enabled)
	requireNumber("Ui.panelWidth", Config.Ui.panelWidth, 100)
	requireNumber("Ui.panelHeight", Config.Ui.panelHeight, 100)
	requireNumber("Ui.maxVisibleRows", Config.Ui.maxVisibleRows, 1)

	local validAnchors = { center = true, topLeft = true, topRight = true, bottomRight = true }
	if not validAnchors[Config.Ui.anchor] then
		problems[#problems + 1] = "Ui.anchor lạ: " .. tostring(Config.Ui.anchor)
	end

	-- Nhóm tab/lựa chọn: cấu hình sai thì báo rõ, không âm thầm dùng giá trị lạ.
	requireBoolean("Ui.showTabs", Config.Ui.showTabs)
	requireBoolean("Ui.enableDrag", Config.Ui.enableDrag)
	requireBoolean("Ui.startMinimized", Config.Ui.startMinimized)
	requireNumber("Log.historySize", Config.Log.historySize, 1)
	requireBoolean("System.alertOnTrack", Config.System.alertOnTrack)

	if Config.GetTab(Config.Ui.defaultTab) == nil then
		problems[#problems + 1] = "Ui.defaultTab lạ: " .. tostring(Config.Ui.defaultTab)
	end

	local validSelectionFilters = { all = true, selected = true, unselected = true }
	if not validSelectionFilters[Config.Ui.selectionFilter] then
		problems[#problems + 1] = "Ui.selectionFilter lạ: " .. tostring(Config.Ui.selectionFilter)
	end

	-- Danh sách tab: id duy nhất, khu vực phải có thật.
	do
		local seenTabs = {}
		for _, tab in ipairs(Config.Ui.TABS) do
			if type(tab.id) ~= "string" or tab.id == "" then
				problems[#problems + 1] = "Ui.TABS có mục thiếu id"
			elseif seenTabs[tab.id] then
				problems[#problems + 1] = "Ui.TABS trùng id: " .. tab.id
			else
				seenTabs[tab.id] = true
			end
			-- "all" là giá trị hợp lệ của tab khu vực (nghĩa là không lọc).
			if tab.kind == "area" and tab.area ~= "all" and Areas.IsValid(tab.area) ~= true then
				problems[#problems + 1] = ("Ui.TABS '%s' trỏ tới khu vực không tồn tại: %s")
					:format(tostring(tab.id), tostring(tab.area))
			end
		end
		-- Mỗi khu vực phải có ĐÚNG MỘT tab, nếu không sẽ có khu vực không xem được.
		for _, areaId in ipairs(Areas.GetOrderedIds()) do
			if seenTabs[areaId] ~= true then
				problems[#problems + 1] = "Ui.TABS thiếu tab cho khu vực: " .. areaId
			end
		end
	end

	return #problems == 0, problems
end

return Config
