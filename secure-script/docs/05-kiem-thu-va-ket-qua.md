# 05 · Kiểm thử & kết quả thật

## 1. Cách chạy

```bash
cd secure-script
node tests/run-node.mjs      # 244 kiểm thử lõi (không cần cài gì)
node tests/run-editor.mjs    # 75 kiểm thử lõi trình soạn thảo (không cần cài gì)
node tests/run-github.mjs    # 94 kiểm thử client GitHub với GitHub giả (không gọi mạng)
node tests/run-publish.mjs   # 103 kiểm thử gói xuất bản: trang 404 + loader + đẩy GitHub
node tools/check-static.mjs  # 281 kiểm tra tĩnh HTML ↔ app.js/program.js/github-ui.js/publish.js
node tools/cli.mjs selftest  # kiểm tra nhanh CLI

npm install                  # chỉ cần cho test DOM (jsdom)
node tests/run-dom.mjs       # 307 kiểm thử giao diện + gói demo + Lập trình + GitHub + xuất bản
node tests/run-lua.mjs       # 31 kiểm thử chạy THẬT loader Luau trong fengari
node tests/stress.mjs --quick   # 80 bài kiểm thử cường độ cao (~20 s)
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
[4d] Snippet "chép là chạy"          27/27
[4e] Mã hoá LINK                     54/54
[4f] Nhận diện ngôn ngữ (đuôi sai)    30/30
[5] ZIP & tiện ích                    7/7
[6] Công cụ dịch ngược               15/15
[7] Thông lượng                       4/4
─────────────────────────────────────────────
Kết quả: 244 đạt · 0 lỗi · ~12,4 s
Editor : 75 đạt · 0 lỗi
GitHub : 94 đạt · 0 lỗi

Lõi không gian làm việc (tests/run-ide.mjs): 104 đạt · 0 lỗi
Chỉ JavaScript + xem trước (tests/run-js.mjs): 53 đạt · 0 lỗi
Gói xuất bản (tests/run-publish.mjs)  : 103 đạt · 0 lỗi
Loader Luau (tests/run-lua.mjs)       : 31 đạt · 0 lỗi (chạy thật trong fengari)
Kiểm tra tĩnh (tools/check-static.mjs): 281 đạt · 0 lỗi
Kiểm thử DOM  (tests/run-dom.mjs)     : 307 đạt · 0 lỗi
Kiểm thử cường độ cao (stress.mjs --quick): 80/80 đạt · 0 lỗi · ~18 s
```

Tổng: **1372 điểm kiểm tra đạt** (244 + 75 + 94 + 104 + 53 + 103 + 31 + 281 + 307 + 80).

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

### [4d-b] Snippet "ẩn dấu vết" (mặc định trên web)

- Không có chú thích mở đầu, **không lộ** `AIA Secure Script`, `KEY_URL`, `AIA_KEY`,
  `AIA_UNLOCK`, `https://`, `Bảo vệ`, `var DATA`… (đã test bằng danh sách marker).
- Tên biến **ngẫu nhiên mỗi lần sinh** (mỗi snippet một kiểu khác nhau).
- Bản mã + link key + mật khẩu đều **cắt nhỏ thành mảng chuỗi Base64**, ghép lại lúc chạy;
  mật khẩu nhúng **không hiện dạng chữ**.
- Vẫn **chạy đúng**: tự nạp key script từ link đã giấu, giải mã, chạy code gốc
  (kiểm tra cả biến toàn cục do code gốc tạo ra).
- Kích thước **nhỏ hơn** bản có chú thích (~4,7 KB so với ~5,4 KB cho script nhỏ).

### [4e] Mã hoá LINK (mới)

- Vòng cơ bản: token `AIALNK1.…` → mở lại đúng URL (kể cả `?query`, `#hash`).
- Token **không chứa** host/đường dẫn gốc; dài ~270 ký tự cho URL thường.
- Mỗi lần mã hoá ra token **khác nhau** (salt + IV + thời gian).
- Mật khẩu: đúng thì mở, sai bị chặn (`LINK_BAD_PASS`); sai key script cũng bị chặn;
  thiếu khoá key script bị chặn (`NO_SHARED_KEY`).
- Sửa 1 ký tự token, sửa `u` (link key) hay `x` (thời gian) trong header → không mở được.
- 5 kiểu token hỏng (rỗng/rác/quá ngắn/ký tự lạ/bị cắt) → `LINK_BAD_TOKEN`, không sập.
- 7 kiểu link xấu (`javascript:`, `data:`, `file:`, `ftp:`, chuỗi thường, rỗng) → bị chặn.
- URL tiếng Việt/emoji giữ nguyên; URL 2000+ ký tự vẫn đúng (token ≈ 1,33 × URL do Base64).
- `aia.key.js` phát hành kèm site có `openLink()`: tự mở token (có/không tiền tố đều được).
- Snippet link: 0 marker lộ (`AIALNK1`, `openLink`, `AIA_KEY`, `https://`, host…), là JS hợp lệ,
  chạy trong sandbox và mở đúng URL; chế độ `text` chỉ in link, chế độ `load` nạp link thành script.
- Mật khẩu nhúng không hiện dạng chữ; chế độ hỏi mật khẩu nhận **mật khẩu gõ tay** (không phải Base64).
- Hồi quy: snippet script "ẩn dấu vết" cũng đã sửa lỗi giải Base64 mật khẩu gõ tay.

### [4f] Nhận diện ngôn ngữ — sửa lỗi "đuôi tệp sai"

Bối cảnh: nhiều người đặt tên `script.js` cho **tệp Lua/Luau của Roblox**. Trước bản sửa,
trang tin vào đuôi tệp nên đưa Luau vào Web Worker → `SyntaxError: Unexpected identifier`
(cả ở nút "Chạy thử ngay", tab "Giải mã & chạy" và snippet gửi cho người nhận).

Cách sửa: `sniffContentLang()` dò 64 KiB đầu tệp, `resolveLang()` chỉ ghi đè kết luận
theo đuôi khi nội dung nói khác **rõ ràng** (thắng áp đảo).

| Kiểm tra | Kết quả |
|---|---|
| mẫu Luau / JS / Python | nhận đúng cả 3 ✔ |
| nội dung rỗng, chỉ có gạch trang trí `====` | không kết luận (giữ theo đuôi) ✔ |
| `script.js` + nội dung Luau | → `lua` ✔ |
| `script.js1.js` + nội dung Luau | → `lua` ✔ |
| `script.js` + nội dung JS | → `javascript` (không phá tệp đúng) ✔ |
| `.lua` nhưng nội dung JS | → `javascript` (tin nội dung) ✔ |
| 3 tệp Luau thật trong repo | → `lua` ✔ |
| 11 tệp JS của dự án | **không** tệp nào bị nhận nhầm ✔ |
| header `.aia` | ghi `lang: "lua"` dù tên tệp là `.js` ✔ |
| snippet (cả 2 kiểu) | `EXEC = false` → **tải bản rõ** thay vì chạy ✔ |
| `run.html` | `RUNNABLE = false` + banner cảnh báo ✔ |
| tệp JS thật | vẫn tự chạy, `EXEC = true` ✔ |

Ngoài ra giao diện còn:
- hiện nhãn `Lua/Luau (đuôi tệp là JavaScript)` + tooltip giải thích;
- khoá nút "Chạy thử ngay" với lý do rõ ràng;
- **dịch lỗi runtime** thành câu dễ hiểu: `Unexpected identifier 'Players'` →
  *"Đây là lỗi CÚ PHÁP của chính tệp gốc, không phải lỗi mã hoá… bấm Tải bản rõ"*.

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



### [7g] Gói xuất bản "một nút" (`tests/run-publish.mjs`, 103)

- Trang trắng: có `404: Not Found`, nền `#fff`, **không** script, **không** link ra ngoài,
  escape tiêu đề; tuỳ chọn ẩn chữ 404.
- `encryptForGame()`: khoá 32 B, nonce 12 B, tag 16 B, `Node:crypto` giải mã lại đúng từng
  ký tự; mỗi lần xuất bản một khoá mới; 1,5 MB code mã hoá xong < 5 s.
- Gói Luau: đúng tên `k-<id>.txt` + `l-<id>.lua`, loader **không** chứa bản rõ, **không**
  chứa link khoá đọc được, **không** chứa khoá, không lẫn cú pháp JavaScript.
- Gói JS: `key-<id>.js` + `run-<id>.js`, cả hai **hợp lệ cú pháp** (`node --check`),
  snippet gọi `AIA_UNLOCK` (tên bị base64), link khoá được base64 trong snippet.
- `publishPlanToGithub()` với GitHub giả: tự tạo repo công khai, ghi 3 tệp, lần 2 là
  **cập nhật** (gửi `sha`) chứ không tạo trùng, bật Pages, link đúng, Pages bị chặn 403
  → vẫn trả link raw + ghi chú, `createIfMissing=false` → lỗi 404.
- Giới hạn: 4,5 MB/tệp → báo lỗi kèm cách xử lý (script gốc ~2,8 MB).

### [7h] Loader Luau chạy thật (`tests/run-lua.mjs`, 31)

Loader do `buildLuaLoader()` sinh ra được **chạy trong máy ảo Lua thật** (fengari), với
`game:HttpGet` giả lập Roblox:

- giải mã đúng AES-256-GCM, `print` của script gốc vẫn ra đúng;
- Unicode và script ~25 KB giải mã chính xác;
- chỉ tải khoá **1 lần**, đúng URL (đã base64 trong nguồn);
- sai khoá / sửa 1 byte bản mã → chặn trước khi chạy, không `loadstring` bản rác;
- thiếu `HttpGet` → báo `AIA: khong tai duoc khoa`.

Con số này đo trong máy ảo JavaScript (chậm hơn Luau thật nhiều lần), nên chỉ dùng để
chứng minh **tính đúng**, không dùng để suy ra tốc độ trong Roblox.

## 4. Kiểm tra tĩnh giao diện

`tools/check-static.mjs` kiểm tra:

- mọi `id` mà `app.js` dùng đều tồn tại trong `index.html`;
- không có `id` trùng;
- mọi `src`/`href` nội bộ trỏ tới tệp có thật;
- `index.html` nạp `assets/app.js` dưới dạng module;
- tài liệu trong `docs/` tồn tại;
- không có `http://` không bảo mật trong mã;
- **tính năng link**: đủ `id` giao diện, `core.js` có `encryptLink`/`decryptLink`/`buildLinkSnippet`,
  CLI có `link`/`unlink`, `aia.key.js` phát hành kèm site có `openLink` (17 kiểm tra).

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
| 11b. Snippet ẩn | không lộ marker, mỗi lần sinh khác nhau, sinh 1,5 MiB < 1 s | ✔ |
| 12. Link | 40–200 vòng, song song, fuzz token rác/sửa hỏng, URL 8 KiB, RAM, snippet | ✔ |
| 13. Ngôn ngữ | 3 tệp Luau thật, 11 tệp JS không nhận nhầm, 200–1000 lần dò, fuzz chuỗi rác | ✔ |

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

### Tab Lập trình nâng cao (bản nhiều tệp)

`tests/run-ide.mjs` chạy thuần Node, không cần trình duyệt — **104 điểm**:

| Nhóm | Nội dung | Điểm |
|---|---|---|
| 1 | Tên tệp: ký tự cấm, tiếng Việt, tên rỗng, tên quá dài, chống trùng (`script-2.js`) | 21 |
| 2 | Không gian làm việc: tạo, thêm, đổi tên, xoá, luôn còn ≥1 tệp, chuyển tệp đang mở | 24 |
| 3 | Lưu/đọc `localStorage`: dữ liệu hỏng, JSON rác, thiếu trường, quota đầy, vượt 2 MiB | 15 |
| 4 | Tìm & thay: hoa/thường, chồng lấn, tiếng Việt có dấu, `$&` là chữ thường, thay thế | 18 |
| 5 | Định dạng: JSON, JS, Lua, Python, CSS báo "chưa hỗ trợ", code rỗng | 14 |
| 6 | 5 ô lưu: lưu mới, ghi đè, đổi tên, xoá, ô đầy, ô quá lớn, mô tả ô | 12 |

`tests/run-dom.mjs` mục **[7d]** kiểm giao diện thật trên DOM ả: nạp 3 tệp, chuyển tab, đổi tên,
đóng tệp, tìm/thay trên DOM, định dạng qua nút và `Shift+Alt+F`, đổi 4 theme, **chạy ra khung xem
trước**, log/lỗi/warn gửi từ iframe, chuyển tab Kết quả ↔ Lỗi, **tự chạy sau khi ngừng gõ**,
mở/đóng console, lưu dự án rồi nạp lại, tải ZIP, `Ctrl+S`, `Ctrl+F`, nút đặt lại.

`tests/run-dom.mjs` mục **[7e]** cho **khung xem trước chạy thật**: tạo một `JSDOM` từ đúng tài liệu
`buildPreviewDocument()` sinh ra, chạy script (`runScripts: 'dangerously'`) rồi kiểm:
`console.log` + object JSON hoá + mức `warn` gửi về đúng token, code chạm được DOM trong iframe,
tiêu đề = tên tệp, có tín hiệu `done`, và **bắt được lỗi ném trong `setTimeout`**.

### Chỉ JavaScript + khung kết quả bên phải

`tests/run-js.mjs` — **53 điểm**, chạy thuần Node:

| Nhóm | Nội dung | Điểm |
|---|---|---|
| 1 | Tên tệp: `.js/.mjs/.cjs` hợp lệ; `.lua/.py/.css` → `.js`; tên rỗng → `script.js`; chặn `../`; tiếng Việt; cắt 200 ký tự | 21 |
| 2 | `buildPreviewDocument`: doctype, charset UTF-8, tiêu đề escape HTML, nhúng code, token, `parent.postMessage`, 5 mức console, `error`/`unhandledrejection`, `done`/`ready`, try/catch | 22 |
| 3 | An toàn: `</script>` trong code bị vô hiệu (chỉ còn 3 thẻ đóng của khung), code rỗng/`null`/`undefined`, tiếng Việt + emoji, ghi chú tuỳ chỉnh | 8 |
| 4 | Hiệu năng: code 1 MB vẫn nhúng đủ và tạo trang < 1,5 s; tài liệu nhỏ (< 8 KB) | 2 |

`tools/check-static.mjs` (227 điểm) kiểm thêm: 28 `id` của tab Lập trình, 12 hàm xuất của `ide.js`,
giới hạn 12 tệp / 5 ô lưu, **iframe `sandbox="allow-scripts allow-modals"` và KHÔNG có
`allow-same-origin`**, token lọc message, `forceJsFileName`/`isJsFileName`, ngôn ngữ luôn là
JavaScript, 2 tab Kết quả/Lỗi, tự chạy có giới hạn 300 KB, `[hidden]` thắng `display:flex`,
3 theme trong CSS, `Ctrl+F`/`Ctrl+S`/`Shift+Alt+F`, và **không** nạp Monaco/CDN.
