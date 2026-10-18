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

  // Xác minh luôn đường hiển thị GUI của bundle dist (cấu trúc mock, không render pixel).
  const guiOut = rt.run(`
    local Config = __RALO_REQUIRE("Shared/Config")
    Config.Apply({
      measure = { baselineSeconds = 0.1, settleSeconds = 0, afterSeconds = 0.1, frameWindow = 60 },
      gui = { enabled = true },
    })
    local result, err = __RALO.Start({ force = true })
    if err ~= nil then error(err) end
    local playerGui = game:GetService("Players").LocalPlayer:FindFirstChildOfClass("PlayerGui")
    local screenGui = playerGui and playerGui:FindFirstChild("RALO_OptimizerNotifier")
    local panel = screenGui and screenGui:FindFirstChild("RALO_Panel")
    local status = panel and panel:FindFirstChild("Status")
    return table.concat({
      tostring(screenGui ~= nil), tostring(screenGui and screenGui.Parent == playerGui),
      tostring(screenGui and screenGui.Enabled), tostring(screenGui and screenGui.DisplayOrder),
      tostring(panel ~= nil), tostring(panel and panel.Visible),
      tostring(panel and panel.Position.X.Scale), tostring(panel and panel.Position.X.Offset),
      tostring(panel and panel.Position.Y.Scale), tostring(panel and panel.Position.Y.Offset),
      tostring(status ~= nil and status.Text ~= ""), tostring(result.tally.failed),
    }, "|")
  `, 'dist-gui-smoke')[0];
  const [hasScreenGui, correctParent, guiEnabled, displayOrder, hasPanel, panelVisible,
    xScale, xOffset, yScale, yOffset, hasStatus, uiPipelineFailures] = guiOut.split('|');
  const guiChecks = [hasScreenGui, correctParent, guiEnabled, hasPanel, panelVisible, hasStatus];
  if (guiChecks.some((value) => value !== 'true') || displayOrder !== '1000'
      || xScale !== '1' || xOffset !== '-16' || yScale !== '1' || yOffset !== '-16'
      || uiPipelineFailures !== '0') {
    throw new Error(`dist GUI smoke failed: ${guiOut}`);
  }
  console.log('dist GUI mock: PlayerGui parent OK, enabled, visible, fixed bottom-right; pipeline failures:', uiPipelineFailures);
  console.log('CAUTION: mock verifies instance/properties only; it cannot confirm Roblox Studio rendering.');
} catch (err) {
  console.error('FAILED:', err.message);
  console.error('--- logs ---');
  console.error(rt.logs.slice(-40).join('\n'));
  process.exit(1);
}
