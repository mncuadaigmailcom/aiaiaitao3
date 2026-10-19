# DOORS Entity Radar

Bảng điều khiển **client-side** cho DOORS: danh mục 82 thực thể/sự kiện theo 8 khu vực,
tìm kiếm, lọc theo khu vực, chọn mục để theo dõi, và hiển thị **khoảng cách + hướng
tương đối** — nhưng **chỉ khi đọc được dữ liệu thật** từ instance mà client được phép đọc.

> ## Đọc phần này trước
> **Radar không bịa.** Nếu không có instance nào khớp, nó nói "Không phát hiện".
> Nếu mẫu tên chưa được bạn xác minh trong game, nó nói "Chưa xác minh" chứ không
> đoán. Nếu không đọc được vị trí (thiếu nhân vật, instance chưa replicate), nó nói
> "Thấy instance, không đọc được vị trí" và **không in ra một con số**.
>
> Dự án **không** dùng executor, **không** bypass anti-cheat, **không** sửa đồ hoạ,
> âm thanh, vật lý hay gameplay của DOORS, và **không** đụng vào script khác.
> Nó chỉ đọc những gì client vốn đã đọc được.
>
> **Có tên trong danh mục ≠ định vị được.** Chi tiết từng mục:
> [`docs/danh-muc-thuc-the.md`](docs/danh-muc-thuc-the.md).

---

## 1. Kiến trúc

Ba tầng, dữ liệu đi một chiều, không tầng nào gọi ngược lên:

```
                 ┌─────────────────────────────────────────────────────────┐
 Workspace ─────▶│ Scanner      quét THEO BƯỚC (không quét cả cây mỗi frame)│
 (DescendantAdded│              khớp tên instance bằng Matcher              │
  /Removing)     └───────────────┬─────────────────────────────────────────┘
                                 │  matches[entityId] = { instance, ... }
                                 ▼
 Nhân vật/Camera ─▶ Tracker      kết luận TRẠNG THÁI + khoảng cách + hướng
 (HumanoidRootPart,             (chỉ DETECTED mới được có observation)
  Camera.CFrame)                 │
                                 ▼
                    RadarUi      đổ dữ liệu vào ScreenGui, chỉ ghi property
                                 khi GIÁ TRỊ THẬT SỰ ĐỔI (đếm được trong Stats)
```

| Tầng | Tệp | Trách nhiệm | Không được làm |
| --- | --- | --- | --- |
| Dữ liệu | `Shared/EntityCatalog`, `Shared/Areas`, `Shared/Status`, `Shared/Config` | Danh mục, khu vực, bộ trạng thái, cấu hình | Không biết UI tồn tại |
| Định vị | `Client/Core/Scanner`, `Matcher`, `Tracker`, `Geometry`, `Env` | Quét, khớp tên, đọc vị trí, kết luận | Không tạo instance, không vẽ gì |
| Lựa chọn | `Client/Core/Selection` | Tập mục đã chọn + tập đang theo dõi (dữ liệu thuần) | Không biết GUI tồn tại |
| Vòng đời | `Client/Core/Scheduler`, `Registry`, `SelfCheck`, `Client/Radar` | Nhịp chạy, đếm tài nguyên, tự kiểm tra, Start/Pause/Stop | Không chứa luật nghiệp vụ |
| Giao diện | `Client/Ui/Theme`, `Widgets`, `RadarUi` | Vẽ 13 tab, ô chọn, cập nhật ScreenGui | Không tự suy ra trạng thái/khoảng cách, không giữ lựa chọn |
| Vào game | `Client/Bootstrap` (LocalScript) | Cài bộ nạp, tạo Radar, gắn phím tắt | Không đổi gì trong trò chơi |
| Tuỳ chọn | `Server/Diagnostics` (Script, **tắt mặc định**) | In danh sách tên instance ra Output để bạn tự xác minh mẫu tên | Không gửi gì cho client ngoài log |

**Chốt trung thực nằm ở `Shared/Status`:** `MayShowPosition(code)` chỉ trả `true` cho
`DETECTED`. Cả `Tracker` lẫn `RadarUi` đều hỏi hàm này trước khi in khoảng cách, nên
muốn "bịa số" thì phải sửa hai nơi cùng lúc — và test `TRK-*`/`UI-003` sẽ bắt được.

### Giao diện nhiều tab

```
┌─ Header: DOORS ENTITY RADAR   trạng thái   [—] [Khởi động] [Làm mới] [Đóng]┐
├─ TabBar: Trang chủ | Tất cả | The Hotel | The Mines | The Backdoor |        │
│          The Archives | The Outdoors | The Stairwell | The Rooms |          │
│          Sự kiện đặc biệt | Đã chọn | Cài đặt | Nhật ký                     │
├─ FilterBar: [Tìm thực thể…]  [Tất cả][Hotel][Mines]…  [Tất cả|Đã chọn|Chưa] │
├─ SelectionBar: [Chọn tất cả][Bỏ chọn tất cả][Chọn tất cả khu vực]           │
│                [Bỏ chọn toàn bộ]                        Đã chọn 12/82       │
├─ Body:  ☑ ● Rush      thực thể   Đã phát hiện      25.0 stud               │
│         ☐ ● Ambush    thực thể   Chưa xác minh           —                 │
│         (bảng chi tiết: khu vực, trạng thái, khoảng cách, mẫu tên,          │
│          [Chọn/Bỏ chọn] [Theo dõi/Ngừng theo dõi])                          │
└─ StatusBar: Cập nhật: 0.4s trước │ Phát hiện 1 • chưa xác minh 81 • …       │
```

* **Chuyển tab không dựng lại gì**: cả 13 trang được tạo một lần lúc `Build`,
  chuyển tab chỉ đổi `Visible`. Test `TAB-002` chứng minh số widget tạo ra,
  số connection và số ScreenGui **không đổi** sau 39 lần chuyển tab.
* **Lựa chọn nằm ngoài giao diện** (`Client/Core/Selection`), nên đổi tab, tìm
  kiếm hay dựng lại UI đều **giữ nguyên** lựa chọn (`SEL-007`, `TAB-008`).
* **Chọn tất cả là theo phạm vi**: nút "Chọn tất cả" chỉ chọn những mục đang
  hiện ở tab/bộ lọc hiện tại; muốn chọn cả 82 mục thì bấm "Chọn tất cả khu vực"
  (`SEL-005`, `SEL-006`).
* **Theo dõi ≠ định vị**: bật "Theo dõi" chỉ khiến hệ thống ghi một dòng nhật ký
  khi mục đó *thật sự* chuyển sang/thoát khỏi "Đã phát hiện" (`SEL-012`). Mục
  không có cơ chế phát hiện (ví dụ `Hide`) thì nút theo dõi bị từ chối kèm lý do.
* Thanh tiêu đề **kéo được** (chuột + cảm ứng) và **bị kẹp trong màn hình**
  — kéo bao xa cũng không bay khỏi viewport (`TAB-007`, `TAB-011`); có nút
  **thu nhỏ/mở lại** (`TAB-006`).
* Nút **Theo dõi mục đã chọn** bật/tắt theo dõi cho cả nhóm; nhãn tự đổi thành
  "Ngừng theo dõi" khi mọi mục đã chọn đều đang được theo dõi (`SEL-014`).

## 2. Cây thư mục

```
doors-entity-radar/
├── default.project.json          # Rojo: map src/ + bundle/ vào đúng chỗ trong Studio
├── package.json                  # npm run build | syntax | lint | docs | test | check
├── README.md                     # tệp này
├── bundle/
│   └── doors-entity-radar.luau   # SINH TỰ ĐỘNG — 1 tệp dán vào 1 LocalScript
├── docs/
│   ├── cai-dat.md                # cài đặt + vị trí đặt từng tệp + kiểm tra sau cài
│   ├── kiem-thu.md               # hướng dẫn test từng tính năng + đọc Output
│   └── danh-muc-thuc-the.md      # SINH TỰ ĐỘNG từ EntityCatalog (82 mục)
├── src/
│   ├── Client/
│   │   ├── Bootstrap.luau        # LocalScript duy nhất phía client
│   │   ├── Radar.luau            # điều phối: Start/Pause/Resume/Stop/Refresh/Destroy
│   │   ├── Core/
│   │   │   ├── Env.luau          # đọc service/nhân vật/camera, khai báo năng lực
│   │   │   ├── Matcher.luau      # chuẩn hoá tên + chỉ mục mẫu tên
│   │   │   ├── Registry.luau     # đếm connection/instance, Shutdown dọn về 0
│   │   │   ├── Scanner.luau      # quét theo bước, lắng nghe DescendantAdded
│   │   │   ├── Scheduler.luau    # task theo ngân sách khung hình, không trùng lặp
│   │   │   ├── Selection.luau    # tập mục đã chọn (dữ liệu thuần, đồng bộ mọi tab)
│   │   │   ├── SelfCheck.luau    # tự kiểm tra trước khi chạy
│   │   │   └── Tracker.luau      # kết luận trạng thái + khoảng cách + hướng
│   │   └── Ui/
│   │       ├── RadarUi.luau      # 13 tab, ô chọn, kéo thả, responsive
│   │       ├── Theme.luau        # màu, cỡ chữ, số đo
│   │       └── Widgets.luau      # tạo element + Set/SetText/SetColor bỏ qua ghi thừa
│   ├── Server/
│   │   └── Diagnostics.luau      # Script tuỳ chọn: in tên instance để xác minh mẫu
│   └── Shared/
│       ├── Areas.luau            # 8 khu vực
│       ├── Config.luau           # cấu hình + Validate()
│       ├── EntityCatalog.luau    # 82 mục, mẫu tên, cơ chế, ghi chú
│       ├── Geometry.luau         # khoảng cách, hướng tương đối, định dạng
│       ├── Log.luau              # log có tiền tố [DER]
│       ├── RequireShim.luau      # bộ nạp module cho bản nhiều tệp
│       ├── Safe.luau             # bọc pcall cho mọi API Roblox
│       ├── Signal.luau           # tín hiệu tối giản, DisconnectAll được
│       └── Status.luau           # 7 trạng thái + chốt "chỉ DETECTED mới có vị trí"
├── tests/                        # 10 suite, 123 test — chạy mã src THẬT trên máy ảo Lua
└── tools/                        # build, check-syntax, lint, gen-docs, chạy test
```

## 3. Cài nhanh (60 giây)

```bash
cd doors-entity-radar
npm run build      # sinh bundle/doors-entity-radar.luau
```

Trong Roblox Studio (game bạn sở hữu):
`StarterPlayer > StarterPlayerScripts > Insert Object > LocalScript` → dán toàn bộ
`bundle/doors-entity-radar.luau` → Play. Bảng điều khiển hiện ra; `F2` để ẩn/hiện.

Cách cài nhiều tệp (Rojo) và cách kiểm tra sau cài: [`docs/cai-dat.md`](docs/cai-dat.md).

## 4. Trạng thái hiển thị

| Mã | Nhãn trên UI | Có khoảng cách? | Ý nghĩa |
| --- | --- | --- | --- |
| `DETECTED` | Đã phát hiện | **Có** | Có instance khớp mẫu **và** đọc được vị trí hợp lệ |
| `NOT_FOUND` | Không phát hiện | Không | Đã quét xong phạm vi cho phép, không có instance khớp |
| `NO_POSITION` | Thấy instance, không đọc được vị trí | Không | Khớp tên nhưng vị trí không đọc được → không in số |
| `UNSUPPORTED` | Không hỗ trợ phát hiện | Không | Không có cơ chế client hợp lệ (kèm lý do) |
| `UNVERIFIED` | Chưa xác minh | Không | Mẫu tên chưa được xác minh trong game thật |
| `DISABLED` | Hệ thống đang tắt | Không | Đang tắt/tạm dừng |
| `FAULT` | Lỗi khi quét | Không | Nhịp quét ném lỗi; đã được bắt và báo ra Output |

## 5. Cấu hình (đầu `src/Shared/Config.luau`)

| Nhóm | Trường | Mặc định | Ghi chú |
| --- | --- | --- | --- |
| System | `autoStart` | `true` | `false` = phải bấm "Khởi động" |
| System | `toggleKeyCode` | `F2` | Phím ẩn/hiện bảng |
| System | `staleAfterSeconds` | `3.0` | Quá tuổi này thì dữ liệu bị đánh dấu cũ |
| System | `clockRefreshSeconds` | `1.0` | Chu kỳ cập nhật đồng hồ "cập nhật ... trước" |
| Scan | `maxDescendantsPerFullScan` | `20000` | Chặn quét cây quá lớn |
| Scan | `descendantsPerStep` | `1200` | Số descendant xử lý mỗi bước (không nghẽn frame) |
| Scan | `fullScanIntervalSeconds` | `2.5` | Chu kỳ quét đầy đủ; giữa các lần chỉ nghe sự kiện |
| Scan | `maxMatchesPerEntity` | `8` | Chặn giữ vô hạn instance cho một mục |
| Detection | `confirmedPatterns` | `{}` | **Bạn** khai tên đã thấy trong game → mục mới được coi là đã xác minh |
| Detection | `extraPatterns` | `{}` | Thêm mẫu tên cho mục có sẵn |
| Detection | `unsupported` | `{}` | Ép một mục thành "không hỗ trợ", kèm lý do |
| Detection | `developerBridge.enabled` | `false` | Nếu bạn tự phát dữ liệu qua Attribute |
| Ui | `showSearch`/`showAreaFilter`/`showDetailPanel`/`showStatusBar`/`showCounters`/`showSelectionBar` | `true` | Bật/tắt **từng khối** giao diện (đổi được ngay trong tab Cài đặt) |
| Ui | `showTabs` | `true` | Hiện thanh tab |
| Ui | `defaultTab` | `"home"` | Tab mở đầu (phải là id có trong `Ui.TABS`) |
| Ui | `enableDrag` | `true` | Cho phép kéo bảng bằng thanh tiêu đề |
| Ui | `startMinimized` | `false` | Mở ở trạng thái thu nhỏ |
| Ui | `selectionFilter` | `"all"` | Bộ lọc mặc định: `all` / `selected` / `unselected` |
| System | `alertOnTrack` | `true` | Ghi nhật ký khi mục **đang theo dõi** xuất hiện/biến mất |
| Log | `historySize` | `60` | Số dòng giữ cho tab Nhật ký |
| Ui | `narrowViewportWidth` | `700` | Dưới ngưỡng này chuyển bố cục điện thoại |
| Ui | `maxVisibleRows` | `40` | Số dòng dựng trong danh sách (phần còn lại cuộn) |

Cấu hình sai → `Config.Validate()` trả danh sách lỗi và **Radar từ chối khởi động**
(test `RAD-002`), thay vì chạy với giá trị lạ.

## 6. Lệnh

```bash
npm run build     # gộp 23 module -> bundle/doors-entity-radar.luau
npm run syntax    # parse thật từng tệp (fengari/Lua 5.3) + tệp dist
npm run lint      # 9 quy ước: cấm executor, cấm math.random, cấm Lighting/...
npm run docs      # sinh lại docs/danh-muc-thuc-the.md từ dữ liệu thật
npm test          # 98 test, chạy mã src thật trên máy ảo Lua + đồng hồ ảo
npm test -- ui    # chỉ chạy suite có tên chứa "ui"
npm run check     # lint + syntax + build + docs + test
```

## 7. Trạng thái kiểm chứng (nói thẳng)

| Đã kiểm bằng máy | Chưa kiểm được ở đây |
| --- | --- |
| 123/123 test trên máy ảo Lua 5.3 (fengari) với mock Roblox + đồng hồ ảo | Hành vi của API Roblox **thật** trong Studio |
| 22 module parse được; `dist` parse được | **Tên instance thật trong DOORS** có khớp mẫu tên không |
| Danh mục tự kiểm (`Validate()`) không có lỗi; 82 mục, 110 cặp khu vực | Giao diện trông ra sao trên điện thoại thật |
| Chỉ `DETECTED` mới in khoảng cách (`TRK-*`, `UI-003`, `RAD-004`) | FPS thật khi chạy trong game |
| Dừng/huỷ dọn về 0 connection, 0 instance (`REG-001`, `RAD-007`, `TAB-010`) | — |
| 13 tab chuyển không tạo lại widget (`TAB-002`), lựa chọn giữ khi đổi tab (`SEL-007`) | Cảm giác kéo thả/thu nhỏ trên thiết bị thật |

Ba điều ở cột phải **chỉ kiểm được bằng cách chạy trong game** — làm theo
[`docs/kiem-thu.md`](docs/kiem-thu.md). Cho tới khi bạn tự thấy tên instance trong
Explorer, mọi mục vẫn hiện **"Chưa xác minh"**, và đó là hành vi đúng.

## 8. Không làm gì

- Không `loadstring`, không executor, không `getgenv`/`hookmetamethod`/... (lint chặn).
- Không `math.random` trong mã nguồn — radar không được bịa số liệu (lint chặn).
- Không đụng `Lighting`, `SoundService`, `PhysicsService`, `StarterGui` (lint chặn).
- Không ghi gì vào Workspace; chỉ đọc. Folder `DER_Bridge` (nếu bạn bật cầu dữ liệu)
  là do **bạn** tạo.
- Không tạo background task trùng: `Scheduler` từ chối task trùng tên và chỉ giữ một
  connection Heartbeat (`SCH-*`).
