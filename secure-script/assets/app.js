/* =============================================================================
 * AIA Secure Script — Giao diện
 * Không có backend. Mọi thứ chạy trong trình duyệt của người dùng.
 * ========================================================================== */

import * as C from './core.js';
import { applyReverseAction, detectLanguage } from './reverse.js';

const $ = (id) => document.getElementById(id);
const BIG_MEMORY_LIMIT = 256 * 1024 * 1024; // trên mức này, ghi thẳng ra tệp nếu trình duyệt cho phép
const PREVIEW_LIMIT = 32 * 1024 * 1024; // giới hạn để "chạy thử ngay" trong RAM

const state = {
  source: null, // { name, size, type, bytes|null, openStream() }
  cancelled: false,
  busy: false,
  artifacts: new Map(), // name -> {name, size, data (Uint8Array|string)|handle}
  lastCipher: null, // { bytes, meta, options }
  decrypted: null, // { bytes, meta }
  worker: null,
  runStartedAt: 0,
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

function humanPercent(a, b) {
  if (!b) return '0%';
  return Math.min(100, Math.round((a / b) * 100)) + '%';
}

function speedText(bytes, seconds) {
  if (!seconds || seconds <= 0) return '—';
  return C.formatBytes(bytes / seconds) + '/s';
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
$('pasteUse').addEventListener('click', () => {
  const text = $('pasteText').value;
  if (!text.trim()) return toast('Chưa có nội dung để dùng.', 'warn');
  setSourceFromText(text);
  $('pasteBox').hidden = true;
});

function setSourceFromFile(file) {
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
  };
  maybeSuggestKeyUrl();
  updateSourceInfo();
  resetResult();
}

function setSourceFromText(text) {
  state.lastCipher = null;
  const bytes = new TextEncoder().encode(text);
  state.source = {
    name: 'script.js',
    size: bytes.length,
    type: 'text/javascript',
    bytes,
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
  toast('Đã nạp code từ ô dán.', 'ok');
}

function maybeSuggestKeyUrl() {
  if (keyUrlTouched || !state.source) return;
  $('keyUrl').value = './' + C.slugify(state.source.name) + '.key.js';
}

function updateSourceInfo() {
  const s = state.source;
  if (!s) {
    $('fileInfo').textContent = 'chưa chọn tệp';
    return;
  }
  const lang = C.detectLang(s.name);
  $('fileInfo').innerHTML = `<b>${escapeHtml(s.name)}</b> · ${C.formatBytes(s.size)} · ${lang}`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
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
$('pass').addEventListener('input', updateStrength);

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

$('encryptBtn').addEventListener('click', () => {
  if (state.busy) return;
  if (!state.source) {
    toast('Hãy chọn một tệp hoặc dán code trước.', 'warn');
    $('drop').focus();
    return;
  }
  runEncryption().catch((err) => {
    setBusy(false);
    $('progressWrap').hidden = true;
    if (err && err.code === 'CANCELLED') {
      toast('Đã dừng mã hoá.', 'warn');
      return;
    }
    console.error(err);
    toast('Mã hoá thất bại: ' + (err && err.message ? err.message : err), 'bad', 8000);
  });
});

$('cancelBtn').addEventListener('click', () => {
  state.cancelled = true;
});

function resetResult() {
  $('resultCard').hidden = true;
  $('progressWrap').hidden = true;
  $('progBar').style.width = '0%';
  state.artifacts.clear();
}

async function runEncryption() {
  const src = state.source;
  const passphrase = $('pass').value;
  const slug = C.slugify(src.name);
  const payloadFile = slug + '.aia';
  const keyFileName = `${slug}.key.js`;
  const runnerFileName = `run-${slug}.html`;
  const readmeFileName = `README-${slug}.txt`;
  const expiryValue = $('expiry').value;

  const options = {
    keyUrl: $('keyUrl').value.trim() || './key.js',
    passphrase,
    iterations: Number($('iter').value),
    chunkSize: Number($('chunk').value),
    expiry: expiryValue ? new Date(expiryValue).toISOString() : null,
    note: $('note').value.trim(),
    fileName: src.name,
    fileType: src.type,
    lang: C.detectLang(src.name),
    hashPlaintext: $('hashChk').checked,
    requireKeyScript: $('requireKeyChk').checked,
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
  const keyText = C.buildKeyScript(meta, { embeddedPassphrase: embedPass ? passphrase : null });
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
      const check = await C.decryptBytes(containerBytes, passphrase, null, meta.keyWrap || null);
      verified = (await C.sha256Hex(check.plaintext)) === (await C.sha256Hex(original));
    } catch (err) {
      verified = false;
      console.warn('Tự kiểm tra thất bại', err);
    }
  }

  renderResult({ meta, options, elapsed, verified, keyText, zipSize, sink });
  $('progressWrap').hidden = true;
  $('progBar').style.width = '100%';
  toast(verified === false ? 'Đã mã hoá nhưng tự kiểm tra KHÔNG khớp — hãy thử lại.' : 'Mã hoá xong.', verified === false ? 'bad' : 'ok', 6000);
}

function renderResult({ meta, options, elapsed, verified, keyText, zipSize, sink }) {
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
    stat('Tăng thêm', `${C.formatBytes(overhead)} (${pct < 0.01 ? pct.toFixed(4) : pct.toFixed(3)}%)`),
    stat('Số khối', meta.chunk.total.toLocaleString('vi-VN')),
    stat('Thời gian', C.formatDuration(elapsed * 1000)),
    stat('Tốc độ', speedText(plain, elapsed)),
    stat('KDF', `PBKDF2 ${meta.kdf.iterations.toLocaleString('vi-VN')}`),
    stat('Tự kiểm tra', verified === null ? 'bỏ qua (tệp lớn)' : verified ? 'khớp 100%' : 'KHÔNG khớp'),
    plain > 0 && plain < 4096 ? stat('Ghi chú', 'header ~0,7 KB nên tệp rất nhỏ sẽ có % tăng cao — bình thường') : '',
    zipSize ? stat('ZIP', C.formatBytes(zipSize)) : '',
  ].join('');

  $('dlZip').style.display = zipName ? '' : 'none';
  $('dlContainer').style.display = state.artifacts.get(payloadName).data ? '' : 'none';
  $('dlContainer').textContent = sink.kind === 'file' ? 'đã ghi ra đĩa' : 'Tải .aia';
  $('dlContainer').disabled = !state.artifacts.get(payloadName).data;
  $('testRunBtn').disabled = !state.lastCipher.bytes || plain > PREVIEW_LIMIT || !isRunnable(meta.file);

  $('keyPreview').textContent = keyText;
  const publicMeta = { ...meta };
  delete publicMeta.keyWrap;
  $('metaPreview').textContent = JSON.stringify(publicMeta, null, 2);
  $('metaNote').textContent =
    meta.keyWrapIn === 'key-script'
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

function isRunnable(fileMeta) {
  return C.isRunnableLang(fileMeta.lang);
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
    });
    appendLog(log, 'ok', `[AIA] giải mã OK: ${plaintext.length} byte.`);
    const code = new TextDecoder().decode(plaintext);
    if (!isRunnable(meta.file)) {
      log.textContent += '\n' + code.slice(0, 3000);
      appendLog(log, 'warn', '[AIA] Định dạng này không chạy trực tiếp trong trình duyệt — chỉ hiển thị trước.');
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
    else if (d.type === 'error') appendLog(log, 'err', '[runtime] ' + d.message);
    else if (d.type === 'done') {
      appendLog(log, 'sys', `[AIA] chạy xong phần đồng bộ · ${C.formatDuration(performance.now() - state.runStartedAt)}`);
      try { URL.revokeObjectURL(url); } catch { /* ignore */ }
    }
  };
  worker.onerror = (e) => appendLog(log, 'err', '[worker] ' + (e.message || 'lỗi không rõ'));
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
      meta.keyWrapIn === 'key-script'
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
      if (isRunnable(meta.file)) runInWorker(code, log);
      else appendLog(log, 'warn', `[AIA] ${meta.file.lang} không chạy trực tiếp trong trình duyệt — dùng "Tải bản rõ".`);
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

/* --------------------------------------------------------------- khởi động --- */

if (!globalThis.crypto || !globalThis.crypto.subtle) {
  toast('Trình duyệt không cung cấp WebCrypto. Hãy mở trang bằng HTTPS hoặc http://localhost.', 'bad', 12000);
}
if (location.protocol === 'file:') {
  toast('Đang mở bằng file:// — WebCrypto và module có thể bị chặn. Hãy chạy "python3 -m http.server".', 'warn', 12000);
}
updateStrength();
