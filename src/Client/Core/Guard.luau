--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  CFG-003, CPU-008, REC-001, REC-002,
	  REC-004 
	===== RALO.METHODS:END ===== --]]

--[[
	Client/Core/Guard.luau
	===== RALO.METHODS:REC-001, REC-003, REC-004, CFG-003, CPU-008 =====

	Lớp bảo vệ: mọi tác vụ tối ưu đều đi qua đây.

	Nguyên nhân lag / hỏng hệ thống mà nó xử lý:
	  * Một property bị khoá (client không ghi được) làm throw -> nếu không
	    pcall thì TOÀN BỘ pipeline chết giữa chừng, người dùng mất luôn
	    khả năng khôi phục.
	  * Ghi giá trị mà không kiểm tra đối tượng còn sống -> lỗi tham chiếu
	    tới instance đã Destroy.
	  * Khôi phục đè lên thay đổi mới của game/người dùng.

	Cách xử lý:
	  * Run(): pcall + ghi log + đếm lỗi, không bao giờ throw ra ngoài.
	  * Alive(): kiểm tra instance còn tồn tại trước khi thao tác.
	  * Change(): chỉ ghi khi giá trị hiện tại VẪN là giá trị ta đã đặt
	    (chống ghi đè thay đổi của người khác).
]]

local Shared_Log = __RALO_REQUIRE("Shared/Log")

local SCOPE = "Guard"

local Guard = {}

Guard.stats = { calls = 0, failures = 0, skippedNil = 0, blockedStale = 0 }
Guard.errors = {}
Guard.maxErrorLog = 60

local function recordError(scope, message)
	Guard.stats.failures += 1
	table.insert(Guard.errors, { scope = scope, message = message, time = os.clock() })
	if #Guard.errors > Guard.maxErrorLog then
		table.remove(Guard.errors, 1)
	end
	Shared_Log.Warn(scope, message)
end

--[[
	Chạy một hàm trong vùng bảo vệ.
	Trả về: ok, result
	Không bao giờ throw ra ngoài.
]]
function Guard.Run(scope, fn, ...)
	Guard.stats.calls += 1
	if type(fn) ~= "function" then
		recordError(scope, "Guard.Run cần một function")
		return false, nil
	end
	local results = { pcall(fn, ...) }
	local ok = table.remove(results, 1)
	if not ok then
		-- Trả thông điệp lỗi về cho người gọi (không vứt bỏ): người gọi
		-- cần biết VÌ SAO thất bại để đưa vào báo cáo, không chỉ biết "hỏng".
		local message = tostring(results[1])
		recordError(scope, message)
		return false, message
	end
	return true, results[1]
end

--[[
	Instance còn dùng được không?

	Cách kiểm tra: thử ĐỌC một property. Nếu instance đã bị Destroy thì
	Roblox ném lỗi khi truy cập, và pcall bắt được.

	LƯU Ý: KHÔNG dùng `Parent ~= nil` làm tiêu chí "còn sống". Lý do:
	  * instance vừa tạo chưa gắn parent vẫn ghi property được bình thường;
	  * Pool.Release và Cull cố tình đặt Parent = nil nhưng đối tượng vẫn sống;
	nên nếu coi "không có parent" là "đã chết" thì hai module đó sẽ từ chối
	mọi thao tác hợp lệ. Đây là lỗi đã được test guard.test.js phát hiện.
]]
function Guard.Alive(instance)
	if instance == nil then
		Guard.stats.skippedNil += 1
		return false
	end
	local ok = pcall(function()
		return instance.ClassName
	end)
	return ok
end

--[[
	Instance còn NẰM TRONG CÂY không (Parent ~= nil)?

	Đây là câu hỏi KHÁC với Alive():
	  * Alive()  = "còn thao tác được không" (chưa bị Destroy)
	  * InTree() = "còn gắn trong cây instance không"
	Registry cần InTree() để quyết định cache tra cứu còn giá trị không:
	một instance đã bị gỡ khỏi cây thì FindFirstChild sẽ không còn trả về nó,
	nên cache phải bị vô hiệu dù bản thân instance vẫn chưa bị Destroy.
]]
function Guard.InTree(instance)
	if not Guard.Alive(instance) then
		return false
	end
	local ok, parent = pcall(function()
		return instance.Parent
	end)
	return ok and parent ~= nil
end

--[[
	Chỉ ghi property khi giá trị hiện tại vẫn đúng như kỳ vọng.
	Đây là chốt chống "khôi phục đè lên thay đổi mới của game/người dùng".

	opts = { scope, expect = <giá trị phải đang có> }
	Trả về: "applied" | "unchanged" | "stale" | "failed"
]]
function Guard.Change(instance, property, newValue, opts)
	opts = opts or {}
	local scope = opts.scope or SCOPE
	if not Guard.Alive(instance) then
		Guard.stats.skippedNil += 1
		return "failed", "instance không còn tồn tại"
	end

	local okRead, current = pcall(function()
		return instance[property]
	end)
	if not okRead then
		recordError(scope, ("không đọc được %s.%s"):format(tostring(instance), property))
		return "failed", "không đọc được property"
	end

	if opts.expect ~= nil and current ~= opts.expect then
		-- Giá trị đã bị ai đó đổi -> KHÔNG ghi đè.
		Guard.stats.blockedStale += 1
		return "stale", ("giá trị hiện tại là %s, khác giá trị script đã đặt (%s)")
			:format(tostring(current), tostring(opts.expect))
	end

	if current == newValue then
		return "unchanged", "giá trị đã đúng sẵn"
	end

	local okWrite, err = pcall(function()
		instance[property] = newValue
	end)
	if not okWrite then
		recordError(scope, ("không ghi được %s.%s: %s")
			:format(tostring(instance), property, tostring(err)))
		return "failed", tostring(err)
	end

	-- Xác nhận đã ăn (một số property bị engine ghi đè ngay)
	local okVerify, after = pcall(function()
		return instance[property]
	end)
	if okVerify and after ~= newValue then
		recordError(scope, ("ghi %s.%s = %s nhưng đọc lại %s")
			:format(tostring(instance), property, tostring(newValue), tostring(after)))
		return "failed", "ghi không có tác dụng"
	end

	return "applied", "ok"
end

--[[
	Kiểm tra bảng cấu hình: sai kiểu thì báo rõ và dùng giá trị mặc định,
	thay vì để giá trị sai lan xuống từng module (CFG-003).
	Trả về: bảng đã chuẩn hoá, danh sách cảnh báo.
]]
function Guard.NormalizeConfig(profile, defaults)
	local warnings = {}
	local out = {}

	-- Kiểm tra MỘT cặp giá trị: sai kiểu thì báo và dùng mặc định.
	local function checkValue(path, value, defaultValue)
		if value == nil then
			return defaultValue, nil
		end
		-- `nil` trong Luau không phân biệt được với "không có"; số nguyên và
		-- số thực đều là "number" nên so bằng type() là đủ.
		if type(value) ~= type(defaultValue) then
			local warning = ("%s: kỳ vọng %s, nhận %s -> dùng mặc định %s")
				:format(path, type(defaultValue), type(value), tostring(defaultValue))
			return defaultValue, warning
		end
		return value, nil
	end

	-- Duyệt defaults. Khoá cấp cao có thể là BẢNG (một section) hoặc
	-- VÔ HƯỚNG (ví dụ `enabled = true`, `mode = "light"`). Phải xử lý cả hai:
	-- giả định mọi thứ là bảng sẽ sập ngay trên Config.PROFILE thật.
	-- Helper đọc khoá mà KHÔNG biến `false` thành `nil`.
	-- (`profile[k] or nil` là bẫy: enabled = false sẽ bị coi là "thiếu"
	--  và rơi về mặc định true, làm hỏng công tắc tắt tổng.)
	local function readKey(source, key)
		if type(source) ~= "table" then
			return nil
		end
		return source[key]
	end

	for key, defaultValue in pairs(defaults) do
		local given = readKey(profile, key)

		if type(defaultValue) == "table" then
			out[key] = {}
			for subKey, subDefault in pairs(defaultValue) do
				local subGiven = readKey(given, subKey)
				local normalized, warning = checkValue(
					("%s.%s"):format(key, subKey), subGiven, subDefault)
				out[key][subKey] = normalized
				if warning ~= nil then
					warnings[#warnings + 1] = warning
				end
			end
			-- Giữ khoá người dùng tự thêm trong section
			if type(given) == "table" then
				for subKey, subValue in pairs(given) do
					if out[key][subKey] == nil then
						out[key][subKey] = subValue
					end
				end
			end
		else
			local normalized, warning = checkValue(tostring(key), given, defaultValue)
			out[key] = normalized
			if warning ~= nil then
				warnings[#warnings + 1] = warning
			end
		end
	end

	-- Giữ lại section không có trong defaults (người dùng tự thêm)
	if type(profile) == "table" then
		for key, values in pairs(profile) do
			if out[key] == nil then
				out[key] = values
			end
		end
	end

	for _, warning in ipairs(warnings) do
		Shared_Log.Warn(SCOPE, warning)
	end
	return out, warnings
end

function Guard.Stats()
	return {
		calls = Guard.stats.calls,
		failures = Guard.stats.failures,
		skippedNil = Guard.stats.skippedNil,
		blockedStale = Guard.stats.blockedStale,
		loggedErrors = #Guard.errors,
	}
end

function Guard.Reset()
	table.clear(Guard.stats)
	Guard.stats = { calls = 0, failures = 0, skippedNil = 0, blockedStale = 0 }
	table.clear(Guard.errors)
end

return Guard
