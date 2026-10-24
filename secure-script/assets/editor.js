/* =============================================================================
 * AIA Secure Script — lõi "Lập trình" (trình soạn thảo)
 * -----------------------------------------------------------------------------
 * Thuần JavaScript, KHÔNG phụ thuộc DOM ⇒ chạy test được trên Node.
 *
 *  - analyzeCode(code, {lang})  : tìm lỗi cú pháp + cảnh báo + thống kê kích thước
 *  - checkBalance(code)         : dò ngoặc/chuỗi lệch, trả về dòng–cột
 *  - countLuaBlocks(code)       : ước lượng khối function/if/do … end của Lua
 *  - formatSize(bytes)          : B / KB / MB / GB
 *  - lineCount / clampFontSize  : tiện ích cho giao diện
 * ========================================================================== */

export const FONT_MIN = 10;
export const FONT_MAX = 28;
export const FONT_DEFAULT = 13;

const LANG_LABEL = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  lua: 'Lua/Luau',
  luau: 'Lua/Luau',
  python: 'Python',
  json: 'JSON',
  html: 'HTML',
  css: 'CSS',
  text: 'văn bản',
};

export function langLabelOf(lang) {
  return LANG_LABEL[String(lang || '').toLowerCase()] || String(lang || 'không rõ');
}

/** B / KB / MB / GB — dùng cho dòng thông tin dưới ô code. */
export function formatSize(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return '—';
  if (n < 1024) return Math.round(n) + ' B';
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)) + ' ' + units[i];
}

/** Kẹp cỡ chữ trong khoảng cho phép (nút phóng to / thu nhỏ). */
export function clampFontSize(size, step = 1) {
  const n = Number(size);
  const base = Number.isFinite(n) ? n : FONT_DEFAULT;
  return Math.min(FONT_MAX, Math.max(FONT_MIN, base + step));
}

export function lineCount(code) {
  const s = String(code == null ? '' : code);
  if (!s) return 1;
  return s.split(/\r\n|\r|\n/).length;
}

/** Thống kê nhanh về tệp đang soạn. */
export function codeStats(code) {
  const s = String(code == null ? '' : code);
  const bytes = new TextEncoder().encode(s).length;
  const lines = s ? s.split(/\r\n|\r|\n/) : [''];
  let longest = 0;
  let trailing = 0;
  let tabs = 0;
  for (const line of lines) {
    if (line.length > longest) longest = line.length;
    if (/[ \t]+$/.test(line)) trailing++;
    if (line.includes('\t')) tabs++;
  }
  return {
    bytes,
    chars: s.length,
    lines: lines.length,
    longestLine: longest,
    trailingLines: trailing,
    tabLines: tabs,
    crlf: /\r\n/.test(s),
    sizeText: formatSize(bytes),
  };
}

/* ------------------------------------------------------- dò ngoặc/chuỗi --- */

/**
 * Dò lệch ngoặc tròn/vuông/nhọn và chuỗi chưa đóng.
 * Hiểu chuỗi ' " `, template `${…}`, chú thích // /* *\/ và -- của Lua.
 * @returns {{line:number,col:number,message:string,kind:string}|null}
 */
export function checkBalance(code) {
  const s = String(code == null ? '' : code);
  const stack = [];
  const lineStarts = [0];
  for (let i = 0; i < s.length; i++) if (s[i] === '\n') lineStarts.push(i + 1);
  const posOf = (idx) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= idx) lo = mid;
      else hi = mid - 1;
    }
    return { line: lo + 1, col: idx - lineStarts[lo] + 1 };
  };

  let i = 0;
  let mode = null; // null | 'sq' | 'dq' | 'bt' | 'line' | 'block' | 'luaComment'
  let modeStart = 0;
  let templateDepth = 0;

  while (i < s.length) {
    const c = s[i];
    const n = s[i + 1];

    if (mode === 'line') {
      if (c === '\n') mode = null;
      i++;
      continue;
    }
    if (mode === 'block') {
      if (c === '*' && n === '/') {
        mode = null;
        i += 2;
      } else i++;
      continue;
    }
    if (mode === 'luaComment') {
      if (c === ']' && n === ']') {
        mode = null;
        i += 2;
      } else i++;
      continue;
    }
    if (mode === 'sq' || mode === 'dq') {
      if (c === '\\') {
        i += 2;
        continue;
      }
      if ((mode === 'sq' && c === "'") || (mode === 'dq' && c === '"')) {
        mode = null;
      } else if (c === '\n' && mode !== 'bt') {
        const p = posOf(modeStart);
        return { ...p, kind: 'string', message: `Chuỗi mở ở dòng ${p.line} nhưng chưa đóng trước khi xuống dòng.` };
      }
      i++;
      continue;
    }
    if (mode === 'bt') {
      if (c === '\\') {
        i += 2;
        continue;
      }
      if (c === '`' && templateDepth === 0) {
        mode = null;
        i++;
        continue;
      }
      if (c === '$' && n === '{') {
        templateDepth++;
        stack.push({ ch: '{', idx: i + 1, template: true });
        i += 2;
        continue;
      }
      if (c === '}' && templateDepth > 0) {
        templateDepth--;
        const top = stack.pop();
        if (!top) {
          const p = posOf(i);
          return { ...p, kind: 'bracket', message: 'Thừa dấu } .' };
        }
        i++;
        continue;
      }
      i++;
      continue;
    }

    // ngoài mọi chuỗi/chú thích
    if (c === '/' && n === '/') {
      mode = 'line';
      i += 2;
      continue;
    }
    if (c === '/' && n === '*') {
      mode = 'block';
      modeStart = i;
      i += 2;
      continue;
    }
    if (c === '-' && n === '-') {
      if (s[i + 2] === '[' && s[i + 3] === '[') {
        mode = 'luaComment';
        i += 4;
        continue;
      }
      mode = 'line';
      i += 2;
      continue;
    }
    if (c === "'") {
      mode = 'sq';
      modeStart = i;
      i++;
      continue;
    }
    if (c === '"') {
      mode = 'dq';
      modeStart = i;
      i++;
      continue;
    }
    if (c === '`') {
      mode = 'bt';
      modeStart = i;
      i++;
      continue;
    }
    if (c === '(' || c === '[' || c === '{') {
      stack.push({ ch: c, idx: i });
      i++;
      continue;
    }
    if (c === ')' || c === ']' || c === '}') {
      const top = stack.pop();
      if (!top) {
        const p = posOf(i);
        return { ...p, kind: 'bracket', message: `Thừa dấu ${c} (không có dấu mở tương ứng).` };
      }
      const want = c === ')' ? '(' : c === ']' ? '[' : '{';
      if (top.ch !== want) {
        const p = posOf(i);
        const opened = posOf(top.idx);
        return {
          ...p,
          kind: 'bracket',
          message: `Sai cặp ngoặc: mở ${top.ch} ở dòng ${opened.line} nhưng đóng bằng ${c}.`,
        };
      }
      i++;
      continue;
    }
    i++;
  }

  if (mode === 'sq' || mode === 'dq' || mode === 'bt') {
    const p = posOf(modeStart);
    return { ...p, kind: 'string', message: `Chuỗi mở ở dòng ${p.line} nhưng chưa đóng.` };
  }
  if (mode === 'block' || mode === 'luaComment') {
    const p = posOf(modeStart);
    return { ...p, kind: 'comment', message: `Chú thích mở ở dòng ${p.line} nhưng chưa đóng.` };
  }
  if (stack.length) {
    const top = stack[stack.length - 1];
    const p = posOf(top.idx);
    return { ...p, kind: 'bracket', message: `Dấu ${top.ch} mở ở dòng ${p.line} nhưng chưa đóng.` };
  }
  return null;
}

/* --------------------------------------------------------- kiểm tra cú pháp --- */

function tryCompile(code) {
  try {
    // Không gọi hàm, chỉ biên dịch — an toàn (không chạy mã người dùng).
    new Function(code); // eslint-disable-line no-new-func
    return null;
  } catch (err) {
    return err && err.message ? String(err.message) : 'Lỗi cú pháp không rõ';
  }
}

const MODULE_LIKE = /^\s*(?:import\s|export\s)/m;
const JSX_LIKE = /<[A-Za-z][\w.]*(?:\s[^<>]*)?>/;

/** Ước lượng khối `… end` của Lua/Luau: chỉ để cảnh báo, không phải trình biên dịch. */
export function countLuaBlocks(code) {
  const s = String(code == null ? '' : code)
    .replace(/--\[\[[\s\S]*?\]\]/g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
  const count = (re) => (s.match(re) || []).length;
  // `for … do` và `while … do` chỉ có MỘT `end` ⇒ chỉ đếm `do`, không đếm
  // thêm `for`/`while` (nếu đếm cả hai sẽ báo lệch sai).
  const openers =
    count(/\bfunction\b/g) +
    count(/\bif\b/g) +
    count(/\bdo\b/g) +
    count(/\brepeat\b/g);
  const closers =
    count(/\bend\b/g) +
    count(/\buntil\b/g);
  return { openers, closers, diff: openers - closers };
}

/**
 * Phân tích code: lỗi (chặn chạy) + cảnh báo (nên xem) + thống kê.
 *
 * @param {string} code
 * @param {{lang?:string}} [opts]
 * @returns {{ok:boolean,lang:string,errors:Array,warnings:Array,stats:object,notes:string[]}}
 */
export function analyzeCode(code, opts = {}) {
  const src = String(code == null ? '' : code);
  const lang = String(opts.lang || '').toLowerCase() || 'javascript';
  const errors = [];
  const warnings = [];
  const notes = [];
  const stats = codeStats(src);

  if (!src.trim()) {
    return { ok: false, lang, errors: [{ line: 1, col: 1, kind: 'empty', message: 'Chưa có code để kiểm tra.' }], warnings, stats, notes };
  }

  const balance = checkBalance(src);
  if (balance) errors.push(balance);

  const isJs = lang === 'javascript' || lang === 'typescript' || lang === 'jsx' || lang === 'js';
  const moduleLike = MODULE_LIKE.test(src);
  const jsxLike = JSX_LIKE.test(src);

  if (isJs) {
    if (lang === 'typescript') {
      notes.push('TypeScript: chỉ kiểm tra cấu trúc — trình duyệt không biên dịch được kiểu (type).');
    } else if (!moduleLike && !jsxLike) {
      const msg = tryCompile(src);
      if (msg) {
        // Lỗi do đuôi/định dạng khác (Luau/Python…) thường cũng rơi vào đây:
        // chỉ báo là LỖI khi code thật sự trông giống JS.
        errors.push({ line: null, col: null, kind: 'syntax', message: msg });
      }
    } else {
      notes.push('Code dùng ES module (import/export) hoặc JSX — chỉ kiểm tra cấu trúc, không biên dịch đầy đủ.');
    }
  } else if (lang === 'json') {
    try {
      JSON.parse(src);
    } catch (err) {
      const m = /position (\d+)/.exec(String(err && err.message));
      let line = null;
      if (m) {
        const idx = Number(m[1]);
        line = src.slice(0, idx).split('\n').length;
      }
      errors.push({ line, col: null, kind: 'json', message: String((err && err.message) || 'JSON không hợp lệ') });
    }
  } else if (lang === 'lua' || lang === 'luau') {
    const blocks = countLuaBlocks(src);
    if (blocks.diff !== 0) {
      warnings.push({
        line: null,
        col: null,
        kind: 'lua-block',
        message: `Số khối mở (function/if/for/while/do) = ${blocks.openers} nhưng số \`end\` = ${blocks.closers} (lệch ${blocks.diff}). Đây là ước lượng — hãy kiểm tra lại.`,
      });
    }
  } else if (lang === 'python') {
    // Python: chỉ cảnh báo về tab/khoảng trắng lẫn lộn
    if (stats.tabLines && /^ +/m.test(src)) {
      warnings.push({ line: null, col: null, kind: 'python-indent', message: 'Tệp trộn cả tab và dấu cách để thụt dòng — Python sẽ báo lỗi.' });
    }
  }

  // cảnh báo chung
  if (/\beval\s*\(/.test(src)) warnings.push({ line: lineOf(src, /\beval\s*\(/), col: null, kind: 'eval', message: 'Có `eval(` — nguy hiểm nếu chạy code lạ.' });
  if (/new\s+Function\s*\(/.test(src)) warnings.push({ line: lineOf(src, /new\s+Function\s*\(/), col: null, kind: 'function-ctor', message: 'Có `new Function(` — tương đương eval.' });
  if (/\bdebugger\b/.test(src)) warnings.push({ line: lineOf(src, /\bdebugger\b/), col: null, kind: 'debugger', message: 'Còn `debugger` — nhớ xoá trước khi phát hành.' });
  if (/\bTODO\b|\bFIXME\b/.test(src)) warnings.push({ line: lineOf(src, /\bTODO\b|\bFIXME\b/), col: null, kind: 'todo', message: 'Còn ghi chú TODO/FIXME.' });
  if (stats.trailingLines > 0) {
    warnings.push({ line: null, col: null, kind: 'trailing', message: `${stats.trailingLines} dòng có khoảng trắng thừa ở cuối.` });
  }
  if (stats.longestLine > 400) {
    warnings.push({ line: null, col: null, kind: 'long-line', message: `Có dòng dài ${stats.longestLine} ký tự (dễ khó đọc).` });
  }
  if (stats.tabLines && /^[ ]{2,}/m.test(src)) {
    warnings.push({ line: null, col: null, kind: 'mixed-indent', message: 'Trộn tab và dấu cách để thụt dòng.' });
  }

  return { ok: errors.length === 0, lang, errors, warnings, stats, notes };
}

function lineOf(text, re) {
  const m = re.exec(text);
  if (!m) return null;
  return text.slice(0, m.index).split('\n').length;
}

/** Nhãn ngắn cho một mục lỗi/cảnh báo. */
export function issueLabel(issue) {
  const where = issue.line ? `dòng ${issue.line}${issue.col ? ':' + issue.col : ''}` : 'toàn tệp';
  return `${where} · ${issue.message}`;
}
