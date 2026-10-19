-- Opt-in Doors entity picker for Roblox Studio / an experience you own.
local Players = game:GetService("Players")
local playerGui = Players.LocalPlayer:WaitForChild("PlayerGui")
local Locator = require(script.Parent:WaitForChild("DoorsLocator"))
local existing = playerGui:FindFirstChild("DoorsLocatorUI")
if existing then existing:ClearAllChildren(); existing.Parent = nil end

local gui = Instance.new("ScreenGui")
gui.Name = "DoorsLocatorUI"
gui.ResetOnSpawn = false
gui.Parent = playerGui
local panel = Instance.new("Frame")
panel.Name = "Panel"
panel.AnchorPoint = Vector2.new(0.5, 1)
panel.Position = UDim2.new(0.5, 0, 1, -18)
panel.Size = UDim2.fromOffset(520, 280)
panel.BackgroundColor3 = Color3.fromRGB(255, 248, 218)
panel.BorderSizePixel = 0
panel.Parent = gui
local function corner(obj, radius)
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, radius)
	c.Parent = obj
end
corner(panel, 18)
local function label(parent, text, pos, size, color, font, textSize, align)
	local obj = Instance.new("TextLabel")
	obj.BackgroundTransparency = 1
	obj.Text = text
	obj.Position = pos
	obj.Size = size
	obj.TextColor3 = color
	obj.Font = font
	obj.TextSize = textSize
	obj.TextXAlignment = align or Enum.TextXAlignment.Left
	obj.Parent = parent
	return obj
end
label(panel, "🍌 BANANA CAT  ·  ENTITY LOCATOR", UDim2.fromOffset(16, 7), UDim2.new(1, -32, 0, 30), Color3.fromRGB(104, 73, 28), Enum.Font.GothamBold, 19)
label(panel, "ฅ^•ﻌ•^ฅ   Chọn khu vực, tìm vật thể rồi bấm tên để bật/tắt định vị", UDim2.fromOffset(17, 36), UDim2.new(1, -34, 0, 20), Color3.fromRGB(156, 111, 43), Enum.Font.GothamMedium, 11)
local sectionFrame = Instance.new("Frame")
sectionFrame.BackgroundTransparency = 1
sectionFrame.Position = UDim2.fromOffset(14, 62)
sectionFrame.Size = UDim2.new(1, -28, 0, 52)
sectionFrame.Parent = panel
local sectionGrid = Instance.new("UIGridLayout")
sectionGrid.CellSize = UDim2.new(0.25, -6, 0, 23)
sectionGrid.CellPadding = UDim2.fromOffset(6, 4)
sectionGrid.SortOrder = Enum.SortOrder.LayoutOrder
sectionGrid.Parent = sectionFrame
local search = Instance.new("TextBox")
search.Name = "SearchEntity"
search.Position = UDim2.fromOffset(14, 119)
search.Size = UDim2.new(1, -28, 0, 26)
search.BackgroundColor3 = Color3.fromRGB(255, 255, 242)
search.BorderSizePixel = 0
search.PlaceholderText = "Tìm tên vật thể trong danh sách…"
search.Text = ""
search.TextColor3 = Color3.fromRGB(82, 59, 29)
search.PlaceholderColor3 = Color3.fromRGB(160, 142, 105)
search.Font = Enum.Font.Gotham
search.TextSize = 13
search.ClearTextOnFocus = false
search.Parent = panel
corner(search, 9)
local entityList = Instance.new("ScrollingFrame")
entityList.Name = "EntityPicker"
entityList.Position = UDim2.fromOffset(14, 152)
entityList.Size = UDim2.new(1, -28, 0, 72)
entityList.BackgroundColor3 = Color3.fromRGB(255, 252, 234)
entityList.BorderSizePixel = 0
entityList.ScrollBarThickness = 5
entityList.AutomaticCanvasSize = Enum.AutomaticSize.Y
entityList.CanvasSize = UDim2.new()
entityList.Parent = panel
corner(entityList, 10)
local entityGrid = Instance.new("UIGridLayout")
entityGrid.CellSize = UDim2.new(0.25, -6, 0, 28)
entityGrid.CellPadding = UDim2.fromOffset(6, 5)
entityGrid.SortOrder = Enum.SortOrder.LayoutOrder
entityGrid.Parent = entityList
local sectionNames = {"The Hotel", "The Mines", "The Backdoor", "The Archives", "The Outdoors", "The Stairwell", "The Rooms", "Special & Events"}
local currentSection = sectionNames[1]
local selectedBySection = {}
for _, section in ipairs(sectionNames) do selectedBySection[section] = {} end
local activeStop
local sectionButtons = {}
local status = label(panel, "Chưa bật định vị vật thể", UDim2.fromOffset(130, 242), UDim2.new(1, -260, 0, 30), Color3.fromRGB(125, 92, 43), Enum.Font.GothamMedium, 12, Enum.TextXAlignment.Center)
local function button(parent, text, color, textColor)
	local b = Instance.new("TextButton")
	b.Size = UDim2.new(1, 0, 1, 0)
	b.BackgroundColor3 = color
	b.BorderSizePixel = 0
	b.Text = text
	b.TextColor3 = textColor or Color3.fromRGB(82, 59, 29)
	b.Font = Enum.Font.GothamSemibold
	b.TextSize = 12
	b.AutoButtonColor = true
	b.Parent = parent
	corner(b, 9)
	return b
end
local function restartLocator()
	if activeStop then activeStop(); activeStop = nil end
	local names = {}
	for name, enabled in pairs(selectedBySection[currentSection]) do
		if enabled then table.insert(names, name) end
	end
	if #names > 0 then
		activeStop = Locator.Start(workspace, currentSection, { entityNames = names })
		status.Text = string.format("Đang định vị %d tên vật thể trong %s", #names, currentSection)
	else
		status.Text = "Chưa chọn vật thể — hãy bấm tên trong danh sách"
	end
end
local function refreshEntities()
	for _, child in ipairs(entityList:GetChildren()) do
		if child ~= entityGrid then child.Parent = nil end
	end
	local query = string.lower(search.Text or "")
	local names = Locator.CATEGORIES[currentSection]
	local shown = 0
	for _, name in ipairs(names) do
		if query == "" or string.find(string.lower(name), query, 1, true) then
			shown = shown + 1
			local isSelected = selectedBySection[currentSection][name] == true
			local b = button(entityList, (isSelected and "✓  " or "+  ") .. name,
				isSelected and Color3.fromRGB(176, 224, 151) or Color3.fromRGB(255, 232, 167))
			b.LayoutOrder = shown
			b.Activated:Connect(function()
				selectedBySection[currentSection][name] = not selectedBySection[currentSection][name]
				refreshEntities()
				restartLocator()
			end)
		end
	end
	if shown == 0 then status.Text = "Không có tên khớp trong danh mục khu vực này" end
end
for index, section in ipairs(sectionNames) do
	local b = button(sectionFrame, section, Color3.fromRGB(255, 224, 125))
	b.LayoutOrder = index
	sectionButtons[section] = b
	b.Activated:Connect(function()
		currentSection = section
		for name, other in pairs(sectionButtons) do
			other.BackgroundColor3 = name == section and Color3.fromRGB(255, 204, 91) or Color3.fromRGB(255, 224, 125)
		end
		refreshEntities()
		restartLocator()
	end)
end
search:GetPropertyChangedSignal("Text"):Connect(refreshEntities)
local stopButton = button(panel, "Tắt định vị", Color3.fromRGB(255, 190, 176))
stopButton.Position = UDim2.new(0, 12, 1, -38)
stopButton.Size = UDim2.fromOffset(108, 28)
stopButton.Activated:Connect(function()
	for _, selected in pairs(selectedBySection) do table.clear(selected) end
	if activeStop then activeStop(); activeStop = nil end
	refreshEntities()
	status.Text = "Đã tắt định vị và bỏ chọn vật thể"
end)
local hideButton = button(panel, "Ẩn menu", Color3.fromRGB(255, 232, 167))
hideButton.Position = UDim2.new(1, -120, 1, -38)
hideButton.Size = UDim2.fromOffset(108, 28)
local reopen = button(gui, "🍌 Mở menu", Color3.fromRGB(255, 224, 125))
reopen.AnchorPoint = Vector2.new(0.5, 1)
reopen.Position = UDim2.new(0.5, 0, 1, -18)
reopen.Size = UDim2.fromOffset(125, 34)
reopen.Visible = false
hideButton.Activated:Connect(function() panel.Visible = false; reopen.Visible = true end)
reopen.Activated:Connect(function() panel.Visible = true; reopen.Visible = false end)
refreshEntities()
script.Destroying:Connect(function()
	if activeStop then activeStop() end
end)
