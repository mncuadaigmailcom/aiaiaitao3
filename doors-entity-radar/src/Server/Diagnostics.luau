--[[
	doors-entity-radar/src/Server/Diagnostics.luau
	**Script (Server)** — TUỲ CHỌN, mặc định TẮT.

	Vị trí: ServerScriptService > DoorsEntityRadarServer > Diagnostics (Script)

	TỆP NÀY TỒN TẠI ĐỂ LÀM GÌ?
	Radar phía client chỉ đoán được tên instance. Muốn chuyển một mục từ
	"Chưa xác minh" sang trạng thái tin cậy, bạn cần biết TÊN THẬT của
	instance trong game. Script này in ra đúng thông tin đó:
	  * liệt kê tên instance khớp từng mục danh mục (mỗi bên nhìn một phía:
	    server thấy toàn bộ, client chỉ thấy phần được nhân bản);
	  * so sánh với những gì client thấy để biết mục nào KHÔNG được nhân bản.

	Sau khi đọc Output, bạn chép tên thật vào
	Config.Detection.confirmedPatterns (hoặc extraPatterns) phía client.

	RÀNG BUỘC:
	  * MẶC ĐỊNH TẮT (ENABLED = false) — không chạy thì không làm gì cả.
	  * CHỈ ĐỌC. Không di chuyển, không đổi thuộc tính đối tượng của game,
	    không tạo RemoteEvent ảnh hưởng lối chơi.
	  * Chế độ PUBLISH (tạo Folder Attribute cho cầu nhà phát triển) cũng
	    mặc định TẮT và chỉ nên bật trong game BẠN có quyền chỉnh sửa.
]]

--============================= CẤU HÌNH CỦA SCRIPT =============================
local ENABLED = false          -- bật lên true nếu bạn muốn chạy chẩn đoán
local PUBLISH = false          -- bật lên true nếu muốn phát dữ liệu qua Attribute
local SCAN_INTERVAL = 5        -- giây giữa hai lần quét
local MAX_REPORT_PER_ENTITY = 5
local BRIDGE_FOLDER = "DER_Bridge"
local BRIDGE_PREFIX = "DER_"
local MAX_DESCENDANTS = 20000
--==============================================================================

if not ENABLED then
	print("[DER][Server] Diagnostics đang TẮT (ENABLED = false). Không làm gì cả.")
	return
end

-- Nạp bộ module dùng chung (cùng cơ chế với client, không có gì đặc biệt).
local replicatedStorage = game:GetService("ReplicatedStorage")
local root = replicatedStorage:WaitForChild("DoorsEntityRadar", 10)
if root == nil then
	warn("[DER][Server] Không thấy ReplicatedStorage.DoorsEntityRadar — dừng chẩn đoán.")
	return
end
local shimModule = root.Shared:WaitForChild("RequireShim", 10)
local shim = require(shimModule)
shim.Install({ game = game })

local Catalog = __DER_REQUIRE("Shared/EntityCatalog")

-- Chuẩn hoá tên giống hệt phía client (dùng chung một hàm).
local normalize = Catalog.NormalizeKey

-- Dựng luật khớp từ danh mục: exact + contains.
local exactRules = {}
local containsRules = {}
for _, entry in ipairs(Catalog.List) do
	if entry.detect.method ~= "unsupported" then
		for _, key in ipairs(Catalog.GetMatchKeys(entry)) do
			if entry.detect.matchMode == "contains" then
				containsRules[#containsRules + 1] = { key = key, id = entry.id }
			else
				if exactRules[key] == nil then
					exactRules[key] = {}
				end
				local bucket = exactRules[key]
				bucket[#bucket + 1] = entry.id
			end
		end
	end
end

local function matchName(instanceName)
	local hits = {}
	local key = normalize(instanceName)
	if #key == 0 then
		return hits
	end
	local direct = exactRules[key]
	if direct ~= nil then
		for _, id in ipairs(direct) do
			hits[id] = true
		end
	end
	for _, rule in ipairs(containsRules) do
		if string.find(key, rule.key, 1, true) ~= nil then
			hits[rule.id] = true
		end
	end
	return hits
end

-- Đọc vị trí (chỉ đọc, không đổi gì).
local function looksLikeVector(value)
	if value == nil then
		return false
	end
	local okX, x, y, z = pcall(function()
		return value.X, value.Y, value.Z
	end)
	if not okX then
		return false
	end
	return type(x) == "number" and x == x and type(y) == "number" and y == y and type(z) == "number" and z == z
end

local function readPosition(instance)
	local okDirect, direct = pcall(function()
		return instance.Position
	end)
	if okDirect and looksLikeVector(direct) then
		return direct
	end
	local okPivot, pivot = pcall(function()
		return instance:GetPivot()
	end)
	if okPivot and pivot ~= nil then
		local okPivotPos, pivotPos = pcall(function()
			return pivot.Position
		end)
		if okPivotPos and looksLikeVector(pivotPos) then
			return pivotPos
		end
	end
	return nil
end

local function readClassName(instance)
	local ok, className = pcall(function()
		return instance.ClassName
	end)
	if ok and type(className) == "string" then
		return className
	end
	return "?"
end

-- Folder cầu dữ liệu (chỉ tạo khi PUBLISH = true).
local bridgeFolder = nil
if PUBLISH then
	bridgeFolder = workspace:FindFirstChild(BRIDGE_FOLDER)
	if bridgeFolder == nil then
		bridgeFolder = Instance.new("Folder")
		bridgeFolder.Name = BRIDGE_FOLDER
		bridgeFolder.Parent = workspace
	end
	print(("[DER][Server] Đã bật cầu dữ liệu: workspace.%s (prefix %s)"):format(BRIDGE_FOLDER, BRIDGE_PREFIX))
end

local function scanOnce()
	local ok, descendants = pcall(function()
		return workspace:GetDescendants()
	end)
	if not ok or type(descendants) ~= "table" then
		warn("[DER][Server] Không đọc được Workspace:GetDescendants().")
		return
	end

	local total = math.min(#descendants, MAX_DESCENDANTS)
	local found = {}
	local seenNames = {}

	for index = 1, total do
		local instance = descendants[index]
		local okName, instanceName = pcall(function()
			return instance.Name
		end)
		if okName and type(instanceName) == "string" then
			local hits = matchName(instanceName)
			for entityId in pairs(hits) do
				if found[entityId] == nil then
					found[entityId] = {}
				end
				local bucket = found[entityId]
				if #bucket < MAX_REPORT_PER_ENTITY then
					bucket[#bucket + 1] = {
						name = instanceName,
						className = readClassName(instance),
						position = readPosition(instance),
					}
				end
				seenNames[instanceName] = true
			end
		end
	end

	print(("[DER][Server] Đã duyệt %d/%d descendant. Khớp %d mục danh mục.")
		:format(total, #descendants, (function()
			local count = 0
			for _ in pairs(found) do
				count = count + 1
			end
			return count
		end)()))
	if #descendants > MAX_DESCENDANTS then
		warn(("[DER][Server] Workspace có %d descendant, vượt trần %d: kết quả có thể thiếu.")
			:format(#descendants, MAX_DESCENDANTS))
	end

	for _, entry in ipairs(Catalog.List) do
		local bucket = found[entry.id]
		if bucket ~= nil then
			for _, hit in ipairs(bucket) do
				local positionText = "không có vị trí"
				if hit.position ~= nil then
					positionText = ("%.1f, %.1f, %.1f"):format(hit.position.X, hit.position.Y, hit.position.Z)
					if PUBLISH and bridgeFolder ~= nil then
						bridgeFolder:SetAttribute(
							BRIDGE_PREFIX .. "entity_" .. entry.id,
							("%.2f,%.2f,%.2f"):format(hit.position.X, hit.position.Y, hit.position.Z))
					end
				end
				print(("  [KHỚP] %s <- instance '%s' (%s) tại %s")
					:format(entry.id, hit.name, hit.className, positionText))
			end
		end
	end

	-- Gợi ý dòng cấu hình để người dùng chép vào Config.Detection.confirmedPatterns.
	local suggestions = {}
	for instanceName in pairs(seenNames) do
		suggestions[#suggestions + 1] = ('"%s"'):format(instanceName)
	end
	if #suggestions > 0 then
		table.sort(suggestions)
		print("[DER][Server] Chép vào Config.Detection.confirmedPatterns nếu bạn đã tự kiểm chứng: { "
			.. table.concat(suggestions, ", ") .. " }")
	end
end

print("[DER][Server] Diagnostics BẬT. Script này chỉ đọc, không đổi trò chơi.")

-- Một vòng lặp duy nhất, chờ theo giây. Không bám Heartbeat vì việc quét
-- không cần độ chính xác khung hình — bám Heartbeat chỉ tổ tốn tài nguyên.
task.spawn(function()
	while ENABLED do
		scanOnce()
		task.wait(SCAN_INTERVAL)
	end
end)
