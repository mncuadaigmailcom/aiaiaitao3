/* =============================================================================
 * AIA Secure Script — cầu nối GitHub (REST API v3)
 * -----------------------------------------------------------------------------
 * Chạy hoàn toàn trong trình duyệt: KHÔNG có máy chủ trung gian.
 * Token (PAT) do người dùng nhập, chỉ nằm trong máy họ (sessionStorage/localStorage
 * nếu họ chọn "nhớ"), và chỉ gửi tới https://api.github.com.
 *
 * Module thuần: nhận `fetchImpl` để chạy test bằng fetch giả.
 * ========================================================================== */

export const GH_API_BASE = 'https://api.github.com';
export const GH_TOKEN_KEY = 'aia.gh.token';
export const GH_REPO_KEY = 'aia.gh.repo';
export const GH_MAX_FILE_BYTES = 5 * 1024 * 1024; // GitHub contents API: khuyến nghị ≤ 1 MB, chặn cứng ở 5 MB

export class GithubError extends Error {
  constructor(message, opts = {}) {
    super(message);
    this.name = 'GithubError';
    this.status = opts.status || 0;
    this.code = opts.code || 'GH_ERROR';
    this.hint = opts.hint || '';
    this.url = opts.url || '';
  }
}

/* --------------------------------------------------------- base64 UTF-8 --- */

/** Chuỗi (UTF-8) → base64. An toàn với tiếng Việt/emoji và tệp lớn. */
export function b64EncodeUtf8(text) {
  const bytes = new TextEncoder().encode(String(text == null ? '' : text));
  let bin = '';
  const CH = 8192;
  for (let i = 0; i < bytes.length; i += CH) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + CH, bytes.length)));
  }
  return btoa(bin);
}

/** base64 → chuỗi UTF-8 (GitHub trả base64 có xuống dòng). */
export function b64DecodeUtf8(b64) {
  const clean = String(b64 || '').replace(/\s+/g, '');
  if (!clean) return '';
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/* -------------------------------------------------------------- kiểm tra --- */

/** Tên repo hợp lệ theo GitHub: 1–100 ký tự, không chỉ gồm dấu chấm. */
export function validateRepoName(name) {
  const s = String(name == null ? '' : name).trim();
  if (!s) return { ok: false, message: 'Chưa nhập tên dự án.' };
  if (s.length > 100) return { ok: false, message: 'Tên dự án tối đa 100 ký tự.' };
  if (!/^[A-Za-z0-9._-]+$/.test(s)) {
    return { ok: false, message: 'Tên dự án chỉ dùng chữ, số, dấu chấm, gạch ngang, gạch dưới.' };
  }
  if (/^\.+$/.test(s)) return { ok: false, message: 'Tên dự án không được chỉ gồm dấu chấm.' };
  return { ok: true, value: s };
}

/** "Tên dự án của tôi" → "ten-du-an-cua-toi" (an toàn để tạo repo). */
export function slugRepoName(input) {
  const raw = String(input == null ? '' : input).trim();
  const slug = raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
  return slug || 'aia-project';
}

/** Đường dẫn tệp trong repo: không tuyệt đối, không '..', không rỗng. */
export function validatePath(path) {
  const s = String(path == null ? '' : path).trim().replace(/^\/+/, '');
  if (!s) return { ok: false, message: 'Chưa nhập đường dẫn tệp.' };
  if (s.length > 400) return { ok: false, message: 'Đường dẫn quá dài (tối đa 400 ký tự).' };
  if (s.split('/').some((p) => p === '' || p === '.' || p === '..')) {
    return { ok: false, message: 'Đường dẫn không hợp lệ (không dùng ".." hay "//").' };
  }
  if (/[\u0000-\u001f\\]/.test(s)) return { ok: false, message: 'Đường dẫn chứa ký tự không hợp lệ.' };
  return { ok: true, value: s };
}

/** Nhận "owner/repo" hoặc URL GitHub đầy đủ. */
export function parseRepoRef(input) {
  const s = String(input == null ? '' : input).trim().replace(/\.git$/, '');
  // Cả hai nhánh đều trả về mảng match: nhóm 1 = owner, nhóm 2 = repo.
  const pair = /github\.com[/:]([^/\s]+)\/([^/\s#?]+)/i.exec(s) || /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/.exec(s);
  if (!pair) return null;
  const owner = pair[1];
  const repo = pair[2];
  if (!owner || !repo) return null;
  return { owner, repo };
}

/** Rút gọn thông báo lỗi HTTP thành câu dễ hiểu. */
export function explainStatus(status, body, url = '') {
  const msg = (body && (body.message || body.error)) || '';
  if (status === 401) {
    return new GithubError('Token không hợp lệ hoặc đã hết hạn.', {
      status, code: 'GH_UNAUTHORIZED', url,
      hint: 'Tạo Personal Access Token (fine-grained, quyền Contents: Read and write + Administration: Read and write để tạo repo).',
    });
  }
  if (status === 403 && /rate limit/i.test(msg)) {
    return new GithubError('Đã chạm giới hạn gọi API của GitHub.', {
      status, code: 'GH_RATE_LIMIT', url,
      hint: 'Chờ vài phút rồi thử lại, hoặc dùng token (token có hạn mức cao hơn).',
    });
  }
  if (status === 403) {
    return new GithubError('Token không đủ quyền cho thao tác này.', {
      status, code: 'GH_FORBIDDEN', url,
      hint: 'Cần quyền Contents (đọc/ghi tệp) và Administration (tạo dự án) cho repo đích.',
    });
  }
  if (status === 404) {
    return new GithubError('Không tìm thấy (repo/tệp/nhánh không tồn tại, hoặc token không thấy repo riêng tư).', {
      status, code: 'GH_NOT_FOUND', url,
      hint: 'Kiểm tra tên repo/nhánh/tệp; nếu repo là private, token phải được cấp quyền cho repo đó.',
    });
  }
  if (status === 409) return new GithubError('GitHub báo xung đột (repo trống hoặc nhánh chưa có tệp).', { status, code: 'GH_CONFLICT', url });
  if (status === 422) {
    return new GithubError(`GitHub từ chối dữ liệu: ${msg || 'không hợp lệ'}.`, {
      status, code: 'GH_UNPROCESSABLE', url,
      hint: 'Tên repo có thể đã tồn tại, hoặc đường dẫn/tệp không hợp lệ.',
    });
  }
  if (status >= 500) return new GithubError(`GitHub đang lỗi (HTTP ${status}). Thử lại sau.`, { status, code: 'GH_SERVER', url });
  return new GithubError(`GitHub trả lỗi HTTP ${status}${msg ? ': ' + msg : ''}.`, { status, code: 'GH_HTTP', url });
}

/* -------------------------------------------------------------- client --- */

export class GithubClient {
  /**
   * @param {{token?:string, fetchImpl?:Function, apiBase?:string, timeoutMs?:number}} opts
   */
  constructor(opts = {}) {
    this.token = String(opts.token || '').trim();
    this.fetchImpl = opts.fetchImpl || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    this.apiBase = String(opts.apiBase || GH_API_BASE).replace(/\/+$/, '');
    this.timeoutMs = Number(opts.timeoutMs) || 20000;
    this.calls = []; // log để test: { method, path, status }
  }

  hasToken() {
    return this.token.length > 0;
  }

  /** Có phải PAT trông hợp lệ không (chỉ kiểm tra hình thức). */
  static looksLikeToken(token) {
    const s = String(token || '').trim();
    return /^(gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})$/.test(s);
  }

  headers(extra = {}) {
    const h = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...extra,
    };
    if (this.token) h.Authorization = 'Bearer ' + this.token;
    return h;
  }

  async request(path, opts = {}) {
    if (!this.fetchImpl) throw new GithubError('Môi trường không có fetch.', { code: 'GH_NO_FETCH' });
    if (!this.token) throw new GithubError('Chưa nhập API key GitHub.', { code: 'GH_NO_TOKEN', hint: 'Mở tab “API key” và dán Personal Access Token.' });
    const url = path.startsWith('http') ? path : this.apiBase + path;
    const method = opts.method || 'GET';
    const headers = this.headers(opts.headers);
    let body;
    if (opts.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.body);
    }
    let res;
    try {
      res = await this.fetchImpl(url, { method, headers, body, signal: opts.signal });
    } catch (err) {
      throw new GithubError('Không gọi được GitHub: ' + ((err && err.message) || err), {
        code: 'GH_NETWORK',
        url,
        hint: 'Kiểm tra mạng / chặn CORS của trình duyệt.',
      });
    }
    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }
    this.calls.push({ method, path, status: res.status });
    if (!res.ok) throw explainStatus(res.status, data, url);
    return data;
  }

  /* ------------------------------------------------------- tài khoản --- */

  me() {
    return this.request('/user');
  }

  rateLimit() {
    return this.request('/rate_limit');
  }

  /* ---------------------------------------------------------- repo --- */

  listRepos(opts = {}) {
    const perPage = Math.min(100, Math.max(1, Number(opts.perPage) || 100));
    const params = new URLSearchParams({
      per_page: String(perPage),
      sort: opts.sort || 'updated',
      direction: 'desc',
      affiliation: opts.affiliation || 'owner,collaborator,organization_member',
      ...(opts.page ? { page: String(opts.page) } : {}),
    });
    return this.request('/user/repos?' + params.toString());
  }

  getRepo(owner, repo) {
    return this.request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
  }

  createRepo({ name, description = '', private: isPrivate = true, autoInit = true }) {
    const check = validateRepoName(name);
    if (!check.ok) throw new GithubError(check.message, { code: 'GH_BAD_NAME' });
    return this.request('/user/repos', {
      method: 'POST',
      body: { name: check.value, description, private: !!isPrivate, auto_init: !!autoInit },
    });
  }

  listBranches(owner, repo, perPage = 100) {
    return this.request(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?per_page=${perPage}`);
  }

  /* --------------------------------------------------------- tệp --- */

  getTree(owner, repo, branch = 'main', recursive = true) {
    const q = recursive ? '?recursive=1' : '';
    return this.request(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}${q}`,
    );
  }

  getFile(owner, repo, filePath, ref = '') {
    const check = validatePath(filePath);
    if (!check.ok) throw new GithubError(check.message, { code: 'GH_BAD_PATH' });
    const q = ref ? '?ref=' + encodeURIComponent(ref) : '';
    return this.request(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${check.value
        .split('/')
        .map(encodeURIComponent)
        .join('/')}${q}`,
    );
  }

  /**
   * Tạo hoặc cập nhật tệp. Không truyền `sha` ⇒ tạo mới; có `sha` ⇒ cập nhật.
   * @returns {Promise<{content:object, commit:object}>}
   */
  putFile({ owner, repo, path: filePath, content = '', message = 'Cập nhật từ AIA Secure Script', branch, sha }) {
    const check = validatePath(filePath);
    if (!check.ok) throw new GithubError(check.message, { code: 'GH_BAD_PATH' });
    const text = String(content == null ? '' : content);
    const bytes = new TextEncoder().encode(text).length;
    if (bytes > GH_MAX_FILE_BYTES) {
      throw new GithubError(`Tệp ${formatSizeText(bytes)} vượt giới hạn ${formatSizeText(GH_MAX_FILE_BYTES)} của GitHub contents API.`, {
        code: 'GH_FILE_TOO_BIG',
      });
    }
    return this.request(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${check.value
        .split('/')
        .map(encodeURIComponent)
        .join('/')}`,
      {
        method: 'PUT',
        body: {
          message,
          content: b64EncodeUtf8(text),
          ...(branch ? { branch } : {}),
          ...(sha ? { sha } : {}),
        },
      },
    );
  }

  deleteFile({ owner, repo, path: filePath, message = 'Xoá tệp từ AIA Secure Script', branch, sha }) {
    const check = validatePath(filePath);
    if (!check.ok) throw new GithubError(check.message, { code: 'GH_BAD_PATH' });
    if (!sha) throw new GithubError('Thiếu sha của tệp cần xoá.', { code: 'GH_NO_SHA' });
    return this.request(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${check.value
        .split('/')
        .map(encodeURIComponent)
        .join('/')}`,
      { method: 'DELETE', body: { message, sha, ...(branch ? { branch } : {}) } },
    );
  }

  /**
   * "Nhấn là xong": tạo repo nếu chưa có, rồi ghi tệp (tự lấy sha nếu tệp đã tồn tại).
   * @returns {Promise<{repo:object, file:object, sha:string, htmlUrl:string, rawUrl:string, pagesUrl:string|null}>}
   */
  async publishFile({ owner, repo, branch = 'main', path: filePath = 'script.js', content = '', message, createIfMissing = true, description = '' }) {
    let repoInfo;
    try {
      repoInfo = await this.getRepo(owner, repo);
    } catch (err) {
      if (err.status !== 404) throw err;
      if (!createIfMissing) throw err;
      repoInfo = await this.createRepo({ name: repo, description, private: true, autoInit: true });
      owner = repoInfo.owner.login;
    }
    const realOwner = (repoInfo.owner && repoInfo.owner.login) || owner;
    const realBranch = branch || (repoInfo.default_branch || 'main');

    let sha;
    try {
      const existing = await this.getFile(realOwner, repo, filePath, realBranch);
      if (existing && !Array.isArray(existing)) sha = existing.sha;
    } catch (err) {
      if (err.status !== 404) throw err;
    }
    const saved = await this.putFile({
      owner: realOwner,
      repo,
      path: filePath,
      content,
      message: message || `Cập nhật ${filePath} từ AIA Secure Script`,
      branch: realBranch,
      sha,
    });
    const htmlUrl = `https://github.com/${realOwner}/${repo}/blob/${realBranch}/${filePath}`;
    const rawUrl = `https://raw.githubusercontent.com/${realOwner}/${repo}/${realBranch}/${filePath}`;
    const pagesUrl = repoInfo.has_pages ? `https://${realOwner}.github.io/${repo}/` : null;
    return { repo: repoInfo, file: saved, sha: (saved && saved.content && saved.content.sha) || sha || '', htmlUrl, rawUrl, pagesUrl };
  }
}

function formatSizeText(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

/* ------------------------------------------------------- lưu token --- */

/** Lưu token (nếu người dùng chọn "nhớ"). Không ném lỗi khi bị chặn. */
export function saveToken(token, storage) {
  try {
    const s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!s) return false;
    if (token) s.setItem(GH_TOKEN_KEY, String(token));
    else s.removeItem(GH_TOKEN_KEY);
    return true;
  } catch {
    return false;
  }
}

export function loadToken(storage) {
  try {
    const s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    return (s && s.getItem(GH_TOKEN_KEY)) || '';
  } catch {
    return '';
  }
}

export function saveLastRepo(ref, storage) {
  try {
    const s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!s) return false;
    s.setItem(GH_REPO_KEY, JSON.stringify(ref || null));
    return true;
  } catch {
    return false;
  }
}

export function loadLastRepo(storage) {
  try {
    const s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    const raw = s && s.getItem(GH_REPO_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Link xem tệp trên GitHub. */
export function fileHtmlUrl(owner, repo, branch, filePath) {
  return `https://github.com/${owner}/${repo}/blob/${branch || 'main'}/${filePath}`;
}

/** Link tải thô (raw) — dùng để nhúng thẳng vào script src. */
export function fileRawUrl(owner, repo, branch, filePath) {
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch || 'main'}/${filePath}`;
}
