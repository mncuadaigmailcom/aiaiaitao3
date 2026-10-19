# Kiểm thử — Doors Entity Radar

Hai tầng kiểm chứng, và **chúng chứng minh hai thứ khác nhau**:

| Tầng | Lệnh | Chứng minh được | KHÔNG chứng minh được |
| --- | --- | --- | --- |
| Tự động (máy ảo Lua 5.3 + mock Roblox + đồng hồ ảo) | `npm test` | Logic thật của `src/`: thuật toán, trạng thái, chốt an toàn, vòng đời GUI, dọn dẹp tài nguyên | API Roblox thật, tên instance thật trong DOORS, giao diện, FPS |
| Thủ công (trong Studio) | làm theo bảng dưới | Tên instance thật, giao diện thật, cảm giác dùng | — |

> **Đừng bỏ qua tầng thủ công.** Cho tới khi bạn tự thấy tên instance trong game,
> mọi mục vẫn hiển thị **"Chưa xác minh"** — đó là thiết kế, không phải lỗi.

---

## 1. Kiểm thử tự động

```bash
cd doors-entity-radar
npm test                 # 123 test / 10 suite
npm test -- tabs         # chỉ suite có tên chứa "tabs"
npm run check            # lint + syntax + build + docs + test
```

Kết quả phải là:

```
=== TỔNG KẾT ===
  đạt  : 123
  hỏng : 0
  tổng : 123

✓ Toàn bộ test đạt — trên máy ảo Lua, KHÔNG phải Roblox Studio.
```

Bảng coverage theo nhóm (mỗi dòng là một test có thật, đọc tên để biết nó chốt gì):

| Suite | Số test | Chốt chính |
| --- | --- | --- |
| `catalog` | 11 | 82 mục, 110 cặp khu vực, `Validate()` sạch, alias không tạo chu trình, `NormalizeKey` |
| `geometry` | 9 | Từ chối NaN/vô hạn, đọc vị trí từ Part/Model, 8 hướng, định dạng |
| `status` | 7 | **Chỉ `DETECTED` được có vị trí**, `MakeRecord` chặn observation sai trạng thái |
| `scheduler` | 10 | Một connection duy nhất, Pause/Resume không "trả nợ", Registry dọn về 0 |
| `scanner` | 17 | Quét theo bước, `DescendantAdded/Removing`, trần `maxMatchesPerEntity`, cầu nhà phát triển |
| `tracker` | 15 | `UNVERIFIED` ≠ `NOT_FOUND`, `NO_POSITION` không bịa toạ độ, chọn instance gần nhất |
| `ui` | 12 | Không ghi lại property khi dữ liệu không đổi (đếm được), responsive, Destroy sạch |
| `radar` | 17 | Đầu-cuối Start→UI, Pause đánh dấu dữ liệu cũ, lỗi không sập, Bootstrap + phím tắt |
| `selection` | 14 | Chọn 1/nhiều/tất cả theo phạm vi, giữ lựa chọn khi đổi tab, bộ lọc, theo dõi nhóm, không rò rỉ connection |
| `tabs` | 11 | 13 tab đúng nội dung, chuyển tab không dựng lại widget, thu nhỏ, kéo thả (kẹp trong màn hình), cài đặt, nhật ký, dọn dẹp |

---

## 2. Kiểm tra khởi động (trong Studio)

Bấm Play rồi nhìn `View > Output`. Mỗi dòng đều có tiền tố `[DER]`.

| Dòng mong đợi | Ý nghĩa |
| --- | --- |
| `[DER] [INFO] Khởi động DOORS Entity Radar v1.0.0` | LocalScript đã chạy |
| `[DER] [INFO] Dùng bộ nạp của bundle.` (cách A) hoặc `Đã cài bộ nạp module từ cây instance.` (cách B) | Bộ nạp `__DER_REQUIRE` sẵn sàng |
| `[DER] [INFO] Sẵn sàng: Hệ thống đang chạy. Tự kiểm tra: ĐẠT — N hạng mục, 0 lỗi, M cảnh báo.` | Tự kiểm tra đạt; **0 lỗi** là điều kiện để chạy |
| `[DER] [WARN] ...` | Thiếu một năng lực (ví dụ chưa có nhân vật). Hệ thống vẫn chạy ở chế độ hạn chế |
| `[DER] [ERROR] Cấu hình không hợp lệ, từ chối khởi động: ...` | Sửa đúng trường được nêu trong thông điệp |

**Đọc cảnh báo thế nào:** cảnh báo không phải lỗi. Ví dụ `chưa có vị trí người chơi`
nghĩa là radar vẫn liệt kê danh mục nhưng **không in khoảng cách** — đúng như thiết kế.

---

## 3. Kiểm thử từng tính năng (thủ công)

Mở Command Bar (`View > Command Bar`) khi cần chạy lệnh kiểm tra.

### 3.1 Danh sách & trạng thái

| # | Thao tác | Kết quả phải thấy |
| --- | --- | --- |
| 1 | Play, nhìn bảng điều khiển | 82 mục (thanh trạng thái ghi `hiển thị 40/82 mục`), mọi mục **Chưa xác minh** trừ `Hide` là **Không hỗ trợ phát hiện** |
| 2 | Đếm trạng thái | Lệnh bên dưới; tổng phải bằng **82** |
| 3 | Chờ 5 giây không làm gì | Đồng hồ `Cập nhật: 5.0s trước` tăng dần; **bộ đếm không bị xoá** |

```lua
-- Command Bar: đếm trạng thái (tổng phải bằng 82)
local counts, total = _G.__DER_RADAR.tracker:CountByStatus(), 0
for code, n in pairs(counts) do print(code, n) total = total + n end
print("TỔNG:", total)
```

Mới vào game, chưa xác minh mẫu nào, kết quả thật là:

```
UNVERIFIED  81
UNSUPPORTED 1
TỔNG:       82
```

Và thanh trạng thái (đo thật) hiện:

```
Phát hiện 0  •  không thấy 0  •  chưa xác minh 81  •  không hỗ trợ 1  •  hiển thị 40/82 mục  ⚠ tự kiểm tra còn 1 cảnh báo
```

Nhãn đồng hồ `Cập nhật: 0.4s trước` nằm ở **ô riêng** bên trái — nó không ghi đè bộ
đếm (test `UI-012`, `RAD-005`).

### 3.2 Tìm kiếm

| # | Thao tác | Kết quả phải thấy |
| --- | --- | --- |
| 4 | Gõ `glitch` vào ô tìm kiếm | Còn đúng 1 dòng: **Glitch** |
| 5 | Gõ `rush` | 3 dòng: **Crusher**, **Rush**, **Rushing Light** (tìm theo chuỗi con, có cả mẫu tên) |
| 6 | Gõ `A-60` | 1 dòng: **A-60** (dấu gạch được bỏ qua khi chuẩn hoá) |
| 7 | Xoá ô tìm kiếm | Về lại 82 mục |

### 3.3 Lọc theo khu vực

| # | Thao tác | Kết quả phải thấy |
| --- | --- | --- |
| 8 | Bấm nút `Rooms` | Còn **3** mục: A-60, A-90, A-120 |
| 9 | Bấm `Hotel` | **23** mục |
| 10 | Bấm `Mines` | **27** mục |
| 11 | Bấm `Tất cả` | **82** mục |

```lua
-- Command Bar: đổi lọc/khu vực không cần bấm chuột
_G.__DER_RADAR:SetArea("rooms");  print(#_G.__DER_RADAR.tracker:BuildView("", "rooms"))
_G.__DER_RADAR:SetQuery("rush");  print(#_G.__DER_RADAR.tracker:BuildView("rush", nil))
_G.__DER_RADAR:SetArea("all");    _G.__DER_RADAR:SetQuery("")
```

### 3.4 Chọn mục & bảng chi tiết

| # | Thao tác | Kết quả phải thấy |
| --- | --- | --- |
| 12 | Bấm một dòng | Dòng đổi màu nền; bảng chi tiết hiện tên, loại, khu vực, **mẫu tên đang dò**, `Đã xác minh mẫu: false` |
| 13 | Nhìn phần vị trí của mục chưa phát hiện | Dòng chữ: `Không có vị trí để hiển thị — hệ thống không suy đoán toạ độ.` — **không có con số** |
| 14 | Mục `Hide` | Trạng thái `Không hỗ trợ phát hiện` + lý do bằng tiếng Việt |

### 3.5 Start / Pause / Resume / Stop / Refresh / Đóng

| # | Thao tác | Kết quả phải thấy |
| --- | --- | --- |
| 15 | Bấm **Tạm dừng** | Nhãn trạng thái `TẠM DỪNG (dữ liệu không còn trực tiếp)`; thanh trạng thái có cảnh báo `hệ thống tạm dừng nên dữ liệu đã cũ...` |
| 16 | Bấm **Tiếp tục** | Trạng thái `ĐANG CHẠY`, cảnh báo biến mất |
| 17 | Bấm **Làm mới** | Output: `Đã yêu cầu quét lại theo yêu cầu người dùng.`; đồng hồ về `0.0s trước` |
| 18 | Bấm **Dừng** | Mọi mục về `Hệ thống đang tắt`; Output ghi số connection/instance đã ngắt |
| 19 | Bấm **Khởi động** lại | Chạy lại bình thường (không cần vào lại game) |
| 20 | Bấm **Đóng** (×) rồi bấm `F2` | Bảng ẩn rồi hiện lại, không tạo ScreenGui thứ hai |

```lua
-- Command Bar: kiểm tra tài nguyên TRƯỚC và SAU khi huỷ
local r = _G.__DER_RADAR
local before = r:Stats().registry
print("trước:", before.connections, before.instances)
r:Destroy()
local after = r:Stats().registry
print("sau :", after.connections, after.instances, r:State(),
      game:GetService("Players").LocalPlayer.PlayerGui:FindFirstChild("DoorsEntityRadar") == nil)
```

Số đo thật trên máy ảo Lua (bản autorun, chưa phát hiện gì): `trước: 54 270`
(54 connection, 270 instance là các element của ScreenGui) → `sau : 0 0 stopped true`.
Nghĩa là: **0 connection, 0 instance**, ScreenGui đã biến mất khỏi `PlayerGui`,
trạng thái `stopped`. Biến `_G.__DER_RADAR` vẫn còn (đã dừng, gọi `Start()` lại được)
— dự án cố ý không xoá để bạn còn đọc được `Stats()` sau khi huỷ.
(Test tự động tương ứng: `RAD-007`, `REG-001`.)

### 3.6 Điện thoại / màn hình hẹp

| # | Thao tác | Kết quả phải thấy |
| --- | --- | --- |
| 21 | Thu cửa sổ Studio xuống dưới 700 px (hoặc Device → iPhone) | Bảng đổi bố cục hẹp: chữ nhỏ hơn, các khối xếp lại, vẫn đọc được |
| 22 | Chạm nút ẩn/hiện trên cảm ứng | Bảng ẩn/hiện (`System.allowTouchToggle = true`) |

### 3.7 Không can thiệp trò chơi

| # | Thao tác | Kết quả phải thấy |
| --- | --- | --- |
| 23 | So sánh `Workspace`, `Lighting` trước/sau khi bật radar | Không có gì thay đổi; không có instance mới ngoài ScreenGui trong `PlayerGui` |
| 24 | Bấm `F2` khi đang gõ chat | Ký tự vẫn vào ô chat — phím tắt trả `PassThrough` |

### 3.8 Hệ thống tab

| # | Thao tác | Kết quả phải thấy |
| --- | --- | --- |
| 25 | Nhìn thanh tab | 13 nút: Trang chủ, Tất cả, The Hotel, The Mines, The Backdoor, The Archives, The Outdoors, The Stairwell, The Rooms, Sự kiện đặc biệt, Đã chọn, Cài đặt, Nhật ký |
| 26 | Bấm `The Rooms` | Danh sách còn **3** mục (A-60, A-90, A-120); ô khu vực tự tô sáng `Rooms` |
| 27 | Bấm `Sự kiện đặc biệt` | **12** mục thuộc nhóm sự kiện |
| 28 | Bấm `Trang chủ` | Hiện trạng thái, bộ đếm theo trạng thái, số mục đã chọn/đang theo dõi, các nút thao tác nhanh |
| 29 | Bấm `Cài đặt` | 9 công tắc bật/tắt + nút "Xoá nhật ký trên giao diện" |
| 30 | Bấm `Nhật ký` | Các dòng `[DER] …` gần nhất (tối đa 40 dòng cuối) |
| 31 | Chuyển tab liên tục | Không giật, không thấy bảng bị dựng lại (không nháy trắng) |

```lua
-- Command Bar: đổi tab không cần bấm chuột
_G.__DER_RADAR:SetTab("hotel")
print(_G.__DER_RADAR:ActiveTab(), _G.__DER_RADAR.ui:Stats().renderedRows)
print(_G.__DER_RADAR.ui:Stats().tabSwitches, _G.__DER_RADAR.ui:Stats().widgetsCreated)
-- Chuyển tab bao nhiêu lần thì widgetsCreated cũng KHÔNG được tăng.
```

### 3.9 Chọn thực thể

| # | Thao tác | Kết quả phải thấy |
| --- | --- | --- |
| 32 | Bấm ô vuông trái một dòng | Ô hiện dấu `X`, bộ đếm tăng `Đã chọn 1/82` |
| 33 | Bấm lại ô đó | Dấu `X` mất, bộ đếm giảm |
| 34 | Ở tab `The Rooms`, bấm **Chọn tất cả** | Bộ đếm thành `3/82` — **không** phải 82 |
| 35 | Bấm **Chọn tất cả khu vực** | Bộ đếm thành `82/82` |
| 36 | Bấm **Bỏ chọn toàn bộ** | Bộ đếm về `0/82`, mọi dấu `X` mất |
| 37 | Chọn vài mục rồi chuyển tab khác, quay lại | Lựa chọn **còn nguyên** |
| 38 | Bấm bộ lọc `Đã chọn` | Chỉ còn những mục đã chọn; `Chưa chọn` thì ngược lại |
| 39 | Bấm tab `Đã chọn` | Liệt kê đúng những mục đã chọn, **gộp mọi khu vực** |
| 40 | Chọn một mục rồi bấm dòng của nó | Bảng chi tiết hiện "Đã chọn: true", nút đổi thành `Bỏ chọn` |

```lua
-- Command Bar
_G.__DER_RADAR:SetTab("hotel")
print(_G.__DER_RADAR:SelectScope(true))     -- chọn mọi mục đang hiện ở tab Hotel
print(_G.__DER_RADAR.selection:Count())     -- 23
print(_G.__DER_RADAR:SelectAllAreas())      -- chọn nốt phần còn lại
_G.__DER_RADAR:SetSelectionFilter("selected")
print(_G.__DER_RADAR.ui:Stats().renderedRows)
_G.__DER_RADAR:ClearSelection()
```

### 3.10 Theo dõi thực thể đã chọn

| # | Thao tác | Kết quả phải thấy |
| --- | --- | --- |
| 41 | Chọn một mục có cơ chế quét (ví dụ Rush), bấm **Theo dõi** | Nút đổi thành `Ngừng theo dõi`; dòng trong danh sách có chấm xanh nhỏ |
| 42 | Chờ thực thể đó xuất hiện trong game | Output có dòng `[DER] [INFO] [THEO DÕI] Thấy Rush — 25.0 stud, phía trước` |
| 43 | Thực thể biến mất | Output có `[DER] [INFO] [THEO DÕI] Không còn thấy Rush` |
| 44 | Bấm **Theo dõi** ở mục `Hide` | Không bật được; Output ghi lý do "không có cơ chế phát hiện từ client" |
| 45 | Chọn nhiều mục rồi bấm **Theo dõi mục đã chọn** | Nhiều mục cùng được theo dõi; nhãn nút đổi thành `Ngừng theo dõi` |
| 45b | Bấm lại nút đó | Ngừng theo dõi cả nhóm, nhãn trở về `Theo dõi mục đã chọn` |

```lua
-- Theo dõi cả nhóm đang chọn, và xem số mục đang theo dõi
print(_G.__DER_RADAR:SetTrackedForSelection(true))  -- (số áp dụng, số bỏ qua)
print(_G.__DER_RADAR:TrackedCount())
```

> **Nhớ cho đúng:** "Theo dõi" KHÔNG có nghĩa là hệ thống định vị được thực thể.
> Nó chỉ ghi nhật ký khi trạng thái **thật** của mục đó đổi. Nếu mẫu tên chưa
> được xác minh, trạng thái vẫn là "Chưa xác minh" và sẽ không có dòng nào.

### 3.11 Cửa sổ: kéo thả, thu nhỏ, đóng

| # | Thao tác | Kết quả phải thấy |
| --- | --- | --- |
| 46 | Giữ chuột ở thanh tiêu đề rồi kéo | Bảng đi theo con chuột, không vượt khỏi màn hình |
| 47 | Thả chuột rồi kéo tiếp | Bảng **đứng yên** (không "dính" chuột) |
| 47b | Kéo thật mạnh ra ngoài cửa sổ | Bảng **dừng ở mép màn hình**, không biến mất |
| 48 | Bấm nút `—` | Bảng thu lại chỉ còn thanh tiêu đề, nút đổi thành `+`; bấm lại thì trở về |
| 49 | Bấm **Đóng** rồi bấm `F2` | Bảng ẩn rồi hiện lại, không có bảng thứ hai |

```lua
-- Command Bar: thu nhỏ/mở lại
_G.__DER_RADAR.ui:SetMinimized(true)
_G.__DER_RADAR.ui:ToggleMinimized()
print(_G.__DER_RADAR.ui:IsMinimized(), _G.__DER_RADAR.ui:Stats().drags)
```

### 3.12 Tab Cài đặt

| # | Thao tác | Kết quả phải thấy |
| --- | --- | --- |
| 50 | Tắt "Hiện bộ đếm trạng thái" | Thanh trạng thái hết phần `Phát hiện … chưa xác minh …` |
| 51 | Tắt "Hiện thanh tab" | Bảng dựng lại **không có** thanh tab; lựa chọn vẫn còn |
| 52 | Bật lại | Thanh tab trở về, vẫn chỉ **một** bảng trên màn hình |
| 53 | Tắt "Cho phép kéo thả bảng" | Kéo thanh tiêu đề không còn tác dụng |

```lua
-- Command Bar
print(_G.__DER_RADAR:ApplySetting("Ui.showCounters", false))
print(_G.__DER_RADAR:ApplySetting("Ui.showTabs", false))
print(_G.__DER_RADAR:ApplySetting("Ui.khongTonTai", true))  -- false + lý do
```

---

## 4. Việc quan trọng nhất: xác minh mẫu tên

Radar khớp **tên instance**. Muốn một mục chuyển từ `Chưa xác minh` sang tin cậy,
bạn phải **tự thấy tên thật** trong game.

### 4.1 Cách nhanh (client, trong Studio)

Vào đúng khu vực có thực thể (ví dụ chờ Rush trong The Hotel), rồi chạy trong
Command Bar:

```lua
-- In mọi tên instance đang có trong Workspace (chạy MỘT LẦN, chỉ dùng khi chẩn đoán)
local seen = {}
for _, inst in ipairs(game:GetService("Workspace"):GetDescendants()) do
  if not seen[inst.Name] then
    seen[inst.Name] = true
    print(inst.ClassName, "|", inst.Name)
  end
end
```

Hoặc hỏi thẳng radar xem nó đang giữ ứng viên nào cho một mục:

```lua
print("rush:", #_G.__DER_RADAR.scanner:GetCandidates("rush"))
print("seek:", #_G.__DER_RADAR.scanner:GetCandidates("seek"))
```

### 4.2 Cách chắc chắn (server)

Bật `src/Server/Diagnostics.luau` (đổi `ENABLED = true`, xem `docs/cai-dat.md` B3).
Nó in tên instance **phía server** — nơi nhìn thấy toàn bộ — để bạn biết mục nào
không được nhân bản xuống client. Mục không được nhân bản thì **client không thể
định vị**, và radar sẽ nói thẳng là `Chưa xác minh`/`Không phát hiện` thay vì đoán.

### 4.3 Ghi kết quả vào cấu hình

Sau khi thấy tên thật (ví dụ `RushMoving`):

```lua
-- src/Shared/Config.luau
Detection = {
  confirmedPatterns = { "Rush" },               -- "tôi đã thấy tên này trong game"
  extraPatterns = { rush = { "RushMoving" } },  -- thêm mẫu cho mục rush
}
```

Sau khi sửa, `npm run build` rồi dán lại bundle. Mục `rush` lúc này mới được phép
hiện `Đã phát hiện` + khoảng cách; các mục khác vẫn `Chưa xác minh`.

---

## 5. Nếu kết quả trông "sai"

| Hiện tượng | Giải thích đúng |
| --- | --- |
| Mọi mục `Chưa xác minh` | Chưa có `confirmedPatterns`. Đúng như thiết kế |
| Có mục `Không phát hiện` dù thực thể đang ở trong phòng | Mẫu tên chưa trùng tên thật, **hoặc** instance chưa được nhân bản xuống client |
| `Thấy instance, không đọc được vị trí` | Instance khớp tên nhưng `CFrame`/`GetPivot` không đọc được → radar **không in số** |
| Khoảng cách nhảy loạn | Kiểm tra `Scan.refreshMatchesSeconds`; radar chỉ dùng vị trí đọc được tại thời điểm quét |
| `quét bị cắt ngắn, kết quả có thể thiếu` | Workspace vượt `Scan.maxDescendantsPerFullScan` — tăng lên nếu máy bạn chịu được |
| Không thấy bảng điều khiển | `Ui.enabled = false`, hoặc chưa có `PlayerGui` (Output sẽ nói rõ) |

Mọi hành vi trên đều có test tự động tương ứng — tìm theo mã test trong bảng mục 1.
