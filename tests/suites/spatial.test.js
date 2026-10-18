'use strict';
/**
 * tests/suites/spatial.test.js
 * ===== RALO.METHODS: DATA-002, QUERY-003, QUERY-004, CPU-004, CPU-005,
 *                     NPC-003, DATA-003, DATA-004, LOOP-007 =====
 *
 * Kiểm chứng lưới băm không gian và các tối ưu tra cứu/CPU.
 */

const { createRuntime, P } = require('../lib/runtime');

module.exports = function spatialSuite(suite) {
  suite.test('DATA-002 / QUERY-003: QueryRadius chỉ trả đối tượng trong vùng', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Spatial = __RALO_REQ("Client/Core/Spatial")
      local grid = Spatial.New(100)
      local near, far = Instance.new("Part"), Instance.new("Part")
      near.Name, far.Name = "near", "far"
      grid:Insert(near, Vector3.new(10, 0, 10))
      grid:Insert(far,  Vector3.new(5000, 0, 5000))
      local found = grid:QueryRadius(Vector3.new(0, 0, 0), 100)
      local names = {}
      for _, inst in ipairs(found) do table.insert(names, inst.Name) end
      table.sort(names)
      return #found .. "|" .. table.concat(names, ",")
    `)[0];
    const [count, names] = out.split('|');
    A.equal(count, '1', 'chỉ 1 đối tượng trong bán kính');
    A.equal(names, 'near', 'phải là đối tượng GẦN');
  });

  suite.test('DATA-002: lưới băm xét ÍT đối tượng hơn quét toàn bộ', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Spatial = __RALO_REQ("Client/Core/Spatial")
      local grid = Spatial.New(64)
      -- 500 đối tượng rải đều, chỉ hỏi một vùng nhỏ
      for i = 1, 500 do
        local p = Instance.new("Part")
        grid:Insert(p, Vector3.new((i % 50) * 100, 0, math.floor(i / 50) * 100))
      end
      local total = grid:Count()
      grid:QueryRadius(Vector3.new(0, 0, 0), 64)
      local examined = grid.stats.candidatesExamined
      return total .. "|" .. examined
    `)[0];
    const [total, examined] = out.split('|').map(Number);
    A.equal(total, 500, 'lưới phải chứa đủ 500 đối tượng');
    A.lessThan(examined, total,
      'số ứng viên xét phải NHỎ HƠN tổng — đây là lý do lưới băm tồn tại');
  });

  suite.test('NPC-003: Nearest trả đúng đối tượng gần nhất kèm khoảng cách', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Spatial = __RALO_REQ("Client/Core/Spatial")
      local grid = Spatial.New(100)
      local a, b = Instance.new("Part"), Instance.new("Part")
      a.Name, b.Name = "a", "b"
      grid:Insert(a, Vector3.new(30, 0, 0))
      grid:Insert(b, Vector3.new(80, 0, 0))
      local best, distance = grid:Nearest(Vector3.new(0, 0, 0), 200)
      return best.Name .. "|" .. string.format("%.1f", distance)
    `)[0];
    const [name, distance] = out.split('|');
    A.equal(name, 'a', 'phải chọn đối tượng gần hơn');
    A.near(Number(distance), 30, 0.01, 'khoảng cách phải đúng 30');
  });

  suite.test('NPC-003: ngoài bán kính thì Nearest trả nil (không đoán)', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Spatial = __RALO_REQ("Client/Core/Spatial")
      local grid = Spatial.New(100)
      local p = Instance.new("Part")
      grid:Insert(p, Vector3.new(900, 0, 0))
      local best, distance = grid:Nearest(Vector3.new(0, 0, 0), 100)
      return tostring(best) .. "|" .. tostring(distance)
    `)[0];
    A.equal(out, 'nil|nil', 'không có gì trong bán kính thì phải trả nil');
  });

  suite.test('QUERY-004: Rebuild có trần, không nạp vô hạn', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Spatial = __RALO_REQ("Client/Core/Spatial")
      local grid = Spatial.New(64)
      local list = {}
      for i = 1, 50 do
        local p = Instance.new("Part")
        p.CFrame = CFrame.new(i * 10, 0, 0)
        list[i] = p
      end
      local inserted = grid:Rebuild(list, 20)
      return inserted .. "|" .. grid:Count()
    `)[0];
    const [inserted, count] = out.split('|');
    A.equal(inserted, '20', 'chỉ lập lưới đúng bằng trần');
    A.equal(count, '20', 'số mục trong lưới khớp');
  });

  suite.test('DATA-002: đối tượng di chuyển không bị đếm trùng', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Spatial = __RALO_REQ("Client/Core/Spatial")
      local grid = Spatial.New(100)
      local p = Instance.new("Part")
      grid:Insert(p, Vector3.new(0, 0, 0))
      grid:Insert(p, Vector3.new(500, 0, 0))    -- di chuyển sang ô khác
      local old = #grid:QueryRadius(Vector3.new(0, 0, 0), 50)
      local new = #grid:QueryRadius(Vector3.new(500, 0, 0), 50)
      return grid:Count() .. "|" .. old .. "|" .. new
    `)[0];
    const [count, oldHits, newHits] = out.split('|');
    A.equal(count, '1', 'một đối tượng chỉ có MỘT mục trong lưới');
    A.equal(oldHits, '0', 'ô cũ không còn giữ nó');
    A.equal(newHits, '1', 'ô mới có nó');
  });

  suite.test('CPU-005: DistanceSquared khớp Magnitude nhưng không dùng sqrt', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Cpu = __RALO_REQ("Client/Core/Cpu")
      local a, b = Vector3.new(0, 0, 0), Vector3.new(3, 4, 0)
      local d2 = Cpu.DistanceSquared(a, b)
      local real = (b - a).Magnitude
      local far = Cpu.IsFartherThan(a, b, 4)
      local near = Cpu.IsFartherThan(a, b, 6)
      return string.format("%.4f", d2) .. "|" .. string.format("%.4f", real)
        .. "|" .. tostring(far) .. "|" .. tostring(near)
    `)[0];
    const [d2, real, far, near] = out.split('|');
    A.near(Number(d2), 25, 1e-9, 'bình phương khoảng cách 3-4-5 phải là 25');
    A.near(Number(real), 5, 1e-9, 'khoảng cách thật phải là 5');
    A.equal(far, 'true', '5 > 4 nên phải là "xa hơn"');
    A.equal(near, 'false', '5 < 6 nên không phải "xa hơn"');
  });

  suite.test('CPU-004: HoistedLoop chỉ gọi hàm đắt đúng MỘT lần', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Cpu = __RALO_REQ("Client/Core/Cpu")
      _G.__RALO_CALLS = 0
      _G.__RALO_SEEN = 0
      local invariant = Cpu.HoistedLoop(1000, function()
        _G.__RALO_CALLS += 1
        return 42
      end, function(index, value)
        _G.__RALO_SEEN += value
      end)
      return _G.__RALO_CALLS .. "|" .. invariant .. "|" .. _G.__RALO_SEEN
    `)[0];
    const [calls, invariant, seen] = out.split('|');
    A.equal(calls, '1', 'hàm đắt chỉ được gọi 1 lần dù lặp 1000 lần');
    A.equal(invariant, '42', 'giá trị bất biến được truyền vào thân vòng lặp');
    A.equal(seen, '42000', '1000 lần x 42');
  });

  suite.test('DATA-003 / LOOP-007: ForEachIndex đọc độ dài một lần và hỗ trợ dừng sớm', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Cpu = __RALO_REQ("Client/Core/Cpu")
      local visitedAll = Cpu.ForEachIndex({ 1, 2, 3, 4, 5 }, function() return false end)
      local visitedEarly = Cpu.ForEachIndex({ 1, 2, 3, 4, 5 }, function(v)
        return v == 3          -- dừng khi gặp 3
      end)
      return visitedAll .. "|" .. visitedEarly
    `)[0];
    const [all, early] = out.split('|');
    A.equal(all, '5', 'duyệt hết khi không dừng sớm');
    A.equal(early, '3', 'dừng sớm đúng lúc');
  });

  suite.test('DATA-004: BuildProtectedSet tra cứu O(1) thay vì duyệt danh sách', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Safety = __RALO_REQ("Shared/Safety")
      -- Giả lập CollectionService với 2 đối tượng mang tag bảo vệ
      local a, b = Instance.new("Part"), Instance.new("Part")
      local fakeService = {
        GetTagged = function(_self, tag)
          if tag == "Gameplay" then return { a } end
          if tag == "RALO_Protected" then return { b } end
          return {}
        end,
      }
      local set = Safety.BuildProtectedSet(fakeService)
      local n = 0
      for _ in pairs(set) do n += 1 end
      local allowedA = Safety.Allow(a, "CastShadow", set)
      local allowedOther = Safety.Allow(Instance.new("Part"), "CastShadow", set)
      return n .. "|" .. tostring(allowedA) .. "|" .. tostring(allowedOther)
    `)[0];
    const [count, allowedA, allowedOther] = out.split('|');
    A.equal(count, '2', 'set phải chứa cả 2 đối tượng được tag');
    A.equal(allowedA, 'false', 'đối tượng có tag bảo vệ PHẢI bị từ chối');
    A.equal(allowedOther, 'true', 'đối tượng thường vẫn được phép');
  });
};
