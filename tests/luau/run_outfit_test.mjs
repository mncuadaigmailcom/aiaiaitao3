// Chạy test runtime khối "👕 TRANG PHỤC NGƯỜI CHƠI" với mock Roblox
// dùng: python3 tests/luau/gen_outfit_driver.py && node tests/luau/run_outfit_test.mjs
import { Lua } from '@luau-rs/luau';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] || path.join(HERE, '_driver_generated.luau');
const out = [];
const lua = await Lua.create({ sandbox: false });
lua.globals.set('print', lua.createFunction((...a) => out.push(a.map(x => typeof x === 'string' ? x : String(x)).join(' '))));
let err = null;
try { lua.execute(fs.readFileSync(file, 'utf8')); } catch (e) { err = e; }
console.log(out.join('\n'));
console.log(err ? ('\n❌ LỖI: ' + err.message) : '\n✅ Chạy hết script test, không có lỗi runtime');
process.exit(err ? 1 : 0);
