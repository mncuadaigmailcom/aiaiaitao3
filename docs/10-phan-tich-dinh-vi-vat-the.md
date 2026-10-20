# 10. Phân tích tính năng định vị vật thể (`S.ObjTrack`)

> **Phạm vi:** khối `S.ObjTrack` trong `script.js` — tính năng 🌳 trong **tab Người chơi**.
> Đây là bản phân tích **đọc mã + chạy lại mã trích**, không phải chạy trong Roblox Studio.
>
> **Đã kiểm chứng tự động:**
> - `npm run test:legacy` → **12/12 kiểm tra tái hiện đúng 9 lỗi** của bản gốc.
> - `npm test` → **142/142** (trong đó 27 test cho module mới `object-locator/ObjectLocator.lua`).
>
> Môi trường: máy ảo Lua 5.3 (fengari) + mock Roblox API + đồng hồ ảo.
> Nó chứng minh **logic**, không chứng minh API Roblox thật hành xử giống mock,
> và không tạo ra được số FPS/RAM/CPU thật.

---

## 1. Vị trí mã nguồn

`script.js` là một LocalScript ~7.883 dòng, ~779 KB, xuống dòng CRLF. Toàn bộ
tính năng định vị vật thể nằm trong **một bảng duy nhất `S.ObjTrack`**:

| Thành phần | Dòng | Ghi chú |
| ---------- | ---- | ------- |
| Khai báo `S.ObjTrack = { ... }` + `OT.palette` | 3796–3836 | 8 màu `{name, fill, out}` |
| Tiện ích tên/path (`Pal`, `PathOf`, `Info`, `CopyCoords`, `CopyPath`) | 3833–3864 | |
| Chuẩn hoá + khớp tên (`Norm`, `Split`, `NormCached`, `MatchesNorm`, `SharedNameMatch`, `ResolvePath`) | 3865–3894 | gập dấu tiếng Việt |
| Quản lý mục ghim (`RebuildKeys`, `AddEntry`, `RemoveEntry`, `ClearEntries`) | 3899–3920 | |
| Preset (`Save`, `UseSaved`, `UseAllSaved`, `RemoveSaved`, `ToggleViewMode`, `SyncStore`, `Store.restoreObjTracks`) | 3921–3976 | |
| Tra cứu part (`Matches`, `PartOf`, `RefreshChars`, `Skip`) | 3977–3991 | |
| Hiển thị (`Gui`, `Kill`, `Clear`, `_MakeBox`, `Make`, `TickOne`, `Tick`) | 3992–4067 | |
| Quét (`ScanBegin`, `ScanHit`, `ScanSlice`, `ScanFinish`, `DrainPending`, `Rescan`, `Step`) | 4068–4134 | lõi |
| Bật/tắt + cấu hình runtime (`Bind`, `Unbind`, `Set`, `Toggle`, `SetQuery`, `SetMaxDist`, `CycleColor`, `ApplyStyle`, `Nearest`, `Status`, `OnFlyChange`) | 4135–4172 | |
| Panel GUI trong tab Người chơi (IIFE) | 4173–4413 | `RefreshList` 4290, `OpenObjectPanel` 4354, `AutoRestoreSaved` 4411 |
| Tích hợp `S.Move` (bay tới vật) | 2194, 2211, 2226, 2234 | dùng `OT.PartOf`, `OT.OnFlyChange` |
| Getter cho phần khác của hub | 2270 | `S.ObjTrack` |
| Lệnh chat `objfind` / `objfly` / `objclear` | 2554–2560 | |
| Khôi phục preset từ file save | 3974, 7781–7784 | qua `Store.restoreObjTracks` |

Panel được dựng **một lần** khi script chạy. `RefreshList` chỉ dựng lại các dòng
khi "chữ ký" thay đổi; `paint()` chỉ đổi chữ/màu của nút.

---

## 2. Mô hình dữ liệu

### 2.1 Cấu hình (đọc/ghi trực tiếp từ panel)

```lua
on, query, keys, pathKeys, entries,
maxDist = 0, maxItems = 60, showRows = 8,
thru = true, showLabel = true, showBox = false, showXYZ = true, skipPlayers = true,
color = 1, savedList, viewMode,
rescanEvery = 0.8, scanIdle = 1.0,
scanBudget = 300, scanSliceMs = 2.0, makeBudget = 15,
tickSliceMs = 1.5, labelBudget = 25, infoEvery = 0.25, labelEvery = 0.12
```

Không có bảng `Config` riêng: panel sửa thẳng `OT.showBox`, `OT.thru`… nên mọi
thay đổi đều là "nguồn sự thật" nằm rải rác.

### 2.2 Trạng thái hiển thị

| Trường | Ý nghĩa |
| ------ | ------- |
| `items[inst]` | `{ hl, bb, lbl, box, part, dist, adornee, slot, txt }` — một mục đang vẽ |
| `_order[slot]` = `inst` | mảng thưa để `Tick` quét vòng tròn |
| `_slotN`, `_orderN`, `_tickIdx` | bộ đếm slot và con trỏ vòng |
| `list` | các hit đã sắp xếp, cắt còn `maxItems` |
| `_pending` | hit chờ tạo Highlight/Billboard (giới hạn `makeBudget`/khung) |
| `_hits` | hit thô của lượt quét hiện tại |
| `_gui` | ScreenGui dự phòng `BC_ObjTrackESP` |
| `_nc` | cache tên đã chuẩn hoá, `__mode = "k"` (weak key) |
| `_chars` | danh sách nhân vật để bỏ qua |
| `_rowSig`, `_tagSig` | chữ ký để tránh dựng lại UI |
| `_found`, `_scanned`, `_skipped`, `_capped`, `_scanMs`, `_err` | số liệu chẩn đoán |

### 2.3 Trạng thái quét

`_queue` là **ngăn xếp** (thêm con vào cuối, lấy từ cuối), `_qN` là con trỏ.
`_passing = true` nghĩa là lượt quét còn dang dở. `_passT0` là thời điểm bắt đầu
lượt — chính là gốc của lỗi đo `scanMs` ở mục 5.6.

---

## 3. Luồng chạy

### 3.1 Nhập truy vấn

```lua
queryIn:GetPropertyChangedSignal("Text"):Connect(function()
    S.ObjTrack.SetQuery(queryIn.Text)
end)
```

`SetQuery` (4143) **không** quét ngay: nó gán `query`, gọi `RebuildKeys()`, bật cờ
`_fastUntil = tick() + 4` (tăng tần suất tick trong 4 giây) rồi debounce 0,2 giây
bằng `S.Debounce("objtrack", 0.2, ...)`. Sau debounce:

- không còn khoá nào → `Set(false)` + `Clear()`;
- còn khoá → `on = true`, `Bind()`, `Rescan(true)`.

`RebuildKeys` (3899) duyệt `entries` + `query`, tách theo dấu phẩy/chấm phẩy, và
phân loại **name** (khoá chuỗi con) hay **path** (phân giải thành instance ngay
lúc thêm).

### 3.2 Quét

`Step(dt)` được gắn vào `RunService:BindToRenderStep("BC_ObjTrack",
Enum.RenderPriority.Camera.Value - 6, ...)`. Mỗi khung:

1. Cộng dồn `labelEvery` (0,12 s; 0,06 s khi "fast"; ×3 khi không có khoá;
   ×2,5 khi menu đóng; ×1,8 khi không ở tab Người chơi) → `Tick()`.
2. Nếu đang có khoá: cộng dồn `scanIdle` (1,0 s; 0,3 s khi fast; ×1,5/×1,2 khi ẩn)
   → `ScanBegin()`.
3. Nếu `_passing` → `ScanSlice()` với **300 node / 2 ms mỗi khung**.
4. Nếu có `_pending` → `DrainPending(quota 15)` (5 hoặc 2 khi UI ẩn).

`ScanBegin` (4068) đặt `_myPos = S.Move.Root().Position`, nạp path, nạp danh sách
nhân vật, đưa `workspace` vào ngăn xếp, xoá `_hits`.

`ScanSlice` (4085) lấy từng instance khỏi ngăn xếp, `pcall(GetChildren)`, đẩy con
vào ngăn xếp, rồi:

```lua
if inst ~= workspace then
    _scanned = _scanned + 1
    if Candidate(inst) and not Skip(inst) then ScanHit(inst) end
end
```

`ScanHit` (4072):

- **BasePart:** đi ngược tối đa 32 cấp cha; nếu gặp `Model` khớp khoá và
  `SharedNameMatch(part, model)` → bỏ qua part, tăng `_skipped` (gộp part con).
  Ngược lại tính `dist` và lọc `maxDist`.
- **Model/Folder:** lấy part đại diện bằng `PartOf` (PrimaryPart →
  `FindFirstChildWhichIsA("BasePart", true)` → đệ quy), rồi tính `dist`.

`ScanFinish` (4093) sắp xếp theo `dist`, giữ `maxItems`, `Kill` các mục không còn
trong danh sách, đưa mục mới vào `_pending`, đặt `_found`, `_capped`, `_scanMs`,
gọi `RefreshList`.

### 3.3 Tạo hiển thị

`Make` (4006) tạo cho mỗi vật:

- `Highlight` `BC_OT_HL`, `Adornee = inst` nếu là BasePart/Model, ngược lại `part`;
  `DepthMode = AlwaysOnTop` khi `thru`, `Occluded` khi tắt.
- `BillboardGui` `BC_OT_BB` + `TextLabel`, gắn vào `part`, `MaxDistance = 3000`.
- `BoxHandleAdornment` `BC_OT_BOX` nếu `showBox`.

Mọi lời gọi `New` đều nằm trong `pcall`; nếu executor chặn `Highlight` hoặc
`BillboardGui`, code thử tạo lại trong ScreenGui `BC_ObjTrackESP` (qua `gethui()`
nếu có, không thì `PlayerGui`). Nếu cả hai đều thất bại, `_renderErr = true` và
`Status()` hiện cảnh báo.

### 3.4 Cập nhật mỗi tick

`Tick` (4055) cập nhật tối đa `labelBudget = 25` mục mỗi lần, tối đa 1,5 ms:

```lua
while quota > 0 and guard < n * 2 do
    _tickIdx = (_tickIdx % n) + 1
    local inst = order[_tickIdx]
    if inst == nil then
    elseif items[inst] == nil then order[_tickIdx] = nil
    else quota = quota - 1; TickOne(inst, myPos, pal) end
    if (os.clock() - t0) * 1000 > tickSliceMs then break end
end
```

`TickOne` (4034) tính lại `dist`, bật/tắt Highlight/Nhãn/Hộp theo `maxDist`, đổi
màu, và cập nhật text nhãn:

```
Tên  📏 12m
🧭 11, 0, 0
```

Toạ độ (`otXYZ`) được tính lại **mỗi tick**, kể cả khi tên và khoảng cách không
đổi — một chi tiết nhỏ nhưng có thật.

### 3.5 Panel

`paint()` cập nhật chữ/màu các nút. `RefreshList` (4290) có hai nhánh:

- `viewMode == "saved"`: dựng danh sách preset, chữ ký gồm `id:title`;
- còn lại: tính `shown = min(#list, showRows)` rồi dựng chữ ký
  `Name|instance#Name|instance#…` (dòng 4323), và chỉ dựng lại các dòng khi chữ ký đổi.

Mỗi dòng có các nút: 📊 Xem (thông tin + copy toạ độ/path), 🚀 Bay (gọi
`S.Move.FlyToObject`), 📋 Tên. Thân dòng **không** có hành vi bấm; chỉ ba nút trên
mới phản hồi.

### 3.6 Preset

`Save` (3926) tạo `{ id, slot, title, query, entries, path, color, maxDist,
autoLoad }`, ghi `Store.savedObjTracks` rồi `Store.save()`. `UseSaved` (3947) nạp
lại `entries`, bật định vị và quét. `Store.restoreObjTracks` (3974) được gọi khi
`Store.DoReload` chạy.

### 3.7 Tích hợp `S.Move` và lệnh chat

- `S.Move.FlyToObject` dùng `OT.PartOf(target)` để lấy part đích (2226) và gọi
  `OT.OnFlyChange()` để vẽ lại danh sách (2234).
- `S.Move` cũng có nhánh dùng `OT.PartOf` ở 2194.
- Lệnh chat: `objfind` mở panel và in trạng thái (2555), `objfly` bay tới vật gần
  nhất (2556), `objclear` tắt định vị (2559).

---

## 4. Những điểm làm tốt

1. **Quét tự động có chia nhỏ**: khi đã bật, `Step` chia lượt quét thành
   300 node/2 ms mỗi khung và tách riêng ngân sách tạo hiển thị. (Ngoại lệ:
   mọi thao tác người dùng gọi `Rescan` lại quét đồng bộ — xem 5.1.)
2. **Không dùng pattern Lua** cho ô tìm kiếm: `n:find(key, 1, true)` — người dùng
   gõ `[`, `%`, `-` không làm hỏng tìm kiếm.
3. **Gập dấu tiếng Việt** bằng bảng codepoint (`OT_FOLD`), có fallback khi thiếu
   `utf8`; cache theo instance bằng bảng weak-key.
4. **Gộp part con**: một Model tên "Cây" không sinh 50 Highlight cho 50 part.
5. **Fallback cho executor**: mọi API GUI đều `pcall`, có ScreenGui dự phòng,
   có cảnh báo thay vì crash.
6. **Tôn trọng ngữ cảnh**: tăng/giảm tần suất theo tab/menu, không quét khi không
   có khoá, `ResetOnSpawn = false` cho GUI.
7. **Preset nhiều mục**: `entries` cho phép ghim nhiều tên/path cùng lúc; có
   `Save`/`UseSaved`/`UseAllSaved`/`RemoveSaved`.

---

## 5. Lỗi và điểm yếu

> Mỗi lỗi dưới đây đều có kiểm tra chạy được trong `npm run test:legacy`.
> "Tái hiện" nghĩa là test **đạt khi lỗi còn trong mã gốc**.

### 5.1. Quét đồng bộ toàn workspace khi gõ / bật / thêm mục — `LEGACY-SYNC-RESCAN`

**Mức:** cao (treo khung hình trên game lớn).

`Rescan` (4106) bỏ qua hoàn toàn cơ chế chia nhỏ:

```lua
pcall(OT.ScanBegin)
if not OT._passing then return OT._found or 0 end
OT.ScanSlice(1e9, 1e9, true)   -- 1 tỉ node, 1 tỉ ms, quét tới hết
OT.DrainPending(1e9)           -- tạo toàn bộ Highlight trong MỘT khung
```

`ScanBegin` luôn đặt `_passing = true`, nên trong luồng bình thường dòng
`if not OT._passing then return` không bao giờ đúng (nó chỉ có ích nếu `ScanBegin`
lỗi trước khi kịp gán). Với workspace 50.000 instance, một lần gõ phím (sau debounce 0,2 s)
duyệt 50.000 `GetChildren` + tạo hàng chục Highlight trong **một khung** — đúng
kiểu giật mà tính năng này đáng lẽ phải tránh.

`Rescan(true)` được gọi từ: `SetQuery` (4145), `AddEntry` (3911), `Save` (3943),
`UseSaved` (3952), `UseAllSaved`, `ToggleViewMode` (3971), `SetMaxDist` (4151),
`RemoveEntry`, nút 🔄 Quét (4403), nút 🚫 Bỏ qua người chơi (4407).

**Đối chiếu:** `Step` (4112) đã có cơ chế đúng — chỉ cần cho `Rescan` dùng lại
`ScanSlice()` mặc định thay vì `1e9`. Test: `LEGACY-SYNC-RESCAN` (chạy `Rescan`
thật) và `LEGACY-SYNC-RESCAN-SRC` (kiểm tra mã nguồn).

### 5.2. Khoảng cách trên danh sách đóng băng — `LEGACY-STALE-LIST`

**Mức:** trung bình (số liệu UI sai, không phải lỗi chức năng).

Chữ ký dòng (4323) chỉ gồm tên và instance:

```lua
sigParts[i] = tostring(h.inst.Name) .. "|" .. tostring(h.inst)
```

`h.dist` không tham gia, nên khi người chơi di chuyển, `TickOne` cập nhật
`it.dist` và nhãn 3D, nhưng dòng trong bảng **không được dựng lại** → số "m" đứng
yên cho tới khi thứ tự danh sách đổi. Test chạy đúng đoạn mã trên với `dist` 10 →
99 và so sánh chữ ký.

**Đối chiếu:** module mới tính `dist` lại trong `snapshot()` mỗi lần làm mới UI
(0,25 s) và ghi đè text từng dòng, không cần dựng lại hàng.

### 5.3. Path chưa phân giải bị biến thành khoá rác — `LEGACY-PATH-DEMOTE`

**Mức:** trung bình (mục "chết" vĩnh viễn, người dùng không hiểu vì sao).

`AddEntry` (3905):

```lua
local kind = OT.IsPathLike(raw) and "path" or "name"
if kind == "path" then
    local ok, inst = pcall(OT.ResolvePath, key)
    if not ok or inst == nil then kind = "name" end
end
```

Nếu vật chưa stream (hoặc path gõ sai), path bị đổi thành `name`. `RebuildKeys`
(3899) sau đó đẩy nguyên chuỗi `workspace.khong ton tai` vào `keys` như một khoá
chuỗi con. Khoá này chứa dấu chấm nên **không bao giờ khớp** tên vật thật; mục
vẫn nằm trong danh sách ghim, trông như đang bật nhưng không tìm được gì.

**Đối chiếu:** module mới giữ entry `path` nguyên vẹn, đếm `unresolvedPaths`, thử
phân giải lại mỗi lượt quét (cache TTL 2 s) và hiện "⚠️ path chưa tìm thấy" —
test `SCAN-004`.

### 5.4. Preset lưu `color`/`maxDist` nhưng không khôi phục — `LEGACY-USESAVED-META`

**Mức:** trung bình (mất cấu hình người dùng đã lưu).

`Save` ghi `color = OT.color`, `maxDist = OT.maxDist` (3943). `UseSaved` (3947)
chỉ nạp `entries`/`query`, **không** gán lại hai trường này; `autoLoad` cũng không
được đọc. Người dùng lưu preset "trong 99 m, màu tím", chọn lại → về màu 1 và
không giới hạn.

**Đối chiếu:** `Controller:applyPreset` áp dụng cả `entries`, `maxDistance`,
`colorIndex`, `labelMaxDistance`, các công tắc hiển thị; test `CTRL-003`.

### 5.5. Rò rỉ slot sau `Clear` — `LEGACY-SLOT-LEAK`

**Mức:** trung bình, **tăng dần theo thời gian**.

```lua
function OT.Clear()
    for inst in pairs(OT.items) do OT.Kill(inst) end
    OT.items = {}
    OT._order, OT._tickIdx, OT._pending = {}, 0, {}
    ...
    -- KHÔNG đụng tới _slotN / _orderN
end
```

`Make` tăng `_slotN` mãi. Sau mỗi lần bật/tắt, slot mới bắt đầu từ số cũ + 1..
+60. `Tick` lại dùng `n = _orderN` làm module vòng:

```lua
while quota > 0 and guard < n * 2 do
    _tickIdx = (_tickIdx % n) + 1
    ...
```

Sau 1.000 lần bật/tắt, `_orderN` ≈ 60.000 → mỗi tick lặp tới 120.000 lần trên các
ô `nil`, mỗi lần gọi `os.clock()`. Đây là chi phí **tăng vô hạn** dù số vật đang
hiển thị không đổi.

**Đối chiếu:** module mới không dùng slot; hiển thị lưu theo instance trong
`Visuals.items`, xoá là hết; test `VIS-003`.

### 5.6. `scanMs` đo cả thời gian chờ — `LEGACY-SCANMS-ELAPSED`

**Mức:** thấp (chỉ ảnh hưởng số liệu chẩn đoán).

`ScanFinish` (4100):

```lua
OT._scanMs = otRound((os.clock() - (OT._passT0 or os.clock())) * 1000)
```

`_passT0` đặt ở `ScanBegin`; lượt quét kéo dài nhiều khung (300 node/khung). Với
workspace lớn, `_scanMs` báo hàng nghìn ms dù CPU chỉ chạy vài ms rải rác — đúng
hiện tượng "quét 3000ms" trong thử nghiệm.

**Đối chiếu:** module mới cộng dồn thời gian **chỉ trong mỗi lần `step()`** —
test `SCAN-007` (200 part, `scanMs < 5` dù nhiều khung trôi qua).

### 5.7. `AutoRestoreSaved` được gọi nhưng không tồn tại — `LEGACY-AUTORESTORE`

**Mức:** thấp (im lặng, nhưng tính năng chết).

Panel gọi `pcall(S.ObjTrack.AutoRestoreSaved)` (4411) và không có định nghĩa nào
trong toàn bộ `script.js`. Nhờ `pcall`, không có lỗi hiện ra; preset đánh dấu
`autoLoad = true` không bao giờ tự bật khi vào game. Kiểm tra tĩnh đếm 1 lời gọi,
0 định nghĩa.

**Đối chiếu:** `Store`/`Controller:restore()` tự nạp preset và chỉ bật khi
`autoStart`/preset `active`; test `CTRL-003`.

### 5.8. Lưu trùng preset — `LEGACY-SAVE-DUP`

**Mức:** thấp.

`Save` (3943) luôn `OT.savedList[idx+1] = item`, không so trùng. Bấm 💾 hai lần
cho cùng một truy vấn tạo hai preset giống hệt; danh sách phình và người dùng
phải xoá tay.

**Đối chiếu:** `Controller:buildPreset`/`savePreset` tính chữ ký preset; lưu lại
cùng nội dung sẽ cập nhật mục cũ thay vì nhân bản (xem `presetSignature`).

### 5.9. Mất gốc toạ độ → lọc "Xa nhất" vô hiệu — `LEGACY-NO-ORIGIN`

**Mức:** trung bình (chỉ xảy ra khi spectate/freecam/chết, nhưng âm thầm sai).

`ScanHit` (4073):

```lua
local d = 0
if okP2 and pos and OT._myPos then d = (pos - OT._myPos).Magnitude end
if OT.maxDist <= 0 or d <= OT.maxDist then
    OT._hits[#OT._hits + 1] = { ... dist = d }
end
```

Khi `S.Move.Root()` trả `nil` (không có nhân vật), `_myPos = nil` → mọi vật nhận
`d = 0` → **lọt qua mọi bộ lọc** và nhãn hiện "0m". Test đặt một part ở 1.000 stud
với `maxDist = 50`; nó vẫn được thêm vào `_hits`.

**Đối chiếu:** module mới đánh dấu `unknownDist`, **không lọc mù**, hiện `--m`
thay vì bịa 0 m; khi có camera/nhân vật trở lại thì lọc đúng — test `SCAN-008`.

### 5.10. Các điểm yếu khác (đọc mã, chưa có test riêng)

| Điểm yếu | Vị trí | Ảnh hưởng |
| -------- | ----- | --------- |
| `OT.Split` là mã chết nhưng có tác dụng phụ gán `OT.pathKeys` | 3869 | nếu ai gọi sẽ ghi đè path hiện tại |
| `Set(false)` không xoá `keys`/`query` | 4138–4142 | trạng thái "đã tắt" nhưng vẫn còn truy vấn; `Status` dễ gây hiểu lầm |
| `BillboardGui.MaxDistance = 3000` cứng | 4020, 4026 | `maxDist` 5.000 m vẫn không thấy nhãn; không cấu hình được |
| `TickOne` tính lại toạ độ mỗi tick khi tên/kc không đổi | 4043–4046 | đọc `Position` thừa cho mọi nhãn |
| `_found` đếm **trước** khi cắt `maxItems` | 4100 | chuỗi "n/found" khó hiểu ("40/4000") |
| Dựng lại toàn bộ dòng khi chữ ký đổi | 4330–4345 | nhiều `Destroy`/`Instantiate` mỗi lần thứ tự đổi |
| Dùng `tick()` (API cũ) | 3912, 3942, 4144 | không có vấn đề chức năng, nhưng Roblox khuyến nghị `os.clock()` |
| Toàn bộ tính năng nằm trong một bảng 600 dòng giữa script 7.883 dòng | 3796–4413 | khó test, khó tái sử dụng, sửa một chỗ ảnh hưởng panel |

---

## 6. Vì sao viết lại thay vì sửa từng lỗi

Sửa tại chỗ là khả thi cho 5.1 (bỏ `1e9`), 5.2 (thêm `dist` vào chữ ký), 5.3
(giữ path chưa phân giải), 5.4 (áp dụng `maxDist`/`color`). Nhưng:

1. **Không có ranh giới module.** `OT` vừa là state, vừa là API cho `S.Move`, vừa
   là nơi panel đọc/ghi trực tiếp. Mọi bản vá đều phải sửa trong file 779 KB, và
   không thể chạy test nếu không trích mã.
2. **Không có cấu hình.** 20+ hằng số nằm rải trong thân hàm; người dùng không
   chỉnh được ngân sách quét cho máy yếu.
3. **Không có vòng đời.** `Bind`/`Unbind` gắn theo `Set`, nhưng GUI, `Restore`,
   connection `CharacterAdded`… không có một chỗ dọn dẹp.
4. **Không test được.** Toàn bộ nằm trong một LocalScript khổng lồ. Module mới
   `return ObjectLocator` và tự chạy chỉ khi `type(game) == "userdata"`.

Module mới giữ **cùng mô hình tính năng** (tên/path, nhiều mục ghim, Highlight +
nhãn, xuyên tường, giới hạn khoảng cách, preset, đi tới vật) nhưng tách thành 6
phần có thể test độc lập.

---

## 7. Đối chiếu bản gốc và module mới

| Khía cạnh | `S.ObjTrack` (gốc) | `ObjectLocator` (mới) |
| --------- | ------------------ | --------------------- |
| Đơn vị mã | 1 bảng trong script 7.883 dòng | 1 tệp 3.717 dòng, `return ObjectLocator` |
| Quét | 300 node/2 ms mỗi khung, **trừ `Rescan`** | `Scanner:step(maxNodes, maxMs)`, **không có đường tắt đồng bộ** |
| Gõ phím | debounce 0,2 s → quét đồng bộ | không debounce, nhưng chỉ đặt `nextScanAt`; quét theo khung |
| Tên tiếng Việt | `OT.Norm` gập dấu | `Core.normalize` gập dấu, cùng ý tưởng |
| Path chưa phân giải | hạ cấp thành name rác | giữ entry path + `unresolvedPaths` + thử lại |
| Gộp part con | `ScanHit` + `SharedNameMatch` | `Scanner:groupedBy` theo khoá |
| Khoảng cách UI | đóng băng (chữ ký thiếu `dist`) | tính lại trong `snapshot()` mỗi 0,25 s |
| Mất gốc toạ độ | lọc mù, báo 0 m | `unknownDist`, hiện `--m`, không lọc mù |
| Giới hạn khoảng cách | lọc lúc quét | lọc lúc quét + nhãn/Hiển thị theo `maxDistance` |
| Hiển thị | Highlight + Billboard + Box | Highlight + SelectionBox + Billboard + Box, fallback |
| Preset | `savedList` trong `Store`, thiếu meta | `Store` JSON riêng, áp dụng đủ meta, chống trùng |
| Dọn dẹp | `Clear` không reset slot | `clearAll` + `destroy` huỷ toàn bộ |
| Cấu hình | sửa trực tiếp `OT.*` | `ObjectLocator.Config` + `options.config` |
| API | `_G.BananaCatHub_ObjTrack` | `_G.ObjectLocator` + `return ObjectLocator` |
| Test | 12 kiểm tra tái hiện lỗi | 27 test hành vi trên mock |

---

## 8. Cách tái hiện

```bash
npm install            # node_modules không nằm trong snapshot
npm run test:legacy    # 12/12 — đạt = lỗi gốc vẫn còn
npm test               # 140/140 — gồm 25 test của module mới
```

`tests/lib/legacy-objtrack.js` trích **nguyên văn** các khối:

- `local function otRound` → `function OT.RefreshChars`
- `function OT.Kill` → `function OT._MakeBox`
- `function OT.ScanBegin` → `function OT.ScanSlice`
- `function OT.ScanFinish` → `function OT.DrainPending`
- `function OT.Rescan` → `function OT.Step`
- đoạn dựng chữ ký trong `RefreshList`

rồi ghép vào một module Lua với `S`/`Store` giả. `tests/legacy/cases.lua` chứa 8
ca chạy mã thật; `staticChecks()` trong file JS kiểm tra 4 điều kiện tĩnh.

**Giới hạn của cách tái hiện:** các hàm được trích chạy trên mock, không có
RenderStepped thật, không có streaming, không có executor. Nó chứng minh **thuật
toán và luồng dữ liệu** sai, không đo được mức giật thực tế. Muốn đo giật thật
phải làm trong Studio với MicroProfiler — xem `docs/07-do-luong-hoan-tac.md`.
