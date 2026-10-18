# 3. Cài đặt, chạy, cấu hình, khôi phục

## 3.1 Thứ tự cài đặt

### Cách A — Rojo

```bash
npm install       # chỉ để chạy test/lint; game không cần
rojo serve
```

Trong Studio: cài plugin Rojo → mở cửa sổ Rojo → **Connect**.
Xong. Studio sẽ có:

```
ReplicatedStorage.RALO            (8 module)
StarterPlayer.StarterPlayerScripts.RALO
    ├── Bootstrap                 (LocalScript)
    ├── Core/                     (17 module)
    ├── Optimizations/            (5 module)
    └── Ui/                       (5 module)
ServerScriptService.RALO          (rỗng)
```

### Cách B — một tệp

```bash
npm run build     # → dist/roblox-anti-lag-optimizer.luau (~326 KB)
```

1. `StarterPlayer` → `StarterPlayerScripts` → chuột phải → **Insert Object** → `LocalScript`.
2. Chọn LocalScript vừa tạo → trong Properties đặt **`RunContext = Legacy`**.
   *(Bắt buộc: bundle dùng `__RALO_REQUIRE` tự cài, cần chế độ Legacy.)*
3. Mở `dist/roblox-anti-lag-optimizer.luau`, **Ctrl+A, Ctrl+C**, dán đè vào script.
4. Play.

Không cần tạo thêm bất kỳ Instance nào.

## 3.2 Thứ tự chạy khi Play

1. LocalScript chạy → `Bootstrap` nạp `Pipeline`.
2. `Pipeline.Start()` tạo GUI **ngay lập tức** (`Notifier.Show()`), hiển thị
   "ANTI-LAG OPTIMIZER" + "Đang tối ưu hiệu năng" + thanh 0%.
3. Hoạt ảnh tiến trình chạy **độc lập** với tác vụ thật — nó không chờ và không bị chờ.
4. `Plan` trả về 9 bước theo thứ tự ưu tiên; `Runner` chạy từng bước qua `Guard.Run`.
5. Mỗi bước báo `applied / skipped / failed / unchanged`; lỗi không chặn bước sau.
6. Khoảng 30 giây sau, GUI in **"Hoàn tất tối ưu"**, trượt xuống, mờ dần,
   rồi **xoá toàn bộ** instance, connection và timer mà nó tạo.

## 3.3 Bật/tắt từng nhóm

Mở `src/Shared/Config.luau`. Bảng `Config.PROFILE.groups` có **8 nhóm** (chép đúng từ mã):

```lua
groups = {
	graphics  = true,    -- Lighting.QualityLevel, Terrain.Decoration
	effects   = true,    -- giới hạn Rate/ParticleCount (không xoá effect)
	cull      = true,    -- tắt bóng/hiệu ứng của đối tượng Ở XA
	scan      = true,    -- quét thế giới có trần
	memory    = true,    -- GC định kỳ
	physics   = false,   -- MẶC ĐỊNH TẮT: có đánh đổi độ mượt vật lý
	character = true,    -- bỏ bóng + auto-scaling của nhân vật
	net       = false,   -- MẶC ĐỊNH TẮT: cần remote của game
},
```

Đổi `true` ↔ `false` cho nhóm bạn muốn. Các nhóm **hoàn toàn độc lập**: tắt một
nhóm không ảnh hưởng nhóm khác, và bước tương ứng sẽ bị **SKIP có ghi lý do**
chứ không báo lỗi.

Kiểm chứng bằng test thật: `CFG-001: tắt nhóm graphics thì bước đồ hoạ bị SKIP có lý do`
và `CFG-001: chế độ "off" thì KHÔNG bước nào chạy` trong `tests/suites/pipeline.test.js`.

### 9 bước thật sự chạy khi Play

Đây là `Plan.CATALOG` trong `src/Client/Core/Plan.luau` — **toàn bộ** những gì hệ
thống làm lúc chạy, xếp theo thứ tự ưu tiên:

| # | id bước | Tên | Nhóm | Ghi nhật ký hoàn tác |
| - | ------- | --- | ---- | -------------------- |
| 1 | `graphics.quality` | Hạ mức chất lượng hình ảnh | `graphics` | Có |
| 2 | `graphics.terrain` | Tắt chi tiết địa hình (Decoration) | `graphics` | Có |
| 3 | `graphics.shadows` | Giảm tầm bóng đổ + tắt bóng part xa | `graphics` | Có |
| 4 | `graphics.character` | Tắt bóng & auto-scaling nhân vật | `character` | Có |
| 5 | `effects.particles` | Giới hạn hạt — **không xoá** effect | `effects` | Có |
| 6 | `effects.optional` | Beam/Trail/Decal (mặc định giữ nguyên) | `effects` | Có |
| 7 | `physics.throttling` | Bớt làm mượt nội suy vật lý (mặc định TẮT) | `physics` | Có |
| 8 | `memory.gc` | Kích hoạt chu kỳ dọn bộ nhớ Luau | `memory` | Không |
| 9 | `memory.orphanSweep` | Gom instance mồ côi (**lưu trữ, không xoá**) | `memory` | Không |

Mỗi bước cần một service nhất định; thiếu service thì bước bị **skip** chứ không lỗi.

### ⚠️ Mặc định có đổi đồ hoạ

`groups.graphics = true`, nên khi Play hệ thống **sẽ** hạ `Lighting.QualityLevel`
từ ~10 xuống **6** và đặt `GraphicsQualityMode = false`.

- Đây là giảm **nhẹ** và **đảo ngược được** — không phải hạ xuống thấp nhất.
- Nhưng nó **có** làm game trông khác đi. Nếu bạn không muốn, đặt
  `groups.graphics = false`.
- `graphics.terrainDecoration = false` trong `Config.PROFILE.graphics`, nên
  `Terrain.Decoration` **mặc định không bị đổi**.

### Tắt từng phương pháp riêng lẻ

Ngoài tắt cả nhóm, có thể tắt **một** phương pháp theo id:

```lua
Config.PROFILE.methods = {
	["GRAPHICS-003"] = false,  -- giữ nguyên Terrain.Decoration
}
```

Id lấy từ `src/Shared/Methods.luau` (xem [05](05-danh-muc-phuong-phap.md)).

## 3.4 Khôi phục mặc định

Gọi `Config.ResetToDefaults()` để trả `PROFILE` về bản chụp mặc định, rồi Play lại.
Hoặc gọi lúc chạy:

```lua
local RALO = require(game:GetService("ReplicatedStorage").RALO["Client.Core.Pipeline"])
RALO.Shutdown()   -- ngắt connection, huỷ GUI, xoá task
RALO.Restore()    -- trả thuộc tính về giá trị gốc
```

## 3.5 Mở công cụ chẩn đoán trong Studio

| Công cụ | Cách mở |
| ------- | ------- |
| **Output** | `View` → `Output`. Log của hệ thống có tiền tố `[RALO]`. |
| **MicroProfiler** | `View` → `MicroProfiler` (hoặc gõ `microprofiler` trong thanh lệnh). |
| **Script Profiler** | `View` → `Script Profiler`. |
| **Developer Console** | Trong lúc Play: `View` → `Developer Console`, hoặc `F9`. |
| **Stats** | `View` → `Stats` (xem Render time / Physics / Scripts). |

Đặt mức log trong `Config.luau`: `diagnostics.logLevel = "debug"` để xem chi tiết nhất.
Giá trị hợp lệ là chuỗi `"silent"` | `"info"` | `"debug"` (không phải số).

## 3.6 Báo lỗi

Cung cấp đủ 4 mục:

1. **Thông báo lỗi** — chép nguyên văn từ Output.
2. **Điều kiện tái hiện** — `mode` nào, nhóm nào bật/tắt, game gì, chỗ nào.
3. **Kết quả mong đợi** vs **kết quả thực tế**.
4. **Có còn sau khi `Shutdown()` + `Restore()` không?**
