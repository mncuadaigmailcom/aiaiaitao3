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


> **Dự án thứ hai trong repo này:** 🌐 **[https://mncuadaigmailcom.github.io/aiaiaitao3/](https://mncuadaigmailcom.github.io/aiaiaitao3/)**
> — web mã hoá script thành tệp `.aia` + key script, chạy trong trình duyệt, miễn phí.
> Mã nguồn: [`secure-script/`](secure-script/README.md) · chạy trên máy:
> `python3 -m http.server 8080 --directory secure-script` → http://localhost:8080

> **Dự án thứ ba:** 💬 [`roblox-chat/`](roblox-chat/README.md) — menu chat giống giao diện chat Roblox
> (một LocalScript, bản giao diện, chưa nối server).

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
| `graphics` | **`true`** | `Lighting.QualityLevel` → **6**, tắt `GraphicsQualityMode` |
| `effects` | `true` | **Giới hạn** `Rate`/`ParticleCount`, tắt emitter ở xa — **không xoá** effect |
| `cull` | `true` | Tắt bóng/hiệu ứng của đối tượng **ở xa**, bật lại khi gần |
| `scan` | `true` | Quét thế giới có trần |
| `memory` | `true` | GC định kỳ |
| `character` | `true` | Bỏ bóng + `AutomaticScalingEnabled` của nhân vật |
| `physics` | **`false`** | Throttle nội suy — **TẮT** vì có đánh đổi độ mượt |
| `net` | **`false`** | **TẮT** vì cần remote của game |

> ⚠️ **Đọc kỹ:** `graphics` mặc định **BẬT**, và nó hạ `Lighting.QualityLevel`
> từ ~10 (mặc định Roblox) xuống **6**. Đây là giảm **nhẹ**, **đảo ngược được**
> (`restorable = true`), không phải hạ xuống thấp nhất. Nhưng nó **có** làm game
> của bạn trông khác đi ngay khi Play.
>
> Muốn giữ nguyên đồ hoạ, đặt `groups.graphics = false`.

### 2.3 Thông số đồ hoạ (`Config.PROFILE.graphics`)

| Khoá | Mặc định | Ý nghĩa |
| ---- | -------- | ------- |
| `qualityLevel` | `6` | `Lighting.QualityLevel` 1..10 |
| `lockQualityMode` | `true` | Tắt `GraphicsQualityMode` để engine không ghi đè |
| `terrainDecoration` | `false` | `Terrain.Decoration` (cỏ/chi tiết nhỏ) — **mặc định KHÔNG đổi** |
| `shadowDistance` | `300` | Xa hơn N stud thì tắt `CastShadow` (`0` = tắt bước này) |
| `maxShadowTargets` | `400` | Trần số đối tượng bị đổi, tránh khựng khi quét |

### 2.4 Các bảng còn lại

| Bảng | Khoá chính | Mặc định |
| ---- | ---------- | -------- |
| `effects` | `particleRateCap` / `particleMaxCountCap` / `effectDistance` / `maxInstancesScanned` | `20` / `60` / `250` / `3000` |
| `character` | `disableShadows` / `disableAutoScaling` | `true` / `true` |
| `memory` | `gcEverySeconds` / `collectStepKb` | `15` / `200` |
| `physics` | `enabled` / `interpolationThrottling` / `physicsSteppingMethod` | `false` / `"Disabled"` / `"Fixed"` |
| `scheduler` | `frameBudgetMs` / `cullInterval` | `3.0` / `0.25` |
| `gui` | `durationSeconds` / `backgroundAlpha` / `marginRight` / `marginBottom` | `30` / `0.72` / `16` / `16` |
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

---

## Phụ lục — Dự án AIA Secure Script

Repo có thêm một dự án độc lập trong [`secure-script/`](secure-script/README.md):

- **Mã hoá** code script (nhập tệp hoặc dán code, tối đa 5 GiB) thành `.aia` + `key.js`.
- **Key script là chìa khoá thật**: khoá tệp ngẫu nhiên chỉ nằm trong key script,
  thiếu nó thì không mở được dù biết mật khẩu và đọc được header.
- **Khoá** sinh từ thời gian tạo (đến mili giây) + link key script + mật khẩu, qua
  PBKDF2-SHA256 600.000 vòng; dữ liệu mã hoá bằng AES-256-GCM theo từng khối.
- **Header** chứa thời gian và link key ở dạng đọc được (không mã hoá) để nhận biết.
- **Chạy**: key script giải mã rồi chạy trong Web Worker; kèm trang `run.html`.
- **Dịch ngược**: làm đẹp, rút gọn, tách chuỗi, đổi tên biến, giải base64/hex/URL, phân tích.
- **Miễn phí**: trang tĩnh, không backend; có workflow GitHub Pages sẵn.

Kiểm thử: 80 kiểm thử lõi + 47 kiểm thử DOM (gồm cả gói demo) + 43 kiểm tra tĩnh.

```bash
cd secure-script
node tests/run-node.mjs     # lõi mã hoá
npm install                 # chỉ để chạy test DOM (jsdom)
node tests/run-dom.mjs      # giao diện trên DOM ả
```

Tài liệu: [ghi chú dự án](secure-script/docs/00-ghi-chu-du-an.md) ·
[kiến trúc & định dạng](secure-script/docs/01-kien-truc-va-dinh-dang.md) ·
[bảo mật & giới hạn](secure-script/docs/02-bao-mat-gioi-han.md) ·
[hướng dẫn](secure-script/docs/03-huong-dan-su-dung.md) ·
[triển khai miễn phí](secure-script/docs/04-trien-khai-mien-phi.md) ·
[kiểm thử](secure-script/docs/05-kiem-thu-va-ket-qua.md).
