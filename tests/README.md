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

Kết quả hiện tại: **119 PASS · 0 FAIL**.

## Cấu trúc

| File | Việc |
|---|---|
| `run.js` | Tạo máy ảo, nạp mock, nạp hub, chạy `tests.lua`, tổng hợp kết quả (exit code 1 nếu FAIL). |
| `roblox-mock.lua` | Giả lập Roblox + executor: `Instance`/event/method, `Vector3/CFrame/UDim2/Color3/Enum…`, `task.wait/spawn/defer`, service (Players, RunService, UserInputService, TweenService, HttpService, TeleportService…), JSON encode/decode, file ảo, API executor (`writefile`, `setclipboard`, `gethui`, `request`…), đồng hồ ảo (`Mock.advance`) và nhân vật mẫu (`Mock.makeCharacter`). |
| `tests.lua` | Các test, chia 4 nhóm: **A** tính năng cũ (chống mất), **B** bộ di chuyển mới, **C** kiểm tra cuối, **D** khung ⚙ tuỳ chỉnh + ngoại lệ, **E** chế độ Chạy Trên Thảm + cụm nút nổi, **F** sửa thảm kính, **G** nhảy/chạy ở mọi game + tốc độ theo game, **H** helper dùng chung sau khi rút gọn code, **I** Chạy Trên Thảm = 'Bay chạy bộ' bản gốc 100%, **J** hết giật/lag khi bật thảm (game nặng), **K** 📍 định vị người chơi (xuyên tường · bạn bè · hạ gục · ⏱ đếm giờ · 📏 khoảng cách), **L** 👣 xem người chơi (bám theo camera — thấy họ đang làm gì), **M** trang 👥 Người Chơi (nằm giữa 📚 Script Hub và ➕ Tạo Tính Năng), **N** ✨ phát sáng (nhân vật mình · rộng + độ sáng + màu). |

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
| 23 | **v4.16** — `math.clamp()` (chỉ có trong Luau) nằm trong hàm tính độ sáng: pcall nuốt lỗi → bật ✨ mà **không thấy gì**. Nay dùng `mvClamp()` của hub (chạy được cả Lua 5.4 lẫn Luau) | N1, N2 |
| 24 | **v4.16** — thêm khung ✨ thứ 2 vào Script Hub thì `CanvasSize` (cũ chỉ cộng 1 khung ⚙) tính thiếu → cuộn hụt hàng thẻ cuối. Nay cộng chiều cao **mọi** khung điều khiển | N8 |
| 25 | **v4.16** — game gỡ luôn GUI của hub → Highlight mồ côi, không hiện. Nay tự treo sang GUI khác đang sống | N9 |
| 22 | **v4.15** — chuyển 2 khung 📍/👣 sang trang 👥 thì các test cũ (K6, L3, L5, L13) vẫn tìm trong danh sách Script Hub → FAIL. Sửa bằng helper `panelOf()` tìm ở trang 👥 trước (giữ luôn khả năng đọc vị trí cũ) | M2, K6, L3 |
| 21 | **v4.14** — đọc trạng thái theo TỪNG FRAME làm nháy chữ (game teleport từng nhịp → "đang chạy" nhảy về "đứng yên" ngay). Nay ghi nhớ mốc thời gian 0,5s/0,9s/0,6s | L4 |

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
