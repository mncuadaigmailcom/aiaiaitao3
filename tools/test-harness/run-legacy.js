#!/usr/bin/env node
'use strict';
/**
 * tools/test-harness/run-legacy.js
 *
 * Chạy các ca TÁI HIỆN LỖI của khối S.ObjTrack trong script.js.
 * Đây là test "lỗi có thật": đạt nghĩa là lỗi vẫn còn trong bản gốc.
 * Không nằm trong `npm test` để bộ test chính chỉ chứa các bất biến đúng.
 *
 * Chạy: npm run test:legacy
 */

const path = require('path');
const { LuaRuntime } = require('./lua-runtime');
const { buildLegacySource, staticChecks } = require('../../tests/lib/legacy-objtrack');

const ROOT = path.resolve(__dirname, '..', '..');
const CASES_PATH = path.join(ROOT, 'tests', 'legacy', 'cases.lua');

const runtimeCases = [
  ['LEGACY-PATH-DEMOTE', 'Path chưa tồn tại bị hạ cấp thành tên rác (AddEntry/RebuildKeys)'],
  ['LEGACY-SLOT-LEAK', 'Clear không đặt lại _slotN/_orderN (mảng order phình)'],
  ['LEGACY-SCANMS-ELAPSED', 'ScanFinish báo scanMs bằng thời gian chờ giữa các khung'],
  ['LEGACY-SYNC-RESCAN', 'Rescan gọi ScanSlice(1e9,1e9,true) — quét đồng bộ cả workspace'],
  ['LEGACY-USESAVED-META', 'UseSaved bỏ qua maxDist/color đã lưu trong preset'],
  ['LEGACY-STALE-LIST', 'Chữ ký danh sách không chứa dist -> khoảng cách UI đóng băng'],
  ['LEGACY-SAVE-DUP', 'Lưu cùng một truy vấn nhiều lần sinh preset trùng'],
  ['LEGACY-NO-ORIGIN', 'Mất vị trí gốc -> bộ lọc "Xa nhất" bị vô hiệu, dist = 0'],
];

function main() {
  console.log('=== TÁI HIỆN LỖI S.OBJTRACK (script.js) ===');
  console.log('Môi trường: máy ảo Lua 5.3 + mock Roblox. KHÔNG phải Roblox Studio.');
  console.log('Đạt = lỗi trong script.js gốc được tái hiện đúng.\n');

  const source = buildLegacySource();
  let passed = 0;
  let failed = 0;

  for (const [id, label] of runtimeCases) {
    let rt;
    try {
      rt = new LuaRuntime();
      rt.setup({ parts: 0, emitters: 0 });
      rt.run(source, 'legacy-objtrack');
      rt.runFileAsGlobal(CASES_PATH, 'LEGACY_CASES');
      rt.run(`LEGACY_CASES.run(${JSON.stringify(id)})`, id);
      console.log(`   ✓ ${id}: ${label}`);
      passed += 1;
    } catch (err) {
      console.log(`   ✗ ${id}: ${label}`);
      console.log(`       ${String(err.message).split('\n')[0]}`);
      failed += 1;
    }
  }

  for (const check of staticChecks()) {
    if (check.pass) {
      console.log(`   ✓ ${check.id}: ${check.message}`);
      passed += 1;
    } else {
      console.log(`   ✗ ${check.id}: ${check.message}`);
      failed += 1;
    }
  }

  console.log('\n=== TỔNG KẾT TÁI HIỆN ===');
  console.log(`  tái hiện được : ${passed}`);
  console.log(`  không đạt     : ${failed}`);
  if (failed > 0) {
    console.log('\n✗ Có ca không tái hiện được — kiểm tra lại mốc trích trong script.js.');
  } else {
    console.log('\n✓ Tất cả lỗi nêu trong phân tích đã được tái hiện bằng test.');
  }
  process.exit(failed === 0 ? 0 : 1);
}

main();
