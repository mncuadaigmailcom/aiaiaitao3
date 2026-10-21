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
- Phát hiện nhanh qua `Workspace.DescendantAdded`: vật mới được đưa vào hàng đợi
  ưu tiên, xử lý ở Heartbeat tiếp theo thay vì đợi hết vòng quét toàn map.
- Hiện dần kết quả ngay trong lúc quét. Quét dự phòng và nút Quét lại vẫn được giữ.
- Ngân sách mặc định 300 nút hoặc khoảng 2 ms cho phần quét, 32 sự kiện hoặc khoảng
  1 ms cho hàng đợi mỗi Heartbeat; đây là ngân sách hợp tác, không phải hard realtime.
- Tạo tối đa 8 marker mỗi Heartbeat, tối đa 50 marker đang hoạt động. Hàng đợi tối đa
  2.048 mục có chống trùng; khi tràn sẽ yêu cầu quét dự phòng thay vì tăng RAM vô hạn.
- Cache tên chuẩn hóa, tra alias chính xác qua bảng hash và lấy danh sách nhân vật
  theo nhịp cập nhật, không gọi GetPlayers cho từng nút của map.
- Bấm **🔒** để mở khóa kéo thanh tiêu đề (**🔓**); mặc định khóa như bản chính.
- Bốn nút góc để resize; tự co theo viewport nhỏ, chặn menu bị kéo mất khỏi màn hình.
- **X**: chỉ ẩn menu, vẫn định vị, giống bản chính. Nút nổi góc dưới phải để mở lại.
- **RightControl**: ẩn/hiện (bỏ qua nếu input đã được game xử lý).
- **Dừng & thoát** ở cuối card: dừng hoàn toàn, ngắt kết nối và xóa GUI/marker.
- Nạp lại cùng file sẽ dừng bản cũ qua BindableEvent trước khi tạo bản mới.

Không mang theo bay tới vật, teleport, noclip, AntiBan, phân tích trang phục,
chạy script ngoài hoặc lưu preset xuống file. Từ khóa/cấu hình chỉ tồn tại trong
phiên chạy; đây là bản chỉ định vị.

## Cảnh báo đang hiện diện — một ô cố định, chỉ 4 loại

**Rush, Ambush, Seek và Screech** có cảnh báo hiện diện. Whitelist cảnh báo
độc lập với 23 preset định vị cũ: Eyes/Figure và các vật thể khác không được đưa
vào ô cảnh báo này.

- Mặc định **Cảnh báo: BẬT** ở header tab Người Chơi; có thể tắt/bật riêng.
- Chỉ có **một hình chữ nhật 280 × 66** ở góc trên bên phải. Kích thước ô và layer
  không đổi theo số thực thể. Không còn nhiều ô xếp dọc hoặc thanh đếm ngược.
- Ví dụ hai thực thể cùng xuất hiện, phần nội dung chung sẽ có hai dòng:

  ```text
  Rush: 18.0 stud
  Ambush: 42.0 stud
  ```

- Chữ tự nhỏ lại theo số dòng, có TextScaled/UITextSizeConstraint để vừa ô.
  Khi một thực thể rời đi, chỉ bỏ dòng đó, chữ tự lớn lại nhưng ô không đổi kích thước.
- **Không còn tự ẩn sau 5 giây.** Ô hiện miễn là còn ít nhất một thực thể đang được
  theo dõi. Chỉ ẩn khi thực thể cuối cùng biến mất khỏi Workspace phía client,
  không còn BasePart đại diện hợp lệ hoặc không còn thuộc whitelist.
- Nếu hai instance cùng loại (ví dụ hai Rush) còn tồn tại, hiển thị hai dòng khoảng
  cách riêng, không thay thế instance cũ bằng instance mới.
- Khoảng cách cập nhật mỗi Heartbeat, tính tới **Head** của nhân vật bạn; dự phòng
  HumanoidRootPart nếu chưa có Head, không dùng camera giả làm vị trí nhân vật.
  Nếu chưa có nhân vật, vẫn giữ tên thực thể và báo chưa có vị trí nhân vật.
- Một instance không bị thêm trùng vì nhiều part/effect con hoặc alias trùng.
  Model rỗng có thể được nhận khi part đến sau. Nếu instance rời Workspace rồi
  trở lại sau khi đã được bỏ khỏi danh sách, có thể theo dõi lại instance đó.
- Ô chỉ co theo viewport nhỏ, không co/giãn vì thêm thực thể. X/RightControl chỉ
  ẩn menu, không ẩn cảnh báo. Tắt ESP/không chọn preset cũng không tắt cảnh báo riêng.
- `Dừng & thoát`, hủy GUI hoặc nạp lại sẽ dọn cả ô và queue cảnh báo.
- “Biến mất” được xác định bằng dữ liệu client: rời Workspace, bị Destroy hoặc
  mất toàn bộ part có thể định vị. Không có nghĩa là rời màn hình/đứng sau tường;
  script không suy đoán việc game chỉ làm trong suốt hay giấu một Model còn tồn tại.
- Sally và toàn bộ alias `Sally`, `Window`, `WindowEntity`, `Sally (Window)`
  đã được bỏ khỏi cảnh báo. Preset ESP Sally (Window) vẫn giữ nguyên.
- Alias vẫn là gợi ý theo tên, chưa xác minh tên/đường dẫn thực tế trong game đích bằng Roblox thật.
- Chỉ nhận các sự kiện xuất hiện sau khi listener hoạt động, không quét toàn map
  riêng để báo lại mọi thực thể có sẵn. Thực thể chỉ ở server hoặc hiệu ứng không
  có BasePart phía client không thể đo khoảng cách bằng cách này.

Queue chống trùng, lọc tên trước khi enqueue để cảnh vật bình thường không chiếm
chỗ, giới hạn 256 mục và xử lý tối đa 32 mục/khoảng 1 ms mỗi Heartbeat. Đây là
ngân sách hợp tác, không phải cam kết FPS/độ trễ trong engine thật.

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
- Kết quả đầu tiên hiện dần khi tìm thấy; nhóm gần nhất hoàn thiện sau mỗi vòng quét.
  Mục đã thấy không bị xóa nhấp nháy chỉ vì vòng quét kế tiếp chưa đi tới nó.
- Khoảng cách/XYZ cập nhật khoảng 0,05 giây; GUI danh sách khoảng 0,10 giây.
  Đây là nhịp lập lịch, không phải số đo độ trễ hay FPS trong Roblox thật.
- Thực thể spawn trong hàng đợi nhẹ có thể được nhận ở Heartbeat kế tiếp;
  khi spawn hàng loạt hoặc map lớn, xử lý vẫn được chia ra nhiều nhịp để giảm giật.
- Quét dự phòng vẫn chạy theo chu kỳ 1 giây (mỗi vòng có thể kéo dài nhiều frame),
  để bắt đổi tên, sửa path, dịch chuyển vào vùng khoảng cách hoặc sự kiện bị bỏ lỡ.
  Đổi tên tổ tiên của path được sửa ở vòng quét sau; không gắn listener lên mọi instance.

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
- **73 test core: đạt.** Tên/path/tiếng Việt, query chỉ có path, path xuất hiện trễ,
  query rỗng, đổi query giữa vòng quét, người chơi respawn, xóa/reparent vật,
  PrimaryPart bị xóa, khoảng cách không hợp lệ, mất vị trí gốc, gộp Model,
  ngân sách quét, giữ 50 vật gần nhất trong fixture 1.000 vật, dừng/idempotent destroy.
  Thêm kiểm tra đủ 23 preset và mọi alias cấu hình, so khớp exact, công tắc độc lập,
  preset xuất hiện trễ, batch bật/tắt, phối hợp bộ lọc thủ công, và ẩn riêng vật trùng tên.
  Thêm 13 ca chống chậm: kết quả trước khi quét xong, event chen trước quét nền,
  Model nhận part trễ, chống event trùng, giới hạn queue/quota/thời gian/tạo marker,
  không mất event khi kết thúc quét, xóa queue khi tắt, cache nhân vật và tên,
  và bảo toàn loại trừ nhân vật/effect trong đường xử lý nhanh.
  Có 18 ca cảnh báo: whitelist đúng bốn loại, ESP tắt vẫn cảnh báo, còn hiện diện
  sau 5/60 giây, chống trùng part con, hai instance cùng loại, loại bỏ từng thực thể,
  khoảng cách/mất nhân vật, despawn, Model nhận part trễ, công tắc/queue/loại trừ nhân vật,
  cùng instance rời rồi trở lại, mất toàn bộ part/thay part, đổi tên ngoài whitelist,
  và loại trừ mọi alias Sally khỏi cảnh báo nhưng vẫn giữ preset ESP Sally.
- **31 test tích hợp GUI/mock: đạt.** Boot không có executor, Enter, marker,
  switch hiển thị, chọn kết quả, vật trùng tên được thay mới, X/nút nổi, bật/tắt,
  khóa kéo/co GUI, chỉ một tab/card, palette/header NOIR, cả bốn góc resize,
  RightControl, nút Tắt/Bật từng dòng, nhảy tới danh sách hỗ trợ, các công tắc preset,
  batch bật/tắt, phối hợp manual/preset, xóa hết, marker từ sự kiện spawn thật của mock
  xuất hiện sau một Heartbeat mô phỏng, nạp lại, Dừng & thoát và GUI bị hủy từ bên ngoài.
  Có kiểm tra listener DescendantAdded không bị nhân đôi và được ngắt khi thoát.
  Có 9 ca GUI cảnh báo: ô cố định góc phải, hai/ba thực thể chung ô và chỉ thu nhỏ chữ,
  không hết hạn sau 5 giây, xóa từng dòng/lớn chữ lại, ẩn sau khi thực thể cuối rời đi,
  whitelist/công tắc riêng, bốn loại trên màn hình nhỏ, Head/root/mất nhân vật,
  và hai instance cùng loại có khoảng cách riêng. Reload kiểm tra ô cũ bị hủy.
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

### Đo bản nhanh trong Studio

Chọn Rush, hoàn tất quét ban đầu, rồi tạo Model `RushMoving` ở phía client và
thêm một Part vào nó. Kiểm tra marker được cập nhật mà không cần bấm Quét lại.
Thử thêm 1.000 part trang trí cùng lúc và dùng MicroProfiler/Output để kiểm tra
độ trễ và chi phí thực tế. Mốc “một Heartbeat” trong test là kết quả mô phỏng
cho hàng đợi nhỏ, không phải cam kết tốc độ trên thiết bị/game thật.

### Kiểm tra cảnh báo trong Studio

Tắt ESP, giữ Cảnh báo BẬT. Tạo một Part `Rush`, sau đó thêm `Ambush` và `Seek`;
xác nhận vẫn chỉ một ô, kích thước không đổi, có đủ tên/khoảng cách và chữ nhỏ lại.
Chờ hơn 5 giây: ô vẫn phải hiện. Xóa từng Part: chỉ dòng tương ứng biến mất;
xóa Part cuối: ô ẩn. Thử hai Rush, Screech, Sally/Window/Eyes (không cảnh báo), Model
rỗng nhận part trễ, di chuyển Head, mất nhân vật, màn hình nhỏ và thoát/nạp lại.
Test mock kiểm tra logic/cấu hình layout, không thay thế đo text rendering hoặc
xác minh thực thể thật trong Roblox Studio.
