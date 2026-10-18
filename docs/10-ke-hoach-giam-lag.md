# Kế hoạch giảm lag nhẹ và tiêu chí an toàn

## Mục tiêu đã chốt

| Yêu cầu | Cách thực hiện |
| --- | --- |
| Không dùng menu điều khiển | Chỉ có một bảng trạng thái, không nút bấm hay thao tác kéo |
| Vị trí cố định | Neo `AnchorPoint = (1, 1)` ở góc dưới phải, chừa lề 16 px |
| Giao diện | Hình chữ nhật bo nhẹ, nền xám bán trong suốt, viền cầu vồng |
| Trạng thái | Hiện “đang giảm lag”, phần trăm bắt đầu ở 1% và bị chặn tối đa 100% |
| Thời lượng | Tự ẩn sau 30 giây kể từ lúc dựng bảng, sau đó dọn GUI và connection |
| Không làm mất ánh sáng/bóng | Không tắt `GlobalShadows`, không sửa `Brightness`/màu sáng; `shadowDistance = 0`; giữ bóng nhân vật và terrain mặc định |
| Không phá gameplay | Không xóa map, nhân vật, emitter, vật phẩm; không đổi thông số gameplay |

## Kế hoạch tối ưu

1. **Đo, không đoán:** lấy mẫu nền trước khi thay đổi; đo lại sau khi chạy và ghi
   kết quả vào Output. Không tuyên bố FPS tăng nếu không có số đo thật.
2. **Giảm đồ họa vừa phải:** đặt mục tiêu `QualityLevel = 8` khi mức đang dùng cao hơn;
   không nâng chất lượng trên máy đã ở mức thấp, không khóa chế độ đồ họa tự động.
3. **Giữ nguyên ánh sáng và bóng:** không tắt bóng toàn cục hay bóng part. Culling bóng
   xa bị tắt mặc định; `Terrain.Decoration` và cấu hình avatar cũng được giữ nguyên.
4. **Hạn chế hiệu ứng nhẹ:** giới hạn `ParticleEmitter.Rate` (mặc định tối đa 40)
   thay vì xóa hoặc tắt emitter. Hiệu ứng có thể nhìn thưa hơn một chút; người dùng
   có thể tắt nhóm `effects`. Chỉ có tác dụng khi Rate ban đầu vượt trần.
5. **Quản lý tài nguyên của chính script:** connection, GUI và instance do RALO tạo
   được dọn khi tắt; bảng tạm có thể tái sử dụng. GC thủ công mặc định tắt vì Luau
   tự quản lý GC và một vòng GC nền không cần thiết có thể tốn thêm CPU.
6. **Không chạy nền thừa:** tác vụ định kỳ dùng chung Scheduler; không có task thì
   Heartbeat chung tự ngắt. GC thủ công nếu chủ game bật `gcEverySeconds > 0` cũng
   chạy qua Scheduler (không tạo thread riêng) và bị huỷ khi `Shutdown`.
7. **Tránh tính/tra cứu/ghi UI trùng:** có các helper tính khoảng cách bình phương,
   giữ cache tra cứu có thể vô hiệu, chặn GUI trùng lặp, và chỉ ghi thuộc tính UI
   khi giá trị đổi. Các module này tối ưu mã riêng của công cụ; không thể tự sửa
   vòng lặp của mọi script khác trong game.
8. **Đo thật:** ghi FPS/frame time, heap Luau trước/sau, thời lượng từng handler,
   cùng chi phí Scheduler (ms/frame), số task/kết nối và mức vượt ngân sách. Đây là
   số đo của RALO, không phải phần trăm CPU/RAM toàn thiết bị.
9. **Giữ nhóm rủi ro tắt:** throttle vật lý và thay đổi mạng tiếp tục mặc định tắt.

## Đối chiếu các cách bạn liệt kê

| Cách | Trong script hiện tại |
| --- | --- |
| Vòng lặp/tính toán dư, tác vụ nền | Có Scheduler dùng chung, tác vụ theo chu kỳ và helper tính khoảng cách không cần căn bậc hai; không tự tối ưu vòng lặp trong script game khác |
| RAM, dữ liệu tạm, connection | Registry/Pool dọn hoặc tái sử dụng tài nguyên do RALO tạo; GC thủ công mặc định tắt, có thể bật opt-in |
| Tìm kiếm/làm việc lặp lại | Có cache tra cứu, singleton GUI và các bước bỏ qua ghi nếu giá trị không đổi |
| Network | Có `Net` API cho code của game do bạn sở hữu, nhưng không tự bắt/chặn RemoteEvent; nhóm mạng mặc định tắt |
| Culling / vật lý | Có thư viện riêng, nhưng culling không nằm trong pipeline mặc định và throttle vật lý mặc định tắt; không tính là lợi ích nếu chưa chủ động bật/đăng ký |
| FPS/CPU/RAM | Đo FPS/frame time, heap Luau, thời lượng handler và chi phí Scheduler. Không đọc được % CPU/RAM toàn hệ điều hành từ LocalScript |
| Ứng dụng nền, tab trình duyệt, nhiệt độ, Wi-Fi | Ngoài quyền của LocalScript; cần tự đóng ứng dụng/tab, giữ thiết bị thoáng mát và dùng kết nối ổn định |

## Cách hiểu phần trăm

Phần trăm của bảng là **hoạt ảnh thời lượng hiển thị**, không đo số FPS và không chứng
minh mức cải thiện hiệu năng. Khi pipeline hoàn tất trước 30 giây, bảng báo “Đã giảm lag
xong” và chốt 100%; nếu lỗi, bảng hiện trạng thái lỗi và không giả vờ thành công. Kết quả
đo thật và lỗi chi tiết được ghi trong Output.

## Kiểm thử

Các test mới khóa những điều sau:

- bảng ở đúng góc dưới phải, nền xám bán trong suốt và hiển thị `đang giảm lag` / `1%`;
- không có `TextButton`, không kéo/chọn được; viền dùng dải `ColorSequenceKeypoint` hợp lệ;
- bảng tự dọn sau 30 giây, tiến trình không vượt 100%, lỗi không hiện thành công;
- chất lượng không bị nâng lên nếu cấu hình hiện tại thấp hơn mục tiêu;
- Runner gọi đúng chữ ký handler, bước an toàn được áp dụng và bước lỗi không chặn pipeline;
- `PERF-001` thử Rate 20 (không đổi, phải báo `unchanged`) và Rate 200 (mô hình giảm chi phí khi bị cap);
- GC mặc định tắt, GC opt-in đi qua Scheduler và bị huỷ khi `Shutdown`; Scheduler không
  giữ Heartbeat rỗng khi không có tác vụ;
- `GlobalShadows`, độ sáng, `CastShadow` xa/gần và bóng/tỉ lệ nhân vật được giữ nguyên
  theo cấu hình mặc định.

`npm run check` kiểm tra lint, danh mục, cú pháp và logic trong harness Lua 5.3 với mock
Roblox. Harness chỉ mô hình hoá một phần chi phí từ part/bóng và `ParticleEmitter.Rate`;
không mô phỏng GPU, chất lượng render thật, network hay CPU/RAM thiết bị. Vì vậy số FPS/
chi phí mô hình **không phải** benchmark Roblox. GUI cũng chưa được nhìn trên màn hình thật.
Chạy trong Studio trước khi dùng trong game do bạn sở hữu.
