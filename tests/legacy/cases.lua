--!nocheck
-- Tái hiện lỗi của S.ObjTrack trong script.js (chạy trên mã trích nguyên văn).
local OT = LEGACY
local Cases = {}

local function fail(message)
    error(message, 0)
end
local function eq(actual, expected, label)
    if actual ~= expected then
        fail(string.format("[%s] mong đợi %s, nhận %s", label, tostring(expected), tostring(actual)))
    end
end
local function ok(value, label)
    if not value then fail("[" .. label .. "] mong đợi truthy, nhận " .. tostring(value)) end
end
local function contains(text, needle, label)
    if type(text) ~= "string" or not text:find(needle, 1, true) then
        fail(string.format("[%s] không chứa %q: %s", label, tostring(needle), tostring(text)))
    end
end

local function resetState()
    OT.on = false
    OT.query = ""
    OT.keys = {}
    OT.pathKeys = {}
    OT.entries = {}
    OT.savedList = {}
    OT.items = {}
    OT.list = {}
    OT.maxDist = 0
    OT.maxItems = 60
    OT.color = 1
    OT._order = {}
    OT._tickIdx = 0
    OT._pending = {}
    OT._queue = {}
    OT._qN = 0
    OT._pathSet = {}
    OT._pathN = 0
    OT._chars = {}
    OT._gui = nil
    OT._slotN = 0
    OT._orderN = 0
    OT._passing = false
    OT._hits = {}
    OT._found = 0
    OT._scanMs = 0
    OT._capped = false
    OT._scanAcc = 0
    OT._acc = 0
    OT._sel = nil
    OT._selPart = nil
    OT._rowSig = nil
    OT._tagSig = nil
    OT._lastScan = 0
    OT._fastUntil = 0
    OT._renderErr = false
    function OT.Bind() end
    function OT.Unbind() end
    -- KHÔNG ghi đè OT.Rescan: ca LEGACY-SYNC-RESCAN cần bản thật trong script.js.
    function OT.RefreshList() end
    function OT.RefreshTags() end
    function OT.RefreshInfo() end
end

-- 1. ADDENTRY: path chưa phân giải bị "hạ cấp" thành khoá tên rác.
Cases["LEGACY-PATH-DEMOTE"] = function()
    resetState()
    local okAdd, kind = OT.AddEntry("workspace.Không Tồn Tại")
    eq(okAdd, true, "AddEntry nhận mục")
    eq(kind, "name", "path không phân giải bị đổi thành name")
    eq(#OT.entries, 1, "có 1 mục")
    eq(OT.entries[1].kind, "name", "mục bị ghi kind=name")
    eq(#OT.pathKeys, 0, "không còn pathKeys")
    eq(#OT.keys, 1, "sinh ra một khoá tên rác")
    eq(OT.keys[1], "workspace.khong ton tai", "khoá rác chứa cả dấu chấm")
    eq(OT.Matches("Không Tồn Tại"), false, "khoá rác không bao giờ khớp tên thật")
end

-- 2. CLEAR: không đặt lại bộ đếm slot; _orderN phình mãi.
Cases["LEGACY-SLOT-LEAK"] = function()
    resetState()
    OT._slotN = 42
    OT._orderN = 42
    OT.Clear()
    eq(OT._slotN, 42, "Clear để nguyên _slotN")
    eq(OT._orderN, 42, "Clear để nguyên _orderN")
    eq(#OT._order, 0, "order rỗng nhưng trần slot vẫn 42")
    -- Tick lặp trên 42 ô rỗng (thực tế có thể lên hàng chục nghìn sau nhiều lần bật/tắt).
end

-- 3. SCANFINISH: _scanMs đo cả thời gian CHỜ giữa các khung.
Cases["LEGACY-SCANMS-ELAPSED"] = function()
    resetState()
    OT._passing = true
    OT._passT0 = os.clock() - 3
    OT.ScanFinish()
    ok(OT._scanMs >= 2900, "scanMs báo thời gian chờ là " .. tostring(OT._scanMs))
    contains(tostring(OT._scanMs), "3000", "đúng 3000ms dù CPU chỉ chạy vài ms")
end

-- 4. RESCAN: quét toàn bộ workspace đồng bộ trong MỘT khung.
Cases["LEGACY-SYNC-RESCAN"] = function()
    resetState()
    OT.on = true
    OT.keys = { "cay" }
    OT.rescanEvery = 0
    OT._lastScan = 0
    local seen = nil
    function OT.ScanBegin() OT._passing = true end
    function OT.ScanSlice(budget, msCap, runToEnd)
        seen = { budget = budget, msCap = msCap, runToEnd = runToEnd }
        OT._passing = false
    end
    function OT.ScanFinish() end
    function OT.DrainPending() end
    OT.Rescan(true)
    ok(seen ~= nil, "Rescan có gọi ScanSlice")
    ok(seen.budget >= 1e9, "ngân sách node khổng lồ: " .. tostring(seen.budget))
    ok(seen.msCap >= 1e9, "ngân sách ms khổng lồ: " .. tostring(seen.msCap))
    eq(seen.runToEnd, true, "quét tới hết trong một lần gọi")
end

-- 5. USESAVED: preset lưu maxDist/color nhưng không được áp dụng.
Cases["LEGACY-USESAVED-META"] = function()
    resetState()
    OT.savedList = {
        {
            id = 1,
            title = "Rừng",
            query = "cây",
            entries = { { raw = "cây", kind = "name" } },
            maxDist = 99,
            color = 4,
        },
    }
    local okUse = OT.UseSaved(1, false)
    eq(okUse, true, "UseSaved chạy")
    eq(#OT.entries, 1, "nạp lại entry")
    eq(OT.maxDist, 0, "maxDist của preset bị bỏ qua")
    eq(OT.color, 1, "color của preset bị bỏ qua")
end

-- 6. REFRESHLIST: chữ ký dòng không chứa khoảng cách -> số "m" đóng băng.
Cases["LEGACY-STALE-LIST"] = function()
    resetState()
    OT.list = {
        { inst = { Name = "Cây", ClassName = "Part" }, part = nil, dist = 10 },
    }
    local before = OT._TestRowSig()
    OT.list[1].dist = 99
    local after = OT._TestRowSig()
    eq(before, after, "chữ ký không đổi dù dist đổi 10 -> 99")
    contains(before, "Cây", "chữ ký chỉ có tên")
    ok(not after:find("99", 1, true), "chữ ký không hề chứa 99")
end

-- 7. SAVE: lưu cùng một truy vấn nhiều lần sinh preset trùng hệt.
Cases["LEGACY-SAVE-DUP"] = function()
    resetState()
    OT.maxDist = 120
    OT.color = 3
    local ok1, first = OT.Save("cây", false)
    local ok2, second = OT.Save("cây", false)
    eq(ok1, true, "lưu lần 1")
    eq(ok2, true, "lưu lần 2")
    eq(#OT.savedList, 2, "hai preset cho cùng một truy vấn")
    eq(first.title, second.title, "tiêu đề giống hệt")
    eq(first.query, second.query, "query giống hệt")
end

-- 8. SCANHIT: không có vị trí gốc => mọi vật nhận dist = 0, lọc "Xa nhất" vô hiệu.
Cases["LEGACY-NO-ORIGIN"] = function()
    resetState()
    OT.maxDist = 50
    OT._myPos = nil
    OT._hits = {}
    local far = Instance.new("Part")
    far.Name = "Cây Rất Xa"
    far.Position = Vector3.new(1000, 0, 0)
    far.Parent = workspace
    OT.ScanHit(far)
    eq(#OT._hits, 1, "vật ở 1000 stud vẫn lọt bộ lọc 50 stud")
    eq(OT._hits[1].dist, 0, "khoảng cách bị báo là 0")
    far:Destroy()
end

function Cases.run(id)
    local fn = Cases[id]
    if type(fn) ~= "function" then
        fail("không có ca " .. tostring(id))
    end
    local success, err = pcall(fn)
    if not success then
        error(tostring(err), 0)
    end
    return true
end

return Cases
