--[[
	Điểm vào chỉ dùng bởi tools/build.js --doors-locator.
	Bundle tự bật công cụ sau khi Start() xác nhận đang ở Roblox Studio.
]]

local DoorsLocator = __RALO_REQUIRE("Client/Debug/DoorsLocator")
local started, reason = DoorsLocator.Start()
if not started then
	warn("[DOORS DEV LOCATOR] " .. tostring(reason))
end

return DoorsLocator
