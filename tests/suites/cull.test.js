'use strict';
/**
 * tests/suites/cull.test.js
 * ===== RALO.METHODS: CULL-001, CULL-002, CULL-003, CULL-004, DIST-001,
 *                     DIST-002, DIST-003, DIST-004, GRAPHICS-004, FX-001,
 *                     FX-002, PART-002, PART-004, FPS-003, CPU-005 =====
 *
 * Kiểm chứng culling theo khoảng cách: tắt chi phí của thứ ở xa và
 * TỰ KHÔI PHỤC khi lại gần. Đây là nhóm rủi ro cao nhất nên test kỹ nhất.
 */

const { createRuntime, P } = require('../lib/runtime');

/** Dựng một thế giới nhỏ có kiểm soát: một part gần, một part xa, mỗi part có emitter. */
const SETUP = `
  local Cull   = __RALO_REQ("Client/Core/Cull")
  local Camera = Instance.new("Camera")
  Camera.CFrame = CFrame.new(0, 0, 0)
  game:GetService("Workspace").CurrentCamera = Camera

  local function makeModel(name, z)
    local part = Instance.new("Part")
    part.Name = name
    part.CFrame = CFrame.new(0, 0, z)
    part.CastShadow = true
    local emitter = Instance.new("ParticleEmitter")
    emitter.Name = "E"
    emitter.Enabled = true
    emitter.Parent = part
    part.Parent = game:GetService("Workspace")
    return part
  end

  _G.__RALO_NEAR = makeModel("Near", 10)
  _G.__RALO_FAR  = makeModel("Far", 1000)
  Cull.rules.shadowDistance = 300
  Cull.rules.effectDistance = 250
`;

module.exports = function cullSuite(suite) {
  suite.test('GRAPHICS-004 / DIST-001: part XA bị tắt bóng, part GẦN thì không', (t, A) => {
    const h = createRuntime();
    const out = h.eval(SETUP + `
      local Cull = __RALO_REQ("Client/Core/Cull")
      Cull.Add(__RALO_NEAR)
      Cull.Add(__RALO_FAR)
      local stats = Cull.Scan(Vector3.new(0, 0, 0))
      return tostring(__RALO_NEAR.CastShadow) .. "|" .. tostring(__RALO_FAR.CastShadow)
        .. "|" .. stats.culled .. "|" .. stats.scanned
    `)[0];
    const [nearShadow, farShadow, culled, scanned] = out.split('|');
    A.equal(nearShadow, 'true', 'part gần PHẢI giữ bóng — không được làm hỏng hình ảnh gần');
    A.equal(farShadow, 'false', 'part xa bị tắt bóng');
    // 2 thay đổi: tắt bóng đổ CỦA part xa + tắt emitter con của nó (FX-001)
    A.equal(culled, '2', 'đúng 2 thay đổi (bóng đổ + emitter của part xa)');
    A.equal(scanned, '2', 'quét đủ 2 đối tượng đã đăng ký');
  });

  suite.test('FX-001 / DIST-003: emitter của part xa bị tắt, part gần giữ nguyên', (t, A) => {
    const h = createRuntime();
    const out = h.eval(SETUP + `
      local Cull = __RALO_REQ("Client/Core/Cull")
      Cull.Add(__RALO_NEAR)
      Cull.Add(__RALO_FAR)
      Cull.Scan(Vector3.new(0, 0, 0))
      local nearE = __RALO_NEAR:FindFirstChild("E")
      local farE  = __RALO_FAR:FindFirstChild("E")
      return tostring(nearE.Enabled) .. "|" .. tostring(farE.Enabled)
    `)[0];
    const [nearEnabled, farEnabled] = out.split('|');
    A.equal(nearEnabled, 'true', 'hiệu ứng gần PHẢI còn — giữ nguyên gameplay');
    A.equal(farEnabled, 'false', 'hiệu ứng xa bị tắt');
  });

  suite.test('DIST-004 / GRAPHICS-004: đối tượng lại gần thì TỰ KHÔI PHỤC', (t, A) => {
    const h = createRuntime();
    const out = h.eval(SETUP + `
      local Cull = __RALO_REQ("Client/Core/Cull")
      Cull.Add(__RALO_FAR)
      Cull.Scan(Vector3.new(0, 0, 0))           -- xa -> tắt
      local afterCull = __RALO_FAR.CastShadow

      __RALO_FAR.CFrame = CFrame.new(0, 0, 20)  -- di chuyển lại gần
      local stats = Cull.Scan(Vector3.new(0, 0, 0))
      return tostring(afterCull) .. "|" .. tostring(__RALO_FAR.CastShadow) .. "|" .. stats.restored
    `)[0];
    const [afterCull, afterRestore, restored] = out.split('|');
    A.equal(afterCull, 'false', 'bước một: bị tắt');
    A.equal(afterRestore, 'true', 'bước hai: phải khôi phục về true');
    A.equal(restored, '1', 'phải đếm được 1 lần khôi phục');
  });

  suite.test('REC-002 / DIST-004: KHÔNG khôi phục đè nếu game đã tự đổi giá trị', (t, A) => {
    const h = createRuntime();
    const out = h.eval(SETUP + `
      local Cull = __RALO_REQ("Client/Core/Cull")
      Cull.Add(__RALO_FAR)
      Cull.Scan(Vector3.new(0, 0, 0))            -- script tắt bóng (đặt false)
      __RALO_FAR.CastShadow = true               -- GAME tự bật lại
      __RALO_FAR.CFrame = CFrame.new(0, 0, 20)   -- lại gần -> script muốn khôi phục về true
      Cull.Scan(Vector3.new(0, 0, 0))
      return tostring(__RALO_FAR.CastShadow)
    `)[0];
    // Script định khôi phục về true với expect=false; game đã đặt true nên
    // Guard phải trả "stale" và KHÔNG ghi. Kết quả cuối vẫn là true.
    A.equal(out, 'true', 'giá trị của game phải được tôn trọng');
  });

  suite.test('CULL-001 / FPS-003: chỉ xử lý đối tượng ĐÃ ĐĂNG KÝ, không tự quét cả game', (t, A) => {
    const h = createRuntime();
    const out = h.eval(SETUP + `
      local Cull = __RALO_REQ("Client/Core/Cull")
      -- Chỉ đăng ký part GẦN. Part xa KHÔNG được đăng ký.
      Cull.Add(__RALO_NEAR)
      local stats = Cull.Scan(Vector3.new(0, 0, 0))
      return stats.scanned .. "|" .. tostring(__RALO_FAR.CastShadow)
    `)[0];
    const [scanned, farShadow] = out.split('|');
    A.equal(scanned, '1', 'chỉ quét đúng đối tượng đã đăng ký');
    A.equal(farShadow, 'true', 'đối tượng không đăng ký PHẢI còn nguyên');
  });

  suite.test('CULL-003: vượt trần maxTargets thì từ chối và ghi log', (t, A) => {
    const h = createRuntime();
    const out = h.eval(SETUP + `
      local Cull = __RALO_REQ("Client/Core/Cull")
      Cull.rules.maxTargets = 1
      local first  = Cull.Add(__RALO_NEAR)
      local second = Cull.Add(__RALO_FAR)
      return tostring(first ~= nil) .. "|" .. tostring(second) .. "|" .. Cull.TargetCount()
    `)[0];
    const [firstOk, second, count] = out.split('|');
    A.equal(firstOk, 'true', 'đối tượng đầu được nhận');
    A.equal(second, 'nil', 'vượt trần phải bị từ chối');
    A.equal(count, '1', 'số đối tượng theo dõi không vượt trần');
  });

  suite.test('CULL-004: đối tượng bị huỷ được loại khỏi danh sách', (t, A) => {
    const h = createRuntime();
    const out = h.eval(SETUP + `
      local Cull = __RALO_REQ("Client/Core/Cull")
      Cull.Add(__RALO_NEAR)
      Cull.Add(__RALO_FAR)
      __RALO_FAR:Destroy()
      local stats = Cull.Scan(Vector3.new(0, 0, 0))
      return Cull.TargetCount() .. "|" .. stats.scanned .. "|" .. stats.skipped
    `)[0];
    const [count, scanned, skipped] = out.split('|');
    A.equal(count, '1', 'mục chết phải bị xoá khỏi danh sách');
    A.equal(scanned, '1', 'chỉ quét đối tượng còn sống');
    A.equal(skipped, '1', 'phải đếm số mục bị bỏ');
  });

  suite.test('CULL-002: Scan không mở kết nối khung hình nào', (t, A) => {
    const h = createRuntime();
    const before = h.call(P.scheduler, 'Stats').connections;
    h.eval(SETUP + `
      local Cull = __RALO_REQ("Client/Core/Cull")
      Cull.Add(__RALO_NEAR)
      Cull.Scan(Vector3.new(0, 0, 0))
    `);
    const after = h.call(P.scheduler, 'Stats').connections;
    A.equal(after, before, 'Scan một lần không được mở connection mới');
  });

  suite.test('CULL: Stop() khôi phục toàn bộ trước khi dừng', (t, A) => {
    const h = createRuntime();
    const out = h.eval(SETUP + `
      local Cull = __RALO_REQ("Client/Core/Cull")
      Cull.Add(__RALO_FAR)
      Cull.Scan(Vector3.new(0, 0, 0))
      local during = __RALO_FAR.CastShadow
      Cull.Stop()
      return tostring(during) .. "|" .. tostring(__RALO_FAR.CastShadow) .. "|" .. tostring(Cull.Stats().running)
    `)[0];
    const [during, after, running] = out.split('|');
    A.equal(during, 'false', 'trong lúc chạy: bị tắt');
    A.equal(after, 'true', 'sau Stop: phải khôi phục');
    A.equal(running, 'false', 'không còn chạy định kỳ');
  });

  suite.test('CPU-005: không có CurrentCamera thì Scan báo rõ, không đoán', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Cull = __RALO_REQ("Client/Core/Cull")
      -- Mock world có sẵn camera; phải GỠ nó ra mới kích hoạt đúng nhánh
      game:GetService("Workspace").CurrentCamera = nil

      local part = Instance.new("Part")
      part.CFrame = CFrame.new(0, 0, 9999)
      part.CastShadow = true
      part.Parent = game:GetService("Workspace")
      Cull.Add(part)
      local stats = Cull.Scan()            -- không truyền camPos, không có camera
      return tostring(stats.note) .. "|" .. tostring(part.CastShadow)
    `)[0];
    const [note, shadow] = out.split('|');
    A.matches(note, /CurrentCamera/, 'phải nêu rõ lý do không đo được');
    A.equal(shadow, 'true', 'không có camera thì KHÔNG được thay đổi gì');
  });
};
