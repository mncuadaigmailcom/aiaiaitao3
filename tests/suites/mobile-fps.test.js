'use strict';
const fs = require('fs');
const path = require('path');
const { createRuntime } = require('../lib/runtime');
const source = fs.readFileSync(path.join(__dirname, '../../standalone/MobileFpsPriority.client.luau'), 'utf8');
function setup() {
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
  h.eval(source);
  return h;
}
const controller = 'pg:FindFirstChild("MobileFpsPriorityController")';
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
    h.eval(source);
    A.equal(h.eval('local n = 0; for _, v in ipairs(pg:GetChildren()) do if v.Name == "MobileFpsPriorityController" then n = n + 1 end end; return n')[0], 1);
    h.advance(31);
    A.equal(h.eval('return pg:FindFirstChild("MobileFpsPriorityNotice") == nil and lighting.GlobalShadows == false')[0], true);
    h.eval(undo);
    A.equal(h.eval('return lighting.GlobalShadows')[0], true);
  });
  suite.test('huỷ controller hoàn tác và có thể chạy lại', (_, A) => {
    const h = setup();
    h.eval(`${controller}:Destroy()`);
    A.equal(h.eval('return bloom.Enabled and lighting.GlobalShadows')[0], true);
    h.eval(source);
    A.equal(h.eval('return not bloom.Enabled and not lighting.GlobalShadows')[0], true);
    h.advance(31);
  });
};
