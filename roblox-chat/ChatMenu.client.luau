--!nonstrict
--[[
	ChatMenu.client.luau
	====================
	Menu chat GIỐNG GIAO DIỆN CHAT CỦA ROBLOX — bản GIAO DIỆN (UI) TRƯỚC.

	• Chưa có server  ->  dùng "MockTransport": tin nhắn của bạn được hiện lại
	  ngay trên máy, còn "người chơi khác" là bot giả lập để xem thử giao diện.
	• Khi có server   ->  chỉ cần viết lại phần TRANSPORT (cuối tệp) — toàn bộ
	  giao diện phía trên giữ nguyên. Xem roblox-chat/README.md.

	Cách dùng nhanh (Roblox Studio):
	  StarterPlayer > StarterPlayerScripts > Insert Object > LocalScript
	  -> dán toàn bộ tệp này vào -> bấm Play.

	Có gì trong giao diện (bám theo chat mặc định của Roblox):
	  - Nút chat 💬 trên thanh topbar (bật/tắt khung chat, có huy hiệu số tin chưa đọc)
	  - Khung chat nền tối bán trong suốt ở góc trên bên trái, tự mờ dần khi không dùng
	  - Thanh nhập "Nhấp vào đây hoặc nhấn phím "/" để trò chuyện" + nút gửi
	  - Tên người chơi có màu theo thuật toán màu tên cổ điển của Roblox
	  - Tab kênh: "Chung" + tab thì thầm (/w) có nút đóng ×, số tin chưa đọc
	  - Lệnh: /? /help /w /r /mute /unmute /clear /e
	  - Bong bóng chat (bubble) trên đầu nhân vật
	  - Lịch sử tin đã gửi (phím ↑ / ↓), giới hạn 200 ký tự, chống spam
	  - Nút "↓ Tin nhắn mới" khi bạn đang cuộn lên xem tin cũ
]]

--==============================================================================
-- 1. CẤU HÌNH
--==============================================================================

local CONFIG = {
	DemoMode = true, -- true: bật bot giả lập người chơi khác (chưa có server)
	DemoChatterMin = 7, -- giây, khoảng nghỉ ngắn nhất giữa 2 câu bot tự nói
	DemoChatterMax = 16, -- giây, khoảng nghỉ dài nhất

	DisableDefaultChat = true, -- tắt khung chat mặc định của Roblox để không bị trùng

	MaxMessageLength = 200, -- giống giới hạn của Roblox
	MaxMessagesPerChannel = 100,
	ShowChannelTabs = true,
	ShowTimestamps = false, -- true: hiện giờ "14:05" trước mỗi tin
	LegacyNameFormat = false, -- true: "[Tên]: tin" (chat cũ) | false: "Tên: tin" (chat mới)
	UseDisplayName = true, -- hiện DisplayName thay vì Username

	BubbleChat = true,
	BubbleLifetime = 15, -- giây
	MaxBubbles = 3,

	BackgroundFadeDelay = 3.5, -- giây không dùng thì nền mờ đi
	TextFadeDelay = 30, -- giây không có tin mới thì chữ mờ đi

	SpamLimit = 6, -- tối đa 6 tin ...
	SpamWindow = 8, -- ... trong 8 giây

	WindowWidth = 420,
	WindowHeight = 230,
	InputHeight = 40,
	TextSize = 15,
}

local TEXT = {
	Placeholder = 'Nhấp vào đây hoặc nhấn phím "/" để trò chuyện',
	PlaceholderTouch = "Chạm vào đây để trò chuyện",
	General = "Chung",
	NewMessages = "↓  Tin nhắn mới",
	Welcome = 'Gõ "/?" hoặc "/help" để xem danh sách lệnh chat.',
	DemoNotice = "[DEMO] Chưa kết nối server — tin nhắn của người chơi khác đang là giả lập.",
	TooFast = "Bạn gửi tin quá nhanh. Vui lòng đợi một chút rồi thử lại.",
	TooLong = "Tin nhắn quá dài (tối đa %d ký tự).",
	PlayerNotFound = 'Không tìm thấy người chơi "%s".',
	CannotWhisperSelf = "Bạn không thể thì thầm với chính mình.",
	WhisperTo = "Tới %s", -- tin mình gửi riêng
	WhisperFrom = "Từ %s", -- tin người khác gửi riêng
	WhisperStarted = "Bạn đang thì thầm với %s. Tin nhắn trong tab này chỉ người đó thấy.",
	NoReplyTarget = "Chưa có ai thì thầm với bạn để trả lời.",
	Muted = "Đã tắt tiếng %s. Bạn sẽ không thấy tin nhắn của người này.",
	Unmuted = "Đã bật lại tiếng %s.",
	NotMuted = "%s chưa bị tắt tiếng.",
	Cleared = "Đã xoá tin nhắn trong kênh này.",
	EmoteUnknown = "Biểu cảm không hợp lệ. Dùng: wave, point, dance, dance2, dance3, laugh, cheer.",
	EmoteFailed = "Không thể thực hiện biểu cảm lúc này.",
	Usage = "Cách dùng: %s",
	HelpTitle = "Danh sách lệnh chat:",
	Help = {
		"/? hoặc /help  — hiện danh sách lệnh",
		"/w <tên> [tin]  — thì thầm (chat riêng) với người chơi",
		"/r [tin]  — trả lời người vừa thì thầm với bạn",
		"/mute <tên>  /  /unmute <tên>  — tắt / bật tiếng người chơi",
		"/clear  — xoá tin nhắn trong kênh hiện tại",
		"/e <wave|point|dance|dance2|dance3|laugh|cheer>  — biểu cảm",
	},
}

local THEME = {
	WindowBg = Color3.fromRGB(25, 27, 29),
	WindowBgTransparency = 0.3, -- giống ChatWindowConfiguration mặc định
	InputBg = Color3.fromRGB(25, 27, 29),
	InputBgTransparency = 0.2,
	InputBgFaded = 0.55,
	TopbarButtonBg = Color3.fromRGB(18, 18, 21),
	Text = Color3.fromRGB(255, 255, 255),
	SubText = Color3.fromRGB(178, 178, 178),
	System = Color3.fromRGB(190, 190, 190),
	Whisper = Color3.fromRGB(193, 166, 255),
	Accent = Color3.fromRGB(0, 162, 255),
	Badge = Color3.fromRGB(226, 35, 26),
	Bubble = Color3.fromRGB(250, 250, 250),
	BubbleText = Color3.fromRGB(57, 59, 61),
	Corner = UDim.new(0, 8),
}

--==============================================================================
-- 2. DỊCH VỤ
--==============================================================================

local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local TweenService = game:GetService("TweenService")
local StarterGui = game:GetService("StarterGui")
local GuiService = game:GetService("GuiService")

local LocalPlayer = Players.LocalPlayer
local PlayerGui = LocalPlayer:WaitForChild("PlayerGui")

local IS_TOUCH = UserInputService.TouchEnabled and not UserInputService.KeyboardEnabled

--==============================================================================
-- 3. TIỆN ÍCH
--==============================================================================

local function create(className: string, props: { [string]: any }?, children: { Instance }?): any
	local inst = Instance.new(className)
	local parent = nil
	for key, value in props or {} do
		if key == "Parent" then
			parent = value
		else
			inst[key] = value
		end
	end
	for _, child in children or {} do
		child.Parent = inst
	end
	if parent then
		inst.Parent = parent
	end
	return inst
end

local function corner(radius: UDim?): UICorner
	return create("UICorner", { CornerRadius = radius or THEME.Corner })
end

local function padding(top: number, right: number, bottom: number, left: number): UIPadding
	return create("UIPadding", {
		PaddingTop = UDim.new(0, top),
		PaddingRight = UDim.new(0, right),
		PaddingBottom = UDim.new(0, bottom),
		PaddingLeft = UDim.new(0, left),
	})
end

-- Font "Builder Sans" giống chat mới của Roblox; máy nào không có thì dùng Gotham.
local FONT_FAMILY = "rbxasset://fonts/families/BuilderSans.json"
local function setFont(obj: Instance, weight: Enum.FontWeight?)
	local ok = pcall(function()
		(obj :: any).FontFace = Font.new(FONT_FAMILY, weight or Enum.FontWeight.Medium)
	end)
	if not ok then
		(obj :: any).Font = Enum.Font.GothamMedium
	end
end

local function tween(obj: Instance, seconds: number, goal: { [string]: any })
	local t = TweenService:Create(obj, TweenInfo.new(seconds, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), goal)
	t:Play()
	return t
end

local function trim(s: string): string
	return (string.gsub(s, "^%s*(.-)%s*$", "%1"))
end

-- Chữ người chơi gõ phải được "thoát" trước khi đưa vào RichText,
-- nếu không ai đó gõ "<font ...>" là phá được giao diện.
local function escapeRich(s: string): string
	s = string.gsub(s, "&", "&amp;")
	s = string.gsub(s, "<", "&lt;")
	s = string.gsub(s, ">", "&gt;")
	s = string.gsub(s, '"', "&quot;")
	s = string.gsub(s, "'", "&apos;")
	return s
end

local function toHex(c: Color3): string
	return string.format(
		"#%02X%02X%02X",
		math.floor(c.R * 255 + 0.5),
		math.floor(c.G * 255 + 0.5),
		math.floor(c.B * 255 + 0.5)
	)
end

local function utf8Length(s: string): number
	return utf8.len(s) or #s
end

local function utf8Truncate(s: string, maxChars: number): string
	local cut = utf8.offset(s, maxChars + 1)
	if cut then
		return string.sub(s, 1, cut - 1)
	end
	return s
end

-- Màu tên người chơi: thuật toán màu tên cổ điển của Roblox (chat mặc định).
local NAME_COLORS = {
	Color3.fromRGB(253, 41, 67), -- Bright red
	Color3.fromRGB(1, 162, 255), -- Bright blue
	Color3.fromRGB(2, 184, 87), -- Earth green
	Color3.fromRGB(107, 50, 124), -- Bright violet
	Color3.fromRGB(218, 133, 65), -- Bright orange
	Color3.fromRGB(245, 205, 48), -- Bright yellow
	Color3.fromRGB(232, 186, 200), -- Light reddish violet
	Color3.fromRGB(215, 197, 154), -- Brick yellow
}

local function nameValue(name: string): number
	local value = 0
	local length = #name
	for index = 1, length do
		local byte = string.byte(name, index)
		local reverseIndex = length - index + 1
		if length % 2 == 1 then
			reverseIndex -= 1
		end
		if reverseIndex % 4 >= 2 then
			byte = -byte
		end
		value += byte
	end
	return value
end

local function nameColor(name: string): Color3
	return NAME_COLORS[(nameValue(name) % #NAME_COLORS) + 1]
end

local function timeLabel(t: number): string
	-- Roblox chỉ cho os.date dùng "*t" / "!*t"
	local d = os.date("*t", t)
	return string.format("%02d:%02d", d.hour, d.min)
end

--==============================================================================
-- 4. TẮT CHAT MẶC ĐỊNH
--==============================================================================

local function disableDefaultChat()
	if not CONFIG.DisableDefaultChat then
		return
	end
	task.spawn(function()
		-- SetCoreGuiEnabled có thể lỗi nếu gọi quá sớm -> thử lại vài lần
		for _ = 1, 10 do
			local ok = pcall(function()
				StarterGui:SetCoreGuiEnabled(Enum.CoreGuiType.Chat, false)
			end)
			if ok then
				break
			end
			task.wait(0.5)
		end
	end)
	pcall(function()
		local TextChatService = game:GetService("TextChatService")
		TextChatService.ChatWindowConfiguration.Enabled = false
		TextChatService.ChatInputBarConfiguration.Enabled = false
	end)
end

disableDefaultChat()

--==============================================================================
-- 5. DỰNG GIAO DIỆN
--==============================================================================

local old = PlayerGui:FindFirstChild("CustomChatMenu")
if old then
	old:Destroy()
end

local screenGui = create("ScreenGui", {
	Name = "CustomChatMenu",
	ResetOnSpawn = false,
	IgnoreGuiInset = true,
	ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
	DisplayOrder = 10,
})
pcall(function()
	screenGui.ScreenInsets = Enum.ScreenInsets.None
end)

-- 5.1 Nút chat trên topbar ----------------------------------------------------

local chatButton = create("TextButton", {
	Name = "ChatButton",
	Text = "",
	AutoButtonColor = false,
	BackgroundColor3 = THEME.TopbarButtonBg,
	BackgroundTransparency = 0.3,
	Size = UDim2.fromOffset(44, 44),
	Position = UDim2.fromOffset(60, 7),
	Parent = screenGui,
}, { corner(UDim.new(1, 0)) })

-- Biểu tượng bong bóng chat vẽ bằng Frame (không cần asset ảnh)
local icon = create("Frame", {
	Name = "Icon",
	AnchorPoint = Vector2.new(0.5, 0.5),
	Position = UDim2.new(0.5, 0, 0.5, -1),
	Size = UDim2.fromOffset(20, 15),
	BackgroundColor3 = THEME.Text,
	BorderSizePixel = 0,
	Parent = chatButton,
}, { corner(UDim.new(0, 5)) })

local iconStroke = create("UIStroke", {
	Color = THEME.Text,
	Thickness = 2,
	Enabled = false,
	Parent = icon,
})

local iconTail = create("Frame", {
	Name = "Tail",
	AnchorPoint = Vector2.new(0.5, 0.5),
	Position = UDim2.new(0, 6, 1, 0),
	Size = UDim2.fromOffset(6, 6),
	Rotation = 45,
	BackgroundColor3 = THEME.Text,
	BorderSizePixel = 0,
	ZIndex = 0,
	Parent = icon,
})

local iconDots = {}
for i = -1, 1 do
	iconDots[#iconDots + 1] = create("Frame", {
		AnchorPoint = Vector2.new(0.5, 0.5),
		Position = UDim2.new(0.5, i * 5, 0.5, 0),
		Size = UDim2.fromOffset(3, 3),
		BackgroundColor3 = THEME.TopbarButtonBg,
		BorderSizePixel = 0,
		ZIndex = 2,
		Parent = icon,
	}, { corner(UDim.new(1, 0)) })
end

local badge = create("Frame", {
	Name = "UnreadBadge",
	AnchorPoint = Vector2.new(1, 0),
	Position = UDim2.new(1, 2, 0, -2),
	Size = UDim2.fromOffset(18, 18),
	AutomaticSize = Enum.AutomaticSize.X,
	BackgroundColor3 = THEME.Badge,
	Visible = false,
	ZIndex = 3,
	Parent = chatButton,
}, { corner(UDim.new(1, 0)), padding(0, 5, 0, 5) })

local badgeText = create("TextLabel", {
	BackgroundTransparency = 1,
	Size = UDim2.fromScale(0, 1),
	AutomaticSize = Enum.AutomaticSize.X,
	Text = "0",
	TextSize = 12,
	TextColor3 = THEME.Text,
	ZIndex = 4,
	Parent = badge,
})
setFont(badgeText, Enum.FontWeight.Bold)

-- 5.2 Khung chat ---------------------------------------------------------------

local container = create("Frame", {
	Name = "ChatContainer",
	BackgroundTransparency = 1,
	Position = UDim2.fromOffset(8, 58),
	Size = UDim2.fromOffset(CONFIG.WindowWidth, CONFIG.WindowHeight + 6 + CONFIG.InputHeight),
	Parent = screenGui,
})

local chatWindow = create("Frame", {
	Name = "ChatWindow",
	BackgroundColor3 = THEME.WindowBg,
	BackgroundTransparency = THEME.WindowBgTransparency,
	Size = UDim2.new(1, 0, 0, CONFIG.WindowHeight),
	ClipsDescendants = true,
	Parent = container,
}, { corner() })

local TAB_HEIGHT = CONFIG.ShowChannelTabs and 30 or 0

local tabBar = create("ScrollingFrame", {
	Name = "ChannelTabs",
	BackgroundTransparency = 1,
	BorderSizePixel = 0,
	Size = UDim2.new(1, 0, 0, TAB_HEIGHT),
	CanvasSize = UDim2.new(0, 0, 0, 0),
	AutomaticCanvasSize = Enum.AutomaticSize.X,
	ScrollingDirection = Enum.ScrollingDirection.X,
	ScrollBarThickness = 0,
	Visible = CONFIG.ShowChannelTabs,
	Parent = chatWindow,
}, {
	create("UIListLayout", {
		FillDirection = Enum.FillDirection.Horizontal,
		SortOrder = Enum.SortOrder.LayoutOrder,
		VerticalAlignment = Enum.VerticalAlignment.Center,
		Padding = UDim.new(0, 2),
	}),
	padding(0, 6, 0, 6),
})

local tabDivider = create("Frame", {
	Name = "Divider",
	BackgroundColor3 = THEME.Text,
	BackgroundTransparency = 0.88,
	BorderSizePixel = 0,
	Position = UDim2.new(0, 8, 0, TAB_HEIGHT),
	Size = UDim2.new(1, -16, 0, 1),
	Visible = CONFIG.ShowChannelTabs,
	Parent = chatWindow,
})

local messagesFrame = create("ScrollingFrame", {
	Name = "Messages",
	BackgroundTransparency = 1,
	BorderSizePixel = 0,
	Position = UDim2.fromOffset(0, TAB_HEIGHT + 1),
	Size = UDim2.new(1, 0, 1, -(TAB_HEIGHT + 1)),
	CanvasSize = UDim2.new(0, 0, 0, 0),
	ScrollingDirection = Enum.ScrollingDirection.Y,
	ScrollBarThickness = 4,
	ScrollBarImageColor3 = THEME.Text,
	ScrollBarImageTransparency = 0.6,
	VerticalScrollBarInset = Enum.ScrollBarInset.ScrollBar,
	Parent = chatWindow,
})

local MESSAGE_PADDING = 8
local messagesLayout = create("UIListLayout", {
	SortOrder = Enum.SortOrder.LayoutOrder,
	Padding = UDim.new(0, 3),
	Parent = messagesFrame,
})
padding(MESSAGE_PADDING, 10, MESSAGE_PADDING, 10).Parent = messagesFrame

local newMessagesPill = create("TextButton", {
	Name = "NewMessages",
	AnchorPoint = Vector2.new(0.5, 1),
	Position = UDim2.new(0.5, 0, 1, -8),
	Size = UDim2.fromOffset(0, 26),
	AutomaticSize = Enum.AutomaticSize.X,
	BackgroundColor3 = THEME.Accent,
	Text = TEXT.NewMessages,
	TextSize = 13,
	TextColor3 = THEME.Text,
	AutoButtonColor = true,
	Visible = false,
	ZIndex = 5,
	Parent = chatWindow,
}, { corner(UDim.new(1, 0)), padding(0, 12, 0, 12) })
setFont(newMessagesPill, Enum.FontWeight.SemiBold)

-- 5.3 Thanh nhập ---------------------------------------------------------------

local inputBar = create("Frame", {
	Name = "ChatInputBar",
	BackgroundColor3 = THEME.InputBg,
	BackgroundTransparency = THEME.InputBgTransparency,
	Position = UDim2.fromOffset(0, CONFIG.WindowHeight + 6),
	Size = UDim2.new(1, 0, 0, CONFIG.InputHeight),
	Parent = container,
}, { corner() })

local inputStroke = create("UIStroke", {
	Color = THEME.Text,
	Thickness = 1,
	Transparency = 1,
	ApplyStrokeMode = Enum.ApplyStrokeMode.Border,
	Parent = inputBar,
})

-- Nhãn "Tới <tên>" hiện ở đầu thanh nhập khi đang ở tab thì thầm
local targetChip = create("TextLabel", {
	Name = "TargetChip",
	BackgroundTransparency = 1,
	Position = UDim2.fromOffset(12, 0),
	Size = UDim2.new(0, 0, 1, 0),
	AutomaticSize = Enum.AutomaticSize.X,
	Text = "",
	TextSize = CONFIG.TextSize,
	TextColor3 = THEME.Whisper,
	Visible = false,
	Parent = inputBar,
})
setFont(targetChip, Enum.FontWeight.SemiBold)

local textBox = create("TextBox", {
	Name = "TextBox",
	BackgroundTransparency = 1,
	Position = UDim2.fromOffset(12, 0),
	Size = UDim2.new(1, -60, 1, 0),
	ClearTextOnFocus = false,
	MultiLine = false,
	TextWrapped = false,
	ClipsDescendants = true,
	Text = "",
	PlaceholderText = IS_TOUCH and TEXT.PlaceholderTouch or TEXT.Placeholder,
	PlaceholderColor3 = THEME.SubText,
	TextColor3 = THEME.Text,
	TextSize = CONFIG.TextSize,
	TextXAlignment = Enum.TextXAlignment.Left,
	Parent = inputBar,
})
setFont(textBox)

local charCounter = create("TextLabel", {
	Name = "CharCounter",
	AnchorPoint = Vector2.new(1, 0.5),
	BackgroundTransparency = 1,
	Position = UDim2.new(1, -46, 0.5, 0),
	Size = UDim2.fromOffset(52, 20),
	Text = "",
	TextSize = 12,
	TextColor3 = THEME.SubText,
	TextXAlignment = Enum.TextXAlignment.Right,
	Visible = false,
	Parent = inputBar,
})
setFont(charCounter)

local sendButton = create("TextButton", {
	Name = "SendButton",
	AnchorPoint = Vector2.new(1, 0.5),
	Position = UDim2.new(1, -5, 0.5, 0),
	Size = UDim2.fromOffset(32, 32),
	BackgroundColor3 = THEME.Text,
	BackgroundTransparency = 1,
	Text = "➤",
	TextSize = 18,
	TextColor3 = THEME.SubText,
	AutoButtonColor = false,
	Parent = inputBar,
}, { corner(UDim.new(1, 0)) })
setFont(sendButton, Enum.FontWeight.Bold)

screenGui.Parent = PlayerGui

--==============================================================================
-- 6. BỐ CỤC (topbar, kích thước màn hình)
--==============================================================================

local function getTopbar(): (number, number)
	-- Trả về (x bắt đầu vùng trống trên topbar, chiều cao topbar)
	local ok, rect = pcall(function()
		return GuiService.TopbarInset
	end)
	if ok and typeof(rect) == "Rect" and rect.Height > 0 then
		return rect.Min.X, rect.Height
	end
	local inset = GuiService:GetGuiInset()
	return 60, math.max(inset.Y, 36)
end

local windowHeight = CONFIG.WindowHeight

local function layout()
	local topX, topHeight = getTopbar()
	local buttonSize = math.clamp(topHeight - 14, 30, 44)
	chatButton.Size = UDim2.fromOffset(buttonSize, buttonSize)
	chatButton.Position = UDim2.fromOffset(topX + 4, math.floor((topHeight - buttonSize) / 2))

	local camera = workspace.CurrentCamera
	local viewport = camera and camera.ViewportSize or Vector2.new(1280, 720)
	local width = math.min(CONFIG.WindowWidth, viewport.X - 16)
	local height = CONFIG.WindowHeight
	if IS_TOUCH or viewport.Y < 500 then
		height = math.clamp(math.floor(viewport.Y * 0.3), 110, CONFIG.WindowHeight)
	end
	windowHeight = height

	container.Position = UDim2.fromOffset(8, topHeight + 4)
	container.Size = UDim2.fromOffset(width, height + 6 + CONFIG.InputHeight)
	chatWindow.Size = UDim2.new(1, 0, 0, height)
	inputBar.Position = UDim2.fromOffset(0, height + 6)
end

local function layoutInput()
	if targetChip.Visible then
		local chipWidth = targetChip.AbsoluteSize.X
		textBox.Position = UDim2.fromOffset(12 + chipWidth + 6, 0)
		textBox.Size = UDim2.new(1, -(12 + chipWidth + 6 + 48), 1, 0)
	else
		textBox.Position = UDim2.fromOffset(12, 0)
		textBox.Size = UDim2.new(1, -60, 1, 0)
	end
end

layout()
pcall(function()
	GuiService:GetPropertyChangedSignal("TopbarInset"):Connect(layout)
end)
local function watchCamera()
	local camera = workspace.CurrentCamera
	if camera then
		camera:GetPropertyChangedSignal("ViewportSize"):Connect(layout)
	end
end
watchCamera()
workspace:GetPropertyChangedSignal("CurrentCamera"):Connect(function()
	watchCamera()
	layout()
end)
targetChip:GetPropertyChangedSignal("AbsoluteSize"):Connect(layoutInput)

--==============================================================================
-- 7. TRẠNG THÁI CHAT
--==============================================================================

type ChatMessage = {
	id: number,
	kind: string, -- "chat" | "whisper" | "system"
	senderName: string?,
	displayName: string?,
	targetDisplay: string?,
	text: string,
	time: number,
	isLocal: boolean,
	color: Color3?,
}

type Channel = {
	id: string,
	title: string,
	kind: string, -- "general" | "whisper"
	target: string?, -- tên (Username) người nhận nếu là kênh thì thầm
	targetDisplay: string?,
	messages: { ChatMessage },
	unread: number,
	tab: any,
}

local channels: { [string]: Channel } = {}
local channelOrder: { string } = {}
local activeChannelId = "general"
local nextMessageId = 0
local nextTabOrder = 0

local windowOpen = not IS_TOUCH -- trên điện thoại mặc định đóng giống Roblox
local unreadWhileClosed = 0

local muted: { [string]: boolean } = {}
local lastWhisperFrom: string? = nil
local sentHistory: { string } = {}
local historyIndex = 0
local sendTimes: { number } = {}

local visibleLabels: { TextLabel } = {}
local stickToBottom = true

local lastBgActivity = os.clock()
local lastTextActivity = os.clock()
local bgShown = true
local textShown = true
local hovering = false
local focused = false

-- Hàm gán sau (khai báo trước vì gọi chéo nhau)
local Transport
local renderTabs
local switchChannel

--==============================================================================
-- 8. HIỂN THỊ TIN NHẮN
--==============================================================================

local function formatMessage(msg: ChatMessage): string
	local prefix = ""
	if CONFIG.ShowTimestamps then
		prefix = string.format('<font color="#9A9A9A">%s</font>  ', timeLabel(msg.time))
	end

	if msg.kind == "system" then
		return prefix .. string.format('<font color="%s">%s</font>', toHex(msg.color or THEME.System), escapeRich(msg.text))
	end

	local nameText
	local color
	if msg.kind == "whisper" then
		local who = msg.isLocal and (msg.targetDisplay or "?") or (msg.displayName or "?")
		nameText = string.format(msg.isLocal and TEXT.WhisperTo or TEXT.WhisperFrom, escapeRich(who))
		color = THEME.Whisper
	else
		nameText = escapeRich(msg.displayName or msg.senderName or "?")
		color = nameColor(msg.senderName or "")
	end

	if CONFIG.LegacyNameFormat or msg.kind == "whisper" then
		nameText = "[" .. nameText .. "]:"
	else
		nameText = nameText .. ":"
	end

	return prefix .. string.format('<font color="%s">%s</font> %s', toHex(color), nameText, escapeRich(msg.text))
end

local function textTransparency(): (number, number)
	if textShown then
		return 0, 0.5
	end
	return 1, 1
end

local function makeLabel(msg: ChatMessage): TextLabel
	local tt, st = textTransparency()
	local label = create("TextLabel", {
		Name = "Message_" .. msg.id,
		BackgroundTransparency = 1,
		Size = UDim2.new(1, 0, 0, 0),
		AutomaticSize = Enum.AutomaticSize.Y,
		RichText = true,
		TextWrapped = true,
		TextXAlignment = Enum.TextXAlignment.Left,
		TextYAlignment = Enum.TextYAlignment.Top,
		TextSize = CONFIG.TextSize,
		TextColor3 = THEME.Text,
		TextStrokeColor3 = Color3.new(0, 0, 0),
		TextTransparency = tt,
		TextStrokeTransparency = st,
		Text = formatMessage(msg),
		LayoutOrder = msg.id,
	})
	setFont(label)
	label.Parent = messagesFrame
	return label
end

local function isAtBottom(): boolean
	local maxY = messagesFrame.CanvasSize.Y.Offset - messagesFrame.AbsoluteWindowSize.Y
	return messagesFrame.CanvasPosition.Y >= maxY - 6
end

local function scrollToBottom()
	local maxY = math.max(0, messagesFrame.CanvasSize.Y.Offset - messagesFrame.AbsoluteWindowSize.Y)
	messagesFrame.CanvasPosition = Vector2.new(0, maxY)
	stickToBottom = true
	newMessagesPill.Visible = false
end

messagesLayout:GetPropertyChangedSignal("AbsoluteContentSize"):Connect(function()
	local contentY = messagesLayout.AbsoluteContentSize.Y + MESSAGE_PADDING * 2
	messagesFrame.CanvasSize = UDim2.fromOffset(0, contentY)
	if stickToBottom then
		scrollToBottom()
	end
end)

messagesFrame:GetPropertyChangedSignal("CanvasPosition"):Connect(function()
	stickToBottom = isAtBottom()
	if stickToBottom then
		newMessagesPill.Visible = false
	end
end)

newMessagesPill.MouseButton1Click:Connect(scrollToBottom)

local function clearLabels()
	for _, label in visibleLabels do
		label:Destroy()
	end
	table.clear(visibleLabels)
end

local function updateBadge()
	if unreadWhileClosed > 0 and not windowOpen then
		badge.Visible = true
		badgeText.Text = unreadWhileClosed > 99 and "99+" or tostring(unreadWhileClosed)
	else
		badge.Visible = false
	end
end

local function addMessage(channelId: string, msg: ChatMessage)
	local channel = channels[channelId]
	if not channel then
		return
	end

	nextMessageId += 1
	msg.id = nextMessageId
	table.insert(channel.messages, msg)
	if #channel.messages > CONFIG.MaxMessagesPerChannel then
		table.remove(channel.messages, 1)
	end

	if channelId == activeChannelId then
		local wasAtBottom = stickToBottom
		table.insert(visibleLabels, makeLabel(msg))
		if #visibleLabels > CONFIG.MaxMessagesPerChannel then
			table.remove(visibleLabels, 1):Destroy()
		end
		if not wasAtBottom and not msg.isLocal then
			newMessagesPill.Visible = true
		elseif msg.isLocal then
			stickToBottom = true
		end
	elseif msg.kind ~= "system" then
		channel.unread += 1
		renderTabs()
	end

	if msg.kind ~= "system" and not msg.isLocal and not windowOpen then
		unreadWhileClosed += 1
		updateBadge()
	end

	lastTextActivity = os.clock()
end

local function systemMessage(text: string, color: Color3?, channelId: string?)
	addMessage(channelId or activeChannelId, {
		id = 0,
		kind = "system",
		text = text,
		time = os.time(),
		isLocal = true,
		color = color,
	})
end

--==============================================================================
-- 9. KÊNH & TAB
--==============================================================================

local function createChannel(id: string, title: string, kind: string, target: string?, targetDisplay: string?): Channel
	local channel = channels[id]
	if channel then
		return channel
	end
	channel = {
		id = id,
		title = title,
		kind = kind,
		target = target,
		targetDisplay = targetDisplay,
		messages = {},
		unread = 0,
		tab = nil,
	}
	channels[id] = channel
	table.insert(channelOrder, id)
	return channel
end

local function closeChannel(id: string)
	local channel = channels[id]
	if not channel or channel.kind == "general" then
		return
	end
	if channel.tab then
		channel.tab:Destroy()
	end
	channels[id] = nil
	local index = table.find(channelOrder, id)
	if index then
		table.remove(channelOrder, index)
	end
	if activeChannelId == id then
		switchChannel("general")
	else
		renderTabs()
	end
end

local function buildTab(channel: Channel)
	nextTabOrder += 1
	local tab = create("TextButton", {
		Name = "Tab_" .. channel.id,
		BackgroundColor3 = THEME.Text,
		BackgroundTransparency = 1,
		Size = UDim2.fromOffset(0, 24),
		AutomaticSize = Enum.AutomaticSize.X,
		Text = "",
		AutoButtonColor = false,
		LayoutOrder = nextTabOrder,
		Parent = tabBar,
	}, {
		corner(UDim.new(0, 6)),
		padding(0, 8, 0, 8),
		create("UIListLayout", {
			FillDirection = Enum.FillDirection.Horizontal,
			SortOrder = Enum.SortOrder.LayoutOrder,
			VerticalAlignment = Enum.VerticalAlignment.Center,
			Padding = UDim.new(0, 5),
		}),
	})

	local title = create("TextLabel", {
		Name = "Title",
		BackgroundTransparency = 1,
		Size = UDim2.fromScale(0, 1),
		AutomaticSize = Enum.AutomaticSize.X,
		Text = channel.title,
		TextSize = 14,
		TextColor3 = THEME.SubText,
		LayoutOrder = 1,
		Parent = tab,
	})
	setFont(title, Enum.FontWeight.SemiBold)

	local unread = create("TextLabel", {
		Name = "Unread",
		BackgroundColor3 = THEME.Badge,
		Size = UDim2.fromOffset(16, 16),
		AutomaticSize = Enum.AutomaticSize.X,
		Text = "",
		TextSize = 11,
		TextColor3 = THEME.Text,
		Visible = false,
		LayoutOrder = 2,
		Parent = tab,
	}, { corner(UDim.new(1, 0)), padding(0, 4, 0, 4) })
	setFont(unread, Enum.FontWeight.Bold)

	if channel.kind == "whisper" then
		local close = create("TextButton", {
			Name = "Close",
			BackgroundTransparency = 1,
			Size = UDim2.fromOffset(14, 14),
			Text = "×",
			TextSize = 16,
			TextColor3 = THEME.SubText,
			LayoutOrder = 3,
			Parent = tab,
		})
		setFont(close, Enum.FontWeight.Bold)
		close.MouseButton1Click:Connect(function()
			closeChannel(channel.id)
		end)
	end

	tab.MouseButton1Click:Connect(function()
		switchChannel(channel.id)
	end)
	tab.MouseEnter:Connect(function()
		if channel.id ~= activeChannelId then
			tab.BackgroundTransparency = 0.92
		end
	end)
	tab.MouseLeave:Connect(function()
		tab.BackgroundTransparency = channel.id == activeChannelId and 0.88 or 1
	end)

	channel.tab = tab
end

function renderTabs()
	if not CONFIG.ShowChannelTabs then
		return
	end
	for _, id in channelOrder do
		local channel = channels[id]
		if not channel.tab then
			buildTab(channel)
		end
		local tab = channel.tab
		local isActive = id == activeChannelId
		tab.BackgroundTransparency = isActive and 0.88 or 1
		tab.Title.TextColor3 = isActive and THEME.Text or THEME.SubText
		tab.Unread.Visible = channel.unread > 0
		tab.Unread.Text = channel.unread > 99 and "99+" or tostring(channel.unread)
	end
end

local function updateTargetChip()
	local channel = channels[activeChannelId]
	if channel and channel.kind == "whisper" then
		targetChip.Visible = true
		targetChip.Text = "[" .. string.format(TEXT.WhisperTo, channel.targetDisplay or channel.target or "?") .. "]"
	else
		targetChip.Visible = false
		targetChip.Text = ""
	end
	layoutInput()
end

function switchChannel(id: string)
	local channel = channels[id]
	if not channel then
		return
	end
	activeChannelId = id
	channel.unread = 0
	clearLabels()
	for _, msg in channel.messages do
		table.insert(visibleLabels, makeLabel(msg))
	end
	stickToBottom = true
	newMessagesPill.Visible = false
	task.defer(scrollToBottom)
	renderTabs()
	updateTargetChip()
	lastTextActivity = os.clock()
end

local function whisperChannelId(name: string): string
	return "whisper:" .. string.lower(name)
end

local function ensureWhisperChannel(name: string, displayName: string?): Channel
	local id = whisperChannelId(name)
	local channel = createChannel(id, "@" .. (displayName or name), "whisper", name, displayName or name)
	renderTabs()
	return channel
end

--==============================================================================
-- 10. HIỆN / ẨN, MỜ DẦN
--==============================================================================

local function setIcon(on: boolean)
	icon.BackgroundTransparency = on and 0 or 1
	iconStroke.Enabled = not on
	iconTail.Visible = on
	for _, dot in iconDots do
		dot.BackgroundColor3 = on and THEME.TopbarButtonBg or THEME.Text
	end
end

local function setWindowOpen(open: boolean)
	windowOpen = open
	container.Visible = open
	setIcon(open)
	if open then
		unreadWhileClosed = 0
		lastBgActivity = os.clock()
		lastTextActivity = os.clock()
		task.defer(scrollToBottom)
	elseif textBox:IsFocused() then
		textBox:ReleaseFocus()
	end
	updateBadge()
end

local function applyBackground(show: boolean)
	if bgShown == show then
		return
	end
	bgShown = show
	local d = show and 0.15 or 0.6
	tween(chatWindow, d, { BackgroundTransparency = show and THEME.WindowBgTransparency or 1 })
	tween(inputBar, d, { BackgroundTransparency = show and THEME.InputBgTransparency or THEME.InputBgFaded })
	tween(messagesFrame, d, { ScrollBarImageTransparency = show and 0.6 or 1 })
	tween(tabDivider, d, { BackgroundTransparency = show and 0.88 or 1 })
	tabBar.Visible = CONFIG.ShowChannelTabs and show
	tabDivider.Visible = CONFIG.ShowChannelTabs
end

local function applyText(show: boolean)
	if textShown == show then
		return
	end
	textShown = show
	local tt, st = textTransparency()
	for _, label in visibleLabels do
		tween(label, show and 0.15 or 1, { TextTransparency = tt, TextStrokeTransparency = st })
	end
end

chatButton.MouseButton1Click:Connect(function()
	setWindowOpen(not windowOpen)
end)
chatButton.MouseEnter:Connect(function()
	chatButton.BackgroundTransparency = 0.15
end)
chatButton.MouseLeave:Connect(function()
	chatButton.BackgroundTransparency = 0.3
end)

local function pointInside(gui: GuiObject, point: Vector2): boolean
	local pos, size = gui.AbsolutePosition, gui.AbsoluteSize
	return point.X >= pos.X and point.X <= pos.X + size.X and point.Y >= pos.Y and point.Y <= pos.Y + size.Y
end

-- Vòng lặp nhẹ (10 lần/giây) xử lý hover + mờ dần
task.spawn(function()
	while screenGui.Parent do
		local now = os.clock()
		if windowOpen then
			if not IS_TOUCH then
				-- GetMouseLocation tính cả inset topbar; screenGui IgnoreGuiInset=true nên cùng hệ toạ độ
				hovering = pointInside(container, UserInputService:GetMouseLocation())
			end
			if hovering or focused then
				lastBgActivity = now
				lastTextActivity = now
			end
			applyBackground(now - lastBgActivity < CONFIG.BackgroundFadeDelay)
			applyText(now - lastTextActivity < CONFIG.TextFadeDelay)
		end
		task.wait(0.1)
	end
end)

if IS_TOUCH then
	-- Trên cảm ứng: chạm vào khung chat thì hiện lại nền
	container.InputBegan:Connect(function(input)
		if input.UserInputType == Enum.UserInputType.Touch then
			lastBgActivity = os.clock()
			lastTextActivity = os.clock()
		end
	end)
end

--==============================================================================
-- 11. BONG BÓNG CHAT TRÊN ĐẦU
--==============================================================================

local bubbleGuis: { [Player]: { gui: BillboardGui, list: Frame } } = {}

local function getBubbleHolder(player: Player)
	local character = player.Character
	local head = character and character:FindFirstChild("Head")
	if not head then
		return nil
	end
	local entry = bubbleGuis[player]
	if entry and entry.gui.Parent and entry.gui.Adornee == head then
		return entry
	end
	if entry then
		entry.gui:Destroy()
	end
	local gui = create("BillboardGui", {
		Name = "CustomChatBubbles_" .. player.Name,
		Adornee = head,
		Size = UDim2.fromOffset(260, 220),
		SizeOffset = Vector2.new(0, 0.5), -- đáy khung đặt ngay trên đầu
		StudsOffset = Vector3.new(0, 1.6, 0),
		MaxDistance = 100,
		ResetOnSpawn = false,
		LightInfluence = 0,
	})
	local list = create("Frame", {
		Name = "List",
		BackgroundTransparency = 1,
		Size = UDim2.fromScale(1, 1),
		Parent = gui,
	}, {
		create("UIListLayout", {
			SortOrder = Enum.SortOrder.LayoutOrder,
			VerticalAlignment = Enum.VerticalAlignment.Bottom,
			HorizontalAlignment = Enum.HorizontalAlignment.Center,
			Padding = UDim.new(0, 6),
		}),
	})
	gui.Parent = PlayerGui
	entry = { gui = gui, list = list }
	bubbleGuis[player] = entry
	return entry
end

Players.PlayerRemoving:Connect(function(player)
	local entry = bubbleGuis[player]
	if entry then
		entry.gui:Destroy()
		bubbleGuis[player] = nil
	end
end)

local bubbleOrder = 0
local function showBubble(player: Player?, text: string)
	if not CONFIG.BubbleChat or not player then
		return
	end
	local holder = getBubbleHolder(player)
	if not holder then
		return
	end

	-- Bỏ đuôi của các bong bóng cũ, chỉ bong bóng mới nhất có đuôi
	local existing = {}
	for _, child in holder.list:GetChildren() do
		if child:IsA("Frame") then
			table.insert(existing, child)
			local tail = child:FindFirstChild("Tail")
			if tail then
				tail.Visible = false
			end
		end
	end
	table.sort(existing, function(a, b)
		return a.LayoutOrder < b.LayoutOrder
	end)
	while #existing >= CONFIG.MaxBubbles do
		table.remove(existing, 1):Destroy()
	end

	bubbleOrder += 1
	local bubble = create("Frame", {
		Name = "Bubble",
		BackgroundColor3 = THEME.Bubble,
		Size = UDim2.fromOffset(0, 0),
		AutomaticSize = Enum.AutomaticSize.XY,
		LayoutOrder = bubbleOrder,
	}, {
		corner(UDim.new(0, 12)),
		padding(8, 12, 8, 12),
		create("UIScale", { Scale = 0.6 }),
	})
	local label = create("TextLabel", {
		BackgroundTransparency = 1,
		Size = UDim2.fromOffset(0, 0),
		AutomaticSize = Enum.AutomaticSize.XY,
		Text = text,
		TextWrapped = true,
		TextSize = 16,
		TextColor3 = THEME.BubbleText,
		Parent = bubble,
	}, { create("UISizeConstraint", { MaxSize = Vector2.new(220, math.huge) }) })
	setFont(label)
	create("Frame", {
		Name = "Tail",
		AnchorPoint = Vector2.new(0.5, 0.5),
		BackgroundColor3 = THEME.Bubble,
		BorderSizePixel = 0,
		Position = UDim2.new(0.5, 0, 1, 8),
		Size = UDim2.fromOffset(10, 10),
		Rotation = 45,
		ZIndex = 0,
		Parent = bubble,
	})
	bubble.Parent = holder.list
	tween(bubble.UIScale, 0.15, { Scale = 1 })

	task.delay(CONFIG.BubbleLifetime, function()
		if bubble.Parent then
			tween(bubble, 0.3, { BackgroundTransparency = 1 })
			tween(label, 0.3, { TextTransparency = 1 })
			local tail = bubble:FindFirstChild("Tail")
			if tail then
				tween(tail, 0.3, { BackgroundTransparency = 1 })
			end
			task.wait(0.32)
			bubble:Destroy()
		end
	end)
end

--==============================================================================
-- 12. NHẬN TIN TỪ TRANSPORT
--==============================================================================

--[[
	Định dạng 1 tin nhận được (server sau này cũng gửi về đúng dạng này):
	{
		kind   = "chat" | "whisper" | "system",
		sender = { name = "Username", displayName = "Tên hiển thị", userId = 123 },
		target = { name = "...", displayName = "..." },   -- chỉ có khi kind = "whisper"
		text   = "nội dung (server đã lọc bằng TextService)",
	}
]]
local function onIncoming(packet)
	if type(packet) ~= "table" or type(packet.text) ~= "string" then
		return
	end

	if packet.kind == "system" then
		systemMessage(packet.text, nil, "general")
		return
	end

	local sender = packet.sender or {}
	local senderName = tostring(sender.name or "?")
	if muted[string.lower(senderName)] then
		return
	end
	local isLocal = senderName == LocalPlayer.Name
	local displayName = CONFIG.UseDisplayName and (sender.displayName or senderName) or senderName

	local msg: ChatMessage = {
		id = 0,
		kind = packet.kind == "whisper" and "whisper" or "chat",
		senderName = senderName,
		displayName = displayName,
		text = packet.text,
		time = os.time(),
		isLocal = isLocal,
	}

	if msg.kind == "whisper" then
		local target = packet.target or {}
		local other = isLocal and target or sender
		local otherName = tostring(other.name or "?")
		local otherDisplay = CONFIG.UseDisplayName and (other.displayName or otherName) or otherName
		msg.targetDisplay = CONFIG.UseDisplayName and (target.displayName or target.name) or target.name
		local channel = ensureWhisperChannel(otherName, otherDisplay)
		if not isLocal then
			lastWhisperFrom = otherName
		end
		addMessage(channel.id, msg)
	else
		addMessage("general", msg)
		showBubble(Players:FindFirstChild(senderName) :: Player?, packet.text)
	end
end

--==============================================================================
-- 13. LỆNH CHAT
--==============================================================================

-- Tìm người chơi theo tên / tên hiển thị (gõ thiếu cũng được, không phân biệt hoa thường)
local function findPlayer(query: string)
	query = string.lower(query)
	local candidates = {}
	for _, player in Players:GetPlayers() do
		table.insert(candidates, { name = player.Name, displayName = player.DisplayName, userId = player.UserId })
	end
	for _, info in Transport.ListUsers() do
		table.insert(candidates, info)
	end

	local prefixMatch = nil
	for _, info in candidates do
		local n, d = string.lower(info.name), string.lower(info.displayName or info.name)
		if n == query or d == query then
			return info
		end
		if not prefixMatch and (string.sub(n, 1, #query) == query or string.sub(d, 1, #query) == query) then
			prefixMatch = info
		end
	end
	return prefixMatch
end

local function isSpamming(): boolean
	local now = os.clock()
	for i = #sendTimes, 1, -1 do
		if now - sendTimes[i] > CONFIG.SpamWindow then
			table.remove(sendTimes, i)
		end
	end
	if #sendTimes >= CONFIG.SpamLimit then
		return true
	end
	table.insert(sendTimes, now)
	return false
end

local function sendChat(text: string, channel: Channel)
	if utf8Length(text) > CONFIG.MaxMessageLength then
		systemMessage(string.format(TEXT.TooLong, CONFIG.MaxMessageLength))
		return
	end
	if isSpamming() then
		systemMessage(TEXT.TooFast)
		return
	end
	if channel.kind == "whisper" then
		Transport.Send({ kind = "whisper", target = channel.target, text = text })
	else
		Transport.Send({ kind = "chat", text = text })
	end
end

local function startWhisper(query: string, message: string?)
	local info = findPlayer(query)
	if not info then
		systemMessage(string.format(TEXT.PlayerNotFound, query))
		return
	end
	if info.name == LocalPlayer.Name then
		systemMessage(TEXT.CannotWhisperSelf)
		return
	end
	local display = CONFIG.UseDisplayName and (info.displayName or info.name) or info.name
	local isNew = channels[whisperChannelId(info.name)] == nil
	local channel = ensureWhisperChannel(info.name, display)
	switchChannel(channel.id)
	if isNew then
		systemMessage(string.format(TEXT.WhisperStarted, display), THEME.Whisper)
	end
	if message and message ~= "" then
		sendChat(message, channel)
	end
end

local EMOTES = { wave = true, point = true, dance = true, dance2 = true, dance3 = true, laugh = true, cheer = true }

local function playEmote(name: string)
	name = string.lower(name)
	if not EMOTES[name] then
		systemMessage(TEXT.EmoteUnknown)
		return
	end
	-- Script "Animate" mặc định của nhân vật có BindableFunction "PlayEmote"
	local ok = pcall(function()
		local character = LocalPlayer.Character
		local animate = character and character:FindFirstChild("Animate")
		local bindable = animate and animate:FindFirstChild("PlayEmote")
		assert(bindable, "no PlayEmote")
		bindable:Invoke(name)
	end)
	if not ok then
		systemMessage(TEXT.EmoteFailed)
	end
end

-- Trả về true nếu đã xử lý như một lệnh (không gửi đi)
local function handleCommand(text: string): boolean
	local command, rest = string.match(text, "^/(%S+)%s*(.*)$")
	if not command then
		return false
	end
	command = string.lower(command)
	rest = rest or ""

	if command == "?" or command == "help" then
		systemMessage(TEXT.HelpTitle)
		for _, line in TEXT.Help do
			systemMessage("  " .. line)
		end
		return true
	elseif command == "w" or command == "whisper" then
		local target, message = string.match(rest, "^(%S+)%s*(.*)$")
		if not target then
			systemMessage(string.format(TEXT.Usage, "/w <tên> [tin]"))
		else
			startWhisper(target, message)
		end
		return true
	elseif command == "r" or command == "reply" then
		if not lastWhisperFrom then
			systemMessage(TEXT.NoReplyTarget)
		else
			startWhisper(lastWhisperFrom, rest)
		end
		return true
	elseif command == "mute" or command == "unmute" then
		local query = string.match(rest, "^(%S+)")
		if not query then
			systemMessage(string.format(TEXT.Usage, "/" .. command .. " <tên>"))
			return true
		end
		local info = findPlayer(query)
		local name = info and info.name or query
		local key = string.lower(name)
		if command == "mute" then
			muted[key] = true
			systemMessage(string.format(TEXT.Muted, name))
		elseif muted[key] then
			muted[key] = nil
			systemMessage(string.format(TEXT.Unmuted, name))
		else
			systemMessage(string.format(TEXT.NotMuted, name))
		end
		return true
	elseif command == "clear" or command == "cls" then
		local channel = channels[activeChannelId]
		table.clear(channel.messages)
		clearLabels()
		systemMessage(TEXT.Cleared)
		return true
	elseif command == "e" or command == "emote" then
		playEmote(rest)
		return true
	end

	return false -- lệnh lạ: gửi như tin nhắn thường (giống Roblox)
end

local function submit(raw: string)
	local text = trim(raw)
	if text == "" then
		return
	end
	table.insert(sentHistory, text)
	if #sentHistory > 50 then
		table.remove(sentHistory, 1)
	end
	historyIndex = #sentHistory + 1

	if string.sub(text, 1, 1) == "/" and handleCommand(text) then
		return
	end
	sendChat(text, channels[activeChannelId])
end

--==============================================================================
-- 14. NHẬP LIỆU
--==============================================================================

local function updateInputVisuals()
	local length = utf8Length(textBox.Text)
	local hasText = trim(textBox.Text) ~= ""
	sendButton.TextColor3 = hasText and THEME.Text or THEME.SubText
	sendButton.BackgroundTransparency = hasText and 0.85 or 1
	local nearLimit = length >= CONFIG.MaxMessageLength - 50
	charCounter.Visible = nearLimit
	charCounter.Text = string.format("%d/%d", length, CONFIG.MaxMessageLength)
	charCounter.TextColor3 = length >= CONFIG.MaxMessageLength and THEME.Badge or THEME.SubText
	local reserve = nearLimit and 104 or 48
	local left = textBox.Position.X.Offset
	textBox.Size = UDim2.new(1, -(left + reserve), 1, 0)
end

textBox:GetPropertyChangedSignal("Text"):Connect(function()
	if utf8Length(textBox.Text) > CONFIG.MaxMessageLength then
		textBox.Text = utf8Truncate(textBox.Text, CONFIG.MaxMessageLength)
		return
	end
	updateInputVisuals()
end)

textBox.Focused:Connect(function()
	focused = true
	tween(inputStroke, 0.12, { Transparency = 0.6 })
end)

textBox.FocusLost:Connect(function(enterPressed)
	focused = false
	tween(inputStroke, 0.12, { Transparency = 1 })
	if enterPressed then
		local text = textBox.Text
		textBox.Text = ""
		submit(text)
	end
end)

sendButton.MouseButton1Click:Connect(function()
	local text = textBox.Text
	textBox.Text = ""
	submit(text)
end)

UserInputService.InputBegan:Connect(function(input, gameProcessed)
	if input.UserInputType ~= Enum.UserInputType.Keyboard then
		return
	end
	local focusedBox = UserInputService:GetFocusedTextBox()

	-- Lịch sử tin đã gửi: ↑ / ↓ khi đang gõ
	if focusedBox == textBox and (input.KeyCode == Enum.KeyCode.Up or input.KeyCode == Enum.KeyCode.Down) then
		if #sentHistory == 0 then
			return
		end
		if input.KeyCode == Enum.KeyCode.Up then
			historyIndex = math.max(1, historyIndex - 1)
		else
			historyIndex = math.min(#sentHistory + 1, historyIndex + 1)
		end
		textBox.Text = sentHistory[historyIndex] or ""
		textBox.CursorPosition = #textBox.Text + 1
		return
	end

	-- Phím "/" mở chat (giống Roblox)
	if input.KeyCode == Enum.KeyCode.Slash and not gameProcessed and focusedBox == nil then
		if not windowOpen then
			setWindowOpen(true)
		end
		task.defer(function()
			textBox:CaptureFocus()
			task.wait()
			-- Không để lại ký tự "/" vừa bấm để mở chat
			if textBox.Text == "/" then
				textBox.Text = ""
			end
		end)
	end
end)

--==============================================================================
-- 15. TRANSPORT  (★ CHỖ NỐI SERVER SAU NÀY ★)
--==============================================================================

--[[
	Giao diện chỉ nói chuyện với bảng `Transport`, gồm 3 hàm:

	  Transport.Send(payload)
	      payload = { kind = "chat", text = "..." }
	             hoặc { kind = "whisper", target = "Username", text = "..." }

	  Transport.ListUsers() -> { { name, displayName, userId }, ... }
	      danh sách người chat ngoài Players (dùng cho /w, /mute). Có thể trả {}.

	  Transport.Start(onIncoming)
	      bắt đầu nhận tin; mỗi tin gọi onIncoming(packet) — định dạng ở mục 12.

	Hiện chưa có server nên dùng MockTransport bên dưới.
	Khi bạn đưa server, mình sẽ viết RemoteTransport (RemoteEvent / HTTP / ...)
	và chỉ cần đổi dòng `Transport = MockTransport`.
]]

local MockTransport = {}

local MOCK_USERS = {
	{ name = "Minh_Pro2010", displayName = "Minh", userId = -101 },
	{ name = "LanAnh_Cute", displayName = "Lan Anh", userId = -102 },
	{ name = "NoobMaster69", displayName = "NoobMaster", userId = -103 },
	{ name = "TranHuy_VN", displayName = "Huy", userId = -104 },
	{ name = "BuilderKid", displayName = "BuilderKid", userId = -105 },
}

local MOCK_CHATTER = {
	"có ai chơi obby không",
	"hello mọi người 👋",
	"server này lag ghê",
	"ai cho mình xin bạn bè với",
	"gg",
	"lol",
	"mình mới vào, chỉ mình với",
	"đi farm không mn",
	"wow skin đẹp vậy",
	"brb, ăn cơm xíu",
	"ai biết chỗ lấy kiếm không?",
	"team mình thắng rồi 🎉",
}

local MOCK_REPLIES = {
	"chào %s!",
	"%s nói đúng đó",
	"ok %s",
	"haha %s",
	"%s ơi qua đây nè",
	"đồng ý với %s",
}

local MOCK_WHISPER_REPLIES = {
	"ừ mình đây, có gì không?",
	"ok để mình qua",
	"bí mật nha 🤫",
	"mình đang bận chút, lát nói nha",
	"kết bạn đi!",
}

local mockByName = {}
for _, u in MOCK_USERS do
	mockByName[string.lower(u.name)] = u
end

local mockListener = nil

local function me()
	return { name = LocalPlayer.Name, displayName = LocalPlayer.DisplayName, userId = LocalPlayer.UserId }
end

local function pick(list)
	return list[math.random(1, #list)]
end

local function emit(packet)
	if mockListener then
		mockListener(packet)
	end
end

function MockTransport.ListUsers()
	return CONFIG.DemoMode and MOCK_USERS or {}
end

function MockTransport.Send(payload)
	-- Tin của mình: hiện lại ngay (server thật sẽ lọc rồi gửi về cho mọi người)
	local targetInfo = nil
	if payload.kind == "whisper" then
		targetInfo = mockByName[string.lower(payload.target or "")]
		if not targetInfo then
			local p = Players:FindFirstChild(payload.target or "")
			targetInfo = p and { name = p.Name, displayName = p.DisplayName, userId = p.UserId }
				or { name = payload.target, displayName = payload.target }
		end
	end
	task.delay(0.05, function()
		emit({ kind = payload.kind, sender = me(), target = targetInfo, text = payload.text })
	end)

	if not CONFIG.DemoMode then
		return
	end

	-- Bot phản hồi cho vui
	if payload.kind == "whisper" then
		local bot = mockByName[string.lower(payload.target or "")]
		if bot then
			task.delay(1.5 + math.random() * 2, function()
				emit({ kind = "whisper", sender = bot, target = me(), text = pick(MOCK_WHISPER_REPLIES) })
			end)
		end
	elseif math.random() < 0.5 then
		local bot = pick(MOCK_USERS)
		task.delay(1 + math.random() * 2.5, function()
			emit({ kind = "chat", sender = bot, text = string.format(pick(MOCK_REPLIES), LocalPlayer.DisplayName) })
		end)
	end
end

function MockTransport.Start(listener)
	mockListener = listener
	if not CONFIG.DemoMode then
		return
	end
	emit({ kind = "system", text = TEXT.DemoNotice })
	task.spawn(function()
		task.wait(2)
		while screenGui.Parent do
			emit({ kind = "chat", sender = pick(MOCK_USERS), text = pick(MOCK_CHATTER) })
			-- Thỉnh thoảng có người thì thầm riêng với mình
			if math.random() < 0.12 then
				task.wait(1)
				emit({ kind = "whisper", sender = pick(MOCK_USERS), target = me(), text = "psst, ra spawn gặp mình nha" })
			end
			task.wait(CONFIG.DemoChatterMin + math.random() * (CONFIG.DemoChatterMax - CONFIG.DemoChatterMin))
		end
	end)
end

Transport = MockTransport

--==============================================================================
-- 16. KHỞI ĐỘNG
--==============================================================================

createChannel("general", TEXT.General, "general")
renderTabs()
switchChannel("general")
setWindowOpen(windowOpen)
updateInputVisuals()

systemMessage(TEXT.Welcome)
Transport.Start(onIncoming)
