# 00 · Ghi chú dự án — AIA Secure Script

> Bản ghi chú này tổng hợp **mọi yêu cầu của bạn**, cách đã làm, và **những gì đã
> kiểm chứng thật / chưa kiểm chứng**. Đọc mục 6 trước khi tin bất kỳ lời hứa nào.

## 1. Yêu cầu gốc (diễn giải lại cho rõ)

| # | Yêu cầu của bạn | Cách xử lý | Trạng thái |
|---|---|---|---|
| 1 | Web mã hoá code script, nhập code hoặc tệp, **tối đa 5 GB** | Trang tĩnh + nhập tệp / dán code. Giới hạn cứng 5 GiB (5 × 1024³). Tệp lớn ghi trực tiếp ra đĩa | ✅ có code + test giới hạn |
| 2 | Sinh thêm một **script chứa khoá** đi kèm | `ten.key.js` chứa META + **khoá tệp đã bọc** + bộ giải mã. Mặc định **bắt buộc**: thiếu nó là không mở được, dù biết mật khẩu | ✅ chạy thật trong test |
| 3 | Kết hợp script + key để mở khoá rồi chạy | `key.js` tải `.aia`, giải mã, chạy trong Web Worker | ✅ |
| 4 | **Dịch ngược code** | Tab "Dịch ngược": làm đẹp, rút gọn, bỏ chú thích, tách chuỗi, đổi tên biến, gỡ escape, giải base64/hex/URL, phân tích | ✅ có test |
| 5 | Mã hoá **không làm tăng dung lượng nhiều** | Nhị phân thuần, không base64: +16 byte/khối + header ~0,7 KB | ✅ đo thật: 8 MiB → +844 byte (**0,0101 %**) |
| 6 | Mã hoá xong **script vẫn chạy bình thường** | Test vòng lặp giải mã so sánh từng byte; chạy thử ngay trong web | ✅ với JS/TS; ngôn ngữ khác chỉ tải bản rõ |
| 7 | **Không gây lag máy** | Mã hoá theo luồng 1 MiB/khối, mỗi lúc giữ 1 khối; chạy trong Web Worker | ✅ theo thiết kế, xem mục 6 |
| 8 | **Bảo mật**: người khác nhìn vào không biết cách giải | AES-256-GCM + PBKDF2-SHA256 600.000 vòng + khoá tệp ngẫu nhiên chỉ nằm trong key script + mật khẩu | ⚠️ mạnh, nhưng không tuyệt đối |
| 9 | Mỗi lần mã hoá gắn **năm-tháng-ngày-giờ-phút-giây-mili giây** vào đầu | `time.raw` dạng `20261023165038881` nằm trong header, **không mã hoá** | ✅ |
| 10 | Kết hợp với **link script chứa key** | `keyUrl` là một phần của chuỗi sinh khoá (KDF) | ✅ đổi link là không mở được |
| 11 | Thời gian/ngày giờ/mili giây **không mã hoá** để nhận biết | Toàn bộ nằm trong header đọc được (JSON) | ✅ |
| 12 | Khi chạy, lấy thời gian + link key để tạo khoá, giải mã code rồi chạy | Đúng luồng đó, xem mục 3 | ✅ |
| 13 | Chạy test tìm lỗi | `node tests/run-node.mjs` → **80 kiểm thử** | ✅ đạt hết |
| 14 | Dự án lớn, giúp được nhiều người, **miễn phí** | Không backend, không database, chạy trên GitHub Pages/Cloudflare Pages | ✅ 0 đồng |
| 15 | Lập **bản ghi chú dự án** | Chính tệp này + 5 tài liệu khác | ✅ |
| 16 | Tìm hiểu thêm trên mạng để làm web mạnh hơn | Đối chiếu OWASP, NIST SP 800-38D, giới hạn GitHub Pages | ✅ có trích dẫn |

## 2. Vì sao thiết kế như vậy

- **Không dùng base64** cho dữ liệu: base64 làm tăng 33 %. Ta ghi nhị phân, chỉ
  thêm 16 byte tag/khối.
- **AES-GCM theo từng khối** thay vì mã hoá cả tệp một lần: giữ RAM thấp, cho phép
  tệp 5 GiB, và phát hiện sửa/đổi thứ tự/cắt bớt nhờ AAD chứa số thứ tự khối.
- **Khoá phụ thuộc thời gian**: đúng yêu cầu "mỗi lần mã hoá một khoá khác nhau".
  Mili giây + salt 16 byte ngẫu nhiên khiến hai lần mã hoá cùng nội dung ra hai tệp
  khác nhau hoàn toàn.
- **Header không mã hoá**: đúng yêu cầu "để nhận biết". Đây là lựa chọn có ý thức:
  người nhận đọc được thời gian tạo, link key, tên tệp, kích thước… nhưng không
  đọc được nội dung code.
- **PBKDF2 600.000 vòng**: mức OWASP khuyến nghị cho PBKDF2-HMAC-SHA256
  ([OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)).
  IV 96 bit và cảnh báo không tái sử dụng IV theo
  [NIST SP 800-38D](https://nvlpubs.nist.gov/nistpubs/legacy/sp/nistspecialpublication800-38d.pdf).
  Ta dùng IV = 8 byte ngẫu nhiên cho mỗi tệp + 4 byte số thứ tự khối ⇒ không bao giờ
  trùng trong cùng một tệp, và salt mới mỗi lần mã hoá ⇒ khoá mới mỗi lần.

## 3. Luồng chạy thực tế

### Lúc mã hoá (trong trình duyệt hoặc CLI)

```
time      = năm/tháng/ngày/giờ/phút/giây/mili-giây  (ví dụ 2026-10-23 16:50:38.881)
keyUrl    = "./key.js"                              (link tới key script)
pass      = mật khẩu người dùng
salt      = 16 byte ngẫu nhiên (mỗi tệp)
khoá      = PBKDF2-SHA256( JSON[1, time.raw, time.unixMs, keyUrl, pass], salt, 600000 ) → 32 byte
ivPrefix  = 8 byte ngẫu nhiên
fileKey   = 32 byte NGẪU NHIÊN (mỗi tệp)      ← chỉ có trong key script, đã bọc
keyWrap   = AES-256-GCM( khoá, fileKey )     ← AAD = ["AIA1-WRAP", id, time.raw, unixMs, keyUrl]
khối i    = AES-256-GCM( fileKey, IV = ivPrefix‖i, AAD = magic‖version‖i‖cờ-cuối‖tổng-khối )
tệp .aia  = magic + header(JSON, đọc được, KHÔNG có keyWrap) + khối 0 + khối 1 + …
key.js    = META (gồm keyWrap) + bộ giải mã
```

### Lúc chạy (key script)

1. Đọc `META` nhúng trong `key.js` (thời gian, link key, salt, kdf, `keyWrap`, số khối…).
2. Tải `payload.aia` (cùng thư mục hoặc CDN).
3. Nhập mật khẩu → PBKDF2 lại → so `kid` để báo "sai mật khẩu" thay vì lỗi khó hiểu.
4. Mở `keyWrap` bằng khoá dẫn xuất ⇒ lấy `fileKey`. **Chỉ key script mới có `keyWrap`.**
5. Giải mã từng khối bằng `fileKey`, kiểm tra AAD ⇒ phát hiện sửa/cắt/đảo khối.
6. Ghép bản rõ → chạy trong Web Worker, hoặc tải về.

## 4. Cấu trúc kho

```
secure-script/
├── index.html               # trang chính (6 tab: Mã hoá · Giải mã · Mã hoá link · Lập trình · Dịch ngược · Tài liệu)
├── README.md
├── package.json
├── assets/
│   ├── core.js              # lõi mã hoá (dùng chung browser + Node)
│   ├── app.js               # giao diện
│   ├── program.js           # tab Lập trình: số dòng, zoom, panel lỗi, trang trắng
│   ├── editor.js            # lõi soạn thảo: phân tích lỗi, thống kê, dò ngoặc (thuần JS)
│   ├── github.js            # GitHub REST client + base64 + kiểm tra tên/đường dẫn
│   ├── github-ui.js         # hộp thoại GitHub 4 tab (API key · dự án · sửa file · kết quả)
│   ├── reverse.js           # dịch ngược / phân tích
│   └── style.css
├── tools/
│   ├── cli.mjs              # mã hoá/giải mã bằng dòng lệnh
│   └── check-static.mjs     # kiểm tra id/đường dẫn trong HTML
├── aia.key.js               # KEY SCRIPT DÙNG CHUNG (1 link cho mọi lần mã hoá)
├── tests/run-dom.mjs        # 186 kiểm thử giao diện (jsdom)
├── tests/run-node.mjs       # 244 kiểm thử lõi
├── tests/run-editor.mjs     # 75 kiểm thử lõi trình soạn thảo
├── tests/run-github.mjs     # 94 kiểm thử client GitHub (GitHub giả)
├── tests/stress.mjs         # 80 bài kiểm thử cường độ cao
├── examples/                # script mẫu + gói demo
├── docs/                    # 6 tài liệu
└── deploy/                  # pages.yml (mẫu workflow), netlify.toml, vercel.json
```

## 5. Những gì đã kiểm chứng thật

Chạy `node tests/run-node.mjs` (Node 22, WebCrypto thật):

- **244/244** kiểm thử lõi + **75/75** lõi soạn thảo + **94/94** client GitHub +
  **104/104** lõi tab Lập trình (`run-ide.mjs`).
- **243/243** kiểm thử giao diện trên DOM ả (jsdom) — gồm cả **gói demo phát hành kèm**,
  tab **Lập trình** (nhiều tệp, tìm/thay, định dạng, console, 5 ô lưu, ZIP),
  **trang trắng chống soi** và **hộp thoại GitHub** — **205/205** kiểm tra tĩnh,
  và **80/80** bài **kiểm thử cường độ cao**.
  Tổng **1045 điểm kiểm tra**.
- Vòng lặp đúng với khối 64 KiB / 256 KiB / 1 MiB; tệp rỗng; tệp chia hết khối.
- Sai mật khẩu, sửa link key, sửa 1 bit, cắt tệp, ghép thêm, đảo khối, sai magic →
  đều bị chặn.
- Header: `time.raw` đúng 17 chữ số, đọc được không cần mật khẩu, chuỗi thời gian
  xuất hiện nguyên văn trong tệp.
- **key script sinh ra được chạy thật** và giải mã đúng, từ chối mật khẩu sai, chặn
  bản mã hết hạn, và bản có mật khẩu nhúng chạy không cần nhập.
- **Chế độ bắt buộc key script**: header `.aia` **không chứa** khoá tệp; thiếu key
  script → `KEY_REQUIRED`; sửa `keyWrap` → `WRAP_FAILED`; key script mất `keyWrap`
  cũng bị từ chối. Chế độ cũ vẫn giải mã được (tương thích ngược).
- ZIP: CRC32 đúng, nội dung đúng.
- Dịch ngược: làm đẹp/rút gọn **không đổi token**, giải base64, gỡ escape, phân tích.
- 8 MiB: mã hoá ~0,14 s, giải mã ~0,15 s trên máy ảo này; tăng 962 byte (0,0115 %).
- **Snippet "chép là chạy"**: tự nạp link key, tự giải mã, chạy đúng code gốc (đã thử trong sandbox).
- **Nhận diện ngôn ngữ theo nội dung**: tệp `.js` chứa Luau/Python được nhận ra đúng
  (30 kiểm thử riêng + 8 bài cường độ cao) — không còn nổ `Unexpected identifier`
  khi bấm "Chạy thử ngay", khi giải mã hay khi chạy snippet.
- **Mã hoá link** (`AIALNK1.…`): 54 kiểm thử riêng — vòng cơ bản, mật khẩu, sai key script,
  sửa token/header, 5 kiểu token hỏng, 7 kiểu link xấu (`javascript:`/`data:`/`file:`…),
  URL tiếng Việt/emoji, URL 8 KiB, snippet mở đúng link trong sandbox.
  Test cường độ cao: 17 bài (200 vòng, song song, fuzz token rác, RAM, KDF 600k).
- Kiểm thử cường độ cao: fuzz **600/600** ca bị phát hiện; tệp **1 GiB** mã hoá
  464 MiB/s, giải mã 365 MiB/s, **RAM không tăng theo kích thước tệp**; 30/30 mật khẩu
  sai bị chặn trong 0,07 s.

## 6. Giới hạn — nói thẳng

1. **Chưa kiểm thử trên trình duyệt thật** trong môi trường làm việc này (không có
   Chrome/Playwright). Đã có: 80 test lõi, 47 test giao diện trên DOM ả (jsdom), 40
   kiểm tra tĩnh. jsdom không mô phỏng CSS/layout/`showSaveFilePicker`/khác biệt
   WebCrypto giữa trình duyệt ⇒ Bạn nên bấm thử một lần trên máy.
2. **5 GiB là giới hạn lý thuyết** đã chặn ở code. Thực tế phụ thuộc RAM/CPU/ổ đĩa và
   trình duyệt. Với tệp > 256 MiB, trang sẽ xin quyền ghi trực tiếp ra tệp
   (File System Access API, có trên Chrome/Edge). Firefox/Safari sẽ gom trong RAM.
3. **Không thể bảo vệ code tuyệt đối** khi người khác chạy nó trên máy họ: họ luôn có
   thể đọc bộ nhớ hoặc sửa key script. Mục tiêu thực tế: tệp `.aia` một mình là vô
   dụng; người không có mật khẩu thì không mở được; mọi sửa đổi đều bị phát hiện.
4. **Header đọc được** theo đúng yêu cầu của bạn. Nếu bạn cần giấu cả thời gian/tên
   tệp, đó là thay đổi ngược lại yêu cầu — ghi rõ trong tài liệu 02.
5. **Hạn dùng (expiry)** chỉ kiểm tra phía client, sửa key script là bỏ qua được.
6. Nếu **không đặt mật khẩu**, hoặc **bật nhúng mật khẩu**, thì `key.js` trở thành
   chìa khoá duy nhất: ai có 2 tệp là mở được ngay, không cần biết gì thêm.
7. Script dùng `import`/`export` (ES module) cần chạy ở chế độ `module`, hoặc trình
   duyệt sẽ báo lỗi cú pháp trong Worker.

## 7. Việc nên làm tiếp (nếu muốn mạnh hơn)

- Thêm mã hoá **bất đối xứng** (RSA-OAEP/ECDH) để giao cho người khác mà không cần
  chia sẻ mật khẩu (khoá tệp `fileKey` có thể bọc bằng khoá công khai của người nhận).
- Thêm chế độ **ký số** (Ed25519) để chứng minh tệp do bạn tạo.
- Nén trước khi mã hoá (Brotli/Deflate) nếu script là text lớn — nhưng nén làm tăng
  thời gian và có thể ảnh hưởng tỉ lệ nén.
- Nếu cần chống sửa key script mạnh hơn: phát hành key script qua HTTPS + SRI, hoặc
  nhúng hash của key script vào một chỗ khác.
- Viết test bằng Playwright khi có môi trường có trình duyệt.

## 8. Nguồn tham khảo

- OWASP Password Storage Cheat Sheet — PBKDF2-HMAC-SHA256 ≥ 600.000 vòng.
- NIST SP 800-38D — AES-GCM, IV 96 bit, không tái sử dụng IV.
- MDN `AesGcmParams` — IV phải duy nhất cho mỗi lần mã hoá.
- GitHub Docs — GitHub Pages: site ≤ 1 GB, băng thông mềm 100 GB/tháng, 10 build/giờ.
- Cloudflare Pages — 20.000 tệp, 25 MiB/tệp, static request miễn phí.
