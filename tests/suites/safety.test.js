'use strict';
/**
 * tests/suites/safety.test.js
 * ===== RALO.METHODS: SAFE-001, SAFE-002, SAFE-003, SAFE-004, SAFE-005,
 *                     SAFE-006, SAFE-007, SAFE-008, GRAPHICS-009, DATA-004 =====
 *
 * Kiểm chứng RANH GIỚI AN TOÀN: những gì hệ thống KHÔNG được đụng vào.
 * Đây là nhóm test quan trọng nhất về mặt "không phá gameplay".
 */

const { createRuntime, P } = require('../lib/runtime');

module.exports = function safetySuite(suite) {
  suite.test('SAFE-001: property ngoài danh sách trắng bị TỪ CHỐI', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Safety = __RALO_REQ("Shared/Safety")
      local part = Instance.new("Part")
      local allowTransparency = Safety.Allow(part, "Transparency")
      local allowAnchored     = Safety.Allow(part, "Anchored")
      local allowCanCollide   = Safety.Allow(part, "CanCollide")
      local allowCastShadow   = Safety.Allow(part, "CastShadow")
      return tostring(allowTransparency) .. "|" .. tostring(allowAnchored)
        .. "|" .. tostring(allowCanCollide) .. "|" .. tostring(allowCastShadow)
    `)[0];
    const [transparency, anchored, canCollide, castShadow] = out.split('|');
    A.equal(transparency, 'false', 'Transparency có thể làm biến mất vật thể -> từ chối');
    A.equal(anchored, 'false', 'Anchored ảnh hưởng vật lý -> từ chối');
    A.equal(canCollide, 'false', 'CanCollide ảnh hưởng gameplay -> từ chối');
    A.equal(castShadow, 'true', 'CastShadow thuần thị giác -> cho phép');
  });

  suite.test('SAFE-002 / SAFE-004: Humanoid bị bảo vệ (trừ AutomaticScalingEnabled)', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Safety = __RALO_REQ("Shared/Safety")
      local humanoid = Instance.new("Humanoid")
      local walkSpeed  = Safety.Allow(humanoid, "WalkSpeed")
      local jumpPower  = Safety.Allow(humanoid, "JumpPower")
      local health     = Safety.Allow(humanoid, "Health")
      local autoScaling = Safety.Allow(humanoid, "AutomaticScalingEnabled")
      return tostring(walkSpeed) .. "|" .. tostring(jumpPower) .. "|"
        .. tostring(health) .. "|" .. tostring(autoScaling)
    `)[0];
    const [walkSpeed, jumpPower, health, autoScaling] = out.split('|');
    A.equal(walkSpeed, 'false', 'WalkSpeed là thông số gameplay -> từ chối');
    A.equal(jumpPower, 'false', 'JumpPower là thông số gameplay -> từ chối');
    A.equal(health, 'false', 'Health là trạng thái gameplay -> từ chối');
    A.equal(autoScaling, 'true', 'chỉ AutomaticScalingEnabled được phép (ngoại lệ duy nhất)');
  });

  suite.test('SAFE-002: Camera, Tool, RemoteEvent, Script đều bị bảo vệ', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Safety = __RALO_REQ("Shared/Safety")
      local results = {}
      for _, className in { "Camera", "Tool", "RemoteEvent", "Script", "LocalScript", "Player" } do
        local inst = Instance.new(className)
        -- thử một property nằm TRONG whitelist để chứng minh lớp vẫn chặn
        local allowed = Safety.Allow(inst, "Enabled")
        table.insert(results, className .. "=" .. tostring(allowed))
      end
      return table.concat(results, ",")
    `)[0];
    for (const pair of out.split(',')) {
      const [className, allowed] = pair.split('=');
      A.equal(allowed, 'false', `${className} phải bị chặn kể cả với property hợp lệ`);
    }
  });

  suite.test('SAFE-003: đối tượng mang tag bảo vệ bị bỏ qua hoàn toàn', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Safety = __RALO_REQ("Shared/Safety")
      local protected = Instance.new("Part")
      local normal = Instance.new("Part")
      local set = { [tostring(protected)] = true }
      local allowProtected = Safety.Allow(protected, "CastShadow", set)
      local allowNormal = Safety.Allow(normal, "CastShadow", set)
      return tostring(allowProtected) .. "|" .. tostring(allowNormal)
    `)[0];
    const [protectedResult, normalResult] = out.split('|');
    A.equal(protectedResult, 'false', 'đối tượng có tag bảo vệ PHẢI bị từ chối');
    A.equal(normalResult, 'true', 'đối tượng thường vẫn được tối ưu');
  });

  suite.test('SAFE-002: Part thường với property hợp lệ vẫn được phép', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Safety = __RALO_REQ("Shared/Safety")
      local part = Instance.new("Part")
      local emitter = Instance.new("ParticleEmitter")
      return tostring(Safety.Allow(part, "CastShadow")) .. "|"
        .. tostring(Safety.Allow(emitter, "Enabled")) .. "|"
        .. tostring(Safety.Allow(emitter, "Rate"))
    `)[0];
    A.equal(out, 'true|true|true',
      'đây là những tối ưu hợp lệ — chốt an toàn không được chặn nhầm');
  });

  suite.test('GRAPHICS-009: dự án KHÔNG đổi Material, Color, BrickColor', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Safety = __RALO_REQ("Shared/Safety")
      local part = Instance.new("Part")
      return tostring(Safety.Allow(part, "Material")) .. "|"
        .. tostring(Safety.Allow(part, "Color")) .. "|"
        .. tostring(Safety.Allow(part, "BrickColor"))
    `)[0];
    A.equal(out, 'false|false|false',
      'đổi vật liệu/màu là thay đổi mỹ thuật rõ rệt — cố ý không cho phép');
  });

  suite.test('SAFE-006: thống kê đếm được tỷ lệ từ chối để báo cáo', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Safety = __RALO_REQ("Shared/Safety")
      Safety.Reset()
      local part = Instance.new("Part")
      Safety.Allow(part, "CastShadow")        -- 1 cho phép
      Safety.Allow(part, "Transparency")      -- 1 từ chối (property)
      Safety.Allow(Instance.new("Tool"), "Enabled")  -- 1 từ chối (lớp)
      local s = Safety.Stats()
      return s.allowed .. "|" .. s.deniedProperty .. "|" .. s.deniedClass .. "|" .. s.total
    `)[0];
    const [allowed, deniedProperty, deniedClass, total] = out.split('|');
    A.equal(allowed, '1', 'đếm đúng số lần cho phép');
    A.equal(deniedProperty, '1', 'đếm đúng số lần từ chối theo property');
    A.equal(deniedClass, '1', 'đếm đúng số lần từ chối theo lớp');
    A.equal(total, '3', 'tổng phải khớp');
  });

  suite.test('SAFE-008: mã nguồn KHÔNG chứa API vượt quyền nào', (t, A) => {
    // Ủy quyền cho tools/lint-conventions.js thay vì tự viết lại một bản
    // kém hơn: linter đó đã xử lý đúng chú thích KHỐI --[[ ]] nên không
    // báo nhầm tên API được NHẮC TỚI trong phần giải thích.
    // Một luật, một implementation — không nhân bản logic kiểm tra.
    const { lint } = require('../../tools/lint-conventions');
    const logs = [];
    const originalLog = console.log;
    console.log = (...args) => logs.push(args.join(' '));
    let code;
    try {
      code = lint();
    } finally {
      console.log = originalLog;
    }
    A.equal(code, 0, `linter phải sạch; chi tiết:\n${logs.join('\n')}`);
    A.matches(logs.join('\n'), /Không có vi phạm/, 'linter phải xác nhận không vi phạm');
  });

  suite.test('SAFE-005: module đụng nội dung game KHÔNG có lệnh Destroy nào', (t, A) => {
    // Thuộc tính an toàn thật sự cần bảo vệ: các module đọc/sửa nội dung
    // của game (đồ hoạ, hiệu ứng, vật lý, quét, bộ nhớ) KHÔNG ĐƯỢC huỷ bất
    // cứ thứ gì. Destroy chỉ hợp lệ ở nơi huỷ tài nguyên do CHÍNH hệ thống
    // tạo ra (Registry, Pool, GuiPolicy, Notifier, Progress).
    const fs = require('fs');
    const path = require('path');
    const srcDir = path.resolve(__dirname, '..', '..', 'src');

    const mustNotDestroy = [
      'Client/Optimizations/Graphics.luau',
      'Client/Optimizations/Effects.luau',
      'Client/Optimizations/Physics.luau',
      'Client/Optimizations/Scan.luau',
      'Client/Optimizations/Memory.luau',
      'Client/Core/Cull.luau',
      'Client/Core/Spatial.luau',
    ];

    const offenders = [];
    for (const rel of mustNotDestroy) {
      const full = path.join(srcDir, rel);
      A.ok(fs.existsSync(full), `phải tồn tại ${rel} để kiểm tra`);
      // Bộ bỏ chú thích có trạng thái (chú thích khối --[[ ]] nhiều dòng)
      let inBlock = false;
      const strip = (line) => {
        if (inBlock) {
          if (line.includes(']]')) inBlock = false;
          return '';
        }
        if (line.includes('--[[')) {
          if (!line.includes(']]')) inBlock = true;
          return '';
        }
        const idx = line.indexOf('--');
        return idx === -1 ? line : line.slice(0, idx);
      };
      fs.readFileSync(full, 'utf8').split('\n').forEach((raw, i) => {
        if (/:Destroy\s*\(/.test(strip(raw))) {
          offenders.push(`${rel}:${i + 1}: ${raw.trim().slice(0, 80)}`);
        }
      });
    }
    A.deepEqual(offenders, [],
      'module xử lý nội dung game không được huỷ bất cứ instance nào');
  });

  suite.test('SAFE-007: Destroy chỉ xuất hiện ở module quản lý tài nguyên hệ thống', (t, A) => {
    const fs = require('fs');
    const path = require('path');
    const srcDir = path.resolve(__dirname, '..', '..', 'src');
    const allowed = [
      'Client/Core/Registry.luau',   // huỷ instance do hệ thống tạo (có trong sổ)
      'Client/Core/Pool.luau',       // huỷ instance của pool khi vượt trần
      'Client/Ui/GuiPolicy.luau',    // huỷ GUI, có kiểm tra Name
      'Client/Ui/Notifier.luau',     // gỡ khung GUI của chính nó
      'Client/Ui/Progress.luau',     // huỷ BindableEvent của chính nó
      'Client/Core/Pipeline.luau',   // gọi notifier:Destroy() (không phải instance)
    ];
    const hits = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) { walk(full); continue; }
        if (!full.endsWith('.luau')) continue;
        const rel = path.relative(srcDir, full);
        fs.readFileSync(full, 'utf8').split('\n').forEach((raw, i) => {
          const idx = raw.indexOf('--');
          const code = idx === -1 ? raw : raw.slice(0, idx);
          if (/:Destroy\s*\(/.test(code) && !allowed.includes(rel)) {
            hits.push(`${rel}:${i + 1}`);
          }
        });
      }
    };
    walk(srcDir);
    A.deepEqual(hits, [],
      'Destroy chỉ được xuất hiện ở nơi quản lý tài nguyên do hệ thống tạo');
  });
};
