-- Server-side additions: ReplicatedStorage, RemoteEvent, HttpService (+ fake notevn), TextService, BindToClose
_G = {}
warn = function(...) print("WARN", ...) end
do
local T = MOCK
local INST = T.INST
local Players = game:GetService("Players")
local lp = Players.LocalPlayer

-- WaitForChild(name, timeout) -------------------------------------------------
-- (re-implemented through funcs table is not possible since methods are internal; patch via ReplicatedStorage only)
local RS = game:GetService("ReplicatedStorage")
local rsFind = RS.FindFirstChild
INST[RS].custom.WaitForChild = function(self, name, timeout)
	local t0 = T.now
	while true do
		local c = self:FindFirstChild(name)
		if c then return c end
		if timeout and T.now - t0 >= timeout then return nil end
		if not timeout then error("WaitForChild would hang: " .. name) end
		task.wait(0.1)
	end
end

-- second (remote) player -------------------------------------------------------
local friend = T.newInstance("Player")
friend.Name = "FriendPlayer"
T.set(friend, "DisplayName", "Friend")
T.set(friend, "UserId", 2)
friend.Parent = Players
T.friend = friend
T.funcs["Players.GetPlayers"] = function()
	local out = {}
	for _, c in Players:GetChildren() do if c:IsA("Player") then table.insert(out, c) end end
	return out
end

-- JSON -------------------------------------------------------------------------
local JSON = {}
local function esc(s)
	return (s:gsub('[%c"\\]', function(c)
		local map = { ['"'] = '\\"', ["\\"] = "\\\\", ["\n"] = "\\n", ["\r"] = "\\r", ["\t"] = "\\t" }
		return map[c] or string.format("\\u%04x", string.byte(c))
	end))
end
function JSON.encode(v)
	local t = type(v)
	if t == "nil" then return "null" end
	if t == "boolean" then return tostring(v) end
	if t == "number" then return (v == math.floor(v) and string.format("%d", v)) or tostring(v) end
	if t == "string" then return '"' .. esc(v) .. '"' end
	if t == "table" then
		local n = 0
		for _ in v do n += 1 end
		if n == #v and (n > 0 or getmetatable(v) == "array") then
			local parts = {}
			for _, x in ipairs(v) do table.insert(parts, JSON.encode(x)) end
			return "[" .. table.concat(parts, ",") .. "]"
		end
		local keys = {}
		for k in v do assert(type(k) == "string", "JSONEncode: mixed keys"); table.insert(keys, k) end
		table.sort(keys)
		local parts = {}
		for _, k in keys do table.insert(parts, '"' .. esc(k) .. '":' .. JSON.encode(v[k])) end
		return "{" .. table.concat(parts, ",") .. "}"
	end
	error("JSONEncode: cannot encode " .. t)
end
function JSON.decode(s)
	local i = 1
	local function ws() i = s:find("[^ \t\r\n]", i) or #s + 1 end
	local value
	local function str()
		i += 1
		local out = {}
		while true do
			local c = s:sub(i, i)
			if c == "" then error("JSONDecode: unterminated string") end
			if c == '"' then i += 1 break end
			if c == "\\" then
				local n = s:sub(i + 1, i + 1)
				if n == "u" then
					table.insert(out, utf8.char(tonumber(s:sub(i + 2, i + 5), 16))); i += 6
				else
					local map = { n = "\n", r = "\r", t = "\t", b = "\b", f = "\f", ["/"] = "/", ["\\"] = "\\", ['"'] = '"' }
					table.insert(out, map[n] or n); i += 2
				end
			else
				table.insert(out, c); i += 1
			end
		end
		return table.concat(out)
	end
	function value()
		ws()
		local c = s:sub(i, i)
		if c == "{" then
			i += 1; local obj = {}; ws()
			if s:sub(i, i) == "}" then i += 1 return obj end
			while true do
				ws(); local k = str(); ws(); assert(s:sub(i, i) == ":", "JSONDecode: ':' expected"); i += 1
				obj[k] = value(); ws()
				local d = s:sub(i, i); i += 1
				if d == "}" then return obj end
				assert(d == ",", "JSONDecode: ',' expected")
			end
		elseif c == "[" then
			i += 1; local arr = {}; ws()
			if s:sub(i, i) == "]" then i += 1 return arr end
			while true do
				table.insert(arr, value()); ws()
				local d = s:sub(i, i); i += 1
				if d == "]" then return arr end
				assert(d == ",", "JSONDecode: ',' expected")
			end
		elseif c == '"' then return str()
		elseif s:sub(i, i + 3) == "true" then i += 4 return true
		elseif s:sub(i, i + 4) == "false" then i += 5 return false
		elseif s:sub(i, i + 3) == "null" then i += 4 return nil
		else
			local num = s:match("^-?%d+%.?%d*[eE]?[-+]?%d*", i)
			if not num or num == "" then error("Can't parse JSON") end
			i += #num
			return tonumber(num)
		end
	end
	local ok, r = pcall(value)
	if not ok then error("Can't parse JSON: " .. tostring(r)) end
	return r
end
T.JSON = JSON

local function urlDecode(s)
	s = s:gsub("+", " ")
	return (s:gsub("%%(%x%x)", function(h) return string.char(tonumber(h, 16)) end))
end
local function parseForm(body)
	local out = {}
	for pair in (body .. "&"):gmatch("(.-)&") do
		if pair ~= "" then
			local k, v = pair:match("^([^=]*)=(.*)$")
			assert(k, "bad form pair " .. pair)
			out[urlDecode(k)] = urlDecode(v)
		end
	end
	return out
end
T.parseForm = parseForm

-- fake notevn ---------------------------------------------------------------------
local NV = {
	text = "", -- plain text (raw view)
	meta = { id = 123, name = "Ghi chú", order_index = 1, visibility = "true", type = "public", bookmark = "cbyurm9g" },
	locked = false,
	gets = {}, posts = {}, saves = {},
	failSave = false, staleNext = false, prevText = "", latency = 0.2,
}
T.notevn = NV

local HS = game:GetService("HttpService")
T.httpEnabled = true
T.funcs["HttpService.JSONEncode"] = function(_, v) return JSON.encode(v) end
T.funcs["HttpService.JSONDecode"] = function(_, s) return JSON.decode(s) end
T.funcs["HttpService.UrlEncode"] = function(_, s)
	assert(type(s) == "string", "UrlEncode expects string")
	return (s:gsub("[^%w%-_%.~]", function(c) return string.format("%%%02X", string.byte(c)) end))
end
T.funcs["HttpService.GetAsync"] = function(_, url, nocache)
	assert(type(url) == "string", "GetAsync url must be string")
	if not T.httpEnabled then error("Http requests are not enabled. Enable via game settings", 2) end
	task.wait(NV.latency)
	table.insert(NV.gets, { url = url, t = T.now, nocache = nocache })
	local text = NV.text
	if NV.staleNext then NV.staleNext = false; text = NV.prevText end
	-- PHP json_encode(JSON_UNESCAPED_UNICODE): escapes "/" as "\/"
	local delta = (JSON.encode({ ops = { { insert = text } } }):gsub("/", "\\/"))
	if url:match("^https://notevn%.com/get_shared/qdzjmz94") then return delta end
	assert(url:match("^https://notevn%.com/raw/qdzjmz94"), "unexpected GET " .. url)
	if NV.rawFormat == "broken" then return "<!DOCTYPE html><html><body>maintenance</body></html>" end
	-- same shape as the real page (single line HTML, content inside quill.setContents)
	return '<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><meta name="description"\tcontent="Lưu trữ văn bản: ẩn danh"><title>notevn / raw / qdzjmz94 | Ghi chú</title><style>* {\tmargin: 0;}</style></head><body><pre><div class="editable" spellcheck="false"></div></pre><script src="//cdnjs.cloudflare.com/ajax/libs/quill/1.3.6/quill.min.js"></script><script>var quill = new Quill(\'.editable\', {\tmodules: {\ttoolbar: false\t},\ttheme: \'snow\'\t});\tquill.disable();\tquill.setContents(' .. delta .. ", 'silent');\tvar editor = document.querySelector('.ql-editor');\teditor.textContent = quill.getText();</script></body></html>"
end
T.funcs["HttpService.RequestAsync"] = function(_, req)
	assert(type(req) == "table" and type(req.Url) == "string", "RequestAsync expects table")
	if not T.httpEnabled then error("Http requests are not enabled. Enable via game settings", 2) end
	for k in req do assert(k == "Url" or k == "Method" or k == "Headers" or k == "Body" or k == "Compress", "RequestAsync bad field " .. k) end
	task.wait(NV.latency)
	if req.Method == "GET" or req.Method == nil then
		assert(req.Url == "https://notevn.com/cbyurm9g", "unexpected GET " .. req.Url)
		NV.pageGets = (NV.pageGets or 0) + 1
		return { Success = true, StatusCode = 200, StatusMessage = "OK", Body = "<html></html>",
			Headers = { ["set-cookie"] = "PHPSESSID=abc123; path=/; HttpOnly, cf_bm=xyz; expires=Fri, 31 Dec 2027 23:59:59 GMT; path=/" } }
	end
	NV.lastCookie = req.Headers and req.Headers.Cookie
	assert(req.Url == "https://notevn.com/ajax.php", "unexpected POST " .. req.Url)
	assert(req.Method == "POST")
	assert(req.Headers["Content-Type"]:find("application/x-www-form-urlencoded", 1, true))
	local f = parseForm(req.Body)
	table.insert(NV.posts, f)
	local function reply(code, tbl) return { Success = code < 300, StatusCode = code, StatusMessage = "", Headers = {}, Body = JSON.encode(tbl) } end
	if f.action == "getnote" then
		assert(f.file == "/cbyurm9g", "getnote file " .. tostring(f.file))
		if NV.locked then return reply(200, { code = 403, isLocked = true, authorized = false, data = { notes = { NV.meta } } }) end
		local note = table.clone(NV.meta); note.data = nil
		return reply(200, { code = 1, isLocked = false, authorized = false, data = { notes = { note }, emptyNote = { name = "Tab mới" } } })
	elseif f.action == "save" then
		table.insert(NV.saves, f)
		if NV.failSave then return reply(500, { message = "error" }) end
		assert(f.file == "/cbyurm9g", "save file")
		assert(f.share_url == "qdzjmz94", "save share_url")
		assert(f["data[0][id]"] == tostring(NV.meta.id), "save id " .. tostring(f["data[0][id]"]))
		assert(f["data[0][name]"] == NV.meta.name, "save name")
		assert(f["data[0][order_index]"] == "1" and f["data[0][visibility]"] == "true", "save other fields")
		local delta = JSON.decode(f["data[0][data]"])
		assert(type(delta.ops) == "table", "delta.ops")
		local parts = {}
		for _, op in delta.ops do table.insert(parts, op.insert) end
		local txt = table.concat(parts)
		assert(txt:sub(-1) == "\n", "quill doc must end with newline")
		NV.prevText = NV.text
		NV.text = txt
		return reply(200, { code = 1, message = "Đã lưu", notes = { { id = NV.meta.id, bookmark = NV.meta.bookmark } } })
	end
	return reply(400, { code = 0, message = "bad action" })
end

-- TextService ------------------------------------------------------------------------
local filterText = {}
T.filterCalls = 0
T.funcs["TextService.FilterStringAsync"] = function(_, text, fromUserId, ctx)
	assert(type(text) == "string" and type(fromUserId) == "number", "FilterStringAsync args")
	assert(ctx == nil or (typeof(ctx) == "EnumItem" and ctx.EnumType == "TextFilterContext"), "ctx enum")
	T.filterCalls += 1
	task.wait(0.01)
	local r = T.newInstance("TextFilterResult")
	filterText[r] = (text:gsub("badword", "#######"))
	return r
end
T.funcs["TextFilterResult.GetNonChatStringForBroadcastAsync"] = function(self) return filterText[self] end
T.funcs["TextFilterResult.GetChatForUserAsync"] = function(self, uid) assert(type(uid) == "number") return filterText[self] end

-- BindToClose --------------------------------------------------------------------------
T.closeHandlers = {}
T.funcs["DataModel.BindToClose"] = function(_, fn) table.insert(T.closeHandlers, fn) end

-- RemoteEvent ----------------------------------------------------------------------------
local function deep(v)
	if type(v) ~= "table" then return v end
	local o = {}
	for k, x in v do o[k] = deep(x) end
	return o
end
T.friendInbox = {}
T.funcs["RemoteEvent.FireServer"] = function(self, ...)
	self.OnServerEvent:Fire(lp, deep(...))
end
T.funcs["RemoteEvent.FireClient"] = function(self, player, packet)
	assert(INST[player] and player:IsA("Player"), "FireClient needs Player")
	if player == lp then self.OnClientEvent:Fire(deep(packet)) else table.insert(T.friendInbox, deep(packet)) end
end
T.funcs["RemoteEvent.FireAllClients"] = function(self, packet)
	self.OnClientEvent:Fire(deep(packet))
	table.insert(T.friendInbox, deep(packet))
end
end
