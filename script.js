--[[
    🍌 Banana Cat Hub v4.6 — FULL CODE  ·  giao diện "MIDNIGHT GOLD" + layout kiểu DELTA
    + v4.6 (bản này): MENU GIỐNG DELTA — chỉ đổi CÁCH BỐ TRÍ, không bỏ tính năng nào:
        • Thanh tab chuyển từ PHẢI (chữ, rộng 105px) sang TRÁI (chỉ icon, rộng 56px) như Delta;
          tab đang mở có vạch accent 3px. Rê chuột vào một icon -> header hiện tên trang đó (chữ
          mờ 40%), rời chuột thì trả về tên trang đang mở. Vùng nội dung nhờ vậy RỘNG thêm 49px.
        • HEADER TRANG cao 24px (ngay dưới thanh tiêu đề): trái = tên trang đang mở, phải = 3
          CÔNG TẮC GẠT 🧩 / 🕵 / 🪟. Bấm công tắc ở đây = bấm nút gốc ở tab ➕ (cùng một hàm
          S.DoToggle*) nên trạng thái, thông báo và việc lưu xuống đĩa không thể lệch nhau.
        • Trang mới 📚 SCRIPT HUB (đứng thứ 2, ngay sau 💻 Code) — "menu script" kiểu Delta:
          ô tìm kiếm 🔍 (soi cả tên, mô tả, phân loại, có dấu) + 5 chip lọc (Tất cả / Admin /
          Explorer / Spy / Tiện ích) + danh sách THẺ (icon · tên · phân loại · mô tả · nút
          ▶ Chạy / 📋 Copy loadstring / 💾 Lưu sang Code Đã Lưu / ☆ Ghim lên đầu — có lưu đĩa).
          Toàn bộ danh sách nằm trong MỘT bảng S.ScriptHubList, muốn thêm script chỉ cần thêm
          1 dòng. Gồm 3 script NGOÀI đã kiểm chứng link (Infinite Yield, Dex Explorer, SimpleSpy
          — vẫn truyền noPark=true để GUI của chúng ở NGOÀI màn hình game như v4.4i) và 5 TIỆN
          ÍCH NỘI BỘ gọi thẳng hàm có sẵn của hub (niêm tâm 🎯, trả GUI về màn hình 🧩, sửa kẹt
          chuột 🖱, nạp lại hub từ đĩa 🔄, dọn host nhúng rác 🧹) -> KHÔNG có nút chết/link chết.
        • Tách 5 handler thành hàm tái sử dụng: S.DoReload, S.DoFixMouse, S.DoToggleEmbed,
          S.DoToggleGuess, S.DoTogglePark (nút cũ vẫn nối vào chính những hàm này — hành vi y hệt).
        • Thứ tự trang (v4.6.2, theo yêu cầu): 1 💾 Code Đã Lưu · 2 💻 Code · 3 📚 Script Hub ·
          4 🛠 Hỗ Trợ · 5 🤖 AI AI · 6 ➕ Tạo Tính Năng · 7+ tab tính năng của bạn · 99 🧩 GUI Ngoài.
          Menu mở lên là thấy ngay 💾 Code Đã Lưu. Vì mảng `tabs` xếp theo thứ tự TẠO còn rail xếp
          theo LayoutOrder, mọi chỗ "về trang đầu" (lúc khởi động, bấm ✕ đóng tab tính năng, xóa
          tab) nay đi qua hàm OpenFirstPage() — tìm nút có LayoutOrder nhỏ nhất — nên icon được tô
          vàng luôn khớp với trang đang mở.
        • DỌN SẠCH dấu vết layout cũ: các hàng nút vốn xếp cho khổ nội dung 435px nay trải hết khổ
          mới (lề 8px, mép phải 476px) ở 💻 Code, 🛠 Hỗ Trợ, ➕ Tạo Tính Năng; đường phân cách "━"
          dài gấp đôi cho vừa khổ; 3 nhãn X:/Y:/Z: ở mục 🚀 Teleport trước đây ĐÈ LÊN NHAU (Label()
          luôn đặt x=8) nay đứng đúng cạnh ô của mình, 3 ô nhập trải đều hết hàng.
        • MƯỢT HƠN (đo được, không phải nói suông):
            - Vòng RenderStepped của tab 🛠 trước đây raycast + đọc Humanoid + ghi hơn 10 nhãn
              MỖI FRAME (60-144 lần/giây) và chạy cả khi menu ĐÓNG; tệ hơn: nếu GetProductInfo lỗi
              (executor chặn HTTP) thì nhãn cứ ở "Place: ..." nên nó GỌI HTTP LẠI MỖI FRAME mãi mãi.
              Nay: chỉ chạy khi menu MỞ **và** đang ở trang 🛠, tối đa 20 lần/giây, HTTP tối đa
              1 lần/10 giây (vẫn tự điền tên Place), so sánh HumanoidState bằng enum thay vì
              tostring+gsub mỗi frame (bớt 1 chuỗi rác/frame cho GC). Đóng menu = 0 raycast.
            - Ô tìm kiếm ở 💾 Code Đã Lưu và 📚 Script Hub: debounce 0.18s (S.Debounce) — gõ 6 phím
              chỉ dựng lại danh sách 1 lần, kết quả cuối giống hệt.
        • v4.6.3 — thêm nhóm 🌐 SERVER vào trang 📚 Script Hub (3 thẻ + 1 khung riêng):
            - 🔄 Reset Server: vào lại ĐÚNG server đang chơi bằng TeleportToPlaceInstance(PlaceId,
              JobId) — giữ nguyên người chơi cùng server; Studio/server đơn thì Teleport nạp lại game.
            - 🔀 Hop Server: TỰ ĐI LẤY MÃ SERVER — đọc danh sách server công khai của chính game này
              qua API công khai games.roblox.com/v1/games/{PlaceId}/servers/Public bằng game:HttpGet
              (tối đa 3 trang ~300 server), BỎ server hiện tại và server đã đầy, rồi vào 1 server
              ngẫu nhiên còn chỗ. Không dùng link lạ, không cần quyền đặc biệt.
            - 🌐 Lấy mã server (JobId): copy ra clipboard + điền sẵn vào ô nhập để gửi bạn bè.
            - 🎟 KHUNG NHẬP MÃ SERVER dưới danh sách thẻ: dán JobId → 🚀 Vào server đó (tự cắt khoảng
              trắng và dấu nháy), kèm nút 🔀 Hop. Hop lỗi (game ẩn danh sách server) thì vẫn vào được
              bằng cách dán mã thủ công — không có nút chết.
            - Thêm chip phân loại "Server" (6 chip) và danh sách thẻ ngắn lại 54px để nhường chỗ khung.
        • 193 kiểm thử tự động PASS (105 Script Hub · 31 header/công tắc · 20 perf RenderStepped ·
          15 park/noPark · 13 nhúng GUI vào tab · 9 thứ tự trang). Bộ test nằm ở /home/user/luachk
          (ngoài repo) — chạy: node runtest.js <file.lua>.
    + v4.5: THIẾT KẾ LẠI TOÀN BỘ GIAO DIỆN (chỉ đổi màu/chất liệu/hiệu ứng — KHÔNG đổi layout, kích
      thước, vị trí hay logic, nên MỌI TÍNH NĂNG giữ nguyên 100%):
        • Bảng màu tối "Midnight Gold": nền 18,20,27 · thẻ 26,29,38 · viền mảnh 52,58,74 ·
          chữ chính 233,237,245 · chữ phụ 150,158,176 · accent vàng chuối 255,196,61 -> cam
          255,132,62. Giữ NGUYÊN tên khóa cũ (C.BG/C.DARK/C.WHITE/C.GREEN/...) nên hàng trăm
          chỗ đang dùng C.XXX không phải sửa (C.DARK nay là màu CHỮ vì nền đã tối).
        • Cửa sổ: bo 14px, nền đổ khối dọc (UIGradient), viền 1.4px, họa tiết nền ánh vàng rất
          nhẹ. Thanh tiêu đề có chữ gradient vàng->trắng sữa + vạch accent chạy dọc đáy + pill
          phiên bản "v4.5 · PRO".
        • Nút 🍌 nổi: gradient vàng->cam, chữ đậm, viền cam, quầng sáng "thở" phía sau (tự bám
          theo khi kéo nút đi — không dùng ảnh/asset ngoài).
        • Thanh tab: pill ghost (trong suốt, chữ mờ) -> tab đang mở nổi nền + chữ vàng + vạch
          accent 3px trượt theo (vạch là CON của nút nên không bị UIListLayout xô).
        • Nút bấm: nền đặc, bo 8px, viền sáng hơn nền một bậc, đổ khối nhẹ, chữ TỰ chọn đậm/sáng
          theo nền (không còn chữ trắng chìm trên nền vàng/xanh lá), hover sáng lên + nhấn đậm lại.
        • Ô nhập liệu: viền mảnh, có VÒNG SÁNG VÀNG khi gõ (focus ring).
        • Chữ dùng họ font GothamSSo (sắc, hiện đại) nhưng GIỮ nguyên độ đậm đã chọn.
        • Scrollbar mảnh 3px màu tối. Mở menu có hiệu ứng nở nhẹ 0.2s (kéo/nới khung là hủy ngay).
        • Các công tắc đổi màu lúc chạy (🧩/🕵/🪟/🎯/💜) nay đổi màu KÈM chữ tương phản (D.SetBg).
        • Sửa luôn: đóng menu bằng nút ✕ trước đây KHÔNG trả input cho game (chỉ nút 🍌 mới trả).
    + SỬA (bản này): 3 nút ⚡ Script Nhanh ở tab 🛠 Hỗ Trợ (Dex Explorer, Infinite Yield,
      SimpleSpy) bấm chạy thì GUI KHÔNG hiện ra màn hình chính mà bị đưa vào menu (v4.4h lỡ
      "đậu" chúng vào tab 🧩 GUI Ngoài). Đây là CÔNG CỤ CỬA SỔ RIÊNG — phải nằm ngoài màn hình
      game mới kéo/thu nhỏ/dùng được. Nay:
        • 3 nút đó truyền noPark=true -> KHÔNG BAO GIỜ bị đưa vào menu (y như trước v4.4h);
        • dán loadstring của chúng vào tab 💻 Code hoặc chạy từ 💾 Code Đã Lưu cũng TỰ NHẬN RA
          (soi URL/tên: dex.lua, infiniteyield, simplespy...) -> vẫn để ngoài màn hình;
        • tab 🧩 GUI Ngoài có thêm nút "↩ Trả tất cả về game";
        • thêm công tắc 🪟 ở tab ➕ Tạo Tính Năng: TẮT là MỌI script chạy ở tab 💻 Code để GUI
          ngoài màn hình game (như bản cũ), lựa chọn được LƯU XUỐNG ĐĨA. Tab ➕ Tính Năng không
          phụ thuộc công tắc này — vẫn nhúng GUI vào tab như bình thường;
        • nhãn trạng thái tab 💻 Code nói rõ GUI đi đâu ("🪟 GUI để NGOÀI màn hình game..." /
          "🧩 đã đưa N GUI vào tab GUI Ngoài").
      KHÔNG đổi gì ở các tính năng khác: tab ➕ Tính Năng vẫn tự nhúng GUI (kể cả script tạo GUI
      trễ, tạo trong task.spawn, GUI tên "Main", và cả khi executor chặn hook Instance.new).
    + SỬA (bản này): GUI của script tính năng VẪN nằm NGOÀI menu — kể cả lần tạo ĐẦU TIÊN
      (không chỉ sau khi thoát game vào lại). 3 nguyên nhân đã vá:
        • REGRESSION của v4.4g: nó lọc TÊN ScreenGui cho MỌI trường hợp. Rất nhiều script đặt
          tên GUI là "Main"/"InGame"/"Notifications" -> bị từ chối OAN (v4.4f chỉ lọc tên ở
          nhánh "đoán"). Nay: GUI do CHÍNH script của tab tạo ra thì KHÔNG bị lọc tên nữa;
          chỉ chặn tên UI hệ thống thật của Roblox (Topbar/Chat/Backpack/PlayerList/PauseMenu...).
        • Nhiều executor CHẶN ghi đè Instance.new -> hook cài không được -> hub không biết GUI
          nào là của script -> không nhúng gì. Nay hub TỰ KIỂM TRA hook có ăn không (probe),
          nếu không thì: (1) thử hookfunction, (2) dùng watcher ChildAdded trên PlayerGui/
          gethui()/CoreGui — bắt GUI theo THỜI ĐIỂM nó được gắn lên màn hình trong lúc script
          của tab đang chạy (không cần hook), (3) tự bật quét diff an toàn, (4) BÁO RÕ ở nhãn
          trạng thái + console (F9) là "executor chặn hook".
        • Script dựng GUI quá trễ: nay thử lại tới 10s (0.6/1.8/4/7/10s), giữ hook+watcher 11s.
    + SỬA (quan trọng, hay bị bỏ sót): script chạy ở tab 💻 CODE / 💾 Code Đã Lưu / 🛠 Hỗ Trợ
      (đi qua RunCode) TRƯỚC ĐÂY KHÔNG BAO GIỜ nhúng GUI — chỉ tab ➕ Tính Năng mới nhúng.
      Nên ai chạy script từ tab Code thì GUI luôn nằm NGOÀI menu, lần đầu lẫn sau khi vào lại game.
      Nay hub tự mở tab "🧩 GUI Ngoài" và đưa GUI đó vào menu (mỗi GUI một ô, có nút ↩ trả về
      game). Tắt 🧩 "Nhúng GUI vào menu" là hành vi trở về đúng như cũ.
    + THÊM: in CHẨN ĐOÁN ra console mỗi lần bấm ▶ (hook OK/chặn · ghi nhận bao nhiêu GUI ·
      từng GUI bị bỏ qua vì lý do gì) -> hết cảnh "không nhúng mà không biết vì sao".
    + GIỮ NGUYÊN: chờ GUI "chín" (có frame con) mới nhúng · tự nhúng lại khi MỞ tab ·
      nút 🔁 "Cứu GUI" · lưu 🧩/🕵 xuống đĩa · không ăn nhầm UI của game (lọc tên + ✕ hoàn tác).
    ---------------------------------------------------------------------------
    (lịch sử cũ) v4.4g:
    + SỬA (đúng lỗi hay gặp): TẠO TÍNH NĂNG -> bấm ▶ Chạy Script thì GUI nằm TRONG menu,
      nhưng THOÁT GAME VÀO LẠI -> bấm ▶ thì GUI KHÔNG vào menu nữa. 3 nguyên nhân đã vá:
        • Bản cũ chỉ nhận ScreenGui tạo ĐÚNG luồng (coroutine) của người bấm nút. Script dựng
          GUI trong task.spawn / task.delay / sau HttpGet -> hub coi là "không phải của mình".
          Nay ghi nhận MỌI ScreenGui sinh ra trong lúc hook còn sống + chấm điểm tin cậy.
        • Bản cũ thấy ScreenGui là nhúng NGAY, trong khi script thường tạo ScreenGui trước rồi
          mới thêm frame con sau -> đếm 0 frame con -> hủy host -> "không nhúng gì cả".
          Nay CHỜ GUI "chín" (có ít nhất 1 frame con) tối đa 3 giây rồi mới nhúng.
        • Bản cũ quá 2.4s là bỏ cuộc. Nay giữ hook 7s, THỬ LẠI ở 0.6/1.8/4/7s, TỰ nhúng lại
          khi bạn MỞ tab tính năng, và thêm nút 🔁 "Cứu GUI" ở tab Tạo Tính Năng (nhúng bằng tay).
    + THÊM: 🧩 "Nhúng vào Tab" và 🕵 "Đoán GUI trễ" giờ ĐƯỢC LƯU XUỐNG ĐĨA (mục settings trong
      banana_cat_saved.json, save version 3) -> thoát game vào lại vẫn giữ đúng trạng thái cũ.
    + SỬA: "🔄 Nạp lại" / khôi phục tab lúc vào game có thể làm MẤT GUI đang nhúng (destroy frame
      của tab mà không trả GUI về ScreenGui gốc trước) -> nay trả về nguyên trạng rồi mới dỡ.
    + SỬA: khi gỡ hook Instance.new, bản cũ ghi đè thẳng nên làm MẤT hook của script khác
      -> nay chỉ gỡ khi hook của hub còn nằm trên cùng (giữ nguyên chain).
    + SỬA: _G.BananaCatHubAPI.Version kẹt ở "4.4e" trong khi hub đã là 4.4f -> nay đồng bộ 4.4g.
    + GIỮ NGUYÊN toàn bộ tính năng cũ: Code / Code Đã Lưu / Hỗ Trợ (phân tích vật thể bằng chuột
      phải + long-press mobile, highlight tím, tọa độ, waypoint, teleport) / AI AI (Gemini) /
      Tạo Tính Năng (nhúng GUI, code mẫu, crosshair, chế độ an toàn 🧩 TẮT).
    ---------------------------------------------------------------------------
    (lịch sử cũ) v4.4f:
    + SỬA "Phân Tích Vật Thể" (TRỌNG TÂM của bản này):
        • Đổi cách chọn vật sang CHUỘT PHẢI (lệt) — chuột trái đi bắn/kéo/mở menu bình thường,
          KHÔNG còn bị chiếm input hay tự chọn vật khi bạn bấm lộn.
        • Trên mobile: GIỮ NGÓN 0.4s tại vị trí muốn chọn = chuột phải (chạm nhẹ đi/kéo joystick
          bình thường không bị bắt nhờ vào độ dịch >12px).
        • Chống hit nhầm 3 lớp:
            1) kiểm tra cả PlayerGui LẪN CoreGui (không còn raycast xuyên nút bắn/joystick
               -> không còn "nhấn vào nút game mà chọn vật đằng sau")
            2) tự nhận nút (GuiButton/Active) + các element đặc (transparency <0.5)
            3) nếu raycast trượt (bầu trời) thì GIỮ NGUYÊN kết quả cũ + highlight cũ,
               chỉ hiện thông báo 1s rồi trả lại nhãn cũ — không còn bị mất vật đang phân tích
               khi rê chuột lướt qua không khí.
        • Tăng tầm raycast 5000 → 10000 studs cho game mở thế giới.
    + v4.4e: nút 🎯 "Tâm" trên mỗi tab tính năng — bật/tắt vòng tròn niêm tâm ở GIỮA
           MÀN HÌNH GAME (ngoài menu, ScreenGui riêng, luôn trên cùng).
    + THÊM: code mẫu (📋 Copy Code Mẫu Cho AI) giờ có sẵn khối EXTERNAL OVERLAY hướng dẫn
           viết ESP/crosshair/HUD nằm ngoài khung menu — gửi cho người khác/AI cũng biết
           cách tạo vòng tròn/đường kẻ/bảng thông tin trên màn hình mà KHÔNG bị hub ép
           vào trong ô tab (đánh dấu ScreenGui bằng BCHub_External=true).
    + THÊM: API:ExternalGui() / API:Crosshair() cho script tính năng can thiệp bên ngoài.
    + SỬA: _G.BananaCatHubAPI.HubGui trước đây ghi thành biến `hubGui` không tồn tại
           -> trả về nil; nay trả đúng GUI của hub.
    + SỬA (QUAN TRỌNG — đúng cái bạn gặp): "TẠO TÍNH NĂNG → ▶ Chạy Script" làm bạn
           KHÔNG quay chuột / KHÔNG bắn được và làm LỖI vài nút của game. 3 nguyên nhân:
             • TextBox của hub còn focus -> Roblox chặn input người chơi. Giờ hub tự nhả focus
               mỗi khi chạy code / đổi tab / đóng menu.
             • ForceStretchToParent ép Size=(1,0,1,0) lên TỪNG frame con (kể cả GUI của game)
               -> frame trong suốt full-màn-hình nuốt click. Giờ CHỈ chỉnh root.
             • ScanNewGuis bốc bừa ScreenGui "mới xuất hiện" (bao gồm GUI của game) rồi Destroy
               -> mất nút game + script bị nhúng hỏng. Giờ: hook Instance.new để biết GUI nào
               THỰC SỰ thuộc script, không quét CoreGui, không Destroy GUI gốc.
    + THÊM: nút 🧩 "Nhúng vào Tab: BẬT/TẮT" — TẮT = hub không đụng gì tới GUI (chế độ an toàn)
    + THÊM: ✕ trên tab tính năng giờ TRẢ GUI về nguyên trạng (Position/Size/Parent cũ), hết kiểu
           "đóng tab là GUI của script bị hỏng luôn"
    + THÊM: host nhúng tự co giãn theo kích thước menu bằng Scale tương đối (không còn phá layout)
    + SỬA: "📏 Lấy Code Kích Thước" không còn quét CoreGui/PlayerGui (trước đây nó đè UI của game
           và của script khác), không còn ghi đè code trong ô nhập; wrapper cũ đã lưu sẽ được
           tự vô hại hoá khi nạp
    + SỬA: "🔄 Nạp lại" không còn ghi đè file lưu (nguy cơ mất dữ liệu khi file JSON hỏng)
           và có dựng lại danh sách Waypoint
    ============================================================================
    (lịch sử cũ) v4.4a:
    + SỬA: "TẠO TÍNH NĂNG" giờ cũng ĐƯỢC LƯU XUỐNG ĐĨA — tab tính năng bạn tạo
           thoát game vào lại VẪN CÒN, nằm đúng trong mục "Danh Sách Tab Tính Năng Đã Tạo"
           (trước đây nó biến mất, nên phải chép sang tab Code để giữ -> lưu nhầm chỗ)
    + ĐỔI: nút "💾 Lưu Vào DS" trong tab tính năng -> "📤 Chép sang Code" cho rõ nghĩa:
           nó CHÉP MỘT BẢN sang tab Code Đã Lưu, không phải là cách lưu tính năng
    + THÊM: sửa code trong tab tính năng (✏️ Áp Dụng) cũng được lưu
    + THÊM: nhãn trạng thái ở tab Code Đã Lưu hiện thêm số tab tính năng
    + SỬA: "Code Đã Lưu" + "Waypoint" giờ ĐƯỢC LƯU XUỐNG ĐĨA (file banana_cat_saved.json)
           -> thoát game / vào lại / chạy lại script VẪN CÒN NGUYÊN dữ liệu
           -> có nhãn trạng thái lưu + nút "🔄 Nạp lại" ở tab Code Đã Lưu
           -> executor không có writefile thì tự fallback lưu trong _G (giữ được khi chạy lại script)
    + SỬA: Chạy code xong status bị kẹt "⏳ Đang thực thi..." (race curThread/task.spawn)
    + SỬA: Xóa 1 tab tính năng làm các tab còn lại mở SAI tab (closure giữ index cũ)
    + SỬA: Nút "💾 Lưu" khi API key đang ẨN sẽ ghi đè key thật bằng chuỗi che -> MẤT KEY
    + SỬA: Nút "▶ Viết tiếp" của AI vô dụng vì không gửi lịch sử hội thoại cho Gemini
    + SỬA: Khung xem code ở tab "Code Đã Lưu" không cuộn được (CanvasSize = 0)
    + SỬA: Click vào menu vẫn raycast ra vật thể phía sau (guard dùng nhầm PlayerGui)
    + THÊM: Highlight viền tím khi click vật thể (dùng Highlight instance)
    + THÊM: Tự động xóa highlight cũ khi click vật mới
    + THÊM: Nút bật/tắt highlight
    + GIỮ NGUYÊN toàn bộ tính năng cũ (Fly/Carpet đã bị bỏ từ v4.3, không phải ở bản này)
--]]
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")
local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")
local HttpService = game:GetService("HttpService")
local TeleportService = game:GetService("TeleportService")   -- v4.6.3: Reset / Hop / vào server theo mã

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local camera = workspace.CurrentCamera

local targetGui = playerGui
pcall(function()
    if gethui then
        local hui = gethui()
        if hui then targetGui = hui end
    elseif game:GetService("CoreGui") then
        targetGui = game:GetService("CoreGui")
    end
end)

if _G.BananaCatHub_Connections then
    for _, c in ipairs(_G.BananaCatHub_Connections) do
        pcall(function() c:Disconnect() end)
    end
end
_G.BananaCatHub_Connections = {}

-- Dọn crosshair/menu cũ nếu script bị chạy lại (tránh đè 2 vòng tròn / 2 menu)
for _, parent in ipairs({targetGui, playerGui, game:GetService("CoreGui")}) do
    pcall(function()
        local old = parent:FindFirstChild("BananaCatHub_Crosshair")
        if old then old:Destroy() end
    end)
end

local function trackConn(conn)
    table.insert(_G.BananaCatHub_Connections, conn)
    return conn
end

pcall(function() RunService:UnbindFromRenderStep("Fly") end)
pcall(function() RunService:UnbindFromRenderStep("Carpet") end)

-- ==================== v4.5: HỆ MÀU "MIDNIGHT GOLD" — giao diện tối, hiện đại ====================
-- CHỈ đổi màu/chất liệu, KHÔNG đổi layout hay logic -> mọi tính năng giữ nguyên 100%.
-- Tên khóa cũ được GIỮ NGUYÊN (WHITE/DARK/GRAY/GREEN/BLUE/RED/... /BG) để hàng trăm chỗ
-- đang dùng C.XXX không phải sửa. Lưu ý duy nhất: nền đã chuyển sang TỐI nên
--   • C.BG   = nền cửa sổ (trước là sáng 240,242,248 -> nay 18,20,27)
--   • C.DARK = MÀU CHỮ CHÍNH (trước là chữ đậm 40,40,45 trên nền sáng -> nay chữ sáng)
--     (đã kiểm tra: C.DARK chỉ được dùng cho TextColor3, không nơi nào dùng làm nền/viền)
local C = {
    WHITE  = Color3.fromRGB(255, 255, 255),
    DARK   = Color3.fromRGB(233, 237, 245),   -- chữ chính trên nền tối
    GRAY   = Color3.fromRGB(124, 132, 150),   -- nút tắt / chữ phụ
    GREEN  = Color3.fromRGB(38, 194, 118),
    BLUE   = Color3.fromRGB(72, 148, 248),
    RED    = Color3.fromRGB(242, 86, 94),
    YELLOW = Color3.fromRGB(255, 205, 64),
    PURPLE = Color3.fromRGB(172, 105, 255),
    ORANGE = Color3.fromRGB(245, 152, 66),
    PINK   = Color3.fromRGB(242, 122, 185),
    BG     = Color3.fromRGB(18, 20, 27),      -- nền cửa sổ chính

    -- token thiết kế mới (v4.5)
    INK      = Color3.fromRGB(16, 18, 24),    -- chữ ĐẬM dùng trên nền vàng/cam/sáng
    SURFACE  = Color3.fromRGB(26, 29, 38),    -- thẻ, ô nhập liệu
    SURFACE2 = Color3.fromRGB(34, 38, 50),    -- panel, dòng hover, thanh tiêu đề
    SURFACE3 = Color3.fromRGB(46, 51, 66),    -- viền sáng, scrollbar
    BORDER   = Color3.fromRGB(52, 58, 74),    -- viền mảnh 1px
    MUTED    = Color3.fromRGB(150, 158, 176), -- chữ phụ
    ACCENT   = Color3.fromRGB(255, 196, 61),  -- vàng chuối (màu nhận diện hub)
    ACCENT2  = Color3.fromRGB(255, 132, 62),  -- cam (đuôi gradient)
}

local function New(cls, props, parent)
    local obj = Instance.new(cls)
    -- v4.5: phong cách nền cho MỌI đối tượng (props truyền vào vẫn được ghi đè sau -> ưu tiên hơn)
    pcall(function()
        if cls == "Frame" or cls == "ScrollingFrame" or cls == "TextButton"
           or cls == "TextLabel" or cls == "TextBox" or cls == "ImageButton" then
            obj.BorderSizePixel = 0          -- phẳng, không viền 1px kiểu cũ
        end
        if cls == "ScrollingFrame" then
            obj.ScrollBarThickness = 3       -- scrollbar mảnh kiểu hiện đại
            obj.ScrollBarImageColor3 = Color3.fromRGB(46, 51, 66)
            obj.ScrollBarImageTransparency = 0.2
        end
    end)
    for k, v in pairs(props or {}) do
        obj[k] = v
    end
    if parent then obj.Parent = parent end
    -- v4.5: chữ dùng họ font GothamSSo (sắc, hiện đại hơn) nhưng GIỮ nguyên độ đậm đã chọn
    pcall(function()
        if cls == "TextButton" or cls == "TextLabel" or cls == "TextBox" then
            local w = Enum.FontWeight.Medium
            local f = obj.Font
            if f == Enum.Font.GothamBold or f == Enum.Font.GothamBlack then
                w = Enum.FontWeight.Bold
            elseif f == Enum.Font.GothamSemibold then
                w = Enum.FontWeight.SemiBold
            elseif f == Enum.Font.Gotham or f == Enum.Font.GothamLight or f == Enum.Font.GothamItalic then
                w = Enum.FontWeight.Regular
            end
            obj.FontFace = Font.new("rbxasset://fonts/families/GothamSSo.json", w)
        end
    end)
    -- v4.5: ô nhập liệu có "vòng sáng" khi gõ (focus ring) — chỉ đổi màu viền, không đổi layout
    pcall(function()
        if cls == "TextBox" then
            -- LƯU Ý: KHÔNG gọi Tween() ở đây — hàm Tween khai báo SAU New(), nếu gọi sẽ bị
            -- biên dịch thành GLOBAL nil (lỗi runtime khi người dùng bấm vào ô nhập liệu).
            trackConn(obj.Focused:Connect(function()
                local st = obj:FindFirstChildOfClass("UIStroke")
                if not st then   -- ô chưa có viền thì tạo lúc được focus (không tạo thừa lúc dựng UI)
                    st = New("UIStroke", {
                        Thickness = 1, Transparency = 0.05,
                        ApplyStrokeMode = Enum.ApplyStrokeMode.Border,
                    }, obj)
                end
                TweenService:Create(st, TweenInfo.new(0.18),
                    {Color = Color3.fromRGB(255, 196, 61), Transparency = 0.05}):Play()
            end))
            trackConn(obj.FocusLost:Connect(function()
                local st = obj:FindFirstChildOfClass("UIStroke")
                if st then
                    TweenService:Create(st, TweenInfo.new(0.25),
                        {Color = Color3.fromRGB(52, 58, 74), Transparency = 0.3}):Play()
                end
            end))
        end
    end)
    -- v4.5: TỰ CÂN BẰNG TƯƠNG PHẢN. Bảng màu nay có mấy màu sáng (vàng/cam/xanh lá) nên chữ
    -- trắng đặt lên đó sẽ khó đọc. Chỉ "cứu" đúng cặp: nền SÁNG + chữ TRẮNG + nền không trong suốt
    -- (nút "ghost" nền trong suốt thì giữ nguyên màu chữ mà code đã chọn). Tính luminance tại chỗ
    -- để KHÔNG phải gọi D.BestText (D khai báo sau New -> gọi sẽ thành global nil).
    pcall(function()
        if (cls == "TextButton" or cls == "TextLabel") and props
           and props.BackgroundColor3 ~= nil and props.TextColor3 ~= nil
           and (props.BackgroundTransparency or 0) < 0.5 then
            local bg = props.BackgroundColor3
            if typeof(bg) == "Color3" then
                local lum = 0.2126 * bg.R + 0.7152 * bg.G + 0.0722 * bg.B
                if lum > 0.6 and props.TextColor3 == Color3.fromRGB(255, 255, 255) then
                    obj.TextColor3 = Color3.fromRGB(16, 18, 24)
                end
            end
        end
    end)
    return obj
end

local function Corner(p, r)
    return New("UICorner", {CornerRadius = r or UDim.new(0, 10)}, p)   -- v4.5: bo 10px (trước 8px)
end

local function Stroke(p, c, t)
    return New("UIStroke", {
        Color = c or Color3.fromRGB(52, 58, 74),        -- v4.5: viền mảnh màu tối, không còn viền xám sáng
        Thickness = t or 1,
        Transparency = 0.25,
        ApplyStrokeMode = Enum.ApplyStrokeMode.Border,
    }, p)
end

local function Tween(o, p, d, e)
    TweenService:Create(o, TweenInfo.new(d or 1.5, e or Enum.EasingStyle.Quad), p):Play()
end

-- ============================================================================
-- v4.5: BỘ CÔNG CỤ THIẾT KẾ (gom vào 1 bảng `D` để KHÔNG tốn thêm biến local cấp chunk —
-- main chunk của file này đã sát trần 200 local của Luau).
-- ============================================================================
local D = {}

-- Chữ/viền nên sáng hay đậm trên nền `bg`? (tự động tương phản, tránh chữ chìm)
function D.BestText(bg)
    if typeof(bg) ~= "Color3" then return C.WHITE end
    local lum = 0.2126 * bg.R + 0.7152 * bg.G + 0.0722 * bg.B
    return (lum > 0.6) and C.INK or C.WHITE
end

-- Viền hơi sáng hơn nền một chút (đủ tách khối mà không gắt)
function D.Edge(bg)
    if typeof(bg) ~= "Color3" then return C.BORDER end
    return Color3.new(
        math.min(1, bg.R + 0.09), math.min(1, bg.G + 0.09), math.min(1, bg.B + 0.11))
end

-- Lấy (hoặc tạo) UIGradient của đối tượng — gọi lại BAO NHIÊU LẦN cũng chỉ có 1 gradient,
-- không rò instance như kiểu New("UIGradient", ...) mỗi lần.
function D.Grad(obj)
    local g = obj:FindFirstChildOfClass("UIGradient")
    if not g then
        g = New("UIGradient", {Color = ColorSequence.new(Color3.new(1,1,1), Color3.new(1,1,1))}, obj)
    end
    return g
end

-- Tô gradient THẬT (đổi luôn BackgroundColor3 sang trắng để màu gradient lên đúng)
function D.Paint(obj, c1, c2, rotation)
    pcall(function()
        obj.BackgroundColor3 = Color3.new(1, 1, 1)
        local g = D.Grad(obj)
        g.Color = ColorSequence.new(c1, c2 or c1)
        g.Rotation = rotation or 90
    end)
    return obj
end

-- Đổ bóng nhẹ GIỮA NGUYÊN màu nền (gradient nhân với BackgroundColor3) — tạo chiều sâu
function D.Shade(obj, k1, k2, rotation)
    pcall(function()
        local g = D.Grad(obj)
        g.Color = ColorSequence.new(k1 or Color3.new(1.0, 1.0, 1.0), k2 or Color3.new(0.86, 0.87, 0.9))
        g.Rotation = rotation or 90
    end)
    return obj
end

-- Chữ gradient (dùng cho tiêu đề)
function D.PaintText(obj, c1, c2)
    pcall(function()
        obj.TextColor3 = Color3.new(1, 1, 1)
        local g = D.Grad(obj)
        g.Color = ColorSequence.new(c1, c2 or c1)
        g.Rotation = 0
    end)
    return obj
end

-- Hiệu ứng hover/nhấn cho nút: sáng lên khi rê chuột, đậm lại khi nhấn (không đổi Size -> không xô layout)
function D.Tactile(btn, baseTrans)
    baseTrans = baseTrans or 0.08
    pcall(function()
        trackConn(btn.MouseEnter:Connect(function()
            Tween(btn, {BackgroundTransparency = math.max(0, baseTrans - 0.06)}, 0.16)
        end))
        trackConn(btn.MouseLeave:Connect(function()
            Tween(btn, {BackgroundTransparency = baseTrans}, 0.2)
        end))
        trackConn(btn.MouseButton1Down:Connect(function()
            Tween(btn, {BackgroundTransparency = math.min(1, baseTrans + 0.12)}, 0.08)
        end))
        trackConn(btn.MouseButton1Up:Connect(function()
            Tween(btn, {BackgroundTransparency = baseTrans}, 0.14)
        end))
    end)
    return btn
end

-- Nút chữ (nền trong suốt) đổi màu chữ khi rê chuột — dùng cho ✕ / 🔒 trên thanh tiêu đề
function D.HoverText(btn, overColor, downColor)
    pcall(function()
        local base = btn.TextColor3
        trackConn(btn.MouseEnter:Connect(function() Tween(btn, {TextColor3 = overColor or C.WHITE}, 0.15) end))
        trackConn(btn.MouseLeave:Connect(function() Tween(btn, {TextColor3 = base}, 0.2) end))
        trackConn(btn.MouseButton1Down:Connect(function()
            Tween(btn, {TextColor3 = downColor or overColor or C.WHITE}, 0.08)
        end))
    end)
    return btn
end

-- Quầng sáng nhẹ phía SAU đối tượng (không cần ảnh/asset ngoài): 1 Frame anh em to hơn vài px,
-- trong suốt gần hết, và tự bám theo Position khi đối tượng bị kéo đi.
function D.Glow(obj, color, pad, trans)
    local glow = nil
    pcall(function()
        if not obj or not obj.Parent then return end
        pad = pad or 7
        local function posOf()
            local pp = obj.Position
            return UDim2.new(pp.X.Scale, pp.X.Offset - pad, pp.Y.Scale, pp.Y.Offset - pad)
        end
        glow = New("Frame", {
            Name = "BC_Glow",
            Size = UDim2.new(1, pad * 2, 1, pad * 2),
            Position = posOf(),
            BackgroundColor3 = color or C.ACCENT,
            BackgroundTransparency = trans or 0.86,
            BorderSizePixel = 0,
            ZIndex = (obj.ZIndex or 1) - 1,
        }, obj.Parent)
        Corner(glow, UDim.new(1, 0))
        trackConn(obj:GetPropertyChangedSignal("Position"):Connect(function()
            pcall(function() glow.Position = posOf() end)
        end))
    end)
    return glow
end

-- Đổi màu nền nút LÚC CHẠY (các công tắc BẬT/TẮT) mà vẫn giữ chữ tương phản + viền ăn theo.
-- Trước đây code chỉ gán BackgroundColor3 nên khi đổi sang màu sáng (vàng/xanh lá) thì chữ trắng
-- thành khó đọc; hoặc ngược lại: nền xám mà chữ đậm.
function D.SetBg(obj, color, trans)
    pcall(function()
        if not obj then return end
        obj.BackgroundColor3 = color
        if trans ~= nil then obj.BackgroundTransparency = trans end
        if obj:IsA("TextButton") or obj:IsA("TextLabel") then
            obj.TextColor3 = D.BestText(color)
        end
        local st = obj:FindFirstChildOfClass("UIStroke")
        if st then st.Color = D.Edge(color) end
    end)
    return obj
end

-- Nhịp thở (tween lặp vô hạn, tự đảo chiều) — chỉ dùng cho BackgroundTransparency của quầng sáng
function D.Breathe(obj, props, dur)
    pcall(function()
        local ti = TweenInfo.new(dur or 1.9, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true)
        TweenService:Create(obj, ti, props):Play()
    end)
end

-- ============================================================================
-- v4.4b — SỬA LỖI "chạy tính năng xong không quay chuột / không bắn được"
-- Nguyên nhân gốc (3 chỗ, đều được sửa ở dưới):
--   1) TextBox của hub còn đang FOCUS. Khi có TextBox focused, PlayerModule mặc định của
--      Roblox chặn toàn bộ input người chơi -> không đi, không quay chuột, không bắn.
--      -> ReleaseHubFocus() được gọi trước mỗi lần chạy code / đổi tab / đóng menu.
--   2) ForceStretchToParent ĐỆ QUY ép MỌI Frame (kể cả của game) về Size=(1,0,1,0) +
--      Position=(0,0) -> một frame con trong suốt biến thành full-màn-hình và nuốt hết click.
--      -> chuyển thành CHỈ xử lý root (maxDepth mặc định 0).
--   3) ScanNewGuis "đoán bừa": hễ ScreenGui nào mới xuất hiện trong 2.4s là bốc con sang tab
--      + Destroy ScreenGui gốc -> mất nút của game, và script được nhúng hỏng vì
--      `gui.Enabled`/`gui:Destroy()` của nó không còn tác dụng.
--      -> biết chính xác GUI nào là của script (hook Instance.new), không quét CoreGui,
--         không Destroy GUI gốc, thêm nút 🧩 BẬT/TẮT nhúng và ✕ trả GUI về nguyên trạng.
-- v4.4c — SỬA "menu tính năng không cùng kích thước menu chính"
--   Bản 4.4b chỉ CO GUI (clamp <= 1) nên GUI hard-code nhỏ (vd 300x200) nằm lọt thỏm trong
--   tab 620x384 thay vì llen bằng menu. Nay S.FitEmbedded đo bounding box nội dung rồi NHÂN
--   ĐỒNG ĐỀU mọi Offset (Size/Position/UICorner/UIPadding/UIStroke/TextSize) của cả subtree
--   lên cùng 1 hệ số s = min(khổ tab / nội dung), clamp [0.35, 3.0] -> vừa PÓNG TO được,
--   vừa co lại được, mà tỉ lệ giữa các phần tử không đổi (không méo, không ép Size=(1,0,1,0)).
--   Sau đó tịnh tiến khung nội dung về góc tab + canh giữa; phần thừa bị ClipsDescendants chặn.
--   Vì s tính từ bounding box nên nội dung LUÔN nằm trong ô tab -> không thể tràn ra nuốt click
--   của game (đúng cái lỗi của 4.4a). Mọi giá trị gốc được chụp lại (entry.snap) và trả nguyên
--   trạng khi ✕ / 🧩 TẮT / xoá tab. Kéo corner menu hay đổi tab -> BcFit() re-fit (debounce
--   0.05s) nên GUI của tab luôn "bằng kích thước menu chính" theo thời gian thực.
-- v4.4d — "COPY CODE MẪU" + API kích thước cho script tính năng
--   Người dùng cần: bấm 1 nút -> ra code -> gửi cho người khác/AI viết tiếp -> dán lại ->
--   ▶ Chạy Script là GUI TỰ VỪA ô menu và tự theo khi kéo menu to/nhỏ.
--   -> _G.BananaCatHubAPI (TabArea / OnResize / FeatureTabHost / FitToTab / EmbedGui) để script
--      bên ngoài đọc được khổ menu; S.FeatureTemplate() sinh code mẫu có khối "SIZE CONTRACT"
--      (chạy được ngay, tự canh size cả khi hub TẮT nhúng); nút 📋 trong "Tạo Tính Năng" copy
--      clipboard + lưu vào Code Đã Lưu + chỉ điền vào ô code khi ô đang trống (không mất code).
--   + sửa: tab "Tạo Tính Năng" có CanvasSize=0 nên mấy dòng dưới không cuộn tới được.
-- ============================================================================
local function ReleaseHubFocus()
    pcall(function()
        local tb = UserInputService:GetFocusedTextBox()
        if tb then tb:ReleaseFocus() end
    end)
    -- một số executor game-input vẫn bị giữ bởi ComboBox/TextBox đã Destroy
    pcall(function() playerGui:ReleaseFocus() end)
end

if targetGui:FindFirstChild("ExMenu") then
    targetGui.ExMenu:Destroy()
end

local gui = New("ScreenGui", {
    Name="ExMenu",
    IgnoreGuiInset=true,
    ResetOnSpawn=false,
    ZIndexBehavior=Enum.ZIndexBehavior.Sibling,
}, targetGui)

local togBtn = New("TextButton", {
    Size=UDim2.new(0,48,0,48),
    Position=UDim2.new(1,-60,1,-60),
    Text="🍌",
    BackgroundColor3=C.ACCENT,
    BackgroundTransparency=0.03,
    TextColor3=C.INK,
    Font=Enum.Font.GothamBold,
    TextSize=24,
    BorderSizePixel=0,
    ZIndex=1000,
}, gui)
Corner(togBtn, UDim.new(1,0))
Stroke(togBtn, C.ACCENT2, 1.6)
-- v4.5: nút chuối vàng->cam + quầng sáng "thở" phía sau (không dùng ảnh/asset ngoài)
D.Paint(togBtn, C.ACCENT, C.ACCENT2, 135)
D.Tactile(togBtn, 0.03)
pcall(function()
    local glow = D.Glow(togBtn, C.ACCENT, 7, 0.88)
    if glow then D.Breathe(glow, {BackgroundTransparency = 0.97}, 2.1) end
end)

local main = New("Frame", {
    Size=UDim2.new(0,540,0,340),
    Position=UDim2.new(0.5,-270,0.5,-170),
    BackgroundColor3=C.BG,
    BackgroundTransparency=0.02,   -- v4.5: gần đục để chữ trên nền tối đọc rõ (trước 0.25)
    BorderSizePixel=0,
    Visible=false,
    ClipsDescendants=false,
    ZIndex=2,
}, gui)
Corner(main, UDim.new(0,14))
Stroke(main, C.BORDER, 1.4)
D.Shade(main, Color3.fromRGB(255,255,255), Color3.fromRGB(196,199,210), 90)   -- sâu hơn ở đáy

-- ===== HIT-TEST KHÔNG PHỤ THUỘC VÀO PARENT CỦA GUI =====
-- PlayerGui:GetGuiObjectsAtPosition() CHỈ quét PlayerGui. Khi hub nằm trong gethui()/CoreGui
-- (đường mặc định của script này) thì nó trả về rỗng -> mọi guard "click trúng menu" thành code chết.
-- Hai hàm dưới đây tự tính bằng AbsolutePosition/AbsoluteSize nên đúng với MỌI parent.
--
-- ĐÓNG GÓI VÀO BẢNG `Hit` (thay vì 2 biến local riêng): main chunk của script này đã dùng
-- 189/200 biến local cấp cao nhất. Lua/Luau giới hạn 200 local mỗi function, vượt là
-- lỗi biên dịch "too many local variables" và TOÀN BỘ script không chạy được.
local Hit = {}

function Hit.inObject(o, x, y)
    if not o then return false end
    local ok, res = pcall(function()
        if not o.Visible then return false end
        local p, s = o.AbsolutePosition, o.AbsoluteSize
        return x >= p.X and x <= p.X + s.X and y >= p.Y and y <= p.Y + s.Y
    end)
    return ok and res == true
end

function Hit.onHub(x, y)
    -- 1) thử API gốc trước (chạy đúng khi hub nằm trong PlayerGui)
    local ok, objs = pcall(function()
        return playerGui:GetGuiObjectsAtPosition(x, y)
    end)
    if ok and type(objs) == "table" then
        for _, o in ipairs(objs) do
            if o == gui or o:IsDescendantOf(gui) then return true end
        end
    end
    -- 2) fallback: tự đo khung cửa sổ chính + nút chuối
    if Hit.inObject(main, x, y) then return true end
    if Hit.inObject(togBtn, x, y) then return true end
    return false
end

local bgPattern = New("ImageLabel", {
    Name = "CheckeredBG",
    Size = UDim2.new(1, 0, 1, 0),
    Position = UDim2.new(0, 0, 0, 0),
    BackgroundTransparency = 1,
    Image = "rbxassetid://9822602710",
    ScaleType = Enum.ScaleType.Tile,
    TileSize = UDim2.new(0, 20, 0, 20),
    ImageTransparency = 0.94,                        -- v4.5: chỉ còn là chất liệu rất nhẹ
    ImageColor3 = Color3.fromRGB(255, 196, 61),      -- ánh vàng theo màu nhận diện
    ZIndex = 2,
}, main)
Corner(bgPattern, UDim.new(0, 10))

-- v4.5: thanh tiêu đề GIỮ NGUYÊN chiều cao 30px (tabBar/contentArea đang neo theo 30px,
-- đổi chiều cao là xô toàn bộ layout) — chỉ đổi chất liệu: nền tối, chữ gradient, vạch accent.
local titleBar = New("Frame", {
    Size=UDim2.new(1,0,0,30),
    BackgroundColor3=C.SURFACE2,
    BackgroundTransparency=0.04,
    BorderSizePixel=0,
    ZIndex=3,
}, main)
Corner(titleBar, UDim.new(0,14))
D.Shade(titleBar, Color3.fromRGB(255,255,255), Color3.fromRGB(168,172,184), 90)

-- vạch accent (vàng -> cam) chạy dọc đáy thanh tiêu đề
D.Paint(New("Frame", {
    Name="TitleAccent", Size=UDim2.new(1,-2,0,2), Position=UDim2.new(0,1,1,-1),
    BackgroundColor3=C.ACCENT, BorderSizePixel=0, ZIndex=5,
}, titleBar), C.ACCENT, C.ACCENT2, 0)

D.PaintText(New("TextLabel", {
    Size=UDim2.new(1,-90,1,0),
    Position=UDim2.new(0,12,0,0),
    Text="🍌 Banana Cat Hub",
    BackgroundTransparency=1,
    TextColor3=C.DARK,
    Font=Enum.Font.GothamBold,
    TextSize=13,
    TextXAlignment=Enum.TextXAlignment.Left,
    ZIndex=4,
}, titleBar), C.ACCENT, Color3.fromRGB(255, 243, 214))   -- chữ gradient vàng -> trắng sữa

-- pill phiên bản (v4.5) — thông tin phiên bản tách khỏi tiêu đề cho gọn, sang
D.verPill = New("Frame", {
    Name="VersionPill", Size=UDim2.new(0,62,0,16), Position=UDim2.new(0,158,0,7),
    BackgroundColor3=C.SURFACE3, BackgroundTransparency=0.35, BorderSizePixel=0, ZIndex=5,
}, titleBar)
Corner(D.verPill, UDim.new(1,0))
Stroke(D.verPill, C.ACCENT, 1)
New("TextLabel", {
    Size=UDim2.new(1,0,1,0), Text="v4.6 · DELTA", BackgroundTransparency=1,
    TextColor3=C.ACCENT, Font=Enum.Font.GothamBold, TextSize=8, ZIndex=6,
}, D.verPill)

local dragLockBtn = New("TextButton", {
    Size=UDim2.new(0,30,0,30),
    Position=UDim2.new(1,-64,0,0),
    Text="🔒",
    BackgroundTransparency=1,
    TextColor3=C.MUTED,
    Font=Enum.Font.GothamBold,
    TextSize=15,
    BorderSizePixel=0,
    ZIndex=4,
}, titleBar)

local closeBtn = New("TextButton", {
    Size=UDim2.new(0,30,0,30),
    Position=UDim2.new(1,-32,0,0),
    Text="✕",
    BackgroundTransparency=1,
    TextColor3=C.MUTED,
    Font=Enum.Font.GothamBold,
    TextSize=15,
    BorderSizePixel=0,
    ZIndex=4,
}, titleBar)
-- v4.5: hover đổi màu (✕ đỏ, 🔒 vàng) — chỉ đổi TextColor3, không đụng layout
D.HoverText(closeBtn, C.RED, C.RED)
D.HoverText(dragLockBtn, C.ACCENT, C.ACCENT)

local minW, minH = 440, 260

-- v4.4c: "menu kéo to/nhỏ -> GUI của tab co giãn theo". Khu S.* được khai báo phía dưới nên
-- ở đây chỉ gọi qua hook _G; BcFit() tự debounce để không chạy mỗi frame khi đang drag.
function BcFit()
    local fn = _G.BananaCatHub_SyncEmbeds
    if type(fn) ~= "function" then return end
    local ok, now = pcall(os.clock)
    if ok and _G.BcFitLast and now - _G.BcFitLast < 0.05 then return end
    _G.BcFitLast = ok and now or 0
    task.defer(fn)
end

local function SetupResizeHandle(btn, cornerType)
    local resizing, sizeStart, posStart, inputStart
    trackConn(btn.InputBegan:Connect(function(i)
        if i.UserInputType==Enum.UserInputType.MouseButton1 or i.UserInputType==Enum.UserInputType.Touch then
            pcall(function() if D.openTween then D.openTween:Cancel() D.openTween = nil end end)  -- v4.5
            resizing=true
            sizeStart=main.Size
            posStart=main.Position
            inputStart=i.Position
        end
    end))
    trackConn(UserInputService.InputChanged:Connect(function(i)
        if resizing and sizeStart and posStart and inputStart and (i.UserInputType==Enum.UserInputType.MouseMovement or i.UserInputType==Enum.UserInputType.Touch) then
            local d = i.Position - inputStart
            local w, h = sizeStart.X.Offset, sizeStart.Y.Offset
            local posX, posY = posStart.X.Offset, posStart.Y.Offset
            local newW, newH = w, h
            local newX, newY = posX, posY
            if cornerType == "BR" then
                newW = math.max(minW, w + d.X)
                newH = math.max(minH, h + d.Y)
            elseif cornerType == "BL" then
                newW = math.max(minW, w - d.X)
                newH = math.max(minH, h + d.Y)
                newX = posX + (w - newW)
            elseif cornerType == "TR" then
                newW = math.max(minW, w + d.X)
                newH = math.max(minH, h - d.Y)
                newY = posY + (h - newH)
            elseif cornerType == "TL" then
                newW = math.max(minW, w - d.X)
                newH = math.max(minH, h - d.Y)
                newX = posX + (w - newW)
                newY = posY + (h - newH)
            end
            main.Size = UDim2.new(sizeStart.X.Scale, newW, sizeStart.Y.Scale, newH)
            main.Position = UDim2.new(posStart.X.Scale, newX, posStart.Y.Scale, newY)
        end
    end))
    trackConn(UserInputService.InputEnded:Connect(function(i)
        if i.UserInputType==Enum.UserInputType.MouseButton1 or i.UserInputType==Enum.UserInputType.Touch then
            resizing=false
        end
    end))
end

local function CreateHandle(icon, pos)
    local btn = New("TextButton", {
        Size=UDim2.new(0,20,0,20),
        Position=pos,
        Text=icon,
        BackgroundColor3=C.BLUE,
        BackgroundTransparency=0.1,
        TextColor3=C.WHITE,
        Font=Enum.Font.GothamBold,
        TextSize=11,
        BorderSizePixel=0,
        ZIndex=100,
    }, main)
    Corner(btn, UDim.new(0,5))
    Stroke(btn, Color3.fromRGB(255,255,255), 1.2)
    return btn
end

-- inline: 4 bien handle chi duoc dung 1 lan -> bo bot 4 slot local (Luau gioi han 200)
SetupResizeHandle(CreateHandle("↖", UDim2.new(0, 2, 0, 2)), "TL")
SetupResizeHandle(CreateHandle("↗", UDim2.new(1, -22, 0, 2)), "TR")
SetupResizeHandle(CreateHandle("↙", UDim2.new(0, 2, 1, -22)), "BL")
SetupResizeHandle(CreateHandle("↘", UDim2.new(1, -22, 1, -22)), "BR")

local tabs = {}
local tabContent = {}

-- v4.5 (Delta-style): thanh trang chuyển sang TRÁI, rộng 56px, CHỈ ICON.
-- Tên trang hiện ở header (D.pageTitle) — đúng cách Delta làm, và cũng giúp thanh trang không
-- chật khi tên dài ("➕ Tạo Tính Năng", "🧩 GUI Ngoài (2)"...).
local tabBar = New("ScrollingFrame", {
    Size=UDim2.new(0,56,1,-30),
    Position=UDim2.new(0,0,0,30),
    BackgroundColor3=C.SURFACE,
    BackgroundTransparency=0.35,
    BorderSizePixel=0,
    ZIndex=3,
    ScrollBarThickness=3,
    CanvasSize=UDim2.new(0,0,0,0),
}, main)

-- v4.5: đường kẻ 1px tách thanh tab khỏi vùng nội dung. PHẢI neo vào `main` chứ không neo vào
-- tabBar: tabBar có UIListLayout, thêm con vào đó sẽ xô vị trí toàn bộ nút tab.
New("Frame", {
    Name="TabRailDivider", Size=UDim2.new(0,1,1,-30), Position=UDim2.new(0,56,0,30),
    BackgroundColor3=C.BORDER, BackgroundTransparency=0.3, BorderSizePixel=0, ZIndex=4,
}, main)

New("UIListLayout", {
    FillDirection=Enum.FillDirection.Vertical,
    SortOrder=Enum.SortOrder.LayoutOrder,
    Padding=UDim.new(0,4),
}, tabBar)

New("UIPadding", {PaddingTop=UDim.new(0,6), PaddingLeft=UDim.new(0,4)}, tabBar)

local contentArea = New("Frame", {
    Size=UDim2.new(1,-56,1,-54),     -- v4.5: nhường 56px cho thanh icon + 24px cho header trang
    Position=UDim2.new(0,56,0,54),
    BackgroundTransparency=1,
    BorderSizePixel=0,
    ZIndex=3,
    ClipsDescendants=true,
}, main)

-- v4.5 (Delta-style): HEADER TRANG cao 24px, giữa thanh tiêu đề và vùng nội dung.
-- Trái: icon + tên trang đang mở (vàng). Phải: cụm chip trạng thái 🧩/🕵/🪟.
-- Cất vào bảng D để KHÔNG tốn biến local cấp chunk (đang 188/200).
D.pageHeader = New("Frame", {
    Name="PageHeader", Size=UDim2.new(1,-56,0,24), Position=UDim2.new(0,56,0,30),
    BackgroundColor3=C.SURFACE, BackgroundTransparency=0.55, BorderSizePixel=0, ZIndex=3,
}, main)
D.pageTitle = New("TextLabel", {
    Name="PageTitle", Size=UDim2.new(1,-196,1,0), Position=UDim2.new(0,10,0,0),
    Text="💾 Code Đã Lưu", BackgroundTransparency=1, TextColor3=C.ACCENT,   -- v4.6.2: trang đầu tiên
    Font=Enum.Font.GothamBold, TextSize=11,
    TextXAlignment=Enum.TextXAlignment.Left, ZIndex=5,
}, D.pageHeader)
-- v4.5 (Delta-style): cụm 3 CÔNG TẮC GẠT 🧩 / 🕵 / 🪟 nằm bên phải header trang.
-- Bấm vào đây = bấm vào nút gốc ở tab ➕ Tạo Tính Năng (gọi cùng một hàm S.DoToggle*),
-- nên trạng thái, thông báo, lưu xuống đĩa đều y hệt — không có logic thứ hai để lệch nhau.
D.pageChips = New("Frame", {
    Name="PageChips", Size=UDim2.new(0,150,1,-6), Position=UDim2.new(1,-156,0,3),
    BackgroundTransparency=1, BorderSizePixel=0, ZIndex=5,
}, D.pageHeader)
New("UIListLayout", {
    FillDirection=Enum.FillDirection.Horizontal, Padding=UDim.new(0,8),
    SortOrder=Enum.SortOrder.LayoutOrder, VerticalAlignment=Enum.VerticalAlignment.Center,
}, D.pageChips)

D.hdrSwitches = {}
for i, sw in ipairs({
    {key="embed", icon="🧩", onColor=C.GREEN,  tip="Nhúng GUI của script vào tab tính năng"},
    {key="guess", icon="🕵", onColor=C.ORANGE, tip="Đoán GUI tạo trễ (dễ ăn nhầm GUI game)"},
    {key="park",  icon="🪟", onColor=C.GREEN,  tip="Đưa GUI của tab 💻 Code vào menu"},
}) do
    local btn = New("TextButton", {
        Size=UDim2.new(0,42,0,16), Text="", AutoButtonColor=false,
        BackgroundTransparency=1, BorderSizePixel=0, LayoutOrder=i, ZIndex=6,
    }, D.pageChips)
    btn:SetAttribute("BCSwKey", sw.key)
    local ic = New("TextLabel", {
        Size=UDim2.new(0,14,1,0), Position=UDim2.new(0,0,0,0), Text=sw.icon,
        BackgroundTransparency=1, TextColor3=C.MUTED, Font=Enum.Font.GothamBold,
        TextSize=10, TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7,
    }, btn)
    local track = New("Frame", {
        Name="BC_SwTrack", Size=UDim2.new(0,26,0,12), Position=UDim2.new(1,-26,0,2),
        BackgroundColor3=C.SURFACE3, BorderSizePixel=0, ZIndex=7,
    }, btn)
    Corner(track, UDim.new(1,0))
    local knob = New("Frame", {
        Name="BC_SwKnob", Size=UDim2.new(0,8,0,8), Position=UDim2.new(0,2,0,2),
        BackgroundColor3=C.GRAY, BorderSizePixel=0, ZIndex=8,
    }, track)
    Corner(knob, UDim.new(1,0))
    D.hdrSwitches[sw.key] = {btn=btn, icon=ic, track=track, knob=knob, onColor=sw.onColor}

    btn.Activated:Connect(function()
        local fn = (sw.key == "embed" and S.DoToggleEmbed)
                or (sw.key == "guess" and S.DoToggleGuess)
                or (sw.key == "park"  and S.DoTogglePark)
        if type(fn) == "function" then
            pcall(fn)   -- hàm gốc đã tự đổi nhãn nút, ghi đĩa và báo trạng thái
        end
        D.SyncPageChips()
        pcall(function() if S.SyncEmbedToggles then S.SyncEmbedToggles() end end)
    end)
    -- hover: mượn dòng tiêu đề trang để giải thích công tắc (không tốn thêm chỗ)
    btn.MouseEnter:Connect(function()
        D.pageTitle.Text = sw.icon .. "  " .. sw.tip
        D.pageTitle.TextColor3 = C.DARK
        D.pageTitle.TextTransparency = 0.25
    end)
    btn.MouseLeave:Connect(function()
        -- rời chuột: trả tiêu đề về đúng chỗ cũ. Nếu chuột đang lơ lửng trên một tab
        -- (D.hoverName) thì trả về TÊN TAB đó (mờ 40% như hover tab), còn không thì
        -- trả về tên trang đang mở. Không làm vậy sẽ ghi đè mất tên tab người dùng đang xem.
        D.pageTitle.TextColor3 = C.ACCENT
        local back = D.hoverName or D.activeName
        if back then D.pageTitle.Text = back end
        D.pageTitle.TextTransparency = D.hoverName and 0.4 or 0
    end)
end
New("Frame", {   -- kẻ mảnh dưới header
    Name="PageHeaderRule", Size=UDim2.new(1,-56,0,1), Position=UDim2.new(0,56,0,53),
    BackgroundColor3=C.BORDER, BackgroundTransparency=0.35, BorderSizePixel=0, ZIndex=4,
}, main)

-- Đồng bộ 3 công tắc trên header theo trạng thái thật trong S.
-- (Hàm chỉ chạy lúc runtime nên thứ tự khai báo không quan trọng.)
function D.SyncPageChips()
    pcall(function()
        if not D.hdrSwitches then return end
        local state = {
            embed = (S.embedEnabled == true),
            guess = (S.embedGuessNew == true),
            park  = (S.parkCodeGuis ~= false),
        }
        for k, s in pairs(D.hdrSwitches) do
            local on = (state[k] == true)
            s.track.BackgroundColor3 = on and (s.onColor or C.GREEN) or C.SURFACE3
            s.knob.BackgroundColor3  = on and C.WHITE or C.GRAY
            s.knob.Position = on and UDim2.new(1,-10,0,2) or UDim2.new(0,2,0,2)
            s.icon.TextColor3 = on and C.DARK or C.GRAY
        end
    end)
end

local activeTab = nil

local function SwitchTab(index)
    ReleaseHubFocus()   -- v4.4b: đổi tab mà để TextBox còn focus là game chặn input (không đi/không bắn)
    for _, t in ipairs(tabContent) do t.Visible = false end
    -- v4.5: tab CHƯA mở = pill trong suốt + chữ mờ; tab ĐANG mở = pill nổi + chữ vàng + vạch
    -- accent dọc bên trái. Logic cũ giữ nguyên: chỉ đổi Visible của tabContent và gán activeTab.
    for _, b in ipairs(tabs) do
        b.BackgroundColor3 = C.SURFACE2
        b.BackgroundTransparency = 1
        b.TextColor3 = C.MUTED
        local bar = b:FindFirstChild("BC_Bar")
        if bar then bar.Visible = false end
    end
    if tabContent[index] and tabs[index] then
        tabContent[index].Visible = true
        local b = tabs[index]
        b.BackgroundColor3 = C.SURFACE2
        b.BackgroundTransparency = 0.1
        b.TextColor3 = C.ACCENT
        -- vạch accent là CON của nút tab nên tự trượt theo nút, và KHÔNG nằm trong UIListLayout
        -- của tabBar (neo vào tabBar là bị layout xếp chỗ -> xô toàn bộ nút tab)
        local bar = b:FindFirstChild("BC_Bar")
        if not bar then
            bar = New("Frame", {
                Name = "BC_Bar", Size = UDim2.new(0, 3, 1, -12), Position = UDim2.new(0, 2, 0, 6),
                BackgroundColor3 = C.ACCENT, BorderSizePixel = 0, ZIndex = 6,
            }, b)
            Corner(bar, UDim.new(1, 0))
        end
        bar.Visible = true
        activeTab = tabContent[index]
        -- v4.5 (Delta): header hiện icon + tên trang đang mở (thanh trang giờ chỉ có icon)
        pcall(function()
            if D.pageTitle then
                local ic = b:GetAttribute("BCTabIcon")
                local nm = b:GetAttribute("BCTabName")
                D.activeName = (ic and (ic .. "  ") or "") .. tostring(nm or ("Trang " .. index))
                if not D.hoverName then
                    D.pageTitle.Text = D.activeName
                    D.pageTitle.TextTransparency = 0
                end
            end
        end)
    end
    BcFit()   -- v4.4c: tab vừa hiện -> đo lại để GUI nằm vừa đúng ô của tab
end

-- v4.6.2: "trang đầu tiên" = trang có LayoutOrder NHỎ NHẤT trên rail, KHÔNG phải tabs[1].
-- Lý do: mảng `tabs` xếp theo THỨ TỰ TẠO (💻 Code được tạo trước tiên), còn thứ tự người dùng
-- NHÌN THẤY trên rail do LayoutOrder quyết định. Từ v4.6.2 trang đầu là 💾 Code Đã Lưu, nên mọi
-- chỗ trước đây gọi SwitchTab(1) — lúc khởi động, khi bấm ✕ đóng tab tính năng, khi xóa tab —
-- đều phải đi qua hàm này; nếu không menu sẽ mở trang 💻 Code trong khi icon được tô vàng lại là
-- icon thứ hai trên rail (lệch nhau, tưởng như bấm không ăn).
local function OpenFirstPage()
    local idx, best = 1, nil
    for i, b in ipairs(tabs) do
        local o = b and b.LayoutOrder
        if type(o) == "number" and (best == nil or o < best) then best = o; idx = i end
    end
    SwitchTab(idx)
end

local function AddTab(name, icon, order, customContent)
    local btn = New("TextButton", {
        Size=UDim2.new(1,-8,0,38),        -- v4.5 Delta: ô icon 48x38
        Text=icon,                        -- CHỈ icon; tên trang hiện ở header
        BackgroundColor3=C.SURFACE2,      -- pill ghost (SwitchTab tô màu khi trang mở)
        BackgroundTransparency=1,
        TextColor3=C.MUTED,
        Font=Enum.Font.GothamBold,
        TextSize=16,
        BorderSizePixel=0,
        LayoutOrder=order,
        TextXAlignment=Enum.TextXAlignment.Center,
        ZIndex=4,
    }, tabBar)
    Corner(btn, UDim.new(0,10))           -- v4.5 Delta: bo 10px cho ô icon
    pcall(function()
        btn:SetAttribute("BCTabName", name)   -- header + hover đọc tên trang từ đây
        btn:SetAttribute("BCTabIcon", icon)
    end)
    -- v4.5: rê chuột vào tab chưa mở thì pill hiện nhẹ. Tab ĐANG mở (chữ vàng) thì không đụng,
    -- để SwitchTab toàn quyền quyết định màu -> không đánh nhau giữa tween và trạng thái tab.
    pcall(function()
        trackConn(btn.MouseEnter:Connect(function()
            if btn.BackgroundTransparency > 0.5 then Tween(btn, {BackgroundTransparency = 0.62}, 0.16) end
            pcall(function()   -- v4.5 Delta: rê vào icon nào thì header hiện TÊN trang đó (mờ nhẹ)
                if D.pageTitle then
                    D.hoverName = btn:GetAttribute("BCTabName")
                    local ic = btn:GetAttribute("BCTabIcon")
                    D.pageTitle.Text = (ic and (ic .. "  ") or "") .. tostring(D.hoverName or "")
                    D.pageTitle.TextTransparency = 0.4
                end
            end)
        end))
        trackConn(btn.MouseLeave:Connect(function()
            if btn.TextColor3 ~= C.ACCENT then Tween(btn, {BackgroundTransparency = 1}, 0.2) end
            pcall(function()   -- rời chuột: header trả về tên trang ĐANG MỞ
                D.hoverName = nil
                if D.pageTitle and D.activeName then
                    D.pageTitle.Text = D.activeName
                    D.pageTitle.TextTransparency = 0
                end
            end)
        end))
    end)

    local sf
    if customContent then
        sf = customContent
        sf.Parent = contentArea
        sf.Visible = false
    else
        sf = New("ScrollingFrame", {
            Size=UDim2.new(1,0,1,0),
            BackgroundTransparency=1,
            BorderSizePixel=0,
            ScrollBarThickness=5,
            ScrollBarImageColor3=Color3.fromRGB(70, 77, 95),
            ClipsDescendants=true,
            CanvasSize=UDim2.new(0,0,0,0),
            Visible=false,
            Active=true,
            Selectable=false,
            ScrollingDirection=Enum.ScrollingDirection.Y,
            ZIndex=4,
        }, contentArea)
    end

    -- KHONG bat chet index: khi mot tab bi xoa, vi tri trong `tabs`/`tabContent` dich lai
    -- va index cu se mo SAI tab (hoac khong mo gi ca -> UI trang). Tra cuu dong theo nut.
    btn.Activated:Connect(function()
        for i, b in ipairs(tabs) do
            if b == btn then SwitchTab(i); break end
        end
    end)

    table.insert(tabs, btn)
    table.insert(tabContent, sf)
    tabBar.CanvasSize = UDim2.new(0, 0, 0, #tabs * 44 + 10)
    return sf, btn
end

-- v4.6.2: thứ tự trang theo yêu cầu — 1 💾 Code Đã Lưu · 2 💻 Code · 3 📚 Script Hub ·
-- 4 🛠 Hỗ Trợ · 5 🤖 AI AI · 6 ➕ Tạo Tính Năng · 7+ tab tính năng của bạn · 99 🧩 GUI Ngoài.
-- (Thứ tự TẠO vẫn giữ nguyên để không đụng scope biến; thứ tự HIỂN THỊ do LayoutOrder.)
local codeTab      = AddTab("Code", "💻", 2)
local savedCodeTab = AddTab("Code Đã Lưu", "💾", 1)

OpenFirstPage()   -- v4.6.2: mở trang ĐẦU TIÊN theo thứ tự rail (💾 Code Đã Lưu)

-- Bang trang thai. Chua ca cac bien keo/tha menu: Luau gioi han 200 bien local moi function
-- (loi "Out of local registers ... exceeded limit 200"), main chunk cua script nay da gan
-- nguong do nen moi bien dem duoc deu phai nam trong bang thay vi la local rieng.
local S = {
    dragMenu     = false,
    dragging     = false,
    dragStart    = nil,
    startPos     = nil,
    togDragging  = false,
    togDragStart = nil,
    togStartPos  = nil,
    togMoved     = false,
    -- v4.4b: trạng thái của cơ chế nhúng GUI (đặt trong bảng để KHÔNG tốn slot local —
    -- main chunk đang ở ~184/200, thêm local tự do là lỗi biên dịch "too many local variables")
    embedEnabled = true,     -- tab 5 có nút 🧩 để tắt hoàn toàn việc nhúng
    embedGuessNew = false,   -- 🕵 nhận cả ScreenGui "lạ" mới xuất hiện (mạnh hơn nhưng dễ ăn GUI game)
    -- v4.4i: 🪟 có đưa GUI của script chạy ở tab 💻 Code / 💾 Code Đã Lưu vào tab "🧩 GUI Ngoài"
    -- hay không. BẬT = đưa vào menu (tiện cho script tính năng). TẮT = để GUI ngoài màn hình
    -- game đúng như bản trước v4.4h. Tab ➕ Tính Năng KHÔNG phụ thuộc công tắc này.
    -- 3 nút ⚡ Script Nhanh (Dex/IY/SimpleSpy) thì LUÔN ở ngoài màn hình, không cần biết công tắc.
    parkCodeGuis = true,
    embeds       = {},       -- registry: {host, gui, recs={{child,origParent,origPos,origSize}}, conns={}}
}

-- v4.4b: vô hại hoá các wrapper "AUTO-GENERATED SIZE WRAPPER" đời cũ (v4.4a) đã bị lưu lại
-- trong file JSON. Wrapper đó gọi _ForceStretch(g) lên MỌI ScreenGui trong CoreGui+PlayerGui
-- -> đè layout của game. Chỉ cần cắt đúng lời gọi đó là cả khối trở thành no-op hợp lệ,
-- code còn lại của người dùng không bị đụng tới.
S.WRAP_MARK_OLD = "-- ===== AUTO-GENERATED SIZE WRAPPER"
S.WRAP_MARK_NEW = "-- ===== AUTO-GENERATED FIT WRAPPER"
function S.SanitizeCode(c)
    if type(c) ~= "string" then return c end
    if not c:find(S.WRAP_MARK_OLD, 1, true) then return c end
    local out = (c:gsub(
        "pcall%s*%(%s*function%s*%(%)%s*_ForceStretch%s*%(%s*g%s*%)%s*end%s*%)",
        ""))
    return out
end

local scripts = {}
local waypoints = {}          -- khai báo sớm để khối lưu trữ bên dưới dùng được
local featureTabs = {}        -- nt: khai báo sớm để Store.serialize() và nhãn trạng thái dùng được
local featureTabIndex = 7   -- v4.6.2: 1=Code Đã Lưu 2=Code 3=Script Hub 4=Hỗ Trợ 5=AI AI 6=Tạo Tính Năng; tab tính năng của người dùng từ 7 trở đi
local totalRuns, cancelled = 0, false
local curThread, curIndicator = nil, nil
local runActive = false       -- cờ trạng thái chạy (không dựa vào curThread nữa)

-- ==================== LƯU TRỮ DỮ LIỆU (SCRIPT ĐÃ LƯU + WAYPOINT) ====================
-- v4.3 chỉ ghi API key xuống đĩa, còn scripts/waypoints chỉ nằm trong RAM -> thoát game là mất sạch.
-- Khối này ghi toàn bộ ra 1 file JSON trong workspace của executor (sống qua cả lần rejoin
-- và cả khi chạy lại script).
--
-- ĐÓNG GÓI VÀO BẢNG `Store`: main chunk đã dùng gần hết 200 slot local cho phép.
-- Nếu khai báo ~20 biến local riêng ở cấp cao nhất, script sẽ lỗi biên dịch
-- "too many local variables" và KHÔNG CHẠY ĐƯỢC. Dùng field của bảng thì tốn đúng 1 slot.
local Store = {}

Store.SAVE_FILE      = "banana_cat_saved.json"
Store.SAVE_VERSION   = 3
Store.mode           = "none"   -- "file" | "memory" | "empty" | "none"
Store.lastError      = nil
Store.lastSavedAt    = nil
Store.saveCount      = 0
Store.loadedScripts  = 0
Store.loadedWp       = 0
Store.loadedFeatures = {}     -- dữ liệu thô đọc từ đĩa; TAB5 sẽ dựng thành tab thật
Store.restoreFeatures = nil   -- TAB5 gán hàm dựng lại tab tính năng vào đây
Store.restoreWaypoints = nil  -- TAB3 gán RebuildWaypoints vào đây (TAB2 cần mà chưa tồn tại)
Store.statusLbl      = nil      -- tab "Code Đã Lưu" gán nhãn trạng thái vào đây
Store.reloadBtn      = nil
Store._scheduled     = false
Store.refreshStatus  = nil      -- tab "Code Đã Lưu" gán hàm cập nhật nhãn vào đây

function Store.canWrite()
    return type(writefile) == "function" and type(readfile) == "function"
end

function Store.isFinite(n)
    return type(n) == "number" and n == n and n ~= math.huge and n ~= -math.huge
end

function Store.write(data)
    local okEnc, json = pcall(function() return HttpService:JSONEncode(data) end)
    if not okEnc then
        Store.mode = "memory"
        Store.lastError = "Không mã hoá được JSON: " .. tostring(json)
        _G.BananaCatHub_SavedData = data
        return false
    end

    if not Store.canWrite() then
        Store.mode = "memory"
        Store.lastError = "Executor không có writefile — chỉ giữ được trong phiên chơi này"
        _G.BananaCatHub_SavedData = data
        return false
    end

    local okW, errW = pcall(writefile, Store.SAVE_FILE, json)
    if not okW then
        Store.mode = "memory"
        Store.lastError = "Ghi file thất bại: " .. tostring(errW)
        _G.BananaCatHub_SavedData = data
        return false
    end

    Store.mode = "file"
    Store.lastError = nil
    Store.saveCount = Store.saveCount + 1
    pcall(function() Store.lastSavedAt = os.date("%H:%M:%S") end)
    _G.BananaCatHub_SavedData = data
    return true
end

function Store.read()
    -- 1) đọc từ file trong workspace executor
    if Store.canWrite() then
        local hasFile = true
        if type(isfile) == "function" then
            local okI, r = pcall(isfile, Store.SAVE_FILE)
            hasFile = (okI and r == true)
        end
        if hasFile then
            local okR, txt = pcall(readfile, Store.SAVE_FILE)
            if okR and type(txt) == "string" and #txt > 0 then
                local okD, data = pcall(function() return HttpService:JSONDecode(txt) end)
                if okD and type(data) == "table" then
                    Store.mode = "file"
                    Store.lastError = nil
                    return data
                end
                Store.lastError = "File lưu bị hỏng (JSON không đọc được) — đã bỏ qua"
            end
        end
    end
    -- 2) fallback: dữ liệu _G của cùng phiên chơi (giữ được khi chạy lại script)
    --    NGOẠI LỆ (v4.4b): nếu file TỒN TẠI mà giải mã lỗi thì KHÔNG fallback. Trước đây fallback
    --    khiến Store.save() ghi dữ liệu cũ đè lên file còn có thể cứu bằng tay -> MẤT DỮ LIỆU.
    if Store.lastError and Store.lastError:find("bị hỏng", 1, true) then
        Store.mode = "none"
        return nil
    end
    if type(_G.BananaCatHub_SavedData) == "table" then
        Store.mode = "memory"
        return _G.BananaCatHub_SavedData
    end
    Store.mode = "none"
    return nil
end

function Store.serialize()
    local sOut = {}
    for _, s in ipairs(scripts) do
        table.insert(sOut, {
            name     = tostring(s.name or ""),
            code     = tostring(s.code or ""),
            expanded = (s.expanded == true),
        })
    end
    local wOut = {}
    for _, w in ipairs(waypoints) do
        local pos = w and w.pos
        if pos and Store.isFinite(pos.X) and Store.isFinite(pos.Y) and Store.isFinite(pos.Z) then
            table.insert(wOut, {name = tostring(w.name or ""), x = pos.X, y = pos.Y, z = pos.Z})
        end
    end
    local fOut = {}
    for _, f in ipairs(featureTabs) do
        table.insert(fOut, {
            name = tostring(f.name or ""),
            icon = tostring(f.icon or "⚙️"),
            code = tostring(f.code or ""),
        })
    end
    -- v4.4g: lưu cả 2 công tắc nhúng. Trước đây chúng KHÔNG được lưu -> thoát game vào lại
    -- 🧩/🕵 nhảy về mặc định (một phần lý do "vào lại game bấm ▶ mà GUI không vào menu").
    return {
        version   = Store.SAVE_VERSION,
        scripts   = sOut,
        waypoints = wOut,
        features  = fOut,
        settings  = {
            embedEnabled  = (S.embedEnabled == true),
            embedGuessNew = (S.embedGuessNew == true),
            parkCodeGuis  = (S.parkCodeGuis ~= false),   -- v4.4i
            -- v4.5: danh sách ⭐ yêu thích ở trang 📚 Script Hub (lưu dạng MẢNG cho dễ đọc/ghi JSON)
            hubFavs = (function()
                local out = {}
                if type(S.hubFavs) == "table" then
                    for nm, v in pairs(S.hubFavs) do if v then out[#out + 1] = tostring(nm) end end
                end
                return out
            end)(),
        },
    }
end

-- Ghi ngay (đồng bộ). Trả về true/false.
function Store.save()
    local ok = Store.write(Store.serialize())
    if Store.refreshStatus then pcall(Store.refreshStatus) end
    return ok
end

-- Ghi có debounce: gộp nhiều thay đổi liên tiếp (vd bấm expand liên tục) thành 1 lần ghi.
function Store.saveSoon()
    if Store._scheduled then return end
    Store._scheduled = true
    task.delay(0.3, function()
        Store._scheduled = false
        Store.save()
    end)
end

-- Nạp dữ liệu đã lưu vào `scripts` và `waypoints`.
-- PHẢI gọi trước RebuildScripts() và RebuildWaypoints() để danh sách hiện ra ngay.
function Store.load()
    local data = Store.read()
    if type(data) ~= "table" then
        Store.mode = Store.canWrite() and "empty" or "none"
        Store.loadedScripts, Store.loadedWp = 0, 0
        Store.loadedFeatures = {}
        return
    end

    -- v4.4b: file đời mới hơn script này -> cảnh báo, không im lặng nạp thiếu
    local fileVer = tonumber(data.version) or 1
    if fileVer > Store.SAVE_VERSION then
        Store.lastError = string.format(
            "File lưu là version %d, script này chỉ hiểu tới v%d — một số mục có thể không nạp",
            fileVer, Store.SAVE_VERSION)
    end

    -- v4.4g: nạp lại 2 công tắc nhúng (file cũ chưa có mục settings thì giữ mặc định)
    if type(data.settings) == "table" then
        S.embedEnabled  = (data.settings.embedEnabled ~= false)
        S.embedGuessNew = (data.settings.embedGuessNew == true)
        -- v4.4i: file cũ chưa có khóa này -> giữ mặc định BẬT
        S.parkCodeGuis  = (data.settings.parkCodeGuis ~= false)
        -- v4.5: nạp lại ⭐ yêu thích của trang 📚 Script Hub (file cũ chưa có thì để trống)
        if type(data.settings.hubFavs) == "table" then
            S.hubFavs = {}
            for _, nm in ipairs(data.settings.hubFavs) do S.hubFavs[tostring(nm)] = true end
        end
    end

    local sOut = {}
    if type(data.scripts) == "table" then
        for _, s in ipairs(data.scripts) do
            if type(s) == "table" and type(s.code) == "string" and #s.code > 0 then
                table.insert(sOut, {
                    name     = (type(s.name) == "string" and #s.name > 0) and s.name or ("Script " .. (#sOut + 1)),
                    code     = S.SanitizeCode(s.code),
                    expanded = (s.expanded == true),
                })
            end
        end
    end

    local wOut = {}
    if type(data.waypoints) == "table" then
        for _, w in ipairs(data.waypoints) do
            if type(w) == "table" and Store.isFinite(w.x) and Store.isFinite(w.y) and Store.isFinite(w.z) then
                table.insert(wOut, {
                    name = (type(w.name) == "string" and #w.name > 0) and w.name or ("WP " .. (#wOut + 1)),
                    pos  = Vector3.new(w.x, w.y, w.z),
                })
            end
        end
    end

    -- Tab tính năng: chỉ nạp DỮ LIỆU THÔ ở đây. Không dựng tab được vì hàm
    -- CreateFeatureTab() mãi tới TAB5 mới tồn tại -> Store.restoreFeatures() làm việc đó.
    local fOut = {}
    if type(data.features) == "table" then
        for _, f in ipairs(data.features) do
            if type(f) == "table" and type(f.code) == "string" and #f.code > 0 then
                table.insert(fOut, {
                    name = (type(f.name) == "string" and #f.name > 0) and f.name or ("Tính Năng " .. (#fOut + 1)),
                    icon = (type(f.icon) == "string" and #f.icon > 0) and f.icon or "⚙️",
                    code = S.SanitizeCode(f.code),
                })
            end
        end
    end

    scripts   = sOut
    waypoints = wOut
    Store.loadedFeatures = fOut
    Store.loadedScripts, Store.loadedWp = #sOut, #wOut
end

Store.load()

local function ExecOnce(code, name)
    if #name>0 then print("👤 Chạy bởi:", name) end
    code = S.SanitizeCode(code)   -- v4.4b: cắt wrapper "tự dãn kích thước" độc hại của bản cũ
    return pcall(function()
        local fn, err = loadstring(code)
        if not fn then error(err) end
        fn()
    end)
end

local function Cancel()
    -- v4.4h: dừng chạy thì cũng phải nhả hook Instance.new + watcher ChildAdded của lần chạy đó
    pcall(function() if S.AbortRunCapture then S.AbortRunCapture() end end)
    cancelled=true
    runActive=false
    if curThread then pcall(task.cancel, curThread); curThread=nil end
    if curIndicator then curIndicator.BackgroundColor3=C.BLUE; curIndicator=nil end
end

local function RunCode(code, name, ind, times, delay, noPark)
    Cancel()
    ReleaseHubFocus()   -- v4.4b: nhả focus TextBox, nếu không game chặn hết input (không đi/không bắn)
    if #code==0 then return false, "⚠️ Vui lòng nhập code!" end
    cancelled=false
    if ind then curIndicator=ind; ind.BackgroundColor3=C.RED end
    local okC, failC = 0, 0
    -- LƯU Ý: task.spawn() chạy hàm NGAY LẬP TỨC tới chỗ yield đầu tiên rồi mới return thread.
    -- Nên KHÔNG được dùng "curThread == nil" làm dấu hiệu kết thúc: nếu code không yield thì
    -- "curThread=nil" bên trong chạy trước, rồi phép gán bên ngoài ghi đè bằng thread đã chết
    -- -> vòng while bên ngoài quay vô hạn. Vì vậy dùng cờ runActive riêng.
    curThread=task.spawn(function()
        runActive=true
        -- v4.4h: script chạy ở tab 💻 Code / 💾 Code Đã Lưu cũng đưa được GUI vào menu
        -- (trước đây CHỈ tab ➕ Tính Năng mới nhúng GUI). Tắt 🧩/🪟 là trở về như cũ.
        --
        -- v4.4i: NHƯNG 3 nút ⚡ Script Nhanh ở tab 🛠 Hỗ Trợ (Dex Explorer / Infinite Yield /
        -- SimpleSpy) là CÔNG CỤ CỬA SỔ RIÊNG — GUI của chúng PHẢI nằm ngoài màn hình game thì
        -- mới kéo/thu nhỏ/dùng được. v4.4h lỡ "đậu" chúng vào menu nên người dùng thấy
        -- "bấm chạy mà không hiện ra màn hình chính". Nay nhóm này KHÔNG BAO GIỜ bị đưa vào menu:
        --   • nút ở tab 🛠 truyền noPark=true
        --   • dán loadstring của chúng vào tab 💻 Code / lưu ở 💾 Code Đã Lưu cũng tự nhận ra
        --     (S.ShouldSkipPark soi URL/tên: dex.lua, infiniteyield, simplespy...)
        local skipPark, skipWhy = (noPark == true), (noPark == true and "nút script nhanh" or nil)
        if not skipPark and S.ShouldSkipPark then
            local s2, w2 = S.ShouldSkipPark(code, name)
            if s2 then skipPark, skipWhy = true, w2 end
        end
        local cap = nil
        if skipPark then
            S.lastParkNote = "🪟 GUI để NGOÀI màn hình game (công cụ cửa sổ riêng) — không đưa vào menu"
            pcall(function()
                print("[BananaCatHub] 🛠 '" .. tostring(name) .. "': GUI ở NGOÀI màn hình game như cũ"
                    .. " (lý do không đưa vào menu: " .. tostring(skipWhy) .. ")")
            end)
        else
            S.lastParkNote = nil
            cap = S.BeginRunCapture()
        end
        for i=1,times do
            if cancelled then break end
            if i>1 and delay>0 then
                local e=0
                while e<delay do
                    if cancelled then break end
                    task.wait(0.1); e+=0.1
                end
                if cancelled then break end
            end
            local ok, err = ExecOnce(code, name)
            if ok then okC+=1 else failC+=1; warn("❌ Lần",i,err) end
            -- GUI của script sinh ra ở lần chạy ĐẦU TIÊN. Chụp xong là NHẢ hook ngay: không giữ
            -- hook suốt cả nghìn lần lặp (vừa nặng, vừa dễ ăn nhầm UI mà game tạo ra về sau).
            if cap then
                S.EndRunCapture(cap, (#name>0 and name or "Script"))
                cap = nil
            end
        end
        -- bị ⏹ Dừng / hủy ngay trong lần 1 cũng phải nhả hook + watcher, không thì Instance.new
        -- của cả game bị giữ mãi
        if cap then S.EndRunCapture(cap, (#name>0 and name or "Script")) cap = nil end
        totalRuns+=okC+failC
        if ind then ind.BackgroundColor3=C.GREEN; if curIndicator==ind then curIndicator=nil end end
        runActive=false
        curThread=nil
    end)
    return true, nil
end

local function Label(parent, text, y)
    -- v4.5: nhãn toàn ký tự "━" là đường phân cách -> tô màu viền tối cho tinh tế (trước là chữ xám)
    local isRule = (tostring(text):find("━") ~= nil)
    return New("TextLabel", {
        Size=UDim2.new(1,-16,0,14), Position=UDim2.new(0,8,0,y or 0),
        Text=text, BackgroundTransparency=1,
        TextColor3=(isRule and C.BORDER or C.MUTED),   -- v4.5: chữ phụ / đường kẻ trên nền tối
        Font=Enum.Font.GothamMedium, TextSize=10, TextXAlignment=Enum.TextXAlignment.Left, ZIndex=6,
    }, parent)
end

-- v4.5: nút kiểu mới — nền đặc (không còn trong suốt 20%), bo 8px, viền sáng hơn nền một bậc,
-- đổ khối nhẹ bằng UIGradient, chữ TỰ chọn đậm/sáng theo nền, có phản hồi hover + nhấn.
-- GIỮ NGUYÊN chữ ký hàm (parent, text, x, y, w, h, color) và đối tượng trả về -> mọi nơi gọi
-- Button(...) không phải sửa, code gán btn.Text / btn.BackgroundColor3 vẫn chạy như cũ.
local function Button(parent, text, x, y, w, h, color)
    local base = color or C.SURFACE3
    local btn = New("TextButton", {
        Size=UDim2.new(0,w or 100,0,h or 24), Position=UDim2.new(0,x or 8,0,y or 0),
        Text=text, BackgroundColor3=base, BackgroundTransparency=0.08,
        TextColor3=D.BestText(base), Font=Enum.Font.GothamBold, TextSize=10, BorderSizePixel=0, ZIndex=6,
    }, parent)
    Corner(btn, UDim.new(0,8))
    Stroke(btn, D.Edge(base), 1)
    D.Shade(btn, Color3.fromRGB(255,255,255), Color3.fromRGB(206,209,220), 90)
    D.Tactile(btn, 0.08)
    return btn
end

-- v4.6 (mượt hơn): gộp nhiều phím gõ liên tiếp thành MỘT lần dựng lại danh sách.
-- Trước đây ô tìm kiếm rebuild sau MỖI phím — danh sách dài thì gõ nhanh sẽ giật/rớt khung hình.
-- Kết quả cuối cùng GIỐNG HỆT vì hàm vẫn đọc nội dung ô nhập tại thời điểm nó chạy.
--   key  = tên ổ debounce (mỗi ô tìm kiếm một key)
--   secs = chờ bao lâu sau phím cuối cùng (mặc định 0.18s)
--   fn   = việc cần làm
function S.Debounce(key, secs, fn)
    S._dbt = S._dbt or {}
    local n = (S._dbt[key] or 0) + 1
    S._dbt[key] = n
    task.delay(secs or 0.18, function()
        if S._dbt[key] ~= n then return end   -- đã có phím mới hơn -> lượt này bỏ qua
        S._dbt[key] = nil
        pcall(fn)
    end)
end

-- ==================== TAB 1: CODE ====================
local y = 8
Label(codeTab, "💻 Nhập Code Tùy Chỉnh", y)
y = y + 14
Label(codeTab, "👤 Tên Script", y)
y = y + 14

local nameIn = New("TextBox", {
    Size=UDim2.new(1,-16,0,26), Position=UDim2.new(0,8,0,y), Text="",
    PlaceholderText="Nhập tên script...", PlaceholderColor3=Color3.fromRGB(122, 130, 148),
    BackgroundColor3=Color3.fromRGB(26, 29, 38), BackgroundTransparency=0, TextColor3=Color3.fromRGB(233, 237, 245),
    Font=Enum.Font.GothamMedium, TextSize=12, BorderSizePixel=0, ClearTextOnFocus=false,
    Active=true, Selectable=true, ZIndex=10, TextXAlignment=Enum.TextXAlignment.Left,
}, codeTab)
Corner(nameIn, UDim.new(0,5))
Stroke(nameIn, Color3.fromRGB(100,120,200), 1.5)
New("UIPadding", {PaddingLeft=UDim.new(0,6)}, nameIn)

y = y + 32
Label(codeTab, "💻 Code (Lua)", y)
y = y + 14

local codeIn = New("TextBox", {
    Size=UDim2.new(1,-16,0,80), Position=UDim2.new(0,8,0,y), Text="",
    PlaceholderText="-- Nhập code Lua tại đây...", PlaceholderColor3=Color3.fromRGB(122, 130, 148),
    BackgroundColor3=Color3.fromRGB(28, 31, 41), BackgroundTransparency=0, TextColor3=Color3.fromRGB(233, 237, 245),
    Font=Enum.Font.Code, TextSize=11, BorderSizePixel=0, ClearTextOnFocus=false,
    MultiLine=true, TextWrapped=true, TextXAlignment=Enum.TextXAlignment.Left, TextYAlignment=Enum.TextYAlignment.Top,
    Active=true, Selectable=true, ZIndex=10,
}, codeTab)
Corner(codeIn, UDim.new(0,5))
Stroke(codeIn, Color3.fromRGB(100,120,200), 1.5)
New("UIPadding", {PaddingLeft=UDim.new(0,6), PaddingTop=UDim.new(0,4)}, codeIn)

y = y + 86
Label(codeTab, "🔁 Cài đặt lặp", y)
y = y + 14
Label(codeTab, "Số lần lặp:", y)

local repIn = New("TextBox", {
    Size=UDim2.new(0,55,0,24), Position=UDim2.new(0,8,0,y+12), Text="1",
    PlaceholderColor3=Color3.fromRGB(122, 130, 148), BackgroundColor3=Color3.fromRGB(26, 29, 38), BackgroundTransparency=0,
    TextColor3=Color3.fromRGB(233, 237, 245), Font=Enum.Font.GothamMedium, TextSize=12, BorderSizePixel=0,
    ClearTextOnFocus=false, Active=true, Selectable=true, ZIndex=10,
}, codeTab)
Corner(repIn, UDim.new(0,5))
Stroke(repIn, Color3.fromRGB(180,180,200), 1.2)

Label(codeTab, "Thời gian chờ:", y+36)

local delIn = New("TextBox", {
    Size=UDim2.new(0,55,0,24), Position=UDim2.new(0,8,0,y+50), Text="0",
    PlaceholderColor3=Color3.fromRGB(122, 130, 148), BackgroundColor3=Color3.fromRGB(26, 29, 38), BackgroundTransparency=0,
    TextColor3=Color3.fromRGB(233, 237, 245), Font=Enum.Font.GothamMedium, TextSize=12, BorderSizePixel=0,
    ClearTextOnFocus=false, Active=true, Selectable=true, ZIndex=10,
}, codeTab)
Corner(delIn, UDim.new(0,5))
Stroke(delIn, Color3.fromRGB(180,180,200), 1.2)

local unitBtn = New("TextButton", {
    Size=UDim2.new(0,55,0,24), Position=UDim2.new(0,75,0,y+50), Text="Giây ▾",
    BackgroundColor3=Color3.fromRGB(26, 29, 38), BackgroundTransparency=0, TextColor3=C.DARK,
    Font=Enum.Font.GothamBold, TextSize=9, BorderSizePixel=0, ZIndex=10,
}, codeTab)
Corner(unitBtn,UDim.new(0,4)); Stroke(unitBtn)

local ddFrame = New("Frame", {
    Size=UDim2.new(0,55,0,48), Position=UDim2.new(0,75,0,y+74),
    BackgroundColor3=Color3.fromRGB(26, 29, 38), BackgroundTransparency=0, BorderSizePixel=0, Visible=false, ZIndex=15,
}, codeTab)
Corner(ddFrame,UDim.new(0,4)); Stroke(ddFrame)

local secOpt = New("TextButton", {
    Size=UDim2.new(1,0,0,24), Text="Giây", BackgroundColor3=Color3.fromRGB(28, 31, 41),
    BackgroundTransparency=0, TextColor3=C.DARK, Font=Enum.Font.GothamBold, TextSize=9, BorderSizePixel=0, ZIndex=16,
}, ddFrame)

local minOpt = New("TextButton", {
    Size=UDim2.new(1,0,0,24), Position=UDim2.new(0,0,0,24), Text="Phút",
    BackgroundColor3=Color3.fromRGB(28, 31, 41), BackgroundTransparency=0, TextColor3=C.DARK,
    Font=Enum.Font.GothamBold, TextSize=9, BorderSizePixel=0, ZIndex=16,
}, ddFrame)

unitBtn.Activated:Connect(function() ddFrame.Visible=not ddFrame.Visible end)
secOpt.Activated:Connect(function() unitBtn.Text="Giây ▾"; ddFrame.Visible=false end)
minOpt.Activated:Connect(function() unitBtn.Text="Phút ▾"; ddFrame.Visible=false end)

trackConn(UserInputService.InputBegan:Connect(function(i,gp)
    if gp then return end
    if i.UserInputType==Enum.UserInputType.MouseButton1 or i.UserInputType==Enum.UserInputType.Touch then
        -- không dùng GetGuiObjectsAtPosition: nó chỉ thấy PlayerGui, còn hub nằm trong gethui()/CoreGui
        local f = Hit.inObject(unitBtn, i.Position.X, i.Position.Y)
            or Hit.inObject(ddFrame, i.Position.X, i.Position.Y)
        if not f then ddFrame.Visible=false end
    end
end))

y = y + 82

local runBtn = Button(codeTab, "▶ Chạy Code", 8, y, 336, 26, Color3.fromRGB(0,160,90))
local stopBtn = Button(codeTab, "⏹ Dừng", 350, y, 126, 26, C.RED)
y = y + 32
local saveBtn = Button(codeTab, "💾 Lưu Vào Danh Sách", 8, y, 468, 26, C.BLUE)
y = y + 32

local statusLbl = Label(codeTab, "", y)
statusLbl.TextColor3=Color3.fromRGB(255, 205, 64); statusLbl.TextSize=9; statusLbl.ZIndex=6
y = y + 14

local countLbl = Label(codeTab, "🔄 Tổng số lần đã chạy: 0", y)
countLbl.TextColor3=C.GREEN; countLbl.TextSize=9; countLbl.ZIndex=6

codeTab.CanvasSize = UDim2.new(0, 0, 0, y + 30)

stopBtn.Activated:Connect(function() Cancel(); statusLbl.Text="⏹️ Đã dừng" end)

runBtn.Activated:Connect(function()
    local t=math.clamp(tonumber(repIn.Text)or 1,1,1000)
    local d=math.max(tonumber(delIn.Text)or 0,0)
    if unitBtn.Text:find("Phút") then d=d*60 end
    local ok,err=RunCode(codeIn.Text,nameIn.Text,nil,t,d)
    if not ok then
        statusLbl.Text=err or "❌ Lỗi không xác định"
    else
        statusLbl.Text="⏳ Đang thực thi..."
        task.spawn(function()
            while runActive do
                if cancelled then statusLbl.Text="⏹️ Đã dừng"; return end
                task.wait(0.1)
            end
            if not cancelled then
                statusLbl.Text="✅ Hoàn thành!" .. (S.lastParkNote and (" · " .. S.lastParkNote) or "")
            end
            countLbl.Text="🔄 Tổng số lần đã chạy: "..totalRuns
            -- GUI có thể được đưa vào menu trễ hơn chút (script dựng GUI sau HttpGet/task.wait)
            task.delay(1.5, function()
                if statusLbl and statusLbl.Parent and S.lastParkNote then
                    statusLbl.Text = "✅ Hoàn thành! · " .. S.lastParkNote
                end
            end)
        end)
    end
end)

local RebuildScripts

saveBtn.Activated:Connect(function()
    local n=nameIn.Text
    local c=codeIn.Text
    if #c==0 then statusLbl.Text="⚠️ Vui lòng nhập code!"; return end
    if #n==0 then n="Script "..(#scripts+1) end
    local bn=n
    local cnt=1
    while true do
        local ex=false
        for _,s in ipairs(scripts) do if s.name==n then ex=true; break end end
        if not ex then break end
        cnt+=1; n=bn.." ("..cnt..")"
    end
    table.insert(scripts,{name=n, code=c, expanded=false})
    if RebuildScripts then RebuildScripts() end
    Store.saveSoon()
    statusLbl.Text="✅ Đã lưu vào Tab 'Code Đã Lưu'! (đã ghi xuống đĩa)"
end)

-- ==================== TAB 2: CODE ĐÃ LƯU ====================
local sy = 8
Label(savedCodeTab, "💾 Danh Sách Script Đã Lưu", sy)
sy = sy + 18

local searchIn = New("TextBox", {
    Size=UDim2.new(1,-16,0,26), Position=UDim2.new(0,8,0,sy), Text="",
    PlaceholderText="🔍 Tìm kiếm script...", PlaceholderColor3=Color3.fromRGB(122, 130, 148),
    BackgroundColor3=Color3.fromRGB(26, 29, 38), BackgroundTransparency=0, TextColor3=Color3.fromRGB(233, 237, 245),
    Font=Enum.Font.GothamMedium, TextSize=12, BorderSizePixel=0, ClearTextOnFocus=false,
    Active=true, Selectable=true, ZIndex=10, TextXAlignment=Enum.TextXAlignment.Left,
}, savedCodeTab)
Corner(searchIn, UDim.new(0,5))
Stroke(searchIn, Color3.fromRGB(180,180,200), 1.2)
New("UIPadding", {PaddingLeft=UDim.new(0,6)}, searchIn)
sy = sy + 32

-- ===== NHÃN TRẠNG THÁI LƯU + NÚT NẠP LẠI TỪ ĐĨA =====
-- Gắn vào Store.statusLbl / Store.reloadBtn (field của bảng) thay vì khai báo local mới,
-- vì main chunk đã gần cạn 200 slot local cho phép.
Store.statusLbl = New("TextLabel", {
    Size=UDim2.new(1,-110,0,20), Position=UDim2.new(0,8,0,sy),
    Text="💾 ...", BackgroundTransparency=1, TextColor3=C.GRAY,
    Font=Enum.Font.GothamMedium, TextSize=9,
    TextXAlignment=Enum.TextXAlignment.Left, TextYAlignment=Enum.TextYAlignment.Center,
    TextTruncate=Enum.TextTruncate.AtEnd, ZIndex=7,
}, savedCodeTab)

Store.reloadBtn = New("TextButton", {
    Size=UDim2.new(0,94,0,20), Position=UDim2.new(1,-102,0,sy),
    Text="🔄 Nạp lại", BackgroundColor3=C.BLUE, BackgroundTransparency=0.1,
    TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=9, BorderSizePixel=0, ZIndex=8,
}, savedCodeTab)
Corner(Store.reloadBtn, UDim.new(0,5))
Stroke(Store.reloadBtn, Color3.fromRGB(0,90,170), 1)

Store.refreshStatus = function()
    if not Store.statusLbl or not Store.statusLbl.Parent then return end
    local ns, nw, nf = #scripts, #waypoints, #featureTabs
    if Store.lastError then
        Store.statusLbl.TextColor3=Color3.fromRGB(255, 160, 90)
        Store.statusLbl.Text = string.format("⚠️ %d script · %d WP · %d tab — %s", ns, nw, nf, Store.lastError)
    elseif Store.mode == "file" then
        Store.statusLbl.TextColor3=Color3.fromRGB(58, 214, 140)
        Store.statusLbl.Text = string.format("💾 %d script · %d WP · %d tab · %s%s", ns, nw, nf, Store.SAVE_FILE,
            Store.lastSavedAt and (" · lưu lúc " .. Store.lastSavedAt) or "")
    elseif Store.mode == "memory" then
        Store.statusLbl.TextColor3=Color3.fromRGB(255, 205, 64)
        Store.statusLbl.Text = string.format("⚠️ %d script · %d WP · %d tab — chỉ giữ trong phiên chơi này (executor thiếu writefile)", ns, nw, nf)
    elseif Store.mode == "empty" then
        Store.statusLbl.TextColor3 = C.GRAY
        Store.statusLbl.Text = string.format("💾 Chưa lưu gì · sẽ ghi vào %s khi bạn bấm Lưu", Store.SAVE_FILE)
    else
        Store.statusLbl.TextColor3 = C.GRAY
        Store.statusLbl.Text = "💾 Chưa lưu gì (executor thiếu writefile — chỉ giữ trong phiên chơi)"
    end
end

-- v4.5: tách thành hàm S.DoReload để trang 📚 Script Hub gọi lại được (không nhân đôi logic)
S.DoReload = function()
    -- Nạp lại từ đĩa. Hữu ích khi: file bị sửa tay, executor vừa cấp quyền ghi,
    -- hoặc bạn copy file banana_cat_saved.json từ máy/executor khác sang.
    Store.load()
    RebuildScripts()
    -- v4.5: nạp lại cả ⭐ yêu thích của trang 📚 Script Hub (Store.load vừa đọc xong)
    pcall(function() if S.RebuildHubList then S.RebuildHubList() end end)
    -- v4.4b: Waypoint cũng phải dựng lại (trước đây thiếu: local RebuildWaypoints được khai
    -- báo ở TAB3, SAU closure này, nên gọi thẳng ở đây sẽ thành global nil -> lỗi).
    if Store.restoreWaypoints then pcall(Store.restoreWaypoints) end
    if Store.restoreFeatures then pcall(Store.restoreFeatures) end
    -- v4.4b: BỎ Store.save() ở đây. Nạp lại là thao tác ĐỌC; lưu ngay sau đó sẽ ghi đè
    -- file vừa đọc (đang muốn cứu) bằng dữ liệu trong RAM -> mất dữ liệu không cứu được.
    Store.reloadBtn.Text = "✅ Đã nạp"
    task.delay(1.4, function()
        if Store.reloadBtn and Store.reloadBtn.Parent then Store.reloadBtn.Text = "🔄 Nạp lại" end
    end)
end
Store.reloadBtn.Activated:Connect(S.DoReload)

sy = sy + 24

local scriptList = New("Frame", {
    Size=UDim2.new(1,-16,0,0), Position=UDim2.new(0,8,0,sy),
    BackgroundTransparency=1, BorderSizePixel=0, ZIndex=6,
}, savedCodeTab)
New("UIListLayout", {SortOrder=Enum.SortOrder.LayoutOrder, Padding=UDim.new(0,6)}, scriptList)

RebuildScripts = function()
    for _,c in ipairs(scriptList:GetChildren()) do
        if not c:IsA("UIListLayout") then c:Destroy() end
    end

    local term=searchIn.Text:lower()
    local disp={}
    for _,d in ipairs(scripts) do
        if term=="" or d.name:lower():find(term,1,true) then table.insert(disp,d) end
    end

    if #disp==0 then
        New("TextLabel", {
            Size=UDim2.new(1,0,0,40),
            Text=term~="" and "📭 Không tìm thấy script phù hợp" or "📭 Chưa có script nào được lưu",
            BackgroundTransparency=1, TextColor3=C.GRAY, Font=Enum.Font.GothamMedium, TextSize=11,
            TextXAlignment=Enum.TextXAlignment.Center, TextYAlignment=Enum.TextYAlignment.Center, ZIndex=7,
        }, scriptList)
    end

    local totalHeight = 0

    for _, d in ipairs(disp) do
        local isExpanded = d.expanded or false
        local rowH = isExpanded and 160 or 42

        local row = New("Frame", {
            Size=UDim2.new(1,0,0,rowH), BackgroundColor3=Color3.fromRGB(26, 29, 38),
            BackgroundTransparency=0.1, BorderSizePixel=0, ZIndex=6,
            ClipsDescendants=true,
        }, scriptList)
        Corner(row,UDim.new(0,6)); Stroke(row)

        local arrowBtn = New("TextButton", {
            Size=UDim2.new(0,24,0,24), Position=UDim2.new(0,6,0,9),
            Text=isExpanded and "▲" or "▼",
            BackgroundColor3=Color3.fromRGB(32, 36, 47), BackgroundTransparency=0,
            TextColor3=C.BLUE, Font=Enum.Font.GothamBold, TextSize=10, BorderSizePixel=0, ZIndex=8,
        }, row)
        Corner(arrowBtn, UDim.new(0,4))

        local nameLbl = New("TextLabel", {
            Size=UDim2.new(1,-175,0,42), Position=UDim2.new(0,36,0,0),
            Text=d.name, BackgroundTransparency=1, TextColor3=C.DARK,
            Font=Enum.Font.GothamBold, TextSize=11, TextXAlignment=Enum.TextXAlignment.Left,
            TextTruncate=Enum.TextTruncate.AtEnd, ZIndex=8,
        }, row)

        local delScriptBtn = New("TextButton", {
            Size=UDim2.new(0,58,0,26), Position=UDim2.new(1,-132,0,8),
            Text="🗑 Xóa", BackgroundColor3=C.RED, BackgroundTransparency=0.1,
            TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=10, BorderSizePixel=0, ZIndex=8,
        }, row)
        Corner(delScriptBtn, UDim.new(0,5))

        local runScriptBtn = New("TextButton", {
            Size=UDim2.new(0,62,0,26), Position=UDim2.new(1,-68,0,8),
            Text="▶ Chạy", BackgroundColor3=C.GREEN, BackgroundTransparency=0.1,
            TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=10, BorderSizePixel=0, ZIndex=8,
        }, row)
        Corner(runScriptBtn, UDim.new(0,5))

        if isExpanded then
            local codeBoxFrame = New("ScrollingFrame", {
                Size=UDim2.new(1,-12,0,82), Position=UDim2.new(0,6,0,42),
                BackgroundColor3=Color3.fromRGB(24, 27, 35), BackgroundTransparency=0,
                BorderSizePixel=0, ZIndex=8, ScrollBarThickness=4,
                CanvasSize=UDim2.new(0,0,0,0),
                AutomaticCanvasSize=Enum.AutomaticSize.Y,
                ScrollingDirection=Enum.ScrollingDirection.Y,
                ScrollingEnabled=true,
                VerticalScrollBarInset=Enum.ScrollBarInset.ScrollBar,
            }, row)
            Corner(codeBoxFrame, UDim.new(0,5))
            Stroke(codeBoxFrame, Color3.fromRGB(190,195,210), 1)

            local codeLbl = New("TextBox", {
                -- AutomaticSize=Y de khung cha (AutomaticCanvasSize.Y) biet chieu cao that cua code
                -- va sinh dung thanh cuon. Ban cu dung Size=(1,-8,1,-8) => cao = 0 => khong cuon duoc.
                Size=UDim2.new(1,-8,0,0), Position=UDim2.new(0,4,0,4),
                AutomaticSize=Enum.AutomaticSize.Y,
                Text=d.code, TextColor3=Color3.fromRGB(226, 230, 240), BackgroundTransparency=1,
                Font=Enum.Font.Code, TextSize=10, TextXAlignment=Enum.TextXAlignment.Left,
                TextYAlignment=Enum.TextYAlignment.Top, MultiLine=true, TextWrapped=true,
                ClearTextOnFocus=false, TextEditable=false, Active=true, ZIndex=9,
            }, codeBoxFrame)

            local copyBtn = New("TextButton", {
                Size=UDim2.new(0,120,0,24), Position=UDim2.new(0,6,0,128),
                Text="📋 Sao Chép Code", BackgroundColor3=C.BLUE, BackgroundTransparency=0.1,
                TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=10, BorderSizePixel=0, ZIndex=8,
            }, row)
            Corner(copyBtn, UDim.new(0,5))

            copyBtn.Activated:Connect(function()
                if setclipboard then
                    pcall(setclipboard, d.code)
                    copyBtn.Text = "✅ Đã Sao Chép!"
                elseif toclipboard then
                    pcall(toclipboard, d.code)
                    copyBtn.Text = "✅ Đã Sao Chép!"
                else
                    codeLbl:CaptureFocus()
                    codeLbl.SelectionStart = 1
                    codeLbl.CursorPosition = #d.code + 1
                    copyBtn.Text = "⚠️ Đã Bôi Đen Code"
                end
                task.delay(1.5, function()
                    if copyBtn and copyBtn.Parent then
                        copyBtn.Text = "📋 Sao Chép Code"
                    end
                end)
            end)
        end

        arrowBtn.Activated:Connect(function()
            d.expanded = not d.expanded
            RebuildScripts()
            Store.saveSoon()
        end)

        runScriptBtn.Activated:Connect(function()
            local prev = runScriptBtn.Text
            RunCode(d.code, d.name, runScriptBtn, 1, 0)
            -- v4.4b: statusLbl thuộc TAB1 nên người dùng không nhìn thấy gì ở đây;
            -- báo ngay trên nút cho chắc.
            runScriptBtn.Text = "⏳ ..."
            task.delay(0.9, function()
                if runScriptBtn and runScriptBtn.Parent then runScriptBtn.Text = "✅ xong" end
                task.delay(0.9, function()
                    if runScriptBtn and runScriptBtn.Parent then runScriptBtn.Text = prev end
                end)
            end)
        end)

        delScriptBtn.Activated:Connect(function()
            local origIdx = nil
            for idx, s in ipairs(scripts) do
                if s == d then origIdx = idx; break end
            end
            if origIdx then
                table.remove(scripts, origIdx)
                RebuildScripts()
                Store.saveSoon()
            end
        end)

        totalHeight = totalHeight + rowH + 6
    end

    local listH = math.max(totalHeight, 40)
    scriptList.Size = UDim2.new(1,-16,0,listH)
    savedCodeTab.CanvasSize = UDim2.new(0, 0, 0, sy + listH + 30)
    if Store.refreshStatus then Store.refreshStatus() end
end

-- v4.6: debounce (trước: mỗi phím = dựng lại TOÀN BỘ danh sách Code Đã Lưu một lần)
searchIn:GetPropertyChangedSignal("Text"):Connect(function() S.Debounce("savedSearch", 0.18, RebuildScripts) end)
RebuildScripts()

-- ==================== TAB 3: HỖ TRỢ — SCRIPT NHANH + PHÂN TÍCH TỌA ĐỘ ====================
local supportTab = AddTab("Hỗ Trợ", "🛠", 4)

local posY = 8

Label(supportTab, "⚡ Script Nhanh - Nhấn để chạy ngay", posY)
posY = posY + 16

local quickScripts = {
    {n="Dex Explorer", d="Mở Dex Explorer", c=[[loadstring(game:HttpGet("https://raw.githubusercontent.com/infyiff/backup/main/dex.lua"))()]], cl=Color3.fromRGB(72, 148, 248)},
    {n="Infinite Yield", d="Admin Commands", c=[[loadstring(game:HttpGet("https://raw.githubusercontent.com/EdgeIY/infiniteyield/master/source"))()]], cl=C.PURPLE},
    {n="SimpleSpy v3", d="Theo dõi RemoteEvent & RemoteFunction", c=[[loadstring(game:HttpGet("https://raw.githubusercontent.com/ex-serum/SimpleSpy/main/SimpleSpy.lua"))()]], cl=Color3.fromRGB(38, 194, 118)},
}

for _, s in ipairs(quickScripts) do
    local btn = New("TextButton", {
        Size=UDim2.new(1,-16,0,28), Position=UDim2.new(0,8,0,posY), Text="",
        BackgroundColor3=s.cl, BackgroundTransparency=0.3, BorderSizePixel=0, ZIndex=6,
    }, supportTab)
    Corner(btn, UDim.new(0,5))
    Stroke(btn, s.cl, 1.2)
    New("TextLabel", {
        Size=UDim2.new(1,-10,1,0), Position=UDim2.new(0,10,0,0), Text=s.n.."\n"..s.d,
        BackgroundTransparency=1, TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=10,
        TextXAlignment=Enum.TextXAlignment.Left, TextYAlignment=Enum.TextYAlignment.Center, ZIndex=7,
    }, btn)
    -- v4.4i: noPark=true -> Dex/IY/SimpleSpy mở GUI NGOÀI màn hình game (đúng như trước v4.4h),
    -- hub không "mượn" cửa sổ của chúng vào menu nữa.
    btn.Activated:Connect(function() RunCode(s.c, s.n, nil, 1, 0, true) end)
    posY = posY + 32
end

posY = posY + 6
Label(supportTab, "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", posY)
posY = posY + 16

Label(supportTab, "🛠 Hỗ Trợ — Phân Tích Tọa Độ", posY)
posY = posY + 18
Label(supportTab, "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", posY)
posY = posY + 16

-- ===== NÚT BẬT/TẮT PHÂN TÍCH VẬT THỂ + HIGHLIGHT =====
local analyzeObjectEnabled = false
local highlightEnabled = true

local objectAnalyzeBtn = Button(supportTab, "🎯 Phân Tích Vật Thể: TẮT", 8, posY, 372, 26, C.GRAY)
local clearObjectBtn = Button(supportTab, "🧹 Xóa KQ", 386, posY, 90, 26, C.RED)
posY = posY + 32

local highlightToggleBtn = Button(supportTab, "💜 Highlight Tím: BẬT", 8, posY, 372, 26, C.PURPLE)
local removeHighlightBtn = Button(supportTab, "❌ Xóa Highlight", 386, posY, 90, 26, C.RED)
posY = posY + 32

Label(supportTab, "💡 Bật rồi NHẤP CHUỘT PHẢI (lệt) vào vật thể để chọn (chuột trái vẫn bắn/đi bình thường)", posY)
Label(supportTab, "    Click xuyên qua nút HUD/menu của game sẽ được tự động bỏ qua, không hit nhầm vật phía sau", posY+14)
posY = posY + 30

-- ===== PANEL HIỂN THỊ KẾT QUẢ VẬT THỂ =====
local objResultPanel = New("Frame", {
    Size=UDim2.new(1,-16,0,190),
    Position=UDim2.new(0,8,0,posY),
    BackgroundColor3=Color3.fromRGB(20, 25, 35),
    BackgroundTransparency=0,
    BorderSizePixel=0,
    ZIndex=6,
    Visible=false,
}, supportTab)
Corner(objResultPanel, UDim.new(0,6))
Stroke(objResultPanel, C.PURPLE, 1.5)

New("TextLabel", {   -- (objTitleLbl: bien local khong dung -> bo de tiet kiem slot local)
    Size=UDim2.new(1,-16,0,16), Position=UDim2.new(0,8,0,4),
    Text="🎯 VẬT THỂ ĐƯỢC CHỌN", BackgroundTransparency=1,
    TextColor3=Color3.fromRGB(180, 130, 255),
    Font=Enum.Font.GothamBold, TextSize=10,
    TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7,
}, objResultPanel)

local objNameLbl = New("TextLabel", {
    Size=UDim2.new(1,-16,0,16), Position=UDim2.new(0,8,0,22),
    Text="Name: ...", BackgroundTransparency=1,
    TextColor3=Color3.fromRGB(255, 255, 100),
    Font=Enum.Font.Code, TextSize=10,
    TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7,
}, objResultPanel)

local objClassLbl = New("TextLabel", {
    Size=UDim2.new(1,-16,0,16), Position=UDim2.new(0,8,0,38),
    Text="Class: ...", BackgroundTransparency=1,
    TextColor3=Color3.fromRGB(200, 200, 255),
    Font=Enum.Font.Code, TextSize=10,
    TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7,
}, objResultPanel)

local objPosLbl = New("TextLabel", {
    Size=UDim2.new(1,-16,0,16), Position=UDim2.new(0,8,0,54),
    Text="Position: ...", BackgroundTransparency=1,
    TextColor3=Color3.fromRGB(255, 180, 180),
    Font=Enum.Font.Code, TextSize=10,
    TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7,
}, objResultPanel)

local objSizeLbl = New("TextLabel", {
    Size=UDim2.new(1,-16,0,16), Position=UDim2.new(0,8,0,70),
    Text="Size: ...", BackgroundTransparency=1,
    TextColor3=Color3.fromRGB(180, 255, 180),
    Font=Enum.Font.Code, TextSize=10,
    TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7,
}, objResultPanel)

local objRotLbl = New("TextLabel", {
    Size=UDim2.new(1,-16,0,16), Position=UDim2.new(0,8,0,86),
    Text="Rotation: ...", BackgroundTransparency=1,
    TextColor3=Color3.fromRGB(180, 220, 255),
    Font=Enum.Font.Code, TextSize=10,
    TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7,
}, objResultPanel)

local objLookLbl = New("TextLabel", {
    Size=UDim2.new(1,-16,0,16), Position=UDim2.new(0,8,0,102),
    Text="Look: ...", BackgroundTransparency=1,
    TextColor3=Color3.fromRGB(220, 200, 255),
    Font=Enum.Font.Code, TextSize=10,
    TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7,
}, objResultPanel)

local objMatLbl = New("TextLabel", {
    Size=UDim2.new(1,-16,0,16), Position=UDim2.new(0,8,0,118),
    Text="Material: ...", BackgroundTransparency=1,
    TextColor3=Color3.fromRGB(255, 220, 180),
    Font=Enum.Font.Code, TextSize=10,
    TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7,
}, objResultPanel)

local objColorLbl = New("TextLabel", {
    Size=UDim2.new(1,-16,0,16), Position=UDim2.new(0,8,0,134),
    Text="Color: ...", BackgroundTransparency=1,
    TextColor3=Color3.fromRGB(255, 180, 220),
    Font=Enum.Font.Code, TextSize=10,
    TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7,
}, objResultPanel)

local objPathLbl = New("TextLabel", {
    Size=UDim2.new(1,-16,0,16), Position=UDim2.new(0,8,0,150),
    Text="Path: ...", BackgroundTransparency=1,
    TextColor3=Color3.fromRGB(180, 255, 220),
    Font=Enum.Font.Code, TextSize=9,
    TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7,
    TextTruncate=Enum.TextTruncate.AtEnd,
}, objResultPanel)

local copyObjBtn = New("TextButton", {
    Size=UDim2.new(0,120,0,20), Position=UDim2.new(0,8,0,168),
    Text="📋 Copy Tọa Độ", BackgroundColor3=C.BLUE, BackgroundTransparency=0.1,
    TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=9, BorderSizePixel=0, ZIndex=8,
}, objResultPanel)
Corner(copyObjBtn, UDim.new(0,4))

local copyPathBtn = New("TextButton", {
    Size=UDim2.new(0,120,0,20), Position=UDim2.new(0,134,0,168),
    Text="📋 Copy Path", BackgroundColor3=C.PURPLE, BackgroundTransparency=0.1,
    TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=9, BorderSizePixel=0, ZIndex=8,
}, objResultPanel)
Corner(copyPathBtn, UDim.new(0,4))

posY = posY + 198

Label(supportTab, "📍 Tọa Độ Hiện Tại (Real-time)", posY)
posY = posY + 16

-- ===== PANEL TỌA ĐỘ ĐẦY ĐỦ (POS + SIZE + ROTATION + LOOK + STATE + HP) =====
local coordDisplay = New("Frame", {
    Size=UDim2.new(1,-16,0,290),
    Position=UDim2.new(0,8,0,posY),
    BackgroundColor3=Color3.fromRGB(30, 35, 45),
    BackgroundTransparency=0,
    BorderSizePixel=0,
    ZIndex=6,
}, supportTab)
Corner(coordDisplay, UDim.new(0,6))
Stroke(coordDisplay, C.BLUE, 1.5)

local function CreateCoordRow(parent, yPos, labelText, labelColor, valueDefault)
    New("TextLabel", {
        Size=UDim2.new(0,90,0,16), Position=UDim2.new(0,8,0,yPos),
        Text=labelText, BackgroundTransparency=1, TextColor3=labelColor,
        Font=Enum.Font.GothamBold, TextSize=10,
        TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7,
    }, parent)
    return New("TextLabel", {
        Size=UDim2.new(1,-100,0,16), Position=UDim2.new(0,100,0,yPos),
        Text=valueDefault or "...", BackgroundTransparency=1,
        TextColor3=Color3.fromRGB(255,255,255),
        Font=Enum.Font.Code, TextSize=10,
        TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7,
    }, parent)
end

New("TextLabel", {
    Size=UDim2.new(1,-16,0,14), Position=UDim2.new(0,8,0,4),
    Text="📍 POSITION (DƯỚI CHÂN)", BackgroundTransparency=1,
    TextColor3=Color3.fromRGB(255, 200, 100),
    Font=Enum.Font.GothamBold, TextSize=9,
    TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7,
}, coordDisplay)

local xValLbl = CreateCoordRow(coordDisplay, 20, "X:", Color3.fromRGB(255,100,100), "0.000")
local yValLbl = CreateCoordRow(coordDisplay, 36, "Y:", Color3.fromRGB(100,255,100), "0.000")
local zValLbl = CreateCoordRow(coordDisplay, 52, "Z:", Color3.fromRGB(100,150,255), "0.000")

New("TextLabel", {
    Size=UDim2.new(1,-16,0,14), Position=UDim2.new(0,8,0,72),
    Text="📦 SIZE", BackgroundTransparency=1,
    TextColor3=Color3.fromRGB(255, 200, 100),
    Font=Enum.Font.GothamBold, TextSize=9,
    TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7,
}, coordDisplay)

local sizeXValLbl = CreateCoordRow(coordDisplay, 88, "Size X:", Color3.fromRGB(255,150,150), "0.000")
local sizeYValLbl = CreateCoordRow(coordDisplay, 104, "Size Y:", Color3.fromRGB(150,255,150), "0.000")
local sizeZValLbl = CreateCoordRow(coordDisplay, 120, "Size Z:", Color3.fromRGB(150,180,255), "0.000")

New("TextLabel", {
    Size=UDim2.new(1,-16,0,14), Position=UDim2.new(0,8,0,140),
    Text="🧭 ROTATION", BackgroundTransparency=1,
    TextColor3=Color3.fromRGB(255, 200, 100),
    Font=Enum.Font.GothamBold, TextSize=9,
    TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7,
}, coordDisplay)

local rotPValLbl = CreateCoordRow(coordDisplay, 156, "Pitch (X):", Color3.fromRGB(255,150,150), "0.0°")
local rotYValLbl = CreateCoordRow(coordDisplay, 172, "Yaw (Y):", Color3.fromRGB(150,255,150), "0.0°")
local rotRValLbl = CreateCoordRow(coordDisplay, 188, "Roll (Z):", Color3.fromRGB(150,180,255), "0.0°")

New("TextLabel", {
    Size=UDim2.new(1,-16,0,14), Position=UDim2.new(0,8,0,206),
    Text="👁 LOOK / STATE / HP", BackgroundTransparency=1,
    TextColor3=Color3.fromRGB(255, 200, 100),
    Font=Enum.Font.GothamBold, TextSize=9,
    TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7,
}, coordDisplay)

local lookValLbl = New("TextLabel", {
    Size=UDim2.new(1,-16,0,16), Position=UDim2.new(0,8,0,222),
    Text="Look: ...", BackgroundTransparency=1,
    TextColor3=Color3.fromRGB(200,220,255),
    Font=Enum.Font.Code, TextSize=10,
    TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7,
}, coordDisplay)

local stateValLbl = New("TextLabel", {
    Size=UDim2.new(1,-16,0,16), Position=UDim2.new(0,8,0,240),
    Text="State: ...", BackgroundTransparency=1,
    TextColor3=Color3.fromRGB(200,255,200),
    Font=Enum.Font.Code, TextSize=10,
    TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7,
}, coordDisplay)

local hpValLbl = New("TextLabel", {
    Size=UDim2.new(1,-16,0,16), Position=UDim2.new(0,8,0,258),
    Text="HP: ...", BackgroundTransparency=1,
    TextColor3=Color3.fromRGB(255,200,200),
    Font=Enum.Font.Code, TextSize=10,
    TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7,
}, coordDisplay)

local placeLbl = New("TextLabel", {
    Size=UDim2.new(1,-16,0,14), Position=UDim2.new(0,8,0,274),
    Text="Place: ...", BackgroundTransparency=1,
    TextColor3=Color3.fromRGB(150, 200, 255),
    Font=Enum.Font.GothamMedium, TextSize=9,
    TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7,
}, coordDisplay)

posY = posY + 298

local lastPos = Vector3.new()
local lastSize = Vector3.new()
local lastRot = Vector3.new()
local lastLook = Vector3.new()
local lastState = ""
local lastHp = -1

local function GetRootPart()
    local char = player.Character
    if not char then return nil end
    local humanoid = char:FindFirstChildOfClass("Humanoid")
    local rootPart = (humanoid and humanoid.RootPart)
        or char:FindFirstChild("HumanoidRootPart")
        or char.PrimaryPart
        or char:FindFirstChild("UpperTorso")
        or char:FindFirstChild("Torso")
    return rootPart
end

local function GetGroundPosition()
    local char = player.Character
    if not char then return nil end
    local rootPart = GetRootPart()
    if not rootPart then return nil end

    local origin = rootPart.Position
    local direction = Vector3.new(0, -500, 0)

    local params = RaycastParams.new()
    params.FilterType = Enum.RaycastFilterType.Exclude
    params.FilterDescendantsInstances = {char}
    params.IgnoreWater = false

    local result = workspace:Raycast(origin, direction, params)
    if result then
        return result.Position, result.Instance, result.Normal, result.Material
    end
    return nil
end

-- v4.6 (mượt hơn): đây là vòng tốn khung hình NHẤT của hub — raycast + đọc Humanoid + ghi
-- hơn 10 nhãn... MỖI FRAME (60-144 lần/giây), và chạy cả khi menu đang ĐÓNG. Nay:
--   • chỉ chạy khi menu MỞ và trang 🛠 Hỗ Trợ đang hiện. KHÔNG mất tính năng: các nhãn này
--     chỉ để XEM, không nút nào đọc lại chữ trong chúng (📋 Copy / 📍 Lấy Vị Trí tự gọi
--     GetGroundPosition() khi bấm) — mở trang ra là số liệu có ngay trong 1/20 giây;
--   • tối đa ~20 lần/giây: mắt đọc số không phân biệt được 20Hz với 144Hz, còn CPU thì có;
--   • đóng menu = vòng này tốn đúng 2 phép cộng, không raycast, không ghi nhãn nào.
local coordAcc = 0
local coordUpdateConn = RunService.RenderStepped:Connect(function(stepDt)
    coordAcc = coordAcc + (tonumber(stepDt) or 0.016)
    if coordAcc < 0.05 then return end
    coordAcc = 0
    if not (main and main.Visible) then return end
    if not (supportTab and supportTab.Visible) then return end
    local char = player.Character
    if not char then
        xValLbl.Text = "N/A"; yValLbl.Text = "N/A"; zValLbl.Text = "N/A"
        sizeXValLbl.Text = "N/A"; sizeYValLbl.Text = "N/A"; sizeZValLbl.Text = "N/A"
        rotPValLbl.Text = "N/A"; rotYValLbl.Text = "N/A"; rotRValLbl.Text = "N/A"
        lookValLbl.Text = "Look: N/A"
        stateValLbl.Text = "State: N/A"
        hpValLbl.Text = "HP: N/A"
        return
    end

    local humanoid = char:FindFirstChildOfClass("Humanoid")
    local rootPart = GetRootPart()

    if not rootPart then
        xValLbl.Text = "N/A"; yValLbl.Text = "N/A"; zValLbl.Text = "N/A"
        sizeXValLbl.Text = "N/A"; sizeYValLbl.Text = "N/A"; sizeZValLbl.Text = "N/A"
        rotPValLbl.Text = "N/A"; rotYValLbl.Text = "N/A"; rotRValLbl.Text = "N/A"
        return
    end

    local groundPos = GetGroundPosition()
    local displayPos = groundPos or rootPart.CFrame.Position

    local cf = rootPart.CFrame
    local size = rootPart.Size
    local rx, ry, rz = cf:ToOrientation()
    local look = cf.LookVector

    if (displayPos - lastPos).Magnitude > 0.001 then
        lastPos = displayPos
        xValLbl.Text = string.format("%.3f", displayPos.X)
        yValLbl.Text = string.format("%.3f", displayPos.Y)
        zValLbl.Text = string.format("%.3f", displayPos.Z)
    end

    if (size - lastSize).Magnitude > 0.001 then
        lastSize = size
        sizeXValLbl.Text = string.format("%.3f", size.X)
        sizeYValLbl.Text = string.format("%.3f", size.Y)
        sizeZValLbl.Text = string.format("%.3f", size.Z)
    end

    local newRot = Vector3.new(rx, ry, rz)
    if (newRot - lastRot).Magnitude > 0.001 then
        lastRot = newRot
        rotPValLbl.Text = string.format("%.1f°", math.deg(rx))
        rotYValLbl.Text = string.format("%.1f°", math.deg(ry))
        rotRValLbl.Text = string.format("%.1f°", math.deg(rz))
    end

    if (look - lastLook).Magnitude > 0.001 then
        lastLook = look
        lookValLbl.Text = string.format("Look: %.3f, %.3f, %.3f", look.X, look.Y, look.Z)
    end

    if humanoid then
        -- v4.6: so sánh BẰNG ENUM, chỉ dựng chuỗi khi state thật sự đổi.
        -- (bản cũ gọi tostring()+gsub() mỗi frame -> 1 chuỗi rác/frame cho GC dọn => khựng nhẹ)
        local state = humanoid:GetState()
        if state ~= lastState then
            lastState = state
            stateValLbl.Text = "State: "..tostring(state):gsub("Enum.HumanoidStateType.", "")
        end

        local hp = math.floor(humanoid.Health)
        if hp ~= lastHp then
            lastHp = hp
            hpValLbl.Text = string.format("HP: %d / %d", hp, math.floor(humanoid.MaxHealth))
        end
    else
        stateValLbl.Text = "State: No Humanoid"
        hpValLbl.Text = "HP: N/A"
    end

    -- v4.6 (bug ngốn mạng/FPS): bản cũ đặt lời gọi HTTP trong nhánh `placeLbl.Text == "Place: ..."`.
    -- Nếu GetProductInfo LỖI (executor chặn, thiếu quyền, mất mạng) thì nhãn VẪN là "Place: ..."
    -- -> nhánh này chạy lại MỖI FRAME = gọi HTTP 60-144 lần/giây, mãi mãi. Nay giới hạn
    -- tối đa 1 lần / 10 giây: vẫn TỰ điền tên Place khi mạng/quyền sẵn sàng, không mất tính năng.
    if placeLbl.Text == "Place: ..." and (os.clock() - (D.placeTryAt or -99)) >= 10 then
        D.placeTryAt = os.clock()
        pcall(function()
            local info = game:GetService("MarketplaceService"):GetProductInfo(game.PlaceId)
            placeLbl.Text = "Place: "..game.PlaceId.." — "..info.Name
        end)
    end
end)
trackConn(coordUpdateConn)

-- ===== HIGHLIGHT VẬT THỂ =====
local currentHighlight = nil

local function RemoveCurrentHighlight()
    if currentHighlight then
        pcall(function() currentHighlight:Destroy() end)
        currentHighlight = nil
    end
end

local function CreateHighlight(target)
    RemoveCurrentHighlight()
    if not target then return end
    if not target:IsA("BasePart") then return end

    local hl = Instance.new("Highlight")
    hl.Name = "BananaCatHub_Highlight"
    hl.Adornee = target
    hl.FillColor = Color3.fromRGB(160, 60, 255)
    hl.FillTransparency = 0.7
    hl.OutlineColor = Color3.fromRGB(200, 100, 255)
    hl.OutlineTransparency = 0
    hl.DepthMode = Enum.HighlightDepthMode.AlwaysOnTop
    hl.Parent = target

    currentHighlight = hl
end

-- ===== XỬ LÝ CLICK VẬT THỂ =====
local function GetFullPath(obj)
    if not obj then return "nil" end
    local parts = {}
    local cur = obj
    while cur and cur ~= game do
        table.insert(parts, 1, cur.Name)
        cur = cur.Parent
    end
    return table.concat(parts, ".")
end

-- v4.4e: tách logic chọn vật thành hàm riêng để dùng lại cho cả chuột phải và touch-hold.
-- 3 lớp chống nhầm:
--   1) bỏ qua nếu click trúng BẤT KỲ GUI nào (của hub, của game trong PlayerGui, của Roblox trong CoreGui)
--   2) tăng tầm raycast lên 10000 studs + bỏ qua character của người chơi
--   3) không tự đổi vật khi bạn click trượt: chỉ ghi nhận KHI raycast ra kết quả hợp lệ
local function PickObjectAt(mousePos, isRightClick)
    local x, y = mousePos.X, mousePos.Y

    -- LỚP 1: có GUI nào nằm dưới con trỏ thì KHÔNG raycast -> không hit nhầm vật phía sau nút game
    local blocked = false
    -- a) GUI của hub
    if Hit.onHub(x, y) then
        return   -- click phải trên hub thì bỏ qua tuyệt đối
    end
    -- b) GUI của game trong PlayerGui (joystick, nút bắn, chat, inventory...)
    local ok, objs = pcall(function() return playerGui:GetGuiObjectsAtPosition(x, y) end)
    if ok and type(objs) == "table" and #objs > 0 then
        for _, o in ipairs(objs) do
            if o:IsA("GuiButton") or o.Active then
                blocked = true; break
            end
            local bgOk, bg = pcall(function() return o.BackgroundTransparency end)
            local t = bgOk and bg or 1
            if (o:IsA("TextBox") or o:IsA("ImageLabel") or o:IsA("TextLabel") or o:IsA("Frame"))
               and t < 0.5 then
                blocked = true; break
            end
        end
    end
    -- c) GUI hệ thống trong CoreGui (menu Roblox, leaderboard, esc...)
    if not blocked then
        local coreGui = game:GetService("CoreGui")
        local ok2, objs2 = pcall(function() return coreGui:GetGuiObjectsAtPosition(x, y) end)
        if ok2 and type(objs2) == "table" and #objs2 > 0 then
            for _, o in ipairs(objs2) do
                if o:IsA("GuiButton") or o.Active then blocked = true; break end
            end
        end
    end
    if blocked then return end

    -- LỚP 2: raycast chính xác hơn
    local unitRay = camera:ViewportPointToRay(x, y)
    local params = RaycastParams.new()
    params.FilterType = Enum.RaycastFilterType.Exclude
    local filterList = {}
    if player.Character then table.insert(filterList, player.Character) end
    if gui then table.insert(filterList, gui) end
    params.FilterDescendantsInstances = filterList
    params.IgnoreWater = false

    local result = workspace:Raycast(unitRay.Origin, unitRay.Direction * 10000, params)
    objResultPanel.Visible = true

    if result and result.Instance then
        local inst = result.Instance
        local hitPos = result.Position
        local hitNormal = result.Normal
        local hitMat = result.Material

        objNameLbl.Text = "Name: "..inst.Name
        objClassLbl.Text = "Class: "..inst.ClassName
        objPosLbl.Text = string.format("Position: %.3f, %.3f, %.3f", hitPos.X, hitPos.Y, hitPos.Z)

        if inst:IsA("BasePart") then
            local size = inst.Size
            local cf = inst.CFrame
            local rx, ry, rz = cf:ToOrientation()
            local look = cf.LookVector
            local color = inst.Color
            local material = inst.Material

            objSizeLbl.Text = string.format("Size: %.3f, %.3f, %.3f", size.X, size.Y, size.Z)
            objRotLbl.Text = string.format("Rotation: P=%.1f° Y=%.1f° R=%.1f°",
                math.deg(rx), math.deg(ry), math.deg(rz))
            objLookLbl.Text = string.format("Look: %.3f, %.3f, %.3f", look.X, look.Y, look.Z)
            objMatLbl.Text = "Material: "..tostring(material):gsub("Enum.Material.", "")
            objColorLbl.Text = string.format("Color: R=%d G=%d B=%d",
                math.floor(color.R*255), math.floor(color.G*255), math.floor(color.B*255))

            if highlightEnabled then CreateHighlight(inst) end
        else
            objSizeLbl.Text = "Size: N/A (không phải BasePart)"
            objRotLbl.Text = "Rotation: N/A"
            objLookLbl.Text = "Look: N/A"
            objMatLbl.Text = "Material: N/A"
            objColorLbl.Text = "Color: N/A"
            RemoveCurrentHighlight()
        end

        objPathLbl.Text = "Path: "..GetFullPath(inst)
        objResultPanel:SetAttribute("LastHitPos", tostring(hitPos))
        objResultPanel:SetAttribute("LastPath", GetFullPath(inst))
        objResultPanel:SetAttribute("LastNormal", tostring(hitNormal))
        objResultPanel:SetAttribute("LastMaterial", tostring(hitMat))
    else
        -- LỚP 3: click vào khoảng không (bầu trời) -> KHÔNG thay đổi gì ngoài thông báo nhất thời,
        -- kết quả cũ (name/path/highlight) vẫn được giữ nguyên để bạn còn copy / nhìn thấy.
        local prevName = objNameLbl.Text
        objNameLbl.Text = "⚠️ Không hit gì — giữ vật đang chọn"
        task.delay(1.0, function()
            if objNameLbl and objNameLbl.Parent and objNameLbl.Text == "⚠️ Không hit gì — giữ vật đang chọn" then
                objNameLbl.Text = prevName
            end
        end)
    end
end

trackConn(UserInputService.InputBegan:Connect(function(input, gp)
    if gp then return end   -- Roblox đã xử lý input này (nút GUI / TextBox focus)
    if not analyzeObjectEnabled then return end

    -- v4.4e: CHỈ dùng CHUỘT PHẢI để chọn vật. Chuột trái / chạm nhẹ đi bắn bình thường.
    -- Trên mobile không có chuột phải -> giữ ngón 0.4s (long-press) = "chuột phải"
    if input.UserInputType == Enum.UserInputType.MouseButton2 then
        PickObjectAt(input.Position, true)
        return
    end

    if input.UserInputType == Enum.UserInputType.Touch then
        local startTick = tick()
        local startPos = input.Position
        local holdConn, moveConn
        holdConn = UserInputService.InputEnded:Connect(function(e)
            if e == input then
                holdConn:Disconnect()
                if moveConn then moveConn:Disconnect() end
                if tick() - startTick >= 0.4 then
                    task.spawn(function() PickObjectAt(input.Position, false) end)
                end
            end
        end)
        moveConn = UserInputService.InputChanged:Connect(function(e)
            if e == input then
                local d = (e.Position - startPos).Magnitude
                if d > 12 then
                    -- ngón di chuyển quá xa -> đó là kéo joystick/chạm vuốt, không phải long-press
                    holdConn:Disconnect()
                    moveConn:Disconnect()
                end
            end
        end)
        return
    end
end))

objectAnalyzeBtn.Activated:Connect(function()
    analyzeObjectEnabled = not analyzeObjectEnabled
    if analyzeObjectEnabled then
        objectAnalyzeBtn.Text = "🎯 Phân Tích Vật: BẬT"
        D.SetBg(objectAnalyzeBtn, C.GREEN)   -- v4.5: đổi màu kèm chữ tương phản
    else
        objectAnalyzeBtn.Text = "🎯 Phân Tích Vật: TẮT"
        D.SetBg(objectAnalyzeBtn, C.GRAY)
        RemoveCurrentHighlight()
    end
end)

highlightToggleBtn.Activated:Connect(function()
    highlightEnabled = not highlightEnabled
    if highlightEnabled then
        highlightToggleBtn.Text = "💜 Highlight Tím: BẬT"
        D.SetBg(highlightToggleBtn, C.PURPLE)
    else
        highlightToggleBtn.Text = "💜 Highlight Tím: TẮT"
        D.SetBg(highlightToggleBtn, C.GRAY)
        RemoveCurrentHighlight()
    end
end)

removeHighlightBtn.Activated:Connect(function()
    RemoveCurrentHighlight()
end)

clearObjectBtn.Activated:Connect(function()
    objResultPanel.Visible = false
    RemoveCurrentHighlight()
end)

copyObjBtn.Activated:Connect(function()
    local pos = objResultPanel:GetAttribute("LastHitPos")
    if pos and pos ~= "" then
        if setclipboard then pcall(setclipboard, pos) elseif toclipboard then pcall(toclipboard, pos) end
        copyObjBtn.Text = "✅ Đã Copy!"
        task.delay(1.2, function()
            if copyObjBtn and copyObjBtn.Parent then copyObjBtn.Text = "📋 Copy Tọa Độ" end
        end)
    end
end)

copyPathBtn.Activated:Connect(function()
    local path = objResultPanel:GetAttribute("LastPath")
    if path and path ~= "" then
        if setclipboard then pcall(setclipboard, path) elseif toclipboard then pcall(toclipboard, path) end
        copyPathBtn.Text = "✅ Đã Copy!"
        task.delay(1.2, function()
            if copyPathBtn and copyPathBtn.Parent then copyPathBtn.Text = "📋 Copy Path" end
        end)
    end
end)

posY = posY + 6

local copyCoordBtn = Button(supportTab, "📋 Copy Tọa Độ Dưới Chân", 8, posY, 468, 26, C.BLUE)
posY = posY + 32

copyCoordBtn.Activated:Connect(function()
    local groundPos = GetGroundPosition()
    local rootPart = GetRootPart()
    local finalPos = groundPos or (rootPart and rootPart.CFrame.Position)
    if not finalPos then return end
    local text = string.format("%.3f, %.3f, %.3f", finalPos.X, finalPos.Y, finalPos.Z)
    if setclipboard then
        pcall(setclipboard, text)
    elseif toclipboard then
        pcall(toclipboard, text)
    end
    copyCoordBtn.Text = "✅ Đã Copy: "..text
    task.delay(2, function()
        if copyCoordBtn and copyCoordBtn.Parent then
            copyCoordBtn.Text = "📋 Copy Tọa Độ Dưới Chân"
        end
    end)
end)

Label(supportTab, "🚀 Teleport Tới Tọa Độ", posY)
posY = posY + 14

-- v4.6: 3 nhãn X:/Y:/Z: trước đây đều được Label() đặt ở x=8 nên ĐÈ LÊN NHAU (chỉ thấy "Z:").
-- Nay mỗi nhãn đứng đúng cạnh ô của mình, và 3 ô nhập trải đều hết khổ 468px.
D.tpLblX = Label(supportTab, "X:", posY)
D.tpLblX.Size = UDim2.new(0,14,0,14); D.tpLblX.Position = UDim2.new(0,8,0,posY)
local tpXIn = New("TextBox", {
    Size=UDim2.new(0,136,0,24), Position=UDim2.new(0,24,0,posY-2), Text="0",
    PlaceholderColor3=Color3.fromRGB(122, 130, 148),
    BackgroundColor3=Color3.fromRGB(26, 29, 38), BackgroundTransparency=0,
    TextColor3=Color3.fromRGB(233, 237, 245), Font=Enum.Font.Code, TextSize=11,
    BorderSizePixel=0, ClearTextOnFocus=false, Active=true, Selectable=true, ZIndex=10,
}, supportTab)
Corner(tpXIn, UDim.new(0,4)); Stroke(tpXIn, Color3.fromRGB(255,100,100), 1.2)

D.tpLblY = Label(supportTab, "Y:", posY)
D.tpLblY.Size = UDim2.new(0,14,0,14); D.tpLblY.Position = UDim2.new(0,166,0,posY)
local tpYIn = New("TextBox", {
    Size=UDim2.new(0,136,0,24), Position=UDim2.new(0,182,0,posY-2), Text="0",
    PlaceholderColor3=Color3.fromRGB(122, 130, 148),
    BackgroundColor3=Color3.fromRGB(26, 29, 38), BackgroundTransparency=0,
    TextColor3=Color3.fromRGB(233, 237, 245), Font=Enum.Font.Code, TextSize=11,
    BorderSizePixel=0, ClearTextOnFocus=false, Active=true, Selectable=true, ZIndex=10,
}, supportTab)
Corner(tpYIn, UDim.new(0,4)); Stroke(tpYIn, Color3.fromRGB(100,255,100), 1.2)

D.tpLblZ = Label(supportTab, "Z:", posY)
D.tpLblZ.Size = UDim2.new(0,14,0,14); D.tpLblZ.Position = UDim2.new(0,324,0,posY)
local tpZIn = New("TextBox", {
    Size=UDim2.new(0,136,0,24), Position=UDim2.new(0,340,0,posY-2), Text="0",
    PlaceholderColor3=Color3.fromRGB(122, 130, 148),
    BackgroundColor3=Color3.fromRGB(26, 29, 38), BackgroundTransparency=0,
    TextColor3=Color3.fromRGB(233, 237, 245), Font=Enum.Font.Code, TextSize=11,
    BorderSizePixel=0, ClearTextOnFocus=false, Active=true, Selectable=true, ZIndex=10,
}, supportTab)
Corner(tpZIn, UDim.new(0,4)); Stroke(tpZIn, Color3.fromRGB(100,150,255), 1.2)

posY = posY + 30

local fillCurrentBtn = Button(supportTab, "📍 Lấy Vị Trí Dưới Chân", 8, posY, 372, 24, C.ORANGE)
local tpBtn = Button(supportTab, "🚀 Teleport", 386, posY, 90, 24, C.GREEN)
posY = posY + 30

fillCurrentBtn.Activated:Connect(function()
    local groundPos = GetGroundPosition()
    local rootPart = GetRootPart()
    local p = groundPos or (rootPart and rootPart.CFrame.Position)
    if not p then return end
    tpXIn.Text = string.format("%.3f", p.X)
    tpYIn.Text = string.format("%.3f", p.Y)
    tpZIn.Text = string.format("%.3f", p.Z)
end)

tpBtn.Activated:Connect(function()
    local rootPart = GetRootPart()
    if not rootPart then return end
    local x = tonumber(tpXIn.Text) or 0
    local y = tonumber(tpYIn.Text) or 0
    local z = tonumber(tpZIn.Text) or 0
    rootPart.CFrame = CFrame.new(Vector3.new(x, y, z))
    tpBtn.Text = "✅ Đã Teleport!"
    task.delay(1.5, function()
        if tpBtn and tpBtn.Parent then tpBtn.Text = "🚀 Teleport" end
    end)
end)

Label(supportTab, "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", posY)
posY = posY + 16
Label(supportTab, "💾 Waypoint Đã Lưu", posY)
posY = posY + 14

local wpNameIn = New("TextBox", {
    Size=UDim2.new(1,-130,0,24), Position=UDim2.new(0,8,0,posY), Text="",
    PlaceholderText="Tên waypoint...",
    PlaceholderColor3=Color3.fromRGB(122, 130, 148),
    BackgroundColor3=Color3.fromRGB(26, 29, 38), BackgroundTransparency=0,
    TextColor3=Color3.fromRGB(233, 237, 245), Font=Enum.Font.GothamMedium, TextSize=11,
    BorderSizePixel=0, ClearTextOnFocus=false, Active=true, Selectable=true, ZIndex=10,
}, supportTab)
Corner(wpNameIn, UDim.new(0,4)); Stroke(wpNameIn, Color3.fromRGB(180,180,200), 1.2)
New("UIPadding", {PaddingLeft=UDim.new(0,6)}, wpNameIn)

local saveWpBtn = Button(supportTab, "💾 Lưu", 0, 0, 100, 24, C.PURPLE)
saveWpBtn.Position = UDim2.new(1, -110, 0, posY)

posY = posY + 32

local wpListFrame = New("Frame", {
    Size=UDim2.new(1,-16,0,0), Position=UDim2.new(0,8,0,posY),
    BackgroundTransparency=1, BorderSizePixel=0, ZIndex=6,
}, supportTab)
New("UIListLayout", {SortOrder=Enum.SortOrder.LayoutOrder, Padding=UDim.new(0,4)}, wpListFrame)

-- (waypoints đã được khai báo ở đầu file để khối lưu trữ dùng chung — KHÔNG khai báo lại ở đây,
--  nếu không sẽ tạo biến local mới che mất biến cũ và dữ liệu không bao giờ được ghi xuống đĩa)

local RebuildWaypoints

saveWpBtn.Activated:Connect(function()
    local rootPart = GetRootPart()
    if not rootPart then return end
    local name = wpNameIn.Text
    if #name == 0 then name = "WP "..(#waypoints+1) end
    table.insert(waypoints, {name = name, pos = rootPart.CFrame.Position})
    wpNameIn.Text = ""
    if RebuildWaypoints then RebuildWaypoints() end
    Store.saveSoon()
end)

RebuildWaypoints = function()
    for _, c in ipairs(wpListFrame:GetChildren()) do
        if not c:IsA("UIListLayout") then c:Destroy() end
    end

    if #waypoints == 0 then
        New("TextLabel", {
            Size=UDim2.new(1,0,0,26),
            Text="📭 Chưa có waypoint nào.",
            BackgroundTransparency=1, TextColor3=C.GRAY,
            Font=Enum.Font.GothamMedium, TextSize=10,
            TextXAlignment=Enum.TextXAlignment.Center, ZIndex=7,
        }, wpListFrame)
        supportTab.CanvasSize = UDim2.new(0, 0, 0, posY + 40)
        return
    end

    local totalH = 0
    for i, wp in ipairs(waypoints) do
        local row = New("Frame", {
            Size=UDim2.new(1,0,0,30),
            BackgroundColor3=Color3.fromRGB(26, 29, 38),
            BackgroundTransparency=0.1, BorderSizePixel=0, ZIndex=6,
        }, wpListFrame)
        Corner(row, UDim.new(0,5)); Stroke(row)

        New("TextLabel", {
            Size=UDim2.new(1,-120,1,0), Position=UDim2.new(0,8,0,0),
            Text=wp.name.." ("..string.format("%.0f, %.0f, %.0f", wp.pos.X, wp.pos.Y, wp.pos.Z)..")",
            BackgroundTransparency=1, TextColor3=C.DARK,
            Font=Enum.Font.GothamBold, TextSize=9,
            TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7,
        }, row)

        local goBtn = New("TextButton", {
            Size=UDim2.new(0,50,0,22), Position=UDim2.new(1,-84,0,4),
            Text="🚀 Tới", BackgroundColor3=C.GREEN, BackgroundTransparency=0.1,
            TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=9,
            BorderSizePixel=0, ZIndex=8,
        }, row)
        Corner(goBtn, UDim.new(0,4))
        goBtn.Activated:Connect(function()
            local rootPart = GetRootPart()
            if not rootPart then return end
            rootPart.CFrame = CFrame.new(wp.pos)
        end)

        local delBtn = New("TextButton", {
            Size=UDim2.new(0,26,0,22), Position=UDim2.new(1,-30,0,4),
            Text="🗑", BackgroundColor3=C.RED, BackgroundTransparency=0.1,
            TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=10,
            BorderSizePixel=0, ZIndex=8,
        }, row)
        Corner(delBtn, UDim.new(0,4))
        delBtn.Activated:Connect(function()
            table.remove(waypoints, i)
            RebuildWaypoints()
-- v4.4b: cho nút "🔄 Nạp lại" ở TAB2 gọi được (đóng gói qua Store vì lý do scope đã note ở đó)
Store.restoreWaypoints = RebuildWaypoints
            Store.saveSoon()
        end)

        totalH = totalH + 34
    end

    wpListFrame.Size = UDim2.new(1,-16,0,totalH)
    supportTab.CanvasSize = UDim2.new(0, 0, 0, posY + totalH + 20)
end

RebuildWaypoints()

-- ==================== TAB 4: AI AI — MINI WEB CHAT ====================
local aiTab = AddTab("AI AI", "🤖", 5)

aiTab.BackgroundTransparency = 1
aiTab.ScrollingDirection = Enum.ScrollingDirection.Y
aiTab.ScrollingEnabled = true
aiTab.ElasticBehavior = Enum.ElasticBehavior.Never
aiTab.AutomaticCanvasSize = Enum.AutomaticSize.Y
aiTab.CanvasSize = UDim2.new(0, 0, 0, 0)
aiTab.ScrollBarThickness = 5
aiTab.ScrollBarImageColor3=Color3.fromRGB(88, 108, 166)

local aiBG = New("Frame", {
    Size=UDim2.new(1, 0, 0, 0),
    Position=UDim2.new(0, 0, 0, 0),
    BackgroundColor3=Color3.fromRGB(15, 17, 22),
    BackgroundTransparency=0,
    BorderSizePixel=0,
    ZIndex=4,
    AutomaticSize=Enum.AutomaticSize.Y,
}, aiTab)

local aiInner = New("Frame", {
    Size=UDim2.new(1, 0, 0, 0),
    Position=UDim2.new(0, 0, 0, 0),
    BackgroundTransparency=1,
    BorderSizePixel=0,
    ZIndex=5,
    AutomaticSize=Enum.AutomaticSize.Y,
}, aiBG)
New("UIListLayout", {
    SortOrder=Enum.SortOrder.LayoutOrder,
    Padding=UDim.new(0,8),
    HorizontalAlignment=Enum.HorizontalAlignment.Center,
}, aiInner)
New("UIPadding", {
    PaddingTop=UDim.new(0,10),
    PaddingBottom=UDim.new(0,10),
    PaddingLeft=UDim.new(0,8),
    PaddingRight=UDim.new(0,8),
}, aiInner)

local headerFrame = New("Frame", {
    Size=UDim2.new(1,-16,0,56),
    BackgroundColor3=Color3.fromRGB(25, 28, 36),
    BackgroundTransparency=0,
    BorderSizePixel=0,
    ZIndex=6,
    LayoutOrder=1,
}, aiInner)
Corner(headerFrame, UDim.new(0,10))
Stroke(headerFrame, Color3.fromRGB(60, 70, 100), 1)

local logoCircle = New("Frame", {
    Size=UDim2.new(0,36,0,36),
    Position=UDim2.new(0,10,0,10),
    BackgroundColor3=Color3.fromRGB(100, 120, 240),
    BackgroundTransparency=0,
    BorderSizePixel=0,
    ZIndex=7,
}, headerFrame)
Corner(logoCircle, UDim.new(1,0))

New("TextLabel", {
    Size=UDim2.new(1,0,1,0),
    Text="🤖",
    BackgroundTransparency=1,
    TextColor3=C.WHITE,
    Font=Enum.Font.GothamBold,
    TextSize=18,
    ZIndex=8,
}, logoCircle)

New("TextLabel", {
    Size=UDim2.new(1,-70,0,20),
    Position=UDim2.new(0,56,0,10),
    Text="AI Mini — Gemini Assistant",
    BackgroundTransparency=1,
    TextColor3=Color3.fromRGB(240, 242, 250),
    Font=Enum.Font.GothamBold,
    TextSize=13,
    TextXAlignment=Enum.TextXAlignment.Left,
    ZIndex=7,
}, headerFrame)

local statusDot = New("Frame", {
    Size=UDim2.new(0,8,0,8),
    Position=UDim2.new(0,58,0,34),
    BackgroundColor3=C.GREEN,
    BackgroundTransparency=0,
    BorderSizePixel=0,
    ZIndex=7,
}, headerFrame)
Corner(statusDot, UDim.new(1,0))

local statusText = New("TextLabel", {
    Size=UDim2.new(1,-80,0,14),
    Position=UDim2.new(0,70,0,30),
    Text="Đang hoạt động",
    BackgroundTransparency=1,
    TextColor3=Color3.fromRGB(150, 222, 182),
    Font=Enum.Font.GothamMedium,
    TextSize=10,
    TextXAlignment=Enum.TextXAlignment.Left,
    ZIndex=7,
}, headerFrame)

local keyPanel = New("Frame", {
    Size=UDim2.new(1,-16,0,86),
    BackgroundColor3=Color3.fromRGB(25, 28, 36),
    BackgroundTransparency=0,
    BorderSizePixel=0,
    ZIndex=6,
    LayoutOrder=2,
}, aiInner)
Corner(keyPanel, UDim.new(0,10))
Stroke(keyPanel, Color3.fromRGB(60, 70, 100), 1)

New("TextLabel", {
    Size=UDim2.new(1,-20,0,16),
    Position=UDim2.new(0,10,0,6),
    Text="🔑 API KEY GEMINI",
    BackgroundTransparency=1,
    TextColor3=Color3.fromRGB(140, 160, 220),
    Font=Enum.Font.GothamBold,
    TextSize=9,
    TextXAlignment=Enum.TextXAlignment.Left,
    ZIndex=7,
}, keyPanel)

local apiKeyIn = New("TextBox", {
    Size=UDim2.new(1,-20,0,26),
    Position=UDim2.new(0,10,0,24),
    Text="",
    PlaceholderText="Dán API key Gemini vào đây...",
    PlaceholderColor3=Color3.fromRGB(110, 118, 136),
    BackgroundColor3=Color3.fromRGB(15, 17, 22),
    BackgroundTransparency=0,
    TextColor3=Color3.fromRGB(230, 235, 245),
    Font=Enum.Font.Code,
    TextSize=10,
    BorderSizePixel=0,
    ClearTextOnFocus=false,
    Active=true,
    Selectable=true,
    ZIndex=10,
    TextXAlignment=Enum.TextXAlignment.Left,
}, keyPanel)
Corner(apiKeyIn, UDim.new(0,6))
Stroke(apiKeyIn, Color3.fromRGB(70, 90, 150), 1.2)
New("UIPadding", {PaddingLeft=UDim.new(0,8)}, apiKeyIn)

local saveKeyBtn = New("TextButton", {
    Size=UDim2.new(0,70,0,22),
    Position=UDim2.new(0,10,0,56),
    Text="💾 Lưu",
    BackgroundColor3=Color3.fromRGB(72, 148, 248),
    BackgroundTransparency=0,
    TextColor3=C.WHITE,
    Font=Enum.Font.GothamBold,
    TextSize=9,
    BorderSizePixel=0,
    ZIndex=8,
}, keyPanel)
Corner(saveKeyBtn, UDim.new(0,5))

local clearKeyBtn = New("TextButton", {
    Size=UDim2.new(0,70,0,22),
    Position=UDim2.new(0,86,0,56),
    Text="🗑 Xóa",
    BackgroundColor3=Color3.fromRGB(226, 86, 92),
    BackgroundTransparency=0,
    TextColor3=C.WHITE,
    Font=Enum.Font.GothamBold,
    TextSize=9,
    BorderSizePixel=0,
    ZIndex=8,
}, keyPanel)
Corner(clearKeyBtn, UDim.new(0,5))

local toggleKeyBtn = New("TextButton", {
    Size=UDim2.new(0,70,0,22),
    Position=UDim2.new(0,162,0,56),
    Text="👁 Hiện",
    BackgroundColor3=Color3.fromRGB(240, 160, 70),
    BackgroundTransparency=0,
    TextColor3=C.WHITE,
    Font=Enum.Font.GothamBold,
    TextSize=9,
    BorderSizePixel=0,
    ZIndex=8,
}, keyPanel)
Corner(toggleKeyBtn, UDim.new(0,5))

local keyStatus = New("TextLabel", {
    Size=UDim2.new(1,-240,0,14),
    Position=UDim2.new(0,238,0,60),
    Text="",
    BackgroundTransparency=1,
    TextColor3=Color3.fromRGB(150, 222, 182),
    Font=Enum.Font.GothamMedium,
    TextSize=9,
    TextXAlignment=Enum.TextXAlignment.Left,
    ZIndex=7,
}, keyPanel)

local chatPanel = New("Frame", {
    Size=UDim2.new(1,-16,0,340),
    BackgroundColor3=Color3.fromRGB(25, 28, 36),
    BackgroundTransparency=0,
    BorderSizePixel=0,
    ZIndex=6,
    LayoutOrder=3,
}, aiInner)
Corner(chatPanel, UDim.new(0,10))
Stroke(chatPanel, Color3.fromRGB(60, 70, 100), 1)

local chatScroll = New("ScrollingFrame", {
    Size=UDim2.new(1,-16,1,-16),
    Position=UDim2.new(0,8,0,8),
    BackgroundColor3=Color3.fromRGB(15, 17, 22),
    BackgroundTransparency=0,
    BorderSizePixel=0,
    ZIndex=7,
    ScrollBarThickness=4,
    ScrollBarImageColor3=Color3.fromRGB(74, 92, 140),
    CanvasSize=UDim2.new(0,0,0,0),
    AutomaticCanvasSize=Enum.AutomaticSize.Y,
    ScrollingDirection=Enum.ScrollingDirection.Y,
    ScrollingEnabled=true,
    ElasticBehavior=Enum.ElasticBehavior.Never,
    ClipsDescendants=true,
    Active=true,
    Selectable=false,
}, chatPanel)
Corner(chatScroll, UDim.new(0,8))
New("UIPadding", {PaddingTop=UDim.new(0,8), PaddingBottom=UDim.new(0,8), PaddingLeft=UDim.new(0,8), PaddingRight=UDim.new(0,8)}, chatScroll)
New("UIListLayout", {
    SortOrder=Enum.SortOrder.LayoutOrder,
    Padding=UDim.new(0,8),
    HorizontalAlignment=Enum.HorizontalAlignment.Left,
}, chatScroll)

local function ParseSegments(text)
    local segments = {}
    local remaining = text
    while true do
        local startIdx, endIdx = remaining:find("```")
        if not startIdx then
            if #remaining > 0 then
                table.insert(segments, {type = "text", content = remaining})
            end
            break
        end
        local before = remaining:sub(1, startIdx - 1)
        if #before > 0 then
            table.insert(segments, {type = "text", content = before})
        end
        local rest = remaining:sub(endIdx + 1)
        local closeStart, closeEnd = rest:find("```")
        if not closeStart then
            table.insert(segments, {type = "code", content = rest})
            break
        end
        local codeContent = rest:sub(1, closeStart - 1)
        codeContent = codeContent:gsub("^%s*%a+%s*\n", "")
        table.insert(segments, {type = "code", content = codeContent})
        remaining = rest:sub(closeEnd + 1)
    end
    return segments
end

local function AddMessage(sender, text, isUser)
    local bubbleColor = isUser and Color3.fromRGB(50, 120, 220) or Color3.fromRGB(35, 40, 55)
    local textColor = isUser and C.WHITE or Color3.fromRGB(230, 235, 245)
    local align = isUser and Enum.TextXAlignment.Right or Enum.TextXAlignment.Left
    local sizeScale = isUser and 0.75 or 0.9

    local holder = New("Frame", {
        Size=UDim2.new(1,0,0,0),
        BackgroundTransparency=1,
        BorderSizePixel=0,
        ZIndex=8,
        AutomaticSize=Enum.AutomaticSize.Y,
    }, chatScroll)

    local bubble = New("Frame", {
        Size=UDim2.new(sizeScale,0,0,0),
        BackgroundColor3=bubbleColor,
        BackgroundTransparency=0,
        BorderSizePixel=0,
        ZIndex=9,
        AutomaticSize=Enum.AutomaticSize.Y,
    }, holder)
    Corner(bubble, UDim.new(0,10))

    if isUser then
        bubble.Position = UDim2.new(1-sizeScale, 0, 0, 0)
    end

    local senderLbl = New("TextLabel", {
        Size=UDim2.new(1,-16,0,12),
        Position=UDim2.new(0,8,0,-14),
        Text=sender,
        BackgroundTransparency=1,
        TextColor3=isUser and Color3.fromRGB(150, 180, 240) or Color3.fromRGB(140, 200, 160),
        Font=Enum.Font.GothamBold,
        TextSize=8,
        TextXAlignment=align,
        ZIndex=10,
    }, bubble)

    local contentContainer = New("Frame", {
        Size=UDim2.new(1,-16,0,0),
        Position=UDim2.new(0,8,0,4),
        BackgroundTransparency=1,
        BorderSizePixel=0,
        ZIndex=10,
        AutomaticSize=Enum.AutomaticSize.Y,
    }, bubble)
    New("UIListLayout", {
        SortOrder=Enum.SortOrder.LayoutOrder,
        Padding=UDim.new(0,4),
    }, contentContainer)
    New("UIPadding", {
        PaddingBottom=UDim.new(0,6),
    }, contentContainer)

    local segments
    if isUser then
        segments = {{type = "text", content = text}}
    else
        segments = ParseSegments(text)
    end

    for idx, seg in ipairs(segments) do
        if seg.type == "code" then
            local codeFrame = New("Frame", {
                Size=UDim2.new(1,0,0,0),
                BackgroundColor3=Color3.fromRGB(12, 14, 18),
                BackgroundTransparency=0,
                BorderSizePixel=0,
                ZIndex=11,
                LayoutOrder=idx,
                AutomaticSize=Enum.AutomaticSize.Y,
            }, contentContainer)
            Corner(codeFrame, UDim.new(0,6))
            Stroke(codeFrame, Color3.fromRGB(70, 90, 150), 1)

            local codeLbl = New("TextBox", {
                Size=UDim2.new(1,-16,0,0),
                Position=UDim2.new(0,8,0,8),
                Text=seg.content,
                BackgroundTransparency=1,
                TextColor3=Color3.fromRGB(180, 230, 180),
                Font=Enum.Font.Code,
                TextSize=11,
                TextXAlignment=Enum.TextXAlignment.Left,
                TextYAlignment=Enum.TextYAlignment.Top,
                TextWrapped=true,
                MultiLine=true,
                TextEditable=false,
                ClearTextOnFocus=false,
                Active=true,
                Selectable=true,
                ZIndex=12,
                AutomaticSize=Enum.AutomaticSize.Y,
            }, codeFrame)
            New("UIPadding", {
                PaddingBottom=UDim.new(0,8),
            }, codeFrame)
        else
            local textLbl = New("TextLabel", {
                Size=UDim2.new(1,0,0,0),
                BackgroundTransparency=1,
                Text=seg.content,
                TextColor3=textColor,
                Font=Enum.Font.GothamMedium,
                TextSize=11,
                TextXAlignment=align,
                TextYAlignment=Enum.TextYAlignment.Top,
                TextWrapped=true,
                ZIndex=10,
                LayoutOrder=idx,
                AutomaticSize=Enum.AutomaticSize.Y,
            }, contentContainer)
        end
    end

    task.defer(function()
        task.wait(0.1)
        local maxY = math.max(0, chatScroll.AbsoluteCanvasSize.Y - chatScroll.AbsoluteWindowSize.Y)
        chatScroll.CanvasPosition = Vector2.new(0, maxY)
    end)

    return holder
end

AddMessage("🤖 Gemini", "Xin chào! Tôi là AI Mini. Hãy nhập API key ở trên (nếu chưa có) rồi đặt câu hỏi bên dưới nhé!", false)

local inputBar = New("Frame", {
    Size=UDim2.new(1,-16,0,36),
    BackgroundColor3=Color3.fromRGB(25, 28, 36),
    BackgroundTransparency=0,
    BorderSizePixel=0,
    ZIndex=6,
    LayoutOrder=4,
}, aiInner)
Corner(inputBar, UDim.new(0,10))
Stroke(inputBar, Color3.fromRGB(60, 70, 100), 1)

local questionIn = New("TextBox", {
    Size=UDim2.new(1,-70,1,-10),
    Position=UDim2.new(0,8,0,5),
    Text="",
    PlaceholderText="Nhập câu hỏi...",
    PlaceholderColor3=Color3.fromRGB(110, 118, 136),
    BackgroundColor3=Color3.fromRGB(15, 17, 22),
    BackgroundTransparency=0,
    TextColor3=Color3.fromRGB(230, 235, 245),
    Font=Enum.Font.GothamMedium,
    TextSize=11,
    BorderSizePixel=0,
    ClearTextOnFocus=false,
    ZIndex=10,
    TextXAlignment=Enum.TextXAlignment.Left,
    TextYAlignment=Enum.TextYAlignment.Center,
}, inputBar)
Corner(questionIn, UDim.new(0,6))
New("UIPadding", {PaddingLeft=UDim.new(0,8)}, questionIn)

local sendBtn = New("TextButton", {
    Size=UDim2.new(0,54,1,-10),
    Position=UDim2.new(1,-62,0,5),
    Text="➤",
    BackgroundColor3=Color3.fromRGB(72, 148, 248),
    BackgroundTransparency=0,
    TextColor3=C.WHITE,
    Font=Enum.Font.GothamBold,
    TextSize=16,
    BorderSizePixel=0,
    ZIndex=8,
}, inputBar)
Corner(sendBtn, UDim.new(0,6))

local toolBar = New("Frame", {
    Size=UDim2.new(1,-16,0,30),
    BackgroundTransparency=1,
    BorderSizePixel=0,
    ZIndex=6,
    LayoutOrder=5,
}, aiInner)
New("UIListLayout", {
    FillDirection=Enum.FillDirection.Horizontal,
    SortOrder=Enum.SortOrder.LayoutOrder,
    Padding=UDim.new(0,6),
}, toolBar)

local copyAnswerBtn = New("TextButton", {
    Size=UDim2.new(0,120,1,0),
    Text="📋 Copy chat",
    BackgroundColor3=Color3.fromRGB(72, 148, 248),
    BackgroundTransparency=0,
    TextColor3=C.WHITE,
    Font=Enum.Font.GothamBold,
    TextSize=9,
    BorderSizePixel=0,
    ZIndex=7,
}, toolBar)
Corner(copyAnswerBtn, UDim.new(0,6))

local continueBtn = New("TextButton", {
    Size=UDim2.new(0,120,1,0),
    Text="▶ Viết tiếp",
    BackgroundColor3=Color3.fromRGB(240, 160, 70),
    BackgroundTransparency=0,
    TextColor3=C.WHITE,
    Font=Enum.Font.GothamBold,
    TextSize=9,
    BorderSizePixel=0,
    ZIndex=7,
}, toolBar)
Corner(continueBtn, UDim.new(0,6))

local clearChatBtn = New("TextButton", {
    Size=UDim2.new(0,120,1,0),
    Text="🧹 Xóa chat",
    BackgroundColor3=Color3.fromRGB(226, 86, 92),
    BackgroundTransparency=0,
    TextColor3=C.WHITE,
    Font=Enum.Font.GothamBold,
    TextSize=9,
    BorderSizePixel=0,
    ZIndex=7,
}, toolBar)
Corner(clearChatBtn, UDim.new(0,6))

local apiKeyFile = "banana_cat_gemini_key.txt"

local function SaveApiKey(key)
    if writefile then
        pcall(writefile, apiKeyFile, key)
    end
    _G.BananaCatHub_GeminiKey = key
end

local function LoadApiKey()
    -- v4.3 doc _G TRUOC file. Ma _G la moi truong chung voi moi script khac dang chay
    -- (hub nay con nap Dex/Infinite Yield/SimpleSpy tu GitHub vao cung _G do) -> script khac
    -- co the tiem key gia va chuyen huong toan bo request AI. Nay uu tien file, _G chi la fallback.
    if readfile and isfile then
        local ok, data = pcall(function()
            if isfile(apiKeyFile) then
                return readfile(apiKeyFile)
            end
            return nil
        end)
        if ok and data and #data > 0 then
            _G.BananaCatHub_GeminiKey = data
            return data
        end
    end
    if _G.BananaCatHub_GeminiKey then
        return _G.BananaCatHub_GeminiKey
    end
    return nil
end

local function MaskKey(key)
    if not key or #key == 0 then return "" end
    -- Bản cũ: key ngắn hơn 8 ký tự được trả về NGUYÊN VĂN -> lộ hoàn toàn.
    if #key <= 8 then return string.rep("•", #key) end
    return key:sub(1, 4)..string.rep("•", math.min(#key - 8, 20))..key:sub(-4)
end

local loadedKey = LoadApiKey()
if loadedKey and #loadedKey > 0 then
    apiKeyIn.Text = loadedKey
    keyStatus.Text = "✅ Đã tải: "..MaskKey(loadedKey)
else
    keyStatus.Text = "⚠️ Chưa có key"
end

local keyVisible = true

saveKeyBtn.Activated:Connect(function()
    -- LỖI NGHIÊM TRỌNG ở v4.3: khi key đang ở chế độ "🙈 Ẩn", ô nhập chứa CHUỖI ĐÃ CHE
    -- (vd "AIza••••••••xK9d"). Bấm "💾 Lưu" sẽ ghi chuỗi che đó đè lên key thật
    -- ở CẢ file lẫn _G -> API key bị phá hủy vĩnh viễn.
    if not keyVisible then
        keyStatus.Text = "⚠️ Key đang ẨN — bấm '👁 Hiện' rồi mới bấm Lưu!"
        return
    end
    local k = apiKeyIn.Text
    if #k == 0 then
        keyStatus.Text = "⚠️ Nhập key trước!"
        return
    end
    if k:find("•", 1, true) then
        keyStatus.Text = "⚠️ Đây là chuỗi đã che, không phải key thật!"
        return
    end
    SaveApiKey(k)
    keyStatus.Text = "✅ Đã lưu: "..MaskKey(k)
end)

clearKeyBtn.Activated:Connect(function()
    apiKeyIn.Text = ""
    _G.BananaCatHub_GeminiKey = nil
    if delfile then
        pcall(delfile, apiKeyFile)
    end
    keyStatus.Text = "🗑 Đã xóa key"
end)

toggleKeyBtn.Activated:Connect(function()
    keyVisible = not keyVisible
    if keyVisible then
        apiKeyIn.Text = LoadApiKey() or ""
        toggleKeyBtn.Text = "👁 Hiện"
    else
        apiKeyIn.Text = MaskKey(LoadApiKey() or "")
        toggleKeyBtn.Text = "🙈 Ẩn"
    end
end)

-- LỊCH SỬ HỘI THOẠI: v4.3 chỉ gửi đúng 1 tin nhắn hiện tại lên Gemini, nên nút "▶ Viết tiếp"
-- hoàn toàn vô dụng (model không biết "câu trả lời trước" là gì). Đây là mảng chứa các lượt cũ.
local chatHistory = {}
local HISTORY_CHAR_BUDGET = 60000   -- chặn không cho request phình quá to
local HISTORY_MAX_TURNS   = 40      -- 40 message = 20 lượt hỏi/đáp

local SYSTEM_PROMPT = [[Bạn là trợ lý lập trình chuyên nghiệp cho Roblox Lua.

QUY TẮC BẮT BUỘC:
1. Khi người dùng yêu cầu viết code/script, PHẢI viết ĐẦY ĐỦ, HOÀN CHỈNH, có thể chạy được ngay.
2. TUYỆT ĐỐI KHÔNG dùng "..." hoặc "-- tiếp tục" hoặc "phần còn lại tương tự" để rút gọn code.
3. Nếu code quá dài, hãy chia thành nhiều khối ```lua ... ``` riêng biệt và viết hết tất cả.
4. KHÔNG giải thích dài dòng. Chỉ viết code + vài dòng ghi chú ngắn.
5. Code phải dùng đúng API Roblox Lua, không dùng Python/JavaScript.
6. Nếu người dùng hỏi bằng tiếng Việt, trả lời bằng tiếng Việt.
7. Nếu câu hỏi không liên quan lập trình, trả lời ngắn gọn, trực tiếp.

QUY TẮC ĐẶC BIỆT CHO GUI (RẤT QUAN TRỌNG):
- Khi viết script tạo GUI (như bảng định vị người chơi, ESP, thông tin...), PHẢI dùng cấu trúc GUI TỰ DÃN THEO CHA.
- Frame chính phải có: Size = UDim2.new(1, 0, 1, 0), Position = UDim2.new(0, 0, 0, 0).
- KHÔNG hard-code kích thước như UDim2.new(0, 300, 0, 200).
- Nếu cần viền hay padding, dùng UIPadding bên trong, KHÔNG thay đổi Size của Frame chính.
- Điều này để khi menu chính của hub kéo to ra, GUI này cũng tự dãn theo.
- Nếu script dùng ScreenGui riêng, hãy đặt Parent là CoreGui hoặc PlayerGui và dùng Size tự dãn.]]

local function AskGemini(question)
    local key = LoadApiKey()
    if not key or #key == 0 then
        return false, "⚠️ Chưa có API key. Vui lòng nhập và lưu key trước!"
    end
    if #question == 0 then
        return false, "⚠️ Vui lòng nhập câu hỏi!"
    end

    pcall(function()
        if HttpService.HttpEnabled == false then
            HttpService.HttpEnabled = true
        end
    end)

    local url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key="..key

    -- Dựng contents từ lịch sử cũ + câu hỏi mới (duyệt từ mới nhất ngược về, trong hạn mức ký tự)
    local contents = {}
    do
        local used = 0
        local picked = {}
        for i = #chatHistory, 1, -1 do
            local m = chatHistory[i]
            local len = #(m.text or "")
            if used + len > HISTORY_CHAR_BUDGET then break end
            used = used + len
            table.insert(picked, 1, {role = m.role, parts = {{text = m.text}}})
        end
        for _, m in ipairs(picked) do
            table.insert(contents, m)
        end
    end
    table.insert(contents, {role = "user", parts = {{text = question}}})

    local body = HttpService:JSONEncode({
        system_instruction = {
            parts = {
                { text = SYSTEM_PROMPT }
            }
        },
        contents = contents,
        generationConfig = {
            temperature = 0.7,
            topP = 0.95,
            topK = 40,
            maxOutputTokens = 8192,
            candidateCount = 1
        },
        safetySettings = {
            { category = "HARM_CATEGORY_HARASSMENT", threshold = "BLOCK_NONE" },
            { category = "HARM_CATEGORY_HATE_SPEECH", threshold = "BLOCK_NONE" },
            { category = "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold = "BLOCK_NONE" },
            { category = "HARM_CATEGORY_DANGEROUS_CONTENT", threshold = "BLOCK_NONE" }
        }
    })

    local maxRetries = 3
    local baseDelay = 2

    for attempt = 1, maxRetries do
        local ok, result = pcall(function()
            return HttpService:RequestAsync({
                Url = url,
                Method = "POST",
                Headers = {
                    ["Content-Type"] = "application/json"
                },
                Body = body
            })
        end)

        if not ok then
            return false, "❌ Lỗi kết nối: "..tostring(result)
        end

        if result.Success then
            local parseOk, data = pcall(function()
                return HttpService:JSONDecode(result.Body)
            end)

            if not parseOk then
                return false, "❌ Không parse được JSON trả về"
            end

            if data.error then
                return false, "❌ API Error: "..tostring(data.error.message or "unknown")
            end

            if not (data.candidates and data.candidates[1]) then
                return false, "❌ Không có candidates trong phản hồi"
            end

            local cand = data.candidates[1]
            local finishReason = cand.finishReason or "STOP"

            local fullText = ""
            if cand.content and cand.content.parts then
                for _, part in ipairs(cand.content.parts) do
                    if part.text then
                        fullText = fullText .. part.text
                    end
                end
            end

            if #fullText == 0 then
                if finishReason == "SAFETY" then
                    return false, "⚠️ Gemini từ chối trả lời vì lý do an toàn (SAFETY). Hãy thử diễn đạt lại câu hỏi."
                elseif finishReason == "RECITATION" then
                    return false, "⚠️ Gemini dừng vì lý do bản quyền (RECITATION)."
                else
                    return false, "❌ Không có text trong phản hồi. finishReason = "..tostring(finishReason)
                end
            end

            if finishReason == "MAX_TOKENS" then
                fullText = fullText .. "\n\n⚠️ [AI bị cắt do giới hạn token. Hãy gõ 'viết tiếp phần còn lại' hoặc bấm nút '▶ Viết tiếp' để lấy code tiếp.]"
            end

            return true, fullText
        end

        if result.StatusCode == 429 then
            if attempt < maxRetries then
                local waitTime = baseDelay * (2 ^ (attempt - 1))
                pcall(function()
                    statusText.Text = string.format("⏳ Bị giới hạn (429). Chờ %ds rồi thử lại (%d/%d)...", waitTime, attempt, maxRetries)
                    statusDot.BackgroundColor3 = C.YELLOW
                end)
                task.wait(waitTime)
            else
                local bodyPreview = result.Body and tostring(result.Body):sub(1, 400) or ""
                return false, "❌ HTTP 429 — Vượt giới hạn yêu cầu/phút của Gemini (gói miễn phí ~10-15 RPM).\n\nVui lòng chờ khoảng 1 phút rồi gửi lại.\nHoặc nâng cấp API key lên gói trả phí để tăng giới hạn.\n\n"..bodyPreview
            end
        else
            local bodyPreview = result.Body and tostring(result.Body):sub(1, 500) or ""
            return false, "❌ HTTP "..tostring(result.StatusCode)..": "..tostring(result.StatusMessage).."\n"..bodyPreview
        end
    end

    return false, "❌ Không thể kết nối sau nhiều lần thử."
end

local isSending = false

local function SendQuestion()
    if isSending then return end
    local q = questionIn.Text
    if #q == 0 then
        return
    end

    isSending = true
    questionIn.Text = ""
    statusText.Text = "Đang suy nghĩ..."
    statusDot.BackgroundColor3 = C.YELLOW

    AddMessage("👤 Bạn", q, true)

    task.spawn(function()
        local startTime = tick()
        local ok, response = AskGemini(q)
        local elapsed = tick() - startTime

        if ok then
            -- Ghi 2 lượt vào lịch sử để lượt sau (và nút "Viết tiếp") còn biết ngữ cảnh
            table.insert(chatHistory, {role = "user",  text = q})
            table.insert(chatHistory, {role = "model", text = response})
            while #chatHistory > HISTORY_MAX_TURNS do
                table.remove(chatHistory, 1)
            end
            AddMessage("🤖 Gemini", response, false)
            statusText.Text = string.format("Đang hoạt động (%.1fs)", elapsed)
            statusDot.BackgroundColor3 = C.GREEN
        else
            AddMessage("⚠️ Lỗi", response, false)
            statusText.Text = "Lỗi kết nối"
            statusDot.BackgroundColor3 = C.RED
        end
        isSending = false
        task.wait(0.15)
        local maxY = math.max(0, chatScroll.AbsoluteCanvasSize.Y - chatScroll.AbsoluteWindowSize.Y)
        chatScroll.CanvasPosition = Vector2.new(0, maxY)
    end)
end

sendBtn.Activated:Connect(SendQuestion)
questionIn.FocusLost:Connect(function(enter)
    if enter then
        SendQuestion()
    end
end)

continueBtn.Activated:Connect(function()
    if isSending then return end
    questionIn.Text = "Viết tiếp phần code còn lại của câu trả lời trước, KHÔNG lặp lại phần đã viết. Viết đầy đủ, không rút gọn."
    SendQuestion()
end)

copyAnswerBtn.Activated:Connect(function()
    local allText = ""
    local function extract(obj)
        local res = ""
        for _, c in ipairs(obj:GetChildren()) do
            if c:IsA("TextBox") and c.TextEditable == false then
                res = res..c.Text.."\n"
            elseif c:IsA("TextLabel") then
                res = res..c.Text.."\n"
            end
            if #c:GetChildren() > 0 then
                res = res..extract(c)
            end
        end
        return res
    end
    for _, child in ipairs(chatScroll:GetChildren()) do
        if child:IsA("Frame") then
            allText = allText..extract(child).."\n"
        end
    end
    if setclipboard then
        pcall(setclipboard, allText)
    elseif toclipboard then
        pcall(toclipboard, allText)
    end
    copyAnswerBtn.Text = "✅ Đã copy!"
    task.delay(1.5, function()
        if copyAnswerBtn and copyAnswerBtn.Parent then
            copyAnswerBtn.Text = "📋 Copy chat"
        end
    end)
end)

clearChatBtn.Activated:Connect(function()
    for _, child in ipairs(chatScroll:GetChildren()) do
        if not child:IsA("UIListLayout") and not child:IsA("UIPadding") then
            child:Destroy()
        end
    end
    chatHistory = {}   -- xóa cả ngữ cảnh gửi lên model, không chỉ xóa bong bóng trên UI
    AddMessage("🤖 Gemini", "Cuộc trò chuyện đã được xóa. Hãy đặt câu hỏi mới!", false)
    task.wait(0.1)
    chatScroll.CanvasPosition = Vector2.new(0, 0)
end)

aiTab.CanvasSize = UDim2.new(0, 0, 0, 0)
aiInner:GetPropertyChangedSignal("AbsoluteSize"):Connect(function()
    aiTab.CanvasSize = UDim2.new(0, 0, 0, aiInner.AbsoluteSize.Y + 20)
end)
task.defer(function()
    task.wait(0.5)
    aiTab.CanvasSize = UDim2.new(0, 0, 0, aiInner.AbsoluteSize.Y + 20)
end)

-- ==================== TAB 5: TẠO TÍNH NĂNG ====================
-- (featureTabs / featureTabIndex đã khai báo ở ĐẦU file để khối lưu trữ dùng chung.
--  KHÔNG khai báo lại ở đây, nếu không sẽ tạo biến local mới che mất biến cũ
--  và danh sách tab tính năng sẽ không bao giờ được ghi xuống đĩa.)

local function NormalizeCode(c)
    if type(c) ~= "string" then return "" end
    c = S.SanitizeCode(c)   -- v4.4b: cắt wrapper "SIZE WRAPPER" cũ (nó đè layout GUI của game)
    if c:match("^https?://") then
        -- CHẶN: URL có " hoặc xuống dòng sẽ phá vỡ (hoặc chèn code vào) chuỗi sinh ra bên dưới
        if c:find('[%c"\\]', 1) then
            warn("[BananaCatHub] Link không hợp lệ (chứa ký tự xuống dòng/\") -> dùng nguyên văn")
            return c
        end
        return 'loadstring(game:HttpGet("'..c..'"))()'
    end
    return c
end

-- v4.4b: chỉ lấy GUI ở PlayerGui của game + container của hub (KHÔNG quét CoreGui nữa —
-- CoreGui là nơi game và script khác đựng UI; bốc nhầm GUI của game là MẤT NÚT BẮN/MENU).
-- GUI "lạ" còn phải qua 2 điều kiện: có ít nhất 1 GuiObject con và tên không nằm trong danh
-- sách UI hệ thống. GUI mà hook Instance.new bắt được (mine) luôn được nhận — đó mới là của ta.
local GAME_OWNED_GUI_NAMES = {
    Topbar = true, TopbarContainer = true, PlayerList = true, Chat = true,
    Backpack = true, DevConsoleUI = true, ScriptInvitationUI = true,
    FollowPromptUI = true, TouchControlsFrame = true, Main = true, ExMenu = true,
    Notifications = true, PauseMenu = true, InGame = true, CoreGui = true,
}

-- allowGuess=false: CHỈ nhận GUI mà hook bắt được (an toàn tuyệt đối, không bao giờ ăn GUI game)
-- allowGuess=true : nhận thêm ScreenGui mới xuất hiện ở PlayerGui (GUI script tạo trễ),
--                   vẫn chặn tên hệ thống + không quét CoreGui.
local function ScanNewGuis(beforeGuis, mine, allowGuess)
    local found, seen = {}, {}
    local function take(g)
        if not g or seen[g] then return end
        seen[g] = true
        table.insert(found, g)
    end
    if mine then
        for _, g in ipairs(mine) do
            if g:IsA("ScreenGui") or g:IsA("Folder") then take(g) end
        end
    end
    local function scan(container)
        if not container then return end
        for _, g in ipairs(container:GetChildren()) do
            if not beforeGuis[g] then
                beforeGuis[g] = true
                if allowGuess and (g:IsA("ScreenGui") or g:IsA("Folder")) and not GAME_OWNED_GUI_NAMES[g.Name] then
                    local hasGuiChild = false
                    for _, c in ipairs(g:GetChildren()) do
                        if c:IsA("GuiObject") then hasGuiChild = true break end
                    end
                    if hasGuiChild then take(g) end
                end
            end
        end
    end
    scan(playerGui)
    if targetGui ~= playerGui then scan(targetGui) end
    return found
end

-- v4.4b: MẶC ĐỊNH CHỈ chỉnh CHÍNH nó (root). Bản cũ ĐỆ QUY vào mọi con và ép từng frame về
-- Size=(1,0,1,0)+Position=(0,0) -> sập layout lồng nhau, và tệ hơn: một Frame trong suốt bé xíu
-- trở thành full-màn-hình, Active, NUỐT hết click của game (không quay chuột/không bắn được).
-- Muốn phục hồi kiểu cũ thì gọi ForceStretchToParent(obj, 99) — nhưng đừng.
local function ForceStretchToParent(obj, maxDepth)
    if not obj then return end
    maxDepth = maxDepth or 0
    pcall(function()
        if obj:IsA("GuiObject") then
            if obj:IsA("Frame") or obj:IsA("ScrollingFrame") or obj:IsA("CanvasGroup") then
                local s = obj.Size
                if s.X.Scale < 0.9 and s.X.Offset > 0 then
                    obj.Size = UDim2.new(1, 0, s.Y.Scale > 0 and s.Y.Scale or 1, 0)
                end
                if obj.Position.X.Offset ~= 0 or obj.Position.Y.Offset ~= 0 then
                    obj.Position = UDim2.new(0, 0, 0, 0)
                end
            end
        end
    end)
    if maxDepth <= 0 then return end
    for _, child in ipairs(obj:GetChildren()) do
        ForceStretchToParent(child, maxDepth - 1)
    end
end

-- ==================== NHÚNG GUI: ĐĂNG KÝ / TRẠNG THÁI / HOÀN TÁC ====================
-- Mọi thứ gắn vào bảng S (không thêm local cấp cao nhất — đã ~184/200 slot).
--
-- Mô hình mới: GUI của script bạn chạy VẪN NẰM Y NGUYÊN chỗ cũ (PlayerGui), hub chỉ
-- "mượn" các frame con của nó đặt vào tab, và GHI LẠI Position/Size/Parent gốc để trả về
-- khi bạn bấm ✕. ScreenGui gốc KHÔNG bị Destroy nên `gui.Enabled`, `gui:Destroy()`,
-- `gui.Parent = nil`... trong script của bạn còn tác dụng (hub bắt tín hiệu phản chiếu).
function S.RegisterEmbed(host, gui, recs)
    local entry = {host = host, gui = gui, recs = recs or {}, conns = {}}
    -- mỗi connection pcall RIÊNG: Folder không có property Enabled -> nếu gom chung một pcall
    -- thì connection cuối (Destroying) bị bỏ luôn, tab sẽ không tự dọn khi script Destroy GUI.
    pcall(function()
        entry.conns[#entry.conns+1] = gui:GetPropertyChangedSignal("Enabled"):Connect(function()
            pcall(function() host.Visible = gui.Enabled end)
        end)
    end)
    pcall(function()
        entry.conns[#entry.conns+1] = gui:GetPropertyChangedSignal("Parent"):Connect(function()
            pcall(function() host.Visible = (gui.Parent ~= nil) and gui.Enabled end)
        end)
    end)
    -- script tự Destroy GUI -> hub dọn host, không để lại khung rỗng
    pcall(function()
        entry.conns[#entry.conns+1] = gui.Destroying:Connect(function()
            S.DropEmbed(entry, true)
        end)
    end)
    S.embeds[#S.embeds+1] = entry
    return entry
end

function S.FindEmbedByHost(host)
    for i, e in ipairs(S.embeds) do
        if e.host == host then return e, i end
    end
    return nil
end

function S.RemoveEmbedAt(i)
    local e = S.embeds[i]
    if not e then return end
    for _, c in ipairs(e.conns) do pcall(function() c:Disconnect() end) end
    table.remove(S.embeds, i)
    return e
end

-- Xóa host nhưng KHÔNG trả GUI về (dùng khi chính GUI đã bị Destroy)
function S.DropEmbed(entry, keepQuiet)
    for i, e in ipairs(S.embeds) do
        if e == entry then S.RemoveEmbedAt(i); break end
    end
    pcall(function() if entry.host and entry.host.Parent then entry.host:Destroy() end end)
    if not keepQuiet then
        print("[BananaCatHub] Đã gỡ host nhúng khỏi tab")
    end
end

-- Trả toàn bộ frame con về ScreenGui gốc + khôi phục Position/Size -> GUI y như lúc chưa nhúng
function S.RestoreEmbed(entry)
    -- 1) khôi phục mọi giá trị mà hub đã scale (Position/Size/TextSize/UIPadding/...)
    pcall(function() S.RestoreSnap(entry) end)
    entry.snap = nil
    -- 2) rồi mới trả Parent các frame con về ScreenGui gốc. Sau bước 1, Size/Position của chúng
    --    đã là bản gốc do script đó dùng, nên không cần (và không nên) ghi đè thêm lần nữa.
    for _, rec in ipairs(entry.recs or {}) do
        pcall(function()
            if rec.obj and rec.origParent then
                rec.obj.Parent = rec.origParent
            end
        end)
    end
    for i, e in ipairs(S.embeds) do
        if e == entry then S.RemoveEmbedAt(i); break end
    end
    pcall(function() if entry.host and entry.host.Parent then entry.host:Destroy() end end)
end

-- Dọn các entry đã chết (host/gui bị Destroy từ ngoài) — chống _G leak của bản cũ
function S.PruneEmbeds()
    for i = #S.embeds, 1, -1 do
        local e = S.embeds[i]
        local hostAlive = e.host and e.host.Parent
        local guiAlive = e.gui and e.gui.Parent
        if not hostAlive or not guiAlive then
            if hostAlive then pcall(function() e.host:Destroy() end) end
            S.RemoveEmbedAt(i)
        end
    end
end

-- ===== FIT: co/giãn GUI của tab cho VỪA KHÍT vùng tab =====
-- Cách làm: nhân ĐỒNG ĐỀU mọi Offset (Size + Position + UICorner/UIPadding/UIStroke + TextSize)
-- của cả subtree lên cùng 1 hệ số s, rồi tịnh tiến khung nội dung về góc tab (canh giữa nếu còn
-- chỗ trống). KHÔNG có chuyện "ép Size=(1,0,1,0)" từng frame như bản 4.4a -> layout tương đối
-- được giữ nguyên (tỉ lệ giữa các phần tử không đổi), chỉ to/nhỏ theo menu chính.
-- Vì s được tính từ bounding box nên nội dung sau khi fit NẰM TRONG tab -> không thể tràn ra
-- ngoài và nuốt click của game (điểm mà bản 4.4a làm ngược).

-- Đo khung bao của các frame con trực tiếp của host (toạ độ tuyệt đối -> tính theo host)
function S.MeasureHost(host)
    local hx, hy = host.AbsolutePosition.X, host.AbsolutePosition.Y
    local minX, minY, maxX, maxY = math.huge, math.huge, -math.huge, -math.huge
    local n = 0
    for _, ch in ipairs(host:GetChildren()) do
        if ch:IsA("GuiObject") and ch.Visible ~= false then
            local p, sz = ch.AbsolutePosition, ch.AbsoluteSize
            if p and sz then
                minX = math.min(minX, p.X); minY = math.min(minY, p.Y)
                maxX = math.max(maxX, p.X + sz.X); maxY = math.max(maxY, p.Y + sz.Y)
                n = n + 1
            end
        end
    end
    if n == 0 or maxX <= minX or maxY <= minY then return nil end
    return { x = minX - hx, y = minY - hy, w = maxX - minX, h = maxY - minY }
end

-- Chụp lại mọi giá trị gốc của subtree (để trả về NGUYÊN TRẠNG khi rút khỏi tab)
function S.SnapSubtree(list, node, isTop)
    for _, c in ipairs(node:GetChildren()) do
        if c:IsA("GuiObject") then
            list[#list+1] = {
                obj = c, top = isTop or nil,
                Position = c.Position, Size = c.Size,
                TextSize = ((c.TextSize and c.TextSize > 0) and not c.TextScaled) and c.TextSize or nil,
            }
            S.SnapSubtree(list, c, false)
        elseif c:IsA("UICorner") then
            list[#list+1] = { obj = c, CornerRadius = c.CornerRadius }
        elseif c:IsA("UIPadding") then
            list[#list+1] = { obj = c,
                PadT = c.PaddingTop, PadB = c.PaddingBottom,
                PadL = c.PaddingLeft, PadR = c.PaddingRight }
        elseif c:IsA("UIStroke") then
            list[#list+1] = { obj = c, Thick = c.Thickness }
        end
    end
end

function S.RestoreSnap(entry)
    if not entry.snap then return end
    for _, rec in ipairs(entry.snap) do
        local o = rec.obj
        if o and o.Parent then
            pcall(function()
                if rec.Position then o.Position = rec.Position end
                if rec.Size then o.Size = rec.Size end
                if rec.TextSize then o.TextSize = rec.TextSize end
                if rec.CornerRadius then o.CornerRadius = rec.CornerRadius end
                if rec.PadT then
                    o.PaddingTop, o.PaddingBottom = rec.PadT, rec.PadB
                    o.PaddingLeft, o.PaddingRight = rec.PadL, rec.PadR
                end
                if rec.Thick then o.Thickness = rec.Thick end
            end)
        end
    end
end

function S.FitEmbedded(entry)
    local host, gui = entry.host, entry.gui
    if not host or not host.Parent then return end
    -- 3 helper này đặt TRONG hàm để không tốn slot local của main chunk (Luau ~200 slot/chunk)
    local function mulUDim(u, k)
        return UDim2.new(u.X.Scale, math.floor(u.X.Offset * k + 0.5),
                         u.Y.Scale, math.floor(u.Y.Offset * k + 0.5))
    end
    local function mulUDimShift(u, k, dx, dy)
        return UDim2.new(u.X.Scale, math.floor(u.X.Offset * k + 0.5) + dx,
                         u.Y.Scale, math.floor(u.Y.Offset * k + 0.5) + dy)
    end
    local function mulDim(u, k)
        return UDim.new(u.Scale, math.floor(u.Offset * k + 0.5))
    end

    local area = host.Parent                      -- embedHost trong tab
    local aw = area.AbsoluteSize.X - 6
    local ah = area.AbsoluteSize.Y - 6
    if aw < 40 or ah < 40 then return end

    pcall(function()
        host.Size = UDim2.new(1, 0, 1, 0)
        host.Position = UDim2.new(0, 0, 0, 0)
        host.BackgroundTransparency = 1
        host.ClipsDescendants = true              -- phần dư (nếu có) vừa vô hình vừa không nhận click
    end)

    if not entry.snap then
        entry.snap = {}
        S.SnapSubtree(entry.snap, host, true)
        if #entry.snap == 0 then return end
    end

    -- 1) đưa về mốc gốc (idempotent: gọi lại sau khi kéo to menu không cộng dồn scale)
    S.RestoreSnap(entry)
    local base = S.MeasureHost(host)
    if not base then return end

    -- 2) hệ số vừa khít: cho phép PHÓNG TO (GUI bé cũng llen bằng menu) lẫn co lại
    local s = math.clamp(math.min(aw / base.w, ah / base.h), 0.35, 3.0)

    local function apply(k)
        for _, rec in ipairs(entry.snap) do
            local o = rec.obj
            if o and o.Parent then
                pcall(function()
                    if rec.Size then o.Size = mulUDim(rec.Size, k) end
                    if rec.Position then
                        if rec.top then
                            o.Position = mulUDimShift(rec.Position, k, rec.dx or 0, rec.dy or 0)
                        else
                            o.Position = mulUDim(rec.Position, k)
                        end
                    end
                    if rec.TextSize then o.TextSize = math.max(8, math.floor(rec.TextSize * k + 0.5)) end
                    if rec.CornerRadius then
                        o.CornerRadius = UDim.new(rec.CornerRadius.Scale,
                            math.floor(rec.CornerRadius.Offset * k + 0.5))
                    end
                    if rec.PadT then
                        o.PaddingTop    = mulDim(rec.PadT, k)
                        o.PaddingBottom = mulDim(rec.PadB, k)
                        o.PaddingLeft   = mulDim(rec.PadL, k)
                        o.PaddingRight  = mulDim(rec.PadR, k)
                    end
                    if rec.Thick then o.Thickness = math.max(1, rec.Thick * k) end
                end)
            end
        end
    end

    -- 3) canh chỉnh: kéo khung nội dung về góc tab, canh giữa nếu vẫn còn chỗ
    --    (tries: GUI thuần Scale (1,0,1,0) sẽ không đổi gì khi thu -> phải chặn vòng lặp)
    local hw, hh = area.AbsoluteSize.X, area.AbsoluteSize.Y
    local function align(k, tries)
        apply(k)
        local m = S.MeasureHost(host)
        if not m then return k end
        local dx = math.floor(-m.x + math.max(0, (aw - m.w) / 2) + 0.5)
        local dy = math.floor(-m.y + math.max(0, (ah - m.h) / 2) + 0.5)
        if math.abs(dx) > 0.5 or math.abs(dy) > 0.5 then
            for _, rec in ipairs(entry.snap) do
                if rec.top then rec.dx, rec.dy = (rec.dx or 0) + dx, (rec.dy or 0) + dy end
            end
            apply(k)
            m = S.MeasureHost(host) or m
        end
        -- 4) dây an toàn: nội dung TRÀN KHỔ HOST (không phải tràn vùng đã chừa 6px)
        --    thì thu thêm 1 nấc; tối đa 2 lần để không bao giờ lặp vô hạn.
        if m and tries < 2 and (m.w > hw + 1 or m.h > hh + 1) then
            local k2 = k * math.min(hw / m.w, hh / m.h)
            if k2 < k * 0.98 then
                for _, rec in ipairs(entry.snap) do rec.dx, rec.dy = 0, 0 end
                return align(math.max(k2, 0.15), tries + 1)
            end
        end
        return k
    end

    s = align(s, 0)
    entry.fitScale = s
    return s
end

-- ===== KHU VỰC: API cho script tính năng (để GUI bên ngoài cũng tự vừa menu) =====
-- Script được người khác/AI viết thường không biết gì về hub. Chỉ cần nó gọi
-- _G.BananaCatHubAPI (nếu có) là tự canh size theo ô tab + tự theo khi kéo menu.
function S.TabArea(nm)
    local frame
    if type(nm) == "string" and #nm > 0 then
        for _, ft in ipairs(featureTabs) do
            if ft.name == nm then frame = ft.frame break end
        end
    end
    frame = frame or activeTab
    if not frame then return nil end
    local host = frame:FindFirstChild("ScriptHost")
    local area = host or frame
    local sz = area.AbsoluteSize
    return Vector2.new(math.max(0, sz.X - 6), math.max(0, sz.Y - 6))
end

S.resizedCbs = {}
function S.OnResized(fn)
    if type(fn) ~= "function" then return nil end
    table.insert(S.resizedCbs, fn)
    return { Disconnect = function()
        for i, f in ipairs(S.resizedCbs) do
            if f == fn then table.remove(S.resizedCbs, i) break end
        end
    end }
end
function S.NotifyResize()
    local a = S.TabArea()
    local cbs = {}
    for _, f in ipairs(S.resizedCbs) do cbs[#cbs+1] = f end
    for _, f in ipairs(cbs) do pcall(f, a) end
end

-- Script có thể tự xin được nhúng vào tab của nó (thay vì chờ hub "bắt" GUI)
function S.FeatureTabHost(nm)
    if type(nm) == "string" and #nm > 0 then
        for _, ft in ipairs(featureTabs) do
            if ft.name == nm then
                local h = ft.frame and ft.frame:FindFirstChild("ScriptHost")
                if h then return h end
            end
        end
    end
    return activeTab and activeTab:FindFirstChild("ScriptHost")
end

-- Không cần nhúng vẫn vừa menu: chỉnh 1 frame phủ khít ô tab hiện tại
function S.FitToTab(obj, nm)
    if not obj then return nil end
    local host = S.FeatureTabHost(nm)
    if host and obj.Parent ~= host then
        pcall(function() obj.Parent = host end)
    end
    pcall(function()
        obj.Size = UDim2.new(1, 0, 1, 0)
        obj.Position = UDim2.new(0, 0, 0, 0)
    end)
    return obj
end

_G.BananaCatHubAPI = {
    Version = "4.6",
    HubGui = gui,     -- v4.4e: sửa lỗi cũ — biến tên là `gui`, không phải `hubGui` (trước đây là nil)
    Main = main,
    -- gọi bằng dấu hai chấm: API:TabArea("Tên Tab")  ->  Vector2 khổ vùng nội dung của tab
    TabArea = function(self, nm) return S.TabArea(nm) end,
    OnResize = function(self, fn) return S.OnResized(fn) end,      -- API:OnResize(f) -> {Disconnect=}
    FeatureTabHost = function(self, nm) return S.FeatureTabHost(nm) end,
    FitToTab = function(self, obj, nm) return S.FitToTab(obj, nm) end,
    EmbedGui = function(self, guiOrFrame, nm)                        -- xin hub mượn GUI vào tab
        local scr = guiOrFrame
        if scr and not scr:IsA("ScreenGui") then scr = scr:FindFirstAncestorOfClass("ScreenGui") end
        local host = S.FeatureTabHost(nm)
        if not scr or not host then return nil end
        return S.EmbedGui(scr, host)
    end,
    MakeTemplate = function(self, nm, icon) return S.FeatureTemplate(nm, icon) end,
    ReleaseFocus = function(self) pcall(ReleaseHubFocus) end,
    -- v4.4e: API cho external overlay / crosshair
    ExternalGui = function(self, props)
        -- Tạo ScreenGui nằm NGOÀI tab (không bị nhúng) dùng cho ESP/crosshair/bảng HUD.
        -- props: {Name, DisplayOrder, IgnoreGuiInset}
        props = props or {}
        local g = Instance.new("ScreenGui")
        g.Name = props.Name or ("BC_External_" .. tostring(math.random(10000, 99999)))
        g.IgnoreGuiInset = props.IgnoreGuiInset ~= false
        g.ResetOnSpawn = false
        g.ZIndexBehavior = Enum.ZIndexBehavior.Global
        g.DisplayOrder = tonumber(props.DisplayOrder) or 9000
        g:SetAttribute("BCHub_External", true) -- báo cho hub biết đừng nhúng GUI này
        g.Parent = (gethui and gethui()) or game:GetService("CoreGui")
                    or (player and player:WaitForChild("PlayerGui"))
        return g
    end,
    Crosshair = function(self, on)
        -- true/false = bật/tắt; gọi không tham số = toggle; trả về trạng thái hiện tại
        if on == nil then return S.ToggleCrosshair() end
        S.SetCrosshair(on and true or false)
        return S.crosshairOn
    end,
}

-- ===== FEATURE TEMPLATE (bắt đầu) ==========================
function S.FeatureTemplate(nm, icon, stamp)
    if type(nm) ~= "string" or #nm == 0 then nm = "Tính Năng Mới" end
    if type(icon) ~= "string" or #icon == 0 then icon = "⚙️" end
    if type(stamp) ~= "string" then stamp = "" end
    local head = [==[
-- ===========================================================================
--  __BC_NAME__  ·  tính năng cho Banana Cat Hub  (bản MẪU, chạy được ngay)
--  Icon: __BC_ICON__   ·   khổ thiết kế gốc: 620 x 384 px   ·   __BC_STAMP__
-- ---------------------------------------------------------------------------
--  [ ĐỌC HẾT PHẦN NÀY TRƯỚC KHI SỬA — dành cho người/AI nhận code ]
--   1) Code này CHẠY ĐƯỢC NGAY (có sẵn khung giao diện + 1 nút bật/tắt).
--      Việc duy nhất của bạn: thay phần trong khối "FEATURE LOGIC" bằng thuật
--      toán thật. Các phần khác giữ nguyên.
--   2) KHÔNG đổi tên các biến: gui, root, panel, bcToggle, bcStatus, bcEnabled,
--      bcClose, BC. Hub (và người dán) dựa vào tên đó để nhúng + hoàn tác.
--      Muốn đóng tính năng từ code của bạn: bcClose()  (hoặc _G.BC_FEATURES[tên].Close()).
--   3) MẶC ĐỊNH CHỈ dùng đúng 1 ScreenGui (gui) đã tạo ở đây cho phần nhúng trong
--      tab. Widget bên trong tab phải là CON của `panel` hoặc `root`.
--      NGOẠI LỆ (quan trọng cho tính năng can thiệp ngoài màn hình): bạn được phép
--      tạo ScreenGui thứ hai cho EXTERNAL OVERLAY (crosshair / ESP / bảng HUD nằm
--      trên màn hình game, NGOÀI menu). Khi tạo, PHẢI:
--        a) đặt trong gethui()/CoreGui/PlayerGui (KHÔNG được parent vào root/panel),
--        b) gọi extGui:SetAttribute("BCHub_External", true) để hub KHÔNG nhúng nó
--           vào trong ô tab (không thì overlay bị kéo vào menu = hỏng).
--        c) nếu có API hub thì dùng API:ExternalGui({...}) cho tiện.
--      KHÔNG Destroy/ẩn GUI của game.
--   4) CỨ viết Size/Position bằng pixel theo khổ 620x384 (offset bình thường).
--      Banana Cat Hub TỰ động nhân đồng đều mọi offset (Size, Position,
--      UICorner, UIPadding, UIStroke, TextSize) theo kích thước thật của ô tab,
--      nên kéo menu to ra / thu nhỏ lại thì GUI to theo / nhỏ theo và KHÔNG méo.
--      Vì vậy: KHÔNG tự ép UDim2.fromScale(1,1) cho widget bên trong, KHÔNG đọc
--      AbsoluteSize của màn hình, KHÔNG đặt Position âm hay vượt 620x384.
--   5) GIỮ NGUYÊN khối từ "SIZE CONTRACT" đến "END SIZE CONTRACT" (khối đó làm
--      GUI vừa khít menu kể cả khi script được chạy NGOÀI hub / hub tắt nhúng).
--   6) CẤM: while true thiếu task.wait, setclipboard, loadstring/HttpGet link lạ
--      nếu chưa được yêu cầu, viết _G bừa (dùng biến local), gethui/getgenv để
--      sửa GUI của game. Dùng `pcall` quanh phần logic có thể lỗi.
--   7) Cách test: mở menu -> tab "Tạo Tính Năng" -> dán code -> bấm ▶ Chạy Script.
--      Muốn trả GUI về nguyên trạng: bấm ✕ trên tab tính năng.
-- ===========================================================================

local BC = { Name = "__BC_NAME__", Icon = "__BC_ICON__", DesignW = 620, DesignH = 384 }

local Players = game:GetService("Players")
local player = Players.LocalPlayer
local pg = player and player:WaitForChild("PlayerGui")
if not pg then return end

local gui = Instance.new("ScreenGui")
gui.Name = BC.Name
gui.ResetOnSpawn = false
gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
gui.Parent = pg

local root = Instance.new("Frame")
root.Name = "Root"
root.Size = UDim2.new(0, BC.DesignW, 0, BC.DesignH)
root.Position = UDim2.new(0.5, -BC.DesignW / 2, 0.5, -BC.DesignH / 2)
root.BackgroundColor3 = Color3.fromRGB(24, 26, 38)
root.BorderSizePixel = 0
root.Parent = gui
local function bcCorner(o, r)
    local c = Instance.new("UICorner")
    c.CornerRadius = UDim.new(0, r)
    c.Parent = o
    return c
end
bcCorner(root, 8)

-- ===== SIZE CONTRACT (KHỐI NÀY KHÔNG ĐƯỢC SỬA) ============================
-- Mục tiêu: GUI luôn BẰNG ĐÚNG ô tab của menu, và tự cập nhật khi kéo menu
-- to/nhỏ. Chạy trong hub -> phủ khít container mà hub đã đưa cho nó.
-- Chạy độc lập -> bám theo khổ tab của hub nếu hub đang mở, nếu không thì
-- lấy ~55% màn hình (vẫn giữ đúng tỉ lệ 620:384).
local API = _G.BananaCatHubAPI
local bcConn = nil        -- connection của API:OnResize, bcClose sẽ ngắt để không leak
local function bcHubMain()
    local ok, m = pcall(function() return API and API.Main end)
    if ok and m and m.AbsoluteSize then return m end
    -- chỉ nhận đúng ScreenGui của hub (tên "ExMenu"): KHÔNG đoán bừa GUI của game
    local hub = pg:FindFirstChild("ExMenu") or pg:FindFirstChild("BananaCatHub")
    if hub then
        local f = hub:FindFirstChildWhichIsA("Frame")
        if f and f.AbsoluteSize.X > 300 then return f end
    end
end
local function bcArea()
    local ok, v = pcall(function() return API and API.TabArea and API:TabArea(BC.Name) end)
    if ok and v and v.X and v.X > 60 then return v end
    local m = bcHubMain()
    if m and m.AbsoluteSize.X > 300 then
        return Vector2.new(m.AbsoluteSize.X - 30, m.AbsoluteSize.Y - 72)
    end
    local vp = Vector2.new(1280, 720)
    pcall(function() vp = workspace.CurrentCamera.ViewportSize end)
    local w = math.max(320, math.min(vp.X * 0.55, vp.X - 60))
    return Vector2.new(w, w * BC.DesignH / BC.DesignW)
end
local function bcFit()
    pcall(function()
        local par = root.Parent
        if par and not par:IsA("ScreenGui") then
            root.Size = UDim2.new(1, 0, 1, 0)
            root.Position = UDim2.new(0, 0, 0, 0)
            return
        end
        local a = bcArea()
        root.Size = UDim2.new(0, math.floor(a.X), 0, math.floor(a.Y))
        root.Position = UDim2.new(0.5, -math.floor(a.X / 2), 0.5, -math.floor(a.Y / 2))
    end)
end
bcConn = nil
bcFit()
pcall(function()
    if API and API.OnResize then bcConn = API:OnResize(bcFit) end
end)
local bcHubFrame = bcHubMain()
if bcHubFrame then
    pcall(function()
        bcHubFrame:GetPropertyChangedSignal("AbsoluteSize"):Connect(bcFit)
    end)
end
task.delay(0.25, bcFit)
task.delay(1.2, bcFit)
-- ===== END SIZE CONTRACT ===================================================

]==]
    local body = [==[
-- ---------- giao diện mẫu (thêm/bớt thoải mái, miễn là CON của panel/root) ----
local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, -56, 0, 32)
title.Position = UDim2.new(0, 10, 0, 0)
title.BackgroundTransparency = 1
title.Text = BC.Icon .. "  " .. BC.Name
title.Font = Enum.Font.GothamBold
title.TextSize = 15
title.TextXAlignment = Enum.TextXAlignment.Left
title.TextColor3 = Color3.fromRGB(255, 255, 255)
title.Parent = root

local closeBtn = Instance.new("TextButton")
closeBtn.Name = "CloseBtn"
closeBtn.Size = UDim2.new(0, 26, 0, 26)
closeBtn.Position = UDim2.new(1, -34, 0, 3)
closeBtn.BackgroundColor3 = Color3.fromRGB(210, 70, 70)
closeBtn.Text = "X"
closeBtn.Font = Enum.Font.GothamBold
closeBtn.TextSize = 14
closeBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
closeBtn.AutoButtonColor = true
closeBtn.Parent = root
bcCorner(closeBtn, 6)

local panel = Instance.new("ScrollingFrame")
panel.Name = "Panel"
panel.Size = UDim2.new(1, -20, 1, -74)
panel.Position = UDim2.new(0, 10, 0, 38)
panel.BackgroundTransparency = 1
panel.BorderSizePixel = 0
panel.ScrollBarThickness = 5
panel.AutomaticCanvasSize = Enum.AutomaticSize.Y
panel.CanvasSize = UDim2.new(0, 0, 0, 0)
panel.Parent = root
local list = Instance.new("UIListLayout")
list.Padding = UDim.new(0, 6)
list.SortOrder = Enum.SortOrder.LayoutOrder
list.Parent = panel
local pad = Instance.new("UIPadding")
pad.PaddingRight = UDim.new(0, 8)
pad.Parent = panel

local bcStatus = Instance.new("TextLabel")
bcStatus.Name = "Status"
bcStatus.Size = UDim2.new(1, -20, 0, 22)
bcStatus.Position = UDim2.new(0, 10, 1, -30)
bcStatus.BackgroundTransparency = 1
bcStatus.Text = "Tắt"
bcStatus.TextColor3 = Color3.fromRGB(255, 214, 90)
bcStatus.Font = Enum.Font.Gotham
bcStatus.TextSize = 12
bcStatus.TextXAlignment = Enum.TextXAlignment.Left
bcStatus.Parent = root

local function bcButton(txt, color)
    local b = Instance.new("TextButton")
    b.Size = UDim2.new(1, 0, 0, 30)
    b.BackgroundColor3 = color or Color3.fromRGB(60, 120, 220)
    b.Text = txt
    b.Font = Enum.Font.GothamMedium
    b.TextSize = 13
    b.TextColor3 = Color3.fromRGB(255, 255, 255)
    b.AutoButtonColor = true
    b.Parent = panel
    bcCorner(b, 6)
    return b
end

bcToggle = bcButton(BC.Icon .. "  Bật " .. BC.Name)
-- VD thêm cài đặt: local speed = bcButton("Tốc độ: 1x")   -- người viết thay/sao dòng này

-- ---------- EXTERNAL OVERLAY (vòng tròn niêm tâm / ESP / HUD ngoài màn hình) ------
-- Phần này chạy TRÊN MÀN HÌNH GAME, KHÔNG bị kéo vào trong khung menu. Xóa đi nếu
-- tính năng của bạn không cần can thiệp ngoài màn hình.
local function bcMakeExternalGui(name, order)
    -- Ưu tiên dùng API hub (nó đã đánh dấu sẵn BCHub_External + đúng parent an toàn),
    -- nếu không thì tự tạo để script vẫn chạy được khi không có hub.
    local ext
    local ok, API = pcall(function() return _G.BananaCatHubAPI end)
    if ok and API and API.ExternalGui then
        ext = API:ExternalGui({Name = name, DisplayOrder = order})
    else
        ext = Instance.new("ScreenGui")
        ext.Name = name
        ext.IgnoreGuiInset = true
        ext.ResetOnSpawn = false
        ext.ZIndexBehavior = Enum.ZIndexBehavior.Global
        ext.DisplayOrder = order or 9500
        ext:SetAttribute("BCHub_External", true)
        local pg2 = game:GetService("Players").LocalPlayer:WaitForChild("PlayerGui")
        local hui = (gethui and gethui()) or game:GetService("CoreGui") or pg2
        ext.Parent = hui
    end
    return ext
end

local extGui = nil            -- ScreenGui overlay ngoài màn hình (được tạo khi bật tính năng)
local extCrossOn = false
local function bcToggleCross()
    if not extGui then return end
    extCrossOn = not extCrossOn
    local ring = extGui:FindFirstChild("BC_Ring")
    local dot  = extGui:FindFirstChild("BC_Dot")
    if ring then ring.Visible = extCrossOn end
    if dot  then dot.Visible  = extCrossOn end
    -- báo cho hub biết (để các tab khác đồng bộ trạng thái nút 🎯, nếu muốn)
    pcall(function()
        if _G.BananaCatHubAPI and _G.BananaCatHubAPI.Crosshair then
            -- không tự ý bật crosshair toàn cục, chỉ bật local cái của tính năng này
        end
    end)
end

-- Nút bật/tắt VÒNG TRÒN NIÊM TÂM ở giữa màn hình (ngay trong panel của tab)
local bcCrossBtn = bcButton("🎯  Niêm tâm: TẮT", Color3.fromRGB(160, 60, 255))

-- Khi bấm nút 🎯 của hub (crosshair toàn cục), có thể bắt tín hiệu tùy thích
-- (vd: thêm chữ/thanh máu quanh vòng tròn). Để nguyên hoặc xóa nếu không cần.
pcall(function()
    if _G.BananaCatHubAPI and _G.BananaCatHubAPI.OnResize then
        -- hook khác nếu cần
    end
end)

]==]
    local foot = [==[
-- ---------- đóng / trả GUI (KHÔNG xóa khối này) ----------------------------
local bcEnabled = false
local bcConns = {}
local function bcOn(inst, sig, fn)
    table.insert(bcConns, inst[sig]:Connect(fn))
end

local function bcClose()
    if bcConn then pcall(function() bcConn:Disconnect() end) bcConn = nil end
    for _, c in ipairs(bcConns) do pcall(function() c:Disconnect() end) end
    for i = #bcConns, 1, -1 do bcConns[i] = nil end
    bcEnabled = false
    pcall(function() gui.Enabled = false end)
    task.delay(0.06, function() pcall(function() gui:Destroy() end) end)
end
bcOn(closeBtn, "MouseButton1Click", bcClose)

-- Cho phép code khác (và AI) đóng/tắt tính năng mà không cần biến toàn cục trùng tên:
_G.BC_FEATURES = _G.BC_FEATURES or {}
_G.BC_FEATURES[BC.Name] = { name = BC.Name, Close = bcClose, Gui = gui, Root = root }

-- =========================== FEATURE LOGIC ================================
-- >>> THAY TOÀN BỘ KHỐI NÀY BẰNG THUẬT TOÁN THẬT CỦA TÍNH NĂNG <<<
-- Quy tắc: mọi vòng lặp phải có task.wait(); mọi thao tác với nhân vật/game
-- đặt trong pcall; tôn trọng cờ bcEnabled (bấm nút là phải dừng được ngay).

bcOn(bcCrossBtn, "MouseButton1Click", function()
    if not bcEnabled then
        -- phải bật tính năng trước (vòng lặp phải sống mới cập nhật overlay)
        bcToggle:Activate()
        task.wait(0.1)
    end
    bcToggleCross()
    bcCrossBtn.Text = extCrossOn and "🎯  Niêm tâm: BẬT" or "🎯  Niêm tâm: TẮT"
end)

bcOn(bcToggle, "MouseButton1Click", function()
    bcEnabled = not bcEnabled
    bcToggle.Text = (bcEnabled and "⏹  Tắt " or BC.Icon .. "  Bật ") .. BC.Name
    bcStatus.Text = bcEnabled and "Đang chạy…" or "Tắt"
    if bcEnabled then
        -- ---- TẠO EXTERNAL OVERLAY (vòng tròn niêm tâm ở GIỮA MÀN HÌNH GAME) ----
        if not extGui or not extGui.Parent then
            extGui = bcMakeExternalGui(BC.Name .. "_Ext", 9500)

            local ring = Instance.new("Frame")
            ring.Name = "BC_Ring"
            ring.Size = UDim2.new(0, 32, 0, 32)
            ring.Position = UDim2.new(0.5, -16, 0.5, -16)
            ring.BackgroundTransparency = 1
            ring.BorderSizePixel = 0
            ring.AnchorPoint = Vector2.new(0.5, 0.5)
            ring.Visible = false
            ring.Parent = extGui
            local rc = Instance.new("UICorner"); rc.CornerRadius = UDim.new(1, 0); rc.Parent = ring
            local rs = Instance.new("UIStroke"); rs.Thickness = 1.5; rs.Color = Color3.fromRGB(255,255,255); rs.Parent = ring

            local dot = Instance.new("Frame")
            dot.Name = "BC_Dot"
            dot.Size = UDim2.new(0, 3, 0, 3)
            dot.Position = UDim2.new(0.5, -2, 0.5, -2)
            dot.BackgroundColor3 = Color3.fromRGB(255,255,255)
            dot.BorderSizePixel = 0
            dot.AnchorPoint = Vector2.new(0.5, 0.5)
            dot.Visible = false
            dot.Parent = extGui
            local dc = Instance.new("UICorner"); dc.CornerRadius = UDim.new(1, 0); dc.Parent = dot

            -- Thêm 4 nét ngắn 4 phía (xoá đi nếu chỉ muốn vòng tròn đơn thuần)
            local gap, ll = 22, 10
            local function ln(w, h, x, y)
                local f = Instance.new("Frame")
                f.Size = UDim2.new(0,w,0,h); f.Position = UDim2.new(0.5,x,0.5,y)
                f.BackgroundColor3 = Color3.fromRGB(255,255,255); f.BorderSizePixel = 0
                f.AnchorPoint = Vector2.new(0.5,0.5); f.BackgroundTransparency = 0.2
                f.Name = "BC_Line"; f.Parent = extGui
            end
            ln(2, ll, -1, -gap - ll/2)
            ln(2, ll, -1,  gap + ll/2)
            ln(ll, 2, -gap - ll/2, -1)
            ln(ll, 2,  gap + ll/2, -1)
        end

        table.insert(bcConns, task.spawn(function()
            while bcEnabled do
                task.wait(0.2)
                pcall(function()
                    -- >>> ĐẶT CODE TÍNH NĂNG Ở ĐÂY <<<
                    -- VÍ DỤ (xóa và viết code thật ở đây):
                    -- local char = player.Character
                    -- local hrp = char and char:FindFirstChild("HumanoidRootPart")
                    -- extGui.BC_Ring.Visible = extCrossOn  (điều khiển vòng tròn bằng bcCrossBtn)
                    -- Muốn vẽ ESP/dòng kẻ: thêm Frame/Lua (Drawing) vào extGui ở đây
                end)
            end
        end))
    else
        -- Tắt tính năng -> dọn external overlay (tránh sót vòng tròn trên màn hình)
        extCrossOn = false
        pcall(function() if extGui then extGui:Destroy() end end)
        extGui = nil
        bcCrossBtn.Text = "🎯  Niêm tâm: TẮT"
    end
end)
-- ========================================================================

print("✅ [" .. BC.Name .. "] đã nạp — dán vào tab \"Tạo Tính Năng\" của Banana Cat Hub rồi bấm ▶ Chạy Script")
return BC.Name
]==]
    local out = head .. body .. foot
    out = (out:gsub("__BC_NAME__", function() return nm end))
    out = (out:gsub("__BC_ICON__", function() return icon end))
    out = (out:gsub("__BC_STAMP__", function() return (#stamp > 0) and stamp or "sinh bởi hub" end))
    return out
end
-- ===== FEATURE TEMPLATE (kết thúc) ==========================

-- Nối vào hook BcFit() (khu SetupResizeHandle). Bất cứ lần nào menu đổi kích thước,
-- mọi GUI đang nhúng đều được đo và co giãn lại cho vừa vùng tab.
_G.BananaCatHub_SyncEmbeds = function()
    pcall(S.SyncAllEmbeds)
end
pcall(function()
    trackConn(main:GetPropertyChangedSignal("Size"):Connect(function()
        BcFit()                 -- GUI đang nhúng trong tab -> đo & scale lại
        pcall(S.NotifyResize)   -- script đứng ngoài (tự xin size) -> chạy lại bcFit của nó
    end))
end)

function S.SyncAllEmbeds()
    for _, e in ipairs(S.embeds) do
        if e.host and e.host.Parent then
            pcall(function() S.FitEmbedded(e) end)
        end
    end
end

-- Dọn mọi host đang nằm trong 1 container (khi chạy lại script của tab / đóng tab / xóa tab)
-- và TRẢ GUI về nguyên trạng. Đây là điểm khác biệt lớn nhất với bản cũ (bản cũ Destroy luôn).
function S.ClearEmbedsUnder(containerFrame)
    if not containerFrame then return 0 end
    local n = 0
    for i = #S.embeds, 1, -1 do
        local e = S.embeds[i]
        if e.host and e.host.Parent == containerFrame then
            S.RestoreEmbed(e)
            n += 1
        end
    end
    -- host "rác" do tab này tạo ra nhưng không còn trong registry (vd. leftovers của bản v4.4a)
    for _, child in ipairs(containerFrame:GetChildren()) do
        if child.Name:sub(1, 9) == "Embedded_" then
            pcall(function() child:Destroy() end)
        end
    end
    return n
end

-- v4.4b: nhúng 1 ScreenGui/Folder vào containerFrame của tab. KHÔNG Destroy GUI gốc,
-- KHÔNG sửa Size/Position frame con (chỉ đổi Parent) -> layout của script giữ nguyên 100%.
-- Trả về host Frame để tab tự co giãn theo kích thước menu (xem S.FitEmbedded).
function S.EmbedGui(scr, containerFrame)
    if not S.embedEnabled then return nil end
    if not scr or not scr.Parent then return nil end
    if not containerFrame or not containerFrame.Parent then return nil end
    -- không bao giờ nhúng chính GUI của hub (tự nuốt menu của mình = treo UI)
    if scr == gui or scr:IsDescendantOf(gui) then return nil end
    -- v4.4e: GUI có attribute BCHub_External=true là overlay (crosshair/ESP/bảng thống kê
    -- ngoài màn hình) — KHÔNG được mượn vào tab, phải để nguyên ở PlayerGui/targetGui.
    local isExt = false
    pcall(function() isExt = (scr:GetAttribute("BCHub_External") == true) end)
    if isExt then return nil end

    local hostName = "Embedded_"..scr.Name
    for _, ex in ipairs(containerFrame:GetChildren()) do
        if ex.Name == hostName then
            local e = S.FindEmbedByHost(ex)
            if e then
                S.RestoreEmbed(e)
            else
                pcall(function() ex:Destroy() end)
            end
        end
    end

    local host = New("Frame", {
        Size = UDim2.new(1,0,1,0),
        Position = UDim2.new(0,0,0,0),
        BackgroundTransparency = 1,
        BorderSizePixel = 0,
        ZIndex = 5,
        Name = hostName,
        ClipsDescendants = true,
    }, containerFrame)

    local recs = {}
    for _, ch in ipairs(scr:GetChildren()) do
        if ch:IsA("GuiObject") then
            recs[#recs+1] = {obj = ch, origParent = scr, origPos = ch.Position, origSize = ch.Size}
        end
    end
    if #recs == 0 then
        pcall(function() host:Destroy() end)
        return nil
    end
    for _, rec in ipairs(recs) do
        pcall(function() rec.obj.Parent = host end)
    end

    ForceStretchToParent(host)          -- root only (an toàn cho mấy frame con)
    local entry = S.RegisterEmbed(host, scr, recs)
    pcall(function() S.FitEmbedded(entry) end)
    -- AbsolutePosition/Size của frame vừa đổi cha chỉ đúng sau 1 render step => đo lại 2 lần
    task.delay(0.08, function() pcall(function() S.FitEmbedded(entry) end) end)
    task.delay(0.4,  function() pcall(function() S.FitEmbedded(entry) end) end)
    return host
end

-- ==================== CROSSHAIR / NIÊM TÂM TOÀN CỤC ====================
-- Vòng tròn ở giữa màn hình (ngoài menu), dùng cho mọi tab tính năng. Script tính năng cũng
-- có thể tạo external GUI riêng (xem template) nhưng crosshair mặc định này dùng chung để
-- bật/tắt nhanh bằng nút 🎯 trên toolbar của từng tab.
S.crosshairGui   = nil
S.crosshairBtns  = {}    -- danh sách nút 🎯 trên các tab để cập nhật text đồng loạt
S.crosshairOn    = false
S.crosshairColor = Color3.fromRGB(255, 255, 255)
S.crosshairSize  = 32

function S._buildCrosshair()
    if S.crosshairGui and S.crosshairGui.Parent then return S.crosshairGui end
    local g = New("ScreenGui", {
        Name = "BananaCatHub_Crosshair",
        IgnoreGuiInset = true,
        ResetOnSpawn = false,
        ZIndexBehavior = Enum.ZIndexBehavior.Global,
        DisplayOrder = 9999,
    }, targetGui)
    g:SetAttribute("BCHub_External", true)

    -- Vòng tròn ngoài
    local ring = New("Frame", {
        Name = "Ring",
        Size = UDim2.new(0, S.crosshairSize, 0, S.crosshairSize),
        Position = UDim2.new(0.5, -S.crosshairSize/2, 0.5, -S.crosshairSize/2),
        BackgroundTransparency = 1,
        BorderSizePixel = 0,
        AnchorPoint = Vector2.new(0.5, 0.5),
    }, g)
    New("UICorner", {CornerRadius = UDim.new(1, 0)}, ring)
    New("UIStroke", {Thickness = 1.5, Color = S.crosshairColor, Transparency = 0.1}, ring)

    -- Chấm ở tâm
    local dot = New("Frame", {
        Name = "Dot",
        Size = UDim2.new(0, 3, 0, 3),
        Position = UDim2.new(0.5, -2, 0.5, -2),
        BackgroundColor3 = S.crosshairColor,
        BorderSizePixel = 0,
        AnchorPoint = Vector2.new(0.5, 0.5),
    }, g)
    New("UICorner", {CornerRadius = UDim.new(1, 0)}, dot)

    -- 4 nét ngắn 4 phía (cách vòng tròn 6px, dài 10px)
    local gap = S.crosshairSize/2 + 6
    local lineLen = 10
    local function line(name, w, h, x, y)
        local ln = New("Frame", {
            Name = name, Size = UDim2.new(0, w, 0, h),
            Position = UDim2.new(0.5, x, 0.5, y),
            BackgroundColor3 = S.crosshairColor, BorderSizePixel = 0,
            AnchorPoint = Vector2.new(0.5, 0.5), BackgroundTransparency = 0.15,
        }, g)
        return ln
    end
    line("Top",    2, lineLen, -1, -gap - lineLen/2)
    line("Bottom", 2, lineLen, -1,  gap + lineLen/2)
    line("Left",   lineLen, 2, -gap - lineLen/2, -1)
    line("Right",  lineLen, 2,  gap + lineLen/2, -1)

    S.crosshairGui = g
    return g
end

function S.SetCrosshair(on)
    S.crosshairOn = (on == true)
    if S.crosshairOn then
        S._buildCrosshair()
        if S.crosshairGui then S.crosshairGui.Enabled = true end
    else
        if S.crosshairGui then S.crosshairGui.Enabled = false end
    end
    for _, b in ipairs(S.crosshairBtns) do
        pcall(function()
            if b and b.Parent then
                b.Text = S.crosshairOn and "🎯 Tâm: BẬT" or "🎯 Tâm"
                b.BackgroundColor3 = S.crosshairOn and Color3.fromRGB(180, 80, 220) or C.PURPLE
            end
        end)
    end
end

function S.ToggleCrosshair()
    S.SetCrosshair(not S.crosshairOn)
    return S.crosshairOn
end

-- Đăng ký nút 🎯 trên 1 tab tính năng để hub tự cập nhật text khi crosshair đổi trạng thái
function S.RegisterCrosshairBtn(btn)
    if not btn then return end
    table.insert(S.crosshairBtns, btn)
    -- đồng bộ text ban đầu
    pcall(function()
        btn.Text = S.crosshairOn and "🎯 Tâm: BẬT" or "🎯 Tâm"
        btn.BackgroundColor3 = S.crosshairOn and Color3.fromRGB(180, 80, 220) or C.PURPLE
    end)
    btn.Activated:Connect(function()
        S.ToggleCrosshair()
    end)
end

-- ========== v4.4h: PHÁT HIỆN + NHÚNG GUI CỦA SCRIPT TÍNH NĂNG (nhiều lớp, không phụ thuộc hook) ==========
-- Vì sao bản v4.4g vẫn có thể "GUI nằm ngoài menu":
--   (a) REGRESSION của chính v4.4g: nó lọc TÊN GUI (GAME_OWNED_GUI_NAMES) cho MỌI trường hợp.
--       Rất nhiều script đặt tên ScreenGui là "Main" / "InGame" / "Notifications" -> bị từ chối
--       oan, trong khi bản v4.4f chỉ lọc tên ở nhánh "đoán". Nay: GUI do CHÍNH script của tab
--       tạo ra (hook bắt được) thì KHÔNG bị lọc tên nữa.
--   (b) Nhiều executor CHẶN ghi đè Instance.new -> hook cài không được -> hub không biết GUI nào
--       là của script -> không nhúng gì cả (nhãn còn báo "bình thường" nên rất khó biết).
--       Nay: TỰ KIỂM TRA hook có ăn không (probe), nếu không thì dùng 2 lớp dự phòng:
--         • ChildAdded trên PlayerGui/gethui()/CoreGui — bắt GUI theo THỜI ĐIỂM nó được gắn lên
--           màn hình trong lúc script của tab đang chạy (tín hiệu sở hữu mạnh, không cần hook)
--         • quét diff "an toàn" (chỉ GUI mới xuất hiện, có frame con, không phải tên hệ thống)
--       và BÁO RÕ trong nhãn + console (F9) là hook bị chặn.
--   (c) Script dựng GUI quá trễ -> nay thử lại tới 10s (0.6/1.8/4/7/10) và giữ hook/watcher 11s.
-- Tất cả gắn vào bảng S (KHÔNG thêm local cấp chunk: main chunk đã 187/200 slot của Luau).
S.EMBED_TRY_DELAYS   = {0.6, 1.8, 4, 7, 10}  -- các mốc thử nhúng lại sau khi bấm ▶
S.EMBED_HOOK_GRACE   = 11                    -- giữ hook + watcher bấy nhiêu giây (bắt GUI sinh trễ)
S.EMBED_PROBABLE_AGE = 5                     -- GUI "không chắc chắn" chỉ tự nhận nếu sinh trong 5s đầu
S.EMBED_CHILD_WAIT   = 15                    -- số lần chờ GUI "chín" (0.2s/lần = tối đa 3s)
S.activeHook = nil                           -- chỉ 1 hook sống tại 1 thời điểm (tránh đè hook script khác)

-- Tên GUI hệ thống của Roblox/game: KHÔNG BAO GIỜ nhúng (nhúng là hỏng UI game)
S.SYSTEM_GUI_NAMES = {
    Topbar = true, TopbarContainer = true, PlayerList = true, Chat = true, Backpack = true,
    DevConsoleUI = true, ScriptInvitationUI = true, FollowPromptUI = true,
    TouchControlsFrame = true, PauseMenu = true, CoreGui = true, ExMenu = true,
}
-- Tên "chung chung" mà SCRIPT CỦA NGƯỜI DÙNG rất hay đặt (Main/InGame/Notifications):
-- chỉ chặn khi hub ĐOÁN (không có tín hiệu sở hữu), KHÔNG chặn khi biết chắc là của tab.
S.GENERIC_GUI_NAMES = { Main = true, InGame = true, Notifications = true }

-- Một ScreenGui có đủ điều kiện để "mượn" vào tab không?
-- trust: "certain" (hook bắt đúng luồng của ta) | "manual" (người dùng bấm 🔁 / sinh ra trong lúc
--        script ta chạy) | "guess" (chỉ đoán từ diff-scan)
-- Trả về (true) hoặc (false, lý do)
function S.IsEmbeddable(g, containerFrame, trust)
    if not g then return false, "không có GUI" end
    if not g.Parent then return false, "GUI chưa có Parent (script chưa gắn lên màn hình)" end
    if not (g:IsA("ScreenGui") or g:IsA("Folder")) then return false, "không phải ScreenGui/Folder" end
    if g == gui or g:IsDescendantOf(gui) then return false, "là GUI của chính hub" end
    if g.Name == "ExMenu" then return false, "trùng tên GUI của hub (ExMenu)" end
    if S.SYSTEM_GUI_NAMES[g.Name] then
        return false, "là GUI của game/hệ thống (" .. tostring(g.Name) .. ")"
    end
    if trust ~= "certain" and trust ~= "manual" and S.GENERIC_GUI_NAMES[g.Name] then
        return false, "tên '" .. tostring(g.Name) .. "' hay là UI của game — bật 🕵 hoặc bấm 🔁 để ép nhúng"
    end
    local isExt = false
    pcall(function() isExt = (g:GetAttribute("BCHub_External") == true) end)
    if isExt then return false, "là overlay ngoài màn hình (BCHub_External)" end
    if containerFrame and g:IsDescendantOf(containerFrame) then return false, "đã nằm trong tab rồi" end
    for _, e in ipairs(S.embeds) do
        if e.gui == g then return false, "đã được nhúng ở tab khác" end
    end
    -- phải có ít nhất 1 frame con: script tạo ScreenGui trước, thêm con sau -> chờ, đừng nhúng non
    local hasChild = false
    for _, c in ipairs(g:GetChildren()) do
        if c:IsA("GuiObject") then hasChild = true break end
    end
    if not hasChild then return false, "chưa có frame con (script còn đang dựng GUI)" end
    return true
end

-- Hook Instance.new để biết ScreenGui nào do script của tab tạo ra.
-- Trả về: unhook(), records, state. state.available = hook THẬT SỰ ăn (đã probe kiểm chứng).
function S.HookInstanceNew()
    if S.activeHook then pcall(S.activeHook) end   -- gỡ hook lần chạy trước, tránh chồng chain
    S.activeHook = nil

    local records = {}
    local st = {
        hooked = false, available = false, viaHookfunction = false,
        realNew = nil, ours = nil, origFromHook = nil,
        probing = false, probeSeen = false,
        inRun = true, graceUntil = nil, t0 = os.clock(),
    }
    local myCo = coroutine.running()

    local function unhook()
        if not st.hooked then return end
        st.hooked = false
        if st.viaHookfunction then
            -- trả lại hàm gốc cho executor (không đè hook của script khác)
            pcall(function()
                if type(hookfunction) == "function" and st.origFromHook then
                    hookfunction(Instance.new, st.origFromHook)
                end
            end)
        else
            -- CHỈ gỡ khi hook của ta vẫn nằm trên cùng. Nếu script khác đã hook chồng lên thì
            -- để nguyên (hook của ta thành lớp trung gian trơ) — bản cũ ghi thẳng Instance.new =
            -- realNew nên ĐÈ MẤT hook của script khác.
            pcall(function()
                if Instance.new == st.ours then Instance.new = st.realNew end
            end)
        end
        if S.activeHook == unhook then S.activeHook = nil end
    end

    -- lớp ghi nhận dùng chung cho cả 2 cách hook
    local function recorder(cls, ...)
        local inst = st.realNew(cls, ...)
        if st.probing then
            if cls == "ScreenGui" then st.probeSeen = true end
            return inst
        end
        if st.hooked and cls == "ScreenGui" then
            local now = os.clock()
            records[#records + 1] = {
                inst      = inst,
                certain   = (coroutine.running() == myCo),
                duringRun = (st.inRun == true) or (st.graceUntil ~= nil and now < st.graceUntil),
                age       = now - st.t0,
                embedded  = false,
                via       = "hook",
            }
        end
        return inst
    end

    -- CÁCH 1: ghi đè Instance.new (đa số executor cho phép)
    pcall(function()
        st.realNew = Instance.new
        st.ours = recorder
        Instance.new = st.ours
        st.hooked = (Instance.new == st.ours)
    end)

    -- CÁCH 2: executor chặn ghi đè -> thử hookfunction (Synapse/Xeno/Wave/Delta... thường có)
    if not st.hooked and type(hookfunction) == "function" then
        pcall(function()
            st.ours = recorder
            st.origFromHook = hookfunction(Instance.new, st.ours)
            if st.origFromHook then st.realNew = st.origFromHook end
            st.hooked = true
            st.viaHookfunction = true
        end)
    end

    -- KIỂM CHỨNG hook có ĂN thật không (có executor cho gán nhưng lời gọi không đi qua hàm của ta)
    if st.hooked then
        pcall(function()
            st.probing, st.probeSeen = true, false
            local probe = Instance.new("ScreenGui")   -- không gắn Parent, hủy ngay
            st.probing = false
            st.available = (st.probeSeen == true)
            if probe and probe.Destroy then pcall(function() probe:Destroy() end) end
        end)
        if not st.available then
            -- hook cài được nhưng không ăn -> gỡ cho sạch, chuyển sang lớp dự phòng
            pcall(unhook)
        end
    end

    S.activeHook = unhook
    return unhook, records, st
end

-- LỚP DỰ PHÒNG (không cần hook): canh ChildAdded trên PlayerGui / gethui() / CoreGui.
-- GUI được script của tab gắn lên màn hình TRONG LÚC ta chạy -> gần như chắc chắn là của tab.
function S.WatchNewGuis(records, st)
    local conns = {}
    local function already(g)
        for _, r in ipairs(records) do if r.inst == g then return true end end
        return false
    end
    local function makeHandler()
        return function(child)
            if st.watchOn == false then return end
            if not child then return end
            local okType, isGui = pcall(function()
                return child:IsA("ScreenGui") or child:IsA("Folder")
            end)
            if not (okType and isGui) then return end
            if child == gui or already(child) then return end
            local now = os.clock()
            records[#records + 1] = {
                inst      = child,
                certain   = false,
                duringRun = (st.inRun == true) or (st.graceUntil ~= nil and now < st.graceUntil),
                age       = now - st.t0,
                embedded  = false,
                via       = "watch",
            }
        end
    end
    local seenCtn, containers = {}, {playerGui, targetGui}
    pcall(function()
        local cg = game:GetService("CoreGui")
        if cg then containers[#containers + 1] = cg end
    end)
    for _, ctn in ipairs(containers) do
        if ctn and not seenCtn[ctn] then
            seenCtn[ctn] = true
            pcall(function()
                conns[#conns + 1] = ctn.ChildAdded:Connect(makeHandler())
            end)
        end
    end
    st.watchOn = true
    local function stopWatch()
        st.watchOn = false
        for _, c in ipairs(conns) do pcall(function() c:Disconnect() end) end
    end
    return stopWatch, conns
end

-- Nhúng các GUI đã ghi nhận. mode:
--   "strict" = chỉ GUI đúng luồng của ta · "run" = + GUI sinh ra trong lúc script ta chạy
--   "any"    = + GUI sinh trễ trong S.EMBED_PROBABLE_AGE giây · "all" = mọi GUI đã ghi nhận
-- Trả về (số GUI nhúng được, lý do bỏ qua gần nhất)
function S.EmbedRecorded(records, containerFrame, mode, verbose)
    if type(records) ~= "table" or #records == 0 then return 0, nil end
    if not containerFrame or not containerFrame.Parent then return 0, "tab đã bị đóng" end
    if not S.embedEnabled then return 0, "🧩 nhúng đang TẮT" end
    mode = mode or "run"

    local order = {}
    for _, r in ipairs(records) do
        if r and r.inst and not r.embedded then order[#order + 1] = r end
    end
    local function score(r)
        if r.certain then return 3 end
        if r.duringRun then return 2 end
        return 1
    end
    table.sort(order, function(a, b) return score(a) > score(b) end)

    local done, whyTop = 0, nil
    for _, r in ipairs(order) do
        local accept = false
        if mode == "all" then
            accept = true
        elseif r.certain then
            accept = true
        elseif r.duringRun and mode ~= "strict" then
            accept = true
        elseif mode == "any" and (r.age or 0) <= S.EMBED_PROBABLE_AGE then
            accept = true
        end
        if accept then
            -- GUI của CHÍNH script tab (hook bắt đúng luồng / sinh ra trong lúc ta chạy / người dùng
            -- chủ động bấm 🔁) thì KHÔNG bị lọc tên: script hay đặt tên ScreenGui là "Main"/"InGame".
            -- Chỉ khi hub phải ĐOÁN (không có tín hiệu sở hữu) mới chặn tên chung chung.
            local trust
            if r.certain then trust = "certain"
            elseif r.duringRun or mode == "all" then trust = "manual"
            else trust = "guess" end
            local okE, why = S.IsEmbeddable(r.inst, containerFrame, trust)
            if okE then
                if S.EmbedGui(r.inst, containerFrame) then
                    r.embedded = true
                    r.why = nil
                    done += 1
                else
                    r.why = "S.EmbedGui từ chối"
                    whyTop = r.why
                end
            else
                r.why = why
                if why then whyTop = why end
                if verbose and not r.reported then
                    r.reported = true
                    pcall(function()
                        print(string.format("[BananaCatHub] 🔍 bỏ qua GUI '%s' (%s, %s): %s",
                            tostring(r.inst and r.inst.Name), tostring(r.via), trust, tostring(why)))
                    end)
                end
            end
        end
    end
    return done, whyTop
end

function S.FindFeatureByHost(host)
    if not host then return nil end
    for _, ft in ipairs(featureTabs) do
        if ft.frame and ft.frame.Parent and ft.frame:FindFirstChild("ScriptHost") == host then return ft end
    end
    return nil
end

function S.FindActiveFeature()
    for _, ft in ipairs(featureTabs) do
        if ft.frame == activeTab then return ft end
    end
    return nil
end

-- Chuỗi chẩn đoán (in ra console F9) để biết vì sao không nhúng được
function S.DiagText(st, records)
    local hookTxt = "không rõ"
    if st then
        if st.available then
            hookTxt = st.viaHookfunction and "OK (qua hookfunction)" or "OK (ghi đè Instance.new)"
        elseif st.hooked then
            hookTxt = "cài được nhưng KHÔNG ăn (executor bỏ qua hook)"
        else
            hookTxt = "BỊ CHẶN (executor không cho sửa Instance.new)"
        end
    end
    local n, certain, watch, scan = 0, 0, 0, 0
    for _, r in ipairs(records or {}) do
        n += 1
        if r.certain then certain += 1 end
        if r.via == "watch" then watch += 1 end
        if r.via == "scan" then scan += 1 end
    end
    local lastWhy = nil
    for _, r in ipairs(records or {}) do if r.why then lastWhy = r.why end end
    return string.format("hook=%s · ghi nhận %d GUI (chắc chắn %d, watcher %d, quét %d) · nhúng=%s · lý do cuối: %s",
        hookTxt, n, certain, watch, scan, tostring(S.embedEnabled and "BẬT" or "TẮT"), tostring(lastWhy or "—"))
end

-- Quét mọi ScreenGui "lạ" đang nằm NGOÀI menu và nhúng vào tab. CHỈ gọi khi người dùng bấm nút 🔁
-- (hub không tự đoán bừa để không ăn nhầm UI của game). Vẫn lọc qua S.IsEmbeddable (mức "manual"),
-- và bấm ✕ trên tab là trả GUI về nguyên trạng.
function S.RescueScan(ft, host)
    host = host or (ft and ft.frame and ft.frame:FindFirstChild("ScriptHost"))
    if not host or not host.Parent then return 0 end
    if not S.embedEnabled then return 0 end
    local containers = {playerGui}
    if targetGui ~= playerGui then containers[#containers + 1] = targetGui end
    pcall(function()
        local cg = game:GetService("CoreGui")
        if cg then containers[#containers + 1] = cg end
    end)
    local seen, n = {}, 0
    for _, ctn in ipairs(containers) do
        pcall(function()
            for _, g in ipairs(ctn:GetChildren()) do
                if n < 3 and not seen[g] then
                    seen[g] = true
                    local okE = S.IsEmbeddable(g, host, "manual")
                    if okE and S.EmbedGui(g, host) then
                        n += 1
                        if ft then
                            ft.records = ft.records or {}
                            ft.records[#ft.records + 1] =
                                {inst = g, certain = false, duringRun = true, age = 0, embedded = true, via = "rescue"}
                        end
                    end
                end
            end
        end)
        if n >= 3 then break end
    end
    return n
end

-- Nhúng lại cho 1 tab tính năng (dùng GUI đã ghi nhận lúc bấm ▶; allowScan = cho phép quét bằng tay)
function S.ReembedFeature(ft, allowScan)
    if not ft or not ft.frame or not ft.frame.Parent then return 0, "tab không còn tồn tại" end
    if not S.embedEnabled then return 0, "🧩 nhúng đang TẮT" end
    local host = ft.frame:FindFirstChild("ScriptHost")
    if not host then return 0, "tab thiếu ScriptHost" end
    -- tab đã có GUI nhúng rồi thì thôi (tránh nhúng trùng 2 bản)
    for _, e in ipairs(S.embeds) do
        if e.host and e.host.Parent == host then return 0, "tab đã có GUI nhúng sẵn" end
    end
    local n, why = S.EmbedRecorded(ft.records, host, "all", true)
    if n > 0 then return n end
    if allowScan == true then
        local m = S.RescueScan(ft, host)
        if m > 0 then return m end
        why = "không tìm thấy GUI nào nằm ngoài menu để nhúng"
    end
    if not why then
        why = (ft.records and #ft.records > 0)
            and (ft.lastWhy or "GUI chưa sẵn sàng để nhúng")
            or  "chưa ghi nhận được GUI nào (script có tạo ScreenGui không?)"
    end
    return 0, why
end

-- Mở tab tính năng -> nếu lần chạy trước GUI bị "rớt" ngoài menu thì TỰ nhúng lại
function S.OnFeatureTabOpened(ft)
    if not ft or not ft.frame or not ft.frame.Parent then return end
    local n = S.ReembedFeature(ft, false)
    if n > 0 then
        pcall(function()
            if ft.status and ft.status.Parent then
                ft.status.Text = string.format(
                    "✅ vừa nhúng lại %d GUI vào tab (lần trước bị rớt ngoài menu) — bấm ✕ để trả về game", n)
            end
            if ft.indicator and ft.indicator.Parent then ft.indicator.BackgroundColor3 = C.GREEN end
        end)
    end
end

-- ===== v4.4h: TAB "🧩 GUI NGOÀI" — chỗ đậu GUI của script chạy ở tab Code =====
-- Mỗi GUI một Ô riêng (cao 240px, xếp dọc) để không chồng lên nhau, kèm nút ↩ trả về game.
S.parkTab   = nil
S.parkBtn   = nil
S.parkList  = nil
S.parkCount = 0
S.PARK_MAX  = 2      -- mỗi lần chạy chỉ đưa tối đa 2 GUI vào menu (tránh nuốt cả UI của game)

function S.ParkHost(label)
    if not (S.parkList and S.parkList.Parent) then
        local sf, btn = AddTab("GUI Ngoài", "🧩", 99)
        S.parkTab, S.parkBtn = sf, btn
        New("TextLabel", {
            Size = UDim2.new(1, -140, 0, 30), Position = UDim2.new(0, 8, 0, 4),
            Text = "🧩 GUI do script chạy ở tab 💻 Code tạo ra — hub đưa vào đây. Bấm ↩ để trả về màn hình game. (Dex/IY/SimpleSpy KHÔNG bao giờ vào đây.)",
            BackgroundTransparency = 1, TextColor3 = C.DARK, Font = Enum.Font.GothamMedium,
            TextSize = 10, TextWrapped = true, ZIndex = 6,
            TextXAlignment = Enum.TextXAlignment.Left,
        }, S.parkTab)
        local backAll = New("TextButton", {
            Size = UDim2.new(0, 124, 0, 24), Position = UDim2.new(1, -128, 0, 6),
            Text = "↩ Trả tất cả về game", BackgroundColor3 = C.RED, BackgroundTransparency = 0.15,
            TextColor3 = C.WHITE, Font = Enum.Font.GothamBold, TextSize = 9, BorderSizePixel = 0, ZIndex = 7,
        }, S.parkTab)
        Corner(backAll, UDim.new(0, 5))
        backAll.Activated:Connect(function()
            local n = S.RemoveAllParked()
            pcall(function()
                print("[BananaCatHub] ↩ đã trả " .. n .. " GUI về màn hình game")
            end)
        end)
        S.parkList = New("Frame", {
            Name = "ParkList", Size = UDim2.new(1, -16, 1, -42), Position = UDim2.new(0, 8, 0, 38),
            BackgroundTransparency = 1, BorderSizePixel = 0, ZIndex = 5,
        }, S.parkTab)
        New("UIListLayout", {Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder}, S.parkList)
    end

    S.parkCount += 1
    local box = New("Frame", {
        Name = "ParkBox_" .. tostring(label or "GUI"),
        Size = UDim2.new(1, 0, 0, 240), LayoutOrder = S.parkCount,
        BackgroundColor3 = C.BG, BackgroundTransparency = 0.35, BorderSizePixel = 0, ZIndex = 5,
    }, S.parkList)
    Corner(box, UDim.new(0, 8))
    Stroke(box, nil, 1)

    local back = New("TextButton", {
        Size = UDim2.new(0, 110, 0, 20), Position = UDim2.new(1, -114, 0, 2),
        Text = "↩ Trả về game", BackgroundColor3 = C.GRAY, BackgroundTransparency = 0.2,
        TextColor3 = C.WHITE, Font = Enum.Font.GothamBold, TextSize = 9, BorderSizePixel = 0, ZIndex = 7,
    }, box)
    Corner(back, UDim.new(0, 5))
    back.Activated:Connect(function()
        S.ClearEmbedsUnder(box)                    -- trả frame con về ScreenGui gốc + hủy host
        pcall(function() box:Destroy() end)
        S.parkCount = math.max(0, S.parkCount - 1)
        pcall(function() S.parkTab.CanvasSize = UDim2.new(0, 0, 0, S.parkCount * 246 + 10) end)
        pcall(function()
            if S.parkBtn then S.parkBtn.Text = S.parkCount > 0
                and ("🧩 GUI Ngoài (" .. S.parkCount .. ")") or "🧩 GUI Ngoài" end
        end)
    end)

    local area = New("Frame", {
        Name = "ParkArea", Size = UDim2.new(1, -8, 1, -30), Position = UDim2.new(0, 4, 0, 26),
        BackgroundTransparency = 1, BorderSizePixel = 0, ClipsDescendants = true, ZIndex = 5,
    }, box)
    pcall(function() S.parkTab.CanvasSize = UDim2.new(0, 0, 0, S.parkCount * 246 + 10) end)
    pcall(function()
        if S.parkBtn then S.parkBtn.Text = "🧩 GUI Ngoài (" .. S.parkCount .. ")" end
    end)
    return area, box
end

-- Bắt đầu "chụp" GUI cho một lần chạy script (gọi TỪ TRONG luồng sẽ chạy script).
-- Trả về nil nếu người dùng tắt 🧩 -> RunCode chạy y như trước, không đổi hành vi.
-- "Công cụ cửa sổ riêng" (Dex Explorer, Infinite Yield, SimpleSpy...): GUI của chúng phải nằm
-- NGOÀI màn hình game. Nhận diện qua URL/tên trong code để kể cả khi người dùng dán loadstring
-- vào tab 💻 Code hoặc chạy từ 💾 Code Đã Lưu thì hub cũng KHÔNG đưa vào menu.
S.NO_PARK_MARKERS = {
    "dex.lua", "dex explorer", "dexexplorer", "infiniteyield", "infinite yield",
    "simplespy", "simple spy",
}
function S.ShouldSkipPark(code, name)
    local hay = (tostring(code or "") .. "\n" .. tostring(name or "")):lower()
    for _, m in ipairs(S.NO_PARK_MARKERS) do
        if hay:find(m, 1, true) then return true, m end
    end
    return false, nil
end

-- Trả MỌI GUI đang đậu trong tab "🧩 GUI Ngoài" về màn hình game (frame con về ScreenGui gốc,
-- khôi phục Position/Size, xóa ô). Dùng cho nút "↩ Trả tất cả về game" và khi tắt công tắc 🪟.
function S.RemoveAllParked()
    if not (S.parkList and S.parkList.Parent) then return 0 end
    local n = 0
    local kids = S.parkList:GetChildren()
    for i = #kids, 1, -1 do
        local box = kids[i]
        if box.Name:sub(1, 8) == "ParkBox_" then
            S.ClearEmbedsUnder(box)
            pcall(function() box:Destroy() end)
            n += 1
        end
    end
    S.parkCount = 0
    pcall(function() S.parkTab.CanvasSize = UDim2.new(0, 0, 0, 10) end)
    pcall(function() if S.parkBtn then S.parkBtn.Text = "🧩 GUI Ngoài" end end)
    return n
end

function S.BeginRunCapture()
    if not S.embedEnabled then return nil end
    -- 🪟 TẮT = script chạy ở tab Code để GUI ngoài màn hình game, đúng như bản trước v4.4h.
    -- (Tab ➕ Tính Năng KHÔNG bị ảnh hưởng: nó dùng S.HookInstanceNew trực tiếp.)
    if S.parkCodeGuis == false then return nil end
    local ok, cap = pcall(function()
        local unhook, recs, st = S.HookInstanceNew()
        local stopWatch = S.WatchNewGuis(recs, st)
        st.stopWatch = stopWatch
        return {unhook = unhook, recs = recs, st = st, stopWatch = stopWatch, parked = 0, names = {}}
    end)
    if not ok then return nil end
    S.activeCap = cap     -- để Cancel() gỡ được hook+watcher nếu người dùng bấm ⏹ Dừng giữa chừng
    return cap
end

-- Người dùng bấm ⏹ Dừng (hoặc bấm ▶ lần mới) giữa lúc đang chụp -> gỡ hook + watcher NGAY.
-- Không có bước này thì mỗi lần hủy để lại 3 connection ChildAdded sống mãi (rò rỉ connection).
function S.AbortRunCapture()
    local cap = S.activeCap
    if not cap then return false end
    S.activeCap = nil
    pcall(function() if cap.st then cap.st.watchOn = false cap.st.inRun = false end end)
    pcall(cap.stopWatch)
    pcall(cap.unhook)
    return true
end

-- Kết thúc chụp: thử đưa GUI vào tab "🧩 GUI Ngoài" ngay + thử lại tới 10s (GUI sinh trễ),
-- rồi nhả hook/watcher. Trả về số GUI đã đưa vào menu.
function S.EndRunCapture(cap, label)
    if not cap then return 0 end
    local st, recs = cap.st, cap.recs
    pcall(function()
        st.inRun = false
        st.graceUntil = os.clock() + 1.0
    end)

    local function try()
        if cap.parked >= S.PARK_MAX or not S.embedEnabled then return 0 end
        local added = 0
        for _, r in ipairs(recs) do
            if cap.parked >= S.PARK_MAX then break end
            if r and r.inst and not r.embedded then
                -- GUI do CHÍNH luồng chạy script tạo (certain) hoặc sinh ra trong lúc script chạy
                -- (duringRun) thì được dùng cả tên chung chung kiểu "Main"; nguồn không rõ thì
                -- vẫn bị lọc tên để không ăn nhầm UI của game.
                local trust
                if r.certain then trust = "certain"
                elseif r.duringRun then trust = "manual"
                else trust = "guess" end
                if S.IsEmbeddable(r.inst, nil, trust) then
                    local area, box = S.ParkHost(label)
                    if area and S.EmbedGui(r.inst, area) then
                        r.embedded = true
                        cap.parked += 1
                        cap.names[#cap.names + 1] = tostring(r.inst.Name)
                        added += 1
                        pcall(function()
                            print(string.format("[BananaCatHub] 🧩 đã đưa GUI '%s' vào tab 'GUI Ngoài' (script chạy ở tab Code)",
                                tostring(r.inst.Name)))
                        end)
                    elseif box then
                        pcall(function() box:Destroy() end)   -- không nhúng được -> đừng để ô rỗng
                        S.parkCount = math.max(0, S.parkCount - 1)
                    end
                end
            end
        end
        return added
    end

    local total = try()
    for _, d in ipairs(S.EMBED_TRY_DELAYS) do
        task.delay(d, function()
            if cap.parked >= S.PARK_MAX then return end
            if not S.embedEnabled then return end
            try()
        end)
    end
    task.delay(S.EMBED_HOOK_GRACE, function()
        pcall(cap.unhook)
        pcall(cap.stopWatch)
        if S.activeCap == cap then S.activeCap = nil end
    end)
    pcall(function()
        print("[BananaCatHub] ▶ tab Code · " .. S.DiagText(st, recs) .. " · đã đưa vào menu: " .. cap.parked)
    end)
    return total
end

local function RunFeatureScript(code, name, containerFrame, indicator, statusLabel)
    if #code == 0 then
        if statusLabel then statusLabel.Text = "⚠️ Vui lòng nhập code!" end
        return false, "empty"
    end

    code = NormalizeCode(code)

    if indicator then indicator.BackgroundColor3 = C.RED end
    if statusLabel then statusLabel.Text = "⏳ Đang thực thi..." end
    ReleaseHubFocus()   -- v4.4b: đang dán code trong TextBox mà chạy luôn thì game vẫn "khóa" input

    local ft = S.FindFeatureByHost(containerFrame)
    if ft then ft.records = nil end   -- lần chạy mới -> bỏ danh sách GUI của lần chạy cũ

    local embedCount, lateCandidate = 0, 0
    local featureUnhook, records, lastWhy, hookState = nil, nil, nil, nil
    local ok, err = pcall(function()
        local fn, lerr = loadstring(code)
        if not fn then error("loadstring thất bại: "..tostring(lerr)) end

        local beforeGuis = {}
        for _, g in ipairs(playerGui:GetChildren()) do beforeGuis[g] = true end
        for _, g in ipairs(targetGui:GetChildren()) do beforeGuis[g] = true end
        pcall(function()
            for _, g in ipairs(game:GetService("CoreGui"):GetChildren()) do beforeGuis[g] = true end
        end)

        -- LỚP 1: hook Instance.new (có probe kiểm chứng). LỚP 2: watcher ChildAdded (không cần hook).
        local unhook, recs, st = S.HookInstanceNew()
        local stopWatch = S.WatchNewGuis(recs, st)
        st.stopWatch = stopWatch
        featureUnhook, records, hookState = unhook, recs, st
        if ft then ft.records = recs ft.hookState = st end

        local fnOk, fnErr = pcall(fn)

        -- Script đã chạy xong phần đồng bộ. Cho thêm 1s "ân hạn": GUI do task.spawn/task.delay
        -- của CHÍNH nó tạo ra ngay sau đó vẫn được tính là "sinh ra trong lúc ta chạy".
        st.inRun = false
        st.graceUntil = os.clock() + 1.0

        -- Hook bị executor chặn -> không có tín hiệu sở hữu nào, nên phải cho phép quét diff
        -- (an toàn: chỉ GUI mới xuất hiện + có frame con + không phải tên hệ thống của game).
        local hookWorks = (st.available == true)
        local useScan = (not hookWorks) or (S.embedGuessNew == true)
        local mode = (S.embedGuessNew == true) and "any" or "run"

        -- CHỜ GUI "CHÍN" rồi mới nhúng (bản cũ thấy ScreenGui là nhúng ngay -> script chưa kịp
        -- thêm frame con -> S.EmbedGui đếm 0 frame con -> hủy host -> coi như KHÔNG nhúng gì).
        for i = 1, S.EMBED_CHILD_WAIT do
            if useScan then
                local found = ScanNewGuis(beforeGuis, nil, true)
                for _, g in ipairs(found) do
                    local now = os.clock()
                    recs[#recs + 1] = {
                        inst = g, certain = false,
                        duringRun = (st.inRun == true) or (now < (st.graceUntil or 0)),
                        age = now - st.t0, embedded = false, via = "scan",
                    }
                end
            end
            local d, why = S.EmbedRecorded(recs, containerFrame, useScan and "any" or mode, true)
            embedCount += d
            if why then lastWhy = why end
            if embedCount > 0 then break end
            task.wait(0.2)
        end

        -- Đã nhúng được thì gỡ hook/watcher ngay; CHƯA được thì giữ thêm S.EMBED_HOOK_GRACE giây
        -- để tiếp tục bắt GUI sinh trễ (bản v4.4f bỏ cuộc sau 2.4s).
        if embedCount > 0 then
            unhook()
            pcall(stopWatch)
        else
            task.delay(S.EMBED_HOOK_GRACE, function() pcall(unhook) pcall(stopWatch) end)
        end

        if not fnOk then error(fnErr) end

        -- THỬ LẠI NHIỀU LẦN sau khi chạy — script dựng GUI sau task.wait/HttpGet vẫn vào được tab,
        -- và nhãn trạng thái tự cập nhật khi nhúng muộn thành công.
        for _, dly in ipairs(S.EMBED_TRY_DELAYS) do
            task.delay(dly, function()
                if embedCount > 0 then return end
                if not (containerFrame and containerFrame.Parent) then return end
                if not S.embedEnabled then return end
                if useScan then
                    local found = ScanNewGuis(beforeGuis, nil, true)
                    for _, g in ipairs(found) do
                        local now = os.clock()
                        recs[#recs + 1] = {
                            inst = g, certain = false, duringRun = false,
                            age = now - st.t0, embedded = false, via = "scan",
                        }
                    end
                end
                local more = S.EmbedRecorded(recs, containerFrame, "any", true)
                if more > 0 then
                    embedCount += more
                    pcall(function()
                        if indicator and indicator.Parent then indicator.BackgroundColor3 = C.GREEN end
                        if statusLabel and statusLabel.Parent then
                            statusLabel.Text = string.format(
                                "✅ xong · GUI sinh trễ đã được nhúng vào tab (%d) — bấm ✕ để trả về màn hình game",
                                embedCount)
                        end
                    end)
                end
            end)
        end

        -- Không nhúng được gì: đếm GUI "lạ" xuất hiện muộn để báo cho người dùng biết đường xử lý
        if embedCount == 0 then
            local late = ScanNewGuis(beforeGuis, nil, true)
            local real = 0
            for _, g in ipairs(late) do
                if g.Parent and not g:IsDescendantOf(containerFrame) then real += 1 end
            end
            if real > 0 then lateCandidate = real end
        end
    end)

    -- Lỗi giữa chừng cũng phải gỡ hook + watcher, không thì Instance.new của cả game bị giữ mãi
    if embedCount > 0 then
        if featureUnhook then pcall(featureUnhook) end
        pcall(function() if hookState and hookState.stopWatch then hookState.stopWatch() end end)
    end
    if ft then
        ft.records   = records    -- giữ lại để MỞ tab / bấm 🔁 là nhúng tiếp được
        ft.lastWhy   = lastWhy
        ft.indicator = indicator
        ft.hookState = hookState
    end
    pcall(function()
        print("[BananaCatHub] ▶ '" .. tostring(name) .. "' · " .. S.DiagText(hookState, records)
            .. " · đã nhúng: " .. embedCount)
    end)

    if ok then
        if indicator then indicator.BackgroundColor3 = C.GREEN end
        if statusLabel then
            if embedCount > 0 then
                statusLabel.Text = string.format(
                    "✅ xong · %d GUI đã nhúng vào tab (bấm ✕ để trả về màn hình game)", embedCount)
            elseif not S.embedEnabled then
                statusLabel.Text = "✅ xong · 🧩 nhúng đang TẮT nên GUI nằm ngoài màn hình — BẬT lại rồi bấm ▶"
            elseif hookState and hookState.available ~= true then
                statusLabel.Text = "⚠️ Executor CHẶN hook Instance.new — hub đã dùng chế độ quét dự phòng"
                    .. (lateCandidate > 0 and (" (thấy " .. lateCandidate .. " GUI mới)") or " (không thấy GUI mới nào)")
                    .. " · bấm 🔁 'Cứu GUI' ở tab Tạo Tính Năng để ép nhúng · chi tiết ở console (F9)"
            elseif lateCandidate > 0 then
                statusLabel.Text = string.format(
                    "✅ xong · thấy %d GUI mới nhưng chưa nhúng được — MỞ lại tab này hoặc bấm 🔁 'Cứu GUI'%s",
                    lateCandidate, (S.embedGuessNew == true) and "" or " · hoặc bật 🕵 'Đoán GUI trễ'")
            else
                statusLabel.Text = "✅ xong · không thấy script tạo GUI nào (script có tạo ScreenGui không?)"
                    .. (lastWhy and (" · lý do: " .. tostring(lastWhy)) or "")
            end
        end
        return true, nil, records
    else
        if indicator then indicator.BackgroundColor3 = C.RED end
        if statusLabel then statusLabel.Text = "❌ Lỗi: "..tostring(err) end
        warn("[BananaCatHub] Feature script error:", err)
        return false, err, records
    end
end
local function CreateFeatureTab(name, icon, codeContent)
    if not name or #name == 0 then name = "Tính Năng " .. (#featureTabs + 1) end
    if not icon or #icon == 0 then icon = "⚙️" end

    codeContent = NormalizeCode(codeContent)

    -- v4.4g: khai báo SỚM. Closure của nút tab (bên dưới) cần `featureData`; nếu để khai báo
    -- muộn thì Lua biên dịch tên đó thành GLOBAL trong closure -> nil -> không tự nhúng lại được.
    local featureData

    local sf = New("ScrollingFrame", {
        Size=UDim2.new(1,0,1,0),
        BackgroundTransparency=1,
        BorderSizePixel=0,
        ScrollBarThickness=5,
        ScrollBarImageColor3=Color3.fromRGB(70, 77, 95),
        ClipsDescendants=true,
        CanvasSize=UDim2.new(0,0,0,0),
        Visible=false,
        Active=true,
        Selectable=false,
        ScrollingDirection=Enum.ScrollingDirection.Y,
        ZIndex=4,
    }, contentArea)

    local btn = New("TextButton", {
        Size=UDim2.new(1,-8,0,38),        -- v4.5 Delta: ô icon 48x38
        Text=icon,                        -- CHỈ icon; tên trang hiện ở header
        BackgroundColor3=C.SURFACE2,      -- pill ghost (SwitchTab tô màu khi trang mở)
        BackgroundTransparency=1,
        TextColor3=C.MUTED,
        Font=Enum.Font.GothamBold,
        TextSize=16,
        BorderSizePixel=0,
        LayoutOrder=featureTabIndex + #featureTabs,
        TextXAlignment=Enum.TextXAlignment.Center,
        ZIndex=4,
    }, tabBar)
    Corner(btn, UDim.new(0,10))           -- v4.5 Delta: bo 10px cho ô icon
    pcall(function()
        btn:SetAttribute("BCTabName", name)   -- header + hover đọc tên trang từ đây
        btn:SetAttribute("BCTabIcon", icon)
    end)
    -- v4.5: rê chuột vào tab chưa mở thì pill hiện nhẹ. Tab ĐANG mở (chữ vàng) thì không đụng,
    -- để SwitchTab toàn quyền quyết định màu -> không đánh nhau giữa tween và trạng thái tab.
    pcall(function()
        trackConn(btn.MouseEnter:Connect(function()
            if btn.BackgroundTransparency > 0.5 then Tween(btn, {BackgroundTransparency = 0.62}, 0.16) end
            pcall(function()   -- v4.5 Delta: rê vào icon nào thì header hiện TÊN trang đó (mờ nhẹ)
                if D.pageTitle then
                    D.hoverName = btn:GetAttribute("BCTabName")
                    local ic = btn:GetAttribute("BCTabIcon")
                    D.pageTitle.Text = (ic and (ic .. "  ") or "") .. tostring(D.hoverName or "")
                    D.pageTitle.TextTransparency = 0.4
                end
            end)
        end))
        trackConn(btn.MouseLeave:Connect(function()
            if btn.TextColor3 ~= C.ACCENT then Tween(btn, {BackgroundTransparency = 1}, 0.2) end
            pcall(function()   -- rời chuột: header trả về tên trang ĐANG MỞ
                D.hoverName = nil
                if D.pageTitle and D.activeName then
                    D.pageTitle.Text = D.activeName
                    D.pageTitle.TextTransparency = 0
                end
            end)
        end))
    end)

    -- tra cuu index dong (xem giai thich o AddTab)
    btn.Activated:Connect(function()
        for i, b in ipairs(tabs) do
            if b == btn then
                SwitchTab(i)
                -- v4.4g: MỞ tab -> nếu lần bấm ▶ trước GUI bị "rớt" ngoài menu thì TỰ nhúng lại.
                -- task.defer để tab kịp hiện + AbsoluteSize kịp đúng trước khi đo.
                task.defer(function() S.OnFeatureTabOpened(featureData) end)
                break
            end
        end
    end)

    table.insert(tabs, btn)
    table.insert(tabContent, sf)
    tabBar.CanvasSize = UDim2.new(0, 0, 0, #tabs * 44 + 10)

    local tabIdx = #tabs

    featureData = {
        name = name,
        icon = icon,
        code = codeContent,
        btn = btn,
        frame = sf,
        tabIdx = tabIdx,
    }
    table.insert(featureTabs, featureData)

    local embedHost = New("Frame", {
        Size = UDim2.new(1,0,1,-36),
        Position = UDim2.new(0,0,0,0),
        BackgroundTransparency = 1,
        BorderSizePixel = 0,
        ZIndex = 5,
        Name = "ScriptHost",
        Visible = true,
    }, sf)
    featureData.hostFrame = embedHost   -- v4.4g

    local toolbar = New("Frame", {
        Size = UDim2.new(1,0,0,36),
        Position = UDim2.new(0,0,1,-36),
        BackgroundColor3 = Color3.fromRGB(230,233,242),
        BackgroundTransparency = 0.1,
        BorderSizePixel = 0,
        ZIndex = 20,
    }, sf)
    Corner(toolbar, UDim.new(0,6))
    Stroke(toolbar, Color3.fromRGB(180,185,200), 1)

    -- Bố cục toolbar (khung nội dung v4.6 rộng 484px; ô trạng thái dùng Scale nên tự tràn):
    --   Chạy Script (90px @6) | Chép Code (84px @100) | Sửa (52px @188)
    --   | 🎯 Tâm (68px @244) | [trạng thái co giãn] (Scale fill từ 316 → -56) | ✕ (40px @-46)
    local runFeatureBtn = New("TextButton", {
        Size=UDim2.new(0,90,0,26), Position=UDim2.new(0,6,0,5),
        Text="▶ Chạy Script", BackgroundColor3=C.GREEN, BackgroundTransparency=0.1,
        TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=9, BorderSizePixel=0, ZIndex=21,
    }, toolbar)
    Corner(runFeatureBtn, UDim.new(0,5))

    local saveFeatureBtn = New("TextButton", {
        Size=UDim2.new(0,84,0,26), Position=UDim2.new(0,100,0,5),
        Text="📤 Chép Code", BackgroundColor3=C.BLUE, BackgroundTransparency=0.1,
        TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=9, BorderSizePixel=0, ZIndex=21,
    }, toolbar)
    Corner(saveFeatureBtn, UDim.new(0,5))

    local editFeatureBtn = New("TextButton", {
        Size=UDim2.new(0,52,0,26), Position=UDim2.new(0,188,0,5),
        Text="✏️ Sửa", BackgroundColor3=C.ORANGE, BackgroundTransparency=0.1,
        TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=10, BorderSizePixel=0, ZIndex=21,
    }, toolbar)
    Corner(editFeatureBtn, UDim.new(0,5))

    -- v4.4e: nút 🎯 bật/tắt vòng tròn niêm tâm ở GIỮA MÀN HÌNH GAME (ngoài menu)
    local crosshairBtn = New("TextButton", {
        Size=UDim2.new(0,68,0,26), Position=UDim2.new(0,244,0,5),
        Text="🎯 Tâm", BackgroundColor3=C.PURPLE, BackgroundTransparency=0.1,
        TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=9, BorderSizePixel=0, ZIndex=21,
    }, toolbar)
    Corner(crosshairBtn, UDim.new(0,5))
    S.RegisterCrosshairBtn(crosshairBtn)

    local closeFeatureBtn = New("TextButton", {
        Size=UDim2.new(0,40,0,26), Position=UDim2.new(1,-46,0,5),
        Text="✕", BackgroundColor3=C.RED, BackgroundTransparency=0.1,
        TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=12, BorderSizePixel=0, ZIndex=21,
    }, toolbar)
    Corner(closeFeatureBtn, UDim.new(0,5))

    local fStatus = New("TextLabel", {
        -- co giãn theo khung: từ 316px đến nút ✕ (trừ 46+6=52px từ phải)
        Size=UDim2.new(1,-52-316,0,26), Position=UDim2.new(0,316,0,5),
        Text="", BackgroundTransparency=1, TextColor3=Color3.fromRGB(255, 205, 64),
        Font=Enum.Font.GothamMedium, TextSize=8, TextXAlignment=Enum.TextXAlignment.Left,
        TextTruncate=Enum.TextTruncate.AtEnd, ZIndex=21,
    }, toolbar)
    featureData.status = fStatus   -- v4.4g: hub tự sửa nhãn khi nhúng trễ thành công

    local editorFrame = New("Frame", {
        Size=UDim2.new(1,0,1,-36),
        Position=UDim2.new(0,0,0,0),
        BackgroundColor3=Color3.fromRGB(245,247,252),
        BackgroundTransparency=0,
        BorderSizePixel=0,
        ZIndex=30,
        Visible=false,
    }, sf)

    local editorBox = New("TextBox", {
        Size=UDim2.new(1,-16,1,-70), Position=UDim2.new(0,8,0,8),
        Text=codeContent,
        PlaceholderText="Dán script hoàn chỉnh HOẶC link raw vào đây...\nScript có thể tạo GUI riêng, GUI đó sẽ được nhúng vào tab này.",
        PlaceholderColor3=Color3.fromRGB(122, 130, 148),
        BackgroundColor3=Color3.fromRGB(26, 29, 38), BackgroundTransparency=0,
        TextColor3=Color3.fromRGB(233, 237, 245),
        Font=Enum.Font.Code, TextSize=11, BorderSizePixel=0, ClearTextOnFocus=false,
        MultiLine=true, TextWrapped=true, TextXAlignment=Enum.TextXAlignment.Left, TextYAlignment=Enum.TextYAlignment.Top,
        Active=true, Selectable=true, ZIndex=31,
    }, editorFrame)
    Corner(editorBox, UDim.new(0,5))
    Stroke(editorBox, Color3.fromRGB(100,120,200), 1.5)
    New("UIPadding", {PaddingLeft=UDim.new(0,6), PaddingTop=UDim.new(0,4)}, editorBox)

    local applyEditBtn = New("TextButton", {
        Size=UDim2.new(0,120,0,26), Position=UDim2.new(0,8,1,-34),
        Text="✅ Áp Dụng", BackgroundColor3=C.GREEN, BackgroundTransparency=0.1,
        TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=10, BorderSizePixel=0, ZIndex=31,
    }, editorFrame)
    Corner(applyEditBtn, UDim.new(0,5))

    local cancelEditBtn = New("TextButton", {
        Size=UDim2.new(0,120,0,26), Position=UDim2.new(0,134,1,-34),
        Text="❌ Hủy", BackgroundColor3=C.RED, BackgroundTransparency=0.1,
        TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=10, BorderSizePixel=0, ZIndex=31,
    }, editorFrame)
    Corner(cancelEditBtn, UDim.new(0,5))

    -- v4.4b: ClearHost không còn "phá sạch" — nó trả GUI của script về ScreenGui gốc
    -- (Position/Size cũ) rồi mới xóa host, nên bấm Chạy lại / ✕ / đổi code không làm
    -- script của bạn mất UI nữa.
    local function ClearHost()
        S.ClearEmbedsUnder(embedHost)
    end

    runFeatureBtn.Activated:Connect(function()
        ClearHost()
        fStatus.Text = "⏳ Đang chạy..."
        RunFeatureScript(codeContent, name, embedHost, runFeatureBtn, fStatus)
    end)

    saveFeatureBtn.Activated:Connect(function()
        local c = codeContent
        if #c == 0 then
            fStatus.Text = "⚠️ Không có code!"
            return
        end
        local n = name
        local bn = n
        local cnt = 1
        while true do
            local ex = false
            for _, s in ipairs(scripts) do
                if s.name == n then ex = true; break end
            end
            if not ex then break end
            cnt += 1
            n = bn.." ("..cnt..")"
        end
        -- Nut nay CHEP MOT BAN cua code sang tab "Code Đã Lưu" cho tiện quản lý.
        -- Nó KHÔNG phải cách lưu tính năng: tab tính năng đã được tự động lưu riêng
        -- (xem Store.saveSoon() ở createTabBtn / applyEditBtn / delBtn).
        table.insert(scripts, {name = n, code = c, expanded = false})
        if RebuildScripts then RebuildScripts() end
        Store.saveSoon()
        fStatus.Text = "✅ Đã chép sang tab Code!"
    end)

    editFeatureBtn.Activated:Connect(function()
        editorBox.Text = codeContent
        editorFrame.Visible = true
    end)

    applyEditBtn.Activated:Connect(function()
        codeContent = NormalizeCode(editorBox.Text)
        featureData.code = codeContent
        editorFrame.Visible = false
        ClearHost()
        Store.saveSoon()   -- code đã đổi thì bản lưu trên đĩa cũng phải đổi theo
        fStatus.Text = "✏️ Đã cập nhật code"
    end)

    cancelEditBtn.Activated:Connect(function()
        editorFrame.Visible = false
    end)

    closeFeatureBtn.Activated:Connect(function()
        ClearHost()
        OpenFirstPage()   -- v4.6.2: đóng tab tính năng thì về trang đầu (💾 Code Đã Lưu)
    end)

    return featureData
end

-- v4.4b: watcher resize. Bản cũ ép Size từng frame con mỗi lần kéo menu (nguồn gốc làm vỡ layout
-- + nuốt click). Bản mới chỉ cập nhật UIScale của host -> GUI to/tho theo menu mà layout còn nguyên.
task.spawn(function()
    task.wait(1)
    local lastSize = main.AbsoluteSize
    while main and main.Parent do
        task.wait(0.15)
        if main.AbsoluteSize ~= lastSize then
            lastSize = main.AbsoluteSize
            if #S.embeds > 0 then
                S.SyncAllEmbeds()
            end
            S.PruneEmbeds()
            -- dọn list _G do bản v4.4a để lại (nó lớn vô hạn vì không ai xoá phần tử đã chết)
            if _G.BananaCatHub_EmbedHosts then
                for i = #_G.BananaCatHub_EmbedHosts, 1, -1 do
                    local host = _G.BananaCatHub_EmbedHosts[i]
                    if not host or not host.Parent then
                        table.remove(_G.BananaCatHub_EmbedHosts, i)
                    end
                end
            end
        end
    end
end)

local createFeatureTab = AddTab("Tạo Tính Năng", "➕", 6)

local cy = 8
Label(createFeatureTab, "➕ Tạo Tab Tính Năng Tích Hợp", cy)
cy = cy + 16
Label(createFeatureTab, "Dán NGUYÊN một script hoàn chỉnh HOẶC link raw.", cy)
cy = cy + 14
Label(createFeatureTab, "Script chạy trong tab; GUI của NÓ được nhúng vào menu (không đụng GUI game).", cy)
cy = cy + 14
Label(createFeatureTab, "💾 Tab tạo ra TỰ ĐỘNG được lưu — thoát game vào lại vẫn còn, khỏi cần bấm gì thêm.", cy)
cy = cy + 14
Label(createFeatureTab, "🧩 Bấm 🎯 Chạy Script xong nhớ bấm ✕ hoặc kéo menu to ra — hub tự nhả focus", cy)
cy = cy + 14
Label(createFeatureTab, "    để bạn quay chuột/bắn lại bình thường. Nếu script vẫn chiếm chuột: 🧩 TẮT nhúng.", cy)
cy = cy + 18

Label(createFeatureTab, "🏷️ Tên Tính Năng:", cy)
cy = cy + 14

local featureNameIn = New("TextBox", {
    Size=UDim2.new(1,-16,0,26), Position=UDim2.new(0,8,0,cy), Text="",
    PlaceholderText="VD: Auto Farm, Fly, Speed...",
    PlaceholderColor3=Color3.fromRGB(122, 130, 148),
    BackgroundColor3=Color3.fromRGB(26, 29, 38), BackgroundTransparency=0, TextColor3=Color3.fromRGB(233, 237, 245),
    Font=Enum.Font.GothamMedium, TextSize=12, BorderSizePixel=0, ClearTextOnFocus=false,
    Active=true, Selectable=true, ZIndex=10, TextXAlignment=Enum.TextXAlignment.Left,
}, createFeatureTab)
Corner(featureNameIn, UDim.new(0,5))
Stroke(featureNameIn, Color3.fromRGB(100,120,200), 1.5)
New("UIPadding", {PaddingLeft=UDim.new(0,6)}, featureNameIn)

cy = cy + 32
Label(createFeatureTab, "🎨 Icon (1 ký tự, tùy chọn):", cy)
cy = cy + 14

local featureIconIn = New("TextBox", {
    Size=UDim2.new(0,60,0,26), Position=UDim2.new(0,8,0,cy), Text="⚙️",
    PlaceholderColor3=Color3.fromRGB(122, 130, 148),
    BackgroundColor3=Color3.fromRGB(26, 29, 38), BackgroundTransparency=0, TextColor3=Color3.fromRGB(233, 237, 245),
    Font=Enum.Font.GothamBold, TextSize=14, BorderSizePixel=0, ClearTextOnFocus=false,
    Active=true, Selectable=true, ZIndex=10,
}, createFeatureTab)
Corner(featureIconIn, UDim.new(0,5))
Stroke(featureIconIn, Color3.fromRGB(180,180,200), 1.2)

cy = cy + 32
Label(createFeatureTab, "📜 Dán Script Hoàn Chỉnh HOẶC link raw:", cy)
cy = cy + 14

local featureCodeIn = New("TextBox", {
    Size=UDim2.new(1,-16,0,140), Position=UDim2.new(0,8,0,cy), Text="",
    PlaceholderText="Dán script hoặc link raw (https://...) vào đây...\nScript có thể tạo ScreenGui riêng, GUI đó sẽ được nhúng vào tab.",
    PlaceholderColor3=Color3.fromRGB(122, 130, 148),
    BackgroundColor3=Color3.fromRGB(28, 31, 41), BackgroundTransparency=0, TextColor3=Color3.fromRGB(233, 237, 245),
    Font=Enum.Font.Code, TextSize=11, BorderSizePixel=0, ClearTextOnFocus=false,
    MultiLine=true, TextWrapped=true, TextXAlignment=Enum.TextXAlignment.Left, TextYAlignment=Enum.TextYAlignment.Top,
    Active=true, Selectable=true, ZIndex=10,
}, createFeatureTab)
Corner(featureCodeIn, UDim.new(0,5))
Stroke(featureCodeIn, Color3.fromRGB(100,120,200), 1.5)
New("UIPadding", {PaddingLeft=UDim.new(0,6), PaddingTop=UDim.new(0,4)}, featureCodeIn)

cy = cy + 146

local createTabBtn = Button(createFeatureTab, "➕ Tạo Tab Tính Năng", 8, cy, 210, 28, Color3.fromRGB(0,150,200))
local clearFormBtn = Button(createFeatureTab, "🧹 Xóa Form", 224, cy, 116, 28, C.ORANGE)
cy = cy + 34

local embedToggleBtn = Button(createFeatureTab, "🧩 Nhúng vào Tab: BẬT", 346, cy - 34, 130, 28, C.GREEN)
local guessToggleBtn = Button(createFeatureTab, "🕵 Đoán GUI trễ: TẮT", 8, cy, 176, 26, C.GRAY)
local grabSizeCodeBtn = Button(createFeatureTab, "📏 Code Tự Co Giãn (an toàn, Auto-Lưu)", 190, cy, 286, 26, C.PURPLE)
cy = cy + 34
local fixMouseBtn = Button(createFeatureTab, "🖱 Kẹt chuột / không bấm được? Bấm đây", 8, cy, 468, 24, C.RED)
cy = cy + 30
-- v4.4e: CODE MẪU mới có sẵn (1) "hợp đồng kích thước" để GUI tự vừa ô tab khi
-- người khác chạy, (2) khối EXTERNAL OVERLAY + nút 🎯 niêm tâm ở GIỮA MÀN HÌNH
-- GAME (không bị hub kéo vào trong khung menu) làm ví dụ cho AI/người nhận viết
-- tiếp các tính năng can thiệp ngoài màn hình (ESP/HUD/crosshair).
local copyTemplateBtn = Button(createFeatureTab, "📋 Copy Code Mẫu Cho AI (menu + niêm tâm)", 8, cy, 468, 26, C.BLUE)
cy = cy + 32

-- v4.4g: NÚT CỨU GUI — nhúng lại GUI của tab tính năng ĐANG MỞ vào trong menu.
-- Dùng khi: bấm ▶ Chạy Script xong mà GUI vẫn nằm ngoài màn hình (script tạo GUI quá trễ,
-- tạo trong task.spawn/task.delay, hoặc hub lỡ bỏ qua). Nút này cũng QUÉT các ScreenGui "lạ"
-- đang nằm ngoài (đã lọc: không phải của hub, không phải GUI hệ thống/game, không phải overlay
-- BCHub_External, phải có frame con) — bấm ✕ trên tab là trả GUI về nguyên trạng.
S.reembedBtn = Button(createFeatureTab,
    "🔁 Cứu GUI: nhúng lại GUI của tab ĐANG MỞ vào menu", 8, cy, 468, 26, C.BLUE)
cy = cy + 32

-- v4.4i: công tắc 🪟 cho việc đưa GUI của script chạy ở TAB CODE vào menu.
-- Lý do có nút này: Dex Explorer / Infinite Yield / SimpleSpy và mấy hub của người khác là
-- "cửa sổ riêng" — chúng phải nằm NGOÀI màn hình game. Ai muốn mọi script ở tab 💻 Code
-- đều hiện ngoài màn hình (như bản cũ) thì bấm TẮT một cái là xong.
S.parkToggleBtn = Button(createFeatureTab,
    "🪟 GUI chạy ở tab 💻 Code → đưa vào menu: BẬT", 8, cy, 468, 26, C.GREEN)
cy = cy + 32

-- v4.4g: 🧩 và 🕵 giờ ĐƯỢC LƯU XUỐNG ĐĨA (Store.serialize mục settings) -> vào lại game
-- phải đồng bộ nhãn nút theo trạng thái đã nạp, không thì nút hiện "BẬT" trong khi đang TẮT.
S.SyncEmbedToggles = function()
    pcall(function() if D.SyncPageChips then D.SyncPageChips() end end)   -- v4.5: chip trên header trang
    pcall(function()
        embedToggleBtn.Text = S.embedEnabled and "🧩 Nhúng vào Tab: BẬT" or "🧩 Nhúng vào Tab: TẮT"
        D.SetBg(embedToggleBtn, S.embedEnabled and C.GREEN or C.GRAY)   -- v4.5
        guessToggleBtn.Text = (S.embedGuessNew == true) and "🕵 Đoán GUI trễ: BẬT" or "🕵 Đoán GUI trễ: TẮT"
        D.SetBg(guessToggleBtn, (S.embedGuessNew == true) and C.ORANGE or C.GRAY)   -- v4.5
        -- v4.4i: nút 🪟 (có thể chưa tồn tại khi hàm này được gọi lần đầu lúc khởi động)
        if S.parkToggleBtn then
            local on = (S.parkCodeGuis ~= false)
            S.parkToggleBtn.Text = on and "🪟 GUI chạy ở tab 💻 Code → đưa vào menu: BẬT"
                                     or "🪟 GUI chạy ở tab 💻 Code → để ngoài màn hình: TẮT"
            D.SetBg(S.parkToggleBtn, on and C.GREEN or C.GRAY)
        end
    end)
end
S.SyncEmbedToggles()

local createStatus = Label(createFeatureTab, "", cy)
createStatus.TextColor3=C.YELLOW; createStatus.TextSize=9; createStatus.ZIndex=6
cy = cy + 14

-- (handler đặt ở ĐÂY vì createStatus phải nằm trong scope lúc compile closure —
--  đặt sớm hơn thì Lua biên dịch `createStatus` thành GLOBAL và gán vào nil -> error)
-- v4.5: tách thành hàm để công tắc trên header trang gọi lại ĐÚNG logic này (một nguồn duy nhất)
S.DoToggleEmbed = function()
    S.embedEnabled = not S.embedEnabled
    if S.embedEnabled then
        embedToggleBtn.Text = "🧩 Nhúng vào Tab: BẬT"
        D.SetBg(embedToggleBtn, C.GREEN)
        createStatus.Text = "🧩 BẬT: GUI của script được mượn vào tab. Bấm ✕ trên tab để trả về như cũ."
    else
        embedToggleBtn.Text = "🧩 Nhúng vào Tab: TẮT"
        D.SetBg(embedToggleBtn, C.GRAY)
        -- TẮT = hoàn tác ngay mọi thứ đang nhúng: hub không còn đụng vào GUI nào -> input của
        -- game (quay chuột, bắn, nút HUD) trở lại bình thường 100%.
        for _, ft in ipairs(featureTabs) do
            local hostFrame = ft.frame and ft.frame:FindFirstChild("ScriptHost")
            if hostFrame then S.ClearEmbedsUnder(hostFrame) end
        end
        S.PruneEmbeds()
        createStatus.Text = "🛡 Chế độ an toàn: hub không sửa GUI nào nữa. Muốn nhúng lại thì bấm BẬT."
    end
    Store.saveSoon()   -- v4.4g: lưu trạng thái 🧩 xuống đĩa -> thoát game vào lại vẫn giữ
    pcall(function() if Store.refreshStatus then Store.refreshStatus() end end)
end
embedToggleBtn.Activated:Connect(S.DoToggleEmbed)

S.DoToggleGuess = function()
    S.embedGuessNew = not (S.embedGuessNew == true)
    if S.embedGuessNew then
        guessToggleBtn.Text = "🕵 Đoán GUI trễ: BẬT"
        D.SetBg(guessToggleBtn, C.ORANGE)
        createStatus.Text = "🕵 BẬT: script tạo GUI trễ (sau HttpGet/task.wait) sẽ được nhúng — tiện hơn"
            .. " nhưng nếu game cũng vừa mở UI đúng lúc thì UI đó có thể bị mượn vào tab (bấm ✕ để trả)."
    else
        guessToggleBtn.Text = "🕵 Đoán GUI trễ: TẮT"
        D.SetBg(guessToggleBtn, C.GRAY)
        createStatus.Text = "🛡 An toàn nhất: chỉ nhúng GUI mà hub chắc chắn là của script."
            .. " Script tạo GUI trễ sẽ chạy bình thường ngoài màn hình, không bị nhúng."
    end
    Store.saveSoon()   -- v4.4g: lưu trạng thái 🕵 xuống đĩa
end
guessToggleBtn.Activated:Connect(S.DoToggleGuess)

-- v4.4i: bật/tắt việc đưa GUI của script chạy ở tab 💻 Code vào menu
S.DoTogglePark = function()
    S.parkCodeGuis = (S.parkCodeGuis == false)   -- đảo trạng thái
    S.SyncEmbedToggles()
    if S.parkCodeGuis == false then
        local n = S.RemoveAllParked()   -- hoàn tác ngay: trả GUI về màn hình game
        createStatus.Text = "🪟 TẮT: script chạy ở tab 💻 Code / 💾 Code Đã Lưu sẽ để GUI NGOÀI màn hình game"
            .. (n > 0 and (" · đã trả " .. n .. " GUI về màn hình") or "")
            .. " · tab ➕ Tính Năng vẫn nhúng GUI vào tab như bình thường."
    else
        createStatus.Text = "🪟 BẬT: GUI của script chạy ở tab 💻 Code sẽ được đưa vào tab '🧩 GUI Ngoài'"
            .. " (mỗi GUI có nút ↩ trả về màn hình). Dex/IY/SimpleSpy vẫn LUÔN ở ngoài màn hình game."
    end
    Store.saveSoon()   -- lưu xuống đĩa: thoát game vào lại vẫn giữ lựa chọn này
end
S.parkToggleBtn.Activated:Connect(S.DoTogglePark)

grabSizeCodeBtn.Activated:Connect(function()
    local currentCode = featureCodeIn.Text
    if #currentCode == 0 then
        createStatus.Text = "⚠️ Ô code đang trống, không có gì để lấy!"
        return
    end

    -- v4.4b. Wrapper cũ của bản 4.4a QUÉT MỌI ScreenGui trong CoreGui + PlayerGui rồi ép
    -- Size=(1,0,1,0)/Position=(0,0) lên TỪNG frame con -> đó chính là lý do "mấy nút của game
    -- bị lỗi" và "không click/bắn được" (một frame trong suốt bị kéo full màn hình, Active,
    -- nuốt hết input). Wrapper mới KHÔNG hề đụng GUI của game: nó chỉ
    --   (1) hook Instance.new trong lúc script của bạn chạy -> biết GUI nào là CỦA BẠN,
    --   (2) gắn UIScale vào root GUI của bạn để nó co giãn theo kích thước menu hub.
    local wrappedCode = [[
-- ===== AUTO-GENERATED FIT WRAPPER v4.4b =====
-- An toàn: chỉ can thiệp GUI do CHÍNH script này tạo. Không quét CoreGui/PlayerGui.
local _FIT_WRAPPER = true
local _bcRealNew = Instance.new
local _bcMine = {}
local _bcHookOn = true
pcall(function()
    Instance.new = function(cls, ...)
        local inst = _bcRealNew(cls, ...)
        if _bcHookOn and cls == "ScreenGui" then _bcMine[#_bcMine + 1] = inst end
        return inst
    end
end)

]] .. currentCode .. [[

pcall(function() _bcHookOn = false; Instance.new = _bcRealNew end)

-- Script có thể tạo GUI trễ (sau HttpGet/task.wait): giữ hook thêm vài giây
task.delay(4, function()
    pcall(function() _bcHookOn = false; Instance.new = _bcRealNew end)
end)

task.defer(function()
    task.wait(0.4)
    local hub = nil
    pcall(function()
        local hubGui = (gethui and gethui()) or game:GetService("Players").LocalPlayer:FindFirstChildOfClass("PlayerGui")
        hub = hubGui and hubGui:FindFirstChild("ExMenu") and hubGui.ExMenu:FindFirstChildWhichIsA("Frame")
        if not hub then
            local pg = game:GetService("Players").LocalPlayer:FindFirstChildOfClass("PlayerGui")
            hub = pg and pg:FindFirstChild("ExMenu") and pg.ExMenu:FindFirstChildWhichIsA("Frame")
        end
    end)
    for _, g in ipairs(_bcMine) do
        pcall(function()
            if not g or not g.Parent then return end
            local root = g:FindFirstChildWhichIsA("Frame")
                or g:FindFirstChildWhichIsA("ScrollingFrame")
                or g:FindFirstChildWhichIsA("GuiObject")
            if not root then return end
            -- chỉ can chỉnh khi GUI dùng kích thước hard-code (offset). GUI đã dùng Scale
            -- (1,0,1,0) thì tự theo màn hình rồi, nhân UIScale lên nữa là TRÀN ra ngoài.
            if root.Size and (root.Size.X.Scale ~= 0 or root.Size.Y.Scale ~= 0) then return end
            local us = root:FindFirstChild("BananaCatFitScale")
            if not us then
                us = _bcRealNew("UIScale")
                us.Name = "BananaCatFitScale"
                us.Parent = root
            end
            if hub then
                local function _bcSync()
                    us.Scale = math.clamp(hub.AbsoluteSize.X / 540, 0.8, 1.6)
                end
                _bcSync()
                hub:GetPropertyChangedSignal("AbsoluteSize"):Connect(function()
                    pcall(_bcSync)
                end)
            end
        end)
    end
end)
]]

    local saveName = "AutoSize_"..os.date("%H%M%S")
    local bn = saveName
    local cnt = 1
    while true do
        local ex = false
        for _, s in ipairs(scripts) do
            if s.name == saveName then ex = true; break end
        end
        if not ex then break end
        cnt += 1
        saveName = bn.." ("..cnt..")"
    end

    table.insert(scripts, {name = saveName, code = wrappedCode, expanded = false})
    if RebuildScripts then RebuildScripts() end
    Store.saveSoon()

    -- v4.4b: KHÔNG ghi đè ô code nữa (bản cũ làm MẤT code gốc của bạn trong tab).
    createStatus.Text = "✅ Đã lưu bản tự co giãn vào tab 'Code Đã Lưu': "..saveName..
        " · để tab tính năng co giãn theo menu thì KHÔNG cần bản này, hub tự làm khi bấm ▶ Chạy Script."
end)

-- Nút "cứu nguy": trả mọi GUI hub đang mượn về game + nhả focus + trả chuột về mặc định.
-- Dùng khi bấm ▶ Chạy Script xong mà không quay chuột/bắn được (do CHÍNH script bạn dán chiếm,
-- không phải do hub) — hub không can thiệp ngược lại script đó, chỉ trả input về cho game.
-- v4.5: tách thành hàm S.DoFixMouse để trang 📚 Script Hub gọi lại được
S.DoFixMouse = function()
    local done = {}
    ReleaseHubFocus()
    done[#done+1] = "nhả focus"
    local restored = 0
    for _, ft in ipairs(featureTabs) do
        local hostFrame = ft.frame and ft.frame:FindFirstChild("ScriptHost")
        if hostFrame then restored = restored + S.ClearEmbedsUnder(hostFrame) end
    end
    if restored > 0 then done[#done+1] = "đã trả " .. restored .. " GUI về game" end
    -- đồng bộ lại host với trạng thái Enabled thật của GUI (phòng khi lệch sau khi script toggle)
    for _, e in ipairs(S.embeds) do
        pcall(function() e.host.Visible = e.gui.Enabled end)
    end
    pcall(function() UserInputService.MouseBehavior = Enum.MouseBehavior.Default end)
    done[#done+1] = "chuột về mặc định"
    createStatus.Text = "🖱 " .. table.concat(done, " · ")
        .. " — vẫn không được? 🧩 TẮT nhúng rồi bấm ▶ lại (lúc đó hub không đụng GUI nào)"
    return table.concat(done, " · ")
end
fixMouseBtn.Activated:Connect(S.DoFixMouse)

S.reembedBtn.Activated:Connect(function()
    ReleaseHubFocus()
    local ft = S.FindActiveFeature()
    if not ft then
        createStatus.Text = "⚠️ Hãy MỞ tab tính năng cần cứu trước (bấm vào tab đó cho nó hiện ra) rồi hãy bấm 🔁."
        return
    end
    if not S.embedEnabled then
        createStatus.Text = "⚠️ 🧩 'Nhúng vào Tab' đang TẮT — BẬT lại rồi mới cứu GUI được."
        return
    end
    createStatus.Text = "⏳ Đang tìm GUI của '" .. ft.name .. "' để nhúng lại vào menu..."
    -- task.defer: việc đo AbsoluteSize/đổi Parent cần 1 nhịp render, không chặn nút bấm
    task.defer(function()
        local n, why = S.ReembedFeature(ft, true)
        if n > 0 then
            createStatus.Text = string.format(
                "✅ Đã nhúng lại %d GUI vào tab '%s'. Nếu lỡ nhúng nhầm GUI khác, mở tab đó bấm ✕ để trả về.",
                n, ft.name)
            pcall(function()
                if ft.status and ft.status.Parent then
                    ft.status.Text = string.format("✅ đã nhúng lại %d GUI vào tab (nút 🔁 Cứu GUI)", n)
                end
                if ft.indicator and ft.indicator.Parent then ft.indicator.BackgroundColor3 = C.GREEN end
            end)
        else
            createStatus.Text = "⚠️ Chưa nhúng được: " .. tostring(why or "không rõ lý do")
                .. " · bấm ▶ Chạy Script lại rồi CHỜ 10 giây (hub tự thử lại 5 lần) · xem console (F9) để biết hook có bị executor chặn không."
        end
        print(string.format("[BananaCatHub] 🔁 Cứu GUI tab '%s': %d GUI đã nhúng%s",
            tostring(ft.name), n, why and (" · lý do bỏ qua: " .. tostring(why)) or ""))
    end)
end)

copyTemplateBtn.Activated:Connect(function()
    ReleaseHubFocus()
    local nm = (featureNameIn.Text or ""):gsub('[\r	"]', " "):gsub("^%s+", ""):gsub("%s+$", "")
    if #nm == 0 then nm = "Tính Năng Mới" end
    local ic = (featureIconIn.Text or ""):gsub('[\r	"]', " ")
    if #ic == 0 then ic = "⚙️" end
    local stamp
    pcall(function() stamp = os.date("sinh %H:%M %d/%m/%Y") end)
    local code = S.FeatureTemplate(nm, ic, stamp)

    -- copy ra clipboard: executor nào cũng có 1 trong 3 hàm này
    local copied = false
    for _, fname in ipairs({"setclipboard", "toclipboard", "set_clipboard"}) do
        if not copied then
            local f = _G[fname]
            if type(f) == "function" then copied = (pcall(f, code)) end
        end
    end
    -- điền vào ô code CHỈ KHI đang trống -> không bao giờ làm mất code bạn đang soạn
    local inBox = false
    if #featureCodeIn.Text == 0 then
        featureCodeIn.Text = code
        inBox = true
    end
    -- lưu 1 bản vào "Code Đã Lưu" để thoát game vào lại vẫn còn
    local saveName = "Mẫu " .. nm
    local baseName = saveName
    local cnt = 1
    while true do
        local exists = false
        for _, sc in ipairs(scripts) do
            if sc.name == saveName then exists = true break end
        end
        if not exists then break end
        cnt = cnt + 1
        saveName = baseName .. " (" .. cnt .. ")"
    end
    table.insert(scripts, {name = saveName, code = code, expanded = false})
    if RebuildScripts then RebuildScripts() end
    Store.saveSoon()

    createStatus.Text = (copied and ("📋 ĐÃ COPY " .. #code .. " ký tự vào clipboard")
        or ("⚠️ Executor không có setclipboard — lấy code ở tab 'Code Đã Lưu'"))
        .. " · đã lưu '" .. saveName .. "'"
        .. (inBox and " · đã điền vào ô code" or " · ô code giữ nguyên code của bạn")
        .. " · gửi NGUYÊN đoạn code đó cho AI/người viết script, dán lại rồi bấm ▶ Chạy Script."
    local oldLabel = copyTemplateBtn.Text
    copyTemplateBtn.Text = "✅ Đã copy code mẫu cho: " .. nm
    task.delay(2.6, function()
        if copyTemplateBtn and copyTemplateBtn.Parent then copyTemplateBtn.Text = oldLabel end
    end)
    print("[BananaCatHub] 📋 Code mẫu '" .. nm .. "' (" .. #code .. " ký tự) — clipboard: "
        .. tostring(copied))
end)

Label(createFeatureTab, "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", cy)
cy = cy + 16
Label(createFeatureTab, "📋 Danh Sách Tab Tính Năng Đã Tạo:", cy)
cy = cy + 16

local featureListFrame = New("Frame", {
    Size=UDim2.new(1,-16,0,0), Position=UDim2.new(0,8,0,cy),
    BackgroundTransparency=1, BorderSizePixel=0, ZIndex=6,
}, createFeatureTab)
New("UIListLayout", {SortOrder=Enum.SortOrder.LayoutOrder, Padding=UDim.new(0,4)}, featureListFrame)

local function RebuildFeatureList()
    for _, c in ipairs(featureListFrame:GetChildren()) do
        if not c:IsA("UIListLayout") then c:Destroy() end
    end

    if #featureTabs == 0 then
        New("TextLabel", {
            Size=UDim2.new(1,0,0,30),
            Text="📭 Chưa có tab tính năng nào.",
            BackgroundTransparency=1, TextColor3=C.GRAY, Font=Enum.Font.GothamMedium, TextSize=10,
            TextXAlignment=Enum.TextXAlignment.Center, TextYAlignment=Enum.TextYAlignment.Center, ZIndex=7,
        }, featureListFrame)
        createFeatureTab.CanvasSize = UDim2.new(0, 0, 0, cy + 50)
        return
    end

    local totalH = 0
    for i, ft in ipairs(featureTabs) do
        local row = New("Frame", {
            Size=UDim2.new(1,0,0,32), BackgroundColor3=Color3.fromRGB(26, 29, 38),
            BackgroundTransparency=0.1, BorderSizePixel=0, ZIndex=6,
        }, featureListFrame)
        Corner(row, UDim.new(0,5)); Stroke(row)

        New("TextLabel", {
            Size=UDim2.new(1,-90,1,0), Position=UDim2.new(0,8,0,0),
            Text=ft.icon.." "..ft.name, BackgroundTransparency=1, TextColor3=C.DARK,
            Font=Enum.Font.GothamBold, TextSize=10, TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7,
        }, row)

        local goBtn = New("TextButton", {
            Size=UDim2.new(0,50,0,22), Position=UDim2.new(1,-78,0,5),
            Text="➡ Mở", BackgroundColor3=C.BLUE, BackgroundTransparency=0.1,
            TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=9, BorderSizePixel=0, ZIndex=8,
        }, row)
        Corner(goBtn, UDim.new(0,4))
        goBtn.Activated:Connect(function()
            for i, b in ipairs(tabs) do
                if b == ft.btn then SwitchTab(i); break end
            end
        end)

        local delBtn = New("TextButton", {
            Size=UDim2.new(0,24,0,22), Position=UDim2.new(1,-26,0,5),
            Text="🗑", BackgroundColor3=C.RED, BackgroundTransparency=0.1,
            TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=10, BorderSizePixel=0, ZIndex=8,
        }, row)
        Corner(delBtn, UDim.new(0,4))
        delBtn.Activated:Connect(function()
            local idx = nil
            for j, t in ipairs(tabs) do
                if t == ft.btn then idx = j; break end
            end
            if idx then
                if activeTab == ft.frame then OpenFirstPage() end   -- v4.6.2
                -- v4.4b: trả GUI của script về ScreenGui gốc TRƯỚC khi xóa frame, nếu không
                -- GUI đó mất cha là biến mất hẳn khỏi game (bản cũ để nguyên như vậy).
                local hostFrame = ft.frame and ft.frame:FindFirstChild("ScriptHost")
                if hostFrame then S.ClearEmbedsUnder(hostFrame) end
                ft.btn:Destroy()
                ft.frame:Destroy()
                table.remove(tabs, idx)
                table.remove(tabContent, idx)
                table.remove(featureTabs, i)
                for j, t in ipairs(tabs) do
                    t.LayoutOrder = j
                end
                for j, ft2 in ipairs(featureTabs) do
                    for k, t in ipairs(tabs) do
                        if t == ft2.btn then ft2.tabIdx = k; break end
                    end
                end
                RebuildFeatureList()
                Store.saveSoon()   -- ⭐ xóa cũng phải ghi xuống đĩa, nếu không tab sẽ "sống lại" khi rejoin
            end
        end)

        totalH = totalH + 36
    end

    featureListFrame.Size = UDim2.new(1,-16,0,totalH)
    createFeatureTab.CanvasSize = UDim2.new(0, 0, 0, cy + totalH + 30)
end

createTabBtn.Activated:Connect(function()
    local n = featureNameIn.Text
    local ic = featureIconIn.Text
    local c = featureCodeIn.Text

    if #n == 0 then
        createStatus.Text = "⚠️ Vui lòng nhập tên tính năng!"
        return
    end
    if #c == 0 then
        createStatus.Text = "⚠️ Vui lòng dán script!"
        return
    end

    for _, ft in ipairs(featureTabs) do
        if ft.name == n then
            createStatus.Text = "⚠️ Tên tính năng đã tồn tại!"
            return
        end
    end

    CreateFeatureTab(n, ic, c)
    RebuildFeatureList()
    Store.saveSoon()   -- ⭐ lưu ngay vào file để thoát game vào lại vẫn còn tab này

    createStatus.Text = "✅ Đã tạo tab: "..n.." (đã lưu)"
    featureNameIn.Text = ""
    featureIconIn.Text = "⚙️"
    featureCodeIn.Text = ""

    SwitchTab(#tabs)
end)

clearFormBtn.Activated:Connect(function()
    featureNameIn.Text = ""
    featureIconIn.Text = "⚙️"
    featureCodeIn.Text = ""
    createStatus.Text = "🧹 Đã xóa form"
end)

RebuildFeatureList()
-- v4.4d: CanvasSize của tab này đang 0 -> không cuộn được, các dòng dưới bị cắt mất.
pcall(function()
    createFeatureTab.CanvasSize = UDim2.new(0, 0, 0, cy + 40)
end)

-- ===== KHÔI PHỤC CÁC TAB TÍNH NĂNG ĐÃ LƯU =====
-- v4.4a: `featureTabs` trước đây KHÔNG được ghi xuống đĩa, nên tab tính năng bạn tạo
-- biến mất sau khi thoát game. Cách "cứu" duy nhất là nút chép sang tab Code — khiến
-- tính năng bị lưu nhầm chỗ (đúng như phản ánh). Giờ tab tính năng được lưu đúng chỗ của nó.
--
-- Không dựng tab ngay trong Store.load() vì CreateFeatureTab() mãi tới đây mới tồn tại.
Store.restoreFeatures = function()
    -- dỡ toàn bộ tab tính năng hiện có (duyệt ngược để index không bị lệch)
    for i = #featureTabs, 1, -1 do
        local ft = featureTabs[i]
        for j, b in ipairs(tabs) do
            if b == ft.btn then
                table.remove(tabs, j)
                table.remove(tabContent, j)
                break
            end
        end
        if activeTab == ft.frame then OpenFirstPage() end   -- v4.6.2
        -- v4.4g: TRẢ GUI đang nhúng về ScreenGui gốc TRƯỚC khi destroy frame của tab.
        -- Bản cũ destroy luôn -> mấy frame con mà hub "mượn" bị Destroy theo -> script của người
        -- dùng MẤT TRẮNG UI, không khôi phục được. (Nút xóa tab đã làm đúng bước này từ v4.4b.)
        local hostFrame = ft.frame and ft.frame:FindFirstChild("ScriptHost")
        if hostFrame then S.ClearEmbedsUnder(hostFrame) end
        pcall(function() ft.btn:Destroy() end)
        pcall(function() ft.frame:Destroy() end)
        table.remove(featureTabs, i)
    end

    -- dựng lại từ dữ liệu đọc được trên đĩa
    for _, f in ipairs(Store.loadedFeatures) do
        CreateFeatureTab(f.name, f.icon, f.code)
    end

    for j, t in ipairs(tabs) do t.LayoutOrder = j end
    tabBar.CanvasSize = UDim2.new(0, 0, 0, #tabs * 44 + 10)
    RebuildFeatureList()
    -- phai goi lai: nhãn trạng thái ở TAB2 đã được dựng từ TRƯỚC khi các tab tính năng
    -- được khôi phục, nên số "N tab" trên đó vẫn là 0 nếu không làm mới lại ở đây.
    if Store.refreshStatus then Store.refreshStatus() end
end

if #Store.loadedFeatures > 0 then
    Store.restoreFeatures()
    createStatus.Text = string.format("💾 Đã khôi phục %d tab tính năng từ bộ nhớ", #Store.loadedFeatures)
end

-- ==================== v4.5: TRANG 📚 SCRIPT HUB (menu kiểu Delta) ====================
-- "Menu giống Delta": ô tìm kiếm + dãy chip phân loại + danh sách THẺ script (icon, tên, mô tả,
-- nút chạy/copy/lưu/yêu thích). Vẫn đúng tông Midnight Gold của v4.5.
--
-- NGUỒN DỮ LIỆU: MỘT bảng S.ScriptHubList duy nhất — muốn thêm script chỉ cần thêm 1 dòng.
--   • 3 script NGOÀI là 3 link ĐANG DÙNG ở tab 🛠 Hỗ Trợ (link đã được kiểm chứng, không đoán bừa
--     link hub khác vì link chết = nút hỏng = mất tính năng).
--   • Còn lại là TIỆN ÍCH NỘI BỘ gọi thẳng hàm có sẵn của hub (S.ToggleCrosshair, S.RemoveAllParked,
--     S.DoFixMouse, S.DoReload, S.PruneEmbeds) -> không cần mạng, không bao giờ "chạy không được".
--   • 3 script ngoài truyền noPark=true cho RunCode: GUI của chúng ở NGOÀI màn hình game (v4.4i).
-- ---------- v4.6.3: NHÓM TÍNH NĂNG 🌐 SERVER (Reset · Hop · Lấy mã · Vào theo mã) ----------
-- Mã server (JobId) của server ĐANG chơi. Studio / server đơn thì JobId rỗng -> trả nil.
function S.GetJobId()
    local id = game.JobId
    if id == nil then return nil end
    id = tostring(id)
    if id == "" then return nil end
    return id
end

-- Copy ra clipboard: thử cả 3 tên hàm mà các executor hay dùng. Trả về true nếu copy được.
function S.CopyToClipboard(text)
    local did = false
    pcall(function()
        if setclipboard then setclipboard(text) did = true
        elseif toclipboard then toclipboard(text) did = true
        elseif set_clipboard then set_clipboard(text) did = true end
    end)
    return did
end

-- "Đi lấy mã server": đọc danh sách server CÔNG KHAI của chính game này từ API công khai của
-- Roblox (games.roblox.com) bằng game:HttpGet — executor nào cũng có, không cần quyền đặc biệt,
-- không dùng link lạ. Mỗi server trong kết quả có: id (chính là mã server/JobId), playing,
-- maxPlayers. cursor dùng để lật trang kế tiếp.
function S.FetchServers(cursor)
    local url = "https://games.roblox.com/v1/games/" .. tostring(game.PlaceId)
             .. "/servers/Public?sortOrder=Asc&limit=100"
    if cursor and cursor ~= "" then url = url .. "&cursor=" .. tostring(cursor) end
    local raw = game:HttpGet(url)
    local data = HttpService:JSONDecode(raw)
    if type(data) ~= "table" then return {}, nil end
    return (type(data.data) == "table" and data.data or {}), data.nextPageCursor
end

-- 🔄 Reset Server = vào lại ĐÚNG server đang chơi (giữ nguyên bạn bè/người chơi cùng server).
-- Không đọc được mã (Studio/server đơn) thì nạp lại game bằng Teleport thường.
function S.ResetServer()
    local me = S.GetJobId()
    if me then
        TeleportService:TeleportToPlaceInstance(game.PlaceId, me, player)
        return "🔄 Đang vào lại ĐÚNG server này: " .. me .. " (giữ nguyên người chơi cùng server)..."
    end
    TeleportService:Teleport(game.PlaceId, player)
    return "🔄 Không đọc được mã server (Studio/server đơn) → đang nạp lại game..."
end

-- 🎟 Vào server theo mã (JobId) người dùng dán vào ô nhập.
function S.JoinServer(jobId)
    TeleportService:TeleportToPlaceInstance(game.PlaceId, tostring(jobId), player)
end

-- 🔀 Hop Server: tự đi lấy mã server (tối đa 3 trang ~300 server), BỎ server hiện tại và server
-- đã đầy người, rồi vào 1 server ngẫu nhiên trong số còn lại.
function S.HopServer()
    local me = tostring(S.GetJobId() or "")
    local cand, cursor = {}, ""
    for _ = 1, 3 do
        local list, nextCursor = S.FetchServers(cursor)
        for _, sv in ipairs(list) do
            local sid = (sv and sv.id) and tostring(sv.id) or nil
            local playing = tonumber(sv and sv.playing) or 0
            local maxp = tonumber(sv and sv.maxPlayers) or 0
            if sid and sid ~= me and (maxp <= 0 or playing < maxp) then
                cand[#cand + 1] = {id = sid, playing = playing, maxPlayers = maxp}
            end
        end
        if #cand > 0 then break end                        -- có ứng viên rồi thì khỏi lật trang
        if not nextCursor or nextCursor == "" then break end
        cursor = nextCursor
    end
    if #cand == 0 then
        return "⚠️ Không tìm thấy server nào còn chỗ trống (hoặc game này không cho xem danh sách server)"
    end
    local pick = cand[math.random(1, #cand)]
    S.JoinServer(pick.id)
    return "🔀 Đang nhảy sang server " .. pick.id .. " (" .. pick.playing .. "/" .. pick.maxPlayers
        .. " người) · tìm được " .. #cand .. " server khác để chọn, đã bỏ qua server hiện tại"
end

S.ScriptHubList = {
    {icon="🛡", name="Infinite Yield", cat="Admin", ord=1,
     desc="Admin commands: kill, speed, jump, noclip, teleport, bring, prefix tùy chỉnh...",
     code=[[loadstring(game:HttpGet("https://raw.githubusercontent.com/EdgeIY/infiniteyield/master/source"))()]],
     noPark=true},
    {icon="🧰", name="Dex Explorer", cat="Explorer", ord=2,
     desc="Duyệt toàn bộ instance trong game, xem/sửa property, tìm object theo đường dẫn.",
     code=[[loadstring(game:HttpGet("https://raw.githubusercontent.com/infyiff/backup/main/dex.lua"))()]],
     noPark=true},
    {icon="📡", name="SimpleSpy v3", cat="Spy", ord=3,
     desc="Theo dõi RemoteEvent/RemoteFunction: tên, tham số, copy code để gọi lại y hệt.",
     code=[[loadstring(game:HttpGet("https://raw.githubusercontent.com/ex-serum/SimpleSpy/main/SimpleSpy.lua"))()]],
     noPark=true},
    {icon="🎯", name="Niêm tâm (Crosshair)", cat="Tiện ích", ord=4, action="crosshair",
     desc="Bật/tắt vòng tròn niêm tâm + 4 nét ngắn ở GIỮA màn hình game (ngoài menu)."},
    {icon="🧩", name="Trả GUI về màn hình", cat="Tiện ích", ord=5, action="unpark",
     desc="Hoàn tác MỌI GUI hub đang mượn vào menu: tab tính năng + tab 🧩 GUI Ngoài."},
    {icon="🖱", name="Sửa kẹt chuột", cat="Tiện ích", ord=6, action="fixmouse",
     desc="Nhả focus ô nhập, trả GUI về game, đặt lại MouseBehavior — hết cảnh không quay chuột/không bắn."},
    {icon="🔄", name="Nạp lại hub từ đĩa", cat="Tiện ích", ord=7, action="reload",
     desc="Đọc lại file lưu: script đã lưu, waypoint, tab tính năng, cài đặt 🧩 / 🕵 / 🪟."},
    {icon="🧹", name="Dọn host nhúng rác", cat="Tiện ích", ord=8, action="prune",
     desc="Xóa các khung Embedded_ mồ côi/rỗng còn sót trong tab (script tự Destroy GUI để lại)."},
    -- v4.6.3: nhóm 🌐 SERVER (Reset · Hop · Lấy mã server). Ô 🎟 NHẬP MÃ SERVER nằm ngay
    -- dưới danh sách thẻ này (không phải thẻ, vì cần ô dán + nút bấm riêng).
    {icon="🔄", name="Reset Server", cat="Server", ord=9, action="resetserver",
     desc="Vào lại ĐÚNG server đang chơi (giữ nguyên bạn bè/người chơi cùng server). Studio thì nạp lại game."},
    {icon="🔀", name="Hop Server", cat="Server", ord=10, action="hopserver",
     desc="Tự đi lấy mã server: đọc danh sách server công khai, bỏ server hiện tại + server đầy, nhảy sang 1 server khác."},
    {icon="🌐", name="Lấy mã server (JobId)", cat="Server", ord=11, action="getjobid",
     desc="Đọc mã server hiện tại, copy ra clipboard và điền sẵn vào ô 🎟 để gửi cho bạn bè vào cùng."},
}
S.hubFavs   = S.hubFavs or {}
S.hubCat    = "Tất cả"
S.hubSearch = ""

-- Thao tác nội bộ (không chạy code, gọi thẳng hàm có sẵn của hub)
function S.RunHubAction(id)
    if id == "crosshair" then
        local okC = pcall(function() S.ToggleCrosshair() end)
        if not okC then return "⚠️ chưa bật được niêm tâm" end
        pcall(function() if S.RebuildHubList then S.RebuildHubList() end end)   -- cập nhật nhãn nút
        return "🎯 Niêm tâm: " .. (S.crosshairOn and "BẬT (giữa màn hình game)" or "TẮT")
    elseif id == "unpark" then
        local n = 0
        pcall(function() n = n + (S.RemoveAllParked() or 0) end)
        for _, ft in ipairs(featureTabs) do
            local host = ft.frame and ft.frame:FindFirstChild("ScriptHost")
            if host then pcall(function() n = n + S.ClearEmbedsUnder(host) end) end
        end
        pcall(S.PruneEmbeds)
        pcall(function() if S.SyncEmbedToggles then S.SyncEmbedToggles() end end)
        return "🧩 đã trả " .. n .. " GUI về màn hình game (GUI gốc giữ nguyên, không Destroy)"
    elseif id == "fixmouse" then
        if type(S.DoFixMouse) == "function" then
            local msg = nil
            pcall(function() msg = S.DoFixMouse() end)
            return "🖱 " .. tostring(msg or "đã trả input cho game")
        end
        pcall(ReleaseHubFocus)
        pcall(function() UserInputService.MouseBehavior = Enum.MouseBehavior.Default end)
        return "🖱 đã nhả focus + đặt lại chuột"
    elseif id == "reload" then
        if type(S.DoReload) == "function" then
            task.spawn(function() pcall(S.DoReload) end)
            return "🔄 đang nạp lại hub từ đĩa..."
        end
        return "⚠️ hub chưa sẵn sàng để nạp lại"
    elseif id == "prune" then
        pcall(S.PruneEmbeds)
        return "🧹 đã dọn các host nhúng rác"
    elseif id == "resetserver" then
        local msg = "⚠️ chưa reset được"
        local okRs = pcall(function() msg = S.ResetServer() end)
        if not okRs then return "⚠️ Reset server thất bại: " .. tostring(msg) end
        return tostring(msg)
    elseif id == "hopserver" then
        local msg = "⚠️ chưa hop được"
        local okHp = pcall(function() msg = S.HopServer() end)
        if not okHp then
            return "⚠️ Hop server thất bại: " .. tostring(msg)
                .. " — vẫn dùng được ô 🎟 dán mã server bên dưới để vào thủ công"
        end
        return tostring(msg)
    elseif id == "getjobid" then
        local jid = S.GetJobId()
        if not jid then return "⚠️ Không đọc được mã server (đang ở Studio / server đơn)" end
        local okCp = S.CopyToClipboard(jid)
        pcall(function() if D.hubJobIn then D.hubJobIn.Text = jid end end)
        pcall(function() if S.SyncServerPanel then S.SyncServerPanel() end end)
        return (okCp and "🌐 Đã copy mã server: " or "🌐 Mã server (executor không cho copy, hãy chép tay): ") .. jid
    end
    return "⚠️ không rõ thao tác: " .. tostring(id)
end

-- nút nhỏ trong thẻ (nền đặc, bo 7px, hover/nhấn) — cất vào D để không tốn local cấp chunk
function D.CardBtn(parent, text, posX, w, color)
    local b = New("TextButton", {
        Size = UDim2.new(0, w, 0, 24), Position = UDim2.new(1, posX, 0, 16),
        Text = text, BackgroundColor3 = color or C.SURFACE3, BackgroundTransparency = 0.08,
        TextColor3 = D.BestText(color or C.SURFACE3), Font = Enum.Font.GothamBold, TextSize = 9,
        BorderSizePixel = 0, ZIndex = 8,
    }, parent)
    Corner(b, UDim.new(0, 7))
    Stroke(b, D.Edge(color or C.SURFACE3), 1)
    D.Shade(b, Color3.fromRGB(255,255,255), Color3.fromRGB(206,209,220), 90)
    D.Tactile(b, 0.08)
    return b
end

D.hubTab = AddTab("Script Hub", "📚", 3)

-- ô tìm kiếm
D.hubSearchBox = New("TextBox", {
    Size = UDim2.new(1, -16, 0, 26), Position = UDim2.new(0, 8, 0, 8),
    PlaceholderText = "🔍  Tìm script hoặc tiện ích...", Text = "", ClearTextOnFocus = false,
    BackgroundColor3 = C.SURFACE, BackgroundTransparency = 0.08, TextColor3 = C.DARK,
    PlaceholderColor3 = C.GRAY, Font = Enum.Font.GothamMedium, TextSize = 10,
    TextXAlignment = Enum.TextXAlignment.Left, BorderSizePixel = 0, ZIndex = 6,
}, D.hubTab)
Corner(D.hubSearchBox, UDim.new(0, 10))
Stroke(D.hubSearchBox, C.BORDER, 1)
New("UIPadding", {PaddingLeft = UDim.new(0, 9)}, D.hubSearchBox)

-- dãy chip phân loại
D.hubChips = New("Frame", {
    Size = UDim2.new(1, -16, 0, 22), Position = UDim2.new(0, 8, 0, 38),
    BackgroundTransparency = 1, BorderSizePixel = 0, ZIndex = 6,
}, D.hubTab)
New("UIListLayout", {
    FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 5),
    SortOrder = Enum.SortOrder.LayoutOrder, VerticalAlignment = Enum.VerticalAlignment.Center,
}, D.hubChips)

-- danh sách thẻ (cuộn dọc)
D.hubList = New("ScrollingFrame", {
    Size = UDim2.new(1, -16, 1, -146), Position = UDim2.new(0, 8, 0, 64),   -- v4.6.3: bớt 54px cho khung 🌐 Server
    BackgroundTransparency = 1, BorderSizePixel = 0, CanvasSize = UDim2.new(0, 0, 0, 0),
    ScrollBarThickness = 3, ClipsDescendants = true, ZIndex = 6,
    AutomaticCanvasSize = Enum.AutomaticSize.Y,
}, D.hubTab)
New("UIListLayout", {Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder}, D.hubList)

-- dòng trạng thái cuối trang
D.hubStatus = New("TextLabel", {
    Size = UDim2.new(1, -16, 0, 22), Position = UDim2.new(0, 8, 1, -24),
    Text = "📚 Bấm ▶ để chạy script, ⚡ để thực hiện tiện ích · ⭐ để ghim lên đầu",
    BackgroundTransparency = 1, TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium, TextSize = 9,
    TextWrapped = true, TextXAlignment = Enum.TextXAlignment.Left,
    TextYAlignment = Enum.TextYAlignment.Top, ZIndex = 6,
}, D.hubTab)

-- ---------- v4.6.3: KHUNG 🌐 SERVER nằm ngay dưới danh sách thẻ ----------
-- Hàng 1: mã server (JobId) của server đang chơi + nút 📋 copy.
-- Hàng 2: ô 🎟 DÁN MÃ SERVER + nút 🚀 Vào (vào đúng server đó) + 🔀 Hop (tự nhảy server khác).
D.hubSrvPanel = New("Frame", {
    Name = "HubServerPanel", Size = UDim2.new(1, -16, 0, 54), Position = UDim2.new(0, 8, 1, -80),
    BackgroundColor3 = C.SURFACE, BackgroundTransparency = 0.25, BorderSizePixel = 0, ZIndex = 6,
}, D.hubTab)
Corner(D.hubSrvPanel, UDim.new(0, 10))
Stroke(D.hubSrvPanel, C.BORDER, 1)

D.hubJobLbl = New("TextLabel", {
    Size = UDim2.new(1, -44, 0, 14), Position = UDim2.new(0, 8, 0, 5),
    Text = "🌐 Mã server: đang đọc...", BackgroundTransparency = 1, TextColor3 = C.MUTED,
    Font = Enum.Font.GothamMedium, TextSize = 9,
    TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7,
}, D.hubSrvPanel)

D.hubJobCopy = New("TextButton", {
    Size = UDim2.new(0, 26, 0, 16), Position = UDim2.new(1, -32, 0, 4), Text = "📋",
    BackgroundColor3 = C.BLUE, BackgroundTransparency = 0.1, TextColor3 = C.INK,
    Font = Enum.Font.GothamBold, TextSize = 9, BorderSizePixel = 0, AutoButtonColor = false, ZIndex = 7,
}, D.hubSrvPanel)
Corner(D.hubJobCopy, UDim.new(0, 6))
D.Tactile(D.hubJobCopy, 0.1)

D.hubJobIn = New("TextBox", {
    Size = UDim2.new(1, -124, 0, 24), Position = UDim2.new(0, 8, 0, 24),
    PlaceholderText = "🎟 Dán mã server (JobId) vào đây...", Text = "", ClearTextOnFocus = false,
    BackgroundColor3 = C.SURFACE2, BackgroundTransparency = 0.1, TextColor3 = C.DARK,
    PlaceholderColor3 = C.GRAY, Font = Enum.Font.GothamMedium, TextSize = 9,
    TextXAlignment = Enum.TextXAlignment.Left, BorderSizePixel = 0, ZIndex = 7,
}, D.hubSrvPanel)
Corner(D.hubJobIn, UDim.new(0, 8))
Stroke(D.hubJobIn, C.BORDER, 1)
New("UIPadding", {PaddingLeft = UDim.new(0, 7)}, D.hubJobIn)

D.hubJoinBtn = D.CardBtn(D.hubSrvPanel, "🚀 Vào", -110, 52, C.GREEN)
D.hubJoinBtn.Position = UDim2.new(1, -110, 0, 24)
D.hubHopBtn = D.CardBtn(D.hubSrvPanel, "🔀 Hop", -54, 50, C.PURPLE)
D.hubHopBtn.Position = UDim2.new(1, -54, 0, 24)

-- Hiện mã server hiện tại lên khung (JobId dài ~36 ký tự, nhãn 424px nên hiện đủ, không cắt)
function S.SyncServerPanel()
    pcall(function()
        if not D.hubJobLbl then return end
        local jid = S.GetJobId()
        if jid then
            D.hubJobLbl.Text = "🌐 Mã server: " .. jid
            D.hubJobLbl.TextColor3 = C.DARK
        else
            D.hubJobLbl.Text = "🌐 Không đọc được mã server (Studio/server đơn) — 🔄 Reset vẫn dùng được"
            D.hubJobLbl.TextColor3 = C.MUTED
        end
    end)
end

-- 📋 copy mã server + điền sẵn vào ô nhập (để gửi bạn bè, hoặc bấm 🚀 Vào lại chính server đó)
D.hubJobCopy.Activated:Connect(function()
    local jid = S.GetJobId()
    if not jid then
        D.hubStatus.Text = "⚠️ Không có mã server để copy (đang ở Studio / server đơn)"
        D.hubStatus.TextColor3 = C.RED
        return
    end
    local okCp = S.CopyToClipboard(jid)
    pcall(function() D.hubJobIn.Text = jid end)
    D.hubStatus.Text = okCp and ("📋 Đã copy mã server: " .. jid)
                             or ("⚠️ Executor không cho copy — mã server là: " .. jid)
    D.hubStatus.TextColor3 = okCp and C.GREEN or C.YELLOW
end)

-- 🚀 Vào server theo mã vừa dán
D.hubJoinBtn.Activated:Connect(function()
    -- cắt khoảng trắng 2 đầu và dấu nháy (nhiều người copy kèm dấu " hoặc ' từ chat)
    local id = tostring(D.hubJobIn.Text or "")
    id = id:gsub("^%s+", ""):gsub("%s+$", "")
    id = id:gsub('^"', ""):gsub('"$', ""):gsub("^'", ""):gsub("'$", "")
    if id == "" then
        D.hubStatus.Text = "⚠️ Hãy DÁN mã server (JobId) vào ô 🎟 trước khi bấm 🚀 Vào"
        D.hubStatus.TextColor3 = C.RED
        ReleaseHubFocus()
        return
    end
    D.hubStatus.Text = "🚀 Đang vào server " .. id .. " ..."
    D.hubStatus.TextColor3 = C.YELLOW
    ReleaseHubFocus()   -- nhả focus ô nhập, không thì game chặn input sau khi teleport
    local okJ, errJ = pcall(function() S.JoinServer(id) end)
    if not okJ then
        D.hubStatus.Text = "⚠️ Không vào được server này (mã sai/hết chỗ/game chặn): " .. tostring(errJ)
        D.hubStatus.TextColor3 = C.RED
    end
end)

-- 🔀 Hop ngay trên khung (cùng một hàm với thẻ 🔀 Hop Server trong danh sách)
D.hubHopBtn.Activated:Connect(function()
    ReleaseHubFocus()
    D.hubStatus.Text = "🔀 Đang đi lấy mã server..."
    D.hubStatus.TextColor3 = C.YELLOW
    D.hubStatus.Text = S.RunHubAction("hopserver")
end)

-- dựng lại danh sách theo từ khóa + phân loại + yêu thích
function S.RebuildHubList()
    local list = D.hubList
    if not list or not list.Parent then return end
    -- Gom thẻ cũ ra MỘT bảng rồi mới xóa: vừa duyệt GetChildren() vừa Destroy() sẽ làm
    -- mảng con co lại giữa chừng -> duyệt SÓT thẻ -> danh sách bị nhân đôi mỗi lần lọc.
    local stale = {}
    for _, c in ipairs(list:GetChildren()) do
        if c:IsA("Frame") and c.Name:sub(1, 8) == "HubCard_" then stale[#stale + 1] = c end
    end
    for _, c in ipairs(stale) do pcall(function() c:Destroy() end) end

    local q = tostring(S.hubSearch or ""):lower()
    local cat = S.hubCat or "Tất cả"
    local items = {}
    for _, it in ipairs(S.ScriptHubList) do
        local okCat = (cat == "Tất cả") or (it.cat == cat)
        local okQ = (q == "")
            or tostring(it.name):lower():find(q, 1, true) ~= nil
            or tostring(it.desc or ""):lower():find(q, 1, true) ~= nil
            or tostring(it.cat or ""):lower():find(q, 1, true) ~= nil
        if okCat and okQ then items[#items + 1] = it end
    end
    table.sort(items, function(a, b)
        local fa = S.hubFavs[a.name] and 1 or 0
        local fb = S.hubFavs[b.name] and 1 or 0
        if fa ~= fb then return fa > fb end
        return (a.ord or 99) < (b.ord or 99)
    end)

    for i, it in ipairs(items) do
        local card = New("Frame", {
            Name = "HubCard_" .. tostring(it.name), Size = UDim2.new(1, 0, 0, 56), LayoutOrder = i,
            BackgroundColor3 = C.SURFACE, BackgroundTransparency = 0.12, BorderSizePixel = 0, ZIndex = 6,
        }, list)
        Corner(card, UDim.new(0, 10))
        Stroke(card, S.hubFavs[it.name] and C.ACCENT or C.BORDER, 1)

        local ico = New("TextLabel", {
            Size = UDim2.new(0, 34, 0, 34), Position = UDim2.new(0, 8, 0, 11), Text = it.icon,
            BackgroundColor3 = C.SURFACE2, BackgroundTransparency = 0.15, TextColor3 = C.ACCENT,
            Font = Enum.Font.GothamBold, TextSize = 16, BorderSizePixel = 0, ZIndex = 7,
        }, card)
        Corner(ico, UDim.new(0, 9))

        New("TextLabel", {
            Size = UDim2.new(1, -214, 0, 14), Position = UDim2.new(0, 50, 0, 8),
            Text = tostring(it.name) .. (S.hubFavs[it.name] and "  ⭐" or ""),
            BackgroundTransparency = 1, TextColor3 = C.DARK, Font = Enum.Font.GothamBold, TextSize = 11,
            TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7,
        }, card)
        New("TextLabel", {
            Size = UDim2.new(1, -214, 0, 10), Position = UDim2.new(0, 50, 0, 22),
            Text = string.upper(tostring(it.cat or "")), BackgroundTransparency = 1,
            TextColor3 = C.ACCENT, Font = Enum.Font.GothamBold, TextSize = 8,
            TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7,
        }, card)
        New("TextLabel", {
            Size = UDim2.new(1, -214, 0, 20), Position = UDim2.new(0, 50, 0, 33),
            Text = tostring(it.desc or ""), BackgroundTransparency = 1, TextColor3 = C.MUTED,
            Font = Enum.Font.GothamMedium, TextSize = 9, TextWrapped = true,
            TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top, ZIndex = 7,
        }, card)

        -- nút chính: chạy script / thực hiện tiện ích
        local isAction = (it.action ~= nil)
        local runText
        if isAction then
            runText = (it.action == "crosshair")
                and ((S.crosshairOn and "🎯 TẮT") or "🎯 BẬT")
                or  "⚡ Chạy"
        else
            runText = "▶ Chạy"
        end
        local runBtn = D.CardBtn(card, runText, -166, 78, isAction and C.SURFACE3 or C.GREEN)
        runBtn.Activated:Connect(function()
            ReleaseHubFocus()
            if it.code then
                local okR = RunCode(it.code, it.name, nil, 1, 0, it.noPark == true)
                D.hubStatus.Text = (okR and "▶ đã chạy '" or "⚠️ không chạy được '") .. it.name .. "'"
                    .. (it.noPark and " · 🪟 GUI của nó ở NGOÀI màn hình game (đúng như tab 🛠)" or "")
                    .. " · xem chi tiết ở tab 💻 Code"
            else
                D.hubStatus.Text = S.RunHubAction(it.action)
            end
            D.hubStatus.TextColor3 = C.YELLOW
        end)

        if it.code then
            local copyBtn = D.CardBtn(card, "📋", -84, 24, C.BLUE)
            copyBtn.Activated:Connect(function()
                local did = false
                pcall(function()
                    if setclipboard then setclipboard(it.code) did = true
                    elseif toclipboard then toclipboard(it.code) did = true
                    elseif set_clipboard then set_clipboard(it.code) did = true end
                end)
                D.hubStatus.Text = did and ("📋 đã copy loadstring của '" .. it.name .. "'")
                                       or "⚠️ executor này không hỗ trợ clipboard"
                D.hubStatus.TextColor3 = did and C.GREEN or C.RED
            end)
            local saveBtn = D.CardBtn(card, "💾", -56, 24, C.PURPLE)
            saveBtn.Activated:Connect(function()
                local nm = it.name
                local cnt = 1
                while true do
                    local ex = false
                    for _, s in ipairs(scripts) do if s.name == nm then ex = true break end end
                    if not ex then break end
                    cnt += 1
                    nm = it.name .. " (" .. cnt .. ")"
                end
                table.insert(scripts, {name = nm, code = it.code, expanded = false})
                pcall(function() if RebuildScripts then RebuildScripts() end end)
                pcall(function() Store.saveSoon() end)
                D.hubStatus.Text = "💾 đã lưu '" .. nm .. "' sang tab 💾 Code Đã Lưu"
                D.hubStatus.TextColor3 = C.GREEN
            end)
        end

        local favBtn = D.CardBtn(card, S.hubFavs[it.name] and "⭐" or "☆", -28, 24,
            S.hubFavs[it.name] and C.YELLOW or C.SURFACE3)
        favBtn.Activated:Connect(function()
            if S.hubFavs[it.name] then S.hubFavs[it.name] = nil else S.hubFavs[it.name] = true end
            pcall(function() Store.saveSoon() end)   -- lưu yêu thích xuống đĩa
            S.RebuildHubList()
            D.hubStatus.Text = S.hubFavs[it.name] and ("⭐ đã ghim '" .. it.name .. "' lên đầu")
                                                   or ("☆ đã bỏ ghim '" .. it.name .. "'")
            D.hubStatus.TextColor3 = C.MUTED
        end)
    end

    pcall(function()
        list.CanvasSize = UDim2.new(0, 0, 0, #items * 62 + 6)
    end)
    if #items == 0 and D.hubStatus then
        D.hubStatus.Text = "🔍 không tìm thấy gì khớp '" .. tostring(S.hubSearch or "") .. "'"
        D.hubStatus.TextColor3 = C.MUTED
    end
end

-- chip phân loại
D.hubChipBtns = {}
for _, cname in ipairs({"Tất cả", "Admin", "Explorer", "Spy", "Tiện ích", "Server"}) do
    local w = (cname == "Tất cả" and 58) or (cname == "Explorer" and 68) or (cname == "Tiện ích" and 64)
              or (cname == "Server" and 56) or (cname == "Admin" and 52) or 44
    local chip = New("TextButton", {
        Size = UDim2.new(0, w, 0, 20), Text = cname,
        BackgroundColor3 = (S.hubCat == cname) and C.ACCENT or C.SURFACE2,
        BackgroundTransparency = (S.hubCat == cname) and 0.08 or 1,
        TextColor3 = (S.hubCat == cname) and C.INK or C.MUTED,
        Font = Enum.Font.GothamBold, TextSize = 9, BorderSizePixel = 0, ZIndex = 7,
    }, D.hubChips)
    Corner(chip, UDim.new(1, 0))
    Stroke(chip, (S.hubCat == cname) and C.ACCENT2 or C.BORDER, 1)
    chip.Activated:Connect(function()
        S.hubCat = cname
        for nm, cb in pairs(D.hubChipBtns) do
            local on = (nm == cname)
            cb.BackgroundColor3 = on and C.ACCENT or C.SURFACE2
            cb.BackgroundTransparency = on and 0.08 or 1
            cb.TextColor3 = on and C.INK or C.MUTED
            local st = cb:FindFirstChildOfClass("UIStroke")
            if st then st.Color = on and C.ACCENT2 or C.BORDER end
        end
        S.RebuildHubList()
    end)
    D.hubChipBtns[cname] = chip
end

trackConn(D.hubSearchBox:GetPropertyChangedSignal("Text"):Connect(function()
    S.hubSearch = D.hubSearchBox.Text          -- ghi nhận ngay (rẻ) để chip/lọc khác đọc đúng
    S.Debounce("hubSearch", 0.18, S.RebuildHubList)   -- nhưng chỉ DỰNG lại thẻ 1 lần sau phím cuối
end))
S.RebuildHubList()

-- chip trạng thái 🧩/🕵/🪟 trên header trang (đọc từ Store khi đã nạp xong cài đặt)
D.SyncPageChips()
S.SyncServerPanel()   -- v4.6.3: hiện mã server (JobId) lên khung 🌐 SERVER

-- ==================== TOGGLE MENU & DRAG ====================
local function ToggleMainFrame()
    main.Visible = not main.Visible
    togBtn.Text = main.Visible and "✕" or "🍌"
    if not main.Visible then ReleaseHubFocus() end   -- v4.4b: đóng menu là phải trả input cho game
    -- v4.5: mở menu thì khung "nở" nhẹ 94% -> 100% (GIỮ NGUYÊN TÂM), đóng thì tắt ngay cho dứt
    -- khoát. Size/Position được đọc TẠI THỜI ĐIỂM MỞ nên người dùng vừa kéo/nới khung xong vẫn
    -- đúng (không lưu trạng thái cũ -> không thể lệch). Kéo/nới trong 0.2s đầu thì tween bị hủy.
    if main.Visible then
        pcall(function()
            if D.openTween then D.openTween:Cancel() end
            local ts, tp = main.Size, main.Position
            main.Size = UDim2.new(ts.X.Scale, math.max(160, ts.X.Offset - 24),
                                  ts.Y.Scale, math.max(110, ts.Y.Offset - 16))
            main.Position = UDim2.new(tp.X.Scale, tp.X.Offset + 12, tp.Y.Scale, tp.Y.Offset + 8)
            D.openTween = TweenService:Create(main,
                TweenInfo.new(0.2, Enum.EasingStyle.Quint, Enum.EasingDirection.Out),
                {Size = ts, Position = tp})
            D.openTween:Play()
            D.openTween.Completed:Connect(function()
                D.openTween = nil
                pcall(BcFit)   -- đo lại để GUI đang nhúng vừa đúng ô tab
            end)
        end)
    end
end

closeBtn.Activated:Connect(function()
    pcall(function() if D.openTween then D.openTween:Cancel() D.openTween = nil end end)
    main.Visible = false
    togBtn.Text = "🍌"
    ReleaseHubFocus()   -- v4.5: đóng bằng ✕ cũng phải trả input cho game (trước đây chỉ có nút 🍌 làm)
end)

dragLockBtn.Activated:Connect(function()
    S.dragMenu = not S.dragMenu
    if S.dragMenu then
        dragLockBtn.Text = "🔓"
        dragLockBtn.TextColor3 = C.ACCENT   -- v4.5: vàng accent thay vì xanh
    else
        dragLockBtn.Text = "🔒"
        dragLockBtn.TextColor3 = C.MUTED
    end
end)

trackConn(titleBar.InputBegan:Connect(function(i)
    if S.dragMenu and (i.UserInputType==Enum.UserInputType.MouseButton1 or i.UserInputType==Enum.UserInputType.Touch) then
        pcall(function() if D.openTween then D.openTween:Cancel() D.openTween = nil end end)  -- v4.5
        S.dragging=true
        S.dragStart=i.Position
        S.startPos=main.Position
    end
end))

trackConn(UserInputService.InputChanged:Connect(function(i)
    if S.dragging and S.startPos and S.dragStart and (i.UserInputType==Enum.UserInputType.MouseMovement or i.UserInputType==Enum.UserInputType.Touch) then
        local d=i.Position-S.dragStart
        main.Position=UDim2.new(S.startPos.X.Scale, S.startPos.X.Offset+d.X, S.startPos.Y.Scale, S.startPos.Y.Offset+d.Y)
    end
end))

trackConn(UserInputService.InputEnded:Connect(function(i)
    if i.UserInputType==Enum.UserInputType.MouseButton1 or i.UserInputType==Enum.UserInputType.Touch then
        S.dragging=false
    end
end))

trackConn(togBtn.InputBegan:Connect(function(i)
    if i.UserInputType == Enum.UserInputType.MouseButton1 or i.UserInputType == Enum.UserInputType.Touch then
        if S.dragMenu then
            S.togDragging = true
            S.togDragStart = i.Position
            S.togStartPos = togBtn.Position
            S.togMoved = false
        end
    end
end))

trackConn(UserInputService.InputChanged:Connect(function(i)
    if S.togDragging and S.dragMenu and (i.UserInputType == Enum.UserInputType.MouseMovement or i.UserInputType == Enum.UserInputType.Touch) then
        local delta = i.Position - S.togDragStart
        if delta.Magnitude > 5 then
            S.togMoved = true
        end
        if S.togMoved then
            togBtn.Position = UDim2.new(
                S.togStartPos.X.Scale, S.togStartPos.X.Offset + delta.X,
                S.togStartPos.Y.Scale, S.togStartPos.Y.Offset + delta.Y
            )
        end
    end
end))

trackConn(UserInputService.InputEnded:Connect(function(i)
    if i.UserInputType == Enum.UserInputType.MouseButton1 or i.UserInputType == Enum.UserInputType.Touch then
        if S.togDragging then
            S.togDragging = false
            if not S.togMoved then
                ToggleMainFrame()
            end
        end
    end
end))

togBtn.Activated:Connect(function()
    if not S.dragMenu then
        ToggleMainFrame()
    end
end)

trackConn(UserInputService.InputBegan:Connect(function(i, gp)
    if not gp and i.KeyCode == Enum.KeyCode.RightControl then
        ToggleMainFrame()
    end
end))

main.Visible = true
togBtn.Text = "✕"

print(string.format(
    "✅ Banana Cat Hub v4.6 — sẵn sàng! Đã nạp lại %d script + %d waypoint + %d tab tính năng từ bộ nhớ (chế độ: %s%s)",
    Store.loadedScripts, Store.loadedWp, #Store.loadedFeatures, Store.mode,
    Store.lastError and (" | ⚠️ " .. Store.lastError) or ""
))
print("   💾 File lưu: " .. Store.SAVE_FILE .. " (trong thư mục workspace của executor — sống qua cả lần rejoin)")
print("   Tính năng: Code + Code Đã Lưu + Hỗ Trợ (POS+SIZE+ROT+LOOK+VẬT THỂ+HIGHLIGHT TÍM) + AI AI + Tạo Tính Năng")