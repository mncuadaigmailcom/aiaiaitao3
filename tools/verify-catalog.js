#!/usr/bin/env node
/*
 * tools/verify-catalog.js
 * Kiểm chứng CƠ HỌC danh mục phương pháp trong src/Shared/Methods.luau.
 *
 * Luật (không có ngoại lệ):
 *   1. Mục A/B/C phải có `file` là đường dẫn tệp thật tồn tại trong src/.
 *   2. Mục A/B/C phải có id xuất hiện trong marker
 *      `===== RALO.METHODS: <ID> ... =====` của chính tệp đó.
 *   3. Mục B phải có test tương ứng khai báo id đó trong tests/.
 *   4. Id duy nhất, nhóm trong 1..30, đủ 30 nhóm.
 *   5. Mục D/E KHÔNG ĐƯỢC trỏ vào tệp nguồn (khai "đề xuất" mà có mã là khai khống).
 *
 * Chạy: node tools/verify-catalog.js      (exit 1 nếu có vi phạm)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const TESTS = path.join(ROOT, 'tests');

function readFileSafe(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return null; }
}

// Đọc danh sách tệp .luau trong src/ kèm nội dung và marker của nó
function indexSources() {
  const map = new Map();
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!full.endsWith('.luau')) continue;
      const rel = path.relative(SRC, full).replace(/\\/g, '/').replace(/\.luau$/, '');
      const text = fs.readFileSync(full, 'utf8');
      const ids = new Set();
      const ID_RE = /[A-Z][A-Z0-9]*-\d{3}/g;
      // Dạng khối: ===== RALO.METHODS:BEGIN ===== ... ===== RALO.METHODS:END =====
      const blockRe = /=====\s*RALO\.METHODS:BEGIN\s*=====([\s\S]*?)=====\s*RALO\.METHODS:END\s*=====/g;
      let bm;
      while ((bm = blockRe.exec(text))) {
        for (const id of bm[1].match(ID_RE) || []) ids.add(id);
      }
      // Dạng một dòng: ===== RALO.METHODS:ID1, ID2 =====
      const lineRe = /=====\s*RALO\.METHODS:([^=]*?)\s*=====/g;
      let m;
      while ((m = lineRe.exec(text))) {
        if (/BEGIN|END/.test(m[1])) continue;
        for (const id of m[1].match(ID_RE) || []) ids.add(id);
      }
      map.set(rel, { path: full, ids, text });
    }
  };
  walk(SRC);
  return map;
}

// Đọc danh mục Methods.luau bằng cách phân tích cú pháp bảng đơn giản
function parseCatalog(text) {
  const entries = [];
  const blocks = text.split(/^\t\{$/m);
  for (const block of blocks) {
    const get = (key) => {
      const m = block.match(new RegExp('^\\s+' + key + '\\s*=\\s*"((?:[^"\\\\]|\\\\.)*)"', 'm'))
        || block.match(new RegExp('^\\s+' + key + '\\s*=\\s*(\\d+)\\s*,', 'm'));
      return m ? m[1] : null;
    };
    const id = get('id');
    if (!id) continue;
    entries.push({
      id,
      group: parseInt(get('group'), 10),
      name: get('name'),
      file: get('file'),
      status: get('status'),
    });
  }
  return entries;
}

/*
 * Thu thập id của các phương pháp CÓ TEST THẬT.
 *
 * Tiêu chí (cố ý CHẶT): id phải xuất hiện trong TÊN một test
 * (`suite.test('CULL-002: ...')`) hoặc trong test Luau (`it("CULL-002 ...")`).
 * Chỉ nhắc tới id trong chú thích đầu tệp thì CHƯA đủ — chú thích không
 * chứng minh được điều gì. Đây là điều kiện để một phương pháp được
 * phép khai trạng thái B.
 */
function indexTests() {
  const ids = new Set();
  if (!fs.existsSync(TESTS)) return ids;
  const ID_RE = /[A-Z][A-Z0-9]*-\d{3}/g;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!/\.(luau|lua|js)$/.test(full)) continue;
      const text = fs.readFileSync(full, 'utf8');
      const nameRe = /(?:suite\.test|it|test)\(\s*['"]([^'"]+)['"]/g;
      let m;
      while ((m = nameRe.exec(text))) {
        for (const id of m[1].match(ID_RE) || []) ids.add(id);
      }
    }
  };
  walk(TESTS);
  return ids;
}

const NON_FILES = ['(đề xuất)', '(không áp dụng)', '(không khả dụng)', '(không triển khai'];
// `file` trong catalog là đường dẫn MODULE tương đối src/, không có đuôi .luau
// (vd "Client/Core/Cpu"). Nhiều tệp thì tách bằng dấu phẩy.
function isRealFile(f) {
  if (!f) return false;
  if (NON_FILES.some((p) => f.startsWith(p))) return false;
  if (/[*()]/.test(f)) return false;
  if (f.startsWith('toàn bộ')) return false;
  const first = f.split(',')[0].trim();
  return /^[A-Za-z][A-Za-z0-9_/]*$/.test(first);
}

function main() {
  const catalogText = readFileSafe(path.join(SRC, 'Shared', 'Methods.luau'));
  if (!catalogText) {
    console.error('KHÔNG TÌM THẤY src/Shared/Methods.luau');
    process.exit(1);
  }
  const entries = parseCatalog(catalogText);
  const sources = indexSources();
  const testIds = indexTests();

  const errors = [];
  const seen = new Set();
  const counts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  const groupsSeen = new Set();

  for (const e of entries) {
    if (seen.has(e.id)) errors.push(`${e.id}: id trùng lặp`);
    seen.add(e.id);
    if (counts[e.status] === undefined) {
      errors.push(`${e.id}: trạng thái không hợp lệ '${e.status}'`);
    } else {
      counts[e.status] += 1;
    }
    if (!e.group || e.group < 1 || e.group > 30) errors.push(`${e.id}: nhóm ngoài khoảng 1..30 (${e.group})`);
    else groupsSeen.add(e.group);

    const implemented = e.status === 'A' || e.status === 'B' || e.status === 'C';
    if (implemented) {
      if (!isRealFile(e.file)) {
        errors.push(`${e.id} [${e.status}]: khai đã triển khai nhưng file='${e.file}' không phải tệp nguồn thật`);
      } else {
        const first = e.file.split(',')[0].trim();
        const src = sources.get(first);
        if (!src) {
          errors.push(`${e.id} [${e.status}]: không tìm thấy tệp src/${first}.luau`);
        } else if (!src.ids.has(e.id)) {
          errors.push(`${e.id} [${e.status}]: thiếu marker RALO.METHODS:${e.id} trong src/${first}.luau`);
        }
      }
      if (e.status === 'B' && !testIds.has(e.id)) {
        errors.push(`${e.id} [B]: khai "đã kiểm thử thành công" nhưng không có test nào khai id này trong tests/`);
      }
    } else if (isRealFile(e.file)) {
      errors.push(`${e.id} [${e.status}]: khai chưa triển khai/không áp dụng nhưng lại trỏ tới tệp nguồn '${e.file}'`);
    }
  }

  for (let g = 1; g <= 30; g += 1) {
    if (!groupsSeen.has(g)) errors.push(`thiếu nhóm ${g} trong danh mục`);
  }

  const total = entries.length;
  console.log('=== Kiểm chứng danh mục phương pháp ===');
  console.log(`Tổng số phương pháp : ${total}`);
  console.log(`  A đã triển khai   : ${counts.A}`);
  console.log(`  B đã kiểm thử     : ${counts.B}`);
  console.log(`  C chưa kiểm thử   : ${counts.C}`);
  console.log(`  D đề xuất         : ${counts.D}`);
  console.log(`  E không áp dụng   : ${counts.E}`);
  console.log(`  triển khai thật   : ${counts.A + counts.B + counts.C} / ${total}`);
  console.log(`Số tệp nguồn được quét: ${sources.size}`);

  if (errors.length) {
    console.log(`\nVI PHẠM (${errors.length}):`);
    for (const err of errors) console.log('  ✗ ' + err);
    process.exit(1);
  }
  console.log('\n✓ Danh mục khớp với mã nguồn thật, không có khai khống.');
}

main();
