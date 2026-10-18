# 4. Kiểm thử

## 4.1 Điều ĐÃ chạy được ở đây

```bash
npm run check
```

Kết quả thật, ngày 2026-10-18:

| Bước | Lệnh | Kết quả |
| ---- | ---- | ------- |
| Lint tĩnh | `npm run lint` | ✓ Không có vi phạm (36 tệp .luau) |
| Đối chiếu danh mục | `npm run catalog` | ✓ 190 phương pháp khớp mã nguồn thật |
| Cú pháp | `npm run syntax` | ✓ 38 tệp, lỗi: 0 |
| Test tự động | `npm run test` | ✓ đạt 122 / hỏng 0 / tổng 122 |

### 11 bộ test

| Bộ | Số test | Kiểm chứng điều gì |
| -- | ------- | ------------------ |
| `catalog` | 7 | Danh mục khớp mã nguồn: mọi A/B/C có tệp thật + marker, mọi B có test khai id, D/E không trỏ vào tệp nguồn, id không trùng, đủ 10 trường |
| `config` | 13 | Cấu hình, `mode`, bật/tắt nhóm, phân loại thiết bị |
| `cull` | 10 | Tắt ở xa / bật lại khi gần, có trần, không xoá |
| `guard` | 9 | Kiểm tra tồn tại, stale-guard, phân lập lỗi |
| `gui` | 20 | Không menu/nút, cố định dưới-phải, 1–100%, viền cầu vồng hợp lệ, 30 giây, tự huỷ sạch |
| `pipeline` | 18 | Tích hợp toàn luồng: đo, tối ưu đồ họa nhẹ, giữ ánh sáng/bóng, giới hạn hạt, hoàn tác, lỗi |
| `pool` | 8 | Tái sử dụng, không tạo mới khi còn trong pool |
| `registry` | 8 | Ngắt connection, không rò rỉ |
| `safety` | 10 | Không xoá nội dung, lớp được bảo vệ, không có API executor |
| `scheduler` | 9 | Một connection, ưu tiên, chu kỳ riêng, huỷ đúng task |
| `spatial` | 10 | Lưới băm đúng kết quả, ít phép xét hơn quét toàn bộ |

> **Máy ảo Lua 5.3 (fengari) + mock Roblox API — KHÔNG phải Roblox Studio.**
> Nó chứng minh **logic** đúng. Nó **không** chứng minh API Roblox thật hành xử
> giống mock, và **không** tạo ra được bất kỳ con số FPS/RAM/CPU nào.

Chạy một bộ: `npm run test gui`.

## 4.2 Những gì BẠN phải làm trong Roblox Studio

Danh sách này **chưa được thực hiện** — môi trường phát triển không có Roblox Studio.

### Checklist GUI (13 mục)

| # | Kiểm tra | Cách làm | Đạt? |
| - | -------- | -------- | ---- |
| 1 | Bảng xuất hiện ở **góc dưới phải** | Play, nhìn vị trí | ☐ |
| 2 | Góc bo tròn, viền cầu vồng chạy | Quan sát 2–3 giây | ☐ |
| 3 | Nền xám đậm, **bán trong suốt** | Thấy nền game phía sau mờ | ☐ |
| 4 | Chữ tương phản cao, đọc được | Đọc trên nền sáng và nền tối | ☐ |
| 5 | **Không kéo được** | Thử kéo bảng → phải không nhúc nhích | ☐ |
| 6 | **Không có âm thanh** | Bật loa → không tiếng nào | ☐ |
| 7 | Không đẩy/xê dịch GUI khác của game | So sánh trước/sau khi chạy | ☐ |
| 8 | Không chồng lên GUI game ở góc phải dưới | Thử với game có GUI góc phải | ☐ |
| 9 | Phần trăm bắt đầu ở 1%, tăng tới tối đa 100% | Quan sát trong 30 giây | ☐ |
| 10 | Hiện "Đang giảm lag" → "Đã giảm lag xong" | Đọc dòng trạng thái | ☐ |
| 11 | Không có menu/nút bấm; bảng không kéo được | Thử bấm/kéo, bảng không nhận điều khiển | ☐ |
| 12 | **Restart không tạo bảng thứ hai** | `Ctrl+Shift+F5` hoặc Play lại 3 lần | ☐ |
| 13 | Sau khi trượt xuống, bảng **biến mất hẳn** và không xuất hiện lại | Chờ 40 giây | ☐ |

### Checklist hiệu năng (9 mục)

| # | Kiểm tra | Cách làm | Đạt? |
| - | -------- | -------- | ---- |
| 1 | Không có lỗi trong Output | `View` → `Output`, lọc `[RALO]` | ☐ |
| 2 | Không có vòng lặp RenderStepped trùng | Script Profiler → đếm số lần `Scheduler` xuất hiện | ☐ |
| 3 | FPS không tụt khi hệ thống chạy | `View` → `Stats`, so trước/sau | ☐ |
| 4 | Sau Shutdown không còn connection | `RALO.Registry.Stats()` → connections = 0 | ☐ |
| 5 | Sau Shutdown không còn task | `RALO.Scheduler.Stats()` → tasks = 0 | ☐ |
| 6 | GUI đã xoá thật | `RALO.GuiPolicy.CountNodes()` = 0 | ☐ |
| 7 | Chạy 15 phút không tăng bộ nhớ đều đặn | Developer Console → Memory, chụp 3 mốc | ☐ |
| 8 | Đối tượng ở xa bật lại khi lại gần | Đi xa rồi đi lại | ☐ |
| 9 | Hạt/ánh sáng **không bị xoá** | Kiểm tra hiệu ứng còn tồn tại sau khi chạy | ☐ |

### Checklist hoàn tác / gameplay

| # | Kiểm tra | Cách làm | Đạt? |
| - | -------- | -------- | ---- |
| 1 | `Restore()` trả đồ hoạ về nguyên bản | `RALO.Restore()` rồi xem Lighting.QualityLevel | ☐ |
| 2 | **Không đè** thay đổi mới hơn của game | Đổi QualityLevel sau khi chạy, rồi Restore → giá trị mới phải còn | ☐ |
| 3 | Respawn không sinh lỗi | Chết rồi hồi sinh 5 lần | ☐ |
| 4 | Đổi khu vực không sinh lỗi | Dịch chuyển giữa các vùng | ☐ |
| 5 | Xoá đối tượng giữa chừng không sập | Xoá một Part đang được quét | ☐ |
| 6 | Gameplay không đổi | Chơi thử toàn bộ tính năng chính | ☐ |
| 7 | Map/nhân vật/vật phẩm còn nguyên | Đối chiếu trước/sau | ☐ |
| 8 | Bật/tắt từng nhóm đều chạy được | Đổi từng nhóm rồi Play | ☐ |
| 9 | `enabled = false` thì không làm gì | Đặt `enabled = false` rồi Play | ☐ |

## 4.3 Quy trình khi phát hiện lỗi

1. Chép **nguyên văn** thông báo từ Output.
2. Ghi điều kiện: `mode`, nhóm bật/tắt, đang làm gì.
3. Tái hiện tối thiểu được.
4. Tìm trong `docs/06-bao-cao-test-loi.md` xem đã gặp chưa.
5. Nếu chưa — đó là lỗi mới, báo theo mẫu ở mục 3.6.

**Không được** bỏ qua lỗi, tắt kiểm tra, hay thu hẹp phạm vi test để "cho xong".
