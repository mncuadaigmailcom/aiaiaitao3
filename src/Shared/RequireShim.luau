--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  CPU-003 
	===== RALO.METHODS:END ===== --]]

--[[
	Shared/RequireShim.luau
	===== RALO.METHODS:SHIM-001 =====

	Vấn đề: dự án phải chạy được ở HAI kiểu nạp khác nhau
	  (1) Roblox Studio + Rojo: mỗi tệp là một ModuleScript, dùng require()
	      và cây instance (ReplicatedStorage.RALO.Shared.Log ...).
	  (2) Bundle một tệp (dist/): toàn bộ module nằm trong một bảng,
	      không có cây instance.

	Giải pháp: Bootstrap cài một hàm nạp module thống nhất tên
	__RALO_REQUIRE. Nó thử theo thứ tự:
	  a) bảng __RALO_BUNDLE (do bundle cài)
	  b) require() thật của Roblox, duyệt theo đường dẫn tuyệt đối
	     tính từ gốc dự án (Shared/..., Client/..., Server/...)

	Cả hai nhánh đều là cơ chế nạp module CÓ THẬT của Roblox, không giả lập.

	Tệp này KHÔNG dùng __RALO_REQUIRE (vì nó chính là thứ cài ra hàm đó);
	nó được Bootstrap nạp bằng require() thường hoặc nằm đầu bundle.
]]

local RequireShim = {}

RequireShim.globalName = "__RALO_REQUIRE"

local ROOT_NAMES = { "Shared", "Client", "Server" }

-- Duyệt "Client/Core/Perf" thành chuỗi instance con từ một gốc.
local function resolveFrom(root, path)
	if root == nil then
		return nil
	end
	local node = root
	for segment in string.gmatch(path, "[^/]+") do
		if node == nil then
			return nil
		end
		node = node:FindFirstChild(segment)
	end
	return node
end

-- Tìm gốc dự án: instance cha chứa các thư mục Shared/Client/Server.
local function findProjectRoot(gameRef)
	if gameRef == nil then
		return nil
	end
	local starterPlayer = gameRef:GetService("StarterPlayer")
	local services = {
		gameRef:GetService("ReplicatedStorage"),
		starterPlayer and starterPlayer:FindFirstChild("StarterPlayerScripts"),
		gameRef:GetService("ServerScriptService"),
	}
	for _, service in services do
		if service ~= nil then
			for _, rootName in ROOT_NAMES do
				local candidate = service:FindFirstChild(rootName)
				if candidate ~= nil then
					local parent = candidate.Parent
					if parent ~= nil and parent:FindFirstChild("Shared") ~= nil then
						return parent
					end
				end
			end
			local named = service:FindFirstChild("RALO")
			if named ~= nil then
				return named
			end
		end
	end
	return nil
end

--[[
	Cài __RALO_REQUIRE. Gọi MỘT lần trước khi nạp bất kỳ module nào khác.
	options = { game = <DataModel>, bundle = <bảng path->source|module> }
]]
function RequireShim.Install(options)
	options = options or {}

	-- Dự án chạy trong Roblox Studio thường (không executor) nên bảng toàn
	-- cục chỉ là `_G`. Không dò getgenv: đó là API của executor, và việc dò
	-- nó mâu thuẫn với phạm vi đã thống nhất của dự án.
	local globalEnv = _G

	if globalEnv[RequireShim.globalName] ~= nil and options.force ~= true then
		return globalEnv[RequireShim.globalName]
	end

	if options.bundle ~= nil then
		globalEnv.__RALO_BUNDLE = options.bundle
	end

	local cache = {}
	local gameRef = options.game or game

	local function resolver(path)
		if type(path) ~= "string" then
			error("__RALO_REQUIRE cần một chuỗi đường dẫn, nhận " .. type(path), 2)
		end
		if cache[path] ~= nil then
			return cache[path]
		end

		-- (a) bundle
		local bundle = globalEnv.__RALO_BUNDLE
		if type(bundle) == "table" and bundle[path] ~= nil then
			local entry = bundle[path]
			local result
			if type(entry) == "string" then
				local loaded, compileError = load(entry, "RALO:" .. path)
				if loaded == nil then
					error("lỗi biên dịch module '" .. path .. "': " .. tostring(compileError), 2)
				end
				result = loaded()
			else
				result = entry
			end
			if type(result) ~= "table" then
				error("module '" .. path .. "' phải return một bảng, nhận " .. type(result), 2)
			end
			cache[path] = result
			return result
		end

		-- (b) require() thật theo đường dẫn tuyệt đối
		if globalEnv.__RALO_ROOT == nil then
			globalEnv.__RALO_ROOT = findProjectRoot(gameRef) or false
		end
		local root = globalEnv.__RALO_ROOT
		local target = resolveFrom(root, path)
		if target ~= nil then
			local ok, result = pcall(require, target)
			if not ok then
				error("require('" .. path .. "') thất bại: " .. tostring(result), 2)
			end
			cache[path] = result
			return result
		end

		error(("không tìm thấy module '%s' (gốc=%s). Kiểm tra cây thư mục trong Studio.")
			:format(path, tostring(root)), 2)
	end

	globalEnv[RequireShim.globalName] = resolver
	return resolver
end

-- Cho phép test/harness reset giữa các lần chạy.
function RequireShim.Reset()
	local globalEnv = _G
	globalEnv[RequireShim.globalName] = nil
	globalEnv.__RALO_BUNDLE = nil
	globalEnv.__RALO_ROOT = nil
end

return RequireShim
