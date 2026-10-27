# Phân tích `script.js` — hub executor Roblox "taodepzai v5.0 NOIR"

> Đối tượng: `/script.js` tại commit `40ff84b`
> Kích thước: **778.976 byte** · **7.883 dòng** (CRLF 100%) · **0 dòng chú thích**
> Cách đo: đọc tĩnh + `grep`/Python + kiểm tra cú pháp bằng **fengari (Lua 5.3)** — xem [§2](#2-cách-kiểm-chứng).

---

## 0. Kết luận nhanh (TL;DR)

1. **Đây không phải JavaScript.** Tệp đuôi `.js` nhưng nội dung là **Lua/Luau** — một **menu cheat (script hub) cho Roblox**, chạy được **chỉ trong executor** (Synapse/Delta/Codex…), không chạy trong Roblox Studio như một `LocalScript` bình thường.
2. Tên nội bộ in ra khi khởi động: **`taodepzai v5.0 NOIR`**, namespace `_G.BananaCatHub_*`, GUI tên `ExMenu`, file lưu `banana_cat_saved.json`.
3. Quy mô: **736 định nghĩa hàm**, **219 hàm top-level**, **~324 kết nối signal**, **19 `BindToRenderStep`**, **~1.379 `pcall`**. Toàn bộ nằm trong **một tệp duy nhất**, không module, không comment → **gần như không thể review bảo mật bằng mắt**.
4. Chức năng: 7 tab tĩnh + tab động (**Code, Code Đã Lưu, Script Hub, Người Chơi, Hỗ Trợ, Thiết Lập, Tạo Tính Năng, GUI Ngoài**) gồm: chạy code Lua tuỳ ý, ESP/Object Tracker, Fly, Noclip, Speed/Sprint, High-Jump/Inf-Jump, "Safe Fly" (khiên chống rơi), FreeCam, Spectate, waypoint + teleport, xem hồ sơ/presence/skin người chơi, server-hop, auto-join theo JobId, và **"Anti Ban"** (hook `Player:Kick` + tự nhảy server).
5. Về mạng: chỉ gọi **12 endpoint `*.roblox.com`** + **3 script raw GitHub** (Dex, Infinite Yield, SimpleSpy). **Không thấy** server C2 của tác giả, **không** base64/obfuscation, **không** đánh cắp cookie ra ngoài. Điểm rủi ro chính là **tải và chạy code từ GitHub không ghim commit**.
6. Về pháp lý: đây là công cụ **vi phạm Roblox Terms of Use** (exploit/cheat). "Anti Ban" chỉ chặn **thông báo kick phía client**, **không** chống được ban/kick phía server — mang lại **cảm giác an toàn sai**.

---

## 1. Nhận dạng tệp

| Thuộc tính | Giá trị |
| --- | --- |
| Tên tệp | `script.js` (đuôi gây nhầm) |
| Nội dung thực | Lua 5.3 / Luau, style minify “nhiều câu lệnh trên một dòng” |
| Mã hoá | UTF-8, xuống dòng **CRLF** toàn bộ (7.883/7.883) |
| Số dòng | 7.883 (dòng cuối không có newline) |
| Ký tự / byte | 755.025 ký tự / 778.976 byte |
| Dài dòng TB / tối đa | 94,8 / **550** ký tự |
| Comment | **0** — `grep -c '^\s*--'` = 0 (chỉ có 2 hằng chuỗi chứa `--` ở dòng 273) |
| Hàm | 736 `function`; 224 chỗ khai báo `local function` |
| Cuối tệp | Chuỗi `print("✅ taodepzai v5.0 NOIR — sẵn sàng! …")` |

**Vì sao chỉ chạy trong executor** — các API dưới đây **không tồn tại** trong Roblox chuẩn (không thể chạy như `LocalScript`):

```lua
game:HttpGet(url)                 -- 11 chỗ: API riêng của executor
loadstring(code)()                -- 15 chỗ: chạy code động
hookfunction(player.Kick, ...)    -- 10 chỗ: hook hàm
getgenv() / getfenv(0)            -- 8 + 4 chỗ
request / http_request / syn.request / http.request
setclipboard / writefile / readfile / identifyexecutor / queue_on_teleport
gethui()                          -- đưa GUI vào CoreGui ẩn
```

> Lưu ý: `script.js` **không được** README, `package.json`, `tools/`, `tests/` hay `docs/01–09` nhắc tới. Nó **tách biệt hoàn toàn** với dự án "Roblox Anti-Lag Optimizer" (`src/`, `dist/`) đang được tài liệu hoá trong repo.

---

## 2. Cách kiểm chứng

Mọi con số trong tài liệu này đều tái lập được:

```bash
# 1) Kích thước / dòng / CRLF
wc -c -l script.js
python3 -c "d=open('script.js','rb').read(); print(d.count(b'\r\n'), d.count(b'\n'))"

# 2) Đếm cấu trúc
grep -c 'local function ' script.js
grep -o 'function [A-Za-z_][A-Za-z0-9_.]*' script.js | sort | uniq -c | sort -rn | head
grep -o ':Connect(' script.js | wc -l
grep -o 'BindToRenderStep' script.js | wc -l
grep -o 'pcall(' script.js | wc -l

# 3) Endpoint
grep -oE 'https?://[a-z.]+roblox\.com[^" )]*' script.js | sort -u
grep -oE 'https?://raw\.githubusercontent\.com[^" )]*' script.js | sort -u

# 4) Kiểm tra cú pháp bằng Lua 5.3 thật (fengari)
npm i --prefix /tmp/luachk fengari@0.1.4
node -e "…luaL_loadstring(script.js)…"     # → PARSE OK, 763.800 ký tự
```

Kết quả chạy thực tế:

Đoạn kiểm tra tối thiểu (đã chạy thật):

```js
// /tmp/luachk/check.js
const fs = require('fs');
const {lua, lauxlib, lualib, to_luastring, to_jsstring} = require('fengari');
const L = lauxlib.luaL_newstate(); lualib.luaL_openlibs(L);
const status = lauxlib.luaL_loadstring(L, to_luastring(fs.readFileSync(process.argv[2], 'utf8')));
console.log(status === lua.LUA_OK ? 'PARSE OK' : 'PARSE FAIL: ' + to_jsstring(lua.lua_tostring(L, -1)));
```

```
$ node check.js script.js      → PARSE OK
$ node check.js script.js1.js  → PARSE OK
$ node check.js aiaiaitao3     → PARSE FAIL: [string "..."]:1199: syntax error near '+'
                                 (dòng 1199 dùng `e+=0.1` — cú pháp riêng của Luau)
```

> Kết luận: `script.js` **hợp lệ cả Lua 5.3 và Luau**; bản `aiaiaitao3` thì không (chỉ Luau).

---

## 3. Kiến trúc tổng thể

```
script.js  (1 tệp, 7.883 dòng)
│
├─ [1] BOOTSTRAP / DỌN DẸP (dòng 1–40)
│     huỷ _G.BananaCatHub_Connections, StopAll watchdog, UnbindFromRenderStep(*),
│     Destroy ExMenu / BC_* HUD cũ, dựng trackConn() + giới hạn 300 kết nối
│
├─ [2] UI KIT (dòng ~40–250)
│     C = bảng màu (nền tối #0B0C11, accent vàng #F0C97A)
│     New() / Corner() / Stroke() / Tween() / D.Paint, D.Shade, D.Glow, D.Tactile…
│     AddTab(name, icon, order) → ScrollingFrame + nút tab; RightControl để mở/đóng
│
├─ [3] CORE (dòng 250–860)
│     S.PagePerf   : tạm dừng tính năng khi tab/menu không hiển thị
│     S.SanitizeCode / S.NormalizeRunnable / ExecOnce / RunCode  (chạy code)
│     S.EnsureCompat: bù các hàm executor còn thiếu (xem §6)
│     Store         : lưu/đọc JSON (xem §7)
│
├─ [4] CÔNG CỤ HỖ TRỢ (dòng ~560–1545)
│     script nhanh (Dex/IY/SimpleSpy), phân tích vật thể, toạ độ, aim tâm,
│     thước tốc độ (SV), hệ thống nhúng GUI vào tab (S.EmbedGui, S.HookInstanceNew)
│
├─ [5] MV — MOVEMENT (dòng 1546–2565, 143 hàm)
│     Noclip, Fly (+Carpet/Glass/AutoGlass/PlayerFly/ObjFly), Speed/Sprint,
│     HighJump/InfJump, Safe (khiên + BodyVelocity), watchdog tự tắt khi lỗi
│
├─ [6] SCRIPT HUB + PERF (dòng 2566–3078)
│     danh sách script, tìm server, hop, Perf (CPU / giảm tầm nhìn / giảm lag)
│
├─ [7] LOC / CAMERA / GLOW (dòng 3079–3827)
│     định vị người chơi, spectator, FreeCam, hiệu ứng glow
│
├─ [8] OT — OBJECT TRACKER (dòng 3828–4410, 56 hàm)
│     quét BasePart quanh người chơi, Highlight/BoxHandleAdornment/BillboardGui,
│     lưu – chọn – copy path/position – bay tới
│
├─ [9] PI — PLAYER INFO (dòng 4422–7717, 78 hàm)
│     HTTP tới Roblox API, hồ sơ, presence, bạn bè, tìm server của người chơi,
│     join, skin/outfit (HumanoidDescription, InsertService:GetObjects), avatar ảo
│
└─ [10] THIẾT LẬP + KHỞI ĐỘNG (dòng 7718–7883)
      thẻ lưu trữ / xuất–nhập JSON / chẩn đoán executor / nút xoá dữ liệu
      main.Visible = true, print banner
```

### Phân bố theo namespace

| Namespace | Số hàm | Vai trò |
| --- | ---: | --- |
| `S` | 182 | lõi: state, UI, store, embed, hop, perf-gate, anti-ban |
| `MV` | 143 | di chuyển: fly / noclip / speed / jump / safe-shield |
| `PI` | 78 | Player Info: HTTP, profile, presence, skin, avatar |
| `OT` | 56 | Object Tracker (ESP vật thể) |
| `D` | 17 | thư viện vẽ UI (Paint/Shade/Glow/Tactile…) |
| `Perf` | 16 | tối ưu đồ hoạ + khôi phục thuộc tính |
| `SV` | 9 | đo tốc độ thực (studs/s) |
| `Store` | 8 | lưu/đọc/phiên bản hoá dữ liệu |
| khác | ~227 | hàm cục bộ, closure UI, helper |

---

## 4. Vòng đời thực thi

1. **Dọn phiên bản cũ** (dòng 1–40): disconnect mọi connection cũ trong `_G.BananaCatHub_Connections`, `task.cancel` watchdog, `RunService:UnbindFromRenderStep` cho 18 tên bước dựng, `Destroy` các GUI `ExMenu`/`BC_*`, xoá highlight cũ trong `workspace`.
2. **Dựng GUI**: `ScreenGui` tên `ExMenu` (ưu tiên `gethui()` để ẩn khỏi PlayerGui), khung chính **540×340**, `UIScale` tự co giãn (`BcFit`) theo `AbsoluteSize`, nút mở/đóng + phím **RightControl**.
3. **Tạo tab** (dòng 248–251, 558, 1400, 2566, 3154, 7718): thứ tự 1…7 = `Code Đã Lưu → Code → Script Hub → Người Chơi → Hỗ Trợ → Thiết Lập → Tạo Tính Năng`; tab `GUI Ngoài` (order 99) sinh động khi có GUI được nhúng.
4. **Nạp dữ liệu**: `Store.load()` đọc `banana_cat_saved.json` (version 3), khôi phục script đã lưu, waypoint, tab tính năng, skin, object-track đã lưu.
5. **Đăng ký module**: mỗi nhóm gắn hàm vào `S`/`MV`/`PI`/`OT`, đăng ký `_G.BananaCatHub_*` để lần load sau dọn được.
6. **Chạy theo yêu cầu** (không auto-run): người dùng bấm ▶ → `RunCode` → `SanitizeCode` → `NormalizeRunnable` → `EnsureCompat` → `loadstring` → `pcall`.
7. **Vòng lặp nền**: các bước `BindToRenderStep` chỉ hoạt động khi tính năng bật, và bị `S.PagePerf` giảm tần suất khi tab/menu đang ẩn.

### Pipeline chạy code (điểm quan trọng nhất về an toàn)

```lua
ExecOnce(code, name)
  code = S.SanitizeCode(code)      -- chỉ gỡ marker wrapper cũ, KHÔNG lọc code
  code = S.NormalizeRunnable(code) -- tự bọc "https://…" thành loadstring(game:HttpGet(...))()
  S.EnsureCompat()                 -- bù hàm executor thiếu
  pcall(function()
      local fn, err = loadstring(code); if not fn then error(err) end; fn()
  end)
```

- `S.SanitizeCode` **không phải** bộ lọc bảo mật (tên dễ gây hiểu nhầm): nó chỉ `gsub` một chuỗi `pcall(function() _ForceStretch(g) end)` do chính hub sinh ra.
- `NormalizeRunnable` biến **một URL trần** thành `loadstring(game:HttpGet(url))()` — tức là dán link là chạy code từ Internet.
- Code chạy trong **cùng môi trường** với hub: có toàn quyền `_G`, GUI, file, clipboard.

---

## 5. Bản đồ tính năng

| Nhóm | Tính năng | Cơ chế (theo code) | Phụ thuộc executor |
| --- | --- | --- | --- |
| Code | Chạy Lua, chạy lặp N lần + delay, Dừng (cancel thread) | `loadstring` + `task.spawn` + `task.cancel` | ✅ bắt buộc |
| Code | Lưu script, Code Đã Lưu, xuất/nhập JSON | `writefile`/`readfile` + `HttpService:JSONEncode` | ⚠️ thiếu thì chỉ giữ RAM |
| Code | Nhúng GUI do script tạo vào tab "GUI Ngoài" | hook `Instance.new`, bắt `ScreenGui`, reparent + `UIScale` | ⚠️ cần `hookfunction` hoặc ghi đè `Instance.new` |
| Script Hub | Dex / Infinite Yield / SimpleSpy | `loadstring(game:HttpGet(raw.githubusercontent…))()` | ✅ |
| Người Chơi | Hồ sơ, presence, ảnh đại diện, bạn bè | 12 endpoint Roblox API + fallback `Players:GetUserThumbnailAsync` | ⚠️ cần `request`/`HttpGet` |
| Người Chơi | Tìm server của người khác, auto-join theo JobId | `games.roblox.com/.../servers/Public` + `TeleportToPlaceInstance` | ✅ |
| Người Chơi | Skin/outfit, avatar ảo, "giữ đồ" | `HumanoidDescription`, `InsertService:GetObjects`, clone rig cục bộ | ⚠️ phần lớn là **client-side** |
| Người Chơi | Gửi yêu cầu outfit lên server | `RemoteFunction` **BC_OutfitRequest** (phải tự cài trong game của bạn) | ➖ tuỳ game |
| Hỗ Trợ | Phân tích vật thể dưới chân/tâm màn hình, highlight tím, copy path/toạ độ | raycast + `Highlight` + `SelectionBox` | ⚠️ |
| Hỗ Trợ | "Ngắm tâm" (aim dot + auto-aim trong vòng) | `BindToRenderStep("BC_AnaAim")` + camera | ⚠️ |
| Di chuyển | **Fly** theo camera | `BodyVelocity` + `BindToRenderStep("Fly", Camera+1)` | ⚠️ |
| Di chuyển | Noclip | quét `BasePart` + `CanCollide=false`, khôi phục khi tắt | ⚠️ |
| Di chuyển | Speed / Sprint / High-Jump / Inf-Jump | `Humanoid.WalkSpeed`, `JumpPower`, `ChangeState` | ⚠️ |
| Di chuyển | "Safe" — khiên/noclip tự động chống rơi | `BodyVelocity` + part khiên + tự repair | ⚠️ |
| Camera | FreeCam, Spectate người chơi | `Camera.CameraType = Scriptable`, `BC_Spec` | ⚠️ |
| Object Tracker | ESP vật thể: hộp, tên, khoảng cách, lọc, lưu | `Highlight`/`BoxHandleAdornment`/`BillboardGui`, quét theo nhịp | ⚠️ |
| Tối ưu | CPU / giảm tầm nhìn (fog + Atmosphere) / giảm lag nhẹ | ghi – lưu – khôi phục thuộc tính (`Perf.Saved`) | ⚠️ |
| Server | Hop server thường / **server vắng ≤3 người** / theo JobId | `games.roblox.com` + `TeleportToPlaceInstance` | ✅ |
| An toàn | **Anti Ban**: hook `Player:Kick`, bắt `GuiService.ErrorMessageChanged`, `PlayerRemoving`, `TeleportInitFailed` → tự hop | `hookfunction` | ✅ (xem §9) |

---

## 6. Lớp tương thích executor (`S.EnsureCompat`, dòng 382–403)

Hub tự “bù” các hàm thiếu để tính năng đỡ crash:

| Hàm thiếu | Shim thay thế | Hệ quả |
| --- | --- | --- |
| `loadstring` | `load(src)` | chạy được nhưng khác ngữ nghĩa môi trường |
| `getgenv/getrenv` | trả `_G` | code tưởng có môi trường riêng |
| `request` / `http_request` / `http` | `S.CompatRequest` → `HttpService:RequestAsync`, fallback `game:HttpGet`/`HttpPost` | **không có cookie**, giới hạn endpoint |
| `writefile/readfile/…` | **ổ đĩa ảo** trong RAM (`S.vfs`) | UI cảnh báo “REJOIN LÀ MẤT” — trung thực |
| `setclipboard` | lưu `S.clipboardTxt` | người dùng không thấy gì trong clipboard |
| `hookfunction` | `function(_, nw) return nw end` | **hook không có tác dụng nhưng vẫn “thành công”** ⚠️ |
| `Drawing` | bảng giả, mọi thứ no-op | ESP kiểu Drawing không vẽ |
| `queue_on_teleport` | chỉ lưu vào `S.queued` | không tự chạy lại sau teleport |
| `identifyexecutor` | trả `"taodepzai v5.0 NOIR-Compat"` | chỉ để hiển thị |

**Điểm mạnh:** `Store.canWrite()` kiểm tra `S.Shimmed("writefile")` nên **không lưu nhầm vào ổ đĩa ảo**; UI minh bạch chế độ lưu.

**Điểm yếu (lỗi thật):** `AntiBanArm` kiểm tra `type(hookfunction) == "function"`, mà shim **cũng là function** ⇒ trên executor **không có** `hookfunction`, anti-ban sẽ “hook” qua shim, **không chặn được gì**, nhưng panel vẫn báo `🔐 Anti Ban: BẬT` và tăng biến đếm `hops`. Đây là **an toàn giả**.

---

## 7. Lưu trữ dữ liệu

| Hạng mục | Giá trị |
| --- | --- |
| Tệp | `banana_cat_saved.json` trong thư mục workspace của executor |
| Phiên bản schema | `SAVE_VERSION = 3`, có cảnh báo nếu file mới hơn |
| Nội dung | `scripts[]`, `waypoints[]`, `features[]`, `savedSkins[]`, `autoUseSkin`, `savedObjTracks[]`, `settings{embedEnabled, embedGuessNew, parkCodeGuis, hubFavs}` |
| Fallback | `_G.BananaCatHub_SavedData` (chỉ trong phiên) + ổ đĩa ảo |
| Xuất/nhập | JSON qua clipboard; nhập **ghép theo tên** (`uniqueName`) — **không ghi đè** |
| Mã hoá | ❌ không — JSON thuần, đọc được bằng bất kỳ ai |
| Tự chạy khi import | ❌ **không** — chỉ tạo tab/danh sách, phải bấm ▶ (điểm cộng) |

Rủi ro: file dùng chung cho **mọi game**, chứa code người dùng đã dán; nếu ai đó lừa bạn import JSON của họ rồi bạn bấm ▶ thì code đó chạy với toàn quyền.

---

## 8. Mạng & dữ liệu ra ngoài

**12 endpoint Roblox** (đều hợp lệ, chỉ đọc thông tin công khai):

| Endpoint | Dùng cho |
| --- | --- |
| `users.roblox.com/v1/usernames/users` | đổi tên → UserId |
| `users.roblox.com/v1/users/{id}` | hồ sơ, mô tả |
| `presence.roblox.com/v1/presence/users` | online / đang chơi game nào |
| `friends.roblox.com/v1/users/{id}/friends` | danh sách bạn |
| `thumbnails.roblox.com/v1/users/avatar*`, `/v1/batch` | ảnh đại diện (headshot/avatar, Png/Webp) |
| `games.roblox.com/v1/games/{placeId}/servers/Public` | danh sách server (hop) |
| `games.roblox.com/v1/games?universeIds=`, `apis.roblox.com/universes/v1/places/{id}/universe`, `develop.roblox.com/v1/universes/{id}/places` | đổi place ↔ universe, tìm server |
| `www.roblox.com/users/{id}/profile` | nút copy link hồ sơ |

**3 script bên thứ ba** (chỉ tải khi người dùng bấm nút trong Script Hub):

```
raw.githubusercontent.com/infyiff/backup/main/dex.lua
raw.githubusercontent.com/EdgeIY/infiniteyield/master/source
raw.githubusercontent.com/78n/SimpleSpy/main/SimpleSpyBeta.lua
```

Nhận xét:
- ✅ **Không** có domain lạ, **không** webhook Discord, **không** `string.char`/base64/`\x` giải mã, **không** chuỗi nhúng khổng lồ bị obfuscate (literal lớn nhất chỉ 1.414 ký tự, là template tiện ích).
- ⚠️ `PI.Http` ưu tiên `request` của executor ⇒ với endpoint `roblox.com`, request **có thể kèm cookie phiên** (`.ROBLOSECURITY`), tuỳ executor. Bản thân script không gửi cookie đi đâu khác, nhưng đây là lý do phải **tin executor**.
- ⚠️ 3 URL GitHub trỏ vào **nhánh `main`/`master`** — chủ repo đổi nội dung là máy bạn chạy code mới, **không kiểm tra hash**. Đây là **rủi ro chuỗi cung ứng** thực sự của tệp này.

---

## 9. "Anti Ban" & server hop — thực tế làm được gì

Cơ chế (`S.AntiBan*`, dòng ~2410–2470):

```lua
hookfunction(player.Kick, function(...)
    if a.on then S.AntiBanHop("kick") return end   -- nuốt lệnh Kick phía client
    return old(...)
end)
GuiService.ErrorMessageChanged → nếu text khớp danh sách ("kicked", "banned", "exploit detected",
                                                          "anti-cheat", …) → hop
Players.PlayerRemoving (chính mình) → hop
TeleportService.TeleportInitFailed  → hop lại
cooldown 10 s, tối đa 3 lần thử join/1 lần hop
```

Giới hạn cần nói rõ:

1. `Player:Kick` là **method phía client**; server **vẫn** ngắt kết nối. Hook chỉ **ẩn thông báo** và kích hoạt hop — **không** cứu được tài khoản khỏi ban.
2. Ban/flag phía server (anti-cheat, moderator, `BanAsync`) **không đi qua** hàm này.
3. Danh sách chuỗi khớp rất rộng (`"anti-cheat"`, `"kicked by"`) ⇒ **false positive**: game hiện thông báo không liên quan cũng có thể làm bạn bị nhảy server giữa ván.
4. Tự hop liên tục là **hành vi bất thường** — dễ bị hệ thống anti-cheat/analytics gắn cờ hơn là giúp tránh bị gắn cờ.
5. Như §6: trên executor thiếu `hookfunction`, tính năng này **im lặng không hoạt động** nhưng UI vẫn báo BẬT.

---

## 10. UI/UX

- Theme tối, accent vàng, font Gotham qua `FontFace`, gradient + stroke + glow; khung **540×340**, `UIScale` **BcFit** giữ tỉ lệ trên mobile.
- Kéo được cả menu và nút nổi; khoá kéo `🔒`; phím tắt **RightControl**; `ReleaseHubFocus` xử lý bàn phím ảo.
- Hỗ trợ **touch** (`Enum.UserInputType.Touch`) và joystick ảo trong bản `script.js1.js`.
- Thông báo trạng thái ngay trong hub (`D.Say`), nút “flash” phản hồi, bảng “VÙNG NGUY HIỂM” có xác nhận 2 bước cho thao tác xoá dữ liệu.
- Điểm trừ: nhồi rất nhiều nhãn tiếng Việt + emoji trong chuỗi cứng ⇒ khó i18n; mọi toạ độ đặt bằng `UDim2.new(0, x, 0, y)` tuyệt đối, dễ vỡ khi đổi kích thước chữ.

---

## 11. Chất lượng mã — số liệu

| Chỉ số | Giá trị | Nhận xét |
| --- | ---: | --- |
| Tệp / dòng | 1 / 7.883 | ✗ monolith |
| Comment | 0 | ✗ không thể bảo trì bằng người mới |
| Hàm | 736 | — |
| `pcall` | 1.379 | ⚠ nhiều, phần lớn **bỏ qua lỗi** |
| `warn()` | 5 | ✗ gần như không có log lỗi |
| `:Connect(` | 324 | ⚠ nhiều, có `trackConn` + cap 300 |
| `.Activated` | ~214 | — |
| `BindToRenderStep` | 19 bước riêng | ⚠ mỗi bước là một chi phí render |
| `task.spawn` | 22 | ⚠ vòng lặp nền |
| `GetDescendants()` | 22 | ⚠ quét cây scene |
| GUI tạo ra | 133 TextLabel, 81 TextButton, 74 Frame, 36 TextBox, 11 ScrollingFrame, 10 ScreenGui | ⚠ nặng |
| `_G` | 27 ghi / 60 đọc | ⚠ namespace toàn cục dễ đụng hub khác |
| `tick()` | 31 | ✗ API deprecated (nên `os.clock`/`time`) |

**Điểm mạnh (công bằng):**

- Có **dọn dẹp phiên cũ** rất kỹ (unbind, disconnect, destroy) — tránh nhân đôi hiệu ứng khi load lại.
- `trackConn` + cap 300 kết nối ⇒ có ý thức chống memory leak.
- `S.PagePerf` **tạm dừng tính toán theo tab/menu** — đúng hướng tối ưu.
- `Perf` ghi–lưu–khôi phục thuộc tính, có `RestoreAll` ⇒ tắt là trả game về như cũ.
- Storage có version + kiểm tra kiểu dữ liệu + không auto-run khi import.
- Toàn bộ I/O ra ngoài đều `pcall`, có fallback (HttpGet → request → compat).
- **Không** có dấu hiệu mã độc (không obfuscate, không C2, không đọc cookie).

**Điểm yếu cấu trúc:**

- Không tách module, không type, không test; repo có harness fengari cho `src/` nhưng **không** áp dụng cho tệp này.
- Trùng lặp phiên bản: `script.js` và `script.js1.js` chỉ khác **75 dòng** (bản `1` có thêm Fly-HUD joystick), không có nhãn version trong tệp ⇒ không biết bản nào là chuẩn.
- `_G.BananaCatHub_*`, `ExMenu`, `BC_*` là tên toàn cục dễ xung đột với hub khác.

---

## 12. Vấn đề / lỗi cụ thể

| # | Vị trí | Vấn đề | Mức |
| --- | --- | --- | --- |
| 1 | `S.EnsureCompat` 382–403 + `S.AntiBanArm` ~2440 | Shim `hookfunction` khiến anti-ban “bật nhưng vô dụng” | 🔴 |
| 2 | `S.AntiBanArm` | Hook `Player:Kick` **không** chống ban server-side; hop dựa trên chuỗi dễ false-positive | 🔴 |
| 3 | `S.HookInstanceNew` 1195–1235 | Ghi đè **`Instance.new` toàn cục** để bắt ScreenGui; có thể phá script khác, xung đột khi 2 hub cùng hook, chỉ khôi phục nếu `Instance.new == st.ours` | 🟠 |
| 4 | `S.SanitizeCode` 274 | Tên gây hiểu nhầm: **không** lọc code nguy hiểm, chỉ gỡ marker nội bộ | 🟠 |
| 5 | `NormalizeRunnable` 407 | Dán URL trần ⇒ tự `loadstring(game:HttpGet(url))()` — biến ô nhập thành bàn đạp tải code | 🟠 |
| 6 | `Perf` (dòng ~2625) | Chỉ khôi phục thuộc tính khi bấm tắt (`Perf.Stop`); **không** có `BindToClose`/`OnTeleport` dự phòng. Hệ quả nhẹ vì fog/Atmosphere là thuộc tính phía client và tự reset khi rejoin | 🟡 |
| 7 | Toàn tệp | 1.379 `pcall`, chỉ 5 `warn` ⇒ lỗi bị nuốt, người dùng thấy “không có gì xảy ra” | 🟠 |
| 8 | `tick()` ×31 | API deprecated; `tick()` từng bị sai lệch/không nhất quán | 🟡 |
| 9 | `PI.ResolveUser` | `Player:GetFriendsOnline()` là API cũ/không ổn định — chỉ còn là fallback | 🟡 |
| 10 | `Store` | JSON không mã hoá, dùng chung mọi game, không giới hạn kích thước | 🟡 |
| 11 | `script.js` vs `script.js1.js` | Hai bản song song, không metadata, dễ sửa nhầm bản | 🟡 |
| 12 | `aiaiaitao3` (bản cũ trong repo) | **Không parse được** bằng Lua 5.3: dòng 1199 dùng `e+=0.1` (chỉ Luau) ⇒ không thể kiểm tra tự động bằng harness hiện có | 🟡 |

---

## 13. Rủi ro bảo mật & pháp lý

| Rủi ro | Mức | Giải thích |
| --- | --- | --- |
| Vi phạm Roblox ToS | 🔴 cao | Dùng executor + fly/noclip/ESP/aim = gian lận; hậu quả từ khoá tài khoản đến ban vĩnh viễn |
| Executor là bên thứ ba | 🔴 cao | Hub chạy **trong** executor; executor có toàn quyền với máy/tài khoản — niềm tin đặt sai chỗ là mất tài khoản |
| Code từ GitHub | 🟠 | 3 URL không ghim commit; repo bị chiếm là chạy mã lạ |
| Code do người khác dán/import | 🟠 | Chạy với toàn quyền: xoá dữ liệu, gửi request, … (may mắn: không auto-run) |
| Hook toàn cục | 🟠 | `Instance.new`, `Player:Kick` ảnh hưởng mọi script khác trong cùng VM |
| Quyền riêng tư | 🟡 | Gọi API Roblox cho bạn bè/presence; nếu dùng `request` của executor thì request có thể kèm phiên đăng nhập (`.ROBLOSECURITY`). Dữ liệu **không** rời khỏi Roblox, nhưng là hành vi tự động hoá và phụ thuộc độ tin cậy của executor |
| “Anti Ban” | 🟡 | Không bảo vệ thật, chỉ trì hoãn nhận biết; hop liên tục còn tạo tín hiệu bất thường |

> Kết luận đạo đức/kỹ thuật: nếu mục tiêu là **học Lua/Roblox UI**, tệp này là ví dụ tốt về UI kit + quản lý connection + fallback executor. Nếu mục tiêu là **dùng trong game người khác**, hãy coi rủi ro ban là **chắc chắn xảy ra**, không phải “có thể”.

---

## 14. Hiệu năng

- **19** bước `BindToRenderStep` (mỗi bước chạy mỗi frame) + **22** `task.spawn` + **22** lần `GetDescendants` trên toàn scene: khi bật nhiều tính năng, chi phí CPU/khung hình tăng tuyến tính.
- Giảm tải: `S.PagePerf` hạ tần suất khi menu ẩn; Object Tracker quét theo nhịp (`TickOne`, `ScanSlice` — cắt nhỏ theo frame); `Perf.RestoreAll` có `yieldEvery`.
- Rò rỉ tiềm ẩn: `D.Glow` tạo Frame phụ + `GetPropertyChangedSignal` cho mỗi nút; `trackConn` chỉ giới hạn 300 nên phần dư **không** được disconnect ⇒ sau nhiều giờ có thể tích tụ.
- GUI 133 `TextLabel` dựng sẵn: bộ nhớ UI lớn nhưng chấp nhận được với executor.

---

## 15. Khuyến nghị

**Nếu bạn chỉ muốn hiểu/học từ tệp này**
1. Đọc theo thứ tự: UI kit (`New`, `D.*`) → `PagePerf` → `Store` → `RunCode` → `MV` (đơn giản nhất) → `PI` (HTTP) → `OT`.
2. Chạy `fengari` để kiểm cú pháp sau mỗi lần sửa (bản `script.js` hiện **hợp lệ Lua 5.3**).
3. Đối chiếu với bản có comment `aiaiaitao3` (2.499 dòng) — dễ đọc hơn nhiều so với bản minify.

**Nếu bạn định bảo trì nó**
1. **Tách tệp**: `ui/`, `store.lua`, `runner.lua`, `movement.lua`, `playerinfo.lua`, `objtrack.lua`, `perf.lua`; build lại bằng `tools/build.js` sẵn có.
2. **Đổi tên** `script.js` → `hub.lua`/`dist/*.luau` để editor và GitHub nhận đúng ngôn ngữ; bỏ 3 bản trùng.
3. **Thêm comment + type Luau** ở các hàm public; giữ tối thiểu 1 dòng mô tả cho mỗi `S.*`.
4. **Ghim commit** cho 3 URL GitHub (thay `main`/`master` bằng SHA) hoặc tải sẵn vào `dist/` kèm hash.
5. **Bỏ “Anti Ban”**: nó không bảo vệ được gì, chỉ tăng rủi ro và làm sai lệch trạng thái UI.
6. **Đổi `tick()` → `os.clock()/time()`**, thay `pcall` “nuốt lỗi” bằng log có ngữ cảnh (tăng `warn`).
7. **Không hook `Instance.new` toàn cục**; nếu cần bắt GUI, dùng `ScreenGui` diff theo `ChildAdded` trên `PlayerGui`/`CoreGui` và giới hạn thời gian.
8. **Thêm test**: harness `tests/` + `tools/test-harness/run.js` đã có thể tái dùng để chạy các hàm thuần (Store, NormalizeRunnable, ParseServerCode).
9. **Khôi phục trạng thái chắc chắn**: đăng ký `Players.LocalPlayer.OnTeleport`/`game:BindToClose` để gọi `Perf.RestoreAll`.

---

## 16. Phụ lục — 5 “tệp lạ” trong repo

| Tệp | Kích thước | Nội dung thật | Quan hệ |
| --- | ---: | --- | --- |
| `script.js` | 779 KB / 7.883 dòng | **Lua** — hub executor v5.0 NOIR (bản mới nhất, bỏ Fly-HUD) | Đối tượng phân tích |
| `script.js1.js` | 785 KB / 7.917 dòng | **Lua** — cùng hub, **có thêm** Fly-HUD joystick; khác 75 dòng | Bản song song |
| `aiaiaitao3` | 92 KB / 2.499 dòng | **Lua** — bản cũ, **có comment** đầy đủ, dùng `+=` (Luau) | Tiền thân dễ đọc |
| `script.js2.js` | 29 KB / 784 dòng | **Lua** — dự án khác: “DOORS ENTITY RADAR”, `--!strict`, không exploit | Không liên quan |
| `index.html.1.js` | 532 KB / 8.707 dòng | **HTML** — trang có CSS “fake-ad”/video-ad | Không liên quan |

Cả 5 tệp đều **không** được README, `package.json`, `tools/`, `tests/` tham chiếu. Nếu mục tiêu là dọn repo, đây là nhóm nên chuyển vào thư mục `legacy/` (hoặc xoá) để tránh nhầm lẫn với dự án `src/` đang được tài liệu hoá.

---

### Tóm lại một câu

`script.js` là **một menu cheat Roblox hoàn chỉnh 779 KB, viết bằng Lua, không comment, chạy bằng executor** — kỹ thuật UI/quản lý tài nguyên đáng học, nhưng **không thể kiểm toán**, **vi phạm ToS**, và tính năng “Anti Ban” chỉ là **an toàn giả**.

---

## 17. Cập nhật: tách tính năng "lấy trang phục" (theo yêu cầu)

### 17.1 Đã làm gì

| Việc | Chi tiết |
| --- | --- |
| **Tách** toàn bộ cụm skin/outfit khỏi `script.js` | 3D viewer, Mặc LOCAL, Trả skin, Lưu skin, Tự mặc, Phân loại skin (xoá món), Nhân vật ảo, `PI.ServerOutfitAction` |
| **Giữ** trong tab Người Chơi | Tra cứu hồ sơ, presence, ảnh đại diện, tìm Mã Server (JobId), 📋 copy, 🚀 vào server |
| **Xuất** sang tệp riêng | [`outfit-local.lua`](../outfit-local.lua) — script độc lập, tự chứa, có UI riêng |
| **Không** đụng tới | `script.js1.js`, `aiaiaitao3` (giữ nguyên bản gốc để đối chiếu) |

### 17.2 Số liệu trước / sau

| | Trước | Sau |
| --- | ---: | ---: |
| `script.js` | 778.976 B · 7.883 dòng | **611.251 B · 5.556 dòng** (−167.725 B ≈ −21,5% · −2.327 dòng · −104 hàm) |
| Số `function` | 736 | 632 |
| Cú pháp (fengari 5.3 + luaparse) | OK | **OK** |

### 17.3 Cách kiểm chứng phần đã cắt

```bash
# 1) Cú pháp
node /tmp/luachk/check.js script.js          # → PARSE OK

# 2) Không còn biến "mồ côi": so sánh danh sách global trước/sau
#    (một biến local bị xoá mà còn dùng sẽ biến thành global ⇒ lộ ra ngay)
luaparse.parse(script.js, {scope:true}).globals   # → không có global mới

# 3) Không còn field PI.* bị gọi mà chưa định nghĩa
#    → tập "PI.* được dùng" trừ "PI.* được định nghĩa" = rỗng

# 4) Không còn chuỗi UI của tính năng cũ
grep -c "Mặc LOCAL\|XEM 3D\|PHÂN LOẠI SKIN\|skinStatus" script.js   # → 0
```

Kết quả thật của cả 4 bước: **đạt**. Tab Người Chơi giờ chỉ còn panel "🔎 TRA CỨU HỒ SƠ · MÃ SERVER · VÀO SERVER" (cao 242 px, ảnh 220×160).

### 17.4 Tệp mới `outfit-local.lua`

- ~1.370 dòng, tự chứa, **không** phụ thuộc hub; chạy trực tiếp trong executor.
- UI riêng: cửa sổ 452×356 kéo được, nút nổi 🧥, phím **RightControl**.
- Tính năng: Tra cứu (tên / @tên / UserId) · xem 3D · 👕 Mặc LOCAL · ↩ Trả skin · 💾 Lưu · ⚡ Tự mặc · 🗂 Danh sách · 🧩 bỏ phụ kiện · 📋 copy UserId.
- Lưu tại `outfit_local_v1.json` (fallback RAM nếu executor thiếu `writefile`).
- **Không** có: "mặc lên server" (cần RemoteFunction `BC_OutfitRequest` trong game của bạn), danh sách "giữ/xoá từng món" chi tiết như bản gốc (chỉ bỏ/khôi phục toàn bộ phụ kiện), anti-ban.
- Cảnh báo giữ nguyên: chỉ đổi phía client, vi phạm Roblox ToS khi dùng trong game người khác.

### 17.5 Nếu muốn khôi phục

`git show 40ff84b:script.js > script-old.js` (hoặc `git checkout 40ff84b -- script.js`) — bản gốc vẫn nằm trong lịch sử Git.
