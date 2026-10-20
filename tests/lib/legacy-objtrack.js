'use strict';
/**
 * tests/lib/legacy-objtrack.js
 *
 * Trích NGUYÊN VĂN các hàm của S.ObjTrack (tính năng 🌳 trong tab Người Chơi)
 * từ script.js để chạy trong máy ảo Lua. Mục đích: tái hiện các lỗi đã chỉ ra
 * trong docs/10-phan-tich-dinh-vi-vat-the.md bằng test chạy được, không chỉ
 * dựa vào đọc mã.
 *
 * GIỚI HẠN: đây là các hàm được trích ra, không phải toàn bộ script 7.800 dòng.
 * Chúng chạy trên mock Roblox, không phải Roblox Studio.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT_PATH = path.join(ROOT, 'script.js');

function readScript() {
  return fs.readFileSync(SCRIPT_PATH, 'utf8').replace(/\r/g, '');
}

function sliceBetween(source, startMarker, endMarker, fromIndex = 0) {
  const start = source.indexOf(startMarker, fromIndex);
  if (start < 0) throw new Error(`không tìm thấy mốc bắt đầu: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  if (end < 0) throw new Error(`không tìm thấy mốc kết thúc: ${endMarker}`);
  return { text: source.slice(start, end), start, end };
}

function buildLegacySource() {
  const source = readScript();

  const core = sliceBetween(source, 'local function otRound(n)', 'function OT.RefreshChars()');
  const killClear = sliceBetween(source, 'function OT.Kill(inst)', 'function OT._MakeBox');
  const scanCore = sliceBetween(source, 'function OT.ScanBegin()', 'function OT.ScanSlice(');
  const scanFinish = sliceBetween(source, 'function OT.ScanFinish()', 'function OT.DrainPending');
  const rescan = sliceBetween(source, 'function OT.Rescan(force)', 'function OT.Step(dt)');
  // Đoạn dựng chữ ký dòng danh sách, trích NGUYÊN VĂN từ RefreshList.
  const rowSig = sliceBetween(source, 'local shown = math.max', 'if #OT.list == 0 then');

  return `--!nocheck
-- Tự sinh bởi tests/lib/legacy-objtrack.js — KHÔNG sửa tay.
-- Nguồn: script.js, khối S.ObjTrack.

local S = {
    CopyToClipboard = function()
        return false
    end,
}
local Store = {
    savedObjTracks = {},
    save = function() end,
}

local OT = {}
OT.on = false
OT.query = ""
OT.keys = {}
OT.pathKeys = {}
OT.entries = {}
OT.savedList = {}
OT.items = {}
OT.list = {}
OT.maxDist = 0
OT.maxItems = 60
OT.showRows = 8
OT.showLabel = true
OT.showXYZ = true
OT.showBox = false
OT.thru = true
OT.skipPlayers = true
OT.color = 1
OT.viewMode = "server"
OT.rescanEvery = 0.8
OT._order = {}
OT._tickIdx = 0
OT._pending = {}
OT._queue = {}
OT._qN = 0
OT._pathSet = {}
OT._pathN = 0
OT._chars = {}
OT._nc = setmetatable({}, { __mode = "k" })
OT._gui = nil
OT._slotN = 0
OT._orderN = 0
OT._passing = false
OT._hits = {}
OT._found = 0
OT._scanMs = 0
OT._capped = false
OT._scanAcc = 0
OT._acc = 0
OT._sel = nil
OT._selPart = nil
OT._rowSig = nil
OT._tagSig = nil
OT._lastScan = 0
OT._fastUntil = 0
OT._renderErr = false

function tick()
    return os.clock()
end

function OT.Bind() end
function OT.Unbind() end
function OT.Set() return false end
function OT.Rescan() return 0 end
function OT.RefreshList() end
function OT.RefreshTags() end
function OT.RefreshInfo() end

${core.text}

${killClear.text}

${scanCore.text}

${scanFinish.text}

${rescan.text}

-- Chạy đúng đoạn mã dựng chữ ký của RefreshList để kiểm tra khoảng cách có
-- tham gia chữ ký hay không (nếu không, số "m" trên UI đứng yên).
function OT._TestRowSig()
${rowSig.text}
    return sig
end

LEGACY = OT
`;
}

/** Các kiểm tra tĩnh (không cần máy ảo). */
function staticChecks() {
  const source = readScript();
  const results = [];

  // 1. AutoRestoreSaved được gọi nhưng không hề được định nghĩa.
  const calls = (source.match(/AutoRestoreSaved/g) || []).length;
  const definitions = (source.match(/function\s+OT\.AutoRestoreSaved|OT\.AutoRestoreSaved\s*=\s*function/g) || []).length;
  results.push({
    id: 'LEGACY-AUTORESTORE',
    pass: calls >= 1 && definitions === 0,
    message: `gọi AutoRestoreSaved ${calls} lần, định nghĩa ${definitions} lần (phải: gọi ≥1, định nghĩa 0)`,
  });

  // 2. Chữ ký dòng danh sách không chứa h.dist. (Chữ ký nằm ở nhánh
  //    "server", SAU khối saved/return.)
  const refresh = sliceBetween(source, 'local shown =', 'S.OpenObjectPanel = function()').text;
  const sigStart = refresh.indexOf('local sigParts = {}');
  const sigEnd = refresh.indexOf('local sig = table.concat', sigStart);
  const sigSlice = sigStart >= 0 && sigEnd > sigStart ? refresh.slice(sigStart, sigEnd) : '';
  results.push({
    id: 'LEGACY-STALE-SIG-SRC',
    pass: sigSlice.includes('sigParts[i] = tostring(h.inst.Name)') && !sigSlice.includes('h.dist'),
    message: 'chữ ký dòng danh sách chỉ dùng Name|instance, không dùng h.dist',
  });

  // 3. Rescan gọi ScanSlice với ngân sách khổng lồ + runToEnd=true.
  const rescan = sliceBetween(source, 'function OT.Rescan(force)', 'function OT.Step(dt)').text;
  results.push({
    id: 'LEGACY-SYNC-RESCAN-SRC',
    pass: rescan.includes('ScanSlice(1e9, 1e9, true)'),
    message: 'mã nguồn Rescan gọi ScanSlice(1e9, 1e9, true) — quét cả workspace trong một khung',
  });

  // 4. AutoRestoreSaved nằm trong panel nhưng không có hàm.
  results.push({
    id: 'LEGACY-AUTORESTORE-CALLSITE',
    pass: source.includes('pcall(S.ObjTrack.AutoRestoreSaved)'),
    message: 'panel gọi pcall(S.ObjTrack.AutoRestoreSaved)',
  });

  return results;
}

module.exports = { buildLegacySource, staticChecks, readScript };
