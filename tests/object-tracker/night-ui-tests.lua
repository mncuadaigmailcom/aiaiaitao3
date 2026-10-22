local passed=0
local function test(name,fn) fn(); passed=passed+1; print('PASS NIGHT UI '..name) end
local gui=assert(Mock.gui())
local page=gui:FindFirstChild('Main'):FindFirstChild('PlayerTab')
local panel=assert(page:FindFirstChild('NightVisionPanel'))
local lighting=Mock.lighting
local props={'Ambient','OutdoorAmbient','Brightness','ExposureCompensation','GlobalShadows','EnvironmentDiffuseScale','EnvironmentSpecularScale'}
local baseline={}; for _,k in ipairs(props) do baseline[k]=lighting[k] end
local function restored() for _,k in ipairs(props) do assert(lighting[k]==baseline[k],k) end end
local function correction() return lighting:FindFirstChild('TrackerSoftNightVision') end
local function itemCount() return #workspace:FindFirstChild('ItemTrackerLocalEffects'):GetChildren() end
local function doorCount() return #workspace:FindFirstChild('DoorTrackerLocalEffects'):GetChildren() end
local oldEntities,oldItems,oldDoors=#Mock.markers(),itemCount(),doorCount()
local bloom=Mock.node('BloomEffect','ExistingGameBloom',lighting); bloom.Enabled=true
local grade=Mock.node('ColorCorrectionEffect','DisabledGameGrade',lighting); grade.Enabled=false
test('fourth independent feature starts off with just one toggle and no lighting changes',function()
    assert(panel.Parent==page:FindFirstChild('DoorTrackerPanel').Parent)
    local buttons=0
    for _,node in ipairs(panel:GetChildren()) do
        if node:IsA('TextButton') then buttons=buttons+1; assert(node.Name=='ToggleNightVision') end
        assert(not node:IsA('TextBox'))
    end
    assert(buttons==1 and not correction()); restored(); Mock.findText('Nhìn bóng tối: TẮT')
    assert(workspace.DescendantAdded:count()==1 and Mock.run.Heartbeat:count()==1)
end)
test('shortcut and canvas reach the new card without overlapping existing controls or cards',function()
    local shortcut=Mock.findText('Bóng tối ↓')
    for _,other in ipairs(shortcut.Parent:GetChildren()) do
        if other~=shortcut and other:IsA('TextButton') then
            local a,b=shortcut.Position,other.Position
            assert(a.X.Offset+shortcut.Size.X.Offset<=b.X.Offset or b.X.Offset+other.Size.X.Offset<=a.X.Offset
                or a.Y.Offset+shortcut.Size.Y.Offset<=b.Y.Offset or b.Y.Offset+other.Size.Y.Offset<=a.Y.Offset)
        end
    end
    shortcut.Activated:Fire(); assert(page.CanvasPosition.Y==panel.Position.Y.Offset)
    local doors=page:FindFirstChild('DoorTrackerPanel')
    assert(panel.Position.Y.Offset>=doors.Position.Y.Offset+doors.Size.Y.Offset*doors:FindFirstChildWhichIsA('UIScale').Scale)
    assert(page.CanvasSize.Y.Offset>=panel.Position.Y.Offset+panel.Size.Y.Offset*panel:FindFirstChildWhichIsA('UIScale').Scale)
end)
test('one click enables modest light, negative exposure, soft grading and glare suppression',function()
    Mock.findText('Nhìn bóng tối: TẮT').Activated:Fire(); Mock.frames(3)
    Mock.findText('Nhìn bóng tối: BẬT')
    assert(lighting.Brightness==1.2 and lighting.ExposureCompensation<0 and lighting.GlobalShadows==false)
    assert(correction() and correction().Contrast<0 and correction().Brightness<=0.02)
    assert(bloom.Enabled==false and grade.Enabled==false)
    assert(lighting.ClockTime==0 and lighting.FogEnd==400)
end)
test('entity ESP, items, doors and persistent alerts remain active with night vision',function()
    assert(#Mock.markers()==oldEntities and itemCount()==oldItems and doorCount()==oldDoors)
    assert(gui:FindFirstChild('EntityAlerts').Visible)
    Mock.findText('Định vị: BẬT'); Mock.findText('Vật phẩm: BẬT'); Mock.findText('Định vị cửa: BẬT')
end)
test('hiding the menu does not turn off the independent lighting mode',function()
    Mock.findText('X').Activated:Fire(); Mock.frames(3)
    assert(not gui:FindFirstChild('Main').Visible and correction() and lighting.GlobalShadows==false)
    gui:FindFirstChild('MenuToggle').Activated:Fire(); assert(gui:FindFirstChild('Main').Visible)
end)
test('new camera glare is suppressed and old-camera effects are restored when switching back',function()
    local previous=workspace.CurrentCamera
    local camera=Mock.node('Camera','ReplacementCamera',nil)
    camera.CFrame, camera.ViewportSize=previous.CFrame,previous.ViewportSize
    local rays=Mock.node('SunRaysEffect','NewCameraRays',camera); rays.Enabled=true
    workspace.CurrentCamera=camera; Mock.frames(3); assert(rays.Enabled==false)
    workspace.CurrentCamera=previous; Mock.frames(3); assert(rays.Enabled==true)
end)
test('turning off restores original lighting and original game effect states',function()
    local owned=correction()
    Mock.findText('Nhìn bóng tối: BẬT').Activated:Fire(); Mock.frames(3)
    restored(); assert(not correction() and owned._destroyed and bloom.Enabled==true and grade.Enabled==false)
    assert(#Mock.markers()==oldEntities and itemCount()==oldItems and doorCount()==oldDoors)
end)
test('injected lighting failure restores state without disabling any existing feature',function()
    Mock.findText('Nhìn bóng tối: TẮT').Activated:Fire()
    correction():Destroy()
    local original=Instance.new
    Instance.new=function(class)
        if class=='ColorCorrectionEffect' then error('injected night vision creation failure') end
        return original(class)
    end
    Mock.run.Heartbeat:Fire(0.3); Instance.new=original
    assert(Mock.lastWarning and Mock.lastWarning:find('[NightVision]',1,true)); Mock.lastWarning=nil
    restored(); assert(not correction() and bloom.Enabled==true)
    Mock.findText('Nhìn bóng tối: TẮT'); Mock.findText('Định vị: BẬT')
    Mock.findText('Vật phẩm: BẬT'); Mock.findText('Định vị cửa: BẬT')
    assert(#Mock.markers()==oldEntities and itemCount()==oldItems and doorCount()==oldDoors)
    assert(gui:FindFirstChild('EntityAlerts').Visible)
end)
test('mode can be enabled again after recovery and never duplicates the owned effect',function()
    Mock.findText('Nhìn bóng tối: TẮT').Activated:Fire(); Mock.frames(10)
    local count=0; for _,child in ipairs(lighting:GetChildren()) do if child.Name=='TrackerSoftNightVision' then count=count+1 end end
    assert(count==1 and correction().Enabled and bloom.Enabled==false)
end)
Mock.oldNightPanel=panel; Mock.oldNightCorrection=correction()
local previousReload=testReloaded
function testReloaded()
    test('reload restores lighting, destroys the old card/effect and starts night vision disabled',function()
        assert(Mock.oldNightPanel._destroyed and Mock.oldNightCorrection._destroyed)
        restored(); assert(not correction() and bloom.Enabled==true and grade.Enabled==false)
        Mock.findText('Nhìn bóng tối: TẮT')
        assert(Mock.run.Heartbeat:count()==1 and workspace.DescendantAdded:count()==1)
    end)
    Mock.findText('Nhìn bóng tối: TẮT').Activated:Fire()
    previousReload()
    test('Dừng & thoát while active restores lighting and removes only the owned correction',function()
        restored(); assert(not correction() and bloom.Enabled==true and grade.Enabled==false)
        assert(not bloom._destroyed and not grade._destroyed)
    end)
end
local previousExternal=testExternalDestroy
function testExternalDestroy()
    Mock.findText('Nhìn bóng tối: TẮT').Activated:Fire()
    previousExternal()
    test('external GUI destruction while active also restores lighting and effects',function()
        restored(); assert(not correction() and bloom.Enabled==true and grade.Enabled==false)
    end)
    print(passed..' soft night-vision GUI integration tests passed')
end
