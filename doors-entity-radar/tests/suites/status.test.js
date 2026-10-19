'use strict';
/**
 * doors-entity-radar/tests/suites/status.test.js
 *
 * Kiểm chứng LUẬT TRẠNG THÁI — phần quyết định tính trung thực của hệ thống:
 * chỉ DETECTED mới được kèm vị trí, và dữ liệu gắn vào trạng thái khác phải
 * bị chặn lại (kèm cảnh báo) thay vì hiển thị ra.
 */

const { createRuntime, P } = require('../lib/runtime');

module.exports = function statusSuite(suite) {
  suite.test('STA-001: chỉ DETECTED được phép hiển thị vị trí', (t, A) => {
    const h = createRuntime();
    const codes = ['DETECTED', 'NOT_FOUND', 'NO_POSITION', 'UNSUPPORTED', 'UNVERIFIED', 'DISABLED', 'FAULT'];
    for (const code of codes) {
      const allowed = h.call(P.status, 'MayShowPosition', code);
      if (code === 'DETECTED') {
        A.equal(allowed, true, 'DETECTED phải được hiện vị trí');
      } else {
        A.equal(allowed, false, `${code} KHÔNG được hiện vị trí`);
      }
    }
  });

  suite.test('STA-002: MakeRecord chặn observation khi trạng thái không phải DETECTED', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Status = __DER_REQ("Shared/Status")
      local Vector3 = Vector3
      local fakeObservation = {
        instanceName = "Rush",
        distance = 12.5,
        direction = "phía trước",
        position = Vector3.new(1, 2, 3),
        source = "workspace",
      }
      local blocked = Status.MakeRecord(Status.Code.Unverified, "rush", nil, fakeObservation, false)
      local allowed = Status.MakeRecord(Status.Code.Detected, "rush", nil, fakeObservation, false)
      return blocked.observation == nil, allowed.observation ~= nil, allowed.observation.distance
    `);
    A.equal(result[0], true, 'UNVERIFIED phải bị tước vị trí');
    A.equal(result[1], true, 'DETECTED được giữ vị trí');
    A.equal(result[2], 12.5, 'khoảng cách phải được giữ nguyên cho DETECTED');
    A.greaterThan(h.countLogs(/Chặn hiển thị vị trí ở trạng thái UNVERIFIED/), 0,
      'phải có cảnh báo trong Output khi chặn');
  });

  suite.test('STA-003: đủ 7 trạng thái, mỗi trạng thái có nhãn và lý do mặc định', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Status = __DER_REQ("Shared/Status")
      local missingLabel, missingReason = 0, 0
      local count = 0
      for _, code in pairs(Status.Code) do
        count = count + 1
        if Status.Label[code] == nil then missingLabel = missingLabel + 1 end
        if Status.DefaultReason[code] == nil then missingReason = missingReason + 1 end
        if Status.SortWeight[code] == nil then missingLabel = missingLabel + 1 end
      end
      return count, missingLabel, missingReason
    `);
    A.equal(result[0], 7, 'số trạng thái');
    A.equal(result[1], 0, 'thiếu nhãn/thứ tự sắp xếp');
    A.equal(result[2], 0, 'thiếu lý do mặc định');
  });

  suite.test('STA-004: MakeRecord ném lỗi với mã trạng thái lạ (không im lặng chấp nhận)', (t, A) => {
    const h = createRuntime();
    A.throws(() => h.eval(`
      local Status = __DER_REQ("Shared/Status")
      return Status.MakeRecord("KHONG_CO_MA_NAY", "rush", nil, nil, false)
    `), 'phải ném lỗi với mã trạng thái không tồn tại');
  });

  suite.test('STA-005: lý do tuỳ chọn được ưu tiên hơn lý do mặc định', (t, A) => {
    const h = createRuntime();
    const reason = h.eval(`
      local Status = __DER_REQ("Shared/Status")
      local record = Status.MakeRecord(Status.Code.Unsupported, "hide", "Vì nó là hành động của người chơi.", nil, false)
      return record.reason
    `)[0];
    A.equal(reason, 'Vì nó là hành động của người chơi.');
  });

  suite.test('STA-006: IsScanned chỉ đúng với ba trạng thái có kết luận thật', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Status = __DER_REQ("Shared/Status")
      return Status.IsScanned(Status.Code.Detected),
             Status.IsScanned(Status.Code.NotFound),
             Status.IsScanned(Status.Code.NoPosition),
             Status.IsScanned(Status.Code.Unverified),
             Status.IsScanned(Status.Code.Unsupported)
    `);
    A.deepEqual(result, [true, true, true, false, false]);
  });

  suite.test('SIG-001: Signal ngắt kết nối đúng, handler lỗi không chặn handler khác', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Signal = __DER_REQ("Shared/Signal")
      local s = Signal.new()
      _G.__DER_A, _G.__DER_B = 0, 0
      local connA = s:Connect(function() error("handler cố tình lỗi") end)
      local connB = s:Connect(function() _G.__DER_B = _G.__DER_B + 1 end)
      s:Fire()
      local afterFirst = _G.__DER_B
      connA:Disconnect()
      connA:Disconnect()
      s:Fire()
      local afterSecond = _G.__DER_B
      local remaining = s:HandlerCount()
      s:DisconnectAll()
      s:Fire()
      return afterFirst, afterSecond, remaining, _G.__DER_B, s:HandlerCount(), s:IsAlive()
    `);
    A.equal(result[0], 1, 'handler B vẫn chạy dù handler A lỗi');
    A.equal(result[1], 2, 'lần Fire thứ hai vẫn tới handler B');
    A.equal(result[2], 1, 'còn đúng một handler sau khi ngắt A');
    A.equal(result[3], 2, 'sau DisconnectAll không handler nào chạy nữa');
    A.equal(result[4], 0, 'DisconnectAll xoá sạch handler');
    A.equal(result[5], false, 'signal đã chết');
    A.greaterThan(h.countLogs(/handler của Signal ném lỗi/), 0, 'lỗi handler phải được ghi log');
  });
};
