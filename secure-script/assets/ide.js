/* =============================================================================
 * AIA Secure Script — lõi "không gian làm việc" của tab Lập trình
 * -----------------------------------------------------------------------------
 * Phân tích từ trang tham chiếu `index.html.1.js` (Code Space) rồi viết lại
 * bằng JavaScript thuần, KHÔNG phụ thuộc Monaco/CDN, không có quảng cáo:
 *
 *   · nhiều tệp (tab) trong một không gian làm việc, lưu được vào localStorage
 *   · tìm / thay thế (phân biệt hoa-thường, đếm kết quả, thay tất cả)
 *   · định dạng code (JS/TS, Lua/Luau, Python, JSON) — dùng lại reverse.js
 *   · "ô lưu" dự án: tối đa 5 bản, có tên/thời gian/kích thước
 *
 * Toàn bộ hàm ở đây là HÀM THUẦN (trừ phần đọc/ghi storage được truyền vào),
 * nên chạy test được trên Node mà không cần DOM.
 * ========================================================================== */

import { beautify, detectLanguage } from './reverse.js';

export const MAX_FILES = 12;
export const MAX_FILE_CHARS = 4 * 1024 * 1024; // 4 triệu ký tự / tệp trong trình soạn thảo
export const MAX_WORKSPACE_BYTES = 2 * 1024 * 1024; // phần được lưu vào localStorage
export const MAX_SLOTS = 5;
export const MAX_SLOT_BYTES = 1.5 * 1024 * 1024;
export const WORKSPACE_KEY = 'aia.ide.workspace';
export const SLOTS_KEY = 'aia.ide.slots';

const SCRIPT_EXT = /\.(js|mjs|cjs|ts|tsx|jsx|lua|luau|py|json|txt|css|html?)$/i;

/** Bỏ ký tự cấm trong tên tệp, cắt ngắn, giữ đuôi. */
export function sanitizeFileName(raw, fallback = 'script.js') {
  let s = String(raw == null ? '' : raw)
    .trim()
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^\.+/, '')
    .slice(0, 80);
  if (!s) s = fallback;
  return s;
}

/** Tên duy nhất trong danh sách (script.js → script-2.js). */
export function uniqueFileName(name, files = [], exceptIndex = -1) {
  const base = sanitizeFileName(name);
  const taken = new Set(
    files
      .map((f, i) => (i === exceptIndex ? null : f && String(f.name || '').toLowerCase()))
      .filter(Boolean),
  );
  if (!taken.has(base.toLowerCase())) return base;
  const dot = base.lastIndexOf('.');
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot) : '';
  for (let n = 2; n < 1000; n++) {
    const candidate = stem + '-' + n + ext;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return stem + '-' + Date.now() + ext;
}

/** Tên tệp gợi ý khi thêm mới: script.js, script-2.js, … */
export function nextFileName(files = [], ext = '.js') {
  return uniqueFileName('script' + ext, files);
}

function normalizeFile(entry, index) {
  const name = sanitizeFileName(entry && entry.name, 'script' + (index ? '-' + (index + 1) : '') + '.js');
  let content = entry && entry.content != null ? String(entry.content) : '';
  if (content.length > MAX_FILE_CHARS) content = content.slice(0, MAX_FILE_CHARS);
  return { name, content };
}

/** Tạo không gian làm việc hợp lệ (luôn có ít nhất 1 tệp). */
export function createWorkspace(files) {
  const list = Array.isArray(files) && files.length ? files.slice(0, MAX_FILES) : [{ name: 'script.js', content: '' }];
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const file = normalizeFile(list[i], i);
    file.name = uniqueFileName(file.name, out);
    out.push(file);
  }
  return { files: out, active: 0 };
}

export function activeFile(ws) {
  if (!ws || !Array.isArray(ws.files) || !ws.files.length) return { name: 'script.js', content: '' };
  const i = Math.min(Math.max(0, Number(ws.active) || 0), ws.files.length - 1);
  return ws.files[i];
}

export function setActive(ws, index) {
  if (!ws || !Array.isArray(ws.files) || !ws.files.length) return ws;
  ws.active = Math.min(Math.max(0, Number(index) || 0), ws.files.length - 1);
  return ws;
}

/** Thêm tệp; trả về chỉ số tệp mới (hoặc -1 nếu đã đầy). */
export function addFile(ws, { name, content = '' } = {}) {
  if (!ws || !Array.isArray(ws.files)) return -1;
  if (ws.files.length >= MAX_FILES) return -1;
  const fileName = uniqueFileName(name || nextFileName(ws.files), ws.files);
  const file = normalizeFile({ name: fileName, content }, ws.files.length);
  file.name = uniqueFileName(file.name, ws.files);
  ws.files.push(file);
  ws.active = ws.files.length - 1;
  return ws.active;
}

/** Đổi tên tệp đang ở `index`; trả về tên thật sự dùng được. */
export function renameFile(ws, index, name) {
  if (!ws || !ws.files[index]) return null;
  const next = uniqueFileName(name || ws.files[index].name, ws.files, index);
  ws.files[index].name = next;
  return next;
}

/** Xoá tệp; không bao giờ xoá tệp cuối cùng (thay bằng tệp rỗng). */
export function removeFile(ws, index) {
  if (!ws || !Array.isArray(ws.files)) return ws;
  const i = Math.min(Math.max(0, Number(index) || 0), ws.files.length - 1);
  if (ws.files.length <= 1) {
    ws.files[0] = { name: ws.files[0].name || 'script.js', content: '' };
    ws.active = 0;
    return ws;
  }
  ws.files.splice(i, 1);
  if (ws.active >= ws.files.length) ws.active = ws.files.length - 1;
  return ws;
}

export function workspaceBytes(ws) {
  if (!ws || !Array.isArray(ws.files)) return 0;
  return ws.files.reduce((sum, f) => sum + utf8Length(f.name) + utf8Length(f.content), 0);
}

function utf8Length(text) {
  const s = String(text == null ? '' : text);
  if (typeof TextEncoder === 'function') return new TextEncoder().encode(s).length;
  return s.length;
}

/* ------------------------------------------------- lưu / đọc không gian --- */

export function serializeWorkspace(ws) {
  const files = (ws && Array.isArray(ws.files) ? ws.files : []).map((f) => ({
    name: sanitizeFileName(f.name),
    content: String(f.content == null ? '' : f.content),
  }));
  return JSON.stringify({ v: 1, active: ws && ws.active ? ws.active : 0, files });
}

/** Đọc JSON đã lưu; trả về null nếu hỏng/không hợp lệ. */
export function parseWorkspace(raw) {
  if (!raw) return null;
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || !Array.isArray(data.files) || !data.files.length) return null;
  const ws = createWorkspace(data.files);
  ws.active = Math.min(Math.max(0, Number(data.active) || 0), ws.files.length - 1);
  return ws;
}

export function storeWorkspace(storage, ws) {
  try {
    const text = serializeWorkspace(ws);
    if (text.length > MAX_WORKSPACE_BYTES) return { ok: false, reason: 'too-big', bytes: text.length };
    storage.setItem(WORKSPACE_KEY, text);
    return { ok: true, bytes: text.length };
  } catch (err) {
    return { ok: false, reason: 'storage', message: err && err.message };
  }
}

export function loadWorkspace(storage) {
  try {
    return parseWorkspace(storage && storage.getItem(WORKSPACE_KEY));
  } catch {
    return null;
  }
}

/* --------------------------------------------------------- tìm / thay --- */

/**
 * Tìm mọi vị trí của `query` trong `text`.
 * @returns {Array<{start:number,end:number,line:number}>} (tối đa `limit` kết quả)
 */
export function findMatches(text, query, opts = {}) {
  const src = String(text == null ? '' : text);
  const needle = String(query == null ? '' : query);
  const limit = Number(opts.limit) || 5000;
  if (!needle) return [];
  const caseSensitive = !!opts.caseSensitive;
  const haystack = caseSensitive ? src : src.toLowerCase();
  const find = caseSensitive ? needle : needle.toLowerCase();
  const out = [];
  let from = 0;
  let line = 1;
  let countedTo = 0;
  while (out.length < limit) {
    const at = haystack.indexOf(find, from);
    if (at < 0) break;
    for (let i = countedTo; i < at; i++) if (src.charCodeAt(i) === 10) line++;
    countedTo = at;
    out.push({ start: at, end: at + needle.length, line });
    from = at + Math.max(1, needle.length);
  }
  return out;
}

/** Chỉ số của kết quả kế tiếp tính từ vị trí con trỏ (quay vòng). */
export function findNextIndex(matches, fromPos = 0) {
  if (!Array.isArray(matches) || !matches.length) return -1;
  const pos = Math.max(0, Number(fromPos) || 0);
  for (let i = 0; i < matches.length; i++) if (matches[i].start >= pos) return i;
  return 0;
}

/** Chỉ số của kết quả trước đó (quay vòng). */
export function findPrevIndex(matches, fromPos = 0) {
  if (!Array.isArray(matches) || !matches.length) return -1;
  const pos = Math.max(0, Number(fromPos) || 0);
  for (let i = matches.length - 1; i >= 0; i--) if (matches[i].start < pos) return i;
  return matches.length - 1;
}

/** Thay tất cả; trả về { text, count }. */
export function replaceAllText(text, query, replacement, opts = {}) {
  const src = String(text == null ? '' : text);
  const matches = findMatches(src, query, opts);
  if (!matches.length) return { text: src, count: 0 };
  const rep = String(replacement == null ? '' : replacement);
  const parts = [];
  let last = 0;
  for (const m of matches) {
    parts.push(src.slice(last, m.start), rep);
    last = m.end;
  }
  parts.push(src.slice(last));
  return { text: parts.join(''), count: matches.length };
}

/* ------------------------------------------------------------- định dạng --- */

/**
 * Định dạng code. Trả về { ok, code, lang, message }.
 * Không bao giờ ném lỗi — lỗi được trả trong message để giao diện hiển thị.
 */
export function formatCode(code, opts = {}) {
  const src = String(code == null ? '' : code);
  if (!src.trim()) return { ok: false, code: src, lang: 'text', message: 'Chưa có code để định dạng.' };
  if (src.length > MAX_FILE_CHARS) {
    return { ok: false, code: src, lang: 'text', message: 'Tệp quá lớn để định dạng trong trình duyệt.' };
  }
  const lang = String(opts.lang || detectLanguage(src) || 'javascript').toLowerCase();

  if (lang === 'json') {
    try {
      const value = JSON.parse(src);
      return { ok: true, code: JSON.stringify(value, null, 2), lang };
    } catch (err) {
      return { ok: false, code: src, lang, message: 'JSON không hợp lệ: ' + ((err && err.message) || 'lỗi cú pháp') };
    }
  }

  // Nội dung bắt đầu bằng { hoặc [ và parse được ⇒ chắc chắn là JSON,
  // dù tên tệp là .js (người dùng hay đặt sai đuôi).
  if (/^[\[{]/.test(src.trim())) {
    try {
      const value = JSON.parse(src);
      return { ok: true, code: JSON.stringify(value, null, 2), lang: 'json' };
    } catch {
      /* không phải JSON — thử tiếp như code bình thường */
    }
  }

  if (lang === 'html' || lang === 'css') {
    return {
      ok: false,
      code: src,
      lang,
      message: 'Chưa hỗ trợ định dạng ' + lang.toUpperCase() + ' — chỉ JS/TS, Lua/Luau, Python, JSON.',
    };
  }

  try {
    const out = beautify(src, { lang });
    if (typeof out !== 'string' || !out.trim()) {
      return { ok: false, code: src, lang, message: 'Không định dạng được (bộ định dạng trả về rỗng).' };
    }
    return { ok: true, code: out, lang };
  } catch (err) {
    return { ok: false, code: src, lang, message: 'Không định dạng được: ' + ((err && err.message) || 'lỗi') };
  }
}

/* -------------------------------------------------------------- ô lưu --- */

export function makeSlot({ name, files, active = 0, now = Date.now(), id } = {}) {
  const ws = createWorkspace(files);
  ws.active = Math.min(Math.max(0, Number(active) || 0), ws.files.length - 1);
  const cleanName = String(name == null ? '' : name).trim().slice(0, 60) || 'Bản lưu';
  return {
    id: id || 's' + now.toString(36) + Math.random().toString(36).slice(2, 7),
    name: cleanName,
    at: Number(now) || Date.now(),
    active: ws.active,
    files: ws.files.map((f) => ({ name: f.name, content: f.content })),
  };
}

export function slotBytes(slot) {
  if (!slot || !Array.isArray(slot.files)) return 0;
  return slot.files.reduce((sum, f) => sum + utf8Length(f.name) + utf8Length(f.content), 0);
}

/** Chuẩn hoá danh sách ô lưu đọc từ storage (bỏ bản hỏng, cắt quá 5 ô). */
export function normalizeSlots(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const item of list) {
    if (!item || !Array.isArray(item.files) || !item.files.length) continue;
    const ws = createWorkspace(item.files);
    out.push({
      id: String(item.id || 's' + out.length + '-' + (Number(item.at) || 0)),
      name: String(item.name || 'Bản lưu').slice(0, 60),
      at: Number(item.at) || 0,
      active: Math.min(Math.max(0, Number(item.active) || 0), ws.files.length - 1),
      files: ws.files.map((f) => ({ name: f.name, content: f.content })),
    });
    if (out.length >= MAX_SLOTS) break;
  }
  return out;
}

export function loadSlots(storage) {
  try {
    const raw = storage && storage.getItem(SLOTS_KEY);
    if (!raw) return [];
    return normalizeSlots(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function persistSlots(storage, slots) {
  try {
    const text = JSON.stringify(normalizeSlots(slots));
    if (text.length > MAX_SLOT_BYTES * MAX_SLOTS) return { ok: false, reason: 'too-big' };
    storage.setItem(SLOTS_KEY, text);
    return { ok: true, bytes: text.length };
  } catch (err) {
    return { ok: false, reason: 'storage', message: err && err.message };
  }
}

/** Thêm mới hoặc ghi đè (cùng id). Trả về { slots, ok, reason }. */
export function upsertSlot(slots, slot) {
  const list = normalizeSlots(slots);
  const index = list.findIndex((s) => s.id === slot.id);
  if (index >= 0) {
    list[index] = slot;
    return { slots: list, ok: true, replaced: true };
  }
  if (list.length >= MAX_SLOTS) return { slots: list, ok: false, reason: 'full' };
  if (slotBytes(slot) > MAX_SLOT_BYTES) return { slots: list, ok: false, reason: 'too-big' };
  list.unshift(slot);
  return { slots: list.slice(0, MAX_SLOTS), ok: true, replaced: false };
}

export function removeSlot(slots, id) {
  return normalizeSlots(slots).filter((s) => s.id !== id);
}

export function renameSlot(slots, id, name) {
  return normalizeSlots(slots).map((s) => (s.id === id ? { ...s, name: String(name || '').trim().slice(0, 60) || s.name } : s));
}

export function findSlot(slots, id) {
  return normalizeSlots(slots).find((s) => s.id === id) || null;
}

/** Mô tả ngắn để hiển thị trong danh sách. */
export function describeSlot(slot) {
  const files = (slot && slot.files) || [];
  return {
    fileCount: files.length,
    bytes: slotBytes(slot),
    at: Number(slot && slot.at) || 0,
  };
}

/** Có phải tên tệp trông như script không (để bật/tắt nút Chạy). */
export function looksLikeScript(name) {
  return SCRIPT_EXT.test(String(name || ''));
}
