'use strict';
const fs = require('fs');
const path = require('path');
const { createRuntime } = require('../lib/runtime');
const source = fs.readFileSync(path.join(__dirname, '../../standalone/NonInvasiveMobile.client.luau'), 'utf8');
function setup() {
  const h = createRuntime({}, { bundle: false });
  h.eval(`
    local player = game:GetService("Players").LocalPlayer
    local pg = player:FindFirstChild("PlayerGui") or Instance.new("PlayerGui")
    pg.Name = "PlayerGui"
    pg.Parent = player
    _G.pg = pg
  `);
  h.eval(source);
  return h;
}
const progress = 'return pg:FindFirstChild("NonInvasiveMobileNotice"):FindFirstChild("Panel"):FindFirstChild("Progress").Text';
module.exports = (suite) => {
  suite.test('bắt đầu 1%, cố định góc phải, nền trong suốt và viền cầu vồng', (_, A) => {
    const h = setup();
    A.equal(h.eval(progress)[0], '1%');
    A.equal(h.eval(`
      local panel = pg:FindFirstChild("NonInvasiveMobileNotice"):FindFirstChild("Panel")
      assert(panel.Position.X.Scale == 0 and panel.Position.Y.Scale == 1)
      assert(panel.Size.Y.Offset == 84)
      assert(panel:FindFirstChildOfClass("UISizeConstraint").MaxSize.X == 220)
      assert(panel.AnchorPoint.X == 1 and panel.AnchorPoint.Y == 1)
      assert(panel.Active == false and panel.Selectable == false)
      assert(panel.BackgroundTransparency == 0.3)
      assert(panel:FindFirstChildOfClass("UIStroke"):FindFirstChildOfClass("UIGradient"))
      return true
    `)[0], true);
  });
  suite.test('trượt vào trái → phải, đứng yên, trượt ra phải → trái', (_, A) => {
    const h = setup();
    const x = 'return pg:FindFirstChild("NonInvasiveMobileNotice"):FindFirstChild("Panel").Position.X.Scale';
    h.advance(0.2);
    const entering = h.eval(x)[0];
    A.equal(entering > 0 && entering < 1, true);
    h.advance(0.3);
    A.equal(h.eval(x)[0], 1);
    h.advance(29.1);
    A.equal(h.eval(x)[0], 1);
    h.advance(0.2);
    const leaving = h.eval(x)[0];
    A.equal(leaving > 0 && leaving < 1, true);
    h.advance(0.1);
    A.equal(h.eval(x)[0] < leaving, true);
    h.advance(0.2);
    A.equal(h.eval('return pg:FindFirstChild("NonInvasiveMobileNotice") == nil')[0], true);
  });
  suite.test('tiến độ giữa chừng, 100% ở giây 25, xoá ở giây 30', (_, A) => {
    const h = setup();
    h.advance(12.5);
    A.equal(h.eval(progress)[0], '50%');
    h.advance(12.6);
    A.equal(h.eval(progress)[0], '100%');
    h.advance(4.7);
    A.equal(h.eval(progress)[0], '100%');
    h.advance(0.3);
    A.equal(h.eval('return pg:FindFirstChild("NonInvasiveMobileNotice") == nil')[0], true);
    h.advance(5);
  });
  suite.test('chạy trùng không nhân đôi GUI; GUI game không bị sửa', (_, A) => {
    const h = setup();
    h.eval('local other = Instance.new("ScreenGui"); other.Name = "GameHUD"; other.Parent = pg');
    h.eval(source);
    A.equal(h.eval('return #pg:GetChildren()')[0], 2);
    h.advance(31);
    A.equal(h.eval('return #pg:GetChildren() == 1 and pg:FindFirstChild("GameHUD") ~= nil')[0], true);
  });
  suite.test('xoá GUI sớm không gây lỗi callback', (_, A) => {
    const h = setup();
    h.eval('pg:FindFirstChild("NonInvasiveMobileNotice"):Destroy()');
    h.advance(31);
    A.equal(h.eval('return #pg:GetChildren()')[0], 0);
  });
};
