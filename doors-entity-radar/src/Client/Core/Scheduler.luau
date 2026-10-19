--[[
	doors-entity-radar/src/Client/Core/Scheduler.luau
	ModuleScript — đặt tại: DoorsEntityRadar.Client.Core.Scheduler

	BỘ LẬP LỊCH MỘT VÒNG LẶP. Toàn hệ thống chỉ có MỘT connection
	RunService.Heartbeat; các công việc đăng ký theo chu kỳ riêng và chỉ
	chạy khi ĐẾN HẠN. Nhờ vậy:
	  * không có vòng lặp `while true do task.wait() end` trôi nổi;
	  * không có nhiều task nền trùng nhau (Start hai lần không nhân đôi);
	  * Pause/Stop/Destroy ngắt đúng connection đó và không để lại gì.

	Trạng thái: "idle" -> "running" <-> "paused" -> "stopped".
]]

local Shared_Safe = __DER_REQUIRE("Shared/Safe")
local Shared_Log = __DER_REQUIRE("Shared/Log")

local Scheduler = {}
Scheduler.__index = Scheduler

Scheduler.STATE = {
	Idle = "idle",
	Running = "running",
	Paused = "paused",
	Stopped = "stopped",
}

function Scheduler.new(options)
	options = options or {}
	local self = setmetatable({}, Scheduler)
	self.state = Scheduler.STATE.Idle
	self.tasks = {}            -- [tên] = { interval, nextRun, fn, calls, errors }
	self.order = {}            -- thứ tự đăng ký, để chạy tất định
	self.connection = nil
	self.lastTickAt = nil
	self.stats = {
		ticks = 0,
		taskCalls = 0,
		taskErrors = 0,
		overruns = 0,          -- số lần một task chạy trễ hơn chu kỳ của nó
		startCount = 0,
		blockedStarts = 0,     -- số lần Start bị chặn vì đang chạy (chống trùng)
	}
	-- Trần thời gian cho MỘT nhịp (giây). Vượt thì ghi log: dấu hiệu máy yếu.
	self.frameBudgetSeconds = options.frameBudgetSeconds or 0.02
	return self
end

--[[
	Đăng ký một công việc định kỳ.
	  name     — tên duy nhất
	  interval — giây giữa hai lần chạy
	  fn       — hàm nhận (nowSeconds)
	Ghi đè cùng tên sẽ thay thế, không tạo task thứ hai.
]]
function Scheduler:SetTask(name, interval, fn)
	if type(name) ~= "string" or type(fn) ~= "function" then
		error("Scheduler:SetTask cần (name: string, interval: number, fn: function)", 2)
	end
	if type(interval) ~= "number" or interval <= 0 then
		error(("Scheduler:SetTask('%s') cần interval > 0"):format(tostring(name)), 2)
	end
	if self.tasks[name] == nil then
		self.order[#self.order + 1] = name
	end
	self.tasks[name] = {
		interval = interval,
		nextRun = 0,
		fn = fn,
		calls = 0,
		errors = 0,
	}
	return true
end

-- Đổi chu kỳ của task đã có. Trả về false nếu task chưa đăng ký.
function Scheduler:SetInterval(name, interval)
	local task = self.tasks[name]
	if task == nil then
		return false
	end
	if type(interval) ~= "number" or interval <= 0 then
		return false
	end
	task.interval = interval
	return true
end

function Scheduler:HasTask(name)
	return self.tasks[name] ~= nil
end

function Scheduler:State()
	return self.state
end

function Scheduler:IsRunning()
	return self.state == Scheduler.STATE.Running
end

-- Chạy ngay MỘT task bất kể đến hạn chưa (nút "Làm mới" dùng cái này).
function Scheduler:RunNow(name, now)
	local task = self.tasks[name]
	if task == nil then
		return false, ("không có task '%s'"):format(tostring(name))
	end
	local timestamp = now or os.clock()
	self:_runTask(name, task, timestamp)
	task.nextRun = timestamp + task.interval
	return true, nil
end

function Scheduler:_runTask(name, task, now)
	task.calls = task.calls + 1
	self.stats.taskCalls = self.stats.taskCalls + 1
	local ok, err = pcall(task.fn, now)
	if not ok then
		task.errors = task.errors + 1
		self.stats.taskErrors = self.stats.taskErrors + 1
		-- Không ném lỗi ra ngoài: một task hỏng không được kéo sập các task khác.
		Shared_Log.Error(("task '%s' ném lỗi: %s"):format(name, tostring(err)))
	end
	return ok
end

-- Một nhịp Heartbeat: chạy các task đến hạn.
function Scheduler:_onHeartbeat(now)
	self.stats.ticks = self.stats.ticks + 1

	-- Ghi nhận trễ: nếu một task đáng lẽ chạy từ lâu thì đếm overrun.
	for _, name in ipairs(self.order) do
		local task = self.tasks[name]
		if task ~= nil and now >= task.nextRun then
			if task.nextRun > 0 and now - task.nextRun > task.interval then
				self.stats.overruns = self.stats.overruns + 1
			end
			self:_runTask(name, task, now)
			task.nextRun = now + task.interval
		end
	end

	if self.lastTickAt ~= nil then
		local elapsed = now - self.lastTickAt
		if elapsed > self.frameBudgetSeconds then
			Shared_Log.Debug(("nhịp scheduler mất %.3fs (trần %.3fs)"):format(elapsed, self.frameBudgetSeconds))
		end
	end
	self.lastTickAt = now
end

--[[
	Khởi động. Trả về (ok, message).
	Start khi đang chạy sẽ bị CHẶN và đếm lại — đây là chốt chống tạo nhiều
	vòng lặp nền trùng nhau.
]]
function Scheduler:Start()
	if self.state == Scheduler.STATE.Running then
		self.stats.blockedStarts = self.stats.blockedStarts + 1
		return false, "Scheduler đang chạy sẵn (không tạo vòng lặp thứ hai)."
	end
	if self.state == Scheduler.STATE.Stopped then
		return false, "Scheduler đã Stop; tạo instance mới hoặc gọi Reset()."
	end
	if self.connection ~= nil then
		-- Phòng hờ: connection cũ còn sót thì ngắt trước khi nối mới.
		Shared_Safe.Disconnect(self.connection)
		self.connection = nil
	end

	local runService, err = Shared_Safe.GetService("RunService")
	if runService == nil then
		return false, "Không có RunService: " .. tostring(err)
	end
	local heartbeat = Shared_Safe.Read(runService, "Heartbeat")
	local connection, connectErr = Shared_Safe.Connect(heartbeat, function()
		self:_onHeartbeat(os.clock())
	end, "Scheduler.Heartbeat")
	if connection == nil then
		return false, "Không nối được Heartbeat: " .. tostring(connectErr)
	end

	self.connection = connection
	self.state = Scheduler.STATE.Running
	self.stats.startCount = self.stats.startCount + 1

	-- Đặt mốc chạy ngay cho mọi task để lần Start có tác dụng tức thì.
	local now = os.clock()
	for _, name in ipairs(self.order) do
		local task = self.tasks[name]
		task.nextRun = now
	end
	self.lastTickAt = nil
	return true, "Scheduler đã chạy."
end

-- Tạm dừng: giữ nguyên task, chỉ ngừng chạy. Dữ liệu cũ bị đánh dấu cũ.
function Scheduler:Pause()
	if self.state ~= Scheduler.STATE.Running then
		return false, ("Không thể tạm dừng từ trạng thái '%s'"):format(tostring(self.state))
	end
	self.state = Scheduler.STATE.Paused
	if self.connection ~= nil then
		Shared_Safe.Disconnect(self.connection)
		self.connection = nil
	end
	return true, "Đã tạm dừng."
end

function Scheduler:Resume()
	if self.state ~= Scheduler.STATE.Paused then
		return false, ("Không thể tiếp tục từ trạng thái '%s'"):format(tostring(self.state))
	end
	-- Reset mốc để không "trả nợ" hàng loạt lần chạy bị bỏ qua khi tạm dừng.
	local now = os.clock()
	for _, name in ipairs(self.order) do
		local task = self.tasks[name]
		task.nextRun = now
	end
	self.state = Scheduler.STATE.Idle
	return self:Start()
end

-- Dừng hẳn: ngắt connection, giữ task để có thể Reset và chạy lại.
function Scheduler:Stop()
	if self.connection ~= nil then
		Shared_Safe.Disconnect(self.connection)
		self.connection = nil
	end
	self.state = Scheduler.STATE.Stopped
	return true, "Đã dừng."
end

-- Cho phép Start lại sau Stop (dùng khi bật/tắt hệ thống nhiều lần).
function Scheduler:Reset()
	if self.connection ~= nil then
		Shared_Safe.Disconnect(self.connection)
		self.connection = nil
	end
	self.state = Scheduler.STATE.Idle
	self.lastTickAt = nil
	return true
end

-- Huỷ hoàn toàn: ngắt connection và xoá task.
function Scheduler:Destroy()
	if self.connection ~= nil then
		Shared_Safe.Disconnect(self.connection)
		self.connection = nil
	end
	self.tasks = {}
	self.order = {}
	self.state = Scheduler.STATE.Stopped
end

function Scheduler:HasConnection()
	return self.connection ~= nil
end

function Scheduler:Stats()
	local perTask = {}
	for _, name in ipairs(self.order) do
		local task = self.tasks[name]
		perTask[name] = { calls = task.calls, errors = task.errors, interval = task.interval }
	end
	return {
		state = self.state,
		ticks = self.stats.ticks,
		taskCalls = self.stats.taskCalls,
		taskErrors = self.stats.taskErrors,
		overruns = self.stats.overruns,
		startCount = self.stats.startCount,
		blockedStarts = self.stats.blockedStarts,
		hasConnection = self.connection ~= nil,
		tasks = perTask,
	}
end

return Scheduler
