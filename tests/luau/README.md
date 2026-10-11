# Bộ test cho `script.js` (Banana Cat Hub — bản ghép 👕 TRANG PHỤC)

Các test này kiểm tra **file `script.js` ở gốc repo** sau khi ghép tính năng
"👕 TRANG PHỤC NGƯỜI CHƠI" (từ `script.js1.js`) và **kết hợp nó với 🔎 LẤY SKIN (v5.7)**,
đảm bảo **không mất tính năng nào** của bản gốc và khối ghép chạy được thật.

## Tính năng đã kết hợp (nút 👕 Mặc LOCAL)

* **Một nút làm cả hai**: bấm `👕 Mặc LOCAL` → gọi `PI.ApplySkin(...)` của khối 🔎 LẤY SKIN (v5.7)
  để **hóa thân** thành đúng người đó (dáng + mặt + tóc + đồ của họ), rồi **mặc quần áo/phụ kiện LOCAL**
  lên nhân vật. Hai tính năng **không tắt nhau** nữa.
* `↩ Khôi phục LOCAL` trả lại **cả hai**: tắt skin đang hóa thân + khôi phục quần áo/phụ kiện.
* 🌐 Mặc SERVER vẫn tự tắt skin trước (nếu không, bạn sẽ không thấy bộ đồ vừa mặc lên người mình).
* Không có v5.7 (hoặc `ApplySkin` lỗi) thì nút vẫn mặc đồ như cũ và báo rõ vì sao chưa hóa thân được.

## Cách chạy

```bash
cd tests/luau && npm install       # cài @luau-rs/luau (compiler Luau thật, ~2 MB WASM)
cd ../.. && bash tests/luau/run_all_tests.sh
```

* Cần **Node.js ≥ 18**, **Python 3** và **git** (để đọc commit gốc so sánh).
* `node_modules/` không được commit (đã có trong `.gitignore`) — máy mới phải `npm install` lại.
* Nếu chưa cài `@luau-rs/luau`, runner chỉ báo nhắc và thoát mã 2.

## Sáu nhóm test

| # | Việc kiểm tra | Cách làm |
|---|---|---|
| T1 | `script.js` **biên dịch được bằng compiler Luau thật** ở cả 3 mức tối ưu (opt 0/1/2) | `luau_compile_check.mjs` (WASM Luau v0.739). In kèm kết quả của `script.js1.js` để so sánh — bản `script.js1.js` **FAIL ở opt=0** (`Out of local registers … exceeded limit 200`), còn bản ghép đã qua được cả 3 mức. |
| T2 | Khối 👕 đã ghép **giống hệt** khối gốc trong `script.js1.js` | `check_merge_identity.py`: so từng dòng, chỉ cho phép **30 dòng thêm mới** + **4 dòng đổi text có chủ đích** (whitelist: ghi chú panel và 3 dòng trạng thái khôi phục có nhắc `skin`); mọi dòng gốc khác phải còn nguyên. Kiểm tra thêm mọi định danh khối dùng đều tồn tại trong `script.js`. |
| T3 | **Bố cục tab 👥 Người Chơi**: 6 panel xếp tăng dần, không chồng nhau | `check_layout.py`: dò `D.playerY` của từng panel, tính tổng chiều cao + kiểm tra 157 tên `local` cột 0 không trùng. |
| T4 | **Không mất tính năng**: mọi dòng của `script.js` **trước khi ghép** vẫn còn, đúng thứ tự | `check_no_feature_loss.py`: `git show <commit gốc>:script.js` rồi so bằng `difflib`; kết quả đúng là **+303 dòng thêm, 0 dòng gốc bị xoá/đổi**. |
| T5 | **Runtime thật** của khối 👕 vừa ghép (đã kết hợp skin) | `gen_outfit_driver.py` tách khối ra khỏi `script.js`, ghép `mock_roblox.luau` rồi chạy bằng luau-rs → bấm thử 🔍 Tìm → 👕 Mặc LOCAL → ↩ Khôi phục → 🌐 Mặc SERVER → 2 tình huống dự phòng. Mong đợi **24 PASS / 0 FAIL**. |
| T6 | **Đối chứng A/B** với khối gốc | Dựng lại driver từ `script.js1.js` (khối gốc là `do … end`, chưa bọc IIFE, chưa kết hợp skin) → mong đợi **16 PASS / 8 FAIL**; đúng 8 cái FAIL là phần kết hợp: gọi `ApplySkin`, trạng thái “HÓA THÂN”, khôi phục skin, guard khi mặc SERVER. |

Kết quả đúng: **6 PASS / 0 FAIL**.

## Các file

| File | Việc |
|---|---|
| `run_all_tests.sh` | Chạy cả 6 nhóm, in tổng kết, trả mã thoát = số test FAIL. |
| `luau_compile_check.mjs` | Biên dịch file Luau bằng `@luau-rs/luau`; nhận danh sách file, mặc định `script.js` + `script.js1.js`. |
| `check_merge_identity.py` | So khối ghép với khối gốc (whitelist 4 dòng đổi text) + kiểm tra định danh còn thiếu. |
| `check_no_feature_loss.py` | So **toàn file** `script.js` với bản gốc trong commit `b36ff1e` (đổi được bằng `SCRIPT_BASE_REF`). |
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
  lỗi gọi API sai tên, lỗi “quên nối sự kiện” và kiểm tra hai tính năng gọi nhau đúng — không thay thế việc thử trong Studio.
* Nút **🌐 Mặc SERVER** cần `OutfitServer.server.lua` đặt trong `ServerScriptService` của game
  (file này không có trong repo) — test chỉ xác nhận script báo đúng thông báo khi thiếu.
