'use strict';
/**
 * tests/suites/config.test.js
 * ===== RALO.METHODS: CFG-001, CFG-002, CFG-004, CFG-005, CFG-006,
 *                     MEAS-004, RES-004, LOWEND-001, LOWEND-002,
 *                     LOWEND-003, LOWEND-004, REC-004 =====
 *
 * Kiểm chứng kho cấu hình trung tâm và phân hạng thiết bị.
 */

const { createRuntime, P } = require('../lib/runtime');

module.exports = function configSuite(suite) {
  suite.test('RES-004: mặc định là chế độ "light", không phải mức mạnh nhất', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Config = __RALO_REQ("Shared/Config")
      return Config.Mode() .. "|" .. Config.DEFAULT_MODE
        .. "|" .. tostring(Config.PROFILE.physics.enabled)
        .. "|" .. tostring(Config.PROFILE.memory.gcEverySeconds)
    `)[0];
    const [mode, defaultMode, physics, gcEvery] = out.split('|');
    A.equal(mode, 'light', 'chế độ mặc định phải là light');
    A.equal(defaultMode, 'light', 'hằng mặc định phải là light');
    A.equal(physics, 'false', 'vật lý mặc định TẮT vì có đánh đổi cảm giác chơi');
    A.equal(gcEvery, '0', 'GC thủ công mặc định tắt để tránh tác vụ nền không cần thiết');
  });

  suite.test('CFG-004: ResetToDefaults khôi phục đúng giá trị ban đầu', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Config = __RALO_REQ("Shared/Config")
      Config.Apply({ gui = { durationSeconds = 999 }, graphics = { qualityLevel = 1 } })
      local changed = Config.PROFILE.gui.durationSeconds .. "|" .. Config.PROFILE.graphics.qualityLevel
      Config.ResetToDefaults()
      local restored = Config.PROFILE.gui.durationSeconds .. "|" .. Config.PROFILE.graphics.qualityLevel
      return changed .. " -> " .. restored
    `)[0];
    const [changed, restored] = out.split(' -> ');
    A.equal(changed, '999|1', 'Apply phải đổi được giá trị');
    A.equal(restored, '30|8', 'ResetToDefaults phải đưa về 30 giây và quality 8');
  });

  suite.test('CFG-001: SetGroup tắt được từng nhóm độc lập', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Config = __RALO_REQ("Shared/Config")
      local Devices = __RALO_REQ("Client/Core/Devices")
      Config.SetGroup("graphics", false)
      local graphicsOff = Devices.IsEnabled(Config.PROFILE, "graphics")
      local effectsStill = Devices.IsEnabled(Config.PROFILE, "effects")
      Config.SetGroup("graphics", true)
      local graphicsBack = Devices.IsEnabled(Config.PROFILE, "graphics")
      return tostring(graphicsOff) .. "|" .. tostring(effectsStill) .. "|" .. tostring(graphicsBack)
    `)[0];
    const [graphicsOff, effectsStill, graphicsBack] = out.split('|');
    A.equal(graphicsOff, 'false', 'tắt graphics');
    A.equal(effectsStill, 'true', 'effects KHÔNG bị ảnh hưởng — các nhóm độc lập');
    A.equal(graphicsBack, 'true', 'bật lại được');
  });

  suite.test('CFG-002: SetMethod tắt được từng phương pháp riêng lẻ', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Config = __RALO_REQ("Shared/Config")
      local Devices = __RALO_REQ("Client/Core/Devices")
      Config.SetMethod("GRAPHICS-003", false)
      local methodOff = Devices.IsEnabled(Config.PROFILE, "graphics", "GRAPHICS-003")
      local siblingOn = Devices.IsEnabled(Config.PROFILE, "graphics", "GRAPHICS-001")
      return tostring(methodOff) .. "|" .. tostring(siblingOn)
    `)[0];
    const [methodOff, siblingOn] = out.split('|');
    A.equal(methodOff, 'false', 'phương pháp bị tắt');
    A.equal(siblingOn, 'true', 'phương pháp cùng nhóm vẫn chạy');
  });

  suite.test('CFG-005: DisabledList liệt kê đúng những gì đang tắt', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Config = __RALO_REQ("Shared/Config")
      local Devices = __RALO_REQ("Client/Core/Devices")
      -- physics mặc định đã TẮT; giữ nguyên để nó xuất hiện trong danh sách
      Config.SetGroup("graphics", false)
      Config.SetMethod("FX-001", false)
      local list = Devices.DisabledList(Config.PROFILE)
      local groups = {}
      for _, g in ipairs(list.groups) do table.insert(groups, g) end
      table.sort(groups)
      local methods = {}
      for _, m in ipairs(list.methods) do table.insert(methods, m) end
      return table.concat(groups, ",") .. "|" .. table.concat(methods, ",")
    `)[0];
    const [groups, methods] = out.split('|');
    // graphics vừa tắt; physics và net mặc định đã tắt
    A.matches(groups, /graphics/, 'graphics phải nằm trong danh sách tắt');
    A.matches(groups, /physics/, 'physics mặc định tắt phải được liệt kê');
    A.matches(groups, /net/, 'net mặc định tắt phải được liệt kê');
    A.equal(methods, 'FX-001', 'đúng phương pháp vừa tắt');
  });

  suite.test('CFG-001: công tắc tổng enabled = false tắt MỌI thứ', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Config = __RALO_REQ("Shared/Config")
      local Devices = __RALO_REQ("Client/Core/Devices")
      Config.PROFILE.enabled = false
      local any = Devices.IsEnabled(Config.PROFILE, "graphics")
      Config.PROFILE.enabled = true
      local back = Devices.IsEnabled(Config.PROFILE, "graphics")
      return tostring(any) .. "|" .. tostring(back)
    `)[0];
    A.equal(out, 'false|true', 'công tắc tổng phải thắng mọi công tắc con');
  });

  suite.test('CFG-006: SetGroup/SetMethod với khoá sai kiểu bị từ chối êm', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Config = __RALO_REQ("Shared/Config")
      local r1 = Config.SetGroup(nil, true)
      local r2 = Config.SetMethod(123, true)
      return tostring(r1) .. "|" .. tostring(r2)
    `)[0];
    A.equal(out, 'false|false', 'khoá sai kiểu phải trả false chứ không throw');
  });

  suite.test('MEAS-004: Config.Mode nhận diện chế độ sai và rơi về mặc định', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Config = __RALO_REQ("Shared/Config")
      Config.PROFILE.mode = "sieunhanh"
      local fallback = Config.Mode()
      Config.PROFILE.mode = "off"
      local off = Config.Mode()
      return fallback .. "|" .. off
    `)[0];
    A.equal(out, 'light|off', 'chế độ lạ phải rơi về light; "off" là hợp lệ');
  });

  suite.test('LOWEND-001: nhận diện nền tảng trả về bảng, không throw khi thiếu service', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Devices = __RALO_REQ("Client/Core/Devices")
      local info = Devices.DetectPlatform()
      return type(info) .. "|" .. tostring(info.platform)
        .. "|" .. tostring(info.touch) .. "|" .. tostring(info.keyboardMouse)
    `)[0];
    const [kind, platform, touch, kb] = out.split('|');
    A.equal(kind, 'table', 'phải trả về bảng');
    A.ok(['pc', 'mobile', 'console', 'unknown'].includes(platform),
      `nền tảng phải là một giá trị已知, nhận ${platform}`);
    A.equal(touch, 'false', 'harness không có cảm ứng');
    A.equal(kb, 'false', 'harness không khai báo bàn phím');
  });

  suite.test('LOWEND-002: không có số đo FPS thì KHÔNG tự hạ bậc', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Devices = __RALO_REQ("Client/Core/Devices")
      Devices.Reset()
      local tier, info = Devices.ChooseTier(nil, {})
      -- tostring() cả tier để so sánh chuỗi nhất quán (Lua 5.3 in float là 3.0)
      return tostring(math.floor(tier)) .. "|" .. info.name
        .. "|" .. string.format("%.1f", info.particleScale)
    `)[0];
    const [tier, name, scale] = out.split('|');
    A.equal(tier, '3', 'không có số đo thì giữ bậc cao nhất (can thiệp ít nhất)');
    A.equal(name, 'high', 'tên bậc phải khớp');
    A.equal(scale, '1.0', 'không giới hạn hạt khi chưa có bằng chứng');
  });

  suite.test('LOWEND-002 / LOWEND-003: FPS đo được thấp thì hạ bậc và giảm hạt', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Devices = __RALO_REQ("Client/Core/Devices")
      Devices.Reset()
      local tier = Devices.ChooseTier(22, {})
      local scale = Devices.ParticleScale()
      local animate = Devices.ShouldAnimateGui()
      return tostring(math.floor(tier)) .. "|"
        .. string.format("%.1f", scale) .. "|" .. tostring(animate)
    `)[0];
    const [tier, scale, animate] = out.split('|');
    A.equal(tier, '1', 'FPS 22 phải hạ về bậc thấp');
    A.equal(scale, '0.4', 'mật độ hạt phải giảm mạnh trên máy yếu');
    A.equal(animate, 'false', 'tắt hoạt ảnh GUI trên máy yếu');
  });

  suite.test('LOWEND-002: autoTier = false thì tôn trọng bậc người dùng đặt', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Devices = __RALO_REQ("Client/Core/Devices")
      Devices.Reset()
      local tier = Devices.ChooseTier(15, { autoTier = false })
      return tostring(math.floor(tier))
    `)[0];
    A.equal(out, '3', 'khi tắt autoTier, FPS thấp cũng không được tự hạ bậc');
  });

  suite.test('REC-004: NormalizeConfig giữ được enabled = false (không nuốt false)', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Guard = __RALO_REQ("Client/Core/Guard")
      local Config = __RALO_REQ("Shared/Config")
      local profile = { enabled = false, mode = "light" }
      local normalized = Guard.NormalizeConfig(profile, Config.PROFILE)
      return tostring(normalized.enabled)
    `)[0];
    A.equal(out, 'false',
      'đây là bẫy `false or nil`: công tắc tắt tổng PHẢI giữ được giá trị false');
  });
};
