# 04 · Triển khai miễn phí (0 đồng)

Trang là **tệp tĩnh** — không backend, không database, không cron. Bất kỳ host tĩnh
miễn phí nào cũng chạy được.

## 0. Chuẩn bị chung

```bash
# kiểm tra lần cuối trước khi đưa lên
cd secure-script
node tests/run-node.mjs
node tools/check-static.mjs
```

Cần có: `index.html`, `assets/`, `examples/`, `docs/`, `.nojekyll`.

## 1. GitHub Pages (khuyến nghị — repo này đang dùng)

**Link đang chạy:** <https://mncuadaigmailcom.github.io/aiaiaitao3/>
(`index.html` ở gốc repo tự chuyển sang `/secure-script/`).

Site được xuất bản theo kiểu **legacy**: nguồn = nhánh `main`, thư mục `/`,
nên mỗi lần push lên `main` là GitHub tự build lại (không cần Actions).

### 1.1 Bật Pages

Mẫu workflow nằm ở `secure-script/deploy/pages.yml`. GitHub chỉ chạy workflow khi tệp
nằm trong `.github/workflows/`, nên cần chép vào:

```bash
mkdir -p .github/workflows
cp secure-script/deploy/pages.yml .github/workflows/pages.yml
git add .github/workflows/pages.yml && git commit -m "ci: deploy web" && git push
```

Hoặc tạo bằng giao diện GitHub: **Actions → New workflow → set up a workflow yourself**,
rồi dán nội dung `secure-script/deploy/pages.yml`.

1. Vào repo → **Settings** → **Pages** → **Source: GitHub Actions**.
2. Push lên `main` (hoặc chạy workflow thủ công trong tab **Actions**).
3. Sau ~1 phút, địa chỉ dạng:

   ```
   https://<tên-tài-khoản>.github.io/aiaiaitao3/
   ```

   Workflow upload **thư mục `secure-script`** làm **site root**, nên `index.html`
   nằm ngay ở gốc URL (không phải `/secure-script/`).
   Nếu bạn muốn giữ URL dạng `/secure-script/`, bỏ dòng `path: secure-script` và
   upload cả repo — nhưng như vậy tệp Roblox cũng bị đưa lên.

> **Lưu ý tài khoản miễn phí:** GitHub Pages cho repo **công khai** là miễn phí.
> Với repo **riêng tư**, Pages cần gói trả phí — khi đó dùng Cloudflare Pages
> (miễn phí, cho phép repo riêng tư).

### 1.2 Giới hạn cần biết (theo GitHub Docs)

- Site đã publish **≤ 1 GB**.
- **Băng thông mềm 100 GB/tháng**.
- **10 build/giờ** (mềm; không áp dụng khi build bằng workflow Actions).
- Nếu vượt, GitHub có thể ngừng phục vụ hoặc gửi email đề nghị dùng CDN.

⇒ Đừng đặt các tệp `.aia` lớn trong repo. Trang web chỉ ~150 KB.

### 1.3 Nhánh `gh-pages` (cách cũ)

Nếu không muốn dùng Actions:

```bash
cd secure-script
git subtree push --prefix secure-script origin gh-pages
```

Rồi chọn **Source: Deploy from a branch → gh-pages / (root)**.

## 2. Cloudflare Pages (băng thông thoải mái)

1. Đăng nhập Cloudflare → **Workers & Pages → Create → Pages → Upload assets**.
2. Kéo thả thư mục `secure-script`.
3. Nhận URL `https://<tên>.pages.dev`.

Giới hạn free: **20.000 tệp**, **25 MiB/tệp**, request tĩnh miễn phí không giới hạn.
Có thể gắn tên miền riêng miễn phí nếu tên miền đã dùng Cloudflare DNS.

## 3. Netlify Drop

1. Mở <https://app.netlify.com/drop>.
2. Kéo thả thư mục `secure-script`.
3. Nhận URL `https://<tên-ngẫu-nhiên>.netlify.app` (đổi tên được trong Settings).

Có `deploy/netlify.toml` mẫu nếu muốn cấu hình header.

## 4. Vercel

```bash
npx vercel deploy secure-script --prod
```

Hoặc kéo thả trong dashboard. `deploy/vercel.json` là mẫu cấu hình.

## 5. Chạy trong mạng LAN (không cần internet)

```bash
cd secure-script
python3 -m http.server 8080 --bind 0.0.0.0
```

Máy khác mở `http://<IP-máy-chủ>:8080`. **Lưu ý:** WebCrypto chỉ chạy trong secure
context, nên `http://192.168.x.x` sẽ **không** có `crypto.subtle` trên Chrome. Cách
xử lý:

- dùng `localhost` (nếu cùng máy),
- hoặc tạo chứng chỉ tự ký + `https`,
- hoặc dùng Cloudflare Tunnel / `ngrok` để có HTTPS miễn phí.

## 6. Tên miền riêng (miễn phí hoặc rẻ)

- **GitHub Pages**: thêm file `CNAME` chứa tên miền, cấu hình DNS `CNAME → <user>.github.io`.
- **Cloudflare Pages**: gắn custom domain, DNS do Cloudflare quản lý.
- Nhớ bật **HTTPS** (miễn phí ở cả hai).

## 7. Những gì KHÔNG cần

| Thứ | Cần? | Vì sao |
|---|---|---|
| Máy chủ Node/PHP | ❌ | Không có API |
| Database | ❌ | Không lưu gì |
| Tài khoản dịch vụ mã hoá | ❌ | WebCrypto có sẵn trong trình duyệt |
| Docker | ❌ | Tệp tĩnh |
| Biến môi trường | ❌ | Không có bí mật phía máy chủ |

## 8. Chi phí thực tế

| Khoản | Chi phí |
|---|---|
| Host tĩnh (Pages/Cloudflare/Netlify/Vercel) | 0 ₫ |
| HTTPS | 0 ₫ |
| Mã hoá (WebCrypto trong máy người dùng) | 0 ₫ |
| Băng thông (dùng chung gói free) | 0 ₫ |

**Điều duy nhất tốn tiền là thời gian của bạn.**

## 9. Nếu cần tệp `.aia` lớn phục vụ công khai

Host tĩnh giới hạn 25 MiB–100 MiB/tệp (tuỳ nơi). Với tệp 5 GiB:

- để người nhận **tự tải qua email/Drive/USB**, không host;
- hoặc chia nhỏ `.aia` và nối lại (AES-GCM theo khối nên có thể nối đúng thứ tự);
- hoặc dùng GitHub Releases (tối đa 2 GiB/tệp) / Cloudflare R2 free tier.

Trang web không cần chứa tệp `.aia`; nó chỉ cần `index.html` + `assets/`.
