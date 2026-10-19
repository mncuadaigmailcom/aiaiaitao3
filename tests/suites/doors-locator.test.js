'use strict';
/**
 * tests/suites/doors-locator.test.js
 *
 * Kiểm thử công cụ QA định vị tag thủ công, chỉ trong Roblox Studio.
 * Harness không mô phỏng Roblox Studio hoặc render hình ảnh thật.
 */

const { createRuntime, P } = require('../lib/runtime');

const EXPECTED_CATALOG = {
  hotel: ['Rush', 'Ambush', 'Eyes', 'Screech', 'Figure', 'Seek', 'Dupe', 'Halt', 'Hide',
    'Timothy', 'Sally (Window)', 'Dread', 'Jeff', 'El Goblino', 'Bob', 'Jack', 'Moonlight',
    'Weirdo', 'Glitch', 'Void', 'Red Barrier', 'Snare', 'Fallen Chandeliers'],
  mines: ['Rush', 'Ambush', 'Eyes', 'Screech', 'Figure', 'Seek', 'Dupe', 'Halt', 'Hide',
    'Timothy', 'Dread', 'Giggle', 'Gloombats', 'Grumble', 'Queen Grumble', 'Charles',
    'Dam Seek', 'Jeff', 'El Goblino', 'Bob', 'Louie', 'Moonlight', 'Jack', 'Weirdo',
    'Glitch', 'Void', 'Red Barrier'],
  backdoor: ['Blitz', 'Haste', 'Lookman', 'Starlight', 'Glitch', 'Vacuum'],
  archives: ['Drone', 'Bash', 'Scribbles', 'Ransom', 'Forget Me Nots (Forget-Me-Not)',
    'Teller', 'Alma', 'Honcho', 'Fih', 'Portrait', 'Starlight', 'Glitch', 'Currents',
    'Office Chair'],
  outdoors: ['Mandrake', 'Surge', 'Monument', 'Eyestalk', 'Bramble', 'The Caw', 'Grampy',
    'Groundskeeper', 'Starlight', 'Glitch', 'World Lotus', 'Snare', 'Flood'],
  stairwell: ['Creak', 'Noise', 'Stem', 'Hijack', 'Meld', 'Cobbler', 'Glitch',
    'Fire Sprinklers', 'Crusher', 'Office Chair', 'Shopping Cart', 'Television Set'],
  rooms: ['A-60', 'A-90', 'A-120'],
  events: ['Jeff The Killer', 'Greed', 'Evil Key', 'DRAKOBLOXXERS', 'SEEKING WALL!!!',
    'LAVA!', 'Cringle', 'Treater', 'Rushing Light', 'RNIUSHCg==', 'AROxMBUSH', 'SCJVEREECH'],
};

const SETUP_TARGET = (sectionId, name, parentExpression = 'game:GetService("Workspace")') => `
  local Catalog = __RALO_REQ("Shared/DoorsCatalog")
  local target = Instance.new("Model")
  target.Name = "QA_" .. ${JSON.stringify(name)}
  target.Parent = ${parentExpression}
  target:SetAttribute(Catalog.SECTION_ATTRIBUTE, ${JSON.stringify(sectionId)})
  target:SetAttribute(Catalog.NAME_ATTRIBUTE, ${JSON.stringify(name)})
  local part = Instance.new("Part")
  part.Name = "LocatorAnchor"
  part.CFrame = CFrame.new(12, 0, 0)
  part.Parent = target
  game:GetService("CollectionService"):AddTag(target, Catalog.TAG)
  return target, part
`;

module.exports = function doorsLocatorSuite(suite) {
  suite.test('DOORS-CATALOG: đủ 8 khu vực và chính xác 110 tên đã yêu cầu', (t, A) => {
    const h = createRuntime();
    const summary = h.eval(`
      local Catalog = __RALO_REQ("Shared/DoorsCatalog")
      local rows = {}
      for _, section in ipairs(Catalog.SECTIONS) do
        local names = {}
        for _, entry in ipairs(section.entities) do
          table.insert(names, entry.name)
        end
        table.insert(rows, section.id .. ":" .. table.concat(names, ","))
      end
      return Catalog.SectionCount() .. "|" .. Catalog.TotalCount() .. "|" .. table.concat(rows, "~")
    `)[0];
    const [sectionCount, total, rows] = summary.split('|');
    const expectedRows = Object.entries(EXPECTED_CATALOG)
      .map(([id, names]) => `${id}:${names.join(',')}`).join('~');
    const expectedTotal = Object.values(EXPECTED_CATALOG)
      .reduce((count, names) => count + names.length, 0);
    A.equal(sectionCount, '8', 'catalog phải có đúng 8 khu vực');
    A.equal(Number(total), expectedTotal, 'tổng số loại phải khớp danh sách người dùng');
    A.equal(expectedTotal, 110, 'fixture phải bao phủ đủ 110 tên người dùng đưa ra');
    A.equal(rows, expectedRows, 'tên, thứ tự và phân khu phải khớp trọn danh sách yêu cầu');
  });

  suite.test('DOORS-CATALOG: tìm tên không phân biệt hoa thường và hiểu alias', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Catalog = __RALO_REQ("Shared/DoorsCatalog")
      local sally = Catalog.Resolve("hotel", "  sAlLy  ")
      local forget = Catalog.Resolve("archives", "Forget-Me-Not")
      local wrongArea = Catalog.Resolve("hotel", "A-60")
      return (sally and sally.name or "nil")
        .. "|" .. (forget and forget.name or "nil")
        .. "|" .. tostring(wrongArea == nil)
    `)[0];
    const [sally, forget, wrongArea] = result.split('|');
    A.equal(sally, 'Sally (Window)', 'alias Sally phải hiển thị tên chuẩn');
    A.equal(forget, 'Forget Me Nots (Forget-Me-Not)', 'alias Archives phải được chuẩn hoá');
    A.equal(wrongArea, 'true', 'tên phải khớp đúng khu vực, không dùng nhầm A-60');
  });

  suite.test('DOORS-LOCATOR: từ chối chạy ngoài Roblox Studio', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local runService = game:GetService("RunService")
      runService.IsStudio = function() return false end
      local Locator = __RALO_REQ("Client/Debug/DoorsLocator")
      local started, reason = Locator.Start()
      local state = Locator.State()
      local gui = game:GetService("Players").LocalPlayer:FindFirstChildOfClass("PlayerGui")
        :FindFirstChild(Locator.GUI_NAME)
      return tostring(started) .. "|" .. tostring(state.running) .. "|"
        .. tostring(gui == nil) .. "|" .. tostring(reason)
    `)[0];
    const [started, running, guiMissing, reason] = out.split('|');
    A.equal(started, 'false', 'không được khởi động ở runtime không phải Studio');
    A.equal(running, 'false', 'trạng thái phải giữ là stopped');
    A.equal(guiMissing, 'true', 'không được tạo GUI khi bị từ chối');
    A.matches(reason, /Studio/i, 'lý do từ chối cần nói rõ Studio-only');
  });

  suite.test('DOORS-LOCATOR: chỉ nhận object có tag, tên và section hợp lệ', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Catalog = __RALO_REQ("Shared/DoorsCatalog")
      local untagged = Instance.new("Part")
      untagged.Name = "Rush"
      untagged.Parent = game:GetService("Workspace")

      local valid, _ = (function()
        ${SETUP_TARGET('hotel', 'Rush')}
      end)()

      local unknown = Instance.new("Part")
      unknown.Name = "NotInCatalog"
      unknown.Parent = game:GetService("Workspace")
      unknown:SetAttribute(Catalog.SECTION_ATTRIBUTE, "hotel")
      unknown:SetAttribute(Catalog.NAME_ATTRIBUTE, "NotInCatalog")
      game:GetService("CollectionService"):AddTag(unknown, Catalog.TAG)

      local wrongSection = Instance.new("Part")
      wrongSection.Name = "WrongSection"
      wrongSection.Parent = game:GetService("Workspace")
      wrongSection:SetAttribute(Catalog.SECTION_ATTRIBUTE, "hotel")
      wrongSection:SetAttribute(Catalog.NAME_ATTRIBUTE, "A-60")
      game:GetService("CollectionService"):AddTag(wrongSection, Catalog.TAG)

      local Locator = __RALO_REQ("Client/Debug/DoorsLocator")
      local started = Locator.Start()
      local state = Locator.State()
      local markerCount = 0
      for _, child in ipairs(game:GetService("Players").LocalPlayer:FindFirstChildOfClass("PlayerGui"):GetDescendants()) do
        if child.ClassName == "BillboardGui" then markerCount += 1 end
      end
      return tostring(started) .. "|" .. state.tracked .. "|"
        .. state.sections.hotel.tracked .. "|" .. markerCount .. "|" .. tostring(untagged.Parent ~= nil)
    `)[0];
    const [started, tracked, hotel, markers, targetUntouched] = out.split('|');
    A.equal(started, 'true', 'công cụ phải chạy được trong Studio');
    A.equal(tracked, '1', 'chỉ object đã tag và có tên hợp lệ được nhận');
    A.equal(hotel, '1', 'object phải nằm đúng nhóm The Hotel');
    A.equal(markers, '1', 'mỗi target hợp lệ có đúng một BillboardGui');
    A.equal(targetUntouched, 'true', 'không được xoá hoặc sửa parent của object game');
  });

  suite.test('DOORS-LOCATOR: nút ảo ẩn menu độc lập với bộ marker', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local target, targetPart = (function()
        ${SETUP_TARGET('hotel', 'Rush')}
      end)()
      local playerGui = game:GetService("Players").LocalPlayer:FindFirstChildOfClass("PlayerGui")
      local Locator = __RALO_REQ("Client/Debug/DoorsLocator")
      Locator.Start()
      local screen = playerGui:FindFirstChild(Locator.GUI_NAME)
      local panel = screen:FindFirstChild("Panel")
      local menuButton = screen:FindFirstChild("MenuToggle")
      local categoryButton = panel:FindFirstChild("Section_hotel")
      local marker
      for _, child in ipairs(playerGui:GetDescendants()) do
        if child.ClassName == "BillboardGui" then marker = child end
      end

      categoryButton.Activated:Fire()
      local markerHidden = marker.Enabled == false
      local categoryDisabled = Locator.State().sections.hotel.enabled == false
      menuButton.Activated:Fire()
      local menuHidden = panel.Visible == false
      local toggleLabel = menuButton.Text
      local guiStillEnabled = screen.Enabled == true
      Locator.Stop()
      return tostring(markerHidden) .. "|" .. tostring(categoryDisabled) .. "|"
        .. tostring(menuHidden) .. "|" .. toggleLabel .. "|" .. tostring(guiStillEnabled)
    `)[0];
    const [markerHidden, categoryDisabled, menuHidden, toggleLabel, guiStillEnabled] = out.split('|');
    A.equal(markerHidden, 'true', 'nút The Hotel phải ẩn marker trong khu đó');
    A.equal(categoryDisabled, 'true', 'trạng thái khu vực phải cập nhật');
    A.equal(menuHidden, 'true', 'nút nổi phải ẩn riêng menu');
    A.equal(toggleLabel, 'MỞ MENU', 'nút nổi đổi nhãn để mở lại menu');
    A.equal(guiStillEnabled, 'true', 'ẩn menu không được tắt các marker đang chọn');
  });

  suite.test('DOORS-LOCATOR: nhận tag mới, gỡ marker khi bỏ tag, Stop dọn sạch', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Catalog = __RALO_REQ("Shared/DoorsCatalog")
      local Locator = __RALO_REQ("Client/Debug/DoorsLocator")
      local playerGui = game:GetService("Players").LocalPlayer:FindFirstChildOfClass("PlayerGui")
      local collection = game:GetService("CollectionService")
      Locator.Start()

      local target = Instance.new("Part")
      target.Name = "QA_Giggle"
      target.Parent = game:GetService("Workspace")
      target.CFrame = CFrame.new(25, 0, 0)
      target:SetAttribute(Catalog.SECTION_ATTRIBUTE, "mines")
      target:SetAttribute(Catalog.NAME_ATTRIBUTE, "Giggle")
      collection:AddTag(target, Catalog.TAG)
      local added = Locator.State().tracked == 1
      collection:RemoveTag(target, Catalog.TAG)
      local removed = Locator.State().tracked == 0
      local stillInGame = target.Parent == game:GetService("Workspace")

      collection:AddTag(target, Catalog.TAG)
      local gui = playerGui:FindFirstChild(Locator.GUI_NAME)
      local markerCountBefore = 0
      for _, child in ipairs(playerGui:GetDescendants()) do
        if child.ClassName == "BillboardGui" then markerCountBefore += 1 end
      end
      Locator.Stop()
      local guiRemoved = playerGui:FindFirstChild(Locator.GUI_NAME) == nil
      local markerCountAfter = 0
      for _, child in ipairs(playerGui:GetDescendants()) do
        if child.ClassName == "BillboardGui" then markerCountAfter += 1 end
      end
      return tostring(added) .. "|" .. tostring(removed) .. "|" .. tostring(stillInGame)
        .. "|" .. tostring(gui ~= nil) .. "|" .. markerCountBefore .. "|"
        .. tostring(guiRemoved) .. "|" .. markerCountAfter .. "|" .. tostring(Locator.State().running)
    `)[0];
    const [added, removed, stillInGame, hadGui, before, guiRemoved, after, running] = out.split('|');
    A.equal(added, 'true', 'CollectionService thêm tag phải được nhận ngay');
    A.equal(removed, 'true', 'gỡ tag phải gỡ entry ngay');
    A.equal(stillInGame, 'true', 'bỏ tag không được phá object gốc');
    A.equal(hadGui, 'true', 'GUI phải tồn tại trước Stop');
    A.equal(before, '1', 'object được thêm lại có một marker');
    A.equal(guiRemoved, 'true', 'Stop phải xoá GUI do công cụ tạo');
    A.equal(after, '0', 'Stop phải dọn marker');
    A.equal(running, 'false', 'Stop đặt trạng thái về stopped');
  });

  suite.test('DOORS-LOCATOR: bundle riêng tự khởi động module QA, không chạy optimizer', (t, A) => {
    const h = createRuntime({}, { entry: 'Client/Debug/DoorsLocatorBundle' });
    const state = h.callStatic(P.doorsLocator, 'State');
    const gui = h.eval(`
      local Locator = __RALO_REQ("Client/Debug/DoorsLocator")
      local playerGui = game:GetService("Players").LocalPlayer:FindFirstChildOfClass("PlayerGui")
      local optimizer = __RALO_REQ("Client/Bootstrap")
      return tostring(playerGui:FindFirstChild(Locator.GUI_NAME) ~= nil)
        .. "|" .. tostring(optimizer.State().started)
    `)[0];
    const [guiExists, noOptimizerResult] = gui.split('|');
    A.equal(state.running, true, 'bundle locator phải gọi Start()');
    A.equal(guiExists, 'true', 'bundle locator phải dựng GUI trong Studio');
    A.equal(noOptimizerResult, 'false', 'entry riêng không khởi động optimizer');
    h.callStatic(P.doorsLocator, 'Stop');
  });

  suite.test('DOORS-LOCATOR: khoảng cách cập nhật theo nhịp Heartbeat, không mỗi frame', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local player = game:GetService("Players").LocalPlayer
      local character = player.Character
      local root = Instance.new("Part")
      root.Name = "HumanoidRootPart"
      root.CFrame = CFrame.new(0, 0, 0)
      root.Parent = character

      local target, part = (function()
        ${SETUP_TARGET('rooms', 'A-60')}
      end)()
      part.CFrame = CFrame.new(3, 4, 0)
      local playerGui = player:FindFirstChildOfClass("PlayerGui")
      local Locator = __RALO_REQ("Client/Debug/DoorsLocator")
      Locator.Start()
      local marker
      for _, child in ipairs(playerGui:GetDescendants()) do
        if child.ClassName == "BillboardGui" then marker = child end
      end
      local label = marker:FindFirstChild("Caption")
      local first = label.Text
      part.CFrame = CFrame.new(10, 0, 0)
      task.wait(0.4)
      local second = label.Text
      Locator.Stop()
      return first .. "|" .. second
    `)[0];
    const [first, second] = out.split('|');
    A.matches(first, /5 studs/, 'khoảng cách 3-4-5 phải được làm tròn đúng');
    A.matches(second, /10 studs/, 'vị trí mới phải được cập nhật sau chu kỳ Heartbeat');
  });
};
