--[[
	doors-entity-radar/src/Shared/RequireShim.luau
	ModuleScript — đặt tại: ReplicatedStorage.DoorsEntityRadar.Shared.RequireShim

	BỘ NẠP MODULE THỐNG NHẤT. Dự án phải chạy được ở hai kiểu nạp:
	  (1) Rojo / Studio: mỗi tệp là một ModuleScript trong cây instance,
	      nạp bằng require() thật của Roblox;
	  (2) Một tệp duy nhất (dist/): mọi module nằm trong một bảng, không có
	      cây instance — nạp từ bảng đó.

	Cả hai nhánh đều là cơ chế CÓ THẬT của Roblox. Không loadstring, không
	executor, không fetch mã từ mạng.

	Cách dùng: LocalScript khởi động gọi RequireShim.Install{ game = game }
	TRƯỚC khi require bất kỳ module nào khác. Sau đó mọi tệp dùng
	__DER_REQUIRE("Shared/Status") thay vì require(script.Parent...).
]]

local RequireShim = {}

RequireShim.globalName = "__DER_REQUIRE"

-- Các nhánh con được coi là gốc dự án khi tìm trong service.
RequireShim.rootNames = { "Shared", "Client", "Server" }
RequireShim.projectFolderName = "DoorsEntityRadar"

-- Duyệt "Client/Core/Scanner" thành instance con từ một gốc.
local function resolveFrom(root, modulePath)
	if root == nil then
		return nil
	end
	local node = root
	for segment in string.gmatch(modulePath, "[^/]+") do
		if node == nil then
			return nil
		end
		node = node:FindFirstChild(segment)
	end
	return node
end

-- Tìm gốc dự án: instance cha có chứa thư mục "Shared".
local function findProjectRoot(gameRef)
	if gameRef == nil then
		return nil
	end
	local okStarter, starterPlayer = pcall(function()
		return gameRef:GetService("StarterPlayer")
	end)
	local candidates = {}

	local okRs, replicatedStorage = pcall(function()
		return gameRef:GetService("ReplicatedStorage")
	end)
	if okRs then
		candidates[#candidates + 1] = replicatedStorage
	end
	if okStarter and starterPlayer ~= nil then
		candidates[#candidates + 1] = starterPlayer:FindFirstChild("StarterPlayerScripts")
	end
	local okSss, serverScriptService = pcall(function()
		return gameRef:GetService("ServerScriptService")
	end)
	if okSss then
		candidates[#candidates + 1] = serverScriptService
	end

	for _, service in ipairs(candidates) do
		if service ~= nil then
			-- (a) thư mục dự án đặt tên rõ ràng
			local named = service:FindFirstChild(RequireShim.projectFolderName)
			if named ~= nil then
				return named
			end
			-- (b) cây phẳng: service chứa trực tiếp Shared/Client/Server
			for _, rootName in ipairs(RequireShim.rootNames) do
				local child = service:FindFirstChild(rootName)
				if child ~= nil and child.Parent ~= nil
					and child.Parent:FindFirstChild("Shared") ~= nil then
					return child.Parent
				end
			end
		end
	end
	return nil
end

--[[
	Cài __DER_REQUIRE vào _G. Gọi MỘT lần.
	options:
	  game   — DataModel (mặc định: game)
	  bundle — bảng { ["Shared/Status"] = <chuỗi mã nguồn hoặc bảng module> }
	  force  — cài lại dù đã có (chỉ dùng trong kiểm thử)
]]
function RequireShim.Install(options)
	options = options or {}
	local globalEnv = _G

	if globalEnv[RequireShim.globalName] ~= nil and options.force ~= true then
		return globalEnv[RequireShim.globalName]
	end

	if options.bundle ~= nil then
		globalEnv.__DER_BUNDLE = options.bundle
	end

	local cache = {}
	local gameRef = options.game or game
	local rootResolved = false

	local function resolver(modulePath)
		if type(modulePath) ~= "string" then
			error(("__DER_REQUIRE cần chuỗi đường dẫn, nhận %s"):format(type(modulePath)), 2)
		end
		if cache[modulePath] ~= nil then
			return cache[modulePath]
		end

		-- (a) bundle một tệp
		local bundle = globalEnv.__DER_BUNDLE
		if type(bundle) == "table" and bundle[modulePath] ~= nil then
			local entry = bundle[modulePath]
			local result
			if type(entry) == "string" then
				local chunk, compileError = load(entry, "DER:" .. modulePath)
				if chunk == nil then
					error(("lỗi biên dịch module '%s': %s"):format(modulePath, tostring(compileError)), 2)
				end
				result = chunk()
			else
				result = entry
			end
			if type(result) ~= "table" then
				error(("module '%s' phải return một bảng, nhận %s"):format(modulePath, type(result)), 2)
			end
			cache[modulePath] = result
			return result
		end

		-- (b) require() thật theo đường dẫn tuyệt đối trong cây instance
		if not rootResolved then
			globalEnv.__DER_ROOT = findProjectRoot(gameRef) or false
			rootResolved = true
		end
		local root = globalEnv.__DER_ROOT
		local target = resolveFrom(root, modulePath)
		if target ~= nil then
			local ok, result = pcall(require, target)
			if not ok then
				error(("require('%s') thất bại: %s"):format(modulePath, tostring(result)), 2)
			end
			cache[modulePath] = result
			return result
		end

		error(("không tìm thấy module '%s' (gốc=%s). Kiểm tra lại cây thư mục trong Studio.")
			:format(modulePath, tostring(root)), 2)
	end

	globalEnv[RequireShim.globalName] = resolver
	return resolver
end

-- Gỡ shim (chỉ dùng trong kiểm thử).
function RequireShim.Reset()
	_G[RequireShim.globalName] = nil
	_G.__DER_BUNDLE = nil
	_G.__DER_ROOT = nil
end

return RequireShim
