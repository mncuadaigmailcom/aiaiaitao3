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
