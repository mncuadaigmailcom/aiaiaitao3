// Chạy tests/test_embed.lua: nạp ĐÚNG khối nhúng GUI trích từ file hub (bằng load, env = _G của
// file test) rồi test trong một Roblox giả lập tự viết trong test_embed.lua.
const { lauxlib, lualib, lua, to_luastring } = require("fengari");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
try { execFileSync("python3", [path.join(__dirname, "extract_blocks.py")], { cwd: __dirname, stdio: "ignore" }); }
catch (e) { console.error("extract_blocks.py thất bại: " + e.message); process.exit(2); }
const blockFile = path.join(__dirname, ".build", "embed_block.lua");
if (!fs.existsSync(blockFile)) {
  console.error("thiếu .build/embed_block.lua — chạy: python3 tests/extract_blocks.py");
  process.exit(2);
}
const L = lauxlib.luaL_newstate();
lualib.luaL_openlibs(L);
const b = to_luastring(fs.readFileSync(blockFile, "utf8"));
lua.lua_pushlstring(L, b, b.length);
lua.lua_setglobal(L, to_luastring("EMBED_SRC"));
const target = process.argv[2] || path.join(__dirname, "test_embed.lua");
if (lauxlib.luaL_dofile(L, to_luastring(target)) !== 0) {
  console.error("LUA ERROR: " + lua.lua_tojsstring(L, -1));
  process.exit(1);
}
