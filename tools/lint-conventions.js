#!/usr/bin/env node
'use strict';
/**
 * tools/lint-conventions.js
 *
 * Kiểm tra TĨNH các quy ước dễ sai trong mã Luau của dự án.
 * Mỗi luật ở đây đều xuất phát từ một LỖI THẬT đã xảy ra — không có luật
 * nào được thêm chỉ để "cho có".
 *
 * LUẬT 1 — Đảo thứ tự giá trị trả về của pcall / Guard.Run / Safe.Call.
 *   pcall trả (ok, result); Guard.Run trả (ok, result); Safe.Call trả (ok, value).
 *   Viết `local value, ok = pcall(...)` khiến `value` nhận `true` và
 *   `ok` nhận giá trị thật. Lỗi này ĐÃ làm toàn bộ Safety.ProtectedClasses
 *   bị bỏ qua (Camera/Tool/Script/RemoteEvent/Player đều lọt qua chốt an toàn).
 *
 * LUẬT 2 — `x or nil` làm mất giá trị `false`.
 *   `profile[k] or nil` biến `enabled = false` thành `nil`, khiến công tắc
 *   tắt tổng rơi về mặc định `true`.
 *
 * LUẬT 3 — Luau `continue` không chạy được trên Lua 5.3 của harness.
 *
 * LUẬT 4 — API executor không được xuất hiện trong mã thật (chỉ trong chú thích).
 *
 * Chạy: node tools/lint-conventions.js   (exit 1 nếu có vi phạm)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

/*
 * HAI NHÓM HÀM CÓ THỨ TỰ TRẢ VỀ NGƯỢC NHAU — đây chính là cái bẫy.
 *
 *   (ok, result):  pcall, Guard.Run, Safe.Call
 *   (value, ok):   Safe.Get
 *
 * Lint phải phân biệt, nếu không sẽ báo sai một nửa số dòng và người đọc
 * sẽ bỏ qua cả những cảnh báo thật. Safe.Get ĐÃ được kiểm bằng cách đọc
 * mã nguồn: `return value, true`.
 */
const OK_FIRST_CALLEES = ['pcall', 'Guard.Run', 'Client_Guard.Run', 'Safe.Call',
  'Shared_Safe.Call', 'Util_Safe.Call'];
const VALUE_FIRST_CALLEES = ['Safe.Get', 'Shared_Safe.Get', 'Util_Safe.Get'];

const EXECUTOR_APIS = ['setrbxsetting', 'getgenv', 'identifyexecutor', 'hookfunction',
  'hookmetamethod', 'getrawmetatable', 'setreadonly', 'checkcaller', 'getconnections',
  'firetouchinterest', 'syn.request', 'http_request'];

function listLuauFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listLuauFiles(full));
    else if (full.endsWith('.luau')) out.push(full);
  }
  return out.sort();
}

/*
 * Bỏ chú thích, kể cả chú thích KHỐI --[[ ... ]] nhiều dòng.
 * Trả về hàm vì cần giữ trạng thái "đang trong khối chú thích" giữa các dòng.
 * Nếu chỉ cắt `--` một dòng, linter sẽ báo nhầm mọi tên API được NHẮC TỚI
 * trong phần giải thích (đó là dương tính giả đã gặp).
 */
function makeCommentStripper() {
  let inBlock = false;
  return function strip(line) {
    let out = '';
    let i = 0;
    while (i < line.length) {
      if (inBlock) {
        const end = line.indexOf(']]', i);
        if (end === -1) return out;
        inBlock = false;
        i = end + 2;
        continue;
      }
      if (line.startsWith('--[[', i) || line.startsWith('--[=[', i)) {
        inBlock = true;
        i += line.startsWith('--[[', i) ? 4 : 5;
        continue;
      }
      if (line.startsWith('--', i)) return out;      // chú thích một dòng
      out += line[i];
      i += 1;
    }
    return out;
  };
}

function lint() {
  const violations = [];
  const files = listLuauFiles(SRC);

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    const strip = makeCommentStripper();

    lines.forEach((rawLine, i) => {
      const line = strip(rawLine);
      const no = i + 1;

      // ---- LUẬT 1: đảo thứ tự (ok, result)
      for (const callee of OK_FIRST_CALLEES) {
        const escaped = callee.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // local <không phải ok...>, <ok...> = callee(
        const re = new RegExp(
          `local\\s+([A-Za-z_][A-Za-z0-9_]*)\\s*,\\s*(ok[A-Za-z0-9_]*)\\s*=\\s*${escaped}\\s*\\(`,
        );
        const m = line.match(re);
        if (m && !/^ok/i.test(m[1])) {
          violations.push({
            file: rel, line: no, rule: 'LUẬT 1',
            message: `đảo thứ tự giá trị trả về của ${callee}(): phải viết `
              + `local ${m[2]}, ${m[1]} = ${callee}(...)`,
            source: rawLine.trim(),
          });
        }
      }

      // ---- LUẬT 1b: Safe.Get trả (value, ok) — viết ngược lại cũng là lỗi
      for (const callee of VALUE_FIRST_CALLEES) {
        const escaped = callee.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(
          `local\\s+(ok[A-Za-z0-9_]*)\\s*,\\s*([A-Za-z_][A-Za-z0-9_]*)\\s*=\\s*${escaped}\\s*\\(`,
        );
        const m = line.match(re);
        if (m) {
          violations.push({
            file: rel, line: no, rule: 'LUẬT 1b',
            message: `${callee}() trả về (value, ok) chứ không phải (ok, value); `
              + `phải viết local ${m[2]}, ${m[1]} = ${callee}(...)`,
            source: rawLine.trim(),
          });
        }
      }

      // ---- LUẬT 2: đọc khoá bảng rồi `or nil` sẽ nuốt giá trị false.
      // Chỉ bắt đúng dạng nguy hiểm: <ident>[...] or nil  /  <ident>.<field> or nil
      // Dạng `cond and <giá trị tính toán> or nil` (ví dụ fps, verdict) không
      // nguy hiểm vì giá trị đó không bao giờ là false — bắt nó sẽ thành
      // dương tính giả khiến người đọc bỏ qua cảnh báo thật.
      if (/[A-Za-z_)\]]\s*(\[[^\]]*\]|\.[A-Za-z_][A-Za-z0-9_]*)\s+or\s+nil\b/.test(line)) {
        violations.push({
          file: rel, line: no, rule: 'LUẬT 2',
          message: '`X or nil` biến giá trị false thành nil; hãy đọc khoá trực tiếp',
          source: rawLine.trim(),
        });
      }

      // ---- LUẬT 3: continue của Luau
      if (/(^|[\s;])continue([\s;]|$)/.test(line)) {
        violations.push({
          file: rel, line: no, rule: 'LUẬT 3',
          message: 'Luau `continue` không chạy được trên Lua 5.3 của harness',
          source: rawLine.trim(),
        });
      }

      // ---- LUẬT 4: API executor trong mã thật
      for (const api of EXECUTOR_APIS) {
        const re = new RegExp(`\\b${api.replace('.', '\\.')}\\b`);
        if (re.test(line)) {
          violations.push({
            file: rel, line: no, rule: 'LUẬT 4',
            message: `API executor '${api}' không được dùng trong mã thật`,
            source: rawLine.trim(),
          });
        }
      }
    });
  }

  console.log(`=== Lint quy ước mã nguồn (${files.length} tệp .luau) ===`);
  if (violations.length === 0) {
    console.log('✓ Không có vi phạm.');
    return 0;
  }
  console.log(`✗ ${violations.length} vi phạm:\n`);
  for (const v of violations) {
    console.log(`  ${v.rule}  ${v.file}:${v.line}`);
    console.log(`      ${v.message}`);
    console.log(`      > ${v.source.slice(0, 100)}`);
  }
  return 1;
}

if (require.main === module) process.exit(lint());
module.exports = { lint };
