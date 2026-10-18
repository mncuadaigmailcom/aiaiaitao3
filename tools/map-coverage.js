/*
 * tools/map-coverage.js
 *
 * Đối chiếu danh sách 170 mục của người dùng với danh mục 190 phương pháp
 * trong src/Shared/Methods.luau.
 *
 * Quan trọng: KHÔNG tự đánh giá. Mỗi mục được gán cho một hoặc nhiều ID
 * có thật trong catalog, rồi trạng thái lấy TỪ catalog. Nếu mọi ID của một
 * mục đều là D (đề xuất) hoặc E (không áp dụng) thì mục đó được tính là
 * CHƯA CÓ MÃ — không được tính là "có".
 *
 * Chạy: node tools/map-coverage.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { createRuntime } = require(path.join(__dirname, '..', 'tests', 'lib', 'runtime'));

/*
 * MAPPING: số thứ tự của người dùng -> danh sách ID trong catalog.
 * Mảng rỗng = dự án KHÔNG có mục đó.
 */
const MAPPING = {
  // A. Loại bỏ phép tính dư thừa
  1: ['CPU-001', 'CPU-002', 'CPU-003', 'LOOP-007'],
  2: ['LOOP-001', 'LOOP-003', 'BG-006'],
  3: ['LOOP-003', 'LOOP-008', 'CULL-002', 'DIST-002'],
  4: ['DATA-002', 'DATA-003', 'DATA-004', 'CPU-005'],
  5: ['CPU-001', 'QUERY-002', 'ASSET-003', 'RAM-002'],
  6: ['CPU-004', 'LOOP-007', 'DATA-004'],
  7: ['CPU-009', 'LOOP-002', 'QUERY-004'],
  8: ['QUERY-006'],
  9: ['FPS-003', 'CULL-003', 'CULL-004'],
  10: ['EVT-001', 'EVT-002', 'LEAK-004', 'BG-005'],
  11: ['CPU-007', 'DATA-005'],
  12: ['LEAK-003', 'EVT-002', 'NET-003'],
  13: ['MEAS-001', 'MEAS-002', 'HEAVY-001', 'MEAS-005'],
  14: ['LOOP-004', 'BG-003', 'BG-006', 'DATA-003'],

  // B. RAM và đối tượng
  16: ['LEAK-005', 'RESTORE-004', 'POOL-004'],
  17: ['LEAK-001', 'EVT-006', 'GUI-011'],
  18: ['LEAK-002', 'LEAK-005', 'RAM-003'],
  19: ['POOL-001', 'POOL-003', 'POOL-004', 'POOL-005', 'DATA-001'],
  20: ['RAM-001', 'RAM-003'],
  21: ['RAM-002', 'POOL-003'],
  22: ['RAM-001', 'RAM-003'],
  23: ['RAM-002', 'POOL-003'],
  24: ['RAM-001', 'RAM-003', 'POOL-004'],
  25: ['RAM-002', 'POOL-003'],
  26: ['CPU-007', 'RAM-005'],
  27: ['POOL-001', 'GUI-002', 'GUI-005'],
  28: ['HEAVY-003', 'MEAS-001'],
  29: ['RAM-002', 'RAM-004'],
  30: ['GUI-011', 'LEAK-005', 'POOL-004'],

  // C. FPS và cập nhật
  31: ['CPU-009', 'FPS-001', 'LOOP-001'],
  32: ['GUI-004', 'NET-003', 'BG-002'],
  33: ['CPU-004', 'CPU-005', 'LOOP-007'],
  34: ['FX-001', 'EFFECTS-005'],
  35: ['GUI-004', 'FPS-002', 'GUI-006'],
  36: ['GUI-004', 'FPS-002', 'GUI-007'],
  37: ['BG-002', 'EVT-001'],
  38: ['CULL-003', 'FPS-003'],
  39: ['QUERY-002', 'ASSET-003', 'CPU-002'],
  40: ['CPU-009', 'LOOP-002', 'QUERY-004'],
  41: ['GUI-003', 'GUI-006', 'GUI-009'],
  42: ['POOL-001', 'POOL-002'],
  43: ['CPU-004', 'DIST-001'],
  44: ['BG-001', 'BG-003', 'LOOP-003'],
  45: ['MEAS-001', 'MEAS-002', 'HEAVY-002'],

  // D. Vật thể và hiệu ứng
  46: ['GUI-006', 'CULL-001'],
  47: ['DIST-001', 'DIST-002', 'DIST-003', 'CULL-001'],
  48: ['POOL-001', 'POOL-002'],
  49: ['POOL-004', 'EFFECTS-004'],
  50: ['NPC-001', 'NPC-004'],
  51: ['GUI-011', 'POOL-004'],
  52: ['PHYSICS-003', 'QUERY-003'],
  53: ['DATA-002', 'QUERY-003'],
  54: ['PHYSICS-003', 'QUERY-003'],
  55: ['GUI-005', 'PART-006'],
  56: ['POOL-001', 'POOL-005'],
  57: ['QUERY-003', 'DATA-002', 'NPC-003'],
  58: ['POOL-001', 'POOL-002'],
  59: ['CULL-001', 'DIST-002'],
  60: ['QUERY-001', 'QUERY-005'],

  // E. Mạng và giao tiếp client-server
  61: ['NET-002', 'NET-003'],
  62: ['NET-003'],
  63: ['NET-001', 'NET-007'],
  64: ['NET-003'],
  65: ['NET-002'],
  66: ['NET-001', 'NET-007'],
  67: ['NET-002', 'NET-004'],
  68: ['NET-003', 'NET-005'],
  69: [],   // nội suy chuyển động: KHÔNG CÓ
  70: [],   // dự đoán chuyển động (client prediction): KHÔNG CÓ
  71: [],   // xử lý dữ liệu đến trễ/không hợp lệ: KHÔNG CÓ (cần hệ thống remote của game)
  72: ['NET-001', 'NET-007'],
  73: [],   // theo dõi ping: KHÔNG CÓ (Net.Stats() không đo ping)
  74: ['NET-001', 'NET-002'],
  75: [],   // phân biệt lag mạng vs FPS thấp: KHÔNG CÓ (chỉ đo được frame time)

  // F. Tác vụ và sự kiện
  76: ['BG-002', 'LOOP-001'],
  77: ['LOOP-004', 'BG-003', 'BG-006'],
  78: ['BG-004', 'LOOP-003'],
  79: ['LOOP-001', 'RES-001'],
  80: ['LEAK-002', 'CULL-004'],
  81: ['START-003', 'LOOP-001'],
  82: ['CPU-009', 'LOOP-002'],
  83: ['CULL-003', 'QUERY-004'],
  84: ['START-003', 'START-004'],
  85: ['REC-002', 'RESTORE-003'],
  86: ['BG-002', 'QUERY-002'],
  87: ['LOOP-002', 'FPS-004'],
  88: ['START-001', 'LEAK-004'],
  89: ['START-004', 'BG-006'],
  90: ['MEAS-001', 'MEAS-005', 'HEAVY-004'],

  // G. Vật lý
  91: ['PART-001', 'PART-006'],
  92: ['PART-001'],
  93: ['PHYSICS-001', 'PHYSICS-002'],
  94: [],   // collider đơn giản: việc của Studio, không phải script
  95: ['PHYSICS-003'],
  96: ['PHYSICS-002'],
  97: [],   // collider chồng lấn: việc thiết kế trong Studio
  98: ['REC-003'],
  99: ['PHYSICS-004'],
  100: ['QUERY-003', 'PHYSICS-004'],

  // H. Âm thanh và giao diện
  101: ['AUDIO-003'],
  102: ['AUDIO-001'],
  103: ['AUDIO-002'],
  104: ['AUDIO-003'],
  105: ['AUDIO-003'],
  106: ['AUDIO-002'],
  107: ['ASSET-001'],
  108: ['AUDIO-004'],
  109: ['GUI-004'],
  110: ['GUI-005'],
  111: ['GUI-002', 'POOL-001'],
  112: ['GUI-003', 'GUI-006', 'GUI-009'],
  113: [],   // danh sách ảo hoá (virtualized list): KHÔNG CÓ
  114: ['GUI-004', 'FPS-002'],
  115: ['GUI-011', 'EVT-006'],

  // I. Tải dữ liệu và mã nguồn
  116: ['ASSET-001', 'ASSET-002'],
  117: ['ASSET-001', 'START-002'],
  118: ['ASSET-006'],
  119: ['PART-005', 'ASSET-006'],
  120: ['ASSET-003', 'QUERY-002'],
  121: ['ASSET-003', 'ASSET-005'],
  122: ['RAM-003'],
  123: ['FPS-004'],
  124: ['REC-001', 'REC-003'],
  125: ['DIST-004', 'CULL-004'],
  126: [],   // loại bỏ mã chết: quy trình review, không phải runtime
  127: [],   // loại bỏ nhánh dư thừa: quy trình review
  128: ['RES-001', 'RES-005'],
  129: ['DATA-001', 'DATA-002', 'DATA-003', 'DATA-004'],
  130: ['DATA-002', 'DATA-004'],
  131: ['GUI-004', 'QUERY-002'],
  132: ['RES-001', 'RES-004'],
  133: ['REC-001', 'REC-003', 'LOWEND-006'],
  134: ['RAM-003'],
  135: ['MEAS-001', 'MEAS-003'],

  // J. AI, NPC và kiểm thử
  136: ['NPC-002'],
  137: ['NPC-003'],
  138: ['NPC-001', 'NPC-004'],
  139: ['NPC-004'],
  140: ['NPC-005'],
  141: ['NPC-003', 'QUERY-004'],
  142: ['NPC-003', 'DATA-002'],
  143: ['DIST-002', 'NPC-003'],
  144: ['NPC-004'],
  145: ['DIST-002', 'NPC-004'],
  146: ['MEAS-001'],
  147: ['MEAS-001'],
  148: ['HEAVY-006', 'MEAS-005'],
  149: ['HEAVY-003'],
  150: [],   // tải GPU: KHÔNG CÓ API nào trong LocalScript
  151: [],   // theo dõi ping: KHÔNG CÓ
  152: ['HEAVY-003', 'RAM-001'],
  153: ['LEAK-001', 'LEAK-005', 'RES-006'],
  154: [],   // bài test tải: cần Studio + nhiều client
  155: [],   // test nhiều người chơi: cần Studio
  156: ['LOWEND-001', 'LOWEND-002', 'LOWEND-003', 'LOWEND-004'],
  157: ['MEAS-004'],
  158: ['MEAS-003'],
  159: ['CFG-001', 'CFG-002', 'CFG-004'],
  160: ['CFG-005', 'RES-006'],

  // K. Nâng cao
  161: ['LOWEND-002', 'LOWEND-003'],
  162: ['LOWEND-002', 'BG-004', 'LOOP-006'],
  163: ['CPU-009', 'FPS-001'],
  164: ['DIST-001', 'QUERY-003'],
  165: ['RES-001', 'RES-002', 'RES-003', 'RES-004', 'RES-005', 'RES-006'],
  166: ['HEAVY-005', 'HEAVY-002'],
  167: ['DATA-002'],
  168: ['RAM-001', 'POOL-004'],
  169: [],   // tự phân tích và đề xuất cách sửa: KHÔNG CÓ
  170: ['MEAS-004'],
};

/* Nhãn tiếng Việt cho từng mục của người dùng (để bảng đọc được). */
const LABELS = {
  1: 'Giảm số lần gọi hàm không cần thiết',
  2: 'Tránh vòng lặp liên tục không có thời gian nghỉ',
  3: 'Điều chỉnh tần suất cập nhật',
  4: 'Tối ưu thuật toán xử lý dữ liệu',
  5: 'Lưu kết quả tính toán để tái sử dụng',
  6: 'Giảm số lần kiểm tra điều kiện lặp lại',
  7: 'Chia nhỏ tác vụ nặng',
  8: 'Tránh đệ quy quá sâu',
  9: 'Giảm số đối tượng cần cập nhật',
  10: 'Tối ưu hàm xử lý sự kiện',
  11: 'Tránh chuyển đổi kiểu dữ liệu không cần thiết',
  12: 'Tránh xử lý trùng lặp dữ liệu',
  13: 'Đo thời gian thực thi của tác vụ',
  14: 'Dừng vòng lặp khi không còn cần thiết',
  16: 'Xóa tham chiếu đến đối tượng không còn dùng',
  17: 'Ngắt kết nối sự kiện khi không cần nữa',
  18: 'Tránh rò rỉ bộ nhớ do giữ tham chiếu',
  19: 'Tái sử dụng đối tượng bằng object pooling',
  20: 'Giảm số bảng dữ liệu lớn',
  21: 'Tránh sao chép bảng không cần thiết',
  22: 'Giảm kích thước dữ liệu lưu trữ',
  23: 'Xóa dữ liệu tạm',
  24: 'Giới hạn bộ nhớ đệm',
  25: 'Tái sử dụng bảng và vùng đệm khi phù hợp',
  26: 'Tránh tạo chuỗi lớn liên tục',
  27: 'Giảm số đối tượng do script tự tạo',
  28: 'Theo dõi bộ nhớ bằng công cụ Roblox',
  29: 'Tránh tạo quá nhiều bảng và closure ngắn hạn',
  30: 'Hủy đối tượng do script tạo khi không còn dùng',
  31: 'Giảm công việc thực hiện mỗi khung hình',
  32: 'Chỉ cập nhật khi dữ liệu thay đổi',
  33: 'Giảm phép tính trong vòng lặp cập nhật',
  34: 'Loại bỏ hiệu ứng do script tạo không cần thiết',
  35: 'Hạn chế cập nhật giao diện liên tục',
  36: 'Chỉ cập nhật hình ảnh khi cần',
  37: 'Dùng sự kiện thay vì kiểm tra liên tục',
  38: 'Giảm số đối tượng do script điều khiển cùng lúc',
  39: 'Giảm số lần truy vấn trạng thái',
  40: 'Chia tác vụ nặng thành nhiều đợt',
  41: 'Giảm hoạt ảnh không cần thiết',
  42: 'Tái sử dụng hiệu ứng',
  43: 'Tránh tính lại vị trí không đổi',
  44: 'Dùng bộ hẹn giờ phù hợp',
  45: 'Theo dõi FPS bằng công cụ phù hợp',
  46: 'Ẩn đối tượng do script tạo khi không cần hiển thị',
  47: 'Hạn chế cập nhật đối tượng ở xa',
  48: 'Dùng object pooling cho hiệu ứng',
  49: 'Giới hạn số vật thể do script sinh ra',
  50: 'Giảm số NPC do hệ thống quản lý',
  51: 'Xóa vật phẩm/hiệu ứng tạm khi hết hạn',
  52: 'Giảm các phép kiểm tra va chạm do script',
  53: 'Giảm số cặp đối tượng cần kiểm tra',
  54: 'Chỉ kiểm tra va chạm khi cần',
  55: 'Giảm số thành phần do script tạo trên mỗi đối tượng',
  56: 'Hạn chế tạo rồi hủy đối tượng liên tục',
  57: 'Chỉ tìm đối tượng gần người chơi khi cần',
  58: 'Tái sử dụng đối tượng hiệu ứng',
  59: 'Tách đối tượng tĩnh khỏi đối tượng cần cập nhật',
  60: 'Dùng CollectionService quản lý nhóm đối tượng',
  61: 'Giảm lượng dữ liệu do script gửi',
  62: 'Chỉ truyền dữ liệu đã thay đổi',
  63: 'Giảm tần suất đồng bộ',
  64: 'Tránh gửi dữ liệu trùng lặp',
  65: 'Đóng gói dữ liệu hợp lý',
  66: 'Giảm số yêu cầu mạng không cần thiết',
  67: 'Tối ưu cấu trúc dữ liệu qua RemoteEvent',
  68: 'Hạn chế đồng bộ thông tin không cần thiết',
  69: 'Nội suy chuyển động',
  70: 'Dự đoán chuyển động (client prediction)',
  71: 'Xử lý dữ liệu đến trễ hoặc không hợp lệ',
  72: 'Tránh gửi thông tin tần suất quá cao',
  73: 'Theo dõi ping',
  74: 'Giảm số lần gọi RemoteEvent/RemoteFunction',
  75: 'Phân biệt lag mạng với FPS thấp',
  76: 'Thay vòng lặp liên tục bằng cơ chế chờ',
  77: 'Dừng tác vụ khi không còn cần thiết',
  78: 'Giảm tần suất tác vụ nền',
  79: 'Tránh vòng lặp/bộ hẹn giờ trùng nhau',
  80: 'Hủy tác vụ khi đối tượng bị xóa',
  81: 'Gộp các tác vụ nhỏ',
  82: 'Chia tác vụ nặng thành từng phần',
  83: 'Giới hạn số tác vụ đồng thời',
  84: 'Tránh chờ đồng bộ không cần thiết',
  85: 'Bỏ qua yêu cầu đã lỗi thời',
  86: 'Giảm kiểm tra trạng thái liên tục',
  87: 'Ưu tiên tác vụ ảnh hưởng gameplay',
  88: 'Dùng task.spawn/task.defer',
  89: 'Tránh giữ tài nguyên hoặc chờ quá lâu',
  90: 'Đo thời gian chạy các tác vụ quan trọng',
  91: 'Giảm số vật thể vật lý do hệ thống tạo',
  92: 'Hạn chế vật thể động không cần thiết',
  93: 'Đặt trạng thái vật lý phù hợp',
  94: 'Dùng collider đơn giản',
  95: 'Giảm số lần kiểm tra va chạm từ script',
  96: 'Điều chỉnh tần suất mô phỏng logic',
  97: 'Tránh tạo nhiều collider chồng lấn',
  98: 'Ngăn vòng lặp xử lý va chạm lặp lại',
  99: 'Tối ưu truy vấn Raycast',
  100: 'Chỉ thực hiện truy vấn vật lý khi cần',
  101: 'Giảm số âm thanh phát đồng thời',
  102: 'Dừng âm thanh không còn cần thiết',
  103: 'Tái sử dụng đối tượng âm thanh',
  104: 'Tránh phát cùng âm thanh liên tục',
  105: 'Giới hạn hiệu ứng âm thanh',
  106: 'Giải phóng tài nguyên âm thanh',
  107: 'Tải âm thanh theo nhu cầu',
  108: 'Giảm tác vụ xử lý âm thanh',
  109: 'Chỉ cập nhật UI khi dữ liệu thay đổi',
  110: 'Giảm số thành phần giao diện do script tạo',
  111: 'Tái sử dụng thành phần giao diện',
  112: 'Hạn chế hiệu ứng giao diện nặng',
  113: 'Tối ưu danh sách dài (chỉ tạo phần cần thiết)',
  114: 'Không dựng lại toàn bộ UI khi đổi một giá trị',
  115: 'Ngắt kết nối sự kiện của GUI đã đóng',
  116: 'Tải tài nguyên theo nhu cầu',
  117: 'Tránh tải trước tài nguyên không cần thiết',
  118: 'Dùng hình ảnh kích thước phù hợp',
  119: 'Tối ưu mô hình và tài nguyên trong Studio',
  120: 'Cache tài nguyên thường dùng',
  121: 'Tránh tải cùng tài nguyên nhiều lần',
  122: 'Chia nhỏ dữ liệu lớn',
  123: 'Ưu tiên tài nguyên thiết yếu',
  124: 'Xử lý lỗi tải tài nguyên có kiểm soát',
  125: 'Dọn tài nguyên khi rời khu vực',
  126: 'Loại bỏ mã chết',
  127: 'Loại bỏ nhánh điều kiện dư thừa',
  128: 'Tái sử dụng hàm xử lý chung',
  129: 'Chọn cấu trúc dữ liệu phù hợp',
  130: 'Dùng cấu trúc tìm kiếm hiệu quả',
  131: 'Giảm thao tác đọc ghi dữ liệu',
  132: 'Chia mã nguồn thành mô-đun',
  133: 'Xử lý lỗi tránh vòng lặp thất bại',
  134: 'Hạn chế ghi log quá nhiều',
  135: 'Kiểm tra hiệu năng sau mỗi thay đổi',
  136: 'Giảm tần suất tính đường đi NPC',
  137: 'Chỉ cập nhật AI khi có thay đổi',
  138: 'Giảm số NPC xử lý đầy đủ cùng lúc',
  139: 'Logic đơn giản hơn cho NPC ở xa',
  140: 'Tái sử dụng kết quả tìm đường',
  141: 'Giới hạn yêu cầu tìm đường đồng thời',
  142: 'Giảm số mục tiêu đánh giá mỗi chu kỳ',
  143: 'Giảm tần suất kiểm tra tầm nhìn',
  144: 'Dừng xử lý AI cho NPC không hoạt động',
  145: 'Chia cấp độ xử lý AI theo khoảng cách',
  146: 'Đo FPS trước khi tối ưu',
  147: 'Đo FPS sau khi tối ưu',
  148: 'Theo dõi CPU bằng công cụ profiling',
  149: 'Theo dõi bộ nhớ',
  150: 'Kiểm tra tải GPU',
  151: 'Theo dõi ping',
  152: 'Kiểm tra mức tăng RAM theo thời gian',
  153: 'Kiểm tra rò rỉ tài nguyên',
  154: 'Tạo bài kiểm tra tải',
  155: 'Kiểm tra khi có nhiều người chơi',
  156: 'Kiểm tra trên thiết bị cấu hình thấp',
  157: 'Kiểm thử hồi quy sau khi sửa',
  158: 'So sánh kết quả trước và sau tối ưu',
  159: 'Tắt tính năng tối ưu nếu gây lỗi',
  160: 'Ghi lại các thay đổi cấu hình',
  161: 'Điều chỉnh chất lượng hiệu ứng theo hiệu năng',
  162: 'Dùng cơ chế giảm tải thích ứng',
  163: 'Phân bổ ngân sách thời gian mỗi khung hình',
  164: 'Ưu tiên tài nguyên theo khoảng cách',
  165: 'Quản lý tài nguyên tập trung',
  166: 'Phát hiện tác vụ vượt ngưỡng thời gian',
  167: 'Tối ưu cấu trúc dữ liệu không gian',
  168: 'Dùng bộ đệm theo vòng đời đối tượng',
  169: 'Tự phân tích dữ liệu hiệu năng để đề xuất',
  170: 'Kiểm thử hiệu năng định kỳ',
};

/* Nhóm A..K theo số thứ tự, để gộp bảng. */
const SECTIONS = [
  ['A. Loại bỏ phép tính dư thừa', 1, 14],
  ['B. Tối ưu RAM và đối tượng', 16, 30],
  ['C. Tối ưu FPS và cập nhật', 31, 45],
  ['D. Tối ưu vật thể và hiệu ứng', 46, 60],
  ['E. Tối ưu mạng client-server', 61, 75],
  ['F. Tối ưu tác vụ và sự kiện', 76, 90],
  ['G. Tối ưu vật lý', 91, 100],
  ['H. Tối ưu âm thanh và giao diện', 101, 115],
  ['I. Tối ưu tải dữ liệu và mã nguồn', 116, 135],
  ['J. Tối ưu AI, NPC và kiểm thử', 136, 160],
  ['K. Tối ưu nâng cao', 161, 170],
];

/* ---------- đọc catalog thật ---------- */
const h = createRuntime({});
const raw = String(h.eval(`
  local M = __RALO_REQUIRE('Shared/Methods')
  local L = {}
  for _, e in ipairs(M.List) do
    L[#L+1] = e.id .. '@' .. e.status .. '@' .. (e.name or '')
  end
  return table.concat(L, ';;')
`));
const CATALOG = {};
for (const line of raw.split(';;')) {
  const [id, status, name] = line.split('@');
  if (id) CATALOG[id] = { status, name };
}
if (Object.keys(CATALOG).length < 100) throw new Error('đọc catalog thất bại: ' + Object.keys(CATALOG).length);

/* ---------- phân loại ---------- */
// Xếp hạng: B > A > C > D > E. Mục được xếp theo ID TỐT NHẤT mà nó có.
const RANK = { B: 4, A: 3, C: 2, D: 1, E: 0 };

function classify(ids) {
  if (!ids || ids.length === 0) return { verdict: 'KHÔNG CÓ', best: null, ids: [] };
  const missing = ids.filter((id) => !CATALOG[id]);
  if (missing.length > 0) {
    throw new Error('ID không tồn tại trong catalog: ' + missing.join(', '));
  }
  let best = ids[0];
  for (const id of ids) {
    if (RANK[CATALOG[id].status] > RANK[CATALOG[best].status]) best = id;
  }
  const st = CATALOG[best].status;
  let verdict;
  if (st === 'B') verdict = 'CÓ — có test';
  else if (st === 'A') verdict = 'CÓ — chưa test riêng';
  else if (st === 'C') verdict = 'CÓ — chưa test';
  else if (st === 'D') verdict = 'CHỈ LÀ ĐỀ XUẤT (chưa có mã)';
  else verdict = 'KHÔNG ÁP DỤNG';
  return { verdict, best, ids };
}

const rows = [];
const tally = { 'CÓ — có test': 0, 'CÓ — chưa test riêng': 0, 'CHỈ LÀ ĐỀ XUẤT (chưa có mã)': 0, 'KHÔNG ÁP DỤNG': 0, 'KHÔNG CÓ': 0 };

for (const num of Object.keys(MAPPING).map(Number).sort((a, b) => a - b)) {
  const r = classify(MAPPING[num]);
  tally[r.verdict] += 1;
  rows.push({ num, label: LABELS[num] || '(thiếu nhãn)', ...r });
}

/* ---------- sinh tài liệu ---------- */
let md = `# 9. Đối chiếu danh sách 170 mục của bạn với mã nguồn

Tệp này sinh bởi \`node tools/map-coverage.js\`. Mỗi mục của bạn được gán cho
các ID **có thật** trong \`src/Shared/Methods.luau\`; trạng thái lấy **từ catalog**,
không tự đánh giá. Nếu một mục chỉ trỏ tới các ID trạng thái **D** thì nó được
tính là **chưa có mã** — không tính là "có".

## 9.1 Kết quả đối chiếu

| Kết quả | Số mục | Nghĩa |
| ------- | ------ | ----- |
| **CÓ — có test** | ${tally['CÓ — có test']} | Có mã thật **và** có test đang đạt trong harness |
| **CÓ — chưa test riêng** | ${tally['CÓ — chưa test riêng']} | Có mã thật, chưa có test khai riêng ID đó |
| **CHỈ LÀ ĐỀ XUẤT** | ${tally['CHỈ LÀ ĐỀ XUẤT (chưa có mã)']} | **Chưa có mã** — chỉ có mô tả trong catalog |
| **KHÔNG ÁP DỤNG** | ${tally['KHÔNG ÁP DỤNG']} | Không làm được trong phạm vi LocalScript |
| **KHÔNG CÓ** | ${tally['KHÔNG CÓ']} | Dự án **hoàn toàn không có** |
| **Tổng** | ${rows.length} | |

> **Đọc kỹ:** ${tally['CÓ — có test'] + tally['CÓ — chưa test riêng']} / ${rows.length} mục có mã thật.
> ${tally['CHỈ LÀ ĐỀ XUẤT (chưa có mã)']} mục chỉ là đề xuất, ${tally['KHÔNG CÓ']} mục không có,
> ${tally['KHÔNG ÁP DỤNG']} mục không áp dụng được.
>
> Và "có test" ở đây là **test trong harness Lua**, không phải chạy trong Roblox Studio.

## 9.2 Bảng đối chiếu chi tiết

`;

for (const [title, from, to] of SECTIONS) {
  md += `### ${title}\n\n`;
  md += '| # | Mục của bạn | Kết quả | ID trong dự án |\n';
  md += '| - | ----------- | ------- | -------------- |\n';
  for (const r of rows) {
    if (r.num < from || r.num > to) continue;
    const idCell = r.ids.length === 0
      ? '—'
      : r.ids.map((id) => `\`${id}\`(${CATALOG[id].status})`).join(', ');
    md += `| ${r.num} | ${r.label} | ${r.verdict} | ${idCell} |\n`;
  }
  md += '\n';
}

const missing = rows.filter((r) => r.verdict === 'KHÔNG CÓ');
md += `## 9.3 Những mục dự án KHÔNG CÓ

Đây là phần bạn cần biết rõ nhất — ${missing.length} mục:

| # | Mục | Vì sao chưa có |
| - | --- | -------------- |
`;
const REASONS = {
  69: 'Nội suy chuyển động cần hệ thống nhân vật/vehicle do bạn kiểm soát. Dự án không tự ý nội suy nhân vật của game.',
  70: 'Client prediction đụng trực tiếp gameplay và chống gian lận. Ngoài phạm vi "không đổi gameplay".',
  94: 'Collider đơn giản là việc thiết kế asset trong Studio, không phải thứ script runtime làm được.',
  97: 'Tương tự — thuộc thiết kế asset trong Studio.',
  113: 'Danh sách ảo hoá (virtualized list) cần biết UI game của bạn. Chưa triển khai.',
  126: 'Loại bỏ mã chết là quy trình review mã, không phải tính năng runtime.',
  127: 'Tương tự — quy trình review.',
  154: 'Bài test tải cần Studio + nhiều client thật. Không có trong môi trường này.',
  155: 'Tương tự — cần nhiều người chơi thật.',
  169: 'Tự phân tích và đề xuất cách sửa: chưa triển khai. Hiện chỉ có đo và cảnh báo vượt ngưỡng (HEAVY-005).',
  71: 'Cần hệ thống remote của game. Dự án không tự định nghĩa giao thức mạng cho game của bạn.',
  73: 'Net.Stats() chỉ đếm queued/sent/suppressed/batched — KHÔNG đo ping. Muốn đo ping phải có round-trip qua RemoteFunction do game cung cấp.',
  75: 'Measure.Run chỉ đo thời gian khung hình qua RenderStepped. Không có số đo network nên KHÔNG tách được lag mạng khỏi FPS thấp.',
  150: 'Không có API nào trong LocalScript đọc được tải GPU. Phải dùng View -> Stats hoặc MicroProfiler trong Studio.',
  151: 'Giống mục 73 — chưa có code đo ping.',
};
for (const r of missing) {
  md += `| ${r.num} | ${r.label} | ${REASONS[r.num] || 'Chưa triển khai.'} |\n`;
}

const proposalOnly = rows.filter((r) => r.verdict === 'CHỈ LÀ ĐỀ XUẤT (chưa có mã)');
md += `
## 9.4 Những mục CHỈ LÀ ĐỀ XUẤT (chưa có mã)

${proposalOnly.length} mục dưới đây có tên trong catalog nhưng **chưa có dòng mã nào**.
Đừng hiểu nhầm là đã làm:

| # | Mục | ID |
| - | --- | -- |
`;
for (const r of proposalOnly) {
  md += `| ${r.num} | ${r.label} | ${r.ids.map((id) => `\`${id}\``).join(', ')} |\n`;
}

md += `
## 9.5 Nhóm yếu nhất

Nhóm **H (âm thanh)** gần như chưa có mã: mọi ID \`AUDIO-*\` đều là D hoặc E.
Dự án **không** đụng âm thanh của game — đó là lựa chọn có chủ ý (âm thanh là
tính năng gameplay), nhưng nếu bạn cần thì đó là phần phải viết thêm.

Nhóm **G (vật lý)** cũng yếu: \`PHYSICS-001/002\` có mã nhưng **mặc định TẮT**
trong \`Config.luau\` vì có đánh đổi cảm giác chơi; \`PHYSICS-003/004/005\` chỉ là đề xuất.

Nhóm **J (AI/NPC)** phần lớn là đề xuất: chỉ \`NPC-003\` (kiểm tra rẻ trước khi tìm
đường đắt) là có test.

## 9.6 Cách tự kiểm chứng

\`\`\`bash
node tools/map-coverage.js     # sinh lại tệp này
npm run catalog                # kiểm catalog khớp mã nguồn
npm run test                   # 115 test
\`\`\`

Nếu bạn thêm mã cho một mục đang là D, hãy đổi trạng thái trong
\`src/Shared/Methods.luau\` và viết test khai ID đó — \`verify-catalog.js\` sẽ từ chối
nếu khai B mà không có test.
`;

const OUT = path.join(__dirname, '..', 'docs', '09-doi-chieu-170-muc.md');
fs.writeFileSync(OUT, md);

console.log('=== ĐỐI CHIẾU 170 MỤC ===');
console.log('Tổng số mục đối chiếu :', rows.length);
for (const [k, v] of Object.entries(tally)) console.log('  ' + k.padEnd(30), ':', v);
console.log('\nĐã ghi', path.relative(process.cwd(), OUT));
