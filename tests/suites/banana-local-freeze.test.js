'use strict';
const fs = require('fs');
const path = require('path');
const { createRuntime } = require('../lib/runtime');
const source = fs.readFileSync(path.join(__dirname, '../../script.js'), 'utf8');
const start = source.indexOf('-- Local visual snapshot only:');
const end = source.indexOf('local panel = New("Frame", {Name = "HubLocalFreeze_Panel"', start);
if (start < 0 || end < 0) throw new Error('Không tìm thấy mã ngưng động cục bộ');
const core = source.slice(start, end) + '\nend\n';
const setup = `
  local S, D, C = {}, {}, {}
  local player = {Character=nil}
  local workspace = {children={}}
  function workspace:GetChildren() return self.children end
  local Instance = {}
  function Instance.new()
    local f = {destroyed=false}
    function f:Destroy() self.destroyed=true end
    return f
  end
  local pending
  local task = {spawn=function(fn) pending=fn end, wait=function() end}
  ${core}
  local F = S.LocalFreeze
  local function makePart()
    local clone
    local part = {Parent=workspace, Transparency=0, LocalTransparencyModifier=0.25}
    function part:IsA(c) return c=='BasePart' end
    function part:IsDescendantOf(v) return v==workspace end
    function part:GetChildren() return {} end
    function part:Clone()
      clone={children={}}
      function clone:GetDescendants() return self.children end
      function clone:Destroy() self.destroyed=true end
      return clone
    end
    function part:GetClone() return clone end
    return part
  end
`;
module.exports = function (suite) {
  suite.test('Ảnh chụp không thay đổi vật lý vật gốc và khôi phục độ trong khi tắt', (t, A) => {
    const h = createRuntime({}, {bundle:false});
    const out = h.eval(setup + `
      local part=makePart(); workspace.children={part}
      F.Start(); pending()
      local copy=part:GetClone()
      local before=F.count..'|'..part.LocalTransparencyModifier..'|'..tostring(part.Anchored)..'|'
        ..tostring(copy.Anchored)..'|'..tostring(copy.CanCollide)..'|'..tostring(copy.CanTouch)..'|'..tostring(copy.CanQuery)
      local folder=F.folder; F.Stop()
      return before..'|'..part.LocalTransparencyModifier..'|'..tostring(folder.destroyed)..'|'..tostring(F.on)
    `)[0];
    A.equal(out, '1|1|nil|true|false|false|false|0.25|true|false');
  });
  suite.test('Bản sao loại bỏ script, âm thanh và khớp nhưng giữ lớp hiển thị', (t, A) => {
    const h = createRuntime({}, {bundle:false});
    const out = h.eval(setup + `
      local part=makePart()
      local function child(kind)
        local c={kind=kind, destroyed=false}
        function c:IsA(name) return self.kind==name end
        function c:Destroy() self.destroyed=true end
        return c
      end
      local script, sound, joint, decal = child('Script'), child('Sound'), child('Weld'), child('Decal')
      function part:Clone()
        local c={}
        function c:GetDescendants() return {script,sound,joint,decal} end
        function c:Destroy() end
        return c
      end
      workspace.children={part}; F.Start(); pending()
      return tostring(script.destroyed)..'|'..tostring(sound.destroyed)..'|'..tostring(joint.destroyed)..'|'..tostring(decal.destroyed)
    `)[0];
    A.equal(out, 'true|true|true|false');
  });
  suite.test('Không ghi đè độ trong đã bị thay đổi bởi hệ thống khác', (t, A) => {
    const h = createRuntime({}, {bundle:false});
    const out = h.eval(setup + `
      local part=makePart(); workspace.children={part}; F.Start(); pending()
      part.LocalTransparencyModifier=0.7; F.Stop(); return part.LocalTransparencyModifier
    `)[0];
    A.equal(out, 0.7);
  });
  suite.test('Tắt trước khi tác vụ bắt đầu huỷ ảnh chụp và không ẩn vật', (t, A) => {
    const h = createRuntime({}, {bundle:false});
    const out = h.eval(setup + `
      local part=makePart(); workspace.children={part}; F.Start(); local folder=F.folder
      F.Stop(); pending(); return tostring(folder.destroyed)..'|'..part.LocalTransparencyModifier..'|'..F.count..'|'..tostring(F.on)
    `)[0];
    A.equal(out, 'true|0.25|0|false');
  });
  suite.test('Giới hạn ảnh chụp được tôn trọng và trạng thái báo đã đạt giới hạn', (t, A) => {
    const h = createRuntime({}, {bundle:false});
    const out = h.eval(setup + `
      F.maxParts=1; workspace.children={makePart(),makePart()}; F.Start(); pending()
      return F.count..'|'..tostring(F.capped)..'|'..tostring(F.scanning)
    `)[0];
    A.equal(out, '1|true|false');
  });
};
