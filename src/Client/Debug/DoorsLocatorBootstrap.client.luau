--!strict
--
-- LocalScript được Rojo tự chạy trong StarterPlayerScripts.
-- Chỉ dành cho Studio và game bạn sở hữu; Start() tự từ chối môi trường khác.
--

local locatorModule = script.Parent:WaitForChild("DoorsLocator")
local DoorsLocator = require(locatorModule)
local started, reason = DoorsLocator.Start()
if not started then
	warn("[DOORS DEV LOCATOR] " .. tostring(reason))
end
