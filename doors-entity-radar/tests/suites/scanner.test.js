'use strict';
/**
 * doors-entity-radar/tests/suites/scanner.test.js
 *
 * Kiểm chứng CƠ CHẾ PHÁT HIỆN: bộ khớp tên, quét theo ngân sách, phát hiện
 * qua sự kiện, gỡ khi instance biến mất, và cầu dữ liệu nhà phát triển.
 *
 * Mọi instance trong test đều do test TẠO RA trong mock — không có kết quả
 * nào được "khai" sẵn.
 */

const { createRuntime, P } = require('../lib/runtime');

/** Nạp Matcher với cấu hình tuỳ chọn, trả về bảng Lua giữ ở _G. */
function buildMatcher(h, configLua = '') {
  return h.eval(`
    local Matcher = __DER_REQ("Client/Core/Matcher")
    local detection = nil
    ${configLua}
    _G.__DER_MATCHER = Matcher.Build(detection)
    local stats = Matcher.Stats(_G.__DER_MATCHER)
    return stats.entities, stats.patterns, stats.confirmed, stats.unsupported, stats.containsRules
  `);
}

module.exports = function scannerSuite(suite) {
  suite.test('MAT-001: khớp chính xác theo tên đã chuẩn hoá (hoa/thường, dấu gạch)', (t, A) => {
    const h = createRuntime();
    buildMatcher(h);
    const result = h.eval(`
      local Matcher = __DER_REQ("Client/Core/Matcher")
      local m = _G.__DER_MATCHER
      local a = Matcher.MatchList(m, "Rush")
      local b = Matcher.MatchList(m, "rush")
      local c = Matcher.MatchList(m, "A-60")
      local d = Matcher.MatchList(m, "Prop17")
      return #a, a[1], #b, b[1], #c, c[1], #d
    `);
    A.equal(result[0], 1, '"Rush" chỉ khớp đúng mục rush (alias không lây)');
    A.equal(result[1], 'rush');
    A.equal(result[2], 1, 'không phân biệt hoa thường');
    A.equal(result[4], 1, '"A-60" phải khớp');
    A.equal(result[5], 'a60');
    A.equal(result[6], 0, 'tên không liên quan không được khớp bừa');
  });

  suite.test('MAT-002: mỗi tên instance chỉ khớp đúng mục của nó (không lây sang biến thể)', (t, A) => {
    const h = createRuntime();
    buildMatcher(h);
    // CHỐT TRUNG THỰC: instance tên "Rush" chỉ được phép kết luận về Rush.
    // Nếu nó kéo theo RNIUSHCg== cùng "Đã phát hiện" thì radar báo sai số
    // lượng thực thể và người dùng sẽ đi tìm một thứ không tồn tại.
    const result = h.eval(`
      local Matcher = __DER_REQ("Client/Core/Matcher")
      local m = _G.__DER_MATCHER
      local function ids(name) return table.concat(Matcher.MatchList(m, name), ",") end
      return ids("Rush"), ids("RNIUSHCg=="), ids("Ambush"), ids("AROxMBUSH"),
             ids("Screech"), ids("SCJVEREECH"), ids("Seek"), ids("Dam Seek"),
             ids("Jeff The Killer")
    `);
    A.equal(result[0], 'rush');
    A.equal(result[1], 'rniushcg', 'tên nhiễu phải khớp chính biến thể đó');
    A.equal(result[2], 'ambush');
    A.equal(result[3], 'aroxmbush');
    A.equal(result[4], 'screech');
    A.equal(result[5], 'scjvereech');
    A.equal(result[6], 'seek');
    A.equal(result[7], 'dam_seek');
    A.equal(result[8], 'jeff_the_killer');
  });

  suite.test('MAT-003: mẫu "contains" bắt được tên có hậu tố', (t, A) => {
    const h = createRuntime();
    buildMatcher(h);
    const result = h.eval(`
      local Matcher = __DER_REQ("Client/Core/Matcher")
      local m = _G.__DER_MATCHER
      local a = Matcher.MatchList(m, "FallenChandelier_03")
      local b = Matcher.MatchList(m, "A-60 (Room 12)")
      return table.concat(a, ","), table.concat(b, ",")
    `);
    A.equal(result[0], 'fallen_chandeliers');
    A.equal(result[1], 'a60');
  });

  suite.test('MAT-004: extraPatterns và confirmedPatterns từ cấu hình có hiệu lực', (t, A) => {
    const h = createRuntime();
    const stats = buildMatcher(h, `
      detection = {
        extraPatterns = { rush = { "RushMoving" } },
        confirmedPatterns = { "Rush" },
      }
    `);
    A.greaterThan(stats[1], 0, 'phải có mẫu tên');
    A.equal(stats[2], 1, 'xác minh "Rush" chỉ xác minh đúng mục rush');
    const result = h.eval(`
      local Matcher = __DER_REQ("Client/Core/Matcher")
      local m = _G.__DER_MATCHER
      local hits = Matcher.MatchList(m, "RushMoving")
      return #hits, hits[1], Matcher.IsConfirmed(m, "rush"), Matcher.IsConfirmed(m, "ambush")
    `);
    A.equal(result[0], 1, 'mẫu thêm chỉ gắn vào đúng mục được khai báo');
    A.equal(result[1], 'rush');
    A.equal(result[2], true, 'rush đã xác minh');
    A.equal(result[3], false, 'ambush thì chưa');
  });

  suite.test('MAT-005: mục unsupported không tham gia khớp và luôn kèm lý do', (t, A) => {
    const h = createRuntime();
    buildMatcher(h);
    const result = h.eval(`
      local Matcher = __DER_REQ("Client/Core/Matcher")
      local m = _G.__DER_MATCHER
      local hits = Matcher.MatchList(m, "Hide")
      local unsupported, reason = Matcher.GetUnsupportedReason(m, "hide")
      local scanUnsupported = Matcher.GetUnsupportedReason(m, "rush")
      return #hits, unsupported, reason, scanUnsupported
    `);
    A.equal(result[0], 0, 'mục unsupported không được khớp');
    A.equal(result[1], true);
    A.matches(result[2], /trạng thái của người chơi/i, 'lý do phải giải thích bản chất');
    A.equal(result[3], false, 'mục scan được thì không bị coi là unsupported');
  });

  suite.test('MAT-006: cấu hình unsupported ép mục thành không hỗ trợ', (t, A) => {
    const h = createRuntime();
    buildMatcher(h, `
      detection = { unsupported = { portrait = "Chỉ là tranh tĩnh trong phòng." } }
    `);
    const result = h.eval(`
      local Matcher = __DER_REQ("Client/Core/Matcher")
      local m = _G.__DER_MATCHER
      local unsupported, reason = Matcher.GetUnsupportedReason(m, "portrait")
      return #Matcher.MatchList(m, "Portrait"), unsupported, reason
    `);
    A.equal(result[0], 0);
    A.equal(result[1], true);
    A.equal(result[2], 'Chỉ là tranh tĩnh trong phòng.');
  });

  suite.test('SCN-001: quét đầy đủ tìm thấy instance có thật trong Workspace', (t, A) => {
    const h = createRuntime();
    const found = h.eval(`
      local Config = __DER_REQUIRE and nil or nil
      local Shared_Config = __DER_REQ("Shared/Config")
      local Scanner = __DER_REQ("Client/Core/Scanner")
      local workspace = game:GetService("Workspace")
      local scanner = Scanner.new(Shared_Config)
      scanner:Attach(workspace)
      scanner:RequestFullScan()

      local rush = __RALO_MOCK.SpawnEntity(game, "Rush", 30, 0, 0, "Model")
      local eyes = __RALO_MOCK.SpawnEntity(game, "Eyes", 0, 0, -12, "Model")

      local report = scanner:Update(os.clock())
      local rushCandidates = scanner:GetCandidates("rush")
      local eyesCandidates = scanner:GetCandidates("eyes")
      local noneCandidates = scanner:GetCandidates("ambush")
      _G.__DER_SCANNER = scanner
      return #rushCandidates, rushCandidates[1].name, #eyesCandidates, #noneCandidates, report.scanComplete
    `);
    A.equal(found[0], 1, 'phải tìm thấy Rush');
    A.equal(found[1], 'Rush');
    A.equal(found[2], 1, 'phải tìm thấy Eyes');
    A.equal(found[3], 0, 'không có Ambush thì phải trả rỗng');
    A.equal(found[4], true, 'lần quét phải hoàn tất');
  });

  suite.test('SCN-002: DescendantAdded phát hiện instance mới mà không cần quét lại', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Shared_Config = __DER_REQ("Shared/Config")
      local Scanner = __DER_REQ("Client/Core/Scanner")
      local workspace = game:GetService("Workspace")
      local scanner = Scanner.new(Shared_Config)
      scanner:Attach(workspace)
      scanner:RequestFullScan()
      scanner:Update(os.clock())
      local before = #scanner:GetCandidates("figure")

      -- Instance sinh ra SAU lần quét: chỉ có sự kiện mới thấy được.
      __RALO_MOCK.SpawnEntity(game, "Figure", 5, 0, 5, "Model")
      local midScanStarted = scanner:Stats().scanInProgress
      scanner:Update(os.clock())
      local after = #scanner:GetCandidates("figure")
      return before, after, midScanStarted
    `);
    A.equal(result[0], 0, 'trước đó chưa có Figure');
    A.equal(result[1], 1, 'sự kiện DescendantAdded phải bắt được');
    A.equal(result[2], false, 'lần quét đầy đủ đã xong trước đó');
  });

  suite.test('SCN-003: instance biến mất thì ứng viên bị gỡ (không giữ dữ liệu ma)', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Shared_Config = __DER_REQ("Shared/Config")
      local Scanner = __DER_REQ("Client/Core/Scanner")
      local workspace = game:GetService("Workspace")
      local scanner = Scanner.new(Shared_Config)
      scanner:Attach(workspace)
      scanner:RequestFullScan()
      local rush = __RALO_MOCK.SpawnEntity(game, "Rush", 1, 0, 1, "Model")
      scanner:Update(os.clock())
      local before = #scanner:GetCandidates("rush")

      __RALO_MOCK.SimulateRemove(rush)
      scanner:Update(os.clock())
      local afterRemove = #scanner:GetCandidates("rush")

      local rush2 = __RALO_MOCK.SpawnEntity(game, "Rush", 2, 0, 2, "Model")
      scanner:Update(os.clock())
      local afterRespawn = #scanner:GetCandidates("rush")
      rush2:Destroy()
      scanner:Update(os.clock())
      local afterDestroyNoEvent = #scanner:GetCandidates("rush")
      scanner:Prune()
      local afterPrune = #scanner:GetCandidates("rush")
      return before, afterRemove, afterRespawn, afterDestroyNoEvent, afterPrune
    `);
    A.equal(result[0], 1);
    A.equal(result[1], 0, 'bị gỡ khỏi Workspace thì không còn là ứng viên');
    A.equal(result[2], 1, 'spawn lại thì thấy lại');
    A.equal(result[3], 0, 'instance đã Destroy phải bị loại ngay khi đọc');
    A.equal(result[4], 0, 'Prune dọn sạch');
  });

  suite.test('SCN-004: ngân sách descendantsPerStep giới hạn công việc mỗi nhịp', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Shared_Config = __DER_REQ("Shared/Config")
      Shared_Config.Scan.descendantsPerStep = 3
      local Scanner = __DER_REQ("Client/Core/Scanner")
      local workspace = game:GetService("Workspace")
      local scanner = Scanner.new(Shared_Config)
      scanner:Attach(workspace)
      scanner:RequestFullScan()
      local first = scanner:Update(os.clock())
      local second = scanner:Update(os.clock())
      local steps = 0
      local complete = false
      while not complete and steps < 200 do
        local report = scanner:Update(os.clock())
        complete = report.scanComplete
        steps = steps + 1
      end
      Shared_Config.Scan.descendantsPerStep = 1200
      return first.processed, second.processed, steps, complete
    `);
    A.equal(result[0], 3, 'nhịp đầu không vượt ngân sách');
    A.equal(result[1], 3, 'nhịp sau cũng vậy');
    A.equal(result[3], true, 'quét nhiều nhịp rồi cũng phải hoàn tất');
    A.lessThan(result[2], 200, 'không được lặp vô hạn');
  });

  suite.test('SCN-005: vượt trần thì báo "có thể thiếu" thay vì im lặng', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Shared_Config = __DER_REQ("Shared/Config")
      Shared_Config.Scan.maxDescendantsPerFullScan = 4
      local Scanner = __DER_REQ("Client/Core/Scanner")
      local workspace = game:GetService("Workspace")
      local scanner = Scanner.new(Shared_Config)
      scanner:Attach(workspace)
      scanner:RequestFullScan()
      scanner:Update(os.clock())
      local truncated = scanner:Stats().truncated
      Shared_Config.Scan.maxDescendantsPerFullScan = 20000
      return truncated
    `);
    A.equal(result[0], true, 'phải đánh dấu kết quả bị cắt ngắn');
    A.greaterThan(h.countLogs(/Quét đầy đủ bị cắt/), 0, 'phải ghi cảnh báo ra Output');
  });

  suite.test('SCN-006: maxMatchesPerEntity chặn việc giữ vô hạn instance', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Shared_Config = __DER_REQ("Shared/Config")
      Shared_Config.Scan.maxMatchesPerEntity = 2
      local Scanner = __DER_REQ("Client/Core/Scanner")
      local workspace = game:GetService("Workspace")
      local scanner = Scanner.new(Shared_Config)
      scanner:Attach(workspace)
      scanner:RequestFullScan()
      -- Phải đặt tên ĐÚNG bằng "Drone": mẫu khớp của mục drone là khớp
      -- chính xác nên "Drone_1" sẽ không khớp (đó là hành vi đúng, không phải lỗi).
      for i = 1, 6 do
        __RALO_MOCK.SpawnEntity(game, "Drone", i, 0, 0, "Model")
      end
      scanner:Update(os.clock())
      scanner:Update(os.clock())
      local count = #scanner:GetCandidates("drone")
      Shared_Config.Scan.maxMatchesPerEntity = 8
      return count
    `);
    A.equal(result[0], 2, 'chỉ giữ đúng số instance cho phép');
  });

  suite.test('SCN-007: cầu nhà phát triển TẮT thì không có dữ liệu (kèm lý do)', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Shared_Config = __DER_REQ("Shared/Config")
      local Scanner = __DER_REQ("Client/Core/Scanner")
      local scanner = Scanner.new(Shared_Config)
      local positions, message = scanner:ReadDeveloperBridge(game:GetService("Workspace"))
      local count = 0
      for _ in pairs(positions) do count = count + 1 end
      return count, message
    `);
    A.equal(result[0], 0, 'tắt thì không được bịa dữ liệu');
    A.matches(result[1], /đang tắt/, 'phải nói rõ vì sao không có dữ liệu');
  });

  suite.test('SCN-008: cầu nhà phát triển BẬT đọc đúng Attribute và bỏ qua giá trị sai', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Shared_Config = __DER_REQ("Shared/Config")
      Shared_Config.Detection.developerBridge.enabled = true
      local Scanner = __DER_REQ("Client/Core/Scanner")
      local workspace = game:GetService("Workspace")
      local folder = Instance.new("Folder")
      folder.Name = "DER_Bridge"
      folder.Parent = workspace
      folder:SetAttribute("DER_entity_rush", "12.5, 4, -88.25")
      folder:SetAttribute("DER_entity_figure", Vector3.new(1, 2, 3))
      folder:SetAttribute("DER_entity_eyes", "khong phai toa do")
      folder:SetAttribute("DER_entity_muctontai", "1,2,3")
      folder:SetAttribute("KhongLienQuan", "9,9,9")

      local scanner = Scanner.new(Shared_Config)
      local positions, message = scanner:ReadDeveloperBridge(workspace)
      local rush = positions["rush"]
      local figure = positions["figure"]
      local count = 0
      for _ in pairs(positions) do count = count + 1 end
      Shared_Config.Detection.developerBridge.enabled = false
      return count, rush.X, rush.Y, rush.Z, figure.Y, message
    `);
    A.equal(result[0], 2, 'chỉ hai Attribute hợp lệ được nhận');
    A.equal(result[1], 12.5, 'parse từ chuỗi "x,y,z"');
    A.equal(result[2], 4);
    A.equal(result[3], -88.25);
    A.equal(result[4], 2, 'nhận cả Vector3 trực tiếp');
    A.greaterThan(h.countLogs(/không phải toạ độ hợp lệ/), 0, 'giá trị sai phải bị ghi log');
    A.greaterThan(h.countLogs(/id không có trong danh mục/), 0, 'id lạ phải bị ghi log');
  });

  suite.test('SCN-009: thiếu folder cầu nối thì báo rõ, không ném lỗi', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Shared_Config = __DER_REQ("Shared/Config")
      Shared_Config.Detection.developerBridge.enabled = true
      local Scanner = __DER_REQ("Client/Core/Scanner")
      local scanner = Scanner.new(Shared_Config)
      local positions, message = scanner:ReadDeveloperBridge(game:GetService("Workspace"))
      local count = 0
      for _ in pairs(positions) do count = count + 1 end
      Shared_Config.Detection.developerBridge.enabled = false
      return count, message
    `);
    A.equal(result[0], 0);
    A.matches(result[1], /Không thấy folder/);
  });

  suite.test('SCN-010: ignoreNames loại trừ tuyệt đối', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Shared_Config = __DER_REQ("Shared/Config")
      Shared_Config.Scan.ignoreNames = { "Rush" }
      local Scanner = __DER_REQ("Client/Core/Scanner")
      local workspace = game:GetService("Workspace")
      local scanner = Scanner.new(Shared_Config)
      scanner:Attach(workspace)
      scanner:RequestFullScan()
      __RALO_MOCK.SpawnEntity(game, "Rush", 1, 0, 1, "Model")
      scanner:Update(os.clock())
      scanner:Update(os.clock())
      local ignored = #scanner:GetCandidates("rush")
      Shared_Config.Scan.ignoreNames = {}
      return ignored
    `);
    A.equal(result[0], 0, 'tên trong danh sách bỏ qua không được khớp');
  });

  suite.test('SCN-011: Scan.enabled = false thì bộ quét không làm gì', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Shared_Config = __DER_REQ("Shared/Config")
      Shared_Config.Scan.enabled = false
      local Scanner = __DER_REQ("Client/Core/Scanner")
      local workspace = game:GetService("Workspace")
      local scanner = Scanner.new(Shared_Config)
      scanner:Attach(workspace)
      scanner:RequestFullScan()
      __RALO_MOCK.SpawnEntity(game, "Rush", 1, 0, 1, "Model")
      local report = scanner:Update(os.clock())
      local candidates = #scanner:GetCandidates("rush")
      Shared_Config.Scan.enabled = true
      return candidates, report.processed, report.queued
    `);
    A.equal(result[0], 0, 'tắt quét thì không có ứng viên');
    A.equal(result[1], 0);
    A.equal(result[2], 0);
  });
};
