/* =============================================================================
 * AIA Secure Script — tab "Lập trình"
 * -----------------------------------------------------------------------------
 * Trình soạn thảo kiểu VSCode/Code Space, chạy hoàn toàn trong trình duyệt,
 * không CDN, không quảng cáo:
 *   · nhiều tệp (tab) — thêm / đổi tên / xoá / chuyển, tự lưu nháp
 *   · số dòng (gutter) cuộn đồng bộ với ô code
 *   · phóng to / thu nhỏ (nút + Ctrl +/−/0), 4 giao diện màu
 *   · kích thước tệp B/KB/MB/GB + số dòng + ngôn ngữ
 *   · tìm & thay thế (Ctrl+F / Ctrl+H)
 *   · định dạng code (Shift+Alt+F)
 *   · panel "tìm lỗi" (lỗi + cảnh báo), bấm là nhảy tới dòng
 *   · chạy thử trong Web Worker + Console log
 *   · chia đôi màn hình: code | lỗi, hoặc chọn chỉ code / chỉ lỗi
 *   · 5 ô lưu dự án, tải ZIP không gian làm việc
 *   · mã hoá code, tạo trang trắng chống soi, đẩy lên GitHub
 * ========================================================================== */

import * as C from './core.js';
import {
  analyzeCode,
  codeStats,
  formatSize,
  langLabelOf,
  lineCount,
  FONT_DEFAULT,
  FONT_MAX,
  FONT_MIN,
} from './editor.js';
import * as IDE from './ide.js';

const $ = (id) => document.getElementById(id);

const KEYS = {
  font: 'aia.ed.font',
  layout: 'aia.ed.layout',
  theme: 'aia.ed.theme',
  draft: 'aia.ed.draft', // nháp kiểu cũ (1 tệp) — chỉ dùng để chuyển đổi
  draftName: 'aia.ed.draft.name',
};

const AUTO_CHECK_DELAY = 420;
const PERSIST_DELAY = 700;
const CONSOLE_MAX_LINES = 1500;
const THEMES = ['dark', 'dracula', 'monokai', 'light'];

const state = {
  bridge: null,
  font: FONT_DEFAULT,
  theme: 'dark',
  timer: 0,
  persistTimer: 0,
  lastReport: null,
  cloak: null, // { html, name, unlock }
  lang: '',
  ws: IDE.createWorkspace(),
  dirty: false,
  savedAt: 0,
  find: { matches: [], index: -1 },
  worker: null,
  runStartedAt: 0,
  consoleOpen: false,
};

/* ---------------------------------------------------------------- tiện ích --- */

function toast(message, kind = 'info', ms) {
  if (state.bridge && typeof state.bridge.toast === 'function') state.bridge.toast(message, kind, ms);
}

function copy(text, message) {
  if (state.bridge && typeof state.bridge.copy === 'function') return state.bridge.copy(text, message);
  return Promise.resolve(false);
}

/**
 * Lấy localStorage một cách an toàn.
 * Trình duyệt: `globalThis.localStorage`. Môi trường test (jsdom) chỉ có
 * `window.localStorage`, nên phải thử cả hai và chịu được chế độ riêng tư.
 */
function storageOrNull() {
  const candidates = [];
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) candidates.push(globalThis.localStorage);
  } catch {
    /* bị chặn */
  }
  try {
    if (typeof window !== 'undefined' && window.localStorage) candidates.push(window.localStorage);
  } catch {
    /* bị chặn */
  }
  for (const store of candidates) {
    try {
      if (typeof store.getItem === 'function') return store;
    } catch {
      /* bị chặn */
    }
  }
  return null;
}

function safeStore(key, value) {
  try {
    const store = storageOrNull();
    if (store) store.setItem(key, value);
  } catch {
    /* chế độ riêng tư / hết chỗ — bỏ qua */
  }
}

function safeLoad(key) {
  try {
    const store = storageOrNull();
    return store ? store.getItem(key) : null;
  } catch {
    return null;
  }
}

function ask(message) {
  if (typeof confirm === 'function') return confirm(message);
  return true;
}

function askText(message, fallback) {
  if (typeof prompt === 'function') {
    const value = prompt(message, fallback);
    return value == null ? null : value;
  }
  return null;
}

function downloadBlob(name, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try {
      URL.revokeObjectURL(a.href);
    } catch {
      /* ignore */
    }
    a.remove();
  }, 800);
}

function downloadText(name, text, mime) {
  downloadBlob(name, new Blob([text], { type: mime || 'text/plain;charset=utf-8' }));
}

/* ------------------------------------------------------ không gian làm việc --- */

function editor() {
  return $('edCode');
}

function active() {
  return IDE.activeFile(state.ws);
}

function commitActive() {
  const ta = editor();
  if (!ta) return;
  const file = active();
  if (file.content !== ta.value) file.content = ta.value;
}

function loadActiveToEditor() {
  const ta = editor();
  if (!ta) return;
  const file = active();
  ta.value = file.content;
  ta.scrollTop = 0;
  if ($('edName')) $('edName').value = file.name;
  renderGutter();
  renderStats(null, true);
  check(false);
  syncScroll();
}

const bytesCache = new WeakMap();

/** Số byte UTF-8 của tệp, có nhớ đệm để không phải mã hoá lại mỗi lần gõ. */
function bytesOf(file) {
  const content = String((file && file.content) || '');
  const cached = bytesCache.get(file);
  if (cached && cached.content === content) return cached.bytes;
  const bytes = new TextEncoder().encode(content).length;
  bytesCache.set(file, { content, bytes });
  return bytes;
}

function fileSizeText(file) {
  const bytes = typeof file === 'object' && file ? bytesOf(file) : new TextEncoder().encode(String(file || '')).length;
  return formatSize(bytes);
}

function renderTabs() {
  const bar = $('edTabs');
  if (!bar) return;
  bar.innerHTML = '';
  state.ws.files.forEach((file, index) => {
    const tab = document.createElement('div');
    tab.className = 'ed-tab' + (index === state.ws.active ? ' active' : '');
    tab.dataset.index = String(index);
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', index === state.ws.active ? 'true' : 'false');
    tab.title = file.name + ' · ' + fileSizeText(file) + '\nBấm đúp để đổi tên';

    const name = document.createElement('span');
    name.className = 'ed-tab-name';
    name.textContent = file.name;

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'ed-tab-x';
    close.dataset.close = String(index);
    close.setAttribute('aria-label', 'Đóng ' + file.name);
    close.textContent = '×';

    tab.appendChild(name);
    tab.appendChild(close);
    bar.appendChild(tab);
  });
  if ($('edFileCount')) {
    const total = state.ws.files.reduce((sum, f) => sum + bytesOf(f), 0);
    $('edFileCount').textContent = state.ws.files.length + ' tệp · ' + formatSize(total);
  }
}

function switchTo(index) {
  if (!editor()) return;
  commitActive();
  IDE.setActive(state.ws, index);
  loadActiveToEditor();
  renderTabs();
  persistSoon();
}

function addNewFile(name, content = '') {
  commitActive();
  const index = IDE.addFile(state.ws, { name: name || IDE.nextFileName(state.ws.files), content });
  if (index < 0) {
    toast('Chỉ mở tối đa ' + IDE.MAX_FILES + ' tệp. Hãy đóng bớt.', 'warn');
    return -1;
  }
  loadActiveToEditor();
  renderTabs();
  persistSoon();
  toast('Đã thêm tệp ' + active().name, 'ok');
  return index;
}

function closeFile(index) {
  commitActive();
  const file = state.ws.files[index];
  if (!file) return;
  if (state.ws.files.length === 1 && file.content.trim()) {
    if (!ask('Tệp cuối cùng đang có code. Xoá trắng tệp này?')) return;
  }
  IDE.removeFile(state.ws, index);
  loadActiveToEditor();
  renderTabs();
  persistSoon();
  resetCloak();
}

function renameActive(name) {
  commitActive();
  const next = IDE.renameFile(state.ws, state.ws.active, name);
  if ($('edName') && next) $('edName').value = next;
  renderTabs();
  check(false);
  persistSoon();
  return next;
}

function resetWorkspace() {
  if (!ask('Xoá toàn bộ tệp đang soạn và bắt đầu lại?')) return;
  stopWorker();
  state.ws = IDE.createWorkspace();
  state.ws.files[0].content = '';
  state.lastReport = null;
  state.cloak = null;
  loadActiveToEditor();
  renderTabs();
  resetCloak();
  safeStore(IDE.WORKSPACE_KEY, '');
  persistSoon();
  toast('Đã làm mới không gian làm việc.', 'ok');
}

function persistNow() {
  commitActive();
  const storage = storageOrNull();
  if (!storage) return false;
  const res = IDE.storeWorkspace(storage, state.ws);
  if (res.ok) {
    state.dirty = false;
    state.savedAt = Date.now();
    renderSaveHint();
    return true;
  }
  if (res.reason === 'too-big') {
    if ($('edSavedHint')) $('edSavedHint').textContent = 'không tự lưu (quá lớn) — nhớ tải ZIP';
  }
  return false;
}

function persistSoon() {
  commitActive();
  state.dirty = true;
  renderSaveHint();
  clearTimeout(state.persistTimer);
  state.persistTimer = setTimeout(persistNow, PERSIST_DELAY);
}

function renderSaveHint() {
  const el = $('edSavedHint');
  if (!el) return;
  if (state.dirty) {
    el.textContent = 'chưa lưu…';
    el.style.color = 'var(--warn)';
    return;
  }
  if (!state.savedAt) {
    el.textContent = 'tự lưu trong trình duyệt';
    el.style.color = '';
    return;
  }
  const d = new Date(state.savedAt);
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  el.textContent = 'đã lưu · ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  el.style.color = 'var(--ok)';
}

/* --------------------------------------------------------------- số dòng --- */

function renderGutter() {
  const ta = editor();
  const nums = $('edNums');
  if (!ta || !nums) return;
  const total = lineCount(ta.value);
  const out = new Array(total);
  for (let i = 1; i <= total; i++) out[i - 1] = i;
  nums.textContent = out.join('\n');
  nums.style.minWidth = Math.max(24, String(total).length * 9 + 12) + 'px';
  syncScroll();
}

function syncScroll() {
  const ta = editor();
  const nums = $('edNums');
  if (!ta || !nums) return;
  nums.style.transform = 'translateY(' + -ta.scrollTop + 'px)';
}

/* ------------------------------------------------------------ cỡ chữ / UI --- */

function applyFont(size, remember = true) {
  const ta = editor();
  const gutter = $('edGutter');
  const label = $('edZoomLabel');
  if (!ta) return state.font;
  state.font = Math.min(FONT_MAX, Math.max(FONT_MIN, Number(size) || FONT_DEFAULT));
  const px = state.font + 'px';
  ta.style.fontSize = px;
  if (gutter) {
    gutter.style.fontSize = px;
    gutter.style.lineHeight = '1.55';
  }
  if (label) label.textContent = Math.round((state.font / FONT_DEFAULT) * 100) + '%';
  if (remember) safeStore(KEYS.font, String(state.font));
  renderGutter();
  renderStats(state.lastReport);
  return state.font;
}

function setLayout(mode) {
  const split = $('edSplit');
  const select = $('edLayout');
  if (!split) return;
  const m = mode === 'code' || mode === 'errors' ? mode : 'split';
  split.classList.toggle('mode-code', m === 'code');
  split.classList.toggle('mode-errors', m === 'errors');
  if (select && select.value !== m) select.value = m;
  safeStore(KEYS.layout, m);
}

function toggleWrap(on) {
  const ta = editor();
  if (ta) ta.classList.toggle('wrap', !!on);
}

function toggleLines(on) {
  const gutter = $('edGutter');
  const shell = document.querySelector('.ed-shell');
  if (gutter) gutter.hidden = !on;
  if (shell) shell.classList.toggle('no-lines', !on);
  if (on) renderGutter();
}

function setTheme(name) {
  const theme = THEMES.includes(name) ? name : 'dark';
  state.theme = theme;
  const shell = document.querySelector('.ed-shell');
  if (shell) {
    for (const t of THEMES) shell.classList.toggle('theme-' + t, t === theme);
  }
  const select = $('edTheme');
  if (select && select.value !== theme) select.value = theme;
  safeStore(KEYS.theme, theme);
  return theme;
}

/* ------------------------------------------------------------- thống kê --- */

function detectEditorLang(text, name) {
  const file = String(name || 'script.js');
  const byName = C.detectLang(file);
  try {
    return C.resolveLang(file, text) || byName;
  } catch {
    return byName;
  }
}

function currentLang() {
  const ta = editor();
  return detectEditorLang(ta ? ta.value : '', active().name);
}

function renderStats(report, quick = false) {
  const box = $('edStats');
  if (!box) return;
  const ta = editor();
  const text = ta ? ta.value : '';
  const stats = (report && report.stats) || codeStats(text);
  // `quick` = cập nhật ngay khi gõ: không dò lại ngôn ngữ theo nội dung (đỡ tốn CPU)
  const lang = (report && report.lang) || state.lang || (quick ? C.detectLang(active().name) : detectEditorLang(text, active().name));
  const big = stats.bytes >= 1024 ? formatSize(stats.bytes) : stats.bytes + ' B';
  box.innerHTML = '';
  const rows = [
    ['Kích thước', big],
    ['Số dòng', String(stats.lines)],
    ['Ngôn ngữ', langLabelOf(lang)],
    ['Ký tự', String(stats.chars)],
    ['Cỡ chữ', state.font + 'px'],
  ];
  for (const [label, value] of rows) {
    const span = document.createElement('span');
    span.className = 'badge';
    span.dataset.stat = label;
    span.textContent = label + ': ' + value;
    box.appendChild(span);
  }
}

/* --------------------------------------------------------------- lỗi code --- */

function issueEl(issue, kind) {
  const el = document.createElement('div');
  el.className = 'issue ' + (kind === 'error' ? 'err' : 'warn');
  el.dataset.line = issue.line == null ? '' : String(issue.line);
  el.dataset.kind = kind;

  const where = document.createElement('span');
  where.className = 'where';
  where.textContent =
    (kind === 'error' ? 'LỖI' : 'CẢNH BÁO') +
    ' · ' +
    (issue.line ? 'dòng ' + issue.line + (issue.col ? ':' + issue.col : '') : 'toàn tệp');

  const msg = document.createElement('span');
  msg.className = 'msg';
  msg.textContent = issue.message;

  el.appendChild(where);
  el.appendChild(msg);
  return el;
}

function renderIssues(report) {
  const box = $('edIssues');
  const summary = $('edSummary');
  if (!box) return;
  box.innerHTML = '';
  if (!report) {
    box.innerHTML = '<p class="help">Bấm <b>Kiểm tra</b> để dò lỗi cú pháp, ngoặc lệch, chuỗi chưa đóng…</p>';
    if (summary) summary.textContent = 'chưa kiểm tra';
    return;
  }
  const errs = report.errors || [];
  const warns = report.warnings || [];
  const shown = errs.concat(warns);
  if (summary) {
    summary.textContent = errs.length + ' lỗi · ' + warns.length + ' cảnh báo';
    summary.style.color = errs.length ? 'var(--bad)' : warns.length ? 'var(--warn)' : 'var(--ok)';
  }
  if (!shown.length) {
    const ok = document.createElement('p');
    ok.className = 'help';
    ok.dataset.ok = '1';
    ok.textContent = 'Không thấy lỗi. Code trông ổn để chạy.';
    ok.style.color = 'var(--ok)';
    box.appendChild(ok);
  }
  for (const e of errs) box.appendChild(issueEl(e, 'error'));
  for (const w of warns) box.appendChild(issueEl(w, 'warning'));
  for (const n of report.notes || []) {
    const p = document.createElement('p');
    p.className = 'help';
    p.textContent = 'Ghi chú: ' + n;
    box.appendChild(p);
  }
}

function jumpToLine(line) {
  const ta = editor();
  if (!ta) return;
  if (!line) {
    ta.focus();
    ta.setSelectionRange(0, 0);
    ta.scrollTop = 0;
    return;
  }
  const lines = ta.value.split('\n');
  let start = 0;
  for (let i = 0; i < line - 1 && i < lines.length; i++) start += lines[i].length + 1;
  const end = start + (lines[line - 1] ? lines[line - 1].length : 0);
  ta.focus();
  ta.setSelectionRange(start, end);
  scrollToOffset(start);
  syncScroll();
}

function scrollToOffset(offset) {
  const ta = editor();
  if (!ta) return;
  const before = ta.value.slice(0, offset);
  const line = before.split('\n').length;
  const lh = state.font * 1.55;
  ta.scrollTop = Math.max(0, (line - 1) * lh - ta.clientHeight / 3);
}

function check(manual = false) {
  const ta = editor();
  if (!ta) return null;
  const text = ta.value;
  const lang = detectEditorLang(text, active().name);
  let report;
  try {
    report = analyzeCode(text, { lang });
  } catch (err) {
    report = {
      ok: false,
      lang,
      errors: [{ line: null, col: null, kind: 'crash', message: 'Không phân tích được: ' + (err && err.message) }],
      warnings: [],
      notes: [],
      stats: codeStats(text),
    };
  }
  state.lastReport = report;
  state.lang = report.lang || state.lang;
  renderIssues(report);
  renderStats(report);
  if (manual) {
    toast(
      report.ok
        ? 'Không thấy lỗi — ' + (report.warnings.length ? report.warnings.length + ' cảnh báo' : 'code sạch')
        : 'Có ' + report.errors.length + ' lỗi cần sửa.',
      report.ok ? 'ok' : 'bad',
    );
  }
  return report;
}

function scheduleCheck() {
  clearTimeout(state.timer);
  state.timer = setTimeout(() => check(false), AUTO_CHECK_DELAY);
}

/* ------------------------------------------------------ tìm / thay thế --- */

function findOpen(open, focusReplace) {
  const bar = $('edFind');
  if (!bar) return;
  bar.hidden = !open;
  if (open) {
    refreshFind();
    const target = focusReplace ? $('edReplaceInput') : $('edFindInput');
    if (target && typeof target.focus === 'function') target.focus();
    if (target && typeof target.select === 'function') target.select();
  } else {
    state.find = { matches: [], index: -1 };
    if (editor()) editor().focus();
  }
}

function refreshFind() {
  const ta = editor();
  const input = $('edFindInput');
  const count = $('edFindCount');
  if (!ta || !input) return [];
  const matches = IDE.findMatches(ta.value, input.value, { caseSensitive: !!($('edFindCase') && $('edFindCase').checked) });
  state.find.matches = matches;
  if (state.find.index >= matches.length) state.find.index = -1;
  if (count) count.textContent = (state.find.index >= 0 ? state.find.index + 1 : 0) + '/' + matches.length;
  return matches;
}

function selectMatch(matches, index) {
  const ta = editor();
  if (!ta || !matches.length) return null;
  const i = ((index % matches.length) + matches.length) % matches.length;
  state.find.index = i;
  const m = matches[i];
  ta.setSelectionRange(m.start, m.end);
  scrollToOffset(m.start);
  syncScroll();
  const count = $('edFindCount');
  if (count) count.textContent = i + 1 + '/' + matches.length;
  return m;
}

function findStep(dir) {
  const ta = editor();
  if (!ta) return null;
  const matches = refreshFind();
  if (!matches.length) {
    toast('Không tìm thấy.', 'warn');
    return null;
  }
  let index;
  if (state.find.index < 0) {
    index = dir > 0 ? IDE.findNextIndex(matches, ta.selectionStart) : IDE.findPrevIndex(matches, ta.selectionStart);
  } else {
    index = state.find.index + dir;
  }
  return selectMatch(matches, index);
}

function replaceOne() {
  const ta = editor();
  const find = $('edFindInput');
  const rep = $('edReplaceInput');
  if (!ta || !find) return 0;
  const query = find.value;
  if (!query) return 0;
  const caseSensitive = !!($('edFindCase') && $('edFindCase').checked);
  const selected = ta.value.slice(ta.selectionStart, ta.selectionEnd);
  const same = caseSensitive ? selected === query : selected.toLowerCase() === query.toLowerCase();
  const replacement = rep ? rep.value : '';
  if (same) {
    const start = ta.selectionStart;
    ta.value = ta.value.slice(0, start) + replacement + ta.value.slice(ta.selectionEnd);
    ta.setSelectionRange(start + replacement.length, start + replacement.length);
    afterProgrammaticEdit();
    refreshFind();
    findStep(1);
    return 1;
  }
  findStep(1);
  return 0;
}

function replaceAll() {
  const ta = editor();
  const find = $('edFindInput');
  const rep = $('edReplaceInput');
  if (!ta || !find) return 0;
  const query = find.value;
  if (!query) return 0;
  const res = IDE.replaceAllText(ta.value, query, rep ? rep.value : '', {
    caseSensitive: !!($('edFindCase') && $('edFindCase').checked),
  });
  if (!res.count) {
    toast('Không tìm thấy "' + query + '".', 'warn');
    return 0;
  }
  ta.value = res.text;
  afterProgrammaticEdit();
  refreshFind();
  toast('Đã thay ' + res.count + ' chỗ.', 'ok');
  return res.count;
}

/** Sau khi sửa textarea bằng code (không phải người gõ) → cập nhật mọi thứ. */
function afterProgrammaticEdit() {
  renderGutter();
  renderStats(null, true);
  commitActive();
  renderTabs();
  scheduleCheck();
  persistSoon();
}

/* ------------------------------------------------------------- định dạng --- */

function formatActive() {
  const ta = editor();
  if (!ta) return null;
  if (!ta.value.trim()) {
    toast('Chưa có code để định dạng.', 'warn');
    return null;
  }
  const lang = currentLang();
  const res = IDE.formatCode(ta.value, { lang });
  if (!res.ok) {
    toast(res.message || 'Không định dạng được.', 'warn', 6000);
    return res;
  }
  if (res.code === ta.value) {
    toast('Code đã đúng định dạng.', 'ok');
    return res;
  }
  const before = ta.selectionStart;
  ta.value = res.code;
  ta.setSelectionRange(Math.min(before, res.code.length), Math.min(before, res.code.length));
  afterProgrammaticEdit();
  toast('Đã định dạng (' + langLabelOf(res.lang) + ').', 'ok');
  return res;
}

/* ------------------------------------------------------- chạy thử + log --- */

function explainRunError(message) {
  const msg = String(message == null ? '' : message);
  if (/Unexpected token|Unexpected identifier|SyntaxError|Invalid or unexpected token/i.test(msg)) {
    return msg + ' — đây là lỗi CÚ PHÁP của code, không phải lỗi của trình soạn thảo.';
  }
  if (/is not defined|undefined is not|Cannot read/i.test(msg)) {
    return msg + ' — kiểm tra tên biến/hàm đã khai báo chưa.';
  }
  return msg;
}

function consoleOpen(open) {
  const panel = $('edConsole');
  if (!panel) return;
  state.consoleOpen = !!open;
  panel.hidden = !open;
  if ($('edConsoleToggle')) $('edConsoleToggle').classList.toggle('active', !!open);
}

function consoleLine(level, text) {
  const out = $('edConsoleOut');
  if (!out) return;
  const line = document.createElement('div');
  line.className = 'ed-log ' + (level || 'log');
  line.textContent = (level === 'error' ? '✖ ' : level === 'warn' ? '⚠ ' : level === 'sys' ? '· ' : '> ') + text;
  out.appendChild(line);
  while (out.childElementCount > CONSOLE_MAX_LINES) out.removeChild(out.firstChild);
  out.scrollTop = out.scrollHeight;
}

function consoleClear() {
  const out = $('edConsoleOut');
  if (out) out.textContent = '';
}

function stopWorker() {
  if (state.worker) {
    try {
      state.worker.worker.terminate();
    } catch {
      /* ignore */
    }
    try {
      URL.revokeObjectURL(state.worker.url);
    } catch {
      /* ignore */
    }
    state.worker = null;
  }
}

function setRunStatus(text, kind) {
  const el = $('edConsoleStatus');
  if (!el) return;
  el.textContent = text;
  el.style.color = kind === 'bad' ? 'var(--bad)' : kind === 'ok' ? 'var(--ok)' : '';
}

function runActive() {
  const ta = editor();
  if (!ta) return { ok: false, reason: 'no-editor' };
  const code = ta.value;
  const lang = currentLang();
  consoleOpen(true);
  if (!code.trim()) {
    consoleLine('warn', 'Chưa có code để chạy.');
    setRunStatus('trống', 'bad');
    return { ok: false, reason: 'empty' };
  }
  if (!C.isRunnableLang(lang)) {
    const msg = 'Tệp này là ' + langLabelOf(lang) + ' — trình duyệt chỉ chạy được JavaScript/TypeScript.';
    consoleLine('warn', msg);
    consoleLine('sys', 'Code vẫn mã hoá được bình thường. Hãy dùng “Tải tệp” để chạy bằng công cụ phù hợp.');
    setRunStatus('không chạy được ' + langLabelOf(lang), 'bad');
    toast(msg, 'warn', 6000);
    return { ok: false, reason: 'lang', lang };
  }
  if (typeof Worker !== 'function' || typeof Blob !== 'function') {
    consoleLine('error', 'Trình duyệt không hỗ trợ Web Worker.');
    setRunStatus('không hỗ trợ Worker', 'bad');
    return { ok: false, reason: 'no-worker' };
  }

  stopWorker();
  consoleClear();
  consoleLine('sys', 'chạy ' + active().name + ' (' + formatSize(new TextEncoder().encode(code).length) + ')…');
  setRunStatus('đang chạy…');
  let url = '';
  try {
    const blob = new Blob([C.buildWorkerSource(code)], { type: 'text/javascript' });
    url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    state.worker = { worker, url };
    state.runStartedAt = (globalThis.performance && performance.now()) || Date.now();
    worker.onmessage = (ev) => {
      const d = ev.data || {};
      if (d.type === 'log') consoleLine(d.level === 'warn' ? 'warn' : d.level === 'error' ? 'error' : 'log', (d.args || []).join(' '));
      else if (d.type === 'error') consoleLine('error', explainRunError(d.message));
      else if (d.type === 'done') {
        const ms = ((globalThis.performance && performance.now()) || Date.now()) - state.runStartedAt;
        consoleLine('sys', 'chạy xong · ' + C.formatDuration(ms));
        setRunStatus('xong · ' + C.formatDuration(ms), 'ok');
        stopWorker();
      }
    };
    worker.onerror = (e) => {
      consoleLine('error', explainRunError(e && e.message ? e.message : 'lỗi không rõ'));
      setRunStatus('lỗi', 'bad');
      stopWorker();
    };
  } catch (err) {
    consoleLine('error', explainRunError(err && err.message));
    setRunStatus('lỗi', 'bad');
    return { ok: false, reason: 'throw', message: err && err.message };
  }
  return { ok: true, lang };
}

/* ------------------------------------------------------------- ô lưu dự án --- */

function slotsStorage() {
  return storageOrNull();
}

function currentSlots() {
  return IDE.loadSlots(slotsStorage());
}

function renderSlots() {
  const box = $('edSlotsList');
  if (!box) return;
  const slots = currentSlots();
  if ($('edSlotCount')) $('edSlotCount').textContent = slots.length + '/' + IDE.MAX_SLOTS;
  box.innerHTML = '';
  if (!slots.length) {
    const p = document.createElement('p');
    p.className = 'help';
    p.textContent = 'Chưa có bản lưu nào. Đặt tên rồi bấm “Lưu bản mới”.';
    box.appendChild(p);
    return;
  }
  for (const slot of slots) {
    const info = IDE.describeSlot(slot);
    const row = document.createElement('div');
    row.className = 'slot';
    row.dataset.id = slot.id;

    const head = document.createElement('div');
    head.className = 'slot-head';
    const title = document.createElement('b');
    title.textContent = slot.name;
    const meta = document.createElement('span');
    meta.className = 'help';
    const d = new Date(info.at);
    const pad = (n) => (n < 10 ? '0' + n : '' + n);
    meta.textContent =
      info.fileCount + ' tệp · ' + formatSize(info.bytes) + ' · ' +
      (info.at ? pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) : '');
    head.appendChild(title);
    head.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'row tight';
    const mk = (label, action, cls) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = (cls || 'ghost') + ' small';
      b.dataset.action = action;
      b.dataset.id = slot.id;
      b.textContent = label;
      actions.appendChild(b);
    };
    mk('Mở', 'load');
    mk('Ghi đè', 'overwrite');
    mk('Đổi tên', 'rename');
    mk('ZIP', 'zip');
    mk('Xoá', 'delete', 'ghost danger');

    row.appendChild(head);
    row.appendChild(actions);
    box.appendChild(row);
  }
}

function openSlots(open = true) {
  const modal = $('edSlotsModal');
  if (!modal) return;
  modal.hidden = !open;
  if (!open) return;
  renderSlots();
  if ($('edSlotName') && !$('edSlotName').value) {
    $('edSlotName').value = 'Bản lưu ' + (currentSlots().length + 1);
  }
  if ($('edSlotStatus')) $('edSlotStatus').textContent = '—';
}

function saveNewSlot(name) {
  commitActive();
  const slot = IDE.makeSlot({
    name: name || ($('edSlotName') && $('edSlotName').value) || 'Bản lưu',
    files: state.ws.files,
    active: state.ws.active,
  });
  const res = IDE.upsertSlot(currentSlots(), slot);
  if (!res.ok) {
    const msg = res.reason === 'full' ? 'Đã đủ ' + IDE.MAX_SLOTS + ' ô lưu — xoá bớt rồi thử lại.' : 'Bản lưu quá lớn.';
    if ($('edSlotStatus')) $('edSlotStatus').textContent = msg;
    toast(msg, 'bad', 6000);
    return null;
  }
  const written = IDE.persistSlots(slotsStorage(), res.slots);
  if (!written.ok) {
    const msg = 'Không ghi được vào bộ nhớ trình duyệt (có thể đã đầy).';
    if ($('edSlotStatus')) $('edSlotStatus').textContent = msg;
    toast(msg, 'bad', 7000);
    return null;
  }
  renderSlots();
  if ($('edSlotStatus')) $('edSlotStatus').textContent = 'Đã lưu “' + slot.name + '”.';
  toast('Đã lưu dự án “' + slot.name + '”.', 'ok');
  return slot;
}

function loadSlotById(id) {
  const slot = IDE.findSlot(currentSlots(), id);
  if (!slot) return null;
  commitActive();
  state.ws = IDE.createWorkspace(slot.files);
  state.ws.active = Math.min(slot.active || 0, state.ws.files.length - 1);
  loadActiveToEditor();
  renderTabs();
  persistNow();
  openSlots(false);
  toast('Đã mở “' + slot.name + '”.', 'ok');
  return slot;
}

function overwriteSlot(id) {
  const slots = currentSlots();
  const old = IDE.findSlot(slots, id);
  if (!old) return null;
  commitActive();
  const next = IDE.makeSlot({ id: old.id, name: old.name, files: state.ws.files, active: state.ws.active });
  const res = IDE.upsertSlot(slots, next);
  if (!res.ok) {
    toast('Không ghi đè được (quá lớn).', 'bad');
    return null;
  }
  IDE.persistSlots(slotsStorage(), res.slots);
  renderSlots();
  if ($('edSlotStatus')) $('edSlotStatus').textContent = 'Đã ghi đè “' + old.name + '”.';
  toast('Đã ghi đè “' + old.name + '”.', 'ok');
  return next;
}

function renameSlotById(id, name) {
  const slots = currentSlots();
  const old = IDE.findSlot(slots, id);
  if (!old) return null;
  const nextName = name == null ? askText('Tên mới cho bản lưu:', old.name) : name;
  if (nextName == null) return null;
  const res = IDE.renameSlot(slots, id, nextName);
  IDE.persistSlots(slotsStorage(), res);
  renderSlots();
  return IDE.findSlot(res, id);
}

function deleteSlotById(id) {
  const slots = currentSlots();
  const old = IDE.findSlot(slots, id);
  if (!old) return null;
  if (!ask('Xoá bản lưu “' + old.name + '”?')) return null;
  const next = IDE.removeSlot(slots, id);
  IDE.persistSlots(slotsStorage(), next);
  renderSlots();
  toast('Đã xoá bản lưu.', 'ok');
  return next;
}

function zipBlob(files, nameHint) {
  const bytes = C.createZip(files.map((f) => ({ name: f.name, data: f.content })));
  return { blob: new Blob([bytes], { type: 'application/zip' }), name: (nameHint || 'aia-workspace') + '.zip' };
}

function downloadWorkspaceZip() {
  commitActive();
  const { blob, name } = zipBlob(state.ws.files, 'aia-workspace');
  downloadBlob(name, blob);
  toast('Đã tải ' + name, 'ok');
}

function downloadSlotZip(id) {
  const slot = IDE.findSlot(currentSlots(), id);
  if (!slot) return null;
  const { blob, name } = zipBlob(slot.files, slot.name.replace(/[^\w.-]+/g, '-'));
  downloadBlob(name, blob);
  return name;
}

/* ------------------------------------------------------------ tệp / tải --- */

async function loadFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return 0;
  let added = 0;
  for (const file of files) {
    if (file.size > 64 * 1024 * 1024) {
      toast('Tệp ' + file.name + ' quá lớn (giới hạn 64 MB).', 'bad', 6000);
      continue;
    }
    const text = typeof file.text === 'function' ? await file.text() : await new Response(file).text();
    commitActive();
    const index = IDE.addFile(state.ws, { name: file.name || 'script.js', content: text });
    if (index < 0) {
      toast('Chỉ mở tối đa ' + IDE.MAX_FILES + ' tệp.', 'warn');
      break;
    }
    added++;
  }
  if (added) {
    loadActiveToEditor();
    renderTabs();
    persistNow();
    toast('Đã nạp ' + added + ' tệp.', 'ok');
  }
  return added;
}

/* ------------------------------------------------------- trang trắng ---- */

function resetCloak() {
  state.cloak = null;
  if ($('cloakOut')) $('cloakOut').hidden = true;
  if ($('cloakDownload')) $('cloakDownload').hidden = true;
}

function randomPass(len = 12) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const buf = C.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[buf[i] % alphabet.length];
  return out;
}

async function makeCloak() {
  const status = $('cloakStatus');
  const url = ($('cloakLink').value || '').trim();
  if (!url) {
    if (status) status.textContent = 'Hãy nhập link thật cần giấu.';
    toast('Chưa có link thật cần giấu.', 'warn');
    return null;
  }
  const master = globalThis.AIA_KEY && globalThis.AIA_KEY.masterKey;
  if (!master) {
    toast('Chưa nạp được aia.key.js (khoá dùng chung) — không tạo được trang trắng.', 'bad', 8000);
    return null;
  }
  const typed = ($('cloakPass').value || '').trim();
  const pass = typed || randomPass(12);
  if (status) status.textContent = 'đang mã hoá…';
  try {
    const keyUrl = new URL('aia.key.js', location.href).href;
    const result = await C.encryptLink(url, {
      keyUrl,
      sharedKey: master,
      passphrase: pass,
      iterations: C.DEFAULT_ITERATIONS,
    });
    const html = C.buildCloakPage({ token: result.token, keyUrl });
    const base = (active().name || 'script.js').replace(/\.(js|ts|jsx|tsx|lua|luau|py|txt|json|css|html?)$/i, '');
    const name = (base || 'script') + '-trang-trang.html';
    // Link mở: chính tệp đó + #k=<khoá>. Không có khoá thì trang ở lại trắng.
    const unlock = name + '#k=' + encodeURIComponent(pass);
    state.cloak = { html, name, unlock, pass, auto: !typed, token: result.token };
    if ($('cloakOut')) $('cloakOut').hidden = false;
    if ($('cloakUnlock')) $('cloakUnlock').value = unlock;
    if ($('cloakDownload')) $('cloakDownload').hidden = false;
    if ($('cloakPreview')) $('cloakPreview').textContent = html.slice(0, 400) + '\n… (' + formatSize(html.length) + ')';
    if (status) {
      status.textContent =
        'Đã tạo ' + name + ' · ' + formatSize(html.length) + '. Tải tệp, đặt cùng thư mục aia.key.js, rồi gửi link mở cho người cần xem.' +
        (typed ? '' : ' Khoá mở tự sinh: ' + pass + ' (hãy lưu lại).');
    }
    toast('Đã tạo trang trắng — nhớ tải tệp .html.', 'ok', 6000);
    downloadText(name, html, 'text/html;charset=utf-8');
    return state.cloak;
  } catch (err) {
    if (status) status.textContent = 'Không tạo được: ' + ((err && err.message) || 'lỗi không rõ');
    toast('Không tạo được trang trắng: ' + ((err && err.message) || ''), 'bad', 7000);
    return null;
  }
}

/* ------------------------------------------------------------ nối nút ---- */

function syncNameFromInput() {
  const input = $('edName');
  if (!input) return active().name;
  const typed = String(input.value || '').trim();
  if (typed && typed !== active().name) IDE.renameFile(state.ws, state.ws.active, typed);
  const now = active().name;
  if (input.value !== now) input.value = now;
  return now;
}

function useInEncrypt() {
  const ta = editor();
  if (!ta || !ta.value.trim()) {
    toast('Chưa có code để mã hoá.', 'warn');
    return;
  }
  syncNameFromInput();
  commitActive();
  if (state.bridge && typeof state.bridge.useSource === 'function') {
    state.bridge.useSource(ta.value, active().name);
  }
}

function openGithub() {
  const ta = editor();
  syncNameFromInput();
  commitActive();
  if (state.bridge && typeof state.bridge.openGithub === 'function') {
    state.bridge.openGithub({ content: ta ? ta.value : '', name: active().name });
  }
}

export function editorContent() {
  const ta = editor();
  syncNameFromInput();
  return { content: ta ? ta.value : '', name: active().name };
}

/* ------------------------------------------------------------ khởi động --- */

function bootWorkspace() {
  const storage = storageOrNull();
  const saved = IDE.loadWorkspace(storage);
  if (saved) return saved;
  // chuyển đổi từ bản cũ (chỉ 1 tệp, lưu ở aia.ed.draft)
  const draft = safeLoad(KEYS.draft);
  if (draft) {
    const ws = IDE.createWorkspace([{ name: safeLoad(KEYS.draftName) || 'script.js', content: draft }]);
    return ws;
  }
  return IDE.createWorkspace();
}

export function initProgram(bridge) {
  state.bridge = bridge;
  const ta = editor();
  if (!ta) return null;

  state.ws = bootWorkspace();
  state.ws.active = Math.min(Math.max(0, state.ws.active), state.ws.files.length - 1);

  applyFont(Number(safeLoad(KEYS.font)) || FONT_DEFAULT, false);
  setTheme(safeLoad(KEYS.theme) || 'dark');
  setLayout(safeLoad(KEYS.layout) || 'split');
  ta.value = active().content;
  if ($('edName')) $('edName').value = active().name;
  renderTabs();
  renderGutter();
  renderStats(null);
  check(false);
  renderSaveHint();

  /* ---------------------------------------------------------- soạn thảo --- */

  ta.addEventListener('input', () => {
    renderGutter();
    renderStats(null, true);
    scheduleCheck();
    commitActive();
    renderTabs();
    persistSoon();
    if ($('edFind') && !$('edFind').hidden) refreshFind();
  });
  ta.addEventListener('scroll', syncScroll);
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      ta.value = ta.value.slice(0, start) + '  ' + ta.value.slice(end);
      ta.setSelectionRange(start + 2, start + 2);
      afterProgrammaticEdit();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      check(true);
    }
  });
  ta.addEventListener('paste', () => setTimeout(() => {
    renderGutter();
    renderStats(null, true);
    afterProgrammaticEdit();
  }, 30));

  /* --------------------------------------------------------------- tệp --- */

  if ($('edTabs')) {
    $('edTabs').addEventListener('click', (e) => {
      const close = e.target.closest('[data-close]');
      if (close) {
        e.stopPropagation();
        closeFile(Number(close.dataset.close));
        return;
      }
      const tab = e.target.closest('.ed-tab');
      if (tab) switchTo(Number(tab.dataset.index));
    });
    $('edTabs').addEventListener('dblclick', (e) => {
      const tab = e.target.closest('.ed-tab');
      if (!tab) return;
      const index = Number(tab.dataset.index);
      const name = askText('Tên tệp mới:', state.ws.files[index].name);
      if (name == null) return;
      if (index === state.ws.active) renameActive(name);
      else {
        commitActive();
        IDE.renameFile(state.ws, index, name);
        renderTabs();
        persistSoon();
      }
    });
  }
  if ($('edNewFile')) {
    $('edNewFile').addEventListener('click', () => {
      const name = askText('Tên tệp mới:', IDE.nextFileName(state.ws.files));
      if (name == null) return;
      addNewFile(name);
    });
  }
  if ($('edName')) {
    $('edName').addEventListener('change', () => renameActive($('edName').value));
    $('edName').addEventListener('input', () => {
      // đổi tên ngay khi gõ (không kiểm tra lại code, chỉ cập nhật tab + ngôn ngữ)
      IDE.renameFile(state.ws, state.ws.active, $('edName').value);
      renderTabs();
      renderStats(null, true);
      scheduleCheck();
      persistSoon();
    });
  }

  /* ------------------------------------------------------------- công cụ --- */

  if ($('edLineToggle')) $('edLineToggle').addEventListener('change', (e) => toggleLines(e.target.checked));
  if ($('edWrapToggle')) $('edWrapToggle').addEventListener('change', (e) => toggleWrap(e.target.checked));
  if ($('edLayout')) $('edLayout').addEventListener('change', (e) => setLayout(e.target.value));
  if ($('edTheme')) $('edTheme').addEventListener('change', (e) => setTheme(e.target.value));

  if ($('edZoomIn')) $('edZoomIn').addEventListener('click', () => applyFont(state.font + 1));
  if ($('edZoomOut')) $('edZoomOut').addEventListener('click', () => applyFont(state.font - 1));
  if ($('edZoomReset')) $('edZoomReset').addEventListener('click', () => applyFont(FONT_DEFAULT));

  if ($('edCheckBtn')) $('edCheckBtn').addEventListener('click', () => check(true));
  if ($('edFormatBtn')) $('edFormatBtn').addEventListener('click', () => formatActive());
  if ($('edRunBtn')) $('edRunBtn').addEventListener('click', () => runActive());
  if ($('edStopBtn')) $('edStopBtn').addEventListener('click', () => {
    stopWorker();
    consoleLine('sys', 'đã dừng.');
    setRunStatus('đã dừng', 'bad');
  });
  if ($('edConsoleToggle')) {
    $('edConsoleToggle').addEventListener('click', () => consoleOpen(!state.consoleOpen));
  }
  if ($('edConsoleClose')) $('edConsoleClose').addEventListener('click', () => consoleOpen(false));
  if ($('edConsoleClear')) $('edConsoleClear').addEventListener('click', () => consoleClear());
  if ($('edRunAgain')) $('edRunAgain').addEventListener('click', () => runActive());

  if ($('edIssues')) {
    $('edIssues').addEventListener('click', (e) => {
      const card = e.target.closest('.issue');
      if (!card) return;
      jumpToLine(Number(card.dataset.line) || 0);
    });
  }

  /* --------------------------------------------------------- tìm / thay --- */

  if ($('edFindToggle')) $('edFindToggle').addEventListener('click', () => findOpen(!!($('edFind') && $('edFind').hidden)));
  if ($('edFindClose')) $('edFindClose').addEventListener('click', () => findOpen(false));
  if ($('edFindNext')) $('edFindNext').addEventListener('click', () => findStep(1));
  if ($('edFindPrev')) $('edFindPrev').addEventListener('click', () => findStep(-1));
  if ($('edReplaceOne')) $('edReplaceOne').addEventListener('click', () => replaceOne());
  if ($('edReplaceAll')) $('edReplaceAll').addEventListener('click', () => {
    replaceAll();
    persistNow();
  });
  if ($('edFindInput')) {
    $('edFindInput').addEventListener('input', () => {
      state.find.index = -1;
      refreshFind();
    });
    $('edFindInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        findStep(e.shiftKey ? -1 : 1);
      } else if (e.key === 'Escape') {
        findOpen(false);
      }
    });
  }
  if ($('edReplaceInput')) {
    $('edReplaceInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        replaceOne();
      } else if (e.key === 'Escape') {
        findOpen(false);
      }
    });
  }
  if ($('edFindCase')) $('edFindCase').addEventListener('change', () => refreshFind());

  /* --------------------------------------------------------------- ô lưu --- */

  if ($('edSaveProject')) $('edSaveProject').addEventListener('click', () => openSlots(true));
  if ($('edSlotsClose')) $('edSlotsClose').addEventListener('click', () => openSlots(false));
  if ($('edSlotsModal')) {
    $('edSlotsModal').addEventListener('click', (e) => {
      if (e.target === $('edSlotsModal')) openSlots(false);
    });
  }
  if ($('edSlotSave')) {
    $('edSlotSave').addEventListener('click', () => saveNewSlot($('edSlotName') ? $('edSlotName').value : ''));
  }
  if ($('edSlotsList')) {
    $('edSlotsList').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      if (action === 'load') loadSlotById(id);
      else if (action === 'overwrite') overwriteSlot(id);
      else if (action === 'rename') renameSlotById(id);
      else if (action === 'delete') deleteSlotById(id);
      else if (action === 'zip') downloadSlotZip(id);
    });
  }
  if ($('edZipBtn')) $('edZipBtn').addEventListener('click', () => downloadWorkspaceZip());
  if ($('edResetBtn')) $('edResetBtn').addEventListener('click', () => resetWorkspace());

  /* -------------------------------------------------------- mã hoá / GH --- */

  if ($('edToEncrypt')) $('edToEncrypt').addEventListener('click', useInEncrypt);
  if ($('edToGithub')) $('edToGithub').addEventListener('click', openGithub);
  if ($('edCopy')) {
    $('edCopy').addEventListener('click', () => {
      const value = editor() ? editor().value : '';
      if (!value) return toast('Chưa có code để chép.', 'warn');
      copy(value, 'Đã chép code.');
    });
  }
  if ($('edDownload')) {
    $('edDownload').addEventListener('click', () => {
      const value = editor() ? editor().value : '';
      if (!value) return toast('Chưa có code để tải.', 'warn');
      downloadText(syncNameFromInput(), value);
    });
  }
  if ($('edClear')) {
    $('edClear').addEventListener('click', () => {
      const taNow = editor();
      if (!taNow || !taNow.value) return;
      if (!ask('Xoá toàn bộ code của tệp “' + active().name + '”?')) return;
      taNow.value = '';
      resetCloak();
      afterProgrammaticEdit();
      renderIssues(null);
      state.lastReport = null;
      persistNow();
    });
  }
  if ($('edLoad')) $('edLoad').addEventListener('click', () => $('edFile') && $('edFile').click());
  if ($('edFile')) {
    $('edFile').addEventListener('change', async (e) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      if (files.length) await loadFiles(files);
      e.target.value = '';
    });
  }

  if ($('cloakMake')) $('cloakMake').addEventListener('click', () => makeCloak());
  if ($('cloakDownload')) {
    $('cloakDownload').addEventListener('click', () => {
      if (!state.cloak) return toast('Chưa có trang trắng.', 'warn');
      downloadText(state.cloak.name, state.cloak.html, 'text/html;charset=utf-8');
    });
  }
  if ($('cloakCopy')) {
    $('cloakCopy').addEventListener('click', () => {
      if (!state.cloak) return toast('Chưa có link mở.', 'warn');
      copy(state.cloak.unlock, 'Đã chép link mở.');
    });
  }

  /* ----------------------------------------------------------- phím tắt --- */

  document.addEventListener('keydown', (e) => {
    const view = $('view-editor');
    if (!view || !view.classList.contains('active')) return;

    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      findOpen(true, false);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'h' || e.key === 'H')) {
      e.preventDefault();
      findOpen(true, true);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      const ok = persistNow();
      toast(ok ? 'Đã lưu nháp trong trình duyệt.' : 'Không lưu được (bộ nhớ đầy?) — hãy tải ZIP.', ok ? 'ok' : 'warn');
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.shiftKey && e.key === 'Enter') {
      e.preventDefault();
      runActive();
      return;
    }
    if (e.shiftKey && e.altKey && (e.key === 'F' || e.key === 'f')) {
      e.preventDefault();
      formatActive();
      return;
    }
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      applyFont(state.font + 1);
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      applyFont(state.font - 1);
    } else if (e.key === '0') {
      e.preventDefault();
      applyFont(FONT_DEFAULT);
    }
  });

  // giữ gutter khớp khi đổi kích thước cửa sổ
  if (typeof ResizeObserver === 'function') {
    try {
      new ResizeObserver(() => syncScroll()).observe(ta);
    } catch {
      /* bỏ qua */
    }
  }
  window.addEventListener('resize', syncScroll);
  window.addEventListener('beforeunload', () => {
    try {
      commitActive();
      if (state.dirty) persistNow();
    } catch {
      /* ignore */
    }
  });

  /* --------------------------------------------------------------- API --- */

  const api = {
    getCode: () => (editor() ? editor().value : ''),
    setCode: (text, name) => {
      const taNow = editor();
      if (!taNow) return;
      taNow.value = String(text == null ? '' : text);
      commitActive();
      if (name) renameActive(name);
      else if ($('edName')) $('edName').value = active().name;
      afterProgrammaticEdit();
      check(false);
      persistNow();
    },
    check,
    jumpToLine,
    setFont: applyFont,
    setLayout,
    setTheme,
    makeCloak,
    content: editorContent,
    // không gian làm việc
    files: () => state.ws.files.map((f) => ({ ...f })),
    workspace: () => ({ files: state.ws.files.map((f) => ({ ...f })), active: state.ws.active }),
    addFile: (name, content) => addNewFile(name, content),
    closeFile,
    switchTo,
    renameActive,
    resetWorkspace,
    activeIndex: () => state.ws.active,
    activeName: () => active().name,
    // công cụ
    format: formatActive,
    run: runActive,
    stop: stopWorker,
    consoleOpen,
    consoleClear,
    consoleLines: () => (($('edConsoleOut') && $('edConsoleOut').textContent) || '').split('\n').filter(Boolean),
    saveWorkspace: persistNow,
    downloadZip: downloadWorkspaceZip,
    // tìm / thay
    find: (query, opts) => IDE.findMatches(editor() ? editor().value : '', query, opts),
    openFind: (focusReplace) => findOpen(true, !!focusReplace),
    replaceAll,
    // ô lưu
    slots: () => currentSlots(),
    saveSlot: (name) => saveNewSlot(name),
    loadSlot: (id) => loadSlotById(id),
    deleteSlot: (id) => deleteSlotById(id),
    renameSlot: (id, name) => renameSlotById(id, name),
    openSlots,
    state,
    IDE,
  };
  globalThis.AIA_EDITOR = api;
  return api;
}
