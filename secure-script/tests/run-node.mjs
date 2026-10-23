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
  try {
    await fn();
    ok(false, name, 'không ném lỗi');
  } catch (err) {
    ok(err && err.code === code, name, `nhận ${err && err.code}: ${err && err.message}`);
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
  await expectError(() => decryptBytesAll(spliced, 'đúng-mật-khẩu'), 'WRONG_PASSPHRASE', 'sửa link key trong header bị chặn');

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

/* -------------------------------------------------------------- chạy tất cả --- */

console.log('AIA Secure Script — kiểm thử');
console.log('Node', process.version, '· WebCrypto:', !!(globalThis.crypto && globalThis.crypto.subtle));

const suites = [testRoundtrip, testSecurity, testHeader, testKeyScript, testKeyScriptRequired, testZip, testReverse, testThroughput];
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
