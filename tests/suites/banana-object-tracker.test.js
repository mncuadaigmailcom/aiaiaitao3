'use strict';
const fs = require('fs');
const path = require('path');
const { createRuntime } = require('../lib/runtime');
const source = fs.readFileSync(path.join(__dirname, '../../script.js'), 'utf8');
function section(start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw new Error(`Không tìm thấy ${start}`);
  return source.slice(a, b);
}

module.exports = function (suite) {
  suite.test('Quét lại bắt đầu không quét toàn bộ đồng bộ, xoá hàng chờ cũ', (t, A) => {
    const h = createRuntime({}, { bundle: false });
    const fn = section('function OT.Rescan(force)', 'function OT.Step(dt)');
    const result = h.eval(`
      local OT = {on=true, keys={'tree'}, pathKeys={}, _found=3, _pending={'old'}, rescanEvery=1}
      local begin, bind, slices = 0, 0, 0
      function OT.ScanBegin() begin=begin+1; OT._passing=true end
      function OT.Bind() bind=bind+1 end
      function OT.ScanSlice() slices=slices+1 end
      ${fn}
      local n=OT.Rescan(true)
      return n .. '|' .. begin .. '|' .. bind .. '|' .. slices .. '|' .. #OT._pending .. '|' .. tostring(OT._passing)
    `)[0];
    A.equal(result, '3|1|1|0|0|true');
  });

  suite.test('Quét theo lát giới hạn số đối tượng và hoàn tất đủ cây', (t, A) => {
    const h = createRuntime({}, { bundle: false });
    const fn = section('function OT.ScanSlice(budget', 'function OT.ScanFinish()');
    const result = h.eval(`
      local a={Name='a', GetChildren=function() return {} end}
      local b={Name='b', GetChildren=function() return {} end}
      local workspace={GetChildren=function() return {a,b} end}
      local OT={_passing=true, _queue={workspace}, _qN=1, _scanned=0, scanBudget=1, scanSliceMs=10000}
      local hits=0
      function OT.Candidate() return true end
      function OT.Skip() return false end
      function OT.ScanHit() hits=hits+1 end
      function OT.ScanFinish() OT._passing=false end
      ${fn}
      local first=OT.ScanSlice(1, 10000)
      local afterFirst=OT._scanned
      OT.ScanSlice(1, 10000); OT.ScanSlice(1, 10000); OT.ScanSlice(1, 10000)
      return tostring(first)..'|'..afterFirst..'|'..OT._scanned..'|'..hits..'|'..tostring(OT._passing)
    `)[0];
    A.equal(result, 'false|0|2|2|false');
  });

  suite.test('Quét thủ công khi đang tắt vẫn chạy tới hết và tự ngắt cập nhật', (t, A) => {
    const h = createRuntime({}, { bundle: false });
    const rescan = section('function OT.Rescan(force)', 'function OT.Step(dt)');
    const step = section('function OT.Step(dt)', 'function OT.OnPerfTick()');
    const result = h.eval(`
      local OT={on=false, keys={'tree'}, pathKeys={}, _found=0, _pending={}, rescanEvery=1, scanIdle=2}
      local S,D={},{}
      local bound, slices = false, 0
      function tick() return 0 end
      function OT.Bind() bound=true end
      function OT.Unbind() bound=false end
      function OT.ScanBegin() OT._passing=true end
      function OT.ScanSlice() slices=slices+1; OT._passing=false; OT._pending={'result'} end
      function OT.DrainPending() OT._pending={} end
      function OT.Tick() end
      ${rescan}
      ${step}
      OT.Rescan(true); OT.Step(0.016)
      local first=tostring(bound)..':'..slices..':'..#OT._pending
      OT.Step(0.016)
      return first..'|'..tostring(bound)..':'..tostring(OT._manualScan)..':'..#OT._pending
    `)[0];
    A.equal(result, 'true:1:1|false:false:0');
  });

  suite.test('Danh sách cập nhật được nén khi vật bị xoá, tránh tăng vòng lặp vô hạn', (t, A) => {
    const h = createRuntime({}, { bundle: false });
    const fn = section('function OT.Kill(inst)', 'function OT.Clear()');
    const result = h.eval(`
      local a,b,c={},{},{}
      local OT={items={}, _order={a,b,c}, _orderN=3, _tickIdx=3}
      OT.items[a]={slot=1}; OT.items[b]={slot=2}; OT.items[c]={slot=3}
      ${fn}
      OT.Kill(b)
      return OT._orderN..'|'..tostring(OT._order[2]==c)..'|'..OT.items[c].slot..'|'..tostring(OT.items[b]==nil)..'|'..OT._tickIdx
    `)[0];
    A.equal(result, '2|true|2|true|0');
  });
};
