# Phân tích 2 file `script.js` và `script.js1.js`

> Báo cáo tĩnh (static analysis) — **không sửa** nội dung 2 file script.
> Ngày phân tích: 2026-10-11 · commit `b36ff1e` 🤖 *Boss Bot sửa và cập nhật lại file script: script.js1.js*

---

## 1. Kết luận nhanh (TL;DR)

| Câu hỏi | Trả lời |
|---|---|
| 2 file là gì? | Cùng **một** hub menu cho Roblox chạy bằng **executor**, viết bằng **Luau** (không phải JavaScript dù đuôi `.js`). Tên trong script: *taodepzai v5.0 NOIR*. |
| Giống nhau bao nhiêu? | **8.799 dòng giống hệt từng byte** (91% của bản nhỏ hơn), chỉ khác **3 chỗ** (xem §4). |
| File nào đầy đủ hơn? | **`script.js`** — có thêm nguyên khối **v5.7 “🔎 TRA CỨU · XEM 3D · 👕 LẤY SKIN”** (1.035 dòng) và đã **vá giới hạn 200 local**. |
| File nào có thêm tính năng? | **`script.js1.js`** — có thêm bảng **“👕 TRANG PHỤC NGƯỜI CHƠI”** (268 dòng, mặc đồ LOCAL/SERVER). |
| Rủi ro lớn nhất? | `script.js1.js` **chạm trần 200 local của Luau** (đo được: 200/200) → rất dễ lỗi *“Out of local registers … exceeded limit 200”* khi nạp. `script.js` chỉ còn 197 (dư 3 slot). |
| Nên dùng file nào? | **`script.js`** làm bản chính; nếu cần tính năng trang phục thì **chuyển khối 6630–6897** từ `script.js1.js` sang (xem §9). |

---

## 2. Hai file này là gì

- Nội dung: **Luau** cho Roblox, gắn vào `PlayerGui`/`gethui()` (dạng *executor script* / LocalScript).
- Cấu trúc: 1 menu GUI lớn (~600 dòng đầu) + hàng chục **khối `do … end` độc lập** cho từng tính năng (mỗi khối tự dựng panel, tự `trackConn`, tự dọn dẹp khi chạy lại).
- Header trong file ghi rõ các mốc: `v5.0 NOIR` → v5.1 → v5.2 PERF → v5.3/v5.4 EXTREME PERF → v5.5 → **v5.6 FAST** → **v5.7 / v5.7.5**.
- File thứ 3 `aiaiaitao3` (2.499 dòng, 92 KB) là **bản tiền nhiệm**: “EXECUTOR MENU – Fix NoClip… Banana Cat Hub Style”, không có 2 tính năng mới nói trên; dùng để đối chiếu nguồn gốc.

### Số liệu đo được

| Chỉ số | `script.js` | `script.js1.js` |
|---|---|---|
| Kích thước | 695.320 bytes | 655.856 bytes |
| Số dòng | 9.835 | 9.068 |
| Mã hoá / xuống dòng | UTF-8 hợp lệ · CRLF 100% | UTF-8 hợp lệ · CRLF 100% |
| Mục tiêu đề `-- ----------` (top-level) | 65 | 64 (thiếu đúng mục **v5.7** – xem §4c) |
| Prototype hàm lồng nhau | 1.847 | 1.707 |
| Khai báo `local` trong **hàm chính** (kể cả trong `do`) | 428 | 478 |
| **Đỉnh `local` cùng tồn tại ở hàm chính** | **197** (dòng 7.539) | **200** (dòng 8.682) |
| Cân bằng cú pháp `function/if/do/repeat` ↔ `end/until` | 4.375 ↔ 4.375, khớp | khớp |
| Backtick / chuỗi dài `[[ ]]` | 1 | 1 |

→ Cả 2 file **hợp lệ về cấu trúc**, chạy được về mặt cú pháp; khác biệt nằm ở nội dung và ở **áp lực biến `local`**.

---

## 3. Điểm chung (không đổi giữa 2 file)

Menu 8 tab (thứ tự `LayoutOrder`):

| # | Tab | Nội dung chính |
|---|---|---|
| 1 | 💾 Code Đã Lưu | lưu/đọc script qua `writefile` (nếu executor hỗ trợ) |
| 2 | 💻 Code | nhập code + ▶ Chạy, chèn GUI của script vào menu, “Trả GUI về game” |
| 3 | 📚 Script Hub | **Script Hub** + bộ nút nhanh (`quickScripts`) |
| 4 | 👥 Người Chơi | danh sách người chơi, 📍 định vị xuyên tường, 👣 bám camera (spectate), 🌳 định vị **vật** theo tên (ObjTrack, bảng cao 452 px), 🚀 bay tới người/vật |
| 5 | 🛠 Hỗ Trợ | POS/SIZE/ROT/LOOK, phân tích vật thể, highlight tím, toạ độ + waypoint, thước đo tốc độ, CPU/đồ hoạ nhẹ |
| 6 | ⚙️ Thiết lập | xuất/nhập JSON cài đặt, xoá dữ liệu, xem môi trường executor |
| 7 | ➕ Tạo Tính Năng | tạo tab tính năng mới từ code dán vào |
| 99 | 🧩 GUI Ngoài | “park” GUI của script khác ra ngoài menu |

Tính năng di chuyển/tiện ích (giống nhau): 🚀 bay theo camera · 💨 tốc độ theo camera · 🦘 nhảy/nhảy cao · 🧱 xuyên tường (noclip + “đẩy xuyên”) · 👟 chạy độ · 🪩 thảm kính (Rộng×Cao×Dài) · 🔲 tường trong suốt · ✨ glow · 🎥 khán giả (camera tự bay) · 🌐 Server (Reset/Hop/lấy mã/vào theo mã) · 🔐 Anti Ban · ⚙ tuỳ chỉnh · lớp **PERF** (cache Humanoid/RootPart, tái dùng `RaycastParams`, tạm dừng tính năng theo trang) · lớp **compat** bù hàm thiếu của executor (`_G.BananaCatHub_*`, `S.CompatRequest`).

---

## 4. Khác biệt chính xác giữa 2 file (chỉ 3 nhóm)

`diff` toàn file chỉ ra **3 hunk**; ngoài 3 chỗ này, hai file **giống hệt nhau**:

### (a) `script.js1.js` **thêm** khối trang phục — sau dòng 6.629 (268 dòng: 6.630–6.897)

```
@@ script.js:6629  →  script.js1.js:6630-6897 @@     (+268 dòng)
-- Trang phục chỉ áp dụng lên Humanoid của LocalPlayer; không thay avatar tài khoản hoặc người khác.
do local PH = 236 … Frame "HubOutfit_Panel" … TextBox username … 🔍 Tìm / 👕 Mặc LOCAL /
   🌐 Mặc SERVER / ↩ Khôi phục LOCAL / ↩ Khôi phục SERVER … end
```
Chèn **ngay đầu tab 👥 Người Chơi** (trước `-- ---------- KHUNG 📍 ĐỊNH VỊ`). Khối này dùng `D.playerY` nên các panel sau tự đẩy xuống — **không chồng lấn**.

### (b) Cách bọc khối “định vị vật” (ObjTrack) — dòng 8.313–8.314

```lua
-- script.js  (8313-8314)                     -- script.js1.js (8581)
-- v5.5: bọc khối này trong hàm để             do local OT = S.ObjTrack
-- không vượt giới hạn 200 local của
-- hàm chính (Lua/Luau)
(function() local OT = S.ObjTrack
```
…và ở cuối khối: `script.js` đóng bằng `… end) end)()` (dòng 8.585), còn `script.js1.js` chỉ `… end) end` (dòng 8.852).
💡 Chính **1 dòng bọc hàm này** là thứ giữ `script.js` ở 197 local, còn `script.js1.js` bị đẩy lên 200.

### (c) `script.js` **có thêm nguyên khối v5.7** — dòng 8.587–9.619 (1.035 dòng)

```
@@ script.js:8585-9619  →  script.js1.js:8852 (1 dòng) @@
-- ---------- 🔎 TRA CỨU + XEM 3D + LẤY SKIN (v5.7) ----------
;(function() local PI = {} … _G.BananaCatHub_PlayerInfo = PI … end)()
```
`script.js1.js` **không có** khối này và **không còn tham chiếu nào** tới nó (xóa sạch, không để lại rác).
Hệ quả về dòng: `-- ---------- 🔎 TRA CỨU + XEM 3D + LẤY SKIN (v5.7)` là **tiêu đề mục duy nhất** chỉ có ở `script.js`.

---

## 5. Hai tính năng khác nhau

### 5.1 👕 TRANG PHỤC NGƯỜI CHƠI — **chỉ `script.js1.js`** (6.630–6.897)

- Panel `HubOutfit_Panel` (cao 236 px) trong tab 👥 Người Chơi: **TextBox username** → `🔍 Tìm` → hiện ảnh avatar (`thumbnails.roblox.com`… thực tế là dùng `Players:GetUserIdFromNameAsync` + `GetHumanoidDescriptionFromUserId`) + nút chỉnh.
- `👕 Mặc LOCAL`: lấy `HumanoidDescription` của người được tra → `CreateHumanoidModelFromDescription` → `ApplyDescriptionReset`/`ApplyDescription` + `copyOutfit` sao chép quần áo/phụ kiện/màu da/mặt; có “chụp ảnh” bản gốc (`saveVisuals`) để khôi phục.
- `🌐 Mặc SERVER` / `↩ Khôi phục SERVER`: gọi `ReplicatedStorage.BC_OutfitRequest:InvokeServer(action, uid)`.
  ⚠️ **Thiếu phía server**: thông báo trong script nói cần `OutfitServer.server.lua` đặt trong `ServerScriptService` — **file này không có trong repo**, nên 2 nút SERVER *không dùng được ngay*.
- Về bản chất vẫn là thay đổi **phía client** (game có thể ghi đè), script ghi chú rõ điều này.

### 5.2 🔎 TRA CỨU · XEM 3D · 👕 LẤY SKIN — **chỉ `script.js`** (8.587–9.619, v5.7 + vá v5.7.5)

- Panel thêm vào **cuối** tab 👥 Người Chơi (`}, D.playerTab) D.playerY = … + PH + 8` tại dòng 8.864).
- Nhập **tên hoặc UserId** → gọi HTTP công khai của Roblox:
  `POST users.roblox.com/v1/usernames/users`, `GET users.roblox.com/v1/users/{id}`,
  `POST presence.roblox.com/v1/presence/users`, `GET thumbnails.roblox.com/v1/users/avatar`.
  Transport: ưu tiên `request` / `http_request` của executor, không có thì `S.CompatRequest` — hàm `PI.Http` ở dòng 8.622.
- **XEM 3D**: dựng rig riêng bằng `Players:CreateHumanoidModelFromDescription` + `ViewportFrame`, xoay/kéo bằng chuột (bind render `BC_PlayerViewSpin`) — không đụng nhân vật thật.
- **LẤY SKIN**: ẩn skin của bạn, mặc skin người đã tra, gắn fake model bám theo nhân vật (bind `BC_SkinFollow`); có `PI.reqId` để bỏ kết quả cũ (stale) và bản vá ghi rõ *“BẢN SỬA v5.7.5: FIX KHÔNG THẤY FAKE – ROBUST”* (dòng 8.952).
- Trạng thái được chia sẻ ra `_G.BananaCatHub_PlayerInfo` cho script khác đọc.

➡️ Hai tính năng **na ná nhau nhưng khác cách làm**: `script.js1.js` dùng “mặc đồ thật” (LOCAL/SERVER), `script.js` dùng “tra cứu + xem 3D + hoá thân”. Ai thích “mặc đồ của người khác” thì tính năng bên `script.js1.js` thiết thực hơn, nhưng bản đó thiếu v5.7 và đang chạm trần local.

---

## 6. ⚠️ Vấn đề nghiêm trọng: giới hạn **200 biến `local`** của Luau

Luật thật của Luau (đối chiếu **source chính thức, tag 0.742**, ngày 10/10/2026):

| Hằng số | Giá trị | Nơi kiểm tra |
|---|---|---|
| `kMaxLocalCount` | **200** | `Compiler/src/Compiler.cpp:5095` – `pushLocal()` → `"Out of local registers when trying to allocate %s: exceeded limit %d"` |
| `kMaxRegisterCount` | 255 | `Compiler.cpp:5372` – *Out of registers when trying to allocate N registers* |
| `kMaxUpvalueCount` | 200 | `Compiler.cpp:158` |
| `kMaxInstructionCount` | 1e9 | `Compiler.cpp:608` |

Cả script là **một hàm chính** khổng lồ ⇒ mọi `local` ở cấp ngoài cùng đều tính vào hạn mức 200.

**Chính tác giả cũng đã biết điều này** (chú thích có sẵn trong file):

| File | Dòng | Chú thích |
|---|---|---|
| `script.js` | 8.313 | `-- v5.5: bọc khối này trong hàm để không vượt giới hạn 200 local của hàm chính (Lua/Luau)` |
| `script.js` | 8.413 | `-- (gói trong 1 hàm riêng: mỗi hàm chỉ được 200 local — xem chú thích ở tests/luau/README.md)` |
| `script.js1.js` | 8.680 | (y hệt dòng trên — nhưng ở bản này **khối ObjTrack lại KHÔNG được bọc hàm**) |

**Đo đạc của tôi** (mô hình mô phỏng `localStack` của Luau: local được giải phóng khi hết `block`/nhánh `if`/vòng lặp, hàm lồng có bộ đếm riêng, tính cả biến vòng `for` và tham số hàm):

| | `script.js` | `script.js1.js` |
|---|---|---|
| Đỉnh local ở hàm chính | **197** (dòng 7.539) | **200** (dòng 8.682) |
| Còn dư | 3 slot | **0 slot** |

➡️ `script.js1.js` nằm **đúng mép trần**: chỉ cần thêm 1 biến `local` (hoặc chênh lệch nhỏ do phiên bản Luau/executor) là **nạp script thất bại ngay** với lỗi *“Out of local registers when trying to allocate … exceeded limit 200”*. Đây là **hồi quy** so với `script.js`, đúng cái mà bản vá v5.5 đã sửa.

*Sai số:* con số là ước lượng tĩnh ±vài đơn vị (mô hình không tính `self` của method, `...`, và các **register tạm** — nếu cộng register tạm thì cả 2 file đều có thể chạm ngưỡng 255 ở vài chỗ). Tôi **không chạy được Luau/Roblox trong môi trường này** để lấy số chốt. Nhưng *khoảng cách* 197 vs 200 là tín hiệu đủ rõ để kết luận bản `script.js1.js` kém an toàn hơn.

---

## 7. Rủi ro & lưu ý khác

1. **Tên file gây nhầm**: đuôi `.js` nhưng nội dung **Luau**. Nên đổi thành `taodepzai_v5_0_noir.lua` (và `…js1.lua`) để không bị hiểu là JavaScript.
2. **`script.js1.js` thiếu tính năng v5.7** — nếu bạn đang dùng bản này thì mất nguyên bộ tra cứu/xem 3D/lấy skin.
3. **Nút “🌐 Mặc SERVER”** cần `OutfitServer.server.lua` — **không có trong repo** ⇒ chỉ hiện thông báo lỗi.
4. **Phụ thuộc executor**: các hàm `request`, `writefile`, `gethui`, `getcustomasset`… được bù bằng lớp `S.compat` (dòng ~830–880), nhưng nếu executor thiếu hoàn toàn thì một số tính năng (HTTP, lưu file) sẽ im lặng không chạy.
5. **Về bản chất**: đây là script can thiệp client Roblox (ESP/bay/noclip/aimbot…) — **vi phạm Điều khoản Roblox**, mục “🔐 Anti Ban” trong script **không** đảm bảo an toàn; chỉ nên chạy ở server riêng/Studio để thử.
6. **Chú thích tham chiếu file không tồn tại**: `tests/luau/README.md` (được nhắc 2 lần) không có trong repo.
7. **`aiaiaitao3`** chỉ là bản cũ (2.499 dòng) — không có ObjTrack v5.7 lẫn trang phục; không nên dùng lẫn.
8. **Lịch sử git**: repo chỉ có **1 commit**, cả 3 file được thêm trong cùng commit đó với thông điệp chỉ nói tới `script.js1.js`, nên không thể dựa vào git để biết file nào mới hơn — phải dựa vào mã phiên bản *trong* file: `script.js` tiến xa hơn (v5.7.5) so với `script.js1.js` (dừng ở v5.6 FAST).

---

## 8. Kết luận

- Đây **không phải 2 script khác nhau** mà là **2 ngả tiến hoá** của cùng một hub: nền chung giống hệt (8.799 dòng, 91% bản nhỏ hơn), chia nhánh ở 3 điểm rất rõ.
- **`script.js` = bản đầy đủ & an toàn hơn** (v5.7 + v5.7.5, đã bọc khối ObjTrack trong hàm để giữ 197/200 local).
- **`script.js1.js` = bản thiếu v5.7 nhưng có thêm bảng trang phục**; nhược điểm chí mạng là **đã gỡ bản vá 200 local** ⇒ nguy cơ không nạp được.
- Việc “Boss Bot” làm ở commit cuối (sửa `script.js1.js`) **đã vô hiệu hoá bản vá v5.5** — nếu bot chạy lại, nên yêu cầu nó **giữ nguyên `(function() … end)()`** quanh khối ObjTrack.

---

## 9. Khuyến nghị (làm gì tiếp)

**Chọn `script.js` làm bản chính.** Nếu muốn có luôn tính năng trang phục của `script.js1.js`:

```
1) Mở script.js, tìm dòng 6.630:  -- ---------- KHUNG 📍 ĐỊNH VỊ …
2) Chèn NGAY TRƯỚC dòng đó toàn bộ script.js1.js dòng 6.630 → 6.897
   (khối bắt đầu bằng "-- Trang phục chỉ áp dụng lên Humanoid của LocalPlayer…")
   → 2 panel dùng chung biến D.playerY nên tự xếp đúng, không chồng.
3) (Tuỳ chọn) viết thêm OutfitServer.server.lua cho nút "🌐 Mặc SERVER".
4) Đổi tên file thành .lua + thêm README nói rõ đây là script Luau cho executor.
```

Nếu buộc phải dùng `script.js1.js` thì **bắt buộc** sửa hồi quy local:

```lua
-- dòng 8581
- do local OT = S.ObjTrack
+ -- v5.5: bọc khối này trong hàm để không vượt giới hạn 200 local của hàm chính (Lua/Luau)
+ ;(function() local OT = S.ObjTrack
```
…và ở dòng 8.852 đổi `… end) end` → `… end) end)()` (đúng như `script.js`).
→ sau khi bọc, đỉnh local tụt từ 200 xuống ~197.

**Cách kiểm chứng nhanh trong máy bạn**: nạp script bằng executor và xem tab Output/Console — nếu xuất hiện dòng
`Out of local registers when trying to allocate ...: exceeded limit 200` thì đúng là trúng vấn đề §6.
Trong menu, tự kiểm tra 2 tính năng: 👥 Người Chơi → panel **👕 TRANG PHỤC** (chỉ có ở `script.js1.js`) và panel **🔎 TRA CỨU · XEM 3D** (chỉ có ở `script.js`).

---

## 10. Phụ lục — cách tôi đo (chạy lại được)

Script đo nằm **ngoài repo** tại `/home/user/analysis-tmp/`:

```bash
cd /home/user/aiaiaitao3
diff script.js script.js1.js | head                       # 3 nhóm khác biệt
python3 /home/user/analysis-tmp/scope2.py   script.js script.js1.js   # đếm local theo từng hàm
python3 /home/user/analysis-tmp/luau_locals4.py script.js script.js1.js  # mô phỏng localStack của Luau
```

Đối chiếu giới hạn của Luau (tag `0.742`), tải bằng `gh api` rồi lưu tại `analysis-tmp/`:

```bash
grep -n "kMaxLocalCount\|kMaxRegisterCount\|kMaxUpvalueCount"  luau_BytecodeBuilder_0.742.h
grep -n "Out of local registers\|Out of registers when"       luau_Compiler_0.742.cpp
# BytecodeBuilder.h: kMaxLocalCount = 200 · kMaxRegisterCount = 255 · kMaxUpvalueCount = 200
# Compiler.cpp:5095 / :5372 / :158  là 3 chỗ raise lỗi tương ứng
```

*Những gì tôi KHÔNG kiểm chứng được trong môi trường này: chạy thật trên Roblox/executor, và số đếm local chính xác tuyệt đối của compiler (chỉ mô phỏng tĩnh).*
