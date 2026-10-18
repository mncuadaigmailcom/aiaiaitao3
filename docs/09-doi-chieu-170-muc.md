# 9. Đối chiếu danh sách 170 mục của bạn với mã nguồn

Tệp này sinh bởi `node tools/map-coverage.js`. Mỗi mục của bạn được gán cho
các ID **có thật** trong `src/Shared/Methods.luau`; trạng thái lấy **từ catalog**,
không tự đánh giá. Nếu một mục chỉ trỏ tới các ID trạng thái **D** thì nó được
tính là **chưa có mã** — không tính là "có".

## 9.1 Kết quả đối chiếu

| Kết quả | Số mục | Nghĩa |
| ------- | ------ | ----- |
| **CÓ — có test** | 105 | Có mã thật **và** có test đang đạt trong harness |
| **CÓ — chưa test riêng** | 29 | Có mã thật, chưa có test khai riêng ID đó |
| **CHỈ LÀ ĐỀ XUẤT** | 18 | **Chưa có mã** — chỉ có mô tả trong catalog |
| **KHÔNG ÁP DỤNG** | 2 | Không làm được trong phạm vi LocalScript |
| **KHÔNG CÓ** | 15 | Dự án **hoàn toàn không có** |
| **Tổng** | 169 | |

> **Đọc kỹ:** 134 / 169 mục có mã thật.
> 18 mục chỉ là đề xuất, 15 mục không có,
> 2 mục không áp dụng được.
>
> Và "có test" ở đây là **test trong harness Lua**, không phải chạy trong Roblox Studio.

## 9.2 Bảng đối chiếu chi tiết

### A. Loại bỏ phép tính dư thừa

| # | Mục của bạn | Kết quả | ID trong dự án |
| - | ----------- | ------- | -------------- |
| 1 | Giảm số lần gọi hàm không cần thiết | CÓ — có test | `CPU-001`(A), `CPU-002`(A), `CPU-003`(A), `LOOP-007`(B) |
| 2 | Tránh vòng lặp liên tục không có thời gian nghỉ | CÓ — có test | `LOOP-001`(B), `LOOP-003`(B), `BG-006`(B) |
| 3 | Điều chỉnh tần suất cập nhật | CÓ — có test | `LOOP-003`(B), `LOOP-008`(A), `CULL-002`(B), `DIST-002`(A) |
| 4 | Tối ưu thuật toán xử lý dữ liệu | CÓ — có test | `DATA-002`(B), `DATA-003`(B), `DATA-004`(B), `CPU-005`(B) |
| 5 | Lưu kết quả tính toán để tái sử dụng | CÓ — có test | `CPU-001`(A), `QUERY-002`(B), `ASSET-003`(B), `RAM-002`(B) |
| 6 | Giảm số lần kiểm tra điều kiện lặp lại | CÓ — có test | `CPU-004`(B), `LOOP-007`(B), `DATA-004`(B) |
| 7 | Chia nhỏ tác vụ nặng | CÓ — có test | `CPU-009`(B), `LOOP-002`(B), `QUERY-004`(B) |
| 8 | Tránh đệ quy quá sâu | CÓ — có test | `QUERY-006`(B) |
| 9 | Giảm số đối tượng cần cập nhật | CÓ — có test | `FPS-003`(B), `CULL-003`(B), `CULL-004`(B) |
| 10 | Tối ưu hàm xử lý sự kiện | CÓ — có test | `EVT-001`(A), `EVT-002`(B), `LEAK-004`(A), `BG-005`(A) |
| 11 | Tránh chuyển đổi kiểu dữ liệu không cần thiết | CÓ — chưa test riêng | `CPU-007`(A), `DATA-005`(D) |
| 12 | Tránh xử lý trùng lặp dữ liệu | CÓ — có test | `LEAK-003`(B), `EVT-002`(B), `NET-003`(A) |
| 13 | Đo thời gian thực thi của tác vụ | CÓ — có test | `MEAS-001`(B), `MEAS-002`(A), `HEAVY-001`(A), `MEAS-005`(A) |
| 14 | Dừng vòng lặp khi không còn cần thiết | CÓ — có test | `LOOP-004`(B), `BG-003`(B), `BG-006`(B), `DATA-003`(B) |

### B. Tối ưu RAM và đối tượng

| # | Mục của bạn | Kết quả | ID trong dự án |
| - | ----------- | ------- | -------------- |
| 16 | Xóa tham chiếu đến đối tượng không còn dùng | CÓ — có test | `LEAK-005`(B), `RESTORE-004`(A), `POOL-004`(B) |
| 17 | Ngắt kết nối sự kiện khi không cần nữa | CÓ — có test | `LEAK-001`(B), `EVT-006`(B), `GUI-011`(B) |
| 18 | Tránh rò rỉ bộ nhớ do giữ tham chiếu | CÓ — có test | `LEAK-002`(A), `LEAK-005`(B), `RAM-003`(A) |
| 19 | Tái sử dụng đối tượng bằng object pooling | CÓ — có test | `POOL-001`(B), `POOL-003`(B), `POOL-004`(B), `POOL-005`(B), `DATA-001`(B) |
| 20 | Giảm số bảng dữ liệu lớn | CÓ — chưa test riêng | `RAM-001`(A), `RAM-003`(A) |
| 21 | Tránh sao chép bảng không cần thiết | CÓ — có test | `RAM-002`(B), `POOL-003`(B) |
| 22 | Giảm kích thước dữ liệu lưu trữ | CÓ — chưa test riêng | `RAM-001`(A), `RAM-003`(A) |
| 23 | Xóa dữ liệu tạm | CÓ — có test | `RAM-002`(B), `POOL-003`(B) |
| 24 | Giới hạn bộ nhớ đệm | CÓ — có test | `RAM-001`(A), `RAM-003`(A), `POOL-004`(B) |
| 25 | Tái sử dụng bảng và vùng đệm khi phù hợp | CÓ — có test | `RAM-002`(B), `POOL-003`(B) |
| 26 | Tránh tạo chuỗi lớn liên tục | CÓ — chưa test riêng | `CPU-007`(A), `RAM-005`(D) |
| 27 | Giảm số đối tượng do script tự tạo | CÓ — có test | `POOL-001`(B), `GUI-002`(B), `GUI-005`(B) |
| 28 | Theo dõi bộ nhớ bằng công cụ Roblox | CÓ — có test | `HEAVY-003`(A), `MEAS-001`(B) |
| 29 | Tránh tạo quá nhiều bảng và closure ngắn hạn | CÓ — có test | `RAM-002`(B), `RAM-004`(A) |
| 30 | Hủy đối tượng do script tạo khi không còn dùng | CÓ — có test | `GUI-011`(B), `LEAK-005`(B), `POOL-004`(B) |

### C. Tối ưu FPS và cập nhật

| # | Mục của bạn | Kết quả | ID trong dự án |
| - | ----------- | ------- | -------------- |
| 31 | Giảm công việc thực hiện mỗi khung hình | CÓ — có test | `CPU-009`(B), `FPS-001`(A), `LOOP-001`(B) |
| 32 | Chỉ cập nhật khi dữ liệu thay đổi | CÓ — có test | `GUI-004`(B), `NET-003`(A), `BG-002`(A) |
| 33 | Giảm phép tính trong vòng lặp cập nhật | CÓ — có test | `CPU-004`(B), `CPU-005`(B), `LOOP-007`(B) |
| 34 | Loại bỏ hiệu ứng do script tạo không cần thiết | CÓ — có test | `FX-001`(B), `EFFECTS-005`(D) |
| 35 | Hạn chế cập nhật giao diện liên tục | CÓ — có test | `GUI-004`(B), `FPS-002`(B), `GUI-006`(B) |
| 36 | Chỉ cập nhật hình ảnh khi cần | CÓ — có test | `GUI-004`(B), `FPS-002`(B), `GUI-007`(A) |
| 37 | Dùng sự kiện thay vì kiểm tra liên tục | CÓ — chưa test riêng | `BG-002`(A), `EVT-001`(A) |
| 38 | Giảm số đối tượng do script điều khiển cùng lúc | CÓ — có test | `CULL-003`(B), `FPS-003`(B) |
| 39 | Giảm số lần truy vấn trạng thái | CÓ — có test | `QUERY-002`(B), `ASSET-003`(B), `CPU-002`(A) |
| 40 | Chia tác vụ nặng thành nhiều đợt | CÓ — có test | `CPU-009`(B), `LOOP-002`(B), `QUERY-004`(B) |
| 41 | Giảm hoạt ảnh không cần thiết | CÓ — có test | `GUI-003`(A), `GUI-006`(B), `GUI-009`(A) |
| 42 | Tái sử dụng hiệu ứng | CÓ — có test | `POOL-001`(B), `POOL-002`(D) |
| 43 | Tránh tính lại vị trí không đổi | CÓ — có test | `CPU-004`(B), `DIST-001`(B) |
| 44 | Dùng bộ hẹn giờ phù hợp | CÓ — có test | `BG-001`(A), `BG-003`(B), `LOOP-003`(B) |
| 45 | Theo dõi FPS bằng công cụ phù hợp | CÓ — có test | `MEAS-001`(B), `MEAS-002`(A), `HEAVY-002`(A) |

### D. Tối ưu vật thể và hiệu ứng

| # | Mục của bạn | Kết quả | ID trong dự án |
| - | ----------- | ------- | -------------- |
| 46 | Ẩn đối tượng do script tạo khi không cần hiển thị | CÓ — có test | `GUI-006`(B), `CULL-001`(B) |
| 47 | Hạn chế cập nhật đối tượng ở xa | CÓ — có test | `DIST-001`(B), `DIST-002`(A), `DIST-003`(B), `CULL-001`(B) |
| 48 | Dùng object pooling cho hiệu ứng | CÓ — có test | `POOL-001`(B), `POOL-002`(D) |
| 49 | Giới hạn số vật thể do script sinh ra | CÓ — có test | `POOL-004`(B), `EFFECTS-004`(D) |
| 50 | Giảm số NPC do hệ thống quản lý | CHỈ LÀ ĐỀ XUẤT (chưa có mã) | `NPC-001`(D), `NPC-004`(D) |
| 51 | Xóa vật phẩm/hiệu ứng tạm khi hết hạn | CÓ — có test | `GUI-011`(B), `POOL-004`(B) |
| 52 | Giảm các phép kiểm tra va chạm do script | CÓ — có test | `PHYSICS-003`(D), `QUERY-003`(B) |
| 53 | Giảm số cặp đối tượng cần kiểm tra | CÓ — có test | `DATA-002`(B), `QUERY-003`(B) |
| 54 | Chỉ kiểm tra va chạm khi cần | CÓ — có test | `PHYSICS-003`(D), `QUERY-003`(B) |
| 55 | Giảm số thành phần do script tạo trên mỗi đối tượng | CÓ — có test | `GUI-005`(B), `PART-006`(D) |
| 56 | Hạn chế tạo rồi hủy đối tượng liên tục | CÓ — có test | `POOL-001`(B), `POOL-005`(B) |
| 57 | Chỉ tìm đối tượng gần người chơi khi cần | CÓ — có test | `QUERY-003`(B), `DATA-002`(B), `NPC-003`(B) |
| 58 | Tái sử dụng đối tượng hiệu ứng | CÓ — có test | `POOL-001`(B), `POOL-002`(D) |
| 59 | Tách đối tượng tĩnh khỏi đối tượng cần cập nhật | CÓ — có test | `CULL-001`(B), `DIST-002`(A) |
| 60 | Dùng CollectionService quản lý nhóm đối tượng | CÓ — chưa test riêng | `QUERY-001`(A), `QUERY-005`(D) |

### E. Tối ưu mạng client-server

| # | Mục của bạn | Kết quả | ID trong dự án |
| - | ----------- | ------- | -------------- |
| 61 | Giảm lượng dữ liệu do script gửi | CÓ — chưa test riêng | `NET-002`(A), `NET-003`(A) |
| 62 | Chỉ truyền dữ liệu đã thay đổi | CÓ — chưa test riêng | `NET-003`(A) |
| 63 | Giảm tần suất đồng bộ | CÓ — chưa test riêng | `NET-001`(A), `NET-007`(A) |
| 64 | Tránh gửi dữ liệu trùng lặp | CÓ — chưa test riêng | `NET-003`(A) |
| 65 | Đóng gói dữ liệu hợp lý | CÓ — chưa test riêng | `NET-002`(A) |
| 66 | Giảm số yêu cầu mạng không cần thiết | CÓ — chưa test riêng | `NET-001`(A), `NET-007`(A) |
| 67 | Tối ưu cấu trúc dữ liệu qua RemoteEvent | CÓ — chưa test riêng | `NET-002`(A), `NET-004`(D) |
| 68 | Hạn chế đồng bộ thông tin không cần thiết | CÓ — chưa test riêng | `NET-003`(A), `NET-005`(E) |
| 69 | Nội suy chuyển động | KHÔNG CÓ | — |
| 70 | Dự đoán chuyển động (client prediction) | KHÔNG CÓ | — |
| 71 | Xử lý dữ liệu đến trễ hoặc không hợp lệ | KHÔNG CÓ | — |
| 72 | Tránh gửi thông tin tần suất quá cao | CÓ — chưa test riêng | `NET-001`(A), `NET-007`(A) |
| 73 | Theo dõi ping | KHÔNG CÓ | — |
| 74 | Giảm số lần gọi RemoteEvent/RemoteFunction | CÓ — chưa test riêng | `NET-001`(A), `NET-002`(A) |
| 75 | Phân biệt lag mạng với FPS thấp | KHÔNG CÓ | — |

### F. Tối ưu tác vụ và sự kiện

| # | Mục của bạn | Kết quả | ID trong dự án |
| - | ----------- | ------- | -------------- |
| 76 | Thay vòng lặp liên tục bằng cơ chế chờ | CÓ — có test | `BG-002`(A), `LOOP-001`(B) |
| 77 | Dừng tác vụ khi không còn cần thiết | CÓ — có test | `LOOP-004`(B), `BG-003`(B), `BG-006`(B) |
| 78 | Giảm tần suất tác vụ nền | CÓ — có test | `BG-004`(A), `LOOP-003`(B) |
| 79 | Tránh vòng lặp/bộ hẹn giờ trùng nhau | CÓ — có test | `LOOP-001`(B), `RES-001`(A) |
| 80 | Hủy tác vụ khi đối tượng bị xóa | CÓ — có test | `LEAK-002`(A), `CULL-004`(B) |
| 81 | Gộp các tác vụ nhỏ | CÓ — có test | `START-003`(B), `LOOP-001`(B) |
| 82 | Chia tác vụ nặng thành từng phần | CÓ — có test | `CPU-009`(B), `LOOP-002`(B) |
| 83 | Giới hạn số tác vụ đồng thời | CÓ — có test | `CULL-003`(B), `QUERY-004`(B) |
| 84 | Tránh chờ đồng bộ không cần thiết | CÓ — có test | `START-003`(B), `START-004`(A) |
| 85 | Bỏ qua yêu cầu đã lỗi thời | CÓ — có test | `REC-002`(B), `RESTORE-003`(B) |
| 86 | Giảm kiểm tra trạng thái liên tục | CÓ — có test | `BG-002`(A), `QUERY-002`(B) |
| 87 | Ưu tiên tác vụ ảnh hưởng gameplay | CÓ — có test | `LOOP-002`(B), `FPS-004`(A) |
| 88 | Dùng task.spawn/task.defer | CÓ — có test | `START-001`(B), `LEAK-004`(A) |
| 89 | Tránh giữ tài nguyên hoặc chờ quá lâu | CÓ — có test | `START-004`(A), `BG-006`(B) |
| 90 | Đo thời gian chạy các tác vụ quan trọng | CÓ — có test | `MEAS-001`(B), `MEAS-005`(A), `HEAVY-004`(A) |

### G. Tối ưu vật lý

| # | Mục của bạn | Kết quả | ID trong dự án |
| - | ----------- | ------- | -------------- |
| 91 | Giảm số vật thể vật lý do hệ thống tạo | CHỈ LÀ ĐỀ XUẤT (chưa có mã) | `PART-001`(D), `PART-006`(D) |
| 92 | Hạn chế vật thể động không cần thiết | CHỈ LÀ ĐỀ XUẤT (chưa có mã) | `PART-001`(D) |
| 93 | Đặt trạng thái vật lý phù hợp | CÓ — chưa test riêng | `PHYSICS-001`(A), `PHYSICS-002`(A) |
| 94 | Dùng collider đơn giản | KHÔNG CÓ | — |
| 95 | Giảm số lần kiểm tra va chạm từ script | CHỈ LÀ ĐỀ XUẤT (chưa có mã) | `PHYSICS-003`(D) |
| 96 | Điều chỉnh tần suất mô phỏng logic | CÓ — chưa test riêng | `PHYSICS-002`(A) |
| 97 | Tránh tạo nhiều collider chồng lấn | KHÔNG CÓ | — |
| 98 | Ngăn vòng lặp xử lý va chạm lặp lại | CÓ — có test | `REC-003`(B) |
| 99 | Tối ưu truy vấn Raycast | CHỈ LÀ ĐỀ XUẤT (chưa có mã) | `PHYSICS-004`(D) |
| 100 | Chỉ thực hiện truy vấn vật lý khi cần | CÓ — có test | `QUERY-003`(B), `PHYSICS-004`(D) |

### H. Tối ưu âm thanh và giao diện

| # | Mục của bạn | Kết quả | ID trong dự án |
| - | ----------- | ------- | -------------- |
| 101 | Giảm số âm thanh phát đồng thời | CHỈ LÀ ĐỀ XUẤT (chưa có mã) | `AUDIO-003`(D) |
| 102 | Dừng âm thanh không còn cần thiết | CHỈ LÀ ĐỀ XUẤT (chưa có mã) | `AUDIO-001`(D) |
| 103 | Tái sử dụng đối tượng âm thanh | CHỈ LÀ ĐỀ XUẤT (chưa có mã) | `AUDIO-002`(D) |
| 104 | Tránh phát cùng âm thanh liên tục | CHỈ LÀ ĐỀ XUẤT (chưa có mã) | `AUDIO-003`(D) |
| 105 | Giới hạn hiệu ứng âm thanh | CHỈ LÀ ĐỀ XUẤT (chưa có mã) | `AUDIO-003`(D) |
| 106 | Giải phóng tài nguyên âm thanh | CHỈ LÀ ĐỀ XUẤT (chưa có mã) | `AUDIO-002`(D) |
| 107 | Tải âm thanh theo nhu cầu | CHỈ LÀ ĐỀ XUẤT (chưa có mã) | `ASSET-001`(D) |
| 108 | Giảm tác vụ xử lý âm thanh | KHÔNG ÁP DỤNG | `AUDIO-004`(E) |
| 109 | Chỉ cập nhật UI khi dữ liệu thay đổi | CÓ — có test | `GUI-004`(B) |
| 110 | Giảm số thành phần giao diện do script tạo | CÓ — có test | `GUI-005`(B) |
| 111 | Tái sử dụng thành phần giao diện | CÓ — có test | `GUI-002`(B), `POOL-001`(B) |
| 112 | Hạn chế hiệu ứng giao diện nặng | CÓ — có test | `GUI-003`(A), `GUI-006`(B), `GUI-009`(A) |
| 113 | Tối ưu danh sách dài (chỉ tạo phần cần thiết) | KHÔNG CÓ | — |
| 114 | Không dựng lại toàn bộ UI khi đổi một giá trị | CÓ — có test | `GUI-004`(B), `FPS-002`(B) |
| 115 | Ngắt kết nối sự kiện của GUI đã đóng | CÓ — có test | `GUI-011`(B), `EVT-006`(B) |

### I. Tối ưu tải dữ liệu và mã nguồn

| # | Mục của bạn | Kết quả | ID trong dự án |
| - | ----------- | ------- | -------------- |
| 116 | Tải tài nguyên theo nhu cầu | CÓ — chưa test riêng | `ASSET-001`(D), `ASSET-002`(A) |
| 117 | Tránh tải trước tài nguyên không cần thiết | CÓ — chưa test riêng | `ASSET-001`(D), `START-002`(A) |
| 118 | Dùng hình ảnh kích thước phù hợp | KHÔNG ÁP DỤNG | `ASSET-006`(E) |
| 119 | Tối ưu mô hình và tài nguyên trong Studio | CHỈ LÀ ĐỀ XUẤT (chưa có mã) | `PART-005`(D), `ASSET-006`(E) |
| 120 | Cache tài nguyên thường dùng | CÓ — có test | `ASSET-003`(B), `QUERY-002`(B) |
| 121 | Tránh tải cùng tài nguyên nhiều lần | CÓ — có test | `ASSET-003`(B), `ASSET-005`(D) |
| 122 | Chia nhỏ dữ liệu lớn | CÓ — chưa test riêng | `RAM-003`(A) |
| 123 | Ưu tiên tài nguyên thiết yếu | CÓ — chưa test riêng | `FPS-004`(A) |
| 124 | Xử lý lỗi tải tài nguyên có kiểm soát | CÓ — có test | `REC-001`(B), `REC-003`(B) |
| 125 | Dọn tài nguyên khi rời khu vực | CÓ — có test | `DIST-004`(B), `CULL-004`(B) |
| 126 | Loại bỏ mã chết | KHÔNG CÓ | — |
| 127 | Loại bỏ nhánh điều kiện dư thừa | KHÔNG CÓ | — |
| 128 | Tái sử dụng hàm xử lý chung | CÓ — chưa test riêng | `RES-001`(A), `RES-005`(A) |
| 129 | Chọn cấu trúc dữ liệu phù hợp | CÓ — có test | `DATA-001`(B), `DATA-002`(B), `DATA-003`(B), `DATA-004`(B) |
| 130 | Dùng cấu trúc tìm kiếm hiệu quả | CÓ — có test | `DATA-002`(B), `DATA-004`(B) |
| 131 | Giảm thao tác đọc ghi dữ liệu | CÓ — có test | `GUI-004`(B), `QUERY-002`(B) |
| 132 | Chia mã nguồn thành mô-đun | CÓ — có test | `RES-001`(A), `RES-004`(B) |
| 133 | Xử lý lỗi tránh vòng lặp thất bại | CÓ — có test | `REC-001`(B), `REC-003`(B), `LOWEND-006`(D) |
| 134 | Hạn chế ghi log quá nhiều | CÓ — chưa test riêng | `RAM-003`(A) |
| 135 | Kiểm tra hiệu năng sau mỗi thay đổi | CÓ — có test | `MEAS-001`(B), `MEAS-003`(B) |

### J. Tối ưu AI, NPC và kiểm thử

| # | Mục của bạn | Kết quả | ID trong dự án |
| - | ----------- | ------- | -------------- |
| 136 | Giảm tần suất tính đường đi NPC | CHỈ LÀ ĐỀ XUẤT (chưa có mã) | `NPC-002`(D) |
| 137 | Chỉ cập nhật AI khi có thay đổi | CÓ — có test | `NPC-003`(B) |
| 138 | Giảm số NPC xử lý đầy đủ cùng lúc | CHỈ LÀ ĐỀ XUẤT (chưa có mã) | `NPC-001`(D), `NPC-004`(D) |
| 139 | Logic đơn giản hơn cho NPC ở xa | CHỈ LÀ ĐỀ XUẤT (chưa có mã) | `NPC-004`(D) |
| 140 | Tái sử dụng kết quả tìm đường | CHỈ LÀ ĐỀ XUẤT (chưa có mã) | `NPC-005`(D) |
| 141 | Giới hạn yêu cầu tìm đường đồng thời | CÓ — có test | `NPC-003`(B), `QUERY-004`(B) |
| 142 | Giảm số mục tiêu đánh giá mỗi chu kỳ | CÓ — có test | `NPC-003`(B), `DATA-002`(B) |
| 143 | Giảm tần suất kiểm tra tầm nhìn | CÓ — có test | `DIST-002`(A), `NPC-003`(B) |
| 144 | Dừng xử lý AI cho NPC không hoạt động | CHỈ LÀ ĐỀ XUẤT (chưa có mã) | `NPC-004`(D) |
| 145 | Chia cấp độ xử lý AI theo khoảng cách | CÓ — chưa test riêng | `DIST-002`(A), `NPC-004`(D) |
| 146 | Đo FPS trước khi tối ưu | CÓ — có test | `MEAS-001`(B) |
| 147 | Đo FPS sau khi tối ưu | CÓ — có test | `MEAS-001`(B) |
| 148 | Theo dõi CPU bằng công cụ profiling | CÓ — chưa test riêng | `HEAVY-006`(E), `MEAS-005`(A) |
| 149 | Theo dõi bộ nhớ | CÓ — chưa test riêng | `HEAVY-003`(A) |
| 150 | Kiểm tra tải GPU | KHÔNG CÓ | — |
| 151 | Theo dõi ping | KHÔNG CÓ | — |
| 152 | Kiểm tra mức tăng RAM theo thời gian | CÓ — chưa test riêng | `HEAVY-003`(A), `RAM-001`(A) |
| 153 | Kiểm tra rò rỉ tài nguyên | CÓ — có test | `LEAK-001`(B), `LEAK-005`(B), `RES-006`(A) |
| 154 | Tạo bài kiểm tra tải | KHÔNG CÓ | — |
| 155 | Kiểm tra khi có nhiều người chơi | KHÔNG CÓ | — |
| 156 | Kiểm tra trên thiết bị cấu hình thấp | CÓ — có test | `LOWEND-001`(B), `LOWEND-002`(B), `LOWEND-003`(B), `LOWEND-004`(B) |
| 157 | Kiểm thử hồi quy sau khi sửa | CÓ — có test | `MEAS-004`(B) |
| 158 | So sánh kết quả trước và sau tối ưu | CÓ — có test | `MEAS-003`(B) |
| 159 | Tắt tính năng tối ưu nếu gây lỗi | CÓ — có test | `CFG-001`(B), `CFG-002`(B), `CFG-004`(B) |
| 160 | Ghi lại các thay đổi cấu hình | CÓ — có test | `CFG-005`(B), `RES-006`(A) |

### K. Tối ưu nâng cao

| # | Mục của bạn | Kết quả | ID trong dự án |
| - | ----------- | ------- | -------------- |
| 161 | Điều chỉnh chất lượng hiệu ứng theo hiệu năng | CÓ — có test | `LOWEND-002`(B), `LOWEND-003`(B) |
| 162 | Dùng cơ chế giảm tải thích ứng | CÓ — có test | `LOWEND-002`(B), `BG-004`(A), `LOOP-006`(A) |
| 163 | Phân bổ ngân sách thời gian mỗi khung hình | CÓ — có test | `CPU-009`(B), `FPS-001`(A) |
| 164 | Ưu tiên tài nguyên theo khoảng cách | CÓ — có test | `DIST-001`(B), `QUERY-003`(B) |
| 165 | Quản lý tài nguyên tập trung | CÓ — có test | `RES-001`(A), `RES-002`(A), `RES-003`(B), `RES-004`(B), `RES-005`(A), `RES-006`(A) |
| 166 | Phát hiện tác vụ vượt ngưỡng thời gian | CÓ — chưa test riêng | `HEAVY-005`(A), `HEAVY-002`(A) |
| 167 | Tối ưu cấu trúc dữ liệu không gian | CÓ — có test | `DATA-002`(B) |
| 168 | Dùng bộ đệm theo vòng đời đối tượng | CÓ — có test | `RAM-001`(A), `POOL-004`(B) |
| 169 | Tự phân tích dữ liệu hiệu năng để đề xuất | KHÔNG CÓ | — |
| 170 | Kiểm thử hiệu năng định kỳ | CÓ — có test | `MEAS-004`(B) |

## 9.3 Những mục dự án KHÔNG CÓ

Đây là phần bạn cần biết rõ nhất — 15 mục:

| # | Mục | Vì sao chưa có |
| - | --- | -------------- |
| 69 | Nội suy chuyển động | Nội suy chuyển động cần hệ thống nhân vật/vehicle do bạn kiểm soát. Dự án không tự ý nội suy nhân vật của game. |
| 70 | Dự đoán chuyển động (client prediction) | Client prediction đụng trực tiếp gameplay và chống gian lận. Ngoài phạm vi "không đổi gameplay". |
| 71 | Xử lý dữ liệu đến trễ hoặc không hợp lệ | Cần hệ thống remote của game. Dự án không tự định nghĩa giao thức mạng cho game của bạn. |
| 73 | Theo dõi ping | Net.Stats() chỉ đếm queued/sent/suppressed/batched — KHÔNG đo ping. Muốn đo ping phải có round-trip qua RemoteFunction do game cung cấp. |
| 75 | Phân biệt lag mạng với FPS thấp | Measure.Run chỉ đo thời gian khung hình qua RenderStepped. Không có số đo network nên KHÔNG tách được lag mạng khỏi FPS thấp. |
| 94 | Dùng collider đơn giản | Collider đơn giản là việc thiết kế asset trong Studio, không phải thứ script runtime làm được. |
| 97 | Tránh tạo nhiều collider chồng lấn | Tương tự — thuộc thiết kế asset trong Studio. |
| 113 | Tối ưu danh sách dài (chỉ tạo phần cần thiết) | Danh sách ảo hoá (virtualized list) cần biết UI game của bạn. Chưa triển khai. |
| 126 | Loại bỏ mã chết | Loại bỏ mã chết là quy trình review mã, không phải tính năng runtime. |
| 127 | Loại bỏ nhánh điều kiện dư thừa | Tương tự — quy trình review. |
| 150 | Kiểm tra tải GPU | Không có API nào trong LocalScript đọc được tải GPU. Phải dùng View -> Stats hoặc MicroProfiler trong Studio. |
| 151 | Theo dõi ping | Giống mục 73 — chưa có code đo ping. |
| 154 | Tạo bài kiểm tra tải | Bài test tải cần Studio + nhiều client thật. Không có trong môi trường này. |
| 155 | Kiểm tra khi có nhiều người chơi | Tương tự — cần nhiều người chơi thật. |
| 169 | Tự phân tích dữ liệu hiệu năng để đề xuất | Tự phân tích và đề xuất cách sửa: chưa triển khai. Hiện chỉ có đo và cảnh báo vượt ngưỡng (HEAVY-005). |

## 9.4 Những mục CHỈ LÀ ĐỀ XUẤT (chưa có mã)

18 mục dưới đây có tên trong catalog nhưng **chưa có dòng mã nào**.
Đừng hiểu nhầm là đã làm:

| # | Mục | ID |
| - | --- | -- |
| 50 | Giảm số NPC do hệ thống quản lý | `NPC-001`, `NPC-004` |
| 91 | Giảm số vật thể vật lý do hệ thống tạo | `PART-001`, `PART-006` |
| 92 | Hạn chế vật thể động không cần thiết | `PART-001` |
| 95 | Giảm số lần kiểm tra va chạm từ script | `PHYSICS-003` |
| 99 | Tối ưu truy vấn Raycast | `PHYSICS-004` |
| 101 | Giảm số âm thanh phát đồng thời | `AUDIO-003` |
| 102 | Dừng âm thanh không còn cần thiết | `AUDIO-001` |
| 103 | Tái sử dụng đối tượng âm thanh | `AUDIO-002` |
| 104 | Tránh phát cùng âm thanh liên tục | `AUDIO-003` |
| 105 | Giới hạn hiệu ứng âm thanh | `AUDIO-003` |
| 106 | Giải phóng tài nguyên âm thanh | `AUDIO-002` |
| 107 | Tải âm thanh theo nhu cầu | `ASSET-001` |
| 119 | Tối ưu mô hình và tài nguyên trong Studio | `PART-005`, `ASSET-006` |
| 136 | Giảm tần suất tính đường đi NPC | `NPC-002` |
| 138 | Giảm số NPC xử lý đầy đủ cùng lúc | `NPC-001`, `NPC-004` |
| 139 | Logic đơn giản hơn cho NPC ở xa | `NPC-004` |
| 140 | Tái sử dụng kết quả tìm đường | `NPC-005` |
| 144 | Dừng xử lý AI cho NPC không hoạt động | `NPC-004` |

## 9.5 Nhóm yếu nhất

Nhóm **H (âm thanh)** gần như chưa có mã: mọi ID `AUDIO-*` đều là D hoặc E.
Dự án **không** đụng âm thanh của game — đó là lựa chọn có chủ ý (âm thanh là
tính năng gameplay), nhưng nếu bạn cần thì đó là phần phải viết thêm.

Nhóm **G (vật lý)** cũng yếu: `PHYSICS-001/002` có mã nhưng **mặc định TẮT**
trong `Config.luau` vì có đánh đổi cảm giác chơi; `PHYSICS-003/004/005` chỉ là đề xuất.

Nhóm **J (AI/NPC)** phần lớn là đề xuất: chỉ `NPC-003` (kiểm tra rẻ trước khi tìm
đường đắt) là có test.

## 9.6 Cách tự kiểm chứng

```bash
node tools/map-coverage.js     # sinh lại tệp này
npm run catalog                # kiểm catalog khớp mã nguồn
npm run test                   # 122 test
```

Nếu bạn thêm mã cho một mục đang là D, hãy đổi trạng thái trong
`src/Shared/Methods.luau` và viết test khai ID đó — `verify-catalog.js` sẽ từ chối
nếu khai B mà không có test.
