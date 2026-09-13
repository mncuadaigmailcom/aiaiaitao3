-- Test TÍCH HỢP: chạy ĐÚNG code nhúng GUI trích từ file hub (embed_block.lua) với Roblox giả lập.
-- Kiểm tra: không Destroy GUI gốc · trả GUI về nguyên trạng · không ăn GUI của game ·
-- không đệ quy phá layout · chế độ 🧩 TẮT · prune leak · host tự co giãn.

------------------------------------------------------------------ type stubs (global, cho block nhìn thấy)
local function V2(x, y) return {X = x or 0, Y = y or 0} end
UDim2 = {new = function(sx, ox, sy, oy)
    return {X = {Scale = sx or 0, Offset = ox or 0}, Y = {Scale = sy or 0, Offset = oy or 0}}
end}
UDim = {new = function(s, o) return {Scale = s or 0, Offset = o or 0} end}
Vector2 = {new = function(x, y) return V2(x, y) end}
Vector3 = {new = function(x, y, z) return {X = x or 0, Y = y or 0, Z = z or 0} end}
math.clamp = function(v, lo, hi) if v < lo then return lo elseif v > hi then return hi end return v end

------------------------------------------------------------------ Instance giả
local function makeObj(cls, name)
    local o = {
        ClassName = cls, Name = name or cls, _children = {},
        _attrs = {}, _signals = {}, _defaults = {
            Visible = true, Enabled = true,
            AbsolutePosition = V2(0, 0), AbsoluteSize = V2(100, 100),
            Size = UDim2.new(0, 100, 0, 100), Position = UDim2.new(0, 0, 0, 0),
        },
    }
    local SUPER = {
        Frame = {"GuiObject","GuiBase2d","Instance"},
        ScrollingFrame = {"GuiObject","GuiBase2d","Instance"},
        CanvasGroup = {"GuiObject","GuiBase2d","Instance"},
        TextLabel = {"GuiObject","GuiBase2d","Instance"},
        TextButton = {"GuiButton","GuiObject","GuiBase2d","Instance"},
        TextBox = {"GuiInput","GuiButton","GuiObject","GuiBase2d","Instance"},
        ScreenGui = {"LayerCollector","DescendantFolder","Instance"},
        Frame_ = {},
        UIScale = {"UIComponent","Instance"},
        UIPadding = {"UIComponent","Instance"},
        Folder = {"DescendantFolder","Instance"},
    }
    function o:IsA(c)
        if c == cls then return true end
        for _, s in ipairs(SUPER[cls] or {}) do if s == c then return true end end
        return false
    end
    function o:GetChildren() return o._children end
    function o:GetFullName() return o.Name end
    function o:FindFirstChild(n)
        for _, c in ipairs(o._children) do if c.Name == n then return c end end
    end
    function o:FindFirstChildWhichIsA(c)
        for _, ch in ipairs(o._children) do if ch:IsA(c) then return ch end end
    end
    function o:FindFirstChildOfClass(c) return o:FindFirstChildWhichIsA(c) end
    function o:IsDescendantOf(p)
        local cur = o._parent
        while cur do if cur == p then return true end cur = cur._parent end
        return false
    end
    function o:SetAttribute(k, v) o._attrs[k] = v end
    function o:GetAttribute(k) return o._attrs[k] end
    function o:_fire(name)
        local sigs = o._signals[name]
        if sigs then for _, fn in ipairs(sigs) do pcall(fn) end end
    end
    function o:_on(name, fn)
        o._signals[name] = o._signals[name] or {}
        table.insert(o._signals[name], fn)
        return {Disconnect = function()
            local t = o._signals[name] or {}
            for i, f in ipairs(t) do if f == fn then table.remove(t, i) break end end
        end}
    end
    function o:GetPropertyChangedSignal(prop)
        local self = o
        return {
            Connect = function(_, fn) return self:_on("prop:" .. prop, fn) end,
        }
    end
    function o:Destroy()
        for _, c in ipairs({table.unpack(o._children)}) do c:Destroy() end
        local p = o._parent
        if p then
            for i, c in ipairs(p._children) do if c == o then table.remove(p._children, i) break end end
        end
        rawset(o, "_parent", nil)
        rawset(o, "_destroyed", true)
        o:_fire("Destroying")
    end
    o.Destroying = {Connect = function(_, fn) return o:_on("Destroying", fn) end}
    return setmetatable(o, {
        __index = function(t, k)
            if k == "Parent" then return rawget(t, "_parent") end
            local v = rawget(t, k)
            if v ~= nil then return v end
            return t._defaults and t._defaults[k]
        end,
        __newindex = function(t, k, v)
            if k == "Parent" then
                local old = t._parent
                if old then
                    for i, c in ipairs(old._children) do
                        if c == t then table.remove(old._children, i) break end
                    end
                end
                rawset(t, "_parent", v)
                if v then table.insert(v._children, t) end
                t:_fire("prop:Parent")
            else
                local changed = (t._defaults and t._defaults[k] ~= nil and t._defaults[k] ~= v)
                    or (t._defaults[k] == nil and rawget(t, k) ~= nil and rawget(t, k) ~= v)
                if t._defaults and t._defaults[k] ~= nil then t._defaults[k] = v else rawset(t, k, v) end
                if changed and type(v) ~= "function" then t:_fire("prop:" .. k) end
            end
        end,
    })
end

Instance = {new = function(cls, parent)
    local o = makeObj(cls)
    if parent then o.Parent = parent end
    return o
end}
local REAL_NEW = Instance.new

------------------------------------------------------------------ thế giới giả
playerGui = makeObj("PlayerGui", "PlayerGui")
local coreGui = makeObj("CoreGui", "CoreGui")
gui = makeObj("ScreenGui", "ExMenu")           -- ScreenGui của hub (block check `scr == gui`)
local hubMain = makeObj("Frame", "Main")
hubMain.Parent = gui
hubMain.AbsolutePosition, hubMain.AbsoluteSize = V2(100, 100), V2(435, 304)
targetGui = playerGui

game = makeObj("DataModel", "game")
game.Players = makeObj("Players", "Players")
game.Players.LocalPlayer = makeObj("LocalPlayer", "LocalPlayer")
game.Players.LocalPlayer.PlayerGui = playerGui
function game:GetService(n)
    if n == "CoreGui" then return coreGui end
    if n == "Players" then return game.Players end
    return makeObj(n, n)
end
ReleaseHubFocus = function() end

------------------------------------------------------------------ nạp code THẬT từ hub
HUBGUI = gui
local HUB = assert(load(EMBED_SRC, "embed_block", "t", _G))
local S, ScanNewGuis, ForceStretchToParent = HUB()

------------------------------------------------------------------ test helpers
local pass, fail = 0, 0
local function check(name, cond, extra)
    if cond then pass = pass + 1; print("  ✅ " .. name)
    else fail = fail + 1; print("  ❌ " .. name .. (extra and ("   << " .. tostring(extra)) or "")) end
end
local function tabArea()
    local sf = makeObj("ScrollingFrame", "Tab"); sf.Parent = gui
    local host = makeObj("Frame", "ScriptHost"); host.Parent = sf
    host.AbsoluteSize = V2(435, 304)
    return host
end
local function featGui(nFrames, nm)
    local g = REAL_NEW("ScreenGui"); g.Name = nm or "MyFeature"; g.Parent = playerGui
    for i = 1, nFrames do
        local f = REAL_NEW("Frame"); f.Name = "F" .. i
        f.Position = UDim2.new(0, 10 * i, 0, 20 * i)
        f.Size = UDim2.new(0, 300, 0, 200)
        f.Parent = g
        local inner = REAL_NEW("Frame"); inner.Name = "Inner" .. i
        inner.Position = UDim2.new(0, 4, 0, 4)
        inner.Size = UDim2.new(0, 120, 0, 30)
        inner.Parent = f
    end
    return g
end

------------------------------------------------------------------ 1
print("[1] S.EmbedGui — nhúng vào tab, KHÔNG phá GUI gốc")
local host = tabArea()
local g = featGui(2)
local root = g._children[1]
local origPos, origSize = root.Position, root.Size
local embedded = S.EmbedGui(g, host)
check("trả về host Frame", embedded ~= nil and embedded:IsA("Frame"))
check("host tên Embedded_MyFeature", embedded and embedded.Name == "Embedded_MyFeature")
check("2 frame con được mượn sang host", #embedded._children >= 2, #embedded._children)
check("ScreenGui GỐC không bị Destroy", g._destroyed ~= true)
check("ScreenGui GỐC vẫn ở PlayerGui", g.Parent == playerGui)
check("Position/Size frame con KHÔNG bị đổi", root.Position == origPos and root.Size == origSize)
check("layout lồng nhau còn nguyên (Inner1 vẫn là con F1)",
    root._children[1] ~= nil and root._children[1].Name == "Inner1")
check("registry có đúng 1 entry", #S.embeds == 1, #S.embeds)

print("[1b] host tự co giãn theo tab, không tạo UIScale trùng")
check("host.Size phủ tab (Scale=1)", embedded.Size.X.Scale == 1)
local us = embedded:FindFirstChild("BananaCatFitScale")
check("có UIScale BananaCatFitScale", us ~= nil)
check("scale CHỈ co (0.35 <= s <= 1) -> không tràn tab", us and us.Scale >= 0.35 and us.Scale <= 1, us and us.Scale)
check("host ClipsDescendants=true (phần tràn không nhận click)", embedded.ClipsDescendants == true)
local function countUs()
    local n = 0
    for _, c in ipairs(embedded._children) do if c.Name == "BananaCatFitScale" then n = n + 1 end end
    return n
end
S.FitEmbedded(embedded, g); S.FitEmbedded(embedded, g)
check("gọi lại không tạo UIScale thứ 2", countUs() == 1, countUs())

------------------------------------------------------------------ 2
print("[2] script tự tắt GUI -> host ẩn theo (bản cũ không làm được)")
g.Enabled = false
check("Enabled=false -> host.Visible=false", embedded.Visible == false, tostring(embedded.Visible))
g.Enabled = true
check("Enabled=true -> host.Visible=true", embedded.Visible == true)

------------------------------------------------------------------ 3
print("[3] S.ClearEmbedsUnder — trả GUI về NGUYÊN TRẠNG")
local n = S.ClearEmbedsUnder(host)
check("trả về 1 GUI", n == 1, n)
check("frame con về lại ScreenGui gốc", root.Parent == g)
check("Position gốc khôi phục", root.Position == origPos)
check("Size gốc khôi phục", root.Size == origSize)
check("host bị xóa khỏi tab", #host._children == 0, #host._children)
check("registry rỗng", #S.embeds == 0)
check("script vẫn dùng được GUI của nó", g.Parent == playerGui and g._destroyed ~= true)

------------------------------------------------------------------ 4
print("[4] ScanNewGuis — KHÔNG bốc GUI của game (nguyên nhân mất nút bắn)")
local before = {}
for _, c in ipairs(playerGui:GetChildren()) do before[c] = true end
for _, c in ipairs(coreGui:GetChildren()) do before[c] = true end
local shop = REAL_NEW("ScreenGui"); shop.Name = "ShopUI"; shop.Parent = playerGui
local shopFrame = REAL_NEW("Frame"); shopFrame.Parent = shop
local inGame = REAL_NEW("ScreenGui"); inGame.Name = "InGame"; inGame.Parent = playerGui
local igf = REAL_NEW("Frame"); igf.Parent = inGame
local coreUi = REAL_NEW("ScreenGui"); coreUi.Name = "GameCoreUI"; coreUi.Parent = coreGui
local cuf = REAL_NEW("Frame"); cuf.Parent = coreUi
local beforeCopy = {}
for k, v in pairs(before) do beforeCopy[k] = v end
local found = ScanNewGuis(before, {})
check("ShopUI vẫn còn nguyên trong PlayerGui", shop.Parent == playerGui and #shop._children == 1)
check("GUI trong CoreGui không bị quét", coreUi.Parent == coreGui and #coreUi._children == 1)
local foundGuess = ScanNewGuis(beforeCopy, {}, true)   -- bản snapshot riêng (ScanNewGuis có side-effect đánh dấu đã biết)
check("🕵 TẮT (mặc định): không nhận GUI lạ", #found == 0, "found=" .. #found)
check("🕵 BẬT: GUI lạ trong 0.6s đầu CÓ THỂ bị nhận (nên mới mặc định TẮT)", #foundGuess >= 1)
local mineGui = featGui(1, "HookedGui")
local before2 = {}
local found2 = ScanNewGuis(before2, {mineGui}, false)
check("GUI do hook bắt được thì NHẬN", #found2 == 1 and found2[1] == mineGui)

------------------------------------------------------------------ 5
print("[5] 🧩 Nhúng TẮT = hub không đụng gì cả")
S.embedEnabled = false
local host2, g2 = tabArea(), featGui(1, "SafeGui")
local root2 = g2._children[1]
check("EmbedGui trả nil", S.EmbedGui(g2, host2) == nil)
check("GUI vẫn ở PlayerGui, con không bị chuyển", g2.Parent == playerGui and root2.Parent == g2)
check("tab không nhận host rác", #host2._children == 0)
S.embedEnabled = true

------------------------------------------------------------------ 6
print("[6] không tự nhúng menu của hub / input rác")
local h3 = tabArea()
check("EmbedGui(gui của hub) -> nil", S.EmbedGui(gui, h3) == nil)
check("EmbedGui(nil) an toàn", S.EmbedGui(nil, h3) == nil)
check("EmbedGui(gui chưa có parent) an toàn", S.EmbedGui(makeObj("ScreenGui", "orphan"), h3) == nil)
check("EmbedGui(gui không có GuiObject con) không tạo host rỗng",
    S.EmbedGui((function() local x = REAL_NEW("ScreenGui"); x.Parent = playerGui; return x end)(), h3) == nil)
check("container đã chết -> nil", S.EmbedGui(featGui(1, "X"), makeObj("Frame", "dead")) == nil)

------------------------------------------------------------------ 7
print("[7] PruneEmbeds — hết cảnh host chết nằm lại mãi (fix leak _G bản cũ)")
local h4, g4 = tabArea(), featGui(1, "PruneMe")
S.EmbedGui(g4, h4)
check("1 entry sau khi nhúng", #S.embeds == 1)
g4:Destroy()
check("script Destroy GUI -> host bị gỡ khỏi tab", #S.embeds == 0 and #h4._children == 0)
local h5, g5 = tabArea(), featGui(1, "PruneMe2")
S.EmbedGui(g5, h5)
h5:Destroy()
S.PruneEmbeds()
check("host bị xóa từ ngoài -> PruneEmbeds dọn entry", #S.embeds == 0)

------------------------------------------------------------------ 8
print("[8] ForceStretchToParent — root-only (bản cũ sửa MỌI frame con)")
local rootF = REAL_NEW("Frame")
rootF.Size = UDim2.new(0, 300, 0, 200)
rootF.Position = UDim2.new(0, 50, 0, 50)
local ch = REAL_NEW("Frame"); ch.Parent = rootF
ch.Size = UDim2.new(0, 120, 0, 30); ch.Position = UDim2.new(0, 6, 0, 6)
local cs, cp = ch.Size, ch.Position
ForceStretchToParent(rootF)
check("root được ép phủ cha", rootF.Size.X.Scale == 1 and rootF.Position.X.Offset == 0)
check("frame CON không bị đụng tới", ch.Size == cs and ch.Position == cp)
ForceStretchToParent(rootF, 5)
check("maxDepth > 0 vẫn đệ quy (escape hatch)", ch.Size.X.Scale == 1)

------------------------------------------------------------------ 9
print("[9] chạy 2 tab song song: GUI của tab này không bị tab kia cướp")
local hostA, hostB = tabArea(), tabArea()
local gA, gB = featGui(1, "GuiA"), featGui(1, "GuiB")
S.EmbedGui(gA, hostA)
local beforeB = {}
for _, c in ipairs(playerGui:GetChildren()) do beforeB[c] = true end
S.EmbedGui(gB, hostB)
local rootA = gA._children[1]
local inA = false
for _, c in ipairs(hostA._children) do if c == rootA or c.Name == "Embedded_GuiA" then inA = true end end
check("frame của tab A vẫn nằm trong host A", inA)
check("mỗi tab có host riêng", #S.embeds == 2)
S.ClearEmbedsUnder(hostA)
check("tab B còn nguyên sau khi tab A dọn", gB.Parent == playerGui and #S.embeds == 1)

print(string.format("\n=> %d pass / %d fail", pass, fail))
if fail > 0 then error("CÓ TEST FAIL") end
