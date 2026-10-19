# 1. Môi trường, quyền, giới hạn, kiến trúc

## 1.1 Loại script và lý do

| Tệp | Loại script | Vì sao |
| --- | ----------- | ------ |
| `src/Client/Bootstrap.luau` | **ModuleScript** | Điểm vào của bộ Anti-Lag; được gọi từ LocalScript/bundle. |
| `src/Client/Debug/DoorsLocatorBootstrap.client.luau` | **LocalScript** | Entry Rojo cho công cụ QA định vị; chỉ chạy trong Studio và game bạn sở hữu. |
| Mọi tệp `.luau` còn lại trong `src/` | **ModuleScript** | Được `require` từ LocalScript/bundle; không tự chạy. |
| `src/Server/` | **rỗng** | Không có mã server. Không RemoteEvent. Không mã trang trí. |

### Giới hạn cứng của LocalScript

1. Không sửa được thuộc tính phía server (physics stepping, replication settings của server).
2. Không xoá được instance do server tạo nếu server vẫn tham chiếu — hệ thống **không**
   thử làm vậy; chỉ tắt/bật hiển thị trên client.
3. Không đọc được `RunService:IsServer() == true` state của server.
4. Không có quyền `setrbxsetting` hay bất kỳ API đặc quyền nào.

## 1.2 API được dùng và quyền cần có

| API | Dùng ở | Quyền | Đã đối chiếu tài liệu chính thức? |
| --- | ------ | ----- | --------------------------------- |
| `game:GetService("RunService")` (`.RenderStepped`, `.Heartbeat`, `.PreSimulation`) | Scheduler, Cull | Studio / game thuộc quyền | **Chưa** |
| `game:GetService("Players").LocalPlayer` | Bootstrap, Net | LocalScript | **Chưa** |
| `game:GetService("Lighting")` (`.QualityLevel`) | Graphics | Client, đổi được trên client | **Chưa** |
| `game:GetService("Workspace").Terrain` (`.Decoration`) | Graphics | Client, đổi được trên client | **Chưa** |
| `game:GetService("StarterGui")` / `CoreGui` | Notifier | `StarterGui` dùng được; **`CoreGui` cần plugin** → hệ thống dùng `PlayerGui` | **Chưa** |
| `game:GetService("UserInputService")` | Devices | Client | **Chưa** |
| `game:GetService("CollectionService")` (`GetTagged`, tag signals) | DoorsLocator | Chỉ object có tag QA trong Studio | **Chưa** |
| `BillboardGui` trong `PlayerGui` | DoorsLocator | Nhãn QA do chính công cụ tạo | **Chưa** |
| `os.clock()` | Env.now | Luau | **Chưa** |
| `collectgarbage("count")` | Measure | Luau | **Chưa** |

> **Khai báo trung thực:** trong quá trình phát triển, tài liệu API chính thức của
> Roblox **không được truy cập**. Bảng trên phản ánh kiến thức sẵn có, **chưa đối
> chiếu với trang tài liệu hiện hành**. Nếu một API đã đổi tên hoặc đã bị thay thế,
> đó là lỗi cần bạn báo lại theo quy trình ở mục 6.

## 1.3 Những gì cần quyền chỉnh sửa trong Studio

- Chèn LocalScript vào `StarterPlayer.StarterPlayerScripts`.
- (Cách A) cài plugin Rojo và bật "Connect".
- Không cần bật quyền admin, không cần plugin đặc quyền, không cần tắt anti-cheat.

## 1.4 Kiến trúc

```
Bootstrap (ModuleScript/entry bundle)
   └─ Pipeline ── Plan (9 bước, có thứ tự ưu tiên)
        ├─ Guard    : kiểm tra tồn tại + stale-guard + ghi log
        ├─ Restore  : ghi lại giá trị gốc để hoàn tác
        ├─ Scheduler: 1 connection Heartbeat cho MỌI tác vụ định kỳ
        ├─ Registry : theo dõi connection để ngắt khi Shutdown
        ├─ Spatial  : tra cứu theo ô lưới thay vì duyệt toàn thế giới
        └─ Notifier : GUI góc dưới phải, ~30 s, tự huỷ

DoorsLocatorBootstrap.client (LocalScript, Studio-only)
   └─ DoorsLocator → DoorsCatalog; đọc tag tường minh, chỉ tạo nhãn trong PlayerGui
```

Nguyên tắc xuyên suốt:

1. **Mỗi thay đổi đều qua `Guard.Change`** → trả về `applied | unchanged | stale | failed`,
   không bao giờ ghi đè mù.
2. **Mỗi thay đổi thành công đều được `Restore.Record`** kèm cả giá trị mới, để khi
   hoàn tác biết được giá trị hiện tại có còn là giá trị hệ thống đã đặt hay không.
3. **Chỉ một connection Heartbeat**, dùng chung. Không có vòng lặp RenderStepped/Heartbeat
   trùng lặp.
4. **Lỗi ở một bước không chặn bước khác** (`Guard.Run` không ném lỗi, trả thông báo).
5. **Không xoá nội dung** — chỉ tắt tạm ở xa và bật lại khi gần.
