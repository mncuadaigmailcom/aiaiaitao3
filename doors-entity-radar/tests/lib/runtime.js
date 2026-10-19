'use strict';
/**
 * doors-entity-radar/tests/lib/runtime.js
 *
 * Nhà máy tạo môi trường kiểm thử cho Doors Entity Radar.
 *
 * TÁI DÙNG hạ tầng đã có của repo (không viết lại máy ảo):
 *   tools/test-harness/lua-runtime.js  -> LuaRuntime (Lua 5.3 / fengari) + đồng hồ ảo
 *   tools/test-harness/roblox-mock.luau-> mock API Roblox
 *   tools/luau-to-lua.js               -> bóc type Luau để Lua 5.3 đọc được
 * và THÊM doors-entity-radar/tools/mock-extensions.luau cho những API mà
 * mock gốc chưa có (DescendantAdded, Enum.KeyCode, Model:GetPivot...).
 *
 * GIỚI HẠN PHẢI NÊU RÕ: đây KHÔNG PHẢI Roblox Studio. Harness chứng minh
 * LOGIC của mã nguồn thật chạy đúng trên mock; nó không chứng minh API
 * Roblox thật hành xử giống hệt mock, cũng không đo được FPS.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const { LuaRuntime, transpile } = require(path.join(REPO_ROOT, 'tools', 'test-harness', 'lua-runtime'));
const { readModules, renderBundle } = require('../../tools/bundle');

const MOCK_EXTENSIONS = path.resolve(__dirname, '..', '..', 'tools', 'mock-extensions.luau');

/**
 * createRuntime(options)
 *   options.world      — tham số thế giới mock (parts, emitters...)
 *   options.autorun    — nạp luôn Client/Bootstrap (mặc định: không)
 *   options.camera     — { x,y,z, lookX,lookY,lookZ }
 *   options.player     — { x,y,z }
 */
function createRuntime(options = {}) {
  const rt = new LuaRuntime();
  rt.setup({ parts: 12, emitters: 0, ...(options.world || {}) });

  // Mở rộng mock (phải chạy TRƯỚC khi nạp mã nguồn dự án).
  rt.runFile(MOCK_EXTENSIONS);
  rt.run('return __RALO_MOCK.UpgradeExisting(__RALO_GAME)', 'mock-upgrade');

  const camera = options.camera || { x: 0, y: 0, z: 0, lookX: 0, lookY: 0, lookZ: -1 };
  // KHÔNG return instance về JS: bảng instance của mock có tham chiếu vòng
  // (cha/con) nên đọc sang JS sẽ tràn stack. Chỉ trả giá trị đơn giản.
  rt.run(`__RALO_MOCK.SetupCamera(__RALO_GAME, ${camera.x}, ${camera.y}, ${camera.z}, ${camera.lookX}, ${camera.lookY}, ${camera.lookZ}) return true`, 'setup-camera');

  const player = options.player || { x: 0, y: 0, z: 0 };
  rt.run(`__RALO_MOCK.SetupPlayerPosition(__RALO_GAME, ${player.x}, ${player.y}, ${player.z}) return true`, 'setup-player');

  // Nạp bundle DER (đã bóc type), KHÔNG tự chạy Bootstrap để test kiểm soát.
  const { modules } = readModules();
  const transpiled = new Map();
  for (const [key, source] of modules) transpiled.set(key, transpile(source));
  const { bundle } = renderBundle(transpiled, { autorun: false });

  rt.run(options.noAutorunFlag === false ? '__DER_NO_AUTORUN = nil' : '__DER_NO_AUTORUN = true', 'no-autorun');
  rt.run(bundle, 'der-bundle');
  rt.run('__DER_REQ = __DER_REQUIRE', 'expose-require');

  if (options.autorun === true) {
    // KHÔNG return giá trị: Bootstrap trả về bảng Radar chứa tham chiếu tới
    // instance (Workspace/GUI) có quan hệ cha-con vòng -> đọc sang JS sẽ tràn stack.
    rt.run('__DER_REQ("Client/Bootstrap") return true', 'autorun-bootstrap');
  }

  const api = {
    rt,
    logs: rt.logs,

    /** Gọi dạng dấu chấm: __DER_REQ(path).fn(...) */
    call(modulePath, fnName, ...args) {
      const code = `
        local mod = __DER_REQ(${JSON.stringify(modulePath)})
        local fn = mod[${JSON.stringify(fnName)}]
        if type(fn) ~= "function" then
          error("module ${modulePath} không có hàm ${fnName}")
        end
        return fn(...)
      `;
      return rt.runWithArgs(code, args, `call ${modulePath}.${fnName}`);
    },

    /** Gọi dạng dấu hai chấm: __DER_REQ(path):fn(...) */
    callMethod(modulePath, fnName, ...args) {
      const code = `
        local mod = __DER_REQ(${JSON.stringify(modulePath)})
        local fn = mod[${JSON.stringify(fnName)}]
        if type(fn) ~= "function" then
          error("module ${modulePath} không có method ${fnName}")
        end
        return fn(mod, ...)
      `;
      return rt.runWithArgs(code, args, `callMethod ${modulePath}:${fnName}`);
    },

    /** Chạy mã Lua thô (đã transpile) trong cùng VM. */
    eval(luaCode, name = 'eval') {
      return rt.run(transpile(luaCode), name);
    },

    /** Tiến đồng hồ ảo (60 khung hình/giây). */
    advance(seconds) {
      return rt.advance(seconds);
    },

    /**
     * Tạo một instance "thực thể giả" có vị trí, bắn DescendantAdded, và giữ
     * tham chiếu trong _G.__DER_LAST_SPAWN để test còn gỡ ra được.
     */
    spawn(name, x = 0, y = 0, z = 0, className = 'Model') {
      return rt.run(`
        _G.__DER_LAST_SPAWN = __RALO_MOCK.SpawnEntity(__RALO_GAME, ${JSON.stringify(String(name))}, ${x}, ${y}, ${z}, ${JSON.stringify(className)}, nil)
        return _G.__DER_LAST_SPAWN ~= nil
      `, 'spawn')[0];
    },

    /** Gỡ instance vừa tạo và bắn DescendantRemoving. */
    removeLastSpawn() {
      return rt.run(`
        if _G.__DER_LAST_SPAWN == nil then return false end
        __RALO_MOCK.SimulateRemove(_G.__DER_LAST_SPAWN)
        _G.__DER_LAST_SPAWN = nil
        return true
      `, 'remove-last')[0];
    },

    /** Huỷ (Destroy) instance vừa tạo — mô phỏng game tự xoá đối tượng. */
    destroyLastSpawn() {
      return rt.run(`
        if _G.__DER_LAST_SPAWN == nil then return false end
        _G.__DER_LAST_SPAWN:Destroy()
        _G.__DER_LAST_SPAWN = nil
        return true
      `, 'destroy-last')[0];
    },

    setPlayerPosition(x, y, z) {
      return rt.run(`__RALO_MOCK.SetupPlayerPosition(__RALO_GAME, ${x}, ${y}, ${z}) return true`, 'move-player')[0];
    },

    setCamera(x, y, z, lookX, lookY, lookZ) {
      return rt.run(`__RALO_MOCK.SetupCamera(__RALO_GAME, ${x}, ${y}, ${z}, ${lookX}, ${lookY}, ${lookZ}) return true`, 'move-camera')[0];
    },

    /** Đếm dòng log khớp mẫu. */
    countLogs(pattern) {
      const re = pattern instanceof RegExp ? pattern : new RegExp(String(pattern));
      return rt.logs.filter((line) => re.test(line)).length;
    },

    findLog(pattern) {
      const re = pattern instanceof RegExp ? pattern : new RegExp(String(pattern));
      return rt.logs.find((line) => re.test(line)) || null;
    },

    dispose() {
      // fengari không có API huỷ state; để GC của Node dọn.
    },
  };

  return api;
}

/** Đường dẫn module dùng trong test (khớp khoá của bundle). */
const P = {
  config: 'Shared/Config',
  areas: 'Shared/Areas',
  catalog: 'Shared/EntityCatalog',
  status: 'Shared/Status',
  geometry: 'Shared/Geometry',
  safe: 'Shared/Safe',
  signal: 'Shared/Signal',
  log: 'Shared/Log',
  shim: 'Shared/RequireShim',
  matcher: 'Client/Core/Matcher',
  scanner: 'Client/Core/Scanner',
  tracker: 'Client/Core/Tracker',
  scheduler: 'Client/Core/Scheduler',
  registry: 'Client/Core/Registry',
  env: 'Client/Core/Env',
  selfcheck: 'Client/Core/SelfCheck',
  selection: 'Client/Core/Selection',
  theme: 'Client/Ui/Theme',
  widgets: 'Client/Ui/Widgets',
  ui: 'Client/Ui/RadarUi',
  radar: 'Client/Radar',
  bootstrap: 'Client/Bootstrap',
};

/*
 * Harness đọc bảng Lua thành OBJECT với khoá chuỗi ("1","2",...).
 * toArray chuyển về mảng JS đúng thứ tự.
 */
function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  if (typeof value !== 'object') return [value];
  const keys = Object.keys(value)
    .filter((k) => /^\d+$/.test(k))
    .map(Number)
    .sort((a, b) => a - b);
  if (keys.length === 0) return [];
  return keys.map((k) => value[String(k)]);
}

/** Đọc một trường của bảng Lua trả về (dùng cho bảng có khoá không phải số). */
function field(value, key) {
  if (value === null || typeof value !== 'object') return undefined;
  return value[String(key)];
}

module.exports = { createRuntime, P, toArray, field, REPO_ROOT, fs };
