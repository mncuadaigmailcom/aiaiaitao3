# 🌳 ObjectLocator — định vị vật thể cho Roblox

Một tệp Lua **tự chứa** (3.717 dòng) thay thế tính năng định vị vật thể
`S.ObjTrack` trong tab Người chơi của `script.js`.

- Chạy trong **executor** (LocalScript phía client) hoặc dán vào Studio để thử.
- Chỉ dùng API công khai của Roblox: `Instance.new`, `Highlight`, `BillboardGui`,
  `SelectionBox`, `BoxHandleAdornment`, `RunService`, `UserInputService`.
- **Không** có wallhack/exploit, không sửa server, không vượt anti-cheat. Chỉ vẽ
  vật phía client của chính bạn. Hãy dùng ở nơi được phép.

> **Đã kiểm chứng:** 27/27 test tự động trên máy ảo Lua 5.3 + mock Roblox.
> **Chưa** chạy trong Roblox Studio — môi trường làm việc không có Studio.
> Xem [Giới hạn](#7-giới-hạn--những-điều-chưa-kiểm-chứng).

---

## 1. Chạy thử

### Cách A — dán vào executor

1. Mở `object-locator/ObjectLocator.lua`.
2. Copy toàn bộ nội dung, dán vào executor (Synapse, Fluxus, Delta…), Execute.
3. Panel hiện ở góc trái; bấm nút nổi 🌳 để mở/thu nhỏ.
4. Gõ tên vật (VD `cây`) vào ô 🔎 rồi Enter.

### Cách B — nạp từ tệp đã lưu

```lua
local source = readfile("ObjectLocator.lua")   -- executor có readfile
local ObjectLocator = loadstring(source)()
ObjectLocator.start()
```

### Cách C — không cần GUI (headless, để test)

```lua
local OL = loadstring(readfile("ObjectLocator.lua"))()
local controller = OL.newController({
    config = { headless = true },
})
controller:setQuery("cây")
for _ = 1, 120 do
    controller:step(1 / 60)
end
print(controller:statusText())
```

> Khi dán vào Roblox thật (`type(game) == "userdata"`), tệp **tự chạy**
> `ObjectLocator.start()` và dọn instance cũ trong `_G.ObjectLocator` trước.
> Trong máy ảo test, nó chỉ `return ObjectLocator` — test tự gọi `start`/`newController`.

---

## 2. Dùng trên giao diện

| Khu vực | Chức năng |
| ------- | --------- |
| Ô 🔎 | Gõ tên hoặc path. Enter = áp dụng; ➕ = ghim thêm một mục (chạy nhiều mục cùng lúc) |
| 🎯 chip | Bấm ✕ để bỏ một mục ghim |
| 🔄 Quét | Quét lại ngay (vẫn chia theo khung) |
| 🧹 Xoá | Tắt định vị, xoá mọi Highlight/Nhãn/Hộp và danh sách |
| 💾 Lưu | Lưu truy vấn hiện tại thành preset (chống trùng) |
| 📂 Preset | Mở danh sách preset: **Dùng** / **Xoá** |
| 🔲 Hộp | Bật `BoxHandleAdornment` + `SelectionBox` quanh vật |
| 💬 Nhãn | Bật/tắt BillboardGui |
| 🧭 Toạ độ | Hiện `X, Y, Z` trên nhãn |
| 🕶 Xuyên tường | `Highlight.DepthMode = AlwaysOnTop`, nhãn luôn nổi |
| 🚫 Bỏ qua người chơi | Không quét part nằm trong nhân vật |
| 📏 Xa nhất | Giới hạn khoảng cách (0 = không giới hạn, trần 100.000 stud) |
| 🎨 Màu | 8 màu: Xanh nước, Xanh ngọc, Cam, Hồng, Tím, Vàng, Đỏ, Xanh dương |
| Danh sách | `#  Tên [Class] · 📏 42m`; bấm một dòng = đi tới vật bằng `Humanoid:MoveTo` |
| — / ✕ | Thu nhỏ / đóng panel; nút nổi 🌳 luôn còn |

Phím tắt mặc định: **RightShift** — bật/tắt định vị. Đổi bằng `Config.keybind`.

---

## 3. Cấu hình

Sửa `Config` ở đầu tệp, hoặc truyền `config` khi `start`/`newController`:

```lua
ObjectLocator.start({
    config = {
        keybind = "RightShift",
        rescanEvery = 1.0,
        scanNodesPerFrame = 320,
        scanMsPerFrame = 1.2,
        maxItems = 60,
        maxDistance = 300,
    },
})
```

| Khoá | Mặc định | Ý nghĩa |
| ---- | -------- | ------- |
| `keybind` | `"RightShift"` | `Enum.KeyCode.*` hoặc `nil` để tắt phím tắt |
| `rescanEvery` | `1.0` | Giây giữa 2 lượt quét khi panel mở |
| `hiddenRescanEvery` | `2.5` | Giây giữa 2 lượt khi panel thu nhỏ |
| `scanNodesPerFrame` | `320` | Trần instance xử lý mỗi khung |
| `scanMsPerFrame` | `1.2` | Trần thời gian quét mỗi khung (ms) |
| `frameBudgetMs` | `3.0` | Trần thời gian cả khối định vị/khung |
| `makePerFrame` | `8` | Số Highlight/Nhãn tạo mới mỗi khung |
| `tickEvery` | `0.22` | Giây giữa 2 lần cập nhật nhãn |
| `tickPerFrame` | `30` | Số vật cập nhật nhãn mỗi lần |
| `uiEvery` | `0.25` | Giây giữa 2 lần làm mới danh sách |
| `maxItems` | `80` | Trần số vật hiển thị |
| `maxHits` | `4000` | Trần hit mỗi lượt quét (`truncated = true` nếu vượt) |
| `maxDistance` | `0` | 0 = không giới hạn (stud) |
| `maxDistanceLimit` | `100000` | Trần khi người dùng nhập |
| `labelMaxDistance` | `5000` | `BillboardGui.MaxDistance` |
| `listRows` | `14` | Số dòng trong bảng kết quả |
| `maxPresets` | `24` | Trần preset |
| `presetsPath` | `"ObjectLocator/presets.json"` | Chỉ ghi khi có `readfile`/`writefile` |
| `autoRestore` | `true` | Nạp preset đã lưu khi khởi động |
| `autoStart` | `false` | Tự bật nếu preset cuối đang `active` |
| `skipPlayers` | `true` | Bỏ qua nhân vật người chơi |
| `showLabel` / `showXYZ` | `true` | Nhãn / toạ độ trên nhãn |
| `showBox` | `false` | Hộp bao quanh |
| `throughWall` | `true` | Xuyên tường |
| `colorIndex` | `1` | Màu ban đầu |
| `headless` | `false` | `true` = không nối `RenderStepped` (test) |

---

## 4. API

`ObjectLocator` trả về bảng có:

```lua
ObjectLocator.VERSION            -- "1.0.0"
ObjectLocator.Config             -- bảng cấu hình mặc định
ObjectLocator.Core               -- chuẩn hoá tên, parse path, khoảng cách…
ObjectLocator.Store              -- đọc/ghi preset JSON (nếu executor cho phép)
ObjectLocator.UI                 -- lớp giao diện
ObjectLocator.newController(opts)
ObjectLocator.newUI(controller, opts)
ObjectLocator.defaultEnv()
ObjectLocator.start(opts)         -- trả instance { controller, ui, destroy }
ObjectLocator.stop()
```

`start` trả về một **instance** và gán `_G.ObjectLocator`. Gọi `stop()` (hoặc
`_G.ObjectLocator.destroy()`) để huỷ GUI, ngắt connection và xoá global.

### Điều khiển bằng mã

```lua
local app = _G.ObjectLocator
local c = app.controller

c:setQuery("cây, đá")                 -- nhiều mục, phân tách , hoặc ;
c:addPinned("Workspace.Rừng Cây.Cây Lớn")  -- ghim thêm một path
c:setMaxDistance(500)                 -- 0 = bỏ giới hạn
c:setMaxItems(120)                    -- trần 500
c:setOption("showBox", true)
c:setOption("throughWall", false)
c:cycleColor()                        -- đổi màu, trả tên màu
c:requestRescan(0)                    -- quét lại ngay (vẫn chia khung)
c:clearAll()                          -- xoá hết mục + hiển thị

local snap = c:snapshot()
print(snap.status)                    -- dòng trạng thái tiếng Việt
print(snap.found, snap.kept, snap.scanned, snap.scanMs)
print(snap.unresolvedPaths)           -- số path chưa tìm thấy
print(snap.truncated, snap.capped)    -- bị cắt do maxHits / maxItems

local inst, dist = c:nearest()        -- trả về instance gần nhất + khoảng cách
if inst ~= nil then
    c:walkTo(inst)                    -- Humanoid:MoveTo
end

c:savePreset("Rừng")                  -- lưu
c:applyPreset(1, true)                -- nạp + bật
c:deletePreset(1)
c:restore()                           -- nạp lại từ đĩa
```

`controller:step(dt)` là hàm thuần: không cần `RenderStepped`. Đây là điểm vào
cho test và cho chế độ `headless`.

---

## 5. Kiến trúc

| Phần | Dòng | Trách nhiệm |
| ---- | ---- | ----------- |
| `Core` | 131 | `normalize` (gập dấu tiếng Việt), `parseList`, `resolvePath`, `matchKey`, `positionOf`, `distance`, `pathOf` |
| `Scanner` | 524 | `begin` / `step(maxNodes, maxMs)` / `finish`; đếm `scanned`, `found`, `grouped`, `truncated`, `unresolvedPaths`, `scanMs` (chỉ thời gian chạy) |
| `Visuals` | 843 | Highlight + `SelectionBox` + Billboard + Box; 8 màu; `error`/`disabled` khi executor chặn; `tick(origin, limit, now)` |
| `Store` | 1331 | Preset JSON; chỉ ghi khi có `readfile`/`writefile`; validate dữ liệu |
| `Controller` | 1490 | Trạng thái, vòng đời `setActive`, `step`, preset, `walkTo`, `snapshot`, `destroy` |
| `UI` | 2489 | Panel tiếng Việt, danh sách, chip, preset, nút nổi |
| `start`/`stop` | 3616 | Gắn phím tắt, `CharacterAdded`, `_G.ObjectLocator`, dọn dẹp |

Nguyên tắc:

1. **Không quét đồng bộ.** Mọi đường vào (`setQuery`, `addPinned`, `requestRescan`,
   `setMaxDistance`) chỉ đặt `nextScanAt`; `step()` mới quét, có trần node + ms.
2. **Không dựng lại UI vô ích.** Chỉ tạo lại hàng khi danh sách instance đổi;
   còn lại chỉ ghi đè text (khoảng cách được tính lại mỗi 0,25 s).
3. **Không ném lỗi ra ngoài.** Mỗi API GUI đều `pcall`; `safeStep` đếm lỗi và
   chỉ `warn` 5 lần đầu.
4. **Không giữ tham chiếu chết.** Cache tên là weak-key; mỗi lượt quét dọn
   Highlight của vật đã biến mất; `destroy` ngắt connection + huỷ GUI.

---

## 6. Kiểm thử

```bash
npm install
npm test -- objectlocator     # 25/25
npm test                      # 142/142 (toàn dự án)
npm run test:legacy           # 12/12 — tái hiện 9 lỗi của S.ObjTrack gốc
```

### 27 test của module

| Nhóm | Ca | Kiểm chứng |
| ---- | -- | ---------- |
| Core (4) | `CORE-001..004` | Gập dấu, chữ hoa, dedupe, path không phân biệt dấu, khớp chuỗi con |
| Quét (8) | `SCAN-001..008` | Ngân sách node/khung, sắp xếp + cắt, gộp part con, path chưa thấy, bỏ qua người chơi, lỗi `GetChildren`, `scanMs`, mất gốc toạ độ |
| Hiển thị (4) | `VIS-001..004` | 1 Highlight + 1 nhãn/vật, công tắc áp dụng ngay, Clear dọn sạch, executor chặn → fallback |
| Điều khiển (5) | `CTRL-001..005` | Bật/tắt, kẹp số, preset đầy đủ metadata, khoảng cách cập nhật khi di chuyển, `walkTo` |
| Preset (2) | `STORE-001..002` | Ghi/đọc JSON, tạo thư mục, kẹp số, loại preset hỏng, gộp entry trùng |
| UI (2) | `UI-001..002` | Dựng danh sách + bấm dòng + đóng/huỷ, `start`/`stop` đúng một instance |
| Tĩnh (2) | `STATIC-001..002` | Không API executor bị cấm; chỉ tự chạy trên Roblox thật |

Mỗi ca chạy trong **một `LuaRuntime` mới** (không dính state), nạp
`object-locator/ObjectLocator.lua` bằng `runFileAsGlobal(..., "OL")`, rồi gọi
`CASES.run("MÃ-CA")` trong `tests/fixtures/objectlocator/cases.lua`.

### Lỗi do test phát hiện trong chính module mới

Khi viết `start()`, closure `destroy` được khai báo **trong bảng literal**:

```lua
local instance = {
    destroy = function()
        ...
        if _G.ObjectLocator == instance then _G.ObjectLocator = nil end
    end,
}
```

Trong Lua, `instance` trong thân closure lúc này là biến **toàn cục** (nil), không
phải bảng đang khai báo. Hệ quả: `_G.ObjectLocator` và `startedInstance` không được
dọn sau `stop()`; bật lại sẽ tạo thêm một GUI nữa. Test `UI-002` bắt được (đọc
`debug.getupvalue` cho thấy closure bắt `_ENV`/global `instance`). Đã sửa bằng
cách tách `local instance = {}` **trước** rồi mới gán `instance.controller/ui/destroy`.

Đây là lỗi **thật** trong module mới, không phải trong `script.js`; nó cho thấy
test có tác dụng, không chỉ trang trí.

---

## 7. Giới hạn — những điều chưa kiểm chứng

- **Không phải Roblox Studio.** Mock cung cấp `Instance`, `Highlight`,
  `BillboardGui`, `RunService`, `UserInputService`… nhưng **không vẽ** gì cả.
  Test chứng minh logic/ngân sách/vòng đời, **không** chứng minh hình ảnh, tốc độ
  hay hành vi engine.
- **Không có số FPS/RAM/CPU.** Không có GPU/thiết bị thật trong môi trường này;
  mọi con số sẽ là bịa. Cách đo: `docs/07-do-luong-hoan-tac.md`.
- **`Highlight` có thể bị executor chặn.** Module có fallback `SelectionBox` +
  Billboard trong ScreenGui, nhưng nếu executor chặn cả `Instance.new` thì không
  còn gì để vẽ; khi đó `snapshot().visualError` khác `nil`.
- **`BillboardGui.MaxDistance`** phụ thuộc engine; trên mock không kiểm chứng được.
- **StreamingEnabled**: vật chưa stream sẽ không thấy. Path chưa phân giải được
  giữ lại và thử lại mỗi lượt quét (cache 2 s) — nhưng nếu game không bao giờ
  stream vật đó, mục vẫn hiện "⚠️ path chưa tìm thấy".
- **Mobile**: phím `RightShift` không có; dùng nút nổi 🌳 và các nút cảm ứng.
- **Chỉ client**: không thay đổi gì trên server, không ảnh hưởng người khác.
- **Chưa đối chiếu tài liệu Roblox chính thức** cho từng thuộc tính trong quá
  trình làm; các API dùng đều công khai và phổ biến.

---

## 8. Cấu trúc tệp

```
object-locator/
├── ObjectLocator.lua          # script chính (self-contained, 3.717 dòng)
└── README.md                  # tài liệu này

tests/
├── fixtures/objectlocator/cases.lua   # 25 ca chạy trong máy ảo
├── suites/objectlocator.test.js       # đăng ký 25 ca với runner
├── lib/legacy-objtrack.js             # trích nguyên văn S.ObjTrack từ script.js
└── legacy/cases.lua                   # 8 ca tái hiện lỗi bản gốc

tools/test-harness/run-legacy.js       # npm run test:legacy
docs/10-phan-tich-dinh-vi-vat-the.md   # phân tích chi tiết bản gốc + đối chiếu
```

Phân tích đầy đủ về `S.ObjTrack` (mô hình dữ liệu, luồng quét, 9 lỗi kèm dòng
mã và bằng chứng test): [`docs/10-phan-tich-dinh-vi-vat-the.md`](../docs/10-phan-tich-dinh-vi-vat-the.md).
