'use strict';
/**
 * tests/suites/catalog.test.js
 * ===== RALO.METHODS: CATALOG =====
 *
 * Kiểm chứng DANH MỤC PHƯƠNG PHÁP khớp với mã nguồn thật.
 *
 * Đây là chốt chống "khai khống": mỗi phương pháp khai là đã triển khai
 * (A/B/C) PHẢI có marker trong tệp nguồn tương ứng, và mỗi phương pháp
 * khai là đã kiểm thử (B) PHẢI có test thật khai đúng id đó.
 *
 * Nếu ai đó thêm một dòng vào Methods.luau mà không viết mã, suite này FAIL.
 */

const fs = require('fs');
const path = require('path');
const { createRuntime, P, toArray } = require('../lib/runtime');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'src');
const TESTS = path.join(ROOT, 'tests');

function listLuau(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listLuau(full));
    else if (full.endsWith('.luau')) out.push(full);
  }
  return out;
}

/** Đọc marker ===== RALO.METHODS: ... ===== (cả dạng khối BEGIN/END). */
function markersOf(text) {
  const ids = new Set();
  const ID_RE = /[A-Z][A-Z0-9]*-\d{3}/g;
  const blockRe = /=====\s*RALO\.METHODS:BEGIN\s*=====([\s\S]*?)=====\s*RALO\.METHODS:END\s*=====/g;
  let m;
  while ((m = blockRe.exec(text))) {
    for (const id of m[1].match(ID_RE) || []) ids.add(id);
  }
  const lineRe = /=====\s*RALO\.METHODS:([^=]*?)\s*=====/g;
  while ((m = lineRe.exec(text))) {
    if (/BEGIN|END/.test(m[1])) continue;
    for (const id of m[1].match(ID_RE) || []) ids.add(id);
  }
  return ids;
}

function indexSources() {
  const map = new Map();
  for (const full of listLuau(SRC)) {
    const rel = path.relative(SRC, full).replace(/\\/g, '/').replace(/\.luau$/, '');
    map.set(rel, { full, ids: markersOf(fs.readFileSync(full, 'utf8')) });
  }
  return map;
}

/** Id của các phương pháp được khai là B trong tests/ (bằng chứng kiểm thử). */
function testedIds() {
  const ids = new Set();
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!/\.(js|luau|lua)$/.test(full)) continue;
      const text = fs.readFileSync(full, 'utf8');
      // Test khai id trong tên test: suite.test('CPU-009: ...')
      for (const m of text.matchAll(/suite\.test\(\s*'([^']+)'/g)) {
        for (const id of m[1].match(/[A-Z][A-Z0-9]*-\d{3}/g) || []) ids.add(id);
      }
      // hoặc trong chú thích marker của suite
      for (const m of text.matchAll(/RALO\.METHODS:([^\n*]+)/g)) {
        for (const id of m[1].match(/[A-Z][A-Z0-9]*-\d{3}/g) || []) ids.add(id);
      }
    }
  };
  walk(TESTS);
  return ids;
}

module.exports = function catalogSuite(suite) {
  suite.test('CATALOG: đọc được từ Lua và có đúng 30 nhóm', (t, A) => {
    const h = createRuntime();
    const counts = h.call(P.methods, 'CountByStatus');
    A.ok(counts, 'phải đọc được bảng đếm trạng thái');
    A.greaterThan(counts.total, 0, 'danh mục không được rỗng');
    A.equal(counts.A + counts.B + counts.C + counts.D + counts.E, counts.total,
      'tổng 5 trạng thái phải bằng tổng số phương pháp (không có trạng thái lạ)');

    const groupCounts = h.call(P.methods, 'CountByGroup');
    let groupsPresent = 0;
    for (let g = 1; g <= 30; g += 1) {
      if (groupCounts[g] && groupCounts[g].total > 0) groupsPresent += 1;
    }
    A.equal(groupsPresent, 30, 'phải phủ đủ 30 nhóm theo đặc tả Part 4');
  });

  suite.test('CATALOG: mọi mục A/B/C đều có tệp nguồn thật + marker', (t, A) => {
    const h = createRuntime();
    const sources = indexSources();
    const list = toArray(h.call(P.methods, 'ImplementedIds'));
    const missing = [];
    const byId = {};
    // Lấy chi tiết từng mục
    const raw = fs.readFileSync(path.join(SRC, 'Shared', 'Methods.luau'), 'utf8');
    for (const m of raw.matchAll(/id = "([A-Z0-9-]+)"[\s\S]*?file = "([^"]*)"[\s\S]*?status = "([A-E])"/g)) {
      byId[m[1]] = { file: m[2], status: m[3] };
    }

    for (const id of list) {
      const entry = byId[id];
      if (!entry) { missing.push(`${id}: không đọc được trường file/status`); continue; }
      const first = entry.file.split(',')[0].trim();
      const src = sources.get(first);
      if (!src) { missing.push(`${id} [${entry.status}]: không có tệp src/${first}.luau`); continue; }
      if (!src.ids.has(id)) {
        missing.push(`${id} [${entry.status}]: thiếu marker trong src/${first}.luau`);
      }
    }
    A.deepEqual(missing, [], 'mọi mục khai đã triển khai phải có mã thật chống lưng');
    A.greaterThan(list.length, 0, 'phải có ít nhất một mục triển khai');
  });

  suite.test('CATALOG: mọi mục B đều có test thật khai đúng id', (t, A) => {
    const raw = fs.readFileSync(path.join(SRC, 'Shared', 'Methods.luau'), 'utf8');
    const tested = testedIds();
    const claimsWithoutTest = [];
    let claimedB = 0;
    for (const m of raw.matchAll(/id = "([A-Z0-9-]+)"[\s\S]*?status = "([A-E])"/g)) {
      if (m[2] !== 'B') continue;
      claimedB += 1;
      if (!tested.has(m[1])) claimsWithoutTest.push(m[1]);
    }
    A.deepEqual(claimsWithoutTest, [],
      'khai B = "đã kiểm thử thành công" nên BẮT BUỘC có test tương ứng');
    // Ghi nhận để báo cáo cuối: số B phải khớp số test thật
    if (claimedB > 0) {
      A.ok(tested.size >= claimedB, 'số id có test phải >= số mục khai B');
    }
  });

  suite.test('CATALOG: mục D/E KHÔNG được trỏ tới tệp nguồn (chống khai ngược)', (t, A) => {
    const raw = fs.readFileSync(path.join(SRC, 'Shared', 'Methods.luau'), 'utf8');
    const offenders = [];
    for (const m of raw.matchAll(/id = "([A-Z0-9-]+)"[\s\S]*?file = "([^"]*)"[\s\S]*?status = "([A-E])"/g)) {
      if (m[3] !== 'D' && m[3] !== 'E') continue;
      const file = m[2].trim();
      const looksReal = /^[A-Za-z][A-Za-z0-9_/]*$/.test(file.split(',')[0].trim())
        && !/[*()]/.test(file);
      if (looksReal) offenders.push(`${m[1]} [${m[3]}]: trỏ tới '${file}'`);
    }
    A.deepEqual(offenders, [],
      'khai "chưa triển khai" mà lại trỏ tới tệp nguồn là khai mâu thuẫn');
  });

  suite.test('CATALOG: id duy nhất, không trùng lặp', (t, A) => {
    const raw = fs.readFileSync(path.join(SRC, 'Shared', 'Methods.luau'), 'utf8');
    const ids = [...raw.matchAll(/id = "([A-Z0-9-]+)"/g)].map((m) => m[1]);
    const seen = new Set();
    const dups = [];
    for (const id of ids) {
      if (seen.has(id)) dups.push(id);
      seen.add(id);
    }
    A.deepEqual(dups, [], 'không được có id trùng');
    A.greaterThan(ids.length, 0, 'danh mục không được rỗng');
  });

  suite.test('CATALOG: mỗi mục đủ 10 trường bắt buộc theo Part 4', (t, A) => {
    const raw = fs.readFileSync(path.join(SRC, 'Shared', 'Methods.luau'), 'utf8');
    const required = ['id', 'group', 'name', 'mechanism', 'cause', 'how', 'file', 'cond', 'risk', 'status'];
    const blocks = raw.split(/^\t\{$/m).slice(1);
    const incomplete = [];
    for (const block of blocks) {
      const idMatch = block.match(/id = "([A-Z0-9-]+)"/);
      if (!idMatch) continue;
      for (const field of required) {
        const re = new RegExp(`^\\s+${field}\\s*=\\s*("[^"]*"|\\d+)`, 'm');
        if (!re.test(block)) incomplete.push(`${idMatch[1]}: thiếu trường ${field}`);
      }
    }
    A.equal(required.length, 10, 'danh sách trường bắt buộc phải đúng 10 (id, group, name, mechanism, cause, how, file, cond, risk, status)');
    A.deepEqual(incomplete, [], 'mỗi phương pháp phải mô tả đủ theo đặc tả');
    A.greaterThan(blocks.length, 100, 'phải có số lượng phương pháp đáng kể');
  });

  suite.test('CATALOG: số lượng công bố khớp với dữ liệu thật (không làm tròn lên)', (t, A) => {
    const h = createRuntime();
    const counts = h.call(P.methods, 'CountByStatus');
    const groupCounts = h.call(P.methods, 'CountByGroup');
    let implemented = 0;
    for (let g = 1; g <= 30; g += 1) implemented += groupCounts[g].implemented;
    A.equal(implemented, counts.A + counts.B + counts.C,
      'số "đã triển khai" tính theo nhóm phải khớp tính theo trạng thái');
    // In ra để báo cáo cuối dùng đúng con số này
    console.log(`      [catalog] tổng=${counts.total} A=${counts.A} B=${counts.B} `
      + `C=${counts.C} D=${counts.D} E=${counts.E} triển khai=${implemented}`);
  });
};
