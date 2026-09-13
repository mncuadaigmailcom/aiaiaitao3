-- Test thuần logic (không cần Roblox): chạy trong fengari (Lua 5.3 VM).
-- Mục tiêu: chắc chắn S.SanitizeCode cắt đúng wrapper độc hại của bản 4.4a và
-- code còn lại vẫn là Lua hợp lệ; đồng thời test MaskKey / ParseSegments / Store.serialize-ish.

-- ============ copies của hàm trong hub ============
local S = {}
S.WRAP_MARK_OLD = "-- ===== AUTO-GENERATED SIZE WRAPPER"
S.WRAP_MARK_NEW = "-- ===== AUTO-GENERATED FIT WRAPPER"
function S.SanitizeCode(c)
    if type(c) ~= "string" then return c end
    if not c:find(S.WRAP_MARK_OLD, 1, true) then return c end
    local out = (c:gsub(
        "pcall%s*%(%s*function%s*%(%)%s*_ForceStretch%s*%(%s*g%s*%)%s*end%s*%)",
        ""))
    return out
end

local function MaskKey(key)
    if not key or #key == 0 then return "" end
    if #key <= 8 then return string.rep("•", #key) end
    return key:sub(1, 4)..string.rep("•", math.min(#key - 8, 20))..key:sub(-4)
end

local function ParseSegments(text)
    local segments = {}
    local remaining = text
    while true do
        local startIdx, endIdx = remaining:find("```")
        if not startIdx then
            if #remaining > 0 then table.insert(segments, {type = "text", content = remaining}) end
            break
        end
        local before = remaining:sub(1, startIdx - 1)
        if #before > 0 then table.insert(segments, {type = "text", content = before}) end
        local rest = remaining:sub(endIdx + 1)
        local closeStart, closeEnd = rest:find("```")
        if not closeStart then
            table.insert(segments, {type = "code", content = rest})
            break
        end
        local codeContent = rest:sub(1, closeStart - 1)
        codeContent = codeContent:gsub("^%s*%a+%s*\n", "")
        table.insert(segments, {type = "code", content = codeContent})
        remaining = rest:sub(closeEnd + 1)
    end
    return segments
end

-- ============ helpers ============
local pass, fail = 0, 0
local function check(name, cond, extra)
    if cond then pass = pass + 1; print("  ✅ " .. name)
    else fail = fail + 1; print("  ❌ " .. name .. (extra and ("  << " .. tostring(extra)) or "")) end
end

-- ============ 1) SanitizeCode trên wrapper bản 4.4a (đúng text hub đã sinh ra) ============
print("[1] S.SanitizeCode vô hại hoá wrapper cũ")
local oldWrapper = [[
-- ===== AUTO-GENERATED SIZE WRAPPER =====
local _AUTO_SIZE_WRAPPER = true

local function _ForceStretch(obj)
    if not obj then return end
    pcall(function()
        if obj:IsA("GuiObject") then
            if obj:IsA("Frame") or obj:IsA("ScrollingFrame") or obj:IsA("CanvasGroup") then
                obj.Size = UDim2.new(1, 0, 1, 0)
                obj.Position = UDim2.new(0, 0, 0, 0)
            end
        end
    end)
    for _, c in ipairs(obj:GetChildren()) do
        _ForceStretch(c)
    end
end

local gui = Instance.new("ScreenGui")
gui.Name = "CuaToi"

task.defer(function()
    task.wait(0.5)
    for _, g in ipairs(game:GetService("CoreGui"):GetChildren()) do
        if g:IsA("ScreenGui") and g.Name ~= "ExMenu" then
            pcall(function() _ForceStretch(g) end)
        end
    end
    for _, g in ipairs(game.Players.LocalPlayer.PlayerGui:GetChildren()) do
        if g:IsA("ScreenGui") and g.Name ~= "ExMenu" then
            pcall(function() _ForceStretch(g) end)
        end
    end
end)
]]

local clean = S.SanitizeCode(oldWrapper)
check("mất lời gọi _ForceStretch(g) trong sweep", not clean:find("_ForceStretch(g)", 1, true))
check("giữ lại code của người dùng (gui.Name)", clean:find('gui.Name = "CuaToi"', 1, true) ~= nil)
check("giữ lại vòng for (để if rỗng còn hợp lệ)", clean:find('for _, g in ipairs', 1, true) ~= nil)
local f, err = load(clean)
check("code sau khi cắt vẫn biên dịch được", f ~= nil, err)

-- idempotent + không đụng code thường
check("chạy 2 lần cho cùng kết quả", S.SanitizeCode(clean) == clean)
local normal = 'local a = 1\nlocal function f(g) pcall(function() _ForceStretch(g) end) end\n'
check("code KHÔNG có marker thì không bị sửa", S.SanitizeCode(normal) == normal)
check("nil / number an toàn", S.SanitizeCode(nil) == nil and S.SanitizeCode(12) == 12)

-- ============ 2) wrapper MỚI (bản 4.4b) do hub sinh ra ============
print("[2] wrapper 4.4b: không quét CoreGui/PlayerGui, hook Instance.new")
local newWrapper = WRAPPER_SRC
check("không còn CoreGui:GetChildren() sweep", not newWrapper:find('GetService("CoreGui"):GetChildren()', 1, true))
check("không còn PlayerGui:GetChildren() sweep", not newWrapper:find('PlayerGui:GetChildren()', 1, true))
check("có hook Instance.new", newWrapper:find("Instance.new = function", 1, true) ~= nil)
check("có gỡ hook (_bcHookOn = false)", newWrapper:find("_bcHookOn = false", 1, true) ~= nil)
check("SanitizeCode không làm hỏng wrapper mới", S.SanitizeCode(newWrapper) == newWrapper)
local f2, err2 = load(newWrapper)
check("wrapper 4.4b biên dịch được", f2 ~= nil, err2)

-- chạy wrapper với bộ máy Roblox giả: đảm bảo nó không crash và không đụng GUI của game
local touchedGameGui = false
local ownGui
local fakeInstanceMt = {}
local function makeObj(cls, name)
    local o = {ClassName = cls, Name = name or cls, _children = {}, Parent = nil}
    function o:GetChildren() return o._children end
    function o:IsA(c) return c == cls end
    function o:FindFirstChild(n) for _,c in ipairs(o._children) do if c.Name==n then return c end end end
    function o:FindFirstChildWhichIsA(c) for _,ch in ipairs(o._children) do if ch:IsA(c) then return ch end end end
    function o:Destroy() end
    function o:SetAttribute() end
    function o:GetAttribute() return nil end
    function o:GetPropertyChangedSignal() return {Connect=function() end} end
    return o
end
local gameObj = makeObj("DataModel", "game")
local coreGui = makeObj("CoreGui", "CoreGui")
local players = makeObj("Players", "Players")
local lp = makeObj("LocalPlayer", "LocalPlayer")
local playerGui = makeObj("PlayerGui", "PlayerGui")
local hubGui = makeObj("ScreenGui", "ExMenu")
local hubMain = makeObj("Frame", "Main")
hubMain.AbsoluteSize = {X = 540, Y = 340}
table.insert(hubGui._children, hubMain); hubMain.Parent = hubGui
table.insert(coreGui._children, hubGui)
local gameOwnGui = makeObj("ScreenGui", "InGame")
local gameButton = makeObj("Frame", "ShootButton")
table.insert(gameOwnGui._children, gameButton); gameButton.Parent = gameOwnGui
table.insert(playerGui._children, gameOwnGui)
lp.PlayerGui = playerGui
players.LocalPlayer = lp
gameObj.Players = players
function gameObj:GetService(n)
    if n == "CoreGui" then return coreGui
    elseif n == "Players" then return players end
    return makeObj(n, n)
end
local realInstance = {new = function(cls) local o = makeObj(cls); return o end}
local sandbox = setmetatable({}, {__index = _G})
sandbox.game = gameObj
sandbox.Instance = realInstance
sandbox.math, sandbox.task, sandbox.pcall, sandbox.ipairs = math, nil, pcall, ipairs
sandbox.print = print

-- task stub
local taskStub = {
    wait = function() end,
    defer = function(fn) fn() end,
    delay = function(_, fn) fn() end,
    spawn = function(fn, ...) fn(...) end,
    cancel = function() end,
}
sandbox.task = taskStub

local chunk, cerr = load(newWrapper, "wrapper", "t", sandbox)
check("loadstring wrapper thành công trong sandbox", chunk ~= nil, cerr)
if chunk then
    local okRun, runErr = pcall(chunk)
    check("chạy wrapper không nổ lỗi", okRun, runErr)
    -- sau khi chạy: GUI của game (InGame.ShootButton) phải còn nguyên, không Size bị đè
    check("GUI của game không bị sửa Size", gameButton.Size == nil)
    check("GUI của game vẫn ở PlayerGui", gameButton.Parent == gameOwnGui)
end

-- ============ 3) MaskKey / ParseSegments regression ============
print("[3] MaskKey + ParseSegments")
check("key <=8 ký tự không lộ nguyên văn", MaskKey("ABC") == "•••", MaskKey("ABC"))
check("key dài: giữ 4 đầu + 4 cuối", MaskKey("AIza1234567890abcdXY"):sub(1,4) == "AIza")
check("chuỗi mask chứa • để Nút Lưu chặn", MaskKey("AIzaSHOULDNOTBEPARTOFKEY"):find("•",1,true) ~= nil)
local segs = ParseSegments("intro\n```lua\nlocal a = 1\n```\noutro")
check("ParseSegments tách 3 đoạn", #segs == 3, #segs)
check("đoạn giữa là code", segs[2] and segs[2].type == "code" and segs[2].content:find("local a") ~= nil)
local open1 = ParseSegments("```lua\nlocal a = 1")
check("code block chưa đóng vẫn xử lý được", #open1 == 1 and open1[1].type == "code", #open1)

-- ============ 4) mô phỏng luồng embed/restore (logic thuần, không Roblox) ============
print("[4] logic FitEmbedded: clamp scale + bounding box")
-- bản sao đúng công thức trong S.FitEmbedded (chỉ CO, không phóng to, clamp 0.35)
local function fit(availW, availH, baseW, baseH)
    local aw, ah = availW - 8, availH - 8
    if aw < 40 or ah < 40 then return nil end
    if baseW <= 0 or baseH <= 0 then baseW, baseH = aw, ah end
    local sc = math.min(1, aw / baseW, ah / baseH)
    if sc < 0.35 then sc = 0.35 elseif sc > 1 then sc = 1 end
    return sc
end
check("GUI nhỏ hơn tab -> scale 1 (không phóng to, không tràn khung)", fit(435, 304, 300, 200) == 1)
check("GUI 4000x3000 -> co về clamp 0.35", fit(435, 304, 4000, 3000) == 0.35, fit(435, 304, 4000, 3000))
check("scale không bao giờ > 1 (đảm bảo không tràn tab -> không nuốt click)",
    fit(1200, 900, 300, 200) == 1 and fit(435, 304, 30, 20) == 1)
check("tab quá nhỏ -> nil (không làm gì)", fit(30, 20, 300, 200) == nil)

print(string.format("\n=> %d pass / %d fail", pass, fail))
if fail > 0 then error("CÓ TEST FAIL") end
