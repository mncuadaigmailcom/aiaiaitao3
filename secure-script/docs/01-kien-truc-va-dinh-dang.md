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
material  = JSON.stringify([1, time.raw, time.unixMs, keyUrl, passphrase])
khoáBọc   = PBKDF2-HMAC-SHA256(material, salt, iterations, 32 byte)
fileKey   = 32 byte ngẫu nhiên cho mỗi tệp
keyWrap   = AES-256-GCM( khoáBọc, fileKey, iv ngẫu nhiên 12 byte )
            AAD = JSON ["AIA1-WRAP", id, time.raw, unixMs, keyUrl]
IV khối i = ivPrefix(8 byte ngẫu nhiên) ‖ uint32BE(i)
AAD khối i = magic(8) ‖ version(1) ‖ uint32BE(i) ‖ cờ-cuối(1) ‖ uint32BE(tổng)
```

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

## 8. Định dạng đầu ra của gói

| Tệp | Vai trò |
|---|---|
| `ten.aia` | dữ liệu đã mã hoá (header + khối) |
| `ten.key.js` | key script: META + **keyWrap** + bộ giải mã (bắt buộc để mở) |
| `run-ten.html` | trang mở & chạy, nhập mật khẩu |
| `README-ten.txt` | hướng dẫn ngắn cho người nhận |
| `aia-ten.zip` | gói tất cả (nếu ≤ 256 MiB) |
