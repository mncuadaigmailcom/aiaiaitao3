'use strict';
/**
 * doors-entity-radar/tests/suites/selection.test.js
 *
 * Kiểm chứng HỆ THỐNG CHỌN THỰC THỂ:
 *   * dữ liệu lựa chọn nằm NGOÀI giao diện (đổi tab không mất);
 *   * chọn một / chọn nhiều / chọn tất cả trong phạm vi / chọn tất cả khu vực;
 *   * bỏ chọn từng mục, bỏ chọn toàn bộ;
 *   * bộ lọc Đã chọn / Chưa chọn / Tất cả;
 *   * theo dõi (track) từng mục và theo dõi theo nhóm;
 *   * thao tác chọn KHÔNG tạo thêm connection hay bản sao giao diện.
 */

const { createRuntime, P } = require('../lib/runtime');

/** Tạo Radar đã Start, tab mở là "all" (danh sách đầy đủ). */
function makeRadar(h, configLua = '') {
  return h.eval(`
    local Shared_Config = __DER_REQ("Shared/Config")
    ${configLua}
    local Radar = __DER_REQ("Client/Radar")
    _G.__DER_R = Radar.new(Shared_Config)
    _G.__DER_R:Start()
    _G.__DER_R:SetTab("all")
    return _G.__DER_R:State()
  `)[0];
}

module.exports = function selectionSuite(suite) {
  suite.test('SEL-001: Selection là dữ liệu thuần — bật/tắt, đếm, version', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Selection = __DER_REQ("Client/Core/Selection")
      local s = Selection.new()
      local v0 = s:Version()
      local nowSelected, ok = s:Toggle("rush")
      local v1 = s:Version()
      local changedAgain = s:Set("rush", true)
      local v2 = s:Version()
      local changedUnknown, okUnknown, msgUnknown = s:Set("khong_ton_tai", true)
      s:Toggle("rush")
      return nowSelected, ok, v0, v1, changedAgain, v2, s:Count(), changedUnknown, okUnknown, tostring(msgUnknown), s:Stats().rejected
    `);
    A.equal(result[0], true, 'toggle lần đầu = chọn');
    A.equal(result[1], true);
    A.equal(result[3], result[2] + 1, 'version phải tăng khi có thay đổi thật');
    A.equal(result[4], false, 'đặt lại đúng trạng thái cũ thì không đổi');
    A.equal(result[5], result[3], 'version không tăng khi không có gì đổi');
    A.equal(result[6], 0, 'toggle lần hai = bỏ chọn');
    A.equal(result[7], false, 'id lạ thì không có gì thay đổi');
    A.equal(result[8], false, 'id lạ phải bị từ chối');
    A.matches(result[9], /không có mục/);
    A.equal(result[10], 1, 'phải đếm số lần từ chối');
  });

  suite.test('SEL-002: SetMany và Clear hoạt động đúng, không đếm sai', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Selection = __DER_REQ("Client/Core/Selection")
      local s = Selection.new()
      local changed, rejected = s:SetMany({ "rush", "ambush", "screech", "khong_ton_tai" }, true)
      local count = s:Count()
      local changedAgain = s:SetMany({ "rush", "ambush" }, true)
      local removed = s:Clear()
      return changed, rejected, count, changedAgain, removed, s:Count(), #s:Ids()
    `);
    A.equal(result[0], 3, 'ba mục hợp lệ được chọn');
    A.equal(result[1], 1, 'một id lạ bị từ chối');
    A.equal(result[2], 3);
    A.equal(result[3], 0, 'chọn lại những mục đã chọn thì không đổi gì');
    A.equal(result[4], 3, 'Clear trả về số mục đã bỏ');
    A.equal(result[5], 0);
    A.equal(result[6], 0);
  });

  suite.test('SEL-003: danh sách id theo khu vực khớp đúng số liệu danh mục', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Selection = __DER_REQ("Client/Core/Selection")
      return #Selection.AllCatalogIds(), #Selection.AreaIds("hotel"), #Selection.AreaIds("mines"),
             #Selection.AreaIds("rooms"), #Selection.AreaIds("events"), #Selection.AreaIds("all")
    `);
    A.deepEqual(result, [82, 23, 27, 3, 12, 82], 'số mục mỗi phạm vi phải khớp danh mục');
  });

  suite.test('SEL-004: bấm ô chọn trên UI làm mục được chọn và ô hiện dấu X', (t, A) => {
    const h = createRuntime();
    makeRadar(h);
    const result = h.eval(`
      local ui = _G.__DER_R.ui
      -- Bấm ô chọn của dòng đầu tiên (dòng đầu là mục đầu danh sách).
      local row = ui.rows[1]
      local entityId = row.entityId
      row.check.MouseButton1Click:Fire()
      local textAfter = row.check.Text
      local selectedCount = _G.__DER_R.selection:Count()
      -- Bấm lần nữa phải bỏ chọn.
      row.check.MouseButton1Click:Fire()
      return entityId, textAfter, selectedCount, row.check.Text, _G.__DER_R.selection:Count()
    `);
    A.equal(typeof result[0], 'string');
    A.equal(result[1], 'X', 'ô chọn phải hiện dấu X sau khi bấm');
    A.equal(result[2], 1, 'một mục được chọn');
    A.equal(result[3], '', 'bấm lần nữa thì dấu X biến mất');
    A.equal(result[4], 0);
  });

  suite.test('SEL-005: "Chọn tất cả" chỉ chọn TRONG PHẠM VI đang xem', (t, A) => {
    const h = createRuntime();
    makeRadar(h);
    const result = h.eval(`
      _G.__DER_R:SetTab("rooms")
      local changed = _G.__DER_R:SelectScope(true)
      local roomsSelected = _G.__DER_R.selection:Count()
      local rushSelected = _G.__DER_R.selection:IsSelected("rush")
      _G.__DER_R:SetTab("hotel")
      local changedHotel = _G.__DER_R:SelectScope(true)
      return changed, roomsSelected, rushSelected, changedHotel, _G.__DER_R.selection:Count()
    `);
    A.equal(result[0], 3, 'tab Rooms chỉ có 3 mục');
    A.equal(result[1], 3, 'chọn tất cả trong tab Rooms KHÔNG được chọn cả danh mục');
    A.equal(result[2], false, 'Rush (Hotel) không bị chọn lây');
    A.equal(result[3], 23, 'tab Hotel thêm 23 mục');
    A.equal(result[4], 26, 'tổng = 3 + 23');
  });

  suite.test('SEL-006: "Chọn tất cả khu vực" chọn đủ 82 mục; "Bỏ chọn toàn bộ" về 0', (t, A) => {
    const h = createRuntime();
    makeRadar(h);
    const result = h.eval(`
      local added = _G.__DER_R:SelectAllAreas()
      local count = _G.__DER_R.selection:Count()
      local removed = _G.__DER_R:ClearSelection()
      return added, count, removed, _G.__DER_R.selection:Count(), _G.__DER_R:TrackedCount()
    `);
    A.equal(result[0], 82);
    A.equal(result[1], 82);
    A.equal(result[2], 82);
    A.equal(result[3], 0);
    A.equal(result[4], 0, 'bỏ chọn toàn bộ thì cũng ngừng theo dõi toàn bộ');
  });

  suite.test('SEL-007: lựa chọn GIỮ NGUYÊN khi chuyển tab và khi tìm kiếm', (t, A) => {
    const h = createRuntime();
    makeRadar(h);
    const result = h.eval(`
      _G.__DER_R:SetTab("hotel")
      _G.__DER_R:ToggleSelect("rush")
      _G.__DER_R:ToggleSelect("eyes")
      local beforeCount = _G.__DER_R.selection:Count()
      _G.__DER_R:SetTab("mines")
      local afterTab = _G.__DER_R.selection:Count()
      local stillRush = _G.__DER_R.selection:IsSelected("rush")
      _G.__DER_R:SetQuery("screech")
      local afterSearch = _G.__DER_R.selection:Count()
      -- Ô tìm kiếm vẫn áp dụng trên tab "Đã chọn" (đúng hành vi của ô tìm kiếm).
      _G.__DER_R:SetTab("selected")
      local filteredBySearch = _G.__DER_R.ui:Stats().renderedRows
      _G.__DER_R:SetQuery("")
      local renderedRows = _G.__DER_R.ui:Stats().renderedRows
      return beforeCount, afterTab, stillRush, afterSearch, filteredBySearch, renderedRows, _G.__DER_R.ui:ActiveTab()
    `);
    A.equal(result[0], 2);
    A.equal(result[1], 2, 'đổi tab không được làm mất lựa chọn');
    A.equal(result[2], true);
    A.equal(result[3], 2, 'tìm kiếm không được làm mất lựa chọn');
    A.equal(result[4], 0, 'từ khoá "screech" không khớp mục nào trong 2 mục đã chọn');
    A.equal(result[5], 2, 'xoá từ khoá thì tab "Đã chọn" liệt kê đúng 2 mục');
    A.equal(result[6], 'selected');
  });

  suite.test('SEL-008: bộ lọc Đã chọn / Chưa chọn / Tất cả đổi số dòng hiển thị', (t, A) => {
    const h = createRuntime();
    makeRadar(h);
    const result = h.eval(`
      _G.__DER_R:SelectAllAreas()
      local allRows = _G.__DER_R.ui:Stats().renderedRows
      _G.__DER_R:SetSelectionFilter("selected")
      local selectedRows = _G.__DER_R.ui:Stats().renderedRows
      _G.__DER_R:ClearSelection()
      local stillSelectedFilter = _G.__DER_R.ui:Stats().renderedRows
      _G.__DER_R:SetSelectionFilter("unselected")
      local unselectedRows = _G.__DER_R.ui:Stats().renderedRows
      _G.__DER_R:SetSelectionFilter("all")
      local backToAll = _G.__DER_R.ui:Stats().renderedRows
      local okBad, msgBad = _G.__DER_R:SetSelectionFilter("khong_ton_tai")
      return allRows, selectedRows, stillSelectedFilter, unselectedRows, backToAll, okBad, tostring(msgBad)
    `);
    A.equal(result[0], 40, 'không lọc: dựng tối đa 40 dòng');
    A.equal(result[1], 40, 'đã chọn hết nên bộ lọc "Đã chọn" vẫn 40 dòng');
    A.equal(result[2], 0, 'bỏ chọn hết thì bộ lọc "Đã chọn" không còn dòng nào');
    A.equal(result[3], 40, 'bộ lọc "Chưa chọn" hiện lại toàn bộ');
    A.equal(result[4], 40);
    A.equal(result[5], false, 'bộ lọc lạ phải bị từ chối');
    A.matches(result[6], /Bộ lọc lạ/);
  });

  suite.test('SEL-009: thao tác chọn KHÔNG tạo thêm connection hay bản sao giao diện', (t, A) => {
    const h = createRuntime();
    makeRadar(h);
    const result = h.eval(`
      local Registry = __DER_REQ("Client/Core/Registry")
      local playerGui = game:GetService("Players").LocalPlayer.PlayerGui
      local c0, i0 = Registry.ConnectionCount(), Registry.InstanceCount()
      local gui0 = #playerGui:GetChildren()
      _G.__DER_R:SelectAllAreas()
      _G.__DER_R:ToggleSelect("rush")
      _G.__DER_R:SetSelectionFilter("selected")
      for _ = 1, 20 do
        _G.__DER_R:ToggleSelect("ambush")
        _G.__DER_R:SetTab("mines")
        _G.__DER_R:SetTab("hotel")
      end
      _G.__DER_R:ClearSelection()
      return Registry.ConnectionCount() - c0, Registry.InstanceCount() - i0,
             #playerGui:GetChildren() - gui0, _G.__DER_R.ui:Stats().widgetsCreated > 0
    `);
    A.equal(result[0], 0, 'không được tạo thêm connection khi chọn/chuyển tab');
    A.equal(result[1], 0, 'không được tạo thêm instance GUI');
    A.equal(result[2], 0, 'không được tạo ScreenGui thứ hai');
    A.equal(result[3], true);
  });

  suite.test('SEL-010: theo dõi chỉ áp dụng cho mục CÓ cơ chế phát hiện', (t, A) => {
    const h = createRuntime();
    makeRadar(h);
    const result = h.eval(`
      local okRush, tracked = _G.__DER_R:ToggleTrack("rush")
      local okHide, msgHide = _G.__DER_R:ToggleTrack("hide")
      local count = _G.__DER_R:TrackedCount()
      local focusInTracker = _G.__DER_R.tracker:IsFocused("rush")
      local okAgain, trackedAgain = _G.__DER_R:ToggleTrack("rush")
      return okRush, tracked, okHide, tostring(msgHide), count, focusInTracker, okAgain, trackedAgain,
             _G.__DER_R:TrackedCount(), _G.__DER_R.tracker:IsFocused("rush")
    `);
    A.equal(result[0], true);
    A.equal(result[1], true, 'bật theo dõi Rush');
    A.equal(result[2], false, 'Hide không có cơ chế phát hiện nên không theo dõi được');
    A.matches(result[3], /không có cơ chế phát hiện/);
    A.equal(result[4], 1);
    A.equal(result[5], true, 'Tracker phải biết mục nào đang được theo dõi');
    A.equal(result[6], true);
    A.equal(result[7], false, 'toggle lần hai = tắt');
    A.equal(result[8], 0);
    A.equal(result[9], false);
  });

  suite.test('SEL-011: theo dõi nhóm theo lựa chọn, và tự tắt khi bỏ chọn', (t, A) => {
    const h = createRuntime();
    makeRadar(h);
    const result = h.eval(`
      _G.__DER_R:SetTab("hotel")
      _G.__DER_R:SelectScope(true)
      local applied, skipped = _G.__DER_R:SetTrackedForSelection(true)
      local tracked = _G.__DER_R:TrackedCount()
      -- Bỏ chọn một mục đang theo dõi -> mục đó phải ngừng được theo dõi.
      _G.__DER_R:ToggleSelect("rush")
      local afterUnselect = _G.__DER_R:TrackedCount()
      local rushFocused = _G.__DER_R.tracker:IsFocused("rush")
      return applied, skipped, tracked, afterUnselect, rushFocused
    `);
    A.equal(result[0], 22, 'theo dõi được 22/23 mục của Hotel');
    A.equal(result[1], 1, 'Hide bị bỏ qua vì không có cơ chế phát hiện từ client');
    A.equal(result[2], 22);
    A.equal(result[3], 21, 'bỏ chọn thì ngừng theo dõi mục đó');
    A.equal(result[4], false);
  });

  suite.test('SEL-012: mục đang theo dõi được ghi nhật ký khi THẬT SỰ xuất hiện', (t, A) => {
    const h = createRuntime({ player: { x: 0, y: 0, z: 0 } });
    makeRadar(h, 'Shared_Config.Detection.confirmedPatterns = { "Rush" }');
    h.eval('_G.__DER_R:ToggleTrack("rush")');
    A.equal(h.countLogs(/\[THEO DÕI\]/), 0, 'chưa thấy gì thì chưa được ghi nhật ký');

    h.spawn('Rush', 25, 0, 0, 'Model');
    h.advance(1.0);
    const seen = h.findLog(/\[THEO DÕI\] Thấy Rush/);
    A.notEqual(seen, null, 'phải ghi nhật ký khi mục theo dõi xuất hiện');
    A.matches(seen, /25\.0 stud/, 'nhật ký phải ghi khoảng cách đọc được từ instance thật');

    h.removeLastSpawn();
    h.advance(1.0);
    A.notEqual(h.findLog(/\[THEO DÕI\] Không còn thấy Rush/), null, 'phải báo khi mục biến mất');
  });

  suite.test('SEL-014: nút "Theo dõi mục đã chọn" bật/tắt theo dõi CẢ NHÓM', (t, A) => {
    const h = createRuntime();
    makeRadar(h);
    const result = h.eval(`
      local ui = _G.__DER_R.ui
      _G.__DER_R:SetTab("rooms")
      _G.__DER_R:SelectScope(true)
      local labelBefore = ui.parts.trackSelectionButton.Text
      ui.parts.trackSelectionButton.MouseButton1Click:Fire()
      local labelAfter = ui.parts.trackSelectionButton.Text
      local tracked = _G.__DER_R:TrackedCount()
      local a60 = _G.__DER_R:IsTracked("a60")
      ui.parts.trackSelectionButton.MouseButton1Click:Fire()
      return labelBefore, labelAfter, tracked, a60, _G.__DER_R:TrackedCount(),
             ui.parts.trackSelectionButton.Text
    `);
    A.equal(result[0], 'Theo dõi mục đã chọn');
    A.equal(result[1], 'Ngừng theo dõi', 'nhãn phải đổi sau khi bật theo dõi nhóm');
    A.equal(result[2], 3, 'cả 3 mục của Rooms được theo dõi');
    A.equal(result[3], true);
    A.equal(result[4], 0, 'bấm lần nữa thì ngừng theo dõi cả nhóm');
    A.equal(result[5], 'Theo dõi mục đã chọn');
  });

  suite.test('SEL-013: bảng chi tiết có nút chọn và nút theo dõi hoạt động thật', (t, A) => {
    const h = createRuntime();
    makeRadar(h);
    const result = h.eval(`
      local ui = _G.__DER_R.ui
      _G.__DER_R:Select("figure")
      local selectLabel1 = ui.parts.detailSelectButton.Text
      local trackLabel1 = ui.parts.detailTrackButton.Text
      ui.parts.detailSelectButton.MouseButton1Click:Fire()
      local selectLabel2 = ui.parts.detailSelectButton.Text
      local selected = _G.__DER_R.selection:IsSelected("figure")
      ui.parts.detailTrackButton.MouseButton1Click:Fire()
      local trackLabel3 = ui.parts.detailTrackButton.Text
      local tracked = _G.__DER_R:IsTracked("figure")
      local bodyHasTrackLine = string.find(ui.parts.detailBody.Text, "Theo dõi: BẬT", 1, true) ~= nil
      return selectLabel1, trackLabel1, selectLabel2, selected, trackLabel3, tracked, bodyHasTrackLine
    `);
    A.equal(result[0], 'Chọn');
    A.equal(result[1], 'Theo dõi');
    A.equal(result[2], 'Bỏ chọn', 'nhãn nút phải đổi theo trạng thái thật');
    A.equal(result[3], true, 'nút chọn phải chọn thật');
    A.equal(result[4], 'Ngừng theo dõi');
    A.equal(result[5], true, 'nút theo dõi phải bật thật');
    A.equal(result[6], true, 'bảng chi tiết phải nói rõ đang theo dõi');
  });
};
