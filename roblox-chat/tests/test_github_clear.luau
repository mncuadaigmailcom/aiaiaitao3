do
-- CONFIG.ClearOnShutdown = true
local T = MOCK
local G = T.github
local pass, fail = 0, 0
local function check(name, cond, extra)
	if cond then pass += 1; print("  ok  " .. name) else fail += 1; print("  FAIL " .. name .. (extra and (" :: " .. tostring(extra)) or "")) end
end
T.run(1)
local box = game:GetService("Players").LocalPlayer.PlayerGui.CustomChatMenu.ChatContainer.ChatInputBar.InputBox.TextContainer.TextBoxContainer.TextBox
local function say(t) box:CaptureFocus(); box.Text = t; box:ReleaseFocus(true); T.run(0.1) end
say("/ghp_validtoken1234567890"); T.run(5)
say("tin 1"); T.run(2)
check("message written", G.repos["chatowner/roblox-chat-server"].file.content:find("tin 1", 1, true) ~= nil)
task.spawn(T.closeHandlers[1]); T.run(3)
check("chat.txt cleared on shutdown", G.repos["chatowner/roblox-chat-server"].file.content == "", G.repos["chatowner/roblox-chat-server"].file.content)
local g = #G.rawGets
T.run(10)
check("polling stops after shutdown", #G.rawGets - g <= 1)
check("no script errors", #T.errors == 0, T.errors[1])
print(("RESULT: %d passed, %d failed"):format(pass, fail))
end
