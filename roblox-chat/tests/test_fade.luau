do
local T = MOCK
T.run(5.2)
local gui = game:GetService("Players").LocalPlayer.PlayerGui.CustomChatMenu
local win = gui.ChatContainer.ChatWindow
T.run(35)
local faded = true
for _, c in win.Messages:GetChildren() do if c:IsA("TextLabel") and c.TextTransparency ~= 1 then faded = false end end
print("text faded after 35s:", faded, "errors:", #T.errors)
end
