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

local gui = New("ScreenGui", {
    Name = "OutfitLocalGui",
    ResetOnSpawn = false,
    IgnoreGuiInset = true,
    ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
}, targetGui)

local floatBtn = New("TextButton", {
    Name = "OutfitFloat",
    Size = UDim2.new(0, 44, 0, 44),
    Position = UDim2.new(1, -64, 1, -120),
    BackgroundColor3 = C.PANEL,
    BackgroundTransparency = 0.05,
    Text = "🧥",
    TextSize = 20,
    Font = Enum.Font.GothamBold,
    TextColor3 = C.ACCENT,
    BorderSizePixel = 0,
    ZIndex = 50,
}, gui)
Corner(floatBtn, UDim.new(1, 0))
Stroke(floatBtn, C.ACCENT, 1.4)

local win = New("Frame", {
    Name = "OutfitWindow",
    Size = UDim2.new(0, WINDOW_W, 0, WINDOW_H),
    Position = UDim2.new(0.5, -WINDOW_W / 2, 0.5, -WINDOW_H / 2),
    BackgroundColor3 = C.BG,
    BorderSizePixel = 0,
    Visible = false,
    ZIndex = 40,
}, gui)
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

floatBtn.Activated:Connect(toggleWindow)
minBtn.Activated:Connect(toggleWindow)
closeBtn.Activated:Connect(function()
    win.Visible = false
    releaseFocus()
end)
track(UserInputService.InputBegan:Connect(function(inputObject, processed)
    if processed then return end
    if inputObject.KeyCode == Enum.KeyCode.RightControl then toggleWindow() end
end))

-- Kéo cửa sổ
local winDragging, winDragStart, winStartPos = false, nil, nil
track(header.InputBegan:Connect(function(inputObject)
    if inputObject.UserInputType == Enum.UserInputType.MouseButton1
        or inputObject.UserInputType == Enum.UserInputType.Touch then
        winDragging = true
        winDragStart = inputObject.Position
        winStartPos = win.Position
    end
end))
track(UserInputService.InputChanged:Connect(function(inputObject)
    if not winDragging then return end
    if inputObject.UserInputType ~= Enum.UserInputType.MouseMovement
        and inputObject.UserInputType ~= Enum.UserInputType.Touch then return end
    local delta = inputObject.Position - winDragStart
    win.Position = UDim2.new(
        winStartPos.X.Scale, winStartPos.X.Offset + delta.X,
        winStartPos.Y.Scale, winStartPos.Y.Offset + delta.Y
    )
end))
track(UserInputService.InputEnded:Connect(function(inputObject)
    if inputObject.UserInputType == Enum.UserInputType.MouseButton1
        or inputObject.UserInputType == Enum.UserInputType.Touch then
        winDragging = false
    end
end))

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

print("[OutfitLocal] sẵn sàng — RightControl để mở/đóng · lưu tại " .. SAVE_FILE ..
    (canUseDisk() and "" or " (executor không có writefile: chỉ giữ trong phiên)"))
