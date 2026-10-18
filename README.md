# Roblox Anti-Lag Optimizer

Tối ưu hiệu năng **client** cho game **do bạn sở hữu**, chạy trong **Roblox Studio**,
không dùng executor, không dùng `setrbxsetting`, không can thiệp anti-cheat.

> ## ⚠️ Đọc trước — mức độ đã kiểm chứng thật
>
> - **Đã kiểm chứng tự động (115 test)** trên máy ảo Lua 5.3 (fengari) + mock Roblox API.
>   Đây **KHÔNG phải Roblox Studio**. Nó chứng minh **logic** đúng, không chứng minh
>   API Roblox hoạt động giống hệt mock.
> - **Chưa chạy trong Roblox Studio**: môi trường phát triển không có Roblox Studio.
>   Vì vậy **không có phương pháp nào đạt trạng thái B "trong game"**.
>   Trạng thái **B** trong danh mục nghĩa là **"đã kiểm thử trong harness"**.
> - **Không có con số FPS/RAM/CPU nào được công bố.** Môi trường này không có GPU,
>   không có thiết bị thật, nên mọi con số sẽ là bịa. Cách tự đo: xem
>   [docs/07-do-luong-hoan-tac.md](docs/07-do-luong-hoan-tac.md).
> - API Roblox **chưa được đối chiếu với tài liệu chính thức** trong quá trình làm việc.

---

## 1. Cài đặt

### Cách A — Rojo (khuyến nghị, giữ mã nguồn dạng tệp)

Cần [Rojo](https://rojo.space) + plugin Rojo trong Studio.

```bash
npm install          # chỉ để chạy test/lint, không bắt buộc cho game
rojo serve           # rồi bấm "Connect" trong plugin Rojo
```

`default.project.json` đã ánh xạ sẵn:

| Thư mục trong repo   | Vị trí trong Studio        |
| -------------------- | -------------------------- |
| `src/Shared`         | `ReplicatedStorage.RALO`   |
| `src/Client`         | `StarterPlayer.StarterPlayerScripts.RALO` |
| `src/Server`         | `ServerScriptService.RALO` |

### Cách B — một tệp duy nhất (không cần công cụ)

1. `npm run build` → tạo `dist/roblox-anti-lag-optimizer.luau`.
2. Trong Studio: `StarterPlayer` → `StarterPlayerScripts` → chèn **một** `LocalScript`.
3. Đổi `RunContext` của LocalScript đó thành `Legacy`.
4. Dán **toàn bộ** nội dung `dist/roblox-anti-lag-optimizer.luau` vào.
5. Play. Không cần tạo thêm tệp nào — bundle tự cài shim `require`.

### Chạy thử

- **Cách A:** LocalScript `src/Client/Bootstrap.luau` tự chạy khi Play.
- **Cách B:** LocalScript bạn vừa dán.

Khi chạy, màn hình xuất hiện bảng **"ANTI-LAG OPTIMIZER"** ở **góc dưới phải**,
chạy hoạt ảnh khoảng 30 giây rồi trượt xuống và **tự xoá hoàn toàn**.

---

## 2. Cấu hình

Toàn bộ cấu hình nằm ở **một nơi**: `src/Shared/Config.luau`.

Mặc định là `preset = "light"` — **không** tự hạ đồ hoạ xuống thấp nhất,
không xoá map/nhân vật/vật phẩm/hiệu ứng quan trọng.

| Khoá                        | Ý nghĩa                                            | Mặc định |
| --------------------------- | -------------------------------------------------- | -------- |
| `enabled`                   | Bật/tắt toàn hệ thống                              | `true`   |
| `preset`                    | `"off"` / `"light"` / `"balanced"`                 | `"light"`|
| `groups.<tên>`              | Bật/tắt từng nhóm nhiệm vụ (độc lập nhau)          | theo preset |
| `graphics.quality`          | Đổi `Lighting.QualityLevel` (tối đa mức bạn cho phép) | `false` |
| `graphics.terrainDecoration`| Đổi `Terrain.Decoration` (đảo ngược được)          | `false` |
| `diagnostics.logLevel`      | `0`=im, `1`=cảnh báo, `2`=thông tin, `3`=chi tiết  | `1`      |
| `gui.durationSeconds`       | Thời lượng hoạt ảnh (giây)                         | `30`     |
| `gui.sound`                 | **Bắt buộc `false`** — hệ thống không phát âm thanh | `false`  |

Đổi cấu hình xong **chỉ cần Play lại**, hoặc gọi `RALO.Shutdown()` rồi `RALO.Start()`.

### Hoàn tác

Mọi thuộc tính hệ thống đã sửa đều được ghi lại. Hoàn tác bằng:

```lua
local RALO = require(game:GetService("ReplicatedStorage").RALO["Client.Core.Pipeline"])
RALO.Shutdown()   -- ngắt connection, huỷ GUI
RALO.Restore()    -- trả thuộc tính về giá trị gốc
```

`Restore()` **không ghi đè** nếu game (hoặc bạn) đã đổi giá trị đó **sau khi** hệ thống
ghi — nó bỏ qua và log lại. Đó là chủ ý: không đè lên thay đổi mới hơn của game.

---

## 3. Tài liệu

| Tệp | Nội dung |
| --- | -------- |
| [docs/01-moi-truong-quyen-gioi-han.md](docs/01-moi-truong-quyen-gioi-han.md) | Loại script, API được phép, giới hạn cứng |
| [docs/02-cau-truc-vai-tro-tep.md](docs/02-cau-truc-vai-tro-tep.md) | Cây thư mục, vai trò từng tệp |
| [docs/03-cai-dat-va-cau-hinh.md](docs/03-cai-dat-va-cau-hinh.md) | Cài đặt, bật/tắt nhóm, khôi phục mặc định |
| [docs/04-kiem-thu.md](docs/04-kiem-thu.md) | Cách chạy test, checklist Studio (bạn phải làm) |
| [docs/05-danh-muc-phuong-phap.md](docs/05-danh-muc-phuong-phap.md) | 190 phương pháp, 30 nhóm, trạng thái A–E |
| [docs/06-bao-cao-test-loi.md](docs/06-bao-cao-test-loi.md) | Bảng test, bảng lỗi, mục chưa kiểm chứng |
| [docs/07-do-luong-hoan-tac.md](docs/07-do-luong-hoan-tac.md) | Đo trước/sau, quy trình hoàn tác |
| [docs/08-nghiem-thu.md](docs/08-nghiem-thu.md) | Đối chiếu 12 tiêu chí nghiệm thu |

---

## 4. Lệnh kiểm tra

```bash
npm run lint      # 4 quy ước an toàn tĩnh (0 vi phạm)
npm run catalog   # đối chiếu danh mục phương pháp với mã nguồn thật
npm run syntax    # phân tích cú pháp toàn bộ .luau
npm run test      # 115 test trên máy ảo Lua + mock Roblox
npm run check     # chạy cả bốn bước trên
npm run build     # tạo dist/roblox-anti-lag-optimizer.luau
```

---

## 5. Giới hạn đã biết

1. **Chưa chạy trong Roblox Studio** — xem mục cảnh báo ở đầu tệp.
2. Hệ thống là **LocalScript**, chỉ ảnh hưởng **client của người chơi đó**.
   Nó **không** sửa được `workspace.PhysicsSteppingMethod` phía server hay bất kỳ
   trạng thái server nào.
3. Giảm đồ hoạ là **có chủ ý ở mức nhẹ** và **mặc định tắt**. Bật lên là quyết định
   của bạn, không phải của hệ thống.
4. Hệ thống **không bao giờ** xoá map, nhân vật, vật phẩm hay hiệu ứng quan trọng;
   chỉ tắt tạm thời ở khoảng cách xa và bật lại khi lại gần.
5. Hệ thống **không bao giờ** đổi tham số gameplay để lấy FPS.
