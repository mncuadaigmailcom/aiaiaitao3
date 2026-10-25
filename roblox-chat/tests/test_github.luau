do
local T = MOCK
local G = T.github
local pass, fail = 0, 0
local function check(name, cond, extra)
	if cond then pass += 1; print("  ok  " .. name) else fail += 1; print("  FAIL " .. name .. (extra and (" :: " .. tostring(extra)) or "")) end
end
local function count(hay, needle)
	local n, i = 0, 1
	while true do
		local a, b = string.find(hay, needle, i, true)
		if not a then return n end
		n += 1; i = b + 1
	end
end
local REPO = "chatowner/roblox-chat-server"
local KEY = "ghp_validtoken1234567890"

-- ---------- pure helpers ----------
local I = _G.GitHubChatInternals
local Text = I.Text
check("token: ghp_", Text.isGitHubToken("ghp_ABCdef123456"))
check("token: github_pat_", Text.isGitHubToken("github_pat_11ABC_def"))
check("token: not a token", not Text.isGitHubToken("ghp hello") and not Text.isGitHubToken("hello"))
local okB64 = true
for _, s in { "", "a", "ab", "abc", "xin chào 🎉\n", string.rep("dòng\n", 40) } do
	if Text.base64Encode(s) ~= T.b64enc(s) or Text.base64Decode(T.b64enc(s):gsub(("."):rep(60), "%0\n")) ~= s then okB64 = false end
end
check("base64 encode/decode (UTF-8, GitHub line wraps)", okB64)

-- ---------- UI helpers ----------
local Players = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")
T.run(1)
local gui = Players.LocalPlayer.PlayerGui.CustomChatMenu
local msgs = gui.ChatContainer.ChatWindow.Messages
local box = gui.ChatContainer.ChatInputBar.InputBox.TextContainer.TextBoxContainer.TextBox
local UIS = game:GetService("UserInputService")
local function lines()
	local list = {}
	for _, c in msgs:GetChildren() do if c:IsA("TextLabel") then table.insert(list, c) end end
	table.sort(list, function(a, b) return a.LayoutOrder < b.LayoutOrder end)
	local out = {}
	for _, l in list do table.insert(out, l.Text) end
	return table.concat(out, "\n")
end
local function has(p) return string.find(lines(), p, 1, true) ~= nil end
local function say(text) box:CaptureFocus(); box.Text = text; box:ReleaseFocus(true); T.run(0.1) end
local function fileText() local r = G.repos[REPO]; return r and r.file and r.file.content or "" end
local function friendGot(p) for _, pk in T.friendInbox do if type(pk.text) == "string" and pk.text:find(p, 1, true) then return true end end return false end

-- ---------- before any key ----------
check("RemoteEvent created", RS:FindFirstChild("CustomChatRemote") ~= nil)
check("no demo when server present", not has("DEMO"))
check("asks for API key on join", has("Nhập API key GitHub"))
T.run(6)
check("no raw polling before a repo is known", #G.rawGets == 0, #G.rawGets)
say("chào mọi người")
check("chat without key is blocked + hint", not has("Tester:</font> chào mọi người") and count(lines(), "Nhập API key GitHub") >= 2)

-- ---------- wrong key ----------
say("/ghp_wrongtoken999999")
T.run(1)
check("wrong key -> error message", has("API key sai"))
check("wrong key never shown in chat", not has("ghp_wrongtoken"))
box:CaptureFocus()
UIS.InputBegan:Fire({ UserInputType = Enum.UserInputType.Keyboard, KeyCode = Enum.KeyCode.Up }, true); T.run(0.05)
check("key not kept in ↑ history", not box.Text:find("ghp_", 1, true), box.Text)
box.Text = ""; box:ReleaseFocus(false); T.run(0.1)

-- ---------- valid key: create repo + file ----------
say("/" .. KEY)
check("sending notice shown", has("Đã gửi API key"))
T.run(5)
check("repo auto-created (public, auto_init)", G.repos[REPO] ~= nil and G.lastCreate and G.lastCreate.private == false and G.lastCreate.auto_init == true)
check("chat.txt auto-created", G.repos[REPO] and G.repos[REPO].file ~= nil)
check("'created' notice", has("Đã tạo mới: kho chatowner/roblox-chat-server, tệp chat.txt"), lines())
check("success notice in chat", has("✔ Kết nối GitHub thành công (@chatowner)"), lines())
check("valid key never shown in chat", not has(KEY))

-- ---------- polling raw every 3s ----------
local g0 = #G.rawGets
T.run(9)
check("polls raw every 3s (3 in 9s)", #G.rawGets - g0 == 3, #G.rawGets - g0)
check("raw url + cache bust", G.rawGets[#G.rawGets].url:find("^https://raw.githubusercontent.com/chatowner/roblox%-chat%-server/main/chat.txt%?t=") ~= nil, G.rawGets[#G.rawGets].url)

-- ---------- send ----------
say("xin chào GitHub")
check("own message shown immediately", count(lines(), "Tester:</font> xin chào GitHub") == 1)
T.run(1.5)
check("written to chat.txt", fileText() == "TestPlayer: xin chào GitHub\n", fileText())
check("commit message", G.commits[#G.commits].message == "chat: TestPlayer", G.commits[#G.commits].message)
check("friend in same server got it", friendGot("xin chào GitHub"))
T.run(7)
check("not duplicated by raw poll", count(lines(), "xin chào GitHub") == 1)

-- ---------- other server writes ----------
G.writeExternal(REPO, "PlayerOtherServer: alo alo")
T.run(3.5)
check("message from other server shown", has("PlayerOtherServer:</font> alo alo"), lines())

-- ---------- raw CDN serving old version ----------
say("tin thứ hai")
T.run(1.5)
G.rawLag = true
T.run(7)
check("stale raw: no duplicates / no re-show", count(lines(), "tin thứ hai") == 1 and count(lines(), "alo alo") == 1)
G.rawLag = false
G.writeExternal(REPO, "PlayerOtherServer: sau khi cache hết")
T.run(3.5)
check("new line after cache refresh shown", has("sau khi cache hết"))
check("own line not re-shown after cache refresh", count(lines(), "tin thứ hai") == 1, count(lines(), "tin thứ hai"))

-- ---------- conflict (someone writes between read and PUT) ----------
G.conflictOnce = true
say("gửi lúc đụng nhau")
T.run(3)
check("conflict: retried, both lines kept", fileText():find("otherserver: chen ngang", 1, true) ~= nil and fileText():find("TestPlayer: gửi lúc đụng nhau", 1, true) ~= nil, fileText())
T.run(4)
check("conflict: other line shown once", count(lines(), "chen ngang") == 1)
check("conflict: own line shown once", count(lines(), "gửi lúc đụng nhau") == 1)

-- ---------- second key for the same repo: skip creation ----------
local creates = 0
for _, r in G.requests do if r.method == "POST" then creates += 1 end end
RS.CustomChatRemote.OnServerEvent:Fire(T.friend, { kind = "apikey", key = "ghp_friendtoken123456789" })
T.run(3)
local creates2 = 0
for _, r in G.requests do if r.method == "POST" then creates2 += 1 end end
check("existing repo/file -> creation skipped", creates2 == creates and not friendGot("Đã tạo mới"))
check("friend gets success notice", friendGot("Kết nối GitHub thành công"))
RS.CustomChatRemote.OnServerEvent:Fire(T.friend, { kind = "chat", text = "mình là Friend" })
T.run(1.5)
check("friend's message written with friend's key", fileText():find("FriendPlayer: mình là Friend", 1, true) ~= nil)
check("friend's message shown to me", has("Friend:</font> mình là Friend"))

-- ---------- /key format ----------
say("/key " .. KEY)
T.run(2)
check("/key <token> format works", count(lines(), "Kết nối GitHub thành công") >= 2 and not has(KEY))

-- ---------- permission errors ----------
local ok1, msg1
task.spawn(function() ok1, msg1 = I.GitHub.setup("ghp_nocreate1234567890ab", nil) end); T.run(2)
check("no create permission -> clear message", ok1 == false and tostring(msg1):find("không có quyền tạo kho", 1, true) ~= nil, msg1)
local ok2, msg2
task.spawn(function() ok2, msg2 = I.GitHub.setup("ghp_otheruser12345678901", "chatowner") end); T.run(2)
check("no write permission -> clear message", ok2 == false and tostring(msg2):find("không có quyền ghi", 1, true) ~= nil, msg2)

-- ---------- safety: key typed as normal message ----------
local commitsBefore = #G.commits
say("key của mình là ghp_abcdefghijklmnop nhé")
T.run(1.5)
check("key-looking message blocked", has("dạng API key") and not has("ghp_abcdefghijklmnop") and #G.commits == commitsBefore)
local leaked = false
for _, c in G.commits do if c.content:find("ghp_", 1, true) or c.content:find("github_pat_", 1, true) then leaked = true end end
for _, p in T.friendInbox do if type(p.text) == "string" and p.text:find("ghp_", 1, true) then leaked = true end end
check("no key ever in file / friend's chat", not leaked)

-- ---------- filter / whisper / newline ----------
say("đây là badword")
T.run(1.5)
check("filtered in chat + file", has("đây là #######") and fileText():find("TestPlayer: đây là #######", 1, true) ~= nil and not fileText():find("badword", 1, true))
G.writeExternal(REPO, "hacker: badword <b>x</b>")
T.run(3.5)
check("external filtered + rich text escaped", has("hacker:</font> ####### &lt;b&gt;x&lt;/b&gt;"), lines())
local c0 = #G.commits
say("/w FriendPlayer bí mật")
T.run(1.5)
check("whisper not committed", #G.commits == c0 and not fileText():find("bí mật", 1, true))
gui.ChatContainer.ChatInputBar.InputBox.TextContainer.TargetChip.MouseButton1Click:Fire(); T.run(0.1)
RS.CustomChatRemote:FireServer({ kind = "chat", text = "a\nb" })
T.run(1.5)
check("newline flattened in file", fileText():find("TestPlayer: a b\n", 1, true) ~= nil)

-- ---------- trimming ----------
I.CONFIG.MaxFileLines = 5
for i = 1, 3 do say("trim " .. i); T.run(2) end
local n = 0
for _ in fileText():gmatch("[^\n]+") do n += 1 end
check("chat.txt trimmed to MaxFileLines", n <= 5, n)
T.run(7)
check("no duplicates after trimming", count(lines(), "trim 3") == 1)

-- ---------- GitHub down ----------
local savedTokens = G.tokens
G.tokens = {}
say("lúc GitHub lỗi")
T.run(2)
check("write error reported", has("Không gửi được tin lên GitHub"), lines())
G.tokens = savedTokens
T.run(7)
check("retried after recovery", fileText():find("TestPlayer: lúc GitHub lỗi", 1, true) ~= nil)
check("retried message not duplicated", count(lines(), "lúc GitHub lỗi") == 1)

-- ---------- leaving forgets key ----------
Players.PlayerRemoving:Fire(T.friend) -- friend leaves and rejoins
T.run(0.5)
RS.CustomChatRemote.OnServerEvent:Fire(T.friend, { kind = "chat", text = "không còn key" })
T.run(1.5)
check("key forgotten when player leaves", not fileText():find("không còn key", 1, true) and friendGot("Nhập API key GitHub"))

-- ---------- shutdown ----------
local before = fileText()
task.spawn(T.closeHandlers[1]); T.run(2)
check("default: chat.txt NOT cleared on shutdown", fileText() == before)
check("no script errors", #T.errors == 0, T.errors[1])
print(("RESULT: %d passed, %d failed"):format(pass, fail))
end
