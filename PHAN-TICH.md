# Phân tích 2 file trong repo `aiaiaitao3`

Ngày phân tích: 2026-09-17 · Branch: `arena/01a0af79-aiaiaitao3` · Commit gốc: `9e42057`

---

## 0. Cập nhật v4.12 (đã thực hiện theo yêu cầu)

Port **5 tính năng di chuyển** từ `aiaiaitao3` vào trang 📚 Script Hub của `script.js`, kèm bộ test
tự động chạy thật trong máy ảo. Kết quả: **`node tests/run.js` → 194 PASS · 0 FAIL**.

**Đã thêm (toàn bộ là tiện ích nội bộ, không tải gì từ mạng):**

| Thẻ mới trong Script Hub | Hoạt động |
|---|---|
| 🚀 Bay | BodyVelocity/BodyGyro · Space lên · Shift/Ctrl xuống · WASD lái |
| 🧱 Xuyên Tường | NoClip |
| 🦘 Nhảy Vô Hạn | JumpRequest → ChangeState(Jumping) |
| 🏃 Chạy Trên Thảm | **Chế độ chạy bộ kiểu aiaiaitao3**: trải thảm dưới chân + tăng tốc + ẩn menu + hiện cụm nút ⬆🪩⬇✕ nổi trên màn hình |
| 🪩 Thảm Kính | Chỉnh **Rộng × Cao × Dài**, ⬆⬇ nâng/hạ, thảm bám theo người, giữ người đứng trên mặt thảm khi đang xuyên tường |

Kèm **cụm nút nổi trên màn hình game** (⬆ nâng · 🪩 bật/tắt thảm · ⬇ hạ · ✕ tắt hết, góc phải): tự hiện khi thảm/bay/chạy-trên-thảm đang bật, tự ẩn khi tắt. Và **khung ⚙ Tuỳ chỉnh** nằm trên cùng danh sách thẻ (`HubMove_Panel`, LayoutOrder 0, không bị xoá
khi lọc/tìm kiếm): tốc độ bay · chạy · nhảy · 3 chiều thảm · ⬆/⬇ · 🛑 Tắt hết + nhãn trạng thái.
Tất cả state gom trong `S.Move` (không tốn slot local cấp chunk), mọi connection qua `trackConn()`,
tự bật lại sau respawn qua `CharacterAdded`.

**v4.22 — 🧱 XUYÊN TƯỜNG "CỨNG" cho mọi game + 🧲 tự đẩy xuyên khi bị chặn cứng:**
- 🔴 **Lỗi thật (đúng như người dùng báo "có game/tường không xuyên được")**: hub cũ chỉ **quét lại 2
  giây/lần**, nên game/anti-cheat nào **bật lại `CanCollide` mỗi frame** là thắng → bật 🧱 mà vẫn kẹt
  tường. Nay hub ghi `CanCollide = false` **MỖI FRAME** trên đúng danh sách part của mình (rẻ), quét đầy
  đủ 0,5s/lần để bắt part mới (kể cả part game thả vào mà không bắn event), và thêm lớp ghi ở **CUỐI
  frame** (`BindToRenderStep("BC_NoClip", Enum.RenderPriority.Last.Value)`) nên luôn là người ghi sau cùng.
- 🧲 **Tự đẩy xuyên**: game chặn CỨNG (tắt va chạm vẫn không qua) mà bấm WASD > 0,2s không nhích → hub tự
  nhích `CFrame` theo hướng đang bấm (tối đa 3 stud/frame, giữ nguyên độ cao Y). Không bấm gì, đi lại
  bình thường, hoặc tắt công tắc 🧲 trong khung ⚙ thì **không đụng vào người chơi**.
- 🐞 **2 lỗi do bộ test bắt được ngay khi làm tính năng**:
  1) hàm vẽ nút 🧲 nhìn thấy biến **toàn cục** `pcBtn` (vì `local pcBtn` khai báo sau hàm) → bấm nút là
     `attempt to index a nil value` (nút chết). Nay khai báo local TRƯỚC hàm vẽ.
  2) `MV.Refresh()` (respawn) **xoá trắng** bảng giá trị `CanCollide` gốc trong lúc 🧱 vẫn bật → mất giá
     trị gốc của part đang tắt va chạm → tắt 🧱 xong nhân vật vẫn `CanCollide = false` và **rơi xuyên map
     mãi**. Nay chỉ quên part đã bị xoá (`MV._NcForgetLost`), và part nào từng bị mình tắt mà mất dấu giá
     trị gốc thì coi gốc là `true`.
- 10 test mới **T1–T10** (177 PASS · 0 FAIL). **Mutation check**: quay lại hành vi cũ → T1/T2/T7 FAIL;
  xoá trắng bảng gốc như bản cũ → T3 FAIL; bỏ khai báo local → 6 test đỏ.

**v4.24 — 🛡 🔲 khiên QUAY VÒNG TRÒN quanh mình (194 test PASS):**
- Đúng ý *"đứng im thì nhân vật tự bay vòng tròn và hình vuông quanh mình cũng bay vòng tròn"*: ⭕ Vòng
  tròn (đứng im, không bấm WASD, quanh đây không có mối nguy -> tự bay vòng quanh chỗ đang đứng) đã có
  từ v4.19 và **vẫn nguyên**; nay **cả cái hình vuông quanh mình cũng QUAY VÒNG** — 4 vách xoay quanh
  trục dọc, đang bay vòng tròn thì quay **cộng thêm đúng tốc độ vòng bay**, nên nhìn như cả "cái hộp"
  đang bay vòng quanh mình. Nút **🔲 Quay: BẬT/TẮT** + ô **Tốc** (°/giây, mặc định 60 = 1 vòng/6 giây;
  `0` = không quay). Tắt quay là khiên trả về hướng vuông góc trục như cũ.
- 🐞 **1 lỗi bộ test bắt được ngay khi làm**: tốc độ quay là **độ/giây** nhưng code cộng thẳng vào biến
  **radian** -> quay nhanh ~57 lần (V3, V5 đỏ ngay). Nay `θ += math.rad(dt · °/giây)`.
- 🐞 **1 lỗi của MOCK được sửa**: `CFrame.new(...) * CFrame.Angles(...)` bị mock bỏ qua phép nhân **và**
  bỏ qua góc (vì `__name` nằm trong metatable -> `b.__name == nil` -> rơi về nhánh "trả về a"), nên mọi
  CFrame xoay đều "không xoay" trong test. Nay `__name` là trường thật, phép nhân cộng góc xoay, và
  `CFrame.Angles` / `ToOrientation()` / `GetComponents()` mô phỏng xoay quanh trục dọc.
- Dọn lại khung 🛡: hàng **🔲 Cỡ** của v4.23 nằm **đè lên dòng trạng thái** -> nay tách ra **hàng riêng**
  (cùng 🔲 Quay + Tốc), khung cao 174 -> 200px, ghi chú ngắn lại cho vừa khung.
- 6 test mới **V1–V6** (194 PASS). **Mutation check**: bỏ cập nhật góc quay -> V2–V6 đỏ; quay sai đơn vị
  độ/radian -> V3+V5 đỏ; quay mà không xoay vách -> V2–V6 đỏ; bỏ chế độ bay vòng tròn -> Q3/Q5/Q6/V1 đỏ.

**v4.23 — 🛡 BAY AN TOÀN sống qua "hết trận → trận mới" + 🔲 khiên về cỡ hợp lí (188 test PASS):**
- 🔴 **Lỗi thật người dùng gặp** ("chơi xong trận rồi chuyển sang trận mới thì 🛡 không hoạt động nữa"):
  🛡 trước đây **không có vòng lặp riêng**, nó chỉ được gọi ở **cuối vòng lặp 🚀 Bay**. Sang trận mới,
  `BodyVelocity "BC_FlyVel"` chết theo nhân vật cũ (**hoặc còn dính nhân vật cũ** khi game không xoá
  ngay) → vòng lặp Bay thoát ở dòng đầu `if not MV.fly or not curR or not MV._bv then return end` →
  🛡 im lặng vĩnh viễn, bật/tắt không thấy gì. Nay:
  - 🛡 có **vòng lặp riêng** `BindToRenderStep("BC_Safe")` (bật thì gắn, tắt thì gỡ — không tốn tài nguyên);
  - `MV.Safe.Step` **tự chữa lành mỗi frame**: part bay mất/hỏng/**dính nhân vật cũ** → dựng lại đúng
    nhân vật đang dùng; nhân vật mới → quên dữ liệu trận cũ + dựng lại khiên + giữ `PlatformStand`/
    `AutoRotate` đúng trạng thái bay (game hay reset 2 cờ này sau respawn);
  - **watchdog 0,3s** (nay chạy cả khi chỉ bật 🛡): quá 0,6s không thấy vòng lặp chạy → gắn lại + chạy hộ;
    vòng lặp 🚀 Bay bị game gỡ cũng được dựng lại;
  - `MV.Refresh` (respawn) soi **đúng nhân vật** chứ không chỉ "Parent khác nil".
- 🔲 **Cỡ khiên hợp lí** (đúng ý *"hình vuông bao quanh mình kích thước hợp lí"*): trước đây cạnh khiên
  = 📏 × 2 nên 📏 25 → cái hộp **50 × 16 stud** (nhìn như cái chuồng). Nay mặc định **ôm sát nhân vật**
  (~5,2 stud/cạnh, cao ~8 stud) và **📏 Né chỉ còn là khoảng cách né**; muốn to/nhỏ thì chỉnh ô **🔲 Cỡ**
  trong khung ⚙ (0 = tự động, > 0 = số stud nửa cạnh). Khiên vẫn 4 vách trong suốt `CanCollide = false`,
  vẫn bám theo mình, **vách nào bị game xoá là dựng lại cả bộ**; trạng thái 🛡 ghi luôn cỡ khiên.
- 🚀 Vòng lặp Bay được bọc `pcall` **từng phần** (game xoá part bay / camera nil / nhân vật đổi giữa
  frame) và **tự dựng lại `BC_FlyFloor`** nếu bị xoá — trước đây 1 lỗi ở đây là chết cả vòng lặp (mà 🛡
  nằm cuối vòng lặp đó nên chết theo).
- 11 test mới **U1–U11**. **Mutation check**: bỏ tự chữa lành của `Step` → U11 FAIL; bỏ **mọi** đường
  chữa lành (quay lại v4.22) → U2/U3/U4/U5/U11 + O8 FAIL; bỏ watchdog dựng lại vòng lặp 🚀 → U5 FAIL;
  trả cỡ khiên về "📏 × 2" → P1/P2 FAIL; không gỡ vòng lặp riêng khi tắt → U8/U10 FAIL.

**v4.21 — 🎯 ĐỊNH VỊ TỐC ĐỘ (tab 🛠 Hỗ Trợ): biết game cho mình chạy bao nhiêu và mình đang chạy bao nhiêu:**
- Bật 🎯 là **thấy ngay trên màn hình game** (HUD nổi `BC_SpeedHud`, đóng menu vẫn thấy) 3 con số:
  **🎯 mặc định của game** · **⚡ tốc độ thật đang chạy (studs/s)** · **🏁 cao nhất trong phiên**, kèm
  **🚶 WalkSpeed hiện tại** và "đang ×mấy mặc định" — cùng lúc có widget trong tab 🛠 Hỗ Trợ
  (nút bật/tắt · nút 🗑 xoá đỉnh · 4 nhãn số · thanh so sánh có **vạch xanh = mặc định game**).
- **Dò mặc định** theo 3 lớp: (1) `S.Move._baseWS` — hub đã học khi 👟 CHẠY ĐỘ bật lần đầu (hoặc khi game
  đổi tốc độ); (2) `Humanoid.WalkSpeed` ngay lúc bật 🎯 (lúc đó hub chưa can thiệp) → chính là mặc định
  thật của game; (3) 16 (mặc định Roblox). Mỗi khi game đổi WalkSpeed trong lúc hub KHÔNG áp tốc độ thì
  🎯 **tự học lại** và nói rõ "game VỪA ĐỔI tốc độ → mặc định mới".
- **Đo tốc độ** bằng quãng đường mỗi frame ÷ thời gian (không tin `AssemblyLinearVelocity` vì nhiều game
  bịa/sửa số đó), mẫu chuyển động đầu tiên lấy số thật ngay rồi mới làm mượt 0,35 cho đỡ rung; mẫu
  > 25 studs/frame bị bỏ (teleport/respawn/lag đứng hình không tạo đỉnh ảo). Vòng đo chỉ chạy khi BẬT
  (`BindToRenderStep("BC_SpeedMeter")`), tắt là ngắt.
- **KHÔNG phá gì**: khối chỉ ĐỌC — không ghi `WalkSpeed`/`JumpPower`/`CFrame` (test S2 soi thẳng nguồn
  `script.js` để cấm); bật 🎯 khi 👟 đang ×3 thì tốc độ vẫn 48 và mặc định vẫn hiểu là 16 (S7); sống sót
  qua respawn (S9); 🛡/thẻ/thảm vẫn nguyên (S8). Toàn bộ nằm trong `do ... end` (không thêm local cấp chunk).
- **11 test mới S1–S11** (167 PASS · 0 FAIL) + **mutation check** để chứng minh test có giá trị: bỏ ưu
  tiên `_baseWS` → S7 FAIL; cho `max = live` → S5, S6 FAIL.

**v4.20 — 🛡 Bay An Toàn: SỬA LỖI "BOSS/NEXTBOT GÍ MÌNH MÀ KHÔNG NÉ" (Evade):**
- 🔴 **Lỗi nặng, chỉ xảy ra trong game thật**: hàm nhận diện part đòi `type(d) == "table"`, nhưng trong
  Roblox instance là **userdata** (chỉ trong máy giả lập instance mới là bảng) → 🛡 **không bao giờ thấy
  part nào**, chỉ thấy người chơi → boss/nextbot lao tới mà không né. Nay nhận part bằng
  `d:IsA("BasePart")` + danh sách ClassName dự phòng.
- 🔴 **Lỗi 2**: "né theo vị trí dự đoán" khi vật đã gí sát → điểm dự đoán lố ra sau lưng → lực đẩy đẩy
  mình **bay thẳng vào con boss**. Nay nếu điểm dự đoán ở phía bên kia mình thì né theo vị trí hiện tại.
- Boss **to**: đo tới **MẶT** vật (kẹp 75% 📏) thay vì tới tâm; cổng quét cũng theo mặt vật.
- Boss **đuổi theo**: nhớ hướng né ~0,9s (không quay lại hướng cũ ngay khi nó ra khỏi tầm quét), quét
  dày 0,05s trong ~1s sau khi vừa bị gí.
- NPC có Humanoid đang đi (MoveDirection) tính là đang chuyển động; NPC đứng yên thì không né bừa;
  part của người chơi khác do phần 👤 quyết định (👤 TẮT là bỏ qua thật, không đếm 2 lần).
- Quét bằng OverlapParams (MaxParts = 0, lọc chính mình); `MV.comp()` đọc Vector3 an toàn cho cả
  userdata (game thật) lẫn bảng (mock) — sửa luôn 2 chỗ cũ đọc `.Y` luôn ra 0 trong game thật.
- Trạng thái có "🐾 thấy N vật đang chạy" để soi vì sao không né; 9 test mới R0–R8 + mock thật hơn
  (bao lồi, OverlapParams, part "kiểu instance thật") + test soi nguồn.

**v4.19 — 🛡 Bay An Toàn: 👁 BẮT VẬT BAY TỚI MÌNH từ xa + ⭕ TỰ BAY VÒNG TRÒN khi rảnh:**
- **👁 Nhìn trước**: mỗi lần quét không chỉ xét vật đang Ở TRONG 📏 mà còn tính `tHit` — còn bao lâu
  thì vật tới sát mình (`tHit = (khoảng cách − 0,35×📏) / tốc độ lao vào`). `tHit ≤ 👁 giây` (mặc định
  1s) là **mối nguy**, né từ xa; đẩy theo **vị trí dự đoán** (vị trí + vận tốc × 0,35s) nên né đúng
  hướng vật đang lao tới. Tầm quét = 📏 × 1,6. Đang có mối nguy -> quét dày **0,05s** (thường 0,15s)
  để vật bay nhanh không lọt khe giữa 2 lần quét.
- **⭕ Tự bay vòng tròn**: khi KHÔNG có ai/vật nào lao tới mình và không bấm WASD thì tự bay vòng tròn
  quanh chỗ đang đứng (bán kính 20m, chỉnh được). Đang né hoặc đang bấm phím -> **tạm dừng** (ghi rõ
  trong trạng thái), né xong tự bay vòng lại; bay quá 1,6× bán kính thì lấy lại tâm mới.
- Khung 🛡 thêm hàng 3: ⭕ Vòng tròn BẬT/TẮT · ⭕ Bán kính · 👁 Nhìn trước (giây); ✔ Áp dụng đọc luôn
  2 ô mới; ghi chú trong khung nói rõ ⭕/👁 làm gì.
- **2 lỗi bộ test bắt được**: (1) phần tính "tốc độ lao vào" cộng cả vận tốc CỦA MÌNH → vật ĐỨNG YÊN
  trước mặt bị coi là lao tới (O3/P5) — nay chỉ tính vận tốc của vật; (2) trạng thái vẫn ghi
  "⭕ bay vòng tròn" khi đang bấm WASD — nay ghi "⭕ tạm dừng (đang bấm phím)".
- **Sửa luôn 1 lỗi của máy giả lập**: `CFrame.lookAt()` luôn cho `LookVector = (0,0,-1)` (thiếu nhánh
  `cf(Vector3, lookVector)`), nên camera giả không bao giờ có hướng như test đặt; nay giữ đúng hướng và
  các test 🛡 tự trả camera về mặc định trong `cleanSafe()` cho kết quả **tất định**. Thêm 7 test Q1–Q7.

**v4.18 — 🛡 Bay An Toàn nâng cấp (khiên trong suốt · né người chơi · đẩy xuyên vật cản):**
- **🔲 Khiên**: 4 vách kính trong suốt xếp thành hình vuông quanh mình, cạnh = 📏 Né × 2 (nhìn là
  biết vùng né). `CanCollide = false` — chỉ để nhìn, không va chạm; bám theo mình, đổi 📏 là đổi
  cỡ, tắt là dọn sạch.
- **👤 Né người chơi**: mọi người chơi khác là mối nguy **kể cả khi đứng yên**; có công tắc riêng.
- **🧱 Đẩy xuyên vật cản**: bật 🛡 là tự bật Xuyên Tường (nhớ trạng thái cũ, tắt 🛡 trả lại đúng
  như trước) → lực đẩy đưa bạn qua tường/sàn thay vì kẹt.
- 2 lỗi bộ test bắt được: `sfPlayers` trả `nearest = nil` (mất khoảng cách gần nhất của vật) và
  vượt **trần 200 local** của Luau khi thêm biến vào main chunk (nay bọc `do ... end`).

**v4.17 — 🛡 BAY AN TOÀN (tự bay + tự né vật có dấu hiệu chuyển động):**
- Thẻ "🛡 Bay An Toàn" (nhóm Di chuyển) + khung 🛡 trong 📚 Script Hub: BẬT/TẮT · 📏 Né (m) ·
  💨 Bay · 🌀 Gắt · ➡ Tự bay · ✔ Áp dụng · 🚫 Tắt.
- Bật là **tự bay** (không cần giữ phím) và **tự né**: quét 0,15s/lần mọi vật trong bán kính 📏;
  vật có dấu hiệu chuyển động (vận tốc > 1,5 **hoặc** vừa đổi vị trí > 0,35 studs) bị đẩy ra xa
  (càng gần càng mạnh), vào gần hơn 40% bán kính thì vọt lên trên. Vật đứng yên không bị né.
- Chạy chung vòng lặp 🚀 Bay (gọi cuối vòng) nên không đánh nhau với WASD; chỉ ghi **vận tốc**
  BodyVelocity của chính mình.
- **Lỗi nặng do bộ test bắt**: lực né viết ngược dấu → bị hút về phía vật chuyển động.

**v4.16 — ✨ PHÁT SÁNG (nhân vật mình · chỉnh CHIỀU RỘNG + ĐỘ SÁNG):**
- Thẻ "✨ Phát Sáng" (nhóm Tiện ích) + khung ✨ trên cùng 📚 Script Hub: BẬT/TẮT · 👁 Xuyên
  tường · 💡 Đèn thật · 📏 Rộng (1–200) · ☀ Sáng (0–10) · 🎨 7 màu · ✔ Áp dụng · 🚫 Tắt.
- Nhân vật mình phát sáng: Highlight nhuộm sáng + PointLight toả sáng quanh người.
- "Ánh sáng không bị trói": xuyên tường (AlwaysOnTop) · đèn `Shadows=false` không bị vật cản
  chặn · bị game xoá thì tự gắn lại sau 0,5s · respawn tự theo nhân vật mới · GUI hub bị gỡ thì
  treo sang GUI khác. Chỉ thêm hiệu ứng, không đụng di chuyển.
- 2 lỗi bộ test bắt được: `math.clamp` (không có trong Lua 5.4) và CanvasSize tính thiếu khi có
  khung điều khiển thứ 2.

**v4.15 — TRANG 👥 NGƯỜI CHƠI (nằm giữa 📚 Script Hub và ➕ Tạo Tính Năng):**
- Thêm 1 trang riêng gom mọi việc liên quan tới người chơi khác; thứ tự rail nay là
  💾 💻 📚 **👥** 🛠 ⚙️ ➕ (trang 👥 ở LayoutOrder 4, giữa Script Hub 3 và Tạo Tính Năng 7).
- Trang chứa **2 khung điều khiển đầy đủ**: 📍 ĐỊNH VỊ NGƯỜI CHƠI và 👣 XEM NGƯỜI CHƠI
  (chuyển từ danh sách 📚 Script Hub sang — đỡ rối trang Script Hub).
- **Không mất tính năng nào**: 5 thẻ 📍👣 trong 📚 Script Hub vẫn còn và vẫn chạy; 6 trang cũ
  giữ nguyên (Hỗ Trợ 4→5, ⚙️ Thiết Lập 5→6, ➕ Tạo Tính Năng 6→7 chỉ là số thứ tự trên rail).

**v4.14 — 👣 XEM NGƯỜI CHƠI (bám theo để thấy họ đang làm gì):**
- Bật 👣 rồi bấm TÊN một người (khung 👣 hoặc 📍) = camera bay theo họ; bảng nổi trên màn hình
  game hiện TÊN · 💗 bạn bè · ❤️ máu · 📏 khoảng cách · 💨 tốc độ · "đang làm gì" (chạy / đi chậm /
  nhảy / rơi / ngồi / **bị hạ gục ⏱ đếm giờ** / đứng yên). Nút 🎥 (bật-tắt bám) và 🚫 (trả camera)
  nằm ngay trên bảng, không cần mở menu.
- **Chỉ đổi camera** (`CameraType = Scriptable`), không dịch chuyển/ghi CFrame nhân vật nào cả;
  tắt là trả lại đúng kiểu camera gốc. Game cướp camera thì hub tự đòi lại 4 lần/giây khi đang bám.
- 2 lỗi bộ test bắt được đã sửa: (1) ⏱ đếm giờ hạ gục chỉ chạy khi 📍 bật → nay dùng chung
  `S.Loc.NoteDown`; (2) người đang xem biến mất hẳn → camera kẹt `Scriptable` → nay tự chuyển/tự
  thoát + trả camera.

**v4.13 — 📍 ĐỊNH VỊ NGƯỜI CHƠI (port từ "ESP System" của aiaiaitao3):**
- Mỗi người chơi 1 nhãn nổi trên đầu + viền sáng xuyên tường. Nhãn: TÊN · 💗 Bạn Bè · ☠️ Hạ gục
  (kèm ⏱ đếm giờ) · ❤️ máu · 📏 khoảng cách. Màu đúng bản gốc: 🟢 thường · 💗 bạn bè ·
  🔴 bị hạ gục · 🟣 bạn bè bị hạ gục (`player:IsFriendsWith`, có nhớ đệm).
- 3 thẻ mới trong 📚 Script Hub (nhóm "Định vị") + khung 📍 ngay trên danh sách thẻ:
  👁️ Tất Cả · 🎯 Lẻ · 🚫 Tắt · 📏 XA NHẤT (m, 0 = không giới hạn) · 🔍 tìm tên + danh sách
  người chơi (bấm tên = chỉ định vị người đó, bấm lại = bỏ).
- Tối ưu hơn bản gốc: 1 vòng lặp 0.2s cho tất cả (bản gốc mỗi người 1 luồng `task.spawn`),
  `FindFirstChild` thay `WaitForChild(...,3)` (không treo 3 giây/người), tự dọn khi thoát/đổi
  nhân vật, tự ngắt vòng lặp khi tắt hết. Thêm 📏 giới hạn khoảng cách (bản gốc không có).

**v4.12.5 — hết GIẬT/LAG khi bật thảm (game nặng như Evade):**
- Nguyên nhân: v4.12.1 mỗi frame đều ghi `CFrame` + xoá vận tốc của nhân vật để "đỡ khỏi rơi
  xuyên"; ở game nặng/anti-cheat việc này đánh nhau với vật lý game → giật, lag. Bản gốc
  aiaiaitao3 không bao giờ đụng vào nhân vật (đứng nhờ va chạm thường) nên mới mượt.
- Sửa: chỉ đỡ khi lún/rơi quá **0.5 stud** (`carpetSlack`) → đứng yên là **không ghi gì**;
  rơi xuyên / bấm ⬆⬇ (2.5 stud) vẫn được đỡ ngay; đang Xuyên Tường thì slack = 0 (như bản gốc).
- Thêm 2 công tắc trong khung ⚙: **🛟 Chống rơi** (TẮT = y hệt bản gốc, hết giật hẳn) và
  **🔲 Viền thảm** (TẮT = bỏ viền SelectionBox). Gõ `x1` ở ô 👟 Chạy = giữ nguyên tốc độ game.

**v4.12.4 — 🏃 Chạy Trên Thảm = "🕹️ Bay chạy bộ" của aiaiaitao3 GIỐNG 100%:**
- Overlay dựng y hệt bản gốc: khung 180×160 sát mép phải, 3 nút TRÒN 50×50 (🪩 y=0 · ⬆ y=60 ·
  ⬇ y=120), viền trắng 2px, mờ 0.3, màu đúng bản gốc; ✕ TRÒN 34×34 góc trên bên phải.
- Bật = `StartFlyRun()` (tắt bay · trải thảm · ẨN MENU · nút mở menu thành ⚙ · hiện overlay);
  tắt = `StopFlyRun()` (thu thảm · ẩn overlay · trả nút về ✕/🍌). ⬆⬇ tự bật thảm rồi nâng/hạ 2.5,
  🪩 bật/tắt thảm, ✕ thoát. Bật Bay khi đang chạy thì thoát chế độ chạy (như `TogFly`).
- Vẫn giữ 2 cái TỐT HƠN bản gốc: không rơi xuyên thảm (dù không bật Xuyên Tường) + tốc độ THEO GAME ×3.

**v4.12.3 — rút gọn + tối ưu code (bớt 66 dòng, không đổi tính năng nào):**
1. Gom các chỗ copy-dán thành helper dùng chung: `flash()` (11 nút đổi chữ rồi trả lại) ·
   `D.Say()` (13 chỗ đặt chữ + màu thanh trạng thái) · `S.Rebuild()` (9 chỗ) ·
   `S.CopyToClipboard()` (6 chỗ, tự thử đủ 3 tên hàm clipboard) · `MakeTabFrame()` /
   `MakeTabButton()` (trang thường và tab tính năng dựng chung 1 chỗ) · `TitleBtn()` · `coordNA()`.
2. Tối ưu Xuyên Tường: không còn `GetDescendants()` mỗi frame (60 lần/giây) — quét khi bật /
   đổi nhân vật / mỗi 2s + bắt `DescendantAdded` nên part mới thêm vào vẫn XUYÊN NGAY.
3. Sửa lỗi lọt khi gộp code: nút 📋 "Sao Chép Code" bị kẹt chữ "✅ Đã Sao Chép!" (test nhóm H).

**v4.12.2 — cho nhảy + chạy chạy ở MỌI GAME, tốc độ theo game:**
1. 🦘 **Nhảy vô hạn** hay bị liệt vì chỉ nghe `JumpRequest` rồi `ChangeState`. Nay nhảy bằng 3
   cách (ChangeState · lệnh `Jump` kiểu cũ · đẩy vận tốc — chỉ khi 0.08s sau vẫn không nhúc nhích)
   + nghe thêm phím Space/A qua `InputBegan` + ép `JumpPower`/`JumpHeight` nếu game để 0.
2. 🏃 **Chạy trên thảm**: chạy + nhảy thoải mái (thảm chỉ giữ khi đứng yên/đang rơi).
3. 👟 **Tốc độ theo game**: chạy = tốc độ game × 3 (gõ `x4` hay `50` ở ô 👟 Chạy trong khung ⚙).
4. Vòng canh gác 0.3s: game xoá thảm / đổi WalkSpeed / đổi JumpPower → tự dựng lại, theo số mới.

**Sửa thảm kính (v4.12.1)** — 3 lỗi làm thảm "vô dụng":
1. Bản gốc CHỈ giữ người trên mặt thảm khi bật Xuyên Tường → bật thảm một mình là rơi xuyên
   xuống đất. Nay luôn giữ trên mặt thảm, nhưng chỉ khi đứng yên/đang rơi nên **vẫn nhảy được**.
2. Thảm mặc định chìm 3 studs dưới đất → nay nằm **ngay dưới chân** (cách 0.2), có ô
   "cách chân" (0–10) trong khung ⚙ nếu muốn kiểu cũ.
3. Thêm **viền sáng SelectionBox** quanh thảm (là con của thảm → tự dọn khi tắt, không rớt rác).

**3 chỗ làm TỐT HƠN bản gốc ở `aiaiaitao3`:**

1. Tắt Xuyên Tường trả lại **đúng CanCollide gốc** của từng part (bản gốc gán cứng `true` → mũ/phụ
   kiện bị "cứng" lại, nhân vật hay kẹt).
2. Vòng lặp NoClip chỉ duyệt nhân vật mình và chỉ ghi khi giá trị khác (bản gốc lặp mọi người chơi
   mỗi Stepped ≈ 1000 ghi/frame).
3. Sống qua respawn + `StopAll()` dọn gọn (bản gốc không có tương đương gọn).

**4 lỗi đã sửa** (2 lỗi cũ, 2 lỗi do test phát hiện) — chi tiết ở mục 3.1 và bảng trong
`tests/README.md`:

1. **P0**: 3 công tắc header 🧩/🕵/🪟 vẫn chết (v4.11 mới dời hàm `D.SyncPageChips()`, chỗ gọi vẫn
   đứng trước `local S`) → khai báo trước `local S` và đổi `local S = {` thành `S = {`.
2. `function BcFit()` thiếu `local` → rò rỉ global.
3. Gán số vào `Text` (`flyIn.Text = S.Move.flySpeed`) → Roblox báo `string expected, got number`.
4. `trackConn()` giữ mãi connection của thẻ đã Destroy → bảng phình vô hạn; nay tự gom rác khi >300.

Chi tiết bộ test: xem `tests/README.md`.

---

> Repo chỉ có đúng 2 file, cả hai đều là **script Lua chạy bằng Roblox executor** (không phải JS dù
> một file tên `script.js`). Phân tích dưới đây là phân tích tĩnh (đọc mã + AST), **không chạy thật**
> trong Roblox/executor.

---

## 1. Tóm tắt nhanh

| | `aiaiaitao3` | `script.js` |
|---|---|---|
| Tên sản phẩm (trong mã) | "EXECUTOR MENU" (GUI `ExMenu`) | "🍌 Banana Cat Hub **v4.11**" (GUI `ExMenu`) |
| Kích thước | 2.499 dòng / 92 KB / LF | 7.231 dòng / 368 KB / **CRLF** |
| Số hàm | 42 (toàn bộ `local function`) | 164 (64 `local` + 99 gắn vào bảng `D./S./Store.`) |
| Biến local cấp chunk | **160 / 200** (Luau) → còn 40 slot | **128 / 200** → còn 72 slot |
| Event connections | 94 (29 được `trackConn`) | 109 (28 được `trackConn`) |
| `pcall` (bọc lỗi) | **11** | **254** |
| Lưu xuống đĩa | ❌ Không có (mất sạch khi rejoin) | ✅ `banana_cat_saved.json` (v3) |
| Tính năng ăn gian trong game | ✅ Fly, NoClip, Thảm kính, ESP, Aimbot, Đóng băng người khác, Click-TP, Anti-AFK, FullBright | ❌ Không còn (Fly/Carpet đã gỡ từ v4.3) |
| Chạy script người dùng | ✅ (Code / Code Đã Lưu) | ✅ + Script Hub, nhúng GUI, tương thích ~45 hàm executor |
| Số "trang" (tab) | 8 cố định | 7 cố định + tab tính năng động (từ 7 trở đi) |
| Cú pháp | ✅ parse OK (sau khi desugar 5 chỗ `+=` của Luau) | ✅ parse OK (sau khi desugar 22 chỗ `+=`) |
| Lỗi nghiêm trọng tìm thấy | 0 | **1** (xem mục 3.1) |

**Kết luận ngắn gọn:** hai file là **hai nhánh cùng một dòng sản phẩm** (cùng tên GUI `ExMenu`, cùng
`_G.BananaCatHub_Connections`, cùng bộ helper `New/Corner/Stroke/Tween`, cùng 3 khối mã giống hệt
nhau ≥25 dòng, 431 dòng trùng nhau = 29% file nhỏ). `aiaiaitao3` là bản **"menu hành động"** (có
Fly/ESP/Aimbot… nhưng không lưu được gì), còn `script.js` là bản **"hub quản lý script"** đã được
chăm chút nhiều phiên bản (v4.5→v4.11), có lưu đĩa, có test, nhưng **vẫn còn 1 lỗi P0 chưa sửa xong**.

---

## 2. File 1 — `aiaiaitao3` ("EXECUTOR MENU")

### 2.1 Kiến trúc & tính năng

```
[1-50]    Khởi tạo service, chọn parent GUI (gethui → CoreGui → PlayerGui)
[34-49]   Dọn kết nối cũ: _G.BananaCatHub_Connections + UnbindFromRenderStep("Fly"/"Carpet")
[51-101]  Bảng màu C.*, DEFAULT_LIGHTING, helper New/Corner/Stroke/Tween
[102-284] ScreenGui "ExMenu", nút 🍌 nổi, resize 4 góc
[285-385] Hệ tab (8 tab, nút icon trái)
[386-432] STATE: bảng S.* (31 trường, tất cả đều được dùng)
[451-559] Chặn Kick (hookmetamethod __namecall) · Freeze người khác · Anti-AFK · Inf-Jump · Click-TP · NoClip
[560-966] Fly · Thảm kính · Fly tới Player · Fly tới Tọa độ
[967-1169] ESP (Highlight + BillboardGui, phân biệt bạn bè, đếm giờ hạ ngục)
[1170-1212] Thực thi code (loadstring, lặp n lần, có ⏹ Dừng)
[1213-2499] 8 tab UI: Code · Code Đã Lưu · Di Chuyển · Bay Đến Player · Người Chơi · Môi Trường · Tọa Độ · Niệm Tâm
```

8 tab: 1 💻 Code · 2 💾 Code Đã Lưu · 3 🏃 Di Chuyển · 4 🎯 Bay Đến Player · 5 👤 Người Chơi ·
6 ⚙️ Môi Trường · 7 📍 Tọa Độ · 8 👁️ Niệm Tâm.

### 2.2 Điểm làm tốt

- **Dọn dẹp khi chạy lại**: ngắt toàn bộ connection cũ qua `_G.BananaCatHub_Connections`, `Destroy()`
  GUI `ExMenu` cũ, `UnbindFromRenderStep` → chạy lại nhiều lần không bị nhân bản (rất nhiều script
  dạng này quên).
- **Toàn bộ hàm đều `local`**, **không ghi một global nào** (kiểm bằng AST: 0 global write) → không
  bẩn môi trường executor.
- **Vòng lặp nặng đều có nhịp**: ESP `task.wait(0.2)`, fly dùng `RenderStepped` có `dt`.
- **Dọn ESP đúng chỗ**: `PlayerRemoving` / `CharacterRemoving` → `RemovePlayerESP` + xoá
  `friendCache`, tránh leak và tránh giữ reference tới nhân vật đã chết.
- **Gọi executor API có guard**: `if hookmetamethod then …`, `setclipboard → toclipboard` đều kiểm tra
  tồn tại trước khi gọi.

### 2.3 Vấn đề

| # | Mức | Vị trí | Mô tả |
|---|---|---|---|
| A1 | **P1** | toàn file | **Không lưu xuống đĩa.** `scripts` / `savedLocations` chỉ nằm trong RAM → thoát game / rejoin mất sạch. `script.js` đã giải quyết bằng `Store` + JSON; đây là lùi lại so với bản kia. |
| A2 | **P1** | 470-484 | `freezeOthers` chạy **mỗi Stepped**, lặp `GetDescendants()` của **tất cả** người chơi và set `Anchored` cho mọi `BasePart`. Server 20 người × ~50 part = ~1.000 ghi thuộc tính/mỗi frame (~60-144 Hz). Nên chỉ anchor `HumanoidRootPart` hoặc giảm xuống 10 Hz. |
| A3 | **P1** | 546-558 | `DisNC()` khi **tắt** NoClip set `CanCollide = true` cho **mọi** `BasePart` của nhân vật — kể cả mũ, phụ kiện, vũ khí vốn mặc định `false`. Hậu quả: nhân vật có thể kẹt vào tường/vật thể, va chạm kỳ lạ. Cần lưu lại giá trị gốc thay vì gán cứng `true`. |
| A4 | **P1** | 1926-1945 | `serverHopBtn`: `req({Url=…})` và `HttpService:JSONDecode(res.Body)` **không bọc pcall**, cũng không kiểm `s.playing`/`s.maxPlayers` có `nil`. Executor chặn HTTP hoặc API đổi định dạng → lỗi ném thẳng trong handler `Activated`, Roblox chỉ log, nút "chết lặng". |
| A5 | **P2** | 486-497 | `UnfreezeAllPlayers()` set `Anchored=false` cho mọi part của người khác → gỡ cả những part game **cố ý** anchor (ghế, xe, rig). Chỉ ảnh hưởng phía client nhưng có thể gây giật/teleport hình ảnh. |
| A6 | **P2** | 2363-2372 | Aimbot chỉ chạy khi `S.aimLock and S.xrayCircle` → **tự ngắm tắt theo vòng tròn**, không có ghi chú trong UI. Nên tách 2 cờ hoặc ghi rõ. Ngoài ra: không kiểm tra đồng đội/bạn bè (đang có sẵn `friendCache`), không làm mượt góc xoay. |
| A7 | **P2** | 531-540 | `EnNC()` cũng lặp toàn bộ descendants mỗi Stepped (giống A2, ít nghiêm trọng hơn vì chỉ 1 nhân vật). |
| A8 | **P2** | toàn file | **11 `pcall` cho 94 connections** → một lỗi nhỏ trong handler nào đó là cả handler chết im lặng, khó tự chẩn đoán. |
| A9 | **P3** | 451-465 | Chặn `Kick` qua `hookmetamethod` chỉ bắt được lệnh Kick **gọi phía client**. Anti-cheat hiện đại kick từ server hoặc ném lỗi remote → "bảo vệ" mang tính an tâm hơn là hiệu quả thật. |
| A10 | **P3** | 160/200 local | Còn 40 slot local trước giới hạn 200 của Luau. Thêm ~8 hàm có 5 biến local là script **không biên dịch được**. Nên học `script.js`: gom state vào bảng `S`. |

---

## 3. File 2 — `script.js` ("🍌 Banana Cat Hub v4.11")

### 3.1 🔴 P0 — Lỗi "SỬA LỖI 1" của v4.11 mới chỉ sửa **một nửa**

Changelog (dòng 7-10) khẳng định đã sửa lỗi `D.SyncPageChips()` đứng trước `local S`, và quả thật hàm
đã được dời xuống **dòng 1397** (sau `local S = {` ở **dòng 1340**) — phần này **đúng**.

Nhưng **chỗ gọi nó vẫn còn nguyên lỗi**, ở handler bấm 3 công tắc trên header trang:

```lua
-- script.js:1144-1153  (local S được khai báo ở dòng 1340 → S ở đây là GLOBAL = nil)
btn.Activated:Connect(function()
    local fn = (sw.key == "embed" and S.DoToggleEmbed)      -- ← index vào nil
            or (sw.key == "guess" and S.DoToggleGuess)
            or (sw.key == "park"  and S.DoTogglePark)
    if type(fn) == "function" then pcall(fn) end
    D.SyncPageChips()                                        -- ← không bao giờ chạy tới
    pcall(function() if S.SyncEmbedToggles then S.SyncEmbedToggles() end end)
end)
```

Cơ chế: closure được tạo **trước** khi `local S` tồn tại, nên Lua/Luau coi `S` là **global**, đọc
`_G.S` lúc chạy = `nil`. Không có `local S` nào trước dòng 1145 (đã kiểm bằng cả grep lẫn AST:
đây là đúng 6 chỗ đọc `S` dạng global duy nhất trong file).

Hậu quả thực tế — **y chang triệu chứng mà changelog mô tả là đã sửa**:
- Bấm 🧩 / 🕵 / 🪟 trên header → `attempt to index a nil value (global 'S')`, handler chết ngay dòng đầu,
  **không bật/tắt được gì**, và `D.SyncPageChips()` không chạy nên **chip không đổi trạng thái**.
- Lỗi này không bị nuốt (không nằm trong `pcall`), nó chỉ hiện trong console của executor.
- Ba nút gốc ở tab ➕ Tạo Tính Năng (dòng 5914 / 5931 / 5948, **nằm sau** `local S`) vẫn hoạt động bình
  thường → dấu hiệu nhận biết: bấm ở tab ➕ được, bấm trên header không được.

**Cách sửa (chọn 1):**
1. Đơn giản nhất: dùng bảng `D` (đã là local từ dòng 513) làm cầu nối —
   `local fn = (sw.key=="embed" and D.DoToggleEmbed) …` rồi gán `D.DoToggleEmbed = S.DoToggleEmbed`
   ở dòng ~5948 nơi các hàm được định nghĩa.
2. Hoặc dời nguyên khối tạo 3 chip (khoảng dòng 1105-1175) xuống **sau** dòng 1420 (`local S` +
   `local Store`), giống cách đã làm với `D.SyncPageChips()`.
3. Hoặc forward-declare `local S` ở đầu file (trước dòng 382) rồi `S = { … }` ở dòng 1340.

### 3.2 Kiến trúc

```
[1-360]     Changelog v4.5 → v4.11 (rất chi tiết, có kèm số liệu đối chiếu)
[325-380]   Service, player, targetGui (gethui/CoreGui/PlayerGui), dọn kết nối cũ
[382-512]   Bảng màu C.* "OBSIDIAN NOIR + CHAMPAGNE"
[513-840]   Bảng D: 40+ hàm vẽ/UI (Paint3, TopLight, Shade, BestText, SetBg, Breathe…)
[841-960]   Hit-test không phụ thuộc parent GUI · BcFit
[960-1420]  GUI chính, resize 4 góc, hệ tab, header trang + 3 chip, local S
[1424-1680] Store: ghi/đọc JSON, VFS (ổ đĩa ảo RAM), serialize/load, SAVE_VERSION 3
[1687-1840] Lớp tương thích executor: tự bù ~45 hàm (chỉ bù khi global chưa tồn tại)
[1853-2000] Chuẩn hoá code (link trần → loadstring(HttpGet)()), chạy code, báo lỗi thật
[2068-3000] Tab Code / Code Đã Lưu / Hỗ Trợ (phân tích vật thể, toạ độ, highlight)
[3665-4500] Tab Tạo Tính Năng + FEATURE TEMPLATE (khung mẫu có SIZE CONTRACT)
[4695-5100] Phát hiện & nhúng GUI của script tính năng (nhiều lớp, hook Instance.new)
[6352-6880] Trang 📚 Script Hub (menu kiểu Delta, có Reset/Hop/Lấy mã server)
[6880-7106] Trang ⚙️ Thiết Lập (v4.11)
[7106-7231] Toggle menu & drag
```

### 3.3 Điểm làm tốt

- **Kỷ luật "không đè hàm thật"**: `S.SetGlobal()` chỉ ghi khi global chưa tồn tại (dòng 1704-1717).
- **v4.11 nói thật về nơi dữ liệu nằm**: `S.Shimmed()` so sánh **danh tính hàm** trong `_G` để phân biệt
  `writefile` thật với hàm hub tự bù → nhãn "đã ghi xuống đĩa" không còn nói dối. Sửa đúng gốc, rất gọn.
- **Chống "quá 200 local"**: toàn bộ state/fn gom vào `C/D/Hit/S/Store` (99 hàm gắn vào bảng) → main
  chunk chỉ còn **128/200**, còn chỗ để phát triển.
- **254 `pcall`** + báo lỗi thật lên UI (không còn "✅ xong" giả).
- **Có bộ test**: changelog ghi 84 test / 84 PASS bằng máy ảo Lua 5.4 (wasmoon).
- **Tôn trọng WCAG**: đổi RED/PINK để 12/12 màu nền đạt ≥3:1.

### 3.4 Vấn đề khác

| # | Mức | Vị trí | Mô tả |
|---|---|---|---|
| B1 | **P0** | 1144-1153 | 3 công tắc header 🧩/🕵/🪟 chết (xem 3.1). |
| B2 | **P2** | 960 | `function BcFit()` **không có `local`** → tạo global `BcFit` (hàm global duy nhất của file). Nên đổi thành `local function` (chỉ `SetupResizeHandle` ở ngay dưới dùng tới). |
| B3 | **P2** | 1788-1790 | `setclipboard`/`toclipboard`/`set_clipboard` giả chỉ ghi vào `S.clipboardTxt` → người dùng bấm "sao lưu ra clipboard" thấy im lặng/thành công mà clipboard thật không đổi. Cảnh báo hiện chỉ có ở 1 nơi (dòng 6152). Nên hiện cảnh báo chung ở mọi nút copy. |
| B4 | **P2** | 1809-1817 | Các shim `hookfunction`/`hookmetamethod`/`getnamecallmethod`/`checkcaller` trả về giá trị **giả** (no-op, `""`, `false`). Script chạy trong hub sẽ "nghĩ" mình đang ở môi trường khác → những script dựa vào hook có thể hoạt động sai **mà không báo gì**. Chỉ nên bù khi thật sự vô hại. |
| B5 | **P2** | 1776 | Shim `loadstring` = `load(tostring(src), …)` — nếu executor có sẵn `loadstring` thì không dùng, nhưng nếu không có `load` luôn thì shim lỗi ngay lúc gọi. |
| B6 | **P3** | toàn file | **Thư mục `tests/` không có trong repo** (chỉ còn 2 file) → không thể tự chạy lại để kiểm chứng con số "84 test — 84 PASS"; changelog dẫn `node tests/run.js` và `tests/roblox-mock.lua` nhưng đường dẫn gốc (`/home/user/luachk`) nằm ngoài repo. |
| B7 | **P3** | tên file | File chứa mã Lua nhưng đuôi `.js` → mọi linter/highlighter/editor hiểu sai. Nên đổi `script.js` → `BananaCatHub.lua` (và `aiaiaitao3` → `ExecutorMenu.lua`). |
| B8 | **P3** | 5095, 5768… | Thứ tự trang dùng `LayoutOrder` 1/2/3/4/5/6/99 + tab tính năng từ 7 → đúng như ghi chú, nhưng số 5 từng là tab 🤖 AI (đã xoá ở v4.10) nên 5/6/7 lệch nhau; ai thêm tab mới cần đọc kỹ changelog mới hiểu. |

---

## 4. Rủi ro chung (áp dụng cho cả 2 file)

1. **Tải & chạy mã từ xa lúc runtime (supply-chain).** Cả hai file nhúng sẵn
   `loadstring(game:HttpGet("https://raw.githubusercontent.com/…"))()` cho
   **Dex Explorer**, **Infinite Yield**, **SimpleSpy**. Đây là mã của bên thứ ba, được tải **mỗi lần
   bấm** và chạy với **đầy đủ quyền của executor** trong tiến trình Roblox của bạn. Nếu repo gốc bị
   chiếm quyền/đổi chủ, người dùng sẽ chạy mã lạ mà không hay. Khuyến nghị: ghim commit hash cụ thể
   (vd `.../raw/<sha>/dex.lua`) thay vì nhánh `main`/`master`, hoặc lưu bản đã kiểm chứng vào tab
   "Code Đã Lưu" rồi chạy offline.
2. **Điều khoản Roblox.** Đây là script can thiệp client (NoClip, Fly, ESP, tự ngắm, đóng băng người
   khác…) — vi phạm Điều khoản dịch vụ của Roblox; rủi ro bị khóa tài khoản nằm ở phía người dùng.
   Phân tích này chỉ đọc mã, không thêm tính năng ăn gian mới.
3. **Mã người dùng chạy cùng quyền.** Cả hai đều cho dán/chạy Lua tuỳ ý (`loadstring`); bất kỳ đoạn mã
   nào cũng có thể đọc clipboard, ghi file, gọi mạng. Tab "Code Đã Lưu" vì thế là nơi lưu trữ nhạy cảm.
4. **Xung đột khi chạy cả hai.** Cùng tên GUI `ExMenu` và cùng khoá `_G.BananaCatHub_Connections`:
   chạy file thứ hai sẽ `Destroy()` GUI của file thứ nhất và ngắt connection của nó → **không thể chạy
   song song**, đúng thiết kế (hai nhánh cùng sản phẩm), nhưng cần biết để không bối rối khi "menu biến mất".

---

## 5. Khuyến nghị theo thứ tự ưu tiên

| Ưu tiên | Việc | File |
|---|---|---|
| **P0** | Sửa 3 công tắc header (mục 3.1) — 3 dòng, hiệu quả thấy ngay | `script.js` |
| P1 | Thêm lưu/đọc đĩa cho script + toạ độ (mượn khối `Store` của `script.js`) | `aiaiaitao3` |
| P1 | Giảm tần suất `freezeOthers`/`EnNC` (10 Hz thay vì mỗi Stepped) | `aiaiaitao3` |
| P1 | `DisNC` khôi phục `CanCollide` gốc thay vì gán `true` | `aiaiaitao3` |
| P1 | Bọc `pcall` cho `serverHopBtn` + kiểm `nil` | `aiaiaitao3` |
| P2 | `local function BcFit` | `script.js` |
| P2 | Cảnh báo clipboard giả ở mọi nút copy | `script.js` |
| P2 | Đổi đuôi file `.js` → `.lua` cho cả 2 | cả 2 |
| P2 | Tách cờ aimbot khỏi cờ vòng tròn | `aiaiaitao3` |
| P3 | Đưa `tests/` (84 test) vào repo để có thể tự kiểm chứng | `script.js` |
| P3 | Ghim commit hash cho 3 URL GitHub | cả 2 |

---

## 6. Phương pháp kiểm chứng (để bạn tự chạy lại)

- **Parse cú pháp**: `luaparse` (npm) với `luaVersion 5.1`, sau khi "desugar" phép gán ghép của Luau
  (`+=` …): `aiaiaitao3` 5 chỗ (nhiều nhất ở dòng 1199 `e+=0.1`), `script.js` 22 chỗ (dòng 1982).
  → Cả hai **parse OK**, không lỗi cú pháp.
- **Phân tích AST** (`luaparse` với `scope: true`) để tìm:
  - ghi vào biến global (kết quả: `aiaiaitao3` **0**, `script.js` **1** = `BcFit`),
  - đọc biến global ngoài whitelist Lua/Roblox/executor → phát hiện **6 lần đọc `S` dạng global ở
    dòng 1145-1152** (bug P0), phần còn lại (`tick`, `toclipboard`, `typeof`, `set_clipboard`) là API hợp lệ.
- **Đếm**: hàm, local cấp chunk (so với giới hạn 200 của Luau), connection (`:Connect(`) vs
  connection được `trackConn` quản lý, số `pcall`.
- **So sánh chéo** 2 file bằng `difflib`: 431 dòng trùng nhau sau khi chuẩn hoá khoảng trắng
  (29,2% file nhỏ), 3 khối trùng ≥25 dòng (helper `New/Corner/Stroke/Tween` dòng 189-233 ↔ 928-972;
  khối tab/con lặp; khối ô nhập liệu).
- Script phân tích nằm ở `/tmp/luachk/` (ngoài repo, không đưa vào git).

> Chưa thể kiểm chứng runtime: trong môi trường này không có Luau/Roblox, nên các kết luận về hành vi
> (đặc biệt bug P0) là suy luận trực tiếp từ ngữ nghĩa phạm vi biến của Lua — rất chắc chắn về mặt
> quy tắc ngôn ngữ, nhưng nên bấm thử 3 công tắc header một lần để xác nhận triệu chứng.
