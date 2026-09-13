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

------------------------------------------------------------------ mini layout engine (để test được chuyện co giãn)
local VIEW_W, VIEW_H = 1280, 720
local function absRect(o)
    local par = rawget(o, "_parent")
    local px, py, pw, ph = 0, 0, VIEW_W, VIEW_H
    if par then
        local r = absRect(par)
        px, py, pw, ph = r.x, r.y, r.w, r.h
    end
    local pos, sz = o.Position, o.Size
    local w = (sz.X.Scale or 0) * pw + (sz.X.Offset or 0)
    local h = (sz.Y.Scale or 0) * ph + (sz.Y.Offset or 0)
    local x = px + (pos.X.Scale or 0) * pw + (pos.X.Offset or 0)
    local y = py + (pos.Y.Scale or 0) * ph + (pos.Y.Offset or 0)
    local ap = rawget(o, "AnchorPoint") or o.AnchorPoint
    if ap and type(ap) == "table" then x, y = x - (ap.X or 0) * w, y - (ap.Y or 0) * h end
    return { x = x, y = y, w = w, h = h }
end

------------------------------------------------------------------ Instance giả
local function makeObj(cls, name)
    local o = {
        ClassName = cls, Name = name or cls, _children = {},
        _attrs = {}, _signals = {}, _defaults = {
            Visible = true, Enabled = true,
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
    for _, sn in ipairs({ "MouseButton1Click", "MouseButton1Down", "MouseButton1Up", "Activated",
                          "Changed", "MouseEnter", "MouseLeave", "FocusLost", "FocusReceived",
                          "InputBegan", "InputEnded" }) do
        o[sn] = { Connect = function(_, fn) return o:_on(sn, fn) end }
    end
    function o:WaitForChild(n) return o:FindFirstChild(n) end
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
            if k == "AbsolutePosition" then local r = absRect(t) return V2(r.x, r.y) end
            if k == "AbsoluteSize" then local r = absRect(t) return V2(r.w, r.h) end
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
                if changed and type(v) ~= "function" then
                    t:_fire("prop:" .. k)
                    if k == "Size" or k == "Position" then
                        t:_fire("prop:AbsoluteSize"); t:_fire("prop:AbsolutePosition")
                    end
                end
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
hubMain.Position, hubMain.Size = UDim2.new(0, 100, 0, 100), UDim2.new(0, 620, 0, 420)
targetGui = playerGui

game = makeObj("DataModel", "game")
game.Players = makeObj("Players", "Players")
game.Players.LocalPlayer = makeObj("LocalPlayer", "LocalPlayer")
game.Players.LocalPlayer.PlayerGui = playerGui
playerGui.Parent = game.Players.LocalPlayer
local hubGui = gui
hubGui.Parent = playerGui
function game:GetService(n)
    if n == "CoreGui" then return coreGui end
    if n == "Players" then return game.Players end
    return makeObj(n, n)
end
ReleaseHubFocus = function() end
Color3 = { fromRGB = function(r, g, bb) return { R = r, G = g, B = bb } end,
           fromHSV = function() return {} end }
Enum = setmetatable({}, { __index = function(_, e)
    return setmetatable({}, { __index = function() return { Name = "EnumItem" } end })
end })
workspace = makeObj("Workspace", "workspace")
workspace.CurrentCamera = nil
setclipboard = nil

------------------------------------------------------------------ stub cho các helper hub-level
-- (khối trích xuất dùng upvalue New/Corner/Stroke/trackConn của file hub)
function Corner(o, r)
    local c = Instance.new("UICorner")
    if r then c.CornerRadius = r end
    c.Parent = o
    return c
end
function Stroke(o, col, th)
    local st = Instance.new("UIStroke")
    if col then st.Color = col end
    if th then st.Thickness = th end
    st.Parent = o
    return st
end
function trackConn(c) return c end

------------------------------------------------------------------ task stub (hub có dùng task.delay cho re-fit)
task = {
    delay = function(_, fn) return fn end,     -- không chạy lại: test gọi SyncAllEmbeds trực tiếp
    spawn = function(fn) if type(fn) == "function" then pcall(fn) end end,
    defer = function(fn) if type(fn) == "function" then pcall(fn) end end,
    wait = function() return 0 end,
}

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
    -- mô hình thật: tabContent (ScrollingFrame) nằm trong main, embedHost phủ tab
    local sf = makeObj("ScrollingFrame", "Tab")
    sf.Position, sf.Size = UDim2.new(0, 0, 0, 36), UDim2.new(1, 0, 1, -36)
    sf.Parent = hubMain
    local host = makeObj("Frame", "ScriptHost")
    host.Position, host.Size = UDim2.new(0, 0, 0, 0), UDim2.new(1, 0, 1, 0)
    host.Parent = sf
    return host, sf
end
-- khung nội dung thật của tab (để test "nội dung có nằm trong tab không")
local function contentRect(host)
    local minX, minY, maxX, maxY = math.huge, math.huge, -math.huge, -math.huge
    local n = 0
    for _, ch in ipairs(host:GetChildren()) do
        if ch:IsA("GuiObject") then
            local r = absRect(ch)
            minX, minY = math.min(minX, r.x), math.min(minY, r.y)
            maxX, maxY = math.max(maxX, r.x + r.w), math.max(maxY, r.y + r.h)
            n = n + 1
        end
    end
    if n == 0 then return nil end
    return { x = minX, y = minY, w = maxX - minX, h = maxY - minY }
end
local function insideTab(host)
    local hr = absRect(host)
    local cr = contentRect(host)
    if not cr then return false end
    return cr.x >= hr.x - 1 and cr.y >= hr.y - 1
        and cr.x + cr.w <= hr.x + hr.w + 1
        and cr.y + cr.h <= hr.y + hr.h + 1
end
local function featGui(nFrames, nm)
    local g = REAL_NEW("ScreenGui"); g.Name = nm or "MyFeature"; g.Parent = playerGui
    for i = 1, nFrames do
        local f = REAL_NEW("Frame"); f.Name = "F" .. i
        f.Position = UDim2.new(0, 400, 0, 150)   -- hard-code, lệch hẳn khỏi góc
        f.Size = UDim2.new(0, 300, 0, 200)        -- nhỏ hơn tab -> bản 4.4b để lọt thỏm
        f.Parent = g
        local inner = REAL_NEW("Frame"); inner.Name = "Inner" .. i
        inner.Position = UDim2.new(0, 4, 0, 4)
        inner.Size = UDim2.new(0, 120, 0, 30)
        inner.Parent = f
        local lbl = REAL_NEW("TextLabel"); lbl.Name = "Title" .. i
        lbl.Position = UDim2.new(0, 8, 0, 8)
        lbl.Size = UDim2.new(1, -16, 0, 24)
        lbl.TextSize = 12
        lbl.Parent = f
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
check("layout lồng nhau còn nguyên (Inner1 vẫn là con F1)",
    root._children[1] ~= nil and root._children[1].Name == "Inner1")
check("registry có đúng 1 entry", #S.embeds == 1, #S.embeds)

print("[1b] v4.4c FIT: GUI phải LLEN BẰNG ô tab và không được tràn ra ngoài")
check("host.Size phủ tab (Scale=1)", embedded.Size.X.Scale == 1 and embedded.Size.Y.Scale == 1)
check("host.ClipsDescendants=true (phần dư không nhận click)", embedded.ClipsDescendants == true)
check("GUI 300x200 được PHÓNG TO (bản 4.4b để lọt thỏm)", root.Size.X.Offset > 300, root.Size.X.Offset)
local ratio = root.Size.X.Offset / root.Size.Y.Offset
check("tỉ lệ ngang/dọc giữ nguyên -> không méo hình",
    math.abs(ratio - 300 / 200) < 0.03, ratio)
check("TextSize cũng scale theo (chữ không bị teo tương đối)",
    root._children[2].TextSize > 12, root._children[2].TextSize)
check("Padding/UIStroke/inner scale đều: Inner1 rộng gấp đôi gốc",
    root._children[1].Size.X.Offset > 120, root._children[1].Size.X.Offset)
check("nội dung nằm trọn trong ô tab (không nuốt click ngoài tab)", insideTab(embedded))
local cr0 = contentRect(embedded)
-- hub chừa viền 6px có chủ đích (aw/ah = khổ tab - 6) -> "llen" là trong vòng 6px đó
check("nội dung llen ô tab (chừa viền 6px theo thiết kế)",
    math.abs(cr0.h - (absRect(host.Parent).h - 6)) <= 2, cr0.h .. " vs " .. (absRect(host.Parent).h - 6))
S.SyncAllEmbeds(); S.SyncAllEmbeds()
local cr1 = contentRect(embedded)
check("fit lại nhiều lần KHÔNG cộng dồn scale (idempotent)",
    math.abs(cr1.w - cr0.w) <= 1 and math.abs(cr1.h - cr0.h) <= 1, (cr1.w - cr0.w))

print("[1c] kéo menu to/nhỏ -> GUI của tab co giãn theo")
local h0 = cr1.h
hubMain.Size = UDim2.new(0, 900, 0, 620)
S.SyncAllEmbeds()
local cr2 = contentRect(embedded)
check("menu to ra -> GUI to theo", cr2.h > h0 + 10, h0 .. " -> " .. cr2.h)
check("vẫn trong tab sau khi to ra", insideTab(embedded))
hubMain.Size = UDim2.new(0, 460, 0, 280)
S.SyncAllEmbeds()
local cr3 = contentRect(embedded)
check("menu nhỏ lại -> GUI co lại", cr3.h < cr2.h - 10, cr2.h .. " -> " .. cr3.h)
check("vẫn trong tab sau khi nhỏ lại", insideTab(embedded))
hubMain.Size = UDim2.new(0, 620, 0, 420)
S.SyncAllEmbeds()

print("[1d] GUI đã full-screen (1,0,1,0): không bị biến dạng, không lặp vô hạn")
local host3 = tabArea()
local g3 = REAL_NEW("ScreenGui"); g3.Name = "FullGui"; g3.Parent = playerGui
local fr = REAL_NEW("Frame"); fr.Parent = g3
fr.Position, fr.Size = UDim2.new(0, 0, 0, 0), UDim2.new(1, 0, 1, 0)
local emb3 = S.EmbedGui(g3, host3)
check("Size vẫn là (1,0,1,0)", fr.Size.X.Scale == 1 and fr.Size.X.Offset == 0,
    fr.Size.X.Scale .. "," .. fr.Size.X.Offset)
check("Position vẫn (0,0,0,0)", fr.Position.X.Offset == 0 and fr.Position.Y.Offset == 0)
check("vừa khít tab, không tràn", insideTab(emb3))
S.SyncAllEmbeds()
check("fit lặp lại vẫn không tràn", insideTab(emb3))
S.ClearEmbedsUnder(host3)

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
check("Position gốc khôi phục (đã scale khi nhúng -> phải trả về đúng)", root.Position == origPos)
check("Size gốc khôi phục", root.Size == origSize)
check("TextSize gốc khôi phục", root._children[2].TextSize == 12, root._children[2].TextSize)
check("Inner gốc khôi phục", root._children[1].Size.X.Offset == 120, root._children[1].Size.X.Offset)
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

------------------------------------------------------------------ 10
print("[10] Code MẪU (nút 📋 Copy sinh ra) — biên dịch được, có SIZE CONTRACT")
local code = S.FeatureTemplate("Auto Farm", "🌾", "harness")
check("thay tên tính năng", code:find("Auto Farm") ~= nil and not code:find("__BC_NAME__"))
check("thay icon", code:find("🌾") ~= nil)
check("có khối SIZE CONTRACT", code:find("SIZE CONTRACT") ~= nil)
check("có khối FEATURE LOGIC cho người viết", code:find("FEATURE LOGIC") ~= nil)
check("dùng API hub nếu có", code:find("BananaCatHubAPI") ~= nil)
local nGui = select(2, code:gsub('Instance%.new%("ScreenGui"%)', ''))
check("1 gui menu + 1 gui overlay = ĐÚNG 2 lần Instance.new(\"ScreenGui\")", nGui == 2, nGui)
check("không quét PlayerGui/CoreGui bừa", not code:find('GetService%("CoreGui"%)'))
check("nhắc CẤMwhile true thiếu wait", code:find("task%.wait") ~= nil)
check("có khối OVERLAY ngoài màn hình", code:find("===== OVERLAY") ~= nil)
check("overlay dùng tên BCOV_ để hub không nhúng", code:find("BCOV_") ~= nil)
check("gọi API:MakeCrosshair nếu hub có", code:find("API and API.MakeCrosshair") ~= nil)
check("gọi API:NewOverlay nếu hub có", code:find("API and API.NewOverlay") ~= nil)
check("giải thích 2 tầng menu/overlay cho người nhận code",
    code:find("HAI TẦNG GIAO DIỆN") ~= nil and code:find("AIMBOT") == nil and code:find("Aimbot/FOV") ~= nil)
check("khối OVERLAY gọi ovGui() chứ không parent vào root",
    code:find("b.Parent = ovGui%(%)") ~= nil and code:find("box.Parent = ovGui%(%)") ~= nil)
check("bcClose() dọn cả overlay", code:find("if OV.gui then OV.gui:Destroy%(%)") ~= nil)
local fn, cerr = load(code, "feature_template", "t", _G)
check("code mẫu BIÊN DỊCH ĐƯỢC", fn ~= nil, cerr)

print("[11] chạy code mẫu: standalone -> bám khổ menu hub; có API -> dùng API")
if fn then
    local okRun, ret = pcall(fn)
    check("chạy thử không nổ lỗi", okRun, ret)
    check("trả về tên tính năng", ret == "Auto Farm", tostring(ret))
    local featGui2 = playerGui:FindFirstChild("Auto Farm")
    check("tạo ScreenGui tên 'Auto Farm' trong PlayerGui", featGui2 ~= nil)
    local r2 = featGui2 and featGui2:FindFirstChild("Root")
    check("có 1 root frame duy nhất", r2 ~= nil and featGui2 ~= nil)
    -- không có API: fallback đọc ScreenGui "ExMenu" của hub (hubMain 620x420 -> area 590x348)
    check("root size bám theo menu hub (590x348)",
        r2 and r2.Size.X.Offset == 590 and r2.Size.Y.Offset == 348,
        r2 and (r2.Size.X.Offset .. "x" .. r2.Size.Y.Offset))
    local beforeW = r2 and r2.Size.X.Offset
    hubMain.Size = UDim2.new(0, 900, 0, 620)   -- kéo menu rộng ra
    check("kéo menu to -> root to theo (qua AbsoluteSize)",
        r2 and r2.Size.X.Offset > beforeW + 10, beforeW .. " -> " .. (r2 and r2.Size.X.Offset))
    -- KÉO DÀI / KÉO RỘNG menu: root phải bám đúng khổ trong, KHÔNG giữ tỉ lệ thiết kế
    check("root = khổ menu trừ viền (870x548 khi menu 900x620)",
        r2 and r2.Size.X.Offset == 870 and r2.Size.Y.Offset == 548,
        r2 and (r2.Size.X.Offset .. "x" .. r2.Size.Y.Offset))
    local pnl = r2 and r2:FindFirstChild("Panel")
    check("widget bên trong GIỮ offset thiết kế 620x384 (hub mới là bên scale)",
        pnl and pnl.Position.X.Offset == 10 and pnl.Position.Y.Offset == 38,
        pnl and (pnl.Position.X.Offset .. "," .. pnl.Position.Y.Offset))
    hubMain.Size = UDim2.new(0, 620, 0, 420)

    print("[11b] code mẫu tạo overlay NGOÀI menu và hub KHÔNG được nhúng nó vào tab")
    local menuGuis = {}
    for _, c in ipairs(playerGui:GetChildren()) do
        if c:IsA("ScreenGui") then menuGuis[#menuGuis + 1] = c end
    end
    local ovGui
    for _, c in ipairs(menuGuis) do if c.Name:sub(1, 5) == "BCOV_" then ovGui = c end end
    check("có ScreenGui 'BCOV_Auto Farm' trong PlayerGui", ovGui ~= nil, ovGui and ovGui.Name)
    check("ovGui nằm ở PlayerGui (không phải trong tab)", ovGui and ovGui.Parent == playerGui)
    check("S.IsOverlayGui nhận ra overlay", S.IsOverlayGui(ovGui) == true)
    check("S.IsOverlayGui KHÔNG nhận menu gui", S.IsOverlayGui(featGui2) == false)
    check("crosshair đã vẽ trong overlay", ovGui and ovGui:FindFirstChild("BCCrosshair") ~= nil)
    local aimBtn = ovGui and ovGui:FindFirstChild("BCAimBtn")
    check("nút AIM on-screen tồn tại", aimBtn ~= nil)
    check("nút AIM kéo thả được", aimBtn and aimBtn.Draggable == true)
    -- ScanNewGuis (bắt GUI để nhúng) phải LOẠI overlay, chỉ lấy gui menu
    local before = {}
    local mine = { featGui2, ovGui }
    local found = ScanNewGuis(before, mine, false)
    check("ScanNewGuis chỉ nhận gui menu, bỏ overlay",
        #found == 1 and found[1] == featGui2, #found)
    -- overlay phải phủ toàn màn hình (không bị scale theo tab)
    check("overlay IgnoreGuiInset=true", ovGui and ovGui.IgnoreGuiInset == true)
end

print("[12] code mẫu khi CÓ API: TabArea + OnResize được dùng, và phủ khít khi hub nhúng")
local calls, fired = 0, 0
_G.BananaCatHubAPI = {
    Version = "test",
    Main = hubMain,
    TabArea = function(self, nm) calls = calls + 1; return V2(614, 378) end,
    OnResize = function(self, f)
        fired = fired + 1; _G.__bcTestCb = f
        return { Disconnect = function() _G.__bcDisconnected = (_G.__bcDisconnected or 0) + 1 end }
    end,
}
if fn then
    local okRun2 = pcall(fn)
    check("chạy lần 2 (có API) không nổ", okRun2)
    check("có gọi API:TabArea()", calls > 0, calls)
    check("đăng ký API:OnResize()", fired > 0, fired)
    local g3 = playerGui:FindFirstChild("Auto Farm")
    local list = {}
    for _, c in ipairs(playerGui._children) do
        if c.Name == "Auto Farm" then list[#list + 1] = c end
    end
    local root3 = list[#list] and list[#list]:FindFirstChild("Root")
    check("size lấy từ API (614x378)",
        root3 and root3.Size.X.Offset == 614 and root3.Size.Y.Offset == 378,
        root3 and (root3.Size.X.Offset .. "x" .. root3.Size.Y.Offset))
    -- hub nhúng root vào host (Frame) -> block phải tự phủ khít, không tự tính nữa
    local sf = makeObj("ScrollingFrame", "Tab"); sf.Parent = hubMain
    local hostF = makeObj("Frame", "ScriptHost"); hostF.Parent = sf
    if root3 then root3.Parent = hostF end
    if _G.__bcTestCb then _G.__bcTestCb(V2(614, 378)) end
    if type(_G.BC_FEATURES) == "table" and _G.BC_FEATURES["Auto Farm"] then
        _G.BC_FEATURES["Auto Farm"].Close()
        check("bcClose() ngắt OnResize connection (không leak callback)",
            (_G.__bcDisconnected or 0) > 0, _G.__bcDisconnected)
        check("bcClose() tắt GUI của tính năng",
            list[#list] and list[#list].Enabled == false, tostring(list[#list] and list[#list].Enabled))
    else
        check("có _G.BC_FEATURES[tên].Close", false, "thiếu registry")
        check("bcClose() ngắt OnResize connection (không leak callback)", false)
    end
    check("được nhúng -> root phủ (1,0,1,0)",
        root3 and root3.Size.X.Scale == 1 and root3.Size.X.Offset == 0,
        root3 and (root3.Size.X.Scale .. "," .. root3.Size.X.Offset))
    _G.BananaCatHubAPI = nil
end

------------------------------------------------------------------ 13
print("[13] API overlay phía hub: NewOverlay / MakeCrosshair / MakeScreenButton / CloseFeature")
local ov = S.NewOverlay("ManualTest", 7)
check("tên bắt đầu BCOV_ (hub bỏ qua, không nhúng)", ov.Name:sub(1, 5) == "BCOV_", ov.Name)
check("cha là PlayerGui (nằm ngoài menu)", ov.Parent == playerGui or ov.Parent == targetGui)
check("IgnoreGuiInset để canh giữa đúng", ov.IgnoreGuiInset == true)
check("S.IsOverlayGui = true (không bị bốc vào tab)", S.IsOverlayGui(ov) == true)
check("attribute BananaCatOverlay được gắn", ov:GetAttribute("BananaCatOverlay") == true)

local ch = S.MakeCrosshair(ov, { Style = "circle", Radius = 12, Gap = 4, Thickness = 2 })
check("MakeCrosshair trả handle có Root", ch and ch.Root ~= nil)
local ring = ch and ch.Root:FindFirstChild("Ring")
check("có Ring (vòng tròn)", ring ~= nil)
check("Ring 24x24 khi Radius=12", ring and ring.Size.X.Offset == 24 and ring.Size.Y.Offset == 24,
    ring and (ring.Size.X.Offset .. "x" .. ring.Size.Y.Offset))
check("Root = Ring + Gap*2 + Thickness", ch and ch.Root.Size.X.Offset == 24 + 8 + 2,
    ch and ch.Root.Size.X.Offset)
check("có UIStroke (nét vòng tròn)", ring and ring:FindFirstChildOfClass("UIStroke") ~= nil)
check("có Dot ở tâm", ch and ch.Root:FindFirstChild("Dot") ~= nil)
ch:SetSize(20)
check("SetSize(20) đổi Ring thành 40", ring.Size.X.Offset == 40, ring.Size.X.Offset)
ch:SetVisible(false)
check("SetVisible(false) ẩn được", ch.Root.Visible == false)
ch:Destroy()
check("Destroy dọn Frame", ch.Root.Parent == nil)

local clicks, downs, ups = 0, 0, 0
local sb = S.MakeScreenButton({
    Text = "AIM", Size = 60, OnClick = function() clicks = clicks + 1 end,
    OnDown = function() downs = downs + 1 end, OnUp = function() ups = ups + 1 end,
})
check("MakeScreenButton tạo nút (mặc định BCBtn)", sb and sb.Btn ~= nil and sb.Btn.Name == "BCBtn")
check("nút Draggable = kéo thả được", sb.Btn.Draggable == true)
check("nút Active + Selectable (nhận click)", sb.Btn.Active == true and sb.Btn.Selectable == true)
check("nút nằm trong overlay BCOV_", sb.Gui.Name:sub(1, 5) == "BCOV_")
sb.Btn:_fire("Activated")
check("OnClick chạy khi bấm", clicks == 1, clicks)
sb.Btn:_fire("InputBegan")
sb.Btn:_fire("InputEnded")
check("OnDown/OnUp có kết nối (không nổ)", downs + ups >= 0, "downs=" .. downs)
sb:Destroy()
check("Destroy dọn cả ScreenGui overlay", sb.Gui.Parent == nil)

-- CloseFeature: hub gọi bcClose() của script khi bấm ✕ / xóa tab
local code2 = S.FeatureTemplate("Farm Test", "🌾", "t")
local fn2 = assert(load(code2, "feature_tpl2", "t", _G))
fn2()
check("script tự đăng ký _G.BC_FEATURES[tên]", type(_G.BC_FEATURES) == "table"
    and _G.BC_FEATURES["Farm Test"] ~= nil)
check("CloseFeature tìm thấy và gọi được", S.CloseFeature("Farm Test") == true)
check("CloseFeature xóa khỏi registry", _G.BC_FEATURES["Farm Test"] == nil)
check("CloseFeature(tên lạ) trả false, không nổ", S.CloseFeature("Không Tồn Tại") == false)
local afterClose = playerGui:FindFirstChild("Farm Test")
check("menu gui bị tắt sau CloseFeature", afterClose == nil or afterClose.Enabled == false,
    afterClose and afterClose.Enabled)
local ovLeft
for _, c in ipairs(playerGui:GetChildren()) do
    if c.Name == "BCOV_Farm Test" then ovLeft = c end
end
check("overlay bị Destroy sau CloseFeature (không để lại vòng tròn)", ovLeft == nil)

print(string.format("\n=> %d pass / %d fail", pass, fail))
if fail > 0 then error("CÓ TEST FAIL") end
