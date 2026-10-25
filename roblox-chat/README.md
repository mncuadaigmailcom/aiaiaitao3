# Roblox Chat Menu — chat giống Roblox, lưu tin trên GitHub

| Tệp | Loại | Đặt ở đâu | Việc làm |
|---|---|---|---|
| [`ChatMenu.client.luau`](ChatMenu.client.luau) | LocalScript | `StarterPlayer › StarterPlayerScripts` | Giao diện chat giống Roblox |
| [`GitHubChatServer.server.luau`](GitHubChatServer.server.luau) | Script | `ServerScriptService` | **Server chat bằng GitHub** (khuyên dùng) |
| [`NotevnChatServer.server.luau`](NotevnChatServer.server.luau) | Script | `ServerScriptService` | Bản cũ: server chat bằng notevn |

Chỉ dùng **một** server script (GitHub hoặc notevn). Không có server script thì giao diện tự chạy **chế độ DEMO** (bot giả lập) sau 5 giây chờ.

## Cài vào Roblox Studio

1. `ServerScriptService` → **Insert Object** → **Script** → dán `GitHubChatServer.server.luau`.
2. `StarterPlayer` → `StarterPlayerScripts` → **Insert Object** → **LocalScript** → dán `ChatMenu.client.luau`.
3. **Home → Game Settings → Security → bật “Allow HTTP Requests”** (bắt buộc).
4. Bấm **Play**, mở chat, gõ **`/` + API key GitHub** (vd: `/ghp_xxxxxxxxxxxx`) rồi Enter.

## Chat bằng GitHub hoạt động thế nào

| Bước | Chuyện gì xảy ra |
|---|---|
| **Nhập key** | Gõ `/ghp_...` (hoặc `/github_pat_...`, hoặc `/key <key>`). Key **không hiện lên chat**, không lưu vào lịch sử ↑/↓, chỉ gửi riêng lên server và chỉ nằm trong bộ nhớ server (rời game là quên). |
| **Tự tạo** | Server kiểm tra key, chưa có kho **`roblox-chat-server`** thì tự tạo (công khai). Chưa có tệp **`chat.txt`** thì tự tạo. **Đã có thì bỏ qua.** |
| **Thông báo** | Chat hiện `✔ Kết nối GitHub thành công (@tên). Kho: tên/roblox-chat-server, tệp: chat.txt…`. Key sai hoặc thiếu quyền thì báo rõ lý do. |
| **Gửi tin** | Tin được lọc bằng `TextService`, hiện ngay cho cả server, rồi thêm dòng `Username: tin` vào cuối `chat.txt` (GitHub API, có kiểm tra `sha`: nếu 2 người ghi cùng lúc thì đọc lại và ghi lại, **không mất tin**). |
| **Nhận tin** | Cứ **3 giây** đọc link raw `https://raw.githubusercontent.com/<tên>/roblox-chat-server/main/chat.txt` một lần, dòng mới thì hiện lên chat. |
| **Người mới vào** | Thấy 20 tin gần nhất. Chưa nhập key thì vẫn đọc được (nếu server đã biết kho) nhưng phải nhập key mới gửi được. |
| `/w` | Thì thầm chỉ trong cùng server, **không** ghi lên GitHub. |

**Tạo API key:** GitHub → Settings → Developer settings → Personal access tokens:
- **Tokens (classic)**: chỉ tick quyền **`public_repo`**, key có dạng `ghp_...`.
- **Fine-grained**: Repository access “All repositories”, quyền **Administration** + **Contents** = Read and write, key có dạng `github_pat_...`.

**Cấu hình** (bảng `CONFIG` đầu `GitHubChatServer.server.luau`):

| Tên | Mặc định | Ý nghĩa |
|---|---|---|
| `RepoOwner` | `""` | Để trống thì dùng tài khoản của key nhập đầu tiên. **Nên điền tên tài khoản GitHub** để mọi server đọc được chat ngay cả khi chưa ai nhập key. |
| `RepoName` / `FilePath` | `roblox-chat-server` / `chat.txt` | Tên kho / tệp |
| `PollInterval` | `3` | Giây giữa 2 lần đọc raw |
| `MaxFileLines` | `100` | Chỉ giữ 100 dòng cuối |
| `RequireKeyToChat` | `true` | Phải nhập key mới chat được |
| `ClearOnShutdown` | `false` | `true` thì xoá `chat.txt` khi server tắt |
| `Debug` | `false` | In request ra Output (không bao giờ in key) |

> ⚠️ Lưu ý
> - Mọi người muốn chat chung phải cùng **một kho**. Cách đơn giản nhất là dùng key của cùng một tài khoản, hoặc điền `RepoOwner` rồi thêm người khác làm *collaborator* của kho.
> - **raw.githubusercontent.com có bộ nhớ đệm (~5 phút)**. Script thêm `?t=...` để lấy bản mới, nhưng nếu GitHub vẫn trả bản cũ thì tin từ server khác có thể đến chậm. Tin trong cùng server luôn hiện ngay. Script không bao giờ hiện trùng tin vì bản cũ.
> - GitHub giới hạn số lần ghi (khoảng vài chục commit/phút cho mỗi key). Chat bình thường thì không sao, spam liên tục có thể bị chặn tạm thời.
> - Kho là **công khai**: ai cũng đọc được `chat.txt`. Đừng chat thông tin riêng tư.
> - Key là mật khẩu tài khoản GitHub của bạn: chỉ cấp quyền tối thiểu, xoá key khi không dùng nữa. Nếu lỡ dán key như tin nhắn thường, server sẽ chặn, không hiện và không ghi lên GitHub.

## (Bản cũ) Server notevn hoạt động thế nào

| Việc | Cách làm |
|---|---|
| **Đọc** | Cứ **3 giây** `GET https://notevn.com/raw/qdzjmz94` (thêm `?t=...` chống cache). Trang này là **HTML**, nội dung nằm trong `quill.setContents({"ops":[...]})` → script tách lấy chữ (đọc không được thì tự chuyển sang `/get_shared/qdzjmz94`). Mỗi dòng `tên: tin nhắn`. Dòng mới → gửi tới mọi người chơi. |
| **Ghi** | (Mở trang ghi chú 1 lần để lấy cookie phiên như trình duyệt.) Người chơi chat → server lọc bằng `TextService` → hiện ngay cho cả server → **đọc lại ghi chú, thêm dòng `Username: tin` vào cuối, lưu** lên `https://notevn.com/cbyurm9g`. |
| **Thoát** | Server tắt (`game:BindToClose`, kể cả bấm **Stop** trong Studio) → **xoá sạch** nội dung ghi chú. |
| **Người mới vào** | Thấy tối đa 20 tin gần nhất trong ghi chú. |
| **Thì thầm `/w`** | Chỉ trong cùng server Roblox, **không** ghi lên ghi chú (ghi chú ai cũng đọc được). |

Cách ghi lấy từ chính mã nguồn trang notevn (`/assets/js/v19.min.js`):

```text
POST https://notevn.com/ajax.php        (application/x-www-form-urlencoded, kiểu jQuery)
  action=getnote&file=/cbyurm9g                       -> id, tên, thứ tự... của tab
  action=save&file=/cbyurm9g&share_url=qdzjmz94&type=
      &data[0][id]=...&data[0][name]=...&data[0][order_index]=...&data[0][visibility]=...
      &data[0][data]={"ops":[{"insert":"tên: tin\n"}]}   <- nội dung dạng Quill Delta
```

Cấu hình ở bảng `CONFIG` đầu `NotevnChatServer.server.luau`: `NoteFile`, `ShareKey`, `ReadUrl`, `PollInterval` (3),
`ClearOnShutdown` (true), `MaxNoteLines` (80 — chỉ giữ 80 dòng cuối), `HistoryOnJoin` (20),
`NameField` (`"Name"` = username, hoặc `"DisplayName"`), `Debug` (in request/response ra Output).

> ⚠️ Lưu ý quan trọng
> - **Chưa thử được với notevn thật**: môi trường làm việc không gọi được notevn.com và không có Roblox Studio.
>   Phần đọc (`/raw`) chắc chắn đúng; phần **ghi** viết theo mã nguồn trang notevn và đã kiểm thử với
>   notevn giả lập. Nếu ghi lỗi, khung chat sẽ báo `Không ghi được tin nhắn lên notevn (...)` — bật
>   `CONFIG.Debug = true` để xem phản hồi trong Output.
> - notevn chỉ có lệnh **lưu đè cả ghi chú**, không có “thêm vào cuối”. Server luôn đọc lại ngay trước khi lưu,
>   nhưng nếu nhiều server/người cùng ghi trong cùng một khoảnh khắc thì vẫn có thể mất tin.
> - **Xoá khi thoát** áp dụng cho cả ghi chú: một server tắt là xoá hết tin của mọi người.
> - Tin đọc từ ghi chú cũng được lọc bằng `TextService` trước khi hiện (luật Roblox). Ghi chú là công khai:
>   ai có link đều đọc/sửa được.
> - Nếu ghi chú bị đặt mật khẩu/riêng tư, server không ghi được và sẽ báo trong khung chat.

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

## Giao thức giữa giao diện và server

Giao diện chỉ gọi tới bảng `Transport` (mục 15 trong script):

- `RemoteTransport` — khi có `ReplicatedStorage.CustomChatRemote` (server script tự tạo). Client gửi
  `{ kind = "chat" | "whisper" | "hello", text, target }`; server trả từng `packet`.
- `MockTransport` — khi không có server (đợi tối đa `CONFIG.ServerWaitTime` = 5 giây), bot giả lập.

```lua
{
  kind    = "chat" | "whisper" | "system",
  sender  = { name = "Username", displayName = "Tên hiển thị", userId = 123, external = true? },
  target  = { name = "...", displayName = "..." }, -- chỉ có khi kind = "whisper"
  text    = "nội dung (đã lọc)",
  history = true?,                                 -- tin cũ gửi lúc mới vào (không hiện bong bóng)
}
```

`external = true` = người viết thẳng vào ghi chú notevn (không ở trong server). Có thể `/mute` họ.
Script client “thoát” ký tự RichText nên không ai chèn thẻ `<font>` phá giao diện được.

## Đã kiểm thử thế nào

Môi trường làm việc **không có Roblox Studio** và không gọi được notevn.com / raw.githubusercontent.com, nên **chưa chạy thật**.
Đã kiểm tra bằng **Luau CLI** chính thức + bộ mock Roblox kiểm tra tên lớp/thuộc tính/kiểu/Enum theo
API Dump của Roblox, cùng **GitHub giả lập** (REST API + raw, kiểm tra header, sha, base64, quyền) và **notevn giả lập**.
Chạy lại: `LUAU=/đường/dẫn/luau bash roblox-chat/tests/run.sh`

| Bộ test | Số kịch bản | Nội dung |
|---|---|---|
| `test_ui.luau` | 46 | kích thước 4 độ phân giải, màu, gửi tin, RichText, lệnh, thì thầm, spam, mờ dần, lịch sử… (chế độ DEMO) |
| `test_fade.luau` | 1 | chữ mờ sau 30 giây |
| `test_notevn.luau` | 79 | tách nội dung từ HTML `/raw` thật (cả chữ có `}` `"` `'silent')`), dự phòng `/get_shared`, cookie phiên, bong bóng chat trên đầu người chơi khác + chính mình (không hiện cho người viết trên web, không hiện khi thì thầm, tự tắt sau 15 giây), so khớp dòng mới, mã hoá form, lịch sử khi vào, đọc mỗi 3 giây, tin từ web, /mute người ngoài, ghi lên note, không trùng tin, /raw trả bản cũ, lọc TextService 2 chiều, gửi cùng lúc, /w không lên note, xuống dòng, 200 ký tự, chống spam phía server, thứ tự tin, note bị xoá, cắt `MaxNoteLines`, lưu lỗi + thử lại, HTTP tắt, note khoá, **xoá note khi tắt server**, dừng đọc sau khi tắt |
| `test_http_off.luau` | 4 | chưa bật Allow HTTP Requests: báo lỗi, chat trong server vẫn chạy |
| `test_github.luau` | 53 | GitHub giả lập: nhận dạng key, base64, chưa có key thì chặn, key sai, key không hiện + không vào lịch sử ↑, tự tạo kho + tệp, báo thành công, đọc raw mỗi 3 giây, gửi + commit, không trùng tin, tin từ server khác, raw bị cache, ghi đụng nhau (409) thì thử lại không mất tin, key thứ 2 bỏ qua bước tạo, `/key <key>`, thiếu quyền tạo/ghi, dán key như tin thường thì bị chặn, lọc chữ, `/w` không lên GitHub, cắt 100 dòng, GitHub lỗi rồi thử lại, rời game thì quên key, mặc định không xoá khi tắt |
| `test_github_owner.luau` | 8 | `RepoOwner` điền sẵn: đọc được khi chưa có key, kho/tệp có sẵn thì bỏ qua bước tạo, ghi nối tiếp |
| `test_github_clear.luau` | 4 | `ClearOnShutdown = true`: xoá `chat.txt` khi tắt server |

Lỗi tìm được và đã sửa trong lúc test: tin hiện **sai thứ tự** khi lọc chậm (nay xử lý lần lượt từng người),
**tin cũ bị hiện lại hàng loạt** khi `/raw` trả bản cũ hơn, người vào ngay lúc server mở **không thấy lịch sử**,
tin **mất hẳn** khi lưu lỗi (nay thử lại 3 lần), dòng `https://...` bị hiểu nhầm là tên người gửi,
thông báo “Đã kết nối” sai khi HTTP đang tắt.
**Lỗi nặng phát hiện khi chạy thật:** `/raw` trả về trang HTML chứ không phải chữ thuần → bản cũ hiểu cả trang
HTML là 1 tin nhắn và có thể ghi rác HTML lên ghi chú. Đã sửa: tách đúng nội dung, và không bao giờ lưu khi đọc ra HTML lạ.

Khi chạy, cửa sổ **Output** sẽ in `✔ đọc ghi chú OK`, `✔ ghi lên notevn thành công` hoặc lý do lỗi (kèm đoạn đầu phản hồi của notevn).
Trang `notevn.com/cbyurm9g` đang mở trên trình duyệt **không tự cập nhật** — bấm **F5** để thấy tin mới.

Phần **chỉ xem được bằng mắt trong Studio** (font, vị trí thật trên topbar, bong bóng) cần bạn bấm Play để kiểm tra.
