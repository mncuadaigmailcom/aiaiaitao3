# 📋 Phân tích `script.js` — Banana Cat Hub v4.4f

> Ngày phân tích: 2026-09-13 · Commit: `5506911` · Nhánh: `arena/01a09a39-aiaiaitao3`

## 0. Điều đầu tiên cần nói: file này KHÔNG phải JavaScript

| Thuộc tính | Giá trị |
|---|---|
| Tên file | `script.js` |
| Ngôn ngữ thật | **Luau** (Lua của Roblox) — dùng `+=`, `math.clamp`, `task.*`, `Instance.new` |
| Kích thước | 208.130 byte · **4.928 dòng** · CRLF 100% |
| Bản | `v4.4f` (header L2, title bar L289, log khởi động L4923) |
| Loại | Script **executor/exploit** cho Roblox (menu hub chạy client-side) |

Đuôi `.js` làm editor highlight/lint sai hoàn toàn (ESLint/Prettier sẽ báo lỗi đầy màn hình,
trong khi code Luau thì hợp lệ). Nên đổi thành `BananaCatHub.lua`.

Repo còn 1 file `aiaiaitao3` (3.513 dòng, LF, không đuôi) = **bản cũ v4.4a của chính script này**,
trùng ~70% nội dung → 344 KB code đôi. Lịch sử đã nằm trong git, không cần giữ bản sao.

---

## 1. Số liệu tổng quan (đo bằng tokenizer Lua tự viết)

| Chỉ số | Giá trị | Ghi chú |
|---|---|---|
| Token | 68.506 (67.347 token code) | |
| Định nghĩa hàm | **257** | 81 hàm có tên, còn lại anonymous/closure |
| Dòng nằm trong hàm | 4.082 / 4.928 (**83%**) | |
| **Local cấp chunk chính** | **187 / 200** | ⚠️ Luau giới hạn 200 local/function |
| Hàm dài nhất | template `S.FeatureTemplate` 370 dòng (L3400–3769) | phần lớn là chuỗi `[==[ ]==]` |
| `New(...)` tạo instance | 159 | 110 gán vào local |
| `:Connect(` | 79 | **chỉ 15** được `trackConn()` |
| `pcall(` | 107 | **chỉ 3** có `warn()`/log |
| Comment | 358 dòng (~7%) + header changelog 5 KB | chất lượng comment "tại sao" rất tốt |
| Long string nhúng | 9 khối, 19.184 byte | lớn nhất 5.789 byte = template tính năng (L3404) |
| Emoji trong source | 243 ký tự | |
| Dòng dài nhất | 226 ký tự (L2818) | |
| Cú pháp | ngoặc **cân bằng**, `if/do/function … end/until` **về depth 0** | không phát hiện lỗi biên dịch |
| Secret bị commit | **0** (đã quét `AIza…`, `sk-…`, `ghp_…`) | ✅ |

### Bản đồ file

| Dòng | Khối |
|---|---|
| 1–64 | Header changelog v4.4f/4.4e/4.4a |
| 67–143 | Service, `targetGui` (gethui → CoreGui → PlayerGui), dọn connection/GUI cũ, helper `New/Corner/Stroke/Tween` |
| 145–226 | `ReleaseHubFocus`, ScreenGui `ExMenu`, nút 🍌, khung `main`, `Hit` (hit-test không phụ thuộc parent) |
| 227–504 | Resize handle, tab system (`AddTab`/`SwitchTab`), tạo 2 tab đầu |
| 505–551 | Bảng trạng thái `S` (gom local để né trần 200) |
| 552–835 | **`Store`** — lưu/nạp `banana_cat_saved.json` (file → `_G` → none), `ExecOnce`, `Cancel`, `RunCode` |
| 837–993 | TAB 1 "Code": nhập code, lặp N lần, delay giây/phút, chạy/dừng/lưu |
| 994–1235 | TAB 2 "Code Đã Lưu": search, expand xem code, copy, chạy, xóa, nhãn trạng thái + 🔄 Nạp lại |
| 1236–2074 | TAB 3 "Hỗ Trợ": 3 quick script (Dex/Infinite Yield/SimpleSpy), **phân tích vật thể bằng chuột phải + long-press mobile**, highlight tím, panel POS/SIZE/ROT/LOOK/STATE/HP (RenderStepped), teleport, waypoint |
| 2075–2939 | TAB 4 "AI AI": chat Gemini (`AskGemini`), lịch sử hội thoại, parse ```code```, quản lý API key |
| 2940–3398 | TAB 5 "Tạo Tính Năng" core: `NormalizeCode`, `ScanNewGuis`, `ForceStretchToParent`, registry nhúng GUI (`S.RegisterEmbed/RestoreEmbed/DropEmbed/PruneEmbeds`), **FIT scale** (`S.MeasureHost/SnapSubtree/FitEmbedded`), API công khai `_G.BananaCatHubAPI` |
| 3399–3770 | FEATURE TEMPLATE (code mẫu ~5,8 KB sinh cho người dùng/AI: size contract, external overlay, crosshair) |
| 3771–3974 | Sync embeds, `S.EmbedGui`, crosshair toàn cục |
| 3975–4343 | `RunFeatureScript` (hook `Instance.new` để bắt GUI của script), `CreateFeatureTab` (toolbar 6 nút + editor) |
| 4344–4784 | UI tab 5, nút 🧩 nhúng, 🕵 đoán GUI trễ, 📏 sinh wrapper, 🖱 cứu chuột, 📋 copy template, danh sách tab đã tạo |
| 4785–4928 | Khôi phục tab tính năng từ đĩa, toggle menu/drag/kéo nút 🍌, phím tắt RightCtrl, log khởi động |

---

## 2. Điểm mạnh thật sự (đáng giữ)

1. **Hiểu rõ giới hạn Luau**: 187/200 local cấp chunk — tác giả biết và chủ động gom state vào
   bảng `S`, `Store`, `Hit` kèm comment giải thích (L233, L510, L558). Đây là loại bug "chết cả
   script" mà rất ít người biết.
2. **Race condition đã được xử lý đúng**: comment L793–797 giải thích `task.spawn` chạy ngay tới
   yield đầu tiên nên không thể dùng `curThread == nil` làm cờ kết thúc → dùng `runActive`.
3. **Persistence có suy nghĩ**: version check khi đọc file (L708), validate số hữu hạn trước khi ghi
   waypoint (`Store.isFinite`), debounce 0.3 s (L688), **không ghi đè file khi JSON hỏng** (L640–644),
   fallback `_G` khi executor thiếu `writefile`.
4. **Không phá GUI của game** (bài học từ v4.4a): bỏ quét CoreGui, whitelist `GAME_OWNED_GUI_NAMES`,
   hook `Instance.new` + so `coroutine.running()` để chỉ nhận GUI đúng thread (L4005–4012),
   snapshot Position/Size/Parent và **trả về nguyên trạng** khi rút embed (L3088–3106),
   có safe mode 🧩 TẮT và nút "cứu nguy" 🖱 (L4569).
5. **FIT bằng bounding box + scale đồng đều** (L3121–3293) thay vì ép `Size=(1,0,1,0)` — có
   `RestoreSnap` để idempotent, có `align()` chặn lặp vô hạn bằng `tries < 2`.
6. **Chống click nhầm 3 lớp** ở `PickObjectAt` (L1679): check cả PlayerGui + CoreGui, nhận diện
   GuiButton/Active/transparency, và **giữ nguyên kết quả cũ khi raycast trượt** (L1770–1779).
7. **Changelog trong header** là tài liệu kỹ thuật tốt: mỗi fix đều ghi nguyên nhân gốc.
8. Tự làm sạch khi chạy lại: disconnect toàn bộ `_G.BananaCatHub_Connections`, destroy `ExMenu`
   và `BananaCatHub_Crosshair` cũ (L86–101, L188).

---

## 3. 🐞 Bug & rủi ro chức năng (xếp theo mức độ)

### A. `Place: ...` không bao giờ hiện + retry mỗi frame — L1625–1629
```lua
local coordUpdateConn = RunService.RenderStepped:Connect(function()   -- L1550
    ...
    if placeLbl.Text == "Place: ..." then
        pcall(function()
            local info = game:GetService("MarketplaceService"):GetProductInfo(game.PlaceId)
```
`GetProductInfo` là call **yield** (HTTP), còn callback `RenderStepped` chạy trên render thread và
không yield được → `pcall` nuốt lỗi → text vẫn là `"Place: ..."` → **frame nào cũng thử lại**
(60 lần/giây, mỗi lần là 1 pcall + 1 request lỗi).
**Fix:** đưa ra ngoài, chạy 1 lần trong `task.spawn(...)` khi khởi động, thêm cờ `placeFetched`.

### B. RenderStepped chạy vô điều kiện — L1550–1631
Mỗi frame: `FindFirstChildOfClass("Humanoid")`, `GetRootPart()` (5 lần `FindFirstChild`),
`GetGroundPosition()` = **1 raycast 500 studs** (L1529–1548), ~10 phép so Vector3 + `string.format`
— kể cả khi menu đang đóng (`main.Visible == false`) hoặc người dùng không ở tab "Hỗ Trợ".
**Fix:** guard `if not (main.Visible and supportTab.Visible) then return end`, hoặc chuyển sang
`Heartbeat` + throttle 0.1 s (giá trị tọa độ không cần 60 Hz).

### C. Search rebuild toàn bộ list trên mỗi phím gõ — L1233
```lua
searchIn:GetPropertyChangedSignal("Text"):Connect(RebuildScripts)
```
`RebuildScripts` (L1077–1231) destroy + tạo ~10 instance cho **mỗi** script. Gõ 5 ký tự với 50
script ≈ 2.500 instance tạo/hủy → khựng thấy rõ.
**Fix:** debounce 0.15–0.25 s (`task.delay` + cờ), hoặc lọc bằng `Visible` thay vì rebuild.

### D. "🔄 Nạp lại" có thể **xóa trắng GUI đang nhúng** — L4791–4810
`Store.restoreFeatures` destroy `ft.frame` (bên trong là `ScriptHost` đang chứa các frame con mà
hub "mượn" từ ScreenGui của script người dùng) **mà không gọi `S.ClearEmbedsUnder(hostFrame)` trước**.
Handler xóa tab (L4713) và nút 🖱 (L4576) đều làm đúng bước này → đây là điểm không nhất quán.
Hậu quả: frame con bị Destroy theo host, ScreenGui gốc thành rỗng, không khôi phục được.
**Fix:** thêm đúng 3 dòng như L4711–4714 vào vòng lặp tháo tab.

### E. `API:ExternalGui` — fallback chết + không pcall — L3376–3390
```lua
g.Parent = (gethui and gethui()) or game:GetService("CoreGui")
            or (player and player:WaitForChild("PlayerGui"))
```
`GetService("CoreGui")` **luôn** truthy → nhánh PlayerGui là code chết. Đồng thời phép gán
`g.Parent` không bọc pcall: executor nào chặn ghi CoreGui sẽ văng lỗi thẳng vào script tính năng
(đúng loại lỗi mà phần còn lại của hub luôn phòng thủ).
**Fix:** bọc pcall từng bậc: `gethui()` → CoreGui → PlayerGui.

### F. Version không đồng bộ — L3358
`_G.BananaCatHubAPI.Version = "4.4e"` trong khi header/title/log là `4.4f`.
Script bên ngoài check version sẽ nhận sai. **Fix:** khai báo `local VERSION = "4.4f"` một chỗ
duy nhất ở đầu file, mọi nơi tham chiếu vào đó.

### G. Xóa waypoint dùng index bắt từ closure — L2059
```lua
for i, wp in ipairs(waypoints) do ... delBtn.Activated:Connect(function() table.remove(waypoints, i) ...
```
Đây chính là lớp lỗi mà changelog v4.4a tuyên bố đã sửa ở tab tính năng ("closure giữ index cũ"),
và `RebuildScripts` (L1213–1218) đã chuyển sang tìm theo **identity** (`if s == d then`).
Waypoint vẫn dùng index → khi list đổi mà chưa rebuild (hoặc có 2 nguồn sửa cùng lúc) sẽ xóa nhầm dòng.
**Fix:** `for idx, w in ipairs(waypoints) do if w == wp then origIdx = idx break end end`.

### H. Nút 🎯 crosshair leak trong `S.crosshairBtns` — L3962–3972
`table.insert(S.crosshairBtns, btn)` nhưng không có đường gỡ khi tab tính năng bị xóa/khôi phục lại
(L4791 tạo lại toàn bộ tab → mỗi lần "Nạp lại" cộng thêm một loạt nút chết). Không crash (có
pcall + check `b.Parent`) nhưng mảng phình và mỗi lần toggle phải duyệt rác.
**Fix:** lọc `S.crosshairBtns` trong `S.PruneEmbeds()`/`restoreFeatures`, hoặc trả về handle
`{Disconnect=}` như `S.OnResized` (L3315) đã làm.

### I. "📋 Copy chat" cho ra text bị lặp + lẫn nhãn người gửi — L2885–2916
`extract()` cộng text của node rồi **đệ quy vào con của chính node đó** → label lồng nhau bị lặp;
đồng thời gom cả `senderLbl` ("👤 Bạn", "🤖 Gemini") vào nội dung.
**Fix:** duyệt có chủ đích — chỉ lấy các TextBox/TextLabel là con **trực tiếp** của
`contentContainer`, bỏ qua `senderLbl`, không đệ quy khi đã lấy text.

### J. AI tab: giả định môi trường executor không được kiểm tra — L2696–2760
- `HttpService.HttpEnabled = true` (L2697): property chỉ set được phía **server**; từ client là
  lỗi → pcall nuốt → dòng này vô nghĩa.
- `HttpService:RequestAsync` (L2748): Roblox **chặn HTTP từ LocalScript**
  ([docs](https://create.roblox.com/docs/cloud-services/http-service)) → chỉ chạy được nhờ executor
  hook. Khi executor không có, người dùng nhận `❌ Lỗi kết nối: attempt to call method 'RequestAsync' (a nil value)`
  — thông báo khó hiểu.
- `maxRetries = 3` (L2743) nhưng nhánh lỗi mạng `if not ok then return ...` (L2759) **return ngay
  lần đầu** → retry chỉ có tác dụng với HTTP 429.
**Fix:** probe một lần (`local canRequest = type(HttpService.RequestAsync) == "function" or request or syn`),
hiện trạng thái "cần executor hỗ trợ HTTP" trên `keyStatus`; gộp lỗi mạng vào vòng retry.

### K. Code chết / tham số chết (nhỏ nhưng nên dọn)
- L1721 `if gui then table.insert(filterList, gui) end` — `gui` là ScreenGui của hub (nằm trong
  `gethui()`/CoreGui), không phải descendant của `workspace` → filter không có tác dụng.
- L1679 tham số `isRightClick` của `PickObjectAt` **không được dùng** trong thân hàm (xuất hiện
  đúng 1 lần trong cả file).
- L3009–3028 `ForceStretchToParent`: nhánh đệ quy `maxDepth` giờ chỉ được gọi với `maxDepth=0`
  (L3864) → phần đệ quy là dead code (giữ lại chỉ vì comment "đừng dùng").

### L. Hai cơ chế resize chồng nhau — L3777 (signal) + L4316–4340 (poll 0.15 s)
`main:GetPropertyChangedSignal("Size")` → `BcFit()` (debounce 0.05 s) → `S.SyncAllEmbeds()`;
song song có vòng `task.wait(0.15)` cũng gọi `S.SyncAllEmbeds()` khi `AbsoluteSize` đổi.
→ mỗi lần kéo menu, fit chạy 2 lần. Vòng poll chỉ thật sự cần cho `S.PruneEmbeds()` (dọn entry chết)
và dọn `_G.BananaCatHub_EmbedHosts` (mảng legacy **không còn được ghi** ở bản này — L4330).
**Fix:** poll giãn 1–2 s, bỏ phần so `AbsoluteSize`; xóa hẳn khối legacy `_G.BananaCatHub_EmbedHosts`.

### M. Wrapper sinh ra cho người dùng cũng leak connection — L4535
```lua
hub:GetPropertyChangedSignal("AbsoluteSize"):Connect(function() pcall(_bcSync) end)
```
Không bao giờ Disconnect → mỗi lần chạy bản "📏 Code Tự Co Giãn" là thêm 1 connection sống bám
vào frame của hub (hub chạy lại nhiều lần trong 1 phiên là chuyện thường). `us.Scale` còn
hard-code `hub.AbsoluteSize.X / 540` (540 = width mặc định của `main`, L215).
**Fix:** trong template, lưu connection vào biến và ngắt ở `bcClose()`; lấy 540 từ
`API.Main`/hằng số do hub cung cấp.

---

## 4. 🔐 Bảo mật

| Mức | Vấn đề | Dòng | Khuyến nghị |
|---|---|---|---|
| 🔴 Cao | **API key Gemini nằm trên URL query** → lọt vào log proxy/lịch sử executor | L2701 | Dùng header `x-goog-api-key` (Gemini hỗ trợ), bỏ `?key=` |
| 🔴 Cao | Key lưu **plaintext** `banana_cat_gemini_key.txt` + đẩy vào `_G.BananaCatHub_GeminiKey` → **mọi script khác trong cùng executor đọc được** | L2572–2578 | Bỏ `_G` (chỉ dùng file), cân nhắc cảnh báo người dùng rằng key nằm trên đĩa; dùng key có quota thấp |
| 🟠 Trung bình | **RCE by design**: `loadstring(game:HttpGet(url))()` với Dex/Infinite Yield/SimpleSpy từ nhánh `main`/`master` + `NormalizeCode` tự bọc **bất kỳ URL nào người dùng dán** thành code thực thi, không hỏi xác nhận | L1245–1247, L2946–2954 | Pin **commit SHA** thay vì branch; hiện dialog xác nhận trước khi chạy link lạ; `NormalizeCode` đã chặn ký tự điều khiển/`"` ✅ (giữ nguyên) |
| 🟠 Trung bình | Monkey-patch `Instance.new` **toàn cục** bằng gán biến (không `hookfunction`/`newcclosure`); khi restore `Instance.new = realNew` sẽ **đè mất hook của script khác** đang chain | L4005–4022, L4487 | Ưu tiên `hookfunction` nếu executor có; nếu không, đọc lại `Instance.new` hiện hành trước khi ghi đè (giữ chain) |
| 🟡 Thấp | `safetySettings: BLOCK_NONE` cho cả 4 danh mục + system prompt ép model viết code đầy đủ | L2735–2740 | Chấp nhận được cho use-case, nhưng nên ghi chú cho người dùng |
| 🟡 Thấp | Asset ngoài `rbxassetid://9822602710` (nền caro) — nếu bị moderated thì mất nền | L268 | Có fallback màu/`BackgroundTransparency` |
| ✅ | Không có secret nào bị commit; không có telemetry/endpoint lạ ngoài Gemini + 3 raw GitHub | — | — |

---

## 5. ⚡ Hiệu năng

1. **RenderStepped không điều kiện** (mục B) — raycast 500 studs + ~15 phép tính/frame, kể cả khi
   menu đóng. Đây là khoản tốn nhất của script.
2. **Rebuild-on-keystroke** ở tab 2 (mục C) và `arrowBtn` expand cũng rebuild cả list (L1192–1196).
3. **107 `pcall` nhưng chỉ 3 có log** → lỗi bị nuốt im lặng, rất khó debug trên máy người dùng.
   Nên có helper `safe(label, fn)` log 1 dòng `warn` khi fail (có thể tắt bằng cờ debug).
4. `S.FitEmbedded` được gọi 3 lần cho mỗi embed (ngay, +0.08 s, +0.4 s — L3867–3869) **cộng** với
   mỗi lần kéo menu (2 cơ chế, mục L) → mỗi lần fit là `SnapSubtree` + 2×`apply` + 2×`MeasureHost`
   trên toàn subtree. Với GUI tính năng vài trăm node thì kéo menu sẽ giật.
5. `AddMessage` không giới hạn số bubble trong `chatScroll` (L2347) → phiên chat dài phình instance
   (mỗi message là 1 Frame + 1 Frame + 1 Label + N TextBox code + UIListLayout + UIPadding).
   Nên cắt bớt khi vượt ~60 bubble.
6. `_G.BananaCatHub_Connections` chỉ track **15/79** connection. Connection trên instance (chết
   theo `ExMenu`) thì vô hại, nhưng connection trên **service toàn cục** mới là thứ phải track:
   L1797/L1806 (`holdConn`/`moveConn` cho touch long-press) tạo connection tạm **không** track →
   chạy lại script đúng lúc đang giữ ngón tay sẽ để lại connection mồ côi.

---

## 6. 🏗 Kiến trúc & khả năng bảo trì

### Rủi ro số 1: trần 200 local của Luau (187/200)
Chỉ còn **13 slot**. Thêm bất kỳ `local` cấp chunk nào nữa (kể cả `local x` tạm trong lúc debug)
→ `Out of local registers` → **toàn bộ script không chạy**. Comment trong file đã cảnh báo, nhưng
đây là quả bom hẹn giờ: mỗi tính năng mới đều phải "nhét vào bảng".

**Cách sửa tận gốc (không phải nhét bảng mãi):** bọc mỗi TAB vào một hàm dựng, trả về bảng tham chiếu:
```lua
local function BuildSupportTab(parent, deps)      -- scope local MỚI, 200 slot mới
    local analyzeObjectEnabled = false
    ...
    return { objResultPanel = objResultPanel, PickObjectAt = PickObjectAt }
end
local Support = BuildSupportTab(supportTab, {RunCode = RunCode, Store = Store, S = S, C = C})
```
Làm vậy sẽ giải phóng ~120 slot cấp chunk (phần lớn 187 local là widget UI: `objNameLbl`,
`objClassLbl`, `tpXIn`, `wpNameIn`, `aiBG`, `chatScroll`, …). Sau đó mới nên thêm tính năng mới.

### Các vấn đề kiến trúc khác
- **1 file 4.928 dòng, không module**: UI + storage + AI + embed engine + template trộn chung.
  Với executor, có thể tách bằng `loadstring(game:HttpGet(...))()` theo module, hoặc ít nhất
  phân vùng bằng `do … end` + comment banner nhất quán (hiện đã có banner, tốt).
- **Layout tính tay bằng pixel cộng dồn**: 4 con trỏ `y`/`sy`/`posY`/`cy` + magic number
  (L4412: `304, cy - 34, 122`; L4414: `164, cy, 262`; L4416: `8, cy, 418`). Với `minW = 440` (L322),
  nút 164+262 = 426 đã sát mép; nhãn `fStatus` dùng `UDim2.new(1,-52-316,…)` (L4207) → menu hẹp
  thì width âm. Hub **không responsive** cho chính nó (trong khi GUI của tab tính năng thì được
  scale rất công phu) — nghịch lý đáng sửa: chuyển tab content sang `UIListLayout` + `Size` theo Scale.
- **Trạng thái suy ra từ text của nút**: `if unitBtn.Text:find("Phút")` (L956) — đổi nhãn là đổi
  hành vi. Nên giữ biến `delayUnit = "s"`.
- **Lặp code**: khối "tìm tên duy nhất" xuất hiện 4 lần (L981–986, L4272–4281, L4545–4554,
  L4616–4624) → tách `UniqueName(list, base)`. Tương tự, `Button()`/`Label()` (L816–836) rất tốt
  nhưng 110 chỗ vẫn `New("TextBox", {...})` lặp lại cùng bộ property → thêm `TextBox(parent, props)`,
  `Row(parent, h)`.
- **26 dòng code lặp >3 lần** (đo được): `TextXAlignment=…, ZIndex=7` (21×), `Font=Enum.Font.GothamBold` (18×)
  → hệ quả của việc thiếu preset/theme. Đã có bảng màu `C` ✅, nên thêm bảng `Font`/`ZIndex`.
- **Magic delay rải rác**: 0.05/0.08/0.15/0.2/0.25/0.3/0.4/0.6/1.2/1.4/1.5/2.4/2.6/4 s — phần lớn
  là "chờ 1 render step". Nên gom vào `local TIMING = { renderStep = 0.08, fit2 = 0.4, debounce = 0.3 }`.
- **Không có test**: toàn bộ logic thuần (`Store.serialize/load`, `ParseSegments`, `S.SanitizeCode`,
  `S.FitEmbedded` math, `NormalizeCode`) đều test được ngoài Roblox bằng Luvit/busted/`luau` CLI
  nếu tách ra module. Hiện chưa có gì bảo vệ chống hồi quy — trong khi file đã có 6 bản vá liên tiếp.
- **Changelog nằm trong header** (5 KB) → nên chuyển sang `CHANGELOG.md`, giữ header ngắn.

---

## 7. 🗂 Vệ sinh repo

| Vấn đề | Đề xuất |
|---|---|
| `script.js` chứa Luau | `git mv script.js BananaCatHub.lua` |
| `aiaiaitao3` = bản v4.4a trùng lặp, không đuôi | xóa (đã có trong git history) hoặc `git mv` thành `legacy/v4.4a.lua` |
| `script.js` CRLF, `aiaiaitao3` LF | thêm `.gitattributes`: `*.lua text eol=lf` |
| Không README | README: version, cách load, yêu cầu executor (`gethui`, `writefile`, HTTP client-side), cảnh báo API key, danh sách tính năng |
| Không `.gitignore` | thêm (dù repo chưa có artifact) |
| Chỉ 1 commit cho 8.440 dòng | nên commit theo từng fix để bisect được |
| 2 dòng dùng tab, 0 dòng trailing-space | ✅ sạch; chạy `stylua` với config 4-space để đồng nhất |

---

## 8. 🎯 Roadmap đề xuất (theo thứ tự lợi ích/công sức)

**Làm ngay (< 1 giờ, sửa bug thấy được):**
1. Đưa `GetProductInfo` ra khỏi RenderStepped (mục A) — 5 dòng.
2. Guard RenderStepped theo `main.Visible` (mục B) — 2 dòng.
3. `S.ClearEmbedsUnder` trong `Store.restoreFeatures` (mục D) — 3 dòng.
4. Debounce search 0.2 s (mục C) — 6 dòng.
5. `Version = VERSION` đồng bộ 4.4f (mục F) — 2 dòng.
6. Fix `extract()` copy chat (mục I) — 10 dòng.
7. Fallback parent + pcall cho `API:ExternalGui` (mục E) — 5 dòng.

**Bảo mật (1–2 giờ):**
8. Key sang header `x-goog-api-key`, bỏ `?key=` (mục 🔴 1).
9. Bỏ ghi key vào `_G`; probe `RequestAsync` và báo lỗi rõ (mục J).
10. Pin commit SHA cho Dex/IY/SimpleSpy + xác nhận trước khi chạy link.

**Kiến trúc (nửa ngày, mở khóa mọi thứ phía sau):**
11. Tách 5 tab thành 5 hàm `Build*Tab()` → hạ local cấp chunk từ 187 xuống ~40.
12. Tách `Store`, `Embed/S.Fit`, `Gemini`, `Template` thành 4 khối `do…end` có banner rõ
    (hoặc module nạp bằng `loadstring`).
13. Thay layout pixel bằng `UIListLayout` cho tab content; gom preset `Font/ZIndex/TIMING`.
14. Thêm `UniqueName()`, `TextBox()` helper; xóa dead code (L1721, `isRightClick`, nhánh đệ quy
    `ForceStretchToParent`, khối legacy `_G.BananaCatHub_EmbedHosts`).
15. Test ngoài Roblox cho `ParseSegments`, `S.SanitizeCode`, `Store.serialize/load`, math của `FitEmbedded`.
16. Repo: đổi đuôi `.lua`, xóa file trùng, `.gitattributes`, `README.md`, `CHANGELOG.md`.

---

## ✅ Cập nhật 2026-09-13 — đã sửa thành bản **v4.4g** (theo yêu cầu "GUI tính năng không vào menu sau khi vào lại game")

| Mục trong báo cáo | Trạng thái |
|---|---|
| Bug D — "🔄 Nạp lại"/khôi phục tab làm **mất GUI đang nhúng** | ✅ đã sửa (trả GUI về ScreenGui gốc trước khi destroy) |
| Bug F — `API.Version` kẹt "4.4e" | ✅ đã sửa (đồng bộ 4.4g ở header/title/API/log) |
| Mục 🔐 — gỡ hook `Instance.new` **đè mất hook script khác** | ✅ đã sửa (chỉ gỡ khi hook của hub còn trên cùng) |
| **Lỗi chính người dùng báo**: bấm ▶ sau khi vào lại game thì GUI không nằm trong menu | ✅ đã sửa (xem dưới) |
| Bug A/B (RenderStepped + `GetProductInfo`), C (search rebuild mỗi phím), E (`ExternalGui`), G (waypoint index), H (leak nút 🎯), I (copy chat lặp), J (AI/HTTP) | ⏳ chưa đụng tới (không liên quan yêu cầu này) |

**Nguyên nhân gốc của lỗi "GUI không vào menu"** (đã xác minh bằng test, không phải đoán):
`RunFeatureScript` cũ chỉ nhận ScreenGui được tạo **đúng coroutine của người bấm nút**, và nhúng
**ngay khi thấy ScreenGui** (kể cả lúc chưa có frame con), và **bỏ cuộc sau 2.4 s** không thử lại.
Kết quả đo được trên 4 kịch bản (mô phỏng Roblox bằng Lua + scheduler giả):

| Kịch bản script tính năng | Code cũ (v4.4f) | Code mới (v4.4g) |
|---|---|---|
| A. Tạo GUI đồng bộ | ✅ nhúng được | ✅ nhúng được |
| B. Tạo ScreenGui trước, thêm frame con sau 1 s | ❌ rớt ngoài menu | ✅ nhúng được |
| C. Dựng GUI trong `task.delay(5)` | ❌ rớt ngoài menu | ✅ nhúng được |
| D. Dựng GUI trong `task.spawn` (khác luồng) | ❌ rớt ngoài menu | ✅ nhúng được |
| **Tổng** | **1/4** | **4/4** |

Cả 4 trường hợp ❌ ở bản cũ đều báo *"✅ xong · script không tạo GUI nào để nhúng (bình thường)"*
— đúng thông báo gây hiểu lầm mà người dùng gặp.

**Cách sửa (giữ nguyên mọi tính năng cũ):**
1. `S.HookInstanceNew()` — ghi nhận **mọi** ScreenGui sinh ra trong lúc hook còn sống, kèm điểm
   tin cậy (`certain` / `duringRun` / `age`) thay vì chỉ nhận đúng 1 coroutine.
2. `S.IsEmbeddable()` — chờ GUI "chín" (có ≥1 frame con) + chặn GUI của hub, GUI hệ thống/game,
   overlay `BCHub_External`, GUI đã nhúng ở tab khác; trả về **lý do** để hiện lên nhãn.
3. `S.EmbedRecorded(mode)` — nhúng theo mức tin cậy `strict/run/any/all`.
4. Vòng chờ 3 s + **thử lại ở 0.6/1.8/4/7 s**, giữ hook 7 s; nhãn trạng thái tự cập nhật khi nhúng muộn.
5. **Mở tab tính năng là tự nhúng lại** (`S.OnFeatureTabOpened`).
6. Nút mới **🔁 "Cứu GUI"** ở tab Tạo Tính Năng (+ `S.RescueScan` quét GUI lạ nằm ngoài, có lọc).
7. **Lưu 🧩/🕵 xuống đĩa** (`settings` trong `banana_cat_saved.json`, save version 3) — trước đây
   hai công tắc này nhảy về mặc định sau khi vào lại game.
8. Nhãn trạng thái nói rõ **lý do** không nhúng được, thay vì "bình thường".

**Kiểm chứng:** 21 unit test + 12 test end-to-end (Lua 5.x + Roblox API giả lập) = **33/33 PASS**;
syntax toàn file **OK**; khối `if/do/function … end` **cân bằng**; **local cấp chunk vẫn 187/200**
(không thêm local nào — mọi thứ mới gắn vào bảng `S`/`Store`); line endings vẫn **CRLF 100%**.

---

## ✅ Cập nhật 2026-09-13 (lần 2) — bản **v4.4h**: "GUI tính năng VẪN nằm ngoài menu"

Phản ánh: sau bản v4.4g, GUI của script tính năng **vẫn nằm ngoài menu hub** — cả lần tạo đầu tiên
lẫn sau khi thoát game vào lại. Điều tra ra **3 nguyên nhân**, trong đó 1 cái là regression do chính
bản v4.4g gây ra và 1 cái là lỗ hổng thiết kế có từ đầu.

### Nguyên nhân 1 — REGRESSION của v4.4g: lọc TÊN GUI áp dụng cho MỌI trường hợp

`S.IsEmbeddable()` của v4.4g chặn mọi ScreenGui có tên nằm trong `GAME_OWNED_GUI_NAMES`
(`Main, InGame, Notifications, Topbar, Chat, Backpack, ExMenu, …`). Nhưng chính template của hub lại
đặt `gui.Name = BC.Name` (tên tính năng do người dùng đặt), và **rất nhiều script tự đặt tên ScreenGui
là `Main`/`InGame`/`Notifications`**. Kết quả: GUI của script bị hub từ chối **oan** → nằm ngoài menu.
Bản v4.4f chỉ lọc tên ở nhánh "đoán", nên ca này v4.4f lại chạy được — tức v4.4g làm hỏng.

**Cách sửa:** chia mức tin cậy (trust) thay vì lọc tên vô điều kiện:

| trust | khi nào | có bị lọc tên? |
|---|---|---|
| `certain` | hook bắt đúng luồng của người bấm ▶ | **không** (chỉ chặn tên UI hệ thống thật) |
| `manual` | GUI sinh ra trong lúc script của tab chạy, hoặc người dùng bấm 🔁 | **không** (chỉ chặn tên UI hệ thống thật) |
| `guess` | hub chỉ đoán từ diff-scan, không có tín hiệu sở hữu | có (chặn cả `Main/InGame/Notifications`) |

Tên UI hệ thống thật của Roblox (`Topbar, TopbarContainer, PlayerList, Chat, Backpack, DevConsoleUI,
ScriptInvitationUI, FollowPromptUI, TouchControlsFrame, PauseMenu, CoreGui, ExMenu`) thì **luôn** bị
chặn ở mọi mức — nên không thể ăn nhầm UI của game (giữ đúng ràng buộc "không làm mất tính năng").

### Nguyên nhân 2 — executor CHẶN ghi đè `Instance.new` → hub "mù", không biết GUI nào là của script

Toàn bộ cơ chế nhận diện GUI dựa vào hook `Instance.new`. Nhiều executor (hoặc bản cập nhật chống
hook) khiến phép gán đó **thất bại** → `mine`/`records` rỗng → hub không nhúng gì, mà nhãn còn báo
"bình thường" nên không ai biết vì sao.

**Cách sửa — 4 lớp, không lớp nào phụ thuộc lớp nào:**

1. **Probe kiểm chứng hook:** sau khi gán, hub tự tạo thử một `ScreenGui` (không gắn Parent, hủy ngay)
   để xác nhận lời gọi **thật sự đi qua** hàm của mình → `state.available`. Có executor cho gán nhưng
   bỏ qua hook; trước đây hub không phân biệt được.
2. **`hookfunction` dự phòng:** nếu gán thất bại và executor có `hookfunction` (Synapse/Xeno/Wave/Delta…)
   thì hook bằng cách đó; khi gỡ thì **trả lại đúng hàm gốc** cho executor.
3. **Watcher `ChildAdded`** trên `PlayerGui` / `gethui()` / `CoreGui` — lớp **không cần hook**: GUI được
   script gắn lên màn hình **trong lúc script của tab đang chạy** thì gần như chắc chắn là của tab
   (tín hiệu sở hữu theo *thời điểm*, mạnh không kém hook).
4. **Quét diff an toàn** tự bật khi hook chết (`available == false`): chỉ nhận GUI **mới xuất hiện**,
   **có frame con**, và **không mang tên UI hệ thống** → vẫn không bốc nhầm UI của game.

### Nguyên nhân 3 — LỖ HỔNG THIẾT KẾ: chạy script ở tab 💻 Code thì KHÔNG BAO GIỜ nhúng GUI

Hub có **hai** đường chạy script:

| đường chạy | hàm | có nhúng GUI vào menu? |
|---|---|---|
| tab ➕ **Tạo Tính Năng** → ▶ Chạy Script | `RunFeatureScript` | có (đã sửa ở v4.4g/v4.4h) |
| tab 💻 **Code** / 💾 **Code Đã Lưu** / 🛠 **Hỗ Trợ** → ▶ | `RunCode` → `ExecOnce` | **KHÔNG** (trước v4.4h) |

Nghĩa là nếu người dùng dán script vào tab Code (hoặc chạy từ danh sách script đã lưu / tab Hỗ Trợ)
thì GUI **luôn** nằm ngoài menu — lần đầu cũng như sau khi vào lại game. Đây rất có thể là ca đang gặp.

**Cách sửa (thêm mới, không đụng hành vi cũ):** `RunCode` nay cũng chụp GUI — nhưng **chỉ ở lần chạy
đầu tiên** rồi nhả hook ngay (không giữ hook suốt 1000 lần lặp, vừa nặng vừa dễ ăn nhầm UI game tạo
ra về sau). GUI bắt được sẽ đậu vào tab mới **🧩 GUI Ngoài**:

- tab chỉ được tạo **khi thật sự có GUI để đưa vào** (không tạo tab rỗng);
- mỗi GUI một **ô riêng cao 240 px**, xếp dọc, kèm nút **↩ Trả về game** (gọi `S.ClearEmbedsUnder`
  → trả frame con về ScreenGui gốc, khôi phục Position/Size, hủy host);
- tối đa **2 GUI/lần chạy** (`S.PARK_MAX`) để không "nuốt" cả UI của game;
- nhãn nút hiển thị số GUI đang đậu: `🧩 GUI Ngoài (2)`;
- **tắt 🧩 "Nhúng GUI vào menu" là hành vi trở về đúng như cũ** (không hook, không tạo tab) —
  đã có test kiểm chứng (P7).

### Kèm theo: chẩn đoán ra console (F9)

Mỗi lần bấm ▶ (cả tab Tính Năng lẫn tab Code) hub in một dòng:

```
[BananaCatHub] ▶ 'Auto Farm' · hook=OK (ghi đè Instance.new) · ghi nhận 2 GUI (chắc chắn 2, watcher 0, quét 0) · nhúng=BẬT · lý do cuối: — · đã nhúng: 1
[BananaCatHub] 🔍 bỏ qua GUI 'Topbar' (hook, certain): là GUI của game/hệ thống (Topbar)
```

`hook=` cho biết ngay executor có chặn hook không (`OK` / `cài được nhưng KHÔNG ăn` / `BỊ CHẶN`),
và **từng GUI bị bỏ qua kèm lý do** → hết cảnh "không nhúng mà không biết vì sao". Nhãn trạng thái
trong tab cũng báo "⚠️ Executor CHẶN hook Instance.new — hub đã dùng chế độ quét dự phòng…".

Ngoài ra:

- thử nhúng lại tới **10 s** (`0.6/1.8/4/7/10`) thay vì 7 s, giữ hook+watcher **11 s**;
- **chống rò connection khi hủy chạy:** `Cancel()` (nút ⏹ Dừng, hoặc bấm ▶ lần mới) nay gọi
  `S.AbortRunCapture()` → gỡ hook `Instance.new` **và** `Disconnect` toàn bộ watcher `ChildAdded`
  của lần chạy bị hủy. Trước đó mỗi lần hủy để lại 3 connection sống mãi (test P11/P12).

### Kiểm chứng (Lua 5.x + Roblox API giả lập, chạy thật từng hàm của file)

| bộ test | kết quả |
|---|---|
| unit (`S.IsEmbeddable`, hook, watcher, trust, park, gỡ hook…) | **21/21 PASS** |
| end-to-end `RunFeatureScript` (10 kịch bản A–J) | **15/15 PASS** |
| end-to-end `RunCode` → tab 🧩 GUI Ngoài (12 kịch bản P1–P12) | **25/25 PASS** |
| **tổng** | **61/61 PASS** |

So sánh **3 phiên bản** trên cùng 8 kịch bản (môi trường giả lập giống nhau):

| kịch bản | v4.4f (main) | v4.4g | **v4.4h** |
|---|---|---|---|
| A. GUI tạo đồng bộ | ✅ | ✅ | ✅ |
| B. ScreenGui trước, frame con sau 1 s (bất đồng bộ) | ❌ | ✅ | ✅ |
| C. GUI dựng trong `task.delay(5s)` | ❌ | ✅ | ✅ |
| D. GUI dựng trong `task.spawn` | ❌ | ✅ | ✅ |
| E. GUI tên **`Main`** | ✅ | ❌ *(regression)* | ✅ |
| F. **executor CHẶN hook** | ❌ | ❌ | ✅ |
| G. chặn hook + GUI tên `Main` | ❌ | ❌ | ✅ |
| H. không ăn nhầm `Topbar` của game | ⛔ *(nhúng nhầm!)* | ✅ | ✅ |
| **kết quả** | **2/8** | **5/8** | **8/8** |

Chú thích: ✅ nhúng đúng GUI · ❌ không nhúng được · ⛔ nhúng nhầm UI của game.

**Toàn file sau khi sửa:** syntax **OK** (5.682 dòng) · khối `if/do/function … end` **cân bằng**
(depth cuối = 0) · **local cấp chunk vẫn 187/200** (không thêm local nào — mọi thứ mới gắn vào bảng
`S`; `local cap` nằm trong hàm `RunCode`) · line endings **CRLF 100%** (5.681 CRLF / 0 LF lẻ) ·
version đồng bộ `4.4h` ở header, title bar, `_G.BananaCatHubAPI.Version` và log khởi động.

### Nếu sau bản này GUI vẫn nằm ngoài menu

Mở console (F9) rồi bấm ▶, và đọc dòng `[BananaCatHub] ▶ …`:

- `hook=BỊ CHẶN` → hub đã tự chuyển sang watcher/quét; nếu vẫn không thấy GUI thì GUI đó do
  **script khác** tạo hoặc được tạo **sau 11 s** → bấm 🔁 "Cứu GUI" ở tab Tạo Tính Năng.
- `ghi nhận 0 GUI` → script **không tạo ScreenGui nào** (chỉ vẽ bằng Drawing/overlay, hoặc GUI của nó
  là `Folder` nằm sâu trong `CoreGui`) → trường hợp này không có gì để nhúng, đúng như nhãn báo.
- `🔍 bỏ qua GUI 'X': …` → đọc lý do; nếu lý do là "tên hay là UI của game" thì bật 🕵 "Đoán GUI trễ"
  hoặc bấm 🔁 "Cứu GUI" (mức `manual` cho phép tên chung chung).

---

## ✅ Cập nhật 2026-09-13 (lần 3) — bản **v4.4i**: 3 nút ⚡ Script Nhanh ở tab 🛠 Hỗ Trợ phải hiện **ngoài màn hình game**

Phản ánh: *"trong phần Hỗ Trợ, ba tính năng chạy script nhanh, mình nhấn vào hoạt động sao lại
ba tính năng đó không hiện ra màn hình chính mà lại vào phần Tạo Tính Năng"*.

**Đây là lỗi do chính v4.4h gây ra.** Ba nút đó là:

| nút | script | bản chất GUI |
|---|---|---|
| **Dex Explorer** | `dex.lua` (infyiff/backup) | trình khám phá instance — **cửa sổ riêng**, kéo/thu nhỏ được |
| **Infinite Yield** | `EdgeIY/infiniteyield` | admin commands — **cửa sổ riêng** |
| **SimpleSpy v3** | `ex-serum/SimpleSpy` | theo dõi Remote — **cửa sổ riêng** |

Chúng là **công cụ cửa sổ độc lập**: GUI phải nằm **ngoài màn hình game** thì mới dùng được.
v4.4h cho `RunCode` "đậu" GUI vào tab 🧩 GUI Ngoài → ba công cụ này bị nhốt trong ô 240px
(khung bị clip, không kéo được, nhìn như "không hiện ra màn hình chính") → **mất tính năng**.

### Cách sửa (v4.4i)

1. **`RunCode(code, name, ind, times, delay, noPark)`** — thêm tham số `noPark`. Ba nút ở tab 🛠
   truyền `noPark = true` → **KHÔNG BAO GIỜ** bị đưa vào menu, hành vi giống hệt trước v4.4h
   (không mở hook, không tạo tab, không dời frame con).
2. **Tự nhận diện kể cả khi không bấm 3 nút đó:** `S.ShouldSkipPark(code, name)` soi URL/tên trong
   code (`dex.lua`, `dex explorer`, `infiniteyield`, `infinite yield`, `simplespy`, `simple spy`).
   Nên dán loadstring của Dex/IY/SimpleSpy vào tab 💻 Code, hoặc chạy từ 💾 Code Đã Lưu, cũng vẫn
   để GUI **ngoài màn hình game**. Danh sách này chỉ *ngăn đưa vào menu*, không chặn bất kỳ thứ gì
   khác → không thể làm hỏng script của người dùng.
3. **Công tắc mới 🪟 ở tab ➕ Tạo Tính Năng:** `🪟 GUI chạy ở tab 💻 Code → đưa vào menu: BẬT/TẮT`,
   **lưu xuống đĩa** (`settings.parkCodeGuis`, file cũ chưa có khóa thì mặc định BẬT).
   - **TẮT** = mọi script chạy ở tab 💻 Code / 💾 Code Đã Lưu để GUI ngoài màn hình game (đúng như
     bản trước v4.4h), và **hoàn tác ngay** những GUI đang đậu (`S.RemoveAllParked`).
   - Tab ➕ **Tính Năng không phụ thuộc công tắc này** — vẫn tự nhúng GUI vào tab như thường
     (đã có test N7 kiểm chứng), nên không mất tính năng nào.
4. **Nút "↩ Trả tất cả về game"** trên đầu tab 🧩 GUI Ngoài (trước đó chỉ có nút ↩ trên từng ô).
5. **Nhãn trạng thái tab 💻 Code nói rõ GUI đi đâu:** `🪟 GUI để NGOÀI màn hình game (công cụ cửa
   sổ riêng) — không đưa vào menu`, hoặc `🧩 đã đưa N GUI vào tab GUI Ngoài`. Console (F9) cũng in
   lý do bỏ qua.

### Kiểm chứng

Thêm bộ test **`test_nopark` (24 test)** chạy trên đúng code trích từ file:

| nhóm test | nội dung | kết quả |
|---|---|---|
| N1–N2 | nhận diện đúng Dex/IY/SimpleSpy **và không bỏ qua oan** script của người dùng (kể cả GUI tên `Main`) | 6/6 |
| N3 | bấm nút ở tab 🛠 (`noPark=true`): ScreenGui vẫn ở `PlayerGui`, **frame con vẫn nằm trong ScreenGui** (không bị dời vào menu), không mở hook, không tạo tab | 6/6 |
| N4 | dán loadstring Dex vào tab 💻 Code → vẫn tự nhận ra, để ngoài màn hình | 2/2 |
| N5 | script tính năng thường chạy ở tab 💻 Code → **vẫn** được đưa vào menu (giữ tính năng v4.4h) | 2/2 |
| N6–N7 | 🪟 TẮT: tab Code để GUI ngoài màn hình, **nhưng tab ➕ Tính Năng vẫn nhúng bình thường** | 3/3 |
| N8–N9 | nút "↩ Trả tất cả về game" dọn sạch ô; `RemoveAllParked` an toàn khi chưa có tab | 5/5 |

**Tổng cả 4 bộ: 21 + 15 + 25 + 24 = 85/85 PASS.** Bảng so sánh 3 phiên bản (v4.4f/v4.4g/v4.4h)
vẫn giữ nguyên **8/8** cho bản mới — không có hồi quy nào.

**Toàn file:** syntax **OK** (5.818 dòng) · `if/do/function … end` **cân bằng** (depth cuối = 0) ·
**local cấp chunk vẫn 187/200** · **CRLF 100%** (5.817 / 0 LF lẻ) · version đồng bộ `4.4i`
(header, title bar, `_G.BananaCatHubAPI.Version`, log khởi động).

---

## 🎨 Cập nhật 2026-09-13 (lần 4) — bản **v4.5**: thiết kế lại giao diện "MIDNIGHT GOLD"

Yêu cầu: *"các tính năng đã ổn định, thiết kế lại menu script cho hiện đại và đẳng cấp hơn,
nhớ là không làm mất tính năng"*.

**Nguyên tắc bất di bất dịch của lần sửa này:** chỉ đổi **màu sắc – chất liệu – hiệu ứng**,
**KHÔNG đổi** layout, kích thước, vị trí, tên đối tượng hay bất kỳ dòng logic nào. Vì vậy mọi tính
năng (nhúng GUI, tab tính năng, waypoint, AI, crosshair, lưu/nạp, 🔁 Cứu GUI, 🧩/🕵/🪟…) giữ nguyên 100%.

### 1. Bảng màu mới — giữ nguyên TÊN KHÓA cũ

| khóa | trước (nền sáng) | nay (nền tối) | vai trò |
|---|---|---|---|
| `C.BG` | `240,242,248` | **`18,20,27`** | nền cửa sổ |
| `C.DARK` | `40,40,45` (chữ đậm) | **`233,237,245`** (chữ sáng) | màu chữ chính |
| `C.GRAY` | `110,115,125` | `124,132,150` | nút tắt / chữ phụ |
| `C.GREEN/BLUE/RED/YELLOW/PURPLE/ORANGE/PINK` | tông trầm | tông sáng hơn cho nền tối | trạng thái |
| **mới** `C.SURFACE / SURFACE2 / SURFACE3` | — | `26,29,38` / `34,38,50` / `46,51,66` | thẻ, panel, thanh tiêu đề |
| **mới** `C.BORDER / C.MUTED / C.INK` | — | `52,58,74` / `150,158,176` / `16,18,24` | viền, chữ phụ, chữ trên nền vàng |
| **mới** `C.ACCENT / C.ACCENT2` | — | **`255,196,61` → `255,132,62`** | vàng chuối → cam (màu nhận diện) |

Giữ nguyên tên khóa cũ để **hàng trăm chỗ đang dùng `C.XXX` không phải sửa**. Đã kiểm tra trước khi
đổi: `C.DARK` **chỉ** được dùng làm `TextColor3` (không nơi nào dùng làm nền/viền) nên việc nó trở
thành "chữ sáng" là an toàn; `C.BG` chỉ dùng làm nền.

### 2. Bộ công cụ thiết kế `D` (1 biến local duy nhất)

Main chunk đã sát trần 200 local của Luau, nên **toàn bộ helper mới được gom vào 1 bảng `D`**
(local cấp chunk tăng đúng **1**: 187 → **188/200**).

| hàm | tác dụng |
|---|---|
| `D.BestText(bg)` | chọn chữ **đậm (INK)** hay **trắng** theo độ sáng nền (ngưỡng 0.6) |
| `D.Edge(bg)` | viền sáng hơn nền ~9% — tách khối mà không gắt |
| `D.Grad(obj)` | lấy/tạo **1** UIGradient duy nhất (gọi lại không chồng thêm → không rò instance) |
| `D.Paint / D.Shade / D.PaintText` | tô gradient thật / đổ khối giữ màu nền / chữ gradient |
| `D.Tactile(btn)` | hover sáng lên + nhấn đậm lại (**không đổi Size** → không xô layout) |
| `D.HoverText(btn)` | nút "ghost" đổi màu chữ khi rê (✕ → đỏ, 🔒 → vàng) |
| `D.Glow(obj)` | quầng sáng sau nút 🍌, **tự bám theo Position** khi kéo nút đi |
| `D.Breathe(obj)` | tween lặp vô hạn tự đảo (nhịp thở của quầng sáng) |
| `D.SetBg(obj,color)` | đổi màu nút **lúc chạy** kèm chữ tương phản + viền ăn theo |

### 3. Những gì mắt người dùng sẽ thấy khác

- **Cửa sổ:** nền tối đổ khối dọc, bo **14px**, viền 1.4px, họa tiết nền ánh vàng rất nhẹ (0.94).
- **Thanh tiêu đề:** chữ gradient vàng → trắng sữa, **vạch accent 2px** chạy dọc đáy, **pill `v4.5 · PRO`**;
  tiêu đề gọn lại thành `🍌 Banana Cat Hub` (phiên bản nằm ở pill). Chiều cao **vẫn 30px**
  (tabBar/contentArea đang neo theo 30px — đổi là xô toàn bộ layout).
- **Thanh tab:** pill ghost (trong suốt, chữ mờ, hover hiện nhẹ) → tab đang mở nổi nền + **chữ vàng**
  + **vạch accent 3px**. Vạch là **con của nút tab** nên tự trượt theo và **không bị UIListLayout xô**
  (nếu neo vào `tabBar` thì sẽ bị layout xếp chỗ → lệch toàn bộ nút tab).
- **Nút bấm:** nền đặc (bỏ trong suốt 20%), bo 8px, viền sáng hơn nền một bậc, đổ khối nhẹ,
  hover/nhấn có phản hồi. `Button()` **giữ nguyên chữ ký** `(parent, text, x, y, w, h, color)`.
- **Chữ tự tương phản:** `New()` tự "cứu" cặp *nền sáng + chữ trắng* → chữ đậm. Nhờ vậy không còn
  cảnh chữ trắng chìm trên nút vàng/xanh lá. Nút ghost (nền trong suốt) **không bị đụng tới**.
- **Ô nhập liệu:** viền mảnh + **vòng sáng vàng khi gõ** (tự tạo UIStroke lúc focus nếu ô chưa có).
- **Font:** chuyển sang họ **GothamSSo** nhưng **giữ đúng độ đậm** đã chọn (Bold → Bold, Medium → Medium).
- **Scrollbar** mảnh 3px màu tối; **đường phân cách "━━━"** thành kẻ mảnh màu viền.
- **Nút 🍌 nổi:** gradient vàng→cam 135°, chữ đậm, quầng sáng **thở** 2.1s, tự bám theo khi kéo.
- **Mở menu** có hiệu ứng nở 0.2s (giữ nguyên tâm; đọc Size/Position **tại thời điểm mở** nên không
  bao giờ lệch với kích thước người dùng vừa nới; kéo/nới trong lúc tween chạy thì **hủy tween ngay**).
- 71 màu hard-code kiểu nền sáng được **remap có kiểm soát** sang tông tối; **GIỮ NGUYÊN** màu trắng
  của crosshair/overlay ngoài màn hình (dòng `dot.BackgroundColor3`, `f.BackgroundColor3` vùng BC_Dot/BC_Line).

### 4. Kiểm chứng (không phải "đổi màu rồi cầu nguyện")

| hạng mục | cách kiểm | kết quả |
|---|---|---|
| Logic không đổi | chạy lại 4 bộ test (unit 21, e2e tab Tính Năng 15, e2e tab Code 25, no-park 24) | **85/85 PASS** |
| Không hồi quy fix cũ | bảng so 3 phiên bản trên 8 kịch bản | **8/8** (v4.4f 2/8, v4.4g 5/8) |
| Chữ không bị chìm | **audit tương phản WCAG** tự động trên toàn file: 21 cặp chữ/nền màu + mọi màu chữ ghost + 28 màu chữ hard-code, đo trên cả 4 nền tối | tất cả **≥ 3.0:1** (thấp nhất 3.36:1; riêng `C.INK` chỉ dùng trên nút vàng → 7.9:1) |
| Không phá trần local Luau | đếm local cấp chunk | **188/200** |
| Cú pháp / cấu trúc | compile Lua 5.x + đếm khối `if/do/function … end` | **OK**, depth cuối = 0 |
| Line endings / version | đếm CRLF, đối chiếu 4 chỗ khai báo version | **CRLF 100%** (6.147/0), version `4.5` |
| Không tham chiếu ngược (forward-ref) | soi `New/Corner/Stroke` có gọi hàm khai báo **sau** nó không | phát hiện & sửa 1 lỗi (`New` gọi `Tween` → sẽ thành global nil khi focus ô nhập liệu) |

**Bản xem trước giao diện:** `design/preview-v4.5.html` — mock HTML dựng theo đúng số đo & mã màu
trong `script.js` (540×340, tiêu đề 30px, thanh tab 105px, bo 14/10/8, accent `#FFC43D → #FF843E`),
bấm tab / rê nút / bấm ô nhập / bấm 🍌 được. Đây là bản duyệt thiết kế, không phải file chạy trong game.

### 5. Nếu muốn đổi phong cách khác

Mọi màu nằm gọn trong **bảng `C`** (đầu file) — đổi 15 giá trị `Color3.fromRGB` ở đó là cả hub đổi
tông (ví dụ tím‑xanh "Neon", hoặc nền sáng trở lại). Không cần sửa chỗ nào khác vì toàn bộ UI đã
đọc qua `C.*` và các helper `D.*`.

---

## 8b. v4.6 — "MENU GIỐNG DELTA" (layout mới, giữ nguyên mọi tính năng)

Yêu cầu: *thêm menu giống Delta + tính năng giống bản đang dùng, không làm mất tính năng*.
Đã chốt 3 điểm với người dùng: **đổi cả hub sang layout Delta**, **giữ tông Midnight Gold v4.5**,
**danh sách script có sẵn trong file** (không thêm link hub ngoài chưa kiểm chứng → tránh nút chết).

### 1. Layout Delta (chỉ đổi cách bố trí)

| phần | v4.5 (trước) | v4.6 (Delta) |
|---|---|---|
| Thanh tab | **PHẢI**, có chữ, rộng 105px | **TRÁI**, chỉ icon, rộng **56px**; tab mở có vạch accent 3px |
| Header trang | không có | **24px**: trái = tên trang đang mở · phải = 3 công tắc gạt 🧩/🕵/🪟 |
| Vùng nội dung | `Size(1,-105,1,-30)` `Pos(0,0,0,30)` | `Size(1,-56,1,-54)` `Pos(0,56,0,54)` → **rộng thêm 49px** |
| Rê chuột vào tab | — | header hiện **tên trang đó** (mờ 40%), rời chuột trả về trang đang mở |
| Thanh tiêu đề | 30px | **30px — giữ nguyên** (là mốc neo của tabBar/contentArea, cấm đổi) |

Geometry cụ thể: `tabBar Size(0,56,1,-30) Pos(0,0,0,30)` · `PageHeader Size(1,-56,0,24) Pos(0,56,0,30)`
· `PageHeaderRule Size(1,-56,0,1) Pos(0,56,0,53)` · `TabRailDivider Pos(0,56,0,30)` · nút tab
`Size(1,-8,0,38)` chỉ icon, `CanvasSize = #tabs*44+10`.

### 2. Trang mới 📚 Script Hub (đứng thứ 2, ngay sau 💻 Code)

- **Ô tìm kiếm 🔍**: soi tên + mô tả + phân loại, hỗ trợ tiếng Việt có dấu, không phân biệt hoa/thường.
- **5 chip lọc**: Tất cả · Admin · Explorer · Spy · Tiện ích (chip đang chọn tô vàng, chữ đậm).
- **Thẻ script**: icon · tên · phân loại · mô tả · `▶ Chạy` · `📋 Copy` · `💾 Lưu sang Code Đã Lưu`
  (tự đổi tên tránh trùng) · `☆/⭐ Ghim lên đầu` (**có lưu xuống đĩa** qua `settings.hubFavs`).
- **Nguồn dữ liệu = MỘT bảng `S.ScriptHubList`** (muốn thêm script chỉ cần thêm 1 dòng):
  - 3 script **ngoài**, link đã kiểm chứng (đang dùng ở tab 🛠 Hỗ Trợ): Infinite Yield, Dex Explorer,
    SimpleSpy v3 — vẫn truyền `noPark=true` để GUI ở **ngoài màn hình game** (giữ đúng v4.4i).
  - 5 **tiện ích nội bộ** gọi thẳng hàm có sẵn: 🎯 niêm tâm (`S.ToggleCrosshair`) · 🧩 trả GUI về
    màn hình (`S.RemoveAllParked`+`ClearEmbedsUnder`+`PruneEmbeds`) · 🖱 sửa kẹt chuột (`S.DoFixMouse`)
    · 🔄 nạp lại hub từ đĩa (`S.DoReload`) · 🧹 dọn host nhúng rác (`S.PruneEmbeds`).
  - → **không có link chết**: phần tiện ích không cần mạng, phần script ngoài chỉ dùng link đã chạy được.

### 3. Không nhân đôi logic (chống lệch hành vi về sau)

5 handler được tách thành hàm để trang 📚 và công tắc trên header gọi lại **đúng** chúng; nút cũ vẫn
nối vào chính những hàm đó nên hành vi không đổi: `S.DoReload`, `S.DoFixMouse`, `S.DoToggleEmbed`,
`S.DoToggleGuess`, `S.DoTogglePark`.

Thứ tự trang mới: `1 💻 Code · 2 📚 Script Hub · 3 💾 Code Đã Lưu · 4 🛠 Hỗ Trợ · 5 🤖 AI AI ·
6 ➕ Tạo Tính Năng · 7+ tab tính năng của bạn (featureTabIndex = 7) · 99 🧩 GUI Ngoài`.

### 4. Kiểm chứng

| hạng mục | cách kiểm | kết quả |
|---|---|---|
| Tính năng cũ không mất | 4 bộ test cũ (unit 21 · e2e 15 · park 25 · nopark 24) | **85/85 PASS** |
| Trang 📚 Script Hub chạy thật | **bộ test mới `test_hub.lua`** chạy đúng khối code trích từ `script.js`: tạo tab, 8 thẻ, ▶ chạy (đúng `noPark`), 🔍 tìm (kể cả "chuột" có dấu), 5 chip lọc, ⭐ ghim+lưu đĩa, 📋 clipboard, 💾 lưu (tránh trùng tên), 5 tiện ích gọi đúng hàm | **69/69 PASS** |
| Header + công tắc gạt | **bộ test mới `test_header.lua`**: geometry 24px/56px, 3 switch 🧩🕵🪟, knob gạt theo trạng thái, bấm = gọi `S.DoToggle*`, hover không ghi đè tên tab | **31/31 PASS** |
| Không hồi quy fix cũ | bảng so 3 phiên bản / 8 kịch bản | **8/8** |
| Cú pháp + trần local Luau | compile Lua 5.x, đếm khối, đếm local cấp chunk | **OK**, depth 0, **188/200** |

**2 bug do test mới phát hiện và đã sửa ngay:** (1) vòng lặp xóa thẻ cũ *vừa duyệt `GetChildren()`
vừa `Destroy()`* → sót thẻ, danh sách nhân đôi mỗi lần lọc (sửa: gom ra bảng `stale` rồi mới xóa);
(2) rời chuột khỏi công tắc trên header ghi đè mất tên tab đang hover (sửa: trả về `D.hoverName or D.activeName`).

### 5. v4.6.1 — XÓA dứt điểm dấu vết menu bản cũ + làm hub mượt hơn

Yêu cầu người dùng: *"xóa menu bản cũ đi, để menu bản Delta lại, để cho script mượt hơn — tất cả
tính năng giữ lại"*. Trong `script.js` **không tồn tại hai menu** (Stage A đã thay layout tại chỗ,
chỉ có MỘT `ScreenGui` của hub), nên phần "bản cũ" còn sót là (a) các hàng nút xếp cho khổ nội dung
435px cũ, (b) file mock thiết kế cũ, (c) vài điểm ngốn khung hình thật sự. Đã dọn cả ba:

**(a) Layout cũ → trải hết khổ Delta 484px** (lề 8 → mép phải 476):

| trang | trước (mép phải) | sau |
|---|---|---|
| 💻 Code | `▶ Chạy Code` 148 · `⏹ Dừng` 236 · `💾 Lưu` 168 | `▶ 336` + `⏹ 126` = **476** · `💾 Lưu` **468** |
| 🛠 Hỗ Trợ | các hàng chỉ tới 208 / 304 / 254 | `372` + `90` phải = **476** · hàng đơn = **468** |
| 🚀 Teleport X/Y/Z | 3 ô 70px, mép 270 — **3 nhãn X:/Y:/Z: đè lên nhau** (Label() luôn đặt x=8) | nhãn đặt đúng x=8/166/324 (w=14), 3 ô 136px → mép **476** |
| ➕ Tạo Tính Năng | hàng 3 nút mép 426, hàng 2 nút mép 426, 4 nút 418 | `210+116+130` và `176+286` → **476**; 4 nút dài → **468** |
| đường phân cách `━` | 22 ký tự (~220px / 435px) | 46 ký tự (vừa khổ mới) |

**(b) Xóa file mock layout cũ**: `design/preview-v4.5.html` (thanh tab phải 105px) → `git rm`;
thay bằng **`design/preview-v4.6.html`** dựng theo đúng số đo Delta (rail 56px, header 24px,
khổ nội dung 484px, trang 📚 Script Hub lọc/tìm/ghim chạy được thật trong trình duyệt).

**(c) Mượt hơn — 3 chỗ ngốn khung hình thật sự, đo được bằng test:**

| vấn đề (bản trước) | sửa (v4.6.1) | kết quả đo trong test |
|---|---|---|
| `RunService.RenderStepped` của tab 🛠: raycast + đọc Humanoid + ghi >10 nhãn **mỗi frame**, và **chạy cả khi menu đóng** | chỉ chạy khi `main.Visible` **và** `supportTab.Visible`; dồn tích lũy `coordAcc` → tối đa **20 lần/giây** | 10s @60fps: 600 → **200** lượt; 10s @144fps: 1440 → **180** lượt; menu đóng: **0** raycast |
| `GetProductInfo` (HTTP) nằm trong nhánh `placeLbl.Text == "Place: ..."` → nếu executor **chặn HTTP** thì nhãn không bao giờ đổi ⇒ **gọi HTTP mỗi frame, mãi mãi** | giới hạn **1 lần / 10 giây** (`D.placeTryAt` + `os.clock()`); thành công thì không gọi lại | HTTP lỗi suốt 50s: 3000 → **≤1** lần; khi được phép vẫn tự điền `Place: 123 — Test Place` |
| `tostring(state):gsub(...)` mỗi frame → 1 chuỗi rác/frame cho GC | so sánh **bằng giá trị enum**, chỉ dựng chuỗi khi state thật sự đổi | nhãn vẫn đúng `State: Running` / `Jumping` / `No Humanoid` |
| ô tìm kiếm rebuild **sau mỗi phím** (2 nơi: 💾 Code Đã Lưu, 📚 Script Hub) | `S.Debounce(key, 0.18, fn)` — gộp phím, kết quả cuối giống hệt | gõ 6 phím liền: **0** lần dựng; sau 0.18s: đúng **1** lần, kết quả vẫn đúng |

Không mất tính năng: các nhãn tọa độ chỉ để **xem** (nút 📋 Copy / 📍 Lấy Vị Trí tự gọi
`GetGroundPosition()` khi bấm), và `S.Debounce` vẫn đọc nội dung ô nhập tại thời điểm chạy.

**Kiểm chứng v4.6.1 — 209 PASS / 0 FAIL** (thêm 2 bộ test mới so với v4.6):

| bộ test | số kiểm tra |
|---|---|
| `test_unit` · `test_e2e` · `test_park` · `test_nopark` (tính năng cũ) | 21 · 15 · 25 · 24 = **85** |
| `test_compare` (hồi quy 3 phiên bản / 8 kịch bản) | **8/8** |
| `test_hub` (trang 📚, chạy code trích thật từ `script.js` — **thêm mục [L] đo debounce**) | **72** |
| `test_header` (header 24px + 3 công tắc gạt) | **31** |
| `test_coord` (**mới**: RenderStepped — 20Hz, gate theo trang, cap HTTP, state enum, N/A, dt lạ) | **21** |

Cú pháp OK · depth 0 · local cấp chunk **189/200** · CRLF 100% (6.757/0).

### 6. v4.6.2 — đổi thứ tự trang theo yêu cầu người dùng

Thứ tự mới trên rail: **1 💾 Code Đã Lưu · 2 💻 Code · 3 📚 Script Hub · 4 🛠 Hỗ Trợ · 5 🤖 AI AI ·
6 ➕ Tạo Tính Năng · 7+ tab tính năng của bạn · 99 🧩 GUI Ngoài** (mở menu là vào thẳng 💾 Code Đã Lưu).

Chỉ đổi `LayoutOrder` của 3 trang (Code 1→2, Code Đã Lưu 3→1, Script Hub 2→3) — **thứ tự TẠO tab giữ
nguyên** để không đụng scope biến (tránh lỗi forward-reference của Luau).

Kéo theo một chỗ phải sửa cho đúng: mảng `tabs` xếp theo **thứ tự tạo** (💻 Code vẫn là `tabs[1]`),
còn rail xếp theo **LayoutOrder**, nên 4 chỗ đang gọi `SwitchTab(1)` (lúc khởi động, bấm ✕ đóng tab
tính năng, và 2 chỗ xóa tab) sẽ mở 💻 Code trong khi icon được tô vàng là icon thứ hai → lệch nhau.
Đã thay bằng **`OpenFirstPage()`**: tìm nút có `LayoutOrder` nhỏ nhất rồi mới `SwitchTab` đúng index.

**Kiểm chứng:** bộ test mới `test_order.lua` chạy đúng hàm trích từ `script.js` — **9/9 PASS**
(đúng thứ tự rail · mở menu vào 💾 Code Đã Lưu · có tab 7+/99 vẫn đúng · nút thiếu LayoutOrder ·
rail trống · thứ tự tạo đảo lộn). Tổng cộng **218 PASS / 0 FAIL** (85 tính năng cũ + 72 Script Hub
+ 31 header + 21 perf + 9 thứ tự), compare 8/8, local cấp chunk **190/200**, cú pháp OK, CRLF 100%.

---

## 9. Kết luận một câu

Đây là một hub executor **được viết bởi người hiểu rất rõ những "nỗi đau" thực tế của Roblox UI** (focus,
hit-test, giới hạn 200 local, GUI của game bị script khác phá) và có kỷ luật vá lỗi tốt — nhưng
đang ở trạng thái **một file phình tới hạn**: 187/200 slot local, 4.928 dòng, layout pixel hard-code,
và còn ~13 bug/rò rỉ cụ thể (nặng nhất: RenderStepped gọi HTTP mỗi frame, "🔄 Nạp lại" phá GUI
đang nhúng, search rebuild mỗi phím, API key nằm trên URL). Ưu tiên số 1 không phải thêm tính năng
mới mà là **tách scope để lấy lại headroom local** + vá 7 bug nhóm "làm ngay".
