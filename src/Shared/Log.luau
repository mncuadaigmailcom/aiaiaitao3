--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  EVT-003, RAM-003, RES-005 
	===== RALO.METHODS:END ===== --]]

--[[
	Util/Log.luau
	Log có mức độ, có scope, có bộ đệm vòng để UI/harness đọc lại.
	Ghi ra: (1) print/warn thật của runtime, (2) Log.Entries để truy xuất.

	Không phụ thuộc Roblox API -> chạy được trên Lua 5.3 (fengari).
]]

local Log = {}

Log.Level = "info"                 -- debug | info | warn | error | silent
Log.MaxEntries = 400
Log.Entries = {}
Log.OnEntry = nil                  -- function(entry) — UI/harness hook

local ORDER = { debug = 1, info = 2, warn = 3, error = 4, silent = 5 }

local function allowed(level: string): boolean
	return (ORDER[level] or 2) >= (ORDER[Log.Level] or 2)
end

function Log.Push(level: string, scope: string, message: string)
	local entry = {
		level = level,
		scope = scope,
		message = message,
		time = os.clock(),
	}
	table.insert(Log.Entries, entry)
	if #Log.Entries > Log.MaxEntries then
		table.remove(Log.Entries, 1)
	end
	if Log.OnEntry then
		Log.OnEntry(entry)
	end
	return entry
end

local function emit(level: string, scope: string, parts: { any })
	if not allowed(level) then
		return
	end
	local message = table.concat(parts, " ")
	Log.Push(level, scope, message)

	local prefix = ("[%s] %s"):format(level:upper(), scope)
	if level == "warn" or level == "error" then
		warn(prefix, message)
	else
		print(prefix, message)
	end
end

function Log.Debug(scope: string, ...: any) emit("debug", scope, { ... }) end
function Log.Info(scope: string, ...: any)  emit("info",  scope, { ... }) end
function Log.Warn(scope: string, ...: any)  emit("warn",  scope, { ... }) end
function Log.Error(scope: string, ...: any) emit("error", scope, { ... }) end

-- Định dạng bảng before/after thành các dòng căn cột — dùng cho Output và UI.
function Log.FormatRows(rows: { { string, string, string, string } }): { string }
	local widths = { 0, 0, 0, 0 }
	for _, row in rows do
		for i = 1, 4 do
			widths[i] = math.max(widths[i], #tostring(row[i] or ""))
		end
	end
	local out = {}
	for _, row in rows do
		local line = ""
		for i = 1, 4 do
			local cell = tostring(row[i] or "")
			line ..= cell .. string.rep(" ", widths[i] - #cell + 2)
		end
		out[#out + 1] = line
	end
	return out
end

function Log.Clear()
	table.clear(Log.Entries)
end

return Log
