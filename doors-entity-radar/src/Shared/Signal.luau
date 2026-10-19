--[[
	doors-entity-radar/src/Shared/Signal.luau
	ModuleScript — đặt tại: ReplicatedStorage.DoorsEntityRadar.Shared.Signal

	TÍN HIỆU THUẦN LUAU, không dùng BindableEvent/BindableFunction.
	Lý do: tín hiệu nội bộ giữa Tracker và UI không cần vượt ranh giới
	script, và BindableEvent bắt buộc tạo instance (thêm rác phải dọn).

	Hợp đồng:
	  local s = Signal.new()
	  local conn = s:Connect(function(a, b) ... end)
	  s:Fire(1, 2)
	  conn:Disconnect()
	  s:DisconnectAll()

	Đảm bảo đã kiểm thử:
	  * handler Disconnect ngay trong callback không làm hỏng lần Fire đó
	    (danh sách handler được sao chép trước khi gọi);
	  * Disconnect hai lần không báo lỗi và không trừ trùng;
	  * Fire sau DisconnectAll không gọi handler nào.
]]

local Signal = {}
Signal.__index = Signal

function Signal.new()
	return setmetatable({ _handlers = {}, _alive = true }, Signal)
end

--[[
	Đăng ký handler. Trả về object có :Disconnect().
	Ném lỗi nếu signal đã bị huỷ — đó là lỗi lập trình, không được im lặng.
]]
function Signal:Connect(handler)
	if type(handler) ~= "function" then
		error(("Signal:Connect cần function, nhận %s"):format(type(handler)), 2)
	end
	if not self._alive then
		error("Signal:Connect trên signal đã DisconnectAll", 2)
	end

	local handlers = self._handlers
	local entry = { fn = handler, connected = true }
	handlers[#handlers + 1] = entry

	local connection = {}
	function connection:Disconnect()
		if not entry.connected then
			return false
		end
		entry.connected = false
		for index = #handlers, 1, -1 do
			if handlers[index] == entry then
				table.remove(handlers, index)
				break
			end
		end
		return true
	end
	function connection:IsConnected()
		return entry.connected
	end
	return connection
end

-- Số handler đang nối — dùng cho kiểm thử rò rỉ kết nối.
function Signal:HandlerCount()
	return #self._handlers
end

-- Bắn tín hiệu. Handler lỗi bị pcall để không chặn các handler còn lại.
function Signal:Fire(...)
	if not self._alive then
		return 0
	end
	local snapshot = {}
	for index, entry in ipairs(self._handlers) do
		snapshot[index] = entry
	end
	local called = 0
	for _, entry in ipairs(snapshot) do
		if entry.connected then
			called = called + 1
			local ok, err = pcall(entry.fn, ...)
			if not ok then
				warn(("[DER] handler của Signal ném lỗi: %s"):format(tostring(err)))
			end
		end
	end
	return called
end

-- Ngắt toàn bộ handler và đánh dấu signal đã chết.
function Signal:DisconnectAll()
	for _, entry in ipairs(self._handlers) do
		entry.connected = false
	end
	self._handlers = {}
	self._alive = false
end

function Signal:IsAlive()
	return self._alive
end

return Signal
