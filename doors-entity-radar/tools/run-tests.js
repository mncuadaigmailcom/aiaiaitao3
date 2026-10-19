#!/usr/bin/env node
'use strict';
/**
 * doors-entity-radar/tools/run-tests.js
 *
 * CHẠY THẬT mã nguồn doors-entity-radar/src/**.luau trong máy ảo Lua 5.3
 * (fengari) với mock Roblox API và ĐỒNG HỒ ẢO.
 *
 * GIỚI HẠN PHẢI NÊU RÕ (không che giấu):
 *   Đây KHÔNG PHẢI Roblox Studio. Harness chứng minh LOGIC của mã nguồn thật
 *   (thuật toán, trạng thái, chốt an toàn, vòng đời GUI, dọn dẹp tài nguyên)
 *   nhưng KHÔNG chứng minh:
 *     - API Roblox thật hành xử giống hệt mock;
 *     - tên instance trong DOORS thật trùng với mẫu tên trong danh mục;
 *     - giao diện trông ra sao / FPS thật là bao nhiêu.
 *   Ba điều đó chỉ kiểm chứng được bằng cách chạy trong game.
 *
 * Chạy:  npm test            (mọi suite)
 *        npm test -- scanner (chỉ suite có tên chứa "scanner")
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SUITES_DIR = path.join(ROOT, 'tests', 'suites');
const ASSERT_LIB = path.resolve(__dirname, '..', '..', 'tests', 'lib', 'assert');

const filter = process.argv.slice(2).join(' ').trim().toLowerCase();

function listSuites() {
  if (!fs.existsSync(SUITES_DIR)) return [];
  return fs.readdirSync(SUITES_DIR).filter((f) => f.endsWith('.test.js')).sort();
}

function color(code, text) {
  return process.stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text;
}

function makeSuite(name) {
  const tests = [];
  const suite = {
    name,
    test(label, fn) {
      tests.push({ label, fn });
    },
  };
  function run() {
    const rows = [];
    for (const t of tests) {
      try {
        t.fn(null, require(ASSERT_LIB));
        rows.push({ label: t.label, pass: true });
      } catch (err) {
        rows.push({
          label: t.label,
          pass: false,
          message: err && err.message ? err.message : String(err),
          stack: err && err.stack ? err.stack.split('\n').slice(1, 4).join('\n') : '',
        });
      }
    }
    return rows;
  }
  return { suite, run, tests };
}

function main() {
  const files = listSuites();
  if (files.length === 0) {
    console.error('không có test suite nào trong doors-entity-radar/tests/suites/');
    process.exit(1);
  }

  console.log('=== DOORS Entity Radar — bộ kiểm thử ===');
  console.log('Môi trường: máy ảo Lua 5.3 (fengari) + mock Roblox + đồng hồ ảo');
  console.log('LƯU Ý: KHÔNG phải Roblox Studio. Xem README mục "Giới hạn kiểm chứng".\n');

  let passed = 0;
  let failed = 0;

  for (const file of files) {
    if (filter && !file.toLowerCase().includes(filter)) continue;
    const abs = path.join(SUITES_DIR, file);
    let loaded;
    try {
      loaded = require(abs);
    } catch (err) {
      console.log(color('31', `✗ ${file}: không nạp được suite — ${err.message}`));
      failed += 1;
      continue;
    }
    if (typeof loaded !== 'function') {
      console.log(color('31', `✗ ${file}: suite phải export một hàm (suite) => void`));
      failed += 1;
      continue;
    }

    const { suite, run, tests } = makeSuite(file.replace(/\.test\.js$/, ''));
    loaded(suite);

    console.log(`── ${file} (${tests.length} test)`);
    const rows = run();
    for (const row of rows) {
      if (row.pass) {
        passed += 1;
        console.log(color('32', `   ✓ ${row.label}`));
      } else {
        failed += 1;
        console.log(color('31', `   ✗ ${row.label}`));
        console.log(color('31', `       ${row.message}`));
        if (row.stack) console.log(color('90', `       ${row.stack.replace(/\n/g, '\n       ')}`));
      }
    }
    console.log('');
  }

  console.log('=== TỔNG KẾT ===');
  console.log(`  đạt  : ${passed}`);
  console.log(`  hỏng : ${failed}`);
  console.log(`  tổng : ${passed + failed}`);
  if (failed === 0) {
    console.log('\n✓ Toàn bộ test đạt — trên máy ảo Lua, KHÔNG phải Roblox Studio.');
  } else {
    console.log('\n✗ Có test hỏng. KHÔNG được coi dự án là hoàn tất.');
  }
  process.exit(failed === 0 ? 0 : 1);
}

module.exports = { makeSuite };

if (require.main === module) main();
