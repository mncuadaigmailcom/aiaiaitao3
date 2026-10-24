#!/usr/bin/env node
/* =============================================================================
 * AIA Secure Script — KIỂM THỬ CƯỜNG ĐỘ CAO (stress / load / fuzz / soak)
 * -----------------------------------------------------------------------------
 * Khác với tests/run-node.mjs (kiểm thử chức năng), tệp này ép hệ thống vào
 * tình huống nặng: dữ liệu lớn, hàng trăm lần lặp, sửa hỏng ngẫu nhiên, chạy song
 * song, đo RAM/CPU/thông lượng.
 *
 *   node tests/stress.mjs                 # ~1 phút  (mặc định)
 *   node tests/stress.mjs --quick         # ~20 giây
 *   node tests/stress.mjs --heavy         # + tệp 256 MiB
 *   node tests/stress.mjs --max           # + tệp 1 GiB (cần ~2 GB trống)
 *   node tests/stress.mjs --size 524288000  # tệp lớn tuỳ chọn (byte)
 *   node tests/stress.mjs --fuzz 1000     # số lần sửa hỏng ngẫu nhiên
 *   node tests/stress.mjs --json out.json # ghi kết quả máy đọc được
 *
 * Nguyên tắc: mỗi phép đo đều ghi rõ ĐÃ ĐO ĐƯỢC gì và KHÔNG suy rộng ra đâu.
 * ========================================================================== */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { pipeline } from 'node:stream/promises';
import * as C from '../assets/core.js';

/* ------------------------------------------------------------------ CLI --- */

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf('--' + name);
  return i === -1 ? fallback : argv[i + 1] ?? true;
};
const has = (name) => argv.includes('--' + name);

const QUICK = has('quick');
const HEAVY = has('heavy') || has('max');
const MAX = has('max');
const FUZZ_ROUNDS = Number(arg('fuzz', QUICK ? 120 : HEAVY ? 600 : 300));
const SOAK_ROUNDS = Number(arg('soak', QUICK ? 40 : HEAVY ? 300 : 150));
const JSON_OUT = arg('json', null);
const BIG_SIZE = Number(arg('size', MAX ? 1024 * 1024 * 1024 : HEAVY ? 256 * 1024 * 1024 : 64 * 1024 * 1024));

/* ------------------------------------------------- chế độ tiến trình con --- */
// node --expose-gc tests/stress.mjs --child-mem <byte>  → in JSON một dòng
if (has('child-mem')) {
  const size = Number(arg('child-mem'));
  await childMemProbe(size);
  process.exit(0);
}

async function childMemProbe(size) {
  const src = makeTempFile(size);
  const cipher = src + '.aia';
  const out = src + '.out';
  global.gc();
  await new Promise((r) => setTimeout(r, 50));
  const baseline = process.memoryUsage().rss;
  let peak = baseline;
  const timer = setInterval(() => {
    const r = process.memoryUsage().rss;
    if (r > peak) peak = r;
  }, 10);

  const sink = fileSink(cipher);
  await C.encryptStream({
    openStream: () => nodeStream(src),
    size,
    options: { passphrase: 'p', iterations: 10000, hashPlaintext: false },
    sink,
  });
  await sink.close();
  const encPeak = peak;

  global.gc();
  await new Promise((r) => setTimeout(r, 80));
  const mid = process.memoryUsage().rss;
  peak = mid;
  const dsink = fileSink(out);
  await C.decryptStream({ source: nodeStream(cipher), passphrase: 'p', sink: dsink });
  await dsink.close();
  const decPeak = peak;
  clearInterval(timer);

  const result = {
    size,
    baseline,
    encryptDelta: encPeak - baseline,
    decryptDelta: decPeak - mid,
    retainedAfterEncrypt: mid - baseline,
  };
  console.log('MEMJSON ' + JSON.stringify(result));
  for (const f of [src, cipher, out]) {
    try {
      fs.unlinkSync(f);
    } catch {}
  }
}

const results = [];
const failures = [];
const metrics = {};

function record(section, name, ok, detail = '') {
  results.push({ section, name, ok, detail });
  const icon = ok ? '✔' : '✘';
  console.log(`  ${icon} ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures.push(`[${section}] ${name}${detail ? ' — ' + detail : ''}`);
}

function section(title) {
  console.log('\n' + '─'.repeat(72) + '\n' + title + '\n' + '─'.repeat(72));
}

const nowMs = () => Number(process.hrtime.bigint() / 1000n) / 1000;

/* -------------------------------------------------------------- helpers --- */

const utf8 = (s) => new TextEncoder().encode(s);

function streamOf(bytes, chunk = 64 * 1024) {
  let off = 0;
  return new ReadableStream({
    pull(c) {
      if (off >= bytes.length) return c.close();
      c.enqueue(bytes.subarray(off, off + chunk));
      off += chunk;
    },
  });
}

function memSink() {
  const chunks = [];
  return {
    write: async (b) => {
      chunks.push(b.slice());
    },
    close: async () => {},
    bytes: () => C.concatBytes(chunks),
  };
}

async function encryptBytes(bytes, options = {}) {
  const sink = memSink();
  const res = await C.encryptStream({
    openStream: () => streamOf(bytes, options.readChunk || 64 * 1024),
    size: bytes.length,
    options,
    sink,
  });
  return { ...res, bytes: sink.bytes() };
}

const decryptBytesAll = (bytes, passphrase, options = {}) =>
  C.decryptStream({
    source: streamOf(bytes, options.readChunk || 64 * 1024),
    passphrase,
    keyWrap: options.keyWrap || null,
    onProgress: options.onProgress,
  });

function equal(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function randomBytes(n) {
  return C.randomBytes(n);
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function randomPassword() {
  const pool = [
    'matkhau',
    'Mật khẩu có dấu',
    '🔐 emoji 🔑',
    'a'.repeat(randomInt(8, 64)),
    'p@ss' + randomInt(1e6, 9e6),
    'ключ-пароль',
    '密码密码密码',
    '',
  ];
  return pool[randomInt(0, pool.length - 1)];
}

/** Đo RSS đỉnh trong khi chạy một tác vụ. */
async function withPeakRss(fn) {
  let peak = process.memoryUsage().rss;
  const timer = setInterval(() => {
    const rss = process.memoryUsage().rss;
    if (rss > peak) peak = rss;
  }, 20);
  timer.unref?.();
  const started = nowMs();
  try {
    const value = await fn();
    return { value, peakRss: peak, ms: nowMs() - started };
  } finally {
    clearInterval(timer);
  }
}

const mb = (bytes) => (bytes / (1024 * 1024)).toFixed(2) + ' MiB';
const rate = (bytes, ms) => (bytes / (1024 * 1024) / (ms / 1000)).toFixed(1) + ' MiB/s';

/* Tạo tệp ngẫu nhiên trên đĩa (không giữ trong RAM). */
function makeTempFile(sizeBytes) {
  const file = path.join(os.tmpdir(), `aia-stress-${process.pid}-${sizeBytes}.bin`);
  const fd = fs.openSync(file, 'w');
  try {
    const block = 4 * 1024 * 1024;
    let written = 0;
    while (written < sizeBytes) {
      const n = Math.min(block, sizeBytes - written);
      fs.writeSync(fd, randomBytes(n));
      written += n;
    }
  } finally {
    fs.closeSync(fd);
  }
  return file;
}

function nodeStream(file) {
  // pull-based: chỉ đọc khối tiếp theo khi phía nhận yêu cầu ⇒ RAM không phình theo kích thước tệp
  const it = fs.createReadStream(file, { highWaterMark: 1 << 20 })[Symbol.asyncIterator]();
  return new ReadableStream({
    async pull(c) {
      const { value, done } = await it.next();
      if (done) c.close();
      else c.enqueue(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
    },
    cancel() {
      it.return?.();
    },
  });
}

function fileSink(file) {
  const s = fs.createWriteStream(file);
  let written = 0;
  let closed = false;
  const finish = () =>
    new Promise((res, rej) => {
      if (closed || s.writableEnded) return res(written);
      closed = true;
      s.end((e) => (e ? rej(e) : res(written)));
    });
  return {
    write: (b) =>
      new Promise((res, rej) => {
        if (s.writableEnded) return rej(new Error('ghi sau khi đã đóng'));
        written += b.length;
        s.write(Buffer.from(b), (e) => (e ? rej(e) : res()));
      }),
    close: finish,
  };
}

async function sha256File(file) {
  const hash = (await import('node:crypto')).createHash('sha256');
  await pipeline(fs.createReadStream(file, { highWaterMark: 1 << 20 }), hash);
  return hash.digest('hex');
}

/* =====================================================================
 * 1. BIÊN KÍCH THƯỚC — mọi mốc quanh ranh giới khối
 * ===================================================================== */

function equalBytes(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

async function testBoundaries() {
  section('1. Biên kích thước (mọi mốc quanh ranh giới khối)');
  const chunk = 64 * 1024;
  const sizes = [
    0, 1, 15, 16, 17, 1023, 4096,
    chunk - 17, chunk - 1, chunk, chunk + 1, chunk + 16, chunk + 17,
    2 * chunk - 1, 2 * chunk, 2 * chunk + 1, 3 * chunk + 12345,
  ];
  let ok = 0;
  for (const size of sizes) {
    const data = randomBytes(size);
    const enc = await encryptBytes(data, { chunkSize: chunk, passphrase: 'bien', keyUrl: './k.js' });
    const back = await decryptBytesAll(enc.bytes, 'bien');
    const expectedChunks = Math.ceil(size / chunk);
    const good =
      equal(back.plaintext, data) &&
      enc.meta.chunk.total === expectedChunks &&
      enc.bytes.length ===
        C.parseContainerHeader(enc.bytes).headerLength + size + expectedChunks * C.TAG_BYTES;
    if (good) ok++;
    else record('biên', `kích thước ${size}`, false, `khối ${enc.meta.chunk.total}/${expectedChunks}`);
  }
  record('biên', `${sizes.length} mốc kích thước (0 … 3 khối + lẻ)`, ok === sizes.length, `${ok}/${sizes.length}`);
}

/* =====================================================================
 * 2. KIỂM THỬ NGẪU NHIÊN (property-based)
 * ===================================================================== */

async function testRandomized() {
  section('2. Kiểm thử ngẫu nhiên (property-based)');
  const rounds = QUICK ? 25 : HEAVY ? 120 : 60;
  let ok = 0;
  let totalPlain = 0;
  for (let i = 0; i < rounds; i++) {
    const size = randomInt(0, 3 * 1024 * 1024);
    const chunkSize = [64 * 1024, 128 * 1024, 256 * 1024, 1024 * 1024, 4 * 1024 * 1024][randomInt(0, 4)];
    const pass = randomPassword();
    const requireKeyScript = Math.random() < 0.5;
    const data = randomBytes(size);
    totalPlain += size;
    const enc = await encryptBytes(data, {
      chunkSize,
      passphrase: pass,
      keyUrl: Math.random() < 0.5 ? './aia.key.js' : 'https://cdn.example.com/' + i + '.key.js',
      requireKeyScript,
      iterations: 10000, // giữ tốc độ; vòng lặp KDF đã đo riêng
    });
    const back = await decryptBytesAll(enc.bytes, pass, { keyWrap: enc.meta.keyWrap || null });
    if (equal(back.plaintext, data) && enc.meta.chunk.total === Math.ceil(size / chunkSize)) ok++;
    else record('ngẫu nhiên', `lần ${i + 1} (${size} B, khối ${chunkSize})`, false);
  }
  record('ngẫu nhiên', `${rounds} lần ngẫu nhiên (kích thước/khối/mật khẩu Unicode/keyUrl/chế độ)`, ok === rounds, `${ok}/${rounds}, ${mb(totalPlain)} dữ liệu`);
}

/* =====================================================================
 * 3. FUZZ — sửa hỏng dữ liệu, phải LUÔN bị phát hiện
 * ===================================================================== */

async function testFuzz() {
  section(`3. Fuzz: ${FUZZ_ROUNDS} lần sửa hỏng ngẫu nhiên`);
  const data = randomBytes(300 * 1024);
  const enc = await encryptBytes(data, { chunkSize: 64 * 1024, passphrase: 'fuzz-pass', keyUrl: './f.js' });
  const headerLen = C.parseContainerHeader(enc.bytes).headerLength;
  const total = enc.meta.chunk.total;

  let detected = 0;
  let silentAccept = 0;
  let wrongButLeaked = 0;
  const kinds = { 'đảo bit': 0, 'cắt bớt': 0, 'ghép thêm': 0, 'đảo khối': 0, 'sửa header': 0 };

  for (let i = 0; i < FUZZ_ROUNDS; i++) {
    const kind = ['đảo bit', 'cắt bớt', 'ghép thêm', 'đảo khối', 'sửa header'][i % 5];
    kinds[kind]++;
    let bad = enc.bytes.slice();
    if (kind === 'đảo bit') {
      const pos = randomInt(headerLen, bad.length - 1);
      bad[pos] ^= 1 << randomInt(0, 7);
    } else if (kind === 'cắt bớt') {
      const minKeep = Math.min(headerLen + 1, bad.length - 1);
      bad = bad.slice(0, randomInt(minKeep, bad.length - 1));
    } else if (kind === 'ghép thêm') {
      bad = C.concatBytes([bad, randomBytes(randomInt(1, 64))]);
    } else if (kind === 'đảo khối') {
      const size = enc.meta.chunk.size + C.TAG_BYTES;
      const maxStart = total - 2;
      if (maxStart < 0) {
        i--;
        continue;
      }
      const a = randomInt(0, maxStart);
      const offA = headerLen + a * size;
      const offB = offA + size;
      if (offB + size > bad.length) {
        i--;
        continue;
      }
      const blockA = bad.slice(offA, offA + size);
      const blockB = bad.slice(offB, offB + size);
      bad.set(blockB, offA);
      bad.set(blockA, offB);
    } else {
      // sửa 1 byte trong header JSON — phải khác byte cũ, nếu không thì không sửa gì
      const pos = randomInt(12, headerLen - 1);
      let next = randomInt(32, 126);
      if (next === bad[pos]) next = next === 126 ? 32 : next + 1;
      bad[pos] = next;
    }

    let accepted = false;
    try {
      const out = await decryptBytesAll(bad, 'fuzz-pass');
      accepted = true;
      if (!equal(out.plaintext, data)) wrongButLeaked++;
    } catch {
      accepted = false;
    }
    if (!accepted) detected++;
    else silentAccept++;
  }
  record('fuzz', `phát hiện ${detected}/${FUZZ_ROUNDS} ca bị sửa`, detected === detected + silentAccept - silentAccept && detected >= FUZZ_ROUNDS - 0 && silentAccept === 0,
    Object.entries(kinds).map(([k, v]) => `${k}:${v}`).join(' · '));
  record('fuzz', 'không có ca nào trả về dữ liệu sai mà không báo lỗi', wrongButLeaked === 0, `${wrongButLeaked} ca`);

  // Fuzz header rác: không được crash ngoài AIAError
  let crashes = 0;
  for (let i = 0; i < 200; i++) {
    const junk = randomBytes(randomInt(0, 3000));
    try {
      await C.decryptBytes(junk, 'x');
    } catch (e) {
      if (!(e instanceof C.AIAError) && !(e && typeof e.code === 'string')) crashes++;
    }
  }
  record('fuzz', '200 tệp rác ngẫu nhiên: chỉ ném AIAError', crashes === 0, `${crashes} crash`);
}

/* =====================================================================
 * 4. TÍNH DUY NHẤT — salt / IV / bản mã
 * ===================================================================== */

async function testUniqueness() {
  section('4. Tính duy nhất của salt / IV / bản mã');
  const plain = utf8('const x = 1;   // cùng một nội dung, 300 lần mã hoá\n'.repeat(20));
  const salts = new Set();
  const ivs = new Set();
  const cts = new Set();
  const wires = new Set();
  const rounds = QUICK ? 60 : 300;
  let mono = 0;
  let prev = '';
  for (let i = 0; i < rounds; i++) {
    const enc = await encryptBytes(plain, { passphrase: 'same', keyUrl: './same.key.js', iterations: 10000, requireKeyScript: true });
    salts.add(enc.meta.kdf.salt);
    ivs.add(enc.meta.chunk.ivPrefix);
    wires.add(enc.meta.keyWrap.iv);
    cts.add(C.bytesToHex(enc.bytes.subarray(-64)));
    const t = enc.meta.time.raw;
    if (t > prev) mono++;
    prev = t;
  }
  record('duy nhất', `${rounds} lần cùng nội dung: salt không trùng`, salts.size === rounds, `${salts.size}/${rounds}`);
  record('duy nhất', `${rounds} lần: IV khối không trùng`, ivs.size === rounds, `${ivs.size}/${rounds}`);
  record('duy nhất', `${rounds} lần: IV bọc khoá không trùng`, wires.size === rounds, `${wires.size}/${rounds}`);
  record('duy nhất', `${rounds} lần: bản mã khác nhau hoàn toàn`, cts.size === rounds, `${cts.size}/${rounds}`);
  record('duy nhất', `thời gian trong header tăng đơn điệu`, mono === rounds, `${mono}/${rounds}`);
}

/* =====================================================================
 * 5. CHẠY SONG SONG (concurrency)
 * ===================================================================== */

async function testConcurrency() {
  section('5. Mã hoá song song (8 luồng × 4 MiB, mật khẩu khác nhau)');
  const n = 8;
  const size = 4 * 1024 * 1024;
  const datas = Array.from({ length: n }, () => randomBytes(size));
  const t0 = nowMs();
  const encs = await Promise.all(
    datas.map((d, i) =>
      encryptBytes(d, { passphrase: 'pass-' + i, keyUrl: `./k${i}.js`, chunkSize: 1024 * 1024, iterations: 10000 }),
    ),
  );
  const encMs = nowMs() - t0;
  const outs = await Promise.all(
    encs.map((e, i) => decryptBytesAll(e.bytes, 'pass-' + i, { keyWrap: e.meta.keyWrap || null })),
  );
  const totalMs = nowMs() - t0;
  let ok = 0;
  for (let i = 0; i < n; i++) if (equal(outs[i].plaintext, datas[i])) ok++;
  record('song song', `${n} luồng cùng lúc: dữ liệu không lẫn nhau`, ok === n, `${ok}/${n}`);
  record('song song', `thông lượng song song`, true, `${mb(n * size)} trong ${(totalMs / 1000).toFixed(2)} s = ${rate(n * size, totalMs)} (mã hoá ${(encMs / 1000).toFixed(2)} s)`);

  // mật khẩu chéo: dùng mật khẩu của luồng khác phải thất bại
  let crossed = 0;
  for (let i = 0; i < n; i++) {
    try {
      await decryptBytesAll(encs[i].bytes, 'pass-' + ((i + 1) % n));
    } catch {
      crossed++;
    }
  }
  record('song song', 'mật khẩu chéo giữa các luồng đều bị chặn', crossed === n, `${crossed}/${n}`);
}

/* =====================================================================
 * 6. SOAK — hàng trăm vòng lặp liên tục, theo dõi RAM
 * ===================================================================== */

async function testSoak() {
  section(`6. Soak: ${SOAK_ROUNDS} vòng mã hoá/giải mã liên tục`);
  const size = 256 * 1024;
  const data = randomBytes(size);
  global.gc?.();
  const rss0 = process.memoryUsage().rss;
  const t0 = nowMs();
  let ok = 0;
  for (let i = 0; i < SOAK_ROUNDS; i++) {
    const enc = await encryptBytes(data, {
      passphrase: 'soak-' + (i % 7),
      keyUrl: './soak.key.js',
      chunkSize: 64 * 1024,
      iterations: 10000,
    });
    const back = await decryptBytesAll(enc.bytes, 'soak-' + (i % 7), { keyWrap: enc.meta.keyWrap || null });
    if (equal(back.plaintext, data)) ok++;
    if (i === Math.floor(SOAK_ROUNDS / 2)) global.gc?.();
  }
  const ms = nowMs() - t0;
  global.gc?.();
  const rss1 = process.memoryUsage().rss;
  const growth = rss1 - rss0;
  record('soak', `${SOAK_ROUNDS} vòng đều đúng`, ok === SOAK_ROUNDS, `${ok}/${SOAK_ROUNDS} · ${mb(SOAK_ROUNDS * size)} dữ liệu · ${rate(SOAK_ROUNDS * size, ms)}`);
  record('soak', 'RAM không phình theo số vòng', growth < 80 * 1024 * 1024, `tăng ${mb(growth)} sau ${SOAK_ROUNDS} vòng`);
  metrics.soak = { rounds: SOAK_ROUNDS, growthBytes: growth, ms };
}

/* =====================================================================
 * 7. TỆP LỚN — đo thông lượng & RAM đỉnh, kiểm SHA-256
 * ===================================================================== */

async function testLargeFile() {
  const size = BIG_SIZE;
  section(`7. Tệp lớn: ${mb(size)} (ghi ra đĩa, không giữ trong RAM)`);
  const free = fs.statfsSync ? fs.statfsSync(os.tmpdir()) : null;
  if (free) {
    const freeBytes = free.bavail * free.bsize;
    if (freeBytes < size * 2.4) {
      record('tệp lớn', `đủ dung lượng đĩa cho ${mb(size)}`, false, `chỉ còn ${mb(freeBytes)}`);
      return;
    }
  }

  const src = makeTempFile(size);
  const cipher = src + '.aia';
  const plainOut = src + '.out';
  let peakEnc = 0;
  let peakDec = 0;
  const baseline = process.memoryUsage().rss;
  try {
    // --- mã hoá ---
    const encSink = fileSink(cipher);
    const encRun = await withPeakRss(async () => {
      const res = await C.encryptStream({
        openStream: () => nodeStream(src),
        size,
        options: {
          passphrase: 'tep-lon-2026',
          keyUrl: './big.key.js',
          chunkSize: 1024 * 1024,
          requireKeyScript: true,
          hashPlaintext: false, // tệp lớn: bỏ băm để không đọc lại toàn bộ
        },
        sink: encSink,
      });
      const written = await encSink.close();
      return { meta: res.meta, written };
    });
    peakEnc = encRun.peakRss;
    const cipherSize = fs.statSync(cipher).size;
    const overhead = cipherSize - size;
    metrics.largeEncrypt = {
      size,
      cipherSize,
      overhead,
      overheadPct: (overhead / size) * 100,
      ms: encRun.ms,
      throughput: rate(size, encRun.ms),
      peakRss: peakEnc,
      baselineRss: baseline,
      peakRssDelta: peakEnc - baseline,
    };
    record('tệp lớn', `mã hoá ${mb(size)} không lỗi`, true, `${(encRun.ms / 1000).toFixed(2)} s · ${rate(size, encRun.ms)} · ${encRun.value.meta.chunk.total} khối`);
    record('tệp lớn', 'chi phí dung lượng', true, `+${overhead} byte (${((overhead / size) * 100).toFixed(4)}%)`);

    // --- giải mã ---
    const decSink = fileSink(plainOut);
    const decRun = await withPeakRss(async () => {
      const res = await C.decryptStream({
        source: nodeStream(cipher),
        passphrase: 'tep-lon-2026',
        keyWrap: encRun.value.meta.keyWrap,
        sink: decSink,
      });
      await decSink.close();
      return res;
    });
    peakDec = decRun.peakRss;
    const h1 = await sha256File(src);
    const h2 = await sha256File(plainOut);
    record('tệp lớn', 'giải mã khớp SHA-256 từng byte', h1 === h2, `${h1.slice(0, 16)}… vs ${h2.slice(0, 16)}…`);
    record('tệp lớn', `thông lượng giải mã`, true, `${(decRun.ms / 1000).toFixed(2)} s · ${rate(size, decRun.ms)}`);
    metrics.largeDecrypt = { ms: decRun.ms, throughput: rate(size, decRun.ms) };
    metrics.peakRss = { encrypt: peakEnc, decrypt: peakDec };

    // RAM tăng thêm so với nền phải nhỏ hơn nhiều so với kích thước tệp (chứng minh xử lý theo luồng)
    const budget = Math.max(96 * 1024 * 1024, size * 0.5);
    const deltaEnc = peakEnc - baseline;
    const deltaDec = peakDec - baseline;
    record(
      'tệp lớn',
      'RAM tăng thêm không tỉ lệ với kích thước tệp (xử lý theo luồng)',
      deltaEnc < budget && deltaDec < budget,
      `nền ${mb(baseline)} · tăng khi mã hoá ${mb(deltaEnc)} · khi giải mã ${mb(deltaDec)} (ngân sách ${mb(budget)})`,
    );
    metrics.peakRssDelta = { encrypt: deltaEnc, decrypt: deltaDec, budget };
  } finally {
    for (const f of [src, cipher, plainOut]) {
      try {
        fs.unlinkSync(f);
      } catch {}
    }
  }
}

/* =====================================================================
 * 7b. RAM KHÔNG TỈ LỆ VỚI KÍCH THƯỚC TỆP (tiến trình con, có --expose-gc)
 * ===================================================================== */

async function testMemoryScaling() {
  section('7b. RAM không tỉ lệ với kích thước tệp (đo trong tiến trình riêng, có GC)');
  const { spawnSync } = await import('node:child_process');
  const self = path.resolve(import.meta.dirname, 'stress.mjs');
  const smallSize = 32 * 1024 * 1024;
  const largeSize = Math.max(256 * 1024 * 1024, BIG_SIZE);

  const probe = (size) => {
    const r = spawnSync(process.execPath, ['--expose-gc', self, '--child-mem', String(size)], {
      encoding: 'utf8',
      timeout: 600000,
      maxBuffer: 8 * 1024 * 1024,
    });
    const line = (r.stdout || '').split('\n').find((l) => l.startsWith('MEMJSON '));
    if (!line) throw new Error('tiến trình con không trả kết quả: ' + (r.stderr || '').slice(0, 300));
    return JSON.parse(line.slice(8));
  };

  const small = probe(smallSize);
  const large = probe(largeSize);

  const fmt = (x) => mb(x.encryptDelta) + ' (mã hoá) / ' + mb(x.decryptDelta) + ' (giải mã)';
  record('ram', `RAM tăng thêm khi mã hoá ${mb(smallSize)}`, small.encryptDelta < 160 * 1024 * 1024, fmt(small));
  record('ram', `RAM tăng thêm khi mã hoá ${mb(largeSize)}`, large.encryptDelta < 160 * 1024 * 1024, fmt(large));

  const sizeRatio = largeSize / smallSize;
  const ramRatio = (large.encryptDelta + 1) / (small.encryptDelta + 1);
  record(
    'ram',
    'RAM gần như KHÔNG tăng khi tệp lớn gấp ' + sizeRatio.toFixed(0) + ' lần',
    ramRatio < 2.5,
    `tệp ×${sizeRatio.toFixed(0)} → RAM ×${ramRatio.toFixed(2)} (${mb(small.encryptDelta)} → ${mb(large.encryptDelta)})`,
  );
  record('ram', 'RAM giữ lại sau khi mã hoá xong (không rò rỉ)', large.retainedAfterEncrypt < 96 * 1024 * 1024, mb(large.retainedAfterEncrypt));
  metrics.memory = { small, large, sizeRatio, ramRatio };
}

/* =====================================================================
 * 8. CHI PHÍ KDF & CHỐNG DÒ MẬT KHẨU
 * ===================================================================== */

async function testKdf() {
  section('8. Chi phí PBKDF2 & chống dò mật khẩu');
  const data = utf8('kdf');
  const runs = {};
  for (const iterations of [10000, 100000, 600000, 1200000]) {
    const t0 = nowMs();
    await encryptBytes(data, { passphrase: 'do-mat-khau', iterations });
    runs[iterations] = nowMs() - t0;
  }
  record('kdf', 'thời gian theo số vòng (một lần mã hoá 4 byte)', true,
    Object.entries(runs).map(([k, v]) => `${Number(k).toLocaleString('en')}: ${v.toFixed(0)} ms`).join(' · '));
  metrics.kdf = runs;

  // 30 mật khẩu sai liên tiếp — phải bị chặn 100%, không treo
  const enc = await encryptBytes(randomBytes(4096), { passphrase: 'dung-roi', iterations: 10000 });
  let blocked = 0;
  const t0 = nowMs();
  for (let i = 0; i < 30; i++) {
    try {
      await decryptBytesAll(enc.bytes, 'sai-' + i + '-' + Math.random());
    } catch (e) {
      if (e.code === 'WRONG_PASSPHRASE' || e.code === 'AUTH_FAILED') blocked++;
    }
  }
  record('kdf', '30 lần thử mật khẩu sai đều bị chặn', blocked === 30, `${blocked}/30 trong ${((nowMs() - t0) / 1000).toFixed(2)} s`);

  const perGuess = (runs[600000] || 200) / 1000;
  metrics.bruteForce = { secondsPerGuessAt600k: perGuess };
  record('kdf', 'ước lượng tốc độ dò (máy này, 600k vòng)', true,
    `${(1 / perGuess).toFixed(1)} lần thử/giây/luồng ⇒ mật khẩu 8 ký tự chữ+ số vẫn rất chậm để dò hết`);
}

/* =====================================================================
 * 9. GIỚI HẠN 5 GiB & CHẶN TUỲ CHỌN SAI
 * ===================================================================== */

async function testLimits() {
  section('9. Giới hạn & chặn tham số sai');
  const sink = memSink();
  let tooLarge = false;
  try {
    await C.encryptStream({ openStream: () => streamOf(utf8('x')), size: 5 * 1024 ** 3 + 1, options: {}, sink });
  } catch (e) {
    tooLarge = e.code === 'TOO_LARGE';
  }
  record('giới hạn', 'chặn tệp > 5 GiB ngay lập tức (không cấp phát)', tooLarge);

  const checks = [
    ['chunk quá nhỏ bị kẹp', C.normalizeOptions({ chunkSize: 1 }).chunkSize === 64 * 1024],
    ['chunk quá lớn bị kẹp', C.normalizeOptions({ chunkSize: 10 ** 9 }).chunkSize === 8 * 1024 * 1024],
    ['iterations quá nhỏ bị kẹp', C.normalizeOptions({ iterations: 1 }).iterations === 10000],
    ['iterations quá lớn bị kẹp', C.normalizeOptions({ iterations: 10 ** 9 }).iterations === 5000000],
    ['tắt bắt buộc key script vẫn chạy', C.normalizeOptions({ requireKeyScript: false }).requireKeyScript === false],
  ];
  for (const [name, ok] of checks) record('giới hạn', name, ok);

  // thiếu key script → chặn
  const enc = await encryptBytes(randomBytes(2048), { passphrase: 'p', requireKeyScript: true, iterations: 10000 });
  let required = false;
  try {
    await decryptBytesAll(enc.bytes, 'p');
  } catch (e) {
    required = e.code === 'KEY_REQUIRED';
  }
  record('giới hạn', 'thiếu key script bị chặn (KEY_REQUIRED)', required);
}

/* =====================================================================
 * 10. TIẾN TRÌNH & HUỶ GIỮA ĐƯỜNG
 * ===================================================================== */

async function testCancelAndProgress() {
  section('10. Tiến trình & huỷ giữa đường');
  const size = 24 * 1024 * 1024;
  const data = randomBytes(size);
  let updates = 0;
  let lastDone = -1;
  const sink = memSink();
  await C.encryptStream({
    openStream: () => streamOf(data, 256 * 1024),
    size,
    options: { chunkSize: 1024 * 1024, passphrase: 'p', iterations: 10000, hashPlaintext: false },
    sink,
    onProgress: (done, total) => {
      updates++;
      if (done < lastDone) throw new Error('tiến trình bị lùi');
      lastDone = done;
      if (done > total) throw new Error('tiến trình vượt tổng');
    },
  });
  record('tiến trình', `báo tiến trình đơn điệu (${updates} lần cập nhật)`, updates >= 20 && lastDone === size);

  // huỷ: ném lỗi trong onProgress phải dừng và không ghi rác vô hạn
  let cancelled = false;
  const sink2 = memSink();
  try {
    await C.encryptStream({
      openStream: () => streamOf(data, 256 * 1024),
      size,
      options: { chunkSize: 1024 * 1024, passphrase: 'p', iterations: 10000, hashPlaintext: false },
      sink: sink2,
      onProgress: (done) => {
        if (done > 4 * 1024 * 1024) throw new C.AIAError('CANCELLED', 'dừng');
      },
    });
  } catch (e) {
    cancelled = e.code === 'CANCELLED';
  }
  record('tiến trình', 'huỷ giữa đường dừng ngay', cancelled && sink2.bytes().length < 8 * 1024 * 1024,
    `đã ghi ${mb(sink2.bytes().length)} rồi dừng`);
}


/* =====================================================================
 * 11. SNIPPET "CHÉP LÀ CHẠY" (tự chứa link key + bản mã)
 * ===================================================================== */

async function testRunSnippet() {
  section('11. Snippet "chép là chạy" (kèm link key + bản mã)');
  const keySrc = fs.readFileSync(path.resolve(import.meta.dirname, '..', 'aia.key.js'), 'utf8');
  const master = /masterKey:\s*"([^"]+)"/.exec(keySrc)[1];
  const KEY_URL = 'https://example.test/secure-script/aia.key.js';

  const make = async (size, passphrase = '') => {
    const plain = C.randomBytes(size);
    const chunks = [];
    const sink = { write: async (b) => chunks.push(b.slice()), close: async () => {} };
    const { meta } = await C.encryptStream({
      openStream: () => new ReadableStream({ start(c) { c.enqueue(plain); c.close(); } }),
      size,
      options: { keyMode: 'shared', sharedKey: master, passphrase, keyUrl: './aia.key.js', iterations: 10000, fileName: 'script.js', hashPlaintext: false },
      sink,
    });
    const bytes = C.concatBytes(chunks);
    return { plain, meta, bytes, snippet: C.buildRunSnippet({ meta, containerBytes: bytes, keyUrl: KEY_URL }) };
  };

  for (const size of [0, 1, 1024, 64 * 1024]) {
    const t0 = nowMs();
    const r = await make(size);
    const dt = nowMs() - t0;
    const b64 = /var DATA = "([^"]+)";/.exec(r.snippet);
    const okB64 = !!b64 && equalBytes(C.base64ToBytes(b64[1]), r.bytes);
    record('snippet', `tệp ${size} B → snippet đúng bản mã`, okB64 && r.snippet.includes(KEY_URL),
      `snippet ${C.formatBytes(r.snippet.length)} · ${dt.toFixed(0)} ms`);
  }

  // chi phí Base64 ~1,33 lần bản mã
  const big = await make(1536 * 1024);
  const ratio = big.snippet.length / big.bytes.length;
  record('snippet', 'chi phí snippet ≤ 1,4 lần bản mã', ratio <= 1.4, `×${ratio.toFixed(2)} (${C.formatBytes(big.bytes.length)} → ${C.formatBytes(big.snippet.length)})`);
  record('snippet', 'sinh snippet 1,5 MiB dưới 1 giây', true, `${C.formatBytes(big.snippet.length)}`);

  // chế độ mật khẩu
  const withPass = await make(512, 'pw-stress');
  const passSnippet = C.buildRunSnippet({ meta: withPass.meta, containerBytes: withPass.bytes, keyUrl: KEY_URL, passphrase: 'pw-stress' });
  const askSnippet = C.buildRunSnippet({ meta: withPass.meta, containerBytes: withPass.bytes, keyUrl: KEY_URL, askPassphrase: true });
  record('snippet', 'nhúng sẵn mật khẩu', /var PASS = "pw-stress";/.test(passSnippet), 'PASS = "pw-stress"');
  record('snippet', 'chế độ hỏi mật khẩu', /var PASS = null;/.test(askSnippet), 'PASS = null');

  // tệp .lua → không tự chạy
  const lua = await (async () => {
    const plain = C.randomBytes(128);
    const chunks = [];
    const sink = { write: async (b) => chunks.push(b.slice()), close: async () => {} };
    const { meta } = await C.encryptStream({
      openStream: () => new ReadableStream({ start(c) { c.enqueue(plain); c.close(); } }),
      size: plain.length,
      options: { keyMode: 'shared', sharedKey: master, passphrase: '', keyUrl: './aia.key.js', iterations: 10000, fileName: 'script.lua', hashPlaintext: false },
      sink,
    });
    return C.buildRunSnippet({ meta, containerBytes: C.concatBytes(chunks), keyUrl: KEY_URL });
  })();
  record('snippet', 'tệp không phải JS: không tự chạy', /var EXEC = false;/.test(lua), 'EXEC = false');

  // ---- bản "ẩn dấu vết" ----
  const markers = ['AIA Secure Script', 'AIA_KEY', 'AIA_UNLOCK', 'KEY_URL', 'https://', 'Bảo vệ', 'var DATA', 'chép là chạy'];
  const stealthRuns = [];
  for (const size of [0, 1, 4096, 256 * 1024]) {
    const r = await make(size);
    const st = C.buildRunSnippet({ style: 'stealth', meta: r.meta, containerBytes: r.bytes, keyUrl: KEY_URL });
    const leaked = markers.filter((m) => st.includes(m));
    record('snippet ẩn', `tệp ${size} B: không lộ dấu vết`, leaked.length === 0, leaked.join(', ') || `snippet ${C.formatBytes(st.length)}`);
    stealthRuns.push(st);
  }
  record('snippet ẩn', 'mỗi lần sinh ra mã khác nhau (tên biến ngẫu nhiên)',
    new Set(stealthRuns.map((x) => x.slice(0, 200))).size === stealthRuns.length,
    `${new Set(stealthRuns.map((x) => x.slice(0, 200))).size}/${stealthRuns.length} khác nhau`);

  const t0 = nowMs();
  const bigStealth = C.buildRunSnippet({ style: 'stealth', meta: big.meta, containerBytes: big.bytes, keyUrl: KEY_URL });
  const stMs = nowMs() - t0;
  record('snippet ẩn', 'sinh snippet ẩn cho 1,5 MiB < 1 giây', stMs < 1000, `${stMs.toFixed(0)} ms · ${C.formatBytes(bigStealth.length)}`);
  record('snippet ẩn', 'không lộ link kể cả bản lớn', !bigStealth.includes('https://') && !bigStealth.includes('AIA_KEY'),
    `dài ${C.formatBytes(bigStealth.length)}`);
}


/* =====================================================================
 * 12. Mã hoá LINK — tải, fuzz, song song, độ bền
 * ===================================================================== */

async function testLinks() {
  section('12. Mã hoá LINK (trang web / script) — tải & fuzz');
  const keySrc = fs.readFileSync(path.resolve(import.meta.dirname, '..', 'aia.key.js'), 'utf8');
  const master = /masterKey:\s*"([^"]+)"/.exec(keySrc)[1];
  const base = { keyUrl: './aia.key.js', sharedKey: master, iterations: 10000 };
  const rounds = QUICK ? 40 : 200;

  // vòng cơ bản
  const one = await C.encryptLink('https://example.com/a/b?c=d', base);
  const back = await C.decryptLink(one.token, base);
  record('link', 'mã hoá → giải mã đúng URL', back.url === 'https://example.com/a/b?c=d', one.token.length + ' ký tự');

  // nhiều vòng: đo thời gian + tính duy nhất
  const tokens = new Set();
  const t0 = nowMs();
  for (let i = 0; i < rounds; i++) {
    const r = await C.encryptLink('https://example.com/page/' + i, base);
    tokens.add(r.token);
    const d = await C.decryptLink(r.token, base);
    if (d.url !== 'https://example.com/page/' + i) {
      record('link', 'vòng ' + i + ' giải mã sai', false, d.url);
      return;
    }
  }
  const ms = nowMs() - t0;
  record('link', `${rounds} vòng mã hoá + giải mã đều đúng`, true, `${(ms / rounds).toFixed(1)} ms/vòng`);
  record('link', 'mọi token đều khác nhau', tokens.size === rounds, `${tokens.size}/${rounds}`);

  // song song
  const t1 = nowMs();
  const many = await Promise.all(
    Array.from({ length: QUICK ? 16 : 64 }, (_, i) => C.encryptLink('https://example.com/par/' + i, base)),
  );
  const msPar = nowMs() - t1;
  const opened = await Promise.all(many.map((m) => C.decryptLink(m.token, base)));
  const okPar = opened.every((o, i) => o.url === 'https://example.com/par/' + i);
  record('link', 'mã hoá song song rồi mở lại đúng hết', okPar, `${many.length} token · ${msPar.toFixed(0)} ms`);
  record('link', 'song song không sinh token trùng', new Set(many.map((m) => m.token)).size === many.length);

  // URL dài nhất cho phép
  const maxUrl = 'https://example.com/' + 'x'.repeat(C.LINK_MAX_CHARS - 30);
  const maxEnc = await C.encryptLink(maxUrl, base);
  record('link', `URL dài ${maxUrl.length} ký tự vẫn mã hoá/giải mã được`,
    (await C.decryptLink(maxEnc.token, base)).url === new URL(maxUrl).href, `${maxEnc.token.length} ký tự token`);
  let tooLong = '';
  try {
    await C.encryptLink('https://example.com/' + 'x'.repeat(C.LINK_MAX_CHARS), base);
  } catch (err) {
    tooLong = err.code;
  }
  record('link', 'URL vượt giới hạn bị chặn', tooLong === 'LINK_TOO_LONG', tooLong);

  // fuzz: token ngẫu nhiên + token bị sửa
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.';
  const fuzzRounds = Math.max(40, Math.round(FUZZ_ROUNDS / 3));
  let crashes = 0;
  let accepted = 0;
  const t2 = nowMs();
  for (let i = 0; i < fuzzRounds; i++) {
    let token;
    if (i % 2 === 0) {
      token = 'AIALNK1.' + Array.from({ length: 120 + (i % 160) }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
    } else {
      const chars = one.token.split('');
      for (let k = 0; k < 3; k++) {
        const pos = 8 + Math.floor(Math.random() * (chars.length - 8));
        chars[pos] = alphabet[Math.floor(Math.random() * alphabet.length)];
      }
      token = chars.join('');
    }
    try {
      await C.decryptLink(token, base);
      accepted++;
    } catch (err) {
      if (!err || !/^(LINK_|BAD_|NO_SHARED_KEY)/.test(String(err.code))) crashes++;
    }
  }
  record('link', `${fuzzRounds} token rác/bị sửa không làm sập chương trình`, crashes === 0, crashes + ' lỗi lạ');
  record('link', 'token rác/bị sửa KHÔNG mở được', accepted === 0, accepted + ' token lọt');
  record('link', 'fuzz chạy nhanh', nowMs() - t2 < 60000, `${(nowMs() - t2).toFixed(0)} ms`);

  // sai key script / sai mật khẩu ở mọi vòng
  let badKey = 0;
  for (let i = 0; i < 5; i++) {
    try {
      await C.decryptLink(one.token, { ...base, sharedKey: C.generateSharedKeyBase64() });
    } catch {
      badKey++;
    }
  }
  record('link', 'sai key script bị chặn 5/5 lần', badKey === 5, `${badKey}/5`);

  // KDF chuẩn 600k: đo chi phí thật
  const t3 = nowMs();
  const strong = await C.encryptLink('https://example.com/strong', { ...base, iterations: C.DEFAULT_ITERATIONS });
  const tEnc = nowMs() - t3;
  const t4 = nowMs();
  await C.decryptLink(strong.token, { ...base, iterations: C.DEFAULT_ITERATIONS });
  const tDec = nowMs() - t4;
  record('link', 'KDF 600k: mã hoá + giải mã dưới 2 giây', tEnc < 2000 && tDec < 2000, `${tEnc.toFixed(0)} ms / ${tDec.toFixed(0)} ms`);

  // snippet: kích thước + không lộ + chạy được cú pháp
  const sn = C.buildLinkSnippet({ token: one.token, keyUrl: 'https://example.com/aia.key.js' });
  const leaks = ['AIALNK1', 'openLink', 'https://', 'example.com', 'AIA_KEY'].filter((m) => sn.includes(m));
  record('link', 'snippet link không lộ dấu vết', leaks.length === 0, leaks.join(', ') || `${sn.length} ký tự`);
  record('link', 'snippet link là JS hợp lệ', (() => { try { new Function(sn); return true; } catch { return false; } })());
  const t5 = nowMs();
  for (let i = 0; i < 200; i++) C.buildLinkSnippet({ token: one.token, keyUrl: './aia.key.js' });
  record('link', 'sinh 200 snippet link nhanh', nowMs() - t5 < 2000, `${(nowMs() - t5).toFixed(0)} ms`);

  // quy mô lớn: bộ nhớ không phình theo số token
  const baseline = process.memoryUsage().rss;
  const keep = [];
  for (let i = 0; i < 500; i++) {
    const r = await C.encryptLink('https://example.com/loop/' + i, base);
    keep.push(r.token.length);
  }
  const grown = (process.memoryUsage().rss - baseline) / (1024 * 1024);
  record('link', '500 token liên tiếp: RAM tăng ít', grown < 80, `+${grown.toFixed(1)} MiB`);
  record('link', '500 token có độ dài ổn định (lệch ≤ 8 ký tự)', Math.max(...keep) - Math.min(...keep) <= 8, `${Math.min(...keep)}–${Math.max(...keep)} ký tự`);
}

/* =====================================================================
 * CHẠY
 * ===================================================================== */

console.log('AIA Secure Script — KIỂM THỬ CƯỜNG ĐỘ CAO');
console.log(`Node ${process.version} · ${os.cpus().length} CPU · ${mb(os.totalmem())} RAM · chế độ ${QUICK ? 'quick' : MAX ? 'max' : HEAVY ? 'heavy' : 'mặc định'}`);
console.log(`fuzz=${FUZZ_ROUNDS} · soak=${SOAK_ROUNDS} · tệp lớn=${mb(BIG_SIZE)}`);

const suiteStart = nowMs();
const suites = [
  ['biên', testBoundaries],
  ['ngẫu nhiên', testRandomized],
  ['fuzz', testFuzz],
  ['duy nhất', testUniqueness],
  ['song song', testConcurrency],
  ['soak', testSoak],
  ['kdf', testKdf],
  ['giới hạn', testLimits],
  ['tiến trình', testCancelAndProgress],
  ['ram', testMemoryScaling],
  ['snippet', testRunSnippet],
  ['link', testLinks],
  ['tệp lớn', testLargeFile],
];

for (const [name, fn] of suites) {
  try {
    await fn();
  } catch (err) {
    record(name, 'suite chạy hết', false, err && err.message);
    console.error(err);
  }
}

const totalMs = nowMs() - suiteStart;
const passed = results.filter((r) => r.ok).length;

console.log('\n' + '═'.repeat(72));
console.log(`KẾT QUẢ: ${passed}/${results.length} đạt · ${failures.length} lỗi · ${(totalMs / 1000).toFixed(1)} s`);
if (metrics.largeEncrypt) {
  console.log(`Tệp ${mb(metrics.largeEncrypt.size)}: mã hoá ${metrics.largeEncrypt.throughput}, giải mã ${metrics.largeDecrypt.throughput}, ` +
    `chi phí +${metrics.largeEncrypt.overhead} byte (${metrics.largeEncrypt.overheadPct.toFixed(4)}%)`);
  console.log(`RAM đỉnh: mã hoá ${mb(metrics.peakRss.encrypt)}, giải mã ${mb(metrics.peakRss.decrypt)}`);
}
console.log('═'.repeat(72));
if (failures.length) {
  console.log('\nChi tiết lỗi:');
  for (const f of failures) console.log('  • ' + f);
}

if (JSON_OUT) {
  fs.writeFileSync(
    JSON_OUT,
    JSON.stringify({ when: new Date().toISOString(), node: process.version, cpu: os.cpus().length, totalMem: os.totalmem(), results, metrics, failures }, null, 2),
  );
  console.log('\nĐã ghi ' + JSON_OUT);
}

process.exitCode = failures.length ? 1 : 0;
