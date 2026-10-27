--[[
================================================================================
  PLAYER TOOLS — 2 tính năng người chơi, GỘP TRONG 1 CỬA SỔ
--------------------------------------------------------------------------------
  Một file · một cửa sổ · hai tab:

    🧥 Trang phục  — xem / mặc / lưu / trả skin trang phục của bất kỳ ai
    📡 Mã server  — tra cứu · copy mã · vào đúng server (JobId) của người chơi,
                    kể cả người lạ (Roblox ẩn presence), tự biết 3 hải Blox Fruits
                    (2753915549 / 4442272183 / 7449423635)

  CÁCH DÙNG
    Dán cả file vào executor (Delta / Codex / Xeno / Synapse…) rồi chạy.
    • Nút 🎛 (hoặc RightControl / RightShift) để mở/đóng cửa sổ
    • RightControl mở thẳng tab Trang phục, RightShift mở thẳng tab Mã server
    • Kéo thanh tiêu đề để di chuyển cửa sổ

  BẢN RIÊNG LẺ
    • outfit-local.lua — chỉ trang phục     • server-code.lua — chỉ mã server
    • script.js        — hub đầy đủ nhiều tính năng

  GIỚI HẠN
    • Trang phục chỉ đổi phía client (người khác không thấy).
    • Mã server chỉ tìm được server CÔNG KHAI; VIP/riêng tư thì Roblox không trả mã.
================================================================================
]]

-- ============================================================================
-- KHUNG CHUNG (1 cửa sổ, 2 tab)
-- ============================================================================
local Players = game:GetService("Players")
local TeleportService = game:GetService("TeleportService")
local GuiService = game:GetService("GuiService")
local UserInputService = game:GetService("UserInputService")
local HttpService = game:GetService("HttpService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local targetGui = playerGui
pcall(function()
    if type(gethui) == "function" then
        local hui = gethui()
        if hui then targetGui = hui end
    end
end)

local oldShell = targetGui:FindFirstChild("PlayerToolsGui")
if oldShell then pcall(function() oldShell:Destroy() end) end
local oldOutfit = targetGui:FindFirstChild("OutfitLocalGui")
if oldOutfit then pcall(function() oldOutfit:Destroy() end) end
local oldServer = targetGui:FindFirstChild("ServerCodeGui")
if oldServer then pcall(function() oldServer:Destroy() end) end

local function New(class, props, parent)
    local obj = Instance.new(class)
    for k, v in pairs(props or {}) do obj[k] = v end
    if parent then obj.Parent = parent end
    return obj
end

local SC = {
    BG = Color3.fromRGB(18, 19, 24),
    PANEL = Color3.fromRGB(28, 30, 38),
    FIELD = Color3.fromRGB(38, 41, 52),
    ACCENT = Color3.fromRGB(120, 170, 255),
    GREEN = Color3.fromRGB(80, 200, 130),
    TEXT = Color3.fromRGB(235, 238, 245),
    DIM = Color3.fromRGB(150, 156, 172),
}

local shellGui = New("ScreenGui", {
    Name = "PlayerToolsGui", ResetOnSpawn = false, IgnoreGuiInset = true,
    ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
}, targetGui)
shellGui.DisplayOrder = 999

local floatBtn = New("TextButton", {
    Name = "ToolsFloat", Size = UDim2.new(0, 44, 0, 44), Position = UDim2.new(1, -64, 1, -180),
    BackgroundColor3 = SC.ACCENT, Text = "🎛", TextSize = 20, Font = Enum.Font.GothamBold,
    TextColor3 = SC.BG, BorderSizePixel = 0, ZIndex = 60,
}, shellGui)
New("UICorner", { CornerRadius = UDim.new(1, 0) }, floatBtn)
New("UIStroke", { Color = SC.ACCENT, Transparency = 0.2, Thickness = 1.4 }, floatBtn)

local shellWin = New("Frame", {
    Name = "ToolsWindow", Size = UDim2.new(0, 468, 0, 438), Position = UDim2.new(0.5, -234, 0.5, -219),
    BackgroundColor3 = SC.BG, BorderSizePixel = 0, Visible = false, Active = true, ZIndex = 50,
}, shellGui)
New("UICorner", { CornerRadius = UDim.new(0, 14) }, shellWin)
New("UIStroke", { Color = SC.ACCENT, Transparency = 0.5, Thickness = 1.2 }, shellWin)

local shellHeader = New("Frame", {
    Name = "Header", Size = UDim2.new(1, 0, 0, 32), BackgroundColor3 = SC.PANEL, BorderSizePixel = 0, ZIndex = 51,
}, shellWin)
New("UICorner", { CornerRadius = UDim.new(0, 14) }, shellHeader)
New("TextLabel", {
    Size = UDim2.new(1, -46, 1, 0), Position = UDim2.new(0, 12, 0, 0), BackgroundTransparency = 1,
    Text = "🎛  PLAYER TOOLS", TextColor3 = SC.ACCENT, Font = Enum.Font.GothamBold, TextSize = 13,
    TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 52,
}, shellHeader)

local closeShellBtn = New("TextButton", {
    Size = UDim2.new(0, 26, 0, 22), Position = UDim2.new(1, -34, 0, 5), BackgroundColor3 = SC.FIELD,
    Text = "✕", TextColor3 = SC.TEXT, Font = Enum.Font.GothamBold, TextSize = 12, BorderSizePixel = 0, ZIndex = 52,
}, shellHeader)
New("UICorner", { CornerRadius = UDim.new(0, 6) }, closeShellBtn)

local tabBar = New("Frame", {
    Name = "Tabs", Size = UDim2.new(1, -16, 0, 30), Position = UDim2.new(0, 8, 0, 36),
    BackgroundTransparency = 1, ZIndex = 51,
}, shellWin)

local tabOutfit = New("TextButton", {
    Size = UDim2.new(0, 218, 0, 30), Position = UDim2.new(0, 0, 0, 0), BackgroundColor3 = SC.ACCENT,
    Text = "🧥  Trang phục", TextColor3 = SC.BG, Font = Enum.Font.GothamBold, TextSize = 12,
    BorderSizePixel = 0, ZIndex = 52,
}, tabBar)
New("UICorner", { CornerRadius = UDim.new(0, 8) }, tabOutfit)

local tabServer = New("TextButton", {
    Size = UDim2.new(0, 218, 0, 30), Position = UDim2.new(1, -218, 0, 0), BackgroundColor3 = SC.FIELD,
    Text = "📡  Mã server", TextColor3 = SC.DIM, Font = Enum.Font.GothamBold, TextSize = 12,
    BorderSizePixel = 0, ZIndex = 52,
}, tabBar)
New("UICorner", { CornerRadius = UDim.new(0, 8) }, tabServer)

local content = New("Frame", {
    Name = "Content", Size = UDim2.new(1, -16, 0, 356), Position = UDim2.new(0, 8, 0, 74),
    BackgroundTransparency = 1, ClipsDescendants = true, ZIndex = 51,
}, shellWin)

local hiddenBtn = New("TextButton", { Size = UDim2.new(0, 0, 0, 0), Visible = false, Text = "" }, content)

local PT = { gui = shellGui, content = content, hiddenBtn = hiddenBtn, New = New }

-- ============================================================================
-- TAB 1/2 — LẤY TRANG PHỤC NGƯỜI CHƠI  (nguồn: outfit-local.lua)
-- ============================================================================
do
    local ok1, err1 = pcall(function()
--[[
================================================================================
  OUTFIT LOCAL — lấy & mặc trang phục người chơi (bản tách riêng)
--------------------------------------------------------------------------------
  Tách ra từ hub "taodepzai v5.0 NOIR" (script.js) theo yêu cầu: giữ tính năng
  lấy trang phục, bỏ khỏi hub. File này CHỈ làm một việc: xem / mặc / lưu trang
  phục của một người chơi bất kỳ, ở phía CLIENT của bạn.

  CÁCH DÙNG
    Dán cả file vào executor (Delta / Codex / Synapse / Xeno…) rồi chạy.
    RightControl hoặc nút 🧥 để mở/đóng cửa sổ.

  LÀM ĐƯỢC
    • Tra cứu theo tên, @tên hoặc UserId → tên, UserId, ngày tạo, mô hình 3D
    • 👕 Mặc LOCAL : mặc trang phục đó cho NHÂN VẬT CỦA BẠN, chỉ trên máy bạn
    • ↩ Trả skin   : quay lại trang phục gốc (hoặc trang phục tài khoản)
    • 💾 Lưu skin  : lưu vào danh sách (JSON trên đĩa executor)
    • ⚡ Tự mặc    : tự mặc lại mỗi khi vào game / hồi sinh
    • 🗂 Danh sách : chọn / đặt tự mặc / xoá từng skin đã lưu
    • 🧩 Phụ kiện  : bỏ toàn bộ mũ-tóc-phụ kiện trước khi mặc

  GIỚI HẠN — ĐỌC KỸ
    • CHỈ đổi phía client: người chơi khác không thấy, server không đổi.
    • Không "mặc lên server". Bản gốc gọi RemoteFunction
      ReplicatedStorage.BC_OutfitRequest (phải tự cài trong game của bạn);
      file này KHÔNG gửi gì lên server.
    • Không lấy được skin nếu người chơi đã tắt hiển thị / asset đã bị gỡ.
    • Vi phạm Roblox Terms of Use khi dùng trong game người khác → rủi ro khoá
      tài khoản là của bạn. Bản này KHÔNG kèm "anti ban" (bản gốc cũng không
      chống ban thật, xem docs/10-phan-tich-script-js.md §9).

  DỮ LIỆU & QUYỀN RIÊNG TƯ
    • Chỉ gọi 3 endpoint công khai của Roblox:
        users.roblox.com/v1/users/<id>
        users.roblox.com/v1/usernames/users
        thumbnails.roblox.com/v1/users/avatar
      và fallback Players:GetHumanoidDescriptionFromUserId / GetUserThumbnailAsync.
    • Không webhook, không gửi dữ liệu tới máy chủ nào khác.
    • File lưu: outfit_local_v1.json trong workspace của executor.
================================================================================
]]

-- ============================================================================
-- 0. DỊCH VỤ & DỌN PHIÊN CŨ
-- ============================================================================
local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local HttpService = game:GetService("HttpService")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

-- Ưu tiên gethui() để cửa sổ không bị game xoá khi respawn.
local targetGui = playerGui
pcall(function()
    if type(gethui) == "function" then
        local hui = gethui()
        if hui then targetGui = hui end
    end
end)

local oldGui = targetGui:FindFirstChild("OutfitLocalGui")
if oldGui then pcall(function() oldGui:Destroy() end) end
pcall(function() RunService:UnbindFromRenderStep("OutfitLocalSpin") end)

local Connections = {}
local function track(conn)
    Connections[#Connections + 1] = conn
    return conn
end

-- ============================================================================
-- 1. TIỆN ÍCH
-- ============================================================================
local C = {
    BG = Color3.fromRGB(14, 16, 22),
    PANEL = Color3.fromRGB(24, 27, 36),
    PANEL2 = Color3.fromRGB(34, 38, 52),
    BORDER = Color3.fromRGB(62, 69, 90),
    TEXT = Color3.fromRGB(232, 236, 246),
    MUTED = Color3.fromRGB(150, 158, 178),
    ACCENT = Color3.fromRGB(240, 201, 122),
    GREEN = Color3.fromRGB(64, 200, 144),
    BLUE = Color3.fromRGB(80, 150, 240),
    RED = Color3.fromRGB(226, 92, 92),
    YELLOW = Color3.fromRGB(244, 200, 100),
    INK = Color3.fromRGB(10, 12, 16),
}

local function New(class, props, parent)
    local obj = Instance.new(class)
    for key, value in pairs(props or {}) do
        obj[key] = value
    end
    if parent then obj.Parent = parent end
    return obj
end

local function Corner(obj, radius)
    return New("UICorner", { CornerRadius = radius or UDim.new(0, 8) }, obj)
end

local function Stroke(obj, color, thickness)
    return New("UIStroke", {
        Color = color or C.BORDER,
        Thickness = thickness or 1,
        ApplyStrokeMode = Enum.ApplyStrokeMode.Border,
    }, obj)
end

local function trim(text)
    return (tostring(text or ""):gsub("^%s+", ""):gsub("%s+$", ""))
end

local function clip(text, maxLen)
    text = tostring(text or "")
    if #text <= maxLen then return text end
    return text:sub(1, maxLen - 1) .. "…"
end

local function jsonEncode(value)
    local ok, encoded = pcall(function() return HttpService:JSONEncode(value) end)
    return ok and encoded or nil
end

local function jsonDecode(text)
    local ok, decoded = pcall(function() return HttpService:JSONDecode(text) end)
    return ok and decoded or nil
end

-- ============================================================================
-- 2. HTTP — không có cookie, chỉ đọc thông tin công khai
-- ============================================================================
local function httpRequest(method, url, body)
    local headers = nil
    if body ~= nil then
        headers = { ["Content-Type"] = "application/json", ["Accept"] = "application/json" }
    end

    local req = nil
    if type(request) == "function" then
        req = request
    elseif type(http_request) == "function" then
        req = http_request
    elseif type(syn) == "table" and type(syn.request) == "function" then
        req = syn.request
    elseif type(http) == "table" and type(http.request) == "function" then
        req = http.request
    end

    if req then
        local ok, res = pcall(req, { Url = url, Method = method, Headers = headers, Body = body })
        if ok and type(res) == "table" and type(res.Body) == "string" and #res.Body > 0 then
            return res.Body
        end
    end

    if method == "GET" then
        local ok, raw = pcall(function() return game:HttpGet(url) end)
        if ok and type(raw) == "string" and #raw > 0 then return raw end
    else
        local ok, raw = pcall(function()
            return game:HttpPost(url, tostring(body or ""), "application/json")
        end)
        if ok and type(raw) == "string" and #raw > 0 then return raw end
    end
    return nil
end

local function httpJson(method, url, bodyTable)
    local body = bodyTable and jsonEncode(bodyTable) or nil
    local raw = httpRequest(method, url, body)
    if not raw then return nil, "không gọi được mạng" end
    local data = jsonDecode(raw)
    if type(data) ~= "table" then return nil, "phản hồi không phải JSON" end
    return data, nil
end

-- ============================================================================
-- 3. TRA CỨU NGƯỜI CHƠI
-- ============================================================================
local function resolveUserId(query)
    local q = trim(query):gsub("^@", "")
    if q == "" then return nil, "chưa nhập tên hoặc UserId" end

    if q:match("^%d+$") then
        local id = tonumber(q)
        if not id or id <= 0 then return nil, "UserId không hợp lệ" end
        return id, nil
    end

    for _, other in ipairs(Players:GetPlayers()) do
        if string.lower(other.Name) == string.lower(q) then
            return other.UserId, nil
        end
    end

    local data = httpJson("POST", "https://users.roblox.com/v1/usernames/users",
        { usernames = { q }, excludeBannedUsers = false })
    if type(data) == "table" and type(data.data) == "table" and type(data.data[1]) == "table" then
        local id = tonumber(data.data[1].id)
        if id then return id, nil end
    end

    local ok, id = pcall(function() return Players:GetUserIdFromNameAsync(q) end)
    if ok and tonumber(id) then return tonumber(id), nil end

    return nil, "không tìm thấy người chơi " .. q
end

local function fetchProfile(userId)
    local data = httpJson("GET", "https://users.roblox.com/v1/users/" .. tostring(userId))
    if type(data) == "table" and tonumber(data.id) then
        return {
            id = tonumber(data.id),
            name = tostring(data.name or ("User" .. tostring(userId))),
            displayName = tostring(data.displayName or data.name or ""),
            description = tostring(data.description or ""),
            created = tostring(data.created or ""),
            verified = (data.hasVerifiedBadge == true),
        }
    end

    local inServer = Players:GetPlayerByUserId(userId)
    if inServer then
        return {
            id = userId,
            name = inServer.Name,
            displayName = inServer.DisplayName,
            description = "",
            created = "",
            verified = false,
        }
    end
    return nil, "không đọc được hồ sơ UserId " .. tostring(userId)
end

local function fetchThumbnail(userId)
    local ok, url = pcall(function()
        return Players:GetUserThumbnailAsync(
            userId,
            Enum.ThumbnailType.AvatarThumbnail,
            Enum.ThumbnailSize.Size420x420
        )
    end)
    if ok and type(url) == "string" and url ~= "" then return url end

    local data = httpJson("GET",
        "https://thumbnails.roblox.com/v1/users/avatar?userIds=" .. tostring(userId) ..
        "&size=420x420&format=Png&isCircular=false")
    if type(data) == "table" and type(data.data) == "table" and type(data.data[1]) == "table" then
        local image = data.data[1].imageUrl
        if type(image) == "string" and image ~= "" then return image end
    end
    return nil
end

local function fetchDescription(userId)
    local ok, desc = pcall(function() return Players:GetHumanoidDescriptionFromUserId(userId) end)
    if ok and desc then return desc, nil end
    return nil, tostring(desc)
end

-- ============================================================================
-- 4. SNAPSHOT / DỰNG LẠI HumanoidDescription
-- ============================================================================
local DESC_NUM_KEYS = {
    "Shirt", "Pants", "GraphicTShirt", "Face", "Head", "Torso", "LeftArm", "RightArm", "LeftLeg", "RightLeg",
    "WidthScale", "HeightScale", "DepthScale", "HeadScale", "BodyTypeScale", "ProportionScale",
    "IdleAnimation", "WalkAnimation", "RunAnimation", "JumpAnimation", "FallAnimation",
    "ClimbAnimation", "SwimAnimation",
}
local DESC_STR_KEYS = {
    "HatAccessory", "HairAccessory", "FaceAccessory", "NeckAccessory",
    "ShouldersAccessory", "FrontAccessory", "BackAccessory", "WaistAccessory",
}
local DESC_COLOR_KEYS = {
    "HeadColor", "TorsoColor", "LeftArmColor", "RightArmColor", "LeftLegColor", "RightLegColor",
}

local function snapshotDesc(desc)
    if not desc then return nil end
    local snap = { nums = {}, strs = {}, cols = {}, accs = {} }

    for _, key in ipairs(DESC_NUM_KEYS) do
        pcall(function()
            local value = tonumber(desc[key])
            if value ~= nil then snap.nums[key] = value end
        end)
    end

    for _, key in ipairs(DESC_STR_KEYS) do
        pcall(function()
            local value = tostring(desc[key] or "")
            if value ~= "" then snap.strs[key] = value end
        end)
    end

    for _, key in ipairs(DESC_COLOR_KEYS) do
        pcall(function()
            local color = desc[key]
            if color and tonumber(color.R) then
                snap.cols[key] = { r = color.R, g = color.G, b = color.B }
            end
        end)
    end

    pcall(function()
        for _, item in ipairs(desc:GetAccessories(true) or {}) do
            local assetId = tonumber(item.AssetId)
            if assetId and assetId > 0 then
                snap.accs[#snap.accs + 1] = {
                    AssetId = assetId,
                    AccessoryType = tostring(item.AccessoryType or "Hat"):gsub("^Enum%.AccessoryType%.", ""),
                    IsLayered = (item.IsLayered == true),
                    Order = tonumber(item.Order),
                    Puffiness = tonumber(item.Puffiness),
                }
            end
        end
    end)

    return snap
end

-- removedAccs: { [assetId] = true } — những món cần bỏ khi mặc
local function buildDescFromSnap(snap, removedAccs)
    if type(snap) ~= "table" then return nil end
    local ok, desc = pcall(function() return Instance.new("HumanoidDescription") end)
    if not ok or not desc then return nil end

    for key, value in pairs(snap.nums or {}) do
        pcall(function() desc[key] = tonumber(value) or 0 end)
    end
    for key, value in pairs(snap.strs or {}) do
        pcall(function() desc[key] = tostring(value or "") end)
    end
    for key, color in pairs(snap.cols or {}) do
        if type(color) == "table" then
            pcall(function()
                desc[key] = Color3.new(
                    tonumber(color.r) or 0.9,
                    tonumber(color.g) or 0.85,
                    tonumber(color.b) or 0.75
                )
            end)
        end
    end

    local specs = {}
    for _, item in ipairs(snap.accs or {}) do
        local assetId = tonumber(item.AssetId)
        if assetId and assetId > 0 and not (removedAccs and removedAccs[assetId]) then
            local enumType = nil
            pcall(function() enumType = Enum.AccessoryType[tostring(item.AccessoryType or "Hat")] end)
            specs[#specs + 1] = {
                AssetId = assetId,
                AccessoryType = enumType or tostring(item.AccessoryType or "Hat"),
                IsLayered = (item.IsLayered == true),
                Order = tonumber(item.Order),
                Puffiness = tonumber(item.Puffiness),
            }
        end
    end
    if #specs > 0 then
        pcall(function() desc:SetAccessories(specs, true) end)
    end
    return desc
end

-- ============================================================================
-- 5. MÔ HÌNH 3D & GẮN PHỤ KIỆN
-- ============================================================================
local function currentRigType()
    local char = player.Character
    local hum = char and char:FindFirstChildOfClass("Humanoid")
    if hum then return hum.RigType end
    return Enum.HumanoidRigType.R15
end

local function buildModel(desc, rigType)
    if not desc then return nil, "không có HumanoidDescription" end
    local ok, model = pcall(function()
        return Players:CreateHumanoidModelFromDescription(desc, rigType or Enum.HumanoidRigType.R15)
    end)
    if ok and model then return model, nil end
    return nil, tostring(model)
end

local FALLBACK_ATTACH = {
    HatAttachment = { r15 = "Head", r6 = "Head" },
    HairAttachment = { r15 = "Head", r6 = "Head" },
    FaceFrontAttachment = { r15 = "Head", r6 = "Head" },
    FaceCenterAttachment = { r15 = "Head", r6 = "Head" },
    NeckAttachment = { r15 = "UpperTorso", r6 = "Torso" },
    BodyFrontAttachment = { r15 = "UpperTorso", r6 = "Torso" },
    BodyBackAttachment = { r15 = "UpperTorso", r6 = "Torso" },
    WaistCenterAttachment = { r15 = "LowerTorso", r6 = "Torso" },
    LeftCollarAttachment = { r15 = "UpperTorso", r6 = "Torso" },
    RightCollarAttachment = { r15 = "UpperTorso", r6 = "Torso" },
}

local function attachAccessory(character, accessory)
    if not (character and accessory) then return end
    pcall(function() accessory.Parent = character end)

    local handle = accessory:FindFirstChild("Handle")
    if not (handle and handle:IsA("BasePart")) then return end

    handle.Anchored = false
    handle.CanCollide = false
    handle.Massless = true

    for _, child in ipairs(handle:GetChildren()) do
        if child:IsA("JointInstance") or child:IsA("WeldConstraint") then
            pcall(function() child:Destroy() end)
        end
    end

    local attachment = handle:FindFirstChildOfClass("Attachment")
    local targetPart, targetAttachment = nil, nil

    if attachment then
        for _, part in ipairs(character:GetChildren()) do
            if part:IsA("BasePart") then
                local found = part:FindFirstChild(attachment.Name)
                if found and found:IsA("Attachment") then
                    targetPart, targetAttachment = part, found
                    break
                end
            end
        end
    end

    if not targetPart and attachment then
        local info = FALLBACK_ATTACH[attachment.Name]
        if info then
            local part = character:FindFirstChild(info.r15) or character:FindFirstChild(info.r6)
            if part then targetPart = part end
        end
    end

    if not targetPart then
        targetPart = character:FindFirstChild("Head")
            or character:FindFirstChild("UpperTorso")
            or character:FindFirstChild("Torso")
            or character.PrimaryPart
    end
    if not (targetPart and targetPart:IsA("BasePart")) then return end

    local c0 = (attachment and attachment.CFrame) or CFrame.new()
    local c1 = (targetAttachment and targetAttachment.CFrame) or CFrame.new(0, 0.5, 0)

    pcall(function() handle.CFrame = targetPart.CFrame * c1 * c0:Inverse() end)

    local weld = New("Weld", { Name = "OutfitWeld" }, handle)
    weld.Part0, weld.Part1 = handle, targetPart
    weld.C0, weld.C1 = c0, c1
end

-- ============================================================================
-- 6. MẶC LOCAL / TRẢ LẠI
-- ============================================================================
local State = {
    originalDesc = nil,
    originalHumanoid = nil,
    appliedEntry = nil,
    removedAccs = {},
    savedList = {},
    autoUseId = nil,
    current = nil,
    guardConn = nil,
}

local function rememberOriginal()
    local char = player.Character
    local hum = char and char:FindFirstChildOfClass("Humanoid")
    if not hum then return nil end
    if State.originalDesc and State.originalHumanoid == hum then
        return State.originalDesc
    end

    local ok, applied = pcall(function() return hum:GetAppliedDescription() end)
    if ok and applied then
        local okClone, cloned = pcall(function() return applied:Clone() end)
        State.originalDesc = (okClone and cloned) and cloned or applied
        State.originalHumanoid = hum
        return State.originalDesc
    end

    local okOwn, own = pcall(function()
        return Players:GetHumanoidDescriptionFromUserId(player.UserId)
    end)
    if okOwn and own then
        State.originalDesc = own
        State.originalHumanoid = hum
        return own
    end
    return nil
end

local function applyDescription(hum, desc)
    local okClone, cloned = pcall(function() return desc:Clone() end)
    local toApply = (okClone and cloned) and cloned or desc
    local ok, err = pcall(function() hum:ApplyDescription(toApply) end)
    return ok, err
end

local function applyLocal(entry)
    if type(entry) ~= "table" then return false, "chưa chọn trang phục" end

    local char = player.Character
    local hum = char and char:FindFirstChildOfClass("Humanoid")
    if not (char and hum) then return false, "chưa có nhân vật (đang tải hoặc đã chết)" end

    rememberOriginal()

    local desc = buildDescFromSnap(entry.snap, State.removedAccs)
    if not desc and entry.id then
        desc = select(1, fetchDescription(entry.id))
    end
    if not desc then return false, "không dựng được HumanoidDescription của người này" end

    local ok, err = applyDescription(hum, desc)

    -- ApplyDescription đôi khi bỏ sót phụ kiện: dựng model tạm rồi gắn tay phần thiếu
    local model = buildModel(desc, hum.RigType)
    if model then
        for _, item in ipairs(model:GetChildren()) do
            if item:IsA("Accessory") and not char:FindFirstChild(item.Name) then
                local okClone, cloned = pcall(function() return item:Clone() end)
                if okClone and cloned then attachAccessory(char, cloned) end
            end
        end
        pcall(function() model:Destroy() end)
    end

    if not ok then return false, tostring(err) end

    State.appliedEntry = entry

    if State.guardConn then pcall(function() State.guardConn:Disconnect() end) end
    State.guardConn = track(player.CharacterAdded:Connect(function(newChar)
        task.wait(1)
        local newHum = newChar:WaitForChild("Humanoid", 5)
        if not (newHum and State.appliedEntry) then return end
        State.originalHumanoid = newHum
        local again = buildDescFromSnap(State.appliedEntry.snap, State.removedAccs)
        if again then applyDescription(newHum, again) end
    end))

    return true, "đã mặc trang phục của " .. tostring(entry.name or entry.id)
end

local function restoreSkin()
    local char = player.Character
    local hum = char and char:FindFirstChildOfClass("Humanoid")
    if not hum then return false, "chưa có nhân vật" end

    State.appliedEntry = nil
    if State.guardConn then
        pcall(function() State.guardConn:Disconnect() end)
        State.guardConn = nil
    end

    if State.originalDesc then
        local ok, err = applyDescription(hum, State.originalDesc)
        if ok then return true, "đã trả lại trang phục gốc" end
        return false, tostring(err)
    end

    local okOwn, own = pcall(function()
        return Players:GetHumanoidDescriptionFromUserId(player.UserId)
    end)
    if okOwn and own then
        local ok, err = applyDescription(hum, own)
        if ok then return true, "đã trả lại trang phục tài khoản" end
        return false, tostring(err)
    end
    return false, "không có bản trang phục gốc để trả lại"
end

-- ============================================================================
-- 7. LƯU / ĐỌC
-- ============================================================================
local SAVE_FILE = "outfit_local_v1.json"

local function canUseDisk()
    return type(writefile) == "function" and type(readfile) == "function"
end

local function saveStore()
    local payload = { version = 1, saved = State.savedList, autoUseId = State.autoUseId }
    local encoded = jsonEncode(payload)
    if not encoded then return false, "không mã hoá được JSON" end
    _G.OutfitLocal_Saved = payload
    if not canUseDisk() then
        return false, "executor không có writefile — chỉ giữ trong phiên này"
    end
    local ok, err = pcall(writefile, SAVE_FILE, encoded)
    if ok then return true, nil end
    return false, tostring(err)
end

local function loadStore()
    local data = nil
    if canUseDisk() then
        local okRead, text = pcall(readfile, SAVE_FILE)
        if okRead and type(text) == "string" and #text > 0 then
            data = jsonDecode(text)
        end
    end
    if type(data) ~= "table" then data = _G.OutfitLocal_Saved end
    if type(data) ~= "table" then return end

    State.savedList = (type(data.saved) == "table") and data.saved or {}
    State.autoUseId = tonumber(data.autoUseId)
end

local function findSavedById(id)
    for _, entry in ipairs(State.savedList) do
        if tonumber(entry.id) == tonumber(id) then return entry end
    end
    return nil
end

-- ============================================================================
-- 8. GIAO DIỆN
-- ============================================================================
local WINDOW_W, WINDOW_H = 452, 356

-- (khung + nút mở do file gộp quản lý; module vẽ vào trang "Trang phục")
local gui = PT.content
local floatBtn = PT.hiddenBtn

local win = New("Frame", {
    Name = "OutfitWindow",
    Size = UDim2.new(0, WINDOW_W, 0, WINDOW_H),
    Position = UDim2.new(0, 0, 0, 0),
    BackgroundColor3 = C.BG,
    BorderSizePixel = 0,
    Visible = true,
    ZIndex = 40,
}, PT.content)
Corner(win, UDim.new(0, 14))
Stroke(win, C.BORDER, 1.2)

local header = New("Frame", {
    Name = "Header",
    Size = UDim2.new(1, 0, 0, 34),
    BackgroundColor3 = C.PANEL,
    BorderSizePixel = 0,
    ZIndex = 41,
}, win)
Corner(header, UDim.new(0, 14))

New("TextLabel", {
    Size = UDim2.new(1, -84, 1, 0),
    Position = UDim2.new(0, 12, 0, 0),
    BackgroundTransparency = 1,
    Text = "🧥  OUTFIT LOCAL — trang phục người chơi",
    Font = Enum.Font.GothamBold,
    TextSize = 13,
    TextColor3 = C.ACCENT,
    TextXAlignment = Enum.TextXAlignment.Left,
    ZIndex = 42,
}, header)

local minBtn = New("TextButton", {
    Size = UDim2.new(0, 26, 0, 22),
    Position = UDim2.new(1, -64, 0, 6),
    BackgroundColor3 = C.PANEL2,
    Text = "—",
    Font = Enum.Font.GothamBold,
    TextSize = 13,
    TextColor3 = C.MUTED,
    BorderSizePixel = 0,
    ZIndex = 43,
}, header)
Corner(minBtn, UDim.new(0, 6))

local closeBtn = New("TextButton", {
    Size = UDim2.new(0, 26, 0, 22),
    Position = UDim2.new(1, -34, 0, 6),
    BackgroundColor3 = C.RED,
    BackgroundTransparency = 0.15,
    Text = "✕",
    Font = Enum.Font.GothamBold,
    TextSize = 13,
    TextColor3 = Color3.new(1, 1, 1),
    BorderSizePixel = 0,
    ZIndex = 43,
}, header)
Corner(closeBtn, UDim.new(0, 6))

local input = New("TextBox", {
    Size = UDim2.new(1, -108, 0, 28),
    Position = UDim2.new(0, 12, 0, 42),
    BackgroundColor3 = C.PANEL2,
    Text = "",
    PlaceholderText = "Nhập tên, @tên hoặc UserId…",
    PlaceholderColor3 = C.MUTED,
    ClearTextOnFocus = false,
    Font = Enum.Font.GothamMedium,
    TextSize = 12,
    TextColor3 = C.TEXT,
    TextXAlignment = Enum.TextXAlignment.Left,
    BorderSizePixel = 0,
    ZIndex = 42,
}, win)
Corner(input, UDim.new(0, 7))
New("UIPadding", { PaddingLeft = UDim.new(0, 8) }, input)

local searchBtn = New("TextButton", {
    Size = UDim2.new(0, 84, 0, 28),
    Position = UDim2.new(1, -96, 0, 42),
    BackgroundColor3 = C.GREEN,
    Text = "🔍 Tra cứu",
    Font = Enum.Font.GothamBold,
    TextSize = 11,
    TextColor3 = C.INK,
    BorderSizePixel = 0,
    ZIndex = 42,
}, win)
Corner(searchBtn, UDim.new(0, 7))

-- 3D
local viewport = New("ViewportFrame", {
    Size = UDim2.new(0, 172, 0, 214),
    Position = UDim2.new(0, 12, 0, 78),
    BackgroundColor3 = C.PANEL,
    BorderSizePixel = 0,
    Ambient = Color3.fromRGB(190, 190, 190),
    LightColor = Color3.fromRGB(255, 255, 255),
    ZIndex = 42,
}, win)
Corner(viewport, UDim.new(0, 10))
Stroke(viewport, C.BORDER, 1)

local world = New("WorldModel", {}, viewport)
local viewCam = New("Camera", {}, viewport)
viewport.CurrentCamera = viewCam

local view = { yaw = 0.7, pitch = 0.18, dist = 9, auto = true, model = nil }

local function renderViewport()
    if not view.model then return end
    local center = Vector3.new(0, 2.4, 0)
    local offset = Vector3.new(
        math.sin(view.yaw) * math.cos(view.pitch),
        math.sin(view.pitch) + 0.25,
        math.cos(view.yaw) * math.cos(view.pitch)
    ) * view.dist
    viewCam.CFrame = CFrame.lookAt(center + offset, center)
end

local function clearViewport()
    if view.model then pcall(function() view.model:Destroy() end) end
    view.model = nil
end

local function showModel(desc)
    clearViewport()
    if not desc then return false, "không có dữ liệu" end
    local model, err = buildModel(desc, currentRigType())
    if not model then return false, err end

    model.Parent = world
    pcall(function()
        model:PivotTo(CFrame.new(0, 0, 0))
        local hum = model:FindFirstChildOfClass("Humanoid")
        if hum then
            hum.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None
            hum.HealthDisplayType = Enum.HumanoidDisplayType.AlwaysOff
        end
        for _, part in ipairs(model:GetDescendants()) do
            if part:IsA("BasePart") then
                part.Anchored = true
                part.CanCollide = false
            end
        end
    end)
    view.model = model
    renderViewport()
    return true, nil
end

-- Cột phải
local nameLbl = New("TextLabel", {
    Size = UDim2.new(1, -212, 0, 18),
    Position = UDim2.new(0, 196, 0, 76),
    BackgroundTransparency = 1,
    Text = "Chưa tra cứu",
    Font = Enum.Font.GothamBold,
    TextSize = 12,
    TextColor3 = C.TEXT,
    TextXAlignment = Enum.TextXAlignment.Left,
    TextTruncate = Enum.TextTruncate.AtEnd,
    ZIndex = 42,
}, win)

local subLbl = New("TextLabel", {
    Size = UDim2.new(1, -212, 0, 26),
    Position = UDim2.new(0, 196, 0, 96),
    BackgroundTransparency = 1,
    Text = "Nhập tên / UserId rồi bấm Tra cứu.",
    Font = Enum.Font.GothamMedium,
    TextSize = 10,
    TextColor3 = C.MUTED,
    TextXAlignment = Enum.TextXAlignment.Left,
    TextYAlignment = Enum.TextYAlignment.Top,
    TextWrapped = true,
    ZIndex = 42,
}, win)

local function makeButton(text, y, color, width)
    local btn = New("TextButton", {
        Size = UDim2.new(0, width or 232, 0, 22),
        Position = UDim2.new(0, 196, 0, y),
        BackgroundColor3 = color,
        BackgroundTransparency = 0.08,
        Text = text,
        Font = Enum.Font.GothamBold,
        TextSize = 10,
        TextColor3 = C.INK,
        BorderSizePixel = 0,
        ZIndex = 42,
    }, win)
    Corner(btn, UDim.new(0, 6))
    return btn
end

local applyBtn   = makeButton("👕 Mặc LOCAL", 126, C.GREEN)
local restoreBtn = makeButton("↩ Trả skin gốc", 152, C.PANEL2)
local saveBtn    = makeButton("💾 Lưu skin", 178, C.BLUE)
local autoBtn    = makeButton("⚡ Tự mặc khi vào", 204, C.YELLOW)
local listBtn    = makeButton("🗂 Danh sách skin", 230, C.PANEL2)
local accBtn     = makeButton("🧩 Phụ kiện: tất cả", 256, C.PANEL2)
local copyBtn    = makeButton("📋 Copy UserId", 282, C.PANEL2)
for _, btn in ipairs({ restoreBtn, listBtn, accBtn, copyBtn }) do
    btn.TextColor3 = C.TEXT
end

local statusLbl = New("TextLabel", {
    Size = UDim2.new(1, -24, 0, 34),
    Position = UDim2.new(0, 12, 0, 312),
    BackgroundTransparency = 1,
    Text = "Sẵn sàng.",
    Font = Enum.Font.GothamMedium,
    TextSize = 10,
    TextColor3 = C.MUTED,
    TextXAlignment = Enum.TextXAlignment.Left,
    TextYAlignment = Enum.TextYAlignment.Top,
    TextWrapped = true,
    ZIndex = 42,
}, win)

local function setStatus(text, color)
    statusLbl.Text = tostring(text or "")
    statusLbl.TextColor3 = color or C.MUTED
end

-- Overlay danh sách skin đã lưu
local listPanel = New("Frame", {
    Name = "SavedList",
    Size = UDim2.new(1, -24, 0, 214),
    Position = UDim2.new(0, 12, 0, 78),
    BackgroundColor3 = C.PANEL,
    BorderSizePixel = 0,
    Visible = false,
    ZIndex = 45,
}, win)
Corner(listPanel, UDim.new(0, 10))
Stroke(listPanel, C.BORDER, 1)

New("TextLabel", {
    Size = UDim2.new(1, -50, 0, 20),
    Position = UDim2.new(0, 10, 0, 4),
    BackgroundTransparency = 1,
    Text = "🗂 SKIN ĐÃ LƯU",
    Font = Enum.Font.GothamBold,
    TextSize = 11,
    TextColor3 = C.ACCENT,
    TextXAlignment = Enum.TextXAlignment.Left,
    ZIndex = 46,
}, listPanel)

local listClose = New("TextButton", {
    Size = UDim2.new(0, 24, 0, 18),
    Position = UDim2.new(1, -32, 0, 5),
    BackgroundColor3 = C.PANEL2,
    Text = "✕",
    Font = Enum.Font.GothamBold,
    TextSize = 11,
    TextColor3 = C.TEXT,
    BorderSizePixel = 0,
    ZIndex = 47,
}, listPanel)
Corner(listClose, UDim.new(0, 4))

local listFrame = New("ScrollingFrame", {
    Size = UDim2.new(1, -16, 0, 182),
    Position = UDim2.new(0, 8, 0, 26),
    BackgroundTransparency = 1,
    BorderSizePixel = 0,
    CanvasSize = UDim2.new(0, 0, 0, 0),
    ScrollBarThickness = 3,
    ZIndex = 46,
}, listPanel)

local refreshSavedList  -- forward declaration

local function showList(show)
    listPanel.Visible = show
    viewport.Visible = not show
    nameLbl.Visible = not show
    subLbl.Visible = not show
    applyBtn.Visible = not show
    restoreBtn.Visible = not show
    saveBtn.Visible = not show
    autoBtn.Visible = not show
    listBtn.Visible = not show
    accBtn.Visible = not show
    copyBtn.Visible = not show
    if show and refreshSavedList then refreshSavedList() end
end

refreshSavedList = function()
    for _, child in ipairs(listFrame:GetChildren()) do
        if child:IsA("GuiObject") then child:Destroy() end
    end

    if #State.savedList == 0 then
        New("TextLabel", {
            Size = UDim2.new(1, -12, 0, 36),
            Position = UDim2.new(0, 6, 0, 4),
            BackgroundTransparency = 1,
            Text = "Chưa lưu skin nào. Tra cứu rồi bấm 💾 Lưu skin.",
            Font = Enum.Font.GothamMedium,
            TextSize = 10,
            TextColor3 = C.MUTED,
            TextXAlignment = Enum.TextXAlignment.Left,
            TextWrapped = true,
            ZIndex = 47,
        }, listFrame)
        listFrame.CanvasSize = UDim2.new(0, 0, 0, 44)
        return
    end

    local y = 2
    for index, entry in ipairs(State.savedList) do
        local isAuto = tonumber(State.autoUseId) == tonumber(entry.id)
        local row = New("Frame", {
            Size = UDim2.new(1, -6, 0, 22),
            Position = UDim2.new(0, 2, 0, y),
            BackgroundColor3 = isAuto and C.PANEL2 or C.PANEL,
            BackgroundTransparency = 0.1,
            BorderSizePixel = 0,
            ZIndex = 47,
        }, listFrame)
        Corner(row, UDim.new(0, 5))

        New("TextLabel", {
            Size = UDim2.new(1, -130, 1, 0),
            Position = UDim2.new(0, 6, 0, 0),
            BackgroundTransparency = 1,
            Text = clip((isAuto and "⚡ " or "") .. tostring(entry.label or entry.name or entry.id), 36),
            Font = Enum.Font.GothamMedium,
            TextSize = 10,
            TextColor3 = isAuto and C.GREEN or C.TEXT,
            TextXAlignment = Enum.TextXAlignment.Left,
            ZIndex = 48,
        }, row)

        local useBtn = New("TextButton", {
            Size = UDim2.new(0, 46, 0, 16),
            Position = UDim2.new(1, -124, 0, 3),
            BackgroundColor3 = C.GREEN,
            Text = "▶ Mặc",
            Font = Enum.Font.GothamBold,
            TextSize = 9,
            TextColor3 = C.INK,
            BorderSizePixel = 0,
            ZIndex = 48,
        }, row)
        Corner(useBtn, UDim.new(0, 4))

        local autoRowBtn = New("TextButton", {
            Size = UDim2.new(0, 44, 0, 16),
            Position = UDim2.new(1, -74, 0, 3),
            BackgroundColor3 = isAuto and C.GREEN or C.YELLOW,
            Text = "⚡",
            Font = Enum.Font.GothamBold,
            TextSize = 9,
            TextColor3 = C.INK,
            BorderSizePixel = 0,
            ZIndex = 48,
        }, row)
        Corner(autoRowBtn, UDim.new(0, 4))

        local delBtn = New("TextButton", {
            Size = UDim2.new(0, 24, 0, 16),
            Position = UDim2.new(1, -26, 0, 3),
            BackgroundColor3 = C.RED,
            Text = "✕",
            Font = Enum.Font.GothamBold,
            TextSize = 9,
            TextColor3 = Color3.new(1, 1, 1),
            BorderSizePixel = 0,
            ZIndex = 48,
        }, row)
        Corner(delBtn, UDim.new(0, 4))

        useBtn.Activated:Connect(function()
            local ok, msg = applyLocal(entry)
            setStatus((ok and "✅ " or "⚠️ ") .. tostring(msg), ok and C.GREEN or C.RED)
            refreshSavedList()
        end)

        autoRowBtn.Activated:Connect(function()
            State.autoUseId = (tonumber(State.autoUseId) == tonumber(entry.id)) and nil or tonumber(entry.id)
            local ok, err = saveStore()
            autoBtn.Text = State.autoUseId and "⚡ Tự mặc: BẬT" or "⚡ Tự mặc khi vào"
            autoBtn.BackgroundColor3 = State.autoUseId and C.GREEN or C.YELLOW
            setStatus(ok and ("⚡ Tự mặc: " .. tostring(entry.label or entry.name))
                or ("⚠️ " .. tostring(err)), ok and C.GREEN or C.YELLOW)
            refreshSavedList()
        end)

        delBtn.Activated:Connect(function()
            table.remove(State.savedList, index)
            if tonumber(State.autoUseId) == tonumber(entry.id) then State.autoUseId = nil end
            saveStore()
            setStatus("🗑 Đã xoá " .. tostring(entry.label or entry.name), C.YELLOW)
            refreshSavedList()
        end)

        y = y + 26
    end
    listFrame.CanvasSize = UDim2.new(0, 0, 0, y + 4)
end

listClose.Activated:Connect(function() showList(false) end)

-- ============================================================================
-- 9. TRA CỨU
-- ============================================================================
local function showProfile(profile, desc)
    nameLbl.Text = "@" .. profile.name .. (profile.verified and "  ✔" or "")
    local lines = {}
    if profile.displayName ~= "" and profile.displayName ~= profile.name then
        lines[#lines + 1] = "Tên hiển thị: " .. profile.displayName
    end
    lines[#lines + 1] = "UserId: " .. tostring(profile.id)
    if profile.created ~= "" then
        lines[#lines + 1] = "Tạo: " .. clip(profile.created, 10)
    end
    subLbl.Text = table.concat(lines, "\n")

    if desc then
        local okView, err = showModel(desc)
        if not okView then setStatus("⚠️ Không dựng được 3D: " .. tostring(err), C.YELLOW) end
    else
        clearViewport()
    end
end

local function doLookup()
    local query = trim(input.Text)
    if query == "" then
        setStatus("⚠️ Chưa nhập tên hoặc UserId.", C.YELLOW)
        return
    end
    if listPanel.Visible then showList(false) end
    setStatus("⏳ Đang tra cứu " .. query .. "…", C.YELLOW)
    clearViewport()

    task.spawn(function()
        local userId, err = resolveUserId(query)
        if not userId then
            setStatus("⚠️ " .. tostring(err), C.RED)
            return
        end

        local profile = fetchProfile(userId)
        if not profile then
            profile = {
                id = userId,
                name = tostring(userId),
                displayName = "",
                description = "",
                created = "",
                verified = false,
            }
        end

        local desc = select(1, fetchDescription(userId))
        State.current = {
            id = userId,
            name = profile.name,
            displayName = profile.displayName,
            label = "@" .. tostring(profile.name),
            snap = snapshotDesc(desc),
            thumb = fetchThumbnail(userId),
        }
        State.removedAccs = {}

        showProfile(profile, desc)
        if desc then
            setStatus("✅ Đã tải " .. tostring(profile.name) .. " — bấm 👕 Mặc LOCAL để mặc.", C.GREEN)
        else
            setStatus("⚠️ Không lấy được trang phục (người chơi có thể đã tắt hiển thị).", C.YELLOW)
        end
    end)
end

-- ============================================================================
-- 10. NÚT BẤM
-- ============================================================================
local function releaseFocus()
    pcall(function()
        local focused = UserInputService:GetFocusedTextBox()
        if focused then focused:ReleaseFocus() end
    end)
end

searchBtn.Activated:Connect(function()
    releaseFocus()
    doLookup()
end)
input.FocusLost:Connect(function(enterPressed)
    if enterPressed then doLookup() end
end)

applyBtn.Activated:Connect(function()
    if not State.current then setStatus("⚠️ Hãy tra cứu trước.", C.YELLOW) return end
    local ok, msg = applyLocal(State.current)
    setStatus((ok and "✅ " or "⚠️ ") .. tostring(msg), ok and C.GREEN or C.RED)
end)

restoreBtn.Activated:Connect(function()
    local ok, msg = restoreSkin()
    setStatus((ok and "✅ " or "⚠️ ") .. tostring(msg), ok and C.GREEN or C.YELLOW)
end)

local function saveCurrent()
    if not State.current then return false, "hãy tra cứu trước" end
    local entry = {
        id = State.current.id,
        name = State.current.name,
        displayName = State.current.displayName,
        label = State.current.label,
        snap = State.current.snap,
        savedAt = os.date("%Y-%m-%d %H:%M"),
    }
    local existed = false
    for index, old in ipairs(State.savedList) do
        if tonumber(old.id) == tonumber(entry.id) then
            State.savedList[index] = entry
            existed = true
            break
        end
    end
    if not existed then table.insert(State.savedList, 1, entry) end
    return true, entry
end

saveBtn.Activated:Connect(function()
    local okSave, entryOrErr = saveCurrent()
    if not okSave then setStatus("⚠️ " .. tostring(entryOrErr), C.YELLOW) return end
    local okDisk, err = saveStore()
    if okDisk then
        setStatus("💾 Đã lưu " .. tostring(entryOrErr.label), C.GREEN)
    else
        setStatus("💾 Đã lưu (tạm): " .. tostring(entryOrErr.label) .. " · " .. tostring(err), C.YELLOW)
    end
    refreshSavedList()
    showList(true)
end)

autoBtn.Activated:Connect(function()
    if not State.current then setStatus("⚠️ Hãy tra cứu trước.", C.YELLOW) return end
    local id = tonumber(State.current.id)
    if tonumber(State.autoUseId) == id then
        State.autoUseId = nil
    else
        State.autoUseId = id
        if not findSavedById(id) then saveCurrent() end
    end
    local okDisk, err = saveStore()
    autoBtn.Text = State.autoUseId and "⚡ Tự mặc: BẬT" or "⚡ Tự mặc khi vào"
    autoBtn.BackgroundColor3 = State.autoUseId and C.GREEN or C.YELLOW
    setStatus(okDisk and "⚡ Đã cập nhật tự mặc."
        or ("⚡ Đã cập nhật (tạm) · " .. tostring(err)), okDisk and C.GREEN or C.YELLOW)
    refreshSavedList()
end)

listBtn.Activated:Connect(function()
    showList(true)
    setStatus("🗂 Chọn skin để mặc / đặt tự mặc / xoá.", C.MUTED)
end)

copyBtn.Activated:Connect(function()
    if not State.current then setStatus("⚠️ Hãy tra cứu trước.", C.YELLOW) return end
    local id = tostring(State.current.id)
    local done = false
    pcall(function()
        if type(setclipboard) == "function" then
            setclipboard(id)
            done = true
        end
    end)
    setStatus(done and ("📋 Đã copy UserId " .. id) or ("UserId: " .. id), done and C.GREEN or C.YELLOW)
end)

accBtn.Activated:Connect(function()
    if not State.current or type(State.current.snap) ~= "table" then
        setStatus("⚠️ Hãy tra cứu trước.", C.YELLOW)
        return
    end
    local accs = State.current.snap.accs or {}
    if #accs == 0 then
        setStatus("ℹ️ Người này không có phụ kiện trong HumanoidDescription.", C.MUTED)
        return
    end

    local allRemoved = true
    for _, item in ipairs(accs) do
        if not State.removedAccs[tonumber(item.AssetId)] then
            allRemoved = false
            break
        end
    end

    if allRemoved then
        State.removedAccs = {}
        accBtn.Text = "🧩 Phụ kiện: tất cả"
        setStatus("🧩 Đã khôi phục toàn bộ phụ kiện.", C.GREEN)
    else
        for _, item in ipairs(accs) do
            State.removedAccs[tonumber(item.AssetId)] = true
        end
        accBtn.Text = "🧩 Phụ kiện: đã bỏ hết"
        setStatus("🧩 Sẽ bỏ " .. #accs .. " phụ kiện khi mặc. Bấm lần nữa để khôi phục.", C.YELLOW)
    end
end)

-- Mở/đóng cửa sổ
local function toggleWindow()
    win.Visible = not win.Visible
    if not win.Visible then releaseFocus() end
end

minBtn.Visible = false
closeBtn.Activated:Connect(function()
    releaseFocus()
    if PT and PT.closeShell then PT.closeShell() end
end)

-- (kéo cửa sổ do khung chung đảm nhiệm)

-- Xoay mô hình 3D
local viewDragging, viewDragStart = false, nil
track(viewport.InputBegan:Connect(function(inputObject)
    if inputObject.UserInputType == Enum.UserInputType.MouseButton1
        or inputObject.UserInputType == Enum.UserInputType.Touch then
        viewDragging = true
        viewDragStart = inputObject.Position
        view.auto = false
    end
end))
track(UserInputService.InputChanged:Connect(function(inputObject)
    if not viewDragging then return end
    if inputObject.UserInputType ~= Enum.UserInputType.MouseMovement
        and inputObject.UserInputType ~= Enum.UserInputType.Touch then return end
    local delta = inputObject.Position - viewDragStart
    viewDragStart = inputObject.Position
    view.yaw = view.yaw - delta.X * 0.01
    view.pitch = math.clamp(view.pitch + delta.Y * 0.005, -0.5, 1.1)
    renderViewport()
end))
track(UserInputService.InputEnded:Connect(function(inputObject)
    if inputObject.UserInputType == Enum.UserInputType.MouseButton1
        or inputObject.UserInputType == Enum.UserInputType.Touch then
        viewDragging = false
    end
end))

track(RunService.RenderStepped:Connect(function(dt)
    if not win.Visible or not view.model or not view.auto then return end
    view.yaw = view.yaw + dt * 0.5
    renderViewport()
end))

-- ============================================================================
-- 11. KHỞI ĐỘNG
-- ============================================================================
loadStore()
if State.autoUseId then
    autoBtn.Text = "⚡ Tự mặc: BẬT"
    autoBtn.BackgroundColor3 = C.GREEN
end

win.Visible = true

task.spawn(function()
    if not State.autoUseId then return end
    local entry = findSavedById(State.autoUseId)
    if not entry then return end
    if not player.Character then player.CharacterAdded:Wait() end
    task.wait(1.5)
    local ok, msg = applyLocal(entry)
    setStatus(ok and ("⚡ Tự mặc: " .. tostring(msg)) or ("⚠️ Tự mặc lỗi: " .. tostring(msg)),
        ok and C.GREEN or C.YELLOW)
end)

print("[PlayerTools] tab Trang phục sẵn sàng · lưu tại " .. SAVE_FILE ..
    (canUseDisk() and "" or " (executor không có writefile: chỉ giữ trong phiên)"))

PT.outfitWin = win
    end)
    if not ok1 then
        pcall(function() warn("[PlayerTools] Tab TRANG PHỤC lỗi: " .. tostring(err1)) end)
    end
end

-- ============================================================================
-- TAB 2/2 — LẤY MÃ SERVER NGƯỜI CHƠI  (nguồn: server-code.lua)
-- ============================================================================
do
    local ok2, err2 = pcall(function()
local S = {}

-- ============================================================================
-- 1. CẤU HÌNH
-- ============================================================================
S.ScanPages = 150
S.CustomPlaces = {}

-- UniverseId -> danh sách place của cùng một game nhiều place.
S.KnownPlaces = {
    [994732206] = { 2753915549, 4442272183, 7449423635 },  -- Blox Fruits: Sea 1 / Sea 2 / Sea 3
    [3652625463] = { 9872472334, 10324346056, 10324347967, 10662542523, 10808838353, 11353528705 }, -- Evade
}

S._jobPlaceCache = {}
S._jobMetaCache = {}
S._scanToken = 0

-- ============================================================================
-- 2. HTTP + JSON
-- ============================================================================
function S.Encode(t)
    local ok, s = pcall(function() return HttpService:JSONEncode(t) end)
    return ok and s or nil
end

function S.Http(method, url, body)
    local fn
    if type(syn) == "table" and type(syn.request) == "function" then fn = syn.request
    elseif type(http) == "table" and type(http.request) == "function" then fn = http.request
    elseif type(fluxus) == "table" and type(fluxus.request) == "function" then fn = fluxus.request
    elseif type(kg) == "table" and type(kg.request) == "function" then fn = kg.request
    elseif type(request) == "function" then fn = request
    elseif type(http_request) == "function" then fn = http_request
    end

    if fn then
        local ok, res = pcall(fn, { Url = url, Method = method, Headers = { ["Content-Type"] = "application/json" }, Body = body })
        if ok and type(res) == "table" then
            local code = tonumber(res.StatusCode) or 200
            local okD, data = pcall(function() return HttpService:JSONDecode(res.Body or "") end)
            if okD then return data, nil end
            if code >= 400 then return nil, "HTTP " .. tostring(code) end
            return nil, "không đọc được JSON"
        end
        return nil, "request lỗi"
    end

    local okR, data = pcall(function()
        if method == "POST" then
            local r = game:HttpPost(url, tostring(body or "{}"), "application/json")
            return HttpService:JSONDecode(r)
        end
        return HttpService:JSONDecode(game:HttpGet(url))
    end)
    if okR then return data, nil end
    return nil, "http lỗi"
end

-- chuỗi số nguyên cho URL (tránh "123.0" khi số là float)
local function placeStr(p)
    p = tonumber(p)
    if not p then return "0" end
    local ok, sFmt = pcall(string.format, "%.0f", p)
    return (ok and sFmt) or tostring(p)
end

-- ============================================================================
-- 3. NGƯỜI CHƠI / HỒ SƠ / PRESENCE
-- ============================================================================
function S.ResolveUser(q)
    q = tostring(q or ""):gsub("^%s+", ""):gsub("%s+$", ""):gsub("^@", "")
    if q == "" then return nil, "chưa nhập tên hoặc UserId" end
    local num = q:match("^(%d+)$")
    if num then
        num = tonumber(num)
        if num and num > 0 then return num, nil end
    end
    if #q < 3 or #q > 20 or not q:match("^[%w_]+$") then
        return nil, "tên không hợp lệ (3–20 ký tự: chữ, số, _)"
    end
    local data = S.Http("POST", "https://users.roblox.com/v1/usernames/users", S.Encode({ usernames = { q }, excludeBannedUsers = false }))
    local first = type(data) == "table" and type(data.data) == "table" and data.data[1] or nil
    if type(first) == "table" and tonumber(first.id) then return tonumber(first.id), nil end
    local okN, userId = pcall(function() return Players:GetUserIdFromNameAsync(q) end)
    if okN and tonumber(userId) then return tonumber(userId), nil end
    return nil, "không tìm thấy người chơi " .. q
end

function S.FetchProfile(id)
    local data = S.Http("GET", "https://users.roblox.com/v1/users/" .. tostring(id))
    if type(data) == "table" and tonumber(data.id) then return data end
    local okN, nm = pcall(function() return Players:GetNameFromUserIdAsync(id) end)
    if okN and type(nm) == "string" and nm ~= "" then
        return { id = tonumber(id), name = nm, displayName = nm, description = "", created = "" }
    end
    return nil
end

function S.GetFriendPresence(id)
    id = tonumber(id)
    if not id then return nil end
    local okF, list = pcall(function() return player:GetFriendsOnline(200) end)
    if okF and type(list) == "table" then
        for _, f in ipairs(list) do
            if type(f) == "table" and tonumber(f.VisitorId) == id then
                local hasGame = (tonumber(f.PlaceId) ~= nil) or (type(f.GameId) == "string" and f.GameId ~= "") or (tonumber(f.LocationType) == 4)
                return {
                    userPresenceType = hasGame and 2 or (f.IsOnline and 1 or 0),
                    placeId = tonumber(f.PlaceId), rootPlaceId = tonumber(f.PlaceId),
                    gameId = (type(f.GameId) == "string" and f.GameId ~= "") and f.GameId or nil,
                    lastLocation = tostring(f.LastLocation or ""),
                }
            end
        end
    end
    return nil
end

function S.InThisServer(id, p)
    id = tonumber(id)
    if not id then return false end
    local okP, inst = pcall(function() return Players:GetPlayerByUserId(id) end)
    if okP and inst then return true end
    local okL, list = pcall(function() return Players:GetPlayers() end)
    if okL and type(list) == "table" then
        for _, plr in ipairs(list) do
            if tonumber(plr.UserId) == id then return true end
        end
    end
    if type(p) == "table" and type(p.gameId) == "string" and p.gameId ~= "" and tostring(game.JobId or "") ~= "" and p.gameId == tostring(game.JobId) then
        return true
    end
    return false
end

function S.FetchPresence(id)
    local fPres = S.GetFriendPresence(id)
    local data = S.Http("POST", "https://presence.roblox.com/v1/presence/users", S.Encode({ userIds = { id } }))
    local p = type(data) == "table" and type(data.userPresences) == "table" and data.userPresences[1] or nil
    if type(p) ~= "table" then p = fPres end
    if type(p) == "table" and type(fPres) == "table" then
        if (not p.gameId or p.gameId == "") and fPres.gameId then p.gameId = fPres.gameId end
        if not p.placeId and fPres.placeId then p.placeId = fPres.placeId p.rootPlaceId = p.rootPlaceId or fPres.rootPlaceId end
        if (tonumber(p.userPresenceType) or 0) == 0 and (tonumber(fPres.userPresenceType) or 0) > 0 then p.userPresenceType = fPres.userPresenceType end
        p.lastLocation = (p.lastLocation and p.lastLocation ~= "") and p.lastLocation or fPres.lastLocation
    end
    if S.InThisServer(id, p) then
        p = type(p) == "table" and p or {}
        p.userPresenceType = 2
        if tostring(game.JobId or "") ~= "" then p.gameId = tostring(game.JobId) end
        if tonumber(game.PlaceId) then p.placeId = tonumber(game.PlaceId) end
    end
    return p
end

function S.PresenceText(p)
    if type(p) ~= "table" then return "❔ không rõ" end
    local t = tonumber(p.userPresenceType) or 0
    local text = (t == 2 and "🎮 đang trong game") or (t == 1 and "🌐 online (sảnh/web)") or (t == 3 and "🛠 Roblox Studio") or "⚫ offline"
    if t == 2 and type(p.lastLocation) == "string" and p.lastLocation ~= "" then text = text .. " · " .. p.lastLocation end
    return text
end

-- ============================================================================
-- 4. UNIVERSE / PLACE
-- ============================================================================
function S.PlacesOf(univId, placeId)
    local set = S.KnownPlaces[tonumber(univId) or 0]
    if type(set) ~= "table" then
        local cand = tonumber(placeId)
        if not cand and (not univId or tonumber(univId) == 0) then cand = tonumber(game.PlaceId) end
        for _, s2 in pairs(S.KnownPlaces) do
            for _, p2 in ipairs(s2) do if tonumber(p2) == cand then set = s2 break end end
            if type(set) == "table" then break end
        end
    end
    local out = {}
    if type(set) == "table" then
        for _, p3 in ipairs(set) do out[#out + 1] = tonumber(p3) end
    end
    return out
end

function S.SameGame(univA, univB, placeId)
    if not univA or not univB then return false end
    if tonumber(univA) == tonumber(univB) then return true end
    local setA, setB = S.PlacesOf(univA, placeId), S.PlacesOf(univB, placeId)
    if #setA == 0 or #setB == 0 then return false end
    for _, a in ipairs(setA) do
        for _, b in ipairs(setB) do if tonumber(a) == tonumber(b) then return true end end
    end
    return false
end

function S.GetUniversePlaces(univId, primaryPlaceId)
    local out, seen = {}, {}
    local function addP(p)
        p = tonumber(p)
        if p and p > 0 and not seen[p] then seen[p] = true out[#out + 1] = p end
    end

    addP(primaryPlaceId) addP(game.PlaceId)

    pcall(function()
        local as = game:GetService("AssetService")
        if as and type(as.GetGamePlacesAsync) == "function" then
            local pages = as:GetGamePlacesAsync()
            for _ = 1, 5 do
                if not pages then break end
                local list = pages:GetCurrentPage()
                if type(list) == "table" then
                    for _, info in ipairs(list) do
                        if type(info) == "table" then addP(info.PlaceId or info.id) end
                    end
                end
                if pages.IsFinished then break end
                if not pcall(function() pages:AdvanceToNextPageAsync() end) then break end
            end
        end
    end)

    univId = tonumber(univId) or tonumber(game.GameId)
    if (not univId or univId <= 0) and out[1] then
        local uRes = S.Http("GET", "https://apis.roblox.com/universes/v1/places/" .. placeStr(out[1]) .. "/universe")
        if type(uRes) == "table" and tonumber(uRes.universeId) then univId = tonumber(uRes.universeId) end
    end

    if univId and univId > 0 then
        local gData = S.Http("GET", "https://games.roblox.com/v1/games?universeIds=" .. placeStr(univId))
        local gEntry = type(gData) == "table" and type(gData.data) == "table" and gData.data[1] or nil
        if type(gEntry) == "table" and tonumber(gEntry.rootPlaceId) then addP(gEntry.rootPlaceId) end
        local uData = S.Http("GET", "https://develop.roblox.com/v1/universes/" .. placeStr(univId) .. "/places?limit=50")
        local uPlaces = type(uData) == "table" and type(uData.data) == "table" and uData.data or nil
        if type(uPlaces) == "table" then
            for _, pl in ipairs(uPlaces) do if type(pl) == "table" then addP(pl.id or pl.PlaceId) end end
        end
    end

    if type(S.CustomPlaces) == "table" then
        for _, cp in ipairs(S.CustomPlaces) do addP(cp) end
    end
    for _, kp in ipairs(S.PlacesOf(univId, primaryPlaceId)) do addP(kp) end

    while #out > 12 do table.remove(out) end
    return out
end

-- ============================================================================
-- 5. CỔNG KIỂM TRA: người chơi có đang chơi game này không?
-- ============================================================================
function S.CheckPlayerIsPlaying(id, pres)
    id = tonumber(id)
    if not id or id <= 0 then return false, "UserId không hợp lệ" end
    if S.InThisServer(id, pres) then return true, nil end

    local fPres = S.GetFriendPresence(id)
    if type(fPres) == "table" and (tonumber(fPres.userPresenceType) == 2 or (type(fPres.gameId) == "string" and fPres.gameId ~= "")) then
        return true, nil
    end

    if type(pres) ~= "table" then pres = S.FetchPresence(id) end
    if type(pres) == "table" then
        local pType = tonumber(pres.userPresenceType) or 0
        local hasGameId = type(pres.gameId) == "string" and pres.gameId ~= ""
        if pType ~= 2 and not hasGameId then
            local isFriend = false
            pcall(function() isFriend = (player:IsFriendsWith(id) == true) end)
            if not isFriend and type(fPres) ~= "table" then
                return true, nil, true  -- Roblox ẩn presence với người lạ → vẫn quét
            end
            local stTxt = (pType == 1 and "đang online ngoài game") or (pType == 3 and "đang trong Studio") or "đang offline"
            return false, "Người chơi hiện " .. stTxt .. " — không tìm được server"
        end
        local myUniv, pUniv = tonumber(game.GameId), tonumber(pres.universeId)
        if myUniv and myUniv > 0 and pUniv and pUniv > 0 and pUniv ~= myUniv
            and not S.SameGame(myUniv, pUniv, tonumber(pres.placeId) or tonumber(pres.rootPlaceId)) then
            return false, "Người chơi đang chơi game khác — không tìm được server"
        end
        local myPlace = tonumber(game.PlaceId)
        local pPlace = tonumber(pres.placeId) or tonumber(pres.rootPlaceId)
        if pPlace and pPlace > 0 and myPlace and myPlace > 0 and pPlace ~= myPlace then
            local inMyUniv = false
            for _, ap in ipairs(S.GetUniversePlaces(myUniv, myPlace)) do
                if tonumber(ap) == pPlace then inMyUniv = true break end
            end
            if not inMyUniv then
                return false, "Người chơi đang ở game khác (PlaceId " .. tostring(pPlace) .. ") — không tìm được server"
            end
        end
        return true, nil
    end
    return true, nil, true
end

-- ============================================================================
-- 6. ẢNH ĐẠI DIỆN → KEY SO KHỚP
-- ============================================================================
local function normalizeThumbKey(u)
    if type(u) ~= "string" or u == "" then return nil end
    local hex32 = u:match("(%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x)")
    if hex32 and hex32 ~= "" then return hex32:lower() end
    local seg1 = u:match("rbxcdn%.com/([^/%?]+)")
    if seg1 and seg1 ~= "" then
        local hash = seg1:match("AvatarHeadshot%-([%w_%-]+)")
        if hash and hash ~= "" then
            hash = hash:gsub("%-[Pp][Nn][Gg]$", ""):gsub("%-[Ww][Ee][Bb][Pp]$", ""):gsub("%-[Jj][Pp][Ee]?[Gg]$", "")
            return hash:lower()
        end
        seg1 = seg1:gsub("%-[Pp][Nn][Gg]$", ""):gsub("%-[Ww][Ee][Bb][Pp]$", ""):gsub("%-[Jj][Pp][Ee]?[Gg]$", "")
        return seg1:lower()
    end
    return u:lower()
end

function S.FetchTargetHeadshotKeys(id)
    local keys, count, firstUrl = {}, 0, nil
    local function addUrl(u)
        if type(u) ~= "string" or u == "" then return end
        if not firstUrl then firstUrl = u end
        local k = normalizeThumbKey(u)
        if k and k ~= "" and not keys[k] then keys[k] = true count = count + 1 end
        local seg = u:match("rbxcdn%.com/([^/%?]+)")
        if seg and seg ~= "" then keys[seg:lower()] = true end
        local full = u:match("rbxcdn%.com/([^%?]+)")
        if full and full ~= "" then keys[full:lower()] = true end
    end

    local data = S.Http("GET", "https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=" .. tostring(id) .. "&size=150x150&format=Png&isCircular=false")
    local e = type(data) == "table" and type(data.data) == "table" and data.data[1] or nil
    if type(e) == "table" and type(e.imageUrl) == "string" and e.imageUrl ~= "" then addUrl(e.imageUrl) end

    local bData = S.Http("POST", "https://thumbnails.roblox.com/v1/batch", S.Encode({
        { requestId = "t_png:" .. tostring(id), targetId = tonumber(id), type = "AvatarHeadShot", size = "150x150", format = "Png", isCircular = false },
        { requestId = "t_webp:" .. tostring(id), targetId = tonumber(id), type = "AvatarHeadShot", size = "150x150", format = "Webp", isCircular = false },
    }))
    if type(bData) == "table" and type(bData.data) == "table" then
        for _, be in ipairs(bData.data) do
            if type(be) == "table" and type(be.imageUrl) == "string" and be.imageUrl ~= "" then addUrl(be.imageUrl) end
        end
    end
    return keys, firstUrl, count
end

-- ============================================================================
-- 7. QUÉT SERVER CÔNG KHAI
-- ============================================================================
-- Roblox có đợt trả data rỗng khi limit=100 (báo lỗi 9/2025) → tự hạ 100→50→25→10
-- và nhớ mức đang chạy được. excludeFullGames=false là BẮT BUỘC với Blox Fruits
-- (server 12/12 luôn đầy, lọc full là mất sạch danh sách).
S._serverLimit = 0

function S.FetchServersPage(placeId, cursor, order)
    order = tostring(order or "Desc")
    local qCur = (type(cursor) == "string" and cursor ~= "") and ("&cursor=" .. tostring(cursor)) or ""
    local want = tonumber(S._serverLimit) or 0
    local limits = { 100, 50, 25, 10 }
    if want > 0 and want ~= 100 then
        local tmp = { want }
        for _, l in ipairs(limits) do if l ~= want then tmp[#tmp + 1] = l end end
        limits = tmp
    end
    for _, lim in ipairs(limits) do
        local url = "https://games.roblox.com/v1/games/" .. placeStr(placeId) .. "/servers/Public?sortOrder=" .. order
            .. "&limit=" .. tostring(lim) .. "&excludeFullGames=false" .. qCur
        local gotEmpty = false
        for attempt = 1, 3 do
            local data, err = S.Http("GET", url)
            if type(data) == "table" and type(data.data) == "table" then
                if #data.data > 0 then
                    if S._serverLimit ~= lim then S._serverLimit = lim end
                    return data.data, data.nextPageCursor
                end
                if qCur ~= "" then return data.data, data.nextPageCursor end
                gotEmpty = true
                break
            end
            if tostring(err or ""):find("429") then
                task.wait(0.45 * attempt)
            else
                break
            end
        end
        if not gotEmpty then return nil, nil end
    end
    return {}, nil
end

-- Trả về: jobId, placeId, nguồn, meta, tên người chơi cùng server, thông báo lỗi, thống kê
function S.FindPlayerServer(id, targetPlaceId, onProgress, maxPages, cachedPres)
    id = tonumber(id)
    if not id or id <= 0 then return nil, nil, nil, nil, nil, "UserId không hợp lệ" end

    if S.InThisServer(id, nil) and tostring(game.JobId or "") ~= "" then
        local pId = tonumber(game.PlaceId)
        S._jobPlaceCache[tostring(game.JobId)] = pId
        return tostring(game.JobId), pId, "same_server", nil, nil, nil
    end

    local fPres = S.GetFriendPresence(id)
    if type(fPres) == "table" and type(fPres.gameId) == "string" and fPres.gameId ~= "" then
        local pId = tonumber(fPres.placeId) or tonumber(targetPlaceId) or tonumber(game.PlaceId)
        S._jobPlaceCache[tostring(fPres.gameId)] = pId
        return tostring(fPres.gameId), pId, "friend_online", nil, nil, nil
    end

    local okTp, curInst, _, tpPlaceId, tpJobId = pcall(function() return TeleportService:GetPlayerPlaceInstanceAsync(id) end)
    if okTp and curInst == true and tostring(game.JobId or "") ~= "" then
        return tostring(game.JobId), tonumber(game.PlaceId), "teleport_service", nil, nil, nil
    elseif okTp and type(tpJobId) == "string" and tpJobId ~= "" then
        local pId = tonumber(tpPlaceId) or tonumber(targetPlaceId) or tonumber(game.PlaceId)
        S._jobPlaceCache[tostring(tpJobId)] = pId
        return tostring(tpJobId), pId, "teleport_service", nil, nil, nil
    end

    local pres = type(cachedPres) == "table" and cachedPres or S.FetchPresence(id)
    S.lastScanStats = nil
    local isPlaying, notPlayMsg, presUnknown = S.CheckPlayerIsPlaying(id, pres)
    local unknownPresence = (presUnknown == true)
    if not isPlaying and not unknownPresence then
        return nil, nil, nil, nil, nil, notPlayMsg
    end

    if type(pres) == "table" and type(pres.gameId) == "string" and pres.gameId ~= "" then
        local pId = tonumber(pres.placeId) or tonumber(pres.rootPlaceId) or tonumber(targetPlaceId) or tonumber(game.PlaceId)
        S._jobPlaceCache[tostring(pres.gameId)] = pId
        return tostring(pres.gameId), pId, "presence", nil, nil, nil
    end

    local scanPlaceId = tonumber(targetPlaceId)
        or (type(pres) == "table" and (tonumber(pres.placeId) or tonumber(pres.rootPlaceId)))
        or tonumber(game.PlaceId)
    if not scanPlaceId or scanPlaceId <= 0 then return nil, nil, nil, nil, nil, "không xác định được place" end

    local targetKeys = S.FetchTargetHeadshotKeys(id)
    local function matchesThumb(imgUrl, keyTable)
        local kt = keyTable or targetKeys
        if type(imgUrl) ~= "string" or imgUrl == "" then return nil end
        local k = normalizeThumbKey(imgUrl)
        if k and kt[k] then return kt[k] end
        local seg = imgUrl:match("rbxcdn%.com/([^/%?]+)")
        if seg then
            if kt[seg:lower()] then return kt[seg:lower()] end
            local ah = seg:match("AvatarHeadshot%-([%w_%-]+)")
            if ah then
                ah = ah:gsub("%-[Pp][Nn][Gg]$", ""):gsub("%-[Ww][Ee][Bb][Pp]$", ""):gsub("%-[Jj][Pp][Ee]?[Gg]$", ""):lower()
                if kt[ah] then return kt[ah] end
            end
        end
        local fp = imgUrl:match("rbxcdn%.com/([^%?]+)")
        if fp and kt[fp:lower()] then return kt[fp:lower()] end
        return nil
    end

    -- Chống rate-limit: lấy key ảnh đại diện của mục tiêu, thử lại 3 lần.
    do
        local kc = 0
        if type(targetKeys) == "table" then for _k in pairs(targetKeys) do kc = kc + 1 end end
        local tkTry = 0
        while kc <= 0 and tkTry < 3 do
            tkTry = tkTry + 1 task.wait(0.7 * tkTry)
            local k2, _u2, c2 = S.FetchTargetHeadshotKeys(id)
            if type(k2) == "table" then targetKeys = k2 end
            kc = tonumber(c2) or 0
        end
        S.lastThumbBlocked = (kc <= 0)
        if S.lastThumbBlocked then
            return nil, scanPlaceId, nil, nil, nil, "Roblox đang chặn ảnh đại diện (rate-limit) — thử lại sau 1–2 phút"
        end
    end

    local placeStates = {}
    local scannedTokenThumbs = {}
    local scannedTokenIds = {}
    local tokSeq = 0

    local function recordScannedThumb(imgUrl, rSid, pId, meta)
        if type(imgUrl) ~= "string" or imgUrl == "" or not rSid then return end
        local entry = { sid = rSid, pId = pId, meta = meta }
        local k = normalizeThumbKey(imgUrl)
        if k and k ~= "" and not scannedTokenThumbs[k] then scannedTokenThumbs[k] = entry end
        local seg = imgUrl:match("rbxcdn%.com/([^/%?]+)")
        if seg and seg ~= "" then scannedTokenThumbs[seg:lower()] = scannedTokenThumbs[seg:lower()] or entry end
    end

    local function getPlaceState(pId)
        if not placeStates[pId] then
            placeStates[pId] = { curDesc = "", curAsc = "", doneDesc = false, doneAsc = false, seenSid = {}, pages = 0 }
        end
        return placeStates[pId]
    end

    -- quét `stepPages` trang cho 1 place. coKeyMap/coIdMap: bạn chơi cùng (có thể nil).
    local function scanPlaceSteps(pId, stepPages, coKeyMap, coIdMap)
        local st = getPlaceState(pId)
        local steps = 0
        while steps < stepPages and (not st.doneDesc or not st.doneAsc) do
            for _, mode in ipairs({ "Desc", "Asc" }) do
                if steps >= stepPages then break end
                if (mode == "Desc" and not st.doneDesc) or (mode == "Asc" and not st.doneAsc) then
                    local cur = (mode == "Desc") and st.curDesc or st.curAsc
                    local list, nextCur = S.FetchServersPage(pId, cur, mode)
                    if type(list) ~= "table" or #list == 0 then
                        if mode == "Desc" then st.doneDesc = true else st.doneAsc = true end
                    else
                        steps = steps + 1 st.pages = st.pages + 1
                        if type(onProgress) == "function" then pcall(onProgress, st.pages, #list, mode, pId) end
                        local batch, reqMap, metaMap = {}, {}, {}
                        local pageSeen, pageOcc = 0, 0
                        for _, sv in ipairs(list) do
                            local sid = type(sv) == "table" and sv.id and tostring(sv.id) or nil
                            if sid and sid ~= "" and not st.seenSid[sid] then
                                st.seenSid[sid] = true
                                pageSeen = pageSeen + 1
                                if (type(sv.playerIds) == "table" and #sv.playerIds > 0)
                                    or (type(sv.players) == "table" and #sv.players > 0)
                                    or (type(sv.playerTokens) == "table" and #sv.playerTokens > 0) then
                                    pageOcc = pageOcc + 1
                                end
                                local svMeta = { placeId = pId, playing = tonumber(sv.playing) or 0, maxPlayers = tonumber(sv.maxPlayers) or 0 }
                                metaMap[sid] = svMeta
                                S._jobPlaceCache[sid] = pId
                                S._jobMetaCache[sid] = svMeta

                                if type(sv.playerIds) == "table" then
                                    for _, pid in ipairs(sv.playerIds) do
                                        local npid = tonumber(pid)
                                        if npid then
                                            scannedTokenIds[npid] = { sid = sid, pId = pId, meta = svMeta }
                                            if npid == id then return sid, pId, "playerIds", svMeta, nil end
                                            if coIdMap and coIdMap[npid] then
                                                return sid, pId, "co_player:@" .. tostring(coIdMap[npid].name), svMeta, tostring(coIdMap[npid].name)
                                            end
                                        end
                                    end
                                end

                                if type(sv.players) == "table" then
                                    for _, pl in ipairs(sv.players) do
                                        local npl = tonumber(pl) or (type(pl) == "table" and (tonumber(pl.id) or tonumber(pl.userId))) or nil
                                        if npl and npl > 0 then
                                            scannedTokenIds[npl] = { sid = sid, pId = pId, meta = svMeta }
                                            if npl == id then return sid, pId, "players", svMeta, nil end
                                            if coIdMap and coIdMap[npl] then
                                                return sid, pId, "co_player:@" .. tostring(coIdMap[npl].name), svMeta, tostring(coIdMap[npl].name)
                                            end
                                        end
                                    end
                                end

                                if type(sv.playerTokens) == "table" then
                                    for _, tok in ipairs(sv.playerTokens) do
                                        if type(tok) == "string" and tok ~= "" then
                                            if tok == tostring(id) or tok == ("token_" .. tostring(id)) then
                                                return sid, pId, "token_direct", svMeta, nil
                                            end
                                            tokSeq = tokSeq + 1
                                            local reqId = tostring(sid) .. ":" .. tostring(tokSeq)
                                            reqMap[reqId] = sid
                                            batch[#batch + 1] = {
                                                requestId = reqId, targetId = 0, token = tok,
                                                type = "AvatarHeadShot", size = "150x150", format = "Png", isCircular = false,
                                            }
                                        end
                                    end
                                end
                            end
                        end

                        -- Roblox chỉ trả JobId mà KHÔNG trả players/playerTokens
                        -- (Blox Fruits luôn vậy, và API còn ẩn với request chưa đăng nhập)
                        -- → không thể so ảnh đại diện. Dừng place này ngay, đừng quét
                        -- hàng trăm trang vô ích.
                        if pageSeen > 0 and pageOcc == 0 then
                            st.blind = (tonumber(st.blind) or 0) + 1
                            st.doneDesc, st.doneAsc = true, true
                            return nil, pId, nil, nil, nil
                        end

                        if #batch > 0 then
                            local chunks = {}
                            for startIdx = 1, #batch, 100 do
                                local chunk = {}
                                for k = startIdx, math.min(#batch, startIdx + 99) do chunk[#chunk + 1] = batch[k] end
                                chunks[#chunks + 1] = chunk
                            end
                            local foundSid, foundSrc, foundCoName = nil, nil, nil
                            for wStart = 1, #chunks, 3 do
                                if foundSid then break end
                                local pending = 0
                                for cIdx = wStart, math.min(#chunks, wStart + 2) do
                                    local chunk = chunks[cIdx]
                                    pending = pending + 1
                                    task.spawn(function()
                                        local bRes = nil
                                        for bTry = 1, 3 do
                                            bRes = S.Http("POST", "https://thumbnails.roblox.com/v1/batch", S.Encode(chunk))
                                            if type(bRes) == "table" and type(bRes.data) == "table" then break end
                                            if bTry < 3 then task.wait(0.7 * bTry + (cIdx % 3) * 0.1) end
                                        end
                                        local items = type(bRes) == "table" and type(bRes.data) == "table" and bRes.data or nil
                                        if type(items) == "table" then
                                            for idx, it in ipairs(items) do
                                                if type(it) == "table" then
                                                    local rawReq = (type(it.requestId) == "string" and it.requestId ~= "" and it.requestId) or (chunk[idx] and chunk[idx].requestId) or nil
                                                    local rSid = (rawReq and reqMap[rawReq]) or (type(rawReq) == "string" and rawReq:match("^([^:]+)")) or nil
                                                    if rSid and rSid ~= "" then
                                                        recordScannedThumb(it.imageUrl, rSid, pId, metaMap[rSid])
                                                        local tid = tonumber(it.targetId)
                                                        if tid and tid > 0 then scannedTokenIds[tid] = { sid = rSid, pId = pId, meta = metaMap[rSid] } end
                                                        if not foundSid then
                                                            if tid == id then foundSid, foundSrc = rSid, "batch_targetId" break end
                                                            if matchesThumb(it.imageUrl, targetKeys) then foundSid, foundSrc = rSid, "batch_thumb" break end
                                                            if coIdMap and tid and coIdMap[tid] then
                                                                foundSid, foundSrc, foundCoName = rSid, "co_player:@" .. tostring(coIdMap[tid].name), tostring(coIdMap[tid].name) break
                                                            end
                                                            if coKeyMap then
                                                                local coHit = matchesThumb(it.imageUrl, coKeyMap)
                                                                if type(coHit) == "table" then
                                                                    foundSid, foundSrc, foundCoName = rSid, "co_player:@" .. tostring(coHit.name), tostring(coHit.name) break
                                                                end
                                                            end
                                                        end
                                                    end
                                                end
                                            end
                                        end
                                        pending = pending - 1
                                    end)
                                end
                                local waitTicks = 0
                                while pending > 0 and not foundSid and waitTicks < 240 do
                                    waitTicks = waitTicks + 1 task.wait(0.025)
                                end
                                if foundSid then
                                    return foundSid, pId, foundSrc or "batch_thumb", metaMap[foundSid], foundCoName
                                end
                            end
                        end

                        if type(nextCur) == "string" and nextCur ~= "" then
                            if mode == "Desc" then st.curDesc = nextCur else st.curAsc = nextCur end
                        else
                            if mode == "Desc" then st.doneDesc = true else st.doneAsc = true end
                        end
                    end
                end
            end
        end
        return nil, pId, nil, nil, nil
    end

    local univId = (type(pres) == "table" and tonumber(pres.universeId)) or tonumber(game.GameId)
    local allPlaces = S.GetUniversePlaces(univId, scanPlaceId)
    local placeSet = {}
    for _, ap in ipairs(allPlaces) do placeSet[ap] = true end

    local totalPages = tonumber(maxPages) or tonumber(S.ScanPages) or 150
    local placeList, placeSeen = {}, {}
    for _, ap in ipairs(allPlaces) do
        local np = tonumber(ap)
        if np and np > 0 and not placeSeen[np] then placeSeen[np] = true placeList[#placeList + 1] = np end
    end
    if #placeList == 0 then placeList = { scanPlaceId } end
    local perPlace = math.max(8, math.floor(totalPages / math.max(1, #placeList)))

    for _round = 1, 3 do
        local anyLeft = false
        for _, pId2 in ipairs(placeList) do
            local st2 = getPlaceState(pId2)
            if not (st2.doneDesc and st2.doneAsc) then
                anyLeft = true
                local rSid, rPl, rSrc, rMeta, rCo = scanPlaceSteps(pId2, perPlace)
                if rSid and rSid ~= "" then return rSid, rPl, rSrc, rMeta, rCo end
            end
        end
        if not anyLeft then break end
    end

    do
        local statServers, statPages, blindCount = 0, 0, 0
        for _, pId3 in ipairs(placeList) do
            local st3 = placeStates[pId3]
            if st3 then
                statPages = statPages + (tonumber(st3.pages) or 0)
                for _sid in pairs(st3.seenSid or {}) do statServers = statServers + 1 end
                if st3.blind then blindCount = blindCount + 1 end
            end
        end
        S.lastScanStats = {
            servers = statServers, pages = statPages, places = #placeList,
            unknownPresence = (unknownPresence == true),
            blind = (blindCount > 0), allBlind = (#placeList > 0 and blindCount >= #placeList),
        }
        if #placeList > 0 and blindCount >= #placeList then
            return nil, scanPlaceId, nil, nil, nil,
                "Roblox ẩn danh sách người chơi trong server (chỉ trả JobId, không trả playerTokens) nên không dò được ai ở server nào bằng ảnh đại diện. Blox Fruits luôn ở tình trạng này. Cách dùng được: người đó là bạn bè (presence), hoặc dán mã PlaceId:JobId đã có."
        end
    end

    return nil, scanPlaceId, nil, nil, nil, nil
end

-- ============================================================================
-- 8. MÃ SERVER: định dạng / đọc lại / vào server
-- ============================================================================
function S.FormatCode(jobId, placeId, meta, coName)
    jobId = tostring(jobId or "")
    if jobId == "" then return "", "" end
    placeId = tonumber(placeId) or S._jobPlaceCache[jobId] or tonumber(game.PlaceId)
    if placeId and placeId > 0 then S._jobPlaceCache[jobId] = placeId end
    meta = type(meta) == "table" and meta or S._jobMetaCache[jobId]
    if type(meta) == "table" then S._jobMetaCache[jobId] = meta end
    -- Blox Fruits có 3 hải (3 place) trong CÙNG một universe: mã chỉ ghi JobId sẽ
    -- bị hiểu là "hải đang đứng" khi dán ở phiên khác → sai place, vào không được.
    -- Vì vậy game nhiều place thì LUÔN ghi kèm PlaceId:JobId.
    local myPlace = tonumber(game.PlaceId)
    local ps = S.PlacesOf(tonumber(game.GameId) or 0, placeId or myPlace)
    local multiPlace = (type(ps) == "table" and #ps > 1)
    local needPlace = (placeId and placeId > 0) and (multiPlace or not myPlace or placeId ~= myPlace)
    local placeTxt = needPlace and string.format("%.0f", placeId) or nil
    local codeForInput = placeTxt and (placeTxt .. ":" .. jobId) or jobId
    local capTxt = ""
    if type(meta) == "table" and tonumber(meta.playing) and tonumber(meta.maxPlayers) and meta.maxPlayers > 0 then
        capTxt = string.format(" · %d/%d%s", meta.playing, meta.maxPlayers, meta.playing >= meta.maxPlayers and " ĐẦY" or "")
    end
    local coTxt = (type(coName) == "string" and coName ~= "") and (" · chơi cùng @" .. coName) or ""
    local dispTxt = jobId .. (placeId and (" (Place: " .. string.format("%.0f", placeId) .. capTxt .. coTxt .. ")") or (capTxt .. coTxt))
    return codeForInput, dispTxt
end

function S.ParseCode(raw)
    local s = tostring(raw or ""):gsub("^%s+", ""):gsub("%s+$", ""):gsub('^"', ""):gsub('"$', ""):gsub("^'", ""):gsub("'$", "")
    s = s:gsub("^Mã Server %(JobId%)%s*:%s*", ""):gsub("^Mã SV%s*:%s*", ""):gsub("^🌐 Mã server%s*:%s*", "")
    if s == "" then return nil, nil end
    -- Link Roblox hay được chia sẻ cho Blox Fruits:
    --   roblox.com/games/start?placeId=4442272183&gameInstanceId=<JobId>
    --   roblox.com/games/2753915549/Blox-Fruits?gameId=<JobId>
    local isPrivate = s:find("privateServerLinkCode", 1, true) ~= nil
    local urlPlace = s:match("[%?&]placeId=(%d+)") or s:match("roblox%.com/games/(%d+)")
    local urlJob = s:match("[%?&]gameInstanceId=([%w%-]+)") or s:match("[%?&]gameId=([%w%-]+)") or s:match("[%?&]jobId=([%w%-]+)")
    if urlJob and urlJob:find("-", 1, true) then
        local np = tonumber(urlPlace)
        if np and np > 0 then S._jobPlaceCache[urlJob] = np end
        return urlJob, np, (isPrivate and "private" or nil)
    end
    local pId, jId = s:match("^(%d+)%s*[:/|,]%s*([%w%-]+)$")
    if pId and jId and jId:find("-", 1, true) then
        local np = tonumber(pId)
        if np then S._jobPlaceCache[jId] = np end
        return jId, np
    end
    local placeHint = s:match("PlaceId%s*[:=]%s*(%d+)") or s:match("Place%s*[:=]%s*(%d+)") or s:match("roblox%.com/games/(%d+)")
    local uuid = s:match("(%x%x%x%x%x%x%x%x%-%x%x%x%x%-%x%x%x%x%-%x%x%x%x%-%x%x%x%x%x%x%x%x%x%x%x%x)")
    if uuid then
        local np = tonumber(placeHint) or S._jobPlaceCache[uuid]
        if np then S._jobPlaceCache[uuid] = np end
        return uuid, np
    end
    local token = s:match("^([%w]+%-[%w%-]+)")
    if token and #token >= 8 then
        local np = tonumber(placeHint) or S._jobPlaceCache[token]
        return token, np, (isPrivate and "private" or nil)
    end
    return nil, tonumber(placeHint), (isPrivate and "private" or nil)
end

function S.Clipboard(text)
    local ok = pcall(function() setclipboard(tostring(text)) end)
    if ok then return true end
    ok = pcall(function() local c = getclipboard() if c and c.setclipboard then c.setclipboard(tostring(text)) end end)
    if ok then return true end
    ok = pcall(function() local c = toclipboard if type(c) == "function" then c(tostring(text)) end end)
    return ok
end

S._joinToken = 0

function S.RawTeleport(placeId, jobId)
    local ok, err = pcall(function()
        if jobId and jobId ~= "" then
            TeleportService:TeleportToPlaceInstance(placeId, jobId, player)
        else
            TeleportService:Teleport(placeId, player)
        end
    end)
    return ok, err
end

-- Vào server; nếu đầy/bận thì tự canh slot, nếu 773/771 thì thử place khác.
function S.Join(placeId, jobId, onStatus)
    local function say(msg) if type(onStatus) == "function" then pcall(onStatus, msg) end end
    local jId = tostring(jobId or ""):gsub("^%s+", ""):gsub("%s+$", "")
    local pId = tonumber(placeId) or (jId ~= "" and S._jobPlaceCache[jId]) or tonumber(game.PlaceId) or 0
    if jId ~= "" and pId > 0 then S._jobPlaceCache[jId] = pId end
    if jId ~= "" and jId == tostring(game.JobId or "") and pId == tonumber(game.PlaceId) then
        return true, "✅ Bạn đang ở đúng server này rồi!"
    end

    local okT, errT = S.RawTeleport(pId, jId)
    if not okT then
        local eLow = tostring(errT or ""):lower()
        if jId ~= "" and (eLow:find("restricted") or eLow:find("unauthorized") or eLow:find("notfound") or eLow:find("not found")) then
            for _, altP in ipairs(S.GetUniversePlaces(nil, pId)) do
                if altP ~= pId then
                    local okAlt, errAlt = S.RawTeleport(altP, jId)
                    if okAlt then
                        pId = altP S._jobPlaceCache[jId] = altP okT, errT = true, nil
                        break
                    else
                        errT = errAlt
                    end
                end
            end
        end
        if not okT then
            return false, "⚠️ Không vào được server: " .. tostring(errT)
        end
    end

    local meta = S._jobMetaCache[jId]
    local full = type(meta) == "table" and tonumber(meta.maxPlayers) and meta.maxPlayers > 0 and (tonumber(meta.playing) or 0) >= meta.maxPlayers
    if full or jId ~= "" then
        S._joinToken = (S._joinToken or 0) + 1
        local tok = S._joinToken
        task.spawn(function()
            for attempt = 1, 25 do
                task.wait(1.8)
                if S._joinToken ~= tok then return end
                if jId == "" then return end
                if tostring(game.JobId or "") == jId then return end
                say(string.format("⏳ Server đang đầy/bận — tự canh slot trống (#%d/25)...", attempt))
                S.RawTeleport(pId, jId)
            end
            if S._joinToken == tok then
                S._joinToken = nil
                say("⏳ Canh 25 lần vẫn chưa vào được (server đầy hoặc người chơi đã rời) — lấy lại mã mới rồi thử lại.")
            end
        end)
    end
    local guessTxt = ""
    if tonumber(placeId) == nil and jId ~= "" then
        guessTxt = " · ⚠️ mã không kèm PlaceId nên dùng Place hiện tại — sai hải thì dán lại dạng PlaceId:JobId"
    end
    return true, string.format("🚀 Đang vào server %s (Place: %s)%s", tostring(jId ~= "" and jId or "—"), tostring(pId), guessTxt)
end
-- ============================================================================
-- GUI tab "📡 Mã server" (vẽ vào khung chung)
-- ============================================================================
local C = {
    PANEL = Color3.fromRGB(28, 30, 38),
    FIELD = Color3.fromRGB(38, 41, 52),
    ACCENT = Color3.fromRGB(120, 170, 255),
    GREEN = Color3.fromRGB(80, 200, 130),
    YELLOW = Color3.fromRGB(240, 200, 90),
    RED = Color3.fromRGB(240, 110, 110),
    TEXT = Color3.fromRGB(235, 238, 245),
    DIM = Color3.fromRGB(150, 156, 172),
}
local New = PT.New

local win = New("Frame", {
    Name = "ServerWindow", Size = UDim2.new(0, 452, 0, 356), Position = UDim2.new(0, 0, 0, 0),
    BackgroundTransparency = 1, Visible = false, ZIndex = 40,
}, PT.content)

local input = New("TextBox", {
    Size = UDim2.new(1, -16, 0, 30), Position = UDim2.new(0, 8, 0, 6), BackgroundColor3 = C.FIELD,
    Text = "", PlaceholderText = "Tên / @tên / UserId người chơi…", PlaceholderColor3 = C.DIM,
    TextColor3 = C.TEXT, Font = Enum.Font.Gotham, TextSize = 12, BorderSizePixel = 0, ClearTextOnFocus = false,
}, win)
New("UICorner", { CornerRadius = UDim.new(0, 8) }, input)
New("UIPadding", { PaddingLeft = UDim.new(0, 8), PaddingRight = UDim.new(0, 8) }, input)

local function mkBtn(text, x, w, color)
    local b = New("TextButton", {
        Size = UDim2.new(0, w, 0, 30), Position = UDim2.new(0, x, 0, 42), BackgroundColor3 = color,
        Text = text, TextColor3 = Color3.fromRGB(18, 19, 24), Font = Enum.Font.GothamBold, TextSize = 11, BorderSizePixel = 0,
    }, win)
    New("UICorner", { CornerRadius = UDim.new(0, 8) }, b)
    return b
end

local lookBtn = mkBtn("🔎 Tra cứu", 8, 144, C.ACCENT)
local copyBtn = mkBtn("📋 Mã SV", 158, 144, C.YELLOW)
local joinBtn = mkBtn("🚀 Vào SV", 308, 136, C.GREEN)

local info = New("TextLabel", {
    Size = UDim2.new(1, -16, 0, 116), Position = UDim2.new(0, 8, 0, 78), BackgroundColor3 = C.PANEL,
    Text = "Nhập tên/UserId rồi bấm 🔎 Tra cứu.\n📋 Mã SV = quét & copy mã · 🚀 Vào SV = vào luôn server đó.",
    TextColor3 = C.DIM, Font = Enum.Font.Gotham, TextSize = 11, TextWrapped = true,
    TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top, BorderSizePixel = 0,
}, win)
New("UICorner", { CornerRadius = UDim.new(0, 8) }, info)
New("UIPadding", { PaddingLeft = UDim.new(0, 8), PaddingRight = UDim.new(0, 8), PaddingTop = UDim.new(0, 6), PaddingBottom = UDim.new(0, 6) }, info)

local status = New("TextLabel", {
    Size = UDim2.new(1, -16, 0, 40), Position = UDim2.new(0, 8, 0, 198), BackgroundTransparency = 1,
    Text = "Sẵn sàng.", TextColor3 = C.DIM, Font = Enum.Font.Gotham, TextSize = 11, TextWrapped = true,
    TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top,
}, win)

local codeBox = New("TextBox", {
    Size = UDim2.new(1, -112, 0, 28), Position = UDim2.new(0, 8, 0, 244), BackgroundColor3 = C.FIELD,
    Text = "", PlaceholderText = "Dán mã SV (JobId / PlaceId:JobId / link Roblox)…", PlaceholderColor3 = C.DIM,
    TextColor3 = C.TEXT, Font = Enum.Font.Gotham, TextSize = 11, BorderSizePixel = 0, ClearTextOnFocus = false,
}, win)
New("UICorner", { CornerRadius = UDim.new(0, 8) }, codeBox)

local pasteJoinBtn = New("TextButton", {
    Size = UDim2.new(0, 96, 0, 28), Position = UDim2.new(1, -104, 0, 244), BackgroundColor3 = C.GREEN,
    Text = "🚀 Vào mã", TextColor3 = Color3.fromRGB(18, 19, 24), Font = Enum.Font.GothamBold, TextSize = 11, BorderSizePixel = 0,
}, win)
New("UICorner", { CornerRadius = UDim.new(0, 8) }, pasteJoinBtn)

local depthBtn = New("TextButton", {
    Size = UDim2.new(1, -16, 0, 26), Position = UDim2.new(0, 8, 0, 278), BackgroundColor3 = C.FIELD,
    Text = "⚙️ Độ sâu quét: 150 trang/place (bấm để đổi)", TextColor3 = C.DIM,
    Font = Enum.Font.Gotham, TextSize = 10, BorderSizePixel = 0,
}, win)
New("UICorner", { CornerRadius = UDim.new(0, 8) }, depthBtn)

local note = New("TextLabel", {
    Size = UDim2.new(1, -16, 0, 40), Position = UDim2.new(0, 8, 0, 308), BackgroundTransparency = 1,
    Text = "Chỉ tìm được server CÔNG KHAI. Người chơi ở server VIP/riêng tư thì Roblox không trả mã.",
    TextColor3 = C.DIM, Font = Enum.Font.Gotham, TextSize = 10, TextWrapped = true,
    TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top,
}, win)

local function setStatus(msg, color)
    status.Text = tostring(msg or "")
    status.TextColor3 = color or C.DIM
end

local function showInfo(lines, color)
    info.Text = table.concat(lines, "\n")
    info.TextColor3 = color or C.TEXT
end

local rec = nil

local function doLookup()
    setStatus("🔎 Đang tra cứu…", C.YELLOW)
    local id, err = S.ResolveUser(input.Text)
    if not id then
        rec = nil
        showInfo({ "❌ " .. tostring(err) }, C.RED)
        setStatus(tostring(err), C.RED)
        return
    end
    local prof = S.FetchProfile(id)
    local pres = S.FetchPresence(id)
    rec = {
        id = id,
        name = (prof and (prof.name or prof.displayName)) or ("User_" .. tostring(id)),
        displayName = (prof and prof.displayName) or "",
        created = (prof and type(prof.created) == "string" and prof.created:sub(1, 10)) or "—",
        presence = S.PresenceText(pres),
    }
    local isPlaying, msg, unknown = S.CheckPlayerIsPlaying(id, pres)
    if unknown then rec.presence = "🔎 Roblox ẩn trạng thái với người lạ" end
    local lines = {
        "👤 " .. tostring(rec.name) .. (rec.displayName ~= "" and rec.displayName ~= rec.name and (" (" .. rec.displayName .. ")") or ""),
        "🆔 UserId: " .. tostring(id) .. "  ·  🗓 tạo: " .. tostring(rec.created),
        "📶 " .. tostring(rec.presence),
    }
    if unknown then
        lines[#lines + 1] = "🔎 Roblox ẩn trạng thái với người lạ — bấm 📋 Mã SV để quét server công khai."
    elseif not isPlaying then
        lines[#lines + 1] = "⛔ " .. tostring(msg or "không chơi game này")
    end
    if type(pres) == "table" and type(pres.gameId) == "string" and pres.gameId ~= "" then
        rec.jobId = pres.gameId
        rec.placeId = tonumber(pres.placeId) or tonumber(pres.rootPlaceId)
        lines[#lines + 1] = "🔑 Mã SV: " .. tostring(rec.jobId) .. " (từ presence — chính xác ngay)"
    end
    showInfo(lines)
    setStatus(unknown and "Đã có hồ sơ — bấm 📋 Mã SV để quét server." or "Xong.", C.GREEN)
end

local function ensureFound()
    if not rec then return nil, "chưa tra cứu ai — nhập tên/UserId rồi bấm 🔎" end
    if rec.jobId and rec.jobId ~= "" then return rec end
    local jobId, placeId, src, meta, coName, err = S.FindPlayerServer(rec.id, rec.placeId or game.PlaceId, function(pg, cnt, mode, pId)
        setStatus(string.format("🔍 Đang quét: trang %s · %s · Place %s…", tostring(pg), tostring(mode or ""), tostring(pId or "")), C.YELLOW)
    end, tonumber(S.ScanPages) or 150)
    if err then
        setStatus("⛔ " .. tostring(err), C.RED)
        return nil, err
    end
    if not jobId or jobId == "" then
        local st = S.lastScanStats
        local statsTxt = ""
        if type(st) == "table" then
            statsTxt = string.format(" · đã quét %d SV / %d trang / %d place", st.servers or 0, st.pages or 0, st.places or 0)
        end
        local msg
        if type(st) == "table" and st.blind then
            msg = "Roblox ẩn danh sách người chơi trong server (chỉ trả JobId) nên không dò được bằng ảnh đại diện" .. statsTxt
                .. " — Blox Fruits luôn vậy. Dùng: người đó là bạn bè (presence) hoặc dán mã PlaceId:JobId đã có."
        else
            msg = "Không tìm thấy server của người này" .. statsTxt .. " — có thể đang ở server VIP/riêng tư, hoặc tăng Độ sâu rồi thử lại."
        end
        setStatus("⚠️ " .. msg, C.YELLOW)
        return nil, msg
    end
    rec.jobId, rec.placeId, rec.meta, rec.coName, rec.src = tostring(jobId), tonumber(placeId), meta, coName, src
    return rec
end

local function doCopy()
    local r = ensureFound()
    if not r then return end
    local codeIn = S.FormatCode(r.jobId, r.placeId, r.meta, r.coName)
    local ok = S.Clipboard(codeIn ~= "" and codeIn or r.jobId)
    showInfo({
        "👤 " .. tostring(r.name) .. " · 🆔 " .. tostring(r.id),
        "🔑 Mã SV: " .. tostring(r.jobId),
        "🌐 Place: " .. tostring(r.placeId or game.PlaceId) .. "  ·  nguồn: " .. tostring(r.src or "scan"),
        "📋 Mã để dán: " .. tostring(codeIn ~= "" and codeIn or r.jobId),
    }, C.GREEN)
    setStatus(ok and ("✅ Đã copy mã: " .. tostring(codeIn)) or ("Mã: " .. tostring(codeIn) .. " (không copy được — chép tay)"), ok and C.GREEN or C.YELLOW)
end

local function doJoin()
    local r = ensureFound()
    if not r then return end
    local codeIn = S.FormatCode(r.jobId, r.placeId, r.meta, r.coName)
    local ok, msg = S.Join(r.placeId, r.jobId, function(m) setStatus(m, C.YELLOW) end)
    setStatus((ok and "✅ " or "⚠️ ") .. tostring(msg), ok and C.GREEN or C.RED)
    if ok then
        S.Clipboard(codeIn)
        showInfo({
            "👤 " .. tostring(r.name) .. " · 🆔 " .. tostring(r.id),
            "🔑 Mã SV: " .. tostring(r.jobId),
            "🌐 Place: " .. tostring(r.placeId or game.PlaceId),
            "🚀 Đang teleport… (mã đã copy phòng khi cần vào lại)",
        }, C.GREEN)
    end
end

local function guarded(fn)
    return function()
        local ok, err = pcall(fn)
        if not ok then setStatus("⚠️ Lỗi: " .. tostring(err), C.RED) end
    end
end
lookBtn.Activated:Connect(guarded(doLookup))
copyBtn.Activated:Connect(guarded(doCopy))
joinBtn.Activated:Connect(guarded(doJoin))

pasteJoinBtn.Activated:Connect(function()
    local jId, pId, note = S.ParseCode(codeBox.Text)
    if not jId then
        setStatus("⚠️ Mã không hợp lệ (cần JobId, PlaceId:JobId hoặc link Roblox có gameInstanceId).", C.RED)
        return
    end
    local ok, msg = S.Join(pId, jId, function(m) setStatus(m, C.YELLOW) end)
    if note == "private" then
        msg = tostring(msg) .. " ⚠️ Link là server riêng (privateServerLinkCode) — cần access code, JobId không vào được."
        ok = false
    end
    setStatus((ok and "✅ " or "⚠️ ") .. tostring(msg), ok and C.GREEN or C.RED)
end)

depthBtn.Activated:Connect(function()
    local cur = tonumber(S.ScanPages) or 150
    local nextVal = (cur >= 400) and 60 or (cur + 60)
    S.ScanPages = math.clamp(nextVal, 30, 480)
    depthBtn.Text = "⚙️ Độ sâu quét: " .. tostring(S.ScanPages) .. " trang/place (bấm để đổi)"
    setStatus("Độ sâu = " .. tostring(S.ScanPages) .. " trang/place. Quét sâu hơn = lâu hơn nhưng chắc hơn.", C.DIM)
end)

input.FocusLost:Connect(function(enter)
    if enter then pcall(doLookup) end
end)

PT.serverWin = win
    end)
    if not ok2 then
        pcall(function() warn("[PlayerTools] Tab MÃ SERVER lỗi: " .. tostring(err2)) end)
    end
end

-- ============================================================================
-- TAB: chuyển tab / mở-đóng khung
-- ============================================================================
local function showTab(idx)
    if PT.outfitWin then PT.outfitWin.Visible = (idx == 1) end
    if PT.serverWin then PT.serverWin.Visible = (idx == 2) end
    if idx == 1 then
        tabOutfit.BackgroundColor3 = SC.ACCENT tabOutfit.TextColor3 = SC.BG
        tabServer.BackgroundColor3 = SC.FIELD tabServer.TextColor3 = SC.DIM
    else
        tabServer.BackgroundColor3 = SC.ACCENT tabServer.TextColor3 = SC.BG
        tabOutfit.BackgroundColor3 = SC.FIELD tabOutfit.TextColor3 = SC.DIM
    end
end

local currentTab = 1

local function openShell(idx)
    shellWin.Visible = true
    showTab(idx or currentTab)
end

local function closeShell()
    shellWin.Visible = false
    if PT.outfitWin then PT.outfitWin.Visible = false end
    if PT.serverWin then PT.serverWin.Visible = false end
end

local function toggleShell(idx)
    if shellWin.Visible then
        closeShell()
    else
        openShell(idx or currentTab)
    end
end

PT.closeShell = closeShell

tabOutfit.Activated:Connect(function() currentTab = 1 showTab(1) end)
tabServer.Activated:Connect(function() currentTab = 2 showTab(2) end)
floatBtn.Activated:Connect(function() toggleShell() end)
closeShellBtn.Activated:Connect(function() closeShell() end)

-- kéo cửa sổ bằng thanh tiêu đề
do
    local dragging, dragStart, startPos = false, nil, nil
    shellHeader.InputBegan:Connect(function(i)
        if i.UserInputType == Enum.UserInputType.MouseButton1 or i.UserInputType == Enum.UserInputType.Touch then
            dragging = true dragStart = i.Position startPos = shellWin.Position
        end
    end)
    UserInputService.InputChanged:Connect(function(i)
        if dragging and (i.UserInputType == Enum.UserInputType.MouseMovement or i.UserInputType == Enum.UserInputType.Touch) then
            local d = i.Position - dragStart
            shellWin.Position = UDim2.new(startPos.X.Scale, startPos.X.Offset + d.X, startPos.Y.Scale, startPos.Y.Offset + d.Y)
        end
    end)
    UserInputService.InputEnded:Connect(function(i)
        if i.UserInputType == Enum.UserInputType.MouseButton1 or i.UserInputType == Enum.UserInputType.Touch then
            dragging = false
        end
    end)
end

-- phím tắt: RightControl = Trang phục · RightShift = Mã server
UserInputService.InputBegan:Connect(function(i, gp)
    if gp then return end
    if i.KeyCode == Enum.KeyCode.RightControl then currentTab = 1 toggleShell(1)
    elseif i.KeyCode == Enum.KeyCode.RightShift then currentTab = 2 toggleShell(2) end
end)

if PT.outfitWin then PT.outfitWin.Visible = true end
if PT.serverWin then PT.serverWin.Visible = false end
showTab(1)
pcall(function() warn("[PlayerTools] sẵn sàng — RightControl = Trang phục · RightShift = Mã server") end)
