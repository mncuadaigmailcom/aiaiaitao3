# 06 · Phân tích `index.html.1.js` và cách áp dụng vào tab “Lập trình”

> Tài liệu này ghi lại việc **đọc – phân tích file tham chiếu** `index.html.1.js` ở thư mục gốc repo
> rồi **chọn lọc** tính năng để nâng cấp tab **Lập trình** của `secure-script/`.
> Nguyên tắc: giữ sản phẩm tĩnh, miễn phí, không backend, không gửi code đi đâu, và **không làm mất**
> tính năng cũ.

---

## 1. File tham chiếu là gì

| Thuộc tính | Giá trị đo được |
|---|---|
| Kích thước | **531.642 ký tự** (~519 KiB), **8.707 dòng** |
| Loại | Một trang HTML **tự chứa**: `<style>` + HTML + `<script>` trong **cùng một tệp** |
| Tiêu đề | `Code Space - Tích Hợp VS Code, Code Web & Boss Bot GitHub` |
| Thư viện ngoài | **Monaco Editor 0.45.0** nạp từ `cdnjs.cloudflare.com` |
| Số `id` trong HTML | **271** |
| Số hàm JavaScript | ~**381** (`function …`) |
| Mô hình dữ liệu | 2 “trang” (`p1`, `p2`), mỗi trang 3 tab **HTML / CSS / JS** |
| Xem trước | `<iframe srcdoc>` + `postMessage` để bắt `console.log` |
| Lưu dự án | 5 ô, khoá `codespace_saved_projects`, snapshot `{p1:{html,css,js}, p2:{…}}` |
| Console | Tối đa **1.500 dòng** (`CONSOLE_MAX_LINES`), chặn log quá dài |
| Giao diện soạn thảo | 6 lựa chọn: `vs-dark`, `vs` (sáng), `dracula`, `monokai`, `cyberpunk`, `hc-black` |
| Tính năng phụ | AI sidebar (ChatGPT/Claude/Gemini/DeepSeek…), “Boss Bot GitHub” 5 chế độ, combo tính năng, **quảng cáo giả + video quảng cáo 5–60 giây** |

Cấu trúc ba khối: CSS khoảng 900 dòng đầu → HTML khoảng 1.000 dòng (thanh công cụ, 2 khung soạn thảo,
khung xem trước, console, ~20 hộp thoại) → JavaScript khoảng 6.500 dòng (Monaco, chạy code, lưu dự án,
GitHub, AI, quảng cáo, combo).

---

## 2. Bản đồ tính năng và quyết định áp dụng

| # | Nhóm | Trong `index.html.1.js` | Quyết định cho `secure-script` | Lý do |
|---|---|---|---|---|
| 1 | Soạn thảo | Monaco: số dòng, highlight cú pháp, autocomplete, minimap | **Tự viết** editor: textarea + gutter + zoom + 4 theme | Monaco ~vài MB, phải tải CDN ⇒ mất khả năng chạy offline, phá kiểm tra “không nạp script ngoài”, không test được bằng jsdom |
| 2 | Nhiều tệp | 2 trang × 3 tab HTML/CSS/JS | **Nhiều tệp tổng quát** (tối đa 12): thêm / đổi tên / đóng / chuyển tab | Đúng nhu cầu: một dự án script có thể gồm nhiều tệp |
| 3 | Tìm & thay | `model.findMatches` + `executeEdits`, `Ctrl+F` | **`findMatches` / `replaceAllText` thuần** + thanh tìm/thay | Không cần Monaco vẫn làm được, có đếm kết quả + phân biệt hoa/thường |
| 4 | Định dạng | `formatDocument` của Monaco, HTML/CSS tự viết | **`formatCode()`**: JS/TS, Lua/Luau, Python (dùng `reverse.js`), JSON | Tái dùng bộ định dạng đã có test; nói rõ CSS/HTML chưa hỗ trợ thay vì sửa bừa |
| 5 | Chạy code | `runCode()` → `iframe.srcdoc` | **Web Worker** bằng `buildWorkerSource()` sẵn có | Code không chạm DOM trang; cùng cơ chế với tab Giải mã ⇒ hành vi nhất quán |
| 6 | Console | `postMessage` từ iframe, 1.500 dòng | **Panel Console** trong tab, 1.500 dòng, log/warn/error/sys | Giữ đúng trải nghiệm, không cần iframe |
| 7 | Nút chạy | `▶ Chạy`, `⚡ Tự chạy` | `Chạy ▶` + `Ctrl+Shift+Enter`, `Dừng`, `Chạy lại`, `Xoá log` | Tự chạy liên tục dễ gây lag khi gõ code lớn ⇒ bỏ |
| 8 | Lưu dự án | 5 ô `localStorage`, có tên/thời gian/kích thước, ghi đè, đổi tên, xoá, tải | **5 ô lưu** `aia.ide.slots`: lưu mới, mở, ghi đè, đổi tên, xoá, tải ZIP | Đúng tính năng người dùng yêu cầu; thêm kiểm tra dữ liệu hỏng và giới hạn dung lượng |
| 9 | Tự lưu | `save-indicator` | **Tự lưu nháp** `aia.ide.workspace` + chỉ báo “đã lưu · HH:MM”; `Ctrl+S` | Tránh mất code khi lỡ đóng tab |
| 10 | Tải xuống | menu tải: ZIP, tệp 1, tệp 2, tách riêng | **Tải ZIP** toàn bộ tệp + tải từng tệp đang mở | Gọn hơn, đủ dùng |
| 11 | Nhập tệp | `btn-import-file`, `btn-import-folder` | **Nạp nhiều tệp** cùng lúc vào tab | Đơn giản, không cần File System Access API |
| 12 | Giao diện màu | 6 theme Monaco | **4 theme CSS**: mặc định, Dracula, Monokai, Sáng | Đủ để đổi cảm giác, 0 byte thư viện |
| 13 | Cỡ chữ | `btn-font-plus/minus` | `A− / A+ / 100%` + `Ctrl +/-/0`, nhớ lựa chọn | Đã có từ bản trước, giữ nguyên |
| 14 | Bố cục | PC/Mobile, kéo chia, toàn màn hình code/xem/log | **Chia đôi: code \| lỗi**, chỉ code, chỉ lỗi | Phù hợp mục tiêu “tìm lỗi”; toàn màn hình để trình duyệt lo |
| 15 | Phím tắt | `Shift+Alt+F`, `Ctrl+S`, `Ctrl+Enter`… | `Ctrl+F/H`, `Ctrl+S`, `Ctrl+Enter` (kiểm tra), `Ctrl+Shift+Enter` (chạy), `Shift+Alt+F` | Giữ thói quen VSCode |
| 16 | GitHub | “Boss Bot” 5 chế độ: Tạo Web / Sửa Web / Tạo Script / Sửa Script / Lấy Code | **Hộp thoại 4 tab**: API key · dự án mới · sửa file (mở = lấy code) · kết quả | Đã có từ bản trước; tab “Sửa file” chính là “Lấy Code” |
| 17 | Chống soi | không có | **Trang trắng** (giữ từ bản trước) | Yêu cầu riêng của dự án |
| 18 | AI sidebar | Gửi code sang ChatGPT/Claude/Gemini/DeepSeek | **Không áp dụng** | Trái nguyên tắc “code không rời khỏi máy” |
| 19 | Quảng cáo | `.fake-ad`, video 5–60 giây, “bắt buộc xem” | **Không áp dụng** | Lừa người dùng, làm chậm, không phù hợp sản phẩm |
| 20 | Combo tính năng | Bật/tắt nhóm nút, ẩn thanh gốc | **Không áp dụng** | Phức tạp, dễ lỗi, không phục vụ mục tiêu |
| 21 | 2 trang web | `p1`, `p2`, chế độ web 2 | **Không áp dụng** | Sản phẩm này mã hoá **script**, không dựng website |
| 22 | Chia sẻ link | mã hoá code vào query `?h=…&c=…&j=…` | **Không áp dụng** | Trùng mục đích với “mã hoá link” nhưng kém an toàn hơn (Base64, không có khoá) |

---

## 3. Chi tiết kỹ thuật đáng học và cách làm lại

### 3.1 Monaco → tự viết, nhưng giữ đúng hành vi

| Monaco (file tham chiếu) | Bản thay thế trong `assets/ide.js` |
|---|---|
| `editor.getValue()` / `setValue()` | đọc/ghi `textarea`, đồng bộ vào mô hình `files[]` |
| `model.findMatches(str, …)` | `findMatches(text, query, {caseSensitive, limit})` → `{start,end,line}` |
| `editor.executeEdits('replaceAll', …)` | `replaceAllText(text, query, replacement)` ghép mảnh, **không** diễn giải `$&` |
| `editor.getAction('editor.action.formatDocument')` | `formatCode(code, {lang})` — dùng `beautify` của `reverse.js` |
| `monaco.editor.defineTheme(...)` | 4 class CSS `theme-dark / dracula / monokai / light` |
| `editor.revealRangeInCenter` | `scrollToOffset()` + `setSelectionRange` |

Lợi ích: 0 KB thư viện, chạy được khi **offline**, kiểm thử được bằng Node/jsdom, và không tạo
kết nối mạng nào khi người dùng chỉ đang gõ code.

### 3.2 Console: iframe + `postMessage` → Web Worker

File tham chiếu chèn code vào `iframe.srcdoc` rồi nghe `message` để in log. Cách đó phù hợp khi
code là **trang web** (cần DOM). Với script, `secure-script` đã có `buildWorkerSource()` (dùng cho
tab Giải mã): code chạy trong Worker, `console.*` được chuyển thành `postMessage`, lỗi runtime được
giải thích bằng tiếng Việt. Tab Lập trình dùng lại đúng cơ chế đó ⇒ cùng một hành vi ở mọi nơi.

### 3.3 Lưu dự án: cùng ý tưởng, chắc tay hơn

| File tham chiếu | `secure-script` |
|---|---|
| `SAVE_SLOT_MAX = 5`, khoá `codespace_saved_projects` | `MAX_SLOTS = 5`, khoá `aia.ide.slots` |
| snapshot `{p1:{html,css,js}, p2:{…}}` | `{id, name, at, active, files:[{name, content}]}` (đa tệp, không giới hạn 3 loại) |
| `JSON.parse` trong `try/catch`, lọc `item.data` | `normalizeSlots()`: bỏ bản hỏng, cắt quá 5, chuẩn hoá tên tệp |
| Cảnh báo bằng `appAlert` khi đầy bộ nhớ | Trả `{ok:false, reason}` và hiển thị ngay trong hộp thoại + toast |
| Không giới hạn kích thước | `MAX_SLOT_BYTES` (1,5 MB/ô) và `MAX_WORKSPACE_BYTES` (2 MB nháp) |
| Không có tự lưu | Tự lưu nháp sau 0,7 giây + `Ctrl+S` + `beforeunload` |

### 3.4 Các chi tiết nhỏ đáng giữ

- **Chỉ báo đã lưu** (`save-indicator`) → `#edSavedHint` (“chưa lưu…” / “đã lưu · HH:MM”).
- **Đếm kết quả tìm** (`1/12`) → `#edFindCount`.
- **Giới hạn dòng console** (1.500) → `CONSOLE_MAX_LINES`.
- **Phím tắt định dạng** `Shift+Alt+F`.
- **Nạp nhiều tệp một lần** (file input `multiple`).

---

## 4. Những gì cố ý **không** port

1. **Quảng cáo giả và video quảng cáo** (5 giây “bắt buộc xem”, 60 giây “bỏ qua sau 15 giây”).
   Đây là thành phần gây khó chịu/lừa người dùng, không liên quan tới mã hoá.
2. **Monaco từ CDN.** Trang của dự án phải chạy được **offline** và không nạp script từ host lạ
   (`tools/check-static.mjs` kiểm tra đúng điều này). Monaco còn làm trang nặng thêm vài MB.
3. **AI sidebar.** Mọi tính năng AI trong file tham chiếu đều gửi code ra dịch vụ ngoài — trái
   cam kết “code không rời khỏi máy”.
4. **Hai trang web (`p1`, `p2`) và chế độ web 2.** Sản phẩm này mã hoá script, không dựng website.
5. **Combo tính năng / ẩn thanh công cụ.** Phức tạp, dễ sinh lỗi trạng thái, không phục vụ mục tiêu.
6. **Chia sẻ code qua query string Base64.** Kém an toàn hơn token `AIALNK1.…` đã có.

---

## 5. Tab “Lập trình” trước và sau khi phân tích file tham chiếu

| Khả năng | Trước | Sau |
|---|---|---|
| Tệp | 1 tệp | **12 tệp** dạng tab, thêm/đổi tên/đóng/chuyển, nạp nhiều tệp |
| Tìm kiếm | không | **Tìm & thay thế** có đếm kết quả + phân biệt hoa/thường |
| Định dạng | không | **JS/TS, Lua/Luau, Python, JSON** (`Shift+Alt+F`) |
| Chạy thử | chỉ ở tab Giải mã | **Chạy trong tab Lập trình** + **Console** log/warn/error |
| Giao diện màu | 1 | **4** (mặc định, Dracula, Monokai, Sáng) |
| Lưu | nháp 1 tệp | **5 ô lưu dự án** + tự lưu nháp + `Ctrl+S` + ZIP |
| Số dòng, zoom, thống kê, panel lỗi, chia đôi | có | giữ nguyên, thêm chỉ báo lưu + đếm tệp |
| Mã hoá · chống soi · GitHub | có | giữ nguyên |

---

## 6. Đối chiếu với yêu cầu ban đầu

| Yêu cầu | Cách đáp ứng |
|---|---|
| “Tính năng lập trình” giống file tham chiếu | Có đủ nhóm chính: đa tệp, tìm/thay, định dạng, chạy + console, theme, ô lưu, ZIP, phím tắt |
| Không làm mất tính năng cũ | Toàn bộ 186 kiểm thử DOM cũ + 244 kiểm thử lõi vẫn đạt |
| Chạy test tìm lỗi | Thêm `tests/run-ide.mjs` (104) và 57 kiểm thử DOM mới cho tab Lập trình |
| Miễn phí, không backend | Không thêm dịch vụ nào; tất cả trong trình duyệt |
| Code không rời máy | Không AI, không CDN, không telemetry; GitHub chỉ khi người dùng tự bấm |

---

## 7. Kiểm chứng

```bash
cd secure-script
node tests/run-ide.mjs     # 104 kiểm thử lõi không gian làm việc
node tests/run-editor.mjs  # 75 kiểm thử dò lỗi / thống kê
node tests/run-dom.mjs     # 243 kiểm thử giao diện (gồm 57 bài cho tab Lập trình nâng cao)
node tools/check-static.mjs
```

`tests/run-ide.mjs` phủ: tên tệp (ký tự cấm, trùng tên, giới hạn), thêm/đổi tên/xoá tệp, lưu–đọc
`localStorage` (kể cả dữ liệu hỏng, quota đầy, quá lớn), tìm/thay (hoa-thường, chồng lấn, tiếng Việt,
`$&` là chữ thường), định dạng (JSON/JS/Lua/CSS), 5 ô lưu (đầy, ghi đè, đổi tên, xoá, quá lớn).

---

## 8. Hạn chế đã biết

- **Chưa tô màu cú pháp** như Monaco (textarea thuần). Có thể thêm sau bằng lớp `pre` trong suốt.
- **Không có autocomplete/IntelliSense**, không điều hướng định nghĩa.
- Chỉ **chạy được JavaScript/TypeScript** trong trình duyệt; Lua/Python vẫn soạn, kiểm tra, mã hoá bình thường.
- `localStorage` của trình duyệt chỉ ~5 MB ⇒ nháp 2 MB, mỗi ô lưu 1,5 MB; dự án lớn nên dùng **Tải ZIP**.
- Định dạng CSS/HTML chưa hỗ trợ (báo rõ thay vì sửa làm hỏng code).
