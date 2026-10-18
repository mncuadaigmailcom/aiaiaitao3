--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  CFG-001, CFG-002, LOOP-005, REC-004 
	===== RALO.METHODS:END ===== --]]

--[[
	Client/Core/Plan.luau
	===== RALO.METHODS:CFG-001, CFG-002, LOOP-005, REC-004 =====

	Lập KẾ HOẠCH tối ưu: quyết định bước nào chạy, bước nào bỏ qua và VÌ SAO.

	Nguyên tắc: bước không khả thi KHÔNG biến mất khỏi kế hoạch. Nó vẫn
	xuất hiện với available = false kèm lý do, để người dùng biết chính xác
	cái gì chưa được làm và tại sao. Đây là một phần của cơ chế chống
	"báo cáo khống".

	Kiểm tra khả dụng dùng Client_Env.GetService (API thật của Roblox),
	không dùng bất kỳ cơ chế probe executor nào.
]]

local Core_Env = __RALO_REQUIRE("Client/Core/Env")
local Core_Devices = __RALO_REQUIRE("Client/Core/Devices")
local Shared_Config = __RALO_REQUIRE("Shared/Config")
local Shared_Types = __RALO_REQUIRE("Shared/Types")
local Opt_Effects = __RALO_REQUIRE("Client/Optimizations/Effects")
local Opt_Graphics = __RALO_REQUIRE("Client/Optimizations/Graphics")
local Opt_Memory = __RALO_REQUIRE("Client/Optimizations/Memory")
local Opt_Physics = __RALO_REQUIRE("Client/Optimizations/Physics")

local Plan = {}

--[[
	DANH MỤC BƯỚC, sắp theo THỨ TỰ ƯU TIÊN của Part 5:
	  1. bỏ việc thừa            2. giảm việc trong vòng lặp
	  3. gộp kết nối sự kiện     4. dọn dẹp
	  5. giới hạn cập nhật       6. tra cứu/quản lý
	  7. tự quản lý đối tượng tạm 8. đo lường
	  9. CHỈ CUỐI CÙNG mới tới thay đổi đồ hoạ nhẹ, đảo ngược được

	`group` khớp với khóa trong Config.PROFILE.groups.
	`restorable` = true nghĩa là bước này ghi nhật ký vào Restore.
]]
Plan.CATALOG = {
	{
		id = "graphics.quality",
		name = "Hạ mức chất lượng hình ảnh",
		group = "graphics",
		module = Opt_Graphics,
		handler = "ApplyQualityLevel",
		restorable = true,
	},
	{
		id = "graphics.terrain",
		name = "Tắt chi tiết địa hình (Decoration)",
		group = "graphics",
		module = Opt_Graphics,
		handler = "ApplyTerrain",
		restorable = true,
	},
	{
		id = "graphics.shadows",
		name = "Giảm tầm bóng đổ + tắt bóng part xa",
		group = "graphics",
		module = Opt_Graphics,
		handler = "ApplyShadowBudget",
		restorable = true,
	},
	{
		id = "graphics.character",
		name = "Tắt bóng & auto-scaling nhân vật",
		group = "character",
		module = Opt_Graphics,
		handler = "ApplyCharacter",
		restorable = true,
	},
	{
		id = "effects.particles",
		name = "Giới hạn hạt (particle) — không xoá effect",
		group = "effects",
		module = Opt_Effects,
		handler = "CapParticles",
		restorable = true,
	},
	{
		id = "effects.optional",
		name = "Beam/Trail/Decal (tuỳ chọn, mặc định giữ nguyên)",
		group = "effects",
		module = Opt_Effects,
		handler = "ApplyOptionalEffects",
		restorable = true,
	},
	{
		id = "physics.throttling",
		name = "Bớt làm mượt nội suy vật lý (mặc định TẮT)",
		group = "physics",
		module = Opt_Physics,
		handler = "ApplyThrottling",
		restorable = true,
	},
	{
		id = "memory.gc",
		name = "Kích hoạt chu kỳ dọn bộ nhớ Luau",
		group = "memory",
		module = Opt_Memory,
		handler = "StartGcLoop",
		restorable = false,
	},
	{
		id = "memory.orphanSweep",
		name = "Gom instance mồ côi (lưu trữ, không xoá)",
		group = "memory",
		module = Opt_Memory,
		handler = "SweepOrphans",
		restorable = false,
	},
}

-- Dịch tên service mà mỗi bước cần. Không có service -> bước bị skip.
local REQUIRED_SERVICE = {
	["graphics.quality"] = "Lighting",
	["graphics.terrain"] = "Workspace",
	["graphics.shadows"] = "Workspace",
	["graphics.character"] = "Players",
}

--[[
	Xây dựng kế hoạch. KHÔNG thực thi gì ở đây.
	profile: bảng cấu hình (mặc định Shared_Config.PROFILE)
]]
function Plan.Build(profile)
	profile = profile or Shared_Config.PROFILE

	local mode = Shared_Config.Mode()
	local steps = {}

	for index, entry in ipairs(Plan.CATALOG) do
		local available, reason = true, nil

		-- 1) công tắc tổng
		if profile.enabled == false or mode == "off" then
			available, reason = false, "hệ thống đang tắt (enabled = false hoặc mode = 'off')"

		-- 2) công tắc theo NHÓM (CFG-001)
		elseif not Core_Devices.IsEnabled(profile, entry.group, entry.id) then
			available, reason = false, ("tắt trong config (groups.%s = false)"):format(tostring(entry.group))

		-- 3) điều kiện vật lý của từng bước
		else
			local service = REQUIRED_SERVICE[entry.id]
			if service ~= nil and Core_Env.GetService(service) == nil then
				available, reason = false, ("không truy cập được service %s"):format(service)
			elseif entry.id == "physics.throttling" and not profile.physics.enabled then
				available, reason = false,
					"tắt trong config (physics.enabled = false) — có đánh đổi cảm giác chơi"
			elseif entry.module[entry.handler] == nil then
				-- Chốt an toàn: handler không tồn tại thì KHÔNG được báo "đã làm"
				available, reason = false, ("module thiếu handler %s"):format(tostring(entry.handler))
			end
		end

		steps[#steps + 1] = {
			index = index,
			id = entry.id,
			name = entry.name,
			group = entry.group,
			module = entry.module,
			handler = entry.handler,
			available = available,
			reason = reason,
			status = Shared_Types.STATUS_PENDING,
			detail = reason,
			changes = 0,
			restorable = entry.restorable == true,
		}
	end

	return {
		steps = steps,
		total = #steps,
		profile = profile,
		mode = mode,
		environment = Core_Env.mode,
	}
end

function Plan.GetById(plan, id)
	for _, step in ipairs(plan.steps) do
		if step.id == id then
			return step
		end
	end
	return nil
end

function Plan.CountAvailable(plan)
	local n = 0
	for _, step in ipairs(plan.steps) do
		if step.available then
			n += 1
		end
	end
	return n
end

-- Tóm tắt kế hoạch thành các dòng chữ, dùng cho Output và GUI.
function Plan.Describe(plan)
	local lines = {
		("kế hoạch: %d bước, %d bước khả dụng (chế độ: %s)")
			:format(plan.total, Plan.CountAvailable(plan), tostring(plan.mode)),
	}
	for _, step in ipairs(plan.steps) do
		lines[#lines + 1] = ("  %2d. %-42s %s")
			:format(step.index, step.name, step.available and "sẵn sàng" or ("BỎ QUA: " .. tostring(step.reason)))
	end
	return lines
end

return Plan
