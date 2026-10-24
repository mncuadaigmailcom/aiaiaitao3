#!/usr/bin/env node
/* =============================================================================
 * AIA Secure Script — kiểm thử tự động (Node 18+, dùng WebCrypto thật)
 * Chạy: node tests/run-node.mjs
 *
 * Những gì được kiểm chứng:
 *  - mã hoá/giải mã đúng với nhiều kích thước khối, tệp rỗng, tệp chia hết
 *  - sai mật khẩu / sai link key bị chặn (kid + AES-GCM)
 *  - sửa 1 bit, đổi thứ tự khối, cắt tệp, ghép thêm dữ liệu → bị phát hiện
 *  - header chứa thời gian đọc được (raw 17 chữ số) + link key
 *  - chi phí kích thước thực tế
 *  - key script sinh ra CHẠY THẬT và giải mã đúng (chạy trong Node)
 *  - tiện ích ZIP, CRC
 *  - công cụ dịch ngược: làm đẹp không đổi token, rút gọn không đổi token,
 *    giải base64, phân tích phát hiện eval
 * ========================================================================== */

import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import process from 'node:process';
import * as C from '../assets/core.js';
import * as R from '../assets/reverse.js';

let passed = 0;
let failed = 0;
const failures = [];

function ok(cond, name, detail = '') {
  if (cond) {
    passed++;
    process.stdout.write(`  ✔ ${name}\n`);
  } else {
    failed++;
    failures.push(name + (detail ? ' — ' + detail : ''));
    process.stdout.write(`  ✘ ${name}${detail ? ' — ' + detail : ''}\n`);
  }
}

async function expectError(fn, code, name) {
  const codes = Array.isArray(code) ? code : [code];
  try {
    await fn();
    ok(false, name, 'không ném lỗi');
  } catch (err) {
    ok(codes.includes(err && err.code), name, `nhận ${err && err.code}: ${err && err.message}`);
  }
}

function utf8(s) {
  return new TextEncoder().encode(s);
}

function decode(u8) {
  return new TextDecoder().decode(u8);
}

function streamOf(bytes, chunk = 65536) {
  let off = 0;
  return new ReadableStream({
    pull(c) {
      if (off >= bytes.length) {
        c.close();
        return;
      }
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
    openStream: () => streamOf(bytes, options.readChunk || 65536),
    size: bytes.length,
    options,
    sink,
  });
  return { ...res, bytes: sink.bytes() };
}

async function decryptBytesAll(bytes, passphrase, options = {}) {
  return C.decryptStream({ source: streamOf(bytes, options.readChunk || 65536), passphrase, keyWrap: options.keyWrap || null });
}

/** Nạp key script trong ngữ cảnh Node (giả lập global của trình duyệt). */
function loadKeyScript(text) {
  const g = { crypto: globalThis.crypto };
  new Function(
    'globalThis', 'self', 'module', 'exports', 'document', 'location', 'fetch', 'Worker', 'Blob', 'URL',
    text,
  )(g, g, { exports: {} }, {}, undefined, undefined, undefined, undefined, undefined, undefined);
  return g.AIA_UNLOCK;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function equalBytes(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/* --------------------------------------------------------------- 1. vòng lặp --- */

async function testRoundtrip() {
  console.log('\n[1] Mã hoá / giải mã vòng lặp');
  const message = utf8('console.log("xin chào Việt Nam 🇻🇳");\n'.repeat(40));

  for (const chunkSize of [65536, 256 * 1024, 1024 * 1024]) {
    const { bytes, meta } = await encryptBytes(message, { chunkSize, passphrase: 'mật-khẩu-1', keyUrl: './key.js' });
    const out = await decryptBytesAll(bytes, 'mật-khẩu-1');
    ok(equalBytes(out.plaintext, message), `khối ${chunkSize / 1024} KiB · nội dung khớp`);
    ok(meta.chunk.total === Math.ceil(message.length / chunkSize), `khối ${chunkSize / 1024} KiB · số khối đúng`);
    const headerLen = C.parseContainerHeader(bytes).headerLength;
    ok(bytes.length === headerLen + message.length + meta.chunk.total * 16, 'kích thước = header + bản rõ + 16·số khối');
  }

  // tệp rỗng
  const empty = await encryptBytes(new Uint8Array(0), { passphrase: 'x' });
  const emptyOut = await decryptBytesAll(empty.bytes, 'x');
  ok(emptyOut.plaintext.length === 0, 'tệp rỗng giải mã thành rỗng');

  // chia hết đúng bằng chunk
  const exact = new Uint8Array(65536 * 3).map((_, i) => i % 251);
  const e = await encryptBytes(exact, { chunkSize: 65536, passphrase: 'y' });
  const eOut = await decryptBytesAll(e.bytes, 'y');
  ok(equalBytes(eOut.plaintext, exact), 'tệp chia hết khối (3 khối) khớp');
  ok(e.meta.chunk.total === 3, 'đúng 3 khối');

  // nhiều mảnh đọc nhỏ
  const big = new Uint8Array(300000).map((_, i) => (i * 7) % 256);
  const b = await encryptBytes(big, { chunkSize: 65536, passphrase: 'z', readChunk: 1000 });
  const bOut = await decryptBytesAll(b.bytes, 'z', { readChunk: 333 });
  ok(equalBytes(bOut.plaintext, big), 'đọc/ghi từng mảnh nhỏ vẫn đúng');
}

/* ------------------------------------------------------------ 2. bảo mật --- */

async function testSecurity() {
  console.log('\n[2] Bảo mật & toàn vẹn');
  const message = utf8('const secret = 42; // nội dung cần bảo vệ\n'.repeat(100));
  const base = { passphrase: 'đúng-mật-khẩu', keyUrl: 'https://cdn.example.com/k.js', chunkSize: 65536 };
  const enc = await encryptBytes(message, base);

  await expectError(() => decryptBytesAll(enc.bytes, 'sai-mật-khẩu'), 'WRONG_PASSPHRASE', 'sai mật khẩu bị chặn');

  // đổi link key trong header -> khoá khác
  const metaWrong = JSON.parse(JSON.stringify(enc.meta));
  metaWrong.keyUrl = 'https://evil.example.com/k.js';
  const headerWrong = C.buildContainerHeader(metaWrong);
  const spliced = C.concatBytes([headerWrong, enc.bytes.subarray(enc.bytes.length - (message.length + enc.meta.chunk.total * 16))]);
  await expectError(
    () => decryptBytesAll(spliced, 'đúng-mật-khẩu'),
    ['HEADER_TAMPERED', 'WRONG_PASSPHRASE'],
    'sửa link key trong header bị chặn',
  );

  // sửa 1 byte trong khối đầu
  const tampered = enc.bytes.slice();
  tampered[tampered.length - 20] ^= 0x01;
  await expectError(() => decryptBytesAll(tampered, 'đúng-mật-khẩu'), 'AUTH_FAILED', 'sửa 1 bit bị phát hiện');

  // cắt bớt
  const truncated = enc.bytes.slice(0, enc.bytes.length - 100);
  await expectError(() => decryptBytesAll(truncated, 'đúng-mật-khẩu'), 'UNEXPECTED_EOF', 'tệp bị cắt bị phát hiện');

  // ghép thêm
  const trailing = C.concatBytes([enc.bytes, new Uint8Array(32)]);
  await expectError(() => decryptBytesAll(trailing, 'đúng-mật-khẩu'), 'TRAILING_DATA', 'dữ liệu ghép thêm bị phát hiện');

  // đảo thứ tự 2 khối đầu (cần tệp ≥ 3 khối)
  const multi = await encryptBytes(utf8('A'.repeat(65536 * 3 + 100)), { chunkSize: 65536, passphrase: 'p', keyUrl: './k.js' });
  const hLen = C.parseContainerHeader(multi.bytes).headerLength;
  const chunkTotal = multi.meta.chunk.size + 16;
  const swapped = multi.bytes.slice();
  swapped.set(multi.bytes.subarray(hLen + chunkTotal, hLen + 2 * chunkTotal), hLen);
  swapped.set(multi.bytes.subarray(hLen, hLen + chunkTotal), hLen + chunkTotal);
  await expectError(() => decryptBytesAll(swapped, 'p'), 'AUTH_FAILED', 'đảo thứ tự khối bị phát hiện');

  // magic sai
  const badMagic = enc.bytes.slice();
  badMagic[0] = 0x42;
  await expectError(() => decryptBytesAll(badMagic, 'đúng-mật-khẩu'), 'BAD_MAGIC', 'sai magic bị chặn');

  // giới hạn 5 GiB
  await expectError(
    () => C.encryptStream({ openStream: () => streamOf(new Uint8Array(0)), size: 5 * 1024 * 1024 * 1024 + 1, options: {}, sink: memSink() }),
    'TOO_LARGE',
    'từ chối tệp > 5 GiB',
  );

  // pbkdf2 iterations thấp bị kẹp lại
  ok(C.normalizeOptions({ iterations: 5 }).iterations === 10000, 'iterations tối thiểu được kẹp về 10.000');
  ok(C.normalizeOptions({ chunkSize: 1 }).chunkSize === 64 * 1024, 'chunkSize tối thiểu 64 KiB');
}

/* -------------------------------------------------------------- 3. header --- */

async function testHeader() {
  console.log('\n[3] Header & thời gian');
  const before = Date.now();
  const { meta, bytes } = await encryptBytes(utf8('x'), { keyUrl: './keys/a.js' });
  const after = Date.now();

  ok(/^\d{17}$/.test(meta.time.raw), 'time.raw đúng 17 chữ số (năm…mili giây)', meta.time.raw);
  ok(meta.time.raw.startsWith(String(new Date().getFullYear())), 'time.raw bắt đầu bằng năm');
  ok(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/.test(meta.time.readable), 'time.readable dễ đọc', meta.time.readable);
  ok(meta.time.unixMs >= before && meta.time.unixMs <= after, 'unixMs chính xác');
  ok(meta.keyUrl === './keys/a.js', 'link key nằm trong header');
  ok(meta.encryptionSeconds !== null, 'có thời gian mã hoá');

  // header đọc được mà không cần mật khẩu
  const parsed = C.parseContainerHeader(bytes);
  ok(parsed.meta.id === meta.id && parsed.meta.time.raw === meta.time.raw, 'đọc header không cần mật khẩu');
  ok(meta.kdf.iterations === C.DEFAULT_ITERATIONS, 'mặc định 600.000 vòng PBKDF2');

  // đọc header từ luồng
  const fromStream = await C.readContainerHeaderFromSource(streamOf(bytes, 7));
  ok(fromStream.meta.id === meta.id, 'đọc header từ luồng nhỏ từng mảnh');

  // toàn vẹn header: mọi trường đều được bảo vệ bằng SHA-256
  ok(/^[0-9a-f]{64}$/.test(meta.headerHash || ''), 'header có SHA-256 (headerHash)');
  {
    const enc = await encryptBytes(utf8('noi dung'), { passphrase: 'hdr' });
    for (const [field, mutate] of [
      ['note', (m) => (m.note = 'bị sửa')],
      ['tên tệp', (m) => (m.file.name = 'khac.js')],
      ['thời gian đọc được', (m) => (m.time.readable = '1999-01-01 00:00:00.000')],
      ['link key', (m) => (m.keyUrl = './evil.js')],
      ['số khối', (m) => (m.chunk.total = 99)],
    ]) {
      const bad = JSON.parse(JSON.stringify(enc.meta));
      mutate(bad);
      const spliced = C.concatBytes([C.buildContainerHeader(bad), enc.bytes.subarray(C.parseContainerHeader(enc.bytes).headerLength)]);
      await expectError(() => decryptBytesAll(spliced, 'hdr'), 'HEADER_TAMPERED', `sửa ${field} trong header bị chặn`);
    }
  }

  // thời gian không bị mã hoá: chuỗi raw xuất hiện nguyên văn trong tệp
  const asText = new TextDecoder('latin1').decode(bytes.subarray(0, 2000));
  ok(asText.includes(meta.time.raw), 'chuỗi thời gian xuất hiện dạng đọc được trong tệp');
}

/* ---------------------------------------------------------- 4. key script --- */

async function testKeyScript() {
  console.log('\n[4] Key script sinh ra chạy thật');
  const code = utf8('function greet(n){ return "xin chào " + n; }\ngreet("bạn");\n');
  const enc = await encryptBytes(code, { passphrase: 'abc12345', keyUrl: './key.js', fileName: 'demo.js' });

  const keyText = C.buildKeyScript(enc.meta, { embeddedPassphrase: null });
  ok(keyText.includes('AIA_UNLOCK'), 'key script export AIA_UNLOCK');
  ok(keyText.includes('/*<AIA:META>*/'), 'key script có khối META đọc được');

  const m = /\/\*<AIA:META>\*\/([\s\S]*?)\/\*<\/AIA:META>\*\//.exec(keyText);
  const metaFromKey = JSON.parse(m[1]);
  ok(metaFromKey.id === enc.meta.id, 'META trong key script khớp header');

  // chạy key script trong Node
  const sandbox = { crypto: globalThis.crypto, TextEncoder, TextDecoder, atob, btoa, console };
  const fn = new Function('globalThis', 'self', 'module', 'exports', 'document', 'location', 'fetch', 'Worker', 'Blob', 'URL', keyText);
  const fakeGlobal = { crypto: globalThis.crypto };
  fn(fakeGlobal, fakeGlobal, { exports: {} }, {}, undefined, undefined, undefined, undefined, undefined, undefined);
  const AIA = fakeGlobal.AIA_UNLOCK;
  ok(!!AIA, 'key script gắn AIA_UNLOCK vào global');

  const unlocked = await AIA.decrypt({ passphrase: 'abc12345', source: streamOf(enc.bytes, 4096) });
  ok(equalBytes(unlocked, code), 'key script giải mã đúng nội dung');

  let rejected = false;
  try {
    await AIA.decrypt({ passphrase: 'sai', source: streamOf(enc.bytes, 4096) });
  } catch {
    rejected = true;
  }
  ok(rejected, 'key script từ chối mật khẩu sai');

  // key script có mật khẩu nhúng
  const embeddedText = C.buildKeyScript(enc.meta, { embeddedPassphrase: 'abc12345' });
  const fakeGlobal2 = { crypto: globalThis.crypto };
  new Function('globalThis', 'self', 'module', 'exports', 'document', 'location', 'fetch', 'Worker', 'Blob', 'URL', embeddedText)(
    fakeGlobal2, fakeGlobal2, { exports: {} }, {}, undefined, undefined, undefined, undefined, undefined, undefined,
  );
  const unlocked2 = await fakeGlobal2.AIA_UNLOCK.decrypt({ source: streamOf(enc.bytes, 4096) });
  ok(equalBytes(unlocked2, code), 'key script có mật khẩu nhúng chạy không cần nhập');

  // hết hạn dùng
  const expired = await encryptBytes(code, { passphrase: 'abc12345', keyUrl: './key.js', expiry: new Date(Date.now() - 60000).toISOString() });
  const expiredKey = C.buildKeyScript(expired.meta, { embeddedPassphrase: 'abc12345' });
  const fakeGlobal3 = { crypto: globalThis.crypto };
  new Function('globalThis', 'self', 'module', 'exports', 'document', 'location', 'fetch', 'Worker', 'Blob', 'URL', expiredKey)(
    fakeGlobal3, fakeGlobal3, { exports: {} }, {}, undefined, undefined, undefined, undefined, undefined, undefined,
  );
  let expiredBlocked = false;
  try {
    await fakeGlobal3.AIA_UNLOCK.decrypt({ source: streamOf(expired.bytes, 4096) });
  } catch (err) {
    expiredBlocked = /hết hạn/.test(err.message);
  }
  ok(expiredBlocked, 'key script chặn bản mã đã hết hạn');

  // runner html
  const runner = C.buildRunnerHtml(enc.meta, { keyFileName: 'demo.key.js', runnerFileName: 'run-demo.html' });
  ok(runner.includes('AIA_UNLOCK') && runner.includes('demo.key.js'), 'runner.html tham chiếu key script');
  ok(!runner.includes('</script><script>alert'), 'runner không có chèn lạ');
}

/* ---------------------------------------- 4b. chế độ bắt buộc key script --- */

async function testKeyScriptRequired() {
  console.log('\n[4b] Bắt buộc phải có key script');
  const message = utf8('const biMat = "chỉ mở được khi có key script";\n'.repeat(200));
  const options = { passphrase: 'khoa-rieng-2026', keyUrl: './secret.key.js', requireKeyScript: true, chunkSize: 65536 };
  const enc = await encryptBytes(message, options);

  ok(enc.meta.keyWrapIn === 'key-script', 'META đánh dấu keyWrapIn = key-script');
  ok(!!(enc.meta.keyWrap && enc.meta.keyWrap.iv && enc.meta.keyWrap.ct), 'META có khoá tệp đã bọc');
  ok(!C.parseContainerHeader(enc.bytes).meta.keyWrap, 'header .aia KHÔNG chứa khoá tệp');

  await expectError(() => decryptBytesAll(enc.bytes, 'khoa-rieng-2026'), 'KEY_REQUIRED', 'thiếu key script → không giải mã được');
  await expectError(() => decryptBytesAll(enc.bytes, 'sai'), 'WRONG_PASSPHRASE', 'sai mật khẩu vẫn bị chặn trước');

  const out = await C.decryptStream({
    source: streamOf(enc.bytes, 4096),
    passphrase: 'khoa-rieng-2026',
    keyWrap: enc.meta.keyWrap,
  });
  ok(equalBytes(out.plaintext, message), 'có khoá tệp → giải mã đúng');

  // sửa khoá tệp đã bọc
  const tamperedWrap = JSON.parse(JSON.stringify(enc.meta.keyWrap));
  const ct = C.base64ToBytes(tamperedWrap.ct);
  ct[0] ^= 0x01;
  tamperedWrap.ct = C.base64ToBytes ? bytesToB64(ct) : '';
  await expectError(
    () => C.decryptStream({ source: streamOf(enc.bytes, 4096), passphrase: 'khoa-rieng-2026', keyWrap: tamperedWrap }),
    'WRAP_FAILED',
    'sửa khoá tệp đã bọc bị phát hiện',
  );

  // key script thật
  const keyText = C.buildKeyScript(enc.meta, { embeddedPassphrase: null });
  const AIA = loadKeyScript(keyText);
  const viaKey = await AIA.decrypt({ passphrase: 'khoa-rieng-2026', source: streamOf(enc.bytes, 4096) });
  ok(equalBytes(viaKey, message), 'key script mở được bản mã (đúng thiết kế)');

  // key script bị cắt mất keyWrap
  const brokenMeta = JSON.parse(JSON.stringify(enc.meta));
  delete brokenMeta.keyWrap;
  const brokenKey = C.buildKeyScript(brokenMeta, { embeddedPassphrase: null });
  const AIA2 = loadKeyScript(brokenKey);
  let brokenBlocked = false;
  try {
    await AIA2.decrypt({ passphrase: 'khoa-rieng-2026', source: streamOf(enc.bytes, 4096) });
  } catch (err) {
    brokenBlocked = /thiếu khoá tệp|khoá tệp/i.test(err.message);
  }
  ok(brokenBlocked, 'key script mất khoá tệp bị từ chối');

  // tắt tuỳ chọn → quay lại chế độ cũ
  const normal = await encryptBytes(message, { passphrase: 'x', keyUrl: './k.js' });
  ok(normal.meta.keyWrapIn === 'header' && !normal.meta.keyWrap, 'mặc định vẫn tương thích chế độ cũ');
  const normalOut = await decryptBytesAll(normal.bytes, 'x');
  ok(equalBytes(normalOut.plaintext, message), 'chế độ cũ giải mã không cần key script');
}

function bytesToB64(u8) {
  let s = '';
  for (const b of u8) s += String.fromCharCode(b);
  return btoa(s);
}

/* --------------------------------------------------------------- 5. ZIP --- */

function parseZip(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries = [];
  let off = 0;
  while (dv.getUint32(off, true) === 0x04034b50) {
    const nameLen = dv.getUint16(off + 26, true);
    const extraLen = dv.getUint16(off + 28, true);
    const size = dv.getUint32(off + 18, true);
    const crc = dv.getUint32(off + 14, true);
    const name = new TextDecoder().decode(bytes.subarray(off + 30, off + 30 + nameLen));
    const data = bytes.subarray(off + 30 + nameLen + extraLen, off + 30 + nameLen + extraLen + size);
    entries.push({ name, data, crc });
    off += 30 + nameLen + extraLen + size;
  }
  return entries;
}

async function testZip() {
  console.log('\n[5] ZIP & tiện ích');
  const zip = C.createZip([
    { name: 'a.txt', data: 'xin chào' },
    { name: 'b.bin', data: new Uint8Array([0, 1, 2, 3]) },
  ]);
  const entries = parseZip(zip);
  ok(entries.length === 2, 'ZIP có 2 mục');
  ok(entries[0].name === 'a.txt' && decode(entries[0].data) === 'xin chào', 'ZIP giữ đúng nội dung text');
  ok(entries[0].crc === C.crc32(utf8('xin chào')), 'CRC32 đúng');
  ok(entries[1].data.length === 4, 'ZIP giữ đúng dữ liệu nhị phân');

  ok(C.slugify('Bản script (v2).js') === 'Ban-script-v2', 'slugify bỏ dấu tiếng Việt', C.slugify('Bản script (v2).js'));
  ok(C.formatBytes(1536) === '1.50 KB', 'formatBytes', C.formatBytes(1536));
  ok(C.detectLang('a.lua') === 'lua' && C.detectLang('a.py') === 'python', 'đoán ngôn ngữ theo đuôi');
}

/* ------------------------------------------------------- 6. dịch ngược --- */

async function testReverse() {
  console.log('\n[6] Công cụ dịch ngược');
  const code = `function add(a,b){ // cộng
  if(a>b){return a+b;}else{return a-b;}
}
const total = add(1,2);
console.log("kết quả: " + total);`;

  const pretty = R.beautify(code);
  const tok = (src) => R.tokenize(src).filter((t) => t.t !== 'ws' && t.t !== 'nl' && t.t !== 'comment').map((t) => t.v).join('\u0001');
  ok(tok(pretty) === tok(code), 'làm đẹp không đổi token');
  ok(pretty.split('\n').length > code.split('\n').length, 'làm đẹp tách dòng');
  ok(pretty.includes('  if (a > b) {'), 'làm đẹp đúng thụt lề/ khoảng trắng');

  const mini = R.minify(code);
  ok(tok(mini) === tok(code), 'rút gọn không đổi token');
  ok(mini.length < code.length, 'rút gọn nhỏ hơn');

  const stripped = R.stripComments(code);
  ok(!stripped.includes('// cộng') && tok(stripped) === tok(code), 'bỏ chú thích giữ nguyên code');

  const lua = 'local function f(x)\nif x then\nprint("a")\nelse\nprint("b")\nend\nend';
  const luaPretty = R.beautify(lua, { lang: 'lua' });
  ok(luaPretty.includes('\n  if x then') && luaPretty.includes('\n    print("a")'), 'làm đẹp Lua đúng khối');

  const b64 = Buffer.from('console.log("secret-ok")', 'utf8').toString('base64');
  const decoded = R.decodePayloads(`eval(atob("${b64}"))`);
  ok(decoded.code.includes('secret-ok') && decoded.code.includes('eval(atob('), 'giải base64 trong chuỗi', decoded.code);
  ok(decoded.notes.length > 0, 'có ghi chú giải mã');

  const esc = R.unescapeCode('\\x63\\x6f\\x6e\\x73\\x6f\\x6c\\x65');
  ok(esc.code.includes('console'), 'gỡ escape \\xNN');

  const analysis = R.analyze('eval(atob("AAAA")); fetch("https://x")');
  ok(analysis.findings.length >= 2, 'phân tích phát hiện eval/atob/fetch');
  ok(analysis.verdict !== 'bình thường', 'phân tích kết luận đáng ngờ');

  const renamed = R.renameIdentifiers('const userName = 1; function greet(userName){ return userName + 1; } greet(userName);');
  ok(renamed.code !== 'const userName = 1; function greet(userName){ return userName + 1; } greet(userName);', 'đổi tên biến có tác dụng');
  ok(!renamed.code.includes('userName'), 'tên cũ không còn');

  const strings = R.extractStrings('const a = "một"; const b = "hai";');
  ok(strings.table.length === 2 && strings.code.includes('__S0'), 'tách bảng chuỗi');
}

/* ------------------------------------------------------ 7. hiệu năng nhỏ --- */

async function testThroughput() {
  console.log('\n[7] Thông lượng (chỉ để biết, không phải benchmark chuẩn)');
  const size = 8 * 1024 * 1024;
  const bytes = new Uint8Array(size).map((_, i) => i % 253);
  const t0 = performance.now();
  const enc = await encryptBytes(bytes, { chunkSize: 1024 * 1024, passphrase: 'bench', hashPlaintext: false });
  const t1 = performance.now();
  const out = await decryptBytesAll(enc.bytes, 'bench');
  const t2 = performance.now();
  ok(equalBytes(out.plaintext, bytes), '8 MiB vòng lặp đúng');
  const headerLen = C.parseContainerHeader(enc.bytes).headerLength;
  const tagOverhead = enc.meta.chunk.total * 16;
  const overhead = enc.bytes.length - size;
  const pct = (overhead / size) * 100;
  ok(headerLen < 1200, `header ${headerLen} byte (< 1200)`);
  ok(tagOverhead / size < 0.002, `tag ${tagOverhead} byte = ${((tagOverhead / size) * 100).toFixed(4)}% (< 0,002%)`);
  ok(pct < 0.02, `tổng tăng ${overhead} byte (${pct.toFixed(4)}%) < 0,02%`);
  console.log(`     mã hoá ${((t1 - t0) / 1000).toFixed(2)} s · giải mã ${((t2 - t1) / 1000).toFixed(2)} s`);
}


/* ================================================================= khoá chung */

async function testSharedKey() {
  console.log('\n[4c] Key script DÙNG CHUNG (một link cho mọi lần mã hoá, mọi người)');
  const master = C.generateSharedKeyBase64();
  const master2 = C.generateSharedKeyBase64();
  ok(C.base64ToBytes(master).length === 32, 'khoá chung 32 byte');
  const id = await C.sharedKeyId(master);
  ok(/^[0-9a-f]{16}$/.test(id), 'sharedKeyId = 8 byte hex', id);

  const mk = async (text, opts = {}) =>
    encryptBytes(utf8(text), {
      keyMode: 'shared',
      sharedKey: master,
      passphrase: 'mat-khau-chung',
      keyUrl: './aia.key.js',
      iterations: 10000,
      ...opts,
    });

  const a = await mk('ban ma thu nhat');
  const b = await mk('ban ma thu hai');

  ok(a.meta.keyWrapIn === 'shared-key-script', 'META ghi keyWrapIn = shared-key-script');
  ok(a.meta.keyUrl === './aia.key.js', 'link key cố định ./aia.key.js');
  ok(a.meta.sharedKeyId === id, 'META có sharedKeyId khớp khoá chung');
  ok(a.meta.keyUrl === b.meta.keyUrl && a.meta.sharedKeyId === b.meta.sharedKeyId, 'hai lần mã hoá dùng CÙNG một link key');
  ok(!!C.parseContainerHeader(a.bytes).meta.keyWrap, 'keyWrap nằm trong header (tệp tự chứa)');

  const open = (bytes, sharedKey, passphrase = 'mat-khau-chung') =>
    C.decryptStream({ source: streamOf(bytes, 4096), passphrase, sharedKey });

  const o1 = await open(a.bytes, master);
  ok(new TextDecoder().decode(o1.plaintext) === 'ban ma thu nhat', 'mở tệp 1 bằng khoá chung');
  const o2 = await open(b.bytes, master);
  ok(new TextDecoder().decode(o2.plaintext) === 'ban ma thu hai', 'CÙNG khoá chung mở được tệp 2 (mọi tệp cùng bộ)');

  await expectError(() => open(a.bytes, null), 'KEY_REQUIRED', 'thiếu key script chung → không mở được');
  await expectError(() => open(a.bytes, master2), 'WRONG_SHARED_KEY', 'khoá chung khác → bị chặn');
  await expectError(() => open(a.bytes, master, 'sai-mat-khau'), 'WRONG_PASSPHRASE', 'sai mật khẩu → bị chặn');

  // sửa header (ghi chú) vẫn bị phát hiện
  const bad = JSON.parse(JSON.stringify(a.meta));
  bad.note = 'bị sửa';
  bad.keyWrap = a.meta.keyWrap;
  const spliced = C.concatBytes([
    C.buildContainerHeader(bad),
    a.bytes.subarray(C.parseContainerHeader(a.bytes).headerLength),
  ]);
  await expectError(() => open(spliced, master), 'HEADER_TAMPERED', 'sửa header bản mã dùng chung bị phát hiện');

  // key script phát hành kèm site
  const shipped = fs.readFileSync(path.resolve(import.meta.dirname, '..', 'aia.key.js'), 'utf8');
  ok(shipped.includes('AIA_KEY'), 'aia.key.js phát hành kèm site có AIA_KEY');
  const shippedKey = /masterKey:\s*"([^"]+)"/.exec(shipped);
  ok(!!shippedKey, 'aia.key.js có khoá gốc');
  ok((await C.sharedKeyId(shippedKey[1])) === (/keyId:\s*"([0-9a-f]+)"/.exec(shipped) || [])[1], 'keyId trong aia.key.js khớp khoá gốc');

  // chạy key script chung trong sandbox: mở đúng tệp đã mã hoá bằng khoá của site
  const withSiteKey = await encryptBytes(utf8('noi dung dung khoa site'), {
    keyMode: 'shared',
    sharedKey: shippedKey[1],
    passphrase: 'pw-site',
    keyUrl: './aia.key.js',
    iterations: 10000,
  });
  const sandbox = { crypto: globalThis.crypto, TextEncoder, TextDecoder, atob, btoa, Uint8Array, DataView, JSON, Date };
  const fn = new Function('globalThis', shipped + '\nreturn globalThis.AIA_KEY;');
  const holder = {};
  const api = fn(holder);
  ok(!!api && typeof api.open === 'function', 'key script chung nạp được trong sandbox');
  const src = new ReadableStream({ start(c) { c.enqueue(withSiteKey.bytes); c.close(); } });
  const res = await api.open({ source: src, passphrase: 'pw-site' });
  ok(new TextDecoder().decode(res.bytes) === 'noi dung dung khoa site', 'key script chung mở đúng bản mã (độc lập với core)');
  const src2 = new ReadableStream({ start(c) { c.enqueue(withSiteKey.bytes); c.close(); } });
  await api.open({ source: src2, passphrase: 'sai' }).then(
    () => ok(false, 'key script chung từ chối mật khẩu sai'),
    (err) => ok(/mật khẩu|Sai/i.test(err.message), 'key script chung từ chối mật khẩu sai', err.message),
  );

  // key script sinh ra phải khớp keyId
  const built = C.buildSharedKeyScript({ sharedKey: master, keyUrl: './aia.key.js', keyId: id });
  ok(built.includes(master) && built.includes(id), 'buildSharedKeyScript nhúng khoá gốc + keyId');
  ok(built.includes("kind: 'shared'"), 'key script chung khai báo kind = shared');
  ok(!/\/\*<AIA:META>\*\//.test(built), 'key script chung KHÔNG chứa META của tệp nào (dùng cho mọi tệp)');
}


/* ====================================== snippet "chép là chạy" (tự chứa) === */

/** Chạy snippet trong sandbox giả lập trình duyệt (có <script src> tải key thật). */
function runSnippetInSandbox(snippet, { keyFiles = {}, promptAnswer = '' } = {}) {
  const logs = [];
  const ctx = {
    console: {
      log: (...a) => logs.push(a.join(' ')),
      info: (...a) => logs.push(a.join(' ')),
      warn: (...a) => logs.push(a.join(' ')),
      error: (...a) => logs.push('ERR ' + a.join(' ')),
    },
    atob,
    TextDecoder,
    TextEncoder,
    Uint8Array,
    Blob,
    ReadableStream,
    Promise,
    setTimeout,
    clearTimeout,
    Math,
    JSON,
    Error,
    String,
    Object,
    Array,
    Number,
    Boolean,
    Date,
    Map,
    Set,
    crypto: globalThis.crypto,
    prompt: () => promptAnswer,
    URL: { createObjectURL: () => 'blob:fake', revokeObjectURL: () => {} },
    __downloads: [],
  };
  ctx.document = {
    head: {
      appendChild(el) {
        const text = keyFiles[el.src];
        if (!text) {
          setTimeout(() => el.onerror && el.onerror(new Error('404')), 0);
          return;
        }
        try {
          vm.runInContext(text, ctx);
          if (el.onload) el.onload();
        } catch (err) {
          if (el.onerror) el.onerror(err);
        }
      },
    },
    createElement(tag) {
      if (tag === 'script') {
        const el = {};
        Object.defineProperty(el, 'src', { set(v) { el._src = v; }, get() { return el._src; } });
        return el;
      }
      return {
        set href(v) { this._href = v; },
        get href() { return this._href; },
        click() { ctx.__downloads.push(this.download); },
        remove() {},
      };
    },
    body: { appendChild() {} },
    documentElement: { appendChild() {} },
  };
  ctx.globalThis = ctx;
  ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext(snippet, ctx);
  return { logs, ctx };
}

async function testRunSnippet() {
  console.log('\n[4d] Snippet "chép là chạy" (tự nạp link key + tự chạy)');
  const keySrc = fs.readFileSync(path.resolve(import.meta.dirname, '..', 'aia.key.js'), 'utf8');
  const master = /masterKey:\s*"([^"]+)"/.exec(keySrc)[1];
  const KEY_URL = 'https://mncuadagmailcom.github.io/aiaiaitao3/secure-script/aia.key.js';

  const buildShared = async (code, extra = {}) =>
    encryptBytes(utf8(code), {
      keyMode: 'shared',
      sharedKey: master,
      keyUrl: './aia.key.js',
      iterations: 10000,
      fileName: 'script.js',
      ...extra,
    });

  // 1) không mật khẩu → chép là chạy
  const code = 'var kq = 0; for (var i = 1; i <= 10; i++) kq += i; console.log("TONG =", kq); globalThis.__kq = kq;';
  const enc = await buildShared(code);
  const snippet = C.buildRunSnippet({ meta: enc.meta, containerBytes: enc.bytes, keyUrl: KEY_URL });

  ok(snippet.includes(KEY_URL), 'snippet nhúng đúng link key script');
  ok(snippet.includes('QUlBU0NSMQ'), 'snippet nhúng bản mã Base64');
  ok(/var PASS = "";/.test(snippet), 'mặc định không mật khẩu');
  ok(snippet.includes('AIA_KEY.open('), 'snippet dùng API AIA_KEY của key script chung');

  // bản mã trong snippet phải là đúng từng byte của tệp .aia
  const b64 = /var DATA = "([^"]+)";/.exec(snippet)[1];
  ok(equalBytes(C.base64ToBytes(b64), enc.bytes), 'DATA trong snippet = đúng byte tệp .aia');

  const r1 = runSnippetInSandbox(snippet, { keyFiles: { [KEY_URL]: keySrc } });
  await wait(250);
  ok(r1.logs.some((l) => l.includes('TONG = 55')), 'chạy được: log của code gốc hiện ra', r1.logs.join(' | '));
  ok(r1.ctx.__kq === 55, 'chạy được: biến toàn cục do code gốc tạo ra tồn tại');
  ok(r1.logs.some((l) => l.includes('đã chạy')), 'snippet báo đã chạy xong');

  // 2) sai mật khẩu / link hỏng: báo lỗi rõ, không ném ra ngoài
  const encPw = await buildShared('console.log("can mat khau");', { passphrase: 'pw-snippet' });
  const askSnippet = C.buildRunSnippet({
    meta: encPw.meta,
    containerBytes: encPw.bytes,
    keyUrl: KEY_URL,
    askPassphrase: true,
  });
  ok(/var PASS = null;/.test(askSnippet), 'chế độ hỏi mật khẩu: PASS = null');
  const rWrong = runSnippetInSandbox(askSnippet, { keyFiles: { [KEY_URL]: keySrc }, promptAnswer: 'sai' });
  await wait(250);
  ok(rWrong.logs.some((l) => l.startsWith('ERR') && /mật khẩu/i.test(l)), 'sai mật khẩu → báo lỗi rõ ràng', rWrong.logs.join(' | '));
  const rRight = runSnippetInSandbox(askSnippet, { keyFiles: { [KEY_URL]: keySrc }, promptAnswer: 'pw-snippet' });
  await wait(250);
  ok(rRight.logs.some((l) => l.includes('can mat khau')), 'nhập đúng mật khẩu → chạy được');

  const embedSnippet = C.buildRunSnippet({
    meta: encPw.meta,
    containerBytes: encPw.bytes,
    keyUrl: KEY_URL,
    passphrase: 'pw-snippet',
  });
  ok(/var PASS = "pw-snippet";/.test(embedSnippet), 'mật khẩu nhúng sẵn trong snippet');
  const rEmbed = runSnippetInSandbox(embedSnippet, { keyFiles: { [KEY_URL]: keySrc } });
  await wait(250);
  ok(rEmbed.logs.some((l) => l.includes('can mat khau')), 'nhúng sẵn: chạy không cần nhập');

  const rNoKey = runSnippetInSandbox(snippet, { keyFiles: {} });
  await wait(250);
  ok(rNoKey.logs.some((l) => l.startsWith('ERR') && /key script/i.test(l)), 'link hỏng → báo không tải được key script');

  // 3) chế độ riêng từng tệp: key script nhúng thẳng vào snippet
  const perFile = await encryptBytes(utf8('console.log("rieng tung tep");'), {
    passphrase: 'pw-rieng',
    keyUrl: './script.key.js',
    requireKeyScript: true,
    iterations: 10000,
    fileName: 'script.js',
  });
  const keyText = C.buildKeyScript(perFile.meta, {});
  const perSnippet = C.buildRunSnippet({
    meta: perFile.meta,
    containerBytes: perFile.bytes,
    keyUrl: 'https://x/script.key.js',
    keyScriptText: keyText,
    passphrase: 'pw-rieng',
  });
  ok(perSnippet.includes('AIA_UNLOCK'), 'chế độ riêng: snippet nhúng mã nguồn key script');
  const rPer = runSnippetInSandbox(perSnippet, { keyFiles: {} });
  await wait(250);
  ok(rPer.logs.some((l) => l.includes('rieng tung tep')), 'chế độ riêng: chạy được không cần mạng', rPer.logs.join(' | '));

  // 3b) bản "ẩn dấu vết": không lộ tiêu đề/link/AIA_KEY, vẫn chạy đúng
  const stealth = C.buildRunSnippet({ style: 'stealth', meta: enc.meta, containerBytes: enc.bytes, keyUrl: KEY_URL });
  const markers = ['AIA Secure Script', 'AIA_KEY', 'AIA_UNLOCK', 'KEY_URL', 'https://', 'chép là chạy', 'Bảo vệ', 'var DATA', 'giải mã', 'key script'];
  const leaked = markers.filter((m) => stealth.includes(m));
  ok(leaked.length === 0, 'ẩn dấu vết: không lộ tiêu đề / link / tên API', 'lọt: ' + leaked.join(', '));
  ok(stealth.trim().startsWith('(function'), 'ẩn dấu vết: không có chú thích mở đầu');
  ok(!/\b[A-Za-z]+_KEY\b|_UNLOCK\b/.test(stealth), 'ẩn dấu vết: không có tên API dạng chữ');
  ok(stealth.length < snippet.length * 1.2, 'ẩn dấu vết: kích thước không phình', stealth.length + ' vs ' + snippet.length);
  const rStealth = runSnippetInSandbox(stealth, { keyFiles: { [KEY_URL]: keySrc } });
  await wait(300);
  ok(rStealth.logs.some((l) => l.includes('TONG = 55')), 'ẩn dấu vết: vẫn tự nạp key + chạy đúng', rStealth.logs.join(' | '));
  ok(rStealth.ctx.__kq === 55, 'ẩn dấu vết: code gốc chạy thật (biến toàn cục tồn tại)');

  const stealthPw = C.buildRunSnippet({
    style: 'stealth',
    meta: encPw.meta,
    containerBytes: encPw.bytes,
    keyUrl: KEY_URL,
    passphrase: 'pw-snippet',
  });
  ok(!stealthPw.includes('pw-snippet'), 'ẩn dấu vết: mật khẩu nhúng KHÔNG hiện dạng chữ');
  const rStealthPw = runSnippetInSandbox(stealthPw, { keyFiles: { [KEY_URL]: keySrc } });
  await wait(300);
  ok(rStealthPw.logs.some((l) => l.includes('can mat khau')), 'ẩn dấu vết + mật khẩu nhúng: chạy đúng');

  // 4) tệp không phải JS: không tự chạy, chỉ tải bản rõ
  const lua = await buildShared('print("xin chao")', { fileName: 'script.lua' });
  const luaSnippet = C.buildRunSnippet({ meta: lua.meta, containerBytes: lua.bytes, keyUrl: KEY_URL });
  ok(/var EXEC = false;/.test(luaSnippet), 'tệp .lua: EXEC = false (không tự chạy)');
  const rLua = runSnippetInSandbox(luaSnippet, { keyFiles: { [KEY_URL]: keySrc } });
  await wait(250);
  ok(rLua.ctx.__downloads.includes('script.lua'), 'tệp .lua: tải bản rõ thay vì chạy', rLua.ctx.__downloads.join(','));
  ok(rLua.logs.some((l) => l.includes('đã tải bản rõ')), 'tệp .lua: báo đã tải bản rõ');
}

/* -------------------------------------------------------------- chạy tất cả --- */

console.log('AIA Secure Script — kiểm thử');
console.log('Node', process.version, '· WebCrypto:', !!(globalThis.crypto && globalThis.crypto.subtle));

const suites = [testRoundtrip, testSecurity, testHeader, testKeyScript, testKeyScriptRequired, testSharedKey, testRunSnippet, testZip, testReverse, testThroughput];
const started = Date.now();
for (const suite of suites) {
  try {
    await suite();
  } catch (err) {
    failed++;
    failures.push((suite.name || 'suite') + ' ném lỗi: ' + (err && err.stack ? err.stack.split('\n')[0] : err));
    process.stdout.write(`  ✘ suite ${suite.name} ném lỗi: ${err && err.message}\n`);
  }
}

console.log(`\n${'─'.repeat(56)}`);
console.log(`Kết quả: ${passed} đạt · ${failed} lỗi · ${((Date.now() - started) / 1000).toFixed(2)} s`);
if (failed) {
  console.log('\nChi tiết lỗi:');
  for (const f of failures) console.log('  • ' + f);
  process.exitCode = 1;
} else {
  console.log('Tất cả kiểm thử đạt.');
}
