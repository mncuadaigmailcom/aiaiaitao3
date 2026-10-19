'use strict';
/**
 * tools/build.js
 *
 * Gộp toàn bộ src/**\/*.luau thành MỘT tệp Luau tự chứa trong dist/,
 * dán thẳng vào MỘT LocalScript trong Roblox Studio (game bạn sở hữu).
 *
 * Cơ chế: mỗi module được nhúng nguyên văn (KHÔNG sửa một ký tự nào của
 * logic) vào bảng __RALO_MODULES, và một __require tối giản ánh xạ
 * "Core/Env" -> module tương ứng. Module được nạp lười (lazy) và cache,
 * giống hệt semantics của require() trong Roblox.
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

// Điểm khởi động của từng bundle (đường dẫn module tương đối src/)
const ENTRY = 'Client/Bootstrap';
const DOORS_LOCATOR_ENTRY = 'Client/Debug/DoorsLocatorBundle';
const DOORS_LOCATOR_OUT_FILE = path.join(OUT_DIR, 'roblox-doors-dev-locator.luau');

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

/** Escape để nhúng an toàn vào chuỗi Luau [[...]] */
function embed(source) {
  // Nếu mã nguồn chứa ]] thì không dùng long string được -> fallback escape.
  if (source.includes(']]')) {
    return JSON.stringify(source).replace(/^\uFEFF/, '');
  }
  return `[[\n${source.replace(/\n$/, '')}\n]]`;
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
function renderBundle(moduleMap, options = {}) {
  const entry = options.entry || ENTRY;
  const outputFile = options.outputFile || OUT_FILE;
  const productName = options.productName || (entry === DOORS_LOCATOR_ENTRY
    ? 'Roblox DOORS Dev Locator (Studio-only)'
    : 'Roblox Anti-Lag Optimizer');
  const keys = [...moduleMap.keys()].sort();
  if (!moduleMap.has(entry)) {
    throw new Error(`renderBundle: thiếu module khởi động '${entry}'`);
  }
  const modules = keys
    .filter((k) => k !== entry)
    .map((key) => `\t[${JSON.stringify(key)}] = ${embed(moduleMap.get(key))},`)
    .join('\n');
  const initSource = moduleMap.get(entry);

  const outputName = path.basename(outputFile);
  const locatorNotes = entry === DOORS_LOCATOR_ENTRY
    ? `\tCông cụ QA chạy DUY NHẤT trong Roblox Studio và chỉ với tag do bạn tự gắn.\n\tNó không quét game của người khác; không dùng executor/loadstring.`
    : `\tLocalScript chỉ ảnh hưởng client trong game do bạn sở hữu.\n\tKhông dùng executor, loadstring, setrbxsetting hay can thiệp anti-cheat.`;

  const banner = `--[[
\tdist/${outputName}
\t${productName} — bundle sinh tự động bởi tools/build.js; đừng sửa tay.
\tNguồn: src/**.luau

\t${keys.length} module, sinh lúc ${new Date().toISOString()}

\tCÁCH NẠP (Roblox Studio, trải nghiệm bạn sở hữu):
\t  1. StarterPlayer -> StarterPlayerScripts -> Insert Object -> LocalScript
\t  2. Trong Properties, đặt RunContext = Legacy
\t  3. Dán TOÀN BỘ tệp này vào LocalScript rồi bấm Play

${locatorNotes}
]]
`;

  const bundle = `${banner}
local __RALO_MODULES = {
${modules}
	[${JSON.stringify(entry)}] = ${embed(initSource)},
}

local __RALO_CACHE = {}

local function __RALO_REQUIRE(key)
	if type(key) ~= "string" then
		error("__RALO_REQUIRE cần chuỗi đường dẫn, nhận " .. type(key), 2)
	end
	if __RALO_CACHE[key] ~= nil then
		return __RALO_CACHE[key]
	end
	local source = __RALO_MODULES[key]
	if source == nil then
		error("không có module '" .. key .. "' trong bundle", 2)
	end
	-- Đánh dấu đang nạp để phát hiện require vòng lặp
	__RALO_CACHE[key] = true
	local chunk, compileError = load(source, "RALO:" .. key)
	if chunk == nil then
		__RALO_CACHE[key] = nil
		error("lỗi biên dịch module '" .. key .. "': " .. tostring(compileError), 2)
	end
	local ok, result = pcall(chunk)
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

-- Cài __RALO_REQUIRE vào environment của chunk này (không làm bẩn _G của game).
local __RALO_ENV = getfenv and getfenv(1) or _ENV
__RALO_ENV.__RALO_REQUIRE = __RALO_REQUIRE

-- Nạp điểm khởi động của bundle (tối ưu hoá hoặc công cụ QA).
local __RALO_BOOTSTRAP = __RALO_REQUIRE(${JSON.stringify(entry)})

-- Trả về module điểm khởi động để có thể chẩn đoán khi cần.
return __RALO_BOOTSTRAP
`;

  return { bundle, moduleCount: keys.length };
}

function build(options = {}) {
  const { files, modules } = readModules();
  const entry = options.entry || ENTRY;
  const outputFile = options.outputFile || OUT_FILE;
  const { bundle, moduleCount } = renderBundle(modules, {
    ...options,
    entry,
    outputFile,
  });

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, bundle, 'utf8');

  const stats = fs.statSync(outputFile);
  return { file: outputFile, files, bytes: stats.size, moduleCount };
}

if (require.main === module) {
  const doorsLocator = process.argv.includes('--doors-locator');
  const options = doorsLocator
    ? {
      entry: DOORS_LOCATOR_ENTRY,
      outputFile: DOORS_LOCATOR_OUT_FILE,
      productName: 'Roblox DOORS Dev Locator (Studio-only)',
    }
    : {};
  const result = build(options);
  console.log(`Đã gộp ${result.files.length} module -> ${path.relative(ROOT, result.file)}`);
  console.log(`Module khởi động: ${options.entry || ENTRY}`);
  console.log(`Kích thước: ${(result.bytes / 1024).toFixed(1)} KB`);
  for (const f of result.files) console.log(`  - src/${f}`);
}

module.exports = { build, readModules, renderBundle, SRC, OUT_FILE, DOORS_LOCATOR_ENTRY, DOORS_LOCATOR_OUT_FILE };
