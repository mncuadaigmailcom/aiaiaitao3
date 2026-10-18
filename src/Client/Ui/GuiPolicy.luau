--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  FPS-002, GUI-001, GUI-002, GUI-004,
	  GUI-005, GUI-006, GUI-009, GUI-011 
	===== RALO.METHODS:END ===== --]]

--[[
	Client/Ui/GuiPolicy.luau
	===== RALO.METHODS:GUI-001, GUI-002, GUI-004, GUI-005, GUI-006, GUI-007,
	                    GUI-010, GUI-011 =====

	Các QUY TẮC bắt buộc cho GUI của chính hệ thống tối ưu.

	Lý do tệp này tồn tại: một công cụ chống lag mà GUI của nó gây lag
	thì phản tác dụng. Những lỗi kinh điển:
	  * ResetOnSpawn = true -> mỗi lần hồi sinh GUI bị dựng lại,
	    nối chồng connection (GUI-001).
	  * Tạo ScreenGui mới mỗi lần chạy -> nhiều lớp GUI chồng nhau (GUI-002).
	  * Ghi property GUI mỗi khung hình -> layout tính lại liên tục (GUI-004).
	  * Vẫn chạy tween/hoạt ảnh khi GUI đã ẩn -> tốn vô ích (GUI-006).
	  * Quên Destroy -> instance mồ côi tích tụ (GUI-011).

	Tất cả quy tắc ở đây đều có test tương ứng trong tests/.
]]

local Shared_Log = __RALO_REQUIRE("Shared/Log")
local Client_Guard = __RALO_REQUIRE("Client/Core/Guard")

local SCOPE = "GuiPolicy"

local GuiPolicy = {}

GuiPolicy.GUI_NAME = "RALO_OptimizerNotifier"
GuiPolicy.stats = { created = 0, reused = 0, blockedDuplicates = 0, destroyed = 0 }

--[[
	GUI-002 / GUI-001: lấy ScreenGui DUY NHẤT.
	Nếu đã tồn tại (do lần chạy trước) thì TÁI SỬ DỤNG, không tạo bản thứ hai.
	parent: nơi treo GUI (PlayerGui khi chạy LocalScript).
]]
function GuiPolicy.AcquireScreenGui(parent)
	if parent == nil then
		Shared_Log.Warn(SCOPE, "không có parent (PlayerGui) -> không tạo GUI")
		return nil, false
	end

	local validParent, isPlayerGui = pcall(function()
		return parent:IsA("PlayerGui")
	end)
	if not validParent or not isPlayerGui then
		Shared_Log.Warn(SCOPE, "parent không phải PlayerGui -> từ chối tạo GUI không hiển thị")
		return nil, false
	end

	local ok, existing = Client_Guard.Run(SCOPE .. ":Find", function()
		return parent:FindFirstChild(GuiPolicy.GUI_NAME)
	end)
	if ok and existing ~= nil then
		local valid, isScreenGui = pcall(function()
			return existing:IsA("ScreenGui")
		end)
		if not valid or not isScreenGui then
			Shared_Log.Warn(SCOPE, "đã có object cùng tên nhưng không phải ScreenGui -> không đè lên object đó")
			return nil, false
		end

		local configured, configureError = pcall(function()
			existing.ResetOnSpawn = false
			existing.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
			existing.DisplayOrder = 1000
			existing.IgnoreGuiInset = true
			existing.Enabled = true
		end)
		if not configured then
			Shared_Log.Warn(SCOPE, "không thể bật ScreenGui cũ:", tostring(configureError))
			return nil, false
		end

		GuiPolicy.stats.reused += 1
		Shared_Log.Info(SCOPE, "đã bật lại ScreenGui hiện có (DisplayOrder=1000)")
		return existing, true
	end

	local okNew, created = Client_Guard.Run(SCOPE .. ":New", function()
		local gui = Instance.new("ScreenGui")
		gui.Name = GuiPolicy.GUI_NAME
		gui.ResetOnSpawn = false          -- GUI-001: KHÔNG dựng lại khi hồi sinh
		gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
		gui.DisplayOrder = 1000            -- nổi trên HUD thông thường trong PlayerGui
		gui.IgnoreGuiInset = true
		gui.Enabled = true
		gui.Parent = parent
		return gui
	end)

	if not okNew or created == nil then
		Shared_Log.Warn(SCOPE, "không tạo được ScreenGui")
		return nil, false
	end

	GuiPolicy.stats.created += 1
	return created, false
end

--[[
	GUI-011: xoá GUI. CHỈ xoá đúng instance do hệ thống tạo
	(kiểm tra bằng Name), không đụng GUI của game.
]]
function GuiPolicy.DestroyScreenGui(gui)
	if gui == nil then
		return false
	end
	local ok, name = Client_Guard.Run(SCOPE .. ":CheckName", function()
		return gui.Name
	end)
	if not ok or name ~= GuiPolicy.GUI_NAME then
		Shared_Log.Warn(SCOPE, "từ chối xoá GUI không thuộc hệ thống: " .. tostring(name))
		return false
	end
	local okDestroy = Client_Guard.Run(SCOPE .. ":Destroy", function()
		gui:Destroy()
	end)
	if okDestroy then
		GuiPolicy.stats.destroyed += 1
	end
	return okDestroy
end

--[[
	GUI-004: ghi property CHỈ KHI giá trị thật sự khác.
	Tránh việc ghi lại cùng một giá trị mỗi khung hình khiến engine
	phải đánh dấu bẩn (dirty) và tính lại layout một cách vô ích.
	Trả về true nếu có ghi.
]]
function GuiPolicy.SetIfChanged(instance, property, value)
	if instance == nil then
		return false
	end
	local ok, current = Client_Guard.Run(SCOPE, function()
		return instance[property]
	end)
	if not ok then
		return false
	end
	if current == value then
		return false
	end
	local status = Client_Guard.Change(instance, property, value, { scope = SCOPE })
	return status == "applied"
end

--[[
	GUI-006 / GUI-010: có nên chạy hoạt ảnh không?
	Khi GUI đã ẩn thì KHÔNG chạy tween / không cập nhật gradient.
]]
function GuiPolicy.ShouldAnimate(gui, allowAnimation)
	if allowAnimation == false then
		return false
	end
	if gui == nil then
		return false
	end
	local ok, enabled = Client_Guard.Run(SCOPE, function()
		return gui.Enabled
	end)
	if not ok then
		return false
	end
	return enabled == true
end

-- GUI-005: đếm số instance trong cây GUI — dùng để giữ cây nhỏ.
function GuiPolicy.CountNodes(root)
	if root == nil then
		return 0
	end
	local ok, descendants = Client_Guard.Run(SCOPE, function()
		return root:GetDescendants()
	end)
	if not ok or descendants == nil then
		return 0
	end
	return #descendants + 1
end

function GuiPolicy.Stats()
	return {
		created = GuiPolicy.stats.created,
		reused = GuiPolicy.stats.reused,
		blockedDuplicates = GuiPolicy.stats.blockedDuplicates,
		destroyed = GuiPolicy.stats.destroyed,
		guiName = GuiPolicy.GUI_NAME,
	}
end

function GuiPolicy.Reset()
	GuiPolicy.stats = { created = 0, reused = 0, blockedDuplicates = 0, destroyed = 0 }
end

return GuiPolicy
