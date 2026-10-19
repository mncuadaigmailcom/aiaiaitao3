-- Manual Studio smoke test. Place beside Bootstrap.client.luau in a test copy of the project,
-- disable the normal Bootstrap LocalScript during this test, then press Play.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local shared = ReplicatedStorage:WaitForChild("DoorsEntityRadar"):WaitForChild("Shared")
local catalog = require(shared:WaitForChild("Catalog"))
local config = require(shared:WaitForChild("Config"))
local Detector = require(script.Parent:WaitForChild("Detector"))

local function expect(condition, message)
	if not condition then error("[Radar smoke test] " .. message, 2) end
	print("[Radar smoke test] PASS: " .. message)
end

local count = 0
for _, section in ipairs(catalog.Sections) do
	for _, entry in ipairs(section.entities) do
		count = count + 1
		expect(type(entry.name) == "string" and #entry.name > 0, "catalog entry has a display name")
	end
end
expect(#catalog.Sections == 8, "all eight sections are present")
expect(count >= 90, "catalog includes the requested entity/event names")

local testPart = Instance.new("Part")
testPart.Name = "RadarSmokeEntity_001"
testPart.Anchored = true
testPart.CanCollide = false
testPart.Size = Vector3.new(2, 2, 2)
testPart.Position = (workspace.CurrentCamera and workspace.CurrentCamera.CFrame.Position or Vector3.new(0, 10, 0)) + Vector3.new(0, 0, -12)
testPart.Parent = workspace

local detector = Detector.new(workspace, config, function() end)
local testEntry = {name = "Smoke Entity", kind = "entity", aliases = {"RadarSmokeEntity_001"}, verified = false}
detector:Start({testEntry})
task.wait(0.5)
local found = detector:GetState(testEntry)
expect(#found.matches == 1, "scan detects an exact configured Workspace.Name")
expect(found.matches[1].position ~= nil, "detected instance has a real Roblox position")
if found.status == "detected" then
	expect(type(found.distance) == "number" and type(found.direction) == "string", "valid root/camera produce distance and relative direction")
else
	expect(found.status == "unsupported", "missing character root/camera reports unsupported instead of fake coordinates")
end

testPart.Parent = nil
detector:Refresh()
task.wait(0.5)
local missing = detector:GetState(testEntry)
expect(#missing.matches == 0, "removed test instance is not kept as live data")
expect(missing.status == "notDetected" or missing.status == "unverified", "empty scan reports no match or still scanning")
detector:Stop()
expect(not detector.active, "Stop disconnects and disables detector")
testPart:Destroy()
print("[Radar smoke test] DONE. This validates generic Workspace matching, not DOORS game internals.")
