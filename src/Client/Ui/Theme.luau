--[[
	Ui/Theme.luau
	Bảng màu và hằng số giao diện.

	Yêu cầu giao diện:
	  * viền cầu vồng, tạo ColorSequence hợp lệ cho UIGradient;
	  * nền xám đậm bán trong suốt;
	  * cố định ở góc dưới bên phải.
]]

local Util_Hsv = __RALO_REQUIRE("Shared/Hsv")

local Theme = {}

Theme.Background = Color3.fromRGB(46, 46, 51)
Theme.BackgroundAlpha = 0.42
Theme.PanelBackground = Color3.fromRGB(24, 24, 28)
Theme.PanelAlpha = 0.45
Theme.TextPrimary = Color3.fromRGB(240, 240, 245)
Theme.TextSecondary = Color3.fromRGB(190, 192, 202)
Theme.TextSuccess = Color3.fromRGB(126, 231, 135)
Theme.TextWarning = Color3.fromRGB(255, 208, 110)
Theme.TextError = Color3.fromRGB(255, 122, 122)
Theme.Track = Color3.fromRGB(60, 60, 68)
Theme.ProgressFill = Color3.fromRGB(126, 231, 135)

Theme.CornerRadius = UDim.new(0, 10)
Theme.Font = Enum.Font.GothamMedium
Theme.FontBold = Enum.Font.GothamBold

Theme.AnchorPoint = Vector2.new(1, 1)
Theme.Position = UDim2.new(1, -16, 1, -16)

Theme.RainbowStops = 8
Theme.RainbowSaturation = 0.85
Theme.RainbowValue = 1.0

function Theme.RainbowColors(hueOffset: number): { Color3 }
	local colors = {}
	local stops = Util_Hsv.RainbowStops(Theme.RainbowStops)
	for index, base in stops do
		local hue = (base + hueOffset) % 1
		local r, g, b = Util_Hsv.ToRgb(hue, Theme.RainbowSaturation, Theme.RainbowValue)
		colors[index] = Color3.new(r, g, b)
	end
	return colors
end

-- Roblox UIGradient nhận ColorSequenceKeypoint, không bảng Color3 thuần.
function Theme.RainbowSequence(hueOffset: number): ColorSequence
	local colors = Theme.RainbowColors(hueOffset)
	local keypoints = {}
	local lastIndex = #colors
	for index, color in ipairs(colors) do
		local time = (index - 1) / math.max(1, lastIndex - 1)
		keypoints[index] = ColorSequenceKeypoint.new(time, color)
	end
	return ColorSequence.new(keypoints)
end

function Theme.StatusColor(status: string): Color3
	if status == "applied" then return Theme.TextSuccess end
	if status == "failed" then return Theme.TextError end
	if status == "running" then return Theme.TextWarning end
	if status == "skipped" then return Theme.TextSecondary end
	return Theme.TextSecondary
end

function Theme.StatusIcon(status: string): string
	if status == "applied" then return "✔" end
	if status == "failed" then return "✖" end
	if status == "running" then return "…" end
	if status == "skipped" then return "–" end
	return "○"
end

return Theme
