'use strict';
/**
 * doors-entity-radar/tests/suites/ui.test.js
 *
 * Kiểm chứng GIAO DIỆN: dựng được trong PlayerGui, đổ đúng dữ liệu,
 * KHÔNG hiện khoảng cách khi trạng thái không cho phép, không ghi lại
 * property khi dữ liệu không đổi, bật/tắt từng khối không làm hỏng hệ thống,
 * và dọn dẹp thì GUI biến mất.
 */

const { createRuntime, P } = require('../lib/runtime');

/**
 * Dựng UI với cấu hình cho trước và chuẩn bị một "view" mẫu trong Lua.
 * Trả về chuỗi mô tả để JS đọc được (bảng Lua có tham chiếu instance nên
 * không đọc thẳng sang JS).
 */
function buildUi(h, configLua = '') {
  return h.eval(`
    local Shared_Config = __DER_REQ("Shared/Config")
    ${configLua}
    local RadarUi = __DER_REQ("Client/Ui/RadarUi")
    _G.__DER_CALLBACKS = { selected = nil, area = nil, query = nil, primary = 0 }
    _G.__DER_UI = RadarUi.new(Shared_Config, {
      onSelect = function(id) _G.__DER_CALLBACKS.selected = id end,
      onArea = function(id) _G.__DER_CALLBACKS.area = id end,
      onSearch = function(text) _G.__DER_CALLBACKS.query = text end,
      onPrimary = function() _G.__DER_CALLBACKS.primary = _G.__DER_CALLBACKS.primary + 1 end,
    })
    local playerGui = game:GetService("Players").LocalPlayer.PlayerGui
    local ok, message = _G.__DER_UI:Build(playerGui, Vector2.new(1280, 720))
    return ok, message
  `);
}

/** Tạo một view mẫu: 1 mục DETECTED, 1 mục UNVERIFIED, 1 mục UNSUPPORTED. */
function syncSampleView(h) {
  return h.eval(`
    local Catalog = __DER_REQ("Shared/EntityCatalog")
    local Status = __DER_REQ("Shared/Status")
    local Geometry = __DER_REQ("Shared/Geometry")
    local detected = Status.MakeRecord(Status.Code.Detected, "rush", "Khớp instance 'Rush'.", {
      instanceName = "Rush",
      distance = 12.34,
      direction = "phía trước",
      position = Vector3.new(1, 2, 3),
      source = "workspace",
      matchCount = 1,
    }, false)
    local unverified = Status.MakeRecord(Status.Code.Unverified, "ambush", nil, nil, false)
    local unsupported = Status.MakeRecord(Status.Code.Unsupported, "hide", "Không có instance riêng.", nil, false)
    local rows = {
      { entry = Catalog.ById["rush"], record = detected },
      { entry = Catalog.ById["ambush"], record = unverified },
      { entry = Catalog.ById["hide"], record = unsupported },
    }
    _G.__DER_VIEW = {
      rows = rows,
      records = { rush = detected, ambush = unverified, hide = unsupported },
      counts = { DETECTED = 1, UNVERIFIED = 1, UNSUPPORTED = 1 },
      selectedId = "rush",
      areaId = "all",
      -- Tab và lựa chọn là một phần của view thật (Radar luôn gửi đủ).
      -- tabId = "all" để trang danh sách được mở; tab mặc định là "home".
      tabId = "all",
      selectionIds = { rush = true },
      selectedCount = 1,
      selectionFilter = "all",
      scopeCount = 3,
      trackedIds = { rush = true },
      trackedCount = 1,
      stateText = "ĐANG CHẠY",
      stateColor = Color3.fromRGB(86, 220, 130),
      primaryLabel = "Tạm dừng",
      lastUpdateText = "0.4s trước",
      warningText = "",
      confirmedIds = {},
    }
    return _G.__DER_UI:Sync(_G.__DER_VIEW)
  `)[0];
}

module.exports = function uiSuite(suite) {
  suite.test('UI-001: Build tạo ScreenGui trong PlayerGui của người chơi', (t, A) => {
    const h = createRuntime();
    const result = buildUi(h);
    A.equal(result[0], true, result[1]);
    const info = h.eval(`
      local playerGui = game:GetService("Players").LocalPlayer.PlayerGui
      local gui = playerGui:FindFirstChild("DoorsEntityRadar")
      return gui ~= nil, gui.ClassName, _G.__DER_UI:IsBuilt(), _G.__DER_UI:IsOpen()
    `);
    A.equal(info[0], true, 'phải có ScreenGui tên DoorsEntityRadar');
    A.equal(info[1], 'ScreenGui');
    A.equal(info[2], true);
    A.equal(info[3], true, 'mở sẵn sau khi dựng');
  });

  suite.test('UI-002: Sync đổ đúng tên, trạng thái và khoảng cách vào từng dòng', (t, A) => {
    const h = createRuntime();
    buildUi(h);
    A.equal(syncSampleView(h), true);
    const rows = h.eval(`
      local ui = _G.__DER_UI
      local out = {}
      for slot = 1, 3 do
        local row = ui.rows[slot]
        out[#out + 1] = row.nameLabel.Text .. "|" .. row.statusLabel.Text .. "|" .. row.distanceLabel.Text
      end
      return table.concat(out, ";")
    `)[0];
    const [first, second, third] = rows.split(';');
    A.equal(first, 'Rush|Đã phát hiện|12.3 stud');
    A.equal(second, 'Ambush|Chưa xác minh|—', 'chưa xác minh thì KHÔNG được hiện khoảng cách');
    A.equal(third, 'Hide|Không hỗ trợ phát hiện|—');
  });

  suite.test('UI-003: bảng chi tiết chỉ in toạ độ khi trạng thái cho phép', (t, A) => {
    const h = createRuntime();
    buildUi(h);
    syncSampleView(h);
    const detail = h.eval(`
      local Status = __DER_REQ("Shared/Status")
      local Catalog = __DER_REQ("Shared/EntityCatalog")
      local ui = _G.__DER_UI
      local detectedText = ui.parts.detailBody.Text
      _G.__DER_VIEW.selectedId = "ambush"
      ui:Sync(_G.__DER_VIEW)
      local unverifiedText = ui.parts.detailBody.Text
      return detectedText, unverifiedText
    `);
    A.matches(detail[0], /Toạ độ: 1\.0, 2\.0, 3\.0/, 'DETECTED được in toạ độ');
    A.matches(detail[0], /Khoảng cách: 12\.3 stud/);
    A.matches(detail[1], /Không có vị trí để hiển thị/, 'UNVERIFIED phải nói rõ là không có vị trí');
    A.equal(/Toạ độ:/.test(detail[1]), false, 'UNVERIFIED không được in toạ độ');
  });

  suite.test('UI-004: dữ liệu không đổi thì không ghi lại property (đếm được)', (t, A) => {
    const h = createRuntime();
    buildUi(h);
    syncSampleView(h);
    const before = h.eval(`
      local Widgets = __DER_REQ("Client/Ui/Widgets")
      return Widgets.stats.writes, Widgets.stats.skipped
    `);
    h.eval('_G.__DER_UI:Sync(_G.__DER_VIEW)');
    h.eval('_G.__DER_UI:Sync(_G.__DER_VIEW)');
    const after = h.eval(`
      local Widgets = __DER_REQ("Client/Ui/Widgets")
      return Widgets.stats.writes, Widgets.stats.skipped
    `);
    A.equal(after[0], before[0], 'hai lần Sync giống hệt không được ghi thêm property nào');
    A.greaterThan(after[1], before[1], 'số lần bỏ qua phải tăng (bằng chứng đã so sánh)');
  });

  suite.test('UI-005: dữ liệu đổi thì mới ghi (khoảng cách mới hiện ra)', (t, A) => {
    const h = createRuntime();
    buildUi(h);
    syncSampleView(h);
    const result = h.eval(`
      local ui = _G.__DER_UI
      local before = ui.rows[1].distanceLabel.Text
      _G.__DER_VIEW.rows[1].record.observation.distance = 99.5
      ui:Sync(_G.__DER_VIEW)
      return before, ui.rows[1].distanceLabel.Text
    `);
    A.equal(result[0], '12.3 stud');
    A.equal(result[1], '99.5 stud', 'giá trị mới phải được ghi');
  });

  suite.test('UI-006: tắt từng khối giao diện vẫn dựng và chạy được', (t, A) => {
    const h = createRuntime();
    const built = buildUi(h, `
      Shared_Config.Ui.showSearch = false
      Shared_Config.Ui.showAreaFilter = false
      Shared_Config.Ui.showDetailPanel = false
      Shared_Config.Ui.showStatusBar = false
    `);
    A.equal(built[0], true, built[1]);
    A.equal(syncSampleView(h), true, 'Sync vẫn phải chạy khi các khối bị tắt');
    const result = h.eval(`
      local ui = _G.__DER_UI
      return ui.parts.searchBox == nil, ui.parts.areaStrip == nil,
             ui.parts.detail == nil, ui.parts.statusBar == nil,
             ui.rows[1].nameLabel.Text
    `);
    A.deepEqual(result, [true, true, true, true, 'Rush'], 'khối bị tắt thì không được tạo');
  });

  suite.test('UI-007: màn hình hẹp thì thu nhỏ bảng (responsive)', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Shared_Config = __DER_REQ("Shared/Config")
      local RadarUi = __DER_REQ("Client/Ui/RadarUi")
      local ui = RadarUi.new(Shared_Config, {})
      local playerGui = game:GetService("Players").LocalPlayer.PlayerGui
      ui:Build(playerGui, Vector2.new(420, 780))
      local layout = ui.layout
      return ui.narrow, layout.scale, layout.panelWidth
    `);
    A.equal(result[0], true, 'viewport 420px phải vào chế độ hẹp');
    A.lessThan(result[1], 1, 'phải thu nhỏ');
    A.lessThan(result[2], 420, 'bảng không được tràn màn hình');
  });

  suite.test('UI-008: nhấn một dòng gọi callback chọn mục', (t, A) => {
    const h = createRuntime();
    buildUi(h);
    syncSampleView(h);
    const result = h.eval(`
      local ui = _G.__DER_UI
      ui.rows[2].frame.MouseButton1Click:Fire()
      return _G.__DER_CALLBACKS.selected
    `)[0];
    A.equal(result, 'ambush', 'nhấn dòng nào phải báo đúng mục đó');
  });

  suite.test('UI-009: SetOpen ẩn/hiện bảng mà không phá trạng thái dựng', (t, A) => {
    const h = createRuntime();
    buildUi(h);
    const result = h.eval(`
      local ui = _G.__DER_UI
      ui:SetOpen(false)
      local hidden = ui:IsOpen()
      local gui = game:GetService("Players").LocalPlayer.PlayerGui:FindFirstChild("DoorsEntityRadar")
      local enabledWhileHidden = gui.Enabled
      ui:SetOpen(true)
      return hidden, enabledWhileHidden, ui:IsOpen(), ui:IsBuilt()
    `);
    A.deepEqual(result, [false, false, true, true]);
  });

  suite.test('UI-010: Destroy huỷ ScreenGui và xoá tham chiếu', (t, A) => {
    const h = createRuntime();
    buildUi(h);
    syncSampleView(h);
    const result = h.eval(`
      local ui = _G.__DER_UI
      ui:Destroy()
      local gui = game:GetService("Players").LocalPlayer.PlayerGui:FindFirstChild("DoorsEntityRadar")
      return gui == nil, ui:IsBuilt(), ui:IsOpen(), ui:Stats().rowPool
    `);
    A.equal(result[0], true, 'ScreenGui phải bị huỷ khỏi PlayerGui');
    A.equal(result[1], false);
    A.equal(result[2], false);
    A.equal(result[3], 0, 'pool dòng phải được xoá');
  });

  suite.test('UI-011: không có PlayerGui thì báo lỗi rõ ràng, không ném', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Shared_Config = __DER_REQ("Shared/Config")
      local RadarUi = __DER_REQ("Client/Ui/RadarUi")
      local ui = RadarUi.new(Shared_Config, {})
      local ok, message = ui:Build(nil, nil)
      return ok, message
    `);
    A.equal(result[0], false);
    A.matches(result[1], /PlayerGui/);
  });

  suite.test('UI-012: thanh trạng thái ghép đủ bộ đếm và cảnh báo', (t, A) => {
    const h = createRuntime();
    buildUi(h);
    h.eval(`
      _G.__DER_VIEW = nil
    `);
    syncSampleView(h);
    const withWarning = h.eval(`
      _G.__DER_VIEW.warningText = "quét bị cắt ngắn, kết quả có thể thiếu"
      _G.__DER_UI:Sync(_G.__DER_VIEW)
      return _G.__DER_UI.parts.statusLabel.Text
    `)[0];
    A.matches(withWarning, /Phát hiện 1/);
    A.matches(withWarning, /chưa xác minh 1/);
    A.matches(withWarning, /không hỗ trợ 1/);
    A.matches(withWarning, /quét bị cắt ngắn/, 'cảnh báo phải hiện lên thanh trạng thái');
  });
};
