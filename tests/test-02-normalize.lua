-- test-02-normalize.lua — S.NormalizeRunnable: "dan link kieu gi cung chay duoc"
local T = _G.__T
local S = T.S
local R = {}
local function chk(name, fn)
    local ok, err = pcall(fn)
    R[#R+1] = {name = name, ok = ok, err = ok and "" or tostring(err)}
end

local N = S.NormalizeRunnable

chk("link TRAN duoc boc loadstring(game:HttpGet(...))()", function()
    local out = N('https://raw.githubusercontent.com/a/b/main/x.lua')
    assert(type(out) == "string", "khong tra ve chuoi")
    assert(out:find('loadstring(game:HttpGet("https://raw.githubusercontent.com/a/b/main/x.lua"))()', 1, true),
        "ket qua: " .. tostring(out))
end)

chk("HttpGet tran duoc boc loadstring(...)", function()
    local out = N('game:HttpGet("https://example.com/a.lua")')
    assert(out:find("loadstring(game:HttpGet(", 1, true), "ket qua: " .. tostring(out))
    assert(out:sub(-2) == "()", "thieu () cuoi: " .. tostring(out))
end)

chk("loadstring QUEN dau () duoc tu them ()", function()
    local src = 'loadstring(game:HttpGet("https://example.com/a.lua"))'
    local out = N(src)
    assert(out:sub(-2) == "()", "van thieu (): " .. tostring(out))
end)

chk("loadstring da co () thi giu nguyen (idempotent, khong boc them mot lop)", function()
    local src = 'loadstring(game:HttpGet("https://example.com/a.lua"))()'
    local out = N(src)
    assert(out == src, "bi bien doi: " .. tostring(out))
    assert(N(out) == out, "chay lan 2 cho ket qua khac lan 1")
end)

chk("BOM va khoang trang dau/cuoi bi got", function()
    local out = N("\239\187\191  \n  print(1)  \n  ")
    assert(out:sub(1, 3) ~= "\239\187\191", "BOM van con")
    assert(out:find("print(1)", 1, true), "mat code: " .. tostring(out))
end)

chk("code dai KHONG bi cat xen", function()
    local big = "local s = '" .. string.rep("abcdefghij", 5000) .. "'"
    local out = N(big)
    assert(#out >= #big, "code bi ngan lai: " .. #out .. " < " .. #big)
    assert(out:find(string.rep("abcdefghij", 5000), 1, true), "noi dung bi bien doi")
end)

chk("code thuong (khong phai link) giu nguyen van", function()
    local src = 'local a = 1\nprint(a)'
    local out = N(src)
    assert(out:find("local a = 1", 1, true) and out:find("print(a)", 1, true),
        "code bi sua: " .. tostring(out))
end)

chk("chuoi rong / nil khong lam crash", function()
    local ok1 = pcall(N, "")
    local ok2 = pcall(N, nil)
    assert(ok1 and ok2, "crash voi dau vao rong/nil")
end)

chk("link ngan (bit.ly/rblxhub...) van duoc boc", function()
    local out = N("https://bit.ly/abc123")
    assert(out:find("loadstring", 1, true), "link ngan khong duoc boc: " .. tostring(out))
end)

-- ---------- S.SanitizeCode: cat wrapper doc hai cua ban cu ----------
chk("SanitizeCode cat loi goi _ForceStretch khi code co MARKER doi cu", function()
    -- SanitizeCode co chu dinh chi xu ly wrapper "AUTO-GENERATED SIZE WRAPPER" cua ban
    -- v4.4a da bi LUU trong file JSON. No canh bang marker de khong dong vao code nguoi
    -- dung tu viet ham _ForceStretch cua rieng ho.
    local bad = S.WRAP_MARK_OLD .. " v4.4a =====\nlocal g = game\n" ..
        "pcall(function() _ForceStretch(g) end)\nprint(\"ok\")"
    local out = S.SanitizeCode(bad)
    assert(not out:find("_ForceStretch", 1, true), "van con _ForceStretch: " .. tostring(out))
    assert(out:find('print("ok")', 1, true), "cat mat ca code that cua nguoi dung")
end)

chk("SanitizeCode KHONG dong code khong co marker (bao ve code cua nguoi dung)", function()
    local mine = 'local function _ForceStretch(g) return g end\nprint(_ForceStretch(game))'
    assert(S.SanitizeCode(mine) == mine,
        "da cat oan _ForceStretch do nguoi dung tu viet")
end)

chk("SanitizeCode khong dong vao code khong co wrapper", function()
    local src = 'local a = 1 print(a)'
    assert(S.SanitizeCode(src) == src, "code bi sua oan")
end)

chk("SanitizeCode khong crash voi kieu du lieu la", function()
    assert(pcall(S.SanitizeCode, nil))
    assert(pcall(S.SanitizeCode, 123))
    assert(pcall(S.SanitizeCode, {}))
end)

return R
