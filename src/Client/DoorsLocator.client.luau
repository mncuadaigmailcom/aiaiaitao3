-- Opt-in section picker for the Doors Locator. For use in your own Roblox place.
local Players = game:GetService("Players")
local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local Locator = require(script.Parent:WaitForChild("DoorsLocator"))

local existing = playerGui:FindFirstChild("DoorsLocatorUI")
if existing then existing:ClearAllChildren(); existing.Parent = nil end
local gui = Instance.new("ScreenGui")
gui.Name = "DoorsLocatorUI"
gui.ResetOnSpawn = false
gui.Parent = playerGui

local panel = Instance.new("Frame")
panel.Name = "Panel"
panel.AnchorPoint = Vector2.new(1, 0.5)
panel.Position = UDim2.new(1, -20, 0.5, 0)
panel.Size = UDim2.fromOffset(270, 430)
panel.BackgroundColor3 = Color3.fromRGB(255, 248, 218)
panel.BorderSizePixel = 0
panel.Parent = gui
local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 18)
corner.Parent = panel
local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, -24, 0, 38)
title.Position = UDim2.fromOffset(12, 6)
title.BackgroundTransparency = 1
title.Text = "🍌 BANANA CAT 🍌"
title.TextColor3 = Color3.fromRGB(104, 73, 28)
title.Font = Enum.Font.GothamBold
title.TextSize = 20
title.Parent = panel
local subtitle = Instance.new("TextLabel")
subtitle.Size = UDim2.new(1, -24, 0, 22)
subtitle.Position = UDim2.fromOffset(12, 42)
subtitle.BackgroundTransparency = 1
subtitle.Text = "ฅ^•ﻌ•^ฅ   DOORS ENTITY LOCATOR · 2026"
subtitle.TextColor3 = Color3.fromRGB(156, 111, 43)
subtitle.Font = Enum.Font.GothamMedium
subtitle.TextSize = 11
subtitle.Parent = panel
local list = Instance.new("ScrollingFrame")
list.Name = "Sections"
list.Position = UDim2.fromOffset(12, 70)
list.Size = UDim2.new(1, -24, 1, -124)
list.BackgroundTransparency = 1
list.BorderSizePixel = 0
list.ScrollBarThickness = 4
list.CanvasSize = UDim2.new()
list.AutomaticCanvasSize = Enum.AutomaticSize.Y
list.Parent = panel
local layout = Instance.new("UIListLayout")
layout.Padding = UDim.new(0, 6)
layout.SortOrder = Enum.SortOrder.LayoutOrder
layout.Parent = list
local activeStop
local function makeButton(text, parent, color)
	local button = Instance.new("TextButton")
	button.Size = UDim2.new(1, 0, 0, 34)
	button.BackgroundColor3 = color or Color3.fromRGB(255, 224, 125)
	button.BorderSizePixel = 0
	button.Text = text
	button.TextColor3 = Color3.fromRGB(82, 59, 29)
	button.Font = Enum.Font.GothamSemibold
	button.TextSize = 13
	button.Parent = parent
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, 10)
	c.Parent = button
	return button
end
local sectionNames = {"The Hotel", "The Mines", "The Backdoor", "The Archives", "The Outdoors", "The Stairwell", "The Rooms", "Special & Events"}
for index, section in ipairs(sectionNames) do
	local button = makeButton(section, list)
	button.LayoutOrder = index
	button.Activated:Connect(function()
		if activeStop then activeStop() end
		activeStop = Locator.Start(workspace, section)
	end)
end
local stopButton = makeButton("🍌  Tắt định vị", panel, Color3.fromRGB(255, 190, 176))
stopButton.Position = UDim2.new(0, 10, 1, -42)
stopButton.Size = UDim2.new(0.5, -14, 0, 32)
stopButton.Activated:Connect(function()
	if activeStop then activeStop(); activeStop = nil end
end)
local hideButton = makeButton("Ẩn menu  ☁", panel, Color3.fromRGB(255, 232, 167))
hideButton.Position = UDim2.new(0.5, 4, 1, -42)
hideButton.Size = UDim2.new(0.5, -14, 0, 32)
local reopenButton = makeButton("🍌 Mở menu", gui, Color3.fromRGB(255, 224, 125))
reopenButton.AnchorPoint = Vector2.new(1, 0.5)
reopenButton.Position = UDim2.new(1, -20, 0.5, 0)
reopenButton.Size = UDim2.fromOffset(110, 38)
reopenButton.Visible = false
hideButton.Activated:Connect(function()
	panel.Visible = false
	reopenButton.Visible = true
end)
reopenButton.Activated:Connect(function()
	panel.Visible = true
	reopenButton.Visible = false
end)
script.Destroying:Connect(function()
	if activeStop then activeStop() end
end)
