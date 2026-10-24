/* =============================================================================
 * AIA Secure Script — Giao diện
 * Không có backend. Mọi thứ chạy trong trình duyệt của người dùng.
 * ========================================================================== */

import * as C from './core.js';
import { applyReverseAction, detectLanguage } from './reverse.js';
import { initProgram } from './program.js';
import { initGithub } from './github-ui.js';

const $ = (id) => document.getElementById(id);
const BIG_MEMORY_LIMIT = 256 * 1024 * 1024; // trên mức này, ghi thẳng ra tệp nếu trình duyệt cho phép
const PREVIEW_LIMIT = 32 * 1024 * 1024; // giới hạn để "chạy thử ngay" trong RAM

const state = {
  source: null, // { name, size, type, bytes|null, openStream() }
  cancelled: false,
  busy: false,
  artifacts: new Map(),
  encCodeText: '',
  encCodeFull: false,
  encSnippet: '',
  lastCodeExtra: null, // name -> {name, size, data (Uint8Array|string)|handle}
  lastCipher: null, // { bytes, meta, options }
  decrypted: null, // { bytes, meta }
  worker: null,
  runStartedAt: 0,
  link: null, // { token, snippet, url, header }
};

/* ---------------------------------------------------------------- tiện ích --- */

function toast(message, kind = 'info', ms = 3800) {
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 240);
  }, ms);
}

function setBusy(flag) {
  state.busy = flag;
  $('encryptBtn').disabled = flag;
  $('cancelBtn').hidden = !flag;
  $('resetBtn').disabled = flag;
}

/* --------------------------------------------------- khoá dùng chung ------ */

const SHARED_KEY_FILE = 'aia.key.js';
const SHARED_KEY_URL = './' + SHARED_KEY_FILE;
// Snippet "chép là chạy" phình ~1,33 lần vì Base64 ⇒ chỉ sinh cho tệp vừa phải.
const SNIPPET_MAX_BYTES = 1536 * 1024;

function absoluteUrl(relative) {
  try {
    return new URL(relative, window.location.href).href;
  } catch {
    return relative;
  }
}

function passMode() {
  return ($('passMode') && $('passMode').value) || 'none';
}

function effectivePassphrase() {
  const mode = passMode();
  const typed = $('pass').value;
  if (mode === 'none') return '';
  return typed;
}

function syncPassModeUi() {
  const mode = passMode();
  const note = $('passModeHelp');
  const pass = $('pass');
  pass.disabled = mode === 'none';
  pass.style.opacity = mode === 'none' ? '0.55' : '';
  if (note) {
    note.textContent =
      mode === 'none'
        ? 'Đang KHÔNG dùng mật khẩu: ai có đoạn code đã mã hoá cũng mở/chạy được. Chỉ nên dùng khi chỉ cần che cho gọn mắt.'
        : mode === 'embed'
          ? 'Mật khẩu được nhúng sẵn vào code: người nhận không phải nhập, nhưng ai đọc code cũng thấy mật khẩu.'
          : 'Người nhận phải nhập mật khẩu khi chạy. An toàn hơn hai kiểu trên.';
  }
}

function sharedMasterKey() {
  return (globalThis.AIA_KEY && globalThis.AIA_KEY.masterKey) || null;
}

function isSharedMode() {
  return ($('keyMode') && $('keyMode').value) === 'shared';
}

function syncKeyModeUi() {
  const shared = isSharedMode();
  const input = $('keyUrl');
  if (shared) {
    input.value = SHARED_KEY_URL;
    input.readOnly = true;
    input.title = 'Chế độ dùng chung: link luôn là ./aia.key.js (cùng một link cho mọi lần mã hoá)';
  } else {
    input.readOnly = false;
    input.title = '';
    if (input.value === SHARED_KEY_URL) input.value = './key.js';
  }
  if ($('requireKeyChk')) {
    $('requireKeyChk').checked = true;
    $('requireKeyChk').disabled = shared;
  }
}

function humanPercent(a, b) {
  if (!b) return '0%';
  return Math.min(100, Math.round((a / b) * 100)) + '%';
}

function speedText(bytes, seconds) {
  if (!seconds || seconds <= 0) return '—';
  return C.formatBytes(bytes / seconds) + '/s';
}

/** Phần trăm có ý nghĩa: 0,0026% thay vì 0.003, 3348% thay vì 3348.000%. */
function percentText(pct) {
  if (!Number.isFinite(pct)) return '—';
  if (pct === 0) return '0%';
  if (pct < 0.01) return pct.toPrecision(2).replace('.', ',') + '%';
  if (pct < 1) return pct.toFixed(3).replace('.', ',') + '%';
  if (pct < 100) return pct.toFixed(2).replace('.', ',') + '%';
  return Math.round(pct).toLocaleString('vi-VN') + '%';
}

function etaText(done, total, seconds) {
  if (!done || !seconds) return '—';
  const rate = done / seconds;
  if (!rate) return '—';
  return C.formatDuration(((total - done) / rate) * 1000);
}

function bytesOf(value) {
  return typeof value === 'string' ? new TextEncoder().encode(value) : value;
}

function downloadArtifact(name, data) {
  const blob = new Blob([bytesOf(data)], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 8000);
}

async function readAllBytes(stream) {
  const reader = stream.getReader();
  const parts = [];
  let total = 0;
  while (true) {
    const r = await reader.read();
    if (r.done) break;
    parts.push(r.value);
    total += r.value.length;
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const part of parts) {
    out.set(part, off);
    off += part.length;
  }
  return out;
}

async function concatChunks(chunks) {
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

/* ------------------------------------------------------------------- tabs --- */

const views = document.querySelectorAll('.view');
const tabButtons = document.querySelectorAll('.tabs button');

function showView(name) {
  views.forEach((v) => v.classList.toggle('active', v.id === 'view-' + name));
  tabButtons.forEach((b) => {
    const on = b.dataset.view === name;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  if (name !== 'decrypt') stopWorker();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

tabButtons.forEach((b) => b.addEventListener('click', () => showView(b.dataset.view)));

$('helpBtn').addEventListener('click', () => ($('helpModal').hidden = false));
$('helpClose').addEventListener('click', () => ($('helpModal').hidden = true));
$('helpModal').addEventListener('click', (e) => {
  if (e.target === $('helpModal')) $('helpModal').hidden = true;
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') $('helpModal').hidden = true;
});

/* ----------------------------------------------------------- chọn dữ liệu --- */

const drop = $('drop');

drop.addEventListener('click', () => $('fileInput').click());
drop.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    $('fileInput').click();
  }
});
['dragenter', 'dragover'].forEach((ev) =>
  drop.addEventListener(ev, (e) => {
    e.preventDefault();
    drop.classList.add('over');
  }),
);
['dragleave', 'drop'].forEach((ev) =>
  drop.addEventListener(ev, (e) => {
    e.preventDefault();
    drop.classList.remove('over');
  }),
);
drop.addEventListener('drop', (e) => {
  const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) setSourceFromFile(file);
});
$('fileInput').addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (file) setSourceFromFile(file);
});

let keyUrlTouched = false;
$('keyUrl').addEventListener('input', () => {
  keyUrlTouched = true;
});

$('pasteBtn').addEventListener('click', () => {
  $('pasteBox').hidden = !$('pasteBox').hidden;
  if (!$('pasteBox').hidden) $('pasteText').focus();
});
$('pasteCancel').addEventListener('click', () => ($('pasteBox').hidden = true));

// Dán / gõ là tự động mã hoá: không cần bấm "Dùng nội dung này" nữa.
let pasteTimer = 0;
let lastAutoText = '';

function autoEncryptFromPaste(delay) {
  clearTimeout(pasteTimer);
  pasteTimer = setTimeout(() => {
    const text = $('pasteText').value;
    if (!text.trim()) {
      $('pasteStatus').textContent = '';
      return;
    }
    if (text === lastAutoText) return;
    lastAutoText = text;
    $('pasteStatus').textContent = 'đang tự mã hoá…';
    setSourceFromText(text, { silent: true });
  }, delay);
}

$('pasteText').addEventListener('paste', () => autoEncryptFromPaste(60));
$('pasteText').addEventListener('input', () => autoEncryptFromPaste(800));
['drop', 'dragover'].forEach((ev) =>
  $('pasteText').addEventListener(ev, (e) => {
    e.preventDefault();
    const text = e.dataTransfer && e.dataTransfer.getData('text');
    if (text) {
      $('pasteText').value = text;
      autoEncryptFromPaste(40);
    }
  }),
);

async function setSourceFromFile(file, opts = {}) {
  state.lastCipher = null;
  if (file.size > C.MAX_INPUT_BYTES) {
    toast(`Tệp ${C.formatBytes(file.size)} vượt quá giới hạn 5 GiB.`, 'bad', 6000);
    return;
  }
  state.source = {
    name: file.name || 'script.js',
    size: file.size,
    type: file.type || '',
    bytes: null,
    openStream: () => file.stream(),
    // đọc mẫu đầu tệp để dò ngôn ngữ THẬT (nhiều người đặt .js cho tệp Lua)
    readSample: async (n) => {
      const blob = file.slice(0, n);
      if (typeof blob.text === 'function') return await blob.text();
      const buf = await blob.arrayBuffer();
      return new TextDecoder().decode(new Uint8Array(buf));
    },
  };
  maybeSuggestKeyUrl();
  updateSourceInfo();
  resetResult();
  await refineSourceLang();
  if (opts.auto !== false) startEncryption({ auto: true });
}

async function setSourceFromText(text, opts = {}) {
  state.lastCipher = null;
  const bytes = new TextEncoder().encode(text);
  state.source = {
    name: opts.name || 'script.js',
    size: bytes.length,
    type: 'text/javascript',
    bytes,
    textSample: text,
    openStream: () =>
      new ReadableStream({
        start(c) {
          c.enqueue(bytes);
          c.close();
        },
      }),
  };
  maybeSuggestKeyUrl();
  updateSourceInfo();
  resetResult();
  await refineSourceLang();
  if (!opts.silent) toast('Đã nạp code từ ô dán.', 'ok');
  // Dán là tự mã hoá — không cần bấm thêm bước nào.
  if (opts.auto !== false) startEncryption({ auto: true });
}

/**
 * Dò ngôn ngữ thật của nguồn (theo NỘI DUNG, không chỉ theo đuôi tệp).
 * Nhờ vậy tệp `script.js` nhưng nội dung là Lua/Luau sẽ không bị đưa vào
 * Web Worker rồi nổ `SyntaxError: Unexpected identifier`.
 */
async function refineSourceLang() {
  const src = state.source;
  if (!src) return;
  let sample = '';
  try {
    if (typeof src.textSample === 'string') sample = src.textSample.slice(0, C.LANG_SNIFF_BYTES);
    else if (src.bytes) sample = new TextDecoder().decode(src.bytes.subarray(0, C.LANG_SNIFF_BYTES));
    else if (typeof src.readSample === 'function') sample = (await src.readSample(C.LANG_SNIFF_BYTES)) || '';
  } catch {
    sample = '';
  }
  const byName = C.detectLang(src.name);
  const lang = C.resolveLang(src.name, sample);
  src.nameLang = byName;
  src.lang = lang;
  src.langMismatch = lang !== byName;
  updateSourceInfo();
  if (src.langMismatch && !src.mismatchNotified) {
    src.mismatchNotified = true;
    toast(
      `Tệp "${src.name}" có đuôi là ${langLabel(byName)} nhưng nội dung là ${langLabel(lang)} — ` +
        'trang vẫn mã hoá bình thường, nhưng KHÔNG chạy thử trong trình duyệt (chỉ tải bản rõ).',
      'warn',
      9000,
    );
  }
}

function langLabel(lang) {
  return ({
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    lua: 'Lua/Luau',
    luau: 'Lua/Luau',
    python: 'Python',
    text: 'văn bản',
  })[lang] || lang;
}

function maybeSuggestKeyUrl() {
  if (keyUrlTouched || !state.source) return;
  $('keyUrl').value = './' + C.slugify(state.source.name) + '.key.js';
}

function updateSourceInfo() {
  const s = state.source;
  if (!s) {
    $('fileInfo').textContent = 'chưa chọn tệp';
    $('fileInfo').classList.remove('warn');
    $('fileInfo').title = '';
    return;
  }
  const lang = s.lang || C.detectLang(s.name);
  const badge = s.langMismatch
    ? ` · <b>${langLabel(lang)}</b> <span class="warn">(đuôi tệp là ${langLabel(s.nameLang || C.detectLang(s.name))})</span>`
    : ` · ${lang}`;
  $('fileInfo').innerHTML = `<b>${escapeHtml(s.name)}</b> · ${C.formatBytes(s.size)}${badge}`;
  $('fileInfo').classList.toggle('warn', !!s.langMismatch);
  $('fileInfo').title = s.langMismatch
    ? 'Đuôi tệp không khớp nội dung: trang vẫn mã hoá bình thường nhưng không chạy thử trong trình duyệt (chỉ tải bản rõ).'
    : '';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

if ($('keyMode')) {
  $('keyMode').addEventListener('change', () => {
    syncKeyModeUi();
    if (state.source && !state.busy) startEncryption({ auto: true });
  });
  syncKeyModeUi();
}

if ($('passMode')) {
  $('passMode').addEventListener('change', () => {
    syncPassModeUi();
    if (state.source && !state.busy) startEncryption({ auto: true });
  });
  syncPassModeUi();
}

$('resetBtn').addEventListener('click', () => {
  state.source = null;
  state.lastCipher = null;
  keyUrlTouched = false;
  $('keyUrl').value = './key.js';
  $('fileInput').value = '';
  $('pasteText').value = '';
  updateSourceInfo();
  resetResult();
});

/* ------------------------------------------------------------- mật khẩu --- */

$('togglePass').addEventListener('click', () => {
  const input = $('pass');
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  $('togglePass').textContent = show ? 'ẩn' : 'hiện';
});

$('genPass').addEventListener('click', () => {
  const bytes = C.randomBytes(15);
  const pass = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  $('pass').type = 'text';
  $('togglePass').textContent = 'ẩn';
  $('pass').value = pass;
  updateStrength();
  autoReencryptOnPass();
  toast('Đã tạo mật khẩu mạnh — hãy lưu lại ở nơi an toàn.', 'ok', 6000);
});

function scorePassword(p) {
  if (!p) return { score: 0, label: 'chưa đặt' };
  let sets = 0;
  if (/[a-z]/.test(p)) sets++;
  if (/[A-Z]/.test(p)) sets++;
  if (/[0-9]/.test(p)) sets++;
  if (/[^A-Za-z0-9]/.test(p)) sets++;
  const lenScore = Math.min(1, p.length / 20);
  const raw = (sets / 4) * 0.6 + lenScore * 0.4;
  const score = Math.round(raw * 100);
  const label = score < 35 ? 'yếu' : score < 60 ? 'trung bình' : score < 80 ? 'khá' : 'mạnh';
  return { score, label };
}

function updateStrength() {
  const { score, label } = scorePassword($('pass').value);
  const bar = $('passBar');
  bar.style.width = score + '%';
  bar.style.background = score < 35 ? '#fb7185' : score < 60 ? '#fbbf24' : score < 80 ? '#38bdf8' : '#34d399';
  $('passLabel').textContent = $('pass').value ? `${label} · ${$('pass').value.length} ký tự` : 'chưa đặt';
}
let passTimer = 0;
function autoReencryptOnPass() {
  if (!state.source || state.busy || passMode() === 'none') return;
  clearTimeout(passTimer);
  passTimer = setTimeout(() => startEncryption({ auto: true }), 900);
}

$('pass').addEventListener('input', () => {
  updateStrength();
  autoReencryptOnPass();
});

/* ---------------------------------------------------------------- sink --- */

function memorySink() {
  const chunks = [];
  return {
    kind: 'memory',
    chunks,
    write: async (b) => {
      chunks.push(b.slice());
    },
    close: async () => {},
    toBytes: () => concatChunks(chunks),
  };
}

async function fileSink(suggestedName) {
  if (typeof window.showSaveFilePicker !== 'function') return null;
  const handle = await window.showSaveFilePicker({
    suggestedName,
    types: [{ description: 'Tệp mã hoá AIA', accept: { 'application/octet-stream': ['.aia', '.bin'] } }],
  });
  const writable = await handle.createWritable();
  return {
    kind: 'file',
    handle,
    write: (b) => writable.write(b),
    close: () => writable.close(),
  };
}

/* ------------------------------------------------------------- mã hoá --- */

function startEncryption({ auto = false } = {}) {
  if (state.busy) return;
  if (!state.source) {
    if (!auto) {
      toast('Hãy chọn một tệp hoặc dán code trước.', 'warn');
      $('drop').focus();
    }
    return;
  }
  runEncryption({ auto }).catch((err) => {
    setBusy(false);
    $('progressWrap').hidden = true;
    if (err && err.code === 'CANCELLED') {
      toast('Đã dừng mã hoá.', 'warn');
      return;
    }
    console.error(err);
    toast('Mã hoá thất bại: ' + (err && err.message ? err.message : err), 'bad', 8000);
  });
}

$('encryptBtn').addEventListener('click', () => startEncryption({ auto: false }));

$('cancelBtn').addEventListener('click', () => {
  state.cancelled = true;
});

function resetResult() {
  $('resultCard').hidden = true;
  $('progressWrap').hidden = true;
  $('progBar').style.width = '0%';
  state.artifacts.clear();
}

async function runEncryption(runOpts = {}) {
  const src = state.source;
  const mode = passMode();
  const passphrase = effectivePassphrase();
  if (mode !== 'none' && !passphrase) {
    toast('Bạn chọn kiểu có mật khẩu nhưng ô mật khẩu đang trống — hãy nhập hoặc bấm "tạo".', 'warn', 6000);
    throw new C.AIAError('NO_PASSPHRASE', 'Thiếu mật khẩu cho chế độ đã chọn.');
  }
  const slug = C.slugify(src.name);
  const payloadFile = slug + '.aia';
  const keyMode = isSharedMode() ? 'shared' : 'per-file';
  const keyFileName = keyMode === 'shared' ? SHARED_KEY_FILE : `${slug}.key.js`;
  const runnerFileName = `run-${slug}.html`;
  const readmeFileName = `README-${slug}.txt`;
  const expiryValue = $('expiry').value;

  const sharedKey = keyMode === 'shared' ? sharedMasterKey() : null;
  if (keyMode === 'shared' && !sharedKey) {
    throw new C.AIAError('NO_SHARED_KEY', 'Chưa nạp được aia.key.js (khoá dùng chung). Hãy tải lại trang.');
  }

  const options = {
    keyMode,
    sharedKey,
    keyUrl: keyMode === 'shared' ? SHARED_KEY_URL : $('keyUrl').value.trim() || './key.js',
    passphrase,
    iterations: Number($('iter').value),
    chunkSize: Number($('chunk').value),
    expiry: expiryValue ? new Date(expiryValue).toISOString() : null,
    note: $('note').value.trim(),
    fileName: src.name,
    fileType: src.type,
    lang: src.lang || C.detectLang(src.name),
    hashPlaintext: $('hashChk').checked,
    requireKeyScript: keyMode === 'shared' ? true : $('requireKeyChk').checked,
    payloadFile,
  };

  state.cancelled = false;
  setBusy(true);
  $('resultCard').hidden = true;
  $('progressWrap').hidden = false;
  $('progBar').style.width = '0%';
  $('progText').textContent = 'đang sinh khoá (PBKDF2 ' + options.iterations.toLocaleString('vi-VN') + ' vòng)…';
  $('progStats').textContent = '';
  await new Promise((r) => setTimeout(r, 30));

  let sink = null;
  if (src.size > BIG_MEMORY_LIMIT) {
    if (typeof window.showSaveFilePicker !== 'function') {
      const ok = window.confirm(
        `Tệp ${C.formatBytes(src.size)} lớn hơn 256 MiB và trình duyệt này không hỗ trợ ghi trực tiếp ra đĩa. ` +
          'Toàn bộ tệp sẽ nằm trong RAM và có thể làm treo tab.\n\n' +
          'Nên dùng Chrome/Edge, hoặc dùng CLI (node tools/cli.mjs encrypt). Tiếp tục?',
      );
      if (!ok) {
        setBusy(false);
        $('progressWrap').hidden = true;
        toast('Đã huỷ để an toàn. Hãy dùng Chrome/Edge hoặc CLI cho tệp lớn.', 'warn', 7000);
        return;
      }
    }
    try {
      sink = await fileSink(payloadFile);
      if (!sink) toast('Tệp lớn: sẽ mã hoá trong bộ nhớ, có thể cần nhiều RAM.', 'warn', 7000);
    } catch (err) {
      if (err && err.name === 'AbortError') {
        setBusy(false);
        $('progressWrap').hidden = true;
        toast('Bạn đã huỷ chọn tệp đầu ra.', 'warn');
        return;
      }
      sink = null;
    }
  }
  if (!sink) sink = memorySink();

  const startedAt = performance.now();
  let lastPaint = 0;
  const onProgress = (done, total) => {
    if (state.cancelled) throw new C.AIAError('CANCELLED', 'Đã dừng theo yêu cầu.');
    const now = performance.now();
    if (now - lastPaint < 90 && done < total) return;
    lastPaint = now;
    const seconds = (now - startedAt) / 1000;
    $('progBar').style.width = humanPercent(done, total);
    $('progText').textContent = `đang mã hoá ${humanPercent(done, total)} — ${C.formatBytes(done)} / ${C.formatBytes(total)}`;
    $('progStats').textContent = `${speedText(done, seconds)} · còn ${etaText(done, total, seconds)}`;
  };

  let result;
  try {
    result = await C.encryptStream({
      openStream: src.openStream,
      size: src.size,
      options,
      sink,
      onProgress,
    });
  } finally {
    setBusy(false);
  }

  const elapsed = (performance.now() - startedAt) / 1000;
  const meta = result.meta;
  let containerBytes = null;
  if (sink.kind === 'memory') {
    containerBytes = await sink.toBytes();
  }

  // --- sinh các tệp phụ ---
  const embedPass = $('embedPassChk').checked && passphrase.length > 0;
  const keyText =
    keyMode === 'shared'
      ? C.buildSharedKeyScript({
          sharedKey,
          keyUrl: SHARED_KEY_URL,
          keyId: meta.sharedKeyId,
          note: 'khoá dùng chung cố định của site — 1 link cho mọi lần mã hoá và mọi người',
        })
      : C.buildKeyScript(meta, { embeddedPassphrase: embedPass ? passphrase : null });
  const runnerHtml = C.buildRunnerHtml(meta, { keyFileName, runnerFileName });
  const readmeText = C.buildReadme(meta, { keyFileName, runnerFileName });

  state.artifacts.clear();
  state.artifacts.set(payloadFile, {
    name: payloadFile,
    size: containerBytes ? containerBytes.length : result.encryptedBytes,
    data: containerBytes,
    handle: sink.handle || null,
  });
  state.artifacts.set(keyFileName, { name: keyFileName, size: new TextEncoder().encode(keyText).length, data: keyText });
  state.artifacts.set(runnerFileName, { name: runnerFileName, size: new TextEncoder().encode(runnerHtml).length, data: runnerHtml });
  state.artifacts.set(readmeFileName, { name: readmeFileName, size: new TextEncoder().encode(readmeText).length, data: readmeText });

  // ZIP chỉ khi mọi thứ nằm trong bộ nhớ và tổng dung lượng vừa phải
  let zipSize = 0;
  if ($('zipChk').checked && containerBytes) {
    const total = containerBytes.length + state.artifacts.get(keyFileName).size + state.artifacts.get(runnerFileName).size + state.artifacts.get(readmeFileName).size;
    if (total <= C.ZIP_LIMIT) {
      const zip = C.createZip([
        { name: payloadFile, data: containerBytes },
        { name: keyFileName, data: keyText },
        { name: runnerFileName, data: runnerHtml },
        { name: readmeFileName, data: readmeText },
      ]);
      zipSize = zip.length;
      state.artifacts.set(`aia-${slug}.zip`, { name: `aia-${slug}.zip`, size: zip.length, data: zip });
    }
  }

  state.lastCipher = { bytes: containerBytes, meta, options, keyText };

  // --- tự kiểm tra: giải mã lại và so sánh từng byte (chỉ với tệp ≤ 64 MiB) ---
  let verified = null;
  if (containerBytes && src.size <= C.SMALL_FILE_HASH_LIMIT) {
    try {
      let original = src.bytes;
      if (!original) original = await readAllBytes(src.openStream());
      const check = await C.decryptBytes(containerBytes, passphrase, null, meta.keyWrap || null, sharedKey);
      verified = (await C.sha256Hex(check.plaintext)) === (await C.sha256Hex(original));
    } catch (err) {
      verified = false;
      console.warn('Tự kiểm tra thất bại', err);
    }
  }

  renderResult({ meta, options, elapsed, verified, keyText, zipSize, sink, keyMode, passphrase });
  $('progressWrap').hidden = true;
  $('progBar').style.width = '100%';
  toast(verified === false ? 'Đã mã hoá nhưng tự kiểm tra KHÔNG khớp — hãy thử lại.' : 'Mã hoá xong.', verified === false ? 'bad' : 'ok', 6000);
  if (meta.keyWrapIn === 'shared-key-script' && !passphrase) {
    toast(
      'Chưa đặt mật khẩu: aia.key.js là công khai nên ai có tệp .aia cũng mở được. Hãy đặt mật khẩu nếu cần bảo vệ.',
      'warn',
      9000,
    );
  }
}

function renderResult({ meta, options, elapsed, verified, keyText, zipSize, sink, keyMode, passphrase }) {
  const payloadName = meta.payload.file;
  const keyName = [...state.artifacts.keys()].find((n) => n.endsWith('.key.js'));
  const runnerName = [...state.artifacts.keys()].find((n) => n.startsWith('run-'));
  const readmeName = [...state.artifacts.keys()].find((n) => n.startsWith('README-'));

  $('resultCard').hidden = false;
  $('resContainerName').textContent = payloadName;
  $('resContainerSize').textContent =
    (sink.kind === 'file' ? 'đã ghi ra đĩa · ' : '') + C.formatBytes(state.artifacts.get(payloadName).size);
  $('resKeyName').textContent = keyName;
  $('resKeySize').textContent = C.formatBytes(state.artifacts.get(keyName).size);
  $('resRunnerName').textContent = runnerName;
  $('resRunnerSize').textContent = C.formatBytes(state.artifacts.get(runnerName).size);
  $('resReadmeName').textContent = readmeName;
  $('resReadmeSize').textContent = C.formatBytes(state.artifacts.get(readmeName).size);

  const plain = meta.file.size;
  const cipher = state.artifacts.get(payloadName).size;
  const overhead = Math.max(0, cipher - plain);
  const pct = plain ? (overhead / plain) * 100 : 0;
  const zipName = [...state.artifacts.keys()].find((n) => n.endsWith('.zip'));

  $('resStats').innerHTML = [
    stat('Bản rõ', C.formatBytes(plain)),
    stat('Bản mã', C.formatBytes(cipher)),
    stat('Tăng thêm', `${C.formatBytes(overhead)} (${percentText(pct)})`),
    stat('Số khối', meta.chunk.total.toLocaleString('vi-VN')),
    stat('Thời gian', C.formatDuration(elapsed * 1000)),
    stat('Tốc độ', speedText(plain, elapsed)),
    stat('KDF', `PBKDF2 ${meta.kdf.iterations.toLocaleString('vi-VN')}`),
    stat('Tự kiểm tra', verified === null ? 'bỏ qua (tệp lớn)' : verified ? 'khớp 100%' : 'KHÔNG khớp'),
    meta.keyWrapIn === 'shared-key-script'
      ? stat('Khoá', $('pass').value ? 'dùng chung aia.key.js + mật khẩu' : 'dùng chung aia.key.js (KHÔNG mật khẩu)')
      : '',
    plain > 0 && plain < 4096 ? stat('Ghi chú', 'header ~0,7 KB nên tệp rất nhỏ sẽ có % tăng cao — bình thường') : '',
    zipSize ? stat('ZIP', C.formatBytes(zipSize)) : '',
  ].join('');

  $('dlZip').style.display = zipName ? '' : 'none';
  $('dlContainer').style.display = state.artifacts.get(payloadName).data ? '' : 'none';
  $('dlContainer').textContent = sink.kind === 'file' ? 'đã ghi ra đĩa' : 'Tải .aia';
  $('dlContainer').disabled = !state.artifacts.get(payloadName).data;
  const runnableNow = isRunnable(meta.file);
  $('testRunBtn').disabled = !state.lastCipher.bytes || plain > PREVIEW_LIMIT || !runnableNow;
  $('testRunBtn').title = runnableNow
    ? 'Chạy thử code đã giải mã trong Web Worker'
    : !isRunnable(meta.file)
      ? `Không chạy thử được: tệp là ${langLabel(meta.file.lang)} (không phải JavaScript). Trang vẫn mã hoá và cho tải bản rõ.`
      : plain > PREVIEW_LIMIT
        ? 'Tệp quá lớn để chạy thử trong bộ nhớ (giới hạn 32 MiB).'
        : 'Tệp chưa nằm trong bộ nhớ (đã ghi trực tiếp ra đĩa).';

  const keyNameForLink = [...state.artifacts.keys()].find((n) => n.endsWith('.key.js')) || SHARED_KEY_FILE;
  state.lastCodeExtra = {
    passphrase: passphrase || '',
    passMode: passMode(),
    keyText,
    keyName: keyNameForLink,
    keyMode,
  };
  encFmt = 'run';
  renderKeyLink(meta, { keyName: keyNameForLink });
  renderEncryptedCode(state.lastCipher ? state.lastCipher.bytes : null, meta, state.lastCodeExtra);

  $('keyPreview').textContent = keyText;
  const publicMeta = { ...meta };
  delete publicMeta.keyWrap;
  $('metaPreview').textContent = JSON.stringify(publicMeta, null, 2);
  $('metaNote').textContent =
    meta.keyWrapIn === 'shared-key-script'
      ? 'Khoá dùng chung: keyWrap nằm ngay trong header (đã bọc bằng khoá phụ thuộc aia.key.js + mật khẩu), nên thiếu aia.key.js là không mở được.'
      : meta.keyWrapIn === 'key-script'
        ? 'Khoá tệp (keyWrap) KHÔNG nằm trong header này — nó chỉ có trong key script. Đây là lý do bắt buộc phải có key script.'
        : 'Chế độ tương thích: khoá dẫn xuất trực tiếp từ header + mật khẩu, không cần key script.';
  $('resultBadge').textContent = verified === false ? 'cần kiểm tra' : 'hoàn tất';
  $('resultBadge').className = 'badge ' + (verified === false ? 'bad' : 'ok');
  const testLogEl = $('testLog');
  if (testLogEl) {
    testLogEl.hidden = true;
    testLogEl.textContent = '';
  }

  $('resultCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function stat(label, value) {
  return `<span class="stat">${escapeHtml(label)}: <b>${escapeHtml(value)}</b></span>`;
}

/* ----------------------------------------- code đã mã hoá (Base64/Hex) ----- */

// Giới hạn hiển thị/chép: dưới mức này thì đưa toàn bộ, trên thì chỉ đưa phần đầu
// (tệp lớn hơn nên tải .aia — dán hàng trăm MB vào ô văn bản sẽ làm treo trình duyệt).
const ENC_CODE_FULL_LIMIT = 2 * 1024 * 1024;
let encFmt = 'run';
let encStyle = 'stealth';

function bytesToHexAll(bytes) {
  let out = '';
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const part = bytes.subarray(i, Math.min(i + CHUNK, bytes.length));
    out += Array.from(part, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return out;
}

function bytesToBase64All(bytes) {
  let out = '';
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += btoa(String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + CHUNK, bytes.length))));
  }
  return out;
}

function renderEncryptedCode(bytes, meta, extra = {}) {
  state.encSnippet = '';
  if (!bytes) {
    $('encCode').textContent = '—';
    $('encCodeNote').textContent = '';
    return;
  }

  // Sinh snippet "chép là chạy" (kèm link key script + bản mã Base64).
  const snippetTooBig = bytes.length > SNIPPET_MAX_BYTES;
  if (!snippetTooBig) {
    try {
      const keyUrl = absoluteUrl(meta.keyWrapIn === 'shared-key-script' ? SHARED_KEY_FILE : extra.keyName || meta.keyUrl);
      state.encSnippet = C.buildRunSnippet({
        style: encStyle,
        meta,
        containerBytes: bytes,
        keyUrl,
        keyScriptText: meta.keyWrapIn === 'shared-key-script' ? null : extra.keyText || null,
        passphrase: extra.passphrase || '',
        askPassphrase: extra.passMode === 'ask',
        execute: isRunnable(meta.file),
      });
    } catch (err) {
      console.warn('Không sinh được snippet', err);
      state.encSnippet = '';
    }
  }

  if (!state.encSnippet && encFmt === 'run') encFmt = 'b64';

  const full = bytes.length <= ENC_CODE_FULL_LIMIT;
  const view = full ? bytes : bytes.subarray(0, ENC_CODE_FULL_LIMIT);
  let text;
  if (encFmt === 'run') {
    text = state.encSnippet;
  } else {
    text = encFmt === 'b64' ? bytesToBase64All(view) : bytesToHexAll(view);
    if (!full) text += '\n\n… (còn ' + C.formatBytes(bytes.length - view.length) + ', hãy tải tệp .aia)';
  }
  $('encCode').textContent = text;
  state.encCodeText = text;

  const fmtName = encFmt === 'run' ? 'snippet' : encFmt === 'b64' ? 'Base64' : 'Hex';
  let note;
  if (encFmt === 'run') {
    const hidden = encStyle === 'stealth';
    note =
      (hidden
        ? 'Đã ẩn dấu vết: không có tiêu đề, không lộ link key dạng chữ thường, tên biến ngẫu nhiên, mọi chuỗi cắt nhỏ + Base64. '
        : 'Có chú thích rõ ràng: tiêu đề, link key và cách dùng hiện ngay đầu đoạn code. ') +
      'Chép toàn bộ đoạn này → dán vào Console (F12) hoặc tệp .js là chạy: nó tự nạp key script, tự giải mã' +
      (isRunnable(meta.file) ? ', tự chạy code gốc.' : ' rồi tải bản rõ về (định dạng này không tự chạy trong trình duyệt).') +
      (extra.passphrase ? ' Có mật khẩu bên trong.' : ' KHÔNG cần mật khẩu.');
  } else if (snippetTooBig && encFmt === 'b64') {
    note =
      `Tệp lớn (${C.formatBytes(bytes.length)}): chỉ hiện ${C.formatBytes(view.length)} đầu ở dạng ${fmtName}. ` +
      'Snippet không sinh cho tệp lớn — hãy dùng tệp .aia.';
  } else {
    note = `Toàn bộ tệp ${C.formatBytes(bytes.length)} ở dạng ${fmtName} — chép và dán được ngay.`;
  }
  if (snippetTooBig && encFmt === 'run') note = 'Tệp quá lớn để nhúng vào snippet — hãy dùng tệp .aia.';
  $('encCodeNote').textContent = note;
  $('encFmtRun').classList.toggle('on', encFmt === 'run');
  $('encFmtB64').classList.toggle('on', encFmt === 'b64');
  $('encFmtHex').classList.toggle('on', encFmt === 'hex');
  $('encFmtRun').disabled = !state.encSnippet;
  state.encCodeFull = full;
}

function rerenderCode() {
  if (!state.lastCipher || !state.lastCipher.bytes) return;
  renderEncryptedCode(state.lastCipher.bytes, state.lastCipher.meta, state.lastCodeExtra || {});
}

$('encFmtRun').addEventListener('click', () => {
  encFmt = 'run';
  rerenderCode();
});
$('encFmtB64').addEventListener('click', () => {
  encFmt = 'b64';
  rerenderCode();
});
$('encFmtHex').addEventListener('click', () => {
  encFmt = 'hex';
  rerenderCode();
});
if ($('encStyle')) {
  $('encStyle').value = encStyle;
  $('encStyle').addEventListener('change', () => {
    encStyle = $('encStyle').value === 'labeled' ? 'labeled' : 'stealth';
    encFmt = 'run';
    rerenderCode();
  });
}
$('encCopy').addEventListener('click', async () => {
  const text = state.encCodeText || '';
  if (!text) return toast('Chưa có bản mã để chép.', 'warn');
  const fmtName = encFmt === 'run' ? 'snippet chép-là-chạy' : encFmt === 'b64' ? 'Base64' : 'Hex';
  try {
    await navigator.clipboard.writeText(text);
    toast(`Đã chép ${fmtName} (${C.formatBytes(text.length)}).`, 'ok', 5000);
  } catch {
    const range = document.createRange();
    range.selectNodeContents($('encCode'));
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    toast('Trình duyệt chặn clipboard — đã bôi đen sẵn, bấm Ctrl/Cmd+C.', 'warn', 6000);
  }
});

/* --------------------------------------------- dòng link key script -------- */

function renderKeyLink(meta, extra = {}) {
  const shared = meta.keyWrapIn === 'shared-key-script';
  const url = absoluteUrl(shared ? SHARED_KEY_FILE : extra.keyName || meta.keyUrl || SHARED_KEY_FILE);
  $('keyLinkText').textContent = url;
  $('keyLinkOpen').href = url;
  $('keyLinkNote').textContent = shared
    ? 'ai mã hoá trên trang này cũng dùng đúng link này — chỉ cần gửi tệp .aia + mật khẩu'
    : 'gửi kèm tệp key script này cho người nhận (thiếu là không mở được)';
}

$('keyLinkCopy').addEventListener('click', async () => {
  const text = $('keyLinkText').textContent || '';
  if (!text || text === '—') return toast('Chưa có link key script.', 'warn');
  try {
    await navigator.clipboard.writeText(text);
    toast('Đã chép link key script.', 'ok', 4000);
  } catch {
    toast('Trình duyệt chặn clipboard — hãy bôi đen và chép tay.', 'warn', 5000);
  }
});

function isRunnable(fileMeta) {
  return C.isRunnableLang(fileMeta.lang);
}

/**
 * Có nên ĐƯA CODE VÀO WEB WORKER hay không?
 * Ngoài nhãn ngôn ngữ, còn dò nhanh nội dung: tệp cũ (mã hoá trước bản sửa này)
 * có thể ghi `javascript` trong header dù bên trong là Lua.
 */
function canExecute(fileMeta, code) {
  if (!C.isRunnableLang(fileMeta && fileMeta.lang)) return false;
  const sniffed = C.sniffContentLang(code || '');
  return !sniffed || sniffed === 'javascript';
}

/** Đổi lỗi kỹ thuật thành câu dễ hiểu cho người dùng. */
function explainRuntimeError(message) {
  const m = String(message == null ? '' : message).trim();
  if (/Unexpected identifier|Unexpected token|Unexpected end of input|Invalid or unexpected token|SyntaxError|missing \) after/i.test(m)) {
    return (
      `${m}\n→ Đây là lỗi CÚ PHÁP của chính tệp gốc, không phải lỗi mã hoá: tệp không phải JavaScript nên trình duyệt không chạy được. ` +
      'Dữ liệu đã giải mã xong — bấm "Tải bản rõ" để lấy lại code (hoặc đặt đúng đuôi .lua/.py rồi mã hoá lại để trang tự nhận đúng).'
    );
  }
  if (/document is not defined|window is not defined/i.test(m)) {
    return `${m}\n→ Code gốc cần DOM, nhưng Web Worker không có DOM. Hãy chạy trong trang bằng thẻ <script>.`;
  }
  if (/Cannot use import statement|import declarations may only appear/i.test(m)) {
    return `${m}\n→ Code dùng ES module (import/export): Web Worker dạng cổ điển không nạp được. Hãy chạy trong trang bằng <script type="module">.`;
  }
  return m;
}

/* ------------------------------------------------------------ tải tệp --- */

function downloadByName(name) {
  const art = state.artifacts.get(name);
  if (!art) return;
  if (!art.data) {
    toast('Tệp này đã được ghi trực tiếp ra đĩa khi mã hoá.', 'info');
    return;
  }
  downloadArtifact(art.name, art.data);
}

$('dlZip').addEventListener('click', () => {
  const zipName = [...state.artifacts.keys()].find((n) => n.endsWith('.zip'));
  if (zipName) downloadByName(zipName);
  else toast('Không có ZIP (tệp quá lớn hoặc bạn đã tắt đóng gói).', 'warn');
});
$('dlContainer').addEventListener('click', () => downloadByName(state.lastCipher && state.lastCipher.meta.payload.file));
$('dlKey').addEventListener('click', () => downloadByName([...state.artifacts.keys()].find((n) => n.endsWith('.key.js'))));
$('dlRunner').addEventListener('click', () => downloadByName([...state.artifacts.keys()].find((n) => n.startsWith('run-'))));
$('dlReadme').addEventListener('click', () => downloadByName([...state.artifacts.keys()].find((n) => n.startsWith('README-'))));

/* --------------------------------------------------------- chạy thử ngay --- */

$('testRunBtn').addEventListener('click', async () => {
  if (!state.lastCipher || !state.lastCipher.bytes) {
    toast('Chỉ chạy thử được khi tệp mã hoá nằm trong bộ nhớ (≤ 256 MiB).', 'warn');
    return;
  }
  const log = $('testLog');
  log.hidden = false;
  log.textContent = '';
  appendLog(log, 'sys', '[AIA] đang giải mã bằng đúng thông tin header + mật khẩu…');

  try {
    const { meta } = state.lastCipher;
    const source = new ReadableStream({
      start(c) {
        c.enqueue(state.lastCipher.bytes);
        c.close();
      },
    });
    const { plaintext } = await C.decryptStream({
      source,
      passphrase: state.lastCipher.options.passphrase,
      keyWrap: state.lastCipher.meta.keyWrap || null,
      sharedKey: state.lastCipher.options.sharedKey || null,
    });
    appendLog(log, 'ok', `[AIA] giải mã OK: ${plaintext.length} byte.`);
    const code = new TextDecoder().decode(plaintext);
    if (!canExecute(meta.file, code)) {
      log.textContent += '\n' + code.slice(0, 3000);
      appendLog(
        log,
        'warn',
        `[AIA] Không chạy thử: tệp là ${langLabel(C.sniffContentLang(code) || meta.file.lang)} — trình duyệt chỉ chạy được JavaScript/TypeScript. ` +
          'Dữ liệu đã giải mã đúng; mở tab "Giải mã & chạy" → "Tải bản rõ" để lấy code.',
      );
      return;
    }
    runInWorker(code, log);
  } catch (err) {
    appendLog(log, 'err', '[AIA] ' + (err && err.message ? err.message : err));
  }
});

function runInWorker(code, log) {
  stopWorker();
  const blob = new Blob([C.buildWorkerSource(code)], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  state.worker = { worker, url };
  state.runStartedAt = performance.now();
  appendLog(log, 'info', '[AIA] bắt đầu chạy trong Web Worker…');
  worker.onmessage = (ev) => {
    const d = ev.data || {};
    if (d.type === 'log') appendLog(log, d.level, (d.args || []).join(' '));
    else if (d.type === 'error') appendLog(log, 'err', '[runtime] ' + explainRuntimeError(d.message));
    else if (d.type === 'done') {
      appendLog(log, 'sys', `[AIA] chạy xong phần đồng bộ · ${C.formatDuration(performance.now() - state.runStartedAt)}`);
      try { URL.revokeObjectURL(url); } catch { /* ignore */ }
    }
  };
  worker.onerror = (e) => appendLog(log, 'err', '[worker] ' + explainRuntimeError(e && e.message ? e.message : 'lỗi không rõ'));
  setTimeout(() => {
    try { URL.revokeObjectURL(url); } catch { /* ignore */ }
  }, 1000);
}

function stopWorker() {
  if (state.worker) {
    try { state.worker.worker.terminate(); } catch { /* ignore */ }
    try { URL.revokeObjectURL(state.worker.url); } catch { /* ignore */ }
    state.worker = null;
  }
}

function appendLog(container, level, text) {
  const line = document.createElement('div');
  line.className = level === 'err' || level === 'error' ? 'err' : level === 'warn' ? 'warn' : level === 'info' ? 'info' : level === 'ok' ? 'ok' : level === 'sys' ? 'sys' : '';
  line.textContent = text;
  container.appendChild(line);
  container.scrollTop = container.scrollHeight;
  while (container.childNodes.length > 1500) container.removeChild(container.firstChild);
}

/* =============================== GIẢI MÃ =============================== */

let decHeader = null;

$('decFile').addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  state.decrypted = null;
  $('consoleOut').textContent = '';
  $('plainPreview').textContent = '';
  try {
    const slice = file.slice(0, 1024 * 1024);
    const { meta } = await C.readContainerHeaderFromSource(slice.stream());
    decHeader = meta;
    $('decMeta').innerHTML = [
      `<div><b>${escapeHtml(meta.file.name)}</b> · ${C.formatBytes(meta.file.size)} · ${escapeHtml(meta.file.lang)}</div>`,
      `<div>Thời gian tạo: <b>${escapeHtml(meta.time.readable)}</b> (raw ${escapeHtml(meta.time.raw)})</div>`,
      `<div>Link key: <b>${escapeHtml(meta.keyUrl)}</b></div>`,
      `<div>ID: ${escapeHtml(meta.id)} · ${escapeHtml(meta.alg)} · ${meta.chunk.total} khối</div>`,
      `<div>Hạn dùng: ${meta.expiry ? escapeHtml(new Date(meta.expiry).toLocaleString('vi-VN')) : 'không đặt'}</div>`,
      meta.keyWrapIn === 'shared-key-script'
        ? '<div style="color:#fbbf24">⚠ Bản mã dùng khoá chung: mở bằng <code>aia.key.js</code> của site (đã tự nạp) + mật khẩu.</div>'
        : meta.keyWrapIn === 'key-script'
          ? '<div style="color:#fbbf24">⚠ Bản mã này bắt buộc phải có key script — hãy chọn tệp <code>.key.js</code>.</div>'
          : '<div class="muted">Bản mã cũ (khoá dẫn xuất trực tiếp), không bắt buộc key script.</div>',
    ].join('');
    appendLog($('consoleOut'), 'info', `[AIA] đã đọc header của ${file.name} (không cần mật khẩu).`);
  } catch (err) {
    decHeader = null;
    $('decMeta').textContent = 'Không đọc được header: ' + (err && err.message ? err.message : err);
    appendLog($('consoleOut'), 'err', '[AIA] ' + (err && err.message ? err.message : err));
  }
});

$('keyFile').addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const text = await file.text();
  const m = /\/\*<AIA:META>\*\/([\s\S]*?)\/\*<\/AIA:META>\*\//.exec(text);
  if (!m) {
    appendLog($('consoleOut'), 'warn', '[AIA] Tệp này không giống key script của AIA (không thấy META).');
    return;
  }
  try {
    const keyMeta = JSON.parse(m[1]);
    state.keyMeta = keyMeta;
    appendLog(
      $('consoleOut'),
      'info',
      `[AIA] đã nạp key script: ID ${keyMeta.id} · keyUrl ${keyMeta.keyUrl}` +
        (keyMeta.keyWrap ? ' · có khoá tệp (chế độ bắt buộc key script)' : ' · không chứa khoá tệp'),
    );
    if (decHeader && decHeader.id !== keyMeta.id) {
      appendLog($('consoleOut'), 'err', '[AIA] CẢNH BÁO: key script không khớp tệp .aia (ID khác nhau).');
    }
  } catch {
    appendLog($('consoleOut'), 'err', '[AIA] Không đọc được META trong key script.');
  }
});

function decFile() {
  const f = $('decFile').files && $('decFile').files[0];
  if (!f) {
    toast('Hãy chọn tệp .aia trước.', 'warn');
    return null;
  }
  return f;
}

function currentKeyWrap() {
  return (state.keyMeta && state.keyMeta.keyWrap) || null;
}

async function decryptToBytes(f, onProgress) {
  return C.decryptStream({
    source: f.stream(),
    passphrase: $('decPass').value,
    onProgress,
    keyWrap: currentKeyWrap(),
    sharedKey: sharedMasterKey(),
  });
}

function decProgress(show) {
  $('decProgressWrap').hidden = !show;
  if (!show) {
    $('decBar').style.width = '0%';
    $('decText').textContent = '…';
    $('decStats').textContent = '';
  }
}

async function doDecrypt(exec) {
  const f = decFile();
  if (!f) return;
  const log = $('consoleOut');
  const started = performance.now();
  decProgress(true);
  $('decText').textContent = 'đang sinh khoá…';
  try {
    let lastPaint = 0;
    const { meta, plaintext } = await decryptToBytes(f, (done, total) => {
      const now = performance.now();
      if (now - lastPaint < 90 && done < total) return;
      lastPaint = now;
      const secs = (now - started) / 1000;
      $('decBar').style.width = humanPercent(done, total);
      $('decText').textContent = `giải mã ${humanPercent(done, total)} — ${C.formatBytes(done)} / ${C.formatBytes(total)}`;
      $('decStats').textContent = `${speedText(done, secs)} · còn ${etaText(done, total, secs)}`;
    });
    state.decrypted = { bytes: plaintext, meta, name: meta.file.name };
    appendLog(log, 'ok', `[AIA] giải mã thành công ${plaintext.length} byte sau ${C.formatDuration(performance.now() - started)}.`);
    if (meta.file.sha256) appendLog(log, 'ok', '[AIA] SHA-256 khớp — dữ liệu nguyên vẹn.');
    const code = new TextDecoder().decode(plaintext);
    $('plainPreview').textContent = code.length > 400000 ? code.slice(0, 400000) + '\n… (đã rút gọn khi hiển thị, tải về để xem đủ)' : code;
    if (exec) {
      if (canExecute(meta.file, code)) runInWorker(code, log);
      else {
        const realLang = C.sniffContentLang(code) || meta.file.lang;
        appendLog(log, 'warn', `[AIA] ${langLabel(realLang)} không chạy trực tiếp trong trình duyệt — bấm "Tải bản rõ" để lấy code.`);
      }
    }
  } catch (err) {
    appendLog(log, 'err', '[AIA] ' + (err && err.message ? err.message : err));
    toast((err && err.message) || 'Giải mã thất bại', 'bad', 7000);
  } finally {
    decProgress(false);
  }
}

$('runBtn').addEventListener('click', () => doDecrypt(true));
$('verifyBtn').addEventListener('click', () => doDecrypt(false));
$('stopRunBtn').addEventListener('click', () => {
  stopWorker();
  appendLog($('consoleOut'), 'sys', '[AIA] đã dừng script.');
});
$('dlPlainBtn').addEventListener('click', async () => {
  const f = decFile();
  if (!f) return;
  try {
    decProgress(true);
    const { meta, plaintext } = state.decrypted && state.decrypted.meta.id === decHeader?.id
      ? { meta: state.decrypted.meta, plaintext: state.decrypted.bytes }
      : await decryptToBytes(f);
    downloadArtifact(meta.file.name || 'decrypted.bin', plaintext);
    appendLog($('consoleOut'), 'ok', `[AIA] đã tải ${meta.file.name} (${C.formatBytes(plaintext.length)}).`);
  } catch (err) {
    appendLog($('consoleOut'), 'err', '[AIA] ' + (err && err.message ? err.message : err));
  } finally {
    decProgress(false);
  }
});
$('copyCode').addEventListener('click', async () => {
  if (!state.decrypted) return toast('Chưa có bản rõ.', 'warn');
  try {
    await navigator.clipboard.writeText(new TextDecoder().decode(state.decrypted.bytes));
    toast('Đã chép code vào clipboard.', 'ok');
  } catch {
    toast('Trình duyệt không cho chép tự động.', 'warn');
  }
});
$('saveCode').addEventListener('click', () => {
  if (!state.decrypted) return toast('Chưa có bản rõ.', 'warn');
  downloadArtifact(state.decrypted.meta.file.name || 'decrypted.bin', state.decrypted.bytes);
});

/* ============================== DỊCH NGƯỢC ============================== */

$('revLoad').addEventListener('click', () => $('revFile').click());
$('revFile').addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  if (file.size > 64 * 1024 * 1024) {
    toast('Chỉ nạp tệp ≤ 64 MiB cho công cụ đọc code.', 'warn');
    return;
  }
  $('revInput').value = await file.text();
  toast('Đã nạp ' + file.name, 'ok');
});

document.querySelectorAll('[data-rev]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const code = $('revInput').value;
    if (!code.trim()) return toast('Chưa có code để xử lý.', 'warn');
    try {
      const lang = detectLanguage(code);
      const result = applyReverseAction(btn.dataset.rev, code, { lang });
      $('revOutput').value = result.code;
      $('revStats').innerHTML = [
        stat('Ngôn ngữ', lang),
        stat('Vào', `${code.length} ký tự`),
        stat('Ra', `${result.code.length} ký tự`),
        stat('Ghi chú', result.note || '—'),
      ].join('');
    } catch (err) {
      console.error(err);
      toast('Không xử lý được: ' + (err && err.message ? err.message : err), 'bad', 6000);
    }
  });
});

$('revCopy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('revOutput').value);
    toast('Đã chép kết quả.', 'ok');
  } catch {
    toast('Không chép được.', 'warn');
  }
});
$('revDownload').addEventListener('click', () => {
  const text = $('revOutput').value;
  if (!text) return toast('Chưa có kết quả.', 'warn');
  downloadArtifact('reversed.js', text);
});
$('revToEncrypt').addEventListener('click', () => {
  const text = $('revOutput').value || $('revInput').value;
  if (!text.trim()) return toast('Chưa có nội dung.', 'warn');
  setSourceFromText(text);
  showView('encrypt');
});


/* ------------------------------------------------------------- mã hoá link --- */

function linkProtection() {
  const el = $('linkPassMode');
  return (el && el.value) || 'none';
}

function syncLinkPassUi() {
  const mode = linkProtection();
  const pass = $('linkPass');
  if (!pass) return;
  pass.disabled = mode === 'none';
  pass.style.opacity = mode === 'none' ? '0.55' : '';
  const note = $('linkPassNote');
  if (note) {
    note.textContent =
      mode === 'none'
        ? 'Không mật khẩu: ai có token VÀ key script là mở được — phù hợp để che link cho gọn mắt.'
        : mode === 'embed'
          ? 'Mật khẩu nhúng sẵn trong snippet: người nhận không phải nhập, nhưng ai đọc snippet cũng thấy (dạng Base64).'
          : 'Người nhận phải nhập mật khẩu khi chạy snippet hoặc khi mở token ở trang này.';
  }
  if ($('linkStatus')) $('linkStatus').textContent = '';
}

async function copyToClipboard(text, message) {
  try {
    await navigator.clipboard.writeText(text);
    toast(message || 'Đã chép.', 'ok');
    return true;
  } catch {
    toast('Không chép được — hãy bôi đen và chép tay.', 'warn');
    return false;
  }
}

function linkPassForSnippet() {
  const mode = linkProtection();
  return {
    askPassphrase: mode === 'ask',
    passphrase: mode === 'none' ? '' : $('linkPass').value,
  };
}

async function encryptLinkFromUi() {
  const btn = $('linkEncrypt');
  const status = $('linkStatus');
  let target;
  try {
    target = C.normalizeLink($('linkInput').value);
  } catch (err) {
    status.textContent = err.message;
    toast(err.message, 'bad', 6000);
    return null;
  }
  const master = sharedMasterKey();
  if (!master) {
    toast('Chưa nạp được aia.key.js (khoá dùng chung). Hãy tải lại trang.', 'bad', 8000);
    return null;
  }
  const mode = linkProtection();
  const pass = mode === 'none' ? '' : $('linkPass').value;
  if (mode !== 'none' && !pass) {
    toast('Bạn chọn có mật khẩu nhưng chưa nhập mật khẩu.', 'bad', 6000);
    return null;
  }
  btn.disabled = true;
  status.textContent = 'đang mã hoá…';
  try {
    const iterations = Number($('linkIter').value) || C.DEFAULT_ITERATIONS;
    const result = await C.encryptLink(target, {
      keyUrl: SHARED_KEY_URL,
      sharedKey: master,
      passphrase: pass,
      iterations,
    });
    const snippet = C.buildLinkSnippet({
      token: result.token,
      style: $('linkStyle').value === 'stealth' ? 'stealth' : 'labeled',
      action: $('linkAction').value,
      keyUrl: absoluteUrl(SHARED_KEY_FILE),
      ...linkPassForSnippet(),
    });
    state.link = { token: result.token, snippet, url: target, header: result.header };

    $('linkToken').textContent = result.token;
    $('linkSnippet').textContent = snippet;
    $('linkTokenNote').textContent =
      `Dài ${result.token.length} ký tự · bảo vệ: ${mode === 'none' ? 'KHÔNG mật khẩu' : mode === 'embed' ? 'có mật khẩu (nhúng sẵn)' : 'có mật khẩu (hỏi khi chạy)'} · ` +
      `thời gian tạo (không mã hoá) ${result.header.t}`;
    $('linkSnippetNote').textContent =
      $('linkStyle').value === 'stealth'
        ? 'Ẩn dấu vết: không tiêu đề, không lộ link/tên API; dán vào Console (F12) hoặc tệp .js là chạy.'
        : 'Có chú thích: thấy rõ link key + cách dùng; dán vào Console (F12) hoặc tệp .js là chạy.';
    $('linkStats').innerHTML = [
      stat('Link gốc', `${target.length} ký tự`),
      stat('Token', `${result.token.length} ký tự`),
      stat('Snippet', `${snippet.length} ký tự`),
      stat('KDF', `${iterations.toLocaleString('vi-VN')} vòng`),
    ].join('');
    $('linkResultCard').hidden = false;
    status.textContent = 'xong';
    toast('Đã mã hoá link.', 'ok');
    return result;
  } catch (err) {
    status.textContent = '';
    toast('Không mã hoá được: ' + (err && err.message ? err.message : err), 'bad', 7000);
    return null;
  } finally {
    btn.disabled = false;
  }
}

async function decodeLinkFromUi() {
  const btn = $('linkDecodeBtn');
  const note = $('linkDecodeNote');
  const out = $('linkDecodeOut');
  const token = $('linkDecodeInput').value.trim();
  if (!token) {
    note.textContent = 'Chưa dán token.';
    return null;
  }
  const master = sharedMasterKey();
  if (!master) {
    note.textContent = 'Chưa nạp được aia.key.js — hãy tải lại trang.';
    return null;
  }
  btn.disabled = true;
  note.textContent = 'đang mở khoá…';
  try {
    const res = await C.decryptLink(token, {
      sharedKey: master,
      passphrase: $('linkDecodePass').value,
    });
    $('linkDecodeUrl').textContent = res.url;
    $('linkDecodeMeta').textContent = `· tạo lúc ${res.createdAt}`;
    const open = $('linkDecodeOpen');
    open.href = res.url;
    open.hidden = false;
    out.hidden = false;
    note.textContent = 'Mở khoá thành công.';
    toast('Đã mở khoá link.', 'ok');
    return res;
  } catch (err) {
    out.hidden = true;
    note.textContent = err && err.message ? err.message : 'Không mở được token.';
    toast('Không mở được: ' + note.textContent, 'bad', 7000);
    return null;
  } finally {
    btn.disabled = false;
  }
}

if ($('linkPassMode')) {
  $('linkPassMode').addEventListener('change', syncLinkPassUi);
  syncLinkPassUi();
}
if ($('linkEncrypt')) $('linkEncrypt').addEventListener('click', () => encryptLinkFromUi());
if ($('linkInput')) {
  $('linkInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      encryptLinkFromUi();
    }
  });
}
if ($('linkCopy')) {
  $('linkCopy').addEventListener('click', () => {
    const text = $('linkToken').textContent;
    if (!text) return toast('Chưa có token.', 'warn');
    copyToClipboard(text, 'Đã chép token.');
  });
}
if ($('linkSnippetCopy')) {
  $('linkSnippetCopy').addEventListener('click', () => {
    const text = $('linkSnippet').textContent;
    if (!text) return toast('Chưa có snippet.', 'warn');
    copyToClipboard(text, 'Đã chép snippet.');
  });
}
if ($('linkDecodeBtn')) $('linkDecodeBtn').addEventListener('click', () => decodeLinkFromUi());
if ($('linkDecodeCopy')) {
  $('linkDecodeCopy').addEventListener('click', () => {
    const url = $('linkDecodeUrl').textContent;
    if (!url || url === '—') return toast('Chưa có link.', 'warn');
    copyToClipboard(url, 'Đã chép link.');
  });
}

/* ------------------------------------------- tab Lập trình + GitHub --- */

const uiBridge = {
  toast,
  showView,
  copy: copyToClipboard,
  /**
   * Nhận code từ tab Lập trình rồi chuyển sang tab Mã hoá.
   * Dán vào ô là mã hoá luôn (giữ đúng hành vi cũ), nhưng vẫn hiện code cho người dùng thấy.
   */
  useSource: async (text, name) => {
    const box = $('pasteText');
    if (box) box.value = text;
    lastAutoText = text;
    showView('encrypt');
    await setSourceFromText(text, { name: name || 'script.js' });
  },
  editor: () =>
    globalThis.AIA_EDITOR && typeof globalThis.AIA_EDITOR.content === 'function'
      ? globalThis.AIA_EDITOR.content()
      : { content: '', name: 'script.js' },
  openGithub: (payload, tab) => {
    if (globalThis.AIA_GH) globalThis.AIA_GH.open(tab || (payload && payload.ship ? 'ship' : 'new'), payload || null);
    else toast('Chưa nạp được hộp thoại GitHub.', 'bad');
  },
};

initGithub(uiBridge);
initProgram(uiBridge);

/* --------------------------------------------------------------- khởi động --- */

if (!globalThis.crypto || !globalThis.crypto.subtle) {
  toast('Trình duyệt không cung cấp WebCrypto. Hãy mở trang bằng HTTPS hoặc http://localhost.', 'bad', 12000);
}
if (location.protocol === 'file:') {
  toast('Đang mở bằng file:// — WebCrypto và module có thể bị chặn. Hãy chạy "python3 -m http.server".', 'warn', 12000);
}
updateStrength();
