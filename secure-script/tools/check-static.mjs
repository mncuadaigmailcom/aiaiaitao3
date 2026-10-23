#!/usr/bin/env node
/* =============================================================================
 * Kiểm tra tĩnh cho giao diện: không cần trình duyệt.
 *  - mọi id mà app.js dùng đều có trong index.html
 *  - không id trùng
 *  - mọi href/src nội bộ trỏ tới tệp có thật
 *  - import của các module tồn tại
 *  - cú pháp các tệp .js/.mjs
 *  - tài liệu & tệp bắt buộc tồn tại
 * ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
let pass = 0;
const fails = [];

function check(cond, name, detail = '') {
  if (cond) {
    pass++;
    console.log('  ✔ ' + name);
  } else {
    fails.push(name + (detail ? ' — ' + detail : ''));
    console.log('  ✘ ' + name + (detail ? ' — ' + detail : ''));
  }
}

const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));

console.log('AIA Secure Script — kiểm tra tĩnh\n');

/* ------------------------------------------------------- 1. tệp bắt buộc --- */

console.log('[1] Tệp bắt buộc');
for (const f of [
  'index.html',
  'assets/core.js',
  'assets/app.js',
  'assets/reverse.js',
  'assets/style.css',
  'tools/cli.mjs',
  'tests/run-node.mjs',
  '.nojekyll',
  'README.md',
  'docs/00-ghi-chu-du-an.md',
  'docs/01-kien-truc-va-dinh-dang.md',
  'docs/02-bao-mat-gioi-han.md',
  'docs/03-huong-dan-su-dung.md',
  'docs/04-trien-khai-mien-phi.md',
  'docs/05-kiem-thu-va-ket-qua.md',
  'examples/hello.js',
  'examples/demo/hello.aia',
  'examples/demo/hello.key.js',
  'examples/demo/run-hello.html',
  'deploy/pages.yml',
  'deploy/netlify.toml',
  'deploy/vercel.json',
  'favicon.svg',
]) {
  check(exists(f), f);
}

/* ------------------------------------------------- 2. id HTML ↔ app.js --- */

console.log('\n[2] Liên kết id giữa HTML và app.js');
const html = read('index.html');
const app = read('assets/app.js');

const htmlIds = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const dupes = htmlIds.filter((id, i) => htmlIds.indexOf(id) !== i);
check(dupes.length === 0, 'không có id trùng', dupes.join(', '));

const used = new Set();
for (const m of app.matchAll(/\$\('([^']+)'\)/g)) used.add(m[1]);
for (const m of app.matchAll(/document\.getElementById\('([^']+)'\)/g)) used.add(m[1]);
const missing = [...used].filter((id) => !htmlIds.includes(id));
check(missing.length === 0, `mọi id app.js dùng đều tồn tại (${used.size} id)`, missing.join(', '));

// biến thể $('x') && ... vẫn được tính; kiểm tra thêm các id trong index được dùng
const unusedWarn = [...htmlIds].filter((id) => !used.has(id));
if (unusedWarn.length) console.log('  · id chỉ dùng trong HTML (bình thường): ' + unusedWarn.length + ' id');

/* ------------------------------------------------------- 3. liên kết tệp --- */

console.log('\n[3] Đường dẫn nội bộ');
// bỏ các khối <pre>/<code> (đó là ví dụ minh hoạ, không phải tệp thật)
const htmlForRefs = html.replace(/<pre[\s\S]*?<\/pre>/g, '').replace(/<code[\s\S]*?<\/code>/g, '');
const refs = new Set();
for (const m of htmlForRefs.matchAll(/(?:href|src)="(\.[^"]+)"/g)) refs.add('./' + m[1].replace(/^\.\//, ''));
for (const m of app.matchAll(/from\s+'(\.[^']+)'/g)) refs.add('./assets/' + m[1].replace(/^\.\//, ''));
let badRefs = 0;
for (const ref of refs) {
  const clean = ref.split('#')[0].split('?')[0];
  if (!clean) continue;
  if (!fs.existsSync(path.join(root, clean))) {
    badRefs++;
    fails.push('thiếu tệp: ' + clean);
    console.log('  ✘ thiếu tệp: ' + clean);
  }
}
check(badRefs === 0, `${refs.size} đường dẫn nội bộ đều tồn tại`);

check(/<script type="module" src="\.\/assets\/app\.js"><\/script>/.test(html), 'index.html nạp app.js dạng module');
check(/<meta charset="utf-8">/i.test(html), 'có meta charset');
check(/name="viewport"/.test(html), 'có meta viewport');
check(/<html lang="vi">/.test(html), 'html lang="vi"');
check(/<title>[^<]+<\/title>/.test(html), 'có title');
check(!/https?:\/\/(?!localhost)[^\s"']+\.js["']/.test(html), 'không nạp script từ host lạ');

/* --------------------------------------------------------- 4. cú pháp --- */

console.log('\n[4] Cú pháp');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aia-check-'));
for (const f of ['assets/core.js', 'assets/app.js', 'assets/reverse.js', 'tools/cli.mjs', 'tests/run-node.mjs', 'tools/check-static.mjs']) {
  const target = path.join(tmp, path.basename(f).replace(/\.js$/, '.mjs'));
  fs.copyFileSync(path.join(root, f), target);
  try {
    execFileSync(process.execPath, ['--check', target], { stdio: 'pipe' });
    check(true, 'cú pháp ' + f);
  } catch (err) {
    check(false, 'cú pháp ' + f, String(err.stderr || err.message).split('\n')[0]);
  }
}
fs.rmSync(tmp, { recursive: true, force: true });

/* ------------------------------------------------------- 5. key script --- */

console.log('\n[5] Key script mẫu');
const keyText = read('examples/demo/hello.key.js');
check(/\/\*<AIA:META>\*\//.test(keyText), 'key script có META');
check(keyText.includes('AIA_UNLOCK'), 'key script export AIA_UNLOCK');
const metaMatch = /\/\*<AIA:META>\*\/([\s\S]*?)\/\*<\/AIA:META>\*\//.exec(keyText);
if (metaMatch) {
  try {
    const meta = JSON.parse(metaMatch[1]);
    check(/^\d{17}$/.test(meta.time.raw), 'META có thời gian 17 chữ số', meta.time && meta.time.raw);
    check(typeof meta.keyUrl === 'string' && meta.keyUrl.length > 0, 'META có link key', meta.keyUrl);
    check(meta.alg === 'AES-256-GCM', 'META ghi đúng thuật toán');
    check(meta.kdf.iterations >= 100000, 'META có KDF ≥ 100k vòng', String(meta.kdf && meta.kdf.iterations));
  } catch (err) {
    check(false, 'META parse được', err.message);
  }
}

/* ------------------------------------------------------------------ tổng --- */

console.log('\n' + '─'.repeat(56));
console.log(`Kết quả kiểm tra tĩnh: ${pass} đạt · ${fails.length} lỗi`);
if (fails.length) {
  console.log('\nChi tiết:');
  for (const f of fails) console.log('  • ' + f);
  process.exitCode = 1;
} else {
  console.log('Giao diện khớp với mã. (Chưa thay thế được việc bấm thử trên trình duyệt thật.)');
}
