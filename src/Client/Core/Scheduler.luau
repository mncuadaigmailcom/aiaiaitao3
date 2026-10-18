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
