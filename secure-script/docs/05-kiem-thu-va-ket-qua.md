# 05 · Kiểm thử & kết quả thật

## 1. Cách chạy

```bash
cd secure-script
node tests/run-node.mjs      # 127 kiểm thử lõi (không cần cài gì)
node tools/check-static.mjs  # 44 kiểm tra tĩnh HTML ↔ app.js
node tools/cli.mjs selftest  # kiểm tra nhanh CLI

npm install                  # chỉ cần cho test DOM (jsdom)
node tests/run-dom.mjs       # 65 kiểm thử giao diện + gói demo trên DOM ả
node tests/stress.mjs --quick   # 45 bài kiểm thử cường độ cao (~19 s)
```

Yêu cầu: Node 18+ (đã chạy trên Node 22.22.3). Test lõi và test tĩnh không cần
thư viện ngoài.

## 2. Kết quả lần chạy gần nhất

```
Node v22.22.3 · WebCrypto: true
[1] Mã hoá / giải mã vòng lặp        13/13
[2] Bảo mật & toàn vẹn               10/10
[3] Header & thời gian               16/16
[4] Key script sinh ra chạy thật     10/10
[4b] Bắt buộc phải có key script     11/11
[4c] Key script DÙNG CHUNG           22/22
[4d] Snippet "chép là chạy"          19/19
[5] ZIP & tiện ích                    7/7
[6] Công cụ dịch ngược               15/15
[7] Thông lượng                       4/4
─────────────────────────────────────────────
Kết quả: 127 đạt · 0 lỗi · ~6,0 s

Kiểm tra tĩnh (tools/check-static.mjs): 44 đạt · 0 lỗi
Kiểm thử DOM  (tests/run-dom.mjs)     : 65 đạt · 0 lỗi
Kiểm thử cường độ cao (stress.mjs --quick): 45/45 đạt · 0 lỗi · ~19 s
```

Tổng: **281 điểm kiểm tra đạt** (127 + 44 + 65 + 45).

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
- `headerHash` = SHA-256(JSON header, `headerHash` thay bằng 64 số 0, bỏ `keyWrap`/`encryptionSeconds`).
- Sửa **bất kỳ** trường nào (ghi chú, tên tệp, thời gian đọc được, link key, số khối) đều bị
  `HEADER_TAMPERED` — fuzz 600/600 ca bị phát hiện.

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

### [4c] Key script DÙNG CHUNG (mới)

- `keyMode: 'shared'` → `keyWrapIn = "shared-key-script"`, `keyUrl = "./aia.key.js"` cố định.
- `sharedKeyId` (8 byte hex) = SHA-256(khoá gốc) rút gọn, để biết key script có đúng bộ.
- **10 lần mã hoá → cùng một link key** và cùng `sharedKeyId`.
- Một khoá chung mở được **mọi** tệp trong bộ; thiếu khoá → `KEY_REQUIRED`;
  khoá khác → `WRONG_SHARED_KEY`; sai mật khẩu → `WRONG_PASSPHRASE`.
- `keyWrap` nằm trong header (tệp tự chứa), nhưng bản thân nó được AES-GCM xác thực bằng
  khoá phụ thuộc **khoá chung + mật khẩu**. Sửa header → `HEADER_TAMPERED`.
- `aia.key.js` phát hành kèm site được nạp trong sandbox và **tự mở đúng** bản mã
  (không dùng mã nguồn core ⇒ chứng minh script độc lập chạy được).

### [4d] Snippet "chép là chạy" (mới)

- Snippet nhúng **link key script tuyệt đối** + **bản mã Base64**; `DATA` giải mã ra **đúng từng byte** tệp `.aia`.
- Chạy thật trong sandbox có `<script src>`: tự nạp `aia.key.js`, tự giải mã, **chạy code gốc** (log `TONG = 55`, biến toàn cục do code gốc tạo ra tồn tại).
- 3 chế độ mật khẩu: không mật khẩu (`PASS = ""`), nhúng sẵn (`PASS = "…"`), hỏi khi chạy (`PASS = null` + `prompt`).
- Sai mật khẩu / link hỏng → `console.error` rõ ràng, **không ném lỗi văng ra ngoài**.
- Chế độ **riêng từng tệp**: snippet nhúng thẳng mã nguồn key script ⇒ chạy được **không cần mạng**.
- Tệp `.lua`: `EXEC = false` → tải bản rõ thay vì chạy.

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

Kích thước: **+962 byte** (header 834 byte + 128 byte tag) = **0,0115 %**.
Chỉ riêng tag: 128 B = **0,0015 %**.

> Đây là số đo trên máy ảo không GPU, không phải cam kết. Máy thật thường nhanh hơn.

## 3b. Kiểm thử DOM ả (jsdom)

`tests/run-dom.mjs` nạp `index.html` vào jsdom, gán `document`/`window` rồi import
`assets/app.js` như trong trình duyệt, và mô phỏng thao tác thật:

1. Dán code (không bấm gì thêm) → **tự động mã hoá**; kiểm tra đã bỏ nút "Dùng nội dung này".
2. Chờ kết quả: kiểm tra thống kê, dòng **"Tự kiểm tra: khớp 100%"**, key script dùng chung có
   `AIA_KEY` + `masterKey`, header có `time.raw` 17 chữ số, `keyUrl = ./aia.key.js`,
   `sharedKeyId`, `headerHash`, AES-256-GCM, 600k vòng.
   **Khung code đã mã hoá**: Base64 bắt đầu `QUlBU0NSMQ` (= "AIASCR1"), chuyển Hex đúng
   `414941534352310a`, có nút **Chép**.
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
- Chưa thử tệp **5 GiB** thật (đã thử tới **1 GiB** trong `stress.mjs --max`).
- Chưa thử Firefox/Safari, chưa thử WebView trên điện thoại.
- RAM đo bằng `process.memoryUsage().rss` trong tiến trình riêng (không phải công cụ hệ thống),
  CPU chỉ suy ra từ thời gian chạy.

Nếu bạn chạy thử và gặp lỗi, gửi lại thông báo trong tab "Nhật ký" — mã lỗi
(`WRONG_PASSPHRASE`, `AUTH_FAILED`…) chỉ ra đúng chỗ.

## 6. Kịch bản kiểm thử thủ công (khuyến nghị làm 1 lần)

1. Chạy `python3 -m http.server 8080` trong `secure-script`.
2. Mở `http://localhost:8080`.
3. Dán một script nhỏ (không cần bấm gì) → phải **tự mã hoá**; xem khung **Code đã mã hoá** và bấm **Chép**.
4. Bấm **Chạy thử ngay** → phải thấy log của script và dòng "chạy xong".
5. Tải ZIP → giải nén → mở `run-*.html` qua HTTP → nhập mật khẩu → chạy.
6. Giải mã với **sai** mật khẩu → phải báo "Sai mật khẩu".
7. Sửa 1 byte trong `.aia` bằng `hexedit`/`python` → phải báo lỗi khối.
8. Mở tab Dịch ngược, dán một đoạn code rối → bấm **Làm đẹp**.

## 7. Kiểm thử cường độ cao (`tests/stress.mjs`)

10 nhóm + 1 nhóm RAM, chạy được ở 3 mức: `--quick` (mặc định, ~21 s), `--heavy`
(~75 s), `--max` (~90 s, tệp 1 GiB). Cờ khác: `--size`, `--fuzz`, `--soak`, `--json`.

| Nhóm | Nội dung | Kết quả (`--quick`) |
|---|---|---|
| 1. Biên | 0 B, 1 B, đúng 1 khối, 1 khối + 1 B, khối nhỏ nhất | ✔ |
| 2. Ngẫu nhiên | 40 kích thước ngẫu nhiên 0–3 MiB, so SHA-256 | ✔ |
| 3. Fuzz | 120 ca: đảo bit, cắt bớt, ghép thêm, đảo khối, sửa header | ✔ 120/120 |
| 4. Duy nhất | 2 bản mã cùng đầu vào phải khác nhau (IV/salt ngẫu nhiên) | ✔ |
| 5. Song song | 8 luồng × 4 MiB, không lẫn dữ liệu, mật khẩu chéo bị chặn | ✔ |
| 6. Soak | 40 vòng mã hoá/giải mã liên tục, RAM không phình | ✔ |
| 7. KDF | 10k/100k/600k/1,2M vòng + 30 mật khẩu sai | ✔ |
| 7b. RAM | đo trong tiến trình con có `--expose-gc`, so 32 MiB với 256 MiB–1 GiB | ✔ |
| 8. Giới hạn | > 5 GiB, chunk/iterations quá nhỏ/lớn | ✔ |
| 9. Huỷ | dừng giữa đường, không ghi tiếp | ✔ |
| 10. Tệp lớn | 64 MiB (1 GiB với `--max`), so SHA-256 từng byte | ✔ |
| 11. Snippet | 0 B/1 B/1 KiB/64 KiB/1,5 MiB, chi phí Base64 ×1,34, 3 chế độ mật khẩu | ✔ |

Số đo thật (`--max`, máy 2 CPU):

```
Tệp 1024 MiB: mã hoá 2,21 s (464 MiB/s) · giải mã 2,81 s (365 MiB/s)
Chi phí dung lượng: +17.215 byte (0,0016 %)
RAM: nền 213 MiB → mã hoá 1 GiB chỉ tăng 20,8 MiB; giải mã tăng 1,1 MiB
     (tệp lớn gấp 32 lần nhưng RAM không tăng ⇒ xử lý đúng kiểu luồng)
Fuzz 600/600 ca bị phát hiện (đảo bit 120 · cắt 120 · ghép 120 · đảo khối 153 · header 120)
30/30 mật khẩu sai bị chặn trong 0,07 s · ~8,6 lần thử/giây ở 600k vòng
```

### Lỗi thật mà bộ test cường độ cao tìm ra (đã sửa)

1. `crypto.getRandomValues` giới hạn 65.536 byte/lần → `randomBytes(1 MiB)` ném
   `QuotaExceededError`. Đã sửa: chia khối 65.536 byte.
2. **8/120 ca sửa header không bị phát hiện** (chỉ sửa ghi chú/tên tệp/thời gian đọc được
   thì tag AES-GCM vẫn đúng) → thêm `headerHash` (SHA-256 toàn header) + AAD khối 50 byte.
3. **RAM phình theo kích thước tệp** trong CLI/harness: adapter `fs.createReadStream` đẩy
   dữ liệu vào `ReadableStream` mà **không tôn trọng backpressure**. Đã sửa thành adapter
   kiểu `pull()`: 256 MiB trước đây tăng ~190 MiB RAM, nay chỉ ~14 MiB.
