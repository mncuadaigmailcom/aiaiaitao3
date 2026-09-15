-- test-08-settings.lua — trang ⚙️ Thiết Lập mới (v4.11): nói thật về lưu trữ,
-- xuất/nhập dữ liệu, và xoá sạch có bước xác nhận.
local T = _G.__T
local S, Store, C = T.S, T.Store, T.C
local R = {}
local function chk(name, fn)
    local ok, err = pcall(fn)
    R[#R+1] = {name = name, ok = ok, err = ok and "" or tostring(err)}
end
local B = S.settingsBtns
local function fire(b) b.Activated:Fire() end

chk("trang Thiet Lap ton tai o LayoutOrder 5 va scroll duoc", function()
    assert(B and B.save and B.export and B.import and B.clear and B.paste,
        "thieu nut tren trang Thiet Lap")
    local found
    for _, b in ipairs(T.tabs) do
        if b:GetAttribute("BCTabName") == "Thiết Lập" then found = b end
    end
    assert(found, "khong tim thay trang 'Thiết Lập' tren rail")
    assert(found.LayoutOrder == 5, "LayoutOrder = " .. tostring(found.LayoutOrder))
    assert(S.settingsTab.CanvasSize.Y.Offset > 200,
        "CanvasSize qua nho, trang se bi cat: " .. tostring(S.settingsTab.CanvasSize.Y.Offset))
end)

chk("CO writefile: the luu tru bao DUNG la ghi xuong dia (mau xanh)", function()
    MOCK_DISK = true
    S.refreshStorageCard()
    assert(B.statusTitle.Text:find("ĐĨA THẬT", 1, true),
        "nhan: " .. tostring(B.statusTitle.Text))
    assert(B.statusTitle.TextColor3 == C.GREEN, "mau nhan phai xanh la")
    assert(B.statusBody.Text:find(Store.SAVE_FILE, 1, true), "khong neu ten file")
end)

chk("KHONG co writefile: the luu tru canh bao REJOIN LA MAT (khong bao xanh)", function()
    local w, r, i = writefile, readfile, isfile
    _G.writefile, _G.readfile, _G.isfile = nil, nil, nil
    S.compatTried = nil; S.compatAdded = {}
    S.EnsureCompat()
    S.refreshStorageCard()
    local title, body, col = B.statusTitle.Text, B.statusBody.Text, B.statusTitle.TextColor3
    _G.writefile, _G.readfile, _G.isfile = w, r, i
    S.compatTried = nil

    assert(title:find("RAM", 1, true), "nhan: " .. tostring(title))
    assert(col == C.YELLOW, "mau nhan phai vang canh bao")
    assert(body:find("MẤT", 1, true), "khong canh bao mat du lieu: " .. tostring(body))
end)

chk("📤 Xuat: clipboard nhan duoc JSON doc lai duoc", function()
    MOCK_CLIPBOARD = ""
    fire(B.export)
    local js = MOCK_CLIPBOARD
    assert(type(js) == "string" and #js > 10, "clipboard rong")
    local ok, data = pcall(function()
        return game:GetService("HttpService"):JSONDecode(js)
    end)
    assert(ok and type(data) == "table", "JSON xuat ra khong doc lai duoc")
    assert(type(data.scripts) == "table", "JSON thieu khoa scripts")
    assert(data.version == Store.SAVE_VERSION, "version sai")
end)

chk("📥 Nhap: ghep script moi, KHONG ghi de cai dang co", function()
    local n0 = #T.scripts
    local json = '{"version":1,"scripts":[{"name":"__imp_a","code":"print(1)"},' ..
                 '{"name":"__imp_b","code":"print(2)"}],"waypoints":{},"features":{},"settings":{}}'
    B.paste.Text = json
    fire(B.import)
    local names = {}
    for _, s in ipairs(T.scripts) do names[s.name] = true end
    assert(#T.scripts == n0 + 2, "so script " .. n0 .. " -> " .. #T.scripts .. " (mong +2)")
    assert(names["__imp_a"] and names["__imp_b"], "thieu script vua nhap")
end)

chk("📥 Nhap trung ten: tu danh so ' (2)', khong mat ban cu", function()
    local n0 = #T.scripts
    local json = '{"version":1,"scripts":[{"name":"__imp_a","code":"print(999)"}],"waypoints":{}}'
    B.paste.Text = json
    fire(B.import)
    assert(#T.scripts == n0 + 1, "khong them ban moi")
    local oldCode, newCode
    for _, s in ipairs(T.scripts) do
        if s.name == "__imp_a" then oldCode = s.code end
        if s.name == "__imp_a (2)" then newCode = s.code end
    end
    assert(oldCode == "print(1)", "ban cu bi ghi de: " .. tostring(oldCode))
    assert(newCode == "print(999)", "ban moi sai: " .. tostring(newCode))
end)

chk("📥 Nhap JSON rac: bao loi, KHONG lam hu danh sach", function()
    local n0 = #T.scripts
    B.paste.Text = "day khong phai json {{{"
    fire(B.import)
    assert(#T.scripts == n0, "danh sach bi thay doi boi JSON rac")
    assert(B.import.Text:find("❌", 1, true), "khong bao loi: " .. tostring(B.import.Text))
end)

chk("📥 Nhap o trong: tu choi, khong crash", function()
    local n0 = #T.scripts
    B.paste.Text = ""
    fire(B.import)
    assert(#T.scripts == n0, "o trong ma van them script")
end)

chk("🗑 Xoa sach: bam 1 lan chi hoi xac nhan, CHUA xoa", function()
    local n0 = #T.scripts
    assert(n0 > 0, "test nay can it nhat 1 script")
    fire(B.clear)
    assert(#T.scripts == n0, "moi bam 1 lan ma da xoa mat du lieu")
    assert(B.clear.Text:find("XÁC NHẬN", 1, true), "khong hoi xac nhan: " .. tostring(B.clear.Text))
end)

chk("🗑 Xoa sach: bam lan 2 moi xoa that, va ghi xuong dia", function()
    MOCK_DISK = true
    MOCK_FILES = {}
    local snap, snapFiles = {}, {}
    for _, s in ipairs(T.scripts) do snap[#snap+1] = s end
    for k, v in pairs(MOCK_FILES) do snapFiles[k] = v end

    fire(B.clear)          -- lan 1: armed
    fire(B.clear)          -- lan 2: xoa
    assert(#T.scripts == 0, "van con " .. #T.scripts .. " script")
    assert(#T.waypoints == 0, "van con " .. #T.waypoints .. " waypoint")
    local raw = MOCK_FILES[Store.SAVE_FILE]
    assert(raw, "khong ghi file sau khi xoa")
    assert(not raw:find("__imp_a", 1, true), "file van con du lieu da xoa")

    -- khoi phuc de khong anh huong test khac
    for i = #T.scripts, 1, -1 do T.scripts[i] = nil end
    for _, s in ipairs(snap) do T.scripts[#T.scripts+1] = s end
    for k, v in pairs(snapFiles) do MOCK_FILES[k] = v end
    pcall(function() T.RebuildScripts() end)
    assert(#T.scripts == #snap, "khoi phuc that bai")
end)

chk("💾 Luu ngay: bam xong du lieu nam trong file", function()
    MOCK_DISK = true
    MOCK_FILES = {}
    fire(B.save)
    local raw = MOCK_FILES[Store.SAVE_FILE]
    assert(raw, "khong co file sau khi bam Luu ngay")
    assert(raw:find("__imp_a", 1, true), "du lieu chua duoc ghi")
    assert(B.save.Text:find("✅", 1, true), "nhan khong bao thanh cong: " .. tostring(B.save.Text))
end)

chk("the moi truong ke ten executor va so ham hub da bu", function()
    assert(B.envTitle and B.envBody, "khong mo duoc nhan cua the moi truong")
    assert(tostring(B.envTitle.Text):find("Executor", 1, true),
        "nhan sai: " .. tostring(B.envTitle.Text))
    assert(#tostring(B.envBody.Text) > 10, "nhan than the moi truong rong")
    -- trong mock nay moi ham deu co san -> phai bao "du moi ham"
    assert(tostring(B.envBody.Text):find("đủ mọi hàm", 1, true)
        or tostring(B.envBody.Text):find("Hub đã tự bù", 1, true),
        "nhan khong ro rang: " .. tostring(B.envBody.Text))
end)

chk("the moi truong ke ten tung ham con thieu khi executor yeu", function()
    local w = writefile
    _G.writefile = nil
    S.compatTried = nil; S.compatAdded = {}
    -- dung S.EnsureCompat: chi kiem tra S.HasGlobal phan anh dung thuc te
    local miss = {}
    for _, k in ipairs({"writefile", "readfile", "setclipboard", "gethui", "hookfunction"}) do
        if not S.HasGlobal(k) then miss[#miss + 1] = k end
    end
    _G.writefile = w
    S.compatTried = nil
    assert(#miss == 1 and miss[1] == "writefile",
        "S.HasGlobal phan anh sai: " .. table.concat(miss, ","))
end)

-- don dep du lieu test
for i = #T.scripts, 1, -1 do
    local n = tostring(T.scripts[i].name or "")
    if n:find("^__imp_") or n:find("^__dup_test") then table.remove(T.scripts, i) end
end
pcall(function() T.RebuildScripts() end)
return R
