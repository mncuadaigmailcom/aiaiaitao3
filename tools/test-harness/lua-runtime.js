'use strict';
/**
 * tools/test-harness/lua-runtime.js
 *
 * Cầu nối Node <-> Lua 5.3 (fengari) để CHẠY THẬT mã nguồn src/**.luau.
 *
 *   - nạp polyfill (tools/luau-prelude.luau)
 *   - nạp mock Roblox API (roblox-mock.luau)
 *   - dựng thế giới mẫu + đồng hồ ảo + bộ lập lịch ảo
 *   - nạp dist bundle (đã transpile Luau -> Lua 5.3: chỉ bóc type và
 *     khai triển +=/-=/..=, KHÔNG đổi logic)
 *
 * Đồng hồ ẢO là bắt buộc: test "tự ẩn sau 30 giây" không thể chờ 30 giây thật.
 */

const fs = require('fs');
const path = require('path');
const fengari = require('fengari');
const { stripTypes, rewriteCompoundAssignments, wrapForInWithIpairs } = require('../luau-to-lua');

const lauxlib = fengari.lauxlib;
const lua = fengari.lua;
const lualib = fengari.lualib;

const ROOT = path.resolve(__dirname, '..', '..');

function toLuaString(s) { return fengari.to_luastring(s); }

/**
 * Luau -> Lua 5.3. CHỈ dùng cho harness; bản dist gửi Roblox giữ Luau gốc.
 * Ba phép biến đổi, đều tương đương ngữ nghĩa:
 *   1. bóc type annotation
 *   2. khai triển +=, -=, ..= ...
 *   3. bọc ipairs() cho  for k,v in <bảng> do  (cú pháp Luau)
 */
function transpile(source) {
  const stripped = stripTypes(source);
  const compound = rewriteCompoundAssignments(stripped.code);
  return wrapForInWithIpairs(compound.code).code;
}

function readValue(L, index) {
  const type = lua.lua_type(L, index);
  switch (type) {
    case lua.LUA_TNIL: return null;
    case lua.LUA_TBOOLEAN: return lua.lua_toboolean(L, index);
    case lua.LUA_TNUMBER: return lua.lua_tonumber(L, index);
    case lua.LUA_TSTRING: return lua.lua_tojsstring(L, index);
    case lua.LUA_TTABLE: return readTable(L, index);
    case lua.LUA_TFUNCTION: return '[function]';
    default: return `[${lua.lua_typename(L, type)}]`;
  }
}

function readTable(L, index) {
  const out = {};
  const absIndex = index < 0 ? lua.lua_gettop(L) + index + 1 : index;
  lua.lua_pushnil(L);
  while (lua.lua_next(L, absIndex) !== 0) {
    const key = readValue(L, -2);
    out[String(key)] = readValue(L, -1);
    lua.lua_pop(L, 1);
  }
  return out;
}

class LuaRuntime {
  constructor() {
    this.L = lauxlib.luaL_newstate();
    lualib.luaL_openlibs(this.L);
    this.logs = [];
    this.clock = 1000.0;        // đồng hồ ảo, giây
    this.scheduled = [];        // { id, at, cancelled }
    this.nextId = 1;
    this.pumping = false;
    this.lastFrameSeconds = 1 / 60;
    this.frameTimeMs = 16.7;
    this.frameCount = 0;
    this.baseFrameMs = 8.0;
    this.costScale = 0.6;
    this.fps = 60;
    this._installOutput();
  }

  _installOutput() {
    const self = this;
    const printer = (state) => {
      const n = lua.lua_gettop(state);
      const parts = [];
      for (let i = 1; i <= n; i += 1) parts.push(String(readValue(state, i)));
      self.logs.push(parts.join('\t'));
      return 0;
    };
    lua.lua_pushjsfunction(this.L, printer);
    lua.lua_setglobal(this.L, toLuaString('print'));
    lua.lua_pushjsfunction(this.L, printer);
    lua.lua_setglobal(this.L, toLuaString('warn'));
  }

  _pushArg(value) {
    if (typeof value === 'number') lua.lua_pushnumber(this.L, value);
    else if (typeof value === 'boolean') lua.lua_pushboolean(this.L, value);
    else if (value === null || value === undefined) lua.lua_pushnil(this.L);
    else lua.lua_pushstring(this.L, toLuaString(String(value)));
  }

  /** Nạp + chạy chunk, trả về mảng giá trị nó return. */
  run(code, name = 'chunk') {
    const L = this.L;
    // Ghi nhớ độ cao stack: `run` có thể được gọi từ một JS function đang
    // chạy BÊN TRONG Lua (ví dụ task.wait -> __RALO_ADVANCE -> run).
    // Nếu dọn stack về 0 ở đó thì frame của Lua caller bị xoá và chương
    // trình chết với lỗi khó hiểu. (Đây là lỗi đã gặp và đã sửa.)
    const base = lua.lua_gettop(L);
    const buffer = toLuaString(code);
    if (lauxlib.luaL_loadbuffer(L, buffer, buffer.length, toLuaString(name)) !== lua.LUA_OK) {
      const msg = lua.lua_tojsstring(L, -1);
      lua.lua_pop(L, 1);
      throw new Error(`${name}: ${msg}`);
    }
    if (lua.lua_pcall(L, 0, lua.LUA_MULTRET, 0) !== lua.LUA_OK) {
      const msg = lua.lua_tojsstring(L, -1);
      lua.lua_pop(L, 1);
      throw new Error(`${name}: ${msg}`);
    }
    const top = lua.lua_gettop(L);
    const out = [];
    for (let i = base + 1; i <= top; i += 1) out.push(readValue(L, i));
    // Dọn ĐÚNG phần mình vừa đẩy lên, không đụng frame của caller.
    lua.lua_settop(L, base);
    return out;
  }

  /** Nạp tệp và lưu giá trị nó return vào một biến toàn cục. */
  runFileAsGlobal(absPath, globalName, { shouldTranspile = false } = {}) {
    let code = fs.readFileSync(absPath, 'utf8');
    if (shouldTranspile) code = transpile(code);
    // Nạp chunk rồi setglobal trực tiếp giá trị nó return (không dùng `run`
    // vì hàm đó pop stack trước khi ta kịp lấy giá trị).
    const L = this.L;
    const buffer = toLuaString(code);
    if (lauxlib.luaL_loadbuffer(L, buffer, buffer.length, toLuaString(globalName)) !== lua.LUA_OK) {
      throw new Error(`${globalName}: ${lua.lua_tojsstring(L, -1)}`);
    }
    if (lua.lua_pcall(L, 0, 1, 0) !== lua.LUA_OK) {
      throw new Error(`${globalName}: ${lua.lua_tojsstring(L, -1)}`);
    }
    if (lua.lua_gettop(L) !== 1) {
      // chunk không return đúng 1 giá trị -> không được setglobal bừa
      lua.lua_settop(L, 0);
      throw new Error(`${globalName}: chunk phải return đúng 1 giá trị`);
    }
    lua.lua_setglobal(L, toLuaString(globalName));
  }

  runFile(absPath, { shouldTranspile = false } = {}) {
    let code = fs.readFileSync(absPath, 'utf8');
    if (shouldTranspile) code = transpile(code);
    return this.run(code, path.relative(ROOT, absPath));
  }

  /** Cài polyfill + mock + thế giới + scheduler. */
  setup(world = {}) {
    this.runFile(path.join(__dirname, '..', 'luau-prelude.luau'));
    this.runFileAsGlobal(path.join(__dirname, 'roblox-mock.luau'), '__RALO_MOCK');

    // Sinh BẢNG LUA (không phải JSON: Lua dùng `=` chứ không phải `:`)
    const opts = [
      `parts = ${Number(world.parts ?? 220)}`,
      `emitters = ${Number(world.emitters ?? 24)}`,
      `emitterRate = ${Number(world.emitterRate ?? 80)}`,
      `emitterCount = ${Number(world.emitterCount ?? -1)}`,
      `farDistance = ${Number(world.farDistance ?? 400)}`,
      `qualityLevel = ${Number(world.qualityLevel ?? 10)}`,
    ].join(', ');

    this._installScheduler();

    // Phơi các global mà mã Luau dùng (trong Roblox chúng có sẵn).
    this.run(`
      Instance = __RALO_MOCK.Instance
      Vector2 = __RALO_MOCK.Vector2
      Vector3 = __RALO_MOCK.Vector3
      CFrame = __RALO_MOCK.CFrame
      Color3 = __RALO_MOCK.Color3
      UDim = __RALO_MOCK.UDim
      UDim2 = __RALO_MOCK.UDim2
      Enum = __RALO_MOCK.Enum
      ColorSequence = __RALO_MOCK.ColorSequence
      ColorSequenceKeypoint = __RALO_MOCK.ColorSequenceKeypoint
      NumberSequence = __RALO_MOCK.NumberSequence
      TweenInfo = __RALO_MOCK.TweenInfo
    `, 'expose-roblox-globals');

    this.run(`
      __RALO_GAME = __RALO_MOCK.CreateGame()
      __RALO_WORLD = __RALO_MOCK.BuildWorld(__RALO_GAME, { ${opts} })
      game = __RALO_GAME
      workspace = __RALO_WORLD.workspace
    `, 'build-world');

    return this.run('return __RALO_WORLD', 'read-world')[0];
  }

  _installScheduler() {
    const self = this;
    const L = this.L;

    // Lưu ý: lua_setglobal đã tự pop giá trị, KHÔNG được pop thêm.
    const setGlobalFunction = (name, jsFn) => {
      lua.lua_pushjsfunction(L, jsFn);
      lua.lua_setglobal(L, toLuaString(name));
    };

    setGlobalFunction('__RALO_NOW', (state) => {
      lua.lua_pushnumber(state, self.clock);
      return 1;
    });

    setGlobalFunction('__RALO_FRAME_SECONDS', (state) => {
      lua.lua_pushnumber(state, self.lastFrameSeconds);
      return 1;
    });

    setGlobalFunction('__RALO_SCHEDULE', (state) => {
      const delay = lua.lua_tonumber(state, 1) || 0;
      const id = self.nextId;
      self.nextId += 1;
      self.scheduled.push({ id, at: self.clock + delay, cancelled: false });
      lua.lua_pushinteger(state, id);
      return 1;
    });

    setGlobalFunction('__RALO_CANCEL', (state) => {
      const id = lua.lua_tointeger(state, 1);
      for (const entry of self.scheduled) {
        if (entry.id === id) entry.cancelled = true;
      }
      return 0;
    });

    setGlobalFunction('__RALO_ADVANCE', (state) => {
      const seconds = lua.lua_tonumber(state, 1) || 0;
      lua.lua_pushnumber(state, self.advance(seconds));
      return 1;
    });

    // os.clock của harness = đồng hồ ảo, để Log.time nhất quán với test
    setGlobalFunction('os_clock_virtual', (state) => {
      lua.lua_pushnumber(state, self.clock);
      return 1;
    });
    this.run('os.clock = os_clock_virtual', 'os-clock');

    // task.* viết bằng Lua để giữ semantics gọi lại từ Lua
    this.run(`
      local pending = {}
      task = {
        spawn = function(fn, ...)
          local args = table.pack(...)
          local ok, err = pcall(fn, table.unpack(args, 1, args.n))
          if not ok then warn("[task.spawn] " .. tostring(err)) end
          return { __thread = true }
        end,
        wait = function(seconds)
          return __RALO_ADVANCE(seconds or 0)
        end,
        delay = function(seconds, fn)
          local id = __RALO_SCHEDULE(seconds or 0)
          pending[id] = fn
          return id
        end,
        cancel = function(handle)
          if type(handle) == "number" then
            __RALO_CANCEL(handle)
            pending[handle] = nil
          end
        end,
        defer = function(fn, ...)
          return task.spawn(fn, ...)
        end,
      }
      -- Chạy các callback đã tới hạn (JS gọi sau mỗi khung hình)
      __RALO_TICK = function()
        for id, fn in pairs(pending) do
          pending[id] = nil
          local ok, err = pcall(fn)
          if not ok then warn("[task.delay] " .. tostring(err)) end
        end
      end
    `, 'task-mock');
  }

  /** Chi phí khung hình theo mô hình khai báo trong mock. */
  computeCost() {
    const L = this.L;
    const base = lua.lua_gettop(L);
    lua.lua_getglobal(L, toLuaString('__RALO_MOCK'));
    lua.lua_getfield(L, -1, toLuaString('ComputeFrameCost'));
    lua.lua_remove(L, base + 1);                    // bỏ bảng Mock, chỉ giữ hàm
    lua.lua_getglobal(L, toLuaString('__RALO_GAME'));
    // ComputeFrameCost đã tự pcall bên trong và trả nil khi lỗi.
    if (lua.lua_pcall(L, 1, 1, 0) !== lua.LUA_OK) {
      lua.lua_settop(L, base);
      return null;
    }
    const cost = lua.lua_tonumber(L, -1);
    lua.lua_settop(L, base);
    return cost;
  }

  /** Một khung hình: cập nhật frame time từ mô hình chi phí rồi bắn signal. */
  stepFrame(deltaSeconds) {
    const cost = this.computeCost();
    if (cost !== null) {
      this.frameTimeMs = this.baseFrameMs + this.costScale * cost;
    }
    this.lastFrameSeconds = this.frameTimeMs / 1000;
    this.fps = this.frameTimeMs > 0 ? 1000 / this.frameTimeMs : 0;
    this.clock += deltaSeconds;
    this.frameCount += 1;
    this._fireSignal('RunService', 'RenderStepped', deltaSeconds);
    this._fireSignal('RunService', 'Heartbeat', deltaSeconds);
    this._tick();
  }

  _fireSignal(serviceName, signalName, ...args) {
    const L = this.L;
    const base = lua.lua_gettop(L);
    lua.lua_getglobal(L, toLuaString('__RALO_GAME'));
    lua.lua_getfield(L, -1, toLuaString('GetService'));
    lua.lua_pushvalue(L, -2);                       // self = game
    lua.lua_pushstring(L, toLuaString(serviceName));
    if (lua.lua_pcall(L, 2, 1, 0) !== lua.LUA_OK) { lua.lua_settop(L, base); return; }
    // Sau pcall stack là [.., game, service]; phải BỎ game đi, nếu không
    // mọi getfield phía sau sẽ đọc nhầm object (lỗi đã gặp).
    lua.lua_remove(L, base + 1);
    lua.lua_getfield(L, -1, toLuaString(signalName));
    if (lua.lua_isnil(L, -1)) { lua.lua_settop(L, base); return; }
    lua.lua_getfield(L, -1, toLuaString('Fire'));
    if (lua.lua_isnil(L, -1)) { lua.lua_settop(L, base); return; }
    lua.lua_pushvalue(L, -2);                       // signal self
    for (const arg of args) this._pushArg(arg);
    lua.lua_pcall(L, 1 + args.length, 0, 0);
    lua.lua_settop(L, base);
  }

  _tick() {
    const L = this.L;
    const base = lua.lua_gettop(L);
    lua.lua_getglobal(L, toLuaString('__RALO_TICK'));
    if (lua.lua_isfunction(L, -1)) lua.lua_pcall(L, 0, 0, 0);
    lua.lua_settop(L, base);
  }

  /** Tiến đồng hồ ảo, chạy khung hình 60fps. Chống tái nhập. */
  advance(seconds) {
    if (this.pumping) {
      this.clock += seconds;
      return seconds;
    }
    this.pumping = true;
    try {
      const step = 1 / 60;
      let remaining = Math.max(0, seconds);
      while (remaining > 1e-9) {
        const delta = Math.min(step, remaining);
        this.stepFrame(delta);
        remaining -= delta;
      }
    } finally {
      this.pumping = false;
    }
    return seconds;
  }

  /**
   * Nạp bundle.
   *
   * dist/*.luau là Luau NGUYÊN BẢN (giữ type annotation) vì đó là thứ
   * Roblox chạy. Harness cần Lua 5.3 nên nó transpile TỪNG MODULE trong src/
   * rồi lắp lại bằng CHÍNH hàm renderBundle của tools/build.js — cùng một
   * khuôn bundle, chỉ khác lớp cú pháp.
   */
  loadBundle({ fromDist = false } = {}) {
    let code;
    if (fromDist) {
      const distPath = path.join(ROOT, 'dist', 'roblox-anti-lag-optimizer.luau');
      if (!fs.existsSync(distPath)) {
        throw new Error('chưa có dist — chạy `npm run build` trước');
      }
      code = transpile(fs.readFileSync(distPath, 'utf8'));
    } else {
      const { readModules, renderBundle } = require('../build');
      const { modules } = readModules();
      const transpiled = new Map();
      for (const [key, source] of modules) transpiled.set(key, transpile(source));
      code = renderBundle(transpiled).bundle;
    }
    // Test phải tất định: tắt auto-run của Bootstrap, test sẽ tự gọi Start().
    this.run('_RALO_NO_AUTORUN = true', 'no-autorun');
    const L = this.L;
    const buffer = toLuaString(code);
    if (lauxlib.luaL_loadbuffer(L, buffer, buffer.length, toLuaString('dist/bundle')) !== lua.LUA_OK) {
      throw new Error(`dist/bundle: ${lua.lua_tojsstring(L, -1)}`);
    }
    if (lua.lua_pcall(L, 0, 1, 0) !== lua.LUA_OK) {
      throw new Error(`dist/bundle: ${lua.lua_tojsstring(L, -1)}`);
    }
    lua.lua_setglobal(L, toLuaString('__RALO'));

    // Mở __RALO_REQUIRE ra global để test gọi trực tiếp từng module
    this.run('__RALO_REQ = __RALO_REQUIRE', 'expose-require');
    return this.run('return __RALO', 'read-bootstrap')[0];
  }

  /** Gọi  __RALO_REQ("<path>").<fn>(mod, ...)  và trả kết quả về JS. */
  callModule(modulePath, fnName, ...args) {
    const L = this.L;
    const code = `
      local mod = __RALO_REQ(${JSON.stringify(modulePath)})
      local fn = mod[${JSON.stringify(fnName)}]
      if type(fn) ~= "function" then
        error("module ${modulePath} không có hàm ${fnName}")
      end
      return fn(mod, ...)
    `;
    const buffer = toLuaString(code);
    if (lauxlib.luaL_loadbuffer(L, buffer, buffer.length, toLuaString('callModule')) !== lua.LUA_OK) {
      throw new Error(`callModule: ${lua.lua_tojsstring(L, -1)}`);
    }
    for (const arg of args) this._pushArg(arg);
    if (lua.lua_pcall(L, args.length, lua.LUA_MULTRET, 0) !== lua.LUA_OK) {
      const msg = lua.lua_tojsstring(L, -1);
      lua.lua_pop(L, 1);
      throw new Error(`callModule(${modulePath}.${fnName}): ${msg}`);
    }
    const n = lua.lua_gettop(L);
    const out = [];
    for (let i = 1; i <= n; i += 1) out.push(readValue(L, i));
    lua.lua_settop(L, 0);
    return out.length === 1 ? out[0] : out;
  }

  /**
   * Nạp + chạy chunk CÓ tham số (... được truyền từ JS).
   * Dùng cho test cần gọi hàm dạng dấu chấm (không truyền self).
   */
  runWithArgs(code, args = [], name = 'chunk') {
    const L = this.L;
    const base = lua.lua_gettop(L);
    const buffer = toLuaString(code);
    if (lauxlib.luaL_loadbuffer(L, buffer, buffer.length, toLuaString(name)) !== lua.LUA_OK) {
      const msg = lua.lua_tojsstring(L, -1);
      lua.lua_pop(L, 1);
      throw new Error(`${name}: ${msg}`);
    }
    for (const arg of args) this._pushArg(arg);
    if (lua.lua_pcall(L, args.length, lua.LUA_MULTRET, 0) !== lua.LUA_OK) {
      const msg = lua.lua_tojsstring(L, -1);
      lua.lua_pop(L, 1);
      throw new Error(`${name}: ${msg}`);
    }
    const top = lua.lua_gettop(L);
    const out = [];
    for (let i = base + 1; i <= top; i += 1) out.push(readValue(L, i));
    lua.lua_settop(L, base);
    return out.length === 1 ? out[0] : out;
  }

  /** Nạp + chạy tệp test (Lua) trong cùng VM. */
  runTestFile(absPath) {
    return this.runFile(absPath, { shouldTranspile: false });
  }
}

module.exports = { LuaRuntime, transpile, readTable, readValue, ROOT };
