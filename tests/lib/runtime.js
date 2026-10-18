'use strict';
/**
 * tests/lib/runtime.js
 * Nhà máy tạo môi trường test. MỖI test được một runtime RIÊNG để không
 * test nào làm bẩn test nào (đây là yêu cầu "giữ điều kiện test tương đương").
 *
 * createRuntime(options) trả về object có:
 *   rt        — LuaRuntime đã setup + nạp bundle
 *   call(path, fn, ...args) — gọi hàm của một module src/, trả giá trị JS
 *   eval(luaCode)           — chạy mã Lua thô trong cùng VM
 *   advance(seconds)        — tiến ĐỒNG HỒ ẢO
 *   logs                    — mọi dòng Output thu được
 *   dispose()
 */

const path = require('path');
const { LuaRuntime, transpile } = require('../../tools/test-harness/lua-runtime');

const DEFAULT_WORLD = { parts: 60, emitters: 6, emitterRate: 80 };

function createRuntime(world = {}, { bundle = true } = {}) {
  const rt = new LuaRuntime();
  rt.setup({ ...DEFAULT_WORLD, ...world });
  if (bundle) {
    rt.loadBundle();
    // Test tắt auto-run (để tất định), nên phải tự khởi động Env:
    // nếu không, Env.GetService trả về nil và mọi module cần service chết.
    rt.callModule('Client/Core/Env', 'Init', {});
  }

  const api = {
    rt,
    logs: rt.logs,
    /** Gọi  __RALO_REQ(path).fn(mod, ...)  */
    call(modulePath, fnName, ...args) {
      // callModule truyền `mod` làm tham số đầu (dạng `fn(mod, ...)`).
      // Các hàm tĩnh của dự án nhận (instance/nil, ...) nên cách gọi này
      // vẫn đúng; với hàm không nhận self thì dùng callStatic.
      return rt.callModule(modulePath, fnName, ...args);
    },
    /** Gọi dạng dấu chấm: __RALO_REQ(path).fn(...) — không truyền self. */
    callStatic(modulePath, fnName, ...args) {
      const code = `
        local mod = __RALO_REQ(${JSON.stringify(modulePath)})
        local fn = mod[${JSON.stringify(fnName)}]
        if type(fn) ~= "function" then
          error("module ${modulePath} không có hàm ${fnName}")
        end
        return fn(...)
      `;
      return rt.runWithArgs(code, args, 'callStatic');
    },
    /**
     * Chạy mã trong cùng VM. Mặc định CÓ transpile để test viết được cú
     * pháp Luau (+=, for k,v in t) giống mã nguồn thật.
     * Truyền { raw: true } nếu muốn chạy Lua 5.3 nguyên văn.
     */
    eval(luaCode, options = {}) {
      const name = options.name || 'eval';
      return rt.run(options.raw ? luaCode : transpile(luaCode), name);
    },
    /** Tiến đồng hồ ảo (60fps). */
    advance(seconds) {
      return rt.advance(seconds);
    },
    /** Số dòng log khớp mẫu. */
    countLogs(pattern) {
      const re = pattern instanceof RegExp ? pattern : new RegExp(String(pattern));
      return rt.logs.filter((line) => re.test(line)).length;
    },
    /** Tìm dòng log đầu tiên khớp mẫu. */
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

/** Đường dẫn module (tương đối src/) dùng trong test. */
const P = {
  config: 'Shared/Config',
  methods: 'Shared/Methods',
  safety: 'Shared/Safety',
  log: 'Shared/Log',
  safe: 'Shared/Safe',
  theme: 'Client/Ui/Theme',
  hsv: 'Shared/Hsv',
  types: 'Shared/Types',
  cpu: 'Client/Core/Cpu',
  cull: 'Client/Core/Cull',
  devices: 'Client/Core/Devices',
  env: 'Client/Core/Env',
  guard: 'Client/Core/Guard',
  measure: 'Client/Core/Measure',
  net: 'Client/Core/Net',
  perf: 'Client/Core/Perf',
  pipeline: 'Client/Core/Pipeline',
  plan: 'Client/Core/Plan',
  pool: 'Client/Core/Pool',
  profile: 'Client/Core/Profile',
  registry: 'Client/Core/Registry',
  restore: 'Client/Core/Restore',
  runner: 'Client/Core/Runner',
  scheduler: 'Client/Core/Scheduler',
  spatial: 'Client/Core/Spatial',
  effects: 'Client/Optimizations/Effects',
  graphics: 'Client/Optimizations/Graphics',
  memory: 'Client/Optimizations/Memory',
  physics: 'Client/Optimizations/Physics',
  scan: 'Client/Optimizations/Scan',
  guiPolicy: 'Client/Ui/GuiPolicy',
  notifier: 'Client/Ui/Notifier',
  progress: 'Client/Ui/Progress',
  widget: 'Client/Ui/Widget',
  bootstrap: 'Client/Bootstrap',
};

/*
 * Harness đọc bảng Lua thành OBJECT với khoá chuỗi ("1","2",...) chứ không
 * phải mảng JS, nên `for (const x of luaArray)` sẽ báo "not iterable".
 * Hàm này chuyển về mảng JS đúng thứ tự.
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

module.exports = {
  createRuntime, P, toArray, DEFAULT_WORLD,
  ROOT: path.resolve(__dirname, '..', '..'),
};
