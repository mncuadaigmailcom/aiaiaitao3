--[[
	Shared/DoorsCatalog.luau

	Danh mục tên cho công cụ QA trong Roblox Studio của chính bạn.
	Catalog KHÔNG quét Workspace và KHÔNG tự tìm object theo tên. Một object
	chỉ được nhận diện khi nhà phát triển chủ động gắn tag
	"RALO_DoorsDevLocator" cùng hai attribute được mô tả trong docs/10.

	Chỉ là nhãn phân loại; không khẳng định đây là công cụ chính thức của DOORS.
]]

local Catalog = {}

Catalog.TAG = "RALO_DoorsDevLocator"
Catalog.SECTION_ATTRIBUTE = "RALO_LocatorSection"
Catalog.NAME_ATTRIBUTE = "RALO_LocatorName"

-- Mỗi section giữ nguyên các tên được yêu cầu; một tên có thể xuất hiện ở
-- nhiều khu vực (ví dụ Rush, Glitch, Starlight) nên tra cứu luôn cần sectionId.
Catalog.SECTIONS = {
	{
		id = "hotel",
		label = "The Hotel",
		color = { 255, 112, 98 },
		entities = {
			{ name = "Rush" }, { name = "Ambush" }, { name = "Eyes" },
			{ name = "Screech" }, { name = "Figure" }, { name = "Seek" },
			{ name = "Dupe" }, { name = "Halt" }, { name = "Hide" },
			{ name = "Timothy" }, { name = "Sally (Window)", aliases = { "Sally" } },
			{ name = "Dread" }, { name = "Jeff" }, { name = "El Goblino" },
			{ name = "Bob" }, { name = "Jack" }, { name = "Moonlight" },
			{ name = "Weirdo" }, { name = "Glitch" }, { name = "Void" },
			{ name = "Red Barrier" }, { name = "Snare" }, { name = "Fallen Chandeliers" },
		},
	},
	{
		id = "mines",
		label = "The Mines",
		color = { 255, 181, 87 },
		entities = {
			{ name = "Rush" }, { name = "Ambush" }, { name = "Eyes" },
			{ name = "Screech" }, { name = "Figure" }, { name = "Seek" },
			{ name = "Dupe" }, { name = "Halt" }, { name = "Hide" },
			{ name = "Timothy" }, { name = "Dread" }, { name = "Giggle" },
			{ name = "Gloombats" }, { name = "Grumble" }, { name = "Queen Grumble" },
			{ name = "Charles" }, { name = "Dam Seek" }, { name = "Jeff" },
			{ name = "El Goblino" }, { name = "Bob" }, { name = "Louie" },
			{ name = "Moonlight" }, { name = "Jack" }, { name = "Weirdo" },
			{ name = "Glitch" }, { name = "Void" }, { name = "Red Barrier" },
		},
	},
	{
		id = "backdoor",
		label = "The Backdoor",
		color = { 91, 204, 240 },
		entities = {
			{ name = "Blitz" }, { name = "Haste" }, { name = "Lookman" },
			{ name = "Starlight" }, { name = "Glitch" }, { name = "Vacuum" },
		},
	},
	{
		id = "archives",
		label = "The Archives",
		color = { 190, 137, 255 },
		entities = {
			{ name = "Drone" }, { name = "Bash" }, { name = "Scribbles" },
			{ name = "Ransom" },
			{ name = "Forget Me Nots (Forget-Me-Not)", aliases = { "Forget-Me-Not" } },
			{ name = "Teller" }, { name = "Alma" }, { name = "Honcho" },
			{ name = "Fih" }, { name = "Portrait" }, { name = "Starlight" },
			{ name = "Glitch" }, { name = "Currents" }, { name = "Office Chair" },
		},
	},
	{
		id = "outdoors",
		label = "The Outdoors",
		color = { 117, 226, 146 },
		entities = {
			{ name = "Mandrake" }, { name = "Surge" }, { name = "Monument" },
			{ name = "Eyestalk" }, { name = "Bramble" }, { name = "The Caw" },
			{ name = "Grampy" }, { name = "Groundskeeper" }, { name = "Starlight" },
			{ name = "Glitch" }, { name = "World Lotus" }, { name = "Snare" },
			{ name = "Flood" },
		},
	},
	{
		id = "stairwell",
		label = "The Stairwell",
		color = { 255, 205, 102 },
		entities = {
			{ name = "Creak" }, { name = "Noise" }, { name = "Stem" },
			{ name = "Hijack" }, { name = "Meld" }, { name = "Cobbler" },
			{ name = "Glitch" }, { name = "Fire Sprinklers" }, { name = "Crusher" },
			{ name = "Office Chair" }, { name = "Shopping Cart" }, { name = "Television Set" },
		},
	},
	{
		id = "rooms",
		label = "The Rooms",
		color = { 125, 167, 255 },
		entities = {
			{ name = "A-60" }, { name = "A-90" }, { name = "A-120" },
		},
	},
	{
		id = "events",
		label = "Chế độ đặc biệt & sự kiện",
		color = { 255, 137, 202 },
		entities = {
			{ name = "Jeff The Killer" }, { name = "Greed" }, { name = "Evil Key" },
			{ name = "DRAKOBLOXXERS" }, { name = "SEEKING WALL!!!" },
			{ name = "LAVA!" }, { name = "Cringle" }, { name = "Treater" },
			{ name = "Rushing Light" }, { name = "RNIUSHCg==" },
			{ name = "AROxMBUSH" }, { name = "SCJVEREECH" },
		},
	},
}

local function normalize(value)
	if type(value) ~= "string" then
		return ""
	end
	local trimmed = string.gsub(value, "^%s*(.-)%s*$", "%1")
	return string.lower(trimmed)
end

local sectionById = {}
local entryBySection = {}

for _, section in ipairs(Catalog.SECTIONS) do
	sectionById[section.id] = section
	local names = {}
	for _, entry in ipairs(section.entities) do
		names[normalize(entry.name)] = entry
		for _, alias in ipairs(entry.aliases or {}) do
			names[normalize(alias)] = entry
		end
	end
	entryBySection[section.id] = names
end

function Catalog.GetSection(sectionId)
	if type(sectionId) ~= "string" then
		return nil
	end
	return sectionById[sectionId]
end

function Catalog.Resolve(sectionId, name)
	if type(sectionId) ~= "string" then
		return nil, nil
	end
	local section = sectionById[sectionId]
	local names = entryBySection[sectionId]
	if section == nil or names == nil then
		return nil, nil
	end
	local entry = names[normalize(name)]
	if entry == nil then
		return nil, section
	end
	return entry, section
end

function Catalog.IsKnown(sectionId, name)
	local entry = Catalog.Resolve(sectionId, name)
	return entry ~= nil
end

function Catalog.CountSection(sectionId)
	local section = sectionById[sectionId]
	return section and #section.entities or 0
end

function Catalog.TotalCount()
	local total = 0
	for _, section in ipairs(Catalog.SECTIONS) do
		total += #section.entities
	end
	return total
end

function Catalog.SectionCount()
	return #Catalog.SECTIONS
end

return Catalog
