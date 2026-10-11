#!/bin/bash
# Chạy toàn bộ test cho bản script.js đã ghép tính năng
#   bash tests/luau/run_all_tests.sh
# Yêu cầu: node >= 18 + đã cài @luau-rs/luau (npm install trong tests/luau), python3
set -u
cd "$(dirname "$0")/../.."          # về gốc repo
R=tests/luau
PASS=0; FAIL=0
say(){ printf '%s\n' "$1"; }
res(){ if [ "$1" = 0 ]; then PASS=$((PASS+1)); say "   ➜ KẾT QUẢ: ✅ PASS"; else FAIL=$((FAIL+1)); say "   ➜ KẾT QUẢ: ❌ FAIL"; fi }

if [ ! -d "$R/node_modules/@luau-rs" ]; then
  say "⚠️  Chưa cài @luau-rs/luau — chạy:  npm install --prefix $R   (hoặc cd $R && npm install)"
  exit 2
fi

say "════ T1. Biên dịch script.js bằng LUAU THẬT (v0.739) — 3 mức tối ưu ════"
if out=$(node $R/luau_compile_check.mjs script.js 2>&1); then s=0; else s=1; fi
echo "$out" | sed 's/^/   /'; res $s
say "   (tham khảo — script.js1.js: biên dịch ở mức tối ưu 1 & 2:)"
node $R/luau_compile_check.mjs script.js1.js 2>&1 | grep -v "opt=0" | sed 's/^/   /' || true
node $R/luau_compile_check.mjs script.js1.js 2>&1 | grep "opt=0" | sed 's/^/   (đã biết: )/' || true

say ""; say "════ T2. Khối ghép giống khối gốc (chỉ khác phần thêm có chủ đích) ════"
out=$(python3 $R/check_merge_identity.py 2>&1); echo "$out" | sed 's/^/   /'
echo "$out" | grep -q "GIỐNG HỆT 100%" && echo "$out" | grep -q "không có (mọi hàm/biến đều tồn tại)"; res $?

say ""; say "════ T3. Bố cục 6 panel tab 👥 Người Chơi (không chồng nhau) ════"
out=$(python3 $R/check_layout.py 2>&1); echo "$out" | sed 's/^/   /'
echo "$out" | grep -q "không chồng nhau" && echo "$out" | grep -q "trùng ở cột 0: ✅ không có"; res $?

say ""; say "════ T4. Không mất tính năng cũ: diff chỉ THÊM, không xoá dòng nào ════"
out=$(git diff --numstat -- script.js); echo "   $(echo "$out" | tr '\t' ' ')"
echo "$out" | awk '{exit !($2==0 && $1>0)}'; res $?

say ""; say "════ T5. Test RUNTIME (mock Roblox) khối 👕 TRANG PHỤC vừa ghép ════"
python3 $R/gen_outfit_driver.py >/dev/null
out=$(node $R/run_outfit_test.mjs 2>&1); echo "$out" | sed 's/^/   /'
echo "$out" | grep -q "15 PASS / 0 FAIL"; res $?

say ""; say "════ T6. Đối chứng A/B: khối GỐC trong script.js1.js (phải thiếu guard) ════"
python3 $R/gen_outfit_driver.py script.js1.js _driver_orig.luau >/dev/null
out=$(node $R/run_outfit_test.mjs $R/_driver_orig.luau 2>&1); echo "$out" | grep -E "PASS /|guard" | sed 's/^/   /'
# ở bản GỐC test guard phải FAIL (đúng đối chứng) -> chuỗi mong đợi "14 PASS / 1 FAIL"
echo "$out" | grep -q "14 PASS / 1 FAIL" && echo "   ➜ đúng: bản gốc thiếu guard, bản ghép có guard = khác biệt DUY NHẤT có chủ đích"
echo "$out" | grep -q "14 PASS / 1 FAIL"; res $?

say ""; say "════════════════════════════════════════"
say "TỔNG: $PASS PASS / $FAIL FAIL"
[ "$FAIL" = 0 ] && say "🎉 Tất cả test đều đạt" || say "⚠️ Có test không đạt"
exit $FAIL
