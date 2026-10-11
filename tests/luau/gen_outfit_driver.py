# -*- coding: utf-8 -*-
"""Sinh file .luau để CHẠY THỬ khối "👕 TRANG PHỤC NGƯỜI CHƠI" trong script.js bằng mock Roblox.

    python3 gen_outfit_driver.py                     # script.js      -> _driver_generated.luau
    python3 gen_outfit_driver.py script.js1.js out.luau   # khối gốc (đối chứng A/B)
"""
import io, re, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
exec(open(os.path.join(HERE, 'luau_strip.py')).read())

SRC = sys.argv[1] if len(sys.argv) > 1 else 'script.js'
OUT = sys.argv[2] if len(sys.argv) > 2 else '_driver_generated.luau'
lines = io.open(os.path.join(ROOT, SRC), encoding='utf-8').read().split('\n')
KEY = re.compile(r"\b(function|if|do|repeat|end|until)\b")

def balance(lines, s):
    """Cân bằng function/if/do/repeat ↔ end/until từ dòng s, trả về dòng kết thúc."""
    d = 0
    for j in range(s, len(lines)):
        for t in KEY.findall(strip(lines[j])):
            d += 1 if t in ('function', 'if', 'do', 'repeat') else -1
            if d == 0:
                return j
    raise SystemExit('❌ Không tìm thấy điểm kết thúc khối (mất cân bằng) từ dòng %d' % (s + 1))

OPENERS = (';(function()', 'do')

def extract(lines):
    """Tìm khối 👕 TRANG PHỤC: bản ghép có chú thích mở đầu + `;(function()`;
    bản gốc script.js1.js là `do ... end` (không có chú thích)."""
    head = [i for i, l in enumerate(lines)
            if l.strip().startswith('--') and 'TRANG PHỤC NGƯỜI CHƠI' in l and 'chọn chế độ' not in l]
    if head:
        s = head[0]
        s = next(k for k in range(s, s + 6) if lines[k].strip() in OPENERS)
    else:
        anchor = [i for i, l in enumerate(lines) if 'Name = "HubOutfit_Panel"' in l]
        if not anchor:
            raise SystemExit('ℹ️  %s không có khối 👕 TRANG PHỤC NGƯỜI CHƠI '
                             '(tính năng đã bị xoá?) — không có gì để chạy thử.' % SRC)
        s = max(k for k in range(anchor[0]) if lines[k].strip() in OPENERS)
    return s, balance(lines, s)

s, e = extract(lines)
block = '\n'.join(l.rstrip('\r') for l in lines[s:e + 1])

TEST = r'''
-- ============================================================================
-- TEST lái thử: 🔍 Tìm → 👕 Mặc LOCAL (hóa thân + mặc đồ) → ↩ Khôi phục → 🌐 SERVER
-- ============================================================================
local function findInstByText(t)
    for _, o in ipairs(_G.__CREATED) do if o._props and o._props.Text == t then return o end end
end
local function findInstByPlaceholder(t)
    for _, o in ipairs(_G.__CREATED) do if o._props and o._props.PlaceholderText == t then return o end end
end
local function click(inst)
    if not inst then return false, "không tìm thấy nút" end
    for _, r in ipairs(_G.__CONNS) do
        if r.obj == inst then local ok, err = pcall(r.f, {}) if not ok then return false, tostring(err) end return true end
    end
    return false, "nút chưa được nối sự kiện"
end
local pass, fail = 0, 0
local function check(name, ok, extra)
    if ok then pass = pass + 1 print("  ✅ " .. name .. (extra and (" — " .. tostring(extra)) or ""))
    else fail = fail + 1 print("  ❌ " .. name .. (extra and (" — " .. tostring(extra)) or "")) end
end

print("[TEST] Khối trang phục đã dựng UI: " .. #_G.__CREATED .. " instance, " .. #_G.__CONNS .. " sự kiện được nối")
check("panel HubOutfit_Panel được tạo", (function()
    for _, o in ipairs(_G.__CREATED) do if o.Name == "HubOutfit_Panel" then return true end end return false end)())
check("panel gắn vào tab Người Chơi", (function()
    for _, o in ipairs(_G.__CREATED) do if o.Name == "HubOutfit_Panel" and o.Parent == D.playerTab then return true end end return false end)())
check("D.playerY được đẩy xuống sau panel (46 + 236 + 8 = 290)", D.playerY == 290, "D.playerY = " .. tostring(D.playerY))

local input  = findInstByPlaceholder("Nhập username Roblox (kể cả người offline)...")
local findB  = findInstByText("🔍 Tìm")
local applyB = findInstByText("👕 Mặc LOCAL")
local srvB   = findInstByText("🌐 Mặc SERVER")
local resB   = findInstByText("↩ Khôi phục LOCAL")
local status = (function()  -- dòng ghi chú của panel (bản gốc & bản ghép đều có "máy bạn")
    for _, o in ipairs(_G.__CREATED) do
        if o.ClassName == "TextLabel" and type(o._props.Text) == "string" and o._props.Text:find("máy bạn", 1, true) then return o end
    end
end)()
check("tìm thấy đủ 5 điều khiển", input and findB and applyB and srvB and resB and status)

local function hasText(...)
    local t = status and status.Text
    if type(t) ~= "string" then return false end
    for _, s in ipairs({...}) do if not t:find(s, 1, true) then return false end end
    return true
end

-- 🔎 LẤY SKIN (v5.7) giả — đếm số lần hai tính năng gọi nhau
local PI = { isApplied = false, applyCalls = 0, resetCalls = 0, lastRec = nil }
function PI.ApplySkin(rec)
    PI.applyCalls = PI.applyCalls + 1 PI.lastRec = rec PI.isApplied = true
    return true, "fake+apply (thấy rõ, theo bạn)"
end
function PI.ResetSkin()
    PI.resetCalls = PI.resetCalls + 1 PI.isApplied = false
    return true
end
_G.BananaCatHub_PlayerInfo = PI

-- 1) 🔍 Tìm
input.Text = "TestUser"
local ok1, err1 = click(findB)
check("bấm 🔍 Tìm chạy không lỗi", ok1, err1)
check("avatar đã tải (portrait.Image)", (function()
    for _, o in ipairs(_G.__CREATED) do if o.ClassName == "ImageLabel" and type(o.Image) == "string" and o.Image:find("rbxthumb", 1, true) then return true end end
    return false end)())
check("báo đã tải avatar", hasText("Đã tải avatar"), status.Text)

-- 2) 👕 Mặc LOCAL phải = HÓA THÂN (Lấy Skin v5.7) + mặc đồ LOCAL
local ok2, err2 = click(applyB)
check("bấm 👕 Mặc LOCAL chạy không lỗi", ok2, err2)
check("KẾT HỢP: đã gọi PI.ApplySkin (hóa thân theo skin người đó)", PI.applyCalls == 1, "applyCalls = " .. PI.applyCalls)
check("ApplySkin nhận đúng người cần hóa thân", PI.lastRec ~= nil and PI.lastRec.id == 12345 and PI.lastRec.name == "TestUser",
    PI.lastRec and (tostring(PI.lastRec.id) .. " / " .. tostring(PI.lastRec.name)))
check("Mặc LOCAL KHÔNG tắt skin giả (resetCalls = 0)", PI.resetCalls == 0, "resetCalls = " .. PI.resetCalls)
check("vẫn mặc đồ LOCAL (ApplyDescription/ApplyDescriptionReset)", (_G.__APPLIED.apply + _G.__APPLIED.reset) > 0,
    "apply=" .. _G.__APPLIED.apply .. " reset=" .. _G.__APPLIED.reset)
check("status báo HÓA THÂN + mặc trang phục", hasText("HÓA THÂN", "trang phục"), status.Text)

-- 3) ↩ Khôi phục LOCAL phải trả lại CẢ skin lẫn đồ
local ok3, err3 = click(resB)
check("bấm ↩ Khôi phục LOCAL chạy không lỗi", ok3, err3)
check("KẾT HỢP: khôi phục có tắt skin đang hóa thân", PI.resetCalls == 1 and PI.isApplied == false,
    "resetCalls = " .. PI.resetCalls .. " | isApplied = " .. tostring(PI.isApplied))
check("status báo khôi phục cả skin + quần áo", hasText("skin", "quần áo"), status.Text)

-- 4) 🌐 Mặc SERVER phải tự tắt skin trước (nếu không bạn sẽ không thấy đồ vừa mặc)
click(applyB)
check("mặc LOCAL lần 2 vẫn hóa thân được", PI.applyCalls == 2, "applyCalls = " .. PI.applyCalls)
local ok4, err4 = click(srvB)
check("bấm 🌐 Mặc SERVER chạy không lỗi", ok4, err4)
check("Mặc SERVER tự tắt skin trước (guard)", PI.resetCalls == 2 and PI.isApplied == false,
    "resetCalls = " .. PI.resetCalls .. " | isApplied = " .. tostring(PI.isApplied))
check("báo thiếu OutfitServer.server.lua", hasText("OutfitServer"), status.Text)

-- 5) Game KHÔNG có 🔎 LẤY SKIN (v5.7): vẫn phải mặc đồ bình thường
_G.BananaCatHub_PlayerInfo = nil
local ok5, err5 = click(applyB)
check("thiếu v5.7: Mặc LOCAL vẫn chạy không lỗi", ok5, err5)
check("thiếu v5.7: vẫn báo đã thay đồ LOCAL", hasText("Đã thay đồ LOCAL"), status.Text)

-- 6) Có v5.7 nhưng hóa thân lỗi: vẫn mặc đồ + nói rõ vì sao chưa hóa thân được
local PI2 = { isApplied = false, applyCalls = 0 }
function PI2.ApplySkin() PI2.applyCalls = PI2.applyCalls + 1 return false, "hết hạn mức thử" end
function PI2.ResetSkin() return false, "chưa bật" end
_G.BananaCatHub_PlayerInfo = PI2
local ok6, err6 = click(applyB)
check("ApplySkin lỗi: Mặc LOCAL vẫn chạy không lỗi", ok6, err6)
check("ApplySkin lỗi: vẫn thay đồ + báo lý do", hasText("Đã thay đồ LOCAL", "hết hạn mức thử"), status.Text)

print(string.format("[KẾT QUẢ] %d PASS / %d FAIL", pass, fail))
'''

driver = open(os.path.join(HERE, 'mock_roblox.luau'), encoding='utf-8').read() + \
    "\n\n-- ===== KHỐI LẤY TỪ " + SRC + " =====\n" + block + "\n" + TEST
open(os.path.join(HERE, OUT), 'w', encoding='utf-8').write(driver)
print('driver:', SRC, '->', OUT, len(driver.split(chr(10))), 'dòng')
