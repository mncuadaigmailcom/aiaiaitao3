#!/usr/bin/env node
/* =============================================================================
 * AIA Secure Script — kiểm thử lõi tab Lập trình (assets/ide.js)
 * Chạy: node tests/run-ide.mjs
 *
 * Kiểm chứng: tên tệp, không gian làm việc nhiều tệp, lưu/đọc localStorage,
 * tìm & thay thế, định dạng code, 5 ô lưu dự án và các giới hạn an toàn.
 * ========================================================================== */

import process from 'node:process';
import * as IDE from '../assets/ide.js';

let pass = 0;
const fails = [];
function ok(cond, name, detail = '') {
  if (cond) {
    pass++;
    console.log('  ✔ ' + name);
  } else {
    fails.push(name + (detail ? ' — ' + detail : ''));
    console.log('  ✘ ' + name + (detail ? ' — ' + detail : ''));
  }
}

const mem = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => {
      if (String(v).length > 3 * 1024 * 1024 && !m.__allowBig) throw new Error('QuotaExceededError');
      m.set(k, String(v));
    },
    removeItem: (k) => m.delete(k),
    _m: m,
  };
};

console.log('AIA Secure Script — kiểm thử tab Lập trình\n');

/* --------------------------------------------------------------- 1. tên --- */

console.log('[1] Tên tệp');
ok(IDE.sanitizeFileName('script.js') === 'script.js', 'tên thường giữ nguyên');
ok(IDE.sanitizeFileName('  demo.js  ') === 'demo.js', 'cắt khoảng trắng');
ok(IDE.sanitizeFileName('a/b:c*?.js') === 'a-b-c-.js', 'thay ký tự cấm', IDE.sanitizeFileName('a/b:c*?.js'));
ok(IDE.sanitizeFileName('') === 'script.js', 'rỗng → tên mặc định');
ok(IDE.sanitizeFileName('...') !== '...', 'không còn chỉ dấu chấm');
ok(IDE.sanitizeFileName('x'.repeat(200)).length <= 80, 'cắt tên quá dài');
ok(IDE.sanitizeFileName('tiếng việt.js') === 'tiếng việt.js', 'giữ chữ có dấu');

ok(IDE.uniqueFileName('script.js', []) === 'script.js', 'chưa trùng → giữ nguyên');
ok(IDE.uniqueFileName('script.js', [{ name: 'script.js' }]) === 'script-2.js', 'trùng → thêm -2', IDE.uniqueFileName('script.js', [{ name: 'script.js' }]));
ok(IDE.uniqueFileName('script.js', [{ name: 'Script.JS' }]) === 'script-2.js', 'so trùng không phân biệt hoa thường');
ok(IDE.uniqueFileName('a.js', [{ name: 'a.js' }, { name: 'a-2.js' }]) === 'a-3.js', 'nhảy qua số đã dùng');
ok(IDE.uniqueFileName('a.js', [{ name: 'a.js' }], 0) === 'a.js', 'bỏ qua chính nó khi đổi tên');
ok(IDE.nextFileName([]) === 'script.js', 'tên mới đầu tiên');
ok(IDE.nextFileName([{ name: 'script.js' }]) === 'script-2.js', 'tên mới kế tiếp');
ok(IDE.nextFileName([], '.lua') === 'script.lua', 'đổi được đuôi');

/* -------------------------------------------------- 2. không gian làm việc --- */

console.log('\n[2] Không gian làm việc');
const empty = IDE.createWorkspace();
ok(empty.files.length === 1 && empty.files[0].name === 'script.js' && empty.files[0].content === '', 'mặc định có 1 tệp rỗng');
ok(empty.active === 0, 'tệp đang mở là 0');

const ws = IDE.createWorkspace([
  { name: 'a.js', content: 'a();' },
  { name: 'a.js', content: 'b();' },
]);
ok(ws.files.length === 2, 'giữ đủ 2 tệp');
ok(ws.files[1].name === 'a-2.js', 'tự đổi tên trùng', ws.files[1].name);

const many = IDE.createWorkspace(Array.from({ length: 30 }, (_, i) => ({ name: 'f' + i + '.js', content: '' })));
ok(many.files.length === IDE.MAX_FILES, 'chặn quá ' + IDE.MAX_FILES + ' tệp', String(many.files.length));

const bad = IDE.createWorkspace([{ name: null, content: null }, {}]);
ok(bad.files.length === 2 && bad.files.every((f) => typeof f.content === 'string' && f.name), 'dữ liệu hỏng được chuẩn hoá');

ok(IDE.activeFile(ws).name === 'a.js', 'activeFile() đúng');
IDE.setActive(ws, 1);
ok(IDE.activeFile(ws).name === 'a-2.js', 'setActive() đổi tệp');
IDE.setActive(ws, 99);
ok(ws.active === 1, 'setActive() kẹp trong phạm vi');
IDE.setActive(ws, -5);
ok(ws.active === 0, 'setActive() không âm');

const added = IDE.addFile(ws, { name: 'b.js', content: 'c();' });
ok(added === 2 && ws.files[2].name === 'b.js', 'thêm tệp mới');
ok(ws.active === 2, 'tệp mới được chọn');
ok(IDE.addFile(ws, { name: 'b.js' }) === 3, 'thêm tệp trùng tên tự đổi', ws.files[3].name);
ok(ws.files[3].name === 'b-2.js', 'tên tệp trùng thành b-2.js', ws.files[3].name);

const full = IDE.createWorkspace(Array.from({ length: IDE.MAX_FILES }, (_, i) => ({ name: 'f' + i + '.js' })));
ok(IDE.addFile(full, { name: 'z.js' }) === -1, 'đầy tệp → trả -1');

ok(IDE.renameFile(ws, 0, 'main.js') === 'main.js', 'đổi tên tệp');
ok(ws.files[0].name === 'main.js', 'tên mới được ghi');
const renamedDup = IDE.renameFile(ws, 0, 'b.js');
ok(renamedDup !== 'b.js' && ws.files[0].name === renamedDup, 'đổi tên trùng tệp khác tự thêm hậu tố', String(renamedDup));

const single = IDE.createWorkspace([{ name: 'only.js', content: 'x' }]);
IDE.removeFile(single, 0);
ok(single.files.length === 1 && single.files[0].content === '', 'không xoá được tệp cuối, chỉ xoá trắng');
const rem = IDE.createWorkspace([{ name: 'a.js' }, { name: 'b.js' }, { name: 'c.js' }]);
rem.active = 2;
IDE.removeFile(rem, 2);
ok(rem.files.length === 2 && rem.active === 1, 'xoá tệp cuối danh sách → active lùi', String(rem.active));

ok(IDE.workspaceBytes(IDE.createWorkspace([{ name: 'a.js', content: 'Xin chào' }])) === 4 + 9, 'đếm byte UTF-8', String(IDE.workspaceBytes(IDE.createWorkspace([{ name: 'a.js', content: 'Xin chào' }]))));

/* ---------------------------------------------------------- 3. lưu / đọc --- */

console.log('\n[3] Lưu và đọc không gian làm việc');
const store = mem();
const ws2 = IDE.createWorkspace([{ name: 'x.js', content: 'console.log(1);' }, { name: 'y.lua', content: 'print(1)' }]);
ws2.active = 1;
const res = IDE.storeWorkspace(store, ws2);
ok(res.ok === true, 'ghi được vào storage');
ok(store.getItem(IDE.WORKSPACE_KEY).includes('console.log(1)'), 'nội dung nằm trong storage');
const back = IDE.loadWorkspace(store);
ok(back && back.files.length === 2 && back.files[1].content === 'print(1)' && back.active === 1, 'đọc lại đúng');
ok(IDE.loadWorkspace(mem()) === null, 'chưa có gì → null');
ok(IDE.parseWorkspace('không phải json') === null, 'JSON hỏng → null');
ok(IDE.parseWorkspace('{"files":[]}') === null, 'danh sách rỗng → null');
const clamped = IDE.parseWorkspace('{"active":99,"files":[{"name":"a.js","content":"1"}]}');
ok(clamped.active === 0, 'active ngoài phạm vi được kẹp', String(clamped.active));

const tiny = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } };
ok(IDE.storeWorkspace(tiny, ws2).ok === false, 'storage đầy → báo lỗi, không ném');
const big = IDE.createWorkspace([{ name: 'big.js', content: 'x'.repeat(IDE.MAX_WORKSPACE_BYTES + 10) }]);
const bigRes = IDE.storeWorkspace(mem(), big);
ok(bigRes.ok === false && bigRes.reason === 'too-big', 'quá lớn → không lưu', bigRes.reason);

/* --------------------------------------------------------- 4. tìm / thay --- */

console.log('\n[4] Tìm & thay thế');
const text = 'const a = 1;\nconst A = 2;\nconsole.log(a, A);\n';
ok(IDE.findMatches(text, '').length === 0, 'từ khoá rỗng → 0 kết quả');
ok(IDE.findMatches(text, 'const').length === 2, 'đếm đúng 2 lần "const"');
const ms = IDE.findMatches(text, 'a');
ok(ms.length === 4, 'tìm 1 ký tự, không phân biệt hoa thường', String(ms.length));
ok(ms[0].line === 1 && ms[1].start > ms[0].start, 'kết quả tăng dần theo vị trí');
const lines = IDE.findMatches(text, 'console').map((m) => m.line);
ok(lines[0] === 3, 'đúng số dòng', String(lines[0]));
ok(IDE.findMatches(text, 'A', { caseSensitive: true }).length === 2, 'phân biệt hoa thường', String(IDE.findMatches(text, 'A', { caseSensitive: true }).length));
ok(IDE.findMatches('aaaa', 'aa').length === 2, 'không đếm chồng lấn', String(IDE.findMatches('aaaa', 'aa').length));
ok(IDE.findMatches('abc', 'abc', { limit: 0 }).length === 1, 'limit 0 vẫn trả kết quả đầu');
ok(IDE.findMatches('x'.repeat(100), 'x', { limit: 10 }).length === 10, 'tôn trọng limit');
const viet = IDE.findMatches('Xin chào, chào bạn', 'chào');
ok(viet.length === 2 && viet[1].line === 1, 'tìm được tiếng Việt');

const arr = IDE.findMatches(text, 'const');
ok(IDE.findNextIndex(arr, 0) === 0, 'next từ đầu');
ok(IDE.findNextIndex(arr, arr[0].start + 1) === 1, 'next sau vị trí 1');
ok(IDE.findNextIndex(arr, 9999) === 0, 'next quay vòng');
ok(IDE.findPrevIndex(arr, 9999) === 1, 'prev từ cuối');
ok(IDE.findPrevIndex(arr, 0) === 1, 'prev quay vòng');
ok(IDE.findNextIndex([], 0) === -1 && IDE.findPrevIndex([], 0) === -1, 'không có kết quả → -1');

const rep = IDE.replaceAllText('a-a-a', 'a', 'b');
ok(rep.text === 'b-b-b' && rep.count === 3, 'thay tất cả', rep.text);
const rep2 = IDE.replaceAllText('Foo foo', 'foo', 'x', { caseSensitive: true });
ok(rep2.text === 'Foo x' && rep2.count === 1, 'thay có phân biệt hoa thường', rep2.text);
const rep3 = IDE.replaceAllText('a', 'a', '$& $1');
ok(rep3.text === '$& $1', 'ký tự $ trong chuỗi thay thế là chữ thường', rep3.text);
ok(IDE.replaceAllText('abc', 'zzz', 'x').count === 0, 'không có gì để thay → 0');

/* ------------------------------------------------------------ 5. định dạng --- */

console.log('\n[5] Định dạng code');
const jsonOk = IDE.formatCode('{"a":1,"b":[1,2]}', { lang: 'json' });
ok(jsonOk.ok === true && jsonOk.code.includes('\n  "a": 1'), 'JSON được làm đẹp', jsonOk.code);
const jsonBad = IDE.formatCode('{"a":}', { lang: 'json' });
ok(jsonBad.ok === false && /JSON/.test(jsonBad.message), 'JSON hỏng → báo lỗi', jsonBad.message);
const js = IDE.formatCode('function a(){return 1}', { lang: 'javascript' });
ok(js.ok === true && js.code.split('\n').length >= 2, 'JS được xuống dòng', JSON.stringify(js.code));
ok(IDE.formatCode('   ').ok === false, 'rỗng → báo lỗi');
const lua = IDE.formatCode('local function f()\nprint(1)\nend', { lang: 'lua' });
ok(lua.ok === true && lua.code.includes('  '), 'Lua được thụt lề', JSON.stringify(lua.code));
const css = IDE.formatCode('a{color:red}', { lang: 'css' });
ok(css.ok === false && /chưa hỗ trợ/i.test(css.message), 'CSS chưa hỗ trợ → nói rõ', css.message);
const auto = IDE.formatCode('{"x":1}');
ok(auto.ok === true && auto.lang === 'json', 'tự nhận JSON dù tên tệp là .js', auto.lang);
ok(IDE.formatCode('{ let a = 1; }', { lang: 'javascript' }).ok === true, 'khối JS mở bằng { không bị nhầm là JSON');
ok(IDE.formatCode('const a=1;', { lang: 'javascript' }).ok === true, 'JS một dòng vẫn định dạng được');

/* -------------------------------------------------------------- 6. ô lưu --- */

console.log('\n[6] Ô lưu dự án');
const slot = IDE.makeSlot({ name: '  Bản thử  ', files: [{ name: 'a.js', content: 'a();' }], now: 1700000000000 });
ok(slot.name === 'Bản thử', 'cắt khoảng trắng tên bản lưu');
ok(slot.at === 1700000000000 && slot.id, 'có thời gian + id');
ok(slot.files.length === 1 && slot.files[0].content === 'a();', 'lưu đúng nội dung');
ok(IDE.slotBytes(slot) > 0 && IDE.slotBytes(slot) < 100, 'đếm kích thước ô lưu');
ok(IDE.makeSlot({ files: [] }).files.length === 1, 'ô lưu luôn có ít nhất 1 tệp');

ok(IDE.normalizeSlots(null).length === 0, 'null → danh sách rỗng');
ok(IDE.normalizeSlots([{ files: [] }, null, 'x']).length === 0, 'bỏ bản hỏng');
const norm = IDE.normalizeSlots(Array.from({ length: 9 }, (_, i) => ({ id: 'i' + i, name: 'n' + i, files: [{ name: 'a.js', content: '' }] })));
ok(norm.length === IDE.MAX_SLOTS, 'cắt còn ' + IDE.MAX_SLOTS + ' ô', String(norm.length));

let slots = [];
for (let i = 0; i < IDE.MAX_SLOTS; i++) {
  const r = IDE.upsertSlot(slots, IDE.makeSlot({ id: 's' + i, name: 'Bản ' + i, files: [{ name: 'a.js', content: 'x' }] }));
  ok(r.ok === true, 'thêm ô lưu ' + (i + 1));
  slots = r.slots;
}
const overflow = IDE.upsertSlot(slots, IDE.makeSlot({ name: 'quá', files: [{ name: 'a.js', content: 'y' }] }));
ok(overflow.ok === false && overflow.reason === 'full', 'ô thứ 6 bị chặn', overflow.reason);

const replaced = IDE.upsertSlot(slots, IDE.makeSlot({ id: 's2', name: 'Bản 2 mới', files: [{ name: 'a.js', content: 'zzz' }] }));
ok(replaced.ok === true && replaced.replaced === true && replaced.slots.length === IDE.MAX_SLOTS, 'ghi đè cùng id, không thêm ô');
ok(replaced.slots.find((s) => s.id === 's2').files[0].content === 'zzz', 'nội dung được ghi đè');
ok(IDE.findSlot(replaced.slots, 's2').name === 'Bản 2 mới', 'findSlot theo id');
ok(IDE.findSlot(replaced.slots, 'không có') === null, 'id lạ → null');

const renamed = IDE.renameSlot(replaced.slots, 's1', 'Tên mới');
ok(renamed.find((s) => s.id === 's1').name === 'Tên mới', 'đổi tên ô lưu');
ok(IDE.renameSlot(replaced.slots, 's1', '   ')[1].name === replaced.slots[1].name, 'tên rỗng → giữ nguyên');

const removed = IDE.removeSlot(replaced.slots, 's0');
ok(removed.length === IDE.MAX_SLOTS - 1 && !removed.some((s) => s.id === 's0'), 'xoá ô lưu');

const tooBig = IDE.upsertSlot([], IDE.makeSlot({ name: 'to', files: [{ name: 'a.js', content: 'x'.repeat(IDE.MAX_SLOT_BYTES + 5) }] }));
ok(tooBig.ok === false && tooBig.reason === 'too-big', 'ô lưu quá lớn bị chặn', tooBig.reason);

const store2 = mem();
ok(IDE.persistSlots(store2, replaced.slots).ok === true, 'ghi danh sách ô lưu');
ok(IDE.loadSlots(store2).length === IDE.MAX_SLOTS, 'đọc lại đủ ô lưu');
store2.setItem(IDE.SLOTS_KEY, '{hỏng');
ok(IDE.loadSlots(store2).length === 0, 'dữ liệu hỏng → danh sách rỗng, không ném');
ok(IDE.persistSlots(tiny, replaced.slots).ok === false, 'storage đầy → trả false');

const info = IDE.describeSlot(replaced.slots[0]);
ok(info.fileCount === 1 && info.bytes > 0 && info.at > 0, 'describeSlot đủ thông tin', JSON.stringify(info));

/* --------------------------------------------------------------- 7. misc --- */

console.log('\n[7] Tiện ích khác');
ok(IDE.looksLikeScript('a.js') && IDE.looksLikeScript('b.LUA') && IDE.looksLikeScript('c.py'), 'nhận ra tên tệp script');
ok(IDE.looksLikeScript('notes.md') === false, 'không phải script → false');
ok(IDE.MAX_FILES === 12 && IDE.MAX_SLOTS === 5, 'giới hạn đúng thiết kế');

console.log('\n' + '─'.repeat(56));
console.log(`Kết quả IDE: ${pass} đạt · ${fails.length} lỗi`);
if (fails.length) {
  console.log('\nChi tiết:');
  for (const f of fails) console.log('  • ' + f);
  process.exitCode = 1;
} else {
  console.log('Lõi không gian làm việc chạy đúng.');
}
