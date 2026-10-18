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

1. LocalScript chạy → `Bootstrap` nạp `Pipeline` và lập kế hoạch theo cấu hình.
2. Bảng trạng thái xuất hiện ngay ở góc dưới bên phải: nền xám trong suốt,
   viền cầu vồng, **“Đang giảm lag”**, thanh và số **1% → 100%**. Không có nút/menu
   điều khiển và không thể kéo bảng.
3. Hệ thống đo nền trong 5 giây rồi áp dụng kế hoạch; hoạt ảnh bảng cập nhật 10 lần/giây,
   độc lập với tác vụ. Phần trăm là hoạt ảnh thời lượng, không phải số FPS; nếu pipeline
   xong sớm, bảng chuyển sang “Đã giảm lag xong” và phần trăm chốt ở 100%.
4. `Plan` trả về 9 bước; `Runner` chạy từng bước qua `Guard.Run`.
5. Mỗi bước báo `applied / skipped / failed / unchanged`; lỗi không chặn bước sau.
6. Sau 30 giây kể từ khi bảng được dựng, GUI trượt xuống, mờ dần, rồi **xoá toàn bộ**
   instance và connection mà nó tạo. Kết quả chi tiết vẫn nằm trong Output.

## 3.3 Bật/tắt từng nhóm

Mở `src/Shared/Config.luau`. Bảng `Config.PROFILE.groups` có **8 nhóm** (chép đúng từ mã):

```lua
groups = {
	graphics  = true,    -- chất lượng tối đa 8; giữ ánh sáng, bóng và địa hình
	effects   = true,    -- giới hạn nhẹ Rate/ParticleCount (không xoá effect)
	cull      = true,    -- có trong thư viện, không nằm trong plan mặc định
	scan      = true,    -- quét thế giới có trần
	memory    = true,    -- GC định kỳ
	physics   = false,   -- MẶC ĐỊNH TẮT: có đánh đổi độ mượt vật lý
	character = true,    -- giữ bóng và tỉ lệ avatar theo mặc định
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
| 1 | `graphics.quality` | Giảm nhẹ chất lượng hình ảnh, tối đa mức 8 | `graphics` | Có |
| 2 | `graphics.terrain` | Đặt chi tiết địa hình theo cấu hình (mặc định giữ) | `graphics` | Có |
| 3 | `graphics.shadows` | Giữ bóng đổ; culling xa mặc định tắt | `graphics` | Có |
| 4 | `graphics.character` | Giữ bóng và tỉ lệ nhân vật (mặc định không đổi) | `character` | Có |
| 5 | `effects.particles` | Giới hạn nhẹ hạt — **không xoá** emitter | `effects` | Có |
| 6 | `effects.optional` | Beam/Trail/Decal (mặc định giữ nguyên) | `effects` | Có |
| 7 | `physics.throttling` | Bớt làm mượt nội suy vật lý (mặc định TẮT) | `physics` | Có |
| 8 | `memory.gc` | Kích hoạt chu kỳ dọn bộ nhớ Luau | `memory` | Không |
| 9 | `memory.orphanSweep` | Gom instance mồ côi (**lưu trữ, không xoá**) | `memory` | Không |

Mỗi bước cần một service nhất định; thiếu service thì bước bị **skip** chứ không lỗi.

### Giảm đồ hoạ nhẹ, giữ ánh sáng và bóng

`groups.graphics = true`, nên mức `Lighting.QualityLevel` chỉ được hạ tối đa về **8**;
nếu người chơi đang dùng mức thấp hơn, script giữ nguyên mức đó. `GraphicsQualityMode`
được tôn trọng. `Terrain.Decoration` mặc định giữ nguyên.

- Script không tắt `Lighting.GlobalShadows`, không tắt `CastShadow` và không đổi
  độ sáng/màu ánh sáng.
- `graphics.shadowDistance = 0` giữ toàn bộ bóng xa. Chỉ chủ game chủ động đặt
  giá trị lớn hơn 0 mới bật culling bóng.
- Bất kỳ thay đổi property nào cũng có thể hoàn tác; để giữ mọi cài đặt đồ hoạ,
  đặt `groups.graphics = false`.

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
