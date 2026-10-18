# 2. Cây thư mục và vai trò từng tệp

Tổng: **36 tệp `.luau`, 9.246 dòng**, không có tệp thừa, không có module bị thiếu.

## 2.1 Cây thư mục

```
aiaiaitao3/
├── default.project.json          Rojo: ánh xạ src/ vào vị trí trong Studio
├── package.json                  Lệnh lint / catalog / syntax / test / build
├── README.md                     Cổng vào
├── dist/
│   └── roblox-anti-lag-optimizer.luau   Bundle một tệp để dán vào LocalScript
├── docs/                         Tài liệu (01 → 08)
├── src/
│   ├── Shared/                   → ReplicatedStorage.RALO
│   │   ├── RequireShim.luau      Shim require theo đường dẫn chuỗi
│   │   ├── Hsv.luau              HSV → RGB cho viền cầu vồng
│   │   ├── Safe.luau             Đọc/ghi thuộc tính có pcall + kiểm tra tồn tại
│   │   ├── Log.luau              Ghi log theo mức, có scope
│   │   ├── Types.luau            Định nghĩa kiểu Luau
│   │   ├── Safety.luau           Danh sách thuộc tính được phép + lớp được bảo vệ
│   │   ├── Config.luau           CẤU HÌNH DUY NHẤT của toàn hệ thống
│   │   └── Methods.luau          Danh mục 190 phương pháp, 30 nhóm, trạng thái A–E
│   ├── Client/                   → StarterPlayer.StarterPlayerScripts.RALO
│   │   ├── Bootstrap.luau        LocalScript — điểm khởi động duy nhất
│   │   ├── Core/
│   │   │   ├── Scheduler.luau    MỘT connection Heartbeat cho mọi tác vụ định kỳ
│   │   │   ├── Guard.luau        Kiểm tra tồn tại + stale-guard + phân lập lỗi
│   │   │   ├── Registry.luau     Theo dõi connection / instance để ngắt khi Shutdown
│   │   │   ├── Pool.luau         Tái sử dụng đối tượng thay vì tạo mới
│   │   │   ├── Cull.luau         Tắt tạm thời đối tượng ở xa, bật lại khi gần
│   │   │   ├── Spatial.luau      Lưới băm để tra cứu theo vùng
│   │   │   ├── Profile.luau      Lấy số đo MicroProfiler khi có
│   │   │   ├── Cpu.luau          Ước tính chi phí CPU tương đối
│   │   │   ├── Devices.luau      Phân loại thiết bị (mức độ, không bịa chỉ số)
│   │   │   ├── Net.luau          Đọc thống kê mạng phía client
│   │   │   ├── Plan.luau         9 bước tối ưu, có thứ tự ưu tiên
│   │   │   ├── Env.luau          Bao quanh os.clock để test tiêm đồng hồ giả
│   │   │   ├── Measure.luau      Đo trước/sau, từ chối kết luận khi thiếu mẫu
│   │   │   ├── Perf.luau         Tổng hợp số đo
│   │   │   ├── Restore.luau      Ghi lại giá trị gốc để hoàn tác
│   │   │   ├── Runner.luau       Thực thi từng bước, gom kết quả
│   │   │   └── Pipeline.luau     Điều phối: Start / Shutdown / Restore
│   │   ├── Optimizations/
│   │   │   ├── Scan.luau         Quét thế giới có trần, không treo
│   │   │   ├── Graphics.luau     QualityLevel nhẹ; giữ Terrain.Decoration, ánh sáng và bóng
│   │   │   ├── Effects.luau      GIỚI HẠN hạt/ánh sáng, không xoá
│   │   │   ├── Memory.luau       Dọn tham chiếu cũ của chính hệ thống
│   │   │   └── Physics.luau      Tinh chỉnh phía client, đảo ngược được
│   │   └── Ui/
│   │       ├── Theme.luau        Màu, bo góc, cỡ chữ
│   │       ├── Widget.luau       Tạo instance có kiểm tra thuộc tính
│   │       ├── Progress.luau     Trạng thái tiến trình các bước, kẹp trong 0–100
│   │       ├── Notifier.luau     Bảng 1–100% ở góc dưới phải, không nút, tự huỷ
│   │       └── GuiPolicy.luau    Chống trùng lặp, chỉ xoá thứ nó tạo
│   └── Server/                   → rỗng (không có mã server, không RemoteEvent)
├── tests/
│   ├── lib/assert.js             Bộ khẳng định không phụ thuộc
│   ├── lib/runtime.js            Nối Node với máy ảo Lua + mock Roblox
│   └── suites/*.test.js          11 bộ, 124 test
└── tools/
    ├── luau-to-lua.js            Chuyển Luau → Lua 5.3 để test được
    ├── luau-prelude.luau         Polyfill cho Lua 5.3
    ├── build.js                  Ghép dist bundle
    ├── syntax-check.js           Phân tích cú pháp toàn bộ .luau
    ├── verify-catalog.js         Đối chiếu danh mục với mã nguồn thật
    ├── lint-conventions.js       4 quy ước an toàn tĩnh
    └── test-harness/
        ├── roblox-mock.luau      Mock Instance/Signal/Game (Lua 5.3 thuần)
        ├── lua-runtime.js        Cầu nối Node ↔ fengari
        ├── run.js                Trình chạy test
        └── smoke.js              Kiểm tra nhanh
```

## 2.2 Nguyên tắc phụ thuộc

Phụ thuộc đi **một chiều**, không có vòng:

```
Bootstrap → Pipeline → Plan → {Graphics, Effects, Memory, Physics, Scan}
                            ↘ Core (Guard, Restore, Scheduler, Registry, Pool,
                                      Cull, Spatial, Measure, Profile, Perf,
                                      Cpu, Devices, Net, Env, Runner)
                            ↘ Ui (Notifier → Progress → Widget → Theme, GuiPolicy)
Mọi tầng → Shared (Config, Safe, Safety, Log, Hsv, Methods, RequireShim, Types)
```

Không module nào trong `src/Client` gọi thẳng `game:GetService` ngoài `Env`,
`Devices`, `Net` và `Notifier` — bốn tệp này là **ranh giới duy nhất** với API Roblox,
nên phần còn lại có thể chạy trong mock để test.
