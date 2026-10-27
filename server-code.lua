--[[
================================================================================
  MÃ SERVER NGƯỜI CHƠI — bản tách riêng (dùng được cho Blox Fruits)
--------------------------------------------------------------------------------
  File này CHỈ làm một việc: tìm / copy / vào đúng server (JobId) của một người
  chơi bất kỳ, kể cả người lạ (Roblox ẩn presence với người lạ).

  CÁCH DÙNG
    Dán cả file vào executor (Delta / Codex / Xeno / Synapse…) rồi chạy.
    Bấm nút 📡 (hoặc RightShift) để mở/đóng cửa sổ.

  LÀM ĐƯỢC
    • 🔎 Tra cứu  : tên, UserId, trạng thái, hồ sơ người chơi
    • 📋 Mã SV    : quét server công khai → copy mã (dạng "JobId" hoặc "PlaceId:JobId")
    • 🚀 Vào SV   : quét (nếu cần) rồi teleport thẳng vào đúng server đó
    • 🚀 Vào mã  : dán mã server đã copy ở đâu đó để vào
    • Tự biết 3 hải Blox Fruits (2753915549 / 4442272183 / 7449423635) + Evade
    • Tự canh slot khi server đầy, tự đổi PlaceId khi gặp 773/771

  GIỚI HẠN — ĐỌC KỸ
    • Chỉ tìm được server CÔNG KHAI. Người chơi ở server VIP/riêng tư thì
      Roblox không trả về mã → không thể vào.
    • Roblox ẩn presence với người lạ, nên phải quét danh sách server công khai
      và so ảnh đại diện. Quét càng sâu càng chắc nhưng càng lâu (mặc định 150
      trang/place, đổi được trong cửa sổ).
    • Không gửi dữ liệu đi đâu ngoài các API công khai của Roblox.

  ROLLBACK / BẢN KHÁC
    Bản đầy đủ (hub nhiều tính năng): script.js
    Bản chỉ có trang phục           : outfit-local.lua
================================================================================
]]

-- ============================================================================
-- 0. DỊCH VỤ
-- ============================================================================
local Players = game:GetService("Players")
local TeleportService = game:GetService("TeleportService")
local GuiService = game:GetService("GuiService")
local UserInputService = game:GetService("UserInputService")
local HttpService = game:GetService("HttpService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local targetGui = playerGui
pcall(function()
    if type(gethui) == "function" then
        local hui = gethui()
        if hui then targetGui = hui end
    end
end)

local oldGui = targetGui:FindFirstChild("ServerCodeGui")
if oldGui then pcall(function() oldGui:Destroy() end) end

local S = {}

-- ============================================================================
-- 1. CẤU HÌNH
-- ============================================================================
S.ScanPages = 150
S.CustomPlaces = {}

-- UniverseId -> danh sách place của cùng một game nhiều place.
S.KnownPlaces = {
    [994732206] = { 2753915549, 4442272183, 7449423635 },  -- Blox Fruits: Sea 1 / Sea 2 / Sea 3
    [3652625463] = { 9872472334, 10324346056, 10324347967, 10662542523, 10808838353, 11353528705 }, -- Evade
}

S._jobPlaceCache = {}
S._jobMetaCache = {}
S._scanToken = 0

-- ============================================================================
-- 2. HTTP + JSON
-- ============================================================================
function S.Encode(t)
    local ok, s = pcall(function() return HttpService:JSONEncode(t) end)
    return ok and s or nil
end

function S.Http(method, url, body)
    local fn
    if type(syn) == "table" and type(syn.request) == "function" then fn = syn.request
    elseif type(http) == "table" and type(http.request) == "function" then fn = http.request
    elseif type(fluxus) == "table" and type(fluxus.request) == "function" then fn = fluxus.request
    elseif type(kg) == "table" and type(kg.request) == "function" then fn = kg.request
    elseif type(request) == "function" then fn = request
    elseif type(http_request) == "function" then fn = http_request
    end

    if fn then
        local ok, res = pcall(fn, { Url = url, Method = method, Headers = { ["Content-Type"] = "application/json" }, Body = body })
        if ok and type(res) == "table" then
            local code = tonumber(res.StatusCode) or 200
            local okD, data = pcall(function() return HttpService:JSONDecode(res.Body or "") end)
            if okD then return data, nil end
            if code >= 400 then return nil, "HTTP " .. tostring(code) end
            return nil, "không đọc được JSON"
        end
        return nil, "request lỗi"
    end

    local okR, data = pcall(function()
        if method == "POST" then
            local r = game:HttpPost(url, tostring(body or "{}"), "application/json")
            return HttpService:JSONDecode(r)
        end
        return HttpService:JSONDecode(game:HttpGet(url))
    end)
    if okR then return data, nil end
    return nil, "http lỗi"
end

-- chuỗi số nguyên cho URL (tránh "123.0" khi số là float)
local function placeStr(p)
    p = tonumber(p)
    if not p then return "0" end
    local ok, sFmt = pcall(string.format, "%.0f", p)
    return (ok and sFmt) or tostring(p)
end

-- ============================================================================
-- 3. NGƯỜI CHƠI / HỒ SƠ / PRESENCE
-- ============================================================================
function S.ResolveUser(q)
    q = tostring(q or ""):gsub("^%s+", ""):gsub("%s+$", ""):gsub("^@", "")
    if q == "" then return nil, "chưa nhập tên hoặc UserId" end
    local num = q:match("^(%d+)$")
    if num then
        num = tonumber(num)
        if num and num > 0 then return num, nil end
    end
    if #q < 3 or #q > 20 or not q:match("^[%w_]+$") then
        return nil, "tên không hợp lệ (3–20 ký tự: chữ, số, _)"
    end
    local data = S.Http("POST", "https://users.roblox.com/v1/usernames/users", S.Encode({ usernames = { q }, excludeBannedUsers = false }))
    local first = type(data) == "table" and type(data.data) == "table" and data.data[1] or nil
    if type(first) == "table" and tonumber(first.id) then return tonumber(first.id), nil end
    local okN, userId = pcall(function() return Players:GetUserIdFromNameAsync(q) end)
    if okN and tonumber(userId) then return tonumber(userId), nil end
    return nil, "không tìm thấy người chơi " .. q
end

function S.FetchProfile(id)
    local data = S.Http("GET", "https://users.roblox.com/v1/users/" .. tostring(id))
    if type(data) == "table" and tonumber(data.id) then return data end
    local okN, nm = pcall(function() return Players:GetNameFromUserIdAsync(id) end)
    if okN and type(nm) == "string" and nm ~= "" then
        return { id = tonumber(id), name = nm, displayName = nm, description = "", created = "" }
    end
    return nil
end

function S.GetFriendPresence(id)
    id = tonumber(id)
    if not id then return nil end
    local okF, list = pcall(function() return player:GetFriendsOnline(200) end)
    if okF and type(list) == "table" then
        for _, f in ipairs(list) do
            if type(f) == "table" and tonumber(f.VisitorId) == id then
                local hasGame = (tonumber(f.PlaceId) ~= nil) or (type(f.GameId) == "string" and f.GameId ~= "") or (tonumber(f.LocationType) == 4)
                return {
                    userPresenceType = hasGame and 2 or (f.IsOnline and 1 or 0),
                    placeId = tonumber(f.PlaceId), rootPlaceId = tonumber(f.PlaceId),
                    gameId = (type(f.GameId) == "string" and f.GameId ~= "") and f.GameId or nil,
                    lastLocation = tostring(f.LastLocation or ""),
                }
            end
        end
    end
    return nil
end

function S.InThisServer(id, p)
    id = tonumber(id)
    if not id then return false end
    local okP, inst = pcall(function() return Players:GetPlayerByUserId(id) end)
    if okP and inst then return true end
    local okL, list = pcall(function() return Players:GetPlayers() end)
    if okL and type(list) == "table" then
        for _, plr in ipairs(list) do
            if tonumber(plr.UserId) == id then return true end
        end
    end
    if type(p) == "table" and type(p.gameId) == "string" and p.gameId ~= "" and tostring(game.JobId or "") ~= "" and p.gameId == tostring(game.JobId) then
        return true
    end
    return false
end

function S.FetchPresence(id)
    local fPres = S.GetFriendPresence(id)
    local data = S.Http("POST", "https://presence.roblox.com/v1/presence/users", S.Encode({ userIds = { id } }))
    local p = type(data) == "table" and type(data.userPresences) == "table" and data.userPresences[1] or nil
    if type(p) ~= "table" then p = fPres end
    if type(p) == "table" and type(fPres) == "table" then
        if (not p.gameId or p.gameId == "") and fPres.gameId then p.gameId = fPres.gameId end
        if not p.placeId and fPres.placeId then p.placeId = fPres.placeId p.rootPlaceId = p.rootPlaceId or fPres.rootPlaceId end
        if (tonumber(p.userPresenceType) or 0) == 0 and (tonumber(fPres.userPresenceType) or 0) > 0 then p.userPresenceType = fPres.userPresenceType end
        p.lastLocation = (p.lastLocation and p.lastLocation ~= "") and p.lastLocation or fPres.lastLocation
    end
    if S.InThisServer(id, p) then
        p = type(p) == "table" and p or {}
        p.userPresenceType = 2
        if tostring(game.JobId or "") ~= "" then p.gameId = tostring(game.JobId) end
        if tonumber(game.PlaceId) then p.placeId = tonumber(game.PlaceId) end
    end
    return p
end

function S.PresenceText(p)
    if type(p) ~= "table" then return "❔ không rõ" end
    local t = tonumber(p.userPresenceType) or 0
    local text = (t == 2 and "🎮 đang trong game") or (t == 1 and "🌐 online (sảnh/web)") or (t == 3 and "🛠 Roblox Studio") or "⚫ offline"
    if t == 2 and type(p.lastLocation) == "string" and p.lastLocation ~= "" then text = text .. " · " .. p.lastLocation end
    return text
end

-- ============================================================================
-- 4. UNIVERSE / PLACE
-- ============================================================================
function S.PlacesOf(univId, placeId)
    local set = S.KnownPlaces[tonumber(univId) or 0]
    if type(set) ~= "table" then
        local cand = tonumber(placeId)
        if not cand and (not univId or tonumber(univId) == 0) then cand = tonumber(game.PlaceId) end
        for _, s2 in pairs(S.KnownPlaces) do
            for _, p2 in ipairs(s2) do if tonumber(p2) == cand then set = s2 break end end
            if type(set) == "table" then break end
        end
    end
    local out = {}
    if type(set) == "table" then
        for _, p3 in ipairs(set) do out[#out + 1] = tonumber(p3) end
    end
    return out
end

function S.SameGame(univA, univB, placeId)
    if not univA or not univB then return false end
    if tonumber(univA) == tonumber(univB) then return true end
    local setA, setB = S.PlacesOf(univA, placeId), S.PlacesOf(univB, placeId)
    if #setA == 0 or #setB == 0 then return false end
    for _, a in ipairs(setA) do
        for _, b in ipairs(setB) do if tonumber(a) == tonumber(b) then return true end end
    end
    return false
end

function S.GetUniversePlaces(univId, primaryPlaceId)
    local out, seen = {}, {}
    local function addP(p)
        p = tonumber(p)
        if p and p > 0 and not seen[p] then seen[p] = true out[#out + 1] = p end
    end

    addP(primaryPlaceId) addP(game.PlaceId)

    pcall(function()
        local as = game:GetService("AssetService")
        if as and type(as.GetGamePlacesAsync) == "function" then
            local pages = as:GetGamePlacesAsync()
            for _ = 1, 5 do
                if not pages then break end
                local list = pages:GetCurrentPage()
                if type(list) == "table" then
                    for _, info in ipairs(list) do
                        if type(info) == "table" then addP(info.PlaceId or info.id) end
                    end
                end
                if pages.IsFinished then break end
                if not pcall(function() pages:AdvanceToNextPageAsync() end) then break end
            end
        end
    end)

    univId = tonumber(univId) or tonumber(game.GameId)
    if (not univId or univId <= 0) and out[1] then
        local uRes = S.Http("GET", "https://apis.roblox.com/universes/v1/places/" .. placeStr(out[1]) .. "/universe")
        if type(uRes) == "table" and tonumber(uRes.universeId) then univId = tonumber(uRes.universeId) end
    end

    if univId and univId > 0 then
        local gData = S.Http("GET", "https://games.roblox.com/v1/games?universeIds=" .. placeStr(univId))
        local gEntry = type(gData) == "table" and type(gData.data) == "table" and gData.data[1] or nil
        if type(gEntry) == "table" and tonumber(gEntry.rootPlaceId) then addP(gEntry.rootPlaceId) end
        local uData = S.Http("GET", "https://develop.roblox.com/v1/universes/" .. placeStr(univId) .. "/places?limit=50")
        local uPlaces = type(uData) == "table" and type(uData.data) == "table" and uData.data or nil
        if type(uPlaces) == "table" then
            for _, pl in ipairs(uPlaces) do if type(pl) == "table" then addP(pl.id or pl.PlaceId) end end
        end
    end

    if type(S.CustomPlaces) == "table" then
        for _, cp in ipairs(S.CustomPlaces) do addP(cp) end
    end
    for _, kp in ipairs(S.PlacesOf(univId, primaryPlaceId)) do addP(kp) end

    while #out > 12 do table.remove(out) end
    return out
end

-- ============================================================================
-- 5. CỔNG KIỂM TRA: người chơi có đang chơi game này không?
-- ============================================================================
function S.CheckPlayerIsPlaying(id, pres)
    id = tonumber(id)
    if not id or id <= 0 then return false, "UserId không hợp lệ" end
    if S.InThisServer(id, pres) then return true, nil end

    local fPres = S.GetFriendPresence(id)
    if type(fPres) == "table" and (tonumber(fPres.userPresenceType) == 2 or (type(fPres.gameId) == "string" and fPres.gameId ~= "")) then
        return true, nil
    end

    if type(pres) ~= "table" then pres = S.FetchPresence(id) end
    if type(pres) == "table" then
        local pType = tonumber(pres.userPresenceType) or 0
        local hasGameId = type(pres.gameId) == "string" and pres.gameId ~= ""
        if pType ~= 2 and not hasGameId then
            local isFriend = false
            pcall(function() isFriend = (player:IsFriendsWith(id) == true) end)
            if not isFriend and type(fPres) ~= "table" then
                return true, nil, true  -- Roblox ẩn presence với người lạ → vẫn quét
            end
            local stTxt = (pType == 1 and "đang online ngoài game") or (pType == 3 and "đang trong Studio") or "đang offline"
            return false, "Người chơi hiện " .. stTxt .. " — không tìm được server"
        end
        local myUniv, pUniv = tonumber(game.GameId), tonumber(pres.universeId)
        if myUniv and myUniv > 0 and pUniv and pUniv > 0 and pUniv ~= myUniv
            and not S.SameGame(myUniv, pUniv, tonumber(pres.placeId) or tonumber(pres.rootPlaceId)) then
            return false, "Người chơi đang chơi game khác — không tìm được server"
        end
        local myPlace = tonumber(game.PlaceId)
        local pPlace = tonumber(pres.placeId) or tonumber(pres.rootPlaceId)
        if pPlace and pPlace > 0 and myPlace and myPlace > 0 and pPlace ~= myPlace then
            local inMyUniv = false
            for _, ap in ipairs(S.GetUniversePlaces(myUniv, myPlace)) do
                if tonumber(ap) == pPlace then inMyUniv = true break end
            end
            if not inMyUniv then
                return false, "Người chơi đang ở game khác (PlaceId " .. tostring(pPlace) .. ") — không tìm được server"
            end
        end
        return true, nil
    end
    return true, nil, true
end

-- ============================================================================
-- 6. ẢNH ĐẠI DIỆN → KEY SO KHỚP
-- ============================================================================
local function normalizeThumbKey(u)
    if type(u) ~= "string" or u == "" then return nil end
    local hex32 = u:match("(%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x)")
    if hex32 and hex32 ~= "" then return hex32:lower() end
    local seg1 = u:match("rbxcdn%.com/([^/%?]+)")
    if seg1 and seg1 ~= "" then
        local hash = seg1:match("AvatarHeadshot%-([%w_%-]+)")
        if hash and hash ~= "" then
            hash = hash:gsub("%-[Pp][Nn][Gg]$", ""):gsub("%-[Ww][Ee][Bb][Pp]$", ""):gsub("%-[Jj][Pp][Ee]?[Gg]$", "")
            return hash:lower()
        end
        seg1 = seg1:gsub("%-[Pp][Nn][Gg]$", ""):gsub("%-[Ww][Ee][Bb][Pp]$", ""):gsub("%-[Jj][Pp][Ee]?[Gg]$", "")
        return seg1:lower()
    end
    return u:lower()
end

function S.FetchTargetHeadshotKeys(id)
    local keys, count, firstUrl = {}, 0, nil
    local function addUrl(u)
        if type(u) ~= "string" or u == "" then return end
        if not firstUrl then firstUrl = u end
        local k = normalizeThumbKey(u)
        if k and k ~= "" and not keys[k] then keys[k] = true count = count + 1 end
        local seg = u:match("rbxcdn%.com/([^/%?]+)")
        if seg and seg ~= "" then keys[seg:lower()] = true end
        local full = u:match("rbxcdn%.com/([^%?]+)")
        if full and full ~= "" then keys[full:lower()] = true end
    end

    local data = S.Http("GET", "https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=" .. tostring(id) .. "&size=150x150&format=Png&isCircular=false")
    local e = type(data) == "table" and type(data.data) == "table" and data.data[1] or nil
    if type(e) == "table" and type(e.imageUrl) == "string" and e.imageUrl ~= "" then addUrl(e.imageUrl) end

    local bData = S.Http("POST", "https://thumbnails.roblox.com/v1/batch", S.Encode({
        { requestId = "t_png:" .. tostring(id), targetId = tonumber(id), type = "AvatarHeadShot", size = "150x150", format = "Png", isCircular = false },
        { requestId = "t_webp:" .. tostring(id), targetId = tonumber(id), type = "AvatarHeadShot", size = "150x150", format = "Webp", isCircular = false },
    }))
    if type(bData) == "table" and type(bData.data) == "table" then
        for _, be in ipairs(bData.data) do
            if type(be) == "table" and type(be.imageUrl) == "string" and be.imageUrl ~= "" then addUrl(be.imageUrl) end
        end
    end
    return keys, firstUrl, count
end

-- ============================================================================
-- 7. QUÉT SERVER CÔNG KHAI
-- ============================================================================
-- Roblox có đợt trả data rỗng khi limit=100 (báo lỗi 9/2025) → tự hạ 100→50→25→10
-- và nhớ mức đang chạy được. excludeFullGames=false là BẮT BUỘC với Blox Fruits
-- (server 12/12 luôn đầy, lọc full là mất sạch danh sách).
S._serverLimit = 0

function S.FetchServersPage(placeId, cursor, order)
    order = tostring(order or "Desc")
    local qCur = (type(cursor) == "string" and cursor ~= "") and ("&cursor=" .. tostring(cursor)) or ""
    local want = tonumber(S._serverLimit) or 0
    local limits = { 100, 50, 25, 10 }
    if want > 0 and want ~= 100 then
        local tmp = { want }
        for _, l in ipairs(limits) do if l ~= want then tmp[#tmp + 1] = l end end
        limits = tmp
    end
    for _, lim in ipairs(limits) do
        local url = "https://games.roblox.com/v1/games/" .. placeStr(placeId) .. "/servers/Public?sortOrder=" .. order
            .. "&limit=" .. tostring(lim) .. "&excludeFullGames=false" .. qCur
        local gotEmpty = false
        for attempt = 1, 3 do
            local data, err = S.Http("GET", url)
            if type(data) == "table" and type(data.data) == "table" then
                if #data.data > 0 then
                    if S._serverLimit ~= lim then S._serverLimit = lim end
                    return data.data, data.nextPageCursor
                end
                if qCur ~= "" then return data.data, data.nextPageCursor end
                gotEmpty = true
                break
            end
            if tostring(err or ""):find("429") then
                task.wait(0.45 * attempt)
            else
                break
            end
        end
        if not gotEmpty then return nil, nil end
    end
    return {}, nil
end

-- Trả về: jobId, placeId, nguồn, meta, tên người chơi cùng server, thông báo lỗi, thống kê
function S.FindPlayerServer(id, targetPlaceId, onProgress, maxPages, cachedPres)
    id = tonumber(id)
    if not id or id <= 0 then return nil, nil, nil, nil, nil, "UserId không hợp lệ" end

    if S.InThisServer(id, nil) and tostring(game.JobId or "") ~= "" then
        local pId = tonumber(game.PlaceId)
        S._jobPlaceCache[tostring(game.JobId)] = pId
        return tostring(game.JobId), pId, "same_server", nil, nil, nil
    end

    local fPres = S.GetFriendPresence(id)
    if type(fPres) == "table" and type(fPres.gameId) == "string" and fPres.gameId ~= "" then
        local pId = tonumber(fPres.placeId) or tonumber(targetPlaceId) or tonumber(game.PlaceId)
        S._jobPlaceCache[tostring(fPres.gameId)] = pId
        return tostring(fPres.gameId), pId, "friend_online", nil, nil, nil
    end

    local okTp, curInst, _, tpPlaceId, tpJobId = pcall(function() return TeleportService:GetPlayerPlaceInstanceAsync(id) end)
    if okTp and curInst == true and tostring(game.JobId or "") ~= "" then
        return tostring(game.JobId), tonumber(game.PlaceId), "teleport_service", nil, nil, nil
    elseif okTp and type(tpJobId) == "string" and tpJobId ~= "" then
        local pId = tonumber(tpPlaceId) or tonumber(targetPlaceId) or tonumber(game.PlaceId)
        S._jobPlaceCache[tostring(tpJobId)] = pId
        return tostring(tpJobId), pId, "teleport_service", nil, nil, nil
    end

    local pres = type(cachedPres) == "table" and cachedPres or S.FetchPresence(id)
    S.lastScanStats = nil
    local isPlaying, notPlayMsg, presUnknown = S.CheckPlayerIsPlaying(id, pres)
    local unknownPresence = (presUnknown == true)
    if not isPlaying and not unknownPresence then
        return nil, nil, nil, nil, nil, notPlayMsg
    end

    if type(pres) == "table" and type(pres.gameId) == "string" and pres.gameId ~= "" then
        local pId = tonumber(pres.placeId) or tonumber(pres.rootPlaceId) or tonumber(targetPlaceId) or tonumber(game.PlaceId)
        S._jobPlaceCache[tostring(pres.gameId)] = pId
        return tostring(pres.gameId), pId, "presence", nil, nil, nil
    end

    local scanPlaceId = tonumber(targetPlaceId)
        or (type(pres) == "table" and (tonumber(pres.placeId) or tonumber(pres.rootPlaceId)))
        or tonumber(game.PlaceId)
    if not scanPlaceId or scanPlaceId <= 0 then return nil, nil, nil, nil, nil, "không xác định được place" end

    local targetKeys = S.FetchTargetHeadshotKeys(id)
    local function matchesThumb(imgUrl, keyTable)
        local kt = keyTable or targetKeys
        if type(imgUrl) ~= "string" or imgUrl == "" then return nil end
        local k = normalizeThumbKey(imgUrl)
        if k and kt[k] then return kt[k] end
        local seg = imgUrl:match("rbxcdn%.com/([^/%?]+)")
        if seg then
            if kt[seg:lower()] then return kt[seg:lower()] end
            local ah = seg:match("AvatarHeadshot%-([%w_%-]+)")
            if ah then
                ah = ah:gsub("%-[Pp][Nn][Gg]$", ""):gsub("%-[Ww][Ee][Bb][Pp]$", ""):gsub("%-[Jj][Pp][Ee]?[Gg]$", ""):lower()
                if kt[ah] then return kt[ah] end
            end
        end
        local fp = imgUrl:match("rbxcdn%.com/([^%?]+)")
        if fp and kt[fp:lower()] then return kt[fp:lower()] end
        return nil
    end

    -- Chống rate-limit: lấy key ảnh đại diện của mục tiêu, thử lại 3 lần.
    do
        local kc = 0
        if type(targetKeys) == "table" then for _k in pairs(targetKeys) do kc = kc + 1 end end
        local tkTry = 0
        while kc <= 0 and tkTry < 3 do
            tkTry = tkTry + 1 task.wait(0.7 * tkTry)
            local k2, _u2, c2 = S.FetchTargetHeadshotKeys(id)
            if type(k2) == "table" then targetKeys = k2 end
            kc = tonumber(c2) or 0
        end
        S.lastThumbBlocked = (kc <= 0)
        if S.lastThumbBlocked then
            return nil, scanPlaceId, nil, nil, nil, "Roblox đang chặn ảnh đại diện (rate-limit) — thử lại sau 1–2 phút"
        end
    end

    local placeStates = {}
    local scannedTokenThumbs = {}
    local scannedTokenIds = {}
    local tokSeq = 0

    local function recordScannedThumb(imgUrl, rSid, pId, meta)
        if type(imgUrl) ~= "string" or imgUrl == "" or not rSid then return end
        local entry = { sid = rSid, pId = pId, meta = meta }
        local k = normalizeThumbKey(imgUrl)
        if k and k ~= "" and not scannedTokenThumbs[k] then scannedTokenThumbs[k] = entry end
        local seg = imgUrl:match("rbxcdn%.com/([^/%?]+)")
        if seg and seg ~= "" then scannedTokenThumbs[seg:lower()] = scannedTokenThumbs[seg:lower()] or entry end
    end

    local function getPlaceState(pId)
        if not placeStates[pId] then
            placeStates[pId] = { curDesc = "", curAsc = "", doneDesc = false, doneAsc = false, seenSid = {}, pages = 0 }
        end
        return placeStates[pId]
    end

    -- quét `stepPages` trang cho 1 place. coKeyMap/coIdMap: bạn chơi cùng (có thể nil).
    local function scanPlaceSteps(pId, stepPages, coKeyMap, coIdMap)
        local st = getPlaceState(pId)
        local steps = 0
        while steps < stepPages and (not st.doneDesc or not st.doneAsc) do
            for _, mode in ipairs({ "Desc", "Asc" }) do
                if steps >= stepPages then break end
                if (mode == "Desc" and not st.doneDesc) or (mode == "Asc" and not st.doneAsc) then
                    local cur = (mode == "Desc") and st.curDesc or st.curAsc
                    local list, nextCur = S.FetchServersPage(pId, cur, mode)
                    if type(list) ~= "table" or #list == 0 then
                        if mode == "Desc" then st.doneDesc = true else st.doneAsc = true end
                    else
                        steps = steps + 1 st.pages = st.pages + 1
                        if type(onProgress) == "function" then pcall(onProgress, st.pages, #list, mode, pId) end
                        local batch, reqMap, metaMap = {}, {}, {}
                        local pageSeen, pageOcc = 0, 0
                        for _, sv in ipairs(list) do
                            local sid = type(sv) == "table" and sv.id and tostring(sv.id) or nil
                            if sid and sid ~= "" and not st.seenSid[sid] then
                                st.seenSid[sid] = true
                                pageSeen = pageSeen + 1
                                if (type(sv.playerIds) == "table" and #sv.playerIds > 0)
                                    or (type(sv.players) == "table" and #sv.players > 0)
                                    or (type(sv.playerTokens) == "table" and #sv.playerTokens > 0) then
                                    pageOcc = pageOcc + 1
                                end
                                local svMeta = { placeId = pId, playing = tonumber(sv.playing) or 0, maxPlayers = tonumber(sv.maxPlayers) or 0 }
                                metaMap[sid] = svMeta
                                S._jobPlaceCache[sid] = pId
                                S._jobMetaCache[sid] = svMeta

                                if type(sv.playerIds) == "table" then
                                    for _, pid in ipairs(sv.playerIds) do
                                        local npid = tonumber(pid)
                                        if npid then
                                            scannedTokenIds[npid] = { sid = sid, pId = pId, meta = svMeta }
                                            if npid == id then return sid, pId, "playerIds", svMeta, nil end
                                            if coIdMap and coIdMap[npid] then
                                                return sid, pId, "co_player:@" .. tostring(coIdMap[npid].name), svMeta, tostring(coIdMap[npid].name)
                                            end
                                        end
                                    end
                                end

                                if type(sv.players) == "table" then
                                    for _, pl in ipairs(sv.players) do
                                        local npl = tonumber(pl) or (type(pl) == "table" and (tonumber(pl.id) or tonumber(pl.userId))) or nil
                                        if npl and npl > 0 then
                                            scannedTokenIds[npl] = { sid = sid, pId = pId, meta = svMeta }
                                            if npl == id then return sid, pId, "players", svMeta, nil end
                                            if coIdMap and coIdMap[npl] then
                                                return sid, pId, "co_player:@" .. tostring(coIdMap[npl].name), svMeta, tostring(coIdMap[npl].name)
                                            end
                                        end
                                    end
                                end

                                if type(sv.playerTokens) == "table" then
                                    for _, tok in ipairs(sv.playerTokens) do
                                        if type(tok) == "string" and tok ~= "" then
                                            if tok == tostring(id) or tok == ("token_" .. tostring(id)) then
                                                return sid, pId, "token_direct", svMeta, nil
                                            end
                                            tokSeq = tokSeq + 1
                                            local reqId = tostring(sid) .. ":" .. tostring(tokSeq)
                                            reqMap[reqId] = sid
                                            batch[#batch + 1] = {
                                                requestId = reqId, targetId = 0, token = tok,
                                                type = "AvatarHeadShot", size = "150x150", format = "Png", isCircular = false,
                                            }
                                        end
                                    end
                                end
                            end
                        end

                        -- Roblox chỉ trả JobId mà KHÔNG trả players/playerTokens
                        -- (Blox Fruits luôn vậy, và API còn ẩn với request chưa đăng nhập)
                        -- → không thể so ảnh đại diện. Dừng place này ngay, đừng quét
                        -- hàng trăm trang vô ích.
                        if pageSeen > 0 and pageOcc == 0 then
                            st.blind = (tonumber(st.blind) or 0) + 1
                            st.doneDesc, st.doneAsc = true, true
                            return nil, pId, nil, nil, nil
                        end

                        if #batch > 0 then
                            local chunks = {}
                            for startIdx = 1, #batch, 100 do
                                local chunk = {}
                                for k = startIdx, math.min(#batch, startIdx + 99) do chunk[#chunk + 1] = batch[k] end
                                chunks[#chunks + 1] = chunk
                            end
                            local foundSid, foundSrc, foundCoName = nil, nil, nil
                            for wStart = 1, #chunks, 3 do
                                if foundSid then break end
                                local pending = 0
                                for cIdx = wStart, math.min(#chunks, wStart + 2) do
                                    local chunk = chunks[cIdx]
                                    pending = pending + 1
                                    task.spawn(function()
                                        local bRes = nil
                                        for bTry = 1, 3 do
                                            bRes = S.Http("POST", "https://thumbnails.roblox.com/v1/batch", S.Encode(chunk))
                                            if type(bRes) == "table" and type(bRes.data) == "table" then break end
                                            if bTry < 3 then task.wait(0.7 * bTry + (cIdx % 3) * 0.1) end
                                        end
                                        local items = type(bRes) == "table" and type(bRes.data) == "table" and bRes.data or nil
                                        if type(items) == "table" then
                                            for idx, it in ipairs(items) do
                                                if type(it) == "table" then
                                                    local rawReq = (type(it.requestId) == "string" and it.requestId ~= "" and it.requestId) or (chunk[idx] and chunk[idx].requestId) or nil
                                                    local rSid = (rawReq and reqMap[rawReq]) or (type(rawReq) == "string" and rawReq:match("^([^:]+)")) or nil
                                                    if rSid and rSid ~= "" then
                                                        recordScannedThumb(it.imageUrl, rSid, pId, metaMap[rSid])
                                                        local tid = tonumber(it.targetId)
                                                        if tid and tid > 0 then scannedTokenIds[tid] = { sid = rSid, pId = pId, meta = metaMap[rSid] } end
                                                        if not foundSid then
                                                            if tid == id then foundSid, foundSrc = rSid, "batch_targetId" break end
                                                            if matchesThumb(it.imageUrl, targetKeys) then foundSid, foundSrc = rSid, "batch_thumb" break end
                                                            if coIdMap and tid and coIdMap[tid] then
                                                                foundSid, foundSrc, foundCoName = rSid, "co_player:@" .. tostring(coIdMap[tid].name), tostring(coIdMap[tid].name) break
                                                            end
                                                            if coKeyMap then
                                                                local coHit = matchesThumb(it.imageUrl, coKeyMap)
                                                                if type(coHit) == "table" then
                                                                    foundSid, foundSrc, foundCoName = rSid, "co_player:@" .. tostring(coHit.name), tostring(coHit.name) break
                                                                end
                                                            end
                                                        end
                                                    end
                                                end
                                            end
                                        end
                                        pending = pending - 1
                                    end)
                                end
                                local waitTicks = 0
                                while pending > 0 and not foundSid and waitTicks < 240 do
                                    waitTicks = waitTicks + 1 task.wait(0.025)
                                end
                                if foundSid then
                                    return foundSid, pId, foundSrc or "batch_thumb", metaMap[foundSid], foundCoName
                                end
                            end
                        end

                        if type(nextCur) == "string" and nextCur ~= "" then
                            if mode == "Desc" then st.curDesc = nextCur else st.curAsc = nextCur end
                        else
                            if mode == "Desc" then st.doneDesc = true else st.doneAsc = true end
                        end
                    end
                end
            end
        end
        return nil, pId, nil, nil, nil
    end

    local univId = (type(pres) == "table" and tonumber(pres.universeId)) or tonumber(game.GameId)
    local allPlaces = S.GetUniversePlaces(univId, scanPlaceId)
    local placeSet = {}
    for _, ap in ipairs(allPlaces) do placeSet[ap] = true end

    local totalPages = tonumber(maxPages) or tonumber(S.ScanPages) or 150
    local placeList, placeSeen = {}, {}
    for _, ap in ipairs(allPlaces) do
        local np = tonumber(ap)
        if np and np > 0 and not placeSeen[np] then placeSeen[np] = true placeList[#placeList + 1] = np end
    end
    if #placeList == 0 then placeList = { scanPlaceId } end
    local perPlace = math.max(8, math.floor(totalPages / math.max(1, #placeList)))

    for _round = 1, 3 do
        local anyLeft = false
        for _, pId2 in ipairs(placeList) do
            local st2 = getPlaceState(pId2)
            if not (st2.doneDesc and st2.doneAsc) then
                anyLeft = true
                local rSid, rPl, rSrc, rMeta, rCo = scanPlaceSteps(pId2, perPlace)
                if rSid and rSid ~= "" then return rSid, rPl, rSrc, rMeta, rCo end
            end
        end
        if not anyLeft then break end
    end

    do
        local statServers, statPages, blindCount = 0, 0, 0
        for _, pId3 in ipairs(placeList) do
            local st3 = placeStates[pId3]
            if st3 then
                statPages = statPages + (tonumber(st3.pages) or 0)
                for _sid in pairs(st3.seenSid or {}) do statServers = statServers + 1 end
                if st3.blind then blindCount = blindCount + 1 end
            end
        end
        S.lastScanStats = {
            servers = statServers, pages = statPages, places = #placeList,
            unknownPresence = (unknownPresence == true),
            blind = (blindCount > 0), allBlind = (#placeList > 0 and blindCount >= #placeList),
        }
        if #placeList > 0 and blindCount >= #placeList then
            return nil, scanPlaceId, nil, nil, nil,
                "Roblox ẩn danh sách người chơi trong server (chỉ trả JobId, không trả playerTokens) nên không dò được ai ở server nào bằng ảnh đại diện. Blox Fruits luôn ở tình trạng này. Cách dùng được: người đó là bạn bè (presence), hoặc dán mã PlaceId:JobId đã có."
        end
    end

    return nil, scanPlaceId, nil, nil, nil, nil
end

-- ============================================================================
-- 8. MÃ SERVER: định dạng / đọc lại / vào server
-- ============================================================================
function S.FormatCode(jobId, placeId, meta, coName)
    jobId = tostring(jobId or "")
    if jobId == "" then return "", "" end
    placeId = tonumber(placeId) or S._jobPlaceCache[jobId] or tonumber(game.PlaceId)
    if placeId and placeId > 0 then S._jobPlaceCache[jobId] = placeId end
    meta = type(meta) == "table" and meta or S._jobMetaCache[jobId]
    if type(meta) == "table" then S._jobMetaCache[jobId] = meta end
    -- Blox Fruits có 3 hải (3 place) trong CÙNG một universe: mã chỉ ghi JobId sẽ
    -- bị hiểu là "hải đang đứng" khi dán ở phiên khác → sai place, vào không được.
    -- Vì vậy game nhiều place thì LUÔN ghi kèm PlaceId:JobId.
    local myPlace = tonumber(game.PlaceId)
    local ps = S.PlacesOf(tonumber(game.GameId) or 0, placeId or myPlace)
    local multiPlace = (type(ps) == "table" and #ps > 1)
    local needPlace = (placeId and placeId > 0) and (multiPlace or not myPlace or placeId ~= myPlace)
    local codeForInput = needPlace and (placeStr(placeId) .. ":" .. jobId) or jobId
    local capTxt = ""
    if type(meta) == "table" and tonumber(meta.playing) and tonumber(meta.maxPlayers) and meta.maxPlayers > 0 then
        capTxt = string.format(" · %d/%d%s", meta.playing, meta.maxPlayers, meta.playing >= meta.maxPlayers and " ĐẦY" or "")
    end
    local coTxt = (type(coName) == "string" and coName ~= "") and (" · chơi cùng @" .. coName) or ""
    local dispTxt = jobId .. (placeId and (" (Place: " .. placeStr(placeId) .. capTxt .. coTxt .. ")") or (capTxt .. coTxt))
    return codeForInput, dispTxt
end

function S.ParseCode(raw)
    local s = tostring(raw or ""):gsub("^%s+", ""):gsub("%s+$", ""):gsub('^"', ""):gsub('"$', ""):gsub("^'", ""):gsub("'$", "")
    s = s:gsub("^Mã Server %(JobId%)%s*:%s*", ""):gsub("^Mã SV%s*:%s*", ""):gsub("^🌐 Mã server%s*:%s*", "")
    if s == "" then return nil, nil end
    -- Link Roblox hay được chia sẻ cho Blox Fruits:
    --   roblox.com/games/start?placeId=4442272183&gameInstanceId=<JobId>
    --   roblox.com/games/2753915549/Blox-Fruits?gameId=<JobId>
    local isPrivate = s:find("privateServerLinkCode", 1, true) ~= nil
    local urlPlace = s:match("[%?&]placeId=(%d+)") or s:match("roblox%.com/games/(%d+)")
    local urlJob = s:match("[%?&]gameInstanceId=([%w%-]+)") or s:match("[%?&]gameId=([%w%-]+)") or s:match("[%?&]jobId=([%w%-]+)")
    if urlJob and urlJob:find("-", 1, true) then
        local np = tonumber(urlPlace)
        if np and np > 0 then S._jobPlaceCache[urlJob] = np end
        return urlJob, np, (isPrivate and "private" or nil)
    end
    local pId, jId = s:match("^(%d+)%s*[:/|,]%s*([%w%-]+)$")
    if pId and jId and jId:find("-", 1, true) then
        local np = tonumber(pId)
        if np then S._jobPlaceCache[jId] = np end
        return jId, np
    end
    local placeHint = s:match("PlaceId%s*[:=]%s*(%d+)") or s:match("Place%s*[:=]%s*(%d+)") or s:match("roblox%.com/games/(%d+)")
    local uuid = s:match("(%x%x%x%x%x%x%x%x%-%x%x%x%x%-%x%x%x%x%-%x%x%x%x%-%x%x%x%x%x%x%x%x%x%x%x%x)")
    if uuid then
        local np = tonumber(placeHint) or S._jobPlaceCache[uuid]
        if np then S._jobPlaceCache[uuid] = np end
        return uuid, np
    end
    local token = s:match("^([%w]+%-[%w%-]+)")
    if token and #token >= 8 then
        local np = tonumber(placeHint) or S._jobPlaceCache[token]
        return token, np, (isPrivate and "private" or nil)
    end
    return nil, tonumber(placeHint), (isPrivate and "private" or nil)
end

function S.Clipboard(text)
    local ok = pcall(function() setclipboard(tostring(text)) end)
    if ok then return true end
    ok = pcall(function() local c = getclipboard() if c and c.setclipboard then c.setclipboard(tostring(text)) end end)
    if ok then return true end
    ok = pcall(function() local c = toclipboard if type(c) == "function" then c(tostring(text)) end end)
    return ok
end

S._joinToken = 0

function S.RawTeleport(placeId, jobId)
    local ok, err = pcall(function()
        if jobId and jobId ~= "" then
            TeleportService:TeleportToPlaceInstance(placeId, jobId, player)
        else
            TeleportService:Teleport(placeId, player)
        end
    end)
    return ok, err
end

-- Vào server; nếu đầy/bận thì tự canh slot, nếu 773/771 thì thử place khác.
function S.Join(placeId, jobId, onStatus)
    local function say(msg) if type(onStatus) == "function" then pcall(onStatus, msg) end end
    local jId = tostring(jobId or ""):gsub("^%s+", ""):gsub("%s+$", "")
    local pId = tonumber(placeId) or (jId ~= "" and S._jobPlaceCache[jId]) or tonumber(game.PlaceId) or 0
    if jId ~= "" and pId > 0 then S._jobPlaceCache[jId] = pId end
    if jId ~= "" and jId == tostring(game.JobId or "") and pId == tonumber(game.PlaceId) then
        return true, "✅ Bạn đang ở đúng server này rồi!"
    end

    local okT, errT = S.RawTeleport(pId, jId)
    if not okT then
        local eLow = tostring(errT or ""):lower()
        if jId ~= "" and (eLow:find("restricted") or eLow:find("unauthorized") or eLow:find("notfound") or eLow:find("not found")) then
            for _, altP in ipairs(S.GetUniversePlaces(nil, pId)) do
                if altP ~= pId then
                    local okAlt, errAlt = S.RawTeleport(altP, jId)
                    if okAlt then
                        pId = altP S._jobPlaceCache[jId] = altP okT, errT = true, nil
                        break
                    else
                        errT = errAlt
                    end
                end
            end
        end
        if not okT then
            return false, "⚠️ Không vào được server: " .. tostring(errT)
        end
    end

    local meta = S._jobMetaCache[jId]
    local full = type(meta) == "table" and tonumber(meta.maxPlayers) and meta.maxPlayers > 0 and (tonumber(meta.playing) or 0) >= meta.maxPlayers
    if full or jId ~= "" then
        S._joinToken = (S._joinToken or 0) + 1
        local tok = S._joinToken
        task.spawn(function()
            for attempt = 1, 25 do
                task.wait(1.8)
                if S._joinToken ~= tok then return end
                if jId == "" then return end
                if tostring(game.JobId or "") == jId then return end
                say(string.format("⏳ Server đang đầy/bận — tự canh slot trống (#%d/25)...", attempt))
                S.RawTeleport(pId, jId)
            end
            if S._joinToken == tok then
                S._joinToken = nil
                say("⏳ Canh 25 lần vẫn chưa vào được (server đầy hoặc người chơi đã rời) — lấy lại mã mới rồi thử lại.")
            end
        end)
    end
    local guessTxt = ""
    if tonumber(placeId) == nil and jId ~= "" then
        guessTxt = " · ⚠️ mã không kèm PlaceId nên dùng Place hiện tại — sai hải thì dán lại dạng PlaceId:JobId"
    end
    return true, string.format("🚀 Đang vào server %s (Place: %s)%s", tostring(jId ~= "" and jId or "—"), tostring(pId), guessTxt)
end

-- ============================================================================
-- 9. GUI
-- ============================================================================
local C = {
    BG = Color3.fromRGB(18, 19, 24),
    PANEL = Color3.fromRGB(28, 30, 38),
    FIELD = Color3.fromRGB(38, 41, 52),
    ACCENT = Color3.fromRGB(120, 170, 255),
    GREEN = Color3.fromRGB(80, 200, 130),
    YELLOW = Color3.fromRGB(240, 200, 90),
    RED = Color3.fromRGB(240, 110, 110),
    TEXT = Color3.fromRGB(235, 238, 245),
    DIM = Color3.fromRGB(150, 156, 172),
}

local New = function(class, props, parent)
    local obj = Instance.new(class)
    for k, v in pairs(props or {}) do obj[k] = v end
    if parent then obj.Parent = parent end
    return obj
end

local gui = New("ScreenGui", {
    Name = "ServerCodeGui", ResetOnSpawn = false, IgnoreGuiInset = true, ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
}, targetGui)
gui.DisplayOrder = 999

local floatBtn = New("TextButton", {
    Name = "ServerFloat", Size = UDim2.new(0, 40, 0, 40), Position = UDim2.new(1, -56, 0, 160),
    BackgroundColor3 = C.ACCENT, Text = "📡", TextSize = 20, Font = Enum.Font.GothamBold,
    TextColor3 = C.BG, BorderSizePixel = 0, AutoButtonColor = true,
}, gui)
New("UICorner", { CornerRadius = UDim.new(0, 12) }, floatBtn)

local win = New("Frame", {
    Name = "ServerWindow", Size = UDim2.new(0, 342, 0, 322), Position = UDim2.new(0.5, -171, 0.5, -161),
    BackgroundColor3 = C.BG, BorderSizePixel = 0, Visible = false, Active = true,
}, gui)
New("UICorner", { CornerRadius = UDim.new(0, 12) }, win)
New("UIStroke", { Color = C.ACCENT, Transparency = 0.55, Thickness = 1 }, win)

local header = New("Frame", {
    Name = "Header", Size = UDim2.new(1, 0, 0, 30), BackgroundColor3 = C.PANEL, BorderSizePixel = 0,
}, win)
New("UICorner", { CornerRadius = UDim.new(0, 12) }, header)
New("TextLabel", {
    Size = UDim2.new(1, -70, 1, 0), Position = UDim2.new(0, 10, 0, 0), BackgroundTransparency = 1,
    Text = "📡 MÃ SERVER NGƯỜI CHƠI", TextColor3 = C.ACCENT, Font = Enum.Font.GothamBold, TextSize = 12,
    TextXAlignment = Enum.TextXAlignment.Left,
}, header)

local closeBtn = New("TextButton", {
    Size = UDim2.new(0, 26, 0, 20), Position = UDim2.new(1, -32, 0, 5), BackgroundColor3 = C.FIELD,
    Text = "✕", TextColor3 = C.TEXT, Font = Enum.Font.GothamBold, TextSize = 12, BorderSizePixel = 0,
}, header)
New("UICorner", { CornerRadius = UDim.new(0, 6) }, closeBtn)

local input = New("TextBox", {
    Size = UDim2.new(1, -20, 0, 30), Position = UDim2.new(0, 10, 0, 38), BackgroundColor3 = C.FIELD,
    Text = "", PlaceholderText = "Tên / @tên / UserId người chơi…", PlaceholderColor3 = C.DIM,
    TextColor3 = C.TEXT, Font = Enum.Font.Gotham, TextSize = 12, BorderSizePixel = 0, ClearTextOnFocus = false,
}, win)
New("UICorner", { CornerRadius = UDim.new(0, 8) }, input)
New("UIPadding", { PaddingLeft = UDim.new(0, 8), PaddingRight = UDim.new(0, 8) }, input)

local function mkBtn(text, x, w, color)
    local b = New("TextButton", {
        Size = UDim2.new(0, w, 0, 30), Position = UDim2.new(0, x, 0, 76), BackgroundColor3 = color,
        Text = text, TextColor3 = C.BG, Font = Enum.Font.GothamBold, TextSize = 11, BorderSizePixel = 0,
    }, win)
    New("UICorner", { CornerRadius = UDim.new(0, 8) }, b)
    return b
end

local lookBtn = mkBtn("🔎 Tra cứu", 10, 104, C.ACCENT)
local copyBtn = mkBtn("📋 Mã SV", 120, 104, C.YELLOW)
local joinBtn = mkBtn("🚀 Vào SV", 230, 102, C.GREEN)

local info = New("TextLabel", {
    Size = UDim2.new(1, -20, 0, 92), Position = UDim2.new(0, 10, 0, 114), BackgroundColor3 = C.PANEL,
    Text = "Nhập tên/UserId rồi bấm 🔎 Tra cứu.\n📋 Mã SV = quét & copy mã · 🚀 Vào SV = vào luôn server đó.",
    TextColor3 = C.DIM, Font = Enum.Font.Gotham, TextSize = 11, TextWrapped = true,
    TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top, BorderSizePixel = 0,
}, win)
New("UICorner", { CornerRadius = UDim.new(0, 8) }, info)
New("UIPadding", { PaddingLeft = UDim.new(0, 8), PaddingRight = UDim.new(0, 8), PaddingTop = UDim.new(0, 6), PaddingBottom = UDim.new(0, 6) }, info)

local status = New("TextLabel", {
    Size = UDim2.new(1, -20, 0, 34), Position = UDim2.new(0, 10, 0, 212), BackgroundTransparency = 1,
    Text = "Sẵn sàng.", TextColor3 = C.DIM, Font = Enum.Font.Gotham, TextSize = 11, TextWrapped = true,
    TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top,
}, win)

local codeBox = New("TextBox", {
    Size = UDim2.new(1, -104, 0, 28), Position = UDim2.new(0, 10, 0, 250), BackgroundColor3 = C.FIELD,
    Text = "", PlaceholderText = "Dán mã SV đã copy (JobId hoặc PlaceId:JobId)…", PlaceholderColor3 = C.DIM,
    TextColor3 = C.TEXT, Font = Enum.Font.Gotham, TextSize = 11, BorderSizePixel = 0, ClearTextOnFocus = false,
}, win)
New("UICorner", { CornerRadius = UDim.new(0, 8) }, codeBox)

local pasteJoinBtn = New("TextButton", {
    Size = UDim2.new(0, 88, 0, 28), Position = UDim2.new(1, -94, 0, 250), BackgroundColor3 = C.GREEN,
    Text = "🚀 Vào mã", TextColor3 = C.BG, Font = Enum.Font.GothamBold, TextSize = 11, BorderSizePixel = 0,
}, win)
New("UICorner", { CornerRadius = UDim.new(0, 8) }, pasteJoinBtn)

local depthBtn = New("TextButton", {
    Size = UDim2.new(1, -20, 0, 26), Position = UDim2.new(0, 10, 0, 284), BackgroundColor3 = C.FIELD,
    Text = "⚙️ Độ sâu quét: 150 trang/place (bấm để đổi)", TextColor3 = C.DIM,
    Font = Enum.Font.Gotham, TextSize = 10, BorderSizePixel = 0,
}, win)
New("UICorner", { CornerRadius = UDim.new(0, 8) }, depthBtn)

-- kéo cửa sổ
do
    local dragging, dragStart, startPos = false, nil, nil
    header.InputBegan:Connect(function(i)
        if i.UserInputType == Enum.UserInputType.MouseButton1 or i.UserInputType == Enum.UserInputType.Touch then
            dragging = true dragStart = i.Position startPos = win.Position
        end
    end)
    UserInputService.InputChanged:Connect(function(i)
        if dragging and (i.UserInputType == Enum.UserInputType.MouseMovement or i.UserInputType == Enum.UserInputType.Touch) then
            local d = i.Position - dragStart
            win.Position = UDim2.new(startPos.X.Scale, startPos.X.Offset + d.X, startPos.Y.Scale, startPos.Y.Offset + d.Y)
        end
    end)
    UserInputService.InputEnded:Connect(function(i)
        if i.UserInputType == Enum.UserInputType.MouseButton1 or i.UserInputType == Enum.UserInputType.Touch then
            dragging = false
        end
    end)
end

local function setStatus(msg, color)
    status.Text = tostring(msg or "")
    status.TextColor3 = color or C.DIM
end

local rec = nil

local function showInfo(lines, color)
    info.Text = table.concat(lines, "\n")
    info.TextColor3 = color or C.TEXT
end

local function doLookup()
    local q = input.Text
    setStatus("🔎 Đang tra cứu…", C.YELLOW)
    local id, err = S.ResolveUser(q)
    if not id then
        rec = nil showInfo({ "❌ " .. tostring(err) }, C.RED) setStatus(tostring(err), C.RED) return
    end
    local prof = S.FetchProfile(id)
    local pres = S.FetchPresence(id)
    rec = {
        id = id,
        name = (prof and (prof.name or prof.displayName)) or ("User_" .. tostring(id)),
        displayName = (prof and prof.displayName) or "",
        created = (prof and type(prof.created) == "string" and prof.created:sub(1, 10)) or "—",
        presence = S.PresenceText(pres),
        jobId = nil, placeId = nil, meta = nil, coName = nil,
    }
    local isPlaying, msg, unknown = S.CheckPlayerIsPlaying(id, pres)
    if unknown then rec.presence = "🔎 Roblox ẩn trạng thái với người lạ" end
    local lines = {
        "👤 " .. tostring(rec.name) .. (rec.displayName ~= "" and rec.displayName ~= rec.name and (" (" .. rec.displayName .. ")") or ""),
        "🆔 UserId: " .. tostring(id) .. "  ·  🗓 tạo: " .. tostring(rec.created),
        "📶 " .. tostring(rec.presence),
    }
    if unknown then
        lines[#lines + 1] = "🔎 Roblox ẩn trạng thái với người lạ — bấm 📋 Mã SV để quét server công khai."
    elseif not isPlaying then
        lines[#lines + 1] = "⛔ " .. tostring(msg or "không chơi game này")
    end
    if type(pres) == "table" and type(pres.gameId) == "string" and pres.gameId ~= "" then
        rec.jobId = pres.gameId
        rec.placeId = tonumber(pres.placeId) or tonumber(pres.rootPlaceId)
        lines[#lines + 1] = "🔑 Mã SV: " .. tostring(rec.jobId) .. " (từ presence — chính xác ngay)"
    end
    showInfo(lines)
    setStatus(unknown and "Đã có hồ sơ — bấm 📋 Mã SV để quét server." or "Xong.", C.GREEN)
end

local function ensureFound()
    if not rec then return nil, "chưa tra cứu ai — nhập tên/UserId rồi bấm 🔎" end
    if rec.jobId and rec.jobId ~= "" then return rec end
    local jobId, placeId, src, meta, coName, err = S.FindPlayerServer(rec.id, rec.placeId or game.PlaceId, function(pg, cnt, mode, pId)
        setStatus(string.format("🔍 Đang quét: trang %s · %s · Place %s…", tostring(pg), tostring(mode or ""), tostring(pId or "")), C.YELLOW)
    end, tonumber(S.ScanPages) or 150)
    if err then
        setStatus("⛔ " .. tostring(err), C.RED)
        return nil, err
    end
    if not jobId or jobId == "" then
        local st = S.lastScanStats
        local statsTxt = ""
        if type(st) == "table" then
            statsTxt = string.format(" · đã quét %d SV / %d trang / %d place", st.servers or 0, st.pages or 0, st.places or 0)
        end
        local msg
        if type(st) == "table" and st.blind then
            msg = "Roblox ẩn danh sách người chơi trong server (chỉ trả JobId) nên không dò được bằng ảnh đại diện" .. statsTxt
                .. " — Blox Fruits luôn vậy. Dùng: người đó là bạn bè (presence) hoặc dán mã PlaceId:JobId đã có."
        else
            msg = "Không tìm thấy server của người này" .. statsTxt .. " — có thể đang ở server VIP/riêng tư, hoặc tăng Độ sâu rồi thử lại."
        end
        setStatus("⚠️ " .. msg, C.YELLOW)
        return nil, msg
    end
    rec.jobId, rec.placeId, rec.meta, rec.coName, rec.src = tostring(jobId), tonumber(placeId), meta, coName, src
    return rec
end

local function doCopy()
    local r, err = ensureFound()
    if not r then return end
    local codeIn, dispTxt = S.FormatCode(r.jobId, r.placeId, r.meta, r.coName)
    local ok = S.Clipboard(codeIn ~= "" and codeIn or r.jobId)
    local lines = {
        "👤 " .. tostring(r.name) .. " · 🆔 " .. tostring(r.id),
        "🔑 Mã SV: " .. tostring(r.jobId),
        "🌐 Place: " .. tostring(r.placeId or game.PlaceId) .. "  ·  nguồn: " .. tostring(r.src or "scan"),
        "📋 Mã để dán: " .. tostring(codeIn ~= "" and codeIn or r.jobId),
    }
    showInfo(lines, C.GREEN)
    setStatus(ok and ("✅ Đã copy mã: " .. tostring(codeIn)) or ("Mã: " .. tostring(codeIn) .. " (không copy được — chép tay)"), ok and C.GREEN or C.YELLOW)
end

local function doJoin()
    local r, err = ensureFound()
    if not r then return end
    local codeIn = S.FormatCode(r.jobId, r.placeId, r.meta, r.coName)
    local ok, msg = S.Join(r.placeId, r.jobId, function(m) setStatus(m, C.YELLOW) end)
    setStatus((ok and "✅ " or "⚠️ ") .. tostring(msg), ok and C.GREEN or C.RED)
    if ok then
        S.Clipboard(codeIn)
        showInfo({
            "👤 " .. tostring(r.name) .. " · 🆔 " .. tostring(r.id),
            "🔑 Mã SV: " .. tostring(r.jobId),
            "🌐 Place: " .. tostring(r.placeId or game.PlaceId),
            "🚀 Đang teleport… (mã đã copy phòng khi cần vào lại)",
        }, C.GREEN)
    end
end

lookBtn.Activated:Connect(function() pcall(doLookup) end)
copyBtn.Activated:Connect(function() pcall(doCopy) end)
joinBtn.Activated:Connect(function() pcall(doJoin) end)

pasteJoinBtn.Activated:Connect(function()
    local jId, pId, note = S.ParseCode(codeBox.Text)
    if not jId then
        setStatus("⚠️ Mã không hợp lệ (cần JobId, PlaceId:JobId hoặc link Roblox có gameInstanceId).", C.RED)
        return
    end
    local ok, msg = S.Join(pId, jId, function(m) setStatus(m, C.YELLOW) end)
    if note == "private" then
        msg = tostring(msg) .. " ⚠️ Link này là server riêng (privateServerLinkCode) — cần access code, mã JobId không vào được."
        ok = false
    end
    setStatus((ok and "✅ " or "⚠️ ") .. tostring(msg), ok and C.GREEN or C.RED)
end)

depthBtn.Activated:Connect(function()
    local cur = tonumber(S.ScanPages) or 150
    local nextVal = (cur >= 400) and 60 or (cur + 60)
    S.ScanPages = math.clamp(nextVal, 30, 480)
    depthBtn.Text = "⚙️ Độ sâu quét: " .. tostring(S.ScanPages) .. " trang/place (bấm để đổi)"
    setStatus("Độ sâu = " .. tostring(S.ScanPages) .. " trang/place. Quét sâu hơn = lâu hơn nhưng chắc hơn.", C.DIM)
end)

local function toggle(force)
    win.Visible = (force ~= nil) and force or (not win.Visible)
end
floatBtn.Activated:Connect(function() toggle() end)
closeBtn.Activated:Connect(function() toggle(false) end)

UserInputService.InputBegan:Connect(function(i, gp)
    if gp then return end
    if i.KeyCode == Enum.KeyCode.RightShift then toggle() end
end)

input.FocusLost:Connect(function(enter)
    if enter then pcall(doLookup) end
end)

setStatus("Sẵn sàng. RightShift để mở/đóng.", C.DIM)
