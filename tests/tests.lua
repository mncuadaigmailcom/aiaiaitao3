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
    return t           -- ✔ , ✔ , ⬆ Nâng, ⬇ Hạ, 🛑 Tắt hết
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
    Mock.click(panelBtns()[3])                       -- ⬆
    near(S.Move.carpetY, y0 + 2.5, 1e-6, "nâng 2.5")
    Mock.click(panelBtns()[4])                       -- ⬇
    near(S.Move.carpetY, y0, 1e-6, "hạ về chỗ cũ")
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

print("\n── C. KIỂM TRA CUỐI ─────────────────────────────────────────")

test("C1 · không có lỗi runtime nào trong event / render step", function()
    Mock.advance(0.5)
    eq(#Mock.errors, 0, table.concat(Mock.errors, " | "))
end)

_G.__TESTRESULT = { pass = R.pass, fail = R.fail, failed = R.failed }
print(string.format("\n  (tổng %d test: %d pass · %d fail)", R.pass + R.fail, R.pass, R.fail))
return R
