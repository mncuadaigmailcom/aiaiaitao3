--[[
	Ui/Widget.luau
	Lớp dựng giao diện mỏng. Mọi Instance đều đi qua Widget.New để:
	  * gán property theo bảng khai báo (dễ đọc, dễ sửa),
	  * gắn sẵn UICorner/UIListLayout khi cần,
	  * pcall toàn bộ -> UI lỗi không bao giờ làm sập pipeline tối ưu.
]]

local Util_Safe = __RALO_REQUIRE("Shared/Safe")
local Util_Log = __RALO_REQUIRE("Shared/Log")
local Ui_Theme = __RALO_REQUIRE("Client/Ui/Theme")

local SCOPE = "Widget"

local Widget = {}

function Widget.New(className: string, props: any, parent: any): any
	if parent == nil then
		Util_Log.Warn(SCOPE, "không tạo", className, "vì không có parent hợp lệ")
		return nil
	end

	local instance = nil
	local ok, err = pcall(function()
		instance = Instance.new(className)
		if type(props) == "table" then
			for key, value in props do
				instance[key] = value
			end
		end
		instance.Parent = parent
	end)
	if not ok then
		if instance ~= nil then
			pcall(function() instance.Parent = nil end)
		end
		Util_Log.Error(SCOPE, "không dựng được", className, tostring(err))
		return nil
	end
	return instance
end

function Widget.Corners(parent: any, radius: UDim?): any
	return Widget.New("UICorner", { CornerRadius = radius or Ui_Theme.CornerRadius }, parent)
end

function Widget.Stroke(parent: any, color: Color3, thickness: number, transparency: number): any
	return Widget.New("UIStroke", {
		Color = color,
		Thickness = thickness or 1,
		Transparency = transparency or 0.55,
		ApplyStrokeMode = Enum.ApplyStrokeMode.Border,
	}, parent)
end

function Widget.List(parent: any, padding: number, alignment: any): any
	return Widget.New("UIListLayout", {
		Padding = UDim.new(0, padding or 4),
		SortOrder = Enum.SortOrder.LayoutOrder,
		HorizontalAlignment = Enum.HorizontalAlignment.Center,
		VerticalAlignment = alignment or Enum.VerticalAlignment.Top,
	}, parent)
end

function Widget.Padding(parent: any, all: number): any
	return Widget.New("UIPadding", {
		PaddingTop = UDim.new(0, all),
		PaddingBottom = UDim.new(0, all),
		PaddingLeft = UDim.new(0, all),
		PaddingRight = UDim.new(0, all),
	}, parent)
end

function Widget.Text(parent: any, props: any): any
	local defaults = {
		BackgroundTransparency = 1,
		Font = Ui_Theme.Font,
		TextColor3 = Ui_Theme.TextPrimary,
		TextSize = 13,
		TextXAlignment = Enum.TextXAlignment.Left,
		TextYAlignment = Enum.TextYAlignment.Center,
		TextWrapped = false,
		RichText = true,
	}
	if type(props) == "table" then
		for key, value in props do
			defaults[key] = value
		end
	end
	return Widget.New("TextLabel", defaults, parent)
end

function Widget.Button(parent: any, props: any): any
	local defaults = {
		BackgroundColor3 = Ui_Theme.PanelBackground,
		BackgroundTransparency = 0.35,
		AutoButtonColor = true,
		Font = Ui_Theme.FontBold,
		TextColor3 = Ui_Theme.TextPrimary,
		TextSize = 14,
	}
	if type(props) == "table" then
		for key, value in props do
			defaults[key] = value
		end
	end
	local button = Widget.New("TextButton", defaults, parent)
	if button then
		Widget.Corners(button, UDim.new(0, 8))
	end
	return button
end

--[[
	Ghi property an toàn, dùng cho các cập nhật động (kích thước, transparency...)
	nơi ta không muốn một property bị khoá làm hỏng cả khung.
]]
function Widget.Set(instance: any, key: string, value: any): boolean
	local ok = Util_Safe.Set(instance, key, value, { scope = SCOPE })
	return ok
end

return Widget
