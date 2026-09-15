-- test-07-savenames.lua — nút 💾 Lưu: tên trùng phải tự đánh số, và phải ghi xuống đĩa
local T = _G.__T
local S, Store = T.S, T.Store
local R = {}
local function chk(name, fn)
    local ok, err = pcall(fn)
    R[#R+1] = {name = name, ok = ok, err = ok and "" or tostring(err)}
end

local function fire(btn)
    local sig = btn.Activated
    assert(sig and sig.Fire, "nut khong co signal Activated")
    return sig:Fire()
end
local function clearTest()
    for i = #T.scripts, 1, -1 do
        local n = tostring(T.scripts[i].name or "")
        if n:find("^__dup_test") then table.remove(T.scripts, i) end
    end
end

chk("bam Luu 1 lan -> them dung 1 script", function()
    clearTest()
    local n0 = #T.scripts
    T.nameIn.Text = "__dup_test"
    T.codeIn.Text = "print('a')"
    fire(T.saveBtn)
    assert(#T.scripts == n0 + 1, "so script " .. n0 .. " -> " .. #T.scripts)
    assert(T.scripts[#T.scripts].name == "__dup_test", "ten sai: " .. tostring(T.scripts[#T.scripts].name))
end)

chk("luu trung ten -> tu danh so ' (2)', khong ghi de", function()
    clearTest()
    T.nameIn.Text = "__dup_test"
    T.codeIn.Text = "print('a')"
    fire(T.saveBtn)
    T.codeIn.Text = "print('b')"
    fire(T.saveBtn)
    local names = {}
    for _, s in ipairs(T.scripts) do
        if tostring(s.name):find("^__dup_test") then names[#names+1] = s.name end
    end
    assert(#names == 2, "mong 2 ban, thay " .. #names)
    assert(names[1] == "__dup_test" and names[2] == "__dup_test (2)",
        "danh so sai: [" .. table.concat(names, "] [") .. "]")
end)

chk("luu trung ten 3 lan -> ' (3)', khong lap vo han", function()
    clearTest()
    T.nameIn.Text = "__dup_test"
    for i = 1, 3 do T.codeIn.Text = "print(" .. i .. ")" fire(T.saveBtn) end
    local cnt = 0
    for _, s in ipairs(T.scripts) do
        if tostring(s.name):find("^__dup_test") then cnt = cnt + 1 end
    end
    assert(cnt == 3, "mong 3 ban, thay " .. cnt)
end)

chk("khong co code -> tu choi luu, khong them script rong", function()
    clearTest()
    local n0 = #T.scripts
    T.nameIn.Text = "__dup_test_rong"
    T.codeIn.Text = ""
    fire(T.saveBtn)
    assert(#T.scripts == n0, "van them script du code rong")
end)

chk("khong nhap ten -> tu dat ten 'Script N'", function()
    clearTest()
    T.nameIn.Text = ""
    T.codeIn.Text = "print('no-name')"
    fire(T.saveBtn)
    local last = T.scripts[#T.scripts]
    assert(tostring(last.name):find("^Script "), "ten tu dat sai: " .. tostring(last.name))
    -- don
    table.remove(T.scripts, #T.scripts)
end)

chk("luu xong ghi xuong dia (khi executor co writefile)", function()
    MOCK_DISK = true
    MOCK_FILES = {}
    clearTest()
    T.nameIn.Text = "__dup_test_disk"
    T.codeIn.Text = "print('disk')"
    Store._scheduled = false
    fire(T.saveBtn)
    MOCK_DRAIN(100)
    local raw = MOCK_FILES[Store.SAVE_FILE]
    assert(raw, "khong co file " .. tostring(Store.SAVE_FILE))
    assert(raw:find("__dup_test_disk", 1, true), "ten script khong nam trong file")
end)

chk("nhan trang thai hien dung so script sau khi luu", function()
    if not Store.statusLbl then error("khong tim thay nhan trang thai") end
    Store.refreshStatus()
    local txt = Store.statusLbl.Text
    assert(txt:find(tostring(#T.scripts), 1, true),
        "nhan ghi '" .. tostring(txt) .. "' khong chua so script " .. #T.scripts)
end)

clearTest()
return R
