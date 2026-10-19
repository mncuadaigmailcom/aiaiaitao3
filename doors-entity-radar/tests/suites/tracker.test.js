'use strict';
/**
 * doors-entity-radar/tests/suites/tracker.test.js
 *
 * Kiểm chứng NƠI KẾT LUẬN TRẠNG THÁI — phần dễ nói dối nhất của một công cụ
 * "radar". Test khẳng định:
 *   - không có vị trí hợp lệ thì KHÔNG có khoảng cách;
 *   - chưa xác minh mẫu tên thì KHÔNG được nói "Không phát hiện";
 *   - dữ liệu cũ phải bị gắn nhãn cũ;
 *   - dữ liệu không đổi thì không sinh cập nhật UI thừa.
 */

const { createRuntime, P } = require('../lib/runtime');

/**
 * Dựng Scanner + Tracker trong cùng VM.
 * confirmed: mảng tên instance đã xác minh (để được phép nói "Không phát hiện").
 */
function setup(h, { confirmed = [], playerAt = '0,0,0', look = '0,0,-1' } = {}) {
  return h.eval(`
    local Shared_Config = __DER_REQ("Shared/Config")
    Shared_Config.Detection.confirmedPatterns = { ${confirmed.map((c) => `"${c}"`).join(', ')} }
    local Scanner = __DER_REQ("Client/Core/Scanner")
    local Tracker = __DER_REQ("Client/Core/Tracker")
    local workspace = game:GetService("Workspace")
    _G.__DER_SCANNER = Scanner.new(Shared_Config)
    _G.__DER_SCANNER:Attach(workspace)
    _G.__DER_SCANNER:RequestFullScan()
    _G.__DER_TRACKER = Tracker.new(Shared_Config)
    _G.__DER_TRACKER:SetActive(true)
    _G.__DER_PLAYER_POS = Vector3.new(${playerAt})
    _G.__DER_LOOK = Vector3.new(${look})
    _G.__DER_RIGHT = Vector3.new(1, 0, 0)
    return true
  `)[0];
}

function refresh(h) {
  return h.eval(`
    _G.__DER_TRACKER:Refresh(os.clock(), _G.__DER_SCANNER, _G.__DER_PLAYER_POS, _G.__DER_LOOK, _G.__DER_RIGHT, nil)
    return _G.__DER_TRACKER:GetVersion()
  `)[0];
}

module.exports = function trackerSuite(suite) {
  suite.test('TRK-001: thấy instance + vị trí hợp lệ -> DETECTED kèm khoảng cách và hướng', (t, A) => {
    const h = createRuntime();
    setup(h, { playerAt: '0,0,0' });
    const result = h.eval(`
      __RALO_MOCK.SpawnEntity(game, "Rush", 30, 0, 0, "Model")
      _G.__DER_SCANNER:Update(os.clock())
      _G.__DER_TRACKER:Refresh(os.clock(), _G.__DER_SCANNER, _G.__DER_PLAYER_POS, _G.__DER_LOOK, _G.__DER_RIGHT, nil)
      local record = _G.__DER_TRACKER:Get("rush")
      local o = record.observation
      return record.code, record.label, o.distance, o.direction, o.instanceName, o.source, o.position.X, record.stale
    `);
    A.equal(result[0], 'DETECTED');
    A.equal(result[1], 'Đã phát hiện');
    A.equal(result[2], 30, 'khoảng cách phải đúng bằng toạ độ thật');
    A.equal(result[3], 'bên phải', 'Rush ở +X trong khi nhìn về -Z');
    A.equal(result[4], 'Rush');
    A.equal(result[5], 'workspace');
    A.equal(result[6], 30);
    A.equal(result[7], false, 'dữ liệu vừa quét thì không được coi là cũ');
  });

  suite.test('TRK-002: không thấy gì + mẫu CHƯA xác minh -> UNVERIFIED (không phải "Không phát hiện")', (t, A) => {
    const h = createRuntime();
    setup(h, { confirmed: [] });
    const result = h.eval(`
      _G.__DER_SCANNER:Update(os.clock())
      _G.__DER_TRACKER:Refresh(os.clock(), _G.__DER_SCANNER, _G.__DER_PLAYER_POS, _G.__DER_LOOK, _G.__DER_RIGHT, nil)
      local record = _G.__DER_TRACKER:Get("ambush")
      return record.code, record.observation == nil, record.reason
    `);
    A.equal(result[0], 'UNVERIFIED');
    A.equal(result[1], true, 'không được kèm vị trí');
    A.matches(result[2], /chưa được xác minh/, 'lý do phải nói rõ là chưa đủ căn cứ');
  });

  suite.test('TRK-003: không thấy gì + mẫu ĐÃ xác minh -> NOT_FOUND', (t, A) => {
    const h = createRuntime();
    setup(h, { confirmed: ['Rush'] });
    const result = h.eval(`
      _G.__DER_SCANNER:Update(os.clock())
      _G.__DER_TRACKER:Refresh(os.clock(), _G.__DER_SCANNER, _G.__DER_PLAYER_POS, _G.__DER_LOOK, _G.__DER_RIGHT, nil)
      local confirmed = _G.__DER_TRACKER:Get("rush")
      local unconfirmed = _G.__DER_TRACKER:Get("ambush")
      return confirmed.code, unconfirmed.code
    `);
    A.equal(result[0], 'NOT_FOUND', 'đã xác minh mẫu thì được kết luận là không thấy');
    A.equal(result[1], 'UNVERIFIED', 'mục chưa xác minh vẫn phải giữ nguyên');
  });

  suite.test('TRK-004: thấy instance nhưng không đọc được vị trí -> NO_POSITION, không bịa toạ độ', (t, A) => {
    const h = createRuntime();
    setup(h);
    const result = h.eval(`
      local empty = Instance.new("Folder")
      empty.Name = "Figure"
      empty.Parent = game:GetService("Workspace")
      __RALO_MOCK.SimulateAdd(game:GetService("Workspace"), empty, game:GetService("Workspace"))
      _G.__DER_SCANNER:Update(os.clock())
      _G.__DER_TRACKER:Refresh(os.clock(), _G.__DER_SCANNER, _G.__DER_PLAYER_POS, _G.__DER_LOOK, _G.__DER_RIGHT, nil)
      local record = _G.__DER_TRACKER:Get("figure")
      return record.code, record.observation == nil, record.reason
    `);
    A.equal(result[0], 'NO_POSITION');
    A.equal(result[1], true, 'không được kèm vị trí giả');
    A.matches(result[2], /Thấy instance 'Figure'/, 'lý do phải nêu tên instance thấy được');
  });

  suite.test('TRK-005: mục không hỗ trợ -> UNSUPPORTED kèm lý do, bất kể có instance hay không', (t, A) => {
    const h = createRuntime();
    setup(h);
    const result = h.eval(`
      __RALO_MOCK.SpawnEntity(game, "Hide", 1, 0, 1, "Model")
      _G.__DER_SCANNER:Update(os.clock())
      _G.__DER_TRACKER:Refresh(os.clock(), _G.__DER_SCANNER, _G.__DER_PLAYER_POS, _G.__DER_LOOK, _G.__DER_RIGHT, nil)
      local record = _G.__DER_TRACKER:Get("hide")
      return record.code, record.observation == nil, record.reason
    `);
    A.equal(result[0], 'UNSUPPORTED');
    A.equal(result[1], true);
    A.matches(result[2], /trạng thái của người chơi/i);
  });

  suite.test('TRK-006: hệ thống tắt -> mọi mục DISABLED và không còn vị trí', (t, A) => {
    const h = createRuntime();
    setup(h);
    const result = h.eval(`
      __RALO_MOCK.SpawnEntity(game, "Rush", 10, 0, 0, "Model")
      _G.__DER_SCANNER:Update(os.clock())
      _G.__DER_TRACKER:Refresh(os.clock(), _G.__DER_SCANNER, _G.__DER_PLAYER_POS, _G.__DER_LOOK, _G.__DER_RIGHT, nil)
      local before = _G.__DER_TRACKER:Get("rush").code
      _G.__DER_TRACKER:SetActive(false)
      local after = _G.__DER_TRACKER:Get("rush")
      return before, after.code, after.observation == nil, after.stale
    `);
    A.equal(result[0], 'DETECTED');
    A.equal(result[1], 'DISABLED');
    A.equal(result[2], true, 'tắt rồi thì không được giữ vị trí cũ để hiển thị');
    A.equal(result[3], true, 'và phải đánh dấu là dữ liệu cũ');
  });

  suite.test('TRK-007: dữ liệu không đổi thì version không tăng (chống vẽ lại vô ích)', (t, A) => {
    const h = createRuntime();
    setup(h);
    const result = h.eval(`
      __RALO_MOCK.SpawnEntity(game, "Rush", 30, 0, 0, "Model")
      _G.__DER_SCANNER:Update(os.clock())
      _G.__DER_TRACKER:Refresh(os.clock(), _G.__DER_SCANNER, _G.__DER_PLAYER_POS, _G.__DER_LOOK, _G.__DER_RIGHT, nil)
      local v1 = _G.__DER_TRACKER:GetVersion()
      local dirty1 = _G.__DER_TRACKER:HasDirty()
      _G.__DER_TRACKER:ConsumeDirty()

      -- Quét lại y nguyên: không có gì đổi.
      _G.__DER_TRACKER:Refresh(os.clock(), _G.__DER_SCANNER, _G.__DER_PLAYER_POS, _G.__DER_LOOK, _G.__DER_RIGHT, nil)
      local v2 = _G.__DER_TRACKER:GetVersion()
      local dirty2 = _G.__DER_TRACKER:HasDirty()

      -- Di chuyển thực thể: phải có thay đổi.
      _G.__DER_LAST_ENTITY = game:GetService("Workspace"):FindFirstChild("Rush")
      _G.__DER_LAST_ENTITY.PrimaryPart.CFrame = CFrame.new(60, 0, 0)
      _G.__DER_TRACKER:Refresh(os.clock(), _G.__DER_SCANNER, _G.__DER_PLAYER_POS, _G.__DER_LOOK, _G.__DER_RIGHT, nil)
      local v3 = _G.__DER_TRACKER:GetVersion()
      local dirty3 = _G.__DER_TRACKER:HasDirty()
      local stats = _G.__DER_TRACKER:Stats()
      return v1, dirty1, v2, dirty2, v3, dirty3, stats.unchanged
    `);
    A.equal(result[1], true, 'lần đầu phải có thay đổi');
    A.equal(result[2], result[0], 'dữ liệu y nguyên thì version đứng yên');
    A.equal(result[3], false, 'và không báo dirty');
    A.greaterThan(result[4], result[2], 'thực thể di chuyển thì version phải tăng');
    A.equal(result[5], true);
    A.greaterThan(result[6], 0, 'phải đếm được số lần không đổi');
  });

  suite.test('TRK-008: dao động nhỏ dưới 0.1 stud không bị coi là thay đổi', (t, A) => {
    const h = createRuntime();
    setup(h);
    const result = h.eval(`
      __RALO_MOCK.SpawnEntity(game, "Rush", 30, 0, 0, "Model")
      _G.__DER_SCANNER:Update(os.clock())
      _G.__DER_TRACKER:Refresh(os.clock(), _G.__DER_SCANNER, _G.__DER_PLAYER_POS, _G.__DER_LOOK, _G.__DER_RIGHT, nil)
      _G.__DER_TRACKER:ConsumeDirty()
      local v1 = _G.__DER_TRACKER:GetVersion()

      local rush = game:GetService("Workspace"):FindFirstChild("Rush")
      rush.PrimaryPart.CFrame = CFrame.new(30.02, 0, 0)
      _G.__DER_TRACKER:Refresh(os.clock(), _G.__DER_SCANNER, _G.__DER_PLAYER_POS, _G.__DER_LOOK, _G.__DER_RIGHT, nil)
      return v1, _G.__DER_TRACKER:GetVersion()
    `);
    A.equal(result[0], result[1], 'làm tròn 0.1 stud để UI không nhấp nháy');
  });

  suite.test('TRK-009: dữ liệu quá hạn bị đánh dấu cũ (không trình bày như dữ liệu trực tiếp)', (t, A) => {
    const h = createRuntime();
    setup(h);
    const result = h.eval(`
      __RALO_MOCK.SpawnEntity(game, "Rush", 30, 0, 0, "Model")
      _G.__DER_SCANNER:Update(os.clock())
      _G.__DER_TRACKER:Refresh(os.clock(), _G.__DER_SCANNER, _G.__DER_PLAYER_POS, _G.__DER_LOOK, _G.__DER_RIGHT, nil)
      local freshStale = _G.__DER_TRACKER:IsStale(os.clock())
      local later = os.clock() + 10
      local oldStale = _G.__DER_TRACKER:IsStale(later)
      local age = _G.__DER_TRACKER:GetDataAge(later)
      return freshStale, oldStale, age
    `);
    A.equal(result[0], false, 'vừa quét thì chưa cũ');
    A.equal(result[1], true, 'quá hạn phải bị coi là cũ');
    A.near(result[2], 10, 0.001, 'tuổi dữ liệu phải tính đúng');
  });

  suite.test('TRK-010: lỗi quét -> FAULT cho mọi mục, không che giấu bằng kết quả giả', (t, A) => {
    const h = createRuntime();
    setup(h);
    const result = h.eval(`
      _G.__DER_TRACKER:SetFault("Không lấy được Workspace nên không quét được.")
      _G.__DER_TRACKER:Refresh(os.clock(), _G.__DER_SCANNER, _G.__DER_PLAYER_POS, _G.__DER_LOOK, _G.__DER_RIGHT, nil)
      local rush = _G.__DER_TRACKER:Get("rush")
      local hide = _G.__DER_TRACKER:Get("hide")
      return rush.code, rush.reason, hide.code
    `);
    A.equal(result[0], 'FAULT');
    A.matches(result[1], /Không lấy được Workspace/);
    A.equal(result[2], 'FAULT', 'mọi mục đều phải phản ánh lỗi');
  });

  suite.test('TRK-011: thiếu vị trí người chơi -> vẫn DETECTED nhưng không có khoảng cách, lý do nói rõ', (t, A) => {
    const h = createRuntime();
    setup(h);
    const result = h.eval(`
      __RALO_MOCK.SpawnEntity(game, "Rush", 30, 0, 0, "Model")
      _G.__DER_SCANNER:Update(os.clock())
      _G.__DER_TRACKER:Refresh(os.clock(), _G.__DER_SCANNER, nil, _G.__DER_LOOK, _G.__DER_RIGHT, nil)
      local record = _G.__DER_TRACKER:Get("rush")
      local o = record.observation
      return record.code, o.distance == nil, o.direction == nil, record.reason
    `);
    A.equal(result[0], 'DETECTED');
    A.equal(result[1], true, 'không có vị trí người chơi thì không được bịa khoảng cách');
    A.equal(result[2], true);
    A.matches(result[3], /thiếu vị trí người chơi/);
  });

  suite.test('TRK-012: nhiều instance khớp -> chọn cái gần nhất và ghi rõ số lượng', (t, A) => {
    const h = createRuntime();
    setup(h, { playerAt: '0,0,0' });
    const result = h.eval(`
      -- Hai instance CÙNG tên "Drone" (tình huống thật: nhiều drone một lúc).
      -- Không đặt tên "Drone_A"/"Drone_B": mẫu khớp của drone là khớp CHÍNH
      -- XÁC nên tên biến dạng sẽ không khớp (hành vi đúng, không phải lỗi).
      __RALO_MOCK.SpawnEntity(game, "Drone", 100, 0, 0, "Model")
      __RALO_MOCK.SpawnEntity(game, "Drone", 15, 0, 0, "Model")
      _G.__DER_SCANNER:Update(os.clock())
      _G.__DER_TRACKER:Refresh(os.clock(), _G.__DER_SCANNER, _G.__DER_PLAYER_POS, _G.__DER_LOOK, _G.__DER_RIGHT, nil)
      local record = _G.__DER_TRACKER:Get("drone")
      local o = record.observation
      return o.distance, o.instanceName, o.matchCount
    `);
    A.equal(result[0], 15, 'phải chọn instance gần người chơi nhất');
    A.equal(result[1], 'Drone');
    A.equal(result[2], 2, 'phải nói rõ có bao nhiêu instance khớp');
  });

  suite.test('TRK-013: dữ liệu nhà phát triển được ghi rõ nguồn "developer"', (t, A) => {
    const h = createRuntime();
    setup(h, { playerAt: '0,0,0' });
    const result = h.eval(`
      local positions = { seek = Vector3.new(0, 0, -40) }
      _G.__DER_TRACKER:Refresh(os.clock(), _G.__DER_SCANNER, _G.__DER_PLAYER_POS, _G.__DER_LOOK, _G.__DER_RIGHT, positions)
      local record = _G.__DER_TRACKER:Get("seek")
      local o = record.observation
      return record.code, o.source, o.distance, o.direction, record.reason
    `);
    A.equal(result[0], 'DETECTED');
    A.equal(result[1], 'developer');
    A.equal(result[2], 40);
    A.equal(result[3], 'phía trước');
    A.matches(result[4], /nhà phát triển cung cấp/);
  });

  suite.test('TRK-014: BuildView lọc theo khu vực/từ khoá và xếp trạng thái quan trọng lên trước', (t, A) => {
    const h = createRuntime();
    setup(h);
    const result = h.eval(`
      __RALO_MOCK.SpawnEntity(game, "Rush", 30, 0, 0, "Model")
      _G.__DER_SCANNER:Update(os.clock())
      _G.__DER_TRACKER:Refresh(os.clock(), _G.__DER_SCANNER, _G.__DER_PLAYER_POS, _G.__DER_LOOK, _G.__DER_RIGHT, nil)

      local all = _G.__DER_TRACKER:BuildView("", nil)
      local hotel = _G.__DER_TRACKER:BuildView("", "hotel")
      local searched = _G.__DER_TRACKER:BuildView("rush", nil)
      local firstRow = all[1]
      return #all, #hotel, #searched, firstRow.entry.id, firstRow.record.code
    `);
    A.equal(result[0], 82, 'không lọc thì thấy toàn bộ danh mục');
    A.equal(result[1], 23, 'lọc Hotel');
    A.equal(result[2], 3, 'tìm "rush" (khớp cả Crusher và Rushing Light)');
    A.equal(result[3], 'rush', 'mục DETECTED phải lên đầu danh sách');
    A.equal(result[4], 'DETECTED');
  });

  suite.test('TRK-015: CountByStatus đếm đúng và luôn phủ hết danh mục', (t, A) => {
    const h = createRuntime();
    setup(h, { confirmed: ['Rush'] });
    const result = h.eval(`
      __RALO_MOCK.SpawnEntity(game, "Rush", 30, 0, 0, "Model")
      _G.__DER_SCANNER:Update(os.clock())
      _G.__DER_TRACKER:Refresh(os.clock(), _G.__DER_SCANNER, _G.__DER_PLAYER_POS, _G.__DER_LOOK, _G.__DER_RIGHT, nil)
      local counts = _G.__DER_TRACKER:CountByStatus()
      local total = 0
      for _ , n in pairs(counts) do total = total + n end
      -- CountByStatus chỉ chứa mã CÓ số đếm > 0 nên phải đọc kèm "or 0"
      -- (UI cũng đọc như vậy). Đây là hành vi cố ý, không phải thiếu dữ liệu.
      return counts["DETECTED"], counts["NOT_FOUND"] or 0, counts["UNSUPPORTED"] or 0,
             counts["UNVERIFIED"] or 0, total
    `);
    A.equal(result[0], 1, 'một mục DETECTED');
    A.equal(result[1], 0, 'chỉ Rush được xác minh nên không mục nào NOT_FOUND');
    A.equal(result[2], 1, 'Hide là mục không hỗ trợ duy nhất');
    A.equal(result[4], 82, 'tổng phải phủ đủ danh mục');
  });
};
