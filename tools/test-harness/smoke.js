'use strict';
/* Smoke test: runtime + mock + dist bundle có chạy được với nhau không. */
const { LuaRuntime } = require('./lua-runtime');

const rt = new LuaRuntime();
try {
  const world = rt.setup({ parts: 60, emitters: 6, emitterRate: 80 });
  console.log('world parts/emitters:', world.parts, world.emitters);
  console.log('cost before:', rt.computeCost());
  rt.loadBundle();
  console.log('bundle loaded OK');
  rt.advance(0.5);
  console.log('frameTimeMs:', rt.frameTimeMs.toFixed(3), 'fps:', rt.fps.toFixed(2), 'frames:', rt.frameCount);
  console.log('--- last 25 log lines ---');
  console.log(rt.logs.slice(-25).join('\n'));
} catch (err) {
  console.error('FAILED:', err.message);
  console.error('--- logs ---');
  console.error(rt.logs.slice(-40).join('\n'));
  process.exit(1);
}
