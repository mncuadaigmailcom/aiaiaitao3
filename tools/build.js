'use strict';
/**
 * tools/build.js
 *
 * Gộp toàn bộ src/**\/*.luau thành MỘT tệp Luau tự chứa trong dist/,
 * dán thẳng vào MỘT LocalScript trong Roblox Studio (game bạn sở hữu).
 *
 * Cơ chế: mỗi module được nhúng nguyên văn vào một factory function tĩnh
 * trong bảng __RALO_MODULES. Bộ nạp ánh xạ đường dẫn đến factory, thực thi
 * lazy và cache kết quả — không cần load/loadstring lúc chạy trong Roblox.
 *
 * Đầu ra là Luau thật (giữ type annotation, +=, continue...). Bản chạy
 * kiểm thử trên Lua 5.3 do tools/test-harness tự bóc type khi nạp.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const OUT_DIR = path.join(ROOT, 'dist');
const OUT_FILE = path.join(OUT_DIR, 'roblox-anti-lag-optimizer.luau');

// Điểm khởi động của bundle (đường dẫn module tương đối src/)
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

/** Gói mã module thành factory tĩnh; không biên dịch chuỗi lúc chạy. */
function wrapModule(source) {
  const body = source.replace(/[ \t]+$/gm, '').replace(/\n$/, '');
  return `function()\n${body}\nend`;
}

/** Đọc toàn bộ module từ src/, trả về Map<key, source>. */
function readModules() {
  const files = walk(SRC);
  if (!files.includes(`${ENTRY}.luau`)) {
    throw new Error(`không tìm thấy src/${ENTRY}.luau (điểm khởi động)`);
  }
  const modules = new Map();
  for (const rel of files) {
    modules.set(rel.replace(/\.luau$/, ''), fs.readFileSync(path.join(SRC, rel), 'utf8'));
  }
  return { files, modules };
}

/**
 * Sinh nội dung bundle từ một Map<key, source>.
 * Harness dùng ĐÚNG hàm này với source đã transpile sang Lua 5.3,
 * nên cấu trúc bundle được kiểm thử giống hệt bản dist thật.
 */
function renderBundle(moduleMap) {
  const keys = [...moduleMap.keys()].sort();
  if (!moduleMap.has(ENTRY)) {
    throw new Error(`renderBundle: thiếu module khởi động '${ENTRY}'`);
  }
  const modules = keys
    .filter((k) => k !== ENTRY)
    .map((key) => `\t[${JSON.stringify(key)}] = ${wrapModule(moduleMap.get(key))},`)
    .join('\n');
  const initSource = moduleMap.get(ENTRY);

  const banner = `--[[
	dist/roblox-anti-lag-optimizer.luau
	TỆP SINH TỰ ĐỘNG bởi tools/build.js — ĐỪNG SỬA TAY.
	Nguồn: src/**.luau

	${keys.length} module, sinh lúc ${new Date().toISOString()}

	CÁCH NẠP (Roblox Studio, game bạn SỞ HỮU):
	  1. StarterPlayer -> StarterPlayerScripts -> Insert Object -> LocalScript
	  2. Trong Properties, đặt LocalScript đó RunContext = Legacy
	  3. Dán TOÀN BỘ nội dung tệp này vào, rồi Play

	NẠP MODULE TĨNH — không gọi load/loadstring lúc chạy:
	  * Mỗi module được đóng gói thành factory function Luau ngay trong tệp.
	  * Không dùng executor, HTTP loader hay API ngoài Roblox.
	  * Hệ thống là LocalScript: chỉ tối ưu CLIENT trong game của bạn;
	    không thể "gắn vào game của người khác".
]]
`;

  const bundle = `${banner}
local __RALO_REQUIRE
local __RALO_MODULES = {
${modules}
	[${JSON.stringify(ENTRY)}] = ${wrapModule(initSource)},
}

local __RALO_CACHE = {}
local __RALO_LOADING = {}

__RALO_REQUIRE = function(key)
	if type(key) ~= "string" then
		error("__RALO_REQUIRE cần chuỗi đường dẫn, nhận " .. type(key), 2)
	end
	local cached = __RALO_CACHE[key]
	if cached == __RALO_LOADING then
		error("phát hiện require vòng lặp tại module '" .. key .. "'", 2)
	end
	if cached ~= nil then
		return cached
	end
	local factory = __RALO_MODULES[key]
	if type(factory) ~= "function" then
		error("không có module '" .. key .. "' trong bundle", 2)
	end
	__RALO_CACHE[key] = __RALO_LOADING
	local ok, result = pcall(factory)
	if not ok then
		__RALO_CACHE[key] = nil
		error("lỗi khi chạy module '" .. key .. "': " .. tostring(result), 2)
	end
	if type(result) ~= "table" then
		__RALO_CACHE[key] = nil
		error("module '" .. key .. "' phải return một bảng, nhận " .. type(result), 2)
	end
	__RALO_CACHE[key] = result
	return result
end

-- Factory đóng trên local __RALO_REQUIRE; expose trong environment để chẩn đoán/test.
local __RALO_ENV = getfenv and getfenv(1) or _ENV
__RALO_ENV.__RALO_REQUIRE = __RALO_REQUIRE

-- Nạp điểm khởi động. Bootstrap tự chạy pipeline khi được nạp.
local __RALO_BOOTSTRAP = __RALO_REQUIRE(${JSON.stringify(ENTRY)})

-- Trả về bootstrap để người dùng gọi lại Start() với cấu hình riêng.
return __RALO_BOOTSTRAP
`;

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

module.exports = { build, readModules, renderBundle, SRC, OUT_FILE };
