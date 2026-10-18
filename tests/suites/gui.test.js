'use strict';
/**
 * tests/suites/gui.test.js
 * ===== RALO.METHODS: GUI-001, GUI-002, GUI-003, GUI-004, GUI-005, GUI-006,
 *                     GUI-007, GUI-009, GUI-010, GUI-011, GUI-012, GUI-013,
 *                     FPS-002, LOWEND-004 =====
 *
 * Kiểm chứng GUI thông báo theo đặc tả Part 6 & Part 7.
 *
 * GIỚI HẠN: harness không render pixel. Nó kiểm chứng được CẤU TRÚC
 * instance, property, vòng đời và số connection — KHÔNG kiểm chứng được
 * GUI trông ra sao. Phần đó bạn phải xem trong Studio (docs/04-kiem-thu.md).
 */

const { createRuntime } = require('../lib/runtime');

/** Dựng GUI với PlayerGui thật trong mock. */
const BUILD = (durationSeconds = 30) => `
  local players = game:GetService("Players")
  local player = players.LocalPlayer or Instance.new("Player")
  player.Name = "Tester"
  player.Parent = players
  local playerGui = Instance.new("PlayerGui")
  playerGui.Name = "PlayerGui"
  playerGui.Parent = player

  local Notifier = __RALO_REQ("Client/Ui/Notifier")
  _G.__RALO_GUI = Notifier.Build({
    parent = playerGui,
    profile = { gui = { durationSeconds = ${durationSeconds}, fadeSeconds = 0.1 } },
  })
  _G.__RALO_PLAYERGUI = playerGui
`;

/** Đếm instance theo ClassName trong một cây. */
const COUNT_BY_CLASS = (rootExpr) => `
  local function countByClass(root, className)
    local n = 0
    for _, d in ipairs(root:GetDescendants()) do
      if d.ClassName == className then n += 1 end
    end
    return n
  end
`;

module.exports = function guiSuite(suite) {
  suite.test('GUI-002: Build hai lần chỉ tạo MỘT GUI (không trùng lặp)', (t, A) => {
    const h = createRuntime();
    const out = h.eval(BUILD() + `
      local Notifier = __RALO_REQ("Client/Ui/Notifier")
      Notifier.Build({ parent = _G.__RALO_PLAYERGUI })
      Notifier.Build({ parent = _G.__RALO_PLAYERGUI })
      local screenGuis = 0
      for _, d in ipairs(_G.__RALO_PLAYERGUI:GetDescendants()) do
        if d.ClassName == "ScreenGui" then screenGuis += 1 end
      end
      return screenGuis .. "|" .. tostring(Notifier.Get() ~= nil)
    `)[0];
    const [screenGuis, hasInstance] = out.split('|');
    A.equal(screenGuis, '1', 'dù Build 3 lần, chỉ được có MỘT ScreenGui');
    A.equal(hasInstance, 'true', 'singleton phải tồn tại');
  });

  suite.test('GUI-001: ScreenGui có ResetOnSpawn = false', (t, A) => {
    const h = createRuntime();
    const out = h.eval(BUILD() + `
      local gui = _G.__RALO_PLAYERGUI:FindFirstChild("RALO_OptimizerNotifier")
      return tostring(gui ~= nil) .. "|" .. tostring(gui.ResetOnSpawn)
    `)[0];
    const [found, resetOnSpawn] = out.split('|');
    A.equal(found, 'true', 'GUI phải được đặt tên cố định để tìm lại được');
    A.equal(resetOnSpawn, 'false', 'ResetOnSpawn phải false để không dựng lại khi hồi sinh');
  });

  suite.test('GUI-010: khung có Active = false — KHÔNG kéo được', (t, A) => {
    const h = createRuntime();
    const out = h.eval(BUILD() + `
      local panel = _G.__RALO_PLAYERGUI:FindFirstChild("RALO_OptimizerNotifier")
        :FindFirstChild("RALO_Panel")
      return tostring(panel.Active) .. "|" .. tostring(panel.Selectable)
    `)[0];
    const [active, selectable] = out.split('|');
    A.equal(active, 'false', 'Active phải false để không nhận input kéo');
    A.equal(selectable, 'false', 'Selectable phải false');
  });

  suite.test('GUI-010: bảng cố định dưới-phải, nền xám trong suốt, bắt đầu ở 1%', (t, A) => {
    const h = createRuntime();
    const out = h.eval(BUILD() + `
      local panel = _G.__RALO_PLAYERGUI:FindFirstChild("RALO_OptimizerNotifier")
        :FindFirstChild("RALO_Panel")
      local status = panel:FindFirstChild("Status")
      local percent = panel:FindFirstChild("Percent")
      return panel.AnchorPoint.X .. "|" .. panel.AnchorPoint.Y
        .. "|" .. panel.Position.X.Scale .. "|" .. panel.Position.X.Offset
        .. "|" .. panel.Position.Y.Scale .. "|" .. panel.Position.Y.Offset
        .. "|" .. panel.BackgroundTransparency .. "|" .. status.Text .. "|" .. percent.Text
    `)[0];
    const [anchorX, anchorY, xScale, xOffset, yScale, yOffset, alpha, status, percent] = out.split('|');
    A.equal(anchorX, '1', 'AnchorPoint X phải neo vào mép phải');
    A.equal(anchorY, '1', 'AnchorPoint Y phải neo vào đáy');
    A.equal(xScale, '1', 'vị trí X phải tương đối theo mép phải');
    A.equal(xOffset, '-16', 'phải chừa lề bên phải');
    A.equal(yScale, '1', 'vị trí Y phải tương đối theo đáy');
    A.equal(yOffset, '-16', 'phải chừa lề dưới');
    A.equal(alpha, '0.42', 'nền xám phải bán trong suốt');
    A.equal(status, 'đang giảm lag', 'phải hiện đúng trạng thái đang giảm lag');
    A.equal(percent, '1%', 'phần trăm đầu tiên phải là 1%');
  });

  suite.test('GUI-010: không có menu, nút bấm hoặc thành phần kéo thả', (t, A) => {
    const h = createRuntime();
    const out = h.eval(BUILD() + `
      local panel = _G.__RALO_PLAYERGUI:FindFirstChild("RALO_OptimizerNotifier")
        :FindFirstChild("RALO_Panel")
      local buttons = 0
      for _, d in ipairs(panel:GetDescendants()) do
        if d.ClassName == "TextButton" then buttons += 1 end
      end
      return buttons .. "|" .. tostring(panel.Active) .. "|" .. tostring(panel.Selectable)
    `)[0];
    const [buttons, active, selectable] = out.split('|');
    A.equal(buttons, '0', 'bảng trạng thái không được có nút menu');
    A.equal(active, 'false', 'khung không nhận thao tác kéo');
    A.equal(selectable, 'false', 'khung không được chọn tương tác');
  });

  suite.test('GUI-003: viền cầu vồng dùng ColorSequenceKeypoint hợp lệ', (t, A) => {
    const h = createRuntime();
    const out = h.eval(BUILD() + `
      local panel = _G.__RALO_PLAYERGUI:FindFirstChild("RALO_OptimizerNotifier")
        :FindFirstChild("RALO_Panel")
      local stroke = panel:FindFirstChildOfClass("UIStroke")
      local gradient = stroke:FindFirstChildOfClass("UIGradient")
      local points = gradient.Color.Keypoints
      return #points .. "|" .. points[1].Time .. "|" .. points[#points].Time
    `)[0];
    const [count, first, last] = out.split('|');
    A.equal(count, '8', 'viền có đủ 8 mốc cầu vồng');
    A.equal(Number(first), 0, 'dải màu bắt đầu ở mốc 0');
    A.equal(Number(last), 1, 'dải màu kết thúc ở mốc 1');
  });

  suite.test('GUI-012: KHÔNG tạo bất kỳ instance Sound nào', (t, A) => {
    const h = createRuntime();
    const out = h.eval(BUILD() + COUNT_BY_CLASS('_G.__RALO_PLAYERGUI') + `
      return countByClass(_G.__RALO_PLAYERGUI, "Sound")
    `)[0];
    A.equal(Number(out), 0, 'GUI thông báo phải im lặng tuyệt đối');
  });

  suite.test('GUI-013: GUI nằm trong ScreenGui riêng, không đụng GUI khác', (t, A) => {
    const h = createRuntime();
    const out = h.eval(BUILD() + `
      -- GUI của GAME, dựng TRƯỚC
      local gameGui = Instance.new("ScreenGui")
      gameGui.Name = "GameHUD"
      gameGui.Parent = _G.__RALO_PLAYERGUI
      local gameLabel = Instance.new("TextLabel")
      gameLabel.Name = "Health"
      gameLabel.Text = "HP 100"
      gameLabel.Position = UDim2.new(0, 50, 0, 50)
      gameLabel.Parent = gameGui

      local Notifier = __RALO_REQ("Client/Ui/Notifier")
      Notifier.Build({ parent = _G.__RALO_PLAYERGUI })

      local stillThere = _G.__RALO_PLAYERGUI:FindFirstChild("GameHUD") ~= nil
      local label = gameGui:FindFirstChild("Health")
      local posUntouched = label.Position.X.Offset == 50 and label.Position.Y.Offset == 50
      return tostring(stillThere) .. "|" .. tostring(posUntouched)
    `)[0];
    const [stillThere, posUntouched] = out.split('|');
    A.equal(stillThere, 'true', 'GUI của game phải còn nguyên');
    A.equal(posUntouched, 'true', 'vị trí GUI của game không được thay đổi');
  });

  suite.test('GUI-005: cây GUI gọn, không phình quá mốc đã đo', (t, A) => {
    const h = createRuntime();
    const out = h.eval(BUILD() + `
      local Notifier = __RALO_REQ("Client/Ui/Notifier")
      return Notifier.Get():State().nodes
    `)[0];
    const nodes = Number(out);
    // Bảng tối giản: 4 đối tượng hiển thị + khung, thanh tiến trình,
    // viền/gradient và các modifier bố cục; không có bảng kết quả hay nút.
    A.greaterThan(nodes, 8, 'bảng phải có đủ trạng thái, thanh và phần trăm');
    A.lessThan(nodes, 18, 'bảng vượt 17 node; tránh phình giao diện');
  });

  suite.test('Part 7: phần trăm KHÔNG BAO GIỜ vượt 100 dù chạy rất lâu', (t, A) => {
    const h = createRuntime();
    // durationSeconds = 0 nghĩa là KHÔNG tự ẩn, nên GUI còn đó để đọc
    // percent sau khi đồng hồ đã chạy rất lâu.
    h.eval(BUILD(0));
    h.advance(120);                    // 120 giây đồng hồ ảo
    const percent = h.eval(`
      local Notifier = __RALO_REQ("Client/Ui/Notifier")
      local g = Notifier.Get()
      return g and g:State().percent or -1
    `)[0];
    A.equal(Number(percent), 100, 'phần trăm phải DỪNG ở 100, không vượt');

    // Và với GUI có thời lượng: đọc ngay TRƯỚC khi ẩn
    const h2 = createRuntime();
    h2.eval(BUILD(30));
    h2.advance(15);
    const middle = h2.eval(`
      local Notifier = __RALO_REQ("Client/Ui/Notifier")
      local g = Notifier.Get()
      return g and g:State().percent or -1
    `)[0];
    h2.advance(14.9);
    const nearEnd = h2.eval(`
      local Notifier = __RALO_REQ("Client/Ui/Notifier")
      local g = Notifier.Get()
      return g and g:State().percent or -1
    `)[0];
    A.inRange(Number(middle), 45, 55, 'ở nửa thời lượng, tiến trình phải ở khoảng 50%');
    A.inRange(Number(nearEnd), 99, 100, 'gần hết thời lượng phải đạt 99–100% mà không vượt');
  });

  suite.test('Part 7: ClampPercent chặn mọi giá trị ngoài 0..100', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Notifier = __RALO_REQ("Client/Ui/Notifier")
      return Notifier.ClampPercent(150) .. "|" .. Notifier.ClampPercent(-20)
        .. "|" .. Notifier.ClampPercent(0/0) .. "|" .. Notifier.ClampPercent(42.6)
    `)[0];
    A.equal(out, '100|0|0|43', 'phải kẹp trên, kẹp dưới, NaN->0, làm tròn');
  });

  suite.test('Part 7: hết thời lượng thì GUI tự ẩn và dọn sạch', (t, A) => {
    const h = createRuntime();
    h.eval(BUILD(1));
    h.advance(0.5);
    const beforeHide = h.eval(`
      local N = __RALO_REQ("Client/Ui/Notifier")
      return tostring(N.Get() ~= nil)
    `)[0];
    h.advance(3);                       // vượt thời lượng 1 giây
    const afterHide = h.eval(`
      local N = __RALO_REQ("Client/Ui/Notifier")
      local stillThere = _G.__RALO_PLAYERGUI:FindFirstChild("RALO_OptimizerNotifier")
      local schedulerConns = __RALO_REQ("Client/Core/Scheduler").Stats().connections
      return tostring(N.Get()) .. "|" .. tostring(stillThere) .. "|" .. schedulerConns
    `)[0];
    const [instance, screenGui, conns] = afterHide.split('|');
    A.equal(beforeHide, 'true', 'ban đầu GUI phải tồn tại');
    A.equal(instance, 'nil', 'sau khi ẩn, singleton phải được xoá');
    A.equal(screenGui, 'nil', 'ScreenGui phải bị huỷ (GUI-011)');
    A.equal(conns, '0', 'không được để lại connection nào (GUI-011)');
  });

  suite.test('GUI-011: bảng mặc định tồn tại 30 giây rồi tự dọn sạch', (t, A) => {
    const h = createRuntime();
    h.eval(BUILD(30));
    h.advance(29.9);
    const stillVisible = h.eval(`
      local N = __RALO_REQ("Client/Ui/Notifier")
      return tostring(N.Get() ~= nil)
    `)[0];
    h.advance(0.2);
    const gone = h.eval(`
      local N = __RALO_REQ("Client/Ui/Notifier")
      local gui = _G.__RALO_PLAYERGUI:FindFirstChild("RALO_OptimizerNotifier")
      return tostring(N.Get()) .. "|" .. tostring(gui)
    `)[0];
    const [instance, screenGui] = gone.split('|');
    A.equal(stillVisible, 'true', 'bảng phải còn trước mốc 30 giây');
    A.equal(instance, 'nil', 'sau 30 giây singleton phải được dọn');
    A.equal(screenGui, 'nil', 'ScreenGui phải bị huỷ khi hết giờ');
  });

  suite.test('GUI-011: Destroy chỉ xoá GUI do hệ thống tạo', (t, A) => {
    const h = createRuntime();
    const out = h.eval(BUILD() + `
      local GuiPolicy = __RALO_REQ("Client/Ui/GuiPolicy")
      local gameGui = Instance.new("ScreenGui")
      gameGui.Name = "GameHUD"
      gameGui.Parent = _G.__RALO_PLAYERGUI
      local refused = GuiPolicy.DestroyScreenGui(gameGui)
      local stillThere = _G.__RALO_PLAYERGUI:FindFirstChild("GameHUD") ~= nil
      return tostring(refused) .. "|" .. tostring(stillThere)
    `)[0];
    const [refused, stillThere] = out.split('|');
    A.equal(refused, 'false', 'phải TỪ CHỐI xoá GUI không thuộc hệ thống');
    A.equal(stillThere, 'true', 'GUI của game phải còn nguyên');
  });

  suite.test('FPS-002 / GUI-004: SetIfChanged không ghi khi giá trị giống hệt', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local GuiPolicy = __RALO_REQ("Client/Ui/GuiPolicy")
      local label = Instance.new("TextLabel")
      label.Text = "giữ nguyên"
      local wrote = GuiPolicy.SetIfChanged(label, "Text", "giữ nguyên")
      local wroteNew = GuiPolicy.SetIfChanged(label, "Text", "đã đổi")
      return tostring(wrote) .. "|" .. tostring(wroteNew) .. "|" .. label.Text
    `)[0];
    const [first, second, text] = out.split('|');
    A.equal(first, 'false', 'giá trị giống hệt thì KHÔNG được ghi');
    A.equal(second, 'true', 'giá trị khác thì ghi');
    A.equal(text, 'đã đổi', 'giá trị mới phải có hiệu lực');
  });

  suite.test('GUI-006 / LOWEND-004: GUI đã Enabled=false thì không chạy hoạt ảnh', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local GuiPolicy = __RALO_REQ("Client/Ui/GuiPolicy")
      local gui = Instance.new("ScreenGui")
      gui.Enabled = true
      local whenVisible = GuiPolicy.ShouldAnimate(gui, true)
      gui.Enabled = false
      local whenHidden = GuiPolicy.ShouldAnimate(gui, true)
      local whenDisabled = GuiPolicy.ShouldAnimate(gui, false)
      return tostring(whenVisible) .. "|" .. tostring(whenHidden) .. "|" .. tostring(whenDisabled)
    `)[0];
    const [visible, hidden, disabled] = out.split('|');
    A.equal(visible, 'true', 'GUI đang hiện thì được chạy hoạt ảnh');
    A.equal(hidden, 'false', 'GUI đã ẩn thì KHÔNG chạy hoạt ảnh');
    A.equal(disabled, 'false', 'bậc thiết bị thấp tắt hoạt ảnh');
  });

  suite.test('GUI-001: GuiPolicy tái sử dụng ScreenGui thay vì tạo mới', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local GuiPolicy = __RALO_REQ("Client/Ui/GuiPolicy")
      local playerGui = Instance.new("PlayerGui")
      local first, reusedFirst = GuiPolicy.AcquireScreenGui(playerGui)
      local second, reusedSecond = GuiPolicy.AcquireScreenGui(playerGui)
      return tostring(first == second) .. "|" .. tostring(reusedFirst) .. "|" .. tostring(reusedSecond)
    `)[0];
    const [same, firstReused, secondReused] = out.split('|');
    A.equal(same, 'true', 'hai lần phải trả về CÙNG một ScreenGui');
    A.equal(firstReused, 'false', 'lần đầu là tạo mới');
    A.equal(secondReused, 'true', 'lần hai là tái sử dụng');
  });

  suite.test('Part 7: SetResults với verdict "error" hiện TRẠNG THÁI LỖI, không hiện thành công', (t, A) => {
    const h = createRuntime();
    const out = h.eval(BUILD() + `
      local Notifier = __RALO_REQ("Client/Ui/Notifier")
      local gui = Notifier.Get()
      gui:SetResults({ "Tối ưu thất bại.", "lỗi thật" }, "error")
      local state = gui:State()
      local statusText = gui.statusLabel.Text
      return state.verdict .. "|" .. tostring(state.finished) .. "|" .. statusText
    `)[0];
    const [verdict, finished, statusText] = out.split('|');
    A.equal(verdict, 'error', 'verdict phải là error');
    A.equal(finished, 'false', 'lỗi KHÔNG được đánh dấu là đã hoàn tất');
    A.equal(statusText, 'Tối ưu gặp lỗi — xem Output', 'nhãn phải hiện lỗi, không báo thành công');
  });

  suite.test('Part 7: SetResults thành công thì hiện "Đã giảm lag xong"', (t, A) => {
    const h = createRuntime();
    const out = h.eval(BUILD() + `
      local Notifier = __RALO_REQ("Client/Ui/Notifier")
      local gui = Notifier.Get()
      gui:SetResults({ "cải thiện 12%" }, "improved")
      return gui.statusLabel.Text .. "|" .. tostring(gui:State().finished)
        .. "|" .. tostring(gui.resultPanel == nil) .. "|" .. gui.percentLabel.Text
    `)[0];
    const [text, finished, noResultMenu, percent] = out.split('|');
    A.equal(text, 'Đã giảm lag xong', 'nhãn phải đổi sang hoàn tất');
    A.equal(finished, 'true', 'phải đánh dấu hoàn tất');
    A.equal(noResultMenu, 'true', 'không được mở menu kết quả');
    A.equal(percent, '100%', 'khi hoàn tất phải chốt tiến trình ở 100%');
  });

  suite.test('Part 7: hoạt ảnh chạy độc lập — GUI ẩn KHÔNG chạy lại tác vụ', (t, A) => {
    const h = createRuntime();
    h.eval(BUILD(1) + `
      _G.__RALO_TASK_RUNS = 0
      local S = __RALO_REQ("Client/Core/Scheduler")
      S.Schedule({ name = "realTask", interval = 0, callback = function()
        _G.__RALO_TASK_RUNS += 1
      end })
    `);
    h.advance(0.5);
    const during = h.eval('return __RALO_TASK_RUNS')[0];
    h.advance(5);                        // GUI đã ẩn từ lâu
    const afterHide = h.eval('return __RALO_TASK_RUNS')[0];
    A.greaterThan(during, 0, 'tác vụ thật chạy trong lúc GUI hiện');
    A.greaterThan(afterHide, during,
      'tác vụ thật tiếp tục chạy theo Scheduler — GUI không điều khiển nó');
    // Và GUI không tự hiện lại
    const reappeared = h.eval('return tostring(__RALO_REQ("Client/Ui/Notifier").Get())')[0];
    A.equal(reappeared, 'nil', 'GUI không được tự hiện lại sau khi đã ẩn');
  });
};
