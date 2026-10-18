# Roblox Anti-Lag Optimizer

Tối ưu hiệu năng **client** cho game **do bạn sở hữu**, chạy trong **Roblox Studio**,
không dùng executor, không dùng `setrbxsetting`, không can thiệp anti-cheat.

> ## ⚠️ Đọc trước — mức độ đã kiểm chứng thật
>
> - **Đã kiểm chứng tự động (124 test)** trên máy ảo Lua 5.3 (fengari) + mock Roblox API.
>   Đây **KHÔNG phải Roblox Studio**. Nó chứng minh **logic** đúng, không chứng minh
>   API Roblox hoạt động giống hệt mock.
> - **Chưa chạy trong Roblox Studio**: môi trường phát triển không có Roblox Studio.
>   Vì vậy **không có phương pháp nào đạt trạng thái B "trong game"**.
>   Trạng thái **B** trong danh mục nghĩa là **"đã kiểm thử trong harness"**.
> - **Chưa có benchmark FPS/RAM/CPU trên thiết bị thật.** Môi trường này không có GPU,
>   nên số đo mock chỉ kiểm tra logic, không đại diện Roblox. Cách tự đo: xem
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

Khi chạy, màn hình hiện một **bảng trạng thái cố định ở góc dưới phải** (không có menu/nút bấm, không kéo được): nền xám bán trong suốt, viền cầu vồng, dòng **“đang giảm lag”** và phần trăm bắt đầu **1%**. Bảng tự trượt xuống, mờ dần và dọn sạch sau **30 giây**. Phần trăm là hoạt ảnh thời lượng hiển thị; nếu tối ưu xong sớm, trạng thái đổi thành hoàn tất và phần trăm chốt ở 100%.

---

## 2. Cấu hình

Toàn bộ cấu hình nằm ở **một nơi**: bảng `Config.PROFILE` trong `src/Shared/Config.luau`.
Bảng dưới đây chép **đúng** từ mã nguồn — tên khoá, giá trị mặc định đều là thật.

### 2.1 Công tắc tổng

| Khoá | Ý nghĩa | Mặc định |
| ---- | ------- | -------- |
| `enabled` | `false` = hệ thống không làm gì cả | `true` |
| `mode` | Chế độ tối ưu | `"light"` |

### 2.2 Bật/tắt theo nhóm (`Config.PROFILE.groups`)

Có **8 nhóm**, độc lập nhau. Đặt `false` để tắt hẳn nhóm đó.

| Nhóm | Mặc định | Làm gì |
| ---- | -------- | ------ |
| `graphics` | **`true`** | Hạ chất lượng tối đa về **8/10** nếu mức hiện tại cao hơn; giữ chế độ tự động, địa hình và bóng |
| `effects` | `true` | Giới hạn nhẹ `ParticleEmitter.Rate` (mặc định tối đa 40), không xoá emitter |
| `cull` | `true` | Nhóm culling có trong thư viện; không được gọi trong kế hoạch mặc định |
| `scan` | `true` | Quét thế giới có trần khi cần xử lý hạt |
| `memory` | `true` | Dọn tài nguyên riêng; GC thủ công mặc định tắt để tránh tác vụ nền |
| `character` | `true` | Bước mặc định giữ nguyên bóng và tỉ lệ nhân vật |
| `physics` | **`false`** | Throttle nội suy — **TẮT** vì có đánh đổi độ mượt |
| `net` | **`false`** | **TẮT** vì cần remote của game |

> **Mức đồ hoạ nhẹ:** `graphics` mặc định **BẬT** và chỉ đặt mục tiêu tối đa ở
> `QualityLevel = 8`; nếu mức người chơi đang dùng thấp hơn thì script **không nâng lên**.
> Mặc định script không tắt `GlobalShadows`/`CastShadow`, không đổi độ sáng và giữ
> chi tiết địa hình (`shadowDistance = 0`). Chỉ khi chủ game chủ động đổi cấu hình,
> culling bóng/địa hình mới được áp dụng. Roblox có thể hiển thị khác đôi chút ở mức
> chất lượng 8; thay đổi property có thể hoàn tác. Để giữ mọi cài đặt đồ hoạ, đặt
> `groups.graphics = false`.

### 2.3 Thông số đồ hoạ (`Config.PROFILE.graphics`)

| Khoá | Mặc định | Ý nghĩa |
| ---- | -------- | ------- |
| `qualityLevel` | `8` | Mức mục tiêu tối đa; không nâng đồ hoạ nếu mức hiện tại thấp hơn |
| `lockQualityMode` | `false` | Tôn trọng chế độ tự động của người chơi |
| `applyTerrainDecoration` / `terrainDecoration` | `false` / `false` | Mặc định giữ nguyên; chỉ khi `applyTerrainDecoration = true` mới áp giá trị mục tiêu |
| `shadowDistance` | `0` | Không culling bóng (`0` = giữ mọi `CastShadow`) |
| `maxShadowTargets` | `400` | Giới hạn quét nếu chủ game chủ động đặt `shadowDistance > 0` |

### 2.4 Các bảng còn lại

| Bảng | Khoá chính | Mặc định |
| ---- | ---------- | -------- |
| `effects` | `particleRateCap` / `maxInstancesScanned` | `40` / `3000` |
| `character` | `disableShadows` / `disableAutoScaling` | `false` / `false` |
| `memory` | `gcEverySeconds` / `collectStepKb` | `0` (tắt) / `200` |
| `physics` | `enabled` / `interpolationThrottling` / `physicsSteppingMethod` | `false` / `"Disabled"` / `"Fixed"` |
| `scheduler` | `frameBudgetMs` / `cullInterval` | `3.0` / `0.25` |
| `gui` | `durationSeconds` / `backgroundAlpha` / `marginRight` / `marginBottom` / `updateInterval` | `30` / `0.42` / `16` / `16` / `0.1s` |
| `measure` | `baselineSeconds` / `settleSeconds` / `afterSeconds` | `5.0` / `1.0` / `5.0` |
| `diagnostics` | `logLevel` / `errorLogging` / `printToOutput` | `"info"` / `true` / `true` |
| `restore` | `recordChanges` / `verifyOnWrite` / `respectStale` | `true` / `true` / `true` |
| `methods` | Tắt **từng phương pháp** theo id, ví dụ `["GRAPHICS-003"] = false` | rỗng |

### 2.5 Hoàn tác

Mọi thuộc tính hệ thống đã sửa đều được ghi lại. Hoàn tác bằng:

```lua
local RALO = require(game:GetService("ReplicatedStorage").RALO["Client.Core.Pipeline"])
RALO.Shutdown()   -- ngắt connection, huỷ GUI
RALO.Restore()    -- trả thuộc tính về giá trị gốc
```

`Restore()` **không ghi đè** nếu game (hoặc bạn) đã đổi giá trị đó **sau khi** hệ thống
ghi — nó bỏ qua và log lại (`restore.respectStale = true`). Đó là chủ ý.

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
| [docs/10-ke-hoach-giam-lag.md](docs/10-ke-hoach-giam-lag.md) | Phân tích yêu cầu, kế hoạch tối ưu nhẹ và tiêu chí an toàn |

---

## 4. Lệnh kiểm tra

```bash
npm run lint      # 4 quy ước an toàn tĩnh (0 vi phạm)
npm run catalog   # đối chiếu danh mục phương pháp với mã nguồn thật
npm run syntax    # phân tích cú pháp toàn bộ .luau
npm run test      # 124 test trên máy ảo Lua + mock Roblox
npm run check     # chạy cả bốn bước trên
npm run build     # tạo dist/roblox-anti-lag-optimizer.luau
```

---

## 5. Giới hạn đã biết

1. **Chưa chạy trong Roblox Studio** — xem mục cảnh báo ở đầu tệp.
2. Hệ thống là **LocalScript**, chỉ ảnh hưởng **client của người chơi đó**.
   Nó **không** sửa được `workspace.PhysicsSteppingMethod` phía server hay bất kỳ
   trạng thái server nào.
3. Giảm đồ hoạ mặc định là **nhẹ**: mục tiêu tối đa 8/10, tôn trọng mức thấp hơn
   của người chơi và **không tắt ánh sáng hoặc bóng đổ**.
4. Hệ thống **không bao giờ** xoá map, nhân vật, vật phẩm hay emitter; mật độ hạt
   chỉ bị giới hạn nhẹ và các thay đổi property đều có cơ chế hoàn tác.
5. Hệ thống **không bao giờ** đổi tham số gameplay để lấy FPS.
6. LocalScript không thể đóng ứng dụng/tab khác, làm mát thiết bị hay sửa Wi-Fi; hãy tự đóng app/tab không dùng, giữ khe tản nhiệt thoáng và dùng kết nối ổn định.
7. Số đo trong script là FPS/frame time, heap Luau và overhead Scheduler của RALO;
   không phải CPU/RAM toàn thiết bị. Dùng Developer Console/Task Manager để xem phần còn lại.
