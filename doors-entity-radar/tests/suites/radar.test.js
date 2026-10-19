'use strict';
/**
 * doors-entity-radar/tests/suites/radar.test.js
 *
 * KIỂM THỬ ĐẦU CUỐI (end-to-end): chạy đúng mã Client/Radar.luau — tự kiểm
 * tra, khởi động, quét, kết luận, đẩy lên UI, tạm dừng, dừng, huỷ.
 * Đây là bằng chứng các mảnh ghép lại với nhau đúng, không phải test rời rạc.
 */

const { createRuntime, P } = require('../lib/runtime');

/** Tạo Radar với cấu hình tuỳ chọn và giữ ở _G.__DER_R. */
function makeRadar(h, configLua = '') {
  return h.eval(`
    local Shared_Config = __DER_REQ("Shared/Config")
    ${configLua}
    local Radar = __DER_REQ("Client/Radar")
    _G.__DER_R = Radar.new(Shared_Config)
    return _G.__DER_R:State()
  `)[0];
}

module.exports = function radarSuite(suite) {
  suite.test('RAD-001: Start chạy tự kiểm tra trước và chỉ báo đạt khi không có lỗi', (t, A) => {
    const h = createRuntime();
    makeRadar(h, 'Shared_Config.Detection.confirmedPatterns = { "Rush" }');
    const result = h.eval(`
      local ok, message = _G.__DER_R:Start()
      local report = _G.__DER_R:SelfCheckReport()
      return ok, _G.__DER_R:State(), report.ok, report.errors, report.warnings, #report.items, message
    `);
    A.equal(result[0], true, result[6]);
    A.equal(result[1], 'running');
    A.equal(result[2], true, 'tự kiểm tra phải đạt');
    A.equal(result[3], 0, 'không được có lỗi mức error');
    A.greaterThan(result[5], 8, 'phải kiểm tra nhiều hạng mục');
    A.matches(result[6], /Tự kiểm tra: ĐẠT/);
  });

  suite.test('RAD-002: cấu hình sai thì từ chối khởi động và nói rõ sai ở đâu', (t, A) => {
    const h = createRuntime();
    makeRadar(h, 'Shared_Config.Scan.descendantsPerStep = 0');
    const result = h.eval(`
      local ok, message = _G.__DER_R:Start()
      return ok, message, _G.__DER_R:State()
    `);
    A.equal(result[0], false, 'cấu hình sai thì không được chạy');
    A.matches(result[1], /descendantsPerStep/);
    A.equal(result[2], 'stopped');
  });

  suite.test('RAD-003: đầu-cuối — thấy instance thật thì UI hiện đúng khoảng cách', (t, A) => {
    const h = createRuntime({ player: { x: 0, y: 0, z: 0 }, camera: { x: 0, y: 0, z: 0, lookX: 0, lookY: 0, lookZ: -1 } });
    makeRadar(h, 'Shared_Config.Detection.confirmedPatterns = { "Rush" }');
    h.eval('_G.__DER_R:Start()');
    // Tab mặc định là Trang chủ; chuyển sang tab danh sách để đọc dòng.
    h.eval('_G.__DER_R:SetTab("all")');

    // Thực thể xuất hiện ở x = +40 trong khi người chơi nhìn về -Z.
    h.eval('__RALO_MOCK.SpawnEntity(game, "Rush", 40, 0, 0, "Model")');
    h.advance(1.2);

    const result = h.eval(`
      local record = _G.__DER_R.tracker:Get("rush")
      local o = record.observation
      local rowText = _G.__DER_R.ui.rows[1].nameLabel.Text
        .. "|" .. _G.__DER_R.ui.rows[1].statusLabel.Text
        .. "|" .. _G.__DER_R.ui.rows[1].distanceLabel.Text
      return record.code, o.distance, o.direction, rowText, _G.__DER_R.ui.parts.statusLabel.Text
    `);
    A.equal(result[0], 'DETECTED');
    A.equal(result[1], 40, 'khoảng cách phải đúng bằng vị trí thật trong Workspace');
    A.equal(result[2], 'bên phải');
    A.equal(result[3], 'Rush|Đã phát hiện|40.0 stud', 'dòng đầu tiên trên UI');
    A.matches(result[4], /Phát hiện 1/, 'thanh trạng thái phải đếm đúng');
  });

  suite.test('RAD-004: không có instance nào thì UI không hiện khoảng cách nào cả', (t, A) => {
    const h = createRuntime();
    makeRadar(h);
    h.eval('_G.__DER_R:Start()');
    h.advance(1.2);
    const result = h.eval(`
      local ui = _G.__DER_R.ui
      local shown = 0
      for slot = 1, #ui.rows do
        if ui.rows[slot].frame.Visible and ui.rows[slot].distanceLabel.Text ~= "—" then
          shown = shown + 1
        end
      end
      local counts = _G.__DER_R.tracker:CountByStatus()
      return shown, counts["DETECTED"] or 0, counts["UNVERIFIED"] or 0, ui.parts.statusLabel.Text
    `);
    A.equal(result[0], 0, 'không dòng nào được hiện khoảng cách');
    A.equal(result[1], 0, 'không mục nào DETECTED');
    A.equal(result[2], 81, '81 mục còn lại là "Chưa xác minh" (Hide là unsupported)');
    A.matches(result[3], /Phát hiện 0/);
  });

  suite.test('RAD-005: Pause đánh dấu dữ liệu cũ; Resume quét lại', (t, A) => {
    const h = createRuntime();
    makeRadar(h, 'Shared_Config.Detection.confirmedPatterns = { "Rush" }');
    h.eval('_G.__DER_R:Start()');
    h.eval('__RALO_MOCK.SpawnEntity(game, "Rush", 40, 0, 0, "Model")');
    h.advance(1.2);

    const paused = h.eval(`
      local ok = _G.__DER_R:Pause()
      local record = _G.__DER_R.tracker:Get("rush")
      return ok, _G.__DER_R:State(), _G.__DER_R.scheduler:State(), record.stale,
             _G.__DER_R.ui.parts.statusLabel.Text
    `);
    A.equal(paused[0], true);
    A.equal(paused[1], 'paused');
    A.equal(paused[2], 'paused');
    A.equal(paused[3], true, 'dữ liệu phải bị đánh dấu là cũ');
    A.matches(paused[4], /dữ liệu đã cũ/, 'UI phải nói rõ dữ liệu không còn trực tiếp');

    const resumed = h.eval(`
      local ok = _G.__DER_R:Resume()
      return ok, _G.__DER_R:State(), _G.__DER_R.scheduler:State()
    `);
    A.equal(resumed[0], true);
    A.equal(resumed[1], 'running');
    A.equal(resumed[2], 'running');
  });

  suite.test('RAD-006: Stop đưa mọi mục về DISABLED và ngắt vòng lặp nền', (t, A) => {
    const h = createRuntime();
    makeRadar(h, 'Shared_Config.Detection.confirmedPatterns = { "Rush" }');
    h.eval('_G.__DER_R:Start()');
    h.eval('__RALO_MOCK.SpawnEntity(game, "Rush", 40, 0, 0, "Model")');
    h.advance(1.2);

    const result = h.eval(`
      _G.__DER_R:Stop()
      local record = _G.__DER_R.tracker:Get("rush")
      local counts = _G.__DER_R.tracker:CountByStatus()
      return _G.__DER_R:State(), _G.__DER_R.scheduler:State(), record.code,
             record.observation == nil, counts["DISABLED"] or 0,
             _G.__DER_R.scanner:Stats().attached
    `);
    A.equal(result[0], 'stopped');
    A.equal(result[1], 'stopped');
    A.equal(result[2], 'DISABLED');
    A.equal(result[3], true, 'không được giữ vị trí sau khi dừng');
    A.equal(result[4], 82, 'toàn bộ danh mục về DISABLED');
    A.equal(result[5], false, 'phải gỡ sự kiện Workspace');
  });

  suite.test('RAD-007: Destroy dọn sạch — connection và instance do dự án tạo về 0', (t, A) => {
    const h = createRuntime();
    makeRadar(h);
    h.eval('_G.__DER_R:Start()');
    h.advance(1.2);

    const before = h.eval(`
      local Registry = __DER_REQ("Client/Core/Registry")
      return Registry.ConnectionCount(), Registry.InstanceCount()
    `);
    A.greaterThan(before[0], 0, 'phải có connection khi đang chạy');
    A.greaterThan(before[1], 0, 'phải có GUI do dự án tạo');

    const after = h.eval(`
      _G.__DER_R:Destroy()
      local Registry = __DER_REQ("Client/Core/Registry")
      local gui = game:GetService("Players").LocalPlayer.PlayerGui:FindFirstChild("DoorsEntityRadar")
      return Registry.ConnectionCount(), Registry.InstanceCount(), gui == nil, _G.__DER_R:State()
    `);
    A.equal(after[0], 0, 'không được rò rỉ connection');
    A.equal(after[1], 0, 'không được rò rỉ instance');
    A.equal(after[2], true, 'GUI phải bị huỷ');
    A.equal(after[3], 'stopped');
  });

  suite.test('RAD-008: Start hai lần không tạo thêm vòng lặp nền', (t, A) => {
    const h = createRuntime();
    makeRadar(h);
    const result = h.eval(`
      local first = { _G.__DER_R:Start() }
      local second = { _G.__DER_R:Start() }
      local stats = _G.__DER_R.scheduler:Stats()
      return first[1], second[1], stats.startCount, stats.hasConnection
    `);
    A.equal(result[0], true);
    A.equal(result[1], false, 'Start lần hai phải bị từ chối');
    A.equal(result[2], 1, 'chỉ một lần khởi động thật');
    A.equal(result[3], true);
  });

  suite.test('RAD-009: Refresh buộc quét lại ngay và cập nhật UI', (t, A) => {
    const h = createRuntime();
    makeRadar(h, 'Shared_Config.Detection.confirmedPatterns = { "Rush" }');
    h.eval('_G.__DER_R:Start()');
    const before = h.eval('return _G.__DER_R.scanner:Stats().counters.fullScans')[0];
    // Cho qua khoảng cách tối thiểu giữa hai lần quét đầy đủ.
    h.advance(3.0);
    h.eval('__RALO_MOCK.SpawnEntity(game, "Rush", 25, 0, 0, "Model")');
    h.eval('_G.__DER_R:Refresh()');
    const result = h.eval(`
      local record = _G.__DER_R.tracker:Get("rush")
      return _G.__DER_R.scanner:Stats().counters.fullScans, record.code, record.observation.distance
    `);
    A.greaterThan(result[0], before, 'phải có lần quét đầy đủ mới');
    A.equal(result[1], 'DETECTED');
    A.equal(result[2], 25);
  });

  suite.test('RAD-010: lọc khu vực, tìm kiếm và chọn mục đổi danh sách hiển thị', (t, A) => {
    const h = createRuntime();
    makeRadar(h);
    h.eval('_G.__DER_R:Start()');
    h.advance(1.2);

    const result = h.eval(`
      local ui = _G.__DER_R.ui
      _G.__DER_R:SetTab("all")
      local allRows = ui.Stats(ui).renderedRows
      _G.__DER_R:SetArea("rooms")
      local roomsRows = ui.Stats(ui).renderedRows
      _G.__DER_R:SetArea("all")
      _G.__DER_R:SetQuery("rush")
      local searchedRows = ui.Stats(ui).renderedRows
      _G.__DER_R:SetQuery("")
      _G.__DER_R:Select("figure")
      return allRows, roomsRows, searchedRows, ui.selectedId, ui.parts.detailTitle.Text
    `);
    // Danh sách được ẢO HOÁ: chỉ dựng tối đa Ui.maxVisibleRows (40) dòng,
    // phần còn lại nằm trong vùng cuộn. Đủ 82 mục vẫn hiện ở thanh trạng thái.
    A.equal(result[0], 40, 'không lọc: dựng đúng số dòng tối đa cho phép');
    A.equal(result[1], 3, 'lọc khu Rooms');
    A.equal(result[2], 3, 'tìm "rush" (Rush, Crusher, Rushing Light)');
    A.equal(result[3], 'figure');
    A.equal(result[4], 'Figure', 'bảng chi tiết phải theo mục đang chọn');
  });

  suite.test('RAD-011: lỗi trong nhịp quét được báo ra, không làm sập hệ thống', (t, A) => {
    const h = createRuntime();
    makeRadar(h);
    h.eval('_G.__DER_R:Start()');
    const result = h.eval(`
      -- Phá bộ quét để buộc nhịp sau ném lỗi.
      _G.__DER_R.scanner.Update = function() error("lỗi giả lập trong test") end
      _G.__DER_R:_tick(os.clock())
      local record = _G.__DER_R.tracker:Get("rush")
      return _G.__DER_R:State(), record.code, record.reason, _G.__DER_R:Stats().radar.faults
    `);
    A.equal(result[0], 'faulted', 'trạng thái phải phản ánh sự cố');
    A.equal(result[1], 'FAULT');
    A.matches(result[2], /lỗi giả lập trong test/, 'lý do phải là lỗi thật');
    A.equal(result[3], 1);
  });

  suite.test('RAD-012: thiếu dịch vụ vẫn chạy được ở chế độ hạn chế (không chết)', (t, A) => {
    const h = createRuntime();
    makeRadar(h);
    const result = h.eval(`
      local Env = __DER_REQ("Client/Core/Env")
      -- Giả lập môi trường thiếu UserInputService và camera.
      Env.services["UserInputService"] = false
      local ok, message = _G.__DER_R:Start()
      local report = _G.__DER_R:SelfCheckReport()
      return ok, report.ok, report.warnings, message
    `);
    A.equal(result[0], true, 'thiếu dịch vụ phụ vẫn phải chạy được');
    A.equal(result[1], true, 'thiếu UserInputService chỉ là cảnh báo');
    A.greaterThan(result[2], 0, 'nhưng phải ghi nhận cảnh báo');
  });

  suite.test('RAD-013: Stats() phơi đủ bộ đếm để chẩn đoán', (t, A) => {
    const h = createRuntime();
    makeRadar(h);
    h.eval('_G.__DER_R:Start()');
    h.advance(1.2);
    const result = h.eval(`
      local stats = _G.__DER_R:Stats()
      return stats.state, stats.scheduler.ticks > 0, stats.scanner.matcher.entities,
             stats.tracker.refreshes > 0, stats.ui ~= nil, stats.registry.connections > 0,
             stats.radar.syncs > 0
    `);
    A.deepEqual(result, ['running', true, 81, true, true, true, true],
      '81 mục quét được (82 trừ Hide không hỗ trợ)');
  });

  suite.test('BOOT-001: Bootstrap tạo Radar và tôn trọng cờ không tự chạy', (t, A) => {
    const h = createRuntime({ autorun: true });
    const result = h.eval(`
      return _G.__DER_RADAR ~= nil, _G.__DER_RADAR:State(), type(_G.__DER_REQUIRE)
    `);
    A.equal(result[0], true, 'Bootstrap phải tạo _G.__DER_RADAR');
    A.equal(result[1], 'stopped', 'có __DER_NO_AUTORUN thì không được tự chạy');
    A.equal(result[2], 'function', 'bộ nạp module phải sẵn sàng');
  });

  suite.test('BOOT-002: Bootstrap tự khởi động khi autoStart = true', (t, A) => {
    const h = createRuntime({ autorun: true, noAutorunFlag: false });
    const result = h.eval(`
      return _G.__DER_RADAR:State(), _G.__DER_RADAR:SelfCheckReport().ok
    `);
    A.equal(result[0], 'running');
    A.equal(result[1], true, 'tự kiểm tra phải đạt khi chạy thật');
    A.greaterThan(h.countLogs(/\[DER\] \[INFO\] Sẵn sàng/), 0, 'phải log "Sẵn sàng"');
  });

  suite.test('BOOT-003: phím tắt được đăng ký qua ContextActionService', (t, A) => {
    const h = createRuntime({ autorun: true });
    const result = h.eval(`
      local cas = game:GetService("ContextActionService")
      local info = cas:GetBoundActionInfo("DER_TogglePanel")
      return info ~= nil, info.touch, #info.inputs
    `);
    A.equal(result[0], true, 'phải có action DER_TogglePanel');
    A.equal(result[1], true, 'có tạo nút cảm ứng cho điện thoại');
    A.equal(result[2], 1, 'gắn đúng một phím');
  });

  suite.test('BOOT-004: phím tắt luôn trả PassThrough (không nuốt phím của game)', (t, A) => {
    const h = createRuntime({ autorun: true });
    const result = h.eval(`
      local cas = game:GetService("ContextActionService")
      local info = cas:GetBoundActionInfo("DER_TogglePanel")
      local action = info.fn("DER_TogglePanel", Enum.UserInputState.Begin)
      return action
    `)[0];
    A.equal(result, 'PassThrough', 'bắt buộc nhường phím lại cho trò chơi');
  });
};
