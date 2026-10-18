# Kế hoạch giảm lag nhẹ và tiêu chí an toàn

## Mục tiêu đã chốt

| Yêu cầu | Cách thực hiện |
| --- | --- |
| Không dùng menu điều khiển | Chỉ có một bảng trạng thái, không nút bấm hay thao tác kéo |
| Vị trí cố định | Neo `AnchorPoint = (1, 1)` ở góc dưới phải, chừa lề 16 px |
| Giao diện | Hình chữ nhật bo nhẹ, nền xám bán trong suốt, viền cầu vồng |
| Trạng thái | Hiện “Đang giảm lag”, phần trăm bắt đầu ở 1% và bị chặn tối đa 100% |
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
4. **Hạn chế hiệu ứng nhẹ:** giới hạn mật độ particle (`Rate` tối đa 40,
   `ParticleCount` tối đa 120) thay vì xóa hoặc tắt emitter. Các giới hạn có thể
   làm hiệu ứng nhìn thưa hơn một chút; người dùng có thể tắt nhóm `effects`.
5. **Giữ thay đổi có thể hoàn tác:** mọi property được đổi đều ghi lại giá trị cũ;
   khi hoàn tác, không ghi đè nếu game/người dùng đã thay đổi property sau đó.
6. **Không tự tạo lag:** quét có trần; bảng trạng thái cập nhật tối đa 10 lần/giây,
   không tạo vòng RenderStepped riêng và tự ngắt scheduler khi ẩn.
7. **Giữ các nhóm rủi ro tắt:** throttle vật lý và thay đổi mạng tiếp tục mặc định tắt.

## Cách hiểu phần trăm

Phần trăm của bảng là **hoạt ảnh thời lượng hiển thị**, không đo số FPS và không chứng
minh mức cải thiện hiệu năng. Khi pipeline hoàn tất trước 30 giây, bảng báo “Đã giảm lag
xong” và chốt 100%; nếu lỗi, bảng hiện trạng thái lỗi và không giả vờ thành công. Kết quả
đo thật và lỗi chi tiết được ghi trong Output.

## Kiểm thử

Các test mới khóa những điều sau:

- bảng ở đúng góc dưới phải, nền xám bán trong suốt và hiển thị `Đang giảm lag` / `1%`;
- không có `TextButton`, không kéo/chọn được; viền dùng dải `ColorSequenceKeypoint` hợp lệ;
- bảng tự dọn sau 30 giây, tiến trình không vượt 100%, lỗi không hiện thành công;
- chất lượng không bị nâng lên nếu cấu hình hiện tại thấp hơn mục tiêu;
- `GlobalShadows`, độ sáng, `CastShadow` xa/gần và bóng/tỉ lệ nhân vật được giữ nguyên
  theo cấu hình mặc định.

`npm run check` kiểm tra lint, danh mục, cú pháp và logic trong harness Lua 5.3 với mock
Roblox. Đây **không phải Roblox Studio**: GUI chưa được nhìn trên màn hình thật và chưa
có thiết bị/GPU để xác nhận FPS. Chạy trong Studio trước khi dùng trong game do bạn sở hữu.
