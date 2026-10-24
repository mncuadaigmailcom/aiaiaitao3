#!/usr/bin/env node
/* =============================================================================
 * AIA Secure Script — kiểm thử client GitHub (assets/github.js)
 * Chạy: node tests/run-github.mjs
 *
 * Dùng một "GitHub giả" trong RAM (fetchImpl) để kiểm tra đúng giao thức:
 *   GET /user · /rate_limit · /user/repos · POST /user/repos
 *   GET /repos/:o/:r · /git/trees/:branch · /contents/:path
 *   PUT /contents/:path (tạo mới không cần sha, cập nhật PHẢI có sha)
 *   DELETE /contents/:path (cần sha)
 * Cùng với: base64 UTF-8, kiểm tra tên repo/đường dẫn, đọc link repo, lưu token.
 * ========================================================================== */

import process from 'node:process';
import {
  GH_API_BASE,
  GH_MAX_FILE_BYTES,
  GithubClient,
  GithubError,
  b64DecodeUtf8,
  b64EncodeUtf8,
  encodePath,
  explainStatus,
  fileHtmlUrl,
  fileRawUrl,
  repoHtmlUrl,
  loadLastRepo,
  loadToken,
  parseRepoRef,
  saveLastRepo,
  saveToken,
  slugRepoName,
  validatePath,
  validateRepoName,
} from '../assets/github.js';

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

async function expectError(fn, code, name) {
  try {
    await fn();
    ok(false, name, 'không ném lỗi');
  } catch (err) {
    ok(err instanceof GithubError && (Array.isArray(code) ? code.includes(err.code) : err.code === code), name, `nhận ${err.code}: ${err.message}`);
  }
}

/* ------------------------------------------------------- GitHub giả --- */

function makeFakeGithub({ token = 'good', pages = false } = {}) {
  const repos = new Map(); // fullName → repo
  const files = new Map(); // "fullName:path" → { text, sha }
  const calls = [];
  let seq = 0;
  const sha = () => (++seq).toString(16).padStart(40, 'a').slice(0, 40);

  function send(status, body) {
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => (body === undefined ? '' : JSON.stringify(body)),
    };
  }

  function addRepo(fullName, extra = {}) {
    const [owner, name] = fullName.split('/');
    const repo = {
      id: ++seq,
      name,
      full_name: fullName,
      private: true,
      default_branch: 'main',
      language: 'JavaScript',
      has_pages: pages,
      owner: { login: owner },
      ...extra,
    };
    repos.set(fullName, repo);
    return repo;
  }

  async function fetchImpl(url, init = {}) {
    const method = init.method || 'GET';
    const headers = init.headers || {};
    calls.push({ method, url, headers, body: init.body });
    if (String(headers.Authorization || '') !== 'Bearer ' + token) {
      return send(401, { message: 'Bad credentials' });
    }
    const u = new URL(url);
    const path = u.pathname.replace(/^\/+/, '');
    const body = init.body ? JSON.parse(init.body) : null;

    if (path === 'user' && method === 'GET') return send(200, { login: 'tester', name: 'Tester' });
    if (path === 'rate_limit' && method === 'GET') return send(200, { resources: { core: { remaining: 4321 } } });

    if (path === 'user/repos' && method === 'GET') return send(200, [...repos.values()]);

    if (path === 'user/repos' && method === 'POST') {
      if (!body || !body.name) return send(422, { message: 'name is required' });
      const full = 'tester/' + body.name;
      if (repos.has(full)) return send(422, { message: 'name already exists on this account' });
      return send(201, addRepo(full, { private: !!body.private }));
    }

    const repoMatch = /^repos\/([^/]+)\/([^/]+)(?:\/(.*))?$/.exec(path);
    if (!repoMatch) return send(404, { message: 'Not Found' });
    const [, owner, name, rest = ''] = repoMatch;
    const full = owner + '/' + name;
    const repo = repos.get(full);
    if (!repo) return send(404, { message: 'Not Found' });

    if (!rest && method === 'GET') return send(200, repo);

    if (/^branches/.test(rest) && method === 'GET') {
      return send(200, [{ name: repo.default_branch, commit: { sha: sha() } }]);
    }

    if (/^git\/trees/.test(rest) && method === 'GET') {
      const tree = [];
      for (const [key, value] of files.entries()) {
        const [r, ...bits] = key.split(':');
        if (r !== full) continue;
        const p = bits.join(':');
        tree.push({ path: p, type: 'blob', size: new TextEncoder().encode(value.text).length, sha: value.sha });
      }
      return send(200, { sha: 'tree', tree, truncated: false });
    }

    if (/^contents\//.test(rest)) {
      const filePath = decodeURIComponent(rest.replace(/^contents\//, ''));
      const key = full + ':' + filePath;
      const entry = files.get(key);
      if (method === 'GET') {
        if (!entry) return send(404, { message: 'Not Found' });
        const b64 = b64EncodeUtf8(entry.text);
        const wrapped = b64.replace(/(.{60})/g, '$1\n');
        return send(200, { name: filePath, path: filePath, sha: entry.sha, size: entry.text.length, encoding: 'base64', content: wrapped });
      }
      if (method === 'PUT') {
        if (!body) return send(422, { message: 'body required' });
        if (entry && !body.sha) return send(422, { message: '"sha" wasn\'t supplied.' });
        if (entry && body.sha !== entry.sha) return send(409, { message: 'sha does not match' });
        if (!entry && body.sha) return send(422, { message: 'sha given but file does not exist' });
        const text = b64DecodeUtf8(body.content || '');
        const next = { text, sha: sha() };
        files.set(key, next);
        return send(200, { content: { path: filePath, sha: next.sha, size: text.length }, commit: { sha: sha() } });
      }
      if (method === 'DELETE') {
        if (!entry) return send(404, { message: 'Not Found' });
        if (!body || body.sha !== entry.sha) return send(409, { message: 'sha does not match' });
        files.delete(key);
        return send(200, { commit: { sha: sha() } });
      }
    }

    return send(404, { message: 'Not Found' });
  }

  return { fetchImpl, repos, files, calls, addRepo, sha };
}

/* ------------------------------------------------------------- 1. base64 --- */

console.log('AIA Secure Script — kiểm thử GitHub\n');

console.log('[1] base64 UTF-8');
ok(b64EncodeUtf8('hello') === 'aGVsbG8=', 'chuỗi ASCII');
ok(b64DecodeUtf8('aGVsbG8=') === 'hello', 'giải base64 ASCII');
const vi = 'Xin chào Việt Nam — đồ án 🚀';
ok(b64DecodeUtf8(b64EncodeUtf8(vi)) === vi, 'tiếng Việt + emoji khứ hồi đúng');
ok(b64DecodeUtf8(b64EncodeUtf8(vi).replace(/(.{8})/g, '$1\n')) === vi, 'base64 có xuống dòng vẫn giải được');
ok(b64DecodeUtf8('') === '', 'base64 rỗng → chuỗi rỗng');
const bigText = 'a'.repeat(300000) + 'đ';
ok(b64DecodeUtf8(b64EncodeUtf8(bigText)) === bigText, 'chuỗi 300k ký tự khứ hồi đúng');

/* ------------------------------------------------------------- 2. tên --- */

console.log('\n[2] validateRepoName / slugRepoName');
ok(validateRepoName('roblox-hub').ok === true, 'tên thường hợp lệ');
ok(validateRepoName('a').ok === true, 'một ký tự hợp lệ');
ok(validateRepoName('').ok === false, 'rỗng → lỗi');
ok(validateRepoName('   ').ok === false, 'toàn khoảng trắng → lỗi');
ok(validateRepoName('có dấu').ok === false, 'có dấu tiếng Việt → lỗi (phải slug)');
ok(validateRepoName('has space').ok === false, 'có khoảng trắng → lỗi');
ok(validateRepoName('a/b').ok === false, 'có dấu / → lỗi');
ok(validateRepoName('...').ok === false, 'chỉ dấu chấm → lỗi');
ok(validateRepoName('x'.repeat(101)).ok === false, 'quá 100 ký tự → lỗi');
ok(validateRepoName('  ok-name  ').value === 'ok-name', 'cắt khoảng trắng hai đầu');
ok(slugRepoName('Đồ án mới của tôi') === 'do-an-moi-cua-toi', 'bỏ dấu tiếng Việt', slugRepoName('Đồ án mới của tôi'));
ok(slugRepoName('Roblox Hub V2!') === 'roblox-hub-v2', 'bỏ ký tự đặc biệt', slugRepoName('Roblox Hub V2!'));
ok(slugRepoName('') === 'aia-project', 'rỗng → tên mặc định');
ok(slugRepoName('---').length > 0, 'toàn gạch vẫn có tên dùng được');

/* --------------------------------------------------------- 3. đường dẫn --- */

console.log('\n[3] validatePath');
ok(validatePath('script.js').ok === true, 'tệp ở gốc');
ok(validatePath('assets/part2.js').ok === true, 'tệp trong thư mục');
ok(validatePath('/script.js').value === 'script.js', 'bỏ / ở đầu');
ok(validatePath('').ok === false, 'rỗng → lỗi');
ok(validatePath('../secret.js').ok === false, 'chặn ..');
ok(validatePath('a//b.js').ok === false, 'chặn //');
ok(validatePath('a/./b.js').ok === false, 'chặn .');
ok(validatePath('a\\b.js').ok === false, 'chặn dấu \\');
ok(validatePath('a\u0000b.js').ok === false, 'chặn ký tự điều khiển');
ok(validatePath('x'.repeat(401)).ok === false, 'quá dài → lỗi');

/* ------------------------------------------------------------- 4. link --- */

console.log('\n[4] parseRepoRef');
ok(parseRepoRef('tester/demo').repo === 'demo', 'owner/repo');
ok(parseRepoRef('https://github.com/tester/demo').owner === 'tester', 'URL GitHub');
ok(parseRepoRef('https://github.com/tester/demo.git').repo === 'demo', 'bỏ .git');
ok(parseRepoRef('git@github.com:tester/demo.git').repo === 'demo', 'dạng SSH');
ok(parseRepoRef('https://github.com/tester/demo/tree/main/x').repo === 'demo', 'URL sâu vẫn lấy repo');
ok(parseRepoRef('không phải link') === null, 'chuỗi rác → null');
ok(parseRepoRef('') === null, 'rỗng → null');
ok(fileHtmlUrl('a', 'b', 'main', 'x/y.js') === 'https://github.com/a/b/blob/main/x/y.js', 'link xem tệp');
ok(fileRawUrl('a', 'b', 'main', 'x/y.js') === 'https://raw.githubusercontent.com/a/b/main/x/y.js', 'link raw');

/* ------------------------------------------- 4b. link mã nguồn tự điền --- */

console.log('\n[4b] Link mã nguồn (tự điền khi chọn dự án / chọn file)');
ok(repoHtmlUrl('a', 'b') === 'https://github.com/a/b', 'link dự án');
ok(encodePath('x/y.js') === 'x/y.js', 'đường dẫn thường giữ nguyên');
ok(encodePath('moi/thu muc/ban moi.js') === 'moi/thu%20muc/ban%20moi.js', 'mã hoá dấu cách, giữ dấu /');
ok(encodePath('a/b#c.js') === 'a/b%23c.js', 'mã hoá ký tự đặc biệt');
ok(
  fileHtmlUrl('o', 'r', 'main', 'moi/thu muc/a.js') === 'https://github.com/o/r/blob/main/moi/thu%20muc/a.js',
  'link xem tệp có dấu cách',
);
ok(
  fileRawUrl('o', 'r', 'dev', 'moi/thu muc/a.js') === 'https://raw.githubusercontent.com/o/r/dev/moi/thu%20muc/a.js',
  'link raw theo đúng nhánh',
);
ok(fileHtmlUrl('o', 'r', '', 'a.js') === 'https://github.com/o/r/blob/main/a.js', 'nhánh rỗng → main');

/* ------------------------------------------------------------- 5. lỗi --- */

console.log('\n[5] explainStatus');
const cases = [
  [401, '', 'GH_UNAUTHORIZED'],
  [403, 'API rate limit exceeded', 'GH_RATE_LIMIT'],
  [403, 'Resource not accessible', 'GH_FORBIDDEN'],
  [404, '', 'GH_NOT_FOUND'],
  [409, '', 'GH_CONFLICT'],
  [422, 'Validation Failed', 'GH_UNPROCESSABLE'],
  [500, '', 'GH_SERVER'],
  [503, '', 'GH_SERVER'],
  [418, 'teapot', 'GH_HTTP'],
];
for (const [status, msg, code] of cases) {
  const err = explainStatus(status, { message: msg });
  ok(err.code === code && err.status === status, `HTTP ${status} → ${code}`, err.code);
}
ok(explainStatus(401, null).hint.includes('Personal Access Token'), '401 có gợi ý tạo token');
ok(explainStatus(404, null).message.includes('Không tìm thấy'), '404 giải thích bằng tiếng Việt');
const custom = new GithubError('x', { code: 'GH_X', status: 400, hint: 'h' });
ok(custom instanceof Error && custom.code === 'GH_X' && custom.hint === 'h', 'GithubError giữ code/hint');

/* ------------------------------------------------------- 6. lưu token --- */

console.log('\n[6] Lưu token / repo gần nhất');
const mem = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _m: m,
  };
};
const storage = mem();
ok(saveToken('ghp_abc', storage) === true, 'lưu token');
ok(loadToken(storage) === 'ghp_abc', 'đọc lại token');
saveToken('', storage);
ok(loadToken(storage) === '', 'xoá token khi không nhớ');
saveLastRepo({ owner: 'a', name: 'b', fullName: 'a/b', branch: 'main' }, storage);
ok(loadLastRepo(storage).fullName === 'a/b', 'lưu repo gần nhất');
ok(loadToken(null) === '' && loadLastRepo(null) === null, 'storage hỏng → không ném lỗi');

/* ------------------------------------------------------- 7. client --- */

console.log('\n[7] GithubClient với GitHub giả');
const fake = makeFakeGithub();
const client = new GithubClient({ token: 'good', fetchImpl: fake.fetchImpl });
ok(client.hasToken() === true, 'hasToken() = true');

const me = await client.me();
ok(me.login === 'tester', 'me() trả login', JSON.stringify(me));
ok(client.calls.at(-1).path === '/user', 'calls ghi lại request');

const rl = await client.rateLimit();
ok(rl.resources.core.remaining === 4321, 'rateLimit() đọc được hạn mức');

const created = await client.createRepo({ name: 'demo-hub', description: 'test', private: true });
ok(created.full_name === 'tester/demo-hub', 'tạo repo mới', created.full_name);
ok(created.private === true, 'repo riêng tư theo yêu cầu');
await expectError(() => client.createRepo({ name: 'demo-hub' }), 'GH_UNPROCESSABLE', 'tạo trùng tên → 422 dễ hiểu');
await expectError(() => client.createRepo({ name: 'có dấu' }), 'GH_BAD_NAME', 'tên không hợp lệ bị chặn trước khi gọi API');

const list = await client.listRepos();
ok(Array.isArray(list) && list.some((r) => r.full_name === 'tester/demo-hub'), 'listRepos() có repo vừa tạo');
ok(fake.calls.some((c) => c.url.includes('/user/repos?')), 'listRepos dùng query per_page');

/* --------------------------------------------------- 8. tệp: tạo/sửa --- */

console.log('\n[8] putFile / getFile / deleteFile');
const put1 = await client.putFile({ owner: 'tester', repo: 'demo-hub', path: 'script.js', content: 'console.log("a");', branch: 'main' });
ok(!!put1.content.sha, 'tạo mới không cần sha');
const sha1 = put1.content.sha;
const got = await client.getFile('tester', 'demo-hub', 'script.js', 'main');
ok(got.encoding === 'base64' && b64DecodeUtf8(got.content) === 'console.log("a");', 'getFile giải base64 có xuống dòng');
ok(got.sha === sha1, 'sha khớp');

await expectError(
  () => client.putFile({ owner: 'tester', repo: 'demo-hub', path: 'script.js', content: 'x', branch: 'main' }),
  'GH_UNPROCESSABLE',
  'cập nhật không có sha → GitHub 422',
);
const put2 = await client.putFile({ owner: 'tester', repo: 'demo-hub', path: 'script.js', content: 'console.log("b");', branch: 'main', sha: sha1 });
ok(put2.content.sha !== sha1, 'cập nhật có sha → sha mới');
await expectError(
  () => client.putFile({ owner: 'tester', repo: 'demo-hub', path: 'script.js', content: 'x', branch: 'main', sha: sha1 }),
  'GH_CONFLICT',
  'sha cũ → 409 xung đột',
);
await expectError(() => client.putFile({ owner: 'tester', repo: 'demo-hub', path: '../x.js', content: 'x' }), 'GH_BAD_PATH', 'đường dẫn .. bị chặn trước khi gọi API');
await expectError(
  () => client.putFile({ owner: 'tester', repo: 'demo-hub', path: 'big.js', content: 'x'.repeat(GH_MAX_FILE_BYTES + 10) }),
  'GH_FILE_TOO_BIG',
  'tệp > 5 MB bị chặn',
);

const tree = await client.getTree('tester', 'demo-hub', 'main', true);
ok(tree.tree.some((n) => n.path === 'script.js' && n.type === 'blob'), 'getTree liệt kê tệp');
ok(tree.tree.every((n) => n.type === 'blob'), 'chỉ đếm blob');

const del = await client.deleteFile({ owner: 'tester', repo: 'demo-hub', path: 'script.js', sha: put2.content.sha, branch: 'main' });
ok(!!del.commit, 'xoá tệp thành công');
await expectError(() => client.deleteFile({ owner: 'tester', repo: 'demo-hub', path: 'script.js' }), 'GH_NO_SHA', 'xoá mà thiếu sha → lỗi ngay');

/* --------------------------------------------------------- 9. publish --- */

console.log('\n[9] publishFile — "nhấn là xong"');
const res = await client.publishFile({ owner: 'tester', repo: 'demo-hub', path: 'main.js', content: 'print("hi")\n' });
ok(res.htmlUrl === 'https://github.com/tester/demo-hub/blob/main/main.js', 'link xem trên GitHub', res.htmlUrl);
ok(res.rawUrl === 'https://raw.githubusercontent.com/tester/demo-hub/main/main.js', 'link raw', res.rawUrl);
ok(res.sha && res.repo.full_name === 'tester/demo-hub', 'publish trả sha + repo');

const res2 = await client.publishFile({ owner: 'tester', repo: 'demo-hub', path: 'main.js', content: 'print("hi 2")\n' });
ok(res2.sha !== res.sha, 'đăng lần 2 tự lấy sha để ghi đè');

const resNew = await client.publishFile({ owner: 'tester', repo: 'brand-new', path: 'script.js', content: 'a();' });
ok(resNew.repo.full_name === 'tester/brand-new', 'repo chưa tồn tại → tự tạo');
ok(fake.calls.some((c) => c.method === 'POST' && c.url.endsWith('/user/repos')), 'có gọi POST tạo repo');

const pagesFake = makeFakeGithub({ pages: true });
const pagesClient = new GithubClient({ token: 'good', fetchImpl: pagesFake.fetchImpl });
pagesFake.addRepo('tester/has-pages', { has_pages: true });
const pagesRes = await pagesClient.publishFile({ owner: 'tester', repo: 'has-pages', path: 'index.js', content: 'x();' });
ok(pagesRes.pagesUrl === 'https://tester.github.io/has-pages/', 'trả link GitHub Pages khi repo có pages', String(pagesRes.pagesUrl));

/* ------------------------------------------------------ 10. lỗi mạng --- */

console.log('\n[10] Lỗi mạng / chưa có token');
const noToken = new GithubClient({ token: '', fetchImpl: fake.fetchImpl });
await expectError(() => noToken.me(), 'GH_NO_TOKEN', 'chưa nhập token → GH_NO_TOKEN');
const badToken = new GithubClient({ token: 'bad', fetchImpl: fake.fetchImpl });
const badErr = await badToken.me().catch((e) => e);
ok(badErr.code === 'GH_UNAUTHORIZED', 'token sai → 401 dễ hiểu', badErr.code);
const netErr = new GithubClient({
  token: 'good',
  fetchImpl: async () => {
    throw new Error('offline');
  },
});
const net = await netErr.me().catch((e) => e);
ok(net.code === 'GH_NETWORK' && net.message.includes('offline'), 'lỗi mạng → GH_NETWORK');
const noFetch = new GithubClient({ token: 'good', fetchImpl: null });
ok(noFetch.fetchImpl === null || typeof noFetch.fetchImpl === 'function', 'không có fetch thì không ném ở constructor');
ok(GH_API_BASE === 'https://api.github.com', 'API base đúng');

/* ------------------------------------------------------------- 11. nhãn --- */

console.log('\n[11] Header & an toàn');
const headers = client.headers({ 'X-Test': '1' });
ok(headers.Authorization === 'Bearer good', 'gửi Authorization Bearer');
ok(headers['X-GitHub-Api-Version'] === '2022-11-28', 'gửi phiên bản API');
ok(headers.Accept === 'application/vnd.github+json', 'Accept đúng');
ok(!JSON.stringify(fake.calls[0].url).includes('good'), 'token không nằm trong URL');

/* ---------------------------------------------------------------- tổng --- */

console.log('\n' + '─'.repeat(56));
console.log(`Kết quả GitHub: ${pass} đạt · ${fails.length} lỗi`);
if (fails.length) {
  console.log('\nChi tiết:');
  for (const f of fails) console.log('  • ' + f);
  process.exitCode = 1;
} else {
  console.log('Client GitHub chạy đúng với GitHub giả (chưa gọi mạng thật).');
}
