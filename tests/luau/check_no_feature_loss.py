# -*- coding: utf-8 -*-
"""Kiểm tra KHÔNG MẤT TÍNH NĂNG của bản gốc:

    mọi dòng của script.js TRƯỚC KHI GHÉP (commit gốc) vẫn còn trong script.js hiện tại,
    đúng thứ tự; chỉ 4 dòng được đổi text có chủ đích (whitelist).

Dùng:  python3 check_no_feature_loss.py [commit_gốc]
       (mặc định b36ff1e = commit cuối cùng trước khi ghép; đổi bằng biến SCRIPT_BASE_REF)
"""
import io, re, os, sys, difflib, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
BASE = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('SCRIPT_BASE_REF', 'b36ff1e')

try:
    raw = subprocess.run(['git', '-C', ROOT, 'show', '%s:script.js' % BASE],
                         capture_output=True, text=True, check=True).stdout
except subprocess.CalledProcessError:
    raise SystemExit('❌ không đọc được %s:script.js (repo thiếu commit gốc?)' % BASE)

def to_lines(t):
    return t.replace('\r\n', '\n').replace('\r', '\n').split('\n')

O = to_lines(raw)                                                        # bản gốc
M = to_lines(io.open(os.path.join(ROOT, 'script.js'), encoding='utf-8', newline='').read())  # bản ghép

# 4 dòng gốc được phép đổi text (phần kết hợp 👕 Mặc LOCAL với 🔎 LẤY SKIN v5.7):
WHITELIST = [
    r'^\s*Text = "LOCAL: chỉ máy bạn',                                         # ghi chú panel
    r'^\s*say\("✅ Đã khôi phục quần áo/phụ kiện LOCAL\.", true\) return$',       # nút ↩ Khôi phục
    r'^\s*if not original or hum ~= originalHum then say\("Không có trang phục'
    r' cũ trên nhân vật hiện tại\.", false\) return end$',
    r'^\s*if ok then original, originalHum = nil, nil say\("✅ Đã khôi phục'
    r' trang phục gốc\.", true\)$',
]
ok_line = lambda l: any(re.match(p, l) for p in WHITELIST)

sm = difflib.SequenceMatcher(None, O, M, autojunk=False)
changed, inserted, lost = [], 0, []
for tag, i1, i2, j1, j2 in sm.get_opcodes():
    if tag == 'equal':
        continue
    if tag == 'insert':
        inserted += j2 - j1
        continue
    for i in range(i1, i2):
        (changed if ok_line(O[i]) else lost).append((i + 1, O[i]))

print("TEST 5 — không mất tính năng: mọi dòng của bản gốc %s vẫn còn trong script.js" % BASE)
print("  bản gốc %d dòng | bản ghép %d dòng (+%d dòng thêm mới)" % (len(O), len(M), inserted))
print("  giữ nguyên: %d dòng | đổi text có chủ đích: %d dòng | THÊM MỚI: %d dòng"
      % (len(O) - len(changed) - len(lost), len(changed), inserted))
for n, l in changed:
    print("     · dòng gốc %d → đổi text: %s" % (n, l.strip()[:90]))
if lost:
    print("  ❌ MẤT %d dòng của bản gốc:" % len(lost))
    for n, l in lost[:15]:
        print("     · dòng gốc %d: %s" % (n, l.strip()[:110]))
    raise SystemExit(1)
print("  ✅ KHÔNG MẤT DÒNG NÀO của bản gốc (%d dòng giữ nguyên, %d dòng đổi text có chủ đích, %d dòng thêm mới)"
      % (len(O) - len(changed) - len(lost), len(changed), inserted))
raise SystemExit(0)
