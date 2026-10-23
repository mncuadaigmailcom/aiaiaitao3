
local Players = game:GetService("Players") local TweenService = game:GetService("TweenService")
local RunService = game:GetService("RunService") local UserInputService = game:GetService("UserInputService") local HttpService = game:GetService("HttpService")
local TeleportService = game:GetService("TeleportService")
local player = Players.LocalPlayer local playerGui = player:WaitForChild("PlayerGui") local camera = workspace.CurrentCamera
local targetGui = playerGui pcall(function() if type(gethui) == "function" then local hui = gethui() if hui then targetGui = hui end end end)
do local old = _G.BananaCatHub_MV if old then if old.StopAll then pcall(old.StopAll) end
old._wdToken = nil if type(old._wd) == "thread" then pcall(task.cancel, old._wd) end old._wd = nil end end pcall(function() local oldPerf = _G.BananaCatHub_Perf
if type(oldPerf) == "table" and type(oldPerf.Stop) == "function" then pcall(oldPerf.Stop) end _G.BananaCatHub_Perf = nil
end) if _G.BananaCatHub_Connections then for _, c in ipairs(_G.BananaCatHub_Connections) do
pcall(function() c:Disconnect() end) end end _G.BananaCatHub_Connections = {} pcall(function() local oldUnhook = _G.BananaCatHub_AntiBanUnhook
if type(oldUnhook) == "function" then pcall(oldUnhook) end _G.BananaCatHub_AntiBanUnhook = nil end) pcall(function()
local f = _G.BananaCatHub_Free if type(f) == "table" and f.Stop then pcall(f.Stop) end end) pcall(function() local old = _G.BananaCatHub_SpecCam
if old ~= nil then local cam = workspace.CurrentCamera if cam then if old ~= Enum.CameraType.Scriptable then
pcall(function() cam.CameraType = old end) else pcall(function() cam.CameraType = Enum.CameraType.Custom end) end pcall(function() local char = player and player.Character
local hum = char and char:FindFirstChildOfClass("Humanoid") local root = char and char:FindFirstChild("HumanoidRootPart") if hum then cam.CameraSubject = hum end if root then
cam.CFrame = CFrame.new(root.Position + Vector3.new(0, 3.2, 12), root.Position + Vector3.new(0,1.5,0)) cam.Focus = CFrame.new(root.Position)
end end) end _G.BananaCatHub_SpecCam = nil end pcall(function() RunService:UnbindFromRenderStep("BC_Spec") end) end)
for _, parent in ipairs({targetGui, playerGui, game:GetService("CoreGui")}) do pcall(function() local old = parent:FindFirstChild("BananaCatHub_Crosshair") if old then old:Destroy() end end)
pcall(function() local old = parent:FindFirstChild("BC_FlyHud") if old then old:Destroy() end end)
pcall(function()
local old = parent:FindFirstChild("BC_ObjTrackESP") if old then old:Destroy() end end) pcall(function()
local old = parent:FindFirstChild("BananaCatHub_AnaAimDot") if old then old:Destroy() end end) end
pcall(function() for _, d in ipairs(workspace:GetDescendants()) do local n = d.Name if n == "BC_OT_HL" or n == "BC_OT_BB" or n == "BC_OT_BOX" then
pcall(function() d:Destroy() end) end end end) local function trackConn(conn) local t = _G.BananaCatHub_Connections if #t > 300 then local alive, n = {}, 0
for i = 1, #t do local c = t[i] if c ~= nil and c.Connected ~= false then n = n + 1; alive[n] = c end end for i = 1, #t do t[i] = alive[i] end
end table.insert(t, conn) return conn end pcall(function() RunService:UnbindFromRenderStep("Fly") end) pcall(function() RunService:UnbindFromRenderStep("Carpet") end)
pcall(function() RunService:UnbindFromRenderStep("BC_Speed") end) pcall(function() RunService:UnbindFromRenderStep("BC_FreeCam") end)
pcall(function() RunService:UnbindFromRenderStep("BC_Invis") end) pcall(function() RunService:UnbindFromRenderStep("BC_InvisNet") end)
pcall(function() RunService:UnbindFromRenderStep("BC_SafeInvis") end) pcall(function() RunService:UnbindFromRenderStep("BC_SafeInvisFly") end)
pcall(function() RunService:UnbindFromRenderStep("BC_AutoGlass") end) pcall(function() RunService:UnbindFromRenderStep("BC_GlassFly") end)
pcall(function() RunService:UnbindFromRenderStep("BC_ObjTrack") end)
pcall(function() RunService:UnbindFromRenderStep("BC_ObjFly") end)
pcall(function() RunService:UnbindFromRenderStep("BC_AnaAim") end)
local C = { WHITE  = Color3.fromRGB(255, 255, 255), DARK   = Color3.fromRGB(238, 241, 248),
GRAY   = Color3.fromRGB(120, 128, 146),
GREEN  = Color3.fromRGB(64, 214, 152), BLUE   = Color3.fromRGB(79, 150, 240), RED    = Color3.fromRGB(230, 88, 88), YELLOW = Color3.fromRGB(250, 204, 102),
PURPLE = Color3.fromRGB(155, 128, 245), ORANGE = Color3.fromRGB(251, 146, 60), PINK   = Color3.fromRGB(226, 82, 158), BG     = Color3.fromRGB(11, 12, 17),
INK      = Color3.fromRGB(12, 10, 6),
SURFACE  = Color3.fromRGB(20, 22, 30),
SURFACE2 = Color3.fromRGB(29, 32, 43),
SURFACE3 = Color3.fromRGB(44, 49, 64),
BORDER   = Color3.fromRGB(60, 66, 84),
MUTED    = Color3.fromRGB(154, 162, 180),
ACCENT   = Color3.fromRGB(240, 201, 122),
ACCENT2  = Color3.fromRGB(198, 141, 62),
ACCENT3  = Color3.fromRGB(255, 238, 203),
HAIRLINE = Color3.fromRGB(72, 79, 99),
GLOW     = Color3.fromRGB(255, 214, 140),
DEEP     = Color3.fromRGB(7, 8, 11),
} local function New(cls, props, parent) local obj = Instance.new(cls) pcall(function() if cls == "Frame" or cls == "ScrollingFrame" or cls == "TextButton"
or cls == "TextLabel" or cls == "TextBox" or cls == "ImageButton" then obj.BorderSizePixel = 0
end if cls == "ScrollingFrame" then obj.ScrollBarThickness = 3
obj.ScrollBarImageColor3 = Color3.fromRGB(88, 96, 118)
obj.ScrollBarImageTransparency = 0.45 end end) for k, v in pairs(props or {}) do obj[k] = v end if parent then obj.Parent = parent end pcall(function()
if cls == "TextButton" or cls == "TextLabel" or cls == "TextBox" then local w = Enum.FontWeight.Medium
local f = obj.Font if f == Enum.Font.GothamBold or f == Enum.Font.GothamBlack then w = Enum.FontWeight.Bold elseif f == Enum.Font.GothamSemibold then
w = Enum.FontWeight.SemiBold elseif f == Enum.Font.Gotham or f == Enum.Font.GothamLight or f == Enum.Font.GothamItalic then
w = Enum.FontWeight.Regular end obj.FontFace = Font.new("rbxasset://fonts/families/GothamSSo.json", w) end
end) pcall(function() if cls == "TextBox" then trackConn(obj.Focused:Connect(function() local st = obj:FindFirstChildOfClass("UIStroke")
if not st then
st = New("UIStroke", { Thickness = 1.3, Transparency = 0.05, ApplyStrokeMode = Enum.ApplyStrokeMode.Border, }, obj)
end TweenService:Create(st, TweenInfo.new(0.16, Enum.EasingStyle.Quart, Enum.EasingDirection.Out),
{Color = C.ACCENT, Transparency = 0.02}):Play() end)) trackConn(obj.FocusLost:Connect(function() local st = obj:FindFirstChildOfClass("UIStroke") if st then
TweenService:Create(st, TweenInfo.new(0.28, Enum.EasingStyle.Quart, Enum.EasingDirection.Out), {Color = C.BORDER, Transparency = 0.35}):Play()
end end)) end end) pcall(function() if (cls == "TextButton" or cls == "TextLabel") and props and props.BackgroundColor3 ~= nil and props.TextColor3 ~= nil
and (props.BackgroundTransparency or 0) < 0.5 then local bg = props.BackgroundColor3
if typeof(bg) == "Color3" then local lum = 0.2126 * bg.R + 0.7152 * bg.G + 0.0722 * bg.B if lum > 0.6 and props.TextColor3 == Color3.fromRGB(255, 255, 255) then
obj.TextColor3 = C.INK end end end end) return obj end local function Corner(p, r) return New("UICorner", {CornerRadius = r or UDim.new(0, 10)}, p)
end local function Stroke(p, c, t) return New("UIStroke", { Color = c or C.BORDER,
Thickness = t or 1, Transparency = 0.15,
ApplyStrokeMode = Enum.ApplyStrokeMode.Border, }, p) end local flashBack = setmetatable({}, { __mode = "k" }) local function flash(btn, temp, secs, tempColor, back)
if not btn then return end if flashBack[btn] == nil then flashBack[btn] = { back or btn.Text, btn.TextColor3 } end
pcall(function() btn.Text = tostring(temp) if tempColor then btn.TextColor3 = tempColor end end) task.delay(secs or 1.6, function()
if not (btn and btn.Parent) then return end local old = flashBack[btn] if not old then return end pcall(function() btn.Text = old[1]; btn.TextColor3 = old[2] end) flashBack[btn] = nil end) end
local function Tween(o, p, d, e) TweenService:Create(o, TweenInfo.new(d or 1.5, e or Enum.EasingStyle.Quart, Enum.EasingDirection.Out), p):Play()
end local D = {} local S function D.Say(msg, color) if not D.hubStatus then return end
pcall(function() D.hubStatus.Text = tostring(msg) D.hubStatus.TextColor3 = color or C.RED end) end function D.BestText(bg) if typeof(bg) ~= "Color3" then return C.WHITE end
local lum = 0.2126 * bg.R + 0.7152 * bg.G + 0.0722 * bg.B return (lum > 0.6) and C.INK or C.WHITE end function D.Edge(bg) if typeof(bg) ~= "Color3" then return C.BORDER end
return Color3.new( math.min(1, bg.R + 0.11), math.min(1, bg.G + 0.12), math.min(1, bg.B + 0.16)) end function D.Grad(obj) local g = obj:FindFirstChildOfClass("UIGradient")
if not g then g = New("UIGradient", {Color = ColorSequence.new(Color3.new(1,1,1), Color3.new(1,1,1))}, obj) end return g end function D.Paint(obj, c1, c2, rotation) pcall(function()
obj.BackgroundColor3 = Color3.new(1, 1, 1) local g = D.Grad(obj) g.Color = ColorSequence.new(c1, c2 or c1) g.Rotation = rotation or 90
end) return obj end function D.Unpaint(obj) pcall(function() if not obj then return end local g = obj:FindFirstChildOfClass("UIGradient")
if g then g.Color = ColorSequence.new(Color3.new(1, 1, 1), Color3.new(1, 1, 1)) end end) return obj end function D.Paint3(obj, colors, rotation) pcall(function()
if type(colors) ~= "table" or #colors == 0 then return obj end obj.BackgroundColor3 = Color3.new(1, 1, 1) local g = D.Grad(obj) local n = #colors
if n == 1 then g.Color = ColorSequence.new(colors[1], colors[1]) else local kp = {}
for i, col in ipairs(colors) do kp[i] = ColorSequenceKeypoint.new((i - 1) / (n - 1), col) end g.Color = ColorSequence.new(kp)
end g.Rotation = rotation or 90 end) return obj end function D.TopLight(obj, color, thickness, inset) local line = nil pcall(function() inset = inset or 14
line = New("Frame", { Name = "BC_TopLight", Size = UDim2.new(1, -inset * 2, 0, thickness or 1), Position = UDim2.new(0, inset, 0, 0),
BackgroundColor3 = color or C.HAIRLINE, BackgroundTransparency = 0.3, BorderSizePixel = 0, ZIndex = (obj.ZIndex or 1) + 1, }, obj)
local g = New("UIGradient", {Rotation = 0}, line) g.Transparency = NumberSequence.new({
NumberSequenceKeypoint.new(0.00, 1.00), NumberSequenceKeypoint.new(0.50, 0.05), NumberSequenceKeypoint.new(1.00, 1.00), })
end) return line end function D.Shade(obj, k1, k2, rotation) pcall(function()
local g = D.Grad(obj) local a = k1 or Color3.new(1.0, 1.0, 1.0) local b = k2 or Color3.new(0.82, 0.84, 0.90) local function mix(t)
return Color3.new(a.R + (b.R - a.R) * t, a.G + (b.G - a.G) * t, a.B + (b.B - a.B) * t) end g.Color = ColorSequence.new({ ColorSequenceKeypoint.new(0.00, a),
ColorSequenceKeypoint.new(0.10, mix(0.28)), ColorSequenceKeypoint.new(0.58, mix(0.62)), ColorSequenceKeypoint.new(1.00, b),
}) g.Rotation = rotation or 90 end) return obj end function D.PaintText(obj, c1, c2) pcall(function()
obj.TextColor3 = Color3.new(1, 1, 1) local g = D.Grad(obj) g.Color = ColorSequence.new(c1, c2 or c1) g.Rotation = 0
end) return obj end function D.Tactile(btn, baseTrans) baseTrans = baseTrans or 0.08
pcall(function() trackConn(btn.MouseEnter:Connect(function() Tween(btn, {BackgroundTransparency = math.max(0, baseTrans - 0.06)}, 0.16) end))
trackConn(btn.MouseLeave:Connect(function() Tween(btn, {BackgroundTransparency = baseTrans}, 0.2) end))
trackConn(btn.MouseButton1Down:Connect(function() Tween(btn, {BackgroundTransparency = math.min(1, baseTrans + 0.12)}, 0.08)
end)) trackConn(btn.MouseButton1Up:Connect(function() Tween(btn, {BackgroundTransparency = baseTrans}, 0.14) end))
end) return btn end function D.HoverText(btn, overColor, downColor) pcall(function()
local base = btn.TextColor3 trackConn(btn.MouseEnter:Connect(function() Tween(btn, {TextColor3 = overColor or C.WHITE}, 0.15) end))
trackConn(btn.MouseLeave:Connect(function() Tween(btn, {TextColor3 = base}, 0.2) end)) trackConn(btn.MouseButton1Down:Connect(function()
Tween(btn, {TextColor3 = downColor or overColor or C.WHITE}, 0.08) end)) end) return btn end
function D.Glow(obj, color, pad, trans) local glow = nil pcall(function() if not obj or not obj.Parent then return end
pad = pad or 7 local function posOf() local pp = obj.Position return UDim2.new(pp.X.Scale, pp.X.Offset - pad, pp.Y.Scale, pp.Y.Offset - pad)
end glow = New("Frame", { Name = "BC_Glow", Size = UDim2.new(1, pad * 2, 1, pad * 2),
Position = posOf(), BackgroundColor3 = color or C.ACCENT, BackgroundTransparency = trans or 0.86, BorderSizePixel = 0,
ZIndex = (obj.ZIndex or 1) - 1, }, obj.Parent) Corner(glow, UDim.new(1, 0)) trackConn(obj:GetPropertyChangedSignal("Position"):Connect(function()
pcall(function() glow.Position = posOf() end) end)) end) return glow end function D.SetBg(obj, color, trans) pcall(function() if not obj then return end obj.BackgroundColor3 = color
if trans ~= nil then obj.BackgroundTransparency = trans end if obj:IsA("TextButton") or obj:IsA("TextLabel") then
obj.TextColor3 = D.BestText(color) end local st = obj:FindFirstChildOfClass("UIStroke") if st then st.Color = D.Edge(color) end
end) return obj end function D.Breathe(obj, props, dur) pcall(function()
local ti = TweenInfo.new(dur or 1.9, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true) TweenService:Create(obj, ti, props):Play()
end) end local function ReleaseHubFocus() pcall(function() local tb = UserInputService:GetFocusedTextBox() if tb then tb:ReleaseFocus() end end) pcall(function() playerGui:ReleaseFocus() end)
end if targetGui:FindFirstChild("ExMenu") then targetGui.ExMenu:Destroy() end local gui = New("ScreenGui", { Name="ExMenu",
IgnoreGuiInset=true, ResetOnSpawn=false, ZIndexBehavior=Enum.ZIndexBehavior.Sibling, }, targetGui)
local togBtn = New("TextButton", { Size=UDim2.new(0,36,0,36), Position=UDim2.new(1,-48,1,-48), Text="", BackgroundColor3=Color3.fromRGB(0,0,0),
BackgroundTransparency=1,
TextColor3=Color3.fromRGB(255,255,255), Font=Enum.Font.GothamBold, TextSize=22, BorderSizePixel=0,
ZIndex=1000, }, gui) Corner(togBtn, UDim.new(1,0)) local rainbowStroke = Instance.new("UIStroke") rainbowStroke.Thickness = 2
rainbowStroke.Color = Color3.fromRGB(255,255,255) rainbowStroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border
rainbowStroke.Parent = togBtn pcall(function() local grad = Instance.new("UIGradient") grad.Color = ColorSequence.new{
ColorSequenceKeypoint.new(0.00, Color3.fromRGB(255,0,0)), ColorSequenceKeypoint.new(0.20, Color3.fromRGB(255,255,0)), ColorSequenceKeypoint.new(0.40, Color3.fromRGB(0,255,0)),
ColorSequenceKeypoint.new(0.60, Color3.fromRGB(0,255,255)), ColorSequenceKeypoint.new(0.80, Color3.fromRGB(0,0,255)),
ColorSequenceKeypoint.new(1.00, Color3.fromRGB(255,0,255)), } grad.Rotation = 0 grad.Parent = rainbowStroke
task.spawn(function() while true do if not togBtn.Parent then break end for r=0,360,4 do if not togBtn.Parent then break end
pcall(function() grad.Rotation = r end) task.wait(0.03) end end end) end) D.Tactile(togBtn, 1) local main = New("Frame", { Size=UDim2.new(0,540,0,340),
Position=UDim2.new(0.5,-270,0.5,-170), BackgroundColor3=C.BG, BackgroundTransparency=0,
BorderSizePixel=0, Visible=false, ClipsDescendants=false, ZIndex=2, }, gui) Corner(main, UDim.new(0,16)) Stroke(main, C.HAIRLINE, 1.2) D.Paint3(main, {C.SURFACE2, C.BG, C.BG, C.DEEP}, 90)
local Hit = {} function Hit.inObject(o, x, y) if not o then return false end local ok, res = pcall(function() if not o.Visible then return false end
local p, s = o.AbsolutePosition, o.AbsoluteSize return x >= p.X and x <= p.X + s.X and y >= p.Y and y <= p.Y + s.Y
end) return ok and res == true end function Hit.onHub(x, y) local ok, objs = pcall(function()
return playerGui:GetGuiObjectsAtPosition(x, y) end) if ok and type(objs) == "table" then for _, o in ipairs(objs) do
if o == gui or o:IsDescendantOf(gui) then return true end end end local aimOverlayHit = false pcall(function() local overlay = S.AnaUi and S.AnaUi.aimGui if not overlay then return end
local containers = {playerGui} if targetGui and targetGui ~= playerGui then containers[#containers + 1] = targetGui end
for _, container in ipairs(containers) do local okAim, aimObjs = pcall(function() return container:GetGuiObjectsAtPosition(x, y) end)
if okAim and type(aimObjs) == "table" then for _, o in ipairs(aimObjs) do if o:IsDescendantOf(overlay) then local dot = S.AnaUi and S.AnaUi.aimDot
if not dot or (o ~= dot and not o:IsDescendantOf(dot)) then aimOverlayHit = true return end end end end end end)
if aimOverlayHit then return true end if Hit.inObject(main, x, y) then return true end
if Hit.inObject(togBtn, x, y) then return true end return false end local bgPattern = New("ImageLabel", { Name = "CheckeredBG",
Size = UDim2.new(1, 0, 1, 0), Position = UDim2.new(0, 0, 0, 0), BackgroundTransparency = 1, Image = "rbxassetid://9822602710", ScaleType = Enum.ScaleType.Tile,
TileSize = UDim2.new(0, 13, 0, 13),
ImageTransparency = 0.955,
ImageColor3 = C.ACCENT2,
ZIndex = 2, }, main) Corner(bgPattern, UDim.new(0, 14)) local titleBar = New("Frame", { Size=UDim2.new(1,0,0,30), BackgroundColor3=C.SURFACE2,
BackgroundTransparency=0,
BorderSizePixel=0, ZIndex=3, }, main) Corner(titleBar, UDim.new(0,16)) D.Paint3(titleBar, {C.SURFACE3, C.SURFACE2, C.SURFACE}, 90)
D.TopLight(titleBar, C.ACCENT3, 1, 22)
D.Paint3(New("Frame", { Name="TitleAccent", Size=UDim2.new(1,-2,0,2), Position=UDim2.new(0,1,1,-1),
BackgroundColor3=C.ACCENT, BorderSizePixel=0, ZIndex=5, }, titleBar), {C.ACCENT2, C.ACCENT3, C.ACCENT2}, 0)
D.PaintText(New("TextLabel", { Size=UDim2.new(1,-90,1,0), Position=UDim2.new(0,12,0,0), Text="taodepzai v5.0 NOIR",
BackgroundTransparency=1, TextColor3=C.DARK, Font=Enum.Font.GothamBold, TextSize=13, TextXAlignment=Enum.TextXAlignment.Left, ZIndex=4,
}, titleBar), C.ACCENT, C.ACCENT3)
D.verPill = New("Frame", { Name="VersionPill", Size=UDim2.new(0,62,0,16), Position=UDim2.new(0,158,0,7),
BackgroundColor3=C.DEEP, BackgroundTransparency=0.15, BorderSizePixel=0, ZIndex=5, }, titleBar) Corner(D.verPill, UDim.new(1,0))
Stroke(D.verPill, C.ACCENT2, 1)
New("TextLabel", { Size=UDim2.new(1,0,1,0), Text="v5.0 · NOIR", BackgroundTransparency=1,
TextColor3=C.ACCENT3, Font=Enum.Font.GothamBold, TextSize=8, ZIndex=6, }, D.verPill) local function TitleBtn(txt, xOff) return New("TextButton", {
Size=UDim2.new(0,24,0,24), Position=UDim2.new(1,-xOff,0,3), Text=txt, BackgroundTransparency=1, TextColor3=C.MUTED, Font=Enum.Font.GothamBold,
TextSize=13, BorderSizePixel=0, ZIndex=4, }, titleBar) end local dragLockBtn = TitleBtn("🔒", 54)
local closeBtn    = TitleBtn("✕", 28) D.HoverText(closeBtn, C.RED, C.RED) D.HoverText(dragLockBtn, C.ACCENT, C.ACCENT) local minW, minH = 440, 260
local function BcFit() local fn = _G.BananaCatHub_SyncEmbeds if type(fn) ~= "function" then return end local ok, now = pcall(os.clock)
if ok and _G.BcFitLast and now - _G.BcFitLast < 0.05 then return end _G.BcFitLast = ok and now or 0 task.defer(fn) end
local function SetupResizeHandle(btn, cornerType) local resizing, sizeStart, posStart, inputStart
trackConn(btn.InputBegan:Connect(function(i) if i.UserInputType==Enum.UserInputType.MouseButton1 or i.UserInputType==Enum.UserInputType.Touch then
pcall(function() if D.openTween then D.openTween:Cancel() D.openTween = nil end end)
resizing=true sizeStart=main.Size posStart=main.Position inputStart=i.Position end end))
trackConn(UserInputService.InputChanged:Connect(function(i) if resizing and sizeStart and posStart and inputStart and (i.UserInputType==Enum.UserInputType.MouseMovement or i.UserInputType==Enum.UserInputType.Touch) then
local d = i.Position - inputStart local w, h = sizeStart.X.Offset, sizeStart.Y.Offset local posX, posY = posStart.X.Offset, posStart.Y.Offset
local newW, newH = w, h local newX, newY = posX, posY if cornerType == "BR" then newW = math.max(minW, w + d.X) newH = math.max(minH, h + d.Y) elseif cornerType == "BL" then
newW = math.max(minW, w - d.X) newH = math.max(minH, h + d.Y) newX = posX + (w - newW)
elseif cornerType == "TR" then newW = math.max(minW, w + d.X) newH = math.max(minH, h - d.Y) newY = posY + (h - newH)
elseif cornerType == "TL" then newW = math.max(minW, w - d.X) newH = math.max(minH, h - d.Y) newX = posX + (w - newW)
newY = posY + (h - newH) end main.Size = UDim2.new(sizeStart.X.Scale, newW, sizeStart.Y.Scale, newH)
main.Position = UDim2.new(posStart.X.Scale, newX, posStart.Y.Scale, newY) end end)) trackConn(UserInputService.InputEnded:Connect(function(i)
if i.UserInputType==Enum.UserInputType.MouseButton1 or i.UserInputType==Enum.UserInputType.Touch then resizing=false end end)) end
local function CreateHandle(icon, pos) local btn = New("TextButton", { Size=UDim2.new(0,16,0,16), Position=pos,
Text=icon, BackgroundColor3=C.SURFACE3, BackgroundTransparency=0.35, TextColor3=C.MUTED, Font=Enum.Font.GothamBold, TextSize=9, BorderSizePixel=0, ZIndex=100,
}, main) Corner(btn, UDim.new(0,4)) Stroke(btn, C.HAIRLINE, 1) D.Shade(btn, Color3.fromRGB(255,255,255), Color3.fromRGB(190,196,210), 90) D.Tactile(btn, 0.35) return btn end
SetupResizeHandle(CreateHandle("↖", UDim2.new(0, 2, 0, 2)), "TL") SetupResizeHandle(CreateHandle("↗", UDim2.new(1, -18, 0, 2)), "TR")
SetupResizeHandle(CreateHandle("↙", UDim2.new(0, 2, 1, -18)), "BL") SetupResizeHandle(CreateHandle("↘", UDim2.new(1, -18, 1, -18)), "BR")
local tabs = {} local tabContent = {} local tabBar = New("ScrollingFrame", { Size=UDim2.new(0,56,1,-30),
Position=UDim2.new(0,0,0,30), BackgroundColor3=C.SURFACE, BackgroundTransparency=0, BorderSizePixel=0,
ZIndex=3, ScrollBarThickness=3, CanvasSize=UDim2.new(0,0,0,0), }, main) D.Paint3(tabBar, {C.SURFACE, C.BG, C.DEEP}, 90)
New("Frame", { Name="TabRailDivider", Size=UDim2.new(0,1,1,-30), Position=UDim2.new(0,56,0,30), BackgroundColor3=C.HAIRLINE, BackgroundTransparency=0.45, BorderSizePixel=0, ZIndex=4, }, main)
New("UIListLayout", { FillDirection=Enum.FillDirection.Vertical, SortOrder=Enum.SortOrder.LayoutOrder, Padding=UDim.new(0,4),
}, tabBar) New("UIPadding", {PaddingTop=UDim.new(0,6), PaddingLeft=UDim.new(0,4)}, tabBar) local contentArea = New("Frame", {
Size=UDim2.new(1,-56,1,-54),
Position=UDim2.new(0,56,0,54), BackgroundTransparency=1, BorderSizePixel=0, ZIndex=3,
ClipsDescendants=true, }, main) D.pageHeader = New("Frame", { Name="PageHeader", Size=UDim2.new(1,-56,0,24), Position=UDim2.new(0,56,0,30),
BackgroundColor3=C.SURFACE, BackgroundTransparency=0.2, BorderSizePixel=0, ZIndex=3, }, main) D.Paint3(D.pageHeader, {C.SURFACE2, C.SURFACE}, 90)
D.pageTitle = New("TextLabel", { Name="PageTitle", Size=UDim2.new(1,-196,1,0), Position=UDim2.new(0,10,0,0),
Text="💾 Code Đã Lưu", BackgroundTransparency=1, TextColor3=C.ACCENT,
Font=Enum.Font.GothamBold, TextSize=11, TextXAlignment=Enum.TextXAlignment.Left, ZIndex=5, }, D.pageHeader) D.pageChips = New("Frame", {
Name="PageChips", Size=UDim2.new(0,150,1,-6), Position=UDim2.new(1,-156,0,3), BackgroundTransparency=1, BorderSizePixel=0, ZIndex=5, }, D.pageHeader) New("UIListLayout", {
FillDirection=Enum.FillDirection.Horizontal, Padding=UDim.new(0,8), SortOrder=Enum.SortOrder.LayoutOrder, VerticalAlignment=Enum.VerticalAlignment.Center, }, D.pageChips)
D.hdrSwitches = {} for i, sw in ipairs({
{key="embed", icon="🧩", onColor=C.GREEN,  tip="Nhúng GUI của script vào tab tính năng"}, {key="guess", icon="🕵", onColor=C.ORANGE, tip="Đoán GUI tạo trễ (dễ ăn nhầm GUI game)"},
{key="park",  icon="🪟", onColor=C.GREEN,  tip="Đưa GUI của tab 💻 Code vào menu"}, }) do
local btn = New("TextButton", { Size=UDim2.new(0,42,0,16), Text="", AutoButtonColor=false, BackgroundTransparency=1, BorderSizePixel=0, LayoutOrder=i, ZIndex=6, }, D.pageChips)
btn:SetAttribute("BCSwKey", sw.key) local ic = New("TextLabel", {
Size=UDim2.new(0,14,1,0), Position=UDim2.new(0,0,0,0), Text=sw.icon, BackgroundTransparency=1, TextColor3=C.MUTED, Font=Enum.Font.GothamBold, TextSize=10, TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7,
}, btn) local track = New("Frame", { Name="BC_SwTrack", Size=UDim2.new(0,26,0,12), Position=UDim2.new(1,-26,0,2), BackgroundColor3=C.SURFACE3, BorderSizePixel=0, ZIndex=7,
}, btn) Corner(track, UDim.new(1,0)) local trackStroke = Stroke(track, C.HAIRLINE, 1) local knob = New("Frame", {
Name="BC_SwKnob", Size=UDim2.new(0,8,0,8), Position=UDim2.new(0,2,0,2), BackgroundColor3=C.GRAY, BorderSizePixel=0, ZIndex=8,
}, track) Corner(knob, UDim.new(1,0)) D.hdrSwitches[sw.key] = {btn=btn, icon=ic, track=track, knob=knob, onColor=sw.onColor, stroke=trackStroke}
btn.Activated:Connect(function() local fn = (sw.key == "embed" and S.DoToggleEmbed)
or (sw.key == "guess" and S.DoToggleGuess) or (sw.key == "park"  and S.DoTogglePark) if type(fn) == "function" then pcall(fn)
end D.SyncPageChips() pcall(function() if S.SyncEmbedToggles then S.SyncEmbedToggles() end end) end) btn.MouseEnter:Connect(function() D.pageTitle.Text = sw.icon .. "  " .. sw.tip
D.pageTitle.TextColor3 = C.DARK D.pageTitle.TextTransparency = 0.25 end) btn.MouseLeave:Connect(function() D.pageTitle.TextColor3 = C.ACCENT
local back = D.hoverName or D.activeName if back then D.pageTitle.Text = back end D.pageTitle.TextTransparency = D.hoverName and 0.4 or 0 end) end New("Frame", {
Name="PageHeaderRule", Size=UDim2.new(1,-56,0,1), Position=UDim2.new(0,56,0,53), BackgroundColor3=C.HAIRLINE, BackgroundTransparency=0.5, BorderSizePixel=0, ZIndex=4,
}, main) local activeTab = nil local function SwitchTab(index) ReleaseHubFocus()
for _, t in ipairs(tabContent) do t.Visible = false end for _, b in ipairs(tabs) do b.BackgroundColor3 = C.SURFACE2 b.BackgroundTransparency = 1 b.TextColor3 = C.MUTED
D.Unpaint(b)
local bar = b:FindFirstChild("BC_Bar") if bar then bar.Visible = false end end if tabContent[index] and tabs[index] then
tabContent[index].Visible = true local b = tabs[index] b.BackgroundColor3 = C.SURFACE2 b.BackgroundTransparency = 0.1
b.TextColor3 = C.ACCENT D.Paint3(b, {C.SURFACE3, C.SURFACE2, C.SURFACE}, 90) local bar = b:FindFirstChild("BC_Bar") if not bar then
bar = New("Frame", { Name = "BC_Bar", Size = UDim2.new(0, 3, 1, -12), Position = UDim2.new(0, 2, 0, 6),
BackgroundColor3 = C.ACCENT, BorderSizePixel = 0, ZIndex = 6, }, b) Corner(bar, UDim.new(1, 0)) D.Paint3(bar, {C.ACCENT3, C.ACCENT, C.ACCENT2}, 90)
end bar.Visible = true activeTab = tabContent[index] pcall(function() if D.pageTitle then local ic = b:GetAttribute("BCTabIcon")
local nm = b:GetAttribute("BCTabName") D.activeName = (ic and (ic .. "  ") or "") .. tostring(nm or ("Trang " .. index))
if not D.hoverName then D.pageTitle.Text = D.activeName D.pageTitle.TextTransparency = 0 end end end) end BcFit()
pcall(function() if S.PagePerf and S.PagePerf.OnTabChanged then S.PagePerf.OnTabChanged() end end) end
local function OpenFirstPage() local idx, best = 1, nil for i, b in ipairs(tabs) do local o = b and b.LayoutOrder
if type(o) == "number" and (best == nil or o < best) then best = o; idx = i end end SwitchTab(idx) end
local function MakeTabFrame() return New("ScrollingFrame", { Size=UDim2.new(1,0,1,0), BackgroundTransparency=1, BorderSizePixel=0,
ScrollBarThickness=4,
ScrollBarImageColor3=Color3.fromRGB(88, 96, 118),
ClipsDescendants=true, CanvasSize=UDim2.new(0,0,0,0), Visible=false, Active=true, Selectable=false, ScrollingDirection=Enum.ScrollingDirection.Y, ZIndex=4, }, contentArea) end
local function MakeTabButton(name, icon, order, onClick) local btn = New("TextButton", { Size=UDim2.new(1,-10,0,24),
Text=icon,
BackgroundColor3=C.SURFACE2,
BackgroundTransparency=1, TextColor3=C.MUTED, Font=Enum.Font.GothamBold, TextSize=12,
BorderSizePixel=0, LayoutOrder=order, TextXAlignment=Enum.TextXAlignment.Center, ZIndex=4, }, tabBar) Corner(btn, UDim.new(0,6))
pcall(function() btn:SetAttribute("BCTabName", name)
btn:SetAttribute("BCTabIcon", icon) end) pcall(function() trackConn(btn.MouseEnter:Connect(function() if btn.BackgroundTransparency > 0.5 then Tween(btn, {BackgroundTransparency = 0.62}, 0.16) end
pcall(function()
if D.pageTitle then D.hoverName = btn:GetAttribute("BCTabName")
local ic = btn:GetAttribute("BCTabIcon") D.pageTitle.Text = (ic and (ic .. "  ") or "") .. tostring(D.hoverName or "") D.pageTitle.TextTransparency = 0.4 end end) end))
trackConn(btn.MouseLeave:Connect(function() if btn.TextColor3 ~= C.ACCENT then Tween(btn, {BackgroundTransparency = 1}, 0.2) end pcall(function()
D.hoverName = nil if D.pageTitle and D.activeName then D.pageTitle.Text = D.activeName D.pageTitle.TextTransparency = 0 end end) end)) end)
btn.Activated:Connect(function() for i, b in ipairs(tabs) do if b == btn then SwitchTab(i) if onClick then pcall(onClick) end break end end
end) return btn end local function AddTab(name, icon, order, customContent) local sf if customContent then sf = customContent sf.Parent = contentArea sf.Visible = false
else sf = MakeTabFrame() end local btn = MakeTabButton(name, icon, order)
table.insert(tabs, btn) table.insert(tabContent, sf) tabBar.CanvasSize = UDim2.new(0, 0, 0, #tabs * 30 + 10) return sf, btn
end local codeTab      = AddTab("Code", "💻", 2) local savedCodeTab = AddTab("Code Đã Lưu", "💾", 1) OpenFirstPage()
S = { dragMenu     = false, dragging     = false, dragStart    = nil, startPos     = nil, togDragging  = false, togDragStart = nil, togStartPos  = nil, togMoved     = false,
embedEnabled = true,
embedGuessNew = false,
parkCodeGuis = true, embeds       = {},
} S.PagePerf = S.PagePerf or { currentTab = nil, mainVisible = true, _paused = {}, _lastMainVisible = true, } function S.PagePerf.IsMainVisible()
local ok, vis = pcall(function() return main and main.Visible == true end) return ok and vis == true end function S.PagePerf.GetActiveTabName()
local ok, name = pcall(function() if D and D.activeName then return tostring(D.activeName) end
if activeTab and activeTab.Name then return tostring(activeTab.Name) end return nil end) if ok then return name end
return nil end function S.PagePerf.IsTabVisible(tab) if not tab then return false end
local ok, vis = pcall(function() return tab.Visible == true end) return ok and vis == true end function S.PagePerf.ShouldRunForPlayerTab()
if not S.PagePerf.IsMainVisible() then return false end local pt = D and D.playerTab
if not pt then return false end return S.PagePerf.IsTabVisible(pt) end function S.PagePerf.ShouldRunForSupportTab() if not S.PagePerf.IsMainVisible() then return false end local st = nil
pcall(function() if S.AnaUi and S.AnaUi.supportTabIndex and tabContent and tabContent[S.AnaUi.supportTabIndex] then
st = tabContent[S.AnaUi.supportTabIndex] end end) if not st then local ok, t = pcall(function() return supportTab end) if ok then st = t end end if not st then return false end
return S.PagePerf.IsTabVisible(st) end function S.PagePerf.OnTabChanged() pcall(function()
S.PagePerf.currentTab = S.PagePerf.GetActiveTabName() S.PagePerf.mainVisible = S.PagePerf.IsMainVisible() if S.Coord and S.Coord.RefreshBind then pcall(S.Coord.RefreshBind) end
if S.SpeedMeter and S.SpeedMeter.OnTabChanged then pcall(S.SpeedMeter.OnTabChanged) end
if S.ObjTrack and S.ObjTrack.OnPerfTick then pcall(S.ObjTrack.OnPerfTick) end if S.Loc and S.Loc.OnPerfTick then pcall(S.Loc.OnPerfTick) end
end) end function S.PagePerf.OnMainVisibilityChanged() pcall(function() S.PagePerf.mainVisible = S.PagePerf.IsMainVisible() if S.Coord and S.Coord.RefreshBind then pcall(S.Coord.RefreshBind) end
if S.SpeedMeter and S.SpeedMeter.OnTabChanged then pcall(S.SpeedMeter.OnTabChanged) end
if S.ObjTrack and S.ObjTrack.OnPerfTick then pcall(S.ObjTrack.OnPerfTick) end if S.Loc and S.Loc.OnPerfTick then pcall(S.Loc.OnPerfTick) end end) end
S.WRAP_MARK_OLD = "-- ===== AUTO-GENERATED SIZE WRAPPER" S.WRAP_MARK_NEW = "-- ===== AUTO-GENERATED FIT WRAPPER"
function S.SanitizeCode(c) if type(c) ~= "string" then return c end if not c:find(S.WRAP_MARK_OLD, 1, true) then return c end local out = (c:gsub(
"pcall%s*%(%s*function%s*%(%)%s*_ForceStretch%s*%(%s*g%s*%)%s*end%s*%)", "")) return out end
function S.Shimmed(n) local v = S.shimmedFns and S.shimmedFns[n] if v == nil then return false end return rawget(_G, n) == v end function D.SyncPageChips() pcall(function()
if not D.hdrSwitches then return end local state = { embed = (S.embedEnabled == true), guess = (S.embedGuessNew == true),
park  = (S.parkCodeGuis ~= false), } for k, s in pairs(D.hdrSwitches) do local on = (state[k] == true)
s.track.BackgroundColor3 = on and (s.onColor or C.GREEN) or C.SURFACE3 s.knob.BackgroundColor3  = on and C.WHITE or C.GRAY
s.knob.Position = on and UDim2.new(1,-10,0,2) or UDim2.new(0,2,0,2) s.icon.TextColor3 = on and C.DARK or C.GRAY
if s.stroke then s.stroke.Color = on and D.Edge(s.onColor or C.GREEN) or C.HAIRLINE end end end) end local scripts = {}
local waypoints = {}
local featureTabs = {}
local featureTabIndex = 7
local totalRuns, cancelled = 0, false local curThread, curIndicator = nil, nil local runActive = false
local Store = {} Store.SAVE_FILE      = "banana_cat_saved.json" Store.SAVE_VERSION   = 3 Store.mode           = "none"
Store.lastError      = nil Store.lastSavedAt    = nil Store.saveCount      = 0 Store.loadedScripts  = 0 Store.loadedWp       = 0
Store.loadedFeatures = {}
Store.savedSkins     = {}
Store.autoUseSkin    = nil
Store.savedObjTracks = {}
Store.restoreFeatures = nil
Store.restoreWaypoints = nil
Store.restoreSkins   = nil
Store.restoreObjTracks = nil
Store.statusLbl      = nil
Store.reloadBtn      = nil Store._scheduled     = false Store.refreshStatus  = nil
function Store.canWrite() if type(writefile) ~= "function" or type(readfile) ~= "function" then return false end
if S.Shimmed("writefile") or S.Shimmed("readfile") then return false end return true end function Store.isFinite(n) return type(n) == "number" and n == n and n ~= math.huge and n ~= -math.huge end
function Store.write(data) local okEnc, json = pcall(function() return HttpService:JSONEncode(data) end) if not okEnc then Store.mode = "memory"
Store.lastError = "Không mã hoá được JSON: " .. tostring(json) _G.BananaCatHub_SavedData = data return false end if not Store.canWrite() then Store.mode = "memory"
Store.lastError = "Executor không có writefile — chỉ giữ được trong phiên chơi này" _G.BananaCatHub_SavedData = data return false end
local okW, errW = pcall(writefile, Store.SAVE_FILE, json) if not okW then
Store.mode = "memory" Store.lastError = "Ghi file thất bại: " .. tostring(errW) _G.BananaCatHub_SavedData = data return false end Store.mode = "file" Store.lastError = nil
Store.saveCount = Store.saveCount + 1 pcall(function() Store.lastSavedAt = os.date("%H:%M:%S") end) _G.BananaCatHub_SavedData = data return true end function Store.read() if Store.canWrite() then
local hasFile = true if type(isfile) == "function" then local okI, r = pcall(isfile, Store.SAVE_FILE) hasFile = (okI and r == true) end if hasFile then
local okR, txt = pcall(readfile, Store.SAVE_FILE) if okR and type(txt) == "string" and #txt > 0 then local okD, data = pcall(function() return HttpService:JSONDecode(txt) end)
if okD and type(data) == "table" then Store.mode = "file" Store.lastError = nil return data end Store.lastError = "File lưu bị hỏng (JSON không đọc được) — đã bỏ qua" end end
end if Store.lastError and Store.lastError:find("bị hỏng", 1, true) then Store.mode = "none" return nil end
if type(_G.BananaCatHub_SavedData) == "table" then Store.mode = "memory" return _G.BananaCatHub_SavedData end Store.mode = "none" return nil end function Store.serialize() local sOut = {}
for _, s in ipairs(scripts) do table.insert(sOut, { name     = tostring(s.name or ""), code     = tostring(s.code or ""),
expanded = (s.expanded == true), }) end local wOut = {} for _, w in ipairs(waypoints) do
local pos = w and w.pos if pos and Store.isFinite(pos.X) and Store.isFinite(pos.Y) and Store.isFinite(pos.Z) then
table.insert(wOut, {name = tostring(w.name or ""), x = pos.X, y = pos.Y, z = pos.Z}) end end local fOut = {} for _, f in ipairs(featureTabs) do
table.insert(fOut, { name = tostring(f.name or ""), icon = tostring(f.icon or "⚙️"), code = tostring(f.code or ""),
}) end return { version   = Store.SAVE_VERSION, scripts   = sOut, waypoints = wOut, features  = fOut, savedSkins = type(Store.savedSkins) == "table" and Store.savedSkins or {},
autoUseSkin = type(Store.autoUseSkin) == "table" and Store.autoUseSkin or nil, savedObjTracks = type(Store.savedObjTracks) == "table" and Store.savedObjTracks or {},
settings  = { embedEnabled  = (S.embedEnabled == true), embedGuessNew = (S.embedGuessNew == true), parkCodeGuis  = (S.parkCodeGuis ~= false),
hubFavs = (function() local out = {} if type(S.hubFavs) == "table" then for nm, v in pairs(S.hubFavs) do if v then out[#out + 1] = tostring(nm) end end end return out end)(), }, } end
function Store.save() local ok = Store.write(Store.serialize()) if Store.refreshStatus then pcall(Store.refreshStatus) end return ok
end function Store.saveSoon() if Store._scheduled then return end
Store._scheduled = true task.delay(0.3, function() Store._scheduled = false Store.save() end) end function Store.load() local data = Store.read()
if type(data) ~= "table" then Store.mode = Store.canWrite() and "empty" or "none"
Store.loadedScripts, Store.loadedWp = 0, 0 Store.loadedFeatures = {} Store.savedSkins = {} Store.autoUseSkin = nil Store.savedObjTracks = {}
return end local fileVer = tonumber(data.version) or 1 if fileVer > Store.SAVE_VERSION then
Store.lastError = string.format( "File lưu là version %d, script này chỉ hiểu tới v%d — một số mục có thể không nạp",
fileVer, Store.SAVE_VERSION) end if type(data.settings) == "table" then S.embedEnabled  = (data.settings.embedEnabled ~= false)
S.embedGuessNew = (data.settings.embedGuessNew == true) S.parkCodeGuis  = (data.settings.parkCodeGuis ~= false) if type(data.settings.hubFavs) == "table" then S.hubFavs = {}
for _, nm in ipairs(data.settings.hubFavs) do S.hubFavs[tostring(nm)] = true end end end local sOut = {} if type(data.scripts) == "table" then
for _, s in ipairs(data.scripts) do if type(s) == "table" and type(s.code) == "string" and #s.code > 0 then
table.insert(sOut, { name     = (type(s.name) == "string" and #s.name > 0) and s.name or ("Script " .. (#sOut + 1)), code     = S.SanitizeCode(s.code),
expanded = (s.expanded == true), }) end end end local wOut = {} if type(data.waypoints) == "table" then
for _, w in ipairs(data.waypoints) do if type(w) == "table" and Store.isFinite(w.x) and Store.isFinite(w.y) and Store.isFinite(w.z) then
table.insert(wOut, { name = (type(w.name) == "string" and #w.name > 0) and w.name or ("WP " .. (#wOut + 1)), pos  = Vector3.new(w.x, w.y, w.z), })
end end end local fOut = {} if type(data.features) == "table" then for _, f in ipairs(data.features) do if type(f) == "table" and type(f.code) == "string" and #f.code > 0 then
table.insert(fOut, { name = (type(f.name) == "string" and #f.name > 0) and f.name or ("Tính Năng " .. (#fOut + 1)), icon = (type(f.icon) == "string" and #f.icon > 0) and f.icon or "⚙️",
code = S.SanitizeCode(f.code), }) end end end local skOut = {} if type(data.savedSkins) == "table" then for _, sk in ipairs(data.savedSkins) do
if type(sk) == "table" and (tonumber(sk.id) or (type(sk.name) == "string" and #sk.name > 0)) then table.insert(skOut, sk) end end end Store.savedSkins = skOut
if type(data.autoUseSkin) == "table" and (tonumber(data.autoUseSkin.id) or (type(data.autoUseSkin.name) == "string" and #data.autoUseSkin.name > 0)) then
Store.autoUseSkin = data.autoUseSkin else Store.autoUseSkin = nil end local otOut = {} if type(data.savedObjTracks) == "table" then for _, ot in ipairs(data.savedObjTracks) do
if type(ot) == "table" and ((type(ot.query) == "string" and #ot.query > 0) or (type(ot.entries) == "table" and #ot.entries > 0) or (type(ot.title) == "string" and #ot.title > 0)) then
table.insert(otOut, ot) end end end Store.savedObjTracks = otOut scripts   = sOut waypoints = wOut Store.loadedFeatures = fOut Store.loadedScripts, Store.loadedWp = #sOut, #wOut end Store.load()
S.compatAdded  = S.compatAdded or {}
S.compatTried  = false S.vfs          = S.vfs or {}
S.clipboardTxt = S.clipboardTxt or "" S.queued       = S.queued or {}
S.lastRunReport = nil
S.lastRunError  = nil S.lastNormalizeNote = nil S.lastParkedCount = 0 S.lastParkedNames = {}
_G.__BC_SHIMMED_MAP = type(rawget(_G, "__BC_SHIMMED_MAP")) == "table" and rawget(_G, "__BC_SHIMMED_MAP") or {} pcall(function()
local idFn = rawget(_G, "identifyexecutor") local isOldShim = false if type(idFn) == "function" then local okI, rI = pcall(idFn)
if okI and tostring(rI or ""):find("NOIR%-Compat") then isOldShim = true end end local shimMap = rawget(_G, "__BC_SHIMMED_MAP")
for _, k in ipairs({ "getgenv", "getrenv", "request", "http_request", "http", "HttpRequest", "identifyexecutor", "getexecutorname", "setclipboard", "toclipboard", "set_clipboard" }) do
local cur = rawget(_G, k) if cur ~= nil then local isLuaShim = isOldShim or (type(shimMap) == "table" and shimMap[cur] == true)
if not isLuaShim and type(cur) == "function" and type(debug) == "table" and type(debug.info) == "function" then
local okD, src = pcall(debug.info, cur, "s") if okD and type(src) == "string" and src ~= "[C]" and src ~= "=[C]" then isLuaShim = true end
end if isLuaShim then rawset(_G, k, nil) end end end end) function S.IsRealExecutorFn(fn) if type(fn) ~= "function" then return false end if fn == S.CompatRequest then return false end
local shimMap = rawget(_G, "__BC_SHIMMED_MAP") if type(shimMap) == "table" and shimMap[fn] then return false end
if type(S.shimmedFns) == "table" then for _, sf in pairs(S.shimmedFns) do if sf == fn then return false end end end return true end function S.HasGlobal(n)
local ok, v = pcall(function() return rawget(_G, n) end) if ok and v ~= nil then
local shimMap = rawget(_G, "__BC_SHIMMED_MAP") if not (type(shimMap) == "table" and shimMap[v]) then return true end end if type(getgenv) == "function" and S.IsRealExecutorFn(getgenv) then
local okG, g = pcall(getgenv) if okG and type(g) == "table" and g ~= _G and g[n] ~= nil then return true end end if type(getfenv) == "function" then
local okE, env = pcall(getfenv, 0) if okE and type(env) == "table" and env ~= _G and env[n] ~= nil then return true end end return false
end function S.SetGlobal(n, v) if S.HasGlobal(n) then return false end
local ok = pcall(function() rawset(_G, n, v) end) if ok then S.compatAdded[#S.compatAdded + 1] = n S.shimmedFns = S.shimmedFns or {}
S.shimmedFns[n] = rawget(_G, n) if v ~= nil then _G.__BC_SHIMMED_MAP[v] = true end
end return ok end function S.VRead(p) local f = S.vfs[tostring(p)] if f == nil then error("File not found: " .. tostring(p)) end return f
end function S.VWrite(p, c)  S.vfs[tostring(p)] = tostring(c); return true end
function S.VAppend(p, c) S.vfs[tostring(p)] = (S.vfs[tostring(p)] or "") .. tostring(c); return true end function S.VExists(p)    return S.vfs[tostring(p)] ~= nil end
function S.VDel(p)       S.vfs[tostring(p)] = nil; return true end function S.VList(dir) dir = tostring(dir or ""):gsub("[/\\]+$", "") local out = {}
for k in pairs(S.vfs) do if dir == "" or k:sub(1, #dir) == dir then out[#out + 1] = k end end return out end
function S.CompatRequest(opts) if type(opts) ~= "table" then opts = {Url = tostring(opts)} end
local url = tostring(opts.Url or opts.url or "") local method = tostring(opts.Method or opts.method or "GET"):upper()
local reqBody = opts.Body or opts.body local body, status, good = "", 0, false pcall(function() local r = game:GetService("HttpService"):RequestAsync({
Url = url, Method = method, Headers = opts.Headers or opts.headers, Body = reqBody,
}) body, status, good = tostring(r.Body or ""), tonumber(r.StatusCode) or 200, (r.Success == true) end) if body == "" and method == "POST" then
local okPost, posted = pcall(function() return game:HttpPost(url, tostring(reqBody or ""), "application/json") end)
if okPost and type(posted) == "string" and posted ~= "" then body, status, good = posted, 200, true end end if body == "" and method == "GET" then
local okHttp, fetched = pcall(function() return game:HttpGet(url) end) if okHttp then body, status, good = tostring(fetched or ""), 200, true end
end return {StatusCode = status, StatusMessage = "", Body = body, Success = good, Headers = {}} end function S.CompatDrawing() local D = {}
D.Fonts = {UI = 0, System = 0, Plex = 1, Monospace = 2} D.new = function(cls) local o = {__class = tostring(cls or ""), Visible = false, ZIndex = 1, Transparency = 1} return setmetatable(o, {
__index = function(t, k) if k == "Remove" or k == "Destroy" then return function(self) rawset(self, "Visible", false) end end
return rawget(t, k) end, __newindex = function(t, k, v) rawset(t, k, v) end, })
end return D end function S.EnsureCompat() if S.compatTried then return S.compatAdded end S.compatTried = true pcall(function()
S.SetGlobal("loadstring", function(src, nm) return load(tostring(src), nm or "compat") end) S.SetGlobal("getgenv", function() return _G end)
S.SetGlobal("getrenv", function() return _G end) S.SetGlobal("identifyexecutor", function() return "taodepzai v5.0 NOIR-Compat", "4.7" end)
S.SetGlobal("getexecutorname", function() return "taodepzai v5.0 NOIR-Compat" end) S.SetGlobal("getscript", function() return nil end) S.SetGlobal("getcallingscript", function() return nil end)
S.SetGlobal("checkcaller", function() return false end) S.SetGlobal("isourclosure", function() return false end)
S.SetGlobal("is_synapse_function", function() return false end) S.SetGlobal("setclipboard",  function(t) S.clipboardTxt = tostring(t); return true end)
S.SetGlobal("toclipboard",   function(t) S.clipboardTxt = tostring(t); return true end) S.SetGlobal("set_clipboard", function(t) S.clipboardTxt = tostring(t); return true end)
S.SetGlobal("readfile",   function(p) return S.VRead(p) end) S.SetGlobal("writefile",  function(p, c) return S.VWrite(p, c) end) S.SetGlobal("appendfile", function(p, c) return S.VAppend(p, c) end)
S.SetGlobal("isfile",     function(p) return S.VExists(p) end) S.SetGlobal("delfile",    function(p) return S.VDel(p) end)
S.SetGlobal("listfiles",  function(d) return S.VList(d) end) S.SetGlobal("makefolder", function() return true end)
S.SetGlobal("isfolder",   function() return true end) S.SetGlobal("delfolder",  function() return true end)
S.SetGlobal("getcustomasset", function(_, p) return tostring(p) end) S.SetGlobal("getsynasset",    function(_, p) return tostring(p) end) S.SetGlobal("request",      S.CompatRequest)
S.SetGlobal("http_request", S.CompatRequest) S.SetGlobal("http", {request = S.CompatRequest})
S.SetGlobal("HttpRequest",  S.CompatRequest) S.SetGlobal("hookfunction",      function(_, nw) return nw end)
S.SetGlobal("hookmetamethod",    function() return function() end end) S.SetGlobal("getrawmetatable",   function(o) return getmetatable(o) or {} end)
S.SetGlobal("setrawmetatable",   function(o, m) pcall(setmetatable, o, m); return o end) S.SetGlobal("setreadonly",       function() return true end)
S.SetGlobal("isreadonly",        function() return false end) S.SetGlobal("newcclosure",       function(f) return f end) S.SetGlobal("getnamecallmethod", function() return "" end)
S.SetGlobal("setnamecallmethod", function() return true end) S.SetGlobal("getconnections",    function() return {} end)
S.SetGlobal("fireclickdetector",   function() return true end) S.SetGlobal("firetouchinterest",   function() return true end)
S.SetGlobal("fireproximityprompt", function() return true end) S.SetGlobal("gethui", function() return targetGui end)
S.SetGlobal("Drawing", S.CompatDrawing()) S.SetGlobal("setfpscap", function() return true end) S.SetGlobal("getfpscap", function() return 60 end)
S.SetGlobal("iswindowactive", function() return true end) S.SetGlobal("queue_on_teleport", function(_, src) S.queued[#S.queued + 1] = tostring(src); return true end) end)
if #S.compatAdded > 0 then pcall(function() print("[taodepzai v5.0 NOIR] " .. S.CompatNote()) end) end return S.compatAdded end
function S.CompatNote() local n = #S.compatAdded if n == 0 then return "" end local sample = {}
for i = 1, math.min(4, n) do sample[#sample + 1] = S.compatAdded[i] end return "🩹 đã bù " .. n .. " hàm executor còn thiếu (" .. table.concat(sample, ", ")
.. (n > 4 and "…" or "") .. ")" end function S.NormalizeRunnable(c) S.lastNormalizeNote = nil if type(c) ~= "string" then return "" end c = c:gsub("\239\187\191", ""):gsub("\226\128\139", "")
c = c:gsub("\226\128\142", ""):gsub("\226\128\143", "") local t = c:match("^%s*(.-)%s*$") or "" local q = t:match('^["\'](.-)["\']$')
if q and q ~= "" then t = q end if t:match("^https?://") then if t:find('[%c"\\]') then S.lastNormalizeNote = "⚠️ link có ký tự lạ -> chạy nguyên văn" return c end
S.lastNormalizeNote = "🔗 link trần -> tự bọc loadstring(game:HttpGet(...))()" return 'loadstring(game:HttpGet("' .. t .. '"))()'
end local u = t:match('^game:HttpGet%s*%(%s*"(https?://.-)"%s*%)$') or t:match('^HttpGet%s*%(%s*"(https?://.-)"%s*%)$') if u then
S.lastNormalizeNote = "🔗 HttpGet trần -> tự bọc loadstring(...)()" return 'loadstring(game:HttpGet("' .. u .. '"))()'
end if t:match("^loadstring%s*%(") and t:sub(-2) ~= "()" then S.lastNormalizeNote = "➕ loadstring thiếu dấu () -> đã thêm để chạy được" return t .. "()" end return c end
function S.RunReportText() local r = S.lastRunReport if not r then return "" end if r.fail > 0 and r.ok == 0 then
local e = tostring(r.err or "không rõ"):gsub("%s+", " ") if #e > 160 then e = e:sub(1, 160) .. "…" end return "❌ Không chạy được: " .. e .. " · mở F9 xem đầy đủ" end
local t = "✅ Đã chạy xong (" .. r.ok .. " lần)" if r.fail > 0 then t = t .. " · ⚠️ " .. r.fail .. " lần lỗi" end if r.guis and r.guis > 0 then
local nm = (r.names and r.names[1]) and (" '" .. r.names[1] .. "'") or "" t = t .. " · 🧩 " .. r.guis .. " GUI đã vào tab 'GUI Ngoài'" .. nm .. " (bấm ↩ trả ra màn hình)"
elseif r.parked then t = t .. " · " .. r.parked end if r.note then t = t .. " · " .. r.note end if r.compat and r.compat ~= "" then t = t .. " · " .. r.compat end return t end
local function ExecOnce(code, name) if #name>0 then print("👤 Chạy bởi:", name) end code = S.SanitizeCode(code)
code = S.NormalizeRunnable(code)
S.EnsureCompat()
local ok, err = pcall(function() local fn, lerr = loadstring(code) if not fn then error(lerr) end fn() end) if ok then S.lastRunError = nil else
S.lastRunError = tostring(err) pcall(function() warn("[taodepzai v5.0 NOIR] ❌ '" .. tostring(name) .. "' lỗi: " .. tostring(err)) end)
end return ok, err end local function Cancel() pcall(function() if S.AbortRunCapture then S.AbortRunCapture() end end) cancelled=true runActive=false
if curThread then pcall(task.cancel, curThread); curThread=nil end if curIndicator then curIndicator.BackgroundColor3=C.BLUE; curIndicator=nil end
end local function RunCode(code, name, ind, times, delay, noPark) Cancel() ReleaseHubFocus()
if #code==0 then return false, "⚠️ Vui lòng nhập code!" end cancelled=false
if ind then curIndicator=ind; ind.BackgroundColor3=C.RED end local okC, failC = 0, 0 curThread=task.spawn(function() runActive=true
S.lastParkedCount, S.lastParkedNames = 0, {}
S.lastRunError = nil local skipPark, skipWhy = (noPark == true), (noPark == true and "nút script nhanh" or nil)
if not skipPark and S.ShouldSkipPark then local s2, w2 = S.ShouldSkipPark(code, name) if s2 then skipPark, skipWhy = true, w2 end end local cap = nil if skipPark then
S.lastParkNote = "🪟 GUI để NGOÀI màn hình game (công cụ cửa sổ riêng) — không đưa vào menu" pcall(function() print("[taodepzai v5.0 NOIR] 🛠 '" .. tostring(name) .. "': GUI ở NGOÀI màn hình game như cũ"
.. " (lý do không đưa vào menu: " .. tostring(skipWhy) .. ")") end) else S.lastParkNote = nil
cap = S.BeginRunCapture() end for i=1,times do if cancelled then break end if i>1 and delay>0 then local e=0 while e<delay do
if cancelled then break end task.wait(0.1); e = e + (0.1) end if cancelled then break end end local ok, err = ExecOnce(code, name)
if ok then okC = okC + (1)  else failC = failC + (1) ; warn("❌ Lần",i,err) end if cap then S.EndRunCapture(cap, (#name>0 and name or "Script"))
S.lastParkedCount = cap.parked or 0
S.lastParkedNames = cap.names or {} cap = nil end end if cap then S.EndRunCapture(cap, (#name>0 and name or "Script")) cap = nil end S.lastRunReport = { name   = name, ok     = okC,
fail   = failC, err    = S.lastRunError, parked = (skipPark and S.lastParkNote or nil), guis   = S.lastParkedCount,
names  = S.lastParkedNames, note   = S.lastNormalizeNote, compat = S.CompatNote(), }
totalRuns = totalRuns + (okC+failC)  if ind then ind.BackgroundColor3=C.GREEN; if curIndicator==ind then curIndicator=nil end end
runActive=false curThread=nil end) return true, nil end local function Label(parent, text, y) local isRule = (tostring(text):find("━") ~= nil)
return New("TextLabel", { Size=UDim2.new(1,-16,0,14), Position=UDim2.new(0,8,0,y or 0), Text=text, BackgroundTransparency=1,
TextColor3=(isRule and C.BORDER or C.MUTED),
Font=Enum.Font.GothamMedium, TextSize=10, TextXAlignment=Enum.TextXAlignment.Left, ZIndex=6, }, parent) end
local function Button(parent, text, x, y, w, h, color) local base = color or C.SURFACE3 local bh = math.min(h or 18, 20)
local btn = New("TextButton", { Size=UDim2.new(0,w or 88,0,bh), Position=UDim2.new(0,x or 8,0,y or 0),
Text=text, BackgroundColor3=base, BackgroundTransparency=0.08, TextColor3=D.BestText(base), Font=Enum.Font.GothamBold, TextSize=8, BorderSizePixel=0, ZIndex=6,
}, parent) Corner(btn, UDim.new(0,6)) Stroke(btn, D.Edge(base), 1.1) D.Shade(btn, Color3.fromRGB(255,255,255), Color3.fromRGB(182,187,201), 90)
D.Tactile(btn, 0.08) return btn end function S.Debounce(key, secs, fn) S._dbt = S._dbt or {}
local n = (S._dbt[key] or 0) + 1 S._dbt[key] = n task.delay(secs or 0.18, function() if S._dbt[key] ~= n then return end
S._dbt[key] = nil pcall(fn) end) end local y = 8 Label(codeTab, "💻 Nhập Code Tùy Chỉnh", y) y = y + 14 Label(codeTab, "👤 Tên Script", y)
y = y + 14 local nameIn = New("TextBox", { Size=UDim2.new(1,-16,0,26), Position=UDim2.new(0,8,0,y), Text="",
PlaceholderText="Nhập tên script...", PlaceholderColor3=Color3.fromRGB(122, 130, 148), BackgroundColor3=Color3.fromRGB(26, 29, 38), BackgroundTransparency=0, TextColor3=Color3.fromRGB(233, 237, 245), Font=Enum.Font.GothamMedium, TextSize=12, BorderSizePixel=0, ClearTextOnFocus=false,
Active=true, Selectable=true, ZIndex=10, TextXAlignment=Enum.TextXAlignment.Left, }, codeTab)
Corner(nameIn, UDim.new(0,5)) Stroke(nameIn, Color3.fromRGB(100,120,200), 1.5) New("UIPadding", {PaddingLeft=UDim.new(0,6)}, nameIn)
y = y + 32 Label(codeTab, "💻 Code (Lua)", y) y = y + 14 local codeIn = New("TextBox", { Size=UDim2.new(1,-16,0,80), Position=UDim2.new(0,8,0,y), Text="",
PlaceholderText="-- Nhập code Lua tại đây...", PlaceholderColor3=Color3.fromRGB(122, 130, 148), BackgroundColor3=Color3.fromRGB(28, 31, 41), BackgroundTransparency=0, TextColor3=Color3.fromRGB(233, 237, 245),
Font=Enum.Font.Code, TextSize=11, BorderSizePixel=0, ClearTextOnFocus=false, MultiLine=true, TextWrapped=true, TextXAlignment=Enum.TextXAlignment.Left, TextYAlignment=Enum.TextYAlignment.Top,
Active=true, Selectable=true, ZIndex=10, }, codeTab)
Corner(codeIn, UDim.new(0,5)) Stroke(codeIn, Color3.fromRGB(100,120,200), 1.5) New("UIPadding", {PaddingLeft=UDim.new(0,6), PaddingTop=UDim.new(0,4)}, codeIn)
y = y + 86 Label(codeTab, "🔁 Cài đặt lặp", y) y = y + 14 Label(codeTab, "Số lần lặp:", y) local repIn = New("TextBox", { Size=UDim2.new(0,55,0,24), Position=UDim2.new(0,8,0,y+12), Text="1",
PlaceholderColor3=Color3.fromRGB(122, 130, 148), BackgroundColor3=Color3.fromRGB(26, 29, 38), BackgroundTransparency=0, TextColor3=Color3.fromRGB(233, 237, 245), Font=Enum.Font.GothamMedium, TextSize=12, BorderSizePixel=0,
ClearTextOnFocus=false, Active=true, Selectable=true, ZIndex=10, }, codeTab) Corner(repIn, UDim.new(0,5)) Stroke(repIn, Color3.fromRGB(180,180,200), 1.2) Label(codeTab, "Thời gian chờ:", y+36)
local delIn = New("TextBox", { Size=UDim2.new(0,55,0,24), Position=UDim2.new(0,8,0,y+50), Text="0",
PlaceholderColor3=Color3.fromRGB(122, 130, 148), BackgroundColor3=Color3.fromRGB(26, 29, 38), BackgroundTransparency=0, TextColor3=Color3.fromRGB(233, 237, 245), Font=Enum.Font.GothamMedium, TextSize=12, BorderSizePixel=0,
ClearTextOnFocus=false, Active=true, Selectable=true, ZIndex=10, }, codeTab) Corner(delIn, UDim.new(0,5)) Stroke(delIn, Color3.fromRGB(180,180,200), 1.2)
local unitBtn = New("TextButton", { Size=UDim2.new(0,48,0,20), Position=UDim2.new(0,75,0,y+50), Text="Giây ▾",
BackgroundColor3=Color3.fromRGB(26, 29, 38), BackgroundTransparency=0, TextColor3=C.DARK, Font=Enum.Font.GothamBold, TextSize=8, BorderSizePixel=0, ZIndex=10,
}, codeTab) Corner(unitBtn,UDim.new(0,4)); Stroke(unitBtn) local ddFrame = New("Frame", { Size=UDim2.new(0,48,0,40), Position=UDim2.new(0,75,0,y+70),
BackgroundColor3=Color3.fromRGB(26, 29, 38), BackgroundTransparency=0, BorderSizePixel=0, Visible=false, ZIndex=15, }, codeTab) Corner(ddFrame,UDim.new(0,4)); Stroke(ddFrame)
local secOpt = New("TextButton", { Size=UDim2.new(1,0,0,20), Text="Giây", BackgroundColor3=Color3.fromRGB(28, 31, 41),
BackgroundTransparency=0, TextColor3=C.DARK, Font=Enum.Font.GothamBold, TextSize=8, BorderSizePixel=0, ZIndex=16, }, ddFrame)
local minOpt = New("TextButton", { Size=UDim2.new(1,0,0,20), Position=UDim2.new(0,0,0,20), Text="Phút",
BackgroundColor3=Color3.fromRGB(28, 31, 41), BackgroundTransparency=0, TextColor3=C.DARK, Font=Enum.Font.GothamBold, TextSize=8, BorderSizePixel=0, ZIndex=16, }, ddFrame)
unitBtn.Activated:Connect(function() ddFrame.Visible=not ddFrame.Visible end) secOpt.Activated:Connect(function() unitBtn.Text="Giây ▾"; ddFrame.Visible=false end)
minOpt.Activated:Connect(function() unitBtn.Text="Phút ▾"; ddFrame.Visible=false end) trackConn(UserInputService.InputBegan:Connect(function(i,gp) if gp then return end
if i.UserInputType==Enum.UserInputType.MouseButton1 or i.UserInputType==Enum.UserInputType.Touch then local f = Hit.inObject(unitBtn, i.Position.X, i.Position.Y)
or Hit.inObject(ddFrame, i.Position.X, i.Position.Y) if not f then ddFrame.Visible=false end end end)) y = y + 78
local runBtn = Button(codeTab, "▶ Chạy Code", 8, y, 220, 20, Color3.fromRGB(0,160,90)) local stopBtn = Button(codeTab, "⏹ Dừng", 234, y, 90, 20, C.RED)
y = y + 24 local saveBtn = Button(codeTab, "💾 Lưu Vào Danh Sách", 8, y, 316, 20, C.BLUE) y = y + 24
local statusLbl = Label(codeTab, "", y) statusLbl.TextColor3=Color3.fromRGB(255, 205, 64); statusLbl.TextSize=9; statusLbl.ZIndex=6 y = y + 14
local countLbl = Label(codeTab, "🔄 Tổng số lần đã chạy: 0", y) countLbl.TextColor3=C.GREEN; countLbl.TextSize=9; countLbl.ZIndex=6
codeTab.CanvasSize = UDim2.new(0, 0, 0, y + 30) stopBtn.Activated:Connect(function() Cancel(); statusLbl.Text="⏹️ Đã dừng" end)
runBtn.Activated:Connect(function() local t=math.clamp(tonumber(repIn.Text)or 1,1,1000) local d=math.max(tonumber(delIn.Text)or 0,0) if unitBtn.Text:find("Phút") then d=d*60 end
local ok,err=RunCode(codeIn.Text,nameIn.Text,nil,t,d) if not ok then statusLbl.Text=err or "❌ Lỗi không xác định" else
statusLbl.Text="⏳ Đang thực thi..." task.spawn(function() while runActive do if cancelled then statusLbl.Text="⏹️ Đã dừng"; return end task.wait(0.1) end if not cancelled then
local rep7 = S.RunReportText() statusLbl.Text = (rep7 ~= "") and rep7
or ("✅ Hoàn thành!" .. (S.lastParkNote and (" · " .. S.lastParkNote) or "")) statusLbl.TextColor3 = (S.lastRunReport and S.lastRunReport.fail > 0
and S.lastRunReport.ok == 0) and C.RED or Color3.fromRGB(255, 205, 64) end countLbl.Text="🔄 Tổng số lần đã chạy: "..totalRuns
task.delay(1.5, function() if statusLbl and statusLbl.Parent and (S.lastParkNote or S.lastRunReport) then
local rep7 = S.RunReportText() if rep7 ~= "" then statusLbl.Text = rep7 end end end) end) end end) local RebuildScripts
saveBtn.Activated:Connect(function() local n=nameIn.Text local c=codeIn.Text if #c==0 then statusLbl.Text="⚠️ Vui lòng nhập code!"; return end
if #n==0 then n="Script "..(#scripts+1) end local bn=n local cnt=1 while true do local ex=false
for _,s in ipairs(scripts) do if s.name==n then ex=true; break end end if not ex then break end cnt = cnt + (1) ; n=bn.." ("..cnt..")" end
table.insert(scripts,{name=n, code=c, expanded=false}) if RebuildScripts then RebuildScripts() end
Store.saveSoon() statusLbl.Text="✅ Đã lưu vào Tab 'Code Đã Lưu'! (đã ghi xuống đĩa)" end) local sy = 8 Label(savedCodeTab, "💾 Danh Sách Script Đã Lưu", sy) sy = sy + 18
local searchIn = New("TextBox", { Size=UDim2.new(1,-16,0,26), Position=UDim2.new(0,8,0,sy), Text="",
PlaceholderText="🔍 Tìm kiếm script...", PlaceholderColor3=Color3.fromRGB(122, 130, 148), BackgroundColor3=Color3.fromRGB(26, 29, 38), BackgroundTransparency=0, TextColor3=Color3.fromRGB(233, 237, 245),
Font=Enum.Font.GothamMedium, TextSize=12, BorderSizePixel=0, ClearTextOnFocus=false, Active=true, Selectable=true, ZIndex=10, TextXAlignment=Enum.TextXAlignment.Left,
}, savedCodeTab) Corner(searchIn, UDim.new(0,5)) Stroke(searchIn, Color3.fromRGB(180,180,200), 1.2) New("UIPadding", {PaddingLeft=UDim.new(0,6)}, searchIn) sy = sy + 32
Store.statusLbl = New("TextLabel", { Size=UDim2.new(1,-110,0,20), Position=UDim2.new(0,8,0,sy), Text="💾 ...", BackgroundTransparency=1, TextColor3=C.GRAY, Font=Enum.Font.GothamMedium, TextSize=9,
TextXAlignment=Enum.TextXAlignment.Left, TextYAlignment=Enum.TextYAlignment.Center, TextTruncate=Enum.TextTruncate.AtEnd, ZIndex=7,
}, savedCodeTab) Store.reloadBtn = New("TextButton", { Size=UDim2.new(0,78,0,18), Position=UDim2.new(1,-86,0,sy),
Text="🔄 Nạp lại", BackgroundColor3=C.BLUE, BackgroundTransparency=0.1, TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=8, BorderSizePixel=0, ZIndex=8,
}, savedCodeTab) Corner(Store.reloadBtn, UDim.new(0,5)) Stroke(Store.reloadBtn, Color3.fromRGB(0,90,170), 1)
Store.refreshStatus = function() if not Store.statusLbl or not Store.statusLbl.Parent then return end local ns, nw, nf = #scripts, #waypoints, #featureTabs if Store.lastError then
Store.statusLbl.TextColor3=Color3.fromRGB(255, 160, 90) Store.statusLbl.Text = string.format("⚠️ %d script · %d WP · %d tab — %s", ns, nw, nf, Store.lastError)
elseif Store.mode == "file" then Store.statusLbl.TextColor3=Color3.fromRGB(58, 214, 140)
Store.statusLbl.Text = string.format("💾 %d script · %d WP · %d tab · %s%s", ns, nw, nf, Store.SAVE_FILE, Store.lastSavedAt and (" · lưu lúc " .. Store.lastSavedAt) or "")
elseif Store.mode == "memory" then Store.statusLbl.TextColor3=Color3.fromRGB(255, 205, 64)
Store.statusLbl.Text = string.format("⚠️ %d script · %d WP · %d tab — chỉ giữ trong phiên chơi này (executor thiếu writefile)", ns, nw, nf) elseif Store.mode == "empty" then
Store.statusLbl.TextColor3 = C.GRAY Store.statusLbl.Text = string.format("💾 Chưa lưu gì · sẽ ghi vào %s khi bạn bấm Lưu", Store.SAVE_FILE)
else Store.statusLbl.TextColor3 = C.GRAY Store.statusLbl.Text = "💾 Chưa lưu gì (executor thiếu writefile — chỉ giữ trong phiên chơi)" end end
S.DoReload = function() Store.load() RebuildScripts() S.Rebuild() if Store.restoreWaypoints then pcall(Store.restoreWaypoints) end if Store.restoreFeatures then pcall(Store.restoreFeatures) end
if Store.restoreSkins then pcall(Store.restoreSkins) end if Store.restoreObjTracks then pcall(Store.restoreObjTracks) end flash(Store.reloadBtn, "✅ Đã nạp", 1.4) end Store.reloadBtn.Activated:Connect(S.DoReload)
sy = sy + 24 local scriptList = New("Frame", { Size=UDim2.new(1,-16,0,0), Position=UDim2.new(0,8,0,sy), BackgroundTransparency=1, BorderSizePixel=0, ZIndex=6, }, savedCodeTab)
New("UIListLayout", {SortOrder=Enum.SortOrder.LayoutOrder, Padding=UDim.new(0,6)}, scriptList)
RebuildScripts = function() for _,c in ipairs(scriptList:GetChildren()) do if not c:IsA("UIListLayout") then c:Destroy() end end local term=searchIn.Text:lower() local disp={}
for _,d in ipairs(scripts) do if term=="" or d.name:lower():find(term,1,true) then table.insert(disp,d) end end if #disp==0 then New("TextLabel", {
Size=UDim2.new(1,0,0,40), Text=term~="" and "📭 Không tìm thấy script phù hợp" or "📭 Chưa có script nào được lưu",
BackgroundTransparency=1, TextColor3=C.GRAY, Font=Enum.Font.GothamMedium, TextSize=11, TextXAlignment=Enum.TextXAlignment.Center, TextYAlignment=Enum.TextYAlignment.Center, ZIndex=7,
}, scriptList) end local totalHeight = 0 for _, d in ipairs(disp) do local isExpanded = d.expanded or false local rowH = isExpanded and 160 or 42
local row = New("Frame", { Size=UDim2.new(1,0,0,rowH), BackgroundColor3=Color3.fromRGB(26, 29, 38),
BackgroundTransparency=0.1, BorderSizePixel=0, ZIndex=6, ClipsDescendants=true, }, scriptList) Corner(row,UDim.new(0,6)); Stroke(row)
local arrowBtn = New("TextButton", { Size=UDim2.new(0,20,0,20), Position=UDim2.new(0,6,0,10), Text=isExpanded and "▲" or "▼", BackgroundColor3=Color3.fromRGB(32, 36, 47), BackgroundTransparency=0,
TextColor3=C.BLUE, Font=Enum.Font.GothamBold, TextSize=9, BorderSizePixel=0, ZIndex=8, }, row) Corner(arrowBtn, UDim.new(0,4))
local nameLbl = New("TextLabel", { Size=UDim2.new(1,-150,0,40), Position=UDim2.new(0,32,0,0),
Text=d.name, BackgroundTransparency=1, TextColor3=C.DARK, Font=Enum.Font.GothamBold, TextSize=10, TextXAlignment=Enum.TextXAlignment.Left,
TextTruncate=Enum.TextTruncate.AtEnd, ZIndex=8, }, row) local delScriptBtn = New("TextButton", { Size=UDim2.new(0,48,0,20), Position=UDim2.new(1,-110,0,10),
Text="🗑 Xóa", BackgroundColor3=C.RED, BackgroundTransparency=0.1, TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=8, BorderSizePixel=0, ZIndex=8,
}, row) Corner(delScriptBtn, UDim.new(0,5)) local runScriptBtn = New("TextButton", { Size=UDim2.new(0,52,0,20), Position=UDim2.new(1,-58,0,10),
Text="▶ Chạy", BackgroundColor3=C.GREEN, BackgroundTransparency=0.1, TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=8, BorderSizePixel=0, ZIndex=8,
}, row) Corner(runScriptBtn, UDim.new(0,5)) if isExpanded then local codeBoxFrame = New("ScrollingFrame", {
Size=UDim2.new(1,-12,0,82), Position=UDim2.new(0,6,0,42), BackgroundColor3=Color3.fromRGB(24, 27, 35), BackgroundTransparency=0,
BorderSizePixel=0, ZIndex=8, ScrollBarThickness=4, CanvasSize=UDim2.new(0,0,0,0), AutomaticCanvasSize=Enum.AutomaticSize.Y, ScrollingDirection=Enum.ScrollingDirection.Y,
ScrollingEnabled=true, VerticalScrollBarInset=Enum.ScrollBarInset.ScrollBar, }, row) Corner(codeBoxFrame, UDim.new(0,5)) Stroke(codeBoxFrame, Color3.fromRGB(190,195,210), 1)
local codeLbl = New("TextBox", { Size=UDim2.new(1,-8,0,0), Position=UDim2.new(0,4,0,4),
AutomaticSize=Enum.AutomaticSize.Y, Text=d.code, TextColor3=Color3.fromRGB(226, 230, 240), BackgroundTransparency=1,
Font=Enum.Font.Code, TextSize=10, TextXAlignment=Enum.TextXAlignment.Left, TextYAlignment=Enum.TextYAlignment.Top, MultiLine=true, TextWrapped=true,
ClearTextOnFocus=false, TextEditable=false, Active=true, ZIndex=9, }, codeBoxFrame) local copyBtn = New("TextButton", { Size=UDim2.new(0,98,0,20), Position=UDim2.new(0,6,0,128),
Text="📋 Sao Chép Code", BackgroundColor3=C.BLUE, BackgroundTransparency=0.1, TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=8, BorderSizePixel=0, ZIndex=8,
}, row) Corner(copyBtn, UDim.new(0,5)) copyBtn.Activated:Connect(function() if S.CopyToClipboard(d.code) then
flash(copyBtn, "✅ Đã Sao Chép!", 1.5) else codeLbl:CaptureFocus() codeLbl.SelectionStart = 1 codeLbl.CursorPosition = #d.code + 1 flash(copyBtn, "⚠️ Đã Bôi Đen Code", 1.5) end end) end
arrowBtn.Activated:Connect(function() d.expanded = not d.expanded RebuildScripts() Store.saveSoon() end) runScriptBtn.Activated:Connect(function() local prev = runScriptBtn.Text
local prevColor = runScriptBtn.TextColor3 RunCode(d.code, d.name, runScriptBtn, 1, 0) runScriptBtn.Text = "⏳ ..."
task.spawn(function() local waited = 0 while runActive and waited < 60 do task.wait(0.1); waited = waited + 0.1 end task.wait(0.4)
local rep = S.lastRunReport local txt = S.RunReportText() local bad = rep and rep.fail > 0 and rep.ok == 0 if bad then runScriptBtn.Text = "❌ lỗi" runScriptBtn.TextColor3 = C.RED
elseif rep and (rep.guis or 0) > 0 then runScriptBtn.Text = "🧩 vào tab" elseif rep and rep.parked then runScriptBtn.Text = "🪟 ngoài MH" else
runScriptBtn.Text = "✅ xong" end pcall(function() if Store.statusLbl and Store.statusLbl.Parent then
Store.statusLbl.Text = "▶ '" .. tostring(d.name) .. "' · " .. (txt ~= "" and txt or "xong") Store.statusLbl.TextColor3 = bad and C.RED or C.GRAY end
end) task.delay(2.2, function() if runScriptBtn and runScriptBtn.Parent then runScriptBtn.Text = prev runScriptBtn.TextColor3 = prevColor end end) end) end)
delScriptBtn.Activated:Connect(function() local origIdx = nil for idx, s in ipairs(scripts) do if s == d then origIdx = idx; break end
end if origIdx then table.remove(scripts, origIdx) RebuildScripts() Store.saveSoon() end end)
totalHeight = totalHeight + rowH + 6 end local listH = math.max(totalHeight, 40) scriptList.Size = UDim2.new(1,-16,0,listH)
savedCodeTab.CanvasSize = UDim2.new(0, 0, 0, sy + listH + 30) if Store.refreshStatus then Store.refreshStatus() end end
searchIn:GetPropertyChangedSignal("Text"):Connect(function() S.Debounce("savedSearch", 0.18, RebuildScripts) end) RebuildScripts()
local supportTab = AddTab("Hỗ Trợ", "🛠", 5)
S.AnaUi = S.AnaUi or {} S.AnaUi.supportTabIndex = #tabContent local posY = 8 Label(supportTab, "⚡ Script Nhanh - Nhấn để chạy ngay", posY) posY = posY + 16
local quickScripts = { {n="Dex Explorer", d="Mở Dex Explorer", c=[[loadstring(game:HttpGet("https://raw.githubusercontent.com/infyiff/backup/main/dex.lua"))()]], cl=Color3.fromRGB(72, 148, 248)},
{n="Infinite Yield", d="Admin Commands", c=[[loadstring(game:HttpGet("https://raw.githubusercontent.com/EdgeIY/infiniteyield/master/source"))()]], cl=C.PURPLE}, {n="SimpleSpy v3", d="Theo dõi RemoteEvent & RemoteFunction", c=[[loadstring(game:HttpGetAsync("https://raw.githubusercontent.com/78n/SimpleSpy/main/SimpleSpyBeta.lua"))()]], cl=Color3.fromRGB(38, 194, 118)},
} for _, s in ipairs(quickScripts) do local btn = New("TextButton", {
Size=UDim2.new(1,-16,0,22), Position=UDim2.new(0,8,0,posY), Text="", BackgroundColor3=s.cl, BackgroundTransparency=0.3, BorderSizePixel=0, ZIndex=6,
}, supportTab) Corner(btn, UDim.new(0,5)) Stroke(btn, s.cl, 1.2) New("TextLabel", {
Size=UDim2.new(1,-10,1,0), Position=UDim2.new(0,10,0,0), Text=s.n.." — "..s.d, BackgroundTransparency=1, TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=8,
TextXAlignment=Enum.TextXAlignment.Left, TextYAlignment=Enum.TextYAlignment.Center, ZIndex=7, }, btn) btn.Activated:Connect(function() RunCode(s.c, s.n, nil, 1, 0, true) end) posY = posY + 26 end
posY = posY + 6 Label(supportTab, "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", posY) posY = posY + 16 Label(supportTab, "🛠 Hỗ Trợ — Phân Tích Tọa Độ", posY) posY = posY + 18
Label(supportTab, "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", posY) posY = posY + 16 local analyzeObjectEnabled = false local highlightEnabled = true
local objectAnalyzeBtn = Button(supportTab, "🎯 Phân Tích Vật Thể: TẮT", 8, posY, 260, 20, C.GRAY) local clearObjectBtn = Button(supportTab, "🧹 Xóa KQ", 274, posY, 76, 20, C.RED) posY = posY + 24
local highlightToggleBtn = Button(supportTab, "💜 Highlight Tím: BẬT", 8, posY, 260, 20, C.PURPLE) local removeHighlightBtn = Button(supportTab, "❌ Xóa Highlight", 274, posY, 76, 20, C.RED)
posY = posY + 24 S.AnaUi = S.AnaUi or {} S.AnaUi.devLbl = Label(supportTab, "📱/🖥 Đang nhận diện thiết bị...", posY)
S.AnaUi.devLbl.TextSize = 9 S.AnaUi.devLbl.TextColor3 = C.ACCENT posY = posY + 16 S.AnaUi.centerBtn = Button(supportTab, "⊕ Vật thể ở GIỮA màn hình", 8, posY, 180, 20, C.BLUE)
S.AnaUi.nearBtn   = Button(supportTab, "🧭 Vật thể GẦN nhất", 194, posY, 156, 20, C.ORANGE) posY = posY + 24
S.AnaUi.skipGuiBtn = Button(supportTab, "🛡 Phân tích xuyên HUD game: BẬT", 8, posY, 206, 18, C.GREEN) S.AnaUi.scanFbBtn  = Button(supportTab, "🧭 Quét dự phòng: BẬT", 220, posY, 130, 18, C.GREEN) posY = posY + 22
S.AnaUi.centerAimBtn = Button(supportTab, "🔴 Ngắm tâm: TẮT", 8, posY, 170, 18, C.GRAY) S.AnaUi.aimButtonMoveEnabled = false
S.AnaUi.aimMoveBtn = Button(supportTab, "🔒 Kéo nút: TẮT", 184, posY, 166, 18, C.GRAY) posY = posY + 22
S.AnaUi.aimMoveBtn.Activated:Connect(function() local moveEnabled = not (S.AnaUi.aimButtonMoveEnabled == true) S.AnaUi.aimButtonMoveEnabled = moveEnabled if not moveEnabled then
S.AnaUi.aimButtonDragging = false S.AnaUi.aimButtonDragInput = nil S.AnaUi.aimButtonDragMoved = false S.AnaUi.aimButtonSuppressUntil = 0 end
S.AnaUi.aimMoveBtn.Text = moveEnabled and "🔓 Kéo nút: BẬT" or "🔒 Kéo nút: TẮT" D.SetBg(S.AnaUi.aimMoveBtn, moveEnabled and C.ORANGE or C.GRAY)
S.AnaSay(moveEnabled and "🔓 Đã mở khóa: kéo nút 🔎 để đổi vị trí" or "🔒 Đã khóa vị trí nút 🔎") end)
S.AnaUi.whyLbl = Label(supportTab, "🔎 Lý do: — (bật 🎯 Phân Tích Vật Thể rồi chạm/chuột phải vào vật)", posY) S.AnaUi.whyLbl.TextSize = 9 posY = posY + 16
Label(supportTab, "💡 Bật “Kéo nút” cạnh Ngắm tâm, đóng menu rồi kéo nút 🔎 đến chỗ muốn.", posY) Label(supportTab, "    Tắt “Kéo nút” để khóa; chạm 🔎 để phân tích vật đang ở tâm.", posY+14)
Label(supportTab, "    Ngắm tâm định vị cả tường đi xuyên được (chợ/map CanCollide=false) — không cần tia vật lý.", posY+28) Label(supportTab, "    Nút HUD/menu của game vẫn theo tùy chọn phân tích xuyên HUD ở trên.", posY+42) posY = posY + 58
local objResultPanel = New("Frame", { Size=UDim2.new(1,-16,0,190), Position=UDim2.new(0,8,0,posY), BackgroundColor3=Color3.fromRGB(20, 25, 35),
BackgroundTransparency=0, BorderSizePixel=0, ZIndex=6, Visible=false, }, supportTab) Corner(objResultPanel, UDim.new(0,6)) Stroke(objResultPanel, C.PURPLE, 1.5)
New("TextLabel", {
Size=UDim2.new(1,-16,0,16), Position=UDim2.new(0,8,0,4), Text="🎯 VẬT THỂ ĐƯỢC CHỌN", BackgroundTransparency=1,
TextColor3=Color3.fromRGB(180, 130, 255), Font=Enum.Font.GothamBold, TextSize=10, TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7, }, objResultPanel)
local objNameLbl = New("TextLabel", { Size=UDim2.new(1,-16,0,16), Position=UDim2.new(0,8,0,22), Text="Name: ...", BackgroundTransparency=1, TextColor3=Color3.fromRGB(255, 255, 100),
Font=Enum.Font.Code, TextSize=10, TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7, }, objResultPanel)
local objClassLbl = New("TextLabel", { Size=UDim2.new(1,-16,0,16), Position=UDim2.new(0,8,0,38), Text="Class: ...", BackgroundTransparency=1, TextColor3=Color3.fromRGB(200, 200, 255),
Font=Enum.Font.Code, TextSize=10, TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7, }, objResultPanel)
local objPosLbl = New("TextLabel", { Size=UDim2.new(1,-16,0,16), Position=UDim2.new(0,8,0,54), Text="Position: ...", BackgroundTransparency=1, TextColor3=Color3.fromRGB(255, 180, 180),
Font=Enum.Font.Code, TextSize=10, TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7, }, objResultPanel)
local objSizeLbl = New("TextLabel", { Size=UDim2.new(1,-16,0,16), Position=UDim2.new(0,8,0,70), Text="Size: ...", BackgroundTransparency=1, TextColor3=Color3.fromRGB(180, 255, 180),
Font=Enum.Font.Code, TextSize=10, TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7, }, objResultPanel)
local objRotLbl = New("TextLabel", { Size=UDim2.new(1,-16,0,16), Position=UDim2.new(0,8,0,86), Text="Rotation: ...", BackgroundTransparency=1, TextColor3=Color3.fromRGB(180, 220, 255),
Font=Enum.Font.Code, TextSize=10, TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7, }, objResultPanel)
local objLookLbl = New("TextLabel", { Size=UDim2.new(1,-16,0,16), Position=UDim2.new(0,8,0,102), Text="Look: ...", BackgroundTransparency=1, TextColor3=Color3.fromRGB(220, 200, 255),
Font=Enum.Font.Code, TextSize=10, TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7, }, objResultPanel)
local objMatLbl = New("TextLabel", { Size=UDim2.new(1,-16,0,16), Position=UDim2.new(0,8,0,118), Text="Material: ...", BackgroundTransparency=1, TextColor3=Color3.fromRGB(255, 220, 180),
Font=Enum.Font.Code, TextSize=10, TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7, }, objResultPanel)
local objColorLbl = New("TextLabel", { Size=UDim2.new(1,-16,0,16), Position=UDim2.new(0,8,0,134), Text="Color: ...", BackgroundTransparency=1, TextColor3=Color3.fromRGB(255, 180, 220),
Font=Enum.Font.Code, TextSize=10, TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7, }, objResultPanel)
local objPathLbl = New("TextLabel", { Size=UDim2.new(1,-16,0,16), Position=UDim2.new(0,8,0,150), Text="Path: ...", BackgroundTransparency=1, TextColor3=Color3.fromRGB(180, 255, 220),
Font=Enum.Font.Code, TextSize=9, TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7, TextTruncate=Enum.TextTruncate.AtEnd, }, objResultPanel)
local copyObjBtn = New("TextButton", { Size=UDim2.new(0,96,0,18), Position=UDim2.new(0,8,0,168),
Text="📋 Copy Tọa Độ", BackgroundColor3=C.BLUE, BackgroundTransparency=0.1, TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=8, BorderSizePixel=0, ZIndex=8,
}, objResultPanel) Corner(copyObjBtn, UDim.new(0,4)) local copyPathBtn = New("TextButton", { Size=UDim2.new(0,96,0,18), Position=UDim2.new(0,110,0,168),
Text="📋 Copy Path", BackgroundColor3=C.PURPLE, BackgroundTransparency=0.1, TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=8, BorderSizePixel=0, ZIndex=8,
}, objResultPanel) Corner(copyPathBtn, UDim.new(0,4)) posY = posY + 198
Label(supportTab, "📍 Tọa Độ Hiện Tại (Real-time)", posY) posY = posY + 16 local coordDisplay = New("Frame", { Size=UDim2.new(1,-16,0,290),
Position=UDim2.new(0,8,0,posY), BackgroundColor3=Color3.fromRGB(30, 35, 45), BackgroundTransparency=0, BorderSizePixel=0,
ZIndex=6, }, supportTab) Corner(coordDisplay, UDim.new(0,6)) Stroke(coordDisplay, C.BLUE, 1.5) local function CreateCoordRow(parent, yPos, labelText, labelColor, valueDefault) New("TextLabel", {
Size=UDim2.new(0,90,0,16), Position=UDim2.new(0,8,0,yPos), Text=labelText, BackgroundTransparency=1, TextColor3=labelColor,
Font=Enum.Font.GothamBold, TextSize=10, TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7, }, parent) return New("TextLabel", {
Size=UDim2.new(1,-100,0,16), Position=UDim2.new(0,100,0,yPos), Text=valueDefault or "...", BackgroundTransparency=1,
TextColor3=Color3.fromRGB(255,255,255), Font=Enum.Font.Code, TextSize=10, TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7, }, parent) end
New("TextLabel", { Size=UDim2.new(1,-16,0,14), Position=UDim2.new(0,8,0,4), Text="📍 POSITION (DƯỚI CHÂN)", BackgroundTransparency=1, TextColor3=Color3.fromRGB(255, 200, 100),
Font=Enum.Font.GothamBold, TextSize=9, TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7, }, coordDisplay)
local xValLbl = CreateCoordRow(coordDisplay, 20, "X:", Color3.fromRGB(255,100,100), "0.000") local yValLbl = CreateCoordRow(coordDisplay, 36, "Y:", Color3.fromRGB(100,255,100), "0.000")
local zValLbl = CreateCoordRow(coordDisplay, 52, "Z:", Color3.fromRGB(100,150,255), "0.000") New("TextLabel", { Size=UDim2.new(1,-16,0,14), Position=UDim2.new(0,8,0,72),
Text="📦 SIZE", BackgroundTransparency=1, TextColor3=Color3.fromRGB(255, 200, 100), Font=Enum.Font.GothamBold, TextSize=9, TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7, }, coordDisplay)
local sizeXValLbl = CreateCoordRow(coordDisplay, 88, "Size X:", Color3.fromRGB(255,150,150), "0.000") local sizeYValLbl = CreateCoordRow(coordDisplay, 104, "Size Y:", Color3.fromRGB(150,255,150), "0.000")
local sizeZValLbl = CreateCoordRow(coordDisplay, 120, "Size Z:", Color3.fromRGB(150,180,255), "0.000")
New("TextLabel", { Size=UDim2.new(1,-16,0,14), Position=UDim2.new(0,8,0,140), Text="🧭 ROTATION", BackgroundTransparency=1, TextColor3=Color3.fromRGB(255, 200, 100),
Font=Enum.Font.GothamBold, TextSize=9, TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7, }, coordDisplay)
local rotPValLbl = CreateCoordRow(coordDisplay, 156, "Pitch (X):", Color3.fromRGB(255,150,150), "0.0°") local rotYValLbl = CreateCoordRow(coordDisplay, 172, "Yaw (Y):", Color3.fromRGB(150,255,150), "0.0°")
local rotRValLbl = CreateCoordRow(coordDisplay, 188, "Roll (Z):", Color3.fromRGB(150,180,255), "0.0°")
New("TextLabel", { Size=UDim2.new(1,-16,0,14), Position=UDim2.new(0,8,0,206), Text="👁 LOOK / STATE / HP", BackgroundTransparency=1, TextColor3=Color3.fromRGB(255, 200, 100),
Font=Enum.Font.GothamBold, TextSize=9, TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7, }, coordDisplay)
local lookValLbl = New("TextLabel", { Size=UDim2.new(1,-16,0,16), Position=UDim2.new(0,8,0,222), Text="Look: ...", BackgroundTransparency=1, TextColor3=Color3.fromRGB(200,220,255),
Font=Enum.Font.Code, TextSize=10, TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7, }, coordDisplay)
local stateValLbl = New("TextLabel", { Size=UDim2.new(1,-16,0,16), Position=UDim2.new(0,8,0,240), Text="State: ...", BackgroundTransparency=1, TextColor3=Color3.fromRGB(200,255,200),
Font=Enum.Font.Code, TextSize=10, TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7, }, coordDisplay)
local hpValLbl = New("TextLabel", { Size=UDim2.new(1,-16,0,16), Position=UDim2.new(0,8,0,258), Text="HP: ...", BackgroundTransparency=1, TextColor3=Color3.fromRGB(255,200,200),
Font=Enum.Font.Code, TextSize=10, TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7, }, coordDisplay) local placeLbl = New("TextLabel", { Size=UDim2.new(1,-16,0,14), Position=UDim2.new(0,8,0,274),
Text="Place: ...", BackgroundTransparency=1, TextColor3=Color3.fromRGB(150, 200, 255), Font=Enum.Font.GothamMedium, TextSize=9, TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7, }, coordDisplay)
posY = posY + 298 local lastPos = Vector3.new() local lastSize = Vector3.new() local lastRot = Vector3.new() local lastLook = Vector3.new() local lastState = "" local lastHp = -1
local function GetRootPart() if S.Move and S.Move.Root then local ok, r = pcall(S.Move.Root) if ok and r and r.Parent then return r end
end local char = player.Character if not char then return nil end local humanoid = char:FindFirstChildOfClass("Humanoid")
local rootPart = (humanoid and humanoid.RootPart) or char:FindFirstChild("HumanoidRootPart")
or char.PrimaryPart or char:FindFirstChild("UpperTorso") or char:FindFirstChild("Torso") return rootPart end
local _groundParams = nil local _groundChar = nil local function GetGroundPosition() local char = player.Character
if not char then return nil end local rootPart = GetRootPart() if not rootPart then return nil end
local origin = rootPart.Position local direction = Vector3.new(0, -500, 0) if not _groundParams or _groundChar ~= char then
_groundChar = char local ok, p = pcall(function() return RaycastParams.new() end) if ok and p then pcall(function() p.FilterType = Enum.RaycastFilterType.Exclude end)
pcall(function() p.FilterDescendantsInstances = {char} end) pcall(function() p.IgnoreWater = false end) _groundParams = p end
else pcall(function() _groundParams.FilterDescendantsInstances = {char} end) end local params = _groundParams
if not params then params = RaycastParams.new() params.FilterType = Enum.RaycastFilterType.Exclude params.FilterDescendantsInstances = {char} params.IgnoreWater = false end
local result = workspace:Raycast(origin, direction, params) if result then
return result.Position, result.Instance, result.Normal, result.Material end return nil end local coordAcc = 0 local coordLbls
local function coordNA(all) coordLbls = coordLbls or {xValLbl, yValLbl, zValLbl, sizeXValLbl, sizeYValLbl, sizeZValLbl,
rotPValLbl, rotYValLbl, rotRValLbl} for _, l in ipairs(coordLbls) do pcall(function() l.Text = "N/A" end) end if all then
lookValLbl.Text = "Look: N/A" stateValLbl.Text = "State: N/A" hpValLbl.Text = "HP: N/A" end end S.Coord = S.Coord or { _conn = nil, _bound = false } function S.Coord.IsActive()
if S.PagePerf and S.PagePerf.ShouldRunForSupportTab then return S.PagePerf.ShouldRunForSupportTab() end local ok1 = pcall(function() return main and main.Visible end)
local ok2 = pcall(function() return supportTab and supportTab.Visible end) return ok1 and ok2 end function S.Coord.Bind(on)
on = (on == true) if on and not S.Coord._bound then S.Coord._bound = true elseif (not on) and S.Coord._bound then
S.Coord._bound = false if S.Coord._conn then pcall(function() S.Coord._conn:Disconnect() end) S.Coord._conn = nil end return end
if not S.Coord._bound then return end if S.Coord._conn then return end S.Coord._conn = RunService.RenderStepped:Connect(function(stepDt) coordAcc = coordAcc + (tonumber(stepDt) or 0.016)
if coordAcc < 0.15 then return end coordAcc = 0
if not S.Coord.IsActive() then return end if S.PagePerf and not S.PagePerf.ShouldRunForSupportTab() then return end
if not (main and main.Visible) then return end if not (supportTab and supportTab.Visible) then return end local char = player.Character if not char then coordNA(true) return end
local humanoid = char:FindFirstChildOfClass("Humanoid") local rootPart = GetRootPart() if not rootPart then coordNA()
return end local groundPos = GetGroundPosition() local displayPos = groundPos or rootPart.CFrame.Position
local cf = rootPart.CFrame local size = rootPart.Size local rx, ry, rz = cf:ToOrientation() local look = cf.LookVector
if (displayPos - lastPos).Magnitude > 0.001 then lastPos = displayPos xValLbl.Text = string.format("%.3f", displayPos.X) yValLbl.Text = string.format("%.3f", displayPos.Y)
zValLbl.Text = string.format("%.3f", displayPos.Z) end if (size - lastSize).Magnitude > 0.001 then lastSize = size
sizeXValLbl.Text = string.format("%.3f", size.X) sizeYValLbl.Text = string.format("%.3f", size.Y)
sizeZValLbl.Text = string.format("%.3f", size.Z) end local newRot = Vector3.new(rx, ry, rz) if (newRot - lastRot).Magnitude > 0.001 then
lastRot = newRot rotPValLbl.Text = string.format("%.1f°", math.deg(rx)) rotYValLbl.Text = string.format("%.1f°", math.deg(ry)) rotRValLbl.Text = string.format("%.1f°", math.deg(rz)) end
if (look - lastLook).Magnitude > 0.001 then lastLook = look lookValLbl.Text = string.format("Look: %.3f, %.3f, %.3f", look.X, look.Y, look.Z) end
if humanoid then local state = humanoid:GetState() if state ~= lastState then lastState = state
stateValLbl.Text = "State: "..tostring(state):gsub("Enum.HumanoidStateType.", "") end local hp = math.floor(humanoid.Health) if hp ~= lastHp then
lastHp = hp hpValLbl.Text = string.format("HP: %d / %d", hp, math.floor(humanoid.MaxHealth)) end else stateValLbl.Text = "State: No Humanoid" hpValLbl.Text = "HP: N/A" end
if placeLbl.Text == "Place: ..." and (os.clock() - (D.placeTryAt or -99)) >= 10 then D.placeTryAt = os.clock()
pcall(function() local info = game:GetService("MarketplaceService"):GetProductInfo(game.PlaceId) placeLbl.Text = "Place: "..game.PlaceId.." — "..info.Name end) end end)
S.Coord._conn = S.Coord._conn or nil if S.Coord._conn then trackConn(S.Coord._conn) end end function S.Coord.RefreshBind()
if S.Coord.IsActive() then S.Coord.Bind(true) else if S.Coord._conn then pcall(function() S.Coord._conn:Disconnect() end) S.Coord._conn = nil end
S.Coord._bound = false end end pcall(function() S.Coord.RefreshBind() end) local currentHighlight = nil local function RemoveCurrentHighlight() if currentHighlight then
pcall(function() currentHighlight:Destroy() end) currentHighlight = nil end end local function CreateHighlight(target) if not target then RemoveCurrentHighlight() return
end if not target:IsA("BasePart") then return end if currentHighlight and currentHighlight.Parent and currentHighlight.Adornee == target then
return
end RemoveCurrentHighlight() local hl = Instance.new("Highlight") hl.Name = "BananaCatHub_Highlight"
hl.Adornee = target hl.FillColor = Color3.fromRGB(160, 60, 255) hl.FillTransparency = 0.7 hl.OutlineColor = Color3.fromRGB(200, 100, 255)
hl.OutlineTransparency = 0 hl.DepthMode = Enum.HighlightDepthMode.AlwaysOnTop hl.Parent = target currentHighlight = hl end
local function GetFullPath(obj) if not obj then return "nil" end local parts = {} local cur = obj
while cur and cur ~= game do table.insert(parts, 1, cur.Name) cur = cur.Parent end return table.concat(parts, ".") end S.AnaCfg = S.AnaCfg or {
skipGameGui  = true,
scanFallback = true,
ignoreWater  = true,
holdTime     = 0.4,
holdMove     = 18,
maxDist      = 10000,
} S.AnaUi   = S.AnaUi or {} S.AnaLast = S.AnaLast or {ok = false, why = nil, name = nil, how = nil} S.AnaNote = nil
S.AnaWhyScan = nil function S.AnaCam() local cam = workspace.CurrentCamera if not cam then pcall(function() cam = camera end) end return cam end
function S.AnaSay(msg) S.AnaLast.why = tostring(msg or "") pcall(function() local l = S.AnaUi.whyLbl
if l and l.Parent then l.Text = "🔎 " .. tostring(msg) end end) pcall(function() print("[taodepzai v5.0 NOIR] 🔎 " .. tostring(msg)) end) end
function S.DeviceText() local touch, mouse = false, false
pcall(function() touch = (UserInputService.TouchEnabled == true) end) pcall(function() mouse = (UserInputService.MouseEnabled == true) end)
local hold = string.format("%.2f", S.AnaCfg.holdTime) if touch and mouse then return "🖥📱 Máy có cảm ứng: CHUỘT PHẢI hoặc GIỮ NGÓN " .. hold .. "s lên vật · hoặc bấm ⊕ Giữa màn hình"
elseif touch then return "📱 Điện thoại: GIỮ NGÓN " .. hold .. "s lên vật (chạm nhanh vẫn đi/bắn bình thường) · hoặc ⊕ Giữa màn hình"
elseif mouse then return "🖥 Máy tính: CHUỘT PHẢI vào vật (chuột trái vẫn chơi bình thường) · hoặc ⊕ Giữa màn hình"
end return "🎮 Chưa rõ thiết bị: dùng ⊕ Giữa màn hình hoặc 🧭 Gần nhất — nền tảng nào cũng chạy" end function S.RefreshDevLabel() pcall(function()
local l = S.AnaUi.devLbl if l and l.Parent then l.Text = S.DeviceText() end end) end function S.GuiBlockAt(x, y) local hard, soft = nil, nil local vpx, vpy = 1280, 720 pcall(function()
local cam2 = S.AnaCam() if cam2 then vpx, vpy = cam2.ViewportSize.X, cam2.ViewportSize.Y end end) local bigArea = vpx * vpy * 0.36
local conts = {} pcall(function() conts[#conts+1] = playerGui end) pcall(function() conts[#conts+1] = game:GetService("CoreGui") end)
for _, cont in ipairs(conts) do local ok, objs = pcall(function() return cont:GetGuiObjectsAtPosition(x, y) end)
if ok and type(objs) == "table" then for _, o in ipairs(objs) do local isAimDot = false pcall(function()
local dot = S.AnaUi and S.AnaUi.aimDot isAimDot = dot and (o == dot or o:IsDescendantOf(dot)) or false end) if not isAimDot then local area, trans, isAct = 0, 1, false
pcall(function() area = o.AbsoluteSize.X * o.AbsoluteSize.Y end) pcall(function() trans = o.BackgroundTransparency end)
pcall(function() isAct = (o.Active == true) end) local interactive = (o:IsA("GuiButton") or o:IsA("TextBox"))
local tag = tostring(o.Name) .. " (" .. tostring(o.ClassName) .. ")" if interactive and area < bigArea then hard = hard or tag
elseif interactive or isAct or trans < 0.5 then soft = soft or tag end end end end end return hard, soft end
function S.RayObbHit(origin, dir, part, maxD) if not origin or not dir or not part then return nil end maxD = tonumber(maxD) or 10000
local ok, tHit, hitPos = pcall(function() local size = part.Size if not size then return nil end local ox, oy, oz, dx, dy, dz local cf = part.CFrame
if cf and type(cf.PointToObjectSpace) == "function" and type(cf.VectorToObjectSpace) == "function" then local lo = cf:PointToObjectSpace(origin) local ld = cf:VectorToObjectSpace(dir)
ox, oy, oz, dx, dy, dz = lo.X, lo.Y, lo.Z, ld.X, ld.Y, ld.Z else local p = (cf and cf.Position) or part.Position if not p then return nil end
ox, oy, oz = origin.X - p.X, origin.Y - p.Y, origin.Z - p.Z dx, dy, dz = dir.X, dir.Y, dir.Z end
local hx, hy, hz = size.X * 0.5, size.Y * 0.5, size.Z * 0.5 local tmin, tmax = 0, maxD
local function slab(o, d, h) if math.abs(d) < 1e-8 then return o >= -h and o <= h end local inv = 1 / d local t1, t2 = (-h - o) * inv, (h - o) * inv
if t1 > t2 then t1, t2 = t2, t1 end if t1 > tmin then tmin = t1 end if t2 < tmax then tmax = t2 end return tmin <= tmax end
if not slab(ox, dx, hx) then return nil end if not slab(oy, dy, hy) then return nil end if not slab(oz, dz, hz) then return nil end
if tmax < 0 or tmin > maxD then return nil end local t = tmin if t < 0 then t = 0 end if t > maxD then return nil end
return t, Vector3.new(origin.X + dir.X * t, origin.Y + dir.Y * t, origin.Z + dir.Z * t) end) if ok then return tHit, hitPos end return nil end
function S.ChooseCloserPick(rayInst, rayDist, scanPart, scanT) local hasRay = rayInst ~= nil local hasScan = scanPart ~= nil local rt, st = tonumber(rayDist), tonumber(scanT)
if hasScan and ((not hasRay) or (st ~= nil and rt ~= nil and st + 0.05 < rt) or (st ~= nil and rt == nil)) then return "scan" end if hasRay then return "ray" end return nil end
function S.PickByRayScan(ray, filterList) if not ray or not ray.Origin or not ray.Direction then return nil, "không có tia ngắm hợp lệ" end
local dir = ray.Direction local dirMagnitude = dir.Magnitude if dirMagnitude < 0.001 then return nil, "tia ngắm không có hướng hợp lệ" end
dir = Vector3.new(dir.X / dirMagnitude, dir.Y / dirMagnitude, dir.Z / dirMagnitude)
local maxD = tonumber(S.AnaCfg and S.AnaCfg.maxDist) or 10000 if maxD ~= maxD or maxD == math.huge or maxD <= 0 then maxD = 10000 end maxD = math.clamp(maxD, 1, 10000)
local corridor = 10 local function makeOp() local overlap = OverlapParams.new() overlap.FilterType = Enum.RaycastFilterType.Exclude
overlap.FilterDescendantsInstances = filterList or {} pcall(function() overlap.MaxParts = 1024 end) pcall(function() overlap.RespectCanCollide = false end)
pcall(function() overlap.BruteForceAllSlow = true end) return overlap end local okParams, op = pcall(makeOp)
if not okParams or not op then return nil, "không tạo được bộ lọc quét vật thể" end local seen = {} local up = (math.abs(dir.Y) > 0.98) and Vector3.new(0, 0, 1) or Vector3.new(0, 1, 0)
local best, bestT, bestPos, bestOff = nil, math.huge, nil, math.huge local scanned = 0
local function skipFiltered(pt) if not filterList then return false end for _, f in ipairs(filterList) do if f and (pt == f or (type(pt.IsDescendantOf) == "function" and pt:IsDescendantOf(f))) then return true end end return false end
local function consider(pt) if not pt or seen[pt] or skipFiltered(pt) then return end seen[pt] = true scanned = scanned + 1
local t, pos = S.RayObbHit(ray.Origin, dir, pt, maxD) if type(t) == "number" and t < bestT then best, bestT, bestPos = pt, t, pos
local okO, off = pcall(function() return (pt.Position - Vector3.new(ray.Origin.X + dir.X * t, ray.Origin.Y + dir.Y * t, ray.Origin.Z + dir.Z * t)).Magnitude end) bestOff = (okO and off) or 0
else local okV, along, offset = pcall(function() local relX, relY, relZ = pt.Position.X - ray.Origin.X, pt.Position.Y - ray.Origin.Y, pt.Position.Z - ray.Origin.Z
local tt = relX * dir.X + relY * dir.Y + relZ * dir.Z if tt <= 0.5 or tt > maxD then return nil end
local cx, cy, cz = ray.Origin.X + dir.X * tt, ray.Origin.Y + dir.Y * tt, ray.Origin.Z + dir.Z * tt
local lateral = math.sqrt((pt.Position.X - cx)^2 + (pt.Position.Y - cy)^2 + (pt.Position.Z - cz)^2)
local half = math.max(pt.Size.X, pt.Size.Y, pt.Size.Z) / 2 if lateral > math.max(corridor, half + 2) then return nil end return tt, lateral end)
if okV and along and along < bestT then best, bestT, bestOff = pt, along, offset bestPos = Vector3.new(ray.Origin.X + dir.X * along, ray.Origin.Y + dir.Y * along, ray.Origin.Z + dir.Z * along) end end end
local stepLen = 80 for startD = 0, maxD, stepLen do local length = math.min(stepLen, maxD - startD) if length > 0 then
local sample = Vector3.new(ray.Origin.X + dir.X * (startD + length / 2), ray.Origin.Y + dir.Y * (startD + length / 2), ray.Origin.Z + dir.Z * (startD + length / 2))
local boxCFrame = CFrame.lookAt(sample, Vector3.new(sample.X + dir.X, sample.Y + dir.Y, sample.Z + dir.Z), up)
local okBox, boxParts = pcall(function() return workspace:GetPartBoundsInBox(boxCFrame, Vector3.new(corridor * 2, corridor * 2, length + corridor), op) end)
if okBox and type(boxParts) == "table" then for _, pt in ipairs(boxParts) do consider(pt) end else
local okRadius, around = pcall(function() return workspace:GetPartBoundsInRadius(sample, length / 2 + corridor, op) end)
if okRadius and type(around) == "table" then for _, pt in ipairs(around) do consider(pt) end end end
if bestT <= startD + length then break end end end
if not best then local okDesc, desc = pcall(function() return workspace:GetDescendants() end) if okDesc and type(desc) == "table" then local n = 0
for _, d in ipairs(desc) do if n >= 1500 then break end local okP, isPart = pcall(function() return d:IsA("BasePart") end) if okP and isPart then n = n + 1 consider(d) if bestT <= 120 then break end end end end end
if not best then if scanned == 0 then return nil, string.format("không tìm thấy vật quanh tia trong %.0f studs", maxD) end
return nil, "quét " .. scanned .. " vật nhưng không vật nào nằm trên tia trong " .. string.format("%.0f", maxD) .. " studs" end
local note = string.format("quét xuyên tường · %.0f studs · lệch tâm %.1f studs", bestT, bestOff or 0)
pcall(function() local cc, cq = best.CanCollide, best.CanQuery if cc == false or cq == false then
note = note .. " · đi xuyên được (CanCollide=" .. tostring(cc) .. ", CanQuery=" .. tostring(cq) .. ")" end end)
return best, note, bestPos, bestT end function S.NearestParts(n) local char = player.Character
local root = char and char:FindFirstChild("HumanoidRootPart") if not root then return nil, "chưa có nhân vật (đang ở lobby/menu?)" end
local ok, parts = pcall(function() local op = OverlapParams.new() op.FilterType = Enum.RaycastFilterType.Exclude op.FilterDescendantsInstances = {char, gui}
op.MaxParts = 120 return workspace:GetPartBoundsInRadius(root.Position, 60, op)
end) if not ok or type(parts) ~= "table" or #parts == 0 then return nil, "không quét được vật nào trong 60 studs quanh bạn" end local list = {}
for _, pt in ipairs(parts) do local okD, d = pcall(function() return (pt.Position - root.Position).Magnitude end)
if okD and d then list[#list+1] = {p = pt, d = d} end end table.sort(list, function(a, b) return a.d < b.d end) local names = {}
for i = 1, math.min(n or 5, #list) do names[#names+1] = list[i].p.Name .. " (" .. string.format("%.1f", list[i].d) .. "m)"
end return (list[1] and list[1].p or nil), table.concat(names, " · "), #list end
function S.FillObjPanel(inst, hitPos, hitNormal, hitMat, how, quiet) if not inst then return false end objResultPanel.Visible = true
objNameLbl.Text = "Name: "..inst.Name objClassLbl.Text = "Class: "..inst.ClassName
objPosLbl.Text = string.format("Position: %.3f, %.3f, %.3f", hitPos.X, hitPos.Y, hitPos.Z) if inst:IsA("BasePart") then local size = inst.Size
local cf = inst.CFrame local rx, ry, rz = cf:ToOrientation() local look = cf.LookVector local color = inst.Color local material = inst.Material
objSizeLbl.Text = string.format("Size: %.3f, %.3f, %.3f", size.X, size.Y, size.Z) objRotLbl.Text = string.format("Rotation: P=%.1f° Y=%.1f° R=%.1f°",
math.deg(rx), math.deg(ry), math.deg(rz)) objLookLbl.Text = string.format("Look: %.3f, %.3f, %.3f", look.X, look.Y, look.Z)
objMatLbl.Text = "Material: "..tostring(material):gsub("Enum.Material.", "") objColorLbl.Text = string.format("Color: R=%d G=%d B=%d",
math.floor(color.R*255), math.floor(color.G*255), math.floor(color.B*255)) if highlightEnabled then CreateHighlight(inst) end else
objSizeLbl.Text = "Size: N/A (không phải BasePart)" objRotLbl.Text = "Rotation: N/A"
objLookLbl.Text = "Look: N/A" objMatLbl.Text = "Material: N/A" objColorLbl.Text = "Color: N/A" RemoveCurrentHighlight() end
objPathLbl.Text = "Path: "..GetFullPath(inst) objResultPanel:SetAttribute("LastHitPos", tostring(hitPos))
objResultPanel:SetAttribute("LastPath", GetFullPath(inst)) objResultPanel:SetAttribute("LastNormal", tostring(hitNormal))
objResultPanel:SetAttribute("LastMaterial", tostring(hitMat)) S.AnaLast.ok = true S.AnaLast.name = tostring(inst.Name) S.AnaLast.how = tostring(how or "") if not quiet then
S.AnaSay(tostring(how or "🎯 tia bắn trúng") .. ": " .. inst.Name .. " (" .. inst.ClassName .. ")" .. (S.AnaNote and (" · " .. S.AnaNote) or "")) end return true end
S.RefreshDevLabel()
local function PickObjectAt(mousePos, isRightClick, ignoreHubGui) local x, y = mousePos.X, mousePos.Y S.AnaLast.ok = false S.AnaNote = nil
S.AnaWhyScan = nil if not ignoreHubGui and Hit.onHub(x, y) then S.AnaSay("⏭️ Điểm chạm nằm trên menu của hub — bấm ra ngoài game rồi thử lại")
return end local hardGui, softGui = S.GuiBlockAt(x, y) if hardGui then S.AnaSay("🚫 Điểm chạm là NÚT của game (" .. hardGui .. ") — dời ra chỗ khác để không hit xuyên nút") return end
if softGui and not S.AnaCfg.skipGameGui then S.AnaSay("🚫 HUD của game (" .. softGui .. ") đang chặn — BẬT '🛡 Phân tích xuyên HUD game' là dùng được")
return end if softGui then S.AnaNote = "🛡 phân tích xuyên HUD của game (" .. softGui .. ")" end
local cam2 = S.AnaCam() if not cam2 then S.AnaSay("⚠️ Game chưa có camera (Workspace.CurrentCamera = nil) — vào lại game rồi thử") return
end local unitRay = cam2:ViewportPointToRay(x, y) local params = RaycastParams.new() params.FilterType = Enum.RaycastFilterType.Exclude local filterList = {}
if player.Character then table.insert(filterList, player.Character) end if gui then table.insert(filterList, gui) end params.FilterDescendantsInstances = filterList
params.IgnoreWater = S.AnaCfg.ignoreWater pcall(function() params.RespectCanCollide = false end)
local result = workspace:Raycast(unitRay.Origin, unitRay.Direction * S.AnaCfg.maxDist, params) if result and result.Material == Enum.Material.Water then
local pw = RaycastParams.new() pw.FilterType = Enum.RaycastFilterType.Exclude
pw.FilterDescendantsInstances = filterList pw.IgnoreWater = true pcall(function() pw.RespectCanCollide = false end) local rw = workspace:Raycast(unitRay.Origin, unitRay.Direction * S.AnaCfg.maxDist, pw)
if rw and rw.Instance then result = rw S.AnaNote = "🌊 đã xuyên qua mặt nước để lấy vật bên dưới" end end local inst, hitPos, hitNormal, hitMat, how local rayDist = math.huge
if result and result.Instance then inst, hitPos, hitNormal, hitMat = result.Instance, result.Position, result.Normal, result.Material how = "🎯 tia bắn trúng"
pcall(function() rayDist = (hitPos - unitRay.Origin).Magnitude end) end
if S.AnaCfg.scanFallback then local part, why2, scanPos, scanT = S.PickByRayScan(unitRay, filterList)
local pick = S.ChooseCloserPick(inst, rayDist, part, scanT) if pick == "scan" and part then inst, how = part, "🧭 " .. tostring(why2)
hitPos = scanPos or part.Position pcall(function() hitNormal = part.CFrame.LookVector end) pcall(function() hitMat = part.Material end)
elseif not inst then S.AnaWhyScan = why2 end end objResultPanel.Visible = true if inst then S.FillObjPanel(inst, hitPos, hitNormal, hitMat, how)
else local prevName = objNameLbl.Text objNameLbl.Text = "⚠️ Không hit gì — giữ vật đang chọn" S.AnaSay("⚠️ Không thấy vật ở điểm chạm"
.. (S.AnaWhyScan and (" (" .. S.AnaWhyScan .. ")") or " (tia đi vào khoảng không)") .. " — thử ⊕ Giữa màn hình, 🧭 Gần nhất, hoặc lại gần vật hơn")
task.delay(1.0, function() if objNameLbl and objNameLbl.Parent and objNameLbl.Text == "⚠️ Không hit gì — giữ vật đang chọn" then objNameLbl.Text = prevName end end) end end
function S.AnaAimEnsureDot() if S.AnaUi.aimGui and S.AnaUi.aimGui.Parent then return S.AnaUi.aimGui end
local aimGui = New("ScreenGui", { Name = "BananaCatHub_AnaAimDot", IgnoreGuiInset = true, ResetOnSpawn = false, ZIndexBehavior = Enum.ZIndexBehavior.Global, DisplayOrder = 10000, }, targetGui)
S.AnaUi.aimGui = aimGui aimGui:SetAttribute("BCHub_External", true) local dot = New("Frame", { Name = "CenterAimDot", AnchorPoint = Vector2.new(0.5, 0.5), Position = UDim2.new(0.5, 0, 0.5, 0),
Size = UDim2.new(0, 8, 0, 8), BackgroundColor3 = Color3.fromRGB(255, 35, 35), BorderSizePixel = 0, Active = false, Selectable = false,
ZIndex = 10000, }, aimGui) Corner(dot, UDim.new(1, 0)) New("UIStroke", { Color = Color3.fromRGB(8, 8, 8), Thickness = 1.5, Transparency = 0, ApplyStrokeMode = Enum.ApplyStrokeMode.Border, }, dot)
local actionBtn = New("TextButton", { Name = "CenterAimAnalyzeButton", AnchorPoint = Vector2.new(0.5, 0.5), Position = S.AnaUi.aimButtonPosition or UDim2.new(1, -28, 0.55, 0),
Size = UDim2.new(0, 36, 0, 36), Text = "🔎", BackgroundColor3 = Color3.fromRGB(220, 55, 55),
BackgroundTransparency = 0.08, TextColor3 = Color3.fromRGB(255, 255, 255), Font = Enum.Font.GothamBold, TextSize = 16,
AutoButtonColor = true, Active = true, Selectable = false, BorderSizePixel = 0, ZIndex = 10000,
}, aimGui) Corner(actionBtn, UDim.new(1, 0)) New("UIStroke", { Color = Color3.fromRGB(255, 235, 235),
Thickness = 1.5, Transparency = 0.1, ApplyStrokeMode = Enum.ApplyStrokeMode.Border, }, actionBtn) local cam = S.AnaCam()
local viewport = cam and cam.ViewportSize if viewport and viewport.X > 0 and viewport.Y > 0 then local saved = actionBtn.Position local margin = 29
local x = math.clamp(saved.X.Scale * viewport.X + saved.X.Offset, margin, math.max(margin, viewport.X - margin)) local y = math.clamp(saved.Y.Scale * viewport.Y + saved.Y.Offset, margin, math.max(margin, viewport.Y - margin))
actionBtn.Position = UDim2.new(x / viewport.X, 0, y / viewport.Y, 0) S.AnaUi.aimButtonPosition = actionBtn.Position end
actionBtn.InputBegan:Connect(function(input) if type(S.AnaAimBeginButtonDrag) == "function" then pcall(S.AnaAimBeginButtonDrag, input) end end) actionBtn.Activated:Connect(function()
local dragged = S.AnaUi.aimButtonDragMoved == true local suppressUntil = S.AnaUi.aimButtonSuppressUntil or 0 S.AnaUi.aimButtonDragMoved = false
if dragged or os.clock() < suppressUntil then return end if type(S.AnaAimAnalyzeOnce) == "function" then
local ok = pcall(S.AnaAimAnalyzeOnce) if not ok then pcall(function() if S.AnaUi.supportTabIndex then SwitchTab(S.AnaUi.supportTabIndex) end
if main then main.Visible = true end if togBtn then togBtn.Text = "✕" end S.AnaSay("⚠️ Không phân tích được điểm ngắm") end) end end end) S.AnaUi.aimGui = aimGui S.AnaUi.aimDot = dot
S.AnaUi.aimActionBtn = actionBtn return aimGui end function S.AnaAimStep() if not S.AnaUi.centerAimOn or not S.AnaUi.aimGui then return end
local showOverlay = not (main and main.Visible) if S.AnaUi.aimGui.Enabled ~= showOverlay then S.AnaUi.aimGui.Enabled = showOverlay end
if not showOverlay then S.AnaUi.aimButtonDragging = false S.AnaUi.aimButtonDragInput = nil end end function S.AnaAimBeginButtonDrag(input) if not S.AnaUi.aimButtonMoveEnabled then return end
local inputType = input.UserInputType if inputType ~= Enum.UserInputType.MouseButton1 and inputType ~= Enum.UserInputType.Touch then return end
local btn = S.AnaUi.aimActionBtn if not btn then return end local inputPos = input.Position S.AnaUi.aimButtonDragging = true S.AnaUi.aimButtonDragInput = input
S.AnaUi.aimButtonDragOrigin = Vector2.new(inputPos.X, inputPos.Y) S.AnaUi.aimButtonDragCenter = btn.AbsolutePosition + btn.AbsoluteSize / 2
S.AnaUi.aimButtonDragMoved = false S.AnaUi.aimButtonSuppressUntil = 0 end function S.AnaAimDragMove(input) if not S.AnaUi.aimButtonDragging or not S.AnaUi.aimButtonMoveEnabled then return end
local dragInput = S.AnaUi.aimButtonDragInput if not dragInput then return end
local inputType = dragInput.UserInputType local isPointerMove = (inputType == Enum.UserInputType.MouseButton1 and input.UserInputType == Enum.UserInputType.MouseMovement)
or (inputType == Enum.UserInputType.Touch and input == dragInput) if not isPointerMove then return end local cam = S.AnaCam() local viewport = cam and cam.ViewportSize
if not viewport or viewport.X <= 0 or viewport.Y <= 0 then return end local pointer = Vector2.new(input.Position.X, input.Position.Y) local delta = pointer - S.AnaUi.aimButtonDragOrigin
if delta.Magnitude < 5 then return end local btn = S.AnaUi.aimActionBtn if not btn then return end S.AnaUi.aimButtonDragMoved = true
local halfX = btn.AbsoluteSize.X / 2 + 6 local halfY = btn.AbsoluteSize.Y / 2 + 6
local x = math.clamp(S.AnaUi.aimButtonDragCenter.X + delta.X, halfX, math.max(halfX, viewport.X - halfX)) local y = math.clamp(S.AnaUi.aimButtonDragCenter.Y + delta.Y, halfY, math.max(halfY, viewport.Y - halfY))
btn.Position = UDim2.new(x / viewport.X, 0, y / viewport.Y, 0) S.AnaUi.aimButtonPosition = btn.Position end
function S.AnaAimEndButtonDrag(input) if not S.AnaUi.aimButtonDragging then return end local dragInput = S.AnaUi.aimButtonDragInput if not dragInput then return end
local samePointer = input == dragInput or (dragInput.UserInputType == Enum.UserInputType.MouseButton1 and input.UserInputType == Enum.UserInputType.MouseButton1)
if not samePointer then return end if S.AnaUi.aimButtonDragMoved then S.AnaUi.aimButtonSuppressUntil = os.clock() + 0.4
else S.AnaUi.aimButtonDragMoved = false S.AnaUi.aimButtonSuppressUntil = 0 end
S.AnaUi.aimButtonDragging = false S.AnaUi.aimButtonDragInput = nil S.AnaUi.aimButtonDragOrigin = nil S.AnaUi.aimButtonDragCenter = nil end
trackConn(UserInputService.InputChanged:Connect(function(input) pcall(S.AnaAimDragMove, input)
end)) trackConn(UserInputService.InputEnded:Connect(function(input) pcall(S.AnaAimEndButtonDrag, input) end))
function S.AnaAimAnalyzeOnce() if not S.AnaUi.centerAimOn then return false end S.AnaLast.ok = false local cam = S.AnaCam() if not cam then
S.AnaSay("⚠️ Camera chưa sẵn sàng để phân tích điểm giữa màn hình") else local viewport = cam.ViewportSize PickObjectAt(Vector2.new(viewport.X * 0.5, viewport.Y * 0.5), false, true) end
if S.AnaUi.supportTabIndex then SwitchTab(S.AnaUi.supportTabIndex) end if main then main.Visible = true end
if S.AnaLast and S.AnaLast.ok then supportTab.CanvasPosition = Vector2.new(0, math.max(0, objResultPanel.Position.Y.Offset - 24))
elseif S.AnaUi.whyLbl then supportTab.CanvasPosition = Vector2.new(0, math.max(0, S.AnaUi.whyLbl.Position.Y.Offset - 24))
end if togBtn then togBtn.Text = "✕" end ReleaseHubFocus() return S.AnaLast and S.AnaLast.ok == true end
function S.AnaAimSet(on) on = (on == true) if on == (S.AnaUi.centerAimOn == true) then return on end S.AnaUi.centerAimOn = on
if on then local okDot = pcall(S.AnaAimEnsureDot) local okBind = false if okDot then okBind = pcall(function() RunService:UnbindFromRenderStep("BC_AnaAim")
RunService:BindToRenderStep("BC_AnaAim", Enum.RenderPriority.Camera.Value + 1, function() pcall(S.AnaAimStep) end) end) end if not okDot or not okBind then S.AnaUi.centerAimOn = false
pcall(function() RunService:UnbindFromRenderStep("BC_AnaAim") end) pcall(function() if S.AnaUi.aimGui then S.AnaUi.aimGui:Destroy() end end)
S.AnaUi.aimGui, S.AnaUi.aimDot, S.AnaUi.aimActionBtn = nil, nil, nil S.AnaUi.aimButtonDragging, S.AnaUi.aimButtonDragInput = false, nil
S.AnaUi.aimButtonDragOrigin, S.AnaUi.aimButtonDragCenter = nil, nil S.AnaUi.aimButtonDragMoved, S.AnaUi.aimButtonSuppressUntil = false, 0 else
if main then main.Visible = false end
if togBtn then togBtn.Text = "" end ReleaseHubFocus() end else
pcall(function() RunService:UnbindFromRenderStep("BC_AnaAim") end) pcall(function() if S.AnaUi.aimGui then S.AnaUi.aimGui:Destroy() end end)
S.AnaUi.aimGui, S.AnaUi.aimDot, S.AnaUi.aimActionBtn = nil, nil, nil S.AnaUi.aimButtonDragging, S.AnaUi.aimButtonDragInput = false, nil
S.AnaUi.aimButtonDragOrigin, S.AnaUi.aimButtonDragCenter = nil, nil S.AnaUi.aimButtonDragMoved, S.AnaUi.aimButtonSuppressUntil = false, 0 end
local active = (S.AnaUi.centerAimOn == true) local btn = S.AnaUi.centerAimBtn
if btn and btn.Parent then btn.Text = active and "🔴 Ngắm tâm: BẬT" or "🔴 Ngắm tâm: TẮT" D.SetBg(btn, active and C.RED or C.GRAY) end
if active then S.AnaSay("🔴 Ngắm tâm đã bật · canh vật ở chấm đỏ rồi nhấn nút 🔎 để phân tích") end return active end
S.AnaUi.centerAimBtn.Activated:Connect(function() local requested = not (S.AnaUi.centerAimOn == true) local active = S.AnaAimSet(requested) if requested and not active then
S.AnaSay("⚠️ Không bật được chế độ ngắm tâm — không tạo được chấm đỏ/nút phân tích") end end) trackConn(UserInputService.InputBegan:Connect(function(input, gp)
if gp then return end
if not analyzeObjectEnabled then return end if input.UserInputType == Enum.UserInputType.MouseButton2 then PickObjectAt(input.Position, true)
return end if input.UserInputType == Enum.UserInputType.Touch then local startTick = tick()
local startPos = input.Position local holdConn, moveConn holdConn = UserInputService.InputEnded:Connect(function(e) if e == input then
holdConn:Disconnect() if moveConn then moveConn:Disconnect() end if tick() - startTick >= S.AnaCfg.holdTime then
task.spawn(function() PickObjectAt(input.Position, false) end) end end end)
moveConn = UserInputService.InputChanged:Connect(function(e) if e == input then local d = (e.Position - startPos).Magnitude
if d > S.AnaCfg.holdMove then
holdConn:Disconnect() moveConn:Disconnect() end end end) return end end)) objectAnalyzeBtn.Activated:Connect(function() analyzeObjectEnabled = not analyzeObjectEnabled
if analyzeObjectEnabled then objectAnalyzeBtn.Text = "🎯 Phân Tích Vật: BẬT" D.SetBg(objectAnalyzeBtn, C.GREEN)
S.RefreshDevLabel() S.AnaSay("✅ Đã BẬT phân tích vật thể · " .. S.DeviceText()) else objectAnalyzeBtn.Text = "🎯 Phân Tích Vật: TẮT"
D.SetBg(objectAnalyzeBtn, C.GRAY) RemoveCurrentHighlight() end end) highlightToggleBtn.Activated:Connect(function() highlightEnabled = not highlightEnabled
if highlightEnabled then highlightToggleBtn.Text = "💜 Highlight Tím: BẬT" D.SetBg(highlightToggleBtn, C.PURPLE) else
highlightToggleBtn.Text = "💜 Highlight Tím: TẮT" D.SetBg(highlightToggleBtn, C.GRAY) RemoveCurrentHighlight() end end) removeHighlightBtn.Activated:Connect(function() RemoveCurrentHighlight() end)
S.AnaUi.centerBtn.Activated:Connect(function() local vpx, vpy = 1280, 720 pcall(function() local cam2 = S.AnaCam() if cam2 then vpx, vpy = cam2.ViewportSize.X, cam2.ViewportSize.Y end end)
S.AnaSay("⊕ Đang ẩn menu 0.35s để lấy vật ở GIỮA màn hình...") local prevEnabled = true pcall(function() prevEnabled = gui.Enabled end)
pcall(function() gui.Enabled = false end)
task.wait(0.12) PickObjectAt(Vector2.new(vpx / 2, vpy / 2), true, true) task.wait(0.25) pcall(function() gui.Enabled = prevEnabled end)
end) S.AnaUi.nearBtn.Activated:Connect(function() local part, info, total = S.NearestParts(5)
if not part then S.AnaSay("⚠️ Không tìm được vật gần bạn: " .. tostring(info)) return end local hp = nil
pcall(function() hp = part.Position end) S.FillObjPanel(part, hp, nil, nil, "🧭 vật gần bạn nhất (trong " .. tostring(total) .. " vật quét được)")
pcall(function() local l = S.AnaUi.whyLbl if l and l.Parent then l.Text = "🔎 Quanh bạn 60 studs: " .. tostring(info) end end) end)
S.AnaUi.skipGuiBtn.Activated:Connect(function() S.AnaCfg.skipGameGui = not S.AnaCfg.skipGameGui local on = S.AnaCfg.skipGameGui S.AnaUi.skipGuiBtn.Text = on and "🛡 Phân tích xuyên HUD game: BẬT"
or "🛡 Xuyên HUD game: TẮT (như bản cũ)" D.SetBg(S.AnaUi.skipGuiBtn, on and C.GREEN or C.GRAY)
S.AnaSay(on and "🛡 BẬT: bỏ qua HUD/nền bán trong suốt của game (khuyên dùng, nhất là 📱 mobile)" or "🛡 TẮT: quay lại kiểu cũ — HUD của game sẽ CHẶN phân tích ở điểm chạm")
end) S.AnaUi.scanFbBtn.Activated:Connect(function() S.AnaCfg.scanFallback = not S.AnaCfg.scanFallback local on = S.AnaCfg.scanFallback
S.AnaUi.scanFbBtn.Text = on and "🧭 Quét dự phòng: BẬT" or "🧭 Quét dự phòng: TẮT" D.SetBg(S.AnaUi.scanFbBtn, on and C.GREEN or C.GRAY)
S.AnaSay(on and "🧭 BẬT: tia trượt quét cả tường đi xuyên (CanCollide/CanQuery=false) và lấy vật GẦN tâm hơn tia thường" or "🧭 TẮT: chỉ dùng tia raycast (bỏ qua tường đi xuyên được)") end)
clearObjectBtn.Activated:Connect(function() objResultPanel.Visible = false RemoveCurrentHighlight() end)
copyObjBtn.Activated:Connect(function() local pos = objResultPanel:GetAttribute("LastHitPos") if pos and pos ~= "" then S.CopyToClipboard(pos) flash(copyObjBtn, "✅ Đã Copy!", 1.2) end end)
copyPathBtn.Activated:Connect(function() local path = objResultPanel:GetAttribute("LastPath") if path and path ~= "" then S.CopyToClipboard(path)
flash(copyPathBtn, "✅ Đã Copy!", 1.2) end end) posY = posY + 6 local copyCoordBtn = Button(supportTab, "📋 Copy Tọa Độ Dưới Chân", 8, posY, 468, 26, C.BLUE) posY = posY + 32
copyCoordBtn.Activated:Connect(function() local groundPos = GetGroundPosition() local rootPart = GetRootPart() local finalPos = groundPos or (rootPart and rootPart.CFrame.Position)
if not finalPos then return end local text = string.format("%.3f, %.3f, %.3f", finalPos.X, finalPos.Y, finalPos.Z)
S.CopyToClipboard(text) flash(copyCoordBtn, "✅ Đã Copy: " .. text, 2) end) Label(supportTab, "🚀 Teleport Tới Tọa Độ", posY) posY = posY + 14
D.tpLblX = Label(supportTab, "X:", posY) D.tpLblX.Size = UDim2.new(0,14,0,14); D.tpLblX.Position = UDim2.new(0,8,0,posY)
local tpXIn = New("TextBox", { Size=UDim2.new(0,136,0,24), Position=UDim2.new(0,24,0,posY-2), Text="0",
PlaceholderColor3=Color3.fromRGB(122, 130, 148), BackgroundColor3=Color3.fromRGB(26, 29, 38), BackgroundTransparency=0,
TextColor3=Color3.fromRGB(233, 237, 245), Font=Enum.Font.Code, TextSize=11, BorderSizePixel=0, ClearTextOnFocus=false, Active=true, Selectable=true, ZIndex=10,
}, supportTab) Corner(tpXIn, UDim.new(0,4)); Stroke(tpXIn, Color3.fromRGB(255,100,100), 1.2)
D.tpLblY = Label(supportTab, "Y:", posY) D.tpLblY.Size = UDim2.new(0,14,0,14); D.tpLblY.Position = UDim2.new(0,166,0,posY)
local tpYIn = New("TextBox", { Size=UDim2.new(0,136,0,24), Position=UDim2.new(0,182,0,posY-2), Text="0",
PlaceholderColor3=Color3.fromRGB(122, 130, 148), BackgroundColor3=Color3.fromRGB(26, 29, 38), BackgroundTransparency=0,
TextColor3=Color3.fromRGB(233, 237, 245), Font=Enum.Font.Code, TextSize=11, BorderSizePixel=0, ClearTextOnFocus=false, Active=true, Selectable=true, ZIndex=10,
}, supportTab) Corner(tpYIn, UDim.new(0,4)); Stroke(tpYIn, Color3.fromRGB(100,255,100), 1.2)
D.tpLblZ = Label(supportTab, "Z:", posY) D.tpLblZ.Size = UDim2.new(0,14,0,14); D.tpLblZ.Position = UDim2.new(0,324,0,posY)
local tpZIn = New("TextBox", { Size=UDim2.new(0,136,0,24), Position=UDim2.new(0,340,0,posY-2), Text="0",
PlaceholderColor3=Color3.fromRGB(122, 130, 148), BackgroundColor3=Color3.fromRGB(26, 29, 38), BackgroundTransparency=0,
TextColor3=Color3.fromRGB(233, 237, 245), Font=Enum.Font.Code, TextSize=11, BorderSizePixel=0, ClearTextOnFocus=false, Active=true, Selectable=true, ZIndex=10,
}, supportTab) Corner(tpZIn, UDim.new(0,4)); Stroke(tpZIn, Color3.fromRGB(100,150,255), 1.2) posY = posY + 30
local fillCurrentBtn = Button(supportTab, "📍 Lấy Vị Trí Dưới Chân", 8, posY, 372, 24, C.ORANGE) local tpBtn = Button(supportTab, "🚀 Teleport", 386, posY, 90, 24, C.GREEN)
posY = posY + 30 fillCurrentBtn.Activated:Connect(function() local groundPos = GetGroundPosition()
local rootPart = GetRootPart() local p = groundPos or (rootPart and rootPart.CFrame.Position) if not p then return end tpXIn.Text = string.format("%.3f", p.X)
tpYIn.Text = string.format("%.3f", p.Y) tpZIn.Text = string.format("%.3f", p.Z) end)
tpBtn.Activated:Connect(function() local rootPart = GetRootPart() if not rootPart then return end local x = tonumber(tpXIn.Text) or 0
local y = tonumber(tpYIn.Text) or 0 local z = tonumber(tpZIn.Text) or 0
rootPart.CFrame = CFrame.new(Vector3.new(x, y, z)) flash(tpBtn, "✅ Đã Teleport!", 1.5) end) S.SpeedMeter = S.SpeedMeter or {}
do
local SV = S.SpeedMeter SV.on     = (SV.on == true) SV.live   = tonumber(SV.live) or 0
SV.max    = tonumber(SV.max)  or 0
SV.base   = tonumber(SV.base)
SV.src    = SV.src or "chưa dò" SV.ws     = tonumber(SV.ws) or 0
SV._bound = (SV._bound == true) local function num(v) v = tonumber(v) if v == nil or v ~= v then return nil end
return v end local function fmt(n) return string.format("%.1f", num(n) or 0) end local function say(msg) pcall(function() if D.hubStatus then D.hubStatus.Text = msg end end) end
local function move() return S.Move end local function myHum() local m = move() if m and m.Hum then
local ok, h = pcall(m.Hum) if ok and h then return h end end local ch = player.Character if not ch then return nil end
local ok, h = pcall(function() return ch:FindFirstChildOfClass("Humanoid") end) if ok and h then return h end return ch:FindFirstChild("Humanoid") end local function myRoot() local m = move()
if m and m.Root then local ok, r = pcall(m.Root) if ok and r then return r end end local ch = player.Character
return ch and ch:FindFirstChild("HumanoidRootPart") or nil end local function readWS(h) if not h then return nil end
local ok, v = pcall(function() return h.WalkSpeed end) if ok then local n = num(v); if n then return n end end local m = move()
if m and m.comp then return num(m.comp(h, "WalkSpeed", nil)) end return nil end local function readPos(r) if not r then return nil end local m = move() local x, y, z if m and m.comp then local p
pcall(function() p = r.Position end) x, y, z = m.comp(p, "X", nil), m.comp(p, "Y", nil), m.comp(p, "Z", nil)
else pcall(function() local p = r.Position; x, y, z = p.X, p.Y, p.Z end) end x, y, z = num(x), num(y), num(z)
if x == nil or y == nil or z == nil then return nil end return x, y, z end function SV.Detect() local m = move() local h = myHum() local hws = readWS(h)
local baseWS = m and num(m._baseWS) or nil local applying = (m ~= nil) and (m.speed == true or m.runMode == true)
local src if applying and baseWS then SV.base = baseWS src = "game (hub đã học khi 👟 bật)" elseif hws and hws > 0 then
if (not applying) and SV._lastWS and math.abs(hws - SV._lastWS) > 0.01 then src = "game VỪA ĐỔI tốc độ → mặc định mới"
else src = "game (WalkSpeed của nhân vật)" end SV.base = hws elseif baseWS then SV.base = baseWS src = "hub (đã học)" else SV.base = 16
src = "mặc định Roblox" end if hws and hws > 0 and not applying then SV._lastWS = hws end if hws then SV.ws = hws end SV.src = src return SV.base, SV.src end function SV.Step(dt) dt = num(dt)
if not dt or dt <= 0 then dt = 1 / 60 end if dt > 0.5 then dt = 0.5 end SV._stepAcc = (SV._stepAcc or 0) + dt
local needSupport = true if S.PagePerf and S.PagePerf.ShouldRunForSupportTab then needSupport = S.PagePerf.ShouldRunForSupportTab() end
local threshold = 0.05 if not needSupport then if S.PagePerf and not S.PagePerf.IsMainVisible() then threshold = 0.50 else threshold = 0.25 end end
if SV._stepAcc < threshold then return SV.live end SV._stepAcc = 0 local h = myHum() local x, y, z = readPos(myRoot()) if x then if SV._px then
local dx, dy, dz = x - SV._px, y - SV._py, z - SV._pz local d = math.sqrt(dx * dx + dy * dy + dz * dz) if d <= 25 then
local inst = d / dt if d > 0.001 then SV._n = (SV._n or 0) + 1 SV.live = (SV._n <= 1) and inst or (SV.live + (inst - SV.live) * 0.35)
if inst >= 0.5 and inst > SV.max then SV.max = inst end end end end SV._px, SV._py, SV._pz = x, y, z else SV._px = nil SV.live = 0 end
if h then SV.ws = readWS(h) or SV.ws end SV.Detect() SV.Sync() return SV.live end local function setText(lbl, s) if lbl and lbl.Text ~= s then lbl.Text = s end end
function SV.Sync() local base = num(SV.base) or 0 local ratio = (base > 0) and (SV.ws / base) or 0 local scale = math.max(SV.max, base, 1)
local pct = SV.live / scale if pct < 0 then pct = 0 elseif pct > 1 then pct = 1 end
local bpct = base / scale if bpct < 0 then bpct = 0 elseif bpct > 1 then bpct = 1 end local isSupportVisible = true
if S.PagePerf and S.PagePerf.ShouldRunForSupportTab then isSupportVisible = S.PagePerf.ShouldRunForSupportTab() end if isSupportVisible then
setText(SV.baseLbl, string.format("🎯 Mặc định game: %s studs/s · nguồn: %s", fmt(base), tostring(SV.src))) setText(SV.wsLbl, string.format("🚶 WalkSpeed hiện tại: %s%s", fmt(SV.ws),
(ratio > 0) and string.format("  (×%.2f mặc định)", ratio) or "")) setText(SV.liveLbl, string.format("⚡ Tốc độ thật: %s studs/s", fmt(SV.live)))
setText(SV.maxLbl, string.format("🏁 Cao nhất: %s studs/s", fmt(SV.max))) if SV.btn then setText(SV.btn, SV.on and "🎯 Định vị tốc độ: BẬT" or "🎯 Định vị tốc độ: TẮT") if SV._btnOn ~= SV.on then
SV._btnOn = SV.on SV.btn.BackgroundColor3 = SV.on and C.GREEN or C.GRAY end end if SV.barFill and SV._barPct ~= pct then
SV._barPct = pct SV.barFill.Size = UDim2.new(pct, 0, 1, 0) end if SV.barBase and SV._barBase ~= bpct then SV._barBase = bpct SV.barBase.Position = UDim2.new(bpct, -1, 0, 0) end end if SV.hud then
if SV.hud.Visible ~= SV.on then SV.hud.Visible = SV.on end setText(SV.hudLbl, string.format("🎯 %s (mặc định game) · 🚶 %s\n⚡ %s · 🏁 %s studs/s",
fmt(base), fmt(SV.ws), fmt(SV.live), fmt(SV.max))) end end function SV.OnTabChanged() if S.PagePerf and S.PagePerf.ShouldRunForSupportTab() then pcall(SV.Sync) end end
function SV.Status() return string.format("🎯 %s · ⚡ %s · 🏁 %s", fmt(SV.base), fmt(SV.live), fmt(SV.max)) end
function SV.Bind(on) if on and not SV._bound then SV._bound = true local ok = pcall(function()
RunService:BindToRenderStep("BC_SpeedMeter", Enum.RenderPriority.Camera.Value - 6, function(dt) pcall(function() SV.Step(dt) end) end) end)
if not ok then SV._bound = false end elseif (not on) and SV._bound then SV._bound = false pcall(function() RunService:UnbindFromRenderStep("BC_SpeedMeter") end) end return SV._bound end
function SV.Set(on) SV.on = (on == true) if SV.on then SV._px, SV._n = nil, 0 SV.Detect() SV._lastWS = nil SV.Bind(true) SV.Step(1 / 60)
else SV.Bind(false) SV._px, SV._n = nil, 0 end SV.Sync() return SV.on end function SV.Toggle() return SV.Set(not SV.on) end function SV.Reset()
SV.max, SV.live = 0, 0 SV._n = 0 SV.Sync() return SV.max end Label(supportTab, "🎯 Định vị tốc độ game (mặc định · hiện tại · cao nhất)", posY) posY = posY + 18
SV.btn      = Button(supportTab, "🎯 Định vị tốc độ: TẮT", 8, posY, 300, 26, C.GRAY) SV.resetBtn = Button(supportTab, "🗑 Xoá đỉnh", 314, posY, 162, 26, C.RED)
posY = posY + 30 SV.baseLbl = Label(supportTab, "🎯 Mặc định game: — studs/s", posY) SV.baseLbl.TextColor3 = C.ACCENT SV.baseLbl.TextSize = 9
posY = posY + 16 SV.wsLbl = Label(supportTab, "🚶 WalkSpeed hiện tại: —", posY) SV.wsLbl.TextSize = 9
posY = posY + 16 SV.liveLbl = Label(supportTab, "⚡ Tốc độ thật: 0.0 studs/s", posY) SV.liveLbl.TextColor3 = C.GREEN SV.liveLbl.TextSize = 9
posY = posY + 16 SV.maxLbl = Label(supportTab, "🏁 Cao nhất: 0.0 studs/s", posY) SV.maxLbl.TextColor3 = C.ORANGE SV.maxLbl.TextSize = 9 posY = posY + 16
local smBarBg = New("Frame", { Size=UDim2.new(1,-16,0,10), Position=UDim2.new(0,8,0,posY), BackgroundColor3=Color3.fromRGB(24, 28, 38), BackgroundTransparency=0.15, BorderSizePixel=0, ZIndex=6,
}, supportTab) Corner(smBarBg, UDim.new(0,5)); Stroke(smBarBg, C.BORDER, 1) SV.barFill = New("Frame", { Size=UDim2.new(0,0,1,0), Position=UDim2.new(0,0,0,0),
BackgroundColor3=C.BLUE, BackgroundTransparency=0.15, BorderSizePixel=0, ZIndex=7, }, smBarBg) Corner(SV.barFill, UDim.new(0,5))
SV.barBase = New("Frame", {
Size=UDim2.new(0,2,1,0), Position=UDim2.new(0.25,-1,0,0), BackgroundColor3=C.GREEN, BackgroundTransparency=0, BorderSizePixel=0, ZIndex=8, }, smBarBg) posY = posY + 16
SV.hintLbl = Label(supportTab, "ℹ️ Chỉ ĐO, không sửa gì · Vạch xanh = mặc định game · Tự học lại khi game đổi.", posY) SV.hintLbl.TextSize = 9
posY = posY + 18 SV.hud = New("Frame", { Name = "BC_SpeedHud",
Size = UDim2.new(0, 214, 0, 44), Position = UDim2.new(0, 12, 0.5, -22), BackgroundColor3 = Color3.fromRGB(16, 19, 26), BackgroundTransparency = 0.25,
BorderSizePixel = 0, Visible = false, ZIndex = 24, }, gui) Corner(SV.hud, UDim.new(0,8)); Stroke(SV.hud, C.ACCENT, 1.4)
SV.hudLbl = New("TextLabel", { Size = UDim2.new(1,-12,1,0), Position = UDim2.new(0,6,0,0), Text = "🎯 ...",
BackgroundTransparency = 1, TextColor3 = C.WHITE, Font = Enum.Font.GothamBold, TextSize = 9,
TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Center, ZIndex = 25, TextWrapped = true, }, SV.hud)
SV.btn.Activated:Connect(function() local on = SV.Set(not SV.on) say(on and ("🎯 định vị tốc độ: BẬT · mặc định game " .. fmt(SV.base) .. " studs/s") or "🎯 định vị tốc độ: TẮT")
end) SV.resetBtn.Activated:Connect(function() SV.Reset() say("🎯 đã xoá đỉnh · cao nhất = 0") end)
SV.Detect() SV.Sync() end Label(supportTab, "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", posY) posY = posY + 16 Label(supportTab, "💾 Waypoint Đã Lưu", posY) posY = posY + 14
local wpNameIn = New("TextBox", { Size=UDim2.new(1,-130,0,24), Position=UDim2.new(0,8,0,posY), Text="", PlaceholderText="Tên waypoint...", PlaceholderColor3=Color3.fromRGB(122, 130, 148),
BackgroundColor3=Color3.fromRGB(26, 29, 38), BackgroundTransparency=0, TextColor3=Color3.fromRGB(233, 237, 245), Font=Enum.Font.GothamMedium, TextSize=11,
BorderSizePixel=0, ClearTextOnFocus=false, Active=true, Selectable=true, ZIndex=10, }, supportTab)
Corner(wpNameIn, UDim.new(0,4)); Stroke(wpNameIn, Color3.fromRGB(180,180,200), 1.2) New("UIPadding", {PaddingLeft=UDim.new(0,6)}, wpNameIn)
local saveWpBtn = Button(supportTab, "💾 Lưu", 0, 0, 80, 20, C.PURPLE) saveWpBtn.Position = UDim2.new(1, -88, 0, posY + 2) posY = posY + 30
local wpListFrame = New("Frame", { Size=UDim2.new(1,-16,0,0), Position=UDim2.new(0,8,0,posY), BackgroundTransparency=1, BorderSizePixel=0, ZIndex=6, }, supportTab)
New("UIListLayout", {SortOrder=Enum.SortOrder.LayoutOrder, Padding=UDim.new(0,4)}, wpListFrame) local RebuildWaypoints
saveWpBtn.Activated:Connect(function() local rootPart = GetRootPart() if not rootPart then return end local name = wpNameIn.Text
if #name == 0 then name = "WP "..(#waypoints+1) end table.insert(waypoints, {name = name, pos = rootPart.CFrame.Position})
wpNameIn.Text = "" if RebuildWaypoints then RebuildWaypoints() end Store.saveSoon() end)
RebuildWaypoints = function() for _, c in ipairs(wpListFrame:GetChildren()) do if not c:IsA("UIListLayout") then c:Destroy() end end
if #waypoints == 0 then New("TextLabel", { Size=UDim2.new(1,0,0,26), Text="📭 Chưa có waypoint nào.", BackgroundTransparency=1, TextColor3=C.GRAY, Font=Enum.Font.GothamMedium, TextSize=10,
TextXAlignment=Enum.TextXAlignment.Center, ZIndex=7, }, wpListFrame) supportTab.CanvasSize = UDim2.new(0, 0, 0, posY + 40) return end
local totalH = 0 for i, wp in ipairs(waypoints) do local row = New("Frame", { Size=UDim2.new(1,0,0,26),
BackgroundColor3=Color3.fromRGB(26, 29, 38), BackgroundTransparency=0.1, BorderSizePixel=0, ZIndex=6,
}, wpListFrame) Corner(row, UDim.new(0,5)); Stroke(row) New("TextLabel", { Size=UDim2.new(1,-100,1,0), Position=UDim2.new(0,8,0,0),
Text=wp.name.." ("..string.format("%.0f, %.0f, %.0f", wp.pos.X, wp.pos.Y, wp.pos.Z)..")", BackgroundTransparency=1, TextColor3=C.DARK,
Font=Enum.Font.GothamBold, TextSize=8, TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7, }, row) local goBtn = New("TextButton", { Size=UDim2.new(0,44,0,18), Position=UDim2.new(1,-72,0,4),
Text="🚀 Tới", BackgroundColor3=C.GREEN, BackgroundTransparency=0.1, TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=8,
BorderSizePixel=0, ZIndex=8, }, row) Corner(goBtn, UDim.new(0,4)) goBtn.Activated:Connect(function() local rootPart = GetRootPart()
if not rootPart then return end rootPart.CFrame = CFrame.new(wp.pos) end) local delBtn = New("TextButton", { Size=UDim2.new(0,22,0,18), Position=UDim2.new(1,-25,0,4),
Text="🗑", BackgroundColor3=C.RED, BackgroundTransparency=0.1, TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=8,
BorderSizePixel=0, ZIndex=8, }, row) Corner(delBtn, UDim.new(0,4)) delBtn.Activated:Connect(function() table.remove(waypoints, i) RebuildWaypoints() Store.saveSoon() end) totalH = totalH + 30 end
wpListFrame.Size = UDim2.new(1,-16,0,totalH) supportTab.CanvasSize = UDim2.new(0, 0, 0, posY + totalH + 20) end
RebuildWaypoints() Store.restoreWaypoints = RebuildWaypoints local function NormalizeCode(c) if type(c) ~= "string" then return "" end
c = S.SanitizeCode(c)
return S.NormalizeRunnable(c) end local GAME_OWNED_GUI_NAMES = { Topbar = true, TopbarContainer = true, PlayerList = true, Chat = true,
Backpack = true, DevConsoleUI = true, ScriptInvitationUI = true, FollowPromptUI = true, TouchControlsFrame = true, Main = true, ExMenu = true,
Notifications = true, PauseMenu = true, InGame = true, CoreGui = true, }
local function ScanNewGuis(beforeGuis, mine, allowGuess) local found, seen = {}, {} local function take(g) if not g or seen[g] then return end
seen[g] = true table.insert(found, g) end if mine then for _, g in ipairs(mine) do if g:IsA("ScreenGui") or g:IsA("Folder") then take(g) end end end local function scan(container)
if not container then return end for _, g in ipairs(container:GetChildren()) do if not beforeGuis[g] then beforeGuis[g] = true
if allowGuess and (g:IsA("ScreenGui") or g:IsA("Folder")) and not GAME_OWNED_GUI_NAMES[g.Name] then local hasGuiChild = false
for _, c in ipairs(g:GetChildren()) do if c:IsA("GuiObject") then hasGuiChild = true break end end if hasGuiChild then take(g) end end end end end scan(playerGui)
if targetGui ~= playerGui then scan(targetGui) end return found end local function ForceStretchToParent(obj, maxDepth) if not obj then return end
maxDepth = maxDepth or 0 pcall(function() if obj:IsA("GuiObject") then if obj:IsA("Frame") or obj:IsA("ScrollingFrame") or obj:IsA("CanvasGroup") then
local s = obj.Size if s.X.Scale < 0.9 and s.X.Offset > 0 then obj.Size = UDim2.new(1, 0, s.Y.Scale > 0 and s.Y.Scale or 1, 0) end
if obj.Position.X.Offset ~= 0 or obj.Position.Y.Offset ~= 0 then obj.Position = UDim2.new(0, 0, 0, 0) end end
end end) if maxDepth <= 0 then return end for _, child in ipairs(obj:GetChildren()) do ForceStretchToParent(child, maxDepth - 1) end end
function S.RegisterEmbed(host, gui, recs) local entry = {host = host, gui = gui, recs = recs or {}, conns = {}}
pcall(function() entry.conns[#entry.conns+1] = gui:GetPropertyChangedSignal("Enabled"):Connect(function() pcall(function() host.Visible = gui.Enabled end) end) end) pcall(function()
entry.conns[#entry.conns+1] = gui:GetPropertyChangedSignal("Parent"):Connect(function() pcall(function() host.Visible = (gui.Parent ~= nil) and gui.Enabled end) end)
end) pcall(function() entry.conns[#entry.conns+1] = gui.Destroying:Connect(function() S.DropEmbed(entry, true) end) end) S.embeds[#S.embeds+1] = entry return entry end
function S.FindEmbedByHost(host) for i, e in ipairs(S.embeds) do if e.host == host then return e, i end end return nil end function S.RemoveEmbedAt(i) local e = S.embeds[i]
if not e then return end for _, c in ipairs(e.conns) do pcall(function() c:Disconnect() end) end table.remove(S.embeds, i) return e
end function S.DropEmbed(entry, keepQuiet) for i, e in ipairs(S.embeds) do if e == entry then S.RemoveEmbedAt(i); break end end
pcall(function() if entry.host and entry.host.Parent then entry.host:Destroy() end end) if not keepQuiet then
print("[taodepzai v5.0 NOIR] Đã gỡ host nhúng khỏi tab") end end function S.RestoreEmbed(entry) pcall(function() S.RestoreSnap(entry) end)
entry.snap = nil for _, rec in ipairs(entry.recs or {}) do pcall(function() if rec.obj and rec.origParent then
rec.obj.Parent = rec.origParent end end) end for i, e in ipairs(S.embeds) do if e == entry then S.RemoveEmbedAt(i); break end
end pcall(function() if entry.host and entry.host.Parent then entry.host:Destroy() end end) end
function S.PruneEmbeds() for i = #S.embeds, 1, -1 do local e = S.embeds[i] local hostAlive = e.host and e.host.Parent
local guiAlive = e.gui and e.gui.Parent if not hostAlive or not guiAlive then if hostAlive then pcall(function() e.host:Destroy() end) end S.RemoveEmbedAt(i) end end end
function S.MeasureHost(host) local hx, hy = host.AbsolutePosition.X, host.AbsolutePosition.Y local minX, minY, maxX, maxY = math.huge, math.huge, -math.huge, -math.huge local n = 0
for _, ch in ipairs(host:GetChildren()) do if ch:IsA("GuiObject") and ch.Visible ~= false then local p, sz = ch.AbsolutePosition, ch.AbsoluteSize if p and sz then
minX = math.min(minX, p.X); minY = math.min(minY, p.Y) maxX = math.max(maxX, p.X + sz.X); maxY = math.max(maxY, p.Y + sz.Y) n = n + 1 end end end
if n == 0 or maxX <= minX or maxY <= minY then return nil end return { x = minX - hx, y = minY - hy, w = maxX - minX, h = maxY - minY } end
function S.SnapSubtree(list, node, isTop) for _, c in ipairs(node:GetChildren()) do if c:IsA("GuiObject") then list[#list+1] = {
obj = c, top = isTop or nil, Position = c.Position, Size = c.Size, TextSize = ((c.TextSize and c.TextSize > 0) and not c.TextScaled) and c.TextSize or nil, }
S.SnapSubtree(list, c, false) elseif c:IsA("UICorner") then list[#list+1] = { obj = c, CornerRadius = c.CornerRadius } elseif c:IsA("UIPadding") then list[#list+1] = { obj = c,
PadT = c.PaddingTop, PadB = c.PaddingBottom, PadL = c.PaddingLeft, PadR = c.PaddingRight } elseif c:IsA("UIStroke") then list[#list+1] = { obj = c, Thick = c.Thickness } end end end
function S.RestoreSnap(entry) if not entry.snap then return end for _, rec in ipairs(entry.snap) do local o = rec.obj
if o and o.Parent then pcall(function() if rec.Position then o.Position = rec.Position end if rec.Size then o.Size = rec.Size end
if rec.TextSize then o.TextSize = rec.TextSize end if rec.CornerRadius then o.CornerRadius = rec.CornerRadius end
if rec.PadT then o.PaddingTop, o.PaddingBottom = rec.PadT, rec.PadB o.PaddingLeft, o.PaddingRight = rec.PadL, rec.PadR end if rec.Thick then o.Thickness = rec.Thick end end) end end end
function S.FitEmbedded(entry) local host, gui = entry.host, entry.gui if not host or not host.Parent then return end local function mulUDim(u, k)
return UDim2.new(u.X.Scale, math.floor(u.X.Offset * k + 0.5), u.Y.Scale, math.floor(u.Y.Offset * k + 0.5)) end
local function mulUDimShift(u, k, dx, dy) return UDim2.new(u.X.Scale, math.floor(u.X.Offset * k + 0.5) + dx,
u.Y.Scale, math.floor(u.Y.Offset * k + 0.5) + dy) end local function mulDim(u, k) return UDim.new(u.Scale, math.floor(u.Offset * k + 0.5)) end
local area = host.Parent
local aw = area.AbsoluteSize.X - 6 local ah = area.AbsoluteSize.Y - 6 if aw < 40 or ah < 40 then return end
pcall(function() host.Size = UDim2.new(1, 0, 1, 0) host.Position = UDim2.new(0, 0, 0, 0) host.BackgroundTransparency = 1
host.ClipsDescendants = true
end) if not entry.snap then entry.snap = {} S.SnapSubtree(entry.snap, host, true) if #entry.snap == 0 then return end end for _, rec in ipairs(entry.snap) do
rec.dx, rec.dy = 0, 0 end S.RestoreSnap(entry) local base = S.MeasureHost(host) if not base then return end local s = math.clamp(math.min(aw / base.w, ah / base.h), 0.35, 3.0)
local function apply(k) for _, rec in ipairs(entry.snap) do local o = rec.obj if o and o.Parent then
pcall(function() if rec.Size then o.Size = mulUDim(rec.Size, k) end if rec.Position then if rec.top then
o.Position = mulUDimShift(rec.Position, k, rec.dx or 0, rec.dy or 0) else o.Position = mulUDim(rec.Position, k) end end
if rec.TextSize then o.TextSize = math.max(8, math.floor(rec.TextSize * k + 0.5)) end if rec.CornerRadius then
o.CornerRadius = UDim.new(rec.CornerRadius.Scale, math.floor(rec.CornerRadius.Offset * k + 0.5))
end if rec.PadT then o.PaddingTop    = mulDim(rec.PadT, k) o.PaddingBottom = mulDim(rec.PadB, k) o.PaddingLeft   = mulDim(rec.PadL, k)
o.PaddingRight  = mulDim(rec.PadR, k) end if rec.Thick then o.Thickness = math.max(1, rec.Thick * k) end end)
end end end local hw, hh = area.AbsoluteSize.X, area.AbsoluteSize.Y local function align(k, tries)
apply(k) local m = S.MeasureHost(host) if not m then return k end local dx = math.floor(-m.x + math.max(0, (aw - m.w) / 2) + 0.5)
local dy = math.floor(-m.y + math.max(0, (ah - m.h) / 2) + 0.5) if math.abs(dx) > 0.5 or math.abs(dy) > 0.5 then
for _, rec in ipairs(entry.snap) do if rec.top then rec.dx, rec.dy = (rec.dx or 0) + dx, (rec.dy or 0) + dy end end apply(k)
m = S.MeasureHost(host) or m end if m and tries < 2 and (m.w > hw + 1 or m.h > hh + 1) then local k2 = k * math.min(hw / m.w, hh / m.h)
if k2 < k * 0.98 then for _, rec in ipairs(entry.snap) do rec.dx, rec.dy = 0, 0 end return align(math.max(k2, 0.15), tries + 1) end
end return k end s = align(s, 0) entry.fitScale = s return s end function S.TabArea(nm) local frame
if type(nm) == "string" and #nm > 0 then for _, ft in ipairs(featureTabs) do if ft.name == nm then frame = ft.frame break end end end
frame = frame or activeTab if not frame then return nil end local host = frame:FindFirstChild("ScriptHost") local area = host or frame
local sz = area.AbsoluteSize return Vector2.new(math.max(0, sz.X - 6), math.max(0, sz.Y - 6)) end S.resizedCbs = {} function S.OnResized(fn)
if type(fn) ~= "function" then return nil end table.insert(S.resizedCbs, fn) return { Disconnect = function() for i, f in ipairs(S.resizedCbs) do
if f == fn then table.remove(S.resizedCbs, i) break end end end } end function S.NotifyResize()
local a = S.TabArea() local cbs = {} for _, f in ipairs(S.resizedCbs) do cbs[#cbs+1] = f end for _, f in ipairs(cbs) do pcall(f, a) end end
function S.FeatureTabHost(nm) if type(nm) == "string" and #nm > 0 then for _, ft in ipairs(featureTabs) do if ft.name == nm then
local h = ft.frame and ft.frame:FindFirstChild("ScriptHost") if h then return h end end end
end return activeTab and activeTab:FindFirstChild("ScriptHost") end function S.FitToTab(obj, nm) if not obj then return nil end
local host = S.FeatureTabHost(nm) if host and obj.Parent ~= host then pcall(function() obj.Parent = host end) end pcall(function()
obj.Size = UDim2.new(1, 0, 1, 0) obj.Position = UDim2.new(0, 0, 0, 0) end) return obj end _G.BananaCatHubAPI = { Version = "5.0", LegacyVersion = "4.61",
HubGui = gui,
Main = main, TabArea = function(self, nm) return S.TabArea(nm) end, OnResize = function(self, fn) return S.OnResized(fn) end,
FeatureTabHost = function(self, nm) return S.FeatureTabHost(nm) end, FitToTab = function(self, obj, nm) return S.FitToTab(obj, nm) end,
EmbedGui = function(self, guiOrFrame, nm)
local scr = guiOrFrame if scr and not scr:IsA("ScreenGui") then scr = scr:FindFirstAncestorOfClass("ScreenGui") end
local host = S.FeatureTabHost(nm) if not scr or not host then return nil end return S.EmbedGui(scr, host) end,
MakeTemplate = function(self, nm, icon) return S.FeatureTemplate(nm, icon) end, ReleaseFocus = function(self) pcall(ReleaseHubFocus) end, ExternalGui = function(self, props)
props = props or {} local g = Instance.new("ScreenGui") g.Name = props.Name or ("BC_External_" .. tostring(math.random(10000, 99999))) g.IgnoreGuiInset = props.IgnoreGuiInset ~= false
g.ResetOnSpawn = false g.ZIndexBehavior = Enum.ZIndexBehavior.Global g.DisplayOrder = tonumber(props.DisplayOrder) or 9000
g:SetAttribute("BCHub_External", true)
g.Parent = targetGui or (player and player:WaitForChild("PlayerGui")) return g end, Crosshair = function(self, on)
if on == nil then return S.ToggleCrosshair() end S.SetCrosshair(on and true or false) return S.crosshairOn end, }
function S.FeatureTemplate(nm, icon, stamp) if type(nm) ~= "string" or #nm == 0 then nm = "Tính Năng Mới" end
if type(icon) ~= "string" or #icon == 0 then icon = "⚙️" end if type(stamp) ~= "string" then stamp = "" end local head = [==[
local BC = { Name = "__BC_NAME__", Icon = "__BC_ICON__", DesignW = 620, DesignH = 384 } local Players = game:GetService("Players")
local player = Players.LocalPlayer local pg = player and player:WaitForChild("PlayerGui")
if not pg then return end local gui = Instance.new("ScreenGui") gui.Name = BC.Name gui.ResetOnSpawn = false
gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling gui.Parent = pg local root = Instance.new("Frame") root.Name = "Root"
root.Size = UDim2.new(0, BC.DesignW, 0, BC.DesignH) root.Position = UDim2.new(0.5, -BC.DesignW / 2, 0.5, -BC.DesignH / 2)
root.BackgroundColor3 = Color3.fromRGB(24, 26, 38) root.BorderSizePixel = 0 root.Parent = gui local function bcCorner(o, r)
    local c = Instance.new("UICorner") c.CornerRadius = UDim.new(0, r) c.Parent = o return c end bcCorner(root, 8) local API = _G.BananaCatHubAPI
local bcConn = nil        -- connection của API:OnResize, bcClose sẽ ngắt để không leak
local function bcHubMain() local ok, m = pcall(function() return API and API.Main end)
    if ok and m and m.AbsoluteSize then return m end local hub = pg:FindFirstChild("ExMenu") or pg:FindFirstChild("BananaCatHub")
    if hub then local f = hub:FindFirstChildWhichIsA("Frame") if f and f.AbsoluteSize.X > 300 then return f end end end local function bcArea()
    local ok, v = pcall(function() return API and API.TabArea and API:TabArea(BC.Name) end) if ok and v and v.X and v.X > 60 then return v end
    local m = bcHubMain() if m and m.AbsoluteSize.X > 300 then return Vector2.new(m.AbsoluteSize.X - 30, m.AbsoluteSize.Y - 72) end
    local vp = Vector2.new(1280, 720) pcall(function() vp = workspace.CurrentCamera.ViewportSize end)
    local w = math.max(320, math.min(vp.X * 0.55, vp.X - 60)) return Vector2.new(w, w * BC.DesignH / BC.DesignW) end local function bcFit()
    pcall(function() local par = root.Parent if par and not par:IsA("ScreenGui") then root.Size = UDim2.new(1, 0, 1, 0) root.Position = UDim2.new(0, 0, 0, 0) return end local a = bcArea()
        root.Size = UDim2.new(0, math.floor(a.X), 0, math.floor(a.Y)) root.Position = UDim2.new(0.5, -math.floor(a.X / 2), 0.5, -math.floor(a.Y / 2)) end) end bcConn = nil bcFit()
pcall(function() if API and API.OnResize then bcConn = API:OnResize(bcFit) end end) local bcHubFrame = bcHubMain()
if bcHubFrame then pcall(function() bcHubFrame:GetPropertyChangedSignal("AbsoluteSize"):Connect(bcFit) end) end task.delay(0.25, bcFit)
task.delay(1.2, bcFit) ]==] local body = [==[ local title = Instance.new("TextLabel") title.Size = UDim2.new(1, -56, 0, 32) title.Position = UDim2.new(0, 10, 0, 0)
title.BackgroundTransparency = 1 title.Text = BC.Icon .. "  " .. BC.Name title.Font = Enum.Font.GothamBold title.TextSize = 15
title.TextXAlignment = Enum.TextXAlignment.Left title.TextColor3 = Color3.fromRGB(255, 255, 255)
title.Parent = root local closeBtn = Instance.new("TextButton") closeBtn.Name = "CloseBtn" closeBtn.Size = UDim2.new(0, 20, 0, 20)
closeBtn.Position = UDim2.new(1, -26, 0, 5) closeBtn.BackgroundColor3 = Color3.fromRGB(210, 70, 70)
closeBtn.Text = "X" closeBtn.Font = Enum.Font.GothamBold closeBtn.TextSize = 11 closeBtn.TextColor3 = Color3.fromRGB(255, 255, 255)
closeBtn.AutoButtonColor = true closeBtn.Parent = root bcCorner(closeBtn, 5) local panel = Instance.new("ScrollingFrame")
panel.Name = "Panel" panel.Size = UDim2.new(1, -20, 1, -74) panel.Position = UDim2.new(0, 10, 0, 38) panel.BackgroundTransparency = 1 panel.BorderSizePixel = 0
panel.ScrollBarThickness = 4   -- v4.9: đồng bộ
panel.AutomaticCanvasSize = Enum.AutomaticSize.Y panel.CanvasSize = UDim2.new(0, 0, 0, 0)
panel.Parent = root local list = Instance.new("UIListLayout") list.Padding = UDim.new(0, 6) list.SortOrder = Enum.SortOrder.LayoutOrder
list.Parent = panel local pad = Instance.new("UIPadding") pad.PaddingRight = UDim.new(0, 8) pad.Parent = panel local bcStatus = Instance.new("TextLabel") bcStatus.Name = "Status"
bcStatus.Size = UDim2.new(1, -20, 0, 22) bcStatus.Position = UDim2.new(0, 10, 1, -30) bcStatus.BackgroundTransparency = 1 bcStatus.Text = "Tắt"
bcStatus.TextColor3 = Color3.fromRGB(255, 214, 90) bcStatus.Font = Enum.Font.Gotham
bcStatus.TextSize = 12 bcStatus.TextXAlignment = Enum.TextXAlignment.Left bcStatus.Parent = root local function bcButton(txt, color)
    local b = Instance.new("TextButton") b.Size = UDim2.new(1, 0, 0, 22) b.BackgroundColor3 = color or Color3.fromRGB(60, 120, 220) b.Text = txt
    b.Font = Enum.Font.GothamMedium b.TextSize = 10 b.TextColor3 = Color3.fromRGB(255, 255, 255) b.AutoButtonColor = true b.Parent = panel bcCorner(b, 5) return b end
bcToggle = bcButton(BC.Icon .. "  Bật " .. BC.Name) local function bcMakeExternalGui(name, order) local ext local ok, API = pcall(function() return _G.BananaCatHubAPI end)
    if ok and API and API.ExternalGui then ext = API:ExternalGui({Name = name, DisplayOrder = order}) else ext = Instance.new("ScreenGui")
        ext.Name = name ext.IgnoreGuiInset = true ext.ResetOnSpawn = false ext.ZIndexBehavior = Enum.ZIndexBehavior.Global
        ext.DisplayOrder = order or 9500 ext:SetAttribute("BCHub_External", true) local pg2 = game:GetService("Players").LocalPlayer:WaitForChild("PlayerGui") local hui = pg2
        if type(gethui) == "function" then local okH, gotH = pcall(gethui) if okH and gotH then hui = gotH end end ext.Parent = hui end return ext end
local extGui = nil            -- ScreenGui overlay ngoài màn hình (được tạo khi bật tính năng)
local extCrossOn = false local function bcToggleCross() if not extGui then return end extCrossOn = not extCrossOn
    local ring = extGui:FindFirstChild("BC_Ring") local dot  = extGui:FindFirstChild("BC_Dot") if ring then ring.Visible = extCrossOn end if dot  then dot.Visible  = extCrossOn end
    pcall(function() if _G.BananaCatHubAPI and _G.BananaCatHubAPI.Crosshair then end end) end local bcCrossBtn = bcButton("🎯  Niêm tâm: TẮT", Color3.fromRGB(160, 60, 255))
pcall(function() if _G.BananaCatHubAPI and _G.BananaCatHubAPI.OnResize then end end) ]==] local foot = [==[
local bcEnabled = false local bcConns = {} local function bcOn(inst, sig, fn) table.insert(bcConns, inst[sig]:Connect(fn)) end local function bcClose()
    if bcConn then pcall(function() bcConn:Disconnect() end) bcConn = nil end for _, c in ipairs(bcConns) do pcall(function() c:Disconnect() end) end
    for i = #bcConns, 1, -1 do bcConns[i] = nil end bcEnabled = false pcall(function() gui.Enabled = false end) task.delay(0.06, function() pcall(function() gui:Destroy() end) end)
end bcOn(closeBtn, "MouseButton1Click", bcClose) _G.BC_FEATURES = _G.BC_FEATURES or {} _G.BC_FEATURES[BC.Name] = { name = BC.Name, Close = bcClose, Gui = gui, Root = root }
bcOn(bcCrossBtn, "MouseButton1Click", function() if not bcEnabled then bcToggle:Activate() task.wait(0.1)
    end bcToggleCross() bcCrossBtn.Text = extCrossOn and "🎯  Niêm tâm: BẬT" or "🎯  Niêm tâm: TẮT" end) bcOn(bcToggle, "MouseButton1Click", function() bcEnabled = not bcEnabled
    bcToggle.Text = (bcEnabled and "⏹  Tắt " or BC.Icon .. "  Bật ") .. BC.Name bcStatus.Text = bcEnabled and "Đang chạy…" or "Tắt"
    if bcEnabled then if not extGui or not extGui.Parent then extGui = bcMakeExternalGui(BC.Name .. "_Ext", 9500) local ring = Instance.new("Frame")
            ring.Name = "BC_Ring" ring.Size = UDim2.new(0, 32, 0, 32) ring.Position = UDim2.new(0.5, -16, 0.5, -16) ring.BackgroundTransparency = 1
            ring.BorderSizePixel = 0 ring.AnchorPoint = Vector2.new(0.5, 0.5) ring.Visible = false ring.Parent = extGui local rc = Instance.new("UICorner"); rc.CornerRadius = UDim.new(1, 0); rc.Parent = ring
            local rs = Instance.new("UIStroke"); rs.Thickness = 1.5; rs.Color = Color3.fromRGB(255,255,255); rs.Parent = ring
            local dot = Instance.new("Frame") dot.Name = "BC_Dot" dot.Size = UDim2.new(0, 3, 0, 3) dot.Position = UDim2.new(0.5, -2, 0.5, -2)
            dot.BackgroundColor3 = Color3.fromRGB(255,255,255) dot.BorderSizePixel = 0 dot.AnchorPoint = Vector2.new(0.5, 0.5) dot.Visible = false
            dot.Parent = extGui local dc = Instance.new("UICorner"); dc.CornerRadius = UDim.new(1, 0); dc.Parent = dot local gap, ll = 22, 10 local function ln(w, h, x, y)
                local f = Instance.new("Frame") f.Size = UDim2.new(0,w,0,h); f.Position = UDim2.new(0.5,x,0.5,y)
                f.BackgroundColor3 = Color3.fromRGB(255,255,255); f.BorderSizePixel = 0 f.AnchorPoint = Vector2.new(0.5,0.5); f.BackgroundTransparency = 0.2
                f.Name = "BC_Line"; f.Parent = extGui end ln(2, ll, -1, -gap - ll/2) ln(2, ll, -1,  gap + ll/2)
            ln(ll, 2, -gap - ll/2, -1) ln(ll, 2,  gap + ll/2, -1) end table.insert(bcConns, task.spawn(function() while bcEnabled do task.wait(0.2) pcall(function() end)
            end end)) else extCrossOn = false pcall(function() if extGui then extGui:Destroy() end end) extGui = nil bcCrossBtn.Text = "🎯  Niêm tâm: TẮT" end
end) print("✅ [" .. BC.Name .. "] đã nạp — dán vào tab \"Tạo Tính Năng\" của taodepzai v5.0 NOIR rồi bấm ▶ Chạy Script") return BC.Name ]==]
local out = head .. body .. foot out = (out:gsub("__BC_NAME__", function() return nm end))
out = (out:gsub("__BC_ICON__", function() return icon end)) out = (out:gsub("__BC_STAMP__", function() return (#stamp > 0) and stamp or "sinh bởi hub" end))
return out end _G.BananaCatHub_SyncEmbeds = function() pcall(S.SyncAllEmbeds) end pcall(function() trackConn(main:GetPropertyChangedSignal("Size"):Connect(function()
BcFit()
pcall(S.NotifyResize)
end)) end) function S.SyncAllEmbeds() for _, e in ipairs(S.embeds) do if e.host and e.host.Parent then pcall(function() S.FitEmbedded(e) end) end end
end function S.ClearEmbedsUnder(containerFrame) if not containerFrame then return 0 end
local n = 0 for i = #S.embeds, 1, -1 do local e = S.embeds[i] if e.host and e.host.Parent == containerFrame then S.RestoreEmbed(e) n = n + (1)
end end for _, child in ipairs(containerFrame:GetChildren()) do if child.Name:sub(1, 9) == "Embedded_" then
pcall(function() child:Destroy() end) end end return n end function S.EmbedGui(scr, containerFrame) if not S.embedEnabled then return nil end
if not scr or not scr.Parent then return nil end if not containerFrame or not containerFrame.Parent then return nil end
if scr == gui or scr:IsDescendantOf(gui) then return nil end local isExt = false pcall(function() isExt = (scr:GetAttribute("BCHub_External") == true) end) if isExt then return nil end
local hostName = "Embedded_"..scr.Name for _, ex in ipairs(containerFrame:GetChildren()) do
if ex.Name == hostName then local e = S.FindEmbedByHost(ex) if e then S.RestoreEmbed(e) else pcall(function() ex:Destroy() end) end end end
local host = New("Frame", { Size = UDim2.new(1,0,1,0), Position = UDim2.new(0,0,0,0), BackgroundTransparency = 1,
BorderSizePixel = 0, ZIndex = 5, Name = hostName, ClipsDescendants = true, }, containerFrame) local recs = {} for _, ch in ipairs(scr:GetChildren()) do
if ch:IsA("GuiObject") then recs[#recs+1] = {obj = ch, origParent = scr, origPos = ch.Position, origSize = ch.Size} end end
if #recs == 0 then pcall(function() host:Destroy() end) return nil end for _, rec in ipairs(recs) do pcall(function() rec.obj.Parent = host end) end
ForceStretchToParent(host)
local entry = S.RegisterEmbed(host, scr, recs) pcall(function() S.FitEmbedded(entry) end)
task.delay(0.08, function() pcall(function() S.FitEmbedded(entry) end) end) task.delay(0.4,  function() pcall(function() S.FitEmbedded(entry) end) end)
return host end S.crosshairGui   = nil S.crosshairBtns  = {}
S.crosshairOn    = false S.crosshairColor = Color3.fromRGB(255, 255, 255) S.crosshairSize  = 32
function S._buildCrosshair() if S.crosshairGui and S.crosshairGui.Parent then return S.crosshairGui end
local g = New("ScreenGui", { Name = "BananaCatHub_Crosshair", IgnoreGuiInset = true, ResetOnSpawn = false,
ZIndexBehavior = Enum.ZIndexBehavior.Global, DisplayOrder = 9999, }, targetGui) g:SetAttribute("BCHub_External", true) local ring = New("Frame", { Name = "Ring",
Size = UDim2.new(0, S.crosshairSize, 0, S.crosshairSize), Position = UDim2.new(0.5, -S.crosshairSize/2, 0.5, -S.crosshairSize/2),
BackgroundTransparency = 1, BorderSizePixel = 0, AnchorPoint = Vector2.new(0.5, 0.5), }, g)
New("UICorner", {CornerRadius = UDim.new(1, 0)}, ring) New("UIStroke", {Thickness = 1.5, Color = S.crosshairColor, Transparency = 0.1}, ring)
local dot = New("Frame", { Name = "Dot", Size = UDim2.new(0, 3, 0, 3), Position = UDim2.new(0.5, -2, 0.5, -2), BackgroundColor3 = S.crosshairColor, BorderSizePixel = 0,
AnchorPoint = Vector2.new(0.5, 0.5), }, g) New("UICorner", {CornerRadius = UDim.new(1, 0)}, dot)
local gap = S.crosshairSize/2 + 6 local lineLen = 10 local function line(name, w, h, x, y) local ln = New("Frame", {
Name = name, Size = UDim2.new(0, w, 0, h), Position = UDim2.new(0.5, x, 0.5, y),
BackgroundColor3 = S.crosshairColor, BorderSizePixel = 0, AnchorPoint = Vector2.new(0.5, 0.5), BackgroundTransparency = 0.15, }, g) return ln end line("Top",    2, lineLen, -1, -gap - lineLen/2)
line("Bottom", 2, lineLen, -1,  gap + lineLen/2) line("Left",   lineLen, 2, -gap - lineLen/2, -1) line("Right",  lineLen, 2,  gap + lineLen/2, -1)
S.crosshairGui = g return g end function S.SetCrosshair(on) S.crosshairOn = (on == true) if S.crosshairOn then S._buildCrosshair()
if S.crosshairGui then S.crosshairGui.Enabled = true end else if S.crosshairGui then S.crosshairGui.Enabled = false end end
for _, b in ipairs(S.crosshairBtns) do pcall(function() if b and b.Parent then b.Text = S.crosshairOn and "🎯 Tâm: BẬT" or "🎯 Tâm"
b.BackgroundColor3 = S.crosshairOn and Color3.fromRGB(180, 80, 220) or C.PURPLE end end) end end function S.ToggleCrosshair() S.SetCrosshair(not S.crosshairOn) return S.crosshairOn end
function S.RegisterCrosshairBtn(btn) if not btn then return end table.insert(S.crosshairBtns, btn) pcall(function()
btn.Text = S.crosshairOn and "🎯 Tâm: BẬT" or "🎯 Tâm" btn.BackgroundColor3 = S.crosshairOn and Color3.fromRGB(180, 80, 220) or C.PURPLE
end) btn.Activated:Connect(function() S.ToggleCrosshair() end) end S.EMBED_TRY_DELAYS   = {0.6, 1.8, 4, 7, 10}
S.EMBED_HOOK_GRACE   = 11
S.EMBED_PROBABLE_AGE = 5
S.EMBED_CHILD_WAIT   = 15
S.activeHook = nil
S.SYSTEM_GUI_NAMES = { Topbar = true, TopbarContainer = true, PlayerList = true, Chat = true, Backpack = true,
DevConsoleUI = true, ScriptInvitationUI = true, FollowPromptUI = true, TouchControlsFrame = true, PauseMenu = true, CoreGui = true, ExMenu = true,
} S.GENERIC_GUI_NAMES = { Main = true, InGame = true, Notifications = true } function S.IsEmbeddable(g, containerFrame, trust) if not g then return false, "không có GUI" end
if not g.Parent then return false, "GUI chưa có Parent (script chưa gắn lên màn hình)" end if not (g:IsA("ScreenGui") or g:IsA("Folder")) then return false, "không phải ScreenGui/Folder" end
if g == gui or g:IsDescendantOf(gui) then return false, "là GUI của chính hub" end if g.Name == "ExMenu" then return false, "trùng tên GUI của hub (ExMenu)" end
if S.SYSTEM_GUI_NAMES[g.Name] then return false, "là GUI của game/hệ thống (" .. tostring(g.Name) .. ")" end if trust ~= "certain" and trust ~= "manual" and S.GENERIC_GUI_NAMES[g.Name] then
return false, "tên '" .. tostring(g.Name) .. "' hay là UI của game — bật 🕵 hoặc bấm 🔁 để ép nhúng" end local isExt = false
pcall(function() isExt = (g:GetAttribute("BCHub_External") == true) end) if isExt then return false, "là overlay ngoài màn hình (BCHub_External)" end
if containerFrame and g:IsDescendantOf(containerFrame) then return false, "đã nằm trong tab rồi" end for _, e in ipairs(S.embeds) do
if e.gui == g then return false, "đã được nhúng ở tab khác" end end local hasChild = false for _, c in ipairs(g:GetChildren()) do if c:IsA("GuiObject") then hasChild = true break end end
if not hasChild then return false, "chưa có frame con (script còn đang dựng GUI)" end return true end function S.HookInstanceNew()
if S.activeHook then pcall(S.activeHook) end
S.activeHook = nil local records = {} local st = { hooked = false, available = false, viaHookfunction = false, realNew = nil, ours = nil, origFromHook = nil,
probing = false, probeSeen = false, inRun = true, graceUntil = nil, t0 = os.clock(), } local myCo = coroutine.running()
local function unhook() if not st.hooked then return end st.hooked = false if st.viaHookfunction then
pcall(function() if type(hookfunction) == "function" and st.origFromHook then hookfunction(Instance.new, st.origFromHook) end end)
else pcall(function() if Instance.new == st.ours then Instance.new = st.realNew end end)
end if S.activeHook == unhook then S.activeHook = nil end end local function recorder(cls, ...) local inst = st.realNew(cls, ...)
if st.probing then if cls == "ScreenGui" then st.probeSeen = true end return inst end if st.hooked and cls == "ScreenGui" then local now = os.clock() records[#records + 1] = { inst      = inst,
certain   = (coroutine.running() == myCo), duringRun = (st.inRun == true) or (st.graceUntil ~= nil and now < st.graceUntil),
age       = now - st.t0, embedded  = false, via       = "hook", } end return inst end pcall(function() st.realNew = Instance.new
st.ours = recorder Instance.new = st.ours st.hooked = (Instance.new == st.ours) end) if not st.hooked and type(hookfunction) == "function" then pcall(function()
st.ours = recorder st.origFromHook = hookfunction(Instance.new, st.ours) if st.origFromHook then st.realNew = st.origFromHook end st.hooked = true
st.viaHookfunction = true end) end if st.hooked then pcall(function() st.probing, st.probeSeen = true, false local probe = Instance.new("ScreenGui")
st.probing = false st.available = (st.probeSeen == true) if probe and probe.Destroy then pcall(function() probe:Destroy() end) end end)
if not st.available then pcall(unhook) end end S.activeHook = unhook return unhook, records, st end function S.WatchNewGuis(records, st) local conns = {}
local function already(g) for _, r in ipairs(records) do if r.inst == g then return true end end return false end
local function makeHandler() return function(child) if st.watchOn == false then return end if not child then return end
local okType, isGui = pcall(function() return child:IsA("ScreenGui") or child:IsA("Folder") end)
if not (okType and isGui) then return end if child == gui or already(child) then return end local now = os.clock() records[#records + 1] = {
inst      = child, certain   = false, duringRun = (st.inRun == true) or (st.graceUntil ~= nil and now < st.graceUntil), age       = now - st.t0,
embedded  = false, via       = "watch", } end end local seenCtn, containers = {}, {playerGui, targetGui} pcall(function()
local cg = game:GetService("CoreGui") if cg then containers[#containers + 1] = cg end end) for _, ctn in ipairs(containers) do
if ctn and not seenCtn[ctn] then seenCtn[ctn] = true pcall(function() conns[#conns + 1] = ctn.ChildAdded:Connect(makeHandler()) end)
end end st.watchOn = true local function stopWatch() st.watchOn = false for _, c in ipairs(conns) do pcall(function() c:Disconnect() end) end end return stopWatch, conns end
function S.EmbedRecorded(records, containerFrame, mode, verbose) if type(records) ~= "table" or #records == 0 then return 0, nil end
if not containerFrame or not containerFrame.Parent then return 0, "tab đã bị đóng" end if not S.embedEnabled then return 0, "🧩 nhúng đang TẮT" end
mode = mode or "run" local order = {} for _, r in ipairs(records) do if r and r.inst and not r.embedded then order[#order + 1] = r end end local function score(r) if r.certain then return 3 end
if r.duringRun then return 2 end return 1 end table.sort(order, function(a, b) return score(a) > score(b) end)
local done, whyTop = 0, nil for _, r in ipairs(order) do local accept = false if mode == "all" then accept = true elseif r.certain then accept = true elseif r.duringRun and mode ~= "strict" then
accept = true elseif mode == "any" and (r.age or 0) <= S.EMBED_PROBABLE_AGE then accept = true end if accept then
local trust if r.certain then trust = "certain" elseif r.duringRun or mode == "all" then trust = "manual" else trust = "guess" end
local okE, why = S.IsEmbeddable(r.inst, containerFrame, trust) if okE then if S.EmbedGui(r.inst, containerFrame) then r.embedded = true r.why = nil done = done + (1)  else
r.why = "S.EmbedGui từ chối" whyTop = r.why end else r.why = why if why then whyTop = why end if verbose and not r.reported then r.reported = true pcall(function()
print(string.format("[taodepzai v5.0 NOIR] 🔍 bỏ qua GUI '%s' (%s, %s): %s", tostring(r.inst and r.inst.Name), tostring(r.via), trust, tostring(why)))
end) end end end end return done, whyTop end function S.FindFeatureByHost(host) if not host then return nil end
for _, ft in ipairs(featureTabs) do if ft.frame and ft.frame.Parent and ft.frame:FindFirstChild("ScriptHost") == host then return ft end
end return nil end function S.FindActiveFeature() for _, ft in ipairs(featureTabs) do if ft.frame == activeTab then return ft end end
return nil end function S.DiagText(st, records) local hookTxt = "không rõ"
if st then if st.available then hookTxt = st.viaHookfunction and "OK (qua hookfunction)" or "OK (ghi đè Instance.new)" elseif st.hooked then
hookTxt = "cài được nhưng KHÔNG ăn (executor bỏ qua hook)" else hookTxt = "BỊ CHẶN (executor không cho sửa Instance.new)" end
end local n, certain, watch, scan = 0, 0, 0, 0 for _, r in ipairs(records or {}) do n = n + (1) if r.certain then certain = certain + (1)  end if r.via == "watch" then watch = watch + (1)  end
if r.via == "scan" then scan = scan + (1)  end end local lastWhy = nil for _, r in ipairs(records or {}) do if r.why then lastWhy = r.why end end
return string.format("hook=%s · ghi nhận %d GUI (chắc chắn %d, watcher %d, quét %d) · nhúng=%s · lý do cuối: %s", hookTxt, n, certain, watch, scan, tostring(S.embedEnabled and "BẬT" or "TẮT"), tostring(lastWhy or "—")) end
function S.RescueScan(ft, host) host = host or (ft and ft.frame and ft.frame:FindFirstChild("ScriptHost")) if not host or not host.Parent then return 0 end if not S.embedEnabled then return 0 end
local containers = {playerGui} if targetGui ~= playerGui then containers[#containers + 1] = targetGui end
pcall(function() local cg = game:GetService("CoreGui") if cg then containers[#containers + 1] = cg end end) local seen, n = {}, 0
for _, ctn in ipairs(containers) do pcall(function() for _, g in ipairs(ctn:GetChildren()) do if n < 3 and not seen[g] then seen[g] = true
local okE = S.IsEmbeddable(g, host, "manual") if okE and S.EmbedGui(g, host) then n = n + (1)  if ft then ft.records = ft.records or {} ft.records[#ft.records + 1] =
{inst = g, certain = false, duringRun = true, age = 0, embedded = true, via = "rescue"} end end end end end) if n >= 3 then break end end return n end
function S.ReembedFeature(ft, allowScan) if not ft or not ft.frame or not ft.frame.Parent then return 0, "tab không còn tồn tại" end
if not S.embedEnabled then return 0, "🧩 nhúng đang TẮT" end local host = ft.frame:FindFirstChild("ScriptHost")
if not host then return 0, "tab thiếu ScriptHost" end for _, e in ipairs(S.embeds) do if e.host and e.host.Parent == host then return 0, "tab đã có GUI nhúng sẵn" end end
local n, why = S.EmbedRecorded(ft.records, host, "all", true) if n > 0 then return n end if allowScan == true then
local m = S.RescueScan(ft, host) if m > 0 then return m end why = "không tìm thấy GUI nào nằm ngoài menu để nhúng" end if not why then why = (ft.records and #ft.records > 0)
and (ft.lastWhy or "GUI chưa sẵn sàng để nhúng") or  "chưa ghi nhận được GUI nào (script có tạo ScreenGui không?)" end return 0, why end
function S.OnFeatureTabOpened(ft) if not ft or not ft.frame or not ft.frame.Parent then return end
local n = S.ReembedFeature(ft, false) if n > 0 then pcall(function() if ft.status and ft.status.Parent then
ft.status.Text = string.format( "✅ vừa nhúng lại %d GUI vào tab (lần trước bị rớt ngoài menu) — bấm ✕ để trả về game", n)
end if ft.indicator and ft.indicator.Parent then ft.indicator.BackgroundColor3 = C.GREEN end end) end end S.parkTab   = nil S.parkBtn   = nil S.parkList  = nil S.parkCount = 0
S.PARK_MAX  = 2
function S.ParkHost(label) if not (S.parkList and S.parkList.Parent) then local sf, btn = AddTab("GUI Ngoài", "🧩", 99) S.parkTab, S.parkBtn = sf, btn
New("TextLabel", { Size = UDim2.new(1, -140, 0, 30), Position = UDim2.new(0, 8, 0, 4),
Text = "🧩 GUI do script chạy ở tab 💻 Code tạo ra — hub đưa vào đây. Bấm ↩ để trả về màn hình game. (Dex/IY/SimpleSpy KHÔNG bao giờ vào đây.)", BackgroundTransparency = 1, TextColor3 = C.DARK, Font = Enum.Font.GothamMedium,
TextSize = 10, TextWrapped = true, ZIndex = 6, TextXAlignment = Enum.TextXAlignment.Left, }, S.parkTab)
local backAll = New("TextButton", { Size = UDim2.new(0, 106, 0, 20), Position = UDim2.new(1, -112, 0, 6),
Text = "↩ Trả tất cả về game", BackgroundColor3 = C.RED, BackgroundTransparency = 0.15, TextColor3 = C.WHITE, Font = Enum.Font.GothamBold, TextSize = 8, BorderSizePixel = 0, ZIndex = 7,
}, S.parkTab) Corner(backAll, UDim.new(0, 5)) backAll.Activated:Connect(function() local n = S.RemoveAllParked() pcall(function()
print("[taodepzai v5.0 NOIR] ↩ đã trả " .. n .. " GUI về màn hình game") end) end) S.parkList = New("Frame", {
Name = "ParkList", Size = UDim2.new(1, -16, 1, -42), Position = UDim2.new(0, 8, 0, 38), BackgroundTransparency = 1, BorderSizePixel = 0, ZIndex = 5,
}, S.parkTab) New("UIListLayout", {Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder}, S.parkList) end S.parkCount = S.parkCount + (1)  local box = New("Frame", {
Name = "ParkBox_" .. tostring(label or "GUI"), Size = UDim2.new(1, 0, 0, 240), LayoutOrder = S.parkCount, BackgroundColor3 = C.BG, BackgroundTransparency = 0.35, BorderSizePixel = 0, ZIndex = 5,
}, S.parkList) Corner(box, UDim.new(0, 8)) Stroke(box, nil, 1) local back = New("TextButton", { Size = UDim2.new(0, 92, 0, 18), Position = UDim2.new(1, -96, 0, 3),
Text = "↩ Trả về game", BackgroundColor3 = C.GRAY, BackgroundTransparency = 0.2, TextColor3 = C.WHITE, Font = Enum.Font.GothamBold, TextSize = 8, BorderSizePixel = 0, ZIndex = 7,
}, box) Corner(back, UDim.new(0, 5)) back.Activated:Connect(function() S.ClearEmbedsUnder(box)
pcall(function() box:Destroy() end) S.parkCount = math.max(0, S.parkCount - 1) pcall(function() S.parkTab.CanvasSize = UDim2.new(0, 0, 0, S.parkCount * 246 + 10) end) pcall(function()
if S.parkBtn then S.parkBtn.Text = S.parkCount > 0 and ("🧩 GUI Ngoài (" .. S.parkCount .. ")") or "🧩 GUI Ngoài" end end) end)
local area = New("Frame", { Name = "ParkArea", Size = UDim2.new(1, -8, 1, -30), Position = UDim2.new(0, 4, 0, 26),
BackgroundTransparency = 1, BorderSizePixel = 0, ClipsDescendants = true, ZIndex = 5, }, box)
pcall(function() S.parkTab.CanvasSize = UDim2.new(0, 0, 0, S.parkCount * 246 + 10) end) pcall(function()
if S.parkBtn then S.parkBtn.Text = "🧩 GUI Ngoài (" .. S.parkCount .. ")" end end) return area, box end
S.NO_PARK_MARKERS = { "dex.lua", "dex explorer", "dexexplorer", "infiniteyield", "infinite yield", "simplespy", "simple spy", }
function S.ShouldSkipPark(code, name) local hay = (tostring(code or "") .. "\n" .. tostring(name or "")):lower()
for _, m in ipairs(S.NO_PARK_MARKERS) do if hay:find(m, 1, true) then return true, m end end
local code_l = tostring(code or ""):lower() local hasFetch = code_l:find("httpget", 1, true) or code_l:find("http_request", 1, true)
or code_l:find("request(", 1, true) or code_l:find("https://", 1, true) or code_l:find("http://", 1, true)
if hasFetch and (code_l:find("loadstring", 1, true) or code_l:find("load(", 1, true)) then return true, "script tải từ mạng (để GUI ngoài màn hình như tác giả thiết kế)"
end return false, nil end function S.RemoveAllParked() if not (S.parkList and S.parkList.Parent) then return 0 end
local n = 0 local kids = S.parkList:GetChildren() for i = #kids, 1, -1 do local box = kids[i]
if box.Name:sub(1, 8) == "ParkBox_" then S.ClearEmbedsUnder(box) pcall(function() box:Destroy() end) n = n + (1)
end end S.parkCount = 0 pcall(function() S.parkTab.CanvasSize = UDim2.new(0, 0, 0, 10) end)
pcall(function() if S.parkBtn then S.parkBtn.Text = "🧩 GUI Ngoài" end end) return n end function S.BeginRunCapture() if not S.embedEnabled then return nil end
if S.parkCodeGuis == false then return nil end local ok, cap = pcall(function() local unhook, recs, st = S.HookInstanceNew() local stopWatch = S.WatchNewGuis(recs, st)
st.stopWatch = stopWatch return {unhook = unhook, recs = recs, st = st, stopWatch = stopWatch, parked = 0, names = {}, cancelled = false} end) if not ok then return nil end
S.activeCap = cap
return cap end function S.AbortRunCapture() local cap = S.activeCap if not cap then return false end S.activeCap = nil
cap.cancelled = true pcall(function() if cap.st then cap.st.watchOn = false cap.st.inRun = false end end) pcall(cap.stopWatch) pcall(cap.unhook)
return true end function S.EndRunCapture(cap, label) if not cap or cap.cancelled then return 0 end
local st, recs = cap.st, cap.recs pcall(function() st.inRun = false st.graceUntil = os.clock() + 1.0
end) local function try() if cap.cancelled or cap.parked >= S.PARK_MAX or not S.embedEnabled then return 0 end
local added = 0 for _, r in ipairs(recs) do if cap.parked >= S.PARK_MAX then break end if r and r.inst and not r.embedded then local trust if r.certain then trust = "certain"
elseif r.duringRun then trust = "manual" else trust = "guess" end if S.IsEmbeddable(r.inst, nil, trust) then
local area, box = S.ParkHost(label) if area and S.EmbedGui(r.inst, area) then r.embedded = true cap.parked = cap.parked + (1) cap.names[#cap.names + 1] = tostring(r.inst.Name) added = added + (1)
pcall(function() print(string.format("[taodepzai v5.0 NOIR] 🧩 đã đưa GUI '%s' vào tab 'GUI Ngoài' (script chạy ở tab Code)", tostring(r.inst.Name))) end) elseif box then
pcall(function() box:Destroy() end)
S.parkCount = math.max(0, S.parkCount - 1) end end end end return added end local total = try() for _, d in ipairs(S.EMBED_TRY_DELAYS) do
task.delay(d, function() if cap.cancelled or cap.parked >= S.PARK_MAX then return end if not S.embedEnabled then return end try()
end) end task.delay(S.EMBED_HOOK_GRACE, function() pcall(cap.unhook) pcall(cap.stopWatch) if S.activeCap == cap then S.activeCap = nil end end)
pcall(function() print("[taodepzai v5.0 NOIR] ▶ tab Code · " .. S.DiagText(st, recs) .. " · đã đưa vào menu: " .. cap.parked)
end) return total end local function RunFeatureScript(code, name, containerFrame, indicator, statusLabel) if #code == 0 then
if statusLabel then statusLabel.Text = "⚠️ Vui lòng nhập code!" end return false, "empty" end code = NormalizeCode(code)
S.EnsureCompat()
if indicator then indicator.BackgroundColor3 = C.RED end if statusLabel then statusLabel.Text = "⏳ Đang thực thi..." end
ReleaseHubFocus()
local ft = S.FindFeatureByHost(containerFrame) local runToken = nil if ft then ft._runToken = (tonumber(ft._runToken) or 0) + 1 runToken = ft._runToken
ft.records = nil
end local embedCount, lateCandidate = 0, 0 local featureUnhook, records, lastWhy, hookState = nil, nil, nil, nil
local ok, err = pcall(function() local fn, lerr = loadstring(code) if not fn then error("loadstring thất bại: "..tostring(lerr)) end
local beforeGuis = {} for _, g in ipairs(playerGui:GetChildren()) do beforeGuis[g] = true end for _, g in ipairs(targetGui:GetChildren()) do beforeGuis[g] = true end pcall(function()
for _, g in ipairs(game:GetService("CoreGui"):GetChildren()) do beforeGuis[g] = true end end) local unhook, recs, st = S.HookInstanceNew() local stopWatch = S.WatchNewGuis(recs, st)
st.stopWatch = stopWatch featureUnhook, records, hookState = unhook, recs, st if ft then ft.records = recs ft.hookState = st end
local fnOk, fnErr = pcall(fn) st.inRun = false st.graceUntil = os.clock() + 1.0 local hookWorks = (st.available == true) local useScan = (not hookWorks) or (S.embedGuessNew == true)
local mode = (S.embedGuessNew == true) and "any" or "run" for i = 1, S.EMBED_CHILD_WAIT do if useScan then
local found = ScanNewGuis(beforeGuis, nil, true) for _, g in ipairs(found) do local now = os.clock() recs[#recs + 1] = {
inst = g, certain = false, duringRun = (st.inRun == true) or (now < (st.graceUntil or 0)), age = now - st.t0, embedded = false, via = "scan",
} end end local d, why = S.EmbedRecorded(recs, containerFrame, useScan and "any" or mode, true)
embedCount = embedCount + (d)  if why then lastWhy = why end if embedCount > 0 then break end task.wait(0.2) end if embedCount > 0 then unhook()
pcall(stopWatch) else task.delay(S.EMBED_HOOK_GRACE, function() pcall(unhook) pcall(stopWatch) end) end
if not fnOk then error(fnErr) end for _, dly in ipairs(S.EMBED_TRY_DELAYS) do task.delay(dly, function() if ft and ft._runToken ~= runToken then return end if embedCount > 0 then return end
if not (containerFrame and containerFrame.Parent) then return end if not S.embedEnabled then return end
if useScan then local found = ScanNewGuis(beforeGuis, nil, true) for _, g in ipairs(found) do local now = os.clock() recs[#recs + 1] = {
inst = g, certain = false, duringRun = false, age = now - st.t0, embedded = false, via = "scan", } end end
local more = S.EmbedRecorded(recs, containerFrame, "any", true) if more > 0 then embedCount = embedCount + (more)  pcall(function()
if indicator and indicator.Parent then indicator.BackgroundColor3 = C.GREEN end if statusLabel and statusLabel.Parent then statusLabel.Text = string.format(
"✅ xong · GUI sinh trễ đã được nhúng vào tab (%d) — bấm ✕ để trả về màn hình game", embedCount) end end)
end end) end if embedCount == 0 then local late = ScanNewGuis(beforeGuis, nil, true) local real = 0 for _, g in ipairs(late) do
if g.Parent and not g:IsDescendantOf(containerFrame) then real = real + (1)  end end
if real > 0 then lateCandidate = real end end end) if embedCount > 0 then if featureUnhook then pcall(featureUnhook) end
pcall(function() if hookState and hookState.stopWatch then hookState.stopWatch() end end) end if ft then ft.records   = records
ft.lastWhy   = lastWhy ft.indicator = indicator ft.hookState = hookState end pcall(function() print("[taodepzai v5.0 NOIR] ▶ '" .. tostring(name) .. "' · " .. S.DiagText(hookState, records)
.. " · đã nhúng: " .. embedCount) end) if ok then if indicator then indicator.BackgroundColor3 = C.GREEN end if statusLabel then if embedCount > 0 then
statusLabel.Text = string.format( "✅ xong · %d GUI đã nhúng vào tab (bấm ✕ để trả về màn hình game)", embedCount)
elseif not S.embedEnabled then statusLabel.Text = "✅ xong · 🧩 nhúng đang TẮT nên GUI nằm ngoài màn hình — BẬT lại rồi bấm ▶" elseif hookState and hookState.available ~= true then
statusLabel.Text = "⚠️ Executor CHẶN hook Instance.new — hub đã dùng chế độ quét dự phòng" .. (lateCandidate > 0 and (" (thấy " .. lateCandidate .. " GUI mới)") or " (không thấy GUI mới nào)")
.. " · bấm 🔁 'Cứu GUI' ở tab Tạo Tính Năng để ép nhúng · chi tiết ở console (F9)" elseif lateCandidate > 0 then
statusLabel.Text = string.format( "✅ xong · thấy %d GUI mới nhưng chưa nhúng được — MỞ lại tab này hoặc bấm 🔁 'Cứu GUI'%s", lateCandidate, (S.embedGuessNew == true) and "" or " · hoặc bật 🕵 'Đoán GUI trễ'")
else statusLabel.Text = "✅ xong · không thấy script tạo GUI nào (script có tạo ScreenGui không?)" .. (lastWhy and (" · lý do: " .. tostring(lastWhy)) or "") end end return true, nil, records
else if indicator then indicator.BackgroundColor3 = C.RED end if statusLabel then statusLabel.Text = "❌ Lỗi: "..tostring(err) end
warn("[taodepzai v5.0 NOIR] Feature script error:", err) return false, err, records end end
local function CreateFeatureTab(name, icon, codeContent) if not name or #name == 0 then name = "Tính Năng " .. (#featureTabs + 1) end if not icon or #icon == 0 then icon = "⚙️" end
codeContent = NormalizeCode(codeContent) local featureData local sf  = MakeTabFrame() local btn = MakeTabButton(name, icon, featureTabIndex + #featureTabs, function()
task.defer(function() S.OnFeatureTabOpened(featureData) end) end) table.insert(tabs, btn) table.insert(tabContent, sf)
tabBar.CanvasSize = UDim2.new(0, 0, 0, #tabs * 36 + 10) local tabIdx = #tabs featureData = { name = name, icon = icon, code = codeContent,
btn = btn, frame = sf, tabIdx = tabIdx, } table.insert(featureTabs, featureData)
local embedHost = New("Frame", { Size = UDim2.new(1,0,1,-30), Position = UDim2.new(0,0,0,0), BackgroundTransparency = 1,
BorderSizePixel = 0, ZIndex = 5, Name = "ScriptHost", Visible = true, }, sf) featureData.hostFrame = embedHost
local toolbar = New("Frame", { Size = UDim2.new(1,0,0,30), Position = UDim2.new(0,0,1,-30), BackgroundColor3 = Color3.fromRGB(230,233,242),
BackgroundTransparency = 0.1, BorderSizePixel = 0, ZIndex = 20, }, sf) Corner(toolbar, UDim.new(0,6)) Stroke(toolbar, Color3.fromRGB(180,185,200), 1)
local runFeatureBtn = New("TextButton", { Size=UDim2.new(0,76,0,20), Position=UDim2.new(0,6,0,5),
Text="▶ Chạy Script", BackgroundColor3=C.GREEN, BackgroundTransparency=0.1, TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=8, BorderSizePixel=0, ZIndex=21,
}, toolbar) Corner(runFeatureBtn, UDim.new(0,5)) local saveFeatureBtn = New("TextButton", { Size=UDim2.new(0,72,0,20), Position=UDim2.new(0,86,0,5),
Text="📤 Chép Code", BackgroundColor3=C.BLUE, BackgroundTransparency=0.1, TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=8, BorderSizePixel=0, ZIndex=21,
}, toolbar) Corner(saveFeatureBtn, UDim.new(0,5)) local editFeatureBtn = New("TextButton", { Size=UDim2.new(0,46,0,20), Position=UDim2.new(0,162,0,5),
Text="✏️ Sửa", BackgroundColor3=C.ORANGE, BackgroundTransparency=0.1, TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=8, BorderSizePixel=0, ZIndex=21,
}, toolbar) Corner(editFeatureBtn, UDim.new(0,5)) local crosshairBtn = New("TextButton", { Size=UDim2.new(0,58,0,20), Position=UDim2.new(0,212,0,5),
Text="🎯 Tâm", BackgroundColor3=C.PURPLE, BackgroundTransparency=0.1, TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=8, BorderSizePixel=0, ZIndex=21,
}, toolbar) Corner(crosshairBtn, UDim.new(0,5)) S.RegisterCrosshairBtn(crosshairBtn) local closeFeatureBtn = New("TextButton", { Size=UDim2.new(0,32,0,20), Position=UDim2.new(1,-38,0,5),
Text="✕", BackgroundColor3=C.RED, BackgroundTransparency=0.1, TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=10, BorderSizePixel=0, ZIndex=21,
}, toolbar) Corner(closeFeatureBtn, UDim.new(0,5)) local fStatus = New("TextLabel", { Size=UDim2.new(1,-44-274,0,20), Position=UDim2.new(0,274,0,5),
Text="", BackgroundTransparency=1, TextColor3=Color3.fromRGB(255, 205, 64), Font=Enum.Font.GothamMedium, TextSize=8, TextXAlignment=Enum.TextXAlignment.Left,
TextTruncate=Enum.TextTruncate.AtEnd, ZIndex=21, }, toolbar) featureData.status = fStatus
local editorFrame = New("Frame", { Size=UDim2.new(1,0,1,-30), Position=UDim2.new(0,0,0,0), BackgroundColor3=Color3.fromRGB(245,247,252),
BackgroundTransparency=0, BorderSizePixel=0, ZIndex=30, Visible=false, }, sf) local editorBox = New("TextBox", { Size=UDim2.new(1,-16,1,-64), Position=UDim2.new(0,8,0,8),
Text=codeContent, PlaceholderText="Dán script hoàn chỉnh HOẶC link raw vào đây...\nScript có thể tạo GUI riêng, GUI đó sẽ được nhúng vào tab này.",
PlaceholderColor3=Color3.fromRGB(122, 130, 148), BackgroundColor3=Color3.fromRGB(26, 29, 38), BackgroundTransparency=0, TextColor3=Color3.fromRGB(233, 237, 245),
Font=Enum.Font.Code, TextSize=11, BorderSizePixel=0, ClearTextOnFocus=false, MultiLine=true, TextWrapped=true, TextXAlignment=Enum.TextXAlignment.Left, TextYAlignment=Enum.TextYAlignment.Top,
Active=true, Selectable=true, ZIndex=31, }, editorFrame)
Corner(editorBox, UDim.new(0,5)) Stroke(editorBox, Color3.fromRGB(100,120,200), 1.5) New("UIPadding", {PaddingLeft=UDim.new(0,6), PaddingTop=UDim.new(0,4)}, editorBox)
local applyEditBtn = New("TextButton", { Size=UDim2.new(0,96,0,20), Position=UDim2.new(0,8,1,-28),
Text="✅ Áp Dụng", BackgroundColor3=C.GREEN, BackgroundTransparency=0.1, TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=8, BorderSizePixel=0, ZIndex=31,
}, editorFrame) Corner(applyEditBtn, UDim.new(0,5)) local cancelEditBtn = New("TextButton", { Size=UDim2.new(0,96,0,20), Position=UDim2.new(0,110,1,-28),
Text="❌ Hủy", BackgroundColor3=C.RED, BackgroundTransparency=0.1, TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=8, BorderSizePixel=0, ZIndex=31,
}, editorFrame) Corner(cancelEditBtn, UDim.new(0,5)) local function ClearHost() S.ClearEmbedsUnder(embedHost) end runFeatureBtn.Activated:Connect(function() ClearHost()
fStatus.Text = "⏳ Đang chạy..." RunFeatureScript(codeContent, name, embedHost, runFeatureBtn, fStatus) end)
saveFeatureBtn.Activated:Connect(function() local c = codeContent if #c == 0 then fStatus.Text = "⚠️ Không có code!"
return end local n = name local bn = n local cnt = 1 while true do local ex = false for _, s in ipairs(scripts) do
if s.name == n then ex = true; break end end if not ex then break end cnt = cnt + (1)
n = bn.." ("..cnt..")" end table.insert(scripts, {name = n, code = c, expanded = false}) if RebuildScripts then RebuildScripts() end
Store.saveSoon() fStatus.Text = "✅ Đã chép sang tab Code!" end) editFeatureBtn.Activated:Connect(function() editorBox.Text = codeContent
editorFrame.Visible = true end) applyEditBtn.Activated:Connect(function() codeContent = NormalizeCode(editorBox.Text)
featureData.code = codeContent editorFrame.Visible = false ClearHost() Store.saveSoon()
fStatus.Text = "✏️ Đã cập nhật code" end) cancelEditBtn.Activated:Connect(function() editorFrame.Visible = false end) closeFeatureBtn.Activated:Connect(function() ClearHost()
OpenFirstPage()
end) return featureData end task.spawn(function() task.wait(1) local lastSize = main.AbsoluteSize while main and main.Parent do
task.wait(0.15) if main.AbsoluteSize ~= lastSize then lastSize = main.AbsoluteSize if #S.embeds > 0 then
S.SyncAllEmbeds() end S.PruneEmbeds() if _G.BananaCatHub_EmbedHosts then for i = #_G.BananaCatHub_EmbedHosts, 1, -1 do
local host = _G.BananaCatHub_EmbedHosts[i] if not host or not host.Parent then table.remove(_G.BananaCatHub_EmbedHosts, i) end end end end end end)
local createFeatureTab = AddTab("Tạo Tính Năng", "➕", 7)
local cy = 8 Label(createFeatureTab, "➕ Tạo Tab Tính Năng Tích Hợp", cy) cy = cy + 16 Label(createFeatureTab, "Dán NGUYÊN một script hoàn chỉnh HOẶC link raw.", cy)
cy = cy + 14 Label(createFeatureTab, "Script chạy trong tab; GUI của NÓ được nhúng vào menu (không đụng GUI game).", cy)
cy = cy + 14 Label(createFeatureTab, "💾 Tab tạo ra TỰ ĐỘNG được lưu — thoát game vào lại vẫn còn, khỏi cần bấm gì thêm.", cy)
cy = cy + 14 Label(createFeatureTab, "🧩 Bấm 🎯 Chạy Script xong nhớ bấm ✕ hoặc kéo menu to ra — hub tự nhả focus", cy)
cy = cy + 14 Label(createFeatureTab, "    để bạn quay chuột/bắn lại bình thường. Nếu script vẫn chiếm chuột: 🧩 TẮT nhúng.", cy) cy = cy + 18
Label(createFeatureTab, "🏷️ Tên Tính Năng:", cy) cy = cy + 14 local featureNameIn = New("TextBox", { Size=UDim2.new(1,-16,0,26), Position=UDim2.new(0,8,0,cy), Text="",
PlaceholderText="VD: Auto Farm, Fly, Speed...", PlaceholderColor3=Color3.fromRGB(122, 130, 148),
BackgroundColor3=Color3.fromRGB(26, 29, 38), BackgroundTransparency=0, TextColor3=Color3.fromRGB(233, 237, 245), Font=Enum.Font.GothamMedium, TextSize=12, BorderSizePixel=0, ClearTextOnFocus=false,
Active=true, Selectable=true, ZIndex=10, TextXAlignment=Enum.TextXAlignment.Left, }, createFeatureTab)
Corner(featureNameIn, UDim.new(0,5)) Stroke(featureNameIn, Color3.fromRGB(100,120,200), 1.5) New("UIPadding", {PaddingLeft=UDim.new(0,6)}, featureNameIn)
cy = cy + 32 Label(createFeatureTab, "🎨 Icon (1 ký tự, tùy chọn):", cy) cy = cy + 14 local featureIconIn = New("TextBox", { Size=UDim2.new(0,60,0,26), Position=UDim2.new(0,8,0,cy), Text="⚙️",
PlaceholderColor3=Color3.fromRGB(122, 130, 148), BackgroundColor3=Color3.fromRGB(26, 29, 38), BackgroundTransparency=0, TextColor3=Color3.fromRGB(233, 237, 245),
Font=Enum.Font.GothamBold, TextSize=14, BorderSizePixel=0, ClearTextOnFocus=false, Active=true, Selectable=true, ZIndex=10,
}, createFeatureTab) Corner(featureIconIn, UDim.new(0,5)) Stroke(featureIconIn, Color3.fromRGB(180,180,200), 1.2)
cy = cy + 32 Label(createFeatureTab, "📜 Dán Script Hoàn Chỉnh HOẶC link raw:", cy) cy = cy + 14
local featureCodeIn = New("TextBox", { Size=UDim2.new(1,-16,0,140), Position=UDim2.new(0,8,0,cy), Text="",
PlaceholderText="Dán script hoặc link raw (https://...) vào đây...\nScript có thể tạo ScreenGui riêng, GUI đó sẽ được nhúng vào tab.", PlaceholderColor3=Color3.fromRGB(122, 130, 148),
BackgroundColor3=Color3.fromRGB(28, 31, 41), BackgroundTransparency=0, TextColor3=Color3.fromRGB(233, 237, 245), Font=Enum.Font.Code, TextSize=11, BorderSizePixel=0, ClearTextOnFocus=false, MultiLine=true, TextWrapped=true, TextXAlignment=Enum.TextXAlignment.Left, TextYAlignment=Enum.TextYAlignment.Top,
Active=true, Selectable=true, ZIndex=10, }, createFeatureTab)
Corner(featureCodeIn, UDim.new(0,5)) Stroke(featureCodeIn, Color3.fromRGB(100,120,200), 1.5) New("UIPadding", {PaddingLeft=UDim.new(0,6), PaddingTop=UDim.new(0,4)}, featureCodeIn) cy = cy + 146
local createTabBtn = Button(createFeatureTab, "➕ Tạo Tab Tính Năng", 8, cy, 160, 20, Color3.fromRGB(0,150,200)) local clearFormBtn = Button(createFeatureTab, "🧹 Xóa Form", 174, cy, 90, 20, C.ORANGE)
cy = cy + 24
local embedToggleBtn = Button(createFeatureTab, "🧩 Nhúng vào Tab: BẬT", 270, cy - 24, 114, 20, C.GREEN) local guessToggleBtn = Button(createFeatureTab, "🕵 Đoán GUI trễ: TẮT", 8, cy, 144, 20, C.GRAY)
local grabSizeCodeBtn = Button(createFeatureTab, "📏 Code Tự Co Giãn (an toàn, Auto-Lưu)", 158, cy, 226, 20, C.PURPLE) cy = cy + 24
local fixMouseBtn = Button(createFeatureTab, "🖱 Kẹt chuột / không bấm được? Bấm đây", 8, cy, 376, 18, C.RED) cy = cy + 22
local copyTemplateBtn = Button(createFeatureTab, "📋 Copy Code Mẫu Cho AI (menu + niêm tâm)", 8, cy, 376, 20, C.BLUE) cy = cy + 24
S.reembedBtn = Button(createFeatureTab, "🔁 Cứu GUI: nhúng lại GUI của tab ĐANG MỞ vào menu", 8, cy, 376, 20, C.BLUE) cy = cy + 24
S.parkToggleBtn = Button(createFeatureTab, "🪟 GUI chạy ở tab 💻 Code → đưa vào menu: BẬT", 8, cy, 376, 20, C.GREEN) cy = cy + 24 S.SyncEmbedToggles = function()
pcall(function() if D.SyncPageChips then D.SyncPageChips() end end)
pcall(function() embedToggleBtn.Text = S.embedEnabled and "🧩 Nhúng vào Tab: BẬT" or "🧩 Nhúng vào Tab: TẮT" D.SetBg(embedToggleBtn, S.embedEnabled and C.GREEN or C.GRAY)
guessToggleBtn.Text = (S.embedGuessNew == true) and "🕵 Đoán GUI trễ: BẬT" or "🕵 Đoán GUI trễ: TẮT" D.SetBg(guessToggleBtn, (S.embedGuessNew == true) and C.ORANGE or C.GRAY)
if S.parkToggleBtn then local on = (S.parkCodeGuis ~= false) S.parkToggleBtn.Text = on and "🪟 GUI chạy ở tab 💻 Code → đưa vào menu: BẬT" or "🪟 GUI chạy ở tab 💻 Code → để ngoài màn hình: TẮT"
D.SetBg(S.parkToggleBtn, on and C.GREEN or C.GRAY) end end) end S.SyncEmbedToggles()
local createStatus = Label(createFeatureTab, "", cy) createStatus.TextColor3=C.YELLOW; createStatus.TextSize=9; createStatus.ZIndex=6 cy = cy + 14
S.DoToggleEmbed = function() S.embedEnabled = not S.embedEnabled if S.embedEnabled then embedToggleBtn.Text = "🧩 Nhúng vào Tab: BẬT"
D.SetBg(embedToggleBtn, C.GREEN) createStatus.Text = "🧩 BẬT: GUI của script được mượn vào tab. Bấm ✕ trên tab để trả về như cũ."
else embedToggleBtn.Text = "🧩 Nhúng vào Tab: TẮT" D.SetBg(embedToggleBtn, C.GRAY) for _, ft in ipairs(featureTabs) do
local hostFrame = ft.frame and ft.frame:FindFirstChild("ScriptHost") if hostFrame then S.ClearEmbedsUnder(hostFrame) end
end pcall(S.RemoveAllParked) S.PruneEmbeds() createStatus.Text = "🛡 Chế độ an toàn: hub không sửa GUI nào nữa. Muốn nhúng lại thì bấm BẬT." end
Store.saveSoon()
pcall(function() if Store.refreshStatus then Store.refreshStatus() end end) end embedToggleBtn.Activated:Connect(S.DoToggleEmbed)
S.DoToggleGuess = function() S.embedGuessNew = not (S.embedGuessNew == true) if S.embedGuessNew then guessToggleBtn.Text = "🕵 Đoán GUI trễ: BẬT"
D.SetBg(guessToggleBtn, C.ORANGE) createStatus.Text = "🕵 BẬT: script tạo GUI trễ (sau HttpGet/task.wait) sẽ được nhúng — tiện hơn"
.. " nhưng nếu game cũng vừa mở UI đúng lúc thì UI đó có thể bị mượn vào tab (bấm ✕ để trả)." else guessToggleBtn.Text = "🕵 Đoán GUI trễ: TẮT" D.SetBg(guessToggleBtn, C.GRAY)
createStatus.Text = "🛡 An toàn nhất: chỉ nhúng GUI mà hub chắc chắn là của script." .. " Script tạo GUI trễ sẽ chạy bình thường ngoài màn hình, không bị nhúng." end
Store.saveSoon()
end guessToggleBtn.Activated:Connect(S.DoToggleGuess) S.DoTogglePark = function() S.parkCodeGuis = (S.parkCodeGuis == false)
S.SyncEmbedToggles() if S.parkCodeGuis == false then local n = S.RemoveAllParked()
createStatus.Text = "🪟 TẮT: script chạy ở tab 💻 Code / 💾 Code Đã Lưu sẽ để GUI NGOÀI màn hình game" .. (n > 0 and (" · đã trả " .. n .. " GUI về màn hình") or "")
.. " · tab ➕ Tính Năng vẫn nhúng GUI vào tab như bình thường." else
createStatus.Text = "🪟 BẬT: GUI của script chạy ở tab 💻 Code sẽ được đưa vào tab '🧩 GUI Ngoài'" .. " (mỗi GUI có nút ↩ trả về màn hình). Dex/IY/SimpleSpy vẫn LUÔN ở ngoài màn hình game."
end Store.saveSoon()
end S.parkToggleBtn.Activated:Connect(S.DoTogglePark) grabSizeCodeBtn.Activated:Connect(function() local currentCode = featureCodeIn.Text
if #currentCode == 0 then createStatus.Text = "⚠️ Ô code đang trống, không có gì để lấy!" return end
local wrappedCode = [[
local _bcRealNew = Instance.new local _bcMine = {} local _bcHookOn = true
pcall(function() Instance.new = function(cls, ...) local inst = _bcRealNew(cls, ...) if _bcHookOn and cls == "ScreenGui" then _bcMine[#_bcMine + 1] = inst end return inst end end)
]] .. currentCode .. [[
pcall(function() _bcHookOn = false; Instance.new = _bcRealNew end) task.delay(4, function() pcall(function() _bcHookOn = false; Instance.new = _bcRealNew end)
end) task.defer(function() task.wait(0.4) local hub = nil pcall(function() local hubGui = (gethui and gethui()) or game:GetService("Players").LocalPlayer:FindFirstChildOfClass("PlayerGui")
        hub = hubGui and hubGui:FindFirstChild("ExMenu") and hubGui.ExMenu:FindFirstChildWhichIsA("Frame") if not hub then
            local pg = game:GetService("Players").LocalPlayer:FindFirstChildOfClass("PlayerGui") hub = pg and pg:FindFirstChild("ExMenu") and pg.ExMenu:FindFirstChildWhichIsA("Frame") end
    end) for _, g in ipairs(_bcMine) do pcall(function() if not g or not g.Parent then return end
            local root = g:FindFirstChildWhichIsA("Frame") or g:FindFirstChildWhichIsA("ScrollingFrame") or g:FindFirstChildWhichIsA("GuiObject") if not root then return end
            if root.Size and (root.Size.X.Scale ~= 0 or root.Size.Y.Scale ~= 0) then return end local us = root:FindFirstChild("BananaCatFitScale")
            if not us then us = _bcRealNew("UIScale") us.Name = "BananaCatFitScale" us.Parent = root end if hub then local function _bcSync() us.Scale = math.clamp(hub.AbsoluteSize.X / 540, 0.8, 1.6)
                end _bcSync() hub:GetPropertyChangedSignal("AbsoluteSize"):Connect(function() pcall(_bcSync) end) end end) end end)
]]
local saveName = "AutoSize_"..os.date("%H%M%S") local bn = saveName local cnt = 1 while true do
local ex = false for _, s in ipairs(scripts) do if s.name == saveName then ex = true; break end end if not ex then break end cnt = cnt + (1)  saveName = bn.." ("..cnt..")" end
table.insert(scripts, {name = saveName, code = wrappedCode, expanded = false}) if RebuildScripts then RebuildScripts() end Store.saveSoon()
createStatus.Text = "✅ Đã lưu bản tự co giãn vào tab 'Code Đã Lưu': "..saveName.. " · để tab tính năng co giãn theo menu thì KHÔNG cần bản này, hub tự làm khi bấm ▶ Chạy Script."
end) S.DoFixMouse = function() local done = {} ReleaseHubFocus() done[#done+1] = "nhả focus" local restored = 0 for _, ft in ipairs(featureTabs) do
local hostFrame = ft.frame and ft.frame:FindFirstChild("ScriptHost") if hostFrame then restored = restored + S.ClearEmbedsUnder(hostFrame) end
end if restored > 0 then done[#done+1] = "đã trả " .. restored .. " GUI về game" end for _, e in ipairs(S.embeds) do pcall(function() e.host.Visible = e.gui.Enabled end) end
pcall(function() UserInputService.MouseBehavior = Enum.MouseBehavior.Default end) done[#done+1] = "chuột về mặc định"
createStatus.Text = "🖱 " .. table.concat(done, " · ") .. " — vẫn không được? 🧩 TẮT nhúng rồi bấm ▶ lại (lúc đó hub không đụng GUI nào)"
return table.concat(done, " · ") end fixMouseBtn.Activated:Connect(S.DoFixMouse) S.reembedBtn.Activated:Connect(function() ReleaseHubFocus()
local ft = S.FindActiveFeature() if not ft then createStatus.Text = "⚠️ Hãy MỞ tab tính năng cần cứu trước (bấm vào tab đó cho nó hiện ra) rồi hãy bấm 🔁." return
end if not S.embedEnabled then createStatus.Text = "⚠️ 🧩 'Nhúng vào Tab' đang TẮT — BẬT lại rồi mới cứu GUI được." return end
createStatus.Text = "⏳ Đang tìm GUI của '" .. ft.name .. "' để nhúng lại vào menu..." task.defer(function()
local n, why = S.ReembedFeature(ft, true) if n > 0 then createStatus.Text = string.format( "✅ Đã nhúng lại %d GUI vào tab '%s'. Nếu lỡ nhúng nhầm GUI khác, mở tab đó bấm ✕ để trả về.", n, ft.name)
pcall(function() if ft.status and ft.status.Parent then ft.status.Text = string.format("✅ đã nhúng lại %d GUI vào tab (nút 🔁 Cứu GUI)", n) end
if ft.indicator and ft.indicator.Parent then ft.indicator.BackgroundColor3 = C.GREEN end end) else
createStatus.Text = "⚠️ Chưa nhúng được: " .. tostring(why or "không rõ lý do") .. " · bấm ▶ Chạy Script lại rồi CHỜ 10 giây (hub tự thử lại 5 lần) · xem console (F9) để biết hook có bị executor chặn không."
end print(string.format("[taodepzai v5.0 NOIR] 🔁 Cứu GUI tab '%s': %d GUI đã nhúng%s", tostring(ft.name), n, why and (" · lý do bỏ qua: " .. tostring(why)) or "")) end) end)
copyTemplateBtn.Activated:Connect(function() ReleaseHubFocus() local nm = (featureNameIn.Text or ""):gsub('[\r	"]', " "):gsub("^%s+", ""):gsub("%s+$", "") if #nm == 0 then nm = "Tính Năng Mới" end
local ic = (featureIconIn.Text or ""):gsub('[\r	"]', " ") if #ic == 0 then ic = "⚙️" end
local stamp pcall(function() stamp = os.date("sinh %H:%M %d/%m/%Y") end) local code = S.FeatureTemplate(nm, ic, stamp)
local copied = S.CopyToClipboard(code) local inBox = false if #featureCodeIn.Text == 0 then featureCodeIn.Text = code
inBox = true end local saveName = "Mẫu " .. nm local baseName = saveName local cnt = 1 while true do local exists = false for _, sc in ipairs(scripts) do
if sc.name == saveName then exists = true break end end if not exists then break end cnt = cnt + 1 saveName = baseName .. " (" .. cnt .. ")" end
table.insert(scripts, {name = saveName, code = code, expanded = false}) if RebuildScripts then RebuildScripts() end Store.saveSoon()
createStatus.Text = (copied and ("📋 ĐÃ COPY " .. #code .. " ký tự vào clipboard") or ("⚠️ Executor không có setclipboard — lấy code ở tab 'Code Đã Lưu'"))
.. " · đã lưu '" .. saveName .. "'" .. (inBox and " · đã điền vào ô code" or " · ô code giữ nguyên code của bạn")
.. " · gửi NGUYÊN đoạn code đó cho AI/người viết script, dán lại rồi bấm ▶ Chạy Script." local oldLabel = copyTemplateBtn.Text
copyTemplateBtn.Text = "✅ Đã copy code mẫu cho: " .. nm task.delay(2.6, function() if copyTemplateBtn and copyTemplateBtn.Parent then copyTemplateBtn.Text = oldLabel end end)
print("[taodepzai v5.0 NOIR] 📋 Code mẫu '" .. nm .. "' (" .. #code .. " ký tự) — clipboard: " .. tostring(copied)) end)
Label(createFeatureTab, "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", cy) cy = cy + 16 Label(createFeatureTab, "📋 Danh Sách Tab Tính Năng Đã Tạo:", cy) cy = cy + 16
local featureListFrame = New("Frame", { Size=UDim2.new(1,-16,0,0), Position=UDim2.new(0,8,0,cy), BackgroundTransparency=1, BorderSizePixel=0, ZIndex=6, }, createFeatureTab)
New("UIListLayout", {SortOrder=Enum.SortOrder.LayoutOrder, Padding=UDim.new(0,4)}, featureListFrame)
local function RebuildFeatureList() for _, c in ipairs(featureListFrame:GetChildren()) do if not c:IsA("UIListLayout") then c:Destroy() end end
if #featureTabs == 0 then New("TextLabel", { Size=UDim2.new(1,0,0,30), Text="📭 Chưa có tab tính năng nào.",
BackgroundTransparency=1, TextColor3=C.GRAY, Font=Enum.Font.GothamMedium, TextSize=10, TextXAlignment=Enum.TextXAlignment.Center, TextYAlignment=Enum.TextYAlignment.Center, ZIndex=7,
}, featureListFrame) createFeatureTab.CanvasSize = UDim2.new(0, 0, 0, cy + 50) return end local totalH = 0 for i, ft in ipairs(featureTabs) do
local row = New("Frame", { Size=UDim2.new(1,0,0,28), BackgroundColor3=Color3.fromRGB(26, 29, 38),
BackgroundTransparency=0.1, BorderSizePixel=0, ZIndex=6, }, featureListFrame) Corner(row, UDim.new(0,5)); Stroke(row) New("TextLabel", { Size=UDim2.new(1,-82,1,0), Position=UDim2.new(0,8,0,0),
Text=ft.icon.." "..ft.name, BackgroundTransparency=1, TextColor3=C.DARK, Font=Enum.Font.GothamBold, TextSize=9, TextXAlignment=Enum.TextXAlignment.Left, ZIndex=7,
}, row) local goBtn = New("TextButton", { Size=UDim2.new(0,44,0,18), Position=UDim2.new(1,-72,0,5),
Text="➡ Mở", BackgroundColor3=C.BLUE, BackgroundTransparency=0.1, TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=8, BorderSizePixel=0, ZIndex=8,
}, row) Corner(goBtn, UDim.new(0,4)) goBtn.Activated:Connect(function() for i, b in ipairs(tabs) do
if b == ft.btn then SwitchTab(i); break end end end) local delBtn = New("TextButton", { Size=UDim2.new(0,22,0,18), Position=UDim2.new(1,-25,0,5),
Text="🗑", BackgroundColor3=C.RED, BackgroundTransparency=0.1, TextColor3=C.WHITE, Font=Enum.Font.GothamBold, TextSize=8, BorderSizePixel=0, ZIndex=8,
}, row) Corner(delBtn, UDim.new(0,4)) delBtn.Activated:Connect(function() local idx = nil for j, t in ipairs(tabs) do if t == ft.btn then idx = j; break end end if idx then
if activeTab == ft.frame then OpenFirstPage() end
local hostFrame = ft.frame and ft.frame:FindFirstChild("ScriptHost") if hostFrame then S.ClearEmbedsUnder(hostFrame) end
ft.btn:Destroy() ft.frame:Destroy() table.remove(tabs, idx) table.remove(tabContent, idx)
table.remove(featureTabs, i) for j, t in ipairs(tabs) do t.LayoutOrder = j end for j, ft2 in ipairs(featureTabs) do
for k, t in ipairs(tabs) do if t == ft2.btn then ft2.tabIdx = k; break end end end RebuildFeatureList() Store.saveSoon()
end end) totalH = totalH + 32 end featureListFrame.Size = UDim2.new(1,-16,0,totalH) createFeatureTab.CanvasSize = UDim2.new(0, 0, 0, cy + totalH + 30) end
createTabBtn.Activated:Connect(function() local n = featureNameIn.Text local ic = featureIconIn.Text local c = featureCodeIn.Text
if #n == 0 then createStatus.Text = "⚠️ Vui lòng nhập tên tính năng!" return end if #c == 0 then createStatus.Text = "⚠️ Vui lòng dán script!" return end
for _, ft in ipairs(featureTabs) do if ft.name == n then createStatus.Text = "⚠️ Tên tính năng đã tồn tại!" return end end CreateFeatureTab(n, ic, c) RebuildFeatureList()
Store.saveSoon()
createStatus.Text = "✅ Đã tạo tab: "..n.." (đã lưu)" featureNameIn.Text = "" featureIconIn.Text = "⚙️" featureCodeIn.Text = ""
SwitchTab(#tabs) end) clearFormBtn.Activated:Connect(function() featureNameIn.Text = "" featureIconIn.Text = "⚙️" featureCodeIn.Text = "" createStatus.Text = "🧹 Đã xóa form" end)
RebuildFeatureList() pcall(function() createFeatureTab.CanvasSize = UDim2.new(0, 0, 0, cy + 40) end)
Store.restoreFeatures = function() for i = #featureTabs, 1, -1 do local ft = featureTabs[i] for j, b in ipairs(tabs) do
if b == ft.btn then table.remove(tabs, j) table.remove(tabContent, j) break end end if activeTab == ft.frame then OpenFirstPage() end
local hostFrame = ft.frame and ft.frame:FindFirstChild("ScriptHost") if hostFrame then S.ClearEmbedsUnder(hostFrame) end
pcall(function() ft.btn:Destroy() end) pcall(function() ft.frame:Destroy() end) table.remove(featureTabs, i) end
for _, f in ipairs(Store.loadedFeatures) do CreateFeatureTab(f.name, f.icon, f.code) end for j, t in ipairs(tabs) do t.LayoutOrder = j end tabBar.CanvasSize = UDim2.new(0, 0, 0, #tabs * 44 + 10)
RebuildFeatureList() if Store.refreshStatus then Store.refreshStatus() end end if #Store.loadedFeatures > 0 then Store.restoreFeatures()
createStatus.Text = string.format("💾 Đã khôi phục %d tab tính năng từ bộ nhớ", #Store.loadedFeatures) end S.Move = { fly = false, noclip = false, infJump = false, speed = false, carpet = false,
runMode = false,
sprint = false, sprintSpeed = 50,
highJump = false, highJumpSpeed = 80,
_hud = nil, _hudUp = nil, _hudDown = nil, _hudCarpet = nil, _hudClose = nil, _menuWasOpen = nil, flySpeed = 50, walkSpeed = 16, jumpPower = 50,
speedMode = "x", speedMul = 3, appliedWS = nil, carpetW = 6, carpetH = 0.5, carpetL = 6,
carpetGap = 0.2,
carpetSlack = 0.5, carpetHold = true, carpetEdge = true, carpetY = nil,
_carpet = nil, _bv = nil, _bg = nil, _floor = nil, _ncConn = nil, _ncDesc = nil, _ncChar = nil, _ncLast = nil, _ijConn = nil, _ijConn2 = nil, _speedThread = nil,
_origCC = {},
_baseWS = 16, _baseJP = 50,
_wd = nil, _lastJump = nil, _ijBaseJP = nil, _ijBaseJH = nil, _carpetRetries = 0,
} local MV = S.Move _G.BananaCatHub_MV = S.Move
function MV.comp(v, k, dft) if v == nil then return dft end local ok, val = pcall(function() return v[k] end) if ok and type(val) == "number" then return val end return dft end
local function mvClamp(n, lo, hi, dft) n = tonumber(n) if n == nil or n ~= n then return dft end if n < lo then return lo end
if n > hi then return hi end return n end function MV.Char() return player.Character end MV._cachedChar = nil MV._cachedHum = nil MV._cachedRoot = nil MV._cacheAt = 0 function MV.Hum()
local now = os.clock() if MV._cachedChar == player.Character and MV._cachedHum and MV._cachedHum.Parent and (now - MV._cacheAt) < 1.0 then
return MV._cachedHum end local c = player.Character local h = c and c:FindFirstChildOfClass("Humanoid") or nil MV._cachedChar = c MV._cachedHum = h MV._cacheAt = now if h then
local ok, rp = pcall(function() return h.RootPart end) if ok and rp then MV._cachedRoot = rp end end return h end function MV.Root()
local now = os.clock() if MV._cachedChar == player.Character and MV._cachedRoot and MV._cachedRoot.Parent and (now - MV._cacheAt) < 1.0 then
return MV._cachedRoot end local c = player.Character local r = c and c:FindFirstChild("HumanoidRootPart") or nil
MV._cachedChar = c MV._cachedRoot = r MV._cacheAt = now return r end function MV.InvalidateCache() MV._cachedChar, MV._cachedHum, MV._cachedRoot, MV._cacheAt = nil, nil, nil, 0 end
function MV._NcPart(p) if not (p and p.IsA and p:IsA("BasePart")) then return end MV._ncParts = MV._ncParts or {} if MV._origCC[p] == nil then
MV._origCC[p] = MV._ncParts[p] and true or p.CanCollide end if p.CanCollide ~= false then pcall(function() p.CanCollide = false end) end
MV._ncParts[p] = true end function MV._NcScan() local c = MV.Char() if not c then return end if MV._ncChar ~= c then
if MV._ncDesc then pcall(function() MV._ncDesc:Disconnect() end) end MV._ncChar = c MV._ncParts = {}
MV._ncDesc = trackConn(c.DescendantAdded:Connect(MV._NcPart)) end for _, p in ipairs(c:GetDescendants()) do MV._NcPart(p) end end
function MV._NcEnforce() if not MV.noclip then return end local c = MV.Char() local parts = MV._ncParts if not c or not parts then return end
for p in pairs(parts) do local ok = pcall(function() if p:IsDescendantOf(c) then if p.CanCollide ~= false then p.CanCollide = false end else
parts[p] = nil
end end) if not ok then parts[p] = nil end end end function MV._NcAssist() if MV.fly or not (MV.noclip and MV.ncPass ~= false) then
MV._passBlocked, MV._passPX, MV._passPZ, MV._passAt = 0, nil, nil, nil return end local onCarpet = (MV.carpet == true) or (MV.runMode == true) local h, r = MV.Hum(), MV.Root()
if not h or not r then MV._passBlocked, MV._passPX, MV._passPZ, MV._passAt = 0, nil, nil, nil return end
local now = os.clock() local dt = now - (MV._passAt or now) MV._passAt = now if dt <= 0 or dt > 0.5 then dt = 1 / 60 end
local okMD, md = pcall(function() return h.MoveDirection end) local mx = okMD and MV.comp(md, "X", 0) or 0 local mz = okMD and MV.comp(md, "Z", 0) or 0
local want = math.sqrt(mx * mx + mz * mz)
local px, pz = MV.comp(r.Position, "X", nil), MV.comp(r.Position, "Z", nil) if not (px and pz) then return end local moved = 0 if MV._passPX then
local dx, dz = px - MV._passPX, pz - MV._passPZ moved = math.sqrt(dx * dx + dz * dz) end MV._passPX, MV._passPZ = px, pz local spd = mvClamp(tonumber(MV.WantSpeed()) or 16, 6, 120)
local ws = tonumber(MV.comp(h, "WalkSpeed", nil)) or spd local expect = math.min(spd, ws) * want * dt if want <= 0.1 then
MV._passBlocked = 0
elseif moved < expect * (onCarpet and 0.12 or 0.35) then MV._passBlocked = (MV._passBlocked or 0) + dt
else MV._passBlocked = (MV._passBlocked or 0) * 0.5
end if (MV._passBlocked or 0) < (onCarpet and 0.35 or 0.2) or want <= 0.1 then return end local ux, uz = mx / want, mz / want
local stepLen = onCarpet and math.min(spd * dt * 0.5, 0.4)
or math.min(spd * dt * 1.15, 3)
local y = MV.comp(r.Position, "Y", nil) if y == nil then return end
pcall(function() r.CFrame = CFrame.new(px + ux * stepLen, y, pz + uz * stepLen) end) end function MV._NcStep() if not MV.noclip then return end
local c = MV.Char() if not c then return end local now = os.clock() if MV._ncChar ~= c or not MV._ncLast or (now - MV._ncLast) > 0.5 then MV._ncLast = now
MV._NcScan()
end MV._ncEnforceAcc = (MV._ncEnforceAcc or 0) + (now - (MV._ncEnforceLast or now)) MV._ncEnforceLast = now if MV._ncEnforceAcc >= 0.15 then MV._ncEnforceAcc = 0
MV._NcEnforce()
MV._NcAssist()
end end function MV._NcBind(on) if on and not MV._ncBound then MV._ncBound = true
local ok = pcall(function() RunService:BindToRenderStep("BC_NoClip", Enum.RenderPriority.Last.Value, function() pcall(MV._NcStep) end) end) if not ok then MV._ncBound = false end
elseif (not on) and MV._ncBound then MV._ncBound = false pcall(function() RunService:UnbindFromRenderStep("BC_NoClip") end) end return MV._ncBound
end function MV._NcForgetLost() for p in pairs(MV._origCC) do if not (p and p.Parent) then MV._origCC[p] = nil end
end end function MV._NcRestore() for p, v in pairs(MV._origCC) do if p and p.Parent then pcall(function() p.CanCollide = v end) end MV._origCC[p] = nil end
MV._origCC = {} MV._ncParts = {} end function MV.SetNoclip(on) on = (on == true) if on == MV.noclip then return MV.noclip end MV.noclip = on if on then
MV._ncLast = nil MV._ncParts = {} MV._passBlocked, MV._passPX, MV._passPZ, MV._passAt = 0, nil, nil, nil if MV.ncPass == nil then MV.ncPass = true end
MV._NcScan()
MV._ncConn = trackConn(RunService.Stepped:Connect(MV._NcStep)) MV._NcBind(true)
else for _, c in ipairs({ MV._ncConn, MV._ncDesc }) do if c then pcall(function() c:Disconnect() end) end end MV._ncConn, MV._ncDesc, MV._ncChar, MV._ncLast = nil, nil, nil, nil MV._NcBind(false)
MV._passBlocked, MV._passPX, MV._passPZ, MV._passAt = 0, nil, nil, nil MV._NcRestore() end MV._Watchdog()
if MV.SyncFlyHud then MV.SyncFlyHud() end return MV.noclip end function MV._JumpGuard() local h = MV.Hum()
if not h then return end pcall(function() local jp = mvClamp(MV.jumpPower, 1, 500) if h.UseJumpPower ~= false then if (tonumber(h.JumpPower) or 0) < 1 then h.JumpPower = jp end end
if (tonumber(h.JumpHeight) or 0) < 0.1 then local g = tonumber(workspace.Gravity) or 0 if g < 1 then g = 196.2 end
h.JumpHeight = mvClamp((jp * jp) / (2 * g), 1, 500) end end) end function MV._JumpConfirm(y0) if not MV.infJump then return end local r2 = MV.Root() if not r2 then return end
local up = r2.Position.Y - y0 local v  = r2.AssemblyLinearVelocity local vy = MV.comp(v, "Y", 0) if up < 0.4 and vy < 10 then
pcall(function() r2.AssemblyLinearVelocity = Vector3.new( MV.comp(v, "X", 0), MV.WantJumpSpeed(), MV.comp(v, "Z", 0)) end)
end end function MV._DoJump() if not MV.infJump then return false end local h, r = MV.Hum(), MV.Root() if not h or not r then return false end
if h.Sit or h.PlatformStand then return false end
local now = os.clock() if MV._lastJump and (now - MV._lastJump) < 0.12 then return false end
MV._lastJump = now MV._JumpGuard() local y0 = r.Position.Y pcall(function() h:ChangeState(Enum.HumanoidStateType.Jumping) end)
pcall(function() h.Jump = true end) task.delay(0.08, function() pcall(MV._JumpConfirm, y0) end) return true end
function MV.SetInfJump(on) on = (on == true) if on == MV.infJump then return MV.infJump end MV.infJump = on
if on then local h = MV.Hum() if h then MV._ijBaseJP, MV._ijBaseJH = h.JumpPower, h.JumpHeight end MV._JumpGuard()
MV._ijConn  = trackConn(UserInputService.JumpRequest:Connect(function() pcall(MV._DoJump) end)) MV._ijConn2 = trackConn(UserInputService.InputBegan:Connect(function(i, gp)
if not MV.infJump then return end pcall(function() local tb = UserInputService:GetFocusedTextBox() if tb and tb:IsDescendantOf(gui) then return end
local k = i and i.KeyCode if k == Enum.KeyCode.Space or k == Enum.KeyCode.ButtonA then MV._DoJump() end end) end))
else for _, c in ipairs({ MV._ijConn, MV._ijConn2 }) do if c then pcall(function() c:Disconnect() end) end end
MV._ijConn, MV._ijConn2 = nil, nil local h = MV.Hum() if h then if MV._ijBaseJP ~= nil then pcall(function() h.JumpPower  = MV._ijBaseJP end) end
if MV._ijBaseJH ~= nil then pcall(function() h.JumpHeight = MV._ijBaseJH end) end end MV._ijBaseJP, MV._ijBaseJH = nil, nil end
MV._Watchdog() return MV.infJump end function MV.WantSpeed() if MV.speedMode == "x" then
local base = tonumber(MV._baseWS) or 16 return mvClamp(base * mvClamp(MV.speedMul, 1, 20), 0, 500) end return mvClamp(MV.walkSpeed, 0, 500)
end function MV.ApplyChar() local h = MV.Hum() if not h then return end if MV.speed then local want = MV.WantSpeed() h.WalkSpeed = want MV.appliedWS = want if not MV.highJump then
local jp = mvClamp(MV.jumpPower, 0, 500) if h.JumpPower ~= jp then h.JumpPower = jp end end else h.WalkSpeed  = MV._baseWS or 16
if not MV.highJump then h.JumpPower  = MV._baseJP or 50 end MV.appliedWS = nil end end function MV.SpeedStep() local h = MV.Hum() if not h or not MV.speed then return end
if MV.appliedWS ~= nil and math.abs((tonumber(h.WalkSpeed) or 0) - MV.appliedWS) > 0.01 then MV._baseWS = tonumber(h.WalkSpeed) or MV._baseWS
end MV.ApplyChar() end function MV.SetSpeed(on) on = (on == true) if on == MV.speed then return MV.speed end local h = MV.Hum()
if on and not MV.speed and h then
MV._baseWS = h.WalkSpeed  or 16 MV._baseJP = h.JumpPower  or 50 end MV.speed = on MV.ApplyChar() MV._Watchdog() return MV.speed end
function MV._NeedWatch() return (MV.fly or MV.noclip or MV.infJump or MV.speed or MV.runMode or MV.sprint or MV.highJump or (MV.Safe and MV.Safe.on)) == true end
function MV._KeepAlive() if MV.speed or MV.runMode then pcall(MV.SpeedStep) end if MV.sprint then pcall(MV._EnsureSpeed) if not MV._speedBound or (tick() - (MV._speedFrameAt or 0)) > 0.6 then
MV._speedBound = false pcall(MV._BindSpeed) pcall(MV._SpeedFrame) end end if MV.infJump or MV.runMode then pcall(MV._JumpGuard) end if MV.highJump then pcall(MV._HighJumpApplyPower) end
if MV.fly then pcall(MV._EnsureFly) if not MV._flyBound or (tick() - (MV._flyFrameAt or 0)) > 0.6 then MV._flyBound = false
pcall(MV._BindFly) pcall(MV._FlyFrame) end end if MV.Safe and MV.Safe.on and (tick() - (MV.Safe._lastFrameAt or 0)) > 0.6 then
MV.Safe._bound = false pcall(MV.Safe.Bind) pcall(MV.Safe.Step, 0.1) end end function MV._Watchdog() if not MV._NeedWatch() then MV._wdToken = nil local thread = MV._wd
MV._wd = nil if type(thread) == "thread" and thread ~= coroutine.running() then pcall(task.cancel, thread) end return end if MV._wdToken then return end local token = {}
MV._wdToken = token local thread = task.spawn(function() while MV._wdToken == token and MV._NeedWatch() do pcall(MV._KeepAlive) task.wait(0.3)
end if MV._wdToken == token then MV._wdToken, MV._wd = nil, nil end end) if MV._wdToken == token then MV._wd = thread end end
do local FL = { x = 0, z = 0, y = 0, holds = {}, showHud = true, focused = true, conns = {} } MV.Flight = FL function MV.ClearFlyInput() FL.x, FL.z, FL.y = 0, 0, 0
FL.holds, FL.joyInput, FL.dragInput = {}, nil, nil if FL.knob and FL.knob.Parent then FL.knob.Position = UDim2.new(0.5, -14, 0.5, -14) end
end function MV.SetFlyVirtual(x, z, y) FL.x, FL.z, FL.y = mvClamp(x, -1, 1, 0), mvClamp(z, -1, 1, 0), mvClamp(y, -1, 1, 0) end
function MV._RestoreFlyHum() local h = FL.hum if h and h.Parent then h.PlatformStand = FL.platformStand h.AutoRotate = FL.autoRotate end FL.hum = nil end function MV._DestroyFlyParts()
for _, key in ipairs({"_bv", "_bg", "_floor"}) do if MV[key] then MV[key]:Destroy(); MV[key] = nil end end end function MV._EnsureFly()
local r, h = MV.Root(), MV.Hum() if not MV.fly then return nil end if not r or not h or h.Health <= 0 then MV._DestroyFlyParts() MV._RestoreFlyHum() MV.ClearFlyInput() FL.root = nil return nil
end if FL.root ~= r then MV._DestroyFlyParts() MV._RestoreFlyHum() MV.ClearFlyInput() FL.root = r end if FL.hum ~= h then MV._RestoreFlyHum()
FL.hum, FL.platformStand, FL.autoRotate = h, h.PlatformStand, h.AutoRotate end if not MV._bv or MV._bv.Parent ~= r then if MV._bv then MV._bv:Destroy() end MV._bv = New("BodyVelocity", {
Name = "BC_FlyVel", MaxForce = Vector3.new(1e9, 1e9, 1e9), Velocity = Vector3.zero, }, r) end if not MV._bg or MV._bg.Parent ~= r then
if MV._bg then MV._bg:Destroy() end MV._bg = New("BodyGyro", { Name = "BC_FlyGyro", MaxTorque = Vector3.new(1e9, 1e9, 1e9), P = 1e4, D = 50, }, r)
end if h.PlatformStand ~= true then h.PlatformStand = true end if h.AutoRotate ~= false then h.AutoRotate = false end if not MV._floor or not MV._floor.Parent then MV._floor = New("Part", {
Name = "BC_FlyFloor", Size = Vector3.new(6, 0.2, 6), Transparency = 0.7, Color = Color3.fromRGB(200, 230, 255), Material = Enum.Material.Glass,
Anchored = true, CanCollide = false, CanTouch = false, CanQuery = false, }, workspace) end return r, h end
function MV._ReadFlyInput(cf, h) if not FL.focused or UserInputService:GetFocusedTextBox() then return Vector3.zero end
local x, z, y = FL.x, FL.z, FL.y local virtualDirection = FL.joyInput ~= nil or math.abs(x) + math.abs(z) > 0
for _, v in pairs(FL.holds) do x = x + (v.X) ; y = y + (v.Y) ; z = z + (v.Z) if v.X ~= 0 or v.Z ~= 0 then virtualDirection = true end end
local w = UserInputService:IsKeyDown(Enum.KeyCode.W) local s = UserInputService:IsKeyDown(Enum.KeyCode.S) local a = UserInputService:IsKeyDown(Enum.KeyCode.A)
local d = UserInputService:IsKeyDown(Enum.KeyCode.D) if w or s or a or d then x, z = (d and 1 or 0) - (a and 1 or 0), (s and 1 or 0) - (w and 1 or 0) elseif not virtualDirection and h then
local md = h.MoveDirection local right = Vector3.new(cf.RightVector.X, 0, cf.RightVector.Z)
if right.Magnitude > 0.001 then right = right.Unit else right = Vector3.new(1, 0, 0) end local forward = Vector3.new(right.Z, 0, -right.X)
x, z = md:Dot(right), -md:Dot(forward) end local up = UserInputService:IsKeyDown(Enum.KeyCode.Space)
local down = UserInputService:IsKeyDown(Enum.KeyCode.LeftShift) or UserInputService:IsKeyDown(Enum.KeyCode.LeftControl)
if up or down then y = (up and 1 or 0) - (down and 1 or 0) end return Vector3.new(x, y, z) end function MV.FlyVelocity(cf, input, speed)
local direction = cf.RightVector * input.X - cf.LookVector * input.Z + Vector3.new(0, input.Y, 0) local magnitude = direction.Magnitude if magnitude < 0.001 then return Vector3.zero end
if magnitude > 1 then direction = direction / magnitude end
return direction * mvClamp(speed, 1, 2000, 50) end function MV._FlyStep() if not MV.fly then return end
MV._flyFrameAt = tick() local r, h = MV._EnsureFly() if not r then return end local cam = workspace.CurrentCamera
if cam then local cf = cam.CFrame MV._bv.Velocity = MV.FlyVelocity(cf, MV._ReadFlyInput(cf, h), MV.flySpeed)
MV._bg.CFrame = CFrame.new(r.Position) * cf.Rotation else MV._bv.Velocity = Vector3.zero end
MV._floor.Position = r.Position - Vector3.new(0, 3.5, 0) end function MV._FlyFrame() local ok, err = pcall(MV._FlyStep) if not ok then
FL.lastError = tostring(err) pcall(function() if MV._bv then MV._bv.Velocity = Vector3.zero end end)
if tick() - (FL.errorAt or -math.huge) > 2 then FL.errorAt = tick() warn("[taodepzai v5.0 NOIR] 🚀 Bay: " .. FL.lastError) end
end end function MV._BindFly() if MV._flyBound or not MV.fly then return end RunService:UnbindFromRenderStep("Fly")
RunService:BindToRenderStep("Fly", Enum.RenderPriority.Camera.Value + 1, MV._FlyFrame) MV._flyBound = true MV._flyFrameAt = tick() end
function MV._StopFly() RunService:UnbindFromRenderStep("Fly") MV._flyBound = false MV._DestroyFlyParts() MV._RestoreFlyHum()
MV.ClearFlyInput() FL.root = nil end function MV.SetFly(on) on = (on == true) if on then local r, h = MV.Root(), MV.Hum()
if not r or not h or h.Health <= 0 then return false, "chưa có nhân vật sống để bay" end if MV.Safe and MV.Safe.on then MV.Safe.Stop() end
if MV._glassFlyActive then MV.StopGlassFly() end if MV._playerFlyActive then MV.StopPlayerFly() end
if MV.runMode then MV.SetRunMode(false) end if not MV.fly then MV.ClearFlyInput() end MV.fly = true MV._EnsureFly() MV._BindFly()
MV._FlyFrame()
else MV.fly = false MV._StopFly() end MV._Watchdog() MV.SyncHud() if S.SyncTunePanel then pcall(S.SyncTunePanel) end return MV.fly end function MV.SetFlySpeed(n)
n = tonumber(n) if not n or n ~= n or n == math.huge or n == -math.huge then return false, "nhập tốc độ 1–2000" end MV.flySpeed = mvClamp(n, 1, 2000, 50)
MV.SyncHud() if S.RefreshMovePanel then S.RefreshMovePanel() end if S.SyncTunePanel then pcall(S.SyncTunePanel) end return true, MV.flySpeed
end function MV.SetFlyHud(on) FL.showHud = (on == true) if not FL.showHud then MV.ClearFlyInput() end
MV.SyncHud() return FL.showHud end function MV.SyncFlyHud() if S.SyncFlyPanel then S.SyncFlyPanel() end end
trackConn(UserInputService.WindowFocusReleased:Connect(function() FL.focused = false MV.ClearFlyInput() if MV._bv then MV._bv.Velocity = Vector3.zero end end))
trackConn(UserInputService.WindowFocused:Connect(function() FL.focused = true end))
end
do local CS = { focused = true } MV.CamSpeed = CS function MV._DestroySpeedParts() if MV._sv then MV._sv:Destroy(); MV._sv = nil end end function MV._EnsureSpeed()
if not MV.sprint then return nil end if MV.fly or MV._playerFlyActive or MV._glassFlyActive or MV._objFlyActive or (MV.Safe and MV.Safe.on) then
MV._DestroySpeedParts() CS.root = nil return nil end
local r, h = MV.Root(), MV.Hum() if not r or not h or h.Health <= 0 then MV._DestroySpeedParts() CS.root = nil return nil end if CS.root ~= r then
MV._DestroySpeedParts() CS.root = r end if not MV._sv or MV._sv.Parent ~= r then if MV._sv then MV._sv:Destroy() end
MV._sv = New("BodyVelocity", { Name = "BC_SpeedVel", MaxForce = Vector3.new(1e9, 0, 1e9), Velocity = Vector3.zero, }, r) else
local mf = MV._sv.MaxForce if mf and (mf.Y ~= 0) then MV._sv.MaxForce = Vector3.new(1e9, 0, 1e9) end
end return r, h end function MV._ReadSpeedInput(cf, h) if not CS.focused or UserInputService:GetFocusedTextBox() then return Vector3.zero end
local x, z = 0, 0 local w = UserInputService:IsKeyDown(Enum.KeyCode.W) local s = UserInputService:IsKeyDown(Enum.KeyCode.S) local a = UserInputService:IsKeyDown(Enum.KeyCode.A)
local d = UserInputService:IsKeyDown(Enum.KeyCode.D) if w or s or a or d then x, z = (d and 1 or 0) - (a and 1 or 0), (s and 1 or 0) - (w and 1 or 0) elseif h then local md = h.MoveDirection
local right = Vector3.new(cf.RightVector.X, 0, cf.RightVector.Z) if right.Magnitude > 0.001 then right = right.Unit else right = Vector3.new(1, 0, 0) end
local forward = Vector3.new(right.Z, 0, -right.X) x, z = md:Dot(right), -md:Dot(forward) end return Vector3.new(x, 0, z)
end function MV.SpeedVelocity(cf, input, speed) local look = Vector3.new(cf.LookVector.X, 0, cf.LookVector.Z)
local right = Vector3.new(cf.RightVector.X, 0, cf.RightVector.Z) if look.Magnitude < 0.001 then
if right.Magnitude > 0.001 then right = right.Unit else right = Vector3.new(1, 0, 0) end look = Vector3.new(right.Z, 0, -right.X) else look = look.Unit
end if right.Magnitude > 0.001 then right = right.Unit else right = Vector3.new(1, 0, 0) end local direction = right * input.X - look * input.Z
direction = Vector3.new(direction.X, 0, direction.Z) local magnitude = direction.Magnitude
if magnitude < 0.001 then return Vector3.zero end if magnitude > 1 then direction = direction / magnitude end
return direction * mvClamp(speed, 1, 2000, 50) end function MV._SpeedStep() if not MV.sprint then return end
MV._speedFrameAt = tick() local r, h = MV._EnsureSpeed() if not r or not MV._sv then return end
local cam = workspace.CurrentCamera if not cam then MV._sv.MaxForce = Vector3.new(0, 0, 0) MV._sv.Velocity = Vector3.zero return end
local vel = MV.SpeedVelocity(cam.CFrame, MV._ReadSpeedInput(cam.CFrame, h), MV.sprintSpeed) if vel.Magnitude < 0.001 then MV._sv.MaxForce = Vector3.new(0, 0, 0)
MV._sv.Velocity = Vector3.zero else MV._sv.MaxForce = Vector3.new(1e9, 0, 1e9) MV._sv.Velocity = Vector3.new(vel.X, 0, vel.Z)
end end function MV._SpeedFrame() local ok, err = pcall(MV._SpeedStep) if not ok then CS.lastError = tostring(err) pcall(function() if MV._sv then MV._sv.Velocity = Vector3.zero end end)
if tick() - (CS.errorAt or -math.huge) > 2 then CS.errorAt = tick() warn("[taodepzai v5.0 NOIR] 💨 Tốc độ: " .. CS.lastError) end
end end function MV._BindSpeed() if MV._speedBound or not MV.sprint then return end RunService:UnbindFromRenderStep("BC_Speed")
RunService:BindToRenderStep("BC_Speed", Enum.RenderPriority.Camera.Value + 1, MV._SpeedFrame) MV._speedBound = true MV._speedFrameAt = tick() end
function MV._StopSpeed() RunService:UnbindFromRenderStep("BC_Speed") MV._speedBound = false MV._DestroySpeedParts() CS.root = nil end function MV.SetSprint(on) on = (on == true) if on then
local r, h = MV.Root(), MV.Hum() if not r or not h or h.Health <= 0 then return false, "chưa có nhân vật sống để chạy" end
MV.sprint = true MV._EnsureSpeed() MV._BindSpeed() MV._SpeedFrame() else MV.sprint = false MV._StopSpeed() end MV._Watchdog()
if S.SyncSpeedPanel then S.SyncSpeedPanel() end if S.SyncTunePanel then pcall(S.SyncTunePanel) end return MV.sprint end function MV.SetSprintSpeed(n)
n = tonumber(n) if not n or n ~= n or n == math.huge or n == -math.huge then return false, "nhập tốc độ 1–2000" end
MV.sprintSpeed = mvClamp(n, 1, 2000, 50) if S.SyncSpeedPanel then S.SyncSpeedPanel() end if S.SyncTunePanel then pcall(S.SyncTunePanel) end return true, MV.sprintSpeed end
end
do local HJ = { last = 0 } MV.HighJump = HJ function MV.WantJumpSpeed() if MV.highJump then return mvClamp(MV.highJumpSpeed, 1, 500, 80) end return mvClamp(MV.jumpPower, 1, 500, 50) end
function MV.HighJumpVelocity(current, speed) local vx = MV.comp(current, "X", 0) local vz = MV.comp(current, "Z", 0) return Vector3.new(vx, mvClamp(speed, 1, 500, 80), vz)
end function MV._HighJumpApplyPower() if not MV.highJump then return end local h = MV.Hum() if not h then return end
local jp = mvClamp(MV.highJumpSpeed, 1, 500, 80) pcall(function() if h.UseJumpPower ~= false then if (tonumber(h.JumpPower) or 0) ~= jp then h.JumpPower = jp end
end local g = tonumber(workspace.Gravity) or 0 if g < 1 then g = 196.2 end
local jh = mvClamp((jp * jp) / (2 * g), 1, 500) if math.abs((tonumber(h.JumpHeight) or 0) - jh) > 0.05 then h.JumpHeight = jh end end) end
function MV._DoHighJump() if not MV.highJump then return false end
if MV.fly or (MV.Safe and MV.Safe.on) then return false end local h, r = MV.Hum(), MV.Root() if not h or not r then return false end
if h.Sit then return false end local st = h:GetState() if st == Enum.HumanoidStateType.Freefall then return false end local now = os.clock()
if HJ.last and (now - HJ.last) < 0.12 then return false end HJ.last = now MV._HighJumpApplyPower() pcall(function() h:ChangeState(Enum.HumanoidStateType.Jumping) end)
pcall(function() h.Jump = true end) pcall(function() r.AssemblyLinearVelocity = MV.HighJumpVelocity(r.AssemblyLinearVelocity, MV.highJumpSpeed)
end) return true end function MV._HighJumpBind() if HJ.conn or not MV.highJump then return end HJ.conn = trackConn(UserInputService.JumpRequest:Connect(function()
pcall(MV._DoHighJump) end)) HJ.conn2 = trackConn(UserInputService.InputBegan:Connect(function(i, gp) if not MV.highJump then return end pcall(function()
local tb = UserInputService:GetFocusedTextBox() if tb and tb:IsDescendantOf(gui) then return end
local k = i and i.KeyCode if k == Enum.KeyCode.Space or k == Enum.KeyCode.ButtonA then MV._DoHighJump() end end) end)) end
function MV._HighJumpUnbind() for _, c in ipairs({ HJ.conn, HJ.conn2 }) do if c then pcall(function() c:Disconnect() end) end end
HJ.conn, HJ.conn2 = nil, nil end function MV.SetHighJump(on) on = (on == true) if on == MV.highJump then return MV.highJump end local h = MV.Hum() if on then
if h then HJ.baseJP, HJ.baseJH = h.JumpPower, h.JumpHeight end MV.highJump = true MV._HighJumpApplyPower() MV._HighJumpBind() else MV.highJump = false
MV._HighJumpUnbind() if h and not MV.infJump then if HJ.baseJP ~= nil then pcall(function() h.JumpPower = HJ.baseJP end) end
if HJ.baseJH ~= nil then pcall(function() h.JumpHeight = HJ.baseJH end) end end HJ.baseJP, HJ.baseJH = nil, nil end
MV._Watchdog() if S.SyncHighJumpPanel then S.SyncHighJumpPanel() end if S.SyncTunePanel then pcall(S.SyncTunePanel) end return MV.highJump end function MV.SetHighJumpSpeed(n) n = tonumber(n)
if not n or n ~= n or n == math.huge or n == -math.huge then return false, "nhập tốc độ nhảy 1–500" end MV.highJumpSpeed = mvClamp(n, 1, 500, 80)
if MV.highJump then pcall(MV._HighJumpApplyPower) end if S.SyncHighJumpPanel then S.SyncHighJumpPanel() end
if S.SyncTunePanel then pcall(S.SyncTunePanel) end return true, MV.highJumpSpeed end end
do MV.Safe = { on = false, auto = true,
radius = 25,
speed = 60,
steer = 4,
shield = true,
shieldThk = 0.4,
shieldH = 0,
shieldSize = 0,
shieldT = 0.86,
avoidPlayers = true,
circle = true,
circleR = 20,
lookTime = 1.0,
lookMul = 1.6,
_holdAt = 0,
_myV = Vector3.new(0, 0, 0),
_ang = 0, _center = nil,
noclip = true,
_ncPrev = nil,
_shield = nil,
_shieldPos = nil, _hum = nil,
_platformStandPrev = nil, _autoRotatePrev = nil, _root = nil,
_bound = false,
_lastFrameAt = 0,
playerThreats = 0, threats = 0, nearest = nil,
_rep = Vector3.new(0, 0, 0),
_seen = {}, _cache = nil, _listAcc = 0, _sc = 0, _virtX = 0, _virtZ = 0, _virtY = 0, showHud = true, _hud = nil,
_joyBG = nil, _joyKnob = nil, _dragging = false, _bv = nil, _bg = nil, } local SF = MV.Safe local function sfIsPart(d) if d == nil then return false end
local okA, isPart = pcall(function() return d:IsA("BasePart") end)
if okA and isPart ~= nil then return isPart == true end local okC, cls = pcall(function() return tostring(d.ClassName or "") end)
if not okC then return false end return (cls == "Part" or cls == "MeshPart" or cls == "WedgePart" or cls == "TrussPart"
or cls == "CornerWedgePart" or cls == "UnionOperation" or cls == "NegateOperation" or cls == "IntersectOperation" or cls == "Ball" or cls == "Cylinder"
or cls == "SpawnLocation" or cls == "Seat" or cls == "VehicleSeat" or cls == "Platform") end
local function sfIgnore(d, char) local nm = tostring(d.Name or "") if nm:sub(1, 3) == "BC_" then return true end if char and d:IsDescendantOf(char) then return true end local floor = MV._floor
if floor and floor.Parent and d:IsDescendantOf(floor) then return true end return false end local function sfOverlap(char)
if SF._op and SF._opChar == char then return SF._op end local ok, op = pcall(function() return OverlapParams.new() end) if not ok or op == nil then return nil end
pcall(function() op.MaxParts = 0 end)
pcall(function() op.RespectCanCollide = false end)
pcall(function() op.FilterType = Enum.RaycastFilterType.Exclude end)
pcall(function() op.FilterDescendantsInstances = { char } end)
SF._op, SF._opChar = op, char return op end local function sfCandidates(pos, dt, reach) local r0 = reach or SF.radius local char0 = MV.Char()
local op0 = sfOverlap(char0) local okL, list = pcall(function() return workspace:GetPartBoundsInRadius(pos, r0, op0) end)
if not okL then okL, list = pcall(function() return workspace:GetPartBoundsInRadius(pos, r0) end) end if okL and type(list) == "table" then return list end SF._listAcc = (SF._listAcc or 0) + (dt or 0.15)
if not SF._cache or SF._listAcc >= 2 then SF._listAcc = 0 local out = {} local ok2, desc = pcall(function() return workspace:GetDescendants() end)
if ok2 and type(desc) == "table" then for _, d in ipairs(desc) do if #out >= 600 then break end if sfIsPart(d) then out[#out + 1] = d end end end SF._cache = out end return SF._cache or {}
end local function sfPlayers(pos, rad, rep0, near0) local rep, n, near = rep0, 0, near0 if not SF.avoidPlayers then return rep, n, near end
local char = MV.Char() local ok, list = pcall(function() return Players:GetPlayers() end)
if not ok or type(list) ~= "table" then return rep, n, near end for _, pl in ipairs(list) do if pl ~= player then local ch = pl.Character if ch and ch ~= char then
local hrp = ch:FindFirstChild("HumanoidRootPart") or ch:FindFirstChildOfClass("BasePart") local pp = hrp and hrp.Position
if pp then local delta = pp - pos local dist = delta.Magnitude if dist <= rad and dist > 0.01 then
n = n + 1 if near == nil or dist < near then near = dist end local w = 1 - (dist / rad) rep = rep - (delta / dist) * (0.5 + w * w * 3)
end end end end end return rep, n, near end function MV.Safe.Scan(pos, dt) local char = MV.Char()
local rad = mvClamp(SF.radius, 1, 300, 25) local reach = rad * mvClamp(SF.lookMul, 1, 4, 1.6) local lookT = mvClamp(SF.lookTime, 0.1, 3, 1.0)
local myV = SF._myV or Vector3.new(0, 0, 0)
local rep = Vector3.new(0, 0, 0) local n, near = 0, nil local now = tick() local seen = {}
local pchars = {} local pls = Players:GetPlayers() if type(pls) == "table" then for _, pl in ipairs(pls) do
if pl ~= player then local ch2 = pl.Character if ch2 ~= nil and ch2 ~= char then pchars[ch2] = true end end end
end local hasPChar = (next(pchars) ~= nil) local function inPChar(d) if not hasPChar then return false end
for ch2 in pairs(pchars) do if d:IsDescendantOf(ch2) then return true end end return false end SF._mvCount = 0
for _, d in ipairs(sfCandidates(pos, dt, reach)) do if sfIsPart(d) and not sfIgnore(d, char) and not inPChar(d) then
local p = d.Position if p then local delta = p - pos local dist = delta.Magnitude
local rr = 0 local sz = d.Size if sz then local mx = math.max(sz.X, sz.Y, sz.Z) if type(mx) == "number" then rr = mx * 0.5 end
end if rr > rad * 0.75 then rr = rad * 0.75 end local surf = dist - rr if surf < 0 then surf = 0 end if surf <= reach and dist > 0.01 then local dir = delta / dist
local moving, closing = false, 0 local v = d.AssemblyLinearVelocity if v and v.Magnitude then if v.Magnitude > 1.5 then moving = true end
closing = -(v.X * dir.X + v.Y * dir.Y + v.Z * dir.Z) end local old = SF._seen[d] if old then local dd = (p - old.p).Magnitude
local ddt = math.max(now - old.t, 0.02) if dd > 0.35 or (dd / ddt) > 1.5 then moving = true end
if closing <= 0.5 and dd > 0.1 then closing = math.max(closing, dd / ddt) end end if not moving then local hum0 = d:FindFirstAncestorOfClass("Humanoid") if hum0 == nil then
local anc = d.Parent if anc then hum0 = anc:FindFirstChildOfClass("Humanoid") end end if hum0 ~= nil then
local md = hum0.MoveDirection local mdMag = 0 if md then local m2 = md.Magnitude if type(m2) == "number" then mdMag = m2 end end if mdMag > 0.05 then moving = true end end end
if moving and surf <= reach then SF._mvCount = (SF._mvCount or 0) + 1 end seen[d] = { p = p, t = now }
local danger = (surf <= rad and moving) local tHit = nil if closing > 0.5 then tHit = (surf - rad * 0.35) / closing
if tHit <= lookT then danger = true end end if danger then n = n + 1
if near == nil or surf < near then near = surf end local w = mvClamp(1 - (surf / (rad * mvClamp(SF.lookMul, 1, 4, 1.6))), 0.2, 1)
local myDot = mvClamp(myV.X * dir.X + myV.Y * dir.Y + myV.Z * dir.Z, 0, 200) local boost = 1 + mvClamp(closing, 0, 200) / 60 + myDot / 240 local pv = p
if v and v.Magnitude > 0.1 then pv = p + v * 0.35 end local pdir = pv - pos if pdir.Magnitude > 0.01 then pdir = pdir.Unit
if (pdir.X * dir.X + pdir.Y * dir.Y + pdir.Z * dir.Z) < 0 then pdir = dir end else pdir = dir end rep = rep - pdir * (0.35 + w * w * 3) * boost
end end end end end local pn0 = n rep, n, near = sfPlayers(pos, rad, rep, near) SF.playerThreats = n n = pn0 + n
SF._seen = seen SF._rep = rep SF.movers = SF._mvCount or 0 SF._mvCount = nil SF.threats, SF.nearest = n, near if n > 0 then SF._holdAt = now
SF._lastThreatAt = now
if rep.Magnitude > 0 then SF._lastRep = rep end
end return n, near, rep end function MV.Safe.KillShield() for i = 1, 4 do local w = SF._shield and SF._shield[i] if w then pcall(function() w:Destroy() end) end
end SF._shield, SF._shieldPos = nil, nil end function MV.Safe.ShieldHalf() local n = tonumber(SF.shieldSize) if n and n > 0 then return mvClamp(n, 0.5, 300, 3) end
local w = 2 local r = MV.Root() if r then pcall(function() w = math.max(tonumber(r.Size.X) or 2, tonumber(r.Size.Z) or 2) end) end
return mvClamp(w * 0.5 + 1.6, 2, 8, 3)
end function MV.Safe.ShieldHeight() local n = tonumber(SF.shieldH) if n and n > 0 then return mvClamp(n, 1, 100, 8) end
local hh = 2 local r = MV.Root() if r then pcall(function() hh = tonumber(r.Size.Y) or 2 end) end return mvClamp(hh * 3 + 2, 4, 14, 8)
end function MV.Safe.BuildShield() MV.Safe.KillShield() local side, h = MV.Safe.ShieldHalf(), MV.Safe.ShieldHeight()
local thk = SF.shieldThk SF._shield = {} for i = 1, 4 do local long = (i <= 2) local w = New("Part", { Name = "BC_Shield" .. i,
Size = long and Vector3.new(side * 2 + thk, h, thk) or Vector3.new(thk, h, side * 2 + thk), Transparency = SF.shieldT, Color = Color3.fromRGB(120, 225, 255),
Material = Enum.Material.Glass, Anchored = true, CanCollide = false, CastShadow = false, }, workspace) SF._shield[i] = w
end end function MV.Safe.UpdateShield(pos) if not (SF.on and SF.shield) then
if SF._shield then MV.Safe.KillShield() end return end local side = MV.Safe.ShieldHalf() local wallH = MV.Safe.ShieldHeight()
local need = (SF._shield == nil) if not need then for i = 1, 4 do local w = SF._shield[i] if not w or not w.Parent then need = true break end end
end if need then pcall(MV.Safe.BuildShield) end if not SF._shield or not SF._shield[1] then return end
local q = SF._shieldPos if q and math.abs(q.X - pos.X) < 0.05 and math.abs(q.Y - pos.Y) < 0.05 and math.abs(q.Z - pos.Z) < 0.05
and math.abs((q.S or 0) - side) < 0.01 and math.abs((q.H or 0) - wallH) < 0.01 then return
end SF._shieldPos = { X = pos.X, Y = pos.Y, Z = pos.Z, S = side, H = wallH } for i = 1, 4 do local w = SF._shield[i]
if w then local dx, dz = 0, 0 if i == 1 then dz = side elseif i == 2 then dz = -side elseif i == 3 then dx = side else dx = -side end local okS = pcall(function()
w.Size = (i <= 2) and Vector3.new(side * 2 + SF.shieldThk, wallH, SF.shieldThk) or Vector3.new(SF.shieldThk, wallH, side * 2 + SF.shieldThk)
w.CFrame = CFrame.new(pos.X + dx, pos.Y, pos.Z + dz) end) if not okS then MV.Safe.KillShield(); return end end
end end function MV.Safe._EnsureBV() local r = MV.Root() if not r then return nil, nil end
if SF._bv and SF._bv.Parent == r and SF._bg and SF._bg.Parent == r then return SF._bv, SF._bg end pcall(function() if SF._bv then SF._bv:Destroy() end end)
pcall(function() if SF._bg then SF._bg:Destroy() end end) local bv = New("BodyVelocity", { Name = "BC_SafeFlyVel", MaxForce = Vector3.new(1e9, 1e9, 1e9), Velocity = Vector3.new(0,0,0) }, r)
local bg = New("BodyGyro", { Name = "BC_SafeFlyGyro", MaxTorque = Vector3.new(1e9, 1e9, 1e9), P = 1e4, D = 50 }, r) SF._bv, SF._bg = bv, bg local h = MV.Hum()
if h then if SF._hum ~= h then SF._hum = h pcall(function() SF._platformStandPrev = h.PlatformStand end) pcall(function() SF._autoRotatePrev = h.AutoRotate end) end
pcall(function() h.PlatformStand = true end) pcall(function() h.AutoRotate = false end) end return bv, bg end
function MV.Safe._RestoreHum() local h = SF._hum if h and h.Parent then if SF._platformStandPrev ~= nil then
pcall(function() h.PlatformStand = SF._platformStandPrev end) end if SF._autoRotatePrev ~= nil then pcall(function() h.AutoRotate = SF._autoRotatePrev end) end end SF._hum = nil
SF._platformStandPrev = nil SF._autoRotatePrev = nil end function MV.Safe.Repair() local r = MV.Root()
if not r then return false end local bv, bg = MV.Safe._EnsureBV() if not bv or MV.Root() ~= r then return false
end MV.flySpeed = mvClamp(SF.speed, 1, 2000, 60) return true end function MV.Safe.Bind()
if SF._bound then return true end SF._bound = pcall(function() RunService:BindToRenderStep("BC_Safe", 2, MV.Safe._Frame) end)
return SF._bound == true end function MV.Safe.Unbind() SF._bound = false pcall(function() RunService:UnbindFromRenderStep("BC_Safe") end)
end function MV.Safe._Frame(dt) pcall(MV.Safe.Step, dt) end function MV.Safe.Step(dt) if not SF.on then return end
SF._lastFrameAt = tick() local r, h = MV.Root(), MV.Hum() if not r then if SF._shield then pcall(MV.Safe.KillShield) end SF._root = nil
return end if SF._root ~= r then SF._root = r pcall(MV.Safe.Reset) SF._shieldPos = nil if SF.shield then pcall(MV.Safe.KillShield) end pcall(MV.Safe._EnsureBV) end
if not (SF._bv and SF._bv.Parent == r) then pcall(MV.Safe._EnsureBV) end local bv = SF._bv if not (bv and bv.Parent == r) then return end local bg = SF._bg
if h then if h.PlatformStand ~= true then pcall(function() h.PlatformStand = true end) end if h.AutoRotate ~= false then pcall(function() h.AutoRotate = false end) end
end local dtv = tonumber(dt) or 0.016 SF._sc = (SF._sc or 0) + dtv local sinceThreat = tick() - (SF._lastThreatAt or 0)
local ivScan = (((SF.threats or 0) > 0) or sinceThreat < 1.0) and 0.10 or 0.30 if S.PagePerf and not S.PagePerf.IsMainVisible() then ivScan = ivScan * 1.8 end
if SF._sc >= ivScan then
local okS = pcall(MV.Safe.Scan, r.Position, SF._sc) SF._sc = 0 if not okS then SF.threats, SF.nearest = 0, nil end end local now = tick()
local contact = ((SF.threats or 0) > 0) or ((now - (SF._holdAt or 0)) < 0.35) local keys = (h and h.MoveDirection) or Vector3.new(0, 0, 0)
local vX = tonumber(SF._virtX) or 0 local vZ = tonumber(SF._virtZ) or 0 if math.abs(vX) > 0.01 or math.abs(vZ) > 0.01 then keys = Vector3.new(vX, 0, vZ) end
local busy = keys.Magnitude >= 0.01
local dir = keys if dir.Magnitude < 0.01 and SF.auto then local cam = workspace.CurrentCamera if cam then
local look = cam.CFrame.LookVector dir = Vector3.new(look.X, 0, look.Z) end end if dir.Magnitude > 0 then dir = dir.Unit else dir = Vector3.new(0, 0, 0) end
local up = UserInputService:IsKeyDown(Enum.KeyCode.Space) local down = UserInputService:IsKeyDown(Enum.KeyCode.LeftShift)
or UserInputService:IsKeyDown(Enum.KeyCode.LeftControl) local vY = tonumber(SF._virtY) or 0 local vv if math.abs(vY) > 0.01 then vv = vY
else vv = (up and 1 or 0) - (down and 1 or 0) end local spd = mvClamp(SF.speed, 1, 2000, 60) local target if SF.circle and SF.auto and (not busy) and (not contact) then
local R = mvClamp(SF.circleR, 3, 300, 20) local cx, cy, cz = r.Position.X, r.Position.Y, r.Position.Z if SF._center then cx, cy, cz = SF._center.X, SF._center.Y, SF._center.Z end
local dxz = math.sqrt((r.Position.X - cx) ^ 2 + (r.Position.Z - cz) ^ 2) if dxz > R * 1.6 then
SF._center = nil cx, cy, cz = r.Position.X, r.Position.Y, r.Position.Z elseif SF._center == nil then SF._center = { X = cx, Y = cy, Z = cz } end
SF._ang = (SF._ang or 0) + dtv * (spd / math.max(R, 1))
local tx = cx + math.cos(SF._ang) * R local tz = cz + math.sin(SF._ang) * R
local tang = Vector3.new(-math.sin(SF._ang), 0, math.cos(SF._ang)) * spd local want = Vector3.new(tx - r.Position.X, cy - r.Position.Y, tz - r.Position.Z)
target = tang + want * 2.2 + Vector3.new(0, vv * spd, 0) if target.Magnitude > spd then target = target.Unit * spd end else
SF._center = nil
target = (dir + Vector3.new(0, vv, 0)) * spd end local rep = SF._rep if (rep == nil or rep.Magnitude < 0.01) and SF._lastRep ~= nil then
local el = now - (SF._lastThreatAt or 0) if el < 0.9 then rep = SF._lastRep * (1 - el / 0.9) end
end if rep and rep.Magnitude > 0 then target = target + rep * (spd * (0.25 + 0.09 * mvClamp(SF.steer, 1, 10, 4))) local cap = spd * 2
if target.Magnitude > cap then target = target.Unit * cap end end
if SF.nearest and SF.nearest < mvClamp(SF.radius, 1, 300, 25) * 0.4 then target = target + Vector3.new(0, spd * 0.75, 0) end SF._myV = target
bv.Velocity = target if bg and target.Magnitude > 0.1 then local lookPos = r.Position + Vector3.new(target.X, 0, target.Z) if (lookPos - r.Position).Magnitude > 0.1 then
bg.CFrame = CFrame.new(r.Position, lookPos) end end if SF.shield then pcall(MV.Safe.UpdateShield, r.Position) end
SF._hudAcc = (SF._hudAcc or 0) + dtv if SF._hudAcc >= 0.3 then SF._hudAcc = 0 if SF._hudUpdate then pcall(SF._hudUpdate) end end end function MV.Safe.Set(on)
if on == true and MV.fly then MV.SetFly(false) end
SF.on = (on == true) if SF.on then if SF.noclip and SF._ncPrev == nil then
if MV._glassFlyActive == true and MV._glassFlyNcPrev ~= nil then SF._ncPrev = MV._glassFlyNcPrev else SF._ncPrev = MV.noclip == true
end pcall(function() MV.SetNoclip(true) end) end pcall(MV.Safe._EnsureBV) MV.flySpeed = mvClamp(SF.speed, 1, 2000, 60) SF._root = MV.Root() pcall(MV._Watchdog) SF._lastFrameAt = tick()
pcall(MV.Safe.Bind) pcall(function() MV.Safe.UpdateShield(MV.Root() and MV.Root().Position or Vector3.new(0, 0, 0)) end)
pcall(function() MV.Safe.SyncHud() end) else pcall(MV.Safe.Unbind) MV.Safe.Reset()
pcall(function() MV.Safe.ClearVirt() end) pcall(function() if SF._bv then SF._bv:Destroy() end end) pcall(function() if SF._bg then SF._bg:Destroy() end end)
SF._bv, SF._bg = nil, nil if not MV.fly then pcall(MV.Safe._RestoreHum) end MV.Safe.KillShield() SF._root = nil if SF._ncPrev ~= nil then local was = SF._ncPrev SF._ncPrev = nil
local stillFlying = (MV._glassFlyActive == true) or (MV._playerFlyActive == true) if not stillFlying then
pcall(function() MV.SetNoclip(was) end) end end pcall(function() MV.Safe.SyncHud() end)
end return SF.on end function MV.Safe.SetNoclipAuto(b) SF.noclip = (b == true) if SF.on then if SF.noclip then if SF._ncPrev == nil then
if MV._glassFlyActive == true and MV._glassFlyNcPrev ~= nil then SF._ncPrev = MV._glassFlyNcPrev else SF._ncPrev = MV.noclip == true
end end pcall(function() MV.SetNoclip(true) end) elseif SF._ncPrev ~= nil then local was = SF._ncPrev SF._ncPrev = nil pcall(function() MV.SetNoclip(was) end) end
end return SF.noclip end function MV.Safe.SetShield(b)
SF.shield = (b == true) if SF.on and SF.shield then local r = MV.Root() if r then pcall(MV.Safe.UpdateShield, r.Position) end else MV.Safe.KillShield() end return SF.shield end
function MV.Safe.SetAvoidPlayers(b) SF.avoidPlayers = (b == true) MV.Safe.Reset() return SF.avoidPlayers end
function MV.Safe.Reset()
SF._seen, SF._cache = {}, nil SF._rep = Vector3.new(0, 0, 0) SF.threats, SF.nearest, SF.playerThreats = 0, nil, 0
SF.movers, SF._lastRep, SF._lastThreatAt, SF._mvCount = 0, nil, nil, nil
SF._holdAt, SF._center, SF._ang = 0, nil, 0 SF._myV = Vector3.new(0, 0, 0) end function MV.Safe.Stop() return MV.Safe.Set(false) end
function MV.Safe.SetCircle(b) SF.circle = (b == true) SF._center = nil return SF.circle end
function MV.Safe.SetCircleR(n) SF.circleR = mvClamp(n, 3, 300, 20) SF._center = nil return SF.circleR end function MV.Safe.Recenter() SF._center = nil return true end
function MV.Safe.SetLook(t)
SF.lookTime = mvClamp(t, 0.1, 3, 1.0) return SF.lookTime end function MV.Safe.SetRadius(n) SF.radius = mvClamp(n, 1, 300, 25) MV.Safe.Reset()
SF._shieldPos = nil
if SF.on and SF.shield then local r = MV.Root() if r then pcall(MV.Safe.UpdateShield, r.Position) end end
return SF.radius end function MV.Safe.SetShieldSize(n) SF.shieldSize = mvClamp(n, 0, 300, 0)
SF._shieldPos = nil if SF.on and SF.shield then local r = MV.Root() if r then pcall(MV.Safe.UpdateShield, r.Position) end
end return SF.shieldSize end function MV.Safe.SetSpeed(n) SF.speed = mvClamp(n, 1, 2000, 60) MV.flySpeed = SF.speed
return SF.speed end function MV.Safe.SetSteer(n) SF.steer = mvClamp(n, 1, 10, 4); return SF.steer end function MV.Safe.SetAuto(b) SF.auto = (b == true); return SF.auto end
function MV.Safe.Status() if not SF.on then return "🛡 bay an toàn: đang TẮT (khiên đã dọn, Xuyên Tường trả lại như cũ)" end
local s = string.format("🛡 bay an toàn: BẬT · 💨 %g · 📏 né trong %gm · 🌀 %g", SF.speed, SF.radius, SF.steer) if SF.auto then s = s .. " · ➡ tự bay" end if SF.shield then
local half = MV.Safe.ShieldHalf() s = s .. string.format(" · 🔲 khiên %g m/cạnh%s", half * 2, (tonumber(SF.shieldSize) or 0) > 0 and "" or " (tự)")
end if SF.circle and SF.auto then local busy = false local hum0 = MV.Hum() local md0 = hum0 and hum0.MoveDirection
if md0 and md0.Magnitude and md0.Magnitude >= 0.01 then busy = true end if math.abs(tonumber(SF._virtX) or 0) > 0.01 or math.abs(tonumber(SF._virtZ) or 0) > 0.01 then busy = true end
if (SF.threats or 0) > 0 then s = s .. " · ⭕ tạm dừng (đang né)" elseif busy then s = s .. " · ⭕ tạm dừng (đang bấm phím)"
else s = s .. " · ⭕ bay vòng tròn " .. tostring(math.floor(SF.circleR + 0.5)) .. "m" end end
if (SF.movers or 0) > 0 and (SF.threats or 0) == 0 then s = s .. string.format(" · 🐾 thấy %d vật đang chạy", SF.movers) end
if SF.noclip then s = s .. " · 🧱 xuyên vật cản" end if (SF.threats or 0) > 0 then
s = s .. string.format(" · ⚠️ đang né %d mối nguy (gần nhất %gm)", SF.threats, math.floor((SF.nearest or 0) + 0.5))
if (SF.playerThreats or 0) > 0 then s = s .. string.format(" — có %d người chơi", SF.playerThreats) end else
s = s .. " · ✅ quanh đây không có gì lao tới mình" end if SF.showHud and SF.on then s = s .. " · 📱 nút ảo BẬT"
end return s end function MV.Safe.SetVirt(x, z, y) SF._virtX = mvClamp(tonumber(x) or 0, -1, 1, 0)
SF._virtZ = mvClamp(tonumber(z) or 0, -1, 1, 0) SF._virtY = mvClamp(tonumber(y) or 0, -1, 1, 0) return SF._virtX, SF._virtZ, SF._virtY end
function MV.Safe.ClearVirt() SF._virtX, SF._virtZ, SF._virtY = 0, 0, 0 return true end
function MV.Safe.SetShowHud(b) SF.showHud = (b == true) if not SF.showHud then pcall(function() MV.Safe.ClearVirt() end) pcall(function()
if SF._joyKnob then SF._joyKnob.Position = UDim2.new(0.5, -16, 0.5, -16) end end) SF._dragging = false end
pcall(function() MV.Safe.SyncHud() end) return SF.showHud end function MV.Safe._BuildHud()
if SF._hud and SF._hud.Parent then return SF._hud end local hud = New("Frame", { Name = "BC_SafeHud",
Size = UDim2.new(0, 248, 0, 160), Position = UDim2.new(0, 10, 1, -170), BackgroundColor3 = C.SURFACE, BackgroundTransparency = 0.18,
BorderSizePixel = 0, Visible = false, ZIndex = 25, }, gui)
Corner(hud, UDim.new(0, 10)) Stroke(hud, C.HAIRLINE, 1) D.Shade(hud, Color3.fromRGB(255,255,255), Color3.fromRGB(188,192,205), 90)
local title = New("TextLabel", { Size = UDim2.new(1, -60, 0, 16), Position = UDim2.new(0, 8, 0, 3),
Text = "🛡 Bay An Toàn - Nút Ảo", BackgroundTransparency = 1, TextColor3 = C.ACCENT, Font = Enum.Font.GothamBold, TextSize = 9,
TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 26, }, hud) local hideBtn = New("TextButton", { Size = UDim2.new(0, 22, 0, 16), Position = UDim2.new(1, -50, 0, 2),
Text = "👁", BackgroundColor3 = C.SURFACE3, BackgroundTransparency = 0.15, TextColor3 = C.MUTED, Font = Enum.Font.GothamBold, TextSize = 9,
BorderSizePixel = 0, ZIndex = 26, }, hud) Corner(hideBtn, UDim.new(0, 5)) hideBtn.Activated:Connect(function()
MV.Safe.SetShowHud(false) D.Say("📱 đã ẩn nút ảo 🛡 (vào khung 🛡 trong 📚 Script Hub để BẬT lại)", C.MUTED) end)
local closeBtn = New("TextButton", { Size = UDim2.new(0, 22, 0, 16), Position = UDim2.new(1, -25, 0, 2),
Text = "✕", BackgroundColor3 = C.RED, BackgroundTransparency = 0.2, TextColor3 = C.WHITE, Font = Enum.Font.GothamBold, TextSize = 9,
BorderSizePixel = 0, ZIndex = 26, }, hud) Corner(closeBtn, UDim.new(0, 5)) closeBtn.Activated:Connect(function()
MV.Safe.Stop() D.Say("🚫 đã tắt 🛡 Bay An Toàn", C.YELLOW) end) local joyBG = New("Frame", { Name = "JoyBG",
Size = UDim2.new(0, 92, 0, 92), Position = UDim2.new(0, 8, 0, 22), BackgroundColor3 = C.SURFACE2, BackgroundTransparency = 0.15,
BorderSizePixel = 0, ZIndex = 26, }, hud) Corner(joyBG, UDim.new(0, 12)) Stroke(joyBG, C.BORDER, 1) SF._joyBG = joyBG local joyKnob = New("Frame", { Name = "JoyKnob",
Size = UDim2.new(0, 26, 0, 26), Position = UDim2.new(0.5, -13, 0.5, -13), BackgroundColor3 = C.ACCENT, BackgroundTransparency = 0.15,
BorderSizePixel = 0, ZIndex = 27, }, joyBG) Corner(joyKnob, UDim.new(1, 0)) Stroke(joyKnob, C.WHITE, 1) SF._joyKnob = joyKnob
local function dirBtn(txt, x, y, vx, vz) local b = New("TextButton", {
Size = UDim2.new(0, 22, 0, 22), Position = UDim2.new(0, x, 0, y), Text = txt, BackgroundColor3 = C.SURFACE3, BackgroundTransparency = 0.2,
TextColor3 = C.DARK, Font = Enum.Font.GothamBold, TextSize = 10, BorderSizePixel = 0, ZIndex = 27, }, joyBG) Corner(b, UDim.new(1, 0)) local holding = false
b.InputBegan:Connect(function(inp) if inp.UserInputType == Enum.UserInputType.MouseButton1 or inp.UserInputType == Enum.UserInputType.Touch then
holding = true MV.Safe.SetVirt(vx, vz, SF._virtY) end end)
b.InputEnded:Connect(function(inp) if inp.UserInputType == Enum.UserInputType.MouseButton1 or inp.UserInputType == Enum.UserInputType.Touch then holding = false
if not SF._dragging then MV.Safe.SetVirt(0, 0, SF._virtY) end end end) return b
end dirBtn("↑", 35, 2, 0, -1) dirBtn("↓", 35, 68, 0, 1) dirBtn("←", 2, 35, -1, 0) dirBtn("→", 68, 35, 1, 0)
local function updateJoy(inputPos) local okPos, absPos = pcall(function() return joyBG.AbsolutePosition end)
local okSize, absSize = pcall(function() return joyBG.AbsoluteSize end) if not (okPos and okSize and absPos and absSize) then return end
local cx = absPos.X + absSize.X * 0.5 local cy = absPos.Y + absSize.Y * 0.5 local dx = inputPos.X - cx local dy = inputPos.Y - cy
local maxR = 32 local mag = math.sqrt(dx*dx + dy*dy) if mag > maxR then dx = dx / mag * maxR dy = dy / mag * maxR
mag = maxR end pcall(function() joyKnob.Position = UDim2.new(0.5, dx - 13, 0.5, dy - 13)
end) local nx = dx / maxR local nz = dy / maxR pcall(function() MV.Safe.SetVirt(nx, nz, SF._virtY) end) end
local function resetJoy() SF._dragging = false pcall(function() joyKnob.Position = UDim2.new(0.5, -13, 0.5, -13) end) MV.Safe.SetVirt(0, 0, SF._virtY) end
joyBG.InputBegan:Connect(function(inp) if inp.UserInputType == Enum.UserInputType.MouseButton1 or inp.UserInputType == Enum.UserInputType.Touch then
SF._dragging = true updateJoy(inp.Position) end end)
joyBG.InputChanged:Connect(function(inp) if SF._dragging and (inp.UserInputType == Enum.UserInputType.MouseMovement or inp.UserInputType == Enum.UserInputType.Touch) then
updateJoy(inp.Position) end end)
trackConn(UserInputService.InputChanged:Connect(function(inp) if SF._dragging and (inp.UserInputType == Enum.UserInputType.MouseMovement or inp.UserInputType == Enum.UserInputType.Touch) then
local ok, pos = pcall(function() return inp.Position end) if ok and pos then updateJoy(pos) end end end))
trackConn(UserInputService.InputEnded:Connect(function(inp) if inp.UserInputType == Enum.UserInputType.MouseButton1 or inp.UserInputType == Enum.UserInputType.Touch then
if SF._dragging then resetJoy() end end end)) local function vBtn(txt, x, y, w, h, color, cb) local b = New("TextButton", {
Size = UDim2.new(0, w, 0, h), Position = UDim2.new(0, x, 0, y), Text = txt, BackgroundColor3 = color or C.SURFACE3, BackgroundTransparency = 0.15,
TextColor3 = D.BestText(color or C.SURFACE3), Font = Enum.Font.GothamBold, TextSize = 9, BorderSizePixel = 0, ZIndex = 27,
}, hud) Corner(b, UDim.new(0, 6)) Stroke(b, C.BORDER, 1) local hold = false if cb then
b.InputBegan:Connect(function(inp) if inp.UserInputType == Enum.UserInputType.MouseButton1 or inp.UserInputType == Enum.UserInputType.Touch then
hold = true pcall(cb, true, inp) end end) b.InputEnded:Connect(function(inp)
if inp.UserInputType == Enum.UserInputType.MouseButton1 or inp.UserInputType == Enum.UserInputType.Touch then hold = false pcall(cb, false, inp) end
end) b.Activated:Connect(function() pcall(cb, nil) end) end return b end
vBtn("⬆", 108, 22, 32, 30, Color3.fromRGB(0,150,0), function(isDown, inp) if isDown == true then SF._virtYInput, SF._virtYAt = inp, os.clock() MV.Safe.SetVirt(SF._virtX, SF._virtZ, 1)
elseif isDown == false then if SF._virtYInput == inp then SF._virtYInput = nil end MV.Safe.SetVirt(SF._virtX, SF._virtZ, 0) elseif (os.clock() - (SF._virtYAt or 0)) < 0.35 then pcall(function() MV.Nudge(2.5) end) end end)
vBtn("⬇", 108, 56, 32, 30, Color3.fromRGB(150,0,0), function(isDown, inp) if isDown == true then SF._virtYInput, SF._virtYAt = inp, os.clock() MV.Safe.SetVirt(SF._virtX, SF._virtZ, -1)
elseif isDown == false then if SF._virtYInput == inp then SF._virtYInput = nil end MV.Safe.SetVirt(SF._virtX, SF._virtZ, 0) elseif (os.clock() - (SF._virtYAt or 0)) < 0.35 then pcall(function() MV.Nudge(-2.5) end) end end)
trackConn(UserInputService.InputEnded:Connect(function(inp) if (inp.UserInputType == Enum.UserInputType.MouseButton1 or inp.UserInputType == Enum.UserInputType.Touch) and SF._virtYInput ~= nil and inp == SF._virtYInput then SF._virtYInput = nil MV.Safe.SetVirt(SF._virtX, SF._virtZ, 0) end end)) vBtn("⏹ Dừng", 108, 92, 68, 22, C.RED, function() MV.Safe.Stop() end) vBtn("⭕ Tâm", 180, 92, 54, 22, C.PURPLE, function() MV.Safe.Recenter() end)
vBtn("↻", 144, 22, 30, 30, C.SURFACE3, function() SF._ang = (SF._ang or 0) + 0.6 end)
local autoTog = vBtn("➡ Tự: BẬT", 8, 120, 74, 20, C.GREEN, function() MV.Safe.SetAuto(not SF.auto)
D.Say(SF.auto and "➡ tự bay: BẬT" or "➡ tự bay: TẮT", C.ACCENT) pcall(function() if S.SyncSafePanel then S.SyncSafePanel() end end)
pcall(function() MV.Safe.SyncHud() end) end) local circTog = vBtn("⭕ Vòng: BẬT", 86, 120, 74, 20, C.GREEN, function()
MV.Safe.SetCircle(not SF.circle) D.Say(SF.circle and "⭕ vòng tròn: BẬT" or "⭕ vòng tròn: TẮT", C.ACCENT)
pcall(function() if S.SyncSafePanel then S.SyncSafePanel() end end) pcall(function() MV.Safe.SyncHud() end) end)
local speedLbl = New("TextLabel", { Size = UDim2.new(0, 80, 0, 20), Position = UDim2.new(0, 164, 0, 120),
Text = "💨 60", BackgroundTransparency = 1, TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium, TextSize = 8, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 27,
}, hud) do local dragging, startPos, startInput
title.InputBegan:Connect(function(inp) if inp.UserInputType == Enum.UserInputType.MouseButton1 or inp.UserInputType == Enum.UserInputType.Touch then
dragging = true startInput = inp.Position startPos = hud.Position end end) trackConn(UserInputService.InputChanged:Connect(function(inp)
if dragging and (inp.UserInputType == Enum.UserInputType.MouseMovement or inp.UserInputType == Enum.UserInputType.Touch) then local delta = inp.Position - startInput
hud.Position = UDim2.new(startPos.X.Scale, startPos.X.Offset + delta.X, startPos.Y.Scale, startPos.Y.Offset + delta.Y) end
end)) trackConn(UserInputService.InputEnded:Connect(function(inp)
if inp.UserInputType == Enum.UserInputType.MouseButton1 or inp.UserInputType == Enum.UserInputType.Touch then dragging = false end end)) end
function SF._hudUpdate() pcall(function() if autoTog then autoTog.Text = SF.auto and "➡ Tự: BẬT" or "➡ Tự: TẮT"
autoTog.BackgroundColor3 = SF.auto and C.GREEN or C.SURFACE3 autoTog.TextColor3 = D.BestText(autoTog.BackgroundColor3) end if circTog then
circTog.Text = SF.circle and "⭕ Vòng: BẬT" or "⭕ Vòng: TẮT" circTog.BackgroundColor3 = SF.circle and C.GREEN or C.SURFACE3
circTog.TextColor3 = D.BestText(circTog.BackgroundColor3) end if speedLbl then local thr = SF.threats or 0
speedLbl.Text = string.format("💨 %g · %s%d", SF.speed or 60, thr>0 and "⚠️" or "✅", thr) speedLbl.TextColor3 = thr>0 and C.YELLOW or C.MUTED
end end) end SF._hud = hud return hud end function MV.Safe.SyncHud() pcall(function()
local hud = MV.Safe._BuildHud() if hud then local should = (SF.on == true) and (SF.showHud ~= false) hud.Visible = should
if should and SF._hudUpdate then SF._hudUpdate() end end if SF.on then local old = MV._hud if old then old.Visible = false end
else pcall(function() MV.SyncHud() end) end end) end end
function MV.SetCarpetSize(w, h, l) MV.carpetW = mvClamp(w, 0.5, 100, MV.carpetW or 6)
MV.carpetH = mvClamp(h, 0.1, 20, MV.carpetH or 0.5) MV.carpetL = mvClamp(l, 0.5, 100, MV.carpetL or 6) if MV._carpet and MV._carpet.Parent then pcall(function()
MV._carpet.Size = Vector3.new(MV.carpetW, MV.carpetH, MV.carpetL) MV._MakeEdge(MV._carpet) end) end return MV.carpetW, MV.carpetH, MV.carpetL
end function MV.SetCarpetGap(g) MV.carpetGap = mvClamp(g, -10, 50, MV.carpetGap or 0.2) return MV.carpetGap
end function MV.FootY() local r = MV.Root() if not r then return nil end return r.Position.Y - 3.0
end function MV._StopCarpet() if MV._carpet then pcall(function() MV._carpet:Destroy() end) end MV._carpet = nil
MV.carpetY = nil pcall(function() RunService:UnbindFromRenderStep("Carpet") end) end function MV.CarpetHost() return workspace
end function MV._MakeEdge(cp) if not cp then return end local old = nil
pcall(function() old = cp:FindFirstChild("BC_GlassEdge") end) if not MV.carpetEdge then if old then pcall(function() old:Destroy() end) end return
end if old then return end pcall(function() local edge = Instance.new("SelectionBox") edge.Name = "BC_GlassEdge"
edge.Adornee = cp edge.LineThickness = 0.035 edge.SurfaceTransparency = 1 edge.Color3 = C.ACCENT
edge.Parent = cp end) end function MV.SetCarpetEdge(on) MV.carpetEdge = (on == true)
pcall(function() MV._MakeEdge(MV._carpet) end) for _, rec in ipairs(MV.GetPlacedGlasses and MV.GetPlacedGlasses() or {}) do
pcall(function() MV._MakeEdge(rec.part) end) end return MV.carpetEdge end function MV.SetCarpetHold(on)
MV.carpetHold = (on == true) return MV.carpetHold end function MV.SetCarpetSlack(n)
MV.carpetSlack = mvClamp(n, 0, 50, MV.carpetSlack or 0.5) return MV.carpetSlack end function MV.CreateCarpet(y)
local r = MV.Root() if not r then return nil end local cp = MV._carpet
if not cp or not cp.Parent then pcall(function() if cp then cp:Destroy() end end) cp = New("Part", { Name = "BC_GlassCarpet_Follow",
Size = Vector3.new(MV.carpetW or 6, MV.carpetH or 0.5, MV.carpetL or 6), Anchored = true, CanCollide = true, CanTouch = false,
Material = Enum.Material.Glass, Color = Color3.fromRGB(116, 221, 255), Transparency = 0.42, Reflectance = 0.04, CastShadow = false, }, MV.CarpetHost())
MV._carpet = cp end local hh = mvClamp(MV.carpetH, 0.1, 20, 0.5) local cy = tonumber(y)
if cy == nil then cy = MV.carpetY if cy == nil then cy = (MV.FootY() or r.Position.Y - 3.0) - (MV.carpetGap or 0.2) - hh / 2 end
end MV.carpetY = cy pcall(function() cp.Size = Vector3.new( mvClamp(MV.carpetW, 0.5, 100, 6), hh, mvClamp(MV.carpetL, 0.5, 100, 6) )
cp.CFrame = CFrame.new(r.Position.X, cy, r.Position.Z) cp.Anchored = true cp.CanCollide = true
cp.CanTouch = false cp.Material = Enum.Material.Glass cp.Transparency = 0.42 cp.Color = Color3.fromRGB(116, 221, 255)
MV._MakeEdge(cp) end) return cp end function MV.SetCarpet(on) on = (on == true) if not on then MV.carpet = false MV._StopCarpet()
MV._carpetRetries = 0 pcall(function() if MV.SyncHud then MV.SyncHud() end end) return false end if not MV.Root() then
return false, "chưa có nhân vật để tạo thảm" end MV.carpet = true MV._carpetRetries = 0 MV.carpetY = nil local cp = MV.CreateCarpet() if not cp then MV.carpet = false
return false, "không tạo được thảm kính" end pcall(function() RunService:UnbindFromRenderStep("Carpet") end)
local okBind = pcall(function() RunService:BindToRenderStep("Carpet", Enum.RenderPriority.Character.Value + 1, function()
if not MV.carpet then return end local root = MV.Root() if not root then return end if not MV._carpet or not MV._carpet.Parent then
MV._carpetRetries = (MV._carpetRetries or 0) + 1 if MV._carpetRetries <= 3 then MV.CreateCarpet(MV.carpetY) end return
end local y = MV.carpetY if y == nil then y = (MV.FootY() or root.Position.Y - 3.0) - (MV.carpetGap or 0.2) - (MV.carpetH or 0.5) / 2
MV.carpetY = y end pcall(function() MV._carpet.CFrame = CFrame.new(root.Position.X, y, root.Position.Z) end) end) end)
if not okBind then MV.SetCarpet(false) return false, "executor không bind được thảm kính" end pcall(function() if MV.SyncHud then MV.SyncHud() end end) return true end
MV._placedGlasses = MV._placedGlasses or {} MV._glassId = tonumber(MV._glassId) or 0 MV.autoGlass = MV.autoGlass == true
MV._lastGlassPos = MV._lastGlassPos or nil MV.glassMax = mvClamp(MV.glassMax, 1, 1000, 250) MV._autoGlassBound = MV._autoGlassBound == true
function MV._GlassPart(entry) if type(entry) == "table" then return entry.part or entry.Part end return entry end
function MV._GlassRecord(entry, fallbackId) if type(entry) == "table" then local p = MV._GlassPart(entry) if p then
entry.part = p entry.id = tonumber(entry.id) or fallbackId return entry end return nil end if entry then return { id = fallbackId, part = entry } end
return nil end function MV._GlassChanged() local refresh = S.GlassRefreshList if type(refresh) ~= "function" then return end
if MV._glassRefreshQueued then return end MV._glassRefreshQueued = true local function run() MV._glassRefreshQueued = false
pcall(refresh) end if task and type(task.defer) == "function" then task.defer(run) else run() end end function MV._GlassPosition(root)
root = root or MV.Root() if not root then return nil end
local h = mvClamp(MV.carpetH, 0.1, 20, 0.5) local foot = MV.FootY() or (root.Position.Y - root.Size.Y / 2) return Vector3.new( root.Position.X,
foot - mvClamp(MV.carpetGap, -10, 50, 0.2) - h / 2, root.Position.Z ) end function MV._CreateGlassAt(pos)
if not pos then return nil, "không có vị trí đặt kính" end local list = MV._placedGlasses if type(list) ~= "table" then list = {}
MV._placedGlasses = list end if #list >= mvClamp(MV.glassMax, 1, 1000, 250) then
return nil, "đã đạt giới hạn " .. tostring(MV.glassMax) .. " tấm kính" end MV._glassId = (tonumber(MV._glassId) or 0) + 1 local id = MV._glassId
local w = mvClamp(MV.carpetW, 0.5, 100, 6) local h = mvClamp(MV.carpetH, 0.1, 20, 0.5)
local l = mvClamp(MV.carpetL, 0.5, 100, 6) local part = New("Part", { Name = string.format("BC_GlassCarpet_%03d", id),
Size = Vector3.new(w, h, l), CFrame = CFrame.new(pos), Anchored = true, CanCollide = true, CanTouch = false,
Material = Enum.Material.Glass, Color = Color3.fromRGB(116, 221, 255), Transparency = 0.42, Reflectance = 0.04, CastShadow = false,
}, MV.CarpetHost()) pcall(function() part:SetAttribute("BananaCatGlass", true) part:SetAttribute("BananaCatGlassId", id)
part:SetAttribute("BananaCatGlassFixed", true) end) local rec = { id = id, part = part, position = pos, size = Vector3.new(w, h, l), createdAt = os.clock() }
table.insert(list, rec) MV._MakeEdge(part) return rec end function MV._RecoverPlacedGlasses() if type(MV._placedGlasses) ~= "table" then MV._placedGlasses = {} end
local recovered = {} local ok, children = pcall(function() return workspace:GetChildren() end) if not ok or type(children) ~= "table" then return 0 end
for _, child in ipairs(children) do local idText = nil
pcall(function() if child:IsA("BasePart") then idText = tostring(child.Name):match("^BC_GlassCarpet_(%d+)$") end end) local id = tonumber(idText)
if id then recovered[#recovered + 1] = { id = id, part = child, position = child.Position, size = child.Size } if id > (tonumber(MV._glassId) or 0) then MV._glassId = id end
pcall(function() MV._MakeEdge(child) end) end end table.sort(recovered, function(a, b) return (a.id or 0) < (b.id or 0) end)
for _, rec in ipairs(recovered) do table.insert(MV._placedGlasses, rec) end return #recovered
end if type(MV._placedGlasses) ~= "table" then MV._placedGlasses = {} end if #MV._placedGlasses == 0 then pcall(MV._RecoverPlacedGlasses) end
function MV.PlaceGlass(silent) local root = MV.Root() if not root then return false, "chưa có nhân vật để đặt kính" end local pos = MV._GlassPosition(root)
local rec, err = MV._CreateGlassAt(pos) if not rec then return false, err end
MV._lastGlassPos = root.Position if not silent then MV._GlassChanged() end return true, rec.part, rec end function MV.ClearPlacedGlasses()
pcall(function() if MV.StopGlassFly then MV.StopGlassFly() end end) if MV.autoGlass then pcall(function() MV.SetAutoGlass(false) end) end
local n = 0 if type(MV._placedGlasses) == "table" then for _, entry in ipairs(MV._placedGlasses) do local part = MV._GlassPart(entry)
if part and part.Parent then pcall(function() part:Destroy() end) n = n + 1 end end end MV._placedGlasses = {} MV._lastGlassPos = nil MV._GlassChanged()
return n end function MV.RemoveGlassAt(idx) local n = math.floor(tonumber(idx) or 0)
if n < 1 or type(MV._placedGlasses) ~= "table" then return false, "không tìm thấy tấm kính" end local entry = MV._placedGlasses[n] if not entry then return false, "không tìm thấy tấm kính" end
local part = MV._GlassPart(entry) if MV._glassFlyTarget == entry or MV._glassFlyIdx == n then pcall(function() MV.StopGlassFly() end) end
table.remove(MV._placedGlasses, n) if part and part.Parent then pcall(function() part:Destroy() end) end MV._GlassChanged() return true, part, entry end
function MV.RemoveGlass(part) if not part or type(MV._placedGlasses) ~= "table" then return false, "không tìm thấy tấm kính" end
for i, entry in ipairs(MV._placedGlasses) do if MV._GlassPart(entry) == part then return MV.RemoveGlassAt(i) end
end return false, "không tìm thấy tấm kính" end function MV.GetPlacedGlasses()
local out = {} if type(MV._placedGlasses) ~= "table" then MV._placedGlasses = {} end for i = #MV._placedGlasses, 1, -1 do
local old = MV._placedGlasses[i] local rec = MV._GlassRecord(old, i) local part = rec and rec.part if not part or not part.Parent then
table.remove(MV._placedGlasses, i) else rec.position = part.Position rec.size = part.Size out[i] = rec end end local compact = {} for i = 1, #MV._placedGlasses do
local rec = MV._GlassRecord(MV._placedGlasses[i], i) if rec and rec.part and rec.part.Parent then compact[#compact + 1] = rec end
end if #compact ~= #MV._placedGlasses then MV._placedGlasses = compact end return compact end
function MV.SetAutoGlass(on) local want = (on == true) MV.autoGlass = want if not want then MV._autoGlassBound = false
pcall(function() RunService:UnbindFromRenderStep("BC_AutoGlass") end) MV._GlassChanged() return false end
if not MV._autoGlassBound then local ok = pcall(function() RunService:BindToRenderStep("BC_AutoGlass", Enum.RenderPriority.Camera.Value - 5, function()
pcall(function() local root = MV.Root() if root then MV._AutoGlassTick(root.Position) end end) end) end) MV._autoGlassBound = ok end
local root = MV.Root() if root then pcall(function() MV._AutoGlassTick(root.Position) end) end MV._GlassChanged() return MV.autoGlass end
function MV._AutoGlassTick(curPos) if not MV.autoGlass or not curPos then return false end local last = MV._lastGlassPos local w = mvClamp(MV.carpetW, 0.5, 100, 6)
local l = mvClamp(MV.carpetL, 0.5, 100, 6) local step = mvClamp(math.min(w, l) * 0.65, 1, 100, 3)
if last then local dx, dz = curPos.X - last.X, curPos.Z - last.Z if dx * dx + dz * dz < step * step then return false end
end local ok = MV.PlaceGlass(true) if ok then MV._lastGlassPos = curPos MV._GlassChanged() return true end return false end
MV.glassFlySpeed = mvClamp(MV.glassFlySpeed, 1, 2000, 60) MV._glassFlyTarget = MV._glassFlyTarget or nil
MV._glassFlyActive = MV._glassFlyActive == true MV._glassFlyIdx = MV._glassFlyIdx or nil MV._glassFlyBV = MV._glassFlyBV or nil MV._glassFlyBG = MV._glassFlyBG or nil
MV._glassFlyNcPrev = MV._glassFlyNcPrev or nil MV._glassFlyHum = MV._glassFlyHum or nil
MV._glassFlyPlatformStandPrev = MV._glassFlyPlatformStandPrev MV._glassFlyAutoRotatePrev = MV._glassFlyAutoRotatePrev function MV.SetGlassFlySpeed(n) local v = tonumber(n)
if v == nil or v ~= v then return false, "nhập tốc độ bay 1-2000" end MV.glassFlySpeed = mvClamp(v, 1, 2000, MV.glassFlySpeed or 60)
return true, MV.glassFlySpeed end function MV._EnsureGlassFlyBV() local r = MV.Root()
if not r then return nil, nil end if MV._glassFlyBV and MV._glassFlyBV.Parent == r and MV._glassFlyBG and MV._glassFlyBG.Parent == r then local h = MV.Hum()
if h and MV._glassFlyHum ~= h then MV._glassFlyHum = h
pcall(function() MV._glassFlyPlatformStandPrev = h.PlatformStand end) pcall(function() MV._glassFlyAutoRotatePrev = h.AutoRotate end)
pcall(function() h.PlatformStand = true; h.AutoRotate = false end) end return MV._glassFlyBV, MV._glassFlyBG end
pcall(function() if MV._glassFlyBV then MV._glassFlyBV:Destroy() end end) pcall(function() if MV._glassFlyBG then MV._glassFlyBG:Destroy() end end) MV._glassFlyBV, MV._glassFlyBG = nil, nil
local bv = New("BodyVelocity", { Name = "BC_GlassFlyVel", MaxForce = Vector3.new(1e9, 1e9, 1e9), Velocity = Vector3.new(0, 0, 0)
}, r) local bg = New("BodyGyro", { Name = "BC_GlassFlyGyro", MaxTorque = Vector3.new(1e9, 1e9, 1e9), P = 1e4, D = 50 }, r)
MV._glassFlyBV, MV._glassFlyBG = bv, bg local h = MV.Hum() if h then MV._glassFlyHum = h pcall(function() MV._glassFlyPlatformStandPrev = h.PlatformStand end)
pcall(function() MV._glassFlyAutoRotatePrev = h.AutoRotate end) pcall(function() h.PlatformStand = true; h.AutoRotate = false end)
end return bv, bg end function MV.StopGlassFly() MV._glassFlyActive = false MV._glassFlyTarget = nil
MV._glassFlyIdx = nil pcall(function() RunService:UnbindFromRenderStep("BC_GlassFly") end) pcall(function() if MV._glassFlyBV then MV._glassFlyBV:Destroy() end end)
pcall(function() if MV._glassFlyBG then MV._glassFlyBG:Destroy() end end) MV._glassFlyBV, MV._glassFlyBG = nil, nil
local h = MV._glassFlyHum local safeOn = MV.Safe and MV.Safe.on == true
if h and h.Parent and not MV.fly and not MV._playerFlyActive and not safeOn then if MV._glassFlyPlatformStandPrev ~= nil then pcall(function() h.PlatformStand = MV._glassFlyPlatformStandPrev end) end
if MV._glassFlyAutoRotatePrev ~= nil then pcall(function() h.AutoRotate = MV._glassFlyAutoRotatePrev end) end end
MV._glassFlyHum = nil MV._glassFlyPlatformStandPrev = nil MV._glassFlyAutoRotatePrev = nil
if MV._glassFlyNcPrev ~= nil then local was = MV._glassFlyNcPrev MV._glassFlyNcPrev = nil local safeOwnsNoclip = safeOn and MV.Safe.noclip == true
if not MV._playerFlyActive and not safeOwnsNoclip then pcall(function() MV.SetNoclip(was) end) end end
return true end function MV._GlassFlyStep(dt) if not MV._glassFlyActive then return end local rec = MV._glassFlyTarget
local part = MV._GlassPart(rec) if not part or not part.Parent then MV.StopGlassFly() MV._GlassChanged() return end local root = MV.Root()
if not root then return end
local topY = part.Position.Y + part.Size.Y / 2 local want = Vector3.new(part.Position.X, topY + 3.2, part.Position.Z)
local pos = root.Position local dx, dy, dz = want.X - pos.X, want.Y - pos.Y, want.Z - pos.Z
local dist = math.sqrt(dx * dx + dy * dy + dz * dz) if dist <= 0.75 then pcall(function() root.CFrame = CFrame.new(want) end) MV.StopGlassFly()
return end local speed = mvClamp(MV.glassFlySpeed, 1, 2000, 60) if dist < 2 then speed = math.max(4, speed * 0.15) elseif dist < 5 then speed = math.max(8, speed * 0.45) end
pcall(function() MV.SetNoclip(true) end) local bv, bg = MV._EnsureGlassFlyBV() local dir = Vector3.new(dx / dist, dy / dist, dz / dist) if bv then bv.Velocity = dir * speed end
local horizontal = Vector3.new(want.X - pos.X, 0, want.Z - pos.Z) if bg and horizontal.Magnitude > 0.05 then
pcall(function() bg.CFrame = CFrame.new(pos, Vector3.new(want.X, pos.Y, want.Z)) end) end if not bv then
local step = math.min(dist, speed * (tonumber(dt) or 0.05)) pcall(function() root.CFrame = CFrame.new(pos + dir * step) end) end end
function MV.NearestGlassIndex() local root = MV.Root() if not root then return nil end local best, bestD = nil, math.huge
for i, rec in ipairs(MV.GetPlacedGlasses()) do local part = MV._GlassPart(rec) if part and part.Parent then
local d = (part.Position - root.Position).Magnitude if d < bestD then best, bestD = i, d end end end
return best end function MV.FlyToGlass(idx) local list = MV.GetPlacedGlasses() local n = math.floor(tonumber(idx) or 0)
local rec = (n >= 1 and list[n]) or nil if not rec and n > 0 then for i, item in ipairs(list) do if tonumber(item.id) == n then rec, n = item, i break end end end
if not rec then return false, "không tìm thấy tấm kính" end if not MV.Root() then return false, "chưa có nhân vật để bay" end
if MV.fly then pcall(function() MV.SetFly(false) end) end if MV._playerFlyActive then pcall(function() MV.StopPlayerFly() end) end
if MV._objFlyActive then pcall(function() MV.StopObjectFly() end) end
local safeOwnsNoclip = MV.Safe and MV.Safe.on == true and MV.Safe.noclip == true if MV._glassFlyNcPrev == nil then
if safeOwnsNoclip and MV.Safe._ncPrev ~= nil then MV._glassFlyNcPrev = MV.Safe._ncPrev else MV._glassFlyNcPrev = MV.noclip == true
end end MV._glassFlyTarget = rec MV._glassFlyIdx = n MV._glassFlyActive = true pcall(function() MV._EnsureSpeed() end) pcall(function() MV.SetNoclip(true) end)
pcall(function() MV._EnsureGlassFlyBV() end) pcall(function() RunService:UnbindFromRenderStep("BC_GlassFly") end)
local okBind = pcall(function() RunService:BindToRenderStep("BC_GlassFly", Enum.RenderPriority.Camera.Value - 1, function(dt) pcall(MV._GlassFlyStep, dt)
end) end) if not okBind then MV.StopGlassFly() return false, "executor không bind được bay tới kính" end pcall(MV._Watchdog) return true, rec end
MV.playerFlySpeed = MV.playerFlySpeed or 0 MV._playerFlyTarget = MV._playerFlyTarget or nil
MV._playerFlyActive = MV._playerFlyActive or false MV._playerFlyPos = MV._playerFlyPos or nil
MV._playerFlyBV = MV._playerFlyBV or nil MV._playerFlyBG = MV._playerFlyBG or nil MV._playerFlyNcPrev = MV._playerFlyNcPrev or nil
function MV.SetPlayerFlySpeed(n) local v = tonumber(n) if v == nil then return false, "nhập số 0-500 (0=auto)" end if v == 0 then
MV.playerFlySpeed = 0 return true, 0 end MV.playerFlySpeed = mvClamp(v, 1, 500, MV.playerFlySpeed or 0)
return true, MV.playerFlySpeed end function MV.GetPlayerFlySpeed() local s = tonumber(MV.playerFlySpeed) or 0
if s == 0 then local base = tonumber(MV._baseWS) or 16 local flySp = tonumber(MV.flySpeed) or 60 if MV._playerFlyActive or MV.fly then
return flySp else return base > 0 and base or 16 end end return s end function MV._EnsurePlayerFlyBV() local r = MV.Root()
if not r then return nil, nil end if MV._playerFlyBV and MV._playerFlyBV.Parent == r then return MV._playerFlyBV, MV._playerFlyBG end
pcall(function() if MV._playerFlyBV then MV._playerFlyBV:Destroy() end end) pcall(function() if MV._playerFlyBG then MV._playerFlyBG:Destroy() end end) local bv = New("BodyVelocity", { Name = "BC_PlayerFlyVel", MaxForce = Vector3.new(1e9, 1e9, 1e9), Velocity = Vector3.new(0,0,0) }, r)
local bg = New("BodyGyro", { Name = "BC_PlayerFlyGyro", MaxTorque = Vector3.new(1e9, 1e9, 1e9), P = 1e4, D = 50 }, r) MV._playerFlyBV, MV._playerFlyBG = bv, bg
local h = MV.Hum() if h then pcall(function() h.PlatformStand = true end) pcall(function() h.AutoRotate = false end)
end return bv, bg end function MV.StopPlayerFly() MV._playerFlyActive = false MV._playerFlyTarget = nil MV._playerFlyPos = nil
pcall(function() RunService:UnbindFromRenderStep("BC_PlayerFly") end) pcall(function() if MV._playerFlyBV then MV._playerFlyBV:Destroy() end end)
pcall(function() if MV._playerFlyBG then MV._playerFlyBG:Destroy() end end) MV._playerFlyBV, MV._playerFlyBG = nil, nil if not MV.fly then
local h = MV.Hum() if h then pcall(function() h.PlatformStand = false end) pcall(function() h.AutoRotate = true end)
end end if MV._playerFlyNcPrev ~= nil then local was = MV._playerFlyNcPrev MV._playerFlyNcPrev = nil
local stillFlying = (MV.Safe and MV.Safe.on == true) if not stillFlying then if was == false then pcall(function() MV.SetNoclip(false) end)
end end end return true end function MV._PlayerFlyStep(dt) if not MV._playerFlyActive then return end
local targetPlayer = MV._playerFlyTarget if not targetPlayer or not targetPlayer.Parent then MV.StopPlayerFly() return
end local c, r = nil, nil pcall(function() local char = targetPlayer.Character
if char then r = char:FindFirstChild("HumanoidRootPart") c = char end end) if not r then return end local myRoot = MV.Root() if not myRoot then MV.StopPlayerFly() return end
local want = r.Position + Vector3.new(0, 3.5, 0) MV._playerFlyPos = want local pos = myRoot.Position
local dx = want.X - pos.X local dy = want.Y - pos.Y local dz = want.Z - pos.Z local dist = math.sqrt(dx*dx + dy*dy + dz*dz)
local speed = tonumber(MV.GetPlayerFlySpeed()) or 16 local close = dist < 2 if close then speed = math.max(2, speed * 0.15)
elseif dist < 3.5 then speed = math.max(6, speed * 0.45) end MV.SetNoclip(true)
local bv, bg = MV._EnsurePlayerFlyBV() local dir = Vector3.zero if dist > 0.1 then dir = Vector3.new(dx / dist, dy / dist, dz / dist)
end if bv then if close then local targetVel = (r and r.Velocity) or Vector3.new(0, 0, 0) bv.Velocity = targetVel + dir * speed else bv.Velocity = dir * speed end
end if bg then bg.CFrame = CFrame.new(pos, Vector3.new(want.X, pos.Y, want.Z)) end if not bv and dist > 0.1 then local step = math.min(dist, speed * (tonumber(dt) or 0.05))
myRoot.CFrame = CFrame.new(pos.X + dir.X * step, pos.Y + dir.Y * step, pos.Z + dir.Z * step) end end
function MV.FlyToPlayer(p) if not p or not p.Parent then return false, "người chơi không tồn tại" end
if p == player then return false, "không thể bay tới chính mình" end if not MV.Root() then return false, "chưa có nhân vật" end
if MV.fly then MV.SetFly(false) end if MV._glassFlyActive then pcall(function() MV.StopGlassFly() end) end if MV._objFlyActive then pcall(function() MV.StopObjectFly() end) end
if MV._playerFlyNcPrev == nil and (not MV.Safe or MV.Safe._ncPrev == nil) then MV._playerFlyNcPrev = MV.noclip == true end
MV._playerFlyTarget = p MV._playerFlyActive = true MV._playerFlyPos = nil pcall(function() MV._EnsureSpeed() end)
pcall(function() MV.SetNoclip(true) end) pcall(function() MV._EnsurePlayerFlyBV() end)
pcall(function() RunService:UnbindFromRenderStep("BC_PlayerFly") end) local okBind = pcall(function()
RunService:BindToRenderStep("BC_PlayerFly", Enum.RenderPriority.Camera.Value - 1, function(dt) pcall(MV._PlayerFlyStep, dt) end) end)
if not okBind then MV.StopPlayerFly() return false, "executor không bind được bay tới người chơi" end
MV._Watchdog() return true, p end MV.objectFlySpeed = mvClamp(MV.objectFlySpeed, 1, 2000, 60) MV._objFlyTarget = MV._objFlyTarget or nil
MV._objFlyActive = MV._objFlyActive == true MV._objFlyBV = MV._objFlyBV or nil MV._objFlyBG = MV._objFlyBG or nil MV._objFlyNcPrev = MV._objFlyNcPrev or nil
MV._objFlyHum = MV._objFlyHum or nil MV._objFlyPS = MV._objFlyPS MV._objFlyAR = MV._objFlyAR function MV.SetObjectFlySpeed(n) local v = tonumber(n)
if v == nil or v ~= v then return false, "nhập tốc độ bay 1-2000" end MV.objectFlySpeed = mvClamp(v, 1, 2000, MV.objectFlySpeed or 60)
return true, MV.objectFlySpeed end function MV._ObjFlyPart() local t = MV._objFlyTarget if t == nil then return nil end local ok, part = pcall(function()
if S.ObjTrack and S.ObjTrack.PartOf then return S.ObjTrack.PartOf(t) end if t:IsA("BasePart") then return t end if t.PrimaryPart then return t.PrimaryPart end
return t:FindFirstChildWhichIsA("BasePart") end) if ok and part and part.Parent then return part end return nil end function MV._EnsureObjFlyBV() local r = MV.Root()
if not r then return nil, nil end if MV._objFlyBV and MV._objFlyBV.Parent == r and MV._objFlyBG and MV._objFlyBG.Parent == r then
local h = MV.Hum() if h and MV._objFlyHum ~= h then MV._objFlyHum = h pcall(function() MV._objFlyPS = h.PlatformStand end) pcall(function() MV._objFlyAR = h.AutoRotate end)
pcall(function() h.PlatformStand = true; h.AutoRotate = false end) end return MV._objFlyBV, MV._objFlyBG end
pcall(function() if MV._objFlyBV then MV._objFlyBV:Destroy() end end) pcall(function() if MV._objFlyBG then MV._objFlyBG:Destroy() end end) MV._objFlyBV, MV._objFlyBG = nil, nil
local bv = New("BodyVelocity", { Name = "BC_ObjFlyVel", MaxForce = Vector3.new(1e9, 1e9, 1e9), Velocity = Vector3.new(0, 0, 0)
}, r) local bg = New("BodyGyro", { Name = "BC_ObjFlyGyro", MaxTorque = Vector3.new(1e9, 1e9, 1e9), P = 1e4, D = 50 }, r)
MV._objFlyBV, MV._objFlyBG = bv, bg local h = MV.Hum() if h then MV._objFlyHum = h pcall(function() MV._objFlyPS = h.PlatformStand end)
pcall(function() MV._objFlyAR = h.AutoRotate end) pcall(function() h.PlatformStand = true; h.AutoRotate = false end) end return bv, bg end
function MV.StopObjectFly() MV._objFlyActive = false MV._objFlyTarget = nil pcall(function() RunService:UnbindFromRenderStep("BC_ObjFly") end)
pcall(function() if MV._objFlyBV then MV._objFlyBV:Destroy() end end) pcall(function() if MV._objFlyBG then MV._objFlyBG:Destroy() end end)
MV._objFlyBV, MV._objFlyBG = nil, nil local h = MV._objFlyHum
local safeOn = MV.Safe and MV.Safe.on == true if h and h.Parent and not MV.fly and not MV._playerFlyActive and not MV._glassFlyActive and not safeOn then
if MV._objFlyPS ~= nil then pcall(function() h.PlatformStand = MV._objFlyPS end) end if MV._objFlyAR ~= nil then pcall(function() h.AutoRotate = MV._objFlyAR end) end end
MV._objFlyHum, MV._objFlyPS, MV._objFlyAR = nil, nil, nil if MV._objFlyNcPrev ~= nil then local was = MV._objFlyNcPrev MV._objFlyNcPrev = nil
if not MV._playerFlyActive and not MV._glassFlyActive and not safeOn then pcall(function() MV.SetNoclip(was) end) end end
pcall(function() if S.ObjTrack and S.ObjTrack.OnFlyChange then S.ObjTrack.OnFlyChange() end end) return true end
function MV._ObjectFlyStep(dt) if not MV._objFlyActive then return end local part = MV._ObjFlyPart() if not part then
pcall(MV.StopObjectFly) pcall(function() if D.Say then D.Say("🌳 vật đang bay tới đã biến mất — đã dừng bay", C.YELLOW) end end) return end local myRoot = MV.Root()
if not myRoot then return end
local want = part.Position + Vector3.new(0, 3.2, 0) local pos = myRoot.Position
local dx, dy, dz = want.X - pos.X, want.Y - pos.Y, want.Z - pos.Z local dist = math.sqrt(dx * dx + dy * dy + dz * dz)
local speed = mvClamp(MV.objectFlySpeed, 1, 2000, 60) local close = (dist <= 2.5)
if close then speed = math.max(2, speed * 0.15) elseif dist < 5 then speed = math.max(6, speed * 0.45) end
pcall(function() MV.SetNoclip(true) end) local bv, bg = MV._EnsureObjFlyBV() local dir = Vector3.new(0, 0, 0)
if dist > 0.1 then dir = Vector3.new(dx / dist, dy / dist, dz / dist) end if bv then
local pv = nil pcall(function() pv = part.AssemblyLinearVelocity end) if close and pv then bv.Velocity = pv + dir * speed
else bv.Velocity = dir * speed end end if bg and (dist > 0.05) then pcall(function() bg.CFrame = CFrame.new(pos, Vector3.new(want.X, pos.Y, want.Z)) end) end
if not bv and dist > 0.1 then local step = math.min(dist, speed * (tonumber(dt) or 0.05)) pcall(function() myRoot.CFrame = CFrame.new(pos + dir * step) end) end end
function MV.FlyToObject(target, speed) if target == nil then return false, "chưa có vật để bay tới" end
if not MV.Root() then return false, "chưa có nhân vật để bay" end local part = nil
pcall(function() if S.ObjTrack and S.ObjTrack.PartOf then part = S.ObjTrack.PartOf(target) end
end) if not part then return false, "vật không còn trong game" end if speed ~= nil then pcall(function() MV.SetObjectFlySpeed(speed) end) end
if MV.fly then pcall(function() MV.SetFly(false) end) end if MV._playerFlyActive then pcall(function() MV.StopPlayerFly() end) end
if MV._glassFlyActive then pcall(function() MV.StopGlassFly() end) end if MV._objFlyNcPrev == nil then MV._objFlyNcPrev = (MV.noclip == true) end
MV._objFlyTarget = target MV._objFlyActive = true pcall(function() MV._EnsureSpeed() end) pcall(function() MV.SetNoclip(true) end)
pcall(function() MV._EnsureObjFlyBV() end) pcall(function() RunService:UnbindFromRenderStep("BC_ObjFly") end)
local okBind = pcall(function() RunService:BindToRenderStep("BC_ObjFly", Enum.RenderPriority.Camera.Value - 1, function(dt)
pcall(MV._ObjectFlyStep, dt) end) end) if not okBind then MV.StopObjectFly() return false, "executor không bind được bay tới vật" end
pcall(function() if S.ObjTrack and S.ObjTrack.OnFlyChange then S.ObjTrack.OnFlyChange() end end) return true, target end
function MV.Nudge(dy) if MV.carpet then MV.carpetY = (MV.carpetY or MV.FootY() or 0) + dy return true, "thảm"
elseif MV.fly then local r = MV.Root() if r then r.CFrame = CFrame.new(r.Position.X, r.Position.Y + dy, r.Position.Z) end return true, "bay"
end return false, nil end function MV._HudNudge(dy) local ok, what = MV.Nudge(dy)
MV._HudSay(ok and ((dy > 0 and "⬆ nâng " or "⬇ hạ ") .. tostring(what) .. " 2.5") or "⬆⬇ bật Bay trước đã") end function MV._BuildHud()
if MV._hud then return MV._hud end local hud = New("Frame", { Name = "BC_MoveHud", Size = UDim2.new(0, 148, 0, 136), Position = UDim2.new(1, -158, 0.5, -68),
BackgroundTransparency = 1, Visible = false, ZIndex = 20, }, gui) local function obtn(txt, y, size, color, cb)
local b = New("TextButton", { Size = UDim2.new(0, size, 0, size), Position = UDim2.new(0.5, -size / 2, 0, y),
Text = txt, BackgroundColor3 = color or C.BLUE, BackgroundTransparency = 0.3, TextColor3 = C.WHITE, Font = Enum.Font.GothamBold, TextSize = 15,
BorderSizePixel = 0, ZIndex = 21, }, hud) Corner(b, UDim.new(1, 0)) Stroke(b, C.WHITE, 1.5) b.Activated:Connect(function() pcall(cb) end) return b end
MV._hudCarpet = nil
MV._hudUp   = obtn("⬆", 48, 38, Color3.fromRGB(0, 150, 0),   function() MV._HudNudge(2.5) end) MV._hudDown = obtn("⬇", 92, 38, Color3.fromRGB(150, 0, 0),   function() MV._HudNudge(-2.5) end)
MV._hudClose = New("TextButton", { Size = UDim2.new(0, 28, 0, 28), Position = UDim2.new(1, -36, 0, 8),
Text = "✕", BackgroundColor3 = C.RED, BackgroundTransparency = 0.3, TextColor3 = C.WHITE, Font = Enum.Font.GothamBold, TextSize = 14,
BorderSizePixel = 0, ZIndex = 21, }, hud) Corner(MV._hudClose, UDim.new(1, 0)) Stroke(MV._hudClose, C.WHITE, 1.5)
MV._hudClose.Activated:Connect(function() MV.SetRunMode(false) MV._HudSay("🛑 đã tắt chế độ chạy trên thảm") end) MV._hud = hud return hud end function MV._HudSay(msg)
pcall(function() if D.hubStatus then D.hubStatus.Text = msg end end) end function MV.SyncHud() pcall(function()
local hud = MV._BuildHud() local safeOn = (MV.Safe and MV.Safe.on == true) local on = (MV.fly or MV.runMode)
if safeOn or MV.fly then on = false end
hud.Visible = (on == true) if MV._hudCarpet then
MV._hudCarpet.BackgroundColor3 = MV.carpet and C.GREEN or C.GRAY end end) if MV.SyncFlyHud then MV.SyncFlyHud() end end function MV.SetRunMode(on) MV.runMode = false
pcall(function() if main then main.Visible = true end end) pcall(function() if togBtn then togBtn.Text = (main and main.Visible) and "✕" or "" end end)
MV._menuWasOpen = nil MV.SyncHud() return false, "tinh nang chay tren tham da bi xoa" end
function MV.StopAll() pcall(function() if S.Free and S.Free.Stop then S.Free.Stop() end end)
if MV.Safe and MV.Safe.on then pcall(function() MV.Safe.Stop() end) end pcall(function() MV.StopGlassFly() end) pcall(function() MV.StopPlayerFly() end)
pcall(function() MV.StopObjectFly() end)
MV.SetFly(false) MV.SetCarpet(false) MV.SetNoclip(false) MV.SetInfJump(false) MV.SetHighJump(false)
MV.SetSpeed(false) MV.SetSprint(false)
MV.SetRunMode(false)
MV._Watchdog() MV.SyncHud() pcall(function() if MV.Safe and MV.Safe.SyncHud then MV.Safe.SyncHud() end end) end
S.MoveActionState = { fly     = function() return S.Move.fly     end, noclip  = function() return S.Move.noclip  end, infjump = function() return S.Move.infJump end,
highjump= function() return S.Move.highJump end, speed   = function() return S.Move.speed   end,
camspeed= function() return S.Move.sprint  end, carpet  = function() return S.Move.carpet  end,
runmode = function() return S.Move.runMode end, loc_all  = function() return S.Loc and S.Loc.on   end,
loc_solo = function() return S.Loc and S.Loc.solo end, spec_on  = function() return S.Spec and S.Spec.on   end,
glow     = function() return S.Glow and S.Glow.on   end, freecam  = function() return S.Free and S.Free.on end, safefly  = function() return S.Move.Safe and S.Move.Safe.on end,
objtrack = function() return S.ObjTrack and S.ObjTrack.on end,
} function MV.Refresh() MV.InvalidateCache() MV._NcForgetLost()
if MV.speed then MV.ApplyChar() end
if MV.noclip then MV._NcStep() end if MV.fly then MV._EnsureFly() MV._BindFly() end if MV.sprint then MV._EnsureSpeed() MV._BindSpeed()
end if MV.highJump then pcall(MV._HighJumpApplyPower) pcall(MV._HighJumpBind) end
if MV.Safe and MV.Safe.on then pcall(MV.Safe.Step, 0.05) end
if MV._glassFlyActive then pcall(MV._EnsureGlassFlyBV) end
if MV.autoGlass and not MV._autoGlassBound then pcall(MV.SetAutoGlass, true) end MV.SyncHud()
pcall(function() if MV.Safe and MV.Safe.SyncHud then MV.Safe.SyncHud() end end) end function MV.Status() local t = {}
if MV.fly then t[#t + 1] = string.format("🚀 bay %d", MV.flySpeed) end if MV.noclip then t[#t + 1] = "🧱 xuyên tường" end
if MV.infJump then t[#t + 1] = "🦘 nhảy vô hạn" end if MV.highJump then t[#t + 1] = string.format("🦘 nhảy cao %d", MV.highJumpSpeed) end
if MV.sprint then t[#t + 1] = string.format("💨 tốc độ %d", MV.sprintSpeed) end if MV.speed then
if MV.speedMode == "x" then t[#t + 1] = string.format("👟 chạy ×%g (game %g)", MV.speedMul, MV._baseWS or 16) else
t[#t + 1] = string.format("👟 chạy %g", MV.walkSpeed) end end if MV._playerFlyActive then
local pn = MV._playerFlyTarget and tostring(MV._playerFlyTarget.Name) or "?" local sp = MV.GetPlayerFlySpeed and MV.GetPlayerFlySpeed() or (MV.playerFlySpeed or 0)
if (tonumber(MV.playerFlySpeed) or 0) == 0 then t[#t + 1] = string.format("🚀 bay tới người %s (auto %g)", pn, sp)
else t[#t + 1] = string.format("🚀 bay tới người %s %g", pn, sp) end end
local glassCount = 0 pcall(function() glassCount = #MV.GetPlacedGlasses() end) if glassCount > 0 then t[#t + 1] = "🧱 kính " .. tostring(glassCount) .. " tấm" end
if MV._glassFlyActive then local targetId = MV._glassFlyTarget and MV._glassFlyTarget.id or "?" t[#t + 1] = "🚀 bay tới kính #" .. tostring(targetId) end
if #t == 0 then return "🚶 di chuyển: đang TẮT hết" end return "🚶 đang BẬT: " .. table.concat(t, " · ")
end trackConn(player.CharacterAdded:Connect(function() task.spawn(function() task.wait(0.3) pcall(MV.Refresh) end) end)) function S.GetJobId() local id = game.JobId
if id == nil then return nil end id = tostring(id) if id == "" then return nil end return id
end function S.CopyToClipboard(text) local did = false pcall(function() if setclipboard then setclipboard(text) did = true
elseif toclipboard then toclipboard(text) did = true elseif set_clipboard then set_clipboard(text) did = true end end) return did end
function S.FetchServers(cursor, customPlaceId, order) local pId = tonumber(customPlaceId) or tonumber(game.PlaceId) or 0
local url = "https://games.roblox.com/v1/games/" .. tostring(pId) .. "/servers/Public?sortOrder=" .. (order == "Desc" and "Desc" or "Asc") .. "&limit=100"
if cursor and cursor ~= "" then url = url .. "&cursor=" .. tostring(cursor) end local raw = nil
local okG, resG = pcall(function() return game:HttpGet(url) end) if okG and type(resG) == "string" and #resG > 0 then raw = resG end
if not raw or #raw == 0 then local rq = (type(request) == "function" and request)
or (type(http_request) == "function" and http_request) or (type(syn) == "table" and type(syn.request) == "function" and syn.request)
or S.CompatRequest if type(rq) == "function" then local okR, resR = pcall(rq, { Url = url, Method = "GET" })
if okR and type(resR) == "table" and type(resR.Body) == "string" and #resR.Body > 0 then raw = resR.Body end end
end if type(raw) ~= "string" or #raw == 0 then return {}, nil end
local okD, data = pcall(function() return HttpService:JSONDecode(raw) end) if not okD or type(data) ~= "table" then return {}, nil end
return (type(data.data) == "table" and data.data or {}), data.nextPageCursor end S._jobPlaceCache = S._jobPlaceCache or {}
S._jobMetaCache  = S._jobMetaCache or {} function S.ParseServerCode(raw) local s = tostring(raw or ""):gsub("^%s+", ""):gsub("%s+$", "")
s = s:gsub('^"', ""):gsub('"$', ""):gsub("^'", ""):gsub("'$", "")
s = s:gsub("^Mã Server %(JobId%)%s*:%s*", ""):gsub("^Mã SV%s*:%s*", ""):gsub("^🌐 Mã server%s*:%s*", "") if s == "" then return nil, nil end
local pId, jId = s:match("^(%d+)%s*[:/|,]%s*([%w%-]+)$") if pId and jId and jId:find("-", 1, true) then
local np = tonumber(pId) if np then S._jobPlaceCache[jId] = np end return jId, np end local placeHint = s:match("PlaceId%s*[:=]%s*(%d+)") or s:match("Place%s*[:=]%s*(%d+)")
local uuid = s:match("(%x%x%x%x%x%x%x%x%-%x%x%x%x%-%x%x%x%x%-%x%x%x%x%-%x%x%x%x%x%x%x%x%x%x%x%x)") if uuid then local np = tonumber(placeHint) or S._jobPlaceCache[uuid]
if np then S._jobPlaceCache[uuid] = np end return uuid, np end local token = s:match("^([%w]+%-[%w%-]+)") if token and #token >= 8 then
local np = tonumber(placeHint) or S._jobPlaceCache[token] if np then S._jobPlaceCache[token] = np end return token, np end
if placeHint and s:match("^PlaceId%s*[:=]%s*%d+$") then return nil, tonumber(placeHint) end return nil, nil end
function S.StopAutoJoinQueue() S._autoJoinToken = nil S._activeTeleport = nil end function S.RawTeleportAttempt(pId, jId)
pcall(function() GuiService:ClearError() end) pcall(function() local h = MV and MV.Hum and MV.Hum() if h and h.Sit then h.Sit = false end end)
if jId and jId ~= "" and pId and pId > 0 then local okT, errT = pcall(function() TeleportService:TeleportToPlaceInstance(pId, jId, player) end)
if not okT then okT, errT = pcall(function() TeleportService:TeleportToPlaceInstance(pId, jId) end) end return okT, errT
elseif pId and pId > 0 then local okT, errT = pcall(function() TeleportService:Teleport(pId, player) end)
if not okT then okT, errT = pcall(function() TeleportService:Teleport(pId) end) end return okT, errT
end return false, "Thiếu PlaceId hoặc JobId hợp lệ" end function S.StartAutoJoinQueue(pId, jId, opts)
opts = type(opts) == "table" and opts or {} local tok = {} S._autoJoinToken = tok local tName = tostring(opts.targetName or "")
task.spawn(function() for attempt = 1, 25 do
if S._autoJoinToken ~= tok then return end task.wait(1.8)
if S._autoJoinToken ~= tok then return end
local msg = string.format("⏳ Server%s đang đầy/bận — tự động canh slot trống vào lại (#%d/25)...", tName ~= "" and (" của @" .. tName) or "", attempt)
pcall(function() if type(opts.onStatus) == "function" then opts.onStatus(msg, C.YELLOW) else D.Say(msg, C.YELLOW) end end) S.RawTeleportAttempt(pId, jId)
end if S._autoJoinToken == tok then S._autoJoinToken = nil local fMsg = "⏳ Đã tự canh 25 lần vẫn chưa vào được server (có thể đã đầy/người chơi đã rời) — hãy lấy lại mã mới rồi thử lại."
pcall(function() if type(opts.onStatus) == "function" then opts.onStatus(fMsg, C.RED) else D.Say(fMsg, C.RED) end end) end
end) end if not S._tpFailConn then
S._tpFailConn = trackConn(TeleportService.TeleportInitFailed:Connect(function(plr, tpResult, errMsg, targetPlaceId) if plr and plr ~= player then return end
pcall(function() GuiService:ClearError() end) local act = S._activeTeleport if type(act) ~= "table" then return end
local rName = tostring((tpResult and tpResult.Name) or tpResult or "") local eLow = (rName .. " " .. tostring(errMsg or "")):lower()
if eLow:find("full") or eLow:find("flooded") or eLow:find("teleporting") or eLow:find("busy") then
if not S._autoJoinToken then S.StartAutoJoinQueue(act.placeId, act.jobId, act.opts) end return
end
if (eLow:find("notfound") or eLow:find("not found") or eLow:find("unauthorized") or eLow:find("restricted") or eLow:find("773") or eLow:find("771")) and act.jobId and act.jobId ~= "" then
local pi = _G.BananaCatHub_PlayerInfo if type(pi) == "table" and type(pi.GetUniversePlaces) == "function" then
act.triedPlaces = act.triedPlaces or { [tonumber(act.placeId) or 0] = true } local places = pi.GetUniversePlaces(nil, act.placeId)
for _, altP in ipairs(places) do if not act.triedPlaces[altP] then
act.triedPlaces[altP] = true act.placeId = altP S._jobPlaceCache[act.jobId] = altP
local msg = string.format("🔄 Server thuộc chế độ/Sub-Place %d — đang tự chuyển qua đúng PlaceId %d...", altP, altP)
pcall(function() if act.opts and type(act.opts.onStatus) == "function" then act.opts.onStatus(msg, C.YELLOW) else D.Say(msg, C.YELLOW) end end)
task.delay(0.25, function() S.RawTeleportAttempt(altP, act.jobId) end) return
end end
end end
local failMsg = "⚠️ Không vào được server này (" .. rName .. ") — mã có thể đã cũ/sai, server VIP/riêng tư hoặc game chặn vào theo mã. Hãy lấy lại mã mới của người chơi rồi thử lại."
S._activeTeleport = nil pcall(function() if act.opts and type(act.opts.onStatus) == "function" then act.opts.onStatus(failMsg, C.RED) else D.Say(failMsg, C.RED) end end)
end)) end function S.TeleportToServer(placeId, jobId, opts) pcall(ReleaseHubFocus) S.StopAutoJoinQueue()
local jId = tostring(jobId or ""):gsub("^%s+", ""):gsub("%s+$", "") local pId = tonumber(placeId) or (jId ~= "" and S._jobPlaceCache[jId]) or tonumber(game.PlaceId) or 0
if jId ~= "" and pId > 0 then S._jobPlaceCache[jId] = pId end S._intentionalTeleport = true
S._activeTeleport = { placeId = pId, jobId = jId, opts = opts, triedPlaces = { [pId] = true } } local okT, errT = S.RawTeleportAttempt(pId, jId)
if not okT then local eLow = tostring(errT or ""):lower()
local pi = _G.BananaCatHub_PlayerInfo
if jId ~= "" and (eLow:find("restricted") or eLow:find("unauthorized") or eLow:find("not found") or eLow:find("notfound")) and type(pi) == "table" and type(pi.GetUniversePlaces) == "function" then
for _, altP in ipairs(pi.GetUniversePlaces(nil, pId)) do if altP ~= pId then
local okAlt, errAlt = S.RawTeleportAttempt(altP, jId) if okAlt then pId = altP S._jobPlaceCache[jId] = altP okT, errT = true, nil break else errT = errAlt end
end end
end if not okT then S._intentionalTeleport = false S._activeTeleport = nil return false, tostring(errT) end
end local meta = (type(opts) == "table" and opts.meta) or (jId ~= "" and S._jobMetaCache[jId]) or nil
if type(meta) == "table" and tonumber(meta.maxPlayers) and meta.maxPlayers > 0 and (tonumber(meta.playing) or 0) >= meta.maxPlayers then S.StartAutoJoinQueue(pId, jId, opts)
end return true, nil end
function S.ResetServer() local me = S.GetJobId() if me then S.TeleportToServer(game.PlaceId, me)
return "🔄 Đang vào lại ĐÚNG server này: " .. me .. " (giữ nguyên người chơi cùng server)..." end
S.TeleportToServer(game.PlaceId, nil) return "🔄 Không đọc được mã server (Studio/server đơn) → đang nạp lại game..." end
function S.LocateJobPlace(jobId) local jId = tostring(jobId or "") if jId == "" then return nil end local cached = S._jobPlaceCache[jId] if cached then return cached end
local pi = _G.BananaCatHub_PlayerInfo if type(pi) ~= "table" or type(pi.GetUniversePlaces) ~= "function" then return nil end local okP, places = pcall(pi.GetUniversePlaces, nil, tonumber(game.PlaceId))
if not okP or type(places) ~= "table" then return nil end pcall(function() D.Say("🔍 Đang tìm đúng Place của mã server...", C.YELLOW) end)
for pi2, p in ipairs(places) do if pi2 > 6 then break end for _, ord in ipairs({ "Asc", "Desc" }) do local cur = "" for _ = 1, 3 do local okF, list, nxt = pcall(function() return S.FetchServers(cur, p, ord) end)
if not okF or type(list) ~= "table" then break end for _, sv in ipairs(list) do if type(sv) == "table" and sv.id and tostring(sv.id) == jId then S._jobPlaceCache[jId] = tonumber(p) return tonumber(p) end end
if type(nxt) ~= "string" or nxt == "" then break end cur = nxt end end end return nil end
function S.JoinServer(jobIdOrQuery, customPlaceId) local s = tostring(jobIdOrQuery or ""):gsub("^%s+", ""):gsub("%s+$", "")
local jId, pId = S.ParseServerCode(s) pId = tonumber(customPlaceId) or pId if jId and jId ~= "" and not pId and not S._jobPlaceCache[jId] then pId = S.LocateJobPlace(jId) end if jId and jId ~= "" then local targetPlace = pId or S._jobPlaceCache[jId] or tonumber(game.PlaceId)
local pi = _G.BananaCatHub_PlayerInfo
if not pId and type(pi) == "table" and type(pi.last) == "table" and tostring(pi.last.serverJobId or "") == jId and tonumber(pi.last.placeId) then
targetPlace = tonumber(pi.last.placeId) end local okT, errT = S.TeleportToServer(targetPlace, jId) if not okT then error(tostring(errT)) end
return "🚀 Đang vào server mã " .. tostring(jId) .. " (PlaceId: " .. tostring(targetPlace or game.PlaceId) .. ")!" end
local pi = _G.BananaCatHub_PlayerInfo if type(pi) == "table" and type(pi.JoinPlayerServer) == "function" and s ~= "" then
local okP, msgP = pi.JoinPlayerServer(s) if not okP then error(tostring(msgP)) end return tostring(msgP) end
if pId and pId > 0 then local okT, errT = S.TeleportToServer(pId, nil) if not okT then error(tostring(errT)) end return "🚀 Đang vào game PlaceId " .. tostring(pId) .. "!"
end error("Mã server không hợp lệ: " .. tostring(s)) end function S.TryJoinCandidates(cand) local tried, lastErr = {}, nil
for _ = 1, math.min(3, #cand) do local pool = {} for _, c in ipairs(cand) do if c and c.id and not tried[c.id] then pool[#pool + 1] = c end end
if #pool == 0 then break end local pick = pool[math.random(1, #pool)] tried[pick.id] = true S._jobPlaceCache[pick.id] = tonumber(game.PlaceId)
local okJ, errJ = pcall(function() return S.JoinServer(pick.id) end) if okJ then return pick, nil end lastErr = errJ end return nil, lastErr end
function S.HopServer() local me = tostring(S.GetJobId() or "") local cand, cursor = {}, "" for _ = 1, 3 do
local okF, list, nextCursor = pcall(function() return S.FetchServers(cursor) end)
if not okF or type(list) ~= "table" then list, nextCursor = {}, nil end for _, sv in ipairs(list) do
local sid = (sv and sv.id) and tostring(sv.id) or nil local playing = tonumber(sv and sv.playing) or 0
local maxp = tonumber(sv and sv.maxPlayers) or 0 if sid and sid ~= me and (maxp <= 0 or playing < maxp) then
cand[#cand + 1] = {id = sid, playing = playing, maxPlayers = maxp} end end if #cand > 0 then break end
if not nextCursor or nextCursor == "" then break end cursor = nextCursor end if #cand == 0 then
return "⚠️ Không tìm thấy server nào còn chỗ trống (hoặc game này không cho xem danh sách server)" end local pick, jErr = S.TryJoinCandidates(cand)
if not pick then return "⚠️ Tìm thấy " .. #cand .. " server nhưng Roblox từ chối cả 3 lần thử gần nhất: " .. tostring(jErr) end
return "🔀 Đang nhảy sang server " .. pick.id .. " (" .. pick.playing .. "/" .. pick.maxPlayers .. " người) · tìm được " .. #cand .. " server khác để chọn, đã bỏ qua server hiện tại" end
function S.HopLowServer() local me = tostring(S.GetJobId() or "") local cand, cursor = {}, "" local pages = 0 local maxPages = 8
for _ = 1, maxPages do pages = pages + 1 local ok, list, nextCursor = pcall(function() return S.FetchServers(cursor) end) if not ok then
task.wait(0.3) ok, list, nextCursor = pcall(function() return S.FetchServers(cursor) end) end if not ok or type(list) ~= "table" then break end
for _, sv in ipairs(list) do local sid = (sv and sv.id) and tostring(sv.id) or nil
local playing = tonumber(sv and sv.playing) or 0 local maxp = tonumber(sv and sv.maxPlayers) or 0 if sid and sid ~= me and (maxp <= 0 or playing < maxp) then
cand[#cand + 1] = {id = sid, playing = playing, maxPlayers = maxp} end end if not nextCursor or nextCursor == "" then break end cursor = nextCursor
task.wait(0.15)
end if #cand == 0 then return "⚠️ Không tìm thấy server nào còn chỗ trống (đã quét "..pages.." trang)" end
table.sort(cand, function(a,b) return (a.playing or 0) < (b.playing or 0) end) local minPlay = cand[1].playing
local best = {} for _, sv in ipairs(cand) do if sv.playing <= minPlay + 1 then best[#best+1] = sv else break end end local pick, jErr = S.TryJoinCandidates(best)
if not pick then return "⚠️ Đã quét " .. #cand .. " server nhưng Roblox từ chối cả 3 lần thử gần nhất: " .. tostring(jErr) end return "🔀 [ÍT NGƯỜI] Đang nhảy sang server " .. pick.id .. " (" .. pick.playing .. "/" .. pick.maxPlayers .. " người) · đã quét " .. #cand .. " server qua " .. pages .. " trang, vắng nhất " .. minPlay .. " người" end
function S.HopEmptyServer() local me = tostring(S.GetJobId() or "") local cand, cursor = {}, "" local pages = 0
local maxPages = 10 for _ = 1, maxPages do pages = pages + 1 local ok, list, nextCursor = pcall(function() return S.FetchServers(cursor) end)
if not ok then task.wait(0.3) ok, list, nextCursor = pcall(function() return S.FetchServers(cursor) end) end
if not ok or type(list) ~= "table" then break end for _, sv in ipairs(list) do
local sid = (sv and sv.id) and tostring(sv.id) or nil local playing = tonumber(sv and sv.playing) or 0
local maxp = tonumber(sv and sv.maxPlayers) or 0 if sid and sid ~= me and (maxp <= 0 or playing < maxp) and playing <= 3 then
cand[#cand + 1] = {id = sid, playing = playing, maxPlayers = maxp} end end if #cand >= 5 then break end
if not nextCursor or nextCursor == "" then break end cursor = nextCursor task.wait(0.15) end if #cand == 0 then return S.HopLowServer() end
table.sort(cand, function(a,b) return (a.playing or 0) < (b.playing or 0) end)
local pick, jErr = S.TryJoinCandidates(cand)
if not pick then return "⚠️ Tìm thấy " .. #cand .. " server vắng nhưng Roblox từ chối cả 3 lần thử gần nhất: " .. tostring(jErr) end return "🔀 [SIÊU VẮNG ≤3] Đang nhảy sang server " .. pick.id .. " (" .. pick.playing .. "/" .. pick.maxPlayers .. " người) · tìm thấy " .. #cand .. " server vắng qua " .. pages .. " trang"
end S.AntiBan = S.AntiBan or { on = (_G.BananaCatHub_AntiBan == true),
busy = false, lastHop = 0, cooldown = 10, hops = 0, lastReason = "", armed = false, snaps = 0, snapAt = 0, conns = {}, _unhookKick = nil, }
function S.AntiBanIsMsg(msg) local s = string.lower(tostring(msg or "")) if s == "" then return false end local keys = {
"you have been banned", "you have been kicked", "you've been banned", "you've been kicked", "banned from this", "kicked from this", "exploit detected", "cheat detected", "cheats detected", "anti-cheat", "anticheat", "kicked by", "banned by",
"you are banned", "account banned", "game banned", "server banned", "client kicked", }
for i = 1, #keys do if string.find(s, keys[i], 1, true) then return true end end return false end function S.AntiBanStatus() local a = S.AntiBan
if not a.on then return "🔐 Anti Ban: TẮT" end local extra = (a.lastReason ~= "" and (" · lần cuối: " .. a.lastReason)) or ""
return "🔐 Anti Ban: BẬT · đã hop " .. tostring(a.hops) .. " lần · chờ " .. tostring(a.cooldown) .. "s" .. extra end
function S.AntiBanHop(reason) local a = S.AntiBan if not a or not a.on then return false, "off" end if a.busy then return false, "busy" end
local now = 0 pcall(function() now = tick() end) local cd = tonumber(a.cooldown) or 10 if now > 0 and a.lastHop > 0 and (now - a.lastHop) < cd then return false, "cooldown" end
a.busy = true a.lastHop = now a.lastReason = tostring(reason or "suspect") a.hops = (tonumber(a.hops) or 0) + 1 pcall(function() _G.BananaCatHub_AntiBan = true end)
local msg = "⚠️ chưa hop" local ok = pcall(function() msg = S.HopServer() end) if not ok then pcall(function() TeleportService:Teleport(game.PlaceId, player) end)
msg = "🔐 không lấy danh sách được → rời PlaceId (không reset đúng server cũ)" end a.busy = false pcall(function() if S.SyncAntiBanPanel then S.SyncAntiBanPanel() end end)
pcall(function() if D.Say then D.Say("🔐 " .. tostring(msg), C.ACCENT) end end) return true, msg end function S.AntiBanDisarm() local a = S.AntiBan
if not a then return end if a._unhookKick then pcall(a._unhookKick) if _G.BananaCatHub_AntiBanUnhook == a._unhookKick then
_G.BananaCatHub_AntiBanUnhook = nil end a._unhookKick = nil end
for i = #(a.conns or {}), 1, -1 do local c = a.conns[i] pcall(function() if c then c:Disconnect() end end) a.conns[i] = nil
end a.armed = false end function S.AntiBanSet(on) S.AntiBan.on = on and true or false
pcall(function() _G.BananaCatHub_AntiBan = S.AntiBan.on end) if S.AntiBan.on then S.AntiBanArm() else
S.AntiBanDisarm() end if S.SyncAntiBanPanel then pcall(S.SyncAntiBanPanel) end return S.AntiBan.on end
function S.AntiBanArm() local a = S.AntiBan if a.armed then return end a.armed = true
a.conns = a.conns or {} local function antiConnect(signal, fn) local c = signal:Connect(fn) a.conns[#a.conns + 1] = c
trackConn(c) return c end pcall(function() if type(hookfunction) == "function" then
local old old = hookfunction(player.Kick, function(...) if a.on then S.AntiBanHop("kick") return end if old then return old(...) end
end) if old then local removed = false local function unhookKick() if removed then return end
removed = true pcall(function() hookfunction(player.Kick, old) end) end a._unhookKick = unhookKick _G.BananaCatHub_AntiBanUnhook = unhookKick end end end) pcall(function()
antiConnect(Players.PlayerRemoving, function(p) if p == player and a.on and not S._intentionalTeleport then S.AntiBanHop("player_removing") end end) end)
pcall(function() local gs = game:GetService("GuiService") antiConnect(gs.ErrorMessageChanged, function() if not a.on then return end local msg = ""
pcall(function() msg = tostring(gs.ErrorMessage or "") end) if msg == "" then pcall(function() msg = tostring(gs:GetErrorMessage()) end) end
if S.AntiBanIsMsg(msg) then S.AntiBanHop("gui_error") end end) end) pcall(function()
antiConnect(TeleportService.TeleportInitFailed, function() if not a.on then return end task.delay(1.2, function()
S.AntiBan.busy = false S.AntiBanHop("teleport_fail") end) end) end) pcall(function()
antiConnect(game:GetService("LogService").MessageOut, function(msg) if a.on and S.AntiBanIsMsg(msg) then S.AntiBanHop("log") end end)
end) local function watchHum(hum) if not hum then return end pcall(function() antiConnect(hum:GetPropertyChangedSignal("WalkSpeed"), function() if not a.on then return end
local m = S.Move local hot = m and (m.fly or m.noclip or m.sprint or m.infJump or m.highJump or (m.Safe and m.Safe.on))
if not hot then return end local now = tick() if now - (S.AntiBan.snapAt or 0) > 4 then S.AntiBan.snaps = 0 end
S.AntiBan.snapAt = now S.AntiBan.snaps = (S.AntiBan.snaps or 0) + 1 if S.AntiBan.snaps >= 3 then S.AntiBan.snaps = 0 S.AntiBanHop("speed_reset") end end) end) end
pcall(function() if player.Character then watchHum(player.Character:FindFirstChildOfClass("Humanoid")) end
antiConnect(player.CharacterAdded, function(ch) task.wait(0.25) watchHum(ch:FindFirstChildOfClass("Humanoid")) end)
end) end if S.AntiBan.on then pcall(S.AntiBanArm) end S.ScriptHubList = {
{icon="🎯", name="Niêm tâm (Crosshair)", cat="Tiện ích", ord=4, action="crosshair"},
{icon="🧩", name="Trả GUI về màn hình", cat="Tiện ích", ord=5, action="unpark"},
{icon="🖱", name="Sửa kẹt chuột", cat="Tiện ích", ord=6, action="fixmouse"},
{icon="🔄", name="Nạp lại hub từ đĩa", cat="Tiện ích", ord=7, action="reload"},
{icon="🧹", name="Dọn host nhúng rác", cat="Tiện ích", ord=8, action="prune"}, {icon="🔄", name="Reset Server", cat="Server", ord=9, action="resetserver"}, {icon="🔀", name="Hop Server", cat="Server", ord=10, action="hopserver"}, {icon="👥", name="Hop Server Ít Người", cat="Server", ord=10.1, action="hoplow"}, {icon="🌙", name="Hop Server Siêu Vắng (≤3)", cat="Server", ord=10.2, action="hopempty"}, {icon="🔐", name="Anti Ban", cat="Server", ord=10.5, action="antiban"}, {icon="🌐", name="Lấy mã server (JobId)", cat="Server", ord=11, action="getjobid"},
{icon="🚀", name="Bay theo camera", cat="Di chuyển", ord=12, action="fly"},
{icon="💨", name="Tốc độ theo camera", cat="Di chuyển", ord=12.2, action="camspeed"},
{icon="🪩", name="Thảm kính bám chân", cat="Di chuyển", ord=12.6, action="carpet"},
{icon="🧱", name="Xuyên Tường", cat="Di chuyển", ord=13, action="noclip"}, {icon="🦘", name="Nhảy Vô Hạn", cat="Di chuyển", ord=14, action="infjump"},
{icon="🦘", name="Nhảy Cao", cat="Di chuyển", ord=14.2, action="highjump"},
{icon="🎥", name="Khán giả", cat="Tiện ích", ord=21.5, action="freecam"},
{icon="✨", name="Phát Sáng", cat="Tiện ích", ord=22, action="glow"},
{icon="🛡", name="Bay An Toàn", cat="Di chuyển", ord=23, action="safefly"}, }
S.hubFavs   = S.hubFavs or {} S.hubCat    = "Tất cả" S.hubSearch = "" function S.RunHubAction(id) if id == "crosshair" then
local okC = pcall(function() S.ToggleCrosshair() end) if not okC then return "⚠️ chưa bật được niêm tâm" end
S.Rebuild()
return "🎯 Niêm tâm: " .. (S.crosshairOn and "BẬT (giữa màn hình game)" or "TẮT") elseif id == "unpark" then local n = 0 pcall(function() n = n + (S.RemoveAllParked() or 0) end)
for _, ft in ipairs(featureTabs) do local host = ft.frame and ft.frame:FindFirstChild("ScriptHost") if host then pcall(function() n = n + S.ClearEmbedsUnder(host) end) end end
pcall(S.PruneEmbeds) pcall(function() if S.SyncEmbedToggles then S.SyncEmbedToggles() end end) return "🧩 đã trả " .. n .. " GUI về màn hình game (GUI gốc giữ nguyên, không Destroy)"
elseif id == "fixmouse" then if type(S.DoFixMouse) == "function" then local msg = nil pcall(function() msg = S.DoFixMouse() end)
return "🖱 " .. tostring(msg or "đã trả input cho game") end pcall(ReleaseHubFocus) pcall(function() UserInputService.MouseBehavior = Enum.MouseBehavior.Default end)
return "🖱 đã nhả focus + đặt lại chuột" elseif id == "reload" then if type(S.DoReload) == "function" then
task.spawn(function() pcall(S.DoReload) end) return "🔄 đang nạp lại hub từ đĩa..." end return "⚠️ hub chưa sẵn sàng để nạp lại" elseif id == "prune" then pcall(S.PruneEmbeds)
return "🧹 đã dọn các host nhúng rác" elseif id == "resetserver" then local msg = "⚠️ chưa reset được"
local okRs = pcall(function() msg = S.ResetServer() end) if not okRs then return "⚠️ Reset server thất bại: " .. tostring(msg) end
return tostring(msg) elseif id == "hopserver" then local msg = "⚠️ chưa hop được" local okHp = pcall(function() msg = S.HopServer() end)
if not okHp then return "⚠️ Hop server thất bại: " .. tostring(msg) .. " — vẫn dùng được ô 🎟 dán mã server bên dưới để vào thủ công" end return tostring(msg)
elseif id == "hoplow" then local msg = "⚠️ chưa hop được" local okHp = pcall(function() msg = S.HopLowServer() end) if not okHp then
return "⚠️ Hop ít người thất bại: " .. tostring(msg) .. " — thử lại hoặc dùng ô 🎟 dán mã thủ công"
end return tostring(msg) elseif id == "hopempty" then local msg = "⚠️ chưa hop được" local okHp = pcall(function() msg = S.HopEmptyServer() end)
if not okHp then return "⚠️ Hop siêu vắng thất bại: " .. tostring(msg) .. " — thử lại hoặc dùng ô 🎟" end return tostring(msg) elseif id == "antiban" then
local wanted = not S.AntiBan.on local okAb = pcall(function() S.AntiBanSet(wanted) end) if not okAb then return "⚠️ chưa bật được Anti Ban" end
S.Rebuild() return S.AntiBanStatus() elseif id == "getjobid" then local jid = S.GetJobId()
if not jid then return "⚠️ Không đọc được mã server (đang ở Studio / server đơn)" end local okCp = S.CopyToClipboard(jid)
pcall(function() if D.hubJobIn then D.hubJobIn.Text = jid end end) pcall(function() if S.SyncServerPanel then S.SyncServerPanel() end end) return (okCp and "🌐 Đã copy mã server: " or "🌐 Mã server (executor không cho copy, hãy chép tay): ") .. jid
elseif id == "fly" then local wanted = not S.Move.fly local okF, on, err = pcall(S.Move.SetFly, wanted) if not okF then return "⚠️ lỗi bay: " .. tostring(on) end
if wanted and not on then return "⚠️ " .. tostring(err) end S.Rebuild()
return S.Move.fly and ("🚀 Bay theo camera: BẬT — WASD/điều khiển game · thả phím đứng lơ lửng · tốc độ " .. tostring(S.Move.flySpeed)) or "🚀 Bay: TẮT — xuyên tường giữ nguyên theo công tắc 🧱"
elseif id == "camspeed" then local wanted = not S.Move.sprint local okS, on, err = pcall(S.Move.SetSprint, wanted)
if not okS then return "⚠️ lỗi tốc độ: " .. tostring(on) end if wanted and not on then return "⚠️ " .. tostring(err) end
S.Rebuild() return S.Move.sprint and ("💨 Tốc độ theo camera: BẬT — WASD/joystick mặt đất · nhảy bình thường · rơi theo game · tốc độ " .. tostring(S.Move.sprintSpeed))
or "💨 Tốc độ theo camera: TẮT — trọng lực/nhảy trả về game" elseif id == "noclip" then
if not S.Move.noclip and not S.Move.Root() then return "⚠️ chưa có nhân vật (đợi vào game xong hãy bấm)" end pcall(function() S.Move.SetNoclip(not S.Move.noclip) end)
S.Rebuild() return S.Move.noclip and "🧱 Xuyên tường: BẬT (đi xuyên mọi vật cản)" or "🧱 Xuyên tường: TẮT (CanCollide đã trả lại giá trị gốc)"
elseif id == "infjump" then pcall(function() S.Move.SetInfJump(not S.Move.infJump) end)
S.Rebuild() return S.Move.infJump and "🦘 Nhảy vô hạn: BẬT (Space/🐸 A — nhảy được cả game cấm nhảy/không bốc JumpRequest)"
or "🦘 Nhảy vô hạn: TẮT (JumpPower/JumpHeight đã trả lại game)" elseif id == "highjump" then local wanted = not S.Move.highJump local okH, on = pcall(S.Move.SetHighJump, wanted)
if not okH then return "⚠️ lỗi nhảy cao: " .. tostring(on) end S.Rebuild() return S.Move.highJump and ("🦘 Nhảy cao: BẬT — tốc độ " .. tostring(S.Move.highJumpSpeed) .. " · Space nhảy cao · rơi theo game")
or "🦘 Nhảy cao: TẮT — JumpPower trả về game" elseif id == "speed" then pcall(function() S.Move.SetSpeed(not S.Move.speed) end) S.Rebuild()
return S.Move.speed and ("👟 Chạy độ: BẬT — " .. (S.Move.speedMode == "x" and ("theo game ×" .. tostring(S.Move.speedMul)
.. " = " .. tostring(S.Move.WantSpeed())) or  ("cố định " .. tostring(S.Move.walkSpeed)))
.. " · JumpPower " .. tostring(S.Move.jumpPower)) or ("👟 Chạy độ: TẮT — về tốc độ game (" .. tostring(S.Move._baseWS) .. ")") elseif id == "carpet" then
local wanted = not S.Move.carpet local okC, on, errC = pcall(S.Move.SetCarpet, wanted)
if not okC then return "⚠️ lỗi thảm kính: " .. tostring(on) end if wanted and not on then return "⚠️ " .. tostring(errC) end
S.Rebuild() return S.Move.carpet and "🪩 Thảm kính bám chân: BẬT — thảm di chuyển cùng bạn" or "🪩 Thảm kính bám chân: TẮT" elseif id == "placeglass" then
local okP, part, rec = S.Move.PlaceGlass() if not okP then return "⚠️ " .. tostring(part) end pcall(function() if S.GlassRefreshList then S.GlassRefreshList() end end)
S.Rebuild() return "🧱 Đã đặt tấm kính cố định #" .. tostring(rec and rec.id or "?")
.. " · tổng " .. tostring(#(S.Move.GetPlacedGlasses() or {})) .. " tấm" elseif id == "clearglass" then
local n = S.Move.ClearPlacedGlasses() pcall(function() if S.GlassRefreshList then S.GlassRefreshList() end end)
S.Rebuild() return "🧹 Đã xóa toàn bộ " .. tostring(n) .. " tấm kính cố định" elseif id == "autoglass" then
local on = S.Move.SetAutoGlass(not S.Move.autoGlass) pcall(function() if S.GlassRefreshList then S.GlassRefreshList() end end)
S.Rebuild() return on and "🔄 Tự đặt kính: BẬT — đi tới đâu tự đặt tấm cố định ở đó" or "🔄 Tự đặt kính: TẮT" elseif id == "openglasspanel" then
local okOpen = false pcall(function() okOpen = S.OpenGlassPanel and S.OpenGlassPanel() or S.OpenPlayerTab() end)
return okOpen and "📋 Đã mở 👥 Người Chơi → danh sách thảm kính" or "⚠️ chưa mở được bảng thảm kính" elseif id == "flyglass" then
local idx = S.Move.NearestGlassIndex and S.Move.NearestGlassIndex() if not idx then return "⚠️ chưa có tấm kính cố định để bay tới" end
local okF, rec = S.Move.FlyToGlass(idx) if not okF then return "⚠️ " .. tostring(rec) end
return "🚀 đang bay tới tấm kính #" .. tostring(rec and rec.id or idx) .. " · tốc độ " .. tostring(S.Move.glassFlySpeed) .. " — sẽ dừng khi tới nơi"
elseif id == "stopglassfly" then S.Move.StopGlassFly()
return "⏹ đã dừng bay tới kính" elseif id == "flyplayer" then if not S.Move.Root() then return "⚠️ chưa có nhân vật để bay (đợi vào game xong hãy bấm)" end
local target = nil if S.Loc and S.Loc.Nearest then target = S.Loc.Nearest() end
if not target then return "⚠️ không có người chơi nào để bay tới" end local ok, res = S.Move.FlyToPlayer(target)
if S.Loc and S.Loc.RefreshList then pcall(S.Loc.RefreshList) end if S.SyncLocPanel then pcall(S.SyncLocPanel) end
S.Rebuild() return ok and string.format("🚀 đang bay tới người %s tốc độ %g (0=auto lấy tốc độ game) — bấm ⏹ Dừng bay tới người để dừng, theo dõi mục tiêu di chuyển, dừng khi <2 studs", tostring(target.Name), S.Move.GetPlayerFlySpeed and S.Move.GetPlayerFlySpeed() or S.Move.playerFlySpeed or 0)
or ("⚠️ " .. tostring(res)) elseif id == "stopflyplayer" then S.Move.StopPlayerFly()
if S.Loc and S.Loc.RefreshList then pcall(S.Loc.RefreshList) end if S.SyncLocPanel then pcall(S.SyncLocPanel) end
S.Rebuild() return "⏹ đã dừng bay tới người chơi" elseif id == "runmode" then return "⚠️ Tính năng chạy trên thảm đã bị xóa"
elseif id == "loc_all" then pcall(function() S.Loc.Set(not S.Loc.on) end)
S.Rebuild() return (S.Loc.on and "📍 ĐỊNH VỊ: BẬT — " or "📍 ĐỊNH VỊ: TẮT — ") .. S.Loc.Status() elseif id == "loc_solo" then
if S.Loc.solo then pcall(function() S.Loc.SetSolo(false) end) else pcall(function() S.Loc.SetTarget(S.Loc.target or S.Loc.Nearest()) end) end S.Rebuild()
return (S.Loc.solo and "🎯 ĐỊNH VỊ LẺ: " .. tostring(S.Loc.target and S.Loc.target.Name or "?") .. " — chỉ hiện người này (bấm tên khác trong khung 📍 để đổi)") or "🎯 ĐỊNH VỊ LẺ: TẮT (trở lại bình thường)"
elseif id == "safefly" then if not S.Move.Root() then return "⚠️ chưa có nhân vật để bay (đợi vào game xong hãy bấm)" end
if not S.Move.Safe.on then local okf = S.Move.SetFly(true) if okf == false then return "⚠️ không bật được bay" end end
pcall(function() S.Move.Safe.Set(not S.Move.Safe.on) end) pcall(function() if S.SyncSafePanel then S.SyncSafePanel() end end)
S.Rebuild() return S.Move.Safe.Status() elseif id == "safefly_off" then pcall(function() S.Move.Safe.Stop() end)
pcall(function() if S.SyncSafePanel then S.SyncSafePanel() end end) S.Rebuild() return "🚫 " .. S.Move.Safe.Status()
elseif id == "glow" then pcall(function() S.Glow.Set(not S.Glow.on) end)
pcall(function() if S.SyncGlowPanel then S.SyncGlowPanel() end end) S.Rebuild() return S.Glow.Status() elseif id == "glow_off" then
pcall(function() S.Glow.Stop() end) pcall(function() if S.SyncGlowPanel then S.SyncGlowPanel() end end) S.Rebuild() return "🚫 " .. S.Glow.Status()
elseif id == "freecam" then pcall(function() S.Free.Set(not S.Free.on) end)
pcall(function() if S.SyncFreePanel then S.SyncFreePanel() end end) S.Rebuild() return S.Free.Status() elseif id == "freecam_off" then
pcall(function() S.Free.Stop() end) pcall(function() if S.SyncFreePanel then S.SyncFreePanel() end end) S.Rebuild() return "🚫 " .. S.Free.Status()
elseif id == "spec_on" then if S.Spec and S.Spec.on then pcall(function() S.Spec.Stop() end) pcall(function() if S.Spec.RefreshList then S.Spec.RefreshList() end end)
S.Rebuild() return "🚫 " .. (S.Spec.Status and S.Spec.Status() or "đã dừng xem")
end local p = S.Spec.target or S.Loc.target or S.Loc.Nearest() if not p then return "⚠️ chưa có ai để xem (server chỉ có mình bạn)" end
pcall(function() S.Loc.SetTarget(p) end) pcall(function() S.Spec.Set(p) end) pcall(function() if S.Spec.RefreshList then S.Spec.RefreshList() end end) S.Rebuild()
return "👣 " .. S.Spec.Status() .. " (bấm lại thẻ để dừng · chọn người ở tab 👥)" elseif id == "spec_off" then
pcall(function() S.Spec.Stop() end) pcall(function() if S.Spec.RefreshList then S.Spec.RefreshList() end end) S.Rebuild()
return "🚫 " .. S.Spec.Status() elseif id == "loc_stop" then pcall(function() S.Loc.StopAll() end) S.Rebuild()
return "🚫 đã tắt hết định vị: " .. S.Loc.Status() elseif id == "movestop" then pcall(function() S.Move.StopAll() end) S.Rebuild() return "🛑 đã tắt hết: " .. S.Move.Status()
elseif id == "objfind" then pcall(function() if S.ObjTrack.Focus then S.ObjTrack.Focus() end end)
S.Rebuild() return "🌳 định vị vật: gõ tên vào ô 🔎 (VD: cây) · " .. S.ObjTrack.Status() elseif id == "objfly" then local target = select(1, S.ObjTrack.Nearest())
if not target then return "⚠️ chưa có vật nào đang định vị — mở 🌳 ở tab 👥 Người Chơi và nhập tên vật" end local okFly, resFly = S.Move.FlyToObject(target)
S.Rebuild() if not okFly then return "⚠️ " .. tostring(resFly) end return "🚀 đang bay tới '" .. tostring(target.Name) .. "' (vật đi đâu bay theo đó · bấm ⏹ Dừng bay để dừng)"
elseif id == "objclear" then local n = 0 for _ in pairs(S.ObjTrack.items) do n = n + 1 end pcall(function() S.ObjTrack.Set(false) end)
S.Rebuild() return "🧹 đã xoá " .. tostring(n) .. " định vị vật theo tên" end return "⚠️ không rõ thao tác: " .. tostring(id) end
function D.CardBtn(parent, text, posX, w, color) local b = New("TextButton", {
Size = UDim2.new(0, w, 0, 20), Position = UDim2.new(1, posX, 0, 14), Text = text, BackgroundColor3 = color or C.SURFACE3, BackgroundTransparency = 0.08,
TextColor3 = D.BestText(color or C.SURFACE3), Font = Enum.Font.GothamBold, TextSize = 8, BorderSizePixel = 0, ZIndex = 8,
}, parent) Corner(b, UDim.new(0, 6)) Stroke(b, D.Edge(color or C.SURFACE3), 1.1)
D.Shade(b, Color3.fromRGB(255,255,255), Color3.fromRGB(182,187,201), 90)
D.Tactile(b, 0.08) return b end D.hubTab = AddTab("Script Hub", "📚", 3) D.hubSearchBox = New("TextBox", { Size = UDim2.new(1, -16, 0, 26), Position = UDim2.new(0, 8, 0, 8),
PlaceholderText = "🔍  Tìm script hoặc tiện ích...", Text = "", ClearTextOnFocus = false, BackgroundColor3 = C.SURFACE, BackgroundTransparency = 0.08, TextColor3 = C.DARK,
PlaceholderColor3 = C.GRAY, Font = Enum.Font.GothamMedium, TextSize = 10, TextXAlignment = Enum.TextXAlignment.Left, BorderSizePixel = 0, ZIndex = 6,
}, D.hubTab) Corner(D.hubSearchBox, UDim.new(0, 10)) Stroke(D.hubSearchBox, C.BORDER, 1) New("UIPadding", {PaddingLeft = UDim.new(0, 9)}, D.hubSearchBox)
D.hubChips = New("Frame", { Size = UDim2.new(1, -16, 0, 22), Position = UDim2.new(0, 8, 0, 38), BackgroundTransparency = 1, BorderSizePixel = 0, ZIndex = 6, }, D.hubTab)
New("UIListLayout", { FillDirection = Enum.FillDirection.Horizontal, Padding = UDim.new(0, 5),
SortOrder = Enum.SortOrder.LayoutOrder, VerticalAlignment = Enum.VerticalAlignment.Center, }, D.hubChips) D.hubList = New("ScrollingFrame", {
Size = UDim2.new(1, -16, 1, -146), Position = UDim2.new(0, 8, 0, 64),
BackgroundTransparency = 1, BorderSizePixel = 0, CanvasSize = UDim2.new(0, 0, 0, 0), ScrollBarThickness = 3, ClipsDescendants = true, ZIndex = 6,
AutomaticCanvasSize = Enum.AutomaticSize.Y, }, D.hubTab) New("UIListLayout", {Padding = UDim.new(0, 6), SortOrder = Enum.SortOrder.LayoutOrder}, D.hubList)
D.hubStatus = New("TextLabel", { Size = UDim2.new(1, -16, 0, 22), Position = UDim2.new(0, 8, 1, -24),
Text = "📚 Bấm ▶ để chạy script, ⚡ để thực hiện tiện ích · ⭐ để ghim lên đầu", BackgroundTransparency = 1, TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium, TextSize = 9,
TextWrapped = true, TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top, ZIndex = 6, }, D.hubTab)
D.hubSrvPanel = New("Frame", { Name = "HubServerPanel", Size = UDim2.new(1, -16, 0, 74), Position = UDim2.new(0, 8, 1, -76),
BackgroundColor3 = C.SURFACE, BackgroundTransparency = 0.25, BorderSizePixel = 0, ZIndex = 6, }, D.hubTab)
Corner(D.hubSrvPanel, UDim.new(0, 10)) Stroke(D.hubSrvPanel, C.BORDER, 1) D.hubJobLbl = New("TextLabel", { Size = UDim2.new(1, -40, 0, 14), Position = UDim2.new(0, 8, 0, 4),
Text = "🌐 Mã server: đang đọc...", BackgroundTransparency = 1, TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium, TextSize = 9,
TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, D.hubSrvPanel)
D.hubJobCopy = New("TextButton", { Size = UDim2.new(0, 22, 0, 14), Position = UDim2.new(1, -28, 0, 4), Text = "📋",
BackgroundColor3 = C.BLUE, BackgroundTransparency = 0.1, TextColor3 = C.INK, Font = Enum.Font.GothamBold, TextSize = 8, BorderSizePixel = 0, AutoButtonColor = false, ZIndex = 7,
}, D.hubSrvPanel) Corner(D.hubJobCopy, UDim.new(0, 5)) D.Tactile(D.hubJobCopy, 0.1)
D.hubJobIn = New("TextBox", { Name = "HubServer_JobInput", Size = UDim2.new(1, -112, 0, 20), Position = UDim2.new(0, 8, 0, 22),
PlaceholderText = "🎟 Dán mã server (JobId) hoặc tên người chơi vào đây...", Text = "", ClearTextOnFocus = false, BackgroundColor3 = C.SURFACE2, BackgroundTransparency = 0.1, TextColor3 = C.DARK,
PlaceholderColor3 = C.GRAY, Font = Enum.Font.GothamMedium, TextSize = 9, TextXAlignment = Enum.TextXAlignment.Left, BorderSizePixel = 0, ZIndex = 7,
}, D.hubSrvPanel) Corner(D.hubJobIn, UDim.new(0, 7)) Stroke(D.hubJobIn, C.BORDER, 1) New("UIPadding", {PaddingLeft = UDim.new(0, 7)}, D.hubJobIn)
D.hubJoinBtn = D.CardBtn(D.hubSrvPanel, "🚀 Vào", -98, 46, C.GREEN) D.hubJoinBtn.Name = "HubServer_JoinBtn" D.hubJoinBtn.Position = UDim2.new(1, -98, 0, 22)
D.hubHopBtn = D.CardBtn(D.hubSrvPanel, "🔀 Hop", -48, 42, C.PURPLE) D.hubHopBtn.Name = "HubServer_HopBtn" D.hubHopBtn.Position = UDim2.new(1, -48, 0, 22)
D.hubLowBtn = D.CardBtn(D.hubSrvPanel, "👥 Ít", -98, 38, C.BLUE) D.hubLowBtn.Position = UDim2.new(1, -98, 0, 46)
D.hubEmptyBtn = D.CardBtn(D.hubSrvPanel, "🌙 Vắng", -56, 50, C.ORANGE) D.hubEmptyBtn.Position = UDim2.new(1, -56, 0, 46)
function S.SyncServerPanel() pcall(function() if not D.hubJobLbl then return end local jid = S.GetJobId()
if jid then D.hubJobLbl.Text = "🌐 Mã server: " .. jid D.hubJobLbl.TextColor3 = C.DARK else
D.hubJobLbl.Text = "🌐 Không đọc được mã server (Studio/server đơn) — 🔄 Reset vẫn dùng được" D.hubJobLbl.TextColor3 = C.MUTED end end) end
function S.DoHubJoinByInput(rawText) local id = tostring(rawText or (D.hubJobIn and D.hubJobIn.Text) or "")
id = id:gsub("^%s+", ""):gsub("%s+$", "") id = id:gsub('^"', ""):gsub('"$', ""):gsub("^'", ""):gsub("'$", "") if id == "" then local pi = _G.BananaCatHub_PlayerInfo
if type(pi) == "table" and type(pi.last) == "table" and type(pi.last.serverJobId) == "string" and pi.last.serverJobId ~= "" then
id = pi.last.serverJobId pcall(function() if D.hubJobIn then D.hubJobIn.Text = id end end) end end
if id == "" then local msg = "⚠️ Hãy DÁN mã server (JobId) hoặc tên người chơi vào ô 🎟 trước khi bấm 🚀 Vào"
D.Say(msg) if D.hubStatus then D.hubStatus.Text = msg end ReleaseHubFocus() return false, msg end
D.Say("🚀 Đang vào server " .. id .. " ...", C.YELLOW) if D.hubStatus then D.hubStatus.Text = "🚀 Đang xử lý vào server: " .. id .. " ..." end
ReleaseHubFocus() local okJ, msgOrErr = pcall(function() return S.JoinServer(id) end) if not okJ then local failMsg = "⚠️ Không vào được server này: " .. tostring(msgOrErr)
D.Say(failMsg) if D.hubStatus then D.hubStatus.Text = failMsg end return false, failMsg end local okMsg = tostring(msgOrErr or ("🚀 Đang vào server " .. id .. "!"))
D.Say(okMsg, C.GREEN) if D.hubStatus then D.hubStatus.Text = okMsg end return true, okMsg
end D.hubJobCopy.Activated:Connect(function() local jid = S.GetJobId()
if not jid then D.Say("⚠️ Không có mã server để copy (đang ở Studio / server đơn)") return end
local okCp = S.CopyToClipboard(jid) pcall(function() D.hubJobIn.Text = jid end)
D.Say(okCp and ("📋 Đã copy mã server: " .. jid) or ("⚠️ Executor không cho copy — mã server là: " .. jid), okCp and C.GREEN or C.YELLOW) end)
D.hubJoinBtn.Activated:Connect(function() S.DoHubJoinByInput(D.hubJobIn and D.hubJobIn.Text) end)
D.hubJobIn.FocusLost:Connect(function(enter) if enter then S.DoHubJoinByInput(D.hubJobIn.Text) end end)
D.hubHopBtn.Activated:Connect(function() ReleaseHubFocus()

D.Say("🔀 Đang đi lấy mã server...", C.YELLOW) D.hubStatus.Text = S.RunHubAction("hopserver") end)
D.hubLowBtn.Activated:Connect(function() ReleaseHubFocus()
D.Say("👥 Đang quét 800 server tìm server ÍT NGƯỜI nhất...", C.YELLOW) D.hubStatus.Text = S.RunHubAction("hoplow") end)
D.hubEmptyBtn.Activated:Connect(function() ReleaseHubFocus()
D.Say("🌙 Đang tìm server SIÊU VẮNG ≤3 người...", C.YELLOW) D.hubStatus.Text = S.RunHubAction("hopempty") end)
function S.Rebuild() pcall(function() if S.RebuildHubList then S.RebuildHubList() end end) end do
local STUDS_PER_METER = 1 / 0.28
local PALE_COLOR = Color3.fromRGB(224, 224, 224) local modeList = {
{id = "cpu", title = "🧠 CPU", x = 8, y = 42}, {id = "range", title = "🌫 Giảm tầm nhìn", x = 140, y = 42},
{id = "quality", title = "🎨 Giảm lag nhẹ", x = 8, y = 68}, } local Perf = { Modes = {cpu = false, range = false, quality = false},
ViewDistanceMeters = 30, Saved = setmetatable({}, {__mode = "k"}), ScanToken = 0, Worker = nil,
Buttons = {}, Status = nil, RangeAtmosphere = nil, }
S.Perf = Perf _G.BananaCatHub_Perf = Perf function Perf.GetViewDistanceStuds() return Perf.ViewDistanceMeters * STUDS_PER_METER
end function Perf.SyncRangeFog() local lighting = game:GetService("Lighting") local atmosphere = lighting:FindFirstChildOfClass("Atmosphere")
if Perf.RangeAtmosphere and Perf.RangeAtmosphere ~= atmosphere then Perf.RestoreProperty(Perf.RangeAtmosphere, "Density")
Perf.RangeAtmosphere = nil end local fogStart, fogEnd = nil, nil if Perf.Modes.range and atmosphere then
local saved = Perf.Saved[atmosphere] local originalDensity = saved and saved.Density or atmosphere.Density
local densityIncrease = math.clamp(40 / Perf.GetViewDistanceStuds(), 0.01, 0.7) Perf.RangeAtmosphere = atmosphere
Perf.Write(atmosphere, "Density", math.clamp(originalDensity + densityIncrease, 0, 1)) elseif Perf.Modes.range then
fogEnd = Perf.GetViewDistanceStuds() fogStart = fogEnd * 0.75
elseif Perf.RangeAtmosphere then Perf.RestoreProperty(Perf.RangeAtmosphere, "Density") Perf.RangeAtmosphere = nil end
Perf.Write(lighting, "FogStart", fogStart) Perf.Write(lighting, "FogEnd", fogEnd) end function Perf.HasActive()
for _, on in pairs(Perf.Modes) do if on then return true end end return false
end function Perf.RestoreProperty(instance, property) local saved = Perf.Saved[instance] local original = saved and saved[property]
if original == nil then return end saved[property] = nil
pcall(function() instance[property] = original end) if next(saved) == nil then Perf.Saved[instance] = nil end
end function Perf.RestoreInstance(instance) local saved = Perf.Saved[instance] if not saved then return end
local properties = {} for property in pairs(saved) do properties[#properties + 1] = property end
for _, property in ipairs(properties) do Perf.RestoreProperty(instance, property) end end
function Perf.RestoreAll(yieldEvery, token) local instances = {}
for instance in pairs(Perf.Saved) do instances[#instances + 1] = instance end for index, instance in ipairs(instances) do
if token and token ~= Perf.ScanToken then return false end Perf.RestoreInstance(instance)
if yieldEvery and index % yieldEvery == 0 then task.wait() end end return true end
function Perf.Write(instance, property, value) if value == nil then Perf.RestoreProperty(instance, property) return
end local saved = Perf.Saved[instance] if not saved then saved = {}; Perf.Saved[instance] = saved end if saved[property] == nil then
local ok, original = pcall(function() return instance[property] end) if not ok then return end saved[property] = original end
pcall(function() instance[property] = value end) end
function Perf.IsVisualEffect(instance) return instance:IsA("PostEffect") or instance:IsA("ParticleEmitter")
or instance:IsA("Trail") or instance:IsA("Beam") or instance:IsA("Fire") or instance:IsA("Smoke")
or instance:IsA("Sparkles") or instance:IsA("Light") end function Perf.ApplyInstance(instance) local character = player.Character
if character and (instance == character or instance:IsDescendantOf(character)) then Perf.RestoreInstance(instance) return end
local desired = {} local saved = Perf.Saved[instance] local isPart = instance:IsA("BasePart") if Perf.Modes.cpu and isPart then
desired.Material = Enum.Material.Plastic desired.Reflectance = 0 desired.CastShadow = false if instance:IsA("MeshPart") then
desired.RenderFidelity = Enum.RenderFidelity.Performance end end if Perf.Modes.quality and isPart then
desired.Material = Enum.Material.Plastic if instance:IsA("MeshPart") then desired.RenderFidelity = Enum.RenderFidelity.Performance end
local originalColor = saved and saved.Color or instance.Color desired.Color = originalColor:Lerp(PALE_COLOR, 0.22)
end if Perf.Modes.cpu and Perf.IsVisualEffect(instance) then desired.Enabled = false end if saved then local restore = {}
for property in pairs(saved) do if desired[property] == nil then restore[#restore + 1] = property end
end for _, property in ipairs(restore) do Perf.RestoreProperty(instance, property) end
end for property, value in pairs(desired) do Perf.Write(instance, property, value) end end function Perf.UpdateGlobals()
local shadows = nil if Perf.Modes.cpu then shadows = false end
local lighting = game:GetService("Lighting") Perf.Write(lighting, "GlobalShadows", shadows) Perf.SyncRangeFog() local terrain = workspace.Terrain
local terrainDecoration, waveSize, waveSpeed = nil, nil, nil if Perf.Modes.cpu then terrainDecoration, waveSize, waveSpeed = false, 0, 0 end
Perf.Write(terrain, "Decoration", terrainDecoration) Perf.Write(terrain, "WaterWaveSize", waveSize)
Perf.Write(terrain, "WaterWaveSpeed", waveSpeed) end function Perf.SyncPanel() for _, item in ipairs(modeList) do
local button = Perf.Buttons[item.id] if button and button.Parent then
local on = Perf.Modes[item.id] == true button.Text = item.title .. ": " .. (on and "BẬT" or "TẮT")
D.SetBg(button, on and C.GREEN or C.SURFACE2) end end end
S.SyncPerfPanel = Perf.SyncPanel function Perf.QueueScan() Perf.ScanToken = Perf.ScanToken + (1)
local token = Perf.ScanToken if Perf.Worker then pcall(task.cancel, Perf.Worker); Perf.Worker = nil end
if not Perf.Modes.cpu and not Perf.Modes.quality then
if Perf.Status and Perf.Status.Parent then Perf.Status.Text = "↩ Đang khôi phục cài đặt hình ảnh..." end Perf.Worker = task.spawn(function()
Perf.UpdateGlobals() Perf.RestoreAll(240, token) if token ~= Perf.ScanToken then return end Perf.UpdateGlobals()
if token == Perf.ScanToken then Perf.Worker = nil if Perf.Status and Perf.Status.Parent then Perf.Status.Text = Perf.Modes.range
and "✅ Giảm tầm nhìn đang bật; cảnh xa mờ đi, không xóa vật thể." or "✅ Đã khôi phục hình ảnh gốc." end end
end) return true end if Perf.Status and Perf.Status.Parent then Perf.Status.Text = "⏳ Đang áp dụng chế độ đồ họa theo từng lô..." end
Perf.Worker = task.spawn(function() Perf.UpdateGlobals()
local roots = {workspace, game:GetService("Lighting")} local camera = workspace.CurrentCamera
if camera then roots[#roots + 1] = camera end local visited = setmetatable({}, {__mode = "k"}) local batchSize = 90 local processed = 0
for _, root in ipairs(roots) do local stack = {root} while #stack > 0 do if token ~= Perf.ScanToken then return end
local parent = table.remove(stack) local ok, children = pcall(function() return parent:GetChildren() end)
if ok and type(children) == "table" then for _, child in ipairs(children) do if token ~= Perf.ScanToken then return end if not visited[child] then
visited[child] = true processed = processed + (1)
pcall(Perf.ApplyInstance, child) stack[#stack + 1] = child if processed % batchSize == 0 then task.wait() end end
end end end end
if token == Perf.ScanToken then Perf.Worker = nil
if Perf.Status and Perf.Status.Parent then local modeText = Perf.Modes.cpu and Perf.Modes.quality and "CPU + đồ họa nhẹ"
or (Perf.Modes.quality and "đồ họa nhẹ" or "CPU") Perf.Status.Text = string.format("✅ Đã áp dụng %s cho %d đối tượng.", modeText, processed)
end end end) return true
end function Perf.Toggle(id) if Perf.Modes[id] == nil then return end Perf.Modes[id] = not Perf.Modes[id]
if id == "cpu" or id == "quality" then Perf.QueueScan() else Perf.UpdateGlobals()
if Perf.Status and Perf.Status.Parent then Perf.Status.Text = Perf.Modes.range
and ("🌫 Tầm nhìn đã giảm còn " .. tostring(Perf.ViewDistanceMeters) .. " m.") or "↩ Đã khôi phục tầm nhìn gốc." end end
Perf.SyncPanel() local note if id == "cpu" then note = "🧠 CPU: giảm tải hiệu ứng và quét theo lô."
elseif id == "quality" then note = "🎨 Giảm chi tiết và làm màu nhạt hơn; giữ nguyên ánh sáng, bóng và hiệu ứng."
else note = "🌫 Tầm nhìn tối đa " .. tostring(Perf.ViewDistanceMeters) .. " m (~"
.. tostring(math.floor(Perf.GetViewDistanceStuds() + 0.5)) .. " studs); cảnh xa mờ dần, không xóa vật thể." end
D.Say((Perf.Modes[id] and "✅ " or "↩ ") .. note, C.YELLOW) end function Perf.ApplyViewDistance(text) local value = tonumber(text)
if not value or value ~= value or value == math.huge or value == -math.huge then
if Perf.Status and Perf.Status.Parent then Perf.Status.Text = "⚠️ Nhập tầm nhìn từ 5 đến 1000 mét." end return
end Perf.ViewDistanceMeters = math.clamp(math.floor(value + 0.5), 5, 1000)
if Perf.DistanceBox and Perf.DistanceBox.Parent then Perf.DistanceBox.Text = tostring(Perf.ViewDistanceMeters)
end if Perf.Modes.range then Perf.SyncRangeFog() end if Perf.Status and Perf.Status.Parent then Perf.Status.Text = string.format(
"🌫 Đã đặt %dm (~%d studs); %s.", Perf.ViewDistanceMeters, math.floor(Perf.GetViewDistanceStuds() + 0.5),
Perf.Modes.range and "đã áp dụng" or "bật Giảm tầm nhìn để áp dụng" ) end end
function Perf.Reset() for id in pairs(Perf.Modes) do Perf.Modes[id] = false end Perf.QueueScan() Perf.SyncPanel()
end function Perf.Stop() for id in pairs(Perf.Modes) do Perf.Modes[id] = false end
Perf.ScanToken = Perf.ScanToken + (1) if Perf.Worker then pcall(task.cancel, Perf.Worker); Perf.Worker = nil end Perf.RestoreAll()
end local panel = New("Frame", { Name = "HubPerf_Panel", Size = UDim2.new(1, 0, 0, 184), LayoutOrder = -5,
BackgroundColor3 = C.SURFACE, BackgroundTransparency = 0.12, BorderSizePixel = 0, ZIndex = 6, }, D.hubList)
Corner(panel, UDim.new(0, 10)); Stroke(panel, C.HAIRLINE, 1) D.Shade(panel, Color3.fromRGB(255,255,255), Color3.fromRGB(188,192,205), 90)
New("TextLabel", { Size = UDim2.new(1, -174, 0, 16), Position = UDim2.new(0, 8, 0, 4),
Text = "⚡ GIẢM LAG · TẦM NHÌN", BackgroundTransparency = 1, TextColor3 = C.ACCENT,
Font = Enum.Font.GothamBold, TextSize = 9, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, panel)
Perf.FpsLabel = New("TextLabel", { Name = "HubPerfFPS", Size = UDim2.new(0, 60, 0, 18), Position = UDim2.new(1, -152, 0, 3),
Text = "FPS: --", BackgroundTransparency = 1, TextColor3 = C.MUTED,
Font = Enum.Font.GothamBold, TextSize = 8, TextXAlignment = Enum.TextXAlignment.Center, TextYAlignment = Enum.TextYAlignment.Center, ZIndex = 7,
}, panel) local fpsFrames, fpsElapsed = 0, 0 trackConn(RunService.RenderStepped:Connect(function(dt) local delta = tonumber(dt) or 0
if delta <= 0 then return end fpsFrames = fpsFrames + (1)
fpsElapsed = fpsElapsed + (delta) if fpsElapsed < 0.5 then return end local fps = math.floor(fpsFrames / fpsElapsed + 0.5)
fpsFrames, fpsElapsed = 0, 0 if not Perf.FpsLabel or not Perf.FpsLabel.Parent then return end
local shown = math.clamp(fps, 0, 999) Perf.FpsLabel.Text = "FPS: " .. tostring(shown)
Perf.FpsLabel.TextColor3 = (shown >= 50 and C.GREEN) or (shown >= 30 and C.YELLOW) or C.RED end))
local resetButton = New("TextButton", { Name = "HubPerfReset", Size = UDim2.new(0, 64, 0, 16), Position = UDim2.new(1, -72, 0, 3),
Text = "↩ Hoàn tác", BackgroundColor3 = C.RED, TextColor3 = C.WHITE, Font = Enum.Font.GothamBold, TextSize = 8, BorderSizePixel = 0, ZIndex = 8,
}, panel) Corner(resetButton, UDim.new(0, 5)); D.Tactile(resetButton, 0.08)
New("TextLabel", { Size = UDim2.new(1, -16, 0, 18), Position = UDim2.new(0, 8, 0, 20),
Text = "Đồ họa nhẹ giữ ánh sáng và hiệu ứng; sương mù chỉ làm mờ cảnh xa.",
BackgroundTransparency = 1, TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium,
TextSize = 8, TextWrapped = true, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, panel)
for _, item in ipairs(modeList) do local modeId = item.id
local button = New("TextButton", { Name = "HubPerf_" .. modeId, Size = UDim2.new(0, 110, 0, 18),
Position = UDim2.new(0, item.x, 0, item.y), Text = item.title .. ": TẮT", BackgroundColor3 = C.SURFACE2, TextColor3 = C.DARK,
Font = Enum.Font.GothamBold, TextSize = 8, BorderSizePixel = 0, ZIndex = 8, }, panel)
Corner(button, UDim.new(0, 5)); D.Tactile(button, 0.08) Perf.Buttons[modeId] = button
button.Activated:Connect(function() ReleaseHubFocus(); Perf.Toggle(modeId) end) end
New("TextLabel", { Size = UDim2.new(0, 96, 0, 20), Position = UDim2.new(0, 8, 0, 96),
Text = "Tầm nhìn (m)", BackgroundTransparency = 1, TextColor3 = C.MUTED,
Font = Enum.Font.GothamMedium, TextSize = 8, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, panel)
Perf.DistanceBox = New("TextBox", { Name = "HubPerfViewDistance", Size = UDim2.new(0, 56, 0, 18), Position = UDim2.new(0, 106, 0, 96),
Text = tostring(Perf.ViewDistanceMeters), ClearTextOnFocus = false, BackgroundColor3 = C.SURFACE2,
TextColor3 = C.DARK, Font = Enum.Font.GothamMedium, TextSize = 9, BorderSizePixel = 0, ZIndex = 8, }, panel)
Corner(Perf.DistanceBox, UDim.new(0, 5)) local applyRangeButton = New("TextButton", {
Size = UDim2.new(0, 62, 0, 18), Position = UDim2.new(0, 168, 0, 96), Text = "✔ Áp dụng", BackgroundColor3 = C.BLUE, TextColor3 = C.WHITE,
Font = Enum.Font.GothamBold, TextSize = 8, BorderSizePixel = 0, ZIndex = 8, }, panel)
Corner(applyRangeButton, UDim.new(0, 5)); D.Tactile(applyRangeButton, 0.08) New("TextLabel", {
Size = UDim2.new(1, -16, 0, 12), Position = UDim2.new(0, 8, 0, 120),
Text = "1 m ≈ 3,57 studs · nhập từ 5 đến 1000 m.", BackgroundTransparency = 1, TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium, TextSize = 8,
TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, panel)
Perf.Status = New("TextLabel", { Name = "HubPerfStatus", Size = UDim2.new(1, -16, 0, 34), Position = UDim2.new(0, 8, 0, 136),
Text = "Đồ họa nhẹ giữ hiệu ứng ánh sáng; CPU và tầm nhìn bật riêng.",
BackgroundTransparency = 1, TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium,
TextSize = 8, TextWrapped = true, TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top, ZIndex = 7, }, panel)
resetButton.Activated:Connect(function() ReleaseHubFocus() Perf.Reset() D.Say("↩ Đang khôi phục CPU, đồ họa và tầm nhìn gốc.", C.YELLOW)
end) applyRangeButton.Activated:Connect(function() ReleaseHubFocus() Perf.ApplyViewDistance(Perf.DistanceBox.Text)
end) trackConn(Perf.DistanceBox.FocusLost:Connect(function(enter) if enter then Perf.ApplyViewDistance(Perf.DistanceBox.Text) end end))
local function watchRoot(root) if not root then return end trackConn(root.DescendantAdded:Connect(function(instance)
if instance:IsA("Atmosphere") and Perf.Modes.range then task.defer(Perf.SyncRangeFog) end
if not Perf.Modes.cpu and not Perf.Modes.quality then return end task.defer(function()
if not Perf.Modes.cpu and not Perf.Modes.quality then return end pcall(Perf.ApplyInstance, instance) end) end))
trackConn(root.DescendantRemoving:Connect(function(instance)
if instance == Perf.RangeAtmosphere and Perf.Modes.range then task.defer(Perf.SyncRangeFog) end end)) end watchRoot(workspace)
watchRoot(game:GetService("Lighting")) trackConn(player.CharacterAdded:Connect(function(character)
task.defer(function() for _, instance in ipairs(character:GetDescendants()) do Perf.RestoreInstance(instance) end end) end))
Perf.SyncPanel() end
S.HubPanelCat = { HubPerf_Panel = "Tiện ích", HubTune_Panel = "Di chuyển", HubFly_Panel = "Di chuyển", HubSpeed_Panel = "Di chuyển",
HubHighJump_Panel = "Di chuyển", HubMove_Panel = "Di chuyển", HubSafe_Panel = "Di chuyển", HubGlow_Panel = "Tiện ích",
HubFree_Panel = "Tiện ích", HubAntiBan_Panel = "Server", } function S.SyncHubPanels() local list = D.hubList
if not list or not list.Parent then return end local cat = S.hubCat or "Tất cả"
for _, c in ipairs(list:GetChildren()) do local want = S.HubPanelCat[c.Name] if want then c.Visible = (cat == "Tất cả") or (cat == want)
end end end function S.RebuildHubList() local list = D.hubList if not list or not list.Parent then return end local stale = {}
for _, c in ipairs(list:GetChildren()) do if c:IsA("Frame") and c.Name:sub(1, 8) == "HubCard_" then stale[#stale + 1] = c end
end for _, c in ipairs(stale) do pcall(function() c:Destroy() end) end
local q = tostring(S.hubSearch or ""):lower() local cat = S.hubCat or "Tất cả" local items = {} for _, it in ipairs(S.ScriptHubList) do
local okCat = (cat == "Tất cả") or (it.cat == cat) local okQ = (q == "")
or tostring(it.name):lower():find(q, 1, true) ~= nil or tostring(it.desc or ""):lower():find(q, 1, true) ~= nil
or tostring(it.cat or ""):lower():find(q, 1, true) ~= nil if okCat and okQ then items[#items + 1] = it end end table.sort(items, function(a, b)
local fa = S.hubFavs[a.name] and 1 or 0 local fb = S.hubFavs[b.name] and 1 or 0
if fa ~= fb then return fa > fb end return (a.ord or 99) < (b.ord or 99) end) for i, it in ipairs(items) do local card = New("Frame", {
Name = "HubCard_" .. tostring(it.name), Size = UDim2.new(1, 0, 0, 48), LayoutOrder = i + 1, BackgroundColor3 = C.SURFACE, BackgroundTransparency = 0.12, BorderSizePixel = 0, ZIndex = 6,
}, list) Corner(card, UDim.new(0, 9))
Stroke(card, S.hubFavs[it.name] and C.ACCENT or C.HAIRLINE, 1)
D.Shade(card, Color3.fromRGB(255,255,255), Color3.fromRGB(188,192,205), 90)
local ico = New("TextLabel", { Size = UDim2.new(0, 28, 0, 28), Position = UDim2.new(0, 8, 0, 10), Text = it.icon,
BackgroundColor3 = C.SURFACE2, BackgroundTransparency = 0.15, TextColor3 = C.ACCENT, Font = Enum.Font.GothamBold, TextSize = 14, BorderSizePixel = 0, ZIndex = 7,
}, card) Corner(ico, UDim.new(0, 8)) D.Shade(ico, Color3.fromRGB(255,255,255), Color3.fromRGB(176,181,196), 90) Stroke(ico, C.HAIRLINE, 1)
New("TextLabel", { Size = UDim2.new(1, -196, 0, 13), Position = UDim2.new(0, 44, 0, 6),
Text = tostring(it.name) .. (S.hubFavs[it.name] and "  ⭐" or ""), BackgroundTransparency = 1, TextColor3 = C.DARK, Font = Enum.Font.GothamBold, TextSize = 10,
TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, card)
New("TextLabel", { Size = UDim2.new(1, -196, 0, 10), Position = UDim2.new(0, 44, 0, 19), Text = string.upper(tostring(it.cat or "")), BackgroundTransparency = 1,
TextColor3 = C.ACCENT, Font = Enum.Font.GothamBold, TextSize = 7, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7,
}, card) New("TextLabel", {
Size = UDim2.new(1, -196, 0, 18), Position = UDim2.new(0, 44, 0, 29), Text = tostring(it.desc or ""), BackgroundTransparency = 1, TextColor3 = C.MUTED,
Font = Enum.Font.GothamMedium, TextSize = 8, TextWrapped = true, TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top, ZIndex = 7, }, card)
local isAction = (it.action ~= nil) local runText if isAction then if it.action == "crosshair" then
runText = (S.crosshairOn and "🎯 TẮT") or "🎯 BẬT" elseif S.MoveActionState and S.MoveActionState[it.action] then
local on = false pcall(function() on = S.MoveActionState[it.action]() end) runText = tostring(it.icon) .. " " .. ((on and "TẮT") or "BẬT")
else runText = "⚡ Chạy" end else runText = "▶ Chạy" end
local runBtn = D.CardBtn(card, runText, -142, 64, isAction and C.SURFACE3 or C.GREEN) runBtn.Activated:Connect(function() ReleaseHubFocus()
if it.code then local okR = RunCode(it.code, it.name, nil, 1, 0, it.noPark == true)
D.Say((okR and "▶ đã chạy '" or "⚠️ không chạy được '") .. it.name .. "'" .. (it.noPark and " · 🪟 GUI của nó ở NGOÀI màn hình game (đúng như tab 🛠)" or "")
.. " · xem chi tiết ở tab 💻 Code", C.YELLOW) else D.Say(S.RunHubAction(it.action), C.YELLOW) end end)
if it.code then local copyBtn = D.CardBtn(card, "📋", -74, 20, C.BLUE) copyBtn.Activated:Connect(function() local did = S.CopyToClipboard(it.code)
D.Say(did and ("📋 đã copy loadstring của '" .. it.name .. "'") or "⚠️ executor này không hỗ trợ clipboard", did and C.GREEN or C.RED)
end) local saveBtn = D.CardBtn(card, "💾", -50, 20, C.PURPLE) saveBtn.Activated:Connect(function() local nm = it.name
local cnt = 1 while true do local ex = false for _, s in ipairs(scripts) do if s.name == nm then ex = true break end end if not ex then break end
cnt = cnt + (1)  nm = it.name .. " (" .. cnt .. ")" end table.insert(scripts, {name = nm, code = it.code, expanded = false})
pcall(function() if RebuildScripts then RebuildScripts() end end) pcall(function() Store.saveSoon() end)
D.Say("💾 đã lưu '" .. nm .. "' sang tab 💾 Code Đã Lưu", C.GREEN) end) end
local favBtn = D.CardBtn(card, S.hubFavs[it.name] and "⭐" or "☆", -26, 20, S.hubFavs[it.name] and C.YELLOW or C.SURFACE3)
favBtn.Activated:Connect(function() if S.hubFavs[it.name] then S.hubFavs[it.name] = nil else S.hubFavs[it.name] = true end
pcall(function() Store.saveSoon() end)
S.RebuildHubList() D.Say(S.hubFavs[it.name] and ("⭐ đã ghim '" .. it.name .. "' lên đầu") or ("☆ đã bỏ ghim '" .. it.name .. "'"), C.MUTED) end)
end pcall(function() if S.SyncHubPanels then S.SyncHubPanels() end local panelH = 0 for _, c in ipairs(list:GetChildren()) do
if c:IsA("Frame") and c.Name:sub(1, 8) ~= "HubCard_" and c.Visible ~= false then panelH = panelH + ((c.Size and c.Size.Y.Offset) or 0) + 6 end end
list.CanvasSize = UDim2.new(0, 0, 0, #items * 54 + 6 + panelH) end)
if S.SyncFlyPanel then pcall(S.SyncFlyPanel) end
if S.SyncSpeedPanel then pcall(S.SyncSpeedPanel) end
if S.SyncHighJumpPanel then pcall(S.SyncHighJumpPanel) end
if S.SyncTunePanel then pcall(S.SyncTunePanel) end
if S.RefreshMovePanel then pcall(S.RefreshMovePanel) end
if S.SyncGlowPanel then pcall(S.SyncGlowPanel) end
if S.SyncFreePanel then pcall(S.SyncFreePanel) end
if S.SyncSafePanel then pcall(S.SyncSafePanel) end
if S.SyncAntiBanPanel then pcall(S.SyncAntiBanPanel) end
if S.SyncPerfPanel then pcall(S.SyncPerfPanel) end
if #items == 0 and D.hubStatus then D.Say("🔍 không tìm thấy gì khớp '" .. tostring(S.hubSearch or "") .. "'", C.MUTED) end end
do local P = New("Frame", {
Name = "HubTune_Panel", Size = UDim2.new(1, 0, 0, 172), LayoutOrder = -4, BackgroundColor3 = C.SURFACE, BackgroundTransparency = 0.12, BorderSizePixel = 0, ZIndex = 6,
}, D.hubList) Corner(P, UDim.new(0, 10)); Stroke(P, C.HAIRLINE, 1)
D.Shade(P, Color3.fromRGB(255,255,255), Color3.fromRGB(188,192,205), 90) New("TextLabel", {
Size = UDim2.new(1, -16, 0, 16), Position = UDim2.new(0, 8, 0, 4), Text = "⚙ TUỲ CHỈNH — 🚀 Bay · 💨 Tốc độ camera · 🦘 Nhảy cao · 👟 Di chuyển", BackgroundTransparency = 1, TextColor3 = C.ACCENT, Font = Enum.Font.GothamBold, TextSize = 10,
TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, P) local function button(name, text, x, y, w, color) local b = New("TextButton", {
Name = name, Text = text, Size = UDim2.new(0, w, 0, 18), Position = UDim2.new(0, x, 0, y), BackgroundColor3 = color, TextColor3 = D.BestText(color), BorderSizePixel = 0,
Font = Enum.Font.GothamBold, TextSize = 8, ZIndex = 8, }, P) Corner(b, UDim.new(0, 5)); D.Tactile(b, 0.08) return b end
local function box(name, x, y, val) local b = New("TextBox", {
Name = name, Size = UDim2.new(0, 48, 0, 18), Position = UDim2.new(0, x, 0, y), Text = tostring(val), ClearTextOnFocus = false, BackgroundColor3 = C.SURFACE2,
TextColor3 = C.DARK, Font = Enum.Font.GothamMedium, TextSize = 9, BorderSizePixel = 0, ZIndex = 8, }, P) Corner(b, UDim.new(0, 5)) return b end
local function lab(txt, x, y, w) New("TextLabel", {
Size = UDim2.new(0, w, 0, 18), Position = UDim2.new(0, x, 0, y), Text = txt, BackgroundTransparency = 1, TextColor3 = C.MUTED,
Font = Enum.Font.GothamMedium, TextSize = 9, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, P) end
local flyBtn = button("TuneFly", "🚀 Bay: TẮT", 8, 24, 96, C.GRAY) local flyBox = box("TuneFlySpeed", 108, 24, MV.flySpeed)
local flyApply = button("TuneFlyApply", "✔", 160, 24, 26, C.GREEN) local flyStop = button("TuneFlyStop", "⏹", 190, 24, 26, C.RED)
local spdBtn = button("TuneSprint", "💨 Tốc độ: TẮT", 8, 50, 96, C.GRAY) local spdBox = box("TuneSprintSpeed", 108, 50, MV.sprintSpeed)
local spdApply = button("TuneSprintApply", "✔", 160, 50, 26, C.GREEN) local spdStop = button("TuneSprintStop", "⏹", 190, 50, 26, C.RED)
local hjBtn = button("TuneHighJump", "🦘 Nhảy cao: TẮT", 8, 76, 96, C.GRAY) local hjBox = box("TuneHighJumpSpeed", 108, 76, MV.highJumpSpeed)
local hjApply = button("TuneHighJumpApply", "✔", 160, 76, 26, C.GREEN) local hjStop = button("TuneHighJumpStop", "⏹", 190, 76, 26, C.RED)
lab("👟 Chạy", 226, 24, 48) local wsBox = box("TuneWalkSpeed", 276, 24, (MV.speedMode == "x") and ("x" .. tostring(MV.speedMul)) or tostring(MV.walkSpeed))
lab("🦘 Lực nhảy", 226, 50, 70) local jpBox = box("TuneJumpPower", 296, 50, MV.jumpPower)
local mvApply = button("TuneMoveApply", "✔ Di chuyển", 226, 76, 102, C.GREEN)
local status = New("TextLabel", { Name = "TuneStatus", Size = UDim2.new(1, -16, 0, 28), Position = UDim2.new(0, 8, 0, 102),
Text = "", BackgroundTransparency = 1, TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium, TextSize = 9, TextWrapped = true, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7,
}, P) New("TextLabel", {
Size = UDim2.new(1, -16, 0, 32), Position = UDim2.new(0, 8, 0, 134), Text = "💡 ✔ = áp tốc độ dòng đó. 👟 gõ x3 = theo game ×3, gõ số = cố định. Bay tới người chơi và Safe Fly ở khung ⚙ bên dưới.",
BackgroundTransparency = 1, TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium, TextSize = 8, TextWrapped = true, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, P)
local function paintToggle(b, on, label) b.Text = label .. (on and "BẬT" or "TẮT") D.SetBg(b, on and C.GREEN or C.GRAY) end
local function focused() return UserInputService:GetFocusedTextBox() end function S.SyncTunePanel()
if not (P and P.Parent) then return end paintToggle(flyBtn, MV.fly, "🚀 Bay: ") paintToggle(spdBtn, MV.sprint, "💨 Tốc độ: ")
paintToggle(hjBtn, MV.highJump, "🦘 Nhảy cao: ") local tb = focused()
if tb ~= flyBox then flyBox.Text = tostring(MV.flySpeed) end if tb ~= spdBox then spdBox.Text = tostring(MV.sprintSpeed) end
if tb ~= hjBox then hjBox.Text = tostring(MV.highJumpSpeed) end if tb ~= wsBox then
wsBox.Text = (MV.speedMode == "x") and ("x" .. tostring(MV.speedMul)) or tostring(MV.walkSpeed) end
if tb ~= jpBox then jpBox.Text = tostring(MV.jumpPower) end status.Text = (MV.Status and MV.Status()) or "" end
flyBtn.Activated:Connect(function() ReleaseHubFocus(); D.Say(S.RunHubAction("fly"), C.YELLOW) end) spdBtn.Activated:Connect(function() ReleaseHubFocus(); D.Say(S.RunHubAction("camspeed"), C.YELLOW) end)
hjBtn.Activated:Connect(function() ReleaseHubFocus(); D.Say(S.RunHubAction("highjump"), C.YELLOW) end) flyStop.Activated:Connect(function()
ReleaseHubFocus(); MV.SetFly(false); S.Rebuild() D.Say("🚀 Bay: TẮT", C.YELLOW) end) spdStop.Activated:Connect(function()
ReleaseHubFocus(); MV.SetSprint(false); S.Rebuild() D.Say("💨 Tốc độ theo camera: TẮT", C.YELLOW) end)
hjStop.Activated:Connect(function() ReleaseHubFocus(); MV.SetHighJump(false); S.Rebuild() D.Say("🦘 Nhảy cao: TẮT", C.YELLOW) end)
local function applyFly() ReleaseHubFocus()
local ok, result = MV.SetFlySpeed(flyBox.Text) D.Say(ok and ("💨 Tốc độ bay: " .. tostring(result)) or ("⚠️ " .. tostring(result)), ok and C.GREEN or C.YELLOW)
S.SyncTunePanel() end local function applySprint() ReleaseHubFocus() local ok, result = MV.SetSprintSpeed(spdBox.Text)
D.Say(ok and ("💨 Tốc độ chạy camera: " .. tostring(result)) or ("⚠️ " .. tostring(result)), ok and C.GREEN or C.YELLOW) S.SyncTunePanel()
end local function applyHj() ReleaseHubFocus() local ok, result = MV.SetHighJumpSpeed(hjBox.Text)
D.Say(ok and ("💨 Tốc độ nhảy cao: " .. tostring(result)) or ("⚠️ " .. tostring(result)), ok and C.GREEN or C.YELLOW) S.SyncTunePanel() end
flyApply.Activated:Connect(applyFly) spdApply.Activated:Connect(applySprint)
hjApply.Activated:Connect(applyHj) flyBox.FocusLost:Connect(function(enter) if enter then applyFly() end end)
spdBox.FocusLost:Connect(function(enter) if enter then applySprint() end end) hjBox.FocusLost:Connect(function(enter) if enter then applyHj() end end)
mvApply.Activated:Connect(function() ReleaseHubFocus()
local wmul = tostring(wsBox.Text or ""):match("^[xX×]%s*([%d%.]+)") if wmul then MV.speedMode = "x"
MV.speedMul = mvClamp(tonumber(wmul), 1, 20) else local w = tonumber(wsBox.Text) if w then
MV.speedMode = "num" MV.walkSpeed = mvClamp(w, 0, 500, 16) end end
local j = tonumber(jpBox.Text) if j then MV.jumpPower = mvClamp(j, 0, 500, 50) end pcall(function() if MV.speed then MV.ApplyChar() end end)
if S.RefreshMovePanel then pcall(S.RefreshMovePanel) end S.SyncTunePanel()
D.Say(string.format("⚙ di chuyển: chạy %s · lực nhảy %d", (MV.speedMode == "x") and ("×" .. tostring(MV.speedMul)) or tostring(MV.walkSpeed),
MV.jumpPower), C.GREEN) end)
S.tuneBtns = {panel = P, fly = flyBtn, sprint = spdBtn, highjump = hjBtn, flySpeed = flyBox, sprintSpeed = spdBox, highJumpSpeed = hjBox, walk = wsBox, jump = jpBox} S.SyncTunePanel() end
do local P = New("Frame", {
Name = "HubAntiBan_Panel", Size = UDim2.new(1, 0, 0, 88), LayoutOrder = 3, BackgroundColor3 = C.SURFACE, BackgroundTransparency = 0.12, BorderSizePixel = 0, ZIndex = 6,
}, D.hubList) Corner(P, UDim.new(0, 10)); Stroke(P, C.HAIRLINE, 1)
D.Shade(P, Color3.fromRGB(255,255,255), Color3.fromRGB(188,192,205), 90) New("TextLabel", { Size = UDim2.new(1, -16, 0, 16), Position = UDim2.new(0, 8, 0, 4),
Text = "🔐 ANTI BAN — tự hop server khác khi bị nghi / định ban", BackgroundTransparency = 1, TextColor3 = C.ACCENT, Font = Enum.Font.GothamBold, TextSize = 10,
TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, P) local function abtn(name, text, x, y, w, color) local b = New("TextButton", {
Name = name, Text = text, Size = UDim2.new(0, w, 0, 18), Position = UDim2.new(0, x, 0, y), BackgroundColor3 = color, TextColor3 = D.BestText(color), BorderSizePixel = 0, Font = Enum.Font.GothamBold, TextSize = 8, ZIndex = 8,
}, P) Corner(b, UDim.new(0, 5)); D.Tactile(b, 0.08) return b end
local onBtn = abtn("AntiBanOn", "🔐 TẮT", 8, 24, 76, C.GRAY) local hopBtn = abtn("AntiBanHopNow", "🔀 Hop ngay", 88, 24, 76, C.PURPLE)
New("TextLabel", { Size = UDim2.new(0, 52, 0, 18), Position = UDim2.new(0, 170, 0, 24), Text = "⏳ chờ s", BackgroundTransparency = 1, TextColor3 = C.MUTED,
Font = Enum.Font.GothamMedium, TextSize = 9, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, P)
local cdBox = New("TextBox", { Name = "AntiBanCooldown", Size = UDim2.new(0, 44, 0, 18), Position = UDim2.new(0, 222, 0, 24),
Text = tostring(S.AntiBan.cooldown), ClearTextOnFocus = false, BackgroundColor3 = C.SURFACE2, TextColor3 = C.DARK, Font = Enum.Font.GothamMedium, TextSize = 9, BorderSizePixel = 0, ZIndex = 8,
}, P) Corner(cdBox, UDim.new(0, 5)) local st = New("TextLabel", {
Name = "AntiBanStatus", Size = UDim2.new(1, -16, 0, 32), Position = UDim2.new(0, 8, 0, 50), Text = "", BackgroundTransparency = 1, TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium,
TextSize = 9, TextWrapped = true, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, P) function S.SyncAntiBanPanel() pcall(function()
onBtn.Text = S.AntiBan.on and "🔐 BẬT" or "🔐 TẮT" D.SetBg(onBtn, S.AntiBan.on and C.GREEN or C.GRAY) if UserInputService:GetFocusedTextBox() ~= cdBox then
cdBox.Text = tostring(S.AntiBan.cooldown or 10) end
st.Text = S.AntiBanStatus() .. " · kick/ban/error → hop. Bay/xuyên bị reset tốc độ 3 lần/4s → hop. Không vào lại đúng server cũ." end)
end onBtn.Activated:Connect(function() ReleaseHubFocus() S.RunHubAction("antiban") S.SyncAntiBanPanel()
end) hopBtn.Activated:Connect(function() ReleaseHubFocus() if not S.AntiBan.on then S.AntiBanSet(true) end
local n = tonumber(cdBox.Text) if n then S.AntiBan.cooldown = math.clamp(n, 3, 60) end S.AntiBanHop("manual") S.SyncAntiBanPanel() end)
cdBox.FocusLost:Connect(function() local n = tonumber(cdBox.Text) if n then S.AntiBan.cooldown = math.clamp(n, 3, 60) end S.SyncAntiBanPanel()
end) S.SyncAntiBanPanel() end do local P = New("Frame", {
Name = "HubFly_Panel", Size = UDim2.new(1, 0, 0, 154), LayoutOrder = -1, BackgroundColor3 = C.SURFACE, BackgroundTransparency = 0.12, BorderSizePixel = 0, ZIndex = 6,
}, D.hubList) Corner(P, UDim.new(0, 10)); Stroke(P, C.HAIRLINE, 1)
D.Shade(P, Color3.fromRGB(255,255,255), Color3.fromRGB(188,192,205), 90) New("TextLabel", {
Size = UDim2.new(1, -16, 0, 16), Position = UDim2.new(0, 8, 0, 4), Text = "🚀 BAY THEO CAMERA — điều khiển tay", BackgroundTransparency = 1,
TextColor3 = C.ACCENT, Font = Enum.Font.GothamBold, TextSize = 10, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, P)
local function button(name, text, x, y, w, color) local b = New("TextButton", {
Name = name, Text = text, Size = UDim2.new(0, w, 0, 19), Position = UDim2.new(0, x, 0, y), BackgroundColor3 = color, TextColor3 = D.BestText(color), BorderSizePixel = 0,
Font = Enum.Font.GothamBold, TextSize = 8, ZIndex = 8, }, P) Corner(b, UDim.new(0, 5)); D.Tactile(b, 0.08) return b
end local onBtn = button("FlyToggle", "🚀 Bay: TẮT", 8, 24, 88, C.GRAY) local ncBtn = button("FlyNoclip", "🧱 Xuyên tường: TẮT", 100, 24, 242, C.GRAY)
New("TextLabel", {
Size = UDim2.new(0, 128, 0, 20), Position = UDim2.new(0, 8, 0, 50), Text = "💨 Tốc độ (1–2000)", BackgroundTransparency = 1, TextColor3 = C.MUTED,
Font = Enum.Font.GothamMedium, TextSize = 9, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, P)
local speed = New("TextBox", { Name = "FlySpeed", Size = UDim2.new(0, 52, 0, 19), Position = UDim2.new(0, 136, 0, 50),
Text = tostring(MV.flySpeed), ClearTextOnFocus = false, BackgroundColor3 = C.SURFACE2, TextColor3 = C.DARK, Font = Enum.Font.GothamMedium, TextSize = 9, BorderSizePixel = 0, ZIndex = 8,
}, P) Corner(speed, UDim.new(0, 5)) local apply = button("FlySpeedApply", "✔ Áp dụng", 192, 50, 76, C.GREEN)
local stop = button("FlyStop", "⏹ Dừng bay", 272, 50, 84, C.RED) New("TextLabel", {
Size = UDim2.new(1, -16, 0, 46), Position = UDim2.new(0, 8, 0, 84), Text = "WASD / điều khiển di chuyển của game: bay theo camera cả lên và xuống. Nhìn xuống 60° + tiến tới = bay xuống 60°. "
.. "Space: lên; Shift/Ctrl: xuống. Thả điều khiển: đứng lơ lửng. " .. "🧱 là công tắc riêng, Bay không tự bật/tắt xuyên tường.",
BackgroundTransparency = 1, TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium, TextSize = 9, TextWrapped = true, TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top, ZIndex = 7,
}, P) local status = New("TextLabel", { Name = "FlyPanelStatus", Size = UDim2.new(1, -16, 0, 16), Position = UDim2.new(0, 8, 0, 134),
Text = "", BackgroundTransparency = 1, TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium, TextSize = 9, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7,
}, P) function S.SyncFlyPanel() local function paint(b, on, label) b.Text = label .. (on and "BẬT" or "TẮT")
D.SetBg(b, on and C.GREEN or C.GRAY) end paint(onBtn, MV.fly, "🚀 Bay: ") paint(ncBtn, MV.noclip, "🧱 Xuyên tường: ")
if UserInputService:GetFocusedTextBox() ~= speed then speed.Text = tostring(MV.flySpeed) end status.Text = MV.fly and ("🚀 Đang bay theo camera · tốc độ " .. tostring(MV.flySpeed) .. " · thả phím để dừng tại chỗ")
or "🚀 Đã tắt bay · 🧱 xuyên tường " .. (MV.noclip and "BẬT" or "TẮT") end
onBtn.Activated:Connect(function() ReleaseHubFocus(); D.Say(S.RunHubAction("fly"), C.YELLOW) end) ncBtn.Activated:Connect(function() ReleaseHubFocus(); D.Say(S.RunHubAction("noclip"), C.YELLOW) end)
local function applySpeed()
local value = speed.Text ReleaseHubFocus()
local ok, result = MV.SetFlySpeed(value) if ok then D.Say("💨 Tốc độ bay: " .. tostring(result), C.GREEN) else D.Say("⚠️ " .. tostring(result), C.YELLOW) end
S.SyncFlyPanel() end apply.Activated:Connect(applySpeed) speed.FocusLost:Connect(function(enter) if enter then applySpeed() end end)
stop.Activated:Connect(function() ReleaseHubFocus(); MV.SetFly(false); S.Rebuild()
D.Say("🚀 Bay: TẮT — xuyên tường giữ nguyên theo công tắc 🧱", C.YELLOW) end)
S.flyBtns = {on = onBtn, noclip = ncBtn, speed = speed, apply = apply, stop = stop, panel = P} S.SyncFlyPanel() end
do local P = New("Frame", {
Name = "HubSpeed_Panel", Size = UDim2.new(1, 0, 0, 130), LayoutOrder = -2, BackgroundColor3 = C.SURFACE, BackgroundTransparency = 0.12, BorderSizePixel = 0, ZIndex = 6,
}, D.hubList) Corner(P, UDim.new(0, 10)); Stroke(P, C.HAIRLINE, 1)
D.Shade(P, Color3.fromRGB(255,255,255), Color3.fromRGB(188,192,205), 90) New("TextLabel", {
Size = UDim2.new(1, -16, 0, 16), Position = UDim2.new(0, 8, 0, 4), Text = "💨 TỐC ĐỘ THEO CAMERA — mặt đất, nhảy/rơi theo game", BackgroundTransparency = 1, TextColor3 = C.ACCENT, Font = Enum.Font.GothamBold, TextSize = 10,
TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, P) local function button(name, text, x, y, w, color) local b = New("TextButton", {
Name = name, Text = text, Size = UDim2.new(0, w, 0, 19), Position = UDim2.new(0, x, 0, y), BackgroundColor3 = color, TextColor3 = D.BestText(color), BorderSizePixel = 0,
Font = Enum.Font.GothamBold, TextSize = 8, ZIndex = 8, }, P) Corner(b, UDim.new(0, 5)); D.Tactile(b, 0.08) return b end
local onBtn = button("SpeedToggle", "💨 Tốc độ: TẮT", 8, 24, 112, C.GRAY) local stop = button("SpeedStop", "⏹ Dừng", 124, 24, 68, C.RED)
New("TextLabel", { Size = UDim2.new(0, 128, 0, 20), Position = UDim2.new(0, 8, 0, 50),
Text = "💨 Tốc độ (1–2000)", BackgroundTransparency = 1, TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium, TextSize = 9, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, P)
local speed = New("TextBox", { Name = "SprintSpeed", Size = UDim2.new(0, 52, 0, 19), Position = UDim2.new(0, 136, 0, 50),
Text = tostring(MV.sprintSpeed), ClearTextOnFocus = false, BackgroundColor3 = C.SURFACE2, TextColor3 = C.DARK, Font = Enum.Font.GothamMedium, TextSize = 9, BorderSizePixel = 0, ZIndex = 8,
}, P) Corner(speed, UDim.new(0, 5))
local apply = button("SpeedApply", "✔ Áp dụng", 192, 50, 76, C.GREEN) New("TextLabel", { Size = UDim2.new(1, -16, 0, 32), Position = UDim2.new(0, 8, 0, 82),
Text = "WASD / joystick game: chạy theo hướng camera trên mặt đất. Nhảy = Space của game. " .. "Rơi theo trọng lực game. Không xuyên tường, không nút ảo.",
BackgroundTransparency = 1, TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium, TextSize = 9, TextWrapped = true, TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top, ZIndex = 7,
}, P) local status = New("TextLabel", {
Name = "SpeedPanelStatus", Size = UDim2.new(1, -16, 0, 14), Position = UDim2.new(0, 8, 0, 112), Text = "", BackgroundTransparency = 1, TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium, TextSize = 9, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7,
}, P) function S.SyncSpeedPanel() onBtn.Text = "💨 Tốc độ: " .. (MV.sprint and "BẬT" or "TẮT") D.SetBg(onBtn, MV.sprint and C.GREEN or C.GRAY)
if UserInputService:GetFocusedTextBox() ~= speed then speed.Text = tostring(MV.sprintSpeed) end status.Text = MV.sprint
and ("💨 Đang chạy theo camera · tốc độ " .. tostring(MV.sprintSpeed) .. " · nhảy/rơi theo game") or "💨 Đã tắt · va chạm tường + nhảy + trọng lực = của game" end
onBtn.Activated:Connect(function() ReleaseHubFocus(); D.Say(S.RunHubAction("camspeed"), C.YELLOW) end) local function applySpeed()
local value = speed.Text ReleaseHubFocus()
local ok, result = MV.SetSprintSpeed(value) if ok then D.Say("💨 Tốc độ chạy: " .. tostring(result), C.GREEN)
else D.Say("⚠️ " .. tostring(result), C.YELLOW) end S.SyncSpeedPanel() end
apply.Activated:Connect(applySpeed) speed.FocusLost:Connect(function(enter) if enter then applySpeed() end end)
stop.Activated:Connect(function() ReleaseHubFocus(); MV.SetSprint(false); S.Rebuild() D.Say("💨 Tốc độ theo camera: TẮT", C.YELLOW) end)
S.speedBtns = {on = onBtn, speed = speed, apply = apply, stop = stop, panel = P} S.SyncSpeedPanel() end do local P = New("Frame", {
Name = "HubHighJump_Panel", Size = UDim2.new(1, 0, 0, 118), LayoutOrder = -3, BackgroundColor3 = C.SURFACE, BackgroundTransparency = 0.12, BorderSizePixel = 0, ZIndex = 6,
}, D.hubList) Corner(P, UDim.new(0, 10)); Stroke(P, C.HAIRLINE, 1)
D.Shade(P, Color3.fromRGB(255,255,255), Color3.fromRGB(188,192,205), 90) New("TextLabel", {
Size = UDim2.new(1, -16, 0, 16), Position = UDim2.new(0, 8, 0, 4), Text = "🦘 NHẢY CAO — BẬT/TẮT độc lập (kiểu 👤 Né người)", BackgroundTransparency = 1, TextColor3 = C.ACCENT, Font = Enum.Font.GothamBold, TextSize = 10,
TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, P) local function button(name, text, x, y, w, color) local b = New("TextButton", {
Name = name, Text = text, Size = UDim2.new(0, w, 0, 19), Position = UDim2.new(0, x, 0, y), BackgroundColor3 = color, TextColor3 = D.BestText(color), BorderSizePixel = 0,
Font = Enum.Font.GothamBold, TextSize = 8, ZIndex = 8, }, P) Corner(b, UDim.new(0, 5)); D.Tactile(b, 0.08) return b end
local onBtn = button("HighJumpToggle", "🦘 Nhảy cao: TẮT", 8, 24, 126, C.GRAY) local stop = button("HighJumpStop", "⏹ Dừng", 138, 24, 68, C.RED)
New("TextLabel", { Size = UDim2.new(0, 148, 0, 20), Position = UDim2.new(0, 8, 0, 50),
Text = "💨 Tốc độ nhảy (1–500)", BackgroundTransparency = 1, TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium, TextSize = 9, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7,
}, P) local speed = New("TextBox", {
Name = "HighJumpSpeed", Size = UDim2.new(0, 52, 0, 19), Position = UDim2.new(0, 148, 0, 50), Text = tostring(MV.highJumpSpeed), ClearTextOnFocus = false, BackgroundColor3 = C.SURFACE2, TextColor3 = C.DARK, Font = Enum.Font.GothamMedium, TextSize = 9, BorderSizePixel = 0, ZIndex = 8,
}, P) Corner(speed, UDim.new(0, 5)) local apply = button("HighJumpApply", "✔ Áp dụng", 204, 50, 76, C.GREEN) New("TextLabel", {
Size = UDim2.new(1, -16, 0, 16), Position = UDim2.new(0, 8, 0, 82), Text = "BẬT rồi bấm Space: nhảy cao theo số trên. Rơi theo game. Không xuyên tường, không nút ảo.",
BackgroundTransparency = 1, TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium, TextSize = 9, TextWrapped = true, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, P)
local status = New("TextLabel", { Name = "HighJumpStatus", Size = UDim2.new(1, -16, 0, 14), Position = UDim2.new(0, 8, 0, 100),
Text = "", BackgroundTransparency = 1, TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium, TextSize = 9, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7,
}, P) function S.SyncHighJumpPanel()
onBtn.Text = "🦘 Nhảy cao: " .. (MV.highJump and "BẬT" or "TẮT") D.SetBg(onBtn, MV.highJump and C.GREEN or C.GRAY)
if UserInputService:GetFocusedTextBox() ~= speed then speed.Text = tostring(MV.highJumpSpeed) end status.Text = MV.highJump and ("🦘 Đang nhảy cao · tốc độ " .. tostring(MV.highJumpSpeed) .. " · rơi theo trọng lực game")
or "🦘 Đã tắt · nhảy = của game (🦘 vô hạn vẫn độc lập)" end
onBtn.Activated:Connect(function() ReleaseHubFocus(); D.Say(S.RunHubAction("highjump"), C.YELLOW) end) local function applySpeed()
local value = speed.Text ReleaseHubFocus()
local ok, result = MV.SetHighJumpSpeed(value) if ok then D.Say("💨 Tốc độ nhảy cao: " .. tostring(result), C.GREEN)
else D.Say("⚠️ " .. tostring(result), C.YELLOW) end S.SyncHighJumpPanel() end
apply.Activated:Connect(applySpeed) speed.FocusLost:Connect(function(enter) if enter then applySpeed() end end)
stop.Activated:Connect(function() ReleaseHubFocus(); MV.SetHighJump(false); S.Rebuild() D.Say("🦘 Nhảy cao: TẮT", C.YELLOW) end)
S.highJumpBtns = {on = onBtn, speed = speed, apply = apply, stop = stop, panel = P} S.SyncHighJumpPanel() end do local PH = 180
local P = New("Frame", { Name = "HubMove_Panel", Size = UDim2.new(1, 0, 0, PH), LayoutOrder = 0,
BackgroundColor3 = C.SURFACE, BackgroundTransparency = 0.12, BorderSizePixel = 0, ZIndex = 6, }, D.hubList)
Corner(P, UDim.new(0, 10)) Stroke(P, C.HAIRLINE, 1) D.Shade(P, Color3.fromRGB(255, 255, 255), Color3.fromRGB(188, 192, 205), 90)
local function title(txt) New("TextLabel", {
Size = UDim2.new(1, -16, 0, 14), Position = UDim2.new(0, 8, 0, 4), Text = txt, BackgroundTransparency = 1, TextColor3 = C.ACCENT,
Font = Enum.Font.GothamBold, TextSize = 10, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, P) end
local function lab(txt, x, y, w) New("TextLabel", { Size = UDim2.new(0, w, 0, 18), Position = UDim2.new(0, x, 0, y),
Text = txt, BackgroundTransparency = 1, TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium, TextSize = 9,
TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, P) end local function box(x, y, w, val)
local b = New("TextBox", { Size = UDim2.new(0, w, 0, 18), Position = UDim2.new(0, x, 0, y), Text = tostring(val), ClearTextOnFocus = false,
BackgroundColor3 = C.SURFACE2, BackgroundTransparency = 0.1, TextColor3 = C.DARK, PlaceholderColor3 = C.GRAY, Font = Enum.Font.GothamMedium, TextSize = 9,
TextXAlignment = Enum.TextXAlignment.Center, BorderSizePixel = 0, ZIndex = 7, }, P) Corner(b, UDim.new(0, 5)) Stroke(b, C.BORDER, 1) return b end
local function act(txt, x, y, w, color) local b = New("TextButton", { Size = UDim2.new(0, w, 0, 18), Position = UDim2.new(0, x, 0, y),
Text = txt, BackgroundColor3 = color or C.SURFACE3, BackgroundTransparency = 0.08, TextColor3 = D.BestText(color or C.SURFACE3), Font = Enum.Font.GothamBold,
TextSize = 8, BorderSizePixel = 0, ZIndex = 8, }, P) Corner(b, UDim.new(0, 5)) D.Tactile(b, 0.08)
return b end local function say(msg, good) D.Say(msg, good and C.GREEN or C.RED) end title("⚙ Tuỳ chỉnh di chuyển (áp dụng ngay)")
lab("🚀 Bay", 8, 22, 52) local flyIn = box(62, 22, 44, S.Move.flySpeed)
lab("👟 Chạy", 114, 22, 50) local wsIn = box(166, 22, 40, (S.Move.speedMode == "x") and ("x" .. tostring(S.Move.speedMul)) or tostring(S.Move.walkSpeed))
lab("🦘 Nhảy", 214, 22, 46) local jpIn = box(262, 22, 40, S.Move.jumpPower) local ap1 = act("✔", 308, 22, 24, C.GREEN)
lab("0=auto tốc độ bay người", 8, 46, 140) local speedPlayerBox = box(150, 46, 44, S.Move.playerFlySpeed or 0)
local applyPlayerSpeedBtn = act("✔ Tốc bay người", 200, 46, 94, C.GREEN)
local upBtn  = act("⬆ Nâng", 8, 70, 54, C.BLUE) local dnBtn  = act("⬇ Hạ", 66, 70, 48, C.BLUE)
local stopBtn = act("🛑 Tắt hết", 118, 70, 64, C.RED) local st = New("TextLabel", {
Size = UDim2.new(1, -200, 0, 18), Position = UDim2.new(0, 190, 0, 70), Text = S.Move.Status(), BackgroundTransparency = 1, TextColor3 = C.MUTED,
Font = Enum.Font.GothamMedium, TextSize = 9, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, P)
ap1.Activated:Connect(function() ReleaseHubFocus()
local f = tonumber(flyIn.Text); local w = tonumber(wsIn.Text); local j = tonumber(jpIn.Text) if f then
S.Move.flySpeed = (f >= 1 and f <= 2000) and f or S.Move.flySpeed S.Move.SyncFlyHud()
end local wmul = tostring(wsIn.Text or ""):match("^[xX×]%s*([%d%.]+)") if wmul then S.Move.speedMode = "x"
S.Move.speedMul  = mvClamp(tonumber(wmul), 1, 20) elseif w then S.Move.speedMode = "num"
S.Move.walkSpeed = (w >= 1 and w <= 500) and w or S.Move.walkSpeed end
if j then S.Move.jumpPower = (j >= 0 and j <= 500) and j or S.Move.jumpPower end flyIn.Text = tostring(S.Move.flySpeed)
wsIn.Text  = (S.Move.speedMode == "x") and ("x" .. tostring(S.Move.speedMul)) or tostring(S.Move.walkSpeed) jpIn.Text  = tostring(S.Move.jumpPower)
pcall(function() if S.Move.speed then S.Move.ApplyChar() end end) say(string.format("⚙ đã áp dụng: bay %d · chạy %s · nhảy %d%s",
S.Move.flySpeed, (S.Move.speedMode == "x") and ("×" .. tostring(S.Move.speedMul) .. " (theo game)") or tostring(S.Move.walkSpeed),
S.Move.jumpPower, (S.Move.speedMode == "x" and S.Move.speed) and (" = " .. tostring(S.Move.WantSpeed())) or ""), true) end)
upBtn.Activated:Connect(function() ReleaseHubFocus()
local ok, what = S.Move.Nudge(2.5) say(ok and ("⬆ đã nâng " .. tostring(what) .. " lên 2.5") or "⬆ bật Bay trước đã", ok == true)
st.Text = S.Move.Status() end) dnBtn.Activated:Connect(function() ReleaseHubFocus()
local ok, what = S.Move.Nudge(-2.5) say(ok and ("⬇ đã hạ " .. tostring(what) .. " xuống 2.5") or "⬇ bật Bay trước đã", ok == true)
st.Text = S.Move.Status() end) stopBtn.Activated:Connect(function() ReleaseHubFocus()
D.Say(S.RunHubAction("movestop"), C.YELLOW) st.Text = S.Move.Status() end) local pcBtn local TXT_PASS_ON  = "🧲 Đẩy xuyên khi kẹt: BẬT"
local TXT_PASS_OFF = "🧲 Đẩy xuyên khi kẹt: TẮT" local function paintPass()
local on = (S.Move.ncPass ~= false) pcBtn.Text = on and TXT_PASS_ON or TXT_PASS_OFF
pcBtn.BackgroundColor3 = on and C.GREEN or C.GRAY pcBtn.TextColor3 = D.BestText(pcBtn.BackgroundColor3)
end pcBtn = act(TXT_PASS_ON, 8, 100, 168, C.GREEN) S.Move._passBtn = pcBtn pcBtn.Activated:Connect(function()
ReleaseHubFocus() S.Move.ncPass = (S.Move.ncPass == false)
paintPass() say(S.Move.ncPass and "🧲 tự đẩy xuyên: BẬT" or "🧲 tự đẩy xuyên: TẮT", true) end)
local flyPlayerBtn = act("🚀 Bay tới người gần nhất", 184, 100, 150, C.ACCENT) local stopPlayerFlyBtn = act("⏹ Dừng bay người", 340, 100, 110, C.RED)
local function paintGlass() local pFlying = S.Move._playerFlyActive == true
flyPlayerBtn.Text = pFlying and ("🚀 Đang bay tới " .. tostring(S.Move._playerFlyTarget and S.Move._playerFlyTarget.Name or "?")) or "🚀 Bay tới người gần nhất" flyPlayerBtn.BackgroundColor3 = pFlying and C.GREEN or C.ACCENT
flyPlayerBtn.TextColor3 = D.BestText(flyPlayerBtn.BackgroundColor3) if speedPlayerBox then speedPlayerBox.Text = tostring(S.Move.playerFlySpeed or 0) end
end flyPlayerBtn.Activated:Connect(function() ReleaseHubFocus() local target = nil if S.Loc and S.Loc.Nearest then target = S.Loc.Nearest() end
if not target then say("⚠️ không có người chơi nào để bay tới", false) return end local ok, res = S.Move.FlyToPlayer(target)
st.Text = S.Move.Status() paintGlass()
if S.Loc and S.Loc.RefreshList then pcall(S.Loc.RefreshList) end say(ok and ("🚀 đang bay tới " .. tostring(target.Name)) or ("⚠️ " .. tostring(res)), ok==true)
end) stopPlayerFlyBtn.Activated:Connect(function() ReleaseHubFocus() S.Move.StopPlayerFly() st.Text = S.Move.Status()
paintGlass() if S.Loc and S.Loc.RefreshList then pcall(S.Loc.RefreshList) end say("⏹ đã dừng bay tới người", true) end)
applyPlayerSpeedBtn.Activated:Connect(function() ReleaseHubFocus() local v = tonumber(tostring(speedPlayerBox.Text or ""):match("%-?%d+%.?%d*"))
if v == nil then v = S.Move.playerFlySpeed or 0 end S.Move.SetPlayerFlySpeed(v)
speedPlayerBox.Text = tostring(S.Move.playerFlySpeed or 0) st.Text = S.Move.Status()
paintGlass() local sp = S.Move.GetPlayerFlySpeed and S.Move.GetPlayerFlySpeed() or S.Move.playerFlySpeed or 0
if (tonumber(S.Move.playerFlySpeed) or 0) == 0 then say(string.format("🚀 tốc độ bay tới người: auto (%g = tốc độ game)", sp), true) else
say("🚀 tốc độ bay tới người: " .. tostring(sp), true) end
if S.Loc and S.Loc.RefreshList then pcall(S.Loc.RefreshList) end if S.SyncLocPanel then pcall(S.SyncLocPanel) end
end) paintGlass() S.Move._glassBtns = { flyPlayer = flyPlayerBtn, stopPlayer = stopPlayerFlyBtn, speedPlayerBox = speedPlayerBox, paint = paintGlass }
function S.RefreshMovePanel() pcall(function() st.Text = S.Move.Status() flyIn.Text = tostring(S.Move.flySpeed)
wsIn.Text = (S.Move.speedMode == "x") and ("x" .. tostring(S.Move.speedMul)) or tostring(S.Move.walkSpeed) jpIn.Text = tostring(S.Move.jumpPower)
paintPass() if S.Move._glassBtns and S.Move._glassBtns.paint then pcall(S.Move._glassBtns.paint) end end) end end S.Loc = {
on = false,
solo = false,
target = nil,
maxDist = 0,
_gui = nil, _items = {}, _friend = {}, _downAt = {}, _acc = 0, _listAcc = 0, _bound = false, } local LOC = S.Loc
local LOCC = { normal = { fill = Color3.fromRGB(0, 255, 100),   out = Color3.fromRGB(255, 255, 255), txt = Color3.fromRGB(0, 255, 100) },
friend = { fill = Color3.fromRGB(255, 105, 180), out = Color3.fromRGB(255, 182, 193), txt = Color3.fromRGB(255, 182, 193) }, down   = { fill = Color3.fromRGB(200, 0, 0),     out = Color3.fromRGB(255, 100, 100), txt = Color3.fromRGB(255, 100, 100) },
fdown  = { fill = Color3.fromRGB(138, 43, 226),  out = Color3.fromRGB(200, 150, 255), txt = Color3.fromRGB(200, 150, 255) }, } local function locRound(n) return math.floor((tonumber(n) or 0) + 0.5) end
local function locTime(sec)
local v = math.max(0, math.floor(tonumber(sec) or 0)) return string.format("%02d:%02d", math.floor(v / 60), v % 60) end function S.Loc.Root()
local c = player.Character return (c and c:FindFirstChild("HumanoidRootPart")) or nil end function S.Loc.CharOf(p)
local c = p and p.Character if not c then return nil end local r = c:FindFirstChild("HumanoidRootPart")
local h = c:FindFirstChildOfClass("Humanoid") if r and h then return c, r, h end return nil end
function S.Loc.IsFriend(p) local uid = p and p.UserId
if uid == nil then return false end if LOC._friend[uid] == nil then local ok, res = pcall(function() return player:IsFriendsWith(uid) end)
LOC._friend[uid] = (ok and res == true) or false end return LOC._friend[uid] == true end function S.Loc.IsDown(h) if not h then return false end
if h.PlatformStand == true then return true end if (tonumber(h.Health) or 1) <= 0 then return true end
return false end function S.Loc.NoteDown(p, down) if p == nil then return end if down then
if not LOC._downAt[p] then LOC._downAt[p] = tick() end else LOC._downAt[p] = nil end
end function S.Loc.DownSecs(p) local st = LOC._downAt[p] if not st then return 0 end return tick() - st
end function S.Loc.Dist(p) local r = LOC.Root() local _, pr = LOC.CharOf(p)
if not r or not pr then return nil end return (r.Position - pr.Position).Magnitude end function S.Loc.Nearest() local best, bd = nil, nil
for _, p in ipairs(Players:GetPlayers()) do if p ~= player then local d = LOC.Dist(p) if d and (bd == nil or d < bd) then best, bd = p, d end
if not best then best = p end end end return best end
function S.Loc.Wanted(p) if p == nil or p == player then return false end if LOC.solo then return LOC.target == p end return LOC.on == true
end function S.Loc.Gui()
if LOC._gui and LOC._gui.Parent then return LOC._gui end LOC._gui = New("ScreenGui", { Name = "BC_LocEsp", ResetOnSpawn = false,
ZIndexBehavior = Enum.ZIndexBehavior.Sibling, }, gui) return LOC._gui end
function S.Loc.Kill(p) local it = LOC._items[p] if not it then return end pcall(function() if it.hl then it.hl:Destroy() end end)
pcall(function() if it.bb then it.bb:Destroy() end end) LOC._items[p] = nil end
function S.Loc.Clear() for p, _ in pairs(LOC._items) do LOC.Kill(p) end pcall(function() if LOC._gui then LOC._gui:ClearAllChildren() end end) end
function S.Loc.Make(p) local c, r = LOC.CharOf(p) if not c then return end LOC.Kill(p) local g = LOC.Gui()
local hl = New("Highlight", { Name = tostring(p.Name) .. "_HL", Adornee = c,
FillColor = LOCC.normal.fill, FillTransparency = 0.55, OutlineColor = LOCC.normal.out, OutlineTransparency = 0,
}, g) local bb = New("BillboardGui", {
Name = tostring(p.Name) .. "_BB", Adornee = r, Size = UDim2.new(0, 170, 0, 46), StudsOffset = Vector3.new(0, 3.6, 0), AlwaysOnTop = true,
}, g) local lbl = New("TextLabel", {
Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1, TextColor3 = LOCC.normal.txt, Font = Enum.Font.GothamBold, TextSize = 11,
TextStrokeColor3 = Color3.fromRGB(0, 0, 0), TextStrokeTransparency = 0.35, }, bb) LOC._items[p] = { hl = hl, bb = bb, lbl = lbl } LOC.TickOne(p)
end function S.Loc.TickOne(p) local it = LOC._items[p] if not it then return end local c, r, h = LOC.CharOf(p)
if not c then LOC.Kill(p); return end local down, fr = LOC.IsDown(h), LOC.IsFriend(p)
S.Loc.NoteDown(p, down) local col = down and (fr and LOCC.fdown or LOCC.down) or (fr and LOCC.friend or LOCC.normal)
local r0 = LOC.Root() local dist = (r0 and r) and (r0.Position - r.Position).Magnitude or nil local far = (LOC.maxDist > 0 and dist ~= nil and dist > LOC.maxDist)
it.hl.FillColor = col.fill it.hl.OutlineColor = col.out it.lbl.TextColor3 = col.txt it.hl.Enabled = not far it.bb.Enabled = not far local mid = {}
if down then mid[#mid + 1] = "☠️ Hạ gục ⏱ " .. locTime(LOC.DownSecs(p)) end if h then mid[#mid + 1] = string.format("❤️ %d/%d", locRound(h.Health or 0), locRound(h.MaxHealth or 100)) end mid[#mid + 1] = dist and string.format("📏 %dm", locRound(dist)) or "📏 --m"
it.lbl.Text = p.Name .. (fr and "  💗 Bạn Bè" or "") .. "\n" .. table.concat(mid, " · ")
end function S.Loc.Tick() if S.PagePerf and S.PagePerf.IsMainVisible() then
local pt = D and D.playerTab if pt and not S.PagePerf.IsTabVisible(pt) then return end
end for p, _ in pairs(LOC._items) do if not LOC.Wanted(p) then LOC.Kill(p) else pcall(LOC.TickOne, p) end
end if not (LOC.on or LOC.solo) then return end local ok, list = pcall(function() return Players:GetPlayers() end)
if not ok or not list then return end for _, p in ipairs(list) do
if LOC.Wanted(p) and not LOC._items[p] and LOC.CharOf(p) then pcall(function() LOC.Make(p) end) end end end function S.Loc.OnPerfTick() end
function S.Loc.Bind(on) if on and not LOC._bound then LOC._bound = true pcall(function()
RunService:BindToRenderStep("BC_Loc", Enum.RenderPriority.Camera.Value - 2, function(dt) LOC._acc = (LOC._acc or 0) + (tonumber(dt) or 0.016)
local interval = 0.35 if S.PagePerf then if not S.PagePerf.IsMainVisible() then interval = 3.0
else local pt = D and D.playerTab if pt and not S.PagePerf.IsTabVisible(pt) then interval = 1.5 end end
end if LOC._acc < interval then return end LOC._acc = 0
pcall(function() LOC.Tick() end) LOC._listAcc = (LOC._listAcc or 0) + interval if LOC._listAcc >= 1.5 then LOC._listAcc = 0
if not S.PagePerf or S.PagePerf.ShouldRunForPlayerTab() then if LOC.RefreshList then pcall(LOC.RefreshList) end end end end)
end) elseif (not on) and LOC._bound then LOC._bound = false pcall(function() RunService:UnbindFromRenderStep("BC_Loc") end)
end end function S.Loc.Refresh() if not (LOC.on or LOC.solo) then LOC.Clear()
LOC.Bind(false) return end for p, _ in pairs(LOC._items) do if not LOC.Wanted(p) then LOC.Kill(p) end end
local ok, list = pcall(function() return Players:GetPlayers() end) if ok and list then
for _, p in ipairs(list) do if LOC.Wanted(p) and not LOC._items[p] and LOC.CharOf(p) then pcall(function() LOC.Make(p) end) end end
end LOC.Bind(true) end function S.Loc.Set(on) LOC.on = (on == true) LOC.Refresh() return LOC.on end function S.Loc.SetSolo(on)
LOC.solo = (on == true) if not LOC.solo then LOC.target = nil end LOC.Refresh() return LOC.solo
end function S.Loc.SetTarget(p) LOC.target = (p ~= nil and p ~= player) and p or nil LOC.solo = (LOC.target ~= nil)
LOC.Refresh() return LOC.target end function S.Loc.SetMaxDist(n) LOC.maxDist = math.max(0, tonumber(n) or 0)
pcall(LOC.Tick) return LOC.maxDist end function S.Loc.StopAll()
LOC.on = false; LOC.solo = false; LOC.target = nil LOC._downAt = {} LOC.Clear() LOC.Bind(false) return true
end function S.Loc.Status() if not (LOC.on or LOC.solo) then return "📍 định vị: đang TẮT (chưa hiện ai)" end local n = 0
for _ in pairs(LOC._items) do n = n + 1 end local t = {}
if LOC.on then t[#t + 1] = "👁️ tất cả" end if LOC.solo then t[#t + 1] = "🎯 lẻ: " .. tostring(LOC.target and LOC.target.Name or "chưa chọn") end if LOC.maxDist > 0 then t[#t + 1] = string.format("📏 ≤ %dm", locRound(LOC.maxDist)) end
return string.format("📍 đang định vị %d người (%s)", n, table.concat(t, " · ")) end do local function hookLoc(p)
if p == player then return nil end trackConn(p.CharacterAdded:Connect(function() if LOC.Wanted(p) then pcall(function() LOC.Make(p) end) end end))
trackConn(p.CharacterRemoving:Connect(function() LOC.Kill(p) end)) if LOC.Wanted(p) then pcall(function() LOC.Make(p) end) end end
for _, p in ipairs(Players:GetPlayers()) do if p ~= player then pcall(hookLoc, p) end end trackConn(Players.PlayerAdded:Connect(function(p) pcall(hookLoc, p) end))
trackConn(Players.PlayerRemoving:Connect(function(p) LOC._friend[p.UserId] = nil LOC._downAt[p] = nil if LOC.target == p then LOC.target = nil end
LOC.Kill(p) end)) end do
local tab = AddTab("Người Chơi", "👥", 4)
D.playerTab = tab function S.OpenPlayerTab() for i, tc in ipairs(tabContent) do if tc == D.playerTab then SwitchTab(i) return true end end
return false end New("TextLabel", { Name = "PlayerTitle", Size = UDim2.new(1, -16, 0, 18), Position = UDim2.new(0, 8, 0, 8),
Text = "👥 NGƯỜI CHƠI — ĐỊNH VỊ & XEM NGƯỜI CHƠI", BackgroundTransparency = 1,
TextColor3 = C.ACCENT, Font = Enum.Font.GothamBold, TextSize = 11, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7,
}, tab) New("TextLabel", { Name = "PlayerNote",
Size = UDim2.new(1, -16, 0, 14), Position = UDim2.new(0, 8, 0, 26), Text = "📍 = thấy người khác xuyên tường · 👣 = bám camera theo 1 người để xem họ đang làm gì."
.. "  🌳 = định vị MỌI vật theo tên (VD: cây) và bám theo vật đang di chuyển." .. "  🧱 = đặt/quản lý tấm kính cố định và bay tới từng tấm ở khung bên dưới.",
BackgroundTransparency = 1, TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium, TextSize = 8, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7,
}, tab) D.playerY = 46 end S.Spec = {
on = false, target = nil,
auto = true,
follow = true, dist = 12, height = 3.2, moving = false, jumping = false, falling = false, speed = 0, act = "",
lastMove = 0, lastJump = 0, lastFall = 0, _prev = nil, _oldType = nil, _oldSubject = nil, _bound = false, _ui = {}, } local SP = S.Spec
local function spRound(n) return math.floor((tonumber(n) or 0) + 0.5) end function S.Spec.CamOn() local cam = workspace.CurrentCamera
if not cam then return end if SP._oldType == nil then pcall(function() local ct = cam.CameraType
if ct ~= Enum.CameraType.Scriptable then SP._oldType = ct else SP._oldType = Enum.CameraType.Custom end
end) end if SP._oldSubject == nil then pcall(function() SP._oldSubject = cam.CameraSubject end)
end if SP._oldType then _G.BananaCatHub_SpecCam = SP._oldType end pcall(function() cam.CameraType = Enum.CameraType.Scriptable end) end
function S.Spec.CamOff() local cam = workspace.CurrentCamera pcall(function()
if cam then if SP._oldType and SP._oldType ~= Enum.CameraType.Scriptable then cam.CameraType = SP._oldType else
cam.CameraType = Enum.CameraType.Custom end end end) pcall(function() if not cam then return end local char = player and player.Character
local hum = char and char:FindFirstChildOfClass("Humanoid") local root = char and char:FindFirstChild("HumanoidRootPart")
if hum then cam.CameraSubject = hum elseif SP._oldSubject then pcall(function() cam.CameraSubject = SP._oldSubject end)
end if root then local pos = root.Position
cam.CFrame = CFrame.new(pos + Vector3.new(0, 3.2, 12), pos + Vector3.new(0, 1.5, 0)) cam.Focus = CFrame.new(pos) end end)
SP._oldType = nil SP._oldSubject = nil _G.BananaCatHub_SpecCam = nil end function S.Spec.Acting(p)
if not p or not SP.on then return "—" end local c, r, h = S.Loc.CharOf(p)
if not c then return "⏳ đang chờ nhân vật (đang hồi sinh?)" end if S.Loc.IsDown(h) then
local t = S.Loc.DownSecs(p) return "☠️ đang BỊ HẠ GỤC" .. (t > 0 and (" (⏱ " .. string.format("%02d:%02d", math.floor(t / 60), math.floor(t % 60)) .. ")") or "")
end if h and h.Sit == true then return "🪑 đang NGỒI" end
if SP.jumping then return "🦘 đang NHẢY" end if SP.falling then return "🪂 đang RƠI" end local sp = tonumber(SP.speed) or 0
if sp > 0.6 then local base = (h and tonumber(h.WalkSpeed)) or 16
if sp >= base * 1.25 then return "🏃 đang CHẠY NHANH (" .. spRound(sp) .. " m/s)" elseif sp >= base * 0.6 then return "🚶 đang CHẠY (" .. spRound(sp) .. " m/s)"
else return "🐌 đang đi CHẬM (" .. spRound(sp) .. " m/s)" end end return "🧍 đang ĐỨNG YÊN" end
function S.Spec.Step(dt) if not (SP.on and SP.target) then return end local p = SP.target if p.Parent == nil then SP.target = nil
if SP.auto then local n = S.Loc.Nearest() if n then pcall(function() S.Spec.Set(n) end) end end
if not SP.target then pcall(function() S.Spec.Stop() end) end pcall(function() if S.Spec.RefreshList then S.Spec.RefreshList() end end) return
end local c, r = S.Loc.CharOf(p) if not c or not r then if SP.auto then
local n = S.Loc.Nearest() if n and n ~= p and S.Loc.CharOf(n) then SP.target = n SP._prev = nil
SP.lastMove, SP.lastJump, SP.lastFall = 0, 0, 0 S.Spec.RefreshList() end end SP.moving, SP.jumping, SP.falling, SP.speed = false, false, false, 0
S.Loc.NoteDown(p, false) S.Spec.Sync() return end
S.Loc.NoteDown(p, S.Loc.IsDown(c:FindFirstChildOfClass("Humanoid"))) local pos = r.Position local now = tick()
local pv = SP._prev if pv and pv.p == p then local d = math.max(now - pv.t, 0.001) local dx, dz = pos.X - pv.x, pos.Z - pv.z
local sp = math.sqrt(dx * dx + dz * dz) / d if sp > 0.6 then SP.lastMove = now; SP.speed = sp end
local dy = pos.Y - pv.y if dy > 0.8 then SP.lastJump = now end
if dy < -0.8 then SP.lastFall = now end end SP.moving = (SP.lastMove > 0) and (now - SP.lastMove < 0.5) or false
SP.jumping = (SP.lastJump > 0) and (now - SP.lastJump < 0.9) or false SP.falling = (SP.lastFall > 0) and (now - SP.lastFall < 0.6) or false
if not SP.moving then SP.speed = 0 end SP._prev = { p = p, t = now, x = pos.X, y = pos.Y, z = pos.Z }
if SP.follow then local cam = workspace.CurrentCamera
if cam then local look = r.CFrame.LookVector local want = pos - look * SP.dist + Vector3.new(0, SP.height, 0)
cam.CFrame = CFrame.lookAt(want, pos + Vector3.new(0, 1.5, 0))
end end SP._acc = (SP._acc or 0) + (tonumber(dt) or 0.016) if SP._acc >= 0.25 then
SP._acc = 0 S.Spec.Sync() if SP.follow then local cam = workspace.CurrentCamera
if cam and cam.CameraType ~= Enum.CameraType.Scriptable then pcall(function() cam.CameraType = Enum.CameraType.Scriptable end) end end end
end function S.Spec.Bind(on) if on and not SP._bound then SP._bound = true
pcall(function() RunService:BindToRenderStep("BC_Spec", Enum.RenderPriority.Camera.Value - 3, function(dt) pcall(S.Spec.Step, dt) end) end)
elseif (not on) and SP._bound then SP._bound = false pcall(function() RunService:UnbindFromRenderStep("BC_Spec") end) end
end function S.Spec.Set(p)
if p == nil or p == player or p.Parent == nil then SP.on = false; SP.target = nil; SP._prev = nil SP.moving, SP.jumping, SP.falling, SP.speed = false, false, false, 0
SP.lastMove, SP.lastJump, SP.lastFall = 0, 0, 0 S.Spec.Bind(false) S.Spec.CamOff() S.Spec.Sync()
return false end SP.target, SP.on, SP._prev = p, true, nil SP.lastMove, SP.lastJump, SP.lastFall = 0, 0, 0
SP.moving, SP.jumping, SP.falling, SP.speed = false, false, false, 0 S.Spec.Bind(true) if SP.follow then S.Spec.CamOn() end
S.Spec.Sync() return true end function S.Spec.Stop() return S.Spec.Set(nil) end function S.Spec.SetFollow(on) SP.follow = (on == true)
if SP.follow and SP.on then S.Spec.CamOn() else S.Spec.CamOff() end S.Spec.Sync() return SP.follow
end function S.Spec.SetAuto(on) SP.auto = (on == true); S.Spec.Sync(); return SP.auto end
function S.Spec.SetDist(n) SP.dist = mvClamp(n, 3, 200); S.Spec.Sync(); return SP.dist end function S.Spec.SetHeight(n) SP.height = mvClamp(n, -30, 60); S.Spec.Sync(); return SP.height end
function S.Spec.Status() if not (SP.on and SP.target) then return "👣 xem người chơi: đang TẮT (camera của bạn bình thường)" end
return "👣 đang xem " .. tostring(SP.target.Name) .. " — " .. S.Spec.Acting(SP.target) end
do trackConn(Players.PlayerRemoving:Connect(function(p) if SP.target == p then SP.target = nil if SP.on and SP.auto then
local n = S.Loc.Nearest() if n then pcall(function() S.Spec.Set(n) end) end end if not SP.target then pcall(function() S.Spec.Stop() end) end
pcall(function() S.Spec.RefreshList() end) end end)) trackConn(player.CharacterAdded:Connect(function() task.spawn(function()
task.wait(0.5) if not SP.on then pcall(function() S.Spec.CamOff() end) pcall(function()
local cam = workspace.CurrentCamera local char = player.Character
local hum = char and char:FindFirstChildOfClass("Humanoid") if cam and hum then cam.CameraSubject = hum
cam.CameraType = Enum.CameraType.Custom end end) else
pcall(function() S.Spec.CamOn() end) end pcall(function() if S.Spec.RefreshList then S.Spec.RefreshList() end end) end)
end)) pcall(function() trackConn(workspace:GetPropertyChangedSignal("CurrentCamera"):Connect(function() task.spawn(function() task.wait(0.1)
if SP.on and SP.follow then pcall(function() S.Spec.CamOn() end) end end) end)) end) end do local g = New("ScreenGui", {
Name = "BC_SpecHud", ResetOnSpawn = false, ZIndexBehavior = Enum.ZIndexBehavior.Sibling, Enabled = false, }, gui) local F = New("Frame", {
Name = "SpecBox", Size = UDim2.new(0, 250, 0, 92), Position = UDim2.new(0, 10, 0, 10), BackgroundColor3 = C.SURFACE, BackgroundTransparency = 0.12, BorderSizePixel = 0, ZIndex = 20,
}, g) Corner(F, UDim.new(0, 10)) Stroke(F, C.ACCENT, 1.2)
D.Shade(F, Color3.fromRGB(255, 255, 255), Color3.fromRGB(188, 192, 205), 90) SP._ui.gui = g SP._ui.title = New("TextLabel", { Name = "title",
Size = UDim2.new(1, -46, 0, 14), Position = UDim2.new(0, 8, 0, 4), Text = "👣 ĐANG XEM", BackgroundTransparency = 1, TextColor3 = C.ACCENT,
Font = Enum.Font.GothamBold, TextSize = 10, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 21, }, F)
SP._ui.who = New("TextLabel", { Name = "who",
Size = UDim2.new(1, -16, 0, 16), Position = UDim2.new(0, 8, 0, 19), Text = "", BackgroundTransparency = 1, TextColor3 = C.DARK,
Font = Enum.Font.GothamBold, TextSize = 11, TextXAlignment = Enum.TextXAlignment.Left, TextTruncate = Enum.TextTruncate.AtEnd, ZIndex = 21,
}, F) SP._ui.info = New("TextLabel", { Name = "info",
Size = UDim2.new(1, -16, 0, 14), Position = UDim2.new(0, 8, 0, 37), Text = "", BackgroundTransparency = 1, TextColor3 = C.MUTED,
Font = Enum.Font.GothamMedium, TextSize = 9, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 21, }, F) SP._ui.act = New("TextLabel", {
Name = "act", Size = UDim2.new(1, -16, 0, 16), Position = UDim2.new(0, 8, 0, 52), Text = "", BackgroundTransparency = 1, TextColor3 = C.GREEN,
Font = Enum.Font.GothamBold, TextSize = 11, TextXAlignment = Enum.TextXAlignment.Left, TextTruncate = Enum.TextTruncate.AtEnd, ZIndex = 21,
}, F) local stopBtn = New("TextButton", { Name = "stopBtn", Size = UDim2.new(0, 24, 0, 18), Position = UDim2.new(1, -30, 0, 4),
Text = "🚫", BackgroundColor3 = C.RED, TextColor3 = D.BestText(C.RED), Font = Enum.Font.GothamBold, TextSize = 9, BorderSizePixel = 0, ZIndex = 22, }, F)
Corner(stopBtn, UDim.new(0, 5)) D.Tactile(stopBtn, 0.1) stopBtn.Activated:Connect(function() pcall(function() S.Spec.Stop() end)
pcall(function() S.Spec.RefreshList() end) pcall(S.Rebuild) end) local followBtnHud = New("TextButton", { Name = "followBtn",
Size = UDim2.new(0, 40, 0, 18), Position = UDim2.new(1, -74, 0, 4), Text = "🎥 Bám", BackgroundColor3 = C.GREEN, TextColor3 = D.BestText(C.GREEN),
Font = Enum.Font.GothamBold, TextSize = 8, BorderSizePixel = 0, ZIndex = 22, }, F)
Corner(followBtnHud, UDim.new(0, 5)) D.Tactile(followBtnHud, 0.1)
followBtnHud.Activated:Connect(function() pcall(function() S.Spec.SetFollow(not SP.follow) end) pcall(function() S.Spec.RefreshList() end)
end) SP._ui.followBtn = followBtnHud SP._ui.note = New("TextLabel", { Name = "note",
Size = UDim2.new(1, -16, 0, 16), Position = UDim2.new(0, 8, 0, 70), Text = "💡 bấm 🚫 để trả camera về cho bạn", BackgroundTransparency = 1, TextColor3 = C.GRAY,
Font = Enum.Font.GothamMedium, TextSize = 8, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 21, }, F) end function S.Spec.Sync()
local u = SP._ui if not u then return end local on = (SP.on and SP.target ~= nil) pcall(function() if u.gui then u.gui.Enabled = on end end)
if not on then return end pcall(function() if u.followBtn then
u.followBtn.Text = SP.follow and "🎥 Bám" or "🎥 Thôi" u.followBtn.BackgroundColor3 = SP.follow and C.GREEN or C.SURFACE3
u.followBtn.TextColor3 = D.BestText(u.followBtn.BackgroundColor3) end end) local p = SP.target
local c, r, h = S.Loc.CharOf(p) local fr = S.Loc.IsFriend(p) local nm = tostring(p.Name) .. (fr and "  💗 Bạn Bè" or "")
local dist = S.Loc.Dist(p) local lines = {}
if h then lines[#lines + 1] = string.format("❤️ %d/%d", spRound(h.Health or 0), spRound(h.MaxHealth or 100)) end lines[#lines + 1] = dist and ("📏 " .. spRound(dist) .. "m") or "📏 --m"
lines[#lines + 1] = "💨 " .. spRound(SP.speed) .. " m/s" pcall(function()
if u.who then u.who.Text = "👣 " .. nm end if u.info then u.info.Text = table.concat(lines, "   ") end if u.act then
local txt = S.Spec.Acting(p) u.act.Text = txt u.act.TextColor3 = S.Loc.IsDown(h) and Color3.fromRGB(255, 100, 100) or C.GREEN end
if u.title then u.title.Text = "👣 ĐANG XEM" .. (SP.follow and "" or " (KHÔNG bám)") .. (SP.auto and " · 🔄" or "") end end) end
do local PH = 386 local P = New("Frame", { Name = "HubLoc_Panel", Size = UDim2.new(1, -16, 0, PH), Position = UDim2.new(0, 8, 0, D.playerY or 46),
LayoutOrder = 1, BackgroundColor3 = C.SURFACE, BackgroundTransparency = 0.12, BorderSizePixel = 0, ZIndex = 6,
}, D.playerTab) D.playerY = (D.playerY or 46) + PH + 8
Corner(P, UDim.new(0, 10)) Stroke(P, C.HAIRLINE, 1) D.Shade(P, Color3.fromRGB(255, 255, 255), Color3.fromRGB(188, 192, 205), 90)
New("TextLabel", { Size = UDim2.new(1, -16, 0, 14), Position = UDim2.new(0, 8, 0, 4),
Text = "📍👣 ĐỊNH VỊ & XEM NGƯỜI CHƠI (XUYÊN TƯỜNG · SPECTATOR · 🚀 BAY TỚI)", BackgroundTransparency = 1,
TextColor3 = C.ACCENT, Font = Enum.Font.GothamBold, TextSize = 10, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, P)
local function act(txt, x, y, w, color, name) local b = New("TextButton", { Name = name or "Button",
Size = UDim2.new(0, w, 0, 18), Position = UDim2.new(0, x, 0, y), Text = txt, BackgroundColor3 = color, TextColor3 = D.BestText(color),
Font = Enum.Font.GothamBold, TextSize = 8, BorderSizePixel = 0, ZIndex = 8, }, P)
Corner(b, UDim.new(0, 5)) D.Shade(b, Color3.fromRGB(255, 255, 255), Color3.fromRGB(182, 187, 201), 90) D.Tactile(b, 0.08) return b
end local function lab(txt, x, y, w) New("TextLabel", { Size = UDim2.new(0, w, 0, 18), Position = UDim2.new(0, x, 0, y),
Text = txt, BackgroundTransparency = 1, TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium, TextSize = 9,
TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, P) end local allBtn     = act("👁️ Tất Cả", 8, 22, 68, C.GRAY, "LocAllBtn")
local soloBtn    = act("🎯 Lẻ", 80, 22, 62, C.GRAY, "LocSoloBtn") local stopBtn    = act("🚫 Tắt ĐV", 146, 22, 56, C.SURFACE3, "LocStopBtn")
local flyNearBtn = act("🚀 Gần nhất", 206, 22, 74, C.ACCENT, "LocFlyNearBtn")
local flyStopBtn = act("⏹️ Dừng bay", 284, 22, 68, C.SURFACE3, "LocFlyStopBtn")
local watchBtn    = act("👣 Bám theo", 8, 44, 88, C.GRAY, "SpecWatchBtn")
local followBtn   = act("🎥 Bám: BẬT", 100, 44, 78, C.GREEN, "SpecFollowBtn")
local autoBtn     = act("🔄 Tự chuyển", 182, 44, 72, C.GRAY, "SpecAutoBtn")
local stopSpecBtn = act("🚫 Dừng xem", 258, 44, 74, C.RED, "SpecStopBtn") lab("📏 Xa nhất:", 8, 66, 56) local distIn = New("TextBox", {
Name = "LocDistIn", Size = UDim2.new(0, 44, 0, 18), Position = UDim2.new(0, 64, 0, 66), Text = "0", ClearTextOnFocus = false,
BackgroundColor3 = C.SURFACE2, BackgroundTransparency = 0.1, TextColor3 = C.DARK, PlaceholderColor3 = C.GRAY, Font = Enum.Font.GothamMedium, TextSize = 9,
TextXAlignment = Enum.TextXAlignment.Center, BorderSizePixel = 0, ZIndex = 7, }, P) Corner(distIn, UDim.new(0, 5))
lab("m · 🚀 Tốc độ bay:", 112, 66, 92) local flySpeedIn = New("TextBox", { Name = "LocFlySpeedIn",
Size = UDim2.new(0, 44, 0, 18), Position = UDim2.new(0, 206, 0, 66), Text = "0", ClearTextOnFocus = false,
BackgroundColor3 = C.SURFACE2, BackgroundTransparency = 0.1, TextColor3 = C.DARK, PlaceholderColor3 = C.GRAY, Font = Enum.Font.GothamMedium, TextSize = 9,
TextXAlignment = Enum.TextXAlignment.Center, BorderSizePixel = 0, ZIndex = 7, }, P)
Corner(flySpeedIn, UDim.new(0, 5)) local flySpeedApply = act("✅ Đặt", 254, 66, 42, C.GREEN, "LocFlySpeedApplyBtn") lab("(0=auto)", 300, 66, 60)
lab("🎥 Cam lùi:", 8, 88, 58) local specDistIn = New("TextBox", { Name = "SpecDistIn",
Size = UDim2.new(0, 42, 0, 18), Position = UDim2.new(0, 66, 0, 88), Text = "12", ClearTextOnFocus = false,
BackgroundColor3 = C.SURFACE2, BackgroundTransparency = 0.1, TextColor3 = C.DARK, PlaceholderColor3 = C.GRAY, Font = Enum.Font.GothamMedium, TextSize = 9,
TextXAlignment = Enum.TextXAlignment.Center, BorderSizePixel = 0, ZIndex = 7, }, P) Corner(specDistIn, UDim.new(0, 5))
lab("m · ⬆ Cao:", 112, 88, 54) local specHiIn = New("TextBox", { Name = "SpecHeightIn",
Size = UDim2.new(0, 42, 0, 18), Position = UDim2.new(0, 166, 0, 88), Text = "3.2", ClearTextOnFocus = false,
BackgroundColor3 = C.SURFACE2, BackgroundTransparency = 0.1, TextColor3 = C.DARK, PlaceholderColor3 = C.GRAY, Font = Enum.Font.GothamMedium, TextSize = 9,
TextXAlignment = Enum.TextXAlignment.Center, BorderSizePixel = 0, ZIndex = 7, }, P)
Corner(specHiIn, UDim.new(0, 5)) local specApplyBtn = act("✔ Áp dụng Cam", 212, 88, 84, C.SURFACE3, "SpecApplyBtn")
local searchIn = New("TextBox", { Name = "LocSearchIn", Size = UDim2.new(1, -16, 0, 20), Position = UDim2.new(0, 8, 0, 110),
Text = "", PlaceholderText = "🔍 Tìm tên người chơi (Định vị · Xem camera · Bay tới)...", ClearTextOnFocus = false, PlaceholderColor3 = C.GRAY, BackgroundColor3 = C.SURFACE2, BackgroundTransparency = 0.1,
TextColor3 = C.DARK, Font = Enum.Font.GothamMedium, TextSize = 9, TextXAlignment = Enum.TextXAlignment.Left, BorderSizePixel = 0, ZIndex = 7,
}, P) Corner(searchIn, UDim.new(0, 5)) New("UIPadding", { PaddingLeft = UDim.new(0, 6) }, searchIn)
local list = New("ScrollingFrame", { Name = "LocList", Size = UDim2.new(1, -16, 0, 196), Position = UDim2.new(0, 8, 0, 134),
BackgroundTransparency = 1, BorderSizePixel = 0, ScrollBarThickness = 4, CanvasSize = UDim2.new(0, 0, 0, 0), ZIndex = 7,
}, P) New("UIListLayout", { Padding = UDim.new(0, 4), SortOrder = Enum.SortOrder.LayoutOrder }, list)
New("TextLabel", { Size = UDim2.new(1, -16, 0, 48), Position = UDim2.new(0, 8, 0, 334),
Text = "💡 Bấm TÊN = định vị lẻ người đó · 👣 Xem = gắn camera xem họ đang làm gì (chỉ đổi camera, nhân vật bạn đứng yên) · 🚀 Bay tới = bay xuyên tường bám theo mục tiêu. 🟢 thường · 💗 bạn bè · 🔴 bị hạ gục.",
TextWrapped = true, BackgroundTransparency = 1, TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium, TextSize = 8, TextXAlignment = Enum.TextXAlignment.Left,
TextYAlignment = Enum.TextYAlignment.Top, ZIndex = 7, }, P) local function paint() allBtn.Text = LOC.on and "👁️ Tất Cả: BẬT" or "👁️ Tất Cả"
allBtn.BackgroundColor3 = LOC.on and C.GREEN or C.GRAY allBtn.TextColor3 = D.BestText(allBtn.BackgroundColor3)
soloBtn.Text = LOC.solo and ("🎯 " .. tostring(LOC.target and LOC.target.Name or "?")) or "🎯 Lẻ"
soloBtn.BackgroundColor3 = LOC.solo and C.PURPLE or C.GRAY soloBtn.TextColor3 = D.BestText(soloBtn.BackgroundColor3) local mv = S.Move
local sp = mv and mv.playerFlySpeed or 0 if tonumber(sp) == 0 then
flySpeedIn.Text = "0" flySpeedIn.PlaceholderText = tostring(mv and mv.GetPlayerFlySpeed and mv.GetPlayerFlySpeed() or 16)
else flySpeedIn.Text = tostring(sp) end local active = mv and mv._playerFlyActive
flyNearBtn.BackgroundColor3 = active and C.GREEN or C.ACCENT flyNearBtn.TextColor3 = D.BestText(flyNearBtn.BackgroundColor3)
flyNearBtn.Text = active and ("🚀 " .. tostring(mv._playerFlyTarget and mv._playerFlyTarget.Name or "?")) or "🚀 Gần nhất"
local specNm = (SP.on and SP.target) and tostring(SP.target.Name) or nil watchBtn.Text = specNm and ("👣 " .. specNm) or "👣 Bám theo"
watchBtn.BackgroundColor3 = SP.on and C.GREEN or C.GRAY watchBtn.TextColor3 = D.BestText(watchBtn.BackgroundColor3)
followBtn.Text = SP.follow and "🎥 Bám: BẬT" or "🎥 Bám: TẮT" followBtn.BackgroundColor3 = SP.follow and C.GREEN or C.SURFACE3
followBtn.TextColor3 = D.BestText(followBtn.BackgroundColor3) autoBtn.BackgroundColor3 = SP.auto and C.PURPLE or C.SURFACE3
autoBtn.TextColor3 = D.BestText(autoBtn.BackgroundColor3) specDistIn.Text, specHiIn.Text = tostring(SP.dist), tostring(SP.height)
end local function buildRowText(p, nm, c, h, fr, down) local sub = {} if fr then sub[#sub + 1] = "💗 Bạn Bè" end
if down then sub[#sub + 1] = "☠️ " .. locTime(LOC.DownSecs(p)) end if c then
sub[#sub + 1] = (h and string.format("❤️%d", spRound(h.Health or 0)) or "❤️?") else sub[#sub + 1] = "⏳ chờ NV" end
local prefix = ((LOC.target == p) and "🎯 " or "") .. ((SP.on and SP.target == p) and "👣 " or "")
return prefix .. nm .. (#sub > 0 and ("  " .. table.concat(sub, "  ")) or "") end
LOC.RefreshList = function(force) if not (list and list.Parent) then return end
local term = tostring(searchIn.Text or ""):lower() local ok, players = pcall(function() return Players:GetPlayers() end)
if not ok or not players then return end local want = {} local sig = term for _, p in ipairs(players) do
if p ~= player then local nm = tostring(p.Name) if term == "" or nm:lower():find(term, 1, true) then want[#want + 1] = p
local _, _, h0 = LOC.CharOf(p) sig = sig .. "|" .. nm .. (LOC.IsFriend(p) and "F" or "") .. (LOC.IsDown(h0) and "D" or "")
.. (LOC.target == p and "T" or "") .. ((SP.on and SP.target == p) and "S" or "") end end
end local cache = LOC._rows if (force == true) or (sig ~= LOC._rowSig) or (cache == nil) then LOC._rowSig = sig
LOC._rows = {} cache = LOC._rows for _, c in ipairs(list:GetChildren()) do if not c:IsA("UIListLayout") then pcall(function() c:Destroy() end) end
end local order = 0 for _, p in ipairs(want) do local nm = tostring(p.Name)
order = order + 1 local c, _, h = LOC.CharOf(p)
local fr, down = LOC.IsFriend(p), LOC.IsDown(h) local col = down and (fr and LOCC.fdown or LOCC.down) or (fr and LOCC.friend or LOCC.normal)
local isSpecThis = (SP.on and SP.target == p) local row = New("Frame", {
Name = "PlayerRow_" .. nm, Size = UDim2.new(1, 0, 0, 26), LayoutOrder = order,
BackgroundColor3 = isSpecThis and C.SURFACE3 or C.SURFACE2, BackgroundTransparency = isSpecThis and 0.08 or 0.25,
BorderSizePixel = 0, ZIndex = 8, }, list) Corner(row, UDim.new(0, 6)) local b = New("TextButton", {
Name = "PlayerNameBtn", Size = UDim2.new(1, -184, 1, 0), Position = UDim2.new(0, 6, 0, 0),
Text = buildRowText(p, nm, c, h, fr, down), BackgroundTransparency = 1, TextColor3 = col.txt, Font = Enum.Font.GothamBold, TextSize = 9,
TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 9, }, row) b.Activated:Connect(function() ReleaseHubFocus()
if LOC.target == p then LOC.SetSolo(false) if S.Spec and S.Spec.on and S.Spec.target == p then pcall(function() S.Spec.Stop() end) end else
LOC.SetTarget(p) if S.Spec and S.Spec.on then pcall(function() S.Spec.Set(p) end) end end paint()
if LOC.RefreshList then LOC.RefreshList(true) end S.Rebuild() end) local d = LOC.Dist(p)
local distLbl = New("TextLabel", { Size = UDim2.new(0, 50, 1, 0), Position = UDim2.new(1, -180, 0, 0),
Text = d and string.format("📏 %dm", locRound(d)) or "📏 --m",
BackgroundTransparency = 1, TextColor3 = col.txt, Font = Enum.Font.GothamMedium, TextSize = 8,
TextXAlignment = Enum.TextXAlignment.Right, ZIndex = 9, }, row) local specRowBtn = New("TextButton", { Name = "SpecRowBtn",
Size = UDim2.new(0, 58, 0, 18), Position = UDim2.new(1, -126, 0, 4), Text = isSpecThis and "🚫 Thôi" or "👣 Xem",
BackgroundColor3 = isSpecThis and C.RED or C.PURPLE, TextColor3 = Color3.fromRGB(255, 255, 255),
Font = Enum.Font.GothamBold, TextSize = 8, BorderSizePixel = 0, ZIndex = 10, }, row)
Corner(specRowBtn, UDim.new(0, 5)) D.Shade(specRowBtn, Color3.fromRGB(255, 255, 255), Color3.fromRGB(182, 187, 201), 90) D.Tactile(specRowBtn, 0.08)
specRowBtn.Activated:Connect(function() ReleaseHubFocus() if SP.on and SP.target == p then S.Spec.Stop()
else pcall(function() LOC.SetTarget(p) end) S.Spec.Set(p) end
paint() if LOC.RefreshList then LOC.RefreshList(true) end
pcall(S.Rebuild) if D.hubStatus then flash(D.hubStatus, S.Spec.Status(), 1.8, C.ACCENT) end end) local mv = S.Move
local isFlyingToThis = mv and mv._playerFlyActive and mv._playerFlyTarget == p local flyBtn = New("TextButton", {
Name = "FlyRowBtn", Size = UDim2.new(0, 58, 0, 18), Position = UDim2.new(1, -64, 0, 4), Text = isFlyingToThis and "⏹️ Dừng" or "🚀 Bay tới",
BackgroundColor3 = isFlyingToThis and C.RED or C.ACCENT, TextColor3 = Color3.fromRGB(255, 255, 255),
Font = Enum.Font.GothamBold, TextSize = 8, BorderSizePixel = 0, ZIndex = 10, }, row)
Corner(flyBtn, UDim.new(0, 5)) D.Shade(flyBtn, Color3.fromRGB(255, 255, 255), Color3.fromRGB(182, 187, 201), 90) D.Tactile(flyBtn, 0.08)
flyBtn.Activated:Connect(function() ReleaseHubFocus()
local mv2 = S.Move if not mv2 then return end local currentlyFlyingToThis = mv2._playerFlyActive and mv2._playerFlyTarget == p
if currentlyFlyingToThis then pcall(function() mv2.StopPlayerFly() end) else pcall(function() mv2.FlyToPlayer(p) end)
end if S.SyncMovePanel then pcall(S.SyncMovePanel) end if D.hubStatus then if mv2._playerFlyActive then
flash(D.hubStatus, "🚀 Bay tới " .. tostring(p.Name) .. " " .. tostring(mv2.GetPlayerFlySpeed and mv2.GetPlayerFlySpeed() or mv2.playerFlySpeed or 0), 1.8, C.ACCENT)
else flash(D.hubStatus, "⏹️ Đã dừng bay tới " .. tostring(p.Name), 1.2, C.GRAY) end end
if LOC.RefreshList then pcall(LOC.RefreshList, true) end S.Rebuild()
end) cache[p] = { dist = distLbl, fly = flyBtn, spec = specRowBtn, nameBtn = b, row = row }
end pcall(function() list.CanvasSize = UDim2.new(0, 0, 0, order * 30) end) else local mv = S.Move
for _, p in ipairs(want) do local r = cache[p] if r then local nm = tostring(p.Name)
local c, _, h = LOC.CharOf(p) local fr, down = LOC.IsFriend(p), LOC.IsDown(h) local d2 = LOC.Dist(p)
if r.dist then r.dist.Text = d2 and string.format("📏 %dm", locRound(d2)) or "📏 --m" end
if r.nameBtn then r.nameBtn.Text = buildRowText(p, nm, c, h, fr, down) end if r.spec then
local specOn = (SP.on and SP.target == p) r.spec.Text = specOn and "🚫 Thôi" or "👣 Xem" r.spec.BackgroundColor3 = specOn and C.RED or C.PURPLE end
if r.fly then local flying = mv and mv._playerFlyActive and mv._playerFlyTarget == p
r.fly.Text = flying and "⏹️ Dừng" or "🚀 Bay tới" r.fly.BackgroundColor3 = flying and C.RED or C.ACCENT end end
end end paint() end
S.Spec.RefreshList = function() if LOC.RefreshList then LOC.RefreshList(true) end end searchIn:GetPropertyChangedSignal("Text"):Connect(function()
if LOC.RefreshList then pcall(LOC.RefreshList, true) end end) searchIn.FocusLost:Connect(function() ReleaseHubFocus()
if LOC.RefreshList then pcall(LOC.RefreshList, true) end end) allBtn.Activated:Connect(function() ReleaseHubFocus() LOC.Set(not LOC.on) paint()
if LOC.RefreshList then LOC.RefreshList(true) end S.Rebuild() if D.hubStatus then flash(D.hubStatus, "📍 " .. LOC.Status(), 1.8, C.ACCENT) end end)
soloBtn.Activated:Connect(function() ReleaseHubFocus() if LOC.solo then LOC.SetSolo(false) else
LOC.SetTarget(LOC.target or LOC.Nearest()) end paint() if LOC.RefreshList then LOC.RefreshList(true) end
S.Rebuild() if D.hubStatus then flash(D.hubStatus, "🎯 " .. LOC.Status(), 1.8, C.ACCENT) end end) stopBtn.Activated:Connect(function()
ReleaseHubFocus() LOC.StopAll() paint() if LOC.RefreshList then LOC.RefreshList(true) end S.Rebuild()
if D.hubStatus then flash(D.hubStatus, "🚫 " .. LOC.Status(), 1.8, C.ACCENT) end end) distIn.FocusLost:Connect(function() ReleaseHubFocus()
local n = tonumber(tostring(distIn.Text or ""):match("%-?%d+%.?%d*")) or 0 LOC.SetMaxDist(n)
distIn.Text = tostring(LOC.maxDist) if D.hubStatus then flash(D.hubStatus, (LOC.maxDist > 0 and string.format("📏 chỉ hiện người trong %dm", locRound(LOC.maxDist))
or "📏 không giới hạn khoảng cách"), 1.8, C.ACCENT) end end) flySpeedApply.Activated:Connect(function()
ReleaseHubFocus() local mv = S.Move if not mv then return end local n = tonumber(tostring(flySpeedIn.Text or ""):match("%-?%d+%.?%d*"))
if n == nil then if D.hubStatus then flash(D.hubStatus, "⚠️ Nhập số 0-500 (0=auto)", 1.5, C.RED) end return
end local ok, msg = mv.SetPlayerFlySpeed(n) if not ok and D.hubStatus then flash(D.hubStatus, "⚠️ " .. tostring(msg), 1.5, C.RED)
else paint() if D.hubStatus then local sp = mv.GetPlayerFlySpeed and mv.GetPlayerFlySpeed() or mv.playerFlySpeed or 0
if (tonumber(mv.playerFlySpeed) or 0) == 0 then flash(D.hubStatus, string.format("🚀 Tốc độ bay tới người: auto (%g = tốc độ game)", sp), 1.8, C.ACCENT)
else flash(D.hubStatus, string.format("🚀 Tốc độ bay tới người: %g", sp), 1.5, C.GREEN) end end if S.SyncMovePanel then pcall(S.SyncMovePanel) end
S.Rebuild() end end) flySpeedIn.FocusLost:Connect(function(enter) if not enter then return end ReleaseHubFocus()
local mv = S.Move if not mv then return end local n = tonumber(tostring(flySpeedIn.Text or ""):match("%-?%d+%.?%d*"))
if n == nil then return end local ok = mv.SetPlayerFlySpeed(n) if ok then paint() S.Rebuild() end end) flyNearBtn.Activated:Connect(function()
ReleaseHubFocus() local mv = S.Move if not mv then return end local target = LOC.Nearest() if not target then
if D.hubStatus then flash(D.hubStatus, "⚠️ Không có người chơi nào để bay tới", 1.5, C.RED) end return
end pcall(function() mv.FlyToPlayer(target) end) paint() if LOC.RefreshList then pcall(LOC.RefreshList, true) end
if S.SyncMovePanel then pcall(S.SyncMovePanel) end S.Rebuild() if D.hubStatus then flash(D.hubStatus, "🚀 Bay tới gần nhất: " .. tostring(target.Name), 1.8, C.ACCENT) end
end) flyStopBtn.Activated:Connect(function() ReleaseHubFocus() local mv = S.Move if mv then pcall(function() mv.StopPlayerFly() end) end paint()
if LOC.RefreshList then pcall(LOC.RefreshList, true) end if S.SyncMovePanel then pcall(S.SyncMovePanel) end
S.Rebuild() if D.hubStatus then flash(D.hubStatus, "⏹️ Đã dừng bay tới người", 1.2, C.GRAY) end end)
watchBtn.Activated:Connect(function() ReleaseHubFocus() if SP.on then S.Spec.Stop() else local p = SP.target or LOC.target or LOC.Nearest()
if not p then if D.hubStatus then flash(D.hubStatus, "⚠️ chưa có ai để xem (server chỉ có mình bạn)", 2, C.RED) end else LOC.SetTarget(p)
S.Spec.Set(p) end end paint() if LOC.RefreshList then LOC.RefreshList(true) end pcall(S.Rebuild)
if D.hubStatus then flash(D.hubStatus, S.Spec.Status(), 2, C.ACCENT) end end) followBtn.Activated:Connect(function() ReleaseHubFocus()
S.Spec.SetFollow(not SP.follow) paint()
if D.hubStatus then flash(D.hubStatus, SP.follow and "🎥 camera bám theo người đang xem" or "🎥 đã trả camera về cho bạn (vẫn xem được bảng 👣)", 2, C.ACCENT) end end)
autoBtn.Activated:Connect(function() ReleaseHubFocus() S.Spec.SetAuto(not SP.auto) paint()
if D.hubStatus then flash(D.hubStatus, SP.auto and "🔄 người đang xem thoát -> tự chuyển người gần nhất" or "🔄 đã tắt tự chuyển", 2, C.ACCENT) end end)
specApplyBtn.Activated:Connect(function() ReleaseHubFocus() local d = tonumber(tostring(specDistIn.Text or ""):match("%-?%d+%.?%d*")) or SP.dist
local hh = tonumber(tostring(specHiIn.Text or ""):match("%-?%d+%.?%d*")) or SP.height S.Spec.SetDist(d); S.Spec.SetHeight(hh) paint()
if D.hubStatus then flash(D.hubStatus, string.format("📏 camera: lùi %gm · cao %gm", SP.dist, SP.height), 1.8, C.ACCENT) end end)
stopSpecBtn.Activated:Connect(function() ReleaseHubFocus() S.Spec.Stop() paint()
if LOC.RefreshList then LOC.RefreshList(true) end pcall(S.Rebuild)
if D.hubStatus then flash(D.hubStatus, "🚫 " .. S.Spec.Status(), 2, C.ACCENT) end end) if LOC.RefreshList then pcall(LOC.RefreshList, true) end
S.SyncLocPanel = function() paint() distIn.Text = tostring(LOC.maxDist) local mv = S.Move
if mv then flySpeedIn.Text = tostring(mv.playerFlySpeed or 0) end if LOC.RefreshList then pcall(LOC.RefreshList, true) end end end
S.Free = { on = false, speed = 50, _bound = false, _cf = nil, _wasAnchored = nil, _hrp = nil, _camType = nil, _camSub = nil, _yaw = 0, _pitch = 0,
_mdx = 0, _mdy = 0, _step = nil, _mouse = nil, _pos = nil, _mouseBeh = nil, }
local FR = S.Free function S.Free.Char() return player and player.Character or nil end function S.Free.HRP(ch) ch = ch or S.Free.Char()
return ch and ch:FindFirstChild("HumanoidRootPart") end function S.Free.HoldChar() if not FR.on then return end local hrp = S.Free.HRP()
if not hrp then return end if FR._hrp ~= hrp then FR._hrp = hrp FR._wasAnchored = hrp.Anchored
FR._cf = hrp.CFrame end if not FR._cf then FR._cf = hrp.CFrame end hrp.Anchored = true
hrp.CFrame = FR._cf end function S.Free.ReleaseChar() local hrp = FR._hrp or S.Free.HRP()
if hrp and hrp.Parent then pcall(function() hrp.Anchored = (FR._wasAnchored == true) if FR._cf then hrp.CFrame = FR._cf end
end) end FR._hrp, FR._wasAnchored, FR._cf = nil, nil, nil end function S.Free.AimCam()
local cam = workspace.CurrentCamera if not cam then return end
if FR._camType == nil then FR._camType = cam.CameraType end if FR._camSub == nil then FR._camSub = cam.CameraSubject end
cam.CameraType = Enum.CameraType.Scriptable pcall(function() cam.CameraSubject = nil end)
pcall(function() if FR._mouseBeh == nil then FR._mouseBeh = UserInputService.MouseBehavior end
if UserInputService:GetFocusedTextBox() then UserInputService.MouseBehavior = Enum.MouseBehavior.Default return
end UserInputService.MouseBehavior = Enum.MouseBehavior.LockCenter local d = UserInputService:GetMouseDelta() if d then
FR._mdx = (FR._mdx or 0) + d.X FR._mdy = (FR._mdy or 0) + d.Y end end)
end function S.Free.RestoreCam() local cam = workspace.CurrentCamera FR._yaw, FR._pitch, FR._mdx, FR._mdy = 0, 0, 0, 0 pcall(function()
UserInputService.MouseBehavior = FR._mouseBeh or Enum.MouseBehavior.Default end)
FR._mouseBeh = nil if not cam then FR._camType, FR._camSub, FR._pos = nil, nil, nil return end local t = FR._camType pcall(function()
if t and t ~= Enum.CameraType.Scriptable then cam.CameraType = t else cam.CameraType = Enum.CameraType.Custom end
end) local ch = S.Free.Char() local hum = ch and ch:FindFirstChildOfClass("Humanoid") local sub = hum or FR._camSub
if sub then pcall(function() cam.CameraSubject = sub end) end FR._camType, FR._camSub, FR._pos = nil, nil, nil
end function S.Free.Look() local yaw = FR._yaw or 0 local pitch = FR._pitch or 0 yaw = yaw - (FR._mdx or 0) * 0.004
pitch = pitch - (FR._mdy or 0) * 0.004 if pitch > 1.4 then pitch = 1.4 elseif pitch < -1.4 then pitch = -1.4 end
FR._mdx, FR._mdy = 0, 0 FR._yaw, FR._pitch = yaw, pitch return CFrame.Angles(0, yaw, 0) * CFrame.Angles(pitch, 0, 0) end function S.Free.Step(dt)
if not FR.on then return end S.Free.HoldChar() local cam = workspace.CurrentCamera if not cam then return end
S.Free.AimCam() dt = tonumber(dt) or 0.016 if dt < 0 then dt = 0 end if dt > 0.1 then dt = 0.1 end
local look = S.Free.Look() local pos = FR._pos if not pos then return end
local ch = S.Free.Char() local hum = ch and ch:FindFirstChildOfClass("Humanoid") local cf = CFrame.new(pos) * look local input = Vector3.zero
pcall(function() input = MV._ReadFlyInput(cf, hum) end) local vel = MV.FlyVelocity(cf, input, FR.speed)
pos = pos + vel * dt FR._pos = pos cam.CFrame = CFrame.new(pos) * look end function S.Free.Bind(on) if on and not FR._bound then FR._bound = true
pcall(function() RunService:BindToRenderStep("BC_FreeCam", Enum.RenderPriority.Last.Value, function(dt) pcall(S.Free.Step, dt) end) end)
if not FR._step then FR._step = RunService.Stepped:Connect(function() if FR.on then pcall(S.Free.HoldChar) end end)
end elseif (not on) and FR._bound then FR._bound = false pcall(function() RunService:UnbindFromRenderStep("BC_FreeCam") end)
pcall(function() if FR._step then FR._step:Disconnect() end end) FR._step, FR._mouse = nil, nil end end function S.Free.Set(on)
on = (on == true) if on then if S.Spec and S.Spec.on then pcall(function() S.Spec.Stop() end) end local cam = workspace.CurrentCamera
if cam then local look = cam.CFrame.LookVector
local y = look.Y if y > 1 then y = 1 elseif y < -1 then y = -1 end FR._yaw = math.atan2(-look.X, -look.Z)
FR._pitch = math.asin(y) FR._mdx, FR._mdy = 0, 0 FR._pos = cam.CFrame.Position end
FR.on = true S.Free.HoldChar() S.Free.AimCam() S.Free.Bind(true) S.Free.Step(0) else FR.on = false S.Free.Bind(false) S.Free.ReleaseChar()
S.Free.RestoreCam() end if S.SyncFreePanel then pcall(S.SyncFreePanel) end return FR.on
end function S.Free.Stop() return S.Free.Set(false) end function S.Free.SetSpeed(n)
n = tonumber(n) if not n or n ~= n or n == math.huge or n == -math.huge then return false, FR.speed end
FR.speed = mvClamp(n, 1, 2000, 50) if S.SyncFreePanel then pcall(S.SyncFreePanel) end return true, FR.speed end
function S.Free.Status() if not FR.on then return "🎥 khán giả: đang TẮT · nhân vật đi bình thường" end
return string.format("🎥 khán giả: BẬT · camera bay (WASD · Space/Shift) · nhân vật đứng yên · 💨 %g", FR.speed) end do
trackConn(player.CharacterAdded:Connect(function() FR._hrp, FR._wasAnchored, FR._cf = nil, nil, nil
if not FR.on then return end task.defer(function() if FR.on then S.Free.HoldChar() end end)
end)) end _G.BananaCatHub_Free = S.Free S.Glow = { on = false, width = 18, bright = 3, color = Color3.fromRGB(120, 220, 255),
thru = true,
light = true,
_hl = nil, _pl = nil, _char = nil, _bound = false, _acc = 0, palIdx = 1, }
local GL = S.Glow
GL.palette = { { name = "Xanh băng", c = Color3.fromRGB(120, 220, 255) },
{ name = "Xanh lá",  c = Color3.fromRGB(80, 255, 140) }, { name = "Hồng",     c = Color3.fromRGB(255, 120, 210) },
{ name = "Vàng",     c = Color3.fromRGB(255, 220, 90) }, { name = "Đỏ",       c = Color3.fromRGB(255, 80, 80) },
{ name = "Tím",      c = Color3.fromRGB(170, 120, 255) }, { name = "Trắng",    c = Color3.fromRGB(255, 255, 255) },
} function S.Glow.FillT() return mvClamp(0.94 - (tonumber(GL.bright) or 0) * 0.088, 0, 1, 1) end
function S.Glow.EdgeT() return mvClamp(0.60 - (tonumber(GL.bright) or 0) * 0.058, 0, 1, 1) end function S.Glow.Char() return player and player.Character or nil end
function S.Glow.Kill() pcall(function() if GL._hl then GL._hl:Destroy() end end)
pcall(function() if GL._pl then GL._pl:Destroy() end end) GL._hl, GL._pl, GL._char = nil, nil, nil end function S.Glow.Apply()
if not GL.on then return end local ch = S.Glow.Char() if not ch then return end
if GL._char ~= ch then S.Glow.Kill(); GL._char = ch end
local hrp = ch:FindFirstChild("HumanoidRootPart") or ch:FindFirstChildOfClass("BasePart") local mode = GL.thru and Enum.HighlightDepthMode.AlwaysOnTop or Enum.HighlightDepthMode.Occluded
local host = (gui and gui.Parent and gui) or targetGui or playerGui if not host then return end
if not (GL._hl and GL._hl.Parent) then
GL._hl = New("Highlight", { Name = "BC_GlowHL", Adornee = ch,
FillColor = GL.color, OutlineColor = GL.color, FillTransparency = S.Glow.FillT(), OutlineTransparency = S.Glow.EdgeT(), DepthMode = mode, }, host)
end pcall(function() if GL._hl.Parent ~= host then GL._hl.Parent = host end GL._hl.Adornee = ch
GL._hl.FillColor = GL.color GL._hl.OutlineColor = GL.color GL._hl.FillTransparency = S.Glow.FillT() GL._hl.OutlineTransparency = S.Glow.EdgeT()
GL._hl.DepthMode = mode end) if GL.light and hrp then
if not (GL._pl and GL._pl.Parent) then
GL._pl = New("PointLight", { Name = "BC_GlowLight", Brightness = GL.bright, Range = GL.width, Color = GL.color, Shadows = false, }, hrp)
end pcall(function() GL._pl.Brightness = GL.bright GL._pl.Range = GL.width GL._pl.Color = GL.color
GL._pl.Shadows = false
if GL._pl.Parent ~= hrp then GL._pl.Parent = hrp end end) elseif not GL.light then pcall(function() if GL._pl then GL._pl:Destroy() end end)
GL._pl = nil end end function S.Glow.Bind(on) if on and not GL._bound then GL._bound = true
pcall(function() RunService:BindToRenderStep("BC_Glow", Enum.RenderPriority.Camera.Value - 5, function(dt) GL._acc = (GL._acc or 0) + (tonumber(dt) or 0.016)
local interval = 0.8 if S.PagePerf and not S.PagePerf.IsMainVisible() then interval = 2.0 end
if GL._acc < interval then return end GL._acc = 0 pcall(S.Glow.Apply) end) end) elseif (not on) and GL._bound then GL._bound = false
pcall(function() RunService:UnbindFromRenderStep("BC_Glow") end) end end function S.Glow.Set(on) GL.on = (on == true)
if GL.on then S.Glow.Bind(true); S.Glow.Apply() else S.Glow.Kill(); S.Glow.Bind(false) end return GL.on
end function S.Glow.SetWidth(n)  GL.width  = mvClamp(n, 1, 200, GL.width);  S.Glow.Apply(); return GL.width  end
function S.Glow.SetBright(n) GL.bright = mvClamp(n, 0, 10, GL.bright); S.Glow.Apply(); return GL.bright end function S.Glow.SetThru(b)   GL.thru   = (b == true); S.Glow.Apply(); return GL.thru end
function S.Glow.SetLight(b)  GL.light  = (b == true); S.Glow.Apply(); return GL.light end function S.Glow.SetColor(c)
if typeof(c) == "Color3" then GL.color = c elseif type(c) == "number" and GL.palette[c] then GL.palIdx = c GL.color = GL.palette[c].c
end S.Glow.Apply() return GL.color end
function S.Glow.CycleColor() local n = #GL.palette GL.palIdx = ((GL.palIdx or 1) % n) + 1 GL.color = GL.palette[GL.palIdx].c S.Glow.Apply()
return GL.palette[GL.palIdx].name end function S.Glow.Stop() return S.Glow.Set(false) end function S.Glow.ColorName()
for _, p in ipairs(GL.palette) do if p.c == GL.color then return p.name end end return "tự chọn"
end function S.Glow.Status() if not GL.on then return "✨ phát sáng: đang TẮT" end
local t = { string.format("📏 rộng %g", GL.width), string.format("☀ sáng %g", GL.bright), "🎨 " .. S.Glow.ColorName() }
if GL.thru then t[#t + 1] = "👁 xuyên tường" end if GL.light then t[#t + 1] = "💡 đèn thật" end
return "✨ phát sáng: BẬT · " .. table.concat(t, " · ") end do trackConn(player.CharacterAdded:Connect(function()
if GL.on then pcall(S.Glow.Apply) end end)) end do local PH = 132 local P = New("Frame", { Name = "HubGlow_Panel",
Size = UDim2.new(1, 0, 0, PH), LayoutOrder = 1, BackgroundColor3 = C.SURFACE, BackgroundTransparency = 0.12, BorderSizePixel = 0, ZIndex = 6,
}, D.hubList) Corner(P, UDim.new(0, 10)) Stroke(P, C.HAIRLINE, 1) D.Shade(P, Color3.fromRGB(255, 255, 255), Color3.fromRGB(188, 192, 205), 90)
New("TextLabel", { Name = "GlowTitle",
Size = UDim2.new(1, -16, 0, 14), Position = UDim2.new(0, 8, 0, 4), Text = "✨ PHÁT SÁNG (nhân vật của MÌNH)", BackgroundTransparency = 1,
TextColor3 = C.ACCENT, Font = Enum.Font.GothamBold, TextSize = 10, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, P)
local function act(txt, x, y, w, color, name) local b = New("TextButton", {
Name = name or "GlowBtn", Size = UDim2.new(0, w, 0, 18), Position = UDim2.new(0, x, 0, y),
Text = txt, BackgroundColor3 = color, TextColor3 = D.BestText(color), Font = Enum.Font.GothamBold, TextSize = 8, BorderSizePixel = 0, ZIndex = 8,
}, P) Corner(b, UDim.new(0, 5)) D.Shade(b, Color3.fromRGB(255, 255, 255), Color3.fromRGB(182, 187, 201), 90) D.Tactile(b, 0.08) return b
end local function lab(txt, x, y, w) New("TextLabel", { Size = UDim2.new(0, w, 0, 18), Position = UDim2.new(0, x, 0, y),
Text = txt, BackgroundTransparency = 1, TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium, TextSize = 9,
TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, P) end local function box(x, y, w, val) local b = New("TextBox", {
Size = UDim2.new(0, w, 0, 18), Position = UDim2.new(0, x, 0, y), Text = tostring(val), ClearTextOnFocus = false,
BackgroundColor3 = C.SURFACE2, BackgroundTransparency = 0.1, TextColor3 = C.DARK, PlaceholderColor3 = C.GRAY, Font = Enum.Font.GothamMedium, TextSize = 9,
TextXAlignment = Enum.TextXAlignment.Center, BorderSizePixel = 0, ZIndex = 7, }, P) Corner(b, UDim.new(0, 5)) return b end
local onBtn   = act("✨ BẬT", 8, 22, 78, C.GRAY, "GlowOn") local thruBtn = act("👁 Xuyên tường: BẬT", 90, 22, 102, C.GREEN, "GlowThru")
local litBtn  = act("💡 Đèn thật: BẬT", 196, 22, 92, C.GREEN, "GlowLight") lab("📏 Rộng", 8, 46, 44) local wIn = box(52, 46, 44, 18)
lab("☀ Sáng", 102, 46, 44) local bIn = box(146, 46, 44, 3) local colBtn = act("🎨 Đổi màu", 196, 46, 108, C.PURPLE, "GlowColor")
local applyBtn = act("✔ Áp dụng", 8, 70, 72, C.SURFACE3, "GlowApply") local stopBtn  = act("🚫 Tắt", 84, 70, 58, C.RED, "GlowStop")
local statusLbl = New("TextLabel", { Name = "GlowStatus",
Size = UDim2.new(1, -188, 0, 20), Position = UDim2.new(0, 174, 0, 74), Text = "", BackgroundTransparency = 1, TextColor3 = C.MUTED,
Font = Enum.Font.GothamMedium, TextSize = 8, TextXAlignment = Enum.TextXAlignment.Left, TextTruncate = Enum.TextTruncate.AtEnd, ZIndex = 7, }, P)
New("TextLabel", { Size = UDim2.new(1, -16, 0, 30), Position = UDim2.new(0, 8, 0, 98),
Text = "💡 📏 Rộng = bán kính toả sáng (1–200) · ☀ Sáng = độ sáng (0–10). " .. "👁 Xuyên tường = thấy mình sáng qua tường · 💡 Đèn thật = ánh sáng KHÔNG bị vật cản chặn. "
.. "Bị game xoá hay respawn thì tự gắn lại; chỉ thêm hiệu ứng, KHÔNG đụng vào di chuyển.", TextWrapped = true, BackgroundTransparency = 1, TextColor3 = C.MUTED,
Font = Enum.Font.GothamMedium, TextSize = 8, TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top, ZIndex = 7, }, P)
local function paint() onBtn.Text = GL.on and "✨ TẮT" or "✨ BẬT"
onBtn.BackgroundColor3 = GL.on and C.GREEN or C.GRAY onBtn.TextColor3 = D.BestText(onBtn.BackgroundColor3)
thruBtn.Text = GL.thru and "👁 Xuyên tường: BẬT" or "👁 Xuyên tường: TẮT" thruBtn.BackgroundColor3 = GL.thru and C.GREEN or C.SURFACE3 thruBtn.TextColor3 = D.BestText(thruBtn.BackgroundColor3)
litBtn.Text = GL.light and "💡 Đèn thật: BẬT" or "💡 Đèn thật: TẮT" litBtn.BackgroundColor3 = GL.light and C.GREEN or C.SURFACE3
litBtn.TextColor3 = D.BestText(litBtn.BackgroundColor3) wIn.Text, bIn.Text = tostring(GL.width), tostring(GL.bright)
colBtn.Text = "🎨 " .. S.Glow.ColorName() statusLbl.Text = S.Glow.Status() end
S.SyncGlowPanel = paint
S.Glow.RefreshPanel = paint onBtn.Activated:Connect(function() ReleaseHubFocus()
S.Glow.Set(not GL.on) paint() if D.hubStatus then flash(D.hubStatus, S.Glow.Status(), 2, C.ACCENT) end
pcall(S.Rebuild)
end) thruBtn.Activated:Connect(function() ReleaseHubFocus() S.Glow.SetThru(not GL.thru) paint() if D.hubStatus then
flash(D.hubStatus, GL.thru and "👁 xuyên tường: thấy mình sáng qua vật cản" or "👁 chỉ sáng khi không bị vật cản che", 2, C.ACCENT)
end end) litBtn.Activated:Connect(function() ReleaseHubFocus() S.Glow.SetLight(not GL.light) paint() if D.hubStatus then
flash(D.hubStatus, GL.light and "💡 đèn thật: toả sáng quanh người, không bị vật cản chặn" or "💡 đã tắt đèn (chỉ còn nhuộm sáng nhân vật)", 2, C.ACCENT)
end end) colBtn.Activated:Connect(function() ReleaseHubFocus() local nm = S.Glow.CycleColor()
paint() if D.hubStatus then flash(D.hubStatus, "🎨 màu phát sáng: " .. nm, 1.8, C.ACCENT) end end) applyBtn.Activated:Connect(function()
ReleaseHubFocus() local w = tonumber(tostring(wIn.Text or ""):match("%-?%d+%.?%d*"))
local b = tonumber(tostring(bIn.Text or ""):match("%-?%d+%.?%d*")) if w then S.Glow.SetWidth(w) end if b then S.Glow.SetBright(b) end
if not GL.on then S.Glow.Set(true) end
paint() if D.hubStatus then flash(D.hubStatus, S.Glow.Status(), 2, C.ACCENT) end pcall(S.Rebuild) end)
stopBtn.Activated:Connect(function() ReleaseHubFocus() S.Glow.Stop() paint()
if D.hubStatus then flash(D.hubStatus, "🚫 " .. S.Glow.Status(), 1.8, C.ACCENT) end pcall(S.Rebuild) end) paint() end
do local PH = 108 local P = New("Frame", { Name = "HubFree_Panel", Size = UDim2.new(1, 0, 0, PH), LayoutOrder = 2,
BackgroundColor3 = C.SURFACE, BackgroundTransparency = 0.12, BorderSizePixel = 0, ZIndex = 6, }, D.hubList)
Corner(P, UDim.new(0, 10)) Stroke(P, C.HAIRLINE, 1) D.Shade(P, Color3.fromRGB(255, 255, 255), Color3.fromRGB(188, 192, 205), 90)
New("TextLabel", { Name = "FreeTitle",
Size = UDim2.new(1, -16, 0, 14), Position = UDim2.new(0, 8, 0, 4), Text = "🎥 KHÁN GIẢ (camera bay khắp nơi · nhân vật đứng yên)", BackgroundTransparency = 1,
TextColor3 = C.ACCENT, Font = Enum.Font.GothamBold, TextSize = 10, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, P)
local function act(txt, x, y, w, color, name) local b = New("TextButton", {
Name = name or "FreeBtn", Size = UDim2.new(0, w, 0, 18), Position = UDim2.new(0, x, 0, y),
Text = txt, BackgroundColor3 = color, TextColor3 = D.BestText(color), Font = Enum.Font.GothamBold, TextSize = 8, BorderSizePixel = 0, ZIndex = 8, }, P)
Corner(b, UDim.new(0, 5)) D.Shade(b, Color3.fromRGB(255, 255, 255), Color3.fromRGB(182, 187, 201), 90) D.Tactile(b, 0.08) return b end
local onBtn = act("🎥 BẬT", 8, 22, 78, C.GRAY, "FreeOn") local stopBtn = act("🚫 Tắt", 90, 22, 58, C.RED, "FreeStop")
local statusLbl = New("TextLabel", { Name = "FreeStatus",
Size = UDim2.new(1, -162, 0, 18), Position = UDim2.new(0, 154, 0, 22), Text = "", BackgroundTransparency = 1, TextColor3 = C.MUTED,
Font = Enum.Font.GothamMedium, TextSize = 8, TextXAlignment = Enum.TextXAlignment.Left, TextTruncate = Enum.TextTruncate.AtEnd, ZIndex = 7, }, P)
New("TextLabel", { Size = UDim2.new(0, 36, 0, 18), Position = UDim2.new(0, 8, 0, 44),
Text = "💨", BackgroundTransparency = 1, TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium, TextSize = 9, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7,
}, P) local spdIn = New("TextBox", { Size = UDim2.new(0, 48, 0, 18), Position = UDim2.new(0, 36, 0, 44),
Text = tostring(FR.speed), ClearTextOnFocus = false, BackgroundColor3 = C.SURFACE2, BackgroundTransparency = 0.1, TextColor3 = C.DARK,
PlaceholderColor3 = C.GRAY, Font = Enum.Font.GothamMedium, TextSize = 9, TextXAlignment = Enum.TextXAlignment.Center, BorderSizePixel = 0, ZIndex = 7,
}, P) Corner(spdIn, UDim.new(0, 5)) local applyBtn = act("✔ Áp dụng", 90, 44, 72, C.SURFACE3, "FreeApply")
New("TextLabel", { Size = UDim2.new(1, -16, 0, 32), Position = UDim2.new(0, 8, 0, 70),
Text = "WASD + Space/Shift bay camera giống 🚀. Chuột xoay nhìn. Nhân vật đứng yên. Không FireServer. Không cướp bay/nhảy/🛡.", TextWrapped = true, BackgroundTransparency = 1, TextColor3 = C.MUTED,
Font = Enum.Font.GothamMedium, TextSize = 8, TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top, ZIndex = 7,
}, P) local function paint() onBtn.Text = FR.on and "🎥 TẮT" or "🎥 BẬT"
onBtn.BackgroundColor3 = FR.on and C.GREEN or C.GRAY onBtn.TextColor3 = D.BestText(onBtn.BackgroundColor3)
spdIn.Text = tostring(FR.speed) statusLbl.Text = S.Free.Status() end S.SyncFreePanel = paint S.Free.RefreshPanel = paint
onBtn.Activated:Connect(function() ReleaseHubFocus() S.Free.Set(not FR.on) paint()
if D.hubStatus then flash(D.hubStatus, S.Free.Status(), 2, C.ACCENT) end pcall(S.Rebuild) end) stopBtn.Activated:Connect(function()
ReleaseHubFocus() S.Free.Stop() paint() if D.hubStatus then flash(D.hubStatus, "🚫 " .. S.Free.Status(), 1.8, C.ACCENT) end
pcall(S.Rebuild) end) applyBtn.Activated:Connect(function() ReleaseHubFocus()
local n = tonumber(tostring(spdIn.Text or ""):match("%-?%d+%.?%d*")) if n then S.Free.SetSpeed(n) end
if not FR.on then S.Free.Set(true) end paint() if D.hubStatus then flash(D.hubStatus, S.Free.Status(), 2, C.ACCENT) end pcall(S.Rebuild)
end) paint() end do local PH = 200 local P = New("Frame", { Name = "HubSafe_Panel",
Size = UDim2.new(1, 0, 0, PH), LayoutOrder = 2, BackgroundColor3 = C.SURFACE, BackgroundTransparency = 0.12, BorderSizePixel = 0, ZIndex = 6,
}, D.hubList) Corner(P, UDim.new(0, 10)) Stroke(P, C.HAIRLINE, 1) D.Shade(P, Color3.fromRGB(255, 255, 255), Color3.fromRGB(188, 192, 205), 90)
New("TextLabel", { Name = "SafeTitle",
Size = UDim2.new(1, -16, 0, 14), Position = UDim2.new(0, 8, 0, 4), Text = "🛡 BAY AN TOÀN (tự bay + né vật có dấu hiệu chuyển động)", BackgroundTransparency = 1,
TextColor3 = C.ACCENT, Font = Enum.Font.GothamBold, TextSize = 10, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, P)
local function act(txt, x, y, w, color, name) local b = New("TextButton", {
Name = name or "SafeBtn", Size = UDim2.new(0, w, 0, 18), Position = UDim2.new(0, x, 0, y),
Text = txt, BackgroundColor3 = color, TextColor3 = D.BestText(color), Font = Enum.Font.GothamBold, TextSize = 8, BorderSizePixel = 0, ZIndex = 8,
}, P) Corner(b, UDim.new(0, 5)) D.Shade(b, Color3.fromRGB(255, 255, 255), Color3.fromRGB(182, 187, 201), 90) D.Tactile(b, 0.08) return b
end local function lab(txt, x, y, w) New("TextLabel", { Size = UDim2.new(0, w, 0, 18), Position = UDim2.new(0, x, 0, y),
Text = txt, BackgroundTransparency = 1, TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium, TextSize = 9,
TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, P) end local function box(x, y, w, val) local b = New("TextBox", {
Size = UDim2.new(0, w, 0, 18), Position = UDim2.new(0, x, 0, y), Text = tostring(val), ClearTextOnFocus = false,
BackgroundColor3 = C.SURFACE2, BackgroundTransparency = 0.1, TextColor3 = C.DARK, PlaceholderColor3 = C.GRAY, Font = Enum.Font.GothamMedium, TextSize = 9,
TextXAlignment = Enum.TextXAlignment.Center, BorderSizePixel = 0, ZIndex = 7, }, P) Corner(b, UDim.new(0, 5)) return b end
local onBtn = act("🛡 BẬT", 8, 22, 78, C.GRAY, "SafeOn") lab("📏 Né", 90, 22, 30) local radIn = box(118, 22, 42, 25) lab("💨 Bay", 164, 22, 36)
local spdIn = box(200, 22, 42, 60) lab("🌀 Gắt", 246, 22, 32) local strIn = box(278, 22, 36, 4)
local autoBtn  = act("➡ Tự bay: BẬT", 8, 46, 84, C.GREEN, "SafeAuto") local shBtn    = act("🔲 Khiên: BẬT", 96, 46, 72, C.GREEN, "SafeShield")
local plBtn    = act("👤 Né người: BẬT", 172, 46, 82, C.GREEN, "SafePlayers") local ncBtn    = act("🧱 Xuyên: BẬT", 258, 46, 40, C.GREEN, "SafeNoclip")
local ciBtn    = act("⭕ Vòng tròn: BẬT", 8, 70, 92, C.GREEN, "SafeCircle") lab("⭕ Bán kính", 104, 70, 48)
local cirIn    = box(154, 70, 38, 20) lab("👁 Nhìn trước", 196, 70, 54) local lookIn   = box(252, 70, 32, 1) lab("giây", 286, 70, 30)
local applyBtn = act("✔ Áp dụng", 8, 94, 72, C.SURFACE3, "SafeApply") local stopBtn  = act("🚫 Tắt", 84, 94, 44, C.RED, "SafeStop")
lab("🔲 Cỡ", 134, 94, 32) local szIn = box(168, 94, 32, 0)
lab("(0 = tự)", 202, 94, 40) local hudBtn = act("📱 Nút ảo: BẬT", 244, 94, 76, C.GREEN, "SafeHud")
local statusLbl = New("TextLabel", { Name = "SafeStatus",
Size = UDim2.new(1, -16, 0, 20), Position = UDim2.new(0, 8, 0, 124), Text = "", BackgroundTransparency = 1, TextColor3 = C.MUTED,
Font = Enum.Font.GothamMedium, TextSize = 8, TextWrapped = true, TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top, ZIndex = 7, }, P)
New("TextLabel", { Name = "SafeNote",
Size = UDim2.new(1, -16, 0, 48), Position = UDim2.new(0, 8, 0, 148), Text = "💡 🔲 Khiên = bức tường trong suốt hình vuông ÔM QUANH nhân vật (cỡ hợp lí; muốn to/nhỏ "
.. "thì chỉnh ô 🔲 Cỡ — 0 = tự động. 📏 Né chỉ là khoảng cách né, không kéo giãn khiên) · " .. "👤 Né người = coi NGƯỜI CHƠI khác là mối nguy dù họ đứng yên · 🧱 Xuyên = tự bật Xuyên "
.. "Tường để lực đẩy đưa bạn QUA vật cản, tắt 🛡 là trả lại như cũ. ⭕ Vòng tròn = khi KHÔNG " .. "có ai/vật nào đang lao tới mình thì tự bay vòng tròn quanh chỗ đang đứng (bán kính "
.. "chỉnh ở ô ⭕), đang né hoặc đang bấm WASD/joystick ảo thì TẠM DỪNG, né xong tự bay vòng lại. " .. "👁 Nhìn trước = quét xa 📏 × 1,6 và bắt vật ĐANG LAO TỚI từ ngoài tầm. 📱 Nút ảo = joystick " .. "kéo + ⬆⬇ giữ để lên/xuống, hiện khi 🛡 BẬT. 🛡 tự sống qua respawn / hết trận sang trận mới.",
BackgroundTransparency = 1, TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium, TextSize = 8, TextWrapped = true,
TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top, ZIndex = 7, }, P)
local function paint() onBtn.Text = MV.Safe.on and "🛡 TẮT" or "🛡 BẬT"
onBtn.BackgroundColor3 = MV.Safe.on and C.GREEN or C.GRAY onBtn.TextColor3 = D.BestText(onBtn.BackgroundColor3)
autoBtn.Text = MV.Safe.auto and "➡ Tự bay: BẬT" or "➡ Tự bay: TẮT" autoBtn.BackgroundColor3 = MV.Safe.auto and C.GREEN or C.SURFACE3
autoBtn.TextColor3 = D.BestText(autoBtn.BackgroundColor3) shBtn.Text = MV.Safe.shield and "🔲 Khiên: BẬT" or "🔲 Khiên: TẮT"
shBtn.BackgroundColor3 = MV.Safe.shield and C.GREEN or C.SURFACE3 shBtn.TextColor3 = D.BestText(shBtn.BackgroundColor3) plBtn.Text = MV.Safe.avoidPlayers and "👤 Né người: BẬT" or "👤 Né người: TẮT"
plBtn.BackgroundColor3 = MV.Safe.avoidPlayers and C.GREEN or C.SURFACE3 plBtn.TextColor3 = D.BestText(plBtn.BackgroundColor3)
ncBtn.Text = MV.Safe.noclip and "🧱 Xuyên: BẬT" or "🧱 Xuyên: TẮT" ncBtn.BackgroundColor3 = MV.Safe.noclip and C.GREEN or C.SURFACE3
ncBtn.TextColor3 = D.BestText(ncBtn.BackgroundColor3) ciBtn.Text = MV.Safe.circle and "⭕ Vòng tròn: BẬT" or "⭕ Vòng tròn: TẮT"
ciBtn.BackgroundColor3 = MV.Safe.circle and C.GREEN or C.SURFACE3 ciBtn.TextColor3 = D.BestText(ciBtn.BackgroundColor3)
hudBtn.Text = MV.Safe.showHud and "📱 Nút ảo: BẬT" or "📱 Nút ảo: TẮT" hudBtn.BackgroundColor3 = MV.Safe.showHud and C.GREEN or C.SURFACE3 hudBtn.TextColor3 = D.BestText(hudBtn.BackgroundColor3)
radIn.Text, spdIn.Text, strIn.Text = tostring(MV.Safe.radius), tostring(MV.Safe.speed), tostring(MV.Safe.steer)
cirIn.Text, lookIn.Text = tostring(MV.Safe.circleR), tostring(MV.Safe.lookTime) szIn.Text = tostring(MV.Safe.shieldSize)
statusLbl.Text = MV.Safe.Status() statusLbl.TextColor3 = ((MV.Safe.threats or 0) > 0) and C.YELLOW or C.MUTED
end S.SyncSafePanel = paint MV.Safe.RefreshPanel = paint onBtn.Activated:Connect(function() ReleaseHubFocus()
MV.Safe.Set(not MV.Safe.on) paint() if D.hubStatus then flash(D.hubStatus, MV.Safe.Status(), 2.2, C.ACCENT) end pcall(S.Rebuild)
end) autoBtn.Activated:Connect(function() ReleaseHubFocus() MV.Safe.SetAuto(not MV.Safe.auto) paint()
if D.hubStatus then flash(D.hubStatus, MV.Safe.auto and "➡ tự bay: không bấm gì vẫn bay theo hướng camera"
or "➡ tự bay TẮT: chỉ bay khi bấm WASD (nhưng vẫn tự né)", 2, C.ACCENT) end end) shBtn.Activated:Connect(function()
ReleaseHubFocus() MV.Safe.SetShield(not MV.Safe.shield)
paint() if D.hubStatus then flash(D.hubStatus, MV.Safe.shield and ("🔲 khiên trong suốt hình vuông: BẬT · "
.. string.format("%g m/cạnh%s", MV.Safe.ShieldHalf() * 2, (tonumber(MV.Safe.shieldSize) or 0) > 0 and " (chỉnh tay)" or " (tự động)"))
or "🔲 đã ẩn khiên (vẫn né y như cũ)", 2, C.ACCENT) end end) plBtn.Activated:Connect(function()
ReleaseHubFocus() MV.Safe.SetAvoidPlayers(not MV.Safe.avoidPlayers) paint()
if D.hubStatus then flash(D.hubStatus, MV.Safe.avoidPlayers and "👤 coi NGƯỜI CHƠI khác là mối nguy (né dù họ đứng yên)"
or "👤 đã bỏ qua người chơi (chỉ né vật chuyển động)", 2, C.ACCENT) end end) ncBtn.Activated:Connect(function()
ReleaseHubFocus() MV.Safe.SetNoclipAuto(not MV.Safe.noclip)
paint() if D.hubStatus then flash(D.hubStatus, MV.Safe.noclip and "🧱 lực đẩy đưa bạn XUYÊN QUA vật cản (Xuyên Tường tự bật)"
or "🧱 đã trả Xuyên Tường về như trước", 2, C.ACCENT) end end) ciBtn.Activated:Connect(function()
ReleaseHubFocus() MV.Safe.SetCircle(not MV.Safe.circle) paint() if D.hubStatus then
flash(D.hubStatus, MV.Safe.circle and ("⭕ không có gì lao tới mình -> tự bay VÒNG TRÒN bán kính " .. tostring(math.floor(MV.Safe.circleR + 0.5)) .. "m") or "⭕ đã tắt bay vòng tròn (chỉ bay theo hướng đang nhìn)", 2, C.ACCENT) end
end) applyBtn.Activated:Connect(function()
ReleaseHubFocus() MV.Safe.SetRadius(tonumber(tostring(radIn.Text or ""):match("%-?%d+%.?%d*")) or MV.Safe.radius)
MV.Safe.SetSpeed(tonumber(tostring(spdIn.Text or ""):match("%-?%d+%.?%d*")) or MV.Safe.speed) MV.Safe.SetSteer(tonumber(tostring(strIn.Text or ""):match("%-?%d+%.?%d*")) or MV.Safe.steer)
MV.Safe.SetCircleR(tonumber(tostring(cirIn.Text or ""):match("%-?%d+%.?%d*")) or MV.Safe.circleR) MV.Safe.SetLook(tonumber(tostring(lookIn.Text or ""):match("%-?%d+%.?%d*")) or MV.Safe.lookTime) MV.Safe.SetShieldSize(tonumber(tostring(szIn.Text or ""):match("%-?%d+%.?%d*")) or MV.Safe.shieldSize)
if not MV.Safe.on then MV.Safe.Set(true) end
paint() if D.hubStatus then flash(D.hubStatus, MV.Safe.Status(), 2.4, C.ACCENT) end pcall(S.Rebuild) end)
stopBtn.Activated:Connect(function() ReleaseHubFocus() MV.Safe.Stop() paint()
if D.hubStatus then flash(D.hubStatus, "🚫 " .. MV.Safe.Status(), 1.8, C.ACCENT) end pcall(S.Rebuild) end)
hudBtn.Activated:Connect(function() ReleaseHubFocus() MV.Safe.SetShowHud(not MV.Safe.showHud) paint()
if D.hubStatus then flash(D.hubStatus, MV.Safe.showHud and "📱 nút ảo 🛡: BẬT — hiện joystick + ⬆⬇ khi 🛡 đang bật"
or "📱 nút ảo 🛡: TẮT — đã ẩn cụm nút nổi", 1.8, C.ACCENT) end end) paint() end
do local acc = 0 RunService:BindToRenderStep("BC_HubList", Enum.RenderPriority.Camera.Value - 4, function(dt) acc = acc + (tonumber(dt) or 0.016)
if acc < 4 then return end acc = 0 pcall(function()
if S.PagePerf and not S.PagePerf.IsMainVisible() then return end if main and not main.Visible then return end
local visible = false local function open(t) if t and t.Visible == true then return true end return false end
if open(D.playerTab) or open(D.hubTab) then visible = true end if not visible then return end local playerVisible = open(D.playerTab)
local hubVisible = open(D.hubTab) if playerVisible then
if S.Loc.RefreshList then S.Loc.RefreshList() end if S.GlassRefreshList then S.GlassRefreshList() end
if S.ObjTrack and S.ObjTrack.RefreshList then pcall(S.ObjTrack.RefreshList) end end
if hubVisible then if S.Loc.RefreshList and not playerVisible then end end
end) end) end ;(function() local PH = 354 local P = New("Frame", { Name = "HubGlass_Panel",
Size = UDim2.new(1, -16, 0, PH), Position = UDim2.new(0, 8, 0, D.playerY or 46),
LayoutOrder = 2, BackgroundColor3 = C.SURFACE, BackgroundTransparency = 0.12, BorderSizePixel = 0, ZIndex = 6,
}, D.playerTab) D.playerY = (D.playerY or 46) + PH + 8
Corner(P, UDim.new(0, 10)) Stroke(P, C.HAIRLINE, 1) D.Shade(P, Color3.fromRGB(255, 255, 255), Color3.fromRGB(188, 192, 205), 90)
New("TextLabel", { Size = UDim2.new(1, -16, 0, 14), Position = UDim2.new(0, 8, 0, 4),
Text = "🧱 THẢM KÍNH CỐ ĐỊNH · 🚀 BAY TỚI TỪNG TẤM", BackgroundTransparency = 1, TextColor3 = C.ACCENT, Font = Enum.Font.GothamBold, TextSize = 10,
TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, P)
New("TextLabel", { Size = UDim2.new(1, -16, 0, 22), Position = UDim2.new(0, 8, 0, 20),
Text = "Bấm 🧱 Đặt thêm để tạo tấm mới tại chân bạn. Tấm đã đặt đứng yên, không bị ghi đè; mỗi dòng có nút bay tới và xóa riêng.", TextWrapped = true, BackgroundTransparency = 1, TextColor3 = C.MUTED,
Font = Enum.Font.GothamMedium, TextSize = 8, TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top, ZIndex = 7, }, P)
local function glassAct(txt, x, y, w, color) local b = New("TextButton", {
Size = UDim2.new(0, w, 0, 18), Position = UDim2.new(0, x, 0, y), Text = txt, BackgroundColor3 = color, TextColor3 = D.BestText(color),
Font = Enum.Font.GothamBold, TextSize = 8, BorderSizePixel = 0, ZIndex = 8, }, P)
Corner(b, UDim.new(0, 5)) D.Shade(b, Color3.fromRGB(255, 255, 255), Color3.fromRGB(182, 187, 201), 90) D.Tactile(b, 0.08) return b end
local function glassLab(txt, x, y, w) New("TextLabel", {
Size = UDim2.new(0, w, 0, 18), Position = UDim2.new(0, x, 0, y), Text = txt, BackgroundTransparency = 1, TextColor3 = C.MUTED,
Font = Enum.Font.GothamMedium, TextSize = 9, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, P)
end local function glassInput(txt, x, y, w) local box = New("TextBox", { Size = UDim2.new(0, w, 0, 18), Position = UDim2.new(0, x, 0, y),
Text = txt, ClearTextOnFocus = false, BackgroundColor3 = C.SURFACE2, BackgroundTransparency = 0.1, TextColor3 = C.DARK,
PlaceholderColor3 = C.GRAY, Font = Enum.Font.GothamMedium, TextSize = 9, TextXAlignment = Enum.TextXAlignment.Center, BorderSizePixel = 0, ZIndex = 7, }, P)
Corner(box, UDim.new(0, 5)) return box end local function numberFrom(box, fallback)
local s = tostring(box and box.Text or "") return tonumber(s:match("[+-]?%d+%.?%d*")) or fallback end
glassLab("Rộng", 8, 44, 32) local widthIn = glassInput(tostring(MV.carpetW or 6), 42, 44, 40)
glassLab("Cao", 88, 44, 27) local heightIn = glassInput(tostring(MV.carpetH or 0.5), 116, 44, 40)
glassLab("Dài", 162, 44, 27) local lengthIn = glassInput(tostring(MV.carpetL or 6), 190, 44, 40)
glassLab("Gap", 236, 44, 28) local gapIn = glassInput(tostring(MV.carpetGap or 0.2), 266, 44, 40) local sizeApply = glassAct("✅ Áp dụng", 312, 44, 54, C.SURFACE3)
local placeBtn = glassAct("🧱 Đặt thêm", 8, 68, 82, C.BLUE) local autoBtn = glassAct("🔄 Tự đặt: TẮT", 94, 68, 84, C.SURFACE3)
local clearBtn = glassAct("🧹 Xóa tất cả", 182, 68, 82, C.RED) local stopBtn = glassAct("⏹ Dừng bay", 268, 68, 68, C.SURFACE3)
glassLab("🚀 Tốc độ bay:", 8, 92, 90) local flySpeedIn = glassInput(tostring(MV.glassFlySpeed or 60), 98, 92, 46)
local flySpeedApply = glassAct("✅ Đặt", 148, 92, 46, C.GREEN) local speedNote = New("TextLabel", {
Size = UDim2.new(1, -206, 0, 18), Position = UDim2.new(0, 200, 0, 92), Text = "tấm gần nhất · 1–2000",
BackgroundTransparency = 1, TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium, TextSize = 8, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, P)
local countLbl = New("TextLabel", { Size = UDim2.new(1, -16, 0, 18), Position = UDim2.new(0, 8, 0, 120),
Text = "🧱 Đã đặt: 0 tấm · cố định", BackgroundTransparency = 1, TextColor3 = C.ACCENT, Font = Enum.Font.GothamBold, TextSize = 9,
TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, P) local list = New("ScrollingFrame", {
Name = "GlassList", Size = UDim2.new(1, -16, 0, 208), Position = UDim2.new(0, 8, 0, 142), BackgroundTransparency = 1, BorderSizePixel = 0, ScrollBarThickness = 4,
CanvasSize = UDim2.new(0, 0, 0, 0), ZIndex = 7, }, P)
New("UIListLayout", { Padding = UDim.new(0, 3), SortOrder = Enum.SortOrder.LayoutOrder, }, list)
local function applyGlassSettings() local w, h, l = MV.SetCarpetSize(
numberFrom(widthIn, MV.carpetW or 6), numberFrom(heightIn, MV.carpetH or 0.5), numberFrom(lengthIn, MV.carpetL or 6) )
local g = MV.SetCarpetGap(numberFrom(gapIn, MV.carpetGap or 0.2)) widthIn.Text, heightIn.Text, lengthIn.Text, gapIn.Text = tostring(w), tostring(h), tostring(l), tostring(g)
return w, h, l, g end local function glassCount() local ok, items = pcall(MV.GetPlacedGlasses)
if ok and type(items) == "table" then return items end return {} end local function paintGlassButtons(items)
local auto = MV.autoGlass == true autoBtn.Text = auto and "🔄 Tự đặt: BẬT" or "🔄 Tự đặt: TẮT"
autoBtn.BackgroundColor3 = auto and C.GREEN or C.SURFACE3 autoBtn.TextColor3 = D.BestText(autoBtn.BackgroundColor3)
countLbl.Text = "🧱 Đã đặt: " .. tostring(#items) .. " tấm · cố định" speedNote.Text = "tấm gần nhất · " .. tostring(MV.glassFlySpeed or 60) .. "" end
S.GlassRefreshList = function() if not (list and list.Parent) then return end
local items = glassCount() for _, child in ipairs(list:GetChildren()) do
if not child:IsA("UIListLayout") then pcall(function() child:Destroy() end) end end for i, rec in ipairs(items) do local glassIndex = i
local part = rec.part local pos = rec.position or (part and part.Position) or Vector3.new(0, 0, 0) local row = New("Frame", {
Name = "GlassRow_" .. tostring(rec.id or i), Size = UDim2.new(1, 0, 0, 26), LayoutOrder = i,
BackgroundColor3 = C.SURFACE2, BackgroundTransparency = 0.18, BorderSizePixel = 0, ZIndex = 8, }, list) Corner(row, UDim.new(0, 5))
Stroke(row, (MV._glassFlyTarget == rec) and C.ACCENT or C.BORDER, 1) New("TextLabel", { Size = UDim2.new(1, -110, 1, 0), Position = UDim2.new(0, 7, 0, 0),
Text = string.format("#%s  X %.1f  Y %.1f  Z %.1f", tostring(rec.id or i), pos.X, pos.Y, pos.Z), BackgroundTransparency = 1, TextColor3 = C.DARK, Font = Enum.Font.GothamBold, TextSize = 8,
TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 9, }, row)
local fly = New("TextButton", { Size = UDim2.new(0, 48, 0, 18), Position = UDim2.new(1, -100, 0, 4),
Text = "🚀 Tới", BackgroundColor3 = C.ACCENT, TextColor3 = D.BestText(C.ACCENT), Font = Enum.Font.GothamBold, TextSize = 8, BorderSizePixel = 0, ZIndex = 9,
}, row) Corner(fly, UDim.new(0, 4)); D.Tactile(fly, 0.08) fly.Activated:Connect(function()
ReleaseHubFocus() local ok, result = MV.FlyToGlass(glassIndex)
if ok then D.Say("🚀 đang bay tới tấm kính #" .. tostring(result and result.id or glassIndex) .. " · bấm ⏹ để dừng", C.YELLOW)
else D.Say("⚠️ " .. tostring(result), C.RED) end pcall(S.GlassRefreshList) end)
local del = New("TextButton", { Size = UDim2.new(0, 44, 0, 18), Position = UDim2.new(1, -48, 0, 4),
Text = "🗑 Xóa", BackgroundColor3 = C.RED, TextColor3 = D.BestText(C.RED), Font = Enum.Font.GothamBold, TextSize = 8, BorderSizePixel = 0, ZIndex = 9,
}, row) Corner(del, UDim.new(0, 4)); D.Tactile(del, 0.08) del.Activated:Connect(function() ReleaseHubFocus()
local ok, result = MV.RemoveGlassAt(glassIndex) if ok then D.Say("🗑 đã xóa tấm kính #" .. tostring(result and result.id or glassIndex), C.GREEN)
else D.Say("⚠️ " .. tostring(result), C.RED) end pcall(S.GlassRefreshList)
end) end pcall(function() list.CanvasSize = UDim2.new(0, 0, 0, math.max(0, #items * 29)) end) paintGlassButtons(items) end
S.OpenGlassPanel = function() local ok = S.OpenPlayerTab and S.OpenPlayerTab() or false pcall(S.GlassRefreshList) return ok
end sizeApply.Activated:Connect(function() ReleaseHubFocus() local w, h, l, g = applyGlassSettings()
D.Say(string.format("✅ kích thước kính: %g × %g × %g · gap %g", w, h, l, g), C.GREEN) end)
placeBtn.Activated:Connect(function() ReleaseHubFocus() applyGlassSettings() local ok, part, rec = MV.PlaceGlass() if ok then
D.Say("🧱 đã đặt tấm kính cố định #" .. tostring(rec and rec.id or "?") .. " · tổng " .. tostring(#glassCount()) .. " tấm", C.GREEN)
else D.Say("⚠️ " .. tostring(part), C.RED) end pcall(S.GlassRefreshList)
end) autoBtn.Activated:Connect(function() ReleaseHubFocus() applyGlassSettings() local on = MV.SetAutoGlass(not MV.autoGlass)
D.Say(on and "🔄 tự đặt kính: BẬT" or "🔄 tự đặt kính: TẮT", C.YELLOW) pcall(S.GlassRefreshList) end) clearBtn.Activated:Connect(function()
ReleaseHubFocus() local n = MV.ClearPlacedGlasses()
D.Say("🧹 đã xóa toàn bộ " .. tostring(n) .. " tấm kính cố định", C.GREEN) pcall(S.GlassRefreshList) end)
stopBtn.Activated:Connect(function() ReleaseHubFocus() MV.StopGlassFly() D.Say("⏹ đã dừng bay tới kính", C.YELLOW)
pcall(S.GlassRefreshList) end) flySpeedApply.Activated:Connect(function() ReleaseHubFocus()
local ok, value = MV.SetGlassFlySpeed(numberFrom(flySpeedIn, MV.glassFlySpeed or 60)) if ok then flySpeedIn.Text = tostring(value)
speedNote.Text = "tấm gần nhất · " .. tostring(value) D.Say("🚀 tốc độ bay tới kính: " .. tostring(value), C.GREEN)
else D.Say("⚠️ " .. tostring(value), C.RED) end end) pcall(S.GlassRefreshList) pcall(function()
if D.playerTab then D.playerTab.CanvasSize = UDim2.new(0, 0, 0, (D.playerY or 600) + 16) end end) end)()
D.hubChipBtns = {} for _, cname in ipairs({"Tất cả", "Tiện ích", "Server", "Di chuyển"}) do
local w = (cname == "Tất cả" and 50) or (cname == "Tiện ích" and 54) or (cname == "Server" and 48) or (cname == "Di chuyển" and 58) or 38
local chip = New("TextButton", { Size = UDim2.new(0, w, 0, 17), Text = cname,
BackgroundColor3 = (S.hubCat == cname) and C.ACCENT or C.SURFACE2, BackgroundTransparency = (S.hubCat == cname) and 0.08 or 1, TextColor3 = (S.hubCat == cname) and C.INK or C.MUTED,
Font = Enum.Font.GothamBold, TextSize = 8, BorderSizePixel = 0, ZIndex = 7, }, D.hubChips)
Corner(chip, UDim.new(1, 0)) Stroke(chip, (S.hubCat == cname) and C.ACCENT2 or C.BORDER, 1) chip.Activated:Connect(function() S.hubCat = cname
for nm, cb in pairs(D.hubChipBtns) do local on = (nm == cname) cb.BackgroundColor3 = on and C.ACCENT or C.SURFACE2
cb.BackgroundTransparency = on and 0.08 or 1 cb.TextColor3 = on and C.INK or C.MUTED
local st = cb:FindFirstChildOfClass("UIStroke") if st then st.Color = on and C.ACCENT2 or C.BORDER end end S.RebuildHubList()
end) D.hubChipBtns[cname] = chip end trackConn(D.hubSearchBox:GetPropertyChangedSignal("Text"):Connect(function()
S.hubSearch = D.hubSearchBox.Text
S.Debounce("hubSearch", 0.18, S.RebuildHubList)
end)) S.RebuildHubList() D.SyncPageChips()
S.SyncServerPanel()
do


S.ObjTrack = {
on = false,
query = "",
keys = {},
maxDist = 0,
maxItems = 60,
showRows = 8,
thru = true,
showLabel = true,
showBox = false,
showXYZ = true,
skipPlayers = true,
color = 1,
items = {},
list = {},
lastScan = 0,
rescanEvery = 0.8,

scanIdle = 1.0,
scanBudget = 300,
scanSliceMs = 2.0,
makeBudget = 15,
tickSliceMs = 1.5,
labelBudget = 25,
infoEvery = 0.25,
labelEvery = 0.12,
pathKeys = {},
entries = {},
_order = {}, _tickIdx = 0, _pending = {}, _queue = {}, _qN = 0, _pathSet = {}, _pathN = 0, _chars = {},
_nc = setmetatable({}, { __mode = "k" }),
_gui = nil, _acc = 0, _scanAcc = 0, _bound = false, _scanned = 0, _renderErr = false,
_sel = nil, _selPart = nil,
_found = 0, _scanMs = 0, _capped = false, _err = nil, _rowSig = nil, } local OT = S.ObjTrack OT.palette = {
{ name = "Xanh nước", fill = Color3.fromRGB(0, 170, 255), out = Color3.fromRGB(186, 231, 255) }, { name = "Xanh ngọc", fill = Color3.fromRGB(0, 255, 170), out = Color3.fromRGB(255, 255, 255) },
{ name = "Cam",       fill = Color3.fromRGB(255, 165, 0), out = Color3.fromRGB(255, 240, 210) }, { name = "Hồng",      fill = Color3.fromRGB(255, 105, 180), out = Color3.fromRGB(255, 214, 236) }, { name = "Tím",       fill = Color3.fromRGB(170, 120, 255), out = Color3.fromRGB(232, 222, 255) },
{ name = "Vàng",      fill = Color3.fromRGB(255, 225, 80), out = Color3.fromRGB(255, 252, 214) }, { name = "Đỏ",        fill = Color3.fromRGB(255, 70, 70), out = Color3.fromRGB(255, 214, 214) },
{ name = "Xanh dương", fill = Color3.fromRGB(90, 170, 255), out = Color3.fromRGB(222, 240, 255) }, }
function OT.Pal() local i = tonumber(OT.color) or 1
return OT.palette[i] or OT.palette[1] end local function otRound(n) return math.floor((tonumber(n) or 0) + 0.5) end
local function otXYZ(part) local ok, pos = pcall(function() return part.Position end)
if not ok or not pos then return "" end return string.format("X %.1f · Y %.1f · Z %.1f", pos.X, pos.Y, pos.Z) end
function OT.PathOf(inst) if inst == nil then return "nil" end local parts, cur, guard = {}, inst, 0 while cur and cur ~= game and guard < 40 do
table.insert(parts, 1, tostring(cur.Name)) cur = cur.Parent guard = guard + 1 end
return table.concat(parts, ".") end function OT.Info(inst, part) if inst == nil then return {} end
if part == nil then part = OT.PartOf(inst) end local rows = {}
local function add(k, v) rows[#rows + 1] = { k = k, v = tostring(v) } end add("Name", tostring(inst.Name))
add("Class", tostring(inst.ClassName)) add("Path", OT.PathOf(inst)) if part then
local okP, pos = pcall(function() return part.Position end) if okP and pos then add("Position", string.format("%.3f, %.3f, %.3f", pos.X, pos.Y, pos.Z)) end
local okS, size = pcall(function() return part.Size end) if okS and size then add("Size", string.format("%.3f, %.3f, %.3f", size.X, size.Y, size.Z)) end
local okC, cf = pcall(function() return part.CFrame end) if okC and cf then
pcall(function() local rx, ry, rz = cf:ToOrientation() add("Rotation", string.format("P=%.1f° Y=%.1f° R=%.1f°", math.deg(rx), math.deg(ry), math.deg(rz)))
end) pcall(function() local look = cf.LookVector add("Look", string.format("%.3f, %.3f, %.3f", look.X, look.Y, look.Z)) end) end
local okM, mat = pcall(function() return part.Material end) if okM and mat then add("Material", tostring(mat):gsub("Enum.Material.", "")) end local okCol, col = pcall(function() return part.Color end)
if okCol and col then add("Color", string.format("R=%d G=%d B=%d", math.floor(col.R * 255), math.floor(col.G * 255), math.floor(col.B * 255))) end
end return rows end function OT.Select(inst) if inst == nil or inst.Parent == nil then
OT._sel, OT._selPart = nil, nil else OT._sel = inst OT._selPart = OT.PartOf(inst)
end if OT.RefreshInfo then pcall(OT.RefreshInfo) end return OT._sel end
function OT.CopyCoords(inst) local part = (inst and OT.PartOf(inst)) or OT._selPart
if part == nil then return false, "chưa chọn vật nào" end local ok, pos = pcall(function() return part.Position end)
if not ok or not pos then return false, "vật không còn toạ độ" end local txt = string.format("%.3f, %.3f, %.3f", pos.X, pos.Y, pos.Z)
local did = (S.CopyToClipboard and S.CopyToClipboard(txt)) or false return did, txt end function OT.CopyPath(inst) local target = inst or OT._sel
if target == nil then return false, "chưa chọn vật nào" end local txt = OT.PathOf(target)
local did = (S.CopyToClipboard and S.CopyToClipboard(txt)) or false return did, txt end
local OT_FOLD = {} do local groups = { ["a"] = "áàảãạăắằẳẵặâấầẩẫậÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬ",
["e"] = "éèẻẽẹêếềểễệÉÈẺẼẸÊẾỀỂỄỆ", ["i"] = "íìỉĩịÍÌỈĨỊ",
["o"] = "óòỏõọôốồổỗộơớờởỡợÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢ", ["u"] = "úùủũụưứừửữựÚÙỦŨỤƯỨỪỬỮỰ",
["y"] = "ýỳỷỹỵÝỲỶỸỴ", ["d"] = "đĐ",
} if type(utf8) == "table" and type(utf8.codes) == "function" then pcall(function() for base, chars in pairs(groups) do
for _, cp in utf8.codes(chars) do OT_FOLD[cp] = base end end end) end end
function OT.Norm(s) local t = tostring(s or "") if t == "" then return "" end local out, k = {}, 0
local okUtf = false if type(utf8) == "table" and type(utf8.codes) == "function" and type(utf8.char) == "function" then
okUtf = pcall(function() for _, cp in utf8.codes(t) do k = k + 1 out[k] = OT_FOLD[cp] or utf8.char(cp) end
end) if not okUtf then out, k = {}, 0 end end if not okUtf then k = 1; out[1] = t end
local s2 = table.concat(out, "", 1, k):gsub("%s+", " ") return (s2:lower()) end function OT.Split(q) local out, paths = {}, {}
for part in tostring(q or ""):gmatch("[^,;]+") do local k = (OT.Norm(part):gsub("^%s+", ""):gsub("%s+$", ""))
if #k > 0 then local hasPath = k:find(".", 1, true) ~= nil or k:find("/", 1, true) ~= nil
or k:find("\\", 1, true) ~= nil if hasPath then local full = k:gsub("[/\\]", ".")
if full:sub(1, 5) == "game." then full = full:sub(6) end
paths[#paths + 1] = full local last = full:match("([^%.]+)$") if last and #last > 0 then out[#out + 1] = last end else
out[#out + 1] = k end end end OT.pathKeys = paths return out end function OT.NormCached(inst) local nm = inst.Name
if type(nm) ~= "string" then return "" end local c = OT._nc[inst] if c ~= nil and c.raw == nm then return c.norm end local norm = OT.Norm(nm)
OT._nc[inst] = { raw = nm, norm = norm } return norm end function OT.MatchesNorm(n) if n == "" or #OT.keys == 0 then return false end
local keys = OT.keys for i = 1, #keys do if n:find(keys[i], 1, true) then return true end end
return false end function OT.SharedNameMatch(a, b) local na, nb = OT.NormCached(a), OT.NormCached(b)
local shared = false for i = 1, #OT.keys do local key = OT.keys[i]
local inPart, inModel = na:find(key, 1, true) ~= nil, nb:find(key, 1, true) ~= nil if inPart and not inModel then return false end
if inPart and inModel then shared = true end end return shared end function OT.ResolvePath(key) local segs = {}
for rawS in tostring(key or ""):gmatch("[^%.]+") do local s = rawS:gsub("^%s+", ""):gsub("%s+$", "")
if #s > 0 then segs[#segs + 1] = s end end if #segs == 0 then return nil end local cur, i = game, 1
if segs[1] == "workspace" then cur, i = workspace, 2 elseif segs[1] == "game" then i = 2 end while i <= #segs do if cur == nil then return nil end
local found = nil local okK, kids = pcall(function() return cur:GetChildren() end)
if not okK or type(kids) ~= "table" then return nil end for k = 1, #kids do if OT.Norm(kids[k].Name) == segs[i] then found = kids[k] break end end
if found == nil then return nil end cur, i = found, i + 1 end return cur end
function OT.RefreshPaths() OT._pathSet = {} OT._pathN = 0 local keys = OT.pathKeys or {}
for i = 1, #keys do local ok, inst = pcall(OT.ResolvePath, keys[i]) if ok and inst ~= nil then OT._pathSet[inst] = true OT._pathN = OT._pathN + 1
end end end function OT.Candidate(inst) if OT._pathN > 0 and OT._pathSet[inst] then return true end return OT.MatchesNorm(OT.NormCached(inst)) end
OT.Hit = OT.Candidate


function OT.IsPathLike(raw) local t = tostring(raw or "")
return t:find(".", 1, true) ~= nil or t:find("/", 1, true) ~= nil or t:find("\\", 1, true) ~= nil end
function OT.EntryKey(raw) local t = tostring(raw or ""):gsub("^%s+", ""):gsub("%s+$", "") t = OT.Norm(t) if OT.IsPathLike(t) then
t = t:gsub("[/\\]", ".") if t:sub(1, 5) == "game." then t = t:sub(6) end end return t end
function OT.RebuildKeys() local keys, paths = {}, {} local function push(raw) raw = tostring(raw or "")
if raw:gsub("%s", "") == "" then return end if OT.IsPathLike(raw) then local key = OT.EntryKey(raw) local ok, inst = pcall(OT.ResolvePath, key)
if ok and inst ~= nil then
paths[#paths + 1] = key return end end local k = OT.Norm(raw):gsub("^%s+", ""):gsub("%s+$", "") if #k > 0 then keys[#keys + 1] = k end end
for i = 1, #OT.entries do push(OT.entries[i].raw) end
for part in tostring(OT.query or ""):gmatch("[^,;]+") do push(part) end
OT.keys, OT.pathKeys = keys, paths return #keys, #paths end function OT.AddEntry(raw) raw = tostring(raw or ""):gsub("^%s+", ""):gsub("%s+$", "")
if raw == "" then return false, "chưa nhập gì" end local key = OT.EntryKey(raw)
for i = 1, #OT.entries do if OT.EntryKey(OT.entries[i].raw) == key then return false, "mục này đã có trong danh sách rồi" end end
local kind = OT.IsPathLike(raw) and "path" or "name" if kind == "path" then local ok, inst = pcall(OT.ResolvePath, key)
if not ok or inst == nil then kind = "name" end
end OT.entries[#OT.entries + 1] = { raw = raw, kind = kind } OT._tagSig = nil OT.RebuildKeys()
OT.on = true OT._fastUntil = tick() + 4
OT.Bind()
pcall(OT.Rescan, true)
if OT.RefreshTags then pcall(OT.RefreshTags) end return true, kind end function OT.RemoveEntry(i) i = tonumber(i) or 0
if i < 1 or i > #OT.entries then return false, "mục không tồn tại" end local raw = OT.entries[i].raw table.remove(OT.entries, i) OT._tagSig = nil
OT.RebuildKeys() if #OT.keys == 0 and #(OT.pathKeys or {}) == 0 then OT.Set(false) elseif OT.on then
pcall(OT.Rescan, true) end if OT.RefreshTags then pcall(OT.RefreshTags) end return true, raw end
function OT.ClearEntries() OT.entries = {} OT.query = "" OT._tagSig = nil OT.RebuildKeys() if OT.RefreshTags then pcall(OT.RefreshTags) end end
OT.savedList = (type(Store) == "table" and type(Store.savedObjTracks) == "table") and Store.savedObjTracks or {}
OT.viewMode = "server"
function OT.SyncStore() if type(Store) == "table" then Store.savedObjTracks = OT.savedList pcall(Store.save) end end
local function pushUniqueEntry(list, raw, kind) raw = tostring(raw or ""):gsub("^%s+", ""):gsub("%s+$", "") if raw == "" then return false end
local key = OT.EntryKey(raw) for i = 1, #list do if OT.EntryKey(list[i].raw) == key then return false end end
if not kind then kind = OT.IsPathLike(raw) and "path" or "name" if kind == "path" then local ok, inst = pcall(OT.ResolvePath, key) if not ok or inst == nil then kind = "name" end end end
list[#list + 1] = { raw = raw, kind = kind } return true end
function OT.Save(rawOrTarget, autoLoad) local savedEntries, title, queryStr, savedPath = {}, "", "", nil
if type(rawOrTarget) == "table" and rawOrTarget.ClassName ~= nil then local inst = rawOrTarget local nm = tostring(inst.Name or ""):gsub("^%s+", ""):gsub("%s+$", "")
if nm == "" then return false, "vật không có tên hợp lệ" end savedPath = OT.PathOf(inst)
pushUniqueEntry(savedEntries, nm, "name") if savedPath and savedPath ~= "" and savedPath ~= "nil" then pushUniqueEntry(savedEntries, savedPath, "path") end
pushUniqueEntry(OT.entries, nm, "name") title, queryStr = nm, nm
else local raw = tostring(rawOrTarget or ""):gsub("^%s+", ""):gsub("%s+$", "")
if raw == "" and tostring(OT.query or ""):gsub("^%s+", ""):gsub("%s+$", "") ~= "" then raw = tostring(OT.query):gsub("^%s+", ""):gsub("%s+$", "") end
if raw ~= "" then for part in raw:gmatch("[^,;]+") do local p = part:gsub("^%s+", ""):gsub("%s+$", "")
if p ~= "" then pushUniqueEntry(savedEntries, p, nil) pushUniqueEntry(OT.entries, p, nil) end end
if #savedEntries == 0 then pushUniqueEntry(savedEntries, raw, nil) pushUniqueEntry(OT.entries, raw, nil) end title, queryStr = raw, raw
elseif #OT.entries > 0 then local t = {} for i = 1, #OT.entries do local e = OT.entries[i] pushUniqueEntry(savedEntries, e.raw, e.kind) t[#t + 1] = tostring(e.raw) end
title = table.concat(t, ", ") queryStr = title
elseif OT._sel ~= nil and OT._sel.Parent ~= nil then return OT.Save(OT._sel, autoLoad)
elseif #OT.savedList > 0 then local last = OT.savedList[#OT.savedList] if type(last) == "table" then
for _, e in ipairs(last.entries or {}) do if type(e) == "table" then pushUniqueEntry(savedEntries, e.raw, e.kind) end end
title = tostring(last.title or last.query or "Mục lưu") queryStr = tostring(last.query or title) end end end
if #savedEntries == 0 then return false, "chưa nhập tên vật hoặc ghim mục nào để lưu" end
local idx = #OT.savedList + 1 local item = { id = math.floor((tonumber(tick()) or 0) * 1000) + idx, slot = idx, title = title, query = queryStr,
entries = savedEntries, path = savedPath, color = tonumber(OT.color) or 1, maxDist = tonumber(OT.maxDist) or 0, autoLoad = (autoLoad == true) }
OT.savedList[idx] = item OT._tagSig = nil OT._rowSig = nil OT.RebuildKeys() OT.on = true OT._fastUntil = tick() + 4 OT.Bind()
pcall(OT.Rescan, true) OT.SyncStore() if OT.RefreshTags then pcall(OT.RefreshTags) end if OT.RefreshList then pcall(OT.RefreshList) end return true, item, idx end
function OT.UseSaved(idx, appendMode) idx = tonumber(idx) or 0 local item = OT.savedList[idx]
if type(item) ~= "table" then return false, "mục lưu #" .. tostring(idx) .. " không tồn tại" end
if not appendMode then OT.entries = {} OT.query = "" end
if type(item.entries) == "table" and #item.entries > 0 then for _, e in ipairs(item.entries) do
if type(e) == "table" and e.raw then pushUniqueEntry(OT.entries, e.raw, e.kind) elseif type(e) == "string" then pushUniqueEntry(OT.entries, e, nil) end end
elseif type(item.query) == "string" and item.query ~= "" then for part in item.query:gmatch("[^,;]+") do pushUniqueEntry(OT.entries, part, nil) end end
OT._tagSig = nil OT._rowSig = nil OT.RebuildKeys() OT.on = true OT._fastUntil = tick() + 4 OT.Bind() pcall(OT.Rescan, true)
if OT.RefreshTags then pcall(OT.RefreshTags) end if OT.RefreshList then pcall(OT.RefreshList) end return true, item end
function OT.UseAllSaved(appendMode) if #OT.savedList == 0 then return false, "chưa có mục định vị vật nào được lưu" end
if not appendMode then OT.entries = {} OT.query = "" end
for i = 1, #OT.savedList do local item = OT.savedList[i] if type(item) == "table" then
if type(item.entries) == "table" and #item.entries > 0 then for _, e in ipairs(item.entries) do
if type(e) == "table" and e.raw then pushUniqueEntry(OT.entries, e.raw, e.kind) elseif type(e) == "string" then pushUniqueEntry(OT.entries, e, nil) end end
elseif type(item.query) == "string" and item.query ~= "" then for part in item.query:gmatch("[^,;]+") do pushUniqueEntry(OT.entries, part, nil) end end end end
OT._tagSig = nil OT._rowSig = nil OT.RebuildKeys() OT.on = true OT._fastUntil = tick() + 4 OT.Bind() pcall(OT.Rescan, true)
if OT.RefreshTags then pcall(OT.RefreshTags) end if OT.RefreshList then pcall(OT.RefreshList) end return true, #OT.savedList end
function OT.RemoveSaved(idx) idx = tonumber(idx) or 0 local item = OT.savedList[idx]
if type(item) ~= "table" then return false, "mục lưu không tồn tại" end table.remove(OT.savedList, idx)
for i = 1, #OT.savedList do if type(OT.savedList[i]) == "table" then OT.savedList[i].slot = i end end
if #OT.savedList == 0 and OT.viewMode == "saved" then OT.viewMode = "server" end
OT._rowSig = nil OT.SyncStore() if OT.RefreshList then pcall(OT.RefreshList) end return true, item end
function OT.ToggleViewMode(targetMode)
if targetMode == "saved" or targetMode == "server" then OT.viewMode = targetMode
else OT.viewMode = (OT.viewMode == "saved") and "server" or "saved" end
if OT.viewMode == "server" and #OT.savedList > 0 and #OT.keys == 0 and #(OT.pathKeys or {}) == 0 then pcall(OT.UseAllSaved, true)
elseif OT.viewMode == "server" and OT.on then pcall(OT.Rescan, true) end
OT._rowSig = nil if OT.RefreshList then pcall(OT.RefreshList) end return OT.viewMode end
if type(Store) == "table" then Store.restoreObjTracks = function()
OT.savedList = type(Store.savedObjTracks) == "table" and Store.savedObjTracks or {} OT._rowSig = nil
if OT.RefreshList then pcall(OT.RefreshList) end end end
function OT.Matches(name) local n = OT.Norm(name) if n == "" or #OT.keys == 0 then return false end for i = 1, #OT.keys do
if n:find(OT.keys[i], 1, true) then return true end end return false end
function OT.PartOf(inst, depth) if inst == nil then return nil end depth = tonumber(depth) or 0 if depth > 4 then return nil end
local okA, isA = pcall(function() return inst:IsA("BasePart") end) if okA and isA then return inst end
local okP, pp = pcall(function() return inst.PrimaryPart end) if okP and pp and pp.Parent then return pp end
local okW, found = pcall(function() return inst:FindFirstChildWhichIsA("BasePart", true) end)
if not okW then okW, found = pcall(function() return inst:FindFirstChildWhichIsA("BasePart") end) end if okW and found and found.Parent then return found end
local okC, kids = pcall(function() return inst:GetChildren() end) if okC and type(kids) == "table" then
for i = 1, #kids do local p = OT.PartOf(kids[i], depth + 1) if p then return p end end end return nil end
function OT.RefreshChars()
local out = {} if OT.skipPlayers then local okL, list = pcall(function() return Players:GetPlayers() end) if okL and type(list) == "table" then
for i = 1, #list do local c = nil pcall(function() c = list[i].Character end) if c ~= nil then out[#out + 1] = c end
end end end OT._chars = out end function OT.Skip(inst) if inst == nil then return true end local chars = OT._chars if chars == nil then
OT.RefreshChars() chars = OT._chars end for i = 1, #chars do
local okD, inside = pcall(function() return inst:IsDescendantOf(chars[i]) end) if okD and inside then return true end end return false end
function OT.Gui() if OT._gui and OT._gui.Parent then return OT._gui end
OT._gui = New("ScreenGui", { Name = "BC_ObjTrackESP", ResetOnSpawn = false, ZIndexBehavior = Enum.ZIndexBehavior.Sibling,
}, targetGui) return OT._gui end function OT.Kill(inst) local it = OT.items[inst]
if not it then return end pcall(function() if it.hl then it.hl:Destroy() end end)
pcall(function() if it.bb then it.bb:Destroy() end end) pcall(function() if it.box then it.box:Destroy() end end) OT.items[inst] = nil
if it.slot then OT._order[it.slot] = nil end
end function OT.Clear() for inst in pairs(OT.items) do OT.Kill(inst) end
OT.items = {} OT._order, OT._tickIdx, OT._pending = {}, 0, {} OT._passing = false OT._queue, OT._qN = {}, 0
OT._sel, OT._selPart = nil, nil OT.list = {} OT._found = 0 OT._capped = false
OT._rowSig = nil pcall(function() if OT._gui then OT._gui:ClearAllChildren() end end) end
function OT._MakeBox(part, pal) local ok, box = pcall(function()
return New("BoxHandleAdornment", {
Name = "BC_OT_BOX", Adornee = part, Size = part.Size + Vector3.new(0.4, 0.4, 0.4),
Color3 = pal.fill, Transparency = 0.35, AlwaysOnTop = OT.thru, ZIndex = 3, Visible = OT.showBox, }, part) end)
if ok and box then return box end return nil end function OT.Make(inst, part) if inst == nil or part == nil then return end
local okP, alive = pcall(function() return (part.Parent ~= nil) and (inst.Parent ~= nil) end) if not okP or not alive then return end
OT.Kill(inst) local g = OT.Gui() local pal = OT.Pal()
local okAM, adornee = pcall(function() return (inst:IsA("BasePart") or inst:IsA("Model")) and inst or part
end) if not okAM or adornee == nil then adornee = part end local hl = nil local okH = pcall(function()
hl = New("Highlight", { Name = "BC_OT_HL", Adornee = adornee,
FillColor = pal.fill, FillTransparency = 0.7,
OutlineColor = pal.out, OutlineTransparency = 0, DepthMode = OT.thru and Enum.HighlightDepthMode.AlwaysOnTop or Enum.HighlightDepthMode.Occluded,
}, inst) end) if not okH then hl = nil
pcall(function()
hl = New("Highlight", { Name = "BC_OT_HL", Adornee = adornee,
FillColor = pal.fill, FillTransparency = 0.7, OutlineColor = pal.out, OutlineTransparency = 0,
DepthMode = OT.thru and Enum.HighlightDepthMode.AlwaysOnTop or Enum.HighlightDepthMode.Occluded, }, g) end) end
local bb, lbl = nil, nil pcall(function() bb = New("BillboardGui", { Name = "BC_OT_BB", Adornee = part,
Size = UDim2.new(0, 210, 0, OT.showXYZ and 46 or 30), StudsOffset = Vector3.new(0, 2.4, 0), AlwaysOnTop = OT.thru, MaxDistance = 3000, ResetOnSpawn = false,
}, part) lbl = New("TextLabel", { Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1,
Text = tostring(inst.Name), TextColor3 = pal.out, Font = Enum.Font.GothamBold, TextSize = 11,
TextStrokeColor3 = Color3.fromRGB(0, 0, 0), TextStrokeTransparency = 0.35, TextWrapped = true, }, bb) end) if bb == nil then
pcall(function()
bb = New("BillboardGui", { Name = "BC_OT_BB", Adornee = part,
Size = UDim2.new(0, 210, 0, OT.showXYZ and 46 or 30), StudsOffset = Vector3.new(0, 2.4, 0), AlwaysOnTop = OT.thru, MaxDistance = 3000, ResetOnSpawn = false,
}, g) lbl = New("TextLabel", { Size = UDim2.new(1, 0, 1, 0), BackgroundTransparency = 1,
Text = tostring(inst.Name), TextColor3 = pal.out, Font = Enum.Font.GothamBold, TextSize = 11,
TextStrokeColor3 = Color3.fromRGB(0, 0, 0), TextStrokeTransparency = 0.35, TextWrapped = true, }, bb) end) end
local box = nil if OT.showBox then box = OT._MakeBox(part, pal) end OT._slotN = (OT._slotN or 0) + 1 OT._order[OT._slotN] = inst
OT._orderN = OT._slotN OT.items[inst] = { hl = hl, bb = bb, lbl = lbl, box = box, part = part, dist = 0,
adornee = adornee, slot = OT._slotN, txt = nil } OT._renderErr = (hl == nil and bb == nil)
if OT._renderErr then OT._err = "executor chặn Highlight/BillboardGui — không vẽ được định vị" end end
function OT.TickOne(inst, myPos, pal) local it = OT.items[inst] if it == nil then return end local part = it.part
local okA, alive = pcall(function() return part ~= nil and part.Parent ~= nil and inst.Parent ~= nil end) if not okA or not alive then OT.Kill(inst) return end
local okD, d = pcall(function() return myPos and (part.Position - myPos).Magnitude or nil end) d = (okD and d) or nil
it.dist = d or 0 local far = (OT.maxDist > 0 and d ~= nil and d > OT.maxDist)
local anchor = it.adornee or inst if it.hl and it.hl.Parent ~= anchor then
local okRe = pcall(function() it.hl.Parent = anchor end) if not okRe then pcall(function() it.hl:Destroy() end) it.hl = nil
end end if it.hl == nil then pcall(function() it.hl = New("Highlight", { Name = "BC_OT_HL", Adornee = anchor,
FillColor = pal.fill, FillTransparency = 0.7, OutlineColor = pal.out, OutlineTransparency = 0, DepthMode = OT.thru and Enum.HighlightDepthMode.AlwaysOnTop or Enum.HighlightDepthMode.Occluded,
}, anchor) end) end if it.hl then
pcall(function() it.hl.Adornee = anchor end) it.hl.Enabled = not far it.hl.FillColor = pal.fill it.hl.OutlineColor = pal.out
pcall(function() it.hl.DepthMode = OT.thru and Enum.HighlightDepthMode.AlwaysOnTop or Enum.HighlightDepthMode.Occluded end) end
if it.bb then if it.bb.Parent ~= part then pcall(function() it.bb.Parent = part end) end it.bb.Adornee = part
it.bb.Enabled = (not far) and OT.showLabel it.bb.AlwaysOnTop = OT.thru
pcall(function() it.bb.Size = UDim2.new(0, 210, 0, OT.showXYZ and 46 or 30) end) end
if it.box then if it.box.Parent ~= part then pcall(function() it.box.Parent = part end) end
it.box.Adornee = part pcall(function() it.box.Size = part.Size + Vector3.new(0.4, 0.4, 0.4) end)
it.box.Visible = (not far) and OT.showBox it.box.Color3 = pal.fill it.box.AlwaysOnTop = OT.thru end if it.lbl then
local dm = otRound(d or 0) if it.txtName ~= inst.Name or it.txtDist ~= dm then
it.txtName, it.txtDist = inst.Name, dm it.txtXYZ = OT.showXYZ and otXYZ(part) or nil elseif OT.showXYZ then it.txtXYZ = otXYZ(part) end
local txt = tostring(inst.Name) .. (d and ("  📏 " .. dm .. "m") or "  📏 --m") if OT.showXYZ and it.txtXYZ ~= nil and it.txtXYZ ~= "" then txt = txt .. "\n🧭 " .. it.txtXYZ end
if it.txt ~= txt then it.txt = txt end if it.lbl.Text ~= it.txt then it.lbl.Text = it.txt end it.lbl.TextColor3 = pal.out end end
function OT.Tick() local t0 = os.clock() local order = OT._order or {} local n = tonumber(OT._orderN) or 0 OT._tickUpdates = 0 if n > 0 then
local myRoot = S.Move and S.Move.Root and S.Move.Root() or nil local myPos = myRoot and myRoot.Position or nil local pal = OT.Pal()
local quota = math.min(tonumber(OT.labelBudget) or 20, n) local guard = 0 while quota > 0 and guard < n * 2 do guard = guard + 1
OT._tickIdx = (OT._tickIdx % n) + 1 local inst = order[OT._tickIdx] if inst == nil then elseif OT.items[inst] == nil then order[OT._tickIdx] = nil
else quota = quota - 1 OT._tickUpdates = OT._tickUpdates + 1 pcall(OT.TickOne, inst, myPos, pal) end
if (os.clock() - t0) * 1000 > (OT.tickSliceMs or 1.5) then break end
end end if OT._sel ~= nil then local okS, aliveS = pcall(function() return OT._sel.Parent ~= nil end)
if not okS or not aliveS then OT._sel, OT._selPart = nil, nil OT._infoAt = os.clock()
if OT.RefreshInfo then pcall(OT.RefreshInfo) end
end end if OT._sel and OT.RefreshInfo and (os.clock() - (OT._infoAt or 0)) >= (OT.infoEvery or 0.5) then OT._infoAt = os.clock()
pcall(OT.RefreshInfo) end end


function OT.ScanBegin() OT.RefreshPaths() OT.RefreshChars() local root = S.Move and S.Move.Root and S.Move.Root() or nil
OT._myPos = root and root.Position or nil
OT._queue = { workspace }
OT._qN = 1 OT._hits = {} OT._scanned, OT._skipped = 0, 0 OT._passing = true OT._passT0 = os.clock() OT._err = nil end
function OT.ScanHit(inst) local okP, posOrBool = pcall(function() return inst:IsA("BasePart") end)
if okP and posOrBool then local anc, guard, covered = inst.Parent, 0, false while anc and guard < 32 do guard = guard + 1
if anc == workspace then break end local okM, isM = pcall(function() return anc:IsA("Model") end)
if okM and isM and OT.Candidate(anc) and OT.SharedNameMatch(inst, anc) then covered = true break end anc = anc.Parent end
if covered then OT._skipped = OT._skipped + 1 return end
local okP2, pos = pcall(function() return inst.Position end) local d = 0 if okP2 and pos and OT._myPos then d = (pos - OT._myPos).Magnitude end
if OT.maxDist <= 0 or d <= OT.maxDist then OT._hits[#OT._hits + 1] = { inst = inst, part = inst, dist = d } end return
end local okM, isM = pcall(function() return inst:IsA("Model") end)
local okF, isF = false, false if not (okM and isM) then okF, isF = pcall(function() return inst:IsA("Folder") end) end if not ((okM and isM) or (okF and isF)) then return end
local part = OT.PartOf(inst) if part == nil or part.Parent == nil then return end
local okP3, pos = pcall(function() return part.Position end) local d = 0
if okP3 and pos and OT._myPos then d = (pos - OT._myPos).Magnitude end if OT.maxDist <= 0 or d <= OT.maxDist then
OT._hits[#OT._hits + 1] = { inst = inst, part = part, dist = d } end end
function OT.ScanSlice(budget, msCap, runToEnd) if not OT._passing then return true end
budget = tonumber(budget) or tonumber(OT.scanBudget) or 180 msCap = tonumber(msCap) or tonumber(OT.scanSliceMs) or 1.2
local t0 = os.clock() local done = 0 while OT._qN > 0 do local inst = OT._queue[OT._qN] OT._queue[OT._qN] = nil OT._qN = OT._qN - 1
local okK, kids = pcall(function() return inst:GetChildren() end)
if okK and type(kids) == "table" then for i = 1, #kids do OT._qN = OT._qN + 1 OT._queue[OT._qN] = kids[i]
end end if inst ~= workspace then OT._scanned = OT._scanned + 1 if OT.Candidate(inst) and not OT.Skip(inst) then
OT.ScanHit(inst) end end done = done + 1 if not runToEnd and (done >= budget or (os.clock() - t0) * 1000 > msCap) then
return false
end end OT.ScanFinish() return true end function OT.ScanFinish() OT._passing = false
local hits = OT._hits or {} table.sort(hits, function(a, b) return a.dist < b.dist end)
local maxN = math.max(1, tonumber(OT.maxItems) or 60) local keep, list = {}, {} local n = 0 for i = 1, #hits do
local h = hits[i] local okV, alive = pcall(function() return h.inst.Parent ~= nil and h.part.Parent ~= nil end)
if okV and alive then n = n + 1 if n <= maxN then keep[h.inst] = true list[#list + 1] = h end end end for inst in pairs(OT.items) do
if not keep[inst] then OT.Kill(inst) end end OT._pending = {} for i = 1, #list do
local h = list[i] local it = OT.items[h.inst] if it == nil then OT._pending[#OT._pending + 1] = h else it.part = h.part end end OT.list = list
OT._found = #hits OT._capped = (#hits > #list) OT._scanMs = otRound((os.clock() - (OT._passT0 or os.clock())) * 1000) OT._lastScan = os.clock()
if OT.RefreshList then pcall(OT.RefreshList) end return #hits end function OT.DrainPending(quota) local pend = OT._pending
if pend == nil or #pend == 0 then return 0 end quota = tonumber(quota) or tonumber(OT.makeBudget) or 8
local made = 0 while quota > 0 and #pend > 0 do
local h = table.remove(pend, 1) if h ~= nil then local okV, alive = pcall(function() return h.inst.Parent ~= nil and h.part.Parent ~= nil end)
if okV and alive and OT.items[h.inst] == nil then pcall(OT.Make, h.inst, h.part) made = made + 1 end end quota = quota - 1 end return made end
function OT.Rescan(force) if not OT.on and not (force and (#OT.keys > 0 or #(OT.pathKeys or {}) > 0)) then return 0 end
if not force and (os.clock() - (OT._lastScan or 0)) < OT.rescanEvery then return OT._found or 0 end pcall(OT.ScanBegin)
if not OT._passing then return OT._found or 0 end
OT.ScanSlice(1e9, 1e9, true)
if OT._passing then OT.ScanFinish() end
OT.DrainPending(1e9)
return OT._found or 0 end function OT.Step(dt) local step = tonumber(dt) or 0.016
local hasKeys = OT.on and (#OT.keys > 0 or #(OT.pathKeys or {}) > 0) local isPlayerTab = true local isMenuOpen = true if S.PagePerf then
isMenuOpen = S.PagePerf.IsMainVisible() local pt = D and D.playerTab if pt then isPlayerTab = S.PagePerf.IsTabVisible(pt)
end end local isFast = OT._fastUntil and tick() < OT._fastUntil local tickInterval = OT.labelEvery or 0.12
if isFast then
tickInterval = 0.06
elseif not hasKeys then tickInterval = tickInterval * 3 elseif not isMenuOpen then tickInterval = tickInterval * 2.5
elseif not isPlayerTab then tickInterval = tickInterval * 1.8 end OT._acc = (OT._acc or 0) + step
if OT._acc >= tickInterval then OT._acc = 0 pcall(OT.Tick) end
if hasKeys then local scanIdle = OT.scanIdle or 1.0 if isFast then
scanIdle = 0.3
elseif not isMenuOpen then
scanIdle = scanIdle * 1.5
elseif not isPlayerTab then
scanIdle = scanIdle * 1.2
end if OT._pending ~= nil and #OT._pending > 0 then local drainQuota if isFast then
drainQuota = nil
else drainQuota = isMenuOpen and (isPlayerTab and nil or 5) or 2 end pcall(OT.DrainPending, drainQuota)
end if not OT._passing then OT._scanAcc = (OT._scanAcc or 0) + step if OT._scanAcc >= scanIdle then
OT._scanAcc = 0 pcall(OT.ScanBegin) end end
if OT._passing then pcall(OT.ScanSlice) end else
if OT._pending ~= nil and #OT._pending > 0 then OT._scanAcc = (OT._scanAcc or 0) + step if OT._scanAcc >= 0.5 then OT._scanAcc = 0
pcall(OT.DrainPending, 5) end end end
end function OT.OnPerfTick() end function OT.Bind() if OT._bound then return end
OT._bound = true pcall(function() RunService:BindToRenderStep("BC_ObjTrack", Enum.RenderPriority.Camera.Value - 6, function(dt) pcall(OT.Step, dt)
end) end) end function OT.Unbind() OT._bound = false
pcall(function() RunService:UnbindFromRenderStep("BC_ObjTrack") end) end function OT.Set(on) on = on and true or false
if on and #OT.keys == 0 then OT.on = false OT.Unbind() OT.Clear()
pcall(function() if S.Move and S.Move.StopObjectFly then S.Move.StopObjectFly() end end) return false, "chưa nhập tên vật (ô 🔎 Tên vật)"
end OT.on = on if on then OT.Bind() OT.Rescan(true) return true end OT.Clear() OT.Unbind()
pcall(function() if S.Move and S.Move.StopObjectFly then S.Move.StopObjectFly() end end) if OT.RefreshList then pcall(OT.RefreshList) end
return false end function OT.Toggle() return OT.Set(not OT.on) end function OT.SetQuery(q) OT.query = tostring(q or "")
OT.RebuildKeys()
OT._fastUntil = tick() + 4 S.Debounce("objtrack", 0.2, function() if #OT.keys == 0 and #(OT.pathKeys or {}) == 0 then
if OT.on then OT.Set(false) end OT.Clear() if OT.RefreshList then pcall(OT.RefreshList) end return end OT.on = true
OT._fastUntil = tick() + 4
OT.Bind() local n = OT.Rescan(true) if n == 0 then pcall(function()
if D.Say then D.Say("⚠️ không thấy vật nào khớp \"" .. tostring(OT.query) .. "\" — thử tên ngắn hơn (VD: cây)", C.RED) end end)
end if OT.RefreshList then pcall(OT.RefreshList) end end) return OT.keys end
function OT.SetMaxDist(n) local v = tonumber(n) or 0 if v ~= v or v < 0 then v = 0 end if v > 100000 then v = 100000 end
OT.maxDist = v if OT.on then OT.Rescan(true) end return OT.maxDist end
function OT.CycleColor() OT.color = ((tonumber(OT.color) or 1) % #OT.palette) + 1 OT.ApplyStyle() return OT.Pal().name
end function OT.ApplyStyle() local pal = OT.Pal()
for _, it in pairs(OT.items) do if it.hl then it.hl.FillColor = pal.fill it.hl.OutlineColor = pal.out
pcall(function() it.hl.DepthMode = OT.thru and Enum.HighlightDepthMode.AlwaysOnTop or Enum.HighlightDepthMode.Occluded end) end
if it.bb then it.bb.AlwaysOnTop = OT.thru it.bb.Enabled = OT.showLabel end
if it.lbl then it.lbl.TextColor3 = pal.out end if OT.showBox and it.box == nil and it.part then
it.box = OT._MakeBox(it.part, pal) elseif it.box then it.box.Visible = OT.showBox it.box.Color3 = pal.fill
end end end function OT.Nearest() local best, bestH = nil, nil for i = 1, #OT.list do local h = OT.list[i]
if h.part and h.part.Parent and h.inst.Parent then if best == nil or h.dist < best then best, bestH = h.dist, h end end end
return bestH and bestH.inst or nil, bestH end
function OT.Status() if #OT.keys == 0 and #(OT.pathKeys or {}) == 0 then return "🌳 Định vị vật: chưa nhập tên" end
local n = 0 for _ in pairs(OT.items) do n = n + 1 end
if n == 0 and (OT._found or 0) == 0 then return "⚠️ không thấy vật nào khớp \"" .. tostring(OT.query)
.. "\" (đã quét " .. tostring(OT._scanned or 0) .. " vật) — thử tên ngắn hơn (VD: cây) hoặc dán đúng path"
end local t = "🌳 " .. table.concat(OT.keys, " + ") if #OT.entries > 0 then t = t .. " （" .. #OT.entries .. " mục đã ghim）" end
t = t .. " · theo " .. n .. "/" .. (OT._found or 0) .. " vật" if (OT._skipped or 0) > 0 then t = t .. " (gộp " .. OT._skipped .. " part con)" end
if OT._capped then t = t .. " (gần nhất " .. tostring(OT.maxItems) .. ")" end if OT.maxDist > 0 then t = t .. " · ≤" .. otRound(OT.maxDist) .. "m" end
if (OT._scanMs or 0) > 0 then t = t .. " · quét " .. OT._scanMs .. "ms" end if S.Move and S.Move._objFlyActive and S.Move._objFlyTarget then
t = t .. " · 🚀 bay tới " .. tostring(S.Move._objFlyTarget.Name) end if OT._err then t = t .. " · ⚠️ " .. OT._err end return t end
function OT.OnFlyChange() if OT.RefreshList then pcall(OT.RefreshList) end end end
(function() local OT = S.ObjTrack
local function otRound(n) return math.floor((tonumber(n) or 0) + 0.5) end local function otAlive(inst) return inst ~= nil and inst.Parent ~= nil end
local P = New("Frame", { Name = "HubObjTrack_Panel", Size = UDim2.new(1, -16, 0, 452), Position = UDim2.new(0, 8, 0, D.playerY or 46),
LayoutOrder = 4, BackgroundColor3 = C.SURFACE, BackgroundTransparency = 0.12, BorderSizePixel = 0, ZIndex = 6,
}, D.playerTab) D.playerY = (D.playerY or 46) + 452 + 8
Corner(P, UDim.new(0, 10)) Stroke(P, C.HAIRLINE, 1) D.Shade(P, Color3.fromRGB(255, 255, 255), Color3.fromRGB(188, 192, 205), 90)
New("TextLabel", { Size = UDim2.new(1, -16, 0, 14), Position = UDim2.new(0, 8, 0, 4),
Text = "🌳 ĐỊNH VỊ VẬT THEO TÊN (nhập tên là thấy MỌI vật khớp · 💾 Lưu nhiều lần · 🔄 Chuyển đổi)", BackgroundTransparency = 1, TextColor3 = C.ACCENT, Font = Enum.Font.GothamBold, TextSize = 10,
TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, P)
New("TextLabel", { Size = UDim2.new(1, -16, 0, 22), Position = UDim2.new(0, 8, 0, 20),
Text = "Gõ tên vật vào ô 🔎 rồi bấm 💾 Lưu (lưu được nhiều lần). Khi đã lưu sẽ có nút 🔄 Chuyển đổi: bấm vào để xem danh sách đã lưu, bấm lần nữa để chuyển sang các vật phẩm định vị được trong server.", TextWrapped = true, BackgroundTransparency = 1, TextColor3 = C.MUTED,
Font = Enum.Font.GothamMedium, TextSize = 8, TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top, ZIndex = 7, }, P)
local function otAct(txt, x, y, w, color) local b = New("TextButton", {
Size = UDim2.new(0, w, 0, 18), Position = UDim2.new(0, x, 0, y), Text = txt, BackgroundColor3 = color, TextColor3 = D.BestText(color),
Font = Enum.Font.GothamBold, TextSize = 8, BorderSizePixel = 0, ZIndex = 8, }, P)
Corner(b, UDim.new(0, 5)) D.Shade(b, Color3.fromRGB(255, 255, 255), Color3.fromRGB(182, 187, 201), 90) D.Tactile(b, 0.08) return b end
local function otLab(txt, x, y, w) New("TextLabel", {
Size = UDim2.new(0, w, 0, 18), Position = UDim2.new(0, x, 0, y), Text = txt, BackgroundTransparency = 1, TextColor3 = C.MUTED,
Font = Enum.Font.GothamMedium, TextSize = 9, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, P) end
local function otInput(txt, x, y, w, ph) local box = New("TextBox", { Size = UDim2.new(0, w, 0, 18), Position = UDim2.new(0, x, 0, y),
Text = txt, PlaceholderText = ph or "", ClearTextOnFocus = false, BackgroundColor3 = C.SURFACE2, BackgroundTransparency = 0.1, TextColor3 = C.DARK,
PlaceholderColor3 = C.GRAY, Font = Enum.Font.GothamMedium, TextSize = 9, TextXAlignment = Enum.TextXAlignment.Left, BorderSizePixel = 0, ZIndex = 7,
}, P) Corner(box, UDim.new(0, 5)) New("UIPadding", { PaddingLeft = UDim.new(0, 6) }, box) return box end
otLab("🔎 Tên vật:", 8, 46, 58) local queryIn = otInput(S.ObjTrack.query or "", 68, 46, 170, "VD: cây, đá, rương...")
local saveBtn = otAct("💾 Lưu", 242, 46, 54, C.BLUE) saveBtn.Name = "OTSaveBtn"
local toggleBtn = otAct("🌳 Định vị: TẮT", 300, 46, 102, C.GREEN) local rescanBtn = otAct("🔄 Quét lại", 406, 46, 86, C.BLUE)
local boxBtn = otAct("🔲 Hộp: TẮT", 8, 70, 74, C.SURFACE3) local thruBtn = otAct("🕶 Xuyên tường: BẬT", 86, 70, 112, C.GREEN)
local labelBtn = otAct("💬 Nhãn: BẬT", 202, 70, 82, C.GREEN) local colorBtn = otAct("🎨 " .. S.ObjTrack.Pal().name, 288, 70, 118, C.PURPLE)
local clearBtn = otAct("🧹 Xoá hết", 410, 70, 82, C.RED)
otLab("📏 Xa nhất:", 8, 94, 66) local distIn = otInput(S.ObjTrack.maxDist > 0 and tostring(S.ObjTrack.maxDist) or "0", 74, 94, 44, "0")
local distApply = otAct("✅ Đặt", 122, 94, 44, C.SURFACE3) local flyBtn = otAct("🚀 Bay tới gần nhất", 170, 94, 116, C.ACCENT)
local flyStop = otAct("⏹ Dừng bay", 290, 94, 72, C.SURFACE3) otLab("🚀 Tốc độ:", 368, 94, 58)
local speedIn = otInput(tostring(S.Move.objectFlySpeed or 60), 428, 94, 44, "60") local speedApply = otAct("✅", 476, 94, 34, C.GREEN)
local statusLbl = New("TextLabel", { Size = UDim2.new(1, -16, 0, 16), Position = UDim2.new(0, 8, 0, 118),
Text = S.ObjTrack.Status(), BackgroundTransparency = 1, TextColor3 = C.ACCENT, Font = Enum.Font.GothamBold, TextSize = 9,
TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, P)
local xyzBtn = otAct("🧭 Nhãn toạ độ: BẬT", 8, 138, 128, C.GREEN) local skipBtn = otAct("🚫 Bỏ qua người chơi: BẬT", 140, 138, 146, C.GREEN)
local switchModeBtn = otAct("🔄 Chuyển Đổi: Đã Lưu (0)", 290, 138, 202, C.YELLOW) switchModeBtn.Name = "OTSwitchBtn"
switchModeBtn.Visible = (#(S.ObjTrack.savedList or {}) > 0)
S.ObjTrack.BuildTagsUI = function() local tagsY = 162 local addBtn = otAct("➕ Thêm mục", 8, tagsY, 96, C.ACCENT) addBtn.Name = "OTAdd"
local tags = New("ScrollingFrame", { Name = "OTTags",
Size = UDim2.new(1, -118, 0, 24), Position = UDim2.new(0, 108, 0, tagsY), BackgroundColor3 = C.SURFACE2, BackgroundTransparency = 0.25, BorderSizePixel = 0,
ScrollBarThickness = 3, CanvasSize = UDim2.new(0, 0, 0, 0), ZIndex = 7, ScrollingDirection = Enum.ScrollingDirection.X,
}, P) Corner(tags, UDim.new(0, 6)) New("UIListLayout", { Padding = UDim.new(0, 4), FillDirection = Enum.FillDirection.Horizontal,
SortOrder = Enum.SortOrder.LayoutOrder, VerticalAlignment = Enum.VerticalAlignment.Center, }, tags) New("UIPadding", { PaddingLeft = UDim.new(0, 6), PaddingRight = UDim.new(0, 6), PaddingTop = UDim.new(0, 4) }, tags)
local function refreshTags() if not (tags and tags.Parent) then return end local entries = S.ObjTrack.entries or {} local sig = {}
for i = 1, #entries do sig[i] = tostring(entries[i].kind) .. ":" .. tostring(entries[i].raw) end sig = table.concat(sig, "|")
if sig == S.ObjTrack._tagSig then return end
S.ObjTrack._tagSig = sig for _, ch in ipairs(tags:GetChildren()) do
if not ch:IsA("UIListLayout") and not ch:IsA("UIPadding") then pcall(function() ch:Destroy() end) end end
if #entries == 0 then New("TextLabel", { Name = "OTTagHint", Size = UDim2.new(1, -8, 0, 16),
Text = "chưa ghim mục nào — gõ tên/path rồi Enter (hoặc bấm ➕ Thêm mục) để chạy NHIỀU mục cùng lúc", BackgroundTransparency = 1, TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium,
TextSize = 8, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 8, }, tags)
pcall(function() tags.CanvasSize = UDim2.new(0, 0, 0, 0) end) return end local w = 0 for i = 1, #entries do
local e = entries[i] local txt = tostring(e.raw)
local short = (#txt > 30) and (txt:sub(1, 27) .. "...") or txt local label = ((e.kind == "path") and "📁 " or "🏷 ") .. short
local width = math.max(54, math.min(200, 26 + #label * 5)) local bg = (e.kind == "path") and C.BLUE or C.SURFACE3 local tag = New("TextButton", {
Name = "OTTag_" .. tostring(i), Size = UDim2.new(0, width, 0, 16), LayoutOrder = i,
Text = "✕ " .. label, BackgroundColor3 = bg, TextColor3 = D.BestText(bg), Font = Enum.Font.GothamBold, TextSize = 8, BorderSizePixel = 0, ZIndex = 8,
TextTruncate = Enum.TextTruncate.AtEnd, }, tags) Corner(tag, UDim.new(0, 4)); D.Tactile(tag, 0.08)
tag.Activated:Connect(function() ReleaseHubFocus() local okR, raw = S.ObjTrack.RemoveEntry(i) if okR then
D.Say("🗑 đã xoá mục '" .. tostring(raw) .. "' — các mục còn lại vẫn chạy", C.YELLOW) else
D.Say("⚠️ " .. tostring(raw), C.RED) end pcall(S.ObjTrack.RefreshTags) pcall(S.ObjTrack.RefreshList) end)
w = w + width + 4 end pcall(function() tags.CanvasSize = UDim2.new(0, w + 20, 0, 0) end) end S.ObjTrack.RefreshTags = refreshTags
addBtn.Activated:Connect(function() ReleaseHubFocus() local raw = tostring(queryIn.Text or "") local okA, kindOrWhy = S.ObjTrack.AddEntry(raw)
if okA then queryIn.Text = "" S.ObjTrack.SetQuery("") D.Say("➕ đã thêm mục '" .. raw .. "' — đang chạy cùng " ..
tostring(#S.ObjTrack.entries) .. " mục", C.GREEN) else D.Say("⚠️ " .. tostring(kindOrWhy), C.RED) end
pcall(S.ObjTrack.RefreshTags) pcall(S.ObjTrack.RefreshList) end) end S.ObjTrack.BuildTagsUI()
local list = New("ScrollingFrame", { Name = "ObjTrackList", Size = UDim2.new(1, -16, 0, 94), Position = UDim2.new(0, 8, 0, 194),
BackgroundTransparency = 1, BorderSizePixel = 0, ScrollBarThickness = 4, CanvasSize = UDim2.new(0, 0, 0, 0), ZIndex = 7,
}, P) New("UIListLayout", { Padding = UDim.new(0, 3), SortOrder = Enum.SortOrder.LayoutOrder }, list)
S.ObjTrack.BuildInfoUI = function() local info = New("Frame", {
Name = "OTInfo", Size = UDim2.new(1, -16, 0, 148), Position = UDim2.new(0, 8, 0, 296),
BackgroundColor3 = Color3.fromRGB(20, 25, 35), BackgroundTransparency = 0, BorderSizePixel = 0, ZIndex = 7, Visible = false,
}, P) Corner(info, UDim.new(0, 6)) Stroke(info, C.BLUE, 1.5) New("TextLabel", { Size = UDim2.new(1, -16, 0, 16), Position = UDim2.new(0, 8, 0, 4),
Text = "🎯 VẬT THỂ ĐƯỢC CHỌN (giống khung phân tích toạ độ — bấm 📊 ở danh sách)", TextColor3 = Color3.fromRGB(150, 210, 255), Font = Enum.Font.GothamBold, TextSize = 9,
BackgroundTransparency = 1, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 8, }, info)
local infoLbl = New("TextLabel", { Size = UDim2.new(1, -16, 0, 104), Position = UDim2.new(0, 8, 0, 22), Text = "bấm 📊 ở 1 dòng trong danh sách để xem toạ độ vật đó",
TextColor3 = Color3.fromRGB(255, 255, 255), Font = Enum.Font.Code, TextSize = 10, BackgroundTransparency = 1, TextXAlignment = Enum.TextXAlignment.Left,
TextYAlignment = Enum.TextYAlignment.Top, TextWrapped = true, ZIndex = 8, }, info)
local copyPosBtn = New("TextButton", { Size = UDim2.new(0, 96, 0, 16), Position = UDim2.new(0, 8, 0, 128),
Text = "📋 Copy Tọa Độ", BackgroundColor3 = C.BLUE, TextColor3 = D.BestText(C.BLUE), Font = Enum.Font.GothamBold, TextSize = 8, BorderSizePixel = 0, ZIndex = 9, }, info)
Corner(copyPosBtn, UDim.new(0, 4)); D.Tactile(copyPosBtn, 0.08) local copyPathBtn = New("TextButton", {
Size = UDim2.new(0, 96, 0, 16), Position = UDim2.new(0, 110, 0, 128), Text = "📋 Copy Path", BackgroundColor3 = C.PURPLE, TextColor3 = D.BestText(C.PURPLE),
Font = Enum.Font.GothamBold, TextSize = 8, BorderSizePixel = 0, ZIndex = 9, }, info) Corner(copyPathBtn, UDim.new(0, 4)); D.Tactile(copyPathBtn, 0.08)
local function refreshInfo() local sel, part = OT._sel, OT._selPart if sel == nil or not otAlive(sel) then OT._sel, OT._selPart = nil, nil
info.Visible = false return end if part == nil or not otAlive(part) then
part = OT.PartOf(sel) OT._selPart = part end local rows = OT.Info(sel, part)
local out = {} for i = 1, #rows do out[i] = rows[i].k .. ": " .. rows[i].v end local txt = table.concat(out, "\n")
if infoLbl.Text ~= txt then infoLbl.Text = txt end
info.Visible = true end OT.RefreshInfo = refreshInfo infoLbl.Name, copyPosBtn.Name, copyPathBtn.Name = "OTInfoLbl", "OTCopyPos", "OTCopyPath"
copyPosBtn.Activated:Connect(function() ReleaseHubFocus()
local did, txt = OT.CopyCoords() D.Say(did and ("📋 đã copy toạ độ: " .. tostring(txt)) or ("⚠️ " .. tostring(txt)),
did and C.GREEN or C.RED) end) copyPathBtn.Activated:Connect(function() ReleaseHubFocus() local did, txt = OT.CopyPath()
D.Say(did and ("📋 đã copy path: " .. tostring(txt)) or ("⚠️ " .. tostring(txt)), did and C.GREEN or C.RED) end) end S.ObjTrack.BuildInfoUI()
queryIn.Name, toggleBtn.Name, rescanBtn.Name = "OTQuery", "OTToggle", "OTRescan" statusLbl.Name, clearBtn.Name = "OTStatus", "OTClear"
xyzBtn.Name, skipBtn.Name = "OTXyz", "OTSkip" local function paint() toggleBtn.Text = OT.on and "🌳 Định vị: BẬT" or "🌳 Định vị: TẮT"
toggleBtn.BackgroundColor3 = OT.on and C.GREEN or C.SURFACE3 toggleBtn.TextColor3 = D.BestText(toggleBtn.BackgroundColor3)
boxBtn.Text = OT.showBox and "🔲 Hộp: BẬT" or "🔲 Hộp: TẮT" boxBtn.BackgroundColor3 = OT.showBox and C.GREEN or C.SURFACE3
boxBtn.TextColor3 = D.BestText(boxBtn.BackgroundColor3) thruBtn.Text = OT.thru and "🕶 Xuyên tường: BẬT" or "🕶 Xuyên tường: TẮT"
thruBtn.BackgroundColor3 = OT.thru and C.GREEN or C.SURFACE3 thruBtn.TextColor3 = D.BestText(thruBtn.BackgroundColor3)
labelBtn.Text = OT.showLabel and "💬 Nhãn: BẬT" or "💬 Nhãn: TẮT" labelBtn.BackgroundColor3 = OT.showLabel and C.GREEN or C.SURFACE3 labelBtn.TextColor3 = D.BestText(labelBtn.BackgroundColor3)
colorBtn.Text = "🎨 " .. OT.Pal().name xyzBtn.Text = OT.showXYZ and "🧭 Nhãn toạ độ: BẬT" or "🧭 Nhãn toạ độ: TẮT"
xyzBtn.BackgroundColor3 = OT.showXYZ and C.GREEN or C.SURFACE3 xyzBtn.TextColor3 = D.BestText(xyzBtn.BackgroundColor3)
skipBtn.Text = OT.skipPlayers and "🚫 Bỏ qua người chơi: BẬT" or "🚫 Bỏ qua người chơi: TẮT" skipBtn.BackgroundColor3 = OT.skipPlayers and C.GREEN or C.SURFACE3
skipBtn.TextColor3 = D.BestText(skipBtn.BackgroundColor3)
local sCnt = #(OT.savedList or {}) switchModeBtn.Visible = (sCnt > 0)
if OT.viewMode == "saved" then
switchModeBtn.Text = "🔄 Chuyển Sang: Vật Trong SV (" .. tostring(#OT.list) .. ")"
switchModeBtn.BackgroundColor3 = C.GREEN switchModeBtn.TextColor3 = D.BestText(C.GREEN)
else
switchModeBtn.Text = "🔄 Chuyển Đổi: Đã Lưu (" .. tostring(sCnt) .. ")"
switchModeBtn.BackgroundColor3 = C.YELLOW switchModeBtn.TextColor3 = D.BestText(C.YELLOW)
end
local flying = (S.Move and S.Move._objFlyActive == true)
flyStop.BackgroundColor3 = flying and C.RED or C.SURFACE3 flyStop.TextColor3 = D.BestText(flyStop.BackgroundColor3)
statusLbl.Text = OT.Status() statusLbl.TextColor3 = OT.on and C.GREEN or C.ACCENT end
S.ObjTrack.RefreshList = function() if not (list and list.Parent) then return end
paint() if not (D.playerTab and D.playerTab.Visible) then return end
if OT.viewMode == "saved" then
local sList = OT.savedList or {} local sigParts = { "SAVED" }
for i = 1, #sList do sigParts[#sigParts + 1] = tostring(sList[i].id or i) .. ":" .. tostring(sList[i].title or "") end
local sig = table.concat(sigParts, "#")
if sig ~= OT._rowSig then OT._rowSig = sig
for _, child in ipairs(list:GetChildren()) do if not child:IsA("UIListLayout") then pcall(function() child:Destroy() end) end end
for i = 1, #sList do local item = sList[i] local idx = i
local row = New("Frame", { Name = "OTSavedRow_" .. tostring(idx), Size = UDim2.new(1, 0, 0, 24), LayoutOrder = idx,
BackgroundColor3 = C.SURFACE2, BackgroundTransparency = 0.18, BorderSizePixel = 0, ZIndex = 8, }, list)
Corner(row, UDim.new(0, 5)) Stroke(row, C.ACCENT, 1)
New("TextLabel", { Name = "OTSavedLabel_" .. tostring(idx), Size = UDim2.new(1, -184, 1, 0), Position = UDim2.new(0, 7, 0, 0),
Text = string.format("💾 #%d  %s", idx, tostring(item.title or item.query or "Mục lưu")),
BackgroundTransparency = 1, TextColor3 = C.DARK, Font = Enum.Font.GothamBold, TextSize = 8, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 9, }, row)
local useBtn = New("TextButton", { Name = "OTSavedUse_" .. tostring(idx), Size = UDim2.new(0, 86, 0, 18), Position = UDim2.new(1, -178, 0, 3),
Text = "🎯 Sang Vật SV", BackgroundColor3 = C.GREEN, TextColor3 = D.BestText(C.GREEN), Font = Enum.Font.GothamBold, TextSize = 8, BorderSizePixel = 0, ZIndex = 9, }, row)
Corner(useBtn, UDim.new(0, 4)); D.Tactile(useBtn, 0.08) useBtn.Activated:Connect(function() ReleaseHubFocus()
local okU, it = S.ObjTrack.UseSaved(idx, false) S.ObjTrack.ToggleViewMode("server")
if okU then D.Say("🎯 đang định vị '" .. tostring(it.title or it.query) .. "' — đã chuyển sang danh sách vật trong server!", C.GREEN) end end)
local addSavedBtn = New("TextButton", { Name = "OTSavedAdd_" .. tostring(idx), Size = UDim2.new(0, 52, 0, 18), Position = UDim2.new(1, -88, 0, 3),
Text = "➕ Ghim", BackgroundColor3 = C.ACCENT, TextColor3 = D.BestText(C.ACCENT), Font = Enum.Font.GothamBold, TextSize = 8, BorderSizePixel = 0, ZIndex = 9, }, row)
Corner(addSavedBtn, UDim.new(0, 4)); D.Tactile(addSavedBtn, 0.08) addSavedBtn.Activated:Connect(function() ReleaseHubFocus()
local okU, it = S.ObjTrack.UseSaved(idx, true)
if okU then D.Say("➕ đã ghim '" .. tostring(it.title or it.query) .. "' — bấm 🔄 Chuyển Sang: Vật Trong SV để xem!", C.GREEN) end end)
local delSavedBtn = New("TextButton", { Name = "OTSavedDel_" .. tostring(idx), Size = UDim2.new(0, 26, 0, 18), Position = UDim2.new(1, -32, 0, 3),
Text = "✕", BackgroundColor3 = C.RED, TextColor3 = D.BestText(C.RED), Font = Enum.Font.GothamBold, TextSize = 8, BorderSizePixel = 0, ZIndex = 9, }, row)
Corner(delSavedBtn, UDim.new(0, 4)); D.Tactile(delSavedBtn, 0.08) delSavedBtn.Activated:Connect(function() ReleaseHubFocus()
local okD, it = S.ObjTrack.RemoveSaved(idx) if okD then D.Say("🗑 đã xoá mục lưu #" .. tostring(idx), C.YELLOW) end end)
end pcall(function() list.CanvasSize = UDim2.new(0, 0, 0, math.max(0, #sList * 27)) end) end
return
end
local shown = math.max(0, math.min(#OT.list, tonumber(OT.showRows) or 8))
local sigParts = {} for i = 1, shown do local h = OT.list[i] sigParts[i] = tostring(h.inst.Name) .. "|" .. tostring(h.inst)
end local sig = table.concat(sigParts, "#")
if #OT.list == 0 then sig = "EMPTY:" .. tostring(OT.query) .. ":" .. tostring(OT._scanned or 0) end if sig ~= OT._rowSig then
OT._rowSig = sig for _, child in ipairs(list:GetChildren()) do
if not child:IsA("UIListLayout") then pcall(function() child:Destroy() end) end end if #OT.list == 0 then New("TextLabel", { Name = "OTEmpty",
Size = UDim2.new(1, 0, 0, 60), LayoutOrder = 1, Text = "⚠️ Không có vật nào khớp \"" .. tostring(OT.query) .. "\"\n"
.. "Đã quét " .. tostring(OT._scanned or 0) .. " vật trong Workspace.\n" .. "Thử tên ngắn hơn (VD: cây) hoặc dán đúng Path (VD: Workspace.Rừng Cây).",
TextWrapped = true, BackgroundColor3 = C.SURFACE2, BackgroundTransparency = 0.15, TextColor3 = C.RED, Font = Enum.Font.GothamMedium, TextSize = 9,
BorderSizePixel = 0, ZIndex = 8, TextXAlignment = Enum.TextXAlignment.Left, }, list) end for i = 1, shown do local h = OT.list[i]
local inst = h.inst local row = New("Frame", { Name = "OTRow_" .. tostring(i), Size = UDim2.new(1, 0, 0, 24), LayoutOrder = i,
BackgroundColor3 = C.SURFACE2, BackgroundTransparency = 0.18, BorderSizePixel = 0, ZIndex = 8, }, list)
Corner(row, UDim.new(0, 5)) Stroke(row, (S.Move and S.Move._objFlyTarget == inst) and C.ACCENT or C.BORDER, 1) New("TextLabel", { Name = "OTName",
Size = UDim2.new(1, -196, 1, 0), Position = UDim2.new(0, 7, 0, 0), Text = string.format("#%d  %s  (%s, %dm)", i, tostring(inst.Name),
tostring(inst.ClassName or "?"), otRound(h.dist)), BackgroundTransparency = 1, TextColor3 = C.DARK, Font = Enum.Font.GothamBold,
TextSize = 8, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 9, }, row) local infoRow = New("TextButton", {
Name = "OTInfoRow", Size = UDim2.new(0, 48, 0, 18), Position = UDim2.new(1, -190, 0, 3),
Text = "📊 Xem", BackgroundColor3 = C.BLUE, TextColor3 = D.BestText(C.BLUE), Font = Enum.Font.GothamBold, TextSize = 8, BorderSizePixel = 0, ZIndex = 9,
}, row) Corner(infoRow, UDim.new(0, 4)); D.Tactile(infoRow, 0.08) infoRow.Activated:Connect(function() ReleaseHubFocus() S.ObjTrack.Select(inst)
D.Say("📊 đang xem '" .. tostring(inst.Name) .. "' — số liệu cập nhật theo vật", C.BLUE) pcall(S.ObjTrack.RefreshList)
end) local flyRow = New("TextButton", { Name = "OTFlyRow", Size = UDim2.new(0, 62, 0, 18), Position = UDim2.new(1, -138, 0, 3),
Text = "🚀 Bay", BackgroundColor3 = C.ACCENT, TextColor3 = D.BestText(C.ACCENT), Font = Enum.Font.GothamBold, TextSize = 8, BorderSizePixel = 0, ZIndex = 9, }, row)
Corner(flyRow, UDim.new(0, 4)); D.Tactile(flyRow, 0.08) flyRow.Activated:Connect(function()
ReleaseHubFocus() local ok, res = S.Move.FlyToObject(inst)
if ok then D.Say("🚀 đang bay tới '" .. tostring(inst.Name) .. "' · bấm ⏹ Dừng bay để dừng", C.GREEN) else D.Say("⚠️ " .. tostring(res), C.RED)
end pcall(S.ObjTrack.RefreshList) end) local copyRow = New("TextButton", { Name = "OTCopyRow",
Size = UDim2.new(0, 64, 0, 18), Position = UDim2.new(1, -70, 0, 3), Text = "📋 Tên", BackgroundColor3 = C.SURFACE3, TextColor3 = D.BestText(C.SURFACE3),
Font = Enum.Font.GothamBold, TextSize = 8, BorderSizePixel = 0, ZIndex = 9, }, row)
Corner(copyRow, UDim.new(0, 4)); D.Tactile(copyRow, 0.08) copyRow.Activated:Connect(function() ReleaseHubFocus()
local did = S.CopyToClipboard(tostring(inst.Name)) D.Say(did and ("📋 đã copy tên '" .. tostring(inst.Name) .. "'")
or "⚠️ executor không có setclipboard", did and C.GREEN or C.RED) end)
end pcall(function() list.CanvasSize = UDim2.new(0, 0, 0, math.max(0, shown * 27)) end) end end
S.OpenObjectPanel = function() local ok = S.OpenPlayerTab and S.OpenPlayerTab() or false
if S.ObjTrack.RefreshTags then pcall(S.ObjTrack.RefreshTags) end pcall(S.ObjTrack.RefreshList) return ok end
S.ObjTrack.Focus = function() if S.OpenObjectPanel then pcall(S.OpenObjectPanel) end
pcall(function() if queryIn and queryIn.Parent then queryIn:CaptureFocus() end end) end
saveBtn.Activated:Connect(function() ReleaseHubFocus() local raw = tostring(queryIn.Text or "")
local okS, item, idx = S.ObjTrack.Save(raw, false)
if okS then queryIn.Text = "" S.ObjTrack.query = "" paint()
D.Say("💾 đã lưu lần #" .. tostring(idx) .. ": '" .. tostring(item.title) .. "' — bấm 🔄 Chuyển Đổi để xem mục đã lưu hoặc chuyển sang vật trong SV!", C.GREEN)
else D.Say("⚠️ " .. tostring(item), C.RED) end end)
switchModeBtn.Activated:Connect(function() ReleaseHubFocus() local mode = S.ObjTrack.ToggleViewMode()
if mode == "saved" then
D.Say("🔄 đang hiển thị " .. tostring(#(S.ObjTrack.savedList or {})) .. " mục định vị vật đã lưu — bấm 🔄 lần nữa để chuyển sang vật phẩm trong server!", C.YELLOW)
else
D.Say("🔄 đã chuyển sang hiển thị " .. tostring(#(S.ObjTrack.list or {})) .. " vật phẩm định vị được trong server!", C.GREEN)
end end)
queryIn:GetPropertyChangedSignal("Text"):Connect(function() S.ObjTrack.SetQuery(queryIn.Text) end)
queryIn.FocusLost:Connect(function(enterPressed) ReleaseHubFocus() if enterPressed then
local raw = tostring(queryIn.Text or "") local okA, kindOrWhy = S.ObjTrack.AddEntry(raw) if okA then queryIn.Text = ""
S.ObjTrack.SetQuery("") D.Say("➕ đã ghim mục '" .. raw .. "' (Enter) — đang chạy cùng " .. tostring(#S.ObjTrack.entries) .. " mục", C.GREEN) else
D.Say("⚠️ " .. tostring(kindOrWhy), C.RED) end pcall(S.ObjTrack.RefreshTags) pcall(S.ObjTrack.RefreshList) return
end S.ObjTrack.SetQuery(queryIn.Text) pcall(S.ObjTrack.RefreshList) end)
toggleBtn.Activated:Connect(function() ReleaseHubFocus() local ok, why = S.ObjTrack.Toggle()
if ok == false and why then D.Say("⚠️ " .. tostring(why), C.RED) else D.Say(S.ObjTrack.Status(), ok and C.GREEN or C.YELLOW)
end pcall(S.ObjTrack.RefreshList) end) rescanBtn.Activated:Connect(function() ReleaseHubFocus()
if #S.ObjTrack.keys == 0 then D.Say("⚠️ nhập tên vật trước đã (VD: cây)", C.RED) else local n = S.ObjTrack.Rescan(true)
D.Say("🔄 quét lại: thấy " .. tostring(n) .. " vật khớp · " .. S.ObjTrack.Status(), C.ACCENT) end pcall(S.ObjTrack.RefreshList) end)
boxBtn.Activated:Connect(function() ReleaseHubFocus() S.ObjTrack.showBox = not S.ObjTrack.showBox
S.ObjTrack.ApplyStyle() D.Say(S.ObjTrack.showBox and "🔲 hộp bao quanh vật: BẬT" or "🔲 hộp bao quanh vật: TẮT", C.YELLOW)
pcall(S.ObjTrack.RefreshList) end) thruBtn.Activated:Connect(function() ReleaseHubFocus()
S.ObjTrack.thru = not S.ObjTrack.thru S.ObjTrack.ApplyStyle() D.Say(S.ObjTrack.thru and "🕶 xuyên tường: BẬT (thấy cả vật sau tường)" or "🕶 xuyên tường: TẮT", C.YELLOW)
pcall(S.ObjTrack.RefreshList) end) labelBtn.Activated:Connect(function() ReleaseHubFocus()
S.ObjTrack.showLabel = not S.ObjTrack.showLabel S.ObjTrack.ApplyStyle()
D.Say(S.ObjTrack.showLabel and "💬 nhãn tên + khoảng cách: BẬT" or "💬 nhãn: TẮT (chỉ còn Highlight)", C.YELLOW) pcall(S.ObjTrack.RefreshList) end)
colorBtn.Activated:Connect(function() ReleaseHubFocus() local name = S.ObjTrack.CycleColor() D.Say("🎨 màu định vị: " .. tostring(name), C.ACCENT)
pcall(S.ObjTrack.RefreshList) end) clearBtn.Activated:Connect(function() ReleaseHubFocus()
local n = 0 for _ in pairs(S.ObjTrack.items) do n = n + 1 end local nE = #(S.ObjTrack.entries or {})
S.ObjTrack.ClearEntries() S.ObjTrack.Set(false)
D.Say("🧹 đã xoá " .. tostring(n) .. " định vị vật + " .. tostring(nE) .. " mục đã ghim", C.GREEN) pcall(S.ObjTrack.RefreshList)
end) distApply.Activated:Connect(function()
ReleaseHubFocus() local n = tonumber(tostring(distIn.Text or ""):match("%-?%d+%.?%d*")) or 0 local v = S.ObjTrack.SetMaxDist(n)
distIn.Text = tostring(otRound(v)) D.Say(v > 0 and ("📏 chỉ định vị vật trong " .. otRound(v) .. "m") or "📏 không giới hạn khoảng cách",
C.ACCENT) pcall(S.ObjTrack.RefreshList) end) distIn.FocusLost:Connect(function()
ReleaseHubFocus() local n = tonumber(tostring(distIn.Text or ""):match("%-?%d+%.?%d*")) or 0 distIn.Text = tostring(otRound(S.ObjTrack.SetMaxDist(n)))
pcall(S.ObjTrack.RefreshList) end) flyBtn.Activated:Connect(function() ReleaseHubFocus()
local target = select(1, S.ObjTrack.Nearest()) if not target then D.Say("⚠️ chưa có vật nào đang định vị — nhập tên vật trước", C.RED) else
local ok, res = S.Move.FlyToObject(target) if ok then D.Say("🚀 đang bay tới '" .. tostring(target.Name) .. "' · bấm ⏹ Dừng bay để dừng", C.GREEN)
else D.Say("⚠️ " .. tostring(res), C.RED) end end
pcall(S.ObjTrack.RefreshList) end) flyStop.Activated:Connect(function() ReleaseHubFocus() S.Move.StopObjectFly()
D.Say("⏹ đã dừng bay tới vật", C.YELLOW) pcall(S.ObjTrack.RefreshList) end) speedApply.Activated:Connect(function()
ReleaseHubFocus() local n = tonumber(tostring(speedIn.Text or ""):match("%-?%d+%.?%d*")) or 60
local ok, value = S.Move.SetObjectFlySpeed(n) if ok then speedIn.Text = tostring(value)
D.Say("🚀 tốc độ bay tới vật: " .. tostring(value), C.GREEN) else D.Say("⚠️ " .. tostring(value), C.RED) end
end) speedIn.FocusLost:Connect(function() ReleaseHubFocus() speedIn.Text = tostring(S.Move.objectFlySpeed or 60) end)
skipBtn.Activated:Connect(function() ReleaseHubFocus() OT.skipPlayers = not OT.skipPlayers if OT.on then pcall(OT.Rescan, true) end
D.Say(OT.skipPlayers and "🚫 bỏ qua nhân vật người chơi: BẬT" or "🚫 bỏ qua nhân vật người chơi: TẮT", C.YELLOW) pcall(S.ObjTrack.RefreshList)
end) xyzBtn.Activated:Connect(function() ReleaseHubFocus() OT.showXYZ = not OT.showXYZ pcall(OT.Tick)
D.Say(OT.showXYZ and "🧭 hiện toạ độ X/Y/Z trên nhãn: BẬT" or "🧭 hiện toạ độ trên nhãn: TẮT", C.YELLOW) pcall(S.ObjTrack.RefreshList) end)
_G.BananaCatHub_ObjTrack = S.ObjTrack pcall(S.ObjTrack.AutoRestoreSaved) paint()
pcall(S.ObjTrack.RefreshList) pcall(function()
if D.playerTab then D.playerTab.CanvasSize = UDim2.new(0, 0, 0, (D.playerY or 600) + 16) end end) end)() ;(function()
pcall(function() local oldPI = _G.BananaCatHub_PlayerInfo
if type(oldPI) == "table" then if type(oldPI.ResetSkin) == "function" then pcall(oldPI.ResetSkin) end
if type(oldPI.ClearVirtualAvatar) == "function" then pcall(oldPI.ClearVirtualAvatar) end
if oldPI._virtualAvatar then pcall(function() oldPI._virtualAvatar:Destroy() end) end
if oldPI._vAvatarStepped then pcall(function() oldPI._vAvatarStepped:Disconnect() end) end
if oldPI._vAvatarHeartbeat then pcall(function() oldPI._vAvatarHeartbeat:Disconnect() end) end
if oldPI._sitJumpConn then pcall(function() oldPI._sitJumpConn:Disconnect() end) end
if oldPI._sitWatchConn then pcall(function() oldPI._sitWatchConn:Disconnect() end) end end
RunService:UnbindFromRenderStep("BC_VirtualAvatarSync") RunService:UnbindFromRenderStep("BC_PlayerViewSpin") end) local PI = {}
PI.reqId = 0
PI.last = nil
PI.productCache = {}
PI.activeCategory = "all"
PI.view = { yaw = 0.6, pitch = 0.15, dist = 9, auto = false, drag = false, hover = false }
PI.originalDesc = nil
PI.originalHum = nil
PI.localSaved = nil
PI.isApplied = false PI.appliedId = nil
PI.appliedMode = nil
PI.localActive = false
PI.localId = nil
PI._virtualAvatar = nil
PI._virtualAvatarId = nil PI._virtualAvatarRec = nil PI._virtualAvatarCFrame = nil PI.SPIN_BIND = "BC_PlayerViewSpin"
pcall(function() RunService:UnbindFromRenderStep("BC_PlayerViewSpin") end) _G.BananaCatHub_PlayerInfo = PI
local MarketplaceService = game:GetService("MarketplaceService")
local PRESENCE = { [0] = "⚫ Offline", [1] = "🟢 Online (web/app)", [2] = "🎮 Đang trong game", [3] = "🛠 Đang trong Studio" }
local function trimStr(s) return (tostring(s or ""):gsub("^%s+", ""):gsub("%s+$", "")) end
local function clipText(s, n)
s = tostring(s or "") local okL, len = pcall(utf8.len, s)
if okL and type(len) == "number" and len > n then local okO, cut = pcall(utf8.offset, s, n + 1)
if okO and cut then return s:sub(1, cut - 1) .. "…" end end return s end
local function jsonEncode(t) local ok, s = pcall(function() return HttpService:JSONEncode(t) end) if ok then return s end return nil end
function PI.Http(method, url, body) local g = (type(getgenv) == "function" and S.IsRealExecutorFn(getgenv) and select(2, pcall(getgenv))) or nil
local fenv = (type(getfenv) == "function" and select(2, pcall(getfenv, 0))) or nil local rq = (S.IsRealExecutorFn(request) and request)
or (S.IsRealExecutorFn(http_request) and http_request) or (type(syn) == "table" and S.IsRealExecutorFn(syn.request) and syn.request)
or (type(http) == "table" and S.IsRealExecutorFn(http.request) and http.request)
or (type(fluxus) == "table" and S.IsRealExecutorFn(fluxus.request) and fluxus.request) or (type(g) == "table" and (
(S.IsRealExecutorFn(g.request) and g.request) or (S.IsRealExecutorFn(g.http_request) and g.http_request)
or (type(g.http) == "table" and S.IsRealExecutorFn(g.http.request) and g.http.request) ))
or (type(fenv) == "table" and (
(S.IsRealExecutorFn(fenv.request) and fenv.request) or (S.IsRealExecutorFn(fenv.http_request) and fenv.http_request)
)) or (type(request) == "function" and request)
or (type(http_request) == "function" and http_request) or S.CompatRequest
local headers = nil if body then headers = { ["Content-Type"] = "application/json", ["Accept"] = "application/json" } end
local mUp = tostring(method or "GET"):upper() local ok, res = pcall(rq, { Url = url, Method = mUp, Headers = headers, Body = body })
if (not ok or type(res) ~= "table" or type(res.Body) ~= "string" or #res.Body == 0) then if mUp == "GET" then
local okG, rawG = pcall(function() return game:HttpGet(url, true) end) if not (okG and type(rawG) == "string" and #rawG > 0) then
okG, rawG = pcall(function() return game:HttpGet(url) end) end
if okG and type(rawG) == "string" and #rawG > 0 then res = { StatusCode = 200, Success = true, Body = rawG }
ok = true end
elseif mUp == "POST" then local okP, rawP = pcall(function() return game:HttpPost(url, tostring(body or ""), "application/json") end)
if okP and type(rawP) == "string" and #rawP > 0 then res = { StatusCode = 200, Success = true, Body = rawP }
ok = true end
end end
if not ok or type(res) ~= "table" then return nil, "lỗi mạng" end local code = tonumber(res.StatusCode) or 0
if res.Success == false or code >= 400 then return nil, "HTTP " .. tostring(code) end
if type(res.Body) ~= "string" or #res.Body == 0 then return nil, "phản hồi rỗng" end
local okD, data = pcall(function() return HttpService:JSONDecode(res.Body) end)
if not okD or type(data) ~= "table" then return nil, "phản hồi không hợp lệ" end return data, nil end function PI.ResolveUser(query)
local rawQ = trimStr(query) local hadAt = (rawQ:sub(1, 1) == "@")
local q = rawQ:gsub("^@", "") if q == "" then return nil, "chưa nhập tên hoặc UserId" end
if q:match("^%d+$") then if #q > 15 then return nil, "UserId không hợp lệ (quá dài)" end
local id = tonumber(q) if not id or id <= 0 then return nil, "UserId không hợp lệ" end return id, nil end
local ql = q:lower() local okPlrs, plrs = pcall(function() return Players:GetPlayers() end)
if okPlrs and type(plrs) == "table" then for _, plr in ipairs(plrs) do
if tostring(plr.Name or ""):lower() == ql and tonumber(plr.UserId) then return tonumber(plr.UserId), tostring(plr.Name)
end end
if not hadAt then for _, plr in ipairs(plrs) do
if tostring(plr.DisplayName or ""):lower() == ql and tonumber(plr.UserId) then return tonumber(plr.UserId), tostring(plr.Name)
end end
end end
local okFr, frList = pcall(function() return player:GetFriendsOnline(200) end) if okFr and type(frList) == "table" then
for _, f in ipairs(frList) do if type(f) == "table" and tostring(f.UserName or ""):lower() == ql and tonumber(f.VisitorId) then
return tonumber(f.VisitorId), tostring(f.UserName) end
end if not hadAt then
for _, f in ipairs(frList) do if type(f) == "table" and tostring(f.DisplayName or ""):lower() == ql and tonumber(f.VisitorId) then
return tonumber(f.VisitorId), tostring(f.UserName) end
end end
end if #q >= 3 and #q <= 20 and not q:find("[^%w_]") then
local data, err = PI.Http("POST", "https://users.roblox.com/v1/usernames/users", jsonEncode({ usernames = { q }, excludeBannedUsers = false }))
if type(data) == "table" and type(data.data) == "table" and type(data.data[1]) == "table" and tonumber(data.data[1].id) then
return tonumber(data.data[1].id), tostring(data.data[1].name or q) end
local okId, id = pcall(function() return Players:GetUserIdFromNameAsync(q) end) if okId and tonumber(id) then return tonumber(id), q end
if okPlrs and type(plrs) == "table" then for _, plr in ipairs(plrs) do
local pn, pd = tostring(plr.Name or ""):lower(), tostring(plr.DisplayName or ""):lower()
if (pn:find(ql, 1, true) or pd:find(ql, 1, true)) and tonumber(plr.UserId) then return tonumber(plr.UserId), tostring(plr.Name)
end end
end return nil, "không tìm thấy người chơi '" .. q .. "'" .. (err and (" (" .. err .. ")") or "")
end if okPlrs and type(plrs) == "table" then
for _, plr in ipairs(plrs) do local pn, pd = tostring(plr.Name or ""):lower(), tostring(plr.DisplayName or ""):lower()
if (pn:find(ql, 1, true) or pd:find(ql, 1, true)) and tonumber(plr.UserId) then return tonumber(plr.UserId), tostring(plr.Name)
end end
end return nil, "tên không hợp lệ (3–20 ký tự: chữ, số, _)" end
function PI.FetchProfile(id) local data, err = PI.Http("GET", "https://users.roblox.com/v1/users/" .. tostring(id), nil)
if type(data) ~= "table" or tonumber(data.id) == nil then if err == "HTTP 404" then return nil, "UserId " .. tostring(id) .. " không tồn tại" end
return nil, "không đọc được hồ sơ UserId " .. tostring(id) .. " (" .. tostring(err or "lỗi") .. ")" end return data, nil end
function PI.GetFriendPresence(id) id = tonumber(id)
if not id then return nil end local okF, list = pcall(function() return player:GetFriendsOnline(200) end)
if okF and type(list) == "table" then for _, f in ipairs(list) do
if type(f) == "table" and tonumber(f.VisitorId) == id then
local hasGame = (tonumber(f.PlaceId) ~= nil) or (type(f.GameId) == "string" and f.GameId ~= "") or (tonumber(f.LocationType) == 4) return {
userPresenceType = hasGame and 2 or (f.IsOnline and 1 or 0), lastLocation = tostring(f.LastLocation or ""),
placeId = tonumber(f.PlaceId), rootPlaceId = tonumber(f.PlaceId),
gameId = (type(f.GameId) == "string" and f.GameId ~= "") and f.GameId or nil, }
end end
end return nil
end function PI.FetchPresence(id)
local fPres = PI.GetFriendPresence(id)
local data = PI.Http("POST", "https://presence.roblox.com/v1/presence/users", jsonEncode({ userIds = { id } }))
local p = type(data) == "table" and type(data.userPresences) == "table" and data.userPresences[1] or nil if type(p) ~= "table" then p = fPres end
if type(p) == "table" and type(fPres) == "table" then if (not p.gameId or p.gameId == "") and fPres.gameId then p.gameId = fPres.gameId end
if not p.placeId and fPres.placeId then p.placeId = fPres.placeId; p.rootPlaceId = p.rootPlaceId or fPres.rootPlaceId end
if (tonumber(p.userPresenceType) or 0) == 0 and (tonumber(fPres.userPresenceType) or 0) > 0 then p.userPresenceType = fPres.userPresenceType
p.lastLocation = (p.lastLocation and p.lastLocation ~= "") and p.lastLocation or fPres.lastLocation end
end if PI.InThisServer(id, p) then
p = type(p) == "table" and p or {} p.userPresenceType = 2
if tostring(game.JobId or "") ~= "" then p.gameId = tostring(game.JobId) end if tonumber(game.PlaceId) then p.placeId = tonumber(game.PlaceId) end
end return p
end function PI.PresenceText(p) if type(p) ~= "table" then return "❔ không rõ" end
local t = tonumber(p.userPresenceType) or -1 local text = PRESENCE[t] or "❔ không rõ"
if t == 2 and type(p.lastLocation) == "string" and p.lastLocation ~= "" then text = text .. ": " .. p.lastLocation end return text
end function PI.InThisServer(id, p) id = tonumber(id)
if not id then return false end local okP, inst = pcall(function() return Players:GetPlayerByUserId(id) end) if okP and inst then return true end
local okL, list = pcall(function() return Players:GetPlayers() end) if okL and type(list) == "table" then
for _, plr in ipairs(list) do if tonumber(plr.UserId) == id then return true end
end end
if type(p) == "table" and p.gameId ~= nil and tostring(p.gameId) ~= "" and tostring(p.gameId) == tostring(game.JobId or "") then return true end return false
end local function normalizeThumbKey(u)
if type(u) ~= "string" or u == "" then return nil end local hex32 = u:match("(%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x%x)")
if hex32 and hex32 ~= "" then return hex32:lower()
end local seg1 = u:match("rbxcdn%.com/([^/%?]+)")
if seg1 and seg1 ~= "" then local hash = seg1:match("AvatarHeadshot%-([%w_%-]+)")
if hash and hash ~= "" then hash = hash:gsub("%-[Pp][Nn][Gg]$", ""):gsub("%-[Ww][Ee][Bb][Pp]$", ""):gsub("%-[Jj][Pp][Ee]?[Gg]$", "")
return hash:lower() end
seg1 = seg1:gsub("%-[Pp][Nn][Gg]$", ""):gsub("%-[Ww][Ee][Bb][Pp]$", ""):gsub("%-[Jj][Pp][Ee]?[Gg]$", "") return seg1:lower()
end return u:lower()
end function PI.FetchTargetHeadshotKeys(id)
local keys = {} local count = 0
local firstUrl = nil local function addUrl(u)
if type(u) ~= "string" or u == "" then return end if not firstUrl then firstUrl = u end
local k = normalizeThumbKey(u) if k and k ~= "" and not keys[k] then
keys[k] = true count = count + 1
end local seg = u:match("rbxcdn%.com/([^/%?]+)")
if seg and seg ~= "" then keys[seg:lower()] = true
local ah = seg:match("AvatarHeadshot%-([%w_%-]+)") if ah and ah ~= "" then
ah = ah:gsub("%-[Pp][Nn][Gg]$", ""):gsub("%-[Ww][Ee][Bb][Pp]$", ""):gsub("%-[Jj][Pp][Ee]?[Gg]$", ""):lower() if ah ~= "" then keys[ah] = true end
end local s2 = seg:gsub("%-[Pp][Nn][Gg]$", ""):gsub("%-[Ww][Ee][Bb][Pp]$", ""):lower()
if s2 ~= "" then keys[s2] = true end end
local fullPath = u:match("rbxcdn%.com/([^%?]+)") if fullPath and fullPath ~= "" then
keys[fullPath:lower()] = true end
end
local data = PI.Http("GET", "https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=" .. tostring(id) .. "&size=150x150&format=Png&isCircular=false", nil)
local e = type(data) == "table" and type(data.data) == "table" and data.data[1] or nil
if type(e) == "table" and type(e.imageUrl) == "string" and e.imageUrl ~= "" then addUrl(e.imageUrl)
end local bData = PI.Http("POST", "https://thumbnails.roblox.com/v1/batch", jsonEncode({
{ requestId = "t_png:" .. tostring(id), targetId = tonumber(id), type = "AvatarHeadShot", size = "150x150", format = "Png", isCircular = false },
{ requestId = "t_webp:" .. tostring(id), targetId = tonumber(id), type = "AvatarHeadShot", size = "150x150", format = "Webp", isCircular = false },
{ requestId = "t_def:" .. tostring(id), targetId = tonumber(id), type = "AvatarHeadShot", size = "150x150" }, }))
local hadPending = false if type(bData) == "table" and type(bData.data) == "table" then
for _, be in ipairs(bData.data) do if type(be) == "table" then
if type(be.imageUrl) == "string" and be.imageUrl ~= "" then addUrl(be.imageUrl)
elseif tostring(be.state or "") == "Pending" then hadPending = true
end end
end end
if count == 0 and hadPending then task.wait(0.35)
local data2 = PI.Http("GET", "https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=" .. tostring(id) .. "&size=150x150&format=Png&isCircular=false", nil)
local e2 = type(data2) == "table" and type(data2.data) == "table" and data2.data[1] or nil
if type(e2) == "table" and type(e2.imageUrl) == "string" and e2.imageUrl ~= "" then addUrl(e2.imageUrl)
end end
return keys, firstUrl, count end
function PI.FetchHeadshotUrl(id) local _, firstUrl = PI.FetchTargetHeadshotKeys(id)
return firstUrl end
local function fetchServerPageWithRetry(scanPlaceId, cursor, sortOrder) local order = tostring(sortOrder or "Desc")
local qCur = (type(cursor) == "string" and cursor ~= "") and ("&cursor=" .. tostring(cursor)) or ""
local url1 = "https://games.roblox.com/v1/games/" .. tostring(scanPlaceId) .. "/servers/Public?sortOrder=" .. order .. "&limit=100&excludeFullGames=false" .. qCur
local url2 = "https://games.roblox.com/v1/games/" .. tostring(scanPlaceId) .. "/servers/Public?sortOrder=" .. order .. "&limit=100" .. qCur
for attempt = 1, 3 do local sData, err1 = PI.Http("GET", url1, nil)
if type(sData) == "table" and type(sData.data) == "table" then return sData.data, sData.nextPageCursor
end if tostring(err1 or ""):find("429") then
if attempt < 3 then task.wait(0.45 * attempt) end
else local sData2, err2 = PI.Http("GET", url2, nil)
if type(sData2) == "table" and type(sData2.data) == "table" then return sData2.data, sData2.nextPageCursor
end if tostring(err2 or ""):find("429") and attempt < 3 then task.wait(0.45 * attempt) else break end
end end
if (not cursor or cursor == "") and order == "Asc" and type(S.FetchServers) == "function" then
local okS, fList, fCur = pcall(S.FetchServers, "", scanPlaceId)
if okS and type(fList) == "table" and #fList > 0 then return fList, fCur end
end return nil, nil end
local EVADE_PLACES = { 9872472334, 10324346056, 10324347967, 10662542523, 10808838353, 11353528705 }
local EVADE_SET = {} for _, ep in ipairs(EVADE_PLACES) do EVADE_SET[ep] = true end
function PI.GetUniversePlaces(univId, primaryPlaceId)
local out, seen = {}, {}
local function addP(p) p = tonumber(p) if p and p > 0 and not seen[p] then seen[p] = true out[#out + 1] = p end end
addP(primaryPlaceId) addP(game.PlaceId)
pcall(function()
local as = game:GetService("AssetService")
if as and type(as.GetGamePlacesAsync) == "function" then
local pages = as:GetGamePlacesAsync()
for _ = 1, 5 do
if not pages then break end
local list = pages:GetCurrentPage()
if type(list) == "table" then
for _, info in ipairs(list) do
if type(info) == "table" then addP(info.PlaceId or info.id) end
end
end
if pages.IsFinished then break end
local okN = pcall(function() pages:AdvanceToNextPageAsync() end)
if not okN then break end
end
end
end)
univId = tonumber(univId) or tonumber(game.GameId)
if (not univId or univId <= 0) and out[1] then
local uRes = PI.Http("GET", "https://apis.roblox.com/universes/v1/places/" .. tostring(out[1]) .. "/universe", nil)
if type(uRes) == "table" and tonumber(uRes.universeId) then univId = tonumber(uRes.universeId) end
end
if univId and univId > 0 then
local gData = PI.Http("GET", "https://games.roblox.com/v1/games?universeIds=" .. tostring(univId), nil)
local gEntry = type(gData) == "table" and type(gData.data) == "table" and gData.data[1] or nil
if type(gEntry) == "table" and tonumber(gEntry.rootPlaceId) then addP(gEntry.rootPlaceId) end
local uData = PI.Http("GET", "https://develop.roblox.com/v1/universes/" .. tostring(univId) .. "/places?limit=50", nil)
local uPlaces = type(uData) == "table" and type(uData.data) == "table" and uData.data or nil
if type(uPlaces) == "table" then
for _, pl in ipairs(uPlaces) do if type(pl) == "table" then addP(pl.id or pl.PlaceId) end end
end
end
if univId == 3652625463 or EVADE_SET[tonumber(primaryPlaceId) or 0] or EVADE_SET[tonumber(game.PlaceId) or 0] then
for _, ep in ipairs(EVADE_PLACES) do addP(ep) end
end
return out end
function PI.FormatJobAndPlace(jobId, placeId, meta, coPlayerName)
jobId = tostring(jobId or "") if jobId == "" then return "", "" end
placeId = tonumber(placeId) or S._jobPlaceCache[jobId] or tonumber(game.PlaceId)
if placeId and placeId > 0 then S._jobPlaceCache[jobId] = placeId end
meta = type(meta) == "table" and meta or S._jobMetaCache[jobId]
if type(meta) == "table" then S._jobMetaCache[jobId] = meta end
local codeForInput = (placeId and tonumber(game.PlaceId) and placeId ~= tonumber(game.PlaceId)) and (tostring(placeId) .. ":" .. jobId) or jobId
local capTxt = ""
if type(meta) == "table" and tonumber(meta.playing) and tonumber(meta.maxPlayers) and meta.maxPlayers > 0 then
capTxt = string.format(" · %d/%d%s", meta.playing, meta.maxPlayers, meta.playing >= meta.maxPlayers and " ĐẦY" or "")
end
local coTxt = (type(coPlayerName) == "string" and coPlayerName ~= "") and (" · chơi cùng @" .. coPlayerName) or ""
local dispTxt = jobId .. (placeId and (" (Place: " .. tostring(placeId) .. capTxt .. coTxt .. ")") or (capTxt .. coTxt))
return codeForInput, dispTxt end
function PI.FetchPlayerFriends(id) id = tonumber(id)
if not id or id <= 0 then return {} end
local out, seen = {}, {}
local function addF(fid, fname, fdisp, onl)
fid = tonumber(fid)
if fid and fid > 0 and fid ~= id and not seen[fid] then
seen[fid] = true
out[#out + 1] = { id = fid, name = tostring(fname or ("User_" .. tostring(fid))), displayName = tostring(fdisp or fname or ""), isOnline = (onl == true) }
end
end
local fData = PI.Http("GET", "https://friends.roblox.com/v1/users/" .. tostring(id) .. "/friends", nil)
local fList = type(fData) == "table" and type(fData.data) == "table" and fData.data or nil
if type(fList) == "table" then
for _, f in ipairs(fList) do
if type(f) == "table" then addF(f.id or f.Id, f.name or f.Username, f.displayName or f.DisplayName, f.isOnline or f.IsOnline) end
end
end
if #out == 0 then
pcall(function()
if type(Players.GetFriendsAsync) == "function" then
local pages = Players:GetFriendsAsync(id)
for _ = 1, 4 do
if not pages then break end
local list = pages:GetCurrentPage()
if type(list) == "table" then
for _, f in ipairs(list) do
if type(f) == "table" then addF(f.Id or f.id, f.Username or f.name, f.DisplayName or f.displayName, f.IsOnline or f.isOnline) end
end
end
if pages.IsFinished then break end
local okN = pcall(function() pages:AdvanceToNextPageAsync() end)
if not okN then break end
end
end
end)
end
return out end
function PI.CheckPlayerIsPlaying(id, pres)
id = tonumber(id)
if not id or id <= 0 then return false, "ID người chơi không hợp lệ" end
if PI.InThisServer(id, pres) then return true, nil end
local fPres = PI.GetFriendPresence(id)
if type(fPres) == "table" and (tonumber(fPres.userPresenceType) == 2 or (type(fPres.gameId) == "string" and fPres.gameId ~= "")) then
return true, nil
end
if type(pres) ~= "table" then pres = PI.FetchPresence(id) end
if type(pres) == "table" then
local pType = tonumber(pres.userPresenceType) or 0
local hasGameId = type(pres.gameId) == "string" and pres.gameId ~= ""
if pType ~= 2 and not hasGameId then
local stTxt = (pType == 1 and "đang Online ngoài Web/Sảnh (chưa vào game)")
or (pType == 3 and "đang trong Roblox Studio (không chơi game)")
or "đang Offline (không chơi game)"
return false, "Người chơi hiện " .. stTxt .. " — tính năng tìm server không hoạt động"
end
local myUniv = tonumber(game.GameId)
local pUniv = tonumber(pres.universeId)
if myUniv and myUniv > 0 and pUniv and pUniv > 0 and pUniv ~= myUniv then
return false, "Người chơi đang chơi game khác — tính năng tìm server không hoạt động"
end
local myPlace = tonumber(game.PlaceId)
local pPlace = tonumber(pres.placeId) or tonumber(pres.rootPlaceId)
if pPlace and pPlace > 0 and myPlace and myPlace > 0 and pPlace ~= myPlace then
local allP = PI.GetUniversePlaces(myUniv, myPlace)
local inMyUniv = false
for _, ap in ipairs(allP) do if tonumber(ap) == pPlace then inMyUniv = true break end end
if not inMyUniv then
return false, "Người chơi đang chơi game khác (PlaceId: " .. tostring(pPlace) .. ") — tính năng tìm server không hoạt động"
end
end
return true, nil
end
return false, "Người chơi hiện không chơi game — tính năng tìm server không hoạt động"
end
function PI.FindPlayerServerByTokens(id, targetPlaceId, onProgress, maxPages, cachedPres) id = tonumber(id)
if not id or id <= 0 then return nil, nil, nil, nil, nil, "ID không hợp lệ" end if PI.InThisServer(id, nil) and tostring(game.JobId or "") ~= "" then
local pId = tonumber(game.PlaceId) S._jobPlaceCache[tostring(game.JobId)] = pId
return tostring(game.JobId), pId, "same_server", nil, nil, nil end
local fPres = PI.GetFriendPresence(id) if type(fPres) == "table" and type(fPres.gameId) == "string" and fPres.gameId ~= "" then
local pId = tonumber(fPres.placeId) or tonumber(targetPlaceId) or tonumber(game.PlaceId)
S._jobPlaceCache[tostring(fPres.gameId)] = pId
return tostring(fPres.gameId), pId, "friend_online", nil, nil, nil end
local okTp, curInst, _, tpPlaceId, tpJobId = pcall(function() return TeleportService:GetPlayerPlaceInstanceAsync(id) end)
if okTp and curInst == true and tostring(game.JobId or "") ~= "" then
return tostring(game.JobId), tonumber(game.PlaceId), "teleport_service", nil, nil, nil
elseif okTp and type(tpJobId) == "string" and tpJobId ~= "" then
local pId = tonumber(tpPlaceId) or tonumber(targetPlaceId) or tonumber(game.PlaceId)
S._jobPlaceCache[tostring(tpJobId)] = pId
return tostring(tpJobId), pId, "teleport_service", nil, nil, nil end
local pres = type(cachedPres) == "table" and cachedPres or PI.FetchPresence(id)
local isPlaying, notPlayMsg = PI.CheckPlayerIsPlaying(id, pres)
if not isPlaying then
return nil, nil, nil, nil, nil, notPlayMsg
end
if type(pres) == "table" and type(pres.gameId) == "string" and pres.gameId ~= "" then
local pId = tonumber(pres.placeId) or tonumber(pres.rootPlaceId) or tonumber(targetPlaceId) or tonumber(game.PlaceId)
S._jobPlaceCache[tostring(pres.gameId)] = pId
return tostring(pres.gameId), pId, "presence", nil, nil, nil end
local scanPlaceId = tonumber(targetPlaceId) or (type(pres) == "table" and (tonumber(pres.placeId) or tonumber(pres.rootPlaceId)))
or tonumber(game.PlaceId) if not scanPlaceId or scanPlaceId <= 0 then return nil, nil, nil, nil, nil, nil end
local targetKeys = PI.FetchTargetHeadshotKeys(id) local function matchesThumb(imgUrl, keyTable)
local kt = keyTable or targetKeys
if type(imgUrl) ~= "string" or imgUrl == "" then return nil end local k = normalizeThumbKey(imgUrl)
if k and kt[k] then return kt[k] end local seg = imgUrl:match("rbxcdn%.com/([^/%?]+)")
if seg then if kt[seg:lower()] then return kt[seg:lower()] end
local ah = seg:match("AvatarHeadshot%-([%w_%-]+)") if ah then
ah = ah:gsub("%-[Pp][Nn][Gg]$", ""):gsub("%-[Ww][Ee][Bb][Pp]$", ""):gsub("%-[Jj][Pp][Ee]?[Gg]$", ""):lower()
if kt[ah] then return kt[ah] end end
end local fp = imgUrl:match("rbxcdn%.com/([^%?]+)")
if fp and kt[fp:lower()] then return kt[fp:lower()] end return nil
end
local placeStates = {}
local scannedTokenThumbs = {}
local scannedTokenIds = {}
local tokSeq = 0
local function recordScannedThumb(imgUrl, rSid, pId, svMeta)
if type(imgUrl) ~= "string" or imgUrl == "" or not rSid then return end
local entry = { sid = rSid, pId = pId, meta = svMeta }
local k = normalizeThumbKey(imgUrl)
if k and k ~= "" and not scannedTokenThumbs[k] then scannedTokenThumbs[k] = entry end
local seg = imgUrl:match("rbxcdn%.com/([^/%?]+)")
if seg and seg ~= "" then scannedTokenThumbs[seg:lower()] = scannedTokenThumbs[seg:lower()] or entry end
end
local function getPlaceState(pId)
if not placeStates[pId] then
placeStates[pId] = { curDesc = "", curAsc = "", doneDesc = false, doneAsc = false, seenSid = {}, pages = 0 }
end
return placeStates[pId]
end
local function scanPlaceSteps(pId, stepPages, coKeyMap, coIdMap)
local st = getPlaceState(pId)
local steps = 0
while steps < stepPages and (not st.doneDesc or not st.doneAsc) do
for _, mode in ipairs({ "Desc", "Asc" }) do
if steps >= stepPages then break end
if (mode == "Desc" and not st.doneDesc) or (mode == "Asc" and not st.doneAsc) then
local cur = (mode == "Desc") and st.curDesc or st.curAsc
local list, nextCur = fetchServerPageWithRetry(pId, cur, mode)
if type(list) ~= "table" or #list == 0 then
if mode == "Desc" then st.doneDesc = true else st.doneAsc = true end
else
steps = steps + 1 st.pages = st.pages + 1
if type(onProgress) == "function" then pcall(onProgress, st.pages, #list, mode, pId) end
local batch, reqMap, metaMap = {}, {}, {}
for _, sv in ipairs(list) do
local sid = type(sv) == "table" and sv.id and tostring(sv.id) or nil
if sid and sid ~= "" and not st.seenSid[sid] then
st.seenSid[sid] = true
local svMeta = { placeId = pId, playing = tonumber(sv.playing) or 0, maxPlayers = tonumber(sv.maxPlayers) or 0 }
metaMap[sid] = svMeta S._jobPlaceCache[sid] = pId S._jobMetaCache[sid] = svMeta
if type(sv.playerIds) == "table" then
for _, pid in ipairs(sv.playerIds) do
local npid = tonumber(pid)
if npid then
scannedTokenIds[npid] = { sid = sid, pId = pId, meta = svMeta }
if npid == id then return sid, pId, "playerIds", svMeta, nil end
if coIdMap and coIdMap[npid] then return sid, pId, "co_player:@" .. tostring(coIdMap[npid].name), svMeta, tostring(coIdMap[npid].name) end
end
end
end
if type(sv.playerTokens) == "table" then
for _, tok in ipairs(sv.playerTokens) do
if type(tok) == "string" and tok ~= "" then
if tok == tostring(id) or tok == ("token_" .. tostring(id)) then
return sid, pId, "token_direct", svMeta, nil
end
tokSeq = tokSeq + 1
local reqId = tostring(sid) .. ":" .. tostring(tokSeq)
reqMap[reqId] = sid
batch[#batch + 1] = {
requestId = reqId, targetId = 0,
token = tok, type = "AvatarHeadShot",
size = "150x150", format = "Png",
isCircular = false,
}
end
end
end
end
end
if #batch > 0 then
local chunks = {}
for startIdx = 1, #batch, 100 do
local chunk = {}
for k = startIdx, math.min(#batch, startIdx + 99) do chunk[#chunk + 1] = batch[k] end
chunks[#chunks + 1] = chunk
end
local foundSid, foundSrc, foundCoName = nil, nil, nil
for wStart = 1, #chunks, 6 do
if foundSid then break end
local pending = 0
for cIdx = wStart, math.min(#chunks, wStart + 5) do
local chunk = chunks[cIdx]
pending = pending + 1
task.spawn(function()
local bRes = nil
for bTry = 1, 3 do
bRes = PI.Http("POST", "https://thumbnails.roblox.com/v1/batch", jsonEncode(chunk))
if type(bRes) == "table" and type(bRes.data) == "table" then break end
if bTry < 3 then task.wait(0.3 * bTry + (cIdx % 3) * 0.05) end
end
local items = type(bRes) == "table" and type(bRes.data) == "table" and bRes.data or nil
if type(items) == "table" then
for idx, it in ipairs(items) do
if type(it) == "table" then
local rawReq = (type(it.requestId) == "string" and it.requestId ~= "" and it.requestId) or (chunk[idx] and chunk[idx].requestId) or nil
local rSid = (rawReq and reqMap[rawReq]) or (type(rawReq) == "string" and rawReq:match("^([^:]+)")) or nil
if rSid and rSid ~= "" then
recordScannedThumb(it.imageUrl, rSid, pId, metaMap[rSid])
local tid = tonumber(it.targetId)
if tid and tid > 0 then scannedTokenIds[tid] = { sid = rSid, pId = pId, meta = metaMap[rSid] } end
if not foundSid then
if tid == id then foundSid, foundSrc = rSid, "batch_targetId" break end
if matchesThumb(it.imageUrl, targetKeys) then foundSid, foundSrc = rSid, "batch_thumb" break end
if coIdMap and tid and coIdMap[tid] then
foundSid, foundSrc, foundCoName = rSid, "co_player:@" .. tostring(coIdMap[tid].name), tostring(coIdMap[tid].name) break
end
if coKeyMap then
local coHit = matchesThumb(it.imageUrl, coKeyMap)
if type(coHit) == "table" then
foundSid, foundSrc, foundCoName = rSid, "co_player:@" .. tostring(coHit.name), tostring(coHit.name) break
end
end
end
end
end
end
end
pending = pending - 1
end)
end
local waitTicks = 0
while pending > 0 and not foundSid and waitTicks < 240 do
waitTicks = waitTicks + 1 task.wait(0.025)
end
if foundSid then
return foundSid, pId, foundSrc or "batch_thumb", metaMap[foundSid], foundCoName
end
end
end
if type(nextCur) == "string" and nextCur ~= "" then
if mode == "Desc" then st.curDesc = nextCur else st.curAsc = nextCur end
else
if mode == "Desc" then st.doneDesc = true else st.doneAsc = true end
end
end
end
end
end
return nil, pId, nil, nil, nil
end
local univId = (type(pres) == "table" and tonumber(pres.universeId)) or tonumber(game.GameId)
local allPlaces = PI.GetUniversePlaces(univId, scanPlaceId)
local placeSet = {} for _, ap in ipairs(allPlaces) do placeSet[ap] = true end
local totalPages = tonumber(maxPages) or 16
local foundSid, foundPlace, foundSrc, foundMeta, foundCo = scanPlaceSteps(scanPlaceId, math.min(4, totalPages))
if foundSid and foundSid ~= "" then return foundSid, foundPlace, foundSrc, foundMeta, foundCo end
for _, subP in ipairs(allPlaces) do
if subP ~= scanPlaceId then
local sSid, sPl, sSrc, sMeta, sCo = scanPlaceSteps(subP, 4)
if sSid and sSid ~= "" then return sSid, sPl, sSrc, sMeta, sCo end
end
end
if totalPages > 4 then
foundSid, foundPlace, foundSrc, foundMeta, foundCo = scanPlaceSteps(scanPlaceId, totalPages - 4)
if foundSid and foundSid ~= "" then return foundSid, foundPlace, foundSrc, foundMeta, foundCo end
for _, subP in ipairs(allPlaces) do
if subP ~= scanPlaceId then
local sSid, sPl, sSrc, sMeta, sCo = scanPlaceSteps(subP, 4)
if sSid and sSid ~= "" then return sSid, sPl, sSrc, sMeta, sCo end
end
end
end

local friends = PI.FetchPlayerFriends(id)
if type(friends) == "table" and #friends > 0 then
if type(onProgress) == "function" then pcall(onProgress, "Bạn bè", #friends, "CoPlayer", scanPlaceId) end
for _, f in ipairs(friends) do
if PI.InThisServer(f.id, nil) and tostring(game.JobId or "") ~= "" then
local pId = tonumber(game.PlaceId) S._jobPlaceCache[tostring(game.JobId)] = pId
return tostring(game.JobId), pId, "co_player:@" .. tostring(f.name), nil, tostring(f.name)
end
if scannedTokenIds[f.id] then
local hit = scannedTokenIds[f.id]
return hit.sid, hit.pId, "co_player:@" .. tostring(f.name), hit.meta, tostring(f.name)
end
end
local fMap = {} for _, f in ipairs(friends) do fMap[f.id] = f end
local sameGameFriends, otherCandFriends = {}, {}
local targetLoc = type(pres) == "table" and tostring(pres.lastLocation or "") or ""
for sIdx = 1, #friends, 50 do
local uids = {}
for k = sIdx, math.min(#friends, sIdx + 49) do uids[#uids + 1] = friends[k].id end
local pData = PI.Http("POST", "https://presence.roblox.com/v1/presence/users", jsonEncode({ userIds = uids }))
local pList = type(pData) == "table" and type(pData.userPresences) == "table" and pData.userPresences or nil
if type(pList) == "table" then
for _, fp in ipairs(pList) do
local fid = type(fp) == "table" and tonumber(fp.userId) or nil
local fObj = fid and fMap[fid] or nil
if fObj then
fObj._pres = fp
local pType = tonumber(fp.userPresenceType) or 0
local fpPlace = tonumber(fp.placeId) or tonumber(fp.rootPlaceId)
local fpUniv = tonumber(fp.universeId)
local fpLoc = tostring(fp.lastLocation or "")
local inSameGame = (fpPlace and placeSet[fpPlace])
or (fpUniv and univId and fpUniv == univId)
or (targetLoc ~= "" and fpLoc ~= "" and fpLoc == targetLoc)
or (pType == 2 and not fpPlace)
if pType == 2 and inSameGame then
if type(fp.gameId) == "string" and fp.gameId ~= "" then
local pId = fpPlace or scanPlaceId
S._jobPlaceCache[tostring(fp.gameId)] = pId
return tostring(fp.gameId), pId, "co_player:@" .. tostring(fObj.name), nil, tostring(fObj.name)
end
local okFTp, _, _, fTpPlace, fTpJob = pcall(function() return TeleportService:GetPlayerPlaceInstanceAsync(fid) end)
if okFTp and type(fTpJob) == "string" and fTpJob ~= "" then
local pId = tonumber(fTpPlace) or fpPlace or scanPlaceId
S._jobPlaceCache[tostring(fTpJob)] = pId
return tostring(fTpJob), pId, "co_player:@" .. tostring(fObj.name), nil, tostring(fObj.name)
end
sameGameFriends[#sameGameFriends + 1] = fObj
elseif pType >= 1 or fObj.isOnline then
otherCandFriends[#otherCandFriends + 1] = fObj
end
end
end
end
end
local candList, candSeen = {}, {}
for _, fObj in ipairs(sameGameFriends) do
if not candSeen[fObj.id] and #candList < 50 then
candSeen[fObj.id] = true candList[#candList + 1] = fObj
end
end
if #candList > 0 then
local coKeyMap, coIdMap = {}, {}
local bReq = {}
for _, fObj in ipairs(candList) do
coIdMap[fObj.id] = fObj
bReq[#bReq + 1] = { requestId = "co_png:" .. tostring(fObj.id), targetId = fObj.id, type = "AvatarHeadShot", size = "150x150", format = "Png", isCircular = false }
bReq[#bReq + 1] = { requestId = "co_webp:" .. tostring(fObj.id), targetId = fObj.id, type = "AvatarHeadShot", size = "150x150", format = "Webp", isCircular = false }
end
local bRes = PI.Http("POST", "https://thumbnails.roblox.com/v1/batch", jsonEncode(bReq))
local bItems = type(bRes) == "table" and type(bRes.data) == "table" and bRes.data or nil
if type(bItems) == "table" then
for _, it in ipairs(bItems) do
if type(it) == "table" and type(it.imageUrl) == "string" and it.imageUrl ~= "" then
local fid = tonumber(it.targetId) or (type(it.requestId) == "string" and tonumber(it.requestId:match(":(%d+)$")))
local fObj = fid and coIdMap[fid] or nil
if fObj then
local k = normalizeThumbKey(it.imageUrl)
if k and k ~= "" then
if scannedTokenThumbs[k] then
local hit = scannedTokenThumbs[k]
return hit.sid, hit.pId, "co_player:@" .. tostring(fObj.name), hit.meta, tostring(fObj.name), nil
end
coKeyMap[k] = fObj
end
local seg = it.imageUrl:match("rbxcdn%.com/([^/%?]+)")
if seg and seg ~= "" then
local sl = seg:lower()
if scannedTokenThumbs[sl] then
local hit = scannedTokenThumbs[sl]
return hit.sid, hit.pId, "co_player:@" .. tostring(fObj.name), hit.meta, tostring(fObj.name), nil
end
coKeyMap[sl] = fObj
end
end
end
end
end
for _, pId in ipairs(allPlaces) do
local cSid, cPl, cSrc, cMeta, cName = scanPlaceSteps(pId, 2, coKeyMap, coIdMap)
if cSid and cSid ~= "" then return cSid, cPl, cSrc, cMeta, cName, nil end
end
end
end
return nil, scanPlaceId, nil, nil, nil, nil
end function PI.ExtractServerInfo(id, p)
local inSrv = PI.InThisServer(id, p) local jobId = (type(p) == "table" and type(p.gameId) == "string" and p.gameId ~= "" and tostring(p.gameId))
or (inSrv and tostring(game.JobId or "") ~= "" and tostring(game.JobId)) or nil
local placeId = (type(p) == "table" and (tonumber(p.placeId) or tonumber(p.rootPlaceId))) or (inSrv and tonumber(game.PlaceId))
or nil
if jobId and jobId ~= "" then
local codeIn, dispTxt = PI.FormatJobAndPlace(jobId, placeId, nil)
return jobId, placeId, codeIn, dispTxt
end
local txt = placeId and ("Place: " .. tostring(placeId) .. " (bấm 📋 Mã SV / 🚀 Vào SV để quét sâu)") or "Không tìm thấy trong SV công khai game này"
return nil, placeId, "", txt end
function PI.JoinPlayerServer(recOrQuery, onProgress, onStatus) local jobId, placeId, explicitPlaceId, targetName, targetId, srvMeta, coName, notPlayReason = nil, nil, nil, "", nil, nil, nil, nil
if type(recOrQuery) == "table" then targetName = tostring(recOrQuery.name or recOrQuery.id or "")
targetId = tonumber(recOrQuery.id)
if recOrQuery.isPlaying == false then
local isPl, npMsg = PI.CheckPlayerIsPlaying(targetId, nil)
recOrQuery.isPlaying = isPl recOrQuery.notPlayingReason = npMsg
if not isPl then
recOrQuery.serverJobId = nil recOrQuery.serverCode = ""
recOrQuery.serverCodeText = "⛔ " .. tostring(npMsg or "Người chơi hiện không chơi game — tìm server không hoạt động")
return false, "⛔ @" .. tostring(targetName ~= "" and targetName or targetId) .. ": " .. tostring(npMsg or "hiện không chơi game — tính năng tìm/vào server không hoạt động")
end
end
jobId = type(recOrQuery.serverJobId) == "string" and recOrQuery.serverJobId ~= "" and recOrQuery.serverJobId or nil
explicitPlaceId = tonumber(recOrQuery.placeId) placeId = explicitPlaceId or (jobId and S._jobPlaceCache[jobId])
srvMeta = recOrQuery.serverMeta or (jobId and S._jobMetaCache[jobId])
coName = recOrQuery.coPlayerName
if not jobId and targetId and PI.InThisServer(targetId, nil) and tostring(game.JobId or "") ~= "" then jobId = tostring(game.JobId)
placeId = placeId or tonumber(game.PlaceId) end
if not jobId and targetId then local foundJ, foundP, foundSrc, foundMeta, foundCo, npMsg = PI.FindPlayerServerByTokens(targetId, placeId or game.PlaceId, onProgress, 20)
notPlayReason = npMsg
if npMsg then
recOrQuery.isPlaying = false recOrQuery.notPlayingReason = npMsg
recOrQuery.serverJobId = nil recOrQuery.serverCode = ""
recOrQuery.serverCodeText = "⛔ " .. tostring(npMsg)
return false, "⛔ @" .. tostring(targetName ~= "" and targetName or targetId) .. ": " .. tostring(npMsg)
end
if foundJ and foundJ ~= "" then jobId = foundJ
placeId = tonumber(foundP) or placeId or tonumber(game.PlaceId) srvMeta = foundMeta coName = foundCo
local codeIn, dispTxt = PI.FormatJobAndPlace(jobId, placeId, srvMeta, coName)
recOrQuery.serverJobId = jobId recOrQuery.placeId = placeId recOrQuery.serverCode = codeIn
recOrQuery.serverMeta = srvMeta recOrQuery.coPlayerName = coName recOrQuery.serverSource = foundSrc recOrQuery.serverCodeText = dispTxt
pcall(function() if D.hubJobIn then D.hubJobIn.Text = tostring(codeIn) end end) end
end elseif type(recOrQuery) == "string" then
local s = trimStr(recOrQuery) local parsedJob, parsedPlace = S.ParseServerCode(s)
if parsedJob and parsedJob ~= "" then jobId = parsedJob
explicitPlaceId = parsedPlace placeId = parsedPlace or S._jobPlaceCache[parsedJob] or tonumber(game.PlaceId)
srvMeta = S._jobMetaCache[parsedJob]
elseif parsedPlace and s:match("^PlaceId%s*[:=]%s*%d+$") then
explicitPlaceId = parsedPlace placeId = parsedPlace
elseif s ~= "" then local uid, uname = PI.ResolveUser(s)
if uid then targetId = uid
targetName = tostring(uname or s) local pres = PI.FetchPresence(uid)
local isPl, npMsg = PI.CheckPlayerIsPlaying(uid, pres)
if not isPl then
return false, "⛔ @" .. tostring(targetName) .. ": " .. tostring(npMsg or "hiện không chơi game — tính năng tìm/vào server không hoạt động")
end
local ej, ep = PI.ExtractServerInfo(uid, pres) jobId = ej
explicitPlaceId = ep placeId = ep
if not jobId or jobId == "" then
local foundJ, foundP, _, foundMeta, foundCo, npMsg2 = PI.FindPlayerServerByTokens(uid, placeId or game.PlaceId, onProgress, 20, pres)
notPlayReason = npMsg2
if foundJ and foundJ ~= "" then
jobId = foundJ placeId = tonumber(foundP) or placeId or tonumber(game.PlaceId) srvMeta = foundMeta coName = foundCo
end
end
end
end
end
if jobId and jobId ~= "" then
placeId = tonumber(placeId) or S._jobPlaceCache[jobId] or tonumber(game.PlaceId) or 0
local codeIn = PI.FormatJobAndPlace(jobId, placeId, srvMeta, coName)
pcall(function() if D.hubJobIn then D.hubJobIn.Text = tostring(codeIn) end end)
local coNote = (type(coName) == "string" and coName ~= "") and (" (tìm qua @" .. coName .. " đang chơi cùng)") or ""
if targetId and PI.InThisServer(targetId, nil) and tostring(game.JobId or "") == tostring(jobId) and tonumber(game.PlaceId) == tonumber(placeId) then
return true, string.format("✅ Người chơi @%s đang ở ngay trong server hiện tại cùng bạn rồi! (Mã SV: %s)", tostring(targetName ~= "" and targetName or targetId), tostring(jobId))
end
local okT, errT = S.TeleportToServer(placeId, jobId, { targetName = targetName, meta = srvMeta, onStatus = onStatus })
if not okT then
return false, "Lỗi dịch chuyển vào server: " .. tostring(errT)
end
local isFull = type(srvMeta) == "table" and tonumber(srvMeta.maxPlayers) and srvMeta.maxPlayers > 0 and (tonumber(srvMeta.playing) or 0) >= srvMeta.maxPlayers
if isFull then
return true, string.format("⏳ Server của @%s%s đang ĐẦY (%d/%d) — đã gửi lệnh vào & đang tự động canh slot trống mỗi 1.8s (PlaceId: %d)!", tostring(targetName ~= "" and targetName or jobId), coNote, srvMeta.playing, srvMeta.maxPlayers, placeId)
end
return true, string.format("🚀 Đang vào đúng server mã %s (PlaceId: %d)%s%s!", tostring(jobId), placeId, targetName ~= "" and (" cùng @" .. targetName) or "", coNote)
elseif explicitPlaceId and explicitPlaceId > 0 and explicitPlaceId ~= tonumber(game.PlaceId) and not targetId then
local okT, errT = S.TeleportToServer(explicitPlaceId, nil)
if not okT then return false, "Lỗi dịch chuyển vào game: " .. tostring(errT) end
return true, string.format("🚀 Đang vào game PlaceId %d!", explicitPlaceId)
end
if notPlayReason then return false, "⛔ " .. tostring(notPlayReason) end
return false, "Không tìm thấy người chơi này hoặc bạn bè chơi cùng trong các server công khai của game (có thể đang ở Server VIP/riêng tư)"
end function PI.FetchDesc(id)
local ok, desc = pcall(function() return Players:GetHumanoidDescriptionFromUserId(id) end) if not ok then return nil, tostring(desc) end
if desc == nil then return nil, "không có dữ liệu skin" end return desc, nil
end function PI.FetchThumb(id)
local ok, content = pcall(function() return Players:GetUserThumbnailAsync(id, Enum.ThumbnailType.AvatarThumbnail, Enum.ThumbnailSize.Size420x420) end)
if ok and type(content) == "string" and content ~= "" then return content end
local data = PI.Http("GET", "https://thumbnails.roblox.com/v1/users/avatar?userIds=" .. tostring(id) .. "&size=420x420&format=Png&isCircular=false", nil)
local e = type(data) == "table" and type(data.data) == "table" and data.data[1] or nil
if type(e) == "table" and type(e.imageUrl) == "string" and e.imageUrl ~= "" then return e.imageUrl end return nil
end local function stale(my) return PI.reqId ~= my end
function PI.Lookup(query, onProgress, onQuickRender) PI.reqId = PI.reqId + 1
local my = PI.reqId local id, nm = PI.ResolveUser(query)
if stale(my) then return nil, nil end if not id then return nil, nm end
local prof, perr = PI.FetchProfile(id) if stale(my) then return nil, nil end
if not prof then local fallbackName = nm
local fallbackDisplay = nil pcall(function()
local pInSrv = Players:GetPlayerByUserId(id) if pInSrv then
fallbackName = pInSrv.Name fallbackDisplay = pInSrv.DisplayName
end end)
if not fallbackName or fallbackName == "" then local okN, canonical = pcall(function() return Players:GetNameFromUserIdAsync(id) end)
if okN and type(canonical) == "string" and canonical ~= "" then fallbackName = canonical
end end
if stale(my) then return nil, nil end if fallbackName and fallbackName ~= "" then
prof = { id = id,
name = fallbackName, displayName = fallbackDisplay or fallbackName,
created = "—", description = "",
isBanned = false, hasVerifiedBadge = false,
} else
return nil, perr end
end local pres = PI.FetchPresence(id)
if stale(my) then return nil, nil end local desc, derr = PI.FetchDesc(id)
if stale(my) then return nil, nil end local thumb = PI.FetchThumb(id)
if stale(my) then return nil, nil end
local isPlaying, notPlayMsg = PI.CheckPlayerIsPlaying(id, pres)
local srvJobId, srvPlaceId, srvCode, srvCodeTxt = PI.ExtractServerInfo(id, pres)
local srvSource = (srvJobId and srvJobId ~= "") and "presence" or nil
local presTxt = PI.PresenceText(pres)
if not isPlaying then
srvJobId, srvCode, srvSource = nil, "", nil
srvCodeTxt = "⛔ " .. tostring(notPlayMsg or "Người chơi không chơi game — tìm server không hoạt động")
end
local rec = {
id = tonumber(prof.id) or id, name = tostring(prof.name or nm or ""),
displayName = tostring(prof.displayName or prof.name or ""), created = type(prof.created) == "string" and prof.created:sub(1, 10) or "—",
description = type(prof.description) == "string" and prof.description or "", isBanned = prof.isBanned == true,
verified = prof.hasVerifiedBadge == true, presence = presTxt,
isPlaying = isPlaying, notPlayingReason = notPlayMsg,
inServer = PI.InThisServer(id, pres), serverJobId = srvJobId, placeId = srvPlaceId, serverCode = srvCode, serverCodeText = srvCodeTxt,
serverSource = srvSource, desc = desc, descErr = derr, thumb = thumb, keep = {}, }
pcall(PI.ParseSkinItems, rec) PI.last = rec
if not isPlaying then
pcall(function() if D.hubJobIn then D.hubJobIn.Text = "" end end)
PI.last = rec return rec, nil
end
if not srvJobId or srvJobId == "" then
pcall(function() if D.hubJobIn then D.hubJobIn.Text = "" end end)
if type(onQuickRender) == "function" then
rec.serverCodeText = "⏳ Đang quét các server công khai tìm @" .. tostring(rec.name) .. "..."
pcall(onQuickRender, rec)
end
local foundJ, foundP, foundSrc, foundMeta, foundCo, npMsg2 = PI.FindPlayerServerByTokens(id, srvPlaceId or game.PlaceId, onProgress, 16, pres)
if stale(my) then return nil, nil end
if npMsg2 then
rec.isPlaying = false rec.notPlayingReason = npMsg2
rec.serverCodeText = "⛔ " .. tostring(npMsg2)
elseif foundJ and foundJ ~= "" then
srvJobId = tostring(foundJ)
srvPlaceId = tonumber(foundP) or srvPlaceId or tonumber(game.PlaceId)
srvSource = foundSrc
srvCode, srvCodeTxt = PI.FormatJobAndPlace(srvJobId, srvPlaceId, foundMeta, foundCo)
rec.serverJobId = srvJobId
rec.placeId = srvPlaceId
rec.serverCode = srvCode
rec.serverMeta = foundMeta
rec.coPlayerName = foundCo
rec.serverSource = srvSource
rec.serverCodeText = srvCodeTxt
else
rec.serverCodeText = srvPlaceId and ("Place: " .. tostring(srvPlaceId) .. " (Không thấy trong SV công khai)") or "Không tìm thấy trong SV công khai game này"
end
end
if srvJobId and srvJobId ~= "" then
pcall(function() if D.hubJobIn then D.hubJobIn.Text = tostring(rec.serverCode ~= "" and rec.serverCode or srvJobId) end end)
end
if srvSource and (type(pres) ~= "table" or (tonumber(pres.userPresenceType) or 0) < 2) then
rec.presence = "🎮 Đang trong game"
end
PI.last = rec return rec, nil
end

do local ACC_TYPE_LABELS = {
Hat = "🎩 Mũ (Hat)", Hair = "💇 Tóc (Hair)",
Face = "🕶️ Kính/Mặt (Face)", Neck = "🧣 Cổ (Neck)",
Shoulder = "🦜 Vai (Shoulder)", Front = "🎖️ Trước ngực (Front)",
Back = "🎒 Lưng (Back)", Waist = "⛓️ Eo (Waist)",
Jacket = "🧥 Áo khoác 3D", Sweater = "🧶 Áo len 3D",
Shirt = "👔 Áo 3D", TShirt = "👕 Áo thun 3D",
Pants = "👖 Quần 3D", Shorts = "🩳 Quần đùi 3D",
DressSkirt = "👗 Váy 3D", LeftShoe = "👟 Giày trái 3D",
RightShoe = "👟 Giày phải 3D", }
local CSV_ACC_PROPS = { { prop = "HatAccessory", sub = "Hat", label = "🎩 Mũ (Hat)" },
{ prop = "HairAccessory", sub = "Hair", label = "💇 Tóc (Hair)" }, { prop = "FaceAccessory", sub = "Face", label = "🕶️ Kính/Mặt (Face)" },
{ prop = "NeckAccessory", sub = "Neck", label = "🧣 Cổ (Neck)" }, { prop = "ShouldersAccessory", sub = "Shoulder", label = "🦜 Vai (Shoulder)" },
{ prop = "FrontAccessory", sub = "Front", label = "🎖️ Trước ngực (Front)" }, { prop = "BackAccessory", sub = "Back", label = "🎒 Lưng (Back)" },
{ prop = "WaistAccessory", sub = "Waist", label = "⛓️ Eo (Waist)" }, }
local BODY_PART_PROPS = { { prop = "Torso", label = "🦾 Thân (Torso)", parts = { "Torso", "UpperTorso", "LowerTorso" } },
{ prop = "LeftArm", label = "🦾 Tay trái (LeftArm)", parts = { "Left Arm", "LeftUpperArm", "LeftLowerArm", "LeftHand" } },
{ prop = "RightArm", label = "🦾 Tay phải (RightArm)", parts = { "Right Arm", "RightUpperArm", "RightLowerArm", "RightHand" } },
{ prop = "LeftLeg", label = "🦿 Chân trái (LeftLeg)", parts = { "Left Leg", "LeftUpperLeg", "LeftLowerLeg", "LeftFoot" } },
{ prop = "RightLeg", label = "🦿 Chân phải (RightLeg)", parts = { "Right Leg", "RightUpperLeg", "RightLowerLeg", "RightFoot" } }, }
local ANIM_PROPS = { "IdleAnimation", "WalkAnimation", "RunAnimation", "JumpAnimation", "FallAnimation", "ClimbAnimation", "SwimAnimation" }
function PI.ProductInfo(assetId) local id = tonumber(assetId)
if not id or id <= 0 then return nil end if PI.productCache[id] ~= nil then
return PI.productCache[id] or nil end
local ok, info = pcall(function() return MarketplaceService:GetProductInfo(id) end) if ok and type(info) == "table" then
local creatorName = type(info.Creator) == "table" and tostring(info.Creator.Name or "") or ""
local entry = { name = tostring(info.Name or ""), creator = creatorName } PI.productCache[id] = entry
return entry end
PI.productCache[id] = false return nil
end function PI.ParseSkinItems(rec)
if type(rec) ~= "table" then return {} end local liveChar = nil
if rec.id then pcall(function()
local p = Players:GetPlayerByUserId(rec.id) if p and p.Character then liveChar = p.Character end
end) end
local desc = rec.desc if not desc and liveChar then
pcall(function() local h = liveChar:FindFirstChildOfClass("Humanoid")
if h then desc = h:GetAppliedDescription()
rec.desc = desc end
end) end
local list = {} local catCounts = { all = 0, accessory = 0, clothing = 0, headface = 0, bodypart = 0, style = 0 }
local function addItem(entry) entry.idx = #list + 1
list[entry.idx] = entry catCounts.all = catCounts.all + 1
local c = entry.category or "accessory" catCounts[c] = (catCounts[c] or 0) + 1
return entry end
local liveAccs = {} if liveChar then
pcall(function() for _, ch in ipairs(liveChar:GetChildren()) do
if ch:IsA("Accessory") then liveAccs[#liveAccs + 1] = ch end end
end) end
local usedLive = {} local seenAccIds = {}
local accOrder = 0 local function extractAccAssetId(la)
if not la then return nil end local aid = nil
pcall(function() aid = tonumber(la.AssetId) or tonumber(la._assetId) or tonumber(la:GetAttribute("AssetId")) end)
if aid and aid > 0 then return aid end pcall(function()
local h = la:FindFirstChild("Handle") if h then
local sm = h:FindFirstChildOfClass("SpecialMesh") local mid = (sm and tostring(sm.MeshId or "")) or tostring(h.MeshId or "")
local n = tonumber(mid:match("(%d+)")) if n and n > 0 then aid = n end
end end)
return aid end
local function matchLiveAcc(aid, subType) if aid and aid > 0 then
for li, la in ipairs(liveAccs) do if not usedLive[li] then
local laAid = extractAccAssetId(la) if laAid and laAid == aid then
usedLive[li] = true return la
end end
end end
if subType and subType ~= "" then for li, la in ipairs(liveAccs) do
if not usedLive[li] then local laAid = extractAccAssetId(la)
if not laAid or laAid == aid then local laType = ""
pcall(function() local at = la.AccessoryType
if type(at) == "table" and at.Name then laType = tostring(at.Name) else laType = tostring(at or ""):gsub("^Enum%.AccessoryType%.", "") end
end) if laType ~= "" and string.lower(laType) == string.lower(subType) then
usedLive[li] = true return la
end end
end end
end return nil
end if desc then
local okA, rawAcc = pcall(function() return desc:GetAccessories(true) end) if okA and type(rawAcc) == "table" then
for _, s in ipairs(rawAcc) do if type(s) == "table" then
local aid = tonumber(s.AssetId) or 0 if aid > 0 then
accOrder = accOrder + 1 seenAccIds[aid] = true
local atName = "" if type(s.AccessoryType) == "table" and s.AccessoryType.Name then
atName = tostring(s.AccessoryType.Name) else
atName = tostring(s.AccessoryType or ""):gsub("^Enum%.AccessoryType%.", "") end
local matchedLive = matchLiveAcc(aid, atName) addItem({
accOrder = accOrder, category = "accessory",
subType = atName ~= "" and atName or "Accessory", typeLabel = ACC_TYPE_LABELS[atName] or (s.IsLayered and "🧥 Đồ 3D" or "🎩 Phụ kiện"),
assetId = aid, isLayered = s.IsLayered == true,
spec = { AssetId = aid,
AccessoryType = s.AccessoryType, IsLayered = s.IsLayered == true,
Order = s.Order, Puffiness = s.Puffiness,
}, instName = matchedLive and tostring(matchedLive.Name or "") or nil,
name = (matchedLive and tostring(matchedLive.Name or "") ~= "" and tostring(matchedLive.Name)) or nil, loading = true,
}) end
end end
end for _, cp in ipairs(CSV_ACC_PROPS) do
pcall(function() local csv = tostring(desc[cp.prop] or "")
for numStr in csv:gmatch("(%d+)") do
local aid = tonumber(numStr) or 0 if aid > 0 and not seenAccIds[aid] then
seenAccIds[aid] = true accOrder = accOrder + 1
local matchedLive = matchLiveAcc(aid, cp.sub) addItem({
accOrder = accOrder, category = "accessory",
subType = cp.sub, propName = cp.prop,
typeLabel = cp.label, assetId = aid,
isLayered = false, spec = { AssetId = aid, AccessoryType = Enum.AccessoryType and Enum.AccessoryType[cp.sub] or cp.sub, IsLayered = false },
instName = matchedLive and tostring(matchedLive.Name or "") or nil,
name = (matchedLive and tostring(matchedLive.Name or "") ~= "" and tostring(matchedLive.Name)) or nil, loading = true,
}) end
end end)
end end
for li, la in ipairs(liveAccs) do if not usedLive[li] then
local laAid = 0 pcall(function() laAid = tonumber(la.AssetId) or 0 end)
if laAid == 0 or not seenAccIds[laAid] then if laAid > 0 then seenAccIds[laAid] = true end
accOrder = accOrder + 1 usedLive[li] = true
addItem({ accOrder = accOrder,
category = "accessory", subType = "Accessory",
typeLabel = "🎩 Phụ kiện", assetId = laAid,
isLayered = false, instName = tostring(la.Name or "Accessory"),
name = tostring(la.Name or "Phụ kiện trên nhân vật"), loading = laAid > 0,
}) end
end end
local function checkCloth(prop, className, label, defaultName) local aid = 0
if desc then pcall(function() aid = tonumber(desc[prop]) or 0 end) end local liveInst = nil
if liveChar then pcall(function() liveInst = liveChar:FindFirstChildOfClass(className) end) end if aid > 0 or liveInst then
addItem({ category = "clothing",
subType = prop, propName = prop,
className = className, typeLabel = label,
assetId = aid, instName = liveInst and tostring(liveInst.Name or className) or className,
name = (aid == 0 and ((liveInst and tostring(liveInst.Name or "") ~= "" and tostring(liveInst.Name)) or defaultName)) or nil, loading = aid > 0,
}) end
end checkCloth("Shirt", "Shirt", "👕 Áo 2D (Shirt)", "Áo 2D đang mặc")
checkCloth("Pants", "Pants", "👖 Quần 2D (Pants)", "Quần 2D đang mặc")
checkCloth("GraphicTShirt", "ShirtGraphic", "🖼️ Áo thun (T-Shirt)", "Áo thun hình") local liveHead = nil
if liveChar then pcall(function() liveHead = liveChar:FindFirstChild("Head") end) end local faceAid = 0
if desc then pcall(function() faceAid = tonumber(desc.Face) or 0 end) end local liveFace = nil
if liveHead then pcall(function() liveFace = liveHead:FindFirstChildOfClass("Decal") end) end if faceAid > 0 or liveFace then
addItem({ category = "headface",
subType = "Face", propName = "Face",
typeLabel = "🙂 Khuôn mặt (Face)", assetId = faceAid,
instName = liveFace and tostring(liveFace.Name or "face") or "face", name = (faceAid == 0 and "Khuôn mặt mặc định / Decal") or nil,
loading = faceAid > 0, })
end local headAid = 0
if desc then pcall(function() headAid = tonumber(desc.Head) or 0 end) end local isHeadless = false
local hasHeadMesh = false if liveHead then
pcall(function() isHeadless = (tonumber(liveHead.Transparency) or 0) >= 0.95 end)
pcall(function() hasHeadMesh = liveHead:IsA("MeshPart") and tostring(liveHead.MeshId or "") ~= "" end) end
if headAid > 0 or isHeadless or hasHeadMesh then addItem({
category = "headface", subType = "Head",
propName = "Head", typeLabel = "🗣️ Kiểu đầu (Head)",
assetId = headAid, name = (headAid == 0 and (isHeadless and "Đầu tàng hình (Headless)" or "Kiểu đầu Mesh riêng")) or nil,
loading = headAid > 0, })
end for _, bp in ipairs(BODY_PART_PROPS) do
local aid = 0 if desc then pcall(function() aid = tonumber(desc[bp.prop]) or 0 end) end
if aid > 0 then addItem({
category = "bodypart", subType = bp.prop,
propName = bp.prop, bodyParts = bp.parts,
typeLabel = bp.label, assetId = aid,
loading = true, })
end end
local ws, hs, ds, hds = 1, 1, 1, 1 if desc then
pcall(function() if tonumber(desc.WidthScale) and tonumber(desc.WidthScale) > 0 then ws = tonumber(desc.WidthScale) end end)
pcall(function() if tonumber(desc.HeightScale) and tonumber(desc.HeightScale) > 0 then hs = tonumber(desc.HeightScale) end end)
pcall(function() if tonumber(desc.DepthScale) and tonumber(desc.DepthScale) > 0 then ds = tonumber(desc.DepthScale) end end)
pcall(function() if tonumber(desc.HeadScale) and tonumber(desc.HeadScale) > 0 then hds = tonumber(desc.HeadScale) end end) end
if liveChar then pcall(function()
local lh = liveChar:FindFirstChildOfClass("Humanoid") if lh then
local function rScale(k, cur) local nv = lh:FindFirstChild(k)
if nv and nv:IsA("NumberValue") and tonumber(nv.Value) and tonumber(nv.Value) > 0 then
if math.abs(cur - 1) < 1e-3 then return tonumber(nv.Value) end end
return cur end
ws = rScale("BodyWidthScale", ws) hs = rScale("BodyHeightScale", hs)
ds = rScale("BodyDepthScale", ds) hds = rScale("HeadScale", hds)
end end)
end rec.bodySummary = string.format("Rộng %d%% · Cao %d%% · Dày %d%% · Đầu %d%%",
math.floor(ws * 100 + 0.5), math.floor(hs * 100 + 0.5), math.floor(ds * 100 + 0.5), math.floor(hds * 100 + 0.5)) if desc or liveChar then
addItem({ category = "style",
subType = "BodyColors", typeLabel = "🎨 Màu da",
assetId = 0, name = "Màu da nhân vật (BodyColors)",
loading = false, })
addItem({ category = "style",
subType = "Scales", typeLabel = "📐 Tỉ lệ cơ thể",
assetId = 0, name = rec.bodySummary,
loading = false, })
local firstAnim = 0 if desc then
for _, ap in ipairs(ANIM_PROPS) do pcall(function()
local v = tonumber(desc[ap]) or 0 if v > 0 and firstAnim == 0 then firstAnim = v end
end) end
end if firstAnim > 0 then
addItem({ category = "style",
subType = "Animations", typeLabel = "💃 Hoạt ảnh",
assetId = firstAnim, name = "Gói hoạt ảnh đi/đứng/chạy",
loading = true, })
end else
rec.bodySummary = "Không có dữ liệu skin công khai" end
rec.skinItems = list rec.acc = list
rec.catCounts = catCounts rec.keep = type(rec.keep) == "table" and rec.keep or {}
for i = 1, #list do if rec.keep[i] == nil then rec.keep[i] = true end
end return list
end function PI.ParseAccessories(desc)
local dummy = { desc = desc, keep = {} } return PI.ParseSkinItems(dummy)
end function PI.EnsureSkinItems(rec)
if type(rec) ~= "table" then return {} end if type(rec.skinItems) ~= "table" then
PI.ParseSkinItems(rec) end
return rec.skinItems or {} end
function PI.KeptCount(rec, categoryFilter) if type(rec) ~= "table" then return 0, 0, 0 end
local list = PI.EnsureSkinItems(rec) local keep = rec.keep or {}
local cat = (categoryFilter and categoryFilter ~= "" and categoryFilter ~= "all") and categoryFilter or nil local k, total = 0, 0
for _, it in ipairs(list) do if not cat or it.category == cat then
total = total + 1 if keep[it.idx] ~= false then k = k + 1 end
end end
return k, total, (total - k) end
function PI.HasRemovedSkinItems(rec) if type(rec) ~= "table" then return false end
local k, total = PI.KeptCount(rec) return total > 0 and k < total
end function PI.FilteredDesc(rec)
if type(rec) ~= "table" or rec.desc == nil then return nil end PI.EnsureSkinItems(rec)
if not PI.HasRemovedSkinItems(rec) then return rec.desc end local ok, d = pcall(function() return rec.desc:Clone() end)
if not ok or d == nil then return rec.desc end local keep = rec.keep or {}
local keptSpecs = {} local removedAccIds = {}
local hasAccChange = false for _, it in ipairs(rec.skinItems or {}) do
local isKept = (keep[it.idx] ~= false) if it.category == "accessory" then
if isKept then if it.spec then keptSpecs[#keptSpecs + 1] = it.spec end
else hasAccChange = true
if it.assetId and it.assetId > 0 then removedAccIds[it.assetId] = true end end
elseif not isKept then if it.propName then
pcall(function() d[it.propName] = 0 end) end
if it.subType == "BodyColors" then local defCol = Color3.fromRGB(226, 220, 188)
for _, ck in ipairs({ "HeadColor", "TorsoColor", "LeftArmColor", "RightArmColor", "LeftLegColor", "RightLegColor" }) do
pcall(function() d[ck] = defCol end) end
elseif it.subType == "Scales" then pcall(function() d.WidthScale = 1 end)
pcall(function() d.HeightScale = 1 end) pcall(function() d.DepthScale = 1 end)
pcall(function() d.HeadScale = 1 end) pcall(function() d.BodyTypeScale = 0 end)
pcall(function() d.ProportionScale = 0 end) elseif it.subType == "Animations" then
for _, ap in ipairs(ANIM_PROPS) do pcall(function() d[ap] = 0 end)
end end
end end
if hasAccChange then pcall(function() d:SetAccessories(keptSpecs, true) end)
for _, cp in ipairs(CSV_ACC_PROPS) do pcall(function()
local csv = tostring(d[cp.prop] or "") if csv ~= "" then
local keptNums = {}
for numStr in csv:gmatch("(%d+)") do
local n = tonumber(numStr) if n and not removedAccIds[n] then keptNums[#keptNums + 1] = tostring(n) end
end d[cp.prop] = table.concat(keptNums, ",")
end end)
end end
return d end
function PI.ApplySkinFilterToModel(model, rec) if not model or type(rec) ~= "table" then return end
PI.EnsureSkinItems(rec) if not PI.HasRemovedSkinItems(rec) then return end
local keep = rec.keep or {} local list = rec.skinItems or {}
local totalAcc, keptAcc = 0, 0 for _, it in ipairs(list) do
if it.category == "accessory" then totalAcc = totalAcc + 1
if keep[it.idx] ~= false then keptAcc = keptAcc + 1 end end
end local realChar = player and player.Character
local isRealCharTarget = (realChar ~= nil and (model == realChar or model:IsDescendantOf(realChar))) local modelAccs = {}
pcall(function() for _, ch in ipairs(model:GetChildren()) do
if ch:IsA("Accessory") then local keepGameSkin = isRealCharTarget and PI.IsInGameSupportedSkinItem and PI.IsInGameSupportedSkinItem(ch, model)
if not keepGameSkin then modelAccs[#modelAccs + 1] = ch
end end
end end)
local canPositionalMatch = (#modelAccs == totalAcc and totalAcc > 0) if totalAcc > 0 and keptAcc == 0 then
for _, acc in ipairs(modelAccs) do pcall(function() acc:Destroy() end)
end end
for _, it in ipairs(list) do if keep[it.idx] == false then
if it.category == "accessory" and keptAcc > 0 then local removed = false
for _, acc in ipairs(modelAccs) do if acc and acc.Parent then
local accAid = nil pcall(function() accAid = tonumber(acc.AssetId) or tonumber(acc._assetId) or tonumber(acc:GetAttribute("AssetId")) end)
if not accAid or accAid <= 0 then pcall(function()
local h = acc:FindFirstChild("Handle") if h then
local sm = h:FindFirstChildOfClass("SpecialMesh") local mid = (sm and tostring(sm.MeshId or "")) or tostring(h.MeshId or "")
local n = tonumber(mid:match("(%d+)")) if n and n > 0 then accAid = n end
end end)
end if (it.instName and acc.Name == it.instName)
or (it.name and acc.Name == it.name) or (it.assetId and it.assetId > 0 and accAid == it.assetId) then
pcall(function() acc:Destroy() end) removed = true
break end
end end
if not removed and canPositionalMatch and it.accOrder and modelAccs[it.accOrder] then pcall(function() modelAccs[it.accOrder]:Destroy() end)
end elseif it.category == "clothing" then
local cls = it.className or (it.subType == "GraphicTShirt" and "ShirtGraphic" or it.subType) if cls then
pcall(function() for _, ch in ipairs(model:GetChildren()) do
if ch:IsA(cls) then local keepGameClothing = isRealCharTarget and (ch:GetAttribute("BC_GameSkinItem") == true)
if not keepGameClothing then ch:Destroy()
end end
end end)
end elseif it.category == "headface" then
local head = model:FindFirstChild("Head") if it.subType == "Face" and head then
pcall(function() for _, ch in ipairs(head:GetDescendants()) do
if ch:IsA("Decal") then ch.Texture = "rbxasset://textures/face.png"
end end
end) elseif it.subType == "Head" and head then
pcall(function() head.Transparency = 0
head.LocalTransparencyModifier = 0 local morph = head:FindFirstChild("BC_MorphPart_Head")
if morph then morph:Destroy() end if head:IsA("MeshPart") then
pcall(function() head.MeshId = "" end) pcall(function() head.TextureID = "" end)
end end)
end elseif it.category == "bodypart" then
pcall(function() for _, pName in ipairs(it.bodyParts or {}) do
local p = model:FindFirstChild(pName) if p and p:IsA("BasePart") then
p.Transparency = 0 p.LocalTransparencyModifier = 0
local morph = p:FindFirstChild("BC_MorphPart_" .. pName) if morph then morph:Destroy() end
if p:IsA("MeshPart") then pcall(function() p.MeshId = "" end)
pcall(function() p.TextureID = "" end) end
end end
end) elseif it.category == "style" then
if it.subType == "BodyColors" then local defCol = Color3.fromRGB(226, 220, 188)
pcall(function() local bc = model:FindFirstChildOfClass("BodyColors")
if bc then bc.HeadColor3 = defCol
bc.TorsoColor3 = defCol bc.LeftArmColor3 = defCol
bc.RightArmColor3 = defCol bc.LeftLegColor3 = defCol
bc.RightLegColor3 = defCol end
for _, bp in ipairs(model:GetChildren()) do if bp:IsA("BasePart") and bp.Name ~= "HumanoidRootPart" then
bp.Color = defCol end
end end)
elseif it.subType == "Scales" then pcall(function()
local hum = model:FindFirstChildOfClass("Humanoid")
local oldScales = { BodyWidthScale = 1, BodyHeightScale = 1, BodyDepthScale = 1, HeadScale = 1 } if hum then
for k, _ in pairs(oldScales) do local nv = hum:FindFirstChild(k)
if nv and nv:IsA("NumberValue") then oldScales[k] = tonumber(nv.Value) or 1
nv.Value = 1 end
end for _, k in ipairs({ "BodyTypeScale", "ProportionScale" }) do
local nv = hum:FindFirstChild(k) if nv and nv:IsA("NumberValue") then nv.Value = 0 end
end end
for _, bp in ipairs(model:GetChildren()) do if bp:IsA("BasePart") and bp.Name ~= "HumanoidRootPart" then
local osObj = bp:FindFirstChild("OriginalSize") if osObj and osObj:IsA("Vector3Value") and osObj.Value then
bp.Size = osObj.Value elseif bp.Size then
local isH = (bp.Name == "Head") local sx = isH and oldScales.HeadScale or oldScales.BodyWidthScale
local sy = isH and oldScales.HeadScale or oldScales.BodyHeightScale local sz = isH and oldScales.HeadScale or oldScales.BodyDepthScale
if sx > 0 and sy > 0 and sz > 0 and (math.abs(sx - 1) > 0.01 or math.abs(sy - 1) > 0.01 or math.abs(sz - 1) > 0.01) then
bp.Size = Vector3.new(bp.Size.X / sx, bp.Size.Y / sy, bp.Size.Z / sz) end
end end
end end)
end end
end end
end end

function PI.MakeRig(desc, rigTypes) local lastErr = "không có kiểu rig phù hợp"
for _, rt in ipairs(rigTypes) do local ok, m = pcall(function() return Players:CreateHumanoidModelFromDescription(desc, rt) end)
if ok and m ~= nil then return m, nil end lastErr = tostring(m)
end return nil, lastErr
end function PI.DiagnoseClothes() end
function PI.GetCharacterAndHumanoid(plr) plr = plr or player
if not plr then return nil, nil, Enum.HumanoidRigType.R15 end local char = plr.Character
local function hasAnyBodyPart(m) return m and ((m:FindFirstChild("Head", true) ~= nil) or (m:FindFirstChild("Torso", true) ~= nil)
or (m:FindFirstChild("UpperTorso", true) ~= nil) or (m:FindFirstChild("HumanoidRootPart", true) ~= nil)
or (m:FindFirstChildWhichIsA("BasePart", true) ~= nil)) end
if not (char and char.Parent and hasAnyBodyPart(char)) then pcall(function()
local g = workspace:FindFirstChild("Game") local gp = g and g:FindFirstChild("Players")
local uidStr = tostring(plr.UserId or "") local cand = (gp and (gp:FindFirstChild(plr.Name) or gp:FindFirstChild(uidStr)))
or (workspace:FindFirstChild("Players") and (workspace.Players:FindFirstChild(plr.Name) or workspace.Players:FindFirstChild(uidStr)))
or (workspace:FindFirstChild("Characters") and (workspace.Characters:FindFirstChild(plr.Name) or workspace.Characters:FindFirstChild(uidStr)))
or (workspace:FindFirstChild("Live") and (workspace.Live:FindFirstChild(plr.Name) or workspace.Live:FindFirstChild(uidStr)))
or workspace:FindFirstChild(plr.Name) if not (cand and hasAnyBodyPart(cand)) and plr == player then
local cam = workspace.CurrentCamera local subj = cam and cam.CameraSubject
local subModel = subj and (subj:IsA("Model") and subj or subj:FindFirstAncestorOfClass("Model"))
if subModel and subModel ~= PI._virtualAvatar and hasAnyBodyPart(subModel) then cand = subModel
end end
if cand and hasAnyBodyPart(cand) then char = cand end end)
end if not char then return nil, nil, Enum.HumanoidRigType.R15 end
local hum = char:FindFirstChildOfClass("Humanoid") or char:FindFirstChildWhichIsA("Humanoid", true)
local rigType = (hum and hum.RigType) or Enum.HumanoidRigType.R15
if char:FindFirstChild("Torso", true) and not char:FindFirstChild("UpperTorso", true) then rigType = Enum.HumanoidRigType.R6
elseif char:FindFirstChild("UpperTorso", true) then rigType = Enum.HumanoidRigType.R15
end return char, hum, rigType
end PI.LocateUserCharacter = function() return PI.GetCharacterAndHumanoid(player) end
function PI.GetVisualSubRigs(char) local list, seen = {}, {}
if not char then return list end local function checkSub(ch)
if not ch or seen[ch] or not ch:IsA("Model") or ch == char or ch == PI._virtualAvatar then return end
if tostring(ch.Name):find("^BC_") or (PI.IsInsideHeldItemOrTool and PI.IsInsideHeldItemOrTool(ch, char)) then return end local isGameModel = false
pcall(function() isGameModel = (ch:GetAttribute("BC_GameSkinItem") == true) or (ch:GetAttribute("GameSkin") == true)
or (ch:GetAttribute("InGameSkin") == true) or (ch:GetAttribute("Cosmetic") == true) or (ch:GetAttribute("IsCosmetic") == true) end)
local ln = string.lower(tostring(ch.Name))
if ln:find("gameskin", 1, true) or ln:find("cosmetic", 1, true) or ln:find("stilts", 1, true) or ln:find("unusual", 1, true) or ln:find("armor", 1, true) then
isGameModel = true end
if not isGameModel then
local hasBodyRig = ((ch:FindFirstChild("Head") ~= nil) and ((ch:FindFirstChild("Torso") ~= nil) or (ch:FindFirstChild("UpperTorso") ~= nil)))
or (ch:FindFirstChildOfClass("Humanoid") ~= nil) if hasBodyRig then
seen[ch] = true table.insert(list, ch)
end end
end pcall(function()
for _, ch in ipairs(char:GetChildren()) do if ch:IsA("Model") then checkSub(ch)
elseif ch:IsA("Folder") then for _, sub in ipairs(ch:GetChildren()) do checkSub(sub) end
end end
end) return list
end local VISIBLE_LIMB_NAMES = {
["Head"] = true, ["Torso"] = true, ["Left Arm"] = true, ["Right Arm"] = true, ["Left Leg"] = true, ["Right Leg"] = true,
["UpperTorso"] = true, ["LowerTorso"] = true,
["LeftUpperArm"] = true, ["LeftLowerArm"] = true, ["LeftHand"] = true,
["RightUpperArm"] = true, ["RightLowerArm"] = true, ["RightHand"] = true,
["LeftUpperLeg"] = true, ["LeftLowerLeg"] = true, ["LeftFoot"] = true,
["RightUpperLeg"] = true, ["RightLowerLeg"] = true, ["RightFoot"] = true,
} function PI.CloneLiveCharacter(source, modelName)
if not source then return nil, "không có character nguồn" end local cloneTarget = source
pcall(function() if not source:FindFirstChild("Head") and not source:FindFirstChild("Torso") and not source:FindFirstChild("UpperTorso") then
local subs = PI.GetVisualSubRigs(source) if #subs > 0 then cloneTarget = subs[1] end
end end)
local savedArch = {} local wasArch = true
pcall(function() wasArch = cloneTarget.Archivable
cloneTarget.Archivable = true for _, d in ipairs(cloneTarget:GetDescendants()) do
pcall(function() if d.Archivable == false then
savedArch[d] = false d.Archivable = true
end end)
end end)
local okClone, clone = pcall(function() return cloneTarget:Clone() end) pcall(function()
cloneTarget.Archivable = wasArch for d, v in pairs(savedArch) do
pcall(function() d.Archivable = v end) end
end) if not okClone or not clone then return nil, tostring(clone) end
pcall(function() clone.Name = modelName or "BC_PlayerAvatarCopy" end) pcall(function() clone:SetAttribute("BC_IsLiveClone", true) end)
local allLimbsInvisible = true local limbCount = 0
pcall(function() for _, child in ipairs(clone:GetDescendants()) do
if child:IsA("Script") or child:IsA("LocalScript") or child:IsA("ForceField")
or child:IsA("Tool") or child:IsA("HopperBin") or child:IsA("BackpackItem")
or (PI.IsInsideHeldItemOrTool and PI.IsInsideHeldItemOrTool(child, clone))
or child:IsA("BodyMover") or child:IsA("LinearVelocity") or child:IsA("AngularVelocity")
or child:IsA("AlignPosition") or child:IsA("AlignOrientation") or child:IsA("VectorForce") then child:Destroy()
elseif child:IsA("JointInstance") and tostring(child.Name) == "SeatWeld" then child:Destroy()
elseif child:IsA("JointInstance") or child:IsA("WeldConstraint") or child:IsA("RigidConstraint") then pcall(function()
if child.Part0 and not child.Part0:IsDescendantOf(clone) then local np0 = clone:FindFirstChild(child.Part0.Name, true)
if np0 and np0:IsA("BasePart") then child.Part0 = np0
else child:Destroy()
return end
end if child.Part1 and not child.Part1:IsDescendantOf(clone) then
local np1 = clone:FindFirstChild(child.Part1.Name, true) if np1 and np1:IsA("BasePart") then
child.Part1 = np1 else
child:Destroy() return
end end
if child:IsA("Motor6D") then child.Transform = CFrame.new(0, 0, 0)
end end)
elseif child:IsA("BasePart") then child.LocalTransparencyModifier = 0
if VISIBLE_LIMB_NAMES[child.Name] then limbCount = limbCount + 1
if (tonumber(child.Transparency) or 0) < 0.95 then allLimbsInvisible = false
else child.Transparency = 0
end end
end end
if limbCount > 0 and allLimbsInvisible then pcall(function() clone:SetAttribute("BC_WasInvisibleRig", true) end)
end
local cHrp = clone:FindFirstChild("HumanoidRootPart") or clone:FindFirstChild("Torso") or clone:FindFirstChild("UpperTorso") or clone:FindFirstChildWhichIsA("BasePart", true)
if cHrp then clone.PrimaryPart = cHrp end local cHum = clone:FindFirstChildOfClass("Humanoid")
if cHum then cHum.Sit = false
cHum.PlatformStand = false end
end) for _, className in ipairs({"Shirt", "Pants", "ShirtGraphic", "BodyColors"}) do
pcall(function() local sourceClothing = cloneTarget:FindFirstChildOfClass(className) or source:FindFirstChildOfClass(className)
if not sourceClothing then return end local okClothing, clothingCopy = pcall(function() return sourceClothing:Clone() end)
if not okClothing or not clothingCopy then return end local old = clone:FindFirstChildOfClass(className)
if old then old:Destroy() end clothingCopy.Parent = clone
end) end
return clone, nil end

do PI.savedSkins = (type(Store) == "table" and type(Store.savedSkins) == "table") and Store.savedSkins or {}
PI.autoUseSkin = (type(Store) == "table" and type(Store.autoUseSkin) == "table") and Store.autoUseSkin or nil local SCALAR_DESC_NUMS = {
"Shirt", "Pants", "GraphicTShirt", "Face", "Head", "Torso", "LeftArm", "RightArm", "LeftLeg", "RightLeg",
"WidthScale", "HeightScale", "DepthScale", "HeadScale", "BodyTypeScale", "ProportionScale",
"IdleAnimation", "WalkAnimation", "RunAnimation", "JumpAnimation", "FallAnimation", "ClimbAnimation", "SwimAnimation", }
local SCALAR_DESC_STRS = { "HatAccessory", "HairAccessory", "FaceAccessory", "NeckAccessory",
"ShouldersAccessory", "FrontAccessory", "BackAccessory", "WaistAccessory", }
local COLOR_DESC_KEYS = { "HeadColor", "TorsoColor", "LeftArmColor", "RightArmColor", "LeftLegColor", "RightLegColor",
} function PI.SerializeDesc(desc)
if not desc then return nil end local snap = { nums = {}, strs = {}, cols = {}, accs = {} }
for _, k in ipairs(SCALAR_DESC_NUMS) do pcall(function()
local v = tonumber(desc[k]) if v ~= nil then snap.nums[k] = v end
end) end
for _, k in ipairs(SCALAR_DESC_STRS) do pcall(function()
local v = tostring(desc[k] or "") if v ~= "" then snap.strs[k] = v end
end) end
for _, k in ipairs(COLOR_DESC_KEYS) do pcall(function()
local c = desc[k] if c and tonumber(c.R) and tonumber(c.G) and tonumber(c.B) then
snap.cols[k] = { r = tonumber(c.R), g = tonumber(c.G), b = tonumber(c.B) } end
end) end
pcall(function() for _, s in ipairs(desc:GetAccessories(true) or {}) do
if type(s) == "table" and (tonumber(s.AssetId) or 0) > 0 then local atName = tostring(s.AccessoryType or ""):gsub("^Enum%.AccessoryType%.", "")
snap.accs[#snap.accs + 1] = { AssetId = tonumber(s.AssetId),
AccessoryType = atName ~= "" and atName or "Hat", IsLayered = (s.IsLayered == true),
Order = tonumber(s.Order), Puffiness = tonumber(s.Puffiness),
} end
end end)
return snap end
function PI.DeserializeDesc(snap) if type(snap) ~= "table" then return nil end
local okD, d = pcall(function() return Instance.new("HumanoidDescription") end) if not okD or not d then return nil end
for k, v in pairs(snap.nums or {}) do pcall(function() d[k] = tonumber(v) or 0 end)
end for k, v in pairs(snap.strs or {}) do
pcall(function() d[k] = tostring(v or "") end) end
for k, c in pairs(snap.cols or {}) do if type(c) == "table" then
pcall(function() d[k] = Color3.new(tonumber(c.r) or 0.9, tonumber(c.g) or 0.85, tonumber(c.b) or 0.75) end) end
end if type(snap.accs) == "table" and #snap.accs > 0 then
local specs = {} for _, a in ipairs(snap.accs) do
if type(a) == "table" and (tonumber(a.AssetId) or 0) > 0 then local at = tostring(a.AccessoryType or "Hat")
local enumAt = nil pcall(function() enumAt = Enum.AccessoryType[at] end)
specs[#specs + 1] = { AssetId = tonumber(a.AssetId),
AccessoryType = enumAt or at, IsLayered = (a.IsLayered == true),
Order = tonumber(a.Order), Puffiness = tonumber(a.Puffiness),
} end
end pcall(function() d:SetAccessories(specs, true) end)
end return d
end function PI.SerializeSkinEntry(rec, mode)
if type(rec) ~= "table" then return nil end PI.EnsureSkinItems(rec)
local kept, total, deleted = PI.KeptCount(rec) local keepMap = {}
local removedAssets = {} local removedSubTypes = {}
local removedInstNames = {} local keep = rec.keep or {}
for _, it in ipairs(rec.skinItems or {}) do local isKept = (keep[it.idx] ~= false)
keepMap[tostring(it.idx)] = isKept if not isKept then
if it.assetId and it.assetId > 0 then removedAssets[#removedAssets + 1] = tonumber(it.assetId)
end if it.subType and it.subType ~= "" and it.category ~= "accessory" then
removedSubTypes[#removedSubTypes + 1] = tostring(it.subType) end
if it.instName and it.instName ~= "" then removedInstNames[#removedInstNames + 1] = tostring(it.instName)
end end
end local effMode = "local"
local savedAt = "" pcall(function() if os and os.date then savedAt = os.date("%H:%M:%S") end end)
local modeLabel = "Mặc LOCAL" local delTag = deleted > 0 and (" · đã xoá " .. tostring(deleted) .. " món") or ""
local label = string.format("@%s (%s) · Giữ %d/%d món%s [%s]",
tostring(rec.name or rec.id), tostring(rec.displayName or rec.name or rec.id), kept, total, delTag, modeLabel) return {
uid = string.format("%s_%d_%d", tostring(rec.id or 0), kept, total), id = tonumber(rec.id) or 0,
name = tostring(rec.name or ""), displayName = tostring(rec.displayName or rec.name or ""),
label = label, thumb = type(rec.thumb) == "string" and rec.thumb or "",
mode = effMode, keptCount = kept,
totalCount = total, deletedCount = deleted,
keepMap = keepMap, removedAssets = removedAssets,
removedSubTypes = removedSubTypes, removedInstNames = removedInstNames,
descSnapshot = PI.SerializeDesc(rec.desc), savedAt = savedAt,
} end
function PI.BuildRecFromSavedEntry(entry) if type(entry) ~= "table" then return nil, "bản lưu skin không hợp lệ" end
local id = tonumber(entry.id) or 0 local nm = tostring(entry.name or "")
if id <= 0 and nm ~= "" then local rId, rNm = PI.ResolveUser(nm)
if rId then id = rId
if nm == "" and rNm then nm = rNm end end
end local desc = nil
if type(entry.descSnapshot) == "table" then desc = PI.DeserializeDesc(entry.descSnapshot)
end if not desc and id > 0 then
desc = PI.FetchDesc(id) end
local rec = { id = id,
name = nm ~= "" and nm or tostring(id), displayName = tostring(entry.displayName or nm or id),
created = "Đã lưu",
description = "Skin nạp từ Kho Đã Lưu" .. (entry.savedAt and entry.savedAt ~= "" and (" (lúc " .. tostring(entry.savedAt) .. ")") or ""),
isBanned = false, verified = false,
presence = "💾 Bản lưu Skin", inServer = id > 0 and PI.InThisServer(id, nil) or false,
desc = desc, thumb = type(entry.thumb) == "string" and entry.thumb or "",
keep = {}, }
PI.ParseSkinItems(rec) local remAssets, remSubs, remInsts = {}, {}, {}
for _, a in ipairs(entry.removedAssets or {}) do remAssets[tonumber(a) or -1] = true end
for _, s in ipairs(entry.removedSubTypes or {}) do remSubs[tostring(s)] = true end
for _, ins in ipairs(entry.removedInstNames or {}) do remInsts[tostring(ins)] = true end
local kMap = type(entry.keepMap) == "table" and entry.keepMap or nil local delCnt = tonumber(entry.deletedCount) or 0
local keptCnt = tonumber(entry.keptCount) if delCnt > 0 and keptCnt == 0 then
for _, it in ipairs(rec.skinItems or {}) do rec.keep[it.idx] = false
end elseif delCnt > 0 or kMap then
for _, it in ipairs(rec.skinItems or {}) do local isRem = false
if it.assetId and it.assetId > 0 and remAssets[it.assetId] then isRem = true end if it.instName and remInsts[it.instName] then isRem = true end
if it.category ~= "accessory" and it.subType and remSubs[it.subType] then isRem = true end if not isRem and kMap ~= nil then
local kv = kMap[tostring(it.idx)] if kv == nil then kv = kMap[it.idx] end
if kv == false then isRem = true end end
rec.keep[it.idx] = not isRem end
end return rec, nil
end function PI.PersistSkins()
if type(Store) == "table" then Store.savedSkins = PI.savedSkins
Store.autoUseSkin = PI.autoUseSkin pcall(Store.save)
end end
function PI.IsSameSavedSkin(a, b) if type(a) ~= "table" or type(b) ~= "table" then return false end
if tonumber(a.id) and tonumber(b.id) and tonumber(a.id) > 0 and tonumber(b.id) > 0 then return tonumber(a.id) == tonumber(b.id)
and (tonumber(a.keptCount) or 0) == (tonumber(b.keptCount) or 0) and (tonumber(a.deletedCount) or 0) == (tonumber(b.deletedCount) or 0)
end return string.lower(tostring(a.name or "")) == string.lower(tostring(b.name or ""))
end function PI.SaveSkin(rec, mode)
if type(rec) ~= "table" or (rec.desc == nil and rec.id == nil) then return false, "chưa có skin người chơi để lưu (hãy tra cứu trước)", nil
end local entry = PI.SerializeSkinEntry(rec, mode)
if not entry then return false, "không đóng gói được dữ liệu skin", nil end local updated = false
for i, ex in ipairs(PI.savedSkins) do if PI.IsSameSavedSkin(ex, entry) then
PI.savedSkins[i] = entry updated = true
break end
end if not updated then
table.insert(PI.savedSkins, 1, entry) end
if PI.autoUseSkin and PI.IsSameSavedSkin(PI.autoUseSkin, entry) then PI.autoUseSkin = entry
end PI.PersistSkins()
if PI.RefreshSavedSkinsUI then pcall(PI.RefreshSavedSkinsUI) end if PI.RefreshButtons then pcall(PI.RefreshButtons) end
local msg = string.format("Đã lưu skin @%s (giữ %d/%d món, đã xoá %d món)",
tostring(entry.name), entry.keptCount or 0, entry.totalCount or 0, entry.deletedCount or 0) return true, msg, entry
end function PI.ApplySavedSkinEntry(entry, modeOverride, existingRec)
if type(entry) ~= "table" then return false, "bản lưu skin trống", nil end if type(modeOverride) == "table" then
existingRec = modeOverride modeOverride = nil
end local rec, err = existingRec, nil
if type(rec) ~= "table" then rec, err = PI.BuildRecFromSavedEntry(entry)
end if not rec then return false, tostring(err or "không đọc được skin đã lưu"), nil end
PI.last = rec if PI.OnSavedRecLoaded then pcall(PI.OnSavedRecLoaded, rec) end
local ok, msg = PI.ApplyLocal(rec) if PI.RefreshSavedSkinsUI then pcall(PI.RefreshSavedSkinsUI) end
if PI.RefreshButtons then pcall(PI.RefreshButtons) end return ok, msg, rec
end function PI.SaveSkinForAutoUse(rec, mode, applyNow)
if type(rec) ~= "table" or (rec.desc == nil and rec.id == nil) then
return false, "chưa có skin người chơi để Lưu Skin Dùng (hãy tra cứu trước)", nil end
local okSave, saveMsg, entry = PI.SaveSkin(rec, "local") if not okSave or not entry then
return false, tostring(saveMsg or "không lưu được skin"), nil end
PI.autoUseSkin = entry PI.PersistSkins()
local okApply, applyMsg = true, "đã lưu" if applyNow ~= false then
okApply, applyMsg = PI.ApplySavedSkinEntry(entry, "local", rec) end
if PI.RefreshSavedSkinsUI then pcall(PI.RefreshSavedSkinsUI) end if PI.RefreshButtons then pcall(PI.RefreshButtons) end
local fullMsg = string.format("Đã Lưu Skin Dùng @%s (giữ %d/%d món) — sẽ TỰ ĐỘNG SỬ DỤNG mỗi khi bạn chạy script! (%s)",
tostring(entry.name), entry.keptCount or 0, entry.totalCount or 0, tostring(applyMsg or "đã mặc")) return okApply ~= false, fullMsg, entry
end function PI.SetEntryAsAutoUse(entryOrIndex, applyNow)
local entry = (type(entryOrIndex) == "table") and entryOrIndex or PI.savedSkins[tonumber(entryOrIndex) or 0]
if not entry then return false, "không tìm thấy bản lưu skin" end PI.autoUseSkin = entry
PI.PersistSkins() local okApply, applyMsg = true, "OK"
if applyNow ~= false then okApply, applyMsg = PI.ApplySavedSkinEntry(entry)
end if PI.RefreshSavedSkinsUI then pcall(PI.RefreshSavedSkinsUI) end
if PI.RefreshButtons then pcall(PI.RefreshButtons) end
return okApply, string.format("Đã đặt @%s làm Skin Tự Dùng khi chạy script (%s)", tostring(entry.name), tostring(applyMsg or "OK")), entry end
function PI.ClearAutoUseSkin() if not PI.autoUseSkin then
return false, "Hiện chưa bật Lưu Skin Dùng nào" end
local oldName = tostring(PI.autoUseSkin.name or PI.autoUseSkin.id or "") PI.autoUseSkin = nil
PI.PersistSkins() if PI.RefreshSavedSkinsUI then pcall(PI.RefreshSavedSkinsUI) end
if PI.RefreshButtons then pcall(PI.RefreshButtons) end return true, "🚫 Đã tắt tự động dùng skin (@" .. oldName .. ") khi chạy script"
end function PI.DeleteSavedSkin(index)
local idx = tonumber(index) or 0 local entry = PI.savedSkins[idx]
if not entry then return false, "không tìm thấy skin để xoá" end if PI.autoUseSkin and PI.IsSameSavedSkin(PI.autoUseSkin, entry) then
PI.autoUseSkin = nil end
table.remove(PI.savedSkins, idx) PI.PersistSkins()
if PI.RefreshSavedSkinsUI then pcall(PI.RefreshSavedSkinsUI) end if PI.RefreshButtons then pcall(PI.RefreshButtons) end
return true, "🗑️ Đã xoá skin @" .. tostring(entry.name or entry.id) .. " khỏi Kho Đã Lưu" end
function PI.AutoApplySavedUseSkin() if type(PI.autoUseSkin) ~= "table" then return false, "chưa cài Lưu Skin Dùng" end
local entry = PI.autoUseSkin local function runNow()
print("[BC_Skin] ⚡ Tự động sử dụng skin từ Lưu Skin Dùng:", entry.name, entry.id) local ok, msg, rec = PI.ApplySavedSkinEntry(entry)
if PI.OnAutoUseApplied then pcall(PI.OnAutoUseApplied, ok, msg, rec, entry) end return ok, msg
end local char = PI.GetCharacterAndHumanoid(player)
if char then return runNow()
else task.spawn(function()
local tries = 0 while tries < 30 do
local c = PI.GetCharacterAndHumanoid(player) if c then break end
tries = tries + 1 task.wait(0.25)
end pcall(runNow)
end) return true, "đang chờ nhân vật tải xong để tự mặc skin"
end end
if type(Store) == "table" then Store.restoreSkins = function()
PI.savedSkins = type(Store.savedSkins) == "table" and Store.savedSkins or {}
PI.autoUseSkin = type(Store.autoUseSkin) == "table" and Store.autoUseSkin or nil if PI.RefreshSavedSkinsUI then pcall(PI.RefreshSavedSkinsUI) end
if PI.RefreshButtons then pcall(PI.RefreshButtons) end end
end end
local function descHasOutfitItems(d) if not d then return false end
local hasAny = false pcall(function()
if (tonumber(d.Shirt) or 0) > 0 or (tonumber(d.Pants) or 0) > 0 or (tonumber(d.GraphicTShirt) or 0) > 0 then hasAny = true
return end
local okA, accs = pcall(function() return d:GetAccessories(true) end) if okA and type(accs) == "table" and #accs > 0 then
hasAny = true return
end
for _, k in ipairs({"HatAccessory", "HairAccessory", "FaceAccessory", "NeckAccessory", "ShouldersAccessory", "FrontAccessory", "BackAccessory", "WaistAccessory"}) do
local v = tostring(d[k] or "") if v:find("%d+") then hasAny = true; return end
end end)
return hasAny end
local function modelHasValidBodyAndOutfit(m, d) if not m then return false end
local hasHead = (m:FindFirstChild("Head") ~= nil) local hasTorso = (m:FindFirstChild("Torso") ~= nil) or (m:FindFirstChild("UpperTorso") ~= nil)
if not (hasHead and hasTorso) then return false end local wasInvis = false
pcall(function() wasInvis = (m:GetAttribute("BC_WasInvisibleRig") == true) end) if wasInvis then return false end
if descHasOutfitItems(d) then local hasWearable = (m:FindFirstChildOfClass("Shirt") ~= nil)
or (m:FindFirstChildOfClass("Pants") ~= nil) or (m:FindFirstChildOfClass("ShirtGraphic") ~= nil)
or (m:FindFirstChildOfClass("Accessory") ~= nil) if not hasWearable then return false end
end return true
end function PI.BuildAvatarModel(rec, modelName, preferredRigType)
local lastErr = nil if type(rec) == "table" then PI.EnsureSkinItems(rec) end
local effDesc = (type(rec) == "table" and PI.FilteredDesc(rec)) or (rec and rec.desc) or nil local fallbackLiveModel, fallbackLiveDesc = nil, nil
if rec and rec.id then local okPlayer, target = pcall(function() return Players:GetPlayerByUserId(rec.id) end)
local source = nil if okPlayer and target then
source = select(1, PI.GetCharacterAndHumanoid(target)) or target.Character end
if source then local liveModel, liveErr = PI.CloneLiveCharacter(source, modelName)
if liveModel then local liveDesc = nil
pcall(function() local liveHum = source:FindFirstChildOfClass("Humanoid") or source:FindFirstChildWhichIsA("Humanoid", true)
if liveHum then liveDesc = liveHum:GetAppliedDescription() end end)
if not rec.desc and liveDesc then rec.desc = liveDesc
PI.ParseSkinItems(rec) effDesc = PI.FilteredDesc(rec) or liveDesc
end if modelHasValidBodyAndOutfit(liveModel, effDesc or liveDesc) then
PI.ApplySkinFilterToModel(liveModel, rec) return liveModel, nil, effDesc or liveDesc or (rec and rec.desc) or nil, "live"
else fallbackLiveModel = liveModel
fallbackLiveDesc = effDesc or liveDesc or (rec and rec.desc) or nil end
else lastErr = liveErr
end end
end if effDesc then
local rigOrder = { Enum.HumanoidRigType.R15, Enum.HumanoidRigType.R6 } if preferredRigType == Enum.HumanoidRigType.R6 then
rigOrder = { Enum.HumanoidRigType.R6, Enum.HumanoidRigType.R15 } end
local model, err = PI.MakeRig(effDesc, rigOrder) if model then
if fallbackLiveModel then pcall(function() fallbackLiveModel:Destroy() end) end
pcall(function() model.Name = modelName or "BC_PlayerAvatarCopy" end) PI.ApplySkinFilterToModel(model, rec)
return model, nil, effDesc, "description" end
lastErr = err end
if rec and rec.id then local okUser, userModel = pcall(function() return Players:CreateHumanoidModelFromUserId(rec.id) end)
if okUser and userModel then if fallbackLiveModel then pcall(function() fallbackLiveModel:Destroy() end) end
pcall(function() userModel.Name = modelName or "BC_PlayerAvatarCopy" end) PI.ApplySkinFilterToModel(userModel, rec)
return userModel, nil, effDesc, "userId" end
lastErr = tostring(userModel) end
if fallbackLiveModel then PI.ApplySkinFilterToModel(fallbackLiveModel, rec)
return fallbackLiveModel, nil, fallbackLiveDesc, "live" end
return nil, lastErr or "không dựng được avatar từ character hoặc HumanoidDescription", nil, nil end

local PH = 366
local P = New("Frame", { Name = "HubPlayerInfo_Panel",
Size = UDim2.new(1, -16, 0, PH), Position = UDim2.new(0, 8, 0, D.playerY or 46),
LayoutOrder = 5, BackgroundColor3 = C.SURFACE, BackgroundTransparency = 0.12, BorderSizePixel = 0, ZIndex = 6,
}, D.playerTab) D.playerY = (D.playerY or 46) + PH + 8
Corner(P, UDim.new(0, 10)) Stroke(P, C.HAIRLINE, 1) D.Shade(P, Color3.fromRGB(255, 255, 255), Color3.fromRGB(188, 192, 205), 90)
local shortcut3d = New("TextButton", { Name = "Skin3DShortcut", Size = UDim2.new(0, 88, 0, 16), Position = UDim2.new(1, -96, 0, 8),
Text = "🔎 XEM 3D & SKIN", BackgroundColor3 = C.PURPLE, TextColor3 = D.BestText(C.PURPLE),
Font = Enum.Font.GothamBold, TextSize = 7, BorderSizePixel = 0, ZIndex = 9, }, D.playerTab)
Corner(shortcut3d, UDim.new(0, 4)) shortcut3d.Activated:Connect(function()
ReleaseHubFocus() if D.playerTab then
D.playerTab.CanvasPosition = Vector2.new(0, math.max(0, P.Position.Y.Offset - 8)) end
end) New("TextLabel", { Size = UDim2.new(1, -16, 0, 14), Position = UDim2.new(0, 8, 0, 4),
Text = "🔎 TRA CỨU · XEM 3D · 👕 MẶC LOCAL", BackgroundTransparency = 1,
TextColor3 = C.ACCENT, Font = Enum.Font.GothamBold, TextSize = 10, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, P)
local function pAct(txt, x, y, w, color, parent) local b = New("TextButton", {
Size = UDim2.new(0, w, 0, 18), Position = UDim2.new(0, x, 0, y), Text = txt, BackgroundColor3 = color, TextColor3 = D.BestText(color),
Font = Enum.Font.GothamBold, TextSize = 8, BorderSizePixel = 0, ZIndex = 8, }, parent or P)
Corner(b, UDim.new(0, 5)) D.Shade(b, Color3.fromRGB(255, 255, 255), Color3.fromRGB(182, 187, 201), 90) D.Tactile(b, 0.08) return b
end local queryIn = New("TextBox", {
Name = "HubPlayerInfo_Query", Size = UDim2.new(0, 290, 0, 18), Position = UDim2.new(0, 8, 0, 22), Text = "", PlaceholderText = "Nhập tên / UserId hoặc Mã Server (JobId)...",
ClearTextOnFocus = false, BackgroundColor3 = C.SURFACE2, BackgroundTransparency = 0.1, TextColor3 = C.DARK,
PlaceholderColor3 = C.GRAY, Font = Enum.Font.GothamMedium, TextSize = 9, TextXAlignment = Enum.TextXAlignment.Left,
BorderSizePixel = 0, ZIndex = 7, }, P) Corner(queryIn, UDim.new(0, 5)) New("UIPadding", { PaddingLeft = UDim.new(0, 6) }, queryIn)
local searchBtn = pAct("🔍 Tra cứu", 304, 22, 78, C.GREEN) searchBtn.Name = "HubPlayerInfo_Search" local clearBtn = pAct("✕ Xoá", 386, 22, 48, C.RED)
local statusLbl = New("TextLabel", { Name = "HubPlayerInfo_Status", Size = UDim2.new(1, -16, 0, 16), Position = UDim2.new(0, 8, 0, 48),
Text = "Nhập tên rồi bấm 🔍 (hoặc Enter).", BackgroundTransparency = 1, TextColor3 = C.MUTED,
Font = Enum.Font.GothamMedium, TextSize = 9, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, P) local function setStatus(text, color)
statusLbl.Text = tostring(text or "") statusLbl.TextColor3 = color or C.MUTED
end local thumbImg = New("ImageLabel", { Name = "HubPlayerInfo_Thumb", Size = UDim2.new(0, 220, 0, 200), Position = UDim2.new(0, 8, 0, 70),
BackgroundColor3 = C.SURFACE2, BorderSizePixel = 0, Image = "", ScaleType = Enum.ScaleType.Fit, ZIndex = 7, }, P) Corner(thumbImg, UDim.new(0, 8))
local vp = New("ViewportFrame", { Name = "HubPlayerInfo_Viewport", Size = UDim2.new(0, 220, 0, 200), Position = UDim2.new(0, 8, 0, 70),
BackgroundTransparency = 1, BorderSizePixel = 0, Ambient = Color3.fromRGB(170, 170, 170), LightColor = Color3.fromRGB(255, 255, 255), ZIndex = 8, }, P)
local vWorld = New("WorldModel", { Name = "HubPlayerInfo_WorldModel" }, vp) local vCam = New("Camera", { Name = "HubPlayerInfo_ViewCam" }, vp)
vp.CurrentCamera = vCam PI.view.vp, PI.view.wm, PI.view.cam = vp, vWorld, vCam
function PI.ViewerUpdate() local v = PI.view
if not v.cam then return end local center = Vector3.new(0, 2.6, 0)
local cp = math.cos(v.pitch)
local pos = center + Vector3.new(math.sin(v.yaw) * cp * v.dist, math.sin(v.pitch) * v.dist, math.cos(v.yaw) * cp * v.dist)
v.cam.CFrame = CFrame.lookAt(pos, center) end
function PI.ViewerZoom(f) PI.view.dist = math.clamp(PI.view.dist * f, 3, 20)
PI.ViewerUpdate() end
function PI.ViewerReset() PI.view.yaw, PI.view.pitch, PI.view.dist = 0.6, 0.15, 9
PI.ViewerUpdate() end
function PI.ViewerBuild(rec) local v = PI.view
if v.model then pcall(function() v.model:Destroy() end) v.model = nil end
if type(rec) ~= "table" or (rec.desc == nil and rec.id == nil) then return false, "không có dữ liệu skin để xem 3D" end
local m, merr, modelDesc, source = PI.BuildAvatarModel(rec, "BC_ViewModel") if not m then return false, merr end
m.Parent = v.wm if source == "live" then
pcall(function() local pivot = m:GetPivot()
local bounds = m:GetBoundingBox() local offset = Vector3.new(0, 2.6, 0) - bounds.Position
m:PivotTo(CFrame.new(pivot.Position + offset) * pivot.Rotation) end)
end pcall(function() PI.DiagnoseClothes(m, modelDesc or rec.desc) end)
print("[BC_Skin] ViewerBuild source", source) v.model = m
PI.ViewerUpdate() return true, nil
end

PI._skinGroupsSetup = PI._skinGroupsSetup or false local function SetupSkinCollisionGroups()
if PI._skinGroupsSetup then return end pcall(function()
local PS = game:GetService("PhysicsService") pcall(function() PS:RegisterCollisionGroup("BC_SkinFake") end)
pcall(function() PS:RegisterCollisionGroup("BC_SkinReal") end)
pcall(function() PS:CollisionGroupSetCollidable("BC_SkinFake", "BC_SkinReal", false) end)
pcall(function() PS:CollisionGroupSetCollidable("BC_SkinFake", "BC_SkinFake", false) end)
pcall(function() PS:CollisionGroupSetCollidable("BC_SkinFake", "Default", false) end)
pcall(function() PS:CollisionGroupSetCollidable("BC_SkinReal", "Default", true) end) end)
PI._skinGroupsSetup = true end
local function findActiveSeatWeld(char) if not char then return nil, nil end
for _, d in ipairs(char:GetDescendants()) do
if d:IsA("JointInstance") and (d.Name == "SeatWeld" or (d.Part0 and (d.Part0:IsA("Seat") or d.Part0:IsA("VehicleSeat"))) or (d.Part1 and (d.Part1:IsA("Seat") or d.Part1:IsA("VehicleSeat")))) then
local sp = (d.Part0 and (d.Part0:IsA("Seat") or d.Part0:IsA("VehicleSeat"))) and d.Part0
or ((d.Part1 and (d.Part1:IsA("Seat") or d.Part1:IsA("VehicleSeat"))) and d.Part1) or nil
return d, sp end
end local hum = char:FindFirstChildOfClass("Humanoid")
if hum and hum.SeatPart then local sp = hum.SeatPart
local sw = sp:FindFirstChild("SeatWeld") or sp:FindFirstChildOfClass("Weld") return sw, sp
end local hrp = char:FindFirstChild("HumanoidRootPart")
if hrp and type(hrp.GetJoints) == "function" then local okJ, joints = pcall(function() return hrp:GetJoints() end)
if okJ and type(joints) == "table" then for _, j in ipairs(joints) do
if j and (j.Name == "SeatWeld" or (j.Part0 and (j.Part0:IsA("Seat") or j.Part0:IsA("VehicleSeat")))) then return j, j.Part0
end end
end end
for _, d in ipairs(workspace:GetDescendants()) do
if d:IsA("JointInstance") and (d.Name == "SeatWeld" or (d.Parent and (d.Parent:IsA("Seat") or d.Parent:IsA("VehicleSeat")))) then
if (d.Part0 and d.Part0:IsDescendantOf(char)) or (d.Part1 and d.Part1:IsDescendantOf(char)) then
local sp = (d.Part0 and not d.Part0:IsDescendantOf(char)) and d.Part0 or ((d.Part1 and not d.Part1:IsDescendantOf(char)) and d.Part1)
or (d.Parent and d.Parent:IsA("BasePart") and d.Parent) or nil
return d, sp end
end end
return nil, nil end
function PI.StandUpFromSit(char) char = char or (player and player.Character)
if not char then return false end local hum = char:FindFirstChildOfClass("Humanoid")
if not hum then return false end pcall(function()
hum.PlatformStand = false hum:SetStateEnabled(Enum.HumanoidStateType.Jumping, true)
hum:SetStateEnabled(Enum.HumanoidStateType.GettingUp, true) hum:SetStateEnabled(Enum.HumanoidStateType.Running, true)
hum:SetStateEnabled(Enum.HumanoidStateType.Freefall, true) end)
local hadSeatPart = nil pcall(function()
local sw, sp = findActiveSeatWeld(char) hadSeatPart = sp
if sp then local wasTouch = true
pcall(function() wasTouch = sp.CanTouch end) pcall(function() sp.CanTouch = false end)
task.delay(0.45, function() pcall(function() if sp and sp.Parent then sp.CanTouch = wasTouch end end)
end) end
if sw then pcall(function() sw.Part0 = nil; sw.Part1 = nil end)
pcall(function() sw:Destroy() end) end
end) pcall(function()
if tonumber(hum.HipHeight) and hum.RigType == Enum.HumanoidRigType.R15 and hum.HipHeight < 1.0 then
local savedHip = PI.localSaved and PI.localSaved.visuals and tonumber(PI.localSaved.visuals._hipHeight)
hum.HipHeight = (savedHip and savedHip >= 1.0) and savedHip or 2.0 end
end) pcall(function()
hum.Sit = false hum:ChangeState(Enum.HumanoidStateType.GettingUp)
hum:ChangeState(Enum.HumanoidStateType.Jumping) hum.Jump = true
if hadSeatPart then local hrp = char:FindFirstChild("HumanoidRootPart") or char.PrimaryPart
if hrp and hrp:IsA("BasePart") then hrp.CFrame = hrp.CFrame + Vector3.new(0, 1.8, 0)
end end
end) return true
end pcall(function()
if PI._sitJumpConn then pcall(function() PI._sitJumpConn:Disconnect() end) end
PI._sitJumpConn = trackConn(UserInputService.JumpRequest:Connect(function() pcall(function()
local c, h = PI.GetCharacterAndHumanoid(player) if h and h.Sit == true then
PI.StandUpFromSit(c) end
end) end))
if PI._sitWatchConn then pcall(function() PI._sitWatchConn:Disconnect() end) end
PI._sitWatchConn = trackConn(RunService.Heartbeat:Connect(function() pcall(function()
local c, h = PI.GetCharacterAndHumanoid(player) if not h then return end
if h.Sit == true then if h.Jump == true then
PI.StandUpFromSit(c) else
local md = h.MoveDirection local moving = md and (tonumber(md.Magnitude) or 0) > 0.08
if moving and not findActiveSeatWeld(c) then h.Sit = false
pcall(function() h:ChangeState(Enum.HumanoidStateType.GettingUp) end) end
end end
end) end))
end) local function getCharPivot(char)
if not char then return nil end local hrp = char:FindFirstChild("HumanoidRootPart")
if hrp and hrp:IsA("BasePart") then return hrp.CFrame, hrp end
if char.PrimaryPart and char.PrimaryPart:IsA("BasePart") then return char.PrimaryPart.CFrame, char.PrimaryPart end
local any = char:FindFirstChildWhichIsA("BasePart", true) if any then return any.CFrame, any end
local ok, cf = pcall(function() return char:GetPivot() end) if ok and cf then return cf, nil end
local ok2, cf2 = pcall(function() return char:GetPrimaryPartCFrame() end) if ok2 and cf2 then return cf2, nil end
return nil, nil end
local function isCameraFirstPerson(char) local isFP = false
pcall(function() local cam = workspace.CurrentCamera
if not cam or not char then return end local head = char:FindFirstChild("Head", true)
if head and head:IsA("BasePart") then local dist = (cam.CFrame.Position - head.Position).Magnitude
if dist < 1.55 then isFP = true end end
end) return isFP
end local HELPER_BOX_NAMES = {
humanoidrootpart = true, rootpart = true, root = true, hitbox = true, collisionbox = true, collider = true, boundingbox = true, hurtbox = true,
grip = true, rightgrip = true, leftgrip = true, toolgrip = true, handlebox = true, weldpart = true, weldbox = true, mount = true,
attach = true, attachmentpart = true, pivot = true, origin = true, center = true, primary = true, camera = true, campart = true,
sensor = true, detector = true, trigger = true, zone = true, raycast = true, stepbox = true, crouchbox = true, emitter = true,
effect = true, point = true, node = true, }
local HELD_ITEM_KEYWORDS = { "tool", "weapon", "item", "equip", "held", "gun", "sword", "knife",
"flashlight", "lantern", "light", "cola", "drink", "medkit", "heal", "radar", "compass", "grapple", "pad", "trap", "bomb", "grenade",
"viewmodel", "handitem", "usable", "pistol", "rifle", }
local GAME_SKIN_KEYWORDS = { "evade", "stilts", "unusual", "cosmetic", "gameskin", "ingameskin",
} function PI.IsInsideHeldItemOrTool(inst, rootChar)
if not inst then return false end local cur = inst
while cur and cur ~= rootChar and cur ~= workspace do if cur:IsA("Tool") or cur:IsA("HopperBin") or cur:IsA("BackpackItem") then
return true end
local okAttr, isToolAttr = pcall(function() return cur:GetAttribute("IsTool") == true
or cur:GetAttribute("IsItem") == true or cur:GetAttribute("IsWeapon") == true
or cur:GetAttribute("EquippedItem") == true end)
if okAttr and isToolAttr then return true end if cur:FindFirstChildOfClass("TouchTransmitter") or cur:FindFirstChild("TouchInterest") then
return true end
if (cur:IsA("Model") or cur:IsA("Folder")) and cur ~= rootChar then local ln = string.lower(tostring(cur.Name))
for _, kw in ipairs(HELD_ITEM_KEYWORDS) do if ln:find(kw, 1, true) then
return true end
end end
cur = cur.Parent end
if inst:IsA("BasePart") then for _, ch in ipairs(inst:GetChildren()) do
if ch:IsA("JointInstance") or ch:IsA("WeldConstraint") then local jn = string.lower(tostring(ch.Name))
if jn == "rightgrip" or jn == "leftgrip" or jn == "toolgrip" or jn == "weaponmotor" or jn == "itemweld" then return true
end end
end end
return false end
function PI.IsInvisibleHelperOrHandleBox(part, rootChar) if not (part and part:IsA("BasePart")) then return false end
local pn = string.lower(tostring(part.Name)) if HELPER_BOX_NAMES[pn] then return true end
if PI.IsInsideHeldItemOrTool(part, rootChar) then return true end local curT = tonumber(part.Transparency) or 0
if part:FindFirstChildOfClass("WrapLayer") and (curT >= 0.95 or (part.ClassName == "Part" and not part:FindFirstChildOfClass("SpecialMesh"))) then
return true end
local par = part.Parent if par and par ~= rootChar then
local isPlainBox = (part.ClassName == "Part") and (part:FindFirstChildOfClass("SpecialMesh") == nil)
and (part:FindFirstChildOfClass("Decal") == nil) and (part:FindFirstChildOfClass("Texture") == nil)
if isPlainBox and curT >= 0.95 then local otherParts = 0
pcall(function() for _, sib in ipairs(par:GetDescendants()) do
if sib ~= part and sib:IsA("BasePart") then otherParts = otherParts + 1
break end
end end)
if otherParts > 0 or not (par:IsA("Accessory") or par:IsA("Hat") or par:IsA("Accoutrement")) then return true
end end
end return false
end local function hasInGameMorphOnLimb(char, part)
if not (char and part) then return false end for _, ch in ipairs(part:GetChildren()) do
if (ch:IsA("BasePart") or ch:IsA("Model")) and not tostring(ch.Name):find("^BC_") then return true
end end
for _, ch in ipairs(char:GetChildren()) do
if (ch:IsA("Model") or ch:IsA("Folder")) and not tostring(ch.Name):find("^BC_") and not PI.IsInsideHeldItemOrTool(ch, char) then
local partInSub = ch:FindFirstChild(part.Name, true)
if partInSub and partInSub:IsA("BasePart") and (tonumber(partInSub.Transparency) or 0) < 0.95 then return true
end end
end return false
end local HAIR_KEYWORDS = {
"hair", "tóc", "toc", "bangs", "ponytail", "twintail", "pigtail", "braid", "mullet",
"afro", "bun", "curls", "dreads", "locks", "wig", "shag", "wolfcut", "bob", "fringe", "ahoge", "mohawk", "undercut", "fluffy", "messy",
} local function hasGameSkinAttr(item)
local res = false pcall(function()
res = (item:GetAttribute("BC_GameSkinItem") == true) or (item:GetAttribute("GameSkin") == true)
or (item:GetAttribute("InGameSkin") == true) or (item:GetAttribute("Cosmetic") == true)
or (item:GetAttribute("IsCosmetic") == true) or (item:GetAttribute("CosmeticId") ~= nil)
or (item:GetAttribute("SkinId") ~= nil) or (item:GetAttribute("Unusual") ~= nil)
or (item:GetAttribute("Stilts") ~= nil) or (item:GetAttribute("EquippedCosmetic") ~= nil) end)
return res end
function PI.IsHairItem(item, char) if not item or item == char or item == PI._virtualAvatar then return false end
if VISIBLE_LIMB_NAMES[item.Name] or item:IsA("Humanoid") or item:IsA("Shirt") or item:IsA("Pants") or item:IsA("ShirtGraphic") or item:IsA("BodyColors") then
return false end
if item:IsA("Model") and ((item:FindFirstChild("Head") ~= nil) or (item:FindFirstChild("Torso") ~= nil) or (item:FindFirstChild("UpperTorso") ~= nil) or (item:FindFirstChildOfClass("Humanoid") ~= nil)) then
return false end
if PI.IsInsideHeldItemOrTool and PI.IsInsideHeldItemOrTool(item, char) then return false end local isHair = false
pcall(function() local isAcc = item:IsA("Accessory") or item:IsA("Hat") or item:IsA("Accoutrement")
if isAcc then local at = item.AccessoryType
if at == Enum.AccessoryType.Hair or tostring(at or ""):lower():find("hair", 1, true)
or tostring(item:GetAttribute("AccessoryType") or ""):lower():find("hair", 1, true) or item:FindFirstChild("HairAttachment", true) ~= nil then
isHair = true return
end for _, d in ipairs(item:GetDescendants()) do
if (d:IsA("Attachment") or d:IsA("Weld") or d:IsA("Motor6D")) and string.lower(tostring(d.Name)):find("hair", 1, true) then isHair = true
return end
end end
if isAcc or item:IsA("Model") or item:IsA("BasePart") then local ln = string.lower(tostring(item.Name or ""))
for _, kw in ipairs(HAIR_KEYWORDS) do if ln:find(kw, 1, true) then
isHair = true return
end end
end end)
return isHair end
function PI.ForceHideAndRemoveOwnItem(item) if not item then return end
local iname = tostring(item.Name or "") local lnm = string.lower(iname)

if VISIBLE_LIMB_NAMES[iname] or HELPER_BOX_NAMES[lnm] or item:IsA("Humanoid") or item:IsA("Animator") then return
end pcall(function()
item:SetAttribute("BC_HiddenOriginalItem", true) item:SetAttribute("BC_GameSkinItem", nil)
end) pcall(function()
if item:IsA("Shirt") then item.ShirtTemplate = "" elseif item:IsA("Pants") then item.PantsTemplate = ""
elseif item:IsA("ShirtGraphic") then item.Graphic = "" elseif item:IsA("BasePart") then
item.Transparency = 1 item.LocalTransparencyModifier = 1
item.Anchored = false item.CanCollide = false
item.CanTouch = false item.CanQuery = false
item.Massless = true pcall(function() item.Size = Vector3.new(0.001, 0.001, 0.001) end)
end for _, d in ipairs(item:GetDescendants()) do
if d:IsA("WrapLayer") or d:IsA("WrapTarget") then pcall(function() d.Enabled = false end)
pcall(function() d:Destroy() end) elseif d:IsA("Weld") or d:IsA("WeldConstraint") or d:IsA("Motor6D") or d:IsA("JointInstance") then
pcall(function() d.Enabled = false; d.Part0 = nil; d.Part1 = nil end) pcall(function() d:Destroy() end)
elseif d:IsA("BasePart") then d.Transparency = 1
d.LocalTransparencyModifier = 1 d.Anchored = false
d.CanCollide = false d.CanTouch = false
d.CanQuery = false d.Massless = true
pcall(function() d.Size = Vector3.new(0.001, 0.001, 0.001) end) elseif d:IsA("SpecialMesh") or d:IsA("FileMesh") then
pcall(function() d.MeshId = ""; d.TextureId = ""; d.Scale = Vector3.zero end)
elseif d:IsA("Decal") or d:IsA("Texture") or d:IsA("SurfaceAppearance") then pcall(function() d.Transparency = 1 end)
if d:IsA("SurfaceAppearance") then pcall(function() d:Destroy() end) end end
end end)
pcall(function() item:Destroy() end) end

function PI.AnalyzeUserOwnSkin(char, hum, forceRefresh) if PI.userSkinAnalysis and PI.userSkinAnalysis.hasProfileData and not forceRefresh then
return PI.userSkinAnalysis end
local analysis = PI.userSkinAnalysis or { userId = player and player.UserId or 0,
hasProfileData = false, hasProfileModel = false,
ownAssetIds = {}, ownAccNames = {},
ownAccNamesLower = {}, ownAccMeshIds = {},
ownAccMeshNums = {}, ownAccTexIds = {},
ownAccTexNums = {}, ownClothingIds = {},
ownClothingTemplates = {}, ownClothingNums = {},
ownLimbMeshIds = {}, ownLimbMeshNums = {},
ownLimbTexIds = {}, ownLimbTexNums = {},
} local function indexAccInstance(ch)
local nm = tostring(ch.Name or "") if nm ~= "" then
analysis.ownAccNames[nm] = true local lnm = string.lower(nm)
analysis.ownAccNamesLower[lnm] = true analysis.ownAccNamesLower[(lnm:gsub("[%s_%-]", ""))] = true
end for _, d in ipairs(ch:GetDescendants()) do
if d:IsA("MeshPart") or d:IsA("SpecialMesh") then local mid = tostring(d.MeshId or "")
local tid = tostring((d:IsA("SpecialMesh") and d.TextureId) or d.TextureID or "") if mid ~= "" then
analysis.ownAccMeshIds[mid] = true
for numStr in mid:gmatch("(%d+)") do analysis.ownAccMeshNums[numStr] = true end
end if tid ~= "" then
analysis.ownAccTexIds[tid] = true
for numStr in tid:gmatch("(%d+)") do analysis.ownAccTexNums[numStr] = true end
end end
end end
pcall(function() local profDesc = nil
local okP, pd = pcall(function() return Players:GetHumanoidDescriptionFromUserId(player.UserId) end) if okP and pd then
profDesc = pd analysis.hasProfileData = true
else profDesc = PI.originalDesc
if not profDesc and hum then local okA, ad = pcall(function() return hum:GetAppliedDescription() end)
if okA and ad then profDesc = ad end end
end if not profDesc then return end
local CSV_FIELDS = { "HatAccessory", "HairAccessory", "FaceAccessory", "NeckAccessory",
"ShouldersAccessory", "FrontAccessory", "BackAccessory", "WaistAccessory", }
local function addAid(n) n = tonumber(n)
if n and n > 0 then analysis.ownAssetIds[n] = true
analysis.ownAccMeshNums[tostring(n)] = true analysis.ownAccTexNums[tostring(n)] = true
analysis.hasProfileData = true end
end for _, fk in ipairs(CSV_FIELDS) do
pcall(function()
for numStr in tostring(profDesc[fk] or ""):gmatch("(%d+)") do addAid(numStr) end
end) end
local okGA, accList = pcall(function() return profDesc:GetAccessories(true) end) if okGA and type(accList) == "table" then
for _, entry in ipairs(accList) do addAid(type(entry) == "table" and entry.AssetId or nil) end end
for _, ck in ipairs({ "Shirt", "Pants", "GraphicTShirt" }) do pcall(function()
local n = tonumber(profDesc[ck]) if n and n > 0 then
analysis.ownAssetIds[n] = true analysis.ownClothingIds[n] = true
analysis.ownClothingNums[tostring(n)] = true analysis.hasProfileData = true
end end)
end for _, bk in ipairs({ "Face", "Head", "Torso", "LeftArm", "RightArm", "LeftLeg", "RightLeg" }) do
pcall(function() local n = tonumber(profDesc[bk])
if n and n > 0 then analysis.ownAssetIds[n] = true
analysis.ownLimbMeshNums[tostring(n)] = true analysis.ownLimbTexNums[tostring(n)] = true
analysis.hasProfileData = true end
end) end
local okM, profModel = pcall(function() return Players:CreateHumanoidModelFromDescription(profDesc, Enum.HumanoidRigType.R15)
end) if not okM or not profModel then
okM, profModel = pcall(function() return Players:CreateHumanoidModelFromDescription(profDesc, Enum.HumanoidRigType.R6)
end) end
if okM and profModel then pcall(function()
local accCount = 0 for _, ch in ipairs(profModel:GetChildren()) do
if ch:IsA("Accessory") or ch:IsA("Hat") or ch:IsA("Accoutrement") then accCount = accCount + 1
indexAccInstance(ch) elseif ch:IsA("Shirt") or ch:IsA("Pants") or ch:IsA("ShirtGraphic") then
local t = tostring((ch:IsA("Shirt") and ch.ShirtTemplate) or (ch:IsA("Pants") and ch.PantsTemplate) or ch.Graphic or "") if t ~= "" then
analysis.ownClothingTemplates[t] = true
for numStr in t:gmatch("(%d+)") do analysis.ownClothingNums[numStr] = true end
end elseif ch:IsA("CharacterMesh") then
local mid = tostring(ch.MeshId or "") if mid ~= "" then analysis.ownLimbMeshIds[mid] = true; analysis.ownLimbMeshNums[mid] = true end
elseif ch:IsA("BasePart") then if ch:IsA("MeshPart") then
local mid, tid = tostring(ch.MeshId or ""), tostring(ch.TextureID or "") if mid ~= "" then
analysis.ownLimbMeshIds[mid] = true
for numStr in mid:gmatch("(%d+)") do analysis.ownLimbMeshNums[numStr] = true end
end if tid ~= "" then
analysis.ownLimbTexIds[tid] = true
for numStr in tid:gmatch("(%d+)") do analysis.ownLimbTexNums[numStr] = true end
end end
for _, sub in ipairs(ch:GetChildren()) do if sub:IsA("SpecialMesh") then
local mid, tid = tostring(sub.MeshId or ""), tostring(sub.TextureId or "") if mid ~= "" then
analysis.ownLimbMeshIds[mid] = true
for numStr in mid:gmatch("(%d+)") do analysis.ownLimbMeshNums[numStr] = true end
end if tid ~= "" then
analysis.ownLimbTexIds[tid] = true
for numStr in tid:gmatch("(%d+)") do analysis.ownLimbTexNums[numStr] = true end
end end
end end
end if accCount > 0 or next(analysis.ownAssetIds) == nil then
analysis.hasProfileModel = true end
end) pcall(function() profModel:Destroy() end)
end if not analysis.hasProfileModel and type(game.GetObjects) == "function" then
for aid, _ in pairs(analysis.ownAssetIds) do pcall(function()
local objs = game:GetObjects("rbxassetid://" .. tostring(aid)) if type(objs) == "table" then
for _, obj in ipairs(objs) do if obj:IsA("Accessory") or obj:IsA("Hat") or obj:IsA("Accoutrement") then
indexAccInstance(obj) analysis.hasProfileModel = true
end pcall(function() obj:Destroy() end)
end end
end) end
end end)
PI.userSkinAnalysis = analysis PI._defaultProfileAssetIds = analysis.ownAssetIds
PI._defaultProfileAccNames = analysis.ownAccNames PI._defaultProfileMeshIds = analysis.ownAccMeshIds
PI._defaultProfileHasData = analysis.hasProfileData return analysis
end function PI.IsOwnUserSkinItem(item, char)
if not item then return false end local isLocalOutfit, isOwnMarked = false, false
pcall(function() isLocalOutfit = (item:GetAttribute("BC_LocalOutfitItem") == true)
isOwnMarked = (item:GetAttribute("BC_DefaultAvatarItem") == true) or (item:GetAttribute("BC_HiddenOriginalItem") == true)
end) if isLocalOutfit then return false end
if PI.IsInsideHeldItemOrTool(item, char) then return false end if isOwnMarked then return true end
if PI.IsHairItem(item, char) then return true end if hasGameSkinAttr(item) then return false end
if item:IsA("Folder") or item:IsA("Model") then return false end local nm = tostring(item.Name or "")
local ln = string.lower(nm) for _, kw in ipairs(GAME_SKIN_KEYWORDS) do
if ln:find(kw, 1, true) then return false end end
if ln:find("my_own", 1, true) or ln:find("mycustom", 1, true) or ln:find("myugc", 1, true)
or ln:find("ownskin", 1, true) or ln:find("lateown", 1, true) or ln:find("lateloadedown", 1, true) then return true
end local analysis = PI.AnalyzeUserOwnSkin(char)
if item:IsA("Accessory") or item:IsA("Hat") or item:IsA("Accoutrement") then local lnNorm = (ln:gsub("[%s_%-]", ""))
if analysis.ownAccNames[nm] or analysis.ownAccNamesLower[ln] or analysis.ownAccNamesLower[lnNorm] then return true
end local aid, midStr, tidStr = nil, "", ""
pcall(function() aid = tonumber(item.AssetId) or tonumber(item._assetId) or tonumber(item:GetAttribute("AssetId")) or tonumber(item.MeshId)
local h = item:FindFirstChild("Handle") if h then
local sm = h:FindFirstChildOfClass("SpecialMesh") midStr = (sm and tostring(sm.MeshId or "")) or tostring(h.MeshId or "")
tidStr = (sm and tostring(sm.TextureId or "")) or tostring(h.TextureID or "") end
end) if aid and aid > 0 and analysis.ownAssetIds[aid] then return true end
if midStr ~= "" then if analysis.ownAccMeshIds[midStr] then return true end
local lmid = string.lower(midStr) if lmid:find("my_own", 1, true) or lmid:find("mesh_ugc", 1, true) then return true end
for numStr in midStr:gmatch("(%d+)") do
local n = tonumber(numStr) if analysis.ownAccMeshNums[numStr] or (n and analysis.ownAssetIds[n]) then return true end
end end
if tidStr ~= "" then if analysis.ownAccTexIds[tidStr] then return true end
for numStr in tidStr:gmatch("(%d+)") do
local n = tonumber(numStr) if analysis.ownAccTexNums[numStr] or (n and analysis.ownAssetIds[n]) then return true end
end end
if analysis.hasProfileData and analysis.hasProfileModel then return false
end return true
elseif item:IsA("Shirt") or item:IsA("Pants") or item:IsA("ShirtGraphic") then local tmpl = ""
pcall(function() if item:IsA("Shirt") then tmpl = tostring(item.ShirtTemplate or "")
elseif item:IsA("Pants") then tmpl = tostring(item.PantsTemplate or "")
elseif item:IsA("ShirtGraphic") then tmpl = tostring(item.Graphic or "") end end)
if tmpl == "" or analysis.ownClothingTemplates[tmpl] then return true end
for numStr in tmpl:gmatch("(%d+)") do
local n = tonumber(numStr) if analysis.ownClothingNums[numStr] or (n and analysis.ownAssetIds[n]) then return true end
end if analysis.hasProfileData and tmpl ~= "" then return false end
return true elseif item:IsA("CharacterMesh") then
local mid = tostring(item.MeshId or "")
if mid == "" or analysis.ownLimbMeshIds[mid] or analysis.ownLimbMeshNums[mid] or analysis.ownAssetIds[tonumber(mid) or 0] then return true
end if analysis.hasProfileData then return false end
return true elseif item:IsA("BodyColors") then
return true end
return false end
function PI.IsInGameSupportedSkinItem(item, char) if not item then return false end
local isLocalOrOwn = false pcall(function()
isLocalOrOwn = (item:GetAttribute("BC_LocalOutfitItem") == true) or (item:GetAttribute("BC_DefaultAvatarItem") == true)
or (item:GetAttribute("BC_HiddenOriginalItem") == true) end)
if isLocalOrOwn then return false end if PI.IsInsideHeldItemOrTool(item, char) then return true end
if PI.IsHairItem(item, char) then return false end if hasGameSkinAttr(item) then return true end
if item:IsA("Folder") then return true end if item:IsA("Model") then
if tostring(item.Name):find("^BC_") then return false end for _, sub in ipairs(PI.GetVisualSubRigs(char)) do
if sub == item then return false end end
return true end
local ln = string.lower(tostring(item.Name)) for _, kw in ipairs(GAME_SKIN_KEYWORDS) do
if ln:find(kw, 1, true) then return true end end
if item:IsA("Accessory") or item:IsA("Hat") or item:IsA("Accoutrement")
or item:IsA("CharacterMesh") or item:IsA("Shirt") or item:IsA("Pants") or item:IsA("ShirtGraphic") then
return not PI.IsOwnUserSkinItem(item, char) end
return false end
function PI.ClassifyCharacterSkin(char) local result = { ownSkinToDelete = {}, gameSkinToKeep = {}, localTargetSkin = {} }
if not char then return result end local hum = char:FindFirstChildOfClass("Humanoid") or char:FindFirstChildWhichIsA("Humanoid", true)
PI.AnalyzeUserOwnSkin(char, hum) local targets = { char }
for _, sub in ipairs(PI.GetVisualSubRigs(char)) do table.insert(targets, sub) end for _, m in ipairs(targets) do
for _, ch in ipairs(m:GetChildren()) do if not tostring(ch.Name):find("^BC_") and not PI.IsInsideHeldItemOrTool(ch, m) then
local isLocal = false pcall(function() isLocal = (ch:GetAttribute("BC_LocalOutfitItem") == true) end)
if isLocal then table.insert(result.localTargetSkin, ch)
elseif PI.IsHairItem(ch, m) then pcall(function() ch:SetAttribute("BC_GameSkinItem", nil) end)
table.insert(result.ownSkinToDelete, ch) elseif ch:IsA("Accessory") or ch:IsA("Hat") or ch:IsA("Accoutrement")
or ch:IsA("Shirt") or ch:IsA("Pants") or ch:IsA("ShirtGraphic") or ch:IsA("CharacterMesh") then if PI.IsOwnUserSkinItem(ch, m) then
table.insert(result.ownSkinToDelete, ch) else
pcall(function() ch:SetAttribute("BC_GameSkinItem", true) end) table.insert(result.gameSkinToKeep, ch)
end elseif (ch:IsA("Model") or ch:IsA("Folder")) and PI.IsInGameSupportedSkinItem(ch, char) then
pcall(function() ch:SetAttribute("BC_GameSkinItem", true) end) table.insert(result.gameSkinToKeep, ch)
end end
end end
return result end
function PI.IsInGameSupportedSkinElement(inst, char) if not inst or not char then return false end
local cur = inst while cur and cur ~= char and cur ~= workspace do
if PI.IsInGameSupportedSkinItem(cur, char) then return true end cur = cur.Parent
end return false
end local function EnsureCharacterVisible(char)
if not char then return end local fp = isCameraFirstPerson(char)
local origVis = (PI.localSaved and PI.localSaved.character == char and PI.localSaved.visuals) or nil pcall(function()
local targets = { char } for _, sub in ipairs(PI.GetVisualSubRigs(char)) do table.insert(targets, sub) end
for _, m in ipairs(targets) do for _, d in ipairs(m:GetChildren()) do
if d:IsA("BasePart") then local pn = string.lower(tostring(d.Name))
if HELPER_BOX_NAMES[pn] then

d.Transparency = 1 elseif PI.localActive and PI.IsHairItem(d, m) and d:GetAttribute("BC_LocalOutfitItem") ~= true then
PI.ForceHideAndRemoveOwnItem(d) elseif VISIBLE_LIMB_NAMES[d.Name] then
local savedEntry = (m == char and origVis and origVis[d.Name]) or nil
local keptHiddenForMorph = (m == char) and ((savedEntry and savedEntry.hadMorphHidden == true) or hasInGameMorphOnLimb(char, d))
if not keptHiddenForMorph then if (tonumber(d.Transparency) or 0) >= 0.95 then d.Transparency = 0 end
if not fp then d.LocalTransparencyModifier = 0 end end
local fc = d:FindFirstChildOfClass("Decal") if fc and not keptHiddenForMorph and (tonumber(fc.Transparency) or 0) >= 0.95 then
fc.Transparency = 0 end
end end
end local containers = { m }
local headPart = m:FindFirstChild("Head") if headPart then table.insert(containers, headPart) end
for _, c in ipairs(m:GetChildren()) do if c:IsA("Folder") then table.insert(containers, c) end
end for _, cont in ipairs(containers) do
for _, ch in ipairs(cont:GetChildren()) do local isHiddenOrig, isLocalItem = false, false
pcall(function() isHiddenOrig = (ch:GetAttribute("BC_HiddenOriginalItem") == true)
isLocalItem = (ch:GetAttribute("BC_LocalOutfitItem") == true) end)
local isOwnOrHair = PI.localActive and (not isLocalItem) and ( PI.IsHairItem(ch, m)
or ((ch:IsA("Accessory") or ch:IsA("Hat") or ch:IsA("Accoutrement")) and PI.IsOwnUserSkinItem(ch, m)) )
if isHiddenOrig or isOwnOrHair then PI.ForceHideAndRemoveOwnItem(ch)
elseif cont == m and not PI.IsInsideHeldItemOrTool(ch, m) and (ch:IsA("Accessory") or ch:IsA("Hat") or ch:IsA("Accoutrement") or ch:IsA("Model") or ch:IsA("Folder")) then
for _, p in ipairs(ch:GetDescendants()) do if p:IsA("BasePart") then
if PI.localActive then p.Anchored = false
p.CanCollide = false p.CanTouch = false
p.CanQuery = false p.Massless = true
end if not PI.IsInvisibleHelperOrHandleBox(p, m) then
if (tonumber(p.Transparency) or 0) >= 0.95 and (p:IsA("MeshPart") or p:FindFirstChildOfClass("SpecialMesh") or p:FindFirstChildOfClass("Decal")) then
p.Transparency = 0 end
if not fp then p.LocalTransparencyModifier = 0 end end
end end
end end
end end
end) end
local function StopVirtualAvatarSync() pcall(function() RunService:UnbindFromRenderStep("BC_VirtualAvatarSync") end)
if PI._vAvatarStepped then pcall(function() PI._vAvatarStepped:Disconnect() end) PI._vAvatarStepped = nil end
if PI._vAvatarHeartbeat then pcall(function() PI._vAvatarHeartbeat:Disconnect() end) PI._vAvatarHeartbeat = nil end PI._vAvatarPosePairs = nil
end local function makeFakeVisible(fake, rigHint)
pcall(function() SetupSkinCollisionGroups()
local primary = fake.PrimaryPart or fake:FindFirstChild("HumanoidRootPart") or fake:FindFirstChildWhichIsA("BasePart", true)
for _, pp in ipairs(fake:GetDescendants()) do if pp:IsA("BasePart") then
local partName = string.lower(tostring(pp.Name)) local isInvisibleHelper = HELPER_BOX_NAMES[partName] or PI.IsInvisibleHelperOrHandleBox(pp, fake)
local hasMorphOverlay = (pp:FindFirstChild("BC_MorphPart_" .. tostring(pp.Name)) ~= nil)
pp.Transparency = (isInvisibleHelper or hasMorphOverlay) and 1 or 0
pp.LocalTransparencyModifier = (isInvisibleHelper or hasMorphOverlay) and 1 or 0 pp.CanCollide = false
pp.CanTouch = false pp.CanQuery = false
pp.Massless = true if isInvisibleHelper then pp.CastShadow = false end
if pp == primary then pp.Anchored = true
else pp.Anchored = false
end pcall(function() pp.CollisionGroup = "BC_SkinFake" end)
elseif pp:IsA("Decal") or pp:IsA("Texture") then pp.Transparency = 0
elseif pp:IsA("Accessory") then pcall(function()
local h = pp:FindFirstChild("Handle") if h and h:IsA("BasePart") then
local isInvHandle = PI.IsInvisibleHelperOrHandleBox(h, fake) h.Transparency = isInvHandle and 1 or 0
h.LocalTransparencyModifier = isInvHandle and 1 or 0 h.Anchored = false
h.CanCollide = false h.CanTouch = false
h.CanQuery = false h.Massless = true
pcall(function() h.CollisionGroup = "BC_SkinFake" end) end
end) elseif pp:IsA("BillboardGui") or pp:IsA("SurfaceGui") then
pp.Enabled = true end
end if primary then
primary.Anchored = true primary.CanCollide = false
primary.CanTouch = false primary.CanQuery = false
end local fh = fake:FindFirstChildOfClass("Humanoid")
if fh then pcall(function()
for _, ch in ipairs(fh:GetChildren()) do if ch:IsA("Animator") then ch:Destroy() end
end end)
pcall(function() fh.EvaluateStateMachine = false end) pcall(function() fh.BreakJointsOnDeath = false end)
pcall(function() fh.RequiresNeck = false end) pcall(function() fh.Sit = false end)
pcall(function() fh.PlatformStand = true end) pcall(function() fh.AutoRotate = false end)
pcall(function() fh:SetStateEnabled(Enum.HumanoidStateType.Seated, false) end)
pcall(function() fh:SetStateEnabled(Enum.HumanoidStateType.FallingDown, false) end)
pcall(function() fh:SetStateEnabled(Enum.HumanoidStateType.Ragdoll, false) end) fh.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None
fh.HealthDisplayType = Enum.HumanoidDisplayType.AlwaysOff if rigHint then
pcall(function() fh.RigType = rigHint end) end
end end)
end local JOINT_LIMB_ORDER = {
lowertorso = 1, torso = 1, root = 1, uppertorso = 2, waist = 2,
head = 3, neck = 3, leftupperarm = 3, rightupperarm = 3, leftupperleg = 3, rightupperleg = 3,
leftarm = 3, rightarm = 3, leftleg = 3, rightleg = 3, leftshoulder = 3, rightshoulder = 3, lefthip = 3, righthip = 3,
leftlowerarm = 4, rightlowerarm = 4, leftlowerleg = 4, rightlowerleg = 4, leftelbow = 4, rightelbow = 4, leftknee = 4, rightknee = 4,
lefthand = 5, righthand = 5, leftfoot = 5, rightfoot = 5, leftwrist = 5, rightwrist = 5, leftankle = 5, rightankle = 5,
} local CROSS_RIG_LIMB_ALIASES = {
torso = { "uppertorso", "lowertorso" }, uppertorso = { "torso" },
lowertorso = { "torso" }, leftarm = { "leftupperarm", "leftlowerarm", "lefthand" },
rightarm = { "rightupperarm", "rightlowerarm", "righthand" }, leftleg = { "leftupperleg", "leftlowerleg", "leftfoot" },
rightleg = { "rightupperleg", "rightlowerleg", "rightfoot" }, leftupperarm = { "leftarm" },
rightupperarm = { "rightarm" }, leftupperleg = { "leftleg" },
rightupperleg = { "rightleg" }, }
local BODY_LIMB_NAMES = { "LowerTorso", "Torso", "UpperTorso", "Head",
"LeftUpperArm", "LeftLowerArm", "LeftHand", "Left Arm", "RightUpperArm", "RightLowerArm", "RightHand", "Right Arm",
"LeftUpperLeg", "LeftLowerLeg", "LeftFoot", "Left Leg", "RightUpperLeg", "RightLowerLeg", "RightFoot", "Right Leg",
} local function normJointKey(s)
local k = string.lower(tostring(s or ""):gsub("[%s_%-]", "")) if k == "rootjoint" or k == "root" then return "root" end
return k end
local function isInsideAccessoryOrTool(inst, rootModel) local p = inst and inst.Parent
while p and p ~= rootModel do if p:IsA("Accessory") or p:IsA("Tool") or tostring(p.Name):sub(1, 12) == "BC_MorphPart" then
return true end
p = p.Parent end
return false end
local function isNonIdentityCF(cf) if not cf then return false end
local ok, res = pcall(function() if type(cf.GetComponents) == "function" then
local x, y, z, r00, r01, r02, r10, r11, r12, r20, r21, r22 = cf:GetComponents() if x and r00 then
if math.abs(x) > 1e-4 or math.abs(y) > 1e-4 or math.abs(z) > 1e-4 then return true end
if math.abs(r00 - 1) > 1e-4 or math.abs(r11 - 1) > 1e-4 or math.abs(r22 - 1) > 1e-4 then return true end
if math.abs(r01) > 1e-4 or math.abs(r02) > 1e-4 or math.abs(r10) > 1e-4 or math.abs(r12) > 1e-4 or math.abs(r20) > 1e-4 or math.abs(r21) > 1e-4 then return true end
return false end
end local p = cf.Position
if p and (math.abs(p.X) > 1e-4 or math.abs(p.Y) > 1e-4 or math.abs(p.Z) > 1e-4) then return true end local lv, uv = cf.LookVector, cf.UpVector
if lv and (math.abs(lv.X) > 1e-4 or math.abs(lv.Y) > 1e-4 or math.abs(lv.Z + 1) > 1e-4) then return true end
if uv and (math.abs(uv.X) > 1e-4 or math.abs(uv.Y - 1) > 1e-4 or math.abs(uv.Z) > 1e-4) then return true end return false
end) return ok and res == true
end local function BuildSkinPosePairs(sourceModel, fakeModel)
local posePairs = { _sourceModel = sourceModel,
_fakeModel = fakeModel, _bones = {},
_limbs = {}, _welds = {},
} if not sourceModel or not fakeModel then return posePairs end
local function collectMotor6Ds(model) local byPart1, byName, byParentName = {}, {}, {}
for _, d in ipairs(model:GetDescendants()) do if d:IsA("Motor6D") and not isInsideAccessoryOrTool(d, model) then
local p1 = d.Part1 or (d.Parent and d.Parent:IsA("BasePart") and d.Parent) or nil local p1Key = p1 and normJointKey(p1.Name) or nil
local jKey = normJointKey(d.Name) local parKey = (d.Parent and normJointKey(d.Parent.Name) .. "_" .. jKey) or jKey
if p1Key and p1Key ~= "" and not byPart1[p1Key] then byPart1[p1Key] = d end if jKey ~= "" and not byName[jKey] then byName[jKey] = d end
if parKey ~= "" and not byParentName[parKey] then byParentName[parKey] = d end end
end return byPart1, byName, byParentName
end local srcByP1, srcByName, srcByPar = collectMotor6Ds(sourceModel)
local fakeByP1, fakeByName, fakeByPar = collectMotor6Ds(fakeModel) local usedFake = {}
local function resolvePartInModel(model, part, fallback) if part then
local okN, pName = pcall(function() return part.Name end) if okN and pName and pName ~= "" then
local found = model:FindFirstChild(pName) or model:FindFirstChild(pName, true) if found and found:IsA("BasePart") then return found end
end end
if fallback and fallback:IsA("BasePart") then local found = model:FindFirstChild(fallback.Name) or model:FindFirstChild(fallback.Name, true)
if found and found:IsA("BasePart") then return found end return fallback
end return part
end local function addMotorPair(srcJ, fakeJ, sortKey)
if not srcJ or not fakeJ or usedFake[fakeJ] then return end usedFake[fakeJ] = true
local sP0 = resolvePartInModel(sourceModel, srcJ.Part0, srcJ.Parent) local sP1 = resolvePartInModel(sourceModel, srcJ.Part1, srcJ.Parent)
local fP0 = resolvePartInModel(fakeModel, fakeJ.Part0, fakeJ.Parent) local fP1 = resolvePartInModel(fakeModel, fakeJ.Part1, fakeJ.Parent)
pcall(function() if fP0 then fakeJ.Part0 = fP0 end
if fP1 then fakeJ.Part1 = fP1 end end)
local baseRel = nil pcall(function()
if sP0 and sP1 and sP0 ~= sP1 then baseRel = sP0.CFrame:ToObjectSpace(sP1.CFrame)
end end)
table.insert(posePairs, { kind = "Motor6D",
source = srcJ, fake = fakeJ,
srcPart0 = sP0, srcPart1 = sP1,
fakePart0 = fP0, fakePart1 = fP1,
baseSrcC0 = srcJ.C0 or CFrame.new(), baseSrcC1 = srcJ.C1 or CFrame.new(),
baseFakeC0 = fakeJ.C0 or CFrame.new(), baseFakeC1 = fakeJ.C1 or CFrame.new(),
baseSrcRel = baseRel, order = JOINT_LIMB_ORDER[sortKey] or 3,
}) end
for p1Key, fakeJ in pairs(fakeByP1) do local srcJ = srcByP1[p1Key]
if not srcJ and CROSS_RIG_LIMB_ALIASES[p1Key] then for _, alt in ipairs(CROSS_RIG_LIMB_ALIASES[p1Key]) do
if srcByP1[alt] then srcJ = srcByP1[alt]; break end end
end if srcJ then addMotorPair(srcJ, fakeJ, p1Key) end
end for jKey, fakeJ in pairs(fakeByName) do
if not usedFake[fakeJ] and srcByName[jKey] then addMotorPair(srcByName[jKey], fakeJ, jKey)
end end
for parKey, fakeJ in pairs(fakeByPar) do if not usedFake[fakeJ] and srcByPar[parKey] then
addMotorPair(srcByPar[parKey], fakeJ, parKey) end
end table.sort(posePairs, function(a, b)
return (a.order or 3) < (b.order or 3) end)
local srcBonesByFull, srcBonesByName = {}, {} for _, b in ipairs(sourceModel:GetDescendants()) do
if b:IsA("Bone") then local bKey = normJointKey(b.Name)
local fullKey = (b.Parent and normJointKey(b.Parent.Name) .. "." .. bKey) or bKey
if not srcBonesByFull[fullKey] then srcBonesByFull[fullKey] = b end if not srcBonesByName[bKey] then srcBonesByName[bKey] = b end
end end
for _, fb in ipairs(fakeModel:GetDescendants()) do if fb:IsA("Bone") then
local bKey = normJointKey(fb.Name) local fullKey = (fb.Parent and normJointKey(fb.Parent.Name) .. "." .. bKey) or bKey
local sb = srcBonesByFull[fullKey] or srcBonesByName[bKey] if sb then
table.insert(posePairs._bones, { source = sb, fake = fb }) end
end end
local srcLimbs = {} for _, ch in ipairs(sourceModel:GetChildren()) do
if ch:IsA("BasePart") then srcLimbs[normJointKey(ch.Name)] = ch
end end
local coveredFakeParts = {} for _, mp in ipairs(posePairs) do
if mp.fakePart1 then coveredFakeParts[mp.fakePart1] = true end end
for _, lName in ipairs(BODY_LIMB_NAMES) do local fk = fakeModel:FindFirstChild(lName)
if fk and fk:IsA("BasePart") then local k = normJointKey(lName)
local sr = srcLimbs[k] if not sr and CROSS_RIG_LIMB_ALIASES[k] then
for _, alt in ipairs(CROSS_RIG_LIMB_ALIASES[k]) do if srcLimbs[alt] then sr = srcLimbs[alt]; break end
end end
if sr then table.insert(posePairs._limbs, {
source = sr, fake = fk,
hasMotor = (coveredFakeParts[fk] == true), })
end end
end for _, d in ipairs(fakeModel:GetDescendants()) do
if d:IsA("JointInstance") and (d.Name == "AccessoryWeld" or d.Name == "BC_MorphWeld" or (d.Parent and d.Parent.Name == "Handle")) then
table.insert(posePairs._welds, d) end
end return posePairs
end local function SyncSkinFakePose(posePairs, sourceModel, fakeModel, targetRootCF)
if type(posePairs) ~= "table" then return end sourceModel = sourceModel or posePairs._sourceModel or (player and player.Character)
fakeModel = fakeModel or posePairs._fakeModel local srcRootCF = nil
if sourceModel then srcRootCF = select(1, getCharPivot(sourceModel))
end
local fakeRoot = fakeModel and (fakeModel.PrimaryPart or fakeModel:FindFirstChild("HumanoidRootPart") or fakeModel:FindFirstChildWhichIsA("BasePart", true)) or nil
if fakeRoot and targetRootCF then pcall(function() fakeRoot.CFrame = targetRootCF end)
pcall(function() local ok1 = pcall(function() fakeModel:SetPrimaryPartCFrame(targetRootCF) end)
if not ok1 and fakeModel.PivotTo then pcall(function() fakeModel:PivotTo(targetRootCF) end) end end)
end local fakeRootCF = targetRootCF or (fakeRoot and fakeRoot.CFrame) or nil
for _, pair in ipairs(posePairs) do pcall(function()
local sj, fj = pair.source, pair.fake if not (sj and sj.Parent and fj and fj.Parent) then return end
local tr = sj.Transform or CFrame.new() local dC0, dC1 = CFrame.new(), CFrame.new()
if pair.baseSrcC0 and sj.C0 then pcall(function() dC0 = pair.baseSrcC0:Inverse() * sj.C0 end)
end if pair.baseSrcC1 and sj.C1 then
pcall(function() dC1 = pair.baseSrcC1:Inverse() * sj.C1 end) end
local effTr = tr if not isNonIdentityCF(effTr) and not isNonIdentityCF(dC0) and not isNonIdentityCF(dC1) then
local sp0, sp1 = pair.srcPart0, pair.srcPart1
if sp0 and sp1 and sp0.Parent and sp1.Parent and sp0 ~= sp1 and pair.baseSrcC0 and pair.baseSrcC1 then pcall(function()
local rel = sp0.CFrame:ToObjectSpace(sp1.CFrame) local movedFromBase = true
if pair.baseSrcRel then movedFromBase = isNonIdentityCF(pair.baseSrcRel:Inverse() * rel)
end if movedFromBase then
local liveTr = pair.baseSrcC0:Inverse() * rel * pair.baseSrcC1 if isNonIdentityCF(liveTr) then
effTr = liveTr end
end end)
end end
fj.Transform = effTr local effFakeC0 = (pair.baseFakeC0 or fj.C0 or CFrame.new()) * dC0
local effFakeC1 = (pair.baseFakeC1 or fj.C1 or CFrame.new()) * dC1 pcall(function()
fj.C0 = effFakeC0 fj.C1 = effFakeC1
end) local fp0, fp1 = pair.fakePart0, pair.fakePart1
if fp0 and fp1 and fp0.Parent and fp1.Parent and fp0 ~= fp1 then pcall(function()
fp1.CFrame = fp0.CFrame * effFakeC0 * effTr * effFakeC1:Inverse() end)
end end)
end if srcRootCF and fakeRootCF and posePairs._limbs then
local noMotorCount = (#posePairs == 0) for _, lp in ipairs(posePairs._limbs) do
if noMotorCount or not lp.hasMotor then pcall(function()
if lp.source and lp.source.Parent and lp.fake and lp.fake.Parent then local rel = srcRootCF:ToObjectSpace(lp.source.CFrame)
lp.fake.CFrame = fakeRootCF * rel end
end) end
end end
if posePairs._bones then for _, bp in ipairs(posePairs._bones) do
pcall(function() if bp.source and bp.source.Parent and bp.fake and bp.fake.Parent then
bp.fake.Transform = bp.source.Transform end
end) end
end if posePairs._welds then
for _, w in ipairs(posePairs._welds) do pcall(function()
if w and w.Parent and w.Part0 and w.Part1 and w.Part0.Parent and w.Part1.Parent then if w.Name == "BC_MorphWeld" then
w.Part1.CFrame = w.Part0.CFrame * (w.C0 or CFrame.new()) * (w.C1 or CFrame.new()):Inverse() else
w.Part0.CFrame = w.Part1.CFrame * (w.C1 or CFrame.new()) * (w.C0 or CFrame.new()):Inverse() end
end end)
end end
end local function StartVirtualAvatarSync()
StopVirtualAvatarSync() if not (PI._virtualAvatar and PI._virtualAvatar.Parent) then return false end
local char = player and player.Character if not char then return false end
PI._vAvatarPosePairs = BuildSkinPosePairs(char, PI._virtualAvatar) local function stepVirtualAvatar()
local curChar = player and player.Character local vModel = PI._virtualAvatar
if not (vModel and vModel.Parent) then StopVirtualAvatarSync()
return end
if not (curChar and curChar.Parent) then return end
if not PI._vAvatarPosePairs or PI._vAvatarPosePairs._sourceModel ~= curChar or PI._vAvatarPosePairs._fakeModel ~= vModel then
PI._vAvatarPosePairs = BuildSkinPosePairs(curChar, vModel) end
local charCF = select(1, getCharPivot(curChar)) local targetCF = PI._virtualAvatarCFrame
if charCF and targetCF then pcall(function()
local tx, ty, tz = targetCF.X, targetCF.Y, targetCF.Z local _, _, _, r00, r01, r02, r10, r11, r12, r20, r21, r22 = charCF:GetComponents()
if r00 then targetCF = CFrame.new(tx, ty, tz, r00, r01, r02, r10, r11, r12, r20, r21, r22)
PI._virtualAvatarCFrame = targetCF end
end) end
SyncSkinFakePose(PI._vAvatarPosePairs, curChar, vModel, targetCF) end
stepVirtualAvatar() pcall(function()
PI._vAvatarStepped = RunService.Stepped:Connect(stepVirtualAvatar) end)
pcall(function() RunService:BindToRenderStep("BC_VirtualAvatarSync", Enum.RenderPriority.Camera.Value - 1, stepVirtualAvatar)
end) pcall(function()
PI._vAvatarHeartbeat = RunService.Heartbeat:Connect(stepVirtualAvatar) end)
return true end

function PI.OutfitParts(character) local out, seen = {}, {}
if not character then return out end local function addItem(it)
if it and not seen[it] then seen[it] = true; out[#out + 1] = it end end
for _, item in ipairs(character:GetChildren()) do if item:IsA("Shirt") or item:IsA("Pants") or item:IsA("ShirtGraphic") or item:IsA("Accessory")
or item:IsA("Accoutrement") or item:IsA("Hat") or item:IsA("BodyColors") or item:IsA("CharacterMesh")
or (PI.IsHairItem and PI.IsHairItem(item, character)) then addItem(item)
elseif item:IsA("Folder") or item.Name == "Head" then for _, sub in ipairs(item:GetChildren()) do
if sub:IsA("Accessory") or sub:IsA("Accoutrement") or sub:IsA("Hat") or (PI.IsHairItem and PI.IsHairItem(sub, character)) then
addItem(sub) end
end end
end return out
end function PI.VisualChildren(part)
local out = {} if not part then return out end
for _, child in ipairs(part:GetChildren()) do if child:IsA("Decal") or child:IsA("Texture") or child:IsA("SurfaceAppearance")
or child:IsA("SpecialMesh") or tostring(child.Name):sub(1, 12) == "BC_MorphPart" then
out[#out + 1] = child end
end return out
end local function scaleCFramePos(cf, sx, sy, sz)
if not cf then return cf end local ok, res = pcall(function()
local x, y, z, r00, r01, r02, r10, r11, r12, r20, r21, r22 = cf:GetComponents() if r00 then
return CFrame.new(x * sx, y * sy, z * sz, r00, r01, r02, r10, r11, r12, r20, r21, r22) end
local p = cf.Position local rot = cf - p
return CFrame.new(p.X * sx, p.Y * sy, p.Z * sz) * rot end)
return (ok and res) or cf end
function PI.SaveVisuals(character, desc) local result = { _scales = {}, _hipHeight = nil, _bodyColors = nil }
if not character then return result end local isLiveClone = false
pcall(function() isLiveClone = (character:GetAttribute("BC_IsLiveClone") == true or character.Parent == workspace)
end) local hum = character:FindFirstChildOfClass("Humanoid")
local SCALE_KEYS = { "BodyWidthScale", "BodyDepthScale", "BodyHeightScale", "HeadScale", "BodyTypeScale", "ProportionScale" } local DESC_KEYS = {
BodyWidthScale = "WidthScale", BodyDepthScale = "DepthScale",
BodyHeightScale = "HeightScale", HeadScale = "HeadScale",
BodyTypeScale = "BodyTypeScale", ProportionScale = "ProportionScale",
} if hum then
pcall(function() local hh = tonumber(hum.HipHeight)
if hh and (hum.RigType ~= Enum.HumanoidRigType.R15 or hh >= 0.8) then result._hipHeight = hh
end end)
for _, sk in ipairs(SCALE_KEYS) do pcall(function()
local nv = hum:FindFirstChild(sk) if nv and nv:IsA("NumberValue") and tonumber(nv.Value) then
result._scales[sk] = tonumber(nv.Value) end
end) end
end if desc then
for sk, dk in pairs(DESC_KEYS) do pcall(function()
local v = tonumber(desc[dk]) if v and v > 0 then
local cur = tonumber(result._scales[sk]) if cur == nil or (math.abs(cur - 1) < 1e-3 and math.abs(v - 1) > 1e-3) then
result._scales[sk] = v end
end end)
end end
local bc = character:FindFirstChildOfClass("BodyColors") if bc then
pcall(function() result._bodyColors = {
Head = bc.HeadColor3, Torso = bc.TorsoColor3,
LeftArm = bc.LeftArmColor3, RightArm = bc.RightArmColor3,
LeftLeg = bc.LeftLegColor3, RightLeg = bc.RightLegColor3,
} end)
end local ws = tonumber(result._scales.BodyWidthScale) or 1
local hs = tonumber(result._scales.BodyHeightScale) or 1 local ds = tonumber(result._scales.BodyDepthScale) or 1
local hds = tonumber(result._scales.HeadScale) or 1 for _, part in ipairs(character:GetChildren()) do
if part:IsA("BasePart") and part.Name ~= "HumanoidRootPart" then local isHead = (part.Name == "Head")
local sx = isHead and hds or ws local sy = isHead and hds or hs
local sz = isHead and hds or ds local hasCustomScale = (math.abs(sx - 1) > 0.01 or math.abs(sy - 1) > 0.01 or math.abs(sz - 1) > 0.01)
local origSizeObj = part:FindFirstChild("OriginalSize") local origSizeVal = nil
pcall(function() if origSizeObj and origSizeObj:IsA("Vector3Value") then origSizeVal = origSizeObj.Value end
end) local partSize = part.Size
local needsManualScale = false if hasCustomScale and partSize then
if origSizeVal then local okDiff, diff = pcall(function()
return math.abs(partSize.X - origSizeVal.X) + math.abs(partSize.Y - origSizeVal.Y) + math.abs(partSize.Z - origSizeVal.Z) end)
if okDiff and diff < 0.01 then needsManualScale = true end elseif not isLiveClone then
needsManualScale = true end
end if needsManualScale and partSize then
pcall(function() partSize = Vector3.new(partSize.X * sx, partSize.Y * sy, partSize.Z * sz)
end) end
local motors = {} for _, ch in ipairs(part:GetChildren()) do
if ch:IsA("Motor6D") then local c0, c1 = ch.C0, ch.C1
if needsManualScale then local c0x, c0y, c0z = ws, hs, ds
if not isHead then c0x, c0y, c0z = sx, sy, sz end c0 = scaleCFramePos(c0, c0x, c0y, c0z)
c1 = scaleCFramePos(c1, sx, sy, sz) end
motors[ch.Name] = { c0 = c0, c1 = c1 } end
end local attachments = {}
for _, ch in ipairs(part:GetChildren()) do if ch:IsA("Attachment") then
local cf = ch.CFrame if needsManualScale then
cf = scaleCFramePos(cf, sx, sy, sz) end
local opObj = ch:FindFirstChild("OriginalPosition") local opVal = nil
pcall(function() if opObj and opObj:IsA("Vector3Value") then opVal = opObj.Value end
end) attachments[ch.Name] = { cf = cf, origPos = opVal }
end end
local meshClone, meshId, textureId = nil, nil, nil if part:IsA("MeshPart") then
pcall(function() meshId = tostring(part.MeshId or "") end) pcall(function() textureId = tostring(part.TextureID or "") end)
local okMC, mc = pcall(function() local wasA = part.Archivable
part.Archivable = true local c = part:Clone()
part.Archivable = wasA return c
end) if okMC and mc then
pcall(function() mc:ClearAllChildren() end) meshClone = mc
end end
local rawTrans = tonumber(part.Transparency) or 0 local morphHidden = (rawTrans >= 0.95) and hasInGameMorphOnLimb(character, part)
local partTrans = rawTrans if VISIBLE_LIMB_NAMES[part.Name] and partTrans >= 0.95 and not morphHidden then
partTrans = 0 end
local entry = { color = part.Color,
material = part.Material, size = partSize,
origSize = origSizeVal, transparency = partTrans,
hadMorphHidden = morphHidden, motors = motors,
attachments = attachments, meshClone = meshClone,
meshId = meshId, textureId = textureId,
children = {}, }
for _, child in ipairs(PI.VisualChildren(part)) do if tostring(child.Name):sub(1, 12) ~= "BC_MorphPart" then
local ok, clone = pcall(function() return child:Clone() end) if ok and clone then entry.children[#entry.children + 1] = clone end
end end
result[part.Name] = entry end
end return result
end function PI.CleanupVisuals(visuals)
if type(visuals) ~= "table" then return end for name, entry in pairs(visuals) do
if type(name) == "string" and name:sub(1, 1) ~= "_" and type(entry) == "table" then if entry.meshClone then
pcall(function() entry.meshClone:Destroy() end) entry.meshClone = nil
end for _, ch in ipairs(entry.children or {}) do
pcall(function() ch:Destroy() end) end
end end
end local CROSS_RIG_VISUAL_FALLBACK = {
["Torso"] = { "UpperTorso", "LowerTorso" },
["Left Arm"] = { "LeftUpperArm", "LeftLowerArm", "LeftHand" },
["Right Arm"] = { "RightUpperArm", "RightLowerArm", "RightHand" },
["Left Leg"] = { "LeftUpperLeg", "LeftLowerLeg", "LeftFoot" },
["Right Leg"] = { "RightUpperLeg", "RightLowerLeg", "RightFoot" },
["UpperTorso"] = { "Torso" },
["LowerTorso"] = { "Torso" },
["LeftUpperArm"] = { "Left Arm" },
["LeftLowerArm"] = { "Left Arm" },
["LeftHand"] = { "Left Arm" },
["RightUpperArm"] = { "Right Arm" },
["RightLowerArm"] = { "Right Arm" },
["RightHand"] = { "Right Arm" },
["LeftUpperLeg"] = { "Left Leg" },
["LeftLowerLeg"] = { "Left Leg" },
["LeftFoot"] = { "Left Leg" },
["RightUpperLeg"] = { "Right Leg" },
["RightLowerLeg"] = { "Right Leg" },
["RightFoot"] = { "Right Leg" },
} function PI.ApplyVisuals(character, visuals)
if not character or type(visuals) ~= "table" then return end
local realChar = select(1, PI.GetCharacterAndHumanoid(player)) or (player and player.Character)
local isLocalRealChar = (realChar ~= nil and (character == realChar or character:IsDescendantOf(realChar)))
local isRestore = (visuals._isOriginalRestore == true)
local baseVis = (isLocalRealChar and not isRestore and PI.localSaved and PI.localSaved.character == realChar) and PI.localSaved.visuals or nil
local ws = tonumber(visuals._scales and visuals._scales.BodyWidthScale) or 1
local hs = tonumber(visuals._scales and visuals._scales.BodyHeightScale) or 1
local ds = tonumber(visuals._scales and visuals._scales.BodyDepthScale) or 1
local hds = tonumber(visuals._scales and visuals._scales.HeadScale) or 1
local baseWs = tonumber(baseVis and baseVis._scales and baseVis._scales.BodyWidthScale) or 1
local baseHs = tonumber(baseVis and baseVis._scales and baseVis._scales.BodyHeightScale) or 1
local baseDs = tonumber(baseVis and baseVis._scales and baseVis._scales.BodyDepthScale) or 1
local baseHds = tonumber(baseVis and baseVis._scales and baseVis._scales.HeadScale) or 1
local hum = character:FindFirstChildOfClass("Humanoid") or character:FindFirstChildWhichIsA("Humanoid", true) if hum then
if type(visuals._scales) == "table" then for sName, sVal in pairs(visuals._scales) do
pcall(function() local nv = hum:FindFirstChild(sName)
if nv and nv:IsA("NumberValue") then nv.Value = sVal end end)
end end
pcall(function() if isRestore and visuals._hipHeight ~= nil then
local hh = tonumber(visuals._hipHeight) or 2.0 if hum.RigType == Enum.HumanoidRigType.R15 and hh < 1.0 then hh = 2.0 end
hum.HipHeight = hh elseif isLocalRealChar then
local curHip = tonumber(hum.HipHeight) or 0 local baseHip = tonumber(baseVis and baseVis._hipHeight) or curHip
if hum.RigType == Enum.HumanoidRigType.R15 and baseHip < 1.0 then baseHip = (curHip >= 1.0) and curHip or 2.0
end local ratioH = (baseHs > 0) and (hs / baseHs) or hs
if baseHip > 0 then local targetHip = baseHip * ratioH
if hum.RigType == Enum.HumanoidRigType.R15 then targetHip = math.clamp(targetHip, 1.0, 12.0)
end hum.HipHeight = targetHip
end elseif visuals._hipHeight ~= nil and tonumber(visuals._hipHeight) and tonumber(visuals._hipHeight) >= 0.8 then
hum.HipHeight = tonumber(visuals._hipHeight) end
end) if isLocalRealChar then
pcall(function() hum.PlatformStand = false
hum:SetStateEnabled(Enum.HumanoidStateType.Jumping, true) hum:SetStateEnabled(Enum.HumanoidStateType.GettingUp, true)
hum:SetStateEnabled(Enum.HumanoidStateType.Running, true) hum:SetStateEnabled(Enum.HumanoidStateType.Freefall, true)
end) end
end if type(visuals._bodyColors) == "table" then
local bc = visuals._bodyColors local colorMap = {
Head = bc.Head, Torso = bc.Torso, UpperTorso = bc.Torso, LowerTorso = bc.Torso,
["Left Arm"] = bc.LeftArm, LeftUpperArm = bc.LeftArm, LeftLowerArm = bc.LeftArm, LeftHand = bc.LeftArm,
["Right Arm"] = bc.RightArm, RightUpperArm = bc.RightArm, RightLowerArm = bc.RightArm, RightHand = bc.RightArm,
["Left Leg"] = bc.LeftLeg, LeftUpperLeg = bc.LeftLeg, LeftLowerLeg = bc.LeftLeg, LeftFoot = bc.LeftLeg,
["Right Leg"] = bc.RightLeg, RightUpperLeg = bc.RightLeg, RightLowerLeg = bc.RightLeg, RightFoot = bc.RightLeg,
} for pName, col in pairs(colorMap) do
if col then local p = character:FindFirstChild(pName)
if p and p:IsA("BasePart") then pcall(function() p.Color = col end)
end end
end end
for _, part in ipairs(character:GetChildren()) do if part:IsA("BasePart") and part.Name ~= "HumanoidRootPart" then
local name = part.Name local entry = visuals[name]
local isCrossRigEntry = false if not entry and CROSS_RIG_VISUAL_FALLBACK[name] then
for _, altName in ipairs(CROSS_RIG_VISUAL_FALLBACK[name]) do if type(visuals[altName]) == "table" then
entry = visuals[altName] isCrossRigEntry = true
break end
end end
if type(entry) == "table" then local incomingChildClasses = {}
for _, ch in ipairs(entry.children or {}) do pcall(function() incomingChildClasses[ch.ClassName] = true end)
end for _, child in ipairs(PI.VisualChildren(part)) do
pcall(function() local isGameSkinChild = (child:GetAttribute("BC_GameSkinItem") == true)
or (child:IsA("SurfaceAppearance") and not incomingChildClasses["SurfaceAppearance"])
if not isGameSkinChild and child:IsA("SpecialMesh") and not incomingChildClasses["SpecialMesh"] and (entry.meshId == nil or entry.meshId == "") then
local analysis = PI.AnalyzeUserOwnSkin(character) local smMid = tostring(child.MeshId or "")
local isOwnSM = (smMid == "") or (analysis.ownLimbMeshIds[smMid] == true) if not isOwnSM then
for numStr in smMid:gmatch("(%d+)") do
if analysis.ownLimbMeshNums[numStr] or analysis.ownAssetIds[tonumber(numStr) or 0] then isOwnSM = true
break end
end end
if not isOwnSM and analysis.hasProfileData then isGameSkinChild = true
end end
if isRestore or not isLocalRealChar or not isGameSkinChild then child:Destroy()
end end)
end if entry.color then pcall(function() part.Color = entry.color end) end
if entry.material then pcall(function() part.Material = entry.material end) end if not isCrossRigEntry and part:IsA("MeshPart") then
local curTex = tostring(part.TextureID or "") local curTexLower = string.lower(curTex)
local isGameLimbTex = (part:GetAttribute("BC_GameSkinItem") == true) or curTexLower:find("gameskin", 1, true)
or curTexLower:find("cosmetic", 1, true) or curTexLower:find("evade", 1, true)
if entry.textureId and entry.textureId ~= "" then pcall(function() part.TextureID = entry.textureId end)
elseif isRestore and entry.textureId ~= nil then pcall(function() part.TextureID = entry.textureId end)
elseif not isGameLimbTex then pcall(function() part.TextureID = "" end)
end if entry.meshId and entry.meshId ~= "" then
if entry.meshClone and entry.meshClone:IsA("MeshPart") then pcall(function() part:ApplyMesh(entry.meshClone) end)
end pcall(function() part.MeshId = entry.meshId end)
pcall(function() if type(sethiddenproperty) == "function" then
sethiddenproperty(part, "MeshId", entry.meshId) end
end) elseif isRestore and entry.meshClone and entry.meshClone:IsA("MeshPart") then
pcall(function() part:ApplyMesh(entry.meshClone) end) end
end local isHead = (name == "Head")
local rx = isHead and ((baseHds > 0) and (hds / baseHds) or hds) or ((baseWs > 0) and (ws / baseWs) or ws)
local ry = isHead and ((baseHds > 0) and (hds / baseHds) or hds) or ((baseHs > 0) and (hs / baseHs) or hs)
local rz = isHead and ((baseHds > 0) and (hds / baseHds) or hds) or ((baseDs > 0) and (ds / baseDs) or ds)
local hasScaleRatio = (math.abs(rx - 1) > 0.01 or math.abs(ry - 1) > 0.01 or math.abs(rz - 1) > 0.01)
local basePartEntry = baseVis and baseVis[name] or nil if entry.size then
pcall(function() if (isLocalRealChar or isCrossRigEntry) and not isRestore then
local refSize = (basePartEntry and basePartEntry.size) or part.Size if refSize and hasScaleRatio then
part.Size = Vector3.new(refSize.X * rx, refSize.Y * ry, refSize.Z * rz) elseif not isCrossRigEntry and basePartEntry and basePartEntry.size then
part.Size = basePartEntry.size end
elseif not isCrossRigEntry then part.Size = entry.size
end end)
end if not isCrossRigEntry and entry.origSize then
pcall(function() local osObj = part:FindFirstChild("OriginalSize")
if osObj and osObj:IsA("Vector3Value") then osObj.Value = entry.origSize end end)
end if entry.transparency ~= nil then
pcall(function() local keepMorphHidden = (basePartEntry and basePartEntry.hadMorphHidden == true) or hasInGameMorphOnLimb(character, part)
local targetT = tonumber(entry.transparency) or 0 if keepMorphHidden then
targetT = 1 elseif VISIBLE_LIMB_NAMES[name] and targetT >= 0.95 then
targetT = 0 end
part.Transparency = targetT end)
end if type(entry.motors) == "table" and not isCrossRigEntry then
for mName, mData in pairs(entry.motors) do local m = part:FindFirstChild(mName)
if m and m:IsA("Motor6D") then pcall(function()
local bm = basePartEntry and basePartEntry.motors and basePartEntry.motors[mName] or nil if isLocalRealChar and not isRestore and bm then
if hasScaleRatio then
local c0x, c0y, c0z = (baseWs > 0 and ws / baseWs or ws), (baseHs > 0 and hs / baseHs or hs), (baseDs > 0 and ds / baseDs or ds)
if not isHead then c0x, c0y, c0z = rx, ry, rz end if bm.c0 then m.C0 = scaleCFramePos(bm.c0, c0x, c0y, c0z) end
if bm.c1 then m.C1 = scaleCFramePos(bm.c1, rx, ry, rz) end else
if bm.c0 then m.C0 = bm.c0 end if bm.c1 then m.C1 = bm.c1 end
end else
if mData.c0 then m.C0 = mData.c0 end if mData.c1 then m.C1 = mData.c1 end
end end)
end end
elseif isLocalRealChar and not isRestore and hasScaleRatio and basePartEntry and type(basePartEntry.motors) == "table" then
for mName, bm in pairs(basePartEntry.motors) do local m = part:FindFirstChild(mName)
if m and m:IsA("Motor6D") then pcall(function()
local c0x, c0y, c0z = (baseWs > 0 and ws / baseWs or ws), (baseHs > 0 and hs / baseHs or hs), (baseDs > 0 and ds / baseDs or ds)
if not isHead then c0x, c0y, c0z = rx, ry, rz end if bm.c0 then m.C0 = scaleCFramePos(bm.c0, c0x, c0y, c0z) end
if bm.c1 then m.C1 = scaleCFramePos(bm.c1, rx, ry, rz) end end)
end end
end if type(entry.attachments) == "table" and not isCrossRigEntry then
for aName, aData in pairs(entry.attachments) do local att = part:FindFirstChild(aName)
if att and att:IsA("Attachment") then pcall(function()
if aData.cf then att.CFrame = aData.cf end if aData.origPos then
local op = att:FindFirstChild("OriginalPosition") if op and op:IsA("Vector3Value") then op.Value = aData.origPos end
end end)
end end
end for _, child in ipairs(entry.children or {}) do
pcall(function() local c = child:Clone()
if c then pcall(function() c:SetAttribute("BC_LocalVisualChild", true) end)
c.Parent = part end
end) end
end end
end end
local ATTACHMENT_LIMB_FALLBACK = { HatAttachment = { r15 = "Head", r6 = "Head", cf = CFrame.new(0, 0.6, 0) },
HairAttachment = { r15 = "Head", r6 = "Head", cf = CFrame.new(0, 0.6, 0) },
FaceFrontAttachment = { r15 = "Head", r6 = "Head", cf = CFrame.new(0, 0, -0.6) },
FaceCenterAttachment = { r15 = "Head", r6 = "Head", cf = CFrame.new(0, 0, 0) },
NeckAttachment = { r15 = "UpperTorso", r6 = "Torso", cf = CFrame.new(0, 0.8, 0) },
BodyFrontAttachment = { r15 = "UpperTorso", r6 = "Torso", cf = CFrame.new(0, 0, -0.5) },
BodyBackAttachment = { r15 = "UpperTorso", r6 = "Torso", cf = CFrame.new(0, 0, 0.5) },
LeftCollarAttachment = { r15 = "UpperTorso", r6 = "Torso", cf = CFrame.new(-1, 0.8, 0) },
RightCollarAttachment = { r15 = "UpperTorso", r6 = "Torso", cf = CFrame.new(1, 0.8, 0) },
WaistCenterAttachment = { r15 = "LowerTorso", r6 = "Torso", cf = CFrame.new(0, -0.8, 0) },
WaistFrontAttachment = { r15 = "LowerTorso", r6 = "Torso", cf = CFrame.new(0, -0.8, -0.5) },
WaistBackAttachment = { r15 = "LowerTorso", r6 = "Torso", cf = CFrame.new(0, -0.8, 0.5) },
LeftShoulderAttachment = { r15 = "LeftUpperArm", r6 = "Left Arm", cf = CFrame.new(0, 0.8, 0) },
RightShoulderAttachment = { r15 = "RightUpperArm", r6 = "Right Arm", cf = CFrame.new(0, 0.8, 0) },
LeftGripAttachment = { r15 = "LeftHand", r6 = "Left Arm", cf = CFrame.new(0, -0.8, 0) },
RightGripAttachment = { r15 = "RightHand", r6 = "Right Arm", cf = CFrame.new(0, -0.8, 0) },
LeftFootAttachment = { r15 = "LeftFoot", r6 = "Left Leg", cf = CFrame.new(0, -0.8, 0) },
RightFootAttachment = { r15 = "RightFoot", r6 = "Right Leg", cf = CFrame.new(0, -0.8, 0) }, }
function PI.AttachAccessoryClient(character, humanoid, clone) if not character or not clone then return end
pcall(function() clone.Parent = character end) pcall(function()
for _, d in ipairs(clone:GetDescendants()) do if d:IsA("BasePart") then
if not PI.IsInvisibleHelperOrHandleBox(d, character) and (tonumber(d.Transparency) or 0) >= 0.95 then d.Transparency = 0
end d.Anchored = false
d.CanCollide = false d.CanTouch = false
d.CanQuery = false d.Massless = true
end end
local handle = clone:FindFirstChild("Handle") if not (handle and handle:IsA("BasePart")) then return end
if not PI.IsInvisibleHelperOrHandleBox(handle, character) and (tonumber(handle.Transparency) or 0) >= 0.95 then handle.Transparency = 0
end handle.Anchored = false
handle.CanCollide = false handle.CanTouch = false
handle.CanQuery = false handle.Massless = true
local accAtt = handle:FindFirstChildOfClass("Attachment") local charAtt = nil
if accAtt then for _, bp in ipairs(character:GetChildren()) do
if bp:IsA("BasePart") then local foundAtt = bp:FindFirstChild(accAtt.Name)
if foundAtt and foundAtt:IsA("Attachment") then charAtt = foundAtt
break end
end end
if not charAtt then for _, d in ipairs(character:GetDescendants()) do
if d:IsA("Attachment") and d.Name == accAtt.Name and not d:IsDescendantOf(clone) then charAtt = d
break end
end end
end local savedC0, savedC1 = nil, nil
local refPartName = nil for _, ch in ipairs(handle:GetChildren()) do
if ch:IsA("JointInstance") or ch:IsA("WeldConstraint") or ch:IsA("RigidConstraint") then pcall(function()
if not refPartName then if ch.Part1 and ch.Part1.Name ~= "Handle" then
refPartName = ch.Part1.Name elseif ch.Part0 and ch.Part0.Name ~= "Handle" then
refPartName = ch.Part0.Name end
end if ch:IsA("JointInstance") and not savedC0 then
savedC0 = ch.C0 savedC1 = ch.C1
end end)
pcall(function() ch:Destroy() end) end
end local attInfo = accAtt and ATTACHMENT_LIMB_FALLBACK[accAtt.Name] or nil
local targetPart = (charAtt and charAtt.Parent and charAtt.Parent:IsA("BasePart") and charAtt.Parent) or nil
if not targetPart and refPartName then targetPart = character:FindFirstChild(refPartName)
if not targetPart and CROSS_RIG_VISUAL_FALLBACK[refPartName] then for _, alt in ipairs(CROSS_RIG_VISUAL_FALLBACK[refPartName]) do
local foundAlt = character:FindFirstChild(alt) if foundAlt and foundAlt:IsA("BasePart") then
targetPart = foundAlt break
end end
end end
if not targetPart and attInfo then targetPart = character:FindFirstChild(attInfo.r15) or character:FindFirstChild(attInfo.r6)
end targetPart = targetPart
or character:FindFirstChild("Head") or character:FindFirstChild("UpperTorso")
or character:FindFirstChild("Torso") or character.PrimaryPart
if not (targetPart and targetPart:IsA("BasePart")) then return end local c0 = (accAtt and accAtt.CFrame) or savedC0 or CFrame.new(0, 0, 0)
local c1 = (charAtt and charAtt.CFrame) or savedC1 or (attInfo and attInfo.cf) or CFrame.new(0, 0.5, 0) pcall(function()
handle.CFrame = targetPart.CFrame * c1 * c0:Inverse() end)
local weld = Instance.new("Weld") weld.Name = "AccessoryWeld"
weld.Part0 = handle weld.Part1 = targetPart
weld.C0 = c0 weld.C1 = c1
weld.Parent = handle end)
end function PI.CopyOutfit(source, character, humanoid, desc, rec, isRestore)
if not source or not character then return false, "Thiếu dữ liệu nhân vật để sao chép"
end humanoid = humanoid or character:FindFirstChildOfClass("Humanoid") or character:FindFirstChildWhichIsA("Humanoid", true)
local realChar = select(1, PI.GetCharacterAndHumanoid(player)) or (player and player.Character)
local isRealCharTarget = (realChar ~= nil and (character == realChar or character:IsDescendantOf(realChar))) local items = PI.OutfitParts(source)
local visuals = PI.SaveVisuals(source, desc) if isRestore then visuals._isOriginalRestore = true end
local hasPartVisuals = false for k, _ in pairs(visuals) do
if type(k) == "string" and k:sub(1, 1) ~= "_" then hasPartVisuals = true; break end end
local hasFilteredRemoval = (type(rec) == "table" and PI.HasRemovedSkinItems(rec))
if #items == 0 and not hasPartVisuals and not hasFilteredRemoval and #PI.OutfitParts(character) == 0 then
return false, "Avatar nguồn không có ngoại hình để sao chép" end
local hasSrcShirt, hasSrcPants, hasSrcTShirt, hasSrcBC = false, false, false, false for _, it in ipairs(items) do
if it:IsA("Shirt") then hasSrcShirt = true elseif it:IsA("Pants") then hasSrcPants = true
elseif it:IsA("ShirtGraphic") then hasSrcTShirt = true elseif it:IsA("BodyColors") then hasSrcBC = true
end end
local deletedOwnCount, keptGameCount = 0, 0 if isRealCharTarget and not isRestore then
PI.AnalyzeUserOwnSkin(character, humanoid) PI.ClassifyCharacterSkin(character)
end for _, item in ipairs(PI.OutfitParts(character)) do
pcall(function() if isRealCharTarget and not isRestore and not PI.IsHairItem(item, character) then
local keepGame = false if item:IsA("Accessory") or item:IsA("Hat") or item:IsA("Accoutrement") or item:IsA("CharacterMesh") then
keepGame = PI.IsInGameSupportedSkinItem(item, character) elseif item:IsA("Shirt") then
keepGame = (not hasSrcShirt and not hasFilteredRemoval and PI.IsInGameSupportedSkinItem(item, character)) elseif item:IsA("Pants") then
keepGame = (not hasSrcPants and not hasFilteredRemoval and PI.IsInGameSupportedSkinItem(item, character)) elseif item:IsA("ShirtGraphic") then
keepGame = (not hasSrcTShirt and not hasFilteredRemoval and PI.IsInGameSupportedSkinItem(item, character)) end
if keepGame then pcall(function() item:SetAttribute("BC_GameSkinItem", true) end)
keptGameCount = keptGameCount + 1 return
end end
deletedOwnCount = deletedOwnCount + 1 PI.ForceHideAndRemoveOwnItem(item)
end) end
PI.ApplyVisuals(character, visuals) local count = 0
for _, item in ipairs(items) do local okC, clone = pcall(function() return item:Clone() end)
if okC and clone then if not isRestore then
pcall(function() clone:SetAttribute("BC_LocalOutfitItem", true) end) end
if clone:IsA("Accessory") or clone:IsA("Accoutrement") or clone:IsA("Hat") then PI.AttachAccessoryClient(character, humanoid, clone)
else pcall(function()
if clone:IsA("BasePart") then
clone.Anchored = false; clone.CanCollide = false; clone.CanTouch = false; clone.CanQuery = false; clone.Massless = true end
for _, bp in ipairs(clone:GetDescendants()) do if bp:IsA("BasePart") then
bp.Anchored = false; bp.CanCollide = false; bp.CanTouch = false; bp.CanQuery = false; bp.Massless = true end
end clone.Parent = character
end) end
count = count + (1)
end end
if type(rec) == "table" then pcall(PI.ApplySkinFilterToModel, character, rec)
end PI.CleanupVisuals(visuals)
local summary = tostring(count) .. " món + bố cục cơ thể/mặt/màu da" if isRealCharTarget and not isRestore then
summary = string.format("%s (đã xoá %d skin gốc, giữ %d skin game)", summary, deletedOwnCount, keptGameCount) end
return true, summary end
function PI.SaveOriginalState(char, hum) if not char then return end
hum = hum or char:FindFirstChildOfClass("Humanoid") or char:FindFirstChildWhichIsA("Humanoid", true)
if hum and (not PI.originalDesc or PI.originalHum ~= hum) then local okA, odA = pcall(function() return hum:GetAppliedDescription() end)
if okA and odA then local okC, cloneA = pcall(function() return odA:Clone() end)
PI.originalDesc = (okC and cloneA) and cloneA or odA PI.originalHum = hum
end if not PI.originalDesc then
local okB, odB = pcall(function() return Players:GetHumanoidDescriptionFromUserId(player.UserId) end) if okB and odB then
PI.originalDesc = odB PI.originalHum = hum
end end
end PI.AnalyzeUserOwnSkin(char, hum)
PI.ClassifyCharacterSkin(char) if not PI.localSaved or PI.localSaved.character ~= char then
if PI.localSaved and PI.localSaved.visuals then pcall(PI.CleanupVisuals, PI.localSaved.visuals)
end local origVis = PI.SaveVisuals(char, PI.originalDesc)
origVis._isOriginalRestore = true PI.localSaved = { character = char, items = {}, visuals = origVis }
for _, item in ipairs(PI.OutfitParts(char)) do if not PI.IsInGameSupportedSkinItem(item, char) then
local cloned, savedItem = pcall(function() return item:Clone() end) if cloned and savedItem then
pcall(function() savedItem:SetAttribute("BC_HiddenOriginalItem", nil) end) table.insert(PI.localSaved.items, savedItem)
end end
end end
end function PI.ApplyLocalToChar(char, hum, desc, rec)
if not char then return false, false, nil, "Chưa có nhân vật" end local _, foundHum, charRigType = PI.GetCharacterAndHumanoid(player)
hum = hum or foundHum or char:FindFirstChildOfClass("Humanoid") or char:FindFirstChildWhichIsA("Humanoid", true)
local targetRigType = (hum and hum.RigType) or charRigType or Enum.HumanoidRigType.R15
if char:FindFirstChild("Torso") and not char:FindFirstChild("UpperTorso") then targetRigType = Enum.HumanoidRigType.R6
elseif char:FindFirstChild("UpperTorso") then targetRigType = Enum.HumanoidRigType.R15
end PI.SaveOriginalState(char, hum)
if not desc and rec and rec.id then local okD, d = pcall(function() return Players:GetHumanoidDescriptionFromUserId(rec.id) end)
if okD and d then desc = d; rec.desc = d end end
if type(rec) == "table" then PI.EnsureSkinItems(rec) end local effDesc = (type(rec) == "table" and PI.FilteredDesc(rec)) or desc
local okModel, source = false, nil if rec then
local built, _, builtDesc = PI.BuildAvatarModel(rec, "BC_LocalOutfitSource", targetRigType) if built then
okModel, source = true, built if not effDesc and builtDesc then effDesc = builtDesc end
end end
if (not okModel or not source) and effDesc then okModel, source = pcall(function()
return Players:CreateHumanoidModelFromDescription(effDesc, targetRigType) end)
if okModel and source and type(rec) == "table" then pcall(PI.ApplySkinFilterToModel, source, rec)
end end
local rigSource = nil if okModel and source and effDesc then
pcall(function() local sHum = source:FindFirstChildOfClass("Humanoid")
local sIsR6 = (source:FindFirstChild("Torso") ~= nil and source:FindFirstChild("UpperTorso") == nil)
local sRig = sIsR6 and Enum.HumanoidRigType.R6 or ((sHum and sHum.RigType) or Enum.HumanoidRigType.R15) if sRig ~= targetRigType then
local okRS, rs = pcall(function() return Players:CreateHumanoidModelFromDescription(effDesc, targetRigType)
end) if okRS and rs then
if type(rec) == "table" then pcall(PI.ApplySkinFilterToModel, rs, rec) end rigSource = rs
end end
end) end
local copied, detail = false, nil if okModel and source and char.Parent ~= nil then
local ran, success, reason = pcall(PI.CopyOutfit, source, char, hum, effDesc, rec) copied = ran and success == true
detail = ran and reason or tostring(success) if rigSource then
pcall(function() local rVis = PI.SaveVisuals(rigSource, effDesc)
PI.ApplyVisuals(char, rVis) PI.CleanupVisuals(rVis)
end) end
if type(rec) == "table" then pcall(PI.ApplySkinFilterToModel, char, rec)
end for _, subRig in ipairs(PI.GetVisualSubRigs(char)) do
pcall(function() local subHum = subRig:FindFirstChildOfClass("Humanoid") or hum
local okSub = PI.CopyOutfit(rigSource or source, subRig, subHum, effDesc, rec) if okSub then copied = true end
if type(rec) == "table" then pcall(PI.ApplySkinFilterToModel, subRig, rec) end end)
end end
if source then pcall(function() source:Destroy() end) end if rigSource then pcall(function() rigSource:Destroy() end) end
local applied, err = false, nil if not copied and effDesc and hum then
local descToApply = effDesc local okC, cloneD = pcall(function() return effDesc:Clone() end)
if okC and cloneD then descToApply = cloneD end applied, err = pcall(function() hum:ApplyDescription(descToApply) end)
end if copied or applied then
EnsureCharacterVisible(char) end
return copied, applied, detail, err end
function PI.ApplyLocal(rec) print("[BC_Skin] ApplyLocal (Bước Mặc LOCAL) rec", rec and rec.id or "nil", rec and rec.name or "")
if type(rec) ~= "table" or (rec.desc == nil and rec.id == nil) then return false, "chưa có dữ liệu người chơi để Mặc LOCAL"
end local char, hum, _ = PI.GetCharacterAndHumanoid(player)
if not char then PI.localActive = true
PI.localId = rec.id PI.localRec = rec
PI.isApplied = true PI.appliedId = rec.id
PI.appliedMode = "local" if D.SyncOutfitPanel then pcall(D.SyncOutfitPanel) end
if PI.RefreshButtons then pcall(PI.RefreshButtons) end return true, "đã bật Mặc LOCAL (sẽ tự mặc ngay khi nhân vật vào trận)"
end PI.executionLog = PI.executionLog or {}
table.insert(PI.executionLog, "local") local copied, applied, detail, err = PI.ApplyLocalToChar(char, hum, rec.desc, rec)
if copied or applied then PI.localActive = true
PI.localId = rec.id PI.localRec = rec
PI.isApplied = true PI.appliedId = rec.id
PI.appliedMode = "local" PI._lastAppliedChar = char
end pcall(function() PI.DiagnoseClothes(char, PI.FilteredDesc(rec) or rec.desc) end)
EnsureCharacterVisible(char) if char.Parent == nil then
return false, "nhân vật đã hồi sinh khi tải đồ; bấm Mặc LOCAL lại" elseif copied or applied then
if D.SyncOutfitPanel then pcall(D.SyncOutfitPanel) end if PI.RefreshButtons then pcall(PI.RefreshButtons) end
local msg = copied and tostring(detail or "đã sao chép trang phục LOCAL")
or ("ApplyDescription cục bộ (" .. tostring(detail or "không sao chép được phụ kiện") .. ")") return true, msg
else return false, tostring(err or detail or "không áp được trang phục LOCAL")
end end
function PI.ServerOutfitAction(action, uid) local remote = game:GetService("ReplicatedStorage"):FindFirstChild("BC_OutfitRequest")
if not remote or not remote:IsA("RemoteFunction") then return false, "Chưa cài OutfitServer.server.lua vào ServerScriptService của game bạn."
end local sent, success, message = pcall(function() return remote:InvokeServer(action, uid) end)
if not sent then return false, tostring(success) end
return success == true, tostring(message or (success and "Đã gửi yêu cầu SERVER" or "Yêu cầu SERVER thất bại")) end
function PI.SpawnVirtualAvatar(rec, isRefresh) if type(rec) ~= "table" or (rec.desc == nil and rec.id == nil) then
return false, "chưa có dữ liệu người chơi để tạo nhân vật ảo" end
PI.EnsureSkinItems(rec) local char, hum, rigType = PI.GetCharacterAndHumanoid(player)
local vModel, verr, vDesc = PI.BuildAvatarModel(rec, "BC_VirtualAvatar_" .. tostring(rec.id or "clone"), rigType) if not vModel then
return false, "không dựng được nhân vật ảo: " .. tostring(verr) end
pcall(function() local vVis = PI.SaveVisuals(vModel, vDesc or PI.FilteredDesc(rec) or rec.desc)
PI.ApplyVisuals(vModel, vVis) PI.CleanupVisuals(vVis)
end) pcall(function()
local vHum = vModel:FindFirstChildOfClass("Humanoid") for _, item in ipairs(vModel:GetChildren()) do
if item:IsA("Accessory") then PI.AttachAccessoryClient(vModel, vHum, item)
end end
if not vModel.PrimaryPart then
local cand = vModel:FindFirstChild("HumanoidRootPart") or vModel:FindFirstChild("Torso") or vModel:FindFirstChild("UpperTorso") or vModel:FindFirstChildWhichIsA("BasePart", true)
if cand then vModel.PrimaryPart = cand end end
if vHum then vHum.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None
vHum.HealthDisplayType = Enum.HumanoidDisplayType.AlwaysOff end
end) local targetCF = (isRefresh and PI._virtualAvatarCFrame) or nil
if not targetCF then local cf = getCharPivot(char)
targetCF = cf and (cf * CFrame.new(4, 0, 0)) or CFrame.new(0, 5, 0) end
StopVirtualAvatarSync() if PI._virtualAvatar then
pcall(function() PI._virtualAvatar:Destroy() end) PI._virtualAvatar = nil
end SetupSkinCollisionGroups()
pcall(function() vModel.Parent = workspace end) makeFakeVisible(vModel, rigType)
pcall(function() local okP = pcall(function() vModel:SetPrimaryPartCFrame(targetCF) end)
if not okP then pcall(function() vModel:PivotTo(targetCF) end) end end)
PI._virtualAvatar = vModel PI._virtualAvatarId = rec.id
PI._virtualAvatarRec = rec PI._virtualAvatarCFrame = targetCF
StartVirtualAvatarSync() local kept, total, deleted = PI.KeptCount(rec)
if PI.RefreshButtons then pcall(PI.RefreshButtons) end
return true, string.format("nhân vật ảo @%s (giữ %d/%d món, đã xoá %d món · đồng bộ hành động)", tostring(rec.name or rec.id), kept, total, deleted)
end function PI.ClearVirtualAvatar()
local hadMap = (PI._virtualAvatar ~= nil) StopVirtualAvatarSync()
if PI._virtualAvatar then pcall(function() PI._virtualAvatar:Destroy() end)
PI._virtualAvatar = nil end
PI._virtualAvatarId = nil PI._virtualAvatarRec = nil
PI._virtualAvatarCFrame = nil if PI.RefreshButtons then pcall(PI.RefreshButtons) end
return hadMap, hadMap and "Đã xoá nhân vật ảo trên map" or "Chưa có nhân vật ảo nào trên map" end
function PI.ResetSkin() print("[BC_Skin] ResetSkin")
local hadVirtualMap = (PI._virtualAvatar ~= nil) if hadVirtualMap then pcall(PI.ClearVirtualAvatar) end
if not PI.isApplied and not PI.localActive and not PI.localSaved and not hadVirtualMap then
return false, "bạn chưa Mặc LOCAL hoặc tạo Nhân Vật Ảo nào" end
PI.isApplied = false PI.appliedId = nil
PI.appliedMode = nil PI.localActive = false
PI.localId = nil PI.localRec = nil
PI._lastAppliedChar = nil local char, hum = PI.GetCharacterAndHumanoid(player)
local restoredLocal = false if char and PI.localSaved and PI.localSaved.character == char then
for _, item in ipairs(PI.OutfitParts(char)) do if not PI.IsInGameSupportedSkinItem(item, char) then
pcall(function() item:Destroy() end) end
end if PI.localSaved.visuals then
PI.localSaved.visuals._isOriginalRestore = true PI.ApplyVisuals(char, PI.localSaved.visuals)
pcall(PI.CleanupVisuals, PI.localSaved.visuals) end
for _, item in ipairs(PI.localSaved.items or {}) do pcall(function()
local cloned = item:Clone() pcall(function() cloned:SetAttribute("BC_HiddenOriginalItem", nil) end)
if cloned:IsA("Accessory") then PI.AttachAccessoryClient(char, hum, cloned)
else cloned.Parent = char
end end)
end EnsureCharacterVisible(char)
restoredLocal = true else
if PI.localSaved and PI.localSaved.visuals then pcall(PI.CleanupVisuals, PI.localSaved.visuals)
end if hum and PI.originalDesc then
local toRestore = PI.originalDesc local okC, cloneR = pcall(function() return toRestore:Clone() end)
if okC and cloneR then toRestore = cloneR end pcall(function() hum:ApplyDescription(toRestore) end)
restoredLocal = true end
end PI.localSaved = nil
PI.originalDesc = nil PI.originalHum = nil
if D.SyncOutfitPanel then pcall(D.SyncOutfitPanel) end if PI.RefreshButtons then pcall(PI.RefreshButtons) end
return true, restoredLocal and "Đã khôi phục skin & trang phục LOCAL gốc" or nil end
local function ReapplyActiveSkinToNewChar(newChar) if not PI.isApplied or not PI.appliedId then return end
local rec = (PI.localRec and PI.localRec.id == PI.appliedId and PI.localRec) or PI.last if not (rec and rec.id == PI.appliedId and rec.desc) then
local ok, d = pcall(function() return Players:GetHumanoidDescriptionFromUserId(PI.appliedId) end) if ok and d then
rec = { desc = d, id = PI.appliedId, name = rec and rec.name or tostring(PI.appliedId), keep = rec and rec.keep or {} }
pcall(PI.ParseSkinItems, rec) end
end if not rec then return end
PI._lastAppliedChar = newChar pcall(function() PI.ApplyLocal(rec) end)
if D.SyncOutfitPanel then pcall(D.SyncOutfitPanel) end if PI.RefreshButtons then pcall(PI.RefreshButtons) end
end pcall(function()
trackConn(player.CharacterAdded:Connect(function(newChar) if not PI.isApplied or not PI.appliedId then return end
task.wait(0.7) local _ = newChar:WaitForChild("Humanoid", 3) or newChar:FindFirstChildWhichIsA("Humanoid", true)
task.wait(0.2) ReapplyActiveSkinToNewChar(newChar)
end)) if PI._evadeLocalGuardConn then pcall(function() PI._evadeLocalGuardConn:Disconnect() end) end
PI._evadeLocalGuardConn = trackConn(RunService.Heartbeat:Connect(function() if not (PI.isApplied and PI.localActive) then return end
pcall(function() local curChar = select(1, PI.GetCharacterAndHumanoid(player))
if not (curChar and curChar.Parent) then return end if PI._lastAppliedChar ~= curChar and not PI._reapplyingChar then
PI._reapplyingChar = true PI._lastAppliedChar = curChar
task.spawn(function() task.wait(0.35)
pcall(ReapplyActiveSkinToNewChar, curChar) PI._reapplyingChar = false
end) elseif PI.localActive then
EnsureCharacterVisible(curChar) end
end) end))
end) vp.InputBegan:Connect(function(input)
local t = input.UserInputType if t == Enum.UserInputType.MouseButton1 or t == Enum.UserInputType.Touch then PI.view.drag = true end
end) vp.MouseEnter:Connect(function() PI.view.hover = true end)
vp.MouseLeave:Connect(function() PI.view.hover = false end) trackConn(UserInputService.InputEnded:Connect(function(input)
local t = input.UserInputType if t == Enum.UserInputType.MouseButton1 or t == Enum.UserInputType.Touch then PI.view.drag = false end
end)) trackConn(UserInputService.InputChanged:Connect(function(input)
local t = input.UserInputType if PI.view.drag and (t == Enum.UserInputType.MouseMovement or t == Enum.UserInputType.Touch) and input.Delta then
PI.view.yaw = PI.view.yaw - input.Delta.X * 0.01 PI.view.pitch = math.clamp(PI.view.pitch + input.Delta.Y * 0.005, -0.5, 1.1)
PI.ViewerUpdate() elseif PI.view.hover and t == Enum.UserInputType.MouseWheel and input.Position then
PI.ViewerZoom(input.Position.Z > 0 and 0.89 or 1.12) end
end)) pcall(function()
RunService:BindToRenderStep(PI.SPIN_BIND, Enum.RenderPriority.Last.Value, function(dt) local v = PI.view
if v.auto and v.model and not v.drag then v.yaw = v.yaw + (tonumber(dt) or 0.016) * 0.6
PI.ViewerUpdate() end
end) end)
local vBtnL = pAct("⟲ Trái", 8, 274, 46, C.GRAY) local vBtnR = pAct("Phải ⟳", 58, 274, 46, C.GRAY)
local vBtnIn = pAct("➕ Gần", 108, 274, 46, C.GRAY) local vBtnOut = pAct("➖ Xa", 158, 274, 46, C.GRAY)
local autoBtn = pAct("", 8, 296, 96, C.GREEN) local resetBtn = pAct("🎯 Đặt lại góc", 108, 296, 96, C.GRAY)
local function refreshAutoBtn() autoBtn.Text = PI.view.auto and "🔄 Tự xoay: BẬT" or "🔄 Tự xoay: TẮT"
autoBtn.BackgroundColor3 = PI.view.auto and C.GREEN or C.SURFACE3 autoBtn.TextColor3 = D.BestText(autoBtn.BackgroundColor3)
end refreshAutoBtn()
local rows = {} local ROW_NAMES = { "name", "display", "id", "created", "presence", "server", "serverCode", "flags", "desc" }
local ROW_TITLES = { "Tên", "Tên hiển thị", "UserId", "Ngày tạo", "Trạng thái", "Trong server này", "Mã Server (JobId)", "Huy hiệu / Cấm", "Mô tả" }
for i, key in ipairs(ROW_NAMES) do local y = 68 + (i - 1) * 14
rows[key] = New("TextLabel", { Name = "HubPlayerInfo_Row_" .. tostring(key), Size = UDim2.new(1, -244, 0, key == "desc" and 28 or 14), Position = UDim2.new(0, 236, 0, y),
Text = ROW_TITLES[i] .. ": —", BackgroundTransparency = 1, TextColor3 = key == "serverCode" and C.ACCENT or C.DARK, Font = key == "serverCode" and Enum.Font.GothamBold or Enum.Font.GothamMedium,
TextSize = 9, TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top, TextWrapped = key == "desc", ZIndex = 7, }, P)
end local function setRow(key, title, value)
if rows[key] then rows[key].Text = title .. ": " .. tostring(value) end end
local function render(rec) thumbImg.Image = (type(rec.thumb) == "string") and rec.thumb or ""
setRow("name", "Tên", "@" .. rec.name) setRow("display", "Tên hiển thị", rec.displayName)
setRow("id", "UserId", rec.id) setRow("created", "Ngày tạo", rec.created)
setRow("presence", "Trạng thái", rec.presence) setRow("server", "Trong server này", rec.inServer and "CÓ" or "KHÔNG")
setRow("serverCode", "Mã Server (JobId)", rec.serverCodeText or rec.serverJobId or (rec.inServer and tostring(game.JobId or "Cùng server")) or "Offline / Ẩn")
setRow("flags", "Huy hiệu / Cấm", (rec.verified and "✔ xác minh" or "chưa xác minh") .. " · " .. (rec.isBanned and "⛔ bị cấm" or "không bị cấm"))
setRow("desc", "Mô tả", clipText(rec.description ~= "" and rec.description or "(trống)", 140)) local okV, verr = PI.ViewerBuild(rec)
thumbImg.Visible = not okV return okV, verr
end local function clearRows()
thumbImg.Image = "" thumbImg.Visible = true
pcall(function() if PI.view.model then PI.view.model:Destroy() end end) PI.view.model = nil
for i, key in ipairs(ROW_NAMES) do rows[key].Text = ROW_TITLES[i] .. ": —" end end
local function startLookup(afterCb) local q = trimStr(queryIn.Text)
if q == "" then setStatus("⚠️ Chưa nhập tên hoặc UserId", C.YELLOW) return end
local directJob, directPlace = S.ParseServerCode(q)
if directJob and directJob ~= "" then
pcall(function() if D.hubJobIn then D.hubJobIn.Text = tostring(directJob) end end)
S.CopyToClipboard(tostring(directJob))
setRow("serverCode", "Mã Server (JobId)", tostring(directJob) .. (directPlace and (" (Place: " .. tostring(directPlace) .. ")") or ""))
local okJ, msgJ = PI.JoinPlayerServer(q)
setStatus((okJ and "✅ " or "⚠️ ") .. tostring(msgJ), okJ and C.GREEN or C.YELLOW)
return
end
PI.last = nil
clearRows()
setRow("serverCode", "Mã Server (JobId)", "⏳ Đang quét tìm đúng server của '" .. q .. "'...")
pcall(function() if D.hubJobIn then D.hubJobIn.Text = "" end end)
setStatus("⏳ Đang tra cứu '" .. q .. "'...", C.YELLOW)
task.spawn(function()
local ok, rec, err = pcall(PI.Lookup, q, function(pg, cnt, mode)
setStatus(string.format("🔍 Đang quét server tìm '%s' (trang %s · %s · %s SV)...", tostring(q), tostring(pg), tostring(mode or "Desc"), tostring(cnt or 0)), C.YELLOW)
end, function(prelimRec)
pcall(render, prelimRec)
end)
if not ok then setStatus("⚠️ Lỗi không mong đợi: " .. tostring(rec), C.RED)
return end
if rec == nil then if err ~= nil then setStatus("⚠️ " .. tostring(err), C.RED) end
return end
PI.last = rec local okR, rv, rerr = pcall(render, rec)
local note = "" if not okR then note = " · lỗi hiển thị: " .. tostring(rv)
elseif rv == false then note = " · không dựng được 3D (" .. tostring(rerr) .. ")" end
local srvNote = (rec.isPlaying == false and (" · ⛔ " .. tostring(rec.notPlayingReason or "Không chơi game — tìm SV tắt")))
or ((rec.serverJobId and rec.serverJobId ~= "") and (" · Mã SV: " .. tostring(rec.serverJobId):sub(1, 13) .. "...") or " · Chưa thấy trong SV công khai")
setStatus("✅ Đã tải hồ sơ " .. rec.name .. srvNote .. (rec.desc and "" or " (không có skin công khai)") .. note, rec.desc and C.GREEN or C.YELLOW)
if type(afterCb) == "function" then pcall(afterCb, rec)
end end)
end local copyProfBtn    = pAct("📋 Link", 236, 212, 38, C.GRAY)
local copyIdBtn      = pAct("🔗 ID", 276, 212, 34, C.GRAY)
PI.copySrvCodeBtn    = pAct("📋 Mã SV", 312, 212, 42, C.ACCENT) PI.copySrvCodeBtn.Name = "HubPlayerInfo_CopyServerCodeBtn"
PI.joinSrvBtn        = pAct("🚀 Vào SV", 356, 212, 42, C.GREEN) PI.joinSrvBtn.Name = "HubPlayerInfo_JoinServerBtn"
local serverSkinBtn  = pAct("🌐 SV", 400, 212, 36, C.BLUE)
local applyLocalBtn  = pAct("👕 Mặc LOCAL", 236, 236, 98, C.GREEN) local resetSkinBtn   = pAct("↩ Trả Skin", 338, 236, 98, C.GRAY)
local saveSkinTopBtn = pAct("💾 Lưu Skin", 236, 260, 98, C.BLUE) local saveUseTopBtn  = pAct("⚡ Lưu Skin Dùng", 338, 260, 98, C.YELLOW)
local skinStatusLbl = New("TextLabel", { Name = "HubPlayerInfo_SkinStatus", Size = UDim2.new(1, -244, 0, 56), Position = UDim2.new(0, 236, 0, 284),
Text = "👕 Bấm Mặc LOCAL để mặc trang phục cục bộ. Bấm ⚡ Lưu Skin Dùng để tự mặc khi mở script.",
TextWrapped = true, BackgroundTransparency = 1, TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium,
TextSize = 8, TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top, ZIndex = 7, }, P)
local function refreshSkinButtons() local lOn = PI.localActive == true local hasAutoUse = (type(PI.autoUseSkin) == "table")
applyLocalBtn.Text = lOn and "👕 Mặc LOCAL: BẬT" or "👕 Mặc LOCAL" applyLocalBtn.BackgroundColor3 = lOn and C.GREEN or C.SURFACE3 applyLocalBtn.TextColor3 = D.BestText(applyLocalBtn.BackgroundColor3)
if saveUseTopBtn then local isCurAuto = hasAutoUse and PI.last and tonumber(PI.autoUseSkin.id) == tonumber(PI.last.id)
saveUseTopBtn.Text = isCurAuto and "⚡ Tự Dùng: BẬT" or "⚡ Lưu Skin Dùng" saveUseTopBtn.BackgroundColor3 = isCurAuto and C.GREEN or C.YELLOW saveUseTopBtn.TextColor3 = D.BestText(saveUseTopBtn.BackgroundColor3) end
end PI.RefreshButtons = refreshSkinButtons
PI.SyncFromTopPanel = function(name, uid, rec) if name and queryIn then queryIn.Text = tostring(name) end if rec and rec.desc then pcall(function() PI.ViewerBuild(rec) end) end refreshSkinButtons() end
local function withTargetRec(cb) local q = trimStr(queryIn.Text)
if q == "" and D.OutfitInput then q = trimStr(D.OutfitInput.Text) if q ~= "" then queryIn.Text = q end end
if PI.last ~= nil and (q == "" or string.lower(q) == string.lower(tostring(PI.last.name or "")) or tonumber(q) == PI.last.id) then cb(PI.last) return end
if q ~= "" then startLookup(cb) else setStatus("⚠️ Hãy nhập tên/UserId hoặc bấm 🔍 Tra cứu trước", C.YELLOW) end
end searchBtn.Activated:Connect(function() ReleaseHubFocus() startLookup() end)
queryIn.FocusLost:Connect(function(enter) if enter then startLookup() end end)
clearBtn.Activated:Connect(function() ReleaseHubFocus() PI.reqId = PI.reqId + 1 PI.last = nil queryIn.Text = "" clearRows()
if PI.ClearSkinClassUI then pcall(PI.ClearSkinClassUI) end setStatus("Đã xoá. Nhập tên khác rồi bấm 🔍.", C.MUTED) end)
applyLocalBtn.Activated:Connect(function() ReleaseHubFocus()
withTargetRec(function(rec) if D.OutfitInput and trimStr(D.OutfitInput.Text) == "" and rec.name then D.OutfitInput.Text = tostring(rec.name) end
local ok, detail = PI.ApplyLocal(rec) refreshSkinButtons() if D.SyncOutfitPanel then pcall(D.SyncOutfitPanel) end
if ok then setStatus("✅ Đã Mặc LOCAL @" .. rec.name .. " (" .. tostring(detail) .. ")", C.GREEN)
if skinStatusLbl then skinStatusLbl.Text = "✅ Đã Mặc LOCAL @" .. rec.name .. " (" .. tostring(detail) .. ") — ↩ Trả Skin để về." skinStatusLbl.TextColor3 = C.GREEN end pcall(function() PI.ViewerBuild(rec) end)
else setStatus("⚠️ Không Mặc LOCAL được: " .. tostring(detail), C.RED)
if skinStatusLbl then skinStatusLbl.Text = "⚠️ Mặc LOCAL thất bại: " .. tostring(detail) skinStatusLbl.TextColor3 = C.RED end
end end) end)
serverSkinBtn.Activated:Connect(function() ReleaseHubFocus() withTargetRec(function(rec)
setStatus("⏳ Đang gửi yêu cầu Mặc SERVER cho @" .. tostring(rec.name) .. "...", C.YELLOW) task.spawn(function()
local ok, msg = PI.ServerOutfitAction("apply", rec.id) setStatus((ok and "✅ " or "⚠️ ") .. tostring(msg), ok and C.GREEN or C.YELLOW)
if skinStatusLbl then skinStatusLbl.Text = (ok and "🌐 " or "⚠️ ") .. tostring(msg) skinStatusLbl.TextColor3 = ok and C.GREEN or C.YELLOW end
end) end) end)
resetSkinBtn.Activated:Connect(function() ReleaseHubFocus() local ok, err = PI.ResetSkin() refreshSkinButtons() if D.SyncOutfitPanel then pcall(D.SyncOutfitPanel) end
if ok then setStatus("↩ Đã khôi phục skin & trang phục gốc của bạn", C.GREEN)
if skinStatusLbl then skinStatusLbl.Text = "↩ Đã về trang phục gốc — bấm 👕 Mặc LOCAL để mặc trang phục cục bộ!" skinStatusLbl.TextColor3 = C.MUTED end
else setStatus("⚠️ " .. tostring(err), C.YELLOW) if skinStatusLbl then skinStatusLbl.Text = "⚠️ " .. tostring(err) skinStatusLbl.TextColor3 = C.YELLOW end end end)
saveSkinTopBtn.Activated:Connect(function() ReleaseHubFocus() withTargetRec(function(rec) local ok, msg = PI.SaveSkin(rec, "local")
refreshSkinButtons() if PI.RefreshSavedSkinsUI then pcall(PI.RefreshSavedSkinsUI) end setStatus((ok and "💾 " or "⚠️ ") .. tostring(msg), ok and C.GREEN or C.RED)
if skinStatusLbl then skinStatusLbl.Text = (ok and "💾 " or "⚠️ ") .. tostring(msg) skinStatusLbl.TextColor3 = ok and C.GREEN or C.RED end end) end)
saveUseTopBtn.Activated:Connect(function() ReleaseHubFocus() withTargetRec(function(rec) local ok, msg = PI.SaveSkinForAutoUse(rec, "local", true)
refreshSkinButtons() if PI.RefreshSavedSkinsUI then pcall(PI.RefreshSavedSkinsUI) end setStatus((ok and "⚡ " or "⚠️ ") .. tostring(msg), ok and C.GREEN or C.RED)
if skinStatusLbl then skinStatusLbl.Text = (ok and "⚡ " or "⚠️ ") .. tostring(msg) skinStatusLbl.TextColor3 = ok and C.GREEN or C.RED end pcall(function() PI.ViewerBuild(rec) end) end) end)
pcall(function() local _origRender = render render = function(rec) local okV, verr = _origRender(rec)
if D.OutfitInput and rec and rec.name then D.OutfitInput.Text = tostring(rec.name) end
refreshSkinButtons() if D.SyncOutfitPanel then pcall(D.SyncOutfitPanel) end
if PI.RenderSkinClass then pcall(PI.RenderSkinClass, rec) end if PI.RefreshSavedSkinsUI then pcall(PI.RefreshSavedSkinsUI) end
pcall(function() if PI.isApplied and PI.appliedId == rec.id then skinStatusLbl.Text = "👕 Đang dùng (Mặc LOCAL) @" .. rec.name .. " — bấm ↩ Trả Skin để về." skinStatusLbl.TextColor3 = C.GREEN
elseif PI.isApplied then skinStatusLbl.Text = "👕 Đang mặc ID " .. tostring(PI.appliedId) .. " — bấm 👕 Mặc LOCAL để đổi sang @" .. rec.name .. "." skinStatusLbl.TextColor3 = C.YELLOW
else skinStatusLbl.Text = "👕 Sẵn sàng @" .. rec.name .. " — bấm 👕 Mặc LOCAL để mặc trang phục!" skinStatusLbl.TextColor3 = C.MUTED end end)
return okV, verr end end)
PI.OnSavedRecLoaded = function(rec) if type(rec) == "table" then if rec.name and queryIn then queryIn.Text = tostring(rec.name) end pcall(render, rec) end end
PI.OnAutoUseApplied = function(ok, msg, rec, entry) refreshSkinButtons() if PI.RefreshSavedSkinsUI then pcall(PI.RefreshSavedSkinsUI) end
if ok and type(rec) == "table" then if rec.name and queryIn then queryIn.Text = tostring(rec.name) end pcall(render, rec)
setStatus("⚡ [Tự Mặc Skin Dùng] @" .. tostring(rec.name or rec.id) .. " (" .. tostring(msg) .. ")", C.GREEN)
if skinStatusLbl then skinStatusLbl.Text = "⚡ Đã tự động mặc Skin Dùng @" .. tostring(rec.name or rec.id) .. " khi khởi chạy script!" skinStatusLbl.TextColor3 = C.GREEN end
elseif not ok then setStatus("⚠️ Tự mặc Skin Dùng: " .. tostring(msg), C.YELLOW) end end
vBtnL.Activated:Connect(function() ReleaseHubFocus() PI.view.yaw = PI.view.yaw + 0.5 PI.ViewerUpdate() end)
vBtnR.Activated:Connect(function() ReleaseHubFocus() PI.view.yaw = PI.view.yaw - 0.5 PI.ViewerUpdate() end)
vBtnIn.Activated:Connect(function() ReleaseHubFocus() PI.ViewerZoom(0.85) end)
vBtnOut.Activated:Connect(function() ReleaseHubFocus() PI.ViewerZoom(1.18) end)
autoBtn.Activated:Connect(function() ReleaseHubFocus() PI.view.auto = not PI.view.auto refreshAutoBtn() end)
resetBtn.Activated:Connect(function() ReleaseHubFocus() PI.ViewerReset() end)
copyProfBtn.Activated:Connect(function() ReleaseHubFocus() withTargetRec(function(rec)
local url = "https://www.roblox.com/users/" .. tostring(rec.id) .. "/profile"
local did = S.CopyToClipboard(url)
setStatus(did and ("📋 Đã copy: " .. url) or ("🔗 " .. url .. " (executor không có setclipboard)"), did and C.GREEN or C.YELLOW) end) end)
copyIdBtn.Activated:Connect(function() ReleaseHubFocus() withTargetRec(function(rec)
local did = S.CopyToClipboard(tostring(rec.id))
setStatus(did and ("📋 Đã copy UserId " .. tostring(rec.id)) or ("UserId: " .. tostring(rec.id)), did and C.GREEN or C.YELLOW) end) end)
PI.copySrvCodeBtn.Activated:Connect(function() ReleaseHubFocus()
withTargetRec(function(rec)
if rec.isPlaying == false then
local isPl, npMsg = PI.CheckPlayerIsPlaying(rec.id, nil)
rec.isPlaying = isPl rec.notPlayingReason = npMsg
if not isPl then
rec.serverJobId = nil rec.serverCode = ""
rec.serverCodeText = "⛔ " .. tostring(npMsg or "Người chơi không chơi game — tìm server không hoạt động")
setRow("serverCode", "Mã Server (JobId)", rec.serverCodeText)
pcall(function() if D.hubJobIn then D.hubJobIn.Text = "" end end)
setStatus("⛔ @" .. tostring(rec.name or rec.id) .. ": " .. tostring(npMsg or "hiện không chơi game — tính năng tìm server không hoạt động"), C.YELLOW)
return
end
end
local code = (rec.serverJobId and rec.serverJobId ~= "" and rec.serverJobId) or (rec.inServer and tostring(game.JobId or "")) or ""
if code == "" and rec.id then
setStatus("🔍 Đang quét tìm đúng Mã Server của @" .. tostring(rec.name or rec.id) .. "...", C.YELLOW)
local foundJ, foundP, foundSrc, foundMeta, foundCo, npMsg = PI.FindPlayerServerByTokens(rec.id, rec.placeId or game.PlaceId, function(pg, cnt, mode, pId)
setStatus(string.format("🔍 Đang quét server tìm @%s (trang %s · %s · Place %s)...", tostring(rec.name or rec.id), tostring(pg), tostring(mode or "Desc"), tostring(pId or game.PlaceId)), C.YELLOW)
end, 20)
if npMsg then
rec.isPlaying = false rec.notPlayingReason = npMsg
rec.serverJobId = nil rec.serverCode = ""
rec.serverCodeText = "⛔ " .. tostring(npMsg)
setRow("serverCode", "Mã Server (JobId)", rec.serverCodeText)
pcall(function() if D.hubJobIn then D.hubJobIn.Text = "" end end)
setStatus("⛔ @" .. tostring(rec.name or rec.id) .. ": " .. tostring(npMsg), C.YELLOW)
return
end
if foundJ and foundJ ~= "" then
code = tostring(foundJ)
rec.serverJobId = code
rec.placeId = tonumber(foundP) or rec.placeId or tonumber(game.PlaceId)
rec.serverMeta = foundMeta
rec.coPlayerName = foundCo
rec.serverSource = foundSrc
rec.serverCode, rec.serverCodeText = PI.FormatJobAndPlace(code, rec.placeId, foundMeta, foundCo)
setRow("serverCode", "Mã Server (JobId)", rec.serverCodeText)
if PI.RenderSkinClass then pcall(PI.RenderSkinClass, rec) end
end
end
if code == "" then setStatus("⚠️ Không tìm thấy Mã Server của @" .. tostring(rec.name or rec.id) .. " (đang ở Server VIP/riêng tư)", C.YELLOW) return end
local codeIn = PI.FormatJobAndPlace(code, rec.placeId, rec.serverMeta, rec.coPlayerName)
local did = S.CopyToClipboard(tostring(codeIn ~= "" and codeIn or code))
pcall(function() if D.hubJobIn then D.hubJobIn.Text = tostring(codeIn ~= "" and codeIn or code) end end)
setStatus((did and "📋 Đã copy đúng Mã Server của @" .. tostring(rec.name or rec.id) .. ": " or "Mã Server: ") .. tostring(codeIn ~= "" and codeIn or code) .. " (đã điền sẵn vào ô Hop ở Script Hub)", did and C.GREEN or C.YELLOW)
end)
end)
PI.joinSrvBtn.Activated:Connect(function() ReleaseHubFocus()
local q = trimStr(queryIn.Text)
local parsedJob = S.ParseServerCode(q)
if parsedJob and parsedJob ~= "" then
local okJ, msgJ = PI.JoinPlayerServer(q, nil, function(msg, col)
setStatus(tostring(msg), col or C.YELLOW)
if skinStatusLbl then skinStatusLbl.Text = tostring(msg); skinStatusLbl.TextColor3 = col or C.YELLOW end
end)
setStatus((okJ and "✅ " or "⚠️ ") .. tostring(msgJ), okJ and C.GREEN or C.YELLOW)
if skinStatusLbl then skinStatusLbl.Text = tostring(msgJ); skinStatusLbl.TextColor3 = okJ and C.GREEN or C.YELLOW end
return
end
withTargetRec(function(rec)
local okJ, msgJ = PI.JoinPlayerServer(rec, function(pg, cnt, mode, pId)
setStatus(string.format("🔍 Đang quét server tìm @%s (trang %s · %s · Place %s)...", tostring(rec.name or rec.id), tostring(pg), tostring(mode or "Desc"), tostring(pId or game.PlaceId)), C.YELLOW)
end, function(msg, col)
setStatus(tostring(msg), col or C.YELLOW)
if skinStatusLbl then skinStatusLbl.Text = tostring(msg); skinStatusLbl.TextColor3 = col or C.YELLOW end
end)
if rec.serverJobId and rec.serverJobId ~= "" then
setRow("serverCode", "Mã Server (JobId)", rec.serverCodeText or rec.serverJobId)
if PI.RenderSkinClass then pcall(PI.RenderSkinClass, rec) end
end
setStatus((okJ and "✅ " or "⚠️ ") .. tostring(msgJ), okJ and C.GREEN or C.YELLOW)
if skinStatusLbl then skinStatusLbl.Text = tostring(msgJ); skinStatusLbl.TextColor3 = okJ and C.GREEN or C.YELLOW end
end)
end)

;(function() local SH = 484
local SP = New("Frame", { Name = "HubSkinClass_Panel",
Size = UDim2.new(1, -16, 0, SH), Position = UDim2.new(0, 8, 0, D.playerY or 424),
LayoutOrder = 6, BackgroundColor3 = C.SURFACE, BackgroundTransparency = 0.12, BorderSizePixel = 0, ZIndex = 6,
}, D.playerTab) D.playerY = (D.playerY or 424) + SH + 8
Corner(SP, UDim.new(0, 10)) Stroke(SP, C.HAIRLINE, 1) D.Shade(SP, Color3.fromRGB(255, 255, 255), Color3.fromRGB(188, 192, 205), 90)
New("TextLabel", { Size = UDim2.new(1, -170, 0, 14), Position = UDim2.new(0, 8, 0, 4),
Text = "🗂️ PHÂN LOẠI SKIN · XOÁ MÓN · TẠO NHÂN VẬT ẢO & LƯU SKIN", BackgroundTransparency = 1,
TextColor3 = C.ACCENT, Font = Enum.Font.GothamBold, TextSize = 10, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, SP)
local summaryBadge = New("TextLabel", { Name = "HubSkinClass_Summary", Size = UDim2.new(0, 160, 0, 14), Position = UDim2.new(1, -168, 0, 4),
Text = "Giữ: —/— món · Đã xoá: 0", BackgroundTransparency = 1,
TextColor3 = C.MUTED, Font = Enum.Font.GothamBold, TextSize = 8, TextXAlignment = Enum.TextXAlignment.Right, ZIndex = 7, }, SP)
local function sAct(txt, x, y, w, h, color, parent, name) local bh = math.min(h or 18, 18)
local b = New("TextButton", { Name = name or "Button",
Size = UDim2.new(0, w, 0, bh), Position = UDim2.new(0, x, 0, y), Text = txt, BackgroundColor3 = color, TextColor3 = D.BestText(color),
Font = Enum.Font.GothamBold, TextSize = 7, BorderSizePixel = 0, ZIndex = 8, }, parent or SP)
Corner(b, UDim.new(0, 4)) D.Shade(b, Color3.fromRGB(255, 255, 255), Color3.fromRGB(182, 187, 201), 90) D.Tactile(b, 0.08) return b
end local skinQueryIn = New("TextBox", {
Name = "HubSkinClass_Query", Size = UDim2.new(0, 224, 0, 18), Position = UDim2.new(0, 8, 0, 22), Text = "",
PlaceholderText = "Nhập tên người chơi / UserId để phân loại skin...",
ClearTextOnFocus = false, BackgroundColor3 = C.SURFACE2, BackgroundTransparency = 0.1, TextColor3 = C.DARK,
PlaceholderColor3 = C.GRAY, Font = Enum.Font.GothamMedium, TextSize = 9, TextXAlignment = Enum.TextXAlignment.Left,
BorderSizePixel = 0, ZIndex = 7, }, SP) Corner(skinQueryIn, UDim.new(0, 5)) New("UIPadding", { PaddingLeft = UDim.new(0, 6) }, skinQueryIn)
local classifyBtn  = sAct("🔍 Phân loại", 236, 22, 68, 18, C.GREEN, SP, "HubSkinClass_ClassifyBtn")
local selfSkinBtn  = sAct("👤 Skin tôi", 308, 22, 60, 18, C.BLUE, SP, "HubSkinClass_SelfBtn")
local clearSkinBtn = sAct("✕ Xoá ô", 372, 22, 58, 18, C.RED, SP, "HubSkinClass_ClearBtn") local infoBox = New("Frame", {
Name = "HubSkinClass_InfoBox", Size = UDim2.new(1, -16, 0, 34), Position = UDim2.new(0, 8, 0, 46),
BackgroundColor3 = C.SURFACE2, BackgroundTransparency = 0.08, BorderSizePixel = 0, ZIndex = 7, }, SP)
Corner(infoBox, UDim.new(0, 6)) Stroke(infoBox, C.HAIRLINE, 1) local infoUserLbl = New("TextLabel", {
Name = "HubSkinClass_UserInfo", Size = UDim2.new(1, -12, 0, 15), Position = UDim2.new(0, 6, 0, 2),
Text = "👤 Người chơi: — (Nhập tên người chơi rồi bấm 🔍 Phân loại hoặc Enter)",
BackgroundTransparency = 1, TextColor3 = C.DARK, Font = Enum.Font.GothamBold, TextSize = 8,
TextXAlignment = Enum.TextXAlignment.Left, TextWrapped = false, ZIndex = 8, }, infoBox) local infoCatLbl = New("TextLabel", {
Name = "HubSkinClass_CatInfo", Size = UDim2.new(1, -12, 0, 15), Position = UDim2.new(0, 6, 0, 17),
Text = "📊 Phân loại skin: 🎩 Phụ kiện: — · 👕 Quần áo: — · 🙂 Đầu/Mặt: — · 🦾 Cơ thể: — · 🎨 Da/Dáng: —",
BackgroundTransparency = 1, TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium, TextSize = 8,
TextXAlignment = Enum.TextXAlignment.Left, TextWrapped = false, ZIndex = 8, }, infoBox) local CAT_DEFS = {
{ key = "all",       title = "📋 Tất cả",    x = 8,   w = 60 }, { key = "accessory", title = "🎩 Phụ kiện",  x = 71,  w = 68 },
{ key = "clothing",  title = "👕 Quần áo",   x = 142, w = 64 }, { key = "headface",  title = "🙂 Đầu & Mặt", x = 209, w = 68 },
{ key = "bodypart",  title = "🦾 Cơ thể",    x = 280, w = 60 }, { key = "style",     title = "🎨 Da & Dáng", x = 343, w = 64 },
} local catBtns = {}
for _, cd in ipairs(CAT_DEFS) do catBtns[cd.key] = sAct(cd.title, cd.x, 84, cd.w, 17, C.SURFACE3)
end local keepAllBtn = sAct("✔ Giữ hết skin", 8, 105, 92, 17, C.GREEN)
local delCatBtn  = sAct("✖ Xoá nhóm đang chọn", 104, 105, 112, 17, C.YELLOW)
local delAllBtn  = sAct("🗑️ Xoá sạch skin (Trơn)", 220, 105, 110, 17, C.RED) local invertBtn  = sAct("🔄 Đảo chọn", 334, 105, 72, 17, C.GRAY)
local accList = New("ScrollingFrame", { Name = "HubPlayerInfo_AccList", Size = UDim2.new(1, -16, 0, 144), Position = UDim2.new(0, 8, 0, 126),
BackgroundColor3 = C.SURFACE2, BackgroundTransparency = 0.08, BorderSizePixel = 0, ScrollBarThickness = 4,
ScrollBarImageColor3 = C.GRAY, CanvasSize = UDim2.new(0, 0, 0, 0), ZIndex = 7, }, SP)
Corner(accList, UDim.new(0, 6)) Stroke(accList, C.HAIRLINE, 1)
local spawnVirtualMapBtn  = sAct("👥 Đặt Nhân Vật Ảo Ra Map", 8, 274, 160, 18, C.ACCENT, SP, "HubSkinClass_SpawnVirtualBtn")
local applyFilteredLocBtn = sAct("👕 Mặc LOCAL", 172, 274, 120, 18, C.GREEN, SP, "HubSkinClass_ApplyLocalBtn")
local clearVirtualBtn     = sAct("🗑️ Xoá Nhân Vật Ảo", 296, 274, 114, 18, C.GRAY, SP, "HubSkinClass_ClearVirtualBtn")
local saveSkinBtn     = sAct("💾 Lưu Skin", 8, 296, 110, 18, C.BLUE, SP, "HubSkinClass_SaveBtn")
local saveUseSkinBtn  = sAct("⚡ Lưu Skin Dùng (Tự Mặc)", 122, 296, 166, 18, C.YELLOW, SP, "HubSkinClass_SaveUseBtn")
local clearUseSkinBtn = sAct("🚫 Tắt Tự Dùng", 292, 296, 94, 18, C.GRAY, SP, "HubSkinClass_ClearUseBtn")
local autoUseBannerLbl = New("TextLabel", {
Name = "HubSkinClass_AutoUseBanner", Size = UDim2.new(1, -16, 0, 16), Position = UDim2.new(0, 8, 0, 326),
Text = "⚡ Skin Dùng Khi Chạy Script: Chưa bật (bấm '⚡ Lưu Skin Dùng' trên skin bất kỳ để tự mặc khi chạy script)",
BackgroundTransparency = 1, TextColor3 = C.ACCENT, Font = Enum.Font.GothamBold, TextSize = 8,
TextXAlignment = Enum.TextXAlignment.Left, TextWrapped = false, ZIndex = 7, }, SP) local savedSkinsList = New("ScrollingFrame", {
Name = "HubSkinClass_SavedList", Size = UDim2.new(1, -16, 0, 102), Position = UDim2.new(0, 8, 0, 344),
BackgroundColor3 = C.SURFACE2, BackgroundTransparency = 0.08, BorderSizePixel = 0, ScrollBarThickness = 4,
ScrollBarImageColor3 = C.GRAY, CanvasSize = UDim2.new(0, 0, 0, 0), ZIndex = 7, }, SP)
Corner(savedSkinsList, UDim.new(0, 6)) Stroke(savedSkinsList, C.HAIRLINE, 1) local scStatusLbl = New("TextLabel", {
Name = "HubSkinClass_Status", Size = UDim2.new(1, -16, 0, 28), Position = UDim2.new(0, 8, 0, 450),
Text = "💡 Nhập tên người chơi -> xoá món tuỳ ý -> bấm '💾 Lưu Skin' hoặc '⚡ Lưu Skin Dùng' để tự mặc khi mở script!",
TextWrapped = true, BackgroundTransparency = 1, TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium,
TextSize = 8, TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Top, ZIndex = 7, }, SP)
local function setScStatus(text, color) scStatusLbl.Text = tostring(text or "")
scStatusLbl.TextColor3 = color or C.MUTED end
local accRows = {}
local function refreshCatChips(rec) local counts = (type(rec) == "table" and type(rec.catCounts) == "table") and rec.catCounts or nil
for _, cd in ipairs(CAT_DEFS) do local b = catBtns[cd.key]
if b then local isAct = (PI.activeCategory == cd.key)
local cnt = counts and counts[cd.key] or nil b.Text = cd.title .. (cnt ~= nil and (" (" .. tostring(cnt) .. ")") or "")
b.BackgroundColor3 = isAct and C.ACCENT or C.SURFACE3 b.TextColor3 = D.BestText(b.BackgroundColor3)
end end
end local function refreshSkinSummary(rec)
refreshCatChips(rec) if type(rec) ~= "table" then
summaryBadge.Text = "Giữ: —/— món · Đã xoá: 0" infoUserLbl.Text = "👤 Người chơi: — (Nhập tên người chơi rồi bấm 🔍 Phân loại hoặc Enter)"
infoCatLbl.Text = "📊 Phân loại skin: 🎩 Phụ kiện: — · 👕 Quần áo: — · 🙂 Đầu/Mặt: — · 🦾 Cơ thể: — · 🎨 Da/Dáng: —" return
end PI.EnsureSkinItems(rec)
local kept, total, deleted = PI.KeptCount(rec) summaryBadge.Text = string.format("Giữ: %d/%d món · Đã xoá: %d", kept, total, deleted)
summaryBadge.TextColor3 = deleted > 0 and C.YELLOW or C.GREEN
local srvTag = rec.serverJobId or (rec.inServer and tostring(game.JobId or "Cùng SV")) or "Ẩn/Offline"
infoUserLbl.Text = string.format("👤 @%s (%s) · ID: %s · %s · Mã SV: %s",
tostring(rec.name or "—"), tostring(rec.displayName or "—"), tostring(rec.id or "—"),
tostring(rec.presence or "—"), tostring(srvTag)) local cc = rec.catCounts or {}
infoCatLbl.Text = string.format("📊 🎩 Phụ kiện: %d · 👕 Quần áo: %d · 🙂 Đầu/Mặt: %d · 🦾 Cơ thể: %d · 📐 %s",
cc.accessory or 0, cc.clothing or 0, cc.headface or 0, cc.bodypart or 0, tostring(rec.bodySummary or "Mặc định")) end
local function refreshSkinRow(rec, item) local r = accRows[item.idx]
if not r then return end local kept = (rec.keep[item.idx] ~= false)
local nameTxt if item.name and item.name ~= "" then
nameTxt = item.name elseif item.loading then
nameTxt = "⏳ đang tải tên..." elseif item.assetId and item.assetId > 0 then
nameTxt = "ID " .. tostring(item.assetId) else
nameTxt = "Mặc định" end
local idSuffix = (item.assetId and item.assetId > 0) and ("  [ID: " .. tostring(item.assetId) .. "]") or ""
local prefix = kept and "" or "[ĐÃ XOÁ] "
r.label.Text = clipText(string.format("%s[%s] %s%s", prefix, tostring(item.typeLabel or "Skin"), tostring(nameTxt), idSuffix), 56)
r.label.TextColor3 = kept and C.DARK or C.RED r.btn.Text = kept and "✖ Xoá skin" or "↩ Giữ lại"
r.btn.BackgroundColor3 = kept and C.RED or C.GREEN r.btn.TextColor3 = D.BestText(r.btn.BackgroundColor3)
end local function renderSkinList(rec)
for _, ch in ipairs(accList:GetChildren()) do if ch:IsA("GuiObject") then ch:Destroy() end
end accRows = {}
refreshSkinSummary(rec) if type(rec) ~= "table" then
accList.CanvasSize = UDim2.new(0, 0, 0, 32)
New("TextLabel", { Size = UDim2.new(1, -8, 0, 28), Position = UDim2.new(0, 4, 0, 2), BackgroundTransparency = 1,
Text = "Chưa chọn người chơi. Nhập tên người chơi ở ô trên rồi bấm 🔍 Phân loại.", TextWrapped = true,
TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium, TextSize = 8, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 8, }, accList) return
end local allItems = PI.EnsureSkinItems(rec)
local cat = PI.activeCategory or "all" local filtered = {}
for _, it in ipairs(allItems) do if cat == "all" or it.category == cat then
filtered[#filtered + 1] = it end
end accList.CanvasSize = UDim2.new(0, 0, 0, math.max(32, #filtered * 26 + 4))
if #filtered == 0 then New("TextLabel", { Size = UDim2.new(1, -8, 0, 28), Position = UDim2.new(0, 4, 0, 2), BackgroundTransparency = 1,
Text = (#allItems == 0) and "Người chơi này không có dữ liệu skin công khai." or "Không có món skin nào thuộc nhóm phân loại này.",
TextWrapped = true, TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium, TextSize = 8, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 8, }, accList)
return end
for posIdx, item in ipairs(filtered) do
local row = New("Frame", { Size = UDim2.new(1, -8, 0, 22), Position = UDim2.new(0, 4, 0, (posIdx - 1) * 24 + 2),
BackgroundColor3 = C.SURFACE, BackgroundTransparency = 0.35, BorderSizePixel = 0, ZIndex = 8, }, accList) Corner(row, UDim.new(0, 5))
local label = New("TextLabel", { Size = UDim2.new(1, -68, 1, 0), Position = UDim2.new(0, 6, 0, 0), BackgroundTransparency = 1,
TextColor3 = C.DARK, Font = Enum.Font.GothamMedium, TextSize = 8, TextXAlignment = Enum.TextXAlignment.Left,
TextYAlignment = Enum.TextYAlignment.Center, TextWrapped = false, Text = "", ZIndex = 9, }, row)
local btn = New("TextButton", { Size = UDim2.new(0, 58, 0, 16), Position = UDim2.new(1, -62, 0, 3), Text = "",
BorderSizePixel = 0, Font = Enum.Font.GothamBold, TextSize = 7, ZIndex = 10, }, row) Corner(btn, UDim.new(0, 4)) D.Tactile(btn, 0.08)
accRows[item.idx] = { label = label, btn = btn } btn.Activated:Connect(function()
ReleaseHubFocus() PI.SetKeep(rec, item.idx, rec.keep[item.idx] == false)
end) refreshSkinRow(rec, item)
end end
local function loadSkinNames(rec) task.spawn(function()
for _, item in ipairs((type(rec) == "table" and rec.skinItems) or {}) do if PI.last ~= rec then return end
if item.assetId and item.assetId > 0 and item.loading then local info = PI.ProductInfo(item.assetId)
item.loading = false if info and type(info.name) == "string" and info.name ~= "" then
item.name = info.name item.creator = info.creator
end if PI.last == rec then refreshSkinRow(rec, item) end
end end
end) end
local function syncLiveAvatarsAfterFilter(rec) task.spawn(function()
local okV, verr = PI.ViewerBuild(rec) thumbImg.Visible = not okV
if PI.localActive and PI.localId == rec.id then pcall(PI.ApplyLocal, rec)
end if PI._virtualAvatar and PI._virtualAvatar.Parent and PI._virtualAvatarId == rec.id then
pcall(PI.SpawnVirtualAvatar, rec, true) end
local kept, total, deleted = PI.KeptCount(rec)
setScStatus(string.format("✂️ Đã cập nhật bộ lọc skin @%s: giữ %d/%d món (đã xoá %d món). Xem 3D & Nhân vật ảo đã cập nhật!",
tostring(rec.name or rec.id), kept, total, deleted), C.GREEN) end)
end function PI.SetKeep(rec, idx, keep)
if type(rec) ~= "table" then return end PI.EnsureSkinItems(rec)
rec.keep[idx] = keep and true or false local item = rec.skinItems and rec.skinItems[idx]
if item then refreshSkinRow(rec, item) end refreshSkinSummary(rec)
syncLiveAvatarsAfterFilter(rec) end
function PI.SetKeepAll(rec, keep, categoryFilter) if type(rec) ~= "table" then return end
local list = PI.EnsureSkinItems(rec) local cat = (categoryFilter and categoryFilter ~= "" and categoryFilter ~= "all") and categoryFilter or nil
local keepBool = keep and true or false for _, item in ipairs(list) do
if not cat or item.category == cat then rec.keep[item.idx] = keepBool
refreshSkinRow(rec, item) end
end refreshSkinSummary(rec)
syncLiveAvatarsAfterFilter(rec) end
function PI.InvertKeep(rec, categoryFilter) if type(rec) ~= "table" then return end
local list = PI.EnsureSkinItems(rec) local cat = (categoryFilter and categoryFilter ~= "" and categoryFilter ~= "all") and categoryFilter or nil
for _, item in ipairs(list) do if not cat or item.category == cat then
rec.keep[item.idx] = (rec.keep[item.idx] == false) refreshSkinRow(rec, item)
end end
refreshSkinSummary(rec) syncLiveAvatarsAfterFilter(rec)
end function PI.SetCategoryFilter(catKey)
PI.activeCategory = tostring(catKey or "all") renderSkinList(PI.last)
end PI.RenderSkinClass = function(rec)
if rec and rec.name then skinQueryIn.Text = tostring(rec.name)
end renderSkinList(rec)
loadSkinNames(rec) if rec then
local kept, total, deleted = PI.KeptCount(rec)
setScStatus(string.format("✅ Đã phân loại %d mục skin của @%s (giữ %d, đã xoá %d). Bấm '✖ Xoá skin' để bỏ món rồi bấm '🧍 Tạo Nhân Vật Ảo'!",
total, tostring(rec.name or rec.id), kept, deleted), C.GREEN) end
end PI.ClearSkinClassUI = function()
skinQueryIn.Text = "" renderSkinList(nil)
setScStatus("Đã xoá. Nhập tên người chơi khác để phân loại skin & tạo nhân vật ảo.", C.MUTED) end
for _, cd in ipairs(CAT_DEFS) do local b = catBtns[cd.key]
if b then b.Activated:Connect(function()
ReleaseHubFocus() PI.SetCategoryFilter(cd.key)
end) end
end local function triggerFromSkinPanel(afterCb)
local q = trimStr(skinQueryIn.Text) if q == "" then q = trimStr(queryIn.Text) end
if q == "" then setScStatus("⚠️ Vui lòng nhập tên người chơi hoặc UserId vào ô trước!", C.YELLOW)
return end
queryIn.Text = q skinQueryIn.Text = q
if PI.last ~= nil and (string.lower(q) == string.lower(tostring(PI.last.name or "")) or tonumber(q) == PI.last.id) then
PI.RenderSkinClass(PI.last) if type(afterCb) == "function" then pcall(afterCb, PI.last) end
return end
setScStatus("⏳ Đang tải thông tin & phân loại skin của '" .. q .. "'...", C.YELLOW) startLookup(function(rec)
if type(afterCb) == "function" then pcall(afterCb, rec) end end)
end classifyBtn.Activated:Connect(function() ReleaseHubFocus() triggerFromSkinPanel() end)
skinQueryIn.FocusLost:Connect(function(enter) if enter then triggerFromSkinPanel() end end) selfSkinBtn.Activated:Connect(function()
ReleaseHubFocus() if player and player.Name then
skinQueryIn.Text = tostring(player.Name) queryIn.Text = tostring(player.Name)
startLookup() end
end) clearSkinBtn.Activated:Connect(function()
ReleaseHubFocus() PI.reqId = PI.reqId + 1
PI.last = nil queryIn.Text = ""
clearRows() PI.ClearSkinClassUI()
end) keepAllBtn.Activated:Connect(function()
ReleaseHubFocus() if not PI.last then setScStatus("⚠️ Hãy tra cứu người chơi trước!", C.YELLOW) return end
PI.SetKeepAll(PI.last, true, "all") end)
delCatBtn.Activated:Connect(function() ReleaseHubFocus()
if not PI.last then setScStatus("⚠️ Hãy tra cứu người chơi trước!", C.YELLOW) return end PI.SetKeepAll(PI.last, false, PI.activeCategory or "all")
end) delAllBtn.Activated:Connect(function()
ReleaseHubFocus() if not PI.last then setScStatus("⚠️ Hãy tra cứu người chơi trước!", C.YELLOW) return end
PI.SetKeepAll(PI.last, false, "all") end)
invertBtn.Activated:Connect(function() ReleaseHubFocus()
if not PI.last then setScStatus("⚠️ Hãy tra cứu người chơi trước!", C.YELLOW) return end PI.InvertKeep(PI.last, PI.activeCategory or "all")
end) spawnVirtualMapBtn.Activated:Connect(function()
ReleaseHubFocus() triggerFromSkinPanel(function(rec)
local ok, msg = PI.SpawnVirtualAvatar(rec, false) if ok then
setScStatus("👥 Đã đặt " .. tostring(msg) .. " đứng cạnh bạn ngoài Map!", C.GREEN) setStatus("✅ Đã đặt " .. tostring(msg) .. " ra Map", C.GREEN)
else setScStatus("⚠️ Không đặt được Nhân Vật Ảo: " .. tostring(msg), C.RED)
end end)
end) applyFilteredLocBtn.Activated:Connect(function()
ReleaseHubFocus() triggerFromSkinPanel(function(rec)
local ok, msg = PI.ApplyLocal(rec) refreshSkinButtons()
local kept, total, deleted = PI.KeptCount(rec) if ok then
setScStatus(string.format("👕 Đã Mặc LOCAL skin đã lọc của @%s (giữ %d/%d món, đã xoá %d món)!",
tostring(rec.name or rec.id), kept, total, deleted), C.GREEN) else
setScStatus("⚠️ Không Mặc LOCAL được: " .. tostring(msg), C.RED) end
end) end)
clearVirtualBtn.Activated:Connect(function() ReleaseHubFocus()
local hadMap = PI.ClearVirtualAvatar() local okReset = PI.ResetSkin()
refreshSkinButtons() if hadMap or okReset then
setScStatus("🗑️ Đã xoá Nhân Vật Ảo & khôi phục nhân vật gốc của bạn.", C.GREEN) else
setScStatus("ℹ️ Hiện chưa có Nhân Vật Ảo nào đang bật.", C.MUTED) end
end)

local function renderSavedSkinsList() for _, ch in ipairs(savedSkinsList:GetChildren()) do
if ch:IsA("GuiObject") then ch:Destroy() end end
local list = type(PI.savedSkins) == "table" and PI.savedSkins or {} local autoEntry = type(PI.autoUseSkin) == "table" and PI.autoUseSkin or nil
if autoEntry then local autoModeTxt = "Mặc LOCAL"
local delCnt = tonumber(autoEntry.deletedCount) or 0 local delTxt = delCnt > 0 and (" · đã xoá " .. tostring(delCnt) .. " món") or ""
autoUseBannerLbl.Text = string.format("⚡ Skin Dùng Khi Chạy Script: ĐANG BẬT -> @%s (%s) [%s%s] · Đã lưu: %d skin",
tostring(autoEntry.name or autoEntry.id), tostring(autoEntry.displayName or autoEntry.name or autoEntry.id), autoModeTxt, delTxt, #list)
autoUseBannerLbl.TextColor3 = C.GREEN else
autoUseBannerLbl.Text = string.format("⚡ Skin Dùng Khi Chạy Script: CHƯA BẬT (Bấm '⚡ Lưu Skin Dùng' trên skin bất kỳ) · Đã lưu: %d skin", #list)
autoUseBannerLbl.TextColor3 = C.MUTED end
savedSkinsList.CanvasSize = UDim2.new(0, 0, 0, math.max(28, #list * 26 + 4)) if #list == 0 then
New("TextLabel", { Size = UDim2.new(1, -8, 0, 26), Position = UDim2.new(0, 4, 0, 2), BackgroundTransparency = 1,
Text = "Chưa có skin nào được lưu. Bấm '💾 Lưu Skin' hoặc '⚡ Lưu Skin Dùng (Tự Mặc)' để lưu skin (kèm các món đã xoá).",
TextWrapped = true, TextColor3 = C.MUTED, Font = Enum.Font.GothamMedium, TextSize = 8,
TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 8, }, savedSkinsList) return
end for idx, entry in ipairs(list) do
local isAuto = (autoEntry ~= nil and PI.IsSameSavedSkin(autoEntry, entry)) local row = New("Frame", {
Name = "SavedSkinRow_" .. tostring(idx), Size = UDim2.new(1, -8, 0, 22), Position = UDim2.new(0, 4, 0, (idx - 1) * 24 + 2),
BackgroundColor3 = isAuto and C.SURFACE3 or C.SURFACE, BackgroundTransparency = isAuto and 0.15 or 0.35,
BorderSizePixel = 0, ZIndex = 8, }, savedSkinsList) Corner(row, UDim.new(0, 5))
if isAuto then Stroke(row, C.GREEN, 1) end local labelTxt = tostring(entry.label or ("@" .. tostring(entry.name or entry.id)))
if isAuto then labelTxt = "⚡ [ĐANG ĐẶT TỰ DÙNG] " .. labelTxt end New("TextLabel", {
Size = UDim2.new(1, -152, 1, 0), Position = UDim2.new(0, 6, 0, 0), BackgroundTransparency = 1,
TextColor3 = isAuto and C.GREEN or C.DARK, Font = isAuto and Enum.Font.GothamBold or Enum.Font.GothamMedium,
TextSize = 8, TextXAlignment = Enum.TextXAlignment.Left, TextYAlignment = Enum.TextYAlignment.Center,
TextWrapped = false, Text = clipText(labelTxt, 50), ZIndex = 9, }, row) local useBtn = New("TextButton", {
Name = "UseSavedSkinBtn_" .. tostring(idx), Size = UDim2.new(0, 46, 0, 16), Position = UDim2.new(1, -144, 0, 3),
Text = "▶ Mặc", BackgroundColor3 = C.GREEN, TextColor3 = D.BestText(C.GREEN),
BorderSizePixel = 0, Font = Enum.Font.GothamBold, TextSize = 7, ZIndex = 10, }, row) Corner(useBtn, UDim.new(0, 4)) D.Tactile(useBtn, 0.08)
local autoUseRowBtn = New("TextButton", { Name = "AutoUseSavedSkinBtn_" .. tostring(idx),
Size = UDim2.new(0, 64, 0, 16), Position = UDim2.new(1, -94, 0, 3), Text = isAuto and "⚡ Đang Dùng" or "⚡ Tự Dùng",
BackgroundColor3 = isAuto and C.GREEN or C.YELLOW, TextColor3 = D.BestText(isAuto and C.GREEN or C.YELLOW),
BorderSizePixel = 0, Font = Enum.Font.GothamBold, TextSize = 7, ZIndex = 10, }, row)
Corner(autoUseRowBtn, UDim.new(0, 4)) D.Tactile(autoUseRowBtn, 0.08) local delRowBtn = New("TextButton", {
Name = "DeleteSavedSkinBtn_" .. tostring(idx), Size = UDim2.new(0, 24, 0, 16), Position = UDim2.new(1, -26, 0, 3),
Text = "✕", BackgroundColor3 = C.RED, TextColor3 = D.BestText(C.RED),
BorderSizePixel = 0, Font = Enum.Font.GothamBold, TextSize = 7, ZIndex = 10, }, row) Corner(delRowBtn, UDim.new(0, 4)) D.Tactile(delRowBtn, 0.08)
useBtn.Activated:Connect(function() ReleaseHubFocus()
local ok, msg = PI.ApplySavedSkinEntry(entry, "local") refreshSkinButtons()
renderSavedSkinsList() setScStatus((ok and "✅ Đã mặc skin đã lưu: " or "⚠️ ") .. tostring(msg), ok and C.GREEN or C.RED)
setStatus((ok and "✅ Đã mặc skin đã lưu: @" .. tostring(entry.name or entry.id) or "⚠️ " .. tostring(msg)), ok and C.GREEN or C.RED) end)
autoUseRowBtn.Activated:Connect(function() ReleaseHubFocus()
local ok, msg = PI.SetEntryAsAutoUse(entry, true) refreshSkinButtons()
renderSavedSkinsList() setScStatus((ok and "⚡ " or "⚠️ ") .. tostring(msg), ok and C.GREEN or C.RED)
setStatus((ok and "⚡ " or "⚠️ ") .. tostring(msg), ok and C.GREEN or C.RED) end)
delRowBtn.Activated:Connect(function() ReleaseHubFocus()
local ok, msg = PI.DeleteSavedSkin(idx) refreshSkinButtons()
renderSavedSkinsList() setScStatus((ok and "🗑️ " or "⚠️ ") .. tostring(msg), ok and C.YELLOW or C.RED)
end) end
end PI.RefreshSavedSkinsUI = renderSavedSkinsList
saveSkinBtn.Activated:Connect(function() ReleaseHubFocus()
triggerFromSkinPanel(function(rec) local ok, msg = PI.SaveSkin(rec, "local")
refreshSkinButtons() renderSavedSkinsList()
setScStatus((ok and "💾 " or "⚠️ ") .. tostring(msg), ok and C.GREEN or C.RED)
setStatus((ok and "💾 " or "⚠️ ") .. tostring(msg), ok and C.GREEN or C.RED) end)
end) saveUseSkinBtn.Activated:Connect(function()
ReleaseHubFocus() triggerFromSkinPanel(function(rec)
local ok, msg = PI.SaveSkinForAutoUse(rec, "local", true) refreshSkinButtons()
renderSavedSkinsList() setScStatus((ok and "⚡ " or "⚠️ ") .. tostring(msg), ok and C.GREEN or C.RED)
setStatus((ok and "⚡ " or "⚠️ ") .. tostring(msg), ok and C.GREEN or C.RED) end)
end) clearUseSkinBtn.Activated:Connect(function()
ReleaseHubFocus() local ok, msg = PI.ClearAutoUseSkin()
refreshSkinButtons() renderSavedSkinsList()
setScStatus("🚫 " .. tostring(msg), C.YELLOW) setStatus("🚫 " .. tostring(msg), C.YELLOW)
end) renderSkinList(nil)
renderSavedSkinsList() end)()
pcall(function() if D.playerTab then D.playerTab.CanvasSize = UDim2.new(0, 0, 0, (D.playerY or 600) + 16) end
end) if type(PI.autoUseSkin) == "table" and tonumber(PI.autoUseSkin.id) then
pcall(PI.AutoApplySavedUseSkin) end
end)()
_G.BananaCatHub_ObjTrack = S.ObjTrack
do
local setTab = AddTab("Thiết Lập", "⚙️", 6)
local sy = 8 local function card(title, h) local f = New("Frame", {
Size = UDim2.new(1, -16, 0, h), Position = UDim2.new(0, 8, 0, sy), BackgroundColor3 = C.SURFACE, BackgroundTransparency = 0.08,
BorderSizePixel = 0, ZIndex = 6, }, setTab) Corner(f, UDim.new(0, 10)) Stroke(f, C.HAIRLINE, 0.18) New("TextLabel", {
Size = UDim2.new(1, -16, 0, 16), Position = UDim2.new(0, 8, 0, 6), Text = title, BackgroundTransparency = 1, TextColor3 = C.ACCENT,
Font = Enum.Font.GothamBold, TextSize = 10, TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, f) sy = sy + h + 8
return f end local function line(parent, text, y, color, h)
return New("TextLabel", { Size = UDim2.new(1, -16, 0, h or 12), Position = UDim2.new(0, 8, 0, y),
Text = text, BackgroundTransparency = 1, TextColor3 = color or C.MUTED, Font = Enum.Font.Gotham, TextSize = 9, TextWrapped = true,
TextXAlignment = Enum.TextXAlignment.Left, ZIndex = 7, }, parent)
end local function act(parent, text, x, y, w, color) local b = New("TextButton", {
Size = UDim2.new(0, w, 0, 18), Position = UDim2.new(0, x, 0, y), Text = text, BackgroundColor3 = color or C.SURFACE3, BackgroundTransparency = 0.08,
TextColor3 = D.BestText(color or C.SURFACE3), Font = Enum.Font.GothamBold, TextSize = 8, BorderSizePixel = 0, ZIndex = 8,
}, parent) Corner(b, UDim.new(0, 5)) Stroke(b, D.Edge(color or C.SURFACE3), 0.22) return b end
local c1 = card("💾  LƯU TRỮ — dữ liệu của bạn đang nằm ở đâu?", 82) local stTitle = line(c1, "", 24, C.GRAY, 12)
local stBody  = line(c1, "", 38, C.MUTED, 26) local saveNow = act(c1, "💾 Lưu ngay", 8, 56, 78, C.GREEN)
local reload  = act(c1, "🔄 Đọc lại từ đĩa", 92, 56, 98) local function refreshStorage() local ns, nw, nf = #scripts, #waypoints, #featureTabs
local canDisk = Store.canWrite() stTitle.TextColor3 = canDisk and C.GREEN or C.YELLOW if canDisk then stTitle.Text = "✅  ĐANG GHI XUỐNG ĐĨA THẬT"
stBody.Text = string.format( "File: %s\n%d script · %d waypoint · %d tab tính năng — sống qua cả lần rejoin.",
tostring(Store.SAVE_FILE), ns, nw, nf) else
stTitle.Text = "⚠️  CHỈ GIỮ TRONG RAM CỦA PHIÊN CHƠI NÀY" stBody.Text = string.format( "Executor không có writefile thật (hub đã bù bằng ổ đĩa ảo).\n%d script · %d WP · %d tab — REJOIN LÀ MẤT. Hãy bấm 📤 Xuất để sao lưu.",
ns, nw, nf) end end refreshStorage()
saveNow.Activated:Connect(function() local ok = Store.save() refreshStorage() flash(saveNow, ok and "✅ Đã lưu" or "❌ Lỗi", 1.4)
end) reload.Activated:Connect(function() pcall(function() if S.DoReload then S.DoReload() end end) refreshStorage() end)
local c2 = card("📤  SAO LƯU & CHUYỂN MÁY", 132) line(c2, "Xuất toàn bộ dữ liệu ra clipboard để dán sang máy/executor khác, hoặc nhập lại chuỗi đã lưu. Nhập là GHÉP theo tên — không ghi đè cái đang có.", 24, C.MUTED, 24)
local expBtn = act(c2, "📤 Xuất ra clipboard", 8, 50, 110, C.BLUE) local paste = New("TextBox", {
Size = UDim2.new(1, -16, 0, 44), Position = UDim2.new(0, 8, 0, 74), PlaceholderText = "Dán JSON đã xuất vào đây rồi bấm 📥 Nhập…", Text = "", BackgroundColor3 = C.SURFACE2, BackgroundTransparency = 0.06,
TextColor3 = C.DARK, PlaceholderColor3 = C.GRAY, Font = Enum.Font.Code, TextSize = 9, TextWrapped = true, TextXAlignment = Enum.TextXAlignment.Left,
TextYAlignment = Enum.TextYAlignment.Top, ClearTextOnFocus = false, ZIndex = 7, }, c2)
Corner(paste, UDim.new(0, 7)) Stroke(paste, C.HAIRLINE, 0.2) local impBtn = act(c2, "📥 Nhập", 124, 50, 56, C.GREEN)
expBtn.Activated:Connect(function() local ok, json = pcall(function() return HttpService:JSONEncode(Store.serialize()) end)
if not ok or type(json) ~= "string" then flash(expBtn, "❌ Lỗi JSON", 1.6) return end local done = S.CopyToClipboard(json)
if not done then paste.Text = json flash(expBtn, "⚠️ Đã dán vào ô", 1.8) else
flash(expBtn, "✅ Đã copy", 1.8) end end) impBtn.Activated:Connect(function() local txt = paste.Text
if type(txt) ~= "string" or #txt < 2 then flash(impBtn, "⚠️ Trống", 1.6); return
end local ok, data = pcall(function() return HttpService:JSONDecode(txt) end) local hasPayload = ok and type(data) == "table" and (
type(data.scripts) == "table" or type(data.waypoints) == "table" or type(data.features) == "table" or type(data.settings) == "table")
if not hasPayload then flash(impBtn, "❌ JSON sai", 1.8); return end
local function uniqueName(base, used, fallback) local nm = tostring(base or "") if nm == "" then nm = fallback end if not used[nm] then
used[nm] = true return nm end local root, k = nm, 2
repeat nm = root .. " (" .. k .. ")"
k = k + (1)  until not used[nm]
used[nm] = true return nm end local haveScripts, addedScripts = {}, 0 for _, s in ipairs(scripts) do haveScripts[tostring(s.name)] = true end
for _, s in ipairs(data.scripts or {}) do if type(s) == "table" and type(s.code) == "string" and #s.code > 0 then
local nm = uniqueName(s.name, haveScripts, "Script " .. (#scripts + 1)) scripts[#scripts + 1] = { name = nm, code = S.SanitizeCode(s.code),
expanded = (s.expanded == true), }
addedScripts = addedScripts + (1)  end end
local haveWaypoints, addedWaypoints = {}, 0 for _, w in ipairs(waypoints) do haveWaypoints[tostring(w.name)] = true end
for _, w in ipairs(data.waypoints or {}) do if type(w) == "table" and Store.isFinite(w.x) and Store.isFinite(w.y) and Store.isFinite(w.z) then
local nm = uniqueName(w.name, haveWaypoints, "WP " .. (#waypoints + 1)) waypoints[#waypoints + 1] = { name = nm,
pos = Vector3.new(w.x, w.y, w.z), }
addedWaypoints = addedWaypoints + (1)  end end
local haveFeatures, addedFeatures = {}, 0 for _, f in ipairs(featureTabs) do haveFeatures[tostring(f.name)] = true end
for _, f in ipairs(data.features or {}) do if type(f) == "table" and type(f.code) == "string" and #f.code > 0 then
local nm = uniqueName(f.name, haveFeatures, "Tính Năng " .. (#featureTabs + 1)) local ic = tostring(f.icon or "⚙️")
CreateFeatureTab(nm, ic, S.SanitizeCode(f.code)) addedFeatures = addedFeatures + (1)
end end if type(data.savedSkins) == "table" then
Store.savedSkins = Store.savedSkins or {} for _, sk in ipairs(data.savedSkins) do
if type(sk) == "table" and (tonumber(sk.id) or (type(sk.name) == "string" and #sk.name > 0)) then Store.savedSkins[#Store.savedSkins + 1] = sk
end end
end
if type(data.autoUseSkin) == "table" and (tonumber(data.autoUseSkin.id) or (type(data.autoUseSkin.name) == "string" and #data.autoUseSkin.name > 0)) then
Store.autoUseSkin = data.autoUseSkin end
if type(data.savedObjTracks) == "table" then
Store.savedObjTracks = Store.savedObjTracks or {} for _, ot in ipairs(data.savedObjTracks) do
if type(ot) == "table" and ((type(ot.query) == "string" and #ot.query > 0) or (type(ot.entries) == "table" and #ot.entries > 0) or (type(ot.title) == "string" and #ot.title > 0)) then
Store.savedObjTracks[#Store.savedObjTracks + 1] = ot end end end
if type(data.settings) == "table" then if type(data.settings.embedEnabled) == "boolean" then S.embedEnabled = data.settings.embedEnabled end
if type(data.settings.embedGuessNew) == "boolean" then S.embedGuessNew = data.settings.embedGuessNew
end if type(data.settings.parkCodeGuis) == "boolean" then S.parkCodeGuis = data.settings.parkCodeGuis end
if type(data.settings.hubFavs) == "table" then S.hubFavs = S.hubFavs or {}
for _, nm in ipairs(data.settings.hubFavs) do if tostring(nm) ~= "" then S.hubFavs[tostring(nm)] = true end end end end
pcall(function() RebuildScripts() end) pcall(function() RebuildWaypoints() end)
pcall(function() RebuildFeatureList() end) pcall(function() if S.SyncEmbedToggles then S.SyncEmbedToggles() end end)
pcall(function() if Store.restoreSkins then Store.restoreSkins() end end) pcall(function() if Store.restoreObjTracks then Store.restoreObjTracks() end end) if not S.embedEnabled then for _, ft in ipairs(featureTabs) do
local hostFrame = ft.frame and ft.frame:FindFirstChild("ScriptHost") if hostFrame then S.ClearEmbedsUnder(hostFrame) end
end pcall(S.RemoveAllParked) pcall(S.PruneEmbeds) end
refreshStorage() Store.saveSoon()
paste.Text = "" flash(impBtn, string.format("✅ +%d script · +%d WP · +%d tab", addedScripts, addedWaypoints, addedFeatures), 2.4) end)
local c3 = card("🖥  MÔI TRƯỜNG EXECUTOR", 74) local envTitle = line(c3, "", 24, C.DARK, 12)
local envBody  = line(c3, "", 38, C.MUTED, 26) pcall(function() local nm, ver = "không rõ", "" if identifyexecutor then
local a, b = identifyexecutor() nm = tostring(a or "không rõ"); ver = tostring(b or "")
end envTitle.Text = "Executor: " .. nm .. (ver ~= "" and ("  ·  " .. ver) or "") local miss = {}
for _, k in ipairs({"writefile", "readfile", "setclipboard", "gethui", "hookfunction", "Drawing", "request", "queue_on_teleport"}) do if not S.HasGlobal(k) then miss[#miss + 1] = k end
end if #miss == 0 then
envBody.Text = "✅ Executor đủ mọi hàm hub cần — không phải bù gì." envBody.TextColor3 = C.GREEN
else envBody.Text = "Hub đã tự bù " .. #miss .. " hàm còn thiếu: " .. table.concat(miss, ", ")
envBody.TextColor3 = C.YELLOW end end)
local c4 = card("⚠️  VÙNG NGUY HIỂM", 64) line(c4, "Xoá sạch script đã lưu, waypoint và tab tính năng. Không hoàn tác được.", 24, C.MUTED, 14)
local clearBtn = act(c4, "🗑 Xoá sạch dữ liệu", 8, 40, 112, C.RED) local armed = false
clearBtn.Activated:Connect(function() if not armed then
armed = true clearBtn.Text = "⚠️ Bấm lần nữa để XÁC NHẬN"
task.delay(4, function() armed = false
if clearBtn and clearBtn.Parent then clearBtn.Text = "🗑 Xoá sạch dữ liệu" end end)
return end
armed = false for i = #scripts, 1, -1 do scripts[i] = nil end
for i = #waypoints, 1, -1 do waypoints[i] = nil end pcall(function() RebuildScripts() end)
pcall(function() if Store.restoreWaypoints then Store.restoreWaypoints() end end) Store.save()
refreshStorage() flash(clearBtn, "✅ Đã xoá", 1.6) end)
setTab.CanvasSize = UDim2.new(0, 0, 0, sy + 8) S.settingsTab = setTab
S.settingsBtns = {save = saveNow, reload = reload, export = expBtn, import = impBtn, paste = paste, clear = clearBtn, statusTitle = stTitle, statusBody = stBody,
envTitle = envTitle, envBody = envBody, cardStorage = c1, cardEnv = c3}
S.refreshStorageCard = refreshStorage
end
local function ToggleMainFrame() main.Visible = not main.Visible
togBtn.Text = main.Visible and "✕" or ""
if not main.Visible then ReleaseHubFocus() end
if main.Visible then pcall(function()
if D.openTween then D.openTween:Cancel() end local ts, tp = main.Size, main.Position
main.Size = UDim2.new(ts.X.Scale, math.max(160, ts.X.Offset - 24), ts.Y.Scale, math.max(110, ts.Y.Offset - 16))
main.Position = UDim2.new(tp.X.Scale, tp.X.Offset + 12, tp.Y.Scale, tp.Y.Offset + 8) D.openTween = TweenService:Create(main,
TweenInfo.new(0.2, Enum.EasingStyle.Quint, Enum.EasingDirection.Out), {Size = ts, Position = tp})
D.openTween:Play() D.openTween.Completed:Connect(function() D.openTween = nil
pcall(BcFit)
end) end)
end
pcall(function() if S.PagePerf and S.PagePerf.OnMainVisibilityChanged then S.PagePerf.OnMainVisibilityChanged() end end)
end
closeBtn.Activated:Connect(function() pcall(function() if D.openTween then D.openTween:Cancel() D.openTween = nil end end)
main.Visible = false togBtn.Text = ""
ReleaseHubFocus()
pcall(function() if S.PagePerf and S.PagePerf.OnMainVisibilityChanged then S.PagePerf.OnMainVisibilityChanged() end end)
end)
dragLockBtn.Activated:Connect(function() S.dragMenu = not S.dragMenu
if S.dragMenu then dragLockBtn.Text = "🔓"
dragLockBtn.TextColor3 = C.ACCENT
else dragLockBtn.Text = "🔒"
dragLockBtn.TextColor3 = C.MUTED end
end)
trackConn(titleBar.InputBegan:Connect(function(i) if S.dragMenu and (i.UserInputType==Enum.UserInputType.MouseButton1 or i.UserInputType==Enum.UserInputType.Touch) then
pcall(function() if D.openTween then D.openTween:Cancel() D.openTween = nil end end)
S.dragging=true S.dragStart=i.Position
S.startPos=main.Position end
end))
trackConn(UserInputService.InputChanged:Connect(function(i) if S.dragging and S.startPos and S.dragStart and (i.UserInputType==Enum.UserInputType.MouseMovement or i.UserInputType==Enum.UserInputType.Touch) then
local d=i.Position-S.dragStart main.Position=UDim2.new(S.startPos.X.Scale, S.startPos.X.Offset+d.X, S.startPos.Y.Scale, S.startPos.Y.Offset+d.Y)
end end))
trackConn(UserInputService.InputEnded:Connect(function(i) if i.UserInputType==Enum.UserInputType.MouseButton1 or i.UserInputType==Enum.UserInputType.Touch then
S.dragging=false end
end))
trackConn(togBtn.InputBegan:Connect(function(i) if i.UserInputType == Enum.UserInputType.MouseButton1 or i.UserInputType == Enum.UserInputType.Touch then
if S.dragMenu then S.togDragging = true
S.togDragStart = i.Position S.togStartPos = togBtn.Position
S.togMoved = false end
end end))
trackConn(UserInputService.InputChanged:Connect(function(i) if S.togDragging and S.dragMenu and (i.UserInputType == Enum.UserInputType.MouseMovement or i.UserInputType == Enum.UserInputType.Touch) then
local delta = i.Position - S.togDragStart if delta.Magnitude > 5 then
S.togMoved = true end if S.togMoved then
togBtn.Position = UDim2.new( S.togStartPos.X.Scale, S.togStartPos.X.Offset + delta.X,
S.togStartPos.Y.Scale, S.togStartPos.Y.Offset + delta.Y )
end end end))
trackConn(UserInputService.InputEnded:Connect(function(i) if i.UserInputType == Enum.UserInputType.MouseButton1 or i.UserInputType == Enum.UserInputType.Touch then
if S.togDragging then S.togDragging = false
if not S.togMoved then ToggleMainFrame()
end end
end end))
togBtn.Activated:Connect(function() if not S.dragMenu then
ToggleMainFrame() end
end)
trackConn(UserInputService.InputBegan:Connect(function(i, gp) if not gp and i.KeyCode == Enum.KeyCode.RightControl then
ToggleMainFrame() end
end))
main.Visible = true togBtn.Text = "✕"
print(string.format( "✅ taodepzai v5.0 NOIR — sẵn sàng! Đã nạp lại %d script + %d waypoint + %d tab tính năng từ bộ nhớ (chế độ: %s%s)",
Store.loadedScripts, Store.loadedWp, #Store.loadedFeatures, Store.mode, Store.lastError and (" | ⚠️ " .. Store.lastError) or ""
)) print("   💾 File lưu: " .. Store.SAVE_FILE .. " (trong thư mục workspace của executor — sống qua cả lần rejoin)")
print("   Tính năng: Code + Code Đã Lưu + Script Hub + Hỗ Trợ (POS+SIZE+ROT+LOOK+VẬT THỂ+HIGHLIGHT TÍM) + Thiết Lập + Tạo Tính Năng") print("   🆕 v5.0: Di chuyển — 🚀/🛡 bay · 🧱 noclip · 🦘 nhảy · 💨 sprint · 👥 định vị/spectator · ✨ glow · 💾 lưu script/waypoint/tab")