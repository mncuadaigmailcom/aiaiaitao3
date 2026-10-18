--[[
	dist/roblox-anti-lag-optimizer.luau
	TỆP SINH TỰ ĐỘNG bởi tools/build.js — ĐỪNG SỬA TAY.
	Nguồn: src/**.luau

	36 module, sinh lúc 2026-10-18T06:04:07.375Z

	CÁCH NẠP (Roblox Studio, game bạn SỞ HỮU):
	  1. StarterPlayer -> StarterPlayerScripts -> Insert Object -> LocalScript
	  2. Trong Properties, đặt LocalScript đó RunContext = Legacy
	  3. Dán TOÀN BỘ nội dung tệp này vào, rồi Play

	NẠP MODULE TĨNH — không gọi load/loadstring lúc chạy:
	  * Mỗi module được đóng gói thành factory function Luau ngay trong tệp.
	  * Không dùng executor, HTTP loader hay API ngoài Roblox.
	  * Hệ thống là LocalScript: chỉ tối ưu CLIENT trong game của bạn;
	    không thể "gắn vào game của người khác".
]]

local __RALO_REQUIRE
local __RALO_MODULES = {
	["Client/Core/Cpu"] = function()
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
end,
	["Client/Core/Cull"] = function()
--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  CULL-001, CULL-002, CULL-003, CULL-004,
	  DIST-001, DIST-002, DIST-003, DIST-004,
	  FPS-003, FX-001, FX-002, GRAPHICS-004,
	  PART-002, PART-004
	===== RALO.METHODS:END ===== --]]

--[[
	Client/Core/Cull.luau
	===== RALO.METHODS:CULL-001, CULL-002, CULL-003, CULL-004, DIST-001, DIST-002,
	                    DIST-003, DIST-004, PART-002, PART-004, FX-001, FX-002, FX-003 =====

	Culling theo khoảng cách camera: tắt bớt chi phí của đối tượng Ở XA
	và TỰ KHÔI PHỤC khi chúng lại gần.

	Nguyên nhân lag mà nó xử lý:
	  * Roblox vẫn trả chi phí cho bóng đổ (shadow map), hạt (particle),
	    Beam/Trail và cập nhật nội suy của những thứ người chơi không nhìn
	    thấy hoặc chỉ chiếm vài pixel trên màn hình.
	  * Đây là phần chi phí render lớn nhất mà LocalScript CÓ QUYỀN can thiệp.

	Ranh giới an toàn (rất quan trọng):
	  * CHỈ xử lý instance nằm trong danh sách được đăng ký, hoặc mang tag
	    CollectionService do chủ game đánh dấu. KHÔNG tự ý quét cả game.
	  * KHÔNG đụng CanCollide, Transparency của đối tượng gameplay,
	    không xoá bất cứ thứ gì.
	  * Mọi thay đổi được ghi vào Restore để hoàn tác 100%.
	  * Đối tượng gần hơn ngưỡng LUÔN được khôi phục -> không làm biến mất
	    thứ người chơi cần quan sát.
]]

local Client_Env = __RALO_REQUIRE("Client/Core/Env")
local Shared_Log = __RALO_REQUIRE("Shared/Log")
local Client_Guard = __RALO_REQUIRE("Client/Core/Guard")
local Client_Restore = __RALO_REQUIRE("Client/Core/Restore")
local Client_Scheduler = __RALO_REQUIRE("Client/Core/Scheduler")

local SCOPE = "Cull"

local Cull = {}

Cull.targets = {}            -- id -> { instance, kinds, restored }
Cull.rules = {
	shadowDistance = 300,      -- xa hơn N stud thì tắt CastShadow
	effectDistance = 250,      -- xa hơn N stud thì tắt emitter/beam/trail
	updateInterval = 0.25,     -- giây giữa hai lần quét (không phải mỗi frame)
	maxTargets = 400,          -- trần số đối tượng theo dõi
}
Cull.handle = nil
Cull.lastRun = { culled = 0, restored = 0, scanned = 0, at = 0 }

local nextId = 0

--[[
	Đăng ký một đối tượng vào danh sách culling.
	kinds = { "shadow", "effects" } (mặc định cả hai)
]]
function Cull.Add(instance, kinds)
	if not Client_Guard.Alive(instance) then
		return nil
	end
	local count = 0
	for _ in pairs(Cull.targets) do
		count += 1
	end
	if count >= Cull.rules.maxTargets then
		Shared_Log.Warn(SCOPE, ("đã đạt trần %d đối tượng theo dõi, bỏ qua"):format(Cull.rules.maxTargets))
		return nil
	end

	nextId += 1
	Cull.targets[nextId] = {
		instance = instance,
		kinds = kinds or { shadow = true, effects = true },
		shadowOff = false,
		effectsOff = {},
	}
	return nextId
end

function Cull.Remove(id)
	if Cull.targets[id] ~= nil then
		Cull.RestoreTarget(Cull.targets[id])
		Cull.targets[id] = nil
		return true
	end
	return false
end

local function cameraPosition()
	local workspace = Client_Env.GetService("Workspace")
	if workspace == nil then
		return nil
	end
	local ok, camera = Client_Guard.Run(SCOPE, function()
		return workspace.CurrentCamera
	end)
	if not ok or camera == nil then
		return nil
	end
	local okCf, cf = Client_Guard.Run(SCOPE, function()
		return camera.CFrame
	end)
	if not okCf or cf == nil then
		return nil
	end
	return cf.Position
end

-- Khoảng cách BÌNH PHƯƠNG: tránh sqrt mỗi đối tượng (CPU-005)
local function distanceSquared(a, b)
	if a == nil or b == nil then
		return math.huge
	end
	local dx = a.X - b.X
	local dy = a.Y - b.Y
	local dz = a.Z - b.Z
	return dx * dx + dy * dy + dz * dz
end

local function positionOf(instance)
	local ok, cf = Client_Guard.Run(SCOPE, function()
		return instance.CFrame
	end)
	if not ok or cf == nil then
		return nil
	end
	return cf.Position
end

-- Khôi phục một đối tượng về trạng thái trước khi bị cull.
function Cull.RestoreTarget(target)
	if target == nil then
		return false
	end
	local changed = 0

	if target.shadowOff then
		local status = Client_Guard.Change(target.instance, "CastShadow", true, {
			scope = SCOPE,
			expect = false,   -- chỉ khôi phục nếu GIÁ TRỊ VẪN do ta đặt
		})
		if status == "applied" then
			changed += 1
		end
		target.shadowOff = false
	end

	for child, wasEnabled in pairs(target.effectsOff) do
		local status = Client_Guard.Change(child, "Enabled", wasEnabled, {
			scope = SCOPE,
			expect = false,
		})
		if status == "applied" then
			changed += 1
		end
		target.effectsOff[child] = nil
	end

	Client_Restore.Forget(target.instance)
	return changed > 0
end

local effectClasses = { ParticleEmitter = true, Beam = true, Trail = true }

--[[
	Một lượt quét. Trả về bảng thống kê { culled, restored, scanned }.
	`camPos` cho phép test truyền vị trí camera giả lập.
]]
function Cull.Scan(camPos)
	local origin = camPos or cameraPosition()
	local stats = { culled = 0, restored = 0, scanned = 0, skipped = 0 }
	if origin == nil then
		stats.note = "không có CurrentCamera"
		Cull.lastRun = stats
		return stats
	end

	local shadowLimit = Cull.rules.shadowDistance * Cull.rules.shadowDistance
	local effectLimit = Cull.rules.effectDistance * Cull.rules.effectDistance

	for id, target in pairs(Cull.targets) do
		if not Client_Guard.Alive(target.instance) then
			Cull.targets[id] = nil
			stats.skipped += 1
		else
			stats.scanned += 1
			local pos = positionOf(target.instance)
			local d2 = distanceSquared(pos, origin)

			---------------- bóng đổ
			if target.kinds.shadow then
				if d2 > shadowLimit then
					if not target.shadowOff then
						local okBefore, before = Client_Guard.Run(SCOPE, function()
							return target.instance.CastShadow
						end)
						if before and before == true then
							Client_Restore.Record(target.instance, "CastShadow", true, "cull.shadow", false)
							local status = Client_Guard.Change(target.instance, "CastShadow", false, {
								scope = SCOPE, expect = true,
							})
							if status == "applied" then
								target.shadowOff = true
								stats.culled += 1
							end
						end
					end
				elseif target.shadowOff then
					Cull.RestoreTarget(target)
					stats.restored += 1
				end
			end

			---------------- hiệu ứng con
			if target.kinds.effects then
				local ok, children = Client_Guard.Run(SCOPE, function()
					return target.instance:GetChildren()
				end)
				if ok and children ~= nil then
					for _, child in children do
						if effectClasses[child.ClassName] then
							local okRead, enabled = Client_Guard.Run(SCOPE, function()
								return child.Enabled
							end)
							if d2 > effectLimit then
								if okRead and enabled == true and target.effectsOff[child] == nil then
									Client_Restore.Record(child, "Enabled", true, "cull.effects", false)
									local status = Client_Guard.Change(child, "Enabled", false, {
										scope = SCOPE, expect = true,
									})
									if status == "applied" then
										target.effectsOff[child] = true
										stats.culled += 1
									end
								end
							elseif target.effectsOff[child] ~= nil then
								local status = Client_Guard.Change(child, "Enabled", true, {
									scope = SCOPE, expect = false,
								})
								if status == "applied" then
									stats.restored += 1
								end
								target.effectsOff[child] = nil
							end
						end
					end
				end
			end
		end
	end

	stats.at = Client_Env.now()
	Cull.lastRun = stats
	return stats
end

-- Bật culling định kỳ qua Scheduler (không mở vòng lặp riêng).
function Cull.Start()
	if Cull.handle ~= nil then
		return Cull.handle
	end
	Cull.handle = Client_Scheduler.Schedule({
		name = "cull.scan",
		interval = Cull.rules.updateInterval,
		priority = -10,          -- ưu tiên thấp: nhường việc quan trọng hơn
		callback = function()
			Cull.Scan()
		end,
	})
	return Cull.handle
end

function Cull.Stop()
	if Cull.handle ~= nil then
		Cull.handle:Cancel()
		Cull.handle = nil
	end
	-- Khôi phục toàn bộ trước khi dừng
	for _, target in pairs(Cull.targets) do
		Cull.RestoreTarget(target)
	end
	return true
end

function Cull.TargetCount()
	local n = 0
	for _ in pairs(Cull.targets) do
		n += 1
	end
	return n
end

function Cull.Stats()
	return {
		targets = Cull.TargetCount(),
		lastRun = Cull.lastRun,
		rules = Cull.rules,
		running = Cull.handle ~= nil,
	}
end

function Cull.Reset()
	Cull.Stop()
	table.clear(Cull.targets)
	nextId = 0
	Cull.lastRun = { culled = 0, restored = 0, scanned = 0, at = 0 }
end

return Cull
end,
	["Client/Core/Devices"] = function()
--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  CFG-001, CFG-002, CFG-005, LOWEND-001,
	  LOWEND-002, LOWEND-003, LOWEND-004
	===== RALO.METHODS:END ===== --]]

--[[
	Client/Core/Devices.luau
	===== RALO.METHODS:LOWEND-001, LOWEND-002, LOWEND-003, LOWEND-004,
	                    CFG-001, CFG-002 =====

	Phân hạng thiết bị và chọn mức tối ưu phù hợp.

	Lý do: cùng một mức giảm đồ hoạ có thể "không đủ" trên điện thoại cũ
	nhưng lại "thừa và làm xấu hình" trên PC. Nên mặc định phải là
	NHẸ, và chỉ nâng dần khi thiết bị thật sự yếu.

	LOWEND-001  Nhận diện nền tảng (PC / mobile / console) qua UserInputService
	LOWEND-002  Chọn bậc chất lượng theo nền tảng + FPS đo được
	LOWEND-003  Giảm mật độ hạt mạnh hơn trên mobile
	LOWEND-004  Rút gọn GUI (bỏ hoạt ảnh không cần thiết) trên máy yếu
	CFG-001     Bật/tắt theo nhóm
	CFG-002     Bật/tắt từng phương pháp riêng lẻ

	GIỚI HẠI TRUNG THỰC: UserInputService không cho biết cấu hình CPU/GPU.
	Nên "hạng thiết bị" ở đây là ƯỚC LƯỢNG từ nền tảng + FPS đo được,
	không phải thông số phần cứng. Điều này được nêu rõ trong báo cáo.
]]

local Client_Env = __RALO_REQUIRE("Client/Core/Env")
local Shared_Log = __RALO_REQUIRE("Shared/Log")

local SCOPE = "Devices"

local Devices = {}

-- Bậc chất lượng: 1 = nhẹ nhất (giảm nhiều nhất), 3 = giữ gần nguyên bản
Devices.TIERS = {
	[1] = { name = "low",    qualityLevel = 3, particleScale = 0.40, animateGui = false },
	[2] = { name = "medium", qualityLevel = 5, particleScale = 0.70, animateGui = true },
	[3] = { name = "high",   qualityLevel = 7, particleScale = 1.00, animateGui = true },
}

Devices.detected = nil
Devices.tier = 3             -- MẶC ĐỊNH là bậc cao nhất = can thiệp ít nhất

-- LOWEND-001: nhận diện nền tảng. Không throw nếu service không có.
function Devices.DetectPlatform()
	if Devices.detected ~= nil then
		return Devices.detected
	end

	local info = { platform = "unknown", touch = false, gamepad = false, keyboardMouse = false }

	local userInput = Client_Env.GetService("UserInputService")
	if userInput ~= nil then
		local okTouch, touch = pcall(function()
			return userInput.TouchEnabled
		end)
		if okTouch then
			info.touch = touch == true
		end
		local okPad, pad = pcall(function()
			return userInput.GamepadEnabled
		end)
		if okPad then
			info.gamepad = pad == true
		end
		local okKm, km = pcall(function()
			return userInput.KeyboardEnabled and userInput.MouseEnabled
		end)
		if okKm then
			info.keyboardMouse = (km == true)
		end
	end

	-- UserInputService không có trên server; ở đó giữ "unknown"
	if info.touch then
		info.platform = "mobile"
	elseif info.gamepad then
		info.platform = "console"
	elseif info.keyboardMouse then
		info.platform = "pc"
	end

	Devices.detected = info
	Shared_Log.Info(SCOPE, ("nền tảng: %s (touch=%s, gamepad=%s, kb+mouse=%s)")
		:format(info.platform, tostring(info.touch), tostring(info.gamepad), tostring(info.keyboardMouse)))
	return info
end

--[[
	LOWEND-002: chọn bậc chất lượng.
	measuredFps: FPS trung bình ĐO ĐƯỢC (nếu có). Không có thì chỉ dựa nền tảng.

	QUAN TRỌNG: hàm này KHÔNG tự quyết định khi người dùng đã đặt tier
	thủ công trong Config (autoTier = false).
]]
function Devices.ChooseTier(measuredFps, options)
	options = options or {}
	local platform = Devices.DetectPlatform().platform

	local tier = 3
	if platform == "mobile" then
		tier = 1
	elseif platform == "console" then
		tier = 2
	end

	-- Chỉ hạ bậc theo FPS khi có số đo THẬT và được phép tự động
	if options.autoTier ~= false and type(measuredFps) == "number" and measuredFps > 0 then
		if measuredFps < 30 then
			tier = 1
		elseif measuredFps < 45 and tier > 2 then
			tier = 2
		end
	end

	if Devices.TIERS[tier] == nil then
		tier = 3
	end
	Devices.tier = tier
	return tier, Devices.TIERS[tier]
end

function Devices.CurrentTier()
	return Devices.tier, Devices.TIERS[Devices.tier]
end

-- LOWEND-003: hệ số giới hạn hạt theo bậc thiết bị.
function Devices.ParticleScale()
	local _, tier = Devices.CurrentTier()
	return tier.particleScale
end

-- LOWEND-004: có nên chạy hoạt ảnh GUI không.
function Devices.ShouldAnimateGui()
	local _, tier = Devices.CurrentTier()
	return tier.animateGui
end

--[[
	CFG-001 / CFG-002: kiểm tra một phương pháp có được phép chạy không.
	profile.groups[groupKey] = false  -> tắt cả nhóm
	profile.methods[methodId] = false -> tắt riêng phương pháp đó
	Mặc định: BẬT (trừ những gì Config khai báo tắt sẵn).
]]
function Devices.IsEnabled(profile, groupKey, methodId)
	if type(profile) ~= "table" then
		return true
	end
	if profile.enabled == false then
		return false
	end
	if groupKey ~= nil and type(profile.groups) == "table" and profile.groups[groupKey] == false then
		return false
	end
	if methodId ~= nil and type(profile.methods) == "table" and profile.methods[methodId] == false then
		return false
	end
	return true
end

-- Liệt kê những gì đang tắt — dùng cho báo cáo và GUI (CFG-005)
function Devices.DisabledList(profile)
	local out = { groups = {}, methods = {} }
	if type(profile) ~= "table" then
		return out
	end
	if type(profile.groups) == "table" then
		for key, value in pairs(profile.groups) do
			if value == false then
				out.groups[#out.groups + 1] = key
			end
		end
	end
	if type(profile.methods) == "table" then
		for key, value in pairs(profile.methods) do
			if value == false then
				out.methods[#out.methods + 1] = key
			end
		end
	end
	table.sort(out.groups)
	table.sort(out.methods)
	return out
end

function Devices.Reset()
	Devices.detected = nil
	Devices.tier = 3
end

return Devices
end,
	["Client/Core/Env"] = function()
--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  CPU-002
	===== RALO.METHODS:END ===== --]]

--[[
	Core/Env.luau
	Lớp thích ứng runtime. Toàn bộ dự án KHÔNG gọi thẳng `game`, `Instance`,
	`task`, `os.clock` mà luôn đi qua Env. Nhờ vậy:

	  * Trong Roblox: Env trỏ tới API Luau thật.
	  * Trong harness (fengari + mock): Env trỏ tới mock Roblox.
	  * Trong test: Env.now() và Env.task.delay là thời gian ẢO -> test
	    được logic auto-hide 30 giây mà không phải chờ 30 giây thật.

	Env KHÔNG giả lập bất kỳ kết quả hiệu năng nào. Nó chỉ cung cấp
	"đồng hồ" và "cổng vào thế giới game". Số đo luôn đến từ thế giới thật
	(roblox) hoặc từ mô hình thế giới khai báo rõ ràng (harness).
]]

local Env = {}

Env.mode = "unknown"        -- "roblox" | "harness"
Env.game = nil              -- DataModel (hoặc mock)
Env.Root = nil              -- nơi chứa source tree (dùng cho __require gốc)

-- Đồng hồ: hàm trả về giây (float). Mặc định là os.clock() — có thật trong Luau.
Env.now = os.clock

-- Bộ lập lịch: mặc định là `task` thật của Luau.
Env.task = task

--[[
	Khởi động: tự nhận diện runtime.
	options = { game = <DataModel>, task = <bảng giống task>, now = <hàm>, mode = "roblox"|"harness" }
]]
function Env.Init(options)
	options = options or {}

	Env.mode = options.mode
	if Env.mode == nil then
		-- Tự nhận diện: có DataModel + RunService thật thì là Roblox.
		local ok, runService = pcall(function()
			return game:GetService("RunService")
		end)
		Env.mode = (ok and runService ~= nil) and "roblox" or "unknown"
	end

	Env.game = options.game
	if Env.game == nil then
		local ok, g = pcall(function() return game end)
		if ok then Env.game = g end
	end

	if options.now then Env.now = options.now end
	if options.task then Env.task = options.task end

	return Env.mode, Env.game ~= nil
end

--[[
	Trả về bảng toàn cục của runtime hiện tại.

	Dự án chạy trong Roblox Studio bình thường (không executor), nên đây
	chỉ là `_G`. Tách ra thành hàm để RequireShim có một chỗ duy nhất cần
	thay đổi nếu môi trường nạp bundle khác đi.
]]
function Env.GlobalEnv(): any
	return _G
end

-- Đặt biến toàn cục (RequireShim dùng để cài __RALO_REQUIRE khi nạp bundle).
function Env.SetGlobal(name: string, value: any)
	local g = Env.GlobalEnv()
	g[name] = value
end

function Env.GetService(name: string): any
	if Env.game == nil then return nil end
	local ok, service = pcall(function()
		return Env.game:GetService(name)
	end)
	if ok then return service end
	return nil
end

-- Chờ n giây theo đồng hồ của runtime (task.wait thật trong Roblox).
function Env.Wait(seconds: number)
	if Env.task and Env.task.wait then
		return Env.task.wait(seconds)
	end
	-- Fallback (không bao giờ xảy ra trong Roblox): xoay vòng theo os.clock
	local target = Env.now() + seconds
	while Env.now() < target do end
end

-- Trì hoãn có thể huỷ; trả về handle { cancel = function() end }
function Env.Delay(seconds: number, callback: () -> ())
	if Env.task and Env.task.delay then
		local thread = Env.task.delay(seconds, callback)
		return {
			cancel = function()
				if Env.task.cancel and thread then
					pcall(Env.task.cancel, thread)
				end
			end,
			thread = thread,
		}
	end
	return { cancel = function() end }
end

return Env
end,
	["Client/Core/Guard"] = function()
--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  CFG-003, CPU-008, REC-001, REC-002,
	  REC-004
	===== RALO.METHODS:END ===== --]]

--[[
	Client/Core/Guard.luau
	===== RALO.METHODS:REC-001, REC-003, REC-004, CFG-003, CPU-008 =====

	Lớp bảo vệ: mọi tác vụ tối ưu đều đi qua đây.

	Nguyên nhân lag / hỏng hệ thống mà nó xử lý:
	  * Một property bị khoá (client không ghi được) làm throw -> nếu không
	    pcall thì TOÀN BỘ pipeline chết giữa chừng, người dùng mất luôn
	    khả năng khôi phục.
	  * Ghi giá trị mà không kiểm tra đối tượng còn sống -> lỗi tham chiếu
	    tới instance đã Destroy.
	  * Khôi phục đè lên thay đổi mới của game/người dùng.

	Cách xử lý:
	  * Run(): pcall + ghi log + đếm lỗi, không bao giờ throw ra ngoài.
	  * Alive(): kiểm tra instance còn tồn tại trước khi thao tác.
	  * Change(): chỉ ghi khi giá trị hiện tại VẪN là giá trị ta đã đặt
	    (chống ghi đè thay đổi của người khác).
]]

local Shared_Log = __RALO_REQUIRE("Shared/Log")

local SCOPE = "Guard"

local Guard = {}

Guard.stats = { calls = 0, failures = 0, skippedNil = 0, blockedStale = 0 }
Guard.errors = {}
Guard.maxErrorLog = 60

local function recordError(scope, message)
	Guard.stats.failures += 1
	table.insert(Guard.errors, { scope = scope, message = message, time = os.clock() })
	if #Guard.errors > Guard.maxErrorLog then
		table.remove(Guard.errors, 1)
	end
	Shared_Log.Warn(scope, message)
end

--[[
	Chạy một hàm trong vùng bảo vệ.
	Trả về: ok, result
	Không bao giờ throw ra ngoài.
]]
function Guard.Run(scope, fn, ...)
	Guard.stats.calls += 1
	if type(fn) ~= "function" then
		recordError(scope, "Guard.Run cần một function")
		return false, nil
	end
	local results = { pcall(fn, ...) }
	local ok = table.remove(results, 1)
	if not ok then
		-- Trả thông điệp lỗi về cho người gọi (không vứt bỏ): người gọi
		-- cần biết VÌ SAO thất bại để đưa vào báo cáo, không chỉ biết "hỏng".
		local message = tostring(results[1])
		recordError(scope, message)
		return false, message
	end
	return true, results[1]
end

--[[
	Instance còn dùng được không?

	Cách kiểm tra: thử ĐỌC một property. Nếu instance đã bị Destroy thì
	Roblox ném lỗi khi truy cập, và pcall bắt được.

	LƯU Ý: KHÔNG dùng `Parent ~= nil` làm tiêu chí "còn sống". Lý do:
	  * instance vừa tạo chưa gắn parent vẫn ghi property được bình thường;
	  * Pool.Release và Cull cố tình đặt Parent = nil nhưng đối tượng vẫn sống;
	nên nếu coi "không có parent" là "đã chết" thì hai module đó sẽ từ chối
	mọi thao tác hợp lệ. Đây là lỗi đã được test guard.test.js phát hiện.
]]
function Guard.Alive(instance)
	if instance == nil then
		Guard.stats.skippedNil += 1
		return false
	end
	local ok = pcall(function()
		return instance.ClassName
	end)
	return ok
end

--[[
	Instance còn NẰM TRONG CÂY không (Parent ~= nil)?

	Đây là câu hỏi KHÁC với Alive():
	  * Alive()  = "còn thao tác được không" (chưa bị Destroy)
	  * InTree() = "còn gắn trong cây instance không"
	Registry cần InTree() để quyết định cache tra cứu còn giá trị không:
	một instance đã bị gỡ khỏi cây thì FindFirstChild sẽ không còn trả về nó,
	nên cache phải bị vô hiệu dù bản thân instance vẫn chưa bị Destroy.
]]
function Guard.InTree(instance)
	if not Guard.Alive(instance) then
		return false
	end
	local ok, parent = pcall(function()
		return instance.Parent
	end)
	return ok and parent ~= nil
end

--[[
	Chỉ ghi property khi giá trị hiện tại vẫn đúng như kỳ vọng.
	Đây là chốt chống "khôi phục đè lên thay đổi mới của game/người dùng".

	opts = { scope, expect = <giá trị phải đang có> }
	Trả về: "applied" | "unchanged" | "stale" | "failed"
]]
function Guard.Change(instance, property, newValue, opts)
	opts = opts or {}
	local scope = opts.scope or SCOPE
	if not Guard.Alive(instance) then
		Guard.stats.skippedNil += 1
		return "failed", "instance không còn tồn tại"
	end

	local okRead, current = pcall(function()
		return instance[property]
	end)
	if not okRead then
		recordError(scope, ("không đọc được %s.%s"):format(tostring(instance), property))
		return "failed", "không đọc được property"
	end

	if opts.expect ~= nil and current ~= opts.expect then
		-- Giá trị đã bị ai đó đổi -> KHÔNG ghi đè.
		Guard.stats.blockedStale += 1
		return "stale", ("giá trị hiện tại là %s, khác giá trị script đã đặt (%s)")
			:format(tostring(current), tostring(opts.expect))
	end

	if current == newValue then
		return "unchanged", "giá trị đã đúng sẵn"
	end

	local okWrite, err = pcall(function()
		instance[property] = newValue
	end)
	if not okWrite then
		recordError(scope, ("không ghi được %s.%s: %s")
			:format(tostring(instance), property, tostring(err)))
		return "failed", tostring(err)
	end

	-- Xác nhận đã ăn (một số property bị engine ghi đè ngay)
	local okVerify, after = pcall(function()
		return instance[property]
	end)
	if okVerify and after ~= newValue then
		recordError(scope, ("ghi %s.%s = %s nhưng đọc lại %s")
			:format(tostring(instance), property, tostring(newValue), tostring(after)))
		return "failed", "ghi không có tác dụng"
	end

	return "applied", "ok"
end

--[[
	Kiểm tra bảng cấu hình: sai kiểu thì báo rõ và dùng giá trị mặc định,
	thay vì để giá trị sai lan xuống từng module (CFG-003).
	Trả về: bảng đã chuẩn hoá, danh sách cảnh báo.
]]
function Guard.NormalizeConfig(profile, defaults)
	local warnings = {}
	local out = {}

	-- Kiểm tra MỘT cặp giá trị: sai kiểu thì báo và dùng mặc định.
	local function checkValue(path, value, defaultValue)
		if value == nil then
			return defaultValue, nil
		end
		-- `nil` trong Luau không phân biệt được với "không có"; số nguyên và
		-- số thực đều là "number" nên so bằng type() là đủ.
		if type(value) ~= type(defaultValue) then
			local warning = ("%s: kỳ vọng %s, nhận %s -> dùng mặc định %s")
				:format(path, type(defaultValue), type(value), tostring(defaultValue))
			return defaultValue, warning
		end
		return value, nil
	end

	-- Duyệt defaults. Khoá cấp cao có thể là BẢNG (một section) hoặc
	-- VÔ HƯỚNG (ví dụ `enabled = true`, `mode = "light"`). Phải xử lý cả hai:
	-- giả định mọi thứ là bảng sẽ sập ngay trên Config.PROFILE thật.
	-- Helper đọc khoá mà KHÔNG biến `false` thành `nil`.
	-- (`profile[k] or nil` là bẫy: enabled = false sẽ bị coi là "thiếu"
	--  và rơi về mặc định true, làm hỏng công tắc tắt tổng.)
	local function readKey(source, key)
		if type(source) ~= "table" then
			return nil
		end
		return source[key]
	end

	for key, defaultValue in pairs(defaults) do
		local given = readKey(profile, key)

		if type(defaultValue) == "table" then
			out[key] = {}
			for subKey, subDefault in pairs(defaultValue) do
				local subGiven = readKey(given, subKey)
				local normalized, warning = checkValue(
					("%s.%s"):format(key, subKey), subGiven, subDefault)
				out[key][subKey] = normalized
				if warning ~= nil then
					warnings[#warnings + 1] = warning
				end
			end
			-- Giữ khoá người dùng tự thêm trong section
			if type(given) == "table" then
				for subKey, subValue in pairs(given) do
					if out[key][subKey] == nil then
						out[key][subKey] = subValue
					end
				end
			end
		else
			local normalized, warning = checkValue(tostring(key), given, defaultValue)
			out[key] = normalized
			if warning ~= nil then
				warnings[#warnings + 1] = warning
			end
		end
	end

	-- Giữ lại section không có trong defaults (người dùng tự thêm)
	if type(profile) == "table" then
		for key, values in pairs(profile) do
			if out[key] == nil then
				out[key] = values
			end
		end
	end

	for _, warning in ipairs(warnings) do
		Shared_Log.Warn(SCOPE, warning)
	end
	return out, warnings
end

function Guard.Stats()
	return {
		calls = Guard.stats.calls,
		failures = Guard.stats.failures,
		skippedNil = Guard.stats.skippedNil,
		blockedStale = Guard.stats.blockedStale,
		loggedErrors = #Guard.errors,
	}
end

function Guard.Reset()
	table.clear(Guard.stats)
	Guard.stats = { calls = 0, failures = 0, skippedNil = 0, blockedStale = 0 }
	table.clear(Guard.errors)
end

return Guard
end,
	["Client/Core/Measure"] = function()
--[[
	Core/Measure.luau
	LẤY MẪU HIỆU NĂNG THẬT. Không có con số nào trong tệp này được sinh ra
	từ không khí:

	  * frame time  = delta thật giữa hai lần RenderStepped (hoặc Heartbeat).
	  * fps         = 1 / frame time, suy ra từ số đo, không phải giá trị gán.
	  * gcHeapKb    = collectgarbage("count") — heap Luau do runtime báo cáo.
	  * fpsCrossCheck = Stats.Workspace.FramesPerSecond (nếu runtime cho đọc);
	                    chỉ dùng để ĐỐI CHIẾU, và được ghi rõ trong meta.

	Nếu runtime không có RenderStepped, Run() trả về meta.source = "none"
	và samples = 0 — tuyệt đối không bịa số.
]]

local Core_Env = __RALO_REQUIRE("Client/Core/Env")
local Core_Perf = __RALO_REQUIRE("Client/Core/Perf")
local Util_Log = __RALO_REQUIRE("Shared/Log")

local SCOPE = "Measure"

local Measure = {}

Measure.live = nil          -- Perf buffer đang nhận mẫu (để UI đọc tức thời)
Measure.last = nil          -- bảng kết quả lần đo gần nhất

--[[
	Đọc chỉ số tức thời một lần. Luôn an toàn, không throw.
]]
function Measure.Instant()
	local runService = Core_Env.GetService("RunService")

	local frameTimeMs, frameOk = 0, false
	if runService ~= nil then
		local ok, value = pcall(function() return runService:GetRenderStepTime() end)
		if ok and type(value) == "number" and value == value then
			frameTimeMs = value * 1000
			frameOk = true
		end
	end

	local gcKb, gcOk = 0, false
	if collectgarbage ~= nil then
		local ok2, value2 = pcall(collectgarbage, "count")
		if ok2 and type(value2) == "number" then
			gcKb = value2
			gcOk = true
		end
	end

	local statsFps, statsOk = Measure.ReadStatsFps()

	return {
		frameTimeMs = frameTimeMs,
		frameTimeAvailable = frameOk,
		fps = frameOk and frameTimeMs > 0 and (1000 / frameTimeMs) or 0,
		gcHeapKb = gcKb,
		gcAvailable = gcOk,
		statsFps = statsFps,
		statsAvailable = statsOk,
		time = Core_Env.now(),
	}
end

--[[
	Đọc FPS do engine báo cáo, nếu có. Roblox khóa service `Stats` ở nhiều
	ngữ cảnh nên hàm này luôn pcall và trả về nil khi không đọc được.
]]
function Measure.ReadStatsFps(): (number?, boolean)
	local stats = Core_Env.GetService("Stats")
	if stats == nil then return nil, false end
	local ok, workspaceStats = pcall(function() return stats.Workspace end)
	if not ok or workspaceStats == nil then return nil, false end
	local ok2, fps = pcall(function() return workspaceStats.FramesPerSecond end)
	if not ok2 or type(fps) ~= "number" then return nil, false end
	return fps, true
end

--[[
	Đếm "đối tượng đang được render" — chỉ số ngữ cảnh, KHÔNG phải chỉ số
	chất lượng. Dùng để giải thích vì sao kết quả giữa hai lần đo khác nhau.
]]
function Measure.WorldStats()
	local game = Core_Env.game
	if game == nil then return { scanned = 0, note = "no DataModel" } end

	local scanned, parts, shadowCasters, emitters, characters = 0, 0, 0, 0, 0
	local ok, err = pcall(function()
		-- Gán ra biến local trước khi lặp: vừa dễ đọc, vừa tránh một khác biệt
		-- của máy ảo Lua khi method được phân giải qua __index ngay trong
		-- biểu thức for-in (harness fengari báo lỗi ở dạng viết inline).
		local descendants = game:GetDescendants()
		scanned = #descendants
		for _, instance in descendants do
			local className = instance.ClassName
			if className == "Part" or className == "MeshPart" or className == "UnionOperation" then
				parts += 1
				local okCast, cast = pcall(function() return instance.CastShadow end)
				if okCast and cast then shadowCasters += 1 end
			elseif className == "ParticleEmitter" then
				emitters += 1
			elseif className == "Model" then
				local okHum = pcall(function() return instance:FindFirstChildOfClass("Humanoid") end)
				if okHum then characters += 1 end
			end
		end
	end)

	if not ok then
		Util_Log.Warn(SCOPE, "không quét được thế giới:", tostring(err))
		return { scanned = scanned, note = "partial", error = tostring(err) }
	end

	return {
		scanned = scanned,
		parts = parts,
		shadowCasters = shadowCasters,
		particleEmitters = emitters,
		characters = characters,
	}
end

--[[
	Đo trong `durationSeconds` giây.
	options = {
		label       = "baseline" | "after",
		window      = kích thước ring buffer (mặc định 180),
		onSample    = function(instant, index) — hook cho UI
	}
]]
function Measure.Run(durationSeconds: number, options: any)
	options = options or {}
	local duration = math.max(0.1, durationSeconds or 1.0)
	local runService = Core_Env.GetService("RunService")

	local perf = Core_Perf.New(options.window or 180)
	Measure.live = perf

	local startedAt = Core_Env.now()
	local meta = {
		label = options.label or "sample",
		duration = duration,
		source = "none",
		samples = 0,
		statsCrossCheck = nil,
		note = nil,
	}

	local connection = nil
	if runService ~= nil and runService.RenderStepped ~= nil then
		meta.source = "RenderStepped"
		connection = runService.RenderStepped:Connect(function(deltaTime: number)
			if deltaTime ~= nil and deltaTime > 0 then
				perf:Push(deltaTime * 1000)
				meta.samples += 1
				if options.onSample then
					options.onSample(Measure.Instant(), meta.samples)
				end
			end
		end)
	elseif runService ~= nil and runService.Heartbeat ~= nil then
		meta.source = "Heartbeat (fallback)"
		connection = runService.Heartbeat:Connect(function(deltaTime: number)
			if deltaTime ~= nil and deltaTime > 0 then
				perf:Push(deltaTime * 1000)
				meta.samples += 1
			end
		end)
	else
		meta.note = "runtime không có RenderStepped/Heartbeat -> không có số đo khung hình"
		Util_Log.Warn(SCOPE, meta.note)
	end

	-- Chờ đủ thời lượng bằng đồng hồ của runtime (task.wait thật trong Roblox)
	Core_Env.Wait(duration)

	if connection ~= nil then
		connection:Disconnect()
	end

	local endedAt = Core_Env.now()
	meta.elapsed = endedAt - startedAt

	local summary = perf:Summarize("ms")
	local gcKb, gcOk = 0, false
	if collectgarbage ~= nil then
		local ok, value = pcall(collectgarbage, "count")
		if ok and type(value) == "number" then gcKb, gcOk = value, true end
	end

	local statsFps, statsOk = Measure.ReadStatsFps()
	if statsOk then
		meta.statsCrossCheck = statsFps
	end
	if meta.source ~= "none" and meta.samples == 0 then
		meta.note = "có kết nối signal nhưng không nhận được mẫu nào"
	end

	local result = {
		meta = meta,
		frame = summary,
		fps = {
			mean = summary.fps_mean or 0,
			p1   = summary.fps_p1 or 0,
			p5   = summary.fps_p5 or 0,
			p50  = summary.fps_p50 or 0,
			min  = summary.fps_min or 0,
		},
		frameTimeMs = {
			mean = summary.mean,
			p95  = summary.p95,
			max  = summary.max,
		},
		gcHeapKb = gcKb,
		gcAvailable = gcOk,
		statsFps = statsFps,
		statsAvailable = statsOk,
		world = Measure.WorldStats(),
		time = endedAt,
	}

	Measure.last = result
	Util_Log.Info(SCOPE, ("đo '%s' xong: %d mẫu trong %.2fs (nguồn: %s)")
		:format(meta.label, meta.samples, meta.elapsed, meta.source))
	return result
end

--[[
	So sánh hai lần đo. CHỈ tính toán từ số liệu thật đã truyền vào.
	Nếu một bên không có mẫu, trả về valid = false và nêu lý do — không suy diễn.
]]
function Measure.Compare(before: any, after: any)
	local out = {
		valid = true,
		reason = nil,
		rows = {},
	}

	if before == nil or after == nil then
		out.valid = false
		out.reason = "thiếu dữ liệu before/after"
		return out
	end
	if (before.meta and before.meta.samples or 0) == 0
		or (after.meta and after.meta.samples or 0) == 0 then
		out.valid = false
		out.reason = "một trong hai lần đo có 0 mẫu khung hình -> không kết luận được"
		return out
	end

	local function deltaRow(label, beforeValue, afterValue, formatter, betterWhenLower)
		local diff = afterValue - beforeValue
		local pct = beforeValue ~= 0 and (diff / beforeValue) * 100 or 0
		local better = betterWhenLower and diff < 0 or (not betterWhenLower and diff > 0)
		local worse = betterWhenLower and diff > 0 or (not betterWhenLower and diff < 0)
		out.rows[#out.rows + 1] = {
			label = label,
			before = formatter(beforeValue),
			after = formatter(afterValue),
			delta = ("%+.1f%%"):format(pct),
			better = better,
			worse = worse,
			rawBefore = beforeValue,
			rawAfter = afterValue,
			pct = pct,
		}
	end

	local function f1(v: number) return ("%.1f"):format(v) end
	local function f0(v: number) return ("%.0f"):format(v) end

	deltaRow("FPS trung bình", before.fps.mean, after.fps.mean, f1, false)
	deltaRow("FPS p1 (tệ nhất)", before.fps.p1, after.fps.p1, f1, false)
	deltaRow("FPS p5", before.fps.p5, after.fps.p5, f1, false)
	deltaRow("Frame time TB (ms)", before.frameTimeMs.mean, after.frameTimeMs.mean, f1, true)
	deltaRow("Frame time p95 (ms)", before.frameTimeMs.p95, after.frameTimeMs.p95, f1, true)

	if before.gcAvailable and after.gcAvailable then
		deltaRow("Luau heap (MB)", before.gcHeapKb / 1024, after.gcHeapKb / 1024, f1, true)
	end

	out.summary = {}
	local improved, regressed, unchanged = 0, 0, 0
	for _, row in out.rows do
		if row.better then
			improved += 1
		elseif row.worse then
			regressed += 1
		else
			unchanged += 1
		end
	end
	out.summary.improved = improved
	out.summary.regressed = regressed
	out.summary.unchanged = unchanged
	if improved > 0 and regressed == 0 then
		out.summary.verdict = "improved"
	elseif regressed > 0 and improved == 0 then
		out.summary.verdict = "regressed"
	elseif improved > 0 and regressed > 0 then
		out.summary.verdict = "mixed"
	else
		out.summary.verdict = "unchanged"
	end

	out.summary.baselineSamples = before.meta.samples
	out.summary.afterSamples = after.meta.samples
	out.summary.durationBefore = before.meta.duration
	out.summary.durationAfter = after.meta.duration

	return out
end

-- Bản in ra Output (dùng khi không có UI hoặc muốn log đầy đủ).
function Measure.FormatComparison(comparison: any): { string }
	local rows = { { "Chỉ số", "Trước", "Sau", "Thay đổi" } }
	for _, row in comparison.rows do
		rows[#rows + 1] = { row.label, row.before, row.after, row.delta }
	end
	local lines = Util_Log.FormatRows(rows)
	table.insert(lines, 1, ("Kết luận: %s (cải thiện %d, suy giảm %d, không đổi %d / %d chỉ số)")
		:format(comparison.summary.verdict, comparison.summary.improved, comparison.summary.regressed,
			comparison.summary.unchanged, #comparison.rows))
	table.insert(lines, 2, ("Số mẫu: trước=%d (%.1fs) sau=%d (%.1fs)")
		:format(comparison.summary.baselineSamples, comparison.summary.durationBefore,
			comparison.summary.afterSamples, comparison.summary.durationAfter))
	return lines
end

return Measure
end,
	["Client/Core/Net"] = function()
--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  NET-001, NET-002, NET-003, NET-007
	===== RALO.METHODS:END ===== --]]

--[[
	Client/Core/Net.luau
	===== RALO.METHODS:NET-001, NET-002, NET-003 =====

	Tiết chế lưu lượng mạng PHÍA CLIENT.

	SỰ THẬT KỸ THUẬT (nêu rõ để không nói quá):
	  * Một LocalScript KHÔNG thể tự throttle băng thông của chính nó,
	    không thể giảm tần suất replicate của server, và không thể đổi
	    NetworkOwner (SetNetworkOwner là API phía server).
	  * Cái LocalScript LÀM ĐƯỢC và tệp này làm thật:
	      - gộp nhiều thông điệp thành một (batching),
	      - chặn gửi trùng/thưa trong cửa sổ thời gian (throttling),
	      - chỉ gửi dữ liệu khác lần trước (delta).
	    Cả ba đều giảm số lần FireServer, tức giảm thật số gói tin
	    mà client này sinh ra.

	Không có RemoteEvent "trang trí": Net chỉ hoạt động khi người dùng
	thật sự truyền remote của game vào. Nếu không truyền, nó báo rõ
	"không có remote để tối ưu" và trả về 0 thay đổi.
]]

local Client_Env = __RALO_REQUIRE("Client/Core/Env")
local Shared_Log = __RALO_REQUIRE("Shared/Log")
local Client_Scheduler = __RALO_REQUIRE("Client/Core/Scheduler")

local SCOPE = "Net"

local Net = {}

Net.channels = {}          -- name -> { remote, minInterval, queue, lastSent, lastPayload }
Net.handle = nil
Net.stats = { queued = 0, sent = 0, suppressed = 0, batched = 0, noRemote = 0 }

--[[
	Đăng ký một kênh gửi.
	spec = {
		remote      = RemoteEvent của game,
		minInterval = giây tối thiểu giữa hai lần gửi (mặc định 0.25),
		batch       = true -> gộp nhiều payload thành một mảng
	}
]]
function Net.Register(name, spec)
	if type(name) ~= "string" or type(spec) ~= "table" then
		Shared_Log.Warn(SCOPE, "Register cần tên chuỗi và spec bảng")
		return nil
	end
	if spec.remote == nil then
		Shared_Log.Warn(SCOPE, ("kênh '%s' không có remote -> sẽ không gửi gì"):format(name))
	end

	Net.channels[name] = {
		remote = spec.remote,
		minInterval = math.max(0, tonumber(spec.minInterval) or 0.25),
		batch = spec.batch == true,
		queue = {},
		lastSent = -math.huge,
		lastPayload = nil,
	}
	return Net.channels[name]
end

-- So sánh nông hai payload: dùng để bỏ qua dữ liệu giống hệt lần trước.
local function shallowEqual(a, b)
	if a == b then
		return true
	end
	if type(a) ~= "table" or type(b) ~= "table" then
		return false
	end
	for key, value in pairs(a) do
		if b[key] ~= value then
			return false
		end
	end
	for key in pairs(b) do
		if a[key] == nil then
			return false
		end
	end
	return true
end

--[[
	Đưa dữ liệu vào hàng đợi. KHÔNG gửi ngay.
	Trả về: "queued" | "suppressed-duplicate" | "no-channel"
]]
function Net.Send(name, payload)
	local channel = Net.channels[name]
	if channel == nil then
		Net.stats.noRemote += 1
		return "no-channel"
	end

	-- NET-003: bỏ qua nếu giống hệt lần gửi trước
	if shallowEqual(channel.lastPayload, payload) then
		Net.stats.suppressed += 1
		return "suppressed-duplicate"
	end

	table.insert(channel.queue, payload)
	Net.stats.queued += 1
	Net.Start()
	return "queued"
end

-- Một lượt xả hàng đợi. `nowSeconds` cho phép test bơm thời gian ảo.
function Net.Flush(nowSeconds)
	local now = nowSeconds or Client_Env.now()
	local sent = 0

	for name, channel in pairs(Net.channels) do
		if #channel.queue > 0 then
			if channel.remote == nil then
				-- Không có remote: bỏ hàng đợi để không phình bộ nhớ, và báo rõ
				Net.stats.noRemote += #channel.queue
				table.clear(channel.queue)
			elseif now - channel.lastSent >= channel.minInterval then
				local payload
				if channel.batch and #channel.queue > 1 then
					payload = { channel.queue }          -- NET-002: một gói cho nhiều thông điệp
					Net.stats.batched += #channel.queue - 1
					table.clear(channel.queue)
				else
					payload = table.remove(channel.queue, 1)
				end

				local ok, err = pcall(function()
					channel.remote:FireServer(payload)
				end)
				if ok then
					channel.lastSent = now
					channel.lastPayload = payload
					Net.stats.sent += 1
					sent += 1
				else
					Shared_Log.Warn(SCOPE, ("gửi kênh '%s' lỗi: %s"):format(name, tostring(err)))
				end
			end
		end
	end

	return sent
end

-- Bật bộ xả định kỳ qua Scheduler (không mở vòng lặp riêng).
function Net.Start()
	if Net.handle ~= nil then
		return Net.handle
	end
	Net.handle = Client_Scheduler.Schedule({
		name = "net.flush",
		interval = 0.25,
		priority = -20,               -- ưu tiên thấp, không tranh khung hình
		callback = function()
			Net.Flush()
		end,
	})
	return Net.handle
end

function Net.Stop()
	if Net.handle ~= nil then
		Net.handle:Cancel()
		Net.handle = nil
	end
	for _, channel in pairs(Net.channels) do
		table.clear(channel.queue)
	end
	return true
end

function Net.QueueDepth(name)
	local channel = Net.channels[name]
	return channel ~= nil and #channel.queue or 0
end

function Net.Stats()
	return {
		channels = (function()
			local n = 0
			for _ in pairs(Net.channels) do
				n += 1
			end
			return n
		end)(),
		queued = Net.stats.queued,
		sent = Net.stats.sent,
		suppressedDuplicates = Net.stats.suppressed,
		batched = Net.stats.batched,
		droppedNoRemote = Net.stats.noRemote,
		-- Tỷ lệ nén: số thông điệp bị chặn/gộp so với tổng số đưa vào
		savingRate = Net.stats.queued > 0
			and ((Net.stats.suppressed + Net.stats.batched) / Net.stats.queued) or 0,
	}
end

function Net.Reset()
	Net.Stop()
	table.clear(Net.channels)
	Net.stats = { queued = 0, sent = 0, suppressed = 0, batched = 0, noRemote = 0 }
end

return Net
end,
	["Client/Core/Perf"] = function()
--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  CPU-006, HEAVY-001, MEAS-002, RAM-001
	===== RALO.METHODS:END ===== --]]

--[[
	Core/Perf.luau
	Toán học thống kê cho dữ liệu khung hình. THUẦN LOGIC — không có API
	Roblox nào ở đây, nên có thể unit test chính xác bằng số liệu dựng sẵn.

	Bộ đệm vòng (ring buffer) kích thước cố định -> không phình bộ nhớ
	khi đo lâu, và p1/p5/p95 tính trên đúng số mẫu đang giữ.
]]

local Perf = {}
Perf.__index = Perf

function Perf.New(capacity: number)
	local self = setmetatable({}, Perf)
	self.capacity = math.max(8, math.floor(capacity or 180))
	self.values = table.create(self.capacity, 0)
	self.head = 0        -- số mẫu đã ghi (tăng mãi, lấy modulo)
	self.sum = 0
	self.min = math.huge
	self.max = -math.huge
	return self
end

function Perf.Push(self, value: number)
	if type(value) ~= "number" or value ~= value then
		return self                 -- bỏ qua NaN / sai kiểu, không làm hỏng thống kê
	end
	local slot = (self.head % self.capacity) + 1
	local previous = self.values[slot]

	if self.head >= self.capacity then
		self.sum -= previous        -- trừ mẫu sắp bị ghi đè
	end

	self.values[slot] = value
	self.head += 1
	self.sum += value
	if value < self.min then self.min = value end
	if value > self.max then self.max = value end
	return self
end

function Perf.Count(self): number
	return math.min(self.head, self.capacity)
end

function Perf.Mean(self): number
	local n = Perf.Count(self)
	if n == 0 then return 0 end
	return self.sum / n
end

-- Độ lệch chuẩn mẫu (n-1). Trả 0 nếu ít hơn 2 mẫu.
function Perf.StdDev(self): number
	local n = Perf.Count(self)
	if n < 2 then return 0 end
	local mean = Perf.Mean(self)
	local acc = 0
	for i = 1, n do
		local d = self.values[i] - mean
		acc += d * d
	end
	return math.sqrt(acc / (n - 1))
end

--[[
	Percentile theo nội suy tuyến tính (cùng định nghĩa numpy.percentile mặc định).
	p nằm trong 0..100.
]]
function Perf.Percentile(self, p: number): number
	local n = Perf.Count(self)
	if n == 0 then return 0 end

	-- Sao ra mảng đã sắp xếp (chỉ n phần tử đang có hiệu lực)
	local sorted = table.create(n)
	for i = 1, n do
		sorted[i] = self.values[i]
	end
	table.sort(sorted)

	local rank = (math.clamp(p, 0, 100) / 100) * (n - 1)
	local lower = math.floor(rank)
	local frac = rank - lower
	local a = sorted[lower + 1]
	local b = sorted[math.min(lower + 2, n)]
	return a + (b - a) * frac
end

--[[
	Tóm tắt: trả về bảng chỉ số. unit = "ms" (frame time) hoặc "fps".
	Khi input là frame time (ms), fps được suy ra từ percentile frame time:
		fps_pX = 1000 / frameTime_p(100-X)
	(p1 fps lấy từ p99 frame time — đúng ý nghĩa "khung hình tệ nhất").
]]
function Perf.Summarize(self, unit: string): { [string]: number }
	local n = Perf.Count(self)
	local summary = {
		unit = unit,
		samples = n,
		mean = 0, min = 0, max = 0, stddev = 0,
		p1 = 0, p5 = 0, p50 = 0, p95 = 0, p99 = 0,
	}
	if n == 0 then
		return summary
	end

	summary.mean = Perf.Mean(self)
	if n > 0 then summary.min = self.min end
	if n > 0 then summary.max = self.max end
	summary.stddev = Perf.StdDev(self)
	summary.p1  = Perf.Percentile(self, 1)
	summary.p5  = Perf.Percentile(self, 5)
	summary.p50 = Perf.Percentile(self, 50)
	summary.p95 = Perf.Percentile(self, 95)
	summary.p99 = Perf.Percentile(self, 99)

	if unit == "ms" then
		local function toFps(ms: number): number
			if ms <= 0 then return 0 end
			return 1000 / ms
		end
		summary.fps_mean = toFps(summary.mean)
		summary.fps_p1   = toFps(summary.p99)   -- khung hình tệ nhất
		summary.fps_p5   = toFps(summary.p95)
		summary.fps_p50  = toFps(summary.p50)
		summary.fps_min  = toFps(summary.max)
		summary.fps_max  = toFps(summary.min)
	end

	return summary
end

-- Trung bình trượt của N mẫu cuối — dùng cho chỉ số FPS tức thời trên menu.
function Perf.RecentMean(self, count: number): number
	local n = Perf.Count(self)
	local take = math.min(math.max(1, math.floor(count or 30)), n)
	if take == 0 then return 0 end
	local acc = 0
	for i = 0, take - 1 do
		local slot = ((self.head - 1 - i) % self.capacity) + 1
		acc += self.values[slot]
	end
	return acc / take
end

function Perf.Reset(self)
	self.head = 0
	self.sum = 0
	self.min = math.huge
	self.max = -math.huge
	table.clear(self.values)
	for i = 1, self.capacity do
		self.values[i] = 0
	end
	return self
end

return Perf
end,
	["Client/Core/Pipeline"] = function()
--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  CFG-001, LOOP-005, MEAS-001, MEAS-003, MEAS-007, REC-003
	===== RALO.METHODS:END ===== --]]

--[[
	Client/Core/Pipeline.luau
	===== RALO.METHODS:CFG-001, LOOP-005, MEAS-001, MEAS-003, MEAS-007, REC-003 =====

	Dàn nhạc của toàn bộ chương trình:

	1. lập kế hoạch theo cấu hình  (Plan.Build)
	2. dựng bảng trạng thái tối giản (Ui/Notifier), tạo bộ đếm nội bộ (Ui/Progress)
	3. ĐO TRƯỚC                    (Measure.Run baselineSeconds)
	4. thực thi từng bước          (Runner.Execute)
	5. nghỉ settle
	6. ĐO SAU                      (Measure.Run afterSeconds)
	7. so sánh, in kết quả Output + cập nhật trạng thái GUI

	HAI NGUYÊN TẮC KHÔNG ĐƯỢC VI PHẠM:
	  * Không bước nào sinh số liệu giả. Nếu không đo được (0 mẫu),
	    pipeline nói rõ "không kết luận được" thay vì in ra con số.
	  * Thất bại KHÔNG được trình bày như thành công. Nếu có bước lỗi,
	    GUI chuyển sang trạng thái lỗi thật và Output ghi rõ lỗi.
]]

local Core_Env = __RALO_REQUIRE("Client/Core/Env")
local Core_Measure = __RALO_REQUIRE("Client/Core/Measure")
local Core_Memory = __RALO_REQUIRE("Client/Optimizations/Memory")
local Core_Plan = __RALO_REQUIRE("Client/Core/Plan")
local Core_Profile = __RALO_REQUIRE("Client/Core/Profile")
local Core_Restore = __RALO_REQUIRE("Client/Core/Restore")
local Core_Runner = __RALO_REQUIRE("Client/Core/Runner")
local Shared_Config = __RALO_REQUIRE("Shared/Config")
local Shared_Log = __RALO_REQUIRE("Shared/Log")
local Shared_Safe = __RALO_REQUIRE("Shared/Safe")
local Shared_Types = __RALO_REQUIRE("Shared/Types")
local Ui_Notifier = __RALO_REQUIRE("Client/Ui/Notifier")
local Ui_Progress = __RALO_REQUIRE("Client/Ui/Progress")

local SCOPE = "Pipeline"

local Pipeline = {}

Pipeline.lastResult = nil

--[[
	Tìm nơi treo GUI.
	LocalScript -> Players.LocalPlayer.PlayerGui (đây là đường ĐÚNG duy nhất
	cho LocalScript; CoreGui không ghi được từ LocalScript thường).
]]
function Pipeline.GetGuiParent()
	local players = Core_Env.GetService("Players")
	if players ~= nil then
		local ok, player = pcall(function()
			return players.LocalPlayer
		end)
		if ok and player ~= nil then
			local okGui, playerGui = pcall(function()
				return player:FindFirstChildOfClass("PlayerGui")
			end)
			if okGui and playerGui ~= nil then
				return playerGui
			end
		end
	end
	-- Không có PlayerGui (ví dụ chạy trong harness) -> trả về game để test
	return Core_Env.game
end

-- Dựng bảng kết quả đo từ chỉ số tức thời (dùng khi options.instant = true)
local function instantSnapshot(label)
	local instant = Core_Measure.Instant()
	local value = instant.frameTimeMs
	return {
		meta = {
			label = label,
			samples = instant.frameTimeAvailable and 1 or 0,
			duration = 0,
			source = "instant",
			note = "chỉ số tức thời một lần đọc, KHÔNG phải phân bố khung hình",
		},
		frame = { mean = value, p95 = value, max = value },
		fps = {
			mean = instant.fps, p1 = instant.fps, p5 = instant.fps, p50 = instant.fps, min = instant.fps,
		},
		frameTimeMs = { mean = value, p95 = value, max = value },
		gcHeapKb = instant.gcHeapKb,
		gcAvailable = instant.gcAvailable,
		statsFps = instant.statsFps,
		statsAvailable = instant.statsAvailable,
		world = Core_Measure.WorldStats(),
		time = instant.time,
	}
end

--[[
	options = {
		profile = bảng cấu hình (mặc định Shared_Config.PROFILE)
		buildUi = true/false (mặc định true)
		onPhase = function(phase, payload)
		instant = true -> bỏ qua lấy mẫu khung hình, chỉ đọc chỉ số tức thời
	}
	Trả về bảng kết quả. KHÔNG throw: lỗi được bắt và ghi vào result.error.
]]
function Pipeline.Run(options)
	options = options or {}
	local profile = options.profile or Shared_Config.PROFILE
	local buildUi = options.buildUi
	if buildUi == nil then
		buildUi = true
	end
	local onPhase = options.onPhase or function() end
	local measure = profile.measure or Shared_Config.PROFILE.measure
	local progress = nil

	local ok, result = pcall(function()
		onPhase(Shared_Types.PHASE_IDLE, nil)

		------------------------------------------------------ 1. kế hoạch
		local plan = Core_Plan.Build(profile)
		for _, line in ipairs(Core_Plan.Describe(plan)) do
			Shared_Log.Info(SCOPE, line)
		end

		----------------------------------------------------------- 2. GUI
		progress = Ui_Progress.New(plan.total)
		local notifier = nil
		if buildUi then
			notifier = Ui_Notifier.Build({
				parent = Pipeline.GetGuiParent(),
				profile = profile,
			})
		end

		------------------------------------------------------ 3. đo TRƯỚC
		onPhase(Shared_Types.PHASE_BASELINE, nil)
		local before
		if options.instant then
			before = instantSnapshot("baseline")
		else
			Shared_Log.Info(SCOPE, ("đang đo nền %.1f giây — đừng làm gì để số đo sạch")
				:format(measure.baselineSeconds))
			before = Core_Measure.Run(measure.baselineSeconds, {
				label = "baseline",
				window = measure.frameWindow,
			})
		end

		------------------------------------------------------- 4. thực thi
		progress:SetPhase(Shared_Types.PHASE_OPTIMIZING, "đang tối ưu")
		onPhase(Shared_Types.PHASE_OPTIMIZING, plan)

		Core_Runner.Execute(plan, {
			onStep = function(step, index)
				progress:Mark(index, step.status, step.name .. ": " .. tostring(step.detail or ""))
			end,
		})

		local tally = Core_Runner.Tally(plan)
		Shared_Log.Info(SCOPE,
			("thực thi xong: áp dụng %d, bỏ qua %d, lỗi %d, %d thay đổi; thời gian handler tổng %.3f ms (lớn nhất %.3f ms: %s)")
				:format(tally.applied, tally.skipped, tally.failed, tally.changes,
					tally.handlerDurationMs, tally.maxHandlerMs, tostring(tally.slowestStepId or "không có")))

		-------------------------------------------------------- 5. settle
		if measure.settleSeconds > 0 and not options.instant then
			progress:SetPhase(Shared_Types.PHASE_SETTLE, "đang chờ FPS ổn định")
			Core_Env.Wait(measure.settleSeconds)
		end

		----------------------------------------------------- 6. đo SAU
		local after
		if options.instant then
			after = instantSnapshot("after")
		else
			progress:SetPhase(Shared_Types.PHASE_REMEASURE, "đang đo lại")
			Shared_Log.Info(SCOPE, ("đang đo sau tối ưu %.1f giây"):format(measure.afterSeconds))
			after = Core_Measure.Run(measure.afterSeconds, {
				label = "after",
				window = measure.frameWindow,
			})
		end

		----------------------------------------------------- 7. so sánh
		progress:SetPhase(Shared_Types.PHASE_COMPARE, "đang so sánh")
		local comparison = Core_Measure.Compare(before, after)

		local lines
		if comparison.valid then
			lines = Core_Measure.FormatComparison(comparison)
		else
			lines = {
				"Không kết luận được: " .. tostring(comparison.reason),
				("mẫu trước=%d, mẫu sau=%d")
					:format(before.meta.samples or 0, after.meta.samples or 0),
				"Chạy lại ở nơi có cảnh nặng hơn, hoặc tăng baselineSeconds/afterSeconds.",
			}
		end

		-- In ra Output: bản ghi đầy đủ, kể cả khi GUI đã ẩn
		Shared_Log.Info(SCOPE, "=== KẾT QUẢ ĐO TRƯỚC / SAU ===")
		for _, line in ipairs(lines) do
			Shared_Log.Info(SCOPE, line)
		end
		Shared_Log.Info(SCOPE, ("nguồn số liệu: trước=%s, sau=%s")
			:format(tostring(before.meta.source), tostring(after.meta.source)))

		-- THẤT BẠI KHÔNG ĐƯỢC TRÌNH BÀY NHƯ THÀNH CÔNG
		local verdict
		if tally.failed > 0 then
			verdict = "error"
			lines[#lines + 1] = ("CÓ %d BƯỚC LỖI — xem Output để biết chi tiết"):format(tally.failed)
		elseif comparison.valid then
			verdict = comparison.summary.verdict
		end

		if notifier ~= nil then
			notifier:SetResults(lines, verdict)
		end
		progress:SetPhase(Shared_Types.PHASE_DONE, "hoàn tất")
		onPhase(Shared_Types.PHASE_DONE, comparison)

		local selfCost = Core_Profile.SelfCost()
		Shared_Log.Info(SCOPE,
			("chi phí Scheduler: %.3f ms/frame (ngân sách %.1f ms), %d quá hạn; %d tác vụ, %d kết nối")
				:format(selfCost.frameCostMs, selfCost.frameBudgetMs, selfCost.overruns,
					selfCost.tasks, selfCost.connections))

		return {
			version = Shared_Config.VERSION,
			environment = Core_Env.mode,
			before = before,
			after = after,
			comparison = comparison,
			plan = plan,
			tally = tally,
			restoreEntries = Core_Restore.Count(),
			logLines = lines,
			safeRecords = #Shared_Safe.Records,
			selfCost = selfCost,
			verdict = verdict,
			error = nil,
		}
	end)

	if progress ~= nil then
		local cleanupOk, cleanupError = pcall(function()
			progress:Destroy()
		end)
		if not cleanupOk then
			Shared_Log.Warn(SCOPE, "không dọn được tiến trình nội bộ: " .. tostring(cleanupError))
		end
	end

	if not ok then
		-- Lỗi thật: ghi log, báo GUI bằng trạng thái LỖI, và trả về error
		Shared_Log.Error(SCOPE, "pipeline lỗi: " .. tostring(result))
		local notifier = nil
		local okNotifier, built = pcall(function()
			return Ui_Notifier.Get()
		end)
		if okNotifier then
			notifier = built
		end
		if notifier ~= nil then
			pcall(function()
				notifier:SetResults({ "Tối ưu thất bại.", tostring(result) }, "error")
			end)
		end
		Pipeline.lastResult = { verdict = "error", error = tostring(result) }
		return Pipeline.lastResult
	end

	Pipeline.lastResult = result
	return result
end

--[[
	Hoàn tác mọi thay đổi mà hệ thống đã thực hiện.
	Trả về: số property đã khôi phục, số lần thất bại.
]]
function Pipeline.Restore()
	return Core_Restore.All()
end

-- Dừng hẳn hệ thống: ngắt kết nối, huỷ GUI, giải phóng bộ lập lịch.
function Pipeline.Shutdown()
	local notifier = Ui_Notifier.Get()
	if notifier ~= nil then
		notifier:Destroy()
	end
	Core_Memory.StopGcLoop()
	return true
end

return Pipeline
end,
	["Client/Core/Plan"] = function()
--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  CFG-001, CFG-002, LOOP-005, REC-004
	===== RALO.METHODS:END ===== --]]

--[[
	Client/Core/Plan.luau
	===== RALO.METHODS:CFG-001, CFG-002, LOOP-005, REC-004 =====

	Lập KẾ HOẠCH tối ưu: quyết định bước nào chạy, bước nào bỏ qua và VÌ SAO.

	Nguyên tắc: bước không khả thi KHÔNG biến mất khỏi kế hoạch. Nó vẫn
	xuất hiện với available = false kèm lý do, để người dùng biết chính xác
	cái gì chưa được làm và tại sao. Đây là một phần của cơ chế chống
	"báo cáo khống".

	Kiểm tra khả dụng dùng Client_Env.GetService (API thật của Roblox),
	không dùng bất kỳ cơ chế probe executor nào.
]]

local Core_Env = __RALO_REQUIRE("Client/Core/Env")
local Core_Devices = __RALO_REQUIRE("Client/Core/Devices")
local Shared_Config = __RALO_REQUIRE("Shared/Config")
local Shared_Types = __RALO_REQUIRE("Shared/Types")
local Opt_Effects = __RALO_REQUIRE("Client/Optimizations/Effects")
local Opt_Graphics = __RALO_REQUIRE("Client/Optimizations/Graphics")
local Opt_Memory = __RALO_REQUIRE("Client/Optimizations/Memory")
local Opt_Physics = __RALO_REQUIRE("Client/Optimizations/Physics")

local Plan = {}

--[[
	DANH MỤC BƯỚC, sắp theo THỨ TỰ ƯU TIÊN của Part 5:
	  1. bỏ việc thừa            2. giảm việc trong vòng lặp
	  3. gộp kết nối sự kiện     4. dọn dẹp
	  5. giới hạn cập nhật       6. tra cứu/quản lý
	  7. tự quản lý đối tượng tạm 8. đo lường
	  9. CHỈ CUỐI CÙNG mới tới thay đổi đồ hoạ nhẹ, đảo ngược được

	`group` khớp với khóa trong Config.PROFILE.groups.
	`restorable` = true nghĩa là bước này ghi nhật ký vào Restore.
]]
Plan.CATALOG = {
	{
		id = "graphics.quality",
		name = "Giảm nhẹ chất lượng hình ảnh (mức tối đa 8)",
		group = "graphics",
		module = Opt_Graphics,
		handler = "ApplyQualityLevel",
		restorable = true,
	},
	{
		id = "graphics.terrain",
		name = "Đặt chi tiết địa hình theo cấu hình (mặc định giữ)",
		group = "graphics",
		module = Opt_Graphics,
		handler = "ApplyTerrain",
		restorable = true,
	},
	{
		id = "graphics.shadows",
		name = "Giữ nguyên bóng đổ (culling xa mặc định tắt)",
		group = "graphics",
		module = Opt_Graphics,
		handler = "ApplyShadowBudget",
		restorable = true,
	},
	{
		id = "graphics.character",
		name = "Giữ nguyên bóng và tỉ lệ nhân vật",
		group = "character",
		module = Opt_Graphics,
		handler = "ApplyCharacter",
		restorable = true,
	},
	{
		id = "effects.particles",
		name = "Giới hạn hạt (particle) — không xoá effect",
		group = "effects",
		module = Opt_Effects,
		handler = "CapParticles",
		restorable = true,
	},
	{
		id = "effects.optional",
		name = "Beam/Trail/Decal (tuỳ chọn, mặc định giữ nguyên)",
		group = "effects",
		module = Opt_Effects,
		handler = "ApplyOptionalEffects",
		restorable = true,
	},
	{
		id = "physics.throttling",
		name = "Bớt làm mượt nội suy vật lý (mặc định TẮT)",
		group = "physics",
		module = Opt_Physics,
		handler = "ApplyThrottling",
		restorable = true,
	},
	{
		id = "memory.gc",
		name = "Kích hoạt chu kỳ dọn bộ nhớ Luau",
		group = "memory",
		module = Opt_Memory,
		handler = "StartGcLoop",
		restorable = false,
	},
	{
		id = "memory.orphanSweep",
		name = "Gom instance mồ côi (lưu trữ, không xoá)",
		group = "memory",
		module = Opt_Memory,
		handler = "SweepOrphans",
		restorable = false,
	},
}

-- Dịch tên service mà mỗi bước cần. Không có service -> bước bị skip.
local REQUIRED_SERVICE = {
	["graphics.quality"] = "Lighting",
	["graphics.terrain"] = "Workspace",
	["graphics.shadows"] = "Workspace",
	["graphics.character"] = "Players",
}

--[[
	Xây dựng kế hoạch. KHÔNG thực thi gì ở đây.
	profile: bảng cấu hình (mặc định Shared_Config.PROFILE)
]]
function Plan.Build(profile)
	profile = profile or Shared_Config.PROFILE

	local mode = Shared_Config.Mode()
	local steps = {}

	for index, entry in ipairs(Plan.CATALOG) do
		local available, reason = true, nil

		-- 1) công tắc tổng
		if profile.enabled == false or mode == "off" then
			available, reason = false, "hệ thống đang tắt (enabled = false hoặc mode = 'off')"

		-- 2) công tắc theo NHÓM (CFG-001)
		elseif not Core_Devices.IsEnabled(profile, entry.group, entry.id) then
			available, reason = false, ("tắt trong config (groups.%s = false)"):format(tostring(entry.group))

		-- 3) điều kiện vật lý của từng bước
		else
			local service = REQUIRED_SERVICE[entry.id]
			if service ~= nil and Core_Env.GetService(service) == nil then
				available, reason = false, ("không truy cập được service %s"):format(service)
			elseif entry.id == "physics.throttling" and not profile.physics.enabled then
				available, reason = false,
					"tắt trong config (physics.enabled = false) — có đánh đổi cảm giác chơi"
			elseif entry.module[entry.handler] == nil then
				-- Chốt an toàn: handler không tồn tại thì KHÔNG được báo "đã làm"
				available, reason = false, ("module thiếu handler %s"):format(tostring(entry.handler))
			end
		end

		steps[#steps + 1] = {
			index = index,
			id = entry.id,
			name = entry.name,
			group = entry.group,
			module = entry.module,
			handler = entry.handler,
			available = available,
			reason = reason,
			status = Shared_Types.STATUS_PENDING,
			detail = reason,
			changes = 0,
			restorable = entry.restorable == true,
		}
	end

	return {
		steps = steps,
		total = #steps,
		profile = profile,
		mode = mode,
		environment = Core_Env.mode,
	}
end

function Plan.GetById(plan, id)
	for _, step in ipairs(plan.steps) do
		if step.id == id then
			return step
		end
	end
	return nil
end

function Plan.CountAvailable(plan)
	local n = 0
	for _, step in ipairs(plan.steps) do
		if step.available then
			n += 1
		end
	end
	return n
end

-- Tóm tắt kế hoạch thành các dòng chữ, dùng cho Output và GUI.
function Plan.Describe(plan)
	local lines = {
		("kế hoạch: %d bước, %d bước khả dụng (chế độ: %s)")
			:format(plan.total, Plan.CountAvailable(plan), tostring(plan.mode)),
	}
	for _, step in ipairs(plan.steps) do
		lines[#lines + 1] = ("  %2d. %-42s %s")
			:format(step.index, step.name, step.available and "sẵn sàng" or ("BỎ QUA: " .. tostring(step.reason)))
	end
	return lines
end

return Plan
end,
	["Client/Core/Pool"] = function()
--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  DATA-001, POOL-001, POOL-003, POOL-004,
	  POOL-005, RAM-002
	===== RALO.METHODS:END ===== --]]

--[[
	Client/Core/Pool.luau
	===== RALO.METHODS:POOL-001, POOL-003, POOL-004, CPU-006, RAM-002, RAM-004 =====

	Object pooling: tái sử dụng đối tượng thay vì tạo mới rồi huỷ.

	Nguyên nhân lag mà nó xử lý:
	  * `Instance.new()` là thao tác ĐẮT (cấp phát phía engine + nhân bản
	    template). Làm việc đó mỗi lần bắn đạn/mỗi hiệu ứng gây khựng hình.
	  * Tạo bảng Lua mới trong vòng lặp mỗi khung hình -> ép GC chạy
	    thường xuyên hơn.
	  * `Destroy()` liên tục cũng đắt không kém việc tạo mới.

	Cách xử lý:
	  * Acquire(): lấy từ pool nếu có, chỉ tạo mới khi pool rỗng.
	  * Release(): trả về pool (Parent = nil, reset property) thay vì Destroy.
	  * Có TRẦN dung lượng: pool không được phình thành nguồn rò rỉ mới.
	  * Pool bảng Lua riêng cho các bảng tạm (RAM-002).
]]

local Shared_Log = __RALO_REQUIRE("Shared/Log")
local Client_Guard = __RALO_REQUIRE("Client/Core/Guard")
local Client_Registry = __RALO_REQUIRE("Client/Core/Registry")

local SCOPE = "Pool"

local Pool = {}

Pool.pools = {}          -- key -> { free = {}, cap, created, className, factory, reset }
Pool.tablePool = {}      -- danh sách bảng tái sử dụng
Pool.tablePoolCap = 64
Pool.stats = { acquired = 0, reused = 0, created = 0, released = 0, capped = 0 }

--[[
	Định nghĩa một pool.
	spec = {
		className = "Part",
		capacity  = 32,             -- trần số đối tượng giữ lại
		factory   = function() -> instance   (tùy chọn, tự tạo nếu thiếu)
		prepare   = function(instance) -> () (reset trước khi cất)
		setup     = function(instance) -> () (khởi tạo khi tạo mới)
	}
]]
function Pool.Define(key, spec)
	if type(key) ~= "string" or type(spec) ~= "table" then
		Shared_Log.Warn(SCOPE, "Define cần key chuỗi và spec bảng")
		return nil
	end
	Pool.pools[key] = {
		free = {},
		cap = math.max(1, math.floor(spec.capacity or 32)),
		created = 0,
		className = spec.className,
		factory = spec.factory,
		prepare = spec.prepare,
		setup = spec.setup,
	}
	return Pool.pools[key]
end

local function createInstance(pool)
	if pool.factory ~= nil then
		local ok, instance = Client_Guard.Run(SCOPE .. ":factory", pool.factory)
		if ok and instance ~= nil then
			return instance
		end
		return nil
	end
	if pool.className == nil then
		return nil
	end
	local ok, instance = Client_Guard.Run(SCOPE .. ":new", function()
		return Instance.new(pool.className)
	end)
	if not ok then
		return nil
	end
	if pool.setup ~= nil then
		Client_Guard.Run(SCOPE .. ":setup", pool.setup, instance)
	end
	return instance
end

--[[
	Lấy một đối tượng từ pool.
	Trả về: instance hoặc nil (kèm lý do).
]]
function Pool.Acquire(key)
	local pool = Pool.pools[key]
	if pool == nil then
		return nil, "pool chưa được định nghĩa: " .. tostring(key)
	end

	Pool.stats.acquired += 1

	local instance = table.remove(pool.free)
	if instance ~= nil then
		-- Kiểm tra đối tượng trong pool còn sống (có thể đã bị game huỷ)
		if Client_Guard.Alive(instance) then
			Pool.stats.reused += 1
			return instance, "reused"
		end
		pool.created -= 1
	end

	local created = createInstance(pool)
	if created == nil then
		return nil, "không tạo được instance cho pool " .. tostring(key)
	end
	pool.created += 1
	Pool.stats.created += 1
	Client_Registry.Own(created, "pool:" .. key)
	return created, "created"
end

--[[
	Trả đối tượng về pool. Parent được đặt nil để nó không còn được render.
	Nếu pool đã đầy thì huỷ thật (tránh rò rỉ).
]]
function Pool.Release(key, instance)
	local pool = Pool.pools[key]
	if pool == nil or instance == nil then
		return false
	end
	if not Client_Guard.Alive(instance) then
		return false
	end

	if pool.prepare ~= nil then
		Client_Guard.Run(SCOPE .. ":prepare", pool.prepare, instance)
	end

	if #pool.free >= pool.cap then
		Pool.stats.capped += 1
		Client_Guard.Run(SCOPE .. ":destroy", function()
			instance:Destroy()
		end)
		pool.created -= 1
		return false
	end

	Client_Guard.Run(SCOPE .. ":detach", function()
		instance.Parent = nil
	end)
	table.insert(pool.free, instance)
	Pool.stats.released += 1
	return true
end

-- Pool bảng Lua: tránh cấp phát bảng mới trong vòng lặp nóng.
function Pool.AcquireTable()
	local t = table.remove(Pool.tablePool)
	if t ~= nil then
		return t
	end
	return {}
end

function Pool.ReleaseTable(t)
	if type(t) ~= "table" then
		return false
	end
	if table.clear ~= nil then
		table.clear(t)
	else
		for k in pairs(t) do
			t[k] = nil
		end
	end
	if #Pool.tablePool >= Pool.tablePoolCap then
		return false
	end
	table.insert(Pool.tablePool, t)
	return true
end

function Pool.FreeCount(key)
	local pool = Pool.pools[key]
	return pool ~= nil and #pool.free or 0
end

function Pool.Stats()
	local pools = {}
	for key, pool in pairs(Pool.pools) do
		pools[key] = { free = #pool.free, created = pool.created, cap = pool.cap }
	end
	return {
		pools = pools,
		acquired = Pool.stats.acquired,
		reused = Pool.stats.reused,
		created = Pool.stats.created,
		released = Pool.stats.released,
		cappedOut = Pool.stats.capped,
		tablePoolSize = #Pool.tablePool,
	}
end

function Pool.Shutdown()
	for key, pool in pairs(Pool.pools) do
		for _, instance in pool.free do
			Client_Guard.Run(SCOPE .. ":shutdown", function()
				instance:Destroy()
			end)
			_ = key
		end
		table.clear(pool.free)
		pool.created = 0
	end
	table.clear(Pool.tablePool)
	Pool.stats = { acquired = 0, reused = 0, created = 0, released = 0, capped = 0 }
	return true
end

function Pool.Reset()
	Pool.Shutdown()
	table.clear(Pool.pools)
end

return Pool
end,
	["Client/Core/Profile"] = function()
--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  HEAVY-002, HEAVY-003, HEAVY-004, MEAS-001,
	  MEAS-003, MEAS-005, MEAS-006, MEAS-007,
	  SAFE-006
	===== RALO.METHODS:END ===== --]]

--[[
	Client/Core/Profile.luau
	===== RALO.METHODS:MEAS-001, MEAS-002, MEAS-003, MEAS-004, MEAS-005,
	                    HEAVY-001, HEAVY-002, HEAVY-003, HEAVY-004, RES-004 =====

	Đo lường. Đây là phần quyết định tính TRUNG THỰC của cả dự án:
	mọi con số báo cáo đều phải sinh ra từ đây, không có con số nào
	được viết sẵn trong mã.

	Nguồn số liệu thật:
	  * frame time = delta thật giữa hai lần RenderStepped
	  * Luau heap  = collectgarbage("count")  (KB)
	  * chi phí của CHÍNH công cụ tối ưu = thời gian Scheduler.Tick tiêu tốn
	  * số connection / instance / pool = đếm từ Registry & Pool

	Nếu không lấy được một chỉ số, hàm trả về `available = false`
	và pipeline ghi rõ "chưa có số liệu" — KHÔNG suy ra số gần đúng.
]]

local Client_Env = __RALO_REQUIRE("Client/Core/Env")
local Client_Perf = __RALO_REQUIRE("Client/Core/Perf")
local Shared_Log = __RALO_REQUIRE("Shared/Log")
local Client_Scheduler = __RALO_REQUIRE("Client/Core/Scheduler")
local Client_Registry = __RALO_REQUIRE("Client/Core/Registry")
local Shared_Safe = __RALO_REQUIRE("Shared/Safe")

local SCOPE = "Profile"

local Profile = {}

Profile.live = nil           -- Perf buffer đang nhận mẫu (cho chỉ số tức thời)
Profile.last = nil
Profile.longFrames = 0       -- số khung hình vượt ngưỡng
Profile.longFrameThresholdMs = 33.3   -- dưới 30 FPS
Profile.worstFrameMs = 0

--[[
	Đọc chỉ số tức thời MỘT lần. Không throw, không bịa.
]]
function Profile.Instant()
	local runService = Client_Env.GetService("RunService")

	local frameTimeMs, frameOk = 0, false
	if runService ~= nil then
		-- Shared_Safe.Call trả về (ok, result) và không bao giờ throw.
		local ok, value = Shared_Safe.Call(runService, "GetRenderStepTime")
		if ok and type(value) == "number" and value == value then
			frameTimeMs = value * 1000
			frameOk = true
		end
	end

	local heapKb, heapOk = 0, false
	if collectgarbage ~= nil then
		local ok2, value2 = pcall(collectgarbage, "count")
		if ok2 and type(value2) == "number" then
			heapKb, heapOk = value2, true
		end
	end

	return {
		frameTimeMs = frameTimeMs,
		frameTimeAvailable = frameOk,
		fps = (frameOk and frameTimeMs > 0) and (1000 / frameTimeMs) or nil,
		heapKb = heapKb,
		heapAvailable = heapOk,
		scheduler = Client_Scheduler.Stats(),
		registry = Client_Registry.Stats(),
		time = Client_Env.now(),
	}
end

--[[
	Đếm đối tượng trong Workspace để làm NGỮ CẢNH cho kết quả đo.
	Đây không phải chỉ số chất lượng, mà để biết hai lần đo có tương đương.
]]
function Profile.WorldCensus(workspace)
	local target = workspace or Client_Env.GetService("Workspace")
	local census = {
		scanned = 0, parts = 0, shadowCasters = 0, emitters = 0,
		models = 0, available = target ~= nil,
	}
	if target == nil then
		return census
	end

	local ok, descendants = pcall(function()
		return target:GetDescendants()
	end)
	if not ok then
		census.note = "GetDescendants thất bại"
		return census
	end

	census.scanned = #descendants
	for _, instance in descendants do
		local className = instance.ClassName
		if className == "Part" or className == "MeshPart" or className == "UnionOperation" then
			census.parts += 1
			local okCast, cast = pcall(function()
				return instance.CastShadow
			end)
			if okCast and cast == true then
				census.shadowCasters += 1
			end
		elseif className == "ParticleEmitter" then
			census.emitters += 1
		elseif className == "Model" then
			census.models += 1
		end
	end
	return census
end

--[[
	Đo trong `durationSeconds`.
	options = { label, window, onSample }
]]
function Profile.Run(durationSeconds, options)
	options = options or {}
	local duration = math.max(0.1, tonumber(durationSeconds) or 1.0)
	local runService = Client_Env.GetService("RunService")

	local perf = Client_Perf.New(options.window or 180)
	Profile.live = perf

	local meta = {
		label = options.label or "sample",
		duration = duration,
		source = "none",
		samples = 0,
		note = nil,
	}

	local startedAt = Client_Env.now()
	local connection
	if runService ~= nil and runService.RenderStepped ~= nil then
		meta.source = "RenderStepped"
		local ok, conn = pcall(function()
			return runService.RenderStepped:Connect(function(deltaTime)
				if deltaTime ~= nil and deltaTime > 0 then
					local ms = deltaTime * 1000
					perf:Push(ms)
					meta.samples += 1
					if ms > Profile.longFrameThresholdMs then
						Profile.longFrames += 1
					end
					if ms > Profile.worstFrameMs then
						Profile.worstFrameMs = ms
					end
					if options.onSample then
						options.onSample(ms, meta.samples)
					end
				end
			end)
		end)
		if ok then
			connection = conn
		else
			meta.note = "không kết nối được RenderStepped"
		end
	elseif runService ~= nil and runService.Heartbeat ~= nil then
		meta.source = "Heartbeat (fallback, không phải thời gian render)"
		local ok, conn = pcall(function()
			return runService.Heartbeat:Connect(function(deltaTime)
				if deltaTime ~= nil and deltaTime > 0 then
					perf:Push(deltaTime * 1000)
					meta.samples += 1
				end
			end)
		end)
		if ok then
			connection = conn
		end
	else
		meta.note = "runtime không có RenderStepped/Heartbeat -> không có số đo khung hình"
		Shared_Log.Warn(SCOPE, meta.note)
	end

	Client_Env.Wait(duration)

	if connection ~= nil then
		pcall(function()
			connection:Disconnect()
		end)
	end

	meta.elapsed = Client_Env.now() - startedAt
	if meta.source ~= "none" and meta.samples == 0 then
		meta.note = "có kết nối nhưng không nhận được mẫu nào"
	end

	local summary = perf:Summarize("ms")
	local heapKb, heapOk = 0, false
	if collectgarbage ~= nil then
		local ok, value = pcall(collectgarbage, "count")
		if ok and type(value) == "number" then
			heapKb, heapOk = value, true
		end
	end

	local result = {
		meta = meta,
		frame = summary,
		fps = {
			mean = summary.fps_mean or 0,
			p1 = summary.fps_p1 or 0,
			p5 = summary.fps_p5 or 0,
			p50 = summary.fps_p50 or 0,
		},
		frameTimeMs = { mean = summary.mean, p95 = summary.p95, max = summary.max },
		heapKb = heapKb,
		heapAvailable = heapOk,
		scheduler = Client_Scheduler.Stats(),
		registry = Client_Registry.Stats(),
		census = Profile.WorldCensus(),
		time = Client_Env.now(),
	}

	Profile.last = result
	Shared_Log.Info(SCOPE, ("đo '%s': %d mẫu / %.2fs (nguồn %s)")
		:format(meta.label, meta.samples, meta.elapsed, meta.source))
	return result
end

--[[
	So sánh hai lần đo. Chỉ tính từ số liệu thật đã truyền vào.
	Thiếu mẫu -> valid = false, nêu lý do, KHÔNG kết luận.
]]
function Profile.Compare(before, after)
	local out = { valid = true, reason = nil, rows = {}, summary = {} }

	if before == nil or after == nil then
		out.valid = false
		out.reason = "thiếu dữ liệu before/after"
		return out
	end
	local beforeSamples = before.meta and before.meta.samples or 0
	local afterSamples = after.meta and after.meta.samples or 0
	if beforeSamples == 0 or afterSamples == 0 then
		out.valid = false
		out.reason = ("một trong hai lần đo có 0 mẫu (trước=%d, sau=%d) -> không kết luận được")
			:format(beforeSamples, afterSamples)
		return out
	end

	local function addRow(label, beforeValue, afterValue, betterWhenLower, decimals)
		decimals = decimals or 1
		local diff = afterValue - beforeValue
		local pct = beforeValue ~= 0 and (diff / beforeValue) * 100 or 0
		local format = "%." .. decimals .. "f"
		out.rows[#out.rows + 1] = {
			label = label,
			before = format:format(beforeValue),
			after = format:format(afterValue),
			delta = ("%+.1f%%"):format(pct),
			better = betterWhenLower and diff < 0 or (not betterWhenLower and diff > 0),
			worse = betterWhenLower and diff > 0 or (not betterWhenLower and diff < 0),
			pct = pct,
		}
	end

	addRow("FPS trung bình", before.fps.mean, after.fps.mean, false)
	addRow("FPS p1 (khung tệ nhất)", before.fps.p1, after.fps.p1, false)
	addRow("FPS p5", before.fps.p5, after.fps.p5, false)
	addRow("Frame time TB (ms)", before.frameTimeMs.mean, after.frameTimeMs.mean, true)
	addRow("Frame time p95 (ms)", before.frameTimeMs.p95, after.frameTimeMs.p95, true)
	if before.heapAvailable and after.heapAvailable then
		addRow("Luau heap (MB)", before.heapKb / 1024, after.heapKb / 1024, true, 2)
	end

	local improved, regressed, unchanged = 0, 0, 0
	for _, row in out.rows do
		if row.better then
			improved += 1
		elseif row.worse then
			regressed += 1
		else
			unchanged += 1
		end
	end

	local verdict
	if improved > 0 and regressed == 0 then
		verdict = "improved"
	elseif regressed > 0 and improved == 0 then
		verdict = "regressed"
	elseif improved > 0 and regressed > 0 then
		verdict = "mixed"
	else
		verdict = "unchanged"
	end

	out.summary = {
		improved = improved,
		regressed = regressed,
		unchanged = unchanged,
		verdict = verdict,
		baselineSamples = beforeSamples,
		afterSamples = afterSamples,
		durationBefore = before.meta.duration,
		durationAfter = after.meta.duration,
		sourceBefore = before.meta.source,
		sourceAfter = after.meta.source,
		censusBefore = before.census,
		censusAfter = after.census,
	}
	return out
end

-- Định dạng thành các dòng để in ra Output / hiện lên GUI.
function Profile.FormatComparison(comparison)
	local rows = { { "Chỉ số", "Trước", "Sau", "Thay đổi" } }
	for _, row in comparison.rows do
		rows[#rows + 1] = { row.label, row.before, row.after, row.delta }
	end

	local widths = { 0, 0, 0, 0 }
	for _, row in rows do
		for i = 1, 4 do
			local length = #tostring(row[i] or "")
			if length > widths[i] then
				widths[i] = length
			end
		end
	end

	local lines = {}
	if comparison.valid then
		lines[#lines + 1] = ("Kết luận: %s (cải thiện %d, suy giảm %d, không đổi %d / %d chỉ số)")
			:format(comparison.summary.verdict, comparison.summary.improved, comparison.summary.regressed,
				comparison.summary.unchanged, #comparison.rows)
	else
		lines[#lines + 1] = "Không kết luận được: " .. tostring(comparison.reason)
	end

	for _, row in rows do
		local line = ""
		for i = 1, 4 do
			local cell = tostring(row[i] or "")
			line ..= cell .. string.rep(" ", widths[i] - #cell + 2)
		end
		lines[#lines + 1] = line
	end

	if comparison.valid then
		lines[#lines + 1] = ("Số mẫu: trước=%d (%.1fs, %s) · sau=%d (%.1fs, %s)")
			:format(comparison.summary.baselineSamples, comparison.summary.durationBefore,
				tostring(comparison.summary.sourceBefore),
				comparison.summary.afterSamples, comparison.summary.durationAfter,
				tostring(comparison.summary.sourceAfter))
	end
	return lines
end

--[[
	Chi phí do CHÍNH hệ thống tối ưu tạo ra (RES-004).
	Đây là chỉ số bắt buộc phải có: một công cụ chống lag mà tự gây lag
	thì vô nghĩa.
]]
function Profile.SelfCost()
	local scheduler = Client_Scheduler.Stats()
	return {
		frameCostMs = scheduler.lastFrameCostMs,
		frameBudgetMs = scheduler.frameBudgetMs,
		overruns = scheduler.overruns,
		tasks = scheduler.tasks,
		executions = scheduler.executions,
		connections = scheduler.connections + Client_Registry.ConnectionCount(),
		longFrames = Profile.longFrames,
		longFrameThresholdMs = Profile.longFrameThresholdMs,
		worstFrameMs = Profile.worstFrameMs,
	}
end

function Profile.Reset()
	Profile.longFrames = 0
	Profile.worstFrameMs = 0
	Profile.last = nil
	Profile.live = nil
end

return Profile
end,
	["Client/Core/Registry"] = function()
--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  ASSET-003, EVT-002, EVT-006, LEAK-001,
	  LEAK-002, LEAK-003, LEAK-005, QUERY-002,
	  RES-002, RES-003, SAFE-007
	===== RALO.METHODS:END ===== --]]

--[[
	Client/Core/Registry.luau
	===== RALO.METHODS:LEAK-001, LEAK-002, LEAK-003, LEAK-005, RES-003, CPU-002 =====

	Sổ đăng ký TRUNG TÂM cho mọi thứ hệ thống tạo ra hoặc kết nối tới.

	Nguyên nhân lag mà nó xử lý:
	  * Connection không Disconnect -> callback vẫn chạy sau khi đối tượng
	    đã bị huỷ => rò rỉ CPU tăng dần theo thời gian chơi.
	  * Instance do script tạo ra không ai giữ tham chiếu -> không dọn được.
	  * `FindFirstChild` lặp lại nhiều lần cho cùng một đối tượng -> tra cứu
	    cây instance tốn chi phí một cách vô ích.

	Cách xử lý:
	  * Mọi Connect đi qua Registry.Connect -> có handle, có DisconnectAll().
	  * Mọi Instance tạo ra đi qua Registry.Own -> có Release/ReleaseAll().
	  * Cache FindFirstChild theo (parent, name) và TỰ HUỶ cache khi đối
	    tượng bị huỷ (nghe AncestryChanged) -> cache không bao giờ trỏ vào
	    instance đã chết.
]]

local Shared_Log = __RALO_REQUIRE("Shared/Log")
local Client_Guard = __RALO_REQUIRE("Client/Core/Guard")

local SCOPE = "Registry"

local Registry = {}

Registry.connections = {}     -- id -> { connection, signalName, owner, alive }
Registry.owned = {}           -- id -> { instance, className, owner }
Registry.cache = {}           -- key -> instance
Registry.watchers = {}        -- id -> connection theo dõi AncestryChanged
Registry.autoDisconnect = true

local nextId = 0
local function newId()
	nextId += 1
	return nextId
end

--[[
	Kết nối có quản lý.
	Trả về handle { Disconnect = fn, Connected = bool, id }
	Nếu signal hoặc handler sai -> trả về nil và ghi log, không throw.
]]
function Registry.Connect(signal, handler, owner)
	if signal == nil or type(handler) ~= "function" then
		Shared_Log.Warn(SCOPE, "Connect cần signal và handler function")
		return nil
	end

	local connection
	local ok, result = Client_Guard.Run(SCOPE .. ":Connect", function()
		return signal:Connect(handler)
	end)
	if not ok or result == nil then
		return nil
	end
	connection = result

	local id = newId()
	local handle = { id = id, Connected = true, owner = owner or "anon" }

	function handle:Disconnect()
		local entry = Registry.connections[self.id]
		if entry == nil then
			return false
		end
		local okDisconnect = Client_Guard.Run(SCOPE .. ":Disconnect", function()
			entry.connection:Disconnect()
		end)
		Registry.connections[self.id] = nil
		self.Connected = false
		return okDisconnect
	end
	handle.Disconnect_ = handle.Disconnect

	Registry.connections[id] = {
		connection = connection,
		handle = handle,
		owner = handle.owner,
	}
	return handle
end

--[[
	Kết nối MỘT LẦN rồi tự ngắt (LEAK-003).
	Dùng cho các tín hiệu chỉ cần phản ứng lần đầu.
]]
function Registry.ConnectOnce(signal, handler, owner)
	local handle
	handle = Registry.Connect(signal, function(...)
		if handle ~= nil then
			handle:Disconnect()
		end
		return handler(...)
	end, owner)
	return handle
end

--[[
	Theo dõi một instance: khi nó rời khỏi cây (bị Destroy) thì tự ngắt
	mọi connection và xoá cache liên quan (LEAK-002).
]]
function Registry.Watch(instance, owner)
	if not Client_Guard.Alive(instance) then
		return nil
	end
	local ok, signal = Client_Guard.Run(SCOPE .. ":Watch", function()
		return instance:GetPropertyChangedSignal("Parent")
	end)
	if not ok or signal == nil then
		return nil
	end

	local id = newId()
	local conn = Registry.Connect(signal, function()
		-- Parent đổi -> kiểm tra còn trong cây không
		if not Client_Guard.InTree(instance) then
			Registry.DropInstance(instance)
			local entry = Registry.watchers[id]
			if entry ~= nil and entry.handle ~= nil then
				entry.handle:Disconnect()
			end
			Registry.watchers[id] = nil
		end
	end, owner or "watch")

	Registry.watchers[id] = { handle = conn, instance = instance }
	return id
end

-- Đăng ký instance do hệ thống tạo ra.
function Registry.Own(instance, owner)
	if not Client_Guard.Alive(instance) then
		return nil
	end
	local id = newId()
	Registry.owned[id] = {
		instance = instance,
		className = instance.ClassName,
		owner = owner or "anon",
	}
	return id
end

function Registry.Release(id)
	local entry = Registry.owned[id]
	if entry == nil then
		return false
	end
	Registry.owned[id] = nil
	-- CHỈ huỷ thứ hệ thống tạo ra, không đụng instance của game
	local ok = Client_Guard.Run(SCOPE .. ":Release", function()
		entry.instance:Destroy()
	end)
	return ok
end

-- Xoá cache/handle trỏ tới một instance đã chết.
function Registry.DropInstance(instance)
	for key, cached in pairs(Registry.cache) do
		if cached == instance then
			Registry.cache[key] = nil
		end
	end
end

--[[
	FindFirstChild CÓ CACHE và tự vô hiệu khi đối tượng bị huỷ.
	Trả về: instance hoặc nil.
]]
function Registry.Find(parent, name, className)
	if parent == nil or name == nil then
		return nil
	end
	local key = tostring(parent) .. "/" .. tostring(name) .. "/" .. tostring(className or "")
	local cached = Registry.cache[key]
	if cached ~= nil then
		-- Dùng InTree chứ không phải Alive: instance bị gỡ khỏi cây thì
		-- FindFirstChild không còn trả về nó, nên cache phải vô hiệu.
		if Client_Guard.InTree(cached) then
			return cached
		end
		Registry.cache[key] = nil
	end

	local ok, found = Client_Guard.Run(SCOPE .. ":Find", function()
		if className ~= nil then
			return parent:FindFirstChildOfClass(className)
		end
		return parent:FindFirstChild(name)
	end)
	if ok and found ~= nil then
		Registry.cache[key] = found
		return found
	end
	return nil
end

function Registry.ConnectionCount()
	local n = 0
	for _ in pairs(Registry.connections) do
		n += 1
	end
	return n
end

function Registry.OwnedCount()
	local n = 0
	for _ in pairs(Registry.owned) do
		n += 1
	end
	return n
end

function Registry.CacheCount()
	local n = 0
	for _ in pairs(Registry.cache) do
		n += 1
	end
	return n
end

function Registry.Stats()
	return {
		connections = Registry.ConnectionCount(),
		owned = Registry.OwnedCount(),
		cacheEntries = Registry.CacheCount(),
		watchers = (function()
			local n = 0
			for _ in pairs(Registry.watchers) do
				n += 1
			end
			return n
		end)(),
	}
end

-- Ngắt MỌI connection, huỷ MỌI instance do hệ thống tạo, xoá cache.
function Registry.Shutdown()
	local disconnected = 0
	for id, entry in pairs(Registry.connections) do
		if entry.handle ~= nil then
			entry.handle:Disconnect()
			disconnected += 1
		end
		Registry.connections[id] = nil
	end

	local released = 0
	for id, entry in pairs(Registry.owned) do
		if Registry.Release(id) then
			released += 1
		end
	end

	for id, entry in pairs(Registry.watchers) do
		if entry.handle ~= nil then
			entry.handle:Disconnect()
		end
		Registry.watchers[id] = nil
	end

	table.clear(Registry.cache)
	Shared_Log.Info(SCOPE, ("đã ngắt %d connection, huỷ %d instance do hệ thống tạo")
		:format(disconnected, released))
	return disconnected, released
end

function Registry.Reset()
	Registry.Shutdown()
	nextId = 0
end

return Registry
end,
	["Client/Core/Restore"] = function()
--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  RESTORE-001, RESTORE-002, RESTORE-003, RESTORE-004,
	  SAFE-005
	===== RALO.METHODS:END ===== --]]

--[[
	Core/Restore.luau
	Nhật ký "trước khi đổi" để có thể HOÀN TÁC từng property.
	Mỗi lần Safe.Set thành công với restore = true, ta ghi lại giá trị cũ.

	Đây là lý do script KHÔNG xoá instance: mọi thứ đều đảo ngược được.
]]

local Client_Guard = __RALO_REQUIRE("Client/Core/Guard")

local Restore = {}

Restore.entries = {}     -- { { instance, property, oldValue, stepId } }

--[[
	Ghi lại giá trị cũ TRƯỚC khi đổi.
	newValue (tuỳ chọn) là giá trị script SẼ đặt — cần để khi hoàn tác,
	Guard.Change có thể kiểm tra "giá trị hiện tại vẫn là cái ta đã đặt chứ?"
	và từ chối ghi đè nếu game/người dùng đã đổi nó (REC-002).
]]
function Restore.Record(instance, property, oldValue, stepId, newValue)
	Restore.entries[#Restore.entries + 1] = {
		instance = instance,
		property = property,
		oldValue = oldValue,
		stepId = stepId,
		newValue = newValue,
	}
	return #Restore.entries
end

function Restore.Count(): number
	return #Restore.entries
end

function Restore.CountByStep(stepId: string): number
	local n = 0
	for _, entry in Restore.entries do
		if entry.stepId == stepId then n += 1 end
	end
	return n
end

--[[
	Quên mọi bản ghi của một instance (RESTORE-004).

	Dùng khi instance đã bị huỷ: giữ tham chiếu tới nó vừa rò rỉ bộ nhớ
	vừa gây lỗi khi hoàn tác. Cull gọi hàm này mỗi lần khôi phục xong.
	Trả về số bản ghi đã xoá.
]]
function Restore.Forget(instance)
	if instance == nil then
		return 0
	end
	local removed = 0
	for i = #Restore.entries, 1, -1 do
		if Restore.entries[i].instance == instance then
			table.remove(Restore.entries, i)
			removed += 1
		end
	end
	return removed
end

--[[
	Hoàn tác theo thứ tự NGƯỢC (cái đổi sau thì khôi phục trước).

	setter: hàm ghi property, dạng (instance, property, value, opts) -> boolean.
	NẾU KHÔNG TRUYỀN thì mặc định dùng Guard.Change — đây là đường an toàn
	nhất vì Guard.Change có stale-guard (không ghi đè thay đổi mới của game).
	Trước đây hàm này BẮT BUỘC có setter, nên Pipeline.Restore() gọi
	Restore.All() không tham số sẽ sập. Đã sửa.

	Trả về: số property khôi phục thành công, số lần thất bại.
]]
function Restore.All(setter)
	local write = setter
	if write == nil then
		write = function(instance, property, value, opts)
			local status = Client_Guard.Change(instance, property, value, opts)
			return status == "applied" or status == "unchanged"
		end
	end

	local restored, failed = 0, 0
	for i = #Restore.entries, 1, -1 do
		local entry = Restore.entries[i]
		local ok = write(entry.instance, entry.property, entry.oldValue, {
			scope = "Restore:" .. tostring(entry.stepId),
			-- expect = giá trị script đã đặt; nếu game đã đổi thì Guard trả
			-- "stale" và KHÔNG ghi đè (REC-002).
			expect = entry.newValue,
		})
		if ok then
			restored += 1
			table.remove(Restore.entries, i)
		else
			failed += 1
		end
	end
	return restored, failed
end

function Restore.Reset()
	table.clear(Restore.entries)
end

return Restore
end,
	["Client/Core/Runner"] = function()
--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  REC-003
	===== RALO.METHODS:END ===== --]]

--[[
	Core/Runner.luau
	Thực thi kế hoạch. Mỗi bước:
	  1. báo trạng thái RUNNING cho UI,
	  2. gọi handler thật,
	  3. đọc KẾT QUẢ TRẢ VỀ của handler (không đoán),
	  4. ghi applied / skipped / failed + detail.

	Sai sót ở một bước KHÔNG làm sập cả pipeline: pcall bao quanh, bước đó
	đánh dấu failed và các bước sau vẫn chạy.
]]

local Util_Types = __RALO_REQUIRE("Shared/Types")
local Util_Log = __RALO_REQUIRE("Shared/Log")

local SCOPE = "Runner"

local Runner = {}

--[[
	options = {
		onStep  = function(step, index, total)  -- hook tiến trình cho UI
		onLog   = function(level, stepId, message)
		delayBetween = số giây nghỉ giữa các bước (mặc định 0)
		wait    = function(seconds)
	}
]]
function Runner.Execute(plan: any, options: any)
	options = options or {}
	local onStep = options.onStep or function() end
	local results = {}

	for index, step in plan.steps do
		step.status = Util_Types.STATUS_RUNNING
		onStep(step, index, plan.total)

		local handler = nil
		if not step.available then
			step.status = Util_Types.STATUS_SKIPPED
			step.detail = step.reason or "không khả dụng"
			Util_Log.Info(SCOPE, ("BỎ QUA [%s]: %s"):format(step.id, tostring(step.detail)))
		else
			handler = step.module and step.module[step.handler]
			if type(handler) ~= "function" then
				step.status = Util_Types.STATUS_FAILED
				step.detail = ("thiếu handler %s"):format(tostring(step.handler))
				Util_Log.Error(SCOPE, ("LỖI [%s]: %s"):format(step.id, step.detail))
				handler = nil
			end
		end

		if handler ~= nil then
			local startedAt = os.clock()
			-- Plan handlers đều là hàm tĩnh (step, profile), không phải method của module.
			local ok, payload = pcall(handler, step, plan.profile)
			step.handlerDurationMs = math.max(0, (os.clock() - startedAt) * 1000)
			if not ok then
				step.status = Util_Types.STATUS_FAILED
				step.detail = ("handler throw: %s"):format(tostring(payload))
				Util_Log.Error(SCOPE, ("LỖI [%s]: %s"):format(step.id, step.detail))
			else
				payload = payload or {}
				step.changes = payload.changes or 0
				step.detail = payload.detail or ""
				step.restored = payload.restoredValues or 0
				step.restorable = payload.restorable ~= false and step.restorable

				if step.changes > 0 then
					step.status = Util_Types.STATUS_APPLIED
				else
					step.status = Util_Types.STATUS_SKIPPED
					if step.detail == "" then
						step.detail = "không có đối tượng nào cần thay đổi"
					end
				end
				Util_Log.Info(SCOPE, ("%s [%s]: %d thay đổi — %s (%.3f ms thời gian handler)")
					:format(step.status == Util_Types.STATUS_APPLIED and "ÁP DỤNG" or "BỎ QUA",
						step.id, step.changes, step.detail, step.handlerDurationMs or 0))
			end
		end

		results[step.id] = step
		onStep(step, index, plan.total)

		if options.delayBetween and options.delayBetween > 0 and index < plan.total then
			(options.wait or function() end)(options.delayBetween)
		end
	end

	plan.results = results
	return results
end

function Runner.Tally(plan: any)
	local tally = {
		applied = 0, skipped = 0, failed = 0, changes = 0, total = plan.total,
		handlerDurationMs = 0, maxHandlerMs = 0, slowestStepId = nil,
	}
	for _, step in plan.steps do
		local stepDurationMs = tonumber(step.handlerDurationMs) or 0
		tally.handlerDurationMs += stepDurationMs
		if stepDurationMs > tally.maxHandlerMs then
			tally.maxHandlerMs = stepDurationMs
			tally.slowestStepId = step.id
		end
		if step.status == Util_Types.STATUS_APPLIED then
			tally.applied += 1
			tally.changes += step.changes or 0
		elseif step.status == Util_Types.STATUS_FAILED then
			tally.failed += 1
		else
			tally.skipped += 1
		end
	end
	return tally
end

return Runner
end,
	["Client/Core/Scheduler"] = function()
--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  BG-001, BG-002, BG-003, BG-004,
	  BG-005, BG-006, CPU-001, CPU-009,
	  EVT-001, FPS-001, FPS-004, HEAVY-005,
	  LEAK-004, LOOP-001, LOOP-002, LOOP-003,
	  LOOP-004, LOOP-006, LOOP-008, RAM-004,
	  RES-001, RES-006, START-001
	===== RALO.METHODS:END ===== --]]

--[[
	Client/Core/Scheduler.luau
	===== RALO.METHODS:LOOP-001, LOOP-004, BG-001, BG-003, BG-004, EVT-001, CPU-009 =====

	Một bộ lập lịch DUY NHẤT cho toàn hệ thống.

	Lý do tồn tại (nguyên nhân lag mà nó xử lý):
	  * Mỗi module tự mở `RunService.RenderStepped:Connect(...)` => N kết nối,
	    N lần gọi lại mỗi khung hình, không ai biết tổng chi phí là bao nhiêu.
	  * Mỗi module tự viết `while true do task.wait(1) ... end` => vô số thread
	    nền, không huỷ được, rò rỉ khi module bị nạp lại.

	Cách xử lý:
	  * Dùng chung một kết nối RunService.Heartbeat cho mọi tác vụ định kỳ;
	    không tạo thread/vòng lặp riêng cho từng module.
	  * Mỗi tác vụ khai báo: chu kỳ, độ ưu tiên; Scheduler áp ngân sách chung.
	  * Mỗi khung hình, Scheduler chạy theo ưu tiên và DỪNG khi vượt ngân sách
	    thời gian để chính công cụ tối ưu không trở thành nguồn lag mới.
	  * Huỷ tác vụ bằng handle, huỷ tất cả bằng Shutdown().
]]

local Client_Env = __RALO_REQUIRE("Client/Core/Env")
local Shared_Log = __RALO_REQUIRE("Shared/Log")

local SCOPE = "Scheduler"

local Scheduler = {}

Scheduler.tasks = {}          -- handle -> task
Scheduler.order = {}          -- danh sách handle theo thứ tự ưu tiên
Scheduler.frameConnection = nil
Scheduler.loopThread = nil
Scheduler.running = false
Scheduler.frameBudgetMs = 3.0 -- ngân sách mỗi khung hình cho RALO
Scheduler.lastFrameCostMs = 0
Scheduler.overruns = 0        -- số khung hình vượt ngân sách
Scheduler.executions = 0
Scheduler.errors = 0          -- số lần callback ném lỗi (không được nuốt im lặng)
Scheduler.lastError = nil

--[[
	Đồng hồ dùng cho KIỂM TRA NGÂN SÁCH. Mặc định nil -> dùng Client_Env.now().

	Lý do tách ra: trong Roblox, os.clock() là thời gian CPU THẬT nên đo
	được chi phí thật. Trong harness kiểm thử, os.clock được thay bằng đồng
	hồ ẢO (để test được logic 30 giây mà không chờ thật), nên nó không phản
	ánh chi phí CPU. Test cần bơm được một đồng hồ giả để kiểm chứng LOGIC
	cắt ngân sách; mã chạy thật vẫn dùng Client_Env.now().
]]
Scheduler.clockForBudget = nil

local function budgetNow()
	if Scheduler.clockForBudget ~= nil then
		return Scheduler.clockForBudget()
	end
	return Client_Env.now()
end

local nextHandle = 0

local function reindex()
	table.clear(Scheduler.order)
	for handle, task in pairs(Scheduler.tasks) do
		Scheduler.order[#Scheduler.order + 1] = handle
		_ = task
	end
	-- Ưu tiên cao chạy trước; cùng ưu tiên thì theo chu kỳ ngắn trước
	table.sort(Scheduler.order, function(a, b)
		local ta, tb = Scheduler.tasks[a], Scheduler.tasks[b]
		if ta.priority ~= tb.priority then
			return ta.priority > tb.priority
		end
		return ta.interval < tb.interval
	end)
end

--[[
	BG-006: đồng bộ connection với số task.
	Không còn task nào thì NGẮT kết nối Heartbeat — một connection chạy
	không vẫn tốn một lời gọi mỗi khung hình. Có task mới thì nối lại.
]]
local function syncConnection()
	local taskCount = Scheduler.TaskCount()
	if taskCount == 0 then
		if Scheduler.frameConnection ~= nil then
			pcall(function()
				Scheduler.frameConnection:Disconnect()
			end)
			Scheduler.frameConnection = nil
		end
		Scheduler.running = false
		return
	end
	if Scheduler.frameConnection == nil then
		Scheduler.running = false          -- buộc Start() nối lại
		Scheduler.Start()
	end
end

--[[
	Đăng ký tác vụ định kỳ.
	spec = {
		name      = "tên để log",
		interval  = giây giữa hai lần chạy (0 = mỗi khung hình),
		priority  = số càng lớn càng chạy trước (mặc định 0),
		callback  = function(dt, now) -> ()
		maxCalls  = giới hạn số lần chạy (nil = vô hạn)
	}
	Trả về handle { cancel = function() end, name, calls }
]]
function Scheduler.Schedule(spec)
	if type(spec) ~= "table" or type(spec.callback) ~= "function" then
		Shared_Log.Warn(SCOPE, "Schedule cần spec.callback là function")
		return nil
	end

	nextHandle += 1
	local handle = {
		id = nextHandle,
		name = spec.name or ("task#" .. nextHandle),
		calls = 0,
		cancelled = false,
	}
	function handle:Cancel()
		if self.cancelled then
			return false
		end
		self.cancelled = true
		Scheduler.tasks[self.id] = nil
		reindex()
		syncConnection()
		return true
	end
	-- Thống nhất interface với handle của Registry: cả hai đều có
	-- :Cancel() và :Disconnect(). Nếu không, code dọn dẹp gọi
	-- handle:Disconnect() trên handle Scheduler sẽ gọi vào nil và
	-- (nếu bọc pcall) IM LẶNG bỏ qua -> task rò rỉ vĩnh viễn.
	-- Đây là lỗi thật đã được gui.test.js phát hiện.
	handle.cancel = handle.Cancel
	handle.Disconnect = handle.Cancel
	handle.disconnect = handle.Cancel

	Scheduler.tasks[handle.id] = {
		handle = handle,
		interval = math.max(0, tonumber(spec.interval) or 0),
		priority = tonumber(spec.priority) or 0,
		callback = spec.callback,
		maxCalls = spec.maxCalls,
		nextDue = 0,
	}
	reindex()
	syncConnection()
	return handle
end

-- Tác vụ chạy đúng một lần vào khung hình kế tiếp.
function Scheduler.Defer(name, callback)
	local handle
	handle = Scheduler.Schedule({
		name = name,
		interval = 0,
		priority = 100,
		maxCalls = 1,
		callback = function()
			callback()
			if handle then
				handle:Cancel()
			end
		end,
	})
	return handle
end

function Scheduler.Start()
	if Scheduler.running then
		return true
	end
	local runService = Client_Env.GetService("RunService")
	if runService == nil or runService.Heartbeat == nil then
		Shared_Log.Warn(SCOPE, "không có RunService.Heartbeat -> scheduler không chạy")
		return false
	end

	Scheduler.running = true

	-- MỘT kết nối duy nhất cho toàn hệ thống (EVT-001, LOOP-001)
	Scheduler.frameConnection = runService.Heartbeat:Connect(function(deltaTime)
		Scheduler.Tick(deltaTime or 0)
	end)

	return true
end

--[[
	Một nhịp của scheduler. `nowSeconds` cho phép test bơm thời gian ảo.
	Trả về số tác vụ đã chạy trong nhịp này.
]]
function Scheduler.Tick(deltaTime, nowSeconds)
	local now = nowSeconds or Client_Env.now()
	local startedAt = budgetNow()
	local executed = 0

	-- Sao chép thứ tự để callback có quyền Cancel ngay trong lúc lặp
	local orderSnapshot = {}
	for index, handleId in Scheduler.order do
		orderSnapshot[index] = handleId
	end

	for _, handleId in orderSnapshot do
		local task = Scheduler.tasks[handleId]
		if task ~= nil and not task.handle.cancelled then
			if now >= task.nextDue then
				local ok, err = pcall(task.callback, deltaTime, now)
				if not ok then
					-- Lỗi được ĐẾM và GHI LOG, không bao giờ bị nuốt im lặng
					Scheduler.errors += 1
					Scheduler.lastError = ("%s: %s"):format(task.handle.name, tostring(err))
					Shared_Log.Warn(SCOPE, ("tác vụ '%s' lỗi: %s"):format(task.handle.name, tostring(err)))
				end
				task.handle.calls += 1
				executed += 1
				task.nextDue = now + task.interval

				if task.maxCalls ~= nil and task.handle.calls >= task.maxCalls then
					task.handle:Cancel()
				end
			end
		end

		-- Vượt ngân sách thì dừng, phần còn lại chờ khung hình sau (CPU-009)
		local elapsedMs = (budgetNow() - startedAt) * 1000
		if elapsedMs > Scheduler.frameBudgetMs then
			Scheduler.overruns += 1
			break
		end
	end

	Scheduler.lastFrameCostMs = (budgetNow() - startedAt) * 1000
	Scheduler.executions += executed
	return executed
end

function Scheduler.TaskCount()
	local n = 0
	for _ in pairs(Scheduler.tasks) do
		n += 1
	end
	return n
end

function Scheduler.Stats()
	return {
		tasks = Scheduler.TaskCount(),
		executions = Scheduler.executions,
		overruns = Scheduler.overruns,
		errors = Scheduler.errors,
		lastError = Scheduler.lastError,
		lastFrameCostMs = Scheduler.lastFrameCostMs,
		frameBudgetMs = Scheduler.frameBudgetMs,
		connections = Scheduler.frameConnection ~= nil and 1 or 0,
	}
end

-- Huỷ toàn bộ: ngắt kết nối, xoá tác vụ. Dùng khi tắt hệ thống.
function Scheduler.Shutdown()
	if Scheduler.frameConnection ~= nil then
		pcall(function()
			Scheduler.frameConnection:Disconnect()
		end)
		Scheduler.frameConnection = nil
	end
	table.clear(Scheduler.tasks)
	table.clear(Scheduler.order)
	Scheduler.running = false
	Scheduler.loopThread = nil
	Shared_Log.Info(SCOPE, "đã tắt scheduler và ngắt kết nối khung hình")
	return true
end

-- Chỉ dành cho test
function Scheduler.Reset()
	Scheduler.Shutdown()
	Scheduler.executions = 0
	Scheduler.overruns = 0
	Scheduler.errors = 0
	Scheduler.lastError = nil
	Scheduler.lastFrameCostMs = 0
	Scheduler.clockForBudget = nil
	nextHandle = 0
end

return Scheduler
end,
	["Client/Core/Spatial"] = function()
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
end,
	["Client/Optimizations/Effects"] = function()
--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  EFFECTS-001
	===== RALO.METHODS:END ===== --]]

--[[
	Optimizations/Effects.luau
	GIẢM CHI PHÍ EFFECT — không xoá effect.

	Sai lầm phổ biến của mấy script "anti lag" là `Destroy()` sạch
	ParticleEmitter/Beam/Trail. Cách đó phá gameplay (mất hiệu ứng kỹ năng,
	mất dấu vết đường đạn) và KHÔNG hoàn tác được.

	Cách làm ở đây:
	  * GIỚI HẠN Rate của emitter -> effect vẫn hiện, nhưng sinh ít hạt hơn.
	  * Beam/Trail/Decal mặc định GIỮ NGUYÊN; chỉ tắt khi người dùng bật cờ.
	  * Mọi giá trị cũ được ghi vào Restore để hoàn tác 100%.
]]

local Util_Safe = __RALO_REQUIRE("Shared/Safe")
local Util_Log = __RALO_REQUIRE("Shared/Log")
local Core_Restore = __RALO_REQUIRE("Client/Core/Restore")
local Opt_Scan = __RALO_REQUIRE("Client/Optimizations/Scan")

local SCOPE = "Effects"

local Effects = {}

local function change(instance: any, property: string, newValue: any, stepId: string, expect: any)
	local oldValue, readOk = Util_Safe.Get(instance, property)
	if not readOk then
		return false
	end
	if oldValue == newValue then
		return false
	end
	local ok = Util_Safe.Set(instance, property, newValue, { scope = SCOPE .. ":" .. stepId, expect = expect })
	if ok then
		-- Truyền newValue để khi hoàn tác, Guard.Change biết giá trị script
		-- đã đặt và TỪ CHỐI ghi đè nếu game đã đổi nó sau đó (REC-002).
		Core_Restore.Record(instance, property, oldValue, stepId, newValue)
	end
	return ok
end

function Effects.CapParticles(_step: any, profile: any)
	local rateCap = profile.effects.particleRateCap or 40

	local cappedRate, alreadyOk = 0, 0

	local stats = Opt_Scan.Descendants({
		maxScan = profile.effects.maxInstancesScanned or 3000,
		yieldEvery = 400,
		filter = function(instance)
			return instance.ClassName == "ParticleEmitter"
		end,
		onFound = function(instance)
			local touched = false

			local rate, okRate = Util_Safe.Get(instance, "Rate")
			if okRate and type(rate) == "number" and rate > rateCap then
				if change(instance, "Rate", rateCap, "effects.particles", rateCap) then
					cappedRate += 1
					touched = true
				end
			end

			if not touched then
				alreadyOk += 1
			end
			return touched
		end,
	})

	if stats.error then
		return { changes = 0, detail = "lỗi khi quét: " .. stats.error, restorable = false }
	end

	return {
		changes = cappedRate,
		detail = ("giới hạn Rate cho %d emitter; %d emitter vốn đã nhẹ; đã quét %d (khớp %d%s)")
			:format(cappedRate, alreadyOk, stats.scanned, stats.matched,
				stats.truncated and ", có cắt bớt" or ""),
	}
end

function Effects.ApplyOptionalEffects(_step: any, profile: any)
	local doBeams = profile.effects.disableBeams == true
	local doTrails = profile.effects.disableTrails == true
	local doDecals = profile.effects.dimDecals == true

	if not doBeams and not doTrails and not doDecals then
		return {
			changes = 0,
			detail = "giữ nguyên Beam/Trail/Decal theo cấu hình mặc định (ưu tiên giữ tính năng)",
		}
	end

	local beams, trails, decals = 0, 0, 0
	local stats = Opt_Scan.Descendants({
		maxScan = profile.effects.maxInstancesScanned or 3000,
		yieldEvery = 400,
		filter = function(instance)
			local cls = instance.ClassName
			return (doBeams and cls == "Beam")
				or (doTrails and cls == "Trail")
				or (doDecals and (cls == "Decal" or cls == "Texture"))
		end,
		onFound = function(instance)
			local cls = instance.ClassName
			if cls == "Beam" then
				if change(instance, "Enabled", false, "effects.optional", false) then
					beams += 1
					return true
				end
			elseif cls == "Trail" then
				if change(instance, "Enabled", false, "effects.optional", false) then
					trails += 1
					return true
				end
			else
				if change(instance, "Transparency", 1, "effects.optional", 1) then
					decals += 1
					return true
				end
			end
			return false
		end,
	})

	return {
		changes = beams + trails + decals,
		detail = ("tắt %d Beam, %d Trail, làm mờ %d Decal (đã quét %d)")
			:format(beams, trails, decals, stats.scanned),
	}
end

return Effects
end,
	["Client/Optimizations/Graphics"] = function()
--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  GRAPHICS-001, GRAPHICS-002, GRAPHICS-003
	===== RALO.METHODS:END ===== --]]

--[[
	Optimizations/Graphics.luau
	Giảm tải RENDER phía client. Tất cả đều là property client-writable
	trong Roblox Luau và đều được hoàn tác được (trừ QualityLevel vốn là
	cài đặt phiên, vẫn khôi phục được bằng cách ghi lại giá trị cũ).

	KHÔNG có thao tác nào ở đây đụng vào gameplay: không tắt va chạm vật thể
	chơi được, không xoá model, không tắt âm thanh gameplay.
]]

local Core_Env = __RALO_REQUIRE("Client/Core/Env")
local Util_Safe = __RALO_REQUIRE("Shared/Safe")
local Util_Log = __RALO_REQUIRE("Shared/Log")
local Core_Restore = __RALO_REQUIRE("Client/Core/Restore")
local Opt_Scan = __RALO_REQUIRE("Client/Optimizations/Scan")

local SCOPE = "Graphics"

local Graphics = {}

-- Ghi lại giá trị cũ rồi mới đổi; chỉ đếm khi đổi thật sự thành công.
local function change(instance: any, property: string, newValue: any, stepId: string, expect: any)
	local oldValue, readOk = Util_Safe.Get(instance, property)
	if not readOk then
		return false
	end
	if oldValue == newValue then
		return false                       -- đã ở sẵn trạng thái mong muốn
	end
	local ok = Util_Safe.Set(instance, property, newValue, {
		scope = SCOPE .. ":" .. stepId,
		expect = expect,
	})
	if ok then
		Core_Restore.Record(instance, property, oldValue, stepId, newValue)
	end
	return ok
end

function Graphics.ApplyQualityLevel(_step: any, profile: any)
	local lighting = Core_Env.GetService("Lighting")
	if lighting == nil then
		return { changes = 0, detail = "không truy cập được Lighting", restorable = false }
	end

	local target = math.clamp(math.floor(profile.graphics.qualityLevel or 8), 1, 10)
	local currentQuality, qualityReadable = Util_Safe.Get(lighting, "QualityLevel")
	-- Không bao giờ nâng đồ họa của máy yếu lên cao hơn mức người dùng đang dùng.
	if qualityReadable and type(currentQuality) == "number" then
		target = math.min(target, currentQuality)
	end

	local changed = 0
	if change(lighting, "QualityLevel", target, "graphics.quality", target) then
		changed += 1
	end
	-- Chỉ khóa chế độ tự động nếu chủ game chủ động bật tuỳ chọn này.
	if profile.graphics.lockQualityMode == true
		and change(lighting, "GraphicsQualityMode", false, "graphics.quality", false) then
		changed += 1
	end
	-- Technology: chỉ đổi khi người dùng chỉ định rõ (mặc định GIỮ NGUYÊN).
	local tech = profile.graphics.technology
	if tech ~= nil and change(lighting, "Technology", tech, "graphics.quality", tech) then
		changed += 1
	end

	local current = Util_Safe.Get(lighting, "QualityLevel")
	local modeNote = profile.graphics.lockQualityMode == true
		and "GraphicsQualityMode=false (đã bật tùy chọn khóa)"
		or "GraphicsQualityMode giữ nguyên"
	return {
		changes = changed,
		detail = ("QualityLevel -> %s (đang là %s), %s")
			:format(tostring(target), tostring(current), modeNote),
	}
end

function Graphics.ApplyTerrain(_step: any, profile: any)
	if profile.graphics.applyTerrainDecoration ~= true then
		return { changes = 0, detail = "mặc định giữ nguyên Terrain.Decoration" }
	end

	local workspace = Core_Env.GetService("Workspace")
	if workspace == nil then
		return { changes = 0, detail = "không truy cập được Workspace", restorable = false }
	end
	local terrain, ok = Util_Safe.Get(workspace, "Terrain")
	if not ok or terrain == nil then
		return { changes = 0, detail = "không có Terrain", restorable = false }
	end

	local target = profile.graphics.terrainDecoration == true
	local changed = 0
	if change(terrain, "Decoration", target, "graphics.terrain", target) then
		changed += 1
	end
	return {
		changes = changed,
		detail = ("Terrain.Decoration -> %s (chi tiết cỏ/đá nhỏ; địa hình vẫn giữ nguyên)")
			:format(tostring(target)),
	}
end

--[[
	Giảm tầm bóng đổ và tắt CastShadow cho part ở XA camera.
	Part gần vẫn giữ bóng -> hình ảnh tổng thể gần như không đổi.
]]
function Graphics.ApplyShadowBudget(step: any, profile: any)
	local lighting = Core_Env.GetService("Lighting")
	local workspace = Core_Env.GetService("Workspace")
	if lighting == nil or workspace == nil then
		return { changes = 0, detail = "thiếu Lighting/Workspace", restorable = false }
	end

	local changed = 0
	local distance = profile.graphics.shadowDistance or 0

	-- Ghi chú: ta KHÔNG đổi ShadowSoftness / ShadowColor / Ambient — những thứ
	-- đó làm thay đổi rõ rệt tông màu của game, trái với yêu cầu "giảm nhẹ nhàng".
	_ = lighting -- lighting được lấy để đảm bảo service tồn tại trước khi quét

	if distance <= 0 then
		return { changes = changed, detail = "shadowDistance = 0 nên giữ nguyên mọi CastShadow" }
	end

	local camera, camOk = Util_Safe.Get(workspace, "CurrentCamera")
	if not camOk or camera == nil then
		return { changes = changed, detail = "không có CurrentCamera -> không đo được khoảng cách" }
	end
	local camPos, posOk = Util_Safe.Get(camera, "CFrame")
	if not posOk or camPos == nil then
		return { changes = changed, detail = "không đọc được CFrame camera" }
	end

	local isRenderable = { Part = true, MeshPart = true, UnionOperation = true }
	local stats = Opt_Scan.Descendants({
		maxScan = profile.graphics.maxShadowTargets or profile.effects.maxInstancesScanned or 3000,
		yieldEvery = 400,
		root = workspace,
		filter = function(instance)
			return isRenderable[instance.ClassName] == true
		end,
		onFound = function(instance)
			local casting, okCast = Util_Safe.Get(instance, "CastShadow")
			if not okCast or casting ~= true then
				return false
			end
			local cf, okCf = Util_Safe.Get(instance, "CFrame")
			if not okCf or cf == nil then
				return false
			end
			local dist = (cf.Position - camPos.Position).Magnitude
			if dist < distance then
				return false
			end
			return change(instance, "CastShadow", false, step.id, false)
		end,
	})

	if stats.error then
		return { changes = changed, detail = "lỗi khi quét: " .. stats.error, restorable = false }
	end

	changed += stats.changed
	return {
		changes = changed,
		detail = ("tắt CastShadow cho %d part xa hơn %d stud (đã quét %d, khớp %d%s)")
			:format(stats.changed, distance, stats.scanned, stats.matched,
				stats.truncated and ", có cắt bớt" or ""),
	}
end

function Graphics.ApplyCharacter(_step: any, profile: any)
	local players = Core_Env.GetService("Players")
	if players == nil then
		return { changes = 0, detail = "không truy cập được Players", restorable = false }
	end
	local player, ok = Util_Safe.Get(players, "LocalPlayer")
	if not ok or player == nil then
		return { changes = 0, detail = "không có LocalPlayer", restorable = false }
	end
	local character = player.Character
	if character == nil then
		return { changes = 0, detail = "nhân vật chưa spawn" }
	end

	local changed = 0
	local notes = {}

	if profile.character.disableShadows then
		local descendants, dOk = pcall(function() return character:GetDescendants() end)
		if dOk then
			for _, instance in descendants do
				local cls = instance.ClassName
				if cls == "Part" or cls == "MeshPart" or cls == "Accessory" then
					if change(instance, "CastShadow", false, "graphics.character", false) then
						changed += 1
					end
				end
			end
			notes[#notes + 1] = "tắt bóng nhân vật"
		end
	end

	if profile.character.disableAutoScaling then
		local humanoid = character:FindFirstChildOfClass("Humanoid")
		if humanoid ~= nil then
			if change(humanoid, "AutomaticScalingEnabled", false, "graphics.character", false) then
				changed += 1
				notes[#notes + 1] = "tắt auto-scaling"
			end
		end
	end

	if #notes == 0 then
		return { changes = 0, detail = "không có gì để đổi trên nhân vật" }
	end
	return {
		changes = changed,
		detail = table.concat(notes, ", ") .. " (nhân vật và animation giữ nguyên)",
	}
end

--[[
	GHI CHÚ VỀ GIỚI HẠN FPS (FPS-005, trạng thái E trong danh mục):

	Phiên bản trước của dự án có hàm Graphics.ApplyFpsCap dùng
	`setrbxsetting("Render", "FrameRateMax", ...)`. Hàm đó ĐÃ BỊ XOÁ vì:

	  * `setrbxsetting` là API của executor, không tồn tại trong Roblox
	    Studio hay client chính thức. Dùng nó nghĩa là dự án nhắm tới
	    môi trường exploit — trái với phạm vi đã thống nhất (Studio +
	    game do bạn sở hữu, không executor).
	  * Không có API công khai nào cho phép LocalScript đổi FrameRateMax.

	Nếu bạn muốn giới hạn FPS, hãy tự chỉnh trong
	Settings -> Rendering của client Roblox. Script không làm thay được,
	và dự án không giả vờ làm được.
]]

return Graphics
end,
	["Client/Optimizations/Memory"] = function()
--[[
	Optimizations/Memory.luau
	Dọn bộ nhớ Luau và gom instance "mồ côi".

	Nguyên tắc KHÔNG XOÁ: instance mồ côi (không còn parent, không phải
	con của DataModel) được CHUYỂN về một folder lưu trữ trong
	CorePackages/ServerStorage thay vì Destroy(). Người dùng vẫn hoàn tác được
	bằng cách kéo chúng ra khỏi folder.

	GC: dùng collectgarbage("step", n) theo chu kỳ qua Scheduler chung — rẻ,
	không tạo thread riêng, và huỷ được khi hệ thống Shutdown.
]]

local Core_Env = __RALO_REQUIRE("Client/Core/Env")
local Core_Scheduler = __RALO_REQUIRE("Client/Core/Scheduler")
local Util_Safe = __RALO_REQUIRE("Shared/Safe")
local Util_Log = __RALO_REQUIRE("Shared/Log")

local SCOPE = "Memory"

local Memory = {}

Memory.gcHandle = nil
Memory.archiveFolder = nil
Memory.archived = 0

local function ensureArchiveFolder()
	if Memory.archiveFolder ~= nil then
		return Memory.archiveFolder
	end
	local game = Core_Env.game
	if game == nil then
		return nil
	end
	local holder, ok = Util_Safe.Get(game, "CorePackages")
	if not ok or holder == nil then
		holder = Util_Safe.Get(game, "ServerStorage")
	end
	if holder == nil then
		return nil
	end

	local folder = holder:FindFirstChild("RALO_Archive")
	if folder == nil then
		local okNew, created = pcall(function()
			local instance = Instance.new("Folder")
			instance.Name = "RALO_Archive"
			instance.Parent = holder
			return instance
		end)
		if not okNew then
			Util_Log.Warn(SCOPE, "không tạo được folder lưu trữ:", tostring(created))
			return nil
		end
		folder = created
	end
	Memory.archiveFolder = folder
	return folder
end

--[[
	Gom instance mồ côi. "Mồ côi" = instance có Parent == nil nhưng vẫn còn
	tham chiếu sống (thường do script tạo ra rồi bỏ quên). Ta chỉ xử lý
	những gì tìm được qua GetDescendants của các service chứa chúng,
	nên mặc định bước này chỉ báo cáo và hầu như không đổi gì —
	đúng bản chất, không phóng đại.
]]
function Memory.SweepOrphans(_step: any, profile: any)
	if not profile.memory.archiveOrphans then
		return { changes = 0, detail = "archiveOrphans = false", restorable = false }
	end

	local folder = ensureArchiveFolder()
	if folder == nil then
		return {
			changes = 0,
			detail = "không tạo được folder lưu trữ -> bỏ qua (không xoá gì cả)",
			restorable = false,
		}
	end

	-- Chỉ quét những container "rác" kinh điển: workspace.Debris,
	-- ReplicatedStorage/ServerStorage rỗng, và các instance tên trùng mẫu tạm.
	local game = Core_Env.game
	local moved = 0
	if game ~= nil then
		local workspace = Core_Env.GetService("Workspace")
		local debris = workspace and workspace:FindFirstChild("Debris")
		if debris ~= nil then
			local ok, children = pcall(function() return debris:GetChildren() end)
			if ok then
				for _, child in children do
					local okMove = pcall(function() child.Parent = folder end)
					if okMove then
						moved += 1
					end
				end
			end
		end
	end

	Memory.archived += moved
	return {
		changes = moved,
		detail = moved > 0
			and ("chuyển %d instance từ workspace.Debris vào CorePackages/RALO_Archive (không xoá)")
				:format(moved)
			or "không tìm thấy instance mồ côi trong các container rác — không có gì để dọn",
		restorable = false,
	}
end

--[[
	Bật vòng dọn GC theo chu kỳ. Trả về handle để StopGcLoop huỷ được.
]]
function Memory.StartGcLoop(_step: any, profile: any)
	local every = profile.memory.gcEverySeconds or 0
	if every <= 0 then
		return { changes = 0, detail = "gcEverySeconds = 0 nên không bật", restorable = false }
	end
	if collectgarbage == nil then
		return { changes = 0, detail = "runtime không có collectgarbage", restorable = false }
	end

	-- Nếu đã có vòng chạy sẵn thì không tạo vòng thứ hai.
	if Memory.gcHandle ~= nil then
		return { changes = 0, detail = "tác vụ GC đã chạy sẵn", restorable = false }
	end

	local stepKb = profile.memory.collectStepKb or 200
	local handle = Core_Scheduler.Schedule({
		name = "memory.gc",
		interval = every,
		priority = -40,
		callback = function()
			local ok, err = pcall(collectgarbage, "step", stepKb)
			if not ok then
				Util_Log.Warn(SCOPE, "collectgarbage step lỗi:", tostring(err))
			end
		end,
	})
	if handle == nil then
		return { changes = 0, detail = "không đăng ký được tác vụ GC", restorable = false }
	end

	Memory.gcHandle = handle
	return {
		changes = 1,
		detail = ("bật collectgarbage(\"step\", %d) mỗi %ds qua Scheduler")
			:format(stepKb, every),
		restorable = false,
	}
end

function Memory.StopGcLoop()
	local handle = Memory.gcHandle
	Memory.gcHandle = nil
	if handle == nil then
		return false
	end

	local ok, err = pcall(function()
		handle:Cancel()
	end)
	if ok then
		Util_Log.Info(SCOPE, "đã huỷ tác vụ GC định kỳ")
		return true
	end
	Util_Log.Warn(SCOPE, "không huỷ được tác vụ GC:", tostring(err))
	return false
end

return Memory
end,
	["Client/Optimizations/Physics"] = function()
--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  PHYSICS-001, PHYSICS-002
	===== RALO.METHODS:END ===== --]]

--[[
	Optimizations/Physics.luau
	Giảm chi phí vật lý phía client.

	LƯU Ý TRUNG THỰC: khác với các bước đồ hoạ, nhóm này CÓ đánh đổi cảm giác
	chơi — tắt làm mượt nội suy (InterpolationThrottling) giúp tiết kiệm CPU
	đáng kể trên máy yếu nhưng chuyển động vật thể từ xa sẽ "giật" hơn.
	Vì vậy `physics.enabled` MẶC ĐỊNH = false và bước này bị SKIP.

	Ngoài ra, `workspace.PhysicsSteppingMethod` / `InterpolationThrottling`
	thường bị khoá ghi ở client thường (chỉ server/Studio ghi được). Script
	không lách khoá: ghi không được thì báo "unsupported" chứ không giả vờ.
]]

local Core_Env = __RALO_REQUIRE("Client/Core/Env")
local Util_Safe = __RALO_REQUIRE("Shared/Safe")
local Core_Restore = __RALO_REQUIRE("Client/Core/Restore")

local Physics = {}

function Physics.ApplyThrottling(step: any, profile: any)
	if not profile.physics.enabled then
		return { changes = 0, detail = "physics.enabled = false (mặc định, vì có đánh đổi)", restorable = false }
	end

	local workspace = Core_Env.GetService("Workspace")
	if workspace == nil then
		return { changes = 0, detail = "không truy cập được Workspace", restorable = false }
	end

	local changed = 0
	local notes = {}
	local blocked = {}

	local throttle = profile.physics.interpolationThrottling
	if throttle ~= nil then
		local oldValue, readOk = Util_Safe.Get(workspace, "InterpolationThrottling")
		if not readOk then
			blocked[#blocked + 1] = "InterpolationThrottling (không đọc được)"
		elseif oldValue == throttle then
			notes[#notes + 1] = "InterpolationThrottling đã ở mức mong muốn"
		else
			local ok = Util_Safe.Set(workspace, "InterpolationThrottling", throttle, {
				scope = "Physics:" .. step.id, expect = throttle,
			})
			if ok then
				Core_Restore.Record(workspace, "InterpolationThrottling", oldValue, step.id, throttle)
				changed += 1
				notes[#notes + 1] = "InterpolationThrottling = " .. tostring(throttle)
			else
				blocked[#blocked + 1] = "InterpolationThrottling (client không được ghi)"
			end
		end
	end

	local stepping = profile.physics.physicsSteppingMethod
	if stepping ~= nil then
		local oldValue, readOk = Util_Safe.Get(workspace, "PhysicsSteppingMethod")
		if not readOk then
			blocked[#blocked + 1] = "PhysicsSteppingMethod (không đọc được)"
		elseif oldValue == stepping then
			notes[#notes + 1] = "PhysicsSteppingMethod đã ở mức mong muốn"
		else
			local ok = Util_Safe.Set(workspace, "PhysicsSteppingMethod", stepping, {
				scope = "Physics:" .. step.id, expect = stepping,
			})
			if ok then
				Core_Restore.Record(workspace, "PhysicsSteppingMethod", oldValue, step.id, stepping)
				changed += 1
				notes[#notes + 1] = "PhysicsSteppingMethod = " .. tostring(stepping)
			else
				blocked[#blocked + 1] = "PhysicsSteppingMethod (client không được ghi)"
			end
		end
	end

	local detail = #notes > 0 and table.concat(notes, "; ") or "không đổi được gì"
	if #blocked > 0 then
		detail ..= " | bị chặn: " .. table.concat(blocked, ", ")
	end

	return { changes = changed, detail = detail }
end

return Physics
end,
	["Client/Optimizations/Scan"] = function()
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
end,
	["Client/Ui/GuiPolicy"] = function()
--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  FPS-002, GUI-001, GUI-002, GUI-004,
	  GUI-005, GUI-006, GUI-009, GUI-011
	===== RALO.METHODS:END ===== --]]

--[[
	Client/Ui/GuiPolicy.luau
	===== RALO.METHODS:GUI-001, GUI-002, GUI-004, GUI-005, GUI-006, GUI-007,
	                    GUI-010, GUI-011 =====

	Các QUY TẮC bắt buộc cho GUI của chính hệ thống tối ưu.

	Lý do tệp này tồn tại: một công cụ chống lag mà GUI của nó gây lag
	thì phản tác dụng. Những lỗi kinh điển:
	  * ResetOnSpawn = true -> mỗi lần hồi sinh GUI bị dựng lại,
	    nối chồng connection (GUI-001).
	  * Tạo ScreenGui mới mỗi lần chạy -> nhiều lớp GUI chồng nhau (GUI-002).
	  * Ghi property GUI mỗi khung hình -> layout tính lại liên tục (GUI-004).
	  * Vẫn chạy tween/hoạt ảnh khi GUI đã ẩn -> tốn vô ích (GUI-006).
	  * Quên Destroy -> instance mồ côi tích tụ (GUI-011).

	Tất cả quy tắc ở đây đều có test tương ứng trong tests/.
]]

local Shared_Log = __RALO_REQUIRE("Shared/Log")
local Client_Guard = __RALO_REQUIRE("Client/Core/Guard")

local SCOPE = "GuiPolicy"

local GuiPolicy = {}

GuiPolicy.GUI_NAME = "RALO_OptimizerNotifier"
GuiPolicy.stats = { created = 0, reused = 0, blockedDuplicates = 0, destroyed = 0 }

--[[
	GUI-002 / GUI-001: lấy ScreenGui DUY NHẤT.
	Nếu đã tồn tại (do lần chạy trước) thì TÁI SỬ DỤNG, không tạo bản thứ hai.
	parent: nơi treo GUI (PlayerGui khi chạy LocalScript).
]]
function GuiPolicy.AcquireScreenGui(parent)
	if parent == nil then
		Shared_Log.Warn(SCOPE, "không có parent (PlayerGui) -> không tạo GUI")
		return nil
	end

	local ok, existing = Client_Guard.Run(SCOPE .. ":Find", function()
		return parent:FindFirstChild(GuiPolicy.GUI_NAME)
	end)
	if ok and existing ~= nil then
		GuiPolicy.stats.reused += 1
		Shared_Log.Info(SCOPE, "tái sử dụng ScreenGui đã có — không tạo bản trùng")
		return existing, true
	end

	local okNew, created = Client_Guard.Run(SCOPE .. ":New", function()
		local gui = Instance.new("ScreenGui")
		gui.Name = GuiPolicy.GUI_NAME
		gui.ResetOnSpawn = false          -- GUI-001: KHÔNG dựng lại khi hồi sinh
		gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
		gui.DisplayOrder = 50
		gui.IgnoreGuiInset = true
		gui.Enabled = true
		gui.Parent = parent
		return gui
	end)

	if not okNew or created == nil then
		Shared_Log.Warn(SCOPE, "không tạo được ScreenGui")
		return nil, false
	end

	GuiPolicy.stats.created += 1
	return created, false
end

--[[
	GUI-011: xoá GUI. CHỈ xoá đúng instance do hệ thống tạo
	(kiểm tra bằng Name), không đụng GUI của game.
]]
function GuiPolicy.DestroyScreenGui(gui)
	if gui == nil then
		return false
	end
	local ok, name = Client_Guard.Run(SCOPE .. ":CheckName", function()
		return gui.Name
	end)
	if not ok or name ~= GuiPolicy.GUI_NAME then
		Shared_Log.Warn(SCOPE, "từ chối xoá GUI không thuộc hệ thống: " .. tostring(name))
		return false
	end
	local okDestroy = Client_Guard.Run(SCOPE .. ":Destroy", function()
		gui:Destroy()
	end)
	if okDestroy then
		GuiPolicy.stats.destroyed += 1
	end
	return okDestroy
end

--[[
	GUI-004: ghi property CHỈ KHI giá trị thật sự khác.
	Tránh việc ghi lại cùng một giá trị mỗi khung hình khiến engine
	phải đánh dấu bẩn (dirty) và tính lại layout một cách vô ích.
	Trả về true nếu có ghi.
]]
function GuiPolicy.SetIfChanged(instance, property, value)
	if instance == nil then
		return false
	end
	local ok, current = Client_Guard.Run(SCOPE, function()
		return instance[property]
	end)
	if not ok then
		return false
	end
	if current == value then
		return false
	end
	local status = Client_Guard.Change(instance, property, value, { scope = SCOPE })
	return status == "applied"
end

--[[
	GUI-006 / GUI-010: có nên chạy hoạt ảnh không?
	Khi GUI đã ẩn thì KHÔNG chạy tween / không cập nhật gradient.
]]
function GuiPolicy.ShouldAnimate(gui, allowAnimation)
	if allowAnimation == false then
		return false
	end
	if gui == nil then
		return false
	end
	local ok, enabled = Client_Guard.Run(SCOPE, function()
		return gui.Enabled
	end)
	if not ok then
		return false
	end
	return enabled == true
end

-- GUI-005: đếm số instance trong cây GUI — dùng để giữ cây nhỏ.
function GuiPolicy.CountNodes(root)
	if root == nil then
		return 0
	end
	local ok, descendants = Client_Guard.Run(SCOPE, function()
		return root:GetDescendants()
	end)
	if not ok or descendants == nil then
		return 0
	end
	return #descendants + 1
end

function GuiPolicy.Stats()
	return {
		created = GuiPolicy.stats.created,
		reused = GuiPolicy.stats.reused,
		blockedDuplicates = GuiPolicy.stats.blockedDuplicates,
		destroyed = GuiPolicy.stats.destroyed,
		guiName = GuiPolicy.GUI_NAME,
	}
end

function GuiPolicy.Reset()
	GuiPolicy.stats = { created = 0, reused = 0, blockedDuplicates = 0, destroyed = 0 }
end

return GuiPolicy
end,
	["Client/Ui/Notifier"] = function()
--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  GUI-001, GUI-002, GUI-003, GUI-004, GUI-005, GUI-006, GUI-007, GUI-010,
	  GUI-011, GUI-012, GUI-013
	===== RALO.METHODS:END ===== --]]

--[[
	Client/Ui/Notifier.luau
	Bảng trạng thái nhỏ, không có menu điều khiển:
	  * cố định ở góc dưới bên phải, không nhận kéo / chọn / nút bấm;
	  * nền xám bán trong suốt, viền cầu vồng;
	  * hiển thị "đang giảm lag" và tiến trình 1–100%;
	  * tự ẩn sau 30 giây, dọn connection và instance do mình tạo.

	Phần trăm là hoạt ảnh thời lượng hiển thị, KHÔNG phải lời hứa về mức FPS.
	Nếu pipeline hoàn tất sớm, bảng chuyển sang trạng thái hoàn tất và phần trăm
	được chốt ở 100%. Nếu có lỗi, trạng thái lỗi được giữ nguyên (không báo thành công).
]]

local Client_Env = __RALO_REQUIRE("Client/Core/Env")
local Client_Guard = __RALO_REQUIRE("Client/Core/Guard")
local Client_Registry = __RALO_REQUIRE("Client/Core/Registry")
local Client_Scheduler = __RALO_REQUIRE("Client/Core/Scheduler")
local Shared_Log = __RALO_REQUIRE("Shared/Log")
local Ui_GuiPolicy = __RALO_REQUIRE("Client/Ui/GuiPolicy")
local Ui_Theme = __RALO_REQUIRE("Client/Ui/Theme")
local Ui_Widget = __RALO_REQUIRE("Client/Ui/Widget")

local SCOPE = "Notifier"

local Notifier = {}
Notifier.__index = Notifier

Notifier.instance = nil
Notifier.DEFAULTS = {
	title = "TỐI ƯU HIỆU NĂNG",
	status = "đang giảm lag",
	done = "Đã giảm lag xong",
	failed = "Tối ưu gặp lỗi — xem Output",
	durationSeconds = 30,
	fadeSeconds = 0.45,
	slideOffset = 70,
	width = 288,
	marginRight = 16,
	marginBottom = 16,
	backgroundAlpha = 0.42,
	cornerRadius = 10,
	borderWidth = 2,
	rainbowSpeed = 0.35,	-- vòng/giây; chỉ cập nhật 10 lần/giây
	updateInterval = 0.1,
}

function Notifier.Get()
	return Notifier.instance
end

-- Kẹp phần trăm vào 0..100. Không để giá trị bất thường tràn khỏi thanh.
function Notifier.ClampPercent(value)
	local n = tonumber(value)
	if n == nil or n ~= n then
		return 0
	end
	if n < 0 then
		return 0
	end
	if n > 100 then
		return 100
	end
	return math.floor(n + 0.5)
end

-- Dựng bảng trạng thái. `options.parent` là PlayerGui.
function Notifier.Build(options)
	options = options or {}

	if Notifier.instance ~= nil then
		Shared_Log.Info(SCOPE, "bảng đã tồn tại — dùng lại, không tạo bản trùng")
		return Notifier.instance
	end

	local profile = options.profile or {}
	local guiProfile = profile.gui or {}

	local self = setmetatable({}, Notifier)
	self.settings = {
		title = Notifier.DEFAULTS.title,
		status = Notifier.DEFAULTS.status,
		done = Notifier.DEFAULTS.done,
		failed = Notifier.DEFAULTS.failed,
		durationSeconds = math.max(0, tonumber(guiProfile.durationSeconds)
			or Notifier.DEFAULTS.durationSeconds),
		fadeSeconds = math.max(0.05, tonumber(guiProfile.fadeSeconds) or Notifier.DEFAULTS.fadeSeconds),
		slideOffset = math.max(0, tonumber(guiProfile.slideOffset) or Notifier.DEFAULTS.slideOffset),
		width = math.max(180, tonumber(guiProfile.width) or Notifier.DEFAULTS.width),
		marginRight = math.max(0, tonumber(guiProfile.marginRight) or Notifier.DEFAULTS.marginRight),
		marginBottom = math.max(0, tonumber(guiProfile.marginBottom) or Notifier.DEFAULTS.marginBottom),
		backgroundAlpha = math.clamp(tonumber(guiProfile.backgroundAlpha)
			or Notifier.DEFAULTS.backgroundAlpha, 0, 1),
		cornerRadius = math.max(0, tonumber(guiProfile.cornerRadius) or Notifier.DEFAULTS.cornerRadius),
		borderWidth = math.max(1, tonumber(guiProfile.borderWidth) or Notifier.DEFAULTS.borderWidth),
		rainbowSpeed = math.max(0, tonumber(guiProfile.rainbowSpeed) or Notifier.DEFAULTS.rainbowSpeed),
		updateInterval = math.max(0.05, tonumber(guiProfile.updateInterval)
			or Notifier.DEFAULTS.updateInterval),
		enabled = guiProfile.enabled ~= false,
	}

	self.percent = 1
	self.elapsed = 0
	self.startedAt = Client_Env.now()
	self.statusText = self.settings.status
	self.hiding = false
	self.hidden = false
	self.finished = false
	self.verdict = nil
	self.handles = {}

	if not self.settings.enabled then
		Shared_Log.Info(SCOPE, "gui.enabled = false -> không dựng bảng")
		return nil
	end

	local screenGui, reused = Ui_GuiPolicy.AcquireScreenGui(options.parent)
	if screenGui == nil then
		Shared_Log.Warn(SCOPE, "không có PlayerGui -> bỏ qua bảng; pipeline vẫn chạy")
		return nil
	end
	self.screenGui = screenGui
	self.reused = reused

	self.frame = self:_BuildFrame(screenGui)
	if self.frame == nil then
		if not reused then
			Ui_GuiPolicy.DestroyScreenGui(screenGui)
		end
		return nil
	end

	Notifier.instance = self
	self:_Wire()
	self:_Render()

	Shared_Log.Info(SCOPE, ("bảng trạng thái đã dựng (%s), %d node, tự ẩn sau %ds")
		:format(reused and "dùng lại ScreenGui" or "ScreenGui mới",
			Ui_GuiPolicy.CountNodes(screenGui), self.settings.durationSeconds))
	return self
end

-- Chỉ có nhãn trạng thái, thanh tiến trình và phần trăm; không tạo menu/nút bấm.
function Notifier:_BuildFrame(screenGui)
	local s = self.settings

	local frame = Ui_Widget.New("Frame", {
		Name = "RALO_Panel",
		AnchorPoint = Ui_Theme.AnchorPoint,
		Position = UDim2.new(1, -s.marginRight, 1, -s.marginBottom),
		Size = UDim2.new(0, s.width, 0, 96),
		BackgroundColor3 = Ui_Theme.Background,
		BackgroundTransparency = s.backgroundAlpha,
		BorderSizePixel = 0,
		Active = false,		-- GUI-010: không nhận thao tác kéo
		Selectable = false,
		ZIndex = 2,
	}, screenGui)
	if frame == nil then
		return nil
	end
	self.frame = frame
	Ui_Widget.Corners(frame, UDim.new(0, s.cornerRadius))

	local stroke = Ui_Widget.Stroke(frame, Color3.fromRGB(255, 80, 80), s.borderWidth, 0)
	self.stroke = stroke
	self.gradient = Ui_Widget.New("UIGradient", {
		Rotation = 0,
		Color = Ui_Theme.RainbowSequence(0),
	}, stroke)

	Ui_Widget.Padding(frame, 10)
	Ui_Widget.List(frame, 4)

	self.titleLabel = Ui_Widget.Text(frame, {
		Name = "Title",
		Text = s.title,
		Font = Ui_Theme.FontBold,
		TextSize = 14,
		TextColor3 = Ui_Theme.TextPrimary,
		Size = UDim2.new(1, 0, 0, 18),
		LayoutOrder = 1,
	})

	self.statusLabel = Ui_Widget.Text(frame, {
		Name = "Status",
		Text = s.status,
		Font = Ui_Theme.Font,
		TextSize = 12,
		TextColor3 = Ui_Theme.TextSecondary,
		Size = UDim2.new(1, 0, 0, 14),
		LayoutOrder = 2,
	})

	self.track = Ui_Widget.New("Frame", {
		Name = "ProgressTrack",
		BackgroundColor3 = Ui_Theme.Track,
		BackgroundTransparency = 0.2,
		BorderSizePixel = 0,
		Size = UDim2.new(1, 0, 0, 8),
		LayoutOrder = 3,
	}, frame)
	Ui_Widget.Corners(self.track, UDim.new(1, 0))

	self.fill = Ui_Widget.New("Frame", {
		Name = "ProgressFill",
		BackgroundColor3 = Ui_Theme.ProgressFill,
		BorderSizePixel = 0,
		Size = UDim2.new(0.01, 0, 1, 0),
		ZIndex = 3,
	}, self.track)
	Ui_Widget.Corners(self.fill, UDim.new(1, 0))

	self.percentLabel = Ui_Widget.Text(frame, {
		Name = "Percent",
		Text = "1%",
		Font = Ui_Theme.FontBold,
		TextSize = 13,
		TextColor3 = Ui_Theme.TextPrimary,
		Size = UDim2.new(1, 0, 0, 14),
		LayoutOrder = 4,
	})

	return frame
end

function Notifier:_Wire()
	self.tweenService = Client_Env.GetService("TweenService")

	-- Không chạy một callback mỗi frame: 10 lần/giây là đủ cho thanh và viền,
	-- đồng hồ vẫn dựa trên thời gian thực nên thời lượng không bị kéo dài.
	local handle = Client_Scheduler.Schedule({
		name = "notifier.animate",
		interval = self.settings.updateInterval,
		priority = -30,
		callback = function(deltaTime, now)
			self:_Tick(deltaTime, now)
		end,
	})
	if handle ~= nil then
		self.handles[#self.handles + 1] = handle
	end
end

-- Đồng hồ hiển thị và viền cầu vồng; callback chạy tối đa 10 lần/giây.
function Notifier:_Tick(_deltaTime, now)
	if self.hidden or self.hiding then
		return
	end
	if not Ui_GuiPolicy.ShouldAnimate(self.screenGui, true) then
		return
	end

	local currentTime = tonumber(now) or Client_Env.now()
	self.elapsed = math.max(self.elapsed, currentTime - self.startedAt)

	if not self.finished and self.verdict ~= "error" then
		if self.settings.durationSeconds > 0 then
			local timedPercent = (self.elapsed / self.settings.durationSeconds) * 100
			self.percent = math.max(1, Notifier.ClampPercent(timedPercent))
		else
			self.percent = 100
		end
	end

	self.hue = (self.elapsed * self.settings.rainbowSpeed) % 1
	if self.gradient ~= nil then
		Ui_GuiPolicy.SetIfChanged(self.gradient, "Color", Ui_Theme.RainbowSequence(self.hue))
	end
	self:_Render()

	if self.settings.durationSeconds > 0 and self.elapsed >= self.settings.durationSeconds then
		self:Hide()
	end
end

function Notifier:_Render()
	if self.frame == nil then
		return
	end

	local percent = math.max(1, Notifier.ClampPercent(self.percent))
	if self.statusLabel ~= nil then
		Ui_GuiPolicy.SetIfChanged(self.statusLabel, "Text", self.statusText or self.settings.status)
		local color = Ui_Theme.TextSecondary
		if self.verdict == "error" then
			color = Ui_Theme.TextError
		elseif self.finished then
			color = Ui_Theme.TextSuccess
		end
		Ui_GuiPolicy.SetIfChanged(self.statusLabel, "TextColor3", color)
	end
	if self.percentLabel ~= nil then
		Ui_GuiPolicy.SetIfChanged(self.percentLabel, "Text", ("%d%%"):format(percent))
	end
	if self.fill ~= nil then
		Ui_GuiPolicy.SetIfChanged(self.fill, "Size", UDim2.new(percent / 100, 0, 1, 0))
	end
end

-- Kết quả chi tiết được ghi trong Output; trên bảng chỉ đổi trạng thái, không có menu.
function Notifier:SetResults(lines, verdict)
	if self.frame == nil then
		return false
	end

	self.verdict = verdict
	self.finished = verdict ~= "error"
	self.resultLines = lines
	if verdict == "error" then
		self.statusText = self.settings.failed
	else
		self.statusText = self.settings.done
		self.percent = 100
	end
	self:_Render()
	return true
end

-- Trượt xuống và mờ dần; nếu TweenService lỗi thì dọn ngay.
function Notifier:Hide()
	if self.hiding or self.hidden then
		return false
	end
	self.hiding = true

	local settings = self.settings
	local done = false
	local function finish()
		if done then
			return
		end
		done = true
		self:_Cleanup()
	end

	if self.tweenService ~= nil and self.frame ~= nil then
		local ok, tween = Client_Guard.Run(SCOPE .. ":Tween", function()
			return self.tweenService:Create(self.frame,
				TweenInfo.new(settings.fadeSeconds, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
				{
					Position = UDim2.new(1, -settings.marginRight,
						1, -settings.marginBottom + settings.slideOffset),
					BackgroundTransparency = 1,
				})
		end)
		if ok and tween ~= nil then
			local completed = Client_Registry.Connect(tween.Completed, function()
				finish()
			end, "notifier.tween")
			if completed ~= nil then
				self.handles[#self.handles + 1] = completed
			end

			Client_Guard.Run(SCOPE .. ":Fade", function()
				for _, label in { self.titleLabel, self.statusLabel, self.percentLabel } do
					if label ~= nil then
						self.tweenService:Create(label,
							TweenInfo.new(settings.fadeSeconds),
							{ TextTransparency = 1 }):Play()
					end
				end
				if self.track ~= nil then
					self.tweenService:Create(self.track,
						TweenInfo.new(settings.fadeSeconds),
						{ BackgroundTransparency = 1 }):Play()
				end
				if self.fill ~= nil then
					self.tweenService:Create(self.fill,
						TweenInfo.new(settings.fadeSeconds),
						{ BackgroundTransparency = 1 }):Play()
				end
				if self.stroke ~= nil then
					self.tweenService:Create(self.stroke,
						TweenInfo.new(settings.fadeSeconds),
						{ Transparency = 1 }):Play()
				end
			end)
			Client_Guard.Run(SCOPE .. ":Play", function()
				tween:Play()
			end)
			return true
		end
	end

	finish()
	return true
end

-- Dọn chỉ những connection/instance bảng đã tạo.
function Notifier:_Cleanup()
	self.hidden = true
	for _, handle in ipairs(self.handles) do
		Client_Guard.Run(SCOPE .. ":Disconnect", function()
			handle:Disconnect()
		end)
	end
	table.clear(self.handles)

	if self.screenGui ~= nil and not self.reused then
		Ui_GuiPolicy.DestroyScreenGui(self.screenGui)
	elseif self.frame ~= nil then
		Client_Guard.Run(SCOPE .. ":RemoveFrame", function()
			self.frame:Destroy()
		end)
	end

	self.frame = nil
	self.screenGui = nil
	Notifier.instance = nil
	Shared_Log.Info(SCOPE, "bảng đã ẩn và dọn sạch connection / instance")
	return true
end

function Notifier:Destroy()
	if self.hiding or self.hidden then
		return true
	end
	self.hiding = true
	return self:_Cleanup()
end

function Notifier:State()
	return {
		percent = Notifier.ClampPercent(self.percent),
		elapsed = self.elapsed,
		hidden = self.hidden,
		hiding = self.hiding,
		finished = self.finished,
		verdict = self.verdict,
		status = self.statusText,
		connections = #self.handles,
		nodes = self.screenGui ~= nil and Ui_GuiPolicy.CountNodes(self.screenGui) or 0,
		reused = self.reused == true,
	}
end

function Notifier.Reset()
	local current = Notifier.instance
	if current ~= nil then
		current:Destroy()
	end
	Notifier.instance = nil
end

return Notifier
end,
	["Client/Ui/Progress"] = function()
--[[
	Ui/Progress.luau
	Mô hình tiến trình nội bộ của Pipeline, tách khỏi bảng trạng thái để unit test.
	Nó theo dõi pha, bước đã chạy và số liệu trạng thái, nhưng không điều khiển UI.
	Notifier dùng đồng hồ thời lượng riêng để vẽ 1–100% và tự ẩn sau 30 giây.
]]

local Util_Types = __RALO_REQUIRE("Shared/Types")

local Progress = {}
Progress.__index = Progress

local VALID = {
	[Util_Types.STATUS_PENDING] = true,
	[Util_Types.STATUS_RUNNING] = true,
	[Util_Types.STATUS_APPLIED] = true,
	[Util_Types.STATUS_SKIPPED] = true,
	[Util_Types.STATUS_FAILED] = true,
}

function Progress.New(total: number)
	local self = setmetatable({}, Progress)
	self.total = math.max(0, math.floor(total or 0))
	self.current = 0
	self.statuses = table.create(self.total, Util_Types.STATUS_PENDING)
	for i = 1, self.total do
		self.statuses[i] = Util_Types.STATUS_PENDING
	end
	self.phase = Util_Types.PHASE_IDLE
	self.message = ""
	self.pinned = false
	self.Changed = Instance.new("BindableEvent")
	return self
end

function Progress.Emit(self)
	self.Changed:Fire({
		current = self.current,
		total = self.total,
		fraction = self.total > 0 and (self.current / self.total) or 0,
		percent = self.total > 0 and math.floor((self.current / self.total) * 100 + 0.5) or 0,
		statuses = self.statuses,
		phase = self.phase,
		message = self.message,
		pinned = self.pinned,
		counts = Progress.Counts(self),
	})
end

function Progress.SetPhase(self, phase: string, message: string?)
	self.phase = phase
	self.message = message or self.message
	Progress.Emit(self)
end

function Progress.SetMessage(self, message: string)
	self.message = message
	Progress.Emit(self)
end

function Progress.SetPinned(self, pinned: boolean)
	self.pinned = pinned == true
	Progress.Emit(self)
end

function Progress.Mark(self, index: number, status: string, message: string?)
	if index < 1 or index > self.total then
		return
	end
	if not VALID[status] then
		return
	end
	self.statuses[index] = status
	if status ~= Util_Types.STATUS_RUNNING and status ~= Util_Types.STATUS_PENDING then
		self.current += 1
	end
	if message then
		self.message = message
	end
	Progress.Emit(self)
end

function Progress.Counts(self)
	local counts = {
		pending = 0, running = 0, applied = 0, skipped = 0, failed = 0,
	}
	for _, status in self.statuses do
		if counts[status] ~= nil then
			counts[status] += 1
		end
	end
	return counts
end

function Progress.Fraction(self): number
	if self.total <= 0 then return 0 end
	return self.current / self.total
end

function Progress.Destroy(self)
	if self.Changed then
		self.Changed:Destroy()
		self.Changed = nil
	end
end

return Progress
end,
	["Client/Ui/Theme"] = function()
--[[
	Ui/Theme.luau
	Bảng màu và hằng số giao diện.

	Yêu cầu giao diện:
	  * viền cầu vồng, tạo ColorSequence hợp lệ cho UIGradient;
	  * nền xám đậm bán trong suốt;
	  * cố định ở góc dưới bên phải.
]]

local Util_Hsv = __RALO_REQUIRE("Shared/Hsv")

local Theme = {}

Theme.Background = Color3.fromRGB(46, 46, 51)
Theme.BackgroundAlpha = 0.42
Theme.PanelBackground = Color3.fromRGB(24, 24, 28)
Theme.PanelAlpha = 0.45
Theme.TextPrimary = Color3.fromRGB(240, 240, 245)
Theme.TextSecondary = Color3.fromRGB(190, 192, 202)
Theme.TextSuccess = Color3.fromRGB(126, 231, 135)
Theme.TextWarning = Color3.fromRGB(255, 208, 110)
Theme.TextError = Color3.fromRGB(255, 122, 122)
Theme.Track = Color3.fromRGB(60, 60, 68)
Theme.ProgressFill = Color3.fromRGB(126, 231, 135)

Theme.CornerRadius = UDim.new(0, 10)
Theme.Font = Enum.Font.GothamMedium
Theme.FontBold = Enum.Font.GothamBold

Theme.AnchorPoint = Vector2.new(1, 1)
Theme.Position = UDim2.new(1, -16, 1, -16)

Theme.RainbowStops = 8
Theme.RainbowSaturation = 0.85
Theme.RainbowValue = 1.0

function Theme.RainbowColors(hueOffset: number): { Color3 }
	local colors = {}
	local stops = Util_Hsv.RainbowStops(Theme.RainbowStops)
	for index, base in stops do
		local hue = (base + hueOffset) % 1
		local r, g, b = Util_Hsv.ToRgb(hue, Theme.RainbowSaturation, Theme.RainbowValue)
		colors[index] = Color3.new(r, g, b)
	end
	return colors
end

-- Roblox UIGradient nhận ColorSequenceKeypoint, không bảng Color3 thuần.
function Theme.RainbowSequence(hueOffset: number): ColorSequence
	local colors = Theme.RainbowColors(hueOffset)
	local keypoints = {}
	local lastIndex = #colors
	for index, color in ipairs(colors) do
		local time = (index - 1) / math.max(1, lastIndex - 1)
		keypoints[index] = ColorSequenceKeypoint.new(time, color)
	end
	return ColorSequence.new(keypoints)
end

function Theme.StatusColor(status: string): Color3
	if status == "applied" then return Theme.TextSuccess end
	if status == "failed" then return Theme.TextError end
	if status == "running" then return Theme.TextWarning end
	if status == "skipped" then return Theme.TextSecondary end
	return Theme.TextSecondary
end

function Theme.StatusIcon(status: string): string
	if status == "applied" then return "✔" end
	if status == "failed" then return "✖" end
	if status == "running" then return "…" end
	if status == "skipped" then return "–" end
	return "○"
end

return Theme
end,
	["Client/Ui/Widget"] = function()
--[[
	Ui/Widget.luau
	Lớp dựng giao diện mỏng. Mọi Instance đều đi qua Widget.New để:
	  * gán property theo bảng khai báo (dễ đọc, dễ sửa),
	  * gắn sẵn UICorner/UIListLayout khi cần,
	  * pcall toàn bộ -> UI lỗi không bao giờ làm sập pipeline tối ưu.
]]

local Util_Safe = __RALO_REQUIRE("Shared/Safe")
local Util_Log = __RALO_REQUIRE("Shared/Log")
local Ui_Theme = __RALO_REQUIRE("Client/Ui/Theme")

local SCOPE = "Widget"

local Widget = {}

function Widget.New(className: string, props: any, parent: any): any
	local ok, instance = pcall(function()
		return Instance.new(className)
	end)
	if not ok then
		Util_Log.Error(SCOPE, "không tạo được", className, tostring(instance))
		return nil
	end

	if type(props) == "table" then
		for key, value in props do
			instance[key] = value
		end
	end
	if parent ~= nil then
		instance.Parent = parent
	end
	return instance
end

function Widget.Corners(parent: any, radius: UDim?): any
	return Widget.New("UICorner", { CornerRadius = radius or Ui_Theme.CornerRadius }, parent)
end

function Widget.Stroke(parent: any, color: Color3, thickness: number, transparency: number): any
	return Widget.New("UIStroke", {
		Color = color,
		Thickness = thickness or 1,
		Transparency = transparency or 0.55,
		ApplyStrokeMode = Enum.ApplyStrokeMode.Border,
	}, parent)
end

function Widget.List(parent: any, padding: number, alignment: any): any
	return Widget.New("UIListLayout", {
		Padding = UDim.new(0, padding or 4),
		SortOrder = Enum.SortOrder.LayoutOrder,
		HorizontalAlignment = Enum.HorizontalAlignment.Center,
		VerticalAlignment = alignment or Enum.VerticalAlignment.Top,
	}, parent)
end

function Widget.Padding(parent: any, all: number): any
	return Widget.New("UIPadding", {
		PaddingTop = UDim.new(0, all),
		PaddingBottom = UDim.new(0, all),
		PaddingLeft = UDim.new(0, all),
		PaddingRight = UDim.new(0, all),
	}, parent)
end

function Widget.Text(parent: any, props: any): any
	local defaults = {
		BackgroundTransparency = 1,
		Font = Ui_Theme.Font,
		TextColor3 = Ui_Theme.TextPrimary,
		TextSize = 13,
		TextXAlignment = Enum.TextXAlignment.Left,
		TextYAlignment = Enum.TextYAlignment.Center,
		TextWrapped = false,
		RichText = true,
	}
	if type(props) == "table" then
		for key, value in props do
			defaults[key] = value
		end
	end
	return Widget.New("TextLabel", defaults, parent)
end

function Widget.Button(parent: any, props: any): any
	local defaults = {
		BackgroundColor3 = Ui_Theme.PanelBackground,
		BackgroundTransparency = 0.35,
		AutoButtonColor = true,
		Font = Ui_Theme.FontBold,
		TextColor3 = Ui_Theme.TextPrimary,
		TextSize = 14,
	}
	if type(props) == "table" then
		for key, value in props do
			defaults[key] = value
		end
	end
	local button = Widget.New("TextButton", defaults, parent)
	if button then
		Widget.Corners(button, UDim.new(0, 8))
	end
	return button
end

--[[
	Ghi property an toàn, dùng cho các cập nhật động (kích thước, transparency...)
	nơi ta không muốn một property bị khoá làm hỏng cả khung.
]]
function Widget.Set(instance: any, key: string, value: any): boolean
	local ok = Util_Safe.Set(instance, key, value, { scope = SCOPE })
	return ok
end

return Widget
end,
	["Shared/Config"] = function()
--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  CFG-001, CFG-002, CFG-004, CFG-006, MEAS-004, RES-004
	===== RALO.METHODS:END ===== --]]

--[[
	Shared/Config.luau
	===== RALO.METHODS:CFG-001, CFG-002, CFG-004, MEAS-004, RES-004 =====

	KHO CẤU HÌNH TRUNG TÂM. Mọi module đọc thông số từ đây, không module
	nào giữ hằng số riêng. Người dùng chỉ cần sửa bảng PROFILE.

	Ba nguyên tắc thiết kế (không ngoại lệ):
	  1. GIỮ NGUYÊN GAMEPLAY — không có tuỳ chọn nào tắt gameplay, tắt âm
	     thanh gameplay, xoá nhân vật/vật phẩm, hay đổi thông số gameplay
	     để đổi lấy FPS.
	  2. ĐỒ HOẠ GIẢM NHẸ — mặc định là mức "light": chỉ hạ chất lượng ở mức
	     vừa phải, giới hạn hạt chứ không xoá hiệu ứng. KHÔNG BAO GIỜ tự
	     chuyển về mức đồ hoạ thấp nhất.
	  3. MỌI THAY ĐỔI ĐỀU ĐẢO NGƯỢC ĐƯỢC — mỗi mục đồ hoạ đều có cặp
	     "áp dụng / khôi phục" thông qua Client/Core/Restore.

	Môi trường đích: Roblox Studio + Rojo, game do chính bạn sở hữu.
	Dự án KHÔNG dùng executor, không dùng setrbxsetting, không đụng
	bất kỳ cơ chế bảo vệ nào.
]]

local Config = {}

Config.VERSION = "2.0.0"
Config.NAME = "Roblox Anti-Lag Optimizer"

-- Bậc tối ưu: "light" (mặc định) | "balanced" | "off"
Config.DEFAULT_MODE = "light"

--[[
	PROFILE — toàn bộ thông số có thể chỉnh.
	Cấu trúc được Guard.NormalizeConfig() kiểm tra kiểu trước khi dùng.
]]
Config.PROFILE = {
	--------------------------------------------------------------------
	-- CÔNG TẮC TỔNG (CFG-001)
	--------------------------------------------------------------------
	enabled = true,          -- false = hệ thống không làm gì cả

	-- Chế độ tối ưu. "light" là MẶC ĐỊNH theo yêu cầu thiết kế.
	mode = "light",

	--------------------------------------------------------------------
	-- CÔNG TẮC THEO NHÓM (CFG-001) — độc lập với nhau
	-- Đặt false để TẮT hẳn nhóm đó.
	--------------------------------------------------------------------
	groups = {
		graphics  = true,    -- chất lượng tối đa 8; giữ ánh sáng, bóng và địa hình
		effects   = true,    -- giới hạn Rate hạt nhẹ (không xoá effect)
		cull      = true,    -- thư viện có culling; không gọi trong plan mặc định
		scan      = true,    -- quét thế giới có trần
		memory    = true,    -- dọn resource; GC thủ công mặc định tắt
		physics   = false,   -- MẶC ĐỊNH TẮT: có đánh đổi độ mượt vật lý
		character = true,    -- giữ bóng và tỉ lệ avatar theo mặc định
		net       = false,   -- MẶC ĐỊNH TẮT: cần remote của game
	},

	--------------------------------------------------------------------
	-- CÔNG TẮC THEO TỪNG PHƯƠNG PHÁP (CFG-002)
	-- Chỉ cần liệt kê những gì muốn TẮT. Id lấy từ Shared/Methods.luau.
	--------------------------------------------------------------------
	methods = {
		-- ví dụ: ["GRAPHICS-003"] = false,  -- giữ Terrain.Decoration
	},

	--------------------------------------------------------------------
	-- ĐO HIỆU NĂNG (Part 9)
	--------------------------------------------------------------------
	measure = {
		baselineSeconds = 5.0,     -- thời lượng lấy mẫu TRƯỚC khi tối ưu
		settleSeconds   = 1.0,     -- nghỉ sau khi tối ưu để FPS ổn định
		afterSeconds    = 5.0,     -- thời lượng lấy mẫu SAU khi tối ưu
		frameWindow     = 180,     -- ~3 giây @60fps cho chỉ số tức thời
		longFrameMs     = 33.3,    -- ngưỡng "khung hình dài" (dưới 30 FPS)
	},

	--------------------------------------------------------------------
	-- BẢNG TRẠNG THÁI (Part 6 & 7)
	--------------------------------------------------------------------
	gui = {
		enabled         = true,
		durationSeconds = 30,      -- thời gian hiện bảng trạng thái (~30 giây)
		fadeSeconds     = 0.45,    -- thời gian trượt xuống + mờ dần
		slideOffset     = 70,      -- px trượt xuống khi ẩn
		width           = 288,     -- px
		marginRight     = 16,      -- px, cách mép phải (lề an toàn)
		marginBottom    = 16,      -- px, cách mép dưới (lề an toàn)
		backgroundAlpha = 0.42,    -- nền xám bán trong suốt, vẫn đọc rõ chữ
		cornerRadius    = 10,      -- bo góc nhẹ cho bảng chữ nhật
		borderWidth     = 2,       -- viền cầu vồng
		rainbowSpeed    = 0.35,    -- vòng/giây của dải cầu vồng
		updateInterval  = 0.1,     -- cập nhật giao diện 10 lần/giây, tránh việc thừa
	},

	--------------------------------------------------------------------
	-- ĐỒ HOẠ (giảm NHẸ, đảo ngược được)
	--------------------------------------------------------------------
	graphics = {
		qualityLevel      = 8,     -- giảm nhẹ; không bao giờ nâng mức thấp hiện có
		lockQualityMode   = false, -- tôn trọng chế độ đồ họa tự động của Roblox
		applyTerrainDecoration = false, -- không đổi địa hình trừ khi chủ game bật rõ
		terrainDecoration = false, -- giá trị mục tiêu chỉ dùng khi applyTerrainDecoration = true
		shadowDistance    = 0,     -- giữ toàn bộ bóng đổ, không culling part xa
		maxShadowTargets  = 400,   -- trần an toàn nếu chủ game chủ động bật culling
	},

	--------------------------------------------------------------------
	-- HIỆU ỨNG (chỉ GIỚI HẠN, không xoá — giữ nguyên tính năng)
	--------------------------------------------------------------------
	effects = {
		particleRateCap     = 40,  -- giới hạn nhẹ mật độ hạt, không tắt emitter
		maxInstancesScanned = 3000,-- trần quét, tránh treo máy yếu
	},

	--------------------------------------------------------------------
	-- NHÂN VẬT (vẫn giữ nguyên nhân vật)
	--------------------------------------------------------------------
	character = {
		disableShadows     = false, -- luôn giữ bóng nhân vật theo mặc định
		disableAutoScaling = false, -- giữ nguyên tỉ lệ/hiển thị nhân vật
	},

	--------------------------------------------------------------------
	-- BỘ NHỚ / GC
	--------------------------------------------------------------------
	memory = {
		gcEverySeconds = 0,        -- 0 = tắt; GC thủ công là opt-in để tránh nền thừa
		collectStepKb  = 200,      -- collectgarbage("step", n)
	},

	--------------------------------------------------------------------
	-- VẬT LÝ (CÓ ảnh hưởng cảm giác chơi -> MẶC ĐỊNH TẮT)
	--------------------------------------------------------------------
	physics = {
		enabled                 = false,
		interpolationThrottling = "Disabled",
		physicsSteppingMethod   = "Fixed",
	},

	--------------------------------------------------------------------
	-- BỘ LẬP LỊCH (Part 8: không được mở vòng lặp trùng)
	--------------------------------------------------------------------
	scheduler = {
		frameBudgetMs = 3.0,       -- ngân sách thời gian mỗi khung hình
		cullInterval  = 0.25,      -- giây giữa hai lượt cull
	},

	--------------------------------------------------------------------
	-- CHẨN ĐOÁN & LOG (Part 8)
	--------------------------------------------------------------------
	diagnostics = {
		logLevel      = "info",    -- "silent" | "info" | "debug"
		maxEntries    = 200,       -- trần bộ đệm log (chống phình bộ nhớ)
		errorLogging  = true,      -- ghi lỗi ra Output
		printToOutput = true,      -- có in ra Output hay chỉ giữ trong bộ đệm
		selfCostCheck = true,      -- đo chi phí của chính công cụ
	},

	--------------------------------------------------------------------
	-- KHÔI PHỤC (Part 8)
	--------------------------------------------------------------------
	restore = {
		recordChanges = true,      -- ghi nhật ký giá trị cũ
		verifyOnWrite = true,      -- đọc lại sau khi ghi để xác nhận
		respectStale  = true,      -- KHÔNG ghi đè nếu game/người dùng đã đổi
	},
}

--[[
	Bản sao mặc định, chụp MỘT lần lúc nạp module.
	Dùng cho Config.ResetToDefaults() — không phụ thuộc vào PROFILE hiện tại.
]]
local DEFAULTS = (function()
	local function clone(value)
		if type(value) ~= "table" then
			return value
		end
		local out = {}
		for key, child in pairs(value) do
			out[key] = clone(child)
		end
		return out
	end
	return clone(Config.PROFILE)
end)()

--[[
	CFG-004: khôi phục cấu hình mặc định.
	Trả về PROFILE (đã được đặt lại).
]]
function Config.ResetToDefaults()
	for section, values in pairs(DEFAULTS) do
		if type(values) == "table" then
			if type(Config.PROFILE[section]) ~= "table" then
				Config.PROFILE[section] = {}
			end
			for key, value in pairs(values) do
				Config.PROFILE[section][key] = value
			end
		else
			Config.PROFILE[section] = values
		end
	end
	return Config.PROFILE
end

-- Bí danh giữ tương thích với mã cũ.
Config.Reset = Config.ResetToDefaults

--[[
	Áp một bảng vá lên PROFILE (ghép sâu một mức).
	Config.Apply({ gui = { durationSeconds = 60 } })
]]
function Config.Apply(patch)
	if type(patch) ~= "table" then
		return Config.PROFILE
	end
	for section, values in pairs(patch) do
		if type(Config.PROFILE[section]) == "table" and type(values) == "table" then
			for key, value in pairs(values) do
				Config.PROFILE[section][key] = value
			end
		else
			Config.PROFILE[section] = values
		end
	end
	return Config.PROFILE
end

function Config.Get(section)
	return Config.PROFILE[section]
end

--[[
	MEAS-004: công tắc A/B cho một nhóm — dùng khi đo lại để biết nhóm nào
	thật sự có ích trên máy của bạn.
	Config.SetGroup("graphics", false) rồi đo lại.
]]
function Config.SetGroup(groupKey, enabled)
	if type(groupKey) ~= "string" then
		return false
	end
	if type(Config.PROFILE.groups) ~= "table" then
		Config.PROFILE.groups = {}
	end
	Config.PROFILE.groups[groupKey] = enabled == true
	return true
end

-- CFG-002: công tắc cho từng phương pháp riêng lẻ.
function Config.SetMethod(methodId, enabled)
	if type(methodId) ~= "string" then
		return false
	end
	if type(Config.PROFILE.methods) ~= "table" then
		Config.PROFILE.methods = {}
	end
	Config.PROFILE.methods[methodId] = enabled == true
	return true
end

--[[
	Trả về chế độ hiện tại và bậc chất lượng tương ứng.
	"off" nghĩa là hệ thống không can thiệp gì.
]]
function Config.Mode()
	local mode = Config.PROFILE.mode
	if mode ~= "light" and mode ~= "balanced" and mode ~= "off" then
		return Config.DEFAULT_MODE
	end
	return mode
end

return Config
end,
	["Shared/Hsv"] = function()
--[[
	Util/Hsv.luau
	Chuyển HSV -> RGB (mọi giá trị 0..1). Dùng để tạo dải màu cầu vồng
	cho UIGradient của menu, và được UNIT TEST kiểm chứng bằng các mốc
	màu đã biết (đỏ / lục / lam / vàng / tím).

	Thuần logic, không phụ thuộc API Roblox -> chạy được trên Lua 5.3 (fengari).
]]

local Hsv = {}

local function clamp01(x: number): number
	if x ~= x then return 0 end            -- NaN
	if x < 0 then return 0 end
	if x > 1 then return 1 end
	return x
end

--[[
	h: hue 0..1 (0 và 1 đều là đỏ)
	s: saturation 0..1
	v: value 0..1
	trả về r, g, b mỗi giá trị 0..1
]]
function Hsv.ToRgb(h: number, s: number, v: number): (number, number, number)
	h = clamp01(h) % 1
	s = clamp01(s)
	v = clamp01(v)

	if s <= 0 then
		return v, v, v
	end

	local i = math.floor(h * 6)
	local f = (h * 6) - i
	local p = v * (1 - s)
	local q = v * (1 - s * f)
	local t = v * (1 - s * (1 - f))

	local mod = i % 6
	if mod == 0 then
		return v, t, p
	elseif mod == 1 then
		return q, v, p
	elseif mod == 2 then
		return p, v, t
	elseif mod == 3 then
		return p, q, v
	elseif mod == 4 then
		return t, p, v
	else
		return v, p, q
	end
end

-- Bảng 8 mốc cầu vồng dùng cho UIGradient (đỏ -> cam -> vàng -> lục -> lam -> chàm -> tím -> đỏ)
function Hsv.RainbowStops(count: number): { number }
	local out = {}
	local n = math.max(2, math.floor(count or 8))
	for i = 0, n - 1 do
		-- Bao gồm cả 1 để màu cuối khép vòng về đỏ như màu đầu.
		out[#out + 1] = i / (n - 1)
	end
	return out
end

return Hsv
end,
	["Shared/Log"] = function()
--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  EVT-003, RAM-003, RES-005
	===== RALO.METHODS:END ===== --]]

--[[
	Util/Log.luau
	Log có mức độ, có scope, có bộ đệm vòng để UI/harness đọc lại.
	Ghi ra: (1) print/warn thật của runtime, (2) Log.Entries để truy xuất.

	Không phụ thuộc Roblox API -> chạy được trên Lua 5.3 (fengari).
]]

local Log = {}

Log.Level = "info"                 -- debug | info | warn | error | silent
Log.MaxEntries = 400
Log.Entries = {}
Log.OnEntry = nil                  -- function(entry) — UI/harness hook

local ORDER = { debug = 1, info = 2, warn = 3, error = 4, silent = 5 }

local function allowed(level: string): boolean
	return (ORDER[level] or 2) >= (ORDER[Log.Level] or 2)
end

function Log.Push(level: string, scope: string, message: string)
	local entry = {
		level = level,
		scope = scope,
		message = message,
		time = os.clock(),
	}
	table.insert(Log.Entries, entry)
	if #Log.Entries > Log.MaxEntries then
		table.remove(Log.Entries, 1)
	end
	if Log.OnEntry then
		Log.OnEntry(entry)
	end
	return entry
end

local function emit(level: string, scope: string, parts: { any })
	if not allowed(level) then
		return
	end
	local message = table.concat(parts, " ")
	Log.Push(level, scope, message)

	local prefix = ("[%s] %s"):format(level:upper(), scope)
	if level == "warn" or level == "error" then
		warn(prefix, message)
	else
		print(prefix, message)
	end
end

function Log.Debug(scope: string, ...: any) emit("debug", scope, { ... }) end
function Log.Info(scope: string, ...: any)  emit("info",  scope, { ... }) end
function Log.Warn(scope: string, ...: any)  emit("warn",  scope, { ... }) end
function Log.Error(scope: string, ...: any) emit("error", scope, { ... }) end

-- Định dạng bảng before/after thành các dòng căn cột — dùng cho Output và UI.
function Log.FormatRows(rows: { { string, string, string, string } }): { string }
	local widths = { 0, 0, 0, 0 }
	for _, row in rows do
		for i = 1, 4 do
			widths[i] = math.max(widths[i], #tostring(row[i] or ""))
		end
	end
	local out = {}
	for _, row in rows do
		local line = ""
		for i = 1, 4 do
			local cell = tostring(row[i] or "")
			line ..= cell .. string.rep(" ", widths[i] - #cell + 2)
		end
		out[#out + 1] = line
	end
	return out
end

function Log.Clear()
	table.clear(Log.Entries)
end

return Log
end,
	["Shared/Methods"] = function()
--[[
	Shared/Methods.luau
	===== RALO.METHODS:CATALOG =====

	DANH MỤC PHƯƠNG PHÁP TỐI ƯU. Tệp này là DỮ LIỆU, không phải mô tả rời rạc:
	mỗi mục có id, nhóm, cơ chế, nguyên nhân lag, cách triển khai, tệp chịu
	trách nhiệm, điều kiện, rủi ro và TRẠNG THÁI.

	Trạng thái (thống nhất toàn dự án):
	  A = đã triển khai vào mã nguồn
	  B = đã triển khai VÀ đã kiểm thử thành công (có test tương ứng chạy đạt)
	  C = đã triển khai nhưng chưa kiểm thử thực tế
	  D = chỉ là đề xuất, chưa triển khai
	  E = không thể áp dụng trong môi trường hiện tại

	RÀNG BUỘC ĐƯỢC KIỂM BẰNG MÁY (tests/suites/catalog.luau):
	  1. Mọi mục A/B/C phải có tệp thật ở cột `file` (không phải "(đề xuất)").
	  2. Mọi mục B phải có tên test trùng id trong tests/suites/*.
	  3. Id phải duy nhất, nhóm phải nằm trong 1..30, đủ 30 nhóm.
	Nếu một trong ba ràng buộc sai, bộ test FAIL. Không thể "khai" khống.
--]]

local Methods = {}

Methods.StatusLabels = {
	A = "Đã triển khai vào mã nguồn",
	B = "Đã triển khai và đã kiểm thử thành công",
	C = "Đã triển khai nhưng chưa kiểm thử thực tế",
	D = "Chỉ là đề xuất, chưa triển khai",
	E = "Không thể áp dụng trong môi trường hiện tại",
}

Methods.Groups = {
	[1] = "Tối ưu CPU và phép tính",
	[2] = "Tối ưu vòng lặp và tần suất cập nhật",
	[3] = "Tối ưu RAM và vòng đời đối tượng",
	[4] = "Ngăn rò rỉ bộ nhớ và ngắt kết nối sự kiện",
	[5] = "Tối ưu FPS và công việc mỗi khung hình",
	[6] = "Tối ưu GPU trong phạm vi Roblox cho phép",
	[7] = "Giảm nhẹ hiệu ứng đồ họa không thiết yếu",
	[8] = "Tối ưu Part, Model và đối tượng do script quản lý",
	[9] = "Tối ưu va chạm và truy vấn vật lý",
	[10] = "Tối ưu hiệu ứng hạt, ánh sáng và hiệu ứng tạm",
	[11] = "Tối ưu âm thanh",
	[12] = "Tối ưu GUI và hoạt ảnh giao diện",
	[13] = "Tối ưu tác vụ nền và bộ hẹn giờ",
	[14] = "Tối ưu RemoteEvent, RemoteFunction và dữ liệu mạng",
	[15] = "Tối ưu NPC, AI và tìm đường",
	[16] = "Tối ưu tải tài nguyên và bộ nhớ đệm",
	[17] = "Tối ưu cấu trúc dữ liệu và thuật toán",
	[18] = "Tối ưu xử lý sự kiện",
	[19] = "Tối ưu tìm kiếm đối tượng trong Workspace",
	[20] = "Tối ưu quản lý đối tượng và object pooling",
	[21] = "Tối ưu xử lý dữ liệu người chơi",
	[22] = "Tối ưu phát hiện tác vụ nặng",
	[23] = "Tối ưu xử lý đối tượng ở xa khi gameplay cho phép",
	[24] = "Tối ưu khả năng tương thích thiết bị cấu hình thấp",
	[25] = "Tối ưu đo đạc, kiểm thử và phát hiện lỗi",
	[26] = "Tối ưu khả năng khôi phục khi có lỗi",
	[27] = "Tối ưu cơ chế bật/tắt tính năng",
	[28] = "Tối ưu quản lý tài nguyên tập trung",
	[29] = "Tối ưu thời gian khởi chạy",
	[30] = "Tối ưu tổng thể mà không làm hỏng gameplay",
}

Methods.List = {
	{
		id = "CPU-001",
		group = 1,
		name = "Cache global thành upvalue",
		mechanism = "Đọc hàm/thư viện dùng nhiều (math, table, Instance.new, task) một lần vào biến local đầu tệp.",
		cause = "Mỗi lần đọc global phải tra bảng _G qua metatable; trong vòng lặp nóng chi phí cộng dồn rất lớn.",
		how = "Khai báo `local math_floor = math.floor` ... ở đầu mỗi module; thân hàm chỉ dùng upvalue.",
		file = "Client/Core/Scheduler",
		cond = "Luôn áp dụng được.",
		risk = "Không có; chỉ đổi cách tham chiếu.",
		status = "A",
	},
	{
		id = "CPU-002",
		group = 1,
		name = "Cache kết quả GetService",
		mechanism = "Mỗi service chỉ GetService một lần rồi giữ ở upvalue của module.",
		cause = "GetService là lời gọi xuyên biên giới Luau-C++; gọi lặp lại cho cùng một service là lãng phí thuần.",
		how = "`local runService = Client_Env.GetService(\"RunService\")` ở đầu module, tái sử dụng về sau.",
		file = "Client/Core/Env, mọi module cần service",
		cond = "Cần chạy trong ngữ cảnh có DataModel.",
		risk = "Không có.",
		status = "A",
	},
	{
		id = "CPU-003",
		group = 1,
		name = "Cache tham chiếu module",
		mechanism = "require/__RALO_REQUIRE mỗi module đúng một lần, kết quả cache theo đường dẫn.",
		cause = "require lặp lại đi qua cache của engine nhưng vẫn tốn một lời gọi hàm và tra bảng.",
		how = "Bảng `cache[path]` trong RequireShim.Install; module chỉ được nạp lần đầu.",
		file = "Shared/RequireShim",
		cond = "Luôn áp dụng.",
		risk = "Module có trạng thái toàn cục sẽ dùng chung một bản — đúng ý đồ thiết kế.",
		status = "A",
	},
	{
		id = "CPU-004",
		group = 1,
		name = "Hoán vị biểu thức bất biến khỏi vòng lặp",
		mechanism = "Tính trước các giá trị không đổi (ngưỡng, hệ số, bình phương ngưỡng) ngoài vòng lặp.",
		cause = "Tính lại cùng một biểu thức hàng nghìn lần mỗi lượt quét là CPU thuần bị vứt đi.",
		how = "`Cpu.HoistedLoop()` chứng minh và được dùng trong các vòng quét; ngưỡng nhân đôi được tính trước khi vào vòng.",
		file = "Client/Core/Cpu",
		cond = "Áp dụng khi biểu thức thật sự bất biến.",
		risk = "Nếu biểu thức KHÔNG bất biến mà hoán vị sẽ cho kết quả sai — phải kiểm tra bằng test.",
		status = "B",
	},
	{
		id = "CPU-005",
		group = 1,
		name = "So sánh khoảng cách bằng bình phương",
		mechanism = "Dùng dx*dx+dy*dy+dz*dz so với limit*limit thay vì Magnitude.",
		cause = "Magnitude gọi sqrt; với hàng trăm đối tượng mỗi lượt quét thì sqrt là phần đắt nhất.",
		how = "`Cpu.DistanceSquared()` và `Cpu.IsFartherThan()`; Cull dùng bình phương ngưỡng.",
		file = "Client/Core/Cpu, Client/Core/Cull",
		cond = "Chỉ dùng khi so sánh, không cần khoảng cách thật.",
		risk = "Nếu cần khoảng cách thật (hiển thị, vật lý) vẫn phải sqrt.",
		status = "B",
	},
	{
		id = "CPU-006",
		group = 1,
		name = "Tiền cấp phát bảng",
		mechanism = "Tạo bảng với kích thước已知 thay vì để bảng tự lớn dần.",
		cause = "Bảng Lua tăng dung lượng theo cấp số nhân, mỗi lần tăng là một lần cấp phát lại và sao chép.",
		how = "`table.create(n, 0)` cho ring buffer và mảng tạm.",
		file = "Client/Core/Perf, Client/Optimizations/Scan",
		cond = "Cần biết trước số phần tử.",
		risk = "Nếu ước lượng sai kích thước thì chỉ mất chút bộ nhớ, không sai kết quả.",
		status = "A",
	},
	{
		id = "CPU-007",
		group = 1,
		name = "Dùng hằng cho khoá chuỗi lặp lại",
		mechanism = "Định nghĩa tên property dùng nhiều lần ở MỘT nơi, thân mã tham chiếu hằng.",
		cause = "Mỗi lần viết chuỗi là một lần tra/dựng khoá; lặp lại ở nhiều chỗ dễ gõ sai tên property.",
		how = "Bảng `Cpu.Keys` chứa các tên property hay dùng.",
		file = "Client/Core/Cpu",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "A",
	},
	{
		id = "CPU-008",
		group = 1,
		name = "Không để lỗi thoát ra khỏi tác vụ",
		mechanism = "Mọi tác vụ chạy trong pcall có ghi log; một bước lỗi không kéo sập hệ thống.",
		cause = "Một property bị khoá làm throw; không pcall thì toàn bộ pipeline chết giữa chừng và mất luôn khả năng khôi phục.",
		how = "`Guard.Run()` bọc mọi thao tác nguy hiểm; Scheduler cũng pcall từng callback.",
		file = "Client/Core/Guard, Client/Core/Scheduler",
		cond = "Luôn áp dụng.",
		risk = "Nuốt lỗi có thể che lỗi thật — bắt buộc ghi log kèm.",
		status = "B",
	},
	{
		id = "CPU-009",
		group = 1,
		name = "Ngân sách thời gian mỗi khung hình",
		mechanism = "Scheduler dừng khi tổng thời gian tác vụ vượt ngưỡng, phần còn lại chờ khung hình sau.",
		cause = "Công cụ tối ưu mà chiếm quá nhiều thời gian khung hình thì chính nó thành nguồn lag.",
		how = "`Scheduler.frameBudgetMs` (mặc định 3ms) + đếm `overruns` để biết có hay vượt.",
		file = "Client/Core/Scheduler",
		cond = "Cần đồng hồ đủ chính xác (os.clock).",
		risk = "Ngưỡng quá thấp làm tác vụ bị trễ; có thể chỉnh trong Config.",
		status = "B",
	},
	{
		id = "LOOP-001",
		group = 2,
		name = "Một kết nối Heartbeat cho mọi tác vụ định kỳ",
		mechanism = "Toàn hệ thống dùng đúng MỘT connection Heartbeat; Scheduler phân phối cho các task.",
		cause = "Mỗi module tự Connect => N lần gọi lại mỗi khung hình, không ai kiểm soát tổng chi phí.",
		how = "`Scheduler.Start()` tạo đúng một connection; `Scheduler.Stats().connections` để kiểm chứng.",
		file = "Client/Core/Scheduler",
		cond = "Luôn áp dụng.",
		risk = "Không có; task vẫn chạy đúng chu kỳ của nó.",
		status = "B",
	},
	{
		id = "LOOP-002",
		group = 2,
		name = "Ưu tiên tác vụ",
		mechanism = "Task khai báo priority; ưu tiên cao chạy trước, cùng ưu tiên thì chu kỳ ngắn chạy trước.",
		cause = "Khi vượt ngân sách khung hình, phải biết bỏ việc gì trước.",
		how = "`table.sort` trong `reindex()` theo (priority desc, interval asc).",
		file = "Client/Core/Scheduler",
		cond = "Luôn áp dụng.",
		risk = "Ưu tiên đặt sai có thể làm task quan trọng bị trễ.",
		status = "B",
	},
	{
		id = "LOOP-003",
		group = 2,
		name = "Chu kỳ riêng cho từng tác vụ",
		mechanism = "Mỗi task có interval riêng (0 = mỗi khung hình).",
		cause = "Việc chỉ cần chạy 4 lần/giây mà chạy 60 lần/giây là lãng phí 15 lần.",
		how = "Trường `interval` + `nextDue` trong Scheduler.Schedule.",
		file = "Client/Core/Scheduler",
		cond = "Luôn áp dụng.",
		risk = "Interval quá lớn làm phản ứng chậm.",
		status = "B",
	},
	{
		id = "LOOP-004",
		group = 2,
		name = "Huỷ tác vụ bằng handle",
		mechanism = "Mỗi task có handle:Cancel(); Shutdown() huỷ toàn bộ.",
		cause = "Thread/vòng lặp không huỷ được là nguồn rò rỉ CPU kinh điển.",
		how = "`handle:Cancel()` xoá khỏi bảng tasks và sắp xếp lại thứ tự.",
		file = "Client/Core/Scheduler",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "LOOP-005",
		group = 2,
		name = "Không trì hoãn tác vụ để làm đẹp GUI",
		mechanism = "Tiến trình thật chạy độc lập với hoạt ảnh GUI; GUI không wait tác vụ.",
		cause = "Yêu cầu: không được tạo cảm giác giả đang xử lý.",
		how = "Pipeline chạy tác vụ rồi mới cập nhật GUI; hoạt ảnh 30s là đồng hồ riêng.",
		file = "Client/Core/Pipeline, Client/Ui/Notifier",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "LOOP-006",
		group = 2,
		name = "Thích ứng theo deltaTime",
		mechanism = "Logic dựa trên deltaTime chứ không giả định 60 FPS.",
		cause = "Máy yếu chạy 30 FPS thì logic gắn với số khung hình sẽ chạy chậm gấp đôi.",
		how = "Scheduler truyền deltaTime vào callback.",
		file = "Client/Core/Scheduler",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "A",
	},
	{
		id = "LOOP-007",
		group = 2,
		name = "Đọc độ dài mảng một lần",
		mechanism = "`local count = #array` ngoài vòng lặp.",
		cause = "Toán tử # trên bảng có phần mảng lớn không miễn phí; gọi mỗi lượt lặp là thừa.",
		how = "`Cpu.ForEachIndex()` đọc # một lần rồi lặp bằng chỉ số.",
		file = "Client/Core/Cpu",
		cond = "Áp dụng cho mảng không đổi độ dài trong lúc lặp.",
		risk = "Nếu mảng bị sửa trong lúc lặp thì kết quả khác — phải snapshot.",
		status = "B",
	},
	{
		id = "RAM-001",
		group = 3,
		name = "Bộ đệm vòng kích thước cố định",
		mechanism = "Ring buffer ghi đè mẫu cũ, không phình theo thời gian đo.",
		cause = "Đo lâu mà danh sách mẫu cứ dài ra => RAM tăng đều, GC chạy nhiều hơn.",
		how = "`Perf.New(capacity)` + ghi đè theo `head % capacity`, trừ mẫu bị ghi đè khỏi tổng.",
		file = "Client/Core/Perf",
		cond = "Cần chọn dung lượng đủ lớn để percentile có nghĩa.",
		risk = "Dung lượng nhỏ làm p1/p95 kém ổn định.",
		status = "A",
	},
	{
		id = "RAM-002",
		group = 3,
		name = "Tái sử dụng bảng tạm",
		mechanism = "Pool bảng Lua: mượn bảng, dùng xong trả lại.",
		cause = "Cấp phát bảng mới trong vòng lặp nóng là nguồn rác GC lớn nhất của script.",
		how = "`Pool.AcquireTable()` / `Pool.ReleaseTable()` có trần dung lượng.",
		file = "Client/Core/Pool",
		cond = "Áp dụng cho bảng tạm dùng xong bỏ.",
		risk = "Trả bảng mà chưa xoá hết khoá => dữ liệu bẩn; ReleaseTable có table.clear.",
		status = "B",
	},
	{
		id = "RAM-003",
		group = 3,
		name = "Giới hạn bảng dữ liệu",
		mechanism = "Mọi bảng tích luỹ đều có trần (log, error, pool, targets).",
		cause = "Bảng không trần chạy nhiều giờ sẽ chiếm bộ nhớ ngày càng lớn.",
		how = "Log.MaxEntries, Guard.maxErrorLog, Pool.cap, Cull.rules.maxTargets.",
		file = "Shared/Log, Client/Core/Guard, Client/Core/Pool, Client/Core/Cull",
		cond = "Luôn áp dụng.",
		risk = "Trần quá nhỏ làm mất dữ liệu cũ cần chẩn đoán.",
		status = "A",
	},
	{
		id = "RAM-004",
		group = 3,
		name = "Tránh closure trong vòng lặp nóng",
		mechanism = "Callback được tạo MỘT lần ngoài vòng lặp rồi tái sử dụng.",
		cause = "Mỗi closure là một đối tượng mới + upvalue; tạo hàng nghìn cái mỗi giây ép GC.",
		how = "Callback của Scheduler/Registry được tạo một lần lúc đăng ký.",
		file = "Client/Core/Scheduler, Client/Core/Registry",
		cond = "Áp dụng ở đường nóng.",
		risk = "Không có.",
		status = "A",
	},
	{
		id = "LEAK-001",
		group = 4,
		name = "Sổ đăng ký kết nối tập trung",
		mechanism = "Mọi Connect đi qua Registry.Connect, có id, có DisconnectAll.",
		cause = "Connection không Disconnect vẫn chạy sau khi đối tượng bị huỷ => CPU rò rỉ tăng dần.",
		how = "`Registry.connections` + `Registry.Shutdown()` ngắt toàn bộ.",
		file = "Client/Core/Registry",
		cond = "Mọi kết nối của hệ thống phải đi qua Registry.",
		risk = "Nếu module nào Connect thẳng thì lọt sổ — test đếm connection để phát hiện.",
		status = "B",
	},
	{
		id = "LEAK-002",
		group = 4,
		name = "Tự ngắt khi đối tượng bị huỷ",
		mechanism = "Theo dõi Parent của instance; khi nó rời cây thì ngắt connection và xoá cache liên quan.",
		cause = "Instance bị game Destroy nhưng callback vẫn giữ tham chiếu => vừa rò rỉ vừa lỗi tham chiếu.",
		how = "`Registry.Watch()` nghe GetPropertyChangedSignal(\"Parent\") rồi gọi DropInstance.",
		file = "Client/Core/Registry",
		cond = "Cần instance còn sống lúc đăng ký.",
		risk = "Mỗi watch thêm một connection; chỉ watch đối tượng dài hạn.",
		status = "A",
	},
	{
		id = "LEAK-003",
		group = 4,
		name = "Kết nối một lần",
		mechanism = "Registry.ConnectOnce tự Disconnect ngay sau lần bắn đầu tiên.",
		cause = "Kết nối chỉ cần phản ứng một lần mà để mãi là rò rỉ.",
		how = "`Registry.ConnectOnce()` bọc handler rồi Disconnect.",
		file = "Client/Core/Registry",
		cond = "Dùng cho tín hiệu khởi động.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "LEAK-004",
		group = 4,
		name = "Không tạo thread mỗi sự kiện",
		mechanism = "Tác vụ nền đăng ký với Scheduler thay vì spawn thread riêng mỗi lần.",
		cause = "Mỗi `task.spawn` trong handler sự kiện tạo một thread; sự kiện dày => thread chồng chất.",
		how = "Mọi việc định kỳ qua Scheduler.Schedule; việc một lần qua Scheduler.Defer.",
		file = "Client/Core/Scheduler",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "A",
	},
	{
		id = "LEAK-005",
		group = 4,
		name = "Sổ đăng ký instance do hệ thống tạo",
		mechanism = "Mọi Instance.new của hệ thống được Registry.Own; Shutdown huỷ đúng những cái đó.",
		cause = "Instance tạo ra không ai giữ tham chiếu thì không dọn được, thành rác vĩnh viễn.",
		how = "`Registry.owned` + `Registry.Release(id)`; chỉ huỷ instance trong sổ.",
		file = "Client/Core/Registry",
		cond = "Chỉ áp dụng cho instance hệ thống tạo.",
		risk = "Nguy hiểm nếu nhầm instance của game — Release kiểm tra sổ trước khi huỷ.",
		status = "B",
	},
	{
		id = "FPS-001",
		group = 5,
		name = "Ngân sách khung hình cho chính công cụ",
		mechanism = "Xem CPU-009: Scheduler dừng khi vượt ngưỡng.",
		cause = "Công cụ tối ưu chiếm khung hình thì FPS không tăng.",
		how = "Scheduler.frameBudgetMs + overrun counter.",
		file = "Client/Core/Scheduler",
		cond = "Luôn áp dụng.",
		risk = "Xem CPU-009.",
		status = "A",
	},
	{
		id = "FPS-002",
		group = 5,
		name = "Không ghi GUI mỗi khung hình",
		mechanism = "Chỉ ghi property GUI khi giá trị thật sự khác.",
		cause = "Ghi lại cùng giá trị vẫn làm engine đánh dấu bẩn và tính lại layout.",
		how = "`GuiPolicy.SetIfChanged()` so sánh trước khi ghi.",
		file = "Client/Ui/GuiPolicy",
		cond = "Áp dụng cho GUI của hệ thống.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "FPS-003",
		group = 5,
		name = "Bỏ qua đối tượng ngoài vùng quan tâm",
		mechanism = "Chỉ xử lý đối tượng đã đăng ký / mang tag, không quét cả thế giới.",
		cause = "Quét toàn bộ Workspace mỗi lượt là O(số instance của cả game).",
		how = "Cull.targets là danh sách đăng ký; Scan chỉ duyệt danh sách đó.",
		file = "Client/Core/Cull",
		cond = "Cần có bước đăng ký đối tượng.",
		risk = "Nếu không đăng ký thì đối tượng không được tối ưu (an toàn hơn là làm sai).",
		status = "B",
	},
	{
		id = "FPS-004",
		group = 5,
		name = "Ưu tiên việc hiển thị",
		mechanism = "Task quan trọng priority cao, việc nền priority âm.",
		cause = "RenderStepped/Heartbeat có thời lượng cố định; việc nền không được tranh phần.",
		how = "Scheduler sắp xếp theo priority; cull/net dùng priority âm.",
		file = "Client/Core/Scheduler",
		cond = "Luôn áp dụng.",
		risk = "Xem LOOP-002.",
		status = "A",
	},
	{
		id = "GRAPHICS-001",
		group = 6,
		name = "Hạ Lighting.QualityLevel nhẹ, có chặn an toàn",
		mechanism = "Đặt mục tiêu tối đa ở 8/10, không nâng mức đang dùng thấp hơn.",
		cause = "Mức chất lượng cao có thể tăng chi phí render trên client.",
		how = "`Graphics.ApplyQualityLevel()` giữ nguyên giá trị cũ trong Restore; chế độ tự động mặc định được tôn trọng.",
		file = "Client/Optimizations/Graphics",
		cond = "Chỉ phía client; không ảnh hưởng người chơi khác.",
		risk = "Có thể khác biệt nhẹ về chất lượng hình ảnh; không tắt ánh sáng/bóng; hoàn tác được.",
		status = "B",
	},
	{
		id = "GRAPHICS-002",
		group = 6,
		name = "Tùy chọn khóa GraphicsQualityMode",
		mechanism = "Chỉ khóa chế độ tự động khi chủ game bật rõ tuỳ chọn.",
		cause = "Engine có thể ghi đè QualityLevel nếu chế độ tự động bị khóa không đúng lúc.",
		how = "`Graphics.ApplyQualityLevel()` chỉ đặt GraphicsQualityMode = false khi `lockQualityMode = true`.",
		file = "Client/Optimizations/Graphics",
		cond = "Mặc định tắt; người dùng chủ động bật mới áp dụng.",
		risk = "Có thể ngừng tự điều chỉnh chất lượng của Roblox; hoàn tác được.",
		status = "A",
	},
	{
		id = "GRAPHICS-003",
		group = 7,
		name = "Đặt Terrain.Decoration theo cấu hình",
		mechanism = "Chủ game có thể đổi chi tiết cỏ/đá nhỏ phía client.",
		cause = "Decoration có thể tạo thêm chi phí render ở cảnh nhiều chi tiết.",
		how = "`Graphics.ApplyTerrain()` ghi giá trị cũ; mặc định giữ Decoration = true.",
		file = "Client/Optimizations/Graphics",
		cond = "Mặc định giữ nguyên địa hình trang trí; chỉ đổi nếu cấu hình yêu cầu.",
		risk = "Tắt Decoration sẽ làm mất cỏ/chi tiết nhỏ; hoàn tác được.",
		status = "B",
	},
	{
		id = "GRAPHICS-004",
		group = 7,
		name = "Tắt bóng đổ cho đối tượng ở xa",
		mechanism = "Xa hơn ngưỡng thì CastShadow = false; lại gần thì khôi phục.",
		cause = "Shadow map là một trong những chi phí GPU lớn nhất; bóng của vật ở xa gần như vô hình.",
		how = "`Cull.Scan()` so khoảng cách bình phương với shadowDistance, khôi phục khi lại gần.",
		file = "Client/Core/Cull",
		cond = "Chỉ với đối tượng đã đăng ký; không đụng đối tượng gameplay.",
		risk = "Bóng vật xa biến mất; tự khôi phục khi lại gần.",
		status = "B",
	},
	{
		id = "GRAPHICS-005",
		group = 6,
		name = "Giảm tầm PointLight/SpotLight",
		mechanism = "Hạ Range/Brightness của đèn do script quản lý.",
		cause = "Mỗi đèn động buộc engine tính ánh sáng cho các part trong tầm.",
		how = "Chưa triển khai: cần chủ game khai báo danh sách đèn được phép đổi.",
		file = "(đề xuất)",
		cond = "Cần whitelist từ chủ game.",
		risk = "Dễ làm tối cảnh nếu hạ quá tay.",
		status = "D",
	},
	{
		id = "GRAPHICS-006",
		group = 6,
		name = "Giảm số lớp trong suốt chồng nhau",
		mechanism = "Hạn chế part trong suốt xếp chồng (overdraw).",
		cause = "Overdraw là chi phí GPU điển hình; mỗi lớp trong suốt là một lần blend.",
		how = "Chưa triển khai: cần phân tích cảnh cụ thể của từng game.",
		file = "(đề xuất)",
		cond = "Cần đo bằng công cụ GPU.",
		risk = "Đổi vật liệu có thể làm hỏng mỹ thuật.",
		status = "D",
	},
	{
		id = "GRAPHICS-007",
		group = 7,
		name = "Giảm chất lượng phản chiếu/kính",
		mechanism = "Hạ số bề mặt phản chiếu.",
		cause = "Phản chiếu render cảnh thêm một lần.",
		how = "Chưa triển khai.",
		file = "(đề xuất)",
		cond = "Cần chủ game cho phép.",
		risk = "Thay đổi mỹ thuật rõ rệt.",
		status = "D",
	},
	{
		id = "PART-001",
		group = 8,
		name = "Neo part tĩnh không va chạm",
		mechanism = "Anchored = true cho part trang trí cố định.",
		cause = "Part không neo vẫn được engine xét trong bước mô phỏng vật lý.",
		how = "Chưa triển khai: đổi Anchored ảnh hưởng hành vi vật lý, cần chủ game quyết định per-game.",
		file = "(đề xuất)",
		cond = "Cần khảo sát cảnh thật.",
		risk = "Part đang rơi sẽ dừng lại — có thể phá gameplay.",
		status = "D",
	},
	{
		id = "PART-002",
		group = 8,
		name = "Cull đối tượng xa theo đăng ký",
		mechanism = "Xem GRAPHICS-004 và DIST-001.",
		cause = "Part xa vẫn tốn chi phí bóng/hiệu ứng.",
		how = "Cull.Add + Cull.Scan.",
		file = "Client/Core/Cull",
		cond = "Chỉ đối tượng đã đăng ký.",
		risk = "Xem GRAPHICS-004.",
		status = "A",
	},
	{
		id = "PART-003",
		group = 8,
		name = "Gộp part tĩnh thành một mesh",
		mechanism = "Hợp nhất nhiều part trang trí thành UnionOperation/MeshPart.",
		cause = "Mỗi part là một draw call và một nút trong cây instance.",
		how = "Chưa triển khai: thao tác này nên làm trong Studio, không nên làm lúc runtime.",
		file = "(đề xuất — làm trong Studio)",
		cond = "Cần quyền sửa game.",
		risk = "Union mất khả năng đổi màu từng phần.",
		status = "D",
	},
	{
		id = "PART-004",
		group = 8,
		name = "Tắt CastShadow cho part trang trí",
		mechanism = "Xem GRAPHICS-004, nhưng áp dụng cho toàn bộ part trang trí đã đăng ký.",
		cause = "Bóng của part trang trí nhỏ thường không ai để ý.",
		how = "Cull với kinds.shadow.",
		file = "Client/Core/Cull",
		cond = "Cần đăng ký + không mang tag bảo vệ.",
		risk = "Xem GRAPHICS-004.",
		status = "A",
	},
	{
		id = "PART-005",
		group = 8,
		name = "Giảm độ chi tiết mesh ở xa (LOD)",
		mechanism = "Dùng mesh LOD thay vì mesh đầy đủ.",
		cause = "Mesh hàng chục nghìn tam giác ở xa vẫn tốn đỉnh phải xử lý.",
		how = "Chưa triển khai: cần asset LOD và thiết lập trong Studio.",
		file = "(đề xuất — làm trong Studio)",
		cond = "Cần làm asset LOD.",
		risk = "Không có nếu LOD tốt.",
		status = "D",
	},
	{
		id = "PHYSICS-001",
		group = 9,
		name = "Tắt làm mượt nội suy (tuỳ chọn, mặc định TẮT)",
		mechanism = "Đặt InterpolationThrottling để giảm CPU mô phỏng phía client.",
		cause = "Nội suy vị trí vật thể từ xa tốn CPU đáng kể trên máy yếu.",
		how = "`Physics.ApplyThrottling()`; mặc định `physics.enabled = false` vì có đánh đổi.",
		file = "Client/Optimizations/Physics",
		cond = "Thường chỉ ghi được ở server/Studio; client bị khoá thì báo unsupported.",
		risk = "Vật thể xa chuyển động giật hơn — vì vậy mặc định tắt.",
		status = "A",
	},
	{
		id = "PHYSICS-002",
		group = 9,
		name = "Đổi PhysicsSteppingMethod (tuỳ chọn)",
		mechanism = "Chọn phương pháp bước mô phỏng rẻ hơn.",
		cause = "Phương pháp mặc định ưu tiên độ chính xác, tốn CPU hơn.",
		how = "`Physics.ApplyThrottling()` ghi PhysicsSteppingMethod nếu được phép.",
		file = "Client/Optimizations/Physics",
		cond = "Thường bị khoá ở client.",
		risk = "Đổi hành vi vật lý — mặc định tắt.",
		status = "A",
	},
	{
		id = "PHYSICS-003",
		group = 9,
		name = "Tắt Touched không cần thiết",
		mechanism = "Bỏ kết nối Touched trên đối tượng không dùng nó.",
		cause = "Mỗi kết nối Touched buộc engine kiểm tra va chạm mỗi bước.",
		how = "Chưa triển khai: cần biết đối tượng nào thật sự cần Touched.",
		file = "(đề xuất)",
		cond = "Cần khảo sát logic game.",
		risk = "Tắt nhầm sẽ mất cơ chế gameplay.",
		status = "D",
	},
	{
		id = "PHYSICS-004",
		group = 9,
		name = "Truy vấn vùng bằng API vật lý",
		mechanism = "Dùng GetPartBoundsInRadius thay vì quét GetDescendants.",
		cause = "Quét toàn cây để tìm vật gần là O(n) mỗi lần hỏi.",
		how = "Chưa triển khai trong mã; Spatial đang dùng lưới băm (DATA-002).",
		file = "(đề xuất)",
		cond = "API có sẵn ở client.",
		risk = "Kết quả phụ thuộc collision group.",
		status = "D",
	},
	{
		id = "PHYSICS-005",
		group = 9,
		name = "Tắt CanQuery/CanTouch cho part trang trí",
		mechanism = "Giảm số cặp va chạm engine phải xét.",
		cause = "Mỗi part có CanQuery/CanTouch đều tham gia truy vấn vật lý.",
		how = "Chưa triển khai: ảnh hưởng raycast của game.",
		file = "(đề xuất)",
		cond = "Cần chủ game cho phép.",
		risk = "Raycast của game sẽ không thấy part đó.",
		status = "D",
	},
	{
		id = "FX-001",
		group = 10,
		name = "Tắt emitter ở xa",
		mechanism = "Xa hơn effectDistance thì Enabled = false cho ParticleEmitter; lại gần thì bật lại.",
		cause = "Emitter xa vẫn sinh hạt và vẫn được render dù chỉ vài pixel.",
		how = "`Cull.Scan()` nhánh effects, khôi phục bằng Guard.Change có expect.",
		file = "Client/Core/Cull",
		cond = "Chỉ emitter là con của đối tượng đã đăng ký.",
		risk = "Hiệu ứng xa mất; tự khôi phục khi lại gần.",
		status = "B",
	},
	{
		id = "FX-002",
		group = 10,
		name = "Tắt Beam/Trail ở xa",
		mechanism = "Như FX-001 cho Beam và Trail.",
		cause = "Beam/Trail vẫn được tính và render khi ở xa.",
		how = "`Cull.Scan()` với effectClasses gồm Beam, Trail.",
		file = "Client/Core/Cull",
		cond = "Chỉ đối tượng đã đăng ký.",
		risk = "Như FX-001.",
		status = "A",
	},
	{
		id = "FX-003",
		group = 10,
		name = "Tắt đèn điểm ở xa",
		mechanism = "Như FX-001 cho PointLight/SpotLight.",
		cause = "Đèn xa vẫn buộc engine tính ánh sáng.",
		how = "Chưa triển khai: cần whitelist đèn (xem GRAPHICS-005).",
		file = "(đề xuất)",
		cond = "Cần chủ game khai báo.",
		risk = "Cảnh tối hơn nếu tắt nhầm đèn quan trọng.",
		status = "D",
	},
	{
		id = "EFFECTS-001",
		group = 10,
		name = "Giới hạn Rate của emitter",
		mechanism = "Đưa Rate về mức trần thay vì xoá emitter.",
		cause = "Emitter cấu hình Rate vài trăm sinh rất nhiều hạt mỗi giây.",
		how = "`Effects.CapParticles()` đổi Rate, ghi giá trị cũ vào Restore.",
		file = "Client/Optimizations/Effects",
		cond = "Mặc định bật, mức trần trong Config.",
		risk = "Hiệu ứng thưa hơn nhưng VẪN CÒN — không phá gameplay.",
		status = "B",
	},
	{
		id = "EFFECTS-002",
		group = 10,
		name = "Giới hạn ParticleCount",
		mechanism = "ParticleEmitter:Emit(count) nhận số lượng cho lần gọi; không có property ParticleCount để giới hạn emitter đang chạy.",
		cause = "Giới hạn Rate có thể giảm lượng hạt sinh ra; không thể đặt trần tổng hạt qua một property riêng.",
		how = "Không áp dụng: `ParticleCount` không phải property của ParticleEmitter trong Roblox API.",
		file = "(không áp dụng ở client)",
		cond = "Không có property được hỗ trợ để thực hiện cách này.",
		risk = "Không áp dụng.",
		status = "E",
	},
	{
		id = "EFFECTS-003",
		group = 10,
		name = "Giảm kích thước hạt",
		mechanism = "Hạ Size của emitter ở xa.",
		cause = "Hạt to chiếm nhiều pixel, tăng chi phí fill-rate.",
		how = "Chưa triển khai.",
		file = "(đề xuất)",
		cond = "Cần đo để biết có đáng.",
		risk = "Hiệu ứng nhỏ đi rõ.",
		status = "D",
	},
	{
		id = "EFFECTS-004",
		group = 10,
		name = "Giảm số emitter đồng thời",
		mechanism = "Bật/tắt emitter theo mức độ quan trọng.",
		cause = "Nhiều emitter chạy cùng lúc cộng dồn chi phí.",
		how = "Chưa triển khai: cần chủ game xếp hạng quan trọng.",
		file = "(đề xuất)",
		cond = "Cần whitelist.",
		risk = "Tắt nhầm hiệu ứng kỹ năng.",
		status = "D",
	},
	{
		id = "EFFECTS-005",
		group = 10,
		name = "Tắt hiệu ứng khi menu đang ẩn",
		mechanism = "Không cập nhật hiệu ứng phụ khi người chơi không cần.",
		cause = "Cập nhật thứ không ai nhìn là lãng phí.",
		how = "Chưa triển khai.",
		file = "(đề xuất)",
		cond = "Cần định nghĩa 'hiệu ứng phụ'.",
		risk = "Dễ ảnh hưởng gameplay.",
		status = "D",
	},
	{
		id = "AUDIO-001",
		group = 11,
		name = "Dừng sound ở rất xa",
		mechanism = "Dừng Sound không quan trọng khi ngoài tầm nghe.",
		cause = "Sound vẫn được giải mã và trộn kể cả khi gần như không nghe thấy.",
		how = "Chưa triển khai: Roblox đã tự roll-off; can thiệp dễ gây lỗi gameplay.",
		file = "(đề xuất)",
		cond = "Cần chủ game đánh dấu sound không quan trọng.",
		risk = "Mất tín hiệu âm thanh quan trọng (bước chân, súng).",
		status = "D",
	},
	{
		id = "AUDIO-002",
		group = 11,
		name = "Tái sử dụng Sound",
		mechanism = "Dùng pool Sound thay vì tạo mới mỗi lần phát.",
		cause = "Tạo Sound mới mỗi lần phát tốn cấp phát và thời gian nạp.",
		how = "Chưa triển khai; Pool đã có sẵn hạ tầng (POOL-001).",
		file = "(đề xuất — dùng Pool.Define)",
		cond = "Cần biết sound nào phát lặp.",
		risk = "Không có nếu reset đúng.",
		status = "D",
	},
	{
		id = "AUDIO-003",
		group = 11,
		name = "Giảm số sound phát đồng thời",
		mechanism = "Giới hạn số sound đang chơi.",
		cause = "Quá nhiều sound đồng thời tốn bộ trộn và bộ nhớ.",
		how = "Chưa triển khai.",
		file = "(đề xuất)",
		cond = "Cần chính sách ưu tiên âm thanh.",
		risk = "Mất âm thanh quan trọng.",
		status = "D",
	},
	{
		id = "GUI-001",
		group = 12,
		name = "ResetOnSpawn = false",
		mechanism = "GUI không bị dựng lại mỗi lần hồi sinh.",
		cause = "Mặc định ScreenGui bị reset khi respawn => dựng lại cây GUI và nối chồng connection.",
		how = "`GuiPolicy.AcquireScreenGui()` đặt ResetOnSpawn = false.",
		file = "Client/Ui/GuiPolicy",
		cond = "Áp dụng cho GUI hệ thống.",
		risk = "Nếu game dựa vào reset GUI thì không áp dụng — ở đây GUI là của hệ thống.",
		status = "B",
	},
	{
		id = "GUI-002",
		group = 12,
		name = "Một GUI duy nhất (singleton)",
		mechanism = "Nếu ScreenGui đã tồn tại thì tái sử dụng, không tạo bản thứ hai.",
		cause = "Chạy script hai lần tạo hai lớp GUI chồng nhau, vừa xấu vừa tốn.",
		how = "`GuiPolicy.AcquireScreenGui()` FindFirstChild theo tên trước khi tạo.",
		file = "Client/Ui/GuiPolicy",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "GUI-003",
		group = 12,
		name = "Dùng TweenService thay vì tự viết hoạt ảnh",
		mechanism = "Mọi chuyển động dùng TweenService.",
		cause = "Tự cập nhật vị trí mỗi khung hình bằng RenderStepped tốn CPU và khó mượt.",
		how = "Notifier dùng TweenService:Create cho trượt xuống + mờ dần.",
		file = "Client/Ui/Notifier",
		cond = "Cần TweenService (có ở client).",
		risk = "Tween vẫn tốn một ít; nhưng rẻ hơn loop thủ công.",
		status = "A",
	},
	{
		id = "GUI-004",
		group = 12,
		name = "Chỉ ghi khi giá trị khác",
		mechanism = "Xem FPS-002.",
		cause = "Ghi trùng giá trị vẫn làm layout bẩn.",
		how = "`GuiPolicy.SetIfChanged()`.",
		file = "Client/Ui/GuiPolicy",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "GUI-005",
		group = 12,
		name = "Giữ cây GUI nhỏ",
		mechanism = "Đếm số node GUI và giữ ở mức tối thiểu.",
		cause = "Mỗi GuiObject là một nút layout phải tính.",
		how = "`GuiPolicy.CountNodes()` dùng trong test để đặt ngưỡng.",
		file = "Client/Ui/GuiPolicy, tests/suites/gui.luau",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "GUI-006",
		group = 12,
		name = "Ngừng hoạt ảnh khi GUI ẩn",
		mechanism = "Không chạy tween / không cập nhật gradient khi Enabled = false.",
		cause = "Hoạt ảnh của thứ không hiển thị là chi phí thuần lãng phí.",
		how = "`GuiPolicy.ShouldAnimate()` kiểm tra Enabled trước khi chạy hoạt ảnh.",
		file = "Client/Ui/GuiPolicy",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "GUI-007",
		group = 12,
		name = "Không tính lại layout mỗi khung hình",
		mechanism = "Kích thước khung tính theo nội dung khi nội dung đổi, không phải mỗi frame.",
		cause = "Đọc/ghi kích thước mỗi frame gây layout thrash.",
		how = "Notifier chỉ FitHeight khi danh sách bước đổi.",
		file = "Client/Ui/Notifier",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "A",
	},
	{
		id = "GUI-008",
		group = 12,
		name = "Tránh AutomaticSize ở cây lớn",
		mechanism = "Không dùng AutomaticSize cho cây nhiều nút.",
		cause = "AutomaticSize buộc engine đo lại toàn bộ cây con mỗi lần đổi.",
		how = "Chưa triển khai đầy đủ; Notifier vẫn dùng AutomaticSize cho khung nhỏ.",
		file = "(một phần — đề xuất hoàn thiện)",
		cond = "Cần đo chi phí thật.",
		risk = "Dùng kích thước cố định thì kém linh hoạt.",
		status = "D",
	},
	{
		id = "GUI-009",
		group = 12,
		name = "Tắt hoạt ảnh trên máy yếu",
		mechanism = "Bậc thiết bị thấp thì bỏ hoạt ảnh không cần thiết.",
		cause = "Trên máy yếu, hoạt ảnh GUI cũng chiếm phần khung hình đáng kể.",
		how = "`GuiPolicy.ShouldAnimate()` nhận cờ allowAnimation từ Devices.",
		file = "Client/Ui/GuiPolicy, Client/Core/Devices",
		cond = "Cần Devices đã chọn bậc.",
		risk = "GUI kém mượt hơn trên máy yếu.",
		status = "A",
	},
	{
		id = "GUI-010",
		group = 12,
		name = "Không kéo GUI được",
		mechanism = "Không gắn hành vi kéo; GUI cố định ở góc dưới phải.",
		cause = "Yêu cầu thiết kế: GUI thông báo không được di chuyển.",
		how = "Notifier không có input kéo; định vị bằng AnchorPoint + Position.",
		file = "Client/Ui/Notifier",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "GUI-011",
		group = 12,
		name = "Dọn GUI khi kết thúc",
		mechanism = "Destroy ScreenGui sau khi hoạt ảnh ẩn xong, chỉ xoá đúng GUI của hệ thống.",
		cause = "GUI còn lại sau khi ẩn vẫn chiếm node và connection.",
		how = "`GuiPolicy.DestroyScreenGui()` kiểm tra Name trước khi Destroy.",
		file = "Client/Ui/GuiPolicy",
		cond = "Luôn áp dụng.",
		risk = "Không có — có kiểm tra tên để không xoá nhầm.",
		status = "B",
	},
	{
		id = "BG-001",
		group = 13,
		name = "Bộ hẹn giờ tập trung",
		mechanism = "Mọi việc định kỳ qua Scheduler, không có while-true riêng.",
		cause = "Mỗi vòng lặp nền là một thread không ai quản lý.",
		how = "Scheduler.Schedule thay cho while-true.",
		file = "Client/Core/Scheduler",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "A",
	},
	{
		id = "BG-002",
		group = 13,
		name = "Điều khiển bằng sự kiện thay vì polling",
		mechanism = "Đăng ký callback với sự kiện thay vì hỏi đi hỏi lại.",
		cause = "Polling tốn CPU ngay cả khi không có gì thay đổi.",
		how = "Scheduler + Registry.Connect; các bước tối ưu chạy một lần theo sự kiện pipeline.",
		file = "Client/Core/Scheduler, Client/Core/Registry",
		cond = "Áp dụng khi có sự kiện phù hợp.",
		risk = "Một số việc không có sự kiện, buộc phải polling.",
		status = "A",
	},
	{
		id = "BG-003",
		group = 13,
		name = "Huỷ bộ hẹn giờ khi xong",
		mechanism = "maxCalls để task tự huỷ sau N lần.",
		cause = "Task vô hạn không cần thiết chạy mãi sau khi việc đã xong.",
		how = "`Scheduler.Schedule({ maxCalls = 1 })` + `Scheduler.Defer`.",
		file = "Client/Core/Scheduler",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "BG-004",
		group = 13,
		name = "Chu kỳ thích ứng theo tải",
		mechanism = "Task ưu tiên thấp bị dời khi khung hình vượt ngân sách.",
		cause = "Khi máy đang nặng, việc nền phải nhường.",
		how = "Scheduler break khi vượt budget; task priority âm chạy sau.",
		file = "Client/Core/Scheduler",
		cond = "Luôn áp dụng.",
		risk = "Việc nền bị trễ khi máy yếu.",
		status = "A",
	},
	{
		id = "BG-005",
		group = 13,
		name = "Không spawn thread cho mỗi sự kiện",
		mechanism = "Xem LEAK-004.",
		cause = "Thread chồng chất khi sự kiện dày.",
		how = "Scheduler.Defer dùng chung một khung.",
		file = "Client/Core/Scheduler",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "A",
	},
	{
		id = "NET-001",
		group = 14,
		name = "Throttle gửi lên server",
		mechanism = "Không gửi lại trong cửa sổ minInterval.",
		cause = "Gửi mỗi khung hình tạo hàng chục gói tin mỗi giây không cần thiết.",
		how = "`Net.Register({ minInterval })` + `Net.Flush()` theo đồng hồ.",
		file = "Client/Core/Net",
		cond = "Cần remote do game cung cấp.",
		risk = "Dữ liệu tới server trễ hơn một chút (có thể chỉnh).",
		status = "A",
	},
	{
		id = "NET-002",
		group = 14,
		name = "Gộp nhiều thông điệp thành một gói",
		mechanism = "Nhiều payload trong hàng đợi được gộp thành một mảng, gửi một lần.",
		cause = "Mỗi FireServer là một gói tin + chi phí serialise riêng.",
		how = "`Net.Flush()` nhánh batch.",
		file = "Client/Core/Net",
		cond = "Server phải hiểu định dạng mảng.",
		risk = "Cần sửa server để đọc mảng — phải phối hợp.",
		status = "A",
	},
	{
		id = "NET-003",
		group = 14,
		name = "Chỉ gửi dữ liệu khác lần trước",
		mechanism = "So sánh nông payload với lần gửi cuối, giống thì bỏ qua.",
		cause = "Gửi lại trạng thái không đổi là băng thông thuần lãng phí.",
		how = "`Net.Send()` dùng shallowEqual, đếm `suppressed`.",
		file = "Client/Core/Net",
		cond = "Payload phải so sánh được bằng giá trị.",
		risk = "Bảng lồng nhau không so sánh sâu — có thể bỏ sót thay đổi bên trong.",
		status = "A",
	},
	{
		id = "NET-004",
		group = 14,
		name = "Gửi dữ liệu nén",
		mechanism = "Dùng số/thay vì chuỗi dài, dùng enum thay tên.",
		cause = "Chuỗi dài tốn byte serialise.",
		how = "Chưa triển khai: phụ thuộc giao thức của từng game.",
		file = "(đề xuất)",
		cond = "Cần thiết kế giao thức.",
		risk = "Không có.",
		status = "D",
	},
	{
		id = "NET-005",
		group = 14,
		name = "Giảm tần suất replicate từ server",
		mechanism = "Server gửi ít lần hơn cho dữ liệu ít đổi.",
		cause = "Replicate dày là nguồn băng thông lớn nhất.",
		how = "Không thể làm từ LocalScript — đây là việc phía server.",
		file = "(không áp dụng được ở client)",
		cond = "Cần quyền sửa server.",
		risk = "Không có.",
		status = "E",
	},
	{
		id = "NET-006",
		group = 14,
		name = "Đặt NetworkOwner hợp lý",
		mechanism = "Server đặt NetworkOwner cho vật thể người chơi điều khiển.",
		cause = "Sai NetworkOwner gây giật và tốn băng thông.",
		how = "Không thể làm từ LocalScript: SetNetworkOwner là API server.",
		file = "(không áp dụng được ở client)",
		cond = "Cần quyền sửa server.",
		risk = "Không có.",
		status = "E",
	},
	{
		id = "NPC-001",
		group = 15,
		name = "Lệch pha cập nhật NPC",
		mechanism = "Mỗi NPC cập nhật ở khung hình khác nhau (index % N).",
		cause = "Cả đàn NPC tính toán cùng một khung hình gây khựng định kỳ.",
		how = "Chưa triển khai: cần module NPC của game.",
		file = "(đề xuất)",
		cond = "Cần quyền sửa script NPC.",
		risk = "Không có nếu lệch pha đúng.",
		status = "D",
	},
	{
		id = "NPC-002",
		group = 15,
		name = "Thưa tần suất tính đường",
		mechanism = "Tìm đường lại sau mỗi N giây, không phải mỗi khung hình.",
		cause = "Pathfinding là một trong những tác vụ đắt nhất của NPC.",
		how = "Chưa triển khai.",
		file = "(đề xuất)",
		cond = "Cần quyền sửa script NPC.",
		risk = "NPC phản ứng chậm hơn với thay đổi địa hình.",
		status = "D",
	},
	{
		id = "NPC-003",
		group = 15,
		name = "Kiểm tra rẻ trước khi tìm đường đắt",
		mechanism = "Hỏi lưới băm 'có mục tiêu gần không' trước khi gọi Pathfinding.",
		cause = "Gọi Pathfinding cho mục tiêu không thể tới là lãng phí lớn.",
		how = "`Spatial:Nearest()` cung cấp truy vấn rẻ để lọc trước.",
		file = "Client/Core/Spatial",
		cond = "Cần dựng lưới cho đối tượng liên quan.",
		risk = "Lưới chỉ là bộ lọc, vẫn cần kiểm tra lại.",
		status = "B",
	},
	{
		id = "NPC-004",
		group = 15,
		name = "Ngừng cập nhật NPC ở xa",
		mechanism = "NPC ngoài tầm quan sát thì giảm tần suất hoặc tạm dừng.",
		cause = "NPC ở xa vẫn tính AI đầy đủ là lãng phí lớn.",
		how = "Chưa triển khai: cần phân biệt NPC nào được phép tạm dừng.",
		file = "(đề xuất)",
		cond = "Cần chủ game cho phép.",
		risk = "NPC 'đứng hình' khi người chơi quay lại.",
		status = "D",
	},
	{
		id = "ASSET-001",
		group = 16,
		name = "Tải trước tài nguyên",
		mechanism = "Dùng ContentProvider:PreloadAsync cho asset dùng ngay khi vào.",
		cause = "Tải asset đúng lúc cần gây khựng hình giữa trận.",
		how = "Chưa triển khai: cần biết danh sách asset của game.",
		file = "(đề xuất)",
		cond = "Cần quyền sửa game.",
		risk = "Preload nhiều làm chậm lúc vào game.",
		status = "D",
	},
	{
		id = "ASSET-002",
		group = 16,
		name = "Nạp module lười",
		mechanism = "Chỉ require khi thật sự dùng tới.",
		cause = "Mọi module nạp lúc khởi động làm chậm thời gian vào game.",
		how = "`Cpu.Lazy(path)` trả về hàm; require chỉ chạy khi gọi.",
		file = "Client/Core/Cpu",
		cond = "Luôn áp dụng.",
		risk = "Lần dùng đầu tiên bị trễ một chút.",
		status = "A",
	},
	{
		id = "ASSET-003",
		group = 16,
		name = "Cache kết quả tra cứu",
		mechanism = "Xem QUERY-002.",
		cause = "Tra cứu cây instance lặp lại là chi phí vô ích.",
		how = "`Registry.cache` + tự vô hiệu khi instance bị huỷ.",
		file = "Client/Core/Registry",
		cond = "Luôn áp dụng.",
		risk = "Cache sai nếu instance bị thay thế bởi instance cùng tên — Watch xử lý việc này.",
		status = "B",
	},
	{
		id = "ASSET-004",
		group = 16,
		name = "Không dùng chuỗi WaitForChild",
		mechanism = "Tra cứu có cache + chờ có trần thời gian.",
		cause = "`WaitForChild` không trần có thể treo thread vĩnh viễn nếu đối tượng không bao giờ xuất hiện.",
		how = "`Cpu.Await(parent, name, timeout)` dùng Registry.Find + deadline.",
		file = "Client/Core/Cpu",
		cond = "Luôn áp dụng.",
		risk = "Hết thời gian chờ thì bỏ qua bước đó (có log).",
		status = "A",
	},
	{
		id = "ASSET-005",
		group = 16,
		name = "Danh sách asset tập trung",
		mechanism = "Một bảng khai báo asset, nạp một lần.",
		cause = "Asset rải rác khắp script dẫn tới nạp trùng.",
		how = "Chưa triển khai.",
		file = "(đề xuất)",
		cond = "Cần khảo sát game.",
		risk = "Không có.",
		status = "D",
	},
	{
		id = "DATA-001",
		group = 17,
		name = "Pool đối tượng",
		mechanism = "Xem POOL-001.",
		cause = "Tạo/huỷ instance liên tục rất đắt.",
		how = "Client/Core/Pool.",
		file = "Client/Core/Pool",
		cond = "Áp dụng cho đối tượng sinh ra thường xuyên.",
		risk = "Không có nếu reset đúng.",
		status = "B",
	},
	{
		id = "DATA-002",
		group = 17,
		name = "Lưới băm không gian",
		mechanism = "Chia thế giới thành ô; truy vấn lân cận chỉ duyệt ô quanh điểm hỏi.",
		cause = "Quét O(n) toàn thế giới cho mỗi truy vấn gần.",
		how = "`Spatial.New/Insert/QueryRadius/Nearest`.",
		file = "Client/Core/Spatial",
		cond = "Hữu ích khi vị trí ít đổi hoặc cập nhật lưới theo chu kỳ.",
		risk = "Với vật di chuyển nhanh, lưới phải rebuild thường xuyên.",
		status = "B",
	},
	{
		id = "DATA-003",
		group = 17,
		name = "Duyệt mảng bằng chỉ số",
		mechanism = "Xem LOOP-007: nhanh hơn pairs và có thứ tự xác định.",
		cause = "pairs() chậm hơn và thứ tự không đảm bảo.",
		how = "`Cpu.ForEachIndex()`.",
		file = "Client/Core/Cpu",
		cond = "Áp dụng cho mảng.",
		risk = "Không dùng được cho bảng khoá chuỗi.",
		status = "B",
	},
	{
		id = "DATA-004",
		group = 17,
		name = "Dùng set thay vì tìm trong danh sách",
		mechanism = "Tra cứu 'đã xử lý chưa' bằng bảng khoá thay vì duyệt danh sách.",
		cause = "Duyệt danh sách để kiểm tra thành viên là O(n) mỗi lần.",
		how = "`Safety.BuildProtectedSet()` trả về set để tra O(1).",
		file = "Shared/Safety",
		cond = "Áp dụng khi kiểm tra thành viên nhiều lần.",
		risk = "Tốn bộ nhớ cho bảng khoá.",
		status = "B",
	},
	{
		id = "EVT-001",
		group = 18,
		name = "Kết nối tín hiệu khung hình một lần",
		mechanism = "Xem LOOP-001.",
		cause = "N kết nối RenderStepped/Heartbeat = N lần gọi mỗi khung hình.",
		how = "Scheduler giữ đúng một connection.",
		file = "Client/Core/Scheduler",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "A",
	},
	{
		id = "EVT-002",
		group = 18,
		name = "Một kết nối cho mỗi tín hiệu mỗi module",
		mechanism = "Registry đếm connection để phát hiện nối trùng.",
		cause = "Nối trùng cùng một handler làm việc chạy hai lần.",
		how = "`Registry.ConnectionCount()` + test kiểm tra không tăng bất thường.",
		file = "Client/Core/Registry, tests",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "EVT-003",
		group = 18,
		name = "Định tuyến log tập trung",
		mechanism = "Mọi module log qua Shared/Log, không print rải rác.",
		cause = "print mỗi sự kiện vừa tốn vừa làm ngập Output, khó chẩn đoán.",
		how = "`Shared/Log` có mức lọc và bộ đệm vòng.",
		file = "Shared/Log",
		cond = "Luôn áp dụng.",
		risk = "Log mức debug vẫn tốn nếu bật.",
		status = "A",
	},
	{
		id = "EVT-004",
		group = 18,
		name = "Gộp tín hiệu",
		mechanism = "Một BindableEvent chung thay vì nhiều tín hiệu nhỏ.",
		cause = "Mỗi tín hiệu là một đối tượng và một lần Fire riêng.",
		how = "Chưa triển khai: Progress đang dùng một BindableEvent riêng.",
		file = "(một phần — đề xuất)",
		cond = "Cần thiết kế lại.",
		risk = "Khó debug hơn khi gộp.",
		status = "D",
	},
	{
		id = "EVT-005",
		group = 18,
		name = "Tránh FireAllClients dày",
		mechanism = "Server không bắn remote cho mọi người chơi mỗi khung hình.",
		cause = "FireAllClients dày nhân băng thông theo số người chơi.",
		how = "Không áp dụng được từ LocalScript.",
		file = "(không áp dụng ở client)",
		cond = "Cần quyền sửa server.",
		risk = "Không có.",
		status = "E",
	},
	{
		id = "QUERY-001",
		group = 19,
		name = "Dùng CollectionService thay vì quét",
		mechanism = "Đánh tag đối tượng cần quản lý rồi lấy theo tag.",
		cause = "GetDescendants trả về mọi thứ, phải lọc lại rất tốn.",
		how = "Chưa triển khai đầy đủ; Safety đã dùng GetTagged để lấy tag bảo vệ.",
		file = "Shared/Safety",
		cond = "Cần chủ game đánh tag.",
		risk = "Không có.",
		status = "A",
	},
	{
		id = "QUERY-002",
		group = 19,
		name = "Cache FindFirstChild",
		mechanism = "Xem ASSET-003.",
		cause = "Tra cứu lặp lại cùng một đối tượng là chi phí vô ích.",
		how = "`Registry.Find()` có cache và tự vô hiệu.",
		file = "Client/Core/Registry",
		cond = "Luôn áp dụng.",
		risk = "Xem ASSET-003.",
		status = "B",
	},
	{
		id = "QUERY-003",
		group = 19,
		name = "Truy vấn theo vùng",
		mechanism = "Xem DATA-002.",
		cause = "Quét toàn cây để tìm vật gần.",
		how = "`Spatial:QueryRadius()`.",
		file = "Client/Core/Spatial",
		cond = "Xem DATA-002.",
		risk = "Lưới là bộ lọc, không phải kết quả cuối.",
		status = "B",
	},
	{
		id = "QUERY-004",
		group = 19,
		name = "Trần cho việc quét",
		mechanism = "Mọi lần quét có maxScan; vượt thì dừng và ghi log.",
		cause = "Quét không trần trên map lớn gây khựng hình ngay lúc bắt đầu.",
		how = "`Scan.Descendants({ maxScan })` và `Spatial:Rebuild(maxEntries)`.",
		file = "Client/Optimizations/Scan, Client/Core/Spatial",
		cond = "Luôn áp dụng.",
		risk = "Bỏ sót đối tượng ngoài trần — có log để biết.",
		status = "B",
	},
	{
		id = "QUERY-005",
		group = 19,
		name = "Lập chỉ mục theo tag",
		mechanism = "Giữ bảng tag -> danh sách để tra nhanh.",
		cause = "GetTagged mỗi lần hỏi là một lời gọi engine.",
		how = "Chưa triển khai.",
		file = "(đề xuất)",
		cond = "Cần tag ổn định.",
		risk = "Chỉ mục cũ nếu tag đổi mà không cập nhật.",
		status = "D",
	},
	{
		id = "POOL-001",
		group = 20,
		name = "Pool instance theo loại",
		mechanism = "Acquire lấy từ pool, Release trả về thay vì Destroy.",
		cause = "Instance.new và Destroy đều đắt; làm liên tục gây khựng.",
		how = "`Pool.Define/Acquire/Release`.",
		file = "Client/Core/Pool",
		cond = "Áp dụng cho đối tượng sinh ra thường xuyên.",
		risk = "Pool không reset đúng sẽ tái sử dụng đối tượng bẩn — có hook prepare.",
		status = "B",
	},
	{
		id = "POOL-002",
		group = 20,
		name = "Tái sử dụng Tween",
		mechanism = "Giữ và phát lại Tween thay vì tạo mới mỗi lần.",
		cause = "Tạo Tween mỗi lần cũng là cấp phát đối tượng.",
		how = "Chưa triển khai: Notifier tạo tween mỗi lần ẩn.",
		file = "(đề xuất)",
		cond = "Tween chỉ tái sử dụng được khi goal giống nhau.",
		risk = "Không có.",
		status = "D",
	},
	{
		id = "POOL-003",
		group = 20,
		name = "Tái sử dụng bảng tạm",
		mechanism = "Xem RAM-002.",
		cause = "Cấp phát bảng trong vòng lặp nóng ép GC.",
		how = "`Pool.AcquireTable/ReleaseTable`.",
		file = "Client/Core/Pool",
		cond = "Áp dụng cho bảng tạm.",
		risk = "Xem RAM-002.",
		status = "B",
	},
	{
		id = "POOL-004",
		group = 20,
		name = "Sổ theo dõi pool và trần dung lượng",
		mechanism = "Pool có cap; đầy thì huỷ thật; thống kê reused/created.",
		cause = "Pool không trần biến thành nguồn rò rỉ mới.",
		how = "`pool.cap`, `Pool.stats.capped`, `Pool.Stats()`.",
		file = "Client/Core/Pool",
		cond = "Luôn áp dụng.",
		risk = "Cap nhỏ thì ít tái sử dụng.",
		status = "B",
	},
	{
		id = "POOL-005",
		group = 20,
		name = "Kiểm tra đối tượng trong pool còn sống",
		mechanism = "Trước khi tái sử dụng, kiểm tra Parent còn tồn tại.",
		cause = "Game có thể đã Destroy đối tượng trong pool; dùng lại sẽ lỗi.",
		how = "`Pool.Acquire()` gọi Guard.Alive trước khi trả về.",
		file = "Client/Core/Pool",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "PLAYER-001",
		group = 21,
		name = "Thưa cập nhật dữ liệu người chơi",
		mechanism = "Không cập nhật leaderstats/attribute mỗi khung hình.",
		cause = "Cập nhật dày gây replicate và tốn CPU.",
		how = "Chưa triển khai: thuộc script gameplay của game.",
		file = "(đề xuất)",
		cond = "Cần quyền sửa script game.",
		risk = "Hiển thị trễ hơn.",
		status = "D",
	},
	{
		id = "PLAYER-002",
		group = 21,
		name = "Cache thuộc tính người chơi",
		mechanism = "Đọc attribute một lần, cập nhật khi có sự kiện.",
		cause = "Đọc attribute mỗi khung hình là tra cứu lặp lại.",
		how = "Chưa triển khai.",
		file = "(đề xuất)",
		cond = "Cần biết attribute nào dùng thường xuyên.",
		risk = "Cache cũ nếu không nghe sự kiện.",
		status = "D",
	},
	{
		id = "PLAYER-003",
		group = 21,
		name = "Không gọi GetPlayers mỗi khung hình",
		mechanism = "Giữ danh sách người chơi, cập nhật theo PlayerAdded/Removing.",
		cause = "GetPlayers cấp phát bảng mới mỗi lần gọi.",
		how = "Chưa triển khai: hệ thống này không cần danh sách người chơi.",
		file = "(đề xuất)",
		cond = "Áp dụng cho script cần danh sách.",
		risk = "Danh sách cũ nếu bỏ sót sự kiện.",
		status = "D",
	},
	{
		id = "PLAYER-004",
		group = 21,
		name = "Dọn dẹp khi người chơi rời",
		mechanism = "Nghe PlayerRemoving để xoá dữ liệu của người đó.",
		cause = "Dữ liệu người chơi đã rời tích tụ thành rò rỉ.",
		how = "Chưa triển khai: hệ thống chỉ tối ưu cho LocalPlayer.",
		file = "(đề xuất)",
		cond = "Áp dụng cho script server.",
		risk = "Không có.",
		status = "D",
	},
	{
		id = "HEAVY-001",
		group = 22,
		name = "Phân vị thời gian khung hình",
		mechanism = "Tính p1/p5/p50/p95 thay vì chỉ trung bình.",
		cause = "Trung bình che mất các khung hình giật — thứ người chơi thật sự cảm nhận.",
		how = "`Perf.Percentile` + `Perf.Summarize`.",
		file = "Client/Core/Perf",
		cond = "Cần đủ mẫu.",
		risk = "Mẫu ít thì phân vị kém ổn định.",
		status = "A",
	},
	{
		id = "HEAVY-002",
		group = 22,
		name = "Đếm khung hình dài",
		mechanism = "Đếm số khung hình vượt ngưỡng (mặc định 33.3ms = dưới 30 FPS).",
		cause = "Số khung hình giật là chỉ số trực tiếp của trải nghiệm.",
		how = "`Profile.longFrames` + `Profile.longFrameThresholdMs`.",
		file = "Client/Core/Profile",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "A",
	},
	{
		id = "HEAVY-003",
		group = 22,
		name = "Theo dõi heap Luau",
		mechanism = "Đọc collectgarbage(\"count\") trước và sau.",
		cause = "Heap tăng đều theo thời gian là dấu hiệu rò rỉ.",
		how = "`Profile.Run()` ghi heapKb; Profile.Compare tính delta.",
		file = "Client/Core/Profile",
		cond = "Cần collectgarbage (có trong Luau).",
		risk = "Heap Luau không phải toàn bộ RAM của game.",
		status = "A",
	},
	{
		id = "HEAVY-004",
		group = 22,
		name = "Đo chi phí của chính công cụ",
		mechanism = "Đo thời gian Scheduler.Tick tiêu tốn mỗi khung hình.",
		cause = "Công cụ chống lag mà tự gây lag thì vô nghĩa.",
		how = "`Profile.SelfCost()` đọc Scheduler.lastFrameCostMs và overruns.",
		file = "Client/Core/Profile, Client/Core/Scheduler",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "A",
	},
	{
		id = "HEAVY-005",
		group = 22,
		name = "Cảnh báo tác vụ vượt ngân sách",
		mechanism = "Scheduler đếm overrun; vượt nhiều thì báo.",
		cause = "Cần biết công cụ có đang chiếm quá nhiều khung hình.",
		how = "`Scheduler.overruns` + log cảnh báo.",
		file = "Client/Core/Scheduler",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "A",
	},
	{
		id = "DIST-001",
		group = 23,
		name = "Cull theo khoảng cách camera",
		mechanism = "Xem GRAPHICS-004/FX-001: tắt chi phí của thứ ở xa.",
		cause = "Engine vẫn trả chi phí cho thứ người chơi không thấy rõ.",
		how = "`Cull.Scan()` so khoảng cách bình phương với ngưỡng.",
		file = "Client/Core/Cull",
		cond = "Chỉ đối tượng đã đăng ký.",
		risk = "Xem GRAPHICS-004.",
		status = "B",
	},
	{
		id = "DIST-002",
		group = 23,
		name = "Giảm tần suất cập nhật cho đối tượng xa",
		mechanism = "Đối tượng xa được quét ít thường xuyên hơn.",
		cause = "Cập nhật đều đặn cho thứ ở xa là lãng phí.",
		how = "`Cull.rules.updateInterval` áp dụng cho toàn bộ lượt quét; đối tượng xa chỉ bị đổi trạng thái, không tính lại mỗi lượt.",
		file = "Client/Core/Cull",
		cond = "Luôn áp dụng.",
		risk = "Phản ứng chậm hơn khi đối tượng lại gần.",
		status = "A",
	},
	{
		id = "DIST-003",
		group = 23,
		name = "Bỏ qua hiệu ứng ở xa",
		mechanism = "Xem FX-001.",
		cause = "Hiệu ứng xa vẫn sinh hạt.",
		how = "Cull nhánh effects với effectDistance.",
		file = "Client/Core/Cull",
		cond = "Chỉ đối tượng đã đăng ký.",
		risk = "Xem FX-001.",
		status = "B",
	},
	{
		id = "DIST-004",
		group = 23,
		name = "Tự khôi phục khi lại gần",
		mechanism = "Khi đối tượng vào trong ngưỡng, mọi property được đặt lại giá trị cũ.",
		cause = "Nếu chỉ tắt mà không khôi phục, người chơi sẽ thấy vật thể 'chết' khi lại gần.",
		how = "`Cull.RestoreTarget()` dùng Guard.Change với expect để khôi phục đúng.",
		file = "Client/Core/Cull, Client/Core/Guard",
		cond = "Luôn áp dụng.",
		risk = "Nếu game đã đổi giá trị đó, Guard trả 'stale' và KHÔNG ghi đè.",
		status = "B",
	},
	{
		id = "LOWEND-001",
		group = 24,
		name = "Nhận diện nền tảng",
		mechanism = "Đọc TouchEnabled/GamepadEnabled/KeyboardEnabled từ UserInputService.",
		cause = "Cùng một mức giảm đồ hoạ là quá tay trên PC và chưa đủ trên mobile.",
		how = "`Devices.DetectPlatform()`.",
		file = "Client/Core/Devices",
		cond = "UserInputService không có trên server.",
		risk = "Chỉ biết nền tảng, KHÔNG biết cấu hình CPU/GPU — đây là ước lượng.",
		status = "B",
	},
	{
		id = "LOWEND-002",
		group = 24,
		name = "Chọn bậc chất lượng theo nền tảng và FPS đo được",
		mechanism = "Ba bậc low/medium/high; hạ bậc khi FPS đo được thấp.",
		cause = "Cần mức can thiệp khác nhau cho máy khác nhau.",
		how = "`Devices.ChooseTier(measuredFps)`; chỉ dùng FPS khi có số đo THẬT.",
		file = "Client/Core/Devices",
		cond = "Cần Profile đã đo.",
		risk = "Nếu chưa đo thì chỉ dựa nền tảng — có nêu rõ trong báo cáo.",
		status = "B",
	},
	{
		id = "LOWEND-003",
		group = 24,
		name = "Giảm mật độ hạt mạnh hơn trên máy yếu",
		mechanism = "particleScale theo bậc thiết bị nhân vào mức trần hạt.",
		cause = "Hạt là chi phí lớn nhất trên GPU mobile.",
		how = "`Devices.ParticleScale()` dùng trong Effects khi tính trần.",
		file = "Client/Core/Devices, Client/Optimizations/Effects",
		cond = "Cần bậc đã chọn.",
		risk = "Hiệu ứng thưa hơn trên máy yếu.",
		status = "B",
	},
	{
		id = "LOWEND-004",
		group = 24,
		name = "Rút gọn GUI trên máy yếu",
		mechanism = "Bậc thấp thì bỏ hoạt ảnh GUI.",
		cause = "Hoạt ảnh GUI cũng chiếm khung hình trên máy yếu.",
		how = "`Devices.ShouldAnimateGui()` -> GuiPolicy.ShouldAnimate.",
		file = "Client/Core/Devices, Client/Ui/GuiPolicy",
		cond = "Cần bậc đã chọn.",
		risk = "GUI kém mượt trên máy yếu.",
		status = "B",
	},
	{
		id = "LOWEND-005",
		group = 24,
		name = "Đọc thông số phần cứng thật",
		mechanism = "Lấy số nhân CPU, dung lượng RAM, model GPU để quyết định.",
		cause = "Ước lượng theo nền tảng không chính xác bằng thông số thật.",
		how = "Roblox không cung cấp API này cho script.",
		file = "(không khả dụng)",
		cond = "Không có API.",
		risk = "Không có.",
		status = "E",
	},
	{
		id = "MEAS-001",
		group = 25,
		name = "Lấy mẫu trước và sau",
		mechanism = "Đo cùng một chỉ số trước và sau tối ưu, cùng độ dài cửa sổ.",
		cause = "Không đo thì mọi tuyên bố cải thiện đều là đoán.",
		how = "`Profile.Run(duration, { label })` gọi hai lần với baseline/after.",
		file = "Client/Core/Profile",
		cond = "Cần RenderStepped (client).",
		risk = "Điều kiện hai lần đo phải tương đương — census được ghi kèm để kiểm tra.",
		status = "B",
	},
	{
		id = "MEAS-002",
		group = 25,
		name = "Thống kê phân vị",
		mechanism = "Xem HEAVY-001.",
		cause = "Một con số trung bình không mô tả được trải nghiệm.",
		how = "`Perf.Summarize(\"ms\")` trả mean/min/max/stddev/p1/p5/p50/p95/p99.",
		file = "Client/Core/Perf",
		cond = "Cần đủ mẫu.",
		risk = "Không có.",
		status = "A",
	},
	{
		id = "MEAS-003",
		group = 25,
		name = "Bảng so sánh có kiểm tra hợp lệ",
		mechanism = "Chỉ kết luận khi CẢ HAI lần đo có mẫu; thiếu thì báo 'không kết luận được'.",
		cause = "Báo cáo cải thiện từ dữ liệu rỗng là bịa số.",
		how = "`Profile.Compare()` trả valid=false kèm lý do.",
		file = "Client/Core/Profile",
		cond = "Luôn áp dụng.",
		risk = "Không có — đây chính là chốt chống bịa số.",
		status = "B",
	},
	{
		id = "MEAS-004",
		group = 25,
		name = "Công tắc A/B cho từng nhóm",
		mechanism = "Bật/tắt nhóm rồi đo lại để biết nhóm nào thật sự có ích.",
		cause = "Có nhóm tối ưu trên lý thuyết nhưng lại làm chậm hơn trên máy cụ thể.",
		how = "Config.groups + Devices.IsEnabled; đo lại sau mỗi lần đổi.",
		file = "Shared/Config, Client/Core/Devices",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "MEAS-005",
		group = 25,
		name = "Đo chi phí bản thân công cụ",
		mechanism = "Xem HEAVY-004.",
		cause = "Công cụ phải chứng minh nó không tự gây lag.",
		how = "`Profile.SelfCost()`.",
		file = "Client/Core/Profile",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "A",
	},
	{
		id = "MEAS-006",
		group = 25,
		name = "Ghi ngữ cảnh của lần đo",
		mechanism = "Ghi số part/emitter/model của mỗi lần đo.",
		cause = "Hai lần đo trong hai cảnh khác nhau thì không so sánh được.",
		how = "`Profile.WorldCensus()` gắn vào kết quả đo.",
		file = "Client/Core/Profile",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "MEAS-007",
		group = 25,
		name = "Không tạo số liệu giả",
		mechanism = "Nếu runtime không cho đọc một chỉ số, trả available=false.",
		cause = "Số liệu giả nguy hiểm hơn không có số liệu.",
		how = "Mọi hàm đo đều có nhánh available=false; Profile.Compare từ chối kết luận.",
		file = "Client/Core/Profile",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "REC-001",
		group = 26,
		name = "Mọi thao tác nguy hiểm trong pcall",
		mechanism = "Xem CPU-008.",
		cause = "Một lỗi làm sập cả hệ thống và mất khả năng khôi phục.",
		how = "`Guard.Run()`.",
		file = "Client/Core/Guard",
		cond = "Luôn áp dụng.",
		risk = "Xem CPU-008.",
		status = "B",
	},
	{
		id = "REC-002",
		group = 26,
		name = "Không ghi đè thay đổi của người khác",
		mechanism = "Chỉ khôi phục khi giá trị hiện tại VẪN là giá trị script đã đặt.",
		cause = "Game hoặc người chơi có thể đã đổi giá trị đó; ghi đè là phá game.",
		how = "`Guard.Change(..., { expect = <giá trị ta đã đặt> })` trả 'stale' nếu khác.",
		file = "Client/Core/Guard",
		cond = "Luôn áp dụng.",
		risk = "Nếu game đổi giá trị thì bước khôi phục bị bỏ qua (có log) — đúng ý đồ.",
		status = "B",
	},
	{
		id = "REC-003",
		group = 26,
		name = "Cách ly lỗi theo từng bước",
		mechanism = "Một bước failed không chặn các bước sau.",
		cause = "Pipeline dừng giữa chừng để lại trạng thái nửa vời.",
		how = "`Runner.Execute()` pcall từng bước, đánh dấu failed rồi đi tiếp.",
		file = "Client/Core/Runner",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "REC-004",
		group = 26,
		name = "Chuẩn hoá cấu hình sai kiểu",
		mechanism = "Sai kiểu thì dùng mặc định và cảnh báo, không để giá trị sai lan xuống module.",
		cause = "Cấu hình sai gây lỗi ở nơi rất xa nguyên nhân.",
		how = "`Guard.NormalizeConfig(profile, defaults)`.",
		file = "Client/Core/Guard",
		cond = "Luôn áp dụng.",
		risk = "Người dùng có thể không để ý cảnh báo.",
		status = "B",
	},
	{
		id = "RESTORE-001",
		group = 26,
		name = "Ghi nhật ký giá trị cũ",
		mechanism = "Mọi property bị đổi đều ghi lại giá trị trước đó kèm id bước.",
		cause = "Không ghi thì không thể khôi phục.",
		how = "`Restore.Record(instance, property, oldValue, stepId)`.",
		file = "Client/Core/Restore",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "RESTORE-002",
		group = 26,
		name = "Hoàn tác theo thứ tự ngược",
		mechanism = "Khôi phục từ thay đổi mới nhất trở về.",
		cause = "Khôi phục sai thứ tự có thể đặt trạng thái không nhất quán.",
		how = "`Restore.All()` lặp từ cuối về đầu.",
		file = "Client/Core/Restore",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "RESTORE-003",
		group = 26,
		name = "Kiểm tra giá trị cũ khi khôi phục",
		mechanism = "Dùng Guard.Change với expect; giá trị đã đổi thì bỏ qua.",
		cause = "Xem REC-002.",
		how = "`Restore.All(setter)` với setter = Guard.Change.",
		file = "Client/Core/Restore, Client/Core/Guard",
		cond = "Luôn áp dụng.",
		risk = "Xem REC-002.",
		status = "B",
	},
	{
		id = "RESTORE-004",
		group = 26,
		name = "Quên đối tượng đã huỷ",
		mechanism = "Khi instance bị Destroy, xoá mục restore của nó.",
		cause = "Giữ tham chiếu instance đã huỷ vừa rò rỉ vừa gây lỗi.",
		how = "`Restore.Forget(instance)` được Cull gọi khi khôi phục; Registry.Watch phát hiện huỷ.",
		file = "Client/Core/Restore, Client/Core/Cull",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "A",
	},
	{
		id = "CFG-001",
		group = 27,
		name = "Bật/tắt theo nhóm",
		mechanism = "profile.groups.<group> = false tắt cả nhóm.",
		cause = "Người dùng cần tắt nhanh một nhóm gây tác dụng phụ.",
		how = "`Devices.IsEnabled(profile, groupKey)`.",
		file = "Client/Core/Devices, Shared/Config",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "CFG-002",
		group = 27,
		name = "Bật/tắt từng phương pháp",
		mechanism = "profile.methods.<id> = false tắt riêng một phương pháp.",
		cause = "Có phương pháp tốt với game này nhưng hại với game khác.",
		how = "`Devices.IsEnabled(profile, nil, methodId)`.",
		file = "Client/Core/Devices, Shared/Config",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "CFG-003",
		group = 27,
		name = "Kiểm tra kiểu cấu hình",
		mechanism = "Xem REC-004.",
		cause = "Cấu hình sai kiểu gây lỗi khó tìm.",
		how = "`Guard.NormalizeConfig()`.",
		file = "Client/Core/Guard",
		cond = "Luôn áp dụng.",
		risk = "Xem REC-004.",
		status = "B",
	},
	{
		id = "CFG-004",
		group = 27,
		name = "Khôi phục cấu hình mặc định",
		mechanism = "Một hàm đưa toàn bộ cấu hình về mặc định.",
		cause = "Sau khi thử nhiều thiết lập, cần một đường quay lại an toàn.",
		how = "`Config.ResetToDefaults()` ghi lại toàn bộ giá trị mặc định.",
		file = "Shared/Config",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "CFG-005",
		group = 27,
		name = "Liệt kê những gì đang tắt",
		mechanism = "Hàm trả về danh sách nhóm/phương pháp bị tắt.",
		cause = "Người dùng cần biết hiện tại cái gì đang tắt để chẩn đoán.",
		how = "`Devices.DisabledList(profile)`.",
		file = "Client/Core/Devices",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "CFG-006",
		group = 27,
		name = "Bật/tắt lúc chạy",
		mechanism = "Đổi cấu hình khi hệ thống đang chạy và áp dụng ngay.",
		cause = "Khởi động lại script để đổi một cờ là trải nghiệm tệ.",
		how = "Chưa triển khai: đổi cấu hình hiện cần chạy lại pipeline.",
		file = "(đề xuất)",
		cond = "Cần cơ chế áp dụng增量.",
		risk = "Không có.",
		status = "D",
	},
	{
		id = "RES-001",
		group = 28,
		name = "Bộ lập lịch duy nhất",
		mechanism = "Xem LOOP-001.",
		cause = "Nhiều bộ lập lịch = nhiều kết nối, không kiểm soát được tổng chi phí.",
		how = "Client/Core/Scheduler là bộ lập lịch duy nhất của dự án.",
		file = "Client/Core/Scheduler",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "A",
	},
	{
		id = "RES-002",
		group = 28,
		name = "Sổ kết nối tập trung",
		mechanism = "Xem LEAK-001.",
		cause = "Connection rải rác không dọn được.",
		how = "Client/Core/Registry.",
		file = "Client/Core/Registry",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "A",
	},
	{
		id = "RES-003",
		group = 28,
		name = "Sổ instance tập trung",
		mechanism = "Xem LEAK-005.",
		cause = "Instance tạo ra không ai quản lý.",
		how = "`Registry.owned` + Release.",
		file = "Client/Core/Registry",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "RES-004",
		group = 28,
		name = "Kho cấu hình tập trung",
		mechanism = "Một bảng Config duy nhất, mọi module đọc từ đó.",
		cause = "Cấu hình rải rác dẫn tới giá trị mâu thuẫn nhau.",
		how = "Shared/Config + Guard.NormalizeConfig.",
		file = "Shared/Config",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "RES-005",
		group = 28,
		name = "Định tuyến log tập trung",
		mechanism = "Xem EVT-003.",
		cause = "Log rải rác khó lọc và dễ làm ngập Output.",
		how = "Shared/Log.",
		file = "Shared/Log",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "A",
	},
	{
		id = "START-001",
		group = 29,
		name = "Hoãn việc nặng sang khung hình sau",
		mechanism = "Scheduler.Defer đẩy việc khởi tạo nặng ra khỏi khung hình đầu.",
		cause = "Làm mọi thứ ở khung hình đầu gây khựng ngay lúc vào game.",
		how = "`Scheduler.Defer(name, callback)`.",
		file = "Client/Core/Scheduler",
		cond = "Luôn áp dụng.",
		risk = "Việc bị trễ một khung hình.",
		status = "B",
	},
	{
		id = "START-002",
		group = 29,
		name = "Nạp module lười lúc khởi động",
		mechanism = "Xem ASSET-002.",
		cause = "Nạp mọi module lúc đầu làm chậm thời gian vào game.",
		how = "`Cpu.Lazy()`.",
		file = "Client/Core/Cpu",
		cond = "Luôn áp dụng.",
		risk = "Xem ASSET-002.",
		status = "A",
	},
	{
		id = "START-003",
		group = 29,
		name = "Gộp việc khởi tạo",
		mechanism = "Các bước khởi tạo chạy trong một vòng, không chờ xen kẽ.",
		cause = "Chuỗi wait nối tiếp cộng dồn thời gian chờ.",
		how = "`Cpu.RunStartupSteps(steps)`.",
		file = "Client/Core/Cpu",
		cond = "Luôn áp dụng.",
		risk = "Một bước lỗi không chặn bước khác (có pcall riêng).",
		status = "B",
	},
	{
		id = "START-004",
		group = 29,
		name = "Chờ có trần thời gian",
		mechanism = "Xem ASSET-004.",
		cause = "WaitForChild không trần có thể treo thread vĩnh viễn.",
		how = "`Cpu.Await(parent, name, timeout)`.",
		file = "Client/Core/Cpu",
		cond = "Luôn áp dụng.",
		risk = "Hết giờ chờ thì bỏ qua bước đó.",
		status = "A",
	},
	{
		id = "START-005",
		group = 29,
		name = "Đo thời gian khởi động",
		mechanism = "Ghi thời điểm bắt đầu/kết thúc từng bước khởi tạo.",
		cause = "Không đo thì không biết bước nào làm chậm lúc vào game.",
		how = "Chưa triển khai: RunStartupSteps chưa ghi thời gian từng bước.",
		file = "(đề xuất)",
		cond = "Luôn áp dụng được.",
		risk = "Không có.",
		status = "D",
	},
	{
		id = "SAFE-001",
		group = 30,
		name = "Danh sách trắng property",
		mechanism = "Chỉ những property thuần thị giác mới được đổi.",
		cause = "Nếu cho phép đổi mọi property, sớm muộn cũng đụng gameplay.",
		how = "`Safety.AllowedProperties`; Safety.Allow từ chối ngoài danh sách.",
		file = "Shared/Safety",
		cond = "Luôn áp dụng.",
		risk = "Danh sách quá hẹp thì bỏ lỡ cơ hội tối ưu — có thể mở rộng có kiểm soát.",
		status = "B",
	},
	{
		id = "SAFE-002",
		group = 30,
		name = "Danh sách đen lớp đối tượng",
		mechanism = "Humanoid, Camera, Tool, Script, RemoteEvent... không bao giờ bị đổi.",
		cause = "Đụng những lớp này gần như chắc chắn phá gameplay.",
		how = "`Safety.ProtectedClasses` + ngoại lệ duy nhất Humanoid.AutomaticScalingEnabled.",
		file = "Shared/Safety",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "SAFE-003",
		group = 30,
		name = "Tôn trọng tag bảo vệ của game",
		mechanism = "Đối tượng mang tag RALO_Protected/Gameplay bị bỏ qua hoàn toàn.",
		cause = "Chủ game cần một cách nói 'đừng đụng vào cái này'.",
		how = "`Safety.ProtectedTags` + `Safety.BuildProtectedSet()`.",
		file = "Shared/Safety",
		cond = "Cần chủ game đánh tag.",
		risk = "Không đánh tag thì đối tượng vẫn có thể bị tối ưu.",
		status = "B",
	},
	{
		id = "SAFE-004",
		group = 30,
		name = "Không đụng điều khiển người chơi",
		mechanism = "Không đổi gì liên quan Humanoid (trừ auto-scaling), Camera, ControlModule.",
		cause = "Mất điều khiển là lỗi nghiêm trọng nhất có thể gây ra.",
		how = "Safety.ProtectedClasses chứa Humanoid/Camera/ControlModule; Physics mặc định tắt.",
		file = "Shared/Safety, Client/Optimizations/Physics",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "SAFE-005",
		group = 30,
		name = "Mọi thay đổi đều đảo ngược được",
		mechanism = "Không có thao tác Destroy nào trên đối tượng của game.",
		cause = "Thay đổi không đảo ngược được là rủi ro không chấp nhận.",
		how = "Restore ghi giá trị cũ; không có lệnh Destroy nào nhắm vào instance của game.",
		file = "Client/Core/Restore",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "SAFE-006",
		group = 30,
		name = "Chính công cụ không được gây lag",
		mechanism = "Xem MEAS-005/HEAVY-004.",
		cause = "Công cụ chống lag mà tự gây lag thì vô nghĩa.",
		how = "Profile.SelfCost + Scheduler budget.",
		file = "Client/Core/Profile",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "SAFE-007",
		group = 30,
		name = "Không xoá nội dung gameplay",
		mechanism = "Không có đường mã nào Destroy instance của game.",
		cause = "Xoá nhầm vật phẩm/NPC là phá game.",
		how = "Registry.Release chỉ huỷ instance TRONG SỔ do hệ thống tạo.",
		file = "Client/Core/Registry",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "RAM-005",
		group = 3,
		name = "Giảm cấp phát chuỗi",
		mechanism = "Dùng bảng và nối chuỗi một lần thay vì nhiều lần ghép.",
		cause = "Mỗi lần ghép chuỗi là một lần cấp phát.",
		how = "Chưa triển khai đầy đủ; Log đang dùng string.format một lần.",
		file = "(một phần — đề xuất)",
		cond = "Áp dụng ở đường nóng.",
		risk = "Không có.",
		status = "D",
	},
	{
		id = "RAM-006",
		group = 3,
		name = "Tránh đóng gói nhiều giá trị trả về",
		mechanism = "Trả một bảng tái sử dụng thay vì nhiều giá trị.",
		cause = "Mỗi lần trả nhiều giá trị có chi phí stack.",
		how = "Chưa triển khai.",
		file = "(đề xuất)",
		cond = "Áp dụng ở đường nóng.",
		risk = "Đọc khó hơn.",
		status = "D",
	},
	{
		id = "FPS-005",
		group = 5,
		name = "Giới hạn FPS phía client",
		mechanism = "Đặt FrameRateMax để giảm tải khi không cần FPS cao.",
		cause = "FPS vượt mức màn hình hiển thị là công sức bị vứt đi.",
		how = "Roblox không cho LocalScript đổi thiết lập client; chỉ có trong menu Settings hoặc executor.",
		file = "(không áp dụng từ LocalScript)",
		cond = "Cần người dùng tự chỉnh trong Settings.",
		risk = "Không có.",
		status = "E",
	},
	{
		id = "LOOP-008",
		group = 2,
		name = "Giảm tần suất RenderStepped",
		mechanism = "Chạy logic ở 30Hz thay vì 60Hz.",
		cause = "Một số logic không cần độ phân giải khung hình đầy đủ.",
		how = "Scheduler.interval đã cho phép; nhưng RenderStepped luôn bắn mỗi khung hình.",
		file = "Client/Core/Scheduler",
		cond = "Áp dụng bằng cách đặt interval.",
		risk = "Phản ứng chậm hơn.",
		status = "A",
	},
	{
		id = "GUI-012",
		group = 12,
		name = "Không phát âm thanh thông báo",
		mechanism = "GUI không tạo Sound nào.",
		cause = "Yêu cầu thiết kế: thông báo im lặng.",
		how = "Notifier không tạo instance Sound; test kiểm tra.",
		file = "Client/Ui/Notifier",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "GUI-013",
		group = 12,
		name = "Không dịch chuyển GUI khác",
		mechanism = "GUI hệ thống nằm trong ScreenGui riêng, không đổi vị trí GUI của game.",
		cause = "Làm lệch GUI của game là phá trải nghiệm.",
		how = "Notifier chỉ tạo instance trong ScreenGui của nó.",
		file = "Client/Ui/Notifier",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "PART-006",
		group = 8,
		name = "Giảm số lượng StreamingEnabled phụ",
		mechanism = "Để engine tự stream model ngoài tầm nhìn.",
		cause = "Giữ mọi model trong bộ nhớ tốn RAM.",
		how = "Chưa triển khai: StreamingEnabled là thiết lập cấp game trong Studio.",
		file = "(đề xuất — làm trong Studio)",
		cond = "Cần quyền sửa game.",
		risk = "Không có nếu cấu hình đúng.",
		status = "D",
	},
	{
		id = "NPC-005",
		group = 15,
		name = "Dùng PathfindingService có bộ nhớ đường",
		mechanism = "Lưu đường đã tính, chỉ tính lại khi đích đổi.",
		cause = "Tính lại đường giống hệt là lãng phí.",
		how = "Chưa triển khai.",
		file = "(đề xuất)",
		cond = "Cần quyền sửa script NPC.",
		risk = "Đường cũ khi địa hình đổi.",
		status = "D",
	},
	{
		id = "ASSET-006",
		group = 16,
		name = "Nén texture và giảm độ phân giải",
		mechanism = "Dùng texture nhỏ hơn cho bề mặt xa.",
		cause = "Texture lớn tốn bộ nhớ GPU và băng thông.",
		how = "Không làm được từ script — phải sửa asset trong Studio.",
		file = "(không áp dụng từ script)",
		cond = "Cần quyền sửa asset.",
		risk = "Chất lượng ảnh giảm.",
		status = "E",
	},
	{
		id = "HEAVY-006",
		group = 22,
		name = "Hồ sơ từng hàm (script profiler)",
		mechanism = "Dùng MicroProfiler/Script Profiler để tìm hàm đắt nhất.",
		cause = "Không biết hàm nào đắt thì tối ưu mò.",
		how = "Không có API đọc profiler từ script; phải dùng công cụ trong Studio.",
		file = "(dùng công cụ Studio, không phải mã)",
		cond = "Cần Studio.",
		risk = "Không có.",
		status = "E",
	},
	{
		id = "PLAYER-005",
		group = 21,
		name = "Không lưu dữ liệu người chơi phía client",
		mechanism = "Dữ liệu nhạy cảm phải ở server.",
		cause = "Lưu phía client vừa rủi ro bảo mật vừa tốn bộ nhớ.",
		how = "Hệ thống này không lưu dữ liệu người chơi nào.",
		file = "(không áp dụng)",
		cond = "-",
		risk = "Không có.",
		status = "E",
	},
	{
		id = "QUERY-006",
		group = 19,
		name = "Tránh GetDescendants đệ quy",
		mechanism = "Không gọi GetDescendants trên node lớn nhiều lần.",
		cause = "GetDescendants cấp phát bảng chứa TOÀN BỘ con cháu.",
		how = "Scan có maxScan; Registry dùng FindFirstChild có cache.",
		file = "Client/Optimizations/Scan, Client/Core/Registry",
		cond = "Luôn áp dụng.",
		risk = "Bỏ sót ngoài trần — có log.",
		status = "B",
	},
	{
		id = "EVT-006",
		group = 18,
		name = "Ngắt kết nối khi module dừng",
		mechanism = "Shutdown ngắt toàn bộ connection của hệ thống.",
		cause = "Module dừng mà connection còn thì callback vẫn chạy.",
		how = "`Registry.Shutdown()` + `Scheduler.Shutdown()`.",
		file = "Client/Core/Registry, Client/Core/Scheduler",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "BG-006",
		group = 13,
		name = "Không giữ vòng lặp khi không có việc",
		mechanism = "Scheduler tự dừng khi không còn task.",
		cause = "Connection Heartbeat chạy không vẫn tốn một lời gọi mỗi khung hình.",
		how = "`Scheduler.TaskCount()`; Shutdown khi tắt hệ thống.",
		file = "Client/Core/Scheduler",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "RES-006",
		group = 28,
		name = "Thống kê tài nguyên tập trung",
		mechanism = "Một hàm trả về toàn bộ số đếm (task, connection, pool, owned).",
		cause = "Không có cái nhìn tổng thể thì không phát hiện được rò rỉ.",
		how = "`Scheduler.Stats()`, `Registry.Stats()`, `Pool.Stats()`, `Profile.SelfCost()`.",
		file = "Client/Core/Scheduler",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "A",
	},
	{
		id = "LOWEND-006",
		group = 24,
		name = "Chế độ an toàn khi lỗi lặp lại",
		mechanism = "Nếu nhiều bước lỗi liên tiếp thì tự chuyển về chế độ ít can thiệp nhất.",
		cause = "Trên máy lạ, can thiệp mạnh có thể gây lỗi dây chuyền.",
		how = "Chưa triển khai.",
		file = "(đề xuất)",
		cond = "Cần ngưỡng lỗi.",
		risk = "Bỏ lỡ tối ưu.",
		status = "D",
	},
	{
		id = "SAFE-008",
		group = 30,
		name = "Không vô hiệu hoá cơ chế bảo vệ",
		mechanism = "Không có mã nào đụng anti-cheat hay bảo mật.",
		cause = "Yêu cầu đạo đức và pháp lý.",
		how = "Dự án không chứa bất kỳ lời gọi nào loại đó; chỉ dùng API công khai.",
		file = "Shared/Safety",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "GRAPHICS-008",
		group = 6,
		name = "Giảm số bóng đổ đồng thời",
		mechanism = "Roblox giới hạn số bóng đổ; vượt quá thì bóng bị cắt.",
		cause = "Nhiều nguồn sáng động làm chi phí bóng tăng vọt.",
		how = "Không điều khiển được từ script — engine tự quản lý.",
		file = "(không khả dụng)",
		cond = "Không có API.",
		risk = "Không có.",
		status = "E",
	},
	{
		id = "AUDIO-004",
		group = 11,
		name = "Giảm chất lượng âm thanh",
		mechanism = "Dùng file âm thanh bitrate thấp hơn.",
		cause = "File lớn tốn bộ nhớ và thời gian giải mã.",
		how = "Không làm được từ script — phải thay asset.",
		file = "(không áp dụng từ script)",
		cond = "Cần quyền sửa asset.",
		risk = "Chất lượng âm thanh giảm.",
		status = "E",
	},
	{
		id = "NET-007",
		group = 14,
		name = "Tránh gửi mỗi khung hình",
		mechanism = "Xem NET-001.",
		cause = "Gửi dày là nguồn băng thông lớn.",
		how = "Net.Register minInterval.",
		file = "Client/Core/Net",
		cond = "Cần remote.",
		risk = "Xem NET-001.",
		status = "A",
	},
	{
		id = "DATA-005",
		group = 17,
		name = "Dùng số thay vì chuỗi làm khoá",
		mechanism = "Khoá số tra nhanh hơn khoá chuỗi.",
		cause = "Băm chuỗi đắt hơn so sánh số.",
		how = "Chưa triển khai; các bảng nội bộ đang dùng khoá hỗn hợp.",
		file = "(đề xuất)",
		cond = "Áp dụng cho bảng lớn.",
		risk = "Đọc khó hơn.",
		status = "D",
	},
	{
		id = "CULL-001",
		group = 23,
		name = "Đăng ký đối tượng cần cull",
		mechanism = "Danh sách tường minh thay vì tự quét cả game.",
		cause = "Tự quyết định đối tượng nào được cull là rủi ro phá gameplay.",
		how = "`Cull.Add(instance, kinds)` có trần maxTargets.",
		file = "Client/Core/Cull",
		cond = "Cần bước đăng ký.",
		risk = "Không đăng ký thì không được tối ưu.",
		status = "B",
	},
	{
		id = "CULL-002",
		group = 23,
		name = "Quét theo chu kỳ, không mỗi khung hình",
		mechanism = "Cull chạy theo interval của Scheduler (mặc định 0.25s).",
		cause = "Tính khoảng cách cho hàng trăm đối tượng mỗi khung hình là quá tốn.",
		how = "`Cull.rules.updateInterval` + Scheduler.",
		file = "Client/Core/Cull",
		cond = "Luôn áp dụng.",
		risk = "Trạng thái cull trễ tối đa một chu kỳ.",
		status = "B",
	},
	{
		id = "CULL-003",
		group = 23,
		name = "Trần số đối tượng theo dõi",
		mechanism = "Vượt maxTargets thì từ chối đăng ký thêm và ghi log.",
		cause = "Theo dõi không giới hạn làm chính bước cull thành nguồn lag.",
		how = "`Cull.rules.maxTargets` (mặc định 400).",
		file = "Client/Core/Cull",
		cond = "Luôn áp dụng.",
		risk = "Bỏ sót đối tượng ngoài trần.",
		status = "B",
	},
	{
		id = "CULL-004",
		group = 23,
		name = "Bỏ đối tượng đã bị huỷ khỏi danh sách",
		mechanism = "Mỗi lượt quét kiểm tra Alive và xoá mục chết.",
		cause = "Giữ instance đã huỷ trong danh sách là rò rỉ.",
		how = "`Cull.Scan()` xoá mục không còn Alive.",
		file = "Client/Core/Cull",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "GRAPHICS-009",
		group = 7,
		name = "Không đổi vật liệu và màu sắc",
		mechanism = "Dự án cố tình KHÔNG đổi Material/Color/BrickColor.",
		cause = "Đổi vật liệu làm thay đổi rõ rệt mỹ thuật, trái yêu cầu giữ nguyên hình ảnh.",
		how = "Safety.AllowedProperties không chứa Material/Color; test kiểm tra.",
		file = "Shared/Safety",
		cond = "Luôn áp dụng.",
		risk = "Không có.",
		status = "B",
	},
	{
		id = "GRAPHICS-010",
		group = 7,
		name = "Không đổi khoảng cách hiển thị",
		mechanism = "Không đổi các thiết lập tầm nhìn của engine.",
		cause = "Yêu cầu: không tự ý thay đổi khoảng cách hiển thị.",
		how = "Không có mã nào đổi thiết lập đó.",
		file = "(không triển khai — có chủ đích)",
		cond = "-",
		risk = "Không có.",
		status = "E",
	},
}

function Methods.CountByStatus()
	local counts = { A = 0, B = 0, C = 0, D = 0, E = 0 }
	for _, entry in Methods.List do
		if counts[entry.status] ~= nil then
			counts[entry.status] += 1
		end
	end
	counts.total = #Methods.List
	return counts
end

--[[
	Tên 30 nhóm nhiệm vụ.

	Số thứ tự ở đây CHÍNH LÀ giá trị trường `group` trong từng mục của Methods.List.
	Bảng này tồn tại để báo cáo và tài liệu gọi nhóm bằng tên thật, không phải
	bằng một con số vô nghĩa.
]]
Methods.Groups = {
	"CPU và chi phí tính toán",              --  1
	"Vòng lặp và công việc lặp lại",         --  2
	"RAM và vòng đời đối tượng",             --  3
	"Rò rỉ tài nguyên",                      --  4
	"FPS và khung hình",                     --  5
	"GPU và tải kết xuất",                   --  6
	"Giảm đồ hoạ mức nhẹ (đảo ngược được)",  --  7
	"Part và Model",                         --  8
	"Va chạm và vật lý",                     --  9
	"Hạt và ánh sáng",                       -- 10
	"Âm thanh",                              -- 11
	"Giao diện (GUI)",                       -- 12
	"Tác vụ nền",                            -- 13
	"RemoteEvent và giao tiếp mạng",         -- 14
	"NPC và AI",                             -- 15
	"Nạp và cache tài nguyên",               -- 16
	"Cấu trúc dữ liệu",                      -- 17
	"Sự kiện và kết nối",                    -- 18
	"Tìm kiếm trong Workspace",              -- 19
	"Tái sử dụng đối tượng (pooling)",       -- 20
	"Dữ liệu người chơi",                    -- 21
	"Phát hiện tác vụ nặng",                 -- 22
	"Đối tượng ở xa",                        -- 23
	"Thiết bị cấu hình thấp",                -- 24
	"Đo lường và kiểm thử",                  -- 25
	"Phục hồi lỗi và hoàn tác",              -- 26
	"Bật tắt tính năng",                     -- 27
	"Quản lý tài nguyên tập trung",          -- 28
	"Khởi động",                             -- 29
	"Tổng thể không phá gameplay",           -- 30
}

function Methods.CountByGroup()
	local counts = {}
	for g = 1, 30 do
		counts[g] = { total = 0, implemented = 0, name = Methods.Groups[g] or ("nhóm " .. g) }
	end
	for _, entry in Methods.List do
		local bucket = counts[entry.group]
		if bucket ~= nil then
			bucket.total += 1
			bucket[entry.status] = (bucket[entry.status] or 0) + 1
			if entry.status == "A" or entry.status == "B" or entry.status == "C" then
				bucket.implemented += 1
			end
		end
	end
	return counts
end

function Methods.GetById(id)
	for _, entry in Methods.List do
		if entry.id == id then
			return entry
		end
	end
	return nil
end

function Methods.ImplementedIds()
	local out = {}
	for _, entry in Methods.List do
		if entry.status == "A" or entry.status == "B" or entry.status == "C" then
			out[#out + 1] = entry.id
		end
	end
	table.sort(out)
	return out
end

return Methods
end,
	["Shared/RequireShim"] = function()
--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  CPU-003
	===== RALO.METHODS:END ===== --]]

--[[
	Shared/RequireShim.luau
	===== RALO.METHODS:SHIM-001 =====

	Vấn đề: dự án phải chạy được ở HAI kiểu nạp khác nhau
	  (1) Roblox Studio + Rojo: mỗi tệp là một ModuleScript, dùng require()
	      và cây instance (ReplicatedStorage.RALO.Shared.Log ...).
	  (2) Bundle một tệp (dist/): toàn bộ module nằm trong một bảng,
	      không có cây instance.

	Giải pháp: Bootstrap cài một hàm nạp module thống nhất tên
	__RALO_REQUIRE. Nó thử theo thứ tự:
	  a) bảng __RALO_BUNDLE (do bundle cài)
	  b) require() thật của Roblox, duyệt theo đường dẫn tuyệt đối
	     tính từ gốc dự án (Shared/..., Client/..., Server/...)

	Cả hai nhánh đều là cơ chế nạp module CÓ THẬT của Roblox, không giả lập.

	Tệp này KHÔNG dùng __RALO_REQUIRE (vì nó chính là thứ cài ra hàm đó);
	nó được Bootstrap nạp bằng require() thường hoặc nằm đầu bundle.
]]

local RequireShim = {}

RequireShim.globalName = "__RALO_REQUIRE"

local ROOT_NAMES = { "Shared", "Client", "Server" }

-- Duyệt "Client/Core/Perf" thành chuỗi instance con từ một gốc.
local function resolveFrom(root, path)
	if root == nil then
		return nil
	end
	local node = root
	for segment in string.gmatch(path, "[^/]+") do
		if node == nil then
			return nil
		end
		node = node:FindFirstChild(segment)
	end
	return node
end

-- Tìm gốc dự án: instance cha chứa các thư mục Shared/Client/Server.
local function findProjectRoot(gameRef)
	if gameRef == nil then
		return nil
	end
	local starterPlayer = gameRef:GetService("StarterPlayer")
	local services = {
		gameRef:GetService("ReplicatedStorage"),
		starterPlayer and starterPlayer:FindFirstChild("StarterPlayerScripts"),
		gameRef:GetService("ServerScriptService"),
	}
	for _, service in services do
		if service ~= nil then
			for _, rootName in ROOT_NAMES do
				local candidate = service:FindFirstChild(rootName)
				if candidate ~= nil then
					local parent = candidate.Parent
					if parent ~= nil and parent:FindFirstChild("Shared") ~= nil then
						return parent
					end
				end
			end
			local named = service:FindFirstChild("RALO")
			if named ~= nil then
				return named
			end
		end
	end
	return nil
end

--[[
	Cài __RALO_REQUIRE. Gọi MỘT lần trước khi nạp bất kỳ module nào khác.
	options = { game = <DataModel>, bundle = <bảng path->source|module> }
]]
function RequireShim.Install(options)
	options = options or {}

	-- Dự án chạy trong Roblox Studio thường (không executor) nên bảng toàn
	-- cục chỉ là `_G`. Không dò getgenv: đó là API của executor, và việc dò
	-- nó mâu thuẫn với phạm vi đã thống nhất của dự án.
	local globalEnv = _G

	if globalEnv[RequireShim.globalName] ~= nil and options.force ~= true then
		return globalEnv[RequireShim.globalName]
	end

	if options.bundle ~= nil then
		globalEnv.__RALO_BUNDLE = options.bundle
	end

	local cache = {}
	local gameRef = options.game or game

	local function resolver(path)
		if type(path) ~= "string" then
			error("__RALO_REQUIRE cần một chuỗi đường dẫn, nhận " .. type(path), 2)
		end
		if cache[path] ~= nil then
			return cache[path]
		end

		-- (a) bundle
		local bundle = globalEnv.__RALO_BUNDLE
		if type(bundle) == "table" and bundle[path] ~= nil then
			local entry = bundle[path]
			local result
			if type(entry) == "string" then
				local loaded, compileError = load(entry, "RALO:" .. path)
				if loaded == nil then
					error("lỗi biên dịch module '" .. path .. "': " .. tostring(compileError), 2)
				end
				result = loaded()
			else
				result = entry
			end
			if type(result) ~= "table" then
				error("module '" .. path .. "' phải return một bảng, nhận " .. type(result), 2)
			end
			cache[path] = result
			return result
		end

		-- (b) require() thật theo đường dẫn tuyệt đối
		if globalEnv.__RALO_ROOT == nil then
			globalEnv.__RALO_ROOT = findProjectRoot(gameRef) or false
		end
		local root = globalEnv.__RALO_ROOT
		local target = resolveFrom(root, path)
		if target ~= nil then
			local ok, result = pcall(require, target)
			if not ok then
				error("require('" .. path .. "') thất bại: " .. tostring(result), 2)
			end
			cache[path] = result
			return result
		end

		error(("không tìm thấy module '%s' (gốc=%s). Kiểm tra cây thư mục trong Studio.")
			:format(path, tostring(root)), 2)
	end

	globalEnv[RequireShim.globalName] = resolver
	return resolver
end

-- Cho phép test/harness reset giữa các lần chạy.
function RequireShim.Reset()
	local globalEnv = _G
	globalEnv[RequireShim.globalName] = nil
	globalEnv.__RALO_BUNDLE = nil
	globalEnv.__RALO_ROOT = nil
end

return RequireShim
end,
	["Shared/Safe"] = function()
--[[
	Util/Safe.luau
	Truy cập property "an toàn": mọi lần đọc/ghi đều được pcall bảo vệ và
	được GHI NHẬT KÝ. Đây là nền tảng của nguyên tắc "không bịa":
	mỗi thay đổi thực tế đều có bản ghi applied / unsupported / failed.

	Thuần logic + dùng API Roblox qua object truyền vào -> mock được, test được.
]]

local Safe = {}

Safe.Sink = nil            -- function(level, scope, message)  (do Log.bind gán)
Safe.Records = {}          -- nhật ký mọi thao tác property, dùng cho báo cáo + unit test

local function note(level: string, scope: string, message: string)
	Safe.Records[#Safe.Records + 1] = { level = level, scope = scope, message = message }
	if Safe.Sink then
		Safe.Sink(level, scope, message)
	end
end

function Safe.Reset()
	table.clear(Safe.Records)
end

--[[
	Đọc property. Không bao giờ throw.
	Trả về: value, ok
]]
function Safe.Get(instance: any, name: string): (any, boolean)
	if instance == nil then
		return nil, false
	end
	local ok, value = pcall(function()
		return instance[name]
	end)
	if not ok then
		note("warn", "Safe.Get", ("%s.%s không đọc được: %s"):format(tostring(instance), name, tostring(value)))
		return nil, false
	end
	return value, true
end

--[[
	Ghi property có kiểm soát.
	opts = { expect = <giá trị kỳ vọng>, scope = "<tên bước>" }
	Trả về: ok (boolean), detail (string)

	Nếu truyền opts.expect và giá trị đọc lại khác kỳ vọng -> ok = false,
	chi tiết "wrote-but-not-applied". Đây là chốt chặn chống "tự nhận đã tối ưu".
]]
function Safe.Set(instance: any, name: string, value: any, opts: any): (boolean, string)
	opts = opts or {}
	local scope = opts.scope or "Safe.Set"
	if instance == nil then
		note("warn", scope, ("%s: instance rỗng, bỏ qua"):format(name))
		return false, "nil-instance"
	end

	local ok, err = pcall(function()
		instance[name] = value
	end)
	if not ok then
		note("warn", scope, ("%s.%s không ghi được: %s"):format(tostring(instance), name, tostring(err)))
		return false, "read-only-or-missing"
	end

	if opts.expect ~= nil then
		local readBack, readOk = Safe.Get(instance, name)
		if not readOk then
			note("warn", scope, ("%s.%s ghi xong nhưng không đọc lại được"):format(tostring(instance), name))
			return false, "wrote-but-unreadable"
		end
		if readBack ~= opts.expect then
			note("warn", scope, ("%s.%s ghi %s nhưng đọc lại %s")
				:format(tostring(instance), name, tostring(value), tostring(readBack)))
			return false, "wrote-but-not-applied"
		end
	end

	note("info", scope, ("%s.%s = %s"):format(tostring(instance), name, tostring(value)))
	return true, "ok"
end

--[[
	Gọi method an toàn: Safe.Call(obj, "SetNetworkOwner", nil)
	Trả về: ok, result
]]
function Safe.Call(object: any, method: string, ...: any): (boolean, any)
	if object == nil or object[method] == nil then
		return false, "method-missing"
	end
	local results = { pcall(object[method], object, ...) }
	local ok = table.remove(results, 1)
	if not ok then
		return false, results[1]
	end
	return true, results[1]
end

--[[
	Đếm số bản ghi theo level — dùng cho unit test.
]]
function Safe.CountByLevel(level: string): number
	local n = 0
	for _, record in Safe.Records do
		if record.level == level then
			n += 1
		end
	end
	return n
end

return Safe
end,
	["Shared/Safety"] = function()
--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  DATA-004, GRAPHICS-009, QUERY-001, SAFE-001,
	  SAFE-002, SAFE-003, SAFE-004, SAFE-008
	===== RALO.METHODS:END ===== --]]

--[[
	Shared/Safety.luau
	===== RALO.METHODS:SAFE-001, SAFE-002, SAFE-003, SAFE-004 =====

	RANH GIỚI AN TOÀN: những gì hệ thống tối ưu KHÔNG ĐƯỢC đụng vào.

	Tệp này là chốt chặn cuối cùng. Mọi thao tác thay đổi property đều phải
	hỏi qua Safety.Allow() trước. Lý do: yêu cầu số một của dự án là
	"giữ nguyên gameplay", và điều đó không thể chỉ dựa vào ý định tốt —
	nó phải được ENFORCE bằng mã.

	SAFE-001  Danh sách TRẮNG các property được phép đổi
	SAFE-002  Danh sách ĐEN các lớp đối tượng không bao giờ đụng tới
	SAFE-003  Không đụng đối tượng mang tag gameplay do chủ game đánh dấu
	SAFE-004  Từ chối mọi thay đổi có thể ảnh hưởng điều khiển người chơi
]]

local Shared_Log = __RALO_REQUIRE("Shared/Log")

local SCOPE = "Safety"

local Safety = {}

-- SAFE-001: CHỈ những property này được phép thay đổi. Ngoài danh sách -> từ chối.
Safety.AllowedProperties = {
	CastShadow = true,              -- bóng đổ: thuần thị giác
	Enabled = true,                 -- ParticleEmitter/Beam/Trail/PointLight
	Rate = true,                    -- mật độ hạt
	Brightness = true,              -- PointLight/SpotLight
	Range = true,                   -- tầm sáng
	GraphicsQualityMode = true,     -- Lighting
	QualityLevel = true,            -- Lighting
	Decoration = true,              -- Terrain (chi tiết cỏ/đá nhỏ)
	AutomaticScalingEnabled = true, -- Humanoid (chỉ tắt tự co giãn)
}

-- SAFE-002: các lớp KHÔNG BAO GIỜ bị thay đổi, kể cả khi property nằm trong whitelist
Safety.ProtectedClasses = {
	Humanoid = true,               -- ngoại lệ: chỉ AutomaticScalingEnabled, xem bên dưới
	HumanoidRootPart = true,
	Camera = true,
	SpawnLocation = true,
	Script = true,
	LocalScript = true,
	ModuleScript = true,
	RemoteEvent = true,
	RemoteFunction = true,
	Player = true,
	Players = true,
	ForceField = true,
	ClickDetector = true,
	ProximityPrompt = true,
	Tool = true,
}

-- Humanoid chỉ được đụng ĐÚNG một property này
Safety.HumanoidAllowed = { AutomaticScalingEnabled = true }

-- SAFE-003: tag do chủ game đánh dấu để loại đối tượng khỏi mọi tối ưu
Safety.ProtectedTags = {
	"RALO_Protected",
	"Gameplay",
	"GameplayCritical",
}

Safety.stats = { allowed = 0, deniedProperty = 0, deniedClass = 0, deniedTag = 0 }

--[[
	Quyết định một thao tác có được phép không.
	Trả về: allow (bool), reason (string)

	instance:  đối tượng định thay đổi
	property:  tên property
	taggedSet: BẢNG tra cứu tag đã được tính sẵn (để không gọi
	           CollectionService mỗi lần — chính nó cũng là một tối ưu)
]]
function Safety.Allow(instance, property, taggedSet)
	if instance == nil or property == nil then
		Safety.stats.deniedProperty += 1
		return false, "thiếu instance hoặc property"
	end

	-- pcall trả về (ok, result) — ĐẢO THỨ TỰ Ở ĐÂY LÀ LỖI NGHIÊM TRỌNG:
	-- className sẽ nhận `true` và ProtectedClasses[true] = nil, tức là
	-- TOÀN BỘ danh sách lớp bảo vệ bị bỏ qua. Đã được safety.test.js bắt.
	local okClass, className = pcall(function()
		return instance.ClassName
	end)
	if not okClass then
		Safety.stats.deniedClass += 1
		return false, "không đọc được ClassName"
	end

	-- SAFE-002: lớp được bảo vệ
	if Safety.ProtectedClasses[className] then
		if className == "Humanoid" and Safety.HumanoidAllowed[property] then
			-- ngoại lệ duy nhất, vẫn đi tiếp để kiểm tra whitelist
		else
			Safety.stats.deniedClass += 1
			return false, ("lớp %s được bảo vệ"):format(className)
		end
	end

	-- SAFE-001: whitelist property
	if not Safety.AllowedProperties[property] then
		Safety.stats.deniedProperty += 1
		return false, ("property %s không nằm trong danh sách cho phép"):format(property)
	end

	-- SAFE-003: đối tượng mang tag bảo vệ
	if type(taggedSet) == "table" and taggedSet[tostring(instance)] then
		Safety.stats.deniedTag += 1
		return false, "đối tượng mang tag bảo vệ của game"
	end

	Safety.stats.allowed += 1
	return true, "ok"
end

--[[
	Tính sẵn tập đối tượng mang tag bảo vệ.
	Gọi MỘT lần mỗi lượt quét rồi truyền vào Safety.Allow — tránh gọi
	CollectionService:GetTagged() cho từng đối tượng (chính nó cũng tốn).
]]
function Safety.BuildProtectedSet(collectionService)
	local set = {}
	if collectionService == nil then
		return set
	end
	for _, tag in Safety.ProtectedTags do
		local ok, list = pcall(function()
			return collectionService:GetTagged(tag)
		end)
		if ok and type(list) == "table" then
			for _, instance in list do
				set[tostring(instance)] = true
			end
		end
	end
	return set
end

function Safety.Stats()
	local total = Safety.stats.allowed + Safety.stats.deniedProperty
		+ Safety.stats.deniedClass + Safety.stats.deniedTag
	return {
		allowed = Safety.stats.allowed,
		deniedProperty = Safety.stats.deniedProperty,
		deniedClass = Safety.stats.deniedClass,
		deniedTag = Safety.stats.deniedTag,
		total = total,
		denyRate = total > 0 and ((Safety.stats.deniedProperty + Safety.stats.deniedClass
			+ Safety.stats.deniedTag) / total) or 0,
	}
end

function Safety.Reset()
	Safety.stats = { allowed = 0, deniedProperty = 0, deniedClass = 0, deniedTag = 0 }
end

return Safety
end,
	["Shared/Types"] = function()
--!strict
--[[
	Util/Types.luau
	Định nghĩa kiểu dữ liệu dùng chung cho toàn bộ dự án.

	Tệp này CHỈ chứa khai báo kiểu (`export type`). Khi bundle cho executor,
	nó bị loại bỏ hoàn toàn vì Luau type-only không sinh ra mã runtime.

	Chạy trên: Roblox Luau (typecheck) + Lua 5.3 (fengari) — nội dung tệp
	được parser Lua 5.3 bỏ qua ở chế độ comment, nên harness đọc được.
]]

-- NOTE: khai báo type nằm trong comment block cho harness Lua 5.3.
-- Bản khai báo Luau thật (dùng cho Rojo/Studio typecheck) ở docs/TYPES.md.

return {
	-- Trạng thái của một bước tối ưu
	STATUS_PENDING = "pending",
	STATUS_RUNNING = "running",
	STATUS_APPLIED = "applied",
	STATUS_SKIPPED = "skipped",
	STATUS_FAILED  = "failed",

	-- Trạng thái của toàn pipeline
	PHASE_IDLE       = "idle",
	PHASE_BASELINE   = "baseline",
	PHASE_SETTLE     = "settle",
	PHASE_OPTIMIZING = "optimizing",
	PHASE_REMEASURE  = "remeasure",
	PHASE_COMPARE    = "compare",
	PHASE_DONE       = "done",
	PHASE_ERROR      = "error",
}
end,
	["Client/Bootstrap"] = function()
--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  START-001, START-003, START-004
	===== RALO.METHODS:END ===== --]]

--[[
	Client/Bootstrap.luau
	===== RALO.METHODS:START-001, START-003, START-004 =====

	ĐIỂM KHỞI ĐỘNG DUY NHẤT của hệ thống.

	MÔI TRƯỜNG ĐÍCH: Roblox Studio, game do chính bạn sở hữu.
	Không dùng executor, không loadstring, không setrbxsetting.

	CÁCH CHẠY (xem docs/03-huong-dan-cai-dat.md để có hướng dẫn đầy đủ):

	A) Rojo — cách khuyến nghị, giữ nguyên cấu trúc thư mục:
	   default.project.json đã map:
	     src/Shared -> ReplicatedStorage.RALO.Shared
	     src/Client -> StarterPlayer.StarterPlayerScripts.RALO
	   Sau đó tạo một LocalScript trong StarterPlayerScripts:
	     require(script.Parent.RALO.Bootstrap).Start()

	B) Bundle một tệp — dán dist/roblox-anti-lag-optimizer.luau vào một
	   LocalScript. Bundle tự cài __RALO_REQUIRE nên không cần Rojo.

	LocalScript sẽ TỰ CHẠY khi được nạp. Nếu bạn muốn tự gọi Start() với
	cấu hình riêng, đặt  _G._RALO_NO_AUTORUN = true  TRƯỚC khi script chạy
	(hoặc đặt Bootstrap.__noAutoRun = true trong bundle).

	GIỚI HẠN THẬT CỦA MỘT LocalScript (Part 2) — nêu rõ để không hứa hão:
	  * không điều khiển được server, không đổi được replicated state
	  * không đổi được thiết bị (CPU/GPU) hay bộ nhớ của hệ điều hành
	  * không đổi được thiết lập client của Roblox (FrameRateMax, ...)
	  * chỉ ảnh hưởng phiên chơi của CHÍNH người chơi đang chạy script
]]

local Client_Env = __RALO_REQUIRE("Client/Core/Env")
local Client_Guard = __RALO_REQUIRE("Client/Core/Guard")
local Client_Pipeline = __RALO_REQUIRE("Client/Core/Pipeline")
local Client_Scheduler = __RALO_REQUIRE("Client/Core/Scheduler")
local Client_Registry = __RALO_REQUIRE("Client/Core/Registry")
local Shared_Config = __RALO_REQUIRE("Shared/Config")
local Shared_Log = __RALO_REQUIRE("Shared/Log")
local Shared_Safe = __RALO_REQUIRE("Shared/Safe")

local SCOPE = "Bootstrap"

local Bootstrap = {}

Bootstrap.started = false
Bootstrap.result = nil

-- Gán sink log để mọi thao tác property đều có dấu vết trong Log.
Shared_Safe.Sink = function(level, scope, message)
	if level == "warn" then
		Shared_Log.Warn(scope, message)
	else
		Shared_Log.Debug(scope, message)
	end
end

--[[
	options = {
		profile = { ... }   -- ghi đè Shared_Config.PROFILE, ví dụ:
		                    -- { gui = { durationSeconds = 60 }, graphics = { qualityLevel = 6 } }
		buildUi = true      -- mặc định true
		instant = false     -- true = bỏ qua lấy mẫu khung hình (nhanh, kém chính xác)
		restoreFirst = false-- true = hoàn tác thay đổi của lần chạy trước rồi mới chạy
	}

	Trả về: result (bảng), error (chuỗi hoặc nil)
	KHÔNG throw.
]]
function Bootstrap.Start(options)
	options = options or {}

	if Bootstrap.started and not options.force then
		Shared_Log.Warn(SCOPE, "đã chạy rồi — bỏ qua. Truyền force = true nếu muốn chạy lại.")
		return Bootstrap.result, nil
	end
	Bootstrap.started = true

	if options.profile then
		Shared_Config.Apply(options.profile)
	end

	-- Chuẩn hoá cấu hình: sai kiểu thì dùng mặc định + cảnh báo (REC-004)
	local normalized, warnings = Client_Guard.NormalizeConfig(Shared_Config.PROFILE, Shared_Config.PROFILE)
	for _, warning in ipairs(warnings) do
		Shared_Log.Warn(SCOPE, warning)
	end

	Client_Env.Init({})

	Shared_Log.Info(SCOPE, ("%s v%s — bắt đầu (chế độ: %s)")
		:format(Shared_Config.NAME, Shared_Config.VERSION, Shared_Config.Mode()))

	if options.restoreFirst then
		local restored, failed = Client_Pipeline.Restore()
		Shared_Log.Info(SCOPE, ("hoàn tác lần chạy trước: %d property (lỗi %d)"):format(restored, failed))
	end

	-- Scheduler tự khởi động khi tác vụ thật sự được đăng ký; không giữ
	-- Heartbeat rỗng trong trường hợp không có GUI/GC nền.
	local ok, result = Client_Guard.Run(SCOPE .. ":Pipeline", function()
		return Client_Pipeline.Run({
			profile = normalized,
			buildUi = options.buildUi,
			instant = options.instant,
		})
	end)

	if not ok then
		Shared_Log.Error(SCOPE, "pipeline lỗi: " .. tostring(result))
		return nil, tostring(result)
	end

	Bootstrap.result = result
	Shared_Log.Info(SCOPE, ("xong. phán quyết: %s, %d thay đổi, %d mục có thể hoàn tác")
		:format(tostring(result.verdict), result.tally and result.tally.changes or 0,
			result.restoreEntries or 0))
	return result, nil
end

-- Hoàn tác mọi thay đổi mà hệ thống đã thực hiện.
function Bootstrap.Restore()
	return Client_Pipeline.Restore()
end

--[[
	Tắt hẳn hệ thống: ngắt kết nối, huỷ GUI, dừng bộ lập lịch.
	Dùng khi bạn muốn gỡ hoàn toàn mà không cần chạy lại game.
]]
function Bootstrap.Shutdown()
	Client_Pipeline.Shutdown()
	Client_Scheduler.Shutdown()
	local disconnected, released = Client_Registry.Shutdown()
	Bootstrap.started = false
	Shared_Log.Info(SCOPE, ("đã tắt: ngắt %d connection, huỷ %d instance"):format(disconnected, released))
	return true
end

-- Trạng thái hiện tại — dùng cho test và chẩn đoán.
function Bootstrap.State()
	return {
		started = Bootstrap.started,
		hasResult = Bootstrap.result ~= nil,
		-- `and` đã trả về nil khi result = nil; không cần `or nil`
		verdict = Bootstrap.result and Bootstrap.result.verdict,
		scheduler = Client_Scheduler.Stats(),
		registry = Client_Registry.Stats(),
	}
end

--[[
	TỰ CHẠY khi LocalScript được nạp.
	Đặt _G._RALO_NO_AUTORUN = true trước đó nếu bạn muốn tự gọi Start().
]]
local globalEnv = Client_Env.GlobalEnv()

if not Bootstrap.__noAutoRun and not globalEnv._RALO_NO_AUTORUN then
	-- task.spawn để không chặn luồng nạp script; task có thể không có trong harness
	if task ~= nil and task.spawn ~= nil then
		task.spawn(function()
			Bootstrap.Start()
		end)
	else
		Bootstrap.Start()
	end
end

return Bootstrap
end,
}

local __RALO_CACHE = {}
local __RALO_LOADING = {}

__RALO_REQUIRE = function(key)
	if type(key) ~= "string" then
		error("__RALO_REQUIRE cần chuỗi đường dẫn, nhận " .. type(key), 2)
	end
	local cached = __RALO_CACHE[key]
	if cached == __RALO_LOADING then
		error("phát hiện require vòng lặp tại module '" .. key .. "'", 2)
	end
	if cached ~= nil then
		return cached
	end
	local factory = __RALO_MODULES[key]
	if type(factory) ~= "function" then
		error("không có module '" .. key .. "' trong bundle", 2)
	end
	__RALO_CACHE[key] = __RALO_LOADING
	local ok, result = pcall(factory)
	if not ok then
		__RALO_CACHE[key] = nil
		error("lỗi khi chạy module '" .. key .. "': " .. tostring(result), 2)
	end
	if type(result) ~= "table" then
		__RALO_CACHE[key] = nil
		error("module '" .. key .. "' phải return một bảng, nhận " .. type(result), 2)
	end
	__RALO_CACHE[key] = result
	return result
end

-- Factory đóng trên local __RALO_REQUIRE; expose trong environment để chẩn đoán/test.
local __RALO_ENV = getfenv and getfenv(1) or _ENV
__RALO_ENV.__RALO_REQUIRE = __RALO_REQUIRE

-- Nạp điểm khởi động. Bootstrap tự chạy pipeline khi được nạp.
local __RALO_BOOTSTRAP = __RALO_REQUIRE("Client/Bootstrap")

-- Trả về bootstrap để người dùng gọi lại Start() với cấu hình riêng.
return __RALO_BOOTSTRAP
