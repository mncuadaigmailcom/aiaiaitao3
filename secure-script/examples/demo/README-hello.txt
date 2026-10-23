AIA SECURE SCRIPT — GÓI BẢN MÃ
=====================================

Tệp gốc      : hello.js
Kích thước   : 549 B (549 byte)
Thời gian tạo: 2026-10-23 16:57:40.986  (raw=20261023165740986, unixMs=1792774660986)
Link key     : ./hello.key.js
Mã hoá       : AES-256-GCM, PBKDF2-HMAC-SHA256 600000 vòng
Tệp dữ liệu  : hello.aia
Bắt buộc key : CÓ — khoá tệp chỉ nằm trong key script, thiếu là không mở được
Hạn dùng     : không đặt

CÁCH CHẠY (QUAN TRỌNG)
-----------------------
1) Đặt 3 tệp cạnh nhau:
     hello.aia
     hello.key.js
     run-hello.html
2) Phục vụ thư mục bằng HTTP (KHÔNG mở file:// trực tiếp):
     python3 -m http.server 8080
     # rồi mở: http://localhost:8080/run-hello.html
3) Nhập mật khẩu (nếu lúc mã hoá có đặt) và bấm "Giải mã & chạy".

Hoặc nhúng vào trang của bạn:
     <script src="./hello.key.js"></script>
     <script>
       AIA_UNLOCK.run({ passphrase: '...', execute: true })
         .catch(function (e) { console.error(e.message); });
     </script>

CẢNH BÁO BẢO MẬT
-----------------
- Header chứa ngày giờ + link key ở dạng ĐỌC ĐƯỢC (theo thiết kế). Vì vậy mật khẩu
  là bí mật thật sự duy nhất. Nếu không đặt mật khẩu, ai có 2 tệp là mở được.
- Hạn dùng (expiry) chỉ là kiểm tra phía client, có thể bị vô hiệu hoá bằng cách sửa code.
- Không có hệ thống nào bảo vệ code tuyệt đối khi chạy trên máy người khác.
