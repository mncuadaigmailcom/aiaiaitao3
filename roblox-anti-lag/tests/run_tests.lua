-- Kiem thu thuc thi that bang Luau CLI:  luau roblox-anti-lag/tests/run_tests.lua
-- (chay tu thu muc goc cua repo; khong can Roblox)

local AntiLag = require("../AntiLag")

local passed, failed = 0, 0
local function check(name, cond)
	if cond then
		passed += 1
		print("PASS  " .. name)
	else
		failed += 1
		print("FAIL  " .. name)
	end
end

-- Dong ho gia lap: kiem soat thoi gian tuyet doi
local clock = { t = 100 }
local function newInst(extra)
	local opts = { now = function() return clock.t end, log = function() end }
	for k, v in pairs(extra or {}) do opts[k] = v end
	return AntiLag.new(opts)
end

-- Fake signal kieu Roblox (Connect/Disconnect, dem so lan dang ky)
local function fakeSignal()
	local sig = { connectCount = 0, handlers = {} }
	function sig:Connect(fn)
		self.connectCount += 1
		local conn = { dead = false, fn = fn }
		function conn:Disconnect() self.dead = true end
		self.handlers[#self.handlers + 1] = conn
		return conn
	end
	return sig
end

-- 1) Scheduler: gom trung theo key — chi viec moi nhat chay (muc 1, 12)
do
	local a = newInst()
	local ran = {}
	a:Queue(function() ran[#ran + 1] = "old" end, { key = "k" })
	a:Queue(function() ran[#ran + 1] = "new" end, { key = "k" })
	a:Step()
	check("scheduler gom trung theo key", #ran == 1 and ran[1] == "new" and a:GetReport().stats.coalesced == 1)
	a:Destroy()
end

-- 2) Scheduler: ngan sach khung hinh — viec nang khong chay het cung luc (muc 3, 12)
do
	local a = newInst({ frameBudgetMs = 2, maxTasksPerFrame = 100 })
	local ran = 0
	for _ = 1, 5 do
		a:Queue(function() ran += 1; clock.t += 0.005 end) -- moi viec "ton" 5ms
	end
	local n = a:Step()
	check("scheduler dung o ngan sach frame", n < 5 and ran < 5 and a:QueueSize() > 0)
	a:Destroy()
end

-- 3) Scheduler: viec hen gio chua den han thi chua chay + uu tien cao chay truoc
do
	clock.t = 200
	local a = newInst()
	local order = {}
	a:Queue(function() order[#order + 1] = "low" end, { priority = 1 })
	a:Queue(function() order[#order + 1] = "high" end, { priority = 9 })
	a:Queue(function() order[#order + 1] = "late" end, { delay = 10 })
	a:Step()
	check("scheduler uu tien + chua den han", #order == 2 and order[1] == "high" and a:QueueSize() == 1)
	clock.t += 11
	a:Step()
	check("scheduler chay viec khi den han", #order == 3 and order[3] == "late")
	a:Destroy()
end

-- 4) Su kien: dang ky cung key 2 lan chi tao 1 ket noi (muc 5)
do
	local a = newInst()
	local sig = fakeSignal()
	local c1 = a:Connect("hb", sig, function() end)
	local c2 = a:Connect("hb", sig, function() end)
	check("su kien khong dang ky trung", sig.connectCount == 1 and c1 == c2)
	a:Destroy()
	check("Destroy ngat ket noi", c1.dead == true)
end

-- 5) Cache: TTL het han + tran RAM day muc cu (muc 10, 2)
do
	clock.t = 300
	local a = newInst({ cacheMaxEntries = 3, cacheTtlSec = 10 })
	a:CacheSet("a", 1); a:CacheSet("b", 2); a:CacheSet("c", 3); a:CacheSet("d", 4)
	check("cache tran RAM day muc cu nhat", a:CacheGet("a") == nil and a:CacheGet("d") == 4)
	clock.t += 11
	check("cache het TTL thi tra nil", a:CacheGet("d") == nil)
	local calls = 0
	local v1 = a:GetOrCompute("x", function() calls += 1; return 42 end)
	local v2 = a:GetOrCompute("x", function() calls += 1; return 43 end)
	check("GetOrCompute chi tinh 1 lan", v1 == 42 and v2 == 42 and calls == 1)
	a:Destroy()
end

-- 6) Pool: tai su dung doi tuong (muc 7)
do
	local a = newInst()
	local made = 0
	a:DefinePool("p", function() made += 1; return { n = made } end, function(o) o.reset = true end, 2)
	local o1 = a:Acquire("p")
	a:Release("p", o1)
	local o2 = a:Acquire("p")
	check("pool tai su dung doi tuong", o1 == o2 and made == 1 and o2.reset == true)
	a:Destroy()
end

-- 7) Debounce: 3 lan goi nhanh chi chay 1 lan cuoi (muc 1, 3)
do
	clock.t = 400
	local a = newInst()
	local hits = 0
	for _ = 1, 3 do a:Debounce("save", 0.5, function() hits += 1 end) end
	clock.t += 0.6
	a:Step()
	check("debounce chi chay 1 lan", hits == 1)
	a:Destroy()
end

-- 8) Loi: loi giong nhau lap lai bi nen, chi bao 1 lan (muc 9)
do
	local logs = 0
	local a = newInst({ log = function() logs += 1 end })
	for _ = 1, 5 do a:Guard(function() error("boom") end) end
	check("loi lap lai chi bao 1 lan/5s", logs == 1 and a:GetReport().stats.errors == 5)
	local ok, v = a:Guard(function(x) return x * 2 end, 21)
	check("Guard tra ket qua khi thanh cong", ok and v == 42)
	a:Destroy()
end

-- 9) Mang: request trung trong cua so chi chay 1 lan (muc 8)
do
	clock.t = 500
	local a = newInst({ netDedupeWindowSec = 2 })
	local calls = 0
	local r1, s1 = a:Request("cfg", function() calls += 1; return "data" end)
	local r2, s2 = a:Request("cfg", function() calls += 1; return "other" end)
	check("request trung duoc gom", r1 == "data" and r2 == "data" and s2 == "cached" and calls == 1)
	clock.t += 3
	local _, s3 = a:Request("cfg", function() calls += 1; return "new" end)
	check("het cua so thi request lai", s3 == "fresh" and calls == 2)
	a:Destroy()
end

-- 10) Song song: vuot gioi han thi tu choi thay vi chay vo han (muc 11)
do
	local a = newInst({ maxConcurrent = 1 })
	local innerOk = nil
	a:RunLimited(function()
		local ok = a:RunLimited(function() end)
		innerOk = ok
	end)
	check("gioi han tac vu song song", innerOk == false and a:GetReport().stats.dropped == 1)
	a:Destroy()
end

-- 11) Do hieu suat: phan loai dung nguon lag CPU/RAM/NETWORK (muc 13)
do
	clock.t = 600
	local a = newInst()
	for _ = 1, 40 do a:Sample(1 / 30) end
	local rep = a:GetReport()
	check("do FPS/frame + phan loai CPU", rep.fpsAvg > 28 and rep.fpsAvg < 32 and rep.bottleneck == "CPU/frame")

	local b = newInst({ memoryProvider = function() return 2048 end, pingProvider = function() return 0.05 end })
	for _ = 1, 40 do b:Sample(1 / 60) end
	check("RAM cao -> phan loai RAM", b:GetReport().bottleneck == "RAM" and b:GetReport().memoryMB == 2048)

	local c = newInst({ memoryProvider = function() return 200 end, pingProvider = function() return 0.4 end })
	for _ = 1, 40 do c:Sample(1 / 120) end
	check("ping cao + frame tot -> phan loai NETWORK", c:GetReport().bottleneck == "NETWORK")

	local d = newInst({ memoryProvider = function() return 200 end, pingProvider = function() return 0.04 end })
	for _ = 1, 40 do d:Sample(1 / 120) end
	local snap = d:Snapshot()
	check("on dinh -> OK + snapshot/compare khong bia so", d:GetReport().bottleneck == "OK"
		and AntiLag.Compare(snap, d:GetReport()).fpsDelta ~= nil)
	a:Destroy(); b:Destroy(); c:Destroy(); d:Destroy()
end

-- 12) Destroy: don sach hang doi/cache, Step sau Destroy khong chay (yeu cau don tai nguyen)
do
	local a = newInst()
	local ran = 0
	a:Queue(function() ran += 1 end)
	a:CacheSet("k", 1)
	a:Destroy()
	check("Destroy don sach", a:Step() == 0 and ran == 0 and a:CacheGet("k") == nil and a:QueueSize() == 0)
end

print(("KET QUA: %d PASS, %d FAIL"):format(passed, failed))
if failed > 0 then error("CO TEST THAT BAI") end
print("ANTILAG_ALL_OK")
