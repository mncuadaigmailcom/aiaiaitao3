--[[
	doors-entity-radar/src/Client/Ui/Theme.luau
	ModuleScript — đặt tại: DoorsEntityRadar.Client.Ui.Theme

	CHỦ ĐỀ GIAO DIỆN. Chỉ chứa màu, phông, kích thước — không có logic.
	Tách riêng để đổi giao diện không đụng vào code hành vi.

	LƯU Ý: dự án KHÔNG đổi đồ hoạ/âm thanh/vật lý của DOORS. Mọi thứ ở đây
	chỉ vẽ lên ScreenGui của chính người chơi.
]]

local Theme = {}

Theme.Font = {
	title = Enum.Font.GothamBold,
	heading = Enum.Font.GothamMedium,
	body = Enum.Font.Gotham,
	mono = Enum.Font.RobotoMono,
}

Theme.TextSize = {
	title = 17,
	heading = 14,
	body = 13,
	small = 11,
	tiny = 10,
}

Theme.Color = {
	background = Color3.fromRGB(18, 20, 26),
	panelEdge = Color3.fromRGB(46, 52, 66),
	headerBackground = Color3.fromRGB(24, 27, 34),
	rowBackground = Color3.fromRGB(28, 32, 40),
	rowBackgroundAlt = Color3.fromRGB(32, 36, 45),
	rowSelected = Color3.fromRGB(40, 56, 78),
	detailBackground = Color3.fromRGB(24, 27, 34),
	textPrimary = Color3.fromRGB(228, 232, 240),
	textSecondary = Color3.fromRGB(158, 166, 180),
	textMuted = Color3.fromRGB(112, 120, 134),
	accent = Color3.fromRGB(96, 165, 250),
	accentDark = Color3.fromRGB(37, 62, 96),
	danger = Color3.fromRGB(235, 96, 96),
	warning = Color3.fromRGB(240, 190, 80),
	ok = Color3.fromRGB(86, 220, 130),
	inputBackground = Color3.fromRGB(14, 16, 21),
}

Theme.Metrics = {
	cornerRadius = UDim.new(0, 8),
	rowHeight = 30,
	headerHeight = 46,
	-- Chiều cao thanh tab và thanh chọn thực thể (tab system mới).
	tabBarHeight = 34,
	selectionBarHeight = 30,
	filterHeight = 36,
	statusHeight = 30,
	padding = 10,
	gap = 6,
	buttonWidth = 84,
	-- Số dòng tối đa được dựng trong danh sách. Danh mục có 82 mục nên 200
	-- là đủ; giới hạn này chỉ để không bao giờ dựng vô hạn frame.
	maxRows = 200,
}

-- Màu chấm trạng thái lấy từ Shared/Status để không lệch nhau.
local Shared_Status = __DER_REQUIRE("Shared/Status")

function Theme.StatusColor(code)
	local rgb = Shared_Status.Color[code]
	if rgb == nil then
		return Theme.Color.textMuted
	end
	return Color3.fromRGB(rgb[1], rgb[2], rgb[3])
end

function Theme.KindColor(kind)
	if kind == "entity" then
		return Theme.Color.danger
	end
	if kind == "npc" then
		return Theme.Color.ok
	end
	if kind == "prop" then
		return Theme.Color.textSecondary
	end
	if kind == "event" then
		return Theme.Color.warning
	end
	return Theme.Color.textMuted
end

return Theme
