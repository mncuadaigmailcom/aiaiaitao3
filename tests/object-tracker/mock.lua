-- Minimal test doubles; intentionally no HTTP/executor/server APIs.
local function signal()
    local s = {connections = {}}
    function s:Connect(fn)
        local c = {Connected = true, fn = fn}
        function c:Disconnect() self.Connected = false end
        self.connections[#self.connections + 1] = c
        return c
    end
    function s:Fire(...)
        local copy = {}
        for i, c in ipairs(self.connections) do copy[i] = c end
        for _, c in ipairs(copy) do if c.Connected then c.fn(...) end end
    end
    function s:count()
        local n = 0
        for _, c in ipairs(self.connections) do if c.Connected then n = n + 1 end end
        return n
    end
    return s
end
Mock = {instances = {}, signal = signal}
local vectorMeta = {}
vectorMeta.__index = function(v, k)
    if k == 'Magnitude' then return math.sqrt(v.X*v.X + v.Y*v.Y + v.Z*v.Z) end
end
vectorMeta.__add = function(a,b) return Vector3.new(a.X+b.X,a.Y+b.Y,a.Z+b.Z) end
vectorMeta.__sub = function(a,b) return Vector3.new(a.X-b.X,a.Y-b.Y,a.Z-b.Z) end
Vector3 = {new = function(x,y,z) return setmetatable({X=x,Y=y,Z=z},vectorMeta) end}
Vector2 = {new = function(x,y) return Vector3.new(x,y,0) end}
UDim = {new = function(s,o) return {Scale=s,Offset=o} end}
UDim2 = {new = function(xs,xo,ys,yo) return {X=UDim.new(xs,xo),Y=UDim.new(ys,yo)} end}
UDim2.fromOffset = function(x,y) return UDim2.new(0,x,0,y) end
UDim2.fromScale = function(x,y) return UDim2.new(x,0,y,0) end
ColorSequence = {new = function(first,last) return {first=first,last=last} end}
Color3 = {fromRGB = function(r,g,b) return {R=r/255,G=g/255,B=b/255} end}
Enum = setmetatable({}, {__index = function(t,k)
    local group = setmetatable({}, {__index = function(g,v) rawset(g,v,k..'.'..v); return g[v] end})
    rawset(t,k,group); return group
end})
local methods = {}
local signals = {DescendantAdded=true,Destroying=true, Activated=true, FocusLost=true, InputBegan=true, InputChanged=true, InputEnded=true, Event=true}
function methods:IsA(class)
    return self.ClassName == class or class == 'Instance' or (class == 'BasePart' and (self.ClassName == 'Part' or self.ClassName == 'MeshPart'))
end
function methods:GetChildren()
    local out = {}
    for _, item in ipairs(self._children) do out[#out+1] = item end
    return out
end
function methods:IsDescendantOf(root)
    local cur = self.Parent
    while cur do if cur == root then return true end; cur = cur.Parent end
    return false
end
function methods:FindFirstChild(name)
    for _, child in ipairs(self:GetChildren()) do if child.Name == name then return child end end
end
function methods:WaitForChild(name) return assert(self:FindFirstChild(name), name..' missing') end
function methods:FindFirstChildWhichIsA(class, recursive)
    for _, child in ipairs(self:GetChildren()) do if child:IsA(class) then return child end end
    if recursive then
        for _, child in ipairs(self:GetChildren()) do
            local result = child:FindFirstChildWhichIsA(class,true)
            if result then return result end
        end
    end
end
function methods:Destroy()
    if self._destroying or self._destroyed then return end
    self._destroying = true
    self.Destroying:Fire()
    for _, child in ipairs(self:GetChildren()) do child:Destroy() end
    self.Parent, self._destroyed = nil, true
    -- Roblox disconnects signals on a destroyed Instance.
    for _, value in pairs(self._signals) do
        for _, c in ipairs(value.connections) do c:Disconnect() end
    end
    self._destroying = false
end
function methods:Fire(...) self.Event:Fire(...) end
local mt = {
    __index = function(t,k)
        if methods[k] then return methods[k] end
        if signals[k] then
            if not t._signals[k] then t._signals[k] = signal() end
            return t._signals[k]
        end
        return t._props[k]
    end,
    __newindex = function(t,k,v)
        local old = t._props[k]
        t._props[k] = v
        if k == 'Parent' and old ~= v then
            if old then
                for i,child in ipairs(old._children) do if child==t then table.remove(old._children,i); break end end
            end
            if v then v._children[#v._children+1] = t end
        end
        if k == 'Parent' and v and old ~= v then
            local previous = {}
            local node = old
            while node do previous[node] = true; node = node.Parent end
            node = v
            while node do
                local event = node._signals.DescendantAdded
                if not previous[node] and event and event:count() > 0 then
                    local function added(inst)
                        event:Fire(inst)
                        for _, child in ipairs(inst:GetChildren()) do added(child) end
                    end
                    added(t)
                end
                node = node.Parent
            end
        end
    end,
}
Instance = {new = function(class)
    local obj = setmetatable({_props = {ClassName=class,Name=class}, _signals = {}, _children = {}},mt)
    if obj:IsA('BasePart') then obj.Position=Vector3.new(0,0,0); obj.Size=Vector3.new(2,2,2) end
    Mock.instances[#Mock.instances+1] = obj
    return obj
end}
function Mock.node(class,name,parent,x)
    local n = Instance.new(class); n.Name=name; n.Parent=parent
    if x then n.Position=Vector3.new(x,0,0) end
    return n
end
workspace = Mock.node('Workspace','Workspace',nil)
workspace.CurrentCamera = {CFrame={Position=Vector3.new(0,0,0)},ViewportSize=Vector2.new(1280,720)}
local playerGui = Mock.node('PlayerGui','PlayerGui',nil)
local player = Mock.node('Player','LocalPlayer',nil)
playerGui.Parent = player
Mock.players = {LocalPlayer=player, list={player}}
function Mock.players:GetPlayers() return self.list end
Mock.lighting = Mock.node('Lighting','Lighting',nil)
Mock.lighting.Ambient=Color3.fromRGB(15,15,20)
Mock.lighting.OutdoorAmbient=Color3.fromRGB(25,25,30)
Mock.lighting.Brightness=0.5; Mock.lighting.ExposureCompensation=-0.5
Mock.lighting.GlobalShadows=true; Mock.lighting.EnvironmentDiffuseScale=0.1
Mock.lighting.EnvironmentSpecularScale=1
Mock.lighting.ClockTime=0; Mock.lighting.FogEnd=400
Mock.run = {Heartbeat=signal()}
Mock.input = {InputBegan=signal(),InputChanged=signal(),InputEnded=signal()}
game = {GetService = function(_,name)
    return assert(({Players=Mock.players,RunService=Mock.run,UserInputService=Mock.input,Lighting=Mock.lighting})[name], 'unexpected service '..name)
end}
warn = function(text) Mock.lastWarning = text end
function Mock.findText(text)
    for _, obj in ipairs(Mock.instances) do
        if not obj._destroyed and obj.Text == text and obj:IsDescendantOf(playerGui) then return obj end
    end
    error('UI text missing: '..text)
end
function Mock.gui() return playerGui:FindFirstChild('StandaloneObjectTracker') end
function Mock.frames(n)
    for _=1,(n or 20) do Mock.run.Heartbeat:Fire(0.1) end
    assert(not Mock.lastWarning, Mock.lastWarning)
end
function Mock.effects()
    local n=0
    for _, child in ipairs(workspace:GetChildren()) do if child.Name == 'ObjectTrackerLocalEffects' then n=n+1 end end
    return n
end
function Mock.markers()
    for _, child in ipairs(workspace:GetChildren()) do
        if child.Name == 'ObjectTrackerLocalEffects' then return child:GetChildren() end
    end
    return {}
end
