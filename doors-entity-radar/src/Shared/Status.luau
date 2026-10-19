--[[
	doors-entity-radar/src/Shared/Status.luau
	ModuleScript — đặt tại: ReplicatedStorage.DoorsEntityRadar.Shared.Status

	TRẠNG THÁI PHÁT HIỆN. Đây là nơi duy nhất định nghĩa ý nghĩa của từng
	trạng thái và QUYỀN được hiển thị dữ liệu. Không tệp nào khác được tự
	quyết định "có được hiện khoảng cách hay không".

	NGUYÊN TẮC TRUNG THỰC (ràng buộc của toàn dự án):
	  1. Chỉ DETECTED mới được hiển thị khoảng cách/hướng/toạ độ.
	  2. Không bao giờ suy ra vị trí từ tên có trong danh mục.
	     "Có tên trong catalog" chỉ quyết định trạng thái UNVERIFIED,
	     không bao giờ quyết định DETECTED.
	  3. Không có dữ liệu mới thì không trình bày dữ liệu cũ như dữ liệu
	     trực tiếp — cờ `stale` do Tracker đặt, UI phải hiển thị cờ đó.
]]

local Status = {}

Status.Code = {
	-- Đã tìm thấy instance khớp VÀ đọc được vị trí hợp lệ từ môi trường.
	Detected = "DETECTED",
	-- Quét xong, không có instance nào khớp, VÀ mẫu tên đã được xác nhận.
	NotFound = "NOT_FOUND",
	-- Có instance khớp nhưng không đọc được vị trí hợp lệ (thiếu CFrame,
	-- PrimaryPart, hoặc toạ độ NaN). Biết là "có tồn tại", không biết ở đâu.
	NoPosition = "NO_POSITION",
	-- Mục này về bản chất không phát hiện được từ client (ví dụ cơ chế
	-- ẩn nấp của chính người chơi). Luôn kèm lý do.
	Unsupported = "UNSUPPORTED",
	-- Mẫu tên CHƯA được xác minh trong game thật. Không khẳng định có
	-- hay không có thực thể; chỉ nói "chưa đủ căn cứ".
	Unverified = "UNVERIFIED",
	-- Hệ thống đang tắt/tạm dừng: không có dữ liệu nào được coi là hiện hành.
	Disabled = "DISABLED",
	-- Lần quét ném lỗi. Kèm thông điệp lỗi thật, không che giấu.
	Fault = "FAULT",
}

-- Nhãn tiếng Việt hiển thị trên giao diện.
Status.Label = {
	DETECTED = "Đã phát hiện",
	NOT_FOUND = "Không phát hiện",
	NO_POSITION = "Thấy instance, không đọc được vị trí",
	UNSUPPORTED = "Không hỗ trợ phát hiện",
	UNVERIFIED = "Chưa xác minh",
	DISABLED = "Hệ thống đang tắt",
	FAULT = "Lỗi khi quét",
}

-- Màu chấm trạng thái (RGB 0-255). Chỉ là màu, không mang logic.
Status.Color = {
	DETECTED = { 86, 220, 130 },
	NOT_FOUND = { 150, 158, 172 },
	NO_POSITION = { 240, 190, 80 },
	UNSUPPORTED = { 120, 128, 140 },
	UNVERIFIED = { 120, 170, 235 },
	DISABLED = { 105, 110, 120 },
	FAULT = { 235, 96, 96 },
}

-- Thứ tự sắp xếp trong danh sách: trạng thái "có thông tin" lên trước.
Status.SortWeight = {
	DETECTED = 1,
	NO_POSITION = 2,
	NOT_FOUND = 3,
	UNVERIFIED = 4,
	UNSUPPORTED = 5,
	FAULT = 6,
	DISABLED = 7,
}

function Status.IsValid(code)
	return type(code) == "string" and Status.Label[code] ~= nil
end

function Status.GetLabel(code)
	if not Status.IsValid(code) then
		return "Trạng thái không xác định (" .. tostring(code) .. ")"
	end
	return Status.Label[code]
end

function Status.GetSortWeight(code)
	return Status.SortWeight[code] or 99
end

--[[
	QUYỀN HIỂN THỊ VỊ TRÍ. Chỉ DETECTED được trả true.
	Mọi nơi muốn in khoảng cách/toạ độ phải hỏi hàm này — nếu bỏ qua,
	đó là lỗi logic và test QUYỀN-001 sẽ bắt được.
]]
function Status.MayShowPosition(code)
	return code == Status.Code.Detected
end

-- Trạng thái này có nghĩa là "đã quét và có kết luận" (dù kết luận là không thấy).
function Status.IsScanned(code)
	return code == Status.Code.Detected
		or code == Status.Code.NotFound
		or code == Status.Code.NoPosition
end

-- Lý do mặc định theo trạng thái, dùng khi nơi phát sinh không cấp lý do riêng.
Status.DefaultReason = {
	DETECTED = "Tìm thấy instance khớp mẫu và đọc được vị trí hợp lệ.",
	NOT_FOUND = "Đã quét xong phạm vi cho phép, không có instance nào khớp mẫu.",
	NO_POSITION = "Có instance khớp mẫu nhưng không lấy được vị trí hợp lệ.",
	UNSUPPORTED = "Mục này không phát hiện được từ client.",
	UNVERIFIED = "Mẫu tên chưa được xác minh trong game thật.",
	DISABLED = "Hệ thống đang tắt hoặc tạm dừng.",
	FAULT = "Lần quét gặp lỗi.",
}

function Status.GetReason(code, customReason)
	if type(customReason) == "string" and #customReason > 0 then
		return customReason
	end
	return Status.DefaultReason[code] or "Không có thông tin."
end

--[[
	Tạo một bản ghi trạng thái. Đây là khuôn DUY NHẤT của dữ liệu mà UI
	được phép đọc; mọi trường đều có mặt để UI không phải đoán nil.

	tham số:
	  code       — một trong Status.Code
	  entityId   — id trong danh mục
	  reason     — chuỗi giải thích (tuỳ chọn)
	  observation— { instanceName, distance, direction, position, source, age }
	               CHỈ được khác nil khi code == DETECTED
	  stale      — true nếu dữ liệu không còn là dữ liệu trực tiếp
]]
function Status.MakeRecord(code, entityId, reason, observation, stale)
	if not Status.IsValid(code) then
		error(("Status.MakeRecord nhận mã trạng thái lạ: %s"):format(tostring(code)), 2)
	end

	-- Chốt an toàn: không cho observation lọt ra ngoài trạng thái DETECTED.
	-- Nếu một nơi nào đó cố gắn khoảng cách vào UNVERIFIED, ta bỏ nó và
	-- báo lỗi — thà mất dữ liệu còn hơn hiển thị dữ liệu không có căn cứ.
	local safeObservation = nil
	if observation ~= nil then
		if code == Status.Code.Detected then
			safeObservation = observation
		else
			warn(("[DER] Chặn hiển thị vị trí ở trạng thái %s (entity=%s)")
				:format(tostring(code), tostring(entityId)))
		end
	end

	return {
		code = code,
		entityId = entityId,
		label = Status.GetLabel(code),
		reason = Status.GetReason(code, reason),
		stale = stale == true,
		observation = safeObservation,
	}
end

return Status
