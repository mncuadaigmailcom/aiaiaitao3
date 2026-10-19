--!strict
-- ============================================================
-- DOORS ENTITY RADAR — ALL-IN-ONE FULL MENU
-- Vị trí: StarterPlayer/StarterPlayerScripts/DoorsRadarAllInOne.lua
-- Loại: LocalScript
-- Tự chứa: Config + EntityCatalog + RadarCore + UI đầy đủ
-- KHÔNG wallhack, KHÔNG exploit, KHÔNG đọc memory.
-- ============================================================

local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")
local UserInputService = game:GetService("UserInputService")

local LocalPlayer = Players.LocalPlayer
local PlayerGui = LocalPlayer:WaitForChild("PlayerGui")

-- ============================================================
-- CONFIG
-- ============================================================
local Config = {
    ScanInterval = 1.0,
    MaxRadarDistance = 2000,
    MaxScanObjects = 8000,
    UIRefreshDebounce = 0.15,
    Debug = true,
}

local function log(...)
    if Config.Debug then
        print("[DoorsRadar]", ...)
    end
end

-- ============================================================
-- ENTITY CATALOG
-- ============================================================
local EntityCatalog = { Areas = {} }

EntityCatalog.Areas["The Hotel"] = {
    Rush = { kind = "entity", note = "Server-side, không có model ổn định ở client." },
    Ambush = { kind = "entity", note = "Server-side." },
    Eyes = { kind = "entity", note = "Có thể xuất hiện dưới dạng part tạm." },
    Screech = { kind = "entity", note = "Chỉ hiện khi tối." },
    Figure = { kind = "entity", note = "Server-side." },
    Seek = { kind = "entity", note = "Server-side." },
    Dupe = { kind = "entity", note = "Cửa giả." },
    Halt = { kind = "entity", note = "Server-side." },
    Hide = { kind = "entity", note = "Cơ chế ẩn." },
    Timothy = { kind = "entity", note = "Model nhỏ trong ngăn kéo." },
    ["Sally (Window)"] = { kind = "entity", note = "Xuất hiện ở cửa sổ." },
    Dread = { kind = "entity", note = "Server-side." },
    Jeff = { kind = "prop", note = "Event entity." },
    ["El Goblino"] = { kind = "prop", note = "NPC thương nhân." },
    Bob = { kind = "prop", note = "NPC thương nhân." },
    Jack = { kind = "entity", note = "Xuất hiện ngẫu nhiên ở tủ." },
    Moonlight = { kind = "event", note = "Hiệu ứng ánh sáng." },
    Weirdo = { kind = "unverified", note = "Tên chưa xác minh." },
    Glitch = { kind = "unverified", note = "Hiệu ứng glitch." },
    Void = { kind = "event", note = "Hiệu ứng màn hình." },
    ["Red Barrier"] = { kind = "prop", note = "Vật cản." },
    Snare = { kind = "entity", note = "Bẫy." },
    ["Fallen Chandeliers"] = { kind = "prop", note = "Vật thể môi trường." },
}

EntityCatalog.Areas["The Mines"] = {
    Rush = { kind = "entity", note = "Server-side." },
    Ambush = { kind = "entity", note = "Server-side." },
    Eyes = { kind = "entity", note = "Part tạm." },
    Screech = { kind = "entity", note = "Không model cố định." },
    Figure = { kind = "entity", note = "Server-side." },
    Seek = { kind = "entity", note = "Server-side." },
    Dupe = { kind = "entity", note = "Cửa giả." },
    Halt = { kind = "entity", note = "Server-side." },
    Hide = { kind = "entity", note = "Cơ chế ẩn." },
    Timothy = { kind = "entity", note = "Model nhỏ." },
    Dread = { kind = "entity", note = "Server-side." },
    Giggle = { kind = "entity", note = "Server-side." },
    Gloombats = { kind = "entity", note = "Server-side." },
    Grumble = { kind = "entity", note = "Server-side." },
    ["Queen Grumble"] = { kind = "entity", note = "Server-side." },
    Charles = { kind = "prop", note = "NPC sự kiện." },
    ["Dam Seek"] = { kind = "entity", note = "Boss event." },
    Jeff = { kind = "prop", note = "Event." },
    ["El Goblino"] = { kind = "prop", note = "NPC." },
    Bob = { kind = "prop", note = "NPC." },
    Louie = { kind = "prop", note = "NPC." },
    Moonlight = { kind = "event", note = "Ánh sáng." },
    Jack = { kind = "entity", note = "Ngẫu nhiên." },
    Weirdo = { kind = "unverified", note = "Chưa xác minh." },
    Glitch = { kind = "unverified", note = "Glitch." },
    Void = { kind = "event", note = "Hiệu ứng." },
    ["Red Barrier"] = { kind = "prop", note = "Vật cản." },
}

EntityCatalog.Areas["The Backdoor"] = {
    Blitz = { kind = "entity", note = "Server-side." },
    Haste = { kind = "entity", note = "Server-side." },
    Lookman = { kind = "entity", note = "Server-side." },
    Starlight = { kind = "event", note = "Ánh sáng." },
    Glitch = { kind = "unverified", note = "Glitch." },
    Vacuum = { kind = "entity", note = "Server-side." },
}

EntityCatalog.Areas["The Archives"] = {
    Drone = { kind = "entity", note = "Server-side." },
    Bash = { kind = "entity", note = "Server-side." },
    Scribbles = { kind = "entity", note = "Server-side." },
    Ransom = { kind = "entity", note = "Server-side." },
    ["Forget Me Nots"] = { kind = "entity", note = "Có thể là 'Forget-Me-Not'." },
    Teller = { kind = "entity", note = "Server-side." },
    Alma = { kind = "entity", note = "Server-side." },
    Honcho = { kind = "entity", note = "Server-side." },
    Fih = { kind = "entity", note = "Server-side." },
    Portrait = { kind = "prop", note = "Tranh." },
    Starlight = { kind = "event", note = "Ánh sáng." },
    Glitch = { kind = "unverified", note = "Glitch." },
    Currents = { kind = "entity", note = "Server-side." },
    ["Office Chair"] = { kind = "prop", note = "Vật thể." },
}

EntityCatalog.Areas["The Outdoors"] = {
    Mandrake = { kind = "entity", note = "Server-side." },
    Surge = { kind = "entity", note = "Server-side." },
    Monument = { kind = "prop", note = "Tượng đài." },
    Eyestalk = { kind = "entity", note = "Server-side." },
    Bramble = { kind = "prop", note = "Cây gai." },
    ["The Caw"] = { kind = "entity", note = "Server-side." },
    Grampy = { kind = "prop", note = "NPC." },
    Groundskeeper = { kind = "prop", note = "NPC." },
    Starlight = { kind = "event", note = "Ánh sáng." },
    Glitch = { kind = "unverified", note = "Glitch." },
    ["World Lotus"] = { kind = "entity", note = "Server-side." },
    Snare = { kind = "entity", note = "Bẫy." },
    Flood = { kind = "event", note = "Nước dâng." },
}

EntityCatalog.Areas["The Stairwell"] = {
    Creak = { kind = "entity", note = "Server-side." },
    Noise = { kind = "entity", note = "Server-side." },
    Stem = { kind = "entity", note = "Server-side." },
    Hijack = { kind = "entity", note = "Server-side." },
    Meld = { kind = "entity", note = "Server-side." },
    Cobbler = { kind = "entity", note = "Server-side." },
    Glitch = { kind = "unverified", note = "Glitch." },
    ["Fire Sprinklers"] = { kind = "prop", note = "Vật thể." },
    Crusher = { kind = "prop", note = "Vật thể." },
    ["Office Chair"] = { kind = "prop", note = "Vật thể." },
    ["Shopping Cart"] = { kind = "prop", note = "Vật thể." },
    ["Television Set"] = { kind = "prop", note = "Vật thể." },
}

EntityCatalog.Areas["The Rooms"] = {
    ["A-60"] = { kind = "entity", note = "Server-side." },
    ["A-90"] = { kind = "entity", note = "Server-side." },
    ["A-120"] = { kind = "entity", note = "Server-side." },
}

EntityCatalog.Areas["Chế độ đặc biệt & Sự kiện"] = {
    ["Jeff The Killer"] = { kind = "prop", note = "Event." },
    Greed = { kind = "event", note = "Sự kiện." },
    ["Evil Key"] = { kind = "prop", note = "Vật phẩm." },
    DRAKOBLOXXERS = { kind = "unverified", note = "Chưa xác minh." },
    ["SEEKING WALL!!!"] = { kind = "event", note = "Sự kiện." },
    ["LAVA!"] = { kind = "event", note = "Sự kiện." },
    Cringle = { kind = "prop", note = "NPC." },
    Treater = { kind = "prop", note = "NPC." },
    ["Rushing Light"] = { kind = "event", note = "Sự kiện." },
    ["RNIUSHCg=="] = { kind = "unverified", note = "Base64, chưa xác minh." },
    AROxMBUSH = { kind = "unverified", note = "Chưa xác minh." },
    SCJVEREECH = { kind = "unverified", note = "Chưa xác minh." },
}

function EntityCatalog:GetAreaNames()
    local names = {}
    for n in pairs(self.Areas) do table.insert(names, n) end
    table.sort(names)
    return names
end

function EntityCatalog:GetArea(name)
    return self.Areas[name]
end

function EntityCatalog:Search(query)
    local results = {}
    local q = string.lower(query)
    for areaName, entities in pairs(self.Areas) do
        for entityName, entry in pairs(entities) do
            if string.find(string.lower(entityName), q, 1, true) then
                table.insert(results, { area = areaName, name = entityName, entry = entry })
            end
        end
    end
    return results
end

-- ============================================================
-- RADAR CORE
-- ============================================================
local RadarCore = {}
RadarCore.__index = RadarCore

RadarCore.Status = {
    DETECTED = "DETECTED",
    NOT_FOUND = "NOT_FOUND",
    UNSUPPORTED = "UNSUPPORTED",
    UNVERIFIED = "UNVERIFIED",
    EVENT = "EVENT",
    PROP = "PROP",
}

local function normalize(name)
    return string.lower((string.gsub(name, "%s+", "")))
end

local function getPosition(inst)
    if inst:IsA("BasePart") then
        return inst.Position
    elseif inst:IsA("Model") then
        if inst.PrimaryPart then return inst.PrimaryPart.Position end
        for _, d in ipairs(inst:GetDescendants()) do
            if d:IsA("BasePart") then return d.Position end
        end
    end
    return nil
end

function RadarCore.new()
    local self = setmetatable({}, RadarCore)
    self._running = false
    self._scanTask = nil
    self._tracked = {}
    self._lastResults = {}
    self._bindable = Instance.new("BindableEvent")
    return self
end

function RadarCore:Track(name) self._tracked[name] = true end
function RadarCore:Untrack(name) self._tracked[name] = nil end
function RadarCore:ClearTracked() self._tracked = {} end
function RadarCore:GetResultEvent() return self._bindable end

function RadarCore:_scanWorkspace()
    local found = {}
    local scanned = 0
    local function visit(inst)
        if scanned >= Config.MaxScanObjects then return end
        scanned += 1
        local key = normalize(inst.Name)
        if key ~= "" and not found[key] then found[key] = inst end
        for _, c in ipairs(inst:GetChildren()) do visit(c) end
    end
    for _, root in ipairs(Workspace:GetChildren()) do
        if not root:IsA("Camera") then visit(root) end
    end
    return found
end

local function computeRelative(position)
    local cam = Workspace.CurrentCamera
    if not cam then return -1, "N/A" end
    local camPos = cam.CFrame.Position
    local distance = (position - camPos).Magnitude
    local look = cam.CFrame.LookVector
    local toEntity = (position - camPos).Unit
    local dot = look:Dot(toEntity)
    local cross = look:Cross(toEntity)
    local yaw = math.deg(math.atan2(cross.Y, dot))
    local dir
    if dot > 0.7 then dir = "Trước"
    elseif dot < -0.7 then dir = "Sau"
    elseif yaw > 0 then dir = "Phải"
    else dir = "Trái" end
    return distance, dir
end

function RadarCore:_doScan()
    local found = self:_scanWorkspace()
    local results = {}
    for entityName in pairs(self._tracked) do
        local key = normalize(entityName)
        local inst = found[key]
        if inst then
            local pos = getPosition(inst)
            if pos then
                local distance, direction = computeRelative(pos)
                results[entityName] = {
                    status = RadarCore.Status.DETECTED,
                    distance = distance, direction = direction,
                    position = pos, note = "Vị trí đọc trực tiếp từ workspace.",
                }
            else
                results[entityName] = {
                    status = RadarCore.Status.UNSUPPORTED,
                    note = "Tìm thấy object nhưng không đọc được Position.",
                }
            end
        else
            results[entityName] = {
                status = RadarCore.Status.NOT_FOUND,
                note = "Không có object khớp tên trong workspace.",
            }
        end
    end
    self._lastResults = results
    self._bindable:Fire(results)
end

function RadarCore:Start()
    if self._running then return end
    self._running = true
    self._scanTask = task.spawn(function()
        while self._running do
            local ok, err = pcall(function() self:_doScan() end)
            if not ok then warn("[RadarCore]", err) end
            task.wait(Config.ScanInterval)
        end
    end)
end

function RadarCore:Stop()
    if not self._running then return end
    self._running = false
    if self._scanTask then task.cancel(self._scanTask); self._scanTask = nil end
end

function RadarCore:Destroy()
    self:Stop()
    self._tracked = {}
    self._lastResults = {}
    if self._bindable then self._bindable:Destroy() end
end

-- ============================================================
-- UI STATE
-- ============================================================
local state = {
    running = false,
    selectedArea = nil,
    selectedEntity = nil,
    searchQuery = "",
    uiVisible = true,
    lastResults = {},
    lastScanTime = 0,
}

-- ============================================================
-- UI BUILD
-- ============================================================
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "DoorsRadarGui"
screenGui.ResetOnSpawn = false
screenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
screenGui.Parent = PlayerGui

-- Nút toggle nổi (ẩn/hiện menu)
local toggleBtn = Instance.new("TextButton")
toggleBtn.Name = "Toggle"
toggleBtn.Size = UDim2.new(0, 50, 0, 50)
toggleBtn.Position = UDim2.new(0, 16, 0.5, -25)
toggleBtn.BackgroundColor3 = Color3.fromRGB(40, 40, 50)
toggleBtn.Text = "R"
toggleBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
toggleBtn.Font = Enum.Font.GothamBold
toggleBtn.TextSize = 20
toggleBtn.ZIndex = 10
toggleBtn.Parent = screenGui

local toggleCorner = Instance.new("UICorner")
toggleCorner.CornerRadius = UDim.new(0, 25)
toggleCorner.Parent = toggleBtn

-- Khung chính
local mainFrame = Instance.new("Frame")
mainFrame.Name = "Main"
mainFrame.Size = UDim2.new(0, 560, 0, 520)
mainFrame.Position = UDim2.new(0.5, -280, 0.5, -260)
mainFrame.BackgroundColor3 = Color3.fromRGB(20, 20, 26)
mainFrame.BorderSizePixel = 0
mainFrame.Active = true
mainFrame.Draggable = true
mainFrame.Parent = screenGui

local mainCorner = Instance.new("UICorner")
mainCorner.CornerRadius = UDim.new(0, 10)
mainCorner.Parent = mainFrame

-- Title bar
local titleBar = Instance.new("Frame")
titleBar.Size = UDim2.new(1, 0, 0, 40)
titleBar.BackgroundColor3 = Color3.fromRGB(35, 35, 45)
titleBar.BorderSizePixel = 0
titleBar.Parent = mainFrame

local titleCorner = Instance.new("UICorner")
titleCorner.CornerRadius = UDim.new(0, 10)
titleCorner.Parent = titleBar

local titleLabel = Instance.new("TextLabel")
titleLabel.Size = UDim2.new(1, -100, 1, 0)
titleLabel.Position = UDim2.new(0, 10, 0, 0)
titleLabel.BackgroundTransparency = 1
titleLabel.Text = "DOORS ENTITY RADAR"
titleLabel.TextColor3 = Color3.fromRGB(255, 255, 255)
titleLabel.Font = Enum.Font.GothamBold
titleLabel.TextSize = 15
titleLabel.TextXAlignment = Enum.TextXAlignment.Left
titleLabel.Parent = titleBar

-- Nút đóng menu (X)
local closeBtn = Instance.new("TextButton")
closeBtn.Size = UDim2.new(0, 30, 0, 30)
closeBtn.Position = UDim2.new(1, -35, 0, 5)
closeBtn.BackgroundColor3 = Color3.fromRGB(180, 50, 50)
closeBtn.Text = "X"
closeBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
closeBtn.Font = Enum.Font.GothamBold
closeBtn.TextSize = 14
closeBtn.Parent = titleBar

local closeCorner = Instance.new("UICorner")
closeCorner.CornerRadius = UDim.new(0, 6)
closeCorner.Parent = closeBtn

-- Ô tìm kiếm
local searchBox = Instance.new("TextBox")
searchBox.Size = UDim2.new(1, -20, 0, 32)
searchBox.Position = UDim2.new(0, 10, 0, 50)
searchBox.BackgroundColor3 = Color3.fromRGB(35, 35, 45)
searchBox.TextColor3 = Color3.fromRGB(255, 255, 255)
searchBox.PlaceholderText = "Tìm thực thể..."
searchBox.PlaceholderColor3 = Color3.fromRGB(150, 150, 160)
searchBox.Font = Enum.Font.Gotham
searchBox.TextSize = 13
searchBox.Text = ""
searchBox.ClearTextOnFocus = false
searchBox.Parent = mainFrame

local searchCorner = Instance.new("UICorner")
searchCorner.CornerRadius = UDim.new(0, 6)
searchCorner.Parent = searchBox

-- Danh sách khu vực (bên trái)
local areaPanel = Instance.new("ScrollingFrame")
areaPanel.Size = UDim2.new(0, 160, 0, 300)
areaPanel.Position = UDim2.new(0, 10, 0, 90)
areaPanel.BackgroundColor3 = Color3.fromRGB(30, 30, 40)
areaPanel.BorderSizePixel = 0
areaPanel.ScrollBarThickness = 4
areaPanel.CanvasSize = UDim2.new(0, 0, 0, 0)
areaPanel.Parent = mainFrame

local areaLayout = Instance.new("UIListLayout")
areaLayout.Padding = UDim.new(0, 4)
areaLayout.Parent = areaPanel

-- Danh sách thực thể (giữa)
local entityPanel = Instance.new("ScrollingFrame")
entityPanel.Size = UDim2.new(0, 180, 0, 300)
entityPanel.Position = UDim2.new(0, 180, 0, 90)
entityPanel.BackgroundColor3 = Color3.fromRGB(30, 30, 40)
entityPanel.BorderSizePixel = 0
entityPanel.ScrollBarThickness = 4
entityPanel.CanvasSize = UDim2.new(0, 0, 0, 0)
entityPanel.Parent = mainFrame

local entityLayout = Instance.new("UIListLayout")
entityLayout.Padding = UDim.new(0, 4)
entityLayout.Parent = entityPanel

-- Bảng thông tin (bên phải)
local infoPanel = Instance.new("Frame")
infoPanel.Size = UDim2.new(0, 180, 0, 300)
infoPanel.Position = UDim2.new(0, 370, 0, 90)
infoPanel.BackgroundColor3 = Color3.fromRGB(30, 30, 40)
infoPanel.BorderSizePixel = 0
infoPanel.Parent = mainFrame

local infoCorner = Instance.new("UICorner")
infoCorner.CornerRadius = UDim.new(0, 6)
infoCorner.Parent = infoPanel

local infoLabel = Instance.new("TextLabel")
infoLabel.Size = UDim2.new(1, -10, 1, -10)
infoLabel.Position = UDim2.new(0, 5, 0, 5)
infoLabel.BackgroundTransparency = 1
infoLabel.Text = "Chọn một thực thể\nđể xem thông tin."
infoLabel.TextColor3 = Color3.fromRGB(200, 200, 210)
infoLabel.Font = Enum.Font.Gotham
infoLabel.TextSize = 12
infoLabel.TextWrapped = true
infoLabel.TextXAlignment = Enum.TextXAlignment.Left
infoLabel.TextYAlignment = Enum.TextYAlignment.Top
infoLabel.Parent = infoPanel

-- Thanh nút dưới
local buttonBar = Instance.new("Frame")
buttonBar.Size = UDim2.new(1, -20, 0, 40)
buttonBar.Position = UDim2.new(0, 10, 1, -50)
buttonBar.BackgroundTransparency = 1
buttonBar.Parent = mainFrame

local startBtn = Instance.new("TextButton")
startBtn.Size = UDim2.new(0.24, -5, 1, 0)
startBtn.Position = UDim2.new(0, 0, 0, 0)
startBtn.BackgroundColor3 = Color3.fromRGB(50, 150, 80)
startBtn.Text = "START"
startBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
startBtn.Font = Enum.Font.GothamBold
startBtn.TextSize = 12
startBtn.Parent = buttonBar

local startCorner = Instance.new("UICorner")
startCorner.CornerRadius = UDim.new(0, 6)
startCorner.Parent = startBtn

local stopBtn = Instance.new("TextButton")
stopBtn.Size = UDim2.new(0.24, -5, 1, 0)
stopBtn.Position = UDim2.new(0.25, 5, 0, 0)
stopBtn.BackgroundColor3 = Color3.fromRGB(180, 60, 60)
stopBtn.Text = "STOP"
stopBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
stopBtn.Font = Enum.Font.GothamBold
stopBtn.TextSize = 12
stopBtn.Parent = buttonBar

local stopCorner = Instance.new("UICorner")
stopCorner.CornerRadius = UDim.new(0, 6)
stopCorner.Parent = stopBtn

local refreshBtn = Instance.new("TextButton")
refreshBtn.Size = UDim2.new(0.24, -5, 1, 0)
refreshBtn.Position = UDim2.new(0.50, 10, 0, 0)
refreshBtn.BackgroundColor3 = Color3.fromRGB(60, 120, 200)
refreshBtn.Text = "REFRESH"
refreshBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
refreshBtn.Font = Enum.Font.GothamBold
refreshBtn.TextSize = 12
refreshBtn.Parent = buttonBar

local refreshCorner = Instance.new("UICorner")
refreshCorner.CornerRadius = UDim.new(0, 6)
refreshCorner.Parent = refreshBtn

local hideBtn = Instance.new("TextButton")
hideBtn.Size = UDim2.new(0.24, -5, 1, 0)
hideBtn.Position = UDim2.new(0.75, 15, 0, 0)
hideBtn.BackgroundColor3 = Color3.fromRGB(80, 80, 100)
hideBtn.Text = "ẨN MENU"
hideBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
hideBtn.Font = Enum.Font.GothamBold
hideBtn.TextSize = 12
hideBtn.Parent = buttonBar

local hideCorner = Instance.new("UICorner")
hideCorner.CornerRadius = UDim.new(0, 6)
hideCorner.Parent = hideBtn

-- Thanh trạng thái
local statusBar = Instance.new("TextLabel")
statusBar.Size = UDim2.new(1, -20, 0, 22)
statusBar.Position = UDim2.new(0, 10, 1, -78)
statusBar.BackgroundTransparency = 1
statusBar.Text = "Sẵn sàng | Chưa quét"
statusBar.TextColor3 = Color3.fromRGB(160, 160, 170)
statusBar.Font = Enum.Font.Gotham
statusBar.TextSize = 11
statusBar.TextXAlignment = Enum.TextXAlignment.Left
statusBar.Parent = mainFrame

-- ============================================================
-- UI LOGIC
-- ============================================================
local radar = RadarCore.new()

local function clearChildren(parent)
    for _, c in ipairs(parent:GetChildren()) do
        if c:IsA("TextButton") then c:Destroy() end
    end
end

local function renderEntityList(areaName)
    clearChildren(entityPanel)
    if not areaName then return end
    local entities = EntityCatalog:GetArea(areaName)
    if not entities then return end

    local names = {}
    for name in pairs(entities) do table.insert(names, name) end
    table.sort(names)

    for _, name in ipairs(names) do
        local entry = entities[name]
        local btn = Instance.new("TextButton")
        btn.Size = UDim2.new(1, -8, 0, 28)
        btn.BackgroundColor3 = Color3.fromRGB(45, 45, 58)
        btn.Text = name
        btn.TextColor3 = Color3.fromRGB(230, 230, 240)
        btn.Font = Enum.Font.Gotham
        btn.TextSize = 12
        btn.TextXAlignment = Enum.TextXAlignment.Left
        btn.Parent = entityPanel

        local c = Instance.new("UICorner")
        c.CornerRadius = UDim.new(0, 5)
        c.Parent = btn

        local pad = Instance.new("UIPadding")
        pad.PaddingLeft = UDim.new(0, 6)
        pad.Parent = btn

        btn.MouseButton1Click:Connect(function()
            state.selectedEntity = name
            radar:ClearTracked()
            radar:Track(name)
            infoLabel.Text = string.format(
                "Tên: %s\nKhu vực: %s\nLoại: %s\n\nGhi chú: %s",
                name, areaName, entry.kind, entry.note
            )
            statusBar.Text = "Đang theo dõi: " .. name
        end)
    end

    entityPanel.CanvasSize = UDim2.new(0, 0, 0, entityLayout.AbsoluteContentSize.Y + 10)
end

local function renderAreaList()
    clearChildren(areaPanel)
    local areas = EntityCatalog:GetAreaNames()
    for _, areaName in ipairs(areas) do
        local btn = Instance.new("TextButton")
        btn.Size = UDim2.new(1, -8, 0, 28)
        btn.BackgroundColor3 = Color3.fromRGB(45, 45, 58)
        btn.Text = areaName
        btn.TextColor3 = Color3.fromRGB(230, 230, 240)
        btn.Font = Enum.Font.Gotham
        btn.TextSize = 11
        btn.TextXAlignment = Enum.TextXAlignment.Left
        btn.Parent = areaPanel

        local c = Instance.new("UICorner")
        c.CornerRadius = UDim.new(0, 5)
        c.Parent = btn

        local pad = Instance.new("UIPadding")
        pad.PaddingLeft = UDim.new(0, 6)
        pad.Parent = btn

        btn.MouseButton1Click:Connect(function()
            state.selectedArea = areaName
            state.selectedEntity = nil
            infoLabel.Text = "Khu vực: " .. areaName .. "\nChọn thực thể bên cạnh."
            renderEntityList(areaName)
        end)
    end
    areaPanel.CanvasSize = UDim2.new(0, 0, 0, areaLayout.AbsoluteContentSize.Y + 10)
end

-- Kết nối sự kiện kết quả quét
radar:GetResultEvent().Event:Connect(function(results)
    state.lastResults = results
    state.lastScanTime = os.clock()
    local target = state.selectedEntity
    if not target then return end
    local r = results[target]
    if not r then return end

    local statusText
    if r.status == RadarCore.Status.DETECTED then
        statusText = string.format(
            "Tên: %s\nTrạng thái: ĐÃ PHÁT HIỆN\nKhoảng cách: %.1f studs\nHướng: %s\nVị trí: (%.1f, %.1f, %.1f)\n\n%s",
            target, r.distance, r.direction,
            r.position.X, r.position.Y, r.position.Z, r.note
        )
    elseif r.status == RadarCore.Status.NOT_FOUND then
        statusText = string.format("Tên: %s\nTrạng thái: KHÔNG PHÁT HIỆN\n\n%s", target, r.note)
    elseif r.status == RadarCore.Status.UNSUPPORTED then
        statusText = string.format("Tên: %s\nTrạng thái: KHÔNG HỖ TRỢ PHÁT HIỆN\n\n%s", target, r.note)
    else
        statusText = string.format("Tên: %s\nTrạng thái: %s\n\n%s", target, r.status, r.note)
    end
    infoLabel.Text = statusText
    statusBar.Text = string.format("Cập nhật lúc: %.1fs | Đang theo dõi: %s", os.clock() - state.lastScanTime, target)
end)

-- Nút START
startBtn.MouseButton1Click:Connect(function()
    if state.running then return end
    state.running = true
    radar:Start()
    statusBar.Text = "Đang quét..."
end)

-- Nút STOP
stopBtn.MouseButton1Click:Connect(function()
    if not state.running then return end
    state.running = false
    radar:Stop()
    statusBar.Text = "Đã dừng quét."
end)

-- Nút REFRESH
refreshBtn.MouseButton1Click:Connect(function()
    renderAreaList()
    if state.selectedArea then
        renderEntityList(state.selectedArea)
    end
    statusBar.Text = "Đã làm mới danh sách."
end)

-- Nút ẩn menu
local function setMenuVisible(v)
    state.uiVisible = v
    mainFrame.Visible = v
    toggleBtn.Visible = not v
end

hideBtn.MouseButton1Click:Connect(function()
    setMenuVisible(false)
end)

toggleBtn.MouseButton1Click:Connect(function()
    setMenuVisible(true)
end)

closeBtn.MouseButton1Click:Connect(function()
    setMenuVisible(false)
end)

-- Ô tìm kiếm
searchBox:GetPropertyChangedSignal("Text"):Connect(function()
    local q = searchBox.Text
    if q == "" then
        if state.selectedArea then
            renderEntityList(state.selectedArea)
        end
        return
    end
    clearChildren(entityPanel)
    local results = EntityCatalog:Search(q)
    for _, r in ipairs(results) do
        local btn = Instance.new("TextButton")
        btn.Size = UDim2.new(1, -8, 0, 28)
        btn.BackgroundColor3 = Color3.fromRGB(45, 45, 58)
        btn.Text = r.name .. "  [" .. r.area .. "]"
        btn.TextColor3 = Color3.fromRGB(230, 230, 240)
        btn.Font = Enum.Font.Gotham
        btn.TextSize = 11
        btn.TextXAlignment = Enum.TextXAlignment.Left
        btn.Parent = entityPanel

        local c = Instance.new("UICorner")
        c.CornerRadius = UDim.new(0, 5)
        c.Parent = btn

        local pad = Instance.new("UIPadding")
        pad.PaddingLeft = UDim.new(0, 6)
        pad.Parent = btn

        btn.MouseButton1Click:Connect(function()
            state.selectedEntity = r.name
            radar:ClearTracked()
            radar:Track(r.name)
            infoLabel.Text = string.format(
                "Tên: %s\nKhu vực: %s\nLoại: %s\n\nGhi chú: %s",
                r.name, r.area, r.entry.kind, r.entry.note
            )
        end)
    end
    entityPanel.CanvasSize = UDim2.new(0, 0, 0, entityLayout.AbsoluteContentSize.Y + 10)
end)

-- ============================================================
-- KHỞI TẠO
-- ============================================================
renderAreaList()
setMenuVisible(true)
log("DoorsRadar ALL-IN-ONE đã khởi tạo. Nhấn START để bắt đầu quét.")

_G.DoorsRadar = {
    radar = radar,
    catalog = EntityCatalog,
    config = Config,
    state = state,
}