-- Danh mục chỉ chứa tên hiển thị người dùng cung cấp; không khẳng định tên nội bộ của DOORS.
local Catalog = {}

local definitions = {
	["THE HOTEL"] = {"Rush", "Ambush", "Eyes", "Screech", "Figure", "Seek", "Dupe", "Halt", "Hide", "Timothy", "Sally (Window)", "Dread", "Jeff", "El Goblino", "Bob", "Jack", "Moonlight", "Weirdo", "Glitch", "Void", "Red Barrier", "Snare", "Fallen Chandeliers"},
	["THE MINES"] = {"Rush", "Ambush", "Eyes", "Screech", "Figure", "Seek", "Dupe", "Halt", "Hide", "Timothy", "Dread", "Giggle", "Gloombats", "Grumble", "Queen Grumble", "Charles", "Dam Seek", "Jeff", "El Goblino", "Bob", "Louie", "Moonlight", "Jack", "Weirdo", "Glitch", "Void", "Red Barrier"},
	["THE BACKDOOR"] = {"Blitz", "Haste", "Lookman", "Starlight", "Glitch", "Vacuum"},
	["THE ARCHIVES"] = {"Drone", "Bash", "Scribbles", "Ransom", "Forget Me Nots (Forget-Me-Not)", "Teller", "Alma", "Honcho", "Fih", "Portrait", "Starlight", "Glitch", "Currents", "Office Chair"},
	["THE OUTDOORS"] = {"Mandrake", "Surge", "Monument", "Eyestalk", "Bramble", "The Caw", "Grampy", "Groundskeeper", "Starlight", "Glitch", "World Lotus", "Snare", "Flood"},
	["THE STAIRWELL"] = {"Creak", "Noise", "Stem", "Hijack", "Meld", "Cobbler", "Glitch", "Fire Sprinklers", "Crusher", "Office Chair", "Shopping Cart", "Television Set"},
	["THE ROOMS"] = {"A-60", "A-90", "A-120"},
	["SPECIAL & EVENTS"] = {"Jeff The Killer", "Greed", "Evil Key", "DRAKOBLOXXERS", "SEEKING WALL!!!", "LAVA!", "Cringle", "Treater", "Rushing Light", "RNIUSHCg==", "AROxMBUSH", "SCJVEREECH"},
}

local environmentNames = {
	["Red Barrier"] = true, ["Fallen Chandeliers"] = true, ["Office Chair"] = true,
	["Snare"] = true, ["Gloombats"] = true, ["Fire Sprinklers"] = true,
	["Shopping Cart"] = true, ["Television Set"] = true, ["Mandrake"] = true,
	["World Lotus"] = true, ["Flood"] = true,
}

Catalog.Sections = {}
Catalog.ByName = {}
for sectionName, names in pairs(definitions) do
	local section = { name = sectionName, entities = {} }
	for _, name in ipairs(names) do
		local kind = sectionName == "SPECIAL & EVENTS" and "event" or (environmentNames[name] and "environment" or "entity")
		local entry = {
			name = name,
			kind = kind,
			aliases = {name},
			verified = false,
		}
		table.insert(section.entities, entry)
		Catalog.ByName[sectionName .. "\0" .. name] = entry
	end
	table.insert(Catalog.Sections, section)
end
-- Giữ thứ tự hiển thị ổn định dù pairs() không đảm bảo thứ tự.
local ordered = {"THE HOTEL", "THE MINES", "THE BACKDOOR", "THE ARCHIVES", "THE OUTDOORS", "THE STAIRWELL", "THE ROOMS", "SPECIAL & EVENTS"}
local sorted = {}
for _, name in ipairs(ordered) do
	for _, section in ipairs(Catalog.Sections) do
		if section.name == name then table.insert(sorted, section); break end
	end
end
Catalog.Sections = sorted
return Catalog
