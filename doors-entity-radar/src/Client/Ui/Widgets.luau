--[[
	doors-entity-radar/src/Client/Ui/Widgets.luau
	ModuleScript — đặt tại: DoorsEntityRadar.Client.Ui.Widgets

	XƯỞNG TẠO WIDGET. Mọi instance GUI do dự án tạo đều đi qua đây và được
	đăng ký vào Registry để dọn dẹp được.

	ĐIỂM QUAN TRỌNG NHẤT VỀ HIỆU NĂNG: SetText/SetColor so sánh giá trị
	trước khi ghi. Nhờ vậy khi dữ liệu không đổi, số lần ghi property bằng 0
	(và bộ đếm Widgets.stats.skipped chứng minh điều đó trong test).
]]

local Shared_Safe = __DER_REQUIRE("Shared/Safe")
local Client_Registry = __DER_REQUIRE("Client/Core/Registry")
local Ui_Theme = __DER_REQUIRE("Client/Ui/Theme")

local Widgets = {}

Widgets.stats = { created = 0, writes = 0, skipped = 0, destroyed = 0 }

-- Ghi một property, có đếm. Chỉ dùng cho instance của dự án.
function Widgets.Set(instance, key, value)
	if instance == nil then
		return false
	end
	Widgets.stats.writes = Widgets.stats.writes + 1
	return Shared_Safe.Write(instance, key, value)
end

-- Ghi Text chỉ khi khác giá trị cũ. Trả về true nếu đã ghi.
function Widgets.SetText(instance, text)
	if instance == nil then
		return false
	end
	local nextText = tostring(text)
	local current, ok = Shared_Safe.Read(instance, "Text")
	if ok and current == nextText then
		Widgets.stats.skipped = Widgets.stats.skipped + 1
		return false
	end
	return Widgets.Set(instance, "Text", nextText)
end

-- Ghi màu chỉ khi khác. So sánh từng kênh để không phụ thuộc == của Color3.
function Widgets.SetColor(instance, key, color)
	if instance == nil or color == nil then
		return false
	end
	local current, ok = Shared_Safe.Read(instance, key)
	if ok and type(current) == "table" and type(color) == "table" then
		if current.R == color.R and current.G == color.G and current.B == color.B then
			Widgets.stats.skipped = Widgets.stats.skipped + 1
			return false
		end
	end
	return Widgets.Set(instance, key, color)
end

-- Ghi Visible chỉ khi khác.
function Widgets.SetVisible(instance, visible)
	if instance == nil then
		return false
	end
	local current, ok = Shared_Safe.Read(instance, "Visible")
	if ok and current == (visible == true) then
		Widgets.stats.skipped = Widgets.stats.skipped + 1
		return false
	end
	return Widgets.Set(instance, "Visible", visible == true)
end

local function create(className, parent, props, label)
	local ok, instance = pcall(function()
		return Instance.new(className)
	end)
	if not ok or instance == nil then
		return nil
	end
	Widgets.stats.created = Widgets.stats.created + 1
	if type(props) == "table" then
		for key, value in pairs(props) do
			Shared_Safe.Write(instance, key, value)
		end
	end
	if parent ~= nil then
		Shared_Safe.Write(instance, "Parent", parent)
	end
	if label ~= nil then
		Client_Registry.Track(instance, label)
	end
	return instance
end

function Widgets.ScreenGui(parent, props)
	return create("ScreenGui", parent, props, "gui:ScreenGui")
end

function Widgets.Frame(parent, props, label)
	return create("Frame", parent, props, label)
end

function Widgets.Label(parent, props, label)
	local defaults = {
		BackgroundTransparency = 1,
		Text = "",
		TextColor3 = Ui_Theme.Color.textPrimary,
		Font = Ui_Theme.Font.body,
		TextSize = Ui_Theme.TextSize.body,
		TextXAlignment = Enum.TextXAlignment.Left,
		TextYAlignment = Enum.TextYAlignment.Center,
	}
	if type(props) == "table" then
		for key, value in pairs(props) do
			defaults[key] = value
		end
	end
	return create("TextLabel", parent, defaults, label)
end

function Widgets.Button(parent, props, label)
	local defaults = {
		BackgroundColor3 = Ui_Theme.Color.rowBackground,
		TextColor3 = Ui_Theme.Color.textPrimary,
		Font = Ui_Theme.Font.heading,
		TextSize = Ui_Theme.TextSize.body,
		AutoButtonColor = true,
		Text = "",
	}
	if type(props) == "table" then
		for key, value in pairs(props) do
			defaults[key] = value
		end
	end
	return create("TextButton", parent, defaults, label)
end

function Widgets.TextBox(parent, props, label)
	local defaults = {
		BackgroundColor3 = Ui_Theme.Color.inputBackground,
		TextColor3 = Ui_Theme.Color.textPrimary,
		PlaceholderColor3 = Ui_Theme.Color.textMuted,
		Font = Ui_Theme.Font.body,
		TextSize = Ui_Theme.TextSize.body,
		Text = "",
		ClearTextOnFocus = false,
	}
	if type(props) == "table" then
		for key, value in pairs(props) do
			defaults[key] = value
		end
	end
	return create("TextBox", parent, defaults, label)
end

function Widgets.Scrolling(parent, props, label)
	local defaults = {
		BackgroundTransparency = 1,
		ScrollBarThickness = 6,
		CanvasSize = UDim2.new(0, 0, 0, 0),
	}
	if type(props) == "table" then
		for key, value in pairs(props) do
			defaults[key] = value
		end
	end
	return create("ScrollingFrame", parent, defaults, label)
end

function Widgets.Corner(instance, radius)
	return create("UICorner", instance, { CornerRadius = radius or Ui_Theme.Metrics.cornerRadius })
end

function Widgets.Stroke(instance, color, thickness)
	return create("UIStroke", instance, {
		Color = color or Ui_Theme.Color.panelEdge,
		Thickness = thickness or 1,
		ApplyStrokeMode = Enum.ApplyStrokeMode.Border,
	})
end

function Widgets.ListLayout(instance, props)
	local defaults = {
		FillDirection = Enum.FillDirection.Vertical,
		SortOrder = Enum.SortOrder.LayoutOrder,
		Padding = UDim.new(0, Ui_Theme.Metrics.gap),
	}
	if type(props) == "table" then
		for key, value in pairs(props) do
			defaults[key] = value
		end
	end
	return create("UIListLayout", instance, defaults)
end

function Widgets.Padding(instance, amount)
	local value = amount or Ui_Theme.Metrics.padding
	return create("UIPadding", instance, {
		PaddingTop = UDim.new(0, value),
		PaddingBottom = UDim.new(0, value),
		PaddingLeft = UDim.new(0, value),
		PaddingRight = UDim.new(0, value),
	})
end

function Widgets.Scale(instance, value)
	return create("UIScale", instance, { Scale = value })
end

-- Nối sự kiện chuột của nút, trả về (connection, errorMessage).
function Widgets.OnClick(button, handler, label)
	if button == nil then
		return nil, "Không có nút để nối sự kiện."
	end
	local signal = Shared_Safe.Read(button, "MouseButton1Click")
	return Client_Registry.Connect(signal, handler, label or "ui:click")
end

-- Nối sự kiện đổi nội dung ô tìm kiếm.
function Widgets.OnTextChanged(textBox, handler, label)
	if textBox == nil then
		return nil, "Không có ô nhập liệu."
	end
	local signal = nil
	local okSignal, changedSignal = pcall(function()
		return textBox:GetPropertyChangedSignal("Text")
	end)
	if okSignal then
		signal = changedSignal
	end
	return Client_Registry.Connect(signal, handler, label or "ui:text")
end

function Widgets.ResetStats()
	Widgets.stats = { created = 0, writes = 0, skipped = 0, destroyed = 0 }
end

return Widgets
