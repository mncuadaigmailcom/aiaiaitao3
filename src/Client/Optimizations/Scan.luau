--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  QUERY-004, QUERY-006 
	===== RALO.METHODS:END ===== --]]

--[[
	Optimizations/Scan.luau
	Quét thế giới một cách AN TOÀN và có TRẦN (cap).

	Tại sao cần: game có thể có hàng chục nghìn instance. Quét toàn bộ trong
	một frame sẽ gây khựng hình — tức là chính script tạo ra lag. Nên:
	  * có giới hạn số instance quét (maxScan),
	  * chia nhỏ theo lô và nhường frame giữa các lô (yieldEvery),
	  * đếm chính xác những gì đã thực sự đổi.
]]

local Core_Env = __RALO_REQUIRE("Client/Core/Env")
local Util_Log = __RALO_REQUIRE("Shared/Log")

local SCOPE = "Scan"

local Scan = {}

Scan.lastStats = nil

--[[
	options = {
		filter   = function(instance) -> boolean
		onFound  = function(instance) -> boolean  (trả về true nếu đã thay đổi)
		maxScan  = số instance tối đa sẽ xét (mặc định 3000)
		yieldEvery = nhường frame sau mỗi N instance (0 = không nhường)
		root     = instance gốc (mặc định DataModel)
	}
]]
function Scan.Descendants(options: any)
	options = options or {}
	local maxScan = options.maxScan or 3000
	local yieldEvery = options.yieldEvery or 0
	local root = options.root or Core_Env.game

	local stats = { scanned = 0, matched = 0, changed = 0, truncated = false, error = nil }
	Scan.lastStats = stats

	if root == nil then
		stats.error = "không có root để quét"
		Util_Log.Warn(SCOPE, stats.error)
		return stats
	end

	local ok, descendants = pcall(function()
		return root:GetDescendants()
	end)
	if not ok then
		stats.error = "GetDescendants thất bại: " .. tostring(descendants)
		Util_Log.Warn(SCOPE, stats.error)
		return stats
	end

	local total = #descendants
	stats.totalDescendants = total
	stats.scanned = math.min(total, maxScan)
	stats.truncated = total > maxScan

	for i = 1, stats.scanned do
		local instance = descendants[i]
		local match = true
		if options.filter then
			local filterOk, filterResult = pcall(options.filter, instance)
			match = filterOk and filterResult == true
		end
		if match then
			stats.matched += 1
			if options.onFound then
				local changeOk, didChange = pcall(options.onFound, instance)
				if changeOk and didChange then
					stats.changed += 1
				end
			end
		end
		if yieldEvery > 0 and i % yieldEvery == 0 and Core_Env.task and Core_Env.task.wait then
			Core_Env.task.wait()
		end
	end

	if stats.truncated then
		Util_Log.Info(SCOPE, ("chỉ quét %d/%d instance (trần maxScan) để tránh khựng hình")
			:format(maxScan, total))
	end
	return stats
end

return Scan
