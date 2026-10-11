#!/bin/bash
# Chạy toàn bộ test cho script.js
#   bash tests/luau/run_all_tests.sh
# Yêu cầu: node >= 18 + đã cài @luau-rs/luau (npm install trong tests/luau), python3, git
#
# script.js CHƯA ghép tính năng 👕 TRANG PHỤC NGƯỜI CHƠI:
#   → chạy T1 (biên dịch), T3 (bố cục panel), T4 (không mất dòng gốc);
#   → bỏ qua T2, T5, T6 (chỉ dùng khi tính năng được ghép lại — xem commit 4f51f82).
set -u
cd "$(dirname "$0")/../.."          # về gốc repo
R=tests/luau
PASS=0; FAIL=0; SKIP=0
say(){ printf '%s\n' "$1"; }
res(){ if [ "$1" = 0 ]; then PASS=$((PASS+1)); say "   ➜ KẾT QUẢ: ✅ PASS"; else FAIL=$((FAIL+1)); say "   ➜ KẾT QUẢ: ❌ FAIL"; fi }

if [ ! -d "$R/node_modules/@luau-rs" ]; then
  say "⚠️  Chưa cài @luau-rs/luau — chạy:  npm install --prefix $R   (hoặc cd $R && npm install)"
  exit 2
fi

if grep -q "HubOutfit_Panel" script.js; then HAS_OUTFIT=1; else HAS_OUTFIT=0; fi
if [ "$HAS_OUTFIT" = 0 ]; then
  say "ℹ️  script.js KHÔNG có tính năng 👕 TRANG PHỤC NGƯỜI CHƠI (đã xoá theo yêu cầu)."
  say "    Vẫn chạy: T1 (biên dịch Luau), T3 (bố cục panel), T4 (không mất dòng gốc)."
  say "    Bỏ qua  : T2, T5, T6 — bộ test cho khối đã ghép (xem lại ở commit 4f51f82)."
  say ""
fi

say "════ T1. Biên dịch script.js bằng LUAU THẬT (v0.739) — 3 mức tối ưu ════"
if out=$(node $R/luau_compile_check.mjs script.js 2>&1); then s=0; else s=1; fi
echo "$out" | sed 's/^/   /'; res $s
if [ "$HAS_OUTFIT" = 0 ]; then
  say "   (tham khảo — script.js1.js: biên dịch ở mức tối ưu 1 & 2:)"
  node $R/luau_compile_check.mjs script.js1.js 2>&1 | grep -v "opt=0" | sed 's/^/   /' || true
  node $R/luau_compile_check.mjs script.js1.js 2>&1 | grep "opt=0" | sed 's/^/   (đã biết: )/' || true
fi

if [ "$HAS_OUTFIT" = 1 ]; then
  say ""; say "════ T2. Khối 👕 ghép giống khối gốc (chỉ khác phần kết hợp skin có chủ đích) ════"
  out=$(python3 $R/check_merge_identity.py 2>&1); echo "$out" | sed 's/^/   /'
  if echo "$out" | grep -q "GIỐNG HỆT 100%" && echo "$out" | grep -q "không có (mọi hàm/biến đều tồn tại)"; then s=0; else s=1; fi
  res $s
else
  SKIP=$((SKIP+1)); say ""; say "⏭  T2. (bỏ qua — không còn khối 👕 để so với bản gốc)"
fi

say ""; say "════ T3. Bố cục các panel tab 👥 Người Chơi (không chồng nhau) ════"
out=$(python3 $R/check_layout.py 2>&1); echo "$out" | sed 's/^/   /'
if echo "$out" | grep -q "không chồng nhau" && echo "$out" | grep -q "trùng ở cột 0: ✅ không có"; then s=0; else s=1; fi
res $s

say ""; say "════ T4. Không mất tính năng: mọi dòng của bản gốc vẫn còn ════"
out=$(python3 $R/check_no_feature_loss.py 2>&1); echo "$out" | sed 's/^/   /'
echo "$out" | grep -q "KHÔNG MẤT DÒNG NÀO"; res $?

if [ "$HAS_OUTFIT" = 1 ]; then
  say ""; say "════ T5. Test RUNTIME (mock Roblox) khối 👕 + kết hợp 🔎 LẤY SKIN ════"
  python3 $R/gen_outfit_driver.py >/dev/null
  out=$(node $R/run_outfit_test.mjs 2>&1); echo "$out" | sed 's/^/   /'
  echo "$out" | grep -q "24 PASS / 0 FAIL"; res $?

  say ""; say "════ T6. Đối chứng A/B: khối GỐC trong script.js1.js (phải thiếu phần kết hợp) ════"
  python3 $R/gen_outfit_driver.py script.js1.js _driver_orig.luau >/dev/null
  out=$(node $R/run_outfit_test.mjs $R/_driver_orig.luau 2>&1)
  echo "$out" | grep "❌" | sed 's/^/   /'
  echo "$out" | grep "PASS /" | sed 's/^/   /'
  if echo "$out" | grep -q "16 PASS / 8 FAIL"; then
    say "   ➜ đúng: 8 điểm FAIL đều là phần KẾT HỢP (ApplySkin, trạng thái, khôi phục skin, guard SERVER)"
    s=0
  else s=1; fi
  res $s
else
  SKIP=$((SKIP+1)); say ""; say "⏭  T5. (bỏ qua — script.js không có khối 👕 TRANG PHỤC để chạy thử)"
  SKIP=$((SKIP+1)); say "⏭  T6. (bỏ qua — không có phần kết hợp skin để đối chứng)"
fi

say ""; say "════════════════════════════════════════"
say "TỔNG: $PASS PASS / $FAIL FAIL / $SKIP BỎ QUA"
[ "$FAIL" = 0 ] && say "🎉 Tất cả test đều đạt" || say "⚠️ Có test không đạt"
exit $FAIL
