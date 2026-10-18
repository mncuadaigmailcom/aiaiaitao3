--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  DATA-004, GRAPHICS-009, QUERY-001, SAFE-001,
	  SAFE-002, SAFE-003, SAFE-004, SAFE-008 
	===== RALO.METHODS:END ===== --]]

--[[
	Shared/Safety.luau
	===== RALO.METHODS:SAFE-001, SAFE-002, SAFE-003, SAFE-004 =====

	RANH GIỚI AN TOÀN: những gì hệ thống tối ưu KHÔNG ĐƯỢC đụng vào.

	Tệp này là chốt chặn cuối cùng. Mọi thao tác thay đổi property đều phải
	hỏi qua Safety.Allow() trước. Lý do: yêu cầu số một của dự án là
	"giữ nguyên gameplay", và điều đó không thể chỉ dựa vào ý định tốt —
	nó phải được ENFORCE bằng mã.

	SAFE-001  Danh sách TRẮNG các property được phép đổi
	SAFE-002  Danh sách ĐEN các lớp đối tượng không bao giờ đụng tới
	SAFE-003  Không đụng đối tượng mang tag gameplay do chủ game đánh dấu
	SAFE-004  Từ chối mọi thay đổi có thể ảnh hưởng điều khiển người chơi
]]

local Shared_Log = __RALO_REQUIRE("Shared/Log")

local SCOPE = "Safety"

local Safety = {}

-- SAFE-001: CHỈ những property này được phép thay đổi. Ngoài danh sách -> từ chối.
Safety.AllowedProperties = {
	CastShadow = true,              -- bóng đổ: thuần thị giác
	Enabled = true,                 -- ParticleEmitter/Beam/Trail/PointLight
	Rate = true,                    -- mật độ hạt
	Brightness = true,              -- PointLight/SpotLight
	Range = true,                   -- tầm sáng
	GraphicsQualityMode = true,     -- Lighting
	QualityLevel = true,            -- Lighting
	Decoration = true,              -- Terrain (chi tiết cỏ/đá nhỏ)
	AutomaticScalingEnabled = true, -- Humanoid (chỉ tắt tự co giãn)
}

-- SAFE-002: các lớp KHÔNG BAO GIỜ bị thay đổi, kể cả khi property nằm trong whitelist
Safety.ProtectedClasses = {
	Humanoid = true,               -- ngoại lệ: chỉ AutomaticScalingEnabled, xem bên dưới
	HumanoidRootPart = true,
	Camera = true,
	SpawnLocation = true,
	Script = true,
	LocalScript = true,
	ModuleScript = true,
	RemoteEvent = true,
	RemoteFunction = true,
	Player = true,
	Players = true,
	ForceField = true,
	ClickDetector = true,
	ProximityPrompt = true,
	Tool = true,
}

-- Humanoid chỉ được đụng ĐÚNG một property này
Safety.HumanoidAllowed = { AutomaticScalingEnabled = true }

-- SAFE-003: tag do chủ game đánh dấu để loại đối tượng khỏi mọi tối ưu
Safety.ProtectedTags = {
	"RALO_Protected",
	"Gameplay",
	"GameplayCritical",
}

Safety.stats = { allowed = 0, deniedProperty = 0, deniedClass = 0, deniedTag = 0 }

--[[
	Quyết định một thao tác có được phép không.
	Trả về: allow (bool), reason (string)

	instance:  đối tượng định thay đổi
	property:  tên property
	taggedSet: BẢNG tra cứu tag đã được tính sẵn (để không gọi
	           CollectionService mỗi lần — chính nó cũng là một tối ưu)
]]
function Safety.Allow(instance, property, taggedSet)
	if instance == nil or property == nil then
		Safety.stats.deniedProperty += 1
		return false, "thiếu instance hoặc property"
	end

	-- pcall trả về (ok, result) — ĐẢO THỨ TỰ Ở ĐÂY LÀ LỖI NGHIÊM TRỌNG:
	-- className sẽ nhận `true` và ProtectedClasses[true] = nil, tức là
	-- TOÀN BỘ danh sách lớp bảo vệ bị bỏ qua. Đã được safety.test.js bắt.
	local okClass, className = pcall(function()
		return instance.ClassName
	end)
	if not okClass then
		Safety.stats.deniedClass += 1
		return false, "không đọc được ClassName"
	end

	-- SAFE-002: lớp được bảo vệ
	if Safety.ProtectedClasses[className] then
		if className == "Humanoid" and Safety.HumanoidAllowed[property] then
			-- ngoại lệ duy nhất, vẫn đi tiếp để kiểm tra whitelist
		else
			Safety.stats.deniedClass += 1
			return false, ("lớp %s được bảo vệ"):format(className)
		end
	end

	-- SAFE-001: whitelist property
	if not Safety.AllowedProperties[property] then
		Safety.stats.deniedProperty += 1
		return false, ("property %s không nằm trong danh sách cho phép"):format(property)
	end

	-- SAFE-003: đối tượng mang tag bảo vệ
	if type(taggedSet) == "table" and taggedSet[tostring(instance)] then
		Safety.stats.deniedTag += 1
		return false, "đối tượng mang tag bảo vệ của game"
	end

	Safety.stats.allowed += 1
	return true, "ok"
end

--[[
	Tính sẵn tập đối tượng mang tag bảo vệ.
	Gọi MỘT lần mỗi lượt quét rồi truyền vào Safety.Allow — tránh gọi
	CollectionService:GetTagged() cho từng đối tượng (chính nó cũng tốn).
]]
function Safety.BuildProtectedSet(collectionService)
	local set = {}
	if collectionService == nil then
		return set
	end
	for _, tag in Safety.ProtectedTags do
		local ok, list = pcall(function()
			return collectionService:GetTagged(tag)
		end)
		if ok and type(list) == "table" then
			for _, instance in list do
				set[tostring(instance)] = true
			end
		end
	end
	return set
end

function Safety.Stats()
	local total = Safety.stats.allowed + Safety.stats.deniedProperty
		+ Safety.stats.deniedClass + Safety.stats.deniedTag
	return {
		allowed = Safety.stats.allowed,
		deniedProperty = Safety.stats.deniedProperty,
		deniedClass = Safety.stats.deniedClass,
		deniedTag = Safety.stats.deniedTag,
		total = total,
		denyRate = total > 0 and ((Safety.stats.deniedProperty + Safety.stats.deniedClass
			+ Safety.stats.deniedTag) / total) or 0,
	}
end

function Safety.Reset()
	Safety.stats = { allowed = 0, deniedProperty = 0, deniedClass = 0, deniedTag = 0 }
end

return Safety
