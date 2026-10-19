-- Giao diện dùng Roblox UI API chuẩn, chỉ đọc dữ liệu từ Detector.
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local Controller = {}
Controller.__index = Controller

local COLORS = {
	bg = Color3.fromRGB(18, 23, 32), panel = Color3.fromRGB(27, 34, 46), raised = Color3.fromRGB(38, 47, 62),
	line = Color3.fromRGB(59, 70, 88), text = Color3.fromRGB(239, 243, 249), muted = Color3.fromRGB(159, 173, 191),
	accent = Color3.fromRGB(91, 190, 255), green = Color3.fromRGB(97, 206, 142), yellow = Color3.fromRGB(247, 194, 87),
	red = Color3.fromRGB(246, 116, 116),
}
local STATUS_LABELS = {
	detected = "ĐÃ PHÁT HIỆN", notDetected = "KHÔNG PHÁT HIỆN", unsupported = "KHÔNG HỖ TRỢ", unverified = "CHƯA XÁC MINH",
}

local function create(className, props, parent)
	local obj = Instance.new(className)
	for key, value in pairs(props or {}) do obj[key] = value end
	obj.Parent = parent
	return obj
end
local function round(obj, radius)
	create("UICorner", {CornerRadius = UDim.new(0, radius or 8)}, obj)
end
local function stroke(obj, color)
	create("UIStroke", {Color = color or COLORS.line, Thickness = 1, Transparency = 0.15}, obj)
end
local function styleButton(button, selected)
	button.BackgroundColor3 = selected and COLORS.accent or COLORS.raised
	button.TextColor3 = selected and COLORS.bg or COLORS.text
end

function Controller.new(playerGui, catalog, detector)
	local self = setmetatable({
		playerGui = playerGui, catalog = catalog, detector = detector,
		section = catalog.Sections[1], selected = {}, selectedEntry = nil,
		connections = {}, closed = false, lastPaint = 0,
	}, Controller)
	self:_selectSection(self.section)
	self:_build()
	return self
end

function Controller:_button(parent, text, size, color)
	local button = create("TextButton", {
		Size = size, BackgroundColor3 = color or COLORS.raised, BorderSizePixel = 0,
		Text = text, TextColor3 = COLORS.text, Font = Enum.Font.GothamMedium, TextSize = 12,
		AutoButtonColor = true,
	}, parent)
	round(button, 8)
	return button
end

function Controller:_selectSection(section)
	self.section = section
	self.selected = {}
	self.selectedEntry = nil
	for _, entry in ipairs(section.entities) do
		self.selected[entry.name] = entry
		if not self.selectedEntry then self.selectedEntry = entry end
	end
end

function Controller:_build()
	local gui = create("ScreenGui", {
		Name = "DoorsEntityRadar", ResetOnSpawn = false, IgnoreGuiInset = false,
		DisplayOrder = 20, ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
	}, self.playerGui)
	self.gui = gui
	local panel = create("Frame", {
		Name = "MainPanel", AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.fromScale(0.5, 0.5),
		Size = UDim2.new(0.94, 0, 0.88, 0), BackgroundColor3 = COLORS.bg, BorderSizePixel = 0,
	}, gui)
	self.panel = panel
	round(panel, 14); stroke(panel)
	create("UISizeConstraint", {MinSize = Vector2.new(310, 360), MaxSize = Vector2.new(920, 680)}, panel)
	create("UIPadding", {PaddingTop = UDim.new(0, 12), PaddingBottom = UDim.new(0, 12), PaddingLeft = UDim.new(0, 14), PaddingRight = UDim.new(0, 14)}, panel)

	local header = create("Frame", {BackgroundTransparency = 1, Size = UDim2.new(1, 0, 0, 36)}, panel)
	local title = create("TextLabel", {
		BackgroundTransparency = 1, Size = UDim2.new(1, -48, 1, 0), Text = "DOORS ENTITY RADAR",
		TextColor3 = COLORS.text, TextXAlignment = Enum.TextXAlignment.Left, Font = Enum.Font.GothamBold, TextSize = 18,
	}, header)
	local close = self:_button(header, "×", UDim2.fromOffset(36, 32), COLORS.raised)
	close.AnchorPoint = Vector2.new(1, 0); close.Position = UDim2.new(1, 0, 0, 0)

	local toolbar = create("Frame", {BackgroundTransparency = 1, Position = UDim2.fromOffset(0, 42), Size = UDim2.new(1, 0, 0, 34)}, panel)
	local toolbarLayout = create("UIListLayout", {FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder}, toolbar)
	local start = self:_button(toolbar, "▶ Start", UDim2.new(0.16, -5, 1, 0), COLORS.green)
	local pause = self:_button(toolbar, "Ⅱ Pause", UDim2.new(0.16, -5, 1, 0))
	local resume = self:_button(toolbar, "↻ Resume", UDim2.new(0.16, -5, 1, 0))
	local refresh = self:_button(toolbar, "⟳ Refresh", UDim2.new(0.16, -5, 1, 0))
	local stop = self:_button(toolbar, "■ Stop", UDim2.new(0.16, -5, 1, 0), COLORS.red)
	local stateText = create("TextLabel", {BackgroundTransparency = 1, Size = UDim2.new(0.20, -5, 1, 0), Text = "Tắt", TextColor3 = COLORS.muted, Font = Enum.Font.Gotham, TextSize = 11, TextXAlignment = Enum.TextXAlignment.Right}, toolbar)

	local sections = create("ScrollingFrame", {
		Name = "Sections", Position = UDim2.fromOffset(0, 84), Size = UDim2.new(1, 0, 0, 38),
		BackgroundTransparency = 1, BorderSizePixel = 0, ScrollBarThickness = 3,
		ScrollingDirection = Enum.ScrollingDirection.X, CanvasSize = UDim2.new(0, 0, 0, 0),
	}, panel)
	local sectionLayout = create("UIListLayout", {FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder}, sections)
	local function sizeSections()
		sections.CanvasSize = UDim2.fromOffset(sectionLayout.AbsoluteContentSize.X + 4, 0)
	end
	sectionLayout:GetPropertyChangedSignal("AbsoluteContentSize"):Connect(sizeSections)
	self.sectionButtons = {}
	for index, section in ipairs(self.catalog.Sections) do
		local button = self:_button(sections, section.name, UDim2.fromOffset(142, 32))
		button.LayoutOrder = index
		self.sectionButtons[section.name] = button
		button.Activated:Connect(function()
			self:_selectSection(section)
			self.search.Text = ""
			self:_renderSections(); self:_renderEntities(); self:_renderDetail()
			if self.detector.active then self.detector:SetSelection(self:_selectedEntries()) end
		end)
	end

	local search = create("TextBox", {
		Name = "Search", Position = UDim2.fromOffset(0, 130), Size = UDim2.new(1, 0, 0, 32),
		BackgroundColor3 = COLORS.panel, BorderSizePixel = 0, ClearTextOnFocus = false,
		PlaceholderText = "Tìm thực thể trong khu vực đang chọn…", PlaceholderColor3 = COLORS.muted,
		Text = "", TextColor3 = COLORS.text, Font = Enum.Font.Gotham, TextSize = 13,
		TextXAlignment = Enum.TextXAlignment.Left,
	}, panel)
	round(search, 8); create("UIPadding", {PaddingLeft = UDim.new(0, 10), PaddingRight = UDim.new(0, 10)}, search)
	self.search = search

	local list = create("ScrollingFrame", {
		Name = "EntityList", Position = UDim2.fromOffset(0, 170), Size = UDim2.new(0.46, -5, 1, -238),
		BackgroundColor3 = COLORS.panel, BorderSizePixel = 0, ScrollBarThickness = 5,
		CanvasSize = UDim2.new(), AutomaticCanvasSize = Enum.AutomaticSize.Y,
	}, panel)
	round(list, 8); create("UIPadding", {PaddingTop = UDim.new(0, 6), PaddingLeft = UDim.new(0, 6), PaddingRight = UDim.new(0, 6)}, list)
	local entityLayout = create("UIListLayout", {Padding = UDim.new(0, 4), SortOrder = Enum.SortOrder.LayoutOrder}, list)
	self.entityList, self.entityLayout = list, entityLayout

	local detail = create("Frame", {
		Name = "Details", Position = UDim2.new(0.46, 5, 0, 170), Size = UDim2.new(0.54, -5, 1, -238),
		BackgroundColor3 = COLORS.panel, BorderSizePixel = 0,
	}, panel)
	round(detail, 8); create("UIPadding", {PaddingTop = UDim.new(0, 10), PaddingLeft = UDim.new(0, 10), PaddingRight = UDim.new(0, 10), PaddingBottom = UDim.new(0, 8)}, detail)
	self.detail = create("TextLabel", {
		Name = "DetailText", BackgroundTransparency = 1, Size = UDim2.fromScale(1, 1),
		Text = "Chọn thực thể để xem trạng thái và chi tiết.", TextColor3 = COLORS.text,
		Font = Enum.Font.Gotham, TextSize = 13, TextWrapped = true, TextYAlignment = Enum.TextYAlignment.Top,
		TextXAlignment = Enum.TextXAlignment.Left,
	}, detail)

	local status = create("TextLabel", {
		Name = "Footer", Position = UDim2.new(0, 0, 1, -54), Size = UDim2.new(1, 0, 0, 20),
		BackgroundTransparency = 1, Text = "Chưa khởi động · tên trong danh mục chưa được xác minh với game",
		TextColor3 = COLORS.muted, Font = Enum.Font.Gotham, TextSize = 11, TextXAlignment = Enum.TextXAlignment.Left,
	}, panel)
	self.footer, self.stateText = status, stateText

	local reopen = self:_button(gui, "Radar", UDim2.fromOffset(82, 34), COLORS.accent)
	reopen.AnchorPoint = Vector2.new(1, 1); reopen.Position = UDim2.new(1, -12, 1, -12); reopen.Visible = false
	self.reopen = reopen

	close.Activated:Connect(function() panel.Visible = false; reopen.Visible = true end)
	reopen.Activated:Connect(function() panel.Visible = true; reopen.Visible = false end)
	start.Activated:Connect(function() self:_start() end)
	pause.Activated:Connect(function() self.detector:Pause(); self:_renderDetail(); self:_renderState() end)
	resume.Activated:Connect(function() self.detector:Resume(); self:_renderDetail(); self:_renderState() end)
	refresh.Activated:Connect(function() self.detector:Refresh() end)
	stop.Activated:Connect(function() self.detector:Stop(); self:_renderDetail(); self:_renderState() end)
	search:GetPropertyChangedSignal("Text"):Connect(function() self:_renderEntities() end)
	self:_renderSections(); self:_renderEntities(); self:_renderDetail(); self:_renderState()
	self.heartbeat = RunService.Heartbeat:Connect(function(dt)
		self.lastPaint = self.lastPaint + dt
		if self.lastPaint >= 0.35 then
			self.lastPaint = 0
			if self.detector.active then self:_renderDetail(); self:_renderState() end
		end
	end)
	-- Mặc định tự chọn toàn bộ tên của khu vực đầu tiên và bắt đầu quét.
	self:_start()
end

function Controller:_renderSections()
	for name, button in pairs(self.sectionButtons) do styleButton(button, name == self.section.name) end
end

function Controller:_renderEntities()
	for _, child in ipairs(self.entityList:GetChildren()) do
		if child ~= self.entityLayout then child.Parent = nil end
	end
	local query = string.lower(self.search.Text or "")
	local row = 0
	for _, entry in ipairs(self.section.entities) do
		if query == "" or string.find(string.lower(entry.name), query, 1, true) then
			row = row + 1
			local selected = self.selected[entry.name] == true
			local button = self:_button(self.entityList, (selected and "✓  " or "＋  ") .. entry.name, UDim2.new(1, -2, 0, 30), selected and Color3.fromRGB(42, 91, 89) or COLORS.raised)
			button.LayoutOrder = row
			button.Activated:Connect(function()
				if self.selected[entry.name] then self.selected[entry.name] = nil else self.selected[entry.name] = entry end
				self.selectedEntry = entry
				self:_renderEntities()
				if self.detector.active then self.detector:SetSelection(self:_selectedEntries()) end
				self:_renderDetail()
			end)
		end
	end
	if row == 0 then
		create("TextLabel", {Size = UDim2.new(1, -2, 0, 32), BackgroundTransparency = 1, Text = "Không có kết quả", TextColor3 = COLORS.muted, Font = Enum.Font.Gotham, TextSize = 12}, self.entityList)
	end
end

function Controller:_selectedEntries()
	local result = {}
	for _, entry in pairs(self.selected) do table.insert(result, entry) end
	return result
end

function Controller:_start()
	local selected = self:_selectedEntries()
	if #selected == 0 then
		self.footer.Text = "Chọn ít nhất một thực thể trước khi khởi động."
		return
	end
	self.detector:Start(selected)
	self:_renderDetail(); self:_renderState()
end

function Controller:_renderState()
	local detector = self.detector
	if not detector.active then self.stateText.Text = "Tắt"; self.footer.Text = "Đã dừng · " .. os.date("%H:%M:%S"); return end
	if detector.paused then self.stateText.Text = "Tạm dừng"; self.footer.Text = "Tạm dừng · " .. os.date("%H:%M:%S"); return end
	self.stateText.Text = detector.isScanning and "Đang quét" or "Đang chạy"
	self.footer.Text = (detector.isScanning and "Đang quét Workspace phía client" or "Cập nhật " .. os.date("%H:%M:%S")) .. " · chỉ tên Instance khớp chính xác"
end

function Controller:_renderDetail()
	local entry = self.selectedEntry
	if not entry then
		self.detail.Text = "Chọn tên trong danh sách.\n\nPhạm vi: Workspace đã replicate cho client.\nTên hiển thị trong catalog chưa xác minh là tên Instance thực tế của DOORS."
		return
	end
	local state = self.detector:GetState(entry)
	local label = STATUS_LABELS[state.status] or STATUS_LABELS.unverified
	local color = state.status == "detected" and COLORS.green or (state.status == "notDetected" and COLORS.yellow or (state.status == "unsupported" and COLORS.red or COLORS.muted))
	local parts = {
		entry.name,
		"Loại: " .. entry.kind,
		"Trạng thái: " .. label,
		"Chi tiết: " .. tostring(state.reason or ""),
		"Số instance khớp: " .. tostring(#state.matches),
	}
	if state.nearest and state.distance then
		table.insert(parts, string.format("Gần nhất: %.1f studs · %s", state.distance, state.direction or "hướng chưa có"))
		table.insert(parts, string.format("Tọa độ: %.1f, %.1f, %.1f", state.nearest.position.X, state.nearest.position.Y, state.nearest.position.Z))
	end
	if not entry.verified then table.insert(parts, "Xác minh DOORS: CHƯA XÁC MINH") end
	self.detail.Text = table.concat(parts, "\n")
	self.detail.TextColor3 = color
end

function Controller:Destroy()
	if self.heartbeat then self.heartbeat:Disconnect(); self.heartbeat = nil end
	self.detector:Stop()
	if self.gui then self.gui:Destroy(); self.gui = nil end
end

return Controller
