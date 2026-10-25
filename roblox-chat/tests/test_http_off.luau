do
local T = MOCK
local pass, fail = 0, 0
local function check(name, cond, extra)
	if cond then pass += 1; print("  ok  " .. name) else fail += 1; print("  FAIL " .. name .. (extra and (" :: " .. tostring(extra)) or "")) end
end
T.run(2)
local gui = game:GetService("Players").LocalPlayer.PlayerGui.CustomChatMenu
local msgs = gui.ChatContainer.ChatWindow.Messages
local box = gui.ChatContainer.ChatInputBar.InputBox.TextContainer.TextBoxContainer.TextBox
local function lines() local o = {} for _, c in msgs:GetChildren() do if c:IsA("TextLabel") then table.insert(o, c.Text) end end return table.concat(o, "\n") end
local function has(p) return string.find(lines(), p, 1, true) ~= nil end
check("http disabled notice shown to client", has("Allow HTTP Requests"), lines())
check("no misleading connected notice", not has("Đã kết nối"))
box:CaptureFocus(); box.Text = "chat trong server vẫn chạy"; box:ReleaseFocus(true); T.run(2)
check("local chat still works without HTTP", has("Tester:</font> chat trong server vẫn chạy"))
T.run(30)
task.spawn(T.closeHandlers[1]); T.run(2)
check("shutdown without HTTP does not error", #T.errors == 0, T.errors[1])
print(("RESULT: %d passed, %d failed"):format(pass, fail))
end
