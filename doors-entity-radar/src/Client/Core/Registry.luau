--[[
	doors-entity-radar/src/Client/Core/Registry.luau
	ModuleScript — đặt tại: DoorsEntityRadar.Client.Core.Registry

	SỔ ĐĂNG KÝ TÀI NGUYÊN. Mọi connection và mọi instance do dự án tạo đều
	phải đăng ký ở đây, để khi tắt hệ thống ta dọn được SẠCH và chứng minh
	được là đã sạch (ConnectionCount/InstanceCount về 0 — có test kiểm tra).

	Không đăng ký = rò rỉ. Đó là lý do tệp này tồn tại.
]]

local Shared_Safe = __DER_REQUIRE("Shared/Safe")
local Shared_Log = __DER_REQUIRE("Shared/Log")

local Registry = {}

-- Danh sách connection: { connection, label }
Registry.connections = {}
-- Danh sách instance do dự án tạo: { instance, label }
Registry.instances = {}
-- Danh sách hàm dọn dẹp không phải connection/instance (ví dụ UnbindAction).
Registry.cleanups = {}

--[[
	Nối signal và đăng ký. Trả về (connection, errorMessage).
	Nếu signal không tồn tại (service vắng mặt), trả nil + thông báo:
	hệ thống phải chạy tiếp được, không được chết vì thiếu một phím tắt.
]]
function Registry.Connect(signal, handler, label)
	if type(handler) ~= "function" then
		return nil, ("Registry.Connect cần function (%s)"):format(tostring(label))
	end
	local connection, err = Shared_Safe.Connect(signal, handler, label)
	if connection == nil then
		return nil, err
	end
	Registry.connections[#Registry.connections + 1] = {
		connection = connection,
		label = tostring(label),
	}
	return connection, nil
end

-- Nối signal chỉ chạy một lần (dùng cho CharacterAdded kiểu chờ).
function Registry.ConnectOnce(signal, handler, label)
	local holder = {}
	local connection, err = Registry.Connect(signal, function(...)
		if holder.done then
			return
		end
		holder.done = true
		-- Ngắt TRƯỚC khi gọi handler để handler có thể nối lại chính nó.
		for index = #Registry.connections, 1, -1 do
			if Registry.connections[index].connection == holder.connection then
				Shared_Safe.Disconnect(holder.connection)
				table.remove(Registry.connections, index)
				break
			end
		end
		handler(...)
	end, label)
	holder.connection = connection
	return connection, err
end

-- Ngắt và gỡ MỘT connection khỏi sổ.
function Registry.Release(connection)
	if connection == nil then
		return false
	end
	for index = #Registry.connections, 1, -1 do
		if Registry.connections[index].connection == connection then
			Shared_Safe.Disconnect(connection)
			table.remove(Registry.connections, index)
			return true
		end
	end
	return false
end

-- Đăng ký một instance do dự án tạo (thường là GUI).
function Registry.Track(instance, label)
	if instance == nil then
		return nil
	end
	Registry.instances[#Registry.instances + 1] = {
		instance = instance,
		label = tostring(label),
	}
	return instance
end

-- Huỷ và gỡ MỘT instance khỏi sổ.
function Registry.Untrack(instance)
	if instance == nil then
		return false
	end
	for index = #Registry.instances, 1, -1 do
		if Registry.instances[index].instance == instance then
			table.remove(Registry.instances, index)
			return true
		end
	end
	return false
end

--[[
	Đăng ký một HÀM DỌN DẸP. Dùng cho tài nguyên không phải connection
	cũng không phải instance — ví dụ ContextActionService:UnbindAction.
	Trả về hàm huỷ đăng ký.
]]
function Registry.AddCleanup(fn, label)
	if type(fn) ~= "function" then
		return nil
	end
	local entry = { fn = fn, label = tostring(label) }
	Registry.cleanups[#Registry.cleanups + 1] = entry
	return function()
		for index = #Registry.cleanups, 1, -1 do
			if Registry.cleanups[index] == entry then
				table.remove(Registry.cleanups, index)
				return true
			end
		end
		return false
	end
end

function Registry.CleanupCount()
	return #Registry.cleanups
end

-- Chạy mọi hàm dọn dẹp (mỗi hàm được pcall để một hàm lỗi không chặn hàm khác).
function Registry.RunCleanups()
	local ran = 0
	for index = #Registry.cleanups, 1, -1 do
		local entry = Registry.cleanups[index]
		Registry.cleanups[index] = nil
		local ok, err = pcall(entry.fn)
		if not ok then
			Shared_Log.Warn(("hàm dọn dẹp '%s' ném lỗi: %s"):format(entry.label, tostring(err)))
		end
		ran = ran + 1
	end
	return ran
end

function Registry.ConnectionCount()
	return #Registry.connections
end

function Registry.InstanceCount()
	return #Registry.instances
end

-- Danh sách nhãn đang giữ — dùng khi chẩn đoán rò rỉ.
function Registry.Labels()
	local labels = {}
	for _, entry in ipairs(Registry.connections) do
		labels[#labels + 1] = "conn:" .. entry.label
	end
	for _, entry in ipairs(Registry.instances) do
		labels[#labels + 1] = "inst:" .. entry.label
	end
	for _, entry in ipairs(Registry.cleanups) do
		labels[#labels + 1] = "cleanup:" .. entry.label
	end
	return labels
end

--[[
	DỌN SẠCH: ngắt mọi connection, huỷ mọi instance do dự án tạo.
	Gọi khi tắt hệ thống. Chạy lại lần hai phải an toàn (idempotent).
]]
function Registry.Shutdown()
	-- Dọn tài nguyên "không phải instance" trước, để chúng không tạo thêm
	-- instance mới trong lúc ta đang huỷ.
	Registry.RunCleanups()

	local disconnected = 0
	for index = #Registry.connections, 1, -1 do
		local entry = Registry.connections[index]
		Registry.connections[index] = nil
		if Shared_Safe.Disconnect(entry.connection) then
			disconnected = disconnected + 1
		end
	end

	local destroyed = 0
	for index = #Registry.instances, 1, -1 do
		local entry = Registry.instances[index]
		Registry.instances[index] = nil
		if Shared_Safe.Destroy(entry.instance) then
			destroyed = destroyed + 1
		end
	end

	if disconnected > 0 or destroyed > 0 then
		Shared_Log.Debug(("Shutdown: ngắt %d connection, huỷ %d instance")
			:format(disconnected, destroyed))
	end
	return disconnected, destroyed
end

return Registry
