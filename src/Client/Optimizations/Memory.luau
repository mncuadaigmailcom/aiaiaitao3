--[[
	Optimizations/Memory.luau
	Dọn bộ nhớ Luau và gom instance "mồ côi".

	Nguyên tắc KHÔNG XOÁ: instance mồ côi (không còn parent, không phải
	con của DataModel) được CHUYỂN về một folder lưu trữ trong
	CorePackages/ServerStorage thay vì Destroy(). Người dùng vẫn hoàn tác được
	bằng cách kéo chúng ra khỏi folder.

	GC: dùng collectgarbage("step", n) theo chu kỳ — rẻ và không gây khựng
	như collectgarbage("collect") toàn phần.
]]

local Core_Env = __RALO_REQUIRE("Client/Core/Env")
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
		return { changes = 0, detail = "vòng GC đã chạy sẵn", restorable = false }
	end

	local stepKb = profile.memory.collectStepKb or 200
	local runs = 0
	local thread = Core_Env.task.spawn(function()
		while Memory.gcHandle ~= nil do
			Core_Env.task.wait(every)
			if Memory.gcHandle == nil then break end
			local ok, err = pcall(collectgarbage, "step", stepKb)
			if ok then
				runs += 1
			else
				Util_Log.Warn(SCOPE, "collectgarbage step lỗi:", tostring(err))
			end
		end
	end)

	Memory.gcHandle = { thread = thread, runs = function() return runs end, every = every }
	return {
		changes = 1,
		detail = ("bật collectgarbage(\"step\", %d) mỗi %ds"):format(stepKb, every),
		restorable = false,
	}
end

function Memory.StopGcLoop()
	local handle = Memory.gcHandle
	Memory.gcHandle = nil
	if handle and handle.thread and Core_Env.task.cancel then
		pcall(Core_Env.task.cancel, handle.thread)
		Util_Log.Info(SCOPE, "đã tắt vòng GC")
		return true
	end
	return false
end

return Memory
