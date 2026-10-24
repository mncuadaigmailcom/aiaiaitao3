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
  'assets/editor.js',
  'assets/ide.js',
  'assets/github.js',
  'assets/program.js',
  'assets/github-ui.js',
  'tests/run-editor.mjs',
  'tests/run-ide.mjs', 'tests/run-js.mjs',
  'tests/run-github.mjs',
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

const uiModules = ['assets/app.js', 'assets/program.js', 'assets/github-ui.js'];
const used = new Set();
for (const file of uiModules) {
  const text = file === 'assets/app.js' ? app : read(file);
  for (const m of text.matchAll(/\$\('([^']+)'\)/g)) used.add(m[1]);
  for (const m of text.matchAll(/document\.getElementById\('([^']+)'\)/g)) used.add(m[1]);
}
const missing = [...used].filter((id) => !htmlIds.includes(id));
check(missing.length === 0, `mọi id giao diện dùng đều tồn tại (${used.size} id)`, missing.join(', '));

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
for (const f of [
  'assets/core.js',
  'assets/app.js',
  'assets/reverse.js',
  'assets/editor.js',
  'assets/ide.js',
  'assets/github.js',
  'assets/program.js',
  'assets/github-ui.js',
  'tools/cli.mjs',
  'tests/run-node.mjs',
  'tests/run-editor.mjs',
  'tests/run-ide.mjs',
  'tests/run-github.mjs',
  'tools/check-static.mjs',
]) {
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


/* ------------------------------------------------------- 6. tính năng link --- */

console.log('\n[6] Mã hoá link & key script dùng chung');
const htmlText = read('index.html');
const coreText = read('assets/core.js');
const cliText = read('tools/cli.mjs');
const sharedKeyText = read('aia.key.js');
for (const id of ['view-link', 'linkInput', 'linkEncrypt', 'linkToken', 'linkSnippet', 'linkDecodeBtn', 'linkDecodeInput']) {
  check(htmlText.includes('id="' + id + '"'), 'index.html có #' + id);
}
for (const fn of ['export async function encryptLink', 'export async function decryptLink', 'export function buildLinkSnippet', 'export function normalizeLink']) {
  check(coreText.includes(fn), 'core.js có ' + fn.replace('export ', ''));
}
check(coreText.includes("'AIA-LINK1'"), 'token link dùng AAD riêng');
check(!/https?:\/\//.test(/export function buildLinkSnippet[\s\S]{0,1200}/.exec(coreText)[0]), 'snippet link không hard-code URL');
check(cliText.includes("case 'link'") && cliText.includes("case 'unlink'"), 'CLI có lệnh link/unlink');
check(sharedKeyText.includes('openLink'), 'aia.key.js phát hành kèm site có openLink');
check(/keyId:\s*"[0-9a-f]{16}"/.test(sharedKeyText), 'aia.key.js có keyId 16 hex');
check(htmlText.includes('data-view="link"'), 'thanh tab có mục Mã hoá link');


/* ------------------------------------------- 7. nhận diện ngôn ngữ (đuôi sai) --- */

console.log('\n[7] Nhận diện ngôn ngữ: ưu tiên đuôi, dò thêm nội dung');
for (const fn of ['export function sniffContentLang', 'export function resolveLang', 'LANG_SNIFF_BYTES']) {
  check(coreText.includes(fn), 'core.js có ' + fn.replace('export ', ''));
}
const appText = read('assets/app.js');
check(appText.includes('async function refineSourceLang'), 'app.js có refineSourceLang()');
check(appText.includes('src.readSample'), 'app.js đọc mẫu đầu tệp để dò nội dung');
check(appText.includes('canExecute(meta.file, code)'), 'app.js dùng canExecute() khi quyết định chạy');
check(appText.includes('function explainRuntimeError'), 'app.js có explainRuntimeError()');
check(/explainRuntimeError\(d\.message\)/.test(appText), 'lỗi từ Worker được giải thích');
check(/explainRuntimeError\(e && e\.message/.test(appText), 'lỗi worker.onerror được giải thích');
check(appText.includes('lang: src.lang || C.detectLang(src.name)'), 'header dùng ngôn ngữ đã dò');
check(coreText.includes('var RUNNABLE = '), 'run.html có cờ RUNNABLE');
check(coreText.includes('chỉ giải mã và cho'), 'run.html cảnh báo khi tệp không chạy được');
check(/isRunnableLang\(meta\.file\.lang\)/.test(coreText), 'snippet quyết định EXEC theo lang trong header');
const cliText2 = read('tools/cli.mjs');
check(cliText2.includes('readHeadText'), 'CLI đọc mẫu đầu tệp để dò ngôn ngữ');
check(cliText2.includes("args.lang || C.resolveLang"), 'CLI có --lang và tự dò nội dung');
check(read('index.html').includes('id="testRunBtn"'), 'index.html có nút chạy thử');

/* ------------------------------ 8. tab Lập trình + GitHub + chống soi --- */

console.log('\n[8] Tab Lập trình · chống soi · GitHub');
const editorText = read('assets/editor.js');
const programText = read('assets/program.js');
const ghText = read('assets/github.js');
const ghUiText = read('assets/github-ui.js');

check(htmlText.includes('data-view="editor"'), 'thanh tab có mục Lập trình');
check(htmlText.includes('id="view-editor"'), 'có khung #view-editor');
for (const id of ['edCode', 'edGutter', 'edNums', 'edStats', 'edIssues', 'edSplit', 'edErrorPane', 'edZoomIn', 'edZoomOut', 'edZoomReset', 'edLayout', 'edLineToggle', 'edWrapToggle', 'edCheckBtn', 'edToEncrypt', 'edToGithub', 'edName']) {
  check(htmlText.includes('id="' + id + '"'), 'index.html có #' + id);
}
for (const fn of ['export function analyzeCode', 'export function codeStats', 'export function checkBalance', 'export function countLuaBlocks', 'export function formatSize', 'export function clampFontSize', 'export function issueLabel']) {
  check(editorText.includes(fn), 'editor.js có ' + fn.replace('export ', ''));
}
check(editorText.includes('FONT_MAX = 28') && editorText.includes('FONT_MIN = 10'), 'giới hạn cỡ chữ 10–28px');
check(/ed-nums|edNums/.test(htmlText) && programText.includes('function renderGutter'), 'program.js vẽ số dòng');
check(programText.includes("translateY("), 'số dòng cuộn đồng bộ với code');
check(programText.includes("'keydown'") && programText.includes("e.key === '0'"), 'có phím tắt zoom Ctrl +/−/0');
check(programText.includes('mode-code') && programText.includes('mode-errors'), 'có chế độ chỉ code / chỉ lỗi');
check(programText.includes('AUTO_CHECK_DELAY') && programText.includes('scheduleCheck'), 'có tự kiểm tra sau khi gõ (debounce)');

// chống soi
check(coreText.includes('export function buildCloakPage'), 'core.js có buildCloakPage()');
check(programText.includes('C.buildCloakPage') && programText.includes('C.encryptLink'), 'program.js tạo trang trắng từ token link');
check(programText.includes('aia.key.js'), 'trang trắng trỏ tới key script');
check(programText.includes("'#k='"), 'link mở dùng #k=<khoá>');
check(coreText.includes('location.hash'), 'trang trắng đọc khoá từ hash');
check(/if \(!\$\{id\('p'\)\}\) return;/.test(coreText), 'không có khoá thì ở lại trắng, không gọi mạng');

// github
check(htmlText.includes('id="ghModal"') && htmlText.includes('data-gh="key"') && htmlText.includes('data-gh="new"') && htmlText.includes('data-gh="edit"') && htmlText.includes('data-gh="result"'), 'hộp thoại GitHub có 4 tab đúng thứ tự');
for (const id of ['ghToken', 'ghTest', 'ghRemember', 'ghNewName', 'ghCreate', 'ghRepoSelect', 'ghLoadFiles', 'ghFileSelect', 'ghSaveFile', 'ghAddFile', 'ghDeleteFile', 'ghPublish', 'ghResultLink']) {
  check(htmlText.includes('id="' + id + '"'), 'index.html có #' + id);
}
for (const fn of ['export class GithubClient', 'export function b64EncodeUtf8', 'export function validateRepoName', 'export function validatePath', 'export function parseRepoRef', 'export function explainStatus', 'export function saveToken', 'publishFile(']) {
  check(ghText.includes(fn), 'github.js có ' + fn.replace('export ', ''));
}
check(/Authorization/.test(ghText) && /Bearer/.test(ghText), 'gửi token qua header Authorization');
check(!/token\s*:\s*.*\?access_token/.test(ghText), 'không đặt token trong URL');
check(ghUiText.includes('initGithub') && ghUiText.includes('publish'), 'github-ui.js nối được nút đăng');
check(ghUiText.includes('ghModal'), 'github-ui.js điều khiển hộp thoại');
check(appText.includes('initProgram') && appText.includes('initGithub'), 'app.js khởi tạo 2 module mới');
check(appText.includes("useSource: async"), 'tab Lập trình chuyển code sang tab Mã hoá');

/* --------------------------- 9. Không gian làm việc (theo index.html.1.js) --- */

console.log('\n[9] Tab Lập trình nâng cao (nhiều tệp · tìm/thay · console · ô lưu)');
const ideText = read('assets/ide.js');
for (const id of ['edTabs', 'edNewFile', 'edFileCount', 'edFormatBtn', 'edRunBtn', 'edConsole', 'edConsoleOut', 'edFind', 'edFindInput', 'edReplaceInput', 'edFindCount', 'edReplaceAll', 'edTheme', 'edSaveProject', 'edSlotsModal', 'edSlotsList', 'edSlotName', 'edSlotSave', 'edZipBtn', 'edResetBtn', 'edSavedHint', 'edPreview', 'edSideTabs', 'edSidePreview', 'edSideErrors', 'edErrCount', 'edPreviewStatus', 'edPreviewHint', 'edAutoRun']) {
  check(htmlText.includes('id="' + id + '"'), 'index.html có #' + id);
}
for (const fn of ['export function createWorkspace', 'export function addFile', 'export function renameFile', 'export function removeFile', 'export function findMatches', 'export function replaceAllText', 'export function formatCode', 'export function makeSlot', 'export function upsertSlot', 'export function loadSlots', 'export function persistSlots']) {
  check(ideText.includes(fn), 'ide.js có ' + fn.replace('export ', ''));
}
check(ideText.includes('MAX_FILES = 12') && ideText.includes('MAX_SLOTS = 5'), 'giới hạn 12 tệp / 5 ô lưu');
check(programText.includes('IDE.createWorkspace') && programText.includes('IDE.findMatches'), 'program.js dùng lõi ide.js');
check(programText.includes("createZip(") || programText.includes('C.createZip'), 'có tải ZIP không gian làm việc');
check(programText.includes('C.buildPreviewDocument') && coreText.includes('export function buildPreviewDocument'), 'chạy thử bằng khung xem trước (buildPreviewDocument)');
check(!/buildWorkerSource/.test(programText), 'tab Lập trình không còn chạy qua Worker (đã chuyển sang iframe)');
check(/sandbox="allow-scripts allow-modals"/.test(htmlText), 'iframe xem trước có sandbox allow-scripts');
check(!/allow-same-origin/.test(htmlText), 'iframe xem trước KHÔNG cấp allow-same-origin');
check(/state\.previewToken/.test(programText) && /__aia/.test(coreText), 'lọc message xem trước bằng token riêng');
check(/forceJsFileName/.test(programText) && /export function forceJsFileName/.test(ideText), 'ép mọi tệp về JavaScript (.js/.mjs/.cjs)');
check(/isJsFileName/.test(programText), 'chặn nạp tệp không phải JavaScript');
check(/const JS_HINT = 'Tab Lập trình chỉ dành cho JavaScript/.test(programText), 'có lời nhắc chỉ dùng JavaScript');
check(/function currentLang\(\) \{\s*\n\s*\/\//.test(programText) && /return 'javascript';/.test(programText), 'ngôn ngữ luôn là JavaScript');
check(/data-side="preview"/.test(htmlText) && /data-side="errors"/.test(htmlText), 'tab phải có 2 chế độ Kết quả / Lỗi');
check(programText.includes('handlePreviewMessage'), 'có hàm nhận log/lỗi từ iframe');
check(/\[hidden\] \{ display: none !important; \}/.test(read('assets/style.css')), 'CSS: [hidden] thắng display:flex');
check(/AUTO_RUN_DELAY/.test(programText) && /scheduleAutoRun/.test(programText), 'có tự chạy sau khi ngừng gõ (như Code Space)');
check(programText.includes('AUTO_RUN_MAX_CHARS'), 'tự chạy có giới hạn kích thước để không lag');
check(programText.includes('CONSOLE_MAX_LINES'), 'console giới hạn số dòng');
check(programText.includes('aia.ide.workspace') || ideText.includes("WORKSPACE_KEY = 'aia.ide.workspace'"), 'tự lưu nháp vào localStorage');
check(/Ctrl\+F|'f'/.test(programText) && programText.includes('e.key === \'s\''), 'có phím tắt Ctrl+F / Ctrl+S');
check(/shiftKey[\s\S]{0,60}\(e\.key === 'F'/.test(programText) && /altKey/.test(programText), 'có Shift+Alt+F để định dạng');
check(ideText.includes('beautify'), 'định dạng dùng lại reverse.js');
for (const theme of ['dracula', 'monokai', 'light']) {
  check(read('assets/style.css').includes('theme-' + theme), 'có giao diện soạn thảo ' + theme);
}
check(!/<script[^>]+src=["']https?:/i.test(htmlText) && !/monaco\.editor|codemirror|cdn\.jsdelivr|cdnjs\.cloudflare/i.test(htmlText + ideText + programText), 'không phụ thuộc Monaco/CDN');
check(exists('docs/06-phan-tich-index.html.1.js.md'), 'có tài liệu phân tích file tham chiếu');

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
