--[[
	doors-entity-radar/src/Client/Radar.luau
	ModuleScript — đặt tại: DoorsEntityRadar.Client.Radar (trong StarterPlayerScripts)

	BỘ ĐIỀU PHỐI. Đây là nơi duy nhất biết tất cả các mảnh: SelfCheck,
	Scanner, Tracker, Scheduler, RadarUi. Các mảnh KHÔNG biết nhau.

	VÒNG ĐỜI:
	  new -> Start (kiểm tra rồi mới chạy) -> Pause/Resume -> Stop -> Destroy
	Start chỉ báo "đã chạy" khi SelfCheck không còn lỗi mức error.
]]

local Shared_Log = __DER_REQUIRE("Shared/Log")
local Shared_Safe = __DER_REQUIRE("Shared/Safe")
local Shared_Config = __DER_REQUIRE("Shared/Config")
local Shared_Status = __DER_REQUIRE("Shared/Status")
local Shared_Geometry = __DER_REQUIRE("Shared/Geometry")
local Shared_Catalog = __DER_REQUIRE("Shared/EntityCatalog")
local Client_Env = __DER_REQUIRE("Client/Core/Env")
local Client_Registry = __DER_REQUIRE("Client/Core/Registry")
local Client_Scheduler = __DER_REQUIRE("Client/Core/Scheduler")
local Client_Scanner = __DER_REQUIRE("Client/Core/Scanner")
local Client_Tracker = __DER_REQUIRE("Client/Core/Tracker")
local Client_SelfCheck = __DER_REQUIRE("Client/Core/SelfCheck")
local Client_Selection = __DER_REQUIRE("Client/Core/Selection")
local Client_Matcher = __DER_REQUIRE("Client/Core/Matcher")
local Ui_RadarUi = __DER_REQUIRE("Client/Ui/RadarUi")
local Ui_Theme = __DER_REQUIRE("Client/Ui/Theme")

local Radar = {}
Radar.__index = Radar

Radar.STATE = {
	Stopped = "stopped",
	Running = "running",
	Paused = "paused",
	Faulted = "faulted",
}

function Radar.new(config)
	local self = setmetatable({}, Radar)
	self.config = config or Shared_Config
	self.state = Radar.STATE.Stopped
	self.scanner = Client_Scanner.new(self.config)
	self.tracker = Client_Tracker.new(self.config)
	self.scheduler = Client_Scheduler.new()
	self.ui = nil
	self.report = nil
	self.query = ""
	self.areaId = (self.config.System and self.config.System.defaultAreaId) or "all"
	self.selectedId = nil
	--[[
		LỰA CHỌN và THEO DÕI nằm ở Radar (KHÔNG nằm trong UI) nên:
		  * đổi tab / tìm kiếm / dựng lại giao diện vẫn GIỮ nguyên lựa chọn;
		  * test được bằng Lua thuần;
		  * UI chỉ đọc `selection.ids` để vẽ ô chọn.
		`tracked` là tập con của những mục được bật theo dõi; nó chỉ ảnh hưởng
		nhật ký và dấu hiệu trên UI, KHÔNG đổi trạng thái phát hiện.
	]]
	self.selection = Client_Selection.new()
	self.tracked = {}
	self.trackedCount = 0
	self.tabId = (self.config.Ui and self.config.Ui.defaultTab) or "home"
	self.selectionFilter = (self.config.Ui and self.config.Ui.selectionFilter) or "all"
	self.lastSyncAt = nil
	self.warnings = {}
	self.startedAt = nil
	self.stats = { starts = 0, pauses = 0, resumes = 0, stops = 0, refreshes = 0, syncs = 0, faults = 0 }
	return self
end

function Radar:State()
	return self.state
end

function Radar:IsRunning()
	return self.state == Radar.STATE.Running
end

function Radar:SelfCheckReport()
	return self.report
end

-- Gom cảnh báo từ nhiều nguồn thành một chuỗi ngắn cho thanh trạng thái.
function Radar:_collectWarnings()
	local warnings = {}
	-- Người dùng phải thấy ngay trên UI rằng dữ liệu KHÔNG CÒN TRỰC TIẾP
	-- khi hệ thống tạm dừng hoặc đang lỗi.
	if self.state == Radar.STATE.Paused then
		warnings[#warnings + 1] = "hệ thống tạm dừng nên dữ liệu đã cũ, không còn trực tiếp"
	elseif self.state == Radar.STATE.Faulted then
		warnings[#warnings + 1] = "hệ thống đang lỗi, dữ liệu đã cũ"
	end
	local stats = self.scanner:Stats()
	if stats.truncated then
		warnings[#warnings + 1] = "quét bị cắt ngắn, kết quả có thể thiếu"
	end
	if not stats.attached then
		warnings[#warnings + 1] = "không nghe được sự kiện Workspace"
	end
	local position = Client_Env.GetPlayerPosition()
	if position == nil then
		warnings[#warnings + 1] = "chưa có vị trí người chơi"
	end
	local lookVector = Client_Env.GetCameraBasis()
	if lookVector == nil then
		warnings[#warnings + 1] = "chưa đọc được hướng camera"
	end
	if self.report ~= nil and self.report.warnings > 0 then
		warnings[#warnings + 1] = ("tự kiểm tra còn %d cảnh báo"):format(self.report.warnings)
	end
	self.warnings = warnings
	return table.concat(warnings, "; ")
end

-- Đọc môi trường một lần cho mỗi nhịp (tránh gọi lặp nhiều nơi).
function Radar:_readEnvironment()
	local playerPosition, positionReason = Client_Env.GetPlayerPosition()
	local lookVector, rightVector = Client_Env.GetCameraBasis()
	return {
		playerPosition = playerPosition,
		playerPositionReason = positionReason,
		lookVector = lookVector,
		rightVector = rightVector,
	}
end

-- Một nhịp làm việc: quét -> kết luận -> đẩy lên UI nếu có thay đổi.
function Radar:_tick(now)
	local ok, err = pcall(function()
		local workspace = Client_Env.GetWorkspace()
		if workspace == nil then
			self.tracker:SetFault("Không lấy được Workspace nên không quét được.")
			return
		end

		local scanReport = self.scanner:Update(now)
		local environment = self:_readEnvironment()

		local developerPositions = nil
		local bridge = self.config.Detection and self.config.Detection.developerBridge
		if bridge ~= nil and bridge.enabled == true then
			developerPositions = self.scanner:ReadDeveloperBridge(workspace)
		end

		self.tracker:ClearFault()
		self.tracker:Refresh(now, self.scanner, environment.playerPosition,
			environment.lookVector, environment.rightVector, developerPositions)

		-- Ghi nhật ký cho những mục người dùng ĐANG THEO DÕI (nếu được phép).
		if (self.config.System == nil or self.config.System.alertOnTrack ~= false) then
			self:_drainAlerts(now)
		end

		if self.ui ~= nil and self.tracker:HasDirty() then
			self:_syncUi(now)
		end
		return scanReport
	end)

	if not ok then
		self.stats.faults = self.stats.faults + 1
		self.state = Radar.STATE.Faulted
		self.tracker:SetFault(tostring(err))
		-- Phải Refresh để mọi mục chuyển sang FAULT; nếu không, UI sẽ tiếp
		-- tục hiển thị kết quả của nhịp trước như thể mọi thứ vẫn ổn.
		self.tracker:Refresh(now, nil, nil, nil, nil, nil)
		Shared_Log.Error("nhịp radar lỗi: " .. tostring(err))
		if self.ui ~= nil then
			self:_syncUi(now, true)
		end
	end
	return ok
end

-- Nút "Làm mới": yêu cầu quét đầy đủ và chạy ngay các task.
function Radar:Refresh()
	self.stats.refreshes = self.stats.refreshes + 1
	self.scanner:RequestFullScan()
	local now = os.clock()
	self.scheduler:RunNow("scan", now)
	self:_syncUi(now, true)
	Shared_Log.Info("Đã yêu cầu quét lại theo yêu cầu người dùng.")
	return true
end

function Radar:_syncUi(now, force)
	if self.ui == nil or not self.ui:IsBuilt() then
		return false
	end
	local counts = self.tracker:CountByStatus()
	local age = self.tracker:GetDataAge(now)
	local stale = self.tracker:IsStale(now)

	local stateText, stateColor, primaryLabel = self:_statePresentation()
	-- Tab quyết định tập mục đem hiển thị (UI chỉ lọc thêm theo lựa chọn).
	local rowsArea = self:_rowsArea()
	local rows = self.tracker:BuildView(self.query, rowsArea)

	local view = {
		rows = rows,
		records = self.tracker.states,
		counts = counts,
		selectedId = self.selectedId,
		areaId = self.areaId,
		tabId = self.tabId,
		stateText = stateText,
		stateColor = stateColor,
		primaryLabel = primaryLabel,
		lastUpdateText = age == nil and "chưa có dữ liệu" or Shared_Geometry.FormatAge(age),
		warningText = (stale and "dữ liệu đã cũ; " or "") .. self:_collectWarnings(),
		confirmedIds = self.scanner.matcher and self.scanner.matcher.confirmed or nil,
		-- Lựa chọn/theo dõi: truyền BẢNG DỮ LIỆU, UI không tự quyết định gì.
		selectionIds = self.selection.ids,
		selectedCount = self.selection:Count(),
		selectionFilter = self.selectionFilter,
		scopeCount = #rows,
		trackedIds = self.tracked,
		trackedCount = self.trackedCount,
	}
	self.ui:Sync(view)
	self.tracker:ConsumeDirty()
	self.stats.syncs = self.stats.syncs + 1
	self.lastSyncAt = now
	return true
end

function Radar:_statePresentation()
	if self.state == Radar.STATE.Running then
		return "ĐANG CHẠY", Ui_Theme.Color.ok, "Tạm dừng"
	end
	if self.state == Radar.STATE.Paused then
		return "TẠM DỪNG (dữ liệu không còn trực tiếp)", Ui_Theme.Color.warning, "Tiếp tục"
	end
	if self.state == Radar.STATE.Faulted then
		return "LỖI — xem Output", Ui_Theme.Color.danger, "Khởi động lại"
	end
	return "ĐÃ TẮT", Ui_Theme.Color.textMuted, "Khởi động"
end

--[[
	KHỞI ĐỘNG. Trả về (ok, message).
	Thứ tự: kiểm tra cấu hình/danh mục -> tự kiểm tra môi trường -> gắn quét
	-> đăng ký task -> chạy scheduler -> dựng UI -> đồng bộ lần đầu.
]]
function Radar:Start()
	if self.state == Radar.STATE.Running then
		return false, "Hệ thống đang chạy sẵn."
	end

	-- 1) Cấu hình và danh mục: sai là DỪNG, không chạy liều.
	local configOk, configProblems = Shared_Config.Validate()
	if not configOk then
		Shared_Log.Error("Cấu hình không hợp lệ, từ chối khởi động: " .. table.concat(configProblems, " | "))
		return false, "Cấu hình sai: " .. table.concat(configProblems, "; ")
	end
	Shared_Log.SetLevel((self.config.Log and self.config.Log.level) or "info")

	-- 2) Dựng các mảnh còn thiếu (trường hợp Start lại sau Stop).
	self.scheduler:Reset()
	if self.scanner.matcher == nil then
		self.scanner = Client_Scanner.new(self.config)
	end

	-- 3) Gắn bộ quét vào Workspace.
	local workspace = Client_Env.GetWorkspace()
	local attachOk, attachMessage = self.scanner:Attach(workspace)
	if not attachOk then
		Shared_Log.Warn("Gắn sự kiện Workspace không thành công: " .. tostring(attachMessage))
	end

	-- 4) Đăng ký công việc định kỳ (một lần duy nhất cho mỗi tên).
	local scanConfig = self.config.Scan or {}
	self.scheduler:SetTask("scan", scanConfig.refreshMatchesSeconds or 0.5, function(now)
		self:_tick(now)
	end)
	self.scheduler:SetTask("prune", math.max(2.0, (scanConfig.fullScanIntervalSeconds or 2.5) * 2), function()
		self.scanner:Prune()
	end)
	self.scheduler:SetTask("clock", (self.config.System and self.config.System.clockRefreshSeconds) or 1.0, function(now)
		if self.ui ~= nil and self.ui:IsBuilt() then
			local age = self.tracker:GetDataAge(now)
			local text = ("Cập nhật: %s"):format(age == nil and "chưa có dữ liệu" or tostring(Shared_Geometry.FormatAge(age)))
			self.ui:SetClockText(text)
		end
	end)

	-- 5) Tự kiểm tra TRƯỚC khi tuyên bố đã chạy.
	self.report = Client_SelfCheck.Run({
		config = self.config,
		env = Client_Env,
		scanner = self.scanner,
		scheduler = self.scheduler,
		guiParent = Client_Env.GetPlayerGui(),
	})
	Shared_Log.Info(Client_SelfCheck.Summary(self.report))
	for _, failure in ipairs(Client_SelfCheck.Failures(self.report)) do
		Shared_Log.Warn("  - " .. failure)
	end

	-- 6) Dựng UI (nếu được phép và có nơi gắn).
	if self.config.Ui and self.config.Ui.enabled ~= false then
		self:_buildUi()
	end

	-- 7) Chạy scheduler.
	local startOk, startMessage = self.scheduler:Start()
	if not startOk then
		Shared_Log.Error("Không khởi động được scheduler: " .. tostring(startMessage))
		return false, tostring(startMessage)
	end

	self.state = Radar.STATE.Running
	self.stats.starts = self.stats.starts + 1
	self.startedAt = os.clock()
	self.tracker:SetActive(true)
	self.scanner:RequestFullScan()

	-- 8) Một nhịp ngay để có dữ liệu hiển thị, không chờ tới chu kỳ đầu.
	self:_tick(os.clock())
	self:_syncUi(os.clock(), true)

	if not self.report.ok then
		return false, ("Hệ thống chạy ở chế độ hạn chế. Tự kiểm tra có %d lỗi: %s")
			:format(self.report.errors, table.concat(Client_SelfCheck.Failures(self.report), " | "))
	end
	return true, ("Hệ thống đang chạy. %s"):format(Client_SelfCheck.Summary(self.report))
end

function Radar:_buildUi()
	if self.ui ~= nil and self.ui:IsBuilt() then
		return true
	end
	local playerGui = Client_Env.GetPlayerGui()
	if playerGui == nil then
		Shared_Log.Warn("Không có PlayerGui: bỏ qua giao diện, hệ thống vẫn chạy nền.")
		return false
	end
	-- Đọc kích thước thật của màn hình để UI tự co giãn. Đọc không được thì
	-- bỏ qua (UI sẽ dùng kích thước trong cấu hình) chứ không đoán.
	local viewport = nil
	local camera = Client_Env.GetCamera()
	if camera ~= nil then
		local value, ok = Shared_Safe.Read(camera, "ViewportSize")
		if ok and value ~= nil then
			local okRead, x = pcall(function()
				return value.X
			end)
			if okRead and Shared_Geometry.IsFiniteNumber(x) then
				viewport = value
			end
		end
	end
	self.ui = Ui_RadarUi.new(self.config, {
		onPrimary = function()
			self:Primary()
		end,
		onStop = function()
			self:Stop()
		end,
		onRefresh = function()
			self:Refresh()
		end,
		onClose = function()
			self:SetVisible(false)
		end,
		onSearch = function(text)
			self:SetQuery(text)
		end,
		onArea = function(areaId)
			self:SetArea(areaId)
		end,
		onSelect = function(entityId)
			self:Select(entityId)
		end,
		onTab = function(tabId)
			self:SetTab(tabId)
		end,
		onToggleSelect = function(entityId)
			self:ToggleSelect(entityId)
		end,
		onSelectScope = function(selected)
			self:SelectScope(selected)
		end,
		onSelectAllAreas = function()
			self:SelectAllAreas()
		end,
		onClearSelection = function()
			self:ClearSelection()
		end,
		onSelectionFilter = function(filter)
			self:SetSelectionFilter(filter)
		end,
		onToggleTrack = function(entityId)
			self:ToggleTrack(entityId)
		end,
		onTrackSelection = function(turnOn)
			self:SetTrackedForSelection(turnOn)
		end,
		onSetting = function(key, value)
			self:ApplySetting(key, value)
		end,
		onClearLog = function()
			self:ClearLog()
		end,
	})
	local ok, message = self.ui:Build(playerGui, viewport)
	if not ok then
		Shared_Log.Warn("Không dựng được giao diện: " .. tostring(message))
		return false
	end
	Shared_Log.Info("Giao diện: " .. tostring(message))
	return true
end

-- Nút ngữ cảnh trên UI: khởi động / tạm dừng / tiếp tục.
function Radar:Primary()
	if self.state == Radar.STATE.Running then
		return self:Pause()
	end
	if self.state == Radar.STATE.Paused then
		return self:Resume()
	end
	return self:Start()
end

function Radar:Pause()
	if self.state ~= Radar.STATE.Running then
		return false, ("Không thể tạm dừng từ trạng thái '%s'"):format(tostring(self.state))
	end
	local ok, message = self.scheduler:Pause()
	if not ok then
		return false, message
	end
	self.state = Radar.STATE.Paused
	self.stats.pauses = self.stats.pauses + 1
	-- Dữ liệu vẫn còn nhưng KHÔNG còn là trực tiếp: đánh dấu để UI nói rõ.
	self.tracker:Refresh(os.clock(), nil, nil, nil, nil, nil)
	for _, record in pairs(self.tracker.states) do
		if record ~= nil and record.code == Shared_Status.Code.Detected then
			record.stale = true
		end
	end
	if self.ui ~= nil then
		self:_syncUi(os.clock(), true)
	end
	Shared_Log.Info("Đã tạm dừng. Dữ liệu đang hiển thị là dữ liệu cũ.")
	return true, "Đã tạm dừng."
end

function Radar:Resume()
	if self.state ~= Radar.STATE.Paused then
		return false, ("Không thể tiếp tục từ trạng thái '%s'"):format(tostring(self.state))
	end
	local ok, message = self.scheduler:Resume()
	if not ok then
		return false, message
	end
	self.state = Radar.STATE.Running
	self.stats.resumes = self.stats.resumes + 1
	self.scanner:RequestFullScan()
	self:_tick(os.clock())
	if self.ui ~= nil then
		self:_syncUi(os.clock(), true)
	end
	Shared_Log.Info("Đã tiếp tục.")
	return true, "Đã tiếp tục."
end

--[[
	DỪNG HẲN: ngắt scheduler, gỡ sự kiện Workspace, xoá trạng thái.
	Không huỷ UI (để bật lại nhanh); muốn huỷ luôn thì gọi Destroy().
]]
function Radar:Stop()
	self.scheduler:Stop()
	self.scanner:Detach()
	self.tracker:SetActive(false)
	self.state = Radar.STATE.Stopped
	self.stats.stops = self.stats.stops + 1
	if self.ui ~= nil then
		self:_syncUi(os.clock(), true)
	end
	Shared_Log.Info("Đã dừng hệ thống. Không còn vòng lặp nền nào.")
	return true, "Đã dừng."
end

function Radar:SetQuery(query)
	self.query = type(query) == "string" and query or ""
	if self.ui ~= nil then
		self:_syncUi(os.clock(), true)
	end
	return true
end

--[[
	Bộ lọc khu vực. Vì mỗi khu vực có MỘT tab riêng nên đổi khu vực cũng
	đổi tab (giữ hành vi cũ: người dùng vẫn bấm được "Tất cả" để xem cả 82 mục).
]]
function Radar:SetArea(areaId)
	if type(areaId) ~= "string" then
		return false
	end
	self.areaId = areaId
	if Shared_Config.GetTab(areaId) ~= nil then
		self.tabId = areaId
	end
	if self.ui ~= nil then
		self:_syncUi(os.clock(), true)
	end
	return true
end

--======================== TAB / LỰA CHỌN / THEO DÕI ========================

--[[
	Khu vực dùng để dựng danh sách dòng, suy ra từ tab đang mở:
	  * tab khu vực  -> đúng khu vực đó ("all" = mọi khu vực);
	  * tab Đã chọn  -> MỌI khu vực, vì lựa chọn là xuyên khu vực. Nếu giữ
	    bộ lọc khu vực cũ thì tab "Đã chọn" sẽ hiện thiếu mục người dùng
	    đã chọn ở khu vực khác (lỗi thật, test TAB-003 bắt được);
	  * tab khác     -> không có danh sách.
]]
function Radar:_rowsArea()
	local tab = Shared_Config.GetTab(self.tabId)
	if tab == nil then
		return self.areaId
	end
	if tab.kind == "area" then
		return tab.area
	end
	if tab.kind == "selected" then
		return "all"
	end
	return self.areaId
end

-- Chuyển tab. Trả về (ok, message).
function Radar:SetTab(tabId)
	local tab = Shared_Config.GetTab(tabId)
	if tab == nil then
		return false, ("Không có tab '%s'"):format(tostring(tabId))
	end
	self.tabId = tab.id
	-- Tab khu vực thì đồng bộ luôn bộ lọc khu vực (hai nơi phải khớp nhau).
	if tab.kind == "area" and type(tab.area) == "string" then
		self.areaId = tab.area
	end
	if self.ui ~= nil then
		self:_syncUi(os.clock(), true)
	end
	return true, tab.label
end

function Radar:ActiveTab()
	return self.tabId
end

-- Danh sách id đang hiển thị trong phạm vi hiện tại (tab + tìm kiếm).
-- Dùng cho nút "Chọn tất cả" — PHẠM VI, không phải toàn bộ danh mục.
function Radar:VisibleEntityIds()
	local rowsArea = self:_rowsArea()
	local ids = {}
	for _, data in ipairs(self.tracker:BuildView(self.query, rowsArea)) do
		local entry = data.entry
		local isSelected = self.selection:IsSelected(entry.id)
		local keep = true
		if self.selectionFilter == "selected" and not isSelected then
			keep = false
		elseif self.selectionFilter == "unselected" and isSelected then
			keep = false
		end
		if keep then
			ids[#ids + 1] = entry.id
		end
	end
	return ids
end

-- Bấm vào ô chọn của một dòng.
function Radar:ToggleSelect(entityId)
	local nowSelected, ok, message = self.selection:Toggle(entityId)
	if not ok then
		Shared_Log.Warn("Không chọn được mục: " .. tostring(message))
		return false, tostring(message)
	end
	-- Bỏ chọn thì tắt luôn theo dõi của mục đó: không theo dõi thứ không chọn.
	if nowSelected == false and self.tracked[entityId] == true then
		self:_setTracked(entityId, false)
	end
	if self.ui ~= nil then
		self:_syncUi(os.clock(), true)
	end
	return true, nowSelected
end

function Radar:SetSelected(entityId, selected)
	local changed, ok, message = self.selection:Set(entityId, selected)
	if not ok then
		return false, tostring(message)
	end
	if changed and selected == false and self.tracked[entityId] == true then
		self:_setTracked(entityId, false)
	end
	if changed and self.ui ~= nil then
		self:_syncUi(os.clock(), true)
	end
	return true, changed
end

-- Chọn/bỏ chọn mọi mục TRONG PHẠM VI ĐANG XEM (không phải toàn danh mục).
function Radar:SelectScope(selected)
	local ids = self:VisibleEntityIds()
	local changedCount, rejectedCount = self.selection:SetMany(ids, selected)
	if selected == false then
		for _, entityId in ipairs(ids) do
			if self.tracked[entityId] == true then
				self:_setTracked(entityId, false)
			end
		end
	end
	if self.ui ~= nil then
		self:_syncUi(os.clock(), true)
	end
	Shared_Log.Info(("Đã %s %d mục trong phạm vi đang xem (%d mục bị từ chối).")
		:format(selected and "chọn" or "bỏ chọn", changedCount, rejectedCount))
	return changedCount, rejectedCount
end

-- Chọn toàn bộ danh mục (mọi khu vực).
function Radar:SelectAllAreas()
	local ids = Client_Selection.AllCatalogIds()
	local changedCount = self.selection:SetMany(ids, true)
	if self.ui ~= nil then
		self:_syncUi(os.clock(), true)
	end
	Shared_Log.Info(("Đã chọn toàn bộ danh mục: %d mục mới, tổng %d mục.")
		:format(changedCount, self.selection:Count()))
	return changedCount
end

function Radar:ClearSelection()
	local removed = self.selection:Clear()
	if removed > 0 then
		-- Bỏ chọn toàn bộ thì cũng ngừng theo dõi toàn bộ.
		for entityId in pairs(self.tracked) do
			self.tracker:SetFocus(entityId, false)
		end
		self.tracked = {}
		self.trackedCount = 0
	end
	if self.ui ~= nil then
		self:_syncUi(os.clock(), true)
	end
	return removed
end

function Radar:SetSelectionFilter(filter)
	local valid = { all = true, selected = true, unselected = true }
	if valid[filter] ~= true then
		return false, ("Bộ lọc lạ: %s"):format(tostring(filter))
	end
	self.selectionFilter = filter
	if self.ui ~= nil then
		self:_syncUi(os.clock(), true)
	end
	return true
end

function Radar:IsTracked(entityId)
	return self.tracked[entityId] == true
end

function Radar:TrackedCount()
	return self.trackedCount
end

-- Bật/tắt theo dõi. Chỉ mục CÓ cơ chế phát hiện (method = scan) mới theo dõi
-- được; mục "không hỗ trợ" thì từ chối và nói rõ lý do (không hứa suông).
function Radar:_setTracked(entityId, tracked)
	local entry = Shared_Catalog.Get(entityId)
	if entry == nil then
		return false, "không có mục này trong danh mục"
	end
	if entry.detect == nil or entry.detect.method ~= "scan" then
		return false, ("mục '%s' không có cơ chế phát hiện từ client"):format(entry.name)
	end
	local wantTracked = tracked == true
	local hasTracked = self.tracked[entityId] == true
	if hasTracked == wantTracked then
		return false, "không đổi"
	end
	if wantTracked then
		self.tracked[entityId] = true
		self.trackedCount = self.trackedCount + 1
	else
		self.tracked[entityId] = nil
		self.trackedCount = self.trackedCount - 1
	end
	self.tracker:SetFocus(entityId, wantTracked)
	return true, nil
end

function Radar:ToggleTrack(entityId)
	local ok, message = self:_setTracked(entityId, self.tracked[entityId] ~= true)
	if not ok then
		Shared_Log.Warn("Không theo dõi được: " .. tostring(message))
		if self.ui ~= nil then
			self:_syncUi(os.clock(), true)
		end
		return false, tostring(message)
	end
	local isTracked = self.tracked[entityId] == true
	Shared_Log.Info(("%s theo dõi '%s'.")
		:format(isTracked and "Bật" or "Tắt", tostring(Shared_Catalog.Get(entityId).name)))
	if self.ui ~= nil then
		self:_syncUi(os.clock(), true)
	end
	return true, isTracked
end

-- Bật/tắt theo dõi cho NHÓM mục (chỉ những mục đã chọn và hỗ trợ phát hiện).
function Radar:SetTrackedForSelection(tracked)
	local applied = 0
	local skipped = 0
	for _, entityId in ipairs(self.selection:Ids()) do
		local ok = self:_setTracked(entityId, tracked)
		if ok then
			applied = applied + 1
		else
			skipped = skipped + 1
		end
	end
	if self.ui ~= nil then
		self:_syncUi(os.clock(), true)
	end
	return applied, skipped
end

--============================= CÀI ĐẶT TRỰC TIẾP ============================

--[[
	Áp dụng một tuỳ chọn từ tab Cài đặt. `key` dạng "Ui.showSearch".
	Các tuỳ chọn CẤU TRÚC (thêm/bớt cả một khối giao diện) phải DỰNG LẠI UI;
	Radar huỷ UI cũ trước khi dựng cái mới nên không bao giờ có hai bản.
]]
local STRUCTURAL_SETTINGS = {
	["Ui.showTabs"] = true,
	["Ui.showSearch"] = true,
	["Ui.showAreaFilter"] = true,
	["Ui.showDetailPanel"] = true,
	["Ui.showStatusBar"] = true,
	["Ui.showSelectionBar"] = true,
}

function Radar:ApplySetting(key, value)
	local group, field = nil, nil
	for part in string.gmatch(tostring(key), "[^%.]+") do
		if group == nil then
			group = part
		else
			field = part
		end
	end
	-- Chỉ chấp nhận khoá CÓ SẴN trong cấu hình: nếu không, một lần gõ nhầm
	-- sẽ âm thầm tạo ra trường rác mà không ai dùng (và người dùng tưởng
	-- mình đã tắt được thứ gì đó).
	if group == nil or field == nil or type(self.config[group]) ~= "table"
		or self.config[group][field] == nil then
		return false, ("Không nhận ra tuỳ chọn '%s'"):format(tostring(key))
	end
	if type(self.config[group][field]) ~= "boolean" then
		return false, ("Tuỳ chọn '%s' không phải công tắc bật/tắt"):format(tostring(key))
	end
	if type(value) ~= "boolean" then
		return false, ("Tuỳ chọn '%s' chỉ nhận true/false"):format(tostring(key))
	end

	self.config[group][field] = value
	Shared_Log.Info(("Đã đổi %s = %s"):format(tostring(key), tostring(value)))

	if STRUCTURAL_SETTINGS[key] == true then
		self:RebuildUi()
	elseif key == "Ui.enableDrag" then
		-- Kéo thả bật/tắt được mà không cần dựng lại: chỉ cần nối/ngắt handler.
		if self.ui ~= nil then
			if value == true then
				self.ui:_enableDrag()
			end
		end
	end

	if self.ui ~= nil then
		self:_syncUi(os.clock(), true)
	end
	return true, value
end

-- Huỷ UI cũ rồi dựng lại (giữ nguyên tab, tìm kiếm, lựa chọn).
function Radar:RebuildUi()
	if self.ui ~= nil then
		self.ui:Destroy()
		self.ui = nil
	end
	if self.config.Ui == nil or self.config.Ui.enabled == false then
		return false, "Giao diện đang tắt trong cấu hình."
	end
	return self:_buildUi()
end

-- Xoá nhật ký hiển thị trên giao diện (Output của Studio không bị ảnh hưởng).
function Radar:ClearLog()
	local removed = Shared_Log.ClearHistory()
	if self.ui ~= nil then
		self.ui:_syncLog(true)
	end
	Shared_Log.Info(("Đã xoá %d dòng nhật ký trên giao diện."):format(removed))
	return removed
end

--[[
	ĐỌC alert từ Tracker và ghi nhật ký. Chỉ chạy khi có alert (danh sách rỗng
	thì hàm thoát ngay) nên không tốn gì trong nhịp bình thường.
]]
function Radar:_drainAlerts(now)
	if self.tracker:FocusCount() == 0 then
		return 0
	end
	local alerts = self.tracker:TakeAlerts()
	if #alerts == 0 then
		return 0
	end
	local logged = 0
	for _, alert in ipairs(alerts) do
		if alert.detected then
			local distanceText = "không rõ khoảng cách"
			if Shared_Geometry.IsFiniteNumber(alert.distance) then
				distanceText = tostring(Shared_Geometry.FormatDistance(alert.distance))
				if alert.direction ~= nil then
					distanceText = distanceText .. ", " .. tostring(alert.direction)
				end
			end
			Shared_Log.Info(("[THEO DÕI] Thấy %s — %s"):format(alert.name, distanceText))
		else
			Shared_Log.Info(("[THEO DÕI] Không còn thấy %s"):format(alert.name))
		end
		logged = logged + 1
	end
	return logged
end

function Radar:Select(entityId)
	self.selectedId = entityId
	if self.ui ~= nil then
		self:_syncUi(os.clock(), true)
	end
	return true
end

-- Ẩn/hiện bảng. Hệ thống KHÔNG bị dừng khi ẩn.
function Radar:SetVisible(visible)
	if self.ui == nil or not self.ui:IsBuilt() then
		return false, "Chưa có giao diện."
	end
	self.ui:SetOpen(visible)
	return true, visible and "Đã mở bảng." or "Đã ẩn bảng (hệ thống vẫn chạy)."
end

function Radar:ToggleVisible()
	if self.ui == nil or not self.ui:IsBuilt() then
		return false, "Chưa có giao diện."
	end
	return self:SetVisible(not self.ui:IsOpen())
end

function Radar:Stats()
	return {
		state = self.state,
		radar = self.stats,
		scheduler = self.scheduler:Stats(),
		scanner = self.scanner:Stats(),
		tracker = self.tracker:Stats(),
		ui = self.ui ~= nil and self.ui:Stats() or nil,
		matcher = self.scanner.matcher ~= nil and Client_Matcher.Stats(self.scanner.matcher) or nil,
		registry = {
			connections = Client_Registry.ConnectionCount(),
			instances = Client_Registry.InstanceCount(),
		},
		selection = self.selection:Stats(),
		tracked = self.trackedCount,
		tab = self.tabId,
		selectionFilter = self.selectionFilter,
	}
end

--[[
	HUỶ HOÀN TOÀN: ngắt mọi connection, huỷ GUI, dừng scheduler.
	Sau lời gọi này số connection và instance do dự án tạo phải về 0.
]]
function Radar:Destroy()
	self.scheduler:Destroy()
	self.scanner:Destroy()
	self.tracker:Destroy()
	if self.ui ~= nil then
		self.ui:Destroy()
		self.ui = nil
	end
	self.state = Radar.STATE.Stopped
	local disconnected, destroyed = Client_Registry.Shutdown()
	Shared_Log.Info(("Đã huỷ hệ thống: ngắt %d connection, huỷ %d instance.")
		:format(disconnected, destroyed))
	return disconnected, destroyed
end

return Radar
