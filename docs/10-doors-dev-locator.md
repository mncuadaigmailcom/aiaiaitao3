# 10. Bộ định vị QA cho Roblox Studio — chỉ game bạn sở hữu

## Phạm vi và giới hạn an toàn

Đây là **công cụ gỡ lỗi/QA trong Roblox Studio**, không phải ESP hoặc cheat cho
DOORS đang chơi trực tuyến. Mã nguồn:

- **từ chối chạy** nếu `RunService:IsStudio()` không trả về `true`;
- **không quét Workspace theo tên** — chỉ nhận object được bạn gắn tag QA cụ thể;
- không gọi RemoteEvent/RemoteFunction, không thay đổi object đích;
- chỉ tạo `BillboardGui` và menu trong `PlayerGui` của trải nghiệm bạn sở hữu.

Nó không thể dò object trong trải nghiệm DOORS của bên khác. Không dùng executor,
`loadstring`, hook, hay cách chèn mã vào trải nghiệm không thuộc quyền bạn.

## Danh mục

Nguồn danh mục là `src/Shared/DoorsCatalog.luau`: **8 khu vực, 110 tên**.
Tên trùng giữa các khu vực được tách bằng `sectionId` nên, ví dụ, `Rush` ở Hotel
không bị nhầm với `Rush` ở Mines.

| `sectionId` | Khu vực | Số tên |
| --- | --- | ---: |
| `hotel` | The Hotel | 23 |
| `mines` | The Mines | 27 |
| `backdoor` | The Backdoor | 6 |
| `archives` | The Archives | 14 |
| `outdoors` | The Outdoors | 13 |
| `stairwell` | The Stairwell | 12 |
| `rooms` | The Rooms | 3 |
| `events` | Chế độ đặc biệt & sự kiện | 12 |

`Sally` là alias của `Sally (Window)`; `Forget-Me-Not` là alias của
`Forget Me Nots (Forget-Me-Not)`. Chữ hoa/thường không quan trọng, nhưng tên phải
thuộc đúng section.

## Đánh dấu object trong Studio

Mỗi object muốn kiểm thử phải được chủ game **tự gắn** đủ ba thông tin sau:

1. CollectionService tag: `RALO_DoorsDevLocator`
2. Attribute `RALO_LocatorSection`: một id trong bảng trên, ví dụ `hotel`
3. Attribute `RALO_LocatorName`: tên hợp lệ trong khu vực đó, ví dụ `Rush`

Đặt tag và attributes trên cùng một `BasePart` hoặc `Model`. Nếu dùng `Model`, model
phải có ít nhất một `BasePart` ở bên trong (có thể đặt `PrimaryPart`). Công cụ chỉ
hiển thị nhãn cho object vừa có tag, vừa khớp cả hai attribute. Object không khớp
sẽ bị bỏ qua.

Ví dụ thiết lập trong LocalScript của **place do bạn sở hữu**:

```lua
local CollectionService = game:GetService("CollectionService")
local rushModel = workspace:WaitForChild("QA_Rush")
rushModel:SetAttribute("RALO_LocatorSection", "hotel")
rushModel:SetAttribute("RALO_LocatorName", "Rush")
CollectionService:AddTag(rushModel, "RALO_DoorsDevLocator")
```

Hoặc dùng Tag Editor và bảng Attributes trong Studio. Không cần và không nên đổi
instance trong một game không thuộc quyền bạn.

## Chạy bằng Rojo

`default.project.json` map sẵn:

- `src/Shared` → `ReplicatedStorage.RALO`
- `src/Client` → `StarterPlayer.StarterPlayerScripts.RALO`

Mở project trong Studio bằng Rojo rồi Play. Rojo tự chạy
`src/Client/Debug/DoorsLocatorBootstrap.client.luau`. Nếu Studio chưa có `PlayerGui`
hoặc thiếu dịch vụ cần thiết, Output ghi lý do và không tạo overlay.

## Chạy bằng một LocalScript

Sinh bundle:

```bash
npm run build:doors-locator
```

Sau đó:

1. Trong trải nghiệm của bạn, tạo `LocalScript` ở
   `StarterPlayer > StarterPlayerScripts`.
2. Đặt `RunContext = Legacy`.
3. Dán toàn bộ `dist/roblox-doors-dev-locator.luau` vào script rồi Play.

Bundle tự gọi `Start()`; nếu không ở Studio, nó từ chối khởi động. Đây là một
bundle riêng, không làm thay đổi cách chạy bộ Anti-Lag Optimizer.

## Dùng menu

- Menu hiện **8 section riêng biệt**; mỗi nút bật/tắt marker của đúng khu vực đó.
- Mỗi object hợp lệ có nhãn trên object, tên khu vực, tên chuẩn và khoảng cách
  đến `HumanoidRootPart` (nếu nhân vật đã có root part).
- Nút nổi **ẨN MENU / MỞ MENU** ẩn hoặc mở bảng điều khiển; nó không tắt marker.
- Thêm/gỡ tag lúc đang Play sẽ cập nhật marker tương ứng.
- Gọi `DoorsLocator.Stop()` trong code Studio để ngắt connection và dọn GUI do
  công cụ tạo. Object gốc không bị xoá.

## Kiểm thử

```bash
npm run test:doors-locator
npm run build:doors-locator
npm run syntax
npm run check
```

Các test tự động dùng Lua 5.3/Fengari và mock Roblox API. Chúng kiểm tra danh mục,
chốt Studio-only, nhận diện tag, nút menu/khu vực, cập nhật khoảng cách và dọn tài
nguyên. Chúng **không** phải Roblox Studio và không xác nhận UI render trên thiết bị
thật; sau khi cài, hãy kiểm tra thủ công trong Studio.
