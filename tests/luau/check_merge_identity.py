import io, re, difflib
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
exec(open(os.path.join(HERE, 'luau_strip.py')).read())

merged = io.open(os.path.join(ROOT, 'script.js'),'r',encoding='utf-8',newline='').read().split('\n')
srcj1  = io.open(os.path.join(ROOT, 'script.js1.js'),'r',encoding='utf-8',newline='').read().split('\n')
KEY = re.compile(r"\b(function|if|do|repeat|end|until)\b")

def block_range(lines, first_pred, open_kind='do'):
    s = next(i for i,l in enumerate(lines) if first_pred(l))
    assert open_kind=='do' or lines[s+1].strip()==open_kind or any(lines[k].strip()==open_kind for k in range(s+1, s+6))
    if lines[s+1].strip()!=open_kind:
        s = next(k for k in range(s+1, s+6) if lines[k].strip()==open_kind) - 1
    d=0
    for j in range(s+1,len(lines)):
        for t in KEY.findall(strip(lines[j])):
            if t in ('function','if','do','repeat'): d+=1
            else:
                d-=1
                if d==0: return s+1, j      # index của 'do' ... 'end'
    raise SystemExit('không tìm thấy khối')

o1,o2 = block_range(srcj1, lambda l: l.startswith('-- Trang phục chỉ áp dụng'))
m1,m2 = block_range(merged, lambda l: '👕 TRANG PHỤC NGƯỜI CHƠI (gộp từ script.js1.js)' in l, ';(function()')

orig = [l.rstrip('\r') for l in srcj1[o1+1:o2]]      # thân khối gốc (không tính do/end)
new  = [l.rstrip('\r') for l in merged[m1+1:m2]]     # thân khối mới  (không tính ;(function()/end)())

# cắt bỏ vùng guard đã thêm (từ dòng "-- 🔗 Kết hợp" đến "end" đóng stopSkinIfAny)
g0 = next(i for i,l in enumerate(new) if '🔗 Kết hợp với' in l)
r0 = next(i for i in range(g0,len(new)) if new[i].strip()=='return false')
g1 = next(i for i in range(r0,len(new)) if new[i].strip()=='end')
new_wo_guard = new[:g0] + new[g1+1:]
# gọi guard (2 dòng ở applyBtn, 1 dòng ở serverAction)
pat_guard_call = re.compile(r'^\s*(local stoppedSkin = stopSkinIfAny\(\)|if stoppedSkin then say\(|if action == "apply" then stopSkinIfAny\(\) end)')
new_wo_guard = [l for l in new_wo_guard if not pat_guard_call.match(l)]
# dòng status đã sửa text
norm = lambda ls: [re.sub(r'LOCAL: chỉ máy bạn.*', 'STATUS', l) for l in ls]
a, b = norm(orig), norm(new_wo_guard)
print("TEST 1 — so khối gốc (script.js1.js) với khối đã ghép (script.js)")
print(f"  gốc {len(a)} dòng | ghép {len(b)} dòng | chỉ khác dòng đã sửa có chủ đích")
if a == b:
    print("  ✅ GIỐNG HỆT 100% sau khi trừ 12 dòng thêm mới (guard + ghi chú) và 1 dòng status")
else:
    for d in list(difflib.unified_diff(a,b,'gốc','ghép',lineterm=''))[:30]: print("   ", d[:170])

print("\nTEST 2 — định danh khối dùng (đã loại tên khai báo bên trong khối)")
code = strip('\n'.join(merged[m1+1:m2]))
declared = set(re.findall(r"local\s+function\s+([A-Za-z_]\w*)", code))
declared |= set(re.findall(r"local\s+([A-Za-z_]\w*)", code))
# multi-name locals: local a, b, c = ...
for m in re.finditer(r"local\s+((?:[A-Za-z_]\w*\s*,\s*)*[A-Za-z_]\w*)\s*(?:=|$)", code):
    declared |= {x.strip() for x in m.group(1).split(',')}
# for-loop vars
for m in re.finditer(r"for\s+((?:[A-Za-z_]\w*\s*,\s*)*[A-Za-z_]\w*)\s+(?:in|=)", code):
    declared |= {x.strip() for x in m.group(1).split(',')}
# tham số hàm  function(a, b)
for m in re.finditer(r"function\s*\(([^)]*)\)", code):
    declared |= {x.strip() for x in m.group(1).split(',') if x.strip() and x.strip()!='...'}
BUILTIN = set('''and break do else elseif end false for function if in local nil not or repeat return then true until while
print warn error pcall xpcall select type typeof tostring tonumber ipairs pairs next unpack rawget rawset rawequal setmetatable getmetatable
assert string table math os task utf8 bit32 coroutine debug game workspace Instance Enum Color3 UDim UDim2 Vector2 Vector3 CFrame Ray
TweenInfo BrickColor tick time shared _G'''.split())
code_no_field = re.sub(r"[:.]\s*[A-Za-z_]\w*", "", code)
code_no_str   = re.sub(r'"[^"]*"', '', code_no_field)
cand = set(re.findall(r"\b([A-Za-z_]\w*)\b", code_no_str)) - BUILTIN - declared
whole = strip('\n'.join(merged))
missing = [n for n in sorted(cand) if not re.search(r"(local\s+function\s+%s\b|local\s+%s\b|function\s+%s\b|\b%s\s*=)" % (n,n,n,n), whole)]
print("  dùng nhưng KHÔNG khai báo trong script.js:", missing if missing else "✅ không có (mọi hàm/biến đều tồn tại)")
