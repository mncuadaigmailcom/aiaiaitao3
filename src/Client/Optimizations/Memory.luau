--[[
	Optimizations/Memory.luau
	Dọn bộ nhớ Luau và gom instance "mồ côi".

	Nguyên tắc KHÔNG XOÁ: instance mồ côi (không còn parent, không phải
	con của DataModel) được CHUYỂN về một folder lưu trữ trong
	CorePackages/ServerStorage thay vì Destroy(). Người dùng vẫn hoàn tác được
	bằng cách kéo chúng ra khỏi folder.

	GC: dùng collectgarbage("step", n) theo chu kỳ qua Scheduler chung — rẻ,
	không tạo thread riêng, và huỷ được khi hệ thống Shutdown.
]]

local Core_Env = __RALO_REQUIRE("Client/Core/Env")
local Core_Scheduler = __RALO_REQUIRE("Client/Core/Scheduler")
local Util_Safe = __RALO_REQUIRE("Shared/Safe")
local Util_Log = __RALO_REQUIRE("Shared/Log")

local SCOPE = "Memory"

local Memory = {}

Memory.gcHandle = nil
Memory.archiveFolder = nil
Memory.archived = 0

local function ensureArchiveFolder()
	if Memory.archiveFolder ~= nil then
		return Memory.archiveFolder
	end
	local game = Core_Env.game
	if game == nil then
		return nil
	end
	local holder, ok = Util_Safe.Get(game, "CorePackages")
	if not ok or holder == nil then
		holder = Util_Safe.Get(game, "ServerStorage")
	end
	if holder == nil then
		return nil
	end

	local folder = holder:FindFirstChild("RALO_Archive")
	if folder == nil then
		local okNew, created = pcall(function()
			local instance = Instance.new("Folder")
			instance.Name = "RALO_Archive"
			instance.Parent = holder
			return instance
		end)
		if not okNew then
			Util_Log.Warn(SCOPE, "không tạo được folder lưu trữ:", tostring(created))
			return nil
		end
		folder = created
	end
	Memory.archiveFolder = folder
	return folder
end

--[[
	Gom instance mồ côi. "Mồ côi" = instance có Parent == nil nhưng vẫn còn
	tham chiếu sống (thường do script tạo ra rồi bỏ quên). Ta chỉ xử lý
	những gì tìm được qua GetDescendants của các service chứa chúng,
	nên mặc định bước này chỉ báo cáo và hầu như không đổi gì —
	đúng bản chất, không phóng đại.
]]
function Memory.SweepOrphans(_step: any, profile: any)
	if not profile.memory.archiveOrphans then
		return { changes = 0, detail = "archiveOrphans = false", restorable = false }
	end

	local folder = ensureArchiveFolder()
	if folder == nil then
		return {
			changes = 0,
			detail = "không tạo được folder lưu trữ -> bỏ qua (không xoá gì cả)",
			restorable = false,
		}
	end

	-- Chỉ quét những container "rác" kinh điển: workspace.Debris,
	-- ReplicatedStorage/ServerStorage rỗng, và các instance tên trùng mẫu tạm.
	local game = Core_Env.game
	local moved = 0
	if game ~= nil then
		local workspace = Core_Env.GetService("Workspace")
		local debris = workspace and workspace:FindFirstChild("Debris")
		if debris ~= nil then
			local ok, children = pcall(function() return debris:GetChildren() end)
			if ok then
				for _, child in children do
					local okMove = pcall(function() child.Parent = folder end)
					if okMove then
						moved += 1
					end
				end
			end
		end
	end

	Memory.archived += moved
	return {
		changes = moved,
		detail = moved > 0
			and ("chuyển %d instance từ workspace.Debris vào CorePackages/RALO_Archive (không xoá)")
				:format(moved)
			or "không tìm thấy instance mồ côi trong các container rác — không có gì để dọn",
		restorable = false,
	}
end

--[[
	Bật vòng dọn GC theo chu kỳ. Trả về handle để StopGcLoop huỷ được.
]]
function Memory.StartGcLoop(_step: any, profile: any)
	local every = profile.memory.gcEverySeconds or 0
	if every <= 0 then
		return { changes = 0, detail = "gcEverySeconds = 0 nên không bật", restorable = false }
	end
	if collectgarbage == nil then
		return { changes = 0, detail = "runtime không có collectgarbage", restorable = false }
	end

	-- Nếu đã có vòng chạy sẵn thì không tạo vòng thứ hai.
	if Memory.gcHandle ~= nil then
		return { changes = 0, detail = "tác vụ GC đã chạy sẵn", restorable = false }
	end

	local stepKb = profile.memory.collectStepKb or 200
	local handle = Core_Scheduler.Schedule({
		name = "memory.gc",
		interval = every,
		priority = -40,
		callback = function()
			local ok, err = pcall(collectgarbage, "step", stepKb)
			if not ok then
				Util_Log.Warn(SCOPE, "collectgarbage step lỗi:", tostring(err))
			end
		end,
	})
	if handle == nil then
		return { changes = 0, detail = "không đăng ký được tác vụ GC", restorable = false }
	end

	Memory.gcHandle = handle
	return {
		changes = 1,
		detail = ("bật collectgarbage(\"step\", %d) mỗi %ds qua Scheduler")
			:format(stepKb, every),
		restorable = false,
	}
end

function Memory.StopGcLoop()
	local handle = Memory.gcHandle
	Memory.gcHandle = nil
	if handle == nil then
		return false
	end

	local ok, err = pcall(function()
		handle:Cancel()
	end)
	if ok then
		Util_Log.Info(SCOPE, "đã huỷ tác vụ GC định kỳ")
		return true
	end
	Util_Log.Warn(SCOPE, "không huỷ được tác vụ GC:", tostring(err))
	return false
end

return Memory
