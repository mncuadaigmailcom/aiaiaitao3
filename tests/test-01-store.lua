-- test-01-store.lua — LỚP LƯU TRỮ: ghi/đọc xuống đĩa, và QUAN TRỌNG NHẤT:
-- hub có nói THẬT về việc dữ liệu có nằm trên đĩa hay không.
local T = _G.__T
local Store, S = T.Store, T.S
local R = {}
local function chk(name, fn)
    local ok, err = pcall(fn)
    R[#R+1] = {name = name, ok = ok, err = ok and "" or tostring(err)}
end

-- ---------- 1) serialize: hình dạng dữ liệu ----------
chk("Store.serialize() tra du 5 khoa va dung kieu", function()
    local d = Store.serialize()
    assert(type(d) == "table", "serialize khong tra ve bang")
    for _, k in ipairs({"version", "scripts", "waypoints", "features", "settings"}) do
        assert(d[k] ~= nil, "thieu khoa: " .. k)
    end
    assert(d.version == Store.SAVE_VERSION, "version lech: " .. tostring(d.version))
    assert(type(d.settings) == "table", "settings khong phai bang")
    assert(d.settings.embedEnabled ~= nil, "thieu settings.embedEnabled")
    assert(d.settings.parkCodeGuis ~= nil, "thieu settings.parkCodeGuis")
end)

chk("Store.isFinite() loai dung NaN/inf", function()
    assert(Store.isFinite(1.5) == true, "1.5 phai finite")
    assert(Store.isFinite(0/0) == false, "NaN phai bi loai")
    assert(Store.isFinite(1/0) == false, "inf phai bi loai")
    assert(Store.isFinite("abc") == false, "chuoi phai bi loai")
end)

-- ---------- 2) ghi/that su khi executor CO writefile ----------
chk("CO writefile: save() ghi that xuong dia va doc lai duoc", function()
    MOCK_DISK = true
    MOCK_FILES = {}
    local ok = Store.save()
    assert(ok == true, "save() tra ve false du disk san sang")
    assert(Store.mode == "file", "mode phai = 'file', dang la '" .. tostring(Store.mode) .. "'")
    assert(MOCK_FILES[Store.SAVE_FILE] ~= nil, "file " .. Store.SAVE_FILE .. " khong duoc ghi")
    -- doc lai
    Store.scripts = {}
    local back = Store.read()
    assert(type(back) == "table", "read() khong tra ve bang")
    assert(back.scripts ~= nil, "doc lai thieu khoa scripts")
end)

-- ---------- 3) THE P1 BUG: executor KHONG co writefile ----------
-- Tinh huong that: nhieu executor khong co writefile. Hub bu ham writefile/readfile
-- ghi vao o dia AO trong RAM (S.vfs). Khi do Store.canWrite() van tra ve true
-- (vi type(writefile)=="function") -> Store.mode = "file" -> nhan UI bao XANH
-- "da ghi xuong dia" trong khi khong co gi nam tren dia ca.
chk("KHONG co writefile: hub KHONG duoc bao la da ghi xuong dia", function()
    -- dung lai dung tinh huong executor thieu writefile
    local savedW, savedR, savedI = writefile, readfile, isfile
    _G.writefile, _G.readfile, _G.isfile = nil, nil, nil
    S.compatTried = nil          -- cho phep EnsureCompat chay lai
    S.compatAdded = {}
    S.EnsureCompat()

    local ok = Store.save()
    local mode = Store.mode

    -- khoi phuc
    _G.writefile, _G.readfile, _G.isfile = savedW, savedR, savedI
    S.compatTried = nil

    assert(mode ~= "file",
        "LOI THAT: Store.mode = 'file' nhung khong co writefile that. " ..
        "Dữ liệu chỉ nằm trong S.vfs (RAM) mà UI báo đã ghi xuống đĩa. " ..
        "(save tra ve " .. tostring(ok) .. ")")
end)

chk("KHONG co writefile: nhan trang thai phai canh bao, khong mau xanh", function()
    local savedW, savedR, savedI = writefile, readfile, isfile
    _G.writefile, _G.readfile, _G.isfile = nil, nil, nil
    S.compatTried = nil; S.compatAdded = {}
    S.EnsureCompat()
    Store.save()
    local mode, err = Store.mode, Store.lastError
    _G.writefile, _G.readfile, _G.isfile = savedW, savedR, savedI
    S.compatTried = nil

    assert(mode == "memory",
        "mode phai = 'memory' de nhan hien canh bao vang; dang la '" .. tostring(mode) ..
        "' (lastError=" .. tostring(err) .. ")")
end)

-- ---------- 4) saveSoon debounce khong ghi de lien tuc ----------
chk("saveSoon() goi nhieu lan chi ghi 1 lan (debounce)", function()
    MOCK_DISK = true
    MOCK_FILES = {}
    Store.saveCount = 0
    Store._scheduled = false
    Store.saveSoon()
    Store.saveSoon()
    Store.saveSoon()
    -- task.delay trong mock chi yield; phai drain de no chay
    MOCK_DRAIN(50)
    assert(Store.saveCount <= 1,
        "3 lan saveSoon ma ghi " .. tostring(Store.saveCount) .. " lan (mong <= 1)")
end)

-- ---------- 5) du lieu doc ve phai dung ----------
chk("save roi load: scripts/waypoints/features song sot vong ghi-doc", function()
    MOCK_DISK = true
    MOCK_FILES = {}
    local n0 = #T.scripts
    table.insert(T.scripts, {name = "__test_roundtrip", code = "print(1)", expanded = false})
    Store._scheduled = false
    Store.save()
    local raw = MOCK_FILES[Store.SAVE_FILE]
    assert(raw and raw:find("__test_roundtrip", 1, true), "ten script khong nam trong file JSON")
    -- don dep
    for i = #T.scripts, 1, -1 do
        if T.scripts[i].name == "__test_roundtrip" then table.remove(T.scripts, i) end
    end
    assert(#T.scripts == n0, "don dep that bai")
end)

return R
