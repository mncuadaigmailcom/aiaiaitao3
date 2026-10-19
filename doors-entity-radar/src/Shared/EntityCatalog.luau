--[[
	doors-entity-radar/src/Shared/EntityCatalog.luau
	ModuleScript — đặt tại: ReplicatedStorage.DoorsEntityRadar.Shared.EntityCatalog

	DANH MỤC THỰC THỂ THEO KHU VỰC. Đây là DỮ LIỆU THUẦN: không service,
	không instance, không logic định vị. Logic nằm ở Client/Core/Scanner.

	===== ĐỌC KỸ TRƯỚC KHI DÙNG =====
	1. Tên trong `patterns` là ỨNG VIÊN được suy ra từ tên hiển thị mà cộng
	   đồng dùng. Chúng CHƯA được xác minh bằng cách chạy trong DOORS thật.
	   Vì vậy mặc định mọi mục có `patternSource = "unconfirmed"` và trạng
	   thái khi không tìm thấy là UNVERIFIED — KHÔNG phải "Không phát hiện".
	2. Muốn một mục chuyển sang "Không phát hiện" (nghĩa là đã quét và thật
	   sự không thấy), bạn phải xác nhận mẫu tên bằng một trong hai cách:
	     a) thêm tên instance vào Config.ConfirmedPatterns;
	     b) chạy Script chẩn đoán (Server/Diagnostics) trong game bạn có
	        quyền chỉnh sửa và đối chiếu tên instance thật.
	   Đây là con đường duy nhất; dự án KHÔNG tự phong "đã xác minh".
	3. `kind` là phân loại tốt nhất có thể từ mô tả công khai, và
	   `kindConfirmed = false` cho MỌI mục — xem Catalog.KIND_DISCLAIMER.
	4. Danh mục này KHÔNG tạo ra khả năng phát hiện. Có tên ở đây chỉ để
	   liệt kê và tìm kiếm.
]]

local Shared_Areas = __DER_REQUIRE("Shared/Areas")

local Catalog = {}

-- Nhãn tiếng Việt cho từng loại mục. Dùng để phân biệt thực thể đang tồn
-- tại / sự kiện / vật thể môi trường / tên chưa xác minh (yêu cầu mục 2).
Catalog.KindLabel = {
	entity = "Thực thể",
	npc = "NPC / nhân vật",
	prop = "Vật thể môi trường",
	event = "Sự kiện / cơ chế",
	unverified = "Chưa phân loại",
}

Catalog.KIND_DISCLAIMER = "Phân loại theo mô tả công khai, chưa xác minh bằng instance trong game."

-- Phương pháp phát hiện được hỗ trợ. Chỉ hai giá trị, cố tình ít:
--   scan        — tìm instance khớp tên trong phạm vi cho phép
--   unsupported — không có cơ chế hợp lệ nào từ client
Catalog.MethodLabel = {
	scan = "Quét instance trong phạm vi cho phép",
	unsupported = "Không có cơ chế phát hiện hợp lệ",
}

--[[
	Hàm dựng một dòng danh mục. Dùng hàm thay vì viết bảng thô để không
	mục nào quên trường bắt buộc — thiếu trường là lỗi ngay khi nạp.
]]
local function E(id, name, areas, kind, patterns, notes, options)
	options = options or {}
	assert(type(id) == "string" and #id > 0, "EntityCatalog: thiếu id")
	assert(type(name) == "string" and #name > 0, "EntityCatalog: thiếu name cho " .. tostring(id))
	assert(type(areas) == "table" and #areas > 0, "EntityCatalog: thiếu areas cho " .. tostring(id))
	assert(Catalog.KindLabel[kind] ~= nil, "EntityCatalog: kind lạ '" .. tostring(kind) .. "' cho " .. id)

	local method = options.method or "scan"
	assert(Catalog.MethodLabel[method] ~= nil, "EntityCatalog: method lạ cho " .. id)
	if method == "scan" then
		assert(type(patterns) == "table" and #patterns > 0,
			"EntityCatalog: mục scan phải có patterns (" .. id .. ")")
	end

	return {
		id = id,
		name = name,
		areas = areas,
		kind = kind,
		kindConfirmed = false,
		notes = notes or "",
		detect = {
			method = method,
			patterns = patterns or {},
			-- "exact": so khoá tên đã chuẩn hoá bằng nhau.
			-- "contains": khoá tên có chứa mẫu (dùng khi tên instance hay có hậu tố).
			matchMode = options.matchMode or "exact",
			-- aliasOf: CHỈ LÀ CHÚ THÍCH "biến thể của mục nào" (không mượn
			-- mẫu tên; xem Catalog.GetMatchKeys).
			aliasOf = options.aliasOf,
			-- Lý do bắt buộc phải có khi method = "unsupported".
			reason = options.reason,
		},
		-- Mặc định là "chưa xác nhận" — chỉ Config.ConfirmedPatterns mới đổi được.
		patternSource = "unconfirmed",
	}
end

--======================== DANH MỤC (82 mục duy nhất) =========================
-- Thứ tự trong bảng không quan trọng: Catalog tự sắp theo tên khi dựng chỉ mục.
local ROWS = {
	-- ------------------------- THE HOTEL / THE MINES -------------------------
	E("rush", "Rush", { "hotel", "mines" }, "entity", { "rush" },
		"Lao dọc hành lang. Thường được nhân bản xuống client dưới dạng Model/Part khi sắp xuất hiện."),
	E("ambush", "Ambush", { "hotel", "mines" }, "entity", { "ambush" },
		"Như Rush nhưng đổi hướng nhiều lần."),
	E("eyes", "Eyes", { "hotel", "mines" }, "entity", { "eyes" },
		"Xuất hiện trong phòng; gây hại khi nhìn thẳng vào nó."),
	E("screech", "Screech", { "hotel", "mines" }, "entity", { "screech" },
		"Xuất hiện trong phòng tối, có âm thanh báo trước."),
	E("figure", "Figure", { "hotel", "mines" }, "entity", { "figure" },
		"Thực thể mù ở thư viện; truy đuổi bằng âm thanh."),
	E("seek", "Seek", { "hotel", "mines" }, "entity", { "seek" },
		"Rượt trong hành lang; phần rượt thường có instance riêng."),
	E("dupe", "Dupe", { "hotel", "mines" }, "entity", { "dupe" },
		"Cửa giả. Dấu hiệu nằm ở cửa nên có thể không có Model tên 'Dupe'."),
	E("halt", "Halt", { "hotel", "mines" }, "entity", { "halt" },
		"Xuất hiện ở hành lang dài, buộc người chơi đổi hướng."),
	E("hide", "Hide", { "hotel", "mines" }, "event", {},
		"Ẩn nấp là HÀNH ĐỘNG của người chơi (tương tác tủ/cửa), không phải instance.",
		{
			method = "unsupported",
			reason = "Không có instance riêng để định vị: đây là trạng thái của người chơi, không phải thực thể trong Workspace.",
		}),
	E("timothy", "Timothy", { "hotel", "mines" }, "entity", { "timothy" },
		"Nhện trong ngăn kéo; Model nhỏ, không phải mối đe doạ lớn."),
	E("sally", "Sally (Window)", { "hotel" }, "entity", { "sally" },
		"Xuất hiện ở cửa sổ. Tên hiển thị thường ghi 'Sally (Window)'."),
	E("dread", "Dread", { "hotel", "mines" }, "entity", { "dread" },
		"Có trong danh sách khu vực; tên instance chưa xác minh."),
	E("jeff", "Jeff", { "hotel", "mines" }, "npc", { "jeff" },
		"NPC bán hàng trong phòng shop."),
	E("el_goblino", "El Goblino", { "hotel", "mines" }, "npc", { "el goblino", "elgoblino" },
		"NPC bán hàng, thường gặp trong The Mines."),
	E("bob", "Bob", { "hotel", "mines" }, "npc", { "bob" },
		"NPC trong shop (bức tranh biết nói)."),
	E("jack", "Jack", { "hotel", "mines" }, "entity", { "jack" },
		"Có thể xuất hiện trong tủ; tên instance chưa xác minh."),
	E("moonlight", "Moonlight", { "hotel", "mines" }, "npc", { "moonlight" },
		"NPC trong khu vực bí mật."),
	E("weirdo", "Weirdo", { "hotel", "mines" }, "entity", { "weirdo" },
		"Thực thể hiếm; tên instance chưa xác minh."),
	E("glitch", "Glitch", { "hotel", "mines", "backdoor", "archives", "outdoors", "stairwell" }, "entity", { "glitch" },
		"Xuất hiện ở nhiều khu vực, thường gắn với phòng bị lỗi."),
	E("void", "Void", { "hotel", "mines" }, "entity", { "void" },
		"Khoảng không khi rơi khỏi bản đồ; có thể không tồn tại dưới dạng instance riêng."),
	E("red_barrier", "Red Barrier", { "hotel", "mines" }, "event", { "red barrier" },
		"Rào chắn đỏ chặn đường; là đối tượng sự kiện hơn là thực thể."),
	E("snare", "Snare", { "hotel", "outdoors" }, "prop", { "snare" },
		"Bẫy đặt trên sàn — vật thể môi trường, không di chuyển."),
	E("fallen_chandeliers", "Fallen Chandeliers", { "hotel" }, "prop", { "fallen chandelier", "chandelier" },
		"Đèn chùm rơi — đạo cụ/mối nguy tĩnh. Tên instance hay có hậu tố nên dùng phép chứa.",
		{ matchMode = "contains" }),

	-- ------------------------------ THE MINES --------------------------------
	E("giggle", "Giggle", { "mines" }, "entity", { "giggle" },
		"Thực thể riêng của The Mines."),
	E("gloombats", "Gloombats", { "mines" }, "entity", { "gloombat", "gloombats" },
		"Đàn dơi trong khu tối của The Mines."),
	E("grumble", "Grumble", { "mines" }, "entity", { "grumble" },
		"Thực thể trong The Mines; có biến thể Queen."),
	E("queen_grumble", "Queen Grumble", { "mines" }, "entity", { "queen grumble" },
		"Biến thể lớn hơn của Grumble."),
	E("charles", "Charles", { "mines" }, "npc", { "charles" },
		"NPC trong The Mines."),
	E("dam_seek", "Dam Seek", { "mines" }, "entity", { "dam seek" },
		"Biến thể của Seek ở khu đập nước. Chỉ dò mẫu tên riêng \"dam seek\"; aliasOf chỉ là chú thích.",
		{ aliasOf = "seek" }),
	E("louie", "Louie", { "mines" }, "npc", { "louie" },
		"NPC trong The Mines."),

	-- ----------------------------- THE BACKDOOR ------------------------------
	E("blitz", "Blitz", { "backdoor" }, "entity", { "blitz" },
		"Thực thể trong The Backdoor."),
	E("haste", "Haste", { "backdoor" }, "entity", { "haste" },
		"Thực thể trong The Backdoor."),
	E("lookman", "Lookman", { "backdoor" }, "entity", { "lookman" },
		"Thực thể trong The Backdoor."),
	E("starlight", "Starlight", { "backdoor", "archives", "outdoors" }, "entity", { "starlight" },
		"Xuất hiện ở nhiều khu vực sau Hotel."),
	E("vacuum", "Vacuum", { "backdoor" }, "prop", { "vacuum" },
		"Đối tượng trong The Backdoor; có thể là vật thể hơn là thực thể."),

	-- ----------------------------- THE ARCHIVES ------------------------------
	E("drone", "Drone", { "archives" }, "entity", { "drone" },
		"Thực thể bay trong The Archives."),
	E("bash", "Bash", { "archives" }, "entity", { "bash" },
		"Thực thể trong The Archives."),
	E("scribbles", "Scribbles", { "archives" }, "entity", { "scribbles" },
		"Thực thể trong The Archives."),
	E("ransom", "Ransom", { "archives" }, "entity", { "ransom" },
		"Thực thể trong The Archives."),
	E("forget_me_not", "Forget-Me-Not", { "archives" }, "entity",
		{ "forget me not", "forgetmenot", "forget me nots" },
		"Còn được viết 'Forget Me Nots'. Nhiều biến thể chính tả nên có nhiều mẫu."),
	E("teller", "Teller", { "archives" }, "entity", { "teller" },
		"Thực thể trong The Archives."),
	E("alma", "Alma", { "archives" }, "entity", { "alma" },
		"Thực thể trong The Archives."),
	E("honcho", "Honcho", { "archives" }, "entity", { "honcho" },
		"Thực thể trong The Archives."),
	E("fih", "Fih", { "archives" }, "entity", { "fih" },
		"Tên ngắn, dễ trùng với tên instance khác — cần xác minh kỹ."),
	E("portrait", "Portrait", { "archives" }, "entity", { "portrait" },
		"Tranh chân dung; có thể là đạo cụ được đặt tên giống thực thể."),
	E("currents", "Currents", { "archives" }, "entity", { "currents" },
		"Thực thể trong The Archives."),
	E("office_chair", "Office Chair", { "archives", "stairwell" }, "prop", { "office chair" },
		"Đạo cụ môi trường, không phải thực thể."),

	-- ----------------------------- THE OUTDOORS ------------------------------
	E("mandrake", "Mandrake", { "outdoors" }, "entity", { "mandrake" },
		"Thực thể trong The Outdoors."),
	E("surge", "Surge", { "outdoors" }, "entity", { "surge" },
		"Thực thể trong The Outdoors."),
	E("monument", "Monument", { "outdoors" }, "prop", { "monument" },
		"Công trình tĩnh trong The Outdoors."),
	E("eyestalk", "Eyestalk", { "outdoors" }, "entity", { "eyestalk" },
		"Thực thể trong The Outdoors."),
	E("bramble", "Bramble", { "outdoors" }, "entity", { "bramble" },
		"Thực thể trong The Outdoors."),
	E("the_caw", "The Caw", { "outdoors" }, "entity", { "the caw", "caw" },
		"Thực thể trong The Outdoors."),
	E("grampy", "Grampy", { "outdoors" }, "npc", { "grampy" },
		"NPC trong The Outdoors."),
	E("groundskeeper", "Groundskeeper", { "outdoors" }, "npc", { "groundskeeper" },
		"NPC trong The Outdoors."),
	E("world_lotus", "World Lotus", { "outdoors" }, "prop", { "world lotus" },
		"Thực vật/đạo cụ trong The Outdoors."),
	E("flood", "Flood", { "outdoors" }, "event", { "flood" },
		"Sự kiện nước dâng; có thể chỉ tồn tại dưới dạng mực nước/Terrain."),

	-- ---------------------------- THE STAIRWELL ------------------------------
	E("creak", "Creak", { "stairwell" }, "entity", { "creak" },
		"Thực thể trong The Stairwell."),
	E("noise", "Noise", { "stairwell" }, "event", { "noise" },
		"Tên rất dễ trùng với instance âm thanh thường — kết quả khớp cần kiểm tra kỹ."),
	E("stem", "Stem", { "stairwell" }, "entity", { "stem" },
		"Thực thể trong The Stairwell."),
	E("hijack", "Hijack", { "stairwell" }, "entity", { "hijack" },
		"Thực thể trong The Stairwell."),
	E("meld", "Meld", { "stairwell" }, "entity", { "meld" },
		"Thực thể trong The Stairwell."),
	E("cobbler", "Cobbler", { "stairwell" }, "entity", { "cobbler" },
		"Thực thể trong The Stairwell."),
	E("fire_sprinklers", "Fire Sprinklers", { "stairwell" }, "prop", { "fire sprinkler", "sprinkler" },
		"Đầu phun nước — đạo cụ/mối nguy tĩnh."),
	E("crusher", "Crusher", { "stairwell" }, "prop", { "crusher" },
		"Mối nguy cơ khí trong The Stairwell."),
	E("shopping_cart", "Shopping Cart", { "stairwell" }, "prop", { "shopping cart" },
		"Đạo cụ môi trường."),
	E("television_set", "Television Set", { "stairwell" }, "prop", { "television set", "television" },
		"Đạo cụ môi trường."),

	-- ------------------------------ THE ROOMS --------------------------------
	E("a60", "A-60", { "rooms" }, "entity", { "a-60", "a 60" },
		"Thực thể trong The Rooms. Tên instance có thể kèm hậu tố phòng.",
		{ matchMode = "contains" }),
	E("a90", "A-90", { "rooms" }, "entity", { "a-90", "a 90" },
		"Thực thể trong The Rooms. Tên instance có thể kèm hậu tố phòng.",
		{ matchMode = "contains" }),
	E("a120", "A-120", { "rooms" }, "entity", { "a-120", "a 120" },
		"Thực thể trong The Rooms. Tên instance có thể kèm hậu tố phòng.",
		{ matchMode = "contains" }),

	-- ------------------- CHẾ ĐỘ ĐẶC BIỆT VÀ SỰ KIỆN -------------------------
	E("jeff_the_killer", "Jeff The Killer", { "events" }, "event", { "jeff the killer" },
		"Biến thể của Jeff trong sự kiện. Chỉ dò mẫu tên riêng \"jeff the killer\"; aliasOf chỉ là chú thích.",
		{ aliasOf = "jeff" }),
	E("greed", "Greed", { "events" }, "event", { "greed" },
		"Sự kiện/nhân vật theo mùa."),
	E("evil_key", "Evil Key", { "events" }, "event", { "evil key" },
		"Vật phẩm sự kiện; có thể chỉ là Tool trong balô người chơi."),
	E("drakobloxxers", "DRAKOBLOXXERS", { "events" }, "event", { "drakobloxxer", "drakobloxxers" },
		"Mini-game/sự kiện; số lượng instance có thể rất nhiều."),
	E("seeking_wall", "SEEKING WALL!!!", { "events" }, "event", { "seeking wall" },
		"Sự kiện tường Seek; đối tượng có thể là một Part lớn chứ không phải Model."),
	E("lava", "LAVA!", { "events" }, "event", { "lava" },
		"Sự kiện dung nham; có thể chỉ là Part/Terrain dâng lên."),
	E("cringle", "Cringle", { "events" }, "event", { "cringle" },
		"Nhân vật sự kiện mùa đông."),
	E("treater", "Treater", { "events" }, "event", { "treater" },
		"Nhân vật sự kiện Halloween."),
	E("rushing_light", "Rushing Light", { "events" }, "event", { "rushing light" },
		"Sự kiện ánh sáng lao đi."),
	E("rniushcg", "RNIUSHCg==", { "events" }, "event", { "rniushcg" },
		"Tên Rush bị làm nhiễu trong sự kiện. Chỉ dò mẫu tên riêng \"rniushcg\"; aliasOf chỉ là chú thích.",
		{ aliasOf = "rush" }),
	E("aroxmbush", "AROxMBUSH", { "events" }, "event", { "aroxmbush" },
		"Tên Ambush bị làm nhiễu. Chỉ dò mẫu tên riêng \"aroxmbush\"; aliasOf chỉ là chú thích.",
		{ aliasOf = "ambush" }),
	E("scjvereech", "SCJVEREECH", { "events" }, "event", { "scjvereech" },
		"Tên Screech bị làm nhiễu. Chỉ dò mẫu tên riêng \"scjvereech\"; aliasOf chỉ là chú thích.",
		{ aliasOf = "screech" }),
}

--=========================== CHUẨN HOÁ TÊN ===========================
--[[
	Chuẩn hoá một cái tên thành khoá tra cứu: chữ thường, chỉ giữ a-z0-9.
	Ví dụ: "A-60 (Room 3)" -> "a60room3"; "El Goblino" -> "elgoblino".
	Cả Scanner và ô tìm kiếm đều dùng HÀM NÀY để hai bên không lệch nhau.
]]
function Catalog.NormalizeKey(text)
	if type(text) ~= "string" then
		return ""
	end
	local lowered = string.lower(text)
	local cleaned = string.gsub(lowered, "[^a-z0-9]", "")
	return cleaned
end

--=========================== DỰNG CHỈ MỤC ============================
Catalog.List = {}
Catalog.ById = {}
Catalog.ByArea = {}

for _, entry in ipairs(ROWS) do
	if Catalog.ById[entry.id] ~= nil then
		error(("EntityCatalog: trùng id '%s'"):format(entry.id), 2)
	end
	Catalog.List[#Catalog.List + 1] = entry
	Catalog.ById[entry.id] = entry
	for _, areaId in ipairs(entry.areas) do
		if Catalog.ByArea[areaId] == nil then
			Catalog.ByArea[areaId] = {}
		end
		local bucket = Catalog.ByArea[areaId]
		bucket[#bucket + 1] = entry
	end
end

-- Sắp theo tên để danh sách UI ổn định giữa các lần chạy (dễ kiểm thử).
table.sort(Catalog.List, function(a, b)
	if a.name == b.name then
		return a.id < b.id
	end
	return string.lower(a.name) < string.lower(b.name)
end)
for _, bucket in pairs(Catalog.ByArea) do
	table.sort(bucket, function(a, b)
		if a.name == b.name then
			return a.id < b.id
		end
		return string.lower(a.name) < string.lower(b.name)
	end)
end

function Catalog.Count()
	return #Catalog.List
end

function Catalog.Get(entityId)
	if type(entityId) ~= "string" then
		return nil
	end
	return Catalog.ById[entityId]
end

-- Danh sách mục của một khu vực (bản sao nông: không cho sửa bảng gốc).
function Catalog.GetByArea(areaId)
	local bucket = Catalog.ByArea[areaId]
	if bucket == nil then
		return {}
	end
	local copy = {}
	for index, entry in ipairs(bucket) do
		copy[index] = entry
	end
	return copy
end

-- Số mục của từng khu vực — dùng cho kiểm thử đối chiếu danh sách yêu cầu.
function Catalog.GetAreaCounts()
	local counts = {}
	for areaId, bucket in pairs(Catalog.ByArea) do
		counts[areaId] = #bucket
	end
	return counts
end

-- Tổng số cặp (mục, khu vực) — dùng để phát hiện thiếu/sót khi sửa dữ liệu.
function Catalog.CountMemberships()
	local total = 0
	for _, entry in ipairs(Catalog.List) do
		total = total + #entry.areas
	end
	return total
end

--[[
	Danh sách mẫu tên đã chuẩn hoá của MỘT mục.

	CHỐT TRUNG THỰC: `aliasOf` KHÔNG được dùng để mượn mẫu tên. Nếu một
	instance tên "Rush" mà ta kết luận luôn cả RNIUSHCg== "Đã phát hiện"
	thì đó là báo sai (false positive) — người dùng sẽ tin có hai thực thể
	trong khi chỉ có một. Vì vậy:
	  * mỗi mục chỉ khớp theo mẫu tên RIÊNG của nó;
	  * `aliasOf` chỉ là CHÚ THÍCH hiển thị ("biến thể của ..."), xem
	    Catalog.GetAliasName;
	  * muốn một mục dùng chung luật với mục khác thì PHẢI khai báo mẫu tên
	    đó trong `patterns` của chính nó (kèm bằng chứng).
]]
function Catalog.GetMatchKeys(entry)
	if entry == nil then
		return {}
	end
	local keys = {}
	for _, pattern in ipairs(entry.detect.patterns) do
		local key = Catalog.NormalizeKey(pattern)
		if #key > 0 then
			keys[#keys + 1] = key
		end
	end
	return keys
end

-- Tên hiển thị của mục mà mục này là biến thể (nil nếu không phải biến thể).
function Catalog.GetAliasName(entry)
	if entry == nil or entry.detect.aliasOf == nil then
		return nil
	end
	local target = Catalog.ById[entry.detect.aliasOf]
	if target == nil then
		return tostring(entry.detect.aliasOf)
	end
	return target.name
end

--[[
	TÌM KIẾM. Trả về danh sách mục thoả cả hai điều kiện:
	  * khớp `query` (rỗng = bỏ qua) theo tên hiển thị, id, hoặc mẫu tên;
	  * thuộc `areaId` (nil = mọi khu vực).
	Không sắp xếp lại: thứ tự đã ổn định từ Catalog.List.
]]
function Catalog.Search(query, areaId)
	local needle = Catalog.NormalizeKey(query)
	local results = {}
	for _, entry in ipairs(Catalog.List) do
		local passesArea = true
		-- "all" là giá trị mặc định của bộ lọc khu vực trong UI; nó có nghĩa
		-- "không lọc". Nếu không xử lý ở đây thì mở radar lên sẽ thấy DANH
		-- SÁCH RỖNG dù có 82 mục (lỗi thật, đã được test RAD-010 bắt).
		if areaId ~= nil and areaId ~= "" and areaId ~= "all" then
			passesArea = false
			for _, entryArea in ipairs(entry.areas) do
				if entryArea == areaId then
					passesArea = true
					break
				end
			end
		end
		if passesArea then
			if needle == "" then
				results[#results + 1] = entry
			else
				local haystack = Catalog.NormalizeKey(entry.name)
					.. "|" .. Catalog.NormalizeKey(entry.id)
				for _, pattern in ipairs(entry.detect.patterns) do
					haystack = haystack .. "|" .. Catalog.NormalizeKey(pattern)
				end
				if string.find(haystack, needle, 1, true) ~= nil then
					results[#results + 1] = entry
				end
			end
		end
	end
	return results
end

--[[
	TỰ KIỂM TRA DỮ LIỆU. Trả về (ok, problems).
	Được gọi khi khởi động (Client/Core/SelfCheck) và trong test: dữ liệu
	hỏng thì hệ thống phải BÁO, không được chạy với danh mục sai.
]]
function Catalog.Validate()
	local problems = {}

	local ids = {}
	for _, entry in ipairs(Catalog.List) do
		if ids[entry.id] then
			problems[#problems + 1] = "trùng id: " .. tostring(entry.id)
		end
		ids[entry.id] = true

		if #entry.areas == 0 then
			problems[#problems + 1] = entry.id .. ": không thuộc khu vực nào"
		end
		for _, areaId in ipairs(entry.areas) do
			if not Shared_Areas.IsValid(areaId) then
				problems[#problems + 1] = entry.id .. ": khu vực lạ '" .. tostring(areaId) .. "'"
			end
		end

		if Catalog.KindLabel[entry.kind] == nil then
			problems[#problems + 1] = entry.id .. ": kind lạ '" .. tostring(entry.kind) .. "'"
		end

		local detect = entry.detect
		if detect.method == "scan" and #Catalog.GetMatchKeys(entry) == 0 then
			problems[#problems + 1] = entry.id .. ": method scan nhưng không có mẫu tên nào dùng được"
		end
		if detect.method == "unsupported" and (detect.reason == nil or detect.reason == "") then
			problems[#problems + 1] = entry.id .. ": unsupported phải có lý do"
		end
		if detect.aliasOf ~= nil and Catalog.ById[detect.aliasOf] == nil then
			problems[#problems + 1] = entry.id .. ": aliasOf trỏ tới mục không tồn tại"
		end
	end

	-- alias không được tạo chu trình
	for _, entry in ipairs(Catalog.List) do
		local seen = {}
		local cursor = entry
		local hops = 0
		while cursor ~= nil and cursor.detect.aliasOf ~= nil and hops < 16 do
			if seen[cursor.id] then
				problems[#problems + 1] = entry.id .. ": aliasOf tạo chu trình"
				break
			end
			seen[cursor.id] = true
			cursor = Catalog.ById[cursor.detect.aliasOf]
			hops = hops + 1
		end
	end

	return #problems == 0, problems
end

return Catalog
