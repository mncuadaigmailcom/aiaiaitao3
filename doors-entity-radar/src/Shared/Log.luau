--[[
	doors-entity-radar/src/Shared/Log.luau
	ModuleScript — đặt tại: ReplicatedStorage.DoorsEntityRadar.Shared.Log

	GHI LOG CÓ CẤP ĐỘ. Toàn bộ thông điệp của dự án đi qua tệp này để
	Output của Roblox Studio nhất quán và lọc được bằng tiền tố "[DER]".

	Cấp độ:
	  error > warn > info > debug
	Config.Log.level quyết định mức thấp nhất được in. Mặc định "info":
	đủ để đọc lỗi khi kiểm thử, không làm trôi Output khi chơi.

	Tệp này KHÔNG đọc service nào, KHÔNG tạo instance, KHÔNG đổi trò chơi.
]]

local Log = {}

local LEVEL_ORDER = { error = 1, warn = 2, info = 3, debug = 4 }

-- Mức đang bật. Đổi bằng Log.SetLevel("debug") khi cần soi chi tiết.
Log.level = "info"

-- Đếm số dòng đã in theo từng cấp — dùng cho kiểm thử và cho bảng chẩn đoán.
Log.counts = { error = 0, warn = 0, info = 0, debug = 0 }

-- Tiền tố cố định. Giữ nguyên để người dùng gõ "[DER]" vào bộ lọc Output.
Log.PREFIX = "[DER]"

--[[
	VÒNG LƯU TRỮ DÒNG LOG (cho tab "Nhật ký" trên giao diện).
	Chỉ giữ `Log.historySize` dòng CUỐI CÙNG: bộ nhớ không phình ra dù chơi
	cả buổi, và không có vòng lặp nào phải duyệt toàn bộ lịch sử.
	Chỉ ghi những dòng ĐƯỢC IN (qua ShouldPrint) — tab Nhật ký vì vậy luôn
	khớp với những gì người dùng thấy trong Output, không có dòng "ma".
]]
Log.historySize = 60
Log.history = {}

--[[
	Đặt mức log. Trả về mức thực tế đang áp dụng.
	Giá trị lạ bị từ chối và giữ mức cũ (không im lặng chấp nhận).
]]
function Log.SetLevel(level)
	if type(level) ~= "string" or LEVEL_ORDER[level] == nil then
		warn(("[DER] Log.SetLevel bỏ qua mức không hợp lệ: %s"):format(tostring(level)))
		return Log.level
	end
	Log.level = level
	return Log.level
end

-- Trả về true nếu cấp `level` được phép in ở mức hiện tại.
function Log.ShouldPrint(level)
	local threshold = LEVEL_ORDER[Log.level] or LEVEL_ORDER.info
	local current = LEVEL_ORDER[level]
	if current == nil then
		return false
	end
	return current <= threshold
end

-- Nối các tham số thành một chuỗi, bỏ qua nil.
local function join(...)
	local parts = {}
	local count = select("#", ...)
	for index = 1, count do
		local value = select(index, ...)
		parts[#parts + 1] = tostring(value)
	end
	return table.concat(parts, " ")
end

-- Thêm một dòng vào vòng lưu trữ, cắt bớt phần thừa.
local function pushHistory(level, text)
	local entry = { level = level, text = text, at = os.clock() }
	local history = Log.history
	history[#history + 1] = entry
	local limit = Log.historySize
	if type(limit) ~= "number" or limit < 1 then
		limit = 60
	end
	while #history > limit do
		table.remove(history, 1)
	end
	return entry
end

-- In một dòng theo cấp độ. Trả về true nếu đã in.
function Log.Write(level, ...)
	if not Log.ShouldPrint(level) then
		return false
	end
	Log.counts[level] = (Log.counts[level] or 0) + 1
	local text = ("%s [%s] %s"):format(Log.PREFIX, string.upper(level), join(...))
	pushHistory(level, text)
	if level == "error" then
		-- `warn` thay vì `error`: hệ thống hỗ trợ không được làm sập trò chơi.
		warn(text)
	elseif level == "warn" then
		warn(text)
	else
		print(text)
	end
	return true
end

function Log.Error(...)
	return Log.Write("error", ...)
end

function Log.Warn(...)
	return Log.Write("warn", ...)
end

function Log.Info(...)
	return Log.Write("info", ...)
end

function Log.Debug(...)
	return Log.Write("debug", ...)
end

--[[
	Bọc một lời gọi trong pcall và ghi lỗi có ngữ cảnh.
	Trả về (ok, result) — ĐÚNG thứ tự của pcall, đừng đảo.
	Dùng cho mọi chỗ chạm vào API có thể vắng mặt (service, instance đã huỷ).
]]
function Log.Try(context, fn, ...)
	local ok, result = pcall(fn, ...)
	if not ok then
		Log.Error(("lỗi trong %s: %s"):format(tostring(context), tostring(result)))
	end
	return ok, result
end

-- Đặt lại bộ đếm (chỉ dùng trong kiểm thử).
function Log.ResetCounts()
	Log.counts = { error = 0, warn = 0, info = 0, debug = 0 }
end

--[[
	Đọc các dòng log gần nhất (bản SAO, để UI không giữ tham chiếu vào vòng
	lưu trữ đang chạy). `limit` tuỳ chọn; mặc định trả toàn bộ vòng.
]]
function Log.History(limit)
	local history = Log.history
	local count = #history
	local wanted = count
	if type(limit) == "number" and limit >= 0 and limit < count then
		wanted = limit
	end
	local copy = {}
	for index = count - wanted + 1, count do
		local entry = history[index]
		copy[#copy + 1] = { level = entry.level, text = entry.text, at = entry.at }
	end
	return copy
end

-- Xoá nhật ký trên giao diện (KHÔNG xoá log đã in ra Output).
function Log.ClearHistory()
	local removed = #Log.history
	Log.history = {}
	return removed
end

-- Đổi cỡ vòng lưu trữ. Giá trị sai thì giữ nguyên và trả về cỡ hiện tại.
function Log.SetHistorySize(size)
	if type(size) ~= "number" or size ~= size or size < 1 then
		warn(("[DER] Log.SetHistorySize bỏ qua giá trị không hợp lệ: %s"):format(tostring(size)))
		return Log.historySize
	end
	Log.historySize = math.floor(size)
	while #Log.history > Log.historySize do
		table.remove(Log.history, 1)
	end
	return Log.historySize
end

return Log
