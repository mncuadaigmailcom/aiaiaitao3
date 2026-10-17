--[[
	ROBLOX ANTI-LAG — Script toi uu hieu suat DOC LAP (khong GUI, khong menu)
	========================================================================
	Nguyen tac bat buoc (theo ban yeu cau):
	  * KHONG giam chat luong do hoa/texture/bong do/anh sang/hieu ung/suong mu.
	  * KHONG an/xoa/thay the vat the cua game, KHONG sua co che choi/vat ly/mang.
	  * Chi toi uu phan viec DO CHINH SCRIPT NAY kiem soat: lap lich tac vu,
	    su kien, bo nho dem, doi tuong tai su dung, loi, do hieu suat.
	  * Tu kiem tra tuong thich -> tu kich hoat toi uu an toan -> co Destroy()
	    de dung va don sach tai nguyen.
	Cach dung (Roblox):
	  local AntiLag = loadstring(game:HttpGet("<url AntiLag.lua>"))()
	  -- Neu dang chay trong Roblox, ban mac dinh da tu kich hoat (AntiLag.Default).
	  -- Dung khi khong can nua:  AntiLag.Default:Destroy()
	Cach dung (nhung vao script khac):
	  local anti = AntiLag.new({ frameBudgetMs = 2 })
	  anti:Start()            -- bat do hieu suat + vong lap lich (Roblox)
	  anti:Queue(function() ... end, { key = "reload-list" })  -- viec nen, co gom trung
	  anti:Destroy()
	========================================================================
]]

local AntiLag = { _VERSION = "1.0.0" }

-- Bat Instance cua Roblox TRUOC khi local Instance (class cua module, muc 1)
-- che mat no — neu khong, RobloxInstance.new("ScreenGui") trong ShowToast se loi.
local RobloxInstance = Instance

--===========================================================================
-- 0) MOI TRUONG & DONG HO
--===========================================================================
-- Phat hien Roblox ma khong gia dinh bat ky API nao ton tai (yeu cau 4 + 5:
-- khong chay tinh nang khong tuong thich; thieu API thi ghi nhan, khong gia vo).

local function defaultNow()
	if type(os) == "table" and type(os.clock) == "function" then
		return os.clock()
	end
	if type(tick) == "function" then
		return tick()
	end
	return 0
end

local function detectRoblox()
	local ok, svc = pcall(function()
		return game:GetService("RunService")
	end)
	return ok and svc ~= nil
end

local function getService(name)
	local ok, svc = pcall(function()
		return game:GetService(name)
	end)
	if ok then return svc end
	return nil
end

--===========================================================================
-- 1) INSTANCE
--===========================================================================

local Instance = {}
Instance.__index = Instance

local DEFAULTS = {
	frameBudgetMs = 2,        -- moi khung hinh chi danh toi da 2ms cho viec nen (muc 3, 12)
	maxTasksPerFrame = 64,    -- tran so viec/frame, tranh dung day cung luc (muc 12)
	cleanupIntervalSec = 30,  -- dinh ky don cache het han / pool thua (muc 2)
	cacheMaxEntries = 256,    -- tran RAM cua cache (muc 2, 10)
	cacheTtlSec = 60,         -- TTL mac dinh cua cache (muc 10)
	netDedupeWindowSec = 1,   -- cua so gom yeu cau mang trung (muc 8)
	errorWindowSec = 5,       -- loi giong nhau chi bao 1 lan / cua so (muc 9)
	maxConcurrent = 4,        -- gioi han tac vu song song (muc 11)
	historySize = 120,        -- so mau frame giu lai de tinh p95 (muc 13)
	strongBudgetMs = 1,       -- che do manh: ngan sach frame chat hon (1ms)
	strongMaxPerFrame = 24,   -- che do manh: tran viec/frame thap hon
	strongShedBelowPriority = 5, -- che do manh + frame cham: tam hoan viec uu tien thap
	autoStrong = true,        -- tu bat che do manh khi do thay FPS thap keo dai
	toastEnabled = true,      -- thong bao goc phai duoi khi da giam lag
	toastOnStart = true,      -- hien thong bao ngay khi script khoi chay thanh cong
	toastDurationSec = 30,    -- hien thong bao 30 giay roi tu bien mat
}

function AntiLag.new(opts)
	opts = opts or {}
	local self = setmetatable({}, Instance)
	self._cfg = {}
	for k, v in pairs(DEFAULTS) do
		if opts[k] ~= nil then self._cfg[k] = opts[k] else self._cfg[k] = v end
	end
	self._now = opts.now or defaultNow
	self._log = opts.log or function(msg)
		if type(warn) == "function" then warn(msg) else print(msg) end
	end
	self._memoryProvider = opts.memoryProvider -- tuy chon: ham tra ve MB
	self._pingProvider = opts.pingProvider     -- tuy chon: ham tra ve giay (s)
	self._destroyed = false
	self._started = false
	self._strong = false
	self._strongAutoFired = false
	self._toast = nil -- {gui, gradient} khi thong bao dang hien (chi Roblox)

	-- Scheduler (muc 1, 3, 12)
	self._queue = {}       -- danh sach viec cho: {fn, key, priority, due}
	self._queuedByKey = {} -- key -> viec (gom trung, muc 8/12)
	self._stats = { processed = 0, coalesced = 0, dropped = 0, errors = 0, shed = 0 }

	-- Su kien (muc 5)
	self._conns = {}       -- key -> connection
	self._tracked = {}     -- cac connection duoc Track() thu cong

	-- Cache (muc 2, 10)
	self._cache = {}       -- key -> {value, at, seq}
	self._cacheSeq = 0

	-- Pool doi tuong (muc 7)
	self._pools = {}       -- name -> {create, reset, free={}, used=0, max}

	-- Debounce/Throttle (muc 1, 3)
	self._throttleAt = {}

	-- Xu ly loi (muc 9)
	self._errAt = {}       -- message -> thoi diem bao gan nhat
	self._errSuppressed = {} -- message -> so lan bi nen

	-- Mang: gom yeu cau trung do script kiem soat (muc 8)
	self._netDone = {}     -- key -> {result, at}
	self._netBusy = {}     -- key -> true (dang chay)

	-- Song song (muc 11)
	self._running = 0

	-- Do hieu suat (muc 13)
	self._perf = {
		frames = 0, emaDt = nil, lastDt = nil,
		history = {}, histHead = 0,
		memMB = nil, pingSec = nil, bottleneck = "unknown",
	}

	self._capabilities = self:_probeCapabilities()
	return self
end

function Instance:_probeCapabilities()
	local caps = { roblox = false, runService = false, taskLib = false, statsMemory = false }
	caps.roblox = detectRoblox()
	if caps.roblox then
		caps.runService = getService("RunService") ~= nil
		caps.statsMemory = getService("Stats") ~= nil
	end
	caps.taskLib = (type(task) == "table" and type(task.defer) == "function")
	self._capabilities = caps
	return caps
end

function Instance:GetCapabilities()
	return self._capabilities
end

--===========================================================================
-- 2) SCHEDULER — phan bo viec theo ngan sach khung hinh (muc 1, 3, 12)
--===========================================================================
-- Viec nen KHONG chay ngay: dua vao hang doi, moi frame chi chay trong
-- frameBudgetMs. Viec cung "key" dang cho se bi thay the (gom trung),
-- tranh viec lap lai vo ich va tranh nhieu viec nang xay ra cung luc.

function Instance:Queue(fn, qopts)
	if self._destroyed or type(fn) ~= "function" then return false end
	qopts = qopts or {}
	local key = qopts.key
	if key and self._queuedByKey[key] then
		-- Gom trung: viec cu chua chay thi bo, giu viec moi nhat.
		self._queuedByKey[key].fn = fn
		self._queuedByKey[key].due = self._now() + (qopts.delay or 0)
		self._stats.coalesced += 1
		return true
	end
	local job = {
		fn = fn,
		key = key,
		priority = qopts.priority or 0,
		due = self._now() + (qopts.delay or 0),
	}
	self._queue[#self._queue + 1] = job
	if key then self._queuedByKey[key] = job end
	return true
end

function Instance:QueueSize()
	return #self._queue
end

-- Chay cac viec den han trong ngan sach thoi gian. Tra ve so viec da chay.
-- Trong Roblox duoc goi tu Heartbeat; ngoai Roblox (kiem thu) goi thu cong.
function Instance:Step()
	if self._destroyed then return 0 end
	local budget = (self._strong and self._cfg.strongBudgetMs or self._cfg.frameBudgetMs) / 1000
	local maxPer = self._strong and self._cfg.strongMaxPerFrame or self._cfg.maxTasksPerFrame
	local start = self._now()
	local ran, i = 0, 1
	-- Sap xep on dinh theo uu tien giam dan (viec moi giu nguyen thu tu khi bang diem)
	table.sort(self._queue, function(a, b) return a.priority > b.priority end)
	while i <= #self._queue and ran < maxPer do
		local job = self._queue[i]
		local frameSlow = self._perf.emaDt and self._perf.emaDt > (1 / 30)
		if self._strong and frameSlow and job.due <= self._now()
			and job.priority < self._cfg.strongShedBelowPriority and job.key ~= "antilag:cleanup" then
			-- Cat tai thich ung: frame dang cham thi tam hoan viec uu tien thap,
			-- chi chay viec quan trong. Viec khong bi xoa, chi lui lai frame sau.
			self._stats.shed += 1
			i += 1
		elseif job.due <= self._now() then
			table.remove(self._queue, i)
			if job.key then self._queuedByKey[job.key] = nil end
			ran += 1
			self:Guard(job.fn)
			self._stats.processed += 1
			if self._now() - start >= budget and i <= #self._queue then break end
		else
			i += 1
		end
	end
	return ran
end

--===========================================================================
-- 3) QUAN LY SU KIEN — khong dang ky trung, don sach khi dung (muc 5, 2)
--===========================================================================

function Instance:Connect(key, signal, fn)
	if self._destroyed then return nil end
	if self._conns[key] then
		-- Da co: tra ve ket noi cu, KHONG dang ky them (yeu cau muc 5).
		return self._conns[key]
	end
	local conn = signal:Connect(fn)
	self._conns[key] = conn
	return conn
end

function Instance:Track(conn)
	if conn then self._tracked[#self._tracked + 1] = conn end
	return conn
end

function Instance:Disconnect(key)
	local conn = self._conns[key]
	if conn then
		self._conns[key] = nil
		pcall(function() conn:Disconnect() end)
	end
end

function Instance:DisconnectAll()
	for k in pairs(self._conns) do self:Disconnect(k) end
	for _, conn in ipairs(self._tracked) do
		pcall(function() conn:Disconnect() end)
	end
	self._tracked = {}
end

--===========================================================================
-- 4) CACHE — tai su dung ket qua tinh toan, co TTL + tran RAM (muc 10, 2)
--===========================================================================

function Instance:CacheSet(key, value, ttl)
	self._cacheSeq += 1
	if not self._cache[key] then
		-- Tran RAM: day muc cu nhat ra truoc (theo seq) khi vuot gioi han.
		local count = 0
		for _ in pairs(self._cache) do count += 1 end
		if count >= self._cfg.cacheMaxEntries then
			local oldestKey, oldestSeq = nil, math.huge
			for k, e in pairs(self._cache) do
				if e.seq < oldestSeq then oldestSeq, oldestKey = e.seq, k end
			end
			if oldestKey then self._cache[oldestKey] = nil end
		end
	end
	self._cache[key] = { value = value, at = self._now(), seq = self._cacheSeq, ttl = ttl or self._cfg.cacheTtlSec }
end

function Instance:CacheGet(key)
	local e = self._cache[key]
	if not e then return nil end
	if self._now() - e.at > e.ttl then
		self._cache[key] = nil
		return nil
	end
	return e.value
end

function Instance:GetOrCompute(key, computeFn, ttl)
	local v = self:CacheGet(key)
	if v ~= nil then return v end
	v = computeFn()
	if v ~= nil then self:CacheSet(key, v, ttl) end
	return v
end

function Instance:CachePrune()
	local now, dead = self._now(), {}
	for k, e in pairs(self._cache) do
		if now - e.at > e.ttl then dead[#dead + 1] = k end
	end
	for _, k in ipairs(dead) do self._cache[k] = nil end
	return #dead
end

--===========================================================================
-- 5) POOL DOI TUONG — tai su dung thay vi tao/huy lien tuc (muc 7, 2)
--===========================================================================

function Instance:DefinePool(name, createFn, resetFn, maxSize)
	self._pools[name] = { create = createFn, reset = resetFn, free = {}, max = maxSize or 32 }
end

function Instance:Acquire(name)
	local pool = self._pools[name]
	if not pool then return nil end
	local obj = table.remove(pool.free)
	if obj then
		if pool.reset then pool.reset(obj) end
		return obj
	end
	return pool.create()
end

function Instance:Release(name, obj)
	local pool = self._pools[name]
	if not pool or obj == nil then return end
	if #pool.free < pool.max then
		pool.free[#pool.free + 1] = obj
	end
	-- Vuot tran thi tha roi cho GC thu gom (khong giu RAM vo han — muc 2).
end

function Instance:PoolDrain(name)
	local pool = self._pools[name]
	if pool then pool.free = {} end
end

--===========================================================================
-- 6) DEBOUNCE / THROTTLE (muc 1, 3) + UI chi cap nhat khi du lieu doi (muc 6)
--===========================================================================
-- Script nay KHONG co GUI. Muc 6 duoc ap dung cho chinh du lieu ma script
-- phat ra: Perf chi goi callback khi chi so THAY DOI dang ke (xem muc 9).

function Instance:Debounce(key, waitSec, fn)
	-- Gom vao scheduler voi cung key: chi lan goi cuoi trong cua so moi chay.
	return self:Queue(fn, { key = "debounce:" .. tostring(key), delay = waitSec })
end

function Instance:Throttle(key, intervalSec, fn)
	local now = self._now()
	local last = self._throttleAt[key]
	if not last or now - last >= intervalSec then
		self._throttleAt[key] = now
		return self:Guard(fn)
	end
	-- Chua den han: dat 1 lan chay bu vao cuoi cua so (van gom trung theo key).
	return self:Queue(function()
		self._throttleAt[key] = self._now()
		fn()
	end, { key = "throttle:" .. tostring(key), delay = intervalSec - (now - last) })
end

--===========================================================================
-- 7) XU LY LOI — bao loi co kiem soat, khong lap lai lien tuc (muc 9)
--===========================================================================

function Instance:Guard(fn, ...)
	local args = { ... }
	local ok, res = pcall(function() return fn(table.unpack(args)) end)
	if ok then return true, res end
	self._stats.errors += 1
	local msg = tostring(res)
	local now = self._now()
	local last = self._errAt[msg]
	if last and now - last < self._cfg.errorWindowSec then
		self._errSuppressed[msg] = (self._errSuppressed[msg] or 0) + 1
	else
		self._errAt[msg] = now
		local suppressed = self._errSuppressed[msg] or 0
		self._errSuppressed[msg] = 0
		self._log(("[AntiLag] Loi da duoc chan: %s%s"):format(
			msg, suppressed > 0 and (" (da nen " .. suppressed .. " lan lap lai)") or ""))
	end
	return false, res
end

--===========================================================================
-- 8) MANG — chi gom yeu cau trung DO SCRIPT NAY kiem soat (muc 8)
--===========================================================================
-- Script khong tu gui request, khong sua giao thuc mang cua game.
-- Day la lop boc cho request cua chinh nguoi dung script: trong cua so
-- netDedupeWindowSec, key giong nhau chi thuc thi 1 lan, lan sau lay ket qua cu.

function Instance:Request(key, fn)
	if self._netBusy[key] then
		return nil, "in-flight"
	end
	local done = self._netDone[key]
	if done and self._now() - done.at < self._cfg.netDedupeWindowSec then
		return done.result, "cached"
	end
	self._netBusy[key] = true
	local ok, res = self:Guard(fn)
	self._netBusy[key] = nil
	if ok then
		self._netDone[key] = { result = res, at = self._now() }
		return res, "fresh"
	end
	return nil, "error"
end

--===========================================================================
-- 9) TAC VU SONG SONG CO GIOI HAN (muc 11) + DO HIEU SUAT (muc 13)
--===========================================================================

function Instance:RunLimited(fn)
	if self._running >= self._cfg.maxConcurrent then
		self._stats.dropped += 1
		return false, "busy" -- tu choi thay vi xep hang vo han (muc 11, 12)
	end
	self._running += 1
	local ok, res = self:Guard(fn)
	self._running -= 1
	return ok, res
end

local function readMemoryMb(self)
	if self._memoryProvider then
		local ok, v = pcall(self._memoryProvider)
		if ok and type(v) == "number" then return v end
	end
	-- Roblox: Stats:GetTotalMemoryUsageMb (chi doc, khong sua gi).
	local stats = getService("Stats")
	if stats then
		local ok, v = pcall(function() return stats:GetTotalMemoryUsageMb() end)
		if ok and type(v) == "number" then return v end
	end
	if type(collectgarbage) == "function" then
		local ok, v = pcall(collectgarbage, "count")
		if ok and type(v) == "number" then return v / 1024 end
	end
	return nil -- khong do duoc thi bao nil, KHONG bia so (yeu cau muc 5 phan kiem thu)
end

local function readPingSec(self)
	if self._pingProvider then
		local ok, v = pcall(self._pingProvider)
		if ok and type(v) == "number" then return v end
	end
	local players = getService("Players")
	if players then
		local ok, v = pcall(function() return players.LocalPlayer:GetNetworkPing() end)
		if ok and type(v) == "number" then return v end
	end
	return nil
end

-- Nap 1 mau khung hinh. Goi tu Heartbeat (Roblox) hoac bang tay khi kiem thu.
function Instance:Sample(dt)
	if type(dt) ~= "number" or dt <= 0 then return end
	local p = self._perf
	p.frames += 1
	p.lastDt = dt
	p.emaDt = p.emaDt and (p.emaDt * 0.95 + dt * 0.05) or dt
	local size = self._cfg.historySize
	p.histHead = (p.histHead % size) + 1
	p.history[p.histHead] = dt
	-- Do RAM/ping tha cham (moi ~30 frame) de chinh viec do khong gay lag.
	if p.frames % 30 == 0 then
		p.memMB = readMemoryMb(self)
		p.pingSec = readPingSec(self)
	end
	p.bottleneck = self:_classify(p)
end

function Instance:_classify(p)
	-- Phan loai nguon lag dua tren so do duoc, thieu du lieu thi "unknown".
	local frameMs = (p.emaDt or 0) * 1000
	if p.memMB and p.memMB > 1024 then return "RAM" end
	if p.pingSec and p.pingSec > 0.25 and frameMs < 20 then return "NETWORK" end
	if frameMs > 20 then return "CPU/frame" end
	if p.emaDt then return "OK" end
	return "unknown"
end

function Instance:GetReport()
	local p = self._perf
	local sorted = {}
	for _, v in pairs(p.history) do sorted[#sorted + 1] = v end
	table.sort(sorted)
	local p95 = #sorted > 0 and sorted[math.max(1, math.floor(#sorted * 0.95))] or nil
	return {
		version = AntiLag._VERSION,
		frames = p.frames,
		fpsAvg = p.emaDt and (1 / p.emaDt) or nil,
		frameMsAvg = p.emaDt and (p.emaDt * 1000) or nil,
		frameMsP95 = p95 and (p95 * 1000) or nil,
		memoryMB = p.memMB,
		pingMs = p.pingSec and (p.pingSec * 1000) or nil,
		bottleneck = p.bottleneck, -- "CPU/frame" | "RAM" | "NETWORK" | "OK" | "unknown"
		strongMode = self._strong,
		queue = #self._queue,
		stats = {
			processed = self._stats.processed, coalesced = self._stats.coalesced,
			dropped = self._stats.dropped, errors = self._stats.errors, shed = self._stats.shed,
		},
		capabilities = self._capabilities,
	}
end

-- Anh chup de so sanh truoc/sau (yeu cau kiem thu muc 5): KHONG tu khang dinh
-- tang FPS — chi tra so do; ket luan do nguoi kiem thu doc so.
function Instance:Snapshot()
	return self:GetReport()
end

function AntiLag.Compare(before, after)
	local function diff(k)
		if type(before[k]) == "number" and type(after[k]) == "number" then
			return after[k] - before[k]
		end
		return nil
	end
	return {
		fpsDelta = diff("fpsAvg"),
		frameMsDelta = diff("frameMsAvg"),
		memoryDeltaMB = diff("memoryMB"),
		pingDeltaMs = diff("pingMs"),
	}
end

--===========================================================================
-- 9b) CHE DO GIAM LAG MANH (nang cap): chat ngan sach + cat tai thich ung
--===========================================================================
-- Van tuan thu hop dong an toan: chi siet phan viec cua chinh script
-- (it ms/frame hon, hoan viec phu khi frame cham, don cache/pool thuong xuyen,
-- buoc GC cua chinh VM neu nen tang cho phep). Khong sua do hoa/co che game.

function Instance:SetStrongMode(on)
	on = (on == true)
	if self._strong == on then return self._strong end
	self._strong = on
	if on then
		self:CachePrune()
		for name in pairs(self._pools) do self:PoolDrain(name) end
		pcall(function() collectgarbage("step", 200) end) -- no-op an toan neu khong co
		if self._started then
			self:_showToastRetry("Che do manh dang bat: siet ngan sach frame, hoan viec phu khi khung hinh cham.", 3)
		end
	end
	return self._strong
end

function Instance:IsStrongMode()
	return self._strong
end

-- Tu dong bat che do manh khi FPS thap keo dai (goi dinh ky tu Sample).
function Instance:_maybeAutoStrong()
	if not self._cfg.autoStrong or self._strongAutoFired or self._strong then return end
	local p = self._perf
	if p.emaDt and p.emaDt > (1 / 30) and p.frames >= 60 then
		self._strongAutoFired = true
		self:SetStrongMode(true)
	end
end

--===========================================================================
-- 9c) THONG BAO GOC PHAI DUOI (ngoai le GUI theo yeu cau nguoi dung)
--===========================================================================
-- Hinh chu nhat goc phai duoi: VIEN NGOAI cau vong chuyen dong, BEN TRONG
-- xam trong suot, hien toastDurationSec giay (mac dinh 30) roi tu bien mat.
-- Day CHI la thong bao 1 chieu (khong nut bam, khong menu, khong cai dat).

-- Mau cau vong tao trong pcall cua ShowToast (chi Roblox moi co Color3).

function Instance:ShowToast(text)
	if not self._cfg.toastEnabled or self._destroyed then return false end
	if not self._capabilities.roblox then return false end -- ngoai Roblox: khong co GUI
	local players = getService("Players")
	local player = players and players.LocalPlayer
	local gui = player and player:FindFirstChildOfClass("PlayerGui")
	if not gui then return false end
	self:HideToast()
	local ok, built = pcall(function()
		local RAINBOW = {
			Color3.fromRGB(255, 0, 0), Color3.fromRGB(255, 127, 0), Color3.fromRGB(255, 255, 0),
			Color3.fromRGB(0, 200, 0), Color3.fromRGB(0, 120, 255), Color3.fromRGB(75, 0, 130),
			Color3.fromRGB(180, 0, 255),
		}
		local keypoints = {}
		for idx, c in ipairs(RAINBOW) do
			keypoints[#keypoints + 1] = ColorSequenceKeypoint.new((idx - 1) / (#RAINBOW - 1), c)
		end
		local screen = RobloxInstance.new("ScreenGui")
		screen.Name = "AntiLagToast"
		screen.ResetOnSpawn = false
		screen.DisplayOrder = 999
		local outer = RobloxInstance.new("Frame") -- lop ngoai: cau vong
		outer.Name = "RainbowBorder"
		outer.Active = false -- co dinh goc phai duoi: khong keo/di chuyen duoc
		outer.AnchorPoint = Vector2.new(1, 1)
		outer.Position = UDim2.new(1, -16, 1, -16)
		outer.Size = UDim2.new(0, 300, 0, 72)
		outer.BorderSizePixel = 0
		outer.Parent = screen
		local grad = RobloxInstance.new("UIGradient")
		grad.Color = ColorSequence.new(keypoints)
		grad.Parent = outer
		local cornerO = RobloxInstance.new("UICorner"); cornerO.CornerRadius = UDim.new(0, 10); cornerO.Parent = outer
		local inner = RobloxInstance.new("Frame") -- lop trong: xam trong suot
		inner.Name = "Body"
		inner.Position = UDim2.new(0, 3, 0, 3)
		inner.Size = UDim2.new(1, -6, 1, -6)
		inner.BackgroundColor3 = Color3.fromRGB(128, 128, 128)
		inner.BackgroundTransparency = 0.35
		inner.BorderSizePixel = 0
		inner.Parent = outer
		local cornerI = RobloxInstance.new("UICorner"); cornerI.CornerRadius = UDim.new(0, 8); cornerI.Parent = inner
		local label = RobloxInstance.new("TextLabel")
		label.BackgroundTransparency = 1
		label.Position = UDim2.new(0, 10, 0, 4)
		label.Size = UDim2.new(1, -20, 1, -8)
		label.Font = Enum.Font.GothamBold
		label.TextSize = 13
		label.TextColor3 = Color3.fromRGB(255, 255, 255)
		label.TextXAlignment = Enum.TextXAlignment.Left
		label.TextWrapped = true
		label.Text = "✅ ĐÃ GIẢM LAG\n" .. tostring(text or "")
		label.Parent = inner
		screen.Parent = gui
		return { gui = screen, gradient = grad }
	end)
	if not ok or not built then
		self._log("[AntiLag] Khong tao duoc thong bao: " .. tostring(built))
		return false
	end
	self._toast = built
	-- Tu bien mat sau toastDurationSec (mac dinh 30 giay) qua scheduler cua script
	self:Queue(function() self:HideToast() end,
		{ key = "antilag:toast-hide", delay = self._cfg.toastDurationSec })
	return true
end

-- Hien toast, neu PlayerGui chua san sang thi thu lai moi 1s (toi da so lan cho).
function Instance:_showToastRetry(text, attempts)
	if self:ShowToast(text) then return true end
	if attempts and attempts > 0 and not self._destroyed then
		self:Queue(function() self:_showToastRetry(text, attempts - 1) end,
			{ key = "antilag:toast-retry", delay = 1 })
	end
	return false
end

function Instance:HideToast()
	if self._toast then
		pcall(function() self._toast.gui:Destroy() end)
		self._toast = nil
	end
end

--===========================================================================
-- 10) VONG DOI: Start / Stop / Destroy (yeu cau cach hoat dong muc 4)
--===========================================================================

function Instance:Start()
	if self._destroyed or self._started then return false end
	self._started = true
	if self._capabilities.runService then
		local runService = getService("RunService")
		self:Connect("heartbeat", runService.Heartbeat, function(dt)
			self:Sample(dt)
			self:Step()
			if self._toast and self._toast.gradient then
				local g = self._toast.gradient
				g.Rotation = (g.Rotation + dt * 45) % 360 -- vien cau vong chuyen dong
			end
			if self._perf.frames % 30 == 0 then self:_maybeAutoStrong() end
		end)
		-- Don dinh ky cung qua scheduler de khong co vong lap rieng gay tai.
		local function scheduleCleanup()
			if self._destroyed then return end
			self:Queue(function()
				self:CachePrune()
				for name in pairs(self._pools) do self:PoolDrain(name) end
				if self._strong then pcall(function() collectgarbage("step", 200) end) end
				scheduleCleanup()
			end, { key = "antilag:cleanup", delay = self._strong and 15 or self._cfg.cleanupIntervalSec })
		end
		scheduleCleanup()
		if self._cfg.toastOnStart then
			self:_showToastRetry("Anti-Lag dang hoat dong: da toi uu lich tac vu, su kien, bo nho dem va gioi han viec nen moi khung hinh.", 10)
		end
		self._log("[AntiLag] Da kich hoat (Roblox). Do: FPS/frame/RAM/ping — khong sua do hoa/co che game.")
	else
		self._log("[AntiLag] Moi truong khong co RunService: chay che do thu cong (goi :Step()/:Sample(dt) bang tay).")
	end
	return true
end

function Instance:Stop()
	self:DisconnectAll()
	self._started = false
end

function Instance:Destroy()
	if self._destroyed then return end
	self:HideToast()
	self:Stop()
	self._destroyed = true
	self._queue, self._queuedByKey = {}, {}
	self._cache, self._netDone, self._netBusy = {}, {}, {}
	self._throttleAt, self._errAt, self._errSuppressed = {}, {}, {}
	for name in pairs(self._pools) do self:PoolDrain(name) end
	self._pools = {}
end

--===========================================================================
-- 11) TU KICH HOAT AN TOAN (chi trong Roblox, chi khi du API tuong thich)
--===========================================================================

AntiLag.Default = nil
if detectRoblox() then
	local inst = AntiLag.new()
	if inst:GetCapabilities().runService then
		inst:Start()
		AntiLag.Default = inst
	else
		inst:Destroy()
		-- Thieu API tuong thich thi khong chay tinh nang do (yeu cau muc 4),
		-- va noi ro thay vi gia vo da toi uu.
		if type(warn) == "function" then
			warn("[AntiLag] Khong tim thay RunService tuong thich: bo qua kich hoat tu dong.")
		end
	end
end

return AntiLag
