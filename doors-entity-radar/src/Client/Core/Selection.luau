--[[
	doors-entity-radar/src/Client/Core/Selection.luau
	ModuleScript — đặt tại: DoorsEntityRadar.Client.Core.Selection

	TRẠNG THÁI LỰA CHỌN (dữ liệu thuần, KHÔNG có GUI).

	Tại sao tách riêng:
	  * Yêu cầu "trạng thái lựa chọn đồng bộ giữa các tab" chỉ làm được khi
	    lựa chọn nằm NGOÀI giao diện. Nếu để trong RadarUi thì mỗi lần đổi tab
	    hoặc dựng lại UI sẽ mất lựa chọn.
	  * Test được bằng Lua thuần, không cần mock GUI.

	RÀNG BUỘC:
	  * Chỉ chấp nhận id CÓ THẬT trong danh mục (Shared_Catalog.ById) — không
	    cho rác lọt vào, nếu không bộ đếm "12/50" sẽ nói dối.
	  * `version` tăng MỖI LẦN có thay đổi thật. UI so version để biết khi nào
	    cần vẽ lại; dữ liệu không đổi thì không vẽ (giống Tracker).
	  * Không tạo instance, không nối sự kiện — không có gì để rò rỉ.
]]

local Shared_Catalog = __DER_REQUIRE("Shared/EntityCatalog")

local Selection = {}
Selection.__index = Selection

function Selection.new()
	local self = setmetatable({}, Selection)
	self.ids = {}          -- [entityId] = true
	self.count = 0
	self.version = 0
	self.stats = { toggles = 0, rejected = 0, clears = 0, bulkOps = 0 }
	return self
end

-- id có thật trong danh mục không? Trả về (bool, lý do nếu từ chối).
function Selection.IsValidId(entityId)
	if type(entityId) ~= "string" then
		return false, "id phải là chuỗi"
	end
	if Shared_Catalog.ById[entityId] == nil then
		return false, "không có mục '" .. entityId .. "' trong danh mục"
	end
	return true, nil
end

function Selection:IsSelected(entityId)
	if type(entityId) ~= "string" then
		return false
	end
	return self.ids[entityId] == true
end

function Selection:Count()
	return self.count
end

-- Danh sách id đã chọn, CÓ sắp xếp để UI hiển thị ổn định giữa các lần vẽ.
function Selection:Ids()
	local list = {}
	for entityId in pairs(self.ids) do
		list[#list + 1] = entityId
	end
	table.sort(list)
	return list
end

--[[
	Đặt trạng thái chọn cho MỘT mục. Trả về (changed, ok, message).
	changed = true chỉ khi trạng thái thật sự đổi — UI dựa vào đó để không
	vẽ lại khi người dùng bấm vào ô đã ở đúng trạng thái.
]]
function Selection:Set(entityId, selected)
	local valid, reason = Selection.IsValidId(entityId)
	if not valid then
		self.stats.rejected = self.stats.rejected + 1
		return false, false, reason
	end
	local wantSelected = selected == true
	local currentlySelected = self.ids[entityId] == true
	if currentlySelected == wantSelected then
		return false, true, "không đổi"
	end
	if wantSelected then
		self.ids[entityId] = true
		self.count = self.count + 1
	else
		self.ids[entityId] = nil
		self.count = self.count - 1
	end
	self.version = self.version + 1
	return true, true, nil
end

-- Đảo trạng thái chọn. Trả về (nowSelected, ok, message).
function Selection:Toggle(entityId)
	self.stats.toggles = self.stats.toggles + 1
	local valid, reason = Selection.IsValidId(entityId)
	if not valid then
		self.stats.rejected = self.stats.rejected + 1
		return false, false, reason
	end
	local nowSelected = self.ids[entityId] ~= true
	local changed = self:Set(entityId, nowSelected)
	return nowSelected, true, changed
end

--[[
	Đặt hàng loạt (dùng cho "Chọn tất cả trong phạm vi đang xem").
	`ids` là mảng; hàm KHÔNG tạo bảng trung gian ngoài bộ đếm.
	Trả về (changedCount, rejectedCount).
]]
function Selection:SetMany(ids, selected)
	local changedCount = 0
	local rejectedCount = 0
	if type(ids) ~= "table" then
		return 0, 0
	end
	self.stats.bulkOps = self.stats.bulkOps + 1
	local wantSelected = selected == true
	for _, entityId in ipairs(ids) do
		local changed, ok = self:Set(entityId, wantSelected)
		if changed then
			changedCount = changedCount + 1
		elseif not ok then
			rejectedCount = rejectedCount + 1
		end
	end
	return changedCount, rejectedCount
end

-- Xoá toàn bộ lựa chọn. Trả về số mục đã bị bỏ chọn.
function Selection:Clear()
	local removed = self.count
	if removed == 0 then
		return 0
	end
	self.ids = {}
	self.count = 0
	self.version = self.version + 1
	self.stats.clears = self.stats.clears + 1
	return removed
end

-- Toàn bộ id của danh mục (dùng cho nút "Chọn tất cả khu vực").
function Selection.AllCatalogIds()
	local list = {}
	for _, entry in ipairs(Shared_Catalog.List) do
		list[#list + 1] = entry.id
	end
	return list
end

-- Toàn bộ id thuộc một khu vực (khu vực = id thật, "all" = mọi khu vực).
function Selection.AreaIds(areaId)
	local list = {}
	if areaId == nil or areaId == "" or areaId == "all" then
		return Selection.AllCatalogIds()
	end
	for _, entry in ipairs(Shared_Catalog.List) do
		for _, entryArea in ipairs(entry.areas) do
			if entryArea == areaId then
				list[#list + 1] = entry.id
				break
			end
		end
	end
	return list
end

function Selection:Version()
	return self.version
end

function Selection:Stats()
	return {
		count = self.count,
		version = self.version,
		toggles = self.stats.toggles,
		rejected = self.stats.rejected,
		clears = self.stats.clears,
		bulkOps = self.stats.bulkOps,
	}
end

return Selection
