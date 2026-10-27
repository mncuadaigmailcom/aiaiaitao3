# 12 — `player-tools.lua`: 2 tính năng người chơi trong **1 cửa sổ**

Yêu cầu: gộp **lấy trang phục người chơi** + **lấy mã server người chơi** thành **một** —
một file, một cửa sổ, hai tab.

## Có gì trong file

| Tab | Việc | Nguồn |
|-----|------|-------|
| 🧥 **Trang phục** | xem / mặc LOCAL / trả skin / lưu / tự mặc / bỏ phụ kiện của bất kỳ ai | `outfit-local.lua` |
| 📡 **Mã server** | 🔎 Tra cứu · 📋 Mã SV · 🚀 Vào SV · 🚀 Vào mã đã dán · đổi Độ sâu quét | `server-code.lua` |

* Một nút nổi 🎛, một khung 468×438 (kéo được bằng thanh tiêu đề).
* `RightControl` mở thẳng tab Trang phục, `RightShift` mở thẳng tab Mã server.
* Mỗi tab bọc `pcall` riêng → tab này lỗi thì tab kia vẫn chạy.

## Cách ghép (build)

```
player-tools.lua
├── KHUNG CHUNG   : ScreenGui PlayerToolsGui, nút 🎛, ToolsWindow, 2 tab, Content (452×356)
├── TAB 1 (pcall) : outfit-local.lua — nguyên logic, chỉ đổi khung:
│                   • không tạo ScreenGui riêng, vẽ vào PT.content
│                   • bỏ nút 🧥 riêng, bỏ kéo cửa sổ, bỏ hotkey RightControl
│                   • nút ✕ của nó gọi PT.closeShell() để đóng cả khung
├── TAB 2 (pcall) : server-code.lua — phần lõi (mục 1→8) giữ nguyên,
│                   phần GUI viết lại cho đúng 452×356 và vẽ vào PT.content
└── ĐIỀU KHIỂN TAB: showTab / openShell / closeShell / kéo khung / phím tắt
```

Lý do tách hàm cho mỗi tab: không trùng biến cục bộ, không vượt giới hạn 200 local/function của Luau.

## Logic "mã server" (giống bản đã sửa trong hub — xem docs/11)

* `PlacesOf` / `SameGame` / `GetUniversePlaces`: biết Blox Fruits 3 hải
  (`2753915549`, `4442272183`, `7449423635`, universe `994732206`) + Evade + place tự thêm.
* `CheckPlayerIsPlaying`: người lạ → `player:IsFriendsWith` → **vẫn quét**; chỉ chặn khi là bạn bè offline / khác game.
* `FindPlayerServer`: quét cả `Desc` + `Asc`, chia trang đều cho mọi place (3 vòng),
  khớp `playerIds` → mảng `players` → **so ảnh đại diện** (`playerTokens` + `thumbnails /v1/batch`),
  retry khi 429, lưu `S.lastScanStats` để hiện "đã quét N SV / N trang / N place".
* `FormatCode` / `ParseCode`: `JobId` hoặc `PlaceId:JobId`.
* `Join`: `TeleportToPlaceInstance`, tự đổi PlaceId khi 773/771, tự canh slot 25 × 1.8 s khi đầy.
* URL dùng `placeStr()` (định dạng `%.0f`) để không bao giờ sinh `".../games/2753915549.0/..."`.

## Đã kiểm chứng (2026-10-27)

1. **Cú pháp**: `fengari` → `PARSE OK` cho `server-code.lua`, `player-tools.lua` (104 KB) và `outfit-local.lua`.
2. **Global**: `luaparse {scope:true}` → `server-code.lua` không tạo global lạ.
3. **Test lõi Lua** (stub API): `PlacesOf`/`SameGame`, `CheckPlayerIsPlaying` (người lạ / bạn bè offline /
   khác hải), `FindPlayerServer` (khớp `playerIds`, khớp ảnh ở hải 2, khớp mảng `players`, thống kê khi
   không thấy, presence Offline thật thì dừng), `FormatCode`/`ParseCode` → **ALL OK**.
4. **Smoke test cả file với mock Roblox** (Instance/UDim2/Color3/Enum/Signal/HttpService/TeleportService…):
   * `outfit-local.lua`: GUI + nút 🧥 + mở/đóng → **OK**
   * `server-code.lua`: bấm 📡 → nhập tên → Tra cứu → Mã SV → Vào SV → **copy & teleport đúng**
   * `player-tools.lua`: có `OutfitWindow` + `ServerWindow` trong cùng `Content`; chuyển tab đúng;
     `RightShift` mở khung; Tra cứu ra "Roblox ẩn trạng thái với người lạ"; 📋 copy
     `4442272183:7f2c1d9e-…` (mục tiêu nằm ở hải 2, khớp bằng ảnh đại diện); 🚀 teleport
     `4442272183|7f2c1d9e-…`; dán mã lạ → teleport đúng → **SMOKE ALL OK**

## Link

```
https://raw.githubusercontent.com/mncuadaigmailcom/aiaiaitao3/arena/80c053d2-aiaiaitao3/player-tools.lua
```

Bản riêng lẻ: `outfit-local.lua` (chỉ trang phục) · `server-code.lua` (chỉ mã server) · `script.js` (hub đầy đủ).
