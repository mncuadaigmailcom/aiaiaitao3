#!/usr/bin/env node
/* =============================================================================
 * AIA Secure Script — CLI
 * -----------------------------------------------------------------------------
 * Mã hoá / giải mã script ngay trên máy, không cần mở trình duyệt.
 *
 *   node tools/cli.mjs encrypt script.js --pass "mat-khau" --out ./out
 *   node tools/cli.mjs decrypt ./out/script.aia --pass "mat-khau" --out script.js
 *   node tools/cli.mjs info ./out/script.aia
 *   node tools/cli.mjs keycheck ./out/script.aia ./out/script.key.js
 * ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import * as C from '../assets/core.js';

const USAGE = `AIA Secure Script CLI

  encrypt <tệp> [tuỳ chọn]        Mã hoá một tệp thành <tên>.aia + key script
    --out <thư mục>               Nơi ghi kết quả (mặc định: ./aia-out)
    --pass <mật khẩu>             Mật khẩu (khuyến nghị). Không truyền = hỏi ở terminal.
    --key-url <chuỗi>             Link key script tham gia khoá (mặc định ./key.js)
    --iter <số>                   Số vòng PBKDF2 (mặc định 600000)
    --chunk <byte>                Kích thước khối (mặc định 1048576, min 65536)
    --expiry <ISO>                Hạn dùng, ví dụ 2026-12-31T00:00:00Z
    --note <chuỗi>                Ghi chú trong header
    --embed                       Nhúng mật khẩu vào key script (tiện nhưng kém an toàn)
    --no-hash                     Không băm SHA-256 bản rõ (dùng cho tệp > 64 MiB)
    --no-require-key              Không bắt buộc key script (mặc định: BẮT BUỘC)
    --shared                      Dùng key script DÙNG CHUNG (aia.key.js) cho mọi tệp
    --shared-key <aia.key.js>     Tệp key script chung (mặc định: ./aia.key.js cạnh CLI)

  decrypt <tệp.aia> [tuỳ chọn]    Giải mã (dùng header của .aia, không cần key script)
    --pass <mật khẩu>             Mật khẩu
    --key <key.js>                Key script (bắt buộc nếu bản mã có khoá riêng)
    --shared-key <aia.key.js>     Key script chung (bắt buộc nếu bản mã dùng khoá chung)
    --out <tệp>                   Tệp đầu ra (mặc định: tên gốc + .plain)

  link <url> [tuỳ chọn]           Mã hoá MỘT LINK (trang web / script) thành token
    --pass <mật khẩu>             Mật khẩu cho token (tuỳ chọn)
    --key-url <chuỗi>             Link key script tham gia khoá (mặc định ./aia.key.js)
    --iter <số>                   Số vòng PBKDF2 (mặc định 600000)
    --shared-key <aia.key.js>     Key script chung (mặc định: ./aia.key.js cạnh CLI)
    --snippet                     In kèm snippet "chép là chạy" thay vì chỉ token
    --style <stealth|labeled>     Kiểu snippet (mặc định stealth)
    --action <open|load|text>     Snippet làm gì (mặc định open)
    --out <tệp>                   Ghi token (hoặc snippet) ra tệp

  unlink <token> [tuỳ chọn]       Mở khoá token link → in URL
    --pass <mật khẩu>             Mật khẩu (nếu token có)
    --shared-key <aia.key.js>     Key script chung

  info <tệp.aia>                  In header (không cần mật khẩu)
  keycheck <tệp.aia> <key.js>     So khớp ID giữa .aia và key script
  selftest                        Chạy kiểm tra nhanh mã hoá/giải mã

Ví dụ:
  node tools/cli.mjs encrypt my-script.lua --out ./out --pass "S3cret!2026"
  node tools/cli.mjs decrypt ./out/my-script.aia --pass "S3cret!2026" --out ./my-script.lua
  node tools/cli.mjs link https://example.com/script.js --pass "S3cret!2026"
  node tools/cli.mjs unlink "AIALNK1.…" --pass "S3cret!2026"
`;

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (['embed', 'no-hash', 'help', 'no-require-key', 'shared'].includes(key)) args[key] = true;
      else {
        args[key] = argv[i + 1];
        i++;
      }
    } else args._.push(a);
  }
  return args;
}

function human(bytes) {
  return C.formatBytes(bytes);
}

function pctText(pct) {
  if (!Number.isFinite(pct) || pct === 0) return '0%';
  if (pct < 0.01) return pct.toPrecision(2) + '%';
  if (pct < 1) return pct.toFixed(3) + '%';
  if (pct < 100) return pct.toFixed(2) + '%';
  return Math.round(pct).toLocaleString('vi-VN') + '%';
}

async function readPassword(args, promptText) {
  if (args.pass !== undefined) return String(args.pass);
  if (!process.stdin.isTTY) return '';
  return await new Promise((resolve) => {
    process.stdout.write(promptText);
    process.stdin.setRawMode?.(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    let value = '';
    const onData = (ch) => {
      ch = String(ch);
      if (ch === '\r' || ch === '\n' || ch === '\u0004') {
        process.stdin.setRawMode?.(false);
        process.stdin.pause();
        process.stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(value);
        return;
      }
      if (ch === '\u0003') {
        process.stdout.write('\n');
        process.exit(130);
      }
      if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1);
      else value += ch;
    };
    process.stdin.on('data', onData);
  });
}

function fileSink(targetPath) {
  const stream = fs.createWriteStream(targetPath);
  let written = 0;
  return {
    write: (chunk) =>
      new Promise((resolve, reject) => {
        written += chunk.length;
        stream.write(Buffer.from(chunk), (err) => (err ? reject(err) : resolve()));
      }),
    close: () =>
      new Promise((resolve, reject) => {
        stream.end((err) => (err ? reject(err) : resolve(written)));
      }),
  };
}

function fileStream(filePath) {
  const file = filePath;
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

function progressPrinter(label) {
  let last = 0;
  return (done, total) => {
    const now = Date.now();
    if (now - last < 120 && done < total) return;
    last = now;
    const pct = total ? Math.floor((done / total) * 100) : 100;
    process.stdout.write(`\r${label} ${String(pct).padStart(3)}%  ${human(done)} / ${human(total)}   `);
    if (done >= total) process.stdout.write('\n');
  };
}

async function cmdEncrypt(args) {
  const input = args._[0];
  if (!input) throw new Error('Thiếu tệp đầu vào.');
  const stat = fs.statSync(input);
  if (!stat.isFile()) throw new Error('Không phải tệp thường.');
  if (stat.size > C.MAX_INPUT_BYTES) throw new Error('Tệp vượt quá 5 GiB.');

  const outDir = args.out || './aia-out';
  fs.mkdirSync(outDir, { recursive: true });
  const slug = C.slugify(path.basename(input));
  const payloadName = slug + '.aia';
  const passphrase = await readPassword(args, 'Mật khẩu (Enter = không đặt): ');
  const sharedPath = args['shared-key'] || (args.shared ? path.resolve(import.meta.dirname, '..', 'aia.key.js') : null);
  let sharedKey = null;
  if (sharedPath) {
    const text = fs.readFileSync(sharedPath, 'utf8');
    const m = /masterKey:\s*"([^"]+)"/.exec(text);
    if (!m) throw new Error('Tệp key script chung không có masterKey: ' + sharedPath);
    sharedKey = m[1];
  }
  const shared = !!sharedKey;
  const keyUrl = args['key-url'] || (shared ? './aia.key.js' : './' + slug + '.key.js');
  const embed = !!args.embed;

  const options = {
    keyMode: shared ? 'shared' : undefined,
    sharedKey,
    keyUrl,
    passphrase,
    iterations: Number(args.iter || C.DEFAULT_ITERATIONS),
    chunkSize: Number(args.chunk || C.DEFAULT_CHUNK_SIZE),
    expiry: args.expiry || null,
    note: args.note || '',
    fileName: path.basename(input),
    fileType: '',
    lang: C.detectLang(path.basename(input)),
    hashPlaintext: !args['no-hash'],
    requireKeyScript: !args['no-require-key'],
    payloadFile: payloadName,
  };

  const payloadPath = path.join(outDir, payloadName);
  const sink = fileSink(payloadPath);
  const onProgress = progressPrinter('mã hoá');
  const started = Date.now();
  const { meta } = await C.encryptStream({
    openStream: () => fileStream(input),
    size: stat.size,
    options,
    sink,
    onProgress,
  });
  const written = fs.statSync(payloadPath).size;

  const keyName = shared ? 'aia.key.js' : slug + '.key.js';
  const runnerName = 'run-' + slug + '.html';
  const readmeName = 'README-' + slug + '.txt';
  fs.writeFileSync(
    path.join(outDir, keyName),
    shared
      ? fs.readFileSync(sharedPath, 'utf8')
      : C.buildKeyScript(meta, { embeddedPassphrase: embed ? passphrase : null }),
  );
  fs.writeFileSync(path.join(outDir, runnerName), C.buildRunnerHtml(meta, { keyFileName: keyName, runnerFileName: runnerName }));
  fs.writeFileSync(path.join(outDir, readmeName), C.buildReadme(meta, { keyFileName: keyName, runnerFileName: runnerName }));

  const secs = (Date.now() - started) / 1000;
  const overhead = written - stat.size;
  console.log('');
  console.log(`✔ Đã mã hoá trong ${secs.toFixed(2)} s (${human(stat.size / Math.max(0.001, secs))}/s)`);
  console.log(`  ${payloadPath}  (${human(written)})`);
  console.log(`  ${path.join(outDir, keyName)}`);
  console.log(`  ${path.join(outDir, runnerName)}`);
  console.log(`  ${path.join(outDir, readmeName)}`);
  console.log(`  Tăng thêm: ${overhead} byte (${pctText((overhead / stat.size) * 100)}) · ${meta.chunk.total} khối`);
  console.log(
    meta.keyWrapIn === 'shared-key-script'
      ? '  Khoá tệp: DÙNG CHUNG ' + keyName + ' (một link cho mọi tệp) + mật khẩu'
      : meta.keyWrapIn === 'key-script'
        ? '  Khoá tệp: BẮT BUỘC key script (chỉ nằm trong ' + keyName + ')'
        : '  Khoá tệp: dẫn xuất trực tiếp (không bắt buộc key script)',
  );
  console.log(`  Thời gian trong header: ${meta.time.readable} (raw ${meta.time.raw})`);
  if (!passphrase && shared) {
    console.log('  ⚠ DÙNG CHUNG + KHÔNG mật khẩu: aia.key.js là công khai, ai có tệp .aia là mở được.');
    console.log('    Hãy đặt --pass, hoặc dùng chế độ riêng từng tệp.');
  } else if (!passphrase) {
    console.log('  ⚠ Không đặt mật khẩu: ai có tệp .aia + key script là mở được.');
  }
}

async function cmdDecrypt(args) {
  const input = args._[0];
  if (!input) throw new Error('Thiếu tệp .aia.');
  const outPath = args.out || input.replace(/\.(aia|bin)$/i, '') + '.plain';
  const passphrase = await readPassword(args, 'Mật khẩu: ');
  const sink = fileSink(outPath);
  const onProgress = progressPrinter('giải mã');
  const started = Date.now();

  let keyWrap = null;
  const headerInfo = readHeaderSync(input);
  if (args.key) {
    const keyText = fs.readFileSync(args.key, 'utf8');
    const m = /\/\*<AIA:META>\*\/([\s\S]*?)\/\*<\/AIA:META>\*\//.exec(keyText);
    if (!m) throw new Error('Tệp key không đúng định dạng AIA.');
    const keyMeta = JSON.parse(m[1]);
    if (headerInfo.meta.id !== keyMeta.id) throw new Error('Key script không khớp tệp .aia (ID khác nhau).');
    keyWrap = keyMeta.keyWrap || null;
  } else if (headerInfo.meta.keyWrapIn === 'key-script') {
    throw new Error('Bản mã này bắt buộc phải có key script. Thêm --key <tệp.key.js>.');
  }

  let sharedKey = null;
  if (headerInfo.meta.keyWrapIn === 'shared-key-script') {
    const sharedPath = args['shared-key'] || path.resolve(import.meta.dirname, '..', 'aia.key.js');
    const text = fs.readFileSync(sharedPath, 'utf8');
    const m = /masterKey:\s*"([^"]+)"/.exec(text);
    if (!m) throw new Error('Tệp key script chung không có masterKey: ' + sharedPath);
    sharedKey = m[1];
  }

  const { meta, hashVerified } = await C.decryptStream({
    source: fileStream(input),
    passphrase,
    sink,
    onProgress,
    keyWrap,
    sharedKey,
  });
  const secs = (Date.now() - started) / 1000;
  console.log('');
  console.log(`✔ Đã giải mã ${human(meta.file.size)} trong ${secs.toFixed(2)} s → ${outPath}`);
  console.log(
    `  Toàn vẹn AES-GCM: OK · SHA-256: ${
      hashVerified === true ? 'OK' : hashVerified === false ? 'KHÔNG KHỚP' : meta.file.sha256 ? 'bỏ qua (ghi trực tiếp ra tệp)' : 'không dùng'
    }`,
  );
  console.log(`  Thời gian tạo: ${meta.time.readable} · key: ${meta.keyUrl}`);
  if (meta.file.lang !== 'javascript' && meta.file.lang !== 'typescript') {
    console.log(`  (${meta.file.lang}: tệp này không chạy trực tiếp trong trình duyệt.)`);
  }
}

function readHeaderSync(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(Math.min(fs.fstatSync(fd).size, 2 * 1024 * 1024));
    fs.readSync(fd, buf, 0, buf.length, 0);
    return C.parseContainerHeader(new Uint8Array(buf));
  } finally {
    fs.closeSync(fd);
  }
}

async function cmdInfo(args) {
  const input = args._[0];
  if (!input) throw new Error('Thiếu tệp .aia.');
  const { meta, headerLength } = readHeaderSync(input);
  console.log(JSON.stringify(meta, null, 2));
  console.log(`\nHeader: ${headerLength} byte`);
}

async function cmdKeycheck(args) {
  const [cipherPath, keyPath] = args._;
  if (!cipherPath || !keyPath) throw new Error('Cần 2 tệp: .aia và key.js');
  const keyText = fs.readFileSync(keyPath, 'utf8');
  const m = /\/\*<AIA:META>\*\/([\s\S]*?)\/\*<\/AIA:META>\*\//.exec(keyText);
  if (!m) throw new Error('Tệp key không đúng định dạng AIA.');
  const keyMeta = JSON.parse(m[1]);
  const { meta } = readHeaderSync(cipherPath);
  const sameId = meta.id === keyMeta.id;
  const sameTime = meta.time.raw === keyMeta.time.raw && meta.time.unixMs === keyMeta.time.unixMs;
  const sameSalt = meta.kdf.salt === keyMeta.kdf.salt;
  const sameKeyUrl = meta.keyUrl === keyMeta.keyUrl;
  console.log(`ID khớp:        ${sameId ? 'CÓ' : 'KHÔNG'}`);
  console.log(`Thời gian khớp: ${sameTime ? 'CÓ' : 'KHÔNG'}`);
  console.log(`Salt khớp:      ${sameSalt ? 'CÓ' : 'KHÔNG'}`);
  console.log(`Link key khớp:  ${sameKeyUrl ? 'CÓ' : 'KHÔNG'}`);
  process.exitCode = sameId && sameTime && sameSalt ? 0 : 1;
}


/* ------------------------------------------------------------- mã hoá LINK --- */

function sharedMasterFromFile(args) {
  const file = args['shared-key'] || path.resolve(import.meta.dirname, '..', 'aia.key.js');
  const text = fs.readFileSync(file, 'utf8');
  const m = /masterKey:\s*"([^"]+)"/.exec(text);
  if (!m) throw new Error('Tệp key script chung không có masterKey: ' + file);
  const id = (/keyId:\s*"([0-9a-f]+)"/.exec(text) || [])[1] || '';
  return { masterKey: m[1], keyId: id, file };
}

async function cmdLink(args) {
  const url = args._[0];
  if (!url) throw new Error('Thiếu link cần mã hoá.');
  const { masterKey } = sharedMasterFromFile(args);
  const passphrase = args.pass || '';
  const iterations = Number(args.iter) || C.DEFAULT_ITERATIONS;
  const keyUrl = args['key-url'] || './aia.key.js';
  const result = await C.encryptLink(url, { keyUrl, sharedKey: masterKey, passphrase, iterations });
  const style = args.style === 'labeled' ? 'labeled' : 'stealth';
  const action = ['open', 'load', 'text'].includes(args.action) ? args.action : 'open';
  const snippet = C.buildLinkSnippet({
    token: result.token,
    keyUrl,
    style,
    action,
    passphrase,
    askPassphrase: false,
  });
  const out = args.snippet ? snippet : result.token;
  if (args.out) {
    fs.writeFileSync(args.out, out);
    console.log(`✔ Đã ghi ${args.snippet ? 'snippet' : 'token'} → ${args.out}`);
  } else {
    console.log(out);
  }
  console.error('');
  console.error(`  Link gốc : ${C.normalizeLink(url)}`);
  console.error(`  Token    : ${result.token.length} ký tự · thời gian ${result.header.t}`);
  console.error(`  Bảo vệ   : ${passphrase ? 'có mật khẩu' : 'KHÔNG mật khẩu'} · KDF ${iterations} vòng`);
  if (!passphrase) console.error('  ⚠ Không mật khẩu: ai có token + aia.key.js là mở được.');
}

async function cmdUnlink(args) {
  const token = args._[0];
  if (!token) throw new Error('Thiếu token link.');
  const { masterKey } = sharedMasterFromFile(args);
  const res = await C.decryptLink(token, { sharedKey: masterKey, passphrase: args.pass || '' });
  if (args.out) {
    fs.writeFileSync(args.out, res.url + '\n');
    console.log(`✔ Đã ghi link → ${args.out}`);
  } else {
    console.log(res.url);
  }
  console.error(`  Tạo lúc: ${res.createdAt} · key: ${res.keyUrl}`);
}

async function cmdSelftest() {
  const code = utf8('function hello(){ console.log("xin chào " + new Date().getFullYear()); }\n hello();\n');
  const results = [];
  for (const chunkSize of [65536, 1024 * 1024]) {
    const options = { chunkSize, passphrase: 'mat-khau-thu', keyUrl: './k.js', fileName: 'test.js' };
    const sink = memorySink();
    const { meta } = await C.encryptStream({ openStream: () => streamOf(code), size: code.length, options, sink });
    const bytes = sink.bytes();
    const dec = await C.decryptBytes(bytes, 'mat-khau-thu');
    results.push([`khối ${chunkSize}`, bytesEqual(dec.plaintext, code), `${meta.chunk.total} khối`]);
    let wrongPass = false;
    try { await C.decryptBytes(bytes, 'sai'); } catch { wrongPass = true; }
    results.push([`khối ${chunkSize} · sai mật khẩu bị chặn`, wrongPass, '']);
  }
  // chế độ bắt buộc key script
  {
    const options = { chunkSize: 65536, passphrase: 'khoa-rieng', keyUrl: './k.js', fileName: 't.js', requireKeyScript: true };
    const sink = memorySink();
    const { meta } = await C.encryptStream({ openStream: () => streamOf(code), size: code.length, options, sink });
    const bytes = sink.bytes();
    let blocked = false;
    try {
      await C.decryptBytes(bytes, 'khoa-rieng');
    } catch (err) {
      blocked = err.code === 'KEY_REQUIRED';
    }
    results.push(['bắt buộc key script: thiếu key bị chặn', blocked, '']);
    const ok2 = await C.decryptBytes(bytes, 'khoa-rieng', null, meta.keyWrap);
    results.push(['bắt buộc key script: có key giải mã đúng', bytesEqual(ok2.plaintext, code), '']);
  }

  // link
  {
    const { masterKey } = sharedMasterFromFile({});
    const enc = await C.encryptLink('https://example.com/cli-test', { sharedKey: masterKey, keyUrl: './aia.key.js', iterations: 10000 });
    const dec = await C.decryptLink(enc.token, { sharedKey: masterKey });
    results.push(['link: mã hoá/giải mã đúng', dec.url === 'https://example.com/cli-test', `${enc.token.length} ký tự`]);
    let blocked = false;
    try { await C.decryptLink(enc.token, { sharedKey: C.generateSharedKeyBase64() }); } catch { blocked = true; }
    results.push(['link: sai key script bị chặn', blocked, '']);
  }

  for (const [name, ok, extra] of results) console.log(`${ok ? '✔' : '✘'} ${name} ${extra}`);
  if (results.some((r) => !r[1])) process.exitCode = 1;
}

function utf8(s) { return new TextEncoder().encode(s); }
function streamOf(bytes) {
  return new ReadableStream({
    start(c) { c.enqueue(bytes); c.close(); },
  });
}
function memorySink() {
  const chunks = [];
  return { write: async (b) => { chunks.push(b.slice()); }, close: async () => {}, bytes: () => C.concatBytes(chunks) };
}
function bytesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._.shift();
  if (!cmd || cmd === 'help' || args.help) {
    console.log(USAGE);
    return;
  }
  switch (cmd) {
    case 'encrypt': return cmdEncrypt(args);
    case 'decrypt': return cmdDecrypt(args);
    case 'info': return cmdInfo(args);
    case 'keycheck': return cmdKeycheck(args);
    case 'link': return cmdLink(args);
    case 'unlink': return cmdUnlink(args);
    case 'selftest': return cmdSelftest();
    default:
      console.error('Lệnh không rõ: ' + cmd + '\n');
      console.log(USAGE);
      process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error('\n✘ ' + (err && err.message ? err.message : err));
  if (err && err.code) console.error('  mã lỗi: ' + err.code);
  process.exitCode = 1;
});
