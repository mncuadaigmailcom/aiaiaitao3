-- Generic exact-name observer for client-visible Workspace instances only.
-- Does not read game internals, remotes, hidden state, or off-client objects.
local Detector = {}
Detector.__index = Detector

local function normalize(value)
	return string.lower(tostring(value)):gsub("[^%w]", "")
end

local function positionOf(instance)
	if not instance or not instance.Parent then return nil end
	local ok, position = pcall(function()
		if instance:IsA("BasePart") then return instance.Position end
		if instance:IsA("Model") then return instance:GetPivot().Position end
		local part = instance:FindFirstChildWhichIsA("BasePart", true)
		return part and part.Position or nil
	end)
	if ok and typeof(position) == "Vector3" then return position end
	return nil
end

local function matchingPart(instance)
	if instance:IsA("BasePart") then return instance end
	if instance:IsA("Model") then
		return instance.PrimaryPart or instance:FindFirstChildWhichIsA("BasePart", true)
	end
	return instance:FindFirstChildWhichIsA("BasePart", true)
end

local function resolveRoot()
	local player = game:GetService("Players").LocalPlayer
	local character = player and player.Character
	if not character then return nil end
	return character:FindFirstChild("HumanoidRootPart") or character.PrimaryPart
end

function Detector.new(workspace, config, onChanged)
	return setmetatable({
		workspace = workspace,
		config = config,
		onChanged = onChanged,
		active = false,
		paused = false,
		selected = {},
		matchSets = {},
		connections = {},
		generation = 0,
		lastUpdate = nil,
		isScanning = false,
	}, Detector)
end

function Detector:_notify()
	self.lastUpdate = os.clock()
	if self.onChanged then
		local ok, err = pcall(self.onChanged)
		if not ok then warn("[DoorsEntityRadar] UI callback error: " .. tostring(err)) end
	end
end

function Detector:_isSelectedName(instanceName)
	local key = normalize(instanceName)
	for _, entry in ipairs(self.selected) do
		for _, alias in ipairs(entry.aliases or {entry.name}) do
			if key == normalize(alias) then return entry.name end
		end
		local configured = self.config.aliases and self.config.aliases[entry.name]
		if configured then
			for _, alias in ipairs(configured) do
				if key == normalize(alias) then return entry.name end
			end
		end
	end
	return nil
end

function Detector:_add(instance)
	if not self.active or self.paused then return end
	local name = self:_isSelectedName(instance.Name)
	if not name then return end
	local part = matchingPart(instance)
	local set = self.matchSets[name]
	if not set then return end
	local count = 0
	for _ in pairs(set) do count = count + 1 end
	if set[instance] or count >= self.config.maxTrackedMatchesPerName then return end
	set[instance] = part or false
	if not self.isScanning then self:_notify() end
end

function Detector:_remove(instance)
	local changed = false
	for _, set in pairs(self.matchSets) do
		if set[instance] then set[instance] = nil; changed = true end
	end
	if changed then self:_notify() end
end

function Detector:_disconnect()
	for _, connection in ipairs(self.connections) do connection:Disconnect() end
	table.clear(self.connections)
end

function Detector:_bind()
	self:_disconnect()
	table.insert(self.connections, self.workspace.DescendantAdded:Connect(function(instance)
		self:_add(instance)
	end))
	table.insert(self.connections, self.workspace.DescendantRemoving:Connect(function(instance)
		self:_remove(instance)
	end))
end

function Detector:SetSelection(entries)
	self.generation = self.generation + 1
	self.selected = entries or {}
	self.matchSets = {}
	for _, entry in ipairs(self.selected) do self.matchSets[entry.name] = {} end
	if self.active and not self.paused then self:Refresh() else self:_notify() end
end

function Detector:Start(entries)
	self.active = true
	self.paused = false
	self:_bind()
	self:SetSelection(entries or self.selected)
	return true
end

function Detector:Pause()
	if not self.active or self.paused then return end
	self.paused = true
	self.generation = self.generation + 1
	self.isScanning = false
	self:_disconnect()
	self:_notify()
end

function Detector:Resume()
	if not self.active or not self.paused then return end
	self.paused = false
	self:_bind()
	self:Refresh()
end

function Detector:Refresh()
	if not self.active or self.paused then return false, "radar is not running" end
	self.generation = self.generation + 1
	local generation = self.generation
	for _, entry in ipairs(self.selected) do self.matchSets[entry.name] = {} end
	self.isScanning = true
	self:_notify()
	local descendants = self.workspace:GetDescendants()
	local batchSize = math.max(1, self.config.scanBatchSize)
	task.spawn(function()
		for index, instance in ipairs(descendants) do
			if generation ~= self.generation or not self.active or self.paused then return end
			self:_add(instance)
			if index % batchSize == 0 then task.wait() end
		end
		if generation == self.generation then
			self.isScanning = false
			self:_notify()
		end
	end)
	return true
end

function Detector:GetState(entry)
	local set = self.matchSets[entry.name]
	local matches = {}
	if set then
		for instance, part in pairs(set) do
			if instance.Parent then
				local position = positionOf(instance) or (part and part.Parent and positionOf(part))
				table.insert(matches, { instance = instance, position = position })
			else
				set[instance] = nil
			end
		end
	end
	if not self.active then return { status = "unverified", matches = matches, reason = "Radar chưa khởi động." } end
	if self.paused then return { status = "unverified", matches = matches, reason = "Radar đang tạm dừng; dữ liệu có thể cũ." } end
	if #matches == 0 then
		if self.isScanning then return { status = "unverified", matches = matches, reason = "Đang quét Workspace phía client." } end
		return { status = "notDetected", matches = matches, reason = "Không thấy Instance khớp tên trong Workspace đã quét. Có thể tên nội bộ khác hoặc vật thể chưa được tải." }
	end
	local hasPosition = false
	for _, match in ipairs(matches) do if match.position then hasPosition = true; break end end
	if not hasPosition then
		return { status = "unsupported", matches = matches, reason = "Đã khớp tên Instance nhưng không đọc được Vector3 vị trí hợp lệ." }
	end
	local root = resolveRoot()
	if not root then return { status = "unsupported", matches = matches, reason = "Không lấy được HumanoidRootPart để tính khoảng cách." } end
	local nearest, nearestDistance
	for _, match in ipairs(matches) do
		local distance = (match.position - root.Position).Magnitude
		if not nearestDistance or distance < nearestDistance then nearest, nearestDistance = match, distance end
	end
	local camera = self.workspace.CurrentCamera
	if not camera then return { status = "unsupported", matches = matches, nearest = nearest, distance = nearestDistance, reason = "CurrentCamera chưa sẵn sàng để tính hướng." } end
	local localDirection = camera.CFrame:VectorToObjectSpace(nearest.position - camera.CFrame.Position)
	local angle = math.deg(math.atan2(localDirection.X, -localDirection.Z))
	local directions = {"Trước", "Trước-phải", "Phải", "Sau-phải", "Sau", "Sau-trái", "Trái", "Trước-trái"}
	local sector = (math.floor((angle + 22.5) / 45) % 8) + 1
	return { status = "detected", matches = matches, nearest = nearest, distance = nearestDistance, direction = directions[sector] }
end

function Detector:Stop()
	self.active = false
	self.paused = false
	self.isScanning = false
	self.generation = self.generation + 1
	self:_disconnect()
	self.matchSets = {}
	self:_notify()
end

return Detector
