# Roblox Chat Menu — giao diện chat giống Roblox (bản UI, chưa nối server)

Một **LocalScript duy nhất**: [`ChatMenu.client.luau`](ChatMenu.client.luau).
Script dựng lại khung chat trông và thao tác giống chat mặc định của Roblox.
Vì **chưa có server**, tin nhắn của "người chơi khác" hiện đang là **bot giả lập** (chế độ DEMO).

## Cài vào Roblox Studio

1. `StarterPlayer` → `StarterPlayerScripts` → **Insert Object** → **LocalScript**.
2. Dán toàn bộ nội dung `ChatMenu.client.luau` vào.
3. Bấm **Play**.

Script tự tắt khung chat mặc định của Roblox (`CONFIG.DisableDefaultChat`) để không bị hiện 2 khung chat.

## Giao diện & thao tác

| Thành phần | Mô tả |
| --- | --- |
| Nút 💬 trên topbar | Bật/tắt khung chat; khi đóng sẽ có huy hiệu đỏ đếm số tin chưa đọc |
| Khung chat | Nền tối bán trong suốt ở góc trên bên trái; nền mờ đi sau 3,5 giây không dùng, chữ mờ đi sau 30 giây không có tin mới; rê chuột vào thì hiện lại |
| Thanh nhập | `Nhấp vào đây hoặc nhấn phím "/" để trò chuyện`, nút gửi ➤, bộ đếm ký tự khi gần hết 200 ký tự |
| Màu tên | Dùng thuật toán màu tên cổ điển của Roblox (cùng một tên thì luôn ra cùng một màu) |
| Tab kênh | `Chung` + tab `@Tên` cho mỗi cuộc thì thầm (có số tin chưa đọc, nút × để đóng) |
| Bong bóng chat | Hiện trên đầu nhân vật, tối đa 3 bong bóng, tự biến mất sau 15 giây |
| Tin nhắn mới | Đang cuộn lên đọc tin cũ thì hiện nút `↓ Tin nhắn mới` |

Phím tắt: `/` mở chat · `Enter` gửi · `Esc` thoát ô nhập · `↑`/`↓` gọi lại tin đã gửi.
Trên điện thoại khung chat mặc định đóng, chạm vào nút 💬 để mở (giống Roblox).

### Lệnh chat

```
/? hoặc /help        danh sách lệnh
/w <tên> [tin]       thì thầm (gõ thiếu tên cũng được: /w minh)
/r [tin]             trả lời người vừa thì thầm với bạn
/mute <tên>          tắt tiếng     /unmute <tên>  bật lại
/clear               xoá tin trong kênh hiện tại
/e wave|point|dance|dance2|dance3|laugh|cheer   biểu cảm
```

## Tuỳ chỉnh

Mọi thứ nằm trong 3 bảng ở đầu tệp:

- `CONFIG`: bật/tắt DEMO, kích thước khung, thời gian mờ, giới hạn ký tự, chống spam, bong bóng, hiện giờ, kiểu tên `[Tên]:` của chat cũ...
- `TEXT`: toàn bộ chữ tiếng Việt hiển thị trên giao diện.
- `THEME`: màu sắc.

## Nối server sau này

Giao diện chỉ gọi tới bảng `Transport` (mục 15 trong script). Hiện tại là `MockTransport`.
Khi có server, chỉ cần viết một transport mới với 3 hàm rồi đổi dòng `Transport = MockTransport`:

```lua
Transport.Send(payload)        -- { kind = "chat", text = "..." }
                               -- { kind = "whisper", target = "Username", text = "..." }
Transport.ListUsers()          -- danh sách người chat ngoài Players (cho /w, /mute), có thể trả {}
Transport.Start(onIncoming)    -- mỗi tin nhận được gọi onIncoming(packet)
```

Định dạng `packet` server gửi về:

```lua
{
  kind   = "chat" | "whisper" | "system",
  sender = { name = "Username", displayName = "Tên hiển thị", userId = 123 },
  target = { name = "...", displayName = "..." }, -- chỉ có khi kind = "whisper"
  text   = "nội dung",
}
```

> ⚠️ Khi nối server thật trong Roblox, **server bắt buộc phải lọc chữ** bằng
> `TextService:FilterStringAsync` trước khi gửi cho người chơi khác (quy định của Roblox).
> Script phía client đã "thoát" ký tự RichText nên người chơi không chèn thẻ `<font>` để phá giao diện được.

## Đã kiểm thử thế nào

Môi trường làm việc **không có Roblox Studio**, nên script **chưa được chạy trong Studio thật**.
Đã kiểm tra:

- Biên dịch + chạy bằng **Luau CLI** chính thức (build từ mã nguồn `luau-lang/luau`).
- Chạy trên bộ mock Roblox có **kiểm tra tên lớp, tên thuộc tính, kiểu giá trị và Enum theo API Dump
  của Roblox** (`MaximumADHD/Roblox-Client-Tracker`) — gán sai tên/kiểu thuộc tính là báo lỗi ngay.
- 30 kịch bản: gửi tin, thoát RichText, /help, /w, tab thì thầm, bot trả lời, /mute, /unmute, cắt 200 ký tự,
  chống spam, /clear, đóng/mở + huy hiệu, phím `/`, nền mờ + hover, lịch sử ↑, giới hạn 100 tin,
  chạy 300 giây không lỗi; thêm chế độ cảm ứng và chữ mờ sau 30 giây.

Phần **chỉ xem được bằng mắt trong Studio** (font, vị trí thật trên topbar, độ đẹp bong bóng) cần bạn bấm Play để kiểm tra.
