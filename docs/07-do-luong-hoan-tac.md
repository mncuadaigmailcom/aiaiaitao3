# 7. Đo lường trước/sau và hoàn tác

## 7.1 Khai báo trước khi đọc tiếp

> **Dự án này không công bố kết quả benchmark FPS/RAM/CPU đo sẵn hoặc lời hứa tăng FPS.**
>
> Pipeline có thể lấy mẫu frame time/FPS và heap Luau khi chạy trong client; kiểm thử
> ở đây dùng mock, không phải thiết bị thật. Vì vậy chưa có con số hiệu quả thực tế
> nào được ghi trước. CPU/RAM toàn thiết bị vẫn cần xem bằng công cụ của Roblox/OS.

## 7.2 Hệ thống tự đo được gì

| Chỉ số | Lấy từ | Phạm vi / giới hạn |
| ------ | ------ | ------------------ |
| Frame time và FPS suy ra | Delta giữa các mẫu `RunService.RenderStepped` trong `Measure.Run` | Số đo của client đang chạy; 0 mẫu thì không kết luận |
| Heap Luau | `collectgarbage("count")` trước/sau | Chỉ heap Luau nếu API cho phép, không phải RAM toàn tiến trình |
| Thời lượng từng handler | `os.clock()` quanh handler trong `Runner.Execute` | Thời gian xử lý đo được của callback RALO; không phải % CPU toàn thiết bị |
| Chi phí Scheduler | `Scheduler.lastFrameCostMs`, ngân sách và số lần vượt | Overhead của Scheduler RALO ở nhịp gần nhất, không phải tổng CPU game |
| Connection / task / instance do RALO quản lý | `Registry.Stats()`, `Scheduler.Stats()`, `GuiPolicy.CountNodes()` | Bộ đếm nội bộ của công cụ |
| RAM toàn tiến trình / CPU toàn thiết bị | Không có quyền đọc từ LocalScript | Đọc bằng Developer Console, MicroProfiler/Script Profiler hoặc Task Manager |

`Measure.Compare()` trả về `valid = false` kèm `reason` khi có 0 mẫu — nó **từ chối**
đưa ra kết luận thay vì trả về số 0 trông như thật.

Test khoá chặt hành vi này: `MEAS-003 / MEAS-007: không có mẫu thì từ chối kết luận,
không bịa số` trong `tests/suites/pipeline.test.js`.

## 7.3 Quy trình đo cho bạn (làm trong Roblox Studio)

Điều kiện tương đương là bắt buộc: **cùng một game, cùng một chỗ đứng, cùng số người
chơi, cùng cài đặt đồ hoạ**, đo trước và sau giống hệt nhau.

### Bước 1 — Mở công cụ

| Công cụ | Cách mở |
| ------- | ------- |
| Stats | `View` → `Stats` |
| MicroProfiler | `View` → `MicroProfiler` |
| Script Profiler | `View` → `Script Profiler` |
| Developer Console | Play → `View` → `Developer Console` (hoặc `F9`) |

### Bước 2 — Đo nền (chưa bật hệ thống)

Trong `Config.luau` đặt `enabled = false`. Play. Đứng yên **60 giây** ở cùng một vị trí.
Ghi lại:

| Chỉ số | Lần 1 | Lần 2 | Lần 3 | Trung bình |
| ------ | ----- | ----- | ----- | ---------- |
| Render time (ms) | | | | |
| Physics (ms) | | | | |
| Scripts (ms) | | | | |
| FPS | | | | |
| Memory Lua (KB) | | | | |

### Bước 3 — Bật hệ thống, đo lại

Đặt `enabled = true`, `mode = "light"`. Play. **Đứng đúng chỗ cũ**, cùng 60 giây.
Mặc định pipeline đo cả overlay nhỏ (nếu bật); để cô lập chi phí tối ưu, đặt
`gui.enabled = false` khi đo hoặc ghi chú rõ overlay đang bật. Không cần chờ panel
ẩn nếu đo cùng điều kiện trước/sau.

| Chỉ số | Lần 1 | Lần 2 | Lần 3 | Trung bình | Chênh so nền |
| ------ | ----- | ----- | ----- | ---------- | ------------ |
| Render time (ms) | | | | | |
| Physics (ms) | | | | | |
| Scripts (ms) | | | | | |
| FPS | | | | | |
| Memory Lua (KB) | | | | | |

### Bước 4 — Tách bạch CPU / GPU / network / physics / script

Chỉ được kết luận về một loại nếu **có bằng chứng** cho loại đó:

| Loại | Bằng chứng hợp lệ |
| ---- | ----------------- |
| Script/CPU | `Scripts (ms)` trong Stats, hoặc Script Profiler chỉ ra hàm cụ thể |
| GPU | `Render time (ms)` trong Stats, hoặc khung MicroProfiler phần Graphics |
| Physics | `Physics (ms)` trong Stats |
| Network | `View` → `Stats` → mục Network (bytes in/out) |
| Memory | Developer Console → Memory, hoặc `collectgarbage("count")` |

Nếu một loại không có bằng chứng → **viết "chưa đo được"**, không suy ra từ loại khác.

### Bước 5 — Đo nhiều lần

Tối thiểu **3 lần** mỗi cấu hình. Nếu chênh lệch giữa các lần lớn hơn chênh lệch
giữa "nền" và "bật", thì **không có kết luận nào là hợp lệ** — hãy viết rõ điều đó
thay vì lấy trung bình rồi coi như có cải thiện.

## 7.4 Hoàn tác

### Hoàn tác lúc đang chạy

```lua
local RALO = require(game:GetService("ReplicatedStorage").RALO["Client.Core.Pipeline"])

print(RALO.Restore.Count())          -- bao nhiêu thuộc tính đã ghi lại
RALO.Shutdown()                      -- ngắt connection, huỷ GUI, xoá task
local restored, failed = RALO.Restore()
print("đã hoàn tác:", restored, "thất bại:", failed)
```

### Hoàn tác tự động

Mọi bước đều ghi lại qua `Restore.Record(instance, property, oldValue, stepId, newValue)`.
Khi hoàn tác, `Guard.Change` được truyền `expect = newValue`:

- Nếu giá trị hiện tại **vẫn là** giá trị hệ thống đã đặt → hoàn tác bình thường.
- Nếu game (hoặc bạn) đã đổi nó **sau đó** → **bỏ qua**, trả về `"stale"`, ghi log.

Đây là chủ ý, không phải thiếu sót: **không bao giờ đè lên thay đổi mới hơn của game.**

Test khoá chặt: `REC-002: hoàn tác KHÔNG ghi đè nếu game đã đổi giá trị sau đó` —
đổi `QualityLevel` thành `9` sau khi hệ thống đã đặt `10`, gọi `Restore.All()`,
giá trị phải **vẫn là 9**.

### Kiểm tra hoàn tác sạch

```lua
print(RALO.Registry.Stats().connections)  -- phải = 0
print(RALO.Scheduler.Stats().tasks)       -- phải = 0
print(RALO.GuiPolicy.CountNodes())        -- phải = 0
print(RALO.Restore.Count())               -- phải = 0 sau khi hoàn tác hết
```

Test tương ứng: `tích hợp: chạy xong rồi Shutdown thì không còn connection nào`.

## 7.5 Những gì hệ thống KHÔNG làm khi hoàn tác

1. **Không** xoá instance do game tạo — chỉ trả thuộc tính về giá trị gốc.
2. **Không** đụng trạng thái server — nó là LocalScript, không có quyền đó.
3. **Không** hoàn tác những gì **không** phải nó đổi (không có bản ghi thì không đụng).
4. **Không** đổi tham số gameplay.
