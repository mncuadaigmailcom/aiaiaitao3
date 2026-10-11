# Bộ test cho `script.js` (Banana Cat Hub — bản đã ghép 👕 TRANG PHỤC)

Các test này kiểm tra **file `script.js` ở gốc repo** sau khi ghép tính năng
"👕 TRANG PHỤC NGƯỜI CHƠI" từ `script.js1.js`, đảm bảo **không mất tính năng nào**
của bản gốc và khối ghép chạy được thật.

## Cách chạy

```bash
cd tests/luau && npm install       # cài @luau-rs/luau (compiler Luau thật, ~2 MB WASM)
cd ../.. && bash tests/luau/run_all_tests.sh
```

* Cần **Node.js ≥ 18** và **Python 3**.
* `node_modules/` không được commit (đã có trong `.gitignore`) — máy mới phải `npm install` lại.
* Nếu chưa cài `@luau-rs/luau`, runner chỉ báo nhắc và thoát mã 2.

## Sáu nhóm test

| # | Việc kiểm tra | Cách làm |
|---|---|---|
| T1 | `script.js` **biên dịch được bằng compiler Luau thật** ở cả 3 mức tối ưu (opt 0/1/2) | `luau_compile_check.mjs` (WASM Luau v0.739). In kèm kết quả của `script.js1.js` để so sánh — bản `script.js1.js` **FAIL ở opt=0** (`Out of local registers … exceeded limit 200`), còn bản ghép đã qua được cả 3 mức. |
| T2 | Khối 👕 đã ghép **giống hệt 100%** khối gốc trong `script.js1.js` | `check_merge_identity.py`: so từng dòng sau khi bỏ 12 dòng thêm mới (dòng `;(function()`, `end)()`, guard, chú thích) + 1 dòng status đã sửa; kiểm tra mọi định danh khối dùng đều tồn tại trong `script.js`. |
| T3 | **Bố cục tab 👥 Người Chơi**: 6 panel xếp tăng dần, không chồng nhau | `check_layout.py`: dò `D.playerY` của từng panel, tính tổng chiều cao + kiểm tra 157 tên `local` cột 0 không trùng. |
| T4 | **Không xoá dòng nào** của bản gốc | `git diff --numstat -- script.js` → cột xoá phải bằng 0. |
| T5 | **Runtime thật** của khối 👕 vừa ghép | `gen_outfit_driver.py` tách khối ra khỏi `script.js`, ghép `mock_roblox.luau` (giả lập API Roblox) rồi chạy bằng luau-rs → bấm thử 🔍 Tìm → 👕 Mặc LOCAL → 🌐 Mặc SERVER → ↩ Khôi phục. Mong đợi **15 PASS / 0 FAIL**. |
| T6 | **Đối chứng A/B** với khối gốc | Dựng lại driver từ `script.js1.js` (khối gốc là `do … end`, chưa bọc IIFE) → mong đợi **14 PASS / 1 FAIL**: đúng cái FAIL là "guard gọi `ResetSkin` của v5.7" — chứng minh guard chống đụng độ với tính năng 🔎 LẤY SKIN là **khác biệt duy nhất có chủ đích**. |

Kết quả đúng: **6 PASS / 0 FAIL**.

## Các file

| File | Việc |
|---|---|
| `run_all_tests.sh` | Chạy cả 6 nhóm, in tổng kết, trả mã thoát = số test FAIL. |
| `luau_compile_check.mjs` | Biên dịch file Luau bằng `@luau-rs/luau`; nhận danh sách file, mặc định `script.js` + `script.js1.js`. |
| `check_merge_identity.py` | So khối ghép với khối gốc + kiểm tra định danh còn thiếu. |
| `check_layout.py` | Kiểm tra vị trí/chiều cao 6 panel tab Người Chơi + tên `local` trùng. |
| `gen_outfit_driver.py` | Sinh `_driver_generated.luau` (mock + khối từ `script.js` + test bấm nút). Dùng: `python3 gen_outfit_driver.py [file_nguồn] [file_ra]`. |
| `run_outfit_test.mjs` | Chạy 1 file `.luau` bằng luau-rs, in log `print` + kết quả. |
| `mock_roblox.luau` | Mock API Roblox (Instance, UDim2, Enum, Players, HttpService…); ghi lại mọi instance (`_G.__CREATED`), sự kiện (`_G.__CONNS`), lần gọi `ApplyDescription` (`_G.__APPLIED`). |
| `luau_strip.py` | Bỏ comment/chuỗi khi đếm từ khoá Luau (dùng chung cho các script Python). |

## Điểm cần biết khi đọc kết quả

* **T1 opt=0 của `script.js1.js` FAIL là đúng như dự kiến**, không phải lỗi mới: bản gốc khai hơn 200 `local`
  trong một hàm nên vượt `kMaxLocalCount = 200` của Luau — chỉ khi tối ưu hoá bật (opt ≥ 1) compiler mới
  thu hồi register theo `LuauCompileReuseLocalRegs` nên mới qua. Bản ghép vẫn giữ nguyên con số đó.
* Runtime test **không chạy Roblox thật**: mock tự cấp API. Mục đích là bắt lỗi cú pháp, lỗi luồng điều khiển,
  lỗi gọi API sai tên, và lỗi "quên nối sự kiện" — không thay thế việc thử trong Studio.
* Nút **🌐 Mặc SERVER** cần `OutfitServer.server.lua` đặt trong `ServerScriptService` của game
  (file này không có trong repo) — test chỉ xác nhận script báo đúng thông báo khi thiếu.
