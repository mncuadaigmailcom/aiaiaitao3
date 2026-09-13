// Chạy tests/test_logic.lua trong VM Lua thật (fengari) — không cần Roblox.
// Inject: WRAPPER_SRC = đoạn code mà nút "📏 Code Tự Co Giãn" sinh ra (đã trích từ hub).
const { lauxlib, lualib, lua, to_luastring } = require("fengari");
const fs = require("fs");
const path = require("path");
const build = path.join(__dirname, ".build");

const L = lauxlib.luaL_newstate();
lualib.luaL_openlibs(L);

const wrapperFile = path.join(build, "wrapper.lua");
if (fs.existsSync(wrapperFile)) {
  const b = to_luastring(fs.readFileSync(wrapperFile, "utf8"));
  lua.lua_pushlstring(L, b, b.length);
  lua.lua_setglobal(L, to_luastring("WRAPPER_SRC"));
} else {
  console.error("thiếu .build/wrapper.lua — chạy: python3 tests/extract_blocks.py");
  process.exit(2);
}

const target = process.argv[2] || path.join(__dirname, "test_logic.lua");
if (lauxlib.luaL_dofile(L, to_luastring(target)) !== 0) {
  console.error("LUA ERROR: " + lua.lua_tojsstring(L, -1));
  process.exit(1);
}
