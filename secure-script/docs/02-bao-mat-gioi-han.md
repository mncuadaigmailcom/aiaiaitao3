# 02 · Bảo mật, giới hạn và những điều cần nói thật

## 1. Ta bảo vệ được gì

| Tình huống | Kết quả |
|---|---|
| Ai đó mở tệp `.aia` bằng text editor | Chỉ thấy header JSON + byte ngẫu nhiên. Không đọc được code. |
| Ai đó sửa 1 byte trong `.aia` | AES-GCM tag sai → từ chối giải mã. |
| Ai đó đảo thứ tự khối, cắt khối cuối, ghép khối lạ | AAD sai → từ chối. |
| Ai đó có `.aia` nhưng **không có key script** | **Không mở được** (chế độ mặc định): khoá tệp chỉ nằm trong `keyWrap` của key script. Chỉ bản cũ/tương thích mới giải mã bằng header + mật khẩu. |
| Ai đó có cả 2 tệp, **không biết mật khẩu** | Phải dò mật khẩu; mỗi lần thử tốn 600.000 vòng PBKDF2. |
| Ai đó có đủ mọi thứ và chạy được code | **Họ đọc được code.** Không có cách nào chặn tuyệt đối. |

## 2. Ba điểm yếu bản chất (không phải lỗi code)

### 2.1 Khi code chạy trên máy người khác, nó phải "mở ra"

Mọi sơ đồ mã hoá đều phải giải mã về dạng chạy được. Người dùng có quyền trên máy
họ có thể: chặn `AIA_UNLOCK.run`, sửa key script để in bản rõ, hoặc đọc bộ nhớ.
Đây là lý do các dịch vụ bảo vệ code chỉ **làm khó**, không **làm không thể**.

### 2.2 Header đọc được (theo yêu cầu)

Bạn yêu cầu thời gian và link key **không mã hoá để nhận biết**. Hệ quả:

- người nhận biết được thời điểm tạo, tên tệp, kích thước, link key;
- nhưng **khoá tệp (`keyWrap`) không nằm trong header** — nó chỉ có trong key script;
- kể cả có header + mật khẩu đúng, thiếu key script vẫn không giải mã được.

⇒ Cần **cả hai**: key script và mật khẩu. Đặt mật khẩu dài (≥ 16 ký tự ngẫu nhiên)
nếu tệp quan trọng.

### 2.3 Hạn dùng chỉ là "lời nhắc"

`expiry` nằm trong key script. Người dùng sửa `AIA.checkExpiry` là bỏ qua. Nếu cần
hạn dùng thật, phải có máy chủ cấp khoá theo thời gian — trái với mục tiêu 0 đồng.

## 3. Những lựa chọn đánh đổi

| Lựa chọn | Được | Mất |
|---|---|---|
| **Khoá dùng chung** `aia.key.js` (mặc định trên web) | Chỉ **một link** cho mọi tệp, mọi người; người nhận chỉ cần `.aia` + mật khẩu | `aia.key.js` công khai ⇒ **mật khẩu là lớp bảo vệ duy nhất**; một khoá dùng cho mọi tệp trong bộ |
| **Snippet chép-là-chạy** | Người nhận chỉ cần dán là xong | Code chứa sẵn link + bản mã (và mật khẩu nếu chọn nhúng) ⇒ rất dễ phát tán |
| **Riêng từng tệp** | Mỗi tệp một khoá; mất/ lộ một key không ảnh hưởng tệp khác | Mỗi tệp phải gửi kèm key script riêng |
| Bắt buộc key script | `.aia` một mình vô dụng; đúng ý "key script là chìa khoá" | Mất key script = mất dữ liệu; người nhận cần đủ 2 tệp |
| Nhúng mật khẩu vào key script | Người nhận không cần nhập gì | Ai có key script là mở được; mật khẩu nằm trong tệp |
| Không đặt mật khẩu | Đơn giản | Bảo vệ chỉ còn ở mức "che mắt" |
| Header đọc được | Đúng yêu cầu, dễ hỗ trợ, dễ kiểm tra | Lộ thời gian/tên tệp/link key |
| 600.000 vòng PBKDF2 | Chống dò tốt | Mở khoá chậm hơn (~0,15 s trên máy thử) |
| Khoá phụ thuộc `keyUrl` | Đổi link là không mở được | Đổi tên/thư mục tệp key cũng làm hỏng (phải giữ đúng link) |

## 3a. Snippet "chép là chạy" — tiện nhưng lộ

Snippet chứa **link key script + toàn bộ bản mã Base64** ngay trong một đoạn code.
Ai nhận được đoạn code đó là có **tất cả những gì cần** để chạy:

- **Không mật khẩu** (mặc định): mở được ngay, không cần biết gì. Coi như **không khoá**.
- **Nhúng sẵn mật khẩu**: mật khẩu nằm ngay trong snippet ⇒ người đọc thấy luôn.
- **Hỏi mật khẩu**: chỉ kiểu này mới thật sự chặn người không biết mật khẩu.

Snippet cũng làm tăng kích thước ~1,34 lần và chỉ dùng cho tệp ≤ 1,5 MiB.

**Giới hạn ngôn ngữ**: trình duyệt chỉ chạy được JavaScript/TypeScript. Tệp Lua/Luau/Python…
vẫn mã hoá & giải mã đúng từng byte, nhưng **không chạy thử** trong trang (trang tự nhận ra
nhờ dò nội dung và khoá nút chạy — đây là hành vi đúng, không phải lỗi mã hoá).

**Token link** là bản mã thật (AES-256-GCM), nhưng:

- header token **đọc được** thời gian tạo + link key + keyId (đúng thiết kế "thời gian không mã hoá");
- token dài ~1,33 lần URL vì Base64 — link càng dài token càng dài;
- khi người nhận mở khoá xong thì **họ thấy link** — mã hoá chỉ bảo vệ lúc đang truyền;
- `aia.key.js` là tệp công khai ⇒ token **không mật khẩu** thì ai có token cũng mở được.

**Kiểu "ẩn dấu vết"** (mặc định) chỉ làm cho đoạn code **khó nhận ra** bằng mắt: bỏ chú
thích, giấu link/tên API trong Base64, đổi tên biến ngẫu nhiên, cắt chuỗi thành mảng.
Nó **không phải mã hoá** và **không ngăn được** người biết kỹ thuật:

- mở DevTools → tab Network là thấy request tải `aia.key.js`;
- copy đoạn code ra công cụ làm đẹp là đọc được toàn bộ;
- `atob()` vài chuỗi là ra link, ra bản mã.

Muốn người khác **không chạy được** thì phải dùng **mật khẩu hỏi khi chạy**, không phải
ẩn dấu vết.

## 3b. Chế độ khoá dùng chung — nói thẳng

Yêu cầu "một link key cho mọi lần mã hoá, mọi người" chỉ làm được nếu **khoá gốc nằm
trong một key script công khai** (`aia.key.js` phát hành kèm site). Hệ quả toán học,
không phải lỗi code:

- Ai đọc `aia.key.js` cũng biết khoá gốc `S`.
- Nhưng `S` **một mình không đủ**: `keyWrap`/khoá phiên còn cần **mật khẩu** qua
  PBKDF2 600.000 vòng. Không có mật khẩu ⇒ `WRONG_PASSPHRASE`.
- Vì vậy: **đặt mật khẩu là bắt buộc trên thực tế** ở chế độ dùng chung. Nếu để trống,
  bất kỳ ai có `.aia` + `aia.key.js` đều mở được (tương đương "khoá mở").
- Cần tách biệt tuyệt đối theo từng tệp → chọn **"Riêng từng tệp"**.

## 4. Cách dùng an toàn

1. **Đặt mật khẩu mạnh** (≥ 16 ký tự, hoặc dùng nút "tạo"). Lưu ở trình quản lý mật khẩu.
   Ở chế độ dùng chung, **không đặt mật khẩu = không bảo vệ**.
2. **Không bật "nhúng mật khẩu"** nếu gửi qua kênh công khai.
3. **Gửi `.aia` và `key.js` qua hai kênh khác nhau** khi có thể (ví dụ: tệp qua email,
   mật khẩu qua tin nhắn).
4. **Giữ đúng link key**: nếu lúc mã hoá bạn ghi `./key.js`, hãy để key script đúng
   tên đó cạnh tệp `.aia` (hoặc ghi đúng URL CDN) — chuỗi này là một phần của khoá.
5. **Sao lưu key script** ở nơi an toàn: ở chế độ mặc định, mất nó là mất dữ liệu.
6. Với tệp quan trọng: **giữ bản gốc** ở nơi an toàn. Mất mật khẩu = mất dữ liệu,
   không có cửa sau.

## 4b. Tab Lập trình · trang trắng · GitHub

- **Trang trắng "chống soi"** chỉ là **che giấu**: HTML và token vẫn nằm trong trang,
  DevTools đọc được. Token đã mã hoá nên **không lộ link đích**, và khi **không có `#k=`**
  trang **không gọi mạng** — nhưng ai có link mở (`#k=<khoá>`) thì mở được đủ tính năng.
  Muốn chặn thật: **luôn đặt khoá mở** và gửi link mở qua kênh riêng.
- **Token GitHub** chỉ nên cấp quyền tối thiểu cho đúng repo cần dùng; **đừng** tick
  “Nhớ token” trên máy công cộng. Token nằm trong `localStorage` của trình duyệt
  (không mã hoá) — ai dùng chung máy/mở DevTools đều đọc được. Web chỉ gửi token trong
  header `Authorization` tới `https://api.github.com`, **không** đưa vào URL, không gửi
  tới máy chủ nào khác (không có backend).
- **Code bạn đẩy lên GitHub là bản rõ**. Nếu cần giữ bí mật, hãy đẩy **bản `.aia`** hoặc
  **snippet đã mã hoá** thay vì code gốc; repo riêng tư vẫn nên coi là “bán công khai”.
- **Trình kiểm tra lỗi không chạy code**: JS chỉ được **biên dịch thử** bằng `new Function`,
  không gọi hàm; mã Lua/Python chỉ phân tích văn bản (có thể bỏ sót).

## 5. Những gì đã kiểm chứng (và chưa)

Đã kiểm chứng tự động trên Node 22 + WebCrypto:

- sai mật khẩu → `WRONG_PASSPHRASE`;
- sửa link key trong header → `WRONG_PASSPHRASE`;
- sửa 1 bit → `AUTH_FAILED`;
- cắt tệp → `UNEXPECTED_EOF`;
- ghép thêm dữ liệu → `TRAILING_DATA`;
- đảo khối → `AUTH_FAILED`;
- magic sai → `BAD_MAGIC`;
- tệp > 5 GiB → `TOO_LARGE`;
- thiếu key script → `KEY_REQUIRED`;
- sửa `keyWrap` → `WRAP_FAILED`.

**Chưa kiểm chứng:** hành vi trên Chrome/Firefox/Safari thật, khả năng chịu tải
5 GiB trên máy yếu, và việc chống can thiệp phía client (về bản chất là không thể).

## 6. Câu hỏi "có ai giải được code của tôi không?"

- Người **không** có tệp: không.
- Người có `.aia`, **không** có key script: **không** (chế độ mặc định).
- Người có `.aia` + `key.js`, **không** có mật khẩu: khó, nhưng khả thi nếu mật
  khẩu yếu — PBKDF2 chỉ làm chậm, không chặn.
- Người có key script đã nhúng mật khẩu: mở được ngay.
- Người có đủ mọi thứ và chạy được code: **có**, và không có công cụ nào trên đời
  ngăn được điều đó.

Đừng hứa với khách hàng rằng "không ai giải được". Hãy nói: "cần mật khẩu, và mọi
sửa đổi đều bị phát hiện".


## 12. "Chống soi 404" thật sự chặn được gì

- **Người mở link thường** chỉ thấy trang trắng có dòng `404: Not Found`; không có
  script, không có link, không có dấu vết sản phẩm.
- **Người mở DevTools** vẫn thấy đúng đoạn HTML đó — nhưng trong đó **không có gì**:
  code, khoá và địa chỉ tệp khoá đều không nằm trên trang.
- **Khoá vẫn công khai** ở `k-<id>.txt` (đúng thiết kế: loader trong game phải tải được).
  Ai đoán ra tên tệp và tải được nó thì có khoá — nhưng vẫn cần bản mã trong loader,
  và với script rất lớn thì việc giải mã thủ công là bất khả thi trong thực tế.
- **Không phải HTTP 404 thật**: GitHub Pages luôn trả 200 cho tệp có thật; chữ "404" là
  nội dung trang. Muốn 404 thật thì phải có máy chủ riêng.
- **Roblox/Luau**: loader cần `game:HttpGet` (executor có HTTP) và `loadstring`. Môi
  trường không cấp hai hàm này thì loader báo lỗi rõ ràng chứ không chạy bừa.
- **Token GitHub** nằm trong máy người dùng (`localStorage` nếu chọn nhớ). Chỉ cần
  quyền *Contents: read/write* + *Pages: read/write* + *Administration: read/write*
  (tạo repo). Đừng dùng token của tài khoản chính.
