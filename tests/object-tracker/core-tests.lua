local passed = 0
local function test(name, fn)
    fn(); passed = passed + 1; print('PASS '..name)
end
local function eq(a,b) assert(a == b, tostring(a)..' ~= '..tostring(b)) end
local root, players, origin, tracker, markers
local function setup()
    root = Mock.node('Workspace','Workspace',nil)
    players = {list={}}
    function players:GetPlayers() return self.list end
    origin, markers = Vector3.new(0,0,0), {}
    tracker = createTracker({root=root,players=players,getOrigin=function() return origin end,now=os.clock,
        createMarker=function(hit)
            local marker={hit=hit}; markers[#markers+1]=marker; return marker
        end,
        ignore=function(inst) return inst.Name == "OwnEffects" end,
        removeMarker=function(marker) marker.removed=true end,
        updateMarker=function(marker,hit,state,visible) marker.hit=hit; marker.visible=visible end,
    })
end
local function scan(query)
    tracker:setQuery(query); tracker:setEnabled(true)
    local guard=0
    while tracker.stack do
        tracker:scanSlice(); guard=guard+1; assert(guard<1000,'scan never completed')
    end
end
setup()
test('Vietnamese precomposed / uppercase normalization',function() eq(tracker.normalize('  CÂY ĐỎ  '),'cay do') end)
test('decomposed accents',function() eq(tracker.normalize('Ca'..utf8.char(0x302)..'y'),'cay') end)
test('malformed UTF-8 does not crash',function() eq(type(tracker.normalize('\255')),'string') end)
test('split and deduplicate multiple literal queries',function() eq(#tracker.parse('Cây;cay, đá\nĐÁ'),2) end)
test('normalize game/slash path',function() eq(tracker.parse('game/Workspace/Map/Chest')[1].value,'workspace.map.chest') end)
test('name substring match ignores accents',function()
    Mock.node('Part','Cây Đỏ',root,10); scan('cay'); eq(#tracker.list,1)
end)
test('query is literal, not Lua pattern',function()
    Mock.node('Part','Loot[1]',root,4); scan('[1]'); eq(#tracker.list,1)
end)
test('query replacement clears old effects',function()
    local old=markers[#markers]; tracker:setQuery('missing'); assert(old.removed); eq(#tracker.list,0)
end)
test('path-only search can enable and is exact',function()
    local map=Mock.node('Folder','Map',root)
    Mock.node('Part','Chest',map,5); Mock.node('Part','Chest',root,2)
    scan('game.Workspace.Map.Chest'); eq(#tracker.list,1); eq(tracker.list[1].part.Parent,map)
end)
test('missing path does not fall back to broad name match',function() scan('Workspace.Missing.Chest'); eq(#tracker.list,0) end)
test('path works when its target appears after query set',function()
    scan('Workspace.Later.Item'); eq(#tracker.list,0)
    local later=Mock.node('Folder','Later',root); Mock.node('Part','Item',later,3)
    tracker:beginScan(); while tracker.stack do tracker:scanSlice() end
    eq(#tracker.list,1)
end)
test('matching Model groups child parts',function()
    local model=Mock.node('Model','Tree',root); Mock.node('Part','TreeTrunk',model,10)
    scan('tree'); eq(#tracker.list,1); eq(tracker.list[1].inst,model)
end)
test('matching empty containers are skipped',function()
    Mock.node('Model','Empty',root); Mock.node('Folder','Empty',root)
    scan('empty'); eq(#tracker.list,0)
end)
test('nested Folder gets representative part',function()
    local f=Mock.node('Folder','Resource',root); local inner=Mock.node('Folder','Inner',f)
    local p=Mock.node('MeshPart','Rock',inner,8)
    scan('resource'); eq(tracker.list[1].part,p)
end)
test('skip player character and all descendants',function()
    local char=Mock.node('Model','Player',root); Mock.node('Part','Loot',char,1)
    players.list={{Character=char}}
    scan('loot'); eq(#tracker.list,1) -- existing Loot[1] outside character
    tracker.skipPlayers=false; scan('loot'); eq(#tracker.list,2) -- Loot[1] plus character Loot
end)
test('character replacement is discovered',function()
    local char=Mock.node('Model','Player2',root); Mock.node('Part','RespawnLoot',char,1)
    players.list[1].Character=char; tracker.skipPlayers=true
    scan('respawnloot'); eq(#tracker.list,0)
end)
test('nearest N retained, found counts all matches',function()
    setup(); tracker.maxItems=3
    for i=1,20 do Mock.node('Part','Coin',root,i) end
    scan('coin'); eq(#tracker.list,3); eq(tracker.found,20); eq(tracker.list[1].distance,1); eq(tracker.list[3].distance,3)
end)
test('distance limit includes boundary and validates input',function()
    assert(tracker:setDistance('2')); scan('coin'); eq(#tracker.list,2)
    for _, value in ipairs({'bad',-1,math.huge,0/0}) do assert(not tracker:setDistance(value)) end
    eq(tracker.maxDistance,2)
end)
test('no origin is not mistaken for distance zero',function()
    origin=nil; scan('coin'); eq(#tracker.list,0)
    tracker:setDistance(0); scan('coin'); eq(#tracker.list,3); eq(tracker.list[1].distance,nil)
end)
test('scan budget slices wide trees',function()
    setup(); tracker.scanBudget=2
    for i=1,40 do Mock.node('Part','Gem',root,i) end
    tracker:setQuery('gem'); tracker:setEnabled(true); tracker:scanSlice()
    assert(tracker.stack); eq(#tracker.list,0)
    local n=0; while tracker.stack do tracker:scanSlice(); n=n+1; assert(n<100) end
    eq(#tracker.list,40)
end)
test('deleted object during partial scan is ignored',function()
    tracker:setQuery('gem'); tracker:beginScan(); tracker:scanSlice()
    root:GetChildren()[10]:Destroy()
    while tracker.stack do tracker:scanSlice() end
    eq(#tracker.list,39)
end)
test('changing query during partial scan cannot publish stale results',function()
    tracker:beginScan(); tracker:scanSlice(); tracker:setQuery('missing')
    while tracker.stack do tracker:scanSlice() end
    eq(#tracker.list,0); eq(next(tracker.items),nil)
end)
test('refresh removes targets moved outside Workspace',function()
    scan('gem'); local hit=tracker.list[1]; local old=tracker.items[hit.inst]
    hit.inst.Parent=nil; tracker:refreshMarkers(); assert(old.removed); eq(#tracker.list,38)
end)
test('deleted model PrimaryPart falls back to another part',function()
    setup(); local model=Mock.node('Model','Chest',root)
    local first=Mock.node('Part','First',model,1); local second=Mock.node('Part','Second',model,2)
    model.PrimaryPart=first; scan('chest'); first:Destroy(); tracker:refreshMarkers()
    eq(tracker.list[1].part,second)
end)
test('moving objects update label distance and visibility',function()
    tracker:setDistance(10); scan('chest')
    local hit=tracker.list[1]; hit.part.Position=Vector3.new(20,0,0); tracker:refreshMarkers()
    eq(hit.distance,20); eq(tracker.items[hit.inst].visible,false)
end)
test('disable destroys every marker and cancels scan',function()
    tracker:setEnabled(false); eq(next(tracker.items),nil); eq(tracker.stack,nil)
    tracker:step(10); eq(#tracker.list,0)
end)
test('blank query disables tracking',function()
    tracker:setQuery('  ,; '); eq(tracker:setEnabled(true),false)
end)
test('step automatically rescans newly spawned targets',function()
    setup(); scan('drop'); Mock.node('Part','Drop',root,7); tracker:step(1.1); eq(#tracker.list,1)
end)
test('renaming object removes it on next scan',function()
    tracker.list[1].inst.Name='Other'; tracker:step(1.1); eq(#tracker.list,0)
end)
test('ignore own effect subtree',function()
    setup(); local ignored=Mock.node('Folder','OwnEffects',root); Mock.node('Part','Drop',ignored,1)
    scan('drop'); eq(#tracker.list,0)
end)
test('1000 objects: incremental scan keeps only nearest 50 markers',function()
    setup(); tracker.scanBudget=25
    for i=1000,1,-1 do Mock.node('Part','Resource',root,i) end
    scan('resource'); eq(#tracker.list,50); eq(tracker.found,1000)
    eq(tracker.list[1].distance,1); eq(tracker.list[50].distance,50)
    eq(#markers,50)
end)
test('invalid frame deltas do not advance state',function()
    tracker:step(-1); tracker:step(0/0); tracker:step(math.huge)
    eq(#tracker.list,50)
end)
test('preset catalog contains all 23 requested names',function()
    setup()
    local names={'Rush','Ambush','Eyes','Screech','Figure','Seek','Dupe','Halt','Hide','Timothy',
        'Sally (Window)','Dread','Jeff','El Goblino','Bob','Jack','Moonlight','Weirdo','Glitch','Void',
        'Red Barrier','Snare','Fallen Chandeliers'}
    eq(#tracker.presets,#names)
    for i,name in ipairs(names) do eq(tracker.presets[i].name,name) end
end)
test('every configured alias can be located independently',function()
    for _, preset in ipairs(tracker.presets) do
        for _, alias in ipairs(preset.aliases) do
            setup(); Mock.node('Part',alias,root,10)
            assert(tracker:setPreset(preset.name,true))
            assert(tracker:setEnabled(true))
            while tracker.stack do tracker:scanSlice() end
            eq(#tracker.list,1)
        end
    end
end)
test('presets use exact names, not accidental substrings',function()
    setup(); Mock.node('Part','HideSpot',root,1); Mock.node('Part','Bobblehead',root,2)
    Mock.node('Part','RushMovingSound',root,3); Mock.node('Part','RushMoving',root,4)
    tracker:setPreset('Hide',true); tracker:setPreset('Bob',true); tracker:setPreset('Rush',true)
    tracker:setEnabled(true); while tracker.stack do tracker:scanSlice() end
    eq(#tracker.list,1); eq(tracker.list[1].inst.Name,'RushMoving')
end)
test('independent preset switches keep other presets selected',function()
    setup(); Mock.node('Part','RushMoving',root,1); Mock.node('Part','AmbushMoving',root,2)
    tracker:setPreset('Rush',true); tracker:setPreset('Ambush',true)
    tracker:setEnabled(true); while tracker.stack do tracker:scanSlice() end
    eq(#tracker.list,2)
    tracker:setPreset('Rush',false); while tracker.stack do tracker:scanSlice() end
    eq(#tracker.list,1); eq(tracker.list[1].inst.Name,'AmbushMoving')
end)
test('empty manual query plus last preset off disables tracking',function()
    tracker:setPreset('Ambush',false); eq(tracker.enabled,false); eq(#tracker.list,0)
end)
test('preset batch off preserves arbitrary manual filters',function()
    setup(); Mock.node('Part','Chest',root,1); Mock.node('Part','Rush',root,2)
    tracker:setQuery('chest'); tracker:setAllPresets(true); tracker:setEnabled(true)
    while tracker.stack do tracker:scanSlice() end
    eq(#tracker.list,2)
    tracker:setAllPresets(false); while tracker.stack do tracker:scanSlice() end
    eq(#tracker.list,1); eq(tracker.list[1].inst.Name,'Chest')
end)
test('per-object switch only hides selected instance, including same-name objects',function()
    setup(); Mock.node('Part','Coin',root,1); Mock.node('Part','Coin',root,2); scan('coin')
    local one,two=tracker.list[1].inst,tracker.list[2].inst
    tracker:setObjectEnabled(one,false)
    eq(tracker.items[one].visible,false); eq(tracker.items[two].visible,true)
    tracker:beginScan(); while tracker.stack do tracker:scanSlice() end
    eq(tracker.items[one].visible,false)
    tracker:setObjectEnabled(one,true); eq(tracker.items[one].visible,true)
end)
test('unsupported preset names do not change state',function()
    eq(tracker:setPreset('Unknown',true),false); eq(next(tracker.selectedPresets),nil)
end)
test('late spawning selected preset is found by auto rescan',function()
    setup(); tracker:setPreset('Rush',true); tracker:setEnabled(true)
    while tracker.stack do tracker:scanSlice() end
    eq(#tracker.list,0); Mock.node('Model','RushMoving',root)
    local model=root:FindFirstChild('RushMoving'); Mock.node('Part','Root',model,4)
    tracker:step(1.1); eq(#tracker.list,1); eq(tracker.list[1].inst,model)
end)
test('destroy is idempotent and cannot be restarted',function()
    tracker:destroy(); tracker:destroy(); eq(tracker:setEnabled(true),false); eq(tracker:beginScan(),false)
    eq(tracker:setQuery('drop'),false)
    eq(tracker:setPreset('Rush',true),false); eq(tracker:setAllPresets(true),false)
    eq(tracker:setObjectEnabled(root,false),false)
end)
print(string.format('%d core regression tests passed',passed))
