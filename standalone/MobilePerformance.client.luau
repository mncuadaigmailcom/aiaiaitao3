-- LocalScript cho game bạn sở hữu: StarterPlayer > StarterPlayerScripts.
-- Hai chế độ: mặc định chỉ thông báo/đo FPS, không thay đổi đồ hoạ.
-- Đổi MODE thành "graphics" để CHO PHÉP giảm bóng/hiệu ứng.
-- Không có chế độ nào bảo đảm FPS; không dùng executor.
local MODE = "safe"
local SHOW_FPS = true
-- Chỉ đổi hình thức chữ, KHÔNG phải tính năng tăng FPS.
local USE_SIMPLE_FONT = false
if MODE ~= "safe" and MODE ~= "graphics" then
    warn("MobilePerformance: MODE phải là safe hoặc graphics")
    return
end
-- Đọc standalone/README.md để biết giới hạn và cách hoàn tác.
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local Lighting = game:GetService("Lighting")
local player = Players.LocalPlayer
if not player then return end
local playerGui = player:WaitForChild("PlayerGui")
local name = "MobilePerformanceNotice"
local controllerName = "MobilePerformanceController"
if playerGui:FindFirstChild(controllerName) then return end

local controller = Instance.new("Folder")
controller.Name = controllerName
local restoreEvent = Instance.new("BindableEvent")
restoreEvent.Name = "Restore"
restoreEvent.Parent = controller
controller.Parent = playerGui

local records = {}
local connection
local fpsConnection
local active = true
local fontConnection
local effectConnection
local restoreConnection
local destroyConnection
local function change(object, property, target)
    local ok, old = pcall(function() return object[property] end)
    if not ok or old == target then return end
    local success = pcall(function() object[property] = target end)
    if success then
        records[#records + 1] = { object = object, property = property, old = old, target = target }
    end
end
local function reduceEffect(object)
    if object:IsA("PostEffect") then
        change(object, "Enabled", false)
    end
end
local function restore()
    if not active then return end
    active = false
    if connection then connection:Disconnect() end
    if fpsConnection then fpsConnection:Disconnect() end
    if fontConnection then fontConnection:Disconnect() end
    if effectConnection then effectConnection:Disconnect() end
    if restoreConnection then restoreConnection:Disconnect() end
    if destroyConnection then destroyConnection:Disconnect() end
    for i = #records, 1, -1 do
        local record = records[i]
        pcall(function()
            -- Không ghi đè nếu game đã đổi giá trị này sau khi tối ưu.
            if record.object[record.property] == record.target then
                record.object[record.property] = record.old
            end
        end)
    end
    records = {}
    local notice = playerGui:FindFirstChild(name)
    if notice then notice:Destroy() end
end
restoreConnection = restoreEvent.Event:Connect(function()
    restore()
    controller:Destroy()
end)
destroyConnection = controller.Destroying:Connect(restore)

-- Chế độ safe KHÔNG duyệt Lighting hoặc ghi bất kỳ thiết lập đồ hoạ nào.
if MODE == "graphics" then
    change(Lighting, "GlobalShadows", false)
    change(Lighting, "EnvironmentDiffuseScale", 0)
    change(Lighting, "EnvironmentSpecularScale", 0)
    effectConnection = Lighting.DescendantAdded:Connect(reduceEffect)
    for _, object in ipairs(Lighting:GetDescendants()) do
        reduceEffect(object)
    end
end
-- Tuỳ chọn riêng: chỉ chữ của PlayerGui, không chạm CoreGui/Workspace.
if USE_SIMPLE_FONT then
    local simpleFont = Font.fromEnum(Enum.Font.SourceSans)
    local function simplifyText(object)
        if not (object:IsA("TextLabel") or object:IsA("TextButton") or object:IsA("TextBox")) then return end
        local ancestor = object
        while ancestor and ancestor ~= playerGui do
            if ancestor.Name == name then return end
            ancestor = ancestor.Parent
        end
        if ancestor ~= playerGui then return end
        -- Lưu FontFace thay vì Font để khôi phục được cả phông tuỳ chỉnh.
        change(object, "FontFace", simpleFont)
    end
    fontConnection = playerGui.DescendantAdded:Connect(simplifyText)
    local count = 0
    for _, object in ipairs(playerGui:GetDescendants()) do
        if not active then break end
        simplifyText(object)
        count = count + 1
        if count % 100 == 0 then task.wait() end
    end
end
if not active then return end
-- Không đổi độ phân giải, camera, texture, hạt gameplay hoặc ép FPS bằng API ẩn.

local gui = Instance.new("ScreenGui")
gui.Name = name
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = false

local panel = Instance.new("Frame")
panel.Name = "Panel"
panel.AnchorPoint = Vector2.new(1, 1)
panel.Position = UDim2.new(1, 20, 1, -12)
-- Tỉ lệ chiều rộng để vừa cả màn hình điện thoại hẹp.
panel.Size = UDim2.new(0.65, 0, 0, 84)
panel.BackgroundColor3 = Color3.fromRGB(75, 75, 75)
panel.BackgroundTransparency = 0.3
panel.BorderSizePixel = 0
panel.Active = false
panel.Selectable = false
panel.Visible = false
panel.Parent = gui
local limit = Instance.new("UISizeConstraint")
limit.MaxSize = Vector2.new(220, 84)
limit.Parent = panel

local stroke = Instance.new("UIStroke")
stroke.Thickness = 2
stroke.Color = Color3.new(1, 1, 1)
stroke.Parent = panel
local rainbow = Instance.new("UIGradient")
local colors = {}
local spectrum = {
    Color3.fromRGB(255, 40, 40), Color3.fromRGB(255, 255, 40),
    Color3.fromRGB(40, 255, 40), Color3.fromRGB(40, 255, 255),
    Color3.fromRGB(40, 40, 255), Color3.fromRGB(255, 40, 255),
    Color3.fromRGB(255, 40, 40),
}
for i, color in ipairs(spectrum) do
    colors[i] = ColorSequenceKeypoint.new((i - 1) / 6, color)
end
rainbow.Color = ColorSequence.new(colors)
rainbow.Parent = stroke
-- Viền cầu vồng tĩnh: không tốn tween/render loop cho màu sắc.

local function label(labelName, text, y, height, size)
    local item = Instance.new("TextLabel")
    item.Name = labelName
    item.BackgroundTransparency = 1
    item.Position = UDim2.new(0, 8, 0, y)
    item.Size = UDim2.new(1, -16, 0, height)
    item.Font = Enum.Font.Gotham
    item.TextSize = size
    item.TextColor3 = Color3.new(1, 1, 1)
    item.TextWrapped = true
    item.Text = text
    item.Active = false
    item.Selectable = false
    item.Parent = panel
    return item
end
label("Title", MODE == "graphics" and "Ưu tiên FPS" or "Theo dõi hiệu năng", 4, 20, 15)
local percent = label("Progress", "1%", 25, 22, 18)
local status = label("Disclaimer", "Tiến trình hiển thị • Không đo mức giảm lag", 49, 32, 10)
local modeText = MODE == "graphics" and "Đã giảm đồ hoạ" or "Không đổi đồ hoạ"
status.Text = modeText .. " • Đang đo FPS"
if SHOW_FPS then
    local frames = 0
    local windowStart = os.clock()
    fpsConnection = RunService.RenderStepped:Connect(function()
        frames = frames + 1
        local now = os.clock()
        local elapsed = now - windowStart
        if elapsed >= 1 then
            -- FPS quan sát từ frame client, không phải mức tăng do script.
            status.Text = modeText .. " • ~" .. tostring(math.floor(frames / elapsed + 0.5)) .. " FPS\nTiến trình không đo mức giảm lag"
            frames = 0
            windowStart = now
        end
    end)
else
    status.Text = modeText .. "\nTiến trình không đo mức giảm lag"
end
gui.Parent = playerGui

local started = os.clock()
local previous = 1
local slideSeconds = 0.4
local settled = false
local function slidePosition(alpha)
    -- Smoothstep: di chuyển mượt; không cập nhật vị trí trong lúc đứng yên.
    local eased = alpha * alpha * (3 - 2 * alpha)
    -- Chỉ trượt 32 px trong góc dưới phải, không đi ngang màn hình.
    panel.Position = UDim2.new(1, 20 - 32 * eased, 1, -12)
    panel.Visible = alpha > 0
end
connection = RunService.Heartbeat:Connect(function()
    -- Mốc thời gian thực: không đếm frame, không chờ nối tiếp gây trôi giờ.
    local elapsed = os.clock() - started
    if gui.Parent ~= playerGui or elapsed >= 30 then
        connection:Disconnect()
        if fpsConnection then fpsConnection:Disconnect() end
        if MODE == "safe" and not USE_SIMPLE_FONT then controller:Destroy() end
        if gui.Parent == playerGui then gui:Destroy() end
        return
    end
    if elapsed < slideSeconds then
        slidePosition(math.clamp(elapsed / slideSeconds, 0, 1))
    elseif elapsed >= 30 - slideSeconds then
        slidePosition(math.clamp((30 - elapsed) / slideSeconds, 0, 1))
    elseif not settled then
        settled = true
        slidePosition(1)
    end
    local value = math.min(100, 1 + math.floor(math.max(0, elapsed) * 99 / 25))
    if value ~= previous then
        previous = value
        percent.Text = tostring(value) .. "%"
    end
end)
