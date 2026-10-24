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
} from './github.js';

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
  const panes = { key: 'ghPaneKey', new: 'ghPaneNew', edit: 'ghPaneEdit', result: 'ghPaneResult' };
  for (const [k, id] of Object.entries(panes)) {
    const el = $(id);
    if (el) el.hidden = k !== name;
  }
  if (name === 'edit' && !state.repos.length) loadRepos();
}

function openModal(tab = 'key', payload = null) {
  const modal = $('ghModal');
  if (!modal) return;
  if (payload && payload.content != null) {
    // đẩy code từ tab Lập trình sang phần nội dung file
    if ($('ghFileContent') && !$('ghFileContent').value) $('ghFileContent').value = payload.content;
    if (payload.name && $('ghPublishPath')) $('ghPublishPath').value = payload.name;
    if (payload.name && $('ghNewName') && !$('ghNewName').value) {
      $('ghNewName').value = payload.name.replace(/\.[a-z0-9]+$/i, '');
    }
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
    return null;
  }
  state.repo = {
    owner: repo.owner.login,
    name: repo.name,
    fullName: repo.full_name,
    branch: repo.default_branch || 'main',
  };
  saveLastRepo(state.repo);
  if ($('ghFileInfo')) $('ghFileInfo').textContent = 'chưa xem file của ' + repo.full_name;
  if ($('ghFileSelect')) $('ghFileSelect').innerHTML = '<option value="">— bấm “Xem các file” —</option>';
  return state.repo;
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
  setStatus(status, 'đang đếm file…');
  try {
    const tree = await client().getTree(state.repo.owner, state.repo.name, state.repo.branch, true);
    const files = (tree.tree || []).filter((n) => n.type === 'blob');
    state.files = files;
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
    setStatus(status, state.repo.fullName + ' có ' + files.length + ' file', 'ok');
    return files;
  } catch (err) {
    setStatus(status, errText(err), 'bad');
    return [];
  }
}

function fmtSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(2) + ' MB';
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
      if (e.target.value) openFile(e.target.value);
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
    state,
    helpers: { GithubError, explainStatus },
  };
  globalThis.AIA_GH = api;
  return api;
}
