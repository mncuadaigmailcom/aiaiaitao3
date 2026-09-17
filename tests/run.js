// tests/run.js — nap va CHAY THAT script.js trong Lua 5.4 (wasmoon) voi moi truong gia lap.
//
//   node tests/run.js                -> chay toan bo test
//   node tests/run.js --boot-only    -> chi nap script, in loi neu co
//
// Luu y: script viet bang LUAU nen co phep gan ghep `x += 1`. Lua 5.4 khong hieu,
// nen ta "desugar" truoc khi nap (x += n  ->  x = x + n). Da kiem tra: khong co
// chuoi/ghi chu nao trong file chua "+=" nen phep thay nay an toan.
const fs = require('fs');
const path = require('path');
// wasmoon = Lua 5.4 bien dich sang WASM. Cai bang:  npm install wasmoon
// (mac dinh tim o ~/luavm/node_modules; doi cho khac thi dat bien moi truong LUAVM)
const WASMOON = process.env.LUAVM
    || require('path').join(require('os').homedir(), 'luavm/node_modules/wasmoon');
let LuaFactory;
try {
    LuaFactory = require(WASMOON).LuaFactory;
} catch (e) {
    console.log('\n❌ Khong tim thay wasmoon tai: ' + WASMOON);
    console.log('   Cai truoc khi chay test:   mkdir -p ~/luavm && cd ~/luavm && npm install wasmoon');
    console.log('   (hoac tro den cho khac:   LUAVM=/duong/dan/wasmoon node tests/run.js)');
    process.exit(4);
}

const ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(ROOT, 'script.js');

function desugar(src) {
    let n = 0;
    const out = src.replace(/([A-Za-z0-9_.\]]+)([ \t]*)(\+|-|\*)([ \t]*)=([ \t]*)/g,
        (m, a, b, op) => { n++; return `${a} = ${a} ${op} `; });
    return { code: out, count: n };
}

(async () => {
    const factory = new LuaFactory();
    const lua = await factory.createEngine();
    const g = lua.global;

    const errors = [];
    g.set('print', (...a) => { if (process.env.LUA_PRINT) console.log('  [lua]', ...a); });
    g.set('console_error', (...a) => { errors.push(a.join(' ')); });

    // 1) nap mock
    const mockSrc = fs.readFileSync(path.join(__dirname, 'roblox-mock.lua'), 'utf8');
    let boot;
    try {
        boot = lua.doStringSync(mockSrc, 'roblox-mock.lua');
    } catch (e) {
        console.log('❌ MOCK khong nap duoc:', e.message);
        process.exit(1);
    }

    // 2) desugar + nap script that
    const raw = fs.readFileSync(SCRIPT, 'utf8');
    let pass_count = 0, fail_count = 0;
    const { code: desugared, count } = desugar(raw);
    // Test-only: noi cac bien local cua main chunk ra _G.__T de test cham toi duoc.
    // FILE script.js KHONG bi sua — doan nay chi duoc noi vao ban nap trong bo nho test.
    const EXPORTS = `
_G.__T = {
  C=C, D=D, S=S, Store=Store, Hit=Hit,
  scripts=scripts, waypoints=waypoints, featureTabs=featureTabs,
  tabs=tabs, tabContent=tabContent, activeTabGetter=function() return activeTab end,
  main=main, gui=gui, togBtn=togBtn, titleBar=titleBar, tabBar=tabBar, contentArea=contentArea,
  savedCodeTab=savedCodeTab, codeTab=codeTab, supportTab=supportTab, createFeatureTab=createFeatureTab,
  RunCode=RunCode, ExecOnce=ExecOnce, Cancel=Cancel, RebuildScripts=RebuildScripts,
  SwitchTab=SwitchTab, OpenFirstPage=OpenFirstPage, AddTab=AddTab,
  Button=Button, Label=Label, New=New, Corner=Corner, Stroke=Stroke, Tween=Tween,
  featureTabIndex=featureTabIndex, minW=minW, minH=minH,
  saveBtn=saveBtn, codeIn=codeIn, nameIn=nameIn, runBtn=runBtn, stopBtn=stopBtn,
  statusLbl=statusLbl, searchIn=searchIn, repIn=repIn, delIn=delIn, unitBtn=unitBtn,
  coordUpdateConn=coordUpdateConn, totalRunsGetter=function() return totalRuns end,
  runActiveGetter=function() return runActive end,
}
`;
    const code = desugared + EXPORTS;
    const t0 = Date.now();
    let loadErr = null;
    try {
        lua.doStringSync(code, 'script.js');
    } catch (e) {
        loadErr = e;
    }
    const ms = Date.now() - t0;

    const stats = lua.doStringSync(`return {
        desugar = ${count},
        instances = #MOCK_INSTANCES,
        errors = #MOCK_ERRORS,
        firstErr = MOCK_ERRORS[1] or "",
    }`);

    console.log(`\n⚙️  Luau -> Lua 5.4 : ${stats.desugar} phep gan ghep "+=" da duoc desugar`);
    console.log(`⚙️  Nap script.js   : ${raw.length} byte · ${raw.split('\n').length} dong · ${ms}ms`);
    console.log(`⚙️  Instance da tao : ${stats.instances}`);

    if (loadErr) {
        console.log(`\n❌ SCRIPT KHONG NAP DUOC:\n   ${String(loadErr.message || loadErr).split('\n').slice(0, 6).join('\n   ')}`);
        process.exit(2);
    }
    if (stats.errors > 0) {
        console.log(`\n⚠️  ${stats.errors} loi runtime trong luc khoi dong. Loi dau tien:\n   ${stats.firstErr}`);
    } else {
        console.log(`✅ Script khoi dong sach — 0 loi runtime`);
    }

    if (process.argv.includes('--boot-only')) {
        console.log('\n(--boot-only: dung o day)');
        process.exit(stats.errors > 0 ? 3 : 0);
    }

    // 2b) GUARD TINH: chan nhung thoi quen xau quay lai. Cac guard nay doc truc tiep
    //     script.js nen bat duoc loi ma test runtime khong thay (vd ai do chep lai vong lap).
    const GUARDS = [
        {
            name: 'khong con vong lap do ten trung O(n^2) chep tay (phai dung S.UniqueName)',
            test: () => {
                const lines = raw.split(/\r?\n/);
                let bad = [];
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].trim() !== 'while true do') continue;
                    const ind = lines[i].length - lines[i].trimStart().length;
                    for (let j = i + 1; j < Math.min(i + 14, lines.length); j++) {
                        if (lines[j].trim() === 'end' && (lines[j].length - lines[j].trimStart().length) === ind) {
                            const body = lines.slice(i, j + 1).join('\n');
                            if (body.includes('ipairs(scripts)') && /\.name\s*==/.test(body)) bad.push(j + 1);
                            break;
                        }
                    }
                }
                if (bad.length) throw new Error('con ' + bad.length + ' khoi dedup chep tay tai dong ' + bad.join(', '));
            },
        },
        {
            name: 'S.UniqueName duoc dung o ca 5 cho luu ten (khong ai quay lai viet tay)',
            test: () => {
                const n = (raw.match(/S\.UniqueName\s*\(/g) || []).length;
                if (n < 6) throw new Error('chi thay ' + n + ' lan goi S.UniqueName (mong >= 6: 1 dinh nghia + 5 cho goi)');
            },
        },
        {
            name: 'S.WRAP_MARK_NEW (hang so chet) khong quay lai',
            test: () => {
                if (/S\.WRAP_MARK_NEW\s*=/.test(raw)) throw new Error('S.WRAP_MARK_NEW lai duoc khai bao');
            },
        },
        {
            name: 'S.CompatDrawing khong dung bien cuc bo ten `D` (che khuat bang thiet ke)',
            test: () => {
                const i = raw.indexOf('function S.CompatDrawing()');
                if (i < 0) throw new Error('khong tim thay S.CompatDrawing');
                const body = raw.slice(i, i + 1200);
                if (/local\s+D\s*=/.test(body)) throw new Error('van con `local D = ...` trong S.CompatDrawing');
            },
        },
    ];
    console.log('\n── guard tĩnh ──');
    let guardFail = 0;
    for (const g of GUARDS) {
        try { g.test(); pass_count++; console.log('   ✅ ' + g.name); }
        catch (e) { guardFail++; fail_count++; console.log('   ❌ ' + g.name + '\n      ↳ ' + e.message); }
    }

    // 3) chay cac file test
    const testFiles = fs.readdirSync(__dirname)
        .filter(f => /^test-.*\.lua$/.test(f))
        .sort();

    let pass = pass_count, fail = fail_count;
    const failures = [];
    for (const f of testFiles) {
        const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
        let res;
        try {
            res = lua.doStringSync(src, f);
        } catch (e) {
            console.log(`\n💥 ${f} — file test loi: ${String(e.message || e).split('\n')[0]}`);
            fail++; failures.push(`${f}: file test loi`);
            continue;
        }
        console.log(`\n━━ ${f} ━━`);
        for (const t of res || []) {
            if (t.ok) { pass++; console.log(`   ✅ ${t.name}`); }
            else { fail++; failures.push(`${t.name}: ${t.err}`); console.log(`   ❌ ${t.name}\n      ↳ ${t.err}`); }
        }
    }

    console.log(`\n${'═'.repeat(64)}`);
    console.log(`   KẾT QUẢ: ${pass} PASS · ${fail} FAIL · tổng ${pass + fail}`);
    console.log('═'.repeat(64));
    if (fail > 0) {
        console.log('\nCác test FAIL:');
        failures.forEach(f => console.log('  • ' + f));
    }
    process.exit(fail > 0 ? 1 : 0);
})();
