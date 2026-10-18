-- LocalScript: StarterPlayer > StarterPlayerScripts (game bạn sở hữu).
-- Chỉ hiển thị thông báo; KHÔNG tăng FPS hay sửa game/script khác.
-- Phần trăm là thời gian hiển thị, KHÔNG phải mức giảm lag đo được.
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local player = Players.LocalPlayer
if not player then return end
local playerGui = player:WaitForChild("PlayerGui")
local name = "NonInvasiveMobileNotice"
if playerGui:FindFirstChild(name) then return end

local gui = Instance.new("ScreenGui")
gui.Name = name
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = false

local panel = Instance.new("Frame")
panel.Name = "Panel"
panel.AnchorPoint = Vector2.new(1, 1)
panel.Position = UDim2.new(0, -4, 1, -12)
-- Tỉ lệ chiều rộng để vừa cả màn hình điện thoại hẹp.
panel.Size = UDim2.new(0.65, 0, 0, 84)
panel.BackgroundColor3 = Color3.fromRGB(75, 75, 75)
panel.BackgroundTransparency = 0.3
panel.BorderSizePixel = 0
panel.Active = false
panel.Selectable = false
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
label("Title", "Đang giảm lag", 4, 20, 15)
local percent = label("Progress", "1%", 25, 22, 18)
label("Disclaimer", "Tiến trình hiển thị • Không đo FPS\nKhông thay đổi game", 49, 32, 10)
gui.Parent = playerGui

local started = os.clock()
local previous = 1
local connection
local slideSeconds = 0.4
local settled = false
local function slidePosition(alpha)
    -- Smoothstep: di chuyển mượt; không cập nhật vị trí trong lúc đứng yên.
    local eased = alpha * alpha * (3 - 2 * alpha)
    panel.Position = UDim2.new(eased, -4 - 8 * eased, 1, -12)
end
connection = RunService.Heartbeat:Connect(function()
    -- Mốc thời gian thực: không đếm frame, không chờ nối tiếp gây trôi giờ.
    local elapsed = os.clock() - started
    if gui.Parent ~= playerGui or elapsed >= 30 then
        connection:Disconnect()
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
