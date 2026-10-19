--[[
	doors-entity-radar/src/Shared/Geometry.luau
	ModuleScript — đặt tại: ReplicatedStorage.DoorsEntityRadar.Shared.Geometry

	TOÁN ĐỊNH VỊ. Tệp này thuần tuý tính toán và đọc vị trí — không tạo
	instance, không nối signal, không đụng trò chơi. Tách ra để kiểm thử
	được bằng máy (mọi hàm đều có test riêng trong tests/suites/geometry).

	HAI CHỐT TRUNG THỰC nằm ở đây:
	  * Geometry.IsPositionVector: từ chối toạ độ NaN/vô hạn/thiếu thành phần.
	  * Geometry.ReadPosition: chỉ trả vị trí khi THẬT SỰ đọc được từ instance;
	    mọi nhánh thất bại đều trả kèm LÝ DO để UI in ra thay vì im lặng.
]]

local Geometry = {}

-- Toạ độ lớn hơn ngưỡng này gần như chắc chắn là rác (Roblox giới hạn
-- không gian làm việc quanh 2^17 stud). Dùng để loại giá trị vô nghĩa.
Geometry.MAX_REASONABLE_STUDS = 1000000

-- 8 hướng la bàn, chia theo dải góc |góc| so với hướng nhìn.
-- Mỗi dải hoặc có một nhãn chung (trước/sau) hoặc một cặp phải/trái.
Geometry.DIRECTION_BANDS = {
	{ limit = 22.5, label = "phía trước" },
	{ limit = 67.5, labelRight = "trước phải", labelLeft = "trước trái" },
	{ limit = 112.5, labelRight = "bên phải", labelLeft = "bên trái" },
	{ limit = 157.5, labelRight = "sau phải", labelLeft = "sau trái" },
	{ limit = 180.1, label = "phía sau" },
}

-- Số có phải số hữu hạn không (loại cả NaN lẫn inf).
function Geometry.IsFiniteNumber(value)
	if type(value) ~= "number" then
		return false
	end
	if value ~= value then
		return false -- NaN
	end
	return value < math.huge and value > -math.huge
end

--[[
	Kiểm tra một giá trị có dùng được như Vector3 không.
	Cố tình KHÔNG dùng typeof(): hàm này phải chạy được cả trong máy ảo
	kiểm thử, và duck-typing đủ chặt cho mục đích đọc toạ độ.
]]
function Geometry.IsPositionVector(value)
	if type(value) ~= "table" and type(value) ~= "userdata" then
		return false
	end
	local okRead, x, y, z = pcall(function()
		return value.X, value.Y, value.Z
	end)
	if not okRead then
		return false
	end
	if not Geometry.IsFiniteNumber(x) then
		return false
	end
	if not Geometry.IsFiniteNumber(y) then
		return false
	end
	if not Geometry.IsFiniteNumber(z) then
		return false
	end
	local magnitude = math.sqrt(x * x + y * y + z * z)
	if magnitude > Geometry.MAX_REASONABLE_STUDS then
		return false
	end
	return true
end

-- Khoảng cách giữa hai điểm. Trả nil nếu đầu vào không hợp lệ.
function Geometry.Distance(fromPosition, toPosition)
	if not Geometry.IsPositionVector(fromPosition) then
		return nil
	end
	if not Geometry.IsPositionVector(toPosition) then
		return nil
	end
	local dx = toPosition.X - fromPosition.X
	local dy = toPosition.Y - fromPosition.Y
	local dz = toPosition.Z - fromPosition.Z
	local distance = math.sqrt(dx * dx + dy * dy + dz * dz)
	if not Geometry.IsFiniteNumber(distance) then
		return nil
	end
	return distance
end

--[[
	ĐỌC VỊ TRÍ THẬT của một instance.
	Trả về (position, reason). position = nil nghĩa là KHÔNG CÓ vị trí,
	và `reason` luôn giải thích vì sao — không bao giờ trả vị trí bịa.

	Thứ tự thử (đều là API Roblox hợp lệ):
	  1. instance.Position             — BasePart
	  2. instance.CFrame.Position     — BasePart/PVInstance không phơi Position
	  3. instance:GetPivot().Position — Model (API hiện đại)
	  4. instance.PrimaryPart.Position— Model kiểu cũ
	  5. part con trực tiếp đầu tiên  — Folder/Accessory; reason nói rõ nguồn
]]
function Geometry.ReadPosition(instance)
	if instance == nil then
		return nil, "Không có instance để đọc vị trí."
	end

	-- Instance đã Destroy sẽ ném lỗi khi truy cập bất cứ thứ gì.
	local okParent, parent = pcall(function()
		return instance.Parent
	end)
	if not okParent then
		return nil, "Instance không còn hợp lệ (đã bị Destroy)."
	end
	if parent == nil then
		return nil, "Instance không còn nằm trong cây (Parent = nil)."
	end

	-- 1) BasePart
	local okDirect, direct = pcall(function()
		return instance.Position
	end)
	if okDirect and Geometry.IsPositionVector(direct) then
		return direct, "Đọc từ BasePart.Position."
	end

	-- 2) CFrame.Position (BasePart luôn có CFrame; một số class không có Position)
	local okCFrame, cframeValue = pcall(function()
		return instance.CFrame
	end)
	if okCFrame and cframeValue ~= nil then
		local okCFramePos, cframePos = pcall(function()
			return cframeValue.Position
		end)
		if okCFramePos and Geometry.IsPositionVector(cframePos) then
			return cframePos, "Đọc từ CFrame.Position."
		end
	end

	-- 3) GetPivot
	local okMethod, pivotMethod = pcall(function()
		return instance.GetPivot
	end)
	if okMethod and type(pivotMethod) == "function" then
		local okPivot, pivot = pcall(function()
			return instance:GetPivot()
		end)
		if okPivot and pivot ~= nil then
			local okPivotPos, pivotPos = pcall(function()
				return pivot.Position
			end)
			if okPivotPos and Geometry.IsPositionVector(pivotPos) then
				return pivotPos, "Đọc từ Model:GetPivot()."
			end
		end
	end

	-- 3) PrimaryPart
	local okPrimary, primary = pcall(function()
		return instance.PrimaryPart
	end)
	if okPrimary and primary ~= nil then
		local okPrimaryPos, primaryPos = pcall(function()
			return primary.Position
		end)
		if okPrimaryPos and Geometry.IsPositionVector(primaryPos) then
			return primaryPos, "Đọc từ Model.PrimaryPart."
		end
	end

	-- 5) Con trực tiếp đầu tiên có vị trí — chỉ xét MỘT cấp để không quét sâu.
	-- Gọi đệ quy chính ReadPosition (không đọc thẳng .Position) để part con
	-- chỉ phơi CFrame vẫn được xử lý đúng.
	local okChildren, children = pcall(function()
		return instance:GetChildren()
	end)
	if okChildren and type(children) == "table" then
		for _, child in ipairs(children) do
			local childPosition = Geometry.ReadPosition(child)
			if childPosition ~= nil then
				local childName = "?"
				pcall(function()
					childName = child.Name
				end)
				return childPosition, ("Đọc từ part con '%s' (instance gốc không có vị trí riêng).")
					:format(tostring(childName))
			end
		end
	end

	return nil, "Không đọc được vị trí hợp lệ từ instance này (không có Position, GetPivot hay PrimaryPart)."
end

--[[
	HƯỚNG TƯƠNG ĐỐI so với camera của người chơi.
	Trả về (label, angleDegrees) hoặc (nil, nil) nếu thiếu dữ liệu.

	  lookVector  — Camera.CFrame.LookVector (hướng nhìn)
	  rightVector — Camera.CFrame.RightVector; nếu nil sẽ tự suy ra
	                từ lookVector theo đúng quy ước trục của Roblox
	  fromPosition— vị trí người chơi
	  toPosition  — vị trí thực thể

	góc = 0  -> thẳng phía trước, dương -> lệch phải, âm -> lệch trái.
	Chỉ chiếu lên mặt phẳng ngang: người chơi không cần biết lệch bao
	nhiêu độ theo trục dọc khi tìm thực thể trong hành lang.
]]
function Geometry.RelativeDirection(lookVector, rightVector, fromPosition, toPosition)
	if not Geometry.IsPositionVector(lookVector) then
		return nil, nil
	end
	if not Geometry.IsPositionVector(fromPosition) then
		return nil, nil
	end
	if not Geometry.IsPositionVector(toPosition) then
		return nil, nil
	end

	local deltaX = toPosition.X - fromPosition.X
	local deltaZ = toPosition.Z - fromPosition.Z
	local deltaLength = math.sqrt(deltaX * deltaX + deltaZ * deltaZ)
	if deltaLength < 0.05 then
		-- Quá gần để nói về hướng; nói "ngay tại vị trí" sẽ trung thực hơn.
		return "ngay cạnh", 0
	end

	local lookX = lookVector.X
	local lookZ = lookVector.Z
	local lookLength = math.sqrt(lookX * lookX + lookZ * lookZ)
	if lookLength < 0.001 then
		-- Camera nhìn thẳng đứng: phép chiếu ngang vô nghĩa.
		return nil, nil
	end
	lookX = lookX / lookLength
	lookZ = lookZ / lookLength

	local rightX, rightZ
	if Geometry.IsPositionVector(rightVector) then
		rightX = rightVector.X
		rightZ = rightVector.Z
	else
		-- Suy ra trục phải từ trục nhìn: right = look × up.
		-- Với look = (0,0,-1) cho right = (1,0,0), đúng quy ước Roblox.
		rightX = -lookZ
		rightZ = lookX
	end
	local rightLength = math.sqrt(rightX * rightX + rightZ * rightZ)
	if rightLength < 0.001 then
		return nil, nil
	end
	rightX = rightX / rightLength
	rightZ = rightZ / rightLength

	local unitX = deltaX / deltaLength
	local unitZ = deltaZ / deltaLength
	local forward = unitX * lookX + unitZ * lookZ
	local side = unitX * rightX + unitZ * rightZ

	-- math.atan(y, x) có trong cả Luau lẫn Lua 5.3 (không dùng math.atan2).
	local angle = math.deg(math.atan(side, forward))

	local absolute = math.abs(angle)
	for _, band in ipairs(Geometry.DIRECTION_BANDS) do
		if absolute <= band.limit then
			if band.label ~= nil then
				return band.label, angle
			end
			if angle >= 0 then
				return band.labelRight, angle
			end
			return band.labelLeft, angle
		end
	end

	-- Không tới được đây (dải cuối phủ tới 180.1 độ), nhưng không trả nil im lặng.
	return "phía sau", angle
end

-- Định dạng khoảng cách cho UI. Không làm tròn thành số nguyên:
-- 0.4 stud và 1.2 stud khác nhau khi đứng nép sau cánh cửa.
function Geometry.FormatDistance(studs)
	if not Geometry.IsFiniteNumber(studs) then
		return nil
	end
	return ("%.1f stud"):format(studs)
end

-- Tuổi dữ liệu theo giây, làm tròn 1 chữ số. Trả nil nếu đầu vào sai.
function Geometry.FormatAge(seconds)
	if not Geometry.IsFiniteNumber(seconds) then
		return nil
	end
	if seconds < 0 then
		return nil
	end
	if seconds < 10 then
		return ("%.1fs trước"):format(seconds)
	end
	return ("%ds trước"):format(math.floor(seconds + 0.5))
end

return Geometry
