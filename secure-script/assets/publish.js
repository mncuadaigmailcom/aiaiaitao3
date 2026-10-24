/* =============================================================================
 * AIA Secure Script — "Xuất bản một lần": mã hoá + chống soi + GitHub
 * -----------------------------------------------------------------------------
 * Từ code đang mở trong tab Lập trình, sinh ra MỘT GÓI tệp để đẩy lên GitHub:
 *
 *   <dir>/index.html   trang trắng, chỉ có chữ "404: Not Found" (người khác thấy)
 *   <dir>/k-xxxx.txt   tệp khoá (32 byte, base64) — chỉ loader biết link
 *   <dir>/l-xxxx.lua   loader Luau: tải khoá → giải mã AES-256-GCM → chạy script
 *
 * hoặc với JavaScript:
 *
 *   <dir>/index.html   trang trắng 404
 *   <dir>/key-xxxx.js  key script (khoá tệp được bọc trong đây)
 *   <dir>/run-xxxx.js  snippet "chép là chạy" đã nhúng sẵn link key
 *
 * Link để dán vào game là `links.scriptUrl`; link công khai là `links.publicUrl`.
 * ========================================================================== */

import * as C from './core.js';
import { buildLuaLoader } from './lua-loader.js';

/** Tiền tố định danh gói xuất bản (dùng trong tên tệp + thông báo). */
export const PUBLISH_VERSION = 'AIAPUB1';

/** GitHub contents API chặn ở 5 MB/tệp — giữ biên an toàn. */
export const PUBLISH_MAX_FILE_BYTES = 4.5 * 1024 * 1024;

const DIR_RE = /^[A-Za-z0-9._/-]*$/;

/** Chuẩn hoá thư mục trên repo: bỏ "/" thừa, chặn "..", chỉ cho ký tự an toàn. */
export function sanitizeDir(raw, fallback = 's') {
  let d = String(raw == null ? '' : raw).trim().replace(/\\/g, '/');
  d = d.replace(/^\/+|\/+$/g, '').replace(/\/{2,}/g, '/');
  if (!d) return fallback;
  if (!DIR_RE.test(d) || d.split('/').some((part) => part === '.' || part === '..')) return fallback;
  return d.slice(0, 120);
}

/** Link GitHub Pages của repo (repo tên `<user>.github.io` thì nằm ở gốc). */
export function pagesBaseUrl(owner, repo) {
  const o = String(owner == null ? '' : owner).trim().toLowerCase();
  const r = String(repo == null ? '' : repo).trim();
  if (!o || !r) return '';
  if (r.toLowerCase() === o + '.github.io') return 'https://' + o + '.github.io/';
  return 'https://' + o + '.github.io/' + r + '/';
}

/** Trang trắng "404: Not Found" — không tiêu đề, không mã, không liên kết. */
export function buildWhitePage({ text = true, title = '404 Not Found' } = {}) {
  const body = text
    ? '<h1>404: Not Found</h1>'
    : '';
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="robots" content="noindex,nofollow,noarchive,nosnippet">',
    '<title>' + String(title).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]) + '</title>',
    '<style>',
    'html,body{height:100%;margin:0;background:#fff;color:#1a1a1a}',
    'body{display:flex;align-items:center;justify-content:center;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}',
    'h1{font-weight:400;font-size:15px;color:#333;margin:0}',
    '</style>',
    '</head>',
    '<body>',
    body,
    '</body>',
    '</html>',
    '',
  ].join('\n');
}

/** Mã ngắn cho tên tệp (mặc định lấy từ crypto). */
export function makePublishId(rand) {
  const bytes = rand && rand.length ? rand : C.randomBytes(4);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 8);
}

function bytesSink() {
  const chunks = [];
  return {
    kind: 'memory',
    write(b) {
      chunks.push(b.slice ? b.slice() : new Uint8Array(b));
    },
    close() {},
    toBytes() {
      const total = chunks.reduce((n, c) => n + c.length, 0);
      const out = new Uint8Array(total);
      let at = 0;
      for (const c of chunks) {
        out.set(c, at);
        at += c.length;
      }
      return out;
    },
  };
}

function bytesToBase64(bytes) {
  let s = '';
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  // btoa có ở trình duyệt; Node ≥ 16 cũng có
  return btoa(s);
}

/**
 * Mã hoá code bằng AES-256-GCM (WebCrypto) để loader Luau giải mã trong game.
 * Khoá 32 byte ngẫu nhiên, nonce 12 byte ngẫu nhiên — dùng một lần cho mỗi lần xuất bản.
 */
export async function encryptForGame(code, opts = {}) {
  const text = String(code == null ? '' : code);
  const plain = new TextEncoder().encode(text);
  const key = opts.key || C.randomBytes(32);
  const nonce = opts.nonce || C.randomBytes(12);
  const subtle = globalThis.crypto && globalThis.crypto.subtle;
  if (!subtle) throw new Error('Trình duyệt không hỗ trợ WebCrypto (cần HTTPS hoặc localhost).');
  const cryptoKey = await subtle.importKey('raw', key, { name: 'AES-GCM' }, false, ['encrypt']);
  const sealed = new Uint8Array(
    await subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, cryptoKey, plain),
  );
  const ct = sealed.slice(0, sealed.length - 16);
  const tag = sealed.slice(sealed.length - 16);
  return {
    plainBytes: plain.length,
    cipherBytes: ct.length,
    keyB64: bytesToBase64(key),
    nonceB64: bytesToBase64(nonce),
    cipherB64: bytesToBase64(ct),
    tagHex: Array.from(tag)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(''),
  };
}

/**
 * Gói tệp cho mục tiêu **Luau (game)**.
 * @returns {Promise<{files:Array<{path:string,content:string}>, keyFile:string, loaderFile:string, sealed:object}>}
 */
export async function buildLuauBundle({ code, dir = 's', keyUrl, id, suffix } = {}) {
  if (!keyUrl) throw new Error('buildLuauBundle: thiếu keyUrl');
  const pubId = String(id || makePublishId());
  const keyFile = 'k-' + pubId + '.txt';
  const loaderFile = 'l-' + pubId + '.lua';
  const sealed = await encryptForGame(code);
  const loader = buildLuaLoader({
    cipherB64: sealed.cipherB64,
    nonceB64: sealed.nonceB64,
    tagHex: sealed.tagHex,
    keyUrl,
    suffix,
  });
  return {
    sealed,
    keyFile,
    loaderFile,
    files: [
      { path: keyFile, content: sealed.keyB64 },
      { path: loaderFile, content: loader },
    ],
    loader,
  };
}

/**
 * Gói tệp cho mục tiêu **JavaScript (web)** — dùng lại đúng lõi `.aia` + key script
 * đã có test (không phát minh định dạng mới).
 */
export async function buildJsBundle({ code, fileName = 'script.js', keyUrl, id, passphrase = '' } = {}) {
  if (!keyUrl) throw new Error('buildJsBundle: thiếu keyUrl');
  const pubId = String(id || makePublishId());
  const bytes = new TextEncoder().encode(String(code == null ? '' : code));
  const payloadFile = 'payload-' + pubId + '.aia.bin';
  const options = C.normalizeOptions({
    fileName,
    keyMode: 'per-file',
    requireKeyScript: true,
    payloadFile,
    passphrase,
    lang: 'javascript',
  });
  const sink = bytesSink();
  const result = await C.encryptStream({
    openStream: () =>
      new ReadableStream({
        start(c) {
          c.enqueue(bytes);
          c.close();
        },
      }),
    size: bytes.length,
    options,
    sink,
  });
  const containerBytes = sink.toBytes();
  const meta = result.meta;
  const keyText = C.buildKeyScript(meta, { embeddedPassphrase: passphrase || null });
  const runText = C.buildRunSnippetStealth({
    meta,
    containerBytes,
    keyUrl,
    keyScriptText: null,
    passphrase: '',
    askPassphrase: false,
    execute: true,
  });
  const keyFile = 'key-' + pubId + '.js';
  const runFile = 'run-' + pubId + '.js';
  return {
    meta,
    containerBytes,
    keyFile,
    loaderFile: runFile,
    files: [
      { path: keyFile, content: keyText },
      { path: runFile, content: runText },
    ],
  };
}

/**
 * Lập kế hoạch xuất bản đầy đủ (chưa đẩy lên GitHub).
 *
 * @param {object} p
 * @param {string} p.code         mã nguồn đang mở
 * @param {'luau'|'js'} [p.target='luau']
 * @param {string} p.owner        chủ repo
 * @param {string} p.repo         tên repo
 * @param {string} [p.branch='main']
 * @param {string} [p.dir='s']    thư mục trên repo
 * @param {string} [p.id]         mã gói (test truyền cố định)
 * @param {boolean} [p.whiteText=true]  hiện chữ "404: Not Found"
 * @param {boolean} [p.cloak=true] trang trắng công khai
 */
export async function buildPublishPlan({
  code,
  target = 'luau',
  owner,
  repo,
  branch = 'main',
  dir = 's',
  id,
  whiteText = true,
  cloak = true,
  encrypt = true,
  fileName = 'script.js',
  passphrase = '',
} = {}) {
  if (!owner || !repo) throw new Error('Thiếu chủ repo hoặc tên repo.');
  if (!String(code || '').trim()) throw new Error('Chưa có code để xuất bản.');
  const kind = target === 'js' ? 'js' : 'luau';
  const folder = sanitizeDir(dir, 's');
  const pubId = String(id || makePublishId());
  const base = pagesBaseUrl(owner, repo);
  const prefix = base + folder + '/';
  const keyUrl = prefix + (kind === 'luau' ? 'k-' + pubId + '.txt' : 'key-' + pubId + '.js');

  const joiner = (name) => (folder ? folder + '/' : '') + name;
  const files = [];

  let loaderRel = '';
  let keyRel = '';
  let sealed = null;
  let meta = null;
  let loader = '';

  if (encrypt) {
    const bundle =
      kind === 'luau'
        ? await buildLuauBundle({ code, dir: folder, keyUrl, id: pubId })
        : await buildJsBundle({ code, fileName, keyUrl, id: pubId, passphrase });
    for (const f of bundle.files) files.push({ path: joiner(f.path), content: f.content });
    loaderRel = joiner(bundle.loaderFile);
    keyRel = joiner(bundle.keyFile);
    sealed = bundle.sealed || null;
    meta = bundle.meta || null;
    loader = bundle.loader || '';
  } else {
    // Không mã hoá: đẩy thẳng tệp gốc, chỉ còn phần chống soi (nếu bật).
    const plainName = 'script-' + pubId + (kind === 'luau' ? '.lua' : '.js');
    files.push({ path: joiner(plainName), content: String(code) });
    loaderRel = joiner(plainName);
    keyRel = '';
  }

  if (cloak) files.unshift({ path: joiner('index.html'), content: buildWhitePage({ text: whiteText }) });

  const encoder = new TextEncoder();
  const tooBig = files.find((f) => encoder.encode(f.content).length > PUBLISH_MAX_FILE_BYTES);
  if (tooBig) {
    const size = encoder.encode(tooBig.content).length;
    throw new Error(
      'Tệp ' + tooBig.path + ' là ' + (size / 1024 / 1024).toFixed(1) + ' MB, vượt giới hạn 5 MB của GitHub. ' +
        'Script gốc khoảng ' + (String(code).length / 1024 / 1024).toFixed(1) + ' MB — hãy chia nhỏ script ' +
        '(dưới ~2,8 MB) hoặc tải tệp về rồi tự đẩy bằng git.',
    );
  }

  const publicUrl = cloak ? prefix : '';
  const scriptUrl = base + loaderRel;
  const rawUrl = 'https://raw.githubusercontent.com/' + owner + '/' + repo + '/' + (branch || 'main') + '/' + loaderRel;

  return {
    version: PUBLISH_VERSION,
    target: kind,
    encrypt: !!encrypt,
    owner,
    repo,
    branch: branch || 'main',
    dir: folder,
    id: pubId,
    files,
    keyFile: keyRel,
    loaderPath: loaderRel,
    loaderRel,
    keyRel,
    links: { publicUrl, scriptUrl, rawUrl, keyUrl },
    sealed,
    meta,
    loader,
  };
}

export { bytesSink, bytesToBase64 };

/* =============================================================================
 * Đẩy gói xuất bản lên GitHub — một nút, không thao tác tay
 * ========================================================================== */

function encPath(p) {
  return String(p)
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');
}

/**
 * Bật GitHub Pages cho repo (nếu chưa bật). Không ném lỗi khi token thiếu quyền
 * `pages` — gói vẫn đẩy xong, chỉ là link Pages chưa sống ngay.
 */
export async function ensurePages(client, owner, repo, branch = 'main') {
  const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pages`;
  try {
    const info = await client.request(base);
    return { enabled: true, created: false, url: (info && info.html_url) || '', source: info && info.source };
  } catch (err) {
    if (err && err.status !== 404) return { enabled: false, created: false, url: '', error: err.message || String(err) };
  }
  try {
    const made = await client.request(base, {
      method: 'POST',
      body: { source: { branch, path: '/' } },
    });
    return {
      enabled: true,
      created: true,
      url: (made && made.html_url) || '',
      source: made && made.source,
    };
  } catch (err) {
    // 409 = Pages đã bật ở nơi khác; coi như đã bật.
    if (err && err.status === 409) return { enabled: true, created: false, url: '' };
    return { enabled: false, created: false, url: '', error: err && err.message ? err.message : String(err) };
  }
}

/** Trạng thái lần build Pages gần nhất. */
export async function pagesBuildStatus(client, owner, repo) {
  try {
    const b = await client.request(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pages/builds/latest`,
    );
    return { status: (b && b.status) || 'unknown', updated: (b && b.updated_at) || '', error: '' };
  } catch (err) {
    return { status: 'unknown', updated: '', error: (err && err.message) || String(err) };
  }
}

/**
 * Chờ Pages build xong. Trả về trạng thái cuối; hết thời gian thì trả `status:'building'`.
 * `sleep` cho phép test truyền hàm giả (không chờ thật).
 */
export async function waitForPagesBuild(
  client,
  owner,
  repo,
  { timeoutMs = 60000, intervalMs = 6000, sleep, onTick } = {},
) {
  const nap = sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
  const started = Date.now();
  let last = { status: 'unknown', updated: '', error: '' };
  while (Date.now() - started < timeoutMs) {
    last = await pagesBuildStatus(client, owner, repo);
    if (typeof onTick === 'function') onTick(last, Date.now() - started);
    if (last.status === 'built' || last.status === 'errored') return last;
    await nap(intervalMs);
  }
  return last;
}

/**
 * Ghi toàn bộ tệp của kế hoạch lên GitHub, bật Pages, trả link để sao chép.
 *
 * @param {object} p
 * @param {object} p.plan        kết quả buildPublishPlan()
 * @param {object} p.client      GithubClient
 * @param {boolean} [p.createIfMissing=true]
 * @param {boolean} [p.publicRepo=true]  repo công khai (Pages miễn phí cần repo public)
 * @param {(msg:string, kind?:string)=>void} [p.onProgress]
 */
export async function publishPlanToGithub({
  plan,
  client,
  createIfMissing = true,
  publicRepo = true,
  description = 'Script đã mã hoá — xuất bản từ AIA Secure Script',
  onProgress,
} = {}) {
  if (!plan) throw new Error('Thiếu kế hoạch xuất bản.');
  if (!client) throw new Error('Thiếu kết nối GitHub.');
  const say = (m, k) => {
    if (typeof onProgress === 'function') onProgress(m, k);
  };

  /* 1 · repo */
  let repoInfo;
  let created = false;
  try {
    repoInfo = await client.getRepo(plan.owner, plan.repo);
  } catch (err) {
    if (!err || err.status !== 404 || !createIfMissing) throw err;
    say('Chưa có dự án — đang tạo “' + plan.repo + '”…');
    repoInfo = await client.createRepo({
      name: plan.repo,
      description,
      private: !publicRepo,
      autoInit: true,
    });
    created = true;
  }
  const owner = (repoInfo.owner && repoInfo.owner.login) || plan.owner;
  const branch = repoInfo.default_branch || plan.branch || 'main';

  /* 2 · ghi từng tệp (tự lấy sha nếu tệp đã tồn tại) */
  const written = [];
  for (const file of plan.files) {
    say('Đang ghi ' + file.path + '…');
    let sha = '';
    try {
      const existing = await client.getFile(owner, plan.repo, file.path, branch);
      if (existing && !Array.isArray(existing)) sha = existing.sha;
    } catch (err) {
      if (!err || err.status !== 404) throw err;
    }
    const saved = await client.putFile({
      owner,
      repo: plan.repo,
      path: file.path,
      content: file.content,
      branch,
      sha,
      message: (sha ? 'Cập nhật ' : 'Thêm ') + file.path + ' từ AIA Secure Script',
    });
    written.push({
      path: file.path,
      updated: !!sha,
      sha: (saved && saved.content && saved.content.sha) || sha,
      size: new TextEncoder().encode(file.content).length,
    });
  }

  /* 3 · Pages */
  say('Đang bật GitHub Pages…');
  const pages = await ensurePages(client, owner, plan.repo, branch);
  const base = pagesBaseUrl(owner, plan.repo);
  const dirPrefix = base + (plan.dir ? plan.dir + '/' : '');
  const loaderRel = plan.loaderRel || plan.loaderPath || '';
  const links = {
    publicUrl: dirPrefix,
    scriptUrl: base + loaderRel,
    keyUrl: plan.keyRel ? base + plan.keyRel : '',
    rawUrl: 'https://raw.githubusercontent.com/' + owner + '/' + plan.repo + '/' + branch + '/' + loaderRel,
  };

  return {
    version: PUBLISH_VERSION,
    owner,
    repo: plan.repo,
    branch,
    dir: plan.dir,
    id: plan.id,
    target: plan.target,
    created,
    files: written,
    pages,
    links,
    note: pages.enabled
      ? 'Pages đang build — link sống sau khoảng 30–90 giây. Link không đổi khi bạn đẩy lại code.'
      : 'Chưa bật được Pages: ' +
        (pages.error || 'token cần quyền Pages (hoặc repo phải công khai).') +
        ' Bạn vẫn dùng được link raw: ' +
        links.rawUrl,
  };
}
