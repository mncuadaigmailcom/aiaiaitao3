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
