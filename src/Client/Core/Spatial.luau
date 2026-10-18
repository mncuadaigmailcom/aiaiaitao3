--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  DATA-002, NPC-003, QUERY-003 
	===== RALO.METHODS:END ===== --]]

--[[
	Client/Core/Spatial.luau
	===== RALO.METHODS:DATA-002, QUERY-003, QUERY-004, CPU-005, NPC-003 =====

	Truy vấn không gian: tìm đối tượng gần mà không quét cả thế giới.

	Nguyên nhân lag mà nó xử lý:
	  * `Workspace:GetDescendants()` trả về HÀNG CHỤC NGHÌN instance.
	    Gọi nó mỗi khung hình để tìm "part gần nhất" là một trong những
	    nguồn lag script phổ biến nhất trong Roblox.
	  * Quét O(n) cho mỗi truy vấn, trong khi phần lớn truy vấn chỉ quan
	    tâm một vùng nhỏ quanh người chơi.

	Cách xử lý: lưới băm không gian (spatial hash).
	  * Chia thế giới thành các ô vuông cạnh `cellSize`.
	  * Mỗi đối tượng nằm trong đúng một ô -> truy vấn lân cận chỉ duyệt
	    các ô quanh điểm hỏi, tức O(số đối tượng trong vùng) thay vì O(n).

	GIỚI HẠI: lưới chỉ hữu ích khi vị trí đối tượng ít thay đổi hoặc ta
	cập nhật lưới theo chu kỳ (không phải mỗi khung hình). Với đối tượng
	di chuyển nhanh, nên dùng API vật lý của engine thay vì lưới này.
]]

local Shared_Log = __RALO_REQUIRE("Shared/Log")
local Client_Guard = __RALO_REQUIRE("Client/Core/Guard")

local SCOPE = "Spatial"

local Spatial = {}
Spatial.__index = Spatial

function Spatial.New(cellSize)
	local self = setmetatable({}, Spatial)
	self.cellSize = math.max(1, tonumber(cellSize) or 64)
	self.cells = {}            -- key "x,y,z" -> { instance = true, ... }
	self.entries = {}          -- instance -> { key, position }
	self.stats = { inserts = 0, queries = 0, candidatesExamined = 0, rebuilds = 0 }
	return self
end

local function cellKey(self, position)
	local size = self.cellSize
	return ("%d,%d,%d"):format(
		math.floor(position.X / size),
		math.floor(position.Y / size),
		math.floor(position.Z / size)
	)
end

function Spatial:Insert(instance, position)
	if instance == nil or position == nil then
		return false
	end
	-- Nếu đã có thì bỏ vị trí cũ trước (tránh trùng lặp khi đối tượng di chuyển)
	self:Remove(instance)

	local key = cellKey(self, position)
	if self.cells[key] == nil then
		self.cells[key] = {}
	end
	self.cells[key][instance] = true
	self.entries[instance] = { key = key, position = position }
	self.stats.inserts += 1
	return true
end

function Spatial:Remove(instance)
	local entry = self.entries[instance]
	if entry == nil then
		return false
	end
	local bucket = self.cells[entry.key]
	if bucket ~= nil then
		bucket[instance] = nil
		if next(bucket) == nil then
			self.cells[entry.key] = nil
		end
	end
	self.entries[instance] = nil
	return true
end

--[[
	Tìm ứng viên trong bán kính `radius` quanh `origin`.
	CHỈ trả về ỨNG VIÊN (theo ô lưới) — người gọi vẫn phải tự kiểm tra
	khoảng cách thật nếu cần chính xác. Đây là điểm quan trọng:
	lưới băm là bộ LỌC, không phải kết quả cuối.
]]
function Spatial:QueryRadius(origin, radius)
	self.stats.queries += 1
	if origin == nil then
		return {}
	end
	local r = math.max(0, tonumber(radius) or 0)
	local size = self.cellSize
	local reach = math.ceil(r / size)

	local found = {}
	local cx = math.floor(origin.X / size)
	local cy = math.floor(origin.Y / size)
	local cz = math.floor(origin.Z / size)

	for dx = -reach, reach do
		for dy = -reach, reach do
			for dz = -reach, reach do
				local bucket = self.cells[("%d,%d,%d"):format(cx + dx, cy + dy, cz + dz)]
				if bucket ~= nil then
					for instance, entry in pairs(bucket) do
						found[#found + 1] = instance
						self.stats.candidatesExamined += 1
						_ = entry
					end
				end
			end
		end
	end
	return found
end

--[[
	Tìm ỨNG VIÊN gần nhất, lọc tiếp bằng khoảng cách bình phương (CPU-005).
	Trả về: instance, khoảng cách (hoặc nil).
]]
function Spatial:Nearest(origin, radius)
	local candidates = self:QueryRadius(origin, radius)
	local limitSquared = (radius or 0) * (radius or 0)
	local best, bestDistanceSquared = nil, math.huge

	for _, instance in candidates do
		local entry = self.entries[instance]
		if entry ~= nil then
			local p = entry.position
			local dx = p.X - origin.X
			local dy = p.Y - origin.Y
			local dz = p.Z - origin.Z
			local d2 = dx * dx + dy * dy + dz * dz
			if d2 <= limitSquared and d2 < bestDistanceSquared then
				best = instance
				bestDistanceSquared = d2
			end
		end
	end

	if best == nil then
		return nil, nil
	end
	return best, math.sqrt(bestDistanceSquared)
end

function Spatial:Count()
	local n = 0
	for _ in pairs(self.entries) do
		n += 1
	end
	return n
end

function Spatial:CellCount()
	local n = 0
	for _ in pairs(self.cells) do
		n += 1
	end
	return n
end

--[[
	Dựng lưới từ một danh sách instance có CFrame.
	Có TRẦN số đối tượng để việc dựng lưới không tự gây khựng hình.
]]
function Spatial:Rebuild(instances, maxEntries)
	self.stats.rebuilds += 1
	table.clear(self.cells)
	table.clear(self.entries)

	local limit = math.max(1, math.floor(maxEntries or 500))
	local inserted = 0
	for _, instance in instances do
		if inserted >= limit then
			Shared_Log.Info(SCOPE, ("chỉ lập lưới cho %d/%d đối tượng (trần)")
				:format(limit, #instances))
			break
		end
		local ok, position = Client_Guard.Run(SCOPE, function()
			return instance.CFrame
		end)
		if ok and position ~= nil then
			self:Insert(instance, position.Position or position)
			inserted += 1
		end
	end
	return inserted
end

function Spatial:Stats()
	return {
		cellSize = self.cellSize,
		entries = self:Count(),
		cells = self:CellCount(),
		inserts = self.stats.inserts,
		queries = self.stats.queries,
		candidatesExamined = self.stats.candidatesExamined,
		rebuilds = self.stats.rebuilds,
	}
end

return Spatial
