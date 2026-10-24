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

1. Tab **Mã hoá** → **kéo tệp vào ô**, hoặc bấm **"Dán code trực tiếp"** rồi dán.
   **Không cần bấm gì thêm**: thả tệp hoặc dán code là web **tự mã hoá** ngay (không cần nhập ngày giờ — web tự lấy giờ máy).
2. **Kiểu khoá** (mặc định *Dùng chung*):
   - **Dùng chung — `./aia.key.js`**: một link duy nhất cho **mọi** lần mã hoá và **mọi
     người**. Link key bị khoá ở giá trị này. Nên đặt mật khẩu (xem mục 2b).
   - **Riêng từng tệp**: mỗi tệp sinh một key script riêng; link tự điền
     `./<tên-tệp>.key.js`, sửa được (ví dụ URL CDN `https://cdn.example.com/aia/abc.key.js`)
     **trước khi** mã hoá — chuỗi này là một phần của khoá.
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
5. (Chỉ khi muốn đổi tuỳ chọn) bấm **Mã hoá ngay**. Xem thanh tiến trình: tốc độ,
   thời gian còn lại.
6. Xem **ba kết quả** ngay trên trang:
   - dòng **Link key script mở khoá** (URL đầy đủ, nút **Chép link**, nút **Mở**);
   - khung **Code đã mã hoá**, mặc định là tab **Snippet (kèm link)** — chép toàn bộ,
     dán vào Console (F12) hoặc tệp `.js` là **chạy ngay**, không cần tải gì thêm;
     hai tab còn lại là **Base64** và **Hex**;
     ô chọn cạnh đó có **Ẩn dấu vết** (mặc định: không tiêu đề, không lộ link/tên API,
     tên biến ngẫu nhiên) hoặc **Có chú thích** (dễ đọc, thấy rõ link key);
   - danh sách tệp **`.aia`** (+ key script, run.html, README, ZIP) để tải về.
7. Bấm **"Chạy thử ngay"** để kiểm tra ngay trong trình duyệt.

Kết quả gồm:

```
script.aia       ← dữ liệu mã hoá (bí mật)
aia.key.js       ← key script DÙNG CHUNG (chế độ dùng chung; mọi tệp dùng lại được)
script.key.js    ← key script riêng (chỉ ở chế độ "Riêng từng tệp")
run-script.html  ← trang cho người nhận
README-script.txt
aia-script.zip   ← gói tất cả
```

## 2a. Ba kiểu bảo vệ khi chép code

| Kiểu | Người nhận phải làm gì | Mức bảo vệ |
|---|---|---|
| **Không mật khẩu** (mặc định) | dán snippet là chạy | **không có** — ai có đoạn code cũng mở được |
| **Có mật khẩu, nhúng sẵn** | dán là chạy | thấp — ai đọc code cũng thấy mật khẩu |
| **Có mật khẩu, hỏi khi chạy** | dán rồi nhập mật khẩu | cao nhất trong 3 kiểu |

Đổi kiểu bảo vệ (hoặc gõ mật khẩu) là web **tự mã hoá lại**, không cần bấm thêm.

## 2b. Hai chế độ khoá trong thực tế

**Dùng chung (mặc định).** 10 lần mã hoá → **vẫn một link** `./aia.key.js` và cùng một
tệp `aia.key.js`. Gửi người nhận: `script.aia` + mật khẩu; trang web tự nạp
`aia.key.js`. Vì tệp này công khai, **hãy luôn đặt mật khẩu**.

**Riêng từng tệp.** Mỗi tệp có key script riêng; khoá tệp chỉ nằm trong key script đó.
An toàn tách biệt hơn, nhưng phải gửi kèm key cho từng tệp.

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

## 3a. Đặt tên tệp & chạy thử

- Trang **dò ngôn ngữ theo nội dung** (64 KiB đầu), không chỉ theo đuôi tệp: tệp Luau
  đặt tên `script.js` vẫn được nhận là **Lua/Luau**, hiện nhãn cảnh báo và **không** chạy thử.
- Trình duyệt chỉ chạy được **JavaScript/TypeScript**. Tệp Lua/Luau/Python… vẫn mã hoá &
  giải mã bình thường, chỉ khác là bấm "Chạy thử" sẽ **khoá** — dùng **Tải bản rõ** để lấy code.
- Nếu bấm chạy một tệp sai định dạng, trang báo rõ: *"Đây là lỗi CÚ PHÁP của chính tệp gốc,
  không phải lỗi mã hoá… bấm Tải bản rõ"*.
- Nên đặt đúng đuôi (`.lua`, `.luau`, `.py`) để header ghi đúng ngay từ đầu.

## 3b. Mã hoá một LINK (trang web / link script)

1. Mở tab **Mã hoá link**.
2. Dán link (`https://…`) vào ô **Link gốc**.
3. Chọn **Cách bảo vệ** (không mật khẩu / nhúng sẵn / hỏi khi chạy), **Hành động của snippet**
   (mở tab mới / nạp thành script / chỉ in ra) và **Kiểu snippet** (ẩn dấu vết / có chú thích).
4. Bấm **Mã hoá link** → nhận:
   - **Token** `AIALNK1.…` (~270 ký tự): gửi nguyên chuỗi này, không lộ link gốc;
   - **Snippet "chép là chạy"**: dán vào Console là tự nạp key script, tự mở khoá rồi mở link.
5. Người nhận dán token vào ô **Mở khoá link** (cùng trang) hoặc chạy snippet.
6. Dòng lệnh: `node tools/cli.mjs link <url> --pass "…"` và `node tools/cli.mjs unlink "<token>" --pass "…"`.

## 3c. Tab Lập trình (trình soạn thảo)

Tab **Lập trình** là chỗ soạn/sửa code **JavaScript** trước khi mã hoá. Tab này **chỉ dành cho
JavaScript** (`.js`, `.mjs`, `.cjs`): đổi tên hay nạp tệp khác đuôi đều tự chuyển về `.js`,
ngôn ngữ luôn được kiểm tra/định dạng theo JavaScript.

| Thành phần | Cách dùng |
|---|---|
| **Số dòng** | Hiện bên trái, cuộn đồng bộ với code; bật/tắt bằng ô **Dòng** |
| **Phóng to / thu nhỏ** | Nút **A+ / A− / 100%**, hoặc **Ctrl +** , **Ctrl −** , **Ctrl 0** (chỉ khi đang ở tab này) |
| **Kích thước tệp** | Thanh thống kê dưới khung code: **B / KB / MB / GB**, số dòng, ngôn ngữ, số ký tự, cỡ chữ |
| **Tìm lỗi** | Panel bên phải: lỗi (đỏ) và cảnh báo (vàng); **bấm vào là nhảy tới đúng dòng**. Tự kiểm tra sau khi gõ ~0,4 giây, hoặc **Ctrl Enter** |
| **Chia đôi màn hình** | Ô chọn: **Chia đôi: code \| lỗi** · **Chỉ code** · **Chỉ lỗi** |
| **Nhiều tệp** | Thanh tab phía trên: **＋ Tệp mới**, bấm **×** để đóng, **bấm đúp vào tên trên tab** (hoặc sửa ô tên) để đổi tên. Tối đa **12 tệp**, mỗi tệp ≤ 4 M ký tự; tên trùng tự thành `script-2.js`; **mọi tệp đều là `.js`** |
| **Tìm & thay** | **Ctrl F** (hoặc nút **Tìm**) mở thanh tìm: đếm `1/12`, ↑ ↓, phân biệt hoa/thường, **Thay 1**, **Thay tất cả**, **Esc** để đóng |
| **Định dạng** | **Shift Alt F** hoặc nút **Định dạng**: JavaScript/TypeScript (và JSON nếu tệp `.js` chỉ chứa JSON), thụt 2 dấu cách |
| **Kết quả bên phải** | Cột phải có 2 tab: **Kết quả** (khung xem trước) và **Lỗi** (kèm số lỗi). Bấm **Chạy** là code chạy trong **iframe `sandbox="allow-scripts"`** — không chạm được trang, cookie hay `localStorage` của bạn — rồi **kết quả hiện ngay trong khung** (kể cả khi code sửa DOM) |
| **Console** | `console.log/info/warn/error` và lỗi runtime của code được gửi về panel **Console** (tối đa 1.500 dòng) cùng **Dừng**, **Chạy lại**, **Xoá log** |
| **Tự chạy** | Ô **Tự chạy**: bật thì code tự chạy lại sau khi ngừng gõ ~0,7 giây (chỉ với code < 300 KB để không lag). Mặc định **tắt** |
| **Giao diện màu** | Ô **Màu**: mặc định, **Dracula**, **Monokai**, **Sáng** — nhớ lựa chọn cho lần sau |
| **Lưu dự án (5 ô)** | Nút **Lưu dự án** (hoặc **Ctrl S**): đặt tên, lưu tối đa **5 bản**; mỗi bản có **Mở**, **Ghi đè**, **Đổi tên**, **Tải ZIP**, **Xoá**. Nháp hiện tại tự lưu sau ~0,7 giây, thanh dưới hiện “đã lưu · HH:MM” |
| **Tải ZIP** | Nút **ZIP** gói toàn bộ tệp đang mở thành một tệp `.zip` |
| **Nạp / tải / chép** | **Nạp tệp** (≤ 64 MB, chọn được nhiều tệp), **Tải tệp**, **Chép**, **Đặt lại** (xoá trắng về 1 tệp) |
| **Mã hoá code này** | Đưa nguyên code sang tab **Mã hoá** và mã hoá ngay (giữ tên tệp) |
| **Cách ly an toàn** | Khung xem trước **không** có `allow-same-origin` nên code trong đó không đọc được trang/cookie của bạn; tắt **Tự chạy** nếu muốn code chỉ chạy khi bấm **Chạy** |
| **Đăng lên GitHub** | Mở hộp thoại GitHub ở tab “Mã nguồn mới” |

Trình kiểm tra bắt được: ngoặc tròn/vuông/nhọn lệch, chuỗi chưa đóng, template literal
`${…}` chưa đóng, chú thích khối chưa đóng (kể cả `--[[ ]]` của Lua), lỗi cú pháp
JavaScript (`new Function`, **không chạy code**), JSON sai, thiếu `end` của Lua
(ước lượng), Python trộn tab/khoảng trắng; cảnh báo thêm `eval`, `new Function`,
`debugger`, TODO/FIXME, dòng quá dài, khoảng trắng cuối dòng. Với TypeScript/JSX/ES module,
chỉ kiểm tra cấu trúc (trình duyệt không biên dịch được).

## 3d. Chống soi: trang trắng

Cột phải tab **Lập trình** → khối **Chống soi: trang trắng**:

1. Dán **Link thật cần giấu** (trang web, link script, link tải…).
2. Đặt **Khoá mở** (để trống thì máy tự sinh một khoá và hiện ra một lần).
3. Bấm **Tạo trang trắng** → tải về `tên-trang-trang.html` + hiện **link mở**
   dạng `tên-trang-trang.html#k=<khoá>`.

Cách hoạt động: trang đã tải là **nền trắng, không một chữ nào**, `<title></title>` rỗng.
Link đích nằm trong **token AES-GCM** (`AIALNK1.…` đã cắt khúc, không lộ link gốc);
địa chỉ `aia.key.js` cũng được giấu dạng Base64 nhiều mảnh.

- Mở link **không** có `#k=` → trang ở nguyên màu trắng và **không gọi mạng**.
- Mở link **có** `#k=<khoá>` → trang tải `aia.key.js`, giải token rồi chuyển tới link thật
  (**đầy đủ tính năng** như link gốc). Khoá đặt ở `?k=` cũng được.
- Sai khoá → vẫn ở trang trắng (không báo lỗi, không lộ gì).

⚠️ Đây là **che giấu**, không phải bảo vệ tuyệt đối: người mở DevTools vẫn thấy mã HTML
và token (nhưng token là bản mã, không chứa link đích). **Luôn đặt khoá mở** nếu cần chặn thật.
Tệp `.html` phải nằm cạnh `aia.key.js` (hoặc sửa `keyUrl` trong mã sinh ra cho khớp CDN).

## 3e. Đăng / sửa script trên GitHub

Nút **GitHub** ở góc trên bên phải mở hộp thoại 5 tab (tab 5 = xuất bản một nút):

1. **API key** — dán *Personal Access Token* (fine-grained: `Contents: Read and write`,
   và `Administration: Read and write` nếu muốn tạo dự án). Bấm **Kiểm tra token** để xem
   tên đăng nhập + số lượt gọi API còn lại. Tick **Nhớ token** nếu muốn lưu trong
   `localStorage` của máy này (không gửi đi đâu khác ngoài `api.github.com`).
2. **Mã nguồn** — nhập **tên dự án mới** → **Tạo dự án**: tạo repo (mặc định **riêng tư**)
   rồi **tự đẩy code JS đang soạn** lên `script.js`.
3. **Sửa file** — **Tải danh sách dự án** (mọi repo token thấy được) → chọn 1 dự án →
   **Xem các file** (hiện **bao nhiêu file** + danh sách) → mở file, sửa nội dung rồi
   **Lưu thay đổi** (tự lấy `sha` để ghi đè), **Thêm / ghi file** cho đường dẫn mới,
   hoặc **Xoá file**.
4. **Kết quả** — đẩy code lên đường dẫn bất kỳ rồi hiện ngay **link GitHub**, **link raw**
   và **link GitHub Pages** (nếu repo đã bật Pages).

Giới hạn của GitHub contents API: mỗi tệp ≤ **5 MB** (web chặn trước khi gọi), và
`/user/repos` chỉ trả tối đa 100 dự án mỗi lần tải.

## 3f. Mã hoá + chống soi + GitHub trong MỘT nút

Đây là cách nhanh nhất để có một link script dùng được trong game mà người khác không đọc được code.

1. Mở tab **Lập trình**, dán code Luau/Lua (hoặc JavaScript nếu chạy trên web).
2. Ở cột phải, thẻ **Mã hoá + chống soi (một nút)**: để nguyên cả hai ô
   ☑ *Mã hoá code* và ☑ *Chống soi (trang trắng 404)*.
3. Bấm **Đưa lên GitHub**. Nếu chưa có API key, hộp thoại tự mở tab 1 để dán token
   (token cần quyền *Contents*, *Pages*, *Administration*).
4. Lần đầu: nhập **tên dự án** (ví dụ `game-hub`). Trang tự tạo repo công khai,
   bật GitHub Pages, ghi 3 tệp rồi hiện link.
5. Chờ dòng trạng thái báo **Pages đã build xong** (thường 30–90 giây), rồi bấm
   **Chép link script** — đó là link dán vào game (Roblox: `loadstring(game:HttpGet(LINK))()`).
6. Người khác mở link công khai (`https://<tên>.github.io/<repo>/s/`) chỉ thấy trang
   trắng `404: Not Found`. Link script `…/l-<id>.lua` mới là thứ chạy được.

Chi tiết trong hộp thoại **GitHub → tab 5 · Mã hoá + chống soi**:

| Ô | Tác dụng |
| --- | --- |
| Mã hoá code | Bọc code bằng AES-256-GCM; tắt thì đẩy nguyên tệp (chỉ còn chống soi) |
| Chống soi | Sinh `index.html` trắng 404; tắt thì không có link công khai |
| Hiện chữ 404 | Bật/tắt đúng dòng `404: Not Found` trên trang trắng |
| Game Roblox / Web | Sinh loader Lua (`.lua`) hoặc key script + snippet JS |
| Tên dự án / thư mục | Repo GitHub và thư mục con (mặc định `s`) |
| Dự án công khai | Bắt buộc để GitHub Pages miễn phí phục vụ được |

Đẩy lại lần sau **không tạo repo mới** và **link không đổi** — chỉ nội dung được cập nhật,
nên link đã phát cho người khác vẫn dùng tiếp.

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

# chế độ khoá DÙNG CHUNG: mọi tệp dùng ./aia.key.js
node tools/cli.mjs encrypt script.js --shared --pass "mat-khau-manh" --out ./out
node tools/cli.mjs decrypt ./out/script.aia --pass "mat-khau-manh" --out ./script.js

# tự kiểm tra nhanh
node tools/cli.mjs selftest
```

Tuỳ chọn khác: `--iter`, `--chunk`, `--key-url`, `--expiry`, `--note`, `--embed`,
`--no-hash`, `--no-require-key` (tắt bắt buộc key script),
`--shared` / `--shared-key <aia.key.js>` (dùng key script chung).
Xem `node tools/cli.mjs --help`.

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
