-- Entry point: StarterPlayerScripts.DoorsEntityRadar.Bootstrap
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local sharedFolder = ReplicatedStorage:WaitForChild("DoorsEntityRadar"):WaitForChild("Shared")
local clientFolder = script.Parent

local function safeRequire(moduleScript)
	local ok, result = pcall(require, moduleScript)
	if not ok then
		warn("[DoorsEntityRadar] Module load failed: " .. moduleScript:GetFullName() .. " :: " .. tostring(result))
		return nil
	end
	return result
end

local Catalog = safeRequire(sharedFolder:WaitForChild("Catalog"))
local Config = safeRequire(sharedFolder:WaitForChild("Config"))
local Detector = safeRequire(clientFolder:WaitForChild("Detector"))
local Controller = safeRequire(clientFolder:WaitForChild("Controller"))
if not (Catalog and Config and Detector and Controller) then return end

local controller
local detector = Detector.new(workspace, Config, function()
	if controller then controller:_renderDetail(); controller:_renderState() end
end)
local ok, result = pcall(Controller.new, playerGui, Catalog, detector)
if not ok then
	detector:Stop()
	warn("[DoorsEntityRadar] UI startup failed: " .. tostring(result))
	return
end
controller = result
script.Destroying:Connect(function()
	if controller then controller:Destroy(); controller = nil end
end)
print("[DoorsEntityRadar] Ready. Chọn khu vực/thực thể rồi nhấn Start.")
