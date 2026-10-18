--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  ASSET-003, EVT-002, EVT-006, LEAK-001,
	  LEAK-002, LEAK-003, LEAK-005, QUERY-002,
	  RES-002, RES-003, SAFE-007 
	===== RALO.METHODS:END ===== --]]

--[[
	Client/Core/Registry.luau
	===== RALO.METHODS:LEAK-001, LEAK-002, LEAK-003, LEAK-005, RES-003, CPU-002 =====

	Sổ đăng ký TRUNG TÂM cho mọi thứ hệ thống tạo ra hoặc kết nối tới.

	Nguyên nhân lag mà nó xử lý:
	  * Connection không Disconnect -> callback vẫn chạy sau khi đối tượng
	    đã bị huỷ => rò rỉ CPU tăng dần theo thời gian chơi.
	  * Instance do script tạo ra không ai giữ tham chiếu -> không dọn được.
	  * `FindFirstChild` lặp lại nhiều lần cho cùng một đối tượng -> tra cứu
	    cây instance tốn chi phí một cách vô ích.

	Cách xử lý:
	  * Mọi Connect đi qua Registry.Connect -> có handle, có DisconnectAll().
	  * Mọi Instance tạo ra đi qua Registry.Own -> có Release/ReleaseAll().
	  * Cache FindFirstChild theo (parent, name) và TỰ HUỶ cache khi đối
	    tượng bị huỷ (nghe AncestryChanged) -> cache không bao giờ trỏ vào
	    instance đã chết.
]]

local Shared_Log = __RALO_REQUIRE("Shared/Log")
local Client_Guard = __RALO_REQUIRE("Client/Core/Guard")

local SCOPE = "Registry"

local Registry = {}

Registry.connections = {}     -- id -> { connection, signalName, owner, alive }
Registry.owned = {}           -- id -> { instance, className, owner }
Registry.cache = {}           -- key -> instance
Registry.watchers = {}        -- id -> connection theo dõi AncestryChanged
Registry.autoDisconnect = true

local nextId = 0
local function newId()
	nextId += 1
	return nextId
end

--[[
	Kết nối có quản lý.
	Trả về handle { Disconnect = fn, Connected = bool, id }
	Nếu signal hoặc handler sai -> trả về nil và ghi log, không throw.
]]
function Registry.Connect(signal, handler, owner)
	if signal == nil or type(handler) ~= "function" then
		Shared_Log.Warn(SCOPE, "Connect cần signal và handler function")
		return nil
	end

	local connection
	local ok, result = Client_Guard.Run(SCOPE .. ":Connect", function()
		return signal:Connect(handler)
	end)
	if not ok or result == nil then
		return nil
	end
	connection = result

	local id = newId()
	local handle = { id = id, Connected = true, owner = owner or "anon" }

	function handle:Disconnect()
		local entry = Registry.connections[self.id]
		if entry == nil then
			return false
		end
		local okDisconnect = Client_Guard.Run(SCOPE .. ":Disconnect", function()
			entry.connection:Disconnect()
		end)
		Registry.connections[self.id] = nil
		self.Connected = false
		return okDisconnect
	end
	handle.Disconnect_ = handle.Disconnect

	Registry.connections[id] = {
		connection = connection,
		handle = handle,
		owner = handle.owner,
	}
	return handle
end

--[[
	Kết nối MỘT LẦN rồi tự ngắt (LEAK-003).
	Dùng cho các tín hiệu chỉ cần phản ứng lần đầu.
]]
function Registry.ConnectOnce(signal, handler, owner)
	local handle
	handle = Registry.Connect(signal, function(...)
		if handle ~= nil then
			handle:Disconnect()
		end
		return handler(...)
	end, owner)
	return handle
end

--[[
	Theo dõi một instance: khi nó rời khỏi cây (bị Destroy) thì tự ngắt
	mọi connection và xoá cache liên quan (LEAK-002).
]]
function Registry.Watch(instance, owner)
	if not Client_Guard.Alive(instance) then
		return nil
	end
	local ok, signal = Client_Guard.Run(SCOPE .. ":Watch", function()
		return instance:GetPropertyChangedSignal("Parent")
	end)
	if not ok or signal == nil then
		return nil
	end

	local id = newId()
	local conn = Registry.Connect(signal, function()
		-- Parent đổi -> kiểm tra còn trong cây không
		if not Client_Guard.InTree(instance) then
			Registry.DropInstance(instance)
			local entry = Registry.watchers[id]
			if entry ~= nil and entry.handle ~= nil then
				entry.handle:Disconnect()
			end
			Registry.watchers[id] = nil
		end
	end, owner or "watch")

	Registry.watchers[id] = { handle = conn, instance = instance }
	return id
end

-- Đăng ký instance do hệ thống tạo ra.
function Registry.Own(instance, owner)
	if not Client_Guard.Alive(instance) then
		return nil
	end
	local id = newId()
	Registry.owned[id] = {
		instance = instance,
		className = instance.ClassName,
		owner = owner or "anon",
	}
	return id
end

function Registry.Release(id)
	local entry = Registry.owned[id]
	if entry == nil then
		return false
	end
	Registry.owned[id] = nil
	-- CHỈ huỷ thứ hệ thống tạo ra, không đụng instance của game
	local ok = Client_Guard.Run(SCOPE .. ":Release", function()
		entry.instance:Destroy()
	end)
	return ok
end

-- Xoá cache/handle trỏ tới một instance đã chết.
function Registry.DropInstance(instance)
	for key, cached in pairs(Registry.cache) do
		if cached == instance then
			Registry.cache[key] = nil
		end
	end
end

--[[
	FindFirstChild CÓ CACHE và tự vô hiệu khi đối tượng bị huỷ.
	Trả về: instance hoặc nil.
]]
function Registry.Find(parent, name, className)
	if parent == nil or name == nil then
		return nil
	end
	local key = tostring(parent) .. "/" .. tostring(name) .. "/" .. tostring(className or "")
	local cached = Registry.cache[key]
	if cached ~= nil then
		-- Dùng InTree chứ không phải Alive: instance bị gỡ khỏi cây thì
		-- FindFirstChild không còn trả về nó, nên cache phải vô hiệu.
		if Client_Guard.InTree(cached) then
			return cached
		end
		Registry.cache[key] = nil
	end

	local ok, found = Client_Guard.Run(SCOPE .. ":Find", function()
		if className ~= nil then
			return parent:FindFirstChildOfClass(className)
		end
		return parent:FindFirstChild(name)
	end)
	if ok and found ~= nil then
		Registry.cache[key] = found
		return found
	end
	return nil
end

function Registry.ConnectionCount()
	local n = 0
	for _ in pairs(Registry.connections) do
		n += 1
	end
	return n
end

function Registry.OwnedCount()
	local n = 0
	for _ in pairs(Registry.owned) do
		n += 1
	end
	return n
end

function Registry.CacheCount()
	local n = 0
	for _ in pairs(Registry.cache) do
		n += 1
	end
	return n
end

function Registry.Stats()
	return {
		connections = Registry.ConnectionCount(),
		owned = Registry.OwnedCount(),
		cacheEntries = Registry.CacheCount(),
		watchers = (function()
			local n = 0
			for _ in pairs(Registry.watchers) do
				n += 1
			end
			return n
		end)(),
	}
end

-- Ngắt MỌI connection, huỷ MỌI instance do hệ thống tạo, xoá cache.
function Registry.Shutdown()
	local disconnected = 0
	for id, entry in pairs(Registry.connections) do
		if entry.handle ~= nil then
			entry.handle:Disconnect()
			disconnected += 1
		end
		Registry.connections[id] = nil
	end

	local released = 0
	for id, entry in pairs(Registry.owned) do
		if Registry.Release(id) then
			released += 1
		end
	end

	for id, entry in pairs(Registry.watchers) do
		if entry.handle ~= nil then
			entry.handle:Disconnect()
		end
		Registry.watchers[id] = nil
	end

	table.clear(Registry.cache)
	Shared_Log.Info(SCOPE, ("đã ngắt %d connection, huỷ %d instance do hệ thống tạo")
		:format(disconnected, released))
	return disconnected, released
end

function Registry.Reset()
	Registry.Shutdown()
	nextId = 0
end

return Registry
