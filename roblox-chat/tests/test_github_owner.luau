do
-- CONFIG.RepoOwner = "chatowner": read without any key, existing repo -> nothing created
local T = MOCK
local G = T.github
local pass, fail = 0, 0
local function check(name, cond, extra)
	if cond then pass += 1; print("  ok  " .. name) else fail += 1; print("  FAIL " .. name .. (extra and (" :: " .. tostring(extra)) or "")) end
end
T.run(1.5)
local gui = game:GetService("Players").LocalPlayer.PlayerGui.CustomChatMenu
local msgs = gui.ChatContainer.ChatWindow.Messages
local box = gui.ChatContainer.ChatInputBar.InputBox.TextContainer.TextBoxContainer.TextBox
local function lines() local o = {} for _, c in msgs:GetChildren() do if c:IsA("TextLabel") then table.insert(o, c.Text) end end return table.concat(o, "\n") end
local function has(p) return string.find(lines(), p, 1, true) ~= nil end
check("reads raw before any key (RepoOwner set)", #G.rawGets >= 1)
check("history shown without key", has("PlayerA:</font> tin cũ 1") and has("PlayerB:</font> tin cũ 2"), lines())
check("'reading from' notice", has("Đang đọc chat chung từ GitHub chatowner/roblox-chat-server"))
G.writeExternal("chatowner/roblox-chat-server", "PlayerC: mới")
T.run(3.5)
check("new lines arrive without key", has("PlayerC:</font> mới"))
box:CaptureFocus(); box.Text = "/ghp_validtoken1234567890"; box:ReleaseFocus(true); T.run(4)
local posts = 0
for _, r in G.requests do if r.method == "POST" or (r.method == "PUT" and r.body and not r.body:find("chat:", 1, true)) then posts += 1 end end
check("existing repo + file: create steps skipped", posts == 0 and not has("Đã tạo mới"), posts)
check("key accepted", has("Kết nối GitHub thành công"))
box:CaptureFocus(); box.Text = "hello"; box:ReleaseFocus(true); T.run(1.5)
check("appended after old lines", G.repos["chatowner/roblox-chat-server"].file.content == "PlayerA: tin cũ 1\nPlayerB: tin cũ 2\nPlayerC: mới\nTestPlayer: hello\n", G.repos["chatowner/roblox-chat-server"].file.content)
check("no script errors", #T.errors == 0, T.errors[1])
print(("RESULT: %d passed, %d failed"):format(pass, fail))
end
