#!/usr/bin/env node
'use strict';
/**
 * doors-entity-radar/tools/check-syntax.js
 *
 * Kiểm tra CÚ PHÁP THẬT cho từng tệp Luau của dự án (không phải "đọc bằng mắt"):
 *   1. bóc type annotation + viết lại cú pháp Luau-only  (Luau -> Lua 5.3),
 *   2. đưa qua parser Lua 5.3 của fengari bằng luaL_loadbuffer,
 *   3. làm y hệt với tệp dist đã build (nếu có) — vì đó là thứ người dùng dán
 *      vào Studio, nếu nó hỏng thì mã src đẹp cũng vô nghĩa.
 *
 * TÁI DÙNG hạ tầng của repo: tools/luau-to-lua.js (cùng bộ mà harness kiểm thử
 * đang dùng) — nhờ vậy "chạy được trong test" và "parse được ở đây" là MỘT
 * định nghĩa, không phải hai.
 *
 * Chạy: npm run syntax      (exit 1 nếu có tệp không parse được)
 */

const fs = require('fs');
const path = require('path');
const fengari = require('fengari');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const { stripTypes, rewriteCompoundAssignments, wrapForInWithIpairs, tokenize } =
  require(path.join(REPO_ROOT, 'tools', 'luau-to-lua'));

const lauxlib = fengari.lauxlib;
const lua = fengari.lua;

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'bundle', 'doors-entity-radar.luau');

function luaString(s) {
  return fengari.to_luastring(s);
}

/** Luau -> Lua 5.3, chỉ đổi CÚ PHÁP. Thứ tự bắt buộc: bóc type trước. */
function transpile(src) {
  const stripped = stripTypes(src);
  const compound = rewriteCompoundAssignments(stripped.code);
  const forIn = wrapForInWithIpairs(compound.code);
  return forIn.code;
}

/** Xoá comment bằng tokenizer thật để không báo nhầm từ khoá trong chú thích. */
function stripComments(code) {
  return tokenize(code).filter((t) => t.type !== 'comment').map((t) => t.value).join('');
}

function parses(L, code, chunkName) {
  // fengari làm việc theo BYTE. Mã nguồn có tiếng Việt nên code.length (ký tự JS)
  // KHÁC số byte -> bắt buộc dùng buffer.length.
  const buffer = luaString(code);
  const status = lauxlib.luaL_loadbuffer(L, buffer, buffer.length, luaString(chunkName));
  if (status === lua.LUA_OK) {
    lua.lua_pop(L, 1);
    return { ok: true };
  }
  const msg = lua.lua_tojsstring(L, -1) || `lỗi biên dịch (mã ${status})`;
  lua.lua_pop(L, 1);
  return { ok: false, error: msg };
}

function walk(dir, base = '') {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walk(full, rel));
    else if (entry.name.endsWith('.luau')) out.push(rel);
  }
  return out;
}

function main() {
  const L = lauxlib.luaL_newstate();
  const targets = [];

  for (const rel of walk(SRC)) {
    targets.push({ abs: path.join(SRC, rel), label: `src/${rel}`, isLuau: true });
  }
  targets.push({ abs: path.join(ROOT, 'tools', 'mock-extensions.luau'), label: 'tools/mock-extensions.luau', isLuau: true });
  if (fs.existsSync(DIST)) {
    targets.push({ abs: DIST, label: 'bundle/doors-entity-radar.luau', isLuau: false });
  } else {
    console.log('  LƯU Ý  chưa có bundle/ — chạy `npm run build` trước khi phát hành.');
  }

  let failures = 0;
  for (const target of targets) {
    const src = fs.readFileSync(target.abs, 'utf8');
    const code = transpile(src);

    // `continue` là cú pháp Luau; Lua 5.3 của harness không có. Báo thẳng ở đây
    // thay vì để harness nổ một lỗi khó hiểu lúc chạy test.
    if (/\bcontinue\b/.test(stripComments(code))) {
      console.log(`  LỖI    ${target.label}: dùng 'continue' (Luau-only)`);
      failures += 1;
      continue;
    }

    if (target.isLuau === false) {
      // dist là Luau thật (giữ type) nhưng phần thân module đã bóc type khi test;
      // ở đây chỉ cần chắc chắn tệp NHÚNG được và __DER_REQUIRE parse được.
      const result = parses(L, code, target.label);
      console.log(`  ${result.ok ? 'OK    ' : 'LỖI   '} ${target.label}${result.ok ? '' : ` — ${result.error}`}`);
      if (!result.ok) failures += 1;
      continue;
    }

    const result = parses(L, code, target.label);
    console.log(`  ${result.ok ? 'OK    ' : 'LỖI   '} ${target.label}${result.ok ? '' : ` — ${result.error}`}`);
    if (!result.ok) failures += 1;
  }

  console.log(`\nĐã kiểm ${targets.length} tệp — ${failures === 0 ? 'không có lỗi cú pháp.' : `${failures} tệp LỖI.`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
