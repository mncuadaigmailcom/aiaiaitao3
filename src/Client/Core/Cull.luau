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
