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

## Giao diện NOIR một tab

Menu dùng bảng màu nền tối/vàng của bản chính `script.js`, thanh tiêu đề
`taodepzai v5.0 NOIR`, nhãn phiên bản, thanh tab trái và header trang.
**Chỉ có một tab `Người Chơi`; trong đó chỉ có card `Định vị vật thể`.**
Không nạp hoặc ẩn các chức năng khác của hub: chúng không được đưa vào file này.

Kích thước mặc định 620 × 380; nội dung tab cuộn dọc để xem danh sách và chi tiết.
Bốn góc cho phép đổi kích thước trong khoảng 560–900 × 280–700; card tự co nếu cần.
Đây là bản tái tạo phong cách NOIR, không phải sao chép toàn bộ hub/hiệu ứng của bản gốc.

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
- Mỗi dòng có nút **Tắt/Bật** riêng: chỉ ẩn/hiện marker của đúng instance đó,
  không ảnh hưởng vật khác kể cả trùng tên. Dòng vẫn còn trong danh sách để bật lại.
- Danh sách thực thể hỗ trợ có công tắc từng mục, **Bật tất cả/Tắt tất cả**;
  bấm **Chọn thực thể ↓** hoặc cuộn xuống để mở phần này.
- Giới hạn khoảng cách: **stud**, `0` là không giới hạn. Không ghi nhầm đơn vị mét.
- Giữ tối đa **50 vật gần nhất**; thống kê số khớp có thể lớn hơn 50.
- Quét lại tự động và thủ công. Ngân sách mặc định 150 nút hoặc khoảng 2 ms mỗi
  callback; đây là ngân sách hợp tác, không phải bảo đảm hard realtime.
- Bấm **🔒** để mở khóa kéo thanh tiêu đề (**🔓**); mặc định khóa như bản chính.
- Bốn nút góc để resize; tự co theo viewport nhỏ, chặn menu bị kéo mất khỏi màn hình.
- **X**: chỉ ẩn menu, vẫn định vị, giống bản chính. Nút nổi góc dưới phải để mở lại.
- **RightControl**: ẩn/hiện (bỏ qua nếu input đã được game xử lý).
- **Dừng & thoát** ở cuối card: dừng hoàn toàn, ngắt kết nối và xóa GUI/marker.
- Nạp lại cùng file sẽ dừng bản cũ qua BindableEvent trước khi tạo bản mới.

Không mang theo bay tới vật, teleport, noclip, AntiBan, phân tích trang phục,
chạy script ngoài hoặc lưu preset xuống file. Từ khóa/cấu hình chỉ tồn tại trong
phiên chạy; đây là bản chỉ định vị.

## Danh sách thực thể hỗ trợ

Có đủ **23 mục** theo danh sách yêu cầu, mặc định đều TẮT:

Rush, Ambush, Eyes, Screech, Figure, Seek, Dupe, Halt, Hide, Timothy,
Sally (Window), Dread, Jeff, El Goblino, Bob, Jack, Moonlight, Weirdo,
Glitch, Void, Red Barrier, Snare, Fallen Chandeliers.

- Chọn một hay nhiều mục sẽ bật theo dõi, không cần nhập tên thủ công.
- Bỏ chọn mục cuối sẽ tắt định vị nếu ô tên/path cũng rỗng.
- **Định vị: BẬT/TẮT** là công tắc tổng: tắt tạm thời nhưng vẫn giữ lựa chọn.
- **Tắt tất cả mục hỗ trợ** chỉ bỏ bộ lọc preset; bộ lọc tên/path thủ công vẫn có tác dụng.
  Ví dụ bạn đã tự nhập `Rush` thì tắt preset Rush không hủy bộ lọc thủ công đó.
  Có thể dùng nút Tắt ở chính dòng kết quả để ẩn instance bất kể nguồn bộ lọc.
- **Xóa kết quả** xóa cả bộ lọc thủ công, lựa chọn preset và các override ẩn từng vật.
- Preset dùng tên chính xác (không phân biệt hoa/thường/dấu) và một số alias, ví dụ
  `RushMoving`, `AmbushMoving`, `FigureRig`, `RedBarrier`. Không dùng substring cho
  preset để tránh `Hide` bắt nhầm `HideSpot` hoặc `Bob` bắt nhầm `Bobblehead`.
- Catalog alias là dữ liệu gợi ý ở đầu `createTracker`, không phải tên nội bộ đã
  được xác nhận bằng game thật. Có thể sửa `aliases` hoặc dùng ô tên/path nếu game đổi tên.
- Script **không tạo/spawn thực thể** và không phát hiện được thực thể chỉ tồn tại
  phía server, đối tượng chưa stream tới client, hoặc hiệu ứng không có BasePart.
  Một tên thông dụng như `Window` có thể trùng cảnh vật: hãy kiểm tra path trong danh sách.
- Các công tắc chỉ điều khiển marker local, **không vô hiệu hóa thực thể/nguy hiểm**,
  không thay đổi hành vi của Rush/Ambush hay bảo vệ người chơi khỏi sát thương.

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
- **42 test core: đạt.** Tên/path/tiếng Việt, query chỉ có path, path xuất hiện trễ,
  query rỗng, đổi query giữa vòng quét, người chơi respawn, xóa/reparent vật,
  PrimaryPart bị xóa, khoảng cách không hợp lệ, mất vị trí gốc, gộp Model,
  ngân sách quét, giữ 50 vật gần nhất trong fixture 1.000 vật, dừng/idempotent destroy.
  Thêm kiểm tra đủ 23 preset và mọi alias cấu hình, so khớp exact, công tắc độc lập,
  preset xuất hiện trễ, batch bật/tắt, phối hợp bộ lọc thủ công, và ẩn riêng vật trùng tên.
- **21 test tích hợp GUI/mock: đạt.** Boot không có executor, Enter, marker,
  switch hiển thị, chọn kết quả, vật trùng tên được thay mới, X/nút nổi, bật/tắt,
  khóa kéo/co GUI, chỉ một tab/card, palette/header NOIR, cả bốn góc resize,
  RightControl, nút Tắt/Bật từng dòng, nhảy tới danh sách hỗ trợ, các công tắc preset,
  batch bật/tắt, phối hợp manual/preset, xóa hết, nạp lại, Dừng & thoát và GUI bị hủy từ bên ngoài.
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
6. Bấm X và nút nổi để ẩn/hiện: marker phải còn hoạt động. Thử khóa kéo và bốn góc resize.
7. Nạp lại rồi bấm **Dừng & thoát**; xác nhận `ObjectTrackerLocalEffects` được xóa,
   không còn callback từ bản cũ hoặc thông báo lỗi trong Output.
8. Thử map lớn/StreamingEnabled và đo bằng MicroProfiler trước khi sử dụng rộng rãi.

### Kiểm tra thêm cho danh sách hỗ trợ trong Studio

Tạo Model/Part giả lập theo các alias (không cần chạy game bên thứ ba), chọn
Rush/Ambush độc lập, bật/tắt từng dòng, thêm hai vật trùng tên và thử preset
xuất hiện trễ. Để xác nhận trong game đích, cần kiểm tra tên/path thực tế và
quyền truy cập của client; test mock hiện tại không chứng minh phát hiện đủ mọi thực thể.
