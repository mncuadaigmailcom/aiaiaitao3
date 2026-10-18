--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  RESTORE-001, RESTORE-002, RESTORE-003, RESTORE-004,
	  SAFE-005 
	===== RALO.METHODS:END ===== --]]

--[[
	Core/Restore.luau
	Nhật ký "trước khi đổi" để có thể HOÀN TÁC từng property.
	Mỗi lần Safe.Set thành công với restore = true, ta ghi lại giá trị cũ.

	Đây là lý do script KHÔNG xoá instance: mọi thứ đều đảo ngược được.
]]

local Client_Guard = __RALO_REQUIRE("Client/Core/Guard")

local Restore = {}

Restore.entries = {}     -- { { instance, property, oldValue, stepId } }

--[[
	Ghi lại giá trị cũ TRƯỚC khi đổi.
	newValue (tuỳ chọn) là giá trị script SẼ đặt — cần để khi hoàn tác,
	Guard.Change có thể kiểm tra "giá trị hiện tại vẫn là cái ta đã đặt chứ?"
	và từ chối ghi đè nếu game/người dùng đã đổi nó (REC-002).
]]
function Restore.Record(instance, property, oldValue, stepId, newValue)
	Restore.entries[#Restore.entries + 1] = {
		instance = instance,
		property = property,
		oldValue = oldValue,
		stepId = stepId,
		newValue = newValue,
	}
	return #Restore.entries
end

function Restore.Count(): number
	return #Restore.entries
end

function Restore.CountByStep(stepId: string): number
	local n = 0
	for _, entry in Restore.entries do
		if entry.stepId == stepId then n += 1 end
	end
	return n
end

--[[
	Quên mọi bản ghi của một instance (RESTORE-004).

	Dùng khi instance đã bị huỷ: giữ tham chiếu tới nó vừa rò rỉ bộ nhớ
	vừa gây lỗi khi hoàn tác. Cull gọi hàm này mỗi lần khôi phục xong.
	Trả về số bản ghi đã xoá.
]]
function Restore.Forget(instance)
	if instance == nil then
		return 0
	end
	local removed = 0
	for i = #Restore.entries, 1, -1 do
		if Restore.entries[i].instance == instance then
			table.remove(Restore.entries, i)
			removed += 1
		end
	end
	return removed
end

--[[
	Hoàn tác theo thứ tự NGƯỢC (cái đổi sau thì khôi phục trước).

	setter: hàm ghi property, dạng (instance, property, value, opts) -> boolean.
	NẾU KHÔNG TRUYỀN thì mặc định dùng Guard.Change — đây là đường an toàn
	nhất vì Guard.Change có stale-guard (không ghi đè thay đổi mới của game).
	Trước đây hàm này BẮT BUỘC có setter, nên Pipeline.Restore() gọi
	Restore.All() không tham số sẽ sập. Đã sửa.

	Trả về: số property khôi phục thành công, số lần thất bại.
]]
function Restore.All(setter)
	local write = setter
	if write == nil then
		write = function(instance, property, value, opts)
			local status = Client_Guard.Change(instance, property, value, opts)
			return status == "applied" or status == "unchanged"
		end
	end

	local restored, failed = 0, 0
	for i = #Restore.entries, 1, -1 do
		local entry = Restore.entries[i]
		local ok = write(entry.instance, entry.property, entry.oldValue, {
			scope = "Restore:" .. tostring(entry.stepId),
			-- expect = giá trị script đã đặt; nếu game đã đổi thì Guard trả
			-- "stale" và KHÔNG ghi đè (REC-002).
			expect = entry.newValue,
		})
		if ok then
			restored += 1
			table.remove(Restore.entries, i)
		else
			failed += 1
		end
	end
	return restored, failed
end

function Restore.Reset()
	table.clear(Restore.entries)
end

return Restore
