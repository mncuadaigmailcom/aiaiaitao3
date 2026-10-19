'use strict';
/**
 * doors-entity-radar/tests/suites/geometry.test.js
 *
 * Kiểm chứng toán định vị: đọc vị trí THẬT, từ chối toạ độ rác, tính khoảng
 * cách và 8 hướng tương đối. Đây là phần quyết định "có được hiện toạ độ
 * hay không" nên phải test kỹ.
 */

const { createRuntime, P } = require('../lib/runtime');

module.exports = function geometrySuite(suite) {
  suite.test('GEO-001: IsPositionVector từ chối NaN, vô hạn và thiếu thành phần', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Geometry = __DER_REQ("Shared/Geometry")
      return Geometry.IsPositionVector(Vector3.new(1, 2, 3)),
             Geometry.IsPositionVector(Vector3.new(0/0, 0, 0)),
             Geometry.IsPositionVector(Vector3.new(1/0, 0, 0)),
             Geometry.IsPositionVector({ X = 1, Y = 2 }),
             Geometry.IsPositionVector("khong phai vector"),
             Geometry.IsPositionVector(nil),
             Geometry.IsPositionVector(Vector3.new(1e9, 0, 0))
    `);
    A.deepEqual(result, [true, false, false, false, false, false, false],
      'chỉ vector số hữu hạn, đủ 3 thành phần, trong tầm hợp lệ mới đạt');
  });

  suite.test('GEO-002: Distance tính đúng và trả nil khi đầu vào sai', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Geometry = __DER_REQ("Shared/Geometry")
      return Geometry.Distance(Vector3.new(0, 0, 0), Vector3.new(3, 0, 4)),
             Geometry.Distance(Vector3.new(1, 1, 1), Vector3.new(1, 1, 1)),
             Geometry.Distance(nil, Vector3.new(0, 0, 0)),
             Geometry.Distance(Vector3.new(0, 0, 0), Vector3.new(0/0, 0, 0))
    `);
    A.equal(result[0], 5, 'tam giác 3-4-5');
    A.equal(result[1], 0, 'hai điểm trùng nhau');
    A.equal(result[2], null, 'thiếu đầu vào phải trả nil');
    A.equal(result[3], null, 'toạ độ NaN phải trả nil');
  });

  suite.test('GEO-003: ReadPosition đọc từ BasePart, Model (GetPivot), PrimaryPart, part con', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Geometry = __DER_REQ("Shared/Geometry")
      local workspace = game:GetService("Workspace")

      -- (a) BasePart: đọc qua CFrame.Position
      local part = Instance.new("Part")
      part.Name = "PartCoViTri"
      part.CFrame = CFrame.new(10, 20, 30)
      part.Parent = workspace
      local posA, reasonA = Geometry.ReadPosition(part)

      -- (b) Model có PrimaryPart -> GetPivot
      local model = Instance.new("Model")
      model.Name = "ModelCoPrimary"
      local inner = Instance.new("Part")
      inner.CFrame = CFrame.new(1, 2, 3)
      inner.Parent = model
      model.PrimaryPart = inner
      model.Parent = workspace
      local posB, reasonB = Geometry.ReadPosition(model)

      -- (c) Folder chứa part: bản thân Folder không có vị trí lẫn GetPivot,
      --     nên phải rơi xuống nhánh "part con đầu tiên" và nói rõ điều đó.
      local loose = Instance.new("Folder")
      loose.Name = "FolderCoPart"
      local child = Instance.new("Part")
      child.Name = "ChildPart"
      child.CFrame = CFrame.new(7, 8, 9)
      child.Parent = loose
      loose.Parent = workspace
      local posC, reasonC = Geometry.ReadPosition(loose)

      return posA.X, posA.Y, posA.Z, reasonA,
             posB.X, reasonB,
             posC.X, reasonC
    `);
    A.equal(result[0], 10);
    A.equal(result[1], 20);
    A.equal(result[2], 30);
    A.matches(result[3], /CFrame\.Position/, 'phải nói rõ đọc từ đâu');
    A.equal(result[4], 1, 'GetPivot phải trả toạ độ PrimaryPart');
    A.matches(result[5], /GetPivot/);
    A.equal(result[6], 7, 'fallback part con');
    A.matches(result[7], /part con 'ChildPart'/, 'lý do phải nêu rõ nguồn fallback');
  });

  suite.test('GEO-004: ReadPosition trả nil kèm lý do khi instance chết hoặc không có vị trí', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Geometry = __DER_REQ("Shared/Geometry")
      local workspace = game:GetService("Workspace")

      local dead = Instance.new("Model")
      dead.Name = "DaHu"
      dead.Parent = workspace
      dead:Destroy()
      local posDead, reasonDead = Geometry.ReadPosition(dead)

      local empty = Instance.new("Folder")
      empty.Name = "FolderRong"
      empty.Parent = workspace
      local posEmpty, reasonEmpty = Geometry.ReadPosition(empty)

      local posNil, reasonNil = Geometry.ReadPosition(nil)

      return posDead == nil, reasonDead, posEmpty == nil, reasonEmpty, posNil == nil, reasonNil
    `);
    A.equal(result[0], true, 'instance đã Destroy không được trả vị trí');
    // Mock đánh dấu instance đã huỷ bằng Parent = nil; Roblox thật ném lỗi.
    // Cả hai đường đều phải dẫn tới "không có vị trí" + lý do rõ ràng.
    A.matches(result[1], /Destroy|Parent = nil/);
    A.equal(result[2], true, 'Folder rỗng không có vị trí');
    A.matches(result[3], /Không đọc được vị trí/);
    A.equal(result[4], true);
    A.matches(result[5], /Không có instance/);
  });

  suite.test('GEO-005: RelativeDirection trả đúng 8 hướng theo góc', (t, A) => {
    const h = createRuntime();
    // Camera nhìn về -Z. Người chơi ở gốc. Kiểm tra đủ 8 hướng.
    const cases = [
      { x: 0, z: -10, expect: 'phía trước' },
      { x: 7, z: -7, expect: 'trước phải' },
      { x: 10, z: 0, expect: 'bên phải' },
      { x: 7, z: 7, expect: 'sau phải' },
      { x: 0, z: 10, expect: 'phía sau' },
      { x: -7, z: 7, expect: 'sau trái' },
      { x: -10, z: 0, expect: 'bên trái' },
      { x: -7, z: -7, expect: 'trước trái' },
    ];
    for (const c of cases) {
      const label = h.eval(`
        local Geometry = __DER_REQ("Shared/Geometry")
        local look = Vector3.new(0, 0, -1)
        local right = Vector3.new(1, 0, 0)
        local from = Vector3.new(0, 0, 0)
        local target = Vector3.new(${c.x}, 0, ${c.z})
        return (Geometry.RelativeDirection(look, right, from, target))
      `)[0];
      A.equal(label, c.expect, `hướng của điểm (${c.x}, ${c.z})`);
    }
  });

  suite.test('GEO-006: RelativeDirection trả nil khi thiếu dữ liệu, và "ngay cạnh" khi quá gần', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Geometry = __DER_REQ("Shared/Geometry")
      local look = Vector3.new(0, 0, -1)
      local from = Vector3.new(0, 0, 0)
      local noLook = Geometry.RelativeDirection(nil, nil, from, Vector3.new(0, 0, -5))
      local near = Geometry.RelativeDirection(look, nil, from, Vector3.new(0.01, 0, 0.01))
      local straightUp = Geometry.RelativeDirection(Vector3.new(0, 1, 0), nil, from, Vector3.new(0, 0, -5))
      return noLook, near, straightUp
    `);
    A.equal(result[0], null, 'thiếu hướng nhìn thì không được đoán hướng');
    A.equal(result[1], 'ngay cạnh', 'quá gần thì nói "ngay cạnh"');
    A.equal(result[2], null, 'nhìn thẳng đứng: phép chiếu ngang vô nghĩa');
  });

  suite.test('GEO-007: RelativeDirection tự suy ra trục phải khi không có RightVector', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Geometry = __DER_REQ("Shared/Geometry")
      local from = Vector3.new(0, 0, 0)
      local withRight = Geometry.RelativeDirection(Vector3.new(0, 0, -1), Vector3.new(1, 0, 0), from, Vector3.new(10, 0, 0))
      local withoutRight = Geometry.RelativeDirection(Vector3.new(0, 0, -1), nil, from, Vector3.new(10, 0, 0))
      return withRight, withoutRight
    `);
    A.equal(result[0], 'bên phải');
    A.equal(result[1], 'bên phải', 'tự suy trục phải vẫn phải cho cùng kết quả');
  });

  suite.test('GEO-008: FormatDistance/FormatAge trả nil với dữ liệu không hợp lệ', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Geometry = __DER_REQ("Shared/Geometry")
      return Geometry.FormatDistance(12.34), Geometry.FormatDistance(0/0),
             Geometry.FormatAge(0.42), Geometry.FormatAge(45.6), Geometry.FormatAge(-1), Geometry.FormatAge(nil)
    `);
    A.equal(result[0], '12.3 stud');
    A.equal(result[1], null, 'NaN không được in ra thành số');
    A.equal(result[2], '0.4s trước');
    A.equal(result[3], '46s trước');
    A.equal(result[4], null, 'tuổi âm là dữ liệu sai');
    A.equal(result[5], null);
  });

  suite.test('SAFE-001: Safe.IsClass/IsAlive/Read/Write hành xử an toàn với instance đã huỷ', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Safe = __DER_REQUIRE("Shared/Safe")
      local workspace = game:GetService("Workspace")
      local part = Instance.new("Part")
      part.Name = "TestPart"
      part.Parent = workspace
      local isPart = Safe.IsClass(part, "Part", "MeshPart")
      local isMesh = Safe.IsClass(part, "MeshPart")
      local aliveBefore = Safe.IsAlive(part)
      part:Destroy()
      local aliveAfter = Safe.IsAlive(part)
      local nameAfter = Safe.GetName(part)
      local value, ok = Safe.Read(part, "Name")
      local nilSafe = Safe.IsClass(nil, "Part")
      return isPart, isMesh, aliveBefore, aliveAfter, nameAfter, ok, nilSafe
    `);
    A.deepEqual(result, [true, false, true, false, null, false, false]);
  });
};
