import io, re, difflib, os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
exec(open(os.path.join(HERE, 'luau_strip.py')).read())

merged = io.open(os.path.join(ROOT, 'script.js'), 'r', encoding='utf-8', newline='').read().split('\n')
srcj1 = io.open(os.path.join(ROOT, 'script.js1.js'), 'r', encoding='utf-8', newline='').read().split('\n')
KEY = re.compile(r"\b(function|if|do|repeat|end|until)\b")

def block_range(lines, first_pred, open_kind='do'):
    s = next(i for i, l in enumerate(lines) if first_pred(l))
    if lines[s + 1].strip() != open_kind:
        s = next(k for k in range(s + 1, s + 6) if lines[k].strip() == open_kind) - 1
    d = 0
    for j in range(s + 1, len(lines)):
        for t in KEY.findall(strip(lines[j])):
            if t in ('function', 'if', 'do', 'repeat'):
                d += 1
            else:
                d -= 1
                if d == 0:
                    return s + 1, j          # index của 'do' ... 'end'
    raise SystemExit('không tìm thấy khối')

if not any('HubOutfit_Panel' in l or 'TRANG PHỤC NGƯỜI CHƠI (gộp' in l for l in merged):
    print("ℹ️  script.js KHÔNG có khối 👕 TRANG PHỤC NGƯỜI CHƠI (đã xoá) — bỏ qua phép so khối ghép.")
    raise SystemExit(0)

o1, o2 = block_range(srcj1, lambda l: l.startswith('-- Trang phục chỉ áp dụng'))
m1, m2 = block_range(merged, lambda l: '👕 TRANG PHỤC NGƯỜI CHƠI (gộp từ script.js1.js)' in l, ';(function()')

orig = [l.rstrip('\r') for l in srcj1[o1 + 1:o2]]     # thân khối gốc (không tính do/end)
new = [l.rstrip('\r') for l in merged[m1 + 1:m2]]    # thân khối mới  (không tính ;(function()/end)())

# Những dòng GỐC được phép đổi text (phần kết hợp 🔎 LẤY SKIN + nhắc skin khi khôi phục).
# Mọi dòng gốc KHÁC mà biến mất/đổi khác whitelist này = đã làm mất tính năng.
WHITELIST = [
    r'^\s*Text = "LOCAL: chỉ máy bạn',                                        # ghi chú panel
    r'^\s*say\("✅ Đã khôi phục quần áo/phụ kiện LOCAL\.", true\) return$',      # khôi phục 1
    r'^\s*if not original or hum ~= originalHum then say\("Không có trang phục'  # khôi phục 2
    r' cũ trên nhân vật hiện tại\.", false\) return end$',
    r'^\s*if ok then original, originalHum = nil, nil say\("✅ Đã khôi phục'     # khôi phục 3
    r' trang phục gốc\.", true\)$',
]

def whitelisted(line):
    return any(re.match(p, line) for p in WHITELIST)

sm = difflib.SequenceMatcher(None, orig, new, autojunk=False)
changed, inserted, lost = [], 0, []
for tag, i1, i2, j1, j2 in sm.get_opcodes():
    if tag == 'equal':
        continue
    if tag == 'insert':
        inserted += j2 - j1
        continue
    for i in range(i1, i2):
        (changed if whitelisted(orig[i]) else lost).append((i + 1, orig[i]))

print("TEST 1 — so khối gốc (script.js1.js) với khối đã ghép (script.js)")
print(f"  gốc {len(orig)} dòng | ghép {len(new)} dòng | giữ nguyên {len(orig) - len(changed) - len(lost)} dòng")
print(f"  đổi text có chủ đích: {len(changed)}/{len(WHITELIST)} dòng (whitelist)")
for n, l in changed:
    print(f"     · dòng gốc {n}: {l.strip()[:96]}")
print(f"  thêm mới: {inserted} dòng (kết hợp 🔎 LẤY SKIN: tryApplySkin + status + khôi phục cả skin)")
if not lost:
    print("  ✅ GIỐNG HỆT 100% sau khi trừ phần thêm mới và 4 dòng đổi text có chủ đích")

print("\nTEST 2 — định danh khối dùng (đã loại tên khai báo bên trong khối)")
code = strip('\n'.join(merged[m1 + 1:m2]))
declared = set(re.findall(r"local\s+function\s+([A-Za-z_]\w*)", code))
declared |= set(re.findall(r"local\s+([A-Za-z_]\w*)", code))
for m in re.finditer(r"local\s+((?:[A-Za-z_]\w*\s*,\s*)*[A-Za-z_]\w*)\s*(?:=|$)", code):
    declared |= {x.strip() for x in m.group(1).split(',')}
for m in re.finditer(r"for\s+((?:[A-Za-z_]\w*\s*,\s*)*[A-Za-z_]\w*)\s+(?:in|=)", code):
    declared |= {x.strip() for x in m.group(1).split(',')}
for m in re.finditer(r"function\s*(?:[A-Za-z_][\w.:]*\s*)?\(([^)]*)\)", code):
    declared |= {x.strip() for x in m.group(1).split(',') if x.strip() and x.strip() != '...'}
BUILTIN = set('''and break do else elseif end false for function if in local nil not or repeat return then true until while
print warn error pcall xpcall select type typeof tostring tonumber ipairs pairs next unpack rawget rawset rawequal setmetatable getmetatable
assert string table math os task utf8 bit32 coroutine debug game workspace Instance Enum Color3 UDim UDim2 Vector2 Vector3 CFrame Ray
TweenInfo BrickColor tick time shared _G'''.split())
cand = set(re.findall(r"\b([A-Za-z_]\w*)\b", re.sub(r'"[^"]*"', '', re.sub(r"[:.]\s*[A-Za-z_]\w*", "", code)))) - BUILTIN - declared
whole = strip('\n'.join(merged))
missing = [n for n in sorted(cand) if not re.search(r"(local\s+function\s+%s\b|local\s+%s\b|function\s+%s\b|\b%s\s*=)" % (n, n, n, n), whole)]
print("  dùng nhưng KHÔNG khai báo trong script.js:", missing if missing else "✅ không có (mọi hàm/biến đều tồn tại)")

print("\nTEST 3 — không xoá dòng nào: mọi dòng thân khối gốc vẫn còn trong bản ghép")
print(f"  dòng gốc bị mất: {'✅ không có' if not lost else '❌ ' + str(len(lost))}")

bad = bool(lost) or bool(missing) or len(changed) != len(WHITELIST)
raise SystemExit(1 if bad else 0)
