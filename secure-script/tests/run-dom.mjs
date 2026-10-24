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

// Trang nạp ./aia.key.js bằng <script src>; jsdom không tự chạy nên nạp thủ công.
new Function(fs.readFileSync(path.join(root, 'aia.key.js'), 'utf8'))();
console.log('  · đã nạp aia.key.js (keyId ' + (globalThis.AIA_KEY && globalThis.AIA_KEY.keyId) + ')');

await import('../assets/app.js');
await new Promise((r) => setTimeout(r, 50));

const $ = (id) => window.document.getElementById(id);
const sampleCode = 'function hien(n){ console.log("Xin chào " + n); }\nhien("AIA");\n';

/* ----------------------------------------------------------- 1. khởi động --- */

console.log('[1] Khởi động giao diện');
check(!!$('encryptBtn'), 'có nút mã hoá');
check(window.document.querySelectorAll('.view').length === 6, 'có 6 tab nội dung');
check(window.document.querySelector('.tabs button.active').dataset.view === 'encrypt', 'tab mặc định là Mã hoá');
check(!!$('view-link') && !!$('linkEncrypt'), 'có tab Mã hoá link');
check($('fileInfo').textContent.includes('chưa chọn'), 'chưa chọn tệp');

/* -------------------------------------------------------------- 2. mã hoá --- */

console.log('\n[2] Dán code → mã hoá');
$('pasteBtn').click();
check(!$('pasteBox').hidden, 'mở ô dán code');
$('pasteText').value = sampleCode;
$('pass').value = 'mat-khau-dom-test';
$('pass').dispatchEvent(new window.Event('input'));
check($('passLabel').textContent.includes('ký tự'), 'hiển thị độ mạnh mật khẩu', $('passLabel').textContent);
check($('passMode').value === 'none', 'mặc định: không mật khẩu');
check($('pass').disabled === true, 'ô mật khẩu bị khoá khi chọn không mật khẩu');

check(!$('pasteUse'), 'đã bỏ nút "Dùng nội dung này"');
$('pasteText').dispatchEvent(new window.Event('paste'));
await waitFor(() => $('fileInfo').textContent.includes('script.js'), 'dán là tự nạp code');
check($('fileInfo').textContent.includes('B'), 'hiển thị dung lượng');

// Không bấm gì thêm: phải tự mã hoá
await waitFor(() => $('resultCard') && !$('resultCard').hidden, 'tự động mã hoá sau khi dán');
await waitFor(() => $('resStats').textContent.includes('Tự kiểm tra'), 'có thống kê');

const stats = $('resStats').textContent;
check(stats.includes('Bản rõ') && stats.includes('Bản mã'), 'có thống kê kích thước');
check(stats.includes('Tự kiểm tra: khớp 100%'), 'tự kiểm tra giải mã khớp 100%', stats);
check($('resultBadge').textContent.includes('hoàn tất'), 'trạng thái hoàn tất');

const keyPreview = $('keyPreview').textContent;
check(keyPreview.includes('AIA_KEY'), 'key script dùng chung có AIA_KEY');
check(keyPreview.includes('masterKey'), 'key script dùng chung chứa khoá gốc');
const metaPreview = JSON.parse($('metaPreview').textContent);
check(/^\d{17}$/.test(metaPreview.time.raw), 'header có thời gian 17 chữ số', metaPreview.time.raw);
check(metaPreview.keyUrl === './aia.key.js', 'link key dùng chung cố định ./aia.key.js', metaPreview.keyUrl);
check(metaPreview.alg === 'AES-256-GCM', 'dùng AES-256-GCM');
check(metaPreview.kdf.iterations === 600000, 'PBKDF2 600.000 vòng');
check(metaPreview.keyWrapIn === 'shared-key-script', 'mặc định dùng key script chung');
check(!!metaPreview.sharedKeyId, 'header có sharedKeyId để đối chiếu key script');
check(!metaPreview.keyWrap, 'header công khai KHÔNG chứa khoá tệp (chế độ chung: keyWrap trong header, không hiện ở meta công khai)');
check(/^[0-9a-f]{64}$/.test(metaPreview.headerHash), 'header có SHA-256 toàn vẹn (headerHash)');

// khung code đã mã hoá: mặc định là SNIPPET chép-là-chạy, ẨN DẤU VẾT
const snippetText = $('encCode').textContent;
check($('encFmtRun').classList.contains('on'), 'mặc định chọn tab Snippet');
check($('encStyle').value === 'stealth', 'mặc định ẩn dấu vết');
check(snippetText.trim().startsWith('(function'), 'snippet ẩn dấu vết: không có chú thích mở đầu', snippetText.slice(0, 30));
check(!snippetText.includes('AIA Secure Script') && !snippetText.includes('Bảo vệ'), 'snippet ẩn: không lộ tiêu đề/nhãn');
check(!snippetText.includes('https://'), 'snippet ẩn: không lộ link dạng chữ thường');
check(!snippetText.includes('AIA_KEY') && !snippetText.includes('AIA_UNLOCK'), 'snippet ẩn: không lộ tên API');
check(snippetText.includes('QUlBU0NSMQ'), 'snippet ẩn: vẫn chứa bản mã Base64');
check((() => { try { new Function(snippetText); return true; } catch { return false; } })(), 'snippet ẩn là JavaScript hợp lệ');
check(snippetText.includes('(0, eval)'), 'snippet tự chạy code sau khi giải mã');

// đổi sang kiểu có chú thích
$('encStyle').value = 'labeled';
$('encStyle').dispatchEvent(new window.Event('change'));
const labeled = $('encCode').textContent;
check(labeled.includes('AIA Secure Script') && labeled.includes('var DATA'), 'kiểu "có chú thích" hiện tiêu đề + biến rõ ràng', labeled.slice(0, 30));
check(labeled.includes('http://localhost:8080/aia.key.js'), 'kiểu "có chú thích" nhúng link key tuyệt đối', (labeled.match(/var KEY_URL = [^;]+/) || [])[0]);
check(/var PASS = "";/.test(labeled), 'mặc định KHÔNG cần mật khẩu');
check(labeled.includes('AIA_KEY.open('), 'snippet tự gọi API của key script');
$('encStyle').value = 'stealth';
$('encStyle').dispatchEvent(new window.Event('change'));
check($('encCode').textContent.trim().startsWith('(function'), 'quay lại ẩn dấu vết được');

// dòng link key script nổi bật
check($('keyLinkText').textContent === 'http://localhost:8080/aia.key.js', 'dòng link key hiện URL đầy đủ', $('keyLinkText').textContent);
check($('keyLinkOpen').href.includes('aia.key.js'), 'nút Mở trỏ đúng key script');
check($('keyLinkNote').textContent.includes('cũng dùng đúng link này'), 'ghi chú: ai cũng dùng cùng link');

// các tab khác vẫn đúng
$('encFmtHex').click();
check(/^[0-9a-f]+$/.test($('encCode').textContent.slice(0, 64)), 'chuyển sang Hex được');
check($('encCode').textContent.startsWith('414941534352310a'), 'Hex đúng magic AIASCR1\n');
$('encFmtB64').click();
check($('encCode').textContent.startsWith('QUlBU0NSMQ'), 'chuyển sang Base64 được (bắt đầu QUlBU0NSMQ)');
$('encFmtRun').click();
check($('encCode').textContent.trim().startsWith('(function') && !$('encFmtRun').disabled, 'quay lại tab Snippet được');

/* --------------------------------------------------------- 3. tải & chạy --- */

console.log('\n[3] Tải gói & chạy thử');
$('dlZip').click();
check(downloads.some((n) => n && n.endsWith('.zip')), 'tải được ZIP', downloads.join(', '));
$('dlKey').click();
check(downloads.some((n) => n === 'aia.key.js'), 'tải được key script dùng chung aia.key.js', downloads.join(', '));

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


/* --------------------------------------------------------- 6. mã hoá link --- */

console.log('\n[6] Mã hoá link');

window.document.querySelector('.tabs button[data-view="link"]').click();
check($('view-link').classList.contains('active'), 'bấm tab Mã hoá link mở đúng màn hình');

const LINK_URL = 'https://example.com/path/script.js?a=1&b=2';
$('linkIter').value = '100000';
$('linkInput').value = LINK_URL;
$('linkEncrypt').click();
await waitFor(() => $('linkToken').textContent.startsWith('AIALNK1.'), 'mã hoá link ra token');

const tokenText = $('linkToken').textContent;
check(tokenText.length < 600, 'token link ngắn gọn', tokenText.length + ' ký tự');
check(!tokenText.includes('example.com') && !tokenText.includes('script.js'), 'token KHÔNG lộ link gốc');
check(!$('linkResultCard').hidden, 'hiện khung kết quả link');
check($('linkStats').textContent.includes('Token'), 'có thống kê token', $('linkStats').textContent.slice(0, 60));
check($('linkTokenNote').textContent.includes('KHÔNG mật khẩu'), 'ghi chú token nói rõ chế độ bảo vệ');

const linkSnippet = $('linkSnippet').textContent;
check(linkSnippet.trim().startsWith('(function'), 'snippet link ẩn dấu vết (không chú thích)', linkSnippet.slice(0, 24));
check(!linkSnippet.includes('https://'), 'snippet link không lộ link key/URL dạng chữ');
check(!linkSnippet.includes('AIALNK1'), 'snippet link không lộ tiền tố token');
check(!linkSnippet.includes('openLink'), 'snippet link không lộ tên API');

// mở khoá lại trên chính trang
$('linkDecodeInput').value = tokenText;
$('linkDecodeBtn').click();
await waitFor(() => $('linkDecodeUrl').textContent === LINK_URL, 'mở khoá token ra đúng link gốc');
check($('linkDecodeOpen').getAttribute('href') === LINK_URL, 'nút Mở trỏ đúng link gốc', $('linkDecodeOpen').getAttribute('href'));
check(($('linkDecodeOpen').getAttribute('rel') || '').includes('noopener'), 'nút Mở có rel="noopener"');
check($('linkDecodeOut').hidden === false, 'hiện khung link sau khi mở khoá');

// token hỏng
$('linkDecodeInput').value = 'AIALNK1.abc';
$('linkDecodeBtn').click();
await waitFor(() => $('linkDecodeNote').textContent.includes('Token'), 'báo token hỏng');
check($('linkDecodeOut').hidden, 'token hỏng thì không hiện link');

// chặn link nguy hiểm
$('linkInput').value = 'javascript:alert(1)';
$('linkEncrypt').click();
await waitFor(() => $('linkStatus').textContent.includes('http'), 'chặn link javascript:');
check(($('linkToken').textContent || '').startsWith('AIALNK1.'), 'token cũ vẫn còn nguyên khi nhập link sai');

// có mật khẩu
$('linkPassMode').value = 'ask';
$('linkPassMode').dispatchEvent(new window.Event('change'));
check($('linkPass').disabled === false, 'chọn có mật khẩu thì ô mật khẩu bật lên');
$('linkPass').value = 'pw-link-1';
$('linkInput').value = 'https://example.com/secret';
$('linkEncrypt').click();
await waitFor(() => $('linkTokenNote').textContent.includes('hỏi khi chạy'), 'token ghi rõ chế độ hỏi mật khẩu');
const pwToken = $('linkToken').textContent;
check(pwToken.startsWith('AIALNK1.') && pwToken !== tokenText, 'token có mật khẩu khác token không mật khẩu');

$('linkDecodeInput').value = pwToken;
$('linkDecodePass').value = 'sai';
$('linkDecodeBtn').click();
await waitFor(() => /Sai mật khẩu|Không mở được/.test($('linkDecodeNote').textContent), 'sai mật khẩu bị chặn');
check($('linkDecodeOut').hidden, 'sai mật khẩu không hiện link');

$('linkDecodePass').value = 'pw-link-1';
$('linkDecodeBtn').click();
await waitFor(() => $('linkDecodeUrl').textContent === 'https://example.com/secret', 'đúng mật khẩu mở được link');
check($('linkDecodeOut').hidden === false, 'hiện link khi đúng mật khẩu');

$('linkPassMode').value = 'none';
$('linkPassMode').dispatchEvent(new window.Event('change'));
$('linkPass').value = '';


/* ------------------------------- 6b. đuôi tệp SAI: .js nhưng nội dung là Lua --- */

console.log('\n[6b] Đuôi tệp sai (tệp .js nhưng nội dung là Luau)');

const LUAU_TEXT = [
  'local Players = game:GetService("Players")',
  'local RunService = game:GetService("RunService")',
  'local player = Players.LocalPlayer',
  'local playerGui = player:WaitForChild("PlayerGui")',
  'local function makeFrame(parent)',
  '  local f = Instance.new("Frame")',
  '  f.Size = UDim2.new(0, 120, 0, 40)',
  '  f.Parent = parent',
  '  f.MouseButton1Click:Connect(function() print("hi") end)',
  '  return f',
  'end',
  'RunService.RenderStepped:Connect(function(dt) local x = 1 if x ~= 2 then print(dt) end end)',
  'for _, v in ipairs({1, 2, 3}) do print(v) end',
].join('\n');

// (a) trước tiên: lỗi cú pháp trong Worker phải được dịch thành câu dễ hiểu
{
  const jsFile = new File(['globalThis.__ok = 1; console.log("chay duoc");'], 'fine.js', { type: 'text/javascript' });
  Object.defineProperty($('fileInput'), 'files', { value: [jsFile], configurable: true });
  $('fileInput').dispatchEvent(new window.Event('change'));
  await waitFor(() => $('fileInfo').textContent.includes('fine.js'), 'nạp tệp JS');
  // chờ mã hoá XONG cho tệp mới (không dựa vào trạng thái cũ của lần mã hoá trước)
  await waitFor(() => ($('metaPreview').textContent || '').includes('fine.js') && $('testRunBtn').disabled === false, 'nút chạy thử bật cho tệp JS');
  check($('testRunBtn').title.includes('Web Worker'), 'nút chạy thử có tooltip giải thích', $('testRunBtn').title);

  const RealWorker = globalThis.Worker;
  class SyntaxErrWorker {
    constructor() {
      setTimeout(() => this.onerror && this.onerror({ message: "Unexpected identifier 'Players'" }), 5);
    }
    terminate() {}
    postMessage() {}
  }
  globalThis.Worker = SyntaxErrWorker;
  window.Worker = SyntaxErrWorker;
  $('testLog').textContent = '';
  $('testRunBtn').click();
  await waitFor(() => $('testLog').textContent.includes('Unexpected identifier'), 'worker báo lỗi cú pháp');
  check($('testLog').textContent.includes('không phải lỗi mã hoá'), 'lỗi cú pháp được giải thích bằng tiếng Việt', $('testLog').textContent.slice(0, 120));
  check($('testLog').textContent.includes('Tải bản rõ'), 'gợi ý đúng cách lấy lại code');
  globalThis.Worker = RealWorker;
  window.Worker = RealWorker;
}

// (b) tệp .js nhưng nội dung Luau → nhận ra Lua, không chạy thử
{
  const luaFile = new File([LUAU_TEXT], 'script.js', { type: 'text/javascript' });
  Object.defineProperty($('fileInput'), 'files', { value: [luaFile], configurable: true });
  $('fileInput').dispatchEvent(new window.Event('change'));
  await waitFor(() => $('fileInfo').textContent.includes('script.js'), 'nạp tệp .js có nội dung Lua');
  await waitFor(() => /Lua/.test($('fileInfo').textContent), 'giao diện nhận ra nội dung là Lua');
  check($('fileInfo').textContent.includes('Lua/Luau'), 'hiện đúng nhãn Lua/Luau', $('fileInfo').textContent);
  check($('fileInfo').textContent.includes('đuôi tệp là JavaScript'), 'nói rõ đuôi tệp lệch nội dung', $('fileInfo').textContent);
  check($('fileInfo').classList.contains('warn'), 'cảnh báo có màu/kiểu riêng');
  check($('fileInfo').title.includes('không chạy thử'), 'tooltip giải thích vì sao không chạy thử');

  await waitFor(() => !$('resultCard').hidden && $('resStats').textContent.includes('Tự kiểm tra') && ($('metaPreview').textContent || '').includes('"lua"'), 'vẫn mã hoá bình thường');
  const meta = JSON.parse($('metaPreview').textContent);
  check(meta.file.lang === 'lua', 'header ghi lang = lua (dù tên .js)', meta.file.lang);
  check($('resStats').textContent.includes('khớp 100%'), 'mã hoá/giải mã vẫn khớp 100%');
  check($('testRunBtn').disabled === true, 'nút "Chạy thử ngay" bị khoá');
  check($('testRunBtn').title.includes('Lua'), 'tooltip nói rõ lý do khoá', $('testRunBtn').title);

  // snippet: kiểu "có chú thích" phải để EXEC = false
  $('encStyle').value = 'labeled';
  $('encStyle').dispatchEvent(new window.Event('change'));
  check(/var EXEC = false;/.test($('encCode').textContent), 'snippet cho tệp Lua: EXEC = false');
  check(!/var EXEC = true;/.test($('encCode').textContent), 'snippet không cố chạy Lua');
  $('encStyle').value = 'stealth';
  $('encStyle').dispatchEvent(new window.Event('change'));
  check($('encCode').textContent.trim().startsWith('(function'), 'quay lại snippet ẩn dấu vết');
  check(!$('encCode').textContent.includes('https://'), 'snippet ẩn vẫn không lộ link');
}

/* ------------------------------------------------- 7b. tab Lập trình --- */

console.log('\n[7b] Tab Lập trình (số dòng · zoom · lỗi · chia đôi)');
{
  // jsdom không tự tải <link rel=stylesheet> ⇒ nhúng CSS thật vào để kiểm tra cả giao diện
  const styleEl = window.document.createElement('style');
  styleEl.textContent = fs.readFileSync(path.join(root, 'assets/style.css'), 'utf8');
  window.document.head.appendChild(styleEl);

  const tab = window.document.querySelector('[data-view="editor"]');
  check(!!tab, 'thanh tab có mục Lập trình');
  tab.click();
  check($('view-editor').classList.contains('active'), 'mở được tab Lập trình');
  check(!!globalThis.AIA_EDITOR, 'program.js đã khởi tạo (AIA_EDITOR)');

  $('edName').value = 'demo.js';
  $('edCode').value = 'function loi(a, b) {\n  if (a > b {\n    console.log("lon hon");\n  }\n}\nconsole.log(x);\n';
  $('edCode').dispatchEvent(new window.Event('input'));

  const gutter = $('edNums').textContent.split('\n');
  check(gutter.length === 7, 'gutter có đúng 7 số dòng', String(gutter.length));
  check(gutter[0] === '1' && gutter[6] === '7', 'gutter đánh số từ 1', gutter.join(','));
  check($('edStats').textContent.includes('Số dòng: 7'), 'thống kê số dòng', $('edStats').textContent);
  check($('edStats').textContent.includes('Kích thước'), 'thống kê kích thước');
  check(/\d+(\.\d+)? (B|KB|MB)/.test($('edStats').textContent), 'kích thước có đơn vị B/KB/MB', $('edStats').textContent);
  check(/Kích thước: \d+(\.\d+)? (B|KB|MB)/.test($('edStats').textContent), 'kích thước có số + đơn vị', $('edStats').textContent);

  await waitFor(() => $('edIssues').querySelector('.issue') || $('edIssues').textContent.includes('Không thấy lỗi'), 'tự kiểm tra sau khi gõ');
  const errCards = $('edIssues').querySelectorAll('.issue.err');
  check(errCards.length >= 1, 'phát hiện lỗi cú pháp (thiếu ngoặc)', 'cards=' + errCards.length);
  check($('edIssues').textContent.includes('LỖI'), 'panel lỗi ghi rõ "LỖI"');
  check($('edSummary').textContent.includes('lỗi'), 'có dòng tổng kết lỗi', $('edSummary').textContent);

  // bấm vào lỗi → nhảy tới dòng
  const withLine = [...errCards].find((c) => c.dataset.line);
  if (withLine) {
    const line = Number(withLine.dataset.line);
    withLine.click();
    const before = $('edCode').value.slice(0, $('edCode').selectionStart);
    check(before.split('\n').length === line, 'bấm lỗi nhảy đúng dòng ' + line, String(before.split('\n').length));
  } else {
    check(false, 'có lỗi kèm số dòng để bấm');
  }

  // sửa lại code đúng → hết lỗi
  $('edCode').value = 'function ok(a, b) {\n  if (a > b) {\n    console.log("lon hon");\n  }\n}\nok(1, 2);\n';
  $('edCode').dispatchEvent(new window.Event('input'));
  await waitFor(() => /Không thấy lỗi/.test($('edIssues').textContent), 'sửa xong thì hết lỗi');
  check($('edSummary').textContent.includes('0 lỗi'), 'tổng kết 0 lỗi', $('edSummary').textContent);

  // zoom
  const startFont = $('edCode').style.fontSize;
  $('edZoomIn').click();
  check($('edCode').style.fontSize === '14px', 'nút A+ tăng cỡ chữ', $('edCode').style.fontSize + ' (trước ' + startFont + ')');
  check($('edZoomLabel').textContent === '108%', 'nhãn zoom cập nhật', $('edZoomLabel').textContent);
  $('edZoomOut').click();
  check($('edCode').style.fontSize === '13px', 'nút A− giảm cỡ chữ', $('edCode').style.fontSize);
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: '=', ctrlKey: true, bubbles: true }));
  check($('edCode').style.fontSize === '14px', 'Ctrl + phóng to', $('edCode').style.fontSize);
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: '-', ctrlKey: true, bubbles: true }));
  check($('edCode').style.fontSize === '13px', 'Ctrl − thu nhỏ', $('edCode').style.fontSize);
  for (let i = 0; i < 40; i++) $('edZoomIn').click();
  check($('edCode').style.fontSize === '28px', 'zoom dừng ở 28px (không phóng vô hạn)', $('edCode').style.fontSize);
  for (let i = 0; i < 40; i++) $('edZoomOut').click();
  check($('edCode').style.fontSize === '10px', 'zoom dừng ở 10px', $('edCode').style.fontSize);
  $('edZoomReset').click();
  check($('edCode').style.fontSize === '13px', 'nút 100% đưa về mặc định');

  // chia đôi màn hình
  $('edLayout').value = 'code';
  $('edLayout').dispatchEvent(new window.Event('change'));
  check($('edSplit').classList.contains('mode-code'), 'chọn "chỉ code"');
  check(window.getComputedStyle($('edErrorPane')).display === 'none', 'panel lỗi bị ẩn khi chỉ xem code');
  $('edLayout').value = 'errors';
  $('edLayout').dispatchEvent(new window.Event('change'));
  check($('edSplit').classList.contains('mode-errors'), 'chọn "chỉ lỗi"');
  $('edLayout').value = 'split';
  $('edLayout').dispatchEvent(new window.Event('change'));
  check(!$('edSplit').classList.contains('mode-code') && !$('edSplit').classList.contains('mode-errors'), 'quay lại chia đôi');

  // ẩn/hiện số dòng
  $('edLineToggle').checked = false;
  $('edLineToggle').dispatchEvent(new window.Event('change'));
  check($('edGutter').hidden === true, 'tắt được số dòng');
  $('edLineToggle').checked = true;
  $('edLineToggle').dispatchEvent(new window.Event('change'));
  check($('edGutter').hidden === false, 'bật lại số dòng');

  // tab + phím Tab chèn 2 dấu cách
  const ta = $('edCode');
  ta.value = 'a';
  ta.setSelectionRange(1, 1);
  const tabEvt = new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
  ta.dispatchEvent(tabEvt);
  check(ta.value === 'a  ', 'phím Tab chèn 2 dấu cách', JSON.stringify(ta.value));

  // kích thước lớn: 5.000 dòng vẫn nhanh
  const many = [];
  for (let i = 0; i < 5000; i++) many.push('const v' + i + ' = ' + i + ';');
  const t0 = Date.now();
  ta.value = many.join('\n');
  ta.dispatchEvent(new window.Event('input'));
  const buildMs = Date.now() - t0;
  const nums = $('edNums').textContent.split('\n');
  check(nums.length === 5000, 'gutter 5.000 dòng', String(nums.length));
  check(buildMs < 3000, 'dựng 5.000 dòng dưới 3 giây (' + buildMs + ' ms)');
  check($('edStats').textContent.includes('Số dòng: 5000'), 'thống kê 5.000 dòng', $('edStats').textContent);
  check(/Kích thước: \d+(\.\d+)? (KB|MB)/.test($('edStats').textContent), 'tệp 5.000 dòng hiện KB', $('edStats').textContent);

  // "Mã hoá code này" → chuyển sang tab Mã hoá và mã hoá luôn
  $('edCode').value = sampleCode;
  $('edName').value = 'tu-editor.js';
  $('edToEncrypt').click();
  check($('view-encrypt').classList.contains('active'), 'nút "Mã hoá code này" mở tab Mã hoá');
  check($('pasteText').value === sampleCode, 'code được đưa sang ô dán');
  await waitFor(() => !$('resultCard').hidden && $('resStats').textContent.includes('Tự kiểm tra'), 'mã hoá ngay từ tab Lập trình');
  check($('fileInfo').textContent.includes('tu-editor.js'), 'giữ tên tệp từ trình soạn thảo', $('fileInfo').textContent);

  // quay lại tab Lập trình
  window.document.querySelector('[data-view="editor"]').click();
}

/* ---------------------------------------- 7c. chống soi: trang trắng --- */

console.log('\n[7c] Chống soi — trang trắng');
{
  $('cloakLink').value = 'https://mncuadaigmailcom.github.io/aiaiaitao3/secure-script/';
  $('cloakPass').value = 'khoa-mo-test';
  check($('cloakOut').hidden === true, 'chưa tạo thì chưa hiện kết quả');
  $('cloakMake').click();
  await waitFor(() => $('cloakOut').hidden === false, 'tạo được trang trắng', 30000);

  const cloak = globalThis.AIA_EDITOR && globalThis.AIA_EDITOR.state.cloak;
  check(!!cloak && !!cloak.html, 'có nội dung trang HTML');
  check(/^<!doctype html>/i.test(cloak.html), 'là trang HTML hoàn chỉnh');
  check(/<title><\/title>/.test(cloak.html), 'tiêu đề rỗng (không lộ chữ)');
  check(!/>[^<]*[A-Za-zÀ-ỹ]{4,}[^<]*</.test(cloak.html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')), 'không có chữ hiển thị trên trang');
  check(cloak.html.includes('#ffffff'), 'nền trắng');
  check(!cloak.html.includes('AIALNK1.'), 'token không lộ nguyên dạng');
  check(cloak.html.includes('aia.key.js') === false, 'không lộ tên key script dạng thường');
  check(cloak.html.includes('https://mncuadaigmailcom.github.io') === false, 'không lộ link đích');
  check(cloak.unlock.includes('#k='), 'có link mở kèm khoá');
  check(cloak.unlock.includes(encodeURIComponent('khoa-mo-test')), 'khoá mở nằm trong link', cloak.unlock);
  check($('cloakUnlock').value === cloak.unlock, 'ô link mở hiển thị đúng');
  check($('cloakDownload').hidden === false, 'có nút tải .html');
  check(cloak.name.endsWith('-trang-trang.html'), 'tên tệp .html', cloak.name);

  // khoá trống ⇒ tự sinh khoá (không để trang trắng "câm")
  $('cloakPass').value = '';
  $('cloakMake').click();
  await waitFor(() => /tự sinh/.test($('cloakStatus').textContent), 'để trống khoá thì tự sinh', 30000);
  const auto = globalThis.AIA_EDITOR.state.cloak;
  check(auto.unlock.length > cloak.unlock.length - 20 && auto.unlock.includes('#k='), 'vẫn có link mở khi tự sinh khoá', auto.unlock);
}

/* ------------------------------------- 7d. Lập trình nâng cao (IDE) --- */

console.log('\n[7d] Nhiều tệp · tìm/thay · định dạng · chạy thử + xem trước · ô lưu');
{
  const A = globalThis.AIA_EDITOR;
  window.confirm = () => true;
  globalThis.confirm = () => true;
  const ta = $('edCode');
  const fire = (el, type) => el.dispatchEvent(new window.Event(type));

  check(!!$('edTabs') && !!$('edNewFile') && !!$('edFileCount'), 'có thanh tab tệp');
  check(!!$('edTheme') && !!$('edFindInput') && !!$('edReplaceInput'), 'có chọn màu + thanh tìm/thay');
  check(!!$('edConsole') && !!$('edConsoleOut'), 'có panel console');
  check(!!$('edPreview') && !!$('edSideTabs'), 'có khung xem trước + tab Kết quả/Lỗi');
  check(!!$('edSlotsModal') && !!$('edSlotsList'), 'có hộp thoại lưu dự án');

  /* ------------------------------------------------------------- tệp --- */
  A.setCode('const a = 1;\nconst b = 2;\n', 'demo.js');
  check(A.activeName() === 'demo.js', 'đổi tên tệp đang mở', A.activeName());
  check(window.document.querySelectorAll('.ed-tab').length === A.files().length, 'số tab khớp số tệp');

  A.addFile('util.js', '// util\n');
  check(A.files().length === 2, 'thêm được tệp thứ hai', String(A.files().length));
  check(A.activeName() === 'util.js', 'tệp mới được chọn');
  check(ta.value.includes('// util'), 'nội dung tệp mới hiện trong khung soạn thảo');
  check(window.document.querySelectorAll('.ed-tab').length === 2, 'hiện 2 tab');
  check($('edFileCount').textContent.includes('2 tệp'), 'hiện tổng số tệp', $('edFileCount').textContent);

  A.addFile('note.lua', 'print(1)\n');
  check(A.activeName() === 'note.js', 'tạo tệp .lua tự đổi thành .js (chỉ JS)', A.activeName());
  check(ta.value.includes('print(1)'), 'nội dung tệp vẫn giữ nguyên');
  window.document.querySelector('.ed-tab.active .ed-tab-x').click();

  $('edName').value = 'style.css';
  fire($('edName'), 'input');
  check(A.activeName() === 'style.js', 'đổi tên .css tự thành .js', A.activeName());
  window.document.querySelectorAll('.ed-tab')[0].click();
  check(A.activeName() === 'demo.js', 'bấm tab để chuyển tệp', A.activeName());
  check(ta.value.includes('const a = 1'), 'nội dung tệp cũ được giữ nguyên');

  $('edName').value = 'main.js';
  fire($('edName'), 'input');
  check(A.activeName() === 'main.js', 'đổi tên qua ô Tên tệp', A.activeName());
  check(window.document.querySelector('.ed-tab.active .ed-tab-name').textContent === 'main.js', 'nhãn tab đổi theo');

  window.document.querySelectorAll('.ed-tab .ed-tab-x')[1].click();
  check(A.files().length === 1, 'nút × đóng được tệp', String(A.files().length));

  /* -------------------------------------------------------- tìm/thay --- */
  ta.value = 'foo bar foo\nFOO baz foo\n';
  fire(ta, 'input');
  $('edFindToggle').click();
  check($('edFind').hidden === false, 'mở thanh tìm kiếm');
  $('edFindInput').value = 'foo';
  fire($('edFindInput'), 'input');
  check($('edFindCount').textContent === '0/4', 'đếm đúng 4 kết quả (không phân biệt hoa thường)', $('edFindCount').textContent);

  $('edFindNext').click();
  check(ta.value.slice(ta.selectionStart, ta.selectionEnd) === 'foo', 'nút ↓ chọn kết quả đầu');
  check($('edFindCount').textContent === '1/4', 'bộ đếm tiến 1/4', $('edFindCount').textContent);
  $('edFindNext').click();
  check($('edFindCount').textContent === '2/4', 'nút ↓ sang kết quả kế', $('edFindCount').textContent);
  $('edFindPrev').click();
  check($('edFindCount').textContent === '1/4', 'nút ↑ lùi lại', $('edFindCount').textContent);

  $('edFindCase').checked = true;
  fire($('edFindCase'), 'change');
  check($('edFindCount').textContent.endsWith('/3'), 'phân biệt hoa thường → 3 kết quả', $('edFindCount').textContent);
  $('edFindCase').checked = false;
  fire($('edFindCase'), 'change');

  $('edReplaceInput').value = 'X';
  $('edReplaceAll').click();
  check(!ta.value.includes('foo') && ta.value.includes('X bar X'), 'Thay tất cả hoạt động', JSON.stringify(ta.value));
  check($('edFindCount').textContent === '0/0', 'sau khi thay không còn kết quả');

  ta.value = 'mot hai mot';
  fire(ta, 'input');
  $('edFindInput').value = 'mot';
  fire($('edFindInput'), 'input');
  $('edReplaceInput').value = 'ba';
  $('edFindNext').click();
  $('edReplaceOne').click();
  check(ta.value === 'ba hai mot', 'Thay 1 chỗ đúng vị trí đang chọn', JSON.stringify(ta.value));
  $('edFindClose').click();
  check($('edFind').hidden === true, 'đóng thanh tìm kiếm');

  /* ----------------------------------------------------- định dạng --- */
  A.setCode('{"b":2,"a":[1,2]}', 'data.json');
  $('edFormatBtn').click();
  check(ta.value.includes('\n  "b": 2'), 'định dạng JSON xuống dòng + thụt lề', JSON.stringify(ta.value.slice(0, 30)));
  A.setCode('function f(){return 1}', 'x.js');
  $('edFormatBtn').click();
  check(ta.value.split('\n').length >= 2, 'định dạng JS thành nhiều dòng', JSON.stringify(ta.value));
  A.setCode('a{color:red}', 'style.css');
  check(A.activeName() === 'style.js', 'tab chỉ nhận JavaScript: .css → .js', A.activeName());
  check(ta.value === 'a{color:red}', 'nội dung không bị sửa khi chưa bấm định dạng');

  /* ---------------------------------------------------------- màu --- */
  $('edTheme').value = 'dracula';
  fire($('edTheme'), 'change');
  check(window.document.querySelector('.ed-shell').classList.contains('theme-dracula'), 'đổi được giao diện soạn thảo');
  check(window.localStorage.getItem('aia.ed.theme') === 'dracula', 'nhớ giao diện đã chọn');
  $('edTheme').value = 'dark';
  fire($('edTheme'), 'change');

  /* ---------------------------------------- chạy thử + xem trước --- */
  A.setCode('console.log("hi");\ndocument.body.innerHTML = "<b>kết quả</b>";', 'run.js');
  $('edRunBtn').click();
  check($('edConsole').hidden === false, 'bấm Chạy thì mở console');
  check($('edSidePreview').hidden === false, 'tự chuyển sang tab Kết quả');
  const srcdoc = $('edPreview').srcdoc;
  check(srcdoc.includes('document.body.innerHTML'), 'khung xem trước nhận đúng code');
  check(srcdoc.includes('<!doctype html>'), 'khung xem trước là tài liệu HTML hoàn chỉnh');
  const sandbox = $('edPreview').getAttribute('sandbox') || '';
  check(sandbox.includes('allow-scripts'), 'iframe có sandbox allow-scripts');
  check(!sandbox.includes('allow-same-origin'), 'iframe KHÔNG có allow-same-origin (cách ly trang)');
  check($('edPreviewHint').hidden === true, 'ẩn lời nhắc khi đã chạy');
  check($('edConsoleStatus').textContent.includes('đang chạy'), 'báo đang chạy', $('edConsoleStatus').textContent);

  const token = A.previewToken();
  check(typeof token === 'string' && token.length > 6, 'có token riêng cho khung xem trước');
  const post = (data) => window.dispatchEvent(new window.MessageEvent('message', { data }));
  post({ __aia: 'token-sai', kind: 'log', level: 'log', text: 'KHONG-DUOC-HIEN' });
  check(!$('edConsoleOut').textContent.includes('KHONG-DUOC-HIEN'), 'bỏ qua message không đúng token');
  post({ __aia: token, kind: 'log', level: 'log', text: 'Xin chào từ iframe' });
  check($('edConsoleOut').textContent.includes('Xin chào từ iframe'), 'log của code hiện trong console');
  check($('edConsoleOut').textContent.includes('> Xin chào từ iframe'), 'log có tiền tố ">"', $('edConsoleOut').textContent.slice(0, 90));
  post({ __aia: token, kind: 'log', level: 'warn', text: 'cẩn thận' });
  check($('edConsoleOut').querySelectorAll('.ed-log.warn').length >= 1, 'log mức warn có kiểu riêng');
  post({ __aia: token, kind: 'error', message: 'boomChuaKhaiBao is not defined' });
  check(/boomChuaKhaiBao/.test($('edConsoleOut').textContent), 'lỗi runtime hiện trong console');
  check($('edConsoleStatus').textContent.includes('lỗi'), 'báo trạng thái lỗi', $('edConsoleStatus').textContent);
  post({ __aia: token, kind: 'done' });
  check($('edConsoleStatus').textContent.includes('xong'), 'báo chạy xong', $('edConsoleStatus').textContent);
  check($('edPreviewStatus').textContent.includes('xong'), 'trạng thái khung xem trước = xong', $('edPreviewStatus').textContent);

  $('edCheckBtn').click();
  check($('edSideErrors').hidden === false, 'bấm Kiểm tra thì mở tab Lỗi');
  check(/^\d+$/.test($('edErrCount').textContent), 'tab Lỗi có bộ đếm lỗi', $('edErrCount').textContent);
  window.document.querySelector('#edSideTabs [data-side="preview"]').click();
  check($('edSideErrors').hidden === true && $('edSidePreview').hidden === false, 'chuyển lại được tab Kết quả');
  window.document.querySelector('#edSideTabs [data-side="errors"]').click();
  check($('edSideErrors').hidden === false, 'chuyển sang tab Lỗi bằng chuột');

  $('edStopBtn').click();
  check($('edPreview').srcdoc === '', 'nút Dừng xoá khung xem trước');
  check($('edConsoleStatus').textContent.includes('đã dừng'), 'báo đã dừng');
  $('edConsoleClear').click();
  check($('edConsoleOut').textContent === '', 'xoá được log');
  $('edConsoleClose').click();
  check($('edConsole').hidden === true, 'đóng được console');

  /* ------------------------------------------------ tự chạy khi gõ --- */
  A.autoRun(false);
  A.setCode('const v = 1;', 'auto.js');
  $('edPreview').srcdoc = '';
  ta.value = 'const v = 1.5;';
  fire(ta, 'input');
  await new Promise((r) => setTimeout(r, 1100));
  check($('edPreview').srcdoc === '', 'tắt Tự chạy thì không tự chạy');

  A.autoRun(true);
  check($('edAutoRun').checked === true && window.localStorage.getItem('aia.ed.autorun') === '1', 'bật Tự chạy + nhớ lựa chọn');
  ta.value = 'const v = 2;';
  fire(ta, 'input');
  await waitFor(() => $('edPreview').srcdoc.includes('const v = 2'), 'bật Tự chạy thì chạy lại sau khi ngừng gõ', 6000);
  check($('edConsoleStatus').textContent.includes('đang chạy'), 'tự chạy cập nhật trạng thái');
  A.autoRun(false);

  /* -------------------------------------------------------- ô lưu --- */
  A.setCode('const saved = 42;\n', 'save-me.js');
  const filesBeforeSave = A.files().length;
  $('edSaveProject').click();
  check($('edSlotsModal').hidden === false, 'mở hộp thoại lưu dự án');
  $('edSlotName').value = 'Dự án A';
  $('edSlotSave').click();
  check(A.slots().length === 1, 'lưu được 1 bản', String(A.slots().length));
  check($('edSlotsList').querySelectorAll('.slot').length === 1, 'danh sách hiện 1 bản lưu');
  check($('edSlotCount').textContent === '1/5', 'bộ đếm ô lưu 1/5', $('edSlotCount').textContent);

  A.addFile('tam.js', '// tam\n');
  check(A.files().length === filesBeforeSave + 1, 'thêm tệp tạm sau khi lưu');
  window.document.querySelector('#edSlotsList [data-action="load"]').click();
  check(A.files().length === filesBeforeSave, 'mở lại bản lưu phục hồi đúng số tệp', String(A.files().length));
  check(A.activeName() === 'save-me.js' && ta.value.includes('saved = 42'), 'nội dung bản lưu khôi phục đúng');
  check($('edSlotsModal').hidden === true, 'mở bản lưu xong thì đóng hộp thoại');

  const slotId = A.slots()[0].id;
  A.renameSlot(slotId, 'Tên khác');
  check(A.slots()[0].name === 'Tên khác', 'đổi tên bản lưu');
  check((window.localStorage.getItem('aia.ide.slots') || '').includes('Tên khác'), 'bản lưu được ghi vào localStorage');
  A.deleteSlot(slotId);
  check(A.slots().length === 0, 'xoá được bản lưu', String(A.slots().length));

  /* ------------------------------------------------------- ZIP, phím --- */
  const beforeZip = downloads.length;
  $('edZipBtn').click();
  check(downloads.length === beforeZip + 1 && downloads[downloads.length - 1] === 'aia-workspace.zip', 'tải được ZIP không gian làm việc', String(downloads[downloads.length - 1]));

  ta.value = 'const persistMe = 1;\n';
  fire(ta, 'input');
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }));
  check((window.localStorage.getItem('aia.ide.workspace') || '').includes('persistMe'), 'Ctrl+S lưu nháp vào trình duyệt');
  check($('edSavedHint').textContent.includes('đã lưu'), 'có chỉ báo đã lưu', $('edSavedHint').textContent);

  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true }));
  check($('edFind').hidden === false, 'Ctrl+F mở tìm kiếm');
  $('edFindClose').click();

  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, shiftKey: true, bubbles: true }));
  await waitFor(() => $('edConsole').hidden === false, 'Ctrl+Shift+Enter chạy code');
  $('edConsoleClose').click();

  /* --------------------------------------------------------- làm mới --- */
  $('edResetBtn').click();
  check(A.files().length === 1, 'Làm mới đưa về 1 tệp', String(A.files().length));
  check(ta.value === '', 'Làm mới xoá trắng nội dung', JSON.stringify(ta.value));
  check(window.document.querySelectorAll('.ed-tab').length === 1, 'thanh tab còn 1 tab');

  // trả lại trạng thái có code để các mục sau dùng
  A.setCode(sampleCode, 'tu-editor.js');
}

/* --------------------------------------- 7e. xem trước chạy thật --- */

console.log('\n[7e] Khung xem trước chạy thật (bridge postMessage)');
{
  const { buildPreviewDocument } = await import('../assets/core.js');
  const code = [
    'console.log("xin chào");',
    'console.log({ a: 1 });',
    'console.warn("cẩn thận");',
    'document.body.insertAdjacentHTML("beforeend", "<b id=ok>đã chạy</b>");',
    'setTimeout(function () { throw new Error("bùm"); }, 0);',
  ].join('\n');
  const doc = buildPreviewDocument(code, { token: 'tok-e2e', title: 'e2e.js' });
  const frame = new JSDOM(doc, { runScripts: 'dangerously', url: 'http://localhost:8080/' });
  const messages = [];
  frame.window.addEventListener('message', (e) => messages.push(e.data));
  await new Promise((r) => setTimeout(r, 200));

  const ofKind = (kind) => messages.filter((m) => m && m.__aia === 'tok-e2e' && m.kind === kind);
  check(ofKind('log').some((m) => m.text === 'xin chào'), 'console.log chạy và gửi về trang cha');
  check(ofKind('log').some((m) => m.text === '{"a":1}'), 'log object được JSON hoá', JSON.stringify(ofKind('log').map((m) => m.text)));
  check(ofKind('log').some((m) => m.level === 'warn' && m.text === 'cẩn thận'), 'giữ đúng mức warn');
  check(!!frame.window.document.getElementById('ok'), 'code chạm được DOM trong iframe');
  check(frame.window.document.body.textContent.includes('đã chạy'), 'kết quả hiện trong khung xem trước');
  check(frame.window.document.title === 'e2e.js', 'tiêu đề khung = tên tệp');
  check(!!ofKind('done').length, 'gửi tín hiệu done khi chạy xong');
  const errs = ofKind('error');
  check(errs.some((m) => /bùm/.test(String(m.message))), 'bắt được lỗi ném trong setTimeout', JSON.stringify(errs));
  check(messages.every((m) => m && m.__aia === 'tok-e2e'), 'mọi message đều mang token đúng');
  frame.window.close();
}

/* ------------------------------------------------- 8. hộp thoại GitHub --- */

console.log('\n[8] Hộp thoại GitHub (API key · tạo dự án · sửa file · kết quả)');
{
  // --- GitHub giả trong RAM: không gọi mạng thật ---
  const ghRepos = new Map();
  const ghFiles = new Map();
  const ghCalls = [];
  let seq = 0;
  const sha = () => (++seq).toString(16).padStart(40, 'b').slice(0, 40);
  const send = (status, body) => ({ ok: status < 400, status, text: async () => (body === undefined ? '' : JSON.stringify(body)) });
  const addRepo = (fullName, extra = {}) => {
    const [owner, name] = fullName.split('/');
    ghRepos.set(fullName, { name, full_name: fullName, private: true, default_branch: 'main', has_pages: false, owner: { login: owner }, ...extra });
  };
  addRepo('tester/da-co');

  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    ghCalls.push(String(url));
    if (!String(url).startsWith('https://api.github.com')) throw new Error('gọi mạng ngoài GitHub: ' + url);
    const method = init.method || 'GET';
    const auth = String((init.headers || {}).Authorization || '');
    if (auth !== 'Bearer ghp_test_token_1234567890') return send(401, { message: 'Bad credentials' });
    const u = new URL(url);
    const path = u.pathname.replace(/^\//, '');
    const body = init.body ? JSON.parse(init.body) : null;
    if (path === 'user') return send(200, { login: 'tester' });
    if (path === 'rate_limit') return send(200, { resources: { core: { remaining: 4999 } } });
    if (path === 'user/repos' && method === 'GET') return send(200, [...ghRepos.values()]);
    if (path === 'user/repos' && method === 'POST') {
      const full = 'tester/' + body.name;
      if (ghRepos.has(full)) return send(422, { message: 'exists' });
      addRepo(full);
      return send(201, ghRepos.get(full));
    }
    const m = /^repos\/([^/]+)\/([^/]+)(?:\/(.*))?$/.exec(path);
    if (!m) return send(404, { message: 'Not Found' });
    const [, owner, name, rest = ''] = m;
    const full = owner + '/' + name;
    const repo = ghRepos.get(full);
    if (!repo) return send(404, { message: 'Not Found' });
    if (!rest && method === 'GET') return send(200, repo);
    if (/^git\/trees/.test(rest)) {
      const tree = [];
      for (const [k, v] of ghFiles) {
        if (!k.startsWith(full + ':')) continue;
        tree.push({ path: k.slice(full.length + 1), type: 'blob', size: v.text.length, sha: v.sha });
      }
      return send(200, { tree, truncated: false });
    }
    if (/^contents\//.test(rest)) {
      const filePath = decodeURIComponent(rest.slice('contents/'.length));
      const key = full + ':' + filePath;
      const entry = ghFiles.get(key);
      if (method === 'GET') {
        if (!entry) return send(404, { message: 'Not Found' });
        let bin = '';
        const bytes = new TextEncoder().encode(entry.text);
        for (const b of bytes) bin += String.fromCharCode(b);
        return send(200, { sha: entry.sha, encoding: 'base64', content: btoa(bin) });
      }
      if (method === 'PUT') {
        if (entry && !body.sha) return send(422, { message: 'sha required' });
        let text = '';
        if (body.content) {
          const bin = atob(body.content);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          text = new TextDecoder().decode(bytes);
        }
        const next = { text, sha: sha() };
        ghFiles.set(key, next);
        return send(200, { content: { sha: next.sha } });
      }
      if (method === 'DELETE') {
        if (!entry) return send(404, { message: 'Not Found' });
        ghFiles.delete(key);
        return send(200, { commit: { sha: sha() } });
      }
    }
    return send(404, { message: 'Not Found' });
  };
  window.confirm = () => true;
  globalThis.confirm = () => true;

  check(!!$('ghOpenBtn'), 'có nút GitHub trên thanh đầu trang');
  $('ghOpenBtn').click();
  check($('ghModal').hidden === false, 'mở được hộp thoại GitHub');
  check(!$('ghPaneKey').hidden, 'tab đầu tiên là API key');
  check(window.document.querySelector('[data-gh="key"]').classList.contains('active'), 'tab API key được chọn sẵn');

  // 1 · API key
  $('ghToken').value = 'ghp_test_token_1234567890';
  $('ghTest').click();
  await waitFor(() => /OK · đăng nhập tester/.test($('ghKeyStatus').textContent), 'kiểm tra token thành công', 15000);
  check($('ghKeyStatus').textContent.includes('4999'), 'hiện hạn mức API còn lại', $('ghKeyStatus').textContent);
  await waitFor(() => $('ghRepoSelect').options.length >= 1, 'tự tải danh sách dự án', 15000);
  check([...$('ghRepoSelect').options].some((o) => o.value === 'tester/da-co'), 'danh sách có dự án sẵn có');

  // 2 · tạo dự án mới (cấy tên mã nguồn) — tự đẩy code JS lên
  globalThis.AIA_EDITOR.setCode('console.log("tu-github");\n', 'script.js');
  window.document.querySelector('[data-gh="new"]').click();
  check(!$('ghPaneNew').hidden && $('ghPaneKey').hidden, 'chuyển sang tab dự án mới');
  $('ghNewName').value = 'editor-demo';
  $('ghCreate').click();
  await waitFor(() => $('ghResultOut').hidden === false, 'tạo dự án + tự đăng code', 20000);
  check($('ghResultLink').value.includes('tester/editor-demo/blob/main/script.js'), 'link GitHub vừa tạo', $('ghResultLink').value);
  check($('ghResultRaw').value.startsWith('https://raw.githubusercontent.com/tester/editor-demo/'), 'có link raw', $('ghResultRaw').value);
  check($('ghResultOpen').getAttribute('href') === $('ghResultLink').value, 'nút mở trỏ đúng link');
  check($('ghPublishStatus').textContent.includes('Đã đăng'), 'báo đã đăng', $('ghPublishStatus').textContent);
  check(ghFiles.get('tester/editor-demo:script.js').text.includes('tu-github'), 'nội dung file trên GitHub đúng');
  check($('ghNewStatus').textContent.includes('editor-demo') || $('ghPublishStatus').textContent.includes('editor-demo'), 'tab dự án mới báo kết quả');

  // 3 · sửa file: xem bao nhiêu file, mở, sửa, thêm, xoá
  window.document.querySelector('[data-gh="edit"]').click();
  check(!$('ghPaneEdit').hidden, 'mở tab sửa file');
  $('ghRepoSelect').value = 'tester/editor-demo';
  $('ghRepoSelect').dispatchEvent(new window.Event('change'));

  // chọn dự án là tự tải file (chưa bấm "Xem các file") và tự hiện link mã nguồn
  await waitFor(() => /có \d+ file/.test($('ghFileInfo').textContent), 'chọn dự án → tự tải danh sách file', 15000);
  check($('ghFileInfo').textContent.includes('1 file'), 'dự án có 1 file', $('ghFileInfo').textContent);
  check([...$('ghFileSelect').options].some((o) => o.value === 'script.js'), 'liệt kê tên file');
  check($('ghFileSelect').value === 'script.js', 'tự chọn sẵn file mã nguồn', $('ghFileSelect').value);
  check($('ghFileLinks').hidden === false, 'khối link tự hiện khi mới chọn dự án (chưa đẩy code lên)');
  check(
    $('ghFileLink').value === 'https://github.com/tester/editor-demo/blob/main/script.js',
    'link mã nguồn tự điền đúng',
    $('ghFileLink').value,
  );
  check(
    $('ghFileRaw').value === 'https://raw.githubusercontent.com/tester/editor-demo/main/script.js',
    'link tải thô tự điền đúng',
    $('ghFileRaw').value,
  );
  check($('ghFileLinkOpen').getAttribute('href') === $('ghFileLink').value, 'nút “Mở trên GitHub” trỏ đúng link');
  check($('ghRepoLink').getAttribute('href') === 'https://github.com/tester/editor-demo', 'có link mở dự án');
  check(/Đang có sẵn trên GitHub/.test($('ghFileLinkNote').textContent), 'ghi chú: tệp đã có trên GitHub', $('ghFileLinkNote').textContent);

  // gõ đường dẫn tệp chưa có → link vẫn hiện, ghi chú đổi, tên có dấu cách vẫn đúng
  $('ghNewPath').value = 'moi/thu muc/ban moi.js';
  $('ghNewPath').dispatchEvent(new window.Event('input'));
  check(
    $('ghFileLink').value === 'https://github.com/tester/editor-demo/blob/main/moi/thu%20muc/ban%20moi.js',
    'đường dẫn có dấu cách được mã hoá trong link',
    $('ghFileLink').value,
  );
  check(/chưa có trên GitHub/.test($('ghFileLinkNote').textContent), 'ghi chú: tệp chưa có trên GitHub', $('ghFileLinkNote').textContent);
  $('ghNewPath').value = 'script.js';
  $('ghNewPath').dispatchEvent(new window.Event('input'));

  $('ghLoadFiles').click();
  await waitFor(() => /có \d+ file/.test($('ghFileInfo').textContent), 'hiện số file của dự án', 15000);

  $('ghFileSelect').value = 'script.js';
  $('ghFileSelect').dispatchEvent(new window.Event('change'));
  await waitFor(() => $('ghFileContent').value.includes('tu-github'), 'mở được nội dung file', 15000);
  check($('ghFilePath').textContent === 'script.js', 'hiện đường dẫn file đang mở');
  check($('ghFileLink').value.endsWith('/script.js'), 'link giữ đúng file đang chọn', $('ghFileLink').value);

  $('ghFileContent').value = 'console.log("da-sua");\n';
  $('ghSaveFile').click();
  await waitFor(() => /Đã lưu/.test($('ghFileStatus').textContent), 'lưu thay đổi lên GitHub', 15000);
  check(ghFiles.get('tester/editor-demo:script.js').text.includes('da-sua'), 'nội dung mới đã ghi lên GitHub');

  $('ghNewPath').value = 'assets/extra.js';
  $('ghFileContent').value = '// extra\n';
  $('ghAddFile').click();
  await waitFor(() => /có 2 file/.test($('ghFileInfo').textContent), 'thêm file mới', 15000);
  check(ghFiles.has('tester/editor-demo:assets/extra.js'), 'file mới nằm trong thư mục con');

  $('ghFileSelect').value = 'assets/extra.js';
  $('ghDeleteFile').click();
  await waitFor(() => /có 1 file/.test($('ghFileInfo').textContent), 'xoá file', 15000);
  check(!ghFiles.has('tester/editor-demo:assets/extra.js'), 'file đã bị xoá khỏi GitHub');
  check($('ghFileLinks').hidden === true, 'xoá file → ẩn link cũ');

  // 4 · kết quả: đăng lại từ nội dung ở tab Sửa file
  window.document.querySelector('[data-gh="result"]').click();
  check(!$('ghPaneResult').hidden, 'mở tab kết quả');
  $('ghPublishPath').value = 'ban-moi.js';
  $('ghPublish').click();
  await waitFor(() => $('ghResultLink').value.includes('ban-moi.js'), 'đăng code lần nữa', 15000);
  check(ghFiles.has('tester/editor-demo:ban-moi.js'), 'file mới có trên GitHub');
  check($('ghResultLink').value.startsWith('https://github.com/tester/editor-demo/'), 'link đúng dự án');

  // bỏ chọn dự án → ẩn link đang hiện
  $('ghRepoSelect').value = '';
  $('ghRepoSelect').dispatchEvent(new window.Event('change'));
  check($('ghFileLinks').hidden === true, 'bỏ chọn dự án → ẩn link cũ');
  check($('ghFileLink').value === '', 'bỏ chọn dự án → xoá nội dung link');

  // lỗi: chưa có token
  $('ghToken').value = '';
  $('ghTest').click();
  await waitFor(() => /Chưa nhập token/.test($('ghKeyStatus').textContent), 'báo lỗi khi thiếu token', 8000);
  check($('ghKeyStatus').textContent.includes('Chưa nhập token'), 'thông báo lỗi rõ ràng');

  // tên dự án có dấu → chặn ngay, không gọi API
  const callsBefore = ghCalls.length;
  $('ghNewName').value = 'dự án có dấu';
  window.document.querySelector('[data-gh="new"]').click();
  $('ghCreate').click();
  check(/chỉ dùng chữ/.test($('ghNewStatus').textContent), 'chặn tên dự án không hợp lệ', $('ghNewStatus').textContent);
  check(ghCalls.length === callsBefore, 'không gọi API khi tên sai');

  check(ghCalls.every((u) => u.startsWith('https://api.github.com')), 'chỉ gọi api.github.com (' + ghCalls.length + ' lần)');
  check(!ghCalls.some((u) => u.includes('ghp_test_token')), 'token không nằm trong URL');
  $('ghClose').click();
  check($('ghModal').hidden === true, 'đóng được hộp thoại');
  globalThis.fetch = realFetch;
}

/* ------------------------- 9. xuất bản một nút: mã hoá + chống soi --- */

console.log('\n[9] Xuất bản một nút: mã hoá + chống soi + GitHub');
{
  const files = new Map(); // 'owner/repo/path' -> text
  const pages = new Map(); // 'owner/repo' -> {html_url}
  const calls = [];
  let repoExists = false;
  const TOKEN = 'ghp_ship_token_1234567890';
  const send = (status, body) =>
    ({ ok: status < 400, status, text: async () => (body === undefined ? '' : JSON.stringify(body)) });

  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || 'GET' });
    if (!String(url).startsWith('https://api.github.com')) throw new Error('gọi mạng ngoài GitHub: ' + url);
    const auth = String((init.headers || {}).Authorization || '');
    if (auth !== 'Bearer ' + TOKEN) return send(401, { message: 'Bad credentials' });
    const u = new URL(url);
    const path = u.pathname.replace(/^\//, '');
    const body = init.body ? JSON.parse(init.body) : null;
    const method = init.method || 'GET';

    if (path === 'user') return send(200, { login: 'tester' });
    if (path === 'user/repos' && method === 'POST') {
      repoExists = true;
      return send(201, { name: body.name, full_name: 'tester/' + body.name, owner: { login: 'tester' }, default_branch: 'main', private: !!body.private, has_pages: false });
    }
    const m = /^repos\/([^/]+)\/([^/]+)(?:\/(.*))?$/.exec(path);
    if (!m) return send(404, { message: 'Not Found' });
    const [, owner, name, rest = ''] = m;
    const full = owner + '/' + name;
    const repo = {
      name,
      full_name: full,
      owner: { login: owner },
      default_branch: 'main',
      private: false,
      has_pages: pages.has(full),
    };
    if (!repoExists) return send(404, { message: 'Not Found' });
    if (!rest && method === 'GET') return send(200, repo);

    if (rest === 'pages' && method === 'GET') {
      if (!pages.has(full)) return send(404, { message: 'Not Found' });
      return send(200, pages.get(full));
    }
    if (rest === 'pages' && method === 'POST') {
      if (body.source.branch !== 'main' || body.source.path !== '/') return send(422, { message: 'bad source' });
      pages.set(full, { html_url: 'https://' + owner + '.github.io/' + name + '/', status: 'building' });
      return send(201, pages.get(full));
    }
    if (rest === 'pages/builds/latest') {
      return send(200, { status: pages.has(full) ? 'built' : 'errored', updated_at: '2026-01-01T00:00:00Z' });
    }
    if (/^contents\//.test(rest)) {
      const filePath = decodeURIComponent(rest.slice('contents/'.length));
      const key = full + '/' + filePath;
      if (method === 'GET') {
        if (!files.has(key)) return send(404, { message: 'Not Found' });
        return send(200, { sha: 'sha-' + key.length, content: Buffer.from(files.get(key), 'utf8').toString('base64'), encoding: 'base64', type: 'file' });
      }
      if (method === 'PUT') {
        const text = Buffer.from(body.content, 'base64').toString('utf8');
        files.set(key, text);
        return send(201, { content: { sha: 'sha-' + key.length }, commit: { sha: 'c1' } });
      }
    }
    return send(404, { message: 'Not Found' });
  };

  try {
    $('ghToken').value = TOKEN;
    $('edCode').value = 'local Players = game:GetService("Players")\nprint("xin chào")';
    $('edToGithub').click();
    await waitFor(() => !$('ghModal').hidden, 'mở hộp thoại GitHub', 8000);
    check(!$('ghPaneShip').hidden, 'mở thẳng tab “Mã hoá + chống soi”');
    check($('ghShipEncrypt').checked && $('ghShipCloak').checked, 'hai tính năng bật sẵn');

    $('ghShipRepo').value = 'game-hub';
    $('ghShipDir').value = 's';
    $('ghShipTarget').value = 'luau';
    $('ghShipFile').value = 'script.lua';

    $('ghShipCloak').checked = false;
    $('ghShipCloak').dispatchEvent(new window.Event('change'));
    check($('ghShipWhiteTextRow').hidden === true, 'tắt chống soi → ẩn tuỳ chọn chữ 404');
    $('ghShipCloak').checked = true;
    $('ghShipCloak').dispatchEvent(new window.Event('change'));
    check($('ghShipWhiteTextRow').hidden === false, 'bật chống soi → hiện tuỳ chọn chữ 404');

    let shipEvents = 0;
    window.document.addEventListener('aia:ship', () => { shipEvents++; });
    $('ghShipGo').click();
    await waitFor(() => $('ghShipScriptLink').value.includes('.lua'), 'xuất bản xong', 20000);
    check(shipEvents >= 1, 'bắn sự kiện aia:ship cho tab Lập trình', String(shipEvents));

    const scriptLink = $('ghShipScriptLink').value;
    check(/^https:\/\/tester\.github\.io\/game-hub\/s\/l-[0-9a-f]{8}\.lua$/.test(scriptLink), 'link script đúng dạng', scriptLink);
    // Dán mỗi URL trần vào Delta thì executor không chạy gì ⇒ phải có sẵn dòng lệnh đầy đủ
    check(
      $('ghShipSnippet').value === 'loadstring(game:HttpGet("' + scriptLink + '"))()',
      'có dòng lệnh dán vào Delta/executor',
      $('ghShipSnippet').value,
    );
    check(!!$('ghShipCopySnippet'), 'có nút chép dòng lệnh');
    check(
      globalThis.AIA_GH.buildRunCommand('https://x/y.lua') === 'loadstring(game:HttpGet("https://x/y.lua"))()',
      'buildRunCommand() tạo đúng cú pháp loadstring',
      globalThis.AIA_GH.buildRunCommand('https://x/y.lua'),
    );
    check(pages.has('tester/game-hub'), 'đã bật GitHub Pages cho dự án');
    check(calls.some((c) => c.method === 'POST' && c.url.endsWith('/user/repos')), 'tự tạo dự án trên GitHub');
    const repoFiles = [...files.keys()].filter((k) => k.startsWith('tester/game-hub/')).map((k) => k.split('/').slice(2).join('/'));
    check(repoFiles.length === 3, 'đẩy đủ 3 tệp', repoFiles.join(', '));
    check(repoFiles.includes('s/index.html'), 'có trang trắng index.html');
    check(files.get('tester/game-hub/s/index.html').includes('404: Not Found'), 'trang công khai hiện 404');
    check(!/aes_gcm|xin chào/.test(files.get('tester/game-hub/s/index.html')), 'trang công khai không lộ gì');
    const keyName = repoFiles.find((f) => /^s\/k-[0-9a-f]{8}\.txt$/.test(f));
    check(!!keyName, 'có tệp khoá k-<id>.txt', repoFiles.join(', '));
    check(Buffer.from(files.get('tester/game-hub/' + keyName), 'base64').length === 32, 'tệp khoá đúng 32 byte');
    const loaderName = repoFiles.find((f) => /^s\/l-[0-9a-f]{8}\.lua$/.test(f));
    const loaderText = files.get('tester/game-hub/' + loaderName);
    check(loaderText.includes('aes_gcm_decrypt'), 'loader giải mã trong game');
    check(!loaderText.includes('xin chào'), 'loader không chứa bản rõ');
    check(!loaderText.includes(files.get('tester/game-hub/' + keyName)), 'loader không chứa khoá');
    check(scriptLink.endsWith('/' + loaderName.split('/').pop()), 'link script trỏ đúng loader');

    check($('ghShipPublicLink').value === 'https://tester.github.io/game-hub/s/', 'hiện link công khai', $('ghShipPublicLink').value);
    check($('ghShipKeyLink').value.endsWith('/' + keyName.split('/').pop()), 'hiện link tệp khoá');
    check($('ghShipOut').hidden === false, 'hiện khung kết quả để sao chép');
    check($('ghShipSummary').textContent.includes('3 tệp'), 'ghi rõ số tệp đã đẩy', $('ghShipSummary').textContent);
    check($('edShipLink').value === scriptLink, 'link cũng hiện ngay trong tab Lập trình');
    check(/đã xuất bản/.test($('edShipStatus').textContent), 'tab Lập trình báo đã xuất bản', JSON.stringify($('edShipStatus').textContent));

    // đẩy lần 2: cập nhật, không tạo trùng
    const postsBefore = calls.filter((c) => c.method === 'POST' && c.url.endsWith('/user/repos')).length;
    $('ghShipGo').click();
    await waitFor(() => calls.filter((c) => c.method === 'PUT').length >= 6, 'xuất bản lần 2', 20000);
    const postsAfter = calls.filter((c) => c.method === 'POST' && c.url.endsWith('/user/repos')).length;
    check(postsAfter === postsBefore, 'lần 2 không tạo lại dự án');

    // tắt mã hoá: chỉ đẩy script gốc + trang 404
    $('ghShipEncrypt').checked = false;
    $('ghShipEncrypt').dispatchEvent(new window.Event('change'));
    $('ghShipRepo').value = 'plain-demo';
    repoExists = true;
    $('ghShipGo').click();
    await waitFor(
      () => [...files.keys()].some((k) => k.startsWith('tester/plain-demo/s/script-')),
      'xuất bản không mã hoá',
      20000,
    );
    const plainKey = [...files.keys()].find((k) => k.startsWith('tester/plain-demo/s/script-'));
    check(files.get(plainKey).includes('xin chào'), 'tắt mã hoá → đẩy nguyên code');
    check(![...files.keys()].some((k) => k.startsWith('tester/plain-demo/s/k-')), 'tắt mã hoá → không có tệp khoá');

    // thiếu token → báo lỗi rõ, không gọi mạng
    const before = calls.length;
    $('ghToken').value = '';
    $('ghShipGo').click();
    await waitFor(() => /API key/.test($('ghShipStatus').textContent), 'báo lỗi khi thiếu token', 8000);
    check(!$('ghPaneKey').hidden, 'tự mở tab API key');
    check(calls.length === before, 'không gọi GitHub khi thiếu token');
  } finally {
    globalThis.fetch = realFetch;
    $('ghToken').value = '';
    if (!$('ghModal').hidden) $('ghClose').click();
  }
}

/* ------------------------------------------------------------- 10. lỗi --- */

console.log('\n[10] Lỗi runtime');
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
