local passed=0
local function test(name,fn) fn(); passed=passed+1; print('PASS ITEM UI '..name) end
local gui=assert(Mock.gui())
local page=gui:FindFirstChild('Main'):FindFirstChild('PlayerTab')
local itemPanel=assert(page:FindFirstChild('ItemTrackerPanel'))
local entityPanel=assert(page:FindFirstChild('HubObjTrack_Panel'))
local function group(id) return assert(itemPanel:FindFirstChild('ItemGroup_'..id)) end
local function choose(id,name) group(id):FindFirstChild('GroupItems'):FindFirstChild('Item_'..name).Activated:Fire(); Mock.frames(20) end
local function folder() return assert(workspace:FindFirstChild('ItemTrackerLocalEffects')) end
local function markerFor(inst)
    for _,m in ipairs(folder():GetChildren()) do
        local hl=m:FindFirstChildWhichIsA('Highlight')
        if hl and hl.Adornee==inst then return m end
    end
end
local function markerColor(inst,r,g,b)
    local m=assert(markerFor(inst),'missing item marker '..inst.Name)
    local color=m:FindFirstChildWhichIsA('Highlight').FillColor
    assert(color.R==r/255 and color.G==g/255 and color.B==b/255)
end
local function findInput(hint)
    for _,node in ipairs(itemPanel:GetChildren()) do if node.PlaceholderText==hint then return node end end
    error(hint)
end
local function clear() Mock.findText('VP Xóa lựa chọn').Activated:Fire(); Mock.frames(3) end
Mock.frames(20) -- Let the original partial scan publish before taking the baseline.
local entityCount=#Mock.markers()
assert(entityCount>0)
Mock.players.LocalPlayer.Character=nil
local lighter=Mock.node('Part','Lighter',workspace,5)
local candle=Mock.node('Part','Candle',workspace,7)
local bandage=Mock.node('Part','Bandage',workspace,11)
local shears=Mock.node('Part','Shears',workspace,12)
local crucifix=Mock.node('Part','Crucifix',workspace,13)
local key=Mock.node('Part','Key',workspace,14)
local briefcase=Mock.node('Part','Briefcase',workspace,15)
test('entity and item features are separate sibling cards inside the same single player tab',function()
    assert(entityPanel~=itemPanel and entityPanel.Parent==itemPanel.Parent)
    assert(#folder():GetChildren()==0)
    Mock.findText('Vật phẩm: TẮT')
    assert(workspace.DescendantAdded:count()==1 and Mock.run.Heartbeat:count()==1)
end)
test('six group panels have the six requested border colors and start collapsed',function()
    local ids={'lights','healing','tools','magic','quest','misc'}
    local colors={{170,100,255},{255,155,55},{180,245,85},{255,105,180},{65,210,95},{255,220,70}}
    for i,id in ipairs(ids) do
        local g=group(id); local c=g:FindFirstChildWhichIsA('UIStroke').Color
        assert(c.R==colors[i][1]/255 and c.G==colors[i][2]/255 and c.B==colors[i][3]/255)
        assert(not g:FindFirstChild('GroupItems').Visible)
    end
end)
test('item shortcut and group expansion update scroll layout without overlapping the entity card',function()
    Mock.findText('Vật phẩm ↓').Activated:Fire()
    assert(page.CanvasPosition.Y==itemPanel.Position.Y.Offset)
    local height=itemPanel.Size.Y.Offset
    group('lights'):FindFirstChild('ExpandGroup').Activated:Fire()
    assert(group('lights'):FindFirstChild('GroupItems').Visible and itemPanel.Size.Y.Offset>height)
    assert(itemPanel.Position.Y.Offset>=entityPanel.Position.Y.Offset+entityPanel.Size.Y.Offset*entityPanel:FindFirstChildWhichIsA('UIScale').Scale)
end)
test('choosing only Lighter produces a purple item marker without changing entity ESP',function()
    choose('lights','Lighter')
    assert(#folder():GetChildren()==1 and markerFor(lighter) and not markerFor(candle))
    markerColor(lighter,170,100,255)
    assert(#Mock.markers()==entityCount)
    Mock.findText('Định vị: BẬT')
end)
test('item box and label options do not touch entity marker state',function()
    local entityMarker=Mock.markers()[1]:FindFirstChildWhichIsA('Highlight')
    local color=entityMarker.FillColor
    Mock.findText('VP Hộp: TẮT').Activated:Fire(); Mock.frames(3)
    assert(markerFor(lighter):FindFirstChildWhichIsA('BoxHandleAdornment').Visible)
    assert(entityMarker.FillColor.R==color.R and entityMarker.FillColor.G==color.G)
end)
test('group off remembers items; group selection and clearing leave another group untouched',function()
    choose('healing','Bandage')
    group('lights'):FindFirstChild('ToggleGroup').Activated:Fire(); Mock.frames(20)
    assert(not markerFor(lighter) and markerFor(bandage))
    assert(group('lights'):FindFirstChild('GroupItems'):FindFirstChild('Item_Lighter').Text:find('✓',1,true))
    group('lights'):FindFirstChild('ToggleGroup').Activated:Fire(); Mock.frames(20)
    assert(markerFor(lighter) and not markerFor(candle))
    group('lights'):FindFirstChild('GroupItems'):FindFirstChild('SelectGroup').Activated:Fire(); Mock.frames(20)
    assert(markerFor(lighter) and markerFor(candle) and markerFor(bandage))
    group('lights'):FindFirstChild('GroupItems'):FindFirstChild('ClearGroup').Activated:Fire(); Mock.frames(20)
    assert(not markerFor(lighter) and not markerFor(candle) and markerFor(bandage))
end)
test('item master pause and resume preserve selection and do not stop entities',function()
    Mock.findText('Vật phẩm: BẬT').Activated:Fire(); Mock.frames(3)
    assert(#folder():GetChildren()==0 and #Mock.markers()==entityCount)
    Mock.findText('Vật phẩm: TẮT').Activated:Fire(); Mock.frames(20)
    assert(markerFor(bandage) and #Mock.markers()==entityCount)
end)
test('shared Water Cup appears once; color changes from orange to quest-green when healing is off',function()
    clear(); local water=Mock.node('Part','WaterCup',workspace,9)
    choose('healing','Water Cup'); choose('quest','Water Cup')
    assert(#folder():GetChildren()==1); markerColor(water,255,155,55)
    group('healing'):FindFirstChild('ToggleGroup').Activated:Fire(); Mock.frames(20)
    assert(#folder():GetChildren()==1); markerColor(water,65,210,95)
    group('quest'):FindFirstChild('GroupItems'):FindFirstChild('ClearGroup').Activated:Fire(); Mock.frames(20)
    assert(#folder():GetChildren()==0)
end)
local handle,tool
test('a newly spawned Flashlight Tool is located using Handle via the shared fast event listener',function()
    clear(); choose('lights','Flashlight')
    tool=Mock.node('Tool','Flashlight',workspace)
    handle=Mock.node('Part','Handle',tool,25)
    Mock.run.Heartbeat:Fire(1/60)
    assert(markerFor(handle)); markerColor(handle,170,100,255)
    assert(workspace.DescendantAdded:count()==1)
    Mock.frames(3)
end)
test('item result selection shows path/XYZ and per-instance switch controls only the item',function()
    Mock.findText('VP Flashlight | 25.0 stud').Activated:Fire(); Mock.frames(3)
    local box=findInput('VP: path và XYZ')
    assert(box.TextEditable==false and box.Text:find('Workspace.Flashlight',1,true))
    Mock.findText('VP Tắt').Activated:Fire(); Mock.frames(3)
    local m=markerFor(handle)
    assert(not m:FindFirstChildWhichIsA('Highlight').Enabled and not m:FindFirstChildWhichIsA('BillboardGui').Enabled)
    assert(#Mock.markers()==entityCount)
    Mock.findText('VP Bật').Activated:Fire(); Mock.frames(3)
    assert(m:FindFirstChildWhichIsA('Highlight').Enabled)
end)
test('item distance limit is independent from entity distance limits',function()
    local distance=findInput('VP stud; 0 = vô hạn')
    distance.Text='20'; Mock.findText('VP Đặt xa').Activated:Fire(); Mock.frames(20)
    assert(#folder():GetChildren()==0 and #Mock.markers()==entityCount)
    distance.Text='0'; Mock.findText('VP Đặt xa').Activated:Fire(); Mock.frames(20)
    assert(markerFor(handle))
end)
test('manual item filters coexist with groups and survive deselect-all until clear',function()
    local custom=Mock.node('Part','CustomMedallion',workspace,19)
    local query=findInput('VP: tên/path tùy chọn'); query.Text='custommedallion'
    Mock.findText('VP Tìm tên/path').Activated:Fire(); Mock.frames(20)
    assert(markerFor(custom) and markerFor(handle))
    Mock.findText('VP Bỏ tất cả').Activated:Fire(); Mock.frames(20)
    assert(markerFor(custom) and not markerFor(handle))
    clear(); assert(query.Text=='' and #folder():GetChildren()==0)
end)
test('all six category marker colors render together without enabling Sally alerts',function()
    local alertBody=gui:FindFirstChild('EntityAlerts'):FindFirstChild('CombinedAlert'):FindFirstChild('AlertEntities')
    local before=alertBody.Text
    Mock.node('Part','SallysToy',workspace,18)
    Mock.findText('VP Chọn tất cả').Activated:Fire(); Mock.frames(30)
    markerColor(lighter,170,100,255); markerColor(bandage,255,155,55); markerColor(shears,180,245,85)
    markerColor(crucifix,255,105,180); markerColor(key,65,210,95); markerColor(briefcase,255,220,70)
    assert(not alertBody.Text:find('Sally',1,true) and #Mock.markers()==entityCount)
    assert(alertBody.Text==before)
end)
test('an item-only rendering failure pauses items without disabling entity ESP or alerts',function()
    local saved=Color3.fromRGB
    Color3.fromRGB=function(r,g,b)
        if r==170 and g==100 and b==255 then error('injected item color failure') end
        return saved(r,g,b)
    end
    Mock.run.Heartbeat:Fire(0.1)
    Color3.fromRGB=saved
    assert(Mock.lastWarning and Mock.lastWarning:find('[ItemTracker]',1,true))
    Mock.lastWarning=nil
    Mock.findText('Vật phẩm: TẮT'); Mock.findText('Định vị: BẬT')
    assert(#Mock.markers()==entityCount)
    assert(gui:FindFirstChild('EntityAlerts').Visible)
    Mock.findText('Vật phẩm: TẮT').Activated:Fire(); Mock.frames(30)
    assert(markerFor(lighter))
end)
test('expanding all groups keeps every group inside item card and extends the page canvas',function()
    for _,id in ipairs({'lights','healing','tools','magic','quest','misc'}) do
        local g=group(id)
        if not g:FindFirstChild('GroupItems').Visible then g:FindFirstChild('ExpandGroup').Activated:Fire() end
        assert(g.Position.Y.Offset+g.Size.Y.Offset<=itemPanel.Size.Y.Offset)
    end
    Mock.frames(3)
    assert(page.CanvasSize.Y.Offset>=itemPanel.Position.Y.Offset+itemPanel.Size.Y.Offset*itemPanel:FindFirstChildWhichIsA('UIScale').Scale)
end)
Mock.oldItemPanel=itemPanel
Mock.oldItemFolder=folder()
local previousReload=testReloaded
function testReloaded()
    test('reload destroys old item UI/effects and starts the new item module disabled',function()
        assert(Mock.oldItemPanel._destroyed and Mock.oldItemFolder._destroyed)
        assert(#folder():GetChildren()==0)
        Mock.findText('Vật phẩm: TẮT')
        assert(Mock.run.Heartbeat:count()==1 and workspace.DescendantAdded:count()==1)
    end)
    previousReload()
    test('Dừng & thoát removes item effects as well as entity effects',function()
        assert(not workspace:FindFirstChild('ItemTrackerLocalEffects'))
    end)
end
local previousExternal=testExternalDestroy
function testExternalDestroy()
    previousExternal()
    test('external GUI destruction also removes the independent item module',function()
        assert(not workspace:FindFirstChild('ItemTrackerLocalEffects'))
    end)
    print(passed..' item GUI integration tests passed')
end
