'use strict';
/**
 * tools/syntax-check.js
 *
 * Kiểm tra CÚ PHÁP thật cho từng tệp Luau:
 *   1. bóc type annotation (Luau -> Lua 5.3),
 *   2. đưa qua parser Lua 5.3 của fengari bằng load().
 *
 * Nếu parser báo lỗi, in đúng số dòng + thông điệp và exit 1.
 * Cũng kiểm tra luôn tệp dist đã build.
 */

const fs = require('fs');
const path = require('path');
const fengari = require('fengari');
const { stripTypes, rewriteCompoundAssignments, wrapForInWithIpairs } = require('./luau-to-lua');

const lauxlib = fengari.lauxlib;
const lua = fengari.lua;

const ROOT = path.resolve(__dirname, '..');

function luaString(s) { return fengari.to_luastring(s); }

function parses(L, code, chunkName) {
  // LƯU Ý: fengari làm việc với mảng byte. Mã nguồn có tiếng Việt nên
  // code.length (số ký tự JS) KHÁC số byte -> phải dùng buffer.length.
  const buffer = luaString(code);
  const status = lauxlib.luaL_loadbuffer(L, buffer, buffer.length, luaString(chunkName));
  if (status === lua.LUA_OK) {
    lua.lua_pop(L, 1); // bỏ chunk đã nạp
    return { ok: true };
  }
  // fengari: lua_tojsstring(L, idx) — nhận CHỈ SỐ STACK, không phải con trỏ.
  const msg = lua.lua_tojsstring(L, -1) || `lỗi biên dịch (mã ${status})`;
  lua.lua_pop(L, 1);
  return { ok: false, error: msg };
}

function walk(dir, base = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walk(full, rel));
    else if (entry.name.endsWith('.luau') || entry.name.endsWith('.lua')) out.push(rel);
  }
  return out;
}

/**
 * Chuẩn bị mã nguồn Luau -> Lua 5.3 (chỉ đổi CÚ PHÁP, không đổi logic).
 *
 * THỨ TỰ QUAN TRỌNG: bóc type trước, rồi mới rewrite toán tử gán.
 * stripTypes thay annotation bằng khoảng trắng nên offset ký tự không đổi,
 * nhờ đó rewrite vẫn định vị đúng vế trái/phải.
 */
function transpile(src) {
  const stripped = stripTypes(src);
  const compound = rewriteCompoundAssignments(stripped.code);
  const forIn = wrapForInWithIpairs(compound.code);
  return {
    code: forIn.code,
    compoundCount: compound.count,
    annotationsRemoved: stripped.removed,
    forInWrapped: forIn.count,
  };
}

function checkFile(L, absPath, label) {
  const src = fs.readFileSync(absPath, 'utf8');
  const { code } = transpile(src);

  // `continue` là cú pháp Luau, Lua 5.3 không có -> báo rõ ràng thay vì lỗi khó hiểu.
  // Kiểm tra TRÊN MÃ ĐÃ BÓC COMMENT để không báo nhầm khi từ này chỉ xuất hiện trong chú thích.
  if (/\bcontinue\b/.test(stripCommentsForCheck(code))) {
    return { ok: false, error: "dùng 'continue' (Luau-only) — harness Lua 5.3 không chạy được" };
  }

  const result = parses(L, code, label);
  if (!result.ok && process.env.RALO_DUMP) {
    const outPath = path.join(ROOT, '.dump', label.replace(/[\\/]/g, '_') + '.lua');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, code, 'utf8');
    result.error += ` (đã ghi bản đã transpile ra ${outPath})`;
  }
  return result;
}

/** Xoá comment để kiểm tra từ khoá — dùng chính tokenizer, không dùng regex thô. */
function stripCommentsForCheck(code) {
  const { tokenize } = require('./luau-to-lua');
  return tokenize(code).filter((t) => t.type !== 'comment').map((t) => t.value).join('');
}

function main() {
  const L = lauxlib.luaL_newstate();
  let failures = 0;
  let checked = 0;

  const targets = [];
  for (const rel of walk(path.join(ROOT, 'src'))) {
    targets.push({ abs: path.join(ROOT, 'src', rel), label: `src/${rel}` });
  }
  for (const rel of walk(path.join(ROOT, 'tests'))) {
    targets.push({ abs: path.join(ROOT, 'tests', rel), label: `tests/${rel}` });
  }
  targets.push({ abs: path.join(ROOT, 'tools', 'luau-prelude.luau'), label: 'tools/luau-prelude.luau' });

  const distDir = path.join(ROOT, 'dist');
  if (fs.existsSync(distDir)) {
    for (const rel of walk(distDir)) {
      targets.push({ abs: path.join(distDir, rel), label: `dist/${rel}` });
    }
  }

  for (const target of targets) {
    if (!fs.existsSync(target.abs)) {
      console.log(`  MISSING  ${target.label}`);
      failures += 1;
      continue;
    }
    const result = checkFile(L, target.abs, target.label);
    checked += 1;
    if (result.ok) {
      console.log(`  OK       ${target.label}`);
    } else {
      console.log(`  FAIL     ${target.label}`);
      console.log(`           ${result.error}`);
      failures += 1;
    }
  }

  console.log('');
  console.log(`Đã kiểm cú pháp ${checked} tệp (parser Lua 5.3 / fengari), lỗi: ${failures}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
