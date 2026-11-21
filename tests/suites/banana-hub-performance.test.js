'use strict';

// Kiểm tra các đoạn lấy trực tiếp từ script.js; đây không phải mô phỏng toàn bộ Roblox.
const fs = require('fs');
const path = require('path');
const { createRuntime } = require('../lib/runtime');
const source = fs.readFileSync(path.join(__dirname, '../../script.js'), 'utf8');
function section(start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw new Error(`Không tìm thấy đoạn ${start}`);
  return source.slice(a, b);
}

module.exports = function (suite) {
  suite.test('script.js phân tích được cú pháp Lua', (t, A) => {
    const fengari = require('fengari');
    const L = fengari.lauxlib.luaL_newstate();
    const bytes = fengari.to_luastring(source);
    const status = fengari.lauxlib.luaL_loadbuffer(L, bytes, bytes.length, fengari.to_luastring('script.js'));
    const error = status === fengari.lua.LUA_OK ? '' : fengari.lua.lua_tojsstring(L, -1);
    A.equal(status, fengari.lua.LUA_OK, error);
  });

  suite.test('Font giao diện dùng SourceSans, chữ đậm và font code vẫn được phân biệt', (t, A) => {
    const h = createRuntime({}, { bundle: false });
    const fontFunction = section('local function LightweightFont', 'local function New(cls');
    const out = h.eval(`
      local Enum = {Font = {Code='Code', GothamBold='Bold', GothamBlack='Black', GothamSemibold='Semi',
        GothamMedium='Medium', SourceSans='SourceSans', SourceSansBold='SourceSansBold'}}
      ${fontFunction}
      return table.concat({LightweightFont(Enum.Font.GothamBold), LightweightFont(Enum.Font.GothamBlack),
        LightweightFont(Enum.Font.GothamSemibold), LightweightFont(Enum.Font.GothamMedium),
        LightweightFont(Enum.Font.Code), LightweightFont(nil)}, '|')
    `)[0];
    A.equal(out, 'SourceSansBold|SourceSansBold|SourceSansBold|SourceSans|Code|SourceSans');
  });

  suite.test('Hub Perf chỉ ghi khi cần, vẫn lưu và khôi phục giá trị ban đầu', (t, A) => {
    const h = createRuntime({}, { bundle: false });
    const functions = section('function Perf.RestoreProperty', 'function Perf.IsVisualEffect');
    const out = h.eval(`
      local Perf = {Saved = {}}
      ${functions}
      local state, writes = {Value = 10}, 0
      local obj = setmetatable({}, {__index = state, __newindex = function(_, k, v) writes = writes + 1; state[k] = v end})
      Perf.Write(obj, 'Value', 10)
      Perf.Write(obj, 'Value', 10)
      local unchanged = writes
      Perf.Write(obj, 'Value', 20)
      state.Value = 30 -- game thay đổi giá trị sau đó
      Perf.Write(obj, 'Value', 20)
      Perf.Write(obj, 'Value', nil)
      return unchanged .. '|' .. writes .. '|' .. state.Value .. '|' .. tostring(Perf.Saved[obj] == nil)
    `)[0];
    A.equal(out, '0|3|10|true');
  });

  suite.test('Kiểm tra ghế nhanh tránh quét khi có weld, vẫn gọi đường dự phòng khi thiếu', (t, A) => {
    const h = createRuntime({}, { bundle: false });
    const code = section('local md = h.MoveDirection local moving', '\r\nend end\r\nend) end))');
    const out = h.eval(`
      local scans = 0
      local Enum = {HumanoidStateType = {GettingUp = 'GettingUp'}}
      local function findActiveSeatWeld() scans = scans + 1; return nil end
      local function check(h)
        local c = {}
        ${code}
      end
      local seat = {FindFirstChild = function() return {} end, FindFirstChildOfClass = function() return nil end}
      local h = {MoveDirection = {Magnitude = 1}, SeatPart = seat, Sit = true, ChangeState = function() end}
      check(h)
      local first = tostring(h.Sit) .. ':' .. scans
      h.SeatPart = nil; check(h)
      local second = tostring(h.Sit) .. ':' .. scans
      h.Sit = true; h.MoveDirection.Magnitude = 0; check(h)
      return first .. '|' .. second .. '|' .. tostring(h.Sit) .. ':' .. scans
    `)[0];
    A.equal(out, 'true:0|false:1|true:1');
  });
};
