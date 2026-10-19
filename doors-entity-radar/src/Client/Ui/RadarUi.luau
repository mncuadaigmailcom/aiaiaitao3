--[[
	doors-entity-radar/src/Client/Ui/RadarUi.luau
	ModuleScript — đặt tại: DoorsEntityRadar.Client.Ui.RadarUi

	GIAO DIỆN CHÍNH (nhiều tab). Chỉ làm hai việc: dựng widget và ĐỔ dữ liệu.
	Mọi kết luận (có phát hiện hay không, khoảng cách bao nhiêu) đều do
	Tracker quyết định — UI không bao giờ tự suy ra.

	CẤU TRÚC:
	  ScreenGui
	  └─ Panel                       (kéo được bằng thanh tiêu đề)
	     ├─ Header    : tiêu đề, trạng thái, thu nhỏ, làm mới, chạy/dừng, đóng
	     ├─ TabBar    : 13 tab (Trang chủ, Tất cả, 8 khu vực, Đã chọn, Cài đặt, Nhật ký)
	     ├─ FilterBar : ô tìm kiếm + dải lọc khu vực + bộ lọc lựa chọn
	     ├─ SelectionBar : Chọn tất cả / Bỏ chọn / Chọn tất cả khu vực / Bỏ chọn toàn bộ
	     │                 + bộ đếm "Đã chọn 12/50"
	     ├─ Body
	     │  ├─ ListPage  : danh sách mục (ô chọn, chấm trạng thái, tên, loại,
	     │  │              trạng thái, khoảng cách) + bảng chi tiết
	     │  ├─ HomePage  : trạng thái hệ thống, bộ đếm, thao tác nhanh
	     │  ├─ SettingsPage : các công tắc giao diện/hành vi
	     │  └─ LogPage   : nhật ký hoạt động
	     └─ StatusBar : đồng hồ cập nhật (nhãn riêng) + bộ đếm + cảnh báo

	BA RÀNG BUỘC ĐÃ KIỂM THỬ:
	  1. Chỉ hiển thị khoảng cách/hướng/toạ độ khi record.code = DETECTED
	     (hỏi Shared_Status.MayShowPosition chứ không tự quyết).
	  2. Không ghi lại property khi giá trị không đổi — Widgets.SetText/SetColor
	     tự bỏ qua và đếm vào stats.skipped.
	  3. CHUYỂN TAB KHÔNG DỰNG LẠI GÌ: mọi trang được tạo MỘT lần lúc Build,
	     chuyển tab chỉ đổi Visible. Số widget tạo ra (stats.widgetsCreated)
	     phải giữ nguyên sau bao nhiêu lần chuyển tab cũng vậy.
]]

local Shared_Safe = __DER_REQUIRE("Shared/Safe")
local Shared_Log = __DER_REQUIRE("Shared/Log")
local Shared_Status = __DER_REQUIRE("Shared/Status")
local Shared_Geometry = __DER_REQUIRE("Shared/Geometry")
local Shared_Catalog = __DER_REQUIRE("Shared/EntityCatalog")
local Shared_Areas = __DER_REQUIRE("Shared/Areas")
local Shared_Config = __DER_REQUIRE("Shared/Config")
local Client_Env = __DER_REQUIRE("Client/Core/Env")
local Client_Registry = __DER_REQUIRE("Client/Core/Registry")
local Ui_Theme = __DER_REQUIRE("Client/Ui/Theme")
local Ui_Widgets = __DER_REQUIRE("Client/Ui/Widgets")

local RadarUi = {}
RadarUi.__index = RadarUi

--[[
	callbacks (mọi hàm đều tuỳ chọn; thiếu thì nút tương ứng chỉ không làm gì):
	  onPrimary                 — nút ngữ cảnh: khởi động / tạm dừng / tiếp tục
	  onStop                    — dừng hẳn hệ thống
	  onRefresh                 — quét lại ngay
	  onClose                   — đóng bảng (hệ thống vẫn chạy nền)
	  onMinimize(minimized)     — thu nhỏ / mở lại
	  onSearch(text)            — ô tìm kiếm
	  onArea(areaId)            — dải lọc khu vực
	  onTab(tabId)              — chuyển tab
	  onSelect(entityId)        — bấm vào một dòng (xem chi tiết)
	  onToggleSelect(entityId)  — bấm vào Ô CHỌN của một dòng
	  onSelectScope(selected)   — chọn/bỏ chọn mọi mục trong phạm vi đang xem
	  onSelectAllAreas()        — chọn toàn bộ danh mục
	  onClearSelection()        — bỏ chọn toàn bộ
	  onSelectionFilter(filter) — "all" | "selected" | "unselected"
	  onToggleTrack(entityId)   — bật/tắt theo dõi một mục
	  onSetting(key, value)     — đổi một tuỳ chọn trong tab Cài đặt
	  onClearLog()              — xoá nhật ký trên giao diện
]]
function RadarUi.new(config, callbacks)
	local self = setmetatable({}, RadarUi)
	self.config = config or {}
	self.callbacks = callbacks or {}
	self.gui = nil
	self.parts = {}
	self.pages = {}
	self.rows = {}
	self.areaButtons = {}
	self.tabButtons = {}
	self.settingButtons = {}
	self.filterButtons = {}
	self.built = false
	self.open = false
	self.minimized = false
	self.selectedId = nil
	self.activeTab = nil
	self.activeKind = nil
	self.lastQuery = nil
	self.lastAreaId = nil
	self.lastTabId = nil
	self.lastFilter = nil
	self.lastSelectionCount = nil
	self.lastLogCount = nil
	self.lastLogText = nil
	self.narrow = false
	self.renderedRows = 0
	self.lastRowCount = 0
	-- Bảng tái sử dụng để lọc dòng theo bộ lọc lựa chọn (không tạo bảng mới
	-- mỗi lần Sync — Sync chạy vài lần mỗi giây).
	self.filteredRows = {}
	self.drag = nil
	self.stats = { syncs = 0, rowsUpdated = 0, tabSwitches = 0, drags = 0, selectionClicks = 0 }
	return self
end

-- Gọi một callback nếu có, bọc pcall để lỗi UI không kéo sập hệ thống.
function RadarUi:_call(name, ...)
	local handler = self.callbacks[name]
	if type(handler) ~= "function" then
		return false
	end
	local ok, err = pcall(handler, ...)
	if not ok then
		warn(("[DER] callback UI '%s' ném lỗi: %s"):format(tostring(name), tostring(err)))
		return false
	end
	return true
end

-- Danh sách tab (đọc từ cấu hình — thêm tab không cần sửa tệp này).
function RadarUi:_tabs()
	local uiConfig = self.config.Ui
	if uiConfig == nil or type(uiConfig.TABS) ~= "table" then
		return Shared_Config.Ui.TABS
	end
	return uiConfig.TABS
end

-- Tính bố cục theo kích thước màn hình thật (nếu đọc được).
function RadarUi:_computeLayout(viewportSize)
	local uiConfig = (self.config.Ui) or {}
	local panelWidth = uiConfig.panelWidth or 760
	local panelHeight = uiConfig.panelHeight or 520
	local narrowThreshold = uiConfig.narrowViewportWidth or 700
	local scale = 1

	local viewportX, viewportY = nil, nil
	if type(viewportSize) == "table" or type(viewportSize) == "userdata" then
		local okRead, x, y = pcall(function()
			return viewportSize.X, viewportSize.Y
		end)
		if okRead and Shared_Geometry.IsFiniteNumber(x) and Shared_Geometry.IsFiniteNumber(y) then
			viewportX = x
			viewportY = y
		end
	end

	if viewportX ~= nil then
		if viewportX < narrowThreshold then
			self.narrow = true
			scale = 0.85
		end
		-- Không bao giờ để bảng tràn màn hình.
		if panelWidth > viewportX - 20 then
			panelWidth = math.max(280, viewportX - 20)
		end
		if viewportY ~= nil and panelHeight > viewportY - 20 then
			panelHeight = math.max(240, viewportY - 20)
		end
		-- Nhớ kích thước thật để kẹp bảng khi kéo (không cho bay khỏi màn hình).
		self.viewport = { x = viewportX, y = viewportY }
	else
		self.viewport = nil
		-- Không đọc được ViewportSize: giữ kích thước cấu hình, không đoán.
		self.narrow = false
	end

	local metrics = Ui_Theme.Metrics
	local showTabs = uiConfig.showTabs ~= false
	local tabBarHeight = showTabs and metrics.tabBarHeight or 0
	local filterHeight = (uiConfig.showSearch or uiConfig.showAreaFilter) and metrics.filterHeight or 0
	local selectionHeight = (uiConfig.showSelectionBar ~= false) and metrics.selectionBarHeight or 0
	local statusHeight = uiConfig.showStatusBar and metrics.statusHeight or 0
	local bodyTop = metrics.headerHeight + tabBarHeight + filterHeight + selectionHeight + 8
	local bodyHeight = panelHeight - bodyTop - statusHeight - 8

	return {
		panelWidth = panelWidth,
		panelHeight = panelHeight,
		scale = scale,
		showTabs = showTabs,
		tabBarHeight = tabBarHeight,
		filterHeight = filterHeight,
		selectionHeight = selectionHeight,
		statusHeight = statusHeight,
		bodyTop = bodyTop,
		bodyHeight = math.max(120, bodyHeight),
	}
end

-- Dựng toàn bộ cây widget. Trả về (ok, message).
function RadarUi:Build(parent, viewportSize)
	if self.built then
		return true, "Giao diện đã dựng sẵn."
	end
	if parent == nil then
		return false, "Không có nơi gắn giao diện (PlayerGui = nil)."
	end

	local layout = self:_computeLayout(viewportSize)
	self.layout = layout

	local gui = Ui_Widgets.ScreenGui(parent, {
		Name = "DoorsEntityRadar",
		ResetOnSpawn = false,
		IgnoreGuiInset = true,
		ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
		DisplayOrder = 20,
		Enabled = true,
	})
	if gui == nil then
		return false, "Không tạo được ScreenGui."
	end
	self.gui = gui

	local panel = Ui_Widgets.Frame(gui, {
		Name = "Panel",
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.new(0.5, 0, 0.5, 0),
		Size = UDim2.fromOffset(layout.panelWidth, layout.panelHeight),
		BackgroundColor3 = Ui_Theme.Color.background,
		BorderColor3 = Ui_Theme.Color.panelEdge,
		ClipsDescendants = true,
	}, "ui:Panel")
	Ui_Widgets.Corner(panel)
	Ui_Widgets.Stroke(panel, Ui_Theme.Color.panelEdge, 1)
	if layout.scale ~= 1 then
		Ui_Widgets.Scale(panel, layout.scale)
	end
	self.parts.panel = panel

	self:_buildHeader(panel, layout)
	if layout.showTabs then
		self:_buildTabBar(panel, layout)
	end
	self:_buildFilterBar(panel, layout)
	self:_buildSelectionBar(panel, layout)
	self:_buildBody(panel, layout)
	self:_buildStatusBar(panel, layout)
	self:_enableDrag()

	self.built = true
	self.open = true

	-- Tab mặc định: lấy từ cấu hình; id lạ thì về tab ĐẦU TIÊN (không đoán mò).
	local wantedTab = (self.config.Ui and self.config.Ui.defaultTab) or "home"
	if Shared_Config.GetTab(wantedTab) == nil then
		local tabs = self:_tabs()
		wantedTab = tabs[1] and tabs[1].id or "home"
	end
	self:SetTab(wantedTab, true)

	if (self.config.Ui and self.config.Ui.startMinimized) == true then
		self:SetMinimized(true)
	end

	return true, ("Đã dựng giao diện %dx%d, %d tab (thu nhỏ %.2f, chế độ hẹp: %s).")
		:format(layout.panelWidth, layout.panelHeight, #self:_tabs(), layout.scale, tostring(self.narrow))
end

--=============================== HEADER ===============================

function RadarUi:_buildHeader(panel, layout)
	local metrics = Ui_Theme.Metrics
	local header = Ui_Widgets.Frame(panel, {
		Name = "Header",
		Position = UDim2.new(0, 0, 0, 0),
		Size = UDim2.new(1, 0, 0, metrics.headerHeight),
		BackgroundColor3 = Ui_Theme.Color.headerBackground,
	}, "ui:Header")
	Ui_Widgets.Corner(header)
	self.parts.header = header

	self.parts.title = Ui_Widgets.Label(header, {
		Name = "Title",
		Position = UDim2.new(0, metrics.padding, 0, 0),
		Size = UDim2.new(0.5, -metrics.padding, 1, 0),
		Text = "DOORS ENTITY RADAR",
		Font = Ui_Theme.Font.title,
		TextSize = Ui_Theme.TextSize.title,
	}, "ui:Title")

	self.parts.stateLabel = Ui_Widgets.Label(header, {
		Name = "State",
		Position = UDim2.new(0.5, 0, 0, 2),
		Size = UDim2.new(0.5, -metrics.padding * 2 - metrics.buttonWidth * 3 - 88, 0, 18),
		Text = "chưa khởi động",
		TextSize = Ui_Theme.TextSize.small,
		TextColor3 = Ui_Theme.Color.textSecondary,
		TextXAlignment = Enum.TextXAlignment.Right,
	}, "ui:State")

	-- Hàng nút bên phải: thu nhỏ / làm mới / chạy-dừng / đóng.
	local buttonRow = Ui_Widgets.Frame(header, {
		Name = "Buttons",
		AnchorPoint = Vector2.new(1, 0.5),
		Position = UDim2.new(1, -metrics.padding, 0.5, 0),
		Size = UDim2.fromOffset(metrics.buttonWidth * 3 + 88, 28),
		BackgroundTransparency = 1,
	}, "ui:ButtonRow")
	Ui_Widgets.ListLayout(buttonRow, {
		FillDirection = Enum.FillDirection.Horizontal,
		Padding = UDim.new(0, 6),
		HorizontalAlignment = Enum.HorizontalAlignment.Right,
		VerticalAlignment = Enum.VerticalAlignment.Center,
	})

	self.parts.minimizeButton = Ui_Widgets.Button(buttonRow, {
		Name = "Minimize",
		Size = UDim2.fromOffset(28, 28),
		Text = "—",
		LayoutOrder = 1,
	}, "ui:MinimizeButton")
	Ui_Widgets.Corner(self.parts.minimizeButton, UDim.new(0, 6))
	Ui_Widgets.OnClick(self.parts.minimizeButton, function()
		self:ToggleMinimized()
	end, "ui:clickMinimize")

	self.parts.primaryButton = Ui_Widgets.Button(buttonRow, {
		Name = "Primary",
		Size = UDim2.fromOffset(metrics.buttonWidth, 28),
		Text = "Khởi động",
		LayoutOrder = 2,
	}, "ui:PrimaryButton")
	Ui_Widgets.Corner(self.parts.primaryButton, UDim.new(0, 6))
	Ui_Widgets.OnClick(self.parts.primaryButton, function()
		self:_call("onPrimary")
	end, "ui:clickPrimary")

	self.parts.refreshButton = Ui_Widgets.Button(buttonRow, {
		Name = "Refresh",
		Size = UDim2.fromOffset(metrics.buttonWidth, 28),
		Text = "Làm mới",
		LayoutOrder = 3,
	}, "ui:RefreshButton")
	Ui_Widgets.Corner(self.parts.refreshButton, UDim.new(0, 6))
	Ui_Widgets.OnClick(self.parts.refreshButton, function()
		self:_call("onRefresh")
	end, "ui:clickRefresh")

	self.parts.closeButton = Ui_Widgets.Button(buttonRow, {
		Name = "Close",
		Size = UDim2.fromOffset(54, 28),
		Text = "Đóng",
		BackgroundColor3 = Ui_Theme.Color.accentDark,
		LayoutOrder = 4,
	}, "ui:CloseButton")
	Ui_Widgets.Corner(self.parts.closeButton, UDim.new(0, 6))
	Ui_Widgets.OnClick(self.parts.closeButton, function()
		self:_call("onClose")
	end, "ui:clickClose")

	self.parts.stopButton = Ui_Widgets.Button(header, {
		Name = "Stop",
		AnchorPoint = Vector2.new(1, 1),
		Position = UDim2.new(1, -metrics.padding, 1, -3),
		Size = UDim2.fromOffset(60, 14),
		Text = "dừng hệ thống",
		TextSize = Ui_Theme.TextSize.tiny,
		BackgroundColor3 = Ui_Theme.Color.headerBackground,
		TextColor3 = Ui_Theme.Color.textMuted,
	}, "ui:StopButton")
	Ui_Widgets.OnClick(self.parts.stopButton, function()
		self:_call("onStop")
	end, "ui:clickStop")
end

--=============================== TAB BAR ==============================

function RadarUi:_buildTabBar(panel, layout)
	local metrics = Ui_Theme.Metrics
	local bar = Ui_Widgets.Scrolling(panel, {
		Name = "TabBar",
		Position = UDim2.new(0, 0, 0, metrics.headerHeight),
		Size = UDim2.new(1, 0, 0, layout.tabBarHeight),
		BackgroundColor3 = Ui_Theme.Color.headerBackground,
		ScrollingDirection = Enum.ScrollingDirection.X,
	}, "ui:TabBar")
	Ui_Widgets.ListLayout(bar, {
		FillDirection = Enum.FillDirection.Horizontal,
		Padding = UDim.new(0, 4),
		VerticalAlignment = Enum.VerticalAlignment.Center,
	})
	Ui_Widgets.Padding(bar, 6)
	self.parts.tabBar = bar

	for order, tab in ipairs(self:_tabs()) do
		local button = Ui_Widgets.Button(bar, {
			Name = "Tab_" .. tostring(tab.id),
			Size = UDim2.new(0, self.narrow and 96 or 112, 0, layout.tabBarHeight - 12),
			Text = tostring(tab.label),
			TextSize = Ui_Theme.TextSize.small,
			BackgroundColor3 = Ui_Theme.Color.rowBackground,
			TextColor3 = Ui_Theme.Color.textSecondary,
			TextTruncate = Enum.TextTruncate.AtEnd,
			LayoutOrder = order,
		}, "ui:TabButton")
		Ui_Widgets.Corner(button, UDim.new(0, 6))
		self.tabButtons[tab.id] = button
		Ui_Widgets.OnClick(button, function()
			self:_call("onTab", tab.id)
		end, "ui:clickTab")
	end
end

--============================== FILTER BAR ============================

function RadarUi:_buildFilterBar(panel, layout)
	local uiConfig = self.config.Ui or {}
	if layout.filterHeight <= 0 then
		self.parts.filterBar = nil
		return
	end
	local metrics = Ui_Theme.Metrics
	local bar = Ui_Widgets.Frame(panel, {
		Name = "FilterBar",
		Position = UDim2.new(0, 0, 0, metrics.headerHeight + layout.tabBarHeight),
		Size = UDim2.new(1, 0, 0, layout.filterHeight),
		BackgroundTransparency = 1,
	}, "ui:FilterBar")
	self.parts.filterBar = bar

	if uiConfig.showSearch ~= false then
		self.parts.searchBox = Ui_Widgets.TextBox(bar, {
			Name = "Search",
			Position = UDim2.new(0, metrics.padding, 0.5, -13),
			Size = self.narrow and UDim2.new(1, -metrics.padding * 2, 0, 26)
				or UDim2.new(0, 200, 0, 26),
			PlaceholderText = "Tìm thực thể…",
			Text = "",
		}, "ui:Search")
		Ui_Widgets.Corner(self.parts.searchBox, UDim.new(0, 6))
		Ui_Widgets.OnTextChanged(self.parts.searchBox, function()
			local text, ok = Shared_Safe.Read(self.parts.searchBox, "Text")
			if not ok then
				return
			end
			if text == self.lastQuery then
				return -- không đổi thì không báo, tránh dựng lại danh sách vô ích
			end
			self.lastQuery = text
			self:_call("onSearch", text)
		end, "ui:searchChanged")
	end

	if uiConfig.showAreaFilter ~= false then
		local strip = Ui_Widgets.Scrolling(bar, {
			Name = "Areas",
			Position = self.narrow and UDim2.new(0, metrics.padding, 0, 32)
				or UDim2.new(0, metrics.padding + 208, 0.5, -13),
			Size = self.narrow and UDim2.new(1, -metrics.padding * 2, 0, 26)
				or UDim2.new(1, -metrics.padding * 2 - 216, 0, 26),
			ScrollingDirection = Enum.ScrollingDirection.X,
		}, "ui:AreaStrip")
		Ui_Widgets.ListLayout(strip, {
			FillDirection = Enum.FillDirection.Horizontal,
			Padding = UDim.new(0, 4),
			VerticalAlignment = Enum.VerticalAlignment.Center,
		})
		self.parts.areaStrip = strip

		local areaIds = { "all" }
		for _, areaId in ipairs(Shared_Areas.GetOrderedIds()) do
			areaIds[#areaIds + 1] = areaId
		end
		for order, areaId in ipairs(areaIds) do
			local label = areaId == "all" and "Tất cả" or Shared_Areas.GetShortName(areaId)
			local button = Ui_Widgets.Button(strip, {
				Name = "Area_" .. areaId,
				Size = UDim2.new(0, 74, 0, 24),
				Text = label,
				TextSize = Ui_Theme.TextSize.small,
				LayoutOrder = order,
			}, "ui:AreaButton")
			Ui_Widgets.Corner(button, UDim.new(0, 6))
			self.areaButtons[areaId] = button
			Ui_Widgets.OnClick(button, function()
				self:_call("onArea", areaId)
			end, "ui:clickArea")
		end

		-- Bộ lọc theo trạng thái lựa chọn: Tất cả / Đã chọn / Chưa chọn.
		local filterStrip = Ui_Widgets.Frame(bar, {
			Name = "SelectionFilter",
			AnchorPoint = Vector2.new(1, 0.5),
			Position = UDim2.new(1, -metrics.padding, 0.5, 0),
			Size = UDim2.fromOffset(210, 26),
			BackgroundTransparency = 1,
		}, "ui:SelectionFilter")
		Ui_Widgets.ListLayout(filterStrip, {
			FillDirection = Enum.FillDirection.Horizontal,
			Padding = UDim.new(0, 4),
			VerticalAlignment = Enum.VerticalAlignment.Center,
		})
		self.parts.selectionFilter = filterStrip

		local filters = {
			{ id = "all", label = "Tất cả" },
			{ id = "selected", label = "Đã chọn" },
			{ id = "unselected", label = "Chưa chọn" },
		}
		for order, filter in ipairs(filters) do
			local button = Ui_Widgets.Button(filterStrip, {
				Name = "Filter_" .. filter.id,
				Size = UDim2.new(0, 66, 0, 24),
				Text = filter.label,
				TextSize = Ui_Theme.TextSize.tiny,
				LayoutOrder = order,
			}, "ui:FilterButton")
			Ui_Widgets.Corner(button, UDim.new(0, 6))
			self.filterButtons[filter.id] = button
			Ui_Widgets.OnClick(button, function()
				self:_call("onSelectionFilter", filter.id)
			end, "ui:clickSelectionFilter")
		end
	end
end

--============================ SELECTION BAR ===========================

function RadarUi:_buildSelectionBar(panel, layout)
	if layout.selectionHeight <= 0 then
		self.parts.selectionBar = nil
		return
	end
	local metrics = Ui_Theme.Metrics
	local bar = Ui_Widgets.Frame(panel, {
		Name = "SelectionBar",
		Position = UDim2.new(0, 0, 0, metrics.headerHeight + layout.tabBarHeight + layout.filterHeight),
		Size = UDim2.new(1, 0, 0, layout.selectionHeight),
		BackgroundTransparency = 1,
	}, "ui:SelectionBar")
	self.parts.selectionBar = bar

	local strip = Ui_Widgets.Scrolling(bar, {
		Name = "SelectionButtons",
		Position = UDim2.new(0, metrics.padding, 0, 0),
		Size = UDim2.new(1, -metrics.padding * 2 - 130, 1, 0),
		ScrollingDirection = Enum.ScrollingDirection.X,
	}, "ui:SelectionStrip")
	Ui_Widgets.ListLayout(strip, {
		FillDirection = Enum.FillDirection.Horizontal,
		Padding = UDim.new(0, 4),
		VerticalAlignment = Enum.VerticalAlignment.Center,
	})
	self.parts.selectionStrip = strip

	-- `part` là khoá trong self.parts — đặt sẵn để không phải suy ra từ tên
	-- (trước đây suy ra "TrackSelection".."Button" thành "TrackSelectionButton"
	-- trong khi mọi nơi khác đọc "trackSelectionButton" -> nút không dùng được).
	local buttons = {
		{ name = "SelectView", part = "selectViewButton", label = "Chọn tất cả", handler = function()
			self:_call("onSelectScope", true)
		end },
		{ name = "DeselectView", part = "deselectViewButton", label = "Bỏ chọn tất cả", handler = function()
			self:_call("onSelectScope", false)
		end },
		{ name = "SelectAllAreas", part = "selectAllAreasButton", label = "Chọn tất cả khu vực", handler = function()
			self:_call("onSelectAllAreas")
		end },
		{ name = "ClearSelection", part = "clearSelectionButton", label = "Bỏ chọn toàn bộ", handler = function()
			self:_call("onClearSelection")
		end },
		{ name = "TrackSelection", part = "trackSelectionButton", label = "Theo dõi mục đã chọn", handler = function()
			-- Bật nếu còn mục chưa được theo dõi; tắt nếu tất cả đang theo dõi.
			-- Chỉ là công tắc cho nhóm — mục không có cơ chế phát hiện vẫn bị
			-- Radar từ chối và ghi rõ lý do (không hứa suông).
			-- TÊN TRƯỜNG là lastSelectionCount (không phải lastSelectedCount):
			-- đọc sai tên sẽ luôn ra nil và nút này chỉ bật được, không tắt được.
			local selectedCount = self.lastSelectionCount or 0
			local trackedCount = self.lastTrackedCount or 0
			local trackedAll = selectedCount > 0 and trackedCount >= selectedCount
			self:_call("onTrackSelection", not trackedAll)
		end },
	}
	for order, spec in ipairs(buttons) do
		local button = Ui_Widgets.Button(strip, {
			Name = spec.name,
			Size = UDim2.new(0, self.narrow and 108 or 124, 0, 24),
			Text = spec.label,
			TextSize = Ui_Theme.TextSize.tiny,
			LayoutOrder = order,
		}, "ui:SelectionButton")
		Ui_Widgets.Corner(button, UDim.new(0, 6))
		self.parts[spec.part] = button
		Ui_Widgets.OnClick(button, spec.handler, "ui:click" .. spec.name)
	end

	self.parts.selectionCounter = Ui_Widgets.Label(bar, {
		Name = "SelectionCounter",
		AnchorPoint = Vector2.new(1, 0.5),
		Position = UDim2.new(1, -metrics.padding, 0.5, 0),
		Size = UDim2.fromOffset(124, 20),
		Text = "Đã chọn 0/0",
		TextSize = Ui_Theme.TextSize.small,
		TextColor3 = Ui_Theme.Color.accent,
		Font = Ui_Theme.Font.mono,
		TextXAlignment = Enum.TextXAlignment.Right,
	}, "ui:SelectionCounter")
end

--================================ BODY ================================

function RadarUi:_buildBody(panel, layout)
	local metrics = Ui_Theme.Metrics
	local uiConfig = self.config.Ui or {}
	local body = Ui_Widgets.Frame(panel, {
		Name = "Body",
		Position = UDim2.new(0, 0, 0, layout.bodyTop),
		Size = UDim2.new(1, 0, 0, layout.bodyHeight),
		BackgroundTransparency = 1,
	}, "ui:Body")
	self.parts.body = body

	self:_buildListPage(body, layout, metrics, uiConfig)
	self:_buildHomePage(body, layout)
	self:_buildSettingsPage(body, layout)
	self:_buildLogPage(body, layout)
end

function RadarUi:_buildListPage(body, layout, metrics, uiConfig)
	local page = Ui_Widgets.Frame(body, {
		Name = "ListPage",
		Position = UDim2.new(0, 0, 0, 0),
		Size = UDim2.new(1, 0, 1, 0),
		BackgroundTransparency = 1,
	}, "ui:ListPage")
	self.pages.list = page
	self.parts.listPage = page

	local listWidth = (self.narrow or uiConfig.showDetailPanel == false)
		and UDim2.new(1, -metrics.padding * 2, 1, 0)
		or UDim2.new(0.58, -metrics.padding, 1, 0)

	local listScroll = Ui_Widgets.Scrolling(page, {
		Name = "List",
		Position = UDim2.new(0, metrics.padding, 0, 0),
		Size = listWidth,
		ScrollingDirection = Enum.ScrollingDirection.Y,
	}, "ui:List")
	Ui_Widgets.ListLayout(listScroll, { Padding = UDim.new(0, 3) })
	self.parts.list = listScroll

	-- Nhãn hiện khi danh sách rỗng (ví dụ tab "Đã chọn" lúc chưa chọn gì).
	self.parts.emptyLabel = Ui_Widgets.Label(page, {
		Name = "Empty",
		Position = UDim2.new(0, metrics.padding, 0, 8),
		Size = UDim2.new(1, -metrics.padding * 2, 0, 40),
		Text = "",
		TextSize = Ui_Theme.TextSize.small,
		TextColor3 = Ui_Theme.Color.textMuted,
		TextWrapped = true,
		TextYAlignment = Enum.TextYAlignment.Top,
		Visible = false,
	}, "ui:EmptyLabel")

	if uiConfig.showDetailPanel ~= false and not self.narrow then
		local detail = Ui_Widgets.Frame(page, {
			Name = "Detail",
			Position = UDim2.new(0.58, 4, 0, 0),
			Size = UDim2.new(0.42, -metrics.padding - 4, 1, 0),
			BackgroundColor3 = Ui_Theme.Color.detailBackground,
		}, "ui:Detail")
		Ui_Widgets.Corner(detail)
		self.parts.detail = detail

		self.parts.detailTitle = Ui_Widgets.Label(detail, {
			Name = "DetailTitle",
			Position = UDim2.new(0, 10, 0, 8),
			Size = UDim2.new(1, -20, 0, 20),
			Text = "Chưa chọn mục nào",
			Font = Ui_Theme.Font.heading,
			TextSize = Ui_Theme.TextSize.heading,
		}, "ui:DetailTitle")

		self.parts.detailBody = Ui_Widgets.Label(detail, {
			Name = "DetailBody",
			Position = UDim2.new(0, 10, 0, 32),
			Size = UDim2.new(1, -20, 1, -74),
			Text = "",
			TextSize = Ui_Theme.TextSize.small,
			TextColor3 = Ui_Theme.Color.textSecondary,
			TextYAlignment = Enum.TextYAlignment.Top,
			TextWrapped = true,
		}, "ui:DetailBody")

		-- Hai nút hành động của mục đang xem chi tiết.
		self.parts.detailSelectButton = Ui_Widgets.Button(detail, {
			Name = "DetailSelect",
			Position = UDim2.new(0, 10, 1, -32),
			Size = UDim2.new(0.5, -14, 0, 24),
			Text = "Chọn",
			TextSize = Ui_Theme.TextSize.small,
		}, "ui:DetailSelect")
		Ui_Widgets.Corner(self.parts.detailSelectButton, UDim.new(0, 6))
		Ui_Widgets.OnClick(self.parts.detailSelectButton, function()
			if self.selectedId ~= nil then
				self:_call("onToggleSelect", self.selectedId)
			end
		end, "ui:clickDetailSelect")

		self.parts.detailTrackButton = Ui_Widgets.Button(detail, {
			Name = "DetailTrack",
			Position = UDim2.new(0.5, 4, 1, -32),
			Size = UDim2.new(0.5, -14, 0, 24),
			Text = "Theo dõi",
			TextSize = Ui_Theme.TextSize.small,
		}, "ui:DetailTrack")
		Ui_Widgets.Corner(self.parts.detailTrackButton, UDim.new(0, 6))
		Ui_Widgets.OnClick(self.parts.detailTrackButton, function()
			if self.selectedId ~= nil then
				self:_call("onToggleTrack", self.selectedId)
			end
		end, "ui:clickDetailTrack")
	end
end

function RadarUi:_buildHomePage(body, layout)
	local metrics = Ui_Theme.Metrics
	local page = Ui_Widgets.Frame(body, {
		Name = "HomePage",
		Position = UDim2.new(0, 0, 0, 0),
		Size = UDim2.new(1, 0, 1, 0),
		BackgroundTransparency = 1,
		Visible = false,
	}, "ui:HomePage")
	self.pages.home = page
	self.parts.homePage = page

	self.parts.homeState = Ui_Widgets.Label(page, {
		Name = "HomeState",
		Position = UDim2.new(0, metrics.padding, 0, 4),
		Size = UDim2.new(1, -metrics.padding * 2, 0, 22),
		Text = "chưa khởi động",
		Font = Ui_Theme.Font.heading,
		TextSize = Ui_Theme.TextSize.heading,
	}, "ui:HomeState")

	self.parts.homeCounts = Ui_Widgets.Label(page, {
		Name = "HomeCounts",
		Position = UDim2.new(0, metrics.padding, 0, 30),
		Size = UDim2.new(0.58, -metrics.padding, 1, -110),
		Text = "",
		TextSize = Ui_Theme.TextSize.small,
		TextColor3 = Ui_Theme.Color.textSecondary,
		TextYAlignment = Enum.TextYAlignment.Top,
		TextWrapped = true,
	}, "ui:HomeCounts")

	self.parts.homeWarnings = Ui_Widgets.Label(page, {
		Name = "HomeWarnings",
		Position = UDim2.new(0.58, 4, 0, 30),
		Size = UDim2.new(0.42, -metrics.padding - 4, 1, -110),
		Text = "",
		TextSize = Ui_Theme.TextSize.small,
		TextColor3 = Ui_Theme.Color.warning,
		TextYAlignment = Enum.TextYAlignment.Top,
		TextWrapped = true,
	}, "ui:HomeWarnings")

	-- Thao tác nhanh. Nút dùng lại callback y hệt các nút ở nơi khác — không
	-- có nút "trang trí" nào ở đây.
	local quick = Ui_Widgets.Frame(page, {
		Name = "QuickActions",
		Position = UDim2.new(0, metrics.padding, 1, -66),
		Size = UDim2.new(1, -metrics.padding * 2, 0, 62),
		BackgroundTransparency = 1,
	}, "ui:QuickActions")
	Ui_Widgets.ListLayout(quick, {
		FillDirection = Enum.FillDirection.Horizontal,
		Padding = UDim.new(0, 6),
		VerticalAlignment = Enum.VerticalAlignment.Center,
	})

	local quickButtons = {
		{ name = "HomePrimary", label = "Khởi động", handler = function()
			self:_call("onPrimary")
		end },
		{ name = "HomeRefresh", label = "Làm mới dữ liệu", handler = function()
			self:_call("onRefresh")
		end },
		{ name = "HomeList", label = "Xem danh sách", handler = function()
			self:_call("onTab", "all")
		end },
		{ name = "HomeSelected", label = "Xem mục đã chọn", handler = function()
			self:_call("onTab", "selected")
		end },
		{ name = "HomeSelectAll", label = "Chọn tất cả khu vực", handler = function()
			self:_call("onSelectAllAreas")
		end },
		{ name = "HomeLog", label = "Nhật ký", handler = function()
			self:_call("onTab", "log")
		end },
	}
	for order, spec in ipairs(quickButtons) do
		local button = Ui_Widgets.Button(quick, {
			Name = spec.name,
			Size = UDim2.new(0, 132, 0, 26),
			Text = spec.label,
			TextSize = Ui_Theme.TextSize.small,
			LayoutOrder = order,
		}, "ui:QuickButton")
		Ui_Widgets.Corner(button, UDim.new(0, 6))
		self.parts[spec.name .. "Button"] = button
		Ui_Widgets.OnClick(button, spec.handler, "ui:click" .. spec.name)
	end
end

function RadarUi:_buildSettingsPage(body, layout)
	local metrics = Ui_Theme.Metrics
	local page = Ui_Widgets.Scrolling(body, {
		Name = "SettingsPage",
		Position = UDim2.new(0, 0, 0, 0),
		Size = UDim2.new(1, 0, 1, 0),
		BackgroundTransparency = 1,
		ScrollingDirection = Enum.ScrollingDirection.Y,
		Visible = false,
	}, "ui:SettingsPage")
	Ui_Widgets.ListLayout(page, { Padding = UDim.new(0, 4) })
	Ui_Widgets.Padding(page, metrics.padding)
	self.pages.settings = page
	self.parts.settingsPage = page

	--[[
		Mỗi công tắc là MỘT nút: bấm để đổi giá trị. Giá trị mới được gửi lên
		Radar qua callback onSetting — UI KHÔNG tự sửa cấu hình, vì cấu hình là
		dữ liệu dùng chung với Scanner/Tracker.
	]]
	local toggles = {
		{ key = "Ui.showTabs", label = "Hiện thanh tab", path = { "Ui", "showTabs" } },
		{ key = "Ui.showSearch", label = "Hiện ô tìm kiếm", path = { "Ui", "showSearch" } },
		{ key = "Ui.showAreaFilter", label = "Hiện bộ lọc khu vực", path = { "Ui", "showAreaFilter" } },
		{ key = "Ui.showDetailPanel", label = "Hiện bảng chi tiết", path = { "Ui", "showDetailPanel" } },
		{ key = "Ui.showStatusBar", label = "Hiện thanh trạng thái", path = { "Ui", "showStatusBar" } },
		{ key = "Ui.showCounters", label = "Hiện bộ đếm trạng thái", path = { "Ui", "showCounters" } },
		{ key = "Ui.showSelectionBar", label = "Hiện thanh chọn thực thể", path = { "Ui", "showSelectionBar" } },
		{ key = "Ui.enableDrag", label = "Cho phép kéo thả bảng", path = { "Ui", "enableDrag" } },
		{ key = "System.alertOnTrack", label = "Ghi nhật ký khi mục theo dõi xuất hiện", path = { "System", "alertOnTrack" } },
	}

	for order, toggle in ipairs(toggles) do
		local row = Ui_Widgets.Frame(page, {
			Name = "Setting_" .. toggle.key:gsub("%.", "_"),
			Size = UDim2.new(1, -metrics.padding * 2, 0, 28),
			BackgroundColor3 = Ui_Theme.Color.rowBackground,
			LayoutOrder = order,
		}, "ui:SettingRow")
		Ui_Widgets.Corner(row, UDim.new(0, 6))

		Ui_Widgets.Label(row, {
			Name = "Label",
			Position = UDim2.new(0, 10, 0, 0),
			Size = UDim2.new(1, -110, 1, 0),
			Text = toggle.label,
			TextSize = Ui_Theme.TextSize.small,
			TextTruncate = Enum.TextTruncate.AtEnd,
		}, "ui:SettingLabel")

		local button = Ui_Widgets.Button(row, {
			Name = "Toggle",
			AnchorPoint = Vector2.new(1, 0.5),
			Position = UDim2.new(1, -8, 0.5, 0),
			Size = UDim2.fromOffset(86, 22),
			Text = "bật",
			TextSize = Ui_Theme.TextSize.small,
		}, "ui:SettingToggle")
		Ui_Widgets.Corner(button, UDim.new(0, 6))
		self.settingButtons[toggle.key] = { button = button, path = toggle.path }
		Ui_Widgets.OnClick(button, function()
			local currentValue = self:_readConfig(toggle.path)
			self:_call("onSetting", toggle.key, currentValue ~= true)
		end, "ui:clickSetting")
	end

	-- Nút xoá nhật ký (hành động thật, không phải nút trang trí).
	local clearRow = Ui_Widgets.Frame(page, {
		Name = "Setting_LogActions",
		Size = UDim2.new(1, -metrics.padding * 2, 0, 28),
		BackgroundTransparency = 1,
		LayoutOrder = #toggles + 1,
	}, "ui:SettingLogRow")
	local clearButton = Ui_Widgets.Button(clearRow, {
		Name = "ClearLog",
		Size = UDim2.new(0, 160, 0, 24),
		Text = "Xoá nhật ký trên giao diện",
		TextSize = Ui_Theme.TextSize.small,
	}, "ui:ClearLogButton")
	Ui_Widgets.Corner(clearButton, UDim.new(0, 6))
	self.parts.clearLogButton = clearButton
	Ui_Widgets.OnClick(clearButton, function()
		self:_call("onClearLog")
	end, "ui:clickClearLog")
end

function RadarUi:_buildLogPage(body, layout)
	local metrics = Ui_Theme.Metrics
	local page = Ui_Widgets.Frame(body, {
		Name = "LogPage",
		Position = UDim2.new(0, 0, 0, 0),
		Size = UDim2.new(1, 0, 1, 0),
		BackgroundTransparency = 1,
		Visible = false,
	}, "ui:LogPage")
	self.pages.log = page
	self.parts.logPage = page

	self.parts.logText = Ui_Widgets.Scrolling(page, {
		Name = "LogText",
		Position = UDim2.new(0, metrics.padding, 0, 0),
		Size = UDim2.new(1, -metrics.padding * 2, 1, -34),
		BackgroundColor3 = Ui_Theme.Color.inputBackground,
		ScrollingDirection = Enum.ScrollingDirection.Y,
	}, "ui:LogScroll")
	Ui_Widgets.Corner(self.parts.logText)

	self.parts.logBody = Ui_Widgets.Label(self.parts.logText, {
		Name = "LogBody",
		Position = UDim2.new(0, 8, 0, 6),
		Size = UDim2.new(1, -16, 1, -12),
		Text = "(chưa có dòng nào)",
		TextSize = Ui_Theme.TextSize.tiny,
		Font = Ui_Theme.Font.mono,
		TextColor3 = Ui_Theme.Color.textSecondary,
		TextYAlignment = Enum.TextYAlignment.Top,
		TextWrapped = true,
	}, "ui:LogBody")

	local actions = Ui_Widgets.Frame(page, {
		Name = "LogActions",
		Position = UDim2.new(0, metrics.padding, 1, -28),
		Size = UDim2.new(1, -metrics.padding * 2, 0, 26),
		BackgroundTransparency = 1,
	}, "ui:LogActions")
	Ui_Widgets.ListLayout(actions, {
		FillDirection = Enum.FillDirection.Horizontal,
		Padding = UDim.new(0, 6),
		VerticalAlignment = Enum.VerticalAlignment.Center,
	})

	self.parts.logRefreshButton = Ui_Widgets.Button(actions, {
		Name = "LogRefresh",
		Size = UDim2.fromOffset(120, 24),
		Text = "Làm mới nhật ký",
		TextSize = Ui_Theme.TextSize.small,
	}, "ui:LogRefresh")
	Ui_Widgets.Corner(self.parts.logRefreshButton, UDim.new(0, 6))
	Ui_Widgets.OnClick(self.parts.logRefreshButton, function()
		self:_syncLog(true)
	end, "ui:clickLogRefresh")

	self.parts.logClearButton = Ui_Widgets.Button(actions, {
		Name = "LogClear",
		Size = UDim2.fromOffset(120, 24),
		Text = "Xoá nhật ký",
		TextSize = Ui_Theme.TextSize.small,
	}, "ui:LogClear")
	Ui_Widgets.Corner(self.parts.logClearButton, UDim.new(0, 6))
	Ui_Widgets.OnClick(self.parts.logClearButton, function()
		self:_call("onClearLog")
	end, "ui:clickLogClear")
end

-- Đọc một giá trị cấu hình theo đường dẫn { "Ui", "showTabs" }.
function RadarUi:_readConfig(pathList)
	local node = self.config
	for _, key in ipairs(pathList) do
		if type(node) ~= "table" then
			return nil
		end
		node = node[key]
	end
	return node
end

--============================= KÉO THẢ BẢNG ============================

--[[
	Kéo bảng bằng thanh tiêu đề. Dùng InputBegan trên Header + InputChanged
	của UserInputService, cùng một công thức cho chuột và cảm ứng.

	RÀNG BUỘC:
	  * Toàn bộ lời đọc API đều qua pcall: thiếu service/thiếu property thì
	    tính năng kéo tắt chứ không ném lỗi.
	  * Connection được đăng ký vào Registry nên Destroy() dọn được.
	  * KHÔNG giữ vòng lặp nào: chỉ có handler chạy khi có input.
]]
function RadarUi:_enableDrag()
	local uiConfig = self.config.Ui or {}
	if uiConfig.enableDrag == false then
		return false
	end
	if self.parts.header == nil or self.parts.panel == nil then
		return false
	end

	local uis = Client_Env.GetService("UserInputService")
	if uis == nil then
		return false
	end

	local mouseType = Enum.UserInputType and Enum.UserInputType.MouseButton1 or nil
	local touchType = Enum.UserInputType and Enum.UserInputType.Touch or nil

	local began = Shared_Safe.Read(self.parts.header, "InputBegan")
	Client_Registry.Connect(began, function(input, gameProcessed)
		if gameProcessed == true then
			return
		end
		local inputType = Shared_Safe.Read(input, "UserInputType")
		if inputType ~= mouseType and inputType ~= touchType then
			return
		end
		local position, ok = Shared_Safe.Read(input, "Position")
		if not ok or position == nil then
			return
		end
		local startX, startY = position.X, position.Y
		if not (Shared_Geometry.IsFiniteNumber(startX) and Shared_Geometry.IsFiniteNumber(startY)) then
			return
		end
		local current, okPosition = Shared_Safe.Read(self.parts.panel, "Position")
		if not okPosition or current == nil then
			return
		end
		self.drag = {
			startX = startX,
			startY = startY,
			originX = current.X.Offset,
			originY = current.Y.Offset,
			scaleX = current.X.Scale,
			scaleY = current.Y.Scale,
		}
	end, "ui:dragBegan")

	local changed = Shared_Safe.Read(uis, "InputChanged")
	Client_Registry.Connect(changed, function(input, gameProcessed)
		if self.drag == nil or gameProcessed == true then
			return
		end
		local inputType = Shared_Safe.Read(input, "UserInputType")
		if inputType ~= mouseType and inputType ~= touchType then
			return
		end
		local position, ok = Shared_Safe.Read(input, "Position")
		if not ok or position == nil then
			return
		end
		local deltaX = position.X - self.drag.startX
		local deltaY = position.Y - self.drag.startY
		if not (Shared_Geometry.IsFiniteNumber(deltaX) and Shared_Geometry.IsFiniteNumber(deltaY)) then
			return
		end
		local nextX = self.drag.originX + deltaX
		local nextY = self.drag.originY + deltaY

		-- KẸP TRONG MÀN HÌNH: bảng neo giữa (AnchorPoint 0.5, 0.5) nên offset
		-- tối đa là (kích thước màn hình - kích thước bảng) / 2. Không đọc được
		-- ViewportSize thì bỏ qua bước kẹp (không đoán kích thước màn hình).
		local viewport = self.viewport
		if viewport ~= nil and self.layout ~= nil then
			local scale = self.layout.scale or 1
			local halfWidth = (self.layout.panelWidth * scale) / 2
			local halfHeight = ((self.minimized and Ui_Theme.Metrics.headerHeight
				or self.layout.panelHeight) * scale) / 2
			local limitX = math.max(0, (viewport.x / 2) - halfWidth)
			local limitY = math.max(0, (viewport.y / 2) - halfHeight)
			-- Không dùng math.clamp: đó là hàm Luau-only, Lua 5.3 của harness
			-- không có (lint cũng chặn). Viết tường minh bằng math.min/math.max.
			nextX = math.max(-limitX, math.min(limitX, nextX))
			nextY = math.max(-limitY, math.min(limitY, nextY))
		end

		self.stats.drags = self.stats.drags + 1
		Ui_Widgets.Set(self.parts.panel, "Position", UDim2.new(
			self.drag.scaleX, nextX, self.drag.scaleY, nextY
		))
	end, "ui:dragChanged")

	local ended = Shared_Safe.Read(uis, "InputEnded")
	Client_Registry.Connect(ended, function(input)
		if self.drag == nil then
			return
		end
		local inputType = Shared_Safe.Read(input, "UserInputType")
		if inputType == mouseType or inputType == touchType then
			self.drag = nil
		end
	end, "ui:dragEnded")

	return true
end

--=========================== THU NHỎ / MỞ LẠI =========================

function RadarUi:SetMinimized(minimized)
	if self.parts.panel == nil then
		return false
	end
	local wantMinimized = minimized == true
	if self.minimized == wantMinimized then
		return false
	end
	self.minimized = wantMinimized

	local metrics = Ui_Theme.Metrics
	local layout = self.layout
	local height = wantMinimized and metrics.headerHeight or layout.panelHeight
	Ui_Widgets.Set(self.parts.panel, "Size", UDim2.fromOffset(layout.panelWidth, height))
	Ui_Widgets.SetText(self.parts.minimizeButton, wantMinimized and "+" or "—")

	-- Ẩn/hiện từng khối: dùng SetVisible (có so sánh) nên không ghi thừa.
	Ui_Widgets.SetVisible(self.parts.tabBar, not wantMinimized)
	Ui_Widgets.SetVisible(self.parts.filterBar, not wantMinimized)
	Ui_Widgets.SetVisible(self.parts.selectionBar, not wantMinimized)
	Ui_Widgets.SetVisible(self.parts.body, not wantMinimized)
	Ui_Widgets.SetVisible(self.parts.statusBar, not wantMinimized)

	self:_call("onMinimize", wantMinimized)
	return true
end

function RadarUi:ToggleMinimized()
	return self:SetMinimized(not self.minimized)
end

function RadarUi:IsMinimized()
	return self.minimized
end

--=============================== CHUYỂN TAB ============================

--[[
	CHUYỂN TAB. Chỉ đổi Visible + tô sáng nút, KHÔNG dựng lại widget nào.
	Trả về (ok, message). `silent` = true khi gọi từ Build (không báo callback).
]]
function RadarUi:SetTab(tabId, silent)
	local tab = Shared_Config.GetTab(tabId)
	if tab == nil then
		return false, ("Không có tab '%s'"):format(tostring(tabId))
	end
	if not self.built then
		return false, "Giao diện chưa dựng."
	end

	local changed = self.activeTab ~= tab.id
	self.activeTab = tab.id
	self.activeKind = tab.kind

	-- 1) Tô sáng nút tab đang mở.
	for id, button in pairs(self.tabButtons) do
		local active = id == tab.id
		Ui_Widgets.SetColor(button, "BackgroundColor3",
			active and Ui_Theme.Color.accentDark or Ui_Theme.Color.rowBackground)
		Ui_Widgets.SetColor(button, "TextColor3",
			active and Ui_Theme.Color.textPrimary or Ui_Theme.Color.textSecondary)
	end

	-- 2) Hiện đúng MỘT trang. Trang nào cũng đã tồn tại từ lúc Build.
	local showList = tab.kind == "area" or tab.kind == "selected"
	Ui_Widgets.SetVisible(self.pages.list, showList)
	Ui_Widgets.SetVisible(self.pages.home, tab.kind == "home")
	Ui_Widgets.SetVisible(self.pages.settings, tab.kind == "settings")
	Ui_Widgets.SetVisible(self.pages.log, tab.kind == "log")

	if changed then
		self.stats.tabSwitches = self.stats.tabSwitches + 1
	end
	if silent ~= true and changed then
		self:_call("onTabApplied", tab.id)
	end
	return true, tab.label
end

function RadarUi:ActiveTab()
	return self.activeTab
end

function RadarUi:ActiveKind()
	return self.activeKind
end

--============================= DÒNG DANH SÁCH ==========================

-- Tạo (hoặc lấy lại) một dòng ở vị trí `slot`. Dòng được TÁI SỬ DỤNG.
function RadarUi:_row(slot)
	local existing = self.rows[slot]
	if existing ~= nil then
		return existing
	end
	local metrics = Ui_Theme.Metrics
	local frame = Ui_Widgets.Button(self.parts.list, {
		Name = "Row" .. slot,
		Size = UDim2.new(1, -4, 0, metrics.rowHeight),
		BackgroundColor3 = Ui_Theme.Color.rowBackground,
		Text = "",
		LayoutOrder = slot,
	}, "ui:Row")
	Ui_Widgets.Corner(frame, UDim.new(0, 6))

	-- Ô CHỌN. Là nút con nên bấm vào ô không kích hoạt lựa chọn "xem chi tiết"
	-- của cả dòng (Roblox không lan sự kiện click từ TextButton con lên cha).
	local check = Ui_Widgets.Button(frame, {
		Name = "Check",
		Position = UDim2.new(0, 6, 0.5, -11),
		Size = UDim2.fromOffset(22, 22),
		Text = "",
		TextSize = Ui_Theme.TextSize.small,
		BackgroundColor3 = Ui_Theme.Color.inputBackground,
	}, "ui:RowCheck")
	Ui_Widgets.Corner(check, UDim.new(0, 4))
	Ui_Widgets.Stroke(check, Ui_Theme.Color.panelEdge, 1)

	local dot = Ui_Widgets.Frame(frame, {
		Name = "Dot",
		Position = UDim2.new(0, 34, 0.5, -4),
		Size = UDim2.fromOffset(8, 8),
		BackgroundColor3 = Ui_Theme.Color.textMuted,
	}, "ui:RowDot")
	Ui_Widgets.Corner(dot, UDim.new(1, 0))

	local nameLabel = Ui_Widgets.Label(frame, {
		Name = "Name",
		Position = UDim2.new(0, 48, 0, 0),
		Size = UDim2.new(0.42, -48, 1, 0),
		TextTruncate = Enum.TextTruncate.AtEnd,
	}, "ui:RowName")

	local kindLabel = Ui_Widgets.Label(frame, {
		Name = "Kind",
		Position = UDim2.new(0.42, 0, 0, 0),
		Size = UDim2.new(0.16, 0, 1, 0),
		TextSize = Ui_Theme.TextSize.tiny,
		TextColor3 = Ui_Theme.Color.textMuted,
		TextTruncate = Enum.TextTruncate.AtEnd,
	}, "ui:RowKind")

	local statusLabel = Ui_Widgets.Label(frame, {
		Name = "Status",
		Position = UDim2.new(0.58, 0, 0, 0),
		Size = UDim2.new(0.42, -64, 1, 0),
		TextSize = Ui_Theme.TextSize.tiny,
		TextXAlignment = Enum.TextXAlignment.Right,
		TextTruncate = Enum.TextTruncate.AtEnd,
	}, "ui:RowStatus")

	local distanceLabel = Ui_Widgets.Label(frame, {
		Name = "Distance",
		Position = UDim2.new(1, -56, 0, 0),
		Size = UDim2.new(0, 50, 1, 0),
		TextSize = Ui_Theme.TextSize.tiny,
		Font = Ui_Theme.Font.mono,
		TextColor3 = Ui_Theme.Color.accent,
		TextXAlignment = Enum.TextXAlignment.Right,
	}, "ui:RowDistance")

	-- Dấu chấm nhỏ báo "đang theo dõi" (chỉ hiện khi người dùng bật theo dõi).
	local trackDot = Ui_Widgets.Frame(frame, {
		Name = "TrackDot",
		Position = UDim2.new(1, -64, 0.5, -3),
		Size = UDim2.fromOffset(6, 6),
		BackgroundColor3 = Ui_Theme.Color.ok,
		Visible = false,
	}, "ui:RowTrack")
	Ui_Widgets.Corner(trackDot, UDim.new(1, 0))

	local row = {
		frame = frame,
		check = check,
		dot = dot,
		nameLabel = nameLabel,
		kindLabel = kindLabel,
		statusLabel = statusLabel,
		distanceLabel = distanceLabel,
		trackDot = trackDot,
		entityId = nil,
	}

	Ui_Widgets.OnClick(check, function()
		if row.entityId ~= nil then
			self.stats.selectionClicks = self.stats.selectionClicks + 1
			self:_call("onToggleSelect", row.entityId)
		end
	end, "ui:clickRowCheck")

	Ui_Widgets.OnClick(frame, function()
		if row.entityId ~= nil then
			self:_call("onSelect", row.entityId)
		end
	end, "ui:clickRow")

	self.rows[slot] = row
	return row
end

--=============================== ĐỔ DỮ LIỆU ============================

function RadarUi:_syncHeader(view)
	if self.parts.stateLabel == nil then
		return
	end
	Ui_Widgets.SetText(self.parts.stateLabel, view.stateText or "chưa khởi động")
	Ui_Widgets.SetColor(self.parts.stateLabel, "TextColor3",
		view.stateColor or Ui_Theme.Color.textSecondary)
	Ui_Widgets.SetText(self.parts.primaryButton, view.primaryLabel or "Khởi động")
	Ui_Widgets.SetText(self.parts.homePrimaryButton, view.primaryLabel or "Khởi động")
end

function RadarUi:_syncFilters(view)
	-- Tô sáng nút khu vực đang chọn.
	local activeArea = view.areaId or "all"
	if self.lastAreaId ~= activeArea then
		for areaId, button in pairs(self.areaButtons) do
			local selected = areaId == activeArea
			Ui_Widgets.SetColor(button, "BackgroundColor3",
				selected and Ui_Theme.Color.accentDark or Ui_Theme.Color.rowBackground)
			Ui_Widgets.SetColor(button, "TextColor3",
				selected and Ui_Theme.Color.textPrimary or Ui_Theme.Color.textSecondary)
		end
		self.lastAreaId = activeArea
	end

	-- Tô sáng bộ lọc lựa chọn.
	local activeFilter = view.selectionFilter or "all"
	if self.lastFilter ~= activeFilter then
		for filterId, button in pairs(self.filterButtons) do
			local selected = filterId == activeFilter
			Ui_Widgets.SetColor(button, "BackgroundColor3",
				selected and Ui_Theme.Color.accentDark or Ui_Theme.Color.rowBackground)
			Ui_Widgets.SetColor(button, "TextColor3",
				selected and Ui_Theme.Color.textPrimary or Ui_Theme.Color.textSecondary)
		end
		self.lastFilter = activeFilter
	end

	-- Tô sáng tab đang mở (khi Radar đổi tab từ bên ngoài, ví dụ SetArea).
	if self.lastTabId ~= self.activeTab then
		for tabId, button in pairs(self.tabButtons) do
			local active = tabId == self.activeTab
			Ui_Widgets.SetColor(button, "BackgroundColor3",
				active and Ui_Theme.Color.accentDark or Ui_Theme.Color.rowBackground)
			Ui_Widgets.SetColor(button, "TextColor3",
				active and Ui_Theme.Color.textPrimary or Ui_Theme.Color.textSecondary)
		end
		self.lastTabId = self.activeTab
	end
end

--[[
	Lọc danh sách dòng theo:
	  * tab "selected"  -> chỉ giữ mục đã chọn;
	  * bộ lọc lựa chọn -> "selected" / "unselected" / "all".
	Ghi vào self.filteredRows (bảng tái sử dụng) để không tạo rác mỗi nhịp.
]]
function RadarUi:_filterRows(rows, selectionIds, filter)
	local out = self.filteredRows
	for index = #out, 1, -1 do
		out[index] = nil
	end
	local onlySelected = filter == "selected" or self.activeKind == "selected"
	local onlyUnselected = filter == "unselected"
	for _, data in ipairs(rows) do
		local entry = data.entry
		local isSelected = entry ~= nil and selectionIds ~= nil and selectionIds[entry.id] == true
		local keep = true
		if onlySelected and not isSelected then
			keep = false
		end
		if onlyUnselected and isSelected then
			keep = false
		end
		if keep then
			out[#out + 1] = data
		end
	end
	return out
end

function RadarUi:_syncList(view)
	if self.parts.list == nil then
		return
	end
	-- Trang danh sách không mở thì không tốn công vẽ (tab Nhật ký/Cài đặt...).
	if self.activeKind ~= "area" and self.activeKind ~= "selected" then
		self.renderedRows = 0
		self.lastRowCount = 0
		return
	end

	local selectionIds = view.selectionIds
	local rows = self:_filterRows(view.rows or {}, selectionIds, view.selectionFilter)
	-- Tên trường cấu hình là maxVisibleRows (không phải maxRows): đọc sai
	-- tên trường sẽ khiến config của người dùng bị bỏ qua âm thầm.
	local maxRows = (self.config.Ui and self.config.Ui.maxVisibleRows) or Ui_Theme.Metrics.maxRows
	local visibleCount = math.min(#rows, maxRows)
	local trackedIds = view.trackedIds

	for slot = 1, visibleCount do
		local data = rows[slot]
		local row = self:_row(slot)
		local entry = data.entry
		local record = data.record
		local code = record and record.code or Shared_Status.Code.Disabled

		Ui_Widgets.SetVisible(row.frame, true)
		row.entityId = entry.id
		Ui_Widgets.SetText(row.nameLabel, entry.name)
		Ui_Widgets.SetColor(row.nameLabel, "TextColor3",
			entry.id == self.selectedId and Ui_Theme.Color.textPrimary or Ui_Theme.Color.textPrimary)
		Ui_Widgets.SetText(row.kindLabel, Shared_Catalog.KindLabel[entry.kind] or entry.kind)
		Ui_Widgets.SetColor(row.kindLabel, "TextColor3", Ui_Theme.KindColor(entry.kind))

		local statusText = Shared_Status.GetLabel(code)
		if record ~= nil and record.stale then
			statusText = statusText .. " (dữ liệu cũ)"
		end
		Ui_Widgets.SetText(row.statusLabel, statusText)
		Ui_Widgets.SetColor(row.statusLabel, "TextColor3", Ui_Theme.StatusColor(code))
		Ui_Widgets.SetColor(row.dot, "BackgroundColor3", Ui_Theme.StatusColor(code))

		-- CHỐT TRUNG THỰC: chỉ DETECTED mới được hiện khoảng cách.
		local distanceText = "—"
		if Shared_Status.MayShowPosition(code) and record.observation ~= nil then
			local formatted = Shared_Geometry.FormatDistance(record.observation.distance)
			if formatted ~= nil then
				distanceText = formatted
			else
				distanceText = "không rõ"
			end
		end
		Ui_Widgets.SetText(row.distanceLabel, distanceText)

		-- Ô chọn: "X" + viền xanh khi đã chọn; rỗng + viền xám khi chưa.
		local isSelected = selectionIds ~= nil and selectionIds[entry.id] == true
		Ui_Widgets.SetText(row.check, isSelected and "X" or "")
		Ui_Widgets.SetColor(row.check, "BackgroundColor3",
			isSelected and Ui_Theme.Color.accentDark or Ui_Theme.Color.inputBackground)

		-- Dấu "đang theo dõi".
		local isTracked = trackedIds ~= nil and trackedIds[entry.id] == true
		Ui_Widgets.SetVisible(row.trackDot, isTracked)

		Ui_Widgets.SetColor(row.frame, "BackgroundColor3",
			entry.id == self.selectedId and Ui_Theme.Color.rowSelected
				or (slot % 2 == 0 and Ui_Theme.Color.rowBackgroundAlt or Ui_Theme.Color.rowBackground))

		self.stats.rowsUpdated = self.stats.rowsUpdated + 1
	end

	-- Ẩn các dòng thừa (không huỷ: tái sử dụng ở lần sau).
	for slot = visibleCount + 1, #self.rows do
		local row = self.rows[slot]
		row.entityId = nil
		Ui_Widgets.SetVisible(row.frame, false)
	end

	self.renderedRows = visibleCount
	self.lastRowCount = #rows

	-- Nhãn "rỗng" cho trường hợp không có dòng nào (tab Đã chọn lúc chưa chọn).
	if self.parts.emptyLabel ~= nil then
		local emptyText = ""
		if visibleCount == 0 then
			if self.activeKind == "selected" then
				emptyText = "Chưa chọn thực thể nào. Mở tab khu vực và bấm vào ô vuông bên trái tên để chọn."
			else
				emptyText = "Không có mục nào khớp bộ lọc hiện tại."
			end
		end
		Ui_Widgets.SetText(self.parts.emptyLabel, emptyText)
		Ui_Widgets.SetVisible(self.parts.emptyLabel, visibleCount == 0)
	end

	-- CanvasSize là bảng mới mỗi lần tạo, nên phải SO SÁNH chiều cao trước
	-- khi ghi; nếu không mỗi lần Sync sẽ tốn một lần ghi property thừa.
	local canvasHeight = visibleCount * (Ui_Theme.Metrics.rowHeight + 3)
	if self.lastCanvasHeight ~= canvasHeight then
		Ui_Widgets.Set(self.parts.list, "CanvasSize", UDim2.fromOffset(0, canvasHeight))
		self.lastCanvasHeight = canvasHeight
	end
end

-- Bộ đếm "Đã chọn 12/50": 12 = tổng số đã chọn, 50 = số mục trong phạm vi xem.
function RadarUi:_syncSelectionBar(view)
	if self.parts.selectionCounter == nil then
		return
	end
	local selectedCount = view.selectedCount or 0
	local trackedCount = view.trackedCount or 0
	local changed = self.lastSelectionCount ~= selectedCount
		or self.lastScopeCount ~= view.scopeCount
		or self.lastTrackedCount ~= trackedCount
	self.lastSelectionCount = selectedCount
	self.lastScopeCount = view.scopeCount
	self.lastTrackedCount = trackedCount
	if not changed then
		return
	end
	Ui_Widgets.SetText(self.parts.selectionCounter,
		("Đã chọn %d/%d"):format(selectedCount, view.scopeCount or selectedCount))

	-- Nút theo dõi nhóm: đổi nhãn theo trạng thái thật.
	if self.parts.trackSelectionButton ~= nil then
		local trackedAll = selectedCount > 0 and trackedCount >= selectedCount
		Ui_Widgets.SetText(self.parts.trackSelectionButton,
			trackedAll and "Ngừng theo dõi" or "Theo dõi mục đã chọn")
		Ui_Widgets.SetColor(self.parts.trackSelectionButton, "BackgroundColor3",
			trackedAll and Ui_Theme.Color.accentDark or Ui_Theme.Color.rowBackground)
	end
end

function RadarUi:_syncHome(view)
	if self.parts.homeState == nil then
		return
	end
	Ui_Widgets.SetText(self.parts.homeState, view.stateText or "chưa khởi động")
	Ui_Widgets.SetColor(self.parts.homeState, "TextColor3",
		view.stateColor or Ui_Theme.Color.textSecondary)

	local counts = view.counts or {}
	local lines = {}
	lines[#lines + 1] = ("Danh mục: %d thực thể, %d khu vực")
		:format(Shared_Catalog.Count(), Shared_Areas.Count())
	lines[#lines + 1] = ("Đã phát hiện: %d"):format(counts[Shared_Status.Code.Detected] or 0)
	lines[#lines + 1] = ("Không phát hiện: %d"):format(counts[Shared_Status.Code.NotFound] or 0)
	lines[#lines + 1] = ("Không hỗ trợ phát hiện: %d"):format(counts[Shared_Status.Code.Unsupported] or 0)
	lines[#lines + 1] = ("Chưa xác minh: %d"):format(counts[Shared_Status.Code.Unverified] or 0)
	lines[#lines + 1] = ("Đang theo dõi: %d"):format(view.trackedCount or 0)
	lines[#lines + 1] = ("Đã chọn: %d"):format(view.selectedCount or 0)
	lines[#lines + 1] = ("Cập nhật: %s"):format(tostring(view.lastUpdateText or "chưa có"))
	lines[#lines + 1] = ""
	lines[#lines + 1] = "Ghi nhớ: có tên trong danh mục KHÔNG có nghĩa là định vị được."
	Ui_Widgets.SetText(self.parts.homeCounts, table.concat(lines, "\n"))

	local warningText = view.warningText
	Ui_Widgets.SetText(self.parts.homeWarnings,
		(warningText == nil or warningText == "") and "Không có cảnh báo." or ("Cảnh báo:\n" .. warningText))
end

function RadarUi:_syncLog(force)
	if self.parts.logBody == nil then
		return
	end
	-- Chỉ đọc nhật ký khi tab đang mở: đọc mỗi nhịp trên tab khác là phí.
	if force ~= true and self.activeKind ~= "log" then
		return
	end
	local count = #Shared_Log.history
	if force ~= true and count == self.lastLogCount then
		return
	end
	self.lastLogCount = count
	local history = Shared_Log.History(40)
	local lines = {}
	if #history == 0 then
		lines[#lines + 1] = "(chưa có dòng nào)"
	else
		for _, entry in ipairs(history) do
			lines[#lines + 1] = entry.text
		end
	end
	Ui_Widgets.SetText(self.parts.logBody, table.concat(lines, "\n"))
end

function RadarUi:_syncSettings()
	-- Cập nhật chữ trên các công tắc theo cấu hình hiện tại.
	for key, spec in pairs(self.settingButtons) do
		local value = self:_readConfig(spec.path)
		Ui_Widgets.SetText(spec.button, value == true and "bật" or "tắt")
		Ui_Widgets.SetColor(spec.button, "BackgroundColor3",
			value == true and Ui_Theme.Color.accentDark or Ui_Theme.Color.rowBackground)
	end
end

function RadarUi:_syncDetail(view)
	if self.parts.detailBody == nil then
		return
	end
	local entityId = view.selectedId
	if entityId == nil then
		Ui_Widgets.SetText(self.parts.detailTitle, "Chưa chọn mục nào")
		Ui_Widgets.SetText(self.parts.detailBody,
			"Chọn một mục trong danh sách để xem chi tiết.\n\n"
			.. "Lưu ý: danh sách này là DANH MỤC. Có tên ở đây không có nghĩa là hệ thống định vị được mục đó.")
		Ui_Widgets.SetText(self.parts.detailSelectButton, "Chọn")
		Ui_Widgets.SetText(self.parts.detailTrackButton, "Theo dõi")
		return
	end

	local entry = Shared_Catalog.Get(entityId)
	local record = view.records and view.records[entityId] or nil
	if entry == nil then
		Ui_Widgets.SetText(self.parts.detailTitle, "Mục không tồn tại")
		Ui_Widgets.SetText(self.parts.detailBody, "Id: " .. tostring(entityId))
		return
	end

	Ui_Widgets.SetText(self.parts.detailTitle, entry.name)

	local areaNames = {}
	for _, areaId in ipairs(entry.areas) do
		areaNames[#areaNames + 1] = Shared_Areas.GetName(areaId)
	end

	local lines = {}
	lines[#lines + 1] = ("Loại: %s (chưa xác minh bằng instance)"):format(Shared_Catalog.KindLabel[entry.kind] or entry.kind)
	lines[#lines + 1] = "Khu vực: " .. table.concat(areaNames, ", ")

	local isSelected = view.selectionIds ~= nil and view.selectionIds[entityId] == true
	local isTracked = view.trackedIds ~= nil and view.trackedIds[entityId] == true
	lines[#lines + 1] = ("Đã chọn: %s   ·   Đang theo dõi: %s")
		:format(tostring(isSelected), tostring(isTracked))

	local code = record and record.code or Shared_Status.Code.Disabled
	lines[#lines + 1] = ""
	lines[#lines + 1] = "TRẠNG THÁI: " .. Shared_Status.GetLabel(code)
	if record ~= nil then
		lines[#lines + 1] = "Lý do: " .. tostring(record.reason)
		if record.stale then
			lines[#lines + 1] = "DỮ LIỆU CŨ: đây không phải dữ liệu trực tiếp."
		end
	end

	local observation = record and record.observation or nil
	if observation ~= nil and Shared_Status.MayShowPosition(code) then
		lines[#lines + 1] = ""
		lines[#lines + 1] = "Nguồn dữ liệu: " .. tostring(observation.source)
		lines[#lines + 1] = "Instance: " .. tostring(observation.instanceName)
		local formatted = Shared_Geometry.FormatDistance(observation.distance)
		lines[#lines + 1] = "Khoảng cách: " .. (formatted or "không tính được (thiếu vị trí người chơi)")
		lines[#lines + 1] = "Hướng: " .. tostring(observation.direction or "không tính được (thiếu hướng camera)")
		if observation.matchCount ~= nil and observation.matchCount > 1 then
			lines[#lines + 1] = ("Số instance khớp: %d (hiển thị cái gần nhất)"):format(observation.matchCount)
		end
		if Shared_Geometry.IsPositionVector(observation.position) then
			lines[#lines + 1] = ("Toạ độ: %.1f, %.1f, %.1f")
				:format(observation.position.X, observation.position.Y, observation.position.Z)
		end
	else
		lines[#lines + 1] = ""
		lines[#lines + 1] = "Không có vị trí để hiển thị — hệ thống không suy đoán toạ độ."
	end

	local matchKeys = Shared_Catalog.GetMatchKeys(entry)
	lines[#lines + 1] = ""
	if #matchKeys > 0 then
		lines[#lines + 1] = "Mẫu tên đang dò: " .. table.concat(matchKeys, ", ")
	else
		lines[#lines + 1] = "Mẫu tên đang dò: (không có)"
	end
	lines[#lines + 1] = "Đã xác minh mẫu: " .. tostring(view.confirmedIds ~= nil and view.confirmedIds[entityId] == true)

	local aliasName = Shared_Catalog.GetAliasName(entry)
	if aliasName ~= nil then
		lines[#lines + 1] = ("Biến thể của: %s (chú thích, không dùng để khớp)")
			:format(aliasName)
	end

	-- Nút theo dõi chỉ có nghĩa khi mục này CÓ cơ chế phát hiện hợp lệ.
	local trackable = entry.detect ~= nil and entry.detect.method == "scan"
	if trackable then
		lines[#lines + 1] = isTracked
			and "Theo dõi: BẬT — sẽ ghi nhật ký khi mục này xuất hiện/biến mất."
			or "Theo dõi: TẮT — bấm nút \"Theo dõi\" để ghi nhật ký khi mục này xuất hiện."
	else
		lines[#lines + 1] = "Theo dõi: không áp dụng (mục này không có cơ chế phát hiện từ client)."
	end

	if entry.notes ~= "" then
		lines[#lines + 1] = ""
		lines[#lines + 1] = "Ghi chú: " .. entry.notes
	end

	Ui_Widgets.SetText(self.parts.detailBody, table.concat(lines, "\n"))
	Ui_Widgets.SetText(self.parts.detailSelectButton, isSelected and "Bỏ chọn" or "Chọn")
	Ui_Widgets.SetText(self.parts.detailTrackButton, isTracked and "Ngừng theo dõi" or "Theo dõi")
	Ui_Widgets.SetColor(self.parts.detailTrackButton, "BackgroundColor3",
		trackable and (isTracked and Ui_Theme.Color.accentDark or Ui_Theme.Color.rowBackground)
			or Ui_Theme.Color.rowBackground)
end

function RadarUi:_syncStatusBar(view)
	if self.parts.statusLabel == nil then
		return
	end
	local counts = view.counts or {}
	local detected = counts[Shared_Status.Code.Detected] or 0
	local noPosition = counts[Shared_Status.Code.NoPosition] or 0
	local notFound = counts[Shared_Status.Code.NotFound] or 0
	local unverified = counts[Shared_Status.Code.Unverified] or 0
	local unsupported = counts[Shared_Status.Code.Unsupported] or 0

	-- Đồng hồ nằm ở nhãn riêng để không ghi đè bộ đếm.
	Ui_Widgets.SetText(self.parts.clockLabel, "Cập nhật: " .. tostring(view.lastUpdateText or "chưa có"))

	local showCounters = (self.config.Ui and self.config.Ui.showCounters) ~= false
	local pieces = {}
	if showCounters then
		pieces[#pieces + 1] = ("Phát hiện %d"):format(detected)
		if noPosition > 0 then
			pieces[#pieces + 1] = ("thiếu vị trí %d"):format(noPosition)
		end
		pieces[#pieces + 1] = ("không thấy %d"):format(notFound)
		pieces[#pieces + 1] = ("chưa xác minh %d"):format(unverified)
		pieces[#pieces + 1] = ("không hỗ trợ %d"):format(unsupported)
	end
	pieces[#pieces + 1] = ("hiển thị %d/%d mục"):format(self.renderedRows, self.lastRowCount)
	if (view.selectedCount or 0) > 0 then
		pieces[#pieces + 1] = ("đã chọn %d"):format(view.selectedCount)
	end

	local text = table.concat(pieces, "  •  ")
	if view.warningText ~= nil and view.warningText ~= "" then
		text = text .. "  ⚠ " .. view.warningText
	end
	Ui_Widgets.SetText(self.parts.statusLabel, text)
	Ui_Widgets.SetColor(self.parts.statusLabel, "TextColor3",
		(view.warningText ~= nil and view.warningText ~= "") and Ui_Theme.Color.warning
			or Ui_Theme.Color.textSecondary)
end

function RadarUi:_buildStatusBar(panel, layout)
	if layout.statusHeight <= 0 then
		self.parts.statusBar = nil
		return
	end
	local metrics = Ui_Theme.Metrics
	local bar = Ui_Widgets.Frame(panel, {
		Name = "StatusBar",
		Position = UDim2.new(0, 0, 1, -layout.statusHeight),
		Size = UDim2.new(1, 0, 0, layout.statusHeight),
		BackgroundColor3 = Ui_Theme.Color.headerBackground,
	}, "ui:StatusBar")
	Ui_Widgets.Corner(bar)
	self.parts.statusBar = bar

	-- Hai nhãn RIÊNG: đồng hồ cập nhật và bộ đếm/cảnh báo.
	-- Nếu dùng chung một nhãn thì task đồng hồ sẽ ghi đè mất bộ đếm
	-- (lỗi này đã xảy ra và được test RAD-004/RAD-005 bắt lại).
	self.parts.clockLabel = Ui_Widgets.Label(bar, {
		Name = "ClockLabel",
		Position = UDim2.new(0, metrics.padding, 0, 0),
		Size = UDim2.new(0, 150, 1, 0),
		Text = "chưa có dữ liệu",
		TextSize = Ui_Theme.TextSize.small,
		TextColor3 = Ui_Theme.Color.textMuted,
		Font = Ui_Theme.Font.mono,
		TextTruncate = Enum.TextTruncate.AtEnd,
	}, "ui:ClockLabel")

	self.parts.statusLabel = Ui_Widgets.Label(bar, {
		Name = "StatusLabel",
		Position = UDim2.new(0, metrics.padding + 156, 0, 0),
		Size = UDim2.new(1, -metrics.padding * 2 - 156, 1, 0),
		Text = "chưa có dữ liệu",
		TextSize = Ui_Theme.TextSize.small,
		TextColor3 = Ui_Theme.Color.textSecondary,
		TextTruncate = Enum.TextTruncate.AtEnd,
	}, "ui:StatusLabel")
end

--[[
	ĐỔ DỮ LIỆU. view = {
	  rows, records, counts, selectedId, areaId, stateText, stateColor,
	  primaryLabel, lastUpdateText, warningText, confirmedIds,
	  tabId, selectionIds, trackedIds, selectionFilter, selectedCount,
	  scopeCount, trackedCount
	}
]]
function RadarUi:Sync(view)
	if not self.built or view == nil then
		return false
	end
	self.selectedId = view.selectedId

	-- Radar là nguồn sự thật về tab: nếu nó đổi (do SetArea/tìm kiếm) thì
	-- UI theo, nhưng KHÔNG dựng lại gì.
	if view.tabId ~= nil and view.tabId ~= self.activeTab then
		self:SetTab(view.tabId, true)
	end

	self.stats.syncs = self.stats.syncs + 1
	self:_syncHeader(view)
	self:_syncFilters(view)
	self:_syncList(view)
	self:_syncSelectionBar(view)
	self:_syncHome(view)
	self:_syncDetail(view)
	self:_syncSettings()
	self:_syncLog(false)
	self:_syncStatusBar(view)
	return true
end

-- Chỉ cập nhật đồng hồ "cập nhật lần cuối" (rẻ hơn Sync đầy đủ).
-- Ghi vào clockLabel, KHÔNG đụng statusLabel.
function RadarUi:SetClockText(text)
	if self.parts.clockLabel == nil then
		return false
	end
	return Ui_Widgets.SetText(self.parts.clockLabel, tostring(text))
end

function RadarUi:SetOpen(open)
	if self.gui == nil then
		return false
	end
	self.open = open == true
	return Ui_Widgets.Set(self.gui, "Enabled", self.open)
end

function RadarUi:IsOpen()
	return self.open
end

function RadarUi:IsBuilt()
	return self.built
end

function RadarUi:Stats()
	return {
		built = self.built,
		open = self.open,
		minimized = self.minimized,
		activeTab = self.activeTab,
		tabSwitches = self.stats.tabSwitches,
		drags = self.stats.drags,
		selectionClicks = self.stats.selectionClicks,
		syncs = self.stats.syncs,
		rowsUpdated = self.stats.rowsUpdated,
		renderedRows = self.renderedRows,
		rowPool = #self.rows,
		widgetWrites = Ui_Widgets.stats.writes,
		widgetSkipped = Ui_Widgets.stats.skipped,
		widgetsCreated = Ui_Widgets.stats.created,
	}
end

-- Dọn dẹp: huỷ ScreenGui (kéo theo toàn bộ con) và xoá tham chiếu.
-- Connection kéo thả do Registry giữ nên Shutdown của Radar sẽ ngắt.
function RadarUi:Destroy()
	if self.gui ~= nil then
		Client_Registry.Untrack(self.gui)
		Shared_Safe.Destroy(self.gui)
		self.gui = nil
	end
	self.parts = {}
	self.pages = {}
	self.rows = {}
	self.areaButtons = {}
	self.tabButtons = {}
	self.settingButtons = {}
	self.filterButtons = {}
	self.drag = nil
	self.built = false
	self.open = false
	self.minimized = false
	return true
end

return RadarUi
