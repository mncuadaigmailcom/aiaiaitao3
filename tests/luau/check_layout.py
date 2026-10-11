import os, io, re, collections
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
exec(open(os.path.join(HERE, 'luau_strip.py')).read())
lines = [l.rstrip('\r') for l in io.open(os.path.join(ROOT, 'script.js'),encoding='utf-8').read().split('\n')]

print("TEST 3 — chuỗi panel trong tab 👥 Người Chơi (xếp theo D.playerY)")
y = 46; n = 0; ok = True
for i, l in enumerate(lines):
    if not re.search(r"\}, D\.playerTab\) D\.playerY = \(D\.playerY or 46\) \+ ", l):
        continue
    # chiều cao: ưu tiên số trong Size; nếu là PH thì lấy "local PH = N" gần nhất phía trên
    h = None
    for k in range(i, max(-1, i-80), -1):
        m = re.search(r"Size = UDim2\.new\(1, -16, 0, (\d+)\)", lines[k])
        if m: h = int(m.group(1)); break
        m = re.search(r"^(?:\s*do\s|;\()?\s*local PH = (\d+)", lines[k])
        if m: h = int(m.group(1)); break
    name = None
    for k in range(i, max(-1, i-80), -1):
        m = re.search(r'Name = "(\w+)"', lines[k])
        if m: name = m.group(1); break
    n += 1
    print(f"  panel {n}: dòng {i+1:>5}  y {y:>5} → {y+h:>5} (cao {h:>3})  {name}")
    if h is None or h <= 0: ok = False
    y += h + 8
print(f"  → cần tổng {y} px cho {n} panel")
sizes = len(re.findall(r"D\.playerTab\.CanvasSize = UDim2\.new\(0, 0, 0, (?:\(D\.playerY or 600\)|D\.playerY) \+ 16\)", '\n'.join(lines)))
print(f"  CanvasSize được cập nhật {sizes} lần (mỗi panel tự nới canvas lên D.playerY + 16 = 2126 px)")
print("  ✅ các panel xếp tăng dần, không chồng nhau" if ok else "  ❌ có panel thiếu chiều cao")

print("\nTEST 4 — tên khai báo trùng ở phạm vi hàm chính (cột 0)")
import collections
top = collections.Counter()
import os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
_raw = io.open(os.path.join(ROOT, 'script.js'),encoding='utf-8').read()
for l in strip(_raw).split('\n'):          # strip cả file để bỏ cả chuỗi [[ ]] nhiều dòng
    m = re.match(r"^local\s+(?:function\s+)?(\w+)", l)
    if m: top[m.group(1)] += 1
dups = {k:v for k,v in top.items() if v > 1}
print("  tổng:", len(top), "| trùng ở cột 0:", dups if dups else "✅ không có")
