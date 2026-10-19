--[[
	doors-entity-radar/src/Client/Core/Matcher.luau
	ModuleScript — đặt tại: DoorsEntityRadar.Client.Core.Matcher

	BỘ KHỚP TÊN. Biến danh mục + cấu hình thành cấu trúc tra cứu nhanh:
	  exact[key]    = { entityId, ... }   — khoá tên bằng nhau
	  contains      = { { key, id }, ... } — khoá tên có chứa mẫu
	  unsupported   = { [entityId] = lý do }
	  confirmed     = { [entityId] = true }

	VÌ SAO PHẢI TÁCH: khớp tên chạy với MỌI instance mới xuất hiện, nên
	nó phải là tra cứu O(1) thay vì duyệt toàn bộ mẫu. Duyệt mẫu chỉ xảy
	ra với các luật "contains" (rất ít).
]]

local Shared_Catalog = __DER_REQUIRE("Shared/EntityCatalog")

local Matcher = {}

-- Dùng đúng hàm chuẩn hoá của danh mục để hai bên không lệch nhau.
Matcher.Normalize = Shared_Catalog.NormalizeKey

--[[
	Dựng bộ khớp.
	config là Config.Detection (có thể nil khi kiểm thử -> dùng mặc định).
]]
function Matcher.Build(detectionConfig)
	detectionConfig = detectionConfig or {}
	local matcher = {
		exact = {},
		contains = {},
		unsupported = {},
		confirmed = {},
		entityIds = {},
		patternCount = 0,
		aliasCount = 0,
	}

	local extras = detectionConfig.extraPatterns or {}
	local forcedUnsupported = detectionConfig.unsupported or {}
	local confirmedEntities = detectionConfig.confirmedEntities or {}
	local confirmedPatterns = detectionConfig.confirmedPatterns or {}

	-- Tập tên đã xác minh (đã chuẩn hoá) để tra nhanh.
	local confirmedKeys = {}
	for _, rawName in ipairs(confirmedPatterns) do
		local key = Matcher.Normalize(rawName)
		if #key > 0 then
			confirmedKeys[key] = true
		end
	end
	matcher.confirmedKeys = confirmedKeys

	for _, entry in ipairs(Shared_Catalog.List) do
		-- 1) Ép "không hỗ trợ" từ cấu hình có ưu tiên cao nhất.
		local forcedReason = forcedUnsupported[entry.id]
		if forcedReason ~= nil then
			matcher.unsupported[entry.id] = tostring(forcedReason)
		elseif entry.detect.method == "unsupported" then
			matcher.unsupported[entry.id] = entry.detect.reason or "Không có cơ chế phát hiện hợp lệ."
		else
			matcher.entityIds[#matcher.entityIds + 1] = entry.id

			-- 2) Gom mẫu: mẫu của mục + mẫu của alias + mẫu người dùng thêm.
			local keys = Shared_Catalog.GetMatchKeys(entry)
			if entry.detect.aliasOf ~= nil then
				matcher.aliasCount = matcher.aliasCount + 1
			end
			for _, extra in ipairs(extras[entry.id] or {}) do
				local key = Matcher.Normalize(extra)
				if #key > 0 then
					keys[#keys + 1] = key
				end
			end

			-- 3) Nạp vào chỉ mục, bỏ trùng.
			local seen = {}
			for _, key in ipairs(keys) do
				if not seen[key] then
					seen[key] = true
					matcher.patternCount = matcher.patternCount + 1
					if entry.detect.matchMode == "contains" then
						matcher.contains[#matcher.contains + 1] = { key = key, id = entry.id }
					else
						if matcher.exact[key] == nil then
							matcher.exact[key] = {}
						end
						local bucket = matcher.exact[key]
						bucket[#bucket + 1] = entry.id
					end
					if confirmedKeys[key] then
						matcher.confirmed[entry.id] = true
					end
				end
			end

			-- 4) Xác minh trực tiếp theo id (không cần biết tên instance).
			if confirmedEntities[entry.id] == true then
				matcher.confirmed[entry.id] = true
			end
		end
	end

	table.sort(matcher.entityIds)
	return matcher
end

-- Một tên instance có khớp luật nào không? Trả về bảng id (có thể rỗng).
function Matcher.Match(matcher, instanceName)
	local hits = {}
	if matcher == nil or type(instanceName) ~= "string" then
		return hits
	end
	local key = Matcher.Normalize(instanceName)
	if #key == 0 then
		return hits
	end

	local exactHits = matcher.exact[key]
	if exactHits ~= nil then
		for _, entityId in ipairs(exactHits) do
			hits[entityId] = true
		end
	end

	-- Chỉ duyệt các luật "contains" — số lượng nhỏ và cố định.
	for _, rule in ipairs(matcher.contains) do
		if string.find(key, rule.key, 1, true) ~= nil then
			hits[rule.id] = true
		end
	end

	return hits
end

-- Trả về danh sách id (mảng) thay vì bảng băm, tiện cho vòng lặp.
function Matcher.MatchList(matcher, instanceName)
	local hits = Matcher.Match(matcher, instanceName)
	local list = {}
	for entityId in pairs(hits) do
		list[#list + 1] = entityId
	end
	table.sort(list)
	return list
end

-- Mục này có được coi là "đã xác minh mẫu tên" không?
function Matcher.IsConfirmed(matcher, entityId)
	if matcher == nil then
		return false
	end
	return matcher.confirmed[entityId] == true
end

-- Mục này có bị coi là không hỗ trợ phát hiện không? Trả về (bool, lý do).
function Matcher.GetUnsupportedReason(matcher, entityId)
	if matcher == nil then
		return false, nil
	end
	local reason = matcher.unsupported[entityId]
	if reason == nil then
		return false, nil
	end
	return true, reason
end

-- Số luật khớp — dùng cho bảng chẩn đoán và kiểm thử.
function Matcher.Stats(matcher)
	if matcher == nil then
		return { exactKeys = 0, containsRules = 0, patterns = 0, entities = 0, confirmed = 0, unsupported = 0 }
	end
	local exactKeys = 0
	for _ in pairs(matcher.exact) do
		exactKeys = exactKeys + 1
	end
	local confirmedCount = 0
	for _ in pairs(matcher.confirmed) do
		confirmedCount = confirmedCount + 1
	end
	local unsupportedCount = 0
	for _ in pairs(matcher.unsupported) do
		unsupportedCount = unsupportedCount + 1
	end
	return {
		exactKeys = exactKeys,
		containsRules = #matcher.contains,
		patterns = matcher.patternCount,
		entities = #matcher.entityIds,
		confirmed = confirmedCount,
		unsupported = unsupportedCount,
		aliases = matcher.aliasCount,
	}
end

return Matcher
