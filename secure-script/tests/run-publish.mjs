#!/usr/bin/env node
/* =============================================================================
 * Kiểm thử "xuất bản": mã hoá + chống soi + GitHub
 *   · trang trắng 404
 *   · gói Luau (loader + tệp khoá) — giải mã lại bằng Node để đối chiếu
 *   · gói JavaScript (dùng lõi .aia + key script cũ)
 *   · link công khai / link dán vào game
 * ========================================================================== */

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  buildPublishPlan,
  buildWhitePage,
  buildJsBundle,
  buildLuauBundle,
  pagesBaseUrl,
  sanitizeDir,
  encryptForGame,
  makePublishId,
  PUBLISH_VERSION,
  PUBLISH_MAX_FILE_BYTES,
  publishPlanToGithub,
  ensurePages,
  pagesBuildStatus,
  waitForPagesBuild,
} from '../assets/publish.js';
import { MAGIC } from '../assets/core.js';

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

const CODE = [
  'local Players = game:GetService("Players")',
  'local plr = Players.LocalPlayer',
  'print("xin chào " .. plr.Name)',
  '-- script thử cho gói xuất bản',
  '',
].join('\n');


/** Kiểm tra cú pháp JavaScript của một chuỗi (dùng node --check trên tệp tạm). */
function jsSyntaxOk(text) {
  const file = path.join(os.tmpdir(), 'aia-ship-' + Math.random().toString(16).slice(2) + '.js');
  fs.writeFileSync(file, text);
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  } finally {
    fs.rmSync(file, { force: true });
  }
}

console.log('AIA Secure Script — kiểm thử xuất bản (mã hoá + chống soi + GitHub)\n');

/* ------------------------------------------------ 1. thư mục & link --- */

console.log('[1] Thư mục và link');
ok(sanitizeDir('') === 's', 'rỗng → "s"');
ok(sanitizeDir('/s/') === 's', 'bỏ dấu / hai đầu');
ok(sanitizeDir('a/b') === 'a/b', 'giữ thư mục con');
ok(sanitizeDir('a//b') === 'a/b', 'gộp //');
ok(sanitizeDir('a/../b') === 's', 'chặn ..');
ok(sanitizeDir('a b') === 's', 'chặn khoảng trắng');
ok(sanitizeDir('x'.repeat(300)).length <= 120, 'cắt thư mục quá dài');

ok(pagesBaseUrl('abc', 'repo') === 'https://abc.github.io/repo/', 'link Pages thường');
ok(pagesBaseUrl('ABC', 'Repo') === 'https://abc.github.io/Repo/', 'giữ nguyên tên repo, thường hoá chủ');
ok(pagesBaseUrl('abc', 'abc.github.io') === 'https://abc.github.io/', 'repo dạng <user>.github.io ở gốc');
ok(pagesBaseUrl('', 'repo') === '', 'thiếu chủ → rỗng');

ok(/^[0-9a-f]{8}$/.test(makePublishId()), 'mã gói 8 ký tự hex');

/* ------------------------------------------------ 2. trang trắng 404 --- */

console.log('\n[2] Trang trắng 404 (chống soi)');
const white = buildWhitePage();
ok(white.startsWith('<!doctype html>'), 'là tài liệu HTML');
ok(white.includes('404: Not Found'), 'có chữ "404: Not Found"');
ok(/background:#fff/.test(white), 'nền trắng');
ok(/noindex,nofollow/.test(white), 'chặn công cụ tìm kiếm');
ok(!/<script/i.test(white), 'KHÔNG có script nào');
ok(!/https?:\/\//.test(white), 'KHÔNG có link ra ngoài');
ok(!white.includes('AIA'), 'không lộ dấu vết sản phẩm');
ok(!buildWhitePage({ text: false }).includes('404: Not Found'), 'tuỳ chọn ẩn chữ 404');
ok(buildWhitePage({ title: '<x>' }).includes('&lt;x&gt;'), 'escape tiêu đề');

/* ------------------------------------------------ 3. mã hoá cho game --- */

console.log('\n[3] Mã hoá AES-256-GCM cho game');
const sealed = await encryptForGame(CODE);
ok(sealed.keyB64.length >= 43, 'khoá 32 byte (base64)');
ok(Buffer.from(sealed.nonceB64, 'base64').length === 12, 'nonce 12 byte');
ok(sealed.tagHex.length === 32, 'tag 16 byte (hex)');
ok(sealed.cipherBytes === Buffer.byteLength(CODE), 'độ dài bản mã = bản rõ (GCM không phình)');

const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(sealed.keyB64, 'base64'), Buffer.from(sealed.nonceB64, 'base64'));
decipher.setAuthTag(Buffer.from(sealed.tagHex, 'hex'));
const plain = Buffer.concat([decipher.update(Buffer.from(sealed.cipherB64, 'base64')), decipher.final()]).toString('utf8');
ok(plain === CODE, 'Node giải mã lại đúng từng ký tự');

const sealed2 = await encryptForGame(CODE);
ok(sealed2.keyB64 !== sealed.keyB64 && sealed2.cipherB64 !== sealed.cipherB64, 'mỗi lần xuất bản một khoá mới');

// Nhanh với code lớn
const bigCode = 'print("dữ liệu")\n'.repeat(8000); // ~120 KB
const t0 = Date.now();
const bigSealed = await encryptForGame(bigCode);
const bigMs = Date.now() - t0;
ok(bigSealed.cipherBytes === Buffer.byteLength(bigCode), 'mã hoá 120 KB đúng kích thước');
ok(bigMs < 3000, 'mã hoá 120 KB đủ nhanh', bigMs + ' ms');

/* ------------------------------------------------ 4. gói Luau --- */

console.log('\n[4] Gói Luau (chạy trong game)');
const luau = await buildLuauBundle({ code: CODE, keyUrl: 'https://x.test/s/k-1.txt', id: 'abcd1234' });
ok(luau.files.length === 2 && luau.files[0].path === 'k-abcd1234.txt', 'có tệp khoá đúng tên');
ok(luau.files[1].path === 'l-abcd1234.lua' && luau.files[1].content === luau.loader, 'loader nằm trong danh sách tệp');
ok(luau.loaderFile === 'l-abcd1234.lua', 'loader đúng tên');
ok(luau.loader.includes('aes_gcm_decrypt'), 'loader có hàm giải mã');
ok(!luau.loader.includes('xin chào'), 'loader KHÔNG chứa bản rõ');
ok(!luau.loader.includes('x.test'), 'loader KHÔNG chứa link khoá dạng đọc được');
ok(!luau.loader.includes(luau.sealed.keyB64), 'loader KHÔNG chứa khoá');
ok(luau.files[0].content === luau.sealed.keyB64, 'tệp khoá chứa đúng khoá base64');
ok(luau.loader.length < 20000, 'loader gọn (< 20 KB)', String(luau.loader.length));
ok(!/function\s*\(\s*\)\s*=>/.test(luau.loader), 'loader Luau không lẫn cú pháp JavaScript');

/* ------------------------------------------------ 5. gói JavaScript --- */

console.log('\n[5] Gói JavaScript (web)');
const js = await buildJsBundle({ code: 'console.log("xin chào");', keyUrl: 'https://x.test/s/key-1.js', id: 'beef0001' });
ok(js.files.length === 2, 'có 2 tệp: key + run');
ok(js.files[0].path === 'key-beef0001.js', 'tên key script');
ok(js.files[1].path === 'run-beef0001.js', 'tên snippet chạy');
ok(js.files[0].content.includes('keyWrap'), 'key script có keyWrap');
ok(!js.files[0].content.includes('console.log("xin chào")'), 'key script không chứa code');
ok(!js.files[1].content.includes('console.log("xin chào")'), 'snippet không chứa bản rõ');
ok(js.containerBytes.subarray(0, MAGIC.length).every((b, i) => b === MAGIC[i]), 'payload là tệp .aia hợp lệ');
ok(js.containerBytes.length < 10000, 'payload nhỏ (code ngắn)', String(js.containerBytes.length));
ok(jsSyntaxOk(js.files[0].content), 'key script hợp lệ cú pháp JS');
ok(jsSyntaxOk(js.files[1].content), 'snippet chạy được hợp lệ cú pháp JS');
ok(js.files[1].content.includes(Buffer.from('AIA_UNLOCK').toString('base64')), 'snippet gọi AIA_UNLOCK (tên bị mã hoá)');
ok(/\(0, eval\)|eval\(/.test(js.files[1].content), 'snippet chạy code sau khi giải mã');
ok(!js.files[1].content.includes('https://x.test'), 'snippet không lộ link khoá dạng đọc được');
const b64url = Buffer.from('https://x.test/s/key-1.js').toString('base64');
ok(js.files[1].content.includes(b64url.slice(0, 20)), 'link khoá trong snippet được mã hoá base64');

/* ------------------------------------------------ 6. kế hoạch đầy đủ --- */

console.log('\n[6] Kế hoạch xuất bản');
const plan = await buildPublishPlan({
  code: CODE,
  target: 'luau',
  owner: 'tester',
  repo: 'demo',
  dir: 's',
  id: 'abcd1234',
  whiteText: true,
});
ok(plan.version === PUBLISH_VERSION, 'có phiên bản gói');
ok(plan.files.length === 3, 'gồm 3 tệp: trang 404 + khoá + loader', String(plan.files.length));
ok(plan.files.some((f) => f.path === 's/index.html'), 'có s/index.html');
ok(plan.files.some((f) => f.path === 's/k-abcd1234.txt'), 'có tệp khoá');
ok(plan.files.some((f) => f.path === 's/l-abcd1234.lua'), 'có loader');
ok(plan.links.publicUrl === 'https://tester.github.io/demo/s/', 'link công khai đúng', plan.links.publicUrl);
ok(plan.links.scriptUrl === 'https://tester.github.io/demo/s/l-abcd1234.lua', 'link dán vào game đúng', plan.links.scriptUrl);
ok(plan.links.rawUrl.startsWith('https://raw.githubusercontent.com/tester/demo/main/s/l-'), 'có link raw dự phòng');
ok(plan.links.keyUrl === 'https://tester.github.io/demo/s/k-abcd1234.txt', 'loader trỏ đúng tệp khoá');
const allText = plan.files.map((f) => f.content).join('\n');
ok(!allText.includes('xin chào'), 'không tệp nào chứa code gốc');
ok(plan.files.find((f) => f.path.endsWith('.html')).content.includes('404: Not Found'), 'trang công khai hiện 404');

const planNoCloak = await buildPublishPlan({ code: CODE, target: 'luau', owner: 'tester', repo: 'demo', dir: 'x', id: 'aa11', cloak: false });
ok(!planNoCloak.files.some((f) => f.path.endsWith('index.html')), 'tắt chống soi → không có trang 404');
ok(planNoCloak.links.publicUrl === '', 'tắt chống soi → không có link công khai');

const planJs = await buildPublishPlan({ code: 'console.log(1)', target: 'js', owner: 'tester', repo: 'demo', dir: 'js', id: 'cc22' });
ok(planJs.files.some((f) => f.path === 'js/run-cc22.js'), 'target js → snippet run-*.js');
ok(planJs.links.scriptUrl === 'https://tester.github.io/demo/js/run-cc22.js', 'link game cho JS đúng');

// lỗi đầu vào
for (const [label, fn] of [
  ['thiếu repo', () => buildPublishPlan({ code: CODE, owner: '', repo: '' })],
  ['code rỗng', () => buildPublishPlan({ code: '   ', owner: 'a', repo: 'b' })],
]) {
  let threw = false;
  try {
    await fn();
  } catch {
    threw = true;
  }
  ok(threw, 'báo lỗi khi ' + label);
}

/* ------------------------------------------------ 7. hiệu năng --- */

console.log('\n[7] Hiệu năng trên code lớn (200 KB)');
const huge = 'local x = 1\n'.repeat(16000); // ~176 KB
const t1 = Date.now();
const hugePlan = await buildPublishPlan({ code: huge, target: 'luau', owner: 'a', repo: 'b', dir: 's', id: 'ffff' });
const hugeMs = Date.now() - t1;
ok(hugePlan.files.length === 3, 'vẫn đủ 3 tệp');
ok(hugeMs < 5000, 'lập kế hoạch 176 KB < 5 s', hugeMs + ' ms');


/* ------------------------------------- 7b. code lớn & giới hạn GitHub --- */

console.log('\n[7b] Code lớn 1,5 MB và giới hạn GitHub');
{
  const bigCode = 'print("dòng thử")\n'.repeat(90000); // ~1,5 MB
  const t = Date.now();
  const plan = await buildPublishPlan({ code: bigCode, target: 'luau', owner: 'a', repo: 'b', dir: 's', id: 'ffff0000' });
  const ms = Date.now() - t;
  ok(plan.files.length === 3, 'vẫn đủ 3 tệp');
  const loader = plan.files.find((f) => f.path.endsWith('.lua'));
  ok(loader.content.length > bigCode.length, 'loader chứa đủ bản mã');
  ok(loader.content.length < bigCode.length * 1.8, 'phình không quá 1,8×', (loader.content.length / bigCode.length).toFixed(2) + '×');
  ok(ms < 5000, '1,5 MB xong dưới 5 s', ms + ' ms');
  ok(PUBLISH_MAX_FILE_BYTES < 5 * 1024 * 1024, 'ngưỡng chặn thấp hơn giới hạn GitHub');

  // vượt giới hạn → báo lỗi rõ ràng thay vì đẩy lên rồi thất bại
  let msg = '';
  try {
    await buildPublishPlan({ code: 'x'.repeat(3.6 * 1024 * 1024), target: 'luau', owner: 'a', repo: 'b', dir: 's', id: 'ee00' });
  } catch (e) {
    msg = e.message;
  }
  ok(/vượt giới hạn 5 MB/.test(msg), 'quá 4,5 MB → báo lỗi kèm cách xử lý', msg.slice(0, 80));
}

/* ------------------------------------------------ 8. đẩy lên GitHub --- */

/** GitHub giả: ghi nhớ mọi lời gọi, đủ để kiểm tra luồng đẩy tệp. */
function fakeGithub({ repos = {}, pages = {} } = {}) {
  const calls = [];
  const store = new Map(Object.entries(repos)); // 'owner/repo' -> repo object
  const files = new Map(); // 'owner/repo/path' -> {sha, content}
  const pagesState = new Map(Object.entries(pages));
  let shaSeq = 0;

  const notFound = (what) => Object.assign(new Error('Not Found: ' + what), { status: 404 });
  const client = {
    token: 'ghp_test',
    calls,
    store,
    files,
    async getRepo(owner, repo) {
      calls.push(['getRepo', owner + '/' + repo]);
      const r = store.get(owner + '/' + repo);
      if (!r) throw notFound('repo');
      return r;
    },
    async createRepo({ name, description = '', private: isPrivate = true }) {
      calls.push(['createRepo', name, isPrivate]);
      const r = {
        name,
        full_name: 'tester/' + name,
        owner: { login: 'tester' },
        default_branch: 'main',
        private: !!isPrivate,
        has_pages: false,
        description,
      };
      store.set('tester/' + name, r);
      return r;
    },
    async getFile(owner, repo, path) {
      calls.push(['getFile', path]);
      const f = files.get(owner + '/' + repo + '/' + path);
      if (!f) throw notFound('file ' + path);
      return { sha: f.sha, content: Buffer.from(f.content).toString('base64') };
    },
    async putFile({ owner, repo, path, content, sha }) {
      calls.push(['putFile', path, sha ? 'update' : 'create']);
      const next = 'sha' + ++shaSeq;
      files.set(owner + '/' + repo + '/' + path, { sha: next, content });
      return { content: { sha: next } };
    },
    async request(path, opts = {}) {
      calls.push(['request', (opts.method || 'GET') + ' ' + path]);
      const m = path.match(/^\/repos\/([^/]+)\/([^/]+)\/pages$/);
      if (m && !path.includes('/builds')) {
        const key = m[1] + '/' + m[2];
        if (opts.method === 'POST') {
          pagesState.set(key, { html_url: 'https://' + m[1] + '.github.io/' + m[2] + '/' });
          return pagesState.get(key);
        }
        const p = pagesState.get(key);
        if (!p) throw notFound('pages');
        return p;
      }
      const b = path.match(/^\/repos\/([^/]+)\/([^/]+)\/pages\/builds\/latest$/);
      if (b) {
        const st = pagesState.get(b[1] + '/' + b[2]);
        if (!st) throw notFound('builds');
        return { status: st.build || 'built', updated_at: '2026-01-01' };
      }
      throw notFound(path);
    },
  };
  return client;
}

console.log('\n[8] Một nút đưa lên GitHub');
{
  const gh = fakeGithub();
  const progress = [];
  const ship = await publishPlanToGithub({
    plan: await buildPublishPlan({ code: CODE, target: 'luau', owner: 'tester', repo: 'game-hub', dir: 's', id: 'abcd1234' }),
    client: gh,
    publicRepo: true,
    onProgress: (m) => progress.push(m),
  });
  ok(ship.created, 'tự tạo dự án khi chưa có');
  ok(gh.calls.some((c) => c[0] === 'createRepo' && c[2] === false), 'dự án tạo ở chế độ công khai');
  ok(ship.owner === 'tester' && ship.branch === 'main', 'lấy đúng chủ + nhánh mặc định');
  ok(ship.files.length === 3, 'ghi đủ 3 tệp', String(ship.files.length));
  ok(gh.files.has('tester/game-hub/s/index.html'), 'có index.html trên repo');
  ok(gh.files.has('tester/game-hub/s/k-abcd1234.txt'), 'có tệp khoá trên repo');
  ok(gh.files.has('tester/game-hub/s/l-abcd1234.lua'), 'có loader trên repo');
  ok(!gh.files.get('tester/game-hub/s/index.html').content.includes('aes_gcm'), 'trang công khai vô hại');
  ok(ship.pages.enabled && !ship.pages.created === false, 'bật Pages thành công');
  ok(ship.links.scriptUrl === 'https://tester.github.io/game-hub/s/l-abcd1234.lua', 'link dán vào game', ship.links.scriptUrl);
  ok(ship.links.publicUrl === 'https://tester.github.io/game-hub/s/', 'link công khai', ship.links.publicUrl);
  ok(ship.links.keyUrl.endsWith('/s/k-abcd1234.txt'), 'link khoá đúng');
  ok(/^https:\/\/raw\.githubusercontent\.com\/tester\/game-hub\/main\/s\/l-abcd1234\.lua$/.test(ship.links.rawUrl), 'link raw dự phòng');
  ok(ship.note.includes('30–90'), 'có ghi chú thời gian build');
  ok(progress.length >= 3, 'có báo tiến độ', String(progress.length));

  // đẩy lần 2: tệp đã có → cập nhật (gửi sha)
  gh.calls.length = 0;
  const again = await publishPlanToGithub({
    plan: await buildPublishPlan({ code: CODE + 'print("lan 2")', target: 'luau', owner: 'tester', repo: 'game-hub', dir: 's', id: 'abcd1234' }),
    client: gh,
  });
  ok(!again.created, 'lần 2 không tạo lại dự án');
  ok(again.files.every((f) => f.updated), 'lần 2 là cập nhật, không tạo trùng');
  ok(gh.files.get('tester/game-hub/s/l-abcd1234.lua').content.includes('aes_gcm'), 'loader mới đã ghi đè');

  // repo đã có Pages
  const gh2 = fakeGithub({
    repos: { 'tester/x': { name: 'x', full_name: 'tester/x', owner: { login: 'tester' }, default_branch: 'main' } },
    pages: { 'tester/x': { html_url: 'https://tester.github.io/x/' } },
  });
  const pagesInfo = await ensurePages(gh2, 'tester', 'x', 'main');
  ok(pagesInfo.enabled && !pagesInfo.created, 'Pages đã bật sẵn → không bật lại');

  // Pages bị chặn (403)
  const gh3 = fakeGithub({
    repos: { 'tester/y': { name: 'y', full_name: 'tester/y', owner: { login: 'tester' }, default_branch: 'main' } },
  });
  gh3.request = async (p, o = {}) => {
    if (p.includes('/pages')) throw Object.assign(new Error('Resource not accessible by integration'), { status: 403 });
    const notFound = Object.assign(new Error('nf'), { status: 404 });
    throw notFound;
  };
  const blocked = await publishPlanToGithub({
    plan: await buildPublishPlan({ code: CODE, target: 'luau', owner: 'tester', repo: 'y', dir: 's', id: 'aa99' }),
    client: gh3,
  });
  ok(!blocked.pages.enabled && blocked.note.includes('raw'), 'Pages bị chặn → vẫn có link raw + ghi chú');

  // không tạo repo khi đã tắt createIfMissing
  const gh4 = fakeGithub();
  let threw = false;
  try {
    await publishPlanToGithub({
      plan: await buildPublishPlan({ code: CODE, target: 'luau', owner: 'tester', repo: 'missing', dir: 's', id: 'bb77' }),
      client: gh4,
      createIfMissing: false,
    });
  } catch (e) {
    threw = e.status === 404;
  }
  ok(threw, 'createIfMissing=false → báo lỗi 404 thay vì tạo repo');
}

/* ------------------------------------------------ 9. trạng thái Pages --- */

console.log('\n[9] Chờ Pages build');
{
  const gh = fakeGithub({ pages: { 'tester/x': { html_url: 'https://tester.github.io/x/', build: 'building' } } });
  const first = await pagesBuildStatus(gh, 'tester', 'x');
  ok(first.status === 'building', 'đọc được trạng thái build');

  let ticks = 0;
  const done = await waitForPagesBuild(gh, 'tester', 'x', {
    timeoutMs: 30000,
    intervalMs: 1,
    sleep: async () => {
      ticks++;
      if (ticks === 2) gh.store.set('tester/x', gh.store.get('tester/x') || {});
      // lần thứ 2 chuyển sang built
      gh.request = (p, o) => {
        if (p.includes('/pages/builds/latest')) return Promise.resolve({ status: ticks >= 2 ? 'built' : 'building' });
        return Promise.reject(Object.assign(new Error('nf'), { status: 404 }));
      };
    },
  });
  ok(done.status === 'built', 'chờ tới khi built');

  const ghErr = fakeGithub({ pages: { 'tester/z': { html_url: '', build: 'errored' } } });
  const bad = await waitForPagesBuild(ghErr, 'tester', 'z', { timeoutMs: 5000, intervalMs: 1, sleep: async () => {} });
  ok(bad.status === 'errored', 'build lỗi → dừng ngay');

  const ghNone = fakeGithub({ pages: {} });
  const unknown = await waitForPagesBuild(ghNone, 'tester', 'none', { timeoutMs: 5, intervalMs: 1, sleep: async () => {} });
  ok(unknown.status === 'unknown' || unknown.status === 'building', 'không có build → trả unknown');
}

console.log('\n────────────────────────────────────────────────────────');
console.log(`Kết quả xuất bản: ${pass} đạt · ${fails.length} lỗi`);
if (fails.length) {
  console.log('\nChi tiết:');
  for (const f of fails) console.log('  • ' + f);
  process.exitCode = 1;
} else {
  console.log('Gói xuất bản đúng: trang 404 trắng + tệp khoá + loader chạy trong game.');
}
