'use strict';
/**
 * doors-entity-radar/tools/bundle.js
 *
 * Gộp doors-entity-radar/src/**.luau thành MỘT tệp Luau tự chứa trong
 * bundle/doors-entity-radar.luau — dán vào một LocalScript duy nhất trong
 * Roblox Studio, không cần Rojo, không cần loadstring, không cần executor.
 *
 * Cơ chế: mỗi module được nhúng NGUYÊN VĂN (không sửa một ký tự logic nào)
 * vào bảng __DER_MODULES; hàm __DER_REQUIRE nạp lười + cache, đúng semantics
 * của require() trong Roblox.
 *
 * CÙNG một hàm renderBundle được harness kiểm thử dùng (với nguồn đã bóc
 * type Luau -> Lua 5.3), nên bản chạy test và bản bundle có cấu trúc giống hệt.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
// KHÔNG dùng 'dist/' hay 'build/': hai tên đó không được giữ lại giữa các
// phiên làm việc của workspace, tệp build sẽ biến mất trước khi người dùng kịp
// mở. 'bundle/' tồn tại bền và vẫn nằm ngoài src/ (không bị nhúng vào bundle).
const OUT_DIR = path.join(ROOT, 'bundle');
const OUT_FILE = path.join(OUT_DIR, 'doors-entity-radar.luau');
const ENTRY = 'Client/Bootstrap';

function walk(dir, base = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walk(full, rel));
    else if (entry.name.endsWith('.luau')) out.push(rel);
  }
  return out;
}

/** Nhúng an toàn vào chuỗi Luau: ưu tiên long string, fallback JSON. */
function embed(source) {
  if (source.includes(']]')) {
    return JSON.stringify(source).replace(/^\uFEFF/, '');
  }
  return `[[\n${source.replace(/\n$/, '')}\n]]`;
}

function readModules() {
  const files = walk(SRC);
  if (!files.includes(`${ENTRY}.luau`)) {
    throw new Error(`không tìm thấy src/${ENTRY}.luau (điểm khởi động của bundle)`);
  }
  const modules = new Map();
  for (const rel of files) {
    modules.set(rel.replace(/\.luau$/, ''), fs.readFileSync(path.join(SRC, rel), 'utf8'));
  }
  return { files, modules };
}

function renderBundle(moduleMap, options = {}) {
  const entry = options.entry || ENTRY;
  const autorun = options.autorun !== false;
  const keys = [...moduleMap.keys()].sort();
  if (!moduleMap.has(entry)) {
    throw new Error(`renderBundle: thiếu module khởi động '${entry}'`);
  }

  const modules = keys
    .map((key) => `\t[${JSON.stringify(key)}] = ${embed(moduleMap.get(key))},`)
    .join('\n');

  const banner = `--[[
	bundle/doors-entity-radar.luau
	TỆP SINH TỰ ĐỘNG bởi doors-entity-radar/tools/bundle.js — ĐỪNG SỬA TAY.
	Nguồn: doors-entity-radar/src/**.luau  (${keys.length} module)

	CÁCH NẠP (Roblox Studio):
	  1. StarterPlayer > StarterPlayerScripts > Insert Object > LocalScript
	  2. Dán TOÀN BỘ nội dung tệp này vào LocalScript đó
	  3. Play. Bảng điều khiển hiện ra; mặc định tự khởi động.

	KHÔNG dùng loadstring, KHÔNG dùng executor: bundle là mã Luau nằm sẵn
	trong game của bạn. Nó chỉ ĐỌC những gì client được phép đọc.
]]
`;

  const tail = autorun
    ? `\n-- Nạp điểm khởi động (LocalScript thật sẽ chạy dòng này).\nlocal __DER_BOOTSTRAP = __DER_REQUIRE(${JSON.stringify(entry)})\nreturn __DER_BOOTSTRAP\n`
    : `\n-- Chế độ kiểm thử: KHÔNG tự nạp Bootstrap; test tự gọi khi cần.\nreturn __DER_REQUIRE\n`;

  const bundle = `${banner}
local __DER_MODULES = {
${modules}
}

local __DER_CACHE = {}

local function __DER_REQUIRE(key)
	if type(key) ~= "string" then
		error("__DER_REQUIRE cần chuỗi đường dẫn, nhận " .. type(key), 2)
	end
	if __DER_CACHE[key] ~= nil and __DER_CACHE[key] ~= true then
		return __DER_CACHE[key]
	end
	if __DER_CACHE[key] == true then
		error("require vòng lặp: '" .. key .. "' đang được nạp", 2)
	end
	local source = __DER_MODULES[key]
	if source == nil then
		error("không có module '" .. key .. "' trong bundle", 2)
	end
	__DER_CACHE[key] = true
	local chunk, compileError = load(source, "DER:" .. key)
	if chunk == nil then
		__DER_CACHE[key] = nil
		error("lỗi biên dịch module '" .. key .. "': " .. tostring(compileError), 2)
	end
	local ok, result = pcall(chunk)
	if not ok then
		__DER_CACHE[key] = nil
		error("lỗi khi chạy module '" .. key .. "': " .. tostring(result), 2)
	end
	if type(result) ~= "table" then
		__DER_CACHE[key] = nil
		error("module '" .. key .. "' phải return một bảng, nhận " .. type(result), 2)
	end
	__DER_CACHE[key] = result
	return result
end

-- Cài ra _G để mọi module (và cả Bootstrap) dùng chung MỘT bộ nạp.
_G.__DER_REQUIRE = __DER_REQUIRE
${tail}`;

  return { bundle, moduleCount: keys.length };
}

function build() {
  const { files, modules } = readModules();
  const { bundle, moduleCount } = renderBundle(modules);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, bundle, 'utf8');
  const stats = fs.statSync(OUT_FILE);
  return { file: OUT_FILE, files, bytes: stats.size, moduleCount };
}

if (require.main === module) {
  const result = build();
  console.log(`Đã gộp ${result.files.length} module -> ${path.relative(ROOT, result.file)}`);
  console.log(`Kích thước: ${(result.bytes / 1024).toFixed(1)} KB`);
  for (const f of result.files) console.log(`  - src/${f}`);
}

module.exports = { build, readModules, renderBundle, SRC, OUT_FILE, ENTRY, ROOT };
