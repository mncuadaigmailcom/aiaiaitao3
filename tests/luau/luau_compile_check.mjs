// Biên dịch file Luau bằng compiler THẬT (@luau-rs/luau, WASM, Luau v739)
// dùng:  node tests/luau/luau_compile_check.mjs [file.luau ...]
//        (cần: npm i @luau-rs/luau  — xem tests/luau/README.md)
import { Lua } from '@luau-rs/luau';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['script.js', 'script.js1.js'].map(f => path.join(ROOT, f));

const lua = await Lua.create({ sandbox: true });
let bad = 0;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '');
  for (const opt of [0, 1, 2]) {
    let msg = '✅ ok';
    try { lua.compile(src, { optimizationLevel: opt }); } catch (e) { msg = '❌ ' + e.message; bad++; }
    console.log(`${path.basename(f)} opt=${opt}: ${msg}`);
  }
}
process.exit(bad ? 1 : 0);
