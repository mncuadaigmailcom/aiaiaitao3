--[[
    tests/tests.lua — BỘ TEST KIỂM TRA HÀNH VI của script.js (Banana Cat Hub).

    Chạy trong máy ảo Lua 5.4 (wasmoon) + tests/roblox-mock.lua, sau khi tests/run.js đã nạp
    thật file hub và export các biến local sang _G.__HUBTEST.

    Quy ước: mỗi test là 1 hàm; lỗi (error) = FAIL. Các hàm nhỏ: eq/nok/truthy.
--]]
local FILTER = ...
FILTER = type(FILTER) == "string" and FILTER or ""

local Mock = _G.Mock
local H = _G.__HUBTEST
local R = { pass = 0, fail = 0, failed = {} }

local function test(name, fn)
    if FILTER ~= "" and not tostring(name):lower():find(FILTER:lower(), 1, true) then return end
    local ok, err = pcall(fn)
    if ok then
        R.pass = R.pass + 1
        print(string.format("  ✅ %s", name))
    else
        R.fail = R.fail + 1
        R.failed[#R.failed + 1] = name .. " → " .. tostring(err)
        print(string.format("  ❌ %s\n       → %s", name, tostring(err)))
    end
end
local function eq(got, want, what)
    if got ~= want then
        error(string.format("%s: mong đợi [%s] nhưng nhận [%s]", tostring(what or "giá trị"),
            tostring(want), tostring(got)))
    end
end
local function near(got, want, tol, what)
    tol = tol or 0.001
    if type(got) ~= "number" or math.abs(got - want) > tol then
        error(string.format("%s: mong đợi ~%s (±%s) nhưng nhận %s", tostring(what), tostring(want), tostring(tol), tostring(got)))
    end
end
local function truthy(v, what) if not v then error(tostring(what or "giá trị") .. " phải truthy, nhận " .. tostring(v)) end end
local function falsy(v, what) if v then error(tostring(what or "giá trị") .. " phải falsy, nhận " .. tostring(v)) end end

local S = H.S
local D = H.D
local C = H.C

-- ---------- tiện ích ----------
local function cards()
    local out = {}
    for _, c in ipairs(D.hubList:GetChildren()) do
        if c.Name:sub(1, 8) == "HubCard_" then out[#out + 1] = c end
    end
    return out
end
local function card(name)
    for _, c in ipairs(cards()) do if c.Name == "HubCard_" .. name then return c end end
    return nil
end
-- v4.15: 2 khung điều khiển (📍 Định vị · 👣 Xem người chơi) đã CHUYỂN vào trang 👥 Người Chơi.
-- Hàm này tìm ở trang 👥 trước, rồi mới tìm trong danh sách Script Hub (để test cũ vẫn đọc được).
local function panelOf(name)
    local t = D.playerTab
    if t then
        local p = t:FindFirstChild(name)
        if p then return p end
    end
    return D.hubList:FindFirstChild(name)
end
local function findByClass(parent, cls)
    for _, d in ipairs(parent:GetDescendants()) do
        if d.ClassName == cls then return d end
    end
    return nil
end
local function btnWithText(parent, txt)
    for _, d in ipairs(parent:GetDescendants()) do
        if d.ClassName == "TextButton" and d.Text == txt then return d end
    end
    return nil
end
local function runBtnOf(cardFrame)
    -- nút chạy nằm bên phải thẻ: tìm TextButton có text bắt đầu bằng ▶/⚡/🎯/🔓/🚀...
    for _, d in ipairs(cardFrame:GetDescendants()) do
        if d.ClassName == "TextButton" and tostring(d.Text):match("^[▶⚡🎯🔓🔒🚀🧱👟🦘🪩]") then return d end
    end
    return nil
end
local function resetChar()
    local old = H.player.Character
    if old then pcall(function() old:Destroy() end) end
    local ch = Mock.makeCharacter(H.workspace)
    H.player.Character = ch
    pcall(function() Mock.fire(H.player, "CharacterAdded", ch) end)
    Mock.advance(0.05)
    return ch
end
local function action(id) return tostring(S.RunHubAction(id)) end
local function hum() return H.player.Character and H.player.Character:FindFirstChild("Humanoid") end
local function root() return H.player.Character and H.player.Character:FindFirstChild("HumanoidRootPart") end

print("\n── A. NẠP HUB & TÍNH NĂNG CŨ (không được mất) ─────────────────")

test("A1 · hub nạp xong: đủ trang, không mất trang nào", function()
    truthy(H.main, "cửa sổ chính")
    truthy(H.gui, "ScreenGui")
    -- 7 trang cố định lúc khởi động (💾 💻 📚 👥 🛠 ⚙️ ➕); trang 🧩 GUI Ngoài (99) tạo khi cần.
    eq(#H.tabs, 7, "số nút trang cố định trên rail")
    local names = {}
    for _, b in ipairs(H.tabs) do names[#names + 1] = tostring(b:GetAttribute("BCTabName")) end
    for _, need in ipairs({ "Code", "Code Đã Lưu", "Script Hub", "Người Chơi", "Hỗ Trợ", "Tạo Tính Năng", "Thiết Lập" }) do
        local hit = false
        for _, n in ipairs(names) do if n == need then hit = true end end
        truthy(hit, "thiếu trang: " .. need)
    end
end)

test("A2 · mở trang Script Hub có đủ 3 vùng (tìm kiếm, chip, danh sách)", function()
    truthy(D.hubTab, "trang Script Hub")
    truthy(D.hubSearchBox, "ô tìm kiếm")
    truthy(D.hubChips, "dãy chip")
    truthy(D.hubList, "danh sách thẻ")
    truthy(D.hubStatus, "dòng trạng thái")
    truthy(D.hubSrvPanel, "khung 🌐 SERVER (v4.6.3)")
end)

test("A3 · chạy code người dùng: OK và LỖI đều báo đúng", function()
    local ran = false
    H.RunCode("_G.__TEST_RAN = (1+1)", "test-ok", nil, 1, 0)
    Mock.advance(0.1)
    eq(_G.__TEST_RAN, 2, "code chạy và gán được biến")
    H.RunCode("this is not lua ~~~", "test-err", nil, 1, 0)
    Mock.advance(0.1)
    truthy(S.lastRunError, "phải ghi nhận lỗi lần chạy cuối")
end)

test("A4 · chuẩn hoá code: link trần / HttpGet trần / thiếu dấu ()", function()
    eq(S.NormalizeRunnable("https://x.com/a.lua"), 'loadstring(game:HttpGet("https://x.com/a.lua"))()', "link trần")
    eq(S.NormalizeRunnable('game:HttpGet("https://x.com/a.lua")'), 'loadstring(game:HttpGet("https://x.com/a.lua"))()', "HttpGet trần")
    eq(S.NormalizeRunnable('loadstring(game:HttpGet("https://x.com/a"))'),
        'loadstring(game:HttpGet("https://x.com/a"))()', "thiếu dấu ()")
end)

test("A5 · lưu/đọc đĩa: script + waypoint sống qua 'rejoin'", function()
    -- LƯU Ý: phải sửa TRÊN CÙNG bảng. Hub giữ `scripts` trong một local; gán `H.scripts = {}`
    -- chỉ đổi tham chiếu ở phía test, hub vẫn nhìn bảng cũ -> test báo sai.
    local function refill(t, rows)
        for i = #t, 1, -1 do table.remove(t, i) end
        for _, r in ipairs(rows) do table.insert(t, r) end
    end
    refill(H.scripts, { { name = "sp", code = "print(1)", expanded = false } })
    refill(H.waypoints, { { name = "wp", pos = Vector3.new(1, 2, 3) } })   -- đúng định dạng: {name, pos}
    truthy(H.Store.canWrite(), "executor mock có writefile thật")
    H.Store.save()
    local raw = Mock.files["banana_cat_saved.json"]
    truthy(raw and #raw > 10, "file JSON được ghi")
    refill(H.scripts, {}); refill(H.waypoints, {})
    H.Store.load()
    -- Store.load() GÁN LẠI local (scripts = sOut) -> phải đọc qua getter
    eq(#H.getScripts(), 1, "script được đọc lại")
    eq(#H.getWaypoints(), 1, "waypoint được đọc lại")
    eq(H.getScripts()[1].code, "print(1)", "nội dung script đúng")
    eq(H.getWaypoints()[1].pos.X, 1, "toạ độ waypoint đúng")
end)

test("A6 · thao tác nội bộ Script Hub trả kết quả (không rỗng)", function()
    local a = action("crosshair"); truthy(#a > 3, "crosshair")
    action("crosshair")                       -- tắt lại
    local b = action("prune"); truthy(#b > 3, "prune")
    local c = action("unpark"); truthy(#c > 3, "unpark")
    local d = action("fixmouse"); truthy(#d > 3, "fixmouse")
    local e = action("getjobid"); truthy(#e > 3 and e:find("aaaaaaaa"), "getjobid: " .. e)
end)

test("A7 · 🌐 Hop server: gọi HTTP + teleport, trả thông báo", function()
    Mock.teleports = {}
    local msg = action("hopserver")
    truthy(#msg > 3, "có thông báo: " .. msg)
    eq(#Mock.teleports, 1, "đã gọi teleport 1 lần")
end)

test("A8 · dựng lại danh sách 2 lần KHÔNG nhân đôi thẻ", function()
    S.hubSearch = ""
    S.hubCat = "Tất cả"
    S.RebuildHubList()
    local n1 = #cards()
    S.RebuildHubList()
    local n2 = #cards()
    eq(n2, n1, "số thẻ sau khi dựng lại")
    truthy(n1 >= 11, "phải còn đủ 11 thẻ cũ (hiện có " .. n1 .. ")")
end)

test("A9 · lọc theo chip + tìm kiếm vẫn hoạt động", function()
    S.hubCat = "Server"; S.RebuildHubList()
    eq(#cards(), 3, "chip Server lọc đúng 3 thẻ")
    S.hubCat = "Tất cả"; S.hubSearch = "dex"; S.RebuildHubList()
    eq(#cards(), 1, "tìm 'dex' ra 1 thẻ")
    S.hubSearch = ""; S.RebuildHubList()
end)

test("A10 · 3 công tắc header 🧩/🕵/🪟 BẤM ĐƯỢC (không chết vì biến global)", function()
    -- v4.11 tuyên bố đã sửa lỗi này; test này kiểm chứng TẬN GỐC bằng cách bấm thật.
    local before = S.embedEnabled
    local sw = D.hdrSwitches and D.hdrSwitches["embed"]
    truthy(sw and sw.btn, "có công tắc 🧩 trên header")
    Mock.click(sw.btn)
    eq(S.embedEnabled, not before, "bấm 🧩 phải đổi trạng thái S.embedEnabled")
    Mock.click(sw.btn)
    eq(S.embedEnabled, before, "bấm lần 2 phải trở lại")
end)

test("A11 · hub không rò rỉ biến global", function()
    falsy(_G.BcFit, "BcFit phải là local (v4.12)")
    falsy(rawget(_G, "S"), "không được tạo global S")
end)

print("\n── B. BỘ DI CHUYỂN MỚI (port từ aiaiaitao3) ────────────────")

test("B1 · S.Move tồn tại với đủ thông số", function()
    truthy(S.Move, "S.Move")
    local m = S.Move
    eq(type(m.SetFly), "function", "SetFly")
    eq(type(m.SetNoclip), "function", "SetNoclip")
    eq(type(m.SetInfJump), "function", "SetInfJump")
    eq(type(m.SetSpeed), "function", "SetSpeed")
    eq(type(m.SetCarpet), "function", "SetCarpet")
    eq(type(m.SetCarpetSize), "function", "SetCarpetSize")
    truthy(type(m.flySpeed) == "number", "flySpeed")
    truthy(type(m.carpetW) == "number", "carpetW")
    truthy(type(m.carpetH) == "number", "carpetH")
    truthy(type(m.carpetL) == "number", "carpetL")
end)

test("B2 · Script Hub có 6 thẻ di chuyển, đúng phân loại 'Di chuyển'", function()
    local names = { "Nhảy Vô Hạn", "Xuyên Tường", "Bay", "Chạy Trên Thảm", "Thảm Kính" }
    for _, nm in ipairs(names) do
        local found
        for _, it in ipairs(S.ScriptHubList) do
            if it.name == nm then found = it end
        end
        truthy(found, "thiếu thẻ: " .. nm)
        eq(found.cat, "Di chuyển", "phân loại của " .. nm)
        truthy(found.action, "thẻ " .. nm .. " phải có action nội bộ (không tải từ mạng)")
    end
end)

test("B3 · có chip lọc 'Di chuyển' và lọc ra đúng số thẻ của nhóm", function()
    truthy(D.hubChipBtns["Di chuyển"], "chip Di chuyển")
    local n = 0
    for _, it in ipairs(S.ScriptHubList) do if it.cat == "Di chuyển" then n = n + 1 end end
    truthy(n >= 6, "nhóm Di chuyển phải có >= 6 thẻ (thêm 🛡 Bay An Toàn): " .. n)
    S.hubCat = "Di chuyển"; S.RebuildHubList()
    eq(#cards(), n, "chip Di chuyển lọc đúng " .. n .. " thẻ")
    S.hubCat = "Tất cả"; S.RebuildHubList()
end)

test("B4 · panel tuỳ chỉnh nằm trong Script Hub và sống sót qua mỗi lần lọc", function()
    local p = D.hubList:FindFirstChild("HubMove_Panel")
    truthy(p, "panel HubMove_Panel")
    S.RebuildHubList(); S.RebuildHubList()
    truthy(D.hubList:FindFirstChild("HubMove_Panel"), "panel không bị xoá khi dựng lại danh sách")
end)

test("B5 · CanvasSize của danh sách đã tính cả panel tuỳ chỉnh", function()
    S.hubCat = "Tất cả"; S.RebuildHubList()
    local h = D.hubList.CanvasSize and D.hubList.CanvasSize.Y.Offset or 0
    local panel = D.hubList:FindFirstChild("HubMove_Panel")
    truthy(panel, "có panel")
    truthy(h >= #cards() * 62 + panel.Size.Y.Offset, string.format(
        "CanvasSize (%d) phải >= tổng chiều cao thẻ + panel (%d)", h, #cards() * 62 + panel.Size.Y.Offset))
end)

test("B6 · 🚀 BAY: tạo BodyVelocity/BodyGyro, thay đổi theo tốc độ, tắt thì dọn", function()
    local ch = resetChar()
    action("fly")
    Mock.advance(0.1)
    truthy(S.Move.fly, "trạng thái bay = true")
    local bv = findByClass(ch, "BodyVelocity")
    truthy(bv, "có BodyVelocity trong nhân vật")
    truthy(findByClass(ch, "BodyGyro"), "có BodyGyro")
    -- đứng yên (MoveDirection = 0) -> vận tốc gần 0
    Mock.advance(0.05)
    near(bv.Velocity.Magnitude, 0, 1.5, "đứng yên thì vận tốc ~0")
    -- đi tới (MoveDirection = 0,0,-1) -> vận tốc = flySpeed
    hum().MoveDirection = Vector3.new(0, 0, -1)
    Mock.advance(0.05)
    near(bv.Velocity.Magnitude, S.Move.flySpeed, 2, "bay đúng tốc độ đã đặt")
    -- đổi tốc độ
    S.Move.flySpeed = 100
    Mock.advance(0.05)
    near(bv.Velocity.Magnitude, 100, 2, "đổi tốc độ bay có hiệu lực ngay")
    S.Move.flySpeed = 50
    action("fly")
    Mock.advance(0.05)
    falsy(S.Move.fly, "tắt bay")
    falsy(findByClass(ch, "BodyVelocity"), "BodyVelocity bị dọn")
end)

test("B7 · 🧱 XUYÊN TƯỜNG: tắt đúng CanCollide gốc (không gán cứng true)", function()
    local ch = resetChar()
    local hat = ch:FindFirstChild("HatPart")
    eq(hat.CanCollide, false, "phụ kiện có CanCollide=false từ đầu")
    eq(root().CanCollide, true, "thân có CanCollide=true từ đầu")
    action("noclip")
    Mock.advance(0.1)
    truthy(S.Move.noclip, "trạng thái = true")
    for _, p in ipairs(ch:GetDescendants()) do
        if p:IsA("BasePart") then eq(p.CanCollide, false, "part " .. p.Name .. " phải xuyên được") end
    end
    -- nhân vật mọc thêm part khi đang bật (respawn/phụ kiện mới) cũng phải xuyên
    local extra = Instance.new("Part"); extra.Name = "Extra"; extra.CanCollide = true; extra.Parent = ch
    Mock.advance(0.1)
    eq(extra.CanCollide, false, "part mới sinh ra cũng bị xuyên")
    action("noclip")
    Mock.advance(0.1)
    falsy(S.Move.noclip, "đã tắt")
    eq(root().CanCollide, true, "thân trở lại CanCollide=true")
    eq(hat.CanCollide, false, "⛔ phụ kiện phải GIỮ nguyên false (lỗi của aiaiaitao3 gán cứng true)")
end)

test("B8 · 🦘 NHẢY VÔ HẠN: JumpRequest -> ChangeState(Jumping)", function()
    local ch = resetChar()
    local h = hum()
    h._state = nil
    action("infjump")
    Mock.advance(0.05)
    truthy(S.Move.infJump, "trạng thái = true")
    Mock.fire(H.UserInputService, "JumpRequest")
    eq(h._state, Enum.HumanoidStateType.Jumping, "phát lệnh nhảy")
    action("infjump")
    h._state = nil
    Mock.fire(H.UserInputService, "JumpRequest")
    eq(h._state, nil, "tắt rồi thì không nhảy vô hạn nữa")
end)

test("B9 · 👟 CHẠY ĐỘ + lực nhảy: áp đúng và trả lại mặc định", function()
    S.Move.StopAll(); Mock.advance(0.05)          -- toggle: phải chắc chắn đang TẮT
    local ch = resetChar()
    local h = hum()
    eq(h.WalkSpeed, 16, " WalkSpeed mặc định")
    S.Move.speedMode = "num"                      -- test này dùng tốc độ CỐ ĐỊNH
    S.Move.walkSpeed = 120
    S.Move.jumpPower = 200
    action("speed")
    Mock.advance(0.05)
    eq(h.WalkSpeed, 120, "WalkSpeed đã áp")
    eq(h.JumpPower, 200, "JumpPower đã áp")
    action("speed")
    Mock.advance(0.05)
    eq(h.WalkSpeed, 16, "tắt thì về 16")
    eq(h.JumpPower, 50, "tắt thì lực nhảy về 50")
    S.Move.speedMode = "x"                        -- trả lại chế độ mặc định (theo game)
end)

test("B10 · 🪩 THẢM KÍNH: tạo đúng kích thước Rộng×Cao×Dài, đổi được, đi theo người", function()
    local ch = resetChar()
    S.Move.SetCarpetSize(6, 0.5, 8)
    action("carpet")
    Mock.advance(0.1)
    truthy(S.Move.carpet, "trạng thái = true")
    local cp = H.workspace:FindFirstChild("Carpet")
    truthy(cp, "có Part tên Carpet trong workspace")
    eq(cp.Size.X, 6, "Rộng")
    eq(cp.Size.Y, 0.5, "Cao")
    eq(cp.Size.Z, 8, "Dài")
    -- đổi kích thước từ panel: phải cập nhật NGAY, không cần tạo lại
    S.Move.SetCarpetSize(10, 1, 12)
    Mock.advance(0.1)
    eq(cp.Size.X, 10, "Rộng mới"); eq(cp.Size.Y, 1, "Cao mới"); eq(cp.Size.Z, 12, "Dài mới")
    -- thảm đi theo người chơi
    root().Position = Vector3.new(25, 5, -30)
    Mock.advance(0.1)
    cp = H.workspace:FindFirstChild("Carpet") or cp
    eq(cp.CFrame.Position.X, 25, "thảm bám theo X")
    eq(cp.CFrame.Position.Z, -30, "thảm bám theo Z")
    -- tắt
    action("carpet")
    Mock.advance(0.05)
    falsy(S.Move.carpet, "đã tắt")
    falsy(H.workspace:FindFirstChild("Carpet"), "thảm bị dọn khỏi workspace")
end)

test("B11 · thảm + xuyên tường: người được giữ trên mặt thảm", function()
    local ch = resetChar()
    S.Move.SetCarpetSize(6, 0.5, 6)
    action("noclip"); action("carpet")
    Mock.advance(0.2)
    local cp = H.workspace:FindFirstChild("Carpet")
    truthy(cp, "có thảm")
    truthy(S.Move.carpetY, "có độ cao thảm")
    -- thả người xuống dưới mặt thảm -> phải được đẩy lên
    root().Position = Vector3.new(0, S.Move.carpetY - 5, 0)
    root().CFrame = CFrame.new(0, S.Move.carpetY - 5, 0)
    Mock.advance(0.2)
    truthy(root().Position.Y >= S.Move.carpetY, string.format(
        "người phải nằm trên mặt thảm (Y=%s, mặt thảm=%s)", tostring(root().Position.Y), tostring(S.Move.carpetY)))
    action("carpet"); action("noclip")
    Mock.advance(0.05)
end)

test("B12 · sống qua respawn: tự bật lại những gì đang bật", function()
    S.Move.StopAll(); Mock.advance(0.05)
    local ch = resetChar()
    S.Move.speedMode = "num"
    S.Move.walkSpeed = 80
    action("noclip"); action("speed"); action("fly")
    Mock.advance(0.1)
    truthy(findByClass(ch, "BodyVelocity"), "có bay trước khi respawn")
    -- respawn: nhân vật mới
    local ch2 = resetChar()
    Mock.advance(0.3)
    truthy(findByClass(ch2, "BodyVelocity"), "bay được bật lại sau respawn")
    eq(ch2:FindFirstChild("HumanoidRootPart").CanCollide, false, "xuyên tường được bật lại")
    eq(ch2:FindFirstChild("Humanoid").WalkSpeed, 80, "chạy độ được áp lại")
    S.Move.speedMode = "x"

    -- thảm riêng: bay và thảm KHÔNG đi cùng (như bản gốc), bật thảm sẽ tắt bay
    S.Move.StopAll(); Mock.advance(0.05)
    local ch3 = resetChar()
    S.Move.SetCarpetSize(6, 0.5, 6)
    action("carpet")
    Mock.advance(0.1)
    truthy(H.workspace:FindFirstChild("Carpet"), "có thảm trước khi respawn")
    local ch4 = resetChar()
    Mock.advance(0.3)
    truthy(H.workspace:FindFirstChild("Carpet"), "thảm được tạo lại sau respawn")
    S.Move.StopAll()
    Mock.advance(0.1)
end)

test("B13 · StopAll() dọn sạch mọi thứ", function()
    local ch = resetChar()
    action("fly"); action("noclip"); action("speed"); action("infjump"); action("carpet")
    Mock.advance(0.1)
    S.Move.StopAll()
    Mock.advance(0.1)
    falsy(S.Move.fly or S.Move.noclip or S.Move.speed or S.Move.infJump or S.Move.carpet, "mọi cờ = false")
    falsy(findByClass(ch, "BodyVelocity"), "không còn BodyVelocity")
    falsy(H.workspace:FindFirstChild("Carpet"), "không còn thảm")
    eq(ch:FindFirstChild("HumanoidRootPart").CanCollide, true, "CanCollide thân trở lại true")
end)

test("B14 · nhãn nút trên thẻ phản ánh đúng trạng thái BẬT/TẮT", function()
    local ch = resetChar()
    S.hubCat = "Di chuyển"; S.RebuildHubList()
    local c = card("Bay")
    truthy(c, "có thẻ Bay")
    local b1 = runBtnOf(c)
    truthy(b1, "có nút chạy trên thẻ")
    local t1 = b1.Text
    Mock.click(b1)                       -- bật
    S.RebuildHubList()
    local b2 = runBtnOf(card("Bay"))
    truthy(tostring(b2.Text):find("TẮT") or tostring(b2.Text):find("BẬT"), "nhãn có chữ trạng thái, nhận: " .. tostring(b2.Text))
    truthy(b1.Text ~= b2.Text or tostring(b2.Text):find("TẮT"), "nhãn đổi sau khi bấm: " .. t1 .. " -> " .. b2.Text)
    S.Move.StopAll()
    S.hubCat = "Tất cả"; S.RebuildHubList()
end)

test("B15 · bấm nút trên thẻ thật sự bật/tắt được tính năng", function()
    local ch = resetChar()
    S.hubCat = "Di chuyển"; S.RebuildHubList()
    local before = S.Move.noclip
    local b = runBtnOf(card("Xuyên Tường"))
    truthy(b, "có nút chạy thẻ Xuyên Tường")
    Mock.click(b)
    eq(S.Move.noclip, not before, "bấm thẻ đổi trạng thái")
    Mock.click(runBtnOf(card("Xuyên Tường")) or b)
    S.Move.StopAll()
    S.hubCat = "Tất cả"; S.RebuildHubList()
end)

print("\n── D. KHUNG ⚙ TUỲ CHỈNH & TRƯỜNG HỢP NGOẠI LỆ ─────────────")

local function movePanel()
    return D.hubList:FindFirstChild("HubMove_Panel")
end
local function panelBoxes()
    local t = {}
    for _, d in ipairs(movePanel():GetDescendants()) do
        if d.ClassName == "TextBox" then t[#t + 1] = d end
    end
    return t           -- thứ tự tạo: bay, chạy, nhảy, rộng, cao, dài
end
local function panelBtns()
    local t = {}
    for _, d in ipairs(movePanel():GetDescendants()) do
        if d.ClassName == "TextButton" then t[#t + 1] = d end
    end
    return t           -- ✔ , ✔ , ⬆ Nâng, ⬇ Hạ, 🛑 Tắt hết (+ nút mới thêm sau)
end
-- v4.22: tìm nút theo CHỮ thay vì đếm cứng vị trí (thêm nút mới là test cũ gãy oan)
local function panelBtnWith(txt)
    for _, d in ipairs(movePanel():GetDescendants()) do
        if d.ClassName == "TextButton" and tostring(d.Text):find(txt, 1, true) then return d end
    end
    return nil
end

test("D1 · ô nhập trong khung ⚙: đổi tốc độ bay / chạy / nhảy", function()
    local b = panelBoxes()
    eq(#b, 7, "có đúng 7 ô nhập (bay, chạy, nhảy, rộng, cao, dài, cách chân)")
    b[1].Text = "120"; b[2].Text = "88"; b[3].Text = "160"
    Mock.click(panelBtns()[1])                       -- nút ✔ hàng 1
    eq(S.Move.flySpeed, 120, "tốc độ bay")
    eq(S.Move.walkSpeed, 88, "tốc độ chạy")
    eq(S.Move.jumpPower, 160, "lực nhảy")
    -- nhập rác: phải giữ nguyên giá trị cũ, không crash
    b[1].Text = "abc"
    Mock.click(panelBtns()[1])
    eq(S.Move.flySpeed, 120, "nhập chữ thì giữ nguyên")
    -- ngoài giới hạn: bị kẹp
    b[1].Text = "99999"
    Mock.click(panelBtns()[1])
    eq(S.Move.flySpeed, 120, "vượt quá 500 thì không nhận")
    S.Move.flySpeed, S.Move.walkSpeed, S.Move.jumpPower = 50, 16, 50
    S.Move.speedMode = "x"; S.Move.speedMul = 3        -- trả lại mặc định (theo game ×3)
end)

test("D2 · ô nhập thảm: Rộng × Cao × Dài đổi được cả khi thảm đang TẮT", function()
    local b = panelBoxes()
    b[4].Text = "12"; b[5].Text = "1"; b[6].Text = "20"
    Mock.click(panelBtns()[2])                       -- nút ✔ hàng 2
    eq(S.Move.carpetW, 12, "Rộng"); eq(S.Move.carpetH, 1, "Cao"); eq(S.Move.carpetL, 20, "Dài")
    eq(b[4].Text, "12", "ô nhập hiển thị lại giá trị đã kẹp")
    local ch = resetChar()
    action("carpet")
    Mock.advance(0.1)
    local cp = H.workspace:FindFirstChild("Carpet")
    truthy(cp, "có thảm")
    eq(cp.Size.X, 12, "thảm dùng đúng kích thước vừa nhập"); eq(cp.Size.Y, 1, "Cao"); eq(cp.Size.Z, 20, "Dài")
    S.Move.StopAll(); Mock.advance(0.05)
    S.Move.SetCarpetSize(6, 0.5, 6)
    S.hubCat = "Tất cả"; S.RebuildHubList()
end)

test("D3 · ⬆ Nâng / ⬇ Hạ đổi độ cao thảm", function()
    local ch = resetChar()
    action("carpet")
    Mock.advance(0.1)
    local y0 = S.Move.carpetY
    truthy(y0, "có độ cao thảm")
    Mock.click(panelBtnWith("Nâng"))                 -- ⬆
    near(S.Move.carpetY, y0 + 2.5, 1e-6, "nâng 2.5")
    Mock.click(panelBtnWith("Hạ"))                   -- ⬇
    near(S.Move.carpetY, y0, 1e-6, "hạ về chỗ cũ")
    S.Move.StopAll(); Mock.advance(0.05)
end)

test("D4 · 🛑 Tắt hết trong khung ⚙ tắt được tất cả", function()
    local ch = resetChar()
    action("fly"); action("noclip"); action("infjump"); action("speed")
    Mock.advance(0.1)
    Mock.click(panelBtnWith("Tắt hết"))
    Mock.advance(0.1)
    falsy(S.Move.fly or S.Move.noclip or S.Move.infJump or S.Move.speed or S.Move.carpet, "mọi cờ false")
    eq(findByClass(ch, "BodyVelocity"), nil, "không còn BodyVelocity")
end)

test("D5 · bật/tắt khi CHƯA có nhân vật: báo rõ, không crash", function()
    local old = H.player.Character
    H.player.Character = nil
    local nerr = #Mock.errors
    for _, id in ipairs({ "fly", "carpet" }) do
        local msg = action(id)
        truthy(tostring(msg):find("chưa có nhân vật"), id .. " phải báo 'chưa có nhân vật', nhận: " .. msg)
    end
    -- các tính năng không cần nhân vật vẫn bình thường
    action("infjump"); action("infjump")
    eq(#Mock.errors, nerr, "không sinh lỗi runtime")
    H.player.Character = old or Mock.makeCharacter(H.workspace)
end)

test("D6 · StopAll() khi chưa bật gì cũng không lỗi", function()
    local nerr = #Mock.errors
    S.Move.StopAll()
    Mock.advance(0.05)
    eq(#Mock.errors, nerr, "không lỗi")
    falsy(S.Move.carpet or S.Move.fly, "vẫn ở trạng thái tắt")
end)

test("D7 · tìm kiếm tiếng Việt có dấu vẫn ra thẻ di chuyển", function()
    S.hubCat = "Tất cả"
    S.hubSearch = "thảm"; S.RebuildHubList()
    truthy(card("Thảm Kính"), "tìm 'thảm' ra thẻ Thảm Kính")
    S.hubSearch = "xuyên"; S.RebuildHubList()
    truthy(card("Xuyên Tường"), "tìm 'xuyên' ra thẻ Xuyên Tường")
    S.hubSearch = ""; S.RebuildHubList()
end)

test("D8 · bấm thật chip 'Di chuyển' lọc đúng", function()
    local chip = D.hubChipBtns["Di chuyển"]
    truthy(chip, "có chip")
    Mock.click(chip)
    eq(S.hubCat, "Di chuyển", "chip đổi bộ lọc")
    local n = 0
    for _, it in ipairs(S.ScriptHubList) do if it.cat == "Di chuyển" then n = n + 1 end end
    eq(#cards(), n, "đúng " .. n .. " thẻ di chuyển")
    Mock.click(D.hubChipBtns["Tất cả"])
    eq(S.hubCat, "Tất cả", "trở lại Tất cả")
    truthy(#cards() >= 16, "có đủ thẻ cũ + mới: " .. #cards())
end)

test("D9 · mở mọi trang không lỗi (BcFit đã là local)", function()
    local nerr = #Mock.errors
    for i = 1, #H.tabs do
        H.SwitchTab(i)
        Mock.advance(0.02)
    end
    eq(#Mock.errors, nerr, "không lỗi khi chuyển trang: " .. table.concat(Mock.errors, " | "))
    falsy(rawget(_G, "BcFit"), "BcFit vẫn không bị rò rỉ ra global")
end)

test("D10 · bật/tắt 20 lần không rò rỉ connection", function()
    local ch = resetChar()
    local before = #(_G.BananaCatHub_Connections or {})
    for i = 1, 20 do
        action("noclip"); action("infjump")
    end
    S.Move.StopAll()
    local after = #(_G.BananaCatHub_Connections or {})
    truthy(after - before <= 2, string.format("số connection chỉ được tăng <=2 (trước %d, sau %d)", before, after))
end)


print("\n── E. CHẠY TRÊN THẢM + NÚT NỔI TRÊN MÀN HÌNH ─────────────")

local function hud()
    return H.gui:FindFirstChild("BC_MoveHud", true)
end
local function cleanStart()
    S.Move.StopAll()          -- tránh tình trạng test trước để lại cờ đang BẬT -> action() tắt nhầm
    Mock.advance(0.05)
    return resetChar()
end
local function hudBtn(txt)
    local h = hud()
    if not h then return nil end
    for _, d in ipairs(h:GetDescendants()) do
        if d.ClassName == "TextButton" and d.Text == txt then return d end
    end
    return nil
end

test("E1 · 🏃 Chạy Trên Thảm: bật = có thảm + tăng tốc (theo game ×3) + HUD hiện", function()
    S.Move.StopAll(); Mock.advance(0.05)
    local ch = resetChar()
    S.Move.speedMode, S.Move.speedMul = "x", 3
    local msg = action("runmode")
    Mock.advance(0.1)
    truthy(S.Move.runMode, "cờ chế độ chạy")
    truthy(tostring(msg):find("BẬT"), "thông báo BẬT: " .. msg)
    truthy(H.workspace:FindFirstChild("Carpet"), "có thảm kính dưới chân")
    eq(ch:FindFirstChild("Humanoid").WalkSpeed, 48, "tốc độ = game 16 × 3")
    truthy(hud(), "có HUD")
    eq(hud().Visible, true, "HUD đang hiện trên màn hình")
    S.Move.StopAll(); Mock.advance(0.05)
end)

test("E2 · thảm nằm DƯỚI CHÂN, trong suốt vừa đủ để thấy", function()
    local ch = cleanStart()
    action("runmode")
    Mock.advance(0.1)
    local cp = H.workspace:FindFirstChild("Carpet")
    truthy(cp, "có thảm")
    local r = ch:FindFirstChild("HumanoidRootPart")
    truthy(cp.CFrame.Position.Y < r.Position.Y, "thảm nằm dưới chân")
    truthy((r.Position.Y - cp.CFrame.Position.Y) <= 3.5, "không quá xa chân")
    truthy(cp.Transparency <= 0.7, "thảm đủ rõ để nhìn thấy (transparency=" .. tostring(cp.Transparency) .. ")")
    eq(cp.CanCollide, true, "thảm đặc để CHẠY ĐƯỢC TRÊN mặt")
end)

test("E3 · nút ⬆/⬇ NỔI TRÊN MÀN HÌNH đưa thảm lên/xuống", function()
    local ch = cleanStart()
    action("runmode")
    Mock.advance(0.1)
    local y0 = S.Move.carpetY
    truthy(hudBtn("⬆"), "có nút ⬆"); truthy(hudBtn("⬇"), "có nút ⬇")
    Mock.click(hudBtn("⬆"))
    near(S.Move.carpetY, y0 + 2.5, 1e-6, "⬆ nâng 2.5")
    Mock.click(hudBtn("⬇"))
    near(S.Move.carpetY, y0, 1e-6, "⬇ hạ về chỗ cũ")
end)

test("E4 · HUD nằm trong GUI của hub (không bị nhúng vào tab 🧩)", function()
    local h = hud()
    truthy(h, "có HUD")
    eq(h:FindFirstAncestorOfClass("ScreenGui"), H.gui, "HUD là con của ScreenGui hub")
    -- không nằm trong tab 🧩 GUI Ngoài hay tab tính năng nào
    for _, ft in ipairs(H.featureTabs or {}) do
        falsy(h:IsDescendantOf(ft.frame), "HUD không nằm trong tab tính năng")
    end
end)

test("E5 · nút ✕ trên HUD tắt hết: mất thảm, ẩn HUD, trả lại menu", function()
    local ch = cleanStart()
    action("runmode")
    Mock.advance(0.1)
    truthy(hud().Visible, "HUD đang hiện")
    Mock.click(hudBtn("✕"))
    Mock.advance(0.1)
    falsy(S.Move.runMode, "đã thoát chế độ")
    falsy(H.workspace:FindFirstChild("Carpet"), "thảm đã dọn")
    eq(hud().Visible, false, "HUD đã ẩn")
    eq(ch:FindFirstChild("Humanoid").WalkSpeed, 16, "tốc độ về mặc định")
end)

test("E6 · bật/tắt chế độ nhiều lần không kẹt menu, không rò rỉ", function()
    local ch = cleanStart()
    local before = #(_G.BananaCatHub_Connections or {})
    for i = 1, 10 do action("runmode") end
    Mock.advance(0.1)
    S.Move.StopAll()
    Mock.advance(0.1)
    falsy(S.Move.runMode or S.Move.carpet or S.Move.speed, "mọi cờ false")
    eq(hud().Visible, false, "HUD ẩn")
    local after = #(_G.BananaCatHub_Connections or {})
    truthy(after - before <= 2, string.format("connection chỉ tăng <=2 (trước %d sau %d)", before, after))
end)

test("E7 · thảm cũng hiện HUD khi bật thẻ 🪩 Thảm Kính (không cần chế độ chạy)", function()
    local ch = cleanStart()
    action("carpet")
    Mock.advance(0.1)
    eq(hud().Visible, true, "bật thảm là HUD hiện")
    action("carpet")                       -- tắt
    Mock.advance(0.1)
    eq(hud().Visible, false, "tắt thảm là HUD ẩn")
end)


print("\n── F. THẢM KÍNH (sửa: hiện dưới chân, không rơi xuyên, có viền) ──")

local function carpetPart() return H.workspace:FindFirstChild("Carpet") end
local function carpetEdge()
    local cp = carpetPart()
    if not cp then return nil end
    return cp:FindFirstChildOfClass("SelectionBox")
end
local function standingY()
    return S.Move.carpetY + (S.Move.carpetH / 2) + 3.0
end

test("F1 · bật thảm: nằm NGAY DƯỚI CHÂN + có viền sáng (không chìm 3 studs)", function()
    local ch = cleanStart()
    S.Move.SetCarpetGap(0.2)
    action("carpet")
    Mock.advance(0.1)
    local cp = carpetPart()
    truthy(cp, "có thảm")
    local feet = ch:FindFirstChild("HumanoidRootPart").Position.Y - 3.0
    local top = cp.CFrame.Position.Y + cp.Size.Y / 2
    truthy(feet - top <= 0.5, string.format("mặt thảm phải sát chân (chân %s, mặt thảm %s)", tostring(feet), tostring(top)))
    truthy(carpetEdge(), "thảm có viền SelectionBox để dễ thấy")
    eq(cp.Transparency <= 0.7, true, "thảm đủ rõ")
end)

test("F2 · ⭐ không rơi xuyên thảm kể cả khi KHÔNG bật xuyên tường", function()
    local ch = cleanStart()
    action("carpet")
    Mock.advance(0.1)
    local r = ch:FindFirstChild("HumanoidRootPart")
    local top = S.Move.carpetY + (S.Move.carpetH / 2)
    -- thả người xuống dưới mặt thảm, đang rơi (vận tốc âm)
    r.Position = Vector3.new(0, top - 6, 0)
    r.AssemblyLinearVelocity = Vector3.new(0, -30, 0)
    Mock.advance(0.2)
    truthy(r.Position.Y >= standingY() - 0.01, string.format(
        "phải được đỡ trên mặt thảm (Y=%s, mặt thảm=%s)", tostring(r.Position.Y), tostring(standingY())))
    falsy(S.Move.noclip, "test này bật MỘT MÌNH thảm, không bật xuyên tường")
end)

test("F3 · vẫn NHẢY được (đang bay lên thì không bị kéo xuống)", function()
    local ch = cleanStart()
    action("carpet")
    Mock.advance(0.1)
    local r = ch:FindFirstChild("HumanoidRootPart")
    r.Position = Vector3.new(0, standingY() - 1, 0)
    r.AssemblyLinearVelocity = Vector3.new(0, 25, 0)     -- đang nhảy lên
    Mock.advance(0.1)
    eq(r.Position.Y, standingY() - 1, "đang nhảy thì KHÔNG bị áp xuống mặt thảm")
end)

test("F4 · ô 'cách chân' trong khung ⚙ đổi vị trí thảm (và kẹp 0..10)", function()
    local ch = cleanStart()
    action("carpet")
    Mock.advance(0.1)
    local b = panelBoxes()
    eq(#b, 7, "khung ⚙ có 7 ô (thêm ô cách chân)")
    b[7].Text = "4"
    Mock.click(panelBtns()[2])
    eq(S.Move.carpetGap, 4, "đổi khoảng cách thành 4")
    Mock.advance(0.1)
    local cp = carpetPart()
    truthy(cp, "vẫn còn thảm")
    local feet = ch:FindFirstChild("HumanoidRootPart").Position.Y - 3.0
    truthy((feet - (cp.CFrame.Position.Y + cp.Size.Y / 2)) <= 4.5, "thảm thấp xuống đúng khoảng cách")
    b[7].Text = "999"
    Mock.click(panelBtns()[2])
    eq(S.Move.carpetGap, 10, "vượt quá thì kẹp ở 10")
    S.Move.SetCarpetGap(0.2)
    S.Move.StopAll(); Mock.advance(0.05)
end)

test("F5 · tắt thảm dọn SẠCH cả thảm lẫn viền (không rớt rác trong workspace)", function()
    local ch = cleanStart()
    action("carpet")
    Mock.advance(0.1)
    truthy(carpetPart(), "có thảm")
    action("carpet")
    Mock.advance(0.1)
    falsy(carpetPart(), "thảm đã dọn")
    local leftovers = 0
    for _, d in ipairs(H.workspace:GetDescendants()) do
        if d.Name == "Carpet" or d.Name == "CarpetEdge" then leftovers = leftovers + 1 end
    end
    eq(leftovers, 0, "không còn Part/SelectionBox nào sót lại")
end)

test("F6 · ⭐ không mất tính năng: ⬆⬇ vẫn nâng/hạ, Chạy Trên Thảm vẫn chạy", function()
    local ch = cleanStart()
    action("runmode")                     -- chế độ gộp: thảm + tốc độ + HUD
    Mock.advance(0.1)
    truthy(carpetPart(), "chế độ chạy vẫn trải thảm")
    truthy(hud().Visible, "HUD vẫn hiện")
    local y0 = S.Move.carpetY
    Mock.click(hudBtn("⬆"))
    near(S.Move.carpetY, y0 + 2.5, 1e-6, "⬆ vẫn nâng")
    Mock.click(hudBtn("⬇"))
    near(S.Move.carpetY, y0, 1e-6, "⬇ vẫn hạ")
    Mock.click(hudBtn("✕"))
    Mock.advance(0.1)
    falsy(carpetPart(), "✕ vẫn tắt hết")
end)

test("F7 · đổi kích thước thảm khi đang bật: vẫn đứng trên mặt thảm", function()
    local ch = cleanStart()
    action("carpet")
    Mock.advance(0.1)
    S.Move.SetCarpetSize(20, 2, 20)
    Mock.advance(0.1)
    local cp = carpetPart()
    eq(cp.Size.X, 20, "Rộng mới"); eq(cp.Size.Y, 2, "Cao mới")
    local r = ch:FindFirstChild("HumanoidRootPart")
    truthy(r.Position.Y >= standingY() - 0.01, "đổi kích thước xong vẫn đứng trên mặt thảm")
    S.Move.SetCarpetSize(6, 0.5, 6)
    S.Move.StopAll(); Mock.advance(0.05)
end)


print("\n── G. v4.12.2: NHẢY + CHẠY chạy được ở MỌI GAME (tốc độ theo game) ──")

test("G1 · 🦘 game ăn mất JumpRequest -> bấm Space (InputBegan) vẫn nhảy", function()
    local ch = cleanStart()
    local h = hum()
    h._state = nil
    action("infjump")
    Mock.advance(0.05)
    -- game không bao giờ bốc JumpRequest (ContextActionService ưu tiên cao) -> chỉ còn phím
    Mock.fire(H.UserInputService, "InputBegan", { KeyCode = Enum.KeyCode.Space }, true)
    eq(h._state, Enum.HumanoidStateType.Jumping, "Space vẫn phát được lệnh nhảy")
    action("infjump"); Mock.advance(0.05)
    h._state = nil
    Mock.fire(H.UserInputService, "InputBegan", { KeyCode = Enum.KeyCode.Space }, true)
    eq(h._state, nil, "tắt rồi thì thôi")
end)

test("G2 · 🦘 game CẤM NHẢY (JumpPower=0) -> mở lại để nhảy, tắt trả đúng 0", function()
    local ch = cleanStart()
    Mock.advance(0.4)      -- xả nợ: Refresh của respawn test trước (0.3s) kẻo nó dẫm lên kết quả
    local h = hum()
    h.JumpPower, h.JumpHeight = 0, 0          -- kiểu game cấm nhảy
    action("infjump")
    Mock.advance(0.05)
    truthy(h.JumpPower >= 1, "JumpPower được mở lại: " .. tostring(h.JumpPower))
    truthy(h.JumpHeight >= 0.1, "JumpHeight được mở lại: " .. tostring(h.JumpHeight))
    action("infjump")
    Mock.advance(0.05)
    eq(h.JumpPower, 0, "tắt thì trả lại đúng 0 như game (không để kẹt 50)")
end)

test("G3 · 🦘 game phớt lờ lệnh nhảy -> tự đẩy vận tốc (cách thứ 3)", function()
    local ch = cleanStart()
    local r = root()
    action("infjump")
    Mock.advance(0.05)
    r.AssemblyLinearVelocity = Vector3.new(0, 0, 0)
    local y0 = r.Position.Y
    Mock.fire(H.UserInputService, "JumpRequest")
    Mock.advance(0.15)                        -- qua 0.08s xác nhận
    truthy(r.AssemblyLinearVelocity.Y >= 40 or r.Position.Y > y0 + 0.4,
        "vẫn phải nhúc nhích lên (vy=" .. tostring(r.AssemblyLinearVelocity.Y) .. ")")
    action("infjump"); Mock.advance(0.05)
end)

test("G4 · 👟 TỐC ĐỘ THEO GAME: 20×3=60 · game đổi 10 -> 30 · tắt về 10", function()
    local ch = cleanStart()
    local h = hum()
    h.WalkSpeed = 20
    S.Move.speedMode, S.Move.speedMul = "x", 3
    S.Move.SetSpeed(true)
    eq(h.WalkSpeed, 60, "20 × 3 = 60")
    h.WalkSpeed = 10                          -- game tự đổi tốc độ
    Mock.advance(0.4)                          -- vòng canh gác bắt kịp
    eq(h.WalkSpeed, 30, "theo game: 10 × 3 = 30")
    S.Move.SetSpeed(false)
    eq(h.WalkSpeed, 10, "tắt thì về ĐÚNG tốc độ game đang có (10), không phải 20")
end)

test("G5 · ô 👟 Chạy trong khung ⚙: gõ x4 = theo game ×4 · gõ 50 = cố định 50", function()
    local ch = cleanStart()
    local h = hum()
    h.WalkSpeed = 16
    local b = panelBoxes()
    b[2].Text = "x4"
    Mock.click(panelBtns()[1])
    eq(S.Move.speedMode, "x", "chế độ nhân")
    eq(S.Move.speedMul, 4, "hệ số 4")
    S.Move.SetSpeed(true)
    eq(h.WalkSpeed, 64, "16 × 4 = 64")
    b[2].Text = "50"
    Mock.click(panelBtns()[1])
    eq(S.Move.speedMode, "num", "chế độ cố định")
    eq(h.WalkSpeed, 50, "đổi ngay sang 50")
    h.WalkSpeed = 5                            -- game đổi tốc độ
    Mock.advance(0.4)
    eq(h.WalkSpeed, 50, "chế độ CỐ ĐỊNH thì không chạy theo game")
    S.Move.SetSpeed(false)
    b[2].Text = "x3"; Mock.click(panelBtns()[1])   -- trả mặc định
end)

test("G6 · 🪩 thảm bị game XOÁ -> tự trải lại (bị xoá 3 lần thì né sang Camera)", function()
    local ch = cleanStart()
    action("carpet")
    Mock.advance(0.1)
    for i = 1, 3 do
        local cp = H.workspace:FindFirstChild("Carpet")
        truthy(cp, "lần " .. i .. ": đang có thảm")
        cp:Destroy()
        Mock.advance(0.1)
    end
    truthy(S.Move._carpet and S.Move._carpet.Parent, "thảm được trải lại sau 3 lần bị xoá")
    eq(S.Move._carpet.Parent, H.workspace.CurrentCamera,
       "đã né sang Camera để game không dọn được nữa")
    S.Move.StopAll(); Mock.advance(0.1)
    falsy(S.Move._carpet, "tắt thì dọn sạch")
end)

test("G7 · 🏃 chạy trên thảm: NHẢY THOẢI MÁI (lên không bị kéo xuống · rơi được đỡ lại)", function()
    local ch = cleanStart()
    local h, r = hum(), root()
    h.WalkSpeed = 24
    S.Move.speedMode, S.Move.speedMul = "x", 3
    action("runmode")
    Mock.advance(0.1)
    eq(h.WalkSpeed, 72, "tốc độ = game 24 × 3")
    local top = S.Move.carpetY + (S.Move.carpetH / 2)
    -- NHẢY: đang bay lên thì KHÔNG bị áp xuống
    r.Position = Vector3.new(0, top + 3, 0)
    r.AssemblyLinearVelocity = Vector3.new(0, 30, 0)
    Mock.advance(0.1)
    eq(r.Position.Y, top + 3, "đang nhảy lên: không bị kéo xuống mặt thảm")
    -- RƠI: được đỡ lại trên mặt thảm (không rơi xuyên)
    r.Position = Vector3.new(0, top - 4, 0)
    r.AssemblyLinearVelocity = Vector3.new(0, -20, 0)
    Mock.advance(0.1)
    truthy(r.Position.Y >= top + 3 - 0.01, string.format(
        "rơi xuống được đỡ lại trên mặt thảm (Y=%s, đứng=%s)", tostring(r.Position.Y), tostring(top + 3)))
    S.Move.StopAll(); Mock.advance(0.1)
end)

test("G8 · không mất tính năng cũ + vòng canh gác tự tắt (không rò rỉ luồng)", function()
    local ch = cleanStart()
    action("noclip"); action("infjump"); action("fly")
    Mock.advance(0.1)
    truthy(S.Move.fly and S.Move.noclip and S.Move.infJump, "3 tính năng cùng bật được")
    truthy(findByClass(ch, "BodyVelocity"), "bay vẫn có BodyVelocity")
    S.Move.StopAll()
    Mock.advance(0.5)
    falsy(S.Move.fly or S.Move.noclip or S.Move.infJump or S.Move.speed or S.Move.carpet, "tắt hết")
    falsy(findByClass(ch, "BodyVelocity"), "bay đã dọn")
    eq(root().CanCollide, true, "CanCollide trả lại")
    eq(S.Move._wd, nil, "vòng canh gác đã tự thoát (không kẹt luồng chạy ngầm)")
end)


print("\n── H. v4.12.3: RÚT GỌN CODE (helper dùng chung) không được làm hỏng gì ──")

test("H1 · flash(): đổi chữ nút rồi TỰ TRẢ LẠI chữ cũ (11 nút trong hub dùng)", function()
    local b = Instance.new("TextButton")
    b.Text = "📋 Copy"; b.Size = UDim2.new(0, 80, 0, 24); b.Parent = H.gui
    H.flash(b, "✅ Đã copy", 0.5)
    eq(b.Text, "✅ Đã copy", "đổi chữ ngay")
    Mock.advance(0.6)
    eq(b.Text, "📋 Copy", "hết giờ tự trả lại chữ cũ")
    -- bấm liên tục: không được lưu nhầm chữ TẠM làm chữ gốc
    H.flash(b, "✅ lần 2", 0.5)
    H.flash(b, "✅ lần 3", 0.5)
    Mock.advance(0.6)
    eq(b.Text, "📋 Copy", "bấm liên tục vẫn trả đúng chữ GỐC")
    -- nút bị xoá giữa chừng: không văng lỗi
    local b2 = Instance.new("TextButton")
    b2.Text = "x"; b2.Parent = H.gui
    H.flash(b2, "y", 0.2)
    b2:Destroy()
    Mock.advance(0.4)
    b:Destroy()
end)

test("H2 · D.Say(): 1 dòng đặt cả chữ + màu cho thanh trạng thái", function()
    local st = H.D.hubStatus
    truthy(st, "có thanh trạng thái")
    H.D.Say("xin chào", H.C.GREEN)
    eq(st.Text, "xin chào", "chữ")
    eq(st.TextColor3, H.C.GREEN, "màu truyền vào")
    H.D.Say("báo lỗi")
    eq(st.Text, "báo lỗi", "chữ mới")
    eq(st.TextColor3, H.C.RED, "không truyền màu thì mặc định ĐỎ")
    H.D.Say(nil, H.C.MUTED)
    eq(st.Text, "nil", "không văng lỗi khi truyện nil")
end)

test("H3 · S.CopyToClipboard(): thử đủ 3 tên hàm clipboard, trả đúng true/false", function()
    local ok = H.CopyToClipboard("thử copy")
    eq(ok, true, "executor có setclipboard -> true")
    eq(Mock.clipboard, "thử copy", "nội dung đã vào clipboard")
    -- giả lập executor KHÔNG có hàm clipboard nào: không được văng lỗi
    local old1, old2, old3 = setclipboard, toclipboard, set_clipboard
    setclipboard, toclipboard, set_clipboard = nil, nil, nil
    local ok2 = false
    pcall(function() ok2 = H.CopyToClipboard("không có clipboard") end)
    eq(ok2, false, "không có hàm nào -> false (không lỗi)")
    setclipboard, toclipboard, set_clipboard = old1, old2, old3
end)

test("H4 · MakeTabButton/AddTab: tab mới có attribute, bấm mở đúng trang", function()
    local n0 = #H.tabs
    local sf, btn = H.AddTab("🧪 Tab Test", "🧪", 90)
    truthy(sf and btn, "AddTab trả khung + nút")
    eq(#H.tabs, n0 + 1, "thêm đúng 1 tab")
    eq(btn:GetAttribute("BCTabName"), "🧪 Tab Test", "nút nhớ tên tab")
    eq(btn:GetAttribute("BCTabIcon"), "🧪", "nút nhớ icon")
    eq(btn:IsDescendantOf(H.gui), true, "nút nằm trong GUI của hub")
    eq(sf.Visible, false, "khung tab mới đang ẩn")
    Mock.click(btn)
    eq(sf.Visible, true, "bấm nút -> mở đúng khung của tab đó")
    Mock.click(btn)                       -- bấm lại: không lỗi, vẫn mở
    eq(sf.Visible, true, "bấm lại vẫn ổn")
end)

test("H5 · CreateFeatureTab: tab tính năng cũng dựng bằng helper chung (không lỗi)", function()
    local n0 = #H.tabs
    local ok = pcall(function() H.CreateFeatureTab("🧪 Tính Năng Test", "🧪", "print('hi')") end)
    truthy(ok, "tạo tab tính năng không văng lỗi")
    eq(#H.tabs, n0 + 1, "thêm đúng 1 tab")
    local btn = H.tabs[#H.tabs]
    eq(btn:GetAttribute("BCTabName"), "🧪 Tính Năng Test", "nút nhớ tên")
    Mock.click(btn)
    Mock.advance(0.1)
    truthy(#H.featureTabs >= 1, "tab tính năng được ghi nhận")
end)

test("H6 · xuyên tường sau khi tối ưu: dọn SẠCH kết nối khi tắt", function()
    local ch = cleanStart()
    action("noclip")
    Mock.advance(0.1)
    truthy(S.Move._ncDesc, "đang theo dõi part mới (DescendantAdded)")
    action("noclip")
    Mock.advance(0.1)
    falsy(S.Move._ncDesc, "tắt thì ngắt cả kết nối DescendantAdded")
    falsy(S.Move._ncChar, "quên cả nhân vật đang theo dõi")
    -- bật/tắt 5 lần: không được rò kết nối (trackConn đếm)
    local before = #(H.S.conns or {})
    for i = 1, 5 do action("noclip"); Mock.advance(0.05) end
    Mock.advance(0.2)
    local after = #(H.S.conns or {})
    truthy((after - before) <= 2, string.format("bật/tắt 5 lần chỉ tăng <=2 kết nối (trước %d, sau %d)", before, after))
end)


print("\n── I. CHẠY TRÊN THẢM = '🕹️ BAY CHẠY BỘ' BẢN GỐC (aiaiaitao3) 100% ──")

test("I1 · overlay Y HỆT bản gốc: khung 180x160 · 3 nút TRÒN 50x50 (🪩 ⬆ ⬇) · ✕ 34x34 góc trên phải", function()
    local h = hud()
    truthy(h, "có overlay")
    eq(h.Size.X.Offset, 180, "khung rộng 180")
    eq(h.Size.Y.Offset, 160, "khung cao 160")
    eq(h.Position.X.Scale, 1, "khung dính mép phải")
    eq(h.Position.X.Offset, -190, "khung lùi vào 190px")
    eq(h.Position.Y.Offset, -80, "khung canh giữa màn hình")
    for _, spec in ipairs({ {"🪩", 0}, {"⬆", 60}, {"⬇", 120} }) do
        local b = hudBtn(spec[1])
        truthy(b, "có nút " .. spec[1])
        eq(b.Size.X.Offset, 50, spec[1] .. " rộng 50")
        eq(b.Size.Y.Offset, 50, spec[1] .. " cao 50")
        eq(b.Position.Y.Offset, spec[2], spec[1] .. " nằm ở y=" .. tostring(spec[2]))
        local c = b:FindFirstChildOfClass("UICorner")
        truthy(c, spec[1] .. " có UICorner")
        eq(c.CornerRadius.Scale, 1, spec[1] .. " bo TRÒN hoàn toàn (CornerRadius.Scale = 1)")
        eq(b.BackgroundTransparency, 0.3, spec[1] .. " mờ 0.3 như bản gốc")
    end
    local x = hudBtn("✕")
    truthy(x, "có nút ✕")
    eq(x.Size.X.Offset, 34, "✕ rộng 34")
    eq(x.Size.Y.Offset, 34, "✕ cao 34")
    eq(x.Position.X.Offset, -44, "✕ nằm góc trên bên phải (-44)")
    eq(x.Position.Y.Offset, 10, "✕ cách đỉnh 10")
end)

test("I2 · bật chế độ: ẨN MENU + nút mở menu thành ⚙ + hiện overlay + có thảm (như StartFlyRun)", function()
    local ch = cleanStart()
    H.main.Visible = true
    H.togBtn.Text = "✕"
    action("runmode")
    Mock.advance(0.1)
    eq(H.main.Visible, false, "menu đã ẨN (bản gốc: main.Visible = false)")
    eq(H.togBtn.Text, "⚙", "nút mở menu thành ⚙ (đúng bản gốc)")
    eq(hud().Visible, true, "overlay HIỆN")
    truthy(H.workspace:FindFirstChild("Carpet"), "có thảm dưới chân")
    S.Move.StopAll(); Mock.advance(0.05)
end)

test("I3 · ⬆⬇ TỰ BẬT thảm nếu đang tắt, rồi nâng/hạ đúng 2.5 (như movUBtn/movDBtn)", function()
    local ch = cleanStart()
    action("runmode")
    Mock.advance(0.1)
    S.Move.SetCarpet(false)                 -- tắt thảm: overlay VẪN còn (đúng bản gốc)
    Mock.advance(0.05)
    falsy(S.Move.carpet, "thảm đang tắt")
    eq(hud().Visible, true, "overlay vẫn hiện khi tắt thảm")
    Mock.click(hudBtn("⬆"))
    Mock.advance(0.05)
    truthy(S.Move.carpet, "⬆ tự bật lại thảm")
    local y1 = S.Move.carpetY
    Mock.click(hudBtn("⬆"))
    near(S.Move.carpetY, y1 + 2.5, 1e-6, "⬆ nâng đúng 2.5")
    Mock.click(hudBtn("⬇"))
    near(S.Move.carpetY, y1, 1e-6, "⬇ hạ đúng 2.5")
    S.Move.StopAll(); Mock.advance(0.05)
end)

test("I4 · nút 🪩 bật/tắt thảm ngay trong lúc đang chạy trên thảm (như togCBtn)", function()
    local ch = cleanStart()
    action("runmode")
    Mock.advance(0.1)
    truthy(S.Move.carpet, "đang có thảm")
    Mock.click(hudBtn("🪩"))
    Mock.advance(0.05)
    falsy(S.Move.carpet, "bấm 🪩 -> tắt thảm")
    falsy(H.workspace:FindFirstChild("Carpet"), "thảm dọn khỏi workspace")
    Mock.click(hudBtn("🪩"))
    Mock.advance(0.05)
    truthy(S.Move.carpet, "bấm 🪩 lần nữa -> bật lại")
    S.Move.StopAll(); Mock.advance(0.05)
end)

test("I5 · ✕ tắt hết: dọn thảm · ẩn overlay · hiện lại menu · nút về ✕ (như StopFlyRun)", function()
    local ch = cleanStart()
    H.main.Visible = true
    H.togBtn.Text = "✕"
    action("runmode")
    Mock.advance(0.1)
    Mock.click(hudBtn("✕"))
    Mock.advance(0.1)
    falsy(S.Move.runMode, "đã thoát chế độ")
    falsy(S.Move.carpet, "thảm đã tắt")
    falsy(H.workspace:FindFirstChild("Carpet"), "thảm đã dọn")
    eq(hud().Visible, false, "overlay đã ẩn")
    eq(H.main.Visible, true, "menu hiện lại")
    eq(H.togBtn.Text, "✕", "nút mở menu về ✕")
    eq(hum().WalkSpeed, 16, "tốc độ trả lại game")
end)

test("I6 · không mất tính năng: vẫn chạy NHANH THEO GAME ×3 + NHẢY THOẢI MÁI trên thảm", function()
    local ch = cleanStart()
    hum().WalkSpeed = 20
    S.Move.speedMode, S.Move.speedMul = "x", 3
    action("runmode")
    Mock.advance(0.1)
    eq(hum().WalkSpeed, 60, "tốc độ = game 20 × 3")
    local top = S.Move.carpetY + (S.Move.carpetH / 2)
    root().Position = Vector3.new(0, top + 3, 0)
    root().AssemblyLinearVelocity = Vector3.new(0, 30, 0)
    Mock.advance(0.1)
    eq(root().Position.Y, top + 3, "đang nhảy: không bị kéo xuống mặt thảm")
    S.Move.StopAll(); Mock.advance(0.05)
end)


test("I7 · bật BAY khi đang chạy trên thảm -> thoát chế độ chạy (y hệt TogFly của bản gốc)", function()
    local ch = cleanStart()
    action("runmode")
    Mock.advance(0.1)
    truthy(S.Move.runMode, "đang ở chế độ chạy")
    action("fly")
    Mock.advance(0.1)
    truthy(S.Move.fly, "bay đã bật")
    falsy(S.Move.runMode, "chế độ chạy đã thoát")
    falsy(S.Move.carpet, "thảm đã thu")
    falsy(H.workspace:FindFirstChild("Carpet"), "không còn thảm")
    S.Move.StopAll(); Mock.advance(0.05)
end)


print("\n── J. v4.12.5: HẾT GIẬT/LAG KHI BẬT THẢM (game nặng như Evade) ──")

local function standingY()
    return S.Move.carpetY + (S.Move.carpetH / 2) + 3.0
end

test("J1 · đứng trên thảm BÌNH THƯỜNG: hub KHÔNG đụng vào nhân vật (mượt như bản gốc)", function()
    local ch = cleanStart()
    S.Move.SetCarpetHold(true); S.Move.SetCarpetSlack(0.5)
    action("carpet")
    Mock.advance(0.1)
    local y = standingY()
    -- lún 0.3 (< slack 0.5): đứng kiểu này Roblox tự giữ, hub KHÔNG được ghi CFrame
    root().Position = Vector3.new(0, y - 0.3, 0)
    root().AssemblyLinearVelocity = Vector3.new(0, 0, 0)
    Mock.advance(0.2)
    eq(root().Position.Y, y - 0.3, "không bị nhấc lên mỗi frame (không giật)")
end)

test("J2 · rơi/lún QUÁ 0.5 thì vẫn được ĐỠ lên mặt thảm (không rơi xuyên)", function()
    local ch = cleanStart()
    S.Move.SetCarpetHold(true); S.Move.SetCarpetSlack(0.5)
    action("carpet")
    Mock.advance(0.1)
    local y = standingY()
    root().Position = Vector3.new(0, y - 4, 0)
    root().AssemblyLinearVelocity = Vector3.new(0, -25, 0)
    Mock.advance(0.2)
    truthy(root().Position.Y >= y - 0.01, string.format(
        "phải được đỡ lên mặt thảm (Y=%s, đứng=%s)", tostring(root().Position.Y), tostring(y)))
    S.Move.StopAll(); Mock.advance(0.05)
end)

test("J3 · đang bật Xuyên Tường: đỡ NGAY (slack = 0 như bản gốc)", function()
    local ch = cleanStart()
    S.Move.SetCarpetHold(true)
    action("noclip"); action("carpet")
    Mock.advance(0.1)
    local y = standingY()
    root().Position = Vector3.new(0, y - 0.1, 0)
    root().AssemblyLinearVelocity = Vector3.new(0, -5, 0)
    Mock.advance(0.2)
    truthy(root().Position.Y >= y - 0.01, "xuyên tường thì không rơi xuyên dù chỉ 0.1")
    S.Move.StopAll(); Mock.advance(0.05)
end)

test("J4 · TẮT 🛟 Chống rơi = Y HỆT bản gốc: rơi bao nhiêu cũng KHÔNG đụng vào nhân vật", function()
    local ch = cleanStart()
    S.Move.SetCarpetHold(false)
    action("carpet")
    Mock.advance(0.1)
    local y = standingY()
    root().Position = Vector3.new(0, y - 5, 0)
    root().AssemblyLinearVelocity = Vector3.new(0, -40, 0)
    Mock.advance(0.2)
    eq(root().Position.Y, y - 5, "hub không ghi CFrame nữa (đúng kiểu bản gốc)")
    truthy(H.workspace:FindFirstChild("Carpet"), "thảm vẫn còn để đứng nhờ va chạm")
    S.Move.SetCarpetHold(true)
    S.Move.StopAll(); Mock.advance(0.05)
end)

test("J5 · 🔲 Viền thảm: TẮT là mất viền (không tạo mới), BẬT lại có ngay trên thảm đang dùng", function()
    local ch = cleanStart()
    S.Move.SetCarpetEdge(false)
    action("carpet")
    Mock.advance(0.1)
    local cp = H.workspace:FindFirstChild("Carpet")
    truthy(cp, "có thảm")
    falsy(cp:FindFirstChildOfClass("SelectionBox"), "TẮT viền -> không có SelectionBox")
    S.Move.SetCarpetEdge(true)
    Mock.advance(0.05)
    truthy(cp:FindFirstChildOfClass("SelectionBox"), "BẬT lại -> viền xuất hiện ngay")
    S.Move.SetCarpetEdge(false)
    Mock.advance(0.05)
    falsy(cp:FindFirstChildOfClass("SelectionBox"), "TẮT lại -> viền biến mất (thảm vẫn còn)")
    S.Move.SetCarpetEdge(true)
    S.Move.StopAll(); Mock.advance(0.05)
end)

test("J6 · ⬆ kéo người lên theo thảm · ⬇ hạ thảm (không kéo tuột người) · rơi lại được đỡ", function()
    local ch = cleanStart()
    S.Move.SetCarpetHold(true); S.Move.SetCarpetSlack(0.5)
    action("runmode")
    Mock.advance(0.1)
    local y0, c0 = standingY(), S.Move.carpetY
    Mock.click(hudBtn("⬆"))
    Mock.advance(0.15)
    truthy(root().Position.Y >= y0 + 2.5 - 0.01, string.format(
        "⬆ đưa người lên theo thảm (Y=%s, mong đợi >= %s)", tostring(root().Position.Y), tostring(y0 + 2.5)))
    Mock.click(hudBtn("⬇"))
    Mock.advance(0.15)
    near(S.Move.carpetY, c0, 1e-6, "⬇ hạ thảm về chỗ cũ")
    truthy(root().Position.Y > y0, "người KHÔNG bị kéo tuột xuống (không dính chặt)")
    root().Position = Vector3.new(0, y0 - 1.5, 0)
    root().AssemblyLinearVelocity = Vector3.new(0, -8, 0)
    Mock.advance(0.15)
    truthy(root().Position.Y >= y0 - 0.01, "rơi xuống lại được đỡ trên mặt thảm")
    S.Move.StopAll(); Mock.advance(0.05)
end)

test("J7 · không mất tính năng: 2 công tắc ở khung ⚙ + thảm sát chân + HUD + tốc độ ×3", function()
    local ch = cleanStart()
    local btns = panelBtns()
    -- v4.22: KHÔNG đếm cứng số nút nữa (thêm 🧲 là gãy oan) — đòi đủ nút cũ + không mất nút nào
    truthy(#btns >= 7, "khung ⚙ vẫn đủ nút cũ (>= 7), nay có: " .. #btns)
    for _, nd in ipairs({ "Nâng", "Hạ", "Tắt hết", "🧲" }) do
        truthy(panelBtnWith(nd), "khung ⚙ còn nút '" .. nd .. "'")
    end
    local before = S.Move.carpetHold
    Mock.click(btns[6])                       -- 🛟 Chống rơi
    eq(S.Move.carpetHold, not before, "nút 🛟 đổi trạng thái chống rơi")
    Mock.click(btns[6])
    eq(S.Move.carpetHold, before, "bấm lại trả về cũ")
    local edge0 = S.Move.carpetEdge
    Mock.click(btns[7])                       -- 🔲 Viền thảm
    eq(S.Move.carpetEdge, not edge0, "nút 🔲 đổi trạng thái viền")
    Mock.click(btns[7])
    eq(S.Move.carpetEdge, edge0, "bấm lại trả về cũ")
    -- thảm vẫn sát chân + HUD y hệt bản gốc + tốc độ theo game
    hum().WalkSpeed = 20
    S.Move.speedMode, S.Move.speedMul = "x", 3
    action("runmode")
    Mock.advance(0.1)
    truthy(H.workspace:FindFirstChild("Carpet"), "có thảm dưới chân")
    eq(hudBtn("🪩").Size.X.Offset, 50, "HUD vẫn y hệt bản gốc (nút tròn 50)")
    eq(hum().WalkSpeed, 60, "tốc độ vẫn theo game ×3")
    S.Move.StopAll(); Mock.advance(0.05)
end)

print("\n── K. v4.13: ĐỊNH VỊ NGƯỜI CHƠI (xuyên tường · bạn bè · hạ gục · ⏱ · 📏) ──")

local function esp() return H.gui:FindFirstChild("BC_LocEsp") end
local function hl(n) local g = esp(); return g and g:FindFirstChild(n .. "_HL") or nil end
local function bb(n) local g = esp(); return g and g:FindFirstChild(n .. "_BB") or nil end
local function lbl(n)
    local b = bb(n)
    return b and b:FindFirstChildOfClass("TextLabel") or nil
end
local function humOf(p) return p.Character and p.Character:FindFirstChildOfClass("Humanoid") or nil end
local function addP(name, uid, pos)
    local p = Mock.addPlayer(name, uid)
    Mock.setChar(p, pos)
    return p
end
local function wipePlayers()
    for _, p in ipairs(H.Players:GetPlayers()) do
        if p ~= H.player then pcall(function() Mock.removePlayer(p) end) end
    end
    Mock.advance(0.05)
end
-- v4.17: ĐẶT LẠI bộ lọc chip + ô tìm kiếm trước mỗi test cần tìm thẻ. Nếu một test gãy
-- giữa chừng khi đang lọc (ví dụ test chip "Di chuyển"), các test phía sau sẽ tìm không ra thẻ
-- và báo sai hàng loạt — lỗi LÂY LAN đã gặp thật khi thêm thẻ 🛡 Bay An Toàn.
local function resetChip()
    S.hubCat = "Tất cả"
    S.hubSearch = ""
    if D.hubSearchBox then D.hubSearchBox.Text = "" end
    S.RebuildHubList()
end
local function cleanLoc(list)
    S.Loc.StopAll()
    wipePlayers()
    for _, p in ipairs(list or {}) do pcall(function() Mock.removePlayer(p) end) end
    Mock.advance(0.05)
end

test("K1 · bật Định Vị: hiện NHÃN + VIỀN cho mọi người chơi khác (trừ chính mình)", function()
    resetChip()
    cleanStart(); S.Loc.StopAll(); wipePlayers()
    local a = addP("Alpha", 2001, Vector3.new(30, 5, 0))
    local b = addP("Beta", 2002, Vector3.new(0, 5, 40))
    S.Loc.Set(true)
    Mock.advance(0.3)
    truthy(bb("Alpha"), "có nhãn tên Alpha")
    truthy(hl("Alpha"), "có viền sáng Alpha")
    truthy(bb("Beta"), "có nhãn tên Beta")
    falsy(bb("LocalPlayer"), "KHÔNG định vị chính mình")
    eq(#esp():GetChildren(), 4, "2 người × (nhãn + viền) = 4")
    cleanLoc({ a, b })
end)

test("K2 · phân biệt 4 loại: 🟢 thường · 💗 bạn bè · 🔴 bị hạ gục · 🟣 bạn bè bị hạ gục", function()
    resetChip()
    cleanStart(); S.Loc.StopAll(); wipePlayers()
    local a = addP("Thuong", 2011, Vector3.new(0, 5, 0))
    local b = addP("BanBe", 2012, Vector3.new(4, 5, 0))
    local c = addP("BiHa", 2013, Vector3.new(8, 5, 0))
    local d = addP("BanBiHa", 2014, Vector3.new(12, 5, 0))
    Mock.friends[2012] = true
    Mock.friends[2014] = true
    humOf(c).PlatformStand = true
    humOf(d).PlatformStand = true
    S.Loc.Set(true)
    Mock.advance(0.3)
    eq(hl("Thuong").FillColor, Color3.fromRGB(0, 255, 100), "người thường: XANH")
    eq(hl("BanBe").FillColor, Color3.fromRGB(255, 105, 180), "bạn bè: HỒNG")
    eq(hl("BiHa").FillColor, Color3.fromRGB(200, 0, 0), "bị hạ gục: ĐỎ")
    eq(hl("BanBiHa").FillColor, Color3.fromRGB(138, 43, 226), "bạn bè bị hạ gục: TÍM")
    truthy(tostring(lbl("BanBe").Text):find("Bạn Bè", 1, true), "nhãn bạn bè ghi 💗 Bạn Bè")
    truthy(tostring(lbl("BiHa").Text):find("Hạ gục", 1, true), "nhãn người gục ghi ☠️ Hạ gục")
    falsy(tostring(lbl("Thuong").Text):find("Bạn Bè", 1, true), "người thường không ghi bạn bè")
    falsy(tostring(lbl("Thuong").Text):find("Hạ gục", 1, true), "người thường không ghi hạ gục")
    -- hết máu cũng tính là bị hạ gục
    humOf(a).Health = 0
    Mock.advance(0.3)
    eq(hl("Thuong").FillColor, Color3.fromRGB(200, 0, 0), "máu = 0 cũng là bị hạ gục (ĐỎ)")
    cleanLoc({ a, b, c, d })
    Mock.friends[2012] = nil
    Mock.friends[2014] = nil
end)

test("K3 · nhãn ghi đủ: TÊN + ❤️ máu + 📏 khoảng cách", function()
    resetChip()
    cleanStart(); S.Loc.StopAll(); wipePlayers()
    local a = addP("XaXa", 2021, Vector3.new(30, 5, 0))
    root().Position = Vector3.new(0, 5, 0)
    humOf(a).Health = 55
    humOf(a).MaxHealth = 100
    S.Loc.Set(true)
    Mock.advance(0.3)
    local t = tostring(lbl("XaXa").Text)
    truthy(t:find("XaXa", 1, true), "có tên: " .. t)
    truthy(t:find("❤️ 55/100", 1, true), "có máu: " .. t)
    truthy(t:find("📏 30m", 1, true), "có khoảng cách 30m: " .. t)
    cleanLoc({ a })
end)

test("K4 · ⏱ đếm GIỜ BỊ HẠ GỤC (gục 3 giây -> 00:03, đứng dậy -> hết đếm)", function()
    resetChip()
    cleanStart(); S.Loc.StopAll(); wipePlayers()
    local a = addP("NguGuc", 2031, Vector3.new(5, 5, 0))
    S.Loc.Set(true)
    Mock.advance(0.3)
    falsy(tostring(lbl("NguGuc").Text):find("Hạ gục", 1, true), "đầu tiên chưa gục")
    humOf(a).PlatformStand = true
    Mock.advance(0.3)
    truthy(tostring(lbl("NguGuc").Text):find("Hạ gục", 1, true), "gục rồi: có chữ Hạ gục")
    Mock.advance(3.4)
    local t = tostring(lbl("NguGuc").Text)
    truthy(t:find("00:03", 1, true), "đếm được 3 giây: " .. t)
    humOf(a).PlatformStand = false
    Mock.advance(0.3)
    falsy(tostring(lbl("NguGuc").Text):find("Hạ gục", 1, true), "đứng dậy -> hết chữ Hạ gục")
    Mock.advance(0.3)
    humOf(a).PlatformStand = true
    Mock.advance(0.3)
    truthy(tostring(lbl("NguGuc").Text):find("00:00", 1, true), "gục lại -> đếm lại từ 00:00")
    cleanLoc({ a })
end)

test("K5 · 🎯 Định Vị Lẻ: chỉ hiện ĐÚNG 1 người (người kia bị dọn)", function()
    resetChip()
    cleanStart(); S.Loc.StopAll(); wipePlayers()
    local a = addP("Mot", 2041, Vector3.new(0, 5, 0))
    local b = addP("Hai", 2042, Vector3.new(6, 5, 0))
    S.Loc.Set(true)
    Mock.advance(0.3)
    truthy(bb("Mot") and bb("Hai"), "đầu tiên hiện cả 2")
    S.Loc.SetTarget(a)
    Mock.advance(0.3)
    truthy(bb("Mot"), "người được chọn vẫn hiện")
    falsy(bb("Hai"), "người không được chọn bị dọn")
    eq(#esp():GetChildren(), 2, "chỉ còn 1 người × (nhãn + viền)")
    S.Loc.SetSolo(false)
    Mock.advance(0.3)
    truthy(bb("Hai"), "tắt lẻ -> hiện lại tất cả")
    cleanLoc({ a, b })
end)

test("K6 · BẤM TÊN trong khung 📍 = chỉ định vị người đó", function()
    resetChip()
    cleanStart(); S.Loc.StopAll(); wipePlayers()
    local a = addP("ChonToi", 2051, Vector3.new(0, 5, 0))
    local b = addP("ChonNua", 2052, Vector3.new(9, 5, 0))
    local panel = panelOf("HubLoc_Panel")
    truthy(panel, "có khung 📍 ĐỊNH VỊ NGƯỜI CHƠI")
    local listF = panel:FindFirstChild("LocList")
    truthy(listF, "có danh sách người chơi")
    S.Loc.RefreshList()
    local function findRow(nm)
        for _, row in ipairs(listF:GetChildren()) do
            if row.ClassName == "Frame" then
                for _, d in ipairs(row:GetChildren()) do
                    if d.ClassName == "TextButton" and tostring(d.Text):find(nm, 1, true) then return d end
                end
            end
        end
        return nil
    end
    local hit = findRow("ChonNua")
    truthy(hit, "có hàng tên ChonNua trong danh sách")
    Mock.click(hit)
    Mock.advance(0.3)
    eq(S.Loc.target, b, "bấm tên -> chọn đúng người")
    truthy(bb("ChonNua"), "người vừa bấm được định vị")
    falsy(bb("ChonToi"), "người kia không hiện")
    -- danh sách đã dựng lại -> lấy nút MỚI của đúng người đó rồi bấm lại = bỏ chọn
    local hit2 = findRow("ChonNua")
    truthy(hit2, "nút của người đang chọn còn trong danh sách (có dấu 🎯)")
    truthy(tostring(hit2.Text):find("🎯", 1, true), "dòng đang chọn được đánh dấu 🎯: " .. tostring(hit2.Text))
    Mock.click(hit2)
    Mock.advance(0.3)
    eq(S.Loc.target, nil, "bấm lại -> bỏ chọn")
    -- bỏ chọn mà 👁️ Tất Cả cũng đang TẮT -> không còn ai cần định vị -> dọn sạch (đúng thiết kế)
    eq(#esp():GetChildren(), 0, "bỏ chọn hết -> dọn sạch nhãn")
    S.Loc.Set(true)                       -- mở 👁️ Tất Cả -> hiện lại cả 2
    Mock.advance(0.3)
    truthy(bb("ChonNua") and bb("ChonToi"), "bật Tất Cả -> hiện lại cả 2 người")
    cleanLoc({ a, b })
end)

test("K7 · 📏 Giới hạn khoảng cách: người XA bị ẩn, người GẦN vẫn hiện", function()
    resetChip()
    cleanStart(); S.Loc.StopAll(); wipePlayers()
    local near = addP("Gan", 2061, Vector3.new(20, 5, 0))
    local far = addP("Xa", 2062, Vector3.new(500, 5, 0))
    root().Position = Vector3.new(0, 5, 0)
    S.Loc.Set(true)
    Mock.advance(0.3)
    truthy(hl("Gan").Enabled, "chưa đặt giới hạn: người gần hiện")
    truthy(hl("Xa").Enabled, "chưa đặt giới hạn: người xa vẫn hiện")
    S.Loc.SetMaxDist(100)
    Mock.advance(0.3)
    truthy(hl("Gan").Enabled, "trong 100m: vẫn hiện")
    falsy(hl("Xa").Enabled, "xa hơn 100m: bị ẩn")
    S.Loc.SetMaxDist(0)
    Mock.advance(0.3)
    truthy(hl("Xa").Enabled, "0 = không giới hạn -> hiện lại")
    cleanLoc({ near, far })
end)

test("K8 · 🚫 Tắt Định Vị: dọn SẠCH nhãn/viền + ngắt vòng lặp (không ngầm chạy nữa)", function()
    resetChip()
    cleanStart(); S.Loc.StopAll(); wipePlayers()
    local a = addP("DonSach", 2071, Vector3.new(0, 5, 0))
    S.Loc.Set(true)
    Mock.advance(0.3)
    truthy(bb("DonSach"), "đang hiện")
    truthy(Mock.renderSteps["BC_Loc"], "vòng lặp đang chạy")
    S.Loc.StopAll()
    Mock.advance(0.3)
    falsy(bb("DonSach"), "nhãn đã dọn")
    eq(#esp():GetChildren(), 0, "không còn gì trong khung định vị")
    falsy(Mock.renderSteps["BC_Loc"], "vòng lặp đã ngắt (không tốn tài nguyên)")
    falsy(S.Loc.on or S.Loc.solo, "mọi cờ đã tắt")
    cleanLoc({ a })
end)

test("K9 · người thoát game / đổi nhân vật: tự dọn, không rò nhãn", function()
    resetChip()
    cleanStart(); S.Loc.StopAll(); wipePlayers()
    local a = addP("Thoat", 2081, Vector3.new(0, 5, 0))
    local b = addP("ONai", 2082, Vector3.new(3, 5, 0))
    S.Loc.Set(true)
    Mock.advance(0.3)
    truthy(bb("Thoat"), "đang hiện người Thoat")
    Mock.removePlayer(a)
    Mock.advance(0.3)
    falsy(bb("Thoat"), "người thoát -> nhãn biến mất")
    truthy(bb("ONai"), "người còn lại vẫn hiện")
    -- đổi nhân vật (respawn): dọn cái cũ, dựng lại cái mới
    local old = b.Character
    pcall(function() Mock.fire(b, "CharacterRemoving", old) end)
    pcall(function() old:Destroy() end)
    b.Character = nil
    Mock.advance(0.3)
    falsy(bb("ONai"), "mất nhân vật -> nhãn dọn")
    local ch = Mock.makeCharacter(H.workspace)
    ch.Name = "ONai"
    b.Character = ch
    pcall(function() Mock.fire(b, "CharacterAdded", ch) end)
    Mock.advance(0.8)
    truthy(bb("ONai"), "có nhân vật mới -> dựng lại nhãn")
    cleanLoc({ b })
end)

test("K10 · người MỚI VÀO khi đang bật: tự có nhãn (không cần bấm lại)", function()
    resetChip()
    cleanStart(); S.Loc.StopAll(); wipePlayers()
    local a = addP("CoSan", 2091, Vector3.new(0, 5, 0))
    S.Loc.Set(true)
    Mock.advance(0.3)
    truthy(bb("CoSan"), "người có sẵn")
    local m = addP("MoiVao", 2092, Vector3.new(7, 5, 0))
    Mock.advance(0.3)
    truthy(bb("MoiVao"), "người mới vào tự được định vị")
    cleanLoc({ a, m })
end)

test("K11 · thẻ trong Script Hub + không làm mất tính năng cũ", function()
    resetChip()
    cleanStart(); S.Loc.StopAll(); wipePlayers()
    local a = addP("KiemTra", 2101, Vector3.new(20, 5, 0))
    -- 3 thẻ mới
    for _, nm in ipairs({ "Định Vị Người Chơi", "Định Vị Lẻ", "Tắt Định Vị" }) do
        truthy(card(nm), "thiếu thẻ: " .. nm)
    end
    local msg = action("loc_all")
    Mock.advance(0.3)
    truthy(tostring(msg):find("BẬT", 1, true), "thao tác loc_all bật được: " .. msg)
    truthy(bb("KiemTra"), "thẻ bật -> hiện nhãn")
    msg = action("loc_all")
    truthy(tostring(msg):find("TẮT", 1, true), "bấm lại tắt: " .. msg)
    msg = action("loc_solo")
    Mock.advance(0.3)
    truthy(tostring(msg):find("ĐỊNH VỊ LẺ", 1, true), "định vị lẻ bật được: " .. msg)
    truthy(S.Loc.target ~= nil and S.Loc.solo, "đã chọn 1 người để định vị lẻ")
    truthy(bb(tostring(S.Loc.target.Name)), "chỉ hiện người được chọn")
    action("loc_stop")
    Mock.advance(0.3)
    falsy(bb("KiemTra"), "🚫 Tắt Định Vị dọn sạch")
    -- tính năng CŨ vẫn sống
    hum().WalkSpeed = 16
    S.Move.speedMode, S.Move.speedMul = "x", 3
    action("runmode")
    Mock.advance(0.2)
    truthy(H.workspace:FindFirstChild("Carpet"), "thảm vẫn trải")
    eq(hudBtn("🪩").Size.X.Offset, 50, "HUD chạy trên thảm vẫn y hệt bản gốc")
    eq(hum().WalkSpeed, 48, "tốc độ vẫn theo game ×3")
    truthy(hud(), "cụm nút nổi vẫn hiện")
    S.Move.StopAll()
    cleanLoc({ a })
end)

print("\n── L. v4.14: 👣 XEM NGƯỜI CHƠI (bám theo — thấy họ đang làm gì) ────────")

local function specHud() return H.gui:FindFirstChild("BC_SpecHud", true) end
local function specBox() local g = specHud(); return g and g:FindFirstChild("SpecBox") end
local function specText(nm)
    local b = specBox()
    if not b then return "" end
    for _, d in ipairs(b:GetChildren()) do
        if d.ClassName == "TextLabel" and tostring(d.Name) == nm then return tostring(d.Text) end
    end
    return ""
end
local function specList() local p = panelOf("HubSpec_Panel"); return p and p:FindFirstChild("SpecList") or nil end
local function specRowBtn(nm)
    local l = specList()
    if not l then return nil end
    for _, row in ipairs(l:GetChildren()) do
        if row.ClassName == "Frame" then
            for _, d in ipairs(row:GetChildren()) do
                if d.ClassName == "TextButton" and tostring(d.Text):find(nm, 1, true) then return d end
            end
        end
    end
    return nil
end
local function camPos() return workspace.CurrentCamera.CFrame.Position end
local function specBtn(txt)
    local b = specBox()
    if not b then return nil end
    for _, d in ipairs(b:GetChildren()) do
        if d.ClassName == "TextButton" and tostring(d.Text):find(txt, 1, true) then return d end
    end
    return nil
end
local function specBtnName(nm)     -- tìm theo TÊN nút (chữ đổi qua lại nên đừng tìm theo chữ)
    local b = specBox()
    return b and b:FindFirstChild(nm) or nil
end
-- dọn sạch trạng thái 👣 + 📍 trước mỗi test (test trước lỗi giữa chừng cũng không lây)
local function cleanSpec()
    pcall(function() S.Spec.Stop() end)
    pcall(function() S.Spec.SetAuto(true); S.Spec.SetFollow(true) end)
    pcall(function() S.Spec.SetDist(12); S.Spec.SetHeight(3.2) end)
    pcall(function() workspace.CurrentCamera.CameraType = Enum.CameraType.Custom end)
    Mock.advance(0.05)
end
local function panelSpecBtn(txt)
    local p = panelOf("HubSpec_Panel")
    if not p then return nil end
    for _, d in ipairs(p:GetDescendants()) do
        if d.ClassName == "TextButton" and tostring(d.Text):find(txt, 1, true) then return d end
    end
    return nil
end

test("L1 · bật 👣 Bám theo: camera chuyển sang Scriptable + bảng 👣 hiện + vòng lặp chạy", function()
    resetChip()
    cleanStart(); S.Loc.StopAll(); wipePlayers(); cleanSpec()
    local a = addP("NguA", 3001, Vector3.new(40, 5, 0))
    truthy(card("Xem Người Chơi"), "có thẻ 👣 Xem Người Chơi trong Script Hub")
    truthy(card("Dừng Xem Người Chơi"), "có thẻ 🚫 Dừng Xem Người Chơi")
    local msg = action("spec_on")
    Mock.advance(0.3)
    truthy(S.Spec.on, "đang bám theo: " .. msg)
    eq(S.Spec.target, a, "chọn đúng người gần nhất")
    truthy(S.Spec and S.Spec.on, "cờ 👣 BẬT")
    truthy(Mock.renderSteps["BC_Spec"], "vòng lặp 👣 đang chạy")
    eq(workspace.CurrentCamera.CameraType, Enum.CameraType.Scriptable, "camera do hub điều khiển")
    truthy(specHud(), "có bảng nổi BC_SpecHud")
    truthy(specHud().Enabled, "bảng 👣 đang hiện")
    truthy(tostring(specText("who")):find("NguA", 1, true), "bảng ghi tên người đang xem: " .. specText("who"))
    S.Spec.Stop(); cleanLoc({ a })
end)

test("L2 · camera BÁM đúng: lùi 12m sau lưng + cao 3.2m, đi theo khi người đó di chuyển", function()
    resetChip()
    cleanStart(); S.Loc.StopAll(); wipePlayers(); cleanSpec()
    local a = addP("NguB", 3002, Vector3.new(50, 5, 0))
    S.Spec.SetDist(12); S.Spec.SetHeight(3.2)
    S.Spec.Set(a)
    Mock.advance(0.3)
    -- hrp.CFrame.LookVector = (0,0,-1) -> camera ở SAU lưng: z + 12
    near(camPos().X, 50, 0.01, "camera theo X của người chơi")
    near(camPos().Y, 8.2, 0.01, "camera cao hơn 3.2m")
    near(camPos().Z, 12, 0.01, "camera lùi 12m sau lưng")
    Mock.setChar(a, Vector3.new(80, 6, 30))
    Mock.advance(0.3)
    near(camPos().X, 80, 0.01, "người chơi đi -> camera đi theo X")
    near(camPos().Y, 9.2, 0.01, "camera theo độ cao mới")
    near(camPos().Z, 42, 0.01, "camera theo Z")
    S.Spec.Stop(); cleanLoc({ a })
end)

test("L3 · bấm TÊN trong khung 👣 = bám theo người đó (bấm người khác = đổi người)", function()
    resetChip()
    cleanStart(); S.Loc.StopAll(); wipePlayers(); cleanSpec()
    local a = addP("Chon1", 3003, Vector3.new(0, 5, 0))
    local b = addP("Chon2", 3004, Vector3.new(60, 5, 0))
    local panel = panelOf("HubSpec_Panel")
    truthy(panel, "có khung 👣 XEM NGƯỜI CHƠI")
    S.Spec.RefreshList()
    local hit = specRowBtn("Chon2")
    truthy(hit, "có hàng tên Chon2 để bấm")
    Mock.click(hit)
    Mock.advance(0.4)
    eq(S.Spec.target, b, "bấm tên -> bám đúng người đó")
    truthy(tostring(specText("who")):find("Chon2", 1, true), "bảng đổi sang người mới")
    -- bấm người khác -> đổi người đang xem
    S.Spec.RefreshList()
    local hit2 = specRowBtn("Chon1")
    truthy(hit2, "có hàng tên Chon1")
    Mock.click(hit2)
    Mock.advance(0.4)
    eq(S.Spec.target, a, "bấm người khác -> đổi người đang xem")
    S.Spec.Stop(); cleanLoc({ a, b })
end)

test("L4 · bảng 👣 nói ĐÚNG họ đang làm gì: đứng yên · chạy · nhảy · ngồi · gục", function()
    resetChip()
    cleanStart(); S.Loc.StopAll(); wipePlayers(); cleanSpec()
    local a = addP("LamGi", 3005, Vector3.new(0, 5, 0))
    S.Spec.Set(a)
    Mock.advance(0.5)
    truthy(tostring(specText("act")):find("ĐỨNG YÊN", 1, true), "đang đứng yên: " .. specText("act"))
    -- chạy: mỗi frame đi 0.5 stud (30 stud/s)
    for i = 1, 10 do
        Mock.setChar(a, Vector3.new(i * 0.5, 5, 0))
        Mock.advance(0.05)
    end
    truthy(tostring(specText("act")):find("CHẠY", 1, true), "đang chạy: " .. specText("act"))
    truthy(tostring(specText("note") or ""):find("🚫", 1, true) or tostring(specText("act")):find("m/s", 1, true),
        "có ghi tốc độ")
    -- nhảy: Y vọt lên
    local hrp = Mock.setChar(a, Vector3.new(5, 12, 0))
    Mock.advance(0.35)      -- bảng cập nhật 4 lần/giây (0,25s) -> đợi 1 nhịp cho chữ đổi
    truthy(tostring(specText("act")):find("NHẢY", 1, true), "đang nhảy: " .. specText("act"))
    -- ngồi
    humOf(a).Sit = true
    Mock.setChar(a, Vector3.new(5, 12, 0))
    Mock.advance(0.4)
    truthy(tostring(specText("act")):find("NGỒI", 1, true), "đang ngồi: " .. specText("act"))
    humOf(a).Sit = false
    -- bị hạ gục (nằm sấp) -> có cả ⏱ đếm giờ
    humOf(a).PlatformStand = true
    Mock.advance(3.3)
    truthy(tostring(specText("act")):find("HẠ GỤC", 1, true), "đang bị hạ gục: " .. specText("act"))
    truthy(tostring(specText("act")):find("00:03", 1, true), "có đếm giờ hạ gục: " .. specText("act"))
    S.Spec.Stop(); cleanLoc({ a })
end)

test("L5 · đổi 📏 khoảng cách + ⬆ độ cao rồi ✔ Áp dụng: camera đổi theo ngay", function()
    resetChip()
    cleanStart(); S.Loc.StopAll(); wipePlayers(); cleanSpec()
    local a = addP("DoiCam", 3006, Vector3.new(0, 5, 0))
    S.Spec.Set(a)
    Mock.advance(0.2)
    near(camPos().Z, 12, 0.01, "mặc định lùi 12m")
    local panel = panelOf("HubSpec_Panel")
    truthy(panel, "có khung 👣 XEM NGƯỜI CHƠI")
    local boxes = {}
    for _, d in ipairs(panel:GetDescendants()) do
        if d.ClassName == "TextBox" then boxes[#boxes + 1] = d end
    end
    eq(#boxes, 3, "khung 👣 có 3 ô nhập (📏 m · ⬆ cao · 🔍 tìm tên)")
    boxes[1].Text = "25"
    boxes[2].Text = "10"
    Mock.click(panelSpecBtn("Áp dụng"))
    Mock.advance(0.2)
    near(S.Spec.dist, 25, 0.001, "đổi khoảng cách")
    near(S.Spec.height, 10, 0.001, "đổi độ cao")
    near(camPos().Z, 25, 0.01, "camera lùi 25m theo cài đặt mới")
    near(camPos().Y, 15, 0.01, "camera cao 10m theo cài đặt mới")
    S.Spec.Stop(); cleanLoc({ a })
end)

test("L6 · 🎥 Bám: TẮT = KHÔNG ghi camera nữa (vẫn xem được bảng) · bật lại bám tiếp", function()
    resetChip()
    cleanStart(); S.Loc.StopAll(); wipePlayers(); cleanSpec()
    local a = addP("TatBam", 3007, Vector3.new(0, 5, 0))
    S.Spec.Set(a)
    Mock.advance(0.3)
    local p1 = camPos()
    truthy(specBtnName("followBtn"), "có nút 🎥 trên bảng nổi (không cần mở menu)")
    truthy(tostring(specBtnName("followBtn").Text):find("Bám", 1, true), "nút ghi 🎥 Bám")
    Mock.click(specBtnName("followBtn"))
    Mock.advance(0.2)
    falsy(S.Spec.follow, "đã tắt bám")
    eq(workspace.CurrentCamera.CameraType, Enum.CameraType.Custom, "camera trả về cho game ngay")
    Mock.setChar(a, Vector3.new(200, 5, 200))
    Mock.advance(0.3)
    near(camPos().X, p1.X, 0.01, "tắt bám -> hub KHÔNG ghi camera nữa")
    truthy(S.Spec.on, "vẫn đang xem (bảng 👣 còn)")
    truthy(tostring(specText("who")):find("TatBam", 1, true), "bảng vẫn ghi người đang xem")
    Mock.click(specBtnName("followBtn"))          -- bật lại
    Mock.advance(0.3)
    near(camPos().X, 200, 0.01, "bật lại -> bám tiếp vị trí mới")
    S.Spec.Stop(); cleanLoc({ a })
end)

test("L7 · 🔄 tự chuyển: người đang xem thoát -> sang người khác (tắt thì không)", function()
    resetChip()
    cleanStart(); S.Loc.StopAll(); wipePlayers(); cleanSpec()
    local a = addP("SeThoat", 3008, Vector3.new(0, 5, 0))
    local b = addP("ConLai", 3009, Vector3.new(6, 5, 0))
    S.Spec.SetAuto(true)
    S.Spec.Set(a)
    Mock.advance(0.3)
    eq(S.Spec.target, a, "đang xem SeThoat")
    Mock.removePlayer(a)
    Mock.advance(0.4)
    eq(S.Spec.target, b, "người thoát -> tự chuyển sang người còn lại")
    -- tắt tự chuyển: người kia thoát -> KHÔNG chuyển ai, tự tắt hẳn
    local c = addP("NguC", 3010, Vector3.new(9, 5, 0))
    S.Spec.SetAuto(false)
    S.Spec.Set(b)
    Mock.advance(0.3)
    Mock.removePlayer(b)
    Mock.advance(0.4)
    falsy(S.Spec.target, "tắt tự chuyển -> không nhảy sang người khác: " .. tostring(S.Spec.target))
    cleanLoc({ c })
    S.Spec.SetAuto(true)
end)

test("L8 · 🚫 Dừng: trả camera (CameraType gốc) · ẩn bảng · ngắt vòng lặp", function()
    resetChip()
    cleanStart(); S.Loc.StopAll(); wipePlayers(); cleanSpec()
    local a = addP("Dung", 3011, Vector3.new(0, 5, 0))
    workspace.CurrentCamera.CameraType = Enum.CameraType.Custom
    S.Spec.Set(a)
    Mock.advance(0.2)
    eq(workspace.CurrentCamera.CameraType, Enum.CameraType.Scriptable, "đang bám: Scriptable")
    truthy(specHud().Enabled, "bảng đang hiện")
    Mock.click(specBtn("🚫"))                     -- nút 🚫 trên bảng nổi
    Mock.advance(0.3)
    falsy(S.Spec.on, "đã tắt xem")
    eq(workspace.CurrentCamera.CameraType, Enum.CameraType.Custom, "trả lại ĐÚNG kiểu camera gốc")
    falsy(specHud().Enabled, "bảng 👣 đã ẩn")
    falsy(Mock.renderSteps["BC_Spec"], "vòng lặp đã ngắt")
    local msg = action("spec_on")                 -- bật lại rồi tắt bằng thẻ
    Mock.advance(0.3)
    truthy(S.Spec.on, "bật lại được")
    msg = action("spec_off")
    Mock.advance(0.2)
    falsy(S.Spec.on, "thẻ 🚫 Dừng Xem Người Chơi cũng tắt được: " .. msg)
    cleanLoc({ a })
end)

test("L9 · AN TOÀN: nhân vật MÌNH không bị dịch chuyển / đổi tốc độ khi xem người khác", function()
    resetChip()
    cleanStart(); S.Loc.StopAll(); wipePlayers(); cleanSpec()
    local a = addP("AnToan", 3012, Vector3.new(100, 5, 100))
    root().Position = Vector3.new(3, 7, 3)
    hum().WalkSpeed = 16
    local y0 = root().Position.Y
    S.Spec.Set(a)
    Mock.advance(1.0)
    near(root().Position.X, 3, 0.001, "nhân vật mình đứng yên (X)")
    near(root().Position.Z, 3, 0.001, "nhân vật mình đứng yên (Z)")
    near(root().Position.Y, y0, 0.001, "nhân vật mình không bị nhấc lên")
    eq(hum().WalkSpeed, 16, "tốc độ của mình không bị đổi")
    truthy(camPos().X > 90, "camera thì đã bay tới chỗ người kia")
    S.Spec.Stop(); cleanLoc({ a })
end)

test("L10 · không mất tính năng cũ khi đang xem: định vị · thảm + HUD · tốc độ ×3", function()
    resetChip()
    cleanStart(); S.Loc.StopAll(); wipePlayers(); cleanSpec()
    local a = addP("KiemCu", 3013, Vector3.new(30, 5, 0))
    S.Loc.Set(true)
    S.Spec.Set(a)
    Mock.advance(0.3)
    truthy(bb("KiemCu"), "📍 định vị vẫn hiện nhãn người chơi")
    eq(workspace.CurrentCamera.CameraType, Enum.CameraType.Scriptable, "👣 vẫn bám")
    hum().WalkSpeed = 20
    S.Move.speedMode, S.Move.speedMul = "x", 3
    action("runmode")
    Mock.advance(0.3)
    truthy(H.workspace:FindFirstChild("Carpet"), "🪩 thảm vẫn trải được khi đang xem")
    eq(hudBtn("🪩").Size.X.Offset, 50, "cụm nút nổi vẫn y hệt bản gốc")
    eq(hum().WalkSpeed, 60, "👟 tốc độ vẫn theo game ×3")
    truthy(bb("KiemCu"), "👣 + 📍 chạy cùng lúc không đánh nhau")
    S.Spec.Stop(); S.Move.StopAll(); cleanLoc({ a })
end)

test("L11 · game GIÀNH LẠI camera giữa chừng: hub tự đòi lại trong 0,3 giây", function()
    resetChip()
    cleanStart(); S.Loc.StopAll(); wipePlayers(); cleanSpec()
    local a = addP("GianhCam", 3014, Vector3.new(10, 5, 0))
    S.Spec.Set(a)
    Mock.advance(0.3)
    eq(workspace.CurrentCamera.CameraType, Enum.CameraType.Scriptable, "đang bám")
    workspace.CurrentCamera.CameraType = Enum.CameraType.Custom   -- game cướp camera
    Mock.advance(0.4)
    eq(workspace.CurrentCamera.CameraType, Enum.CameraType.Scriptable, "hub tự đòi lại quyền camera")
    -- tắt bám thì KHÔNG đòi nữa (trả hẳn cho game)
    Mock.click(specBtnName("followBtn"))                         -- 🎥 tắt bám
    Mock.advance(0.4)
    eq(workspace.CurrentCamera.CameraType, Enum.CameraType.Custom, "tắt bám -> không đòi lại nữa")
    S.Spec.Stop(); cleanLoc({ a })
end)

test("L12 · an toàn khi CHẠY LẠI hub: kiểu camera gốc được ghi ra GLOBAL để trả lại được", function()
    resetChip()
    cleanStart(); S.Loc.StopAll(); wipePlayers(); cleanSpec()
    local a = addP("ChayLai", 3015, Vector3.new(0, 5, 0))
    workspace.CurrentCamera.CameraType = Enum.CameraType.Custom
    _G.BananaCatHub_SpecCam = nil
    S.Spec.Set(a)
    Mock.advance(0.2)
    eq(_G.BananaCatHub_SpecCam, Enum.CameraType.Custom,
        "ghi nhớ ra GLOBAL (lần chạy sau đọc được để trả lại)")
    S.Spec.Stop()
    Mock.advance(0.1)
    eq(_G.BananaCatHub_SpecCam, nil, "tắt xem -> xoá ghi nhớ (không còn gì phải trả)")
    S.Spec.Stop(); cleanLoc({ a })
end)

test("L13 · danh sách trong menu TỰ cập nhật (người mới vào hiện lên không cần bấm gì)", function()
    resetChip()
    cleanStart(); S.Loc.StopAll(); wipePlayers(); cleanSpec()
    local a = addP("CoTruoc", 3016, Vector3.new(0, 5, 0))
    D.playerTab.Visible = true            -- v4.15: danh sách nằm ở trang 👥 Người Chơi
    S.Spec.RefreshList()
    eq(#specList():GetChildren(), 2, "1 người + UIListLayout")
    local b = addP("MoiVaoSau", 3017, Vector3.new(3, 5, 0))
    Mock.advance(2.5)
    local n = 0
    for _, c in ipairs(specList():GetChildren()) do if c.ClassName == "Frame" then n = n + 1 end end
    truthy(n >= 1, "danh sách vẫn đúng")
    local found = specRowBtn("MoiVaoSau")
    truthy(found, "người mới vào tự hiện trong danh sách 👣 (không cần bấm gì)")
    -- đóng menu -> không dựng lại nữa (đỡ tốn)
    D.playerTab.Visible = false
    D.hubTab.Visible = false
    cleanLoc({ a, b })
end)

test("L14 · người đang xem biến mất hẳn -> tự chuyển/ tự thoát (không kẹt camera)", function()
    resetChip()
    cleanStart(); S.Loc.StopAll(); wipePlayers(); cleanSpec()
    local a = addP("BienMat", 3018, Vector3.new(0, 5, 0))
    S.Spec.Set(a)
    Mock.advance(0.3)
    eq(workspace.CurrentCamera.CameraType, Enum.CameraType.Scriptable, "đang bám")
    a.Parent = nil                        -- xoá hẳn khỏi Players (không bắn PlayerRemoving)
    Mock.advance(0.4)
    falsy(S.Spec.target == a, "không còn bám vào người đã biến mất")
    eq(workspace.CurrentCamera.CameraType, Enum.CameraType.Custom, "camera được TRẢ LẠI (không kẹt)")
    falsy(S.Spec.on, "tự thoát khi không còn ai")
    cleanLoc({ a })
end)

print("\n── M. v4.15: TRANG 👥 NGƯỜI CHƠI (giữa 📚 Script Hub và ➕ Tạo Tính Năng) ─")

local function tabBtnByName(nm)
    for _, b in ipairs(H.tabs) do
        if tostring(b:GetAttribute("BCTabName")) == nm then return b end
    end
    return nil
end
local function tabOrder(nm)
    local b = tabBtnByName(nm)
    return b and b.LayoutOrder or nil
end

test("M1 · trang 👥 Người Chơi CÓ trên rail và nằm ĐÚNG GIỮA 📚 Script Hub và ➕ Tạo Tính Năng", function()
    local b = tabBtnByName("Người Chơi")
    truthy(b, "có trang 👥 Người Chơi trên rail")
    eq(tostring(b.Text), "👥", "icon trang là 👥")
    local oMe, oHub, oNew = tabOrder("Người Chơi"), tabOrder("Script Hub"), tabOrder("Tạo Tính Năng")
    truthy(oMe > oHub, string.format("phải đứng SAU 📚 Script Hub (%s > %s)", tostring(oMe), tostring(oHub)))
    truthy(oMe < oNew, string.format("phải đứng TRƯỚC ➕ Tạo Tính Năng (%s < %s)", tostring(oMe), tostring(oNew)))
    -- thứ tự thật trên rail (sắp theo LayoutOrder) đúng như mong đợi
    local rail = {}
    for _, t in ipairs(H.tabs) do
        if t.LayoutOrder ~= 99 then rail[#rail + 1] = { nm = tostring(t:GetAttribute("BCTabName")), o = t.LayoutOrder } end
    end
    table.sort(rail, function(x, y) return x.o < y.o end)
    local seq = {}
    for _, r in ipairs(rail) do seq[#seq + 1] = r.nm end
    local joined = table.concat(seq, " | ")
    local iHub = joined:find("Script Hub", 1, true)
    local iMe  = joined:find("Người Chơi", 1, true)
    local iNew = joined:find("Tạo Tính Năng", 1, true)
    truthy(iHub and iMe and iNew and iHub < iMe and iMe < iNew, "thứ tự rail: " .. joined)
    -- bấm vào trang 👥 thì trang mở ra thật
    Mock.click(b)
    Mock.advance(0.05)
    truthy(D.playerTab and D.playerTab.Visible, "bấm 👥 -> trang Người Chơi mở ra")
    truthy(D.playerTab:FindFirstChild("PlayerTitle"), "có tiêu đề trang")
end)

test("M2 · 2 khung 📍 + 👣 NẰM TRONG trang 👥 (không còn nằm trong danh sách Script Hub)", function()
    local loc  = D.playerTab and D.playerTab:FindFirstChild("HubLoc_Panel")
    local spec = D.playerTab and D.playerTab:FindFirstChild("HubSpec_Panel")
    truthy(loc, "khung 📍 ĐỊNH VỊ nằm trong trang 👥")
    truthy(spec, "khung 👣 XEM NGƯỜI CHƠI nằm trong trang 👥")
    falsy(D.hubList:FindFirstChild("HubLoc_Panel"), "danh sách Script Hub KHÔNG còn khung 📍 (đã chuyển trang)")
    falsy(D.hubList:FindFirstChild("HubSpec_Panel"), "danh sách Script Hub KHÔNG còn khung 👣 (đã chuyển trang)")
    -- 2 khung xếp dọc, không đè nhau
    local y1 = loc.Position.Y.Offset
    local y2 = spec.Position.Y.Offset
    truthy(y2 >= y1 + loc.Size.Y.Offset, string.format(
        "👣 phải nằm DƯỚI 📍 (📍 %d + cao %d = %d, 👣 ở %d)", y1, loc.Size.Y.Offset, y1 + loc.Size.Y.Offset, y2))
    truthy((D.playerTab.CanvasSize.Y.Offset or 0) >= y2 + spec.Size.Y.Offset,
        "trang 👥 cuộn đủ để thấy hết (CanvasSize)")
end)

test("M3 · nút trong trang 👥 chạy được: 👁️ Tất Cả · 👣 Bám theo · 🚫 dừng/dọn", function()
    resetChip()
    cleanStart(); S.Loc.StopAll(); wipePlayers(); cleanSpec()
    local a = addP("TrangMoi", 4001, Vector3.new(25, 5, 0))
    local panel = D.playerTab:FindFirstChild("HubLoc_Panel")
    truthy(panel, "có khung 📍")
    Mock.click(btnWithText(panel, "👁️ Tất Cả"))
    Mock.advance(0.3)
    truthy(S.Loc.on, "👁️ Tất Cả bật định vị")
    truthy(bb("TrangMoi"), "có nhãn định vị cho người chơi")
    -- 👣 Bám theo (trong trang 👥)
    local spanel = D.playerTab:FindFirstChild("HubSpec_Panel")
    Mock.click(btnWithText(spanel, "👣 Bám theo"))
    Mock.advance(0.4)
    truthy(S.Spec.on, "👣 Bám theo bật xem người chơi")
    eq(workspace.CurrentCamera.CameraType, Enum.CameraType.Scriptable, "camera bám theo")
    Mock.click(btnWithText(spanel, "🚫 Dừng xem"))
    Mock.advance(0.3)
    falsy(S.Spec.on, "🚫 Dừng xem tắt được")
    Mock.click(btnWithText(panel, "🚫 Tắt"))
    Mock.advance(0.3)
    falsy(S.Loc.on, "🚫 Tắt dọn sạch định vị")
    falsy(bb("TrangMoi"), "nhãn đã dọn")
    cleanLoc({ a })
end)

test("M4 · bấm TÊN trong trang 👥 = bám theo người đó (đúng ý 'nhấn vào người chơi')", function()
    resetChip()
    cleanStart(); S.Loc.StopAll(); wipePlayers(); cleanSpec()
    local a = addP("TrongTrang1", 4002, Vector3.new(0, 5, 0))
    local b = addP("TrongTrang2", 4003, Vector3.new(50, 5, 0))
    S.Spec.RefreshList()
    local hit = specRowBtn("TrongTrang2")
    truthy(hit, "có hàng để bấm trong danh sách của trang 👥")
    Mock.click(hit)
    Mock.advance(0.4)
    eq(S.Spec.target, b, "bấm tên -> bám đúng người")
    near(camPos().X, 50, 0.01, "camera đã sang chỗ người đó")
    cleanLoc({ a, b })
end)

test("M5 · KHÔNG mất tính năng: 5 thẻ 📍👣 vẫn còn trong 📚 Script Hub và vẫn chạy được", function()
    resetChip()
    cleanStart(); S.Loc.StopAll(); wipePlayers(); cleanSpec()
    local a = addP("TheCu", 4004, Vector3.new(10, 5, 0))
    for _, nm in ipairs({ "Định Vị Người Chơi", "Định Vị Lẻ", "Xem Người Chơi",
                          "Dừng Xem Người Chơi", "Tắt Định Vị" }) do
        truthy(card(nm), "thiếu thẻ cũ: " .. nm)
    end
    local msg = action("loc_all")
    Mock.advance(0.3)
    truthy(S.Loc.on, "thẻ 📍 trong Script Hub vẫn chạy: " .. msg)
    action("loc_stop")
    Mock.advance(0.2)
    -- 6 trang cũ còn nguyên
    for _, nm in ipairs({ "Code", "Code Đã Lưu", "Script Hub", "Hỗ Trợ", "Tạo Tính Năng", "Thiết Lập" }) do
        truthy(tabBtnByName(nm), "mất trang cũ: " .. nm)
    end
    -- tính năng di chuyển + HUD + tốc độ vẫn nguyên
    hum().WalkSpeed = 20
    S.Move.speedMode, S.Move.speedMul = "x", 3
    action("runmode")
    Mock.advance(0.3)
    truthy(H.workspace:FindFirstChild("Carpet"), "🪩 thảm vẫn trải")
    eq(hudBtn("🪩").Size.X.Offset, 50, "cụm nút nổi vẫn y hệt bản gốc")
    eq(hum().WalkSpeed, 60, "👟 tốc độ vẫn theo game ×3")
    S.Move.StopAll(); cleanLoc({ a })
end)

test("M6 · trang 👥 đang MỞ: 2 danh sách tự làm mới (không cần mở 📚 Script Hub)", function()
    resetChip()
    cleanStart(); S.Loc.StopAll(); wipePlayers(); cleanSpec()
    local a = addP("DauTien", 4005, Vector3.new(0, 5, 0))
    D.hubTab.Visible = false
    D.playerTab.Visible = true
    S.Spec.RefreshList(); S.Loc.RefreshList()
    local before = 0
    for _, c in ipairs(specList():GetChildren()) do if c.ClassName == "Frame" then before = before + 1 end end
    eq(before, 1, "bắt đầu có 1 người")
    local b = addP("VaoSau", 4006, Vector3.new(4, 5, 0))
    Mock.advance(2.4)
    local after = 0
    for _, c in ipairs(specList():GetChildren()) do if c.ClassName == "Frame" then after = after + 1 end end
    eq(after, 2, "người mới vào tự hiện trong danh sách của trang 👥")
    truthy(specRowBtn("VaoSau"), "bấm được ngay tên người mới")
    D.playerTab.Visible = false
    cleanLoc({ a, b })
end)

print("\n── N. v4.16: ✨ PHÁT SÁNG (nhân vật mình · chỉnh RỘNG + ĐỘ SÁNG) ──────────")

local function glowPanel() return D.hubList:FindFirstChild("HubGlow_Panel") end
local function glowBoxes()
    local t = {}
    local p = glowPanel()
    if not p then return t end
    for _, d in ipairs(p:GetChildren()) do
        if d.ClassName == "TextBox" then t[#t + 1] = d end
    end
    return t                      -- 📏 Rộng , ☀ Sáng
end
local function glowBtn(name) local p = glowPanel(); return p and p:FindFirstChild(name) or nil end
local function glowHL()
    local h = H.gui:FindFirstChild("BC_GlowHL")
    if h then return h end
    local t = H.targetGui
    return t and t:FindFirstChild("BC_GlowHL") or nil
end
local function glowPL() local r = root(); return r and r:FindFirstChild("BC_GlowLight") or nil end
local function cleanGlow()
    pcall(function() S.Glow.Stop() end)
    pcall(function() S.Glow.SetWidth(18); S.Glow.SetBright(3) end)
    pcall(function() S.Glow.SetThru(true); S.Glow.SetLight(true) end)
    pcall(function() S.Glow.SetColor(1) end)
    Mock.advance(0.05)
end

test("N1 · bật ✨ Phát Sáng: nhân vật MÌNH có viền nhuộm sáng + đèn toả sáng quanh người", function()
    resetChip()
    cleanStart(); cleanGlow()
    truthy(card("Phát Sáng"), "có thẻ ✨ Phát Sáng trong 📚 Script Hub")
    local p = glowPanel()
    truthy(p, "có khung ✨ ngay trong Script Hub")
    truthy(p:FindFirstChild("GlowTitle"), "có tiêu đề khung")
    truthy(glowBtn("GlowApply"), "có nút ✔ Áp dụng")
    truthy(glowBtn("GlowStop"), "có nút 🚫 Tắt")
    local msg = action("glow")
    Mock.advance(0.2)
    truthy(S.Glow.on, "đã bật: " .. msg)
    local hl = glowHL()
    truthy(hl, "có Highlight nhuộm sáng (BC_GlowHL)")
    eq(hl.Adornee, H.player.Character, "nhuộm ĐÚNG nhân vật của mình")
    truthy(glowPL(), "có PointLight toả sáng trong người (BC_GlowLight)")
    truthy(tostring(msg):find("BẬT", 1, true), "thao tác trả về trạng thái BẬT: " .. msg)
    cleanGlow()
end)

test("N2 · ☀ ĐỘ SÁNG: càng lớn -> nhuộm càng đặc + PointLight càng sáng", function()
    cleanStart(); cleanGlow()
    action("glow")
    Mock.advance(0.2)
    S.Glow.SetBright(1); Mock.advance(0.1)
    local t1 = glowHL().FillTransparency
    S.Glow.SetBright(9); Mock.advance(0.1)
    local t9 = glowHL().FillTransparency
    truthy(t9 < t1, string.format("sáng 9 phải đặc hơn sáng 1 (%.2f < %.2f)", t9, t1))
    eq(glowPL().Brightness, 9, "đèn thật sáng đúng 9")
    -- áp dụng bằng ô nhập ☀
    glowBoxes()[2].Text = "6"
    Mock.click(glowBtn("GlowApply"))
    Mock.advance(0.2)
    eq(S.Glow.bright, 6, "nút ✔ Áp dụng đọc đúng ô ☀ Sáng")
    eq(glowPL().Brightness, 6, "đèn thật theo độ sáng mới")
    truthy(tostring(glowBtn("GlowApply").Text):find("Áp dụng", 1, true), "nút ✔ còn nguyên")
    cleanGlow()
end)

test("N3 · 📏 CHIỀU RỘNG: đổi là bán kính toả sáng đổi ngay (không cần tắt/bật lại)", function()
    cleanStart(); cleanGlow()
    action("glow")
    Mock.advance(0.2)
    eq(glowPL().Range, 18, "bán kính mặc định 18")
    glowBoxes()[1].Text = "45"
    Mock.click(glowBtn("GlowApply"))
    Mock.advance(0.2)
    eq(S.Glow.width, 45, "đọc đúng ô 📏 Rộng")
    eq(glowPL().Range, 45, "bán kính toả sáng = 45 ngay lập tức")
    -- nhận số vô lý: kẹp trong khoảng cho phép, không vỡ
    S.Glow.SetWidth(9999); eq(S.Glow.width, 200, "kẹp trần 200")
    S.Glow.SetWidth(-5);   eq(S.Glow.width, 1, "kẹp sàn 1")
    cleanGlow()
end)

test("N4 · ÁNH SÁNG KHÔNG BỊ TRÓI: game xoá thì tự gắn lại, respawn thì theo nhân vật mới", function()
    cleanStart(); cleanGlow()
    action("glow")
    Mock.advance(0.2)
    truthy(glowHL() and glowPL(), "đang có đủ 2 thứ")
    -- game/anti-cheat xoá sạch
    local oldHL, oldPL = glowHL(), glowPL()
    oldHL:Destroy()
    oldPL:Destroy()
    Mock.advance(0.8)                       -- vòng canh gác 0,5 giây -> tự gắn lại
    truthy(glowHL(), "Highlight được GẮN LẠI sau khi bị xoá")
    truthy(glowPL(), "PointLight được GẮN LẠI sau khi bị xoá")
    truthy(glowHL() ~= oldHL, "đúng là bản MỚI (bản cũ đã bị xoá)")
    truthy(glowPL() ~= oldPL, "đèn cũng là bản MỚI")
    -- respawn: nhân vật mới -> theo sang nhân vật mới
    local ch = resetChar()
    Mock.advance(0.6)
    local hl = glowHL()
    truthy(hl, "sau respawn vẫn còn phát sáng")
    eq(hl.Adornee, ch, "nhuộm ĐÚNG nhân vật MỚI")
    truthy(glowPL(), "đèn nằm trong nhân vật mới")
    eq(glowPL().Parent, ch:FindFirstChild("HumanoidRootPart"), "đèn theo HumanoidRootPart mới")
    cleanGlow()
end)

test("N5 · 🚫 Tắt: dọn SẠCH hiệu ứng + ngắt vòng canh gác (không ngầm chạy nữa)", function()
    cleanStart(); cleanGlow()
    action("glow")
    Mock.advance(0.2)
    truthy(Mock.renderSteps["BC_Glow"], "vòng canh gác đang chạy")
    Mock.click(glowBtn("GlowStop"))
    Mock.advance(0.3)
    falsy(S.Glow.on, "đã tắt")
    falsy(glowHL(), "Highlight đã dọn")
    falsy(glowPL(), "PointLight đã dọn")
    falsy(Mock.renderSteps["BC_Glow"], "vòng canh gác đã ngắt")
    -- tắt rồi mà game có xoá gì cũng không tự dựng lại
    Mock.advance(1.0)
    falsy(glowHL(), "không tự bật lại khi đã TẮT")
    cleanGlow()
end)

test("N6 · 👁 Xuyên tường + 💡 Đèn thật: bật/tắt đúng như mô tả", function()
    cleanStart(); cleanGlow()
    action("glow")
    Mock.advance(0.2)
    eq(glowHL().DepthMode, Enum.HighlightDepthMode.AlwaysOnTop, "mặc định: sáng xuyên vật cản")
    Mock.click(glowBtn("GlowThru"))
    Mock.advance(0.2)
    eq(glowHL().DepthMode, Enum.HighlightDepthMode.Occluded, "tắt xuyên tường -> bị vật cản che")
    Mock.click(glowBtn("GlowThru"))
    Mock.advance(0.2)
    eq(glowHL().DepthMode, Enum.HighlightDepthMode.AlwaysOnTop, "bật lại -> xuyên tường")
    eq(glowPL().Shadows, false, "đèn KHÔNG đổ bóng -> ánh sáng không bị vật cản chặn")
    Mock.click(glowBtn("GlowLight"))                       -- tắt đèn thật
    Mock.advance(0.2)
    falsy(glowPL(), "tắt đèn thật -> PointLight biến mất")
    truthy(glowHL(), "vẫn còn nhuộm sáng nhân vật")
    Mock.click(glowBtn("GlowLight"))                       -- bật lại
    Mock.advance(0.2)
    truthy(glowPL(), "bật lại -> đèn có lại")
    cleanGlow()
end)

test("N7 · 🎨 Đổi màu: xoay vòng 7 màu, đổi cả viền nhuộm lẫn đèn", function()
    cleanStart(); cleanGlow()
    action("glow")
    Mock.advance(0.2)
    local c1 = glowHL().FillColor
    Mock.click(glowBtn("GlowColor"))
    Mock.advance(0.2)
    local c2 = glowHL().FillColor
    truthy(c1 ~= c2, "bấm 🎨 -> đổi màu khác")
    eq(glowPL().Color, c2, "đèn đổi cùng màu với viền nhuộm")
    eq(glowHL().OutlineColor, c2, "viền ngoài cùng màu")
    for _ = 1, 6 do Mock.click(glowBtn("GlowColor")); Mock.advance(0.05) end
    eq(glowHL().FillColor, c1, "bấm đủ 7 lần -> quay về màu ban đầu")
    cleanGlow()
end)

test("N8 · không mất tính năng cũ: thẻ lọc được + 2 khung cùng sống sót + thảm/HUD/tốc độ còn nguyên", function()
    resetChip()
    cleanStart(); cleanGlow()
    -- chip 'Tiện ích' lọc ra được thẻ ✨
    truthy(D.hubChipBtns["Tiện ích"], "có chip Tiện ích")
    S.hubCat = "Tiện ích"; S.RebuildHubList()
    truthy(card("Phát Sáng"), "chip Tiện ích lọc ra thẻ ✨")
    S.hubCat = "Tất cả"; S.RebuildHubList()
    -- 2 khung điều khiển sống sót qua dựng lại danh sách
    S.RebuildHubList(); S.RebuildHubList()
    truthy(D.hubList:FindFirstChild("HubMove_Panel"), "khung ⚙ di chuyển vẫn còn")
    truthy(glowPanel(), "khung ✨ phát sáng vẫn còn")
    -- CanvasSize đủ chỗ cho cả 2 khung + mọi thẻ
    local h = D.hubList.CanvasSize.Y.Offset
    local need = #cards() * 62 + D.hubList:FindFirstChild("HubMove_Panel").Size.Y.Offset
        + glowPanel().Size.Y.Offset
    truthy(h >= need, string.format("CanvasSize (%d) phải >= thẻ + 2 khung (%d)", h, need))
    -- khung ⚙ vẫn đủ 7 nút, khung ✨ đủ 6 nút
    truthy(#panelBtns() >= 7, "khung ⚙ vẫn đủ nút cũ (>= 7): " .. #panelBtns())
    local n = 0
    for _, d in ipairs(glowPanel():GetDescendants()) do
        if d.ClassName == "TextButton" then n = n + 1 end
    end
    eq(n, 6, "khung ✨ có 6 nút (✨ · 👁 · 💡 · 🎨 · ✔ · 🚫)")
    -- tính năng cũ vẫn sống: thảm + HUD + tốc độ theo game
    hum().WalkSpeed = 20
    S.Move.speedMode, S.Move.speedMul = "x", 3
    action("runmode")
    Mock.advance(0.3)
    truthy(H.workspace:FindFirstChild("Carpet"), "🪩 thảm vẫn trải được")
    eq(hudBtn("🪩").Size.X.Offset, 50, "cụm nút nổi vẫn y hệt bản gốc")
    eq(hum().WalkSpeed, 60, "👟 tốc độ vẫn theo game ×3")
    S.Move.StopAll()
    cleanGlow()
end)

test("N9 · GUI của hub bị gỡ: phát sáng KHÔNG bị trói — tự treo sang GUI khác đang sống", function()
    cleanStart(); cleanGlow()
    local savedParent = H.gui.Parent
    action("glow")
    Mock.advance(0.2)
    truthy(glowHL(), "đang phát sáng")
    H.gui.Parent = nil                     -- game/anti-cheat gỡ GUI của hub
    Mock.advance(0.8)
    local hl = glowHL()
    truthy(hl, "viền nhuộm sáng VẪN SỐNG (đã treo sang GUI khác)")
    eq(hl.Adornee, H.player.Character, "vẫn nhuộm đúng nhân vật mình")
    truthy(hl.Parent ~= H.gui, "không còn treo vào GUI đã bị gỡ")
    H.gui.Parent = savedParent             -- trả GUI về như cũ
    Mock.advance(0.8)
    truthy(glowHL(), "trả GUI về -> phát sáng vẫn còn")
    cleanGlow()
end)

print("\n── O. v4.17: 🛡 BAY AN TOÀN (tự bay + né vật chuyển động) ───────────────")

local function safePanel() return D.hubList:FindFirstChild("HubSafe_Panel") end
local function safeBoxes()
    local t = {}
    local p = safePanel()
    if not p then return t end
    for _, d in ipairs(p:GetChildren()) do
        if d.ClassName == "TextBox" then t[#t + 1] = d end
    end
    return t                                  -- 📏 Né , 💨 Bay , 🌀 Gắt
end
local function safeBtn(nm) local p = safePanel(); return p and p:FindFirstChild(nm) or nil end
local function safeVel()
    local mv = H.S_Move
    return (mv._bv and mv._bv.Velocity) or nil
end
-- tạo vật cản trong workspace; moving=true -> vật CHẠY qua lại (có vận tốc thật)
local function addThreat(pos, moving, cframeOnly)
    local part = Instance.new("Part")
    part.Name = "Threat"
    part.Size = Vector3.new(4, 4, 4)
    part.Anchored = false
    part.CanCollide = true
    part.Position = pos
    part.AssemblyLinearVelocity = Vector3.new(0, 0, 0)
    part.Parent = H.workspace
    local alive = true
    if moving then
        task.spawn(function()
            while alive do
                local t = tick()
                local nx = pos.X + math.sin(t * 5) * 5
                part.Position = Vector3.new(nx, pos.Y, pos.Z)
                if not cframeOnly then part.AssemblyLinearVelocity = Vector3.new(-10, 0, 0) end
                task.wait(0.05)
            end
        end)
    end
    return part, function() alive = false end
end
local function cleanSafe(extra)
    pcall(function() S.Move.Safe.Stop() end)
    pcall(function() S.Move.Safe.SetRadius(25); S.Move.Safe.SetSpeed(60); S.Move.Safe.SetSteer(4) end)
    pcall(function() S.Move.Safe.SetAuto(true) end)
    -- v4.19: trả cả công tắc mới về mặc định — test gãy giữa chừng không lây sang test sau
    pcall(function()
        S.Move.Safe.SetAvoidPlayers(true)
        S.Move.Safe.SetCircle(true)
        S.Move.Safe.SetCircleR(20)
        S.Move.Safe.SetLook(1.0)
        S.Move.Safe.Recenter()
    end)
    wipePlayers()                      -- v4.19: dọn người chơi test còn sót (test gãy giữa chừng -> không lây)
    pcall(function() Mock.clearRealParts() end)   -- v4.20: dọn boss "kiểu instance thật" còn sót
    -- v4.19: trả camera về mặc định (nhìn -Z) — test trước (👣 theo dõi) để lại hướng camera khác,
    -- mà 🛡 lại bay theo hướng camera khi không bấm phím -> kết quả phải TẤT ĐỊNH.
    pcall(function() H.workspace.CurrentCamera.CFrame = CFrame.new(0, 10, 0) end)
    for _, p in ipairs(extra or {}) do pcall(function() p:Destroy() end) end
    for _, d in ipairs(H.workspace:GetChildren()) do
        if d.Name == "Threat" then pcall(function() d:Destroy() end) end
    end
    Mock.advance(0.1)
end

test("O1 · bật 🛡 Bay An Toàn: TỰ BAY (không bấm phím nào) + có thẻ + khung điều khiển", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    truthy(card("Bay An Toàn"), "có thẻ 🛡 Bay An Toàn")
    local p = safePanel()
    truthy(p, "có khung 🛡 trong Script Hub")
    truthy(p:FindFirstChild("SafeTitle"), "có tiêu đề khung 🛡")
    local msg = action("safefly")
    Mock.advance(0.5)
    truthy(S.Move.Safe.on, "đã bật: " .. msg)
    truthy(S.Move.fly, "🚀 Bay cũng được bật theo")
    local v = safeVel()
    truthy(v, "có vận tốc bay (BodyVelocity)")
    truthy(v.Magnitude > 10, string.format("KHÔNG bấm phím nào mà vẫn bay: |v| = %.1f", v.Magnitude))
    near(v.Magnitude, 60, 2, "tốc độ đúng bằng 💨 đã đặt")
    truthy(tostring(msg):find("BẬT", 1, true), "thao tác báo trạng thái: " .. msg)
    cleanSafe()
end)

test("O2 · NÉ vật CÓ DẤU HIỆU CHUYỂN ĐỘNG: vận tốc bị đẩy RA XA vật đó", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    root().Position = Vector3.new(0, 20, 0)
    local part, stop = addThreat(Vector3.new(14, 20, 0), true)     -- vật chạy qua lại bên phải
    S.Move.Safe.SetRadius(30)
    S.Move.Safe.Set(true)
    Mock.advance(1.0)
    local v = safeVel()
    truthy(S.Move.Safe.threats >= 1, "phải phát hiện được vật chuyển động: " .. tostring(S.Move.Safe.threats))
    truthy(S.Move.Safe.nearest, "có khoảng cách gần nhất")
    truthy(v.X < -1, string.format("vận tốc phải bị đẩy NGƯỢC lại (ra xa vật): v.X = %.2f", v.X))
    truthy(tostring(S.Move.Safe.Status()):find("đang né", 1, true), "trạng thái báo đang né: " .. S.Move.Safe.Status())
    stop(); cleanSafe({ part })
end)

test("O3 · vật ĐỨNG YÊN thì KHÔNG né (bay xuyên qua bình thường)", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    root().Position = Vector3.new(0, 20, 0)
    local part = addThreat(Vector3.new(10, 20, 0), false)          -- vật đứng yên ngay cạnh
    -- v4.19: ⭕ khiến vận tốc luôn khác 0 khi rảnh, nên tắt ⭕ + nhìn thẳng vào vật
    -- để thấy rõ "KHÔNG né, bay xuyên qua bình thường".
    S.Move.Safe.SetCircle(false)
    S.Move.Safe.SetRadius(30)
    H.workspace.CurrentCamera.CFrame = CFrame.lookAt(Vector3.new(0, 20, 0), Vector3.new(1, 20, 0))
    S.Move.Safe.Set(true)
    Mock.advance(1.0)
    eq(S.Move.Safe.threats, 0, "vật đứng yên KHÔNG bị coi là mối nguy")
    local v = safeVel()
    truthy(v.X > 5, string.format("vẫn bay THẲNG vào vật, không bị né: v.X = %.2f", v.X))
    near(v.Y, 0, 0.8, "không có thành phần đẩy ngang/lên")
    local rp = S.Move.Safe._rep
    truthy((rp == nil) or rp.Magnitude < 0.5, "không sinh lực đẩy nào với vật đứng yên")
    truthy(v.Magnitude > 10, "vẫn bay bình thường")
    Mock.advance(0.6)                     -- bay tiếp: hướng phải GIỮ NGUYÊN (không bị né/lệch)
    local h1 = Vector3.new(v.X, 0, v.Z)
    local v2 = safeVel()
    local h2 = Vector3.new(v2.X, 0, v2.Z)
    truthy(h1.X * h2.X + h1.Z * h2.Z > 0.99 * h1.Magnitude * h2.Magnitude,
           "hướng bay KHÔNG đổi -> bay xuyên qua vật đứng yên")
    cleanSafe({ part })
end)

test("O4 · 📏 KHOẢNG CÁCH XÁC ĐỊNH ĐỂ NÉ: ngoài bán kính thì không né, vào bán kính là né", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    root().Position = Vector3.new(0, 20, 0)
    local part, stop = addThreat(Vector3.new(40, 20, 0), true)     -- vật ở cách 40 studs
    S.Move.Safe.Set(true)
    S.Move.Safe.SetRadius(20)                                      -- né trong 20m -> ngoài tầm
    Mock.advance(0.8)
    eq(S.Move.Safe.threats, 0, "cách 40m mà chỉ né trong 20m -> không né")
    S.Move.Safe.SetRadius(60)                                      -- né trong 60m -> vào tầm
    Mock.advance(0.8)
    truthy(S.Move.Safe.threats >= 1, "nới bán kính -> phát hiện và né")
    truthy(safeVel().X < -0.5, "có đẩy ra xa")
    -- đổi bằng ô nhập 📏
    safeBoxes()[1].Text = "25"
    Mock.click(safeBtn("SafeApply"))
    Mock.advance(0.3)
    eq(S.Move.Safe.radius, 25, "ô 📏 Né đổi được bán kính")
    stop(); cleanSafe({ part })
end)

test("O5 · 💨 TỐC ĐỘ BAY chỉnh được (và khung ⚙ hiện cùng một số)", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    root().Position = Vector3.new(0, 30, 0)
    safeBoxes()[2].Text = "120"
    local msg = action("safefly")
    Mock.advance(0.3)
    safeBoxes()[2].Text = "120"
    Mock.click(safeBtn("SafeApply"))
    Mock.advance(0.5)
    eq(S.Move.Safe.speed, 120, "đọc đúng ô 💨 Bay")
    near(safeVel().Magnitude, 120, 3, "bay đúng tốc độ 120")
    eq(S.Move.flySpeed, 120, "khung ⚙ và 🛡 dùng chung một con số tốc độ bay")
    safeBoxes()[2].Text = "35"
    Mock.click(safeBtn("SafeApply"))
    Mock.advance(0.5)
    near(safeVel().Magnitude, 35, 2, "giảm xuống 35 -> bay chậm lại")
    -- số vô lý không làm vỡ
    S.Move.Safe.SetSpeed(99999); eq(S.Move.Safe.speed, 2000, "kẹp trần 2000")
    S.Move.Safe.SetSpeed(-3);    eq(S.Move.Safe.speed, 1, "kẹp sàn 1")
    cleanSafe()
end)

test("O6 · 🌀 NÉ GẮT: càng cao thì lực đẩy càng mạnh", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    root().Position = Vector3.new(0, 20, 0)
    local part, stop = addThreat(Vector3.new(20, 20, 0), true)
    S.Move.Safe.SetRadius(40)
    S.Move.Safe.Set(true)
    S.Move.Safe.SetSteer(1)
    Mock.advance(0.8)
    local soft = safeVel().X
    S.Move.Safe.SetSteer(10)
    Mock.advance(0.8)
    local hard = safeVel().X
    truthy(hard < soft, string.format("né gắt 10 phải đẩy mạnh hơn (%.1f < %.1f)", hard, soft))
    -- và vận tốc luôn bị kẹp trần (không vọt vô hạn)
    truthy(math.abs(hard) <= S.Move.Safe.speed * 2 + 0.01, "vận tốc bị kẹp trần an toàn")
    stop(); cleanSafe({ part })
end)

test("O7 · ➡ Tự bay TẮT: không bấm gì thì đứng yên tại chỗ (nhưng vẫn tự né)", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    root().Position = Vector3.new(0, 25, 0)
    S.Move.Safe.Set(true)
    S.Move.Safe.SetAuto(false)
    Mock.advance(0.5)
    near(safeVel().Magnitude, 0, 1.5, "tắt tự bay + không bấm gì -> không bay đi")
    local part, stop = addThreat(Vector3.new(12, 25, 0), true)
    S.Move.Safe.SetRadius(30)
    Mock.advance(0.9)
    truthy(safeVel().Magnitude > 1, "có vật chuyển động tới -> VẪN tự né dù không bấm gì")
    stop(); cleanSafe({ part })
end)

test("O8 · vật bị script/TWEEN kéo đi (vận tốc = 0) VẪN bị né (nhờ dấu hiệu đổi vị trí)", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    root().Position = Vector3.new(0, 20, 0)
    -- cframeOnly = true: chỉ đổi vị trí, KHÔNG có AssemblyLinearVelocity
    local part, stop = addThreat(Vector3.new(14, 20, 0), true, true)
    S.Move.Safe.SetRadius(30)
    S.Move.Safe.Set(true)
    Mock.advance(1.2)
    eq(part.AssemblyLinearVelocity.Magnitude, 0, "vật này vận tốc = 0 (kiểu tween/CFrame)")
    truthy(S.Move.Safe.threats >= 1, "vẫn nhận ra là vật CHUYỂN ĐỘNG nhờ đổi vị trí")
    truthy(safeVel().X < -1, "vẫn né được")
    stop(); cleanSafe({ part })
end)

test("O9 · 🚫 Tắt: tắt cả Bay + dọn BodyVelocity + không còn tự bay", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    action("safefly")
    Mock.advance(0.4)
    truthy(S.Move.fly, "đang bay")
    Mock.click(safeBtn("SafeStop"))
    Mock.advance(0.4)
    falsy(S.Move.Safe.on, "bay an toàn đã tắt")
    falsy(S.Move.fly, "🚀 Bay cũng tắt theo (không còn bay lơ lửng)")
    falsy(safeVel(), "BodyVelocity đã dọn")
    falsy(root().Parent == nil, "nhân vật còn nguyên")
    cleanSafe()
end)

test("O10 · không mất tính năng cũ: 3 khung điều khiển + thảm/HUD/định vị/phát sáng còn nguyên", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    S.RebuildHubList(); S.RebuildHubList()
    truthy(D.hubList:FindFirstChild("HubMove_Panel"), "khung ⚙ di chuyển còn")
    truthy(D.hubList:FindFirstChild("HubGlow_Panel"), "khung ✨ phát sáng còn")
    truthy(safePanel(), "khung 🛡 bay an toàn còn")
    local h = D.hubList.CanvasSize.Y.Offset
    local need = #cards() * 62
        + D.hubList:FindFirstChild("HubMove_Panel").Size.Y.Offset
        + D.hubList:FindFirstChild("HubGlow_Panel").Size.Y.Offset
        + safePanel().Size.Y.Offset
    truthy(h >= need, string.format("CanvasSize (%d) phải >= thẻ + 3 khung (%d)", h, need))
    truthy(#panelBtns() >= 7, "khung ⚙ vẫn đủ nút cũ (>= 7): " .. #panelBtns())
    -- các tính năng khác vẫn chạy khi 🛡 đang bật
    local a = addP("NguChoi", 5001, Vector3.new(30, 5, 0))
    S.Loc.Set(true)
    action("glow")
    S.Move.Safe.Set(true)
    Mock.advance(0.5)
    truthy(bb("NguChoi"), "📍 định vị vẫn hiện")
    truthy(H.gui:FindFirstChild("BC_GlowHL") or H.targetGui:FindFirstChild("BC_GlowHL"), "✨ phát sáng vẫn chạy")
    truthy(safeVel().Magnitude > 5, "🛡 vẫn tự bay")
    S.Move.Safe.Stop()
    S.Loc.StopAll()
    S.Glow.Stop()
    cleanLoc({ a })
    cleanSafe()
end)

test("O11 · vật tới QUÁ GẦN (dưới 40% bán kính): vọt LÊN TRÊN cho chắc", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    root().Position = Vector3.new(0, 20, 0)
    local part, stop = addThreat(Vector3.new(8, 20, 0), true)      -- 8 studs, bán kính 40 -> 20%
    S.Move.Safe.SetRadius(40)
    S.Move.Safe.Set(true)
    Mock.advance(1.0)
    local v = safeVel()
    truthy(S.Move.Safe.nearest <= 16, "đang có vật rất gần: " .. tostring(S.Move.Safe.nearest))
    truthy(v.Y > 5, string.format("phải có thành phần BAY LÊN (không bấm Space): v.Y = %.1f", v.Y))
    truthy(v.X < -1, "vẫn đẩy ra xa theo chiều ngang")
    stop(); cleanSafe({ part })
end)

test("O12 · quét nhiều vật: 200 vật đứng yên + 1 vật chạy -> đếm ĐÚNG 1 mối nguy, không lỗi", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    root().Position = Vector3.new(0, 40, 0)
    local junk = {}
    for i = 1, 200 do
        local p = Instance.new("Part")
        p.Name = "Junk" .. i
        p.Size = Vector3.new(2, 2, 2)
        p.Anchored = true
        p.Position = Vector3.new(math.cos(i) * 25, 40 + (i % 5), math.sin(i) * 25)
        p.Parent = H.workspace
        junk[#junk + 1] = p
    end
    local mover, stop = addThreat(Vector3.new(15, 40, 0), true)
    local nerr = #Mock.errors
    S.Move.Safe.SetRadius(45)
    S.Move.Safe.Set(true)
    Mock.advance(1.5)
    eq(#Mock.errors, nerr, "không phát sinh lỗi runtime khi quét")
    eq(S.Move.Safe.threats, 1, "chỉ đúng 1 vật chuyển động (200 vật đứng yên không tính)")
    truthy(safeVel().X < -1, "vẫn né đúng vật chạy")
    stop()
    for _, p in ipairs(junk) do pcall(function() p:Destroy() end) end
    cleanSafe({ mover })
end)

print("\n── P. v4.18: 🔲 KHIÊN TRONG SUỐT + 👤 NÉ NGƯỜI CHƠI + 🧱 ĐẨY XUYÊN VẬT CẢN ──")

local function shieldParts()
    local t = {}
    for _, d in ipairs(H.workspace:GetChildren()) do
        if tostring(d.Name):sub(1, 9) == "BC_Shield" then t[#t + 1] = d end
    end
    return t
end
local function cleanShieldFly()
    cleanSafe()
    for _, d in ipairs(shieldParts()) do pcall(function() d:Destroy() end) end
end

test("P1 · 🔲 Khiên: 4 vách trong suốt hình vuông bao quanh mình, đúng cỡ 📏 × 2", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    Mock.advance(0.1)
    eq(#shieldParts(), 0, "chưa bật thì chưa có khiên")
    S.Move.Safe.SetRadius(25)
    S.Move.Safe.Set(true)
    Mock.advance(0.4)
    local w = shieldParts()
    eq(#w, 4, "có đúng 4 vách (hình vuông)")
    local rad = S.Move.Safe.radius
    for _, p in ipairs(w) do
        eq(p.CanCollide, false, "vách KHÔNG va chạm (chỉ để nhìn)")
        eq(p.Anchored, true, "vách đứng yên tại chỗ")
        truthy(p.Transparency >= 0.5, "vách TRONG SUỐT (transparency " .. tostring(p.Transparency) .. ")")
        truthy(p.Size.X >= rad * 2 - 1 or p.Size.Z >= rad * 2 - 1, "cạnh dài = 📏 × 2")
    end
    -- 2 vách ngang (dài theo X) + 2 vách dọc (dài theo Z)
    local long = 0
    for _, p in ipairs(w) do if p.Size.X > p.Size.Z then long = long + 1 end end
    eq(long, 2, "đúng 2 vách dài theo X")
    cleanShieldFly()
end)

test("P2 · 🔲 Khiên BÁM THEO mình (di chuyển là khiên theo) + đổi 📏 là đổi cỡ", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    root().Position = Vector3.new(0, 30, 0)
    S.Move.Safe.SetRadius(20)
    S.Move.Safe.Set(true)
    Mock.advance(0.3)
    local w = shieldParts()
    local cx = 0
    for _, p in ipairs(w) do cx = cx + p.Position.X end
    near(cx / 4, 0, 0.01, "tâm khiên nằm đúng chỗ mình (X)")
    -- đi sang chỗ khác -> khiên theo
    root().Position = Vector3.new(100, 45, -60)
    Mock.advance(0.4)
    local cy, cz = 0, 0
    for _, p in ipairs(w) do cy = cy + p.Position.Y; cz = cz + p.Position.Z end
    near(cy / 4, 45, 0.01, "khiên theo độ cao mới")
    near(cz / 4, -60, 0.01, "khiên theo trục Z mới")
    -- đổi bán kính -> cỡ khiên đổi ngay
    S.Move.Safe.SetRadius(60)
    Mock.advance(0.4)
    local okBig = false
    for _, p in ipairs(shieldParts()) do
        if p.Size.X >= 119 or p.Size.Z >= 119 then okBig = true end
    end
    truthy(okBig, "tăng 📏 Né -> khiên to ra theo (cạnh >= 120)")
    cleanShieldFly()
end)

test("P3 · 🔲 Tắt khiên (hoặc tắt 🛡) là DỌN SẠCH, không để rác trong workspace", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    S.Move.Safe.Set(true)
    Mock.advance(0.3)
    eq(#shieldParts(), 4, "đang có khiên")
    Mock.click(safeBtn("SafeShield"))                 -- 🔲 Khiên: TẮT
    Mock.advance(0.3)
    falsy(S.Move.Safe.shield, "cờ khiên đã tắt")
    eq(#shieldParts(), 0, "vách đã dọn sạch")
    truthy(S.Move.Safe.on, "vẫn đang né bình thường (chỉ ẩn khiên)")
    Mock.click(safeBtn("SafeShield"))                 -- bật lại
    Mock.advance(0.3)
    eq(#shieldParts(), 4, "bật lại -> khiên có lại")
    S.Move.Safe.Stop()
    Mock.advance(0.3)
    eq(#shieldParts(), 0, "tắt 🛡 -> khiên cũng dọn")
    cleanShieldFly()
end)

test("P4 · 👤 NÉ NGƯỜI CHƠI: người chơi khác ĐỨNG YÊN vẫn bị né (đẩy ra xa họ)", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    root().Position = Vector3.new(0, 30, 0)
    local a = addP("NguoiDung", 6001, Vector3.new(15, 30, 0))   -- đứng yên, cách 15m
    S.Move.Safe.SetRadius(30)
    S.Move.Safe.Set(true)
    Mock.advance(1.0)
    eq(S.Move.Safe.playerThreats, 1, "đếm được 1 người chơi là mối nguy: " .. tostring(S.Move.Safe.playerThreats))
    truthy(S.Move.Safe.threats >= 1, "tổng mối nguy >= 1")
    local v = safeVel()
    truthy(v.X < -1, string.format("bị đẩy RA XA người chơi đó: v.X = %.2f", v.X))
    truthy(tostring(S.Move.Safe.Status()):find("người chơi", 1, true), "trạng thái có nhắc người chơi")
    -- CHÍNH MÌNH không bao giờ bị tính là mối nguy
    eq(shieldParts() and #shieldParts() or 0, 4, "khiên cũng không tự né chính nó")
    cleanLoc({ a }); cleanShieldFly()
end)

test("P5 · 👤 Né người: TẮT -> bỏ qua người chơi, chỉ né vật chuyển động", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    root().Position = Vector3.new(0, 30, 0)
    local a = addP("DungYen", 6002, Vector3.new(12, 30, 0))
    S.Move.Safe.SetRadius(30)
    S.Move.Safe.Set(true)
    Mock.advance(0.8)
    eq(S.Move.Safe.playerThreats, 1, "đang né người chơi")
    Mock.click(safeBtn("SafePlayers"))                -- 👤 Né người: TẮT
    Mock.advance(0.8)
    falsy(S.Move.Safe.avoidPlayers, "đã tắt né người chơi")
    eq(S.Move.Safe.playerThreats, 0, "không còn coi người chơi là mối nguy")
    eq(S.Move.Safe.threats, 0, "không còn mối nguy nào (người đứng yên)")
    -- v4.19: ⭕ làm vận tốc luôn khác 0 khi rảnh -> soi TRỰC TIẾP lực đẩy (không còn đẩy vì người đứng yên)
    local rp = S.Move.Safe._rep
    truthy((rp == nil) or rp.Magnitude < 0.5, "không bị đẩy bởi người đứng yên nữa")
    truthy(safeVel().Magnitude > 5, "vẫn tự bay bình thường")
    -- TẮT né người nhưng VẬT CHUYỂN ĐỘNG thì vẫn né (đúng tên test)
    local mvPart, stopMv = addThreat(Vector3.new(14, 30, 0), true)
    Mock.advance(1.0)
    truthy(S.Move.Safe.threats >= 1, "vật chuyển động vẫn bị coi là mối nguy khi 👤 TẮT")
    truthy(safeVel().X < -0.5, "vẫn đẩy ra xa vật chuyển động")
    stopMv()
    pcall(function() mvPart:Destroy() end)            -- chỉ dọn vật, GIỮ người chơi để kiểm tra bật lại
    Mock.advance(0.4)
    Mock.click(safeBtn("SafePlayers"))                -- bật lại
    Mock.advance(0.8)
    eq(S.Move.Safe.playerThreats, 1, "bật lại -> né người chơi trở lại")
    cleanLoc({ a }); cleanShieldFly()
end)

test("P6 · 🧱 ĐẨY XUYÊN VẬT CẢN: bật 🛡 là tự bật Xuyên Tường, tắt 🛡 là TRẢ LẠI như cũ", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    -- trường hợp 1: Xuyên Tường đang TẮT -> bật 🛡 rồi tắt 🛡 phải trả về TẮT
    S.Move.SetNoclip(false)
    S.Move.Safe.SetNoclipAuto(true)
    S.Move.Safe.Set(true)
    Mock.advance(0.3)
    truthy(S.Move.noclip, "bật 🛡 -> Xuyên Tường tự BẬT (để đẩy xuyên qua vật cản)")
    truthy(tostring(S.Move.Safe.Status()):find("xuyên", 1, true), "trạng thái ghi rõ đang xuyên vật cản")
    S.Move.Safe.Stop()
    Mock.advance(0.3)
    falsy(S.Move.noclip, "tắt 🛡 -> Xuyên Tường trả về TẮT như trước")
    -- trường hợp 2: Xuyên Tường ĐANG BẬT từ trước -> tắt 🛡 phải GIỮ BẬT (không cướp của người dùng)
    S.Move.SetNoclip(true)
    S.Move.Safe.Set(true)
    Mock.advance(0.3)
    S.Move.Safe.Stop()
    Mock.advance(0.3)
    truthy(S.Move.noclip, "trước đó đang bật thì tắt 🛡 vẫn giữ BẬT")
    S.Move.SetNoclip(false)
    cleanShieldFly()
end)

test("P7 · 🧱 tắt công tắc Xuyên giữa chừng: trả lại ngay, không đợi tắt 🛡", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    S.Move.SetNoclip(false)
    S.Move.Safe.SetNoclipAuto(true)
    S.Move.Safe.Set(true)
    Mock.advance(0.3)
    truthy(S.Move.noclip, "đang xuyên")
    Mock.click(safeBtn("SafeNoclip"))                 -- 🧱 Xuyên: TẮT
    Mock.advance(0.3)
    falsy(S.Move.Safe.noclip, "cờ đã tắt")
    falsy(S.Move.noclip, "Xuyên Tường trả lại ngay (không đợi tắt 🛡)")
    Mock.click(safeBtn("SafeNoclip"))                 -- bật lại
    Mock.advance(0.3)
    truthy(S.Move.noclip, "bật lại -> xuyên trở lại")
    S.Move.Safe.Stop()
    Mock.advance(0.3)
    falsy(S.Move.noclip, "tắt 🛡 -> trả về TẮT")
    S.Move.Safe.SetNoclipAuto(true)
    cleanShieldFly()
end)

test("P8 · đẩy XUYÊN QUA tường: có vật cản ngay cạnh mà vẫn bị đẩy ra xa (không kẹt)", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    root().Position = Vector3.new(0, 30, 0)
    -- bức tường ĐỨNG YÊN (không né) ngay bên phải + vật chạy ở xa hơn
    local wall = Instance.new("Part")
    wall.Name = "Tuong"
    wall.Size = Vector3.new(2, 40, 40)
    wall.Anchored = true
    wall.CanCollide = true
    wall.Position = Vector3.new(6, 30, 0)
    wall.Parent = H.workspace
    local mover, stop = addThreat(Vector3.new(20, 30, 0), true)
    S.Move.Safe.SetRadius(40)
    S.Move.Safe.Set(true)
    Mock.advance(1.0)
    truthy(S.Move.noclip, "Xuyên Tường đang bật -> lực đẩy không bị tường chặn")
    local v = safeVel()
    truthy(v.X < -1, string.format("vẫn bị đẩy ra xa dù có tường: v.X = %.2f", v.X))
    -- Xuyên Tường của hub hoạt động đúng kiểu Roblox: tắt va chạm của CÁC PART TRÊN NGƯỜI MÌNH
    -- (không đụng vào tường của game) -> mình xuyên qua được mọi vật cản.
    eq(root().CanCollide, false, "part trên người mình đã tắt va chạm -> xuyên qua tường được")
    eq(wall.CanCollide, true, "tường của game KHÔNG bị hub sửa (không phá game)")
    stop()
    pcall(function() wall:Destroy() end)
    cleanShieldFly()
end)

test("P9 · không mất tính năng cũ: thẻ/khung + thảm/HUD/📍/✨ + đếm đúng mối nguy khi đông người", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    S.RebuildHubList()
    truthy(card("Bay An Toàn"), "thẻ 🛡 còn")
    local p = safePanel()
    truthy(p and p:FindFirstChild("SafeShield"), "nút 🔲 Khiên còn")
    truthy(p and p:FindFirstChild("SafePlayers"), "nút 👤 Né người còn")
    truthy(p and p:FindFirstChild("SafeNoclip"), "nút 🧱 Xuyên còn")
    truthy(p and p:FindFirstChild("SafeNote"), "còn dòng ghi chú")
    truthy(D.hubList:FindFirstChild("HubMove_Panel"), "khung ⚙ còn")
    truthy(D.hubList:FindFirstChild("HubGlow_Panel"), "khung ✨ còn")
    local h = D.hubList.CanvasSize.Y.Offset
    local need = #cards() * 62 + D.hubList:FindFirstChild("HubMove_Panel").Size.Y.Offset
        + D.hubList:FindFirstChild("HubGlow_Panel").Size.Y.Offset + safePanel().Size.Y.Offset
    truthy(h >= need, string.format("CanvasSize (%d) >= thẻ + 3 khung (%d)", h, need))
    -- đông người: 3 người chơi quanh mình -> đếm đủ
    root().Position = Vector3.new(0, 30, 0)
    local a = addP("P_A", 6011, Vector3.new(10, 30, 0))
    local b = addP("P_B", 6012, Vector3.new(-12, 30, 0))
    local c = addP("P_C", 6013, Vector3.new(0, 30, 14))
    S.Move.Safe.SetRadius(30)
    S.Move.Safe.Set(true)
    Mock.advance(1.0)
    eq(S.Move.Safe.playerThreats, 3, "đếm đủ 3 người chơi")
    -- 🛡 đang bật mà tính năng khác vẫn chạy
    action("runmode")
    Mock.advance(0.4)
    truthy(H.workspace:FindFirstChild("Carpet"), "🪩 thảm vẫn trải khi 🛡 đang bay")
    eq(hudBtn("🪩").Size.X.Offset, 50, "cụm nút nổi vẫn y hệt bản gốc")
    truthy(S.Move.Safe.on, "🛡 vẫn đang bật")
    S.Move.StopAll()
    cleanLoc({ a, b, c })
    cleanShieldFly()
end)

print("\n── Q. 👁 BẮT VẬT BAY TỚI MÌNH + ⭕ TỰ BAY VÒNG TRÒN (v4.19) ───")

-- mock không có Vector3:Dot -> tự tính cos góc giữa 2 vector trên mặt phẳng ngang
qdot = function(a, b)
    local h1 = Vector3.new(a.X, 0, a.Z)
    local h2 = Vector3.new(b.X, 0, b.Z)
    local m = h1.Magnitude * h2.Magnitude
    if m < 0.0001 then return 1 end
    return (h1.X * h2.X + h1.Z * h2.Z) / m
end

test("Q1 · 👁 NHÌN TRƯỚC: vật LAO TỚI từ NGOÀI 📏 vẫn bị bắt và né", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    root().Position = Vector3.new(0, 30, 0)
    S.Move.Safe.SetRadius(20)                              -- 📏 = 20 -> quét tới 32
    local part = addThreat(Vector3.new(28, 30, 0), false)  -- NGOÀI 📏 (28 > 20), vẫn trong tầm quét
    part.AssemblyLinearVelocity = Vector3.new(-30, 0, 0)   -- lao tới mình 30 m/s
    S.Move.Safe.Set(true)
    Mock.advance(1.0)
    truthy(S.Move.Safe.threats >= 1, "bắt được vật lao tới dù còn NGOÀI 📏: " .. tostring(S.Move.Safe.threats))
    truthy(S.Move.Safe.nearest and S.Move.Safe.nearest > 20, "lúc bắt được thì vật vẫn ở ngoài 📏")
    truthy(safeVel().X < -1, string.format("né TRƯỚC khi nó tới: v.X = %.2f", safeVel().X))
    truthy(tostring(S.Move.Safe.Status()):find("đang né", 1, true), "trạng thái báo đang né")
    -- vật bay RA XA thì không phải mối nguy
    part.AssemblyLinearVelocity = Vector3.new(30, 0, 0)
    Mock.advance(0.8)
    eq(S.Move.Safe.threats, 0, "vật bay RA XA thì KHÔNG né")
    cleanSafe({ part })
end)

test("Q2 · 👁 NHÌN TRƯỚC chỉnh được: nhìn xa thì bắt sớm, nhìn gần thì bỏ qua", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    root().Position = Vector3.new(0, 30, 0)
    S.Move.Safe.SetRadius(20)
    local part = addThreat(Vector3.new(28, 30, 0), false)
    part.AssemblyLinearVelocity = Vector3.new(-30, 0, 0)   -- tới nơi sau ~0,7s
    S.Move.Safe.SetLook(0.2)                               -- chỉ nhìn trước 0,2s -> chưa bắt
    S.Move.Safe.Set(true)
    Mock.advance(0.8)
    eq(S.Move.Safe.threats, 0, "👁 0,2s -> chưa bắt (vật còn ngoài 📏)")
    S.Move.Safe.SetLook(3)                                 -- nhìn xa 3s -> bắt được
    Mock.advance(0.8)
    truthy(S.Move.Safe.threats >= 1, "👁 3s -> bắt được vật lao tới")
    truthy(safeVel().X < -1, "và né ra xa")
    safeBoxes()[5].Text = "2.5"                            -- ô 👁 trên khung điều khiển
    Mock.click(safeBtn("SafeApply"))
    eq(S.Move.Safe.lookTime, 2.5, "ô 👁 Nhìn trước trên khung áp dụng đúng")
    cleanSafe({ part })
end)

test("Q3 · ⭕ KHÔNG có gì lao tới -> TỰ BAY VÒNG TRÒN (hướng bay đổi liên tục)", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    root().Position = Vector3.new(0, 30, 0)
    S.Move.Safe.SetRadius(25)
    S.Move.Safe.SetCircle(true)
    S.Move.Safe.SetCircleR(20)
    S.Move.Safe.Set(true)
    Mock.advance(0.4)
    local v1 = safeVel()
    truthy(v1 and v1.Magnitude > 10, "vẫn tự bay khi rảnh")
    near(v1.Magnitude, 60, 2, "bay đúng tốc độ 💨")
    Mock.advance(0.6)
    local v2 = safeVel()
    local dc = qdot(v1, v2)
    truthy(dc < 0.999, string.format("hướng bay ĐỔI (đang vòng tròn): cos = %.3f", dc))
    truthy(S.Move.Safe._ang and S.Move.Safe._ang > 0.5, "góc vòng tròn đang tăng: " .. tostring(S.Move.Safe._ang))
    truthy(S.Move.Safe._center, "có tâm vòng tròn")
    truthy(tostring(S.Move.Safe.Status()):find("vòng tròn", 1, true), "trạng thái ghi rõ: " .. S.Move.Safe.Status())
    cleanSafe()
end)

test("Q4 · ⭕ TẠM DỪNG khi đang né, né xong tự bay vòng tròn lại", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    root().Position = Vector3.new(0, 30, 0)
    S.Move.Safe.SetRadius(30)
    S.Move.Safe.Set(true)
    Mock.advance(0.5)
    truthy(tostring(S.Move.Safe.Status()):find("vòng tròn", 1, true), "lúc rảnh: bay vòng tròn")
    local part, stop = addThreat(Vector3.new(20, 30, 0), true)   -- vật chạy qua lại (có vận tốc thật)
    Mock.advance(0.5)
    truthy(S.Move.Safe.threats >= 1, "đã thấy vật chuyển động")
    truthy(tostring(S.Move.Safe.Status()):find("tạm dừng", 1, true),
           "trạng thái: ⭕ tạm dừng khi đang né -> " .. S.Move.Safe.Status())
    truthy(safeVel().X < -1, "ưu tiên NÉ: bị đẩy ra xa")
    stop()
    part.AssemblyLinearVelocity = Vector3.new(0, 0, 0)     -- đứng hẳn lại -> hết mối nguy
    Mock.advance(1.5)                                      -- hết mối nguy + hết giữ 0,35s
    eq(S.Move.Safe.threats, 0, "không còn mối nguy")
    truthy(tostring(S.Move.Safe.Status()):find("vòng tròn", 1, true), "né xong -> tự bay VÒNG TRÒN lại")
    cleanSafe({ part })
end)

test("Q5 · ⭕ BẤM WASD -> tạm dừng vòng tròn, bay theo phím; NHẢ ra bay vòng tròn lại", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    root().Position = Vector3.new(0, 30, 0)
    S.Move.Safe.Set(true)
    Mock.advance(0.4)
    truthy(tostring(S.Move.Safe.Status()):find("vòng tròn", 1, true), "lúc rảnh: bay vòng tròn")
    hum().MoveDirection = Vector3.new(0, 0, -1)            -- bấm W
    Mock.advance(0.3)
    local v = safeVel()
    near(v.Z, -60, 2, "bay đúng theo phím W")
    near(v.X, 0, 1.5, "không còn nghiêng theo vòng tròn")
    falsy(tostring(S.Move.Safe.Status()):find("vòng tròn", 1, true), "đang bấm phím -> không bay vòng tròn")
    hum().MoveDirection = Vector3.new(0, 0, 0)             -- nhả phím
    Mock.advance(0.6)
    local a1 = safeVel()
    Mock.advance(0.6)
    local a2 = safeVel()
    truthy(qdot(a1, a2) < 0.999, "nhả phím -> tự bay vòng tròn lại (hướng đổi)")
    truthy(tostring(S.Move.Safe.Status()):find("vòng tròn", 1, true), "trạng thái lại là bay vòng tròn")
    cleanSafe()
end)

test("Q6 · ⭕ nút trên khung: TẮT -> bay THẲNG; bật lại -> vòng tròn; ô ⭕ Bán kính áp dụng", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    S.RebuildHubList()
    local ci = safeBtn("SafeCircle")
    truthy(ci, "có nút ⭕ Vòng tròn trên khung")
    truthy(tostring(ci.Text):find("BẬT", 1, true), "đang BẬT: " .. tostring(ci.Text))
    Mock.click(ci)
    falsy(S.Move.Safe.circle, "đã tắt bay vòng tròn")
    truthy(tostring(safeBtn("SafeCircle").Text):find("TẮT", 1, true), "nút hiện TẮT")
    root().Position = Vector3.new(0, 30, 0)
    H.workspace.CurrentCamera.CFrame = CFrame.lookAt(Vector3.new(0, 30, 0), Vector3.new(1, 30, 0))
    S.Move.Safe.Set(true)
    Mock.advance(0.5)
    local a1 = safeVel()
    Mock.advance(0.6)
    local a2 = safeVel()
    truthy(qdot(a1, a2) > 0.999, "TẮT ⭕ -> bay THẲNG một hướng")
    truthy(safeVel().X > 5, "bay theo hướng đang nhìn")
    Mock.click(safeBtn("SafeCircle"))
    truthy(S.Move.Safe.circle, "bật lại vòng tròn")
    safeBoxes()[4].Text = "40"                              -- ô ⭕ Bán kính
    Mock.click(safeBtn("SafeApply"))
    eq(S.Move.Safe.circleR, 40, "ô ⭕ Bán kính áp dụng đúng")
    Mock.advance(0.6)
    local b1 = safeVel()
    Mock.advance(0.6)
    local b2 = safeVel()
    truthy(qdot(b1, b2) < 0.999, "bật lại -> lại bay vòng tròn")
    cleanSafe()
end)

test("Q7 · ⭕ BẬT mà KHÔNG mất tính năng: vẫn né vật lao tới, khiên/thẻ/thảm còn nguyên", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    root().Position = Vector3.new(0, 30, 0)
    S.Move.Safe.SetRadius(30)
    S.Move.Safe.Set(true)
    Mock.advance(0.4)
    local part = addThreat(Vector3.new(24, 30, 0), false)
    part.AssemblyLinearVelocity = Vector3.new(-45, 0, 0)   -- lao tới mình rất nhanh
    Mock.advance(0.5)
    truthy(S.Move.Safe.threats >= 1, "vẫn bắt được vật lao tới khi ⭕ đang bật")
    truthy(safeVel().X < -1, "vẫn né được")
    eq(#shieldParts(), 4, "🔲 khiên vẫn còn")
    local st = tostring(S.Move.Safe.Status())
    truthy(st:find("khiên", 1, true), "trạng thái còn 🔲 khiên")
    truthy(st:find("⭕", 1, true), "trạng thái còn ⭕")
    truthy(card("Bay An Toàn"), "thẻ 🛡 còn")
    truthy(safeBtn("SafeNote"), "dòng ghi chú còn")
    action("runmode")
    Mock.advance(0.4)
    truthy(H.workspace:FindFirstChild("Carpet"), "🪩 thảm vẫn trải khi ⭕ đang bật")
    truthy(S.Move.Safe.on, "🛡 vẫn đang bật")
    cleanShieldFly({ part })
end)

print("\n── R. 👾 BOSS/NEXTBOT GÍ MÌNH (instance thật · mặt vật · nhớ hướng né) ──")

-- v4.20: boss "kiểu INSTANCE THẬT" (bảng KHÔNG có __isInstance như instance của mock) — vì trong
-- Roblox thật instance là USERDATA; bản v4.19 đòi type(d) == "table" nên trong game thật 🛡 KHÔNG
-- BAO GIỜ thấy part nào -> boss gí mình mà không né. Đây là test chống tái phát cho đúng lỗi đó.
function addBoss(cfg) return Mock.addRealPart(cfg) end

test("R0 · (soi nguồn) hub nhận diện part bằng IsA, KHÔNG đòi type(x)=='table' (mock=bảng, game thật=userdata)", function()
    local src = tostring(_G.__HUBSRC or "")
    truthy(#src > 1000, "đọc được nguồn hub để soi")
    local i = src:find("local function sfIsPart(d)", 1, true)
    truthy(i, "còn hàm sfIsPart")
    local seg = src:sub(i, i + 1200)
    falsy(seg:find('type(d) ~= "table"', 1, true),
          "sfIsPart KHÔNG được đòi type(d) == \"table\" (mock thì instance là bảng, game thật là userdata)")
    truthy(seg:find('IsA("BasePart")', 1, true), 'phải nhận part qua IsA("BasePart")')
end)

test("R1 · 👾 BOSS (instance kiểu GAME THẬT) lao tới -> PHẢI né", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    root().Position = Vector3.new(0, 30, 0)
    addBoss({ name = "Boss", pos = Vector3.new(20, 30, 0), vel = Vector3.new(-20, 0, 0) })
    S.Move.Safe.SetRadius(30)
    S.Move.Safe.Set(true)
    Mock.advance(1.0)
    truthy(S.Move.Safe.threats >= 1, "phải THẤY boss: " .. tostring(S.Move.Safe.threats))
    truthy(safeVel().X < -1, string.format("phải né ra xa boss: v.X = %.2f", safeVel().X))
    truthy(tostring(S.Move.Safe.Status()):find("đang né", 1, true), "trạng thái: " .. S.Move.Safe.Status())
    cleanSafe()
end)

test("R2 · 👾 BOSS TO: né theo MẶT vật (tâm còn ngoài tầm quét) chứ không đợi tâm vào 📏", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    root().Position = Vector3.new(0, 30, 0)
    -- part 30 studs -> bán kính bao 15; tâm ở 34 studs (ngoài tầm quét 32) mà MẶT chỉ cách 19
    addBoss({ name = "BossTo", pos = Vector3.new(34, 30, 0), size = Vector3.new(30, 30, 30),
              vel = Vector3.new(-25, 0, 0) })
    S.Move.Safe.SetRadius(20)
    S.Move.Safe.Set(true)
    Mock.advance(1.0)
    truthy(S.Move.Safe.threats >= 1, "thấy boss TO dù TÂM ở ngoài tầm: " .. tostring(S.Move.Safe.threats))
    truthy(S.Move.Safe.nearest and S.Move.Safe.nearest < 20, "đo theo MẶT vật: " .. tostring(S.Move.Safe.nearest))
    truthy(safeVel().X < -1, "né ra xa")
    cleanSafe()
end)

test("R3 · 👾 BOSS GÍ SÁT: chạm người -> bay THOÁT (lên trên + ra xa), vẫn xuyên vật cản", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    root().Position = Vector3.new(0, 30, 0)
    addBoss({ name = "BossSat", pos = Vector3.new(3, 30, 0), size = Vector3.new(10, 10, 10),
              vel = Vector3.new(-30, 0, 0) })
    S.Move.Safe.SetRadius(30)
    S.Move.Safe.Set(true)
    Mock.advance(1.0)
    local v = safeVel()
    truthy(S.Move.Safe.threats >= 1, "thấy boss đang gí sát")
    truthy(v.Y > 5, string.format("phải VỌT LÊN cho thoát: v.Y = %.1f", v.Y))
    truthy(v.X < -1, "và đẩy ra xa")
    truthy(v.Magnitude > 20, "bay thoát chứ không đứng im: |v| = " .. string.format("%.1f", v.Magnitude))
    truthy(S.Move.noclip, "vẫn bật Xuyên Tường để thoát khỏi chỗ kẹt")
    cleanSafe()
end)

test("R4 · 👾 NHỚ HƯỚNG NÉ ~0,9s: boss đuổi theo, vừa rời tầm là KHÔNG quay lại hướng cũ", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    root().Position = Vector3.new(0, 30, 0)
    S.Move.Safe.SetCircle(false)                    -- tắt ⭕ cho dễ đo hướng bay thường (theo camera)
    S.Move.Safe.SetRadius(30)
    addBoss({ name = "BossDuoi", pos = Vector3.new(20, 30, 0), vel = Vector3.new(-25, 0, 0) })
    S.Move.Safe.Set(true)
    Mock.advance(0.8)
    truthy(safeVel().X < -1, "đang né (bay ra xa boss)")
    Mock.clearRealParts()                           -- boss biến mất khỏi tầm quét
    Mock.advance(0.25)
    truthy(safeVel().X < -1, string.format("VẪN bay ra xa (nhớ hướng né): v.X = %.2f", safeVel().X))
    Mock.advance(1.4)                               -- hết ký ức -> bay theo hướng camera (-Z)
    near(safeVel().X, 0, 1.5, "hết ký ức né -> không nghiêng ngang nữa")
    truthy(safeVel().Z < -10, "bay theo hướng camera")
    cleanSafe()
end)

test("R5 · 👾 QUÉT DÀY sau khi vừa bị gí: boss mới xuất hiện là bắt NGAY (không chờ 0,15s)", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    root().Position = Vector3.new(0, 30, 0)
    S.Move.Safe.SetRadius(30)
    addBoss({ name = "Boss1", pos = Vector3.new(20, 30, 0), vel = Vector3.new(-25, 0, 0) })
    S.Move.Safe.Set(true)
    Mock.advance(0.5)
    truthy(S.Move.Safe.threats >= 1, "đang có mối nguy")
    Mock.clearRealParts()
    Mock.advance(0.06)                              -- vừa hết nguy hiểm: còn trong "nhớ" 1s -> quét dày
    addBoss({ name = "Boss2", pos = Vector3.new(16, 30, 0), vel = Vector3.new(-25, 0, 0) })
    Mock.advance(0.08)                              -- 0,08s < 0,15s: quét thường sẽ HỤT
    truthy(S.Move.Safe.threats >= 1, "bắt được boss mới trong 0,08s nhờ quét dày")
    cleanSafe()
end)

test("R6 · 👾 NPC có Humanoid ĐANG ĐI (part vận tốc 0, vị trí không đổi) -> vẫn bị né", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    root().Position = Vector3.new(0, 30, 0)
    local m = Instance.new("Model"); m.Name = "NpcBoss"; m.Parent = H.workspace
    local body = Instance.new("Part"); body.Name = "Than"; body.Size = Vector3.new(4, 6, 4)
    body.Position = Vector3.new(12, 30, 0); body.AssemblyLinearVelocity = Vector3.new(0, 0, 0)
    body.Parent = m
    local npcHum = Instance.new("Humanoid"); npcHum.Parent = m
    npcHum.MoveDirection = Vector3.new(-1, 0, 0)    -- đang đi về phía mình
    S.Move.Safe.SetRadius(30)
    S.Move.Safe.Set(true)
    Mock.advance(1.0)
    truthy(S.Move.Safe.threats >= 1, "thấy NPC đang đi tới: " .. tostring(S.Move.Safe.threats))
    truthy(safeVel().X < -1, "né ra xa NPC")
    -- NPC ĐỨNG YÊN (MoveDirection = 0) -> KHÔNG né bừa
    npcHum.MoveDirection = Vector3.new(0, 0, 0)
    Mock.advance(1.4)
    eq(S.Move.Safe.threats, 0, "NPC đứng yên thì KHÔNG bị coi là mối nguy")
    m:Destroy()
    cleanSafe()
end)

test("R7 · 👾 KHÔNG né bừa: boss TO ĐỨNG YÊN thì không né, nhưng vừa CHẠY là né ngay", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    root().Position = Vector3.new(0, 30, 0)
    local boss = addBoss({ name = "BossToDungYen", pos = Vector3.new(25, 30, 0),
                           size = Vector3.new(30, 30, 30), vel = Vector3.new(0, 0, 0) })
    S.Move.Safe.SetRadius(30)
    S.Move.Safe.Set(true)
    Mock.advance(1.0)
    eq(S.Move.Safe.threats, 0, "boss TO đứng yên (mặt đã gần) vẫn KHÔNG bị né")
    local rp = S.Move.Safe._rep
    truthy((rp == nil) or rp.Magnitude < 0.5, "không có lực đẩy nào")
    boss.AssemblyLinearVelocity = Vector3.new(-25, 0, 0)     -- bắt đầu lao tới
    Mock.advance(0.6)
    truthy(S.Move.Safe.threats >= 1, "vừa CHẠY là bị né ngay")
    truthy(safeVel().X < -1, "né ra xa")
    cleanSafe()
end)

test("R8 · 👾 BOSS gí mà KHÔNG mất tính năng: ⭕ tạm dừng, khiên/thẻ/thảm còn nguyên", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    root().Position = Vector3.new(0, 30, 0)
    addBoss({ name = "Boss9", pos = Vector3.new(22, 30, 0), size = Vector3.new(8, 8, 8),
              vel = Vector3.new(-25, 0, 0) })
    S.Move.Safe.SetRadius(30)
    S.Move.Safe.Set(true)
    Mock.advance(0.8)
    truthy(S.Move.Safe.threats >= 1, "thấy boss")
    truthy(safeVel().X < -1, "đang né")
    eq(#shieldParts(), 4, "🔲 khiên vẫn còn")
    local st = tostring(S.Move.Safe.Status())
    truthy(st:find("đang né", 1, true), "trạng thái: đang né")
    truthy(st:find("⭕", 1, true), "trạng thái còn ⭕")
    truthy(card("Bay An Toàn"), "thẻ 🛡 còn")
    action("runmode")
    Mock.advance(0.4)
    truthy(H.workspace:FindFirstChild("Carpet"), "🪩 thảm vẫn trải khi đang né boss")
    truthy(S.Move.Safe.on, "🛡 vẫn đang bật")
    cleanShieldFly()
end)

-- ============================================================================
-- S. 🎯 ĐỊNH VỊ TỐC ĐỘ (tab 🛠 Hỗ Trợ) — v4.21
-- ============================================================================
print("\n── S. 🎯 ĐỊNH VỊ TỐC ĐỘ (tab 🛠 Hỗ Trợ) ──────────────────────")

local function sm() return H.S.SpeedMeter end
local function smOff()
    pcall(function() S.Move.SetSpeed(false) end)
    pcall(function() sm().Set(false) end)
end
local function textIn(parent, needle)
    for _, d in ipairs(parent:GetDescendants()) do
        if type(d.Text) == "string" and d.Text:find(needle, 1, true) then return d end
    end
    return nil
end

test("S1 · 🎯 nằm trong tab 🛠 Hỗ Trợ và KHÔNG làm mất tính năng nào của tab", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    local m = sm()
    truthy(m and m.btn, "có nút 🎯 Định vị tốc độ")
    truthy(m.hud and m.hud.Parent == H.gui, "HUD nổi nằm trong màn hình game (gui)")
    eq(m.btn.Parent, S.AnaUi.devLbl.Parent, "cùng 1 tab với 🎯 Phân Tích Vật Thể (tab 🛠 Hỗ Trợ)")
    truthy(textIn(m.btn.Parent, "Dex Explorer"), "Script Nhanh (Dex) vẫn còn")
    truthy(textIn(m.btn.Parent, "SimpleSpy"), "Script Nhanh (SimpleSpy) vẫn còn")
    truthy(textIn(m.btn.Parent, "Phân Tích Vật Thể"), "mục Phân Tích Vật Thể vẫn còn")
    truthy(textIn(m.btn.Parent, "Waypoint"), "mục Waypoint vẫn còn")
    truthy(textIn(m.btn.Parent, "Định vị tốc độ"), "mục 🎯 mới có mặt")
    local tab = m.btn.Parent
    truthy(tab.CanvasSize.Y.Offset >= m.hintLbl.Position.Y.Offset + 14,
        string.format("tab đủ chỗ cuộn tới 🎯: canvas %d ≥ %d",
            tab.CanvasSize.Y.Offset, m.hintLbl.Position.Y.Offset + 14))
end)

test("S2 · 🎯 chỉ ĐỌC — không ghi WalkSpeed/JumpPower/CFrame (không thể phá tính năng khác)", function()
    local src = _G.__HUBSRC
    truthy(type(src) == "string", "có nguồn hub để soi")
    local a = src:find("v4.21: 🎯 ĐỊNH VỊ TỐC ĐỘ", 1, true)
    local b = src:find("-- ===== HẾT 🎯 ĐỊNH VỊ TỐC ĐỘ (v4.21) =====", 1, true)
    truthy(a and b and b > a, "tìm thấy khối 🎯 trong nguồn")
    local body = src:sub(a, b)
    falsy(body:find("WalkSpeed =", 1, true), "khối 🎯 KHÔNG ghi WalkSpeed")
    falsy(body:find("JumpPower =", 1, true), "khối 🎯 KHÔNG ghi JumpPower")
    falsy(body:find("CFrame = ", 1, true), "khối 🎯 KHÔNG ghi CFrame")
    truthy(body:find("BC_SpeedHud", 1, true), "có HUD nổi BC_SpeedHud cho màn hình game")
    truthy(body:find("[SM-READONLY]", 1, true), "có ghi chú chỉ-đọc trong nguồn")
end)

test("S3 · bật 🎯 (bấm nút thật) -> thấy MẶC ĐỊNH + HIỆN TẠI + CAO NHẤT, HUD hiện trên màn hình", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    smOff()
    local h = hum(); h.WalkSpeed = 20                 -- "game" đặt mặc định 20
    local m = sm()
    m.Step(0.05)
    Mock.click(m.btn)                                 -- bấm nút trong tab 🛠
    truthy(m.on, "nút 🎯 bật được (bấm là chạy)")
    eq(h.WalkSpeed, 20, "🎯 KHÔNG đổi WalkSpeed của nhân vật")
    truthy(m.hud.Visible, "HUD hiện ra khi bật (thấy trên màn hình game)")
    near(m.base, 20, 0.01, "dò đúng tốc độ mặc định của game = 20")
    truthy(m.baseLbl.Text:find("20.0", 1, true), "label mặc định: " .. m.baseLbl.Text)
    truthy(m.liveLbl.Text:find("studs/s", 1, true), "label tốc độ hiện tại: " .. m.liveLbl.Text)
    truthy(m.maxLbl.Text:find("studs/s", 1, true), "label cao nhất: " .. m.maxLbl.Text)
    truthy(m.hudLbl.Text:find("mặc định game", 1, true), "HUD nói tốc độ mặc định: " .. m.hudLbl.Text)
    truthy(m.hudLbl.Text:find("🏁", 1, true), "HUD có cả cao nhất")
    truthy(Mock.renderSteps["BC_SpeedMeter"], "vòng đo đang chạy khi bật")
    truthy(tostring(m.Status()):find("🎯", 1, true), "Status: " .. tostring(m.Status()))
    smOff()
end)

test("S4 · ⚡ đo TỐC ĐỘ THẬT đúng theo quãng đường (studs/s)", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    smOff()
    local m = sm()
    root().Position = Vector3.new(0, 30, 0)
    m.Reset(); m.Set(true)                            -- mốc = vị trí hiện tại
    root().Position = Vector3.new(0, 30, 3)
    m.Step(0.1)                                       -- 3 studs / 0.1s = 30 studs/s
    near(m.live, 30, 0.5, "tốc độ hiện tại = 30 studs/s")
    root().Position = Vector3.new(0, 30, 6)
    m.Step(0.1)
    near(m.live, 30, 0.5, "chạy đều thì vẫn 30")
    near(m.max, 30, 0.5, "đỉnh = 30")
    truthy(m.liveLbl.Text:find("30.0", 1, true), "label hiện tại hiện 30.0: " .. m.liveLbl.Text)
    smOff()
end)

test("S5 · 🏁 đỉnh GIỮ NGUYÊN khi chậm lại; nút 🗑 Xoá đỉnh đưa về 0", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    smOff()
    local m = sm()
    root().Position = Vector3.new(0, 30, 0)
    m.Reset(); m.Set(true)
    root().Position = Vector3.new(0, 30, 8)
    m.Step(0.1)                                       -- 80 studs/s
    near(m.max, 80, 1, "đỉnh = 80")
    for i = 1, 6 do                                   -- chậm lại: 1 studs/0.1s = 10
        root().Position = Vector3.new(0, 30, 8 + i)
        m.Step(0.1)
    end
    truthy(m.live < 20, "tốc độ hiện tại đã chậm lại: " .. tostring(m.live))
    truthy(m.max >= 79, "đỉnh VẪN giữ 80: " .. tostring(m.max))
    truthy(m.maxLbl.Text:find("80", 1, true), "label cao nhất: " .. m.maxLbl.Text)
    Mock.click(m.resetBtn)
    eq(m.max, 0, "🗑 xoá đỉnh -> cao nhất = 0")
    truthy(m.maxLbl.Text:find("0.0", 1, true), "label cao nhất về 0: " .. m.maxLbl.Text)
    smOff()
end)

test("S6 · 🛡 teleport / respawn KHÔNG tạo đỉnh ảo (bỏ mẫu > 25 studs/frame)", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    smOff()
    local m = sm()
    root().Position = Vector3.new(0, 30, 0)
    m.Reset(); m.Set(true)
    root().Position = Vector3.new(0, 30, 5)
    m.Step(0.1)                                       -- 50 studs/s
    local top = m.max
    truthy(top > 45, "đỉnh thật = 50: " .. tostring(top))
    root().Position = Vector3.new(0, 30, 500)         -- teleport 495 studs / 0.1s
    m.Step(0.1)
    eq(m.max, top, "teleport KHÔNG nhảy vào đỉnh")
    truthy(m.live < 60, "tốc độ hiện tại không nhảy theo teleport: " .. tostring(m.live))
    root().Position = Vector3.new(0, 30, 503)
    m.Step(0.1)                                       -- chạy tiếp bình thường: 30
    near(m.max, top, 0.001, "vẫn giữ đỉnh cũ")
    eq(#Mock.errors, 0, table.concat(Mock.errors, " | "))
    smOff()
end)

test("S7 · 🎯 hợp tác với 👟 CHẠY ĐỘ: mặc định vẫn 16 chứ KHÔNG nhầm thành 48 (×3)", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    smOff()
    local h = hum(); h.WalkSpeed = 16
    local m = sm()
    S.Move.SetSpeed(true)                             -- hub học mặc định 16 rồi áp 48
    eq(h.WalkSpeed, 48, "👟 đang áp 16 × 3")
    m.Set(true)
    m.Step(0.05)
    near(m.base, 16, 0.01, "mặc định = 16 (KHÔNG nhầm thành 48)")
    eq(h.WalkSpeed, 48, "🎯 không hạ tốc độ đang chạy của 👟")
    truthy(m.wsLbl.Text:find("×3.00", 1, true), "label cho biết đang ×3 mặc định: " .. m.wsLbl.Text)
    near(m.ws, 48, 0.01, "WalkSpeed hiện tại = 48")
    smOff()
    eq(h.WalkSpeed, 16, "tắt 👟 -> về 16")
end)

test("S8 · HUD nổi cập nhật SỐ THẬT + tắt 🎯 là ngắt vòng đo, tính năng khác còn nguyên", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    smOff()
    local m = sm()
    root().Position = Vector3.new(0, 30, 0)
    m.Reset(); m.Set(true)
    root().Position = Vector3.new(0, 30, 4)
    m.Step(0.1)                                       -- 40 studs/s
    truthy(m.hud.Visible, "HUD đang hiện")
    truthy(m.hudLbl.Text:find("40.0", 1, true), "HUD hiện tốc độ hiện tại 40.0: " .. m.hudLbl.Text)
    truthy(m.hudLbl.Text:find("studs/s", 1, true), "HUD có đơn vị studs/s")
    m.Set(false)
    falsy(m.hud.Visible, "tắt 🎯 -> HUD ẩn")
    falsy(Mock.renderSteps["BC_SpeedMeter"], "vòng đo đã ngắt (không tốn tài nguyên)")
    truthy(card("Bay An Toàn"), "thẻ 🛡 vẫn còn")
    truthy(H.S.Move.Safe, "API 🛡 vẫn còn")
    S.Move.Safe.Set(true)
    Mock.advance(0.3)
    truthy(S.Move.Safe.on, "🛡 vẫn bật chạy được sau khi dùng 🎯")
    S.Move.Safe.Set(false)
    eq(#Mock.errors, 0, table.concat(Mock.errors, " | "))
end)

test("S9 · 🎯 sống sót qua respawn (nhân vật mới) và không văng lỗi", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    smOff()
    local m = sm()
    m.Set(true)
    resetChar()                                       -- nhân vật mới, vị trí khác hẳn
    m.Step(0.1)
    Mock.advance(0.3)
    truthy(m.on, "🎯 vẫn đang bật sau respawn")
    truthy(m.max >= 0 and m.live >= 0, "số liệu vẫn hợp lệ")
    eq(#Mock.errors, 0, table.concat(Mock.errors, " | "))
    smOff()
end)

test("S10 · game ĐỔI tốc độ -> 🎯 tự học lại mặc định mới", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    smOff()
    local h = hum(); h.WalkSpeed = 16
    local m = sm()
    m.Set(true)
    m.Step(0.05)
    near(m.base, 16, 0.01, "mặc định ban đầu 16")
    h.WalkSpeed = 24                                  -- game đổi (map mới / anti-cheat đổi tốc độ)
    m.Step(0.05)
    near(m.base, 24, 0.01, "học lại mặc định mới = 24")
    truthy(m.baseLbl.Text:find("24.0", 1, true), "label mặc định mới: " .. m.baseLbl.Text)
    truthy(tostring(m.src):find("VỪA ĐỔI", 1, true), "nói rõ vừa học lại: " .. tostring(m.src))
    smOff()
end)

test("S11 · thanh so sánh: vạch xanh = mặc định game, cột xanh = tốc độ hiện tại", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    smOff()
    local h = hum(); h.WalkSpeed = 16
    local m = sm()
    root().Position = Vector3.new(0, 30, 0)
    m.Reset(); m.Set(true); m.Step(0.05)
    near(m.base, 16, 0.01, "mặc định 16")
    root().Position = Vector3.new(0, 30, 3.2)
    m.Step(0.1)                                       -- 32 = 2× mặc định
    truthy(m.barFill.Size.X.Scale > 0.9, "cột đầy khi đang chạy nhanh: " .. tostring(m.barFill.Size.X.Scale))
    near(m.barBase.Position.X.Scale, 0.5, 0.02, "vạch mặc định nằm ở đúng vị trí so với đỉnh")
    for i = 1, 6 do
        root().Position = Vector3.new(0, 30, 3.2 + i * 0.5)
        m.Step(0.1)                                   -- chậm lại: 5 studs/s
    end
    truthy(m.barFill.Size.X.Scale < 0.5, "chậm lại -> cột tụt xuống: " .. tostring(m.barFill.Size.X.Scale))
    truthy(m.barFill.Size.X.Scale > 0, "cột vẫn dương khi còn chạy")
    m.Set(false)
end)

-- ============================================================================
-- T. 🧱 XUYÊN TƯỜNG "CỨNG" + 🧲 TỰ ĐẨY XUYÊN (v4.22)
-- ============================================================================
print("\n── T. 🧱 XUYÊN TƯỜNG CỨNG + 🧲 ĐẨY XUYÊN ──────────────────────")

local function ncOff()
    pcall(function() S.Move.SetNoclip(false) end)
    pcall(function() if hum() then hum().MoveDirection = Vector3.new(0, 0, 0) end end)
end
local function ncBad(ch)
    for _, p in ipairs(ch:GetDescendants()) do
        if p:IsA("BasePart") and p.CanCollide ~= false then return p.Name end
    end
    return nil
end
local function gameArm(ch)                  -- "game chống xuyên tường": bật lại va chạm cho MỌI part
    for _, p in ipairs(ch:GetDescendants()) do
        if p:IsA("BasePart") then p.CanCollide = true end
    end
end

test("T1 · 🧱 THẮNG game BẬT LẠI CanCollide mỗi frame (hết kẹt tường)", function()
    local ch = resetChar()
    ncOff()
    gameArm(ch)
    action("noclip")
    Mock.advance(1 / 60)
    truthy(S.Move.noclip, "🧱 đang bật")
    for i = 1, 40 do
        gameArm(ch)                                  -- game ghi trước...
        Mock.advance(1 / 60)                         -- ...đúng 1 frame -> hub phải tắt lại trong frame đó
        local bad = ncBad(ch)
        falsy(bad, "frame " .. i .. ": part '" .. tostring(bad) .. "' vẫn còn va chạm -> kẹt tường")
    end
    truthy(S.Move.ncPass ~= false, "🧲 tự đẩy xuyên mặc định BẬT")
    truthy(Mock.renderSteps["BC_NoClip"], "có lớp ghi CanCollide ở CUỐI frame")
    ncOff(); Mock.advance(0.05)
    eq(#Mock.errors, 0, table.concat(Mock.errors, " | "))
end)

test("T2 · 🧱 part MỚI sinh giữa lúc game chống vẫn bị tắt trong 1 frame", function()
    local ch = resetChar()
    ncOff()
    action("noclip")
    Mock.advance(0.1)
    local extra = Instance.new("Part")
    extra.Name = "TuongAo"; extra.CanCollide = true; extra.Parent = ch
    Mock.advance(1 / 60)
    eq(extra.CanCollide, false, "part mới cũng bị tắt ngay")
    gameArm(ch)
    Mock.advance(1 / 60)
    eq(extra.CanCollide, false, "game bật lại -> hub tắt lại trong frame")
    extra:Destroy()
    ncOff(); Mock.advance(0.05)
    eq(#Mock.errors, 0, table.concat(Mock.errors, " | "))
end)

test("T3 · tắt 🧱 -> trả lại CanCollide GỐC từng part + gỡ lớp cuối frame", function()
    local ch = resetChar()
    local hat = ch:FindFirstChild("HatPart")
    ncOff()
    action("noclip"); Mock.advance(0.1)
    eq(root().CanCollide, false, "đang xuyên: thân tắt va chạm")
    truthy(Mock.renderSteps["BC_NoClip"], "có lớp cuối frame khi bật")
    action("noclip"); Mock.advance(0.1)
    falsy(S.Move.noclip, "đã tắt")
    falsy(Mock.renderSteps["BC_NoClip"], "gỡ lớp cuối frame (không tốn tài nguyên)")
    eq(root().CanCollide, true, "trả lại đúng gốc (true)")
    eq(hat.CanCollide, false, "phụ kiện vẫn false như gốc")
    -- tắt rồi thì game bật lại CanCollide là chuyện của game — hub KHÔNG đụng vào nữa
    gameArm(ch)
    Mock.advance(0.2)
    eq(root().CanCollide, true, "tắt 🧱 là thôi không ghi nữa")
    eq(#Mock.errors, 0, table.concat(Mock.errors, " | "))
end)

test("T4 · 🧲 kẹt cứng (bấm WASD mà không nhích) -> tự nhích xuyên qua", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    resetChar()
    root().Position = Vector3.new(0, 30, 0)
    ncOff()
    action("noclip")
    truthy(S.Move.ncPass ~= false, "🧲 đang BẬT")
    hum().MoveDirection = Vector3.new(1, 0, 0)        -- bấm D
    local x0 = root().Position.X
    Mock.advance(0.5)                                 -- không nhích chút nào = bị chặn CỨNG
    local dx = root().Position.X - x0
    truthy(dx > 3, string.format("phải tự nhích xuyên qua: dx = %.2f", dx))
    near(root().Position.Y, 30, 0.01, "giữ nguyên độ cao Y")
    near(root().Position.Z, 0, 0.5, "không lệch sang hướng khác")
    ncOff(); Mock.advance(0.05)
    eq(#Mock.errors, 0, table.concat(Mock.errors, " | "))
end)

test("T5 · 🧲 KHÔNG nhích khi: không bấm gì · công tắc TẮT · 🧱 đang tắt", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    resetChar()
    root().Position = Vector3.new(0, 30, 0)
    ncOff()
    action("noclip")
    hum().MoveDirection = Vector3.new(0, 0, 0)        -- (a) không bấm gì
    local x0 = root().Position.X
    Mock.advance(0.4)
    near(root().Position.X, x0, 1e-6, "không bấm gì -> đứng yên")
    Mock.click(S.Move._passBtn)                       -- (b) tắt công tắc 🧲
    falsy(S.Move.ncPass, "công tắc 🧲 đã TẮT")
    hum().MoveDirection = Vector3.new(1, 0, 0)
    x0 = root().Position.X
    Mock.advance(0.4)
    near(root().Position.X, x0, 1e-6, "tắt 🧲 -> không tự nhích")
    Mock.click(S.Move._passBtn)
    truthy(S.Move.ncPass, "bật lại 🧲")
    action("noclip")                                  -- (c) tắt 🧱
    Mock.advance(0.1)
    x0 = root().Position.X
    Mock.advance(0.4)
    near(root().Position.X, x0, 1e-6, "🧱 tắt -> không tự nhích")
    ncOff(); Mock.advance(0.05)
    eq(#Mock.errors, 0, table.concat(Mock.errors, " | "))
end)

test("T6 · 🧲 không đẩy thêm khi đi lại BÌNH THƯỜNG (không bị chặn)", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    resetChar()
    root().Position = Vector3.new(0, 30, 0)
    ncOff()
    action("noclip")
    truthy(S.Move.ncPass ~= false, "🧲 BẬT")
    hum().MoveDirection = Vector3.new(1, 0, 0)
    -- "game cho đi bình thường": mỗi frame nhân vật tiến 1 stud (60 stud/s)
    local stop = false
    H.RunService:BindToRenderStep("GameDiChuyen", 100, function()
        if stop then return end
        local p = root().Position
        root().Position = Vector3.new(p.X + 1, p.Y, p.Z)
    end)
    Mock.advance(0.5)
    stop = true
    pcall(function() H.RunService:UnbindFromRenderStep("GameDiChuyen") end)
    local x = root().Position.X
    truthy(x > 25 and x < 34, string.format("chỉ do game di chuyển, 🧲 không đẩy thêm: x = %.2f", x))
    ncOff(); Mock.advance(0.05)
    eq(#Mock.errors, 0, table.concat(Mock.errors, " | "))
end)

test("T7 · 🧱 sống sót qua respawn: nhân vật mới bị tắt va chạm trong 1 frame", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    ncOff()
    action("noclip"); Mock.advance(0.05)
    local ch2 = resetChar()
    gameArm(ch2)
    Mock.advance(1 / 60)
    local bad = ncBad(ch2)
    falsy(bad, "nhân vật mới vẫn xuyên được: " .. tostring(bad))
    truthy(Mock.renderSteps["BC_NoClip"], "lớp cuối frame vẫn còn")
    truthy(S.Move.noclip, "🧱 vẫn đang bật")
    ncOff(); Mock.advance(0.05)
    eq(#Mock.errors, 0, table.concat(Mock.errors, " | "))
end)

test("T8 · 🧱 chỉ sửa part TRÊN NGƯỜI MÌNH — tường/vật của game KHÔNG bị đụng", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    resetChar()
    local wall = Instance.new("Part")
    wall.Name = "TuongGame"; wall.Size = Vector3.new(4, 40, 40); wall.Anchored = true
    wall.CanCollide = true; wall.Position = Vector3.new(4, 30, 0); wall.Parent = H.workspace
    ncOff()
    action("noclip")
    for i = 1, 20 do
        wall.CanCollide = true                        -- game giữ tường chắc
        Mock.advance(1 / 60)
        eq(wall.CanCollide, true, "frame " .. i .. ": tường của game KHÔNG bị hub sửa")
    end
    wall:Destroy()
    ncOff(); Mock.advance(0.05)
    eq(#Mock.errors, 0, table.concat(Mock.errors, " | "))
end)

test("T9 · nút 🧲 trong khung ⚙ + KHÔNG mất tính năng nào", function()
    resetChip(); cleanStart(); cleanGlow(); cleanSafe()
    local b = S.Move._passBtn
    truthy(b, "có nút 🧲 trong khung ⚙")
    eq(b.Parent, D.hubList:FindFirstChild("HubMove_Panel"), "nút nằm trong khung ⚙")
    truthy(tostring(b.Text):find("🧲", 1, true), "chữ có 🧲: " .. tostring(b.Text))
    local st = (S.Move.ncPass ~= false)
    Mock.click(b)
    eq(S.Move.ncPass ~= false, not st, "bấm 🧲 đổi trạng thái")
    Mock.click(b)
    eq(S.Move.ncPass ~= false, st, "bấm lại trả về cũ")
    truthy(panelBtnWith("Nâng") and panelBtnWith("Hạ") and panelBtnWith("Tắt hết") and panelBtnWith("Chống rơi"),
        "các nút cũ của khung ⚙ vẫn còn")
    truthy(card("Xuyên Tường"), "thẻ 🧱 còn")
    truthy(card("Bay"), "thẻ 🚀 còn")
    truthy(card("Chạy Trên Thảm"), "thẻ 🏃 còn")
    truthy(S.Move.Safe, "🛡 còn")
    truthy(H.S.SpeedMeter, "🎯 còn")
    truthy(H.S.Spec and H.S.Glow, "👣/✨ còn")
    truthy(#H.tabs >= 7, "đủ tab: " .. #H.tabs)
    S.Move.StopAll(); Mock.advance(0.05)
    eq(#Mock.errors, 0, table.concat(Mock.errors, " | "))
end)

test("T10 · nguồn: 🧱 ép CanCollide MỖI FRAME + ghi ở CUỐI frame; 🧲 có công tắc", function()
    local src = _G.__HUBSRC
    truthy(type(src) == "string", "có nguồn hub để soi")
    truthy(src:find('BindToRenderStep("BC_NoClip"', 1, true), "có lớp BindToRenderStep BC_NoClip")
    truthy(src:find("Enum.RenderPriority.Last.Value", 1, true), "ghi ở ưu tiên CUỐI (sau script của game)")
    truthy(src:find("function MV._NcEnforce", 1, true), "có hàm ép lại CanCollide mỗi frame")
    local a = src:find("function MV._NcAssist", 1, true)
    truthy(a, "có hàm 🧲 đẩy xuyên")
    local body = src:sub(a, a + 2500)
    truthy(body:find("MV.ncPass", 1, true), "🧲 có công tắc MV.ncPass")
    truthy(body:find("MoveDirection", 1, true), "🧲 đi theo hướng đang bấm")
end)

print("\n── C. KIỂM TRA CUỐI ─────────────────────────────────────────")

test("C1 · không có lỗi runtime nào trong event / render step", function()
    Mock.advance(0.5)
    eq(#Mock.errors, 0, table.concat(Mock.errors, " | "))
end)

_G.__TESTRESULT = { pass = R.pass, fail = R.fail, failed = R.failed }
print(string.format("\n  (tổng %d test: %d pass · %d fail)", R.pass + R.fail, R.pass, R.fail))
return R
