/* =============================================================================
 * AIA Secure Script — tab "Lập trình"
 * -----------------------------------------------------------------------------
 * Trình soạn thảo kiểu VSCode ở mức vừa đủ, chạy hoàn toàn trong trình duyệt:
 *   · số dòng (gutter) cuộn đồng bộ với ô code
 *   · phóng to / thu nhỏ (nút + Ctrl +/−/0), nhớ cỡ chữ
 *   · kích thước tệp B/KB/MB/GB + số dòng + ngôn ngữ
 *   · panel "tìm lỗi" (lỗi + cảnh báo), bấm là nhảy tới dòng
 *   · chia đôi màn hình: code | lỗi, hoặc chọn chỉ code / chỉ lỗi
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

const $ = (id) => document.getElementById(id);

const KEYS = {
  draft: 'aia.ed.draft',
  font: 'aia.ed.font',
  layout: 'aia.ed.layout',
};

const DRAFT_LIMIT = 2 * 1024 * 1024; // chỉ nhớ nháp ≤ 2 MiB
const AUTO_CHECK_DELAY = 420;

const state = {
  bridge: null,
  font: FONT_DEFAULT,
  timer: 0,
  lastReport: null,
  cloak: null, // { html, name, unlock }
  lang: '',
};

function toast(message, kind = 'info', ms) {
  if (state.bridge && typeof state.bridge.toast === 'function') state.bridge.toast(message, kind, ms);
}

function copy(text, message) {
  if (state.bridge && typeof state.bridge.copy === 'function') return state.bridge.copy(text, message);
  return Promise.resolve(false);
}

function safeStore(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* chế độ riêng tư / hết chỗ — bỏ qua */
  }
}

function safeLoad(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/* --------------------------------------------------------------- số dòng --- */

function renderGutter() {
  const ta = $('edCode');
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
  const ta = $('edCode');
  const nums = $('edNums');
  if (!ta || !nums) return;
  nums.style.transform = 'translateY(' + -ta.scrollTop + 'px)';
}

/* ------------------------------------------------------------ cỡ chữ / UI --- */

function applyFont(size, remember = true) {
  const ta = $('edCode');
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
  const ta = $('edCode');
  if (ta) ta.classList.toggle('wrap', !!on);
}

function toggleLines(on) {
  const gutter = $('edGutter');
  const shell = document.querySelector('.ed-shell');
  if (gutter) gutter.hidden = !on;
  if (shell) shell.classList.toggle('no-lines', !on);
  if (on) renderGutter();
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

function renderStats(report, quick = false) {
  const box = $('edStats');
  if (!box) return;
  const ta = $('edCode');
  const text = ta ? ta.value : '';
  const stats = (report && report.stats) || codeStats(text);
  // `quick` = cập nhật ngay khi gõ: không dò lại ngôn ngữ theo nội dung (đỡ tốn CPU)
  const lang = (report && report.lang) || state.lang || (quick ? C.detectLang($('edName').value) : detectEditorLang(text, $('edName').value));
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
  const ta = $('edCode');
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
  const lh = state.font * 1.55;
  ta.scrollTop = Math.max(0, (line - 1) * lh - ta.clientHeight / 3);
  syncScroll();
}

function check(manual = false) {
  const ta = $('edCode');
  if (!ta) return null;
  const text = ta.value;
  const lang = detectEditorLang(text, $('edName') ? $('edName').value : 'script.js');
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

/* ------------------------------------------------------------ tệp / tải --- */

function downloadText(name, text, mime) {
  const blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 800);
}

async function loadFile(file) {
  if (!file) return;
  if (file.size > 64 * 1024 * 1024) {
    toast('Tệp ' + formatSize(file.size) + ' quá lớn để mở trong trình soạn thảo (giới hạn 64 MB). Hãy dùng tab Mã hoá.', 'bad', 7000);
    return;
  }
  const text = typeof file.text === 'function' ? await file.text() : await new Response(file).text();
  const ta = $('edCode');
  ta.value = text;
  if ($('edName')) $('edName').value = file.name || 'script.js';
  resetCloak();
  renderGutter();
  scheduleCheck();
  persistDraft();
  toast('Đã nạp ' + (file.name || 'tệp') + ' (' + formatSize(file.size) + ').', 'ok');
}

function persistDraft() {
  const ta = $('edCode');
  if (!ta) return;
  if (ta.value.length > DRAFT_LIMIT) return;
  safeStore(KEYS.draft, ta.value);
  safeStore(KEYS.draft + '.name', $('edName') ? $('edName').value : 'script.js');
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
    const base = (($('edName') && $('edName').value) || 'script.js').replace(/\.(js|ts|jsx|tsx|lua|luau|py|txt|json)$/i, '');
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

function useInEncrypt() {
  const ta = $('edCode');
  if (!ta || !ta.value.trim()) {
    toast('Chưa có code để mã hoá.', 'warn');
    return;
  }
  const name = ($('edName') && $('edName').value) || 'script.js';
  if (state.bridge && typeof state.bridge.useSource === 'function') {
    state.bridge.useSource(ta.value, name);
  }
}

function openGithub() {
  const ta = $('edCode');
  const content = ta ? ta.value : '';
  const name = ($('edName') && $('edName').value) || 'script.js';
  if (state.bridge && typeof state.bridge.openGithub === 'function') {
    state.bridge.openGithub({ content, name });
  }
}

export function editorContent() {
  const ta = $('edCode');
  return {
    content: ta ? ta.value : '',
    name: ($('edName') && $('edName').value) || 'script.js',
  };
}

export function initProgram(bridge) {
  state.bridge = bridge;
  const ta = $('edCode');
  if (!ta) return null;

  // nháp + cỡ chữ + cách chia màn hình đã lưu
  const draft = safeLoad(KEYS.draft);
  if (draft) {
    ta.value = draft;
    const savedName = safeLoad(KEYS.draft + '.name');
    if (savedName && $('edName')) $('edName').value = savedName;
  }
  applyFont(Number(safeLoad(KEYS.font)) || FONT_DEFAULT, false);
  setLayout(safeLoad(KEYS.layout) || 'split');
  renderGutter();
  renderStats(null);

  ta.addEventListener('input', () => {
    renderGutter();
    renderStats(null, true);
    scheduleCheck();
    persistDraft();
  });
  ta.addEventListener('scroll', syncScroll);
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      ta.value = ta.value.slice(0, start) + '  ' + ta.value.slice(end);
      ta.setSelectionRange(start + 2, start + 2);
      renderGutter();
      scheduleCheck();
      persistDraft();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter')) {
      e.preventDefault();
      check(true);
    }
  });
  ta.addEventListener('paste', () => setTimeout(() => {
    renderGutter();
    renderStats(null, true);
    scheduleCheck();
    persistDraft();
  }, 30));

  if ($('edName')) {
    $('edName').addEventListener('input', () => {
      renderStats(state.lastReport);
      scheduleCheck();
      persistDraft();
    });
  }
  if ($('edLineToggle')) $('edLineToggle').addEventListener('change', (e) => toggleLines(e.target.checked));
  if ($('edWrapToggle')) $('edWrapToggle').addEventListener('change', (e) => toggleWrap(e.target.checked));
  if ($('edLayout')) $('edLayout').addEventListener('change', (e) => setLayout(e.target.value));

  if ($('edZoomIn')) $('edZoomIn').addEventListener('click', () => applyFont(state.font + 1));
  if ($('edZoomOut')) $('edZoomOut').addEventListener('click', () => applyFont(state.font - 1));
  if ($('edZoomReset')) $('edZoomReset').addEventListener('click', () => applyFont(FONT_DEFAULT));

  if ($('edCheckBtn')) $('edCheckBtn').addEventListener('click', () => check(true));
  if ($('edIssues')) {
    $('edIssues').addEventListener('click', (e) => {
      const card = e.target.closest('.issue');
      if (!card) return;
      jumpToLine(Number(card.dataset.line) || 0);
    });
  }
  if ($('edToEncrypt')) $('edToEncrypt').addEventListener('click', useInEncrypt);
  if ($('edToGithub')) $('edToGithub').addEventListener('click', openGithub);
  if ($('edCopy')) {
    $('edCopy').addEventListener('click', () => {
      if (!ta.value) return toast('Chưa có code để chép.', 'warn');
      copy(ta.value, 'Đã chép code.');
    });
  }
  if ($('edDownload')) {
    $('edDownload').addEventListener('click', () => {
      if (!ta.value) return toast('Chưa có code để tải.', 'warn');
      downloadText((($('edName') && $('edName').value) || 'script.js'), ta.value);
    });
  }
  if ($('edClear')) {
    $('edClear').addEventListener('click', () => {
      if (!ta.value) return;
      if (typeof confirm === 'function' && !confirm('Xoá toàn bộ code đang soạn?')) return;
      ta.value = '';
      resetCloak();
      renderGutter();
      renderStats(null);
      renderIssues(null);
      state.lastReport = null;
      persistDraft();
    });
  }
  if ($('edLoad')) $('edLoad').addEventListener('click', () => $('edFile') && $('edFile').click());
  if ($('edFile')) {
    $('edFile').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) loadFile(file);
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

  // Ctrl + / − / 0 chỉ khi đang ở tab Lập trình (không cướp phím của trang)
  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const view = $('view-editor');
    if (!view || !view.classList.contains('active')) return;
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

  const api = {
    getCode: () => ta.value,
    setCode: (text, name) => {
      ta.value = String(text == null ? '' : text);
      if (name && $('edName')) $('edName').value = name;
      renderGutter();
      check(false);
      persistDraft();
    },
    check,
    jumpToLine,
    setFont: applyFont,
    setLayout,
    makeCloak,
    content: editorContent,
    state,
  };
  globalThis.AIA_EDITOR = api;
  return api;
}
