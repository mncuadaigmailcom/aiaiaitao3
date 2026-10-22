local passed=0
local function test(name,fn) fn(); passed=passed+1; print('PASS DOOR UI '..name) end
local gui=assert(Mock.gui())
local page=gui:FindFirstChild('Main'):FindFirstChild('PlayerTab')
local panel=assert(page:FindFirstChild('DoorTrackerPanel'))
local items=assert(page:FindFirstChild('ItemTrackerPanel'))
local function folder() return assert(workspace:FindFirstChild('DoorTrackerLocalEffects')) end
local function markers() return folder():GetChildren() end
local function label(m) return m:FindFirstChildWhichIsA('BillboardGui'):FindFirstChildWhichIsA('TextLabel') end
local function numbers()
    local out={}; for _,m in ipairs(markers()) do out[#out+1]=assert(tonumber(label(m).Text:match('^doors (%d+)'))) end
    table.sort(out); return table.concat(out,',')
end
local function itemCount() return #workspace:FindFirstChild('ItemTrackerLocalEffects'):GetChildren() end
local originalCount,originalItems=#Mock.markers(),itemCount()
local char=Mock.node('Model','DoorTestCharacter',workspace)
local root=Mock.node('Part','HumanoidRootPart',char,0)
Mock.players.LocalPlayer.Character=char
local fixtures={}
local rooms=Mock.node('Folder','CurrentRooms',workspace)
local function makeDoor(n,x)
    local room=Mock.node('Model',tostring(n),rooms)
    local outer=Mock.node('Model','Door',room)
    return Mock.node('Part','Door',outer,x or n*20)
end
for n=2,44 do fixtures[n]=makeDoor(n) end
Mock.frames(3)
test('door locator is a third independent sibling card in the same player tab and starts disabled',function()
    assert(panel.Parent==items.Parent and panel.Parent==page:FindFirstChild('HubObjTrack_Panel').Parent)
    Mock.findText('Định vị cửa: TẮT'); assert(#markers()==0)
    assert(workspace.DescendantAdded:count()==1 and Mock.run.Heartbeat:count()==1)
end)
test('door shortcut scrolls to its card; item expansion and canvas do not overlap it',function()
    Mock.findText('Cửa ↓').Activated:Fire()
    assert(page.CanvasPosition.Y==panel.Position.Y.Offset)
    assert(panel.Position.Y.Offset>=items.Position.Y.Offset+items.Size.Y.Offset*items:FindFirstChildWhichIsA('UIScale').Scale)
    assert(page.CanvasSize.Y.Offset>=panel.Position.Y.Offset+panel.Size.Y.Offset*panel:FindFirstChildWhichIsA('UIScale').Scale)
end)
test('enabling with door 1 absent falls back to doors 2 and 3 without changing other features',function()
    Mock.findText('Định vị cửa: TẮT').Activated:Fire(); Mock.frames(25)
    assert(numbers()=='2,3',numbers()); Mock.findText('Định vị cửa: BẬT')
    assert(#Mock.markers()==originalCount and itemCount()==originalItems)
end)
test('door highlight, outline, box and text are black; text has white stroke for readability',function()
    for _,m in ipairs(markers()) do
        local hl=m:FindFirstChildWhichIsA('Highlight')
        local box=m:FindFirstChildWhichIsA('BoxHandleAdornment')
        for _,color in ipairs({hl.FillColor,hl.OutlineColor,box.Color3,label(m).TextColor3}) do
            assert(color.R==0 and color.G==0 and color.B==0)
        end
        assert(label(m).TextStrokeColor3.R==1 and label(m).TextStrokeTransparency==0)
    end
end)
test('door 1 arriving after enable is indexed in one heartbeat and becomes the current door',function()
    fixtures[1]=makeDoor(1)
    Mock.run.Heartbeat:Fire(1/60)
    assert(numbers()=='1,2',numbers())
end)
test('standing at door 40 marks only 39,40,41 and removes distant older markers',function()
    root.Position=Vector3.new(800,0,0); Mock.frames(25)
    assert(numbers()=='39,40,41',numbers())
    local status=panel:FindFirstChild('DoorStatus').Text
    assert(status:find('Cửa hiện tại: 40',1,true) and status:find('39 / 40 / 41',1,true))
end)
test('passing door 40 advances immediately; reversing through it brings back earlier context',function()
    root.Position=Vector3.new(801,0,0); Mock.run.Heartbeat:Fire(1/60)
    assert(numbers()=='40,41,42',numbers())
    root.Position=Vector3.new(799,0,0); Mock.run.Heartbeat:Fire(1/60)
    assert(numbers()=='38,39,40',numbers())
    root.Position=Vector3.new(780,0,0); Mock.frames(3)
    assert(numbers()=='38,39,40',numbers())
end)
test('door feature has exactly one switch with no secondary controls, result buttons or copy fields',function()
    local buttons=0
    local function inspect(node)
        for _,child in ipairs(node:GetChildren()) do
            if child:IsA('TextButton') then buttons=buttons+1; assert(child.Name=='ToggleDoorTracker') end
            assert(not child:IsA('TextBox'))
            inspect(child)
        end
    end
    inspect(panel)
    assert(buttons==1 and panel.Size.Y.Offset==212)
    assert(not panel:FindFirstChild('DoorResult_1'))
    assert(panel:FindFirstChild('DoorStatus').Text:find('38 / 39 / 40',1,true))
end)
test('one switch automatically enables black boxes, labels and wall visibility without extra settings',function()
    for _,m in ipairs(markers()) do
        assert(m:FindFirstChildWhichIsA('BoxHandleAdornment').Visible)
        assert(m:FindFirstChildWhichIsA('BillboardGui').Enabled)
        assert(m:FindFirstChildWhichIsA('Highlight').DepthMode==Enum.HighlightDepthMode.AlwaysOnTop)
        assert(not label(m).Text:find('X ',1,true))
    end
    assert(#Mock.markers()==originalCount and itemCount()==originalItems)
end)
test('exact CurrentRooms numbered Door Door Model with late panel uses the shared listener',function()
    root.Position=Vector3.new(900,0,0)
    local room=Mock.node('Model','45',rooms)
    local outer=Mock.node('Model','Door',room)
    local door=Mock.node('Model','Door',outer)
    local part=Mock.node('Part','Panel',door,900)
    Mock.run.Heartbeat:Fire(1/60)
    assert(numbers()=='44,45',numbers())
    local found=false
    for _,m in ipairs(markers()) do if m:FindFirstChildWhichIsA('Highlight').Adornee==door then found=true end end
    assert(found and part.Parent==door)
    assert(workspace.DescendantAdded:count()==1)
end)
test('losing character while moving the camera does not change the tracked door',function()
    Mock.players.LocalPlayer.Character=nil
    workspace.CurrentCamera.CFrame.Position=Vector3.new(20,0,0)
    Mock.frames(25); assert(numbers()=='44,45',numbers())
    Mock.players.LocalPlayer.Character=char
end)
test('the single switch pauses only doors and resumes automatic tracking with at most three markers',function()
    Mock.findText('Định vị cửa: BẬT').Activated:Fire(); Mock.frames(3)
    assert(#markers()==0 and #Mock.markers()==originalCount and itemCount()==originalItems)
    Mock.findText('Định vị cửa: TẮT').Activated:Fire(); Mock.frames(25)
    Mock.frames(3) -- No manual rescan needed.
    assert(numbers()=='44,45' and #markers()<=3)
end)
test('injected door-only rendering failure cannot disable entity ESP, items or alerts',function()
    local saved=Color3.fromRGB
    Color3.fromRGB=function(r,g,b) if r==0 and g==0 and b==0 then error('injected door failure') end; return saved(r,g,b) end
    Mock.run.Heartbeat:Fire(0.1); Color3.fromRGB=saved
    assert(Mock.lastWarning and Mock.lastWarning:find('[DoorTracker]',1,true)); Mock.lastWarning=nil
    Mock.findText('Định vị cửa: TẮT'); Mock.findText('Định vị: BẬT'); Mock.findText('Vật phẩm: BẬT')
    assert(#Mock.markers()==originalCount and itemCount()==originalItems and gui:FindFirstChild('EntityAlerts').Visible)
    Mock.findText('Định vị cửa: TẮT').Activated:Fire(); Mock.frames(25)
    assert(#markers()>0)
end)
test('UI shows the new exact path template and never advertises legacy door aliases',function()
    Mock.findText('Đường dẫn: Workspace.CurrentRooms.1.Door.Door')
    for _,node in ipairs(panel:GetChildren()) do
        assert(not (node.Text or ''):find('Doors_001',1,true))
    end
end)
test('legacy doors elsewhere in Workspace cannot change the current door or create a marker',function()
    Mock.node('Part','doors 46',workspace,900)
    local outside=Mock.node('Model','46',workspace)
    local outer=Mock.node('Model','Door',outside)
    Mock.node('Part','Door',outer,900)
    Mock.frames(25); assert(numbers()=='44,45',numbers())
end)
test('renumbering a room is rediscovered automatically without any rescan button',function()
    local room=rooms:FindFirstChild('45'); assert(room)
    room.Name='46' -- Renaming emits no DescendantAdded: requires the automatic fallback scan.
    Mock.frames(40)
    assert(numbers()=='46',numbers())
    assert(panel:FindFirstChild('DoorStatus').Text:find('Cửa hiện tại: 46',1,true))
end)
Mock.oldDoorPanel=panel; Mock.oldDoorFolder=folder()
local previousReload=testReloaded
function testReloaded()
    test('reload destroys the old door UI/effects and starts one disabled door engine',function()
        assert(Mock.oldDoorPanel._destroyed and Mock.oldDoorFolder._destroyed)
        assert(#markers()==0); Mock.findText('Định vị cửa: TẮT')
        assert(workspace.DescendantAdded:count()==1 and Mock.run.Heartbeat:count()==1)
    end)
    previousReload()
    test('Dừng & thoát removes the numbered-door effects folder',function()
        assert(not workspace:FindFirstChild('DoorTrackerLocalEffects'))
    end)
end
local previousExternal=testExternalDestroy
function testExternalDestroy()
    previousExternal()
    test('external destruction also cleans the numbered-door engine',function()
        assert(not workspace:FindFirstChild('DoorTrackerLocalEffects'))
    end)
    print(passed..' numbered-door GUI integration tests passed')
end
