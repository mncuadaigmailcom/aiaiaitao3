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
| 🧭 **Dò ngôn ngữ thật** | Tệp `.js` chứa Lua/Python vẫn được nhận đúng — không còn lỗi `Unexpected identifier` |
| 🔗 **Link key rõ ràng** | Dòng "Link key script mở khoá" có URL đầy đủ + nút **Chép link** |
| 🔗 **Link mã nguồn tự điền** | Chọn dự án / chọn file trong tab **Sửa file** là link GitHub + link raw hiện ngay — không cần đẩy code lên, không tốn lượt gọi API |
| 🎚️ **3 kiểu bảo vệ** | Không mật khẩu · mật khẩu nhúng sẵn · mật khẩu hỏi khi chạy |
| 🔗 **1 link key cho mọi lần** | Key script dùng chung `aia.key.js` (hoặc chế độ riêng từng tệp) |
| 🔒 **Mã hoá thật** | AES-256-GCM, mỗi khối có tag xác thực; sửa 1 bit là hỏng |
| 🗝️ **Key script là chìa khoá thật** | Khoá tệp ngẫu nhiên chỉ nằm trong `key.js`: thiếu nó là không mở được |
| ⏱️ **Khoá gắn thời gian** | Mili giây + link key + mật khẩu → mỗi lần mã hoá một khoá khác |
| 👁️ **Header đọc được** | Thời gian, link key, tên tệp hiện rõ để nhận biết (đúng yêu cầu) |
| 📦 **Tăng kích thước không đáng kể** | +16 byte/khối (0,0015 %) + header ~0,8 KB. Đo thật: 8 MiB → +962 B |
| ⚡ **Không treo máy** | Xử lý theo luồng 1 MiB; đo thật 1 GiB: 464 MiB/s, RAM gần như không tăng |
| 🖥️ **Tab Lập trình** | Trình soạn thảo có **số dòng**, **zoom 10–28px**, **KB/MB/GB**, panel **tìm lỗi** (bấm là nhảy tới dòng), **chia đôi màn hình** |
| 🕶️ **Chống soi** | Sinh **trang trắng không chữ**; chỉ link có `#k=<khoá>` mới mở ra đầy đủ tính năng |
| 🐙 **Đăng lên GitHub** | Hộp thoại 5 tab: **API key** · **tạo dự án** · **sửa file** · **kết quả** · **mã hoá + chống soi** |
| 🎯 **Một nút là xong** | Bật *Mã hoá* + *Chống soi* → bấm **Đưa lên GitHub**: tự tạo repo, tự bật Pages, tự ghi 3 tệp, trả **link script** để chép |
| 🧱 **Link công khai vô hại** | Người khác mở link chỉ thấy trang trắng `404: Not Found`; dán đúng link `.lua` vào game thì script chạy |
| 🎮 **Loader Luau thật** | Giải mã AES-256-GCM bằng thuật toán thuần Lua trong game; tự dò `game:HttpGet` → `HttpGetAsync` → `request` → `syn.request` → `getgenv()` (chạy được trên Delta và các executor theo UNC) |
| 🧾 **Dòng lệnh sẵn để dán** | Xuất bản xong có ngay `loadstring(game:HttpGet("…"))()` + nút chép — dán URL trần vào executor thì không có gì chạy |
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
tests/run-node.mjs  244 kiểm thử lõi (Node 18+)
tests/run-editor.mjs 75 kiểm thử trình soạn thảo
tests/run-github.mjs 94 kiểm thử client GitHub (GitHub giả)
tests/stress.mjs    80 bài kiểm thử cường độ cao
docs/               tài liệu chi tiết
deploy/             mẫu workflow GitHub Pages, Netlify, Vercel
examples/           script mẫu + gói demo
```

## Kiểm thử

```bash
node tests/run-node.mjs       # 244/244 đạt — lõi mã hoá + snippet + link + ngôn ngữ + trang trắng
node tests/run-editor.mjs     # 75/75  — số dòng, zoom, dò lỗi, thống kê
node tests/run-github.mjs     # 101/101 — GitHub REST client + link mã nguồn (không gọi mạng thật)
node tests/run-ide.mjs       # 104/104 — lõi tab Lập trình: tệp, tìm/thay, định dạng, 5 ô lưu
node tests/run-publish.mjs   # 103/103 — gói xuất bản: trang 404 + loader Luau/JS + đẩy GitHub
node tests/run-js.mjs        # 53/53  — chỉ JavaScript + khung xem trước (buildPreviewDocument)
node tools/check-static.mjs   # 310/310 — id/đường dẫn/cú pháp HTML + link + ngôn ngữ + tab mới
npm install                   # chỉ để chạy test DOM
node tests/run-dom.mjs        # 323/323 — giao diện + gói demo + Lập trình + GitHub + xuất bản
node tests/run-lua.mjs        # 46/46  — chạy THẬT loader Luau trong fengari (cần npm i fengari)
node tests/run-e2e-lua.mjs    # 24/24  — end-to-end: gói xuất bản → tệp .lua → chạy trong máy ảo Lua
                              #          với môi trường kiểu Roblox (_G rỗng, request/HttpGet)
node tests/stress.mjs --quick # 80/80 — cường độ cao (~18 s)
node tests/stress.mjs --max   # như trên + tệp 1 GiB (~90 s)
```

Tổng **1463 điểm kiểm tra**.

Kết quả mới nhất và chi tiết: [`docs/05-kiem-thu-va-ket-qua.md`](docs/05-kiem-thu-va-ket-qua.md).

## Giới hạn — nói thẳng

- **Chưa kiểm thử bằng trình duyệt thật** trong môi trường tạo ra dự án này; đã có
  1463 điểm kiểm tra (lõi, giao diện DOM ả, iframe xem trước chạy thật, loader Luau chạy trong máy ảo Lua,
  kiểm tra tĩnh, cường độ cao).
  Hãy bấm thử một lần.
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
| [06-phan-tich-index.html.1.js.md](docs/06-phan-tich-index.html.1.js.md) | Phân tích file tham chiếu `index.html.1.js`: đã port gì, bỏ gì, vì sao |
| [05-kiem-thu-va-ket-qua.md](docs/05-kiem-thu-va-ket-qua.md) | 1463 điểm kiểm tra, số đo thật, test cường độ cao |

## Giấy phép

MIT — dùng, sửa, chia sẻ tự do. Chỉ đừng dùng để phá bản quyền của người khác.
