# AIA Secure Script

🌐 **Dùng ngay: [https://mncuadaigmailcom.github.io/aiaiaitao3/](https://mncuadaigmailcom.github.io/aiaiaitao3/)**
(gói demo: [run-hello.html](https://mncuadaigmailcom.github.io/aiaiaitao3/secure-script/examples/demo/run-hello.html) — mật khẩu `aia-demo-2026`)

Mã hoá code script thành **một tệp `.aia`** + **một key script** `.key.js`, mở khoá và
chạy ngay trong trình duyệt. Không máy chủ, không đăng ký, không tốn tiền.

```
       năm-tháng-ngày-giờ-phút-giây-mili giây
                    +  link key script
                    +  mật khẩu
                          │
                   PBKDF2-SHA256 (600.000 vòng)
                          │
                    AES-256-GCM từng khối
                          │
        script.aia  +  script.key.js  +  run-script.html
```

## Vì sao đáng dùng

| | |
|---|---|
| ⚡ **Dán là mã hoá** | Dán code hoặc thả tệp → tự mã hoá, không bấm thêm bước nào |
| 📋 **Snippet chép là chạy** | Đoạn code tự chứa **link key + bản mã** — dán vào Console là chạy |
| 🕶️ **Ẩn dấu vết** | Mặc định: không tiêu đề, giấu link/tên API trong Base64, tên biến ngẫu nhiên |
| 🔗 **Mã hoá link** | Mã hoá link trang web / link script thành token `AIALNK1.…` + snippet tự mở link |
| 🔗 **Link key rõ ràng** | Dòng "Link key script mở khoá" có URL đầy đủ + nút **Chép link** |
| 🎚️ **3 kiểu bảo vệ** | Không mật khẩu · mật khẩu nhúng sẵn · mật khẩu hỏi khi chạy |
| 🔗 **1 link key cho mọi lần** | Key script dùng chung `aia.key.js` (hoặc chế độ riêng từng tệp) |
| 🔒 **Mã hoá thật** | AES-256-GCM, mỗi khối có tag xác thực; sửa 1 bit là hỏng |
| 🗝️ **Key script là chìa khoá thật** | Khoá tệp ngẫu nhiên chỉ nằm trong `key.js`: thiếu nó là không mở được |
| ⏱️ **Khoá gắn thời gian** | Mili giây + link key + mật khẩu → mỗi lần mã hoá một khoá khác |
| 👁️ **Header đọc được** | Thời gian, link key, tên tệp hiện rõ để nhận biết (đúng yêu cầu) |
| 📦 **Tăng kích thước không đáng kể** | +16 byte/khối (0,0015 %) + header ~0,8 KB. Đo thật: 8 MiB → +962 B |
| ⚡ **Không treo máy** | Xử lý theo luồng 1 MiB; đo thật 1 GiB: 464 MiB/s, RAM gần như không tăng |
| 🧩 **Kèm dịch ngược** | Làm đẹp, rút gọn, tách chuỗi, đổi tên biến, giải base64/hex/URL, phân tích |
| 🆓 **Miễn phí** | Tệp tĩnh: GitHub Pages / Cloudflare Pages / Netlify / Vercel |
| 🚫 **Không upload** | Code không rời khỏi máy bạn; không có backend |

## Dùng trong 30 giây

```bash
cd secure-script
python3 -m http.server 8080
# mở http://localhost:8080
```

1. Đặt **mật khẩu** (bấm "tạo" nếu lười nghĩ) — nên đặt, vì key script dùng chung là công khai.
2. Kéo tệp vào ô **hoặc** dán code — web **tự mã hoá** ngay.
3. Bấm **Chép** ở tab **Snippet (kèm link)** → dán vào Console là chạy; hoặc chép **Base64/Hex**;
   hoặc tải **`.aia`** / **ZIP**.
4. Người nhận giải nén, mở `run-*.html` qua HTTP, nhập mật khẩu → chạy.

### Nhúng vào trang của bạn

```html
<script src="./script.key.js"></script>
<script>
  AIA_UNLOCK.run({ passphrase: 'mật-khẩu', execute: true })
    .catch(e => console.error(e.message));
</script>
```

Tự chạy khi tải trang:

```html
<script src="./script.key.js" data-auto-run="1" data-pass="mật-khẩu"></script>
```

### Dòng lệnh

```bash
node tools/cli.mjs encrypt script.js --out ./out --pass "mat-khau-manh"
node tools/cli.mjs decrypt ./out/script.aia --pass "mat-khau-manh" --out ./script.js
node tools/cli.mjs info ./out/script.aia
```

## Cấu trúc

```
index.html          giao diện 4 tab (mã hoá · giải mã · dịch ngược · ghi chú)
assets/core.js      lõi mã hoá, không phụ thuộc thư viện
assets/app.js       giao diện
assets/reverse.js   công cụ đọc/dịch ngược code
tools/cli.mjs       CLI
tests/run-node.mjs  189 kiểm thử lõi (Node 18+)
tests/stress.mjs    69 bài kiểm thử cường độ cao
docs/               tài liệu chi tiết
deploy/             mẫu workflow GitHub Pages, Netlify, Vercel
examples/           script mẫu + gói demo
```

## Kiểm thử

```bash
node tests/run-node.mjs       # 189/189 đạt — lõi mã hoá + snippet + link
node tools/check-static.mjs   # 61/61 — id/đường dẫn/cú pháp HTML + tính năng link
npm install                   # chỉ để chạy test DOM
node tests/run-dom.mjs        # 91/91 — giao diện + gói demo (jsdom)
node tests/stress.mjs --quick # 69/69 — cường độ cao (~29 s)
node tests/stress.mjs --max   # như trên + tệp 1 GiB (~90 s)
```

Tổng **410 điểm kiểm tra**.

Kết quả mới nhất và chi tiết: [`docs/05-kiem-thu-va-ket-qua.md`](docs/05-kiem-thu-va-ket-qua.md).

## Giới hạn — nói thẳng

- **Chưa kiểm thử bằng trình duyệt thật** trong môi trường tạo ra dự án này; đã có
  80 test lõi + 47 test giao diện trên DOM ả + 43 kiểm tra tĩnh. Hãy bấm thử một lần.
- **5 GiB là giới hạn đã chặn trong code**, khả thi thực tế còn phụ thuộc RAM/CPU/trình duyệt.
- **Không có bảo vệ tuyệt đối** trước người chạy được code trên máy họ.
- **Header đọc được** là lựa chọn có ý thức (theo yêu cầu), nhưng khoá tệp thì không
  nằm trong header — khoá tệp chỉ có trong key script.
- **Mất key script là mất dữ liệu** ở chế độ mặc định. Hãy sao lưu.

Chi tiết: [`docs/02-bao-mat-gioi-han.md`](docs/02-bao-mat-gioi-han.md).

## Tài liệu

| Tệp | Nội dung |
|---|---|
| [00-ghi-chu-du-an.md](docs/00-ghi-chu-du-an.md) | Ghi chú dự án: yêu cầu → cách làm → đã kiểm chứng gì |
| [01-kien-truc-va-dinh-dang.md](docs/01-kien-truc-va-dinh-dang.md) | Định dạng `.aia`, khoá, AAD, API key script |
| [02-bao-mat-gioi-han.md](docs/02-bao-mat-gioi-han.md) | Bảo mật, điểm yếu bản chất, cách dùng an toàn |
| [03-huong-dan-su-dung.md](docs/03-huong-dan-su-dung.md) | Hướng dẫn từng bước + xử lý sự cố |
| [04-trien-khai-mien-phi.md](docs/04-trien-khai-mien-phi.md) | GitHub Pages, Cloudflare, Netlify, Vercel |
| [05-kiem-thu-va-ket-qua.md](docs/05-kiem-thu-va-ket-qua.md) | 410 điểm kiểm tra, số đo thật, test cường độ cao |

## Giấy phép

MIT — dùng, sửa, chia sẻ tự do. Chỉ đừng dùng để phá bản quyền của người khác.
