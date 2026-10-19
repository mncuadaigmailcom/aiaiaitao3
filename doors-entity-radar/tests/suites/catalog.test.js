'use strict';
/**
 * doors-entity-radar/tests/suites/catalog.test.js
 *
 * Kiểm chứng DANH MỤC: đủ mục, đúng khu vực, đúng ràng buộc dữ liệu.
 * Đối chiếu trực tiếp với danh sách khu vực/thực thể trong yêu cầu dự án —
 * nếu thiếu một tên, test FAIL. Đây là bằng chứng "không bỏ sót", không phải
 * bằng chứng "định vị được".
 */

const { createRuntime, P, toArray } = require('../lib/runtime');

/** Danh sách NGUYÊN VĂN từ yêu cầu dự án (để đối chiếu, không sửa theo code). */
const SPEC = {
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

const EXPECTED_COUNTS = {
  hotel: 23, mines: 27, backdoor: 6, archives: 14, outdoors: 13, stairwell: 12, rooms: 3, events: 12,
};

module.exports = function catalogSuite(suite) {
  suite.test('CAT-001: danh mục có 82 mục duy nhất và 110 cặp mục-khu vực', (t, A) => {
    const h = createRuntime();
    A.equal(h.call(P.catalog, 'Count'), 82, 'số mục duy nhất');
    A.equal(h.call(P.catalog, 'CountMemberships'), 110, 'tổng số cặp (mục, khu vực)');
  });

  suite.test('CAT-002: số mục mỗi khu vực khớp đúng yêu cầu', (t, A) => {
    const h = createRuntime();
    const counts = h.call(P.catalog, 'GetAreaCounts');
    for (const areaId of Object.keys(EXPECTED_COUNTS)) {
      A.equal(counts[areaId], EXPECTED_COUNTS[areaId], `số mục khu vực ${areaId}`);
    }
  });

  suite.test('CAT-003: mọi tên trong yêu cầu đều có mặt (so theo khoá chuẩn hoá)', (t, A) => {
    const h = createRuntime();
    const missing = [];
    for (const areaId of Object.keys(SPEC)) {
      // Lấy danh sách tên của khu vực từ danh mục, chuẩn hoá rồi so.
      const entries = toArray(h.call(P.catalog, 'GetByArea', areaId));
      const haveKeys = new Set();
      for (const entry of entries) {
        haveKeys.add(h.call(P.catalog, 'NormalizeKey', entry.name).toLowerCase());
        haveKeys.add(h.call(P.catalog, 'NormalizeKey', entry.id).toLowerCase());
        const patterns = toArray(entry.detect.patterns);
        for (const pattern of patterns) {
          haveKeys.add(h.call(P.catalog, 'NormalizeKey', pattern).toLowerCase());
        }
      }
      for (const wanted of SPEC[areaId]) {
        // "Forget Me Nots (Forget-Me-Not)" chấp nhận cả hai cách viết.
        const variants = [wanted];
        if (wanted.includes('(')) {
          variants.push(wanted.split('(')[0].trim());
          variants.push(wanted.split('(')[1].replace(')', '').trim());
        }
        const matched = variants.some((variant) => {
          const key = h.call(P.catalog, 'NormalizeKey', variant).toLowerCase();
          return haveKeys.has(key);
        });
        if (!matched) missing.push(`${areaId}: ${wanted}`);
      }
    }
    A.deepEqual(missing, [], 'danh sách tên còn thiếu');
  });

  suite.test('CAT-004: Validate() đạt và không có vấn đề dữ liệu', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local ok, problems = __DER_REQ("Shared/EntityCatalog").Validate()
      return ok, #problems, table.concat(problems, " | ")
    `);
    A.equal(result[0], true, 'Validate phải đạt');
    A.equal(result[1], 0, `số vấn đề: ${result[2]}`);
  });

  suite.test('CAT-005: mục scan phải có mẫu tên, mục unsupported phải có lý do', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Catalog = __DER_REQ("Shared/EntityCatalog")
      local badScan, badUnsupported = 0, 0
      for _, entry in ipairs(Catalog.List) do
        if entry.detect.method == "scan" and #Catalog.GetMatchKeys(entry) == 0 then
          badScan = badScan + 1
        end
        if entry.detect.method == "unsupported"
          and (entry.detect.reason == nil or entry.detect.reason == "") then
          badUnsupported = badUnsupported + 1
        end
      end
      return badScan, badUnsupported
    `);
    A.equal(result[0], 0, 'mục scan thiếu mẫu tên');
    A.equal(result[1], 0, 'mục unsupported thiếu lý do');
  });

  suite.test('CAT-006: aliasOf trỏ đúng mục có thật và không tạo chu trình', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Catalog = __DER_REQ("Shared/EntityCatalog")
      local aliasCount, dangling, cycle = 0, 0, 0
      for _, entry in ipairs(Catalog.List) do
        local aliasId = entry.detect.aliasOf
        if aliasId ~= nil then
          aliasCount = aliasCount + 1
          if Catalog.ById[aliasId] == nil then dangling = dangling + 1 end
          local seen, cursor, hops = {}, entry, 0
          while cursor ~= nil and cursor.detect.aliasOf ~= nil and hops < 16 do
            if seen[cursor.id] then cycle = cycle + 1 break end
            seen[cursor.id] = true
            cursor = Catalog.ById[cursor.detect.aliasOf]
            hops = hops + 1
          end
        end
      end
      return aliasCount, dangling, cycle
    `);
    A.equal(result[1], 0, 'alias trỏ tới mục không tồn tại');
    A.equal(result[2], 0, 'alias tạo chu trình');
    A.greaterThan(result[0], 0, 'phải có ít nhất một alias (biến thể tên)');
  });

  suite.test('CAT-007: mọi kind đều có nhãn tiếng Việt và chưa mục nào tự nhận đã xác minh', (t, A) => {
    const h = createRuntime();
    const result = h.eval(`
      local Catalog = __DER_REQ("Shared/EntityCatalog")
      local missingLabel, claimedConfirmed = 0, 0
      for _, entry in ipairs(Catalog.List) do
        if Catalog.KindLabel[entry.kind] == nil then missingLabel = missingLabel + 1 end
        if entry.kindConfirmed == true then claimedConfirmed = claimedConfirmed + 1 end
      end
      return missingLabel, claimedConfirmed
    `);
    A.equal(result[0], 0, 'kind thiếu nhãn');
    A.equal(result[1], 0, 'không mục nào được tự phong "đã xác minh phân loại"');
  });

  suite.test('CAT-008: NormalizeKey bỏ dấu cách/dấu gạch và hạ chữ hoa', (t, A) => {
    const h = createRuntime();
    A.equal(h.call(P.catalog, 'NormalizeKey', 'A-60 (Room 3)'), 'a60room3');
    A.equal(h.call(P.catalog, 'NormalizeKey', 'El Goblino'), 'elgoblino');
    A.equal(h.call(P.catalog, 'NormalizeKey', 'RNIUSHCg=='), 'rniushcg');
    A.equal(h.call(P.catalog, 'NormalizeKey', ''), '');
    A.equal(h.call(P.catalog, 'NormalizeKey', null), '');
  });

  suite.test('CAT-009: GetMatchKeys chỉ trả mẫu RIÊNG; aliasOf chỉ là chú thích', (t, A) => {
    const h = createRuntime();
    // Gọi hoàn toàn trong Lua: bảng Lua không đẩy ngược lại được qua tham số JS.
    // CHỐT TRUNG THỰC: một instance tên "Seek" KHÔNG được phép làm cho
    // Dam Seek hiện "Đã phát hiện" — đó là báo sai. aliasOf chỉ để hiển thị
    // "biến thể của ...", còn mẫu khớp phải thuộc về chính mục đó.
    const result = h.eval(`
      local Catalog = __DER_REQ("Shared/EntityCatalog")
      local damSeek = Catalog.GetMatchKeys(Catalog.ById["dam_seek"])
      local rush = Catalog.GetMatchKeys(Catalog.ById["rush"])
      local rniushcg = Catalog.GetMatchKeys(Catalog.ById["rniushcg"])
      return table.concat(damSeek, ","), table.concat(rush, ","), table.concat(rniushcg, ","),
             tostring(Catalog.GetAliasName(Catalog.ById["dam_seek"])),
             tostring(Catalog.GetAliasName(Catalog.ById["rush"])),
             #Catalog.GetMatchKeys(nil)
    `);
    A.equal(result[0], 'damseek', 'Dam Seek chỉ dò mẫu riêng');
    A.equal(result[1], 'rush');
    A.equal(result[2], 'rniushcg', 'RNIUSHCg== chỉ dò mẫu riêng');
    A.equal(result[3], 'Seek', 'alias vẫn hiển thị được tên mục gốc');
    A.equal(result[4], 'nil', 'mục không phải biến thể thì không có alias');
    A.equal(result[5], 0, 'GetMatchKeys(nil) phải an toàn');
  });

  suite.test('CAT-010: Search lọc đúng theo từ khoá và khu vực', (t, A) => {
    const h = createRuntime();
    // Chuỗi rỗng = không lọc khu vực (Tracker cũng quy ước như vậy).
    // Ô tìm kiếm là TÌM THEO CHUỖI CON (đúng hành vi ô tìm kiếm), nên
    // "rush" cũng khớp "Crusher" và "Rushing Light" — liệt kê rõ để không
    // ai tưởng kết quả là sai.
    const byName = toArray(h.call(P.catalog, 'Search', 'rush', '')).map((e) => e.id);
    A.deepEqual(byName, ['crusher', 'rush', 'rushing_light'], 'kết quả tìm "rush"');

    // Tìm theo tên có dấu vẫn trúng nhờ chuẩn hoá.
    const byDashed = toArray(h.call(P.catalog, 'Search', 'A-60', '')).map((e) => e.id);
    A.deepEqual(byDashed, ['a60'], 'tìm "A-60" phải ra đúng mục a60');

    const hotelOnly = toArray(h.call(P.catalog, 'Search', 'glitch', 'hotel'));
    A.equal(hotelOnly.length, 1, 'Glitch phải xuất hiện khi lọc Hotel');

    const roomsOnly = toArray(h.call(P.catalog, 'Search', '', 'rooms'));
    A.equal(roomsOnly.length, 3, 'khu Rooms có đúng 3 mục');

    const noMatch = toArray(h.call(P.catalog, 'Search', 'khongtonatai', ''));
    A.equal(noMatch.length, 0, 'từ khoá lạ không được trả kết quả bừa');
  });

  suite.test('CAT-011: Areas đủ 8 khu vực, id duy nhất, thứ tự ổn định', (t, A) => {
    const h = createRuntime();
    A.equal(h.call(P.areas, 'Count'), 8, 'số khu vực');
    const ids = toArray(h.call(P.areas, 'GetOrderedIds'));
    A.deepEqual(ids, ['hotel', 'mines', 'backdoor', 'archives', 'outdoors', 'stairwell', 'rooms', 'events']);
    A.equal(h.call(P.areas, 'IsValid', 'hotel'), true);
    A.equal(h.call(P.areas, 'IsValid', 'khongcotontai'), false);
  });
};
