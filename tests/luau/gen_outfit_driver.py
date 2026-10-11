import io, re
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
exec(open(os.path.join(HERE,'luau_strip.py')).read())
SRC  = sys.argv[1] if len(sys.argv) > 1 else 'script.js'
OUT  = sys.argv[2] if len(sys.argv) > 2 else '_driver_generated.luau'
lines = io.open(os.path.join(ROOT, SRC),encoding='utf-8').read().split('\n')
KEY=re.compile(r"\b(function|if|do|repeat|end|until)\b")

def balance(lines, s):
    """Cân bằng function/if/do/repeat ↔ end/until từ dòng s, trả về dòng kết thúc."""
    d = 0
    for j in range(s, len(lines)):
        for t in KEY.findall(strip(lines[j])):
            d += 1 if t in ('function','if','do','repeat') else -1
            if d == 0: return j
    raise SystemExit('❌ Không tìm thấy điểm kết thúc khối (mất cân bằng) từ dòng %d' % (s+1))

OPENERS = (';(function()', 'do')

def extract(lines):
    """Tìm khối 👕 TRANG PHỤC: bản ghép có chú thích mở đầu + `;(function()`;
    bản gốc script.js1.js là `do ... end` (không có chú thích)."""
    head = [i for i,l in enumerate(lines)
            if l.strip().startswith('--') and 'TRANG PHỤC NGƯỜI CHƠI' in l and 'chọn chế độ' not in l]
    if head:
        s = head[0]
        s = next(k for k in range(s, s+6) if lines[k].strip() in OPENERS)
    else:
        anchor = next(i for i,l in enumerate(lines) if 'Name = "HubOutfit_Panel"' in l)
        s = max(k for k in range(anchor) if lines[k].strip() in OPENERS)
    return s, balance(lines, s)

s, e = extract(lines)
block = '\n'.join(l.rstrip('\r') for l in lines[s:e+1])

TEST = r'''
-- ============================================================================
-- TEST lái thử: bấm 🔍 Tìm → 👕 Mặc LOCAL → 🌐 Mặc SERVER → ↩ Khôi phục
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
local status = (function() for _, o in ipairs(_G.__CREATED) do if o._props.Text and type(o._props.Text)=="string" and o._props.Text:find("LOCAL: chỉ máy bạn", 1, true) then return o end end end)()
check("tìm thấy đủ 5 điều khiển", input and findB and applyB and srvB and resB and status)

-- 1) 🔍 Tìm
input.Text = "TestUser"
local ok1, err1 = click(findB)
check("bấm 🔍 Tìm chạy không lỗi", ok1, err1)
check("avatar đã tải (portrait.Image)", (function() for _, o in ipairs(_G.__CREATED) do if o.ClassName == "ImageLabel" and type(o.Image)=="string" and o.Image:find("rbxthumb", 1, true) then return true end end return false end)(), nil)
check("báo đã tải avatar", type(status.Text)=="string" and status.Text:find("Đã tải avatar", 1, true) ~= nil, status.Text)

-- 2) 👕 Mặc LOCAL khi ĐANG bật LẤY SKIN (v5.7) -> guard phải tắt skin trước
_G.__guardCalled = false
_G.BananaCatHub_PlayerInfo = { isApplied = true, _skinFake = false, ResetSkin = function() _G.__guardCalled = true return true end }
local ok2, err2 = click(applyB)
check("bấm 👕 Mặc LOCAL chạy không lỗi", ok2, err2)
check("guard gọi ResetSkin của v5.7", _G.__guardCalled == true)
check("đã gọi ApplyDescription/ApplyDescriptionReset", (_G.__APPLIED.apply + _G.__APPLIED.reset) > 0, "apply=" .. _G.__APPLIED.apply .. " reset=" .. _G.__APPLIED.reset)
check("status báo đã thay đồ hoặc lỗi rõ ràng", type(status.Text)=="string" and (#status.Text > 0), status.Text)

-- 3) 🌐 Mặc SERVER khi game CHƯA cài OutfitServer
_G.BananaCatHub_PlayerInfo.isApplied = false
input.Text = "TestUser"
local ok3, err3 = click(srvB)
check("bấm 🌐 Mặc SERVER chạy không lỗi", ok3, err3)
check("báo thiếu OutfitServer.server.lua", type(status.Text)=="string" and status.Text:find("OutfitServer", 1, true) ~= nil, status.Text)

-- 4) ↩ Khôi phục LOCAL
local ok4, err4 = click(resB)
check("bấm ↩ Khôi phục LOCAL chạy không lỗi", ok4, err4)
check("có phản hồi sau khi khôi phục", type(status.Text)=="string" and #status.Text > 0, status.Text)

print(string.format("[KẾT QUẢ] %d PASS / %d FAIL", pass, fail))
'''

driver = open(os.path.join(HERE,'mock_roblox.luau'),encoding='utf-8').read() + "\n\n-- ===== KHỐI LẤY TỪ script.js =====\n" + block + "\n" + TEST
open(os.path.join(HERE,OUT),'w',encoding='utf-8').write(driver)
print('driver:', SRC, '->', OUT, len(driver.split(chr(10))), 'dòng')
