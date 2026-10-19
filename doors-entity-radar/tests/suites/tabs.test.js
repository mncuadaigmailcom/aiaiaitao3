'use strict';
/**
 * doors-entity-radar/tests/suites/tabs.test.js
 *
 * Kiểm chứng HỆ THỐNG TAB và các hành vi cửa sổ:
 *   * đủ tab, đúng nhãn, tab mặc định đúng;
 *   * CHUYỂN TAB KHÔNG DỰNG LẠI GÌ (số widget không tăng, không có GUI thứ hai);
 *   * mỗi tab hiện đúng nội dung của nó;
 *   * chỉ MỘT trang hiển thị tại một thời điểm;
 *   * tab lạ bị từ chối;
 *   * thu nhỏ / mở lại;
 *   * kéo thả bảng (mô phỏng input chuột/cảm ứng);
 *   * tab Cài đặt đổi được hành vi thật (và dựng lại UI không nhân đôi);
 *   * tab Nhật ký hiện đúng dòng và xoá được;
 *   * dọn dẹp tài nguyên.
 */

const { createRuntime, P } = require('../lib/runtime');

/** Radar đã Start (UI dựng sẵn, tab mặc định). */
function makeRadar(h, configLua = '') {
  return h.eval(`
    local Shared_Config = __DER_REQ("Shared/Config")
    ${configLua}
    local Radar = __DER_REQ("Client/Radar")
    _G.__DER_R = Radar.new(Shared_Config)
    _G.__DER_R:Start()
    return _G.__DER_R:State()
  `)[0];
}

/** Đếm nhãn các nút tab theo đúng thứ tự cấu hình. */
function tabLabels(h) {
  return h.eval(`
    local Shared_Config = __DER_REQ("Shared/Config")
    local ui = _G.__DER_R.ui
    local out = {}
    for _, tab in ipairs(Shared_Config.Ui.TABS) do
      local button = ui.tabButtons[tab.id]
      out[#out + 1] = tab.id .. "=" .. (button ~= nil and button.Text or "THIẾU")
    end
    return table.concat(out, ",")
  `)[0];
}

module.exports = function tabsSuite(suite) {
  suite.test('TAB-001: đủ 13 tab, đúng nhãn, tab mặc định là Trang chủ', (t, A) => {
    const h = createRuntime();
    makeRadar(h);
    const labels = tabLabels(h);
    A.matches(labels, /home=Trang chủ/);
    A.matches(labels, /all=Tất cả/);
    A.matches(labels, /hotel=The Hotel/);
    A.matches(labels, /mines=The Mines/);
    A.matches(labels, /backdoor=The Backdoor/);
    A.matches(labels, /archives=The Archives/);
    A.matches(labels, /outdoors=The Outdoors/);
    A.matches(labels, /stairwell=The Stairwell/);
    A.matches(labels, /rooms=The Rooms/);
    A.matches(labels, /events=Sự kiện đặc biệt/);
    A.matches(labels, /selected=Đã chọn/);
    A.matches(labels, /settings=Cài đặt/);
    A.matches(labels, /log=Nhật ký/);
    A.equal(labels.split(',').length, 13, 'phải có đúng 13 nút tab');
    A.equal(labels.includes('THIẾU'), false, 'không tab nào thiếu nút');

    const state = h.eval(`
      local ui = _G.__DER_R.ui
      return ui:ActiveTab(), ui.pages.home.Visible, ui.pages.list.Visible,
             ui.pages.settings.Visible, ui.pages.log.Visible
    `);
    A.equal(state[0], 'home', 'tab mặc định phải là Trang chủ');
    A.deepEqual([state[1], state[2], state[3], state[4]], [true, false, false, false],
      'chỉ trang Trang chủ được hiện');
  });

  suite.test('TAB-002: chuyển tab KHÔNG dựng lại widget, KHÔNG tạo GUI thứ hai', (t, A) => {
    const h = createRuntime();
    makeRadar(h);
    const result = h.eval(`
      local ui = _G.__DER_R.ui
      local Registry = __DER_REQ("Client/Core/Registry")
      local playerGui = game:GetService("Players").LocalPlayer.PlayerGui
      local created0 = ui:Stats().widgetsCreated
      local gui0 = #playerGui:GetChildren()
      local connections0 = Registry.ConnectionCount()
      local instances0 = Registry.InstanceCount()
      local Shared_Config = __DER_REQ("Shared/Config")
      for round = 1, 3 do
        for _, tab in ipairs(Shared_Config.Ui.TABS) do
          ui:SetTab(tab.id)
        end
      end
      local stats = ui:Stats()
      return stats.widgetsCreated - created0, #playerGui:GetChildren() - gui0,
             Registry.ConnectionCount() - connections0, Registry.InstanceCount() - instances0,
             stats.tabSwitches
    `);
    A.equal(result[0], 0, 'chuyển tab không được tạo thêm widget nào');
    A.equal(result[1], 0, 'không được tạo ScreenGui thứ hai');
    A.equal(result[2], 0, 'không được nối thêm connection');
    A.equal(result[3], 0, 'không được tạo thêm instance');
    // 1 lần gán tab lúc Build + 3 vòng x 13 tab, trừ 1 lần bấm lại đúng tab
    // đang mở (vòng 1 bắt đầu ở "home"): 1 + (12 + 13 + 13) = 39.
    A.equal(result[4], 39, 'phải đếm đúng số lần trang hiển thị thay đổi');
  });

  suite.test('TAB-003: mỗi tab hiển thị đúng nội dung của nó', (t, A) => {
    const h = createRuntime();
    makeRadar(h);
    const result = h.eval(`
      local ui = _G.__DER_R.ui
      _G.__DER_R:ToggleSelect("rush")
      _G.__DER_R:ToggleSelect("eyes")
      local out = {}
      local function rendered(tabId)
        _G.__DER_R:SetTab(tabId)
        return ui:Stats().renderedRows
      end
      out.all = rendered("all")
      out.hotel = rendered("hotel")
      out.rooms = rendered("rooms")
      out.events = rendered("events")
      out.selected = rendered("selected")
      _G.__DER_R:SetTab("home")
      out.home = ui:Stats().renderedRows
      out.homeText = ui.parts.homeCounts.Text
      _G.__DER_R:SetTab("settings")
      local toggles = 0
      for _ in pairs(ui.settingButtons) do toggles = toggles + 1 end
      out.settings = ui:Stats().renderedRows
      out.toggleCount = toggles
      _G.__DER_R:SetTab("log")
      out.log = ui:Stats().renderedRows
      out.logHasContent = string.len(ui.parts.logBody.Text) > 10
      return out.all, out.hotel, out.rooms, out.events, out.selected, out.home,
             out.settings, out.log, out.toggleCount, out.logHasContent,
             string.find(out.homeText, "Danh mục: 82 thực thể", 1, true) ~= nil
    `);
    A.equal(result[0], 40, 'tab Tất cả: dựng tối đa 40 dòng');
    A.equal(result[1], 23, 'tab The Hotel: 23 mục');
    A.equal(result[2], 3, 'tab The Rooms: 3 mục');
    A.equal(result[3], 12, 'tab Sự kiện: 12 mục');
    A.equal(result[4], 2, 'tab Đã chọn: đúng 2 mục đã chọn');
    A.equal(result[5], 0, 'tab Trang chủ không dựng dòng danh sách');
    A.equal(result[6], 0, 'tab Cài đặt không dựng dòng danh sách');
    A.equal(result[7], 0, 'tab Nhật ký không dựng dòng danh sách');
    A.equal(result[8], 9, 'tab Cài đặt có 9 công tắc');
    A.equal(result[9], true, 'tab Nhật ký phải có nội dung');
    A.equal(result[10], true, 'Trang chủ phải nói đúng quy mô danh mục');
  });

  suite.test('TAB-004: chỉ MỘT trang được hiện tại một thời điểm', (t, A) => {
    const h = createRuntime();
    makeRadar(h);
    const result = h.eval(`
      local ui = _G.__DER_R.ui
      local Shared_Config = __DER_REQ("Shared/Config")
      local bad = {}
      for _, tab in ipairs(Shared_Config.Ui.TABS) do
        ui:SetTab(tab.id)
        local visibleCount = 0
        for _, page in pairs(ui.pages) do
          if page.Visible then visibleCount = visibleCount + 1 end
        end
        if visibleCount ~= 1 then
          bad[#bad + 1] = tab.id .. ":" .. visibleCount
        end
      end
      return #bad, table.concat(bad, ",")
    `);
    A.equal(result[0], 0, 'mọi tab phải hiện đúng một trang: ' + String(result[1]));
  });

  suite.test('TAB-005: tab lạ bị từ chối và không làm đổi tab hiện tại', (t, A) => {
    const h = createRuntime();
    makeRadar(h);
    const result = h.eval(`
      local ui = _G.__DER_R.ui
      local ok, message = ui:SetTab("khong_ton_tai")
      local okRadar, messageRadar = _G.__DER_R:SetTab("cung_khong_ton_tai")
      return ok, tostring(message), ui:ActiveTab(), okRadar, tostring(messageRadar), _G.__DER_R:ActiveTab()
    `);
    A.equal(result[0], false);
    A.matches(result[1], /Không có tab/);
    A.equal(result[2], 'home', 'tab hiện tại phải giữ nguyên');
    A.equal(result[3], false);
    A.matches(result[4], /Không có tab/);
    A.equal(result[5], 'home');
  });

  suite.test('TAB-006: thu nhỏ và mở lại không phá trạng thái', (t, A) => {
    const h = createRuntime();
    makeRadar(h);
    const result = h.eval(`
      local ui = _G.__DER_R.ui
      _G.__DER_R:ToggleSelect("rush")
      local heightBefore = ui.parts.panel.Size.Y.Offset
      ui:SetMinimized(true)
      local heightMin = ui.parts.panel.Size.Y.Offset
      local bodyHidden = ui.parts.body.Visible == false
      local tabHidden = ui.parts.tabBar.Visible == false
      local labelMin = ui.parts.minimizeButton.Text
      local stillSelected = _G.__DER_R.selection:Count()
      ui:ToggleMinimized()
      return heightBefore, heightMin, bodyHidden, tabHidden, labelMin, stillSelected,
             ui.parts.panel.Size.Y.Offset, ui:IsMinimized(), ui.parts.minimizeButton.Text,
             _G.__DER_R.selection:Count()
    `);
    A.equal(result[0], 520, 'chiều cao mặc định');
    A.equal(result[1], 46, 'thu nhỏ chỉ còn thanh tiêu đề');
    A.equal(result[2], true, 'thân bảng phải ẩn');
    A.equal(result[3], true, 'thanh tab phải ẩn');
    A.equal(result[4], '+', 'nút thu nhỏ đổi thành dấu +');
    A.equal(result[5], 1, 'thu nhỏ không được làm mất lựa chọn');
    A.equal(result[6], 520, 'mở lại đúng chiều cao cũ');
    A.equal(result[7], false);
    A.equal(result[8], '—');
    A.equal(result[9], 1);
  });

  suite.test('TAB-007: kéo thả bảng bằng chuột (và buông ra thì dừng)', (t, A) => {
    const h = createRuntime();
    makeRadar(h);
    const result = h.eval(`
      local ui = _G.__DER_R.ui
      local uis = game:GetService("UserInputService")
      local mouseType = Enum.UserInputType.MouseButton1
      local before = ui.parts.panel.Position
      local x0, y0 = before.X.Offset, before.Y.Offset
      -- Bấm giữ trên thanh tiêu đề.
      ui.parts.header.InputBegan:Fire({ UserInputType = mouseType, Position = { X = 100, Y = 100 } }, false)
      -- Di chuyển +60, +40.
      uis.InputChanged:Fire({ UserInputType = mouseType, Position = { X = 160, Y = 140 } }, false)
      local during = ui.parts.panel.Position
      local x1, y1 = during.X.Offset, during.Y.Offset
      -- Buông chuột: kéo tiếp không được đổi vị trí.
      uis.InputEnded:Fire({ UserInputType = mouseType, Position = { X = 160, Y = 140 } }, false)
      uis.InputChanged:Fire({ UserInputType = mouseType, Position = { X = 400, Y = 400 } }, false)
      local after = ui.parts.panel.Position
      return x0, y0, x1, y1, after.X.Offset, after.Y.Offset, ui:Stats().drags
    `);
    A.equal(result[2] - result[0], 60, 'bảng phải dịch đúng 60px theo trục X');
    A.equal(result[3] - result[1], 40, 'bảng phải dịch đúng 40px theo trục Y');
    A.equal(result[4], result[2], 'sau khi buông chuột thì không được dịch tiếp');
    A.equal(result[5], result[3]);
    A.equal(result[6], 1, 'chỉ một lần kéo được ghi nhận');
  });

  suite.test('TAB-008: tab Cài đặt đổi hành vi thật; dựng lại UI không nhân đôi', (t, A) => {
    const h = createRuntime();
    makeRadar(h);
    const result = h.eval(`
      local ui = _G.__DER_R.ui
      _G.__DER_R:ToggleSelect("rush")
      local withCounters = ui.parts.statusLabel.Text
      -- Tắt bộ đếm: thanh trạng thái không được còn chữ "Phát hiện".
      _G.__DER_R:ApplySetting("Ui.showCounters", false)
      local withoutCounters = ui.parts.statusLabel.Text
      -- Đổi tuỳ chọn CẤU TRÚC: UI phải dựng lại nhưng chỉ có MỘT ScreenGui.
      local playerGui = game:GetService("Players").LocalPlayer.PlayerGui
      _G.__DER_R:ApplySetting("Ui.showTabs", false)
      local guiCount = #playerGui:GetChildren()
      local newUi = _G.__DER_R.ui
      local tabGone = newUi.parts.tabBar == nil
      local keptSelection = _G.__DER_R.selection:Count()
      local keptOk = newUi:IsBuilt()
      -- Bật lại tab: mọi thứ trở về như cũ.
      _G.__DER_R:ApplySetting("Ui.showTabs", true)
      local tabBack = _G.__DER_R.ui.parts.tabBar ~= nil
      local okBad, messageBad = _G.__DER_R:ApplySetting("Ui.khongTonTai", true)
      return string.find(withCounters, "Phát hiện", 1, true) ~= nil,
             string.find(withoutCounters, "Phát hiện", 1, true) == nil,
             guiCount, tabGone, keptSelection, keptOk, tabBack,
             #playerGui:GetChildren(), okBad, tostring(messageBad)
    `);
    A.equal(result[0], true, 'ban đầu thanh trạng thái có bộ đếm');
    A.equal(result[1], true, 'tắt bộ đếm thì bộ đếm biến mất');
    A.equal(result[2], 1, 'dựng lại UI không được để lại hai ScreenGui');
    A.equal(result[3], true, 'tắt thanh tab thì không tạo thanh tab');
    A.equal(result[4], 1, 'dựng lại UI phải GIỮ lựa chọn');
    A.equal(result[5], true);
    A.equal(result[6], true, 'bật lại thì thanh tab trở về');
    A.equal(result[7], 1);
    A.equal(result[8], false, 'tuỳ chọn lạ phải bị từ chối');
    A.matches(result[9], /Không nhận ra tuỳ chọn/);
  });

  suite.test('TAB-009: tab Nhật ký hiện đúng dòng và xoá được', (t, A) => {
    const h = createRuntime();
    makeRadar(h);
    const result = h.eval(`
      local Log = __DER_REQ("Shared/Log")
      Log.Info("dòng kiểm thử một")
      Log.Warn("dòng kiểm thử hai")
      _G.__DER_R:SetTab("log")
      local text = _G.__DER_R.ui.parts.logBody.Text
      local hasOne = string.find(text, "dòng kiểm thử một", 1, true) ~= nil
      local hasTwo = string.find(text, "dòng kiểm thử hai", 1, true) ~= nil
      local removed = _G.__DER_R:ClearLog()
      local textAfter = _G.__DER_R.ui.parts.logBody.Text
      return hasOne, hasTwo, removed > 0, string.find(textAfter, "dòng kiểm thử một", 1, true) == nil,
             string.len(textAfter) < 40
    `);
    A.equal(result[0], true, 'nhật ký phải hiện dòng info');
    A.equal(result[1], true, 'nhật ký phải hiện dòng cảnh báo');
    A.equal(result[2], true, 'ClearLog phải báo số dòng đã xoá');
    A.equal(result[3], true, 'sau khi xoá thì dòng cũ biến mất');
    A.equal(result[4], true);
  });

  suite.test('TAB-011: kéo quá xa thì bảng bị KẸP lại trong màn hình', (t, A) => {
    const h = createRuntime();
    makeRadar(h);
    // Màn hình 1280x720, bảng 760x520 -> offset tối đa: X = (1280-760)/2 = 260,
    // Y = (720-520)/2 = 100.
    const result = h.eval(`
      local ui = _G.__DER_R.ui
      local uis = game:GetService("UserInputService")
      local mouseType = Enum.UserInputType.MouseButton1
      ui.parts.header.InputBegan:Fire({ UserInputType = mouseType, Position = { X = 10, Y = 10 } }, false)
      uis.InputChanged:Fire({ UserInputType = mouseType, Position = { X = 5000, Y = 5000 } }, false)
      local far = ui.parts.panel.Position
      local farX, farY = far.X.Offset, far.Y.Offset
      uis.InputChanged:Fire({ UserInputType = mouseType, Position = { X = -9000, Y = -9000 } }, false)
      local near = ui.parts.panel.Position
      uis.InputEnded:Fire({ UserInputType = mouseType, Position = { X = -9000, Y = -9000 } }, false)
      return farX, farY, near.X.Offset, near.Y.Offset
    `);
    A.equal(result[0], 260, 'không được vượt mép phải màn hình');
    A.equal(result[1], 100, 'không được vượt mép dưới màn hình');
    A.equal(result[2], -260, 'không được vượt mép trái màn hình');
    A.equal(result[3], -100, 'không được vượt mép trên màn hình');
  });

  suite.test('TAB-010: mở/đóng bảng không nhân đôi tài nguyên; huỷ thì về 0', (t, A) => {
    const h = createRuntime();
    makeRadar(h);
    const result = h.eval(`
      local Registry = __DER_REQ("Client/Core/Registry")
      local playerGui = game:GetService("Players").LocalPlayer.PlayerGui
      for _ = 1, 5 do
        _G.__DER_R:SetVisible(false)
        _G.__DER_R:SetVisible(true)
      end
      local connections = Registry.ConnectionCount()
      local instances = Registry.InstanceCount()
      local guiCount = #playerGui:GetChildren()
      _G.__DER_R:Destroy()
      return connections, instances, guiCount,
             Registry.ConnectionCount(), Registry.InstanceCount(),
             playerGui:FindFirstChild("DoorsEntityRadar") == nil
    `);
    A.greaterThan(result[0], 0, 'hệ thống đang chạy phải có connection');
    A.greaterThan(result[1], 0, 'giao diện phải có instance');
    A.equal(result[2], 1, 'chỉ có MỘT ScreenGui dù mở/đóng nhiều lần');
    A.equal(result[3], 0, 'huỷ xong thì connection về 0');
    A.equal(result[4], 0, 'huỷ xong thì instance về 0');
    A.equal(result[5], true, 'ScreenGui phải biến mất khỏi PlayerGui');
  });
};
