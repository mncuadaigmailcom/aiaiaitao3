#!/usr/bin/env node
/* =============================================================================
 * Kiểm thử loader Luau (chạy trong game).
 *
 * Sinh loader bằng buildLuaLoader(), rồi **chạy thật** nó trong máy ảo Lua
 * (fengari) với môi trường giả lập Roblox: `game:HttpGet`, `bit32`, `loadstring`.
 * Bản mã được tạo bằng WebCrypto của Node ⇒ đây là kiểm thử đối chiếu thật giữa
 * AES-256-GCM của trình duyệt và thuật toán thuần Luau trong loader.
 *
 * Chạy: npm install (một lần) rồi `node tests/run-lua.mjs`
 * Không có fengari thì bỏ qua (exit 0).
 * ========================================================================== */

import crypto from 'node:crypto';
import { buildLuaLoader, LUA_RUNTIME } from '../assets/lua-loader.js';

let fengari;
try {
  fengari = await import('fengari');
} catch {
  console.log('⚠ Bỏ qua test Luau: chưa cài fengari (npm install).');
  process.exit(0);
}
const { lua, lauxlib, lualib, to_luastring, to_jsstring } = fengari;

let pass = 0;
const fails = [];
function ok(cond, name, detail = '') {
  if (cond) {
    pass++;
    console.log('  ✔ ' + name);
  } else {
    fails.push(name + (detail ? ' — ' + detail : ''));
    console.log('  ✘ ' + name + (detail ? ' — ' + detail : ''));
  }
}

const SHIM = `
bit32 = {
  bxor = function (...) local r = 0; for i = 1, select('#', ...) do r = (r ~ (select(i, ...))) & 0xffffffff end; return r end,
  band = function (a, b) return (a & b) & 0xffffffff end,
  bor = function (a, b) return (a | b) & 0xffffffff end,
  lshift = function (a, n) return (a << n) & 0xffffffff end,
  rshift = function (a, n) return (a >> n) & 0xffffffff end,
}
loadstring = load
prints = {}
function print(...) local t = {}; for i = 1, select('#', ...) do t[#t+1] = tostring((select(i, ...))) end; prints[#prints+1] = table.concat(t, ' ') end
fetched = {}
game = { HttpGet = function (self, url) fetched[#fetched+1] = url; return KEY_B64 end }
`;

function encryptForGame(text, key) {
  const k = key || crypto.randomBytes(32);
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', k, nonce);
  const ct = Buffer.concat([cipher.update(Buffer.from(text, 'utf8')), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    key: k,
    nonce: nonce.toString('base64'),
    cipherB64: ct.toString('base64'),
    tagHex: tag.toString('hex'),
  };
}

/** Chạy loader trong Lua; trả về {ok, err, globals, fetched, prints}. */
function runLoader(loaderSrc, keyB64) {
  const L = lauxlib.luaL_newstate();
  lualib.luaL_openlibs(L);
  const prelude = SHIM + `\nKEY_B64 = '${keyB64}'\n`;
  let rc = lauxlib.luaL_dostring(L, to_luastring(prelude));
  if (rc !== lua.LUA_OK) throw new Error('prelude lỗi: ' + to_jsstring(lua.lua_tostring(L, -1)));

  rc = lauxlib.luaL_dostring(L, to_luastring(loaderSrc));
  const okRun = rc === lua.LUA_OK;
  const err = okRun ? '' : to_jsstring(lua.lua_tostring(L, -1));
  if (!okRun) lua.lua_pop(L, 1);

  const read = (expr) => {
    const rc2 = lauxlib.luaL_dostring(L, to_luastring('return ' + expr));
    if (rc2 !== lua.LUA_OK) {
      lua.lua_pop(L, 1);
      return '';
    }
    let v = '';
    if (!lua.lua_isnil(L, -1)) {
      if (lua.lua_type(L, -1) === lua.LUA_TNUMBER) v = String(lua.lua_tonumber(L, -1));
      else v = to_jsstring(lua.lua_tostring(L, -1));
    }
    lua.lua_pop(L, 1);
    return v;
  };
  const result = {
    ok: okRun,
    err,
    fetchedCount: Number(read('#fetched') || 0),
    fetchedUrl: read('fetched[1]') || '',
    prints: read('table.concat(prints, "\\n")') || '',
    test: read('AIA_TEST') || '',
  };
  lua.lua_close(L);
  return result;
}

console.log('AIA Secure Script — kiểm thử loader Luau (AES-256-GCM trong game)\n');

/* --------------------------------------------- 1. thuật toán & cú pháp --- */

console.log('[1] Thuật toán trong loader');
ok(typeof LUA_RUNTIME === 'string' && LUA_RUNTIME.length > 3000, 'có thư viện giải mã Luau', String(LUA_RUNTIME.length));
ok(/local SBOX = \{/.test(LUA_RUNTIME), 'có bảng S-box AES');
ok(/local function expand_key/.test(LUA_RUNTIME), 'có mở rộng khoá AES-256');
ok(/local function encrypt_block/.test(LUA_RUNTIME), 'có mã hoá khối AES');
ok(/local function gf_mul/.test(LUA_RUNTIME), 'có phép nhân GF(2^128) cho GCM');
ok(/local function aes_gcm_decrypt/.test(LUA_RUNTIME), 'có hàm giải mã AES-GCM');
ok(/local function b64decode/.test(LUA_RUNTIME), 'có giải mã base64');
ok(/bit32/.test(LUA_RUNTIME), 'dùng bit32 (có sẵn trong Luau)');

// Không được dùng cú pháp chỉ có ở Lua 5.3 (Roblox Luau sẽ báo lỗi cú pháp)
const no53 = (src) => {
  const bad = [];
  if (/\/\//.test(src)) bad.push('//');
  if (/[^~]<</.test(src) || /[^~]>>/.test(src)) bad.push('<< >>');
  if (/(^|[^~])~([^=]|$)/m.test(src.replace(/~=/g, ''))) bad.push('~ bitwise');
  if (/&(?!&)/.test(src)) bad.push('& bitwise');
  if (/(^|[^|])\|([^|]|$)/m.test(src)) bad.push('| bitwise');
  return bad;
};
ok(no53(LUA_RUNTIME).length === 0, 'không có cú pháp Lua 5.3 (Luau đọc được)', no53(LUA_RUNTIME).join(','));

/* ------------------------------------------------ 2. sinh loader --- */

console.log('\n[2] buildLuaLoader');
let threw = false;
try {
  buildLuaLoader({ cipherB64: '', nonceB64: '', tagHex: '', keyUrl: '' });
} catch {
  threw = true;
}
ok(threw, 'thiếu tham số thì báo lỗi');

const sample = 'AIA_TEST = "xin chào từ game"\n';
const enc = encryptForGame(sample);
const opts = (e) => ({ cipherB64: e.cipherB64, nonceB64: e.nonce, tagHex: e.tagHex });
const loader = buildLuaLoader({ ...opts(enc), keyUrl: 'https://example.test/s/k-abc.txt', suffix: 'zz' });
ok(typeof loader === 'string' && loader.length > 3500, 'sinh được script Luau', String(loader.length));
ok(loader.includes('aes_gcm_decrypt'), 'loader có lời gọi giải mã');
ok(!loader.includes('xin chào từ game'), 'KHÔNG chứa bản rõ');
ok(!loader.includes('example.test'), 'KHÔNG chứa link khoá dạng đọc được');
ok(!loader.includes(enc.key.toString('base64')), 'KHÔNG chứa khoá');
ok(loader.includes("'=aia'"), 'có tên chunk khi loadstring');
ok(buildLuaLoader({ ...opts(enc), keyUrl: 'https://example.test/s/k-abc.txt', suffix: 'zz' }) === loader, 'cùng đầu vào → cùng kết quả');
ok(buildLuaLoader({ ...opts(enc), keyUrl: 'https://x.test/k.txt' }) !== buildLuaLoader({ ...opts(enc), keyUrl: 'https://x.test/k.txt' }), 'khác nhau khi không truyền suffix (tên biến ngẫu nhiên)');

/* ------------------------------------------------ 3. chạy thật --- */

console.log('\n[3] Chạy loader trong máy ảo Lua (giả lập Roblox)');
const run1 = runLoader(loader, enc.key.toString('base64'));
ok(run1.ok, 'loader chạy không lỗi', run1.err);
ok(run1.test === 'xin chào từ game', 'script gốc chạy đúng sau khi giải mã', JSON.stringify(run1.test));
ok(run1.fetchedCount === 1, 'chỉ tải khoá đúng 1 lần', String(run1.fetchedCount));
ok(run1.fetchedUrl === 'https://example.test/s/k-abc.txt', 'tải đúng link khoá', run1.fetchedUrl);

const sample2 = 'for i = 1, 3 do print("dong " .. i) end\nAIA_TEST = "ok2"\n';
const enc2 = encryptForGame(sample2);
const run2 = runLoader(buildLuaLoader({ ...opts(enc2), keyUrl: 'https://x.test/k2.txt', suffix: 'a1' }), enc2.key.toString('base64'));
ok(run2.ok && run2.test === 'ok2', 'script nhiều dòng chạy đúng', run2.err);
ok(run2.prints === 'dong 1\ndong 2\ndong 3', 'print() của script gốc vẫn hoạt động', JSON.stringify(run2.prints));

// Unicode
const uni = 'AIA_TEST = "Tiếng Việt 🚀 日本語"\n';
const enc3 = encryptForGame(uni);
const run3 = runLoader(buildLuaLoader({ ...opts(enc3), keyUrl: 'https://x.test/k3.txt', suffix: 'u1' }), enc3.key.toString('base64'));
ok(run3.ok && run3.test === 'Tiếng Việt 🚀 日本語', 'giữ nguyên Unicode', JSON.stringify(run3.test));

// Script lớn (khoảng 40 KB)
const big = 'local t = {}\n' + 't[#t+1] = "dòng dữ liệu để kiểm tra tốc độ"\n'.repeat(600) + 'AIA_TEST = "big:" .. #t\n';
const enc4 = encryptForGame(big);
const t0 = Date.now();
const run4 = runLoader(buildLuaLoader({ ...opts(enc4), keyUrl: 'https://x.test/k4.txt', suffix: 'b1' }), enc4.key.toString('base64'));
const bigMs = Date.now() - t0;
ok(run4.ok && /^big:600$/.test(run4.test), 'script ~25 KB giải mã + chạy đúng', run4.err || run4.test);
ok(bigMs < 120000, 'thời gian giải mã chấp nhận được (máy ảo JS)', bigMs + ' ms');

/* ------------------------------------------------ 4. chống sửa / sai khoá --- */

console.log('\n[4] Toàn vẹn');
const wrongKey = crypto.randomBytes(32).toString('base64');
const runBad = runLoader(loader, wrongKey);
ok(!runBad.ok && /sai khoa/.test(runBad.err), 'sai khoá → chặn trước khi chạy', runBad.err);
ok(runBad.test === '', 'không chạy được script khi sai khoá');

// sửa 1 byte của bản mã → tag sai
const tampered = Buffer.from(enc.cipherB64, 'base64');
tampered[0] ^= 0x01;
const encTampered = { ...enc, cipherB64: tampered.toString('base64') };
const runTamper = runLoader(buildLuaLoader({ ...opts(encTampered), keyUrl: 'https://x.test/k.txt', suffix: 't1' }), enc.key.toString('base64'));
ok(!runTamper.ok && /sai khoa/.test(runTamper.err), 'sửa 1 byte bản mã → bị phát hiện', runTamper.err);

// thiếu HttpGet
const Lx = lauxlib.luaL_newstate();
lualib.luaL_openlibs(Lx);
lauxlib.luaL_dostring(Lx, to_luastring(SHIM.replace(/game = \{[^}]*\}/, 'game = {}') + `\nKEY_B64 = '${enc.key.toString('base64')}'`));
const rcNo = lauxlib.luaL_dostring(Lx, to_luastring(loader));
const errNo = rcNo === lua.LUA_OK ? '' : to_jsstring(lua.lua_tostring(Lx, -1));
ok(rcNo !== lua.LUA_OK && /khong tai duoc khoa/.test(errNo), 'thiếu HttpGet → báo lỗi rõ ràng', errNo);
lua.lua_close(Lx);

console.log('\n────────────────────────────────────────────────────────');
console.log(`Kết quả Luau: ${pass} đạt · ${fails.length} lỗi`);
if (fails.length) {
  console.log('\nChi tiết:');
  for (const f of fails) console.log('  • ' + f);
  process.exitCode = 1;
} else {
  console.log('Loader Luau giải mã đúng chuẩn AES-256-GCM và chạy được script gốc trong game.');
}
