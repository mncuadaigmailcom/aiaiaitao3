--!nonstrict
--[[
	NotevnChatServer.server.luau
	============================
	"Server" chat dùng một ghi chú notevn.com làm nơi lưu tin nhắn chung.

	  • ĐỌC : https://notevn.com/raw/qdzjmz94   (văn bản thô, mỗi dòng "tên: tin nhắn")
	          -> cứ 3 giây đọc 1 lần, dòng mới được gửi tới mọi người chơi.
	  • GHI : https://notevn.com/cbyurm9g       (trang sửa ghi chú)
	          -> khi người chơi chat, thêm dòng "Tên: tin nhắn" vào cuối ghi chú.
	  • THOÁT: khi server tắt (game:BindToClose — kể cả bấm Stop trong Studio)
	          -> xoá sạch nội dung ghi chú.

	Cài đặt (Roblox Studio):
	  1. ServerScriptService > Insert Object > Script -> dán toàn bộ tệp này.
	  2. StarterPlayer > StarterPlayerScripts > LocalScript -> dán ChatMenu.client.luau
	     (giao diện tự nhận RemoteEvent "CustomChatRemote" do script này tạo).
	  3. Home > Game Settings > Security > bật "Allow HTTP Requests"  (BẮT BUỘC).
	  4. Bấm Play.

	Cách ghi vào notevn (lấy từ mã nguồn trang notevn: /assets/js/v19.min.js):
	  POST https://notevn.com/ajax.php   (application/x-www-form-urlencoded, kiểu jQuery)
	    action=getnote&file=/cbyurm9g                         -> thông tin các tab
	    action=save&file=/cbyurm9g&share_url=qdzjmz94&type=
	        &data[0][id]=...&data[0][name]=...&data[0][data]={"ops":[{"insert":"..."}]}&...
	  Nội dung tab là Quill Delta (JSON). Trang /raw/... trả về chữ thuần.

	Lưu ý:
	  • Mọi tin (của người chơi lẫn tin đọc từ ghi chú) đều được lọc bằng TextService
	    trước khi hiện — bắt buộc theo luật Roblox.
	  • Ghi chú là công khai: ai có link đều đọc/sửa được.
	  • Thì thầm (/w) chỉ đi trong cùng server Roblox, KHÔNG ghi vào ghi chú.
	  • Nhiều server cùng ghi một lúc có thể làm mất tin (notevn không có lệnh
	    "thêm vào cuối", chỉ có "lưu đè" cả ghi chú) — đã giảm tối đa bằng cách
	    đọc lại ngay trước khi lưu.
]]

--==============================================================================
-- 1. CẤU HÌNH
--==============================================================================

local CONFIG = {
	BaseUrl = "https://notevn.com",
	NoteFile = "/cbyurm9g", -- đường dẫn trang sửa ghi chú (https://notevn.com/cbyurm9g)
	ShareKey = "qdzjmz94", -- mã chia sẻ / raw (https://notevn.com/raw/qdzjmz94)
	ReadUrl = "https://notevn.com/raw/qdzjmz94",
	CacheBust = true, -- thêm "?t=..." khi đọc để tránh nhận bản cũ trong bộ nhớ đệm

	PollInterval = 3, -- giây giữa 2 lần đọc ghi chú
	ClearOnShutdown = true, -- xoá hết tin trong ghi chú khi server tắt
	MaxNoteLines = 80, -- chỉ giữ N dòng cuối khi ghi (ghi chú không phình mãi)
	HistoryOnJoin = 20, -- người mới vào thấy N tin gần nhất
	NameField = "Name", -- tên ghi vào ghi chú: "Name" (username) hoặc "DisplayName"

	MaxMessageLength = 200,
	SpamLimit = 6, -- tối đa 6 tin ...
	SpamWindow = 8, -- ... trong 8 giây (mỗi người chơi)

	RemoteName = "CustomChatRemote",
	Debug = false, -- true: in chi tiết request/response ra Output
}

local TEXT = {
	Connected = "Đã kết nối chat chung (notevn). Tin nhắn được đồng bộ mỗi %d giây.",
	HttpDisabled = "Server chưa bật HTTP: vào Game Settings > Security > bật \"Allow HTTP Requests\".",
	ReadFailed = "Không đọc được ghi chú notevn (%s). Đang thử lại...",
	WriteFailed = "Không ghi được tin nhắn lên notevn (%s).",
	Locked = "Ghi chú notevn đang bị khoá mật khẩu / riêng tư — không thể ghi.",
	FilterFailed = "Không lọc được tin nhắn, vui lòng thử lại.",
	TooFast = "Bạn gửi tin quá nhanh. Vui lòng đợi một chút rồi thử lại.",
	PlayerNotFound = "Không tìm thấy người chơi \"%s\" trong server này.",
}

--==============================================================================
-- 2. DỊCH VỤ
--==============================================================================

local Players = game:GetService("Players")
local HttpService = game:GetService("HttpService")
local TextService = game:GetService("TextService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local remote = ReplicatedStorage:FindFirstChild(CONFIG.RemoteName)
if not remote then
	remote = Instance.new("RemoteEvent")
	remote.Name = CONFIG.RemoteName
	remote.Parent = ReplicatedStorage
end

local function log(...)
	if CONFIG.Debug then
		print("[NotevnChat]", ...)
	end
end

--==============================================================================
-- 3. XỬ LÝ VĂN BẢN (thuần, không gọi Roblox — dễ kiểm thử)
--==============================================================================

local Text = {}

function Text.trim(s: string): string
	return (string.gsub(s, "^%s+", ""):gsub("%s+$", ""))
end

-- Một tin = một dòng: bỏ xuống dòng, gộp khoảng trắng đầu/cuối
function Text.oneLine(s: string): string
	s = string.gsub(s, "[\r\n\t]+", " ")
	return Text.trim(s)
end

-- Tách nội dung ghi chú thành danh sách dòng (bỏ dòng trống)
function Text.splitLines(body: string?): { string }
	local out = {}
	if type(body) ~= "string" then
		return out
	end
	body = string.gsub(body, "\r\n?", "\n")
	for line in string.gmatch(body .. "\n", "(.-)\n") do
		line = Text.trim(line)
		if line ~= "" then
			table.insert(out, line)
		end
	end
	return out
end

-- "tên: tin nhắn" -> name, text   (dòng không có "tên:" -> nil, cả dòng)
function Text.parseLine(line: string): (string?, string)
	local name, msg = string.match(line, "^([^:]+):%s*(.*)$")
	if name then
		name = Text.trim(name)
		-- tên hợp lệ: 1..40 ký tự, không phải đường link (http://...)
		if name ~= "" and #name <= 40 and string.sub(msg, 1, 2) ~= "//" then
			return name, Text.trim(msg)
		end
	end
	return nil, line
end

function Text.formatLine(name: string, msg: string): string
	return Text.oneLine(name) .. ": " .. Text.oneLine(msg)
end

-- So sánh nội dung cũ / mới -> các dòng mới thêm.
-- Tìm k lớn nhất sao cho k dòng CUỐI của bản cũ == k dòng ĐẦU của bản mới
-- (xử lý được: thêm dòng ở cuối, cắt bớt dòng đầu, ghi chú bị xoá rồi viết lại,
--  /raw trả về bản cũ hơn lần đọc trước).
function Text.newLines(old: { string }, new: { string }): { string }
	-- Bản mới nằm trọn trong bản cũ (bị cắt bớt / /raw trả bản cũ hơn) -> không có gì mới
	if #new > 0 and #new <= #old then
		for start = #old - #new + 1, 1, -1 do
			local same = true
			for i = 1, #new do
				if old[start + i - 1] ~= new[i] then
					same = false
					break
				end
			end
			if same then
				return {}
			end
		end
	end
	local maxK = math.min(#old, #new)
	for k = maxK, 0, -1 do
		local same = true
		local offset = #old - k
		for i = 1, k do
			if old[offset + i] ~= new[i] then
				same = false
				break
			end
		end
		if same then
			local out = {}
			for i = k + 1, #new do
				table.insert(out, new[i])
			end
			return out
		end
	end
	return table.clone(new)
end

-- Cắt đúng một object JSON {...} bắt đầu tại vị trí `start` (bỏ qua { } nằm trong chuỗi)
function Text.matchJsonObject(s: string, start: number): string?
	local depth, inStr, i, n = 0, false, start, #s
	while i <= n do
		local c = string.byte(s, i)
		if inStr then
			if c == 92 then -- \
				i += 1
			elseif c == 34 then -- "
				inStr = false
			end
		elseif c == 34 then
			inStr = true
		elseif c == 123 then -- {
			depth += 1
		elseif c == 125 then -- }
			depth -= 1
			if depth == 0 then
				return string.sub(s, start, i)
			end
		end
		i += 1
	end
	return nil
end

-- Lấy NỘI DUNG CHỮ của ghi chú từ phản hồi notevn. Hỗ trợ:
--   • trang /raw/...       : HTML, nội dung nằm trong quill.setContents({"ops":[...]}, 'silent')
--   • /get_shared/...      : JSON Quill Delta {"ops":[{"insert":"..."}]}
--   • chữ thuần
-- Trả nil nếu là HTML lạ (không tìm thấy nội dung) — để KHÔNG BAO GIỜ ghi rác HTML vào ghi chú.
function Text.extractNoteText(body: string?, decode: (string) -> any): string?
	if type(body) ~= "string" then
		return nil
	end
	local trimmed = Text.trim(body)
	local json = nil
	if string.sub(trimmed, 1, 1) == "{" then
		json = trimmed
	else
		local at = string.find(body, "setContents(", 1, true)
		if at then
			local start = string.find(body, "{", at, true)
			json = start and Text.matchJsonObject(body, start)
		elseif string.find(string.lower(string.sub(trimmed, 1, 200)), "<html", 1, true)
			or string.find(string.lower(string.sub(trimmed, 1, 200)), "<!doctype", 1, true)
		then
			return nil
		else
			return body
		end
	end
	if not json then
		return nil
	end
	local ok, delta = pcall(decode, json)
	if not ok or type(delta) ~= "table" or type(delta.ops) ~= "table" then
		return nil
	end
	local parts = {}
	for _, op in delta.ops do
		if type(op) == "table" and type(op.insert) == "string" then
			table.insert(parts, op.insert)
		end
	end
	return table.concat(parts)
end

-- Mã hoá form kiểu jQuery.param:  data[0][id]=1&data[0][name]=x&action=save
function Text.formEncode(params: { [string]: any }, encode: (string) -> string): string
	local parts = {}
	local function isArray(t)
		local n = 0
		for _ in t do
			n += 1
		end
		return n == #t
	end
	local function add(key, value)
		local s
		if value == nil then
			s = ""
		elseif type(value) == "boolean" then
			s = value and "true" or "false"
		else
			s = tostring(value)
		end
		table.insert(parts, encode(key) .. "=" .. encode(s))
	end
	local function build(prefix, value)
		if type(value) == "table" then
			if isArray(value) then
				for i, v in ipairs(value) do
					build(prefix .. "[" .. (type(v) == "table" and tostring(i - 1) or "") .. "]", v)
				end
			else
				local keys = {}
				for k in value do
					table.insert(keys, tostring(k))
				end
				table.sort(keys)
				for _, k in keys do
					build(prefix .. "[" .. k .. "]", value[k])
				end
			end
		else
			add(prefix, value)
		end
	end
	local keys = {}
	for k in params do
		table.insert(keys, k)
	end
	table.sort(keys)
	for _, k in keys do
		build(k, params[k])
	end
	return table.concat(parts, "&")
end

--==============================================================================
-- 4. NOTEVN CLIENT (HTTP)
--==============================================================================

local Notevn = {}
local noteMeta = nil -- thông tin tab (id, name, order_index, ...) lấy từ action=getnote

local function urlEncode(s: string): string
	return HttpService:UrlEncode(s)
end

local function httpErrorText(err): string
	local s = tostring(err)
	if string.find(s, "not enabled", 1, true) or string.find(s, "Http requests are not enabled", 1, true) then
		return "HTTP_DISABLED"
	end
	return s
end

local function jsonDecode(s: string)
	return HttpService:JSONDecode(s)
end

local function httpGet(url: string): (boolean, string)
	if CONFIG.CacheBust then
		url ..= (string.find(url, "?", 1, true) and "&" or "?") .. "t=" .. tostring(os.time()) .. tostring(math.random(100, 999))
	end
	local ok, body = pcall(function()
		return HttpService:GetAsync(url, true)
	end)
	if not ok then
		return false, httpErrorText(body)
	end
	return true, body
end

local readWarned = false

-- Đọc ghi chú -> (true, "nội dung chữ") hoặc (false, lỗi)
function Notevn.read(): (boolean, string)
	local ok, body = httpGet(CONFIG.ReadUrl)
	if not ok then
		return false, body
	end
	local text = Text.extractNoteText(body, jsonDecode)
	if text then
		return true, text
	end
	-- Trang /raw đổi định dạng -> thử đường JSON /get_shared/<mã> (trang chia sẻ của notevn dùng)
	if not readWarned then
		readWarned = true
		warn("[NotevnChat] không tách được nội dung từ " .. CONFIG.ReadUrl .. " — thử /get_shared. Đầu phản hồi: " .. string.sub(body, 1, 200))
	end
	local ok2, body2 = httpGet(CONFIG.BaseUrl .. "/get_shared/" .. CONFIG.ShareKey)
	if ok2 then
		local text2 = Text.extractNoteText(body2, jsonDecode)
		if text2 then
			return true, text2
		end
	end
	return false, "không đọc được nội dung ghi chú (định dạng lạ)"
end

-- Cookie phiên (PHPSESSID...) lấy khi mở trang ghi chú, gửi kèm ajax giống trình duyệt
local sessionCookie: string? = nil
local COOKIE_ATTR = { expires = true, path = true, domain = true, ["max-age"] = true, samesite = true, secure = true, httponly = true }

function Text.parseSetCookie(header: string?): string?
	if type(header) ~= "string" or header == "" then
		return nil
	end
	local pairs_ = {}
	for name, value in string.gmatch(header, "([%w_%-%.]+)=([^;,]*)") do
		if not COOKIE_ATTR[string.lower(name)] then
			table.insert(pairs_, name .. "=" .. value)
		end
	end
	return #pairs_ > 0 and table.concat(pairs_, "; ") or nil
end

local function ensureSession()
	if sessionCookie ~= nil then
		return
	end
	sessionCookie = ""
	local ok, res = pcall(function()
		return HttpService:RequestAsync({ Url = CONFIG.BaseUrl .. CONFIG.NoteFile, Method = "GET" })
	end)
	if ok and type(res) == "table" and type(res.Headers) == "table" then
		for k, v in res.Headers do
			if string.lower(tostring(k)) == "set-cookie" then
				sessionCookie = Text.parseSetCookie(v) or ""
			end
		end
	end
	log("cookie phiên:", sessionCookie)
end

local function ajax(params): (boolean, any)
	ensureSession()
	local body = Text.formEncode(params, urlEncode)
	log("POST ajax.php", body)
	local function send(extraHeaders: boolean)
		local headers = { ["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8" }
		if extraHeaders then
			headers["X-Requested-With"] = "XMLHttpRequest" -- giống jQuery trên trang notevn
			headers["Referer"] = CONFIG.BaseUrl .. CONFIG.NoteFile
			if sessionCookie and sessionCookie ~= "" then
				headers["Cookie"] = sessionCookie
			end
		end
		return pcall(function()
			return HttpService:RequestAsync({ Url = CONFIG.BaseUrl .. "/ajax.php", Method = "POST", Headers = headers, Body = body })
		end)
	end
	local ok, res = send(true)
	if not ok and string.find(string.lower(tostring(res)), "header", 1, true) then
		ok, res = send(false) -- Roblox không cho đặt header nào đó -> gửi lại chỉ với Content-Type
	end
	if not ok then
		return false, httpErrorText(res)
	end
	log("->", res.StatusCode, res.Body)
	local snippet = string.sub(tostring(res.Body), 1, 150)
	if not res.Success then
		warn("[NotevnChat] ajax.php " .. tostring(params.action) .. " -> HTTP " .. tostring(res.StatusCode) .. ": " .. snippet)
		return false, "HTTP " .. tostring(res.StatusCode)
	end
	local okJson, data = pcall(function()
		return HttpService:JSONDecode(res.Body)
	end)
	if not okJson or type(data) ~= "table" then
		warn("[NotevnChat] ajax.php " .. tostring(params.action) .. " trả về không phải JSON: " .. snippet)
		return false, "phản hồi không phải JSON"
	end
	return true, data
end

local META_SKIP = { data = true, modifiedData = true, modifiedName = true, empty = true, modified = true, tabid = true, dummyId = true }

function Notevn.fetchMeta(): (boolean, string?)
	local ok, res = ajax({ action = "getnote", file = CONFIG.NoteFile })
	if not ok then
		return false, res
	end
	if res.code == 403 or (res.isLocked and not res.authorized) then
		return false, "LOCKED"
	end
	local notes = res.data and res.data.notes
	if type(notes) ~= "table" or #notes == 0 then
		return false, "không có tab nào"
	end
	local chosen = nil
	for _, n in ipairs(notes) do
		local visible = n.visibility == nil or n.visibility == true or n.visibility == "true"
		if type(n) == "table" and not n.deleted and visible then
			chosen = n
			break
		end
	end
	chosen = chosen or notes[1]
	if chosen.type == "private" then
		return false, "LOCKED"
	end
	local meta = {}
	for k, v in chosen do
		if not META_SKIP[k] then
			meta[k] = v
		end
	end
	noteMeta = meta
	return true
end

-- Lưu đè toàn bộ ghi chú bằng các dòng `lines` (danh sách rỗng = xoá hết)
function Notevn.save(lines: { string }): (boolean, string?)
	if not noteMeta then
		local ok, err = Notevn.fetchMeta()
		if not ok then
			return false, err
		end
	end
	local note = table.clone(noteMeta)
	local text = table.concat(lines, "\n")
	note.data = HttpService:JSONEncode({ ops = { { insert = text .. "\n" } } })
	if note.id == nil then
		note.dummyId = 0 -- tab mới chưa có id (giống trang notevn)
	end
	local ok, res = ajax({
		action = "save",
		file = CONFIG.NoteFile,
		share_url = CONFIG.ShareKey,
		type = "", -- trang notevn gửi giá trị rỗng khi không bật chế độ riêng tư
		data = { note },
	})
	if not ok then
		noteMeta = nil -- lần sau lấy lại thông tin tab
		return false, res
	end
	if type(res.code) == "number" and res.code ~= 1 and res.code ~= 200 then
		noteMeta = nil
		return false, tostring(res.message or ("code " .. res.code))
	end
	if type(res.notes) == "table" and type(res.notes[1]) == "table" and noteMeta then
		noteMeta.id = res.notes[1].id or noteMeta.id
		noteMeta.bookmark = res.notes[1].bookmark or noteMeta.bookmark
	end
	return true
end

--==============================================================================
-- 5. LỌC TIN (TextService)
--==============================================================================

local function filterFrom(fromUserId: number, text: string): string?
	local ok, result = pcall(function()
		return TextService:FilterStringAsync(text, fromUserId, Enum.TextFilterContext.PublicChat)
	end)
	if not ok or not result then
		warn("[NotevnChat] lọc thất bại:", result)
		return nil
	end
	local ok2, filtered = pcall(function()
		return result:GetNonChatStringForBroadcastAsync()
	end)
	if not ok2 then
		warn("[NotevnChat] lọc thất bại:", filtered)
		return nil
	end
	return filtered
end

local function filterPrivate(from: Player, to: Player, text: string): string?
	local ok, result = pcall(function()
		return TextService:FilterStringAsync(text, from.UserId, Enum.TextFilterContext.PrivateChat)
	end)
	if not ok or not result then
		return nil
	end
	local ok2, filtered = pcall(function()
		return result:GetChatForUserAsync(to.UserId)
	end)
	return ok2 and filtered or nil
end

-- Tin đến từ ghi chú không có người gửi trên Roblox -> lọc thay mặt người nhận
-- (hoặc 1 người chơi bất kỳ trong server khi phát cho tất cả)
local function filterExternal(text: string, userId: number?): string?
	if not userId then
		local list = Players:GetPlayers()
		if #list == 0 then
			return nil
		end
		userId = list[1].UserId
	end
	return filterFrom(userId, text)
end

--==============================================================================
-- 6. PHÁT TIN TỚI NGƯỜI CHƠI
--==============================================================================

local history = {} -- tin gần nhất cho người mới vào: { packet = ... } hoặc { line = "dòng thô" }

local function remember(item)
	table.insert(history, item)
	while #history > CONFIG.HistoryOnJoin do
		table.remove(history, 1)
	end
end

local function broadcast(packet)
	remember({ packet = packet })
	remote:FireAllClients(packet)
end

local function systemTo(player: Player?, text: string)
	local packet = { kind = "system", text = text }
	if player then
		remote:FireClient(player, packet)
	else
		remote:FireAllClients(packet)
	end
end

local function playerInfo(p: Player)
	return { name = p.Name, displayName = p.DisplayName, userId = p.UserId }
end

--==============================================================================
-- 7. ĐỒNG BỘ VỚI GHI CHÚ
--==============================================================================

local lastLines = nil -- nội dung ghi chú lần đọc gần nhất (nil = chưa đọc)
local recentOwn = {} -- dòng server này vừa ghi -> { count, expires } (tránh hiện 2 lần)
local writeQueue = {} -- dòng chờ ghi
local busy = false
local closing = false
local lastError = nil
local httpWarned = false

local function withLock(fn)
	while busy do
		task.wait(0.05)
	end
	busy = true
	local ok, err = pcall(fn)
	busy = false
	if not ok then
		warn("[NotevnChat] lỗi:", err)
	end
end

local function markOwn(line: string)
	local e = recentOwn[line]
	if e then
		e.count += 1
		e.expires = os.clock() + 60
	else
		recentOwn[line] = { count = 1, expires = os.clock() + 60 }
	end
end

local function consumeOwn(line: string): boolean
	local e = recentOwn[line]
	if e and e.expires > os.clock() then
		e.count -= 1
		if e.count <= 0 then
			recentOwn[line] = nil
		end
		return true
	end
	recentOwn[line] = nil
	return false
end

local function reportError(kind: string, err: string)
	if err == "HTTP_DISABLED" then
		if not httpWarned then
			httpWarned = true
			warn("[NotevnChat] " .. TEXT.HttpDisabled)
			systemTo(nil, TEXT.HttpDisabled)
		end
		return
	end
	local key = kind .. err
	if lastError ~= key then
		lastError = key
		local msg = err == "LOCKED" and TEXT.Locked or string.format(kind == "read" and TEXT.ReadFailed or TEXT.WriteFailed, err)
		warn("[NotevnChat] " .. msg)
		systemTo(nil, msg)
	end
end

local function externalPacket(line: string, userId: number?)
	local name, msg = Text.parseLine(line)
	if msg == "" then
		return nil
	end
	local filtered = filterExternal(msg, userId)
	if not filtered then
		return nil
	end
	local senderName = name or "notevn"
	return {
		kind = "chat",
		sender = { name = senderName, displayName = senderName, userId = 0, external = true },
		text = filtered,
	}
end

-- Nhận nội dung ghi chú mới -> phát các dòng mới
local function ingest(body: string)
	local lines = Text.splitLines(body)
	if lastLines == nil then
		-- Lần đọc đầu: coi là lịch sử (lọc khi gửi cho từng người), không phát thành tin mới
		lastLines = lines
		local start = math.max(1, #lines - CONFIG.HistoryOnJoin + 1)
		for i = start, #lines do
			remember({ line = lines[i] })
		end
		return
	end
	local fresh = Text.newLines(lastLines, lines)
	lastLines = lines
	for _, line in fresh do
		if not consumeOwn(line) then
			local packet = externalPacket(line)
			if packet then
				broadcast(packet)
			end
		end
	end
end

local verify = nil -- { line, polls }: kiểm tra tin vừa lưu có thật sự nằm trong ghi chú
local firstReadLogged, firstWriteLogged = false, false

local function checkVerify(body: string)
	if not verify then
		return
	end
	if string.find(body, verify.line, 1, true) then
		verify = nil
		if not firstWriteLogged then
			firstWriteLogged = true
			print("[NotevnChat] ✔ ghi lên notevn thành công (F5 trang " .. CONFIG.BaseUrl .. CONFIG.NoteFile .. " để thấy)")
		end
	else
		verify.polls += 1
		if verify.polls >= 2 then
			verify = nil
			reportError("write", "notevn trả lời OK nhưng đọc lại không thấy tin — có thể bị chặn")
		end
	end
end

local function pollOnce()
	local ok, body = Notevn.read()
	if ok then
		lastError = nil
		if not firstReadLogged then
			firstReadLogged = true
			print(string.format("[NotevnChat] ✔ đọc ghi chú OK (%d dòng)", #Text.splitLines(body)))
		end
		ingest(body)
		checkVerify(body)
	else
		reportError("read", body)
	end
end

-- Trả các dòng ghi lỗi về hàng đợi để thử lại ở vòng sau (tối đa 3 lần mỗi dòng)
local function requeue(pending)
	for i = #pending, 1, -1 do
		local item = pending[i]
		item.tries += 1
		if item.tries < 3 then
			table.insert(writeQueue, 1, item)
		end
	end
end

-- Ghi các dòng đang chờ: đọc mới nhất -> thêm vào cuối -> lưu đè
local function flushWrites()
	if #writeQueue == 0 then
		return
	end
	local pending = writeQueue
	writeQueue = {}

	local ok, body = Notevn.read()
	if ok then
		ingest(body)
	else
		reportError("read", body)
		if lastLines == nil then
			-- chưa từng đọc được -> không dám lưu đè (có thể xoá mất nội dung)
			requeue(pending)
			return
		end
	end

	local before = lastLines
	local newContent = table.clone(before)
	for _, item in pending do
		table.insert(newContent, item.line)
	end
	while #newContent > CONFIG.MaxNoteLines do
		table.remove(newContent, 1)
	end

	local saved, err = Notevn.save(newContent)
	if saved then
		lastError = nil
		lastLines = newContent
		for _, item in pending do
			markOwn(item.line) -- phòng khi /raw còn trả bản cũ ở lần đọc kế tiếp
		end
		verify = { line = pending[#pending].line, polls = 0 }
	else
		reportError("write", err or "?")
		requeue(pending)
	end
end

local function queueLine(line: string)
	table.insert(writeQueue, { line = line, tries = 0 })
	task.spawn(withLock, flushWrites)
end

--==============================================================================
-- 8. NHẬN TIN TỪ NGƯỜI CHƠI
--==============================================================================

local spamLog = {} -- [Player] = { thời điểm gửi }

local function allowSend(player: Player): boolean
	local now = os.clock()
	local list = spamLog[player] or {}
	spamLog[player] = list
	while list[1] and now - list[1] > CONFIG.SpamWindow do
		table.remove(list, 1)
	end
	if #list >= CONFIG.SpamLimit then
		return false
	end
	table.insert(list, now)
	return true
end

local function findPlayer(name: string): Player?
	local lower = string.lower(name)
	for _, p in Players:GetPlayers() do
		if string.lower(p.Name) == lower or string.lower(p.DisplayName) == lower then
			return p
		end
	end
	return nil
end

local function handlePayload(player: Player, payload)

	if payload.kind == "hello" then
		-- Người vào lúc server vừa mở: đợi lần đọc ghi chú đầu tiên (tối đa 10 giây)
		local waitUntil = os.clock() + 10
		while lastLines == nil and not httpWarned and os.clock() < waitUntil do
			task.wait(0.1)
		end
		for _, item in table.clone(history) do
			local packet = item.packet or externalPacket(item.line, player.UserId)
			if packet then
				local copy = table.clone(packet)
				copy.history = true
				remote:FireClient(player, copy)
			end
		end
		if httpWarned then
			systemTo(player, TEXT.HttpDisabled)
		else
			systemTo(player, string.format(TEXT.Connected, CONFIG.PollInterval))
		end
		return
	end

	if type(payload.text) ~= "string" then
		return
	end
	local text = Text.oneLine(payload.text)
	if text == "" then
		return
	end
	if utf8.len(text) and utf8.len(text) > CONFIG.MaxMessageLength then
		text = string.sub(text, 1, utf8.offset(text, CONFIG.MaxMessageLength + 1) - 1)
	end
	if not allowSend(player) then
		systemTo(player, TEXT.TooFast)
		return
	end

	if payload.kind == "whisper" then
		local target = type(payload.target) == "string" and findPlayer(payload.target)
		if not target then
			systemTo(player, string.format(TEXT.PlayerNotFound, tostring(payload.target)))
			return
		end
		local filtered = filterPrivate(player, target, text)
		if not filtered then
			systemTo(player, TEXT.FilterFailed)
			return
		end
		local packet = { kind = "whisper", sender = playerInfo(player), target = playerInfo(target), text = filtered }
		remote:FireClient(player, packet)
		if target ~= player then
			remote:FireClient(target, packet)
		end
		return
	end

	-- Chat chung
	local filtered = filterFrom(player.UserId, text)
	if not filtered then
		systemTo(player, TEXT.FilterFailed)
		return
	end
	broadcast({ kind = "chat", sender = playerInfo(player), text = filtered })
	local name = CONFIG.NameField == "DisplayName" and player.DisplayName or player.Name
	queueLine(Text.formatLine(name, filtered))
end

-- Xử lý tin của từng người chơi LẦN LƯỢT (lọc TextService mất thời gian khác nhau,
-- xử lý song song có thể làm tin hiện sai thứ tự)
local inbox = {} -- [Player] = { payload, ... }

remote.OnServerEvent:Connect(function(player: Player, payload)
	if type(payload) ~= "table" then
		return
	end
	local queue = inbox[player]
	if queue then
		if #queue < 20 then
			table.insert(queue, payload)
		end
		return
	end
	queue = { payload }
	inbox[player] = queue
	while #queue > 0 do
		local item = table.remove(queue, 1)
		local ok, err = pcall(handlePayload, player, item)
		if not ok then
			warn("[NotevnChat] lỗi xử lý tin:", err)
		end
	end
	inbox[player] = nil
end)

Players.PlayerRemoving:Connect(function(player)
	spamLog[player] = nil
end)

--==============================================================================
-- 9. VÒNG LẶP ĐỌC + XOÁ KHI THOÁT
--==============================================================================

task.spawn(function()
	while not closing do
		-- còn tin chờ ghi (lần trước lỗi) -> ghi lại (đã gồm bước đọc); không thì chỉ đọc
		withLock(#writeQueue > 0 and flushWrites or pollOnce)
		task.wait(CONFIG.PollInterval)
	end
end)

game:BindToClose(function()
	closing = true
	if not CONFIG.ClearOnShutdown then
		return
	end
	withLock(function()
		writeQueue = {}
		local ok, err = Notevn.save({})
		if ok then
			lastLines = {}
			log("đã xoá ghi chú khi tắt server")
		else
			warn("[NotevnChat] không xoá được ghi chú khi thoát:", err)
		end
	end)
end)

-- Cho phép script kiểm thử truy cập phần xử lý thuần
_G.NotevnChatInternals = { Text = Text, Notevn = Notevn, CONFIG = CONFIG }
