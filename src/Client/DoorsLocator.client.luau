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
panel.Size = UDim2.fromOffset(230, 390)
panel.BackgroundColor3 = Color3.fromRGB(25, 28, 36)
panel.BorderSizePixel = 0
panel.Parent = gui
local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(0, 10)
corner.Parent = panel
local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, -20, 0, 42)
title.Position = UDim2.fromOffset(10, 4)
title.BackgroundTransparency = 1
title.Text = "DOORS · ENTITY LOCATOR"
title.TextColor3 = Color3.fromRGB(255, 205, 95)
title.Font = Enum.Font.GothamBold
title.TextSize = 15
title.Parent = panel
local list = Instance.new("ScrollingFrame")
list.Name = "Sections"
list.Position = UDim2.fromOffset(10, 50)
list.Size = UDim2.new(1, -20, 1, -100)
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
	button.BackgroundColor3 = color or Color3.fromRGB(49, 56, 70)
	button.BorderSizePixel = 0
	button.Text = text
	button.TextColor3 = Color3.new(1, 1, 1)
	button.Font = Enum.Font.GothamMedium
	button.TextSize = 13
	button.Parent = parent
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, 6)
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
local stopButton = makeButton("Stop locator", panel, Color3.fromRGB(130, 54, 54))
stopButton.Position = UDim2.new(0, 10, 1, -42)
stopButton.Size = UDim2.new(1, -20, 0, 32)
stopButton.Activated:Connect(function()
	if activeStop then activeStop(); activeStop = nil end
end)
script.Destroying:Connect(function()
	if activeStop then activeStop() end
end)
