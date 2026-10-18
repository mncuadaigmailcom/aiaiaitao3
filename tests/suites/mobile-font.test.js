'use strict';
const fs = require('fs');
const path = require('path');
const { createRuntime } = require('../lib/runtime');
const source = fs.readFileSync(path.join(__dirname, '../../standalone/MobilePerformance.client.luau'), 'utf8');
function setup(enabled) {
  const h = createRuntime({}, { bundle: false });
  // FontFace is represented by a stable table value in the mock, not rendered.
  h.eval(`
    Font = { fromEnum = function(_) return { Family = "SourceSans" } end }
    pg = game:GetService("Players").LocalPlayer:WaitForChild("PlayerGui")
    hud = Instance.new("ScreenGui"); hud.Name = "HUD"; hud.Parent = pg
    text = Instance.new("TextLabel"); text.Text = "Tiếng Việt"; text.TextSize = 18
    oldFont = { Family = "CustomFont" }; text.FontFace = oldFont; text.Parent = hud
    worldText = Instance.new("TextLabel"); worldText.FontFace = oldFont
    worldText.Parent = game:GetService("Workspace")
  `);
  h.eval(source.replace('local USE_SIMPLE_FONT = false', `local USE_SIMPLE_FONT = ${enabled}`));
  return h;
}
const undo = 'pg:FindFirstChild("MobilePerformanceController"):FindFirstChild("Restore"):Fire()';
module.exports = (suite) => {
  suite.test('mặc định giữ font và nội dung nguyên vẹn', (_, A) => {
    const h = setup(false);
    A.equal(h.eval('return text.FontFace == oldFont and text.Text == "Tiếng Việt" and text.TextSize == 18')[0], true);
  });
  suite.test('đổi chữ PlayerGui, giữ Workspace, hỗ trợ chữ thêm sau và hoàn tác custom font', (_, A) => {
    const h = setup(true);
    A.equal(h.eval('return text.FontFace.Family == "SourceSans" and worldText.FontFace == oldFont and text.TextSize == 18')[0], true);
    h.eval('late = Instance.new("TextBox"); late.FontFace = oldFont; late.Parent = hud');
    A.equal(h.eval('return late.FontFace.Family')[0], 'SourceSans');
    h.advance(31);
    h.eval(undo);
    A.equal(h.eval('return text.FontFace == oldFont and late.FontFace == oldFont')[0], true);
  });
  suite.test('hoàn tác không ghi đè font mới game chọn; không tiếp tục theo dõi', (_, A) => {
    const h = setup(true);
    h.eval('newFont = { Family = "GameChanged" }; text.FontFace = newFont');
    h.eval(undo);
    h.eval('late = Instance.new("TextButton"); late.FontFace = oldFont; late.Parent = hud');
    A.equal(h.eval('return text.FontFace == newFont and late.FontFace == oldFont')[0], true);
    h.advance(31);
  });
};
