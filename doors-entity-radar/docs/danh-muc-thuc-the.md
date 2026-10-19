<!-- TỆP SINH TỰ ĐỘNG bởi tools/gen-catalog-doc.js — ĐỪNG SỬA TAY.
     Nguồn dữ liệu: src/Shared/EntityCatalog.luau. Sửa danh mục thì chạy: npm run docs -->

# Danh mục thực thể DOORS — Doors Entity Radar

Số mục: **82** · số cặp (mục, khu vực): **110** · số khu vực: **8**

> **ĐỌC TRƯỚC KHI TIN BẢNG NÀY.** "Có trong danh mục" KHÔNG có nghĩa là
> "định vị được trong game". Danh mục là phần THÔNG TIN (tên, khu vực, ghi chú)
> và chỉ những mục có `method = quét tên instance` **cùng mẫu tên đã được bạn
> xác minh trong game của mình** mới có thể hiện "Đã phát hiện" + khoảng cách.
> Mọi mục khác hiển thị đúng trạng thái thật của nó: *Không phát hiện*,
> *Không hỗ trợ phát hiện*, hoặc *Chưa xác minh* — radar không bao giờ suy đoán.

## Khu vực

| id | tên | viết tắt |
| --- | --- | --- |
| `hotel` | The Hotel | Hotel |
| `mines` | The Mines | Mines |
| `backdoor` | The Backdoor | Backdoor |
| `archives` | The Archives | Archives |
| `outdoors` | The Outdoors | Outdoors |
| `stairwell` | The Stairwell | Stairwell |
| `rooms` | The Rooms | Rooms |
| `events` | Chế độ đặc biệt & sự kiện | Sự kiện |

## Toàn bộ danh mục

| id | tên hiển thị | khu vực | loại | cơ chế | mẫu tên đang dò | biến thể của | ghi chú |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `a120` | A-120 | rooms | thực thể (chưa xác minh) | quét tên instance | `a-120`, `a 120` *(chứa)* | — | Thực thể trong The Rooms. Tên instance có thể kèm hậu tố phòng. |
| `a60` | A-60 | rooms | thực thể (chưa xác minh) | quét tên instance | `a-60`, `a 60` *(chứa)* | — | Thực thể trong The Rooms. Tên instance có thể kèm hậu tố phòng. |
| `a90` | A-90 | rooms | thực thể (chưa xác minh) | quét tên instance | `a-90`, `a 90` *(chứa)* | — | Thực thể trong The Rooms. Tên instance có thể kèm hậu tố phòng. |
| `alma` | Alma | archives | thực thể (chưa xác minh) | quét tên instance | `alma` | — | Thực thể trong The Archives. |
| `ambush` | Ambush | hotel, mines | thực thể (chưa xác minh) | quét tên instance | `ambush` | — | Như Rush nhưng đổi hướng nhiều lần. |
| `aroxmbush` | AROxMBUSH | events | sự kiện (chưa xác minh) | quét tên instance | `aroxmbush` | `ambush` | Tên Ambush bị làm nhiễu. Chỉ dò mẫu tên riêng "aroxmbush"; aliasOf chỉ là chú thích. |
| `bash` | Bash | archives | thực thể (chưa xác minh) | quét tên instance | `bash` | — | Thực thể trong The Archives. |
| `blitz` | Blitz | backdoor | thực thể (chưa xác minh) | quét tên instance | `blitz` | — | Thực thể trong The Backdoor. |
| `bob` | Bob | hotel, mines | NPC (chưa xác minh) | quét tên instance | `bob` | — | NPC trong shop (bức tranh biết nói). |
| `bramble` | Bramble | outdoors | thực thể (chưa xác minh) | quét tên instance | `bramble` | — | Thực thể trong The Outdoors. |
| `charles` | Charles | mines | NPC (chưa xác minh) | quét tên instance | `charles` | — | NPC trong The Mines. |
| `cobbler` | Cobbler | stairwell | thực thể (chưa xác minh) | quét tên instance | `cobbler` | — | Thực thể trong The Stairwell. |
| `creak` | Creak | stairwell | thực thể (chưa xác minh) | quét tên instance | `creak` | — | Thực thể trong The Stairwell. |
| `cringle` | Cringle | events | sự kiện (chưa xác minh) | quét tên instance | `cringle` | — | Nhân vật sự kiện mùa đông. |
| `crusher` | Crusher | stairwell | prop (chưa xác minh) | quét tên instance | `crusher` | — | Mối nguy cơ khí trong The Stairwell. |
| `currents` | Currents | archives | thực thể (chưa xác minh) | quét tên instance | `currents` | — | Thực thể trong The Archives. |
| `dam_seek` | Dam Seek | mines | thực thể (chưa xác minh) | quét tên instance | `dam seek` | `seek` | Biến thể của Seek ở khu đập nước. Chỉ dò mẫu tên riêng "dam seek"; aliasOf chỉ là chú thích. |
| `drakobloxxers` | DRAKOBLOXXERS | events | sự kiện (chưa xác minh) | quét tên instance | `drakobloxxer`, `drakobloxxers` | — | Mini-game/sự kiện; số lượng instance có thể rất nhiều. |
| `dread` | Dread | hotel, mines | thực thể (chưa xác minh) | quét tên instance | `dread` | — | Có trong danh sách khu vực; tên instance chưa xác minh. |
| `drone` | Drone | archives | thực thể (chưa xác minh) | quét tên instance | `drone` | — | Thực thể bay trong The Archives. |
| `dupe` | Dupe | hotel, mines | thực thể (chưa xác minh) | quét tên instance | `dupe` | — | Cửa giả. Dấu hiệu nằm ở cửa nên có thể không có Model tên 'Dupe'. |
| `el_goblino` | El Goblino | hotel, mines | NPC (chưa xác minh) | quét tên instance | `el goblino`, `elgoblino` | — | NPC bán hàng, thường gặp trong The Mines. |
| `evil_key` | Evil Key | events | sự kiện (chưa xác minh) | quét tên instance | `evil key` | — | Vật phẩm sự kiện; có thể chỉ là Tool trong balô người chơi. |
| `eyes` | Eyes | hotel, mines | thực thể (chưa xác minh) | quét tên instance | `eyes` | — | Xuất hiện trong phòng; gây hại khi nhìn thẳng vào nó. |
| `eyestalk` | Eyestalk | outdoors | thực thể (chưa xác minh) | quét tên instance | `eyestalk` | — | Thực thể trong The Outdoors. |
| `fallen_chandeliers` | Fallen Chandeliers | hotel | prop (chưa xác minh) | quét tên instance | `fallen chandelier`, `chandelier` *(chứa)* | — | Đèn chùm rơi — đạo cụ/mối nguy tĩnh. Tên instance hay có hậu tố nên dùng phép chứa. |
| `figure` | Figure | hotel, mines | thực thể (chưa xác minh) | quét tên instance | `figure` | — | Thực thể mù ở thư viện; truy đuổi bằng âm thanh. |
| `fih` | Fih | archives | thực thể (chưa xác minh) | quét tên instance | `fih` | — | Tên ngắn, dễ trùng với tên instance khác — cần xác minh kỹ. |
| `fire_sprinklers` | Fire Sprinklers | stairwell | prop (chưa xác minh) | quét tên instance | `fire sprinkler`, `sprinkler` | — | Đầu phun nước — đạo cụ/mối nguy tĩnh. |
| `flood` | Flood | outdoors | sự kiện (chưa xác minh) | quét tên instance | `flood` | — | Sự kiện nước dâng; có thể chỉ tồn tại dưới dạng mực nước/Terrain. |
| `forget_me_not` | Forget-Me-Not | archives | thực thể (chưa xác minh) | quét tên instance | `forget me not`, `forgetmenot`, `forget me nots` | — | Còn được viết 'Forget Me Nots'. Nhiều biến thể chính tả nên có nhiều mẫu. |
| `giggle` | Giggle | mines | thực thể (chưa xác minh) | quét tên instance | `giggle` | — | Thực thể riêng của The Mines. |
| `glitch` | Glitch | hotel, mines, backdoor, archives, outdoors, stairwell | thực thể (chưa xác minh) | quét tên instance | `glitch` | — | Xuất hiện ở nhiều khu vực, thường gắn với phòng bị lỗi. |
| `gloombats` | Gloombats | mines | thực thể (chưa xác minh) | quét tên instance | `gloombat`, `gloombats` | — | Đàn dơi trong khu tối của The Mines. |
| `grampy` | Grampy | outdoors | NPC (chưa xác minh) | quét tên instance | `grampy` | — | NPC trong The Outdoors. |
| `greed` | Greed | events | sự kiện (chưa xác minh) | quét tên instance | `greed` | — | Sự kiện/nhân vật theo mùa. |
| `groundskeeper` | Groundskeeper | outdoors | NPC (chưa xác minh) | quét tên instance | `groundskeeper` | — | NPC trong The Outdoors. |
| `grumble` | Grumble | mines | thực thể (chưa xác minh) | quét tên instance | `grumble` | — | Thực thể trong The Mines; có biến thể Queen. |
| `halt` | Halt | hotel, mines | thực thể (chưa xác minh) | quét tên instance | `halt` | — | Xuất hiện ở hành lang dài, buộc người chơi đổi hướng. |
| `haste` | Haste | backdoor | thực thể (chưa xác minh) | quét tên instance | `haste` | — | Thực thể trong The Backdoor. |
| `hide` | Hide | hotel, mines | sự kiện (chưa xác minh) | không hỗ trợ | — | — | Ẩn nấp là HÀNH ĐỘNG của người chơi (tương tác tủ/cửa), không phải instance. |
| `hijack` | Hijack | stairwell | thực thể (chưa xác minh) | quét tên instance | `hijack` | — | Thực thể trong The Stairwell. |
| `honcho` | Honcho | archives | thực thể (chưa xác minh) | quét tên instance | `honcho` | — | Thực thể trong The Archives. |
| `jack` | Jack | hotel, mines | thực thể (chưa xác minh) | quét tên instance | `jack` | — | Có thể xuất hiện trong tủ; tên instance chưa xác minh. |
| `jeff` | Jeff | hotel, mines | NPC (chưa xác minh) | quét tên instance | `jeff` | — | NPC bán hàng trong phòng shop. |
| `jeff_the_killer` | Jeff The Killer | events | sự kiện (chưa xác minh) | quét tên instance | `jeff the killer` | `jeff` | Biến thể của Jeff trong sự kiện. Chỉ dò mẫu tên riêng "jeff the killer"; aliasOf chỉ là chú thích. |
| `lava` | LAVA! | events | sự kiện (chưa xác minh) | quét tên instance | `lava` | — | Sự kiện dung nham; có thể chỉ là Part/Terrain dâng lên. |
| `lookman` | Lookman | backdoor | thực thể (chưa xác minh) | quét tên instance | `lookman` | — | Thực thể trong The Backdoor. |
| `louie` | Louie | mines | NPC (chưa xác minh) | quét tên instance | `louie` | — | NPC trong The Mines. |
| `mandrake` | Mandrake | outdoors | thực thể (chưa xác minh) | quét tên instance | `mandrake` | — | Thực thể trong The Outdoors. |
| `meld` | Meld | stairwell | thực thể (chưa xác minh) | quét tên instance | `meld` | — | Thực thể trong The Stairwell. |
| `monument` | Monument | outdoors | prop (chưa xác minh) | quét tên instance | `monument` | — | Công trình tĩnh trong The Outdoors. |
| `moonlight` | Moonlight | hotel, mines | NPC (chưa xác minh) | quét tên instance | `moonlight` | — | NPC trong khu vực bí mật. |
| `noise` | Noise | stairwell | sự kiện (chưa xác minh) | quét tên instance | `noise` | — | Tên rất dễ trùng với instance âm thanh thường — kết quả khớp cần kiểm tra kỹ. |
| `office_chair` | Office Chair | archives, stairwell | prop (chưa xác minh) | quét tên instance | `office chair` | — | Đạo cụ môi trường, không phải thực thể. |
| `portrait` | Portrait | archives | thực thể (chưa xác minh) | quét tên instance | `portrait` | — | Tranh chân dung; có thể là đạo cụ được đặt tên giống thực thể. |
| `queen_grumble` | Queen Grumble | mines | thực thể (chưa xác minh) | quét tên instance | `queen grumble` | — | Biến thể lớn hơn của Grumble. |
| `ransom` | Ransom | archives | thực thể (chưa xác minh) | quét tên instance | `ransom` | — | Thực thể trong The Archives. |
| `red_barrier` | Red Barrier | hotel, mines | sự kiện (chưa xác minh) | quét tên instance | `red barrier` | — | Rào chắn đỏ chặn đường; là đối tượng sự kiện hơn là thực thể. |
| `rniushcg` | RNIUSHCg== | events | sự kiện (chưa xác minh) | quét tên instance | `rniushcg` | `rush` | Tên Rush bị làm nhiễu trong sự kiện. Chỉ dò mẫu tên riêng "rniushcg"; aliasOf chỉ là chú thích. |
| `rush` | Rush | hotel, mines | thực thể (chưa xác minh) | quét tên instance | `rush` | — | Lao dọc hành lang. Thường được nhân bản xuống client dưới dạng Model/Part khi sắp xuất hiện. |
| `rushing_light` | Rushing Light | events | sự kiện (chưa xác minh) | quét tên instance | `rushing light` | — | Sự kiện ánh sáng lao đi. |
| `sally` | Sally (Window) | hotel | thực thể (chưa xác minh) | quét tên instance | `sally` | — | Xuất hiện ở cửa sổ. Tên hiển thị thường ghi 'Sally (Window)'. |
| `scjvereech` | SCJVEREECH | events | sự kiện (chưa xác minh) | quét tên instance | `scjvereech` | `screech` | Tên Screech bị làm nhiễu. Chỉ dò mẫu tên riêng "scjvereech"; aliasOf chỉ là chú thích. |
| `screech` | Screech | hotel, mines | thực thể (chưa xác minh) | quét tên instance | `screech` | — | Xuất hiện trong phòng tối, có âm thanh báo trước. |
| `scribbles` | Scribbles | archives | thực thể (chưa xác minh) | quét tên instance | `scribbles` | — | Thực thể trong The Archives. |
| `seek` | Seek | hotel, mines | thực thể (chưa xác minh) | quét tên instance | `seek` | — | Rượt trong hành lang; phần rượt thường có instance riêng. |
| `seeking_wall` | SEEKING WALL!!! | events | sự kiện (chưa xác minh) | quét tên instance | `seeking wall` | — | Sự kiện tường Seek; đối tượng có thể là một Part lớn chứ không phải Model. |
| `shopping_cart` | Shopping Cart | stairwell | prop (chưa xác minh) | quét tên instance | `shopping cart` | — | Đạo cụ môi trường. |
| `snare` | Snare | hotel, outdoors | prop (chưa xác minh) | quét tên instance | `snare` | — | Bẫy đặt trên sàn — vật thể môi trường, không di chuyển. |
| `starlight` | Starlight | backdoor, archives, outdoors | thực thể (chưa xác minh) | quét tên instance | `starlight` | — | Xuất hiện ở nhiều khu vực sau Hotel. |
| `stem` | Stem | stairwell | thực thể (chưa xác minh) | quét tên instance | `stem` | — | Thực thể trong The Stairwell. |
| `surge` | Surge | outdoors | thực thể (chưa xác minh) | quét tên instance | `surge` | — | Thực thể trong The Outdoors. |
| `television_set` | Television Set | stairwell | prop (chưa xác minh) | quét tên instance | `television set`, `television` | — | Đạo cụ môi trường. |
| `teller` | Teller | archives | thực thể (chưa xác minh) | quét tên instance | `teller` | — | Thực thể trong The Archives. |
| `the_caw` | The Caw | outdoors | thực thể (chưa xác minh) | quét tên instance | `the caw`, `caw` | — | Thực thể trong The Outdoors. |
| `timothy` | Timothy | hotel, mines | thực thể (chưa xác minh) | quét tên instance | `timothy` | — | Nhện trong ngăn kéo; Model nhỏ, không phải mối đe doạ lớn. |
| `treater` | Treater | events | sự kiện (chưa xác minh) | quét tên instance | `treater` | — | Nhân vật sự kiện Halloween. |
| `vacuum` | Vacuum | backdoor | prop (chưa xác minh) | quét tên instance | `vacuum` | — | Đối tượng trong The Backdoor; có thể là vật thể hơn là thực thể. |
| `void` | Void | hotel, mines | thực thể (chưa xác minh) | quét tên instance | `void` | — | Khoảng không khi rơi khỏi bản đồ; có thể không tồn tại dưới dạng instance riêng. |
| `weirdo` | Weirdo | hotel, mines | thực thể (chưa xác minh) | quét tên instance | `weirdo` | — | Thực thể hiếm; tên instance chưa xác minh. |
| `world_lotus` | World Lotus | outdoors | prop (chưa xác minh) | quét tên instance | `world lotus` | — | Thực vật/đạo cụ trong The Outdoors. |

## Thống kê

| cơ chế | số mục |
| --- | --- |
| quét tên instance | 81 |
| không hỗ trợ | 1 |
| có `aliasOf` (chỉ là chú thích) | 5 |

## Quy tắc khớp tên (quan trọng)

1. Tên instance được **chuẩn hoá**: chữ thường, chỉ giữ `a-z0-9` (`A-60 (Room 3)` → `a60room3`).
2. Mặc định là **khớp chính xác** theo khoá đã chuẩn hoá.
3. Một số mục dùng **khớp "chứa"** (đánh dấu *(chứa)*) vì tên thật trong game
   thường có hậu tố/số phòng.
4. `aliasOf` **KHÔNG** dùng để mượn mẫu tên. Một instance tên `Rush` chỉ kết
   luận về Rush; `RNIUSHCg==` chỉ được kết luận khi trong Workspace có
   instance khớp mẫu `rniushcg`. Lý do: báo sai số lượng thực thể còn tệ hơn
   là không báo.
5. Muốn thêm mẫu tên cho một mục, thêm vào `Detection.extraPatterns` trong
   `Shared/Config.luau` — **sau khi bạn tự thấy tên đó trong game** (Explorer
   hoặc lệnh in ở `docs/kiem-thu.md`).
