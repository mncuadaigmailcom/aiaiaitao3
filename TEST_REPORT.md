# BÁO CÁO KIỂM THỬ TOÀN DIỆN — aiaiaitao3

Ngày: 15/10/2026 · Môi trường: Debian 12, Python 3.11, Luau 0.742 (build từ source chính thức luau-lang/luau)
Trạng thái phân loại: **ĐẠT / KHÔNG ĐẠT / CHƯA KIỂM TRA / BỊ CHẶN**

## 1. Phạm vi & cấu trúc dự án (thực tế, không suy đoán)

Repo chỉ có 3 file mã nguồn + `.git`. **Không có** backend, cơ sở dữ liệu, hệ thống
đăng nhập/phân quyền, API server, framework web hay giao diện web — các mục đó trong
yêu cầu kiểm thử được phân loại **CHƯA KIỂM TRA (không tồn tại trong dự án)**.

| File | Loại thực tế | Dung lượng | Dòng | Vai trò |
|---|---|---|---|---|
| `aiaiaitao3` (không đuôi) | Luau / Roblox executor | 92.358 B | 2.499 (LF) | Menu executor độc lập (ExMenu): NoClip, ESP, thảm kính, aimbot, tọa độ, server hop |
| `script.js` (tên gây hiểu nhầm) | Luau / Roblox executor | 695.320 B | 9.835 (CRLF) | Hub "taodepzai / BananaCatHub" bản cũ hơn |
| `script.js1.js` (tên gây hiểu nhầm) | Luau / Roblox executor | 899.244 B | 7.934 (CRLF) | Hub bản mới: thêm tra cứu người chơi, skin/avatar, Object Track |

Cả 3 file đều là script chạy phía client trong Roblox qua executor — **không chạy được**
bằng Node/trình duyệt/Studio.

## 2. Kế hoạch kiểm thử đã thực hiện

1. Rà soát cấu trúc, inventory service/API/URL/`_G`/panel GUI của từng file.
2. Kiểm tra cú pháp bằng parser Luau chính thức (`luau-analyze` 0.742).
3. Test tĩnh tự động (mã hóa, cân bằng ngoặc, service hợp lệ, URL, exfil, bảo toàn tính năng).
4. Unit test trích xuất hàm thuần chạy bằng Luau thật (`S.FetchServers`, kiểm chứng 3 ca:
   lỗi mạng / JSON hỏng / dữ liệu hợp lệ).
5. Săn lỗi theo mẫu nguy hiểm: HTTP/JSON không bọc `pcall`, index nil, vòng lặp vô hạn,
   hàm dùng-nhưng-không-định-nghĩa (`S.*`, `D.*`, `OT.*`, `Store.*` — không phát hiện thiếu).
6. Sửa tối thiểu → chạy hồi quy (toàn bộ suite + parse lại file đã sửa).

## 3. Kết quả theo nhóm

| # | Hạng mục | Kết quả | Ghi chú thực tế |
|---|---|---|---|
| 1 | Cú pháp Luau cả 3 file | **ĐẠT** | `luau-analyze` không báo `SyntaxError`. Hàng nghìn cảnh báo TypeError còn lại là do analyzer không có định nghĩa Roblox/executor (`game`, `Instance`, `Enum`...) — không phải lỗi cú pháp, không kết luận là bug runtime |
| 2 | Mã hóa UTF-8, không NUL, cân bằng `()[]{}` | **ĐẠT** | Test tự động `test_exist_utf8_no_nul`, `test_delimiter_balance` |
| 3 | Tên service `GetService("...")` hợp lệ | **ĐẠT** | 0 service lạ trong cả 3 file |
| 4 | URL từ xa: HTTPS + đúng host (roblox.com, raw.githubusercontent.com) | **ĐẠT** | Chỉ tải Dex / Infinite Yield / SimpleSpy — code bên thứ ba, xem rủi ro §5 |
| 5 | Rò rỉ dữ liệu (webhook/exfil endpoint) | **ĐẠT** | Không thấy Discord/Telegram/Pastebin webhook trong cả 3 file (kiểm tra tĩnh) |
| 6 | Bảo toàn tính năng (panel/chức năng baseline) | **ĐẠT** | Test `test_feature_preservation_baseline`; diff sửa chỉ +15/−7 dòng ở 2 file, `script.js1.js` không đổi |
| 7 | Đọc file lưu hỏng (`Store.load` JSON) | **ĐẠT** | Cả 2 bản hub đều bọc `pcall(JSONDecode)` — dữ liệu hỏng không sập hub |
| 8 | `S.FetchServers` chịu lỗi mạng/JSON (script.js) | **KHÔNG ĐẠT → ĐÃ SỬA (BUG-002)** | Xem §4 |
| 9 | Nút "Đổi Server Khác" chịu lỗi mạng/JSON (aiaiaitao3) | **KHÔNG ĐẠT → ĐÃ SỬA (BUG-001)** | Xem §4 |
| 10 | `OT.Norm/Split` bỏ dấu tiếng Việt (trích xuất, Luau thật) | **ĐẠT** | Kiểm chứng thủ công bằng Luau: `Đà Nẵng→da nang`, rỗng/nil→`""`, tách `Kiếm, Đường Kiếm;game.Workspace.Model`→`kiem/duong kiem/model` |
| 11 | Chạy tích hợp trong Roblox (GUI, fly/noclip/ESP, teleport thật, executor API `gethui/hookfunction/writefile`) | **BỊ CHẶN** | Không có Roblox client/executor trong sandbox và không thể cài. **Chưa hề chạy trong game** — mọi kết luận runtime trong game đều chưa xác minh |
| 12 | Database / đăng nhập / phân quyền / API server | **CHƯA KIỂM TRA** | Không tồn tại trong dự án |
| 13 | Hiệu năng trong game (quét `GetDescendants`, RenderStep ESP) | **CHƯA KIỂM TRA** | Cần đo trong game thật; tĩnh cho thấy `script.js1.js` có 22 lần `GetDescendants` + 19 `BindToRenderStep` |

## 4. Lỗi đã tìm thấy & cách sửa (thay đổi tối thiểu, không xóa tính năng)

### BUG-001 — Trung bình — `aiaiaitao3`, handler `serverHopBtn` (~dòng 1928)
- **Hiện tượng:** `req({...})` và `HttpService:JSONDecode(res.Body)` không bọc `pcall`;
  `s.playing < s.maxPlayers` lỗi khi thiếu trường. Mất mạng / API trả lỗi / JSON hỏng /
  `res` nil → handler ném lỗi, **nút Đổi Server chết hoàn toàn**, kể cả nhánh fallback
  `Teleport(game.PlaceId)` ở dưới cũng không bao giờ chạy tới.
- **Nguyên nhân:** thiếu bảo vệ lỗi kết nối & dữ liệu không hợp lệ ở handler sự kiện.
- **Sửa:** bọc request+JSON trong `pcall`, kiểm tra `type(res/Body/body.data)`,
  `tonumber()` + guard `type(s)=="table"` cho từng server. Hành vi đúng (có server trống
  → vào server đó; không có → fallback teleport cũ) **giữ nguyên 100%**.
- **Test hồi quy:** `test_bug001_server_hop_guarded` — ĐẠT; parse Luau lại — ĐẠT.

### BUG-002 — Trung bình — `script.js`, `S.FetchServers` (dòng 5190)
- **Hiện tượng:** `game:HttpGet(url)` + `JSONDecode(raw)` trần. Khi lỗi mạng/JSON,
  `S.HopServer` (không tự bọc `pcall` quanh lời gọi này) ném lỗi thay vì trả về thông
  điệp "⚠️ Không tìm thấy server..." như thiết kế. Bản `script.js1.js` mới hơn đã tự
  sửa đúng chỗ này — `script.js` bị sót.
- **Sửa:** bọc `pcall`, lỗi thì `return {}, nil` (đúng chữ ký caller đang kỳ vọng,
  giống bản mới). Đường dữ liệu hợp lệ không đổi.
- **Test hồi quy:** `test_bug002_fetchservers_guarded` (tĩnh) + unit test Luau thật
  trích nguyên hàm: lỗi mạng → `{},nil`; JSON hỏng → `{},nil`; hợp lệ → 1 server + cursor — **ĐẠT**.

## 5. Rủi ro còn tồn tại (báo cáo, KHÔNG tự ý sửa vì thay đổi hành vi cần chủ dự án duyệt)

| ID | Mức | Vị trí | Mô tả |
|---|---|---|---|
| R-01 | Cao (bảo mật/vận hành) | Cả 3 file | Tải & chạy code bên thứ ba qua `loadstring(game:HttpGet("raw.githubusercontent.com/..."))` (Dex/Infinite Yield/SimpleSpy) — nội dung có thể thay đổi bất cứ lúc nào, ngoài kiểm soát của repo |
| R-02 | Cao (tài khoản) | script.js / script.js1.js | Cơ chế "Anti Ban" hook `player.Kick` + tự hop server khi nghi bị phát hiện; fly/noclip/ESP vi phạm ToS Roblox — nguy cơ ban, "Anti Ban" không đảm bảo an toàn |
| R-03 | Trung bình | Cả 3 file | File đơn khối 92–899 KB, nhiều lệnh/dòng, phụ thuộc `_G.*` và executor API (`gethui`, `hookfunction`, `writefile`) — khó bảo trì, đổi executor là có thể gãy tính năng |
| R-04 | Thấp | aiaiaitao3:316, 1485 | Biến khai báo không dùng (`activeTab`, `nameLbl`) — chỉ là lint, không ảnh hưởng chạy; để nguyên để tránh sửa thừa |

## 6. Bài test đã chạy — kết quả thực tế

```
python3 -m unittest discover -s tests -v   →  Ran 11 tests — OK (toàn bộ ĐẠT)
  test_exist_utf8_no_nul ............... ok
  test_delimiter_balance ............... ok
  test_known_services .................. ok
  test_remote_urls_https_allowlist ..... ok
  test_no_exfil_endpoints .............. ok
  test_feature_preservation_baseline ... ok
  test_store_json_guarded .............. ok
  test_bug001_server_hop_guarded ....... ok   (hồi quy BUG-001)
  test_bug002_fetchservers_guarded ..... ok   (hồi quy BUG-002)
  test_luau_parse_if_available ......... ok   (Luau 0.742, cả 3 file)
  test_luau_unit_fetchservers_if_available ok (3 ca: lỗi mạng / JSON hỏng / hợp lệ)
```
Sau sửa BUG-001 lần cuối (guard type chặt hơn): chạy lại 6 test liên quan — **OK**;
`luau-analyze` lại trên `aiaiaitao3` — không lỗi cú pháp; `git diff` tổng: **+15/−7 dòng,
chỉ 2 file** (`aiaiaitao3`, `script.js`), `script.js1.js` nguyên vẹn.

## 7. Kết luận

- Các bài test quan trọng có thể chạy trong môi trường này: **ĐẠT toàn bộ (11/11)**.
- 2 lỗi thật đã sửa tối thiểu + có test hồi quy tự động; **không tính năng nào bị xóa/
  tắt/đơn giản hóa** (test baseline bảo toàn tính năng xác nhận).
- Phần **BỊ CHẶN**: toàn bộ kiểm thử trong Roblox thật (GUI hiển thị, bay/xuyên tường,
  ESP, teleport, anti-ban, executor khác nhau). Muốn đóng mục này cần chạy script trong
  game với executor thực tế và đối chiếu từng tính năng theo checklist ở §3 — chưa làm
  được trong sandbox, nên **không tuyên bố các tính năng đó "đã kiểm chứng trong game"**.

## 8. Bổ sung 16/10/2026 — Nút ảo ⬆/⬇ + SimpleSpy (script.js1.js)

- **BUG-003 (Trung bình) — HUD 🚀 Fly:** trạng thái giữ nút ảo key theo `InputObject`;
  thả tay ngoài nút/đa điểm dễ kẹt hoặc mất giữ ⬆/⬇. Sửa: key theo button + token
  `{input, X, Y, Z}`, `UserInputService.InputEnded` toàn cục xoá theo input đã lưu.
- **BUG-004 (Trung bình) — HUD 🛡 Safe:** ⬆/⬇ chỉ trông chờ `InputEnded` trên nút
  (kẹt lên/xuống nếu thả ngoài nút) và `Activated` sau giữ lâu nảy thêm 2.5 studs.
  Sửa: lưu `SF._virtYInput/_virtYAt`, reset qua InputEnded toàn cục, chỉ chạm nhanh
  (<0.35s) mới Nudge 2.5 — giữ nguyên tính năng chạm, giữ lâu không nảy thêm.
- **SimpleSpy:** thay `ex-serum/SimpleSpy` (HttpGet) bằng link chủ dự án yêu cầu
  `loadstring(game:HttpGetAsync("https://raw.githubusercontent.com/78n/SimpleSpy/main/SimpleSpyBeta.lua"))()`
  ở cả 2 vị trí (quickScripts + Script Hub) — không mất tính năng nào.
- **Test:** thêm 4 test (link SimpleSpy mới, token holds Fly, global-release Safe,
  unit Luau thật: giữ ⬆→Y=+1→vận tốc +50, giữ ⬇→−50, thả→0). Toàn suite: **15/15 OK**,
  parse Luau `script.js1.js` không lỗi cú pháp. Runtime trong game thật vẫn **BỊ CHẶN**
  (chưa có Roblox/executor trong sandbox) — cần chủ dự án bấm thử ⬆/⬇ trong game để xác nhận cuối.

## 9. Bổ sung — Hop vào server người chơi bằng mã ở Script Hub (script.js1.js)

- **BUG-005 (Trung bình):** nhập mã của người chơi mà người đó ở *sub-place khác*:
  `S.JoinServer` mặc định dịch chuyển bằng PlaceId nơi mình đang đứng → Roblox trả
  GameNotFound; handler `TeleportInitFailed` thử place khác xong **im lặng bỏ cuộc**
  (kể cả khi hàng chờ canh slot chạy hết 25 lần). Người dùng chỉ thấy "không vào được".
- **Sửa (không mất tính năng):**
  1. Thêm `S.LocateJobPlace(jobId)`: khi mã chỉ có JobId và chưa biết Place, quét tối đa
     6 Place của universe × 2 trang server công khai để tìm đúng Place của mã, có cache
     `_jobPlaceCache`. Không tìm thấy → giữ hành vi cũ (vào bằng Place hiện tại).
  2. Hop nội bộ (Hop/Ít/Vắng) ghi sẵn cache Place hiện tại → không bị chậm bởi bước tìm.
  3. `TeleportInitFailed` hết phương án → báo rõ lý do + hướng xử lý; hàng chờ canh
     25 lần không vào được → cũng báo rõ thay vì im lặng.
- **Test:** thêm `TestServerJoinByCode` (3 test) gồm unit Luau thật cho chuỗi
  JoinServer: (1) JobId ở sub-place 222 → teleport đúng (222, JobId); (2) có cache →
  không quét, teleport ngay; (3) mã "Place:JobId" → dùng ngay; (4) không tìm thấy →
  fallback Place hiện tại như cũ; (5) mã rác → lỗi rõ ràng, không teleport.
  Toàn suite **18/18 OK**, parse Luau đạt. Dịch chuyển thật trong game vẫn cần chủ
  dự án xác nhận trong Roblox (môi trường này không có game client).
