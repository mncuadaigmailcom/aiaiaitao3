# 12 — Bản "chỉ 2 tính năng người chơi" (player-tools.lua)

Yêu cầu: một file/link **chỉ** có 2 tính năng — **lấy trang phục người chơi** và
**lấy mã server người chơi** — không kèm phần còn lại của hub.

## File

| File | Nội dung | Dùng khi |
|------|----------|----------|
| `player-tools.lua` | Gộp **đúng 2** tính năng trên (105 KB) | Cần cả hai trong 1 link |
| `outfit-local.lua` | Chỉ lấy/mặc/lưu trang phục | Chỉ cần trang phục |
| `server-code.lua` | Chỉ tìm/copy/vào server (JobId) | Chỉ cần mã server |
| `script.js` | Hub đầy đủ nhiều tính năng | Cần nguyên bộ |

## Cấu trúc `player-tools.lua`

```
-- header mô tả
do  pcall(function()  … outfit-local.lua (nguyên bản) …  end)  end
do  pcall(function()  … server-code.lua  (nguyên bản) …  end)  end
```

* Mỗi phần nằm trong một hàm riêng → không trùng biến cục bộ, không vượt giới hạn
  200 local/function của Luau.
* Mỗi phần bọc `pcall` → phần trang phục lỗi thì phần mã server **vẫn nạp** (và ngược lại).
* Hai cửa sổ GUI độc lập: `OutfitLocalGui` (nút 🧥, RightControl) và `ServerCodeGui`
  (nút 📡, RightShift) — không chồng lên nhau.

## Tính năng "📡 Mã server" trong `server-code.lua`

Giống hệt bản đã sửa trong hub (`docs/11`), nhưng viết lại gọn cho chạy độc lập:

* `PlacesOf` / `SameGame` / `GetUniversePlaces`: biết Blox Fruits 3 hải
  (`2753915549`, `4442272183`, `7449423635`, universe `994732206`) + Evade + place tự thêm.
* `CheckPlayerIsPlaying`: người lạ → pcall `player:IsFriendsWith` → **vẫn quét**
  (`unknown = true`), chỉ chặn khi thật sự là bạn bè offline / khác game.
* `FindPlayerServer`: quét `games.roblox.com/v1/games/<place>/servers/Public` cả
  `Desc` + `Asc`, chia trang đều cho mọi place (3 vòng), khớp theo `playerIds`,
  mảng `players`, hoặc **so ảnh đại diện** (`playerTokens` → `thumbnails /v1/batch`);
  retry khi 429; trả `S.lastScanStats` để hiện "đã quét N SV / N trang / N place".
* `FormatCode` / `ParseCode`: mã dạng `JobId` hoặc `PlaceId:JobId`.
* `Join`: `TeleportToPlaceInstance`, tự đổi PlaceId khi gặp 773/771, tự canh slot
  khi server đầy (25 lần × 1.8s).
* GUI: 1 ô tên/UserId, 3 nút (🔎 Tra cứu · 📋 Mã SV · 🚀 Vào SV), ô dán mã để vào,
  nút đổi **Độ sâu quét** (30–480 trang/place, mặc định 150).

## Đã kiểm chứng

* `fengari`: `PARSE OK` cho cả `server-code.lua` (54 KB) và `player-tools.lua` (105 KB).
* `luaparse {scope:true}`: `server-code.lua` không tạo global lạ (chỉ dùng
  `game, task, syn, http, request, setclipboard, Instance, UDim2…` như mọi script executor).
* Test Lua với stub Roblox API (7 nhóm): `PlacesOf`/`SameGame`; `CheckPlayerIsPlaying`
  (người lạ, bạn bè offline, khác hải); `FindPlayerServer` (khớp `playerIds`, khớp ảnh
  ở hải 2, khớp mảng `players`, thống kê khi không thấy, presence Offline thật thì dừng);
  `FormatCode`/`ParseCode` (có/không PlaceId) → **ALL OK**.

## Link

```
https://raw.githubusercontent.com/mncuadaigmailcom/aiaiaitao3/arena/80c053d2-aiaiaitao3/player-tools.lua
https://raw.githubusercontent.com/mncuadaigmailcom/aiaiaitao3/arena/80c053d2-aiaiaitao3/server-code.lua
https://raw.githubusercontent.com/mncuadaigmailcom/aiaiaitao3/arena/80c053d2-aiaiaitao3/outfit-local.lua
```
