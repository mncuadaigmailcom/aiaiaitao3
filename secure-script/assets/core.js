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
  const out = new Uint8Array(n);
  if (globalThis.crypto && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(out);
  } else {
    throw new AIAError('NO_CRYPTO', 'Môi trường không có crypto.getRandomValues');
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
  if (n < 1024) return n + ' B';
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

export function buildKeyMaterial({ timeRaw, unixMs, keyUrl, passphrase }) {
  // JSON để tránh nhập nhằng dấu phân cách nếu URL có ký tự lạ.
  return JSON.stringify([1, String(timeRaw), Number(unixMs), String(keyUrl || ''), String(passphrase || '')]);
}

async function deriveBits({ timeRaw, unixMs, keyUrl, passphrase, salt, iterations }) {
  const subtle = globalThis.crypto && globalThis.crypto.subtle;
  if (!subtle) throw new AIAError('NO_CRYPTO', 'Môi trường không hỗ trợ WebCrypto (cần HTTPS hoặc localhost)');
  const material = buildKeyMaterial({ timeRaw, unixMs, keyUrl, passphrase });
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

export async function deriveAesKey({ timeRaw, unixMs, keyUrl, passphrase, salt, iterations }, usages = ['decrypt']) {
  const bits = await deriveBits({ timeRaw, unixMs, keyUrl, passphrase, salt, iterations });
  const kid = await keyIdFromBits(bits);
  const key = await asyncSubtle().importKey('raw', bits, { name: 'AES-GCM' }, false, usages);
  return { key, kid };
}

/* ---------------------------------------------------------- Khối AES-GCM --- */

export function buildAad(index, isLast, totalChunks) {
  const aad = new Uint8Array(18);
  aad.set(MAGIC, 0); // 0..7
  aad[8] = VERSION; // 8
  const dv = new DataView(aad.buffer);
  dv.setUint32(9, index >>> 0, false); // 9..12
  aad[13] = isLast ? 1 : 0; // 13
  dv.setUint32(14, totalChunks >>> 0, false); // 14..17
  return aad;
}

export function buildIv(ivPrefix, index) {
  const iv = new Uint8Array(12);
  iv.set(ivPrefix, 0);
  new DataView(iv.buffer).setUint32(8, index >>> 0, false);
  return iv;
}

export async function sealChunk(key, { index, isLast, total, ivPrefix, bytes }) {
  return new Uint8Array(
    await asyncSubtle().encrypt(
      { name: 'AES-GCM', iv: buildIv(ivPrefix, index), additionalData: buildAad(index, isLast, total), tagLength: 128 },
      key,
      bytes,
    ),
  );
}

export async function openChunk(key, { index, isLast, total, ivPrefix, bytes }) {
  try {
    return new Uint8Array(
      await asyncSubtle().decrypt(
        { name: 'AES-GCM', iv: buildIv(ivPrefix, index), additionalData: buildAad(index, isLast, total), tagLength: 128 },
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
export function wrapAad({ id, timeRaw, unixMs, keyUrl }) {
  return utf8(JSON.stringify(['AIA1-WRAP', String(id), String(timeRaw), Number(unixMs), String(keyUrl)]));
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
    // true = khoá tệp ngẫu nhiên được bọc trong key script ⇒ thiếu key script là không mở được
    requireKeyScript: options.requireKeyScript === true,
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

  const { key: wrapKey, kid } = await deriveAesKey(
    { timeRaw: time.raw, unixMs: time.unixMs, keyUrl: opt.keyUrl, passphrase: opt.passphrase, salt, iterations: opt.iterations },
    ['encrypt'],
  );

  // Chế độ thường: dùng trực tiếp khoá dẫn xuất. Chế độ "bắt buộc key script":
  // sinh khoá tệp ngẫu nhiên, bọc nó bằng khoá dẫn xuất, và chỉ để bản đã bọc
  // trong META của key script (KHÔNG ghi vào header .aia).
  let key = wrapKey;
  let keyWrap = null;
  if (opt.requireKeyScript) {
    const fileKey = randomBytes(32);
    key = await asyncSubtle().importKey('raw', fileKey, { name: 'AES-GCM' }, false, ['encrypt']);
    keyWrap = await wrapFileKey(wrapKey, fileKey, wrapAad({ id, timeRaw: time.raw, unixMs: time.unixMs, keyUrl: opt.keyUrl }));
  }

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
    keyWrapIn: opt.requireKeyScript ? 'key-script' : 'header',
    encryptionSeconds: null,
  };
  if (keyWrap) meta.keyWrap = keyWrap; // chỉ dùng cho key script

  const headerMeta = { ...meta };
  delete headerMeta.keyWrap;
  const headerBytes = buildContainerHeader(headerMeta);
  await sink.write(headerBytes);

  let index = 0;
  let pending = new Uint8Array(opt.chunkSize);
  let pendingLen = 0;
  let processed = 0;
  const startedMs = nowMs();

  const flush = async (isLast) => {
    const bytes = isLast ? pending.subarray(0, pendingLen) : pending;
    const sealed = await sealChunk(key, { index, isLast, total, ivPrefix, bytes });
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
export async function decryptStream({ source, passphrase = '', sink, onProgress, keyWrap = null }) {
  const { meta, reader } = await readContainerHeaderFromSource(source);
  if (!meta || meta.format !== 'AIA1') throw new AIAError('BAD_FORMAT', 'Header không đúng định dạng AIA1.');
  const salt = base64ToBytes(meta.kdf.salt);
  const ivPrefix = base64ToBytes(meta.chunk.ivPrefix);
  const { key: wrapKey, kid } = await deriveAesKey({
    timeRaw: meta.time.raw,
    unixMs: meta.time.unixMs,
    keyUrl: meta.keyUrl,
    passphrase,
    salt,
    iterations: meta.kdf.iterations,
  });
  if (meta.kdf.kid && kid !== meta.kdf.kid) {
    throw new AIAError('WRONG_PASSPHRASE', 'Sai mật khẩu (hoặc link key script / thời gian trong header đã bị sửa).');
  }

  // Khoá tệp: ưu tiên bản trong key script; nếu header có (chế độ cũ) thì dùng header.
  const wrapInfo = keyWrap || meta.keyWrap || null;
  let key = wrapKey;
  if (wrapInfo) {
    const fileKey = await unwrapFileKey(
      wrapKey,
      wrapInfo,
      wrapAad({ id: meta.id, timeRaw: meta.time.raw, unixMs: meta.time.unixMs, keyUrl: meta.keyUrl }),
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
    const pt = await openChunk(key, { index: i, isLast: i === total - 1, total, ivPrefix, bytes: enc });
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

export async function decryptBytes(bytes, passphrase = '', onProgress, keyWrap = null) {
  const source = new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  return decryptStream({ source, passphrase, onProgress, keyWrap });
}

export async function sha256Hex(bytes) {
  const digest = await asyncSubtle().digest('SHA-256', bytes);
  return bytesToHex(new Uint8Array(digest));
}

export function nowMs() {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
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
    return utf8(JSON.stringify(['AIA1-WRAP', META.id, META.time.raw, META.time.unixMs, META.keyUrl]));
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

    var ivPrefix = b64d(META.chunk.ivPrefix);
    var size = META.file.size, cs = META.chunk.size, total = META.chunk.total;
    var parts = [], done = 0;
    for (var i = 0; i < total; i++) {
      var plainLen = Math.min(cs, size - i * cs);
      var enc = await reader.exact(plainLen + TAG_BYTES);
      try {
        var pt = new Uint8Array(await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: iv(ivPrefix, i), additionalData: aad(i, i === total - 1, total), tagLength: 128 },
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

export function buildRunnerHtml(meta, opts = {}) {
  const title = `AIA Runner — ${escapeHtml(meta.file.name)}`;
  const metaJson = JSON.stringify(meta).replace(/</g, '\\u003c');
  const keyName = opts.keyFileName || 'key.js';
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
  var log = document.getElementById('log');
  var statusEl = document.getElementById('status');
  var passEl = document.getElementById('pass');
  var busy = false;

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

  document.getElementById('run').addEventListener('click', async function () {
    if (busy) return;
    busy = true; log.innerHTML = '';
    if (AIA_UNLOCK.checkExpiry()) { print('error', '[AIA] Bản mã đã hết hạn dùng.'); busy = false; return; }
    setStatus('đang giải mã…');
    try {
      await AIA_UNLOCK.run({
        passphrase: getPass(),
        execute: true,
        mode: 'worker',
        onLog: function (level, args) { print(level, args); },
        onError: function (msg) { print('error', '[runtime] ' + msg); },
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
      var bytes = await AIA_UNLOCK.decrypt({ passphrase: getPass() });
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
      await AIA_UNLOCK.download({ passphrase: getPass() });
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
Bắt buộc key : ${meta.keyWrapIn === 'key-script' ? 'CÓ — khoá tệp chỉ nằm trong key script, thiếu là không mở được' : 'không (khoá dẫn xuất trực tiếp từ header + mật khẩu)'}
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
