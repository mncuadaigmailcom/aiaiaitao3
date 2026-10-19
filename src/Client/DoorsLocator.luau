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

local function buildNameSet(category, selectedNames)
	local names = selectedNames
	if names == nil then
		names = DoorsLocator.CATEGORIES[category]
		assert(names, "Unknown Doors locator category: " .. tostring(category))
	end
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
	local names = buildNameSet(category, options.entityNames)
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

return DoorsLocator
