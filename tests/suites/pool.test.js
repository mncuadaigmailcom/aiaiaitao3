'use strict';
/**
 * tests/suites/pool.test.js
 * ===== RALO.METHODS: POOL-001, POOL-003, POOL-004, POOL-005, RAM-002,
 *                     DATA-001, CPU-006 =====
 *
 * Kiểm chứng object pooling: tái sử dụng thay vì tạo/huỷ, có trần dung
 * lượng, và không tái sử dụng đối tượng đã chết.
 */

const { createRuntime, P } = require('../lib/runtime');

module.exports = function poolSuite(suite) {
  suite.test('POOL-001 / DATA-001: Acquire tái sử dụng đối tượng đã Release', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Pool = __RALO_REQ("Client/Core/Pool")
      Pool.Define("bullet", { className = "Part", capacity = 4 })

      local first, how1 = Pool.Acquire("bullet")
      local createdFirst = how1
      Pool.Release("bullet", first)

      local second, how2 = Pool.Acquire("bullet")
      local reused = (first == second)
      Pool.Shutdown()
      return createdFirst .. "|" .. how2 .. "|" .. tostring(reused)
    `)[0];
    const [firstHow, secondHow, reused] = out.split('|');
    A.equal(firstHow, 'created', 'lần đầu phải tạo mới');
    A.equal(secondHow, 'reused', 'lần hai phải tái sử dụng');
    A.equal(reused, 'true', 'phải là CÙNG MỘT instance');
  });

  suite.test('POOL-001: Release đặt Parent = nil để đối tượng không còn render', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Pool = __RALO_REQ("Client/Core/Pool")
      Pool.Define("fx", { className = "Part", capacity = 4 })
      local inst = Pool.Acquire("fx")
      inst.Parent = game:GetService("Workspace")
      Pool.Release("fx", inst)
      local parentAfter = tostring(inst.Parent)
      Pool.Shutdown()
      return parentAfter
    `)[0];
    A.equal(out, 'nil', 'đối tượng trong pool không được nằm trong cây');
  });

  suite.test('POOL-004: pool đầy thì huỷ thật, không phình vô hạn', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Pool = __RALO_REQ("Client/Core/Pool")
      Pool.Define("cap", { className = "Part", capacity = 2 })
      local made = {}
      for i = 1, 5 do
        made[i] = Pool.Acquire("cap")
      end
      for i = 1, 5 do
        Pool.Release("cap", made[i])
      end
      local freeCount = Pool.FreeCount("cap")
      local stats = Pool.Stats()
      Pool.Shutdown()
      return freeCount .. "|" .. stats.cappedOut
    `)[0];
    const [freeCount, capped] = out.split('|');
    A.equal(freeCount, '2', 'chỉ giữ đúng bằng trần dung lượng');
    A.equal(capped, '3', '3 đối tượng vượt trần phải bị huỷ và được đếm');
  });

  suite.test('POOL-005: không tái sử dụng đối tượng đã bị huỷ', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Pool = __RALO_REQ("Client/Core/Pool")
      Pool.Define("dead", { className = "Part", capacity = 4 })
      local inst = Pool.Acquire("dead")
      Pool.Release("dead", inst)
      inst:Destroy()                       -- game huỷ đối tượng trong pool
      local again, how = Pool.Acquire("dead")
      local different = (again ~= inst)
      Pool.Shutdown()
      return how .. "|" .. tostring(different)
    `)[0];
    const [how, different] = out.split('|');
    A.equal(how, 'created', 'phải tạo mới chứ không trả về xác chết');
    A.equal(different, 'true', 'phải là instance khác');
  });

  suite.test('POOL-003 / RAM-002: pool bảng Lua tái sử dụng và xoá sạch dữ liệu cũ', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Pool = __RALO_REQ("Client/Core/Pool")
      local t = Pool.AcquireTable()
      t.x = 1
      t.y = 2
      Pool.ReleaseTable(t)

      local again = Pool.AcquireTable()
      local same = (again == t)
      local empty = (next(again) == nil)
      return tostring(same) .. "|" .. tostring(empty)
    `)[0];
    const [same, empty] = out.split('|');
    A.equal(same, 'true', 'phải trả lại đúng bảng đã mượn');
    A.equal(empty, 'true', 'bảng phải được xoá sạch trước khi tái sử dụng');
  });

  suite.test('POOL-004: pool bảng cũng có trần, không giữ vô hạn', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Pool = __RALO_REQ("Client/Core/Pool")
      Pool.tablePoolCap = 3
      local kept = {}
      for i = 1, 10 do
        kept[i] = Pool.AcquireTable()
      end
      for i = 1, 10 do
        Pool.ReleaseTable(kept[i])
      end
      return #Pool.tablePool
    `)[0];
    // eval trả về SỐ (không nối chuỗi) nên so bằng số
    A.equal(Number(out), 3, 'chỉ giữ tối đa bằng trần');
  });

  suite.test('POOL-001: Acquire với pool chưa định nghĩa trả nil kèm lý do', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Pool = __RALO_REQ("Client/Core/Pool")
      local inst, reason = Pool.Acquire("không_tồn_tại")
      return tostring(inst) .. "|" .. tostring(reason)
    `)[0];
    A.matches(out, /^nil\|/, 'phải trả nil chứ không throw');
    A.matches(out, /chưa được định nghĩa/, 'phải nêu rõ lý do');
  });

  suite.test('POOL-005: Release instance rỗng trả false, không throw', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Pool = __RALO_REQ("Client/Core/Pool")
      Pool.Define("x", { className = "Part", capacity = 2 })
      local r1 = Pool.Release("x", nil)
      local r2 = Pool.Release("pool_khong_co", Instance.new("Part"))
      Pool.Shutdown()
      return tostring(r1) .. "|" .. tostring(r2)
    `)[0];
    A.equal(out, 'false|false', 'cả hai trường hợp sai phải trả false êm');
  });
};
