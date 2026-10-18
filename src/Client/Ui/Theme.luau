--[[
	Ui/Theme.luau
	Bảng màu và hằng số giao diện.

	Yêu cầu cụ thể của bạn:
	  * menu CẦU VỒNG  -> dải UIGradient đi hết vòng màu, dịch chuyển theo thời gian
	  * NỀN XÁM BÁN TRONG SUỐT -> Gray #2E2E33 với BackgroundTransparency ~0.62
	  * GÓC DƯỚI BÊN PHẢI -> AnchorPoint (1,1) + Position UDim2.new(1, -margin, 1, -margin)
	Tất cả hằng số đó nằm ở đây để dễ đổi.
]]

local Util_Hsv = __RALO_REQUIRE("Shared/Hsv")

local Theme = {}

Theme.Background = Color3.fromRGB(46, 46, 51)     -- xám tối
Theme.BackgroundAlpha = 0.62                       -- bán trong suốt
Theme.PanelBackground = Color3.fromRGB(24, 24, 28)
Theme.PanelAlpha = 0.45
Theme.TextPrimary = Color3.fromRGB(240, 240, 245)
Theme.TextSecondary = Color3.fromRGB(176, 178, 190)
Theme.TextSuccess = Color3.fromRGB(126, 231, 135)
Theme.TextWarning = Color3.fromRGB(255, 208, 110)
Theme.TextError = Color3.fromRGB(255, 122, 122)
Theme.Track = Color3.fromRGB(60, 60, 68)

Theme.CornerRadius = UDim.new(0, 12)
Theme.Font = Enum.Font.GothamMedium
Theme.FontBold = Enum.Font.GothamBold

Theme.AnchorPoint = Vector2.new(1, 1)              -- góc dưới bên phải
Theme.Position = UDim2.new(1, -14, 1, -14)         -- sẽ được Config ghi đè margin

Theme.RainbowStops = 8
Theme.RainbowSaturation = 0.85
Theme.RainbowValue = 1.0

--[[
	Tính 8 Color3 cầu vồng bắt đầu từ hueOffset (0..1).
	Hàm này THUẦN LOGIC và được unit test bằng các mốc màu đã biết.
]]
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

-- Màu trạng thái cho từng bước
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
