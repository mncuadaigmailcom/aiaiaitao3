#!/usr/bin/env node
'use strict';
/**
 * doors-entity-radar/tools/lint-conventions.js
 *
 * Kiểm tra TĨNH các quy ước của dự án. Mỗi LUẬT đều gắn với một rủi ro thật
 * của chính dự án này — không có luật nào thêm vào "cho đủ bộ".
 *
 * LUẬT 1 — CẤM API executor/cheat. Dự án chỉ được chạy trong game bạn sở hữu.
 * LUẬT 2 — CẤM math.random trong src: radar không được BỊA kết quả phát hiện,
 *          khoảng cách hay hướng. Muốn có số thì phải đọc từ instance thật.
 * LUẬT 3 — CẤM service đổi đồ hoạ/âm thanh/vật lý (Lighting, SoundService,
 *          PhysicsService, StarterGui.ResetPlayerGui...): cam kết "không can
 *          thiệp trò chơi" phải kiểm được bằng máy, không chỉ bằng lời.
 * LUẬT 4 — `Instance.new(` chỉ được xuất hiện ở tầng giao diện (và ở
 *          Server/Diagnostics khi tạo Folder cầu dữ liệu). Module dữ liệu mà
 *          tự tạo instance thì Registry không đếm được -> rò rỉ tài nguyên.
 * LUẬT 5 — CẤM `wait(` / `spawn(` / `delay(` kiểu cũ: phải qua Scheduler để
 *          còn Pause/Stop/dọn dẹp được.
 * LUẬT 6 — Thứ tự trả về của pcall là (ok, result). Viết `local value, ok =
 *          pcall(...)` làm value luôn là true — lỗi này đã từng xảy ra ở repo.
 * LUẬT 7 — Cú pháp Luau mà harness Lua 5.3 không chạy được (continue, ::,
 *          math.atan2, typeof, table.move, string.split): báo sớm ở đây.
 * LUẬT 8 — Mỗi module phải có header nêu đường dẫn tệp và `return` một bảng,
 *          vì bundle __DER_REQUIRE ép điều đó lúc chạy.
 * LUẬT 9 — Không có ký tự Hán/Nhật/Hàn trong src (dự án tiếng Việt; ký tự lạc
 *          là dấu hiệu copy-paste từ nguồn khác).
 *
 * Chạy: npm run lint   (exit 1 nếu có vi phạm)
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const { tokenize } = require(path.join(REPO_ROOT, 'tools', 'luau-to-lua'));

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

const EXECUTOR_APIS = [
  'setrbxsetting', 'getgenv', 'getrenv', 'identifyexecutor', 'hookfunction', 'hookmetamethod',
  'getrawmetatable', 'setreadonly', 'checkcaller', 'getconnections', 'firetouchinterest',
  'fireclickdetector', 'syn.request', 'http_request', 'loadstring', 'setclipboard',
];

const FORBIDDEN_SERVICES = ['Lighting', 'SoundService', 'PhysicsService', 'StarterGui'];

// Nơi ĐƯỢC PHÉP tạo instance (và lý do).
const INSTANCE_NEW_ALLOWED = ['Client/Ui/Widgets.luau', 'Server/Diagnostics.luau'];

// Tệp là SCRIPT chạy ngay (không phải ModuleScript) nên KHÔNG `return` bảng.
// Nó không được __DER_REQUIRE nạp: người dùng dán riêng vào một Script.
const STANDALONE_SCRIPTS = ['Server/Diagnostics.luau'];

const LUAU_ONLY = [
  { re: /\bcontinue\b/, why: "'continue' — Lua 5.3 của harness không có" },
  { re: /\bmath\.atan2\b/, why: 'math.atan2 — Luau-only, dùng math.atan(y, x)' },
  { re: /\btypeof\s*\(/, why: 'typeof() — Luau-only, dùng type()' },
  { re: /\btable\.move\b/, why: 'table.move — Lua 5.3 không có' },
  { re: /\bstring\.split\b/, why: 'string.split — Luau-only' },
  { re: /\bmath\.clamp\b/, why: 'math.clamp — Luau-only, dùng math.max(a, math.min(b, x))' },
  { re: /\btable\.find\b/, why: 'table.find — Luau-only' },
  { re: /\btable\.create\b/, why: 'table.create — Luau-only' },
];

const CJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/;

function listFiles(dir, base = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listFiles(full, rel));
    else if (entry.name.endsWith('.luau')) out.push(rel);
  }
  return out;
}

/** Trả về mã KHÔNG comment (dùng tokenizer thật, không dùng regex thô). */
function codeOnly(src) {
  return tokenize(src).filter((t) => t.type !== 'comment').map((t) => t.value).join('');
}

/** Số dòng của một chỉ số ký tự (để thông báo trỏ đúng chỗ). */
function lineOf(src, index) {
  return src.slice(0, index).split('\n').length;
}

function findFirst(code, src, re) {
  const m = re.exec(code);
  return m === null ? null : lineOf(src, m.index);
}

function check(rel, src) {
  const problems = [];
  const code = codeOnly(src);

  for (const api of EXECUTOR_APIS) {
    const re = new RegExp(`\\b${api.replace('.', '\\.')}\\s*\\(`, 'i');
    const line = findFirst(code, src, re);
    if (line !== null) problems.push(`dòng ${line}: API executor '${api}' không được dùng`);
  }

  {
    const line = findFirst(code, src, /\bmath\.random\b/);
    if (line !== null) problems.push(`dòng ${line}: math.random — radar không được bịa số liệu`);
  }

  for (const service of FORBIDDEN_SERVICES) {
    const re = new RegExp(`GetService\\s*\\(\\s*["']${service}["']`);
    const line = findFirst(code, src, re);
    if (line !== null) problems.push(`dòng ${line}: đụng tới ${service} — dự án cam kết không đổi trò chơi`);
  }

  if (!INSTANCE_NEW_ALLOWED.includes(rel)) {
    const line = findFirst(code, src, /\bInstance\.new\s*\(/);
    if (line !== null) problems.push(`dòng ${line}: Instance.new ngoài tầng UI — Registry sẽ không đếm được`);
  }

  {
    const line = findFirst(code, src, /(^|[^.\w])(wait|spawn|delay)\s*\(/);
    if (line !== null) problems.push(`dòng ${line}: wait/spawn/delay kiểu cũ — phải đi qua Scheduler`);
  }

  {
    const line = findFirst(code, src, /\blocal\s+[\w_]+\s*,\s*ok\s*=\s*(pcall|xpcall)\s*\(/);
    if (line !== null) problems.push(`dòng ${line}: pcall trả (ok, result) — thứ tự biến đang ngược`);
  }

  for (const rule of LUAU_ONLY) {
    const line = findFirst(code, src, rule.re);
    if (line !== null) problems.push(`dòng ${line}: ${rule.why}`);
  }

  if (CJK.test(src)) {
    const m = CJK.exec(src);
    problems.push(`dòng ${lineOf(src, m.index)}: có ký tự Hán/Nhật/Hàn trong mã nguồn tiếng Việt`);
  }

  // Header phải nêu đường dẫn tệp: bundle sinh ra từ nhiều tệp, thiếu header
  // thì không ai biết đoạn mã đang đọc thuộc tệp nào.
  const headerPath = rel.replace(/\\/g, '/');
  if (!src.includes(headerPath)) {
    problems.push('header thiếu đường dẫn tệp (phải có "src/.../*.luau" hoặc đường dẫn tương đương)');
  }
  if (!STANDALONE_SCRIPTS.includes(rel) && !/\nreturn\s+[\w_]+\s*$/.test(src.replace(/\s+$/, '\n'))) {
    problems.push('cuối tệp phải `return <Bảng>` (bundle bắt buộc module trả về bảng)');
  }

  return problems;
}

function main() {
  const files = listFiles(SRC);
  let failures = 0;
  for (const rel of files) {
    const src = fs.readFileSync(path.join(SRC, rel), 'utf8');
    const problems = check(rel, src);
    if (problems.length === 0) {
      console.log(`  OK    src/${rel}`);
      continue;
    }
    failures += problems.length;
    console.log(`  LỖI   src/${rel}`);
    for (const p of problems) console.log(`          - ${p}`);
  }
  console.log(`\nĐã lint ${files.length} tệp — ${failures === 0 ? 'không có vi phạm quy ước.' : `${failures} vi phạm.`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
