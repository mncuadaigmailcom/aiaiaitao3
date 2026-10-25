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
| Khung chat | Một khung bo góc 8px, nền (25,27,29) trong suốt 0.3, cách mép trái 8px và cách topbar 4px; nền mờ hẳn sau 3,5 giây không dùng, chữ mờ sau 30 giây không có tin mới; rê chuột vào thì hiện lại |
| Ô nhập | Nằm **trong** khung, nền 0.2, viền trắng mờ 0.8, bo 3px; `Nhấp vào đây hoặc nhấn phím "/" để trò chuyện`, nút gửi ➤; tin dài tự xuống dòng |
| Màu tên | Dùng thuật toán màu tên cổ điển của Roblox (cùng một tên thì luôn ra cùng một màu) |
| Thì thầm | Giống Roblox: `/w tên` hiện nhãn `[Tới Tên]` trong ô nhập; bấm vào nhãn hoặc Backspace khi ô trống để thoát |
| Tab kênh | Roblox mặc định **tắt**; bật `CONFIG.ShowChannelTabs = true` để có tab `Chung` + tab `@Tên` |
| Bong bóng chat | Hiện trên đầu nhân vật, tối đa 3 bong bóng, tự biến mất sau 15 giây |
| Thanh cuộn | Dày 8px, chỉ hiện khi rê chuột vào khung (giống Roblox) |

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

## Kích thước (đúng theo chat mặc định của Roblox)

Số đo lấy từ mã nguồn khung chat mặc định của Roblox (gói `ExperienceChat`, bản lưu trong
[Roblox-Client-Tracker](https://github.com/MaximumADHD/Roblox-Client-Tracker)):

| Thành phần | Giá trị |
| --- | --- |
| Rộng | 40% chiều rộng màn hình, tối đa **475px** |
| Cao (phần danh sách tin) | 25% chiều cao màn hình (trừ topbar), tối đa **275px** |
| Vị trí | cách mép trái 8px, cách topbar 4px |
| Chữ | 14px, viền chữ đen 0.5, cách dòng 4px, lề trái/phải 8px |
| Ô nhập | đệm trên 8px, trái/phải 8px; đệm trong 10px; nút gửi rộng 30px |

Ví dụ: màn hình 1280×720 → **475 × 165**; 1920×1080 → **475 × 255**; 2560×1440 → **475 × 275**;
điện thoại 844×390 → **337 × 83**.
Muốn to/nhỏ hơn thì chỉnh `CONFIG.WidthScale` / `CONFIG.HeightScale` (giống `ChatWindowConfiguration`).

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
- 45 kịch bản: kích thước ở 4 độ phân giải, vị trí, màu/độ trong suốt, gửi tin, thoát RichText, /help,
  /w + nhãn `[Tới X]`, thoát thì thầm bằng Backspace/bấm nhãn, bot trả lời, /mute, /unmute, cắt 200 ký tự,
  chống spam, /clear, đóng/mở + huy hiệu, phím `/`, nền + chữ ô nhập mờ, hover, thanh cuộn, lịch sử ↑,
  giới hạn 100 tin, chạy 300 giây không lỗi; thêm chế độ bật tab, chế độ cảm ứng và chữ mờ sau 30 giây.

Phần **chỉ xem được bằng mắt trong Studio** (font, vị trí thật trên topbar, độ đẹp bong bóng) cần bạn bấm Play để kiểm tra.
