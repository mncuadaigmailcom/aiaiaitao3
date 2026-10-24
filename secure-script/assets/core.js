/* =============================================================================
 * AIA Secure Script — Lõi mã hoá (dùng chung cho trình duyệt và Node.js)
 * -----------------------------------------------------------------------------
 * Định dạng tệp .aia (AIA1):
 *   [8 byte MAGIC "AIASCR1\n"] [4 byte LE: độ dài header JSON] [header JSON UTF-8]
 *   [khối 0][khối 1]...[khối n-1]
 *
 * Mỗi "khối" = AES-256-GCM( bản rõ của khối ) kèm 16 byte tag.
 *  - Khoá: PBKDF2-HMAC-SHA256 (mặc định 600.000 vòng) trên chuỗi:
 *      JSON [1, time.raw, time.unixMs, keyUrl, passphrase]
 *    salt 16 byte ngẫu nhiên cho từng tệp.
 *  - IV của từng khối: 8 byte ngẫu nhiên (ivPrefix) + 4 byte số thứ tự khối (big endian).
 *  - AAD của từng khối: MAGIC + version + index + cờ "khối cuối" + tổng số khối.
 *    => Đổi thứ tự / cắt bớt / chèn khối đều bị phát hiện.
 *  - Header KHÔNG mã hoá (theo yêu cầu) để có thể đọc ngày giờ + link key script.
 *  - Không dùng base64 cho dữ liệu => chi phí tăng kích thước ~ 16 byte / 1 MiB
 *    (≈ 0,0015%) + header ~1 KB.
 * ========================================================================== */

export const VERSION = 1;
export const MAGIC = new Uint8Array([0x41, 0x49, 0x41, 0x53, 0x43, 0x52, 0x31, 0x0a]); // "AIASCR1\n"
export const HEADER_PREFIX_BYTES = 12; // 8 magic + 4 độ dài
export const TAG_BYTES = 16;
export const DEFAULT_CHUNK_SIZE = 1024 * 1024; // 1 MiB
export const DEFAULT_ITERATIONS = 600000;
export const MAX_INPUT_BYTES = 5 * 1024 * 1024 * 1024; // 5 GiB
export const SMALL_FILE_HASH_LIMIT = 64 * 1024 * 1024; // chỉ băm SHA-256 khi ≤ 64 MiB
export const ZIP_LIMIT = 256 * 1024 * 1024; // chỉ đóng zip khi tổng ≤ 256 MiB

const te = new TextEncoder();
const td = new TextDecoder();

/* ------------------------------------------------------------------ Lỗi --- */

export class AIAError extends Error {
  constructor(code, message, details) {
    super(message || code);
    this.name = 'AIAError';
    this.code = code;
    this.details = details || null;
  }
}

/* -------------------------------------------------------------- Tiện ích --- */

export function randomBytes(n) {
  if (!Number.isFinite(n) || n < 0) throw new AIAError('BAD_LENGTH', 'Số byte ngẫu nhiên không hợp lệ.');
  const out = new Uint8Array(n);
  const c = globalThis.crypto;
  if (!c || typeof c.getRandomValues !== 'function') {
    throw new AIAError('NO_CRYPTO', 'Môi trường không có crypto.getRandomValues');
  }
  // getRandomValues giới hạn 65.536 byte mỗi lần ⇒ chia nhỏ để dùng được cả với khối lớn.
  const MAX = 65536;
  for (let off = 0; off < n; off += MAX) {
    c.getRandomValues(out.subarray(off, Math.min(off + MAX, n)));
  }
  return out;
}

export function bytesToBase64(bytes) {
  let s = '';
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
  }
  return btoa(s);
}

export function base64ToBytes(str) {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToHex(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, '0');
  return s;
}

export function concatBytes(list) {
  let total = 0;
  for (const b of list) total += b.length;
  const out = new Uint8Array(total);
  let off = 0;
  for (const b of list) {
    out.set(b, off);
    off += b.length;
  }
  return out;
}

export function utf8(str) {
  return te.encode(str);
}

export function fromUtf8(bytes) {
  return td.decode(bytes);
}

export function formatBytes(n) {
  if (!Number.isFinite(n)) return '—';
  if (n < 1024) return Math.round(n) + ' B';
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)) + ' ' + units[i];
}

export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 1000) return Math.round(ms) + ' ms';
  const s = ms / 1000;
  if (s < 60) return s.toFixed(1) + ' s';
  const m = Math.floor(s / 60);
  return m + ' phút ' + Math.round(s - m * 60) + ' s';
}

/* ------------------------------------------------- Thời gian (không mã) --- */

/**
 * Yêu cầu: mỗi lần mã hoá phải kết hợp năm/tháng/ngày/giờ/phút/giây/mili-giây
 * và "chữa cấy thời gian ... không mã hoá để nhận biết".
 * => Toàn bộ mốc thời gian nằm trong header dạng ĐỌC ĐƯỢC.
 */
export function makeTimestamp(date = new Date()) {
  const p2 = (n) => String(n).padStart(2, '0');
  const p3 = (n) => String(n).padStart(3, '0');
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();
  const ms = date.getMilliseconds();
  const pad = (n, w) => String(n).padStart(w, '0');
  return {
    raw: `${pad(year, 4)}${p2(month)}${p2(day)}${p2(hour)}${p2(minute)}${p2(second)}${p3(ms)}`,
    readable: `${pad(year, 4)}-${p2(month)}-${p2(day)} ${p2(hour)}:${p2(minute)}:${p2(second)}.${p3(ms)}`,
    year, month, day, hour, minute, second, ms,
    unixMs: date.getTime(),
    iso: date.toISOString(),
    timezoneOffset: -date.getTimezoneOffset(),
  };
}

export function timestampFromMeta(meta) {
  return (
    (meta && meta.time && (meta.time.readable || meta.time.iso)) ||
    (meta && meta.createdAt) ||
    'không rõ'
  );
}

/* ------------------------------------------------------------ Khoá (KDF) --- */

export function buildKeyMaterial({ timeRaw, unixMs, keyUrl, passphrase, sharedKey }) {
  // JSON để tránh nhập nhằng dấu phân cách nếu URL có ký tự lạ.
  // Chỉ nối thêm khoá dùng chung khi có ⇒ tệp cũ (không dùng khoá chung) giữ nguyên khoá.
  const parts = [1, String(timeRaw), Number(unixMs), String(keyUrl || ''), String(passphrase || '')];
  const shared = sharedKeyToString(sharedKey);
  if (shared) parts.push(shared);
  return JSON.stringify(parts);
}

export function sharedKeyToString(sharedKey) {
  if (!sharedKey) return '';
  const bytes = typeof sharedKey === 'string' ? base64ToBytes(sharedKey) : new Uint8Array(sharedKey);
  if (bytes.length !== 32) throw new AIAError('BAD_SHARED_KEY', 'Khoá dùng chung phải đúng 32 byte.');
  return bytesToBase64(bytes);
}

async function deriveBits({ timeRaw, unixMs, keyUrl, passphrase, salt, iterations, sharedKey }) {
  const subtle = globalThis.crypto && globalThis.crypto.subtle;
  if (!subtle) throw new AIAError('NO_CRYPTO', 'Môi trường không hỗ trợ WebCrypto (cần HTTPS hoặc localhost)');
  const material = buildKeyMaterial({ timeRaw, unixMs, keyUrl, passphrase, sharedKey });
  const baseKey = await subtle.importKey('raw', utf8(material), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: iterations || DEFAULT_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    256,
  );
  return new Uint8Array(bits);
}

/** kid = 8 byte đầu của SHA-256(khoá thô) — dùng để báo "sai mật khẩu" cho rõ ràng. */
export async function keyIdFromBits(bits) {
  const digest = await asyncSubtle().digest('SHA-256', bits);
  return bytesToHex(new Uint8Array(digest).subarray(0, 8));
}

function asyncSubtle() {
  const subtle = globalThis.crypto && globalThis.crypto.subtle;
  if (!subtle) throw new AIAError('NO_CRYPTO', 'Môi trường không hỗ trợ WebCrypto');
  return subtle;
}

export async function deriveAesKey({ timeRaw, unixMs, keyUrl, passphrase, salt, iterations, sharedKey }, usages = ['decrypt']) {
  const bits = await deriveBits({ timeRaw, unixMs, keyUrl, passphrase, salt, iterations, sharedKey });
  const kid = await keyIdFromBits(bits);
  const key = await asyncSubtle().importKey('raw', bits, { name: 'AES-GCM' }, false, usages);
  return { key, kid };
}

/* ---------------------------------------------------------- Khối AES-GCM --- */

/**
 * AAD = magic(8) ‖ version(1) ‖ index(4) ‖ cờ-cuối(1) ‖ tổng-khối(4) [‖ SHA-256 header(32)]
 * Có header digest ⇒ mọi thay đổi trong header (kể cả ghi chú, tên tệp, thời gian đọc được)
 * đều làm hỏng việc giải mã. Bản cũ không có digest vẫn giải mã được (AAD 18 byte).
 */
export function buildAad(index, isLast, totalChunks, headerDigest = null) {
  const aad = new Uint8Array(headerDigest ? 50 : 18);
  aad.set(MAGIC, 0); // 0..7
  aad[8] = VERSION; // 8
  const dv = new DataView(aad.buffer);
  dv.setUint32(9, index >>> 0, false); // 9..12
  aad[13] = isLast ? 1 : 0; // 13
  dv.setUint32(14, totalChunks >>> 0, false); // 14..17
  if (headerDigest) aad.set(headerDigest, 18); // 18..49
  return aad;
}

export function buildIv(ivPrefix, index) {
  const iv = new Uint8Array(12);
  iv.set(ivPrefix, 0);
  new DataView(iv.buffer).setUint32(8, index >>> 0, false);
  return iv;
}

export async function sealChunk(key, { index, isLast, total, ivPrefix, bytes, headerDigest = null }) {
  return new Uint8Array(
    await asyncSubtle().encrypt(
      {
        name: 'AES-GCM',
        iv: buildIv(ivPrefix, index),
        additionalData: buildAad(index, isLast, total, headerDigest),
        tagLength: 128,
      },
      key,
      bytes,
    ),
  );
}

export async function openChunk(key, { index, isLast, total, ivPrefix, bytes, headerDigest = null }) {
  try {
    return new Uint8Array(
      await asyncSubtle().decrypt(
        {
          name: 'AES-GCM',
          iv: buildIv(ivPrefix, index),
          additionalData: buildAad(index, isLast, total, headerDigest),
          tagLength: 128,
        },
        key,
        bytes,
      ),
    );
  } catch (err) {
    throw new AIAError(
      'AUTH_FAILED',
      `Không giải mã được khối #${index}: sai mật khẩu hoặc tệp đã bị sửa/hỏng.`,
      err,
    );
  }
}

/* ------------------------------------------------ Băm toàn vẹn header --- */

export const HEADER_DIGEST_PLACEHOLDER = '0'.repeat(64);

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

/**
 * Băm header: SHA-256 của JSON header với trường headerHash tạm đặt bằng 64 số 0.
 * Nhờ vậy digest có thể nằm trong chính header mà vẫn tính được (độ dài cố định),
 * và được đưa vào AAD của mọi khối + AAD bọc khoá tệp.
 */
export async function computeHeaderDigest(meta) {
  const clone = { ...meta, headerHash: HEADER_DIGEST_PLACEHOLDER };
  delete clone.keyWrap; // khoá tệp chỉ nằm trong key script, không thuộc header
  delete clone.encryptionSeconds;
  return sha256Hex(utf8(JSON.stringify(clone)));
}

export async function verifyHeaderDigest(meta) {
  if (!meta || !meta.headerHash) return { ok: true, legacy: true, digest: null };
  const actual = await computeHeaderDigest(meta);
  if (actual !== meta.headerHash) return { ok: false, legacy: false, digest: null };
  return { ok: true, legacy: false, digest: hexToBytes(actual) };
}

/* --------------------------------------------------------------- Header --- */

export function buildContainerHeader(meta) {
  const json = utf8(JSON.stringify(meta));
  const out = new Uint8Array(HEADER_PREFIX_BYTES + json.length);
  out.set(MAGIC, 0);
  new DataView(out.buffer).setUint32(8, json.length, true); // LE
  out.set(json, HEADER_PREFIX_BYTES);
  return out;
}

export function parseContainerHeader(buffer) {
  if (!buffer || buffer.length < HEADER_PREFIX_BYTES) {
    throw new AIAError('BAD_CONTAINER', 'Tệp quá nhỏ để là tệp .aia hợp lệ.');
  }
  for (let i = 0; i < MAGIC.length; i++) {
    if (buffer[i] !== MAGIC[i]) {
      throw new AIAError('BAD_MAGIC', 'Không phải tệp .aia của AIA Secure Script.');
    }
  }
  const len = new DataView(buffer.buffer, buffer.byteOffset + 8, 4).getUint32(0, true);
  if (len <= 0 || len > 1024 * 1024) throw new AIAError('BAD_HEADER', 'Header không hợp lệ.');
  if (buffer.length < HEADER_PREFIX_BYTES + len) throw new AIAError('BAD_HEADER', 'Header bị cắt cụt.');
  const json = fromUtf8(buffer.subarray(HEADER_PREFIX_BYTES, HEADER_PREFIX_BYTES + len));
  let meta;
  try {
    meta = JSON.parse(json);
  } catch {
    throw new AIAError('BAD_HEADER', 'Header JSON hỏng.');
  }
  return { meta, headerBytes: buffer.subarray(0, HEADER_PREFIX_BYTES + len), headerLength: HEADER_PREFIX_BYTES + len };
}

/* ----------------------------------------------------- Đọc luồng (stream) --- */

export function toReadIterator(source) {
  if (!source) throw new AIAError('NO_SOURCE', 'Thiếu nguồn dữ liệu.');
  if (typeof source.getReader === 'function') return source.getReader();
  if (typeof source[Symbol.asyncIterator] === 'function') return source[Symbol.asyncIterator]();
  if (typeof source[Symbol.iterator] === 'function') {
    const it = source[Symbol.iterator]();
    return { async read() { return it.next(); } };
  }
  throw new AIAError('BAD_SOURCE', 'Nguồn dữ liệu không phải stream/async iterable.');
}

export class StreamReader {
  constructor(source) {
    this.it = toReadIterator(source);
    this.buf = new Uint8Array(0);
    this.done = false;
    this.totalRead = 0;
  }

  async _pull() {
    if (this.done) return false;
    const r = await this.it.read();
    if (r.done) {
      this.done = true;
      return false;
    }
    const value = r.value instanceof Uint8Array ? r.value : new Uint8Array(r.value);
    if (value.length === 0) return true; // bỏ qua mảnh rỗng
    this.buf = this.buf.length ? concatBytes([this.buf, value]) : value;
    return true;
  }

  async readExact(n) {
    while (this.buf.length < n) {
      const ok = await this._pull();
      if (!ok) {
        throw new AIAError('UNEXPECTED_EOF', `Tệp bị cắt cụt: cần ${n} byte, còn ${this.buf.length} byte.`);
      }
    }
    const out = this.buf.subarray(0, n);
    this.buf = this.buf.subarray(n);
    this.totalRead += n;
    return out;
  }

  async readAny(max) {
    if (this.buf.length === 0) {
      const ok = await this._pull();
      if (!ok) return null;
    }
    const n = Math.min(max, this.buf.length);
    const out = this.buf.subarray(0, n);
    this.buf = this.buf.subarray(n);
    this.totalRead += n;
    return out;
  }

  async hasMore() {
    if (this.buf.length > 0) return true;
    return await this._pull();
  }
}

/* --------------------------------------------- Khoá tệp bọc trong key script --- */

/**
 * Chế độ "bắt buộc key script": dữ liệu được mã hoá bằng một khoá NGẪU NHIÊN
 * (fileKey). fileKey chỉ tồn tại ở dạng ĐÃ BỌC (AES-GCM) trong META của key script,
 * không nằm trong header tệp .aia. Vì vậy thiếu key script là không thể giải mã,
 * dù biết mật khẩu và đọc được header.
 */
export function wrapAad({ id, timeRaw, unixMs, keyUrl, headerHash = null }) {
  return utf8(JSON.stringify(['AIA1-WRAP', String(id), String(timeRaw), Number(unixMs), String(keyUrl), headerHash || '']));
}

async function wrapFileKey(wrapKey, fileKey, aad) {
  const iv = randomBytes(12);
  const ct = new Uint8Array(
    await asyncSubtle().encrypt({ name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 }, wrapKey, fileKey),
  );
  return { alg: 'AES-256-GCM', iv: bytesToBase64(iv), ct: bytesToBase64(ct) };
}

async function unwrapFileKey(wrapKey, keyWrap, aad) {
  try {
    return new Uint8Array(
      await asyncSubtle().decrypt(
        { name: 'AES-GCM', iv: base64ToBytes(keyWrap.iv), additionalData: aad, tagLength: 128 },
        wrapKey,
        base64ToBytes(keyWrap.ct),
      ),
    );
  } catch (err) {
    throw new AIAError('WRAP_FAILED', 'Không mở được khoá tệp trong key script — key script không khớp tệp .aia.', err);
  }
}

/* ----------------------------------------------------------- Mã hoá tệp --- */

export function normalizeOptions(options = {}) {
  const chunkSize = Math.max(64 * 1024, Math.min(8 * 1024 * 1024, Number(options.chunkSize) || DEFAULT_CHUNK_SIZE));
  const iterations = Math.max(10000, Math.min(5000000, Number(options.iterations) || DEFAULT_ITERATIONS));
  return {
    chunkSize,
    iterations,
    keyUrl: options.keyUrl ? String(options.keyUrl) : './key.js',
    passphrase: options.passphrase == null ? '' : String(options.passphrase),
    fileName: options.fileName || 'script.js',
    fileType: options.fileType || '',
    lang: options.lang || detectLang(options.fileName || ''),
    expiry: options.expiry || null,
    note: options.note ? String(options.note) : '',
    payloadFile: options.payloadFile || 'payload.aia.bin',
    hashPlaintext: options.hashPlaintext !== false,
    // 'per-file': mỗi tệp một key script chứa khoá tệp
    // 'shared'  : MỘT key script dùng chung cho mọi bản mã và mọi người
    // 'none'    : khoá dẫn xuất trực tiếp (chế độ cũ, tương thích)
    // Không truyền keyMode ⇒ giữ nguyên hành vi cũ theo requireKeyScript.
    keyMode:
      options.keyMode === 'shared'
        ? 'shared'
        : options.keyMode === 'none'
          ? 'none'
          : options.keyMode === 'per-file'
            ? 'per-file'
            : options.requireKeyScript === true
              ? 'per-file'
              : 'none',
    // true = khoá tệp ngẫu nhiên được bọc trong key script ⇒ thiếu key script là không mở được
    requireKeyScript: options.keyMode === 'shared' || options.keyMode === 'per-file' || options.requireKeyScript === true,
    sharedKey: options.sharedKey ? sharedKeyToString(options.sharedKey) : null,
  };
}

export function detectLang(fileName = '') {
  const ext = String(fileName).toLowerCase().split('.').pop();
  const map = {
    js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'javascript', ts: 'typescript',
    lua: 'lua', luau: 'luau', py: 'python', rb: 'ruby', php: 'php', sh: 'shell', bash: 'shell',
    html: 'html', css: 'css', json: 'json', txt: 'text', md: 'text', sql: 'sql', go: 'go',
    rs: 'rust', java: 'java', cs: 'csharp', cpp: 'cpp', c: 'c', txt2: 'text',
  };
  return map[ext] || 'text';
}

export function isRunnableLang(lang) {
  return lang === 'javascript' || lang === 'typescript';
}

/** Số byte đầu tệp dùng để dò ngôn ngữ theo nội dung (đủ để nhận ra Luau/Python). */
export const LANG_SNIFF_BYTES = 64 * 1024;

/**
 * Dò ngôn ngữ theo NỘI DUNG, không theo đuôi tệp.
 *
 * Vì sao cần: rất nhiều người đặt tên `script.js` cho tệp Lua/Luau của Roblox.
 * Nếu chỉ tin đuôi tệp, trang sẽ đưa Luau vào Web Worker và nổ
 * `SyntaxError: Unexpected identifier` — người dùng không hiểu vì sao.
 *
 * Nguyên tắc: **thận trọng** — chỉ trả lời khi dấu hiệu rõ ràng, còn lại trả `null`
 * để nơi gọi giữ nguyên kết luận theo đuôi tệp.
 *
 * @param {string} text mẫu nội dung (nên là ~64 KiB đầu)
 * @returns {'javascript'|'lua'|'python'|null}
 */
export function sniffContentLang(text = '') {
  const raw = String(text == null ? '' : text).slice(0, LANG_SNIFF_BYTES);
  if (!raw.trim()) return null;
  // Bỏ các "gạch trang trí" trong chú thích (====, ----, ****) để không đếm nhầm
  // thành `===` của JavaScript.
  const s = raw.replace(/={4,}|-{4,}|\*{4,}|#{4,}/g, ' ');
  const count = (re) => (s.match(re) || []).length;

  // Lua / Luau
  const lua =
    count(/\bgame\s*:\s*GetService\s*\(/g) * 6 +
    count(/:WaitForChild\s*\(/g) * 4 +
    count(/\bInstance\.new\s*\(/g) * 4 +
    count(/\b(?:UDim2|CFrame|Vector3|Vector2|Color3|BrickColor)\.new\s*\(/g) * 3 +
    count(/\bEnum\.[A-Za-z]/g) * 2 +
    count(/\blocal\s+function\b/g) * 3 +
    count(/\blocal\s+[A-Za-z_]\w*\s*=/g) +
    count(/\belseif\b|\bipairs\s*\(|\bpairs\s*\(|\btask\.(?:wait|spawn|delay)\s*\(/g) * 2 +
    count(/~=/g) * 2 +
    count(/:Connect\s*\(/g) * 2 +
    count(/^\s*--(?!\[\[)/gm);

  // JavaScript / TypeScript
  const js =
    count(/=>/g) * 3 +
    count(/\b(?:const|let)\s+[A-Za-z_$][\w$]*\s*=/g) * 3 +
    count(/\bconsole\.(?:log|warn|error|info)\s*\(/g) * 2 +
    count(/\b(?:document|window|globalThis)\.[A-Za-z_$]/g) * 2 +
    count(/\b(?:function|class)\s+[A-Za-z_$][\w$]*\s*\([^)]*\)\s*\{/g) * 2 +
    count(/===|!==|\?\?|\?\./g) * 2 +
    count(/"use strict"|'use strict'/g) * 4 +
    count(/\brequire\s*\(/g) * 3 +
    count(/\bexport\s+(?:default|const|function|class)\b/g) * 3 +
    count(/\bmodule\.exports\b/g) * 3;

  // Python
  const py =
    count(/^\s*def\s+[A-Za-z_]\w*\s*\(/gm) * 6 +
    count(/^\s*(?:import|from)\s+[A-Za-z_]/gm) * 2 +
    count(/^\s*(?:elif|except|finally)\b/gm) * 3 +
    count(/\bself\./g) * 2 +
    count(/\bprint\s*\(/g);

  const MIN = 12;
  const best = Math.max(lua, js, py);
  if (best < MIN) return null;
  // Chỉ nhận khi bên thắng áp đảo (tránh đoán bừa với tệp lai).
  if (lua === best && lua > js * 2 && lua > py * 2) return 'lua';
  if (py === best && py > js * 2 && py > lua * 2) return 'python';
  if (js === best && js > lua * 2 && js > py * 2) return 'javascript';
  return null;
}

/**
 * Kết luận ngôn ngữ cuối cùng: ưu tiên ĐUÔI tệp, chỉ ghi đè khi nội dung nói khác
 * một cách rõ ràng (ví dụ `script.js` nhưng nội dung là Luau).
 *
 * @param {string} fileName
 * @param {string} [text] mẫu nội dung (~64 KiB đầu)
 * @returns {string} 'javascript' | 'lua' | 'python' | …
 */
export function resolveLang(fileName = '', text = '') {
  const byName = detectLang(fileName);
  if (!text) return byName;
  const sniffed = sniffContentLang(text);
  if (!sniffed) return byName;
  if (sniffed === byName) return byName;
  // Đuôi nói "chạy được trong trình duyệt" nhưng nội dung là ngôn ngữ khác → tin nội dung.
  if (isRunnableLang(byName) && (sniffed === 'lua' || sniffed === 'python')) return sniffed;
  // Đuôi nói .lua/.luau/.txt… nhưng nội dung rõ ràng là JavaScript → tin nội dung.
  if (sniffed === 'javascript' && !isRunnableLang(byName)) return 'javascript';
  return byName;
}

/**
 * Mã hoá một luồng dữ liệu, ghi ra `sink` theo từng mảnh.
 *
 * @param {object} p
 * @param {() => any} p.openStream  Hàm mở lại nguồn (cần 2 lượt nếu bật hash).
 * @param {number} p.size           Kích thước bản rõ (byte) — bắt buộc.
 * @param {object} p.options        normalizeOptions(...)
 * @param {(written:number,total:number)=>void} [p.onProgress]
 * @param {{write:(b:Uint8Array)=>any, close?:()=>any}} p.sink
 * @returns {Promise<{meta:object, headerBytes:Uint8Array}>}
 */
export async function encryptStream({ openStream, size, options, onProgress, sink }) {
  if (!Number.isFinite(size) || size < 0) throw new AIAError('BAD_SIZE', 'Kích thước tệp không hợp lệ.');
  if (size > MAX_INPUT_BYTES) {
    throw new AIAError('TOO_LARGE', `Tệp vượt quá giới hạn 5 GiB (${formatBytes(size)}).`);
  }
  const opt = normalizeOptions(options);
  const startedAt = new Date();
  const time = makeTimestamp(startedAt);
  const salt = randomBytes(16);
  const ivPrefix = randomBytes(8);
  const total = Math.ceil(size / opt.chunkSize);
  const id = bytesToHex(randomBytes(8));

  if (opt.keyMode === 'shared' && !opt.sharedKey) {
    throw new AIAError('SHARED_KEY_REQUIRED', 'Chế độ khoá dùng chung cần khoá chung (hãy tạo hoặc nạp key script dùng chung).');
  }

  const { key: wrapKey, kid } = await deriveAesKey(
    {
      timeRaw: time.raw,
      unixMs: time.unixMs,
      keyUrl: opt.keyUrl,
      passphrase: opt.passphrase,
      salt,
      iterations: opt.iterations,
      sharedKey: opt.keyMode === 'shared' ? opt.sharedKey : null,
    },
    ['encrypt'],
  );

  // SHA-256 bản rõ: chỉ với tệp nhỏ (tránh đọc lại 5 GB và tránh tốn RAM).
  let sha256 = null;
  if (opt.hashPlaintext && size > 0 && size <= SMALL_FILE_HASH_LIMIT) {
    const chunks = [];
    for await (const piece of toIterable(openStream())) {
      chunks.push(piece instanceof Uint8Array ? piece : new Uint8Array(piece));
    }
    sha256 = await sha256Hex(concatBytes(chunks));
  }

  const meta = {
    format: 'AIA1',
    v: VERSION,
    id,
    createdAt: startedAt.toISOString(),
    time, // KHÔNG mã hoá — để đọc/đối chiếu
    keyUrl: opt.keyUrl, // link script chứa khoá (tham gia vào KDF)
    alg: 'AES-256-GCM',
    kdf: { name: 'PBKDF2-HMAC-SHA256', iterations: opt.iterations, salt: bytesToBase64(salt), kid },
    chunk: { size: opt.chunkSize, total, ivPrefix: bytesToBase64(ivPrefix), tagBytes: TAG_BYTES },
    file: { name: opt.fileName, type: opt.fileType, size, sha256, lang: opt.lang },
    payload: { file: opt.payloadFile },
    expiry: opt.expiry || null,
    note: opt.note || '',
    keyWrapIn: opt.keyMode === 'shared' ? 'shared-key-script' : opt.keyMode === 'per-file' ? 'key-script' : 'header',
    keyMode: opt.keyMode,
    encryptionSeconds: null,
    headerHash: '', // sẽ tính ngay dưới đây
  };
  if (opt.keyMode === 'shared') meta.sharedKeyId = await sharedKeyId(opt.sharedKey);
  meta.headerHash = await computeHeaderDigest(meta);
  const headerDigest = hexToBytes(meta.headerHash);

  // Chế độ thường: dùng trực tiếp khoá dẫn xuất. Chế độ "bắt buộc key script":
  // sinh khoá tệp ngẫu nhiên, bọc nó bằng khoá dẫn xuất, và chỉ để bản đã bọc
  // trong META của key script (KHÔNG ghi vào header .aia).
  let key = wrapKey;
  let keyWrap = null;
  if (opt.keyMode !== 'none') {
    const fileKey = randomBytes(32);
    key = await asyncSubtle().importKey('raw', fileKey, { name: 'AES-GCM' }, false, ['encrypt']);
    keyWrap = await wrapFileKey(
      wrapKey,
      fileKey,
      wrapAad({ id, timeRaw: time.raw, unixMs: time.unixMs, keyUrl: opt.keyUrl, headerHash: meta.headerHash }),
    );
    // per-file: khoá tệp đã bọc nằm trong key script riêng.
    // shared  : khoá tệp đã bọc nằm ngay trong header, nhưng mở được chỉ khi có khoá chung trong key script.
    if (opt.keyMode === 'shared') meta.keyWrap = keyWrap;
    else meta.keyWrap = keyWrap; // giữ trong META (sẽ bị loại khỏi header ở dưới)
  }

  const headerMeta = { ...meta };
  // per-file: keyWrap chỉ nằm trong key script. shared: keyWrap nằm trong header
  // (bản thân keyWrap đã được AES-GCM xác thực bằng khoá phụ thuộc khoá chung).
  if (meta.keyWrapIn !== 'shared-key-script') delete headerMeta.keyWrap;
  const headerBytes = buildContainerHeader(headerMeta);
  await sink.write(headerBytes);

  let index = 0;
  let pending = new Uint8Array(opt.chunkSize);
  let pendingLen = 0;
  let processed = 0;
  const startedMs = nowMs();

  const flush = async (isLast) => {
    const bytes = isLast ? pending.subarray(0, pendingLen) : pending;
    const sealed = await sealChunk(key, { index, isLast, total, ivPrefix, bytes, headerDigest });
    await sink.write(sealed);
    index++;
    pending = new Uint8Array(opt.chunkSize);
    pendingLen = 0;
    if (onProgress) onProgress(Math.min(processed, size), size);
  };

  for await (const piece of toIterable(openStream())) {
    const src = piece instanceof Uint8Array ? piece : new Uint8Array(piece);
    let off = 0;
    while (off < src.length) {
      const take = Math.min(opt.chunkSize - pendingLen, src.length - off);
      pending.set(src.subarray(off, off + take), pendingLen);
      pendingLen += take;
      off += take;
      processed += take;
      if (pendingLen === opt.chunkSize) {
        // Nếu vừa đầy và đây là khối cuối cùng (kích thước chia hết) => cờ last = true
        await flush(index === total - 1);
      }
    }
  }
  if (pendingLen > 0) await flush(true);

  if (index !== total) {
    throw new AIAError('SIZE_MISMATCH', `Số khối không khớp: ghi ${index}, dự kiến ${total}. Tệp nguồn có thể đã thay đổi khi đang mã hoá.`);
  }

  meta.encryptionSeconds = Math.round(((nowMs() - startedMs) / 1000) * 100) / 100;
  if (sink.close) await sink.close();
  return { meta, headerBytes, encryptedBytes: headerBytes.length + size + total * TAG_BYTES };
}

async function* toIterable(source) {
  const it = toReadIterator(source);
  while (true) {
    const r = await it.read();
    if (r.done) return;
    const v = r.value;
    if (v == null) continue;
    yield v instanceof Uint8Array ? v : new Uint8Array(v);
  }
}

/* --------------------------------------------------------- Giải mã tệp --- */

/** Đọc header từ luồng (không cần mật khẩu) rồi trả lại reader để đọc tiếp. */
export async function readContainerHeaderFromSource(source) {
  const reader = new StreamReader(source);
  const prefix = await reader.readExact(HEADER_PREFIX_BYTES);
  for (let i = 0; i < MAGIC.length; i++) {
    if (prefix[i] !== MAGIC[i]) throw new AIAError('BAD_MAGIC', 'Không phải tệp .aia của AIA Secure Script.');
  }
  const len = new DataView(prefix.buffer, prefix.byteOffset + 8, 4).getUint32(0, true);
  if (len <= 0 || len > 1024 * 1024) throw new AIAError('BAD_HEADER', 'Header không hợp lệ.');
  const jsonBytes = await reader.readExact(len);
  const meta = JSON.parse(fromUtf8(jsonBytes));
  return { meta, reader, headerLength: HEADER_PREFIX_BYTES + len };
}

/**
 * Giải mã từ luồng.
 * - Nếu truyền `sink`, bản rõ được ghi dần ra sink (RAM thấp, phù hợp tệp lớn).
 * - Nếu không, bản rõ được gom vào `plaintext` trong bộ nhớ.
 * @returns {Promise<{meta:object, plaintext:Uint8Array|null, hashVerified:boolean|null}>}
 */
export async function decryptStream({ source, passphrase = '', sink, onProgress, keyWrap = null, sharedKey = null }) {
  const { meta, reader } = await readContainerHeaderFromSource(source);
  if (!meta || meta.format !== 'AIA1') throw new AIAError('BAD_FORMAT', 'Header không đúng định dạng AIA1.');

  // 1) Toàn vẹn header: mọi thay đổi (kể cả ghi chú, tên tệp, thời gian đọc được) đều bị chặn.
  const headerCheck = await verifyHeaderDigest(meta);
  if (!headerCheck.ok) {
    throw new AIAError('HEADER_TAMPERED', 'Header đã bị sửa — SHA-256 header không khớp (tệp có thể đã bị chỉnh).');
  }
  const headerDigest = headerCheck.digest; // null với tệp cũ (tương thích ngược)

  const salt = base64ToBytes(meta.kdf.salt);
  const ivPrefix = base64ToBytes(meta.chunk.ivPrefix);
  const isShared = meta.keyWrapIn === 'shared-key-script' || meta.keyMode === 'shared';
  if (isShared && !sharedKey) {
    throw new AIAError(
      'KEY_REQUIRED',
      'Bản mã dùng khoá dùng chung: cần tệp key script chung (aia.key.js) chứa khoá gốc.',
    );
  }
  const sharedForKey = isShared ? sharedKeyToString(sharedKey) : null;
  if (isShared && meta.sharedKeyId) {
    const givenId = await sharedKeyId(sharedForKey);
    if (givenId !== meta.sharedKeyId) {
      throw new AIAError('WRONG_SHARED_KEY', 'Key script dùng chung không khớp bản mã này (sharedKeyId khác).');
    }
  }
  const { key: wrapKey, kid } = await deriveAesKey({
    timeRaw: meta.time.raw,
    unixMs: meta.time.unixMs,
    keyUrl: meta.keyUrl,
    passphrase,
    salt,
    iterations: meta.kdf.iterations,
    sharedKey: sharedForKey,
  });
  if (meta.kdf.kid && kid !== meta.kdf.kid) {
    throw new AIAError('WRONG_PASSPHRASE', 'Sai mật khẩu (hoặc link key script / thời gian trong header đã bị sửa).');
  }

  // Khoá tệp: per-file lấy từ key script; shared lấy từ header (mở được nhờ khoá chung).
  const wrapInfo = isShared ? meta.keyWrap || null : keyWrap || meta.keyWrap || null;
  if (isShared && !wrapInfo) {
    throw new AIAError('BAD_FORMAT', 'Bản mã dùng khoá chung nhưng thiếu keyWrap trong header.');
  }
  let key = wrapKey;
  if (wrapInfo) {
    const fileKey = await unwrapFileKey(
      wrapKey,
      wrapInfo,
      wrapAad({
        id: meta.id,
        timeRaw: meta.time.raw,
        unixMs: meta.time.unixMs,
        keyUrl: meta.keyUrl,
        headerHash: meta.headerHash || null,
      }),
    );
    key = await asyncSubtle().importKey('raw', fileKey, { name: 'AES-GCM' }, false, ['decrypt']);
  } else if (meta.keyWrapIn === 'key-script') {
    throw new AIAError('KEY_REQUIRED', 'Tệp này yêu cầu key script: hãy chọn/nạp tệp .key.js tương ứng để mở khoá.');
  }

  const size = meta.file.size;
  const chunkSize = meta.chunk.size;
  const total = meta.chunk.total;
  const keep = !sink;
  const parts = keep ? [] : null;
  let done = 0;

  for (let i = 0; i < total; i++) {
    const plainLen = Math.min(chunkSize, size - i * chunkSize);
    const enc = await reader.readExact(plainLen + TAG_BYTES);
    const pt = await openChunk(key, { index: i, isLast: i === total - 1, total, ivPrefix, bytes: enc, headerDigest });
    if (pt.length !== plainLen) {
      throw new AIAError('SIZE_MISMATCH', `Khối #${i} có ${pt.length} byte, dự kiến ${plainLen}.`);
    }
    if (keep) parts.push(pt);
    else await sink.write(pt);
    done += pt.length;
    if (onProgress) onProgress(done, size);
  }
  if (await reader.hasMore()) {
    throw new AIAError('TRAILING_DATA', 'Tệp có dữ liệu thừa sau khối cuối — có thể đã bị ghép thêm.');
  }

  const plaintext = keep ? (parts.length ? concatBytes(parts) : new Uint8Array(0)) : null;
  let hashVerified = null;
  if (meta.file.sha256 && keep) {
    hashVerified = (await sha256Hex(plaintext)) === meta.file.sha256;
    if (!hashVerified) {
      throw new AIAError('HASH_MISMATCH', 'SHA-256 sau giải mã không khớp — dữ liệu đã bị thay đổi.');
    }
  }
  if (sink && sink.close) await sink.close();
  return { meta, plaintext, hashVerified };
}

export async function decryptBytes(bytes, passphrase = '', onProgress, keyWrap = null, sharedKey = null) {
  const source = new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  return decryptStream({ source, passphrase, onProgress, keyWrap, sharedKey });
}

export async function sha256Hex(bytes) {
  const digest = await asyncSubtle().digest('SHA-256', bytes);
  return bytesToHex(new Uint8Array(digest));
}

export function nowMs() {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}

/* ------------------------------------------- Khoá dùng chung (shared key) --- */

/** Sinh khoá gốc dùng chung 32 byte (base64). Chỉ nằm trong key script chung. */
export function generateSharedKeyBase64() {
  return bytesToBase64(randomBytes(32));
}

/** 8 byte hex đầu của SHA-256(khoá gốc) — dùng để đối chiếu key script có đúng không. */
export async function sharedKeyId(sharedKey) {
  const digest = await asyncSubtle().digest('SHA-256', utf8(sharedKeyToString(sharedKey)));
  return bytesToHex(new Uint8Array(digest).subarray(0, 8));
}

/**
 * Sinh MỘT key script dùng chung cho mọi bản mã và mọi người.
 * Tệp này chứa khoá gốc ⇒ ai có nó + mật khẩu là mở được mọi tệp .aia cùng bộ.
 */
export function buildSharedKeyScript({ sharedKey, keyUrl = './aia.key.js', keyId = '', note = '', createdAt = '' }) {
  const master = sharedKeyToString(sharedKey);
  // Không in thời điểm tạo ⇒ mọi lần tải key script chung đều ra CÙNG một tệp (byte-identical).
  return `/*!
 * AIA Secure Script — KEY SCRIPT DÙNG CHUNG
 * ---------------------------------------------------------------------------
 * Tạo lúc   : ${createdAt || 'cố định (dùng cho mọi lần mã hoá)'}
 * Key ID    : ${keyId || '(chưa tính)'}
 * Link key  : ${keyUrl}
 * Ghi chú   : ${note || 'dùng cho nhiều bản mã .aia cùng bộ'}
 *
 * Dùng được cho MỌI tệp .aia được mã hoá ở chế độ "khoá dùng chung" với cùng
 * key script này. Cần thêm MẬT KHẨU đã đặt lúc mã hoá.
 * KHÔNG gửi tệp này cho người không tin cậy nếu không đặt mật khẩu.
 */
(function (global) {
  'use strict';

  var SHARED = {
    v: 1,
    keyId: ${JSON.stringify(keyId || '')},
    masterKey: ${JSON.stringify(master)},
    keyUrl: ${JSON.stringify(keyUrl)},
  };

  var MAGIC = new Uint8Array([0x41, 0x49, 0x41, 0x53, 0x43, 0x52, 0x31, 0x0a]);
  var VERSION = 1;
  var TAG = 16;

  function utf8(s) { return new TextEncoder().encode(s); }
  function hex(u8) { var s = ''; for (var i = 0; i < u8.length; i++) s += ('0' + u8[i].toString(16)).slice(-2); return s; }
  function u8(hexStr) { var o = new Uint8Array(hexStr.length / 2); for (var i = 0; i < o.length; i++) o[i] = parseInt(hexStr.substr(i * 2, 2), 16); return o; }
  function b64d(s) { var b = atob(s), o = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) o[i] = b.charCodeAt(i); return o; }

  async function derive(pass, header) {
    var material = JSON.stringify([1, header.time.raw, header.time.unixMs, header.keyUrl, pass || '', SHARED.masterKey]);
    var base = await crypto.subtle.importKey('raw', utf8(material), 'PBKDF2', false, ['deriveBits']);
    var bits = new Uint8Array(await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: b64d(header.kdf.salt), iterations: header.kdf.iterations, hash: 'SHA-256' }, base, 256));
    var kid = hex(new Uint8Array(await crypto.subtle.digest('SHA-256', bits)).slice(0, 8));
    return { key: await crypto.subtle.importKey('raw', bits, { name: 'AES-GCM' }, false, ['decrypt']), kid: kid, bits: bits };
  }

  function aadFor(index, last, total, headerHash) {
    var digest = headerHash ? u8(headerHash) : null;
    var a = new Uint8Array(digest ? 50 : 18), dv = new DataView(a.buffer);
    a.set(MAGIC, 0); a[8] = VERSION;
    dv.setUint32(9, index >>> 0, false);
    a[13] = last ? 1 : 0;
    dv.setUint32(14, total >>> 0, false);
    if (digest) a.set(digest, 18);
    return a;
  }

  function iv(prefix, i) {
    var v = new Uint8Array(12);
    v.set(prefix, 0);
    new DataView(v.buffer).setUint32(8, i >>> 0, false);
    return v;
  }

  async function sha256Hex(text) {
    return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', utf8(text))));
  }

  function Reader(stream) { this.r = stream.getReader(); this.buf = new Uint8Array(0); this.done = false; }
  Reader.prototype._pull = async function () {
    if (this.done) return false;
    var r = await this.r.read();
    if (r.done) { this.done = true; return false; }
    if (!r.value || !r.value.length) return true;
    var merged = new Uint8Array(this.buf.length + r.value.length);
    merged.set(this.buf, 0); merged.set(r.value, this.buf.length);
    this.buf = merged;
    return true;
  };
  Reader.prototype.exact = async function (n) {
    while (this.buf.length < n) if (!(await this._pull())) throw new Error('Tệp .aia bị cắt cụt.');
    var o = this.buf.subarray(0, n); this.buf = this.buf.subarray(n); return o;
  };
  Reader.prototype.more = async function () { if (this.buf.length) return true; return await this._pull(); };

  async function loadStream(options) {
    if (options.source) return options.source;
    if (!options.url) throw new Error('Cần options.url hoặc options.source');
    var res = await fetch(options.url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Không tải được ' + options.url + ' (HTTP ' + res.status + ')');
    return res.body;
  }

  async function verifyHeader(header) {
    if (!header.headerHash) return;
    var clone = {};
    for (var k in header) if (Object.prototype.hasOwnProperty.call(header, k)) clone[k] = header[k];
    clone.headerHash = new Array(65).join('0');
    delete clone.keyWrap;
    delete clone.encryptionSeconds;
    var actual = await sha256Hex(JSON.stringify(clone));
    if (actual !== header.headerHash) throw new Error('Header của tệp .aia đã bị sửa (SHA-256 không khớp).');
  }

  async function open(options) {
    options = options || {};
    if (!SHARED.masterKey) throw new Error('Key script chung này không có khoá gốc.');
    var stream = await loadStream(options);
    var r = new Reader(stream);
    var prefix = await r.exact(12);
    var len = new DataView(prefix.buffer, prefix.byteOffset + 8, 4).getUint32(0, true);
    var header = JSON.parse(new TextDecoder().decode(await r.exact(len)));
    if (header.format !== 'AIA1') throw new Error('Không phải tệp .aia.');
    await verifyHeader(header);
    if (header.keyWrapIn !== 'shared-key-script') {
      throw new Error('Tệp này không được mã hoá ở chế độ khoá dùng chung — hãy dùng key script riêng của nó.');
    }
    if (header.expiry && Date.now() > Date.parse(header.expiry)) {
      throw new Error('Bản mã đã hết hạn dùng.');
    }
    var info = await derive(options.passphrase || '', header);
    if (SHARED.keyId && info.kid && header.kdf.kid !== info.kid) throw new Error('Sai mật khẩu.');
    if (header.sharedKeyId) {
      var myId = hex(new Uint8Array(await crypto.subtle.digest('SHA-256', utf8(SHARED.masterKey))).slice(0, 8));
      if (myId !== header.sharedKeyId) throw new Error('Key script chung không khớp bản mã này.');
    }

    // mở khoá tệp
    var kw = header.keyWrap;
    if (!kw) throw new Error('Bản mã thiếu keyWrap.');
    var wrapAad = utf8(JSON.stringify(['AIA1-WRAP', header.id, header.time.raw, header.time.unixMs, header.keyUrl, header.headerHash || '']));
    var fileKeyRaw;
    try {
      fileKeyRaw = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: b64d(kw.iv), additionalData: wrapAad, tagLength: 128 }, info.key, b64d(kw.ct));
    } catch (e) {
      throw new Error('Không mở được khoá tệp — sai mật khẩu hoặc key script không đúng.');
    }
    var dataKey = await crypto.subtle.importKey('raw', fileKeyRaw, { name: 'AES-GCM' }, false, ['decrypt']);

    var ivPrefix = b64d(header.chunk.ivPrefix);
    var size = header.file.size, cs = header.chunk.size, total = header.chunk.total;
    var parts = [], done = 0;
    for (var i = 0; i < total; i++) {
      var plainLen = Math.min(cs, size - i * cs);
      var enc = await r.exact(plainLen + TAG);
      var pt;
      try {
        pt = new Uint8Array(await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: iv(ivPrefix, i), additionalData: aadFor(i, i === total - 1, total, header.headerHash), tagLength: 128 },
          dataKey, enc));
      } catch (e) {
        throw new Error('Không giải mã được khối #' + i + ' — tệp đã bị sửa hoặc sai khoá.');
      }
      parts.push(pt); done += pt.length;
      if (options.onProgress) options.onProgress(done, size);
    }
    if (await r.more()) throw new Error('Tệp có dữ liệu thừa sau khối cuối.');
    var out = new Uint8Array(done), off = 0;
    for (var j = 0; j < parts.length; j++) { out.set(parts[j], off); off += parts[j].length; }
    return { bytes: out, header: header };
  }

  async function run(options) {
    options = options || {};
    var res = await open(options);
    var code = new TextDecoder().decode(res.bytes);
    if (options.download) {
      var blob = new Blob([res.bytes], { type: 'application/octet-stream' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = res.header.file.name || 'decrypted.bin';
      document.body.appendChild(a); a.click(); a.remove();
      return res;
    }
    var head = "var L=function(t){return function(){var a=[].slice.call(arguments).map(function(x){try{return typeof x==='object'?JSON.stringify(x):String(x)}catch(e){return String(x)}});postMessage({type:'log',level:t,args:a})}};" +
      "self.console={log:L('log'),info:L('info'),warn:L('warn'),error:L('error'),debug:L('log')};" +
      "self.addEventListener('error',function(e){postMessage({type:'error',message:String(e.message||e)})});" +
      "self.addEventListener('unhandledrejection',function(e){postMessage({type:'error',message:String(e.reason)})});try{";
    var tail = "}catch(e){postMessage({type:'error',message:String(e&&(e.stack||e.message)||e)});}postMessage({type:'done'});";
    var worker = new Worker(URL.createObjectURL(new Blob([head + code + tail], { type: 'text/javascript' })));
    if (options.onLog || options.onError || options.onDone) {
      worker.onmessage = function (ev) {
        var d = ev.data || {};
        if (d.type === 'log' && options.onLog) options.onLog(d.level, d.args);
        else if (d.type === 'error' && options.onError) options.onError(d.message);
        else if (d.type === 'done' && options.onDone) options.onDone();
      };
    }
    return { bytes: res.bytes, header: res.header, worker: worker };
  }

  function b64u(s2) {
    var t = String(s2 || '').replace(/-/g, '+').replace(/_/g, '/');
    while (t.length % 4) t += '=';
    return b64d(t);
  }

  /**
   * Mở token link (AIALNK1.…) → { url, keyUrl, createdAt }.
   * options.passphrase: mật khẩu đã dùng lúc mã hoá link (nếu có).
   */
  async function openLink(token, options) {
    options = options || {};
    if (!SHARED.masterKey) throw new Error('Key script chung này không có khoá gốc.');
    var s = String(token || '').trim();
    if (s.slice(0, 8).toUpperCase() === 'AIALNK1.') s = s.slice(8);
    s = s.replace(/[^A-Za-z0-9_-]+/g, '');
    if (!s) throw new Error('Thiếu token link.');
    var raw;
    try { raw = b64u(s); } catch (e) { throw new Error('Token link không hợp lệ.'); }
    if (raw.length < 30) throw new Error('Token link bị cắt cụt.');
    var hlen = (raw[0] << 8) | raw[1];
    if (!hlen || 2 + hlen + 28 > raw.length) throw new Error('Token link không hợp lệ.');
    var header;
    try { header = JSON.parse(new TextDecoder().decode(raw.subarray(2, 2 + hlen))); }
    catch (e) { throw new Error('Token link không hợp lệ.'); }
    if (!header || !header.t || !header.x || !header.u || !header.s || !header.n) {
      throw new Error('Token link thiếu thông tin khoá.');
    }
    var iv = raw.subarray(2 + hlen, 2 + hlen + 12);
    var ct = raw.subarray(2 + hlen + 12);
    var iterations = Number(header.n);
    if (!isFinite(iterations) || iterations < 1000 || iterations > 5000000) {
      throw new Error('Token link có số vòng KDF không hợp lệ.');
    }
    var salt;
    try { salt = b64d(header.s); } catch (e) { throw new Error('Token link có salt hỏng.'); }
    if (salt.length < 8) throw new Error('Token link có salt hỏng.');
    var material = JSON.stringify([1, header.t, header.x, header.u, options.passphrase || '', SHARED.masterKey]);
    var base = await crypto.subtle.importKey('raw', utf8(material), 'PBKDF2', false, ['deriveBits']);
    var bits = new Uint8Array(await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' }, base, 256));
    var kid = hex(new Uint8Array(await crypto.subtle.digest('SHA-256', bits)).slice(0, 8));
    if (header.k && header.k !== kid) throw new Error('Sai mật khẩu hoặc sai key script.');
    var key = await crypto.subtle.importKey('raw', bits, { name: 'AES-GCM' }, false, ['decrypt']);
    var aad = utf8(JSON.stringify(['AIA-LINK1', header.t, header.u]));
    var pt;
    try {
      pt = new Uint8Array(await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv, additionalData: aad, tagLength: 128 }, key, ct));
    } catch (e) {
      throw new Error('Không mở được link: sai mật khẩu, sai key script hoặc token đã bị sửa.');
    }
    var obj = JSON.parse(new TextDecoder().decode(pt));
    if (!obj || !obj.u) throw new Error('Nội dung token hỏng.');
    return { url: String(obj.u), keyUrl: header.u, createdAt: header.t };
  }

  var API = {
    version: '1.1.0',
    kind: 'shared',
    masterKey: SHARED.masterKey,
    keyId: SHARED.keyId,
    keyUrl: SHARED.keyUrl,
    open: open,
    openLink: openLink,
    run: run,
    generateInfo: function () { return { keyMode: 'shared', keyUrl: SHARED.keyUrl, sharedKeyId: SHARED.keyId }; },
  };

  global.AIA_KEY = API;
  global.AIA_UNLOCK_SHARED = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
`;
}

/* ------------------------------------------------ Nguồn Web Worker (chạy) --- */

/**
 * Bọc code cần chạy thành một script Web Worker: có console log chuyển về
 * trang chính, bắt lỗi, và tự báo "done" khi chạy hết phần đồng bộ.
 */
export function buildWorkerSource(code) {
  return (
    "var __aiaLog=function(t){return function(){var a=[].slice.call(arguments).map(function(x){" +
    "try{return typeof x==='object'?JSON.stringify(x):String(x)}catch(e){return String(x)}});" +
    "postMessage({type:'log',level:t,args:a})}};" +
    "self.console={log:__aiaLog('log'),info:__aiaLog('info'),warn:__aiaLog('warn')," +
    "error:__aiaLog('error'),debug:__aiaLog('log')};\n" +
    "self.addEventListener('error',function(e){postMessage({type:'error',message:String(e.message||e)})});\n" +
    "self.addEventListener('unhandledrejection',function(e){postMessage({type:'error',message:String(e.reason)})});\n" +
    "try{\n" +
    code +
    "\n}catch(__aiaErr){postMessage({type:'error',message:String(__aiaErr&&(__aiaErr.stack||__aiaErr.message)||__aiaErr)});}\n" +
    "postMessage({type:'done'});\n"
  );
}

/* --------------------------------------------------- Sinh "key script" --- */

/**
 * Sinh tệp key script (script chứa khoá).
 * Đây là script ĐỘC LẬP: có thể để cạnh tệp .aia và mở bằng runner.html.
 */
export function buildKeyScript(meta, opts = {}) {
  const embedded = opts.embeddedPassphrase ? String(opts.embeddedPassphrase) : null;
  const metaJson = JSON.stringify(meta, null, 2);
  const safeMeta = metaJson.replace(/<\/script/gi, '<\\/script');
  const safePass = embedded == null ? 'null' : JSON.stringify(embedded);
  return `/*!
 * AIA Secure Script — KEY SCRIPT (tệp khoá)
 * ---------------------------------------------------------------------------
 * Thời gian tạo : ${meta.time.readable} (raw ${meta.time.raw}, unixMs ${meta.time.unixMs})
 * Tệp gốc       : ${meta.file.name} — ${meta.file.size} byte — ngôn ngữ ${meta.file.lang}
 * Link key      : ${meta.keyUrl}
 * Tệp dữ liệu   : ${meta.payload.file}
 * KDF           : ${meta.kdf.name}, ${meta.kdf.iterations} vòng, salt ${meta.kdf.salt.slice(0, 8)}…
 *
 * Script này KHÔNG chứa bản rõ của code. Nó chứa tham số dẫn xuất khoá + bộ giải mã.
 * Nếu bản mã ở chế độ "bắt buộc key script", khoá tệp (đã bọc) chỉ nằm trong tệp này:
 * thiếu nó thì không thể giải mã dù biết mật khẩu và đọc được header.
 * Cần mật khẩu (nếu lúc mã hoá có đặt) để mở tệp .aia.
 */
(function (global) {
  'use strict';

  var META = /*<AIA:META>*/${safeMeta}/*</AIA:META>*/;
  var EMBEDDED_PASS = ${safePass}; // null = không nhúng (an toàn hơn)

  var MAGIC = new Uint8Array([0x41, 0x49, 0x41, 0x53, 0x43, 0x52, 0x31, 0x0a]);
  var VERSION = 1;
  var TAG_BYTES = 16;

  var selfUrl = (function () {
    if (typeof document !== 'undefined' && document.currentScript && document.currentScript.src) return document.currentScript.src;
    if (typeof location !== 'undefined') return location.href;
    return '';
  })();

  var payloadUrl = (function () {
    var f = (META.payload && META.payload.file) || 'payload.aia.bin';
    try { return new URL(f, selfUrl || 'http://localhost/').href; } catch (e) { return f; }
  })();

  function b64d(s) {
    var bin = atob(s), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function hex(u8) {
    var s = '';
    for (var i = 0; i < u8.length; i++) s += ('0' + u8[i].toString(16)).slice(-2);
    return s;
  }
  function utf8(s) { return new TextEncoder().encode(s); }
  function aad(i, last, total) {
    var a = new Uint8Array(18), dv = new DataView(a.buffer);
    a.set(MAGIC, 0);
    a[8] = VERSION;
    dv.setUint32(9, i >>> 0, false);
    a[13] = last ? 1 : 0;
    dv.setUint32(14, total >>> 0, false);
    return a;
  }
  function iv(prefix, i) {
    var v = new Uint8Array(12);
    v.set(prefix, 0);
    new DataView(v.buffer).setUint32(8, i >>> 0, false);
    return v;
  }
  function wrapAad() {
    return utf8(JSON.stringify(['AIA1-WRAP', META.id, META.time.raw, META.time.unixMs, META.keyUrl, META.headerHash || '']));
  }

  function hexToU8(hex) {
    var out = new Uint8Array(hex.length / 2);
    for (var i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
    return out;
  }

  // AAD khối: 18 byte như bản cũ, hoặc 50 byte (kèm SHA-256 header) với tệp mới.
  function chunkAad(headerHash) {
    var digest = headerHash ? hexToU8(headerHash) : null;
    var buf = new Uint8Array(digest ? 50 : 18);
    var dv = new DataView(buf.buffer);
    buf.set(MAGIC, 0);
    buf[8] = VERSION;
    buf[13] = 0;
    if (digest) buf.set(digest, 18);
    return buf;
  }

  function aadFor(index, last, total, headerHash) {
    var a = chunkAad(headerHash);
    var dv = new DataView(a.buffer);
    dv.setUint32(9, index >>> 0, false);
    a[13] = last ? 1 : 0;
    dv.setUint32(14, total >>> 0, false);
    return a;
  }

  async function sha256HexOf(text) {
    var d = new Uint8Array(await crypto.subtle.digest('SHA-256', utf8(text)));
    return hex(d);
  }

  async function openFileKey(wrapKey) {
    var kw = META.keyWrap;
    if (!kw) throw new Error('Key script thiếu khoá tệp — tệp này có thể đã bị sửa hoặc không phải key script gốc.');
    try {
      var raw = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: b64d(kw.iv), additionalData: wrapAad(), tagLength: 128 },
        wrapKey,
        b64d(kw.ct),
      );
      return await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['decrypt']);
    } catch (e) {
      throw new Error('Không mở được khoá tệp trong key script — key script không khớp tệp .aia.');
    }
  }

  async function derive(pass) {
    var material = JSON.stringify([1, META.time.raw, META.time.unixMs, META.keyUrl, pass || '']);
    var base = await crypto.subtle.importKey('raw', utf8(material), 'PBKDF2', false, ['deriveBits']);
    var bits = new Uint8Array(await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: b64d(META.kdf.salt), iterations: META.kdf.iterations, hash: 'SHA-256' }, base, 256));
    var kid = hex(new Uint8Array(await crypto.subtle.digest('SHA-256', bits)).slice(0, 8));
    var key = await crypto.subtle.importKey('raw', bits, { name: 'AES-GCM' }, false, ['decrypt']);
    return { key: key, kid: kid };
  }

  function Reader(stream) {
    this.reader = stream.getReader();
    this.buf = new Uint8Array(0);
    this.done = false;
  }
  Reader.prototype._pull = async function () {
    if (this.done) return false;
    var r = await this.reader.read();
    if (r.done) { this.done = true; return false; }
    var v = r.value;
    if (!v || v.length === 0) return true;
    if (this.buf.length) {
      var merged = new Uint8Array(this.buf.length + v.length);
      merged.set(this.buf, 0); merged.set(v, this.buf.length);
      this.buf = merged;
    } else {
      this.buf = v;
    }
    return true;
  };
  Reader.prototype.exact = async function (n) {
    while (this.buf.length < n) {
      var ok = await this._pull();
      if (!ok) throw new Error('Tệp .aia bị cắt cụt (cần ' + n + ' byte).');
    }
    var out = this.buf.subarray(0, n);
    this.buf = this.buf.subarray(n);
    return out;
  };
  Reader.prototype.more = async function () {
    if (this.buf.length) return true;
    return await this._pull();
  };

  async function fetchReader(onBytes) {
    var res = await fetch(payloadUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error('Không tải được tệp dữ liệu: ' + payloadUrl + ' (HTTP ' + res.status + ')');
    var total = Number(res.headers.get('content-length')) || 0;
    var reader = res.body.getReader();
    var loaded = 0;
    var wrapped = new ReadableStream({
      async pull(c) {
        var r = await reader.read();
        if (r.done) { c.close(); return; }
        loaded += r.value.length;
        if (onBytes) onBytes(loaded, total);
        c.enqueue(r.value);
      },
    });
    return wrapped;
  }

  async function decrypt(options) {
    options = options || {};
    if (AIA.checkExpiry()) {
      throw new Error('Bản mã đã hết hạn dùng từ ' + new Date(META.expiry).toLocaleString());
    }
    var pass = options.passphrase != null ? options.passphrase : (EMBEDDED_PASS || '');
    var t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    var info = await derive(pass);
    if (META.kdf.kid && info.kid !== META.kdf.kid) {
      throw new Error('Sai mật khẩu (hoặc header đã bị sửa).');
    }
    var dataKey = info.key;
    if (META.keyWrap) {
      dataKey = await openFileKey(info.key);
    } else if (META.keyWrapIn === 'key-script') {
      throw new Error('Key script thiếu khoá tệp — dùng lại key script gốc đã phát hành cùng tệp .aia.');
    }
    var stream = options.source ? options.source : await fetchReader(options.onFetchProgress);
    var reader = new Reader(stream);
    var prefix = await reader.exact(12);
    var len = new DataView(prefix.buffer, prefix.byteOffset + 8, 4).getUint32(0, true);
    var headerBytes = await reader.exact(len);
    var header = JSON.parse(new TextDecoder().decode(headerBytes));
    if (header.id !== META.id) throw new Error('Key script không khớp với tệp dữ liệu (id khác nhau).');

    // Toàn vẹn header: nếu header bị sửa thì SHA-256 sẽ lệch.
    if (header.headerHash) {
      var clone = {};
      for (var kk in header) if (Object.prototype.hasOwnProperty.call(header, kk)) clone[kk] = header[kk];
      clone.headerHash = new Array(65).join('0');
      delete clone.keyWrap;
      delete clone.encryptionSeconds;
      var actual = await sha256HexOf(JSON.stringify(clone));
      if (actual !== header.headerHash) {
        throw new Error('Header của tệp .aia đã bị sửa (SHA-256 không khớp) — từ chối giải mã.');
      }
    }

    var ivPrefix = b64d(META.chunk.ivPrefix);
    var size = META.file.size, cs = META.chunk.size, total = META.chunk.total;
    var parts = [], done = 0;
    for (var i = 0; i < total; i++) {
      var plainLen = Math.min(cs, size - i * cs);
      var enc = await reader.exact(plainLen + TAG_BYTES);
      try {
        var pt = new Uint8Array(await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: iv(ivPrefix, i), additionalData: aadFor(i, i === total - 1, total, header.headerHash), tagLength: 128 },
          dataKey, enc));
      } catch (e) {
        throw new Error('Không giải mã được khối #' + i + ': sai mật khẩu hoặc tệp đã bị sửa.');
      }
      parts.push(pt);
      done += pt.length;
      if (options.onProgress) options.onProgress(done, size);
    }
    if (await reader.more()) throw new Error('Tệp có dữ liệu thừa sau khối cuối.');
    var out = new Uint8Array(done), off = 0;
    for (var k = 0; k < parts.length; k++) { out.set(parts[k], off); off += parts[k].length; }
    AIA.lastDecryptMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
    return out;
  }

  function checkExpiry() {
    if (!META.expiry) return false;
    var t = Date.parse(META.expiry);
    return Number.isFinite(t) && Date.now() > t;
  }

  function decode(bytes) { return new TextDecoder().decode(bytes); }

  // Script chạy trong Web Worker: không treo trang, không truy cập được DOM.
  // Code được bọc try/catch và tự báo "done" sau khi chạy hết phần đồng bộ.
  var HEAD_WORKER =
    "var __aiaLog=function(t){return function(){var a=[].slice.call(arguments).map(function(x){" +
    "try{return typeof x==='object'?JSON.stringify(x):String(x)}catch(e){return String(x)}});" +
    "postMessage({type:'log',level:t,args:a})}};" +
    "self.console={log:__aiaLog('log'),info:__aiaLog('info'),warn:__aiaLog('warn')," +
    "error:__aiaLog('error'),debug:__aiaLog('log')};" +
    "self.addEventListener('error',function(e){postMessage({type:'error',message:String(e.message||e)})});" +
    "self.addEventListener('unhandledrejection',function(e){postMessage({type:'error',message:String(e.reason)})});" +
    "try{";
  var TAIL_WORKER =
    "}catch(__aiaErr){postMessage({type:'error',message:String(__aiaErr&&(__aiaErr.stack||__aiaErr.message)||__aiaErr)});}" +
    "postMessage({type:'done'});";

  function runInWorker(code, handlers) {
    handlers = handlers || {};
    var blob = new Blob([HEAD_WORKER + code + TAIL_WORKER], { type: 'text/javascript' });
    var url = URL.createObjectURL(blob);
    var worker = new Worker(url);
    worker.__aiaUrl = url;
    worker.onmessage = function (ev) {
      var d = ev.data || {};
      if (d.type === 'log') { if (handlers.onLog) handlers.onLog(d.level, d.args); }
      else if (d.type === 'error') { if (handlers.onError) handlers.onError(d.message); }
      else if (d.type === 'done') { if (handlers.onDone) handlers.onDone(); }
    };
    worker.onerror = function (e) {
      if (handlers.onError) handlers.onError(e.message || 'Lỗi runtime trong worker');
      AIA.stopCurrent();
    };
    return worker;
  }

  var currentWorker = null;

  var AIA = {
    version: '1.0.0',
    meta: META,
    payloadUrl: payloadUrl,
    keyScriptUrl: selfUrl,
    checkExpiry: checkExpiry,
    decrypt: decrypt,
    decode: decode,
    runInWorker: function (code, handlers) {
      AIA.stopCurrent();
      var w = runInWorker(code, handlers);
      currentWorker = w;
      // Worker đã nạp xong blob nên có thể thu hồi URL ngay.
      setTimeout(function () { try { URL.revokeObjectURL(w.__aiaUrl); } catch (e) {} }, 0);
      return w;
    },
    stopCurrent: function () {
      if (currentWorker) {
        try { currentWorker.terminate(); } catch (e) {}
        try { URL.revokeObjectURL(currentWorker.__aiaUrl); } catch (e) {}
        currentWorker = null;
      }
    },
    hasEmbeddedPassphrase: !!EMBEDDED_PASS,
    /** Giải mã + chạy (chỉ với JavaScript/TypeScript). */
    run: async function (options) {
      options = options || {};
      var bytes = await decrypt(options);
      var code = decode(bytes);
      if (!options.execute) return { code: code, bytes: bytes };
      if (options.mode === 'main') {
        var type = (options.type === 'module' || options.module) ? 'module' : 'text/javascript';
        var blob = new Blob([code], { type: type });
        var u = URL.createObjectURL(blob);
        var s = document.createElement('script');
        if (type === 'module') s.type = 'module';
        s.src = u;
        s.onload = function () { URL.revokeObjectURL(u); if (options.onDone) options.onDone(); };
        s.onerror = function () { if (options.onError) options.onError('Lỗi khi chạy script'); };
        document.head.appendChild(s);
        return { code: code, bytes: bytes };
      }
      var worker = AIA.runInWorker(code, options);
      return { code: code, bytes: bytes, worker: worker };
    },
    /** Tải bản rõ về máy. */
    download: async function (options) {
      options = options || {};
      var bytes = await decrypt(options);
      var name = options.fileName || META.file.name || 'decrypted.bin';
      var blob = new Blob([bytes], { type: 'application/octet-stream' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      return bytes;
    },
  };

  global.AIA_UNLOCK = AIA;
  if (typeof module !== 'undefined' && module.exports) module.exports = AIA;

  // Tự chạy: <script src="x.key.js" data-auto-run="1" data-pass="..."></script>
  if (typeof document !== 'undefined' && document.currentScript && document.currentScript.dataset.autoRun === '1') {
    var cs = document.currentScript;
    AIA.run({
      passphrase: cs.dataset.pass != null ? cs.dataset.pass : undefined,
      execute: true,
      mode: cs.dataset.mode || 'worker',
      onLog: function (level, args) { (console[level] || console.log).apply(console, args); },
      onError: function (m) { console.error('[AIA]', m); },
    }).catch(function (e) { console.error('[AIA] Không chạy được:', e && e.message ? e.message : e); });
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
`;
}

/* ------------------------------------------------- Sinh trang chạy thử --- */

/* ------------------------------------------------- Đoạn "chép là chạy" --- */

/**
 * Sinh một đoạn code TỰ CHỨA để người nhận chỉ cần dán vào Console / file .js là chạy:
 *  - kèm sẵn LINK key script (mặc định aia.key.js dùng chung cho mọi người),
 *  - kèm sẵn bản mã Base64,
 *  - tự nạp key script, tự giải mã, tự chạy (không cần mật khẩu nếu mã hoá không mật khẩu).
 *
 * @param {object} p
 * @param {object} p.meta            header meta (có file.name, keyUrl…)
 * @param {Uint8Array} p.containerBytes  toàn bộ tệp .aia
 * @param {string} [p.keyUrl]        link key script (nên là URL tuyệt đối)
 * @param {string|null} [p.keyScriptText] mã nguồn key script (chế độ riêng từng tệp)
 * @param {string} [p.passphrase]    mật khẩu nhúng sẵn ('' = không mật khẩu)
 * @param {boolean} [p.askPassphrase] true = hỏi mật khẩu khi chạy
 * @param {boolean} [p.execute]      false = chỉ tải bản rõ thay vì chạy
 */

/**
 * Bản "ẩn dấu vết": cùng chức năng nhưng KHÔNG có chú thích/tiêu đề, không lộ
 * link key dạng chữ thường, tên biến ngẫu nhiên, mọi chuỗi đều cắt nhỏ + Base64.
 * Lưu ý: đây chỉ là làm khó đọc, KHÔNG phải mã hoá — vẫn có thể khôi phục khi cần.
 */
export function buildRunSnippetStealth({
  meta,
  containerBytes,
  keyUrl = './aia.key.js',
  keyScriptText = null,
  passphrase = '',
  askPassphrase = false,
  execute = true,
}) {
  if (!(containerBytes instanceof Uint8Array)) throw new AIAError('BAD_INPUT', 'buildRunSnippet cần containerBytes dạng Uint8Array.');
  const fileName = (meta && meta.file && meta.file.name) || 'script.js';
  // Ưu tiên nhãn ngôn ngữ trong header (đã dò cả theo nội dung) — nếu không có mới xét đuôi tệp.
  const isJs = meta && meta.file && meta.file.lang
    ? isRunnableLang(meta.file.lang)
    : /\.(m?js|cjs|ts|jsx)$/i.test(fileName);

  const tag = bytesToHex(randomBytes(3));
  const id = (name) => '_' + name + tag;
  const N = {
    data: id('a'), url: id('b'), src: id('c'), pass: id('d'), file: id('e'), exec: id('f'),
    bytes: id('g'), stream: id('h'), glob: id('i'), load: id('j'), run: id('k'), save: id('l'),
    slog: id('m'), text: id('n'),
  };

  const cut = (str, size) => (String(str).match(new RegExp('.{1,' + size + '}', 'g')) || []);
  const b64 = bytesToBase64(containerBytes);
  const dataChunks = cut(b64, 197);
  const urlChunks = cut(bytesToBase64(utf8(keyUrl)), 53);
  const srcChunks = keyScriptText ? cut(bytesToBase64(utf8(keyScriptText)), 197) : null;
  const passB64 = passphrase ? bytesToBase64(utf8(passphrase)) : '';
  const fileB64 = bytesToBase64(utf8(fileName));

  return `(function () {
  'use strict';
  var ${N.data} = ${JSON.stringify(dataChunks)};
  var ${N.url} = ${JSON.stringify(urlChunks)};
  var ${N.src} = ${srcChunks ? JSON.stringify(srcChunks) : 'null'};
  var ${N.pass} = ${askPassphrase ? 'null' : JSON.stringify(passB64)};
  var ${N.file} = ${JSON.stringify(cut(fileB64, 41))};
  var ${N.exec} = ${execute && isJs ? '1' : '0'};

  function ${N.bytes}(s) {
    var bin = atob(s), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function ${N.text}(s) {
    return new TextDecoder().decode(${N.bytes}(s));
  }
  function ${N.stream}(u8) {
    if (typeof ReadableStream !== 'function') return u8;
    if (typeof Blob === 'function' && Blob.prototype && Blob.prototype.stream) return new Blob([u8]).stream();
    return new ReadableStream({
      start: function (c) { c.enqueue(u8); c.close(); },
    });
  }
  function ${N.glob}(name) {
    var api = globalThis[atob(name)];
    return api && typeof api === 'object' ? api : null;
  }
  function ${N.slog}(msg) {
    try { console.error(msg); } catch (e) {}
  }
  function ${N.load}() {
    return new Promise(function (ok, no) {
      var inline = ${N.src};
      if (inline) {
        try { (0, eval)(${N.text}(inline.join(''))); ok(); } catch (e) { no(e); }
        return;
      }
      if (${N.glob}('QUlBX0tFWQ==')) { ok(); return; }
      if (typeof document === 'undefined') { no(new Error('No DOM')); return; }
      var s = document.createElement('script');
      s.src = ${N.text}(${N.url}.join(''));
      s.async = true;
      s.onload = function () { ok(); };
      s.onerror = function () { no(new Error('Load failed')); };
      (document.head || document.documentElement).appendChild(s);
    });
  }
  function ${N.save}(u8) {
    if (typeof document === 'undefined') throw new Error('No DOM');
    var blob = new Blob([u8], { type: 'application/octet-stream' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = ${N.text}(${N.file}.join(''));
    document.body.appendChild(a);
    a.click();
    try { if (a.remove) a.remove(); } catch (e) {}
    setTimeout(function () { try { URL.revokeObjectURL(a.href); } catch (e) {} }, 4000);
  }
  async function ${N.run}() {
    var p = ${N.pass};
    if (p === null) {
      // hỏi người dùng: họ gõ mật khẩu dạng chữ thường
      p = typeof prompt === 'function' ? (prompt('Key') || '') : '';
    } else if (p) {
      p = ${N.text}(p);
    }
    var u8 = ${N.bytes}(${N.data}.join(''));
    var src = ${N.stream}(u8);
    var plain = null;
    var shared = ${N.glob}('QUlBX0tFWQ==');
    if (shared && typeof shared.open === 'function') {
      var res = await shared.open({ source: src, passphrase: p });
      plain = res.bytes;
    } else {
      var local = ${N.glob}('QUlBX1VOTE9DSw==');
      if (!local || typeof local.decrypt !== 'function') throw new Error('No API');
      plain = await local.decrypt({ source: src, passphrase: p });
    }
    if (!${N.exec}) { ${N.save}(plain); return; }
    (0, eval)(new TextDecoder().decode(plain));
  }
  ${N.load}().then(function () { return ${N.run}(); }).then(null, function (e) {
    ${N.slog}(e && e.message ? e.message : String(e));
  });
})();
`;
}

export function buildRunSnippet(opts = {}) {
  // style: 'labeled' (có chú thích) | 'stealth' (ẩn dấu vết, khó nhận ra)
  if (opts.style === 'stealth' || opts.stealth === true) return buildRunSnippetStealth(opts);
  const {
    meta,
    containerBytes,
    keyUrl = './aia.key.js',
    keyScriptText = null,
    passphrase = '',
    askPassphrase = false,
    execute = true,
  } = opts;
  if (!(containerBytes instanceof Uint8Array)) throw new AIAError('BAD_INPUT', 'buildRunSnippet cần containerBytes dạng Uint8Array.');
  const fileName = (meta && meta.file && meta.file.name) || 'script.js';
  // Ưu tiên nhãn ngôn ngữ trong header (đã dò cả theo nội dung) — nếu không có mới xét đuôi tệp.
  const isJs = meta && meta.file && meta.file.lang
    ? isRunnableLang(meta.file.lang)
    : /\.(m?js|cjs|ts|jsx)$/i.test(fileName);
  const b64 = bytesToBase64(containerBytes);
  const keySrcJson = keyScriptText ? JSON.stringify(keyScriptText) : 'null';
  const passJson = askPassphrase ? 'null' : JSON.stringify(String(passphrase || ''));
  const modeText = askPassphrase ? 'có mật khẩu (sẽ hỏi khi chạy)' : passphrase ? 'có mật khẩu (nhúng sẵn)' : 'KHÔNG mật khẩu';

  return `/*!
 * AIA Secure Script — đoạn "chép là chạy"
 * Tệp gốc   : ${fileName}
 * Tạo lúc   : ${meta.time ? meta.time.readable : ''}
 * Key ID    : ${meta.kdf && meta.kdf.kid ? meta.kdf.kid : ''}
 * Link key  : ${keyUrl}
 * Bảo vệ    : ${modeText}
 *
 * CÁCH DÙNG: chép TOÀN BỘ đoạn này → dán vào Console (F12) hoặc một tệp .js và chạy.
 * Đoạn code tự nạp key script từ link ở trên, tự giải mã rồi chạy code gốc.
 * Cần mạng để tải key script. Không cần cài gì thêm.
 */
(async function () {
  'use strict';

  var KEY_URL = ${JSON.stringify(String(keyUrl))};
  var KEY_SRC = ${keySrcJson}; // chế độ riêng từng tệp: mã nguồn key script nhúng sẵn
  var DATA = ${JSON.stringify(b64)};
  var PASS = ${passJson}; // null = hỏi người dùng, '' = không mật khẩu
  var FILE = ${JSON.stringify(fileName)};
  var EXEC = ${execute && isJs ? 'true' : 'false'};

  function say() {
    try { console.log.apply(console, ['[AIA]'].concat([].slice.call(arguments))); } catch (e) {}
  }

  function toBytes(b64) {
    var bin = atob(b64);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function streamOf(bytes) {
    if (typeof ReadableStream !== 'function') return bytes;
    if (typeof Blob === 'function' && Blob.prototype && Blob.prototype.stream) {
      return new Blob([bytes]).stream();
    }
    return new ReadableStream({
      start: function (c) {
        c.enqueue(bytes);
        c.close();
      },
    });
  }

  function loadKeyScript() {
    return new Promise(function (ok, fail) {
      if (KEY_SRC) {
        try {
          (0, eval)(KEY_SRC);
          ok();
        } catch (e) {
          fail(e);
        }
        return;
      }
      if (globalThis.AIA_KEY) {
        ok();
        return;
      }
      if (typeof document === 'undefined') {
        fail(new Error('Không nạp được key script (môi trường không có DOM). Link: ' + KEY_URL));
        return;
      }
      var s = document.createElement('script');
      s.src = KEY_URL;
      s.async = true;
      s.onload = function () { ok(); };
      s.onerror = function () { fail(new Error('Không tải được key script: ' + KEY_URL)); };
      (document.head || document.documentElement).appendChild(s);
    });
  }

  async function decryptAll() {
    var pass = PASS;
    if (pass === null) {
      pass = typeof prompt === 'function' ? prompt('Nhập mật khẩu để mở ' + FILE) || '' : '';
    }
    var bytes = toBytes(DATA);
    if (globalThis.AIA_KEY && typeof AIA_KEY.open === 'function') {
      var res = await AIA_KEY.open({ source: streamOf(bytes), passphrase: pass });
      return res.bytes;
    }
    if (globalThis.AIA_UNLOCK && typeof AIA_UNLOCK.decrypt === 'function') {
      return await AIA_UNLOCK.decrypt({ source: streamOf(bytes), passphrase: pass });
    }
    throw new Error('Key script không có API giải mã (AIA_KEY / AIA_UNLOCK).');
  }

  function save(bytes) {
    if (typeof document === 'undefined') throw new Error('Không có DOM để tải tệp — hãy chạy trong trình duyệt.');
    var blob = new Blob([bytes], { type: 'application/octet-stream' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = FILE;
    document.body.appendChild(a);
    a.click();
    try { if (a.remove) a.remove(); } catch (e) {}
    setTimeout(function () { try { URL.revokeObjectURL(a.href); } catch (e) {} }, 4000);
  }

  try {
    await loadKeyScript();
    say('đang giải mã', FILE, '…');
    var plain = await decryptAll();
    say('giải mã OK:', plain.length, 'byte');
    if (!EXEC) {
      save(plain);
      say('đã tải bản rõ:', FILE, '(' + plain.length + ' byte)');
      return;
    }
    var code = new TextDecoder().decode(plain);
    (0, eval)(code);
    say('đã chạy', FILE);
  } catch (err) {
    var msg = err && err.message ? err.message : String(err);
    try { console.error('[AIA] lỗi:', msg); } catch (e) {}
  }
})();
`;
}

export function buildRunnerHtml(meta, opts = {}) {
  const title = `AIA Runner — ${escapeHtml(meta.file.name)}`;
  const metaJson = JSON.stringify(meta).replace(/</g, '\\u003c');
  const keyName = opts.keyFileName || 'key.js';
  const shared = meta.keyWrapIn === 'shared-key-script';
  const payloadUrl = './' + (meta.payload.file || 'payload.aia');
  // Trình duyệt chỉ chạy được JS/TS — tệp Lua/Python… chỉ giải mã + tải bản rõ.
  const runnable = meta.file && meta.file.lang ? isRunnableLang(meta.file.lang) : true;
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif;
         background: #070b14; color: #e6edf7; min-height: 100vh; }
  .wrap { max-width: 980px; margin: 0 auto; padding: 28px 18px 60px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #8fa3c0; font-size: 13px; margin-bottom: 20px; }
  .card { background: #0e1727; border: 1px solid #1d2c44; border-radius: 14px; padding: 18px; margin-bottom: 16px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }
  .k { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #7f93b3; }
  .v { font-size: 14px; word-break: break-all; margin-top: 3px; }
  label { display: block; font-size: 12px; color: #9fb2c9; margin-bottom: 6px; }
  input[type=password] { width: 100%; padding: 11px 12px; border-radius: 10px; border: 1px solid #24344e;
                         background: #0a1220; color: #e6edf7; font-size: 14px; }
  .row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
  button { border: 0; border-radius: 10px; padding: 11px 16px; font-size: 14px; font-weight: 600;
           cursor: pointer; background: #2563eb; color: white; }
  button.ghost { background: #17233a; color: #c6d4e6; border: 1px solid #24344e; }
  button:disabled { opacity: .5; cursor: not-allowed; }
  #log { background: #060a12; border: 1px solid #1b2940; border-radius: 10px; padding: 12px;
         font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12.5px; height: 300px;
         overflow: auto; white-space: pre-wrap; line-height: 1.55; }
  .l-log { color: #cbd8ea; } .l-warn { color: #fbbf24; } .l-error { color: #ff7b72; } .l-info { color: #7dd3fc; }
  .badge { display: inline-block; padding: 3px 9px; border-radius: 999px; font-size: 11px; background: #17233a; color: #9fb2c9; }
  .ok { background: #052e1a; color: #6ee7a8; } .bad { background: #3a0d12; color: #ff9ca3; }
  .hint { color: #7f93b3; font-size: 12px; margin-top: 8px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>Trình chạy bản mã</h1>
  <div class="sub">Trang này dùng <code>${escapeHtml(keyName)}</code> để mở tệp dữ liệu đã mã hoá. Cần chạy qua HTTP(S) — mở trực tiếp bằng <code>file://</code> sẽ bị chặn.</div>

  <div class="card">
    <div class="grid">
      <div><div class="k">Tệp gốc</div><div class="v">${escapeHtml(meta.file.name)}</div></div>
      <div><div class="k">Kích thước</div><div class="v">${formatBytes(meta.file.size)}</div></div>
      <div><div class="k">Thời gian tạo (không mã hoá)</div><div class="v">${escapeHtml(meta.time.readable)}</div></div>
      <div><div class="k">Link key</div><div class="v">${escapeHtml(meta.keyUrl)}</div></div>
      <div><div class="k">Mã hoá</div><div class="v">${escapeHtml(meta.alg)} · PBKDF2 ${meta.kdf.iterations} vòng</div></div>
      <div><div class="k">Hết hạn</div><div class="v">${meta.expiry ? escapeHtml(new Date(meta.expiry).toLocaleString('vi-VN')) : 'không đặt'}</div></div>
    </div>
  </div>

  <div class="card">
    <label for="pass">Mật khẩu (nếu có)</label>
    <input id="pass" type="password" placeholder="Nhập mật khẩu dùng lúc mã hoá..." autocomplete="off">
    <div class="row">
      <button id="run">Giải mã &amp; chạy</button>
      <button id="verify" class="ghost">Chỉ kiểm tra</button>
      <button id="dl" class="ghost">Tải bản rõ</button>
      <span id="status" class="badge">sẵn sàng</span>
    </div>
    <div class="hint">Script được chạy trong Web Worker (không treo trang). Muốn chạy trên trang chính, dùng <code>AIA_UNLOCK.run({execute:true, mode:'main'})</code>.</div>
    ${runnable ? '' : '<div class="hint" style="border-color:#b45309;background:#3b2a12;color:#fbbf24">⚠ Tệp gốc là ' + escapeHtml(String((meta && meta.file && meta.file.lang) || '')) + ' — trình duyệt chỉ chạy được JavaScript/TypeScript. Trang này chỉ giải mã và cho <b>Tải bản rõ</b>.</div>'}
    ${runnable ? '' : '<div class="hint" style="border-color:#b45309;background:#3b2a12;color:#fbbf24">⚠ Tệp gốc là ' + escapeHtml(String((meta && meta.file && meta.file.lang) || '')) + ' — trình duyệt chỉ chạy được JavaScript/TypeScript. Trang này chỉ giải mã và cho <b>Tải bản rõ</b>.</div>'}
  </div>

  <div class="card">
    <div class="k" style="margin-bottom:8px">Nhật ký</div>
    <div id="log"></div>
  </div>
</div>

<script src="./${escapeHtml(keyName)}"></script>
<script>
(function () {
  var META = ${metaJson};
  var SHARED = ${shared ? 'true' : 'false'};
  var RUNNABLE = ${runnable ? 'true' : 'false'};
  var RUNNABLE = ${runnable ? 'true' : 'false'};
  var PAYLOAD = ${JSON.stringify(payloadUrl)};
  var log = document.getElementById('log');
  var statusEl = document.getElementById('status');
  var passEl = document.getElementById('pass');
  var busy = false;

  function explain(msg) {
    var m = String(msg == null ? '' : msg);
    if (/Unexpected identifier|Unexpected token|SyntaxError|Unexpected end of input/i.test(m)) {
      return m + '\\n→ Lỗi cú pháp của chính tệp gốc (không phải lỗi mã hoá): tệp không phải JavaScript nên trình duyệt không chạy được. Bấm \"Tải bản rõ\" để lấy code.';
    }
    return m;
  }

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = 'badge' + (cls ? ' ' + cls : '');
  }
  function print(level, args) {
    var line = document.createElement('div');
    line.className = 'l-' + (level || 'log');
    line.textContent = (Array.isArray(args) ? args.join(' ') : String(args));
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  }
  function getPass() {
    return passEl.value.length ? passEl.value : undefined;
  }
  function fail(e) {
    print('error', '[AIA] ' + (e && e.message ? e.message : e));
    setStatus('lỗi', 'bad');
  }

  // Lớp tương thích: chế độ riêng từng tệp dùng AIA_UNLOCK của key script riêng;
  // chế độ dùng chung dùng AIA_KEY của aia.key.js (không biết trước tệp payload).
  function sharedOpen(pass) {
    return AIA_KEY.open({ url: PAYLOAD, passphrase: pass });
  }
  function checkExpiry() {
    if (SHARED) { return META.expiry && Date.now() > Date.parse(META.expiry); }
    return AIA_UNLOCK.checkExpiry();
  }

  document.getElementById('run').addEventListener('click', async function () {
    if (busy) return;
    if (!RUNNABLE) {
      // không phải JS/TS: chỉ giải mã rồi tải bản rõ, không đưa vào Worker
      print('warn', '[AIA] Tệp gốc là ' + (META.file && META.file.lang ? META.file.lang : 'không rõ') +
        ' — trình duyệt không chạy được. Đang giải mã để tải bản rõ…');
      document.getElementById('dl').click();
      return;
    }
    busy = true; log.innerHTML = '';
    if (checkExpiry()) { print('error', '[AIA] Bản mã đã hết hạn dùng.'); busy = false; return; }
    setStatus('đang giải mã…');
    try {
      if (SHARED) {
        var res = await sharedOpen(getPass());
        var code = new TextDecoder().decode(res.bytes);
        var head = "var L=function(t){return function(){var a=[].slice.call(arguments).map(function(x){try{return typeof x==='object'?JSON.stringify(x):String(x)}catch(e){return String(x)}});postMessage({type:'log',level:t,args:a})}};self.console={log:L('log'),info:L('info'),warn:L('warn'),error:L('error'),debug:L('log')};self.addEventListener('error',function(e){postMessage({type:'error',message:String(e.message||e)})});self.addEventListener('unhandledrejection',function(e){postMessage({type:'error',message:String(e.reason)})});try{";
        var tail = "}catch(e){postMessage({type:'error',message:String(e&&(e.stack||e.message)||e)});}postMessage({type:'done'});";
        var worker = new Worker(URL.createObjectURL(new Blob([head + code + tail], { type: 'text/javascript' })));
        worker.onmessage = function (ev) {
          var d = ev.data || {};
          if (d.type === 'log') print(d.level, d.args);
          else if (d.type === 'error') print('error', '[runtime] ' + explain(d.message));
          else if (d.type === 'done') { print('info', '[AIA] script đã chạy xong.'); setStatus('đã chạy', 'ok'); }
        };
        busy = false;
        return;
      }
      await AIA_UNLOCK.run({
        passphrase: getPass(),
        execute: true,
        mode: 'worker',
        onLog: function (level, args) { print(level, args); },
        onError: function (msg) { print('error', '[runtime] ' + explain(msg)); },
        onDone: function () { print('info', '[AIA] script đã chạy xong.'); setStatus('đã chạy', 'ok'); },
        onFetchProgress: function (loaded, total) {
          if (total) setStatus('đang tải ' + Math.round(loaded / total * 100) + '%');
        },
        onProgress: function (done, total) {
          setStatus('giải mã ' + Math.round(done / total * 100) + '%');
        },
      });
    } catch (e) { fail(e); }
    busy = false;
  });

  document.getElementById('verify').addEventListener('click', async function () {
    if (busy) return;
    busy = true; log.innerHTML = '';
    setStatus('đang kiểm tra…');
    try {
      var bytes = SHARED ? (await sharedOpen(getPass())).bytes : await AIA_UNLOCK.decrypt({ passphrase: getPass() });
      print('info', '[AIA] OK — giải mã thành công ' + bytes.length + ' byte, toàn vẹn AES-GCM hợp lệ.');
      setStatus('toàn vẹn OK', 'ok');
    } catch (e) { fail(e); }
    busy = false;
  });

  document.getElementById('dl').addEventListener('click', async function () {
    if (busy) return;
    busy = true;
    setStatus('đang giải mã để tải…');
    try {
      if (SHARED) {
        var r2 = await sharedOpen(getPass());
        var blob = new Blob([r2.bytes], { type: 'application/octet-stream' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = r2.header.file.name || META.file.name;
        document.body.appendChild(a); a.click(); a.remove();
      } else {
        await AIA_UNLOCK.download({ passphrase: getPass() });
      }
      setStatus('đã tải', 'ok');
    } catch (e) { fail(e); }
    busy = false;
  });
})();
</script>
</body>
</html>
`;
}

export function buildReadme(meta, opts = {}) {
  const keyName = opts.keyFileName || 'key.js';
  const runnerName = opts.runnerFileName || 'run.html';
  return `AIA SECURE SCRIPT — GÓI BẢN MÃ
=====================================

Tệp gốc      : ${meta.file.name}
Kích thước   : ${formatBytes(meta.file.size)} (${meta.file.size} byte)
Thời gian tạo: ${meta.time.readable}  (raw=${meta.time.raw}, unixMs=${meta.time.unixMs})
Link key     : ${meta.keyUrl}
Mã hoá       : ${meta.alg}, PBKDF2-HMAC-SHA256 ${meta.kdf.iterations} vòng
Tệp dữ liệu  : ${meta.payload.file}
Bắt buộc key : ${
    meta.keyWrapIn === 'shared-key-script'
      ? 'CÓ — dùng key script DÙNG CHUNG aia.key.js (một link cho mọi tệp, mọi người) + mật khẩu'
      : meta.keyWrapIn === 'key-script'
        ? 'CÓ — khoá tệp chỉ nằm trong key script, thiếu là không mở được'
        : 'không (khoá dẫn xuất trực tiếp từ header + mật khẩu)'
  }
Hạn dùng     : ${meta.expiry ? new Date(meta.expiry).toLocaleString('vi-VN') : 'không đặt'}

CÁCH CHẠY (QUAN TRỌNG)
-----------------------
1) Đặt 3 tệp cạnh nhau:
     ${meta.payload.file}
     ${keyName}
     ${runnerName}
2) Phục vụ thư mục bằng HTTP (KHÔNG mở file:// trực tiếp):
     python3 -m http.server 8080
     # rồi mở: http://localhost:8080/${runnerName}
3) Nhập mật khẩu (nếu lúc mã hoá có đặt) và bấm "Giải mã & chạy".

Hoặc nhúng vào trang của bạn:
     <script src="./${keyName}"></script>
     <script>
       AIA_UNLOCK.run({ passphrase: '...', execute: true })
         .catch(function (e) { console.error(e.message); });
     </script>

CẢNH BÁO BẢO MẬT
-----------------
- Header chứa ngày giờ + link key ở dạng ĐỌC ĐƯỢC (theo thiết kế). Vì vậy mật khẩu
  là bí mật thật sự duy nhất. Nếu không đặt mật khẩu, ai có 2 tệp là mở được.
- Hạn dùng (expiry) chỉ là kiểm tra phía client, có thể bị vô hiệu hoá bằng cách sửa code.
- Không có hệ thống nào bảo vệ code tuyệt đối khi chạy trên máy người khác.
`;
}

/* ---------------------------------------------------------------- ZIP --- */

/* ------------------------------------------------------ Mã hoá LINK (URL) --- */

/**
 * Mã hoá một LINK (link trang web hoặc link script) thành một chuỗi ngắn
 * `AIALNK1.<base64url>` — chỉ mở được khi có key script dùng chung (và mật khẩu,
 * nếu đặt). Cùng nguyên tắc khoá như tệp .aia: PBKDF2(thời gian + link key +
 * mật khẩu + khoá gốc trong key script).
 *
 * Cấu trúc (sau khi giải base64url):
 *   [2 byte BE: độ dài header][header JSON][IV 12 byte][ciphertext + tag 16 byte]
 * Header để ĐỌC ĐƯỢC: { v, t: thời gian raw 17 số, x: unixMs, u: link key,
 *                        s: salt, n: số vòng KDF, k: keyId }
 * Toàn bộ header (trừ k) đều tham gia tạo khoá ⇒ sửa header là không mở được.
 */
export const LINK_PREFIX = 'AIALNK1.';
export const LINK_VERSION = 1;
export const LINK_AAD_TAG = 'AIA-LINK1';
export const LINK_MAX_CHARS = 8192; // độ dài URL tối đa
export const LINK_TOKEN_MAX_CHARS = 200000;

export function bytesToBase64Url(bytes) {
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlToBytes(str) {
  const s = String(str || '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return base64ToBytes(s + pad);
}

/** Kiểm tra + chuẩn hoá link. Chỉ nhận http/https (chặn javascript:, data:…). */
export function normalizeLink(input) {
  const raw = String(input == null ? '' : input).trim();
  if (!raw) throw new AIAError('LINK_EMPTY', 'Chưa nhập link cần mã hoá.');
  if (raw.length > LINK_MAX_CHARS) {
    throw new AIAError('LINK_TOO_LONG', `Link quá dài (tối đa ${LINK_MAX_CHARS} ký tự).`);
  }
  let u;
  try {
    u = new URL(raw);
  } catch {
    throw new AIAError('LINK_INVALID', 'Link không hợp lệ. Ví dụ đúng: https://example.com/script.js');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new AIAError('LINK_SCHEME', 'Chỉ nhận link http:// hoặc https:// (không nhận javascript:, data:…).');
  }
  return u.href;
}

function linkAad(header) {
  return utf8(JSON.stringify([LINK_AAD_TAG, String(header.t), String(header.u)]));
}

/** Mã hoá link → token. Trả về { token, header, bytes }. */
export async function encryptLink(url, opts = {}) {
  const target = normalizeLink(url);
  const keyUrl = String(opts.keyUrl || './aia.key.js');
  const passphrase = String(opts.passphrase || '');
  const iterations = Number(opts.iterations) || DEFAULT_ITERATIONS;
  const sharedKey = opts.sharedKey ? sharedKeyToString(opts.sharedKey) : '';
  if (!sharedKey) {
    throw new AIAError('NO_SHARED_KEY', 'Cần khoá của key script dùng chung (aia.key.js) để mã hoá link.');
  }
  const time = makeTimestamp(opts.date instanceof Date ? opts.date : new Date());
  const salt = randomBytes(16);
  const { key, kid } = await deriveAesKey(
    { timeRaw: time.raw, unixMs: time.unixMs, keyUrl, passphrase, salt, iterations, sharedKey },
    ['encrypt'],
  );
  const header = {
    v: LINK_VERSION,
    t: time.raw,
    x: time.unixMs,
    u: keyUrl,
    s: bytesToBase64(salt),
    n: iterations,
    k: kid,
  };
  const iv = randomBytes(12);
  const plain = utf8(JSON.stringify({ u: target }));
  const ct = new Uint8Array(
    await asyncSubtle().encrypt(
      { name: 'AES-GCM', iv, additionalData: linkAad(header), tagLength: 128 },
      key,
      plain,
    ),
  );
  const headerBytes = utf8(JSON.stringify(header));
  if (headerBytes.length > 65535) throw new AIAError('BAD_HEADER', 'Header link quá dài.');
  const bytes = new Uint8Array(2 + headerBytes.length + iv.length + ct.length);
  bytes[0] = (headerBytes.length >>> 8) & 0xff;
  bytes[1] = headerBytes.length & 0xff;
  bytes.set(headerBytes, 2);
  bytes.set(iv, 2 + headerBytes.length);
  bytes.set(ct, 2 + headerBytes.length + iv.length);
  return { token: LINK_PREFIX + bytesToBase64Url(bytes), header, bytes, keyUrl };
}

/** Tách token → { header, iv, ciphertext, bytes }. Ném lỗi nếu không phải token link. */
export function parseLinkToken(token) {
  let s = String(token == null ? '' : token).trim().replace(/\s+/g, '');
  if (!s) throw new AIAError('LINK_EMPTY', 'Chưa nhập token link.');
  if (s.length > LINK_TOKEN_MAX_CHARS) throw new AIAError('LINK_BAD_TOKEN', 'Token quá dài.');
  if (s.slice(0, LINK_PREFIX.length).toUpperCase() === LINK_PREFIX) s = s.slice(LINK_PREFIX.length);
  let bytes;
  try {
    bytes = base64UrlToBytes(s);
  } catch {
    throw new AIAError('LINK_BAD_TOKEN', 'Token không phải base64url hợp lệ.');
  }
  if (bytes.length < 2 + 12 + 16) throw new AIAError('LINK_BAD_TOKEN', 'Token bị cắt cụt.');
  const hlen = (bytes[0] << 8) | bytes[1];
  if (hlen <= 0 || 2 + hlen + 12 + 16 > bytes.length) throw new AIAError('LINK_BAD_TOKEN', 'Header trong token không hợp lệ.');
  let header;
  try {
    header = JSON.parse(fromUtf8(bytes.subarray(2, 2 + hlen)));
  } catch {
    throw new AIAError('LINK_BAD_TOKEN', 'Header trong token hỏng.');
  }
  if (!header || typeof header !== 'object' || !header.t || !header.x || !header.u || !header.s || !header.n) {
    throw new AIAError('LINK_BAD_TOKEN', 'Token thiếu thông tin khoá.');
  }
  if (!Number.isFinite(Number(header.x)) || !Number.isFinite(Number(header.n))) {
    throw new AIAError('LINK_BAD_TOKEN', 'Thông tin khoá trong token không hợp lệ.');
  }
  if (header.v !== undefined && Number(header.v) !== LINK_VERSION) {
    throw new AIAError('LINK_BAD_TOKEN', 'Token link thuộc phiên bản không hỗ trợ.');
  }
  const iv = bytes.subarray(2 + hlen, 2 + hlen + 12);
  const ciphertext = bytes.subarray(2 + hlen + 12);
  return { header, iv, ciphertext, bytes };
}

/** Giải mã token → { url, header, keyUrl, createdAt }. */
export async function decryptLink(token, opts = {}) {
  const { header, iv, ciphertext } = parseLinkToken(token);
  const sharedKey = opts.sharedKey ? sharedKeyToString(opts.sharedKey) : '';
  if (!sharedKey) {
    throw new AIAError('NO_SHARED_KEY', 'Cần khoá của key script dùng chung (aia.key.js) để mở link.');
  }
  const passphrase = String(opts.passphrase || '');
  const iterations = Number(header.n);
  if (!Number.isFinite(iterations) || iterations < 1000 || iterations > 5000000) {
    throw new AIAError('LINK_BAD_TOKEN', 'Số vòng KDF trong token không hợp lệ.');
  }
  let salt;
  try {
    salt = base64ToBytes(String(header.s));
  } catch {
    throw new AIAError('LINK_BAD_TOKEN', 'Salt trong token hỏng.');
  }
  if (salt.length < 8 || salt.length > 1024) {
    throw new AIAError('LINK_BAD_TOKEN', 'Salt trong token không hợp lệ.');
  }
  const { key, kid } = await deriveAesKey(
    {
      timeRaw: String(header.t),
      unixMs: Number(header.x),
      keyUrl: String(header.u),
      passphrase,
      salt,
      iterations,
      sharedKey,
    },
    ['decrypt'],
  );
  if (header.k && kid !== header.k) {
    throw new AIAError('LINK_BAD_PASS', 'Sai mật khẩu hoặc sai key script.');
  }
  let plain;
  try {
    plain = new Uint8Array(
      await asyncSubtle().decrypt(
        { name: 'AES-GCM', iv, additionalData: linkAad(header), tagLength: 128 },
        key,
        ciphertext,
      ),
    );
  } catch (err) {
    throw new AIAError('LINK_AUTH_FAILED', 'Không mở được link: sai mật khẩu, sai key script hoặc token đã bị sửa.', err);
  }
  let payload;
  try {
    payload = JSON.parse(fromUtf8(plain));
  } catch {
    throw new AIAError('LINK_BAD_PAYLOAD', 'Nội dung trong token hỏng.');
  }
  const url = normalizeLink(payload && payload.u);
  return { url, header, keyUrl: String(header.u), createdAt: String(header.t) };
}

/**
 * Snippet "chép là chạy" cho link: tự nạp key script, tự mở khoá rồi mở link.
 * action: 'open' (mở tab mới) | 'load' (nạp làm script) | 'text' (chỉ in ra).
 */
export function buildLinkSnippet(opts = {}) {
  const token = String(opts.token || '');
  if (!token) throw new AIAError('LINK_EMPTY', 'Thiếu token link.');
  const stealth = opts.style !== 'labeled';
  const action = ['open', 'load', 'text'].includes(opts.action) ? opts.action : 'open';
  const keyUrl = String(opts.keyUrl || './aia.key.js');
  const askPassphrase = !!opts.askPassphrase;
  const passphrase = String(opts.passphrase || '');

  const cut = (str, size) => (String(str).match(new RegExp('.{1,' + size + '}', 'g')) || []);
  const tokenBody = token.replace(/^AIALNK1\./i, '');
  const tokChunks = cut(tokenBody, 197);
  const urlChunks = cut(bytesToBase64(utf8(keyUrl)), 53);
  const passB64 = passphrase ? bytesToBase64(utf8(passphrase)) : '';
  const tag = bytesToHex(randomBytes(3));
  const id = (name) => '_' + name + tag;
  const N = { tok: id('a'), url: id('b'), pass: id('c'), load: id('d'), go: id('e'), api: id('f'), out: id('g') };

  const body = `(function () {
  'use strict';
  var ${N.tok} = ${JSON.stringify(tokChunks)};
  var ${N.url} = ${JSON.stringify(urlChunks)};
  var ${N.pass} = ${askPassphrase ? 'null' : JSON.stringify(passB64)};

  function ${N.out}(s) {
    var bin = atob(s), o = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) o[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(o);
  }
  function ${N.api}() {
    var api = globalThis[atob('QUlBX0tFWQ==')];
    var fn = api ? api[atob('b3Blbkxpbms=')] : null;
    return typeof fn === 'function' ? api : null;
  }
  function ${N.load}() {
    return new Promise(function (ok, no) {
      if (${N.api}()) { ok(); return; }
      if (typeof document === 'undefined') { no(new Error('No DOM')); return; }
      var s = document.createElement('script');
      s.src = ${N.out}(${N.url}.join(''));
      s.async = true;
      s.onload = function () { ok(); };
      s.onerror = function () { no(new Error('Load failed')); };
      (document.head || document.documentElement).appendChild(s);
    });
  }
  async function ${N.go}() {
    var p = ${N.pass};
    if (p === null) {
      p = typeof prompt === 'function' ? (prompt('Key') || '') : '';
    } else if (p) {
      p = ${N.out}(p);
    }
    var api = ${N.api}();
    if (!api) throw new Error('No API');
    var info = await api[atob('b3Blbkxpbms=')](${N.tok}.join(''), { passphrase: p });
    var url = info && info.url;
    if (!url) throw new Error('No URL');
    var action = ${JSON.stringify(action)};
    if (action === 'text') {
      try { console.log(url); } catch (e) {}
      return url;
    }
    if (action === 'load') {
      await new Promise(function (ok, no) {
        var s = document.createElement('script');
        s.src = url;
        s.async = true;
        s.onload = function () { ok(); };
        s.onerror = function () { no(new Error('Script load failed')); };
        (document.head || document.documentElement).appendChild(s);
      });
      return url;
    }
    var w = null;
    try { w = window.open(url, '_blank', 'noopener'); } catch (e) {}
    if (!w) location.href = url;
    return url;
  }
  ${N.load}().then(function () { return ${N.go}(); }).then(null, function (e) {
    try { console.error(e && e.message ? e.message : String(e)); } catch (x) {}
  });
})();`;

  if (stealth) return body + '\n';
  const modeText = askPassphrase
    ? 'có mật khẩu (sẽ hỏi khi chạy)'
    : passphrase
      ? 'có mật khẩu (nhúng sẵn)'
      : 'KHÔNG mật khẩu';
  return `/*!
 * AIA Secure Script — mở LINK đã mã hoá
 * Link key  : ${keyUrl}
 * Bảo vệ    : ${modeText}
 * Hành động : ${action === 'load' ? 'nạp làm script' : action === 'text' ? 'chỉ in link ra console' : 'mở tab mới'}
 *
 * CÁCH DÙNG: chép toàn bộ đoạn này → dán vào Console (F12) hoặc tệp .js rồi chạy.
 * Đoạn code tự nạp key script, tự mở khoá token rồi ${action === 'load' ? 'nạp link như một script' : action === 'text' ? 'in link ra console' : 'mở link'}.
 * Cần mạng để tải key script.
 */
${body}
`;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * ZIP không nén (STORE) — đủ cho vài tệp nhỏ, không cần thư viện ngoài.
 * @param {Array<{name:string, data:Uint8Array|string}>} files
 */
export function createZip(files) {
  const now = new Date();
  const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff;
  const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;

  const entries = files.map((f) => {
    const nameBytes = utf8(f.name);
    const data = typeof f.data === 'string' ? utf8(f.data) : f.data;
    return { nameBytes, data, crc: crc32(data), offset: 0 };
  });

  let localSize = 0;
  for (const e of entries) localSize += 30 + e.nameBytes.length + e.data.length;
  let centralSize = 0;
  for (const e of entries) centralSize += 46 + e.nameBytes.length;

  const out = new Uint8Array(localSize + centralSize + 22);
  const dv = new DataView(out.buffer);
  let off = 0;

  for (const e of entries) {
    e.offset = off;
    dv.setUint32(off, 0x04034b50, true);
    dv.setUint16(off + 4, 20, true);
    dv.setUint16(off + 6, 0x0800, true); // UTF-8
    dv.setUint16(off + 8, 0, true); // STORE
    dv.setUint16(off + 10, dosTime, true);
    dv.setUint16(off + 12, dosDate, true);
    dv.setUint32(off + 14, e.crc, true);
    dv.setUint32(off + 18, e.data.length, true);
    dv.setUint32(off + 22, e.data.length, true);
    dv.setUint16(off + 26, e.nameBytes.length, true);
    dv.setUint16(off + 28, 0, true);
    out.set(e.nameBytes, off + 30);
    out.set(e.data, off + 30 + e.nameBytes.length);
    off += 30 + e.nameBytes.length + e.data.length;
  }

  const centralStart = off;
  for (const e of entries) {
    dv.setUint32(off, 0x02014b50, true);
    dv.setUint16(off + 4, 20, true);
    dv.setUint16(off + 6, 20, true);
    dv.setUint16(off + 8, 0x0800, true);
    dv.setUint16(off + 10, 0, true);
    dv.setUint16(off + 12, dosTime, true);
    dv.setUint16(off + 14, dosDate, true);
    dv.setUint32(off + 16, e.crc, true);
    dv.setUint32(off + 20, e.data.length, true);
    dv.setUint32(off + 24, e.data.length, true);
    dv.setUint16(off + 28, e.nameBytes.length, true);
    dv.setUint16(off + 30, 0, true);
    dv.setUint16(off + 32, 0, true);
    dv.setUint16(off + 34, 0, true);
    dv.setUint16(off + 36, 0, true);
    dv.setUint32(off + 38, 0, true);
    dv.setUint32(off + 42, e.offset, true);
    out.set(e.nameBytes, off + 46);
    off += 46 + e.nameBytes.length;
  }

  dv.setUint32(off, 0x06054b50, true);
  dv.setUint16(off + 8, entries.length, true);
  dv.setUint16(off + 10, entries.length, true);
  dv.setUint32(off + 12, off - centralStart, true);
  dv.setUint32(off + 16, centralStart, true);
  return out;
}

/* ------------------------------------------------------------- Tên tệp --- */

export function slugify(name) {
  const base = String(name || 'script')
    .replace(/\.[^.]+$/, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return base || 'script';
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
