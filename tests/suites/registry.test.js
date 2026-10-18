'use strict';
/**
 * tests/suites/registry.test.js
 * ===== RALO.METHODS: LEAK-001, LEAK-002, LEAK-003, LEAK-004, LEAK-005,
 *                     ASSET-003, QUERY-002, EVT-002, EVT-006, RES-002,
 *                     RES-003, SAFE-007, CPU-003 =====
 *
 * Kiểm chứng sổ đăng ký tập trung: connection, instance do hệ thống tạo,
 * và cache tra cứu tự vô hiệu khi đối tượng bị huỷ.
 */

const { createRuntime, P } = require('../lib/runtime');

module.exports = function registrySuite(suite) {
  suite.test('LEAK-001 / EVT-002: Connect được đếm và Shutdown ngắt hết', (t, A) => {
    const h = createRuntime();
    h.eval(`
      local R = __RALO_REQ("Client/Core/Registry")
      _G.__RALO_FIRES = 0
      local signal = Instance.new("BindableEvent").Event
      _G.__RALO_SIG = signal
      for i = 1, 5 do
        R.Connect(signal, function() _G.__RALO_FIRES += 1 end, "test")
      end
    `);
    A.equal(h.call(P.registry, 'ConnectionCount'), 5, 'phải đếm đủ 5 connection');
    h.eval('__RALO_SIG:Fire()');
    A.equal(h.eval('return __RALO_FIRES')[0], 5, 'cả 5 handler phải chạy');

    h.call(P.registry, 'Shutdown');
    A.equal(h.call(P.registry, 'ConnectionCount'), 0, 'Shutdown phải ngắt hết');
    h.eval('__RALO_SIG:Fire()');
    A.equal(h.eval('return __RALO_FIRES')[0], 5, 'không handler nào chạy sau Shutdown');
  });

  suite.test('LEAK-001: handle:Disconnect() ngắt đúng một connection', (t, A) => {
    const h = createRuntime();
    h.eval(`
      local R = __RALO_REQ("Client/Core/Registry")
      _G.__RALO_A, _G.__RALO_B = 0, 0
      local signal = Instance.new("BindableEvent").Event
      _G.__RALO_SIG = signal
      _G.__RALO_HA = R.Connect(signal, function() _G.__RALO_A += 1 end, "a")
      R.Connect(signal, function() _G.__RALO_B += 1 end, "b")
    `);
    h.eval('__RALO_SIG:Fire()');
    h.eval('__RALO_HA:Disconnect()');
    h.eval('__RALO_SIG:Fire()');
    A.equal(h.eval('return __RALO_A')[0], 1, 'handler đã ngắt chỉ chạy 1 lần');
    A.equal(h.eval('return __RALO_B')[0], 2, 'handler kia vẫn chạy cả 2 lần');
  });

  suite.test('LEAK-003: ConnectOnce chỉ chạy đúng một lần', (t, A) => {
    const h = createRuntime();
    h.eval(`
      local R = __RALO_REQ("Client/Core/Registry")
      _G.__RALO_N = 0
      local signal = Instance.new("BindableEvent").Event
      _G.__RALO_SIG = signal
      R.ConnectOnce(signal, function() _G.__RALO_N += 1 end, "once")
    `);
    h.eval('__RALO_SIG:Fire() __RALO_SIG:Fire() __RALO_SIG:Fire()');
    A.equal(h.eval('return __RALO_N')[0], 1, 'chỉ được chạy 1 lần dù bắn 3 lần');
    A.equal(h.call(P.registry, 'ConnectionCount'), 0, 'connection phải tự ngắt');
  });

  suite.test('LEAK-005 / RES-003 / SAFE-007: chỉ huỷ instance do hệ thống tạo', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local R = __RALO_REQ("Client/Core/Registry")
      local workspace = game:GetService("Workspace")

      -- Instance của GAME (không nằm trong sổ) — không được đụng
      local gamePart = Instance.new("Part")
      gamePart.Name = "GamePart"
      gamePart.Parent = workspace

      -- Instance do HỆ THỐNG tạo — có trong sổ
      local ours = Instance.new("Part")
      ours.Name = "RALO_Part"
      local id = R.Own(ours, "test")
      local ownedBefore = R.OwnedCount()

      R.Release(id)
      local ownedAfter = R.OwnedCount()

      -- Instance của game phải VẪN CÒN trong Workspace
      local stillThere = workspace:FindFirstChild("GamePart") ~= nil
      return ownedBefore .. "|" .. ownedAfter .. "|" .. tostring(stillThere)
    `)[0];
    const [before, after, gamePartAlive] = out.split('|');
    A.equal(before, '1', 'instance hệ thống tạo phải được đếm');
    A.equal(after, '0', 'Release phải xoá khỏi sổ');
    A.equal(gamePartAlive, 'true', 'instance của GAME phải còn nguyên');
  });

  suite.test('QUERY-002 / ASSET-003: FindFirstChild được cache', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local R = __RALO_REQ("Client/Core/Registry")
      local workspace = game:GetService("Workspace")
      local part = Instance.new("Part")
      part.Name = "Cached"
      part.Parent = workspace

      local first = R.Find(workspace, "Cached")
      local cacheAfterFirst = R.CacheCount()
      local second = R.Find(workspace, "Cached")
      local cacheAfterSecond = R.CacheCount()
      return tostring(first == second) .. "|" .. cacheAfterFirst .. "|" .. cacheAfterSecond
    `)[0];
    const [same, afterFirst, afterSecond] = out.split('|');
    A.equal(same, 'true', 'hai lần tra cứu phải trả cùng một instance');
    A.equal(afterFirst, '1', 'cache có 1 mục sau lần đầu');
    A.equal(afterSecond, '1', 'lần hai dùng cache, không tạo mục mới');
  });

  suite.test('ASSET-003: cache TỰ VÔ HIỆU khi instance bị huỷ', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local R = __RALO_REQ("Client/Core/Registry")
      local workspace = game:GetService("Workspace")
      local part = Instance.new("Part")
      part.Name = "Temp"
      part.Parent = workspace

      local first = R.Find(workspace, "Temp")
      R.Watch(part, "test")          -- theo dõi để phát hiện huỷ
      part.Parent = nil              -- giả lập bị huỷ khỏi cây
      local second = R.Find(workspace, "Temp")
      return tostring(first ~= nil) .. "|" .. tostring(second)
    `)[0];
    const [foundFirst, second] = out.split('|');
    A.equal(foundFirst, 'true', 'lần đầu phải tìm thấy');
    A.equal(second, 'nil', 'cache phải vô hiệu, không trả instance đã chết');
  });

  suite.test('LEAK-001: Connect với handler không phải function bị từ chối', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local R = __RALO_REQ("Client/Core/Registry")
      local signal = Instance.new("BindableEvent").Event
      local handle = R.Connect(signal, "không phải function", "bad")
      return tostring(handle) .. "|" .. R.ConnectionCount()
    `)[0];
    A.equal(out, 'nil|0', 'handler sai kiểu phải bị từ chối, không tạo connection');
  });

  suite.test('EVT-006: Shutdown trả về số connection và instance đã dọn', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local R = __RALO_REQ("Client/Core/Registry")
      local signal = Instance.new("BindableEvent").Event
      R.Connect(signal, function() end, "x")
      R.Connect(signal, function() end, "y")
      local part = Instance.new("Part")
      R.Own(part, "z")
      local disconnected, released = R.Shutdown()
      return disconnected .. "|" .. released
    `)[0];
    A.equal(out, '2|1', 'phải báo đúng số đã dọn để log và test kiểm được');
  });
};
