# 13 — Soát lại "mã server" cho Blox Fruits (2026-10-27)

Câu hỏi: *"hình như mã server của Blox Fruits khác so với các loại game khác, xem chỉnh lại có bị lỗi gì không"*.

## 1. Kết luận ngắn

**Mã server (JobId) của Blox Fruits KHÔNG khác định dạng** — vẫn là UUID chuẩn
(`513fa33d-98e2-4b45-90cb-03fb429822e5`), y như mọi game khác. Cái **thật sự khác** chỉ có 3 điểm,
và cả 3 đều đã được xử lý trong `server-code.lua` / `player-tools.lua`:

| # | Điểm khác của Blox Fruits | Ảnh hưởng | Trạng thái |
|---|---------------------------|-----------|------------|
| 1 | **3 hải = 3 PlaceId** (`2753915549` Sea 1 · `4442272183` Sea 2 · `7449423635` Sea 3) nhưng **chung 1 universe `994732206`** | mã chỉ ghi `JobId` sẽ bị hiểu là "hải đang đứng" khi dán ở phiên khác → sai place, vào không được | **đã sửa**: game nhiều place → mã luôn là `PlaceId:JobId` |
| 2 | Server công khai **luôn 12/12**, `players` / `playerTokens` rỗng | `excludeFullGames=true` (mặc định) → 0 server; quét so ảnh đại diện không có dữ liệu để so | `excludeFullGames=false` đã có sẵn; **đã sửa** phần "quét mù" (mục 2) |
| 3 | Danh sách server rất lớn, phân trang bị chặn ~700 server/place | quét sâu 150 trang chỉ là danh nghĩa | giữ nguyên, có ghi chú giới hạn |

## 2. Bằng chứng đo trực tiếp (27/10/2026)

Gọi đúng endpoint mà script dùng:

```
GET https://games.roblox.com/v1/games/2753915549/servers/Public?sortOrder=Desc&limit=100&excludeFullGames=false
```

Kết quả: **100 server**, tất cả `maxPlayers: 12`, `playing: 11–12`, và:

```json
{"id":"1238d933-a10d-4e70-bd3d-267fa820aaa2","maxPlayers":12,"playing":12,
 "playerTokens":[],"players":[],"fps":59.89,"ping":669}
```

So với game khác (cùng request, cùng thời điểm):

| Place | Game | `playing/max` | `playerTokens` |
|-------|------|----------------|----------------|
| `2753915549` | Blox Fruits | 12/12 | `[]` |
| `920587237` | Adopt Me | 35/35 | `[]` |
| `183364845` | Speed Run 4 | 16/30 | `[]` |
| `6516141723` | game khác | 43/50 | `[]` |

→ **Rỗng ở mọi game**, kể cả server chưa đầy ⇒ đây là thay đổi phía Roblox
(API server list giờ ẩn danh sách người chơi với request chưa đăng nhập), **không phải lỗi riêng Blox Fruits**.
Hệ quả thực tế: muốn tìm server của **người lạ** thì phải quét + so ảnh đại diện, mà quét chỉ so được khi
response còn `playerTokens`; nếu phiên chạy không có token thì **không có cách nào dò ra** — script giờ nói thẳng
điều đó thay vì quét 150 trang vô ích.

Đo thêm:

* `apis.roblox.com/universes/v1/places/4442272183/universe` → `{"universeId":994732206}`
  (và `7449423635` cũng vậy) ⇒ 3 hải chung universe, `game.PlaceId` **không** dùng thay cho place của mục tiêu được.
* `limit` chỉ nhận `10/25/50/100` (truyền 3 → `"Allowed values: 10, 25, 50, 100"`).
* Roblox có đợt trả `data: []` khi `limit=100` (báo lỗi 12/09/2025) → phải có phương án hạ limit.

## 3. Những gì đã sửa trong lần này

### (a) Mã server luôn kèm PlaceId khi game có nhiều place — `S.FormatCode`

Trước: chỉ ghi `PlaceId:JobId` khi place của mục tiêu **khác** place mình đang đứng.
Với Blox Fruits: copy mã lúc đang ở Sea 2 → mã `9d3b1f2a-…` (trơn). Hôm sau vào Sea 1 rồi dán → script hiểu là Sea 1
→ sai place → "không vào được". Chia sẻ cho người khác cũng hỏng y như vậy.

Sau: `S.PlacesOf(universe, place)` > 1 place (Blox Fruits 3, Evade 6) → **luôn** `4442272183:9d3b1f2a-…`.
Game 1 place thì vẫn giữ mã `JobId` trơn như cũ (không đổi thói quen cũ).

### (b) Không còn "quét mù" — phát hiện server list bị ẩn người chơi

Trước: mỗi trang 100 server, `playerTokens` rỗng → không có gì để so ảnh, nhưng vẫn quét tiếp
150 trang × 3 place × 2 kiểu sắp xếp (≈ 900 request) rồi báo "Không tìm thấy … tăng Độ sâu rồi thử lại"
(sai hướng, còn dễ ăn 429).

Sau: trang đầu tiên của mỗi place mà **cả 100 server đều không có `playerIds`/`players`/`playerTokens`**
→ đánh dấu `blind`, dừng place đó ngay, và trả lỗi rõ:

> Roblox ẩn danh sách người chơi trong server (chỉ trả JobId, không trả playerTokens) nên không dò được ai ở
> server nào bằng ảnh đại diện. Blox Fruits luôn ở tình trạng này. Cách dùng được: người đó là bạn bè (presence),
> hoặc dán mã PlaceId:JobId đã có.

`S.lastScanStats` thêm `blind` / `allBlind`; khi không thấy server mà không bị ẩn thì thông báo **vẫn** giữ
câu cũ ("có thể đang ở server VIP/riêng tư, hoặc tăng Độ sâu rồi thử lại") — không mất tính năng nào.

### (c) `limit` tự hạ khi Roblox trả rỗng — `S.FetchServersPage`

`100 → 50 → 25 → 10`, mức chạy được ghi vào `S._serverLimit` để các trang sau dùng luôn.
Trang rỗng giữa chừng (đã có cursor) thì tôn trọng "hết trang", không hạ limit vô ích.

### (d) Đọc được link Roblox chia sẻ (thêm, không thay cái cũ)

`ParseCode` nhận thêm:

* `https://www.roblox.com/games/start?placeId=4442272183&gameInstanceId=<JobId>`
* `https://www.roblox.com/games/2753915549/Blox-Fruits?gameId=<JobId>`
* link `privateServerLinkCode=…` → nhận ra là **server riêng**, báo "cần access code, JobId không vào được"
  (đúng như Roblox quy định: server reserved phải có access code từ `ReserveServerAsync`).

Vẫn nhận `JobId` trơn và `PlaceId:JobId` như trước.

### (e) Cảnh báo khi mã thiếu PlaceId

Dán `JobId` trơn cho game nhiều place → `Join` vẫn thử place hiện tại (giữ tính năng cũ) nhưng thông báo
thêm "⚠️ mã không kèm PlaceId nên dùng Place hiện tại — sai hải thì dán lại dạng PlaceId:JobId".

## 4. Vì sao `GetPlayerPlaceInstanceAsync` không cứu được

Theo tài liệu Roblox, hàm này **chỉ gọi được từ server**; gọi trong LocalScript/executor sẽ lỗi.
Script vẫn thử (bọc `pcall`) để tận dụng nếu môi trường cho phép, nhưng không thể là đường chính.

## 5. Cách dùng đúng cho Blox Fruits (2026)

1. **Người đó là bạn bè** → `🔎 Tra cứu` là ra mã ngay (presence của bạn bè vẫn trả `gameId`) → `📋`/`🚀`.
2. **Có mã sẵn** (bạn bè gửi, group/Discord chia sẻ) → dán vào ô `Dán mã SV` → `🚀 Vào mã`.
   Mã đúng dạng `4442272183:9d3b1f2a-…` (có PlaceId là chắc nhất).
3. **Người lạ, không có mã** → chỉ dò được nếu phiên chạy còn `playerTokens`; nếu script báo
   "Roblox ẩn danh sách người chơi" thì đó là giới hạn của Roblox, không phải lỗi script.
4. Server 12/12: `🚀` sẽ tự canh slot 25 lần × 1.8 s; Blox Fruits thường đầy nên phải chờ hoặc xin mã mới.

## 6. Kiểm chứng sau khi sửa

| Kiểm tra | Kết quả |
|----------|---------|
| `fengari` parse `server-code.lua` | `PARSE OK` (60 253 B) |
| `fengari` parse `player-tools.lua` | `PARSE OK` (111 351 B) |
| Test lõi (`/tmp/luachk/servertest.lua`, 12 nhóm) | `SERVER-CODE ALL OK` — thêm: mã cùng hải vẫn có PlaceId, game 1 place vẫn `JobId` trơn, đọc link + link private, quét mù dừng sau 3 trang/3 server và trả lỗi, `limit=100` rỗng → hạ 50 |
| Smoke cả file với mock Roblox | `SMOKE ALL OK` — copy `4442272183:7f2c1d9e-…`, teleport `4442272183|7f2c1d9e-…`, dán mã → `2753915549|1111…` |
