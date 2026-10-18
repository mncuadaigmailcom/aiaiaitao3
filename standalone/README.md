# Chế độ ưu tiên FPS trên điện thoại

`MobileFpsPriority.client.luau` là bản **có thay đổi đồ hoạ**, khác với bản chỉ thông báo `NonInvasiveMobile.client.luau`. Chỉ chọn một bản, không chạy kèm optimizer cũ.

## Cài đặt

Trong Roblox Studio, game bạn sở hữu: thêm LocalScript vào StarterPlayer → StarterPlayerScripts, dán toàn bộ `MobileFpsPriority.client.luau` rồi Play. Tự bật ngay khi chạy, không chờ tiến trình 25 giây.

## Thay đổi thật

- Tắt `Lighting.GlobalShadows`, giảm ánh sáng/phản xạ môi trường về 0.
- Tắt PostEffect trong Lighting, kể cả hiệu ứng được thêm sau đó. Hình ảnh có thể tối hơn, mất bloom/blur/màu chỉnh sẵn. Game dùng blur/màu để truyền thông tin gameplay cần được chủ game kiểm tra trước khi phát hành.
- Không quét Workspace, sửa script khác, vật lý, điều khiển, camera, âm thanh hoặc mạng. Hiệu ứng dưới Camera, hạt, texture và chi tiết bản đồ giữ nguyên.
- Không có API công khai nào ở đây để ép 60 FPS hoặc nội suy khung hình. Không gọi API executor, không đổi độ phân giải hay tự chỉnh chất lượng đồ hoạ hệ thống.
- Bảng nhỏ ở góc dưới phải trượt 32 px, tiến trình 1–100% trong 25 giây chỉ là thời gian hiển thị, không đo mức giảm lag. Bảng biến mất ở giây 30; thiết lập đồ hoạ vẫn giữ tới khi hoàn tác/rời phiên chơi.

## Hoàn tác

Từ **một LocalScript khác phía client**, chạy:

```lua
local playerGui = game:GetService("Players").LocalPlayer:WaitForChild("PlayerGui")
local controller = playerGui:FindFirstChild("MobileFpsPriorityController")
if controller then
    controller.Restore:Fire()
end
```

Hoặc dừng phiên Play. Chỉ xoá LocalScript khi đang chạy không phải cách hoàn tác. Huỷ controller cũng hoàn tác; các giá trị game đã thay đổi khác với giá trị tối ưu sẽ không bị ghi đè. Không áp lại mỗi frame để tránh tranh chấp với game. Không tự bật lại sau khi hồi sinh. Nếu game chủ động bật lại một hiệu ứng đã có, script không ép tắt liên tục.

## Giới hạn / đo trên máy thật

Máy nghẽn CPU, nhiệt, bộ nhớ hoặc mạng có thể không cải thiện. Không bảo đảm 10 → 60 FPS. Để giảm tải thêm, tự đặt Graphics Mode = Manual và Graphics Quality thấp trong menu Roblox. So sánh cùng cảnh, cùng góc nhìn trước/sau trên điện thoại; không chỉ nhìn phần trăm menu. Kiểm thử mock không xác nhận hình ảnh, quyền API thực tế hoặc FPS trên thiết bị.
