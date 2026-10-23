# 03 · Hướng dẫn sử dụng (từ số 0)

## 1. Chạy trang trên máy

Cần **Python 3** hoặc **Node 18+**. Không cần cài gì thêm.

```bash
cd secure-script
python3 -m http.server 8080
# mở http://localhost:8080
```

Hoặc:

```bash
cd secure-script
npx serve .          # nếu có Node
```

> **Đừng mở bằng `file://`.** WebCrypto và ES module bị chặn ở `file://` trên
> nhiều trình duyệt. Luôn dùng `http://localhost` hoặc `https://`.

> WebCrypto chỉ hoạt động trong **secure context**: `https://` hoặc `localhost`.
> Nếu host bằng IP LAN (`http://192.168.x.x`) trình duyệt sẽ chặn.

## 2. Mã hoá một script

1. Tab **Mã hoá** → kéo tệp vào ô, hoặc bấm **"Dán code trực tiếp"**.
2. **Link key script**: trang tự điền `./<tên-tệp>.key.js` (đúng tên tệp khoá sẽ sinh
   ra). Giữ nguyên nếu bạn để mọi tệp cùng thư mục. Nếu tải key lên CDN, ghi đúng URL
   đầy đủ (ví dụ `https://cdn.example.com/aia/abc.key.js`) **trước khi** mã hoá —
   chuỗi này là một phần của khoá.
3. **Mật khẩu**: bấm "tạo" để sinh mật khẩu mạnh — **lưu lại ngay**.
4. Tuỳ chọn:
   - **Độ mạnh KDF**: 100k (nhanh) / 600k (chuẩn OWASP) / 1.2M (mạnh).
   - **Kích thước khối**: 256 KiB (ít RAM) / 1 MiB / 4 MiB.
   - **Hạn dùng**: chọn ngày giờ; sau đó key script từ chối giải mã.
   - **Ghi chú**: chữ hiện trong header (đọc được).
   - **Bắt buộc key script** *(mặc định BẬT)*: khoá tệp ngẫu nhiên chỉ nằm trong key
     script ⇒ thiếu key script là **không mở được**. Tắt chỉ khi bạn cần tương thích
     với công cụ cũ.
   - **Băm SHA-256**: kiểm tra toàn vẹn cho tệp ≤ 64 MiB.
   - **Nhúng mật khẩu**: chỉ bật khi gửi cho người tin cậy.
   - **Tạo run.html**, **Đóng gói ZIP**.
5. Bấm **Mã hoá ngay**. Xem thanh tiến trình: tốc độ, thời gian còn lại.
6. Tải **ZIP** (khuyến nghị) hoặc từng tệp. Bấm **"Chạy thử ngay"** để kiểm tra
   ngay trong trình duyệt.

Kết quả gồm:

```
script.aia       ← dữ liệu mã hoá (bí mật)
script.key.js    ← key script
run-script.html  ← trang cho người nhận
README-script.txt
aia-script.zip   ← gói tất cả
```

## 3. Gửi cho người khác

**Cách A — gửi cả thư mục:**

Người nhận giải nén, mở terminal trong thư mục:

```bash
python3 -m http.server 8000
# mở http://localhost:8000/run-script.html
```

Nhập mật khẩu → **Giải mã & chạy**. Nếu bản mã ở chế độ bắt buộc key script, phải
chọn cả tệp `*.key.js` (nút "Giải mã" sẽ báo `KEY_REQUIRED` nếu thiếu).

**Cách B — nhúng vào trang web của bạn:**

```html
<!-- 1. đặt script.aia cạnh key.js -->
<script src="./script.key.js"></script>
<script>
  document.querySelector('#run').addEventListener('click', function () {
    AIA_UNLOCK.run({ passphrase: prompt('Mật khẩu?'), execute: true })
      .catch(function (e) { alert('Lỗi: ' + e.message); });
  });
</script>
```

**Cách C — tự chạy khi tải trang:**

```html
<script src="./script.key.js" data-auto-run="1" data-pass="mat-khau"></script>
```

`data-pass` chỉ nên dùng khi key script đã được nhúng mật khẩu hoặc là bản nội bộ.

**Cách D — chạy trên trang chính (cần DOM):**

```js
AIA_UNLOCK.run({ execute: true, mode: 'main' })
  .then(function (r) { console.log('đã chạy', r.code.length, 'ký tự'); });
```

Mặc định `run()` dùng **Web Worker** (không treo trang, không chạm DOM). Dùng
`mode:'main'` khi script cần DOM; khi đó code được chèn bằng thẻ `<script>`.

## 4. Giải mã trên web

Tab **Giải mã & chạy**:

1. **Tệp .aia**: chọn tệp. Header hiện ngay — không cần mật khẩu.
2. **Key script**: bắt buộc với bản mã có khoá riêng; app kiểm tra ID và nạp `keyWrap`.
3. Nhập mật khẩu → **Giải mã & chạy** / **Chỉ kiểm tra toàn vẹn** / **Tải bản rõ**.

Nhật ký cho biết: giải mã mất bao lâu, SHA-256 có khớp, script in ra gì.

## 5. Dùng dòng lệnh (không cần trình duyệt)

```bash
cd secure-script

# mã hoá
node tools/cli.mjs encrypt duong/dan/script.js --out ./out --pass "mat-khau-manh"

# xem header (không cần mật khẩu)
node tools/cli.mjs info ./out/script.aia

# giải mã (cần --key vì mặc định bắt buộc key script)
node tools/cli.mjs decrypt ./out/script.aia --key ./out/script.key.js \
      --pass "mat-khau-manh" --out ./script.js

# kiểm tra key script có khớp
node tools/cli.mjs keycheck ./out/script.aia ./out/script.key.js

# tự kiểm tra nhanh
node tools/cli.mjs selftest
```

Tuỳ chọn khác: `--iter`, `--chunk`, `--key-url`, `--expiry`, `--note`, `--embed`,
`--no-hash`, `--no-require-key` (tắt bắt buộc key script). Xem `node tools/cli.mjs --help`.

## 6. Dịch ngược / đọc code đã bị làm rối

Tab **Dịch ngược**:

| Nút | Tác dụng |
|---|---|
| Làm đẹp | Thêm xuống dòng/thụt lề, không đổi token |
| Rút gọn | Bỏ chú thích + gộp khoảng trắng (giữ xuống dòng an toàn) |
| Bỏ chú thích | Xoá `//`, `/* */`, `--` |
| Tách chuỗi | Đưa mọi chuỗi ra bảng `__S0, __S1…` |
| Đổi tên biến | Đổi tên khai báo JS thành `_a, _b…` (không đụng thuộc tính) |
| Gỡ escape | `\x41` → `A`, `\u0041` → `A`, chuỗi hex → text |
| Giải base64/hex/URL | Giải các chuỗi mã hoá phổ biến, kèm ghi chú |
| Phân tích | Đếm dòng/chuỗi/chú thích, entropy, cảnh báo `eval`, `atob`, `fetch`… |

**Lưu ý:** "Đổi tên biến" là công cụ hỗ trợ, có thể làm hỏng code phụ thuộc tên
chuỗi hoặc closure phức tạp. Luôn giữ bản gốc.

## 7. Xử lý sự cố

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| `Sai mật khẩu (WRONG_PASSPHRASE)` | Gõ sai, hoặc `keyUrl` trong header khác lúc mã hoá | Nhập lại; kiểm tra `keyUrl` trong header |
| `Tệp này yêu cầu key script (KEY_REQUIRED)` | Bản mã ở chế độ bắt buộc key script | Chọn/nạp tệp `*.key.js` tương ứng |
| `Không mở được khoá tệp (WRAP_FAILED)` | Key script không khớp tệp `.aia` (nhầm cặp) | Dùng đúng key script đã phát hành cùng tệp |
| `Không giải mã được khối #n` | Tệp bị sửa/hỏng khi truyền | Tải lại tệp gốc |
| `Không tải được tệp dữ liệu` | `.aia` không cùng thư mục với key script | Đặt cạnh nhau, hoặc sửa `META.payload.file` |
| `WebCrypto` không có | Mở bằng `file://` hoặc IP LAN | Dùng `localhost`/HTTPS |
| Script không chạy, báo lỗi cú pháp | Code dùng `import` (ES module) | Chạy với `mode:'main'` + `type:'module'` |
| `Tệp có dữ liệu thừa` | Ghép thêm dữ liệu vào `.aia` | Dùng lại tệp gốc |
| Trình duyệt hết RAM với tệp lớn | Firefox/Safari gom toàn bộ vào RAM | Dùng Chrome/Edge để ghi trực tiếp ra đĩa, hoặc dùng CLI |
| Mã hoá chậm | Đặt 1.2M vòng PBKDF2 | Chỉ chậm ở bước đầu (~0,1–0,5 s), phần thân tệp không bị ảnh hưởng |

## 8. Câu hỏi nhanh

**Có cần máy chủ không?** Không. Toàn bộ là HTML/CSS/JS tĩnh.
**Có upload code lên đâu không?** Không. Không có `fetch` nào gửi dữ liệu ra ngoài
(trừ khi chính script bạn mã hoá tự gọi mạng).
**Mất key script thì sao?** Ở chế độ mặc định: không mở lại được. Hãy sao lưu key
script cùng chỗ với bản gốc.
**Dùng được trên điện thoại?** Được với tệp nhỏ; tệp lớn có thể hết RAM.
**Có mất tiền không?** Không. Xem `04-trien-khai-mien-phi.md`.
