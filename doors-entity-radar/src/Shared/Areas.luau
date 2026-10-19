--[[
	doors-entity-radar/src/Shared/Areas.luau
	ModuleScript — đặt tại: ReplicatedStorage.DoorsEntityRadar.Shared.Areas

	DANH MỤC KHU VỰC. Tách riêng khỏi EntityCatalog để bộ lọc khu vực
	trong UI và dữ liệu thực thể không dính vào nhau.

	Mỗi khu vực có:
	  id     — khoá ổn định dùng trong code và trong cấu hình
	  name   — tên hiển thị
	  short  — nhãn ngắn cho nút lọc (màn hình hẹp)
	  order  — thứ tự hiển thị
	  note   — ghi chú trung thực về khả năng phát hiện trong khu vực đó
]]

local Areas = {}

Areas.List = {
	{
		id = "hotel",
		name = "The Hotel",
		short = "Hotel",
		order = 1,
		note = "Khu khách sạn (cửa 1-100). Nhiều thực thể spawn dưới dạng Model trong Workspace.",
	},
	{
		id = "mines",
		name = "The Mines",
		short = "Mines",
		order = 2,
		note = "Khu hầm mỏ. Dùng chung nhiều thực thể với Hotel, thêm các thực thể riêng.",
	},
	{
		id = "backdoor",
		name = "The Backdoor",
		short = "Backdoor",
		order = 3,
		note = "Khu Backdoor. Danh sách thực thể ngắn, phần lớn là tên suy đoán.",
	},
	{
		id = "archives",
		name = "The Archives",
		short = "Archives",
		order = 4,
		note = "Khu lưu trữ. Nhiều mục là tên do cộng đồng gọi, chưa chắc trùng tên instance.",
	},
	{
		id = "outdoors",
		name = "The Outdoors",
		short = "Outdoors",
		order = 5,
		note = "Khu ngoài trời. Một số mục là vật thể môi trường chứ không phải thực thể.",
	},
	{
		id = "stairwell",
		name = "The Stairwell",
		short = "Stairwell",
		order = 6,
		note = "Khu cầu thang. Nhiều mục là đạo cụ/mối nguy hơn là thực thể đuổi.",
	},
	{
		id = "rooms",
		name = "The Rooms",
		short = "Rooms",
		order = 7,
		note = "Chế độ The Rooms (A-60, A-90, A-120).",
	},
	{
		id = "events",
		name = "Chế độ đặc biệt & sự kiện",
		short = "Sự kiện",
		order = 8,
		note = "Sự kiện/mùa và các biến thể tên bị làm nhiễu. Phần lớn KHÔNG phải instance riêng.",
	},
}

-- Bảng tra nhanh theo id, dựng một lần khi module được nạp.
Areas.ById = {}
for _, area in ipairs(Areas.List) do
	if Areas.ById[area.id] ~= nil then
		error(("Areas: trùng id khu vực '%s'"):format(area.id), 2)
	end
	Areas.ById[area.id] = area
end

function Areas.IsValid(areaId)
	return type(areaId) == "string" and Areas.ById[areaId] ~= nil
end

function Areas.GetName(areaId)
	local area = Areas.ById[areaId]
	if area == nil then
		return tostring(areaId)
	end
	return area.name
end

function Areas.GetShortName(areaId)
	local area = Areas.ById[areaId]
	if area == nil then
		return tostring(areaId)
	end
	return area.short
end

-- Danh sách id khu vực đã sắp xếp theo `order` (dùng cho nút lọc).
function Areas.GetOrderedIds()
	local sorted = {}
	for _, area in ipairs(Areas.List) do
		sorted[#sorted + 1] = area.id
	end
	table.sort(sorted, function(a, b)
		return Areas.ById[a].order < Areas.ById[b].order
	end)
	return sorted
end

-- Số khu vực — dùng trong tự kiểm tra khởi động.
function Areas.Count()
	return #Areas.List
end

return Areas
