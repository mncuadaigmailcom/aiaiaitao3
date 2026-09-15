-- test-00-probe.lua — xac nhan test cham duoc vao noi that cua script (khong phai ban copy)
local T = _G.__T
local R = {}
local function chk(name, fn)
    local ok, err = pcall(fn)
    R[#R+1] = {name = name, ok = ok, err = ok and "" or tostring(err)}
end
chk("noi duoc bang mau C", function() assert(type(T.C)=="table" and T.C.ACCENT, "C khong truy cap duoc") end)
chk("noi duoc S / D / Store", function()
    assert(type(T.S)=="table" and type(T.D)=="table" and type(T.Store)=="table")
end)
chk("noi duoc danh sach scripts/waypoints/featureTabs", function()
    assert(type(T.scripts)=="table" and type(T.waypoints)=="table" and type(T.featureTabs)=="table")
end)
chk("noi duoc 6 tab luc khoi dong + ham AddTab/SwitchTab", function()
    assert(#T.tabs==6, "so tab = "..tostring(#T.tabs).." (mong 6 — trang 🧩 van tao tre)")
    assert(type(T.AddTab)=="function" and type(T.SwitchTab)=="function")
end)
chk("noi duoc cua so main + nut chuoi", function()
    assert(T.main and T.togBtn, "main/togBtn nil")
end)
return R
