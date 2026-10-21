local count=0
local function test(name,fn) fn(); count=count+1; print('PASS ITEMS '..name) end
local function eq(a,b) assert(a==b,tostring(a)..' ~= '..tostring(b)) end
local root,players,items,markers,deps
local function setup()
    root=Mock.node('Workspace','Workspace',nil)
    players={list={}}; function players:GetPlayers() return self.list end
    markers={}
    deps={root=root,players=players,getOrigin=function() return Vector3.new(0,0,0) end,now=function() return 0 end,
        createMarker=function(hit) local m={hit=hit}; markers[#markers+1]=m; return m end,
        removeMarker=function(m) m.removed=true end,
        updateMarker=function(m,hit,state,visible) m.hit,m.visible=hit,visible; m.rgb=items:colorFor(hit.inst) end}
    items=createItemTracker(deps)
end
local function complete()
    local n=0
    while items.engine.stack do items.engine:scanSlice(); n=n+1; assert(n<1000) end
    while items.engine.markerPending do items.engine:refreshMarkers() end
end
local expected={
    lights='Lighter|Candle|Moonlight Candle|Flashlight|Bulklight|Straplight|Glowstick|Flare|Laser Pointer|Shakelight',
    healing='Bandage|Bandage Pack|Vitamins|Starlight Vial|Starlight Bottle|Starlight Jug|Moonlight Float|Gween Soda|Pack of Gween Soda|Smoothie|Pizza|Bread|Cheese|Donut|Peach Cobbler|Water Cup|Honey Pot',
    tools='Lockpick|Skeleton Key|Battery|Battery Pack|Shears|Alarm Clock|Scanner|Scanner Module|Compass|Multitool',
    magic='Crucifix|Lotus Petal|The World Lotus|Rift Jar|Glitch Fragment|Pocket Mirror|Holy Egg Grenade|Sallys Toy',
    quest='Key|Hotel Key|Backdoor Key|Electrical Room Key|Iron Key|Garage Key|Book|Paper|Breaker Pole|Fuse|Waiting Ticket|Storage Box|Salvage Scrap|Lotus Petal|Water Cup',
    misc='Salvage Scrap|Storage Box|Briefcase|Lunchbox|Fih Flakes|Ceramic Stem|Paper Plane|Mugg|Tophat|Coin Roll|Tip Jar',
}
setup()
test('six catalogs contain every requested item, deduplicating Electrical Room Key in its group',function()
    eq(#items.groups,6); local total=0; local unique={}
    for _,g in ipairs(items.groups) do
        eq(table.concat(g.items,'|'),expected[g.id]); total=total+#g.items
        for _,name in ipairs(g.items) do unique[name]=true end
    end
    eq(total,71); local n=0; for _ in pairs(unique) do n=n+1 end; eq(n,67)
end)
test('group colors match purple orange light-green pink green yellow',function()
    local colors={{170,100,255},{255,155,55},{180,245,85},{255,105,180},{65,210,95},{255,220,70}}
    for i,g in ipairs(items.groups) do for c=1,3 do eq(g.rgb[c],colors[i][c]) end end
end)
test('all item features start off and never enable entity alerts',function()
    eq(items.engine.enabled,false); eq(items.engine.alerts.enabled,false)
    for _,g in ipairs(items.groups) do eq(g.enabled,false); eq(next(g.selected),nil) end
end)
test('all 71 group entries and generated exact aliases are searchable',function()
    setup(); items.engine.maxItems=200
    for _,g in ipairs(items.groups) do
        for _,name in ipairs(g.items) do Mock.node('Part',name,root,10) end
    end
    items:setAll(true); complete(); eq(#items.engine.list,71)
    for _,preset in ipairs(items.engine.presets) do
        for _,alias in ipairs(preset.aliases) do
            assert(items.engine:matches(Mock.node('Part',alias,root,5)),alias)
        end
    end
end)
test('individual item selection does not select siblings',function()
    setup(); Mock.node('Part','Lighter',root,1); Mock.node('Part','Candle',root,2)
    items:setItem('lights','Lighter',true); complete(); eq(#items.engine.list,1)
    eq(items.engine.list[1].inst.Name,'Lighter'); eq(items.byId.lights.enabled,true)
    eq(items.byId.lights.selected.Candle,nil)
end)
test('group disable preserves selection and does not disable another group',function()
    Mock.node('Part','Bandage',root,3); items:setItem('healing','Bandage',true); complete()
    items:setGroupEnabled('lights',false); complete(); eq(#items.engine.list,1)
    eq(items.engine.list[1].inst.Name,'Bandage'); eq(items.byId.lights.selected.Lighter,true)
    items:setGroupEnabled('lights',true); complete(); eq(#items.engine.list,2)
end)
test('select and clear all of one group only affect that group',function()
    items:selectGroup('lights',true); complete(); eq(#items.engine.list,3)
    eq(items.byId.lights.selected.Candle,true)
    items:selectGroup('lights',false); complete(); eq(#items.engine.list,1)
    eq(items.byId.healing.selected.Bandage,true)
end)
test('shared names use OR selection and stable first-active-group color',function()
    setup(); local water=Mock.node('Part','Water Cup',root,1)
    items:setItem('healing','Water Cup',true); items:setItem('quest','Water Cup',true); complete()
    eq(#items.engine.list,1); eq(items:colorFor(water),items.byId.healing.rgb)
    items:setGroupEnabled('healing',false); complete()
    eq(#items.engine.list,1); eq(items:colorFor(water),items.byId.quest.rgb)
    items:selectGroup('quest',false); complete(); eq(#items.engine.list,0)
end)
test('item master toggle pauses and restores selected groups',function()
    setup(); Mock.node('Part','Lockpick',root,1); items:setItem('tools','Lockpick',true); complete()
    items:setEnabled(false); eq(next(items.engine.items),nil); eq(items.byId.tools.selected.Lockpick,true)
    items:setEnabled(true); complete(); eq(#items.engine.list,1)
end)
test('new item spawns use the fast event path',function()
    setup(); items:setItem('lights','Glowstick',true); complete()
    local target=Mock.node('Part','Glowstick',root,1)
    items.engine:notifyAdded(target); items.engine:step(1/60)
    eq(items.engine.list[1].inst,target)
end)
test('Tool items use Handle and do not duplicate an identically named child',function()
    setup(); local tool=Mock.node('Tool','Flashlight',root)
    local handle=Mock.node('Part','Handle',tool,3)
    Mock.node('Part','Flashlight',tool,4)
    items:setItem('lights','Flashlight',true); complete()
    eq(#items.engine.list,1); eq(items.engine.list[1].inst,tool); eq(items.engine.list[1].part,handle)
end)
test('generic item Key does not match Monkey or unrelated key names',function()
    setup(); Mock.node('Part','Monkey',root,1); Mock.node('Part','Hotel Key',root,1); Mock.node('Part','Key',root,1)
    items:setItem('quest','Key',true); complete(); eq(#items.engine.list,1); eq(items.engine.list[1].inst.Name,'Key')
end)
test('manual item query and selected catalog can coexist',function()
    setup(); Mock.node('Part','CustomGem',root,1); Mock.node('Part','Bandage',root,2)
    items:setItem('healing','Bandage',true); items:setQuery('customgem'); complete(); eq(#items.engine.list,2)
    items:setAll(false); complete(); eq(#items.engine.list,1); eq(items.engine.list[1].inst.Name,'CustomGem')
end)
test('item distance limit and per-instance visibility remain independent',function()
    setup(); local a=Mock.node('Part','Crucifix',root,1); local b=Mock.node('Part','Crucifix',root,10)
    items:setItem('magic','Crucifix',true); complete(); items.engine:setObjectEnabled(a,false)
    eq(items.engine.items[a].visible,false); eq(items.engine.items[b].visible,true)
    items.engine:setDistance(5); complete(); eq(#items.engine.list,1)
    eq(items.engine.items[a].visible,false)
end)
test('item selection does not mutate entity presets, tracking or alerts',function()
    setup(); local entity=createTracker(deps); entity:setPreset('Rush',true); entity:setEnabled(true)
    local rush=Mock.node('Part','Rush',root,1); entity:notifyAlert(rush); entity:step(0.01)
    items:setAll(true); items:setEnabled(false); items:clear()
    eq(entity.selectedPresets.Rush,true); eq(entity.enabled,true); eq(#entity.alerts.active,1)
    eq(items.engine.alerts.enabled,false)
    eq(items.engine:notifyAlert(rush),false)
end)
test('player-held items are skipped with the same safety policy as object tracker',function()
    setup(); local char=Mock.node('Model','Character',root)
    Mock.node('Part','Lighter',char,1); players.list={{Character=char}}
    items:setItem('lights','Lighter',true); complete(); eq(#items.engine.list,0)
end)
test('Sallys Toy is an item and does not re-enable Sally alerts',function()
    setup(); local toy=Mock.node('Part','SallysToy',root,1)
    items:setItem('magic','Sallys Toy',true); complete(); eq(items.engine.list[1].inst,toy)
    local entity=createTracker(deps); eq(entity:notifyAlert(toy),false)
    eq(entity:notifyAlert(Mock.node('Part','Sally',root,2)),false)
end)
test('invalid group/item operations are rejected without changing selection',function()
    setup(); eq(items:setItem('missing','Lighter',true),false)
    eq(items:setItem('lights','Rush',true),false); eq(items:setGroupEnabled('missing',true),false)
    eq(items:selectGroup('missing',true),false); eq(items.engine.enabled,false)
end)
test('clear and destruction remove item state without touching another engine',function()
    setup(); Mock.node('Part','Lighter',root,1); items:setItem('lights','Lighter',true); complete()
    items:clear(); eq(items.query,''); eq(next(items.engine.items),nil)
    for _,g in ipairs(items.groups) do eq(next(g.selected),nil); eq(g.enabled,false) end
    items:destroy(); items:destroy(); eq(items.engine.destroyed,true)
    eq(items:setItem('lights','Lighter',true),false); eq(items:setAll(true),false)
end)
print(count..' item core tests passed')
