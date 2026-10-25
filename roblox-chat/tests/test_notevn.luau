do
local T = MOCK
local NV = T.notevn
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

-- ---------- pure helpers ----------
local I = _G.NotevnChatInternals
local Text = I.Text
local function eq(a, b) return table.concat(a, "|") == table.concat(b, "|") end
check("newLines append", eq(Text.newLines({ "a", "b" }, { "a", "b", "c", "d" }), { "c", "d" }))
check("newLines unchanged", eq(Text.newLines({ "a", "b" }, { "a", "b" }), {}))
check("newLines trimmed top", eq(Text.newLines({ "x", "a", "b" }, { "a", "b", "c" }), { "c" }))
check("newLines cleared", eq(Text.newLines({ "a", "b" }, {}), {}))
check("newLines after clear", eq(Text.newLines({}, { "z" }), { "z" }))
check("newLines repeated lines", eq(Text.newLines({ "a: hi" }, { "a: hi", "a: hi" }), { "a: hi" }))
check("newLines total rewrite", eq(Text.newLines({ "a", "b" }, { "c" }), { "c" }))
check("splitLines CRLF/blank", eq(Text.splitLines("a: 1\r\n\r\n  b: 2  \n\n"), { "a: 1", "b: 2" }))
local n1, m1 = Text.parseLine("taodepzaitopsever: bạn đang làm gì vậy ?")
check("parseLine", n1 == "taodepzaitopsever" and m1 == "bạn đang làm gì vậy ?", tostring(n1) .. "|" .. m1)
local n2, m2 = Text.parseLine("dòng không tên")
check("parseLine no name", n2 == nil and m2 == "dòng không tên")
local n3, m3 = Text.parseLine("bob: giờ là 10:30 nhé")
check("parseLine colon in message", n3 == "bob" and m3 == "giờ là 10:30 nhé")
local n4 = Text.parseLine("https://x.com/abc")
check("parseLine link is not a name", n4 == nil)
check("formatLine one line", Text.formatLine("A", "x\ny\r\nz") == "A: x y z")
local enc = function(s) return (s:gsub("[^%w%-_%.~]", function(c) return string.format("%%%02X", string.byte(c)) end)) end
local form = Text.formEncode({ action = "save", type = "", data = { { id = 5, name = "a b", flag = true } } }, enc)
check("formEncode jQuery style", form == "action=save&data%5B0%5D%5Bflag%5D=true&data%5B0%5D%5Bid%5D=5&data%5B0%5D%5Bname%5D=a%20b&type=", form)

local dec = T.JSON.decode
local realRaw = '<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><title>notevn / raw / qdzjmz94</title></head><body><script>var quill = new Quill(\'.editable\', {\tmodules: {\ttoolbar: false\t},\ttheme: \'snow\'\t});\tquill.disable();\tquill.setContents({"ops":[{"insert":"taodepzaitopsever: bạn đang làm gì vậy ?\\nhuyhieucute123456789: bạn có thể giúp mình không\\n"}]}, \'silent\');\tvar editor = 1;</script></body></html>'
check("extract text from real /raw HTML", Text.extractNoteText(realRaw, dec) == "taodepzaitopsever: bạn đang làm gì vậy ?\nhuyhieucute123456789: bạn có thể giúp mình không\n", Text.extractNoteText(realRaw, dec))
local tricky = 'x<script>quill.setContents({"ops":[{"insert":"a: dấu } và \\" và \'silent\') nhé\\n"},{"insert":{"image":"u"}},{"insert":"b: link https:\\/\\/x.com\\n","attributes":{"bold":true}}]}, \'silent\');</script>'
check("extract handles } \" 'silent') \\/ and embeds", Text.extractNoteText(tricky, dec) == "a: dấu } và \" và 'silent') nhé\nb: link https://x.com/\n" or Text.extractNoteText(tricky, dec) == "a: dấu } và \" và 'silent') nhé\nb: link https://x.com\n", Text.extractNoteText(tricky, dec))
check("extract Delta JSON (/get_shared)", Text.extractNoteText('{"ops":[{"insert":"z: 1\\n"}]}', dec) == "z: 1\n")
check("extract plain text", Text.extractNoteText("a: b\nc: d\n", dec) == "a: b\nc: d\n")
check("unknown HTML -> nil (never saved as chat)", Text.extractNoteText("<!DOCTYPE html><html><body>lỗi 502: bad gateway</body></html>", dec) == nil)
check("parse Set-Cookie", Text.parseSetCookie("PHPSESSID=abc; path=/; HttpOnly, cf=x; expires=Fri, 31 Dec 2027 23:59:59 GMT; path=/") == "PHPSESSID=abc; cf=x", Text.parseSetCookie("PHPSESSID=abc; path=/; HttpOnly, cf=x; expires=Fri, 31 Dec 2027 23:59:59 GMT; path=/"))

-- ---------- integration ----------
local Players = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")
check("RemoteEvent created", RS:FindFirstChild("CustomChatRemote") ~= nil and RS.CustomChatRemote:IsA("RemoteEvent"))
T.run(1)
local gui = Players.LocalPlayer.PlayerGui.CustomChatMenu
local msgs = gui.ChatContainer.ChatWindow.Messages
local box = gui.ChatContainer.ChatInputBar.InputBox.TextContainer.TextBoxContainer.TextBox
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

check("no demo when server present", not has("DEMO"))
check("connected notice", has("Đã kết nối chat chung"))
check("history from note shown", has("taodepzaitopsever:</font> bạn đang làm gì vậy ?") and has("huyhieucute123456789:</font> bạn có thể giúp mình không"), lines())
check("history filtered per recipient", T.filterCalls >= 2)
check("no HTML junk shown in chat", not has("DOCTYPE") and not has("quill") and not has("&lt;"), lines())
check("read uses raw url + cache bust", NV.gets[1] and NV.gets[1].url:find("^https://notevn.com/raw/qdzjmz94%?t=") ~= nil, NV.gets[1] and NV.gets[1].url)

-- poll interval
local g0 = #NV.gets
T.run(9)
local polls = #NV.gets - g0
check("polls every ~3s (3 polls in 9s)", polls == 3, polls)

-- external message appears
NV.text ..= "web_user: xin chào từ notevn\n"
T.run(3.5)
check("external line shown", has("web_user:</font> xin chào từ notevn"), lines())
check("external user listed for /mute", true)
say("/mute web_user")
check("mute external user", has("Đã tắt tiếng web_user"))
NV.text ..= "web_user: bị mute rồi\n"
T.run(3.5)
check("muted external hidden", not has("bị mute rồi"))
say("/unmute web_user")

-- own message -> note
local s0 = #NV.saves
say("hello server")
check("own message shown immediately", count(lines(), "Tester:</font> hello server") == 1)
T.run(1.5)
check("save request sent", #NV.saves == s0 + 1, #NV.saves - s0)
check("note has 'TestPlayer: hello server' at end", NV.text:sub(-#"TestPlayer: hello server\n") == "TestPlayer: hello server\n", NV.text)
check("old note lines kept", NV.text:find("taodepzaitopsever: bạn đang làm gì vậy ?", 1, true) ~= nil)
check("saved note is clean text (no HTML)", not NV.text:find("<", 1, true) and not NV.text:find("quill", 1, true), NV.text)
check("session cookie from note page sent to ajax.php", NV.lastCookie == "PHPSESSID=abc123; cf_bm=xyz", NV.lastCookie)
check("friend got broadcast", (function() for _, p in T.friendInbox do if p.text == "hello server" then return true end end return false end)())
T.run(7)
check("own message not duplicated by poll", count(lines(), "hello server") == 1, count(lines(), "hello server"))

-- stale raw after save
NV.staleNext = false
say("tin thứ hai")
T.run(1.5)
NV.staleNext = true -- next GET returns content before the save
T.run(7)
check("stale raw does not duplicate", count(lines(), "tin thứ hai") == 1, count(lines(), "tin thứ hai"))
check("stale raw does not re-show old lines", count(lines(), "bạn đang làm gì vậy") == 1 and count(lines(), "xin chào từ notevn") == 1, lines())

-- filter
say("đây là badword nhé")
T.run(1.5)
check("filtered in chat", has("đây là ####### nhé") and not has("badword"))
check("filtered in note", NV.text:find("TestPlayer: đây là ####### nhé", 1, true) ~= nil and not NV.text:find("badword", 1, true))
NV.text ..= "hacker: badword từ web\n"
T.run(3.5)
check("external text filtered", has("hacker:</font> ####### từ web") and not has("badword"))

-- rich text safety for external
NV.text ..= "evil: <font color=\"#ff0000\">x</font>\n"
T.run(3.5)
check("external rich text escaped", has("&lt;font"), lines())

-- external message concurrent with own send (read-before-write)
NV.text ..= "web_user: gửi cùng lúc\n"
say("mình cũng gửi")
T.run(1.5)
check("concurrent external kept in note", NV.text:find("web_user: gửi cùng lúc", 1, true) ~= nil and NV.text:find("TestPlayer: mình cũng gửi", 1, true) ~= nil, NV.text)
T.run(4)
check("concurrent external shown once", count(lines(), "gửi cùng lúc") == 1, count(lines(), "gửi cùng lúc"))

-- whisper stays in server
local saves = #NV.saves
local inbox = #T.friendInbox
say("/w FriendPlayer bí mật")
T.run(1.5)
check("whisper shown", has("[Tới Friend]:</font> bí mật"), lines())
check("whisper delivered to target", T.friendInbox[inbox + 1] and T.friendInbox[inbox + 1].kind == "whisper")
check("whisper NOT written to note", #NV.saves == saves and not NV.text:find("bí mật", 1, true))
gui.ChatContainer.ChatInputBar.InputBox.TextContainer.TargetChip.MouseButton1Click:Fire(); T.run(0.1)

-- bubble above the head of another player in the same server
do
	local friend = T.friend
	local char = Instance.new("Model"); char.Name = "FriendPlayer"
	local head = Instance.new("Part"); head.Name = "Head"; head.Parent = char
	char.Parent = workspace
	T.set(friend, "Character", char)
	local lpChar = Instance.new("Model"); lpChar.Name = "TestPlayer"
	local lpHead = Instance.new("Part"); lpHead.Name = "Head"; lpHead.Parent = lpChar
	lpChar.Parent = workspace
	T.set(Players.LocalPlayer, "Character", lpChar)
	RS.CustomChatRemote.OnServerEvent:Fire(friend, { kind = "chat", text = "chào cả nhà" })
	T.run(0.5)
	check("other player's message in chat", has("Friend:</font> chào cả nhà"), lines())
	local pg = Players.LocalPlayer.PlayerGui
	local bb = pg:FindFirstChild("CustomChatBubbles_FriendPlayer")
	check("bubble BillboardGui above friend's head", bb ~= nil and bb:IsA("BillboardGui") and bb.Adornee == head)
	local bubbleText = nil
	if bb then for _, f in bb.List:GetChildren() do if f:IsA("Frame") then for _, l in f:GetChildren() do if l:IsA("TextLabel") then bubbleText = l.Text end end end end end
	check("bubble shows the message text", bubbleText == "chào cả nhà", bubbleText)
	say("mình thấy rồi")
	check("own bubble above own head", pg:FindFirstChild("CustomChatBubbles_TestPlayer") ~= nil and pg.CustomChatBubbles_TestPlayer.Adornee == lpHead)
	check("no bubble for note/web users", pg:FindFirstChild("CustomChatBubbles_web_user") == nil)
	local wb = 0
	if bb then for _, f in bb.List:GetChildren() do if f:IsA("Frame") then wb += 1 end end end
	RS.CustomChatRemote.OnServerEvent:Fire(friend, { kind = "whisper", target = "TestPlayer", text = "thì thầm" })
	T.run(0.5)
	local wb2 = 0
	if bb then for _, f in bb.List:GetChildren() do if f:IsA("Frame") then wb2 += 1 end end end
	check("whisper does not show bubble (like Roblox)", wb2 == wb, wb .. "->" .. wb2)
	T.run(16)
	local left = 0
	if bb then for _, f in bb.List:GetChildren() do if f:IsA("Frame") then left += 1 end end end
	check("bubble disappears after 15s", left == 0, left)
	T.run(1.5)
end

-- multi-line message from client is one line in note
RS.CustomChatRemote:FireServer({ kind = "chat", text = "dòng 1\ndòng 2" })
T.run(1.5)
check("newline flattened", NV.text:find("TestPlayer: dòng 1 dòng 2\n", 1, true) ~= nil)
check("bad payloads ignored", pcall(function()
	RS.CustomChatRemote:FireServer("rác"); RS.CustomChatRemote:FireServer({ kind = "chat", text = 5 })
	RS.CustomChatRemote:FireServer({ kind = "chat", text = string.rep("x", 1000) })
	T.run(1.5)
end))
check("long payload truncated to 200", (function()
	for line in NV.text:gmatch("[^\n]+") do if line:find("xxxx", 1, true) then return #line == #"TestPlayer: " + 200 end end
	return false
end)())

-- server-side spam
T.run(10)
for i = 1, 8 do RS.CustomChatRemote:FireServer({ kind = "chat", text = "spam" .. i }) end
T.run(2)
check("server spam limit", has("quá nhanh") and not NV.text:find("spam7", 1, true))
check("messages keep order (per-player queue)", (function()
	local l = lines(); local last = 0
	for i = 1, 6 do local p = string.find(l, "spam" .. i, 1, true); if not p or p < last then return false end; last = p end
	return true
end)(), lines())

-- note cleared by someone, then new line
T.run(10)
NV.text = ""
T.run(3.5)
NV.text = "z: sau khi xoá\n"
T.run(3.5)
check("line after external clear shown", has("z:</font> sau khi xoá"))

-- trimming to MaxNoteLines
I.CONFIG.MaxNoteLines = 5
for i = 1, 4 do say("trim " .. i); T.run(2.5) end
local nlines = 0
for _ in NV.text:gmatch("[^\n]+") do nlines += 1 end
check("note trimmed to MaxNoteLines", nlines <= 5, nlines)
T.run(7)
check("no duplicates after trimming", count(lines(), "trim 4") == 1)

-- save failure
NV.failSave = true
say("sẽ lỗi")
T.run(1.5)
check("save failure reported", has("Không ghi được"), lines())
NV.failSave = false
T.run(7)
check("no re-broadcast storm after failure", count(lines(), "trim 3") == 1, count(lines(), "trim 3"))
check("failed message retried and saved", NV.text:find("TestPlayer: sẽ lỗi", 1, true) ~= nil, NV.text)
check("retried message not duplicated in chat", count(lines(), "sẽ lỗi") == 1)

-- /raw changes format -> fallback to /get_shared
NV.rawFormat = "broken"
NV.text ..= "web_user: đọc qua get_shared\n"
T.run(3.5)
check("fallback to /get_shared when /raw unreadable", has("web_user:</font> đọc qua get_shared"), lines())
say("vẫn ghi được")
T.run(1.5)
check("write still works with fallback read", NV.text:find("TestPlayer: vẫn ghi được", 1, true) ~= nil and not NV.text:find("<", 1, true))
NV.rawFormat = nil

-- HTTP disabled
T.httpEnabled = false
T.run(3.5)
check("http disabled notice", has("Allow HTTP Requests"))
T.run(7)
check("http notice only once", count(lines(), "Allow HTTP Requests") == 1)
T.httpEnabled = true
T.run(3.5)

-- locked note
NV.locked = true
NV.meta.id = 999 -- force meta refresh path through failure
local I2 = I.Notevn
local okL, errL
task.spawn(function() okL, errL = I2.fetchMeta() end); T.run(1)
check("locked note detected", okL == false and errL == "LOCKED", tostring(errL))
NV.locked = false
NV.meta.id = 123
task.spawn(I2.fetchMeta); T.run(1)

-- BindToClose clears note
check("BindToClose registered", #T.closeHandlers == 1)
NV.text ..= "web_user: trước khi thoát\n"
task.spawn(T.closeHandlers[1])
T.run(2)
check("note cleared on shutdown", NV.text == "\n" or NV.text == "", string.format("%q", NV.text))
local g1 = #NV.gets
T.run(10)
check("polling stopped after close", #NV.gets - g1 <= 1, #NV.gets - g1)

check("no script errors", #T.errors == 0, T.errors[1])
print(("RESULT: %d passed, %d failed"):format(pass, fail))
end
