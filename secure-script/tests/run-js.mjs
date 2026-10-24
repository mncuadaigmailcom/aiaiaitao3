#!/usr/bin/env node
/* =============================================================================
 * Kiểm thử phần "chỉ JavaScript" của tab Lập trình:
 *   · buildPreviewDocument() — trang xem trước chạy trong iframe sandbox
 *   · isJsFileName / forceJsFileName — ép mọi tệp về .js / .mjs / .cjs
 *
 * Chạy: node tests/run-js.mjs   (không cần jsdom, không cần mạng)
 * ========================================================================== */

import { buildPreviewDocument } from '../assets/core.js';
import { isJsFileName, forceJsFileName, sanitizeFileName } from '../assets/ide.js';

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
const count = (hay, needle) => hay.split(needle).length - 1;

console.log('AIA Secure Script — kiểm thử tab Lập trình (chỉ JavaScript)\n');

/* ------------------------------------------- 1. tên tệp chỉ JavaScript --- */

console.log('[1] Tên tệp chỉ JavaScript');
ok(isJsFileName('a.js') === true, 'nhận a.js');
ok(isJsFileName('a.mjs') === true, 'nhận a.mjs');
ok(isJsFileName('a.cjs') === true, 'nhận a.cjs');
ok(isJsFileName('A.JS') === true, 'không phân biệt hoa thường');
ok(isJsFileName('a.lua') === false, 'loại a.lua');
ok(isJsFileName('a.py') === false, 'loại a.py');
ok(isJsFileName('a.css') === false, 'loại a.css');
ok(isJsFileName('a') === false, 'loại tên không có đuôi');
ok(isJsFileName('') === false, 'loại tên rỗng');

ok(forceJsFileName('note.lua') === 'note.js', '.lua → .js', forceJsFileName('note.lua'));
ok(forceJsFileName('style.css') === 'style.js', '.css → .js', forceJsFileName('style.css'));
ok(forceJsFileName('abc') === 'abc.js', 'không đuôi → thêm .js', forceJsFileName('abc'));
ok(forceJsFileName('a.mjs') === 'a.mjs', 'giữ nguyên .mjs');
ok(forceJsFileName('a.cjs') === 'a.cjs', 'giữ nguyên .cjs');
ok(forceJsFileName('a.JS') === 'a.JS', 'giữ nguyên .JS');
ok(forceJsFileName('a.b.c') === 'a.b.js', 'chỉ thay đuôi cuối', forceJsFileName('a.b.c'));
ok(forceJsFileName('') === 'script.js', 'tên rỗng → script.js', forceJsFileName(''));
const trav = forceJsFileName('../../etc/passwd');
ok(!trav.includes('/') && !trav.includes('\\') && trav.endsWith('.js'), 'chặn đường dẫn ../', trav);
ok(forceJsFileName('bài tập 1.py') === 'bài tập 1.js', 'giữ tiếng Việt', forceJsFileName('bài tập 1.py'));
ok(forceJsFileName('x'.repeat(200)).length <= 84, 'cắt tên quá dài');
ok(forceJsFileName('a.py') === forceJsFileName(forceJsFileName('a.py')), 'ép 2 lần cho kết quả như nhau');
ok(sanitizeFileName('a.js') === 'a.js', 'sanitizeFileName không đổi tên hợp lệ');

/* --------------------------------------------- 2. trang xem trước JS --- */

console.log('\n[2] buildPreviewDocument — khung xem trước');
const code = 'const ten = "AIA";\nconsole.log("Xin chào " + ten);\ndocument.body.innerHTML = "<b>kết quả</b>";';
const doc = buildPreviewDocument(code, { token: 'tok-abc', title: 'demo.js' });

ok(typeof doc === 'string' && doc.length > 500, 'trả về chuỗi HTML', String(doc.length));
ok(doc.startsWith('<!doctype html>'), 'bắt đầu bằng <!doctype html>');
ok(doc.includes('<meta charset="utf-8">'), 'có meta charset utf-8 (tiếng Việt)');
ok(doc.includes('<title>demo.js</title>'), 'tiêu đề = tên tệp');
ok(doc.includes(code), 'nhúng nguyên code của người dùng');
ok(doc.includes('tok-abc'), 'có token để lọc message');
ok(doc.includes('parent.postMessage'), 'gửi kết quả về trang cha');
ok(doc.includes('__aiaPost'), 'có hàm cầu nối __aiaPost');
ok(doc.includes("'log', 'info', 'warn', 'error', 'debug'"), 'bắt đủ 5 mức console');
ok(doc.includes("addEventListener('error'"), 'bắt lỗi runtime');
ok(doc.includes("addEventListener('unhandledrejection'"), 'bắt Promise bị từ chối');
ok(doc.includes("__aiaPost('done'"), 'báo hiệu chạy xong');
ok(doc.includes("__aiaPost('ready'"), 'báo hiệu iframe đã sẵn sàng');
ok(doc.includes('try {') && doc.includes('} catch (__aiaErr)'), 'bọc code trong try/catch');
ok(doc.includes('overflow-wrap:break-word'), 'không tràn ngang khi in chữ dài');
ok(doc.includes('#aia-note'), 'có dòng ghi chú nhỏ ở đầu');
ok(doc.length < 8000, 'tài liệu gọn (< 8 KB)', String(doc.length));

// token mặc định
const noToken = buildPreviewDocument('1 + 1');
ok(noToken.includes('aia-preview'), 'không truyền token thì dùng mặc định');
ok(buildPreviewDocument('1 + 1') === noToken, 'kết quả ổn định (cùng input → cùng output)');

// tiêu đề có HTML phải được escape
const evilTitle = buildPreviewDocument('1', { title: '<img src=x onerror=alert(1)>' });
ok(!evilTitle.includes('<img src=x'), 'escape HTML trong tiêu đề');
ok(evilTitle.includes('&lt;img'), 'escape thành &lt;img');

// code chứa </script> không được phá vỡ tài liệu
const breaker = buildPreviewDocument('var s = "</script><h1>x</h1>";');
ok(!breaker.includes('"</script><h1>'), 'escape </script> bên trong code');
ok(breaker.includes('<\\/script><h1>'), 'thay bằng <\\/script> (vẫn đúng chuỗi JS)');
ok(count(breaker, '</script>') === 3, 'chỉ còn 3 thẻ </script> của khung', String(count(breaker, '</script>')));

// code rỗng / null
ok(buildPreviewDocument('').includes('<script>'), 'code rỗng vẫn tạo được tài liệu');
ok(buildPreviewDocument(null).includes('__aiaPost'), 'null không làm hỏng');
ok(buildPreviewDocument(undefined).includes('__aiaPost'), 'undefined không làm hỏng');

// tiếng Việt + emoji giữ nguyên
const vi = buildPreviewDocument('console.log("Tiếng Việt 🚀");');
ok(vi.includes('Tiếng Việt 🚀'), 'giữ nguyên tiếng Việt và emoji');

// ghi chú tuỳ chỉnh
ok(buildPreviewDocument('1', { note: 'Ghi chú riêng' }).includes('Ghi chú riêng'), 'đổi được lời ghi chú');

// code lớn: 1 MB vẫn tạo nhanh và không cắt
const bigCode = 'var x = 1;\n'.repeat(100000);
const t0 = Date.now();
const bigDoc = buildPreviewDocument(bigCode);
const ms = Date.now() - t0;
ok(bigDoc.includes('var x = 1;'), 'nhúng được code lớn (1 MB)');
ok(ms < 1500, 'tạo trang xem trước 1 MB đủ nhanh', ms + ' ms');

console.log('\n────────────────────────────────────────────────────────');
console.log(`Kết quả JS-only: ${pass} đạt · ${fails.length} lỗi`);
if (fails.length) {
  console.log('\nChi tiết:');
  for (const f of fails) console.log('  • ' + f);
  process.exitCode = 1;
} else {
  console.log('Tab Lập trình chạy đúng: chỉ JavaScript + khung xem trước an toàn.');
}
