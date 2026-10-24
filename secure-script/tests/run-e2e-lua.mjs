#!/usr/bin/env node
/* =============================================================================
 * Kiểm thử end-to-end: gói xuất bản → chạy loader trong máy ảo Lua
 * -----------------------------------------------------------------------------
 * Đây là bài test mô phỏng ĐÚNG việc người dùng làm:
 *   dán code Luau → bấm “Đưa lên GitHub” → lấy tệp `l-<id>.lua` + `k-<id>.txt`
 *   mà gói xuất bản sinh ra → dán dòng `loadstring(game:HttpGet("…"))()` vào executor.
 *
 * Loader được chạy trong fengari (Lua 5.3) với môi trường **giống Roblox/Luau**:
 *   · `_G` là bảng RỖNG (Luau sandbox không đặt biến toàn cục vào `_G`)
 *   · biến toàn cục thật (`game`, `request`, `loadstring`…) nằm ở env của chunk
 *   · mỗi kịch bản executor chỉ cung cấp MỘT kiểu hàm tải khác nhau
 *
 * Chạy: `npm install` (jsdom/fengari không bắt buộc) rồi `node tests/run-e2e-lua.mjs`
 * Thiếu fengari thì bỏ qua (exit 0).
 * ========================================================================== */

import { buildPublishPlan } from '../assets/publish.js';

let fengari;
try {
  fengari = await import('fengari');
} catch {
  console.log('⚠ Bỏ qua test end-to-end: chưa cài fengari (npm install).');
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

/* --------------------------------------------------- 1. gói xuất bản --- */

console.log('AIA Secure Script — end-to-end: xuất bản → chạy trong game\n');
console.log('[1] Gói xuất bản (đúng hàm mà nút “Đưa lên GitHub” gọi)');

const CODE = [
  "local Players = game:GetService('Players')",
  'local tong = 0',
  'for i = 1, 5 do tong = tong + i end',
  'print("tong = " .. tong)',
  'AIA_TEST = "da chay:" .. tostring(tong) .. ":" .. tostring(#Players:GetPlayers())',
  '',
].join('\n');

const plan = await buildPublishPlan({
  code: CODE,
  target: 'luau',
  owner: 'demo-user',
  repo: 'game-hub',
  branch: 'main',
  dir: 's',
  id: 'abcdef12',
  cloak: true,
  encrypt: true,
});

const fileOf = (suffix) => plan.files.find((f) => f.path.endsWith(suffix));
const loaderFile = fileOf('.lua');
const keyFile = fileOf('.txt');
const page = plan.files.find((f) => f.path.endsWith('index.html'));

ok(plan.files.length === 3, 'gói có đúng 3 tệp (trang trắng + khoá + loader)', plan.files.map((f) => f.path).join(', '));
ok(!!loaderFile && loaderFile.path === 's/l-abcdef12.lua', 'tên tệp loader đúng', loaderFile && loaderFile.path);
ok(!!keyFile && keyFile.path === 's/k-abcdef12.txt', 'tên tệp khoá đúng', keyFile && keyFile.path);
ok(!!page && page.content.includes('404: Not Found'), 'trang công khai là trang trắng 404');

const keyBytes = Buffer.from(keyFile.content.trim(), 'base64');
ok(keyBytes.length === 32, 'tệp khoá là base64 của đúng 32 byte', keyBytes.length + ' byte');
ok(!loaderFile.content.includes('AIA_TEST'), 'loader KHÔNG chứa bản rõ của code');
ok(!loaderFile.content.includes(keyFile.content.trim()), 'loader KHÔNG chứa khoá');
ok(!loaderFile.content.includes('demo-user.github.io'), 'link khoá không lộ dạng chữ thường');

const scriptUrl = plan.links.scriptUrl;
ok(scriptUrl === 'https://demo-user.github.io/game-hub/s/l-abcdef12.lua', 'link script đúng', scriptUrl);

/* ------------------------------------- 2. chạy trong môi trường Roblox --- */

console.log('\n[2] Chạy tệp .lua đã xuất bản trong máy ảo Lua (môi trường kiểu Roblox)');

const PRELUDE = `
bit32 = {
  bxor = function (...) local r = 0; for i = 1, select('#', ...) do r = (r ~ (select(i, ...))) & 0xffffffff end; return r end,
  band = function (a, b) return (a & b) & 0xffffffff end,
  bor = function (a, b) return (a | b) & 0xffffffff end,
  lshift = function (a, n) return (a << n) & 0xffffffff end,
  rshift = function (a, n) return (a >> n) & 0xffffffff end,
}
prints = {}
warns = {}
fetched = {}
function print(...) local t = {}; for i = 1, select('#', ...) do t[#t+1] = tostring((select(i, ...))) end; prints[#prints+1] = table.concat(t, ' ') end
function warn(...) local t = {}; for i = 1, select('#', ...) do t[#t+1] = tostring((select(i, ...))) end; warns[#warns+1] = table.concat(t, ' ') end
`;

/**
 * @param {object} env
 * @param {string} env.gameLine  định nghĩa `game` (có/không có HttpGet)
 * @param {string} [env.extra]   hàm tải bổ sung (request / getgenv()…)
 */
function runInGame(loaderSrc, keyB64, env = {}) {
  const L = lauxlib.luaL_newstate();
  lualib.luaL_openlibs(L);
  const prelude =
    PRELUDE +
    `
loadstring = load
local KEY = ${JSON.stringify(keyB64)}
${env.gameLine || "game = { HttpGet = function () return KEY end }"}
${env.extra || ''}
-- Roblox-like: _G là bảng rỗng, KHÔNG phải môi trường toàn cục
AIA_ENV = setmetatable({ _G = {} }, { __index = _G })
AIA_SRC = [==[${loaderSrc}]==]
`;
  let rc = lauxlib.luaL_dostring(L, to_luastring(prelude));
  if (rc !== lua.LUA_OK) throw new Error('prelude: ' + to_jsstring(lua.lua_tostring(L, -1)));

  rc = lauxlib.luaL_dostring(
    L,
    to_luastring("local f, e = AIA_ENV.load(AIA_SRC, '=aia', 't', AIA_ENV); if not f then error(e) end; f()"),
  );
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
    if (!lua.lua_isnil(L, -1)) v = to_jsstring(lua.lua_tostring(L, -1));
    lua.lua_pop(L, 1);
    return v;
  };
  const out = {
    ok: okRun,
    err,
    test: read('tostring(AIA_TEST)'),
    prints: read('table.concat(prints, "\\n")'),
    warns: read('table.concat(warns, "\\n")'),
    fetched: read('tostring(#fetched)'),
  };
  lua.lua_close(L);
  return out;
}

const KEY_B64 = keyFile.content.trim();

// (a) executor bình thường: game:HttpGet có, KHÔNG có _G.game (đúng như Roblox)
const a = runInGame(loaderFile.content, KEY_B64, {
  gameLine: `game = {
    HttpGet = function (self, url) fetched[#fetched+1] = url; return KEY end,
    GetService = function (self, n) return { GetPlayers = function () return { 1, 2, 3 } end } end,
  }`,
});
ok(a.ok, 'chạy được trong môi trường _G rỗng (như Roblox)', a.err);
ok(a.test === 'da chay:15:3', 'code gốc chạy đúng sau khi giải mã', JSON.stringify(a.test));
ok(a.prints === 'tong = 15', 'print() của code gốc vẫn hoạt động', JSON.stringify(a.prints));
ok(a.fetched === '1', 'chỉ tải khoá đúng 1 lần', a.fetched);

// (b) Delta/UNC: game:HttpGet bị chặn nhưng có request()
const b = runInGame(loaderFile.content, KEY_B64, {
  gameLine: "game = { HttpGet = function () error('blocked') end }",
  extra: `function request(t) fetched[#fetched+1] = t.Url; return { StatusCode = 200, Body = KEY } end
game.GetService = function () return { GetPlayers = function () return { 1, 2, 3 } end } end`,
});
ok(b.ok && b.test === 'da chay:15:3', 'game:HttpGet hỏng nhưng có request() → vẫn chạy', b.err || b.test);
ok(b.fetched === '1', 'request() chỉ được gọi 1 lần', b.fetched);

// (c) chỉ có getgenv().request
const c = runInGame(loaderFile.content, KEY_B64, {
  gameLine: 'game = { GetService = function () return { GetPlayers = function () return { 1 } end } end }',
  extra: `getgenv = function() return { request = function (t) fetched[#fetched+1] = t.Url; return { StatusCode = 200, Body = KEY } end } end`,
});
ok(c.ok && c.test === 'da chay:15:1', 'chỉ có getgenv().request → vẫn chạy', c.err || c.test);

// (d) chỉ có HttpGet toàn cục (không có game.HttpGet)
const d = runInGame(loaderFile.content, KEY_B64, {
  gameLine: 'game = { GetService = function () return { GetPlayers = function () return { 4, 5 } end } end }',
  extra: 'function HttpGet(url) fetched[#fetched+1] = url; return KEY end',
});
ok(d.ok && d.test === 'da chay:15:2', 'chỉ có HttpGet toàn cục → vẫn chạy', d.err || d.test);

/* ------------------------------------------- 3. chẩn đoán khi có lỗi --- */

console.log('\n[3] Báo lỗi rõ ràng thay vì “không chạy”');

const e1 = runInGame(loaderFile.content, KEY_B64, {
  gameLine: "game = { HttpGet = function () return '<!doctype html><html>404: Not Found</html>' end }",
});
ok(!e1.ok && /trang web/.test(e1.err), 'dán nhầm link công khai (HTML) → báo “trang web”', e1.err);

const e2 = runInGame(loaderFile.content, KEY_B64, { gameLine: 'game = {}' });
ok(!e2.ok && e2.err.includes(scriptUrl.replace('l-abcdef12.lua', 'k-abcdef12.txt')), 'lỗi nêu rõ URL khoá', e2.err);
ok(e2.warns.includes('AIA:'), 'lỗi được in ra warn để người dùng thấy', e2.warns);

const e3 = runInGame(loaderFile.content, Buffer.from('quá ngắn').toString('base64'), {
  gameLine: 'game = { HttpGet = function () return KEY end }',
});
ok(!e3.ok && /32/.test(e3.err), 'tệp khoá sai kích thước → báo cần 32 byte', e3.err);

// sai khoá → tag GCM không khớp
const wrongKey = Buffer.alloc(32, 7).toString('base64');
const e4 = runInGame(loaderFile.content, wrongKey);
ok(!e4.ok && /sai khoa/.test(e4.err), 'khoá sai → báo sai khoá, không chạy code', e4.err);
ok(e4.test === 'nil', 'khoá sai → code gốc không chạy', JSON.stringify(e4.test));

// sửa 1 byte trong loader (bản mã) → phát hiện
const tampered = loaderFile.content.replace(/(\{ "[A-Za-z0-9+/=]{8})/, (m) => m.slice(0, -2) + (m.endsWith('A}') ? 'B}' : 'A}'));
const e5 = runInGame(tampered, KEY_B64, {
  gameLine: 'game = { HttpGet = function () return KEY end }',
});
ok(!e5.ok, 'sửa bản mã trong loader → từ chối chạy', e5.err.slice(0, 80));

/* ------------------------------------------------------------ tổng --- */

console.log('\n────────────────────────────────────────────────────────');
console.log(`Kết quả end-to-end: ${pass} đạt · ${fails.length} lỗi`);
if (fails.length) {
  console.log('\nChi tiết:');
  for (const f of fails) console.log('  • ' + f);
  process.exitCode = 1;
} else {
  console.log('Gói xuất bản → tệp .lua → executor: chạy đúng, lỗi được báo rõ.');
}
