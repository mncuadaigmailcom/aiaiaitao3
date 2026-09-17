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
    -- 6 trang cố định lúc khởi động (💾 💻 📚 🛠 ⚙️ ➕); trang 🧩 GUI Ngoài (99) tạo khi cần.
    eq(#H.tabs, 6, "số nút trang cố định trên rail")
    local names = {}
    for _, b in ipairs(H.tabs) do names[#names + 1] = tostring(b:GetAttribute("BCTabName")) end
    for _, need in ipairs({ "Code", "Code Đã Lưu", "Script Hub", "Hỗ Trợ", "Tạo Tính Năng", "Thiết Lập" }) do
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

test("B3 · có chip lọc 'Di chuyển' và lọc ra đúng 5 thẻ", function()
    truthy(D.hubChipBtns["Di chuyển"], "chip Di chuyển")
    S.hubCat = "Di chuyển"; S.RebuildHubList()
    eq(#cards(), 5, "chip Di chuyển lọc đúng 5 thẻ")
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
    local ch = resetChar()
    local h = hum()
    eq(h.WalkSpeed, 16, " WalkSpeed mặc định")
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
    local ch = resetChar()
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
    return t           -- ✔ , ✔ , ⬆ Nâng, ⬇ Hạ, 🛑 Tắt hết
end

test("D1 · ô nhập trong khung ⚙: đổi tốc độ bay / chạy / nhảy", function()
    local b = panelBoxes()
    eq(#b, 6, "có đúng 6 ô nhập (bay, chạy, nhảy, rộng, cao, dài)")
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
    Mock.click(panelBtns()[3])                       -- ⬆
    eq(S.Move.carpetY, y0 + 2.5, "nâng 2.5")
    Mock.click(panelBtns()[4])                       -- ⬇
    eq(S.Move.carpetY, y0, "hạ về chỗ cũ")
    S.Move.StopAll(); Mock.advance(0.05)
end)

test("D4 · 🛑 Tắt hết trong khung ⚙ tắt được tất cả", function()
    local ch = resetChar()
    action("fly"); action("noclip"); action("infjump"); action("speed")
    Mock.advance(0.1)
    Mock.click(panelBtns()[5])
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
    eq(#cards(), 5, "đúng 5 thẻ di chuyển")
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

test("E1 · 🏃 Chạy Trên Thảm: bật = có thảm + tăng tốc + HUD hiện", function()
    local ch = resetChar()
    S.Move.walkSpeed = 90
    local msg = action("runmode")
    Mock.advance(0.1)
    truthy(S.Move.runMode, "cờ chế độ chạy")
    truthy(tostring(msg):find("BẬT"), "thông báo BẬT: " .. msg)
    truthy(H.workspace:FindFirstChild("Carpet"), "có thảm kính dưới chân")
    eq(ch:FindFirstChild("Humanoid").WalkSpeed, 90, "tốc độ chạy đã áp")
    truthy(hud(), "có HUD")
    eq(hud().Visible, true, "HUD đang hiện trên màn hình")
    S.Move.StopAll(); Mock.advance(0.05)
end)

test("E2 · thảm nằm DƯỚI CHÂN (cách 3 studs như bản gốc) và đủ rõ để thấy", function()
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
    eq(S.Move.carpetY, y0 + 2.5, "⬆ nâng 2.5")
    Mock.click(hudBtn("⬇"))
    eq(S.Move.carpetY, y0, "⬇ hạ về chỗ cũ")
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

print("\n── C. KIỂM TRA CUỐI ─────────────────────────────────────────")

test("C1 · không có lỗi runtime nào trong event / render step", function()
    Mock.advance(0.5)
    eq(#Mock.errors, 0, table.concat(Mock.errors, " | "))
end)

_G.__TESTRESULT = { pass = R.pass, fail = R.fail, failed = R.failed }
print(string.format("\n  (tổng %d test: %d pass · %d fail)", R.pass + R.fail, R.pass, R.fail))
return R
