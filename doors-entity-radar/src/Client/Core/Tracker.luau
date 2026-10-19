--[[
	doors-entity-radar/src/Client/Core/Tracker.luau
	ModuleScript — đặt tại: DoorsEntityRadar.Client.Core.Tracker

	NƠI KẾT LUẬN TRẠNG THÁI. Nhận ứng viên từ Scanner + vị trí người chơi
	+ hướng camera + (tuỳ chọn) dữ liệu nhà phát triển, rồi sinh ra bản
	ghi trạng thái theo ĐÚNG luật trong Shared/Status.

	HAI VIỆC QUAN TRỌNG:
	  1. Trung thực: không có vị trí hợp lệ thì không có khoảng cách.
	     Không tìm thấy gì và mẫu tên chưa xác minh thì nói "Chưa xác minh",
	     KHÔNG nói "Không phát hiện".
	  2. Chống nhấp nháy: so chữ ký trạng thái trước/sau; chỉ tăng version
	     và báo dirty khi có thay đổi thật. UI nhờ vậy không vẽ lại vô ích.
]]

local Shared_Signal = __DER_REQUIRE("Shared/Signal")
local Shared_Status = __DER_REQUIRE("Shared/Status")
local Shared_Geometry = __DER_REQUIRE("Shared/Geometry")
local Shared_Catalog = __DER_REQUIRE("Shared/EntityCatalog")
local Client_Matcher = __DER_REQUIRE("Client/Core/Matcher")

local Tracker = {}
Tracker.__index = Tracker

function Tracker.new(config)
	local self = setmetatable({}, Tracker)
	self.config = config
	self.active = false
	self.states = {}
	self.dirty = {}
	self.version = 0
	self.changed = Shared_Signal.new()
	self.lastRefreshAt = nil
	self.lastScanReport = nil
	self.faultMessage = nil
	--[[
		TẬP "ĐANG THEO DÕI" (focus). Đây là tập CON của những mục người dùng
		đã chọn và bật theo dõi. Nó KHÔNG đổi trạng thái của mục nào: một mục
		vẫn là UNVERIFIED/NOT_FOUND như cũ. Focus chỉ dùng để:
		  * ghi một dòng nhật ký khi mục đó THẬT SỰ chuyển sang/thoát khỏi
		    "Đã phát hiện" (xem Tracker:_noteFocusChange);
		  * đánh dấu trên giao diện để người dùng biết mình đang theo dõi gì.
		Nói cách khác: theo dõi = chú ý hơn, KHÔNG PHẢI = định vị được.
	]]
	self.focus = {}
	self.alerts = {}
	self.stats = {
		refreshes = 0,
		changes = 0,
		unchanged = 0,
		uiPushes = 0,
		focusChanges = 0,
		alerts = 0,
	}
	return self
end

-- Bật/tắt. Khi tắt, mọi trạng thái thành DISABLED và xoá dữ liệu vị trí:
-- không được để vị trí cũ tiếp tục hiển thị như thể còn hiệu lực.
function Tracker:SetActive(active)
	local nextActive = active == true
	if self.active == nextActive then
		return false
	end
	self.active = nextActive
	if not nextActive then
		self.faultMessage = nil
		local now = os.clock()
		for _, entry in ipairs(Shared_Catalog.List) do
			self:_apply(entry.id, Shared_Status.MakeRecord(
				Shared_Status.Code.Disabled, entry.id, nil, nil, true), now)
		end
		self.lastRefreshAt = nil
	end
	return true
end

function Tracker:IsActive()
	return self.active
end

-- Ghi lỗi quét thật (nếu có) để mọi mục đang quét chuyển sang FAULT.
function Tracker:SetFault(message)
	self.faultMessage = message
end

function Tracker:ClearFault()
	self.faultMessage = nil
end

-- Chữ ký dùng để phát hiện thay đổi. Làm tròn khoảng cách để 0.01 stud
-- dao động không làm UI vẽ lại liên tục.
local function signatureOf(record)
	if record == nil then
		return "none"
	end
	local observation = record.observation
	if observation == nil then
		return record.code .. "|" .. tostring(record.stale)
	end
	local distanceText = "nil"
	if Shared_Geometry.IsFiniteNumber(observation.distance) then
		distanceText = ("%.1f"):format(observation.distance)
	end
	return table.concat({
		record.code,
		tostring(record.stale),
		tostring(observation.instanceName),
		distanceText,
		tostring(observation.direction),
		tostring(observation.source),
	}, "|")
end

function Tracker:_apply(entityId, record, now)
	local previous = self.states[entityId]
	local previousSignature = signatureOf(previous)
	local nextSignature = signatureOf(record)

	record.sampledAt = now
	self.states[entityId] = record

	-- Mục đang theo dõi mà đổi giữa "thấy / không thấy" thì ghi nhận để báo.
	self:_noteFocusChange(entityId, previous, record, now)

	if previousSignature ~= nextSignature then
		self.stats.changes = self.stats.changes + 1
		self.dirty[entityId] = true
		self.version = self.version + 1
		return true
	end
	self.stats.unchanged = self.stats.unchanged + 1
	return false
end

--========================== THEO DÕI (FOCUS) ==========================

function Tracker:IsFocused(entityId)
	if type(entityId) ~= "string" then
		return false
	end
	return self.focus[entityId] == true
end

-- Bật/tắt theo dõi một mục. Trả về true nếu trạng thái có đổi.
function Tracker:SetFocus(entityId, focused)
	if type(entityId) ~= "string" or Shared_Catalog.ById[entityId] == nil then
		return false
	end
	local wantFocus = focused == true
	local hasFocus = self.focus[entityId] == true
	if hasFocus == wantFocus then
		return false
	end
	if wantFocus then
		self.focus[entityId] = true
	else
		self.focus[entityId] = nil
	end
	self.focusCount = (self.focusCount or 0) + (wantFocus and 1 or -1)
	self.stats.focusChanges = self.stats.focusChanges + 1
	return true
end

function Tracker:ClearFocus()
	local removed = self.focusCount or 0
	self.focus = {}
	self.focusCount = 0
	return removed
end

function Tracker:FocusCount()
	return self.focusCount or 0
end

-- Danh sách id đang theo dõi (có sắp xếp, để UI hiển thị ổn định).
function Tracker:FocusIds()
	local list = {}
	for entityId in pairs(self.focus) do
		list[#list + 1] = entityId
	end
	table.sort(list)
	return list
end

--[[
	Ghi nhận chuyển trạng thái "thấy / không thấy" của mục đang theo dõi.
	CHỈ dựa trên record thật do _buildRecord sinh ra — không có nhánh nào bịa
	khoảng cách. Nếu không có vị trí thì alert ghi distance = nil và nhật ký
	sẽ nói "không rõ khoảng cách" thay vì in một con số.

	`Scan.interestingDistance` được dùng ở đây: mục ở quá xa thì không đáng
	để làm phiền người dùng bằng một dòng nhật ký (nhưng trạng thái trên UI
	vẫn đúng như cũ).
]]
function Tracker:_noteFocusChange(entityId, previous, record, now)
	if self.focus[entityId] ~= true then
		return
	end
	local wasDetected = previous ~= nil and previous.code == Shared_Status.Code.Detected
	local isDetected = record.code == Shared_Status.Code.Detected
	if wasDetected == isDetected then
		return
	end

	local observation = record.observation
	local distance = observation and observation.distance or nil
	local direction = observation and observation.direction or nil

	local limit = nil
	if self.config ~= nil and self.config.Scan ~= nil then
		limit = self.config.Scan.interestingDistance
	end
	if isDetected and Shared_Geometry.IsFiniteNumber(distance)
		and Shared_Geometry.IsFiniteNumber(limit) and distance > limit then
		return -- quá xa mức quan tâm: không báo, nhưng UI vẫn hiện đúng trạng thái
	end

	local entry = Shared_Catalog.Get(entityId)
	self.alerts[#self.alerts + 1] = {
		entityId = entityId,
		name = entry ~= nil and entry.name or entityId,
		detected = isDetected,
		distance = distance,
		direction = direction,
		at = now,
	}
	self.stats.alerts = self.stats.alerts + 1

	-- Không để danh sách alert phình ra nếu người dùng không đọc kịp.
	while #self.alerts > 20 do
		table.remove(self.alerts, 1)
	end
end

-- Lấy và XOÁ danh sách alert đang chờ (Radar gọi mỗi nhịp để ghi nhật ký).
function Tracker:TakeAlerts()
	local pending = self.alerts
	self.alerts = {}
	return pending
end

--======================== HẾT PHẦN THEO DÕI =========================

--[[
	Chọn ứng viên tốt nhất trong danh sách: ưu tiên ứng viên có vị trí hợp
	lệ và GẦN người chơi nhất. Trả về (entry, position, reason).
	Không có vị trí hợp lệ nào thì trả (entry, nil, reason) — vẫn báo là
	"có instance" nhưng KHÔNG bịa toạ độ.
]]
function Tracker:_pickBest(candidates, playerPosition)
	local bestEntry = nil
	local bestPosition = nil
	local bestDistance = nil
	local lastReason = nil
	-- Ứng viên đầu tiên luôn được ghi nhớ: khi KHÔNG đọc được vị trí của bất
	-- kỳ ứng viên nào, ta vẫn phải nói được "thấy instance tên gì".
	local firstCandidate = candidates[1]

	for _, candidate in ipairs(candidates) do
		local position, reason = Shared_Geometry.ReadPosition(candidate.instance)
		lastReason = reason
		if position ~= nil then
			local distance = nil
			if playerPosition ~= nil then
				distance = Shared_Geometry.Distance(playerPosition, position)
			end
			if bestPosition == nil then
				bestEntry = candidate
				bestPosition = position
				bestDistance = distance
			elseif distance ~= nil and bestDistance ~= nil and distance < bestDistance then
				bestEntry = candidate
				bestPosition = position
				bestDistance = distance
			elseif bestDistance == nil then
				bestEntry = candidate
				bestPosition = position
				bestDistance = distance
			end
		end
	end

	if bestEntry == nil then
		bestEntry = firstCandidate
	end
	return bestEntry, bestPosition, bestDistance, lastReason
end

--[[
	MỘT LẦN CẬP NHẬT TOÀN BỘ TRẠNG THÁI.
	tham số (đều có thể nil, và nil đều được xử lý tường minh):
	  now                 — mốc thời gian
	  scanner             — Client/Core/Scanner
	  playerPosition      — Vector3 của người chơi
	  lookVector,rightVector — hướng camera
	  developerPositions  — { [entityId] = Vector3 } từ cầu nhà phát triển
]]
function Tracker:Refresh(now, scanner, playerPosition, lookVector, rightVector, developerPositions)
	now = now or os.clock()
	self.stats.refreshes = self.stats.refreshes + 1
	self.lastScanReport = nil

	if not self.active then
		-- Không active thì không suy diễn gì thêm; SetActive(false) đã dọn.
		self.lastRefreshAt = now
		return self:CountByStatus()
	end

	local staleAfter = (self.config and self.config.System and self.config.System.staleAfterSeconds) or 3.0
	local matcher = nil
	if scanner ~= nil then
		matcher = scanner.matcher
	end

	for _, entry in ipairs(Shared_Catalog.List) do
		local record = self:_buildRecord(entry, scanner, matcher, playerPosition,
			lookVector, rightVector, developerPositions, now, staleAfter)
		self:_apply(entry.id, record, now)
	end

	self.lastRefreshAt = now
	return self:CountByStatus()
end

function Tracker:_buildRecord(entry, scanner, matcher, playerPosition, lookVector, rightVector,
	developerPositions, now, staleAfter)
	local code = Shared_Status.Code
	local entityId = entry.id

	-- 0) Nếu lần quét vừa rồi lỗi, nói thẳng là lỗi — không giả vờ có kết quả.
	if self.faultMessage ~= nil then
		return Shared_Status.MakeRecord(code.Fault, entityId, self.faultMessage, nil, true)
	end

	-- 1) Không hỗ trợ phát hiện (luôn kèm lý do).
	local unsupported, unsupportedReason = Client_Matcher.GetUnsupportedReason(matcher, entityId)
	if unsupported then
		return Shared_Status.MakeRecord(code.Unsupported, entityId, unsupportedReason, nil, false)
	end

	-- 2) Dữ liệu do nhà phát triển cung cấp — nguồn rõ ràng, không suy đoán.
	local developerPosition = nil
	if developerPositions ~= nil then
		-- Không viết `x and x[k] or nil`: dạng đó nuốt giá trị false.
		developerPosition = developerPositions[entityId]
	end
	if developerPosition ~= nil and Shared_Geometry.IsPositionVector(developerPosition) then
		local distance = nil
		if playerPosition ~= nil then
			distance = Shared_Geometry.Distance(playerPosition, developerPosition)
		end
		local direction = nil
		if lookVector ~= nil and playerPosition ~= nil then
			direction = Shared_Geometry.RelativeDirection(lookVector, rightVector, playerPosition, developerPosition)
		end
		local reason = "Vị trí do nhà phát triển cung cấp qua Attribute (Config.Detection.developerBridge)."
		if distance == nil then
			reason = reason .. " Không tính được khoảng cách vì thiếu vị trí người chơi."
		end
		return Shared_Status.MakeRecord(code.Detected, entityId, reason, {
			instanceName = "(dữ liệu nhà phát triển)",
			distance = distance,
			direction = direction,
			position = developerPosition,
			source = "developer",
			observedAt = now,
		}, false)
	end

	-- 3) Không có scanner (người dùng tắt quét) -> chưa xác minh, không đoán.
	if scanner == nil then
		return Shared_Status.MakeRecord(code.Unverified, entityId,
			"Chế độ quét đang tắt (Config.Scan.enabled = false): chỉ có danh mục, không có dữ liệu trực tiếp.", nil, true)
	end

	-- 4) Có ứng viên trong Workspace không?
	local candidates = scanner:GetCandidates(entityId)
	if #candidates > 0 then
		local best, position, distance, positionReason = self:_pickBest(candidates, playerPosition)
		local instanceName = nil
		if best ~= nil then
			instanceName = best.name
		end
		if position ~= nil then
			local direction = nil
			if lookVector ~= nil and playerPosition ~= nil then
				direction = Shared_Geometry.RelativeDirection(lookVector, rightVector, playerPosition, position)
			end
			local reason = ("Khớp instance '%s'. %s"):format(tostring(instanceName), tostring(positionReason))
			if distance == nil then
				reason = reason .. " Không tính được khoảng cách vì thiếu vị trí người chơi."
			elseif direction == nil then
				reason = reason .. " Không tính được hướng vì thiếu hướng camera hợp lệ."
			end
			return Shared_Status.MakeRecord(code.Detected, entityId, reason, {
				instanceName = instanceName,
				distance = distance,
				direction = direction,
				position = position,
				source = "workspace",
				observedAt = now,
				matchCount = #candidates,
			}, false)
		end
		return Shared_Status.MakeRecord(code.NoPosition, entityId,
			("Thấy instance '%s' nhưng %s"):format(tostring(instanceName), tostring(positionReason)), nil, false)
	end

	-- 5) Không thấy gì: chỉ được nói "Không phát hiện" nếu mẫu tên đã xác minh.
	if Client_Matcher.IsConfirmed(matcher, entityId) then
		local stats = scanner:Stats()
		local reason = "Đã quét xong, không có instance nào khớp mẫu đã xác minh."
		if stats.truncated then
			reason = reason .. " LƯU Ý: lần quét bị cắt ngắn theo trần, kết quả có thể thiếu."
		end
		return Shared_Status.MakeRecord(code.NotFound, entityId, reason, nil, false)
	end

	return Shared_Status.MakeRecord(code.Unverified, entityId,
		"Chưa tìm thấy instance khớp mẫu, nhưng mẫu tên chưa được xác minh nên không kết luận là không có.", nil, false)
end

function Tracker:Get(entityId)
	return self.states[entityId]
end

function Tracker:GetVersion()
	return self.version
end

-- Lấy danh sách id vừa thay đổi và XOÁ cờ dirty (UI gọi sau khi vẽ).
function Tracker:ConsumeDirty()
	local ids = {}
	for entityId in pairs(self.dirty) do
		ids[#ids + 1] = entityId
	end
	self.dirty = {}
	if #ids > 0 then
		self.stats.uiPushes = self.stats.uiPushes + 1
		self.changed:Fire(ids, self.version)
	end
	table.sort(ids)
	return ids
end

function Tracker:HasDirty()
	for _ in pairs(self.dirty) do
		return true
	end
	return false
end

-- Đếm số mục theo từng trạng thái — dùng cho dòng tóm tắt trên UI.
function Tracker:CountByStatus()
	local counts = {}
	for _, entry in ipairs(Shared_Catalog.List) do
		local record = self.states[entry.id]
		local code = record and record.code or Shared_Status.Code.Disabled
		counts[code] = (counts[code] or 0) + 1
	end
	return counts
end

--[[
	Danh sách để UI hiển thị, đã lọc và sắp xếp:
	  * theo khu vực (areaId = nil/"all" thì bỏ qua);
	  * theo chuỗi tìm kiếm (dùng chính Catalog.Search để không lệch logic);
	  * sắp theo trạng thái (quan trọng trước) rồi theo tên.
	Trả về mảng { entry, record }.
]]
function Tracker:BuildView(query, areaId)
	local entries = Shared_Catalog.Search(query, (areaId == "all" or areaId == "") and nil or areaId)
	local rows = {}
	for _, entry in ipairs(entries) do
		rows[#rows + 1] = {
			entry = entry,
			record = self.states[entry.id],
		}
	end
	table.sort(rows, function(a, b)
		local codeA = a.record and a.record.code or Shared_Status.Code.Disabled
		local codeB = b.record and b.record.code or Shared_Status.Code.Disabled
		local weightA = Shared_Status.GetSortWeight(codeA)
		local weightB = Shared_Status.GetSortWeight(codeB)
		if weightA ~= weightB then
			return weightA < weightB
		end
		-- Cùng trạng thái: cái có khoảng cách gần hơn lên trước.
		local distanceA = a.record and a.record.observation and a.record.observation.distance
		local distanceB = b.record and b.record.observation and b.record.observation.distance
		if Shared_Geometry.IsFiniteNumber(distanceA) and Shared_Geometry.IsFiniteNumber(distanceB) then
			if distanceA ~= distanceB then
				return distanceA < distanceB
			end
		elseif Shared_Geometry.IsFiniteNumber(distanceA) then
			return true
		elseif Shared_Geometry.IsFiniteNumber(distanceB) then
			return false
		end
		return string.lower(a.entry.name) < string.lower(b.entry.name)
	end)
	return rows
end

-- Tuổi của dữ liệu (giây) kể từ lần cập nhật cuối; nil nếu chưa có.
function Tracker:GetDataAge(now)
	if self.lastRefreshAt == nil then
		return nil
	end
	local age = (now or os.clock()) - self.lastRefreshAt
	if not Shared_Geometry.IsFiniteNumber(age) or age < 0 then
		return nil
	end
	return age
end

function Tracker:IsStale(now)
	local age = self:GetDataAge(now)
	if age == nil then
		return true
	end
	local limit = (self.config and self.config.System and self.config.System.staleAfterSeconds) or 3.0
	return age > limit
end

function Tracker:Stats()
	return {
		active = self.active,
		version = self.version,
		refreshes = self.stats.refreshes,
		changes = self.stats.changes,
		focused = self:FocusCount(),
		alerts = self.stats.alerts,
		pendingAlerts = #self.alerts,
		unchanged = self.stats.unchanged,
		uiPushes = self.stats.uiPushes,
		lastRefreshAt = self.lastRefreshAt,
		fault = self.faultMessage,
	}
end

function Tracker:Destroy()
	self:ClearFocus()
	self.alerts = {}
	self.changed:DisconnectAll()
	self.states = {}
	self.dirty = {}
	self.active = false
end

return Tracker
