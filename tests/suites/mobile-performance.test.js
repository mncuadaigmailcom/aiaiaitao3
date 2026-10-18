'use strict';
const fs = require('fs');
const path = require('path');
const { createRuntime } = require('../lib/runtime');
const source = fs.readFileSync(path.join(__dirname, '../../standalone/MobilePerformance.client.luau'), 'utf8');
function setup(mode = "graphics", showFps = true) {
  const h = createRuntime({}, { bundle: false });
  h.eval(`
    _G.pg = game:GetService("Players").LocalPlayer:WaitForChild("PlayerGui")
    _G.lighting = game:GetService("Lighting")
    lighting.GlobalShadows = true
    lighting.EnvironmentDiffuseScale = 0.7
    lighting.EnvironmentSpecularScale = 0.8
    _G.bloom = Instance.new("BloomEffect")
    bloom.Enabled = true
    bloom.Parent = lighting
    _G.blur = Instance.new("BlurEffect")
    blur.Enabled = false
    blur.Parent = lighting
    _G.part = Instance.new("Part")
    part.CanCollide = true
    part.Parent = game:GetService("Workspace")
  `);
  h.eval(source.replace('local MODE = "safe"', `local MODE = "${mode}"`).replace('local SHOW_FPS = true', `local SHOW_FPS = ${showFps}`));
  return h;
}
const controller = 'pg:FindFirstChild("MobilePerformanceController")';
const undo = `${controller}:FindFirstChild("Restore"):Fire()`;
module.exports = (suite) => {
  suite.test('tự bật đồ hoạ nhẹ, không sửa vật lý', (_, A) => {
    const h = setup();
    A.equal(h.eval(`return lighting.GlobalShadows == false and lighting.EnvironmentDiffuseScale == 0 and lighting.EnvironmentSpecularScale == 0 and bloom.Enabled == false and blur.Enabled == false and part.CanCollide == true`)[0], true);
  });
  suite.test('hiệu ứng thêm mới được giảm tải và hoàn tác', (_, A) => {
    const h = setup();
    h.eval('late = Instance.new("SunRaysEffect"); late.Enabled = true; late.Parent = lighting');
    A.equal(h.eval('return late.Enabled')[0], false);
    h.eval(undo);
    A.equal(h.eval('return late.Enabled and bloom.Enabled and not blur.Enabled and lighting.GlobalShadows and lighting.EnvironmentDiffuseScale == 0.7')[0], true);
    A.equal(h.eval(`return ${controller} == nil`)[0], true);
  });
  suite.test('giữ thay đổi mới của game khi hoàn tác và dừng theo dõi', (_, A) => {
    const h = setup();
    h.eval('lighting.EnvironmentDiffuseScale = 0.4');
    h.eval(undo);
    A.equal(h.eval('return lighting.EnvironmentDiffuseScale')[0], 0.4);
    h.eval('late = Instance.new("BlurEffect"); late.Enabled = true; late.Parent = lighting');
    A.equal(h.eval('return late.Enabled')[0], true);
    h.advance(31);
  });
  suite.test('chạy trùng không tạo controller thứ hai, menu tự xoá, vẫn hoàn tác được', (_, A) => {
    const h = setup();
    h.eval(source.replace('local MODE = "safe"', 'local MODE = "graphics"'));
    A.equal(h.eval('local n = 0; for _, v in ipairs(pg:GetChildren()) do if v.Name == "MobilePerformanceController" then n = n + 1 end end; return n')[0], 1);
    h.advance(31);
    A.equal(h.eval('return pg:FindFirstChild("MobilePerformanceNotice") == nil and lighting.GlobalShadows == false')[0], true);
    h.eval(undo);
    A.equal(h.eval('return lighting.GlobalShadows')[0], true);
  });
  suite.test('huỷ controller hoàn tác và có thể chạy lại', (_, A) => {
    const h = setup();
    h.eval(`${controller}:Destroy()`);
    A.equal(h.eval('return bloom.Enabled and lighting.GlobalShadows')[0], true);
    h.eval(source.replace('local MODE = "safe"', 'local MODE = "graphics"'));
    A.equal(h.eval('return not bloom.Enabled and not lighting.GlobalShadows')[0], true);
    h.advance(31);
  });
  suite.test('safe mặc định không ghi Lighting; hiệu ứng mới giữ nguyên', (_, A) => {
    const h = setup("safe");
    h.eval('late = Instance.new("BloomEffect"); late.Enabled = true; late.Parent = lighting');
    A.equal(h.eval('return lighting.GlobalShadows and lighting.EnvironmentDiffuseScale == 0.7 and lighting.EnvironmentSpecularScale == 0.8 and bloom.Enabled and late.Enabled and not blur.Enabled and part.CanCollide')[0], true);
    h.advance(31);
    A.equal(h.eval('return pg:FindFirstChild("MobilePerformanceController") == nil and pg:FindFirstChild("MobilePerformanceNotice") == nil and bloom.Enabled')[0], true);
  });
  suite.test('FPS cập nhật trong lúc hiện, menu nhỏ, tiến độ và trượt không mất', (_, A) => {
    const h = setup("safe");
    const panel = 'pg:FindFirstChild("MobilePerformanceNotice"):FindFirstChild("Panel")';
    A.equal(h.eval(`return ${panel}:FindFirstChild("Progress").Text`)[0], '1%');
    h.advance(1.1);
    A.equal(h.eval(`return string.find(${panel}:FindFirstChild("Disclaimer").Text, "FPS", 1, true) ~= nil`)[0], true);
    A.equal(h.eval(`return ${panel}.Position.X.Offset == -12 and ${panel}.Size.Y.Offset == 84 and not ${panel}.Active`)[0], true);
    h.advance(24);
    A.equal(h.eval(`return ${panel}:FindFirstChild("Progress").Text`)[0], '100%');
    h.advance(4.7);
    A.equal(h.eval(`return ${panel}.Position.X.Offset > -12`)[0], true);
    h.advance(0.3);
  });
  suite.test('tắt đo FPS và hoàn tác sớm không gây lỗi callback', (_, A) => {
    const h = setup("safe", false);
    A.equal(h.eval('return pg:FindFirstChild("MobilePerformanceNotice"):FindFirstChild("Panel"):FindFirstChild("Disclaimer").Text')[0], 'Không đổi đồ hoạ\nTiến trình không đo mức giảm lag');
    h.eval(undo);
    h.advance(31);
    A.equal(h.eval('return pg:FindFirstChild("MobilePerformanceNotice") == nil')[0], true);
  });
  suite.test('cấu hình sai dừng trước khi tạo GUI hoặc đổi đồ hoạ', (_, A) => {
    const h = setup("invalid");
    A.equal(h.eval('return lighting.GlobalShadows and bloom.Enabled and pg:FindFirstChild("MobilePerformanceController") == nil')[0], true);
  });

};
