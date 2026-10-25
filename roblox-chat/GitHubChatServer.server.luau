--!nonstrict
--[[
	GitHubChatServer.server.luau
	============================
	"Server" chat dùng MỘT TỆP TRÊN GITHUB làm nơi lưu tin nhắn chung.

	Cách hoạt động:
	  1. Người chơi mở chat, gõ  /<API key GitHub>   (vd:  /ghp_xxxxxxxxxxxx)
	     -> key KHÔNG hiện lên chat, chỉ gửi riêng lên server.
	  2. Server kiểm tra key, rồi:
	       • chưa có kho (repo) "roblox-chat-server" -> TỰ TẠO (công khai)
	       • chưa có tệp "chat.txt"                 -> TỰ TẠO
	       • đã có rồi                              -> BỎ QUA bước tạo
	     -> báo trong chat: "✔ Kết nối GitHub thành công ..."
	  3. Chat: tin được lọc bằng TextService rồi thêm dòng "Tên: tin" vào cuối chat.txt
	     (GitHub API, có kiểm tra sha nên KHÔNG mất tin khi nhiều người gửi cùng lúc).
	  4. Cứ 3 giây đọc link RAW của chat.txt một lần, dòng mới -> hiện lên chat.

	Cài đặt (Roblox Studio):
	  1. ServerScriptService > Insert Object > Script -> dán toàn bộ tệp này.
	  2. StarterPlayer > StarterPlayerScripts > LocalScript -> dán ChatMenu.client.luau.
	  3. Home > Game Settings > Security > bật "Allow HTTP Requests" (BẮT BUỘC).
	  4. Chỉ dùng MỘT server script (GitHub HOẶC notevn), không dùng cả hai.

	API key: GitHub > Settings > Developer settings > Personal access tokens
	  • Tokens (classic): tick quyền "public_repo"            -> key dạng ghp_...
	  • Fine-grained    : Repository access "All repositories",
	                      Administration + Contents: Read and write -> key dạng github_pat_...
	  Key chỉ được giữ trong bộ nhớ server, mất khi server tắt; không in ra Output.

	Muốn người ở server khác đọc được ngay cả khi chưa ai nhập key:
	  đặt CONFIG.RepoOwner = "tên tài khoản GitHub" (chủ kho).
]]

--==============================================================================
-- 1. CẤU HÌNH
--==============================================================================

local CONFIG = {
	RepoOwner = "", -- "" = tài khoản của API key nhập đầu tiên; điền tên để đọc ngay khi mở server
	RepoName = "roblox-chat-server",
	FilePath = "chat.txt",
	Branch = "main", -- chỉ dùng khi điền RepoOwner (trước khi có key); có key thì lấy nhánh mặc định của kho
	RepoPrivate = false, -- PHẢI công khai thì link raw mới đọc được không cần key

	PollInterval = 3, -- giây giữa 2 lần đọc link raw
	CacheBust = true, -- thêm "?t=..." để tránh bản cũ trong bộ nhớ đệm của raw.githubusercontent.com
	MaxFileLines = 100, -- chỉ giữ N dòng cuối trong chat.txt
	HistoryOnJoin = 20, -- người mới vào thấy N tin gần nhất
	NameField = "Name", -- "Name" (username) hoặc "DisplayName"
	RequireKeyToChat = true, -- true: phải nhập API key mới chat được
	ClearOnShutdown = false, -- true: xoá hết chat.txt khi server tắt (cần ít nhất 1 key)

	MaxMessageLength = 200,
	SpamLimit = 6,
	SpamWindow = 8,

	ApiBase = "https://api.github.com",
	RawBase = "https://raw.githubusercontent.com",
	RemoteName = "CustomChatRemote",
	Debug = false, -- true: in chi tiết request (KHÔNG in key) ra Output
}

local TEXT = {
	NeedKey = "Nhập API key GitHub để chat: gõ  /<API key>  (vd: /ghp_xxxx). Key không hiện lên chat.",
	Checking = "Đang kiểm tra API key GitHub...",
	KeyOk = "✔ Kết nối GitHub thành công (@%s). Kho: %s/%s, tệp: %s. Giờ bạn có thể chat!",
	Created = "Đã tạo mới: %s.",
	KeyBad = "✖ API key sai hoặc đã hết hạn.",
	KeyNoCreate = "✖ API key không có quyền tạo kho. Classic: tick \"public_repo\". Fine-grained: Administration + Contents (Read and write).",
	KeyNoWrite = "✖ API key không có quyền ghi vào kho %s/%s.",
	RepoMissing = "✖ Không tìm thấy kho %s/%s (hoặc key không có quyền xem).",
	GitHubError = "✖ Lỗi GitHub: %s",
	HttpDisabled = "Server chưa bật HTTP: Game Settings > Security > bật \"Allow HTTP Requests\".",
	ReadFailed = "Không đọc được chat.txt trên GitHub (%s). Đang thử lại...",
	WriteFailed = "Không gửi được tin lên GitHub (%s).",
	Connected = "Đang đọc chat chung từ GitHub %s/%s mỗi %d giây.",
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
		print("[GitHubChat]", ...)
	end
end

--==============================================================================
-- 3. XỬ LÝ VĂN BẢN + BASE64 (thuần, dễ kiểm thử)
--==============================================================================

local Text = {}

function Text.trim(s: string): string
	return (string.gsub(s, "^%s+", ""):gsub("%s+$", ""))
end

function Text.oneLine(s: string): string
	s = string.gsub(s, "[\r\n\t]+", " ")
	return Text.trim(s)
end

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
-- (xử lý được: thêm dòng ở cuối, cắt bớt dòng đầu, tệp bị xoá rồi viết lại,
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

-- Nhận dạng API key GitHub
function Text.isGitHubToken(s: string): boolean
	return string.match(s, "^gh[pousr]_[%w_]+$") ~= nil or string.match(s, "^github_pat_[%w_]+$") ~= nil
end

local B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
local B64_INDEX = {}
for i = 1, 64 do
	B64_INDEX[string.byte(B64, i)] = i - 1
end

function Text.base64Encode(data: string): string
	local out = table.create(math.ceil(#data / 3))
	for i = 1, #data, 3 do
		local a, b, c = string.byte(data, i, i + 2)
		local n = a * 65536 + (b or 0) * 256 + (c or 0)
		local c1 = bit32.extract(n, 18, 6)
		local c2 = bit32.extract(n, 12, 6)
		local c3 = bit32.extract(n, 6, 6)
		local c4 = bit32.extract(n, 0, 6)
		table.insert(
			out,
			string.sub(B64, c1 + 1, c1 + 1)
				.. string.sub(B64, c2 + 1, c2 + 1)
				.. (b and string.sub(B64, c3 + 1, c3 + 1) or "=")
				.. (c and string.sub(B64, c4 + 1, c4 + 1) or "=")
		)
	end
	return table.concat(out)
end

-- GitHub trả base64 có xuống dòng mỗi 60 ký tự -> bỏ ký tự lạ trước khi giải
function Text.base64Decode(data: string): string
	local out = {}
	local n, bits = 0, 0
	for i = 1, #data do
		local v = B64_INDEX[string.byte(data, i)]
		if v then
			n = n * 64 + v
			bits += 6
			if bits >= 8 then
				bits -= 8
				table.insert(out, string.char(bit32.extract(n, bits, 8)))
				n = bit32.band(n, 2 ^ bits - 1)
			end
		end
	end
	return table.concat(out)
end

--==============================================================================
-- 4. GITHUB API
--==============================================================================

local GitHub = {}

local function httpErrorText(err): string
	local s = tostring(err)
	if string.find(s, "not enabled", 1, true) then
		return "HTTP_DISABLED"
	end
	return s
end

local function encodePath(path: string): string
	return (string.gsub(path, "[^%w%-_%.~/]", function(c)
		return string.format("%%%02X", string.byte(c))
	end))
end

-- Gọi GitHub REST API. Trả (status, data). status = 0 khi không gửi được (lỗi kèm ở data).
function GitHub.request(method: string, path: string, token: string, body: any?): (number, any)
	local headers = {
		["Authorization"] = "Bearer " .. token,
		["Accept"] = "application/vnd.github+json",
		["X-GitHub-Api-Version"] = "2022-11-28",
	}
	local req = { Url = CONFIG.ApiBase .. path, Method = method, Headers = headers }
	if body ~= nil then
		headers["Content-Type"] = "application/json"
		req.Body = HttpService:JSONEncode(body)
	end
	log(method, path)
	local ok, res = pcall(function()
		return HttpService:RequestAsync(req)
	end)
	if not ok then
		return 0, httpErrorText(res)
	end
	log("->", res.StatusCode)
	local data = nil
	if type(res.Body) == "string" and res.Body ~= "" then
		local okJson, decoded = pcall(function()
			return HttpService:JSONDecode(res.Body)
		end)
		data = okJson and decoded or res.Body
	end
	return res.StatusCode, data
end

local function ghMessage(status: number, data): string
	if status == 0 then
		return tostring(data)
	end
	local msg = type(data) == "table" and data.message or nil
	return "HTTP " .. status .. (msg and (" " .. tostring(msg)) or "")
end

local function contentsPath(owner: string, repoName: string): string
	return "/repos/" .. owner .. "/" .. repoName .. "/contents/" .. encodePath(CONFIG.FilePath)
end

-- Đọc tệp qua API (luôn mới nhất, kèm sha để ghi an toàn)
function GitHub.getFile(token: string, repo): (boolean, any, string?)
	local status, data = GitHub.request("GET", contentsPath(repo.owner, repo.name) .. "?ref=" .. repo.branch, token)
	if status == 200 and type(data) == "table" and type(data.sha) == "string" then
		return true, Text.base64Decode(data.content or ""), data.sha
	end
	if status == 404 then
		return false, "NOT_FOUND"
	end
	return false, ghMessage(status, data)
end

-- Ghi tệp (sha = nil khi tạo mới). Trả (true) / (false, "CONFLICT" | lỗi)
function GitHub.putFile(token: string, repo, content: string, sha: string?, message: string): (boolean, string?)
	local body = { message = message, content = Text.base64Encode(content), branch = repo.branch }
	if sha then
		body.sha = sha
	end
	local status, data = GitHub.request("PUT", contentsPath(repo.owner, repo.name), token, body)
	if status == 200 or status == 201 then
		return true
	end
	if status == 409 or (status == 422 and sha ~= nil) then
		return false, "CONFLICT" -- tệp vừa bị người khác sửa -> đọc lại rồi thử lại
	end
	return false, ghMessage(status, data)
end

-- Kiểm tra key, tạo kho/tệp nếu chưa có. Trả (true, info) / (false, thông báo lỗi)
function GitHub.setup(token: string, preferredOwner: string?): (boolean, any)
	local status, user = GitHub.request("GET", "/user", token)
	if status == 401 then
		return false, TEXT.KeyBad
	end
	if status ~= 200 or type(user) ~= "table" or type(user.login) ~= "string" then
		if status == 0 and user == "HTTP_DISABLED" then
			return false, "HTTP_DISABLED"
		end
		return false, string.format(TEXT.GitHubError, ghMessage(status, user))
	end
	local login = user.login
	local owner = (preferredOwner and preferredOwner ~= "") and preferredOwner or login
	local created = {}

	-- Kho (repo)
	local branch
	local rs, repoData = GitHub.request("GET", "/repos/" .. owner .. "/" .. CONFIG.RepoName, token)
	if rs == 404 then
		if string.lower(owner) ~= string.lower(login) then
			return false, string.format(TEXT.RepoMissing, owner, CONFIG.RepoName)
		end
		local cs, newRepo = GitHub.request("POST", "/user/repos", token, {
			name = CONFIG.RepoName,
			description = "Chat Roblox (tạo tự động bởi GitHubChatServer)",
			private = CONFIG.RepoPrivate,
			auto_init = true,
		})
		if cs == 201 and type(newRepo) == "table" then
			branch = newRepo.default_branch or "main"
			table.insert(created, "kho " .. owner .. "/" .. CONFIG.RepoName)
		elseif cs == 422 then
			-- vừa có người tạo cùng lúc -> đọc lại
			rs, repoData = GitHub.request("GET", "/repos/" .. owner .. "/" .. CONFIG.RepoName, token)
			if rs ~= 200 then
				return false, string.format(TEXT.GitHubError, ghMessage(rs, repoData))
			end
			branch = repoData.default_branch or "main"
		elseif cs == 403 or cs == 404 then
			return false, TEXT.KeyNoCreate
		else
			return false, string.format(TEXT.GitHubError, ghMessage(cs, newRepo))
		end
	elseif rs == 200 and type(repoData) == "table" then
		branch = repoData.default_branch or "main"
		local perms = repoData.permissions
		if type(perms) == "table" and perms.push == false then
			return false, string.format(TEXT.KeyNoWrite, owner, CONFIG.RepoName)
		end
	else
		return false, string.format(TEXT.GitHubError, ghMessage(rs, repoData))
	end

	local repo = { owner = owner, name = CONFIG.RepoName, branch = branch }

	-- Tệp chat (kho vừa tạo có thể cần vài giây mới sẵn sàng -> thử lại)
	for attempt = 1, 4 do
		local ok, err = GitHub.getFile(token, repo)
		if ok then
			break
		end
		if err == "NOT_FOUND" then
			local okPut, putErr = GitHub.putFile(token, repo, "", nil, "Tạo tệp chat")
			if okPut then
				table.insert(created, "tệp " .. CONFIG.FilePath)
				break
			end
			if putErr == "CONFLICT" then
				break -- người khác vừa tạo
			end
			if attempt == 4 then
				if string.find(putErr or "", "403", 1, true) or string.find(putErr or "", "404", 1, true) then
					return false, string.format(TEXT.KeyNoWrite, owner, CONFIG.RepoName)
				end
				return false, string.format(TEXT.GitHubError, putErr)
			end
		elseif attempt == 4 then
			return false, string.format(TEXT.GitHubError, err)
		end
		task.wait(1.5)
	end

	return true, { login = login, repo = repo, created = created }
end

function GitHub.rawUrl(repo): string
	local url = CONFIG.RawBase .. "/" .. repo.owner .. "/" .. repo.name .. "/" .. repo.branch .. "/" .. encodePath(CONFIG.FilePath)
	if CONFIG.CacheBust then
		url ..= "?t=" .. tostring(os.time()) .. tostring(math.random(100, 999))
	end
	return url
end

function GitHub.readRaw(repo): (boolean, string)
	local ok, body = pcall(function()
		return HttpService:GetAsync(GitHub.rawUrl(repo), true)
	end)
	if not ok then
		return false, httpErrorText(body)
	end
	return true, body
end

--==============================================================================
-- 5. LỌC TIN (TextService)
--==============================================================================

local function filterFrom(fromUserId: number, text: string): string?
	local ok, result = pcall(function()
		return TextService:FilterStringAsync(text, fromUserId, Enum.TextFilterContext.PublicChat)
	end)
	if not ok or not result then
		warn("[GitHubChat] lọc thất bại:", result)
		return nil
	end
	local ok2, filtered = pcall(function()
		return result:GetNonChatStringForBroadcastAsync()
	end)
	return ok2 and filtered or nil
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

local history = {} -- { packet = ... } hoặc { line = "dòng thô" }

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
-- 7. ĐỒNG BỘ VỚI chat.txt
--==============================================================================

local repo = nil -- { owner, name, branch } — kho đang dùng cho cả server
if CONFIG.RepoOwner ~= "" then
	repo = { owner = CONFIG.RepoOwner, name = CONFIG.RepoName, branch = CONFIG.Branch }
end
local keys = {} -- [Player] = { token, login }  (chỉ trong bộ nhớ)
local anyToken: string? = nil -- key hợp lệ gần nhất (dùng khi xoá lúc tắt server)

local lastLines = nil
local recentOwn = {}
local writeQueue = {} -- { line, token, tries }
local busy = false
local closing = false
local lastError = nil
local httpWarned = false

local function withLock(fn, ...)
	while busy do
		task.wait(0.05)
	end
	busy = true
	local ok, err = pcall(fn, ...)
	busy = false
	if not ok then
		warn("[GitHubChat] lỗi:", err)
	end
end

local function markOwn(line: string)
	local e = recentOwn[line]
	if e then
		e.count += 1
		e.expires = os.clock() + 400
	else
		-- raw.githubusercontent.com có thể giữ bản cũ tới ~5 phút
		recentOwn[line] = { count = 1, expires = os.clock() + 400 }
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
			warn("[GitHubChat] " .. TEXT.HttpDisabled)
			systemTo(nil, TEXT.HttpDisabled)
		end
		return
	end
	local key = kind .. err
	if lastError ~= key then
		lastError = key
		local msg = string.format(kind == "read" and TEXT.ReadFailed or TEXT.WriteFailed, err)
		warn("[GitHubChat] " .. msg)
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
	local senderName = name or "github"
	return {
		kind = "chat",
		sender = { name = senderName, displayName = senderName, userId = 0, external = true },
		text = filtered,
	}
end

local function ingest(body: string)
	local lines = Text.splitLines(body)
	if lastLines == nil then
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

local function pollOnce()
	if not repo then
		return
	end
	local ok, body = GitHub.readRaw(repo)
	if ok then
		lastError = nil
		ingest(body)
	elseif string.find(body, "404", 1, true) then
		reportError("read", "chưa có " .. CONFIG.FilePath .. " (nhập API key để tự tạo)")
	else
		reportError("read", body)
	end
end

local function requeue(pending)
	for i = #pending, 1, -1 do
		local item = pending[i]
		item.tries += 1
		if item.tries < 3 then
			table.insert(writeQueue, 1, item)
		end
	end
end

-- Ghi các dòng chờ: lấy bản mới nhất qua API (kèm sha) -> thêm cuối -> PUT.
-- sha không khớp (người khác vừa ghi) -> đọc lại và thử lại, nên không mất tin.
local function flushWrites()
	if #writeQueue == 0 or not repo then
		return
	end
	-- gom các dòng liên tiếp dùng cùng một key vào 1 commit
	local token = writeQueue[1].token
	local pending = {}
	while writeQueue[1] and writeQueue[1].token == token do
		table.insert(pending, table.remove(writeQueue, 1))
	end

	for _ = 1, 4 do
		local ok, content, sha = GitHub.getFile(token, repo)
		if not ok then
			reportError("write", content == "NOT_FOUND" and ("chưa có " .. CONFIG.FilePath) or content)
			requeue(pending)
			return
		end
		ingest(content) -- tin người khác vừa gửi cũng được hiện luôn
		local newContent = table.clone(lastLines)
		for _, item in pending do
			table.insert(newContent, item.line)
		end
		while #newContent > CONFIG.MaxFileLines do
			table.remove(newContent, 1)
		end
		local text = #newContent > 0 and (table.concat(newContent, "\n") .. "\n") or ""
		local message = "chat: " .. string.sub(string.match(pending[1].line, "^[^:]*") or "?", 1, 40)
		local saved, err = GitHub.putFile(token, repo, text, sha, message)
		if saved then
			lastError = nil
			lastLines = newContent
			for _, item in pending do
				markOwn(item.line)
			end
			return
		end
		if err ~= "CONFLICT" then
			reportError("write", err or "?")
			requeue(pending)
			return
		end
		task.wait(0.3)
	end
	reportError("write", "quá nhiều người ghi cùng lúc")
	requeue(pending)
end

local function queueLine(line: string, token: string)
	table.insert(writeQueue, { line = line, token = token, tries = 0 })
	task.spawn(withLock, flushWrites)
end

--==============================================================================
-- 8. NHẬN TIN TỪ NGƯỜI CHƠI
--==============================================================================

local spamLog = {}

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

local function handleKey(player: Player, token: string)
	token = Text.trim(token)
	if not Text.isGitHubToken(token) then
		systemTo(player, TEXT.KeyBad)
		return
	end
	systemTo(player, TEXT.Checking)
	local ok, info = GitHub.setup(token, repo and repo.owner or CONFIG.RepoOwner)
	if not ok then
		if info == "HTTP_DISABLED" then
			reportError("read", "HTTP_DISABLED")
			systemTo(player, TEXT.HttpDisabled)
		else
			systemTo(player, info)
		end
		return
	end
	keys[player] = { token = token, login = info.login }
	anyToken = token
	local isNewRepo = repo == nil or repo.owner ~= info.repo.owner or repo.branch ~= info.repo.branch
	repo = info.repo
	if isNewRepo then
		lastLines = nil -- đọc lại từ đầu kho mới
	end
	if #info.created > 0 then
		systemTo(player, string.format(TEXT.Created, table.concat(info.created, ", ")))
	end
	systemTo(player, string.format(TEXT.KeyOk, info.login, repo.owner, repo.name, CONFIG.FilePath))
	print(string.format("[GitHubChat] %s đã kết nối GitHub @%s -> %s/%s", player.Name, info.login, repo.owner, repo.name))
	task.spawn(withLock, pollOnce)
end

local function handlePayload(player: Player, payload)
	if payload.kind == "hello" then
		local waitUntil = os.clock() + 10
		while repo and lastLines == nil and not httpWarned and os.clock() < waitUntil do
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
		elseif repo then
			systemTo(player, string.format(TEXT.Connected, repo.owner, repo.name, CONFIG.PollInterval))
		end
		if not keys[player] then
			systemTo(player, TEXT.NeedKey)
		end
		return
	end

	if payload.kind == "apikey" then
		if type(payload.key) == "string" and #payload.key <= 255 then
			handleKey(player, payload.key)
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
	-- Phòng trường hợp ai đó dán key như tin nhắn thường: KHÔNG BAO GIỜ phát / ghi key
	if Text.isGitHubToken(text) or string.find(text, "gh[pousr]_%w%w%w%w%w%w%w%w") or string.find(text, "github_pat_", 1, true) then
		systemTo(player, "Tin nhắn có dạng API key nên đã bị chặn. Muốn nhập key hãy gõ  /<API key>.")
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

	local keyInfo = keys[player]
	if CONFIG.RequireKeyToChat and not keyInfo then
		systemTo(player, TEXT.NeedKey)
		return
	end
	local filtered = filterFrom(player.UserId, text)
	if not filtered then
		systemTo(player, TEXT.FilterFailed)
		return
	end
	broadcast({ kind = "chat", sender = playerInfo(player), text = filtered })
	if keyInfo and repo then
		local name = CONFIG.NameField == "DisplayName" and player.DisplayName or player.Name
		queueLine(Text.formatLine(name, filtered), keyInfo.token)
	end
end

local inbox = {}

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
			warn("[GitHubChat] lỗi xử lý tin:", err)
		end
	end
	inbox[player] = nil
end)

Players.PlayerRemoving:Connect(function(player)
	spamLog[player] = nil
	keys[player] = nil -- quên key khi người chơi rời đi (tin đang chờ vẫn được gửi)
end)

--==============================================================================
-- 9. VÒNG LẶP ĐỌC RAW MỖI 3 GIÂY + (TUỲ CHỌN) XOÁ KHI TẮT
--==============================================================================

task.spawn(function()
	while not closing do
		withLock(#writeQueue > 0 and flushWrites or pollOnce)
		task.wait(CONFIG.PollInterval)
	end
end)

game:BindToClose(function()
	closing = true
	if not (CONFIG.ClearOnShutdown and anyToken and repo) then
		return
	end
	withLock(function()
		writeQueue = {}
		for _ = 1, 3 do
			local ok, _, sha = GitHub.getFile(anyToken, repo)
			if not ok then
				return
			end
			local saved, err = GitHub.putFile(anyToken, repo, "", sha, "Xoá chat khi tắt server")
			if saved or err ~= "CONFLICT" then
				return
			end
		end
	end)
end)

_G.GitHubChatInternals = { Text = Text, GitHub = GitHub, CONFIG = CONFIG }
