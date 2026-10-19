'use strict';
/**
 * doors-entity-radar/tests/suites/scheduler.test.js
 *
 * Kiểm chứng BỘ LẬP LỊCH và SỔ TÀI NGUYÊN: chỉ một vòng lặp nền, có ngân
 * sách, pause/resume/stop đúng, lỗi một task không kéo sập task khác, và
 * dọn dẹp thì connection/instance về 0.
 */

const { createRuntime, P } = require('../lib/runtime');

module.exports = function schedulerSuite(suite) {
  suite.test('SCH-001: Start chuyển sang running và chỉ tạo MỘT connection', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Scheduler = __DER_REQ("Client/Core/Scheduler")
      local s = Scheduler.new()
      s:SetTask("demo", 0.5, function() end)
      local ok1 = s:Start()
      local ok2 = s:Start()
      local stats = s:Stats()
      _G.__DER_SCHED = s
      return ok1, ok2, stats.state, stats.hasConnection, stats.blockedStarts, stats.startCount
    `);
    A.equal(result[0], true);
    A.equal(result[1], false, 'Start lần hai phải bị chặn');
    A.equal(result[2], 'running');
    A.equal(result[3], true);
    A.equal(result[4], 1, 'phải đếm lần khởi động bị chặn');
    A.equal(result[5], 1, 'chỉ một lần Start thật');
  });

  suite.test('SCH-002: task chạy đúng chu kỳ theo đồng hồ ảo', (t, A) => {
    const h = createRuntime();
    h.eval(`
      local Scheduler = __DER_REQ("Client/Core/Scheduler")
      _G.__DER_COUNT = 0
      _G.__DER_SCHED = Scheduler.new()
      _G.__DER_SCHED:SetTask("tick", 0.5, function() _G.__DER_COUNT = _G.__DER_COUNT + 1 end)
      _G.__DER_SCHED:Start()
    `);
    h.advance(2.05);
    const calls = h.eval('return _G.__DER_COUNT')[0];
    // 2.05s với chu kỳ 0.5s: lần đầu ngay khi tới hạn, sau đó mỗi 0.5s.
    A.inRange(calls, 4, 5, 'số lần chạy trong ~2 giây');
  });

  suite.test('SCH-003: Pause dừng chạy, Resume chạy tiếp và không "trả nợ" lượt cũ', (t, A) => {
    const h = createRuntime();
    h.eval(`
      local Scheduler = __DER_REQ("Client/Core/Scheduler")
      _G.__DER_COUNT = 0
      _G.__DER_SCHED = Scheduler.new()
      _G.__DER_SCHED:SetTask("tick", 0.25, function() _G.__DER_COUNT = _G.__DER_COUNT + 1 end)
      _G.__DER_SCHED:Start()
    `);
    h.advance(1.0);
    const beforePause = h.eval('return _G.__DER_COUNT')[0];
    const paused = h.eval(`
      local ok = _G.__DER_SCHED:Pause()
      return ok, _G.__DER_SCHED:State(), _G.__DER_SCHED:Stats().hasConnection
    `);
    A.equal(paused[0], true);
    A.equal(paused[1], 'paused');
    A.equal(paused[2], false, 'tạm dừng phải ngắt connection nền');

    h.advance(3.0);
    const duringPause = h.eval('return _G.__DER_COUNT')[0];
    A.equal(duringPause, beforePause, 'tạm dừng thì không được chạy task');

    const resumed = h.eval(`
      local ok = _G.__DER_SCHED:Resume()
      return ok, _G.__DER_SCHED:State()
    `);
    A.equal(resumed[0], true);
    A.equal(resumed[1], 'running');
    h.advance(0.3);
    const afterResume = h.eval('return _G.__DER_COUNT')[0];
    A.inRange(afterResume - duringPause, 1, 2, 'tiếp tục thì chạy lại, không dồn cục');
  });

  suite.test('SCH-004: Stop ngắt connection; Reset cho phép chạy lại', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Scheduler = __DER_REQ("Client/Core/Scheduler")
      local s = Scheduler.new()
      s:SetTask("tick", 0.5, function() end)
      s:Start()
      s:Stop()
      local afterStop = { s:State(), s:Stats().hasConnection }
      local refuse = { s:Start() }
      s:Reset()
      local restart = { s:Start() }
      s:Destroy()
      return afterStop[1], afterStop[2], refuse[1], refuse[2], restart[1], s:State()
    `);
    A.equal(result[0], 'stopped');
    A.equal(result[1], false, 'Stop phải ngắt connection');
    A.equal(result[2], false, 'đang stopped thì không cho Start thẳng');
    A.equal(result[4], true, 'Reset rồi thì Start được');
    A.equal(result[5], 'stopped', 'Destroy đưa về stopped');
  });

  suite.test('SCH-005: task lỗi không kéo sập task khác và được đếm', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Scheduler = __DER_REQ("Client/Core/Scheduler")
      _G.__DER_GOOD = 0
      local s = Scheduler.new()
      s:SetTask("bad", 0.1, function() error("task cố tình lỗi") end)
      s:SetTask("good", 0.1, function() _G.__DER_GOOD = _G.__DER_GOOD + 1 end)
      s:Start()
      _G.__DER_SCHED = s
      return true
    `);
    A.equal(result[0], true);
    h.advance(0.55);
    const stats = h.eval(`
      local stats = _G.__DER_SCHED:Stats()
      return _G.__DER_GOOD, stats.taskErrors, stats.tasks["bad"].errors, stats.tasks["good"].errors
    `);
    A.greaterThan(stats[0], 0, 'task tốt vẫn phải chạy');
    A.greaterThan(stats[1], 0, 'lỗi phải được đếm');
    A.greaterThan(stats[2], 0, 'task lỗi bị đếm đúng chỗ');
    A.equal(stats[3], 0, 'task tốt không bị tính lỗi');
    A.greaterThan(h.countLogs(/task 'bad' ném lỗi/), 0, 'lỗi task phải ra Output');
  });

  suite.test('SCH-006: RunNow ép chạy ngay một task (nút "Làm mới")', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Scheduler = __DER_REQ("Client/Core/Scheduler")
      _G.__DER_COUNT = 0
      local s = Scheduler.new()
      s:SetTask("scan", 10, function() _G.__DER_COUNT = _G.__DER_COUNT + 1 end)
      s:Start()
      _G.__DER_COUNT = 0
      local ok = s:RunNow("scan", os.clock())
      local missing = { s:RunNow("khongco", os.clock()) }
      return ok, _G.__DER_COUNT, missing[1]
    `);
    A.equal(result[0], true);
    A.equal(result[1], 1, 'RunNow phải chạy ngay');
    A.equal(result[2], false, 'task không tồn tại phải báo lỗi rõ ràng');
  });

  suite.test('SCH-007: SetTask từ chối interval không hợp lệ', (t, A) => {
    const h = createRuntime();
    A.throws(() => h.eval(`
      local Scheduler = __DER_REQ("Client/Core/Scheduler")
      local s = Scheduler.new()
      s:SetTask("bad", 0, function() end)
    `), 'interval = 0 phải bị từ chối');
  });

  suite.test('REG-001: Registry đếm connection/instance và Shutdown dọn về 0', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Registry = __DER_REQ("Client/Core/Registry")
      _G.__DER_FIRES = 0
      local signal = Instance.new("BindableEvent").Event
      for i = 1, 3 do
        Registry.Connect(signal, function() _G.__DER_FIRES = _G.__DER_FIRES + 1 end, "test")
      end
      local gui = Instance.new("ScreenGui")
      gui.Parent = game:GetService("Players").LocalPlayer.PlayerGui
      Registry.Track(gui, "test:gui")
      Registry.AddCleanup(function() _G.__DER_CLEANED = true end, "test:cleanup")
      local before = { Registry.ConnectionCount(), Registry.InstanceCount(), Registry.CleanupCount() }
      Registry.Shutdown()
      signal:Fire()
      return before[1], before[2], before[3],
             Registry.ConnectionCount(), Registry.InstanceCount(), Registry.CleanupCount(),
             _G.__DER_FIRES, _G.__DER_CLEANED
    `);
    A.equal(result[0], 3);
    A.equal(result[1], 1);
    A.equal(result[2], 1);
    A.equal(result[3], 0, 'Shutdown ngắt hết connection');
    A.equal(result[4], 0, 'Shutdown huỷ hết instance do dự án tạo');
    A.equal(result[5], 0);
    // Sau Shutdown, connection đã ngắt nên Fire() KHÔNG gọi handler nào nữa.
    // (Kỳ vọng cũ là 3 — sai: nếu vậy nghĩa là Shutdown chẳng ngắt gì cả.)
    A.equal(result[6], 0, 'handler đã ngắt không chạy nữa');
    A.equal(result[7], true, 'hàm dọn dẹp phải được gọi');
  });

  suite.test('REG-002: Shutdown lần hai an toàn (idempotent)', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Registry = __DER_REQ("Client/Core/Registry")
      local signal = Instance.new("BindableEvent").Event
      Registry.Connect(signal, function() end, "a")
      Registry.Shutdown()
      local d2, i2 = Registry.Shutdown()
      return d2, i2
    `);
    A.equal(result[0], 0);
    A.equal(result[1], 0);
  });

  suite.test('REG-003: Connect với signal nil trả về thông báo thay vì ném lỗi', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Registry = __DER_REQ("Client/Core/Registry")
      local connection, err = Registry.Connect(nil, function() end, "thieu-signal")
      return connection == nil, err
    `);
    A.equal(result[0], true);
    A.matches(result[1], /Không có signal/);
  });
};
