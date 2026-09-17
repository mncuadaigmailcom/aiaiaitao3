#!/usr/bin/env node
/*
    tests/run.js — CHẠY BỘ TEST: nạp thật `script.js` (Banana Cat Hub) trong máy ảo Lua 5.4
    (wasmoon) + môi trường Roblox/executor giả lập (tests/roblox-mock.lua), rồi chạy
    tests/tests.lua để kiểm tra hành vi.

        node tests/run.js [đường-dẫn-script] [lọc-tên-test]

    Không sửa file gốc: đoạn "TEST HOOK" export biến local được CHÈN THÊM khi chạy test.
*/
const fs = require('fs');
const path = require('path');
const { LuaFactory } = require('wasmoon');

const HERE = __dirname;
const TARGET = process.argv[2] || path.join(HERE, '..', 'script.js');
const FILTER = process.argv[3] || '';

// Luau có phép gán ghép (+= …) mà Lua 5.4 không có -> đổi về dạng thường trước khi nạp.
function desugar(src) {
    const before = (src.match(/[A-Za-z_][\w.\[\]]*\s*(?:\+=|-=|\*=|\/=|%=|\.\.=)/g) || []).length;
    const out = src.replace(/([A-Za-z_][\w.\[\]]*)\s*(\+=|-=|\*=|\/=|%=|\.\.=)\s*/g,
        (m, lhs, op) => `${lhs} = ${lhs} ${op.slice(0, -1)} `);
    return { src: out, count: before };
}

// Đoạn này được nối VÀO CUỐI chunk chính của hub (cùng phạm vi biến) để test đọc được
// các biến local (S/D/Store/...). Không bao giờ nằm trong file gốc.
const EXPORT_BLOCK = `

-- ===== TEST HOOK (do tests/run.js chèn, KHÔNG có trong file gốc) =====
_G.__HUBTEST = {
    S = S, D = D, C = C, Store = Store,
    scripts = scripts, waypoints = waypoints, featureTabs = featureTabs,
    RunCode = RunCode, ExecOnce = ExecOnce, Cancel = Cancel,
    main = main, gui = gui, togBtn = togBtn, tabs = tabs, AddTab = AddTab,
    player = player, Players = Players, RunService = RunService,
    UserInputService = UserInputService, workspace = workspace, targetGui = targetGui,
    ReleaseHubFocus = ReleaseHubFocus, Hit = Hit, SwitchTab = SwitchTab,
    flash = flash, MakeTabFrame = MakeTabFrame, MakeTabButton = MakeTabButton,
    CreateFeatureTab = CreateFeatureTab, CopyToClipboard = S.CopyToClipboard,
    S_Move = S.Move, RebuildHubList = S.RebuildHubList, RunHubAction = S.RunHubAction,
    -- Store.load() GÁN LẠI local scripts/waypoints (scripts = sOut), nên mọi tham chiếu
    -- lấy ra từ đây trước đó sẽ cũ -> test phải đọc qua hàm.
    getScripts = function() return scripts end,
    getWaypoints = function() return waypoints end,
}
`;

function fmtList(arr, max) {
    const shown = arr.slice(0, max || 12);
    return shown.map(x => '      · ' + x).join('\n') + (arr.length > shown.length ? `\n      · … và ${arr.length - shown.length} mục khác` : '');
}

(async () => {
    if (!fs.existsSync(TARGET)) { console.error('❌ không thấy file:', TARGET); process.exit(1); }
    const raw = fs.readFileSync(TARGET, 'utf8').replace(/\r\n/g, '\n');
    const { src, count } = desugar(raw);

    const factory = new LuaFactory();
    const lua = await factory.createEngine();

    // 1) nạp mock
    const t0 = Date.now();
    await lua.doString(fs.readFileSync(path.join(HERE, 'roblox-mock.lua'), 'utf8'));

    // 2) nạp hub thật
    let loadErr = null;
    try {
        await lua.doString(src + EXPORT_BLOCK);
    } catch (e) {
        loadErr = e && (e.message || e.toString()) || String(e);
    }

    const target = path.relative(process.cwd(), TARGET);
    console.log('════════════════════════════════════════════════════════════');
    console.log(`  BANANA CAT HUB — BỘ TEST TỰ ĐỘNG (wasmoon / Lua 5.4 + mock Roblox)`);
    console.log(`  file: ${target}  ·  ${raw.split('\n').length} dòng  ·  desugar ${count} phép gán ghép Luau`);
    console.log('════════════════════════════════════════════════════════════');

    if (loadErr) {
        console.log('\n❌ HUB KHÔNG NẠP ĐƯỢC:\n   ' + String(loadErr).split('\n').join('\n   '));
        const errs = await lua.doString('return _G.Mock and table.concat((function() local t={} for _,e in ipairs(_G.Mock.errors) do t[#t+1]=e end return t end)(), "\\n   ") or ""');
        if (errs) console.log('   lỗi runtime trong mock:\n   ' + errs);
        process.exit(1);
    }
    console.log(`✅ nạp hub OK (${Date.now() - t0} ms)\n`);

    // 3) chạy test
    const testSrc = fs.readFileSync(path.join(HERE, 'tests.lua'), 'utf8');
    let out = '';
    try {
        out = await lua.doString(`local f = assert(load((${JSON.stringify(testSrc)}), "=tests.lua")) return f(${JSON.stringify(FILTER)})`);
    } catch (e) {
        console.log('❌ BỘ TEST BỊ LỖI:\n' + String(e && (e.message || e) || e));
        process.exit(1);
    }

    // 4) tổng kết
    const res = await lua.doString(`
        local r = _G.__TESTRESULT or {}
        local unk = (function()
            local t = {}
            for k, n in pairs(_G.Mock.unknownKeys) do t[#t+1] = k .. " x" .. n end
            table.sort(t)
            return table.concat(t, "\\n")
        end)()
        local errs = table.concat(_G.Mock.errors, "\\n")
        return { pass = r.pass or 0, fail = r.fail or 0, failed = table.concat(r.failed or {}, "\\n"),
                 unknown = unk, errors = errs }
    `);

    console.log(out);
    console.log('────────────────────────────────────────────────────────────');
    console.log(`  KẾT QUẢ: ${res.pass} PASS · ${res.fail} FAIL`);
    if (res.fail > 0) console.log('\n  CÁC TEST THẤT BẠI:\n' + res.failed.split('\n').map(l => '   ' + l).join('\n'));
    if (res.errors && res.errors.trim() !== '') {
        console.log('\n  ⚠ LỖI PHÁT SINH KHI CHẠY (event/render step):');
        console.log(fmtList(res.errors.split('\n'), 15));
    } else {
        console.log('  ⚠ lỗi runtime trong event/render step: không có');
    }
    if (res.unknown && res.unknown.trim() !== '') {
        console.log('\n  ℹ property/event mà mock chưa biết (đọc trả nil — để soi typo):');
        console.log(fmtList(res.unknown.split('\n'), 15));
    }
    console.log('────────────────────────────────────────────────────────────');
    process.exit(res.fail > 0 ? 1 : 0);
})().catch(e => { console.error('❌ LỖI RUNNER:', e); process.exit(2); });
