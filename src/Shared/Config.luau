--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  CFG-001, CFG-002, CFG-004, CFG-006, MEAS-004, RES-004 
	===== RALO.METHODS:END ===== --]]

--[[
	Shared/Config.luau
	===== RALO.METHODS:CFG-001, CFG-002, CFG-004, MEAS-004, RES-004 =====

	KHO CẤU HÌNH TRUNG TÂM. Mọi module đọc thông số từ đây, không module
	nào giữ hằng số riêng. Người dùng chỉ cần sửa bảng PROFILE.

	Ba nguyên tắc thiết kế (không ngoại lệ):
	  1. GIỮ NGUYÊN GAMEPLAY — không có tuỳ chọn nào tắt gameplay, tắt âm
	     thanh gameplay, xoá nhân vật/vật phẩm, hay đổi thông số gameplay
	     để đổi lấy FPS.
	  2. ĐỒ HOẠ GIẢM NHẸ — mặc định là mức "light": chỉ hạ chất lượng ở mức
	     vừa phải, giới hạn hạt chứ không xoá hiệu ứng. KHÔNG BAO GIỜ tự
	     chuyển về mức đồ hoạ thấp nhất.
	  3. MỌI THAY ĐỔI ĐỀU ĐẢO NGƯỢC ĐƯỢC — mỗi mục đồ hoạ đều có cặp
	     "áp dụng / khôi phục" thông qua Client/Core/Restore.

	Môi trường đích: Roblox Studio + Rojo, game do chính bạn sở hữu.
	Dự án KHÔNG dùng executor, không dùng setrbxsetting, không đụng
	bất kỳ cơ chế bảo vệ nào.
]]

local Config = {}

Config.VERSION = "2.0.0"
Config.NAME = "Roblox Anti-Lag Optimizer"

-- Bậc tối ưu: "light" (mặc định) | "balanced" | "off"
Config.DEFAULT_MODE = "light"

--[[
	PROFILE — toàn bộ thông số có thể chỉnh.
	Cấu trúc được Guard.NormalizeConfig() kiểm tra kiểu trước khi dùng.
]]
Config.PROFILE = {
	--------------------------------------------------------------------
	-- CÔNG TẮC TỔNG (CFG-001)
	--------------------------------------------------------------------
	enabled = true,          -- false = hệ thống không làm gì cả

	-- Chế độ tối ưu. "light" là MẶC ĐỊNH theo yêu cầu thiết kế.
	mode = "light",

	--------------------------------------------------------------------
	-- CÔNG TẮC THEO NHÓM (CFG-001) — độc lập với nhau
	-- Đặt false để TẮT hẳn nhóm đó.
	--------------------------------------------------------------------
	groups = {
		graphics  = true,    -- chất lượng tối đa 8; giữ ánh sáng, bóng và địa hình
		effects   = true,    -- giới hạn Rate hạt nhẹ (không xoá effect)
		cull      = true,    -- thư viện có culling; không gọi trong plan mặc định
		scan      = true,    -- quét thế giới có trần
		memory    = true,    -- dọn resource; GC thủ công mặc định tắt
		physics   = false,   -- MẶC ĐỊNH TẮT: có đánh đổi độ mượt vật lý
		character = true,    -- giữ bóng và tỉ lệ avatar theo mặc định
		net       = false,   -- MẶC ĐỊNH TẮT: cần remote của game
	},

	--------------------------------------------------------------------
	-- CÔNG TẮC THEO TỪNG PHƯƠNG PHÁP (CFG-002)
	-- Chỉ cần liệt kê những gì muốn TẮT. Id lấy từ Shared/Methods.luau.
	--------------------------------------------------------------------
	methods = {
		-- ví dụ: ["GRAPHICS-003"] = false,  -- giữ Terrain.Decoration
	},

	--------------------------------------------------------------------
	-- ĐO HIỆU NĂNG (Part 9)
	--------------------------------------------------------------------
	measure = {
		baselineSeconds = 5.0,     -- thời lượng lấy mẫu TRƯỚC khi tối ưu
		settleSeconds   = 1.0,     -- nghỉ sau khi tối ưu để FPS ổn định
		afterSeconds    = 5.0,     -- thời lượng lấy mẫu SAU khi tối ưu
		frameWindow     = 180,     -- ~3 giây @60fps cho chỉ số tức thời
		longFrameMs     = 33.3,    -- ngưỡng "khung hình dài" (dưới 30 FPS)
	},

	--------------------------------------------------------------------
	-- BẢNG TRẠNG THÁI (Part 6 & 7)
	--------------------------------------------------------------------
	gui = {
		enabled         = true,
		durationSeconds = 30,      -- thời gian hiện bảng trạng thái (~30 giây)
		fadeSeconds     = 0.45,    -- thời gian trượt xuống + mờ dần
		slideOffset     = 70,      -- px trượt xuống khi ẩn
		width           = 288,     -- px
		marginRight     = 16,      -- px, cách mép phải (lề an toàn)
		marginBottom    = 16,      -- px, cách mép dưới (lề an toàn)
		backgroundAlpha = 0.42,    -- nền xám bán trong suốt, vẫn đọc rõ chữ
		cornerRadius    = 10,      -- bo góc nhẹ cho bảng chữ nhật
		borderWidth     = 2,       -- viền cầu vồng
		rainbowSpeed    = 0.35,    -- vòng/giây của dải cầu vồng
		updateInterval  = 0.1,     -- cập nhật giao diện 10 lần/giây, tránh việc thừa
	},

	--------------------------------------------------------------------
	-- ĐỒ HOẠ (giảm NHẸ, đảo ngược được)
	--------------------------------------------------------------------
	graphics = {
		qualityLevel      = 8,     -- giảm nhẹ; không bao giờ nâng mức thấp hiện có
		lockQualityMode   = false, -- tôn trọng chế độ đồ họa tự động của Roblox
		applyTerrainDecoration = false, -- không đổi địa hình trừ khi chủ game bật rõ
		terrainDecoration = false, -- giá trị mục tiêu chỉ dùng khi applyTerrainDecoration = true
		shadowDistance    = 0,     -- giữ toàn bộ bóng đổ, không culling part xa
		maxShadowTargets  = 400,   -- trần an toàn nếu chủ game chủ động bật culling
	},

	--------------------------------------------------------------------
	-- HIỆU ỨNG (chỉ GIỚI HẠN, không xoá — giữ nguyên tính năng)
	--------------------------------------------------------------------
	effects = {
		particleRateCap     = 40,  -- giới hạn nhẹ mật độ hạt, không tắt emitter
		maxInstancesScanned = 3000,-- trần quét, tránh treo máy yếu
	},

	--------------------------------------------------------------------
	-- NHÂN VẬT (vẫn giữ nguyên nhân vật)
	--------------------------------------------------------------------
	character = {
		disableShadows     = false, -- luôn giữ bóng nhân vật theo mặc định
		disableAutoScaling = false, -- giữ nguyên tỉ lệ/hiển thị nhân vật
	},

	--------------------------------------------------------------------
	-- BỘ NHỚ / GC
	--------------------------------------------------------------------
	memory = {
		gcEverySeconds = 0,        -- 0 = tắt; GC thủ công là opt-in để tránh nền thừa
		collectStepKb  = 200,      -- collectgarbage("step", n)
	},

	--------------------------------------------------------------------
	-- VẬT LÝ (CÓ ảnh hưởng cảm giác chơi -> MẶC ĐỊNH TẮT)
	--------------------------------------------------------------------
	physics = {
		enabled                 = false,
		interpolationThrottling = "Disabled",
		physicsSteppingMethod   = "Fixed",
	},

	--------------------------------------------------------------------
	-- BỘ LẬP LỊCH (Part 8: không được mở vòng lặp trùng)
	--------------------------------------------------------------------
	scheduler = {
		frameBudgetMs = 3.0,       -- ngân sách thời gian mỗi khung hình
		cullInterval  = 0.25,      -- giây giữa hai lượt cull
	},

	--------------------------------------------------------------------
	-- CHẨN ĐOÁN & LOG (Part 8)
	--------------------------------------------------------------------
	diagnostics = {
		logLevel      = "info",    -- "silent" | "info" | "debug"
		maxEntries    = 200,       -- trần bộ đệm log (chống phình bộ nhớ)
		errorLogging  = true,      -- ghi lỗi ra Output
		printToOutput = true,      -- có in ra Output hay chỉ giữ trong bộ đệm
		selfCostCheck = true,      -- đo chi phí của chính công cụ
	},

	--------------------------------------------------------------------
	-- KHÔI PHỤC (Part 8)
	--------------------------------------------------------------------
	restore = {
		recordChanges = true,      -- ghi nhật ký giá trị cũ
		verifyOnWrite = true,      -- đọc lại sau khi ghi để xác nhận
		respectStale  = true,      -- KHÔNG ghi đè nếu game/người dùng đã đổi
	},
}

--[[
	Bản sao mặc định, chụp MỘT lần lúc nạp module.
	Dùng cho Config.ResetToDefaults() — không phụ thuộc vào PROFILE hiện tại.
]]
local DEFAULTS = (function()
	local function clone(value)
		if type(value) ~= "table" then
			return value
		end
		local out = {}
		for key, child in pairs(value) do
			out[key] = clone(child)
		end
		return out
	end
	return clone(Config.PROFILE)
end)()

--[[
	CFG-004: khôi phục cấu hình mặc định.
	Trả về PROFILE (đã được đặt lại).
]]
function Config.ResetToDefaults()
	for section, values in pairs(DEFAULTS) do
		if type(values) == "table" then
			if type(Config.PROFILE[section]) ~= "table" then
				Config.PROFILE[section] = {}
			end
			for key, value in pairs(values) do
				Config.PROFILE[section][key] = value
			end
		else
			Config.PROFILE[section] = values
		end
	end
	return Config.PROFILE
end

-- Bí danh giữ tương thích với mã cũ.
Config.Reset = Config.ResetToDefaults

--[[
	Áp một bảng vá lên PROFILE (ghép sâu một mức).
	Config.Apply({ gui = { durationSeconds = 60 } })
]]
function Config.Apply(patch)
	if type(patch) ~= "table" then
		return Config.PROFILE
	end
	for section, values in pairs(patch) do
		if type(Config.PROFILE[section]) == "table" and type(values) == "table" then
			for key, value in pairs(values) do
				Config.PROFILE[section][key] = value
			end
		else
			Config.PROFILE[section] = values
		end
	end
	return Config.PROFILE
end

function Config.Get(section)
	return Config.PROFILE[section]
end

--[[
	MEAS-004: công tắc A/B cho một nhóm — dùng khi đo lại để biết nhóm nào
	thật sự có ích trên máy của bạn.
	Config.SetGroup("graphics", false) rồi đo lại.
]]
function Config.SetGroup(groupKey, enabled)
	if type(groupKey) ~= "string" then
		return false
	end
	if type(Config.PROFILE.groups) ~= "table" then
		Config.PROFILE.groups = {}
	end
	Config.PROFILE.groups[groupKey] = enabled == true
	return true
end

-- CFG-002: công tắc cho từng phương pháp riêng lẻ.
function Config.SetMethod(methodId, enabled)
	if type(methodId) ~= "string" then
		return false
	end
	if type(Config.PROFILE.methods) ~= "table" then
		Config.PROFILE.methods = {}
	end
	Config.PROFILE.methods[methodId] = enabled == true
	return true
end

--[[
	Trả về chế độ hiện tại và bậc chất lượng tương ứng.
	"off" nghĩa là hệ thống không can thiệp gì.
]]
function Config.Mode()
	local mode = Config.PROFILE.mode
	if mode ~= "light" and mode ~= "balanced" and mode ~= "off" then
		return Config.DEFAULT_MODE
	end
	return mode
end

return Config
