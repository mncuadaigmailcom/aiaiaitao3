--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  GUI-001, GUI-002, GUI-003, GUI-004, GUI-005, GUI-006, GUI-007, GUI-010,
	  GUI-011, GUI-012, GUI-013
	===== RALO.METHODS:END ===== --]]

--[[
	Client/Ui/Notifier.luau
	Bảng trạng thái nhỏ, không có menu điều khiển:
	  * cố định ở góc dưới bên phải, không nhận kéo / chọn / nút bấm;
	  * nền xám bán trong suốt, viền cầu vồng;
	  * hiển thị "đang giảm lag" và tiến trình 1–100%;
	  * tự ẩn sau 30 giây, dọn connection và instance do mình tạo.

	Phần trăm là hoạt ảnh thời lượng hiển thị, KHÔNG phải lời hứa về mức FPS.
	Nếu pipeline hoàn tất sớm, bảng chuyển sang trạng thái hoàn tất và phần trăm
	được chốt ở 100%. Nếu có lỗi, trạng thái lỗi được giữ nguyên (không báo thành công).
]]

local Client_Env = __RALO_REQUIRE("Client/Core/Env")
local Client_Guard = __RALO_REQUIRE("Client/Core/Guard")
local Client_Registry = __RALO_REQUIRE("Client/Core/Registry")
local Client_Scheduler = __RALO_REQUIRE("Client/Core/Scheduler")
local Shared_Log = __RALO_REQUIRE("Shared/Log")
local Ui_GuiPolicy = __RALO_REQUIRE("Client/Ui/GuiPolicy")
local Ui_Theme = __RALO_REQUIRE("Client/Ui/Theme")
local Ui_Widget = __RALO_REQUIRE("Client/Ui/Widget")

local SCOPE = "Notifier"

local Notifier = {}
Notifier.__index = Notifier

Notifier.instance = nil
Notifier.DEFAULTS = {
	title = "TỐI ƯU HIỆU NĂNG",
	status = "đang giảm lag",
	done = "Đã giảm lag xong",
	failed = "Tối ưu gặp lỗi — xem Output",
	durationSeconds = 30,
	fadeSeconds = 0.45,
	slideOffset = 70,
	width = 288,
	marginRight = 16,
	marginBottom = 16,
	backgroundAlpha = 0.42,
	cornerRadius = 10,
	borderWidth = 2,
	rainbowSpeed = 0.35,	-- vòng/giây; chỉ cập nhật 10 lần/giây
	updateInterval = 0.1,
}

function Notifier.Get()
	return Notifier.instance
end

-- Kẹp phần trăm vào 0..100. Không để giá trị bất thường tràn khỏi thanh.
function Notifier.ClampPercent(value)
	local n = tonumber(value)
	if n == nil or n ~= n then
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

-- Dựng bảng trạng thái. `options.parent` là PlayerGui.
function Notifier.Build(options)
	options = options or {}

	if Notifier.instance ~= nil then
		Shared_Log.Info(SCOPE, "bảng đã tồn tại — dùng lại, không tạo bản trùng")
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
		backgroundAlpha = math.clamp(tonumber(guiProfile.backgroundAlpha)
			or Notifier.DEFAULTS.backgroundAlpha, 0, 1),
		cornerRadius = math.max(0, tonumber(guiProfile.cornerRadius) or Notifier.DEFAULTS.cornerRadius),
		borderWidth = math.max(1, tonumber(guiProfile.borderWidth) or Notifier.DEFAULTS.borderWidth),
		rainbowSpeed = math.max(0, tonumber(guiProfile.rainbowSpeed) or Notifier.DEFAULTS.rainbowSpeed),
		updateInterval = math.max(0.05, tonumber(guiProfile.updateInterval)
			or Notifier.DEFAULTS.updateInterval),
		enabled = guiProfile.enabled ~= false,
	}

	self.percent = 1
	self.elapsed = 0
	self.startedAt = Client_Env.now()
	self.statusText = self.settings.status
	self.hiding = false
	self.hidden = false
	self.finished = false
	self.verdict = nil
	self.handles = {}

	if not self.settings.enabled then
		Shared_Log.Info(SCOPE, "gui.enabled = false -> không dựng bảng")
		return nil
	end

	local screenGui, reused = Ui_GuiPolicy.AcquireScreenGui(options.parent)
	if screenGui == nil then
		Shared_Log.Warn(SCOPE, "không có PlayerGui -> bỏ qua bảng; pipeline vẫn chạy")
		return nil
	end
	self.screenGui = screenGui
	self.reused = reused

	self.frame = self:_BuildFrame(screenGui)
	if self.frame == nil then
		if not reused then
			Ui_GuiPolicy.DestroyScreenGui(screenGui)
		end
		return nil
	end

	Notifier.instance = self
	self:_Wire()
	self:_Render()

	Shared_Log.Info(SCOPE, ("bảng trạng thái đã dựng (%s), %d node, tự ẩn sau %ds")
		:format(reused and "dùng lại ScreenGui" or "ScreenGui mới",
			Ui_GuiPolicy.CountNodes(screenGui), self.settings.durationSeconds))
	return self
end

-- Chỉ có nhãn trạng thái, thanh tiến trình và phần trăm; không tạo menu/nút bấm.
function Notifier:_BuildFrame(screenGui)
	local s = self.settings

	local frame = Ui_Widget.New("Frame", {
		Name = "RALO_Panel",
		AnchorPoint = Ui_Theme.AnchorPoint,
		Position = UDim2.new(1, -s.marginRight, 1, -s.marginBottom),
		Size = UDim2.new(0, s.width, 0, 96),
		BackgroundColor3 = Ui_Theme.Background,
		BackgroundTransparency = s.backgroundAlpha,
		BorderSizePixel = 0,
		Active = false,		-- GUI-010: không nhận thao tác kéo
		Selectable = false,
		Visible = true,
		ZIndex = 10,
	}, screenGui)
	if frame == nil then
		return nil
	end
	self.frame = frame
	Ui_Widget.Corners(frame, UDim.new(0, s.cornerRadius))

	local stroke = Ui_Widget.Stroke(frame, Color3.fromRGB(255, 80, 80), s.borderWidth, 0)
	self.stroke = stroke
	self.gradient = Ui_Widget.New("UIGradient", {
		Rotation = 0,
		Color = Ui_Theme.RainbowSequence(0),
	}, stroke)

	Ui_Widget.Padding(frame, 10)
	Ui_Widget.List(frame, 4)

	self.titleLabel = Ui_Widget.Text(frame, {
		Name = "Title",
		Text = s.title,
		Font = Ui_Theme.FontBold,
		TextSize = 14,
		TextColor3 = Ui_Theme.TextPrimary,
		Size = UDim2.new(1, 0, 0, 18),
		LayoutOrder = 1,
		ZIndex = 11,
	})

	self.statusLabel = Ui_Widget.Text(frame, {
		Name = "Status",
		Text = s.status,
		Font = Ui_Theme.Font,
		TextSize = 12,
		TextColor3 = Ui_Theme.TextSecondary,
		Size = UDim2.new(1, 0, 0, 14),
		LayoutOrder = 2,
		ZIndex = 11,
	})

	self.track = Ui_Widget.New("Frame", {
		Name = "ProgressTrack",
		BackgroundColor3 = Ui_Theme.Track,
		BackgroundTransparency = 0.2,
		BorderSizePixel = 0,
		Size = UDim2.new(1, 0, 0, 8),
		LayoutOrder = 3,
		ZIndex = 11,
	}, frame)
	Ui_Widget.Corners(self.track, UDim.new(1, 0))

	self.fill = Ui_Widget.New("Frame", {
		Name = "ProgressFill",
		BackgroundColor3 = Ui_Theme.ProgressFill,
		BorderSizePixel = 0,
		Size = UDim2.new(0.01, 0, 1, 0),
		ZIndex = 12,
	}, self.track)
	Ui_Widget.Corners(self.fill, UDim.new(1, 0))

	self.percentLabel = Ui_Widget.Text(frame, {
		Name = "Percent",
		Text = "1%",
		Font = Ui_Theme.FontBold,
		TextSize = 13,
		TextColor3 = Ui_Theme.TextPrimary,
		Size = UDim2.new(1, 0, 0, 14),
		LayoutOrder = 4,
		ZIndex = 11,
	})

	return frame
end

function Notifier:_Wire()
	self.tweenService = Client_Env.GetService("TweenService")

	-- Không chạy một callback mỗi frame: 10 lần/giây là đủ cho thanh và viền,
	-- đồng hồ vẫn dựa trên thời gian thực nên thời lượng không bị kéo dài.
	local handle = Client_Scheduler.Schedule({
		name = "notifier.animate",
		interval = self.settings.updateInterval,
		priority = -30,
		callback = function(deltaTime, now)
			self:_Tick(deltaTime, now)
		end,
	})
	if handle ~= nil then
		self.handles[#self.handles + 1] = handle
	end
end

-- Đồng hồ hiển thị và viền cầu vồng; callback chạy tối đa 10 lần/giây.
function Notifier:_Tick(_deltaTime, now)
	if self.hidden or self.hiding then
		return
	end
	if not Ui_GuiPolicy.ShouldAnimate(self.screenGui, true) then
		return
	end

	local currentTime = tonumber(now) or Client_Env.now()
	self.elapsed = math.max(self.elapsed, currentTime - self.startedAt)

	if not self.finished and self.verdict ~= "error" then
		if self.settings.durationSeconds > 0 then
			local timedPercent = (self.elapsed / self.settings.durationSeconds) * 100
			self.percent = math.max(1, Notifier.ClampPercent(timedPercent))
		else
			self.percent = 100
		end
	end

	self.hue = (self.elapsed * self.settings.rainbowSpeed) % 1
	if self.gradient ~= nil then
		Ui_GuiPolicy.SetIfChanged(self.gradient, "Color", Ui_Theme.RainbowSequence(self.hue))
	end
	self:_Render()

	if self.settings.durationSeconds > 0 and self.elapsed >= self.settings.durationSeconds then
		self:Hide()
	end
end

function Notifier:_Render()
	if self.frame == nil then
		return
	end

	local percent = math.max(1, Notifier.ClampPercent(self.percent))
	if self.statusLabel ~= nil then
		Ui_GuiPolicy.SetIfChanged(self.statusLabel, "Text", self.statusText or self.settings.status)
		local color = Ui_Theme.TextSecondary
		if self.verdict == "error" then
			color = Ui_Theme.TextError
		elseif self.finished then
			color = Ui_Theme.TextSuccess
		end
		Ui_GuiPolicy.SetIfChanged(self.statusLabel, "TextColor3", color)
	end
	if self.percentLabel ~= nil then
		Ui_GuiPolicy.SetIfChanged(self.percentLabel, "Text", ("%d%%"):format(percent))
	end
	if self.fill ~= nil then
		Ui_GuiPolicy.SetIfChanged(self.fill, "Size", UDim2.new(percent / 100, 0, 1, 0))
	end
end

-- Kết quả chi tiết được ghi trong Output; trên bảng chỉ đổi trạng thái, không có menu.
function Notifier:SetResults(lines, verdict)
	if self.frame == nil then
		return false
	end

	self.verdict = verdict
	self.finished = verdict ~= "error"
	self.resultLines = lines
	if verdict == "error" then
		self.statusText = self.settings.failed
	else
		self.statusText = self.settings.done
		self.percent = 100
	end
	self:_Render()
	return true
end

-- Trượt xuống và mờ dần; nếu TweenService lỗi thì dọn ngay.
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

			Client_Guard.Run(SCOPE .. ":Fade", function()
				for _, label in { self.titleLabel, self.statusLabel, self.percentLabel } do
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
				if self.fill ~= nil then
					self.tweenService:Create(self.fill,
						TweenInfo.new(settings.fadeSeconds),
						{ BackgroundTransparency = 1 }):Play()
				end
				if self.stroke ~= nil then
					self.tweenService:Create(self.stroke,
						TweenInfo.new(settings.fadeSeconds),
						{ Transparency = 1 }):Play()
				end
			end)
			Client_Guard.Run(SCOPE .. ":Play", function()
				tween:Play()
			end)
			return true
		end
	end

	finish()
	return true
end

-- Dọn chỉ những connection/instance bảng đã tạo.
function Notifier:_Cleanup()
	self.hidden = true
	for _, handle in ipairs(self.handles) do
		Client_Guard.Run(SCOPE .. ":Disconnect", function()
			handle:Disconnect()
		end)
	end
	table.clear(self.handles)

	if self.screenGui ~= nil and not self.reused then
		Ui_GuiPolicy.DestroyScreenGui(self.screenGui)
	elseif self.frame ~= nil then
		Client_Guard.Run(SCOPE .. ":RemoveFrame", function()
			self.frame:Destroy()
		end)
	end

	self.frame = nil
	self.screenGui = nil
	Notifier.instance = nil
	Shared_Log.Info(SCOPE, "bảng đã ẩn và dọn sạch connection / instance")
	return true
end

function Notifier:Destroy()
	if self.hiding or self.hidden then
		return true
	end
	self.hiding = true
	return self:_Cleanup()
end

function Notifier:State()
	return {
		percent = Notifier.ClampPercent(self.percent),
		elapsed = self.elapsed,
		hidden = self.hidden,
		hiding = self.hiding,
		finished = self.finished,
		verdict = self.verdict,
		status = self.statusText,
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
