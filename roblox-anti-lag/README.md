# Roblox Anti-Lag — Script tối ưu hiệu suất độc lập

Script Luau **độc lập, không GUI/menu**, tự kiểm tra tương thích và tự kích hoạt
các tối ưu an toàn khi chạy trong Roblox. Toàn bộ tối ưu chỉ áp dụng lên
**phần việc do chính script kiểm soát** — script không sửa game của bạn.

## Cách dùng

```lua
local AntiLag = loadstring(game:HttpGet("<url tới AntiLag.lua>"))()
-- Trong Roblox: AntiLag.Default đã tự kích hoạt nếu môi trường tương thích.
-- Xem báo cáo đo:  print(AntiLag.Default:GetReport())
-- Dừng & dọn sạch: AntiLag.Default:Destroy()
```

Nhúng vào script khác: `local anti = AntiLag.new({...}); anti:Start()`, dùng
`anti:Queue / Connect / GetOrCompute / Acquire / Request / RunLimited...`,
cuối cùng `anti:Destroy()`.

## Chế độ giảm lag mạnh + thông báo (nâng cấp)

- **Tự động**: khi đo thấy FPS thấp kéo dài (frame > 1/30s sau 60 frame),
  script tự bật **chế độ mạnh** (`SetStrongMode(true)`): ngân sách việc nền
  siết từ 2ms xuống 1ms/frame, trần việc/frame giảm, việc ưu tiên thấp bị
  tạm hoãn khi khung hình đang chậm (không xóa — khung hình tốt lại chạy),
  dọn cache/pool thường xuyên hơn và bước dọn bộ nhớ của chính VM nếu có.
- **Thông báo**: ngay khi chế độ mạnh được bật, góc **phải dưới** màn hình
  hiện một hình chữ nhật: **viền ngoài cầu vồng chuyển động**, **bên trong
  xám trong suốt** (độ mờ 0.35), chữ "✅ ĐÃ GIẢM LAG". Thông báo hiện
  **30 giây** rồi tự biến mất và tự hủy GUI (không để rác). Đây là ngoại lệ
  GUI duy nhất theo yêu cầu của bạn — chỉ là thông báo 1 chiều, không nút
  bấm, không menu, không cài đặt. Tắt bằng `toastEnabled = false`, đổi thời
  gian bằng `toastDurationSec`.
- Chế độ mạnh vẫn tuân thủ hợp đồng an toàn: chỉ siết phần việc của chính
  script, **không** giảm đồ họa, không sửa cơ chế game.

## Đối chiếu 14 yêu cầu bắt buộc

| # | Yêu cầu | Cách thực hiện trong `AntiLag.lua` | Trạng thái |
|---|---------|-------------------------------------|------------|
| 1 | Tối ưu CPU | Scheduler hàng đợi: việc nền không chạy ngay, `Debounce`/`Throttle` cắt việc lặp, cache tránh tính lại | ✅ |
| 2 | Tối ưu RAM | Cache có trần số mục + TTL, pool có trần, `Destroy()`/`CachePrune()` dọn định kỳ, ngắt mọi kết nối | ✅ |
| 3 | Tối ưu FPS | Mỗi frame chỉ chạy việc nền trong ngân sách `frameBudgetMs` (mặc định 2ms) + trần số việc/frame | ✅ |
| 4 | Tối ưu tác vụ nền | Mọi việc nền đi qua `Queue` (có `delay`, `priority`), không có vòng lặp riêng/`while true` | ✅ |
| 5 | Tối ưu sự kiện | `Connect(key, ...)`: cùng key chỉ đăng ký 1 lần, trả về kết nối cũ; `DisconnectAll` khi dừng | ✅ |
| 6 | Tối ưu UI | Script **không có UI** nên không tốn chi phí vẽ; dữ liệu đo chỉ phát khi có mẫu mới (mỗi frame 1 mẫu số, đo RAM/ping mỗi 30 frame) | ⚠️ Một phần — đúng với phạm vi "không GUI" của yêu cầu (xem Giới hạn) |
| 7 | Tối ưu quản lý đối tượng | `DefinePool/Acquire/Release`: tái sử dụng đối tượng thay vì tạo/hủy liên tục, có trần giữ lại | ✅ |
| 8 | Tối ưu mạng | `Request(key, fn)`: gom yêu cầu trùng **do chính script phát ra** trong cửa sổ thời gian; script không tự gửi request nào | ✅ (phạm vi script kiểm soát) |
| 9 | Tối ưu xử lý lỗi | `Guard` bọc `pcall`, lỗi giống nhau chỉ báo 1 lần/5 giây, đếm số lần bị nén thay vì spam | ✅ |
| 10 | Tối ưu bộ nhớ đệm | `CacheSet/CacheGet/GetOrCompute` có TTL, tự đẩy mục cũ nhất khi vượt trần | ✅ |
| 11 | Tối ưu tác vụ song song | `RunLimited`: giới hạn số việc chạy đồng thời (`maxConcurrent`), quá tải thì từ chối thay vì dồn việc | ✅ |
| 12 | Phân bổ công việc | Ngân sách ms/frame + trần việc/frame + hàng đợi ưu tiên + gộp việc trùng key | ✅ |
| 13 | Đo hiệu suất | `Sample/GetReport`: FPS trung bình, frame ms (avg + p95), RAM (Stats), ping, phân loại nút thắt `CPU/frame` / `RAM` / `NETWORK` / `OK` | ✅ |
| 14 | Kiểm thử hồi quy | Bộ test Luau thật (`tests/run_tests.lua`, 26 kiểm tra) + test tĩnh hợp đồng an toàn (`tests/test_antilag.py`) | ✅ |

## Hợp đồng an toàn (không thương lượng)

Script **không** chứa bất kỳ hành vi nào sau đây — và test tĩnh
`TestSafetyContract` quét mã nguồn để bảo đảm điều đó ở mọi lần sửa:

- Không giảm texture/độ phân giải/mức đồ họa; không tắt bóng đổ, ánh sáng,
  hiệu ứng, hoạt ảnh, sương mù.
- Không ẩn/xóa/thay thế vật thể của game; không đụng `workspace`.
- Không sửa tốc độ di chuyển, lực nhảy, va chạm, chiến đấu, vật lý.
- Không chặn/sửa đồng bộ hay giao thức mạng, không gọi Remote của game.
- Không tạo GUI/menu; không vòng lặp vô hạn; không tự gửi dữ liệu mạng.

## Giới hạn kỹ thuật (nói thật, không giả vờ tối ưu)

1. **Không thể "tăng FPS cho mọi game" chỉ bằng một script client.**
   Một script chạy bên trong game chỉ kiểm soát được chính nó. Lag do game
   tự gây ra (map nặng, script của game, server quá tải) nằm ngoài quyền
   truy cập an toàn — cách xử lý đúng là *đo và chỉ ra nút thắt* (mục 13)
   để người dùng/chủ game xử lý ở đúng nơi, thay vì can thiệp trái phép.
2. **Yêu cầu 6 (UI)** : vì dự án bắt buộc *không có GUI*, phần "chỉ cập nhật
   UI khi dữ liệu đổi" được áp dụng ở tầng dữ liệu của chính script (đo thưa,
   chỉ báo lỗi/báo cáo khi có thay đổi). Nếu sau này bạn có UI riêng, hãy gọi
   render từ callback khi `GetReport()` thay đổi thay vì render mỗi frame.
3. **Số liệu đo phụ thuộc nền tảng**: RAM đọc từ `Stats:GetTotalMemoryUsageMb`
   (chỉ đọc). Nếu API không tồn tại, script trả `nil` và báo `unknown` —
   không bao giờ bịa số. Ping đọc từ `LocalPlayer:GetNetworkPing()` (chỉ đọc).
4. **Không tuyên bố tăng FPS khi chưa đo**: dùng `Snapshot()` trước và sau,
   rồi `AntiLag.Compare(truoc, sau)` để đọc delta khách quan.
5. Tương thích: cần `RunService.Heartbeat` để tự chạy. Thiếu API thì script
   **bỏ qua kích hoạt tự động và ghi rõ**, không chạy tính năng không tương thích.

## Kiểm thử

```bash
# Test thực thi Luau (cần luau CLI 0.742 trong /tmp/luau-build, xem test_antilag.py)
/tmp/luau-build/luau-0.742/build/release/luau roblox-anti-lag/tests/run_tests.lua

# Toàn bộ (Luau + hợp đồng an toàn + cú pháp)
python3 -m unittest roblox-anti-lag.tests.test_antilag  # hoặc:
cd roblox-anti-lag && python3 -m unittest discover -s tests
```

Kết quả đo hiệu suất thực tế trong Roblox phụ thuộc từng game; bộ test ở đây
xác minh *cơ chế* (hàng đợi, gộp việc, cache, pool, đo/phân loại, dọn dẹp)
chạy đúng bằng Luau thật và mã nguồn không vi phạm hợp đồng an toàn.
