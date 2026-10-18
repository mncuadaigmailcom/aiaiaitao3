# Bản gộp: MobilePerformance.client.luau

**Khuyến nghị dùng riêng `MobilePerformance.client.luau` thay các bản cũ.** Không chạy nhiều bản cùng lúc. LocalScript dành cho Roblox Studio / game bạn sở hữu, không phải script executor cho mọi game.

## Hai chế độ trong một tệp

Ở đầu script:

```lua
local MODE = "safe" -- mặc định, không thay đổi đồ hoạ
local SHOW_FPS = true -- false để bỏ đo FPS, giảm bớt callback
```

- `safe`: giữ đồ hoạ và gameplay nguyên vẹn. Chỉ dựng GUI riêng và quan sát FPS, **không có tác vụ tăng FPS thật**. Không quét bản đồ, không sửa script khác, không dọn bộ nhớ game hay chạy “boost” giả.
- `graphics`: đổi dòng trên thành `local MODE = "graphics"` để cho phép các thay đổi Lighting được mô tả bên dưới. Đây là tuỳ chọn, không tự bật theo FPS. Giữ chức năng giảm đồ hoạ và hoàn tác của bản trước.
- Không thể đổi MODE của một phiên bằng cách chạy thêm bản thứ hai: hoàn tác bản đang chạy trước hoặc dừng Play, sửa cấu hình rồi chạy lại.

## Menu và đo FPS

Giữ bảng tối đa 220 × 84, cố định góc dưới phải, nền xám trong suốt, viền cầu vồng tĩnh. Hiện trượt phải → trái và ẩn trái → phải, chỉ 32 px tại góc phải. Tiến trình 1–100% trong 25 giây là **thời gian hiển thị**, không phải mức giảm lag. Xoá ở giây 30.

FPS được ước tính bằng số sự kiện RenderStepped chia cho thời gian thực trong cửa sổ khoảng một giây. Không phải số FPS tăng nhờ script; không nội suy thành 60 FPS. Đo và cập nhật GUI kết thúc khi bảng biến mất/hoàn tác. Chế độ safe tự xoá controller ở giây 30; graphics giữ controller để còn hoàn tác nhưng không tiếp tục đo FPS.

## Hoàn tác bản gộp (LocalScript phía client)

```lua
local pg = game:GetService("Players").LocalPlayer:WaitForChild("PlayerGui")
local controller = pg:FindFirstChild("MobilePerformanceController")
if controller then
    controller:FindFirstChild("Restore"):Fire()
end
```

Có thể hoàn tác trước giây 30; GUI và callbacks đo/hiển thị dừng ngay. Dừng Play cũng kết thúc phiên. Huỷ controller hoàn tác thay đổi đồ hoạ; chỉ xoá LocalScript không đảm bảo hoàn tác. Không tự đổi chất lượng Roblox, không đóng ứng dụng điện thoại, không giảm độ phân giải.

Kiểm thử: `npm test -- mobile-performance` kiểm tra cả hai chế độ bằng mock Roblox API. Chưa chạy trong Studio/điện thoại thật; không có số tăng FPS đã đo. Không thể bảo đảm một script tối ưu chung cho mọi game.

---

## Bản cũ (giữ nguyên để tương thích)

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
