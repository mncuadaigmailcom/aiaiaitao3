/* =============================================================================
 * AIA Secure Script — hộp thoại "Cập nhật script lên GitHub"
 * -----------------------------------------------------------------------------
 *   Tab 1 · API key      : dán Personal Access Token, kiểm tra, nhớ trên máy
 *   Tab 2 · Mã nguồn     : tạo dự án mới (nhập tên dự án) rồi đẩy code JS lên
 *   Tab 3 · Sửa file     : liệt kê TẤT CẢ dự án trong GitHub → chọn 1 → xem có
 *                          bao nhiêu file → mở / sửa / thêm / xoá file
 *   Tab 4 · Kết quả      : đẩy code lên + hiện link GitHub / raw vừa tạo
 *
 * Không có backend: mọi request đi thẳng từ trình duyệt tới api.github.com.
 * ========================================================================== */

import {
  GithubClient,
  GithubError,
  b64DecodeUtf8,
  explainStatus,
  loadLastRepo,
  loadToken,
  saveLastRepo,
  saveToken,
  validateRepoName,
  fileHtmlUrl,
  fileRawUrl,
  repoHtmlUrl,
} from './github.js';
import {
  buildPublishPlan,
  publishPlanToGithub,
  pagesBuildStatus,
  waitForPagesBuild,
  sanitizeDir,
} from './publish.js';

const $ = (id) => document.getElementById(id);

const state = {
  bridge: null,
  client: null,
  repos: [],
  repo: null, // { owner, name, fullName, branch }
  files: [],
  file: null, // { path, sha }
  published: null,
  tab: 'key',
  ship: null, // kết quả xuất bản gần nhất
  payload: null, // code đẩy từ tab Lập trình
  shipOwner: '',
  filesRepo: '', // dự án ứng với danh sách file đang có trong state.files
  loadingFiles: null, // Promise đang tải danh sách file (chống gọi trùng)
};

function toast(message, kind = 'info', ms) {
  if (state.bridge && typeof state.bridge.toast === 'function') state.bridge.toast(message, kind, ms);
}

function copy(text, message) {
  if (state.bridge && typeof state.bridge.copy === 'function') return state.bridge.copy(text, message);
  return Promise.resolve(false);
}

function setStatus(el, text, kind) {
  if (!el) return;
  el.textContent = text;
  el.style.color = kind === 'bad' ? 'var(--bad)' : kind === 'ok' ? 'var(--ok)' : '';
}

function errText(err) {
  if (!err) return 'Lỗi không rõ.';
  const msg = err.message || String(err);
  return err.hint ? msg + ' — ' + err.hint : msg;
}

/* ------------------------------------------------------------------ tabs --- */

function showTab(name) {
  state.tab = name;
  document.querySelectorAll('[data-gh]').forEach((b) => {
    const on = b.dataset.gh === name;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  const panes = { key: 'ghPaneKey', new: 'ghPaneNew', edit: 'ghPaneEdit', result: 'ghPaneResult', ship: 'ghPaneShip' };
  for (const [k, id] of Object.entries(panes)) {
    const el = $(id);
    if (el) el.hidden = k !== name;
  }
  if (name === 'edit' && !state.repos.length) loadRepos();
  if (name === 'ship') hydrateShip();
}

function openModal(tab = 'key', payload = null) {
  const modal = $('ghModal');
  if (!modal) return;
  if (payload) state.payload = payload;
  if (payload && payload.content != null) {
    // đẩy code từ tab Lập trình sang phần nội dung file
    if ($('ghFileContent') && !$('ghFileContent').value) $('ghFileContent').value = payload.content;
    if (payload.name && $('ghPublishPath')) $('ghPublishPath').value = payload.name;
    if (payload.name && $('ghNewName') && !$('ghNewName').value) {
      $('ghNewName').value = payload.name.replace(/\.[a-z0-9]+$/i, '');
    }
  }
  if (payload && payload.ship) {
    if ($('ghShipEncrypt')) $('ghShipEncrypt').checked = payload.ship.encrypt !== false;
    if ($('ghShipCloak')) $('ghShipCloak').checked = payload.ship.cloak !== false;
    if (payload.ship.target && $('ghShipTarget')) $('ghShipTarget').value = payload.ship.target === 'js' ? 'js' : 'luau';
  }
  modal.hidden = false;
  showTab(tab);
  hydrateToken();
}

function closeModal() {
  const modal = $('ghModal');
  if (modal) modal.hidden = true;
}

/* --------------------------------------------------------------- client --- */

function currentToken() {
  return ($('ghToken') && $('ghToken').value.trim()) || loadToken();
}

function client() {
  const token = currentToken();
  if (!state.client || state.client.token !== token) {
    state.client = new GithubClient({ token });
  }
  return state.client;
}

function hydrateToken() {
  const input = $('ghToken');
  if (!input) return;
  if (!input.value) {
    const saved = loadToken();
    if (saved) input.value = saved;
  }
  if ($('ghRemember')) $('ghRemember').checked = !!input.value;
  const last = loadLastRepo();
  if (last && last.fullName) {
    if ($('ghRepoStatus') && $('ghRepoStatus').textContent === 'chưa tải') {
      $('ghRepoStatus').textContent = 'lần trước: ' + last.fullName;
    }
    state.repo = {
      owner: last.owner,
      name: last.name,
      fullName: last.fullName,
      branch: last.branch || 'main',
    };
  }
}

async function testToken() {
  const status = $('ghKeyStatus');
  const token = currentToken();
  if (!token) {
    setStatus(status, 'Chưa nhập token.', 'bad');
    return null;
  }
  setStatus(status, 'đang kiểm tra…');
  try {
    const me = await client().me();
    const rl = await client().rateLimit().catch(() => null);
    const left = rl && rl.resources && rl.resources.core ? rl.resources.core.remaining : null;
    setStatus(
      status,
      'OK · đăng nhập ' + (me.login || '?') + (left != null ? ' · còn ' + left + ' lượt gọi API' : ''),
      'ok',
    );
    toast('Token dùng được: ' + (me.login || ''), 'ok');
    loadRepos();
    return me;
  } catch (err) {
    setStatus(status, errText(err), 'bad');
    toast(errText(err), 'bad', 8000);
    return null;
  }
}

function persistToken() {
  const token = currentToken();
  if (!token) return;
  const remember = $('ghRemember') ? $('ghRemember').checked : false;
  // 'nhớ' = ghi vào localStorage; không nhớ = xoá bản đã lưu (token chỉ nằm trong RAM)
  saveToken(remember ? token : '');
  setStatus($('ghKeyStatus'), remember ? 'Đã lưu token trên máy này.' : 'Đã dùng token cho phiên này (không lưu).', 'ok');
}

/* ---------------------------------------------------------------- repo --- */

async function loadRepos() {
  const status = $('ghRepoStatus');
  const select = $('ghRepoSelect');
  if (!select) return [];
  if (!currentToken()) {
    setStatus(status, 'cần API key ở tab 1', 'bad');
    return [];
  }
  setStatus(status, 'đang tải…');
  try {
    const list = await client().listRepos({ perPage: 100 });
    state.repos = Array.isArray(list) ? list : [];
    select.innerHTML = '';
    if (!state.repos.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = '— tài khoản chưa có dự án nào —';
      select.appendChild(opt);
      setStatus(status, '0 dự án', 'warn');
      return [];
    }
    for (const repo of state.repos) {
      const opt = document.createElement('option');
      opt.value = repo.full_name;
      opt.textContent =
        repo.full_name + (repo.private ? ' · riêng tư' : ' · công khai') + (repo.language ? ' · ' + repo.language : '');
      opt.dataset.branch = repo.default_branch || 'main';
      select.appendChild(opt);
    }
    const last = loadLastRepo();
    if (last && last.fullName && state.repos.some((r) => r.full_name === last.fullName)) {
      select.value = last.fullName;
      selectRepo(last.fullName);
    }
    setStatus(status, state.repos.length + ' dự án', 'ok');
    return state.repos;
  } catch (err) {
    setStatus(status, errText(err), 'bad');
    return [];
  }
}

function selectRepo(fullName) {
  const repo = state.repos.find((r) => r.full_name === fullName);
  if (!repo) {
    state.repo = null;
    state.files = [];
    state.filesRepo = '';
    state.file = null;
    clearFileLinks();
    if ($('ghFileInfo')) $('ghFileInfo').textContent = 'chưa chọn dự án';
    return null;
  }
  state.repo = {
    owner: repo.owner.login,
    name: repo.name,
    fullName: repo.full_name,
    branch: repo.default_branch || 'main',
  };
  state.files = [];
  state.filesRepo = '';
  state.file = null;
  clearFileLinks();
  saveLastRepo(state.repo);
  if ($('ghFileInfo')) $('ghFileInfo').textContent = 'đang tải file của ' + repo.full_name + '…';
  if ($('ghFileSelect')) $('ghFileSelect').innerHTML = '<option value="">— đang tải file… —</option>';
  // Chọn dự án là tự tải danh sách file (1 request) để link mã nguồn hiện ra ngay,
  // không cần bấm “Xem các file” và không cần đẩy code lên trước.
  autoLoadFiles();
  return state.repo;
}

/** Tự tải file sau khi chọn dự án + chọn sẵn 1 file để link hiện ngay (không tải nội dung). */
function autoLoadFiles() {
  if (!state.repo || !currentToken()) return Promise.resolve([]);
  return loadFiles().then((files) => {
    if (!files || !files.length) return files || [];
    const prefer = ['.js', '.mjs', '.lua', '.luau', '.md', '.txt', '.json'];
    const byExt = prefer.map((ext) => files.find((f) => String(f.path).toLowerCase().endsWith(ext))).find(Boolean);
    const pick = files.find((f) => f.path === (state.file && state.file.path)) || byExt || files[0];
    if (pick) {
      const sel = $('ghFileSelect');
      if (sel) sel.value = pick.path;
      if ($('ghFilePath')) $('ghFilePath').textContent = pick.path;
      showFileLinks(pick.path);
    }
    return files;
  });
}

async function createRepo() {
  const status = $('ghNewStatus');
  const nameRaw = $('ghNewName') ? $('ghNewName').value : '';
  const check = validateRepoName(nameRaw);
  if (!check.ok) {
    setStatus(status, check.message, 'bad');
    return null;
  }
  if (!currentToken()) {
    showTab('key');
    setStatus(status, 'Cần API key trước (tab 1).', 'bad');
    return null;
  }
  setStatus(status, 'đang tạo dự án…');
  try {
    const repo = await client().createRepo({
      name: check.value,
      description: ($('ghNewDesc') && $('ghNewDesc').value) || 'Mã nguồn từ AIA Secure Script',
      private: $('ghNewPrivate') ? $('ghNewPrivate').checked : true,
      autoInit: true,
    });
    state.repo = {
      owner: repo.owner.login,
      name: repo.name,
      fullName: repo.full_name,
      branch: repo.default_branch || 'main',
    };
    saveLastRepo(state.repo);
    setStatus(status, 'Đã tạo ' + repo.full_name + ' — đang đẩy code…', 'ok');
    toast('Đã tạo dự án ' + repo.full_name, 'ok');
    await loadRepos();
    if ($('ghRepoSelect')) $('ghRepoSelect').value = repo.full_name;
    // tạo xong là đẩy code đang soạn lên luôn (nếu có)
    const pub = await publish();
    return repo;
  } catch (err) {
    setStatus(status, errText(err), 'bad');
    toast(errText(err), 'bad', 8000);
    return null;
  }
}

/* ---------------------------------------------------------------- files --- */

async function loadFiles() {
  const status = $('ghFileInfo');
  const select = $('ghFileSelect');
  if (!select) return [];
  if (!state.repo) {
    setStatus(status, 'chưa chọn dự án', 'bad');
    return [];
  }
  // Đang tải đúng dự án này thì trả về lần tải đó (chọn dự án tự tải + bấm nút ≠ 2 request).
  const repo = state.repo;
  if (state.loadingFiles && state.loadingFiles.repo === repo.fullName) return state.loadingFiles.promise;
  setStatus(status, 'đang đếm file…');
  const promise = (async () => {
    try {
      const tree = await client().getTree(repo.owner, repo.name, repo.branch, true);
      const files = (tree.tree || []).filter((n) => n.type === 'blob');
      // Người dùng đã đổi dự án trong lúc chờ ⇒ bỏ kết quả cũ, không ghi đè danh sách mới.
      if (!state.repo || state.repo.fullName !== repo.fullName) return files;
      state.files = files;
      state.filesRepo = repo.fullName;
      select.innerHTML = '';
      if (!files.length) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = '— dự án chưa có file —';
        select.appendChild(opt);
      }
      for (const f of files) {
        const opt = document.createElement('option');
        opt.value = f.path;
        opt.textContent = f.path + (f.size != null ? ' · ' + fmtSize(f.size) : '');
        select.appendChild(opt);
      }
      setStatus(status, repo.fullName + ' có ' + files.length + ' file', 'ok');
      // Cập nhật lại dòng ghi chú cho file đang mở — chỉ khi file đó có thật trong danh sách mới
      // (file vừa xoá / đường dẫn còn đang gõ thì không hiện lại link cũ).
      const current = (state.file && state.file.path) || ($('ghNewPath') && $('ghNewPath').value.trim()) || '';
      if (current && files.some((f) => f.path === current)) showFileLinks(current);
      return files;
    } catch (err) {
      if (state.repo && state.repo.fullName === repo.fullName) setStatus(status, errText(err), 'bad');
      return [];
    } finally {
      if (state.loadingFiles && state.loadingFiles.repo === repo.fullName) state.loadingFiles = null;
    }
  })();
  state.loadingFiles = { repo: repo.fullName, promise };
  return promise;
}

function fmtSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(2) + ' MB';
}

/* ------------------------------------------------ link mã nguồn tự điền --- */

/**
 * Link xem tệp + link raw + link dự án cho một đường dẫn trong dự án đang chọn.
 * Chỉ ghép chuỗi từ thông tin đã biết — KHÔNG gọi GitHub, KHÔNG cần tệp đã tồn tại.
 */
function buildFileLinks(path) {
  if (!state.repo) return null;
  const clean = String(path == null ? '' : path).trim().replace(/^\/+/, '');
  if (!clean) return null;
  const owner = state.repo.owner;
  const name = state.repo.name;
  const branch = state.repo.branch || 'main';
  return {
    path: clean,
    owner,
    name,
    branch,
    htmlUrl: fileHtmlUrl(owner, name, branch, clean),
    rawUrl: fileRawUrl(owner, name, branch, clean),
    repoUrl: repoHtmlUrl(owner, name),
  };
}

/** Tệp đã có trên GitHub chưa — chỉ dựa vào danh sách đã tải, không gọi API. */
function fileExistsOnGithub(path) {
  if (state.file && state.file.path === path && state.file.sha) return true;
  if (!state.repo || state.filesRepo !== state.repo.fullName) return false;
  return state.files.some((f) => f && f.path === path);
}

function clearFileLinks() {
  if ($('ghFileLinks')) $('ghFileLinks').hidden = true;
  if ($('ghFileLink')) $('ghFileLink').value = '';
  if ($('ghFileRaw')) $('ghFileRaw').value = '';
  if ($('ghFileLinkOpen')) $('ghFileLinkOpen').href = '#';
  if ($('ghRepoLink')) {
    $('ghRepoLink').href = '#';
    $('ghRepoLink').hidden = true;
  }
  if ($('ghFileLinkNote')) {
    $('ghFileLinkNote').textContent = '—';
    $('ghFileLinkNote').classList.remove('is-missing');
  }
}

/**
 * Hiện link mã nguồn ngay khi chọn dự án / chọn file / gõ đường dẫn.
 * `opts.exists`: đã chắc tệp có trên GitHub (VD vừa lưu xong). Bỏ trống = tự đoán.
 * `opts.prefix`: câu mở đầu thêm vào dòng ghi chú.
 */
function showFileLinks(path, opts = {}) {
  const box = $('ghFileLinks');
  const links = buildFileLinks(path);
  if (!box || !links) return null;
  const exists = opts.exists != null ? !!opts.exists : fileExistsOnGithub(links.path);
  if ($('ghFileLink')) $('ghFileLink').value = links.htmlUrl;
  if ($('ghFileRaw')) $('ghFileRaw').value = links.rawUrl;
  if ($('ghFileLinkOpen')) $('ghFileLinkOpen').href = links.htmlUrl;
  if ($('ghRepoLink')) {
    $('ghRepoLink').href = links.repoUrl;
    $('ghRepoLink').hidden = false;
  }
  const note = $('ghFileLinkNote');
  if (note) {
    const stateText = exists
      ? 'Đang có sẵn trên GitHub · nhánh ' + links.branch + ' — không cần đẩy lại, link dùng được ngay.'
      : 'Tệp chưa có trên GitHub — link đã đúng sẵn, sẽ sống sau khi bạn bấm “Lưu thay đổi” hoặc “Thêm / ghi file”.';
    note.textContent = (opts.prefix ? opts.prefix + ' ' : '') + stateText;
    note.classList.toggle('is-missing', !exists);
  }
  box.hidden = false;
  return links;
}

async function openFile(path) {
  const status = $('ghFileStatus');
  const box = $('ghFileContent');
  if (!state.repo || !path) {
    setStatus(status, 'Chọn dự án và file trước.', 'bad');
    return null;
  }
  setStatus(status, 'đang mở ' + path + '…');
  try {
    const data = await client().getFile(state.repo.owner, state.repo.name, path, state.repo.branch);
    if (Array.isArray(data)) {
      setStatus(status, 'Đây là thư mục, không phải file.', 'bad');
      return null;
    }
    let text = '';
    if (data.content && data.encoding === 'base64') text = b64DecodeUtf8(data.content);
    else if (typeof data.content === 'string') text = data.content;
    if (box) box.value = text;
    state.file = { path, sha: data.sha };
    if ($('ghFilePath')) $('ghFilePath').textContent = path;
    if ($('ghNewPath')) $('ghNewPath').value = path;
    // vừa đọc được từ GitHub ⇒ chắc chắn có thật, hiện link ngay (không cần bấm gì thêm)
    showFileLinks(path, { exists: true });
    setStatus(status, 'Đã mở ' + path + ' (' + fmtSize(text.length) + '). Sửa rồi bấm “Lưu thay đổi”.', 'ok');
    return state.file;
  } catch (err) {
    setStatus(status, errText(err), 'bad');
    return null;
  }
}

async function saveFile() {
  const status = $('ghFileStatus');
  const box = $('ghFileContent');
  const path = ($('ghNewPath') && $('ghNewPath').value.trim()) || (state.file && state.file.path);
  if (!state.repo) return setStatus(status, 'Chưa chọn dự án.', 'bad');
  if (!path) return setStatus(status, 'Chưa có đường dẫn file.', 'bad');
  if (!box) return null;
  setStatus(status, 'đang lưu ' + path + '…');
  try {
    const res = await client().putFile({
      owner: state.repo.owner,
      repo: state.repo.name,
      path,
      content: box.value,
      message: 'Cập nhật ' + path + ' từ AIA Secure Script',
      branch: state.repo.branch,
      sha: state.file && state.file.path === path ? state.file.sha : undefined,
    });
    state.file = { path, sha: (res && res.content && res.content.sha) || '' };
    if ($('ghFilePath')) $('ghFilePath').textContent = path;
    const url = fileHtmlUrl(state.repo.owner, state.repo.name, state.repo.branch, path);
    showFileLinks(path, { exists: true, prefix: 'Vừa lưu lên GitHub.' });
    setStatus(status, 'Đã lưu ' + path + ' · ' + url, 'ok');
    toast('Đã lưu ' + path + ' lên GitHub.', 'ok');
    await loadFiles();
    return res;
  } catch (err) {
    setStatus(status, errText(err), 'bad');
    toast(errText(err), 'bad', 8000);
    return null;
  }
}

async function addFile() {
  const status = $('ghFileStatus');
  const path = ($('ghNewPath') && $('ghNewPath').value.trim()) || '';
  const box = $('ghFileContent');
  if (!state.repo) return setStatus(status, 'Chưa chọn dự án.', 'bad');
  if (!path) return setStatus(status, 'Nhập đường dẫn cho file mới (VD: assets/part2.js).', 'bad');
  if (!box) return null;
  // đang chọn đúng file đó thì coi như lưu; khác thì tạo mới
  if (state.file && state.file.path === path) return saveFile();
  setStatus(status, 'đang thêm ' + path + '…');
  try {
    const res = await client().putFile({
      owner: state.repo.owner,
      repo: state.repo.name,
      path,
      content: box.value,
      message: 'Thêm ' + path + ' từ AIA Secure Script',
      branch: state.repo.branch,
      sha: undefined,
    });
    state.file = { path, sha: (res && res.content && res.content.sha) || '' };
    if ($('ghFilePath')) $('ghFilePath').textContent = path;
    showFileLinks(path, { exists: true, prefix: 'Vừa thêm lên GitHub.' });
    setStatus(status, 'Đã thêm ' + path + '.', 'ok');
    toast('Đã thêm file ' + path, 'ok');
    await loadFiles();
    return res;
  } catch (err) {
    setStatus(status, errText(err), 'bad');
    return null;
  }
}

async function deleteFile() {
  const status = $('ghFileStatus');
  const path = ($('ghFileSelect') && $('ghFileSelect').value) || (state.file && state.file.path);
  if (!state.repo || !path) return setStatus(status, 'Chọn file cần xoá trước.', 'bad');
  if (typeof confirm === 'function' && !confirm('Xoá ' + path + ' khỏi ' + state.repo.fullName + '?')) return null;
  setStatus(status, 'đang xoá…');
  try {
    let sha = state.file && state.file.path === path ? state.file.sha : '';
    if (!sha) {
      const data = await client().getFile(state.repo.owner, state.repo.name, path, state.repo.branch);
      sha = data && data.sha;
    }
    await client().deleteFile({
      owner: state.repo.owner,
      repo: state.repo.name,
      path,
      message: 'Xoá ' + path + ' từ AIA Secure Script',
      branch: state.repo.branch,
      sha,
    });
    state.file = null;
    if ($('ghFileContent')) $('ghFileContent').value = '';
    if ($('ghFilePath')) $('ghFilePath').textContent = '—';
    clearFileLinks();
    setStatus(status, 'Đã xoá ' + path + '.', 'ok');
    toast('Đã xoá ' + path, 'ok');
    await loadFiles();
    return true;
  } catch (err) {
    setStatus(status, errText(err), 'bad');
    return null;
  }
}

/* -------------------------------------------------------------- publish --- */

function editorPayload() {
  if (state.bridge && typeof state.bridge.editor === 'function') return state.bridge.editor();
  if (globalThis.AIA_EDITOR && typeof globalThis.AIA_EDITOR.content === 'function') return globalThis.AIA_EDITOR.content();
  return { content: '', name: 'script.js' };
}

function publishContent() {
  const fromEditor = editorPayload();
  if (fromEditor && fromEditor.content && fromEditor.content.trim()) return fromEditor;
  const box = $('ghFileContent');
  return { content: box ? box.value : '', name: (fromEditor && fromEditor.name) || 'script.js' };
}

function showPublished(res, path) {
  state.published = res;
  const out = $('ghResultOut');
  const link = $('ghResultLink');
  const raw = $('ghResultRaw');
  const open = $('ghResultOpen');
  if (link) link.value = res.htmlUrl || fileHtmlUrl(res.repo.owner.login, res.repo.name, res.repo.default_branch, path);
  if (raw) raw.value = res.rawUrl || fileRawUrl(res.repo.owner.login, res.repo.name, res.repo.default_branch, path);
  if (open) open.href = link ? link.value : '#';
  if (out) out.hidden = false;
  setStatus(
    $('ghPublishStatus'),
    'Đã đăng lên ' + res.repo.full_name + ' · ' + path + ' — link ở dưới.' + (res.pagesUrl ? ' GitHub Pages: ' + res.pagesUrl : ''),
    'ok',
  );
}

async function publish() {
  const status = $('ghPublishStatus');
  const payload = publishContent();
  const path = (($('ghPublishPath') && $('ghPublishPath').value.trim()) || payload.name || 'script.js').replace(/^\/+/, '');
  if (!payload.content || !payload.content.trim()) {
    setStatus(status, 'Chưa có code để đăng — mở tab Lập trình và dán code, hoặc dùng tab Sửa file.', 'bad');
    return null;
  }
  if (!currentToken()) {
    showTab('key');
    setStatus(status, 'Cần API key trước (tab 1).', 'bad');
    return null;
  }
  if (!state.repo) {
    showTab('new');
    setStatus(status, 'Chưa có dự án — tạo dự án ở tab “Mã nguồn” trước.', 'bad');
    return null;
  }
  showTab('result');
  setStatus(status, 'đang đẩy ' + path + ' lên ' + state.repo.fullName + '…');
  try {
    const res = await client().publishFile({
      owner: state.repo.owner,
      repo: state.repo.name,
      branch: state.repo.branch,
      path,
      content: payload.content,
      description: 'Mã nguồn từ AIA Secure Script',
    });
    showPublished(res, path);
    toast('Đã đăng code lên GitHub · ' + path, 'ok', 6000);
    if ($('ghNewStatus') && state.tab === 'new') {
      setStatus($('ghNewStatus'), 'Đã đẩy ' + path + ' lên ' + res.repo.full_name + '.', 'ok');
    }
    if (state.files.length) loadFiles();
    return res;
  } catch (err) {
    setStatus(status, errText(err), 'bad');
    toast(errText(err), 'bad', 9000);
    return null;
  }
}


/* ================================================== xuất bản một nút --- */

/** Điền sẵn thư mục / tên dự án / loại tệp cho tab xuất bản. */
function hydrateShip() {
  const payload = state.payload || publishContent();
  const name = (payload && payload.name) || 'script.lua';
  if ($('ghShipFile') && !$('ghShipFile').value.trim()) $('ghShipFile').value = name;
  if ($('ghShipTarget') && /\.(lua|luau|rbxlx?)$/i.test(name)) $('ghShipTarget').value = 'luau';
  if ($('ghShipRepo') && !$('ghShipRepo').value.trim()) {
    const fallback = (state.repo && state.repo.name) || name.replace(/\.[a-z0-9]+$/i, '') || 'aia-script';
    $('ghShipRepo').value = fallback.replace(/[^A-Za-z0-9._-]/g, '-').slice(0, 100) || 'aia-script';
  }
  if ($('ghShipDir') && !$('ghShipDir').value.trim()) $('ghShipDir').value = 's';
  syncShipCloakUi();
  if (state.ship) renderShip(state.ship);
}

/** Ẩn/hiện phần phụ thuộc khi bật/tắt chống soi. */
function syncShipCloakUi() {
  const on = !!(($('ghShipCloak') && $('ghShipCloak').checked));
  if ($('ghShipWhiteTextRow')) $('ghShipWhiteTextRow').hidden = !on;
  if ($('ghShipWhiteText')) $('ghShipWhiteText').disabled = !on;
  const enc = !!($('ghShipEncrypt') && $('ghShipEncrypt').checked);
  if ($('ghShipKeyLink') && $('ghShipKeyLink').closest('.field')) {
    $('ghShipKeyLink').closest('.field').hidden = !enc;
  }
}

/** Chủ repo: ưu tiên dự án đang chọn, nếu chưa có thì hỏi GitHub (/user). */
async function resolveShipOwner() {
  if (state.shipOwner) return state.shipOwner;
  if (state.repo && state.repo.owner) {
    state.shipOwner = state.repo.owner;
    return state.shipOwner;
  }
  const me = await client().me();
  state.shipOwner = (me && me.login) || '';
  return state.shipOwner;
}


/** Báo cho tab Lập trình biết link vừa có (CustomEvent có thể vắng ở môi trường test). */
function notifyShip(detail) {
  if (typeof document === 'undefined' || !document.dispatchEvent) return;
  const view = document.defaultView;
  const CE = (view && view.CustomEvent) || (typeof CustomEvent === 'function' ? CustomEvent : null);
  try {
    if (CE) document.dispatchEvent(new CE('aia:ship', { detail }));
    else if (typeof document.createEvent === 'function') {
      const ev = document.createEvent('CustomEvent');
      ev.initCustomEvent('aia:ship', false, false, detail);
      document.dispatchEvent(ev);
    }
  } catch {
    /* môi trường không hỗ trợ sự kiện — bỏ qua, link vẫn hiện trong hộp thoại */
  }
}

/** Dòng lệnh sẵn để dán vào Delta/executor: dán mỗi URL trần thì executor không chạy gì. */
export function buildRunCommand(url) {
  const u = String(url || '').trim().replace(/"/g, '%22');
  if (!u) return '';
  return 'loadstring(game:HttpGet("' + u + '"))()';
}

function renderShip(res) {
  state.ship = res;
  const out = $('ghShipOut');
  if (out) out.hidden = false;
  const links = res.links || {};
  if ($('ghShipScriptLink')) $('ghShipScriptLink').value = links.scriptUrl || '';
  if ($('ghShipSnippet')) $('ghShipSnippet').value = buildRunCommand(links.scriptUrl);
  if ($('ghShipPublicLink')) $('ghShipPublicLink').value = links.publicUrl || '(chưa bật chống soi)';
  if ($('ghShipKeyLink')) $('ghShipKeyLink').value = links.keyUrl || '(không dùng khoá)';
  if ($('ghShipOpen')) $('ghShipOpen').href = links.scriptUrl || '#';
  if ($('ghShipSummary')) {
    const total = (res.files || []).reduce((n, f) => n + (f.size || 0), 0);
    $('ghShipSummary').textContent =
      (res.files || []).length + ' tệp · ' + fmtSize(total) + ' · ' + res.owner + '/' + res.repo;
  }
  if ($('ghShipFiles')) {
    $('ghShipFiles').textContent = (res.files || [])
      .map((f) => (f.updated ? '↻ ' : '+ ') + f.path + '  (' + fmtSize(f.size || 0) + ')')
      .join('\n');
  }
  if ($('ghShipNote')) $('ghShipNote').textContent = res.note || '';
  syncShipCloakUi();

  // đẩy kết quả về tab Lập trình
  const detail = { links, files: res.files, note: res.note, owner: res.owner, repo: res.repo };
  if ($('edShipLink')) $('edShipLink').value = links.scriptUrl || '';
  notifyShip(detail);
  return res;
}

/** Nút chính: mã hoá + chống soi + đẩy lên GitHub + trả link. */
async function shipToGithub() {
  const status = $('ghShipStatus');
  const btn = $('ghShipGo');
  const payload = state.payload && state.payload.content ? state.payload : publishContent();
  const code = (payload && payload.content) || '';
  if (!code.trim()) {
    setStatus(status, 'Chưa có code — mở tab Lập trình và dán code trước.', 'bad');
    toast('Chưa có code để xuất bản.', 'warn');
    return null;
  }
  if (!currentToken()) {
    showTab('key');
    setStatus(status, 'Cần API key trước (tab 1).', 'bad');
    return null;
  }
  const repoName = (($('ghShipRepo') && $('ghShipRepo').value.trim()) || '').replace(/^\/+|\/+$/g, '');
  const check = validateRepoName(repoName);
  if (!check.ok) {
    setStatus(status, check.message, 'bad');
    return null;
  }
  const encrypt = !$('ghShipEncrypt') || $('ghShipEncrypt').checked;
  const cloak = !$('ghShipCloak') || $('ghShipCloak').checked;
  const whiteText = !$('ghShipWhiteText') || $('ghShipWhiteText').checked;
  const target = ($('ghShipTarget') && $('ghShipTarget').value) === 'js' ? 'js' : 'luau';
  const dir = sanitizeDir(($('ghShipDir') && $('ghShipDir').value) || 's', 's');
  const rawName = ($('ghShipFile') && $('ghShipFile').value.trim()) || '';
  // tên tệp phải khớp đích: .js cho web, .lua cho game (để header ghi đúng ngôn ngữ)
  const stem = rawName.replace(/\.[a-z0-9]+$/i, '') || (target === 'js' ? 'script' : 'script');
  const fileName =
    target === 'js'
      ? /\.(m?js|cjs)$/i.test(rawName) ? rawName : stem + '.js'
      : /\.(lua|luau)$/i.test(rawName) ? rawName : stem + '.lua';
  const publicRepo = !$('ghShipPublic') || $('ghShipPublic').checked;

  if (btn) btn.disabled = true;
  setStatus(status, 'đang mã hoá…');
  try {
    const owner = await resolveShipOwner();
    if (!owner) throw new GithubError('Không đọc được tài khoản GitHub từ token.', { code: 'GH_NO_USER' });

    const plan = await buildPublishPlan({
      code,
      target,
      owner,
      repo: repoName,
      branch: 'main',
      dir,
      whiteText,
      cloak,
      encrypt,
      fileName,
      passphrase: '',
    });

    const res = await publishPlanToGithub({
      plan,
      client: client(),
      publicRepo,
      onProgress: (m) => setStatus(status, m),
    });

    setStatus(
      status,
      'Xong · ' + res.files.length + ' tệp đã lên ' + res.owner + '/' + res.repo + '. Link ở dưới — bấm “Chép link script”.',
      'ok',
    );
    renderShip(res);
    saveLastRepo({ owner: res.owner, name: res.repo, fullName: res.owner + '/' + res.repo, branch: res.branch });
    toast('Đã đưa lên GitHub · link script đã sẵn sàng để chép.', 'ok', 6000);

    // kiểm tra trang đã build chưa (không chặn nút)
    if (res.pages && res.pages.enabled) {
      waitForPagesBuild(client(), res.owner, res.repo, {
        timeoutMs: 36000,
        intervalMs: 6000,
        onTick: (b) => {
          if (b.status === 'built') setStatus(status, 'GitHub Pages đã build xong — link sống ngay bây giờ.', 'ok');
        },
      }).then((b) => {
        if (b.status === 'errored') setStatus(status, 'Pages build lỗi — kiểm tra repo, link raw vẫn dùng được: ' + res.links.rawUrl, 'bad');
        else if (b.status !== 'built') setStatus(status, 'Đã đẩy xong. Pages còn đang build (thường 30–90 giây), link vẫn đúng.', 'ok');
      });
    }
    return res;
  } catch (err) {
    setStatus(status, errText(err), 'bad');
    toast(errText(err), 'bad', 9000);
    return null;
  } finally {
    if (btn) btn.disabled = false;
  }
}

/** Nút “Kiểm tra trang đã sống”. */
async function checkShipPages() {
  const res = state.ship;
  if (!res) {
    setStatus($('ghShipStatus'), 'Chưa xuất bản lần nào.', 'warn');
    return null;
  }
  setStatus($('ghShipStatus'), 'đang hỏi GitHub…');
  const st = await pagesBuildStatus(client(), res.owner, res.repo);
  if (st.status === 'built') setStatus($('ghShipStatus'), 'Trang đã build xong — mở link là chạy.', 'ok');
  else if (st.status === 'building') setStatus($('ghShipStatus'), 'GitHub vẫn đang build (thường 30–90 giây).', 'warn');
  else setStatus($('ghShipStatus'), 'Chưa có thông tin build: ' + (st.error || st.status), 'warn');
  return st;
}

/* ------------------------------------------------------------- nối nút --- */

export function initGithub(bridge) {
  state.bridge = bridge;
  if (!$('ghModal')) return null;

  if ($('ghOpenBtn')) $('ghOpenBtn').addEventListener('click', () => openModal('key'));
  if ($('ghClose')) $('ghClose').addEventListener('click', closeModal);
  $('ghModal').addEventListener('click', (e) => {
    if (e.target === $('ghModal')) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('ghModal').hidden) closeModal();
  });
  document.querySelectorAll('[data-gh]').forEach((b) => {
    b.addEventListener('click', () => showTab(b.dataset.gh));
  });

  if ($('ghTest')) $('ghTest').addEventListener('click', () => testToken());
  if ($('ghSaveKey')) $('ghSaveKey').addEventListener('click', () => persistToken());
  if ($('ghToken')) {
    $('ghToken').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        testToken();
      }
    });
  }
  if ($('ghCreate')) $('ghCreate').addEventListener('click', () => createRepo());
  if ($('ghLoadRepos')) $('ghLoadRepos').addEventListener('click', () => loadRepos());
  if ($('ghRepoSelect')) $('ghRepoSelect').addEventListener('change', (e) => selectRepo(e.target.value));
  if ($('ghLoadFiles')) $('ghLoadFiles').addEventListener('click', () => loadFiles());
  if ($('ghFileSelect')) {
    $('ghFileSelect').addEventListener('change', (e) => {
      const path = e.target.value;
      if (!path) return clearFileLinks();
      // hiện link ngay (không cần chờ mở nội dung), rồi mới tải nội dung
      showFileLinks(path);
      openFile(path);
    });
  }
  if ($('ghNewPath')) {
    $('ghNewPath').addEventListener('input', () => {
      const path = $('ghNewPath').value.trim();
      if (path) showFileLinks(path);
      else if (state.file) showFileLinks(state.file.path);
      else clearFileLinks();
    });
  }
  if ($('ghFileLinkCopy')) {
    $('ghFileLinkCopy').addEventListener('click', () => {
      const v = $('ghFileLink') && $('ghFileLink').value;
      if (!v) return toast('Chưa có link — chọn dự án và file trước.', 'warn');
      copy(v, 'Đã chép link mã nguồn.');
    });
  }
  if ($('ghFileRawCopy')) {
    $('ghFileRawCopy').addEventListener('click', () => {
      const v = $('ghFileRaw') && $('ghFileRaw').value;
      if (!v) return toast('Chưa có link raw — chọn dự án và file trước.', 'warn');
      copy(v, 'Đã chép link raw.');
    });
  }
  if ($('ghOpenFile')) {
    $('ghOpenFile').addEventListener('click', () => {
      const path = ($('ghFileSelect') && $('ghFileSelect').value) || '';
      if (!path) return toast('Chọn file trước.', 'warn');
      openFile(path);
    });
  }
  if ($('ghSaveFile')) $('ghSaveFile').addEventListener('click', () => saveFile());
  if ($('ghAddFile')) $('ghAddFile').addEventListener('click', () => addFile());
  if ($('ghDeleteFile')) $('ghDeleteFile').addEventListener('click', () => deleteFile());
  if ($('ghPublish')) $('ghPublish').addEventListener('click', () => publish());
  if ($('ghPublishFromFile')) {
    $('ghPublishFromFile').addEventListener('click', () => {
      const box = $('ghFileContent');
      if (!box || !box.value.trim()) return toast('Tab Sửa file đang trống.', 'warn');
      showTab('result');
      publish();
    });
  }
  if ($('ghShipGo')) $('ghShipGo').addEventListener('click', () => shipToGithub());
  if ($('ghShipWait')) $('ghShipWait').addEventListener('click', () => checkShipPages());
  if ($('ghShipCloak')) $('ghShipCloak').addEventListener('change', syncShipCloakUi);
  if ($('ghShipEncrypt')) $('ghShipEncrypt').addEventListener('change', syncShipCloakUi);
  if ($('ghShipCopyScript')) {
    $('ghShipCopyScript').addEventListener('click', () => {
      const v = $('ghShipScriptLink') && $('ghShipScriptLink').value;
      if (!v) return toast('Chưa có link script.', 'warn');
      copy(v, 'Đã chép link script — dán vào game là chạy.');
    });
  }
  if ($('ghShipCopySnippet')) {
    $('ghShipCopySnippet').addEventListener('click', () => {
      const v = $('ghShipSnippet') && $('ghShipSnippet').value;
      if (!v) return toast('Chưa có dòng lệnh — xuất bản trước.', 'warn');
      copy(v, 'Đã chép — dán vào Delta/executor là chạy.');
    });
  }
  if ($('ghShipCopyPublic')) {
    $('ghShipCopyPublic').addEventListener('click', () => {
      const v = $('ghShipPublicLink') && $('ghShipPublicLink').value;
      if (!v) return toast('Chưa có link công khai.', 'warn');
      copy(v, 'Đã chép link công khai.');
    });
  }
  if ($('ghShipCopyKey')) {
    $('ghShipCopyKey').addEventListener('click', () => {
      const v = $('ghShipKeyLink') && $('ghShipKeyLink').value;
      if (!v) return toast('Không có tệp khoá.', 'warn');
      copy(v, 'Đã chép link tệp khoá (đừng chia sẻ).');
    });
  }
  if ($('ghResultCopy')) {
    $('ghResultCopy').addEventListener('click', () => {
      const value = $('ghResultLink') && $('ghResultLink').value;
      if (!value) return toast('Chưa có link.', 'warn');
      copy(value, 'Đã chép link GitHub.');
    });
  }

  hydrateToken();

  const api = {
    open: openModal,
    close: closeModal,
    showTab,
    client,
    testToken,
    loadRepos,
    selectRepo,
    createRepo,
    loadFiles,
    openFile,
    saveFile,
    addFile,
    deleteFile,
    publish,
    showFileLinks,
    buildFileLinks,
    buildRunCommand,
    autoLoadFiles,
    ship: shipToGithub,
    checkShipPages,
    renderShip,
    state,
    helpers: { GithubError, explainStatus },
  };
  globalThis.AIA_GH = api;
  return api;
}
