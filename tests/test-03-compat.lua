-- test-03-compat.lua — lớp tương thích executor: bù hàm thiếu nhưng KHÔNG BAO GIỜ đè hàm thật
local T = _G.__T
local S = T.S
local R = {}
local function chk(name, fn)
    local ok, err = pcall(fn)
    R[#R+1] = {name = name, ok = ok, err = ok and "" or tostring(err)}
end

chk("EnsureCompat KHONG de ham that cua executor", function()
    local canary = function() return "HAM_THAT" end
    _G.getgenv = canary
    S.compatTried = nil; S.compatAdded = {}
    S.EnsureCompat()
    local after = _G.getgenv
    S.compatTried = nil
    assert(after == canary,
        "EnsureCompat da DE len getgenv that — vi pham 'nguyen tac vang: chi bu khi chua ton tai'")
end)

chk("EnsureCompat chi bu nhung gi con thieu", function()
    _G.getgenv = nil
    S.compatTried = nil; S.compatAdded = {}
    S.EnsureCompat()
    local added = {}
    for _, n in ipairs(S.compatAdded or {}) do added[n] = true end
    S.compatTried = nil
    assert(added["getgenv"] == true, "getgenv thieu ma khong duoc bu")
end)

chk("EnsureCompat chay lan 2 khong bu trung", function()
    S.compatTried = nil; S.compatAdded = {}
    S.EnsureCompat()
    local n1 = #(S.compatAdded or {})
    S.EnsureCompat()          -- lan 2: phai return som
    local n2 = #(S.compatAdded or {})
    S.compatTried = nil
    assert(n2 == n1, "chay lan 2 lam thay doi so ham bu: " .. n1 .. " -> " .. n2)
end)

chk("o dia ao VFS: ghi/doc/kiem tra/xoa hoat dong", function()
    S.VWrite("__t.txt", "noi dung")
    assert(S.VExists("__t.txt") == true, "VExists sai sau khi ghi")
    assert(S.VRead("__t.txt") == "noi dung", "VRead tra ve sai")
    S.VAppend("__t.txt", " them")
    assert(S.VRead("__t.txt") == "noi dung them", "VAppend sai")
    S.VDel("__t.txt")
    assert(S.VExists("__t.txt") == false, "VDel khong co tac dung")
end)

chk("VRead file khong ton tai phai bao loi (khong tra nil am tham)", function()
    local ok = pcall(S.VRead, "__khong_ton_tai_xyz")
    assert(ok == false, "VRead khong bao loi voi file khong ton tai")
end)

chk("CompatRequest tra dung hinh dang bang ma script doi", function()
    local r = S.CompatRequest({Url = "https://example.com/x"})
    assert(type(r) == "table", "khong tra ve bang")
    assert(r.StatusCode ~= nil, "thieu StatusCode")
    assert(r.Body ~= nil, "thieu Body")
    assert(r.Success ~= nil, "thieu Success")
    assert(type(r.Headers) == "table", "thieu Headers")
end)

chk("CompatRequest voi dau vao la chuoi tran khong crash", function()
    local ok, r = pcall(S.CompatRequest, "https://example.com/y")
    assert(ok, "crash: " .. tostring(r))
    assert(type(r) == "table")
end)

chk("CompatDrawing.new tra doi tuong co Remove/Destroy khong crash", function()
    local D2 = S.CompatDrawing()
    local o = D2.new("Line")
    assert(o ~= nil, "Drawing.new tra ve nil")
    assert(pcall(function() o:Remove() end), "o:Remove() crash")
    assert(pcall(function() o.Visible = true end), "gan Visible crash")
end)

chk("CompatNote ke ten ham da bu, khong crash khi rong", function()
    local save = S.compatAdded
    S.compatAdded = {}
    assert(S.CompatNote() == "", "compatAdded rong ma van co chu")
    S.compatAdded = {"a", "b", "c", "d", "e", "f"}
    local s = S.CompatNote()
    assert(type(s) == "string" and #s > 0, "co ham bu ma note rong")
    S.compatAdded = save
end)

chk("queue_on_teleport luu code vao hang doi", function()
    local before = #(S.queued or {})
    S.queued = S.queued or {}
    local ok = pcall(function() return _G.queue_on_teleport and _G.queue_on_teleport("x", "print(1)") end)
    assert(ok, "queue_on_teleport crash")
end)

return R
