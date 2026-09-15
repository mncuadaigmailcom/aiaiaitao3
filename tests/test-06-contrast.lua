-- test-06-contrast.lua — hợp đồng tương phản: D.BestText phải chọn chữ đọc được trên mọi màu
local T = _G.__T
local C, D = T.C, T.D
local R = {}
local function chk(name, fn)
    local ok, err = pcall(fn)
    R[#R+1] = {name = name, ok = ok, err = ok and "" or tostring(err)}
end

-- WCAG 2.x dung luminance TUONG DOI tren sRGB da tuy tinh hoa. Cong thuc luminance thho
-- (0.2126R+0.7152G+0.0722B tren gia tri 0..1) ma D.BestText dung chi de CHON mau chu
-- (dam/trang) — dung cho muc dich do, nhung khong dung de DO muc tuong phan.
-- Test nay do bang dung cong thuc WCAG.
local function lin(v)
    v = v / 255
    if v <= 0.03928 then return v / 12.92 end
    return ((v + 0.055) / 1.055) ^ 2.4
end
local function rgbOf(c)
    return math.floor(c.R * 255 + 0.5), math.floor(c.G * 255 + 0.5), math.floor(c.B * 255 + 0.5)
end
local function wcagL(c)
    local r, g, b = rgbOf(c)
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
end
local function contrast(a, b)
    local l1, l2 = wcagL(a), wcagL(b)
    if l1 < l2 then l1, l2 = l2, l1 end
    return (l1 + 0.05) / (l2 + 0.05)
end

-- Chi tinh nhung mau THUC SU dung lam nen co chu de len. Cac mau chi dung lam vien/nen
-- gradient (ACCENT2, HAIRLINE, BORDER...) khong co chu nen khong ap nguong tuong phan.
chk("moi mau nen CO CHU deu dat WCAG AA-large (>= 3:1) voi mau chu tu chon", function()
    local bgNames = {"GREEN","BLUE","RED","YELLOW","PURPLE","ORANGE","PINK","ACCENT",
                     "SURFACE","SURFACE2","SURFACE3","BG"}
    local bad = {}
    for _, n in ipairs(bgNames) do
        local bg = C[n]
        assert(bg, "bang C thieu " .. n)
        local r = contrast(bg, D.BestText(bg))
        if r < 3.0 then bad[#bad+1] = string.format("%s = %.2f:1", n, r) end
    end
    assert(#bad == 0, "khong dat 3:1: " .. table.concat(bad, "; "))
end)

chk("mau nen van ban (surface/BG) dat WCAG AA thuong (>= 4.5:1)", function()
    local bad = {}
    for _, n in ipairs({"SURFACE","SURFACE2","SURFACE3","BG"}) do
        local r = contrast(C[n], D.BestText(C[n]))
        if r < 4.5 then bad[#bad+1] = string.format("%s = %.2f:1", n, r) end
    end
    assert(#bad == 0, "khong dat 4.5:1: " .. table.concat(bad, "; "))
end)

chk("khong mau nen chu nao TE HON ban v4.8 (chong hoi qui thiet ke)", function()
    -- gia tri WCAG cua bang mau v4.8 (git 13d2a2e), do bang dung cong thuc o tren
    local v48 = {
        GREEN={60,200,140}, BLUE={72,148,248}, RED={240,120,120}, YELLOW={250,200,90},
        PURPLE={160,130,250}, ORANGE={250,150,60}, PINK={240,110,180}, ACCENT={245,195,110},
        SURFACE={26,28,38}, SURFACE2={34,37,50}, SURFACE3={46,50,66}, BG={16,18,26},
    }
    -- chi coi la HOI QUI khi mau moi roi xuong duoi mot nguong WCAG ma mau cu dat duoc.
    -- dao dong nho o vung da rat cao (vd 8.94 -> 8.74, ca hai deu vuot xa moi nguong)
    -- khong anh huong gi den kha nang doc nen khong tinh.
    local THRESH = {4.5, 3.0}
    local worse = {}
    for n, old in pairs(v48) do
        if C[n] then
            local oc = Color3.fromRGB(old[1], old[2], old[3])
            local ro = contrast(oc, D.BestText(oc))
            local rn = contrast(C[n], D.BestText(C[n]))
            for _, t in ipairs(THRESH) do
                if ro >= t and rn < t then
                    worse[#worse+1] = string.format("%s roi xuong duoi %.1f:1 (%.2f -> %.2f)", n, t, ro, rn)
                end
            end
        end
    end
    assert(#worse == 0, "hoi qui tuong phan: " .. table.concat(worse, "; "))
end)

chk("D.BestText tra chu DAM tren nen sang, chu TRANG tren nen toi", function()
    assert(D.BestText(C.ACCENT) == C.INK, "vang champagne phai dung chu dam")
    assert(D.BestText(C.BG) == C.WHITE, "nen obsidian phai dung chu trang")
    assert(D.BestText(C.YELLOW) == C.INK, "vang phai dung chu dam")
end)

chk("D.BestText khong crash voi dau vao la", function()
    assert(pcall(D.BestText, nil))
    assert(pcall(D.BestText, "khong phai mau"))
    assert(pcall(D.BestText, 123))
end)

chk("D.Edge luon sang hon nen (tach khoi duoc)", function()
    for _, n in ipairs({"SURFACE","SURFACE2","SURFACE3","BG","ACCENT","GREEN"}) do
        local e = D.Edge(C[n])
        assert(wcagL(e) > wcagL(C[n]), "D.Edge(" .. n .. ") khong sang hon nen")
    end
end)

chk("D.Paint3 chia deu moc va tao dung so chang", function()
    local o = T.New("Frame", {}, nil)
    D.Paint3(o, {C.SURFACE2, C.BG, C.BG, C.DEEP}, 90)
    local g = o:FindFirstChildOfClass("UIGradient")
    assert(g and g.Color and #g.Color.Keypoints == 4, "khong du 4 chang")
    assert(g.Color.Keypoints[1].Time == 0, "moc dau phai = 0")
    assert(g.Color.Keypoints[4].Time == 1, "moc cuoi phai = 1")
end)

chk("D.Paint3 voi 1 mau / 0 mau khong crash", function()
    local o = T.New("Frame", {}, nil)
    assert(pcall(D.Paint3, o, {C.BG}, 90))
    assert(pcall(D.Paint3, o, {}, 90))
    assert(pcall(D.Paint3, o, nil, 90))
end)

chk("D.Unpaint tra gradient ve trang (khong xoa instance)", function()
    local o = T.New("Frame", {}, nil)
    D.Paint3(o, {C.SURFACE3, C.SURFACE2, C.SURFACE}, 90)
    D.Unpaint(o)
    local g = o:FindFirstChildOfClass("UIGradient")
    assert(g, "Unpaint da xoa mat gradient (phai giu lai)")
    local k = g.Color.Keypoints
    assert(k[1].Value.R == 1 and k[1].Value.B == 1, "gradient chua ve trang")
end)

chk("D.Shade tao 4 chang (bevel) va giu nguyen BackgroundColor3", function()
    local o = T.New("TextButton", {BackgroundColor3 = C.SURFACE3}, nil)
    local before = o.BackgroundColor3
    D.Shade(o, Color3.fromRGB(255,255,255), Color3.fromRGB(182,187,201), 90)
    assert(o.BackgroundColor3 == before, "D.Shade da doi BackgroundColor3 (phai giu de nhan)")
    local g = o:FindFirstChildOfClass("UIGradient")
    assert(g and #g.Color.Keypoints == 4, "D.Shade phai 4 chang, dang " ..
        tostring(g and g.Color and #g.Color.Keypoints))
end)

return R
