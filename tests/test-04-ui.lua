-- test-04-ui.lua — bất biến giao diện: số trang, thứ tự rail, tab tạo trễ, công tắc
local T = _G.__T
local C, D, S = T.C, T.D, T.S
local R = {}
local function chk(name, fn)
    local ok, err = pcall(fn)
    R[#R+1] = {name = name, ok = ok, err = ok and "" or tostring(err)}
end

local function orderOf(b) return b and b.LayoutOrder end

chk("luc khoi dong co 6 trang (trang GUI Ngoai tao tre)", function()
    assert(#T.tabs == 6, "so tab = " .. #T.tabs .. " (mong 6)")
    assert(S.parkTab == nil, "parkTab phai chua ton tai luc khoi dong")
end)

chk("LayoutOrder cac trang: 1/2/3/4/5/6 — o so 5 da duoc trang Thiet Lap chiem", function()
    local seen = {}
    for _, b in ipairs(T.tabs) do seen[orderOf(b)] = b:GetAttribute("BCTabName") end
    local expect = {[1]="Code Đã Lưu",[2]="Code",[3]="Script Hub",[4]="Hỗ Trợ",
                    [5]="Thiết Lập",[6]="Tạo Tính Năng"}
    for ord, nm in pairs(expect) do
        assert(seen[ord] == nm, "LayoutOrder " .. ord .. " = " .. tostring(seen[ord]) .. ", mong '" .. nm .. "'")
    end
    assert(seen[99] == nil, "trang GUI Ngoai khong duoc ton tai luc khoi dong")
end)

chk("OpenFirstPage() mo dung trang co LayoutOrder nho nhat (Code Da Luu)", function()
    T.OpenFirstPage()
    local act = T.activeTabGetter()
    assert(act ~= nil, "khong mo trang nao")
    assert(act == T.tabContent[2], "trang mo khong phai Code Da Luu (tabs[2])")
    assert(D.pageTitle.Text:find("Code Đã Lưu", 1, true),
        "header hien sai: " .. tostring(D.pageTitle.Text))
end)

chk("khong co 2 tab trung LayoutOrder (neu co thi rail xao thu tu)", function()
    local seen, dup = {}, {}
    for _, b in ipairs(T.tabs) do
        local o = orderOf(b)
        if seen[o] then dup[#dup+1] = tostring(o) end
        seen[o] = true
    end
    assert(#dup == 0, "LayoutOrder trung: " .. table.concat(dup, ", "))
end)

chk("S.ParkHost() tao tab GUI Ngoai tre va chi tao 1 lan", function()
    local before = #T.tabs
    S.ParkHost("test")
    assert(#T.tabs == before + 1, "khong tao tab: " .. before .. " -> " .. #T.tabs)
    assert(S.parkTab ~= nil, "parkTab van nil")
    local again = #T.tabs
    S.ParkHost("test2")
    assert(#T.tabs == again, "goi lan 2 tao trung tab: " .. again .. " -> " .. #T.tabs)
    assert(orderOf(S.parkBtn) == 99, "LayoutOrder tab GUI Ngoai phai = 99")
end)

chk("SwitchTab doi trang va cap nhat header", function()
    local idx
    for i, b in ipairs(T.tabs) do
        if b:GetAttribute("BCTabName") == "Code" then idx = i end
    end
    assert(idx, "khong tim thay tab Code")
    T.SwitchTab(idx)
    assert(T.activeTabGetter() == T.tabContent[idx], "activeTab khong doi")
    assert(D.pageTitle.Text:find("Code", 1, true), "header sai: " .. tostring(D.pageTitle.Text))
    -- pill dang mo phai dung C.ACCENT (2 handler MouseLeave so sanh ~= C.ACCENT)
    assert(T.tabs[idx].TextColor3 == C.ACCENT,
        "TextColor3 cua tab dang mo phai dung bang C.ACCENT, khong thi hover se lam no bien mat")
end)

chk("3 cong tac gat tren header gan dung khoa embed/guess/park", function()
    assert(D.hdrSwitches and D.hdrSwitches.embed and D.hdrSwitches.guess and D.hdrSwitches.park,
        "thieu cong tac tren header")
    for _, k in ipairs({"embed", "guess", "park"}) do
        local sw = D.hdrSwitches[k]
        assert(sw.btn and sw.track and sw.knob and sw.icon, "cong tac " .. k .. " thieu thanh phan")
    end
end)

chk("D.SyncPageChips() dong bo trang thai that trong S", function()
    local saveE, saveG, saveP = S.embedEnabled, S.embedGuessNew, S.parkCodeGuis
    S.embedEnabled, S.embedGuessNew, S.parkCodeGuis = true, false, true
    D.SyncPageChips()
    local on = D.hdrSwitches.embed
    assert(on.knob.Position.X.Offset == -10, "embed BẬT mà núm vẫn ở trái")
    S.embedEnabled = false
    D.SyncPageChips()
    assert(on.knob.Position.X.Offset == 2, "embed TẮT mà núm vẫn ở phải")
    S.embedEnabled, S.embedGuessNew, S.parkCodeGuis = saveE, saveG, saveP
    D.SyncPageChips()
end)

chk("cua so main co gradient nhieu chang (v4.9) va goc bo 16px", function()
    local g = T.main:FindFirstChildOfClass("UIGradient")
    assert(g, "main khong co UIGradient")
    assert(g.Color and g.Color.Keypoints and #g.Color.Keypoints >= 3,
        "gradient cua main it hon 3 chang")
    local c = T.main:FindFirstChildOfClass("UICorner")
    assert(c and c.CornerRadius and c.CornerRadius.Offset == 16,
        "goc bo cua main phai 16px, dang la " .. tostring(c and c.CornerRadius and c.CornerRadius.Offset))
end)

chk("khong con dau vet trang AI AI tren rail", function()
    for _, b in ipairs(T.tabs) do
        local nm = tostring(b:GetAttribute("BCTabName") or "")
        assert(not nm:find("AI"), "van con trang AI: " .. nm)
    end
end)

return R
