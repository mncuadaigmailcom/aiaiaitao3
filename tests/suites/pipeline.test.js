'use strict';
/**
 * tests/suites/pipeline.test.js
 * ===== RALO.METHODS: LOOP-005, REC-003, MEAS-001, MEAS-003, MEAS-006,
 *                     MEAS-007, RESTORE-001, RESTORE-002, RESTORE-003,
 *                     CFG-001, QUERY-004, QUERY-006, EFFECTS-001,
 *                     GRAPHICS-001, GRAPHICS-003, START-003 =====
 *
 * KIỂM THỬ TÍCH HỢP: chạy toàn bộ luồng đo -> lập kế hoạch -> thực thi ->
 * đo lại -> so sánh -> khôi phục, trên thế giới mock có kiểm soát.
 */

const { createRuntime, P, toArray } = require('../lib/runtime');

/** Cấu hình đo nhanh để test không phải bơm nhiều giây đồng hồ ảo. */
const FAST = {
  measure: { baselineSeconds: 1.0, settleSeconds: 0, afterSeconds: 1.0, frameWindow: 60 },
  gui: { enabled: false },
};

module.exports = function pipelineSuite(suite) {
  suite.test('MEAS-001 / START-003: pipeline chạy hết và trả về kết quả đầy đủ', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Config = __RALO_REQ("Shared/Config")
      local Pipeline = __RALO_REQ("Client/Core/Pipeline")
      Config.Apply({
        measure = { baselineSeconds = 1.0, settleSeconds = 0, afterSeconds = 1.0, frameWindow = 60 },
        gui = { enabled = false },
      })
      local result = Pipeline.Run({ profile = Config.PROFILE, buildUi = false })
      return tostring(result ~= nil)
        .. "|" .. tostring(result.tally ~= nil)
        .. "|" .. tostring(result.comparison ~= nil)
        .. "|" .. tostring(result.plan ~= nil)
        .. "|" .. tostring(result.selfCost ~= nil)
        .. "|" .. tostring(type(result.selfCost.frameCostMs) == "number")
        .. "|" .. tostring(type(result.tally.handlerDurationMs) == "number")
        .. "|" .. tostring(result.selfCost.tasks)
        .. "|" .. tostring(result.selfCost.connections)
        .. "|" .. tostring(result.tally.failed)
        .. "|" .. tostring(result.tally.applied)
    `)[0];
    const [hasResult, hasTally, hasComparison, hasPlan, hasSelfCost, hasSchedulerCost, hasHandlerDuration,
      tasks, connections, failedSteps, appliedSteps] = out.split('|');
    A.equal(hasResult, 'true', 'phải trả về bảng kết quả');
    A.equal(hasTally, 'true', 'phải có thống kê thực thi');
    A.equal(hasComparison, 'true', 'phải có bảng so sánh');
    A.equal(hasPlan, 'true', 'phải có kế hoạch');
    A.equal(hasSelfCost, 'true', 'phải có chi phí riêng của script');
    A.equal(hasSchedulerCost, 'true', 'chi phí Scheduler/frame phải là số đo được');
    A.equal(hasHandlerDuration, 'true', 'thời gian handler phải được tổng hợp bằng os.clock');
    A.equal(tasks, '0', 'không có GUI/GC opt-in thì không giữ tác vụ nền');
    A.equal(connections, '0', 'không có tác vụ thì Scheduler phải ngắt Heartbeat');
    A.equal(failedSteps, '0', 'runner phải gọi handler với đúng chữ ký (step, profile)');
    A.greaterThan(Number(appliedSteps), 0, 'pipeline phải áp dụng được các bước an toàn');
  });

  suite.test('PERF-001: mô hình mock cho thấy tác động giảm Rate particle lên chi phí/FPS', (t, A) => {
    const h = createRuntime({ emitters: 6, emitterRate: 200 });
    const costBefore = h.rt.computeCost();
    const out = h.eval(`
      local Config = __RALO_REQ("Shared/Config")
      Config.Apply({
        measure = { baselineSeconds = 0.5, settleSeconds = 0, afterSeconds = 0.5, frameWindow = 60 },
        gui = { enabled = false },
      })
      local Pipeline = __RALO_REQ("Client/Core/Pipeline")
      local result = Pipeline.Run({ profile = Config.PROFILE, buildUi = false })
      return tostring(result.tally.failed)
        .. "|" .. tostring(result.tally.applied)
        .. "|" .. tostring(result.comparison.valid)
        .. "|" .. tostring(result.comparison.summary.improved)
        .. "|" .. tostring(result.before.frameTimeMs.mean)
        .. "|" .. tostring(result.after.frameTimeMs.mean)
        .. "|" .. tostring(result.before.fps.mean)
        .. "|" .. tostring(result.after.fps.mean)
    `)[0];
    const costAfter = h.rt.computeCost();
    const [failed, applied, valid, improved, beforeFrameMs, afterFrameMs, beforeFps, afterFps]
      = out.split('|');
    A.equal(failed, '0', 'không được có handler lỗi khi chạy pipeline');
    A.greaterThan(Number(applied), 0, 'pipeline phải áp dụng ít nhất một bước');
    A.equal(valid, 'true', 'cả hai lần đo phải hợp lệ');
    A.greaterThan(costBefore, costAfter, 'model phải ghi nhận chi phí thấp hơn sau khi hạ Rate');
    A.lessThan(Number(afterFrameMs), Number(beforeFrameMs), 'frame time mock phải giảm sau tối ưu');
    A.greaterThan(Number(afterFps), Number(beforeFps), 'FPS suy ra từ frame time mock phải tăng');
    A.greaterThan(Number(improved), 0, 'bảng so sánh phải ghi nhận ít nhất một chỉ số cải thiện');

    const light = createRuntime({ emitters: 6, emitterRate: 20 });
    const lightCostBefore = light.rt.computeCost();
    const lightOut = light.eval(`
      local Config = __RALO_REQ("Shared/Config")
      Config.Apply({
        measure = { baselineSeconds = 0.5, settleSeconds = 0, afterSeconds = 0.5, frameWindow = 60 },
        gui = { enabled = false },
      })
      local result = __RALO_REQ("Client/Core/Pipeline").Run({ profile = Config.PROFILE, buildUi = false })
      return tostring(result.comparison.summary.verdict)
        .. "|" .. tostring(result.comparison.summary.improved)
        .. "|" .. tostring(result.comparison.summary.regressed)
        .. "|" .. tostring(result.comparison.summary.unchanged)
    `)[0];
    const lightCostAfter = light.rt.computeCost();
    const [lightVerdict, lightImproved, lightRegressed, lightUnchanged] = lightOut.split('|');
    A.equal(lightCostAfter, lightCostBefore, 'Rate dưới trần thì model không được giả vờ giảm chi phí');
    A.equal(lightVerdict, 'unchanged', 'không đổi hiệu năng phải báo unchanged, không báo regressed');
    A.equal(lightImproved, '0', 'Rate dưới trần không ghi cải thiện');
    A.equal(lightRegressed, '0', 'chỉ số trùng nhau không bị tính nhầm là suy giảm');
    A.equal(lightUnchanged, '5', 'ghi riêng số chỉ số không đổi');
  });

  suite.test('MEAS-001: cả hai lần đo đều có mẫu thật (không phải số bịa)', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Config = __RALO_REQ("Shared/Config")
      Config.Apply({
        measure = { baselineSeconds = 1.0, settleSeconds = 0, afterSeconds = 1.0, frameWindow = 60 },
      })
      local Pipeline = __RALO_REQ("Client/Core/Pipeline")
      local r = Pipeline.Run({ profile = Config.PROFILE, buildUi = false })
      return r.before.meta.samples .. "|" .. r.after.meta.samples
        .. "|" .. tostring(r.before.meta.source)
        .. "|" .. string.format("%.2f", r.before.fps.mean)
        .. "|" .. string.format("%.2f", r.after.fps.mean)
    `)[0];
    const [beforeSamples, afterSamples, source, fpsBefore, fpsAfter] = out.split('|');
    A.greaterThan(Number(beforeSamples), 0, 'lần đo TRƯỚC phải có mẫu');
    A.greaterThan(Number(afterSamples), 0, 'lần đo SAU phải có mẫu');
    A.equal(source, 'RenderStepped', 'nguồn số liệu phải được ghi rõ');
    A.greaterThan(Number(fpsBefore), 0, 'FPS trước phải là số dương thật');
    A.greaterThan(Number(fpsAfter), 0, 'FPS sau phải là số dương thật');
  });

  suite.test('MEAS-003 / MEAS-007: không có mẫu thì từ chối kết luận, không bịa số', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Profile = __RALO_REQ("Client/Core/Profile")
      local empty = { meta = { samples = 0, duration = 0, source = "none" },
                      fps = { mean = 0, p1 = 0, p5 = 0 }, frameTimeMs = { mean = 0, p95 = 0 } }
      local full  = { meta = { samples = 100, duration = 1, source = "RenderStepped" },
                      fps = { mean = 60, p1 = 40, p5 = 50 }, frameTimeMs = { mean = 16, p95 = 20 },
                      heapAvailable = false }
      local c1 = Profile.Compare(empty, full)
      local c2 = Profile.Compare(full, empty)
      local c3 = Profile.Compare(nil, full)
      local c4 = Profile.Compare(full, full)
      local Measure = __RALO_REQ("Client/Core/Measure")
      local c5 = Measure.Compare(full, full)
      return tostring(c1.valid) .. "|" .. tostring(c2.valid) .. "|" .. tostring(c3.valid)
        .. "|" .. tostring(c1.reason ~= nil)
        .. "|" .. tostring(c4.summary.verdict) .. "|" .. tostring(c4.summary.unchanged)
        .. "|" .. tostring(c5.summary.verdict) .. "|" .. tostring(c5.summary.unchanged)
    `)[0];
    const [v1, v2, v3, hasReason, profileVerdict, profileUnchanged, measureVerdict, measureUnchanged]
      = out.split('|');
    A.equal(v1, 'false', 'thiếu mẫu TRƯỚC -> không kết luận');
    A.equal(v2, 'false', 'thiếu mẫu SAU -> không kết luận');
    A.equal(v3, 'false', 'dữ liệu nil -> không kết luận');
    A.equal(hasReason, 'true', 'phải nêu LÝ DO chứ không im lặng');
    A.equal(profileVerdict, 'unchanged', 'số đo trùng nhau phải báo unchanged, không regressed');
    A.equal(profileUnchanged, '5', 'các chỉ số bằng nhau phải được đếm riêng');
    A.equal(measureVerdict, 'unchanged', 'Measure.Compare cũng phải nhận diện số đo trùng');
    A.equal(measureUnchanged, '5', 'Measure.Compare phải đếm các chỉ số không đổi riêng');
  });

  suite.test('MEAS-006: mỗi lần đo ghi kèm ngữ cảnh thế giới để kiểm tra tương đương', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Config = __RALO_REQ("Shared/Config")
      Config.Apply({
        measure = { baselineSeconds = 1.0, settleSeconds = 0, afterSeconds = 1.0, frameWindow = 60 },
      })
      local Pipeline = __RALO_REQ("Client/Core/Pipeline")
      local r = Pipeline.Run({ profile = Config.PROFILE, buildUi = false })
      local cb, ca = r.before.world, r.after.world
      return tostring(cb ~= nil) .. "|" .. tostring(ca ~= nil)
        .. "|" .. tostring(cb.parts) .. "|" .. tostring(ca.parts)
    `)[0];
    const [hasBefore, hasAfter, partsBefore, partsAfter] = out.split('|');
    A.equal(hasBefore, 'true', 'phải ghi ngữ cảnh lần đo trước');
    A.equal(hasAfter, 'true', 'phải ghi ngữ cảnh lần đo sau');
    A.equal(partsBefore, partsAfter,
      'số part hai lần phải giống nhau — nếu không thì so sánh vô nghĩa');
  });

  suite.test('CFG-001: tắt nhóm graphics thì bước đồ hoạ bị SKIP có lý do', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Config = __RALO_REQ("Shared/Config")
      local Plan = __RALO_REQ("Client/Core/Plan")
      Config.Apply({ groups = { graphics = false } })
      local plan = Plan.Build(Config.PROFILE)
      local step = Plan.GetById(plan, "graphics.quality")
      return tostring(step.available) .. "|" .. tostring(step.reason)
    `)[0];
    const [available, reason] = out.split('|');
    A.equal(available, 'false', 'bước phải bị đánh dấu không khả dụng');
    A.matches(reason, /groups.graphics = false/, 'phải nêu đúng lý do là công tắc nhóm');
  });

  suite.test('CFG-001: chế độ "off" thì KHÔNG bước nào chạy', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Config = __RALO_REQ("Shared/Config")
      local Plan = __RALO_REQ("Client/Core/Plan")
      Config.PROFILE.mode = "off"
      local plan = Plan.Build(Config.PROFILE)
      return Plan.CountAvailable(plan) .. "|" .. plan.total
    `)[0];
    const [available, total] = out.split('|');
    A.equal(available, '0', 'không bước nào khả dụng khi tắt');
    A.greaterThan(Number(total), 0, 'kế hoạch vẫn phải LIỆT KÊ đủ các bước');
  });

  suite.test('EFFECTS-001: Rate hạt bị GIỚI HẠN nhưng emitter vẫn tồn tại và bật', (t, A) => {
    const h = createRuntime({ emitters: 6, emitterRate: 200 });
    const out = h.eval(`
      local Config = __RALO_REQ("Shared/Config")
      local Effects = __RALO_REQ("Client/Optimizations/Effects")
      Config.ResetToDefaults()
      local workspace = game:GetService("Workspace")
      local before = { rate = 0, enabled = 0 }
      for _, d in ipairs(workspace:GetDescendants()) do
        if d.ClassName == "ParticleEmitter" then
          before.rate = math.max(before.rate, d.Rate)
          if d.Enabled then before.enabled += 1 end
        end
      end

      local result = Effects.CapParticles(nil, Config.PROFILE)

      local after = { rate = 0, enabled = 0, total = 0 }
      for _, d in ipairs(workspace:GetDescendants()) do
        if d.ClassName == "ParticleEmitter" then
          after.total += 1
          after.rate = math.max(after.rate, d.Rate)
          if d.Enabled then after.enabled += 1 end
        end
      end
      return before.rate .. "|" .. after.rate
        .. "|" .. before.enabled .. "|" .. after.enabled .. "|" .. after.total
        .. "|" .. tostring(result.changes)
    `)[0];
    const [rateBefore, rateAfter, enBefore, enAfter, total, changes] = out.split('|');
    A.equal(rateBefore, '200', 'thế giới test phải có emitter Rate cao');
    A.equal(rateAfter, '40', 'Rate phải về trần nhẹ 40');
    A.equal(enBefore, enAfter, 'số emitter BẬT không được giảm — không xoá hiệu ứng');
    A.equal(total, '6', 'không emitter nào bị mất');
    A.greaterThan(Number(changes), 0, 'phải đếm được số thay đổi thật');
  });

  suite.test('RESTORE-001 / RESTORE-002 / RESTORE-003: hoàn tác đưa đồ hoạ về nguyên bản', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Config = __RALO_REQ("Shared/Config")
      local Graphics = __RALO_REQ("Client/Optimizations/Graphics")
      local Restore = __RALO_REQ("Client/Core/Restore")
      Config.ResetToDefaults()
      local lighting = game:GetService("Lighting")
      lighting.QualityLevel = 10

      local before = lighting.QualityLevel
      Graphics.ApplyQualityLevel(nil, Config.PROFILE)
      local during = lighting.QualityLevel
      local entries = Restore.Count()

      local restored, failed = Restore.All()
      local after = lighting.QualityLevel
      return before .. "|" .. during .. "|" .. after .. "|" .. entries
        .. "|" .. restored .. "|" .. failed
    `)[0];
    const [before, during, after, entries, restored, failed] = out.split('|').map(Number);
    A.equal(before, 10, 'giá trị ban đầu của game');
    A.equal(during, 8, 'script chỉ hạ nhẹ về mức 8 theo cấu hình');
    A.greaterThan(entries, 0, 'phải có bản ghi để hoàn tác');
    A.equal(after, before, 'hoàn tác phải đưa về ĐÚNG giá trị ban đầu');
    A.greaterThan(restored, 0, 'phải khôi phục được ít nhất một property');
    A.equal(failed, 0, 'không được có lỗi khi hoàn tác');
  });

  suite.test('REC-002: hoàn tác KHÔNG ghi đè nếu game đã đổi giá trị sau đó', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Config = __RALO_REQ("Shared/Config")
      local Graphics = __RALO_REQ("Client/Optimizations/Graphics")
      local Restore = __RALO_REQ("Client/Core/Restore")
      Config.ResetToDefaults()
      local lighting = game:GetService("Lighting")
      lighting.QualityLevel = 10
      Graphics.ApplyQualityLevel(nil, Config.PROFILE)   -- script đặt 8
      lighting.QualityLevel = 9                        -- GAME/người dùng đổi thành 9
      Restore.All()
      return tostring(lighting.QualityLevel)
    `)[0];
    A.equal(out, '9', 'giá trị mới của game PHẢI được giữ, không bị hoàn tác đè');
  });

  suite.test('REC-003: một bước lỗi không chặn các bước còn lại', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Runner = __RALO_REQ("Client/Core/Runner")
      local boom = { Apply = function() error("lỗi cố ý trong bước") end }
      local fine = { Apply = function() return { changes = 3, detail = "ok" } end }
      local plan = { steps = {
        { id = "a", name = "A", module = boom, handler = "Apply", available = true,
          status = "pending", restorable = false },
        { id = "b", name = "B", module = fine, handler = "Apply", available = true,
          status = "pending", restorable = false },
      }, total = 2, profile = {} }
      Runner.Execute(plan, {})
      local tally = Runner.Tally(plan)
      return plan.steps[1].status .. "|" .. plan.steps[2].status
        .. "|" .. tally.failed .. "|" .. tally.applied .. "|" .. tally.changes
    `)[0];
    const [statusA, statusB, failed, applied, changes] = out.split('|');
    A.equal(statusA, 'failed', 'bước lỗi phải bị đánh dấu failed');
    A.equal(statusB, 'applied', 'bước sau vẫn phải chạy — không dừng giữa chừng');
    A.equal(failed, '1', 'đếm đúng 1 lỗi');
    A.equal(applied, '1', 'đếm đúng 1 bước thành công');
    A.equal(changes, '3', 'đếm đúng số thay đổi');
  });

  suite.test('QUERY-004 / QUERY-006: quét có trần, không treo trên thế giới lớn', (t, A) => {
    const h = createRuntime({ parts: 220 });
    const out = h.eval(`
      local Scan = __RALO_REQ("Client/Optimizations/Scan")
      local stats = Scan.Descendants({
        maxScan = 50,
        filter = function(inst) return inst.ClassName == "Part" end,
        onFound = function() return false end,
      })
      return stats.scanned .. "|" .. tostring(stats.truncated) .. "|" .. stats.totalDescendants
    `)[0];
    const [scanned, truncated, total] = out.split('|');
    A.equal(scanned, '50', 'chỉ quét đúng bằng trần');
    A.equal(truncated, 'true', 'phải báo rõ là đã bị cắt');
    A.greaterThan(Number(total), 50, 'thế giới thật phải lớn hơn trần');
  });

  suite.test('LOOP-005: pipeline không chờ GUI — tác vụ chạy độc lập hoạt ảnh', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Config = __RALO_REQ("Shared/Config")
      local Plan = __RALO_REQ("Client/Core/Plan")
      Config.ResetToDefaults()
      local plan = Plan.Build(Config.PROFILE)
      -- Kế hoạch phải được lập xong mà không cần GUI tồn tại
      return plan.total .. "|" .. tostring(__RALO_REQ("Client/Ui/Notifier").Get())
    `)[0];
    const [total, notifier] = out.split('|');
    A.greaterThan(Number(total), 0, 'kế hoạch phải có bước');
    A.equal(notifier, 'nil', 'không GUI nào được dựng khi buildUi = false');
  });

  suite.test('GRAPHICS-001 / GRAPHICS-002 / GRAPHICS-003: giảm nhẹ và giữ chế độ tự động/địa hình', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Config = __RALO_REQ("Shared/Config")
      local Graphics = __RALO_REQ("Client/Optimizations/Graphics")
      Config.ResetToDefaults()
      local lighting = game:GetService("Lighting")
      lighting.QualityLevel = 10
      lighting.GraphicsQualityMode = true
      local terrain = game:GetService("Workspace"):FindFirstChildOfClass("Terrain")
        or Instance.new("Terrain")
      terrain.Decoration = true
      terrain.Parent = game:GetService("Workspace")

      Graphics.ApplyQualityLevel(nil, Config.PROFILE)
      Graphics.ApplyTerrain(nil, Config.PROFILE)
      local terrainPreserved = terrain.Decoration
      Config.PROFILE.graphics.applyTerrainDecoration = true
      Config.PROFILE.graphics.terrainDecoration = false
      Graphics.ApplyTerrain(nil, Config.PROFILE)
      return lighting.QualityLevel .. "|" .. tostring(lighting.GraphicsQualityMode)
        .. "|" .. tostring(terrainPreserved) .. "|" .. tostring(terrain.Decoration)
    `)[0];
    const [quality, qualityMode, terrainPreserved, decoration] = out.split('|');
    A.equal(quality, '8', 'QualityLevel chỉ hạ nhẹ về 8');
    A.equal(qualityMode, 'true', 'mặc định phải tôn trọng GraphicsQualityMode của người chơi');
    A.equal(terrainPreserved, 'true', 'mặc định phải giữ cỏ/chi tiết địa hình');
    A.equal(decoration, 'false', 'chỉ đổi địa hình khi chủ game bật cờ opt-in');
  });

  suite.test('GRAPHICS-004: mặc định giữ ánh sáng, bóng đổ và hình nhân vật nguyên vẹn', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Config = __RALO_REQ("Shared/Config")
      local Graphics = __RALO_REQ("Client/Optimizations/Graphics")
      Config.ResetToDefaults()
      local lighting = game:GetService("Lighting")
      lighting.GlobalShadows = true
      lighting.Brightness = 2.5
      local workspace = game:GetService("Workspace")
      local propFolder = workspace:FindFirstChild("Props")
      local farPart = propFolder:FindFirstChild("Prop60")
      local players = game:GetService("Players")
      local character = players.LocalPlayer.Character
      local limb = character:FindFirstChild("Limb1")
      local humanoid = character:FindFirstChildOfClass("Humanoid")

      Graphics.ApplyShadowBudget({ id = "graphics.shadows" }, Config.PROFILE)
      Graphics.ApplyCharacter(nil, Config.PROFILE)
      return tostring(lighting.GlobalShadows) .. "|" .. lighting.Brightness
        .. "|" .. tostring(farPart.CastShadow) .. "|" .. tostring(limb.CastShadow)
        .. "|" .. tostring(humanoid.AutomaticScalingEnabled)
    `)[0];
    const [globalShadows, brightness, farShadow, characterShadow, autoScaling] = out.split('|');
    A.equal(globalShadows, 'true', 'GlobalShadows phải luôn bật như trước');
    A.equal(brightness, '2.5', 'độ sáng không được đổi');
    A.equal(farShadow, 'true', 'bóng của part xa không bị tắt theo mặc định');
    A.equal(characterShadow, 'true', 'bóng nhân vật phải còn');
    A.equal(autoScaling, 'true', 'tỉ lệ avatar không bị thay đổi');
  });

  suite.test('GRAPHICS-001: không nâng chất lượng lên trên mức người chơi đang dùng', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Config = __RALO_REQ("Shared/Config")
      local Graphics = __RALO_REQ("Client/Optimizations/Graphics")
      Config.ResetToDefaults()
      local lighting = game:GetService("Lighting")
      lighting.QualityLevel = 4
      Graphics.ApplyQualityLevel(nil, Config.PROFILE)
      return tostring(lighting.QualityLevel)
    `)[0];
    A.equal(out, '4', 'mức hiện tại thấp hơn ngưỡng thì phải giữ nguyên, không tăng lên 8');
  });

  suite.test('pipeline lỗi thì báo LỖI, không báo thành công', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Pipeline = __RALO_REQ("Client/Core/Pipeline")
      -- Ép lỗi bằng profile hỏng: measure không phải bảng
      local result = Pipeline.Run({
        profile = { measure = nil, gui = { enabled = false } },
        buildUi = false,
      })
      return tostring(result ~= nil) .. "|" .. tostring(result.error ~= nil)
        .. "|" .. tostring(result.verdict)
    `)[0];
    const [hasResult, hasError, verdict] = out.split('|');
    A.equal(hasResult, 'true', 'vẫn phải trả về bảng (không throw ra ngoài)');
    A.equal(hasError, 'true', 'phải ghi rõ là có lỗi');
    A.equal(verdict, 'error', 'verdict phải là error, không được là improved');
  });

  suite.test('GUI hết 30 giây không làm pipeline dài bị lỗi', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Config = __RALO_REQ("Shared/Config")
      local Pipeline = __RALO_REQ("Client/Core/Pipeline")
      local Notifier = __RALO_REQ("Client/Ui/Notifier")
      Config.Apply({
        measure = { baselineSeconds = 30.2, settleSeconds = 0, afterSeconds = 0.1, frameWindow = 60 },
      })
      local result = Pipeline.Run({ profile = Config.PROFILE, buildUi = true })
      return tostring(result.error == nil) .. "|" .. tostring(Notifier.Get() == nil)
    `)[0];
    const [completed, guiHidden] = out.split('|');
    A.equal(completed, 'true', 'pipeline phải tiếp tục sau khi bảng đã tự ẩn');
    A.equal(guiHidden, 'true', 'bảng vẫn phải tự dọn sau 30 giây');
  });

  suite.test('tích hợp: chạy xong rồi Shutdown thì không còn connection nào', (t, A) => {
    const h = createRuntime();
    const out = h.eval(`
      local Config = __RALO_REQ("Shared/Config")
      Config.Apply({
        measure = { baselineSeconds = 1.0, settleSeconds = 0, afterSeconds = 1.0, frameWindow = 60 },
        gui = { enabled = false },
        memory = { gcEverySeconds = 15 },
      })
      local Bootstrap = __RALO_REQ("Client/Bootstrap")
      local Memory = __RALO_REQ("Client/Optimizations/Memory")
      Bootstrap.__noAutoRun = true
      Bootstrap.Start({ buildUi = false })
      local during = __RALO_REQ("Client/Core/Scheduler").Stats().connections
        + __RALO_REQ("Client/Core/Registry").ConnectionCount()
      local gcWasScheduled = Memory.gcHandle ~= nil
      Bootstrap.Shutdown()
      local after = __RALO_REQ("Client/Core/Scheduler").Stats().connections
        + __RALO_REQ("Client/Core/Registry").ConnectionCount()
      return during .. "|" .. after .. "|" .. tostring(Bootstrap.State().started)
        .. "|" .. tostring(gcWasScheduled) .. "|" .. tostring(Memory.gcHandle == nil)
    `)[0];
    const [during, after, started, gcWasScheduled, gcStopped] = out.split('|');
    A.greaterThan(Number(during), 0, 'trong lúc chạy phải có connection/tác vụ');
    A.equal(after, '0', 'sau Shutdown không được để lại connection nào');
    A.equal(started, 'false', 'trạng thái phải về chưa chạy');
    A.equal(gcWasScheduled, 'true', 'GC định kỳ phải được quản lý như một tác vụ');
    A.equal(gcStopped, 'true', 'Shutdown phải huỷ cả tác vụ GC nền');
  });
};
