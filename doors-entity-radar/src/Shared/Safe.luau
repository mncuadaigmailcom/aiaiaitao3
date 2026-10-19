--[[
	doors-entity-radar/src/Shared/Safe.luau
	ModuleScript — đặt tại: ReplicatedStorage.DoorsEntityRadar.Shared.Safe

	ĐỆM AN TOÀN khi chạm API Roblox. Hệ thống này chạy cạnh trò chơi của
	người khác nên MỌI truy cập có thể ném lỗi đều phải đi qua đây:
	  * service có thể không tồn tại trong một số chế độ;
	  * instance có thể bị Destroy giữa lúc ta đang đọc;
	  * property có thể không tồn tại trên class đó.

	QUY TẮC BẤT DI BẤT DỊCH: tệp này chỉ ĐỌC thế giới. Hàm duy nhất được
	ghi là SetParent/Destroy và chỉ dùng cho instance do CHÍNH dự án tạo.
]]

local Safe = {}

--[[
	Lấy service, không ném lỗi. Trả về (service, errorMessage).
	Ví dụ: local uis, err = Safe.GetService("UserInputService")
]]
function Safe.GetService(name)
	if type(name) ~= "string" then
		return nil, "Tên service phải là chuỗi"
	end
	local ok, service = pcall(function()
		return game:GetService(name)
	end)
	if not ok then
		return nil, tostring(service)
	end
	if service == nil then
		return nil, ("game:GetService('%s') trả về nil"):format(name)
	end
	return service, nil
end

-- Instance còn sống không (chưa Destroy, còn Parent).
function Safe.IsAlive(instance)
	if instance == nil then
		return false
	end
	local ok, parent = pcall(function()
		return instance.Parent
	end)
	if not ok then
		return false
	end
	return parent ~= nil
end

-- Đọc Name an toàn; trả nil nếu không đọc được.
function Safe.GetName(instance)
	if instance == nil then
		return nil
	end
	local ok, name = pcall(function()
		return instance.Name
	end)
	if not ok or type(name) ~= "string" then
		return nil
	end
	return name
end

-- Đọc ClassName an toàn.
function Safe.GetClassName(instance)
	if instance == nil then
		return nil
	end
	local ok, className = pcall(function()
		return instance.ClassName
	end)
	if not ok or type(className) ~= "string" then
		return nil
	end
	return className
end

--[[
	Kiểm tra class. Nhận nhiều tên để bù cho việc IsA trong một số môi
	trường kiểm thử chỉ so khớp chính xác ClassName.
	  Safe.IsClass(part, "Part", "MeshPart", "BasePart")
]]
function Safe.IsClass(instance, ...)
	if instance == nil then
		return false
	end
	local className = Safe.GetClassName(instance)
	if className == nil then
		return false
	end
	local count = select("#", ...)
	for index = 1, count do
		local wanted = select(index, ...)
		if className == wanted then
			return true
		end
		local ok, matched = pcall(function()
			return instance:IsA(wanted)
		end)
		if ok and matched == true then
			return true
		end
	end
	return false
end

-- Đọc một property bất kỳ, không ném lỗi. Trả về (value, ok).
function Safe.Read(instance, propertyName)
	if instance == nil or type(propertyName) ~= "string" then
		return nil, false
	end
	local ok, value = pcall(function()
		return instance[propertyName]
	end)
	if not ok then
		return nil, false
	end
	return value, true
end

--[[
	Ghi một property. CHỈ dùng cho instance do dự án tạo (UI).
	Trả về true nếu ghi được. Không bao giờ ném lỗi ra ngoài.
]]
function Safe.Write(instance, propertyName, value)
	if instance == nil or type(propertyName) ~= "string" then
		return false
	end
	local ok = pcall(function()
		instance[propertyName] = value
	end)
	return ok == true
end

--[[
	Nối signal một cách phòng vệ. Nhiều service không tồn tại trong mọi
	môi trường (ví dụ UserInputService ở một số chế độ Studio), và signal
	có thể là nil — khi đó trả về nil kèm thông báo, hệ thống vẫn chạy.
]]
function Safe.Connect(signal, handler, context)
	if signal == nil then
		return nil, ("Không có signal để nối (%s)"):format(tostring(context))
	end
	local connectMethod = nil
	local okGet = pcall(function()
		connectMethod = signal.Connect
	end)
	if not okGet or type(connectMethod) ~= "function" then
		return nil, ("Signal không có :Connect (%s)"):format(tostring(context))
	end
	local ok, connection = pcall(function()
		return signal:Connect(handler)
	end)
	if not ok then
		return nil, ("Nối signal thất bại (%s): %s"):format(tostring(context), tostring(connection))
	end
	return connection, nil
end

-- Ngắt connection an toàn, chấp nhận nil và connection đã ngắt.
function Safe.Disconnect(connection)
	if connection == nil then
		return false
	end
	local ok = pcall(function()
		connection:Disconnect()
	end)
	return ok == true
end

-- Huỷ instance do dự án tạo. Trả về true nếu đã huỷ (hoặc vốn đã nil).
function Safe.Destroy(instance)
	if instance == nil then
		return true
	end
	local ok = pcall(function()
		instance:Destroy()
	end)
	return ok == true
end

-- Đếm con trực tiếp an toàn (dùng cho kiểm tra dọn dẹp).
function Safe.CountChildren(instance)
	if instance == nil then
		return 0
	end
	local ok, children = pcall(function()
		return instance:GetChildren()
	end)
	if not ok or type(children) ~= "table" then
		return 0
	end
	return #children
end

return Safe
