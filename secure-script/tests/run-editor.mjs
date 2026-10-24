#!/usr/bin/env node
/* =============================================================================
 * AIA Secure Script — kiểm thử lõi tab "Lập trình" (assets/editor.js)
 * Chạy: node tests/run-editor.mjs
 *
 * Kiểm chứng: số dòng, kích thước B/KB/MB/GB, kẹp cỡ chữ, dò ngoặc/chuỗi/
 * chú thích lệch, đếm khối Lua, phân tích cú pháp JS/JSON, cảnh báo, nhãn lỗi
 * và tốc độ trên tệp lớn (≈ 1 MB / 8.000 dòng).
 * ========================================================================== */

import process from 'node:process';
import {
  analyzeCode,
  checkBalance,
  clampFontSize,
  codeStats,
  countLuaBlocks,
  formatSize,
  issueLabel,
  langLabelOf,
  lineCount,
  FONT_DEFAULT,
  FONT_MAX,
  FONT_MIN,
} from '../assets/editor.js';

let pass = 0;
const fails = [];
function ok(cond, name, detail = '') {
  if (cond) {
    pass++;
    console.log('  ✔ ' + name);
  } else {
    fails.push(name + (detail ? ' — ' + detail : ''));
    console.log('  ✘ ' + name + (detail ? ' — ' + detail : ''));
  }
}

console.log('AIA Secure Script — kiểm thử tab Lập trình\n');

/* --------------------------------------------------------- 1. kích thước --- */

console.log('[1] formatSize (B · KB · MB · GB)');
ok(formatSize(0) === '0 B', '0 B');
ok(formatSize(512) === '512 B', '512 B');
ok(formatSize(1024) === '1.00 KB', '1 KB', formatSize(1024));
ok(formatSize(1536) === '1.50 KB', '1,5 KB', formatSize(1536));
ok(formatSize(1024 * 1024) === '1.00 MB', '1 MB', formatSize(1024 * 1024));
ok(formatSize(1024 ** 3).endsWith('GB'), '1 GB', formatSize(1024 ** 3));
ok(formatSize(5 * 1024 ** 3) === '5.00 GB', '5 GB (giới hạn sản phẩm)', formatSize(5 * 1024 ** 3));
ok(formatSize(1024 ** 4).endsWith('TB'), 'TB vẫn đọc được');
ok(formatSize(-1) === '—' && formatSize(NaN) === '—', 'giá trị sai → "—"');

/* ------------------------------------------------------------- 2. cỡ chữ --- */

console.log('\n[2] clampFontSize');
ok(clampFontSize(FONT_MIN, -1) === FONT_MIN, 'không nhỏ hơn ' + FONT_MIN + 'px');
ok(clampFontSize(FONT_MAX, 1) === FONT_MAX, 'không lớn hơn ' + FONT_MAX + 'px');
ok(clampFontSize(FONT_DEFAULT, 1) === FONT_DEFAULT + 1, 'tăng 1px');
ok(clampFontSize('abc', 0) === FONT_DEFAULT, 'giá trị không phải số → mặc định');

/* -------------------------------------------------------------- 3. số dòng --- */

console.log('\n[3] lineCount / codeStats');
ok(lineCount('') === 1, 'chuỗi rỗng vẫn có 1 dòng');
ok(lineCount('a') === 1, 'một dòng');
ok(lineCount('a\nb\nc') === 3, 'ba dòng LF');
ok(lineCount('a\r\nb\rc') === 3, 'CRLF + CR');
ok(lineCount('a\n') === 2, 'kết thúc bằng xuống dòng ⇒ dòng trống cuối');

const st = codeStats('const a = 1;\nconst bb = 2;   \n\tx');
ok(st.bytes === new TextEncoder().encode('const a = 1;\nconst bb = 2;   \n\tx').length, 'bytes = UTF-8 thật', String(st.bytes));
ok(st.lines === 3, 'đếm đúng 3 dòng', String(st.lines));
ok(st.longestLine === 16, 'độ dài dòng dài nhất (kể cả khoảng trắng cuối)', String(st.longestLine));
ok(st.trailingLines === 1, 'đếm dòng có khoảng trắng cuối', String(st.trailingLines));
ok(st.tabLines === 1, 'đếm dòng có tab', String(st.tabLines));
ok(st.crlf === false, 'không phải CRLF');
ok(codeStats('a\r\nb').crlf === true, 'nhận ra CRLF');
ok(codeStats('Xin chào').bytes === 9, 'tiếng Việt tính theo UTF-8', String(codeStats('Xin chào').bytes));
ok(codeStats('').sizeText === '0 B', 'sizeText cho chuỗi rỗng');

/* -------------------------------------------------------- 4. dò ngoặc --- */

console.log('\n[4] checkBalance');
ok(checkBalance('function a(){ return [1,2,{x:3}]; }') === null, 'code cân bằng → null');
const extra = checkBalance('const a = 1);');
ok(extra && extra.kind === 'bracket' && extra.line === 1 && extra.col === 12, 'thừa dấu ) + đúng cột', JSON.stringify(extra));
const wrongPair = checkBalance('foo([1,2)');
ok(wrongPair && /Sai cặp ngoặc/.test(wrongPair.message), 'phát hiện sai cặp ngoặc', wrongPair && wrongPair.message);
const unclosed = checkBalance('function a(){\n  const x = 1;\n');
ok(unclosed && unclosed.line === 1 && /chưa đóng/.test(unclosed.message), 'ngoặc mở chưa đóng chỉ đúng dòng', JSON.stringify(unclosed));
const str = checkBalance("const a = 'abc\nconst b = 2;");
ok(str && str.kind === 'string' && str.line === 1, 'chuỗi chưa đóng bắt ở dòng mở', JSON.stringify(str));
ok(checkBalance('const s = "a\\"b";') === null, 'nháy đã escape không bị coi là kết thúc');
ok(checkBalance('const t = `a ${b({c:1})} d`;') === null, 'template literal + ${} cân bằng');
ok(checkBalance('const t = `a ${ b '), 'template literal chưa đóng bị bắt');
ok(checkBalance('const s = "abc\\') !== null, 'kết thúc bằng dấu \\ trong chuỗi vẫn phát hiện');
ok(checkBalance('// )]} \nfoo()') === null, 'ngoặc trong chú thích dòng bị bỏ qua');
ok(checkBalance('/* )]} */ foo();') === null, 'ngoặc trong chú thích khối bị bỏ qua');
const block = checkBalance('/* chưa đóng\nfoo()');
ok(block && block.kind === 'comment', 'chú thích khối chưa đóng bị bắt', JSON.stringify(block));
ok(checkBalance('--[[ chú thích Lua ]] local x = 1') === null, 'chú thích dài của Lua bị bỏ qua');
ok(checkBalance("local s = 'abc' -- ' trong chú thích\nlocal t = 1") === null, 'nháy trong chú thích Lua không phá');
const luaStr = checkBalance("print('xin chào\nprint(2)");
ok(luaStr && luaStr.kind === 'string', 'chuỗi Lua chưa đóng bị bắt');

/* --------------------------------------------------------- 5. khối Lua --- */

console.log('\n[5] countLuaBlocks');
const luaOk = countLuaBlocks('local function f()\n  if true then\n    print(1)\n  end\nend');
ok(luaOk.openers === 2 && luaOk.closers === 2 && luaOk.diff === 0, 'function + if cân bằng', JSON.stringify(luaOk));
const luaBad = countLuaBlocks('function f()\n  for i = 1, 3 do\n    print(i)\n  end\nend');
ok(luaBad.diff === 0, 'for…do…end cân bằng', JSON.stringify(luaBad));
const luaMissing = countLuaBlocks('function f()\n  if x then\n    print(1)\n  end');
ok(luaMissing.diff !== 0, 'thiếu end bị phát hiện', JSON.stringify(luaMissing));
ok(countLuaBlocks('-- function fake()\nprint(1)').openers === 0, 'bỏ qua chú thích dòng');

/* --------------------------------------------------------- 6. analyzeCode --- */

console.log('\n[6] analyzeCode');
const empty = analyzeCode('');
ok(empty.ok === false && empty.errors[0].kind === 'empty', 'code rỗng → lỗi empty');

const bad = analyzeCode('function a( {');
ok(bad.ok === false && bad.errors.length >= 1, 'cú pháp hỏng → có lỗi', JSON.stringify(bad.errors[0]));
const good = analyzeCode('const a = 1;\nconsole.log(a);\n');
ok(good.ok === true && good.errors.length === 0, 'JS hợp lệ → ok');
ok(good.lang === 'javascript', 'mặc định javascript');

const mod = analyzeCode("import x from './x.js';\nexport default x;\n", { lang: 'javascript' });
ok(mod.ok === true && mod.notes.length === 1, 'ES module: chỉ ghi chú, không báo lỗi', JSON.stringify(mod.notes));

const ts = analyzeCode('const a: number = 1;', { lang: 'typescript' });
ok(ts.ok === true, 'TypeScript không bị báo lỗi cú pháp JS');

const jsonBad = analyzeCode('{"a": 1,}', { lang: 'json' });
ok(jsonBad.ok === false && jsonBad.errors[0].kind === 'json', 'JSON sai → lỗi json');
ok(jsonBad.errors[0].line === 1, 'JSON báo đúng dòng', String(jsonBad.errors[0].line));
const jsonOk = analyzeCode('{"a": [1,2]}', { lang: 'json' });
ok(jsonOk.ok === true, 'JSON đúng → ok');

const luaWarn = analyzeCode('function f()\n  if x then\n    print(1)\n  end', { lang: 'lua' });
ok(luaWarn.ok === true && luaWarn.warnings.some((w) => w.kind === 'lua-block'), 'Lua thiếu end → cảnh báo (không chặn)', JSON.stringify(luaWarn.warnings));
ok(luaWarn.lang === 'lua', 'giữ nguyên lang lua');

const py = analyzeCode('def f():\n\tif True:\n        pass', { lang: 'python' });
ok(py.warnings.some((w) => w.kind === 'python-indent'), 'Python trộn tab/dấu cách → cảnh báo');

const danger = analyzeCode('eval("1");\nnew Function("return 1");\ndebugger;\n// TODO fix\n');
ok(danger.warnings.some((w) => w.kind === 'eval'), 'cảnh báo eval');
ok(danger.warnings.some((w) => w.kind === 'function-ctor'), 'cảnh báo new Function');
ok(danger.warnings.some((w) => w.kind === 'debugger'), 'cảnh báo debugger');
ok(danger.warnings.some((w) => w.kind === 'todo'), 'cảnh báo TODO');
ok(danger.warnings.find((w) => w.kind === 'eval').line === 1, 'cảnh báo eval có số dòng');

const longLine = analyzeCode('const a = "' + 'x'.repeat(500) + '";');
ok(longLine.warnings.some((w) => w.kind === 'long-line'), 'cảnh báo dòng quá dài');

const mixed = analyzeCode('if (a) {\n\tb();\n  c();\n}');
ok(mixed.warnings.some((w) => w.kind === 'mixed-indent'), 'cảnh báo trộn tab/dấu cách');

const statsInReport = analyzeCode('a();\nb();');
ok(statsInReport.stats.lines === 2 && statsInReport.stats.bytes === 9, 'report có thống kê đúng', JSON.stringify(statsInReport.stats));

/* --------------------------------------------------------------- 7. nhãn --- */

console.log('\n[7] issueLabel / langLabelOf');
ok(issueLabel({ line: 5, col: 3, message: 'lỗi X' }) === 'dòng 5:3 · lỗi X', 'nhãn có dòng:cột');
ok(issueLabel({ line: null, message: 'lỗi Y' }) === 'toàn tệp · lỗi Y', 'nhãn toàn tệp');
ok(langLabelOf('lua') === 'Lua/Luau', 'nhãn Lua');
ok(langLabelOf('JavaScript') === 'JavaScript', 'không phân biệt hoa thường');
ok(langLabelOf('klingon') === 'klingon', 'ngôn ngữ lạ giữ nguyên tên');

/* ------------------------------------------------------------ 8. tốc độ --- */

console.log('\n[8] Tốc độ trên tệp lớn');
const bigLines = [];
for (let i = 0; i < 8000; i++) bigLines.push('function f' + i + '(a, b) { return a + b + ' + i + '; } // dòng ' + i);
const big = bigLines.join('\n');
const bigBytes = new TextEncoder().encode(big).length;
const t0 = Date.now();
const bigReport = analyzeCode(big, { lang: 'javascript' });
const ms = Date.now() - t0;
ok(bigReport.ok === true, 'phân tích tệp ~' + formatSize(bigBytes) + ' không lỗi', JSON.stringify(bigReport.errors.slice(0, 2)));
ok(bigReport.stats.lines === 8000, 'đếm đủ 8.000 dòng', String(bigReport.stats.lines));
ok(ms < 3000, 'phân tích dưới 3 giây (' + ms + ' ms)');

const t1 = Date.now();
for (let i = 0; i < 20; i++) codeStats(big);
const statMs = Date.now() - t1;
ok(statMs < 3000, '20 lần codeStats dưới 3 giây (' + statMs + ' ms)');

/* ---------------------------------------------------------------- tổng --- */

console.log('\n' + '─'.repeat(56));
console.log(`Kết quả editor: ${pass} đạt · ${fails.length} lỗi`);
if (fails.length) {
  console.log('\nChi tiết:');
  for (const f of fails) console.log('  • ' + f);
  process.exitCode = 1;
} else {
  console.log('Lõi trình lập trình chạy đúng.');
}
