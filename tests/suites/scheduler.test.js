'use strict';
/**
 * tests/suites/scheduler.test.js
 * ===== RALO.METHODS: LOOP-001, LOOP-002, LOOP-003, LOOP-004, LOOP-008,
 *                     CPU-009, BG-001, BG-003, BG-004, BG-006, RES-001, START-001 =====
 *
 * Kiểm chứng BỘ LẬP LỊCH: một kết nối Heartbeat duy nhất, ưu tiên, chu kỳ
 * riêng, huỷ bằng handle, ngân sách khung hình.
 */

const { createRuntime, P } = require('../lib/runtime');

module.exports = function schedulerSuite(suite) {
  suite.test('LOOP-001: chỉ MỘT kết nối Heartbeat dù có nhiều task', (t, A) => {
    const h = createRuntime();
    const before = h.call(P.scheduler, 'Stats').connections;
    h.call(P.scheduler, 'Start');
    h.eval(`
      local S = __RALO_REQ("Client/Core/Scheduler")
      for i = 1, 12 do
        S.Schedule({ name = "t" .. i, interval = 0.1, callback = function() end })
      end
    `);
    const stats = h.call(P.scheduler, 'Stats');
    A.equal(stats.tasks, 12, 'phải có 12 task');
    A.equal(stats.connections - before, 1, 'chỉ được mở THÊM đúng 1 connection');
  });

  suite.test('LOOP-002: task ưu tiên cao chạy trước', (t, A) => {
    const h = createRuntime();
    h.eval(`
      local S = __RALO_REQ("Client/Core/Scheduler")
      _G.__RALO_ORDER = {}
      S.Schedule({ name = "low",  interval = 0, priority = -5, callback = function() table.insert(_G.__RALO_ORDER, "low") end })
      S.Schedule({ name = "high", interval = 0, priority = 9,  callback = function() table.insert(_G.__RALO_ORDER, "high") end })
      S.Schedule({ name = "mid",  interval = 0, priority = 0,  callback = function() table.insert(_G.__RALO_ORDER, "mid") end })
      S.Start()
    `);
    h.advance(1 / 60);
    const order = h.eval('return table.concat(__RALO_ORDER, ",")')[0];
    A.equal(order, 'high,mid,low', 'thứ tự phải theo priority giảm dần');
  });

  suite.test('LOOP-003: mỗi task có chu kỳ riêng', (t, A) => {
    const h = createRuntime();
    h.eval(`
      local S = __RALO_REQ("Client/Core/Scheduler")
      _G.__RALO_FAST, _G.__RALO_SLOW = 0, 0
      S.Schedule({ name = "fast", interval = 0,    callback = function() _G.__RALO_FAST += 1 end })
      S.Schedule({ name = "slow", interval = 1.0,  callback = function() _G.__RALO_SLOW += 1 end })
      S.Start()
    `);
    h.advance(2.0);                       // 120 khung hình
    const fast = h.eval('return __RALO_FAST')[0];
    const slow = h.eval('return __RALO_SLOW')[0];
    A.equal(fast, 120, 'task interval=0 chạy mỗi khung hình');
    A.equal(slow, 2, 'task interval=1.0 chạy 2 lần trong 2 giây');
  });

  suite.test('LOOP-004: handle:Cancel() dừng đúng task đó, task khác vẫn chạy', (t, A) => {
    const h = createRuntime();
    h.eval(`
      local S = __RALO_REQ("Client/Core/Scheduler")
      _G.__RALO_A, _G.__RALO_B = 0, 0
      _G.__RALO_HA = S.Schedule({ name = "a", interval = 0, callback = function() _G.__RALO_A += 1 end })
      S.Schedule({ name = "b", interval = 0, callback = function() _G.__RALO_B += 1 end })
      S.Start()
    `);
    h.advance(0.5);
    h.eval('__RALO_HA:Cancel()');
    const aAtCancel = h.eval('return __RALO_A')[0];
    h.advance(0.5);
    A.equal(h.eval('return __RALO_A')[0], aAtCancel, 'task đã huỷ không được chạy tiếp');
    A.greaterThan(h.eval('return __RALO_B')[0], 0, 'task khác vẫn chạy');
  });

  suite.test('BG-003: maxCalls làm task tự huỷ', (t, A) => {
    const h = createRuntime();
    h.eval(`
      local S = __RALO_REQ("Client/Core/Scheduler")
      _G.__RALO_N = 0
      S.Schedule({ name = "once", interval = 0, maxCalls = 3, callback = function() _G.__RALO_N += 1 end })
      S.Start()
    `);
    h.advance(2.0);
    A.equal(h.eval('return __RALO_N')[0], 3, 'chạy đúng 3 lần rồi dừng');
    A.equal(h.call(P.scheduler, 'TaskCount'), 0, 'task tự huỷ khỏi bộ lập lịch');
  });

  suite.test('START-001: Defer chạy ở khung hình SAU, không phải ngay lập tức', (t, A) => {
    const h = createRuntime();
    h.eval(`
      local S = __RALO_REQ("Client/Core/Scheduler")
      _G.__RALO_DEFERRED = false
      S.Defer("later", function() _G.__RALO_DEFERRED = true end)
      S.Start()
    `);
    A.equal(h.eval('return __RALO_DEFERRED')[0], false, 'chưa chạy ngay khi đăng ký');
    h.advance(1 / 60);
    A.equal(h.eval('return __RALO_DEFERRED')[0], true, 'chạy ở khung hình kế tiếp');
  });

  suite.test('BG-006: Shutdown ngắt connection và xoá mọi task', (t, A) => {
    const h = createRuntime();
    h.eval(`
      local S = __RALO_REQ("Client/Core/Scheduler")
      _G.__RALO_N = 0
      S.Schedule({ name = "x", interval = 0, callback = function() _G.__RALO_N += 1 end })
      S.Start()
    `);
    h.advance(0.2);
    h.call(P.scheduler, 'Shutdown');
    const stats = h.call(P.scheduler, 'Stats');
    A.equal(stats.tasks, 0, 'không còn task');
    A.equal(stats.connections, 0, 'không còn connection');
    const frozen = h.eval('return __RALO_N')[0];
    h.advance(1.0);
    A.equal(h.eval('return __RALO_N')[0], frozen, 'task không chạy sau Shutdown');
  });

  suite.test('CPU-009: vượt ngân sách thì dừng và đếm overrun', (t, A) => {
    const h = createRuntime();
    // os.clock trong harness là ĐỒNG HỒ ẢO nên không phản ánh chi phí CPU
    // thật. Vì vậy test bơm một đồng hồ giả tiến 1ms mỗi task để kiểm chứng
    // LOGIC cắt ngân sách. Ở Roblox, Client_Env.now() = os.clock() thật.
    h.eval(`
      local S = __RALO_REQ("Client/Core/Scheduler")
      S.frameBudgetMs = 2.5          -- ngân sách 2.5ms
      _G.__RALO_VIRTUAL_MS = 0
      S.clockForBudget = function()
        return _G.__RALO_VIRTUAL_MS / 1000
      end
      _G.__RALO_RAN = {}
      for i = 1, 5 do
        S.Schedule({ name = "t" .. i, interval = 0, callback = function()
          _G.__RALO_VIRTUAL_MS += 1        -- mỗi task "tốn" 1ms
          table.insert(_G.__RALO_RAN, i)
        end })
      end
      S.Start()
    `);
    h.advance(1 / 60);
    const ran = h.eval('return #__RALO_RAN')[0];
    const stats = h.call(P.scheduler, 'Stats');
    A.equal(ran, 3, 'chỉ chạy 3 task rồi dừng (1+1+1 = 3ms > 2.5ms)');
    A.greaterThan(stats.overruns, 0, 'phải đếm được số lần vượt ngân sách');
  });

  suite.test('REC-003: một task lỗi KHÔNG kéo sập các task khác', (t, A) => {
    const h = createRuntime();
    h.eval(`
      local S = __RALO_REQ("Client/Core/Scheduler")
      _G.__RALO_OK = 0
      S.Schedule({ name = "boom", interval = 0, callback = function() error("lỗi cố ý") end })
      S.Schedule({ name = "fine", interval = 0, callback = function() _G.__RALO_OK += 1 end })
      S.Start()
    `);
    h.advance(0.2);
    A.greaterThan(h.eval('return __RALO_OK')[0], 0, 'task lành vẫn chạy dù task kia lỗi');
    const stats = h.call(P.scheduler, 'Stats');
    A.greaterThan(stats.errors, 0, 'lỗi được đếm, không bị nuốt im lặng');
    A.matches(stats.lastError, /lỗi cố ý/, 'thông điệp lỗi phải được giữ lại');
  });
};
