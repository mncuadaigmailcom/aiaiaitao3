# 5. Danh mục phương pháp và phân loại

> Tệp này được **sinh tự động** từ `src/Shared/Methods.luau`.
> Mọi con số và mọi dòng trong bảng đều lấy từ dữ liệu thật trong mã nguồn.

## 5.1 Cách đọc trạng thái

| Mã | Nghĩa | Điều kiện để được khai |
| -- | ----- | ---------------------- |
| **A** | Đã triển khai, có mã thật | Có tệp nguồn + marker `RALO.METHODS` khai id đó |
| **B** | Đã triển khai **và có test đang đạt** | Ngoài điều kiện của A, phải có một test khai id đó trong **tên test**, và test đó đạt |
| **C** | Đã triển khai nhưng chưa kiểm thử | Không có mục nào — xem giải thích ở 5.5 |
| **D** | Mới là đề xuất, **chưa có mã** | Không được trỏ vào tệp nguồn nào |
| **E** | Không áp dụng được trong phạm vi này | Không được trỏ vào tệp nguồn nào |

> **B ở đây nghĩa là "đã kiểm thử trong harness Lua", KHÔNG phải "đã chạy trong
> Roblox Studio".** Studio không có trong môi trường phát triển nên **không phương
> pháp nào đạt B trong game thật**. Xem [06-bao-cao-test-loi.md](06-bao-cao-test-loi.md).

Điều kiện trên được kiểm bằng máy, không bằng mắt: `node tools/verify-catalog.js`.
Trình kiểm này từ chối nếu một mục khai B mà không có test khai id, hoặc khai D/E
mà lại trỏ vào một tệp nguồn.

## 5.2 Số liệu thật

```
Tổng số phương pháp : 190
  A đã triển khai    : 51
  B có test đạt      : 90
  C chưa kiểm thử    : 0
  D đề xuất          : 38
  E không áp dụng    : 11
  triển khai thật    : 141 / 190
```

**Không kê cho đủ 160.** Thực tế có 190 mục, trong đó chỉ 141 mục có mã
thật. 38 mục là đề xuất (D) và 11 mục không áp dụng được (E) — tất cả đều liệt kê
công khai ở 5.4, không trộn vào số đã triển khai.

## 5.3 Phân bổ theo 30 nhóm

| # | Nhóm | Tổng | A | B | D | E |
| - | ---- | ---- | - | - | - | - |
| 1 | CPU và chi phí tính toán | 9 | 5 | 4 | 0 | 0 |
| 2 | Vòng lặp và công việc lặp lại | 8 | 2 | 6 | 0 | 0 |
| 3 | RAM và vòng đời đối tượng | 6 | 3 | 1 | 2 | 0 |
| 4 | Rò rỉ tài nguyên | 5 | 2 | 3 | 0 | 0 |
| 5 | FPS và khung hình | 5 | 2 | 2 | 0 | 1 |
| 6 | GPU và tải kết xuất | 5 | 1 | 1 | 2 | 1 |
| 7 | Giảm đồ hoạ mức nhẹ (đảo ngược được) | 5 | 0 | 3 | 1 | 1 |
| 8 | Part và Model | 6 | 2 | 0 | 4 | 0 |
| 9 | Va chạm và vật lý | 5 | 2 | 0 | 3 | 0 |
| 10 | Hạt và ánh sáng | 8 | 1 | 3 | 4 | 0 |
| 11 | Âm thanh | 4 | 0 | 0 | 3 | 1 |
| 12 | Giao diện (GUI) | 13 | 3 | 9 | 1 | 0 |
| 13 | Tác vụ nền | 6 | 4 | 2 | 0 | 0 |
| 14 | RemoteEvent và giao tiếp mạng | 7 | 4 | 0 | 1 | 2 |
| 15 | NPC và AI | 5 | 0 | 1 | 4 | 0 |
| 16 | Nạp và cache tài nguyên | 6 | 2 | 1 | 2 | 1 |
| 17 | Cấu trúc dữ liệu | 5 | 0 | 4 | 1 | 0 |
| 18 | Sự kiện và kết nối | 6 | 2 | 2 | 1 | 1 |
| 19 | Tìm kiếm trong Workspace | 6 | 1 | 4 | 1 | 0 |
| 20 | Tái sử dụng đối tượng (pooling) | 5 | 0 | 4 | 1 | 0 |
| 21 | Dữ liệu người chơi | 5 | 0 | 0 | 4 | 1 |
| 22 | Phát hiện tác vụ nặng | 6 | 5 | 0 | 0 | 1 |
| 23 | Đối tượng ở xa | 8 | 1 | 7 | 0 | 0 |
| 24 | Thiết bị cấu hình thấp | 6 | 0 | 4 | 1 | 1 |
| 25 | Đo lường và kiểm thử | 7 | 2 | 5 | 0 | 0 |
| 26 | Phục hồi lỗi và hoàn tác | 8 | 1 | 7 | 0 | 0 |
| 27 | Bật tắt tính năng | 6 | 0 | 5 | 1 | 0 |
| 28 | Quản lý tài nguyên tập trung | 6 | 4 | 2 | 0 | 0 |
| 29 | Khởi động | 5 | 2 | 2 | 1 | 0 |
| 30 | Tổng thể không phá gameplay | 8 | 0 | 8 | 0 | 0 |

## 5.4 Danh sách đầy đủ 190 phương pháp

### Nhóm 1 — CPU và chi phí tính toán

| ID | Tên | TT | Tệp chịu trách nhiệm | Nguyên nhân gây lag |
| -- | --- | -- | -------------------- | ------------------- |
| CPU-001 | Cache global thành upvalue | A | `src/Client/Core/Scheduler.luau` | Mỗi lần đọc global phải tra bảng _G qua metatable; trong vòng lặp nóng chi phí cộng dồn rất lớn. |
| CPU-002 | Cache kết quả GetService | A | `src/Client/Core/Env.luau`, `src/mọi module cần service.luau` | GetService là lời gọi xuyên biên giới Luau-C++; gọi lặp lại cho cùng một service là lãng phí thuần. |
| CPU-003 | Cache tham chiếu module | A | `src/Shared/RequireShim.luau` | require lặp lại đi qua cache của engine nhưng vẫn tốn một lời gọi hàm và tra bảng. |
| CPU-004 | Hoán vị biểu thức bất biến khỏi vòng lặp | B | `src/Client/Core/Cpu.luau` | Tính lại cùng một biểu thức hàng nghìn lần mỗi lượt quét là CPU thuần bị vứt đi. |
| CPU-005 | So sánh khoảng cách bằng bình phương | B | `src/Client/Core/Cpu.luau`, `src/Client/Core/Cull.luau` | Magnitude gọi sqrt; với hàng trăm đối tượng mỗi lượt quét thì sqrt là phần đắt nhất. |
| CPU-006 | Tiền cấp phát bảng | A | `src/Client/Core/Perf.luau`, `src/Client/Optimizations/Scan.luau` | Bảng Lua tăng dung lượng theo cấp số nhân, mỗi lần tăng là một lần cấp phát lại và sao chép. |
| CPU-007 | Dùng hằng cho khoá chuỗi lặp lại | A | `src/Client/Core/Cpu.luau` | Mỗi lần viết chuỗi là một lần tra/dựng khoá; lặp lại ở nhiều chỗ dễ gõ sai tên property. |
| CPU-008 | Không để lỗi thoát ra khỏi tác vụ | B | `src/Client/Core/Guard.luau`, `src/Client/Core/Scheduler.luau` | Một property bị khoá làm throw; không pcall thì toàn bộ pipeline chết giữa chừng và mất luôn khả năng khôi phục. |
| CPU-009 | Ngân sách thời gian mỗi khung hình | B | `src/Client/Core/Scheduler.luau` | Công cụ tối ưu mà chiếm quá nhiều thời gian khung hình thì chính nó thành nguồn lag. |

### Nhóm 2 — Vòng lặp và công việc lặp lại

| ID | Tên | TT | Tệp chịu trách nhiệm | Nguyên nhân gây lag |
| -- | --- | -- | -------------------- | ------------------- |
| LOOP-001 | Một kết nối Heartbeat cho mọi tác vụ định kỳ | B | `src/Client/Core/Scheduler.luau` | Mỗi module tự Connect => N lần gọi lại mỗi khung hình, không ai kiểm soát tổng chi phí. |
| LOOP-002 | Ưu tiên tác vụ | B | `src/Client/Core/Scheduler.luau` | Khi vượt ngân sách khung hình, phải biết bỏ việc gì trước. |
| LOOP-003 | Chu kỳ riêng cho từng tác vụ | B | `src/Client/Core/Scheduler.luau` | Việc chỉ cần chạy 4 lần/giây mà chạy 60 lần/giây là lãng phí 15 lần. |
| LOOP-004 | Huỷ tác vụ bằng handle | B | `src/Client/Core/Scheduler.luau` | Thread/vòng lặp không huỷ được là nguồn rò rỉ CPU kinh điển. |
| LOOP-005 | Không trì hoãn tác vụ để làm đẹp GUI | B | `src/Client/Core/Pipeline.luau`, `src/Client/Ui/Notifier.luau` | Yêu cầu: không được tạo cảm giác giả đang xử lý. |
| LOOP-006 | Thích ứng theo deltaTime | A | `src/Client/Core/Scheduler.luau` | Máy yếu chạy 30 FPS thì logic gắn với số khung hình sẽ chạy chậm gấp đôi. |
| LOOP-007 | Đọc độ dài mảng một lần | B | `src/Client/Core/Cpu.luau` | Toán tử # trên bảng có phần mảng lớn không miễn phí; gọi mỗi lượt lặp là thừa. |
| LOOP-008 | Giảm tần suất RenderStepped | A | `src/Client/Core/Scheduler.luau` | Một số logic không cần độ phân giải khung hình đầy đủ. |

### Nhóm 3 — RAM và vòng đời đối tượng

| ID | Tên | TT | Tệp chịu trách nhiệm | Nguyên nhân gây lag |
| -- | --- | -- | -------------------- | ------------------- |
| RAM-001 | Bộ đệm vòng kích thước cố định | A | `src/Client/Core/Perf.luau` | Đo lâu mà danh sách mẫu cứ dài ra => RAM tăng đều, GC chạy nhiều hơn. |
| RAM-002 | Tái sử dụng bảng tạm | B | `src/Client/Core/Pool.luau` | Cấp phát bảng mới trong vòng lặp nóng là nguồn rác GC lớn nhất của script. |
| RAM-003 | Giới hạn bảng dữ liệu | A | `src/Shared/Log.luau`, `src/Client/Core/Guard.luau`, `src/Client/Core/Pool.luau`, `src/Client/Core/Cull.luau` | Bảng không trần chạy nhiều giờ sẽ chiếm bộ nhớ ngày càng lớn. |
| RAM-004 | Tránh closure trong vòng lặp nóng | A | `src/Client/Core/Scheduler.luau`, `src/Client/Core/Registry.luau` | Mỗi closure là một đối tượng mới + upvalue; tạo hàng nghìn cái mỗi giây ép GC. |
| RAM-005 | Giảm cấp phát chuỗi | D | `src/(một phần — đề xuất).luau` | Mỗi lần ghép chuỗi là một lần cấp phát. |
| RAM-006 | Tránh đóng gói nhiều giá trị trả về | D | `src/(đề xuất).luau` | Mỗi lần trả nhiều giá trị có chi phí stack. |

### Nhóm 4 — Rò rỉ tài nguyên

| ID | Tên | TT | Tệp chịu trách nhiệm | Nguyên nhân gây lag |
| -- | --- | -- | -------------------- | ------------------- |
| LEAK-001 | Sổ đăng ký kết nối tập trung | B | `src/Client/Core/Registry.luau` | Connection không Disconnect vẫn chạy sau khi đối tượng bị huỷ => CPU rò rỉ tăng dần. |
| LEAK-002 | Tự ngắt khi đối tượng bị huỷ | A | `src/Client/Core/Registry.luau` | Instance bị game Destroy nhưng callback vẫn giữ tham chiếu => vừa rò rỉ vừa lỗi tham chiếu. |
| LEAK-003 | Kết nối một lần | B | `src/Client/Core/Registry.luau` | Kết nối chỉ cần phản ứng một lần mà để mãi là rò rỉ. |
| LEAK-004 | Không tạo thread mỗi sự kiện | A | `src/Client/Core/Scheduler.luau` | Mỗi `task.spawn` trong handler sự kiện tạo một thread; sự kiện dày => thread chồng chất. |
| LEAK-005 | Sổ đăng ký instance do hệ thống tạo | B | `src/Client/Core/Registry.luau` | Instance tạo ra không ai giữ tham chiếu thì không dọn được, thành rác vĩnh viễn. |

### Nhóm 5 — FPS và khung hình

| ID | Tên | TT | Tệp chịu trách nhiệm | Nguyên nhân gây lag |
| -- | --- | -- | -------------------- | ------------------- |
| FPS-001 | Ngân sách khung hình cho chính công cụ | A | `src/Client/Core/Scheduler.luau` | Công cụ tối ưu chiếm khung hình thì FPS không tăng. |
| FPS-002 | Không ghi GUI mỗi khung hình | B | `src/Client/Ui/GuiPolicy.luau` | Ghi lại cùng giá trị vẫn làm engine đánh dấu bẩn và tính lại layout. |
| FPS-003 | Bỏ qua đối tượng ngoài vùng quan tâm | B | `src/Client/Core/Cull.luau` | Quét toàn bộ Workspace mỗi lượt là O(số instance của cả game). |
| FPS-004 | Ưu tiên việc hiển thị | A | `src/Client/Core/Scheduler.luau` | RenderStepped/Heartbeat có thời lượng cố định; việc nền không được tranh phần. |
| FPS-005 | Giới hạn FPS phía client | E | `src/(không áp dụng từ LocalScript).luau` | FPS vượt mức màn hình hiển thị là công sức bị vứt đi. |

### Nhóm 6 — GPU và tải kết xuất

| ID | Tên | TT | Tệp chịu trách nhiệm | Nguyên nhân gây lag |
| -- | --- | -- | -------------------- | ------------------- |
| GRAPHICS-001 | Hạ Lighting.QualityLevel nhẹ, có chặn an toàn | B | `src/Client/Optimizations/Graphics.luau` | Mức chất lượng cao có thể tăng chi phí render trên client. |
| GRAPHICS-002 | Tùy chọn khóa GraphicsQualityMode | A | `src/Client/Optimizations/Graphics.luau` | Engine có thể ghi đè QualityLevel nếu chế độ tự động bị khóa không đúng lúc. |
| GRAPHICS-005 | Giảm tầm PointLight/SpotLight | D | `src/(đề xuất).luau` | Mỗi đèn động buộc engine tính ánh sáng cho các part trong tầm. |
| GRAPHICS-006 | Giảm số lớp trong suốt chồng nhau | D | `src/(đề xuất).luau` | Overdraw là chi phí GPU điển hình; mỗi lớp trong suốt là một lần blend. |
| GRAPHICS-008 | Giảm số bóng đổ đồng thời | E | `src/(không khả dụng).luau` | Nhiều nguồn sáng động làm chi phí bóng tăng vọt. |

### Nhóm 7 — Giảm đồ hoạ mức nhẹ (đảo ngược được)

| ID | Tên | TT | Tệp chịu trách nhiệm | Nguyên nhân gây lag |
| -- | --- | -- | -------------------- | ------------------- |
| GRAPHICS-003 | Đặt Terrain.Decoration theo cấu hình | B | `src/Client/Optimizations/Graphics.luau` | Decoration có thể tạo thêm chi phí render ở cảnh nhiều chi tiết. |
| GRAPHICS-004 | Tắt bóng đổ cho đối tượng ở xa | B | `src/Client/Core/Cull.luau` | Shadow map là một trong những chi phí GPU lớn nhất; bóng của vật ở xa gần như vô hình. |
| GRAPHICS-007 | Giảm chất lượng phản chiếu/kính | D | `src/(đề xuất).luau` | Phản chiếu render cảnh thêm một lần. |
| GRAPHICS-009 | Không đổi vật liệu và màu sắc | B | `src/Shared/Safety.luau` | Đổi vật liệu làm thay đổi rõ rệt mỹ thuật, trái yêu cầu giữ nguyên hình ảnh. |
| GRAPHICS-010 | Không đổi khoảng cách hiển thị | E | `src/(không triển khai — có chủ đích).luau` | Yêu cầu: không tự ý thay đổi khoảng cách hiển thị. |

### Nhóm 8 — Part và Model

| ID | Tên | TT | Tệp chịu trách nhiệm | Nguyên nhân gây lag |
| -- | --- | -- | -------------------- | ------------------- |
| PART-001 | Neo part tĩnh không va chạm | D | `src/(đề xuất).luau` | Part không neo vẫn được engine xét trong bước mô phỏng vật lý. |
| PART-002 | Cull đối tượng xa theo đăng ký | A | `src/Client/Core/Cull.luau` | Part xa vẫn tốn chi phí bóng/hiệu ứng. |
| PART-003 | Gộp part tĩnh thành một mesh | D | `src/(đề xuất — làm trong Studio).luau` | Mỗi part là một draw call và một nút trong cây instance. |
| PART-004 | Tắt CastShadow cho part trang trí | A | `src/Client/Core/Cull.luau` | Bóng của part trang trí nhỏ thường không ai để ý. |
| PART-005 | Giảm độ chi tiết mesh ở xa (LOD) | D | `src/(đề xuất — làm trong Studio).luau` | Mesh hàng chục nghìn tam giác ở xa vẫn tốn đỉnh phải xử lý. |
| PART-006 | Giảm số lượng StreamingEnabled phụ | D | `src/(đề xuất — làm trong Studio).luau` | Giữ mọi model trong bộ nhớ tốn RAM. |

### Nhóm 9 — Va chạm và vật lý

| ID | Tên | TT | Tệp chịu trách nhiệm | Nguyên nhân gây lag |
| -- | --- | -- | -------------------- | ------------------- |
| PHYSICS-001 | Tắt làm mượt nội suy (tuỳ chọn, mặc định TẮT) | A | `src/Client/Optimizations/Physics.luau` | Nội suy vị trí vật thể từ xa tốn CPU đáng kể trên máy yếu. |
| PHYSICS-002 | Đổi PhysicsSteppingMethod (tuỳ chọn) | A | `src/Client/Optimizations/Physics.luau` | Phương pháp mặc định ưu tiên độ chính xác, tốn CPU hơn. |
| PHYSICS-003 | Tắt Touched không cần thiết | D | `src/(đề xuất).luau` | Mỗi kết nối Touched buộc engine kiểm tra va chạm mỗi bước. |
| PHYSICS-004 | Truy vấn vùng bằng API vật lý | D | `src/(đề xuất).luau` | Quét toàn cây để tìm vật gần là O(n) mỗi lần hỏi. |
| PHYSICS-005 | Tắt CanQuery/CanTouch cho part trang trí | D | `src/(đề xuất).luau` | Mỗi part có CanQuery/CanTouch đều tham gia truy vấn vật lý. |

### Nhóm 10 — Hạt và ánh sáng

| ID | Tên | TT | Tệp chịu trách nhiệm | Nguyên nhân gây lag |
| -- | --- | -- | -------------------- | ------------------- |
| FX-001 | Tắt emitter ở xa | B | `src/Client/Core/Cull.luau` | Emitter xa vẫn sinh hạt và vẫn được render dù chỉ vài pixel. |
| FX-002 | Tắt Beam/Trail ở xa | A | `src/Client/Core/Cull.luau` | Beam/Trail vẫn được tính và render khi ở xa. |
| FX-003 | Tắt đèn điểm ở xa | D | `src/(đề xuất).luau` | Đèn xa vẫn buộc engine tính ánh sáng. |
| EFFECTS-001 | Giới hạn Rate của emitter | B | `src/Client/Optimizations/Effects.luau` | Emitter cấu hình Rate vài trăm sinh rất nhiều hạt mỗi giây. |
| EFFECTS-002 | Giới hạn ParticleCount | B | `src/Client/Optimizations/Effects.luau` | Số hạt không trần có thể phình tới hàng nghìn, tốn cả CPU lẫn GPU. |
| EFFECTS-003 | Giảm kích thước hạt | D | `src/(đề xuất).luau` | Hạt to chiếm nhiều pixel, tăng chi phí fill-rate. |
| EFFECTS-004 | Giảm số emitter đồng thời | D | `src/(đề xuất).luau` | Nhiều emitter chạy cùng lúc cộng dồn chi phí. |
| EFFECTS-005 | Tắt hiệu ứng khi menu đang ẩn | D | `src/(đề xuất).luau` | Cập nhật thứ không ai nhìn là lãng phí. |

### Nhóm 11 — Âm thanh

| ID | Tên | TT | Tệp chịu trách nhiệm | Nguyên nhân gây lag |
| -- | --- | -- | -------------------- | ------------------- |
| AUDIO-001 | Dừng sound ở rất xa | D | `src/(đề xuất).luau` | Sound vẫn được giải mã và trộn kể cả khi gần như không nghe thấy. |
| AUDIO-002 | Tái sử dụng Sound | D | `src/(đề xuất — dùng Pool.Define).luau` | Tạo Sound mới mỗi lần phát tốn cấp phát và thời gian nạp. |
| AUDIO-003 | Giảm số sound phát đồng thời | D | `src/(đề xuất).luau` | Quá nhiều sound đồng thời tốn bộ trộn và bộ nhớ. |
| AUDIO-004 | Giảm chất lượng âm thanh | E | `src/(không áp dụng từ script).luau` | File lớn tốn bộ nhớ và thời gian giải mã. |

### Nhóm 12 — Giao diện (GUI)

| ID | Tên | TT | Tệp chịu trách nhiệm | Nguyên nhân gây lag |
| -- | --- | -- | -------------------- | ------------------- |
| GUI-001 | ResetOnSpawn = false | B | `src/Client/Ui/GuiPolicy.luau` | Mặc định ScreenGui bị reset khi respawn => dựng lại cây GUI và nối chồng connection. |
| GUI-002 | Một GUI duy nhất (singleton) | B | `src/Client/Ui/GuiPolicy.luau` | Chạy script hai lần tạo hai lớp GUI chồng nhau, vừa xấu vừa tốn. |
| GUI-003 | Dùng TweenService thay vì tự viết hoạt ảnh | A | `src/Client/Ui/Notifier.luau` | Tự cập nhật vị trí mỗi khung hình bằng RenderStepped tốn CPU và khó mượt. |
| GUI-004 | Chỉ ghi khi giá trị khác | B | `src/Client/Ui/GuiPolicy.luau` | Ghi trùng giá trị vẫn làm layout bẩn. |
| GUI-005 | Giữ cây GUI nhỏ | B | `src/Client/Ui/GuiPolicy.luau`, `src/tests/suites/gui.luau` | Mỗi GuiObject là một nút layout phải tính. |
| GUI-006 | Ngừng hoạt ảnh khi GUI ẩn | B | `src/Client/Ui/GuiPolicy.luau` | Hoạt ảnh của thứ không hiển thị là chi phí thuần lãng phí. |
| GUI-007 | Không tính lại layout mỗi khung hình | A | `src/Client/Ui/Notifier.luau` | Đọc/ghi kích thước mỗi frame gây layout thrash. |
| GUI-008 | Tránh AutomaticSize ở cây lớn | D | `src/(một phần — đề xuất hoàn thiện).luau` | AutomaticSize buộc engine đo lại toàn bộ cây con mỗi lần đổi. |
| GUI-009 | Tắt hoạt ảnh trên máy yếu | A | `src/Client/Ui/GuiPolicy.luau`, `src/Client/Core/Devices.luau` | Trên máy yếu, hoạt ảnh GUI cũng chiếm phần khung hình đáng kể. |
| GUI-010 | Không kéo GUI được | B | `src/Client/Ui/Notifier.luau` | Yêu cầu thiết kế: GUI thông báo không được di chuyển. |
| GUI-011 | Dọn GUI khi kết thúc | B | `src/Client/Ui/GuiPolicy.luau` | GUI còn lại sau khi ẩn vẫn chiếm node và connection. |
| GUI-012 | Không phát âm thanh thông báo | B | `src/Client/Ui/Notifier.luau` | Yêu cầu thiết kế: thông báo im lặng. |
| GUI-013 | Không dịch chuyển GUI khác | B | `src/Client/Ui/Notifier.luau` | Làm lệch GUI của game là phá trải nghiệm. |

### Nhóm 13 — Tác vụ nền

| ID | Tên | TT | Tệp chịu trách nhiệm | Nguyên nhân gây lag |
| -- | --- | -- | -------------------- | ------------------- |
| BG-001 | Bộ hẹn giờ tập trung | A | `src/Client/Core/Scheduler.luau` | Mỗi vòng lặp nền là một thread không ai quản lý. |
| BG-002 | Điều khiển bằng sự kiện thay vì polling | A | `src/Client/Core/Scheduler.luau`, `src/Client/Core/Registry.luau` | Polling tốn CPU ngay cả khi không có gì thay đổi. |
| BG-003 | Huỷ bộ hẹn giờ khi xong | B | `src/Client/Core/Scheduler.luau` | Task vô hạn không cần thiết chạy mãi sau khi việc đã xong. |
| BG-004 | Chu kỳ thích ứng theo tải | A | `src/Client/Core/Scheduler.luau` | Khi máy đang nặng, việc nền phải nhường. |
| BG-005 | Không spawn thread cho mỗi sự kiện | A | `src/Client/Core/Scheduler.luau` | Thread chồng chất khi sự kiện dày. |
| BG-006 | Không giữ vòng lặp khi không có việc | B | `src/Client/Core/Scheduler.luau` | Connection Heartbeat chạy không vẫn tốn một lời gọi mỗi khung hình. |

### Nhóm 14 — RemoteEvent và giao tiếp mạng

| ID | Tên | TT | Tệp chịu trách nhiệm | Nguyên nhân gây lag |
| -- | --- | -- | -------------------- | ------------------- |
| NET-001 | Throttle gửi lên server | A | `src/Client/Core/Net.luau` | Gửi mỗi khung hình tạo hàng chục gói tin mỗi giây không cần thiết. |
| NET-002 | Gộp nhiều thông điệp thành một gói | A | `src/Client/Core/Net.luau` | Mỗi FireServer là một gói tin + chi phí serialise riêng. |
| NET-003 | Chỉ gửi dữ liệu khác lần trước | A | `src/Client/Core/Net.luau` | Gửi lại trạng thái không đổi là băng thông thuần lãng phí. |
| NET-004 | Gửi dữ liệu nén | D | `src/(đề xuất).luau` | Chuỗi dài tốn byte serialise. |
| NET-005 | Giảm tần suất replicate từ server | E | `src/(không áp dụng được ở client).luau` | Replicate dày là nguồn băng thông lớn nhất. |
| NET-006 | Đặt NetworkOwner hợp lý | E | `src/(không áp dụng được ở client).luau` | Sai NetworkOwner gây giật và tốn băng thông. |
| NET-007 | Tránh gửi mỗi khung hình | A | `src/Client/Core/Net.luau` | Gửi dày là nguồn băng thông lớn. |

### Nhóm 15 — NPC và AI

| ID | Tên | TT | Tệp chịu trách nhiệm | Nguyên nhân gây lag |
| -- | --- | -- | -------------------- | ------------------- |
| NPC-001 | Lệch pha cập nhật NPC | D | `src/(đề xuất).luau` | Cả đàn NPC tính toán cùng một khung hình gây khựng định kỳ. |
| NPC-002 | Thưa tần suất tính đường | D | `src/(đề xuất).luau` | Pathfinding là một trong những tác vụ đắt nhất của NPC. |
| NPC-003 | Kiểm tra rẻ trước khi tìm đường đắt | B | `src/Client/Core/Spatial.luau` | Gọi Pathfinding cho mục tiêu không thể tới là lãng phí lớn. |
| NPC-004 | Ngừng cập nhật NPC ở xa | D | `src/(đề xuất).luau` | NPC ở xa vẫn tính AI đầy đủ là lãng phí lớn. |
| NPC-005 | Dùng PathfindingService có bộ nhớ đường | D | `src/(đề xuất).luau` | Tính lại đường giống hệt là lãng phí. |

### Nhóm 16 — Nạp và cache tài nguyên

| ID | Tên | TT | Tệp chịu trách nhiệm | Nguyên nhân gây lag |
| -- | --- | -- | -------------------- | ------------------- |
| ASSET-001 | Tải trước tài nguyên | D | `src/(đề xuất).luau` | Tải asset đúng lúc cần gây khựng hình giữa trận. |
| ASSET-002 | Nạp module lười | A | `src/Client/Core/Cpu.luau` | Mọi module nạp lúc khởi động làm chậm thời gian vào game. |
| ASSET-003 | Cache kết quả tra cứu | B | `src/Client/Core/Registry.luau` | Tra cứu cây instance lặp lại là chi phí vô ích. |
| ASSET-004 | Không dùng chuỗi WaitForChild | A | `src/Client/Core/Cpu.luau` | `WaitForChild` không trần có thể treo thread vĩnh viễn nếu đối tượng không bao giờ xuất hiện. |
| ASSET-005 | Danh sách asset tập trung | D | `src/(đề xuất).luau` | Asset rải rác khắp script dẫn tới nạp trùng. |
| ASSET-006 | Nén texture và giảm độ phân giải | E | `src/(không áp dụng từ script).luau` | Texture lớn tốn bộ nhớ GPU và băng thông. |

### Nhóm 17 — Cấu trúc dữ liệu

| ID | Tên | TT | Tệp chịu trách nhiệm | Nguyên nhân gây lag |
| -- | --- | -- | -------------------- | ------------------- |
| DATA-001 | Pool đối tượng | B | `src/Client/Core/Pool.luau` | Tạo/huỷ instance liên tục rất đắt. |
| DATA-002 | Lưới băm không gian | B | `src/Client/Core/Spatial.luau` | Quét O(n) toàn thế giới cho mỗi truy vấn gần. |
| DATA-003 | Duyệt mảng bằng chỉ số | B | `src/Client/Core/Cpu.luau` | pairs() chậm hơn và thứ tự không đảm bảo. |
| DATA-004 | Dùng set thay vì tìm trong danh sách | B | `src/Shared/Safety.luau` | Duyệt danh sách để kiểm tra thành viên là O(n) mỗi lần. |
| DATA-005 | Dùng số thay vì chuỗi làm khoá | D | `src/(đề xuất).luau` | Băm chuỗi đắt hơn so sánh số. |

### Nhóm 18 — Sự kiện và kết nối

| ID | Tên | TT | Tệp chịu trách nhiệm | Nguyên nhân gây lag |
| -- | --- | -- | -------------------- | ------------------- |
| EVT-001 | Kết nối tín hiệu khung hình một lần | A | `src/Client/Core/Scheduler.luau` | N kết nối RenderStepped/Heartbeat = N lần gọi mỗi khung hình. |
| EVT-002 | Một kết nối cho mỗi tín hiệu mỗi module | B | `src/Client/Core/Registry.luau`, `src/tests.luau` | Nối trùng cùng một handler làm việc chạy hai lần. |
| EVT-003 | Định tuyến log tập trung | A | `src/Shared/Log.luau` | print mỗi sự kiện vừa tốn vừa làm ngập Output, khó chẩn đoán. |
| EVT-004 | Gộp tín hiệu | D | `src/(một phần — đề xuất).luau` | Mỗi tín hiệu là một đối tượng và một lần Fire riêng. |
| EVT-005 | Tránh FireAllClients dày | E | `src/(không áp dụng ở client).luau` | FireAllClients dày nhân băng thông theo số người chơi. |
| EVT-006 | Ngắt kết nối khi module dừng | B | `src/Client/Core/Registry.luau`, `src/Client/Core/Scheduler.luau` | Module dừng mà connection còn thì callback vẫn chạy. |

### Nhóm 19 — Tìm kiếm trong Workspace

| ID | Tên | TT | Tệp chịu trách nhiệm | Nguyên nhân gây lag |
| -- | --- | -- | -------------------- | ------------------- |
| QUERY-001 | Dùng CollectionService thay vì quét | A | `src/Shared/Safety.luau` | GetDescendants trả về mọi thứ, phải lọc lại rất tốn. |
| QUERY-002 | Cache FindFirstChild | B | `src/Client/Core/Registry.luau` | Tra cứu lặp lại cùng một đối tượng là chi phí vô ích. |
| QUERY-003 | Truy vấn theo vùng | B | `src/Client/Core/Spatial.luau` | Quét toàn cây để tìm vật gần. |
| QUERY-004 | Trần cho việc quét | B | `src/Client/Optimizations/Scan.luau`, `src/Client/Core/Spatial.luau` | Quét không trần trên map lớn gây khựng hình ngay lúc bắt đầu. |
| QUERY-005 | Lập chỉ mục theo tag | D | `src/(đề xuất).luau` | GetTagged mỗi lần hỏi là một lời gọi engine. |
| QUERY-006 | Tránh GetDescendants đệ quy | B | `src/Client/Optimizations/Scan.luau`, `src/Client/Core/Registry.luau` | GetDescendants cấp phát bảng chứa TOÀN BỘ con cháu. |

### Nhóm 20 — Tái sử dụng đối tượng (pooling)

| ID | Tên | TT | Tệp chịu trách nhiệm | Nguyên nhân gây lag |
| -- | --- | -- | -------------------- | ------------------- |
| POOL-001 | Pool instance theo loại | B | `src/Client/Core/Pool.luau` | Instance.new và Destroy đều đắt; làm liên tục gây khựng. |
| POOL-002 | Tái sử dụng Tween | D | `src/(đề xuất).luau` | Tạo Tween mỗi lần cũng là cấp phát đối tượng. |
| POOL-003 | Tái sử dụng bảng tạm | B | `src/Client/Core/Pool.luau` | Cấp phát bảng trong vòng lặp nóng ép GC. |
| POOL-004 | Sổ theo dõi pool và trần dung lượng | B | `src/Client/Core/Pool.luau` | Pool không trần biến thành nguồn rò rỉ mới. |
| POOL-005 | Kiểm tra đối tượng trong pool còn sống | B | `src/Client/Core/Pool.luau` | Game có thể đã Destroy đối tượng trong pool; dùng lại sẽ lỗi. |

### Nhóm 21 — Dữ liệu người chơi

| ID | Tên | TT | Tệp chịu trách nhiệm | Nguyên nhân gây lag |
| -- | --- | -- | -------------------- | ------------------- |
| PLAYER-001 | Thưa cập nhật dữ liệu người chơi | D | `src/(đề xuất).luau` | Cập nhật dày gây replicate và tốn CPU. |
| PLAYER-002 | Cache thuộc tính người chơi | D | `src/(đề xuất).luau` | Đọc attribute mỗi khung hình là tra cứu lặp lại. |
| PLAYER-003 | Không gọi GetPlayers mỗi khung hình | D | `src/(đề xuất).luau` | GetPlayers cấp phát bảng mới mỗi lần gọi. |
| PLAYER-004 | Dọn dẹp khi người chơi rời | D | `src/(đề xuất).luau` | Dữ liệu người chơi đã rời tích tụ thành rò rỉ. |
| PLAYER-005 | Không lưu dữ liệu người chơi phía client | E | `src/(không áp dụng).luau` | Lưu phía client vừa rủi ro bảo mật vừa tốn bộ nhớ. |

### Nhóm 22 — Phát hiện tác vụ nặng

| ID | Tên | TT | Tệp chịu trách nhiệm | Nguyên nhân gây lag |
| -- | --- | -- | -------------------- | ------------------- |
| HEAVY-001 | Phân vị thời gian khung hình | A | `src/Client/Core/Perf.luau` | Trung bình che mất các khung hình giật — thứ người chơi thật sự cảm nhận. |
| HEAVY-002 | Đếm khung hình dài | A | `src/Client/Core/Profile.luau` | Số khung hình giật là chỉ số trực tiếp của trải nghiệm. |
| HEAVY-003 | Theo dõi heap Luau | A | `src/Client/Core/Profile.luau` | Heap tăng đều theo thời gian là dấu hiệu rò rỉ. |
| HEAVY-004 | Đo chi phí của chính công cụ | A | `src/Client/Core/Profile.luau`, `src/Client/Core/Scheduler.luau` | Công cụ chống lag mà tự gây lag thì vô nghĩa. |
| HEAVY-005 | Cảnh báo tác vụ vượt ngân sách | A | `src/Client/Core/Scheduler.luau` | Cần biết công cụ có đang chiếm quá nhiều khung hình. |
| HEAVY-006 | Hồ sơ từng hàm (script profiler) | E | `src/(dùng công cụ Studio.luau`, `src/không phải mã).luau` | Không biết hàm nào đắt thì tối ưu mò. |

### Nhóm 23 — Đối tượng ở xa

| ID | Tên | TT | Tệp chịu trách nhiệm | Nguyên nhân gây lag |
| -- | --- | -- | -------------------- | ------------------- |
| DIST-001 | Cull theo khoảng cách camera | B | `src/Client/Core/Cull.luau` | Engine vẫn trả chi phí cho thứ người chơi không thấy rõ. |
| DIST-002 | Giảm tần suất cập nhật cho đối tượng xa | A | `src/Client/Core/Cull.luau` | Cập nhật đều đặn cho thứ ở xa là lãng phí. |
| DIST-003 | Bỏ qua hiệu ứng ở xa | B | `src/Client/Core/Cull.luau` | Hiệu ứng xa vẫn sinh hạt. |
| DIST-004 | Tự khôi phục khi lại gần | B | `src/Client/Core/Cull.luau`, `src/Client/Core/Guard.luau` | Nếu chỉ tắt mà không khôi phục, người chơi sẽ thấy vật thể 'chết' khi lại gần. |
| CULL-001 | Đăng ký đối tượng cần cull | B | `src/Client/Core/Cull.luau` | Tự quyết định đối tượng nào được cull là rủi ro phá gameplay. |
| CULL-002 | Quét theo chu kỳ, không mỗi khung hình | B | `src/Client/Core/Cull.luau` | Tính khoảng cách cho hàng trăm đối tượng mỗi khung hình là quá tốn. |
| CULL-003 | Trần số đối tượng theo dõi | B | `src/Client/Core/Cull.luau` | Theo dõi không giới hạn làm chính bước cull thành nguồn lag. |
| CULL-004 | Bỏ đối tượng đã bị huỷ khỏi danh sách | B | `src/Client/Core/Cull.luau` | Giữ instance đã huỷ trong danh sách là rò rỉ. |

### Nhóm 24 — Thiết bị cấu hình thấp

| ID | Tên | TT | Tệp chịu trách nhiệm | Nguyên nhân gây lag |
| -- | --- | -- | -------------------- | ------------------- |
| LOWEND-001 | Nhận diện nền tảng | B | `src/Client/Core/Devices.luau` | Cùng một mức giảm đồ hoạ là quá tay trên PC và chưa đủ trên mobile. |
| LOWEND-002 | Chọn bậc chất lượng theo nền tảng và FPS đo được | B | `src/Client/Core/Devices.luau` | Cần mức can thiệp khác nhau cho máy khác nhau. |
| LOWEND-003 | Giảm mật độ hạt mạnh hơn trên máy yếu | B | `src/Client/Core/Devices.luau`, `src/Client/Optimizations/Effects.luau` | Hạt là chi phí lớn nhất trên GPU mobile. |
| LOWEND-004 | Rút gọn GUI trên máy yếu | B | `src/Client/Core/Devices.luau`, `src/Client/Ui/GuiPolicy.luau` | Hoạt ảnh GUI cũng chiếm khung hình trên máy yếu. |
| LOWEND-005 | Đọc thông số phần cứng thật | E | `src/(không khả dụng).luau` | Ước lượng theo nền tảng không chính xác bằng thông số thật. |
| LOWEND-006 | Chế độ an toàn khi lỗi lặp lại | D | `src/(đề xuất).luau` | Trên máy lạ, can thiệp mạnh có thể gây lỗi dây chuyền. |

### Nhóm 25 — Đo lường và kiểm thử

| ID | Tên | TT | Tệp chịu trách nhiệm | Nguyên nhân gây lag |
| -- | --- | -- | -------------------- | ------------------- |
| MEAS-001 | Lấy mẫu trước và sau | B | `src/Client/Core/Profile.luau` | Không đo thì mọi tuyên bố cải thiện đều là đoán. |
| MEAS-002 | Thống kê phân vị | A | `src/Client/Core/Perf.luau` | Một con số trung bình không mô tả được trải nghiệm. |
| MEAS-003 | Bảng so sánh có kiểm tra hợp lệ | B | `src/Client/Core/Profile.luau` | Báo cáo cải thiện từ dữ liệu rỗng là bịa số. |
| MEAS-004 | Công tắc A/B cho từng nhóm | B | `src/Shared/Config.luau`, `src/Client/Core/Devices.luau` | Có nhóm tối ưu trên lý thuyết nhưng lại làm chậm hơn trên máy cụ thể. |
| MEAS-005 | Đo chi phí bản thân công cụ | A | `src/Client/Core/Profile.luau` | Công cụ phải chứng minh nó không tự gây lag. |
| MEAS-006 | Ghi ngữ cảnh của lần đo | B | `src/Client/Core/Profile.luau` | Hai lần đo trong hai cảnh khác nhau thì không so sánh được. |
| MEAS-007 | Không tạo số liệu giả | B | `src/Client/Core/Profile.luau` | Số liệu giả nguy hiểm hơn không có số liệu. |

### Nhóm 26 — Phục hồi lỗi và hoàn tác

| ID | Tên | TT | Tệp chịu trách nhiệm | Nguyên nhân gây lag |
| -- | --- | -- | -------------------- | ------------------- |
| REC-001 | Mọi thao tác nguy hiểm trong pcall | B | `src/Client/Core/Guard.luau` | Một lỗi làm sập cả hệ thống và mất khả năng khôi phục. |
| REC-002 | Không ghi đè thay đổi của người khác | B | `src/Client/Core/Guard.luau` | Game hoặc người chơi có thể đã đổi giá trị đó; ghi đè là phá game. |
| REC-003 | Cách ly lỗi theo từng bước | B | `src/Client/Core/Runner.luau` | Pipeline dừng giữa chừng để lại trạng thái nửa vời. |
| REC-004 | Chuẩn hoá cấu hình sai kiểu | B | `src/Client/Core/Guard.luau` | Cấu hình sai gây lỗi ở nơi rất xa nguyên nhân. |
| RESTORE-001 | Ghi nhật ký giá trị cũ | B | `src/Client/Core/Restore.luau` | Không ghi thì không thể khôi phục. |
| RESTORE-002 | Hoàn tác theo thứ tự ngược | B | `src/Client/Core/Restore.luau` | Khôi phục sai thứ tự có thể đặt trạng thái không nhất quán. |
| RESTORE-003 | Kiểm tra giá trị cũ khi khôi phục | B | `src/Client/Core/Restore.luau`, `src/Client/Core/Guard.luau` | Xem REC-002. |
| RESTORE-004 | Quên đối tượng đã huỷ | A | `src/Client/Core/Restore.luau`, `src/Client/Core/Cull.luau` | Giữ tham chiếu instance đã huỷ vừa rò rỉ vừa gây lỗi. |

### Nhóm 27 — Bật tắt tính năng

| ID | Tên | TT | Tệp chịu trách nhiệm | Nguyên nhân gây lag |
| -- | --- | -- | -------------------- | ------------------- |
| CFG-001 | Bật/tắt theo nhóm | B | `src/Client/Core/Devices.luau`, `src/Shared/Config.luau` | Người dùng cần tắt nhanh một nhóm gây tác dụng phụ. |
| CFG-002 | Bật/tắt từng phương pháp | B | `src/Client/Core/Devices.luau`, `src/Shared/Config.luau` | Có phương pháp tốt với game này nhưng hại với game khác. |
| CFG-003 | Kiểm tra kiểu cấu hình | B | `src/Client/Core/Guard.luau` | Cấu hình sai kiểu gây lỗi khó tìm. |
| CFG-004 | Khôi phục cấu hình mặc định | B | `src/Shared/Config.luau` | Sau khi thử nhiều thiết lập, cần một đường quay lại an toàn. |
| CFG-005 | Liệt kê những gì đang tắt | B | `src/Client/Core/Devices.luau` | Người dùng cần biết hiện tại cái gì đang tắt để chẩn đoán. |
| CFG-006 | Bật/tắt lúc chạy | D | `src/(đề xuất).luau` | Khởi động lại script để đổi một cờ là trải nghiệm tệ. |

### Nhóm 28 — Quản lý tài nguyên tập trung

| ID | Tên | TT | Tệp chịu trách nhiệm | Nguyên nhân gây lag |
| -- | --- | -- | -------------------- | ------------------- |
| RES-001 | Bộ lập lịch duy nhất | A | `src/Client/Core/Scheduler.luau` | Nhiều bộ lập lịch = nhiều kết nối, không kiểm soát được tổng chi phí. |
| RES-002 | Sổ kết nối tập trung | A | `src/Client/Core/Registry.luau` | Connection rải rác không dọn được. |
| RES-003 | Sổ instance tập trung | B | `src/Client/Core/Registry.luau` | Instance tạo ra không ai quản lý. |
| RES-004 | Kho cấu hình tập trung | B | `src/Shared/Config.luau` | Cấu hình rải rác dẫn tới giá trị mâu thuẫn nhau. |
| RES-005 | Định tuyến log tập trung | A | `src/Shared/Log.luau` | Log rải rác khó lọc và dễ làm ngập Output. |
| RES-006 | Thống kê tài nguyên tập trung | A | `src/Client/Core/Scheduler.luau` | Không có cái nhìn tổng thể thì không phát hiện được rò rỉ. |

### Nhóm 29 — Khởi động

| ID | Tên | TT | Tệp chịu trách nhiệm | Nguyên nhân gây lag |
| -- | --- | -- | -------------------- | ------------------- |
| START-001 | Hoãn việc nặng sang khung hình sau | B | `src/Client/Core/Scheduler.luau` | Làm mọi thứ ở khung hình đầu gây khựng ngay lúc vào game. |
| START-002 | Nạp module lười lúc khởi động | A | `src/Client/Core/Cpu.luau` | Nạp mọi module lúc đầu làm chậm thời gian vào game. |
| START-003 | Gộp việc khởi tạo | B | `src/Client/Core/Cpu.luau` | Chuỗi wait nối tiếp cộng dồn thời gian chờ. |
| START-004 | Chờ có trần thời gian | A | `src/Client/Core/Cpu.luau` | WaitForChild không trần có thể treo thread vĩnh viễn. |
| START-005 | Đo thời gian khởi động | D | `src/(đề xuất).luau` | Không đo thì không biết bước nào làm chậm lúc vào game. |

### Nhóm 30 — Tổng thể không phá gameplay

| ID | Tên | TT | Tệp chịu trách nhiệm | Nguyên nhân gây lag |
| -- | --- | -- | -------------------- | ------------------- |
| SAFE-001 | Danh sách trắng property | B | `src/Shared/Safety.luau` | Nếu cho phép đổi mọi property, sớm muộn cũng đụng gameplay. |
| SAFE-002 | Danh sách đen lớp đối tượng | B | `src/Shared/Safety.luau` | Đụng những lớp này gần như chắc chắn phá gameplay. |
| SAFE-003 | Tôn trọng tag bảo vệ của game | B | `src/Shared/Safety.luau` | Chủ game cần một cách nói 'đừng đụng vào cái này'. |
| SAFE-004 | Không đụng điều khiển người chơi | B | `src/Shared/Safety.luau`, `src/Client/Optimizations/Physics.luau` | Mất điều khiển là lỗi nghiêm trọng nhất có thể gây ra. |
| SAFE-005 | Mọi thay đổi đều đảo ngược được | B | `src/Client/Core/Restore.luau` | Thay đổi không đảo ngược được là rủi ro không chấp nhận. |
| SAFE-006 | Chính công cụ không được gây lag | B | `src/Client/Core/Profile.luau` | Công cụ chống lag mà tự gây lag thì vô nghĩa. |
| SAFE-007 | Không xoá nội dung gameplay | B | `src/Client/Core/Registry.luau` | Xoá nhầm vật phẩm/NPC là phá game. |
| SAFE-008 | Không vô hiệu hoá cơ chế bảo vệ | B | `src/Shared/Safety.luau` | Yêu cầu đạo đức và pháp lý. |

## 5.5 Vì sao không có mục nào ở trạng thái C

Ban đầu có 141 mục A và 0 mục B. Sau khi viết 122 test, **90 mục được nâng lên B** vì
có test khai đúng id đó trong tên test và test đạt. 51 mục A còn lại **chưa có test
riêng khai rõ id**, nhưng không bị hạ xuống C vì:

1. Chúng vẫn có mã thật, có marker, và `verify-catalog.js` kiểm được điều đó.
2. Nhiều mục được chạy **gián tiếp** qua test tích hợp `pipeline` (các bước trong
   `Plan`), nên gọi chúng là "chưa kiểm thử" sẽ nói sai theo hướng ngược lại.

Muốn tách bạch tuyệt đối thì cách đúng là **viết thêm test khai rõ id đó**, không phải
đổi nhãn. Đổi A→C chỉ để khớp mẫu sẽ làm báo cáo kém trung thực hơn chứ không hơn.

## 5.6 Trạng thái C = 0 có phải khai khống không?

Không, và đây là điểm dễ hiểu nhầm nhất của toàn bộ danh mục:

- **C = 0 không có nghĩa "mọi thứ đã test trong game".** Nó chỉ có nghĩa: mọi mục đã
  triển khai hoặc đã có test khai rõ id (B), hoặc chưa có test riêng (A).
- Trạng thái B **chỉ có giá trị trong harness Lua**. Không mục nào trong bảng này
  từng chạy trong Roblox Studio.
- Nói cách khác: **B ở đây ≈ C theo định nghĩa gốc** nếu "kiểm thử" bắt buộc phải là
  chạy trong Studio. Nhãn B được giữ kèm lời khai báo này để không ai đọc nhầm.
