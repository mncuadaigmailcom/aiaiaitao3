'use strict';
/* Smoke test: nạp bundle dist thật, chạy pipeline trên mock và đo tác động mô hình. */
const { LuaRuntime } = require('./lua-runtime');

const rt = new LuaRuntime();
try {
  const emitterRate = 80;
  const world = rt.setup({ parts: 60, emitters: 6, emitterRate });
  console.log('world parts/emitters/rate:', world.parts, world.emitters, emitterRate);
  rt.loadBundle({ fromDist: true });
  console.log('dist bundle loaded OK');

  const costBefore = rt.computeCost();
  const out = rt.run(`
    local Config = __RALO_REQUIRE("Shared/Config")
    Config.Apply({
      measure = { baselineSeconds = 0.5, settleSeconds = 0, afterSeconds = 0.5, frameWindow = 60 },
      gui = { enabled = false },
    })
    local result, err = __RALO.Start({ buildUi = false })
    if err ~= nil then error(err) end
    return table.concat({
      tostring(result.tally.applied), tostring(result.tally.failed), tostring(result.tally.changes),
      string.format("%.2f", result.before.fps.mean), string.format("%.2f", result.after.fps.mean),
      string.format("%.2f", result.before.frameTimeMs.mean), string.format("%.2f", result.after.frameTimeMs.mean),
      tostring(result.comparison.summary.verdict), tostring(result.comparison.summary.improved),
    }, "|")
  `, 'dist-pipeline-smoke')[0];
  const costAfter = rt.computeCost();
  const [applied, failed, changes, fpsBefore, fpsAfter, frameBefore, frameAfter, verdict, improved] = out.split('|');
  console.log('mock cost:', costBefore.toFixed(3), '->', costAfter.toFixed(3),
    `(${((costBefore - costAfter) / costBefore * 100).toFixed(1)}% lower in this model)`);
  console.log('pipeline:', `applied=${applied}, failed=${failed}, changes=${changes}, verdict=${verdict}`);
  console.log('mock FPS:', `${fpsBefore} -> ${fpsAfter}`, '| frame ms:', `${frameBefore} -> ${frameAfter}`,
    `| improved metrics: ${improved}`);
  console.log('CAUTION: this is a deterministic mock model, not Roblox Studio/GPU performance.');
  console.log('--- relevant log lines ---');
  console.log(rt.logs.filter((line) => /ERROR|thực thi xong|Kết luận:|chi phí Scheduler/.test(line)).join('\n'));
} catch (err) {
  console.error('FAILED:', err.message);
  console.error('--- logs ---');
  console.error(rt.logs.slice(-40).join('\n'));
  process.exit(1);
}
