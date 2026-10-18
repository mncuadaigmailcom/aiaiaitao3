#!/usr/bin/env node
'use strict';
/**
 * tools/test-harness/run.js
 *
 * CHẠY THẬT mã nguồn src/**.luau trong máy ảo Lua 5.3 (fengari) với mock
 * Roblox API và ĐỒNG HỒ ẢO. Đây là bằng chứng cho trạng thái B.
 *
 * GIỚI HẠN PHẢI NÊU RÕ (không được che giấu):
 *   Đây KHÔNG PHẢI Roblox Studio. Nó là máy ảo Lua chạy logic thật của dự
 *   án trên mock API. Nó chứng minh được LOGIC đúng (thuật toán, trạng
 *   thái, chốt an toàn, vòng đời GUI) nhưng KHÔNG chứng minh được:
 *     - API Roblox thật có hành vi giống mock
 *     - FPS/RAM thật thay đổi thế nào
 *     - GUI trông ra sao trên màn hình
 *   Những thứ đó cần bạn chạy trong Studio — xem docs/04-kiem-thu.md.
 *
 * Chạy:  npm test          (mọi suite)
 *        npm test -- gui   (chỉ suite tên chứa "gui")
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SUITES_DIR = path.join(ROOT, 'tests', 'suites');

const filter = process.argv.slice(2).join(' ').trim().toLowerCase();

function listSuites() {
  if (!fs.existsSync(SUITES_DIR)) return [];
  return fs.readdirSync(SUITES_DIR)
    .filter((f) => f.endsWith('.test.js'))
    .sort();
}

function color(code, text) {
  return process.stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text;
}

const results = [];
let totalAssertions = 0;

function makeSuite(name) {
  const tests = [];
  const suite = {
    name,
    /** Đăng ký một test. fn nhận (h, A):
     *  h = môi trường test (tests/lib/runtime), A = bộ khẳng định. */
    test(label, fn) {
      tests.push({ label, fn });
    },
  };

  function run() {
    const rows = [];
    // Mỗi test TỰ tạo runtime riêng (createRuntime), nên suite không chia
    // sẻ trạng thái Lua giữa các test.
    for (const t of tests) {
      try {
        t.fn(null, require('../../tests/lib/assert'));
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
    console.error('không có test suite nào trong tests/suites/');
    process.exit(1);
  }

  console.log('=== Roblox Anti-Lag Optimizer — bộ kiểm thử ===');
  console.log('Môi trường: máy ảo Lua 5.3 (fengari) + mock Roblox API + đồng hồ ảo');
  console.log('LƯU Ý: đây KHÔNG phải Roblox Studio. Xem docs/04-kiem-thu.md\n');

  let passed = 0;
  let failed = 0;

  for (const file of files) {
    if (filter && !file.toLowerCase().includes(filter)) continue;
    const abs = path.join(SUITES_DIR, file);
    let loaded;
    try {
      // eslint-disable-next-line global-require, import/no-dynamic-require
      loaded = require(abs);
    } catch (err) {
      console.log(color('31', `✗ ${file}: không nạp được suite — ${err.message}`));
      failed += 1;
      continue;
    }

    if (typeof loaded !== 'function') {
      console.log(color('31', `✗ ${file}: suite phải export một hàm (suite) => ${typeof loaded}`));
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
        totalAssertions += 1;
        console.log(color('32', `   ✓ ${row.label}`));
      } else {
        failed += 1;
        console.log(color('31', `   ✗ ${row.label}`));
        console.log(color('31', `       ${row.message}`));
        if (row.stack) console.log(color('90', `       ${row.stack.replace(/\n/g, '\n       ')}`));
      }
    }
    results.push({ file, rows });
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
