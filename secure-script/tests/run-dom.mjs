#!/usr/bin/env node
/* =============================================================================
 * Kiểm thử giao diện bằng DOM ả (jsdom) — không cần trình duyệt thật.
 * Mô phỏng: dán code → mã hoá → xem kết quả → tải ZIP → chạy thử
 *           → mở tab giải mã → kiểm tra header → giải mã đúng/sai → chạy → tab dịch ngược
 *
 * Chạy: npm install (một lần) rồi `node tests/run-dom.mjs`
 * Nếu chưa cài jsdom, tệp sẽ tự bỏ qua (exit 0).
 * ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');

let JSDOM;
try {
  ({ JSDOM } = await import('jsdom'));
} catch {
  console.log('⚠ Bỏ qua test DOM: chưa cài jsdom (chạy `npm install` trong secure-script).');
  process.exit(0);
}

let pass = 0;
const fails = [];
const check = (cond, name, detail = '') => {
  if (cond) {
    pass++;
    console.log('  ✔ ' + name);
  } else {
    fails.push(name + (detail ? ' — ' + detail : ''));
    console.log('  ✘ ' + name + (detail ? ' — ' + detail : ''));
  }
};

async function waitFor(fn, label, timeout = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    let value;
    try {
      value = fn();
    } catch {
      value = false;
    }
    if (value) return value;
    await new Promise((r) => setTimeout(r, 40));
  }
  throw new Error('Hết thời gian chờ: ' + label);
}

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const dom = new JSDOM(html, { url: 'http://localhost:8080/', pretendToBeVisual: true });
const { window } = dom;

/* ------------------------------------------------------- môi trường giả --- */
const downloads = [];
window.Element.prototype.scrollIntoView = function () {};
window.scrollTo = function () {};
window.HTMLAnchorElement.prototype.click = function () {
  downloads.push(this.download);
};

globalThis.window = window;
globalThis.document = window.document;
globalThis.location = { protocol: 'http:', href: 'http://localhost:8080/' };
try {
  Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
} catch {
  /* Node đã có navigator, giữ nguyên */
}
globalThis.Blob = globalThis.Blob || window.Blob;
globalThis.File = globalThis.File || window.File;

let urlCounter = 0;
const RealURL = globalThis.URL;
globalThis.URL = class extends RealURL {
  static createObjectURL() {
    return 'blob:fake-' + ++urlCounter;
  }
  static revokeObjectURL() {}
};

const errors = [];
process.on('unhandledRejection', (err) => errors.push('unhandledRejection: ' + (err && err.message ? err.message : err)));
window.addEventListener('error', (e) => errors.push('window.error: ' + e.message));

// Worker giả: ghi log rồi báo xong
class FakeWorker {
  constructor(url) {
    this.url = url;
    this.terminated = false;
    setTimeout(() => {
      if (this.terminated) return;
      this.onmessage && this.onmessage({ data: { type: 'log', level: 'log', args: ['Xin chào từ worker giả'] } });
      this.onmessage && this.onmessage({ data: { type: 'error', message: 'lỗi thử (cố ý)' } });
      this.onmessage && this.onmessage({ data: { type: 'done' } });
    }, 10);
  }
  terminate() {
    this.terminated = true;
  }
}
globalThis.Worker = FakeWorker;
window.Worker = FakeWorker;

console.log('AIA Secure Script — kiểm thử DOM (jsdom)\n');

await import('../assets/app.js');
await new Promise((r) => setTimeout(r, 50));

const $ = (id) => window.document.getElementById(id);
const sampleCode = 'function hien(n){ console.log("Xin chào " + n); }\nhien("AIA");\n';

/* ----------------------------------------------------------- 1. khởi động --- */

console.log('[1] Khởi động giao diện');
check(!!$('encryptBtn'), 'có nút mã hoá');
check(window.document.querySelectorAll('.view').length === 4, 'có 4 tab nội dung');
check(window.document.querySelector('.tabs button.active').dataset.view === 'encrypt', 'tab mặc định là Mã hoá');
check($('fileInfo').textContent.includes('chưa chọn'), 'chưa chọn tệp');

/* -------------------------------------------------------------- 2. mã hoá --- */

console.log('\n[2] Dán code → mã hoá');
$('pasteBtn').click();
check(!$('pasteBox').hidden, 'mở ô dán code');
$('pasteText').value = sampleCode;
$('pass').value = 'mat-khau-dom-test';
$('pass').dispatchEvent(new window.Event('input'));
check($('passLabel').textContent.includes('ký tự'), 'hiển thị độ mạnh mật khẩu', $('passLabel').textContent);

$('pasteUse').click();
check($('fileInfo').textContent.includes('script.js'), 'đã nạp code đã dán', $('fileInfo').textContent);
check($('fileInfo').textContent.includes('B'), 'hiển thị dung lượng');

$('encryptBtn').click();
await waitFor(() => $('resultCard') && !$('resultCard').hidden, 'mã hoá xong');
await waitFor(() => $('resStats').textContent.includes('Tự kiểm tra'), 'có thống kê');

const stats = $('resStats').textContent;
check(stats.includes('Bản rõ') && stats.includes('Bản mã'), 'có thống kê kích thước');
check(stats.includes('Tự kiểm tra: khớp 100%'), 'tự kiểm tra giải mã khớp 100%', stats);
check($('resultBadge').textContent.includes('hoàn tất'), 'trạng thái hoàn tất');

const keyPreview = $('keyPreview').textContent;
check(keyPreview.includes('AIA_UNLOCK'), 'key script có AIA_UNLOCK');
check(keyPreview.includes('/*<AIA:META>*/'), 'key script có META');
const metaPreview = JSON.parse($('metaPreview').textContent);
check(/^\d{17}$/.test(metaPreview.time.raw), 'header có thời gian 17 chữ số', metaPreview.time.raw);
check(metaPreview.keyUrl === './script.key.js', 'header có link key (tự gợi ý theo tên tệp)', metaPreview.keyUrl);
check(metaPreview.alg === 'AES-256-GCM', 'dùng AES-256-GCM');
check(metaPreview.kdf.iterations === 600000, 'PBKDF2 600.000 vòng');
check(metaPreview.keyWrapIn === 'key-script', 'bật chế độ bắt buộc key script');
check(!metaPreview.keyWrap, 'header công khai KHÔNG chứa khoá tệp');
check(keyPreview.includes('keyWrap'), 'key script có chứa khoá tệp đã bọc');

/* --------------------------------------------------------- 3. tải & chạy --- */

console.log('\n[3] Tải gói & chạy thử');
$('dlZip').click();
check(downloads.some((n) => n && n.endsWith('.zip')), 'tải được ZIP', downloads.join(', '));
$('dlKey').click();
check(downloads.some((n) => n && n.includes('.key.js')), 'tải được key script');

$('testRunBtn').click();
await waitFor(() => $('testLog').textContent.includes('giải mã OK'), 'chạy thử giải mã');
await waitFor(() => $('testLog').textContent.includes('chạy xong'), 'worker báo xong');
check($('testLog').textContent.includes('Xin chào từ worker giả'), 'log của worker hiện ra');

/* ------------------------------------------------------------ 4. giải mã --- */

console.log('\n[4] Tab giải mã');
window.document.querySelector('.tabs button[data-view="decrypt"]').click();
check($('view-decrypt').classList.contains('active'), 'chuyển sang tab Giải mã');

// Tạo lại tệp .aia từ bộ nhớ bằng core để có dữ liệu thật
const C = await import('../assets/core.js');
const plain = new TextEncoder().encode(sampleCode);
const chunks = [];
const sink = {
  write: async (b) => {
    chunks.push(b.slice());
  },
  close: async () => {},
};
const enc = await C.encryptStream({
  openStream: () => new ReadableStream({ start(c) { c.enqueue(plain); c.close(); } }),
  size: plain.length,
  options: { passphrase: 'mat-khau-dom-test', keyUrl: './demo.key.js', fileName: 'demo.js' },
  sink,
});
const cipherBytes = C.concatBytes(chunks);

const file = new File([cipherBytes], 'demo.aia', { type: 'application/octet-stream' });
Object.defineProperty($('decFile'), 'files', { value: [file], configurable: true });
$('decFile').dispatchEvent(new window.Event('change'));
await waitFor(() => $('decMeta').textContent.includes('demo.js'), 'đọc header');

check($('decMeta').textContent.includes('Thời gian tạo'), 'header hiện thời gian');
check($('decMeta').textContent.includes('./demo.key.js'), 'header hiện link key');

// sai mật khẩu
$('decPass').value = 'sai-mat-khau';
$('verifyBtn').click();
await waitFor(() => $('consoleOut').textContent.includes('Sai mật khẩu'), 'báo sai mật khẩu');
check(true, 'sai mật khẩu bị chặn trên giao diện');

// đúng mật khẩu
$('consoleOut').textContent = '';
$('decPass').value = 'mat-khau-dom-test';
$('verifyBtn').click();
await waitFor(() => $('consoleOut').textContent.includes('thành công'), 'giải mã đúng');
check($('consoleOut').textContent.includes('SHA-256 khớp'), 'báo SHA-256 khớp');
check($('plainPreview').textContent.includes('function hien'), 'hiện bản rõ');

// chạy
$('consoleOut').textContent = '';
$('runBtn').click();
await waitFor(() => $('consoleOut').textContent.includes('Xin chào từ worker giả'), 'chạy script');
check(true, 'nút chạy hoạt động');

// tải bản rõ
downloads.length = 0;
$('dlPlainBtn').click();
await waitFor(() => downloads.includes('demo.js'), 'tải bản rõ');
check(true, 'tải bản rõ đúng tên');

/* ------------------------------------- 4b. giải mã bắt buộc key script --- */

console.log('\n[4b] Bản mã bắt buộc key script');
{
  const chunks2 = [];
  const sink2 = {
    write: async (b) => {
      chunks2.push(b.slice());
    },
    close: async () => {},
  };
  const enc2 = await C.encryptStream({
    openStream: () => new ReadableStream({ start(c) { c.enqueue(plain); c.close(); } }),
    size: plain.length,
    options: { passphrase: 'khoa-rieng-dom', keyUrl: './need.key.js', fileName: 'need.js', requireKeyScript: true },
    sink: sink2,
  });
  const cipher2 = C.concatBytes(chunks2);
  const keyText2 = C.buildKeyScript(enc2.meta, { embeddedPassphrase: null });

  const file2 = new File([cipher2], 'need.aia', { type: 'application/octet-stream' });
  Object.defineProperty($('decFile'), 'files', { value: [file2], configurable: true });
  $('decFile').dispatchEvent(new window.Event('change'));
  await waitFor(() => $('decMeta').textContent.includes('need.js'), 'đọc header (bắt buộc key)');
  check($('decMeta').textContent.includes('bắt buộc phải có key script'), 'giao diện cảnh báo cần key script');

  $('consoleOut').textContent = '';
  $('decPass').value = 'khoa-rieng-dom';
  $('verifyBtn').click();
  await waitFor(() => $('consoleOut').textContent.includes('yêu cầu key script'), 'thiếu key script bị chặn');
  check(true, 'thiếu key script → báo lỗi rõ ràng');

  const keyFile2 = new File([keyText2], 'need.key.js', { type: 'text/javascript' });
  Object.defineProperty($('keyFile'), 'files', { value: [keyFile2], configurable: true });
  $('keyFile').dispatchEvent(new window.Event('change'));
  await waitFor(() => $('consoleOut').textContent.includes('có khoá tệp'), 'nạp key script');

  $('consoleOut').textContent = '';
  $('verifyBtn').click();
  await waitFor(() => $('consoleOut').textContent.includes('thành công'), 'giải mã khi có key script');
  check($('consoleOut').textContent.includes('SHA-256 khớp'), 'giải mã đúng với key script');
}

/* --------------------------------------------------------- 5. dịch ngược --- */

console.log('\n[5] Tab dịch ngược');
window.document.querySelector('.tabs button[data-view="reverse"]').click();
$('revInput').value = 'function a(x){if(x){return 1;}else{return 2;}}';
window.document.querySelector('[data-rev="beautify"]').click();
check($('revOutput').value.includes('if (x) {'), 'làm đẹp trên giao diện');
check($('revStats').textContent.includes('Ngôn ngữ'), 'hiện thống kê dịch ngược');

$('revInput').value = 'eval(atob("' + Buffer.from('console.log(1)').toString('base64') + '")); fetch("https://x")';
window.document.querySelector('[data-rev="analyze"]').click();
check($('revOutput').value.includes('Kết luận:'), 'phân tích chạy');
check($('revOutput').value.includes('eval'), 'phân tích phát hiện eval');

$('revToEncrypt').click();
check($('view-encrypt').classList.contains('active'), '"đưa sang mã hoá" chuyển tab');
check($('fileInfo').textContent.includes('script.js'), 'đã nạp kết quả làm đầu vào mã hoá');

/* ---------------------------------------------------------- 6. gói demo --- */

console.log('\n[6] Gói demo phát hành kèm repo');
{
  const demoDir = path.join(root, 'examples/demo');
  const cipher = fs.readFileSync(path.join(demoDir, 'hello.aia'));
  const keyText = fs.readFileSync(path.join(demoDir, 'hello.key.js'), 'utf8');
  const expected = fs.readFileSync(path.join(root, 'examples/hello.js'), 'utf8');

  const fetched = [];
  const fakeFetch = async (url) => {
    fetched.push(String(url));
    return {
      ok: true,
      status: 200,
      headers: { get: () => String(cipher.length) },
      body: new ReadableStream({
        start(c) {
          c.enqueue(new Uint8Array(cipher));
          c.close();
        },
      }),
    };
  };
  window.fetch = fakeFetch;
  globalThis.fetch = fakeFetch;
  try {
    Object.defineProperty(window, 'crypto', { value: globalThis.crypto, configurable: true });
  } catch {
    /* giữ nguyên */
  }
  // jsdom không chạy script trong trang nếu thiếu runScripts, nên eval trong ngữ cảnh Node
  // (globalThis.document/location đã được gán ở trên). Key script vẫn hoạt động như thật.
  const AIA = new Function(keyText + '\nreturn globalThis.AIA_UNLOCK;')();
  check(!!AIA, 'key script của gói demo nạp được');
  check(AIA.meta.file.name === 'hello.js', 'META đúng tệp gốc');
  check(String(AIA.payloadUrl).endsWith('hello.aia'), 'key script tự suy ra tệp dữ liệu', String(AIA.payloadUrl));

  const out = await AIA.decrypt({ passphrase: 'aia-demo-2026' });
  check(new TextDecoder().decode(out) === expected, 'gói demo giải mã khớp 100% bản gốc');
  check(fetched.length >= 1 && fetched[0].endsWith('hello.aia'), 'fetch gọi đúng tệp .aia', fetched[0]);

  let wrong = false;
  try {
    await AIA.decrypt({ passphrase: 'sai' });
  } catch {
    wrong = true;
  }
  check(wrong, 'gói demo từ chối mật khẩu sai');
}

/* --------------------------------------------------------------- 7. lỗi --- */

console.log('\n[7] Lỗi runtime');
const realErrors = errors.filter((e) => !/lỗi thử \(cố ý\)/.test(e));
check(realErrors.length === 0, 'không có lỗi runtime', realErrors.join(' | '));

console.log('\n' + '─'.repeat(56));
console.log(`Kết quả DOM: ${pass} đạt · ${fails.length} lỗi`);
if (fails.length) {
  for (const f of fails) console.log('  • ' + f);
  process.exitCode = 1;
} else {
  console.log('Giao diện chạy đúng luồng trên DOM ả (vẫn nên thử trên trình duyệt thật).');
}
setTimeout(() => process.exit(process.exitCode || 0), 100);
