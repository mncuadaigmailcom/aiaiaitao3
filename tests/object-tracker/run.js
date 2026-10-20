'use strict';
// Isolated suite: loads the exact standalone core and full deliverable in Lua 5.3.
const fs = require('fs');
const path = require('path');
const fengari = require('fengari');
const { lua, lauxlib, lualib, to_luastring } = fengari;
const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'standalone/object-tracker.luau'), 'utf8');
const core = source.slice(source.indexOf('local function createTracker(deps)'), source.indexOf('-- END TRACKER CORE'));
const L = lauxlib.luaL_newstate();
lualib.luaL_openlibs(L);
function run(code, name) {
  const bytes = to_luastring(code);
  let status = lauxlib.luaL_loadbuffer(L, bytes, bytes.length, to_luastring(name));
  if (status === lua.LUA_OK) status = lua.lua_pcall(L, 0, 0, 0);
  if (status !== lua.LUA_OK) {
    console.error(lua.lua_tojsstring(L, -1));
    process.exit(1);
  }
}
// Compile the full file, not just its extracted core. Never execute untrusted remote code.
const bytes = to_luastring(source);
if (lauxlib.luaL_loadbuffer(L, bytes, bytes.length, to_luastring('object-tracker.luau')) !== lua.LUA_OK) {
  console.error(lua.lua_tojsstring(L, -1)); process.exit(1);
}
lua.lua_pop(L, 1);
console.log('PASS full standalone syntax (Lua 5.3 subset)');
run(fs.readFileSync(path.join(__dirname, 'mock.lua'), 'utf8'), 'Roblox mock');
run(core + '\n' + fs.readFileSync(path.join(__dirname, 'core-tests.lua'), 'utf8'), 'core tests');
run(source, 'full standalone boot');
run(fs.readFileSync(path.join(__dirname, 'ui-tests.lua'), 'utf8'), 'UI integration');
// Re-run while active: verify the BindableEvent teardown of the previous instance.
run(source, 'standalone reload');
run('testReloaded()', 'reload assertions');
run(source, 'standalone after destruction');
run('testExternalDestroy()', 'external destruction assertions');
console.log('All standalone checks passed. Mock tests are NOT Roblox Studio validation.');
