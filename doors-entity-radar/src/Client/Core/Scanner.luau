--[[
	doors-entity-radar/src/Client/Core/Scanner.luau
	ModuleScript — đặt tại: DoorsEntityRadar.Client.Core.Scanner

	CƠ CHẾ PHÁT HIỆN DUY NHẤT của dự án. Nó làm đúng MỘT việc: trả lời
	"trong phạm vi được phép đọc, có instance nào khớp tên với mục X không".

	CÁCH HOẠT ĐỘNG (không có gì bí ẩn, không có phép màu):
	  1. Nối Workspace.DescendantAdded / DescendantRemoving: instance mới
	     xuất hiện được đưa vào HÀNG ĐỢI, không xử lý ngay trong sự kiện.
	  2. Mỗi nhịp, hàng đợi được xử lý theo NGÂN SÁCH (Config.Scan.
	     descendantsPerStep) nên không khựng khung hình.
	  3. Thỉnh thoảng (Config.Scan.fullScanIntervalSeconds) quét đầy đủ một
	     lần để bắt những instance xuất hiện trước khi hệ thống chạy.
	     Nếu số descendant vượt trần, kết quả bị đánh dấu "có thể thiếu"
	     và UI phải hiển thị cảnh báo đó — KHÔNG im lặng.
	  4. Cầu dữ liệu nhà phát triển (tuỳ chọn, mặc định tắt): đọc Attribute
	     do chính bạn phát ra. Đây là dữ liệu được cung cấp, không suy đoán.

	Scanner KHÔNG tính khoảng cách, KHÔNG tạo GUI, KHÔNG đổi trạng thái.
	Nó chỉ đưa ra ứng viên; Tracker mới là nơi kết luận.
]]

local Shared_Safe = __DER_REQUIRE("Shared/Safe")
local Shared_Log = __DER_REQUIRE("Shared/Log")
local Shared_Geometry = __DER_REQUIRE("Shared/Geometry")
local Shared_Catalog = __DER_REQUIRE("Shared/EntityCatalog")
local Client_Matcher = __DER_REQUIRE("Client/Core/Matcher")

local Scanner = {}
Scanner.__index = Scanner

-- Lấy phần cấu hình phát hiện, không dùng `and/or` để tránh nuốt giá trị.
local function detectionPartOf(config)
	if type(config) ~= "table" then
		return nil
	end
	return config.Detection
end

function Scanner.new(config)
	local self = setmetatable({}, Scanner)
	self.config = config
	self.matcher = Client_Matcher.Build(detectionPartOf(config))

	-- Kết quả khớp: [entityId] = { { instance, name, firstSeenAt }, ... }
	self.matches = {}
	-- Tra ngược instance -> danh sách entityId (khoá yếu để không giữ rác).
	self.instanceIds = setmetatable({}, { __mode = "k" })

	self.pendingAdded = {}
	self.pendingAddedCursor = 1
	self.pendingRemoved = {}
	self.attachedRoot = nil
	self.connections = {}

	self.descendants = nil
	self.cursor = 1
	self.fullScanRequested = true
	self.lastFullScanAt = nil
	self.lastFullScanDuration = nil
	self.truncated = false

	self.stats = {
		addedSeen = 0,
		removedSeen = 0,
		indexedInstances = 0,
		fullScans = 0,
		descendantsSeenTotal = 0,
		errors = 0,
		bridgeReads = 0,
		bridgeHits = 0,
	}
	return self
end

-- Dựng lại bộ khớp (sau khi người dùng sửa Config.Detection lúc chạy).
function Scanner:RebuildMatcher()
	self.matcher = Client_Matcher.Build(detectionPartOf(self.config))
	-- Chỉ mục cũ có thể chứa mục nay đã thành unsupported: quét lại từ đầu.
	self:ClearMatches()
	self.fullScanRequested = true
	return Client_Matcher.Stats(self.matcher)
end

function Scanner:ClearMatches()
	self.matches = {}
	self.instanceIds = setmetatable({}, { __mode = "k" })
	self.pendingAdded = {}
	self.pendingAddedCursor = 1
	self.pendingRemoved = {}
	self.descendants = nil
	self.cursor = 1
end

-- Tên có nằm trong danh sách bỏ qua không?
function Scanner:_isIgnored(instanceName)
	local ignoreList = self.config and self.config.Scan and self.config.Scan.ignoreNames
	if type(ignoreList) ~= "table" then
		return false
	end
	for _, ignored in ipairs(ignoreList) do
		if ignored == instanceName then
			return true
		end
	end
	return false
end

-- Thêm một ứng viên vào kết quả khớp của một mục (có giới hạn số lượng).
function Scanner:_addMatch(entityId, instance, instanceName, now)
	local bucket = self.matches[entityId]
	if bucket == nil then
		bucket = {}
		self.matches[entityId] = bucket
	end
	for _, existing in ipairs(bucket) do
		if existing.instance == instance then
			return false -- đã có, không thêm trùng
		end
	end
	local limit = (self.config and self.config.Scan and self.config.Scan.maxMatchesPerEntity) or 8
	if #bucket >= limit then
		return false
	end
	bucket[#bucket + 1] = {
		instance = instance,
		name = instanceName,
		firstSeenAt = now or os.clock(),
	}
	return true
end

-- Phân loại MỘT instance: khớp mục nào thì ghi vào mục đó.
function Scanner:_indexInstance(instance, now)
	if not Shared_Safe.IsAlive(instance) then
		return 0
	end
	local instanceName = Shared_Safe.GetName(instance)
	if instanceName == nil or self:_isIgnored(instanceName) then
		return 0
	end
	local ids = Client_Matcher.MatchList(self.matcher, instanceName)
	if #ids == 0 then
		return 0
	end
	local added = 0
	for _, entityId in ipairs(ids) do
		if self:_addMatch(entityId, instance, instanceName, now) then
			added = added + 1
		end
	end
	if added > 0 then
		self.instanceIds[instance] = ids
		self.stats.indexedInstances = self.stats.indexedInstances + 1
	end
	return added
end

-- Gỡ một instance khỏi mọi mục (khi nó bị xoá khỏi Workspace).
function Scanner:_unindexInstance(instance)
	local ids = self.instanceIds[instance]
	if ids == nil then
		return 0
	end
	local removed = 0
	for _, entityId in ipairs(ids) do
		local bucket = self.matches[entityId]
		if bucket ~= nil then
			for index = #bucket, 1, -1 do
				if bucket[index].instance == instance then
					table.remove(bucket, index)
					removed = removed + 1
				end
			end
		end
	end
	self.instanceIds[instance] = nil
	return removed
end

--[[
	Gắn vào gốc quét (thường là Workspace). Trả về (ok, message).
	Thiếu signal DescendantAdded không phải lỗi chí mạng: hệ thống vẫn chạy
	bằng quét đầy đủ theo chu kỳ, chỉ kém nhạy hơn — và điều đó được ghi log.
]]
function Scanner:Attach(root)
	if root == nil then
		return false, "Không có gốc để gắn (Workspace = nil)."
	end
	if self.attachedRoot == root then
		return true, "Đã gắn sẵn vào gốc này."
	end
	self:Detach()

	local addedSignal = Shared_Safe.Read(root, "DescendantAdded")
	local connection, err = Shared_Safe.Connect(addedSignal, function(instance)
		self.stats.addedSeen = self.stats.addedSeen + 1
		self.pendingAdded[#self.pendingAdded + 1] = instance
	end, "Scanner.DescendantAdded")
	if connection ~= nil then
		self.connections[#self.connections + 1] = connection
	end

	local removingSignal = Shared_Safe.Read(root, "DescendantRemoving")
	local removeConnection = Shared_Safe.Connect(removingSignal, function(instance)
		self.stats.removedSeen = self.stats.removedSeen + 1
		self.pendingRemoved[#self.pendingRemoved + 1] = instance
	end, "Scanner.DescendantRemoving")
	if removeConnection ~= nil then
		self.connections[#self.connections + 1] = removeConnection
	end

	self.attachedRoot = root
	self.fullScanRequested = true

	if connection == nil then
		return false, ("Không nối được DescendantAdded (%s); chỉ dùng quét theo chu kỳ."):format(tostring(err))
	end
	return true, "Đã gắn sự kiện DescendantAdded/Removing."
end

function Scanner:Detach()
	for _, connection in ipairs(self.connections) do
		Shared_Safe.Disconnect(connection)
	end
	self.connections = {}
	self.attachedRoot = nil
end

-- Yêu cầu quét đầy đủ ở nhịp kế tiếp (nút "Làm mới" gọi hàm này).
function Scanner:RequestFullScan()
	self.fullScanRequested = true
	return true
end

function Scanner:_shouldStartFullScan(now)
	if not self.fullScanRequested then
		return false
	end
	local interval = (self.config and self.config.Scan and self.config.Scan.fullScanIntervalSeconds) or 2.5
	if self.lastFullScanAt ~= nil and (now - self.lastFullScanAt) < interval then
		-- Chưa tới lúc: giữ yêu cầu lại, không huỷ.
		return false
	end
	return true
end

-- Chụp danh sách descendant một lần (một lời gọi engine, không lặp lại).
function Scanner:_snapshotDescendants(root)
	local ok, descendants = pcall(function()
		return root:GetDescendants()
	end)
	if not ok or type(descendants) ~= "table" then
		self.stats.errors = self.stats.errors + 1
		return nil
	end
	return descendants
end

--[[
	MỘT NHỊP LÀM VIỆC. Trả về báo cáo để Tracker/UI hiển thị trung thực:
	  { processed, queued, truncated, scanComplete, scannedTotal }
]]
function Scanner:Update(now)
	local scanConfig = (self.config and self.config.Scan) or {}
	local budget = scanConfig.descendantsPerStep or 1200
	local report = { processed = 0, queued = 0, truncated = self.truncated, scanComplete = false, scannedTotal = 0 }
	now = now or os.clock()

	-- Người dùng tắt quét: trả báo cáo rỗng, không làm gì thêm.
	if scanConfig.enabled == false then
		return report
	end

	-- 1) Instance bị xoá: xử lý hết vì mỗi lần gỡ rất rẻ.
	for index = #self.pendingRemoved, 1, -1 do
		local instance = self.pendingRemoved[index]
		self.pendingRemoved[index] = nil
		self:_unindexInstance(instance)
	end

	-- 2) Instance mới: xử lý theo ngân sách.
	-- Dùng con trỏ thay vì table.remove(.., 1) vì cách đó dịch cả mảng (O(n)).
	-- KHÔNG gán nil khi tiêu phần tử: mảng có lỗ hổng sẽ làm '#' trả về
	-- biên không xác định. Ta chỉ dời con trỏ, rồi nén mảng khi cần.
	local processedQueue = 0
	local queueLength = #self.pendingAdded
	while self.pendingAddedCursor <= queueLength and processedQueue < budget do
		local instance = self.pendingAdded[self.pendingAddedCursor]
		processedQueue = processedQueue + 1
		self:_indexInstance(instance, now)
		self.pendingAddedCursor = self.pendingAddedCursor + 1
	end
	if self.pendingAddedCursor > queueLength then
		-- Tiêu hết hàng đợi: trả lại bảng rỗng.
		self.pendingAdded = {}
		self.pendingAddedCursor = 1
	elseif self.pendingAddedCursor > 32 then
		-- Còn tồn nhiều: dồn về đầu mảng để mảng không phình vô hạn.
		local remaining = {}
		for index = self.pendingAddedCursor, queueLength do
			remaining[#remaining + 1] = self.pendingAdded[index]
		end
		self.pendingAdded = remaining
		self.pendingAddedCursor = 1
	end
	report.queued = processedQueue

	-- 3) Quét đầy đủ (có nhịp, có trần).
	local root = self.attachedRoot
	if root == nil then
		return report
	end

	if self.descendants == nil and self:_shouldStartFullScan(now) then
		local snapshot = self:_snapshotDescendants(root)
		if snapshot == nil then
			return report
		end
		local limit = scanConfig.maxDescendantsPerFullScan or 20000
		self.descendants = snapshot
		self.cursor = 1
		self.truncated = #snapshot > limit
		self.fullScanRequested = false
		self.lastFullScanAt = now
		self.stats.fullScans = self.stats.fullScans + 1
		if self.truncated then
			Shared_Log.Warn(("Quét đầy đủ bị cắt: Workspace có %d descendant, trần cho phép %d. Kết quả có thể thiếu.")
				:format(#snapshot, limit))
		end
	end

	-- Snapshot được giữ NGUYÊN VẸN tới khi quét xong (không gán nil từng
	-- phần tử) vì '#' trên mảng có lỗ hổng là không xác định. Chi phí là
	-- một mảng tham chiếu tạm, đổi lại việc quét không bao giờ bỏ sót.
	if self.descendants ~= nil then
		local limit = scanConfig.maxDescendantsPerFullScan or 20000
		local total = math.min(#self.descendants, limit)
		local processed = 0
		local startedAt = os.clock()
		while self.cursor <= total and processed < budget do
			local instance = self.descendants[self.cursor]
			self.cursor = self.cursor + 1
			processed = processed + 1
			if instance ~= nil then
				self:_indexInstance(instance, now)
			end
		end
		report.processed = processed
		report.scannedTotal = self.cursor - 1
		self.stats.descendantsSeenTotal = self.stats.descendantsSeenTotal + processed
		self.lastFullScanDuration = os.clock() - startedAt
		if self.cursor > total then
			self.descendants = nil
			self.cursor = 1
			report.scanComplete = true
			report.truncated = self.truncated
		end
	end

	return report
end

-- Dọn các instance đã chết còn sót trong kết quả (gọi theo chu kỳ chậm).
function Scanner:Prune()
	local pruned = 0
	for entityId, bucket in pairs(self.matches) do
		for index = #bucket, 1, -1 do
			if not Shared_Safe.IsAlive(bucket[index].instance) then
				table.remove(bucket, index)
				pruned = pruned + 1
			end
		end
		if #bucket == 0 then
			self.matches[entityId] = nil
		end
	end
	return pruned
end

--[[
	Danh sách ứng viên của một mục. Trả về bảng (có thể rỗng).
	Instance chết bị loại ngay tại đây để Tracker không đọc phải rác.
]]
function Scanner:GetCandidates(entityId)
	local bucket = self.matches[entityId]
	if bucket == nil then
		return {}
	end
	local alive = {}
	for index = #bucket, 1, -1 do
		if Shared_Safe.IsAlive(bucket[index].instance) then
			alive[#alive + 1] = bucket[index]
		else
			table.remove(bucket, index)
		end
	end
	-- Trả về theo thứ ổn định: instance thấy trước đứng trước.
	table.sort(alive, function(a, b)
		if a.firstSeenAt == b.firstSeenAt then
			return tostring(a.name) < tostring(b.name)
		end
		return a.firstSeenAt < b.firstSeenAt
	end)
	return alive
end

function Scanner:HasCandidates(entityId)
	local bucket = self.matches[entityId]
	if bucket == nil then
		return false
	end
	for _, entry in ipairs(bucket) do
		if Shared_Safe.IsAlive(entry.instance) then
			return true
		end
	end
	return false
end

--[[
	CẦU DỮ LIỆU NHÀ PHÁT TRIỂN (tuỳ chọn).
	Đọc Attribute dạng  <prefix>entity_<id> = "x,y,z"  (hoặc Vector3)
	trên folder <folderName> trong Workspace.

	Đây là đường DUY NHẤT để có dữ liệu "chắc chắn" mà không cần đoán tên
	instance — và nó chỉ tồn tại nếu BẠN tự phát dữ liệu đó.
	Trả về (positions, message); positions = { [entityId] = Vector3 }.
]]
function Scanner:ReadDeveloperBridge(root)
	local bridge = self.config and self.config.Detection and self.config.Detection.developerBridge
	local empty = {}
	if bridge == nil or bridge.enabled ~= true then
		return empty, "Cầu dữ liệu nhà phát triển đang tắt (Config.Detection.developerBridge.enabled = false)."
	end
	if root == nil then
		return empty, "Không có Workspace để tìm folder cầu nối."
	end
	local folder = root:FindFirstChild(bridge.folderName or "DER_Bridge")
	if folder == nil then
		return empty, ("Không thấy folder '%s' trong Workspace."):format(tostring(bridge.folderName))
	end
	local okAttributes, attributes = pcall(function()
		return folder:GetAttributes()
	end)
	if not okAttributes or type(attributes) ~= "table" then
		return empty, "Không đọc được Attribute của folder cầu nối (API không khả dụng?)."
	end

	local prefix = (bridge.attributePrefix or "DER_") .. "entity_"
	local positions = {}
	for attributeName, value in pairs(attributes) do
		if string.sub(attributeName, 1, #prefix) == prefix then
			local entityId = string.sub(attributeName, #prefix + 1)
			if Shared_Catalog.Get(entityId) ~= nil then
				local position = nil
				if Shared_Geometry.IsPositionVector(value) then
					position = value
				elseif type(value) == "string" then
					local numbers = {}
					for token in string.gmatch(value, "[-+0-9.eE]+") do
						numbers[#numbers + 1] = tonumber(token)
					end
					if #numbers == 3
						and Shared_Geometry.IsFiniteNumber(numbers[1])
						and Shared_Geometry.IsFiniteNumber(numbers[2])
						and Shared_Geometry.IsFiniteNumber(numbers[3]) then
						position = Vector3.new(numbers[1], numbers[2], numbers[3])
					end
				end
				if position ~= nil then
					positions[entityId] = position
				else
					Shared_Log.Warn(("Attribute '%s' không phải toạ độ hợp lệ, đã bỏ qua."):format(attributeName))
				end
			else
				Shared_Log.Warn(("Attribute '%s' trỏ tới id không có trong danh mục: %s")
					:format(attributeName, tostring(entityId)))
			end
		end
	end

	local hits = 0
	for _ in pairs(positions) do
		hits = hits + 1
	end
	self.stats.bridgeReads = self.stats.bridgeReads + 1
	self.stats.bridgeHits = self.stats.bridgeHits + hits
	return positions, ("Đọc được %d vị trí từ cầu nhà phát triển."):format(hits)
end

function Scanner:Stats()
	local matchCount = 0
	local entitiesWithMatch = 0
	for _, bucket in pairs(self.matches) do
		if #bucket > 0 then
			entitiesWithMatch = entitiesWithMatch + 1
			matchCount = matchCount + #bucket
		end
	end
	local matcherStats = Client_Matcher.Stats(self.matcher)
	return {
		matcher = matcherStats,
		entitiesWithMatch = entitiesWithMatch,
		matchCount = matchCount,
		pendingAdded = math.max(0, #self.pendingAdded - self.pendingAddedCursor + 1),
		pendingRemoved = #self.pendingRemoved,
		scanInProgress = self.descendants ~= nil,
		scanCursor = self.descendants ~= nil and self.cursor or 0,
		truncated = self.truncated,
		attached = self.attachedRoot ~= nil,
		lastFullScanAt = self.lastFullScanAt,
		lastFullScanDuration = self.lastFullScanDuration,
		counters = self.stats,
	}
end

function Scanner:Destroy()
	self:Detach()
	self:ClearMatches()
	self.matcher = nil
end

return Scanner
