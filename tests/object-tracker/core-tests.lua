local passed = 0
local function test(name, fn)
    fn(); passed = passed + 1; print('PASS '..name)
end
local function eq(a,b) assert(a == b, tostring(a)..' ~= '..tostring(b)) end
local root, players, origin, tracker, markers, clock, alertOrigin
local function setup()
    root = Mock.node('Workspace','Workspace',nil)
    clock = function() return 0 end
    players = {list={},calls=0}
    function players:GetPlayers() self.calls=self.calls+1; return self.list end
    origin, markers = Vector3.new(0,0,0), {}
    alertOrigin = Vector3.new(0,0,0)
    tracker = createTracker({root=root,players=players,getOrigin=function() return origin end,getAlertOrigin=function() return alertOrigin end,now=function() return clock() end,
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
    while tracker.markerPending do tracker:refreshMarkers() end
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
    assert(tracker.stack); eq(#tracker.list,1) -- Progressive result before sweep completion
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
    local active=0
    for _, marker in ipairs(markers) do if not marker.removed then active=active+1 end end
    eq(active,50) -- Progressive nearest replacements may create more than 50 over time.
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
test('progressive result is visible before a wide sweep finishes',function()
    setup(); tracker.scanBudget=2
    Mock.node('Part','RushMoving',root,5)
    for i=1,100 do Mock.node('Part','Decoration',root,i) end
    tracker:setPreset('Rush',true); tracker:setEnabled(true); tracker:step(1/60)
    assert(tracker.stack,'fixture must still be scanning')
    eq(#tracker.list,1); assert(tracker.items[tracker.list[1].inst].visible)
end)
test('spawn event bypasses an unfinished background sweep in one simulated frame',function()
    setup(); tracker.scanBudget=1; scan('nothing')
    tracker:setQuery('rapid'); tracker:setEnabled(true); tracker:step(1/60)
    for i=1,300 do Mock.node('Part','Decoration',root,i) end
    local target=Mock.node('Part','Rapid',root,4)
    assert(tracker:notifyAdded(target)); tracker:step(1/60)
    eq(tracker.list[1].inst,target); assert(tracker.items[target].visible)
end)
test('part arriving after its empty Model promotes the matching Model',function()
    setup(); tracker.scanBudget=1; scan('rush')
    local model=Mock.node('Model','RushMoving',root)
    tracker:notifyAdded(model); tracker:step(1/60); eq(#tracker.list,0)
    local part=Mock.node('Part','Root',model,3)
    tracker:notifyAdded(part); tracker:step(1/60)
    eq(#tracker.list,1); eq(tracker.list[1].inst,model)
end)
test('duplicate spawn events never inflate result count',function()
    setup(); scan('drop'); local target=Mock.node('Part','Drop',root,2)
    tracker:notifyAdded(target); eq(tracker:notifyAdded(target),false)
    tracker:step(1/60); eq(tracker.found,1)
    tracker:notifyAdded(target); tracker:step(1/60); eq(tracker.found,1); eq(#tracker.list,1)
end)
test('event queue is bounded and overflow requests a fallback sweep',function()
    setup(); scan('drop'); tracker.maxPending=2
    for i=1,2 do assert(tracker:notifyAdded(Mock.node('Part','Drop',root,i))) end
    eq(tracker:notifyAdded(Mock.node('Part','Drop',root,3)),false)
    eq(tracker.eventTail-tracker.eventHead+1,2)
    assert(tracker.scanElapsed>=tracker.refreshEvery)
end)
test('event item quota spreads a burst across frames',function()
    setup(); scan('drop'); tracker.eventBudget=1
    for i=1,3 do tracker:notifyAdded(Mock.node('Part','Drop',root,i)) end
    tracker:step(1/60); eq(#tracker.list,1)
    tracker:step(1/60); eq(#tracker.list,2)
    tracker:step(1/60); eq(#tracker.list,3)
    eq(tracker.eventTail,0); eq(next(tracker.queued),nil)
end)
test('event time budget yields without draining the whole burst',function()
    setup(); scan('drop')
    for i=1,3 do tracker:notifyAdded(Mock.node('Part','Drop',root,i)) end
    local ticks=0; clock=function() ticks=ticks+1; return ticks*0.002 end
    tracker:step(1/60); eq(#tracker.list,1)
    assert(tracker.eventHead<=tracker.eventTail)
end)
test('marker creation is capped per heartbeat, then drains without another sweep',function()
    setup(); tracker.scanBudget=300
    for i=1,100 do Mock.node('Part','Coin',root,i) end
    tracker:setQuery('coin'); tracker:setEnabled(true); tracker:step(1/60)
    eq(#markers,tracker.markerBudget); assert(tracker.markerPending)
    local frames=1
    while tracker.markerPending do
        local before=#markers; tracker:step(1/60)
        assert(#markers-before<=tracker.markerBudget); frames=frames+1; assert(frames<20)
    end
    eq(#tracker.list,50); eq(#markers,50)
end)
test('event hit is not lost when an already-started sweep finishes',function()
    setup(); tracker.scanBudget=1
    local folder=Mock.node('Folder','Map',root)
    tracker:setQuery('drop'); tracker:setEnabled(true)
    tracker:step(1/60); tracker:step(1/60) -- Folder child snapshot has already been visited.
    local target=Mock.node('Part','Drop',folder,3)
    tracker:notifyAdded(target); tracker:step(1/60)
    while tracker.stack do tracker:scanSlice() end
    eq(#tracker.list,1); eq(tracker.list[1].inst,target)
end)
test('disable flushes queued events; deleted pending instances are ignored',function()
    setup(); scan('drop'); local target=Mock.node('Part','Drop',root,3)
    tracker:notifyAdded(target); target:Destroy(); tracker:step(1/60); eq(#tracker.list,0)
    local other=Mock.node('Part','Drop',root,4); tracker:notifyAdded(other)
    tracker:setEnabled(false); tracker:step(1/60)
    eq(tracker.eventTail,0); eq(next(tracker.items),nil); eq(tracker:notifyAdded(other),false)
end)
test('cached character roots avoid GetPlayers per scanned node',function()
    setup(); for i=1,100 do Mock.node('Part','Decoration',root,i) end
    tracker:setQuery('missing'); tracker:setEnabled(true)
    players.calls=0; tracker:scanSlice(); assert(players.calls<=1)
end)
test('cached normalized name invalidates when Name changes',function()
    setup(); tracker:setQuery('tree'); local target=Mock.node('Part','Stone',root,1)
    eq(tracker:matches(target),false); target.Name='TREE'; eq(tracker:matches(target),true)
end)
test('fast events still exclude player characters and effect roots',function()
    setup(); scan('rush')
    local char=Mock.node('Model','Rush',root); Mock.node('Part','Root',char,1)
    players.list={{Character=char}}
    tracker:notifyAdded(char); tracker:step(1/60); eq(#tracker.list,0)
    local own=Mock.node('Folder','OwnEffects',root); eq(tracker:notifyAdded(own),false)
end)
test('alerts whitelist only Rush Ambush Seek Screech Sally, independent of ESP',function()
    setup()
    for _, name in ipairs({'RushMoving','AmbushMoving','SeekRig','Screech','WindowEntity'}) do
        local inst=Mock.node('Part',name,root,10); assert(tracker:notifyAlert(inst))
    end
    for _, name in ipairs({'Eyes','Figure','Dread','Snare','Chest','RushMovingSound'}) do
        eq(tracker:notifyAlert(Mock.node('Part',name,root,10)),false)
    end
    tracker:step(1/60)
    eq(tracker.enabled,false); eq(#tracker.alerts.active,5)
    local names={}
    for _, entry in ipairs(tracker.alerts.active) do names[entry.name]=true; eq(entry.distance,10) end
    for _, name in ipairs({'Rush','Ambush','Seek','Screech','Sally'}) do assert(names[name]) end
end)
test('alert stays beyond five seconds and hides only after the entity disappears',function()
    setup(); local entity=Mock.node('Part','Rush',root,10)
    tracker:notifyAlert(entity); tracker:step(0.01)
    tracker:step(5); eq(#tracker.alerts.active,1)
    tracker:step(60); eq(#tracker.alerts.active,1)
    entity:Destroy(); tracker:step(0.01); eq(#tracker.alerts.active,0)
end)
test('duplicate children do not duplicate a persistent entity entry',function()
    setup(); local entity=Mock.node('Model','AmbushMoving',root)
    Mock.node('Part','Root',entity,9); tracker:notifyAlert(entity); tracker:step(0.01)
    local entry=tracker.alerts.active[1]
    local child=Mock.node('Part','AmbushMoving',entity,2)
    eq(tracker:notifyAlert(child),false); tracker:step(61)
    eq(#tracker.alerts.active,1); eq(tracker.alerts.active[1],entry)
    eq(tracker:notifyAlert(entity),false)
end)
test('two instances of the same kind coexist without replacing each other',function()
    setup(); local seek=Mock.node('Part','Seek',root,10)
    tracker:notifyAlert(seek); tracker:step(0.01)
    local rush=Mock.node('Part','Rush',root,20)
    tracker:notifyAlert(rush); tracker:step(2)
    local newRush=Mock.node('Part','RushMoving',root,30)
    tracker:notifyAlert(newRush); tracker:step(0.01)
    eq(#tracker.alerts.active,3)
    rush:Destroy(); tracker:step(0.01); eq(#tracker.alerts.active,2)
    eq(tracker.alerts.active[1].inst,seek); eq(tracker.alerts.active[2].inst,newRush)
end)
test('multiple entities leave independently and only the last removal empties alerts',function()
    setup(); local entities={}
    for _, name in ipairs({'Rush','Ambush','Screech'}) do
        local inst=Mock.node('Part',name,root,12); entities[#entities+1]=inst; tracker:notifyAlert(inst)
    end
    tracker:step(0.01); tracker:step(30); eq(#tracker.alerts.active,3)
    entities[2]:Destroy(); tracker:step(0.01); eq(#tracker.alerts.active,2)
    eq(tracker.alerts.active[1].name,'Rush'); eq(tracker.alerts.active[2].name,'Screech')
    entities[1]:Destroy(); entities[3]:Destroy(); tracker:step(0.01); eq(#tracker.alerts.active,0)
end)
test('distance follows player head origin and entity movement; nil origin is unknown',function()
    setup(); local inst=Mock.node('Part','Screech',root,10)
    tracker:notifyAlert(inst); tracker:step(0.01); eq(tracker.alerts.active[1].distance,10)
    alertOrigin=Vector3.new(4,0,0); inst.Position=Vector3.new(14,0,0)
    tracker:step(0.05); eq(tracker.alerts.active[1].distance,10)
    alertOrigin=nil; tracker:step(0.05); eq(tracker.alerts.active[1].distance,nil)
end)
test('despawn removes its entry on the next heartbeat without leaving a stale distance',function()
    setup(); local inst=Mock.node('Part','Seek',root,10)
    tracker:notifyAlert(inst); tracker:step(0.01); inst:Destroy(); tracker:step(0.01)
    eq(#tracker.alerts.active,0); eq(tracker.alerts.seen[inst],nil)
end)
test('empty alert Model can be recognized when its part arrives later',function()
    setup(); local entity=Mock.node('Model','Sally',root)
    tracker:notifyAlert(entity); tracker:step(0.01); eq(#tracker.alerts.active,0)
    local child=Mock.node('Part','Root',entity,3); tracker:notifyAlert(child); tracker:step(0.01)
    eq(#tracker.alerts.active,1); eq(tracker.alerts.active[1].name,'Sally')
end)
test('alert toggle clears active and queued alerts, and blocks notifications while off',function()
    setup(); local inst=Mock.node('Part','Rush',root,4); tracker:notifyAlert(inst)
    tracker:setAlertsEnabled(false); tracker:step(1)
    eq(#tracker.alerts.active,0); eq(tracker.alerts.tail,0); eq(tracker:notifyAlert(inst),false)
    tracker:setAlertsEnabled(true); assert(tracker:notifyAlert(inst)); tracker:step(0.01)
    eq(#tracker.alerts.active,1)
end)
test('alert work has a quota and ignores non-whitelisted scenery bursts',function()
    setup(); tracker.alerts.budget=1
    for i=1,100 do eq(tracker:notifyAlert(Mock.node('Part','Decoration',root,i)),false) end
    for _, name in ipairs({'Rush','Seek','Sally'}) do tracker:notifyAlert(Mock.node('Part',name,root,4)) end
    tracker:step(0.01); eq(#tracker.alerts.active,1)
    tracker:step(0.01); eq(#tracker.alerts.active,2)
    tracker:step(0.01); eq(#tracker.alerts.active,3)
end)
test('alert queue cap and character/effect filtering remain effective',function()
    setup(); tracker.alerts.maxPending=1
    assert(tracker:notifyAlert(Mock.node('Part','Rush',root,4)))
    eq(tracker:notifyAlert(Mock.node('Part','Seek',root,4)),false)
    tracker:setAlertsEnabled(false); tracker:setAlertsEnabled(true)
    local char=Mock.node('Model','Seek',root); Mock.node('Part','Head',char,1)
    players.list={{Character=char}}; tracker:notifyAlert(char); tracker:step(0.01)
    eq(#tracker.alerts.active,0)
end)
test('alert character exclusion is independent of the ESP skip-player switch',function()
    setup(); tracker.skipPlayers=false
    local char=Mock.node('Model','Screech',root); Mock.node('Part','Head',char,1)
    players.list={{Character=char}}; tracker:notifyAlert(char); tracker:step(0.01)
    eq(#tracker.alerts.active,0)
end)
test('same instance can re-enter Workspace and alert again after leaving',function()
    setup(); local inst=Mock.node('Part','Rush',root,10)
    tracker:notifyAlert(inst); tracker:step(0.01)
    inst.Parent=nil; tracker:step(0.01); eq(#tracker.alerts.active,0)
    inst.Parent=root; assert(tracker:notifyAlert(inst)); tracker:step(0.01)
    eq(#tracker.alerts.active,1)
end)
test('entity with no remaining part is removed and can alert when a new part arrives',function()
    setup(); local entity=Mock.node('Model','Sally',root)
    local part=Mock.node('Part','Root',entity,3)
    tracker:notifyAlert(entity); tracker:step(0.01); part:Destroy(); tracker:step(0.01)
    eq(#tracker.alerts.active,0)
    local replacement=Mock.node('Part','NewRoot',entity,7)
    assert(tracker:notifyAlert(replacement)); tracker:step(0.01)
    eq(#tracker.alerts.active,1); eq(tracker.alerts.active[1].distance,7)
end)
test('entity stays active when one part is removed but another remains',function()
    setup(); local entity=Mock.node('Model','Seek',root)
    local a=Mock.node('Part','A',entity,3); local b=Mock.node('Part','B',entity,7)
    tracker:notifyAlert(entity); tracker:step(0.01); a:Destroy(); tracker:step(0.01)
    eq(#tracker.alerts.active,1); eq(tracker.alerts.active[1].part,b)
    eq(tracker.alerts.active[1].distance,7)
end)
test('missing player position does not dismiss a still-present entity',function()
    setup(); tracker:notifyAlert(Mock.node('Part','Screech',root,10)); tracker:step(0.01)
    alertOrigin=nil; tracker:step(30)
    eq(#tracker.alerts.active,1); eq(tracker.alerts.active[1].distance,nil)
end)
test('renaming to an unsupported entity removes its alert',function()
    setup(); local entity=Mock.node('Part','Rush',root,10)
    tracker:notifyAlert(entity); tracker:step(0.01)
    entity.Name='Eyes'; tracker:step(0.01); eq(#tracker.alerts.active,0)
end)
test('destroy is idempotent and cannot be restarted',function()
    tracker:destroy(); tracker:destroy(); eq(tracker:setEnabled(true),false); eq(tracker:beginScan(),false)
    eq(tracker:setQuery('drop'),false)
    eq(tracker:setPreset('Rush',true),false); eq(tracker:setAllPresets(true),false)
    eq(tracker:setObjectEnabled(root,false),false)
    eq(#tracker.alerts.active,0); eq(tracker:setAlertsEnabled(true),false)
    eq(tracker:notifyAlert(root),false)
end)
print(string.format('%d core regression tests passed',passed))
