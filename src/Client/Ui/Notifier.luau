--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  GUI-001, GUI-002, GUI-003, GUI-004, GUI-005, GUI-006, GUI-007, GUI-010,
	  GUI-011, GUI-012, GUI-013
	===== RALO.METHODS:END ===== --]]

--[[
	Client/Ui/Notifier.luau
	===== RALO.METHODS:GUI-001, GUI-002, GUI-003, GUI-004, GUI-005, GUI-006,
	                    GUI-007, GUI-010, GUI-011, GUI-012, GUI-013 =====

	GUI THÔNG BÁO CỦA HỆ THỐNG TỐI ƯU (đặc tả Part 6 & Part 7).

	HÌNH THỨC (đúng theo đặc tả, không thêm bớt):
	  * góc DƯỚI BÊN PHẢI, định vị bằng AnchorPoint (1,1) + Position
	  * bo góc (UICorner), VIỀN CẦU VỒNG CHẠY (UIStroke + UIGradient xoay hue)
	  * nền XÁM ĐẬM BÁN TRONG SUỐT, chữ tương phản cao
	  * KHÔNG kéo được (không có input kéo nào)
	  * KHÔNG phát âm thanh (không tạo instance Sound nào)
	  * KHÔNG di chuyển GUI khác (chỉ tạo instance trong ScreenGui của mình)

	NỘI DUNG:
	  * tiêu đề "ANTI-LAG OPTIMIZER"
	  * trạng thái "Đang tối ưu hiệu năng"
	  * thanh tiến trình 0-100% + số phần trăm
	  * mô tả ngắn nhóm việc đang chạy
	  * khi xong: "Hoàn tất tối ưu"; khi lỗi: trạng thái lỗi thật

	VÒNG ĐỜI (Part 7):
	  * hiện ngay khi LocalScript chạy, ở lại ~30 giây
	  * phần trăm KHÔNG BAO GIỜ vượt 100%
	  * HOẠT ẢNH ĐỘC LẬP với việc thực thi thật: đây là ĐỒNG HỒ 30 GIÂY,
	    không phải "phần trăm số phương pháp đã tối ưu". Nhãn trên GUI nói rõ
	    điều đó để không gây hiểu lầm.
	  * không có delay nhân tạo; xong sớm thì GUI vẫn ở cho đủ thời lượng
	    nhưng KHÔNG chạy lại tác vụ nào
	  * thất bại -> ghi log và hiện LỖI, không hiện thành công
	  * hết thời lượng -> trượt xuống + mờ dần (TweenService) -> dọn sạch
	    GUI, connection, tài nguyên
	  * không tự hiện lại sau khi đã ẩn, trừ khi gọi Build lại có chủ đích
]]

local Client_Env = __RALO_REQUIRE("Client/Core/Env")
local Client_Guard = __RALO_REQUIRE("Client/Core/Guard")
local Client_Registry = __RALO_REQUIRE("Client/Core/Registry")
local Client_Scheduler = __RALO_REQUIRE("Client/Core/Scheduler")
local Shared_Log = __RALO_REQUIRE("Shared/Log")
local Shared_Types = __RALO_REQUIRE("Shared/Types")
local Ui_GuiPolicy = __RALO_REQUIRE("Client/Ui/GuiPolicy")
local Ui_Theme = __RALO_REQUIRE("Client/Ui/Theme")
local Ui_Widget = __RALO_REQUIRE("Client/Ui/Widget")

local SCOPE = "Notifier"

local Notifier = {}
Notifier.__index = Notifier

Notifier.instance = nil            -- singleton: chỉ MỘT GUI tồn tại
Notifier.DEFAULTS = {
	title = "ANTI-LAG OPTIMIZER",
	status = "Đang tối ưu hiệu năng",
	done = "Hoàn tất tối ưu",
	failed = "Tối ưu thất bại",
	durationSeconds = 30,
	fadeSeconds = 0.45,
	slideOffset = 90,
	width = 320,
	marginRight = 16,
	marginBottom = 16,
	backgroundAlpha = 0.72,
	cornerRadius = 12,
	borderWidth = 2,
	rainbowSpeed = 0.5,
}

-- Trả về GUI đang tồn tại (hoặc nil). Dùng cho Pipeline khi cần báo lỗi.
function Notifier.Get()
	return Notifier.instance
end

-- Kẹp phần trăm vào 0..100. Chốt chặn "không bao giờ vượt 100%".
function Notifier.ClampPercent(value)
	local n = tonumber(value)
	if n ~= n or n == nil then            -- NaN hoặc nil
		return 0
	end
	if n < 0 then
		return 0
	end
	if n > 100 then
		return 100
	end
	return math.floor(n + 0.5)
end

--[[
	Dựng GUI. `options.parent` là PlayerGui.
	Nếu đã có GUI thì TÁI SỬ DỤNG, không tạo bản thứ hai (GUI-002).
]]
function Notifier.Build(options)
	options = options or {}

	-- GUI-002: không bao giờ có hai GUI cùng lúc
	if Notifier.instance ~= nil then
		Shared_Log.Info(SCOPE, "GUI đã tồn tại — tái sử dụng, không dựng bản thứ hai")
		return Notifier.instance
	end

	local profile = options.profile or {}
	local guiProfile = profile.gui or {}

	local self = setmetatable({}, Notifier)
	self.settings = {
		title = Notifier.DEFAULTS.title,
		status = Notifier.DEFAULTS.status,
		done = Notifier.DEFAULTS.done,
		failed = Notifier.DEFAULTS.failed,
		durationSeconds = math.max(0, tonumber(guiProfile.durationSeconds)
			or Notifier.DEFAULTS.durationSeconds),
		fadeSeconds = math.max(0.05, tonumber(guiProfile.fadeSeconds) or Notifier.DEFAULTS.fadeSeconds),
		slideOffset = math.max(0, tonumber(guiProfile.slideOffset) or Notifier.DEFAULTS.slideOffset),
		width = math.max(180, tonumber(guiProfile.width) or Notifier.DEFAULTS.width),
		marginRight = math.max(0, tonumber(guiProfile.marginRight) or Notifier.DEFAULTS.marginRight),
		marginBottom = math.max(0, tonumber(guiProfile.marginBottom) or Notifier.DEFAULTS.marginBottom),
		backgroundAlpha = tonumber(guiProfile.backgroundAlpha) or Notifier.DEFAULTS.backgroundAlpha,
		cornerRadius = math.max(0, tonumber(guiProfile.cornerRadius) or Notifier.DEFAULTS.cornerRadius),
		borderWidth = math.max(1, tonumber(guiProfile.borderWidth) or Notifier.DEFAULTS.borderWidth),
		rainbowSpeed = tonumber(guiProfile.rainbowSpeed) or Notifier.DEFAULTS.rainbowSpeed,
		enabled = guiProfile.enabled ~= false,
	}

	self.progress = options.progress
	self.steps = options.steps
	self.onRestore = options.onRestore
	self.percent = 0                 -- đồng hồ 30 giây, KHÔNG phải % phương pháp
	self.hiding = false
	self.hidden = false
	self.finished = false
	self.verdict = nil
	self.handles = {}
	self.elapsed = 0

	if not self.settings.enabled then
		Shared_Log.Info(SCOPE, "gui.enabled = false -> không dựng GUI")
		return nil
	end

	---------------------------------------------------------- dựng cây GUI
	local screenGui, reused = Ui_GuiPolicy.AcquireScreenGui(options.parent)
	if screenGui == nil then
		Shared_Log.Warn(SCOPE, "không có nơi treo GUI -> bỏ qua GUI, tối ưu vẫn chạy")
		return nil
	end
	self.screenGui = screenGui
	self.reused = reused

	self.frame = self:_BuildFrame(screenGui)
	if self.frame == nil then
		return nil
	end

	Notifier.instance = self
	self:_Wire()
	self:_Render()

	Shared_Log.Info(SCOPE, ("GUI đã dựng (%s), %d node, thời lượng %ds")
		:format(reused and "tái sử dụng ScreenGui" or "ScreenGui mới",
			Ui_GuiPolicy.CountNodes(screenGui), self.settings.durationSeconds))

	return self
end

-- Dựng khung và các nhãn. Trả về frame hoặc nil.
function Notifier:_BuildFrame(screenGui)
	local s = self.settings

	-- Khung nền: xám đậm bán trong suốt, bo góc, viền cầu vồng
	local frame = Ui_Widget.New("Frame", {
		Name = "RALO_Panel",
		AnchorPoint = Ui_Theme.AnchorPoint,                       -- (1,1) = dưới phải
		Position = UDim2.new(1, -s.marginRight, 1, -s.marginBottom),
		Size = UDim2.new(0, s.width, 0, 108),
		BackgroundColor3 = Ui_Theme.Background,
		BackgroundTransparency = s.backgroundAlpha,
		BorderSizePixel = 0,
		Active = false,          -- GUI-010: KHÔNG tương tác, không kéo được
		Selectable = false,
		ZIndex = 2,
	}, screenGui)
	if frame == nil then
		return nil
	end
	Ui_Widget.Corners(frame, UDim.new(0, s.cornerRadius))

	-- Viền cầu vồng: UIStroke + UIGradient; hue được xoay theo thời gian
	local stroke = Ui_Widget.Stroke(frame, Color3.fromRGB(255, 80, 80), s.borderWidth, 0)
	self.gradient = Ui_Widget.New("UIGradient", {
		Rotation = 0,
		Color = ColorSequence.new(Ui_Theme.RainbowColors(0)),
	}, stroke)

	Ui_Widget.Padding(frame, 12)
	Ui_Widget.List(frame, 6)

	-- Tiêu đề
	self.titleLabel = Ui_Widget.Text(frame, {
		Name = "Title",
		Text = s.title,
		Font = Ui_Theme.FontBold,
		TextSize = 15,
		TextColor3 = Ui_Theme.TextPrimary,
		Size = UDim2.new(1, 0, 0, 18),
		LayoutOrder = 1,
	})

	-- Trạng thái
	self.statusLabel = Ui_Widget.Text(frame, {
		Name = "Status",
		Text = s.status,
		Font = Ui_Theme.Font,
		TextSize = 12,
		TextColor3 = Ui_Theme.TextSecondary,
		Size = UDim2.new(1, 0, 0, 14),
		LayoutOrder = 2,
	})

	-- Thanh tiến trình: track + fill
	self.track = Ui_Widget.New("Frame", {
		Name = "ProgressTrack",
		BackgroundColor3 = Ui_Theme.Track,
		BackgroundTransparency = 0.25,
		BorderSizePixel = 0,
		Size = UDim2.new(1, 0, 0, 8),
		LayoutOrder = 3,
	}, frame)
	Ui_Widget.Corners(self.track, UDim.new(1, 0))

	self.fill = Ui_Widget.New("Frame", {
		Name = "ProgressFill",
		BackgroundColor3 = Ui_Theme.TextSuccess,
		BorderSizePixel = 0,
		Size = UDim2.new(0, 0, 1, 0),
		ZIndex = 3,
	}, self.track)
	Ui_Widget.Corners(self.fill, UDim.new(1, 0))
	self.fillGradient = Ui_Widget.New("UIGradient", {
		Color = ColorSequence.new(Ui_Theme.RainbowColors(0)),
	}, self.fill)

	-- Dòng phần trăm + nhãn giải thích
	self.percentLabel = Ui_Widget.Text(frame, {
		Name = "Percent",
		Text = "0%",
		Font = Ui_Theme.FontBold,
		TextSize = 13,
		TextColor3 = Ui_Theme.TextPrimary,
		Size = UDim2.new(1, 0, 0, 14),
		LayoutOrder = 4,
	})

	-- Mô tả nhóm việc đang chạy
	self.taskLabel = Ui_Widget.Text(frame, {
		Name = "CurrentTask",
		Text = "chuẩn bị",
		Font = Ui_Theme.Font,
		TextSize = 11,
		TextColor3 = Ui_Theme.TextSecondary,
		TextWrapped = true,
		TextTruncate = Enum.TextTruncate.AtEnd,
		Size = UDim2.new(1, 0, 0, 14),
		LayoutOrder = 5,
	})

	-- KHUNG KẾT QUẢ: chỉ hiện khi xong
	self.resultPanel = Ui_Widget.New("Frame", {
		Name = "Results",
		BackgroundColor3 = Ui_Theme.PanelBackground,
		BackgroundTransparency = Ui_Theme.PanelAlpha,
		BorderSizePixel = 0,
		Size = UDim2.new(1, 0, 0, 0),
		Visible = false,
		LayoutOrder = 6,
	}, frame)
	Ui_Widget.Corners(self.resultPanel, UDim.new(0, 8))
	Ui_Widget.Padding(self.resultPanel, 8)
	self.resultList = Ui_Widget.List(self.resultPanel, 3)

	self.resultLabel = Ui_Widget.Text(self.resultPanel, {
		Name = "ResultText",
		Text = "",
		Font = Ui_Theme.Font,
		TextSize = 11,
		TextColor3 = Ui_Theme.TextPrimary,
		TextWrapped = true,
		TextYAlignment = Enum.TextYAlignment.Top,
		Size = UDim2.new(1, 0, 0, 60),
		LayoutOrder = 1,
	})

	-- Nút hoàn tác (chỉ hiện sau khi xong, và chỉ khi có gì để hoàn tác)
	self.restoreButton = Ui_Widget.Button(self.resultPanel, {
		Name = "RestoreButton",
		Text = "Hoàn tác thay đổi",
		Size = UDim2.new(1, 0, 0, 26),
		TextSize = 12,
		Visible = false,
		LayoutOrder = 2,
	})

	-- Nút đóng
	self.closeButton = Ui_Widget.Button(self.resultPanel, {
		Name = "CloseButton",
		Text = "Đóng",
		Size = UDim2.new(1, 0, 0, 26),
		TextSize = 12,
		Visible = false,
		LayoutOrder = 3,
	})

	return frame
end

--[[
	Nối các kết nối. MỌI kết nối đi qua Registry để có thể ngắt hết.
]]
function Notifier:_Wire()
	local tweenService = Client_Env.GetService("TweenService")
	self.tweenService = tweenService

	-- 1) đồng hồ 30 giây + viền cầu vồng, chạy qua Scheduler
	--    (KHÔNG mở RenderStepped riêng — xem LOOP-001)
	local handle = Client_Scheduler.Schedule({
		name = "notifier.animate",
		interval = 0,                       -- mỗi khung hình
		priority = -30,                     -- ưu tiên thấp nhất: GUI không tranh CPU
		callback = function(deltaTime)
			self:_Tick(deltaTime)
		end,
	})
	if handle ~= nil then
		self.handles[#self.handles + 1] = handle
	end

	-- 2) theo dõi tiến trình thật để cập nhật mô tả việc đang chạy
	if self.progress ~= nil and self.progress.Changed ~= nil then
		local progressHandle = Client_Registry.Connect(self.progress.Changed.Event, function(payload)
			self:_OnProgress(payload)
		end, "notifier.progress")
		if progressHandle ~= nil then
			self.handles[#self.handles + 1] = progressHandle
		end
	end

	-- 3) nút bấm
	if self.restoreButton ~= nil and self.onRestore ~= nil then
		local restoreHandle = Client_Registry.Connect(self.restoreButton.Activated, function()
			self.onRestore()
		end, "notifier.restore")
		if restoreHandle ~= nil then
			self.handles[#self.handles + 1] = restoreHandle
		end
	end
	if self.closeButton ~= nil then
		local closeHandle = Client_Registry.Connect(self.closeButton.Activated, function()
			self:Hide()
		end, "notifier.close")
		if closeHandle ~= nil then
			self.handles[#self.handles + 1] = closeHandle
		end
	end
end

-- Một nhịp của đồng hồ 30 giây và viền cầu vồng.
function Notifier:_Tick(deltaTime)
	if self.hidden or self.hiding then
		return
	end
	local dt = tonumber(deltaTime) or 0

	-- GUI-006: GUI đã ẩn thì không chạy hoạt ảnh
	if not Ui_GuiPolicy.ShouldAnimate(self.screenGui, true) then
		return
	end

	-- ĐỒNG HỒ 30 GIÂY — độc lập với tiến trình thật (Part 7).
	-- Đây KHÔNG phải "% số phương pháp đã tối ưu"; nhãn GUI nói rõ.
	self.elapsed += dt
	if self.settings.durationSeconds > 0 then
		self.percent = Notifier.ClampPercent((self.elapsed / self.settings.durationSeconds) * 100)
	else
		self.percent = 100
	end

	-- Viền cầu vồng: xoay hue
	self.hue = ((self.hue or 0) + dt * self.settings.rainbowSpeed) % 1
	local colors = Ui_Theme.RainbowColors(self.hue)
	if self.gradient ~= nil then
		Ui_GuiPolicy.SetIfChanged(self.gradient, "Color", ColorSequence.new(colors))
	end
	if self.fillGradient ~= nil then
		Ui_GuiPolicy.SetIfChanged(self.fillGradient, "Color", ColorSequence.new(colors))
	end

	self:_Render()

	-- Hết thời lượng -> trượt xuống + mờ dần
	if self.settings.durationSeconds > 0 and self.elapsed >= self.settings.durationSeconds then
		self:Hide()
	end
end

-- Cập nhật mô tả từ tiến trình thật (KHÔNG đụng vào đồng hồ 30 giây).
function Notifier:_OnProgress(payload)
	if payload == nil then
		return
	end
	self.taskText = tostring(payload.message or "")
	local counts = payload.counts
	if counts ~= nil then
		self.countsText = ("áp dụng %d · bỏ qua %d · lỗi %d")
			:format(counts.applied or 0, counts.skipped or 0, counts.failed or 0)
	end
	self:_Render()
end

-- Cập nhật mô tả nhóm việc đang chạy (Pipeline gọi trực tiếp).
function Notifier:SetCurrentTask(text)
	self.taskText = tostring(text or "")
	self:_Render()
end

-- Vẽ lại. GUI-004/GUI-007: chỉ ghi khi giá trị khác, không tính layout mỗi frame.
function Notifier:_Render()
	if self.frame == nil then
		return
	end
	local percent = Notifier.ClampPercent(self.percent)

	if self.statusLabel ~= nil then
		local text
		if self.verdict == "error" then
			text = self.settings.failed
		elseif self.finished then
			text = self.settings.done
		else
			text = self.settings.status
		end
		Ui_GuiPolicy.SetIfChanged(self.statusLabel, "Text", text)
		Ui_GuiPolicy.SetIfChanged(self.statusLabel, "TextColor3",
			self.verdict == "error" and Ui_Theme.TextError
			or (self.finished and Ui_Theme.TextSuccess or Ui_Theme.TextSecondary))
	end

	if self.percentLabel ~= nil then
		Ui_GuiPolicy.SetIfChanged(self.percentLabel, "Text", ("%d%%"):format(percent))
	end

	if self.fill ~= nil then
		Ui_GuiPolicy.SetIfChanged(self.fill, "Size", UDim2.new(percent / 100, 0, 1, 0))
	end

	if self.taskLabel ~= nil then
		local text = self.taskText or "chuẩn bị"
		if self.countsText ~= nil then
			text = text .. "  (" .. self.countsText .. ")"
		end
		Ui_GuiPolicy.SetIfChanged(self.taskLabel, "Text", text)
	end
end

--[[
	Hiện kết quả. `verdict`:
	  "improved" | "regressed" | "unchanged" | "restored" | "error"
	Part 7: lỗi KHÔNG được hiển thị như thành công.
]]
function Notifier:SetResults(lines, verdict)
	if self.frame == nil then
		return false
	end
	self.verdict = verdict
	self.finished = verdict ~= "error"

	local text = table.concat(lines or {}, "\n")
	if self.resultLabel ~= nil then
		Ui_GuiPolicy.SetIfChanged(self.resultLabel, "Text", text)
		Ui_GuiPolicy.SetIfChanged(self.resultLabel, "TextColor3",
			verdict == "error" and Ui_Theme.TextError or Ui_Theme.TextPrimary)
	end

	if self.resultPanel ~= nil then
		Ui_GuiPolicy.SetIfChanged(self.resultPanel, "Visible", true)
	end
	if self.closeButton ~= nil then
		Ui_GuiPolicy.SetIfChanged(self.closeButton, "Visible", true)
	end
	if self.restoreButton ~= nil then
		Ui_GuiPolicy.SetIfChanged(self.restoreButton, "Visible", self.onRestore ~= nil)
	end

	-- Khi đã có kết quả thì không tự ẩn nữa: để người dùng đọc
	self.percent = 100
	self.finishedHold = true
	self:_Render()
	return true
end

--[[
	Ẩn GUI: trượt xuống + mờ dần bằng TweenService (GUI-003),
	sau đó dọn sạch (GUI-011). Không chạy lại tác vụ nào.
]]
function Notifier:Hide()
	if self.hiding or self.hidden then
		return false
	end
	self.hiding = true

	local settings = self.settings
	local done = false

	local function finish()
		if done then
			return
		end
		done = true
		self:_Cleanup()
	end

	if self.tweenService ~= nil and self.frame ~= nil then
		local ok, tween = Client_Guard.Run(SCOPE .. ":Tween", function()
			return self.tweenService:Create(self.frame,
				TweenInfo.new(settings.fadeSeconds, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
				{
					Position = UDim2.new(1, -settings.marginRight,
						1, -settings.marginBottom + settings.slideOffset),
					BackgroundTransparency = 1,
				})
		end)
		if ok and tween ~= nil then
			local completed = Client_Registry.Connect(tween.Completed, function()
				finish()
			end, "notifier.tween")
			if completed ~= nil then
				self.handles[#self.handles + 1] = completed
			end
			-- Mờ cả chữ và viền cùng lúc
			Client_Guard.Run(SCOPE .. ":Fade", function()
				for _, label in { self.titleLabel, self.statusLabel, self.percentLabel, self.taskLabel } do
					if label ~= nil then
						self.tweenService:Create(label,
							TweenInfo.new(settings.fadeSeconds),
							{ TextTransparency = 1 }):Play()
					end
				end
				if self.track ~= nil then
					self.tweenService:Create(self.track,
						TweenInfo.new(settings.fadeSeconds),
						{ BackgroundTransparency = 1 }):Play()
				end
			end)
			Client_Guard.Run(SCOPE .. ":Play", function()
				tween:Play()
			end)
			return true
		end
	end

	-- Không có TweenService (harness) -> dọn ngay
	finish()
	return true
end

-- Dọn sạch: ngắt connection của riêng GUI này, huỷ GUI, xoá singleton.
function Notifier:_Cleanup()
	self.hidden = true

	-- Ngắt CHỈ những connection GUI này tạo
	for _, handle in ipairs(self.handles) do
		Client_Guard.Run(SCOPE .. ":Disconnect", function()
			handle:Disconnect()
		end)
	end
	table.clear(self.handles)

	-- GUI-011: chỉ huỷ GUI do hệ thống tạo (GuiPolicy kiểm tra Name)
	if self.screenGui ~= nil and not self.reused then
		Ui_GuiPolicy.DestroyScreenGui(self.screenGui)
	elseif self.screenGui ~= nil then
		-- Tái sử dụng ScreenGui cũ: chỉ gỡ khung của mình, giữ ScreenGui
		Client_Guard.Run(SCOPE .. ":RemoveFrame", function()
			self.frame:Destroy()
		end)
	end

	if self.progress ~= nil then
		Client_Guard.Run(SCOPE .. ":DestroyProgress", function()
			self.progress:Destroy()
		end)
	end

	self.frame = nil
	self.screenGui = nil
	Notifier.instance = nil
	Shared_Log.Info(SCOPE, "GUI đã ẩn và dọn sạch (connection, instance, bộ lập lịch)")
	return true
end

--[[
	Huỷ ngay không hoạt ảnh. Dùng khi tắt hệ thống.
]]
function Notifier:Destroy()
	if self.hiding or self.hidden then
		return true
	end
	self.hiding = true
	return self:_Cleanup()
end

-- Trạng thái để test kiểm tra
function Notifier:State()
	return {
		percent = Notifier.ClampPercent(self.percent),
		elapsed = self.elapsed,
		hidden = self.hidden,
		hiding = self.hiding,
		finished = self.finished,
		verdict = self.verdict,
		connections = #self.handles,
		nodes = self.screenGui ~= nil and Ui_GuiPolicy.CountNodes(self.screenGui) or 0,
		reused = self.reused == true,
	}
end

function Notifier.Reset()
	local current = Notifier.instance
	if current ~= nil then
		current:Destroy()
	end
	Notifier.instance = nil
end

return Notifier
