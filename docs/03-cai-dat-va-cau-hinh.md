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

Mở `src/Shared/Config.luau`. Cấu trúc:

```lua
Config.presets = {
	light = {
		loops = true, ram = true, leaks = true, fps = true,
		assets = true, data = true, events = true, query = true,
		pool = true, bg = true, dist = true, measure = true,
		graphics = false,   -- ← mặc định TẮT
		physics = false,    -- ← mặc định TẮT
		effects = true,
	},
	-- ...
}
```

Đổi `true` ↔ `false` cho nhóm bạn muốn. Các nhóm **hoàn toàn độc lập**: tắt một
nhóm không ảnh hưởng nhóm khác, và bước tương ứng sẽ bị **SKIP có ghi lý do**
chứ không báo lỗi.

Kiểm chứng bằng test thật: `CFG-001: tắt nhóm graphics thì bước đồ hoạ bị SKIP có lý do`
và `CFG-001: chế độ "off" thì KHÔNG bước nào chạy` trong `tests/suites/pipeline.test.js`.

### Bảng nhóm → tác động

| Nhóm | Mặc định `light` | Ảnh hưởng nếu bật |
| ---- | ---------------- | ----------------- |
| `loops` | bật | Gộp/dedupe vòng lặp định kỳ |
| `ram` | bật | Giải phóng cache nội bộ của hệ thống |
| `leaks` | bật | Ngắt connection mồ côi |
| `fps` | bật | Dồn công việc theo ngân sách khung hình |
| `assets` | bật | Cache tham chiếu tài nguyên đã tra |
| `data` | bật | Lưới băm thay cho quét toàn bộ |
| `events` | bật | Gỡ kết nối trùng lặp |
| `query` | bật | Trần cho các truy vấn Workspace |
| `pool` | bật | Tái sử dụng đối tượng tạm |
| `bg` | bật | Dời việc không gấp ra khỏi khung hình nóng |
| `dist` | bật | Tắt tạm đối tượng ở xa, **bật lại khi gần** |
| `measure` | bật | Thu thập số đo trước/sau |
| `effects` | bật | **Giới hạn** hạt/ánh sáng ở xa (không xoá) |
| `graphics` | **tắt** | Đổi `Lighting.QualityLevel`, `Terrain.Decoration` |
| `physics` | **tắt** | Tinh chỉnh throttle phía client |

## 3.4 Khôi phục mặc định

Đặt lại `Config.luau` về `preset = "light"` và bật/tắt như bảng trên, rồi Play lại.
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

Đặt mức log trong `Config.luau`: `diagnostics.logLevel = 3` để xem chi tiết nhất.

## 3.6 Báo lỗi

Cung cấp đủ 4 mục:

1. **Thông báo lỗi** — chép nguyên văn từ Output.
2. **Điều kiện tái hiện** — preset nào, nhóm nào bật/tắt, game gì, chỗ nào.
3. **Kết quả mong đợi** vs **kết quả thực tế**.
4. **Có còn sau khi `Shutdown()` + `Restore()` không?**
