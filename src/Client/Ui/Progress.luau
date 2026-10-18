--[[
	Ui/Progress.luau
	Mô hình trạng thái tiến trình. Tách khỏi UI để unit test được:
	tiến trình, phần trăm, đếm theo trạng thái đều là logic thuần.

	UI (Menu.luau) chỉ là "người quan sát": nó Connect vào Progress.Changed
	và vẽ lại. Nhờ vậy có thể test logic tiến trình mà không cần vẽ gì.
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
