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

-- ============ 4) công thức FIT v4.4c: scale đều toàn subtree ============
print("[4] FitEmbedded: scale đều 2 chiều (vừa khít vùng tab)")
local UDim2 = { new = function(xs, xo, ys, yo)
    return { X = { Scale = xs, Offset = xo }, Y = { Scale = ys, Offset = yo } }
end }
local UDim = { new = function(sc, off) return { Scale = sc, Offset = off } end }
if not math.clamp then   -- fengari là Lua 5.3, không có math.clamp của Luau
    math.clamp = function(v, lo, hi) if v < lo then return lo elseif v > hi then return hi end return v end
end
-- bản sao công thức trong khối "===== FIT" của hub; test_embed.lua test bản trích xuất THẬT
local function mulUDim(u, k)
    return UDim2.new(u.X.Scale, math.floor(u.X.Offset * k + 0.5),
                     u.Y.Scale, math.floor(u.Y.Offset * k + 0.5))
end
local function fit(baseW, baseH, areaW, areaH)
    local aw, ah = areaW - 6, areaH - 6
    if aw < 40 or ah < 40 then return nil end
    if baseW <= 0 or baseH <= 0 then return nil end
    return math.clamp(math.min(aw / baseW, ah / baseH), 0.35, 3.0)
end
local ok4, err4 = pcall(function()
    -- nhân Offset nhưng GIỮ Scale -> layout tương đối không bị phá
    local u = mulUDim(UDim2.new(0, 100, 0.25, 40), 2)
    assert(u.X.Offset == 200 and u.Y.Scale == 0.25 and u.Y.Offset == 80, "mulUDim sai")
    -- GUI 300x200 trong tab 620x384 -> PHÓNG TO ~1.9 lần cho llen bằng menu
    local s = fit(300, 200, 620, 384)
    assert(s > 1.8 and s < 1.95, "GUI bé phải được phóng to, s="..tostring(s))
    -- chọn tỉ lệ nhỏ hơn trong 2 trục -> không méo hình
    assert(math.abs(fit(300, 100, 620, 384) - 614/300) < 0.01, "chọn trục chật hơn")
    -- GUI to hơn menu -> co lại
    assert(fit(4000, 3000, 620, 384) == 0.35, "GUI khổng lồ -> clamp 0.35")
    -- 1000x1000 trong tab 620x384 -> 378/1000 = 0.378 (vừa khít chiều cao, chưa chạm clamp)
    local s3 = fit(1000, 1000, 620, 384)
    assert(math.abs(s3 - 0.378) < 0.002, "co vua khit, s="..tostring(s3))
    -- 2000x2000 -> 0.189 nhưng clamp giữ 0.35 (không để GUI biến mất hẳn)
    assert(fit(2000, 2000, 620, 384) == 0.35, "clamp giữ GUI khổng lồ còn nhìn thấy")
    -- đã vừa sẵn -> s = 1, không sửa gì
    assert(math.abs(fit(614, 378, 620, 384) - 1) < 0.002, "đã vừa thì giữ nguyên")
    -- clamp 2 phía
    assert(fit(1, 1, 620, 384) == 3.0, "clamp max 3.0")
    assert(fit(99999, 99999, 620, 384) == 0.35, "clamp min 0.35")
    -- tab quá nhỏ -> không làm gì
    assert(fit(300, 200, 20, 20) == nil, "tab quá nhỏ -> nil")
    -- GUI full-screen (1,0,1,0) bất biến -> không bị biến dạng
    local full = mulUDim(UDim2.new(1, 0, 1, 0), 1.9)
    assert(full.X.Scale == 1 and full.X.Offset == 0, "UDim2 (1,0,1,0) bất biến")
end)
check("FitEmbedded: scale đều 2 chiều (vừa khít vùng tab)", ok4, err4)


print(string.format("\n=> %d pass / %d fail", pass, fail))
if fail > 0 then error("CÓ TEST FAIL") end
