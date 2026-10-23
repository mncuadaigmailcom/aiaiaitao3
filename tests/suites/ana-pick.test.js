'use strict';
/**
 * tests/suites/ana-pick.test.js
 *
 * Ngắm tâm / phân tích vật thể trong script.js:
 * tường đi xuyên được (CanCollide=false / CanQuery=false) phải định vị được,
 * và tường gần hơn phải thắng vật rắn phía sau.
 *
 * Chạy LOGIC thật của S.RayObbHit + S.ChooseCloserPick trích từ script.js
 * trên máy ảo Lua (fengari). Không phải Roblox Studio.
 */

const fs = require('fs');
const path = require('path');
const { createRuntime } = require('../lib/runtime');

const SCRIPT = path.join(__dirname, '..', '..', 'script.js');

function extractFn(src, name, nextName) {
  const start = src.indexOf(`function ${name}`);
  if (start < 0) {
    throw new Error(`script.js thiếu ${name}`);
  }
  const end = src.indexOf(`function ${nextName}`, start + 1);
  if (end < 0) {
    throw new Error(`script.js thiếu hàm kế tiếp ${nextName} sau ${name}`);
  }
  return src.slice(start, end);
}

function loadPicker() {
  const src = fs.readFileSync(SCRIPT, 'utf8');
  const rayObb = extractFn(src, 'S.RayObbHit', 'S.ChooseCloserPick');
  const choose = extractFn(src, 'S.ChooseCloserPick', 'S.PickByRayScan');
  const h = createRuntime({}, { bundle: true });
  h.eval(`
    _G.__ANA = {}
    local S = _G.__ANA
    ${rayObb}
    ${choose}
  `);
  return h;
}

function loadAim() {
  const src = fs.readFileSync(SCRIPT, 'utf8');
  const inset = extractFn(src, 'S.GetGuiInset2', 'S.ScreenToViewport');
  const conv = extractFn(src, 'S.ScreenToViewport', 'S.AimScreenPoint');
  const aim = extractFn(src, 'S.AimScreenPoint', 'S.RayFromScreenOrViewport');
  const h = createRuntime({}, { bundle: true });
  h.eval(`
    _G.__ANA = {}
    local S = _G.__ANA
    ${inset}
    ${conv}
    ${aim}
  `);
  return h;
}

module.exports = function anaPickSuite(suite) {
  suite.test('script.js: ngắm tâm có mã xuyên tường / tường đi xuyên', (_t, A) => {
    const src = fs.readFileSync(SCRIPT, 'utf8');
    A.ok(src.includes('function S.RayObbHit'), 'phải có S.RayObbHit');
    A.ok(src.includes('function S.ChooseCloserPick'), 'phải có S.ChooseCloserPick');
    A.ok(src.includes('BruteForceAllSlow'), 'OverlapParams phải quét cả part CanQuery=false');
    A.ok(src.includes('RespectCanCollide = false'), 'không được đòi CanCollide mới trúng');
    A.ok(
      !src.includes('elseif S.AnaCfg.scanFallback'),
      'BUG cũ: scan chỉ chạy khi raycast miss — tường đi xuyên phía trước sẽ bị bỏ',
    );
    A.ok(
      src.includes('S.ChooseCloserPick(inst, rayDist, part, scanT)'),
      'PickObjectAt phải so khoảng cách tia vs quét',
    );
    A.ok(
      src.includes('đi xuyên được') || src.includes('tường đi xuyên'),
      'ghi chú UI/kết quả phải nói tường đi xuyên',
    );
  });

  suite.test('RayObbHit: tường mỏng đi xuyên (CanCollide=false) bị tia giữa màn hình trúng', (_t, A) => {
    const h = loadPicker();
    const out = h.eval(`
      local S = _G.__ANA
      local wall = {
        Name = "ShopWall",
        CanCollide = false,
        CanQuery = false,
        Size = Vector3.new(0.4, 20, 50),
        Position = Vector3.new(0, 10, 0),
        CFrame = { Position = Vector3.new(0, 10, 0) },
      }
      local origin = Vector3.new(12, 10, 0)
      local dir = Vector3.new(-1, 0, 0)
      local t, pos = S.RayObbHit(origin, dir, wall, 10000)
      return tostring(t ~= nil) .. "|" .. string.format("%.2f", t or -1) .. "|" .. string.format("%.2f", pos and pos.X or 999)
    `)[0];
    const [hit, t, x] = out.split('|');
    A.equal(hit, 'true', 'tường đi xuyên phải bị OBB trúng');
    A.near(Number(t), 11.8, 0.05, 'mặt tường tại x=0.2, origin x=12 → t=11.8');
    A.near(Number(x), 0.2, 0.05, 'điểm hit phải nằm trên mặt tường');
  });

  suite.test('RayObbHit: ngắm lệch mép tường lớn vẫn trúng (không cần trúng tâm khối)', (_t, A) => {
    const h = loadPicker();
    const out = h.eval(`
      local S = _G.__ANA
      local wall = {
        Size = Vector3.new(0.4, 20, 80),
        Position = Vector3.new(0, 10, 0),
        CFrame = { Position = Vector3.new(0, 10, 0) },
      }
      -- ngắm điểm trên tường, cách tâm 35 stud theo Z
      local origin = Vector3.new(10, 10, 35)
      local dir = Vector3.new(-1, 0, 0)
      local t = S.RayObbHit(origin, dir, wall, 10000)
      return tostring(t ~= nil) .. "|" .. string.format("%.2f", t or -1)
    `)[0];
    const [hit, t] = out.split('|');
    A.equal(hit, 'true', 'tia vào mặt tường (không qua tâm) vẫn phải hit');
    A.near(Number(t), 9.8, 0.05, 'origin x=10, mặt x=0.2 → t=9.8');
  });

  suite.test('RayObbHit: tia đi song song / ra ngoài tường thì miss', (_t, A) => {
    const h = loadPicker();
    const out = h.eval(`
      local S = _G.__ANA
      local wall = {
        Size = Vector3.new(0.4, 20, 50),
        Position = Vector3.new(0, 10, 0),
        CFrame = { Position = Vector3.new(0, 10, 0) },
      }
      local missUp = S.RayObbHit(Vector3.new(12, 30, 0), Vector3.new(-1, 0, 0), wall, 10000)
      local missAway = S.RayObbHit(Vector3.new(12, 10, 0), Vector3.new(1, 0, 0), wall, 10000)
      local missSide = S.RayObbHit(Vector3.new(12, 10, 40), Vector3.new(-1, 0, 0), wall, 10000)
      return tostring(missUp) .. "|" .. tostring(missAway) .. "|" .. tostring(missSide)
    `)[0];
    const [up, away, side] = out.split('|');
    A.equal(up, 'nil', 'Y ngoài hộp → miss');
    A.equal(away, 'nil', 'tia đi ngược chiều → miss');
    A.equal(side, 'nil', 'Z ngoài hộp → miss');
  });

  suite.test('ChooseCloserPick: tường đi xuyên GẦN hơn thắng part rắn phía sau', (_t, A) => {
    const h = loadPicker();
    const out = h.eval(`
      local S = _G.__ANA
      local solid = { Name = "FarSolid" }
      local wall = { Name = "WalkThroughWall", CanCollide = false, CanQuery = false }
      -- raycast xuyên tường (CanQuery=false) rồi trúng solid 80 stud
      -- scan OBB thấy tường lúc 12 stud
      return S.ChooseCloserPick(solid, 80, wall, 12)
    `)[0];
    A.equal(out, 'scan', 'phải chọn tường đi xuyên gần hơn, không giữ vật rắn phía sau');
  });

  suite.test('ChooseCloserPick: khi không có raycast vẫn lấy tường quét được', (_t, A) => {
    const h = loadPicker();
    const out = h.eval(`
      local S = _G.__ANA
      local wall = { Name = "WalkThroughWall" }
      return tostring(S.ChooseCloserPick(nil, math.huge, wall, 9.5))
    `)[0];
    A.equal(out, 'scan', 'raycast miss hoàn toàn → dùng kết quả quét');
  });

  suite.test('ChooseCloserPick: vật raycast GẦN hơn thì giữ tia, không nhảy sang vật xa', (_t, A) => {
    const h = loadPicker();
    const out = h.eval(`
      local S = _G.__ANA
      local near = { Name = "NearSolid" }
      local far = { Name = "FarScan" }
      return S.ChooseCloserPick(near, 7, far, 40)
    `)[0];
    A.equal(out, 'ray', 'không được thay hit gần bằng vật quét xa hơn');
  });

  suite.test('ChooseCloserPick: không hit gì thì nil (không bịa vật)', (_t, A) => {
    const h = loadPicker();
    const out = h.eval(`
      local S = _G.__ANA
      return tostring(S.ChooseCloserPick(nil, math.huge, nil, nil))
    `)[0];
    A.equal(out, 'nil', 'cả hai nhánh miss → nil');
  });

  suite.test('ChooseCloserPick: khoảng cách gần bằng nhau giữ tia (tránh nhấp nháy)', (_t, A) => {
    const h = loadPicker();
    const out = h.eval(`
      local S = _G.__ANA
      local a = { Name = "A" }
      local b = { Name = "B" }
      -- scan chỉ gần hơn 0.02 (< 0.05) → vẫn ray
      return S.ChooseCloserPick(a, 10, b, 9.98)
    `)[0];
    A.equal(out, 'ray', 'cần hơn 0.05 stud mới chuyển sang scan');
  });

  suite.test('script.js: ngắm tâm dùng laser, không còn chấm giữa màn', (_t, A) => {
    const src = fs.readFileSync(SCRIPT, 'utf8');
    A.ok(src.includes('function S.AimScreenPoint'), 'giữ AimScreenPoint cho nút ⊕');
    A.ok(src.includes('function S.ScreenToViewport'), 'phải có ScreenToViewport');
    A.ok(src.includes('ScreenPointToRay'), 'điện thoại: AbsolutePosition khớp ScreenPointToRay');
    A.ok(src.includes('ClipToDeviceSafeArea'), 'tắt safe-area để overlay không bị đẩy');
    A.ok(src.includes('ScreenInsets'), 'ScreenInsets = None trên overlay ngắm tâm');
    A.ok(src.includes('function S.LaserBeamSpan'), 'phải có LaserBeamSpan');
    A.ok(src.includes('function S.PointerScreenPoint'), 'giữ tọa độ nút 🔎 để vẽ tia 2D');
    A.ok(src.includes('function S.PlaceScreenLaser'), 'phải có PlaceScreenLaser (tia trên màn hình)');
    A.ok(src.includes('function S.AnaAimEnsureLaser2D'), 'GUI cũ (đã bật ngắm) vẫn phải gắn tia 2D, không return sớm bỏ tia');
    A.ok(src.includes('BC_Laser2D'), 'phải có tia đỏ 2D — nếu chỉ part 3D trùng hướng nhìn thì không thấy');
    A.ok(src.includes('WorldToViewportPoint'), 'chiếu điểm chạm cây lên màn hình');
    A.ok(src.includes('function S.AnaAimTraceLook'), 'phải dò vật theo hướng nhìn');
    A.ok(
      /function S\.AnaAimLookOriginDir[\s\S]{0,350}LookVector/.test(src),
      'nhìn vào cây thì tia theo LookVector — không bắn lệch sang nút bên phải',
    );
    A.ok(src.includes('BC_AnaLaser'), 'phải có folder tia laser');
    A.ok(src.includes('BC_LaserBeam'), 'phải có part tia laser');
    A.ok(
      /Name = "CenterAimDot"[\s\S]{0,280}Visible = false/.test(src),
      'chấm tâm giữa màn phải ẨN khi bật ngắm tâm',
    );
    A.ok(
      src.includes('S.AnaAimTraceLook()') && src.includes('S.FillObjPanel(hit.inst'),
      'nút 🔎 phải phân tích vật laser đang trúng',
    );
    A.ok(
      !/AnaAimAnalyzeOnce[\s\S]{0,500}AimScreenPoint\(\)/.test(src),
      'AnalyzeOnce không còn lấy điểm giữa màn / chấm GUI',
    );
    A.ok(src.includes('function S.AnaAimSet'), 'không mất bật/tắt Ngắm tâm');
    A.ok(src.includes('function S.AnaAimBeginButtonDrag'), 'không mất kéo nút 🔎');
  });

  suite.test('ScreenToViewport: trừ inset topbar — tâm GUI khớp tia 3D trên điện thoại', (_t, A) => {
    const h = loadAim();
    const out = h.eval(`
      local S = _G.__ANA
      local vx, vy = S.ScreenToViewport(400, 400, 0, 36, 800, 800, 800, 800)
      return string.format("%.1f|%.1f", vx, vy)
    `)[0];
    const [vx, vy] = out.split('|').map(Number);
    A.near(vx, 400, 0.01, 'X giữ nguyên khi inset chỉ trên Y');
    A.near(vy, 364, 0.01, 'Y trừ 36px topbar — nếu không trừ thì tia lệch dưới chấm đỏ');
  });

  suite.test('ScreenToViewport: safe-area crop (tỷ lệ ~1.1) KHÔNG scale — 1:1 với chấm đỏ', (_t, A) => {
    const h = loadAim();
    const out = h.eval(`
      local S = _G.__ANA
      -- iPhone: GUI 800x719 trong viewport 800x800 (notch), tâm visual Y=406.5
      local vx, vy = S.ScreenToViewport(400, 406.5, 0, 0, 800, 719, 800, 800)
      return string.format("%.1f|%.1f", vx, vy)
    `)[0];
    const [vx, vy] = out.split('|').map(Number);
    A.near(vx, 400, 0.01, 'X 1:1');
    A.near(vy, 406.5, 0.01, 'không kéo tâm safe-area về giữa viewport (sẽ lệch cây)');
  });

  suite.test('ScreenToViewport: DPI 2x (điện thoại scale UI) nhân đúng', (_t, A) => {
    const h = loadAim();
    const out = h.eval(`
      local S = _G.__ANA
      local vx, vy = S.ScreenToViewport(180, 320, 0, 0, 360, 640, 720, 1280)
      return string.format("%.1f|%.1f", vx, vy)
    `)[0];
    const [vx, vy] = out.split('|').map(Number);
    A.near(vx, 360, 0.01, '180 * 2 = tâm viewport X');
    A.near(vy, 640, 0.01, '320 * 2 = tâm viewport Y');
  });

  suite.test('AimScreenPoint: lấy đúng tâm chấm đỏ, không lấy nút 🔎 bên phải', (_t, A) => {
    const h = loadAim();
    const out = h.eval(`
      local S = _G.__ANA
      S.AnaUi = {
        aimDot = {
          Parent = {},
          AbsolutePosition = Vector2.new(196, 402),
          AbsoluteSize = Vector2.new(8, 8),
        },
        aimActionBtn = {
          Parent = {},
          AbsolutePosition = Vector2.new(340, 480),
          AbsoluteSize = Vector2.new(36, 36),
        },
      }
      local x, y, space = S.AimScreenPoint()
      return string.format("%.1f|%.1f|%s", x, y, tostring(space))
    `)[0];
    const [x, y, space] = out.split('|');
    A.near(Number(x), 200, 0.01, 'tâm chấm = AbsolutePosition + size/2');
    A.near(Number(y), 406, 0.01, 'phải theo chấm đỏ, không theo nút 🔎 (358)');
    A.equal(space, 'screen', 'tọa độ chấm đỏ là screen — ScreenPointToRay');
  });

  suite.test('AimScreenPoint: không có chấm thì fallback giữa viewport (không crash)', (_t, A) => {
    const h = loadAim();
    const out = h.eval(`
      local S = _G.__ANA
      S.AnaUi = {}
      S.AnaCam = function() return { ViewportSize = Vector2.new(800, 600) } end
      local x, y, space = S.AimScreenPoint()
      return string.format("%.1f|%.1f|%s", x, y, tostring(space))
    `)[0];
    const [x, y, space] = out.split('|');
    A.near(Number(x), 400, 0.01);
    A.near(Number(y), 300, 0.01);
    A.equal(space, 'viewport');
  });

  suite.test('LaserBeamSpan: tia dừng đúng điểm trúng vật (nút đỏ phân tích điểm này)', (_t, A) => {
    const src = fs.readFileSync(SCRIPT, 'utf8');
    const span = extractFn(src, 'S.LaserBeamSpan', 'S.AnaAimLookOriginDir');
    const h = createRuntime({}, { bundle: true });
    const out = h.eval(`
      local S = {}
      ${span}
      -- camera (0,5,0) nhìn -Z, vật ở z=-20
      local sx, sy, sz, ex, ey, ez, len = S.LaserBeamSpan(0, 5, 0, 0, 0, -1, 0, 5, -20, 0.65, 500)
      return string.format("%.2f|%.2f|%.2f|%.2f|%.2f", sx, sz, ex, ez, len)
    `)[0];
    const [sx, sz, ex, ez, len] = out.split('|').map(Number);
    A.near(sx, 0, 0.01, 'bắt đầu trên trục nhìn');
    A.near(sz, -0.65, 0.02, 'nhích ra trước camera để thấy tia (FPS)');
    A.near(ex, 0, 0.01, 'điểm cuối X = vật');
    A.near(ez, -20, 0.01, 'điểm cuối Z = vật laser đang trúng');
    A.near(len, 19.35, 0.05, 'độ dài tia = khoảng cách tới vật trừ đoạn ẩn');
  });

  suite.test('LaserBeamSpan: không trúng gì thì tia đi xa theo hướng nhìn, không bịa vật', (_t, A) => {
    const src = fs.readFileSync(SCRIPT, 'utf8');
    const span = extractFn(src, 'S.LaserBeamSpan', 'S.AnaAimLookOriginDir');
    const h = createRuntime({}, { bundle: true });
    const out = h.eval(`
      local S = {}
      ${span}
      local sx, sy, sz, ex, ey, ez, len = S.LaserBeamSpan(0, 5, 0, 0, 0, -1, nil, nil, nil, 0.65, 500)
      return string.format("%.1f|%.1f|%.1f", ex, ez, len)
    `)[0];
    const [ex, ez, len] = out.split('|').map(Number);
    A.near(ex, 0, 0.01);
    A.near(ez, -500, 0.2, 'không hit → tia theo hướng nhìn đến visMax từ camera');
    A.near(Number(len), 499.35, 0.3);
  });

  suite.test('LaserBeamSpan: vật quá xa thì cắt tia (không kéo part 10000 stud)', (_t, A) => {
    const src = fs.readFileSync(SCRIPT, 'utf8');
    const span = extractFn(src, 'S.LaserBeamSpan', 'S.AnaAimLookOriginDir');
    const h = createRuntime({}, { bundle: true });
    const out = h.eval(`
      local S = {}
      ${span}
      local sx, sy, sz, ex, ey, ez, len = S.LaserBeamSpan(0, 0, 0, 1, 0, 0, 8000, 0, 0, 0.65, 500)
      return string.format("%.1f|%.1f", ex, len)
    `)[0];
    const [ex, len] = out.split('|').map(Number);
    A.near(ex, 500.65, 0.2, 'cắt ở visMax, không 8000');
    A.near(len, 500, 0.2);
  });

  suite.test('PointerScreenPoint: tâm tia = nút nhỏ 🔎, không phải giữa màn hình', (_t, A) => {
    const src = fs.readFileSync(SCRIPT, 'utf8');
    const fn = extractFn(src, 'S.PointerScreenPoint', 'S.AnaAimLookOriginDir');
    const h = createRuntime({}, { bundle: true });
    const out = h.eval(`
      local S = {}
      ${fn}
      S.AnaUi = {
        aimDot = {
          Parent = {},
          AbsolutePosition = Vector2.new(396, 296),
          AbsoluteSize = Vector2.new(8, 8),
        },
        aimActionBtn = {
          Parent = {},
          AbsolutePosition = Vector2.new(340, 480),
          AbsoluteSize = Vector2.new(36, 36),
        },
      }
      local x, y, space = S.PointerScreenPoint()
      return string.format("%.1f|%.1f|%s", x, y, tostring(space))
    `)[0];
    const [x, y, space] = out.split('|');
    A.near(Number(x), 358, 0.01, 'tâm nút 36px tại x=340 → 358, không 400 giữa màn');
    A.near(Number(y), 498, 0.01, 'tâm nút tại y=480 → 498, không 300 giữa màn');
    A.equal(space, 'screen');
  });

  suite.test('PointerScreenPoint: không có nút thì nil (không bịa tâm ảo giữa màn)', (_t, A) => {
    const src = fs.readFileSync(SCRIPT, 'utf8');
    const fn = extractFn(src, 'S.PointerScreenPoint', 'S.AnaAimLookOriginDir');
    const h = createRuntime({}, { bundle: true });
    const out = h.eval(`
      local S = {}
      ${fn}
      S.AnaUi = {}
      local x, y, space = S.PointerScreenPoint()
      return tostring(x) .. "|" .. tostring(y) .. "|" .. tostring(space)
    `)[0];
    A.equal(out, 'nil|nil|nil', 'thiếu nút 🔎 thì không invent tâm giữa màn');
  });

  suite.test('PlaceScreenLaser: tia 2D từ nút 🔎 tới cây trên màn (nhìn thấy được)', (_t, A) => {
    const src = fs.readFileSync(SCRIPT, 'utf8');
    const fn = extractFn(src, 'S.PlaceScreenLaser', 'S.PointerScreenPoint');
    const h = createRuntime({}, { bundle: true });
    const out = h.eval(`
      local S = {}
      ${fn}
      -- nút 🔎 góc phải (358,498) → cây giữa màn (400, 280)
      local mx, my, len, ang = S.PlaceScreenLaser(358, 498, 400, 280)
      return string.format("%.1f|%.1f|%.1f|%.1f", mx, my, len, ang)
    `)[0];
    const [mx, my, len, ang] = out.split('|').map(Number);
    A.near(mx, 379, 0.2, 'trung điểm X của tia');
    A.near(my, 389, 0.2, 'trung điểm Y của tia');
    A.ok(len > 200, 'tia phải đủ dài để nhìn thấy từ nút tới cây, nhận ' + len);
    A.ok(ang < 0, 'cây cao hơn nút → góc âm (lên trên)');
  });

  suite.test('PlaceScreenLaser: tia ngang không gãy góc', (_t, A) => {
    const src = fs.readFileSync(SCRIPT, 'utf8');
    const fn = extractFn(src, 'S.PlaceScreenLaser', 'S.PointerScreenPoint');
    const h = createRuntime({}, { bundle: true });
    const out = h.eval(`
      local S = {}
      ${fn}
      local mx, my, len, ang = S.PlaceScreenLaser(10, 100, 110, 100)
      return string.format("%.1f|%.1f|%.1f|%.1f", mx, my, len, ang)
    `)[0];
    const [mx, my, len, ang] = out.split('|').map(Number);
    A.near(mx, 60, 0.01);
    A.near(my, 100, 0.01);
    A.near(len, 100, 0.01);
    A.near(ang, 0, 0.01);
  });
};
