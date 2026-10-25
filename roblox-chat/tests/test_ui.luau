do
local T = MOCK
local pg = game:GetService("Players").LocalPlayer.PlayerGui
local pass, fail = 0, 0
local function check(name, cond, extra)
	if cond then pass += 1; print("  ok  " .. name) else fail += 1; print("  FAIL " .. name .. (extra and (" :: " .. tostring(extra)) or "")) end
end
T.run(5.2) -- no server: client waits ServerWaitTime (5s) before demo mode
T.mouse = Vector2.new(50, 10); T.run(0.3); T.mouse = Vector2.new(2000, 2000) -- hover: background back after the 5s wait
local gui = pg:FindFirstChild("CustomChatMenu")
check("ScreenGui created", gui ~= nil)
local container = gui.ChatContainer
local win = container.ChatWindow
local msgs = win.Messages
local box = container.ChatInputBar.InputBox.TextContainer.TextBoxContainer.TextBox
local chip = container.ChatInputBar.InputBox.TextContainer.TargetChip
local function lines()
	local list = {}
	for _, c in msgs:GetChildren() do if c:IsA("TextLabel") then table.insert(list, c) end end
	table.sort(list, function(a, b) return a.LayoutOrder < b.LayoutOrder end)
	local out = {}
	for _, l in list do table.insert(out, l.Text) end
	return out, list
end
local function has(pattern)
	for _, t in lines() do if string.find(t, pattern, 1, true) then return true end end
	return false
end
local function say(text)
	box:CaptureFocus(); box.Text = text; box:ReleaseFocus(true); T.run(0.2)
end
check("core chat disabled", T.coreChat == false)
local function size() return container.Size.X.Offset, win.Size.Y.Offset, container.Position.X.Offset, container.Position.Y.Offset end
local w, h, x, y = size()
check("1280x720: width 475 (40% capped)", w == 475, w)
check("1280x720: list height 165 (25% of 662)", h == 165, h)
check("position 8px left, 4px under topbar", x == 8 and y == 62, x .. "," .. y)
local cam = workspace.CurrentCamera
T.set(cam, "ViewportSize", Vector2.new(1920, 1080)); T.run(0.05)
w, h = size(); check("1920x1080: 475 x 255", w == 475 and h == 255, w .. "x" .. h)
T.set(cam, "ViewportSize", Vector2.new(2560, 1440)); T.run(0.05)
w, h = size(); check("2560x1440: 475 x 275 (max)", w == 475 and h == 275, w .. "x" .. h)
T.set(cam, "ViewportSize", Vector2.new(844, 390)); T.run(0.05)
w, h = size(); check("phone 844x390: 337 x 83", w == 337 and h == 83, w .. "x" .. h)
T.set(cam, "ViewportSize", Vector2.new(1280, 720)); T.run(0.05)
check("one shared rounded panel bg 0.3", container.BackgroundTransparency == 0.3 and win.BackgroundTransparency == 1)
check("input box bg 0.2 + stroke 0.8", container.ChatInputBar.InputBox.BackgroundTransparency == 0.2 and container.ChatInputBar.InputBox.UIStroke.Transparency == 0.8)
check("text size 14", box.TextSize == 14)
check("button placed in topbar", gui.ChatButton.Position.X.Offset == 68, gui.ChatButton.Position.X.Offset)
check("welcome shown", has("/help"))
check("demo notice shown", has("DEMO"))
say("xin chào mọi người")
check("own message echoed", has("Tester:</font> xin chào mọi người"))
say("<b>hack</b> & \"q\"")
check("rich text escaped", has("&lt;b&gt;hack&lt;/b&gt; &amp; &quot;q&quot;"))
say("/help")
check("help listed", has("/mute"))
say("/w minh hi bạn")
check("no tabs by default (like Roblox)", container.ChannelTabsRow.Visible == false)
check("whisper message shown", has("[Tới Minh]:</font> hi bạn"))
check("target chip visible", chip.Visible and chip.Text == "[Tới Minh]")
say("tiếp tục nè")
check("still whispering", has("[Tới Minh]:</font> tiếp tục nè"))
T.run(5)
check("bot whisper reply", has("[Từ Minh]"))
-- backspace on empty box exits whisper
box:CaptureFocus(); T.run(0.2)
game:GetService("UserInputService").InputBegan:Fire({ UserInputType = Enum.UserInputType.Keyboard, KeyCode = Enum.KeyCode.Backspace }, true)
T.run(0.1); box:ReleaseFocus(false); T.run(0.1)
check("backspace exits whisper", not chip.Visible)
say("/w lan")
check("chip again", chip.Visible and chip.Text == "[Tới Lan Anh]")
chip.MouseButton1Click:Fire(); T.run(0.1)
check("chip click exits whisper", not chip.Visible)
say("chat chung")
check("general message after whisper", has("Tester:</font> chat chung"))
say("/w nobodyhere yo")
check("player not found", has("Không tìm thấy"))
say("/mute NoobMaster69")
check("muted", has("Đã tắt tiếng NoobMaster69"))
say("/unmute noob")
check("unmuted (prefix)", has("Đã bật lại tiếng NoobMaster69"))
-- length limit
box.Text = string.rep("á", 250); T.run(0.05)
check("truncated to 200 chars", utf8.len(box.Text) == 200, utf8.len(box.Text))
box.Text = ""
-- spam
T.run(10)
for i = 1, 8 do say("spam " .. i) end
check("spam blocked", has("quá nhanh"))
say("/clear")
local l = lines()
local okc = string.find(l[1], "Đã xoá", 1, true) ~= nil and not has("spam 1")
check("clear removed old msgs", okc, table.concat(l, " | "))
say("/e wave")
check("emote failure msg (no character)", has("Không thể thực hiện"))
-- close window -> badge
gui.ChatButton.MouseButton1Click:Fire(); T.run(0.1)
check("window closed", container.Visible == false)
T.run(40)
check("unread badge shown", gui.ChatButton.UnreadBadge.Visible)
gui.ChatButton.MouseButton1Click:Fire(); T.run(0.1)
check("window reopened, badge cleared", container.Visible and not gui.ChatButton.UnreadBadge.Visible)
-- slash key
UIS = game:GetService("UserInputService")
UIS.InputBegan:Fire({ UserInputType = Enum.UserInputType.Keyboard, KeyCode = Enum.KeyCode.Slash }, false)
T.run(0.1)
check("slash focuses box", box:IsFocused())
box:ReleaseFocus(false); T.run(0.1)
-- fade
T.mouse = Vector2.new(2000, 2000)
T.run(5)
check("background faded", container.BackgroundTransparency == 1 and container.ChatInputBar.InputBox.BackgroundTransparency == 1, container.BackgroundTransparency)
check("input text faded", box.TextTransparency == 1)
local _, labels = lines()
-- text fade requires 30s without new messages; disable demo chatter influence by checking eventually
T.mouse = Vector2.new(50, 10)
T.run(0.3)
check("hover restores background", container.BackgroundTransparency == 0.3, container.BackgroundTransparency)
check("scrollbar visible on hover", msgs.ScrollBarImageTransparency == 0)
check("placeholder dim 0.5", box.TextTransparency == 0.5 and box.PlaceholderText ~= "")
-- history
say("lịch sử 1")
box:CaptureFocus()
UIS.InputBegan:Fire({ UserInputType = Enum.UserInputType.Keyboard, KeyCode = Enum.KeyCode.Up }, true)
T.run(0.05)
check("history up", box.Text == "lịch sử 1", box.Text)
box:ReleaseFocus(false)
-- long run stability
T.run(300)
local all = lines()
check("message cap respected", #all <= 100, #all)
say("/ghp_demokey123456")
check("demo: API key not shown, explains no server", has("chế độ DEMO") and not has("ghp_demokey"))
check("no script errors", #T.errors == 0, T.errors[1])
print(("RESULT: %d passed, %d failed"):format(pass, fail))
end
