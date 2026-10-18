--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  NET-001, NET-002, NET-003, NET-007 
	===== RALO.METHODS:END ===== --]]

--[[
	Client/Core/Net.luau
	===== RALO.METHODS:NET-001, NET-002, NET-003 =====

	Tiết chế lưu lượng mạng PHÍA CLIENT.

	SỰ THẬT KỸ THUẬT (nêu rõ để không nói quá):
	  * Một LocalScript KHÔNG thể tự throttle băng thông của chính nó,
	    không thể giảm tần suất replicate của server, và không thể đổi
	    NetworkOwner (SetNetworkOwner là API phía server).
	  * Cái LocalScript LÀM ĐƯỢC và tệp này làm thật:
	      - gộp nhiều thông điệp thành một (batching),
	      - chặn gửi trùng/thưa trong cửa sổ thời gian (throttling),
	      - chỉ gửi dữ liệu khác lần trước (delta).
	    Cả ba đều giảm số lần FireServer, tức giảm thật số gói tin
	    mà client này sinh ra.

	Không có RemoteEvent "trang trí": Net chỉ hoạt động khi người dùng
	thật sự truyền remote của game vào. Nếu không truyền, nó báo rõ
	"không có remote để tối ưu" và trả về 0 thay đổi.
]]

local Client_Env = __RALO_REQUIRE("Client/Core/Env")
local Shared_Log = __RALO_REQUIRE("Shared/Log")
local Client_Scheduler = __RALO_REQUIRE("Client/Core/Scheduler")

local SCOPE = "Net"

local Net = {}

Net.channels = {}          -- name -> { remote, minInterval, queue, lastSent, lastPayload }
Net.handle = nil
Net.stats = { queued = 0, sent = 0, suppressed = 0, batched = 0, noRemote = 0 }

--[[
	Đăng ký một kênh gửi.
	spec = {
		remote      = RemoteEvent của game,
		minInterval = giây tối thiểu giữa hai lần gửi (mặc định 0.25),
		batch       = true -> gộp nhiều payload thành một mảng
	}
]]
function Net.Register(name, spec)
	if type(name) ~= "string" or type(spec) ~= "table" then
		Shared_Log.Warn(SCOPE, "Register cần tên chuỗi và spec bảng")
		return nil
	end
	if spec.remote == nil then
		Shared_Log.Warn(SCOPE, ("kênh '%s' không có remote -> sẽ không gửi gì"):format(name))
	end

	Net.channels[name] = {
		remote = spec.remote,
		minInterval = math.max(0, tonumber(spec.minInterval) or 0.25),
		batch = spec.batch == true,
		queue = {},
		lastSent = -math.huge,
		lastPayload = nil,
	}
	return Net.channels[name]
end

-- So sánh nông hai payload: dùng để bỏ qua dữ liệu giống hệt lần trước.
local function shallowEqual(a, b)
	if a == b then
		return true
	end
	if type(a) ~= "table" or type(b) ~= "table" then
		return false
	end
	for key, value in pairs(a) do
		if b[key] ~= value then
			return false
		end
	end
	for key in pairs(b) do
		if a[key] == nil then
			return false
		end
	end
	return true
end

--[[
	Đưa dữ liệu vào hàng đợi. KHÔNG gửi ngay.
	Trả về: "queued" | "suppressed-duplicate" | "no-channel"
]]
function Net.Send(name, payload)
	local channel = Net.channels[name]
	if channel == nil then
		Net.stats.noRemote += 1
		return "no-channel"
	end

	-- NET-003: bỏ qua nếu giống hệt lần gửi trước
	if shallowEqual(channel.lastPayload, payload) then
		Net.stats.suppressed += 1
		return "suppressed-duplicate"
	end

	table.insert(channel.queue, payload)
	Net.stats.queued += 1
	Net.Start()
	return "queued"
end

-- Một lượt xả hàng đợi. `nowSeconds` cho phép test bơm thời gian ảo.
function Net.Flush(nowSeconds)
	local now = nowSeconds or Client_Env.now()
	local sent = 0

	for name, channel in pairs(Net.channels) do
		if #channel.queue > 0 then
			if channel.remote == nil then
				-- Không có remote: bỏ hàng đợi để không phình bộ nhớ, và báo rõ
				Net.stats.noRemote += #channel.queue
				table.clear(channel.queue)
			elseif now - channel.lastSent >= channel.minInterval then
				local payload
				if channel.batch and #channel.queue > 1 then
					payload = { channel.queue }          -- NET-002: một gói cho nhiều thông điệp
					Net.stats.batched += #channel.queue - 1
					table.clear(channel.queue)
				else
					payload = table.remove(channel.queue, 1)
				end

				local ok, err = pcall(function()
					channel.remote:FireServer(payload)
				end)
				if ok then
					channel.lastSent = now
					channel.lastPayload = payload
					Net.stats.sent += 1
					sent += 1
				else
					Shared_Log.Warn(SCOPE, ("gửi kênh '%s' lỗi: %s"):format(name, tostring(err)))
				end
			end
		end
	end

	return sent
end

-- Bật bộ xả định kỳ qua Scheduler (không mở vòng lặp riêng).
function Net.Start()
	if Net.handle ~= nil then
		return Net.handle
	end
	Net.handle = Client_Scheduler.Schedule({
		name = "net.flush",
		interval = 0.25,
		priority = -20,               -- ưu tiên thấp, không tranh khung hình
		callback = function()
			Net.Flush()
		end,
	})
	return Net.handle
end

function Net.Stop()
	if Net.handle ~= nil then
		Net.handle:Cancel()
		Net.handle = nil
	end
	for _, channel in pairs(Net.channels) do
		table.clear(channel.queue)
	end
	return true
end

function Net.QueueDepth(name)
	local channel = Net.channels[name]
	return channel ~= nil and #channel.queue or 0
end

function Net.Stats()
	return {
		channels = (function()
			local n = 0
			for _ in pairs(Net.channels) do
				n += 1
			end
			return n
		end)(),
		queued = Net.stats.queued,
		sent = Net.stats.sent,
		suppressedDuplicates = Net.stats.suppressed,
		batched = Net.stats.batched,
		droppedNoRemote = Net.stats.noRemote,
		-- Tỷ lệ nén: số thông điệp bị chặn/gộp so với tổng số đưa vào
		savingRate = Net.stats.queued > 0
			and ((Net.stats.suppressed + Net.stats.batched) / Net.stats.queued) or 0,
	}
end

function Net.Reset()
	Net.Stop()
	table.clear(Net.channels)
	Net.stats = { queued = 0, sent = 0, suppressed = 0, batched = 0, noRemote = 0 }
end

return Net
