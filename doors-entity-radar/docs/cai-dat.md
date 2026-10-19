# Cài đặt — Doors Entity Radar

Có **hai** cách cài. Chọn một. Cách A nhanh nhất; cách B dễ sửa mã nguồn hơn.

---

## Cách A — một tệp (khuyến nghị)

### A1. Sinh tệp bundle

```bash
cd doors-entity-radar
npm run build
```

Kết quả: `bundle/doors-entity-radar.luau` (23 module được nhúng nguyên văn, ~291 KB).

### A2. Đặt vào Studio

| Bước | Thao tác |
| --- | --- |
| 1 | Mở game **bạn sở hữu** trong Roblox Studio (phải là chế độ Edit, không phải Team Test của người khác) |
| 2 | Explorer → `StarterPlayer` → `StarterPlayerScripts` |
| 3 | Chuột phải → **Insert Object** → **LocalScript** |
| 4 | Đổi tên thành `DoorsEntityRadar` (chỉ để dễ nhìn) |
| 5 | Mở `bundle/doors-entity-radar.luau` bằng trình soạn thảo, chọn toàn bộ, copy |
| 6 | Dán vào LocalScript vừa tạo (thay hết nội dung mặc định) |
| 7 | Bấm **Play** |

**Vị trí duy nhất:** `StarterPlayer > StarterPlayerScripts`. Không cần tạo Folder,
không cần ReplicatedStorage, không cần Rojo — bundle tự cài bộ nạp
`_G.__DER_REQUIRE` của riêng nó.

### A3. Kiểm tra sau khi cài (30 giây)

Trong Output (`View > Output`), bạn phải thấy các dòng có tiền tố `[DER]`:

```
[DER] [INFO] Khởi động DOORS Entity Radar v1.0.0
[DER] [INFO] Dùng bộ nạp của bundle.
[DER] [INFO] Bản chất hệ thống: Bảng thông tin/danh mục và định vị THỤ ĐỘNG ...
[DER] [INFO] Sẵn sàng: Hệ thống đang chạy. Tự kiểm tra: ĐẠT — 16 hạng mục, 0 lỗi, N cảnh báo.
```

(Số hạng mục/cảnh báo có thể khác trên máy bạn; điều quan trọng là `0 lỗi`.)

Nếu thấy `[DER] [WARN]` hay `[DER] [ERROR]` thì **đọc đúng dòng đó** — nó nói rõ
thiếu cái gì (ví dụ chưa có nhân vật, không đọc được camera).

### A4. Giới hạn của cách A

`Server/Diagnostics.luau` **không chạy được** với bundle, vì nó cần cây module trong
`ReplicatedStorage.DoorsEntityRadar`. Muốn dùng script chẩn đoán phía server thì cài
cách B (hoặc chép tay `src/Shared/*` vào `ReplicatedStorage.DoorsEntityRadar.Shared`).

---

## Cách B — nhiều tệp (Rojo)

Dùng khi bạn muốn sửa từng module và đồng bộ bằng Rojo.

### B1. Ánh xạ

`default.project.json` đã map sẵn:

| Trong Studio | Lấy từ | Loại instance |
| --- | --- | --- |
| `ReplicatedStorage.DoorsEntityRadar.Shared` | `src/Shared` | Folder chứa ModuleScript |
| `ReplicatedStorage.DoorsEntityRadar.Client` | `src/Client` | Folder chứa ModuleScript |
| `ReplicatedStorage.DoorsEntityRadar.Server` | `src/Server` | Folder chứa ModuleScript |
| `StarterPlayer.StarterPlayerScripts.DoorsEntityRadar` | `bundle/doors-entity-radar.luau` | **LocalScript** |

```bash
npm run build       # dist phải tồn tại trước khi rojo serve
rojo serve
```

### B2. Nếu bạn muốn LocalScript là `src/Client/Bootstrap.luau` (không dùng bundle)

Sửa nút `StarterPlayerScripts` trong `default.project.json` thành:

```json
"DoorsEntityRadar": {
  "$className": "LocalScript",
  "$path": "src/Client/Bootstrap.luau"
}
```

`Bootstrap.luau` sẽ tự tìm `ReplicatedStorage.DoorsEntityRadar.Shared.RequireShim`,
cài bộ nạp, rồi `__DER_REQUIRE` các module còn lại từ cây instance. Nếu không thấy
thư mục đó, nó **in lỗi và dừng** chứ không chạy nửa vời:

```
[DER] Không khởi động được: Không thấy ReplicatedStorage.DoorsEntityRadar...
```

### B3. Bật script chẩn đoán phía server (tuỳ chọn)

1. `ServerScriptService` → Insert Object → **Folder** tên `DoorsEntityRadarServer`.
2. Trong folder đó → Insert Object → **Script** tên `Diagnostics`.
3. Dán nội dung `src/Server/Diagnostics.luau`.
4. Đổi dòng đầu `local ENABLED = false` thành `true`.

Mặc định nó **tắt**: chạy mà không bật thì chỉ in một dòng rồi `return`, không quét gì.

---

## Cấu hình trước khi chạy

Mở `src/Shared/Config.luau` (cách B) hoặc sửa ngay trong bundle (cách A — mọi thứ
nằm trong khối `["Shared/Config"]`).

| Muốn | Sửa |
| --- | --- |
| Không tự chạy khi vào game | `System.autoStart = false` |
| Đổi phím ẩn/hiện | `System.toggleKeyCode = "F2"` (tên `Enum.KeyCode`) |
| Đã xác minh tên instance nào đó | `Detection.confirmedPatterns = { "Rush", "Seek" }` |
| Thêm mẫu tên cho một mục | `Detection.extraPatterns = { rush = { "rushmoving" } }` |
| Ép một mục thành không hỗ trợ | `Detection.unsupported = { portrait = "Tranh tĩnh, không cần định vị" }` |
| Tắt một khối giao diện | `Ui.showSearch = false` (tương tự cho các khối khác) — hoặc tắt ngay trong tab **Cài đặt** |
| Đổi tab mở đầu | `Ui.defaultTab = "all"` (các id hợp lệ: `home`, `all`, `hotel`, `mines`, `backdoor`, `archives`, `outdoors`, `stairwell`, `rooms`, `events`, `selected`, `settings`, `log`) |
| Tắt thanh tab / kéo thả | `Ui.showTabs = false`, `Ui.enableDrag = false` |
| Mở bảng ở trạng thái thu nhỏ | `Ui.startMinimized = true` |
| Bộ lọc lựa chọn mặc định | `Ui.selectionFilter = "all"` (hoặc `"selected"`, `"unselected"`) |
| Tắt nhật ký theo dõi | `System.alertOnTrack = false` |
| Đổi số dòng tab Nhật ký | `Log.historySize = 60` |
| Giới hạn công việc quét | `Scan.maxDescendantsPerFullScan`, `Scan.descendantsPerStep` |

**Cấu hình sai thì hệ thống từ chối khởi động** và in rõ trường nào sai — không chạy
với giá trị lạ. Ví dụ `Scan.descendantsPerStep = 0` cho ra:

```
[DER] [ERROR] Cấu hình không hợp lệ, từ chối khởi động: Scan.descendantsPerStep phải >= 1, nhận 0
```

---

## Gỡ cài đặt

Xoá LocalScript `DoorsEntityRadar` (và folder `ReplicatedStorage.DoorsEntityRadar`
nếu có). Dự án **không** ghi gì vào `Workspace`, `Lighting`, `ReplicatedStorage`
(ngoài folder của chính nó ở cách B) hay thuộc tính của nhân vật, nên không còn gì
để dọn. Khi chạy, nó tự huỷ ScreenGui của mình lúc `Destroy()`.

## An toàn

- Không `loadstring`, không executor, không API ngoài Roblox.
- Chỉ **đọc** dữ liệu client được phép đọc: tên instance trong Workspace, vị trí
  nhân vật, `Camera.CFrame`.
- Không tạo RemoteEvent, không gửi gì lên server.
- Phím tắt luôn trả `Enum.ContextActionResult.PassThrough` — không nuốt phím của game
  (test `BOOT-004`).
