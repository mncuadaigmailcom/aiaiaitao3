# 05 · Kiểm thử & kết quả thật

## 1. Cách chạy

```bash
cd secure-script
node tests/run-node.mjs      # 80 kiểm thử lõi (không cần cài gì)
node tools/check-static.mjs  # 43 kiểm tra tĩnh HTML ↔ app.js
node tools/cli.mjs selftest  # kiểm tra nhanh CLI

npm install                  # chỉ cần cho test DOM (jsdom)
node tests/run-dom.mjs       # 47 kiểm thử giao diện + gói demo trên DOM ả
```

Yêu cầu: Node 18+ (đã chạy trên Node 22.22.3). Test lõi và test tĩnh không cần
thư viện ngoài.

## 2. Kết quả lần chạy gần nhất

```
Node v22.22.3 · WebCrypto: true
[1] Mã hoá / giải mã vòng lặp        13/13
[2] Bảo mật & toàn vẹn               10/10
[3] Header & thời gian               10/10
[4] Key script sinh ra chạy thật     10/10
[4b] Bắt buộc phải có key script     11/11
[5] ZIP & tiện ích                    7/7
[6] Công cụ dịch ngược               15/15
[7] Thông lượng                       4/4
─────────────────────────────────────────────
Kết quả: 80 đạt · 0 lỗi · ~4,6 s

Kiểm tra tĩnh (tools/check-static.mjs): 43 đạt · 0 lỗi
Kiểm thử DOM  (tests/run-dom.mjs)     : 47 đạt · 0 lỗi
```

Tổng: **170 điểm kiểm tra đạt**.

## 3. Chi tiết từng nhóm

### [1] Vòng lặp

- Khối 64 KiB / 256 KiB / 1 MiB: nội dung khớp từng byte.
- Số khối = `ceil(kích thước / kích thước khối)`.
- `kích thước tệp .aia = header + bản rõ + 16 × số khối` (đúng đến byte).
- Tệp rỗng; tệp chia hết khối (3 khối chính xác); đọc/ghi từng mảnh 333–1000 byte.

### [2] Bảo mật

| Kịch bản | Mã lỗi mong đợi | Kết quả |
|---|---|---|
| Sai mật khẩu | `WRONG_PASSPHRASE` | ✔ |
| Sửa `keyUrl` trong header | `WRONG_PASSPHRASE` | ✔ |
| Sửa 1 bit trong bản mã | `AUTH_FAILED` | ✔ |
| Cắt bớt 100 byte | `UNEXPECTED_EOF` | ✔ |
| Ghép thêm 32 byte | `TRAILING_DATA` | ✔ |
| Đảo 2 khối | `AUTH_FAILED` | ✔ |
| Sai magic | `BAD_MAGIC` | ✔ |
| Tệp > 5 GiB | `TOO_LARGE` | ✔ |

Ngoài ra: `iterations` < 10.000 bị kẹp; `chunkSize` < 64 KiB bị kẹp.

### [3] Header

- `time.raw` đúng **17 chữ số** `YYYYMMDDHHmmssSSS`.
- `time.readable` dạng `2026-10-23 16:50:38.881`.
- `unixMs` nằm trong khoảng trước/sau khi mã hoá.
- Đọc header **không cần mật khẩu** (cả từ `Uint8Array` và từ luồng 7 byte/lần).
- Chuỗi thời gian **xuất hiện nguyên văn** trong tệp .aia (đúng yêu cầu "không mã hoá").

### [4] Key script

- Sinh ra `AIA_UNLOCK`, có khối `/*<AIA:META>*/…/*</AIA:META>*/`.
- **Chạy thật** trong Node: giải mã đúng nội dung gốc.
- Từ chối mật khẩu sai.
- Bản có mật khẩu nhúng: giải mã không cần nhập.
- Bản đã hết hạn: báo "hết hạn", không giải mã.

### [4b] Bắt buộc key script

- `keyWrapIn = "key-script"`, META có `keyWrap`, **header `.aia` không có**.
- Thiếu `keyWrap` → `KEY_REQUIRED`; sai mật khẩu vẫn bị `WRONG_PASSPHRASE` trước.
- Có `keyWrap` → giải mã đúng.
- Sửa 1 byte trong `keyWrap.ct` → `WRAP_FAILED`.
- Key script thật mở được; key script bị xoá `keyWrap` → bị từ chối.
- Chế độ cũ (không bắt buộc) vẫn giải mã được không cần key script.

### [5] ZIP

- 2 mục, tên đúng, CRC32 đúng, dữ liệu nhị phân giữ nguyên.
- `slugify` bỏ dấu tiếng Việt, `formatBytes`, đoán ngôn ngữ.

### [6] Dịch ngược

- Làm đẹp **không đổi token** (so sánh token trước/sau).
- Rút gọn **không đổi token**, nhỏ hơn bản gốc.
- Bỏ chú thích: mất `//`, giữ code.
- Lua: thụt lề theo `then/else/end`.
- Base64, `\xNN`, phân tích `eval/atob/fetch`, đổi tên biến, tách chuỗi.

### [7] Thông lượng (máy ảo, chỉ để tham khảo)

Tệp 8 MiB, khối 1 MiB:

| Việc | Thời gian |
|---|---|
| Mã hoá (gồm PBKDF2 600k) | ~0,14 s |
| Giải mã | ~0,15 s |

Kích thước: **+844 byte** (header 716 byte + 128 byte tag) = **0,0101 %**.
Chỉ riêng tag: 128 B = **0,0015 %**.

> Đây là số đo trên máy ảo không GPU, không phải cam kết. Máy thật thường nhanh hơn.

## 3b. Kiểm thử DOM ả (jsdom)

`tests/run-dom.mjs` nạp `index.html` vào jsdom, gán `document`/`window` rồi import
`assets/app.js` như trong trình duyệt, và mô phỏng thao tác thật:

1. Dán code, đặt mật khẩu → bấm **Mã hoá ngay**.
2. Chờ kết quả: kiểm tra thống kê, dòng **"Tự kiểm tra: khớp 100%"**, key script có
   `AIA_UNLOCK` + `META`, header có `time.raw` 17 chữ số, `keyUrl`, AES-256-GCM, 600k vòng.
3. Tải ZIP, tải key script.
4. **Chạy thử ngay**: giải mã trong bộ nhớ rồi chạy (Worker giả) — log hiện ra.
5. Tab **Giải mã**: tạo tệp `.aia` thật, gán vào ô chọn tệp, đọc header, thử **sai**
   mật khẩu (phải báo lỗi), rồi **đúng** mật khẩu (báo SHA-256 khớp, hiện bản rõ),
   bấm chạy, tải bản rõ.
6. Tab **Dịch ngược**: làm đẹp + phân tích + "đưa sang mã hoá".
7. **Gói demo phát hành kèm** (`examples/demo/`): nạp `hello.key.js` thật, giải mã
   `hello.aia` khớp 100 % với `examples/hello.js`, gọi đúng tệp dữ liệu, từ chối mật khẩu sai.
8. **Bản mã bắt buộc key script** trên giao diện: thiếu key → báo "yêu cầu key script";
   nạp key → giải mã đúng.
9. Không có lỗi runtime nào.

Worker được thay bằng lớp giả (jsdom không có Worker), nên bước này kiểm tra **dây nối
giao diện**, không kiểm tra việc thực thi code thật trong Worker — phần đó do test lõi
và key script đảm nhiệm.

## 4. Kiểm tra tĩnh giao diện

`tools/check-static.mjs` kiểm tra:

- mọi `id` mà `app.js` dùng đều tồn tại trong `index.html`;
- không có `id` trùng;
- mọi `src`/`href` nội bộ trỏ tới tệp có thật;
- `index.html` nạp `assets/app.js` dưới dạng module;
- tài liệu trong `docs/` tồn tại;
- không có `http://` không bảo mật trong mã.

## 5. Những gì KHÔNG được kiểm thử

- **Chưa chạy trên trình duyệt thật** trong môi trường này (không có Chrome/Playwright).
  Giao diện đã được kiểm thử trên **DOM ả (jsdom)** + kiểm tra tĩnh, nhưng jsdom không
  mô phỏng CSS, layout, `File System Access API`, hay khác biệt WebCrypto giữa các
  trình duyệt. Vẫn nên bấm thử một lần.
- Chưa thử tệp **5 GiB** thật (không đủ RAM/thời gian trong môi trường làm việc).
- Chưa thử Firefox/Safari, chưa thử WebView trên điện thoại.
- Chưa đo mức tiêu thụ RAM/CPU bằng công cụ hệ thống.

Nếu bạn chạy thử và gặp lỗi, gửi lại thông báo trong tab "Nhật ký" — mã lỗi
(`WRONG_PASSPHRASE`, `AUTH_FAILED`…) chỉ ra đúng chỗ.

## 6. Kịch bản kiểm thử thủ công (khuyến nghị làm 1 lần)

1. Chạy `python3 -m http.server 8080` trong `secure-script`.
2. Mở `http://localhost:8080`.
3. Dán một script nhỏ, đặt mật khẩu, bấm **Mã hoá ngay**.
4. Bấm **Chạy thử ngay** → phải thấy log của script và dòng "chạy xong".
5. Tải ZIP → giải nén → mở `run-*.html` qua HTTP → nhập mật khẩu → chạy.
6. Giải mã với **sai** mật khẩu → phải báo "Sai mật khẩu".
7. Sửa 1 byte trong `.aia` bằng `hexedit`/`python` → phải báo lỗi khối.
8. Mở tab Dịch ngược, dán một đoạn code rối → bấm **Làm đẹp**.
