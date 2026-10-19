--[[
	Client/Debug/DoorsLocator.luau

	CÔNG CỤ QA cho trải nghiệm Roblox do bạn sở hữu, chỉ chạy trong Studio.
	Không phải ESP cho DOORS trực tuyến: module từ chối chạy ngoài Studio,
	không quét Workspace, không đọc object không có tag QA tường minh, và không
	gọi RemoteEvent/RemoteFunction. Nó chỉ tạo BillboardGui trong PlayerGui.

	Tag một Model/BasePart bằng "RALO_DoorsDevLocator", rồi đặt attributes:
	  RALO_LocatorSection = một id trong DoorsCatalog (hotel, mines, ...)
	  RALO_LocatorName    = tên có trong section đó
]]

local Catalog
if type(__RALO_REQUIRE) == "function" then
	Catalog = __RALO_REQUIRE("Shared/DoorsCatalog")
else
	-- Nhánh Rojo: ReplicatedStorage.RALO ánh xạ tới src/Shared.
	local replicatedStorage = game:GetService("ReplicatedStorage")
	local sharedRoot = replicatedStorage:WaitForChild("RALO")
	Catalog = require(sharedRoot:WaitForChild("DoorsCatalog"))
end

local Locator = {}

Locator.GUI_NAME = "RALO_DoorsDevLocator"
Locator.UPDATE_INTERVAL = 0.35
Locator.MAX_TRACKED = 256

local DARK = Color3.fromRGB(30, 32, 39)
local BUTTON_OFF = Color3.fromRGB(58, 61, 71)
local TEXT_MAIN = Color3.fromRGB(245, 246, 250)
local TEXT_MUTED = Color3.fromRGB(190, 194, 205)

local function freshState()
	local sectionEnabled = {}
	for _, section in ipairs(Catalog.SECTIONS) do
		sectionEnabled[section.id] = true
	end
	return {
		running = false,
		tracked = 0,
		elapsed = 0,
		gui = nil,
		panel = nil,
		statusLabel = nil,
		toggleButton = nil,
		player = nil,
		playerGui = nil,
		collectionService = nil,
		runService = nil,
		connections = {},
		entries = {},
		buttons = {},
		sectionEnabled = sectionEnabled,
	}
end

local state = freshState()

local function safeDestroy(instance)
	if instance == nil then
		return
	end
	pcall(function()
		instance:Destroy()
	end)
end

local function disconnectAll()
	for _, connection in ipairs(state.connections) do
		pcall(function()
			connection:Disconnect()
		end)
	end
	state.connections = {}
end

local function connect(signal, callback)
	if signal == nil then
		return false
	end
	local ok, connection = pcall(function()
		return signal:Connect(callback)
	end)
	if not ok or connection == nil then
		return false
	end
	table.insert(state.connections, connection)
	return true
end

local function isBasePart(instance)
	if instance == nil then
		return false
	end
	local ok, result = pcall(function()
		return instance:IsA("BasePart")
	end)
	if ok and result == true then
		return true
	end
	local okClass, className = pcall(function()
		return instance.ClassName
	end)
	if not okClass then
		return false
	end
	return className == "Part" or className == "MeshPart" or className == "UnionOperation"
		or className == "WedgePart" or className == "CornerWedgePart" or className == "TrussPart"
end

local function findAdornee(target)
	if isBasePart(target) then
		return target
	end
	local okModel, isModel = pcall(function()
		return target:IsA("Model")
	end)
	if not okModel or not isModel then
		return nil
	end
	local okPrimary, primaryPart = pcall(function()
		return target.PrimaryPart
	end)
	if okPrimary and isBasePart(primaryPart) then
		return primaryPart
	end
	local okDescendants, descendants = pcall(function()
		return target:GetDescendants()
	end)
	if not okDescendants or type(descendants) ~= "table" then
		return nil
	end
	for _, descendant in ipairs(descendants) do
		if isBasePart(descendant) then
			return descendant
		end
	end
	return nil
end

local function getPosition(part)
	local okPosition, position = pcall(function()
		return part.Position
	end)
	if okPosition and position ~= nil then
		return position
	end
	local okFrame, frame = pcall(function()
		return part.CFrame
	end)
	if okFrame and frame ~= nil then
		local okFramePosition, framePosition = pcall(function()
			return frame.Position
		end)
		if okFramePosition then
			return framePosition
		end
	end
	return nil
end

local function findCharacterRoot()
	if state.player == nil then
		return nil
	end
	local okCharacter, character = pcall(function()
		return state.player.Character
	end)
	if not okCharacter or character == nil then
		return nil
	end
	local okRoot, root = pcall(function()
		return character:FindFirstChild("HumanoidRootPart")
	end)
	if okRoot and isBasePart(root) then
		return root
	end
	local okDescendants, descendants = pcall(function()
		return character:GetDescendants()
	end)
	if okDescendants and type(descendants) == "table" then
		for _, descendant in ipairs(descendants) do
			local okName, name = pcall(function()
				return descendant.Name
			end)
			if okName and name == "HumanoidRootPart" and isBasePart(descendant) then
				return descendant
			end
		end
	end
	return nil
end

local function sectionCounts()
	local counts = {}
	for _, section in ipairs(Catalog.SECTIONS) do
		counts[section.id] = 0
	end
	for _, entry in pairs(state.entries) do
		counts[entry.sectionId] = (counts[entry.sectionId] or 0) + 1
	end
	return counts
end

local function updateButton(section, count)
	local button = state.buttons[section.id]
	if button == nil then
		return
	end
	local enabled = state.sectionEnabled[section.id] == true
	local prefix = enabled and "●  " or "○  "
	button.Text = prefix .. section.label .. "   ·   " .. tostring(count) .. " object"
	if enabled then
		button.BackgroundColor3 = Color3.fromRGB(section.color[1], section.color[2], section.color[3])
		button.TextColor3 = Color3.fromRGB(24, 27, 34)
	else
		button.BackgroundColor3 = BUTTON_OFF
		button.TextColor3 = TEXT_MUTED
	end
end

local function refreshUi()
	local counts = sectionCounts()
	for _, section in ipairs(Catalog.SECTIONS) do
		updateButton(section, counts[section.id] or 0)
	end
	if state.statusLabel ~= nil then
		state.statusLabel.Text = "Đang theo dõi " .. tostring(state.tracked)
			.. " object · chỉ tag QA trong Studio"
	end
end

local function setLabelDistance(entry, playerRoot)
	if entry.label == nil then
		return
	end
	local text = entry.section.label .. "  ·  " .. entry.entity.name
	if playerRoot ~= nil then
		local targetPosition = getPosition(entry.adornee)
		local playerPosition = getPosition(playerRoot)
		if targetPosition ~= nil and playerPosition ~= nil then
			local okDistance, distance = pcall(function()
				return (targetPosition - playerPosition).Magnitude
			end)
			if okDistance and type(distance) == "number" then
				text = text .. "  ·  " .. tostring(math.floor(distance + 0.5)) .. " studs"
			end
		end
	end
	if entry.label.Text ~= text then
		entry.label.Text = text
	end
end

local function updateDistances()
	local playerRoot = findCharacterRoot()
	for _, entry in pairs(state.entries) do
		setLabelDistance(entry, playerRoot)
	end
end

local function createMarker(target, entity, section, adornee)
	local marker = Instance.new("BillboardGui")
	local okBuild, entry = pcall(function()
		marker.Name = "RALO_DoorsLocatorMarker_" .. section.id .. "_" .. tostring(state.tracked + 1)
		marker.Adornee = adornee
		marker.AlwaysOnTop = true
		marker.LightInfluence = 0
		marker.MaxDistance = 800
		marker.Size = UDim2.fromOffset(250, 30)
		marker.StudsOffset = Vector3.new(0, 3.2, 0)
		marker.Enabled = state.sectionEnabled[section.id] == true
		marker.Parent = state.playerGui

		local label = Instance.new("TextLabel")
		label.Name = "Caption"
		label.BackgroundColor3 = DARK
		label.BackgroundTransparency = 0.12
		label.BorderSizePixel = 0
		label.Font = Enum.Font.GothamBold
		label.TextColor3 = Color3.fromRGB(section.color[1], section.color[2], section.color[3])
		label.TextSize = 13
		label.TextWrapped = false
		label.TextXAlignment = Enum.TextXAlignment.Center
		label.TextYAlignment = Enum.TextYAlignment.Center
		label.Size = UDim2.new(1, 0, 1, 0)
		label.Parent = marker

		return {
			instance = target,
			adornee = adornee,
			entity = entity,
			section = section,
			sectionId = section.id,
			marker = marker,
			label = label,
		}
	end)
	if not okBuild then
		safeDestroy(marker)
		error(entry)
	end
	setLabelDistance(entry, findCharacterRoot())
	return entry
end

local function unregister(target)
	local entry = state.entries[target]
	if entry == nil then
		return false
	end
	state.entries[target] = nil
	state.tracked = math.max(0, state.tracked - 1)
	safeDestroy(entry.marker)
	refreshUi()
	return true
end

local function register(target)
	if not state.running or target == nil or state.entries[target] ~= nil then
		return false
	end
	if state.tracked >= Locator.MAX_TRACKED then
		return false
	end

	local okSection, sectionId = pcall(function()
		return target:GetAttribute(Catalog.SECTION_ATTRIBUTE)
	end)
	local okName, objectName = pcall(function()
		return target:GetAttribute(Catalog.NAME_ATTRIBUTE)
	end)
	if not okSection or not okName then
		return false
	end
	local entity, section = Catalog.Resolve(sectionId, objectName)
	if entity == nil or section == nil then
		return false
	end
	local adornee = findAdornee(target)
	if adornee == nil then
		return false
	end

	local okMarker, entry = pcall(function()
		return createMarker(target, entity, section, adornee)
	end)
	if not okMarker or entry == nil then
		if type(entry) == "table" then
			safeDestroy(entry.marker)
		end
		return false
	end

	state.entries[target] = entry
	state.tracked += 1
	refreshUi()
	return true
end

local function addText(parent, name, position, size, text, textSize, textColor)
	local label = Instance.new("TextLabel")
	label.Name = name
	label.BackgroundTransparency = 1
	label.Font = Enum.Font.GothamBold
	label.Text = text
	label.TextColor3 = textColor or TEXT_MAIN
	label.TextSize = textSize
	label.TextXAlignment = Enum.TextXAlignment.Left
	label.TextYAlignment = Enum.TextYAlignment.Center
	label.TextWrapped = false
	label.Position = position
	label.Size = size
	label.Parent = parent
	return label
end

local function addButton(parent, name, position, size, text)
	local button = Instance.new("TextButton")
	button.Name = name
	button.BackgroundColor3 = BUTTON_OFF
	button.BorderSizePixel = 0
	button.AutoButtonColor = true
	button.Font = Enum.Font.GothamBold
	button.Text = text
	button.TextColor3 = TEXT_MAIN
	button.TextSize = 13
	button.TextXAlignment = Enum.TextXAlignment.Left
	button.TextYAlignment = Enum.TextYAlignment.Center
	button.TextWrapped = false
	button.Position = position
	button.Size = size
	button.Parent = parent
	return button
end

local function buildGui(playerGui)
	local existing = playerGui:FindFirstChild(Locator.GUI_NAME)
	if existing ~= nil then
		return nil, "tên GUI đã được dùng; không ghi đè GUI có sẵn"
	end

	local gui = Instance.new("ScreenGui")
	gui.Name = Locator.GUI_NAME
	gui.ResetOnSpawn = false
	gui.IgnoreGuiInset = true
	gui.DisplayOrder = 85
	gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
	gui.Enabled = true
	gui.Parent = playerGui
	state.gui = gui

	local panel = Instance.new("Frame")
	panel.Name = "Panel"
	panel.BackgroundColor3 = DARK
	panel.BackgroundTransparency = 0.08
	panel.BorderSizePixel = 0
	panel.Position = UDim2.new(0, 16, 0, 72)
	panel.Size = UDim2.fromOffset(310, 374)
	panel.Visible = true
	panel.Parent = gui
	state.panel = panel

	addText(panel, "Title", UDim2.new(0, 12, 0, 8), UDim2.new(1, -24, 0, 24),
		"DOORS · DEV LOCATOR", 16, TEXT_MAIN)
	state.statusLabel = addText(panel, "Status", UDim2.new(0, 12, 0, 35),
		UDim2.new(1, -24, 0, 22), "Đang khởi tạo…", 11, TEXT_MUTED)

	for index, section in ipairs(Catalog.SECTIONS) do
		local sectionId = section.id
		local y = 64 + (index - 1) * 36
		local button = addButton(panel, "Section_" .. sectionId,
			UDim2.new(0, 10, 0, y), UDim2.new(1, -20, 0, 31), section.label)
		state.buttons[sectionId] = button
		local event = button.Activated or button.MouseButton1Click
		if not connect(event, function()
			Locator.ToggleSection(sectionId)
		end) then
			error("không kết nối được nút section " .. sectionId)
		end
	end

	local toggle = addButton(gui, "MenuToggle", UDim2.new(0, 16, 1, -58),
		UDim2.fromOffset(118, 42), "ẨN MENU")
	toggle.TextXAlignment = Enum.TextXAlignment.Center
	state.toggleButton = toggle
	local toggleEvent = toggle.Activated or toggle.MouseButton1Click
	if not connect(toggleEvent, function()
		Locator.ToggleMenu()
	end) then
		error("không kết nối được nút menu")
	end

	refreshUi()
	return gui, nil
end

local function isStudio(runService)
	local ok, result = pcall(function()
		return runService:IsStudio()
	end)
	return ok and result == true
end

function Locator.Start()
	if state.running then
		return true, "đã chạy"
	end

	local runService = game:GetService("RunService")
	if not isStudio(runService) then
		return false, "chỉ chạy trong Roblox Studio, trong trải nghiệm do bạn sở hữu"
	end

	local players = game:GetService("Players")
	local player = players.LocalPlayer
	if player == nil then
		return false, "không tìm thấy LocalPlayer"
	end
	local playerGui = player:FindFirstChildOfClass("PlayerGui")
	if playerGui == nil then
		return false, "không tìm thấy PlayerGui"
	end

	local collectionService = game:GetService("CollectionService")
	state = freshState()
	state.runService = runService
	state.collectionService = collectionService
	state.player = player
	state.playerGui = playerGui

	local okGui, gui, guiError = pcall(buildGui, playerGui)
	if not okGui or gui == nil then
		disconnectAll()
		safeDestroy(state.gui)
		state = freshState()
		return false, okGui and guiError or tostring(gui)
	end

	state.running = true
	local okAdded, addedSignal = pcall(function()
		return collectionService:GetInstanceAddedSignal(Catalog.TAG)
	end)
	local okRemoved, removedSignal = pcall(function()
		return collectionService:GetInstanceRemovedSignal(Catalog.TAG)
	end)
	local okHeartbeat, heartbeat = pcall(function()
		return runService.Heartbeat
	end)

	if not okAdded or not connect(addedSignal, register)
		or not okRemoved or not connect(removedSignal, unregister)
		or not okHeartbeat or not connect(heartbeat, function(deltaTime)
			state.elapsed += deltaTime or 0
			if state.elapsed >= Locator.UPDATE_INTERVAL then
				state.elapsed = 0
				updateDistances()
			end
		end) then
		Locator.Stop()
		return false, "không kết nối đủ sự kiện CollectionService/Heartbeat"
	end

	local okTagged, tagged = pcall(function()
		return collectionService:GetTagged(Catalog.TAG)
	end)
	if not okTagged or type(tagged) ~= "table" then
		Locator.Stop()
		return false, "không thể đọc danh sách tag QA"
	end
	for _, target in ipairs(tagged) do
		register(target)
	end
	refreshUi()
	return true, "đã bật bộ định vị QA trong Studio"
end

function Locator.ToggleMenu()
	if not state.running or state.panel == nil then
		return false
	end
	state.panel.Visible = not state.panel.Visible
	if state.toggleButton ~= nil then
		state.toggleButton.Text = state.panel.Visible and "ẨN MENU" or "MỞ MENU"
	end
	return true
end

function Locator.SetSectionEnabled(sectionId, enabled)
	if not state.running or Catalog.GetSection(sectionId) == nil then
		return false
	end
	if enabled ~= true and enabled ~= false then
		return false
	end
	state.sectionEnabled[sectionId] = enabled
	for _, entry in pairs(state.entries) do
		if entry.sectionId == sectionId then
			entry.marker.Enabled = enabled
		end
	end
	local counts = sectionCounts()
	local section = Catalog.GetSection(sectionId)
	updateButton(section, counts[sectionId] or 0)
	return true
end

function Locator.ToggleSection(sectionId)
	if not state.running or Catalog.GetSection(sectionId) == nil then
		return false
	end
	return Locator.SetSectionEnabled(sectionId, state.sectionEnabled[sectionId] ~= true)
end

function Locator.Stop()
	state.running = false
	disconnectAll()
	for _, entry in pairs(state.entries) do
		safeDestroy(entry.marker)
	end
	state.entries = {}
	state.tracked = 0
	safeDestroy(state.gui)
	state = freshState()
	return true
end

function Locator.State()
	local counts = sectionCounts()
	local sections = {}
	for _, section in ipairs(Catalog.SECTIONS) do
		sections[section.id] = {
			tracked = counts[section.id] or 0,
			enabled = state.sectionEnabled[section.id] == true,
			catalogCount = #section.entities,
		}
	end
	local menuVisible = false
	if state.panel ~= nil then
		local okVisible, visible = pcall(function()
			return state.panel.Visible
		end)
		menuVisible = okVisible and visible == true
	end
	return {
		running = state.running,
		studioOnly = true,
		tag = Catalog.TAG,
		tracked = state.tracked,
		menuVisible = menuVisible,
		sections = sections,
	}
end

return Locator
