# Test của Banana Cat Hub (chạy **ngoài** Roblox)

Vì hub là 1 file Luau chạy trong executor, không có cách test "thật" ở đây. Bù lại, bộ test này
**trích code trực tiếp từ file hub** rồi chạy trong VM Lua 5.3 (fengari) với một Roblox giả lập,
nên nó bắt được đúng các lỗi làm người dùng "không quay chuột / không bắn được":

| Test | Check gì |
|---|---|
| `check_syntax.js` | Toàn bộ file còn là Lua/Luau hợp lệ sau khi sửa (có `+=` của Luau nên phải tiền xử lý) |
| `test_logic.lua` | `S.SanitizeCode` vô hại hoá wrapper độc hại bản cũ; wrapper **mới** chạy trong Roblox giả lập mà **không đụng GUI của game**; `MaskKey`, `ParseSegments`, công thức co giãn |
| `test_embed.lua` | Khối nhúng GUI **thật** (trích từ file): mượn frame con, **không Destroy ScreenGui gốc**, trả GUI về nguyên trạng, `Enabled` phản chiếu, prune host chết, `ScanNewGuis` không ăn UI của game, 🧩 TẮT = không đụng gì |

## Chạy

```bash
cd tests
npm install          # fengari + luaparse
npm test             # trích khối -> check cú pháp -> test logic -> test nhúng GUI
```

`extract_blocks.py` cắt các khối từ `../aiaiaitao3`; nếu bạn đánh tên file hub khác, sửa biến `HUB`
trong file đó. Vì test chạy trên code trích, **sửa hub xong chỉ cần `npm test` là biết có vỡ không**.

## Khi nào cần chạy lại

- Sửa bất kỳ chỗ nào của khối `v4.4b — NHÚNG GUI` / `ScanNewGuis` / `ForceStretchToParent` /
  `RunFeatureScript` / nút `📏 Code Tự Co Giãn`.
- Thêm rule mới cho `GAME_OWNED_GUI_NAMES`.
