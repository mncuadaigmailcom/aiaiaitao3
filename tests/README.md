# Bộ test tự động — Banana Cat Hub

Nạp và **chạy thật** `script.js` ngay trong Node: máy ảo Lua 5.4 ([wasmoon](https://github.com/ceifa/wasmoon))
+ môi trường Roblox/executor giả lập (`roblox-mock.lua`). Nhờ vậy test kiểm tra được **hành vi**
(bấm nút có ăn không, thảm có đúng kích thước không, respawn có bật lại không…), không chỉ cú pháp.

## Chạy

```bash
cd tests
npm install          # chỉ cần 1 lần (tải wasmoon ~550 KB)
node run.js ../script.js            # chạy tất cả
node run.js ../script.js noclip     # chỉ chạy test tên có chữ "noclip"
```

Kết quả hiện tại: **194 PASS · 0 FAIL**.

## Cấu trúc

| File | Việc |
|---|---|
| `run.js` | Tạo máy ảo, nạp mock, nạp hub, chạy `tests.lua`, tổng hợp kết quả (exit code 1 nếu FAIL). |
| `roblox-mock.lua` | Giả lập Roblox + executor: `Instance`/event/method, `Vector3/CFrame/UDim2/Color3/Enum…`, `task.wait/spawn/defer`, service (Players, RunService, UserInputService, TweenService, HttpService, TeleportService…), JSON encode/decode, file ảo, API executor (`writefile`, `setclipboard`, `gethui`, `request`…), đồng hồ ảo (`Mock.advance`) và nhân vật mẫu (`Mock.makeCharacter`). |
| `tests.lua` | Các test, chia 4 nhóm: **A** tính năng cũ (chống mất), **B** bộ di chuyển mới, **C** kiểm tra cuối, **D** khung ⚙ tuỳ chỉnh + ngoại lệ, **E** chế độ Chạy Trên Thảm + cụm nút nổi, **F** sửa thảm kính, **G** nhảy/chạy ở mọi game + tốc độ theo game, **H** helper dùng chung sau khi rút gọn code, **I** Chạy Trên Thảm = 'Bay chạy bộ' bản gốc 100%, **J** hết giật/lag khi bật thảm (game nặng), **K** 📍 định vị người chơi (xuyên tường · bạn bè · hạ gục · ⏱ đếm giờ · 📏 khoảng cách), **L** 👣 xem người chơi (bám theo camera — thấy họ đang làm gì), **M** trang 👥 Người Chơi (nằm giữa 📚 Script Hub và ➕ Tạo Tính Năng), **N** ✨ phát sáng (nhân vật mình · rộng + độ sáng + màu), **O** 🛡 bay an toàn (tự bay + né vật chuyển động), **P** 🔲 khiên trong suốt · 👤 né người chơi · 🧱 đẩy xuyên vật cản, **Q** 👁 bắt vật LAO TỚI mình từ ngoài 📏 + ⭕ tự bay vòng tròn khi không có gì lao tới, **R** 👾 boss/nextbot gí mình (instance kiểu game thật · né theo MẶT vật · nhớ hướng né · soi nguồn chống lỗi mock-only), **S** 🎯 định vị tốc độ (mặc định game · hiện tại · cao nhất + HUD nổi · chỉ ĐỌC nên không phá tính năng khác), **T** 🧱 xuyên tường "cứng" (thắng game bật lại CanCollide mỗi frame) + 🧲 tự đẩy xuyên khi bị chặn cứng. |

## Cách test đọc được biến `local` của hub

`S`, `D`, `Store`, `scripts`… là biến `local` trong chunk chính của hub, nên chunk khác không thấy.
`run.js` nối thêm một đoạn **TEST HOOK** vào cuối nguồn trước khi nạp (không bao giờ ghi vào file gốc):

```lua
_G.__HUBTEST = { S = S, D = D, Store = Store, scripts = scripts, ... }
```

Vì đoạn này nằm **trong cùng chunk**, nó nhìn thấy mọi `local`.

> ⚠️ Lưu ý khi viết test: `Store.load()` **gán lại** local (`scripts = sOut`), nên mọi tham chiếu lấy
> từ `__HUBTEST` trước đó sẽ cũ. Dùng `H.getScripts()` / `H.getWaypoints()` thay vì `H.scripts`.

## Những lỗi mà bộ test đã bắt được (v4.12)

| # | Lỗi | Test bắt |
|---|---|---|
| 1 | 3 công tắc header 🧩/🕵/🪟 chết vì closure đứng trước `local S` (v4.11 sửa chưa xong) | A10, C1 |
| 2 | `function BcFit()` thiếu `local` → rò rỉ global `_G.BcFit` | A11, D9 |
| 3 | Gán **số** vào thuộc tính `Text` (`flyIn.Text = S.Move.flySpeed`) → Roblox báo `string expected, got number`, bấm ✔ không ăn | D1, D2 |
| 4 | `trackConn()` giữ mãi connection của thẻ đã Destroy → mỗi lần lọc/tìm kiếm phình thêm hàng trăm phần tử | D10 |
| 5 | `MV.Refresh()` dựng lại thảm vô điều kiện sau respawn → làm mất tham chiếu thảm đang dùng (sửa: chỉ dựng lại khi thật sự mất) | B10, B12 |
| 6 | (mock) `CFrame`/`Position` không nối với nhau → test đọc sai vị trí | — |
| 7 | Thảm `Transparency = 0.9` gần như tàng hình → người dùng "bật mà không thấy thảm" | E2 |
| 8 | Bật/tắt chế độ chạy để lại cờ BẬT → test sau gọi `action()` lại TẮT nhầm (sửa test: `cleanStart()`) | E2, E5 |
| 9 | **Thảm chỉ giữ người trên mặt khi bật Xuyên Tường** → bật thảm một mình thì rơi xuyên xuống đất (lỗi chính làm thảm vô dụng) | F2 |
| 10 | Thảm mặc định chìm 3 studs dưới đất → "bật mà không thấy thảm" (nay sát chân, có ô chỉnh khoảng cách) | F1, F4 |
| 11 | Thảm trong suốt khó nhìn → thêm viền `SelectionBox` (là con của thảm, tự dọn khi tắt) | F1, F5 |
| 12 | Nhảy vô hạn LIỆT ở game ăn `JumpRequest` / để `JumpPower=0` / phớt lờ `ChangeState` → nhảy bằng 3 cách + ép JumpPower/JumpHeight + nghe thêm `InputBegan` | G1, G2, G3 |
| 13 | Tốc độ chạy ÉP CỨNG 50 → lúc quá nhanh lúc quá chậm tuỳ game → mặc định mới: **tốc độ game × 3**, tự theo khi game đổi | G4, G5 |
| 14 | Game/anti-cheat xoá thảm, trả lại WalkSpeed, đổi JumpPower → vòng canh gác 0.3s dựng lại + thảm né sang Camera sau 3 lần bị xoá | G6, G8 |
| 15 | **Lỗi lọt khi gộp code (v4.12.3)**: nút 📋 "Sao Chép Code" để lại chữ "✅ Đã Sao Chép!" vĩnh viễn — gộp 3 nhánh clipboard làm 1 đã xoá nhầm nhánh `setclipboard` | H1, H3 |
| 16 | **Bật thảm bị GIẬT/LAG ở game nặng (Evade)**: mỗi frame đều ghi `CFrame` + xoá vận tốc của nhân vật -> đánh nhau với vật lý game. Nay chỉ đỡ khi lún quá 0.5 stud, và có công tắc tắt hẳn | J1–J4 |
| 17 | **(hub, tự phát hiện khi port sang)** `task.wait()` nằm TRONG handler `CharacterAdded` → game phải chạy thêm luồng, có game nuốt luôn event; nay dựng nhãn ngay + vòng lặp 0.2s tự bù | K9, C1 |
| 18 | **(mock)** không có cách thêm/bớt người chơi khác → không test được tính năng nhiều người. Đã thêm `Mock.addPlayer` / `Mock.removePlayer` / `Mock.setChar` | K1–K10 |
| 19 | **v4.14** — ⏱ đếm giờ hạ gục chỉ chạy khi 📍 Định Vị bật: bật 👣 một mình thì đồng hồ đứng ở `00:00`. Nay 📍 và 👣 dùng chung `S.Loc.NoteDown` | L4 |
| 20 | **v4.14** — người đang xem biến mất hẳn khỏi `Players` (không bắn `PlayerRemoving`) → camera **kẹt** ở `Scriptable` (chuột không quay được). Nay tự chuyển/tự thoát + trả camera | L14 |
| 28 | **v4.18** — hàm quét NGƯỜI CHƠI trả `nearest = nil` khi server không có người chơi → **xoá mất khoảng cách gần nhất của vật**, phần "quá gần thì vọt lên" chết | O2, O11 |
| 29 | **v4.18** — thêm 1 biến `local` nữa vào main chunk → vượt **trần 200 local** của Luau (`too many local variables`) làm hub KHÔNG NẠP ĐƯỢC. Nay khối 🛡 nằm trong `do ... end` | (nạp hub) |
| 30 | **v4.19** — 👁 tính "tốc độ lao vào nhau" **cộng cả vận tốc của MÌNH** → vật **ĐỨNG YÊN** ngay trước mặt cũng bị coi là lao tới, 🛡 đẩy mình tránh vô cớ. Nay chỉ tính vận tốc **của vật**; mình bay tới nó chỉ làm lực đẩy mạnh thêm | O3, P5 |
| 31 | **v4.19** — trạng thái vẫn ghi "⭕ bay vòng tròn" trong khi đang **bấm WASD** (thực tế ⭕ đã tạm dừng) → người dùng tưởng tính năng chạy sai. Nay ghi rõ "⭕ tạm dừng (đang bấm phím)" | Q5 |
| 32 | **(mock)** `CFrame.lookAt()` luôn cho `LookVector = (0,0,-1)` (thiếu nhánh `cf(Vector3, lookVector)`) → camera giả không bao giờ có hướng như test đặt, các test hướng bay của 🛡 vô tình đúng nhờ lỗi này. Nay giữ đúng hướng + `cleanSafe()` trả camera về mặc định để kết quả **tất định** | O3, P4, Q1–Q6 |
| 33 | **v4.20** — 🔴 **LỖI CHỈ XẢY RA TRONG GAME THẬT**: hàm nhận diện part đòi `type(d) == "table"`, mà trong Roblox instance là **userdata** (chỉ trong máy giả lập instance mới là bảng) → 🛡 **không bao giờ thấy part nào**, chỉ thấy người chơi → **boss/nextbot gí mình mà không né**. Nay dùng `d:IsA("BasePart")` | R0, R1–R8 |
| 34 | **v4.20** — 🔴 "né theo **vị trí dự đoán**" khi vật đã **gí sát**: điểm dự đoán (vị trí + vận tốc × 0,35s) lố ra **sau lưng** mình → lực đẩy hoá ra đẩy mình **bay thẳng VÀO vật**. Nay nếu điểm dự đoán ở phía bên kia mình thì né theo vị trí HIỆN TẠI | R3 |
| 35 | **v4.20** — boss/nextbot **TO**: đo khoảng cách tới **TÂM** part nên part 30 studs phải chờ tâm vào 📏 mới né (đã chạm từ lâu). Nay đo tới **MẶT** vật (kẹp 75% 📏) + boss đuổi theo thì 🛡 "quên" ngay khi nó ra khỏi tầm quét (nay nhớ hướng né ~0,9s) | R2, R4, R7 |
| 36 | **v4.20** — 👤 tắt rồi mà part của người chơi khác vẫn bị coi là "vật có Humanoid đang đi" → vẫn né người; và NPC đứng yên (WalkSpeed 16, MoveDirection 0) cũng bị né bừa. Nay part người chơi khác do phần 👤 quyết định, chỉ tin **MoveDirection** | P5, R6 |
| 26 | **v4.17** — **lực né viết NGƯỢC DẤU** (cộng hướng-tới-vật thay vì trừ) → bật 🛡 Bay An Toàn thì bị **HÚT VỀ PHÍA** vật chuyển động thay vì né | O2, O4, O6, O8 |
| 27 | **v4.17** — test lọc chip đếm cứng "5 thẻ" → thêm thẻ mới là gãy giữa chừng, **để lại bộ lọc chip đang bật** → hàng loạt test sau báo sai (lỗi lây lan). Nay đếm động + `resetChip()` trước mỗi test | B3, D8, K11, L1, M5, N1 |
| 23 | **v4.16** — `math.clamp()` (chỉ có trong Luau) nằm trong hàm tính độ sáng: pcall nuốt lỗi → bật ✨ mà **không thấy gì**. Nay dùng `mvClamp()` của hub (chạy được cả Lua 5.4 lẫn Luau) | N1, N2 |
| 24 | **v4.16** — thêm khung ✨ thứ 2 vào Script Hub thì `CanvasSize` (cũ chỉ cộng 1 khung ⚙) tính thiếu → cuộn hụt hàng thẻ cuối. Nay cộng chiều cao **mọi** khung điều khiển | N8 |
| 25 | **v4.16** — game gỡ luôn GUI của hub → Highlight mồ côi, không hiện. Nay tự treo sang GUI khác đang sống | N9 |
| 22 | **v4.15** — chuyển 2 khung 📍/👣 sang trang 👥 thì các test cũ (K6, L3, L5, L13) vẫn tìm trong danh sách Script Hub → FAIL. Sửa bằng helper `panelOf()` tìm ở trang 👥 trước (giữ luôn khả năng đọc vị trí cũ) | M2, K6, L3 |
| 21 | **v4.14** — đọc trạng thái theo TỪNG FRAME làm nháy chữ (game teleport từng nhịp → "đang chạy" nhảy về "đứng yên" ngay). Nay ghi nhớ mốc thời gian 0,5s/0,9s/0,6s | L4 |

## 👁 & ⭕ test thế nào (v4.19)

Máy giả lập **không có vật lý** (part chỉ nhúc nhích khi test tự đổi vị trí), nên:

- **"vật lao tới mình"**: đặt `part.AssemblyLinearVelocity = Vector3.new(-30, 0, 0)` — vận tốc ≠ 0 là đủ
  để 👁 tính `tHit = (khoảng cách − 0,35×📏) / tốc độ lao vào` và coi là mối nguy khi `tHit ≤ 👁 giây`.
  Muốn "vật bay RA XA" thì đảo dấu vận tốc.
- **vật đứng yên** (để chắc chắn KHÔNG né): `part.AssemblyLinearVelocity = Vector3.new(0, 0, 0)`.
- **⭕ vòng tròn**: `_ang` phải tăng và hướng vận tốc phải đổi — kiểm tra bằng `qdot(v1, v2) < 0,999`
  (mock không có `Vector3:Dot`, tests.lua có hàm `qdot`).
- **camera**: 🛡 bay theo hướng camera khi không bấm phím, nên `cleanSafe()` trả camera về `CFrame.new(0, 10, 0)`
  (nhìn −Z) để kết quả **tất định** giữa các test. `CFrame.lookAt()` của mock nay giữ đúng LookVector.
- **WASD**: `hum().MoveDirection = Vector3.new(0, 0, -1)` (bấm) / `Vector3.new(0, 0, 0)` (nhả).

## 👾 Test "boss gí mình" (nhóm R) — và bài học mock vs game thật

Máy giả lập tạo instance bằng **bảng Lua**, còn Roblox thật trả instance là **userdata**
(`type(part) == "userdata"`). Vì vậy code viết kiểu `if type(d) == "table"` **chạy đúng trong test mà
chết trong game thật** — đúng lỗi làm 🛡 Bay An Toàn không né boss/nextbot ở Evade (chỉ né người chơi).

Cách bộ test chống lại:

- `Mock.addRealPart{ pos=..., vel=..., size=..., name=... }` tạo part **"kiểu instance thật"**: bảng
  KHÔNG có dấu hiệu riêng của mock (`__isInstance`), chỉ có `IsA/Position/Size/AssemblyLinearVelocity…`
  → nếu hub lại đòi `type(d) == "table"` thì các test R1–R8 **FAIL** ngay.
- `R0` soi thẳng **nguồn** `script.js` (run.js đưa nguồn sang Lua qua `_G.__HUBSRC`): cấm
  `sfIsPart` dùng `type(d) ~= "table"` và buộc nhận part qua `IsA("BasePart")`.
- `GetPartBoundsInRadius` của mock giờ giống engine hơn: xét **bao lồi** (bounding box), tôn trọng
  `OverlapParams` (`MaxParts`, `FilterType`, `FilterDescendantsInstances`) và trả cả `Mock.realParts`.

Viết test mới cho nhóm này: `Mock.clearRealParts()` (đã có trong `cleanSafe()`), tạo boss bằng
`Mock.addRealPart{...}`, đổi vận tốc bằng `boss.AssemblyLinearVelocity = Vector3.new(...)`.

## 🎯 Test "định vị tốc độ" (nhóm S) — v4.21

Tính năng 🎯 trong tab 🛠 Hỗ Trợ phải **thấy được bằng mắt**: vừa có widget trong tab, vừa có HUD nổi
`BC_SpeedHud` trong màn hình game (đóng menu vẫn thấy). Nhóm S kiểm tra đúng 3 con số mà người dùng cần:

| Số | Lấy từ đâu | Test |
|---|---|---|
| 🎯 **mặc định game** | `S.Move._baseWS` nếu 👟 đã học; không thì `Humanoid.WalkSpeed` lúc bật; tự học lại khi game đổi | S3, S7, S10 |
| ⚡ **hiện tại** | quãng đường đi được mỗi frame ÷ thời gian (studs/s), làm mượt 0,35 — đúng với mọi game | S4, S8, S11 |
| 🏁 **cao nhất** | đỉnh đo được trong phiên; bỏ mẫu > 25 studs/frame (teleport/respawn/lag đứng hình) | S5, S6 |

Vài điểm đáng chú ý:

- **Bấm nút thật**: S3/S5 dùng `Mock.click(m.btn)` / `Mock.click(m.resetBtn)` để chạy đúng đường
  `Activated` → `SV.Set` chứ không gọi hàm tắt.
- **Không phá tính năng khác**: S1 kiểm tra 🎯 nằm **cùng tab** với 🎯 Phân Tích Vật Thể
  (`m.btn.Parent == S.AnaUi.devLbl.Parent`) và tab vẫn còn Dex/SimpleSpy/Waypoint; S8 bật 🛡 sau khi
  dùng 🎯; S9 respawn (nhân vật mới) rồi chạy tiếp; C1 bắt mọi lỗi runtime của render step.
- **S2 soi thẳng nguồn** `script.js` (`_G.__HUBSRC`): khối 🎯 **không được** chứa `WalkSpeed =`,
  `JumpPower =`, `CFrame = ` — tức là chỉ ĐO, không thể làm lệch tốc độ của 👟/game.
- **S7 là ca dễ sai nhất**: khi 👟 đang áp ×3 (WalkSpeed = 48), 🎯 phải hiểu mặc định là **16** chứ
  không phải 48 (nhãn còn ghi "×3.00 mặc định").
- **S6 chống số ảo**: teleport 495 studs trong 1 frame không được nhảy vào 🏁.
- **Mutation check** (đã chạy): cố tình bỏ ưu tiên `_baseWS` khi 👟 đang bật → S7 FAIL; cố tình cho
  `max = live` → S5, S6 FAIL. Tức là các test này thật sự bắt lỗi, không phải test cho có.

## 🧱 Test "xuyên tường cứng" + 🧲 tự đẩy xuyên (nhóm T) — v4.22

Người dùng báo: *"một số tựa game hoặc bức tường mình không thể xuyên tường được"*. Nguyên nhân thật
(không phải hub quên bật): **một số game/anti-cheat BẬT LẠI `CanCollide` cho part của người chơi mỗi
frame**, còn hub cũ chỉ quét lại **2 giây/lần** → thua, người chơi vẫn kẹt ở tường.

| Việc | Cách làm mới | Test |
|---|---|---|
| Thắng game bật lại CanCollide | ghi `CanCollide = false` **mỗi frame** (chỉ trên part của mình) + quét đầy đủ 0,5s/lần | T1, T2, T7 |
| Ghi **sau cùng** trong frame | thêm lớp `BindToRenderStep("BC_NoClip", Enum.RenderPriority.Last.Value, …)` | T1, T10 |
| Game chặn CỨNG (tắt va chạm vẫn không qua) | 🧲 tự nhích `CFrame` theo hướng đang bấm, chỉ khi kẹt > 0,2s | T4, T5, T6 |
| Không phá gì | chỉ part trên người mình; tắt 🧱 là trả lại **đúng** `CanCollide` gốc | T3, T8, T9 |

Cách bộ test mô phỏng "game chống xuyên tường": gọi thẳng `p:CanCollide = true` cho mọi part rồi
`Mock.advance(1/60)` — **đúng 1 frame** — và đòi hub phải tắt lại ngay trong frame đó, lặp 40 lần.
Trong mock không có vật lý nên nhân vật KHÔNG tự nhích khi bấm WASD — đó chính là "bị chặn cứng",
nhờ vậy test được 🧲 một cách xác định (T4), và T6 giả lập "game cho đi bình thường" bằng một render
step tự dịch nhân vật 1 stud/frame để chắc rằng 🧲 **không** đẩy thêm.

**Mutation check** (đã chạy để chứng minh test có giá trị):
- quay lại hành vi cũ (quét 2 giây/lần, không ép mỗi frame) → **T1, T2, T7 FAIL**;
- cho `MV.Refresh()` xoá trắng bảng giá trị gốc như bản cũ → **T3 FAIL**;
- bỏ `local pcBtn` khai báo trước hàm vẽ → 6 test đỏ vì `attempt to index a nil value`.

## 🛡 Test "sống qua hết trận / sang trận mới" + 🔲 khiên cỡ hợp lí (nhóm U) — v4.23

Người dùng báo 2 việc: (1) *"chơi xong trận rồi chuyển sang trận mới thì tính năng bay an toàn không
hoạt động nữa"*, (2) *"chỉnh lại hình vuông bao quanh mình cho kích thước hợp lí"*.

**Lỗi thật (1):** 🛡 không có vòng lặp riêng — nó chỉ được gọi ở **cuối vòng lặp 🚀 Bay**
(`if MV.Safe and MV.Safe.on then MV.Safe.Step()`). Sang trận mới, `BodyVelocity "BC_FlyVel"` chết theo
nhân vật cũ (hoặc **còn dính** nhân vật cũ nếu game không xoá ngay) → vòng lặp Bay thoát ngay ở dòng
đầu `if not MV.fly or not curR or not MV._bv then return end` → 🛡 im lặng vĩnh viễn.

| Việc | Cách làm mới | Test |
|---|---|---|
| 🛡 không chết theo 🚀 Bay | vòng lặp RIÊNG `BindToRenderStep("BC_Safe", …)`, bật thì gắn, tắt thì gỡ | U5, U8 |
| Đổi trận / respawn | `Step` so `SF._root` với nhân vật hiện tại: khác là quên dữ liệu trận cũ + dựng lại khiên | U1, U3, U11 |
| Part bay còn dính nhân vật CŨ | soi `_bv.Parent == HRP hiện tại` (không chỉ khác `nil`) → dựng lại | U2, U3 |
| Game tự đổi nhân vật mà không bắn `CharacterAdded` | tự chữa lành **trong ~1 frame** + watchdog 0,3s gắn lại vòng lặp nếu game gỡ | U3, U11, U5 |
| Anti-cheat xoá part bay / 1 vách khiên | thấy mất là dựng lại (khiên kiểm tra **cả 4 vách**, không chỉ vách 1) | U4 |
| 🔲 cỡ khiên | mặc định **ôm sát nhân vật** (~5,2 stud/cạnh, cao ~8), 📏 Né **chỉ còn là khoảng cách né**; ô 🔲 Cỡ (0 = tự động) để chỉnh tay | P1, P2, U6, U7 |

**Mutation check** (đã chạy để chứng minh test có giá trị):
- bỏ phần tự chữa lành của `Step` → **U11 FAIL**; bỏ **tất cả** đường chữa lành (quay lại v4.22) →
  **U2, U3, U4, U5, U11 + O8 FAIL**;
- bỏ watchdog dựng lại vòng lặp 🚀 Bay → **U5 FAIL**;
- trả cỡ khiên về "cạnh = 📏 × 2" → **P1, P2 FAIL**;
- không gắn / không gỡ vòng lặp riêng → **U5, U8, U10 FAIL**.

## 🔲 Test "khiên quay vòng tròn" + 🛡 đứng im là tự lượn (nhóm V) — v4.24

Người dùng báo: *"khi đứng im thì nhân vật mình sẽ tự động bay hình vòng tròn và hình vuông quanh mình
cũng bay hình vòng tròn"*.

- **Nhân vật đứng im -> tự lượn vòng** đã có từ v4.19 (⭕ Vòng tròn: không bấm WASD + quanh đây không có
  mối nguy -> bay vòng quanh chỗ đang đứng). V1 khoá lại hành vi này **kể cả sau khi đổi trận**, và kiểm
  tra bấm WASD thì nhường quyền cho người chơi.
- **Cái hình vuông quanh mình giờ cũng quay vòng**: 4 vách xoay quanh trục dọc của mình; khi đang bay
  vòng tròn thì quay **cộng thêm đúng tốc độ vòng bay** (`SF._circleRate`) -> nhìn như cả "cái hộp" cũng
  đang bay vòng quanh mình. Nút **🔲 Quay: BẬT/TẮT** + ô **Tốc** (°/giây, mặc định 60, 0 = không quay).

| Việc | Cách làm | Test |
|---|---|---|
| Khiên quay quanh mình | xoay vị trí 4 vách: `(x,z) -> (x·cosθ + z·sinθ, −x·sinθ + z·cosθ)` + `CFrame.Angles(0, θ, 0)` | V2, V5 |
| Quay đúng tốc độ | θ += `math.rad(dt · °/giây)` (lần đầu code cộng thẳng ĐỘ vào biến radian -> quay nhanh 57 lần, **V3+V5 bắt được**) | V3, V5 |
| Không phá hình vuông | 4 vách vẫn cách tâm đúng nửa cạnh, vẫn 2 dài X + 2 dài Z, cỡ không đổi khi quay | V2 |
| Tắt là trả về như cũ | 🔲 Quay TẮT -> góc về 0 (vuông góc trục) rồi đứng hướng, bật lại quay tiếp | V3 |
| Đổi trận | khiên quay vẫn theo nhân vật mới + tắt 🛡 là dọn sạch | V4 |
| Không mất tính năng | đủ nút/ô (7 ô nhập), canvas đủ chỗ, thẻ/khung/HUD còn, công tắc cũ vẫn ăn | V6 |

**Sửa luôn 2 chỗ trong MOCK** để test loại này chạy được (mock không có hình học thật):
`CFrame.new(...) * CFrame.Angles(...)` trước đây **bỏ qua phép nhân và bỏ qua góc** (vì `__name` nằm
trong metatable nên `b.__name` đọc ra `nil` -> rơi về nhánh "trả về a"). Nay `__name` là **trường thật**,
phép nhân CFrame cộng góc xoay, và `CFrame.Angles(x, y, z)` / `ToOrientation()` / `GetComponents()` mô
phỏng **xoay quanh trục dọc** — đủ để test 🔲 khiên quay (và không đổi hành vi nào khác: 194 test cũ vẫn
xanh). Giống bài học nhóm R: mock mà bỏ qua tham số thì test sẽ "xanh giả".

**Mutation check** (đã chạy):
- không cập nhật góc quay -> **V2, V3, V4, V5, V6 FAIL**;
- cộng ĐỘ vào biến radian (đúng lỗi đã mắc) -> **V3, V5 FAIL**;
- quay nhưng không xoay vách -> **V2…V6 FAIL**;
- bỏ chế độ bay vòng tròn khi đứng im -> **Q3, Q5, Q6, V1 FAIL**.

## Thêm test mới

Thêm vào `tests.lua`:

```lua
test("Tên test", function()
    local ch = resetChar()        -- nhân vật mới
    action("fly")                 -- gọi S.RunHubAction("fly")
    Mock.advance(0.1)             -- chạy 0.1 giây (task + RenderStepped/Stepped)
    eq(S.Move.fly, true, "cờ bay")
end)
```

Hàm có sẵn: `eq/nok/near/truthy/falsy`, `resetChar()`, `action(id)`, `card(name)`, `cards()`,
`findByClass(parent, cls)`, `runBtnOf(card)`, `Mock.click(inst)`, `Mock.fire(inst, event, ...)`,
`Mock.key(code, true/false)`.
