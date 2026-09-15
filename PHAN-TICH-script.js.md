# Phân tích `script.js` — Banana Cat Hub v4.8

**Phạm vi:** `/home/user/aiaiaitao3/script.js` — 363.686 byte, 7.611 dòng, 42 khối mục `-- ====`.
**Ngày:** 2026-09-15 · **Nhánh:** `arena/01a0a515-aiaiaitao3`
**Cách kiểm:** dựng AST bằng `luaparse` (sau khi chuẩn hoá 22 phép gán ghép `+=`/`..=` của Luau — file **không** dùng type annotation, `continue`, hay string nội suy), đếm biến local theo scope, dò hàm chết, dò global, đọc tay các nhánh rủi ro. Script kiểm nằm ở `/home/user/.tmpchk` (**ngoài repo**, không làm bẩn git).

---

## 1. TL;DR

| Hạng mục | Kết luận |
|---|---|
| Cú pháp | ✅ **Không có lỗi cú pháp**. Hợp lệ với Luau; **không** hợp lệ Lua 5.1 thuần (22 chỗ `+=`) → bắt buộc chạy trong môi trường Luau/executor. |
| Ngân sách biến local | ✅ Cấp chunk dùng **164/200** slot (AST). Còn ~36 slot — nhưng ghi chú trong code vẫn nói 188–189 (**số liệu đã cũ**). |
| Hàm chết | ✅ Không có hàm nào định nghĩa mà không được gọi. |
| Global rò rỉ | ✅ Sạch: mọi phép gán đều vào local/param; `_G` chỉ ghi **7 khoá** có tiền tố `BananaCatHub_*`/`BcFitLast`/`BC_FEATURES`. |
| Lỗi cần sửa | ⚠️ **4 lỗi thực** (B1 nghiêm trọng về UI · B2–B4 trung bình) + **3 vấn đề bảo mật/độ tin cậy** (B5–B7) + 3 ghi chú nhỏ (B8–B10) — chi tiết ở §4. |
| Rủi ro lớn nhất | 🔓 Nạp và chạy `loadstring` từ 3 URL `raw.githubusercontent.com` (nhánh `master`/`main`) không ghim commit, không kiểm hash; API key Gemini gửi **trong query string** và lưu **plaintext**. |
| Điểm mạnh nổi bật | 🏆 Cơ chế "mượn GUI" không `Destroy` + hook `Instance.new` có **probe tự kiểm chứng** + 3 lớp dự phòng (hook → hookfunction → ChildAdded watcher) là thiết kế tốt hơn hẳn mức trung bình của các hub cùng loại. |

---

## 2. Nó là gì & kiến trúc

### 2.1 Bản đồ file theo dòng

| Dòng | Khối | Việc nó làm |
|---|---|---|
| 1–230 | Khối `[[ ]]` đầu file | "Changelog kiêm tài liệu" (rất dài, ~230 dòng, 3% file) |
| 231–274 | Khởi tạo | Lấy service, chọn `gethui()`/`CoreGui`/`PlayerGui`, dọn dấu vết lần chạy trước |
| 275–400 | `C.*` bảng màu "Midnight Gold" + `New()/Corner()/Stroke()/Tween()` | Nền tảng dựng UI |
| 401–548 | Bảng `D` (design tool) | Chữ tương phản tự động, gradient, stroke, hover, glow, breathing |
| 549–638 | `ReleaseHubFocus` + ghi chú 3 lỗi "mất input" đời cũ | Nhả focus TextBox trước mọi thao tác chạy/đổi tab/đóng |
| 639–760 | Bảng `Hit` + đo khung + `BcFit()` (debounce 0.05s) | Hit-test **không phụ thuộc parent** của GUI |
| 761–1030 | Khung `main`, title bar, **rail icon bên trái**, header trang + 3 switch 🧩/🕵/🪟 | Shell của hub |
| 1034–1184 | `SwitchTab` / `OpenFirstPage` / `AddTab` | Quản lý trang + `tabs[]` và `tabContent[]` song song |
| 1185–1430 | Bảng `Store` | Lưu/nạp JSON `banana_cat_saved.json` (version 3), debounce 0.3s, chống mất dữ liệu |
| 1431–1592 | Lớp tương thích executor `S.EnsureCompat` | Bù ~45 hàm thiếu (`getgenv`, `request`, `readfile`, `Drawing`, `hookfunction`…) theo nguyên tắc **chỉ bù khi chưa tồn tại** |
| 1593–1813 | `NormalizeRunnable` / `RunReportText` / `ExecOnce` / `RunCode` / `Cancel` | Đường ống chạy code + báo cáo lỗi thật |
| 1814–2261 | Tab 💻 Code, 💾 Code Đã Lưu | Editor, lưu/xóa/tìm/expand, vòng lặp chạy N lần |
| 2262–3410 | Tab 🛠 Hỗ Trợ | Phân tích vật thể (📱/🖥), highlight, tọa độ 20Hz, waypoint, teleport |
| 3411–4275 | Tab 🤖 AI AI | Chat Gemini 2.5 Flash, parser ```lua```, lịch sử 40 message / 60k ký tự |
| 4276–4730 | Nhúng GUI: registry, snap, `FitEmbedded`, **API công khai** `_G.BananaCatHubAPI` | "Hợp đồng" cho script bên ngoài tự canh size |
| 4731–5100 | `S.FeatureTemplate` (370 dòng) | Code mẫu phát cho AI/người khác |
| 5101–5369 | Crosshair toàn cục + `IsEmbeddable` | Danh sách trắng/đen tên GUI |
| 5371–5695 | `HookInstanceNew` → `WatchNewGuis` → `EmbedRecorded` | 3 lớp phát hiện GUI của script |
| 5696–6078 | Tab 🧩 GUI Ngoài + `Begin/End/AbortRunCapture` + `RunFeatureScript` | Nhận GUI vào menu kiểu "park" |
| 6079–6961 | Tab ➕ Tạo Tính Năng, `RebuildFeatureList`, khôi phục tab từ đĩa | Vòng đời tab tính năng |
| 6963–7485 | Trang 📚 Script Hub | Danh sách thẻ + tìm kiếm + 6 chip lọc + ⭐ + 🎟 JobId |
| 7486–7611 | `ToggleMainFrame`, drag, phím tắt `RightControl`, print tổng kết | Điều khiển menu |

### 2.2 Luồng chạy

```
load script.js
  ├─ dọn dấu vết (disconnect conn cũ, xoá crosshair cũ, Unbind Fly/Carpet)
  ├─ dựng UI  →  AddTab(...) × N  →  OpenFirstPage()   (trang LayoutOrder nhỏ nhất)
  ├─ Store.load()            (đọc đĩa ngay, TRƯỚC khi compat bù readfile/writefile)
  ├─ dựng tab 1..5, gán Store.restoreFeatures / Store.restoreWaypoints
  └─ nếu có tính năng đã lưu → Store.restoreFeatures() → dựng lại tab + RebuildFeatureList()

Bấm ▶ (ở bất kỳ tab nào)
  └─ RunCode → SanitizeCode → NormalizeRunnable → EnsureCompat → loadstring(code)()
        └─ nếu không noPark: BeginRunCapture (hook Instance.new + watcher) → EndRunCapture
              └─ EmbedRecorded → IsEmbeddable → EmbedGui → RegisterEmbed → FitEmbedded
                    └─ báo cáo thật lên nhãn: ✅/❌/🧩/🪟
```

### 2.3 Dữ liệu

- Một file JSON `banana_cat_saved.json` (version 3) chứa `scripts[]`, `waypoints[]`, `features[]`, `settings{}` (🧩/🕵/🪟 + ⭐ yêu thích).
- File riêng `banana_cat_gemini_key.txt` cho API key.
- Nếu executor không có `writefile` → fallback `_G.BananaCatHub_SavedData` (chỉ sống trong phiên).
- Có cơ chế "file version mới hơn script" → cảnh báo chứ không im lặng; và **không** fallback `_G` khi file JSON hỏng (chống ghi đè mất dữ liệu) — chi tiết này rất đáng khen.

### 2.4 Hai cơ chế khó nhất — và vì sao chúng đúng

**(a) Nhúng GUI ("mượn con, không giết cha")** — `S.EmbedGui`: chỉ đổi `Parent` của các frame con vào `Embedded_<Tên>` trong tab, **không** `Destroy` ScreenGui gốc, nên `gui.Enabled`, `gui:Destroy()`, `gui.Parent = nil` trong script người dùng vẫn còn tác dụng (hub bắt tín hiệu `Enabled`/`Parent`/`Destroying` để phản chiếu — mỗi connection `pcall` riêng, lý do được ghi rõ trong comment).

**(b) Phát hiện GUI của script** — 3 lớp, đều có kiểm chứng:
1. Ghi đè `Instance.new` bằng `recorder`, sau đó **tự probe** (`Instance.new("ScreenGui")` để xem hook có thật ăn không) — nếu executor gán được nhưng không ăn thì tự gỡ và hạ cấp.
2. `hookfunction(Instance.new, ...)` với `origFromHook` để chain không đứt.
3. `PlayerGui/CoreGui/gethui.ChildAdded` watcher (không cần hook).
   Khi gỡ hook: **chỉ** gán lại `Instance.new` nếu nó vẫn đúng là hàm của mình → không đè hook của script khác. Đây là mức kỹ lưỡng hiếm thấy.

---

## 3. Điểm mạnh (có bằng chứng)

1. **Không Destroy UI của người dùng.** Mọi đường thoát (✕ tab, 🗑 xoá, `Store.restoreFeatures`, `DoToggleEmbed` TẮT) đều gọi `S.ClearEmbedsUnder` → `S.RestoreEmbed` → `RestoreSnap` trước khi huỷ host (dòng 4409–4438, 5125–5145, 6844–6845, 6938–6939).
2. **Báo cáo lỗi thật.** `S.lastRunError` + `S.RunReportText` phân biệt 5 trạng thái: chạy xong / lỗi / GUI vào tab / GUI ở ngoài / compat đã bù. Không còn "✅ xong" giả.
3. **Chuẩn hoá đầu vào dày.** `NormalizeRunnable` xử lý BOM/zero-width, link trần, `game:HttpGet(...)` trần, `loadstring` thiếu `()`, **và chặn** URL chứa `"`/`\`/ký tự điều khiển để không phá chuỗi sinh ra (chống chèn code) — chi tiết bảo mật tốt.
4. **`EnsureCompat` không bao giờ đè hàm thật** (`S.SetGlobal` kiểm `rawget(_G, n)` trước) — nguyên tắc đúng, tránh phá script đang chạy.
5. **Nhả focus TextBox** trước mọi hành động (`ReleaseHubFocus`) — đúng nguyên nhân gốc của lỗi "không quay chuột/không bắn" kinh điển.
6. **Hiệu năng có chủ đích.** Vòng `RenderStepped` duy nhất (dòng 2604) được throttle xuống 20Hz và thoát sớm khi menu đóng/không ở tab 🛠; `BcFit` debounce 0.05s; `Store.saveSoon` debounce 0.3s.
7. **Kỷ luật ngân sách local.** Vì trần 200 local/chunk của Luau, tác giả gom state vào bảng `S`/`D`/`Store`/`Hit` và ghi rõ lý do trong comment — dấu hiệu đã từng bị lỗi biên dịch và rút kinh nghiệm.
8. **Phòng vệ nhất quán.** 249 `pcall`; các thao tác trên GUI/instance lạ đều bọc pcall.

---

## 4. Lỗi / vấn đề phát hiện được

### 🔴 B1 — (khá nghiêm trọng) Re-assign `LayoutOrder` phá thứ tự trang đã thiết kế

**Ở đâu:** dòng **6852** (trong handler 🗑 của `RebuildFeatureList`) và dòng **6950** (trong `Store.restoreFeatures`):

```lua
for j, t in ipairs(tabs) do t.LayoutOrder = j end
```

**Vì sao sai:** `AddTab` được gọi với LayoutOrder **cố ý** khác thứ tự tạo:

| Tab | LayoutOrder đặt ra | Dòng |
|---|---|---|
| 💾 Code Đã Lưu | **1** | 1134 |
| 💻 Code | 2 | 1133 |
| 📚 Script Hub | 3 | 7163 |
| 🛠 Hỗ Trợ | 4 | 2263 |
| 🤖 AI AI | 5 | 3412 |
| ➕ Tạo Tính Năng | 6 | 6379 |
| tab tính năng của bạn | 7, 8, … | 6113 |
| 🧩 GUI Ngoài | **99** | 5706 |

Nhưng `tabs[]` xếp theo **thứ tự TẠO** (Code, Code Đã Lưu, Hỗ Trợ, AI AI, Tạo Tính Năng, Script Hub, …). Hai dòng trên ghi đè bằng chỉ số mảng → **quay về đúng thứ tự tạo**.

**Hệ quả quan sát được:**
- Chỉ cần **xoá 1 tab tính năng**, hoặc **khởi động lại khi đã có tab tính năng đã lưu** (`#Store.loadedFeatures > 0` → `Store.restoreFeatures()` chạy, dòng 6957) là rail thành: 💻 Code · 💾 Code Đã Lưu · 🛠 · 🤖 · ➕ · 📚 · … → **trái hẳn với mục tiêu v4.6.2** ghi ở dòng 21–25 và 1130–1132.
- `OpenFirstPage()` (dòng 1040) chọn LayoutOrder nhỏ nhất → **trang mở đầu tiên trở lại 💻 Code**, không còn là 💾 Code Đã Lưu.
- Tab 🧩 GUI Ngoài mất vị trí 99, bị kẹp vào giữa rail (nó được tạo ở dòng 5706, trước ➕/📚).
- Đây cũng là mầm của tranh chấp "icon tô vàng ≠ trang đang mở" mà chính comment v4.6.2 (dòng 1034–1038) đã cố sửa.

**Gợi ý sửa (chọn 1):**
- (a) Thay 2 dòng đó bằng bảng thứ tự cố định:
  ```lua
  local ORDER = { Saved = 1, Code = 2, Hub = 3, Support = 4, AI = 5, Create = 6 }
  -- tab tính năng: 7 + i ; 🧩 GUI Ngoài: 99
  ```
- (b) Đơn giản hơn: **không** đánh số lại; chỉ cần `table.remove` + dồn `LayoutOrder` **trong khoảng ≥7**, giữ nguyên 1..6 và 99.

---

### 🟠 B2 — Nhãn nút tab 🧩 ghi chữ dài vào ô icon 48px

**Ở đâu:** dòng **5755–5757**, **5766**, **5815**:

```lua
S.parkBtn.Text = "🧩 GUI Ngoài (" .. S.parkCount .. ")"
```

**Vì sao sai:** từ v4.5 rail **chỉ có icon** — `AddTab` dựng nút `Size = UDim2.new(1,-8,0,38)` (≈48px), `TextSize = 16`, không bật `TextScaled` (dòng 1050–1057). Chuỗi `"🧩 GUI Ngoài (2)"` dài ~17 ký tự → **tràn/héo chữ trong ô icon**, và vì số GUI giờ nằm ở `Text` chứ không ở attribute, header trang (đọc `BCTabName` — gán một lần ở 1065, đọc ở 1073–1079 và tại `SwitchTab` 1018–1029) **không bao giờ hiện số lượng**.

**Gợi ý sửa:** giữ `btn.Text = "🧩"` và đặt thông tin vào attribute để header hiện:
```lua
btn:SetAttribute("BCTabName", n > 0 and ("GUI Ngoài (" .. n .. ")") or "GUI Ngoài")
```
(3 vị trí: 5755, 5766, 5815.)

---

### 🟠 B3 — `FitEmbedded` chụp snapshot 1 lần rồi khôi phục ở **mỗi** lần re-fit

**Ở đâu:** `S.FitEmbedded` (dòng 4521: chụp snapshot ở 4549–4553, rồi `S.RestoreSnap(entry)` ở **4556**) + `EmbedGui` fit **3 lần** trong 0.4s (dòng 5197, 5199, 5200) + `BcFit` → `SyncAllEmbeds` → `FitEmbedded` cho mọi embed mỗi khi `main.Size` đổi (5105–5124) hoặc đổi tab (1031).

**Vì sao sai:** snapshot chỉ chụp **một lần** (`if not entry.snap then ... end`). Mọi thay đổi layout mà script người dùng tự làm sau đó (mở panel, đổi `Size`, ẩn/hiện khung…) sẽ bị `RestoreSnap` **kéo về trạng thái chụp đầu tiên** mỗi lần bạn kéo/nới cửa sổ hub hoặc đổi tab, rồi mới áp hệ số scale. Người dùng thấy "GUI tự dựng lại như lúc mới chạy".

**Gợi ý sửa:** chụp lại snapshot **trước mỗi lần fit** khi nội dung đã ổn định (ví dụ: chỉ `RestoreSnap` khi `k` mới bằng `k` đã lưu trong `entry.fitScale`; hoặc chụp lại `entry.snap` ở `task.delay(0.4)` cuối `EmbedGui` và khi `entry.fitScale` đổi).

---

### 🟠 B4 — Wrapper tự sinh (`📋 Lấy code tự co giãn`) hook `Instance.new` bằng phép gán thô

**Ở đâu:** dòng **6582–6597** (chuỗi code sinh ra ở `grabSizeCodeBtn`):

```lua
local _bcRealNew = Instance.new
Instance.new = function(cls, ...) ... end
...
pcall(function() _bcHookOn = false; Instance.new = _bcRealNew end)
task.delay(4, function() pcall(function() _bcHookOn = false; Instance.new = _bcRealNew end) end)
```

**Vấn đề 1 — ghi đè thô:** nếu có hook nào cài **sau** lúc chụp `_bcRealNew` (hook của chính hub khi bạn bấm ▶, hook của script khác, hoặc hook của người dùng), phép gán khôi phục sẽ **xoá hook đó**. `S.HookInstanceNew` (5394–5400) đã cẩn thận tránh đúng cái này (`if Instance.new == st.ours then ... end`) — wrapper thì không.

**Vấn đề 2 — tự vô hiệu hoá:** dòng 6591 tắt `_bcHookOn` **ngay** sau khi code người dùng chạy xong, trong khi dòng 6593 vẫn ghi chú "Script có thể tạo GUI trễ… giữ hook thêm vài giây" (và dòng 6594–6596 `task.delay(4)` làm lại việc đó, vô nghĩa). Thực tế hook **không** ghi nhận gì sau dòng 6591 → GUI tạo trong `task.spawn`/sau `HttpGet` không được scale.

**Vấn đề 3 — rò connection:** dòng 6630–6632 `hub:GetPropertyChangedSignal("AbsoluteSize"):Connect(...)` tạo mới mỗi lần chạy, **không** `Disconnect`, không vào `trackConn`.

**Gợi ý sửa:** dùng đúng khuôn mẫu của `S.HookInstanceNew` (chỉ gán lại nếu `Instance.new` vẫn là hàm của mình), hoặc đơn giản hơn: **khuyến nghị người dùng dùng API `_G.BananaCatHubAPI`** thay vì sinh wrapper (hub đã tự fit khi bấm ▶), và giữ wrapper chỉ như "di sản" nếu cần tương thích.

---

### 🟡 B5 — Lớp compat file làm `Store` báo "đã lưu xuống đĩa" nhưng thực ra chỉ nằm trong RAM

**Ở đâu:** `Store.canWrite()` (1211) kiểm tra global **tại thời điểm gọi**; `S.EnsureCompat` (1519+) bù `readfile/writefile/isfile` bằng ổ đĩa ảo `S.vfs` — nhưng chỉ chạy ở **lần bấm ▶ đầu tiên**, tức **sau** `Store.load()` (1429).

**Hệ quả:** trên executor **không** có filesystem: lúc nạp thì `mode = "none"` (đúng), nhưng sau khi chạy code lần đầu, `Store.canWrite()` trả `true` giả → `Store.write` "thành công" vào `S.vfs` → `Store.mode = "file"`, `lastError = nil` → nhãn trạng thái nói đã lưu xuống đĩa trong khi **dữ liệu mất khi thoát game** (đúng loại lỗi mà dòng 1185–1188 tuyên bố đã sửa).

**Gợi ý sửa:** đánh dấu vùng ảo, ví dụ `Store.hasRealFs = (type(writefile) == "function")` **chốt một lần lúc khởi động** (trước `EnsureCompat`) rồi `canWrite()` dùng cờ đó; hoặc kiểm `S.vfsSpare` để phân biệt.

---

### 🟡 B6 — Bảo mật: API key Gemini nằm trong query string và lưu plaintext

**Ở đâu:** dòng **4037**:
```lua
local url = ".../gemini-2.5-flash:generateContent?key="..key
```
- Key trong URL dễ lọt vào log/proxy/ảnh chụp màn hình; Google khuyến nghị header. **Sửa:** bỏ `?key=` và thêm `["x-goog-api-key"] = key` vào `Headers` (khối `RequestAsync`, dòng 4084–4090).
- `banana_cat_gemini_key.txt` (3910) lưu **plaintext** trong workspace executor; `MaskKey` (3939) chỉ che ở UI. Nên cảnh báo rõ trong tab AI, hoặc bỏ hẳn việc lưu file.
- Điểm cộng: `LoadApiKey` (3917) đã **ưu tiên file hơn `_G`** kèm lý do rất đúng (vì hub nạp Dex/IY/SimpleSpy vào cùng `_G`), và v4.3 đã sửa lỗi ghi đè key bằng chuỗi đã che.

---

### 🟡 B7 — Nạp code từ mạng: 3 URL không ghim commit

**Ở đâu:** dòng **2271–2273** và **7056–7064**:
`raw.githubusercontent.com/infyiff/backup/main/dex.lua`, `.../EdgeIY/infiniteyield/master/source`, `.../ex-serum/SimpleSpy/main/SimpleSpy.lua`

Cả 3 dùng `loadstring(game:HttpGet(url))()` — **bất kỳ thay đổi nào ở repo đó** (hoặc chiếm repo) đều trở thành code chạy toàn quyền trong client của người dùng. Ngoài ra `S.FetchServers` (6998–7007) gọi `game:HttpGet` + `JSONDecode` **không pcall** (an toàn nhờ caller `RunHubAction` bọc pcall ở 7131 — nhưng đây là hợp đồng ngầm, dễ vỡ khi refactor).

**Gợi ý:** ghim commit SHA (`/infyiff/backup/<sha>/dex.lua`), thêm cảnh báo "đang chạy script ngoài" trước khi thực thi, và bọc pcall trực tiếp trong `FetchServers`.

---

### ⚪ B8 — Phiên bản không nhất quán (4 chỗ khác nhau)

| Nơi | Chuỗi | Dòng |
|---|---|---|
| Tiêu đề file | `v4.8` | 2 |
| Pill trên thanh tiêu đề | `"v4.6 · DELTA"` | 727 |
| `print` tổng kết cuối | `"… v4.6 — sẵn sàng!"` | 7606 |
| `identifyexecutor` | `"BananaCatHub-Compat", "4.7"` | 1528 |

→ Người dùng không biết mình đang chạy bản nào; log F9 cũng nói sai. **Sửa:** một hằng số `S.VERSION = "4.8"` dùng cho cả 4 chỗ (nhớ cộng thêm 1 slot local — còn dư ~36).

### ⚪ B9 — Số liệu trong comment đã lỗi thời + 1 hằng số chết

- Dòng 645 nói `189/200` biến local, dòng 884 nói `188/200` → thực tế AST đếm **164**. Không phải lỗi chạy, nhưng làm người đọc sau hiểu sai ngân sách.
- `S.WRAP_MARK_NEW` (1167) được gán mà **không nơi nào dùng** (chỉ `S.WRAP_MARK_OLD` được dùng ở 1170).
- 3 local tạo rồi không dùng: `nameLbl` (2114), `senderLbl` (3711), `textLbl` (3783).

### ⚪ B10 — Vài chi tiết nhỏ khác

- **4032–4034:** `HttpService.HttpEnabled = true` là no-op phía client (rất dễ gây hiểu nhầm "code này bật HTTP rồi"); nên xoá hoặc ghi chú.
- **4144–4152:** retry 429 đúng (exponential 2/4s), nhưng `SendQuestion` khoá bằng `isSending` — nếu `AskGemini` treo lâu, không có timeout/cách huỷ. Nên thêm giới hạn thời gian hoặc nút ⏹.
- **5406–5422:** `recorder` trả về `inst` cho **mọi** lớp, kể cả khi `st.probing` — đúng, nhưng `records` chỉ ghi `ScreenGui`; `Folder` chỉ được bắt qua watcher. Chấp nhận được, chỉ cần biết.
- **6848–6850:** khi xoá tab tính năng, `table.remove(featureTabs, i)` dùng biến vòng lặp `i` (đúng trong Lua vì mỗi vòng tạo local mới) — **không phải lỗi**, nhưng rất dễ vỡ nếu sau này có ai đổi sang gán lại `i`. Ghi chú thêm cho an toàn.
- **`S.PARK_MAX = 2`** (5702) hard-code; nên đưa vào `settings` và lưu đĩa nếu muốn người dùng chỉnh.

---

## 5. Hiệu năng

| Điểm | Đánh giá |
|---|---|
| Vòng lặp mỗi frame | **Chỉ 1** (`RunService.RenderStepped`, 2604), throttle 20Hz, thoát sớm khi menu đóng/không ở tab 🛠 → gần như không tốn khi chơi. |
| Debounce | `BcFit` 0.05s (763–770), `Store.saveSoon` 0.3s (1342), watcher 11s tối đa, `EndRunCapture` **nhả hook ngay** sau lần chạy đầu (1738–1747) — rất đúng: không giữ hook khi lặp N lần. |
| Rủi ro còn lại | `RebuildScripts`/`RebuildHubList` **Destroy rồi dựng lại toàn bộ danh sách** mỗi lần gõ 1 ký tự tìm kiếm (2073, 7307) → với vài chục mục thì ổn, vài trăm mục sẽ giật. Nên debounce ô tìm kiếm (~0.15s) hoặc dùng `Visible` thay vì Destroy. |
| Bộ nhớ | `chatHistory` bị chặn đúng (40 message / 60k ký tự, 4000–4001, 4190). `S.embeds` được `PruneEmbeds` dọn theo vòng đời GUI (4440). Bong bóng chat chỉ bị xoá qua nút 🧹 — không có giới hạn cứng: chat rất dài sẽ giữ nhiều instance (nhỏ, nhưng đáng cap ~100 bong bóng). |

---

## 6. Bảo mật (nhìn thẳng vào bản chất)

Đây là **script executor**: nó chạy code tuỳ ý trong client, và một phần tính năng là "dán link là chạy". Trong khuôn khổ đó, code này làm khá tốt:

✅ `NormalizeRunnable` **chặn** URL chứa `"` / `\` / ký tự điều khiển trước khi nội suy → chặn một lớp chèn code qua link.
✅ `EnsureCompat` chỉ bù hàm thiếu, không đè hàm thật; `LoadApiKey` chống "key giả" tiêm qua `_G`.
✅ Không có chỗ nào ghi global ngoài ý muốn (0 phát hiện) — quan trọng vì Dex/IY/SimpleSpy chạy chung `_G`.

⚠️ Cần siết: (1) 3 URL không ghim commit (B7); (2) key Gemini trong query string + plaintext (B6); (3) compat bù **giả** `hookfunction`, `Drawing`, `firetouchinterest`, `getrawmetatable` → script tải về tưởng đang hook thật mà thực chất không; nguy hiểm ở chỗ **im lặng thành công**. Nên đánh dấu rõ trong `S.CompatNote` (đã có, nhưng chỉ liệt kê 4 tên đầu) và cân nhắc `warn` cho nhóm hàm "nguy hiểm nhưng giả" này.

---

## 7. Kiểm thử — thứ repo đang **thiếu**

- Khối changelog (dòng 83) tuyên bố **"118 kiểm thử tự động PASS"**, và nói bộ test nằm ở `/home/user/luachk` — **thư mục này không tồn tại** trong checkout hiện tại (và cố tình nằm ngoài repo "để không làm bẩn git").
- Trong repo hiện chỉ có 2 file được track: `script.js` và `aiaiaitao3` (bản **v4.4a**, 3.513 dòng — snapshot cũ của cùng dự án) + **1 commit** duy nhất ("Boss Bot sửa và cập nhật lại file script: script.js"). Không có `README`, `.gitignore`, license, hay CI.

**Đề xuất:** đưa bộ test vào repo ở `tests/` (kèm `node check.js` + `test/runtest.js` như mô tả) để tuyên bố "118 test PASS" có thể tái lập; thêm `README.md` nói rõ `script.js` là bản chính và `aiaiaitao3` chỉ là lịch sử; thêm `.gitignore`.

---

## 8. Việc nên làm, theo thứ tự ưu tiên

| # | Việc | Dòng | Công |
|---|---|---|---|
| 1 | Sửa `LayoutOrder` (B1) — bảo toàn bảng thứ tự 1..6 + 99, chỉ dồn nhóm ≥7 | 6852, 6950 | ~10 phút |
| 2 | Trả `parkBtn.Text` về icon + đưa số đếm vào `BCTabName` (B2) | 5755, 5766, 5815 | ~5 phút |
| 3 | Chốt `Store.hasRealFs` lúc khởi động để hết báo "đã lưu" giả (B5) | 1211, 1429 | ~10 phút |
| 4 | Chuyển API key Gemini sang header `x-goog-api-key` + cảnh báo plaintext (B6) | 4037, 4084–4090 | ~10 phút |
| 5 | Ghim commit SHA cho 3 URL ngoài (B7) | 2271–2273, 7056–7064 | ~10 phút |
| 6 | Gom `S.VERSION` dùng cho pill/print/identifyexecutor (B8) | 727, 7606, 1528 | ~5 phút |
| 7 | Sửa wrapper tự sinh theo khuôn `HookInstanceNew` + `trackConn` cho connection (B4) | 6582–6635 | ~20 phút |
| 8 | Chụp lại snapshot trong `FitEmbedded` khi cần (B3) | 4521–4560, 5198 | ~20 phút |
| 9 | Debounce tìm kiếm ở 2 danh sách (hiệu năng) | 2073, 7307 | ~10 phút |
| 10 | Dọn dòng chết: `S.WRAP_MARK_NEW`, 3 local thừa, no-op `HttpEnabled`, cập nhật số local trong comment, xoá/nuôi `aiaiaitao3` | 645, 884, 1167, 2114, 3711, 3783, 4032 | ~10 phút |

**Nợ kỹ thuật dài hạn (nên tính, không gấp):** tách file 7.611 dòng thành các mô-đun (`ui.lua`, `store.lua`, `compat.lua`, `embed.lua`, `tabs/*.lua`) nạp qua một loader; thay cặp mảng song song `tabs[]`/`tabContent[]` bằng đối tượng tab có `id` (mọi lỗi loại B1 sẽ tự biến mất); bỏ hẳn pattern "khai báo bảng khổng lồ để tiết kiệm slot local" nếu tách file (mỗi chunk lại có 200 slot riêng).

---

## 9. Phụ lục — phương pháp & tái lập

```bash
# 1) cài parser (ngoài repo)
mkdir -p /home/user/.tmpchk && cd /home/user/.tmpchk && npm i luaparse

# 2) chuẩn hoá 22 phép gán ghép của Luau (+=, ..=...) rồi mới parse được bằng luaparse
node norm.js  /home/user/aiaiaitao3/script.js /tmp/norm.lua   # báo: 22 compound, 0 interp, 0 type-annot
node check.js /tmp/norm.lua                                  # → "OK parsed. top-level nodes: 710"

# 3) các phép đo trong báo cáo
node locals.js   # main chunk: 164 local · 547 hàm · top hàm dài nhất
node dead.js     # hàm/hằng định nghĩa mà không dùng
node globals2.js # global ghi ngoài ý muốn: 0
node long.js     # 15 hàm dài nhất
```

**Số liệu thô:** 7.611 dòng, 363.686 byte, ~6.280 dòng code / 715 dòng comment (9,4%) / 617 dòng trống · 547 hàm · 404 member-def · 2.768 lời gọi hàm · 628 `if` · 249 `pcall` · 113 `:Connect(` (30 qua `trackConn`) · 14 `task.spawn` / 26 `task.delay` / 8 `task.defer` / 23 `task.wait` · 0 `wait()`/`spawn()` kiểu cũ.

**Giới hạn của phân tích:** đây là phân tích **tĩnh** — chưa chạy được trong Roblox/executor thật, nên các luận điểm về hành vi runtime (hook có ăn không, GUI nào bị nhúng) dựa trên đọc code + comment, không dựa trên quan sát trong game. Ngoài ra báo cáo không xác minh nội dung 3 script ngoài (Dex/IY/SimpleSpy) vì chúng được tải từ mạng lúc chạy.
