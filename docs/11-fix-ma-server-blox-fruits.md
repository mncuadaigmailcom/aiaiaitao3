# 11 — Sửa tính năng "lấy mã server của người chơi khác" cho Blox Fruits

Tài liệu này ghi lại nguyên nhân gốc và toàn bộ thay đổi trong `script.js` (bản hub) để
**📋 Mã SV** / **🚀 Vào SV** hoạt động được với người chơi lạ trong Blox Fruits,
theo hướng **chỉ thêm, không bỏ bất kỳ tính năng nào**.

## 1. Vì sao trước đây không chạy trong Blox Fruits

| # | Nguyên nhân | Chi tiết |
|---|-------------|----------|
| 1 | Roblox **ẩn presence với người lạ** | `presence.roblox.com` trả `userPresenceType = 0` cho mọi người không phải bạn bè. Hàm `PI.CheckPlayerIsPlaying` coi đó là "đang Offline" và **chặn ngay** toàn bộ luồng quét (`FindPlayerServerByTokens` trả về `notPlayMsg`, `Lookup` xoá mã server, 2 nút 📋/🚀 dừng trước khi quét). Đây là nguyên nhân chính. |
| 2 | Không biết **3 hải của Blox Fruits** | `PI.GetUniversePlaces` chỉ dò place bằng `AssetService:GetGamePlacesAsync` + `develop.roblox.com` (thường chỉ trả về place hiện tại hoặc lỗi), và chỉ có sẵn danh sách place của Evade (`3652625463`). Blox Fruits có 3 place: `2753915549` (Sea 1), `4442272183` (Sea 2), `7449423635` (Sea 3) nên gần như chỉ quét được hải đang đứng. |
| 3 | Quét quá nông | Mặc định 16 trang (`Lookup`) / 20 trang (nút 📋), và vòng lặp cũ chia trang lệch: place chính lấy 4 trang, các place phụ mỗi place 4 trang. Blox Fruits có ~10.000–20.000 server công khai/hải. |
| 4 | Ảnh đại diện bị rate-limit | `PI.FetchTargetHeadshotKeys` bị 429 → 0 key → không thể khớp ảnh. Trước đây 6 batch song song + retry dày (0.3s) làm 429 càng dễ xảy ra. |
| 5 | Bỏ sót khoá dữ liệu | Server list có `players` / `playerIds` / `playerTokens`; code cũ chỉ xử lý `playerIds` + `playerTokens`. |

## 2. Thay đổi (tất cả đều là thêm mới / mở rộng)

1. `PI.ScanPages` — độ sâu quét, mặc định **150 trang/place** (trước là 16/20).
2. `PI.GAME_SETS`, `PI.PlacesOf`, `PI.SameGame`, `PI.SetScanPages`, `PI.SetCustomPlaces`,
   `PI.CustomPlacesText` — bảng place đã biết:
   * Blox Fruits (universe `994732206`): `2753915549`, `4442272183`, `7449423635`
   * Evade (`3652625463`): 6 place như cũ
   + place người dùng tự thêm (`PI.CustomPlaces`).
   `PlacesOf` nhận cả universe lẫn place, nên đứng ở Sea 1/2/3 đều quét đủ 3 hải.
3. `PI.GetUniversePlaces` — thêm place đã biết + place tự thêm, chặn tối đa 12 place.
4. `PI.CheckPlayerIsPlaying` — trả thêm giá trị thứ 3 `unknown`:
   * Người lạ + presence ẩn → `true, nil, true` → **vẫn quét**, không báo Offline nữa.
   * Bạn bè thật sự offline → vẫn báo như cũ (dùng `player:IsFriendsWith`).
   * Khác universe nhưng cùng bộ place (Sea 1 ↔ Sea 2 ↔ Sea 3) → vẫn cho quét.
   * Không đọc được presence → `true, nil, true` → vẫn quét.
5. `PI.FindPlayerServerByTokens`
   * Nhận `unknownPresence`, không chặn sớm; đặt `PI.lastScanStats`.
   * Retry lấy key ảnh đại diện 3 lần (0.7s, 1.4s, 2.1s) → giảm lỗi 429.
   * Batch ảnh: 3 chunk song song (trước 6) + backoff rộng hơn.
   * Hỗ trợ thêm `sv.players` (mảng UserId hoặc object `{id=...}`) → khớp UserId trực tiếp.
   * Vòng quét mới: chia đều `ScanPages` cho **mọi place**, lặp tối đa 3 vòng, 50ms/trang,
     ghi `PI.lastScanStats = { servers, pages, places, unknownPresence, thumbBlocked }`.
6. `PI.Lookup` — nhận `presUnknown`, coi như "đang chơi" để **tự quét**, hiện rõ
   "Roblox ẩn trạng thái với người lạ", cuối cùng in thống kê "đã quét N SV / N trang / N place".
7. `PI.JoinPlayerServer` + nút **📋 Mã SV** — không chặn khi presence ẩn, dùng `PI.ScanPages`,
   in thống kê khi không tìm thấy.
8. `S.LocateJobPlace` — dò 12 place × 6 trang (trước 6 × 3) để tìm đúng place của JobId.

## 3. Cách dùng

1. Vào Blox Fruits (Sea nào cũng được) rồi chạy hub.
2. Tab **Người Chơi** → nhập username/UserId → 🔎 Tra cứu.
3. Bấm **📋 Mã SV** (copy mã) hoặc **🚀 Vào SV** (teleport thẳng vào đúng server).
   * Dòng trạng thái hiện "trang X · Desc · Place Y" trong lúc quét, kèm tổng kết khi xong.
   * Người chơi ở **server VIP/riêng tư** thì không tìm được (Roblox không trả về).

Tăng/giảm độ sâu khi cần (mặc định 150):

```lua
_G.BananaCatHub_PlayerInfo.SetScanPages(300)      -- 10..600
_G.BananaCatHub_PlayerInfo.SetCustomPlaces("123456789, 987654321")  -- thêm place riêng
```

## 4. Kiểm chứng đã chạy

* `fengari` **PARSE OK** (616 KB, 5.646 dòng CRLF).
* `luaparse {scope:true}`: **không thêm global mới**, không mất global nào.
* Danh sách hàm: 634 → 639 (đúng 5 hàm mới, **0 hàm bị mất**).
* Test Lua với stub Roblox API: `PlacesOf`/`SameGame`/`SetScanPages`/`SetCustomPlaces` PASS;
  `CheckPlayerIsPlaying` (người lạ / bạn bè offline / khác game / khác hải / presence nil / lỗi
  `IsFriendsWith`) PASS; `FindPlayerServerByTokens` (khớp `playerIds`, khớp ảnh ở hải 2,
  khớp mảng `players`, thống kê khi không thấy, presence ẩn vẫn quét, presence Offline thật thì dừng) PASS.
* Rollback: `git checkout 216c969 -- script.js`.
