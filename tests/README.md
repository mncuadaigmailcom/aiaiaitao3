# Bộ test thật cho Banana Cat Hub

Trước v4.11, dòng chú thích ở đầu `script.js` có ghi *"118 tests PASS"* nhưng **trong repo
không hề có test nào** — con số đó không kiểm chứng lại được. Bộ này là test thật: nó
**nạp và chạy chính `script.js`**, không phải một bản chép lại logic.

```bash
node tests/run.js              # chạy toàn bộ 100 test
node tests/run.js --boot-only  # chỉ nạp script, báo lỗi khởi động
LUAVM=/duong/dan/wasmoon node tests/run.js   # nếu cài wasmoon ở chỗ khác
```

> Cần cài máy ảo Lua **một lần** (thư mục `node_modules` không nằm trong repo):
> `mkdir -p ~/luavm && cd ~/luavm && npm install wasmoon`

Kết quả hiện tại: **100 PASS · 0 FAIL** · script khởi động sạch (689 instance, 0 lỗi runtime).

## Cách nó chạy được script Roblox trên máy thường

| File | Vai trò |
|---|---|
| `tests/run.js` | Driver Node. Nạp `wasmoon` (Lua 5.4 biên dịch sang WASM), dựng môi trường, nạp script, chạy các file test. |
| `tests/roblox-mock.lua` | Môi trường giả lập: `game`/`Enum`/`Instance`/`Color3`/`UDim2`/`TweenService`/`Players`/`HttpService`/`TeleportService`, các global của executor (`gethui`, `writefile`, `readfile`, `setclipboard`…), `task.*` chạy trên coroutine, và JSON encode/decode thật. |
| `tests/test-*.lua` | Các test, chạy **trong cùng một máy ảo** ngay sau khi script đã nạp. |

Hai điểm kỹ thuật đáng chú ý:

- **Luau → Lua 5.4.** Script viết bằng Luau nên có phép gán ghép `x += 1`. Driver desugar
  22 chỗ thành `x = x + 1` trước khi nạp (đã kiểm tra: không chuỗi/ghi chú nào chứa `+=`).
- **Chạm vào biến local của main chunk.** `S`, `D`, `C`, `Store`, `scripts`… đều là local.
  Driver **nối thêm** một khối `_G.__T = {…}` vào *bản nạp trong bộ nhớ* — **file
  `script.js` không bị sửa**.

## Các nhóm test

| File | Kiểm tra |
|---|---|
| `test-00-probe.lua` | Test thật sự chạm được vào nội tại của script (không phải bản copy). |
| `test-01-store.lua` | Lớp lưu trữ: serialize, ghi/đọc xuống đĩa, debounce, và **hub có nói thật về việc dữ liệu có nằm trên đĩa không**. |
| `test-02-normalize.lua` | `S.NormalizeRunnable` (dán link kiểu gì cũng chạy được) và `S.SanitizeCode` (cắt wrapper đời cũ). |
| `test-03-compat.lua` | Lớp tương thích executor: bù hàm thiếu nhưng **không bao giờ đè hàm thật**, ổ đĩa ảo, `CompatRequest`, `Drawing`. |
| `test-04-ui.lua` | Bất biến giao diện: số trang, thứ tự rail, trang tạo trễ, đồng bộ công tắc, bất biến hover. |
| `test-05-servers.lua` | Nhóm 🌐 SERVER: `FetchServers`/`HopServer`/`JoinServer`/`ResetServer` với HTTP giả, kể cả khi API trả về rác. |
| `test-06-contrast.lua` | Tương phản chữ/nền theo **WCAG thật** (sRGB tuyến tính hoá) + chống hồi quy so với bảng màu v4.8. |
| `test-07-savenames.lua` | Nút 💾 Lưu: trùng tên tự đánh số, không ghi đè, không lưu script rỗng, ghi xuống đĩa. |
| `test-08-settings.lua` | Trang ⚙️ Thiết Lập: nói thật về lưu trữ, xuất/nhập JSON, xoá sạch có xác nhận 2 bước. |
| `test-09-optimize.lua` | Tối ưu v4.12: `S.UniqueName`, biến che trong `S.CompatDrawing`, HopServer không còn chặn UI thread. |

## Guard tĩnh (trong `run.js`)

Bốn kiểm tra đọc thẳng `script.js` để chặn thói quen xấu quay lại — thứ test runtime không
thấy được (ví dụ ai đó chép lại vòng lặp dò tên trùng):

1. Không còn vòng lặp `while true do … ipairs(scripts) …` dò tên trùng viết tay.
2. `S.UniqueName` được gọi ở đủ 5 chỗ lưu tên.
3. Hằng số chết `S.WRAP_MARK_NEW` không quay lại.
4. `S.CompatDrawing` không dùng biến cục bộ tên `D` (che khuất bảng thiết kế).

Các guard này **đã được kiểm chứng là bắt được lỗi**: cố tình chép lại vòng lặp và đổi
`local Draw` về `local D` thì 3/4 guard báo đỏ, khôi phục thì xanh lại.

## Tối ưu ở v4.12 (không thêm/bớt tính năng)

| Vấn đề | Trước | Sau |
|---|---|---|
| Dò tên trùng khi lưu | 5 chỗ **chép tay** cùng một vòng lặp lồng nhau, mỗi lần lưu duyệt lại toàn bộ danh sách → O(n²), quy ước đánh số nhân bản 5 lần | 1 hàm `S.UniqueName()` dùng bảng tra → O(n) một lần, quy ước chỉ còn ở **một** nơi |
| Bấm 🔀 Hop Server | Gọi thẳng trong handler nút; `S.HopServer` lật tối đa 3 trang, **mỗi trang một HttpGet chặn** → UI đơ vài giây, người dùng tưởng hub chết | Đẩy sang luồng riêng (kiểu nhánh `reload`), trả về ngay; `S.HopServer` **vẫn** đồng bộ + trả chuỗi nên chỗ gọi khác không đổi |
| `S.CompatDrawing()` | `local D = {}` **trùng tên** bảng `D` của hệ thiết kế → bên trong hàm không gọi được `D.Shade`/`D.BestText`… | Đổi thành `local Draw` |
| `S.WRAP_MARK_NEW` | Khai báo nhưng không nơi nào đọc (dễ tưởng là đang dùng) | Đã bỏ, có ghi chú tại chỗ |

## 3 lỗi mà bộ test này đã bắt được (đã sửa ở v4.11)

1. **`D.SyncPageChips()` chết âm thầm.** Hàm nằm ở dòng ~1152 nhưng `local S` khai báo ở
   dòng ~1336. Trong Lua, closure chỉ bắt được local **đã khai báo trước nó**, nên `S`
   trong hàm là *global nil* → hàm chết ngay dòng đầu, và `pcall` nuốt mất lỗi. Hệ quả:
   3 công tắc trên header không bao giờ được đồng bộ lúc khởi động.

2. **`Store.canWrite()` báo sai.** Chỉ kiểm tra `type(writefile) == "function"`. Khi executor
   thiếu `writefile`, hub tự bù hàm ghi vào **ổ đĩa ảo trong RAM** → `canWrite()` vẫn true →
   `Store.mode = "file"` → nhãn hiện **xanh** "đã ghi xuống đĩa" trong khi rejoin là mất sạch.

3. **Chữ trắng trên nền RED/PINK** chỉ đạt 2.77:1 và 2.65:1 theo WCAG.

## Thêm test mới

Tạo `tests/test-<số>-<tên>.lua`. File test phải **trả về một mảng** các phần tử
`{name = "…", ok = true/false, err = "…"}`; helper `chk(name, fn)` trong mỗi file đã làm
việc đó. Truy cập nội tại script qua `_G.__T` (xem `tests/run.js` để biết những gì đã được
nối ra).

> **Lưu ý khi viết test:** nếu một hàm trong script được bọc `pcall`, lỗi bên trong sẽ bị
> nuốt và test chỉ thấy "không có gì thay đổi". Muốn thấy lỗi thật thì nối đoạn debug vào
> **cuối main chunk** (nơi mọi local còn sống), đừng gọi từ một chunk riêng.
