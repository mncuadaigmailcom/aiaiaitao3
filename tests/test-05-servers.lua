-- test-05-servers.lua — nhóm 🌐 SERVER: Reset / Hop / vào theo mã, với HTTP giả
local T = _G.__T
local S = T.S
local R = {}
local function chk(name, fn)
    local ok, err = pcall(fn)
    R[#R+1] = {name = name, ok = ok, err = ok and "" or tostring(err)}
end

local function servers(list, nextCursor)
    return '{"data":[' .. list .. '],"nextPageCursor":' ..
        (nextCursor and ('"' .. nextCursor .. '"') or "null") .. '}'
end

chk("FetchServers goi dung API games.roblox.com cua chinh game nay", function()
    MOCK_HTTPGET_HANDLER = function(url)
        return servers('{"id":"aaa","playing":3,"maxPlayers":10}')
    end
    local list = S.FetchServers("")
    assert(type(list) == "table", "khong tra ve bang")
    local logged = MOCK_HTTP_LOG[#MOCK_HTTP_LOG]
    assert(logged and logged.Url, "khong co request nao")
    assert(logged.Url:find("games.roblox.com/v1/games/", 1, true), "sai host: " .. tostring(logged.Url))
    assert(logged.Url:find(tostring(MOCK.game.PlaceId), 1, true), "khong dung PlaceId cua game")
    assert(logged.Url:find("servers/Public", 1, true), "khong phai danh sach Public")
    MOCK_HTTPGET_HANDLER = nil
end)

chk("HopServer bo server hien tai va server da day", function()
    local me = tostring(S.GetJobId() or "")
    MOCK_HTTPGET_HANDLER = function()
        return servers(string.format(
            '{"id":"%s","playing":1,"maxPlayers":10},' ..
            '{"id":"day_roi","playing":10,"maxPlayers":10},' ..
            '{"id":"con-cho","playing":2,"maxPlayers":10}', me))
    end
    MOCK_TELEPORTS = {}
    local msg = S.HopServer()
    assert(type(MOCK_TELEPORTS[1]) == "table", "khong teleport")
    assert(MOCK_TELEPORTS[1].jobId == "con-cho",
        "nhay sai server: " .. tostring(MOCK_TELEPORTS[1].jobId) .. " · msg=" .. tostring(msg))
    MOCK_HTTPGET_HANDLER = nil
end)

chk("HopServer khong co server trong -> bao loi, KHONG teleport", function()
    MOCK_HTTPGET_HANDLER = function() return servers("") end
    MOCK_TELEPORTS = {}
    local msg = S.HopServer()
    assert(#MOCK_TELEPORTS == 0, "van teleport du khong tim thay server")
    assert(type(msg) == "string" and msg:find("⚠️", 1, true), "khong canh bao: " .. tostring(msg))
    MOCK_HTTPGET_HANDLER = nil
end)

chk("HopServer khong lap vo han khi API tra ve loi/HTML", function()
    local calls = 0
    MOCK_HTTPGET_HANDLER = function() calls = calls + 1 return "<html>rate limited</html>" end
    local ok, msg = pcall(S.HopServer)
    MOCK_HTTPGET_HANDLER = nil
    assert(calls <= 3, "goi HTTP " .. calls .. " lan (mong <= 3 trang)")
    -- hoac bao loi, hoac canh bao — khong duoc treo
end)

chk("JoinServer teleport dung ma nguoi dung dan", function()
    MOCK_TELEPORTS = {}
    S.JoinServer("ma-nguoi-dung-dan")
    assert(#MOCK_TELEPORTS == 1, "khong teleport")
    assert(MOCK_TELEPORTS[1].jobId == "ma-nguoi-dung-dan", "sai ma: " .. tostring(MOCK_TELEPORTS[1].jobId))
end)

chk("ResetServer vao lai dung server dang choi", function()
    MOCK_TELEPORTS = {}
    local msg = S.ResetServer()
    assert(#MOCK_TELEPORTS == 1, "khong teleport")
    assert(MOCK_TELEPORTS[1].kind == "instance", "phai dung TeleportToPlaceInstance")
    assert(MOCK_TELEPORTS[1].jobId == MOCK.game.JobId, "sai JobId")
end)

chk("RunHubAction('hopserver') boc pcall — API loi khong lam chet UI", function()
    MOCK_HTTPGET_HANDLER = function() error("mang dieu") end
    local ok, msg = pcall(S.RunHubAction, "hopserver")
    MOCK_HTTPGET_HANDLER = nil
    assert(ok, "RunHubAction de lot loi ra ngoai: " .. tostring(msg))
    assert(type(msg) == "string" and #msg > 0, "khong co thong bao")
end)

chk("RunHubAction voi action la bao ro rang, khong tra nil", function()
    local msg = S.RunHubAction("__khong_ton_tai__")
    assert(type(msg) == "string" and msg:find("⚠️", 1, true), "khong canh bao: " .. tostring(msg))
end)

chk("11 the Script Hub: the nao cung co code hoac action (khong nut chet)", function()
    local n, bad = 0, {}
    for _, it in ipairs(S.ScriptHubList) do
        n = n + 1
        if not it.code and not it.action then bad[#bad+1] = tostring(it.name) end
    end
    assert(n == 11, "so the = " .. n .. " (mong 11)")
    assert(#bad == 0, "the khong co code/action: " .. table.concat(bad, ", "))
end)

return R
