--[[
	Util/Safe.luau
	Truy cập property "an toàn": mọi lần đọc/ghi đều được pcall bảo vệ và
	được GHI NHẬT KÝ. Đây là nền tảng của nguyên tắc "không bịa":
	mỗi thay đổi thực tế đều có bản ghi applied / unsupported / failed.

	Thuần logic + dùng API Roblox qua object truyền vào -> mock được, test được.
]]

local Safe = {}

Safe.Sink = nil            -- function(level, scope, message)  (do Log.bind gán)
Safe.Records = {}          -- nhật ký mọi thao tác property, dùng cho báo cáo + unit test

local function note(level: string, scope: string, message: string)
	Safe.Records[#Safe.Records + 1] = { level = level, scope = scope, message = message }
	if Safe.Sink then
		Safe.Sink(level, scope, message)
	end
end

function Safe.Reset()
	table.clear(Safe.Records)
end

--[[
	Đọc property. Không bao giờ throw.
	Trả về: value, ok
]]
function Safe.Get(instance: any, name: string): (any, boolean)
	if instance == nil then
		return nil, false
	end
	local ok, value = pcall(function()
		return instance[name]
	end)
	if not ok then
		note("warn", "Safe.Get", ("%s.%s không đọc được: %s"):format(tostring(instance), name, tostring(value)))
		return nil, false
	end
	return value, true
end

--[[
	Ghi property có kiểm soát.
	opts = { expect = <giá trị kỳ vọng>, scope = "<tên bước>" }
	Trả về: ok (boolean), detail (string)

	Nếu truyền opts.expect và giá trị đọc lại khác kỳ vọng -> ok = false,
	chi tiết "wrote-but-not-applied". Đây là chốt chặn chống "tự nhận đã tối ưu".
]]
function Safe.Set(instance: any, name: string, value: any, opts: any): (boolean, string)
	opts = opts or {}
	local scope = opts.scope or "Safe.Set"
	if instance == nil then
		note("warn", scope, ("%s: instance rỗng, bỏ qua"):format(name))
		return false, "nil-instance"
	end

	local ok, err = pcall(function()
		instance[name] = value
	end)
	if not ok then
		note("warn", scope, ("%s.%s không ghi được: %s"):format(tostring(instance), name, tostring(err)))
		return false, "read-only-or-missing"
	end

	if opts.expect ~= nil then
		local readBack, readOk = Safe.Get(instance, name)
		if not readOk then
			note("warn", scope, ("%s.%s ghi xong nhưng không đọc lại được"):format(tostring(instance), name))
			return false, "wrote-but-unreadable"
		end
		if readBack ~= opts.expect then
			note("warn", scope, ("%s.%s ghi %s nhưng đọc lại %s")
				:format(tostring(instance), name, tostring(value), tostring(readBack)))
			return false, "wrote-but-not-applied"
		end
	end

	note("info", scope, ("%s.%s = %s"):format(tostring(instance), name, tostring(value)))
	return true, "ok"
end

--[[
	Gọi method an toàn: Safe.Call(obj, "SetNetworkOwner", nil)
	Trả về: ok, result
]]
function Safe.Call(object: any, method: string, ...: any): (boolean, any)
	if object == nil or object[method] == nil then
		return false, "method-missing"
	end
	local results = { pcall(object[method], object, ...) }
	local ok = table.remove(results, 1)
	if not ok then
		return false, results[1]
	end
	return true, results[1]
end

--[[
	Đếm số bản ghi theo level — dùng cho unit test.
]]
function Safe.CountByLevel(level: string): number
	local n = 0
	for _, record in Safe.Records do
		if record.level == level then
			n += 1
		end
	end
	return n
end

return Safe
