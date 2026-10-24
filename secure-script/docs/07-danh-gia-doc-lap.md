# 07 · Đánh giá độc lập `secure-script/` (bản công khai trên GitHub Pages)

- **Đối tượng**: [https://mncuadaigmailcom.github.io/aiaiaitao3/secure-script/](https://mncuadaigmailcom.github.io/aiaiaitao3/secure-script/)
- **Mã nguồn tương ứng**: thư mục `secure-script/` trong repo này, commit `40497272fddef388c77cfb310c481d6d68ac6834` (nhánh `main`).
- **Ngày đánh giá**: 2026-10-24.
- **Cách làm**: đọc mã nguồn (≈19.800 dòng), **chạy lại toàn bộ bộ kiểm thử**, viết thêm script kiểm chứng độc lập cho phần mật mã (không dùng test của dự án), đo hiệu năng/RAM bằng tệp 128 MiB, và thử giải mã gói demo bằng CLI.
- **Hạn chế của lần đánh giá**: sandbox không kết nối được tới `mncuadaigmailcom.github.io` (lỗi TLS `curl: (35)`, 0 byte) nên **không so sánh được byte-by-byte bản đang chạy với bản trong repo**. Toàn bộ kết luận dưới đây dựa trên mã nguồn trong repo — tức đúng bản được Pages phục vụ nếu `main` chưa bị sửa tay. Không có trình duyệt thật trong sandbox; các kết luận về hành vi DOM được suy ra từ mã + kiểm thử DOM bằng `jsdom`.

---

## 1. TL;DR — đáng dùng không?

**Có, với đúng kỳ vọng.** Đây là một công cụ mã hoá tệp script + sinh loader chạy được, làm nghiêm túc hơn mức thường thấy ở các "web mã hoá script" miễn phí: mật mã dùng đúng chuẩn (AES-256-GCM, PBKDF2 600.000 vòng, AAD ràng buộc thứ tự khối), **không có backend, code không rời máy người dùng**, và tài liệu tự nói rõ giới hạn thay vì hứa "bảo mật tuyệt đối".

Nhưng nó **không** phải "khoá code không ai mở được". Ba điều phải nhớ:

1. **Không có mật khẩu = không có bảo vệ.** Khoá gốc dùng chung (`aia.key.js`) được phát công khai trên site, nên khi để trống mật khẩu thì bất kỳ ai có `.aia` đều mở được. Giao diện vẫn cho phép bấm "mã hoá" ngay mà không chặn.
2. **Code sau khi giải mã chạy với toàn quyền của origin trang web** (Web Worker tạo từ `blob:`), không bị sandbox như khung "xem trước". Nếu người dùng chọn "nhớ" GitHub token thì một tệp `.aia` độc hại có thể đọc `localStorage` và lấy token đó.
3. **Tôi tìm được một lỗi tương thích thật** làm tệp mã hoá bằng bản cũ (kể cả **gói demo phát hành kèm**) không giải mã được bằng CLI/tab Giải mã của bản hiện tại — chi tiết ở [mục 5, BUG-1](#bug-1).

### Bảng điểm nhanh

| Hạng mục | Điểm | Ghi chú |
|---|---|---|
| Thiết kế mật mã | **8/10** | Đúng chuẩn, có AAD chống cắt/ghép khối; thiếu fallback tương thích AAD khi mở khoá tệp |
| Chất lượng mã nguồn | **8/10** | Rõ ràng, chia module, escape HTML đúng chỗ, không phụ thuộc CDN |
| Bộ kiểm thử | **8/10** | 1.407 điểm kiểm tra, chạy lại được; **thiếu test đường giải mã lõi cho gói demo** (nên lọt BUG-1) |
| Bảo mật vận hành (UX) | **5/10** | Mặc định cho phép không mật khẩu; lưu GitHub token dạng thô; không có CSP |
| Tài liệu / tính trung thực | **9/10** | Tự nêu giới hạn rất rõ (`docs/02`), mô tả đúng phần "chống soi" chỉ là che giấu |
| Hiệu năng | **8/10** | Đo độc lập: 381 MiB/s mã hoá, 336 MiB/s giải mã, RAM phẳng khi ghi ra tệp |

---

## 2. Sản phẩm làm gì

Hai sản phẩm trong cùng repo, đừng nhầm:

- Thư mục gốc: **Roblox Anti-Lag Optimizer** (Luau, chạy trong Studio).
- `secure-script/`: **web tĩnh** mã hoá script → `.aia` + key script + trang chạy, và sinh loader Luau để giải mã trong game. Đây là đối tượng đang phân tích.

Luồng chính:

```
code gốc ──► PBKDF2-SHA256(600k vòng) trên JSON[1, time.raw, unixMs, keyUrl, mật khẩu(, sharedKey)]
                     │
                     ├─► khoá bọc (wrapKey) ──AES-GCM──► keyWrap  (nằm trong key script, KHÔNG ở header)
                     └─► fileKey (32 byte ngẫu nhiên) ──AES-GCM từng khối 1 MiB──► .aia
```

Định dạng `.aia`: `MAGIC "AIASCR1\n"` + 4 byte LE độ dài header + header JSON (đọc được: thời gian, tên tệp, link key, `kdf.salt`, `kid`, `chunk.ivPrefix`) + các khối bản mã.

Ba chế độ bảo vệ: **không mật khẩu**, **mật khẩu nhúng trong key script**, **hỏi mật khẩu khi chạy**; và hai kiểu khoá: **dùng chung** (`aia.key.js` cố định, có trên site) hoặc **riêng từng tệp**.

---

## 3. Đánh giá phần mật mã

| Thành phần | Hiện trạng trong mã | Đánh giá |
|---|---|---|
| Mã hoá dữ liệu | AES-256-GCM, tag 128 bit, khối 1 MiB | ✅ Đúng chuẩn, có xác thực toàn vẹn |
| Dẫn xuất khoá | PBKDF2-HMAC-SHA256, **600.000 vòng**, salt 16 byte ngẫu nhiên mỗi tệp | ✅ Trùng mức khuyến nghị hiện hành cho PBKDF2-SHA256 |
| Nonce/IV khối | 8 byte ngẫu nhiên (`ivPrefix`) + 4 byte số thứ tự khối, big-endian | ✅ Không tái sử dụng nonce trong một tệp; `ivPrefix` mới mỗi lần mã hoá |
| AAD khối | `MAGIC ‖ version ‖ index ‖ cờ-cuối ‖ tổng-khối (‖ SHA-256 header)` | ✅ Chống đảo thứ tự, cắt khối, chèn khối, tráo tệp |
| Toàn vẹn header | `headerHash = SHA-256(header)` (bỏ `keyWrap`, `encryptionSeconds`) | ✅ Sửa ghi chú/tên tệp cũng bị chặn; đây là điểm mạnh hiếm gặp |
| Khoá tệp | `fileKey` 32 byte ngẫu nhiên, chỉ tồn tại dạng **đã bọc** trong key script | ✅ Thiếu key script thì không mở được, dù biết mật khẩu |
| Khoá bọc (wrap AAD) | `['AIA1-WRAP', id, time.raw, unixMs, keyUrl, headerHash]` — **6 phần tử** | ⚠️ Bản cũ dùng **5 phần tử**; không có fallback ⇒ **BUG-1** |
| `kid` | 8 byte đầu SHA-256(khoá dẫn xuất), so trước khi giải mã | ✅ Báo "sai mật khẩu" rõ ràng |
| Hạn dùng `expiry` | Kiểm trong key script (`aia.key.js`, `hello.key.js`); **không** kiểm trong `core.decryptStream` | ⚠️ Tab Giải mã + CLI **bỏ qua** hạn dùng |
| Khoá dùng chung | `masterKey` in rõ trong `aia.key.js` công khai | ⚠️ Mặc định ⇒ mật khẩu là lớp bảo vệ **duy nhất** |
| "Chống soi" / ẩn dấu vết | Base64 + cắt chuỗi + tên biến ngẫu nhiên | ⚠️ Chỉ là làm khó đọc — xem RISK-3 |

**Nhận xét thiết kế**: việc tách *wrapKey* (từ mật khẩu + thời gian + link key) và *fileKey* (ngẫu nhiên, bọc lại) là lựa chọn đúng — nó cho phép đổi mật khẩu bằng cách bọc lại `fileKey` mà không phải mã hoá lại toàn bộ dữ liệu, đồng thời khiến tệp `.aia` một mình vô dụng. Phần "header đọc được" là đánh đổi có chủ ý và đã ghi rõ trong `docs/02`.

---

## 4. Kiểm thử: chạy lại toàn bộ (không tin số trong README)

Môi trường: Node v22.22.3, `npm i jsdom fengari` (chỉ để chạy test DOM và máy ảo Lua).

| Bộ test | Kết quả | Thời gian |
|---|---|---|
| `tests/run-node.mjs` (lõi mã hoá) | **244 / 244** | 11,9 s |
| `tests/run-editor.mjs` | **75 / 75** | ~1 s |
| `tests/run-github.mjs` | **101 / 101** | ~1 s |
| `tests/run-ide.mjs` | **104 / 104** | ~1 s |
| `tests/run-publish.mjs` | **103 / 103** | ~2 s |
| `tests/run-js.mjs` | **53 / 53** | ~1 s |
| `tools/check-static.mjs` | **310 / 310** | ~1 s |
| `tests/run-dom.mjs` (jsdom) | **348 / 348** | ~9 s |
| `tests/run-lua.mjs` (fengari, loader Luau thật) | **67 / 67** | ~22 s |
| `tests/stress.mjs --quick` | **93 / 93** | ~25 s |

Tổng: **1.522 / 1.522** trong môi trường này (244+75+101+104+103+53+310+348+67+24+93).

> Ghi chú cập nhật 2026-10-24: báo cáo ban đầu ghi 1.371/1.372 vì một test DOM trượt do
> lỗi cascade của `jsdom` (xem NOTE-2). Test đó đã được xử lý bằng cách đặt luật CSS
> `mode-code`/`mode-errors` **sau** `.ed-side`; đồng thời bổ sung test cho tính năng
> “link mã nguồn tự điền” trong tab **Sửa file** (DOM + đơn vị + kiểm tra tĩnh).

### Test từng trượt: `panel lỗi bị ẩn khi chỉ xem code` — và **không phải lỗi sản phẩm**

Test: `tests/run-dom.mjs` kiểm `getComputedStyle($('edErrorPane')).display === 'none'` sau khi gắn class `mode-code`.

Tôi kiểm chứng riêng:

- CSS thật có đúng luật: `.ed-split.mode-code #edErrorPane { display: none; }`
- `el.matches('.ed-split.mode-code #edErrorPane')` → **true**
- Nhưng `jsdom@24.1.3` lại trả `display: flex`, vì nó áp luật sau `.ed-errors, .ed-side { display: flex }` **đè lên** luật có ID (0-1-2-0 đáng lẽ phải thắng 0-0-1-0). Đây là lỗi cascade của jsdom, không phải của trang.

⇒ Trên trình duyệt thật panel vẫn ẩn đúng. **Đã xử lý trong lần sửa này**: chuyển hai luật ẩn panel xuống sau `.ed-side` trong `assets/style.css`, nên jsdom cũng áp đúng và bộ DOM test giờ **323/323**.

### Hiệu năng tôi đo độc lập (không dùng script của dự án)

Đường **streaming** (`encryptStream`/`decryptStream` ghi thẳng ra tệp), tệp 128 MiB:

| Chỉ số | Kết quả |
|---|---|
| Tốc độ mã hoá | **381 MiB/s** |
| Tốc độ giải mã | **336 MiB/s** |
| RAM đỉnh (RSS) | **98 MiB** ≈ 0,77 × kích thước tệp ⇒ đúng là xử lý theo luồng |
| Chi phí kích thước | **+2.887 byte / 128 MiB = 0,0022 %** (12 B prefix + header ~840 B + 16 B/khối) |

⇒ Các tuyên bố "+16 byte/khối" và "xử lý theo luồng" là **đúng** ở đường streaming.

Hai lưu ý:

- `tests/stress.mjs` báo "RAM đỉnh 243 MiB" cho tệp 64 MiB vì bộ stress dùng đường giữ toàn bộ trong bộ nhớ. **Trong trình duyệt**, `assets/app.js` chỉ stream ra đĩa khi có `showSaveFilePicker` (Chromium/Edge); nếu không, nó gom toàn bộ vào RAM (`memorySink`) ⇒ với tệp vài trăm MB trên Safari/Firefox, RAM ≈ kích thước tệp, còn "giới hạn 5 GiB" trên thực tế là **không khả thi**.
- Thông báo "Tệp lớn: sẽ mã hoá trong bộ nhớ, có thể cần nhiều RAM" đã có trong mã — tốt, nhưng nên nêu con số ước lượng.

---

## 5. Lỗi và rủi ro phát hiện được

### BUG-1 · Tệp mã hoá bản cũ không mở được bằng CLI/tab Giải mã (mức: cao, sửa dễ)

**Tái lập** (gói demo phát hành kèm repo chính là bản cũ):

```bash
cd secure-script
node tools/cli.mjs info examples/demo/hello.aia       # OK
node tools/cli.mjs decrypt examples/demo/hello.aia \
  --key examples/demo/hello.key.js --pass 'aia-demo-2026' --out /tmp/out1
# ✘ Không mở được khoá tệp trong key script — key script không khớp tệp .aia.
#   mã lỗi: WRAP_FAILED
```

**Nguyên nhân gốc** (đã kiểm chứng bằng script riêng):

- Mật khẩu **đúng**: `kid` dẫn xuất = `6412f3a153227ec7` = `header.kdf.kid` ⇒ PBKDF2 khớp hoàn toàn.
- `hello.key.js` bọc `fileKey` bằng AAD **5 phần tử**:
  `['AIA1-WRAP', id, time.raw, unixMs, keyUrl]`
- `assets/core.js:410` (bản hiện tại) dùng AAD **6 phần tử**, thêm `headerHash || ''`:
  `['AIA1-WRAP', id, time.raw, unixMs, keyUrl, '']`
- Khác AAD ⇒ GCM từ chối ⇒ `WRAP_FAILED`. Khi tôi tự unwrap bằng AAD 5 phần tử: **thành công**, giải mã ra đúng `hello.js`.

**Hệ quả**

- Mọi cặp `.aia` + key script tạo **trước** thay đổi AAD (kể cả gói demo đang quảng cáo ở đầu README) chỉ mở được bằng chính key script cũ chạy trong trình duyệt; **không** mở được bằng tab Giải mã của web hiện tại hay bằng CLI.
- Thông điệp lỗi gây hiểu nhầm: người dùng tưởng "sai key script" trong khi thật ra là bất tương thích định dạng.
- Đáng chú ý: phần **khối dữ liệu** đã có fallback tương thích (AAD 18 byte cho tệp cũ, 50 byte cho tệp mới), nhưng phần **wrap** thì quên.

**Vì sao test không bắt được**: `tests/run-dom.mjs:375` giải mã gói demo **bằng chính `hello.key.js`** (đường cũ), không đi qua `core.decryptStream`. Thiếu đúng một test "dùng lõi hiện tại mở gói demo".

**Gợi ý sửa** (khoảng 8 dòng, không phá định dạng):

```js
async function unwrapFileKey(wrapKey, keyWrap, aad, legacyAad = null) {
  const iv = base64ToBytes(keyWrap.iv);
  const ct = base64ToBytes(keyWrap.ct);
  for (const a of [aad, legacyAad]) {
    if (!a) continue;
    try {
      return new Uint8Array(await asyncSubtle().decrypt(
        { name: 'AES-GCM', iv, additionalData: a, tagLength: 128 }, wrapKey, ct));
    } catch { /* thử AAD kế tiếp */ }
  }
  throw new AIAError('WRAP_FAILED', 'Không mở được khoá tệp — sai mật khẩu hoặc key script không khớp.');
}
// trong decryptStream: legacyAad = utf8(JSON.stringify(['AIA1-WRAP', meta.id,
//   meta.time.raw, meta.time.unixMs, meta.keyUrl]))   // 5 phần tử, chỉ dùng khi meta.headerHash rỗng
```

### BUG-2 · Loader Luau không chạy trong game thật: đọc `game` qua `_G` (mức: cao — ĐÃ SỬA)

**Hiện tượng người dùng gặp:** mã hoá code → xuất bản lên GitHub → copy link script → dán vào
Delta/executor → **không có gì xảy ra**.

**Nguyên nhân (đã xác minh):** loader sinh bởi `buildLuaLoader` lấy biến toàn cục bằng
`pcall(function() return _G[name] end)`. Trong Luau của Roblox, **`_G` không phải môi trường
toàn cục** — nó chỉ là bảng chia sẻ giữa các script (devforum: “Luau does not store global
variables in global _G table… use `getfenv()` instead”). Vì vậy `_G['game']` là `nil`:
loader không tìm được `game:HttpGet`, cũng không thấy `request`/`syn`, rồi `error(...)`
ngay từ bước tải khoá. Executor thường chỉ hiện một dòng lỗi nhỏ nên người dùng thấy như
“script không chạy”.

**Vì sao test cũ không bắt được:** `tests/run-lua.mjs` chạy loader trong **fengari**
(Lua 5.3) — ở đó `_G` **chính là** bảng toàn cục, nên `_G.game` tồn tại và 31/31 test xanh.
Đây là bài học: mock phải mô phỏng cả *cơ chế sandbox* của nền tảng, không chỉ API.

**Đã sửa:** loader mới đọc theo thứ tự `getgenv()` → `getfenv(0)` → `_G` **và** dò trực tiếp
identifier (`game`, `request`, `http_request`, `syn.request`, `http.request`, `fluxus.request`,
`HttpGet`, `loadstring`, `load`); mỗi lỗi được in bằng `warn` **và** `print` kèm URL;
phát hiện hồi quy khi link trả về HTML (dán nhầm “link công khai”); kiểm tra tệp khoá đúng
32 byte. Thêm mục test **[5]** chạy loader trong môi trường “kiểu Roblox” (`_G` rỗng,
tách khỏi env) cùng 4 kịch bản executor khác — 46/46 đạt.

**Bài học phụ:** dán **URL trần** (`https://…/l-<id>.lua`) vào executor thì không có gì chạy —
phải dán `loadstring(game:HttpGet("…"))()`. UI nay sinh sẵn dòng lệnh này.

### BUG-3 · Dán/chọn nguồn mới trong lúc đang mã hoá → **không có gì xảy ra** (mức: cao — ĐÃ SỬA)

`startEncryption()` mở đầu bằng `if (state.busy) return;` — tức là **bỏ im lặng** yêu cầu mới.
Tình huống thật: người dùng thả một tệp lớn, sốt ruột nên dán code Lua vào ô dán; trang cập nhật
tên tệp (`script.lua`) nhưng **không mã hoá**, và khung kết quả vẫn là của tệp trước. Rất dễ hiểu
nhầm là “trang treo/lỗi”.

Phát hiện nhờ test DOM mới (§5b) chờ thẻ **Bản chạy trong game** mà không thấy xuất hiện.
Sửa: khi bận thì ghi nhớ yêu cầu (`state.pendingEncrypt`) và **chạy tiếp** ngay sau khi xong,
thay vì bỏ.

### BUG-4 · Ô chọn ngôn ngữ áp cho cả tệp tải lên (mức: trung bình — ĐÃ SỬA)

Khi thêm ô **Ngôn ngữ** cho code dán, lựa chọn tay được đọc toàn cục trong `refineSourceLang()`,
nên sau khi chọn “JavaScript” thì mọi tệp `.js` chứa Lua tải lên sau đó bị dán nhãn sai
(bug cũ “đuôi tệp lệch nội dung” quay lại). Sửa: lựa chọn tay chỉ lưu trên nguồn dán
(`src.langOverride`).

### BUG-5 · `buildLuaLoader` từ chối bản mã rỗng; khoá nhúng nằm liền mạch (mức: thấp — ĐÃ SỬA)

- `if (!cipherB64 …) throw` ⇒ script Lua rỗng (bản mã 0 byte — hợp lệ với AES-GCM) không dựng
  được loader. Nay chỉ chặn `null`/`undefined`.
- Ở chế độ tự chứa, khoá 32 byte được nhúng thành **một chuỗi base64 44 ký tự** — mở tệp `.lua`
  là thấy nguyên khoá. Nay khoá bị cắt thành mảnh **8 ký tự** (vẫn ghép lại khi chạy).

### NOTE-6 · Tốc độ giải mã trong game: AES-GCM thuần Luau là điểm nghẽn (mức: cần biết)

Đo trong máy ảo Lua (fengari, JS): **~2,5 KB/s** cho code Lua thường và giảm dần với file lớn
(16 KB ≈ 6,6 s). Luau thật trong Delta nhanh hơn nhiều lần nhưng **vẫn tuyến tính theo kích thước**.
Vì vậy: script vài trăm KB sẽ mất vài giây đến vài chục giây trước khi chạy. Trang đã cảnh báo
khi code Lua vượt **128 KB**; khuyến nghị giữ script game dưới ~100 KB hoặc chia nhỏ.

### RISK-1 · Code sau giải mã chạy cùng origin với trang (mức: cao)

`assets/core.js:1063`, `:1532`, `:2068` tạo **Web Worker từ `blob:`**. Worker `blob:` **kế thừa origin** của trang, nên không có ranh giới bảo mật nào: code được giải mã có thể gọi `fetch` ra ngoài, đọc `localStorage`/IndexedDB của chính site.

Trong khi đó `assets/github.js` lưu **GitHub Personal Access Token dạng thô** vào `localStorage` khi người dùng chọn "nhớ" (và gợi ý quyền *Administration: Read and write*, tức quyền tạo/xoá repo). Kịch bản: người dùng đã lưu token → mở một `.aia` nhận từ người lạ → bấm "Chạy thử ngay" → code đọc token và gửi đi.

Khác biệt đáng chú ý: khung **xem trước** trong tab Lập trình lại làm đúng — `index.html:486` dùng `sandbox="allow-scripts allow-modals"` (không `allow-same-origin`).

**Khuyến nghị**

1. Không lưu token (hoặc chỉ `sessionStorage`); cảnh báo rõ khi bật "nhớ".
2. Chạy code đã giải mã trong `<iframe sandbox="allow-scripts">` thay vì Worker cùng origin (đổi lại: mất khả năng dùng Web API mạnh — nhưng an toàn hơn nhiều).
3. Hỏi xác nhận trước khi chạy code từ tệp không phải do phiên hiện tại tạo ra.
4. Thêm CSP (xem NOTE-3) — giảm thiệt hại nếu có XSS.

### RISK-2 · "Không mật khẩu + khoá dùng chung" = không bảo vệ, nhưng UI vẫn cho bấm (mức: cao về mặt truyền thông)

`aia.key.js` công khai chứa `masterKey` cố định. Nếu để trống mật khẩu ở chế độ khoá dùng chung, khoá dẫn xuất chỉ phụ thuộc dữ liệu **công khai** (thời gian, `keyUrl`, `masterKey`) ⇒ bất kỳ ai có `.aia` đều giải mã được, không cần bẻ khoá.

Tài liệu nói đúng (`docs/02`, mục "Không đặt mật khẩu … che mắt"), nhưng:

- README (phần bán hàng) nhấn "🔒 Mã hoá thật", "🗝️ Key script là chìa khoá thật" — dễ khiến người dùng tin là đã an toàn khi chưa đặt mật khẩu.
- Giao diện không chặn, không cảnh báo đỏ ở trạng thái mặc định.

**Khuyến nghị**: nếu mật khẩu rỗng và khoá dùng chung → hiện cảnh báo đỏ + yêu cầu xác nhận; hoặc mặc định chuyển sang "khoá riêng từng tệp" + đặt mật khẩu gợi ý ≥ 12 ký tự.

### RISK-3 · "Ẩn dấu vết / chống soi" thực chất chỉ là Base64 (mức: trung bình)

Kiểm chứng bằng chính `buildRunSnippetStealth`: với mật khẩu nhúng `mat-khau-sieu-bi-mat`, snippet sinh ra **chỉ** làm các bước: cắt chuỗi, base64, đổi tên biến. Quét base64 trong snippet là ra ngay:

```
DECODE: "https://x/k.js"
DECODE: "mat-khau-sieu-bi-mat"     ← mật khẩu nhúng
DECODE: "x.js"
```

Tài liệu đã thừa nhận điều này (`docs/02` mục 3a; chú thích trong `core.js:1652` ghi rõ "đây chỉ là làm khó đọc, KHÔNG phải mã hoá"). Vấn đề chỉ là **cách đặt tên tính năng** dễ gây hiểu nhầm. Tương tự, "chống soi" bằng `#k=` chỉ là kiểm tra phía client: người xem mã nguồn trang vẫn thấy token và script. Không nên dùng cho mục đích "giấu link thật khỏi người quyết tâm".

### NOTE-1 · Hạn dùng (`expiry`) không được kiểm ở lõi

`core.decryptStream` không hề đọc `meta.expiry` (chỉ key script sinh ra mới kiểm). Vì vậy:

- CLI `decrypt` giải mã bình thường tệp đã hết hạn;
- tab Giải mã trên web cũng vậy;
- chỉ trang `run-*.html`/`AIA_UNLOCK.decrypt` mới chặn.

Không phải lỗ hổng (đã ghi trong tài liệu là "chỉ là lời nhắc"), nhưng hành vi **không nhất quán** giữa các đường. Nên kiểm ở `decryptStream` và chỉ cảnh báo thay vì chặn, kèm cờ `ignoreExpiry`.

### NOTE-2 · Test DOM "flaky" — **đã xử lý**

Nguyên nhân là thứ tự khai báo: `.ed-errors, .ed-side { display: flex }` nằm **sau**
`.ed-split.mode-code #edErrorPane { display: none }`, và jsdom áp "luật sau thắng" thay vì
tính đặc hiệu. Đã chuyển hai luật ẩn panel xuống **sau** `.ed-side` ⇒ đúng ở cả jsdom và
trình duyệt thật. Vẫn nên ghim phiên bản `jsdom` trong CI.

### NOTE-3 · Thiếu CSP và thiếu SRI cho tài nguyên của chính site

`index.html` không có `<meta http-equiv="Content-Security-Policy">`. Trang là tĩnh, tự phục vụ toàn bộ script (không CDN — điểm cộng), nên thêm CSP là rẻ và có tác dụng thật. Lưu ý app cần `blob:` cho Worker và URL tải:

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self' blob:; worker-src 'self' blob:;
               connect-src 'self' https://api.github.com https://raw.githubusercontent.com;
               img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; frame-src 'self' blob:;">
```

### NOTE-4 · Giới hạn "5 GiB" trong trình duyệt

Đã chặn trong mã, nhưng khả thi thực tế phụ thuộc API lưu tệp. Trên trình duyệt không có File System Access API, `memorySink` giữ toàn bộ bản mã ⇒ thực tế trần khoảng 1–2 GB tuỳ RAM. Nên nêu rõ trong UI.

### NOTE-5 · Loader Luau cần executor — và mâu thuẫn truyền thông trong repo

`assets/lua-loader.js` dùng `game:HttpGet` + `loadstring`. Như vậy nó **chỉ chạy trong môi trường executor** (không phải Roblox client thường). `docs/02` mục cuối có nói đúng điều này, nhưng:

- README của `secure-script` ghi "🎮 Loader Luau thật … tải khoá bằng `game:HttpGet` — đã chạy thử trong máy ảo Lua" mà không nói rõ **cần executor**;
- README ở thư mục gốc của repo lại mở đầu bằng "**không dùng executor**" cho dự án Anti-Lag. Hai thông điệp nằm cạnh nhau trong cùng repo rất dễ gây nhầm và cảnh báo từ cộng đồng.

Ngoài ra, về bản chất đây là công cụ **mã hoá + loader hai mục đích**: cùng một primitive được dùng để bảo vệ script của mình, hoặc để phát tán script "hub" khó bị soi. Bản thân công cụ hợp pháp (MIT), nhưng người dùng phải tự chịu trách nhiệm: chỉ dùng cho code mình sở hữu, tuân thủ ToS của nền tảng, không dùng để né bản quyền hay phát tán mã độc.

---

## 6. Điểm mạnh thật sự (có bằng chứng)

1. **Không có backend, không upload** — tôi kiểm tra toàn bộ `fetch` trong `assets/*.js`: chỉ `api.github.com` (do người dùng chủ động) và tải tệp `.aia`/key. Không telemetry, không CDN ngoài.
2. **Mật mã đúng chuẩn**, không tự chế: WebCrypto, AES-GCM, PBKDF2 600k, salt/IV ngẫu nhiên, AAD đầy đủ, `kid` để báo lỗi chính xác.
3. **Toàn vẹn header** (`headerHash`) — kể cả sửa "note" cũng bị phát hiện. Nhiều công cụ thương mại không làm việc này.
4. **Loader Luau thật sự là AES-GCM thuần Luau** (đối chiếu với WebCrypto trong `tests/run-lua.mjs`, 46/46 đạt trên fengari). Đây là phần khó và hiếm.
5. **Bộ test rộng và chạy lại được**, gồm cả test "GitHub giả" (không gọi mạng thật) và stress test.
6. **Tài liệu trung thực**: `docs/02` liệt kê đúng điểm yếu bản chất, không hứa "không thể bẻ".
7. **Escape HTML đúng chỗ**: dữ liệu từ header và từ API GitHub được render qua `escapeHtml` hoặc `textContent` (tôi kiểm `assets/github-ui.js` — dùng `textContent` cho option); khung xem trước chạy trong iframe sandbox không `allow-same-origin`.
8. **Dòng lệnh + tệp tĩnh**: dùng được offline, tự host được, miễn phí thật (GitHub Pages/Netlify/Vercel).

---

## 7. Khuyến nghị theo ưu tiên

**P0 — nên sửa trước khi quảng bá rộng hơn**

1. Không lưu GitHub token dạng thô trong `localStorage`; hoặc chỉ `sessionStorage` + cảnh báo; hoặc bọc bằng mật khẩu người dùng.
2. Chạy code đã giải mã trong iframe `sandbox="allow-scripts"` (không `allow-same-origin`) thay cho Worker cùng origin; tối thiểu là hỏi xác nhận khi code không do phiên hiện tại tạo.
3. Chặn/cảnh báo đỏ khi mã hoá với **mật khẩu rỗng ở chế độ khoá dùng chung**.

**P1 — lỗi chức năng**

4. Sửa **BUG-1**: fallback AAD 5 phần tử trong `unwrapFileKey`; thêm test "lõi hiện tại mở được `examples/demo/hello.aia`".
5. Làm rõ nhãn "Ẩn dấu vết" (ghi ngay trên UI: "chỉ base64 — không bảo vệ mật khẩu nhúng").
6. Thêm CSP như NOTE-3.

**P2 — chất lượng**

7. Kiểm `expiry` ở `decryptStream` (cảnh báo + cờ bỏ qua).
8. ~~Ổn định test DOM~~ — **đã làm** (NOTE-2); còn lại: ghim phiên bản `jsdom`.
9. UI: nêu rõ RAM cần cho tệp lớn khi không có File System Access API.
10. Cân nhắc mặc định "khoá riêng từng tệp" thay vì khoá dùng chung; hoặc luân chuyển `masterKey` theo thời gian.
11. Ghi rõ trong README của `secure-script`: loader Luau **cần executor** (`HttpGet` + `loadstring`).

---

## 8. Kết luận: dùng được trong trường hợp nào?

| Tình huống | Nên dùng? |
|---|---|
| Chia sẻ script nội bộ, cần một lớp "không đọc trực tiếp được", có đặt mật khẩu mạnh | ✅ Hợp lý |
| Bảo vệ code khỏi người dùng cuối quyết tâm (executor, DevTools, hook `AIA_UNLOCK`) | ❌ Không thể — như mọi giải pháp client-side |
| Bí mật thương mại / thông tin nhạy cảm | ❌ Không. Dùng backend cấp khoá + hạn dùng thật |
| Dùng như công cụ học tập về AES-GCM / streaming crypto trong trình duyệt | ✅ Rất tốt, có test và mã dễ đọc |
| Phát tán script trong game qua executor | ⚠️ Được về kỹ thuật, nhưng rủi ro ToS và là vùng xám; chỉ dùng cho code của bạn |

**Một câu**: đây là một dự án tĩnh được làm kỹ về mật mã và tài liệu, đáng dùng cho mục đích "che code có trách nhiệm" — với điều kiện đặt mật khẩu mạnh, hiểu rằng không có bảo vệ tuyệt đối, không lưu token GitHub trên site, và nhà phát triển cần sửa BUG-1 cùng ba điểm P0 nêu trên.

---

## 9. Phụ lục — lệnh tái lập

```bash
cd secure-script
npm i jsdom fengari      # chỉ để chạy test DOM + máy ảo Lua

# chạy toàn bộ kiểm thử
for t in run-node run-editor run-github run-ide run-publish run-js run-lua run-e2e-lua; do node tests/$t.mjs; done
node tools/check-static.mjs
node tests/run-dom.mjs
node tests/run-lua.mjs
node tests/stress.mjs --quick

# BUG-1: gói demo + CLI hiện tại
node tools/cli.mjs decrypt examples/demo/hello.aia \
  --key examples/demo/hello.key.js --pass 'aia-demo-2026' --out /tmp/out1   # → WRAP_FAILED

# đo hiệu năng streaming 128 MiB (script tự viết, không dùng test của dự án)
node /tmp/mem2.mjs   # → enc 381 MiB/s, dec 336 MiB/s, peak RSS 98 MiB, +2.887 B
```

*Báo cáo này do một phiên đánh giá độc lập tạo ra; không sửa dòng mã nào của dự án.*
