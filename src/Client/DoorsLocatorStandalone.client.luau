-- Standalone Studio LocalScript: menu + Doors entity locator in one file.
-- Doors entity locator for a Roblox experience you own, used in Roblox Studio.
-- This is an opt-in visual debugging aid, not an executor script. It only scans
-- descendants replicated to the client and does not reveal occluded/unloaded objects.
local DoorsLocator = {}

DoorsLocator.CATEGORIES = {
	["The Hotel"] = {"Rush", "Ambush", "Eyes", "Screech", "Figure", "Seek", "Dupe", "Halt", "Hide", "Timothy", "Sally (Window)", "Dread", "Jeff", "El Goblino", "Bob", "Jack", "Moonlight", "Weirdo", "Glitch", "Void", "Red Barrier", "Snare", "Fallen Chandeliers"},
	["The Mines"] = {"Rush", "Ambush", "Eyes", "Screech", "Figure", "Seek", "Dupe", "Halt", "Hide", "Timothy", "Dread", "Giggle", "Gloombats", "Grumble", "Queen Grumble", "Charles", "Dam Seek", "Jeff", "El Goblino", "Bob", "Louie", "Moonlight", "Jack", "Weirdo", "Glitch", "Void", "Red Barrier"},
	["The Backdoor"] = {"Blitz", "Haste", "Lookman", "Starlight", "Glitch", "Vacuum"},
	["The Archives"] = {"Drone", "Bash", "Scribbles", "Ransom", "Forget Me Nots", "Forget-Me-Not", "Teller", "Alma", "Honcho", "Fih", "Portrait", "Starlight", "Glitch", "Currents", "Office Chair"},
	["The Outdoors"] = {"Mandrake", "Surge", "Monument", "Eyestalk", "Bramble", "The Caw", "Grampy", "Groundskeeper", "Starlight", "Glitch", "World Lotus", "Snare", "Flood"},
	["The Stairwell"] = {"Creak", "Noise", "Stem", "Hijack", "Meld", "Cobbler", "Glitch", "Fire Sprinklers", "Crusher", "Office Chair", "Shopping Cart", "Television Set"},
	["The Rooms"] = {"A-60", "A-90", "A-120"},
	["Special & Events"] = {"Jeff The Killer", "Greed", "Evil Key", "DRAKOBLOXXERS", "SEEKING WALL!!!", "LAVA!", "Cringle", "Treater", "Rushing Light", "RNIUSHCg==", "AROxMBUSH", "SCJVEREECH"},
}

local function buildNameSet(category)
	local names = DoorsLocator.CATEGORIES[category]
	assert(names, "Unknown Doors locator category: " .. tostring(category))
	local set = {}
	for _, name in ipairs(names) do set[string.lower(name)] = true end
	return set
end

local function findAdornee(instance)
	if instance:IsA("Model") then
		return instance
	elseif instance:IsA("BasePart") then
		return instance
	end
	return instance:FindFirstChildWhichIsA("Model", true) or instance:FindFirstChildWhichIsA("BasePart", true)
end

-- Start scanning a supplied container (normally Workspace) for one section.
-- options: { color = Color3, maxDistance = number }. Returns a stop function.
function DoorsLocator.Start(container, category, options)
	assert(container and container.GetDescendants, "Pass a Roblox container such as workspace")
	options = options or {}
	local names = buildNameSet(category)
	local marked = setmetatable({}, { __mode = "k" })
	local alive = true
	local connections = {}
	local folder = Instance.new("Folder")
	folder.Name = "DoorsLocator_" .. category:gsub("[^%w]", "")
	folder.Parent = container

	local function inspect(instance)
		if not alive or marked[instance] or not names[string.lower(instance.Name)] then return end
		local target = findAdornee(instance)
		if not target then return end
		marked[instance] = true
		local highlight = Instance.new("Highlight")
		highlight.Name = "DoorsLocatorHighlight"
		highlight.Adornee = target
		highlight.DepthMode = Enum.HighlightDepthMode.Occluded
		highlight.FillColor = options.color or Color3.fromRGB(255, 190, 55)
		highlight.OutlineColor = Color3.fromRGB(255, 255, 255)
		highlight.FillTransparency = 0.55
		highlight.Parent = folder
		local anchor = target:IsA("Model") and (target.PrimaryPart or target:FindFirstChildWhichIsA("BasePart", true)) or target
		if anchor then
			local gui = Instance.new("BillboardGui")
			gui.Name = "DoorsLocatorLabel"
			gui.Adornee = anchor
			gui.Size = UDim2.fromOffset(180, 30)
			gui.StudsOffset = Vector3.new(0, 3, 0)
			gui.MaxDistance = options.maxDistance or 300
			gui.AlwaysOnTop = false
			gui.Parent = folder
			local label = Instance.new("TextLabel")
			label.BackgroundTransparency = 1
			label.Size = UDim2.fromScale(1, 1)
			label.Font = Enum.Font.GothamBold
			label.Text = instance.Name
			label.TextColor3 = Color3.new(1, 1, 1)
			label.TextStrokeTransparency = 0.25
			label.TextScaled = true
			label.Parent = gui
		end
	end

	for _, instance in ipairs(container:GetDescendants()) do inspect(instance) end
	table.insert(connections, container.DescendantAdded:Connect(inspect))
	local function stop()
		if not alive then return end
		alive = false
		for _, connection in ipairs(connections) do connection:Disconnect() end
		folder:ClearAllChildren()
		folder.Parent = nil
	end
	return stop
end


-- Opt-in section picker for the Doors Locator. For use in your own Roblox place.
local Players = game:GetService("Players")
local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

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
local stopButton = makeButton("Tắt định vị", panel, Color3.fromRGB(130, 54, 54))
stopButton.Position = UDim2.new(0, 10, 1, -42)
stopButton.Size = UDim2.new(0.5, -14, 0, 32)
stopButton.Activated:Connect(function()
	if activeStop then activeStop(); activeStop = nil end
end)
local hideButton = makeButton("Ẩn menu", panel, Color3.fromRGB(70, 82, 105))
hideButton.Position = UDim2.new(0.5, 4, 1, -42)
hideButton.Size = UDim2.new(0.5, -14, 0, 32)
local reopenButton = makeButton("Mở menu", gui, Color3.fromRGB(49, 56, 70))
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
