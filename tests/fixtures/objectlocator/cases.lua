--!nocheck
--[[
    Ca kiểm thử cho object-locator/ObjectLocator.lua.
    Chạy trong máy ảo Lua 5.3 + mock Roblox (tools/test-harness).
    Mỗi ca nhận một runtime RIÊNG từ tests/suites/objectlocator.test.js.
    Trả về bảng Cases; JS gọi CASES.run("MÃ-CA").
]]

local OL = OL
local Cases = {}

local H = {}
Cases.H = H

local function fail(message)
    error(message, 0)
end

function H.eq(actual, expected, label)
    if actual ~= expected then
        fail(string.format("[%s] mong đợi %s, nhận %s", label, tostring(expected), tostring(actual)))
    end
end

function H.near(actual, expected, tolerance, label)
    if type(actual) ~= "number" or math.abs(actual - expected) > tolerance then
        fail(string.format("[%s] mong đợi %s ± %s, nhận %s", label, tostring(expected), tostring(tolerance), tostring(actual)))
    end
end

function H.ok(value, label)
    if not value then
        fail("[" .. label .. "] mong đợi truthy, nhận " .. tostring(value))
    end
end

function H.notOk(value, label)
    if value then
        fail("[" .. label .. "] mong đợi falsy, nhận " .. tostring(value))
    end
end

function H.contains(text, needle, label)
    if type(text) ~= "string" or not text:find(needle, 1, true) then
        fail(string.format("[%s] chuỗi không chứa %q: %s", label, tostring(needle), tostring(text)))
    end
end

function H.notContains(text, needle, label)
    if type(text) == "string" and text:find(needle, 1, true) then
        fail(string.format("[%s] chuỗi KHÔNG được chứa %q: %s", label, tostring(needle), tostring(text)))
    end
end

function H.deepCopy(value)
    if type(value) ~= "table" then
        return value
    end
    local copy = {}
    for key, item in pairs(value) do
        copy[key] = H.deepCopy(item)
    end
    return copy
end

-- ---------------------------------------------------------------- thế giới
function H.resetWorld()
    local ws = workspace
    for _, child in ipairs(ws:GetChildren()) do
        if child:IsA("Camera") then
            -- giữ camera
        elseif child.Name == "Character" then
            for _, limb in ipairs(child:GetChildren()) do
                if not limb:IsA("Humanoid") and limb.Name ~= "HumanoidRootPart" then
                    limb:Destroy()
                end
            end
        elseif child.ClassName ~= "Terrain" then
            child:Destroy()
        end
    end
    local character = ws:FindFirstChild("Character")
    if character ~= nil then
        local root = character:FindFirstChild("HumanoidRootPart")
        if root == nil then
            root = Instance.new("Part")
            root.Name = "HumanoidRootPart"
            root.Size = Vector3.new(2, 2, 1)
            root.Parent = character
        end
        root.Position = Vector3.new(0, 5, 0)
    end
    return ws
end

function H.root()
    local character = workspace:FindFirstChild("Character")
    return character and character:FindFirstChild("HumanoidRootPart") or nil
end

function H.humanoid()
    local character = workspace:FindFirstChild("Character")
    return character and character:FindFirstChildOfClass("Humanoid") or nil
end

function H.part(name, x, y, z, parent)
    local part = Instance.new("Part")
    part.Name = name
    part.Position = Vector3.new(x or 0, y or 0, z or 0)
    part.Size = Vector3.new(2, 2, 2)
    part.Parent = parent or workspace
    return part
end

function H.model(name, parent)
    local model = Instance.new("Model")
    model.Name = name
    model.Parent = parent or workspace
    return model
end

function H.folder(name, parent)
    local folder = Instance.new("Folder")
    folder.Name = name
    folder.Parent = parent or workspace
    return folder
end

function H.count(className)
    local count = 0
    for _, descendant in ipairs(workspace:GetDescendants()) do
        if descendant.ClassName == className then
            count = count + 1
        end
    end
    return count
end

function H.findVisual(className, adornee)
    for _, descendant in ipairs(workspace:GetDescendants()) do
        if descendant.ClassName == className then
            local ok, value = pcall(function()
                return descendant.Adornee
            end)
            if ok and value == adornee then
                return descendant
            end
        end
    end
    return nil
end

function H.defaultConfig(overrides)
    local config = {
        headless = true,
        scanNodesPerFrame = 64,
        scanMsPerFrame = 1000,
        frameBudgetMs = 100,
        makePerFrame = 32,
        tickEvery = 0.02,
        tickPerFrame = 60,
        uiEvery = 0.02,
        rescanEvery = 100,
        hiddenRescanEvery = 100,
        maxItems = 80,
        maxDistance = 0,
        listRows = 14,
        maxHits = 4000,
        autoRestore = false,
    }
    for key, value in pairs(overrides or {}) do
        config[key] = value
    end
    return config
end

function H.newController(overrides)
    return OL.newController({ config = H.defaultConfig(overrides) })
end

--- Quét cho tới khi xong lượt mới + tạo xong hiển thị (có trần khung).
function H.scan(controller, maxFrames)
    local target = controller.scanCount + 1
    local frames = 0
    maxFrames = maxFrames or 800
    repeat
        controller:step(1 / 60)
        frames = frames + 1
    until (controller.scanCount >= target
        and not controller.scanner.scanning
        and controller.pendingIndex > #controller.pending)
        or frames >= maxFrames
    return frames
end

function H.stepFor(controller, seconds)
    local dt = 1 / 60
    local steps = math.max(1, math.ceil((tonumber(seconds) or 0) / dt))
    for _ = 1, steps do
        controller:step(dt)
    end
end

function H.labelOf(part)
    local billboard = part and part:FindFirstChild("OL_Label")
    return billboard and billboard:FindFirstChild("Text")
end

function H.entryKeys(controller)
    local keys = {}
    for i = 1, #controller.entries do
        keys[#keys + 1] = controller.entries[i].kind .. ":" .. controller.entries[i].key
    end
    return table.concat(keys, ",")
end

function H.fakeStore(initial)
    local memory = initial and H.deepCopy(initial) or nil
    return {
        load = function()
            return memory and H.deepCopy(memory) or nil
        end,
        save = function(_, data)
            memory = H.deepCopy(data)
            return true
        end,
        peek = function()
            return memory
        end,
    }
end

-- ===================================================================== CORE
Cases["CORE-001"] = function()
    H.eq(OL.Core.normalize("Cây ĐÁ"), "cay da", "bỏ dấu + chữ thường")
    H.eq(OL.Core.normalize("  Tàu   Ngầm  "), "tau ngam", "gộp khoảng trắng")
    H.eq(OL.Core.normalize("Đường"), "duong", "đ -> d")
    H.eq(OL.Core.normalize("RỪNG CÂY"), "rung cay", "chữ hoa")
    H.eq(OL.Core.normalize(nil), "", "nil")
    H.eq(OL.Core.normalize(123), "123", "số")
    H.eq(OL.Core.normalize("Cây [01] (bản sao)"), "cay [01] (ban sao)", "ký tự đặc biệt")
end

Cases["CORE-002"] = function()
    local list = OL.Core.parseList("cây, đá; cây")
    H.eq(#list, 2, "dedupe tên")
    H.eq(list[1].kind, "name", "kind tên")
    H.eq(list[1].key, "cay", "key tên")
    H.eq(list[2].key, "da", "key tên 2")

    local paths = OL.Core.parseList("Workspace.Rừng Cây.Cây Lớn")
    H.eq(#paths, 1, "một path")
    H.eq(paths[1].kind, "path", "kind path")
    H.eq(#paths[1].segs, 2, "2 đoạn path")
    H.eq(paths[1].segs[1], "rung cay", "đoạn 1")
    H.eq(paths[1].segs[2], "cay lon", "đoạn 2")

    local mixed = OL.Core.parseList("game.Workspace/Rừng Cây/Cây Lớn, Cây, cây")
    H.eq(#mixed, 2, "path + tên, tên trùng bị gộp")
    H.eq(mixed[1].kind, "path", "path đứng đầu")
    H.eq(mixed[2].kind, "name", "tên đứng sau")

    H.eq(#OL.Core.parseList("   , ;; ,  "), 0, "chuỗi rỗng")
    H.eq(#OL.Core.parseList("workspace."), 0, "path cụt")

    local merged = OL.Core.merge(list, { { raw = "cây", kind = "name", key = "cay" }, { raw = "đá", kind = "path", key = "da", segs = { "da" } } })
    H.eq(#merged, 3, "merge giữ path cùng chữ với tên")
    H.eq(merged[1].kind, "name", "ưu tiên mục ghim")
end

Cases["CORE-003"] = function()
    H.resetWorld()
    local forest = H.folder("Rừng Cây")
    local big = H.model("Cây Lớn", forest)
    H.part("Thân", 10, 0, 0, big)

    local cache = setmetatable({}, { __mode = "k" })
    local target = OL.Core.resolvePath(workspace, OL.Core.pathSegments("game.Workspace/Rừng Cây/Cây Lớn"), cache)
    H.eq(target, big, "phân giải path không phân biệt hoa/thường + dấu")

    local target2 = OL.Core.resolvePath(workspace, OL.Core.pathSegments("workspace.rung cay.cay lon"), cache)
    H.eq(target2, big, "phân giải path đã bỏ dấu")

    local none = OL.Core.resolvePath(workspace, OL.Core.pathSegments("Workspace.Rừng Cây.Không Có"), cache)
    H.eq(none, nil, "path không tồn tại -> nil")

    H.eq(OL.Core.pathOf(big), "Workspace.Rừng Cây.Cây Lớn", "PathOf")
end

Cases["CORE-004"] = function()
    local keys = { "cay", "da" }
    H.eq(OL.Core.matchKey("cay bu 01", keys), "cay", "khớp chuỗi con")
    H.eq(OL.Core.matchKey("cayda", keys), "cay", "khớp khoá đầu tiên")
    H.eq(OL.Core.matchKey("nha go", keys), nil, "không khớp")
    H.eq(OL.Core.matchKey("100% cay", keys), "cay", "không dùng pattern Lua: 100%")
    H.eq(OL.Core.matchKey("", keys), nil, "rỗng")
end

-- ==================================================================== SCAN
Cases["SCAN-001"] = function()
    H.resetWorld()
    local forest = H.folder("Rừng")
    for i = 1, 1200 do
        H.part("Cây " .. tostring(i), (i % 80) * 4, 0, math.floor(i / 80) * 4, forest)
    end
    local controller = H.newController({ scanNodesPerFrame = 64, maxItems = 5 })
    controller:setQuery("cây")

    H.eq(controller.scanner.scanned, 0, "setQuery KHÔNG quét đồng bộ")
    H.eq(controller.scanCount, 0, "chưa có lượt quét nào")

    local frames = 0
    local previous = 0
    local maxDelta = 0
    repeat
        controller:step(1 / 60)
        frames = frames + 1
        local delta = controller.scanner.scanned - previous
        if delta > maxDelta then
            maxDelta = delta
        end
        previous = controller.scanner.scanned
    until (not controller.scanner.scanning and controller.scanCount > 0) or frames > 200

    if maxDelta > 64 then
        fail(string.format("[ngân sách] một khung quét %d node > trần 64", maxDelta))
    end
    H.ok(frames >= 18, "phải chia thành nhiều khung, nhận " .. tostring(frames))
    H.ok(controller.scanner.scanned >= 1200, "phải quét hết cây, nhận " .. tostring(controller.scanner.scanned))
    H.eq(controller.scanner.list and #controller.scanner.list, 5, "giữ đúng maxItems")
    H.ok(controller.scanner.capped, "phải báo capped")
end

Cases["SCAN-002"] = function()
    H.resetWorld()
    for i = 1, 10 do
        H.part("Đá " .. tostring(i), i * 5, 0, 0)
    end
    local controller = H.newController({ maxItems = 3, maxDistance = 0 })
    controller:setQuery("đá")
    H.scan(controller)

    H.eq(#controller.scanner.list, 3, "trần 3 vật")
    H.ok(controller.scanner.capped, "capped")
    local previous = -1
    for i = 1, #controller.scanner.list do
        local hit = controller.scanner.list[i]
        H.ok(hit.dist >= previous, "danh sách phải tăng dần theo khoảng cách")
        previous = hit.dist
    end
    H.ok(controller.scanner.hitsCount >= 10, "đếm đủ hit trước khi cắt")

    controller:setMaxDistance(20)
    H.eq(controller.state.maxDistance, 20, "đặt khoảng cách")
    H.scan(controller)
    H.eq(#controller.scanner.list, 3, "trong 20m còn 3 vật")
    for i = 1, #controller.scanner.list do
        H.ok(controller.scanner.list[i].dist <= 20.01, "mọi vật phải nằm trong 20m")
    end

    controller:setMaxDistance(10)
    H.scan(controller)
    H.eq(#controller.scanner.list, 1, "trong 10m chỉ còn 1 vật")
end

Cases["SCAN-003"] = function()
    H.resetWorld()
    local bigTree = H.model("Cây Bự")
    for i = 1, 5 do
        H.part("Cây Bự", 10 + i, 0, 0, bigTree)
    end
    H.part("Cây Nhỏ", 25, 0, 0)

    local house = H.model("Nhà Gỗ")
    H.part("Cây Con", 40, 0, 0, house)
    H.part("Cây Con", 42, 0, 0, house)

    local controller = H.newController({ maxItems = 20 })
    controller:setQuery("cây")
    H.scan(controller)

    H.eq(controller.scanner.hitsCount, 4, "1 model + 1 part + 2 part trong nhà")
    H.eq(controller.scanner.grouped, 5, "5 part của model bị gộp")
    H.eq(#controller.scanner.list, 4, "4 mục hiển thị")

    local models, parts = 0, 0
    for i = 1, #controller.scanner.list do
        local hit = controller.scanner.list[i]
        if hit.inst.ClassName == "Model" then
            models = models + 1
            H.eq(hit.inst, bigTree, "model khớp phải là Cây Bự")
        else
            parts = parts + 1
        end
    end
    H.eq(models, 1, "chỉ một model")
    H.eq(parts, 3, "ba part lẻ")
    H.eq(controller.visuals:count(), 4, "một hiển thị cho model, không phải 5 part")
end

Cases["SCAN-004"] = function()
    H.resetWorld()
    local controller = H.newController()
    controller:setQuery("workspace.Vật Tương Lai")
    H.scan(controller)

    H.eq(controller.scanner.hitsCount, 0, "chưa có vật")
    H.eq(controller.scanner.unresolvedPaths, 1, "path đang chờ")
    H.contains(controller:statusText(), "path chưa tìm thấy", "trạng thái nói rõ path đang chờ")

    local target = H.part("Vật Tương Lai", 8, 0, 0)
    controller:requestRescan(0)
    H.scan(controller)

    H.eq(controller.scanner.hitsCount, 1, "lần quét sau thấy vật vừa xuất hiện")
    H.eq(controller.scanner.unresolvedPaths, 0, "path đã phân giải")
    H.eq(controller.scanner.list[1].inst, target, "đúng vật")
    H.eq(controller.scanner.list[1].isPath, true, "đánh dấu path")
end

Cases["SCAN-005"] = function()
    H.resetWorld()
    local character = workspace:FindFirstChild("Character")
    local inside = H.part("Cây Trong Người", 3, 0, 0, character)

    local controller = H.newController()
    controller:setQuery("cây")
    H.scan(controller)
    H.eq(controller.scanner.hitsCount, 0, "mặc định bỏ qua nhân vật người chơi")

    controller:setOption("skipPlayers", false)
    controller:requestRescan(0)
    H.scan(controller)
    H.eq(controller.scanner.hitsCount, 1, "tắt bỏ qua thì thấy part trong nhân vật")
    H.eq(controller.scanner.list[1].inst, inside, "đúng part trong nhân vật")
end

Cases["SCAN-006"] = function()
    H.resetWorld()
    local broken = H.folder("Thư Mục Lỗi")
    broken.GetChildren = function()
        error("mô phỏng GetChildren hỏng")
    end
    local badPart = H.part("Cây Lỗi Toạ Độ", 5, 0, 0)
    badPart.Position = "không phải vector"
    H.part("Cây Tốt", 10, 0, 0)

    local controller = H.newController()
    controller:setQuery("cây")
    local ok = pcall(H.scan, controller)
    H.ok(ok, "quét không được ném lỗi ra ngoài")
    H.ok(controller.scanner.errors >= 1, "phải đếm lỗi GetChildren")
    H.eq(controller.scanner.hitsCount, 1, "vật tốt vẫn được tìm")
    H.ok(controller.scanner.unlocatable >= 1, "phải đếm vật không có toạ độ")
end

Cases["SCAN-007"] = function()
    H.resetWorld()
    for i = 1, 200 do
        H.part("Cây " .. tostring(i), i, 0, 0)
    end
    local controller = H.newController({ scanNodesPerFrame = 20 })
    controller:setQuery("cây")

    controller:step(1 / 60)
    for _ = 1, 6 do
        __RALO_ADVANCE(1.0)
        controller:step(1 / 60)
    end
    H.scan(controller)

    H.ok(controller.scanner.scanMs < 5, "scanMs chỉ đo thời gian chạy, không đo thời gian chờ: nhận " .. tostring(controller.scanner.scanMs))
    H.ok(controller.scanner.scanned >= 200, "đã quét đủ")
end

Cases["SCAN-008"] = function()
    H.resetWorld()
    local far = H.part("Cây Rất Xa", 1000, 0, 0)
    local camera = workspace.CurrentCamera
    workspace.CurrentCamera = nil

    -- Không có nhân vật lẫn camera: không xác định được gốc toạ độ.
    local env = OL.defaultEnv()
    env.localPlayer = nil
    env.camera = nil
    local controller = OL.newController({
        env = env,
        config = H.defaultConfig({ maxDistance = 50 }),
    })
    controller:setQuery("cây")
    H.scan(controller)
    H.stepFor(controller, 0.5)

    H.eq(controller:origin(), nil, "không có gốc")
    H.eq(controller.scanner.hitsCount, 1, "không được lọc mù khi chưa biết khoảng cách")
    H.eq(controller.scanner.list[1].unknownDist, true, "hit được đánh dấu chưa biết khoảng cách")

    local snapshot = controller:snapshot()
    H.eq(snapshot.list[1].unknownDist, true, "snapshot giữ cờ")
    H.contains(snapshot.status, "50m", "vẫn hiện giới hạn đã đặt")

    local label = H.labelOf(far)
    H.ok(label ~= nil, "vẫn có nhãn")
    H.contains(label.Text, "--m", "nhãn ghi --m thay vì bịa 0m")

    -- Có camera trở lại: khoảng cách thật phải xuất hiện và bộ lọc có hiệu lực.
    workspace.CurrentCamera = camera
    controller:setMaxDistance(50)
    controller:requestRescan(0)
    H.scan(controller)
    H.stepFor(controller, 0.5)
    H.eq(controller.scanner.hitsCount, 0, "biết gốc thì lọc đúng 50m")
    H.eq(controller.visuals:count(), 0, "không còn hiển thị vật ngoài 50m")
end

-- ===================================================================== VIS
Cases["VIS-001"] = function()
    H.resetWorld()
    local a = H.part("Cây A", 10, 0, 0)
    local b = H.part("Cây B", 20, 0, 0)
    local controller = H.newController({ maxItems = 10 })
    controller:setQuery("cây")
    H.scan(controller)
    H.stepFor(controller, 0.1)

    H.eq(controller.visuals:count(), 2, "2 hiển thị")
    H.eq(H.count("Highlight"), 2, "2 Highlight")
    H.eq(H.count("BillboardGui"), 2, "2 BillboardGui")
    H.ok(H.findVisual("Highlight", a) ~= nil, "Highlight gắn đúng part A")
    local label = H.labelOf(a)
    H.ok(label ~= nil, "có nhãn cho A")
    H.contains(label.Text, "Cây A", "nhãn có tên")
    H.contains(label.Text, "📏", "nhãn có khoảng cách")
    H.contains(label.Text, "🧭", "nhãn có toạ độ")

    controller:requestRescan(0)
    H.scan(controller)
    H.stepFor(controller, 0.1)
    H.eq(H.count("Highlight"), 2, "quét lại không nhân đôi Highlight")
    H.eq(H.count("BillboardGui"), 2, "quét lại không nhân đôi Billboard")
    H.eq(controller.visuals:count(), 2, "vẫn 2 item")
    H.eq(#controller.visuals.order, 2, "order kín")
    H.eq(controller.visuals.index, 2, "slot index không phình")

    controller:setOption("showXYZ", false)
    H.stepFor(controller, 0.3)
    label = H.labelOf(a)
    H.notContains(label.Text, "🧭", "tắt toạ độ thì nhãn không còn 🧭")
    H.contains(label.Text, "Cây A", "vẫn còn tên")

    controller:setOption("showLabel", false)
    local billboard = a:FindFirstChild("OL_Label")
    H.eq(billboard.Enabled, false, "tắt nhãn")
    controller:setOption("showLabel", true)
    H.eq(billboard.Enabled, true, "bật nhãn")

    local highlight = H.findVisual("Highlight", a)
    controller:setOption("throughWall", false)
    H.eq(highlight.DepthMode, Enum.HighlightDepthMode.Occluded, "xuyên tường TẮT -> Occluded")
    controller:setOption("throughWall", true)
    H.eq(highlight.DepthMode, Enum.HighlightDepthMode.AlwaysOnTop, "xuyên tường BẬT -> AlwaysOnTop")
end

Cases["VIS-002"] = function()
    H.resetWorld()
    local a = H.part("Cây A", 10, 0, 0)
    local controller = H.newController()
    controller:setQuery("cây")
    H.scan(controller)
    H.eq(H.count("BoxHandleAdornment"), 0, "mặc định không có hộp")

    controller:setOption("showBox", true)
    H.eq(H.count("BoxHandleAdornment"), 1, "bật hộp tạo 1 Box")
    local box = H.findVisual("BoxHandleAdornment", a)
    H.ok(box ~= nil, "Box gắn đúng part")
    H.eq(box.Visible, true, "Box đang hiện")

    controller:setOption("showBox", false)
    H.eq(H.count("BoxHandleAdornment"), 1, "tắt hộp không nhân đôi")
    H.eq(box.Visible, false, "Box bị ẩn")
    controller:setOption("showBox", true)
    H.eq(H.count("BoxHandleAdornment"), 1, "bật lại dùng lại Box cũ")

    local highlight = H.findVisual("Highlight", a)
    local greenBefore = highlight.FillColor.G
    local name = controller:cycleColor()
    H.eq(name, "Xanh ngọc", "màu kế tiếp")
    H.ok(highlight.FillColor.G ~= greenBefore, "Highlight đổi màu ngay")
    H.eq(controller.state.colorIndex, 2, "chỉ số màu")
end

Cases["VIS-003"] = function()
    H.resetWorld()
    for i = 1, 3 do
        H.part("Cây " .. tostring(i), i * 5, 0, 0)
    end
    local controller = H.newController({ maxItems = 5 })
    controller:setQuery("cây")
    H.scan(controller)
    H.eq(controller.visuals:count(), 3, "3 hiển thị")
    H.eq(controller.visuals.index, 3, "slot index = 3")

    controller:clearAll()
    H.eq(controller.visuals:count(), 0, "clear xoá hiển thị")
    H.eq(#controller.visuals.order, 0, "clear xoá order")
    H.eq(controller.visuals.index, 0, "clear đặt lại slot index")
    H.eq(H.count("Highlight"), 0, "clear xoá hết Highlight")
    H.eq(H.count("BillboardGui"), 0, "clear xoá hết BillboardGui")

    H.part("Đá 1", 5, 0, 0)
    H.part("Đá 2", 9, 0, 0)
    controller:setQuery("đá")
    H.scan(controller)
    H.eq(controller.visuals.index, 2, "slot index KHÔNG cộng dồn sau clear (lỗi bản cũ)")
    H.eq(#controller.visuals.order, 2, "order = 2")

    local target = workspace:FindFirstChild("Đá 1")
    target:Destroy()
    H.stepFor(controller, 0.1)
    H.eq(controller.visuals:count(), 1, "vật bị xoá thì hiển thị bị dọn")
    H.ok(controller.visuals.index <= #controller.visuals.order, "index không vượt order sau khi xoá")
end

Cases["VIS-004"] = function()
    H.resetWorld()
    H.part("Cây A", 10, 0, 0)
    H.part("Cây B", 20, 0, 0)
    H.part("Cây C", 30, 0, 0)
    H.part("Cây D", 40, 0, 0)

    local originalNew = Instance.new
    Instance.new = function(className)
        if className == "Highlight" or className == "BillboardGui" then
            error("executor chặn " .. className)
        end
        return originalNew(className)
    end

    local controller = H.newController()
    controller:setQuery("cây")
    local ok = pcall(H.scan, controller)
    H.ok(ok, "không được ném lỗi khi Highlight/Billboard bị chặn")
    H.ok(controller.visuals:count() > 0, "phải fallback sang SelectionBox")
    H.eq(H.count("SelectionBox"), controller.visuals:count(), "SelectionBox cho từng vật")
    H.eq(controller.visuals.error, nil, "fallback thành công thì không báo lỗi")

    Instance.new = function(className)
        if className == "Highlight" or className == "BillboardGui" or className == "SelectionBox" then
            error("executor chặn " .. className)
        end
        return originalNew(className)
    end

    local controller2 = H.newController()
    controller2:setQuery("cây")
    ok = pcall(H.scan, controller2)
    H.ok(ok, "chặn cả 3 lớp vẫn không crash")
    H.eq(controller2.visuals:count(), 0, "không tạo được hiển thị")
    H.ok(controller2.visuals.error ~= nil, "phải báo visualError")
    H.ok(controller2.visuals.disabled, "sau 3 lần thất bại phải tự tắt tạo hiển thị")
    H.contains(controller2:statusText(), "chặn", "trạng thái nói rõ bị chặn")

    Instance.new = originalNew
end

-- ==================================================================== CTRL
Cases["CTRL-001"] = function()
    H.resetWorld()
    local controller = H.newController()
    local ok, err = controller:setActive(true)
    H.eq(ok, false, "bật khi chưa có mục thì từ chối")
    H.contains(err, "chưa nhập", "thông báo rõ")
    H.eq(controller.active, false, "vẫn tắt")

    H.eq(controller:setQuery("  , ; "), false, "query rỗng")
    H.eq(controller.active, false, "không tự bật khi rỗng")

    H.part("Cây A", 10, 0, 0)
    H.eq(controller:setQuery("cây"), true, "có mục thì bật")
    H.eq(controller.active, true, "active true")
    H.eq(controller.scanner.scanned, 0, "chưa quét đồng bộ")
    H.scan(controller)
    H.eq(#controller.scanner.list, 1, "thấy 1 vật")

    H.eq(controller:setActive(false), true, "tắt được")
    H.eq(controller.active, false, "active false")
    H.eq(controller.visuals:count(), 0, "tắt thì dọn hiển thị")
    H.eq(#controller.scanner.list, 0, "tắt thì dọn danh sách")

    H.eq(controller:toggle(), true, "toggle bật lại")
    H.eq(controller.active, true, "active true sau toggle")
    controller:clearAll()
    H.eq(controller.active, false, "clearAll tắt")
    H.eq(#controller.entries, 0, "clearAll xoá mục")
    H.eq(controller:statusText():find("TẮT", 1, true) ~= nil, true, "trạng thái TẮT")
end

Cases["CTRL-002"] = function()
    H.resetWorld()
    local controller = H.newController()
    H.eq(controller:setMaxDistance(-50), 0, "khoảng cách âm -> 0")
    H.eq(controller:setMaxDistance(0 / 0), 0, "NaN -> giữ 0")
    H.eq(controller:setMaxDistance(123.4), 123.4, "số lẻ giữ nguyên")
    H.eq(controller:setMaxDistance(1e9), 100000, "chặn trần 100000")
    H.eq(controller:setMaxItems(0), 1, "maxItems nhỏ nhất 1")
    H.eq(controller:setMaxItems(9999), 500, "maxItems lớn nhất 500")

    controller.state.colorIndex = 8
    controller:cycleColor()
    H.eq(controller.state.colorIndex, 1, "màu quay vòng 8 -> 1")
    controller.state.colorIndex = 1
    controller:cycleColor()
    H.eq(controller.state.colorIndex, 2, "màu 1 -> 2")
end

Cases["CTRL-003"] = function()
    H.resetWorld()
    H.part("Cây A", 10, 0, 0)
    H.part("Đá A", 15, 0, 0)

    local store = H.fakeStore(nil)
    local controller = OL.newController({
        config = H.defaultConfig(),
        store = store,
    })
    controller:setQuery("cây")
    H.scan(controller)
    controller:setMaxDistance(25)
    controller:cycleColor()
    controller:cycleColor()
    controller:setOption("showBox", true)
    controller:setOption("showXYZ", false)
    H.eq(controller.state.colorIndex, 3, "màu 3")

    local ok, index = controller:savePreset("Rừng")
    H.eq(ok, true, "lưu preset")
    H.eq(index, 1, "preset #1")
    local saved = store.peek()
    H.ok(saved ~= nil and saved.presets ~= nil, "đã ghi xuống store")
    H.eq(saved.presets[1].maxDistance, 25, "lưu maxDistance")
    H.eq(saved.presets[1].colorIndex, 3, "lưu colorIndex")
    H.eq(saved.presets[1].options.showBox, true, "lưu showBox")
    H.eq(saved.presets[1].options.showXYZ, false, "lưu showXYZ")

    controller:setQuery("đá")
    controller:setMaxDistance(0)
    controller.state.colorIndex = 1
    controller:setOption("showBox", false)
    controller:setOption("showXYZ", true)
    H.scan(controller)

    local loaded = controller:loadPreset(1)
    H.eq(loaded, true, "nạp preset")
    H.eq(controller.queryRaw, "cây", "khôi phục query")
    H.eq(controller.state.maxDistance, 25, "khôi phục khoảng cách (lỗi bản cũ)")
    H.eq(controller.state.colorIndex, 3, "khôi phục màu")
    H.eq(controller.state.showBox, true, "khôi phục showBox")
    H.eq(controller.state.showXYZ, false, "khôi phục showXYZ")
    H.eq(controller.active, true, "nạp preset thì bật")
    H.eq(#controller.presets, 1, "không nhân đôi preset")
    H.scan(controller)
    H.eq(#controller.scanner.list, 1, "quét lại thấy cây")

    local restored = OL.newController({
        config = H.defaultConfig({ autoRestore = true, autoStart = false }),
        store = store,
        autoRestore = true,
    })
    H.eq(#restored.presets, 1, "tự nạp preset khi khởi tạo")
    H.eq(restored.state.maxDistance, 25, "auto restore maxDistance")
    H.eq(restored.state.colorIndex, 3, "auto restore màu")
    H.eq(restored.queryRaw, "cây", "auto restore query")
    H.eq(restored.active, false, "auto restore KHÔNG tự bật mặc định")

    local auto = OL.newController({
        config = H.defaultConfig({ autoRestore = true, autoStart = true }),
        store = store,
        autoRestore = true,
    })
    H.eq(auto.active, true, "autoStart + preset active -> bật")
    H.eq(auto.scanner.scanned, 0, "autoStart vẫn không quét đồng bộ")

    local corrupt = OL.newController({
        config = H.defaultConfig({ autoRestore = true }),
        store = { load = function() return { presets = "hỏng" } end, save = function() return true end },
        autoRestore = true,
    })
    H.eq(#corrupt.presets, 0, "dữ liệu hỏng -> 0 preset, không crash")

    H.eq(controller:deletePreset(1), true, "xoá preset")
    H.eq(#controller.presets, 0, "đã xoá")
end

Cases["CTRL-004"] = function()
    H.resetWorld()
    H.part("Cây A", 10, 0, 0)
    local controller = H.newController()
    controller:setQuery("cây")
    H.scan(controller)
    H.stepFor(controller, 0.05)

    local before = controller:snapshot().list[1].dist
    local stored = controller.scanner.list[1].dist
    H.near(before, math.sqrt(10 * 10 + 5 * 5), 0.2, "khoảng cách ban đầu")

    H.root().Position = Vector3.new(100, 5, 10)
    controller:step(0.02)
    local after = controller:snapshot().list[1].dist
    H.near(after, math.sqrt(90 * 90 + 5 * 5 + 10 * 10), 0.3, "snapshot tính lại khi di chuyển")
    H.near(controller.scanner.list[1].dist, stored, 0.001, "hit lưu vẫn là khoảng cách lúc quét")
    H.ok(math.abs(after - before) > 50, "danh sách không bị đóng băng khoảng cách (lỗi bản cũ)")
end

Cases["CTRL-005"] = function()
    H.resetWorld()
    local target = H.part("Cây A", 10, 0, 0)
    local controller = H.newController()
    controller:setQuery("cây")
    H.scan(controller)

    local humanoid = H.humanoid()
    H.ok(humanoid ~= nil, "có humanoid")
    local ok = controller:walkTo(target)
    H.eq(ok, true, "đi tới được")
    H.ok(humanoid.MoveToPosition ~= nil, "đã gọi Humanoid:MoveTo")
    H.near(humanoid.MoveToPosition.X, 10, 0.01, "toạ độ X")

    local empty = H.folder("Rỗng")
    local okEmpty = controller:walkTo(empty)
    H.eq(okEmpty, false, "folder rỗng không đi được")

    local player = game:GetService("Players").LocalPlayer
    local character = player.Character
    player.Character = nil
    local okNoChar = controller:walkTo(target)
    H.eq(okNoChar, false, "không có nhân vật thì từ chối")
    player.Character = character
end

-- ====================================================================== UI
Cases["UI-001"] = function()
    H.resetWorld()
    H.part("Cây A", 10, 0, 0)
    H.part("Cây B", 18, 0, 0)
    local controller = H.newController({ listRows = 5 })
    local ui = OL.newUI(controller)
    H.ok(ui ~= nil, "tạo được UI")
    H.ok(ui.root ~= nil, "có ScreenGui")
    H.eq(ui.root.Name, "ObjectLocatorUI", "tên ScreenGui")
    H.ok(ui.queryBox ~= nil, "có ô tìm kiếm")
    H.ok(ui.list ~= nil, "có danh sách")

    controller:setQuery("cây")
    H.scan(controller)
    ui:refresh()
    H.eq(#ui.rows, 2, "2 dòng kết quả")
    H.contains(ui.rows[1].Text, "Cây A", "dòng đầu có tên")
    H.contains(ui.rows[1].Text, "📏", "dòng có khoảng cách")

    local humanoid = H.humanoid()
    ui.rows[1].Activated:Fire()
    H.ok(humanoid.MoveToPosition ~= nil, "bấm dòng -> MoveTo")
    H.contains(ui.statusLabel.Text, "đang đi tới", "trạng thái báo đang đi")

    ui.boxButton.Activated:Fire()
    H.eq(controller.state.showBox, true, "nút Hộp bật showBox")
    H.eq(H.count("BoxHandleAdornment"), 2, "có 2 hộp")

    ui.presetButton.Activated:Fire()
    H.eq(ui.presetPanel.Visible, true, "mở khu preset")

    local oldText = ui.rows[1].Text
    H.root().Position = Vector3.new(100, 5, 10)
    ui:refresh()
    H.ok(ui.rows[1].Text ~= oldText, "dòng kết quả cập nhật khoảng cách mới (lỗi bản cũ)")

    local close = ui.header:FindFirstChild("Close")
    H.ok(close ~= nil, "có nút đóng")
    close.Activated:Fire()
    H.eq(ui.panel.Visible, false, "đóng bảng")
    H.eq(ui.floating.Visible, true, "hiện nút nổi")
    ui.floating.Activated:Fire()
    H.eq(ui.panel.Visible, true, "mở lại bảng")

    local ok = pcall(function()
        ui:destroy()
    end)
    H.ok(ok, "huỷ UI không lỗi")
    H.eq(ui.root, nil, "root đã bỏ")
end

Cases["UI-002"] = function()
    H.resetWorld()
    H.part("Cây A", 10, 0, 0)
    local app = OL.start({ config = H.defaultConfig({ autoRestore = false }) })
    H.ok(app.controller ~= nil, "start tạo controller")
    H.ok(app.ui ~= nil, "start tạo UI")
    H.eq(_G.ObjectLocator, app, "export _G.ObjectLocator")

    local same = OL.start({})
    H.eq(same, app, "start lần 2 trả instance cũ")

    app.controller:setQuery("cây")
    H.scan(app.controller)
    app.controller:notify()
    H.eq(#app.ui.rows, 1, "UI nhận dữ liệu")

    local input = game:GetService("UserInputService")
    input.InputBegan:Fire({ KeyCode = Enum.KeyCode.RightShift }, false)
    H.eq(app.controller.active, false, "phím tắt tắt định vị")
    input.InputBegan:Fire({ KeyCode = Enum.KeyCode.RightShift }, false)
    H.eq(app.controller.active, true, "phím tắt bật lại")

    OL.stop()
    H.eq(_G.ObjectLocator, nil, "stop xoá export")
end

-- ==================================================================== STORE
Cases["STORE-001"] = function()
    local box = {}
    local writes = {}
    local folders = {}
    local io = {
        read = function()
            return box.text
        end,
        write = function(path, text)
            box.path = path
            box.text = text
            writes[#writes + 1] = path
        end,
        isfolder = function()
            return false
        end,
        makefolder = function(name)
            folders[#folders + 1] = name
        end,
        folder = "ObjectLocatorTest",
    }
    local codec = {
        encode = function(value)
            box.value = value
            return "encoded"
        end,
        decode = function()
            return box.value
        end,
    }
    local store = OL.Store.new({
        path = "ObjectLocatorTest/presets.json",
        io = io,
        codec = codec,
        folder = "ObjectLocatorTest",
    })
    local data = {
        version = 1,
        lastUsed = 0,
        presets = {
            {
                title = "Rừng",
                query = "cây",
                entries = { { raw = "cây", kind = "name" } },
                maxDistance = 250,
                colorIndex = 3,
            },
        },
    }
    local ok, err = store:save(data)
    H.eq(ok, true, "save được: " .. tostring(err))
    H.eq(writes[1], "ObjectLocatorTest/presets.json", "đúng đường dẫn")
    H.eq(folders[1], "ObjectLocatorTest", "tạo thư mục khi thiếu")

    local loaded = store:load()
    H.eq(type(loaded), "table", "đọc lại được")
    local validated = OL.Store.validatePresets(loaded)
    H.eq(#validated, 1, "một preset hợp lệ")
    H.eq(validated[1].title, "Rừng", "giữ tiêu đề")
    H.eq(validated[1].maxDistance, 250, "giữ maxDistance")
    H.eq(validated[1].colorIndex, 3, "giữ màu")
    H.eq(validated[1].entries[1].key, "cay", "chuẩn hoá entry")
end

Cases["STORE-002"] = function()
    local out = OL.Store.validatePresets({
        presets = {
            {
                title = "ok",
                entries = {
                    { raw = "cây" },
                    { raw = "CÂY" },
                    { raw = "workspace.Rừng" },
                    { raw = "" },
                },
                maxDistance = 1e9,
                colorIndex = 99,
            },
            { title = "hỏng", entries = "không phải bảng" },
            "rác",
        },
    })
    H.eq(#out, 1, "bỏ preset hỏng")
    H.eq(out[1].maxDistance, OL.Config.maxDistanceLimit, "kẹp maxDistance")
    H.eq(out[1].colorIndex, 8, "kẹp màu về 8")
    H.eq(#out[1].entries, 2, "dedupe tên trùng + bỏ entry rỗng")
    H.eq(out[1].entries[1].kind, "name", "entry tên")
    H.eq(out[1].entries[2].kind, "path", "entry path")
end

-- ====================================================================== RUN
function Cases.run(id)
    local fn = Cases[id]
    if type(fn) ~= "function" then
        fail("không có ca kiểm thử " .. tostring(id))
    end
    local ok, err = pcall(fn)
    if not ok then
        error(tostring(err), 0)
    end
    return true
end

return Cases
