-- test-09-optimize.lua — kiểm tra các tối ưu v4.12: S.UniqueName (gộp 5 vòng lặp O(n^2)),
-- đổi tên biến che khuất trong S.CompatDrawing, và HopServer không còn chặn UI thread.
local T = _G.__T
local S = T.S
local R = {}
local function chk(name, fn)
    local ok, err = pcall(fn)
    R[#R+1] = {name = name, ok = ok, err = ok and "" or tostring(err)}
end

-- ---------- S.UniqueName ----------
local function mk(names)
    local l = {}
    for _, n in ipairs(names) do l[#l+1] = {name = n, code = "x"} end
    return l
end

chk("UniqueName: ten chua trung -> giu nguyen", function()
    assert(S.UniqueName("abc", mk({"khac", "khac2"})) == "abc")
end)

chk("UniqueName: trung 1 lan -> ' (2)'", function()
    assert(S.UniqueName("abc", mk({"abc"})) == "abc (2)")
end)

chk("UniqueName: trung lien tiep -> nhay len ' (4)'", function()
    local l = mk({"abc", "abc (2)", "abc (3)"})
    assert(S.UniqueName("abc", l) == "abc (4)", S.UniqueName("abc", l))
end)

chk("UniqueName: dien vao CHO TRONG dau tien (khong bo sot so)", function()
    -- co 'abc' va 'abc (3)' nhung KHONG co 'abc (2)' -> phai tra ve 'abc (2)'
    local l = mk({"abc", "abc (3)"})
    local got = S.UniqueName("abc", l)
    assert(got == "abc (2)", "tra ve '" .. tostring(got) .. "' — bo sot cho trong")
end)

chk("UniqueName: dau vao la so/nil/khong phai chuoi -> khong crash", function()
    assert(pcall(S.UniqueName, 123, mk({})))
    assert(pcall(S.UniqueName, nil, mk({})))
    assert(type(S.UniqueName(42, mk({"42"}))) == "string")
end)

chk("UniqueName: mac dinh dung bang `scripts` that cua hub", function()
    local n0 = #T.scripts
    table.insert(T.scripts, {name = "__uniq_probe", code = "x", expanded = false})
    local got = S.UniqueName("__uniq_probe")
    table.remove(T.scripts, #T.scripts)
    assert(got == "__uniq_probe (2)", "khong dung bang scripts that: " .. tostring(got))
    assert(#T.scripts == n0, "khong don dep du lieu probe")
end)

chk("UniqueName: KHONG sua doi danh sach truyen vao", function()
    local l = mk({"abc"})
    S.UniqueName("abc", l)
    assert(#l == 1 and l[1].name == "abc", "da lam hu danh sach")
end)

-- ---------- S.CompatDrawing: doi ten bien che khong duoc lam vo tinh nang ----------
chk("CompatDrawing van tra Drawing day du sau khi doi ten bien", function()
    local D2 = S.CompatDrawing()
    assert(type(D2) == "table", "khong tra ve bang")
    assert(type(D2.new) == "function", "thieu .new")
    assert(type(D2.Fonts) == "table" and D2.Fonts.Plex ~= nil, "thieu .Fonts")
    local line = D2.new("Line")
    line.Visible = true
    assert(line.Visible == true, "gan thuoc tinh khong chay")
    assert(pcall(function() line:Remove() end), "Remove() crash")
end)

chk("bang D thiet ke KHONG biCompatDrawing lam ban", function()
    -- neu bien cuc bo van ten `D` thi day la cai bay; kiem tra D that van day du helper
    for _, k in ipairs({"Shade", "BestText", "Edge", "Paint3", "Unpaint", "TopLight"}) do
        assert(type(T.D[k]) == "function", "D." .. k .. " khong con la ham")
    end
end)

chk("S.WRAP_MARK_NEW (hang so chet) da duoc bo", function()
    assert(S.WRAP_MARK_NEW == nil, "van con S.WRAP_MARK_NEW")
    assert(S.WRAP_MARK_OLD ~= nil, "lam mat WRAP_MARK_OLD (van dang duoc SanitizeCode dung)")
end)

-- ---------- HopServer khong con chan UI thread ----------
chk("RunHubAction('hopserver') TRA VE NGAY, khong doi HTTP xong moi tra", function()
    MOCK_YIELD_HTTP = true                      -- HttpGet se yield nhu that
    MOCK_TELEPORTS = {}
    MOCK_HTTPGET_HANDLER = function()
        return '{"data":[{"id":"sv-khac","playing":1,"maxPlayers":10}],"nextPageCursor":null}'
    end
    local returned, msg = false, nil
    task.spawn(function()
        msg = S.RunHubAction("hopserver")
        returned = true
    end)
    -- Neu van goi DONG BO: luong test se yield ngay trong HttpGet -> returned con false.
    -- Da day sang luong rieng: handler tra ve ngay -> returned = true, chua teleport gi.
    local early = #MOCK_TELEPORTS
    MOCK_YIELD_HTTP = false
    -- GIU NGUYEN MOCK_HTTPGET_HANDLER: luong con chua chay xong, no con phai doc danh sach
    -- server. Xoá handler ở đây (lỗi tôi từng mắc) sẽ làm luồng con đọc về rỗng.

    assert(returned == true,
        "handler nut van CHAN doi HTTP (luong goi bi yield truoc khi tra ve)")
    assert(type(msg) == "string" and msg:find("đang tìm", 1, true),
        "khong bao 'dang tim': " .. tostring(msg))
    assert(early == 0, "da teleport truoc khi tra ve — van la dong bo")

    MOCK_DRAIN(200)                             -- cho luong con chay het
    MOCK_HTTPGET_HANDLER = nil
    assert(#MOCK_TELEPORTS == 1, "luong con khong teleport duoc")
    assert(MOCK_TELEPORTS[1].jobId == "sv-khac", "nham server: " .. tostring(MOCK_TELEPORTS[1].jobId))
end)

chk("S.HopServer van DONG BO + tra chuoi khi goi truc tiep (API khong doi)", function()
    MOCK_YIELD_HTTP = false
    MOCK_HTTPGET_HANDLER = function()
        return '{"data":[{"id":"sv-thang","playing":2,"maxPlayers":10}],"nextPageCursor":null}'
    end
    MOCK_TELEPORTS = {}
    local msg = S.HopServer()
    MOCK_HTTPGET_HANDLER = nil
    assert(type(msg) == "string" and #msg > 0, "khong tra ve chuoi")
    assert(#MOCK_TELEPORTS == 1, "khong teleport")
end)

return R
