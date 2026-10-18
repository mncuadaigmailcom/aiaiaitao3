'use strict';
/**
 * tests/suites/guard.test.js
 * ===== RALO.METHODS: CPU-008, REC-001, REC-002, REC-004, CFG-003, DIST-004 =====
 *
 * Kiểm chứng Guard — chốt chặn an toàn quan trọng nhất của dự án.
 * Đặc biệt là REC-002: KHÔNG BAO GIỜ ghi đè thay đổi mới hơn của game.
 */

const { createRuntime, P } = require('../lib/runtime');

module.exports = function guardSuite(suite) {
  suite.test('CPU-008 / REC-001: Guard.Run bắt lỗi, không throw ra ngoài', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local G = __RALO_REQ("Client/Core/Guard")
      local ok, value = G.Run("test", function() error("lỗi cố ý") end)
      return tostring(ok) .. "|" .. tostring(value)
    `)[0];
    // error() của Lua thêm tiền tố vị trí ([string "eval"]:3:) nên chỉ
    // kiểm tra THÔNG ĐIỆP có mặt, không so khớp nguyên văn.
    A.matches(out, /^false\|/, 'phải trả ok=false, không throw ra ngoài');
    A.matches(out, /lỗi cố ý/, 'thông điệp lỗi phải được trả về cho người gọi');
  });

  suite.test('CPU-008: Guard.Run trả về giá trị khi hàm chạy êm', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local G = __RALO_REQ("Client/Core/Guard")
      local ok, value = G.Run("test", function(a, b) return a + b end, 2, 3)
      return tostring(ok) .. "|" .. tostring(value)
    `)[0];
    A.equal(out, 'true|5', 'phải truyền tham số và trả giá trị');
  });

  suite.test('Guard.Alive phân biệt instance còn sống và nil', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local G = __RALO_REQ("Client/Core/Guard")
      local part = Instance.new("Part")
      return tostring(G.Alive(part)) .. "|" .. tostring(G.Alive(nil))
    `)[0];
    A.equal(out, 'true|false', 'Alive(nil) phải là false');
  });

  suite.test('Guard.Change ghi được property và trả "applied"', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local G = __RALO_REQUIRE or __RALO_REQ
      local Guard = G("Client/Core/Guard")
      local part = Instance.new("Part")
      part.CastShadow = true
      local status = Guard.Change(part, "CastShadow", false, { scope = "test" })
      return status .. "|" .. tostring(part.CastShadow)
    `)[0];
    A.equal(out, 'applied|false', 'phải đổi được và đọc lại đúng giá trị mới');
  });

  suite.test('REC-002 / DIST-004: KHÔNG ghi đè khi giá trị đã bị người khác đổi', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Guard = __RALO_REQ("Client/Core/Guard")
      local part = Instance.new("Part")
      part.CastShadow = true
      -- Script tối ưu định tắt bóng, kỳ vọng giá trị hiện tại là true
      local status = Guard.Change(part, "CastShadow", false, { scope = "cull", expect = true })
      -- Giả lập GAME đã tự bật lại thành true trong lúc script chưa kịp khôi phục
      part.CastShadow = true
      -- Giờ script cố khôi phục về true với expect = false (giá trị nó đã đặt)
      local restore = Guard.Change(part, "CastShadow", true, { scope = "restore", expect = false })
      return status .. "|" .. restore .. "|" .. tostring(part.CastShadow)
    `)[0];
    A.equal(out, 'applied|stale|true',
      'lần khôi phục phải trả "stale" và KHÔNG ghi đè giá trị của game');
  });

  suite.test('Guard.Change trả "unchanged" khi giá trị đã đúng', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Guard = __RALO_REQ("Client/Core/Guard")
      local part = Instance.new("Part")
      part.CastShadow = false
      local status = Guard.Change(part, "CastShadow", false, { scope = "test" })
      return status
    `)[0];
    A.equal(out, 'unchanged', 'không ghi lại giá trị giống hệt');
  });

  suite.test('Guard.Change trả "failed" cho instance rỗng', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Guard = __RALO_REQ("Client/Core/Guard")
      return Guard.Change(nil, "CastShadow", false, { scope = "test" })
    `)[0];
    A.equal(out, 'failed', 'instance rỗng phải báo failed chứ không throw');
  });

  suite.test('CFG-003 / REC-004: cấu hình sai kiểu bị thay bằng mặc định + cảnh báo', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Guard = __RALO_REQ("Client/Core/Guard")
      local bad = { measure = { baselineSeconds = "nhanh lên" }, enabled = "có" }
      local normalized, warnings = Guard.NormalizeConfig(bad, {
        measure = { baselineSeconds = 5.0 },
        enabled = true,
      })
      return string.format("%.1f", normalized.measure.baselineSeconds) .. "|"
        .. tostring(normalized.enabled) .. "|" .. #warnings
    `)[0];
    const [value, enabled, warningCount] = out.split('|');
    // So bằng SỐ: Lua 5.3 in float 5.0 thành "5.0", không phải "5".
    A.near(Number(value), 5.0, 1e-9, 'sai kiểu phải rơi về mặc định 5.0');
    A.equal(enabled, 'true', 'enabled sai kiểu phải về true');
    A.greaterThan(Number(warningCount), 0, 'phải sinh cảnh báo, không im lặng sửa');
  });

  suite.test('CFG-003: cấu hình đúng kiểu được giữ nguyên, không cảnh báo', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Guard = __RALO_REQ("Client/Core/Guard")
      local good = { measure = { baselineSeconds = 7.5 }, enabled = true }
      local normalized, warnings = Guard.NormalizeConfig(good, {
        measure = { baselineSeconds = 5.0 },
        enabled = true,
      })
      return tostring(normalized.measure.baselineSeconds) .. "|" .. #warnings
    `)[0];
    A.equal(out, '7.5|0', 'giá trị hợp lệ phải được tôn trọng');
  });
};
