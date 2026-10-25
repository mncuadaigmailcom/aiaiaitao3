'use strict';
/**
 * Regression coverage for the legacy Support > center-aim scan in script.js.
 * Runs the exact S.PickByRayScan function with small Lua stand-ins for Roblox
 * vectors/parts; it does not claim to emulate the Roblox engine.
 */
const fs = require('fs');
const path = require('path');
const { LuaRuntime } = require('../../tools/test-harness/lua-runtime');

const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'script.js'), 'utf8');
const start = source.indexOf('function S.PickByRayScan(ray, filterList)');
const end = source.indexOf('function S.NearestParts(n)', start);
if (start < 0 || end < 0) throw new Error('S.PickByRayScan missing from script.js');
const pickByRayScan = source.slice(start, end);

const mocks = `
local Vector = {}
Vector.__index = function(v, k)
  if k == 'Magnitude' then return math.sqrt(v.X*v.X + v.Y*v.Y + v.Z*v.Z) end
  return Vector[k]
end
Vector.__add = function(a,b) return setmetatable({X=a.X+b.X,Y=a.Y+b.Y,Z=a.Z+b.Z}, Vector) end
Vector.__sub = function(a,b) return setmetatable({X=a.X-b.X,Y=a.Y-b.Y,Z=a.Z-b.Z}, Vector) end
Vector.__mul = function(a,b)
  if type(a) == 'number' then a,b=b,a end
  return setmetatable({X=a.X*b,Y=a.Y*b,Z=a.Z*b}, Vector)
end
Vector.__div = function(a,b) return setmetatable({X=a.X/b,Y=a.Y/b,Z=a.Z/b}, Vector) end
function Vector:Dot(b) return self.X*b.X + self.Y*b.Y + self.Z*b.Z end
Vector3 = {new=function(x,y,z) return setmetatable({X=x,Y=y,Z=z}, Vector) end}
math.clamp = function(x, lo, hi) return math.max(lo, math.min(hi, x)) end
Enum = {RaycastFilterType={Exclude='Exclude'}}
OverlapParams = {new=function() return {} end}
CFrame = {lookAt=function() return {} end}
local hidden
hidden = {
  Name='PassThroughTrigger', CanQuery=false,
  Position=Vector3.new(10,0,0), Size=Vector3.new(2,2,2),
  CFrame={
    PointToObjectSpace=function(_,v) return v - hidden.Position end,
    VectorToObjectSpace=function(_,v) return v end,
  },
  IsA=function(_, name) return name == 'BasePart' end,
  IsDescendantOf=function(self, root) return self.Parent == root end,
}
workspace = {
  GetPartBoundsInBox=function() return {} end,
  GetDescendants=function() return {hidden} end,
}
S = {AnaCfg={maxDist=100}}
${pickByRayScan}
`;

function evaluate(luaTail) {
  const runtime = new LuaRuntime();
  return runtime.run(mocks + luaTail, 'script.js-center-aim-regression')[0];
}

module.exports = function anaAimSuite(suite) {
  suite.test('center aim finds an intersected CanQuery=false pass-through part', (_t, A) => {
    const result = evaluate(`
      local hit, why, hiddenHit, hiddenDistance = S.PickByRayScan(
        {Origin=Vector3.new(0,0,0), Direction=Vector3.new(1,0,0)}, {})
      hidden.Position = Vector3.new(10,20,0)
      local offRay = S.PickByRayScan(
        {Origin=Vector3.new(0,0,0), Direction=Vector3.new(1,0,0)}, {})
      return (hit and hit.Name or 'nil') .. '|' .. tostring(offRay == nil)
        .. '|' .. (hiddenHit and hiddenHit.Name or 'nil') .. '|' .. tostring(hiddenDistance)
    `);
    A.equal(result, 'PassThroughTrigger|true|PassThroughTrigger|9.0',
      'must find the hidden trigger, report its entry distance, and reject one off-ray');
  });

  suite.test('center aim still excludes the local character from hidden-part scan', (_t, A) => {
    const result = evaluate(`
      local character = {}
      hidden.Parent = character
      local hit = S.PickByRayScan(
        {Origin=Vector3.new(0,0,0), Direction=Vector3.new(1,0,0)}, {character})
      return tostring(hit)
    `);
    A.equal(result, 'nil', 'parts descending from excluded character must not be returned');
  });
};
