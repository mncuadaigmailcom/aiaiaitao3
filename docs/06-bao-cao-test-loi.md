# 6. Báo cáo kiểm thử, lỗi đã sửa, mục chưa kiểm chứng

## 6.1 Bảng kết quả test

Ngày thực hiện: **2026-10-18**. Mọi dòng "Đạt" dưới đây là test **đã chạy thật**
trong môi trường này và in kết quả ra.

| Hạng mục | Trạng thái | Bằng chứng |
| -------- | ---------- | ---------- |
| Lint 4 quy ước an toàn tĩnh | Đạt | `npm run lint` → `✓ Không có vi phạm. (36 tệp .luau)` |
| Danh mục khớp mã nguồn thật | Đạt | `npm run catalog` → `✓ Danh mục khớp với mã nguồn thật, không có khai khống.` (190 mục / 36 tệp) |
| Cú pháp toàn bộ `.luau` | Đạt | `npm run syntax` → `38 tệp, lỗi: 0` |
| Test `scheduler` (9) | Đạt | `đạt 9 / hỏng 0` — LOOP-001..004, BG-003, BG-006, START-001, CPU-009, REC-003 |
| Test `guard` (9) | Đạt | `đạt 9 / hỏng 0` — CPU-008, REC-001/002/004, CFG-003, DIST-004 |
| Test `registry` (8) | Đạt | `đạt 8 / hỏng 0` — LEAK-001/003/005, EVT-002/006, QUERY-002, ASSET-003, RES-003, SAFE-007 |
| Test `pool` (8) | Đạt | `đạt 8 / hỏng 0` — POOL-001/003/004/005, RAM-002, DATA-001, CPU-006 |
| Test `cull` (10) | Đạt | `đạt 10 / hỏng 0` — CULL-001..004, DIST-001/003/004, FX-001, FPS-003, GRAPHICS-004, CPU-005, REC-002 |
| Test `spatial` (10) | Đạt | `đạt 10 / hỏng 0` — DATA-002/003/004, QUERY-003/004, CPU-004/005, NPC-003, LOOP-007 |
| Test `gui` (16) | Đạt | `đạt 16 / hỏng 0` — GUI-001/002/004/005/006/010/011/012/013, FPS-002, LOWEND-004 |
| Test `safety` (10) | Đạt | `đạt 10 / hỏng 0` — SAFE-001..008, GRAPHICS-009, DATA-004 |
| Test `config` (13) | Đạt | `đạt 13 / hỏng 0` — CFG-001/002/004/005/006, RES-004, MEAS-004, LOWEND-001..004, REC-004 |
| Test `catalog` (7) | Đạt | `đạt 7 / hỏng 0` — tính toàn vẹn của danh mục |
| Test `pipeline` (15) | Đạt | `đạt 15 / hỏng 0` — MEAS-001/003/006/007, CFG-001, EFFECTS-001/002, RESTORE-001/002/003, REC-002/003, QUERY-004/006, LOOP-005, GRAPHICS-001/003, START-003 |
| **Tổng** | **Đạt** | **`npm run check` → đạt 115 / hỏng 0 / tổng 115** (bản gốc 2026-10-18) |
| Chạy trong **Roblox Studio** | **Chưa làm** | Môi trường phát triển không có Roblox Studio. Xem 6.4 |
| Đo FPS / RAM / CPU trước–sau | **Chưa làm** | Không có GPU, không có thiết bị thật. Xem [07](07-do-luong-hoan-tac.md) |

> **Cập nhật 2026-10-20:** `npm test` → **142/142** (thêm bộ `objectlocator`, 27 test);
> `npm run test:legacy` → **12/12** tái hiện 9 lỗi của `S.ObjTrack`. Xem
> [10-phan-tich-dinh-vi-vat-the.md](10-phan-tich-dinh-vi-vat-the.md).

## 6.2 Bảng lỗi đã gặp và đã sửa

| Mã lỗi | Mô tả | Nguyên nhân gốc | Cách sửa | Kết quả test lại | Trạng thái |
| ------ | ----- | --------------- | -------- | ---------------- | ---------- |
| BUG-01 | `Restore.Forget` được gọi nhưng **chưa từng được định nghĩa** | Hàm được tham chiếu trước khi viết; `pcall` nuốt lỗi "attempt to call a nil value" nên không lộ ra | Viết `Restore.Forget(instance)` ở `Restore.luau:57` | `registry` 8/8 đạt | Đã sửa |
| BUG-02 | `Restore.All()` gọi nil | `Restore.All` **bắt buộc** tham số `setter`, nhưng `Pipeline.Restore()` gọi không tham số | Đổi thành `Restore.All(setter?)` với hàm ghi mặc định dùng `Guard.Change` | `pipeline` RESTORE-001/002/003 đạt | Đã sửa |
| BUG-03 | 13 chỗ đọc ngược kết quả `Guard.Run` | `Guard.Run` trả `(ok, result)` nhưng nhiều nơi viết `local result, ok = Guard.Run(...)` | Đảo lại đúng thứ tự ở cả 13 chỗ; thêm LUẬT 1 vào linter để không tái phạm | `lint` 0 vi phạm; `guard` 9/9 | Đã sửa |
| BUG-04 | **Toàn bộ** danh sách lớp được bảo vệ bị vô hiệu | `Safety.Allow` viết `local className, okClass = pcall(...)`. `className` nhận `true`, nên `ProtectedClasses[true] = nil` → không lớp nào bị chặn | Đổi thành `local okClass, className = pcall(...)`; thêm test `SAFE-004` | `safety` 10/10 | Đã sửa |
| BUG-05 | `Scheduler.syncConnection` gọi trước khi khai báo | Hàm local được dùng ở trên chỗ định nghĩa | Chuyển định nghĩa lên **trước** lần dùng đầu tiên | `scheduler` LOOP-001 đạt | Đã sửa |
| BUG-06 | `Widget.New` áp dụng **0** thuộc tính mà mọi test vẫn xanh | Transpiler dịch generalized iteration của Luau thành `ipairs`, trong khi Luau dùng `next` (= `pairs`). Bảng props có khoá chuỗi nên `ipairs` duyệt 0 phần tử | Đổi sang phát `pairs(...)` | `gui` 16/16; thêm test `GUI-005` khoá chặt | Đã sửa |
| BUG-07 | `pairs(pairs(x))` → "table expected, got function" | `wrapForInWithIpairs` quét **vượt qua** `do` của một vòng `for` dạng số đứng trước, rồi bọc biểu thức của vòng generalized-for kế tiếp hai lần | Bộ quét dừng khi gặp `do` ở cấp 0 | `catalog` 7/7 | Đã sửa |
| BUG-08 | `pairs(string.gmatch(...))` → cùng lỗi "table expected, got function" | Transpiler chỉ bỏ qua `pairs`/`ipairs`/`next`, còn mọi lời gọi hàm trả về iterator vẫn bị bọc | Thêm `expressionIsCall()`: biểu thức là lời gọi hàm thì **không** bọc | 115/115 vẫn đạt sau khi sửa | Đã sửa |
| BUG-09 | Hoàn tác **ghi đè** giá trị mới của game | `Restore.Record` nhận `newValue` nhưng 4 chỗ gọi (`Graphics`, `Effects`, `Physics`×2) **không truyền**, nên `expect = nil` và stale-guard bị bỏ qua hoàn toàn | Truyền `newValue` ở cả 4 chỗ gọi | `pipeline` REC-002 đạt | Đã sửa |
| BUG-10 | `getgenv` xuất hiện trong mã thật | `RequireShim` dò `getgenv` để tương thích executor — trái phạm vi "chỉ Studio, không executor" | Xoá hẳn khỏi `RequireShim.luau`; thêm LUẬT 4 vào linter chặn API executor | `lint` 0 vi phạm; `SAFE-008` đạt | Đã sửa |
| BUG-11 | `Config.enabled = false` bị coi như chưa đặt | Mẫu `t[k] or nil` biến `false` hợp lệ thành `nil` | Dùng `readKey(source, key)` đọc trực tiếp bằng `rawget`; xoá các `or nil` thừa | `config` 13/13; thêm LUẬT 2 vào linter | Đã sửa |
| BUG-12 | `Notifier:_Cleanup` rò rỉ connection mà không báo | `pcall(function() handle:Disconnect() end)` nuốt lỗi khi handle thiếu `Disconnect` | Chuẩn hoá mọi handle đều có `Disconnect`; bỏ `pcall` che lỗi ở chỗ này | `gui` GUI-012 đạt | Đã sửa |
| BUG-13 | Linter báo sai 3 lần, suýt bị bỏ qua | `Safe.Get` trả `(value, ok)` nhưng bị xếp vào nhóm `(ok, result)`; chỉ xoá comment dòng chứ không xoá comment khối; LUẬT 2 quá rộng | Tách `OK_FIRST_CALLEES` / `VALUE_FIRST_CALLEES`; thêm `makeCommentStripper` xử lý cả comment khối; thu hẹp LUẬT 2 | `lint` 0 vi phạm trên 36 tệp | Đã sửa |

### Ảnh hưởng nếu không sửa

| Mã | Nếu để nguyên |
| -- | ------------- |
| BUG-04 | Hệ thống có thể sửa thuộc tính của lớp **đáng lẽ phải được bảo vệ** (map, nhân vật, vật phẩm). Đây là lỗi nghiêm trọng nhất trong danh sách. |
| BUG-09 | Hoàn tác đè lên thay đổi mới hơn của game → **vi phạm trực tiếp** yêu cầu "không bao giờ ghi đè thay đổi mới hơn". |
| BUG-06 | GUI không nhận bất kỳ thuộc tính nào → sai vị trí, sai màu, không bo góc. |
| BUG-11 | Không thể tắt hệ thống bằng `enabled = false`. |
| BUG-01/02/03 | Sập khi hoàn tác hoặc khi một bước lỗi. |
| BUG-10 | Mã có chứa API executor → ra ngoài phạm vi đã cam kết. |

## 6.3 Lỗi còn tồn

**Không có lỗi nào đã biết mà bị bỏ qua.** Mọi lỗi phát hiện được trong quá trình
làm việc đều đã sửa và test lại.

Điều này **không** có nghĩa là không còn lỗi. Nó có nghĩa: trong phạm vi 115 test
đã viết, không còn lỗi nào lộ ra. Những phần chưa có test (xem 6.4) hoàn toàn có
thể chứa lỗi chưa phát hiện.

## 6.4 Những gì CHƯA được kiểm chứng

Đây là phần quan trọng nhất của tài liệu này.

| Mục | Vì sao chưa kiểm chứng | Bạn kiểm bằng cách nào |
| --- | ---------------------- | ---------------------- |
| **Chạy trong Roblox Studio** | Môi trường phát triển không cài được Roblox Studio | Cài đặt theo [03](03-cai-dat-va-cau-hinh.md) rồi làm checklist ở [04](04-kiem-thu.md) |
| **API Roblox hành xử như mock** | Mock là mô phỏng viết tay, không phải engine thật. Đã **không** đối chiếu tài liệu API chính thức | Chạy trong Studio, xem Output có lỗi API nào không |
| **FPS / RAM / CPU trước–sau** | Không có GPU, không có thiết bị thật. Mọi con số sẽ là bịa | MicroProfiler + Script Profiler + Stats, theo [07](07-do-luong-hoan-tac.md) |
| **Hiệu quả trên thiết bị yếu thật** | Không có thiết bị di động/máy yếu để thử | Thử trên điện thoại, so `LOWEND` bật/tắt |
| **Chạy dài 15 phút không rò rỉ** | Harness dùng đồng hồ ảo, không mô phỏng được hàng nghìn khung hình thật | Chạy 15 phút, chụp Memory ở 3 mốc trong Developer Console |
| **Không xung đột với GUI của game bạn** | Harness không có GUI game thật để thử | Chạy trên game có GUI góc phải dưới, quan sát |
| **Trạng thái B "trong game"** | Hệ quả của dòng đầu tiên | Không có cách nào đạt được từ môi trường này |

## 6.5 Phân biệt: đã code-review / đã test máy / chưa test

| Mức | Số lượng | Gồm |
| --- | -------- | --- |
| Đã **test tự động đạt** (harness) | 90 phương pháp | Những mục trạng thái **B** trong [05](05-danh-muc-phuong-phap.md) |
| Đã **code-review + lint + cú pháp** | 141 phương pháp | Toàn bộ mục A + B |
| Đã **chạy trong Studio** | **0 phương pháp** | Chưa làm được |
