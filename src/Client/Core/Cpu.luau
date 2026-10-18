--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  ASSET-002, ASSET-004, CPU-004, CPU-005,
	  CPU-007, DATA-003, LOOP-007, START-002,
	  START-003, START-004 
	===== RALO.METHODS:END ===== --]]

--[[
	Client/Core/Cpu.luau
	===== RALO.METHODS:CPU-004, CPU-005, CPU-007, DATA-003, ASSET-002, ASSET-004,
	                    QUERY-002, START-002, START-004 =====

	Nhóm tối ưu CPU / tra cứu / khởi động. Tất cả đều là "bớt việc phải làm",
	không đụng đồ hoạ, không đụng gameplay.

	CPU-004  Hoán vị (hoist) biểu thức bất biến ra khỏi vòng lặp
	CPU-005  So sánh khoảng cách bằng bình phương, bỏ sqrt
	CPU-007  Gộp khoá chuỗi dùng lặp lại thành hằng (bớt cấp phát chuỗi)
	DATA-003 Dùng mảng + chỉ số thay cho pairs() khi cần duyệt có thứ tự
	ASSET-002 Nạp module lười (lazy) — chỉ require khi thật sự dùng
	ASSET-004 Thay chuỗi WaitForChild bằng Registry.Find có cache
	QUERY-002 Cache kết quả tra cứu đối tượng
	START-002 Nạp module lười lúc khởi động để bớt công việc đầu game
	START-004 Gộp việc khởi tạo, tránh chuỗi wait liên tiếp
]]

local Client_Env = __RALO_REQUIRE("Client/Core/Env")
local Shared_Log = __RALO_REQUIRE("Shared/Log")
local Client_Registry = __RALO_REQUIRE("Client/Core/Registry")

local SCOPE = "Cpu"

local Cpu = {}

-- CPU-007: khoá chuỗi dùng nhiều lần, định nghĩa MỘT lần ở đây
Cpu.Keys = {
	CastShadow = "CastShadow",
	Enabled = "Enabled",
	Transparency = "Transparency",
	Parent = "Parent",
	CFrame = "CFrame",
	Position = "Position",
	QualityLevel = "QualityLevel",
}

Cpu.stats = {
	distanceChecks = 0,
	sqrtAvoided = 0,
	lazyLoads = 0,
	cachedLookups = 0,
}

--[[
	CPU-005: khoảng cách BÌNH PHƯƠNG giữa hai Vector3.
	Dùng khi chỉ cần SO SÁNH khoảng cách với một ngưỡng:
		d2 > limit*limit   tương đương   d > limit
	mà không phải trả chi phí sqrt cho từng đối tượng mỗi lượt quét.
]]
function Cpu.DistanceSquared(a, b)
	Cpu.stats.distanceChecks += 1
	Cpu.stats.sqrtAvoided += 1
	if a == nil or b == nil then
		return math.huge
	end
	local dx = a.X - b.X
	local dy = a.Y - b.Y
	local dz = a.Z - b.Z
	return dx * dx + dy * dy + dz * dz
end

-- So sánh khoảng cách không cần sqrt. Trả về true nếu xa hơn limit.
function Cpu.IsFartherThan(a, b, limit)
	local limitSquared = limit * limit
	return Cpu.DistanceSquared(a, b) > limitSquared
end

--[[
	CPU-004: helper chứng minh việc hoist biểu thức bất biến.
	`expensive` chỉ được gọi MỘT lần dù `iterations` lớn đến đâu.
	Dùng thật trong các vòng quét của dự án (ngưỡng, hệ số, danh sách lớp).
]]
function Cpu.HoistedLoop(iterations, expensive, body)
	local invariant = expensive()          -- gọi đúng một lần, ngoài vòng lặp
	local expensiveCalls = 1
	for index = 1, math.max(0, math.floor(iterations or 0)) do
		body(index, invariant)
	end
	return invariant, expensiveCalls
end

--[[
	DATA-003: duyệt mảng bằng chỉ số số học.
	Nhanh hơn pairs() và cho thứ tự xác định (quan trọng khi kết quả
	cần tái lập được giữa các lần chạy).
	`visitor` trả về true để DỪNG sớm (early exit).
]]
function Cpu.ForEachIndex(array, visitor)
	if type(array) ~= "table" then
		return 0
	end
	local count = #array                     -- đọc độ dài MỘT lần (LOOP-007)
	local visited = 0
	for index = 1, count do
		visited += 1
		if visitor(array[index], index) == true then
			break
		end
	end
	return visited
end

--[[
	ASSET-002 / START-002: nạp module LƯỜI.
	Trả về một hàm; chỉ khi gọi thì require mới thật sự chạy.
	Lợi ích: thời gian khởi động ngắn hơn, module không dùng thì không tốn.
]]
function Cpu.Lazy(path)
	local loaded
	return function()
		if loaded == nil then
			Cpu.stats.lazyLoads += 1
			loaded = __RALO_REQUIRE(path)
		end
		return loaded
	end
end

--[[
	ASSET-004 / QUERY-002: tra cứu đối tượng có cache.
	Ủy quyền cho Registry.Find (cache tự vô hiệu khi đối tượng bị huỷ).
]]
function Cpu.Find(parent, name, className)
	Cpu.stats.cachedLookups += 1
	return Client_Registry.Find(parent, name, className)
end

--[[
	START-004: gộp nhiều bước khởi tạo, mỗi bước có pcall riêng,
	không wait giữa các bước (tránh chuỗi chờ nối tiếp lúc vào game).
	Trả về bảng kết quả theo tên bước.
]]
function Cpu.RunStartupSteps(steps)
	local results = {}
	for _, step in steps do
		local name = step.name or "step"
		if step.enabled == false then
			results[name] = "disabled"
		else
			local ok, err = pcall(step.run)
			results[name] = ok and "ok" or ("error: " .. tostring(err))
			if not ok then
				Shared_Log.Warn(SCOPE, ("bước khởi tạo '%s' lỗi: %s"):format(name, tostring(err)))
			end
		end
	end
	return results
end

-- Chờ tới khi một đối tượng xuất hiện, nhưng CÓ TRẦN thời gian (START-004).
-- Trả về instance hoặc nil khi hết thời gian chờ.
function Cpu.Await(parent, name, timeoutSeconds)
	local deadline = Client_Env.now() + math.max(0, tonumber(timeoutSeconds) or 5)
	while Client_Env.now() < deadline do
		local found = Client_Registry.Find(parent, name)
		if found ~= nil then
			return found
		end
		Client_Env.Wait(0.1)
	end
	Shared_Log.Warn(SCOPE, ("chờ '%s' quá %ss -> bỏ qua"):format(tostring(name), tostring(timeoutSeconds)))
	return nil
end

function Cpu.Stats()
	return {
		distanceChecks = Cpu.stats.distanceChecks,
		sqrtAvoided = Cpu.stats.sqrtAvoided,
		lazyLoads = Cpu.stats.lazyLoads,
		cachedLookups = Cpu.stats.cachedLookups,
	}
end

function Cpu.Reset()
	Cpu.stats = { distanceChecks = 0, sqrtAvoided = 0, lazyLoads = 0, cachedLookups = 0 }
end

return Cpu
