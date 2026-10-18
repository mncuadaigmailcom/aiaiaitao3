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
