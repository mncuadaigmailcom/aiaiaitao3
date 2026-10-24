# 01 · Kiến trúc & định dạng tệp `.aia`

## 1. Sơ đồ luồng

```
 Người dùng                                     Trình duyệt (không máy chủ)
 ──────────                                     ─────────────────────────
 chọn tệp / dán code ──► app.js ──► core.js ──► WebCrypto
                                     │            ├─ PBKDF2-SHA256 (600k)
                                     │            └─ AES-256-GCM (từng khối)
                                     ▼
                              payload.aia  +  key.js  +  run.html  +  README.txt
                                     │
                                     ▼
                            (gửi cho người khác / đưa lên host tĩnh)

 Người nhận
 ──────────
 mở run.html ──► tải key.js ──► AIA_UNLOCK
                                   ├─ đọc META (thời gian, link key, salt…)
                                   ├─ nhập mật khẩu
                                   ├─ PBKDF2 → so kid
                                   ├─ tải payload.aia
                                   ├─ giải mã từng khối + kiểm AAD
                                   └─ chạy trong Web Worker / tải về
```

## 2. Định dạng nhị phân `AIA1`

```
┌───────────────────────────────────────────────────────────────┐
│ 0..7    "AIASCR1\n"  (8 byte magic)                           │
│ 8..11   uint32 little-endian: độ dài header JSON              │
│ 12..N   header JSON (UTF-8, KHÔNG mã hoá)                     │
├───────────────────────────────────────────────────────────────┤
│ khối 0: AES-256-GCM( bản rõ khối 0 )  →  16 byte tag ở cuối   │
│ khối 1: …                                                     │
│ …                                                             │
│ khối n-1: khối cuối                                           │
└───────────────────────────────────────────────────────────────┘
```

Không base64, không padding, không metadata lặp lại. Mỗi khối dài đúng bằng
`chunk.size` (khối cuối có thể ngắn hơn) **cộng 16 byte tag**.

### Header JSON (rút gọn)

```json
{
  "format": "AIA1",
  "v": 1,
  "id": "9f3c1a4e77b2d105",
  "createdAt": "2026-10-23T16:50:38.881Z",
  "time": {
    "raw": "20261023165038881",
    "readable": "2026-10-23 16:50:38.881",
    "year": 2026, "month": 10, "day": 23,
    "hour": 16, "minute": 50, "second": 38, "ms": 881,
    "unixMs": 1792767038881,
    "iso": "2026-10-23T16:50:38.881Z",
    "timezoneOffset": 420
  },
  "keyUrl": "./key.js",
  "alg": "AES-256-GCM",
  "kdf": {
    "name": "PBKDF2-HMAC-SHA256",
    "iterations": 600000,
    "salt": "base64…",
    "kid": "8 byte hex đầu của SHA-256(khoá)"
  },
  "keyWrapIn": "key-script",
  "//": "keyWrap KHÔNG có trong header — chỉ nằm trong META của key script",
  "keyWrap": { "alg": "AES-256-GCM", "iv": "base64 12 byte", "ct": "base64 48 byte (32 khoá + 16 tag)" },
  "chunk": { "size": 1048576, "total": 12, "ivPrefix": "base64…", "tagBytes": 16 },
  "file": { "name": "script.js", "size": 11534336, "lang": "javascript", "sha256": "…|null" },
  "payload": { "file": "script.aia" },
  "expiry": null,
  "note": "",
  "encryptionSeconds": 0.42
}
```

**Vì sao `time.raw` dạng 17 chữ số?** Đó là `YYYYMMDDHHmmssSSS`: đủ năm, tháng,
ngày, giờ, phút, giây, mili giây, dễ đọc bằng mắt, dễ so sánh, và là một phần của
khoá. Header giữ cả `unixMs` để máy dùng.

**Vì sao `kid`?** Để phân biệt "sai mật khẩu" (kid lệch) với "tệp hỏng" (tag sai).

## 3. Khoá

```
material  = JSON.stringify([1, time.raw, time.unixMs, keyUrl, passphrase])          // chế độ riêng
material  = JSON.stringify([1, time.raw, time.unixMs, keyUrl, passphrase, S])       // chế độ dùng chung
khoáBọc   = PBKDF2-HMAC-SHA256(material, salt, iterations, 32 byte)
fileKey   = 32 byte ngẫu nhiên cho mỗi tệp
keyWrap   = AES-256-GCM( khoáBọc, fileKey, iv ngẫu nhiên 12 byte )
            AAD = JSON ["AIA1-WRAP", id, time.raw, unixMs, keyUrl, headerHash]
IV khối i = ivPrefix(8 byte ngẫu nhiên) ‖ uint32BE(i)
AAD khối i = magic(8) ‖ version(1) ‖ uint32BE(i) ‖ cờ-cuối(1) ‖ uint32BE(tổng)
             ‖ SHA-256(header) 32 byte        // 50 byte cho tệp mới, 18 byte cho tệp cũ
headerHash = SHA-256(JSON header với headerHash = 64 số 0, bỏ keyWrap/encryptionSeconds)
```

`S` là **khoá gốc dùng chung** 32 byte nằm trong `aia.key.js` (xem mục 3b).
Tệp tạo bởi phiên bản cũ không có `headerHash` ⇒ không thêm digest vào AAD, vẫn giải mã được.

**Chế độ bắt buộc key script (mặc định):** dữ liệu mã hoá bằng `fileKey`; `fileKey`
chỉ tồn tại ở dạng đã bọc trong `keyWrap`, mà `keyWrap` **chỉ được ghi vào key
script**, không ghi vào header `.aia`. Vì vậy:

- tệp `.aia` một mình: **không thể** giải mã, dù đọc được header và biết mật khẩu;
- sửa `keyWrap` (hoặc header) → `WRAP_FAILED`;
- mất key script = mất dữ liệu, không có cửa sau.

**Chế độ tương thích** (tắt tuỳ chọn, hoặc tệp tạo bởi phiên bản trước): dữ liệu mã
hoá trực tiếp bằng `khoáBọc`, không có `keyWrap`; giải mã chỉ cần `.aia` + mật khẩu.

Ba yếu tố tạo khoá đúng như bạn yêu cầu:

1. **thời gian** đến mili giây,
2. **link key script**,
3. **mật khẩu**.

Đổi bất kỳ yếu tố nào → khoá khác → giải mã thất bại. Vì `time` và `keyUrl` nằm
trong header (đọc được), key script không cần "giấu" chúng.

## 3b. Hai chế độ key script

| | **Dùng chung** (mặc định trên web) | **Riêng từng tệp** |
|---|---|---|
| Link key | `./aia.key.js` — **một link cho mọi lần mã hoá, mọi người** | `./<tên-tệp>.key.js` |
| Khoá gốc | `S` cố định trong `aia.key.js` (công khai trong repo/site) | không có |
| `keyWrap` nằm ở | **header `.aia`** (tệp tự chứa) | **key script** |
| `keyWrapIn` | `"shared-key-script"` | `"key-script"` |
| `sharedKeyId` | 8 byte hex = `SHA-256(S)` rút gọn | không có |
| Mở được khi | có `aia.key.js` **+ mật khẩu** | có key script riêng **+ mật khẩu** |
| Điểm mạnh | 1 link duy nhất, tiện chia sẻ, tệp tự chứa | tách biệt: mỗi tệp một khoá, mất 1 key không ảnh hưởng tệp khác |
| Điểm yếu | vì `aia.key.js` công khai, **mật khẩu là lớp bảo vệ duy nhất** | phải gửi kèm key script cho từng tệp |

Với chế độ dùng chung, trang web nạp `./aia.key.js` bằng `<script src>` ngay khi mở,
nên người nhận chỉ cần `.aia` + mật khẩu là chạy. Ai cố tình mở `aia.key.js` cũng chỉ
thấy khoá gốc — **không mở được** nếu không có mật khẩu. Vì vậy chế độ này **nên luôn
đặt mật khẩu**; nếu để trống, coi như tệp không được bảo vệ.

## 4. Vì sao vẫn dùng thời gian + link key khi đã có khoá ngẫu nhiên

Vì đây là yêu cầu của bạn và cũng có ích thật:

- thời gian tạo là một phần của KDF ⇒ **mỗi lần mã hoá một khoáBọc khác**;
- `keyUrl` ràng buộc khoá với tên/đường dẫn key script ⇒ đổi link là không mở được;
- `keyWrap` có AAD gồm `id` + thời gian + `keyUrl` ⇒ sửa header để đổi thời gian/link
  cũng làm hỏng việc mở khoá tệp.

## 5. Vì sao AAD có số thứ tự + tổng số khối

AES-GCM chỉ bảo vệ từng khối. Nếu không ràng buộc vị trí, kẻ tấn công có thể:

- **đảo khối** → nội dung sai nhưng từng khối vẫn hợp lệ;
- **bỏ khối cuối** → mất dữ liệu mà không báo;
- **ghép khối từ tệp khác**.

AAD chứa `index`, `isLast`, `total` buộc mỗi khối phải nằm đúng chỗ. Test có kiểm
tra cả 3 trường hợp trên.

## 6. Vì sao không dùng một lần cho cả tệp?

AES-GCM giới hạn ~64 GiB cho một khoá/IV (bộ đếm 32 bit). Tệp 5 GiB vẫn nằm trong
giới hạn, nhưng mã hoá một lần nghĩa là phải giữ cả 5 GiB trong RAM. Chia khối cho
phép: RAM thấp, tiến trình hiển thị được, huỷ giữa đường, và ghi trực tiếp ra đĩa.

## 7. Định dạng key script

`ten.key.js` là JavaScript thuần, có thể chèn bằng thẻ `<script>`:

```js
(function (global) {
  var META = /*<AIA:META>*/{ ... keyWrap: { iv, ct } ... }/*</AIA:META>*/;
  var EMBEDDED_PASS = null; // hoặc "mật khẩu" nếu bạn chọn nhúng
  // … bộ giải mã tối giản, không phụ thuộc thư viện
  global.AIA_UNLOCK = AIA;
})(globalThis);
```

### API `AIA_UNLOCK`

| Thành phần | Ý nghĩa |
|---|---|
| `AIA_UNLOCK.meta` | header của tệp (đọc được) |
| `AIA_UNLOCK.payloadUrl` | URL tệp `.aia` đã suy ra |
| `AIA_UNLOCK.decrypt({passphrase, onProgress, source})` | trả `Uint8Array` bản rõ |
| `AIA_UNLOCK.run({execute, mode, passphrase, onLog, onError, onDone})` | giải mã + chạy |
| `AIA_UNLOCK.download()` | tải bản rõ |
| `AIA_UNLOCK.checkExpiry()` | kiểm tra hạn dùng |
| `AIA_UNLOCK.stopCurrent()` | dừng Worker đang chạy |
| `AIA_UNLOCK.hasEmbeddedPassphrase` | có nhúng mật khẩu? |

`source` cho phép bạn tự cấp dữ liệu (ví dụ lấy từ IndexedDB) thay vì `fetch`.

## 7b. Code đã mã hoá dạng chép được

Giao diện hiện thêm khung **Code đã mã hoá** với hai định dạng của **cùng một chuỗi byte**
`header ‖ khối 0 ‖ khối 1 ‖ …`:

- **Base64**: 4 ký tự cho mỗi 3 byte; chuỗi luôn bắt đầu bằng `QUlBU0NSMQ`
  (giải mã ra `AIASCR1\n`).
- **Hex**: 2 ký tự cho mỗi byte; bắt đầu bằng `414941534352310a`.

Không có lỗi làm tròn nào: hai chuỗi này biểu diễn **đúng từng byte** của tệp `.aia`,
nên có thể chép ra ngoài và dựng lại tệp. Trang chỉ hiện tối đa 2 MiB đầu tiên
(tệp lớn hơn nên tải `.aia`) để không treo trình duyệt.

## 7c. Snippet "chép là chạy" (`buildRunSnippet`)

Ngoài tệp `.aia`, trang sinh thêm một **đoạn code tự chứa**:

```js
(async function () {
  var KEY_URL = "https://…/secure-script/aia.key.js";  // link key script (mọi người dùng chung)
  var KEY_SRC = null;      // chế độ riêng từng tệp: nhúng thẳng key script
  var DATA = "QUlBU0NSMQ…"; // toàn bộ tệp .aia ở Base64
  var PASS = "";           // "" = không mật khẩu, null = hỏi khi chạy
  // … tự nạp key script → AIA_KEY.open({source, passphrase}) → eval code gốc
})();
```

- Có **2 kiểu hiển thị**:
  - `labeled` — có chú thích đầu đoạn (tên tệp, thời gian, link key, cách dùng);
  - `stealth` (**mặc định trên web**) — không chú thích, không lộ link/tên API, tên biến
    ngẫu nhiên mỗi lần sinh, mọi chuỗi (bản mã, link, mật khẩu, tên tệp) đều **cắt nhỏ
    thành mảng Base64** rồi ghép lúc chạy. Chỉ là **làm khó đọc**, không phải mã hoá —
    vẫn giải ngược được nếu ai đó cố tình.
- Người nhận **chỉ cần chép và dán** — không cần tải tệp nào khác.
- Kích thước ≈ **1,34 lần** tệp `.aia` (Base64), nên trang chỉ sinh snippet cho tệp ≤ **1,5 MiB**;
  lớn hơn thì dùng tệp `.aia`.
- `EXEC = false` với tệp không phải JS ⇒ snippet tải bản rõ thay vì chạy.
- Snippet **không che giấu** gì: ai đọc cũng thấy link key, bản mã và (nếu chọn) mật khẩu.

## 7d. Key script dùng chung

`aia.key.js` chứa **khoá gốc S** 32 byte + `keyId` (8 byte hex = SHA-256(S) rút gọn) và API
`AIA_KEY.open/run`. Tệp này **sinh một lần** và **byte-identical** ở mọi lần tải
(không in thời điểm tạo), nên mọi người dùng đúng cùng một link.

`keyWrapIn = "shared-key-script"` ⇒ `keyWrap` nằm trong header `.aia`, được bọc bằng khoá
dẫn xuất từ `[thời gian, link key, mật khẩu, S]`. Thiếu `aia.key.js` là **không mở được**,
kể cả khi biết mật khẩu.

## 7e. Token link (`AIALNK1.…`)

Ngoài tệp `.aia`, site mã hoá được **một link** (link trang web hoặc link script):

```
AIALNK1.<base64url( [2 byte BE: độ dài header][header JSON][IV 12 byte][ciphertext + tag 16 byte] )>
```

Header **đọc được** (đúng nguyên tắc "thời gian không mã hoá"):

```json
{ "v": 1, "t": "20261024153012123", "x": 1761300000000,
  "u": "./aia.key.js", "s": "<salt base64>", "n": 600000, "k": "<keyId>" }
```

- Bản rõ chỉ là `{"u":"<link gốc>"}`, mã hoá AES-256-GCM với
  AAD = `["AIA-LINK1", thời gian, link key]`.
- Khoá = PBKDF2-SHA256(1 ‖ thời gian raw ‖ unixMs ‖ link key ‖ mật khẩu ‖ khoá gốc trong `aia.key.js`).
- Mọi trường header (trừ `k`) đều tham gia tạo khoá ⇒ sửa header là không mở được.
- Kích thước: token ≈ 1,33 × độ dài URL (do Base64) + ~250 ký tự cố định.
- Chỉ nhận `http://` / `https://`; `javascript:`, `data:`, `file:`… bị chặn ngay từ lúc mã hoá
  và kiểm tra lại lúc mở.
- `aia.key.js` có `AIA_KEY.openLink(token, {passphrase})` → `{ url, keyUrl, createdAt }`.

Snippet cho link có 3 hành động: `open` (mở tab mới), `load` (nạp link thành `<script>`),
`text` (chỉ in link ra console); mặc định kiểu **ẩn dấu vết** (không lộ token/link/tên API).

## 7f. Trường `file.lang` — dò theo đuôi **và** nội dung

`lang` trong header quyết định việc trang (và snippet) có **chạy** code sau khi giải mã hay không.

1. `detectLang(tênTệp)` — theo đuôi tệp (như trước).
2. `sniffContentLang(64 KiB đầu)` — chấm điểm Luau / JavaScript / Python bằng các dấu hiệu
   đặc trưng (`game:GetService(`, `Instance.new(`, `UDim2.new(`, `:Connect(`… so với
   `=>`, `const … =`, `document.`, `"use strict"`…). Chỉ trả lời khi **thắng áp đảo**
   (điểm ≥ 12 và gấp đôi bên kia), ngược lại trả `null`.
3. `resolveLang()` — ưu tiên đuôi; chỉ ghi đè khi nội dung nói khác rõ ràng.

Nhờ vậy `script.js` chứa Luau → `lua` → `EXEC=false` trong snippet, `RUNNABLE=false` trong
`run.html`, nút "Chạy thử" bị khoá. Tệp JS bình thường **không** bị ảnh hưởng
(đã kiểm tra trên toàn bộ 11 tệp JS của dự án: không tệp nào bị nhận nhầm).

## 8. Định dạng đầu ra của gói

| Tệp | Vai trò |
|---|---|
| `ten.aia` | dữ liệu đã mã hoá (header + khối) |
| `ten.key.js` | key script: META + **keyWrap** + bộ giải mã (bắt buộc để mở) |
| `run-ten.html` | trang mở & chạy, nhập mật khẩu |
| `README-ten.txt` | hướng dẫn ngắn cho người nhận |
| `aia-ten.zip` | gói tất cả (nếu ≤ 256 MiB) |


## 9. Gói xuất bản lên GitHub (mã hoá + chống soi)

`assets/publish.js` biến code đang mở trong tab Lập trình thành **một thư mục** trên repo.
Link Pages của thư mục đó là thứ duy nhất người nhận nhìn thấy.

```
<dir>/index.html      ← trang trắng: <h1>404: Not Found</h1>, không script, không link
<dir>/k-<id>.txt      ← 32 byte khoá (base64), CHỈ loader biết địa chỉ
<dir>/l-<id>.lua      ← loader Luau: HttpGet khoá → AES-256-GCM → loadstring
```

- `id` = 4 byte ngẫu nhiên (8 ký tự hex), sinh mỗi lần xuất bản nếu không truyền.
- Trang trắng có `background:#fff`, `noindex,nofollow,noarchive,nosnippet`, không
  tham chiếu tới bất kỳ tài nguyên ngoài nào.
- Loader Lua gồm: bảng S-box, `expand_key` (Nk = 8, Nr = 14), `encrypt_block` chỉ dùng để
  kiểm tra, `gf_mul`/GHASH, `aes_gcm_decrypt`, `b64decode`, `bytes_to_string`; URL khoá
  được **base64** trong nguồn nên mắt thường không đọc được địa chỉ tệp khoá.
- Với mục tiêu `js`: gói gồm `key-<id>.js` (key script `.aia`, khoá tệp bọc trong
  `keyWrap`) và `run-<id>.js` (snippet chép-là-chạy, link khoá base64 sẵn trong snippet).

`publishPlanToGithub()` tạo repo nếu chưa có (công khai, `auto_init`), ghi từng tệp
(tự lấy `sha` khi tệp đã tồn tại), bật Pages nếu chưa bật, rồi trả link:

| Trường | Ý nghĩa |
| --- | --- |
| `links.publicUrl` | thư mục công khai — người khác mở chỉ thấy 404 |
| `links.scriptUrl` | link dán vào game (`…/l-<id>.lua`) |
| `links.keyUrl` | tệp khoá (loader tự tải) |
| `links.rawUrl` | `raw.githubusercontent.com` — dự phòng khi Pages chưa build |

Giới hạn: GitHub contents API 5 MB/tệp nên `buildPublishPlan` chặn ở **4,5 MB/tệp**
(tương đương script gốc ~2,8 MB vì base64 làm phình ~1,58×).
