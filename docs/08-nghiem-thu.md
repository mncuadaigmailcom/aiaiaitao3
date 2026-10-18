# 8. Đối chiếu 12 tiêu chí nghiệm thu

Mỗi tiêu chí được đánh dấu: **Đạt** (đã kiểm chứng bằng lệnh chạy được ở đây),
**Một phần** (làm được phần tĩnh, phần chạy thật chưa làm), hoặc **Chưa đạt**
(chưa làm được, kèm lý do). Không tiêu chí nào được đánh "Đạt" chỉ vì mã trông đúng.

| # | Tiêu chí | Đánh giá | Căn cứ |
| - | -------- | -------- | ------ |
| 1 | Mã nguồn và cấu trúc đầy đủ | **Đạt** | 36 tệp `.luau`, 9.246 dòng. `npm run syntax` → `38 tệp, lỗi: 0`. Cây thư mục ở [02](02-cau-truc-vai-tro-tep.md). Không module nào thiếu: `catalog.test.js` bắt mọi mục A/B/C phải trỏ tới một tệp **tồn tại thật**. |
| 2 | Hướng dẫn kiểm chứng được | **Một phần** | Toàn bộ lệnh `npm run ...` chạy được và đã chạy. Phần cài vào Studio ([03](03-cai-dat-va-cau-hinh.md)) **chưa được thực thi** vì không có Studio. |
| 3 | GUI hoạt động trong môi trường đã test | **Một phần** | `gui.test.js` 16/16 đạt: không trùng lặp, không kéo được, không âm thanh, phần trăm ≤ 100, tự huỷ sạch. **Chưa** thấy GUI thật trên màn hình Studio. |
| 4 | Cơ chế bật/tắt và hoàn tác | **Đạt** (mức harness) | `config.test.js` 13/13, `pipeline` CFG-001 + RESTORE-001/002/003 + REC-002 đạt. |
| 5 | Kết quả test trung thực | **Đạt** | Bảng ở [06](06-bao-cao-test-loi.md) chỉ khai "Đạt" cho test **đã chạy thật**, kèm lệnh tái tạo. Mục chưa làm được ghi rõ là "Chưa làm". |
| 6 | Không có lỗi nghiêm trọng bị giấu | **Đạt** | 13 lỗi tìm thấy đều được ghi trong bảng ở 6.2 kèm nguyên nhân gốc. Lỗi nghiêm trọng nhất (BUG-04 làm vô hiệu danh sách lớp bảo vệ) được nêu bật, không che. |
| 7 | Lỗi tìm thấy đã sửa + test hồi quy | **Đạt** | Mỗi dòng trong bảng 6.2 có cột "Kết quả test lại". `npm run check` chạy lại toàn bộ sau mỗi lần sửa → 115/115. |
| 8 | Không xoá tính năng gameplay để lấy hiệu năng | **Đạt** | `SAFE-005`: 7 module đụng nội dung game **không có** lệnh `:Destroy(` nào. `SAFE-007`: `:Destroy(` chỉ được phép ở 6 module quản lý tài nguyên hệ thống. Đây là test tĩnh trên mã thật, không phải tuyên bố. |
| 9 | Phân loại phương pháp đúng | **Đạt** | `verify-catalog.js` kiểm bằng máy: B phải có test khai id; D/E không được trỏ vào tệp nguồn; id không trùng; đủ 10 trường. Kết quả: `✓ không có khai khống`. |
| 10 | Đo trước/sau khi có thể hỗ trợ | **Chưa đạt** | Không đo được. **Không có con số nào được công bố.** Quy trình tự đo ở [07](07-do-luong-hoan-tac.md). |
| 11 | Công bố mọi giới hạn test | **Đạt** | Mục 6.4 liệt kê 7 mục chưa kiểm chứng kèm lý do và cách bạn tự kiểm. |
| 12 | Không tuyên bố FPS/RAM chưa kiểm chứng | **Đạt** | Không có con số hiệu năng nào trong toàn bộ tài liệu và mã nguồn. `Measure.Run` đặt `available = false` thay vì tổng hợp số. Test `MEAS-003/007` khoá hành vi này. |

**Tổng: 9 Đạt · 2 Một phần · 1 Chưa đạt.**

## 8.1 Điều chưa đạt duy nhất — tiêu chí 10

Không phải vì bỏ qua. Vì:

- Không có GPU trong môi trường phát triển.
- Không có thiết bị thật (điện thoại, máy yếu) để so sánh.
- Không có Roblox Studio để đọc `View → Stats`.

Trong điều kiện đó, **bất kỳ con số nào cũng sẽ là bịa**. Lựa chọn là công bố số bịa
hoặc công bố "chưa đo được" kèm cách đo. Dự án chọn cách thứ hai.

## 8.2 Giới hạn lớn nhất của toàn bộ báo cáo

> **Trạng thái B trong danh mục nghĩa là "đã kiểm thử trong harness Lua 5.3",
> KHÔNG phải "đã chạy trong Roblox Studio".**

Nếu định nghĩa gốc của B bắt buộc phải là chạy trong game thật, thì theo định nghĩa
đó **toàn bộ 90 mục B nên đọc là C**, và 0 mục đạt B. Báo cáo giữ nhãn B kèm lời
khai báo này ở mọi nơi nó xuất hiện, để bạn không đọc nhầm thành "đã chạy trong game".

Đây là điểm duy nhất mà nhãn trong báo cáo **không** khớp với định nghĩa gốc của yêu
cầu, và nó được nói rõ thay vì để bạn tự phát hiện.

## 8.3 Việc bạn cần làm để đóng phần còn lại

1. Cài theo [03](03-cai-dat-va-cau-hinh.md) (Rojo hoặc dán bundle).
2. Làm checklist 12 mục GUI + 9 mục hiệu năng + 9 mục hoàn tác ở [04](04-kiem-thu.md).
3. Đo theo [07](07-do-luong-hoan-tac.md), điền vào bảng trống.
4. Bất kỳ mục nào hỏng → báo theo mẫu ở 3.6, kèm nguyên văn Output.

Sau bước 2–3, những mục nào đạt mới được phép nâng lên "đã kiểm thử trong game".
Cho tới lúc đó, mọi mục vẫn ở mức harness.
