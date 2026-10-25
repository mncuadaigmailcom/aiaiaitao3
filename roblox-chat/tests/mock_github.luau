-- Fake GitHub (REST API + raw.githubusercontent.com) for GitHubChatServer tests.
-- Loaded after mock.luau + mock_server.luau (reuses JSON + HttpService JSON funcs).
do
local T = MOCK
local JSON = T.JSON

-- independent base64 (different implementation from the server, to cross-check)
local ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
local function b64enc(s)
	local bits = {}
	for i = 1, #s do
		local b = string.byte(s, i)
		for k = 7, 0, -1 do table.insert(bits, (b // 2 ^ k) % 2) end
	end
	while #bits % 6 ~= 0 do table.insert(bits, 0) end
	local out = {}
	for i = 1, #bits, 6 do
		local v = 0
		for k = 0, 5 do v = v * 2 + bits[i + k] end
		table.insert(out, ALPHA:sub(v + 1, v + 1))
	end
	while #out % 4 ~= 0 do table.insert(out, "=") end
	return table.concat(out)
end
local function b64dec(s)
	s = s:gsub("[^%w%+/]", "")
	local bits = {}
	for i = 1, #s do
		local v = ALPHA:find(s:sub(i, i), 1, true) - 1
		for k = 5, 0, -1 do table.insert(bits, (v // 2 ^ k) % 2) end
	end
	local out = {}
	for i = 1, #bits - 7, 8 do
		local v = 0
		for k = 0, 7 do v = v * 2 + bits[i + k] end
		table.insert(out, string.char(v))
	end
	return table.concat(out)
end
T.b64enc, T.b64dec = b64enc, b64dec

local G = {
	tokens = {
		ghp_validtoken1234567890 = { login = "chatowner", canCreate = true },
		ghp_friendtoken123456789 = { login = "chatowner", canCreate = true }, -- same account, second key
		ghp_nocreate1234567890ab = { login = "weakuser", canCreate = false },
		ghp_otheruser12345678901 = { login = "otheruser", canCreate = true },
	},
	repos = {}, -- ["owner/name"] = { default_branch, private, file = nil | { content, sha, history = {...} } }
	requests = {}, commits = {}, rawGets = {},
	conflictOnce = false, rawLag = false, latency = 0.15, shaSeq = 0,
}
T.github = G

local function newSha()
	G.shaSeq += 1
	return string.format("sha%04d", G.shaSeq)
end

function G.writeExternal(fullName, line)
	local r = G.repos[fullName]
	r.file.content ..= line .. "\n"
	r.file.sha = newSha()
	table.insert(r.file.history, r.file.content)
end

local function reply(code, tbl, extraHeaders)
	return { Success = code >= 200 and code < 300, StatusCode = code, StatusMessage = "", Headers = extraHeaders or {},
		Body = tbl and JSON.encode(tbl) or "" }
end

local baseRequest = T.funcs["HttpService.RequestAsync"]
T.funcs["HttpService.RequestAsync"] = function(self, req)
	if not req.Url:find("^https://api%.github%.com") then return baseRequest(self, req) end
	if not T.httpEnabled then error("Http requests are not enabled. Enable via game settings", 2) end
	for k in req do assert(k == "Url" or k == "Method" or k == "Headers" or k == "Body", "RequestAsync bad field " .. k) end
	assert(req.Headers.Accept == "application/vnd.github+json", "Accept header")
	assert(not req.Url:find("gh[pousr]_") and not req.Url:find("github_pat_"), "token leaked into URL")
	if req.Method == "GET" then assert(req.Body == nil, "GET must not have Body (Roblox rejects it)") end
	task.wait(G.latency)
	local auth = req.Headers.Authorization or ""
	local token = auth:match("^Bearer (.+)$")
	local user = token and G.tokens[token]
	local path = req.Url:sub(#"https://api.github.com" + 1)
	table.insert(G.requests, { method = req.Method, path = path, body = req.Body })
	if not user then return reply(401, { message = "Bad credentials" }) end
	local body = req.Body and JSON.decode(req.Body)

	if req.Method == "GET" and path == "/user" then
		return reply(200, { login = user.login, id = 42 })
	end
	if req.Method == "POST" and path == "/user/repos" then
		if not user.canCreate then return reply(403, { message = "Resource not accessible by personal access token" }) end
		local full = user.login .. "/" .. body.name
		if G.repos[full] then return reply(422, { message = "name already exists on this account" }) end
		G.repos[full] = { default_branch = "main", private = body.private, autoInit = body.auto_init, file = nil }
		G.lastCreate = body
		return reply(201, { full_name = full, default_branch = "main", private = body.private })
	end
	local owner, name, rest = path:match("^/repos/([^/]+)/([^/?]+)(.*)$")
	if owner then
		local full = owner .. "/" .. name
		local r = G.repos[full]
		if not r then return reply(404, { message = "Not Found" }) end
		local push = string.lower(user.login) == string.lower(owner)
		if rest == "" and req.Method == "GET" then
			return reply(200, { full_name = full, default_branch = r.default_branch, permissions = { push = push, pull = true } })
		end
		local fpath, query = rest:match("^/contents/([^?]+)%??(.*)$")
		if fpath then
			assert(fpath == "chat.txt", "file path " .. fpath)
			if req.Method == "GET" then
				assert(query == "ref=" .. r.default_branch, "ref query " .. query)
				if not r.file then return reply(404, { message = "Not Found" }) end
				-- GitHub wraps base64 every 60 chars
				local enc = b64enc(r.file.content):gsub(("."):rep(60), "%0\n")
				return reply(200, { sha = r.file.sha, encoding = "base64", content = enc })
			elseif req.Method == "PUT" then
				if not push then return reply(404, { message = "Not Found" }) end
				assert(req.Headers["Content-Type"] == "application/json", "PUT content-type")
				assert(type(body.message) == "string" and body.message ~= "", "commit message")
				assert(body.branch == r.default_branch, "branch")
				if G.conflictOnce and r.file then
					G.conflictOnce = false
					G.writeExternal(full, "otherserver: chen ngang")
					return reply(409, { message = "is at " .. r.file.sha .. " but expected " .. tostring(body.sha) })
				end
				if r.file then
					if body.sha == nil then return reply(422, { message = "\"sha\" wasn't supplied." }) end
					if body.sha ~= r.file.sha then return reply(409, { message = "does not match" }) end
				else
					if body.sha ~= nil then return reply(404, { message = "Not Found" }) end
				end
				local content = b64dec(body.content)
				r.file = r.file or { history = {} }
				r.file.content = content
				r.file.sha = newSha()
				table.insert(r.file.history, content)
				table.insert(G.commits, { message = body.message, content = content })
				return reply(r.file.sha and 200 or 201, { content = { sha = r.file.sha } })
			end
		end
	end
	return reply(404, { message = "Not Found (mock: " .. req.Method .. " " .. path .. ")" })
end

local baseGet = T.funcs["HttpService.GetAsync"]
T.funcs["HttpService.GetAsync"] = function(self, url, nocache)
	if not url:find("^https://raw%.githubusercontent%.com/") then return baseGet(self, url, nocache) end
	if not T.httpEnabled then error("Http requests are not enabled. Enable via game settings", 2) end
	task.wait(G.latency)
	table.insert(G.rawGets, { url = url, t = T.now })
	local owner, name, branch, fpath = url:match("^https://raw%.githubusercontent%.com/([^/]+)/([^/]+)/([^/]+)/([^?]+)")
	local r = G.repos[owner .. "/" .. name]
	if not r or not r.file or branch ~= r.default_branch or fpath ~= "chat.txt" then error("HTTP 404 (Not Found)", 2) end
	if G.rawLag and #r.file.history >= 2 then
		return r.file.history[#r.file.history - 1] -- CDN still serving the previous version
	end
	return r.file.content
end
end
