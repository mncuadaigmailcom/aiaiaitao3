# Định vị vật thể — bản độc lập

**File dùng trực tiếp:** [`object-tracker.luau`](object-tracker.luau).

Được viết lại và tách biệt từ ý tưởng/chức năng `S.ObjTrack` trong tab Người Chơi
của `script.js`. Không cần nạp hub gốc. Không sửa `script.js`.

## Cài trong game của bạn

1. Mở Roblox Studio → `StarterPlayer` → `StarterPlayerScripts`.
2. Thêm một **LocalScript**, ví dụ `ObjectTracker` (RunContext mặc định/Legacy).
3. Dán toàn bộ `standalone/object-tracker.luau` vào LocalScript đó.
4. Bấm **Play**, không phải Run ở phía server.
5. Nhập tên vật rồi Enter hoặc bấm **Định vị: TẮT** để bật.

Không cần executor, `loadstring`, HTTP, hook, remote hoặc script server.
Rojo mapping hiện tại của repo không tự cài file này; hãy cài thủ công như trên.

## Chức năng

- Tìm tên chứa từ khóa; không phân biệt hoa/thường và dấu tiếng Việt.
- Nhiều tên cách nhau bằng `,`, `;` hoặc xuống dòng: `cây, đá; rương`.
- Tìm chính xác bằng path: `Workspace.Map.Chest`, `game.Workspace.Map.Chest`,
  hoặc `Workspace/Map/Chest`. Path không tồn tại không được tự đổi thành tìm tên rộng.
- Path được đối chiếu lại ở mỗi vòng quét, nên vẫn tìm được mục xuất hiện trễ.
- Hỗ trợ `BasePart`, `Model`, `Folder` có part bên trong.
- Một Model khớp được coi là một nhóm; không tiếp tục tạo marker riêng cho các con.
  Folder khớp dùng một part đại diện và vẫn duyệt các con.
- Highlight, hộp quanh part đại diện, nhãn tên/khoảng cách/XYZ, đổi màu,
  bật/tắt xuyên tường và bỏ qua nhân vật người chơi.
- Danh sách kết quả; bấm một dòng để xem path và XYZ trong ô có thể chọn/copy.
- Giới hạn khoảng cách: **stud**, `0` là không giới hạn. Không ghi nhầm đơn vị mét.
- Giữ tối đa **50 vật gần nhất**; thống kê số khớp có thể lớn hơn 50.
- Quét lại tự động và thủ công. Ngân sách mặc định 150 nút hoặc khoảng 2 ms mỗi
  callback; đây là ngân sách hợp tác, không phải bảo đảm hard realtime.
- Kéo thanh tiêu đề, tự co theo viewport nhỏ, chặn menu bị kéo mất khỏi màn hình.
- `_`: thu nhỏ, vẫn định vị. **RightControl**: ẩn/hiện.
- **X**: dừng hoàn toàn, ngắt kết nối và xóa GUI/marker.
- Nạp lại cùng file sẽ dừng bản cũ qua BindableEvent trước khi tạo bản mới.

Không mang theo bay tới vật, teleport, noclip, AntiBan, phân tích trang phục,
chạy script ngoài hoặc lưu preset xuống file. Từ khóa/cấu hình chỉ tồn tại trong
phiên chạy; đây là bản chỉ định vị.

## Chi tiết và giới hạn

- Chỉ đọc các đối tượng client nhìn thấy trong Workspace. Với StreamingEnabled,
  đối tượng chưa stream tới client không thể được script tìm thấy.
- Khoảng cách của Model/Folder tính tới PrimaryPart hợp lệ hoặc part đại diện,
  không phải tâm hình học. Khi không có nhân vật, dùng vị trí camera; nếu không
  có cả camera, hiển thị `?`, không giả khoảng cách bằng 0.
- Path dùng dấu chấm/slash làm phân cách; tên vật có các dấu này nên được đổi
  tên hoặc tìm bằng một từ khóa tên không chứa dấu phân cách.
- Highlight/hộp có thể chịu giới hạn render của Roblox; test mock không chứng
  minh rằng tất cả highlight hiển thị đúng trong engine thật.
- `GetChildren()` và tìm part đại diện là các lệnh native không thể ngắt giữa
  chừng; cây rất rộng/model rất lớn vẫn cần đo trong Studio. Không công bố FPS/RAM.
- Danh sách ưu tiên gần nhất cập nhật sau mỗi vòng quét; khoảng cách/XYZ cập nhật
  khoảng 0,15 giây, GUI danh sách khoảng 0,25 giây. Không cam kết tức thời.

## Test tự động

```bash
npm install
npm run test:object-tracker
npm run check
```

Bộ test mới lấy **nguyên core từ file bàn giao**, không chép một bản logic khác
để test. Sau đó nạp **toàn bộ script** với mock Roblox API để test GUI/lifecycle.
`npm run check` đã được thêm bộ test này sau các kiểm tra hiện có.

Kết quả trong sandbox:

- Kiểm tra cú pháp toàn file: đạt trên parser Lua 5.3 (mã dùng tập con tương thích Luau).
- **33 test core: đạt.** Tên/path/tiếng Việt, query chỉ có path, path xuất hiện trễ,
  query rỗng, đổi query giữa vòng quét, người chơi respawn, xóa/reparent vật,
  PrimaryPart bị xóa, khoảng cách không hợp lệ, mất vị trí gốc, gộp Model,
  ngân sách quét, giữ 50 vật gần nhất trong fixture 1.000 vật, dừng/idempotent destroy.
- **12 test tích hợp GUI/mock: đạt.** Boot không có executor, Enter, marker,
  switch hiển thị, chọn kết quả, vật trùng tên được thay mới, thu nhỏ, bật/tắt,
  kéo/co GUI, nạp lại, nút X và GUI bị hủy từ bên ngoài.
- **115 test cũ của dự án: đạt**, không bị thay thế bởi bộ test mới.

**Chưa chạy trong Roblox Studio/game thật.** Fengari + mock chỉ kiểm chứng logic
và lời gọi API theo mô hình test, không xác nhận engine, hình ảnh GUI,
hiệu năng thật hoặc hành vi trên thiết bị cảm ứng thật.

## Checklist cần chạy trong Studio

1. Tạo `Workspace.Map.Chest` là Part, một Model có nhiều part và một Folder có part.
2. Tìm tên, nhiều tên, path-only; kiểm tra highlight/box/occlusion bằng mắt.
3. Đổi tên, di chuyển, xóa, tạo lại cùng tên và respawn nhân vật.
4. Đặt khoảng cách `0`, `20`, chuỗi không phải số và số âm.
5. Dùng Device Emulator cho màn hình nhỏ; kéo bằng chuột và cảm ứng.
6. Thu nhỏ, nạp lại và bấm X; xác nhận `ObjectTrackerLocalEffects` được xóa,
   không còn callback từ bản cũ hoặc thông báo lỗi trong Output.
7. Thử map lớn/StreamingEnabled và đo bằng MicroProfiler trước khi sử dụng rộng rãi.
