/* =============================================================================
 * AIA Secure Script — Bộ "dịch ngược" / phân tích code (thuần, không DOM)
 * -----------------------------------------------------------------------------
 * Hỗ trợ: làm đẹp, rút gọn an toàn, bỏ chú thích, tách chuỗi, đổi tên biến,
 * gỡ escape, giải base64/hex/URL, phân tích dấu hiệu đáng ngờ + ước lượng entropy.
 * Đây là công cụ hỗ trợ đọc code CỦA CHÍNH BẠN trước khi mã hoá — không phải
 * công cụ phá bản quyền của người khác.
 * ========================================================================== */

const JS_KEYWORDS = new Set(
  `break case catch class const continue debugger default delete do else export extends finally for function if
   import in instanceof let new return super switch this throw try typeof var void while with yield async await of
   static get set true false null undefined NaN Infinity`.split(/\s+/).filter(Boolean),
);

const JS_GLOBALS = new Set(
  `window document globalThis self console Math JSON Date Array Object String Number Boolean Promise RegExp Error
   Map Set WeakMap WeakSet Symbol Proxy Reflect BigInt Intl URL URLSearchParams Blob File FileReader fetch crypto
   localStorage sessionStorage navigator location history setTimeout setInterval clearTimeout clearInterval
   requestAnimationFrame cancelAnimationFrame alert confirm prompt parseInt parseFloat isNaN encodeURIComponent
   decodeURIComponent encodeURI decodeURI atob btoa TextEncoder TextDecoder WebSocket XMLHttpRequest Worker
   structuredClone queueMicrotask process require module exports Buffer global`.split(/\s+/).filter(Boolean),
);

const LUA_KEYWORDS = new Set(
  `and break do else elseif end false for function goto if in local nil not or repeat return then true until while
   self print pairs ipairs require game workspace script wait task spawn typeof pcall warn tostring tonumber table
   string math os coroutine Instance new Enum Color3 Vector3 CFrame UDim2 UDim BrickColor Ray`.split(/\s+/).filter(Boolean),
);

export function detectLanguage(code = '') {
  const s = String(code).slice(0, 40000);
  let js = 0;
  let lua = 0;
  let py = 0;

  // JavaScript / TypeScript
  if (/=>/.test(s)) js += 3;
  if (/\b(const|let|var)\s+[A-Za-z_$]/.test(s)) js += 3;
  if (/\bconsole\.(log|warn|error|info)\b/.test(s)) js += 2;
  if (/\b(document|window|globalThis|JSON|Promise|async|await)\b/.test(s)) js += 2;
  if (/\b(function|class)\s+[A-Za-z_$]*\s*\([^)]*\)\s*\{/.test(s)) js += 2;
  if (/===|!==|\?\?|\?\./.test(s)) js += 2;
  if (/\breturn\b[^;]*;/.test(s)) js += 1;
  if (/;\s*$/m.test(s)) js += 1;

  // Lua / Luau
  if (/\bthen\b/.test(s)) lua += 3;
  if (/\bend\b/.test(s)) lua += 3;
  if (/\blocal\s+[A-Za-z_]/.test(s)) lua += 3;
  if (/^\s*--/m.test(s)) lua += 2;
  if (/~=|\belseif\b|\bipairs\b|\bpairs\b/.test(s)) lua += 3;
  if (/\bgame\s*:\s*GetService\b|:WaitForChild\(/.test(s)) lua += 4;
  if (/\bprint\s*\(/.test(s)) lua += 1;

  // Python
  if (/^\s*def\s+[A-Za-z_]\w*\s*\(/m.test(s)) py += 4;
  if (/^\s*(import|from)\s+[A-Za-z_]/m.test(s)) py += 2;
  if (/^\s*(elif|except|finally)\b/m.test(s)) py += 3;
  if (/\b(None|True|False|self)\b/.test(s)) py += 2;
  if (/^\s*#/m.test(s)) py += 1;
  if (/:\s*$/m.test(s) && !/[{};]/.test(s)) py += 2;

  if (lua >= js && lua >= py && lua > 0) return 'lua';
  if (py > js && py > lua) return 'python';
  return 'javascript';
}

/* ------------------------------------------------------------- Tokenizer --- */

/**
 * @returns {Array<{t:'ws'|'nl'|'comment'|'string'|'ident'|'num'|'punct'|'regex',v:string}>}
 */
export function tokenize(code, lang = 'javascript') {
  const isLua = lang === 'lua' || lang === 'luau';
  const isPy = lang === 'python';
  const out = [];
  let i = 0;
  const n = code.length;

  const push = (t, v) => out.push({ t, v });
  const prevSignificant = () => {
    for (let k = out.length - 1; k >= 0; k--) {
      const t = out[k].t;
      if (t !== 'ws' && t !== 'nl' && t !== 'comment') return out[k];
    }
    return null;
  };

  while (i < n) {
    const c = code[i];
    const c2 = code[i + 1];

    // khoảng trắng
    if (c === '\n') { push('nl', '\n'); i++; continue; }
    if (c === ' ' || c === '\t' || c === '\r') {
      let j = i;
      while (j < n && (code[j] === ' ' || code[j] === '\t' || code[j] === '\r')) j++;
      push('ws', code.slice(i, j));
      i = j;
      continue;
    }

    // chú thích dòng
    if ((!isLua && c === '/' && c2 === '/') || (isLua && c === '-' && c2 === '-') || (isPy && c === '#')) {
      if (isLua && c2 === '-' && code[i + 2] === '[') {
        // block comment Lua --[[ ... ]]
        const end = code.indexOf(']]', i + 3);
        const stop = end === -1 ? n : end + 2;
        push('comment', code.slice(i, stop));
        i = stop;
        continue;
      }
      let j = i;
      while (j < n && code[j] !== '\n') j++;
      push('comment', code.slice(i, j));
      i = j;
      continue;
    }

    // chú thích khối
    if (!isLua && c === '/' && c2 === '*') {
      const end = code.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      push('comment', code.slice(i, stop));
      i = stop;
      continue;
    }

    // chuỗi
    if (c === '"' || c === "'" || (!isLua && c === '`')) {
      let j = i + 1;
      while (j < n) {
        if (code[j] === '\\') { j += 2; continue; }
        if (code[j] === c) { j++; break; }
        if (!isLua && c === '`' && code[j] === '\n') break;
        j++;
      }
      push('string', code.slice(i, j));
      i = j;
      continue;
    }
    // chuỗi dài Lua [[ ... ]] / [=[ ... ]=]
    if (isLua && c === '[' && (c2 === '[' || c2 === '=')) {
      const m = /^\[(=*)\[/.exec(code.slice(i, i + 20));
      if (m) {
        const close = ']' + m[1] + ']';
        const end = code.indexOf(close, i + m[0].length);
        const stop = end === -1 ? n : end + close.length;
        push('string', code.slice(i, stop));
        i = stop;
        continue;
      }
    }

    // số
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(c2))) {
      let j = i;
      while (j < n && /[0-9a-fA-FxXoObBeE._+-]/.test(code[j])) {
        if ((code[j] === '+' || code[j] === '-') && !/[eE]/.test(code[j - 1])) break;
        j++;
      }
      push('num', code.slice(i, j));
      i = j;
      continue;
    }

    // định danh
    if (/[A-Za-z_$\u00A0-\uFFFF]/.test(c)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_$\u00A0-\uFFFF]/.test(code[j])) j++;
      push('ident', code.slice(i, j));
      i = j;
      continue;
    }

    // regex JS (đoán dựa trên token trước)
    if (!isLua && c === '/') {
      const prev = prevSignificant();
      const canBeRegex = !prev || (prev.t === 'punct' && !/[)\]}]/.test(prev.v)) || prev.v === 'return' || prev.t === 'ident' && /^(return|typeof|instanceof|case|in|of|delete|void|new)$/.test(prev.v);
      if (canBeRegex) {
        let j = i + 1;
        let closed = false;
        while (j < n) {
          if (code[j] === '\\') { j += 2; continue; }
          if (code[j] === '\n') break;
          if (code[j] === '[') { while (j < n && code[j] !== ']') { if (code[j] === '\\') j++; j++; } }
          if (code[j] === '/') { j++; closed = true; break; }
          j++;
        }
        if (closed) {
          while (j < n && /[gimsuyd]/.test(code[j])) j++;
          push('regex', code.slice(i, j));
          i = j;
          continue;
        }
      }
    }

    // dấu câu / toán tử nhiều ký tự
    const three = code.slice(i, i + 3);
    const two = code.slice(i, i + 2);
    const ops3 = ['===', '!==', '**=', '>>>', '<<=', '>>=', '...', '..='];
    const ops2 = ['=>', '==', '!=', '<=', '>=', '&&', '||', '??', '?.', '++', '--', '+=', '-=', '*=', '/=', '%=',
      '&=', '|=', '^=', '<<', '>>', '**', '::', '..', '//', '->'];
    if (ops3.includes(three)) { push('punct', three); i += 3; continue; }
    if (ops2.includes(two)) { push('punct', two); i += 2; continue; }
    push('punct', c);
    i++;
  }
  return out;
}

const isWordChar = (ch) => /[A-Za-z0-9_$]/.test(ch || '');

function tokensToCode(tokens) {
  let s = '';
  for (const tk of tokens) s += tk.v;
  return s;
}

/* --------------------------------------------------------------- Làm đẹp --- */

const BIN_OPS = new Set([
  '+', '-', '*', '/', '%', '**', '=', '==', '===', '!=', '!==', '<', '>', '<=', '>=', '&&', '||', '??',
  '&', '|', '^', '<<', '>>', '>>>', '+=', '-=', '*=', '/=', '%=', '**=', '&=', '|=', '^=', '<<=', '>>=',
  '=>', '..', '..=', '::', '->',
]);
const KW_SPACE_PAREN = new Set(['if', 'for', 'while', 'switch', 'catch', 'function', 'with', 'elseif', 'until', 'return', 'typeof']);
const KW_SPACE_BRACKET = new Set(['return', 'typeof', 'in', 'of', 'case', 'yield', 'await', 'local', 'and', 'or', 'not']);

function sig(tokens, i, dir) {
  for (let k = i + dir; k >= 0 && k < tokens.length; k += dir) {
    const t = tokens[k].t;
    if (t !== 'ws' && t !== 'nl' && t !== 'comment') return tokens[k];
  }
  return null;
}

/**
 * Làm đẹp code mà không đổi ngữ nghĩa: chỉ thêm/xoá khoảng trắng và xuống dòng.
 */
export function beautify(code, options = {}) {
  const lang = options.lang || detectLanguage(code);
  if (lang === 'lua' || lang === 'luau') return beautifyLua(code, options);
  if (lang === 'python') return beautifyPlain(code);
  const tokens = tokenize(code, lang);
  const IND = options.indent || '  ';
  const isPython = lang === 'python';
  const lines = [];
  let cur = '';
  let lineIndent = 0;
  let indentLevel = 0;
  let parenDepth = 0;
  let pendingSpace = false;
  let blankPending = false;
  let newlineRun = 0;

  const flush = () => {
    const text = cur.replace(/[ \t]+$/, '');
    if (text.trim()) lines.push(IND.repeat(lineIndent) + text);
    cur = '';
    lineIndent = indentLevel;
  };
  const nl = () => { flush(); lineIndent = indentLevel; pendingSpace = false; };
  const append = (text, forceSpace) => {
    if (!cur) {
      lineIndent = indentLevel;
    } else if (pendingSpace || forceSpace === true) {
      if (!cur.endsWith(' ') && !/^\s/.test(text)) cur += ' ';
    }
    pendingSpace = false;
    cur += text;
  };
  const appendTight = (text) => {
    pendingSpace = false;
    if (!cur) lineIndent = indentLevel;
    cur += text;
  };

  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];
    const prev = sig(tokens, i, -1);
    const next = sig(tokens, i, 1);

    if (tk.t === 'ws') continue;
    if (tk.t === 'nl') { newlineRun++; continue; }

    if (newlineRun >= 2 && !cur && lines.length) blankPending = true;
    newlineRun = 0;

    if (tk.t === 'comment') {
      const lineComment = !tk.v.startsWith('/*') && !tk.v.startsWith('--[[');
      if (blankPending && !cur) { lines.push(''); blankPending = false; }
      if (lineComment) {
        if (cur.trim()) flush();
        lineIndent = indentLevel;
        lines.push(IND.repeat(indentLevel) + tk.v.trim());
        pendingSpace = false;
      } else {
        append(tk.v, true);
        pendingSpace = true;
      }
      continue;
    }

    if (blankPending && !cur) { lines.push(''); blankPending = false; }

    const v = tk.v;

    /* ---------------------------------------------------------- dấu câu --- */
    if (tk.t === 'punct') {
      if (v === '{' || v === '(' || v === '[') {
        if (v === '(') {
          const tight = prev && prev.t === 'ident' && !KW_SPACE_PAREN.has(prev.v);
          if (tight) appendTight('('); else append('(', true);
        } else if (v === '[') {
          const tight = prev && (prev.t === 'ident' && !KW_SPACE_BRACKET.has(prev.v) || prev.v === ')' || prev.v === ']' || prev.v === '}');
          if (tight) appendTight('['); else append('[', true);
        } else {
          const tightPrev = prev && ['(', '[', '{', ',', ':', '=', '=>', '!', '?', 'return'].includes(prev.v);
          append('{', !tightPrev);
        }
        if (v === '{') {
          indentLevel++;
          nl();
        } else {
          parenDepth++;
          pendingSpace = false;
        }
        continue;
      }

      if (v === '}' || v === ')' || v === ']') {
        if (v === '}') {
          if (indentLevel > 0) indentLevel--;
          nl();
          appendTight('}');
          const nxt = next;
          const sameLine = nxt && ((nxt.t === 'ident' && ['else', 'catch', 'finally', 'while', 'until', 'elseif'].includes(nxt.v)) ||
            (nxt.t === 'punct' && [')', ',', ';', '.', ']'].includes(nxt.v)));
          if (sameLine) pendingSpace = true; else nl();
        } else {
          appendTight(v);
          parenDepth = Math.max(0, parenDepth - 1);
        }
        continue;
      }

      if (v === ',') { appendTight(','); pendingSpace = true; continue; }
      if (v === ';') {
        appendTight(';');
        if (parenDepth > 0) pendingSpace = true; else nl();
        continue;
      }
      if (v === '.') { appendTight('.'); continue; }
      if (v === ':') { appendTight(':'); pendingSpace = !isPython; if (isPython) { indentLevel++; nl(); } continue; }
      if (v === '! ' ) { /* không xảy ra */ }
      if (v === '!' || v === '~') { append(v, true); pendingSpace = false; continue; }
      if (v === '++' || v === '--') { appendTight(v); continue; }
      if (v === '?') { append('?', true); pendingSpace = true; continue; }
      if (v === '...') { appendTight('...'); continue; }

      const unary = (v === '-' || v === '+') && (!prev || (prev.t === 'punct' && ![')', ']', '}'].includes(prev.v)) ||
        (prev.t === 'ident' && ['return', 'typeof', 'case', 'in', 'of', 'not', 'and', 'or'].includes(prev.v)));
      append(v, true);
      pendingSpace = !unary;
      continue;
    }

    /* -------------------------------------------------- định danh / giá trị --- */
    if (tk.t === 'ident') {
      const spaceBefore = prev && (prev.t === 'ident' || prev.t === 'num' || prev.t === 'string' || prev.t === 'regex');
      append(v, !!spaceBefore);
      pendingSpace = true;
      continue;
    }

    if (tk.t === 'num' || tk.t === 'string' || tk.t === 'regex') {
      const spaceBefore = prev && (prev.t === 'ident' || prev.t === 'num' || prev.t === 'string' || prev.t === 'regex');
      append(v, !!spaceBefore);
      pendingSpace = true;
      continue;
    }
  }
  flush();
  const text = lines.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
  return text;
}

/** Python: giữ nguyên thụt lề (thụt lề có nghĩa), chỉ dọn khoảng trắng thừa. */
function beautifyPlain(code) {
  return code
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/^\n+/, '')
    .trimEnd() + '\n';
}

/** Lua/Luau: xuống dòng có ý nghĩa, nên chỉ chỉnh lại thụt lề theo khối. */
function beautifyLua(code, options = {}) {
  const IND = options.indent || '  ';
  const out = [];
  let level = 0;
  for (const raw of code.split('\n')) {
    const text = raw.trim();
    if (!text) {
      if (out.length && out[out.length - 1] !== '') out.push('');
      continue;
    }
    const dedent = /^(end\b|else\b|elseif\b|until\b)/.test(text) || /^[)}\]]/.test(text);
    if (dedent) level = Math.max(0, level - 1);
    out.push(IND.repeat(level) + text);
    const opens =
      /\b(then|do|else|repeat)\s*$/.test(text) ||
      /^(local\s+)?function\b/.test(text) && !/\bend\s*$/.test(text) ||
      /^if\b/.test(text) && !/\bend\s*$/.test(text) ||
      /^(for|while)\b/.test(text) && !/\bend\s*$/.test(text) ||
      /\{\s*$/.test(text);
    if (opens && !/^(elseif|else)\b.*\bend\b/.test(text)) level++;
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

/* -------------------------------------------------------------- Rút gọn --- */

/**
 * Rút gọn AN TOÀN: bỏ chú thích, gộp khoảng trắng, bỏ khoảng trắng quanh dấu câu.
 * Giữ xuống dòng để không phá ASI (automatic semicolon insertion).
 */
export function minify(code, options = {}) {
  const lang = options.lang || detectLanguage(code);
  const tokens = tokenize(code, lang);
  let out = '';
  let prevTok = null;
  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];
    if (tk.t === 'comment') {
      if (tk.v.startsWith('/*!') || /^\/\/\s*!/.test(tk.v)) out += tk.v;
      continue;
    }
    if (tk.t === 'ws') {
      const next = tokens[i + 1];
      if (!prevTok || !next) continue;
      if (next.t === 'nl' || next.t === 'comment') continue;
      const prevCh = prevTok.v[prevTok.v.length - 1];
      const nextCh = next.v[0];
      if (isWordChar(prevCh) && isWordChar(nextCh)) out += ' ';
      continue;
    }
    if (tk.t === 'nl') { out += '\n'; continue; }
    if (tk.t === 'punct' && prevTok && prevTok.t === 'punct') {
      // tránh tạo thành toán tử khác: + +, - -, / /
      if (prevTok.v === tk.v && '+-/<>=&|'.includes(tk.v)) out += ' ';
    }
    out += tk.v;
    prevTok = tk;
  }
  return out
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim() + '\n';
}

export function stripComments(code, options = {}) {
  const lang = options.lang || detectLanguage(code);
  return tokensToCode(tokenize(code, lang).filter((t) => t.t !== 'comment'));
}

/* ------------------------------------------------------------ Tách chuỗi --- */

/**
 * Thay mỗi chuỗi bằng một chỉ mục trong bảng chuỗi, để dễ đọc cấu trúc.
 * @returns {{code:string, table:string[]}}
 */
export function extractStrings(code, options = {}) {
  const lang = options.lang || detectLanguage(code);
  const tokens = tokenize(code, lang);
  const table = [];
  const out = tokens.map((tk) => {
    if (tk.t !== 'string') return tk;
    let display = tk.v;
    let i = table.indexOf(display);
    if (i === -1) { i = table.length; table.push(display); }
    return { t: 'ident', v: `__S${i}` };
  });
  return { code: tokensToCode(out), table };
}

/* ----------------------------------------------------------- Đổi tên biến --- */

/**
 * Đổi tên biến JavaScript: chỉ đổi các tên được khai báo (var/let/const/function/
 * class/param) và mọi lần xuất hiện dạng "từ nguyên vẹn" — không đụng chuỗi,
 * chú thích, thuộc tính sau dấu chấm, khoá object.
 */
export function renameIdentifiers(code, options = {}) {
  const lang = options.lang || 'javascript';
  if (lang !== 'javascript' && lang !== 'typescript') {
    return { code, map: {}, note: 'Chỉ hỗ trợ JavaScript/TypeScript.' };
  }
  const tokens = tokenize(code, 'javascript');
  const reserved = new Set([...JS_KEYWORDS, ...JS_GLOBALS]);
  const names = new Set();

  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];
    if (tk.t !== 'ident') continue;
    const prev = sig(tokens, i, -1);
    const prevV = prev ? prev.v : '';
    if (prevV === 'var' || prevV === 'let' || prevV === 'const' || prevV === 'function' || prevV === 'class') {
      names.add(tk.v);
      continue;
    }
  }

  // tham số: quét trong ngoặc đơn của function/arrow
  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];
    if (tk.t === 'punct' && tk.v === '(') {
      const before = sig(tokens, i, -1);
      let isParams = before && before.t === 'ident' && before.v === 'function';
      if (!isParams) {
        // arrow: ( ... ) =>
        let depth = 0;
        let j = i;
        for (; j < tokens.length; j++) {
          if (tokens[j].t === 'punct' && tokens[j].v === '(') depth++;
          else if (tokens[j].t === 'punct' && tokens[j].v === ')') { depth--; if (depth === 0) break; }
        }
        const after = sig(tokens, j, 1);
        isParams = after && after.v === '=>';
      }
      if (isParams) {
        let depth = 0;
        for (let j = i; j < tokens.length; j++) {
          if (tokens[j].t === 'punct' && tokens[j].v === '(') depth++;
          else if (tokens[j].t === 'punct' && tokens[j].v === ')') { depth--; if (depth === 0) break; }
          else if (tokens[j].t === 'ident' && depth === 1) names.add(tokens[j].v);
        }
      }
    }
  }

  const map = {};
  let counter = 0;
  const shortName = () => {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    let s = '';
    let k = counter++;
    s = alphabet[k % 26];
    k = Math.floor(k / 26);
    while (k > 0) { s = alphabet[(k - 1) % 26] + s; k = Math.floor((k - 1) / 26); }
    return '_' + s;
  };

  // chỉ đổi tên xuất hiện >= 2 lần để tránh đổi biến không dùng
  const counts = {};
  for (const tk of tokens) if (tk.t === 'ident') counts[tk.v] = (counts[tk.v] || 0) + 1;

  for (const name of names) {
    if (reserved.has(name)) continue;
    if ((counts[name] || 0) < 2) continue;
    map[name] = shortName();
  }

  const outTokens = [];
  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];
    if (tk.t === 'ident' && map[tk.v]) {
      const prev = sig(tokens, i, -1);
      const next = sig(tokens, i, 1);
      const isProperty = prev && prev.t === 'punct' && prev.v === '.';
      const isObjectKey = next && next.t === 'punct' && next.v === ':' && prev && prev.v === '{';
      const isShorthand = next && next.t === 'punct' && (next.v === ',' || next.v === '}') &&
        prev && prev.t === 'punct' && (prev.v === '{' || prev.v === ',');
      if (!isProperty && !isObjectKey && !isShorthand) {
        outTokens.push({ t: 'ident', v: map[tk.v] });
        continue;
      }
    }
    outTokens.push(tk);
  }
  return { code: tokensToCode(outTokens), map, note: Object.keys(map).length + ' tên đã đổi.' };
}

/* ---------------------------------------------------------- Gỡ escape --- */

export function unescapeCode(code) {
  let out = code;
  const notes = [];

  // \u{1F600}
  out = out.replace(/\\u\{([0-9a-fA-F]{1,6})\}/g, (m, hex) => {
    try { return String.fromCodePoint(parseInt(hex, 16)); } catch { return m; }
  });
  // \uXXXX
  out = out.replace(/\\u([0-9a-fA-F]{4})/g, (m, hex) => String.fromCharCode(parseInt(hex, 16)));
  // \xNN
  out = out.replace(/\\x([0-9a-fA-F]{2})/g, (m, hex) => String.fromCharCode(parseInt(hex, 16)));
  // escape phổ biến
  const simple = { '\\n': '\n', '\\t': '\t', '\\r': '\r', '\\0': '\0', '\\b': '\b', '\\f': '\f', '\\v': '\v', "\\\\": '\\', "\\'": "'", '\\"': '"' };
  out = out.replace(/\\[ntr0bfv\\'"`]/g, (m) => (m in simple ? simple[m] : m));

  // Chuỗi hex 41 42 43..., hoặc 0x41,0x42
  const hexPairs = out.match(/(?:\b[0-9a-fA-F]{2}\b[\s,]*){8,}/g);
  if (hexPairs) {
    for (const block of hexPairs.slice(0, 20)) {
      const bytes = block.replace(/[^0-9a-fA-F]/g, '');
      if (bytes.length >= 16 && bytes.length % 2 === 0) {
        let s = '';
        for (let i = 0; i < bytes.length; i += 2) s += String.fromCharCode(parseInt(bytes.slice(i, i + 2), 16));
        if (isPrintable(s)) {
          notes.push('Đã giải chuỗi hex ' + bytes.length / 2 + ' byte');
          out = out.split(block).join(JSON.stringify(s));
        }
      }
    }
  }
  return { code: out, notes };
}

/* --------------------------------------------------- Giải base64/hex/URL --- */

function isPrintable(s) {
  if (!s) return false;
  let good = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 9 || c === 10 || c === 13 || (c >= 32 && c !== 127)) good++;
  }
  return good / s.length > 0.92;
}

export function decodePayloads(code) {
  const notes = [];
  let text = code;

  // base64 trong chuỗi
  text = text.replace(/(['"`])([A-Za-z0-9+/]{24,}={0,2})\1/g, (m, q, b64) => {
    try {
      const decoded = atob(b64);
      if (isPrintable(decoded) && decoded.length > 6) {
        notes.push(`Base64 (${b64.length} ký tự) → ${decoded.slice(0, 60).replace(/\n/g, ' ')}…`);
        return q + escapeForQuote(decoded, q) + q;
      }
    } catch { /* không phải base64 */ }
    return m;
  });

  // toàn bộ đầu vào là base64
  const trimmed = text.trim();
  if (/^[A-Za-z0-9+/=\s]+$/.test(trimmed) && trimmed.length > 40 && trimmed.length % 4 === 0) {
    try {
      const decoded = atob(trimmed.replace(/\s+/g, ''));
      if (isPrintable(decoded)) {
        notes.push('Toàn bộ nội dung là base64 — đã giải.');
        text = decoded;
      }
    } catch { /* ignore */ }
  }

  // base64url
  text = text.replace(/(['"`])([A-Za-z0-9_-]{32,})={0,2}\1/g, (m, q, b) => {
    if (!/[-_]/.test(b)) return m;
    try {
      const std = b.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(std.padEnd(Math.ceil(std.length / 4) * 4, '='));
      if (isPrintable(decoded)) {
        notes.push('Base64URL đã giải (' + b.length + ' ký tự)');
        return q + escapeForQuote(decoded, q) + q;
      }
    } catch { /* ignore */ }
    return m;
  });

  // URL-encoded
  const pct = text.match(/(?:%[0-9a-fA-F]{2}){6,}/g);
  if (pct) {
    for (const p of pct.slice(0, 40)) {
      try {
        const decoded = decodeURIComponent(p);
        if (isPrintable(decoded)) {
          notes.push('URL-escape đã giải: ' + decoded.slice(0, 40));
          text = text.split(p).join(decoded);
        }
      } catch { /* ignore */ }
    }
  }

  // \xNN / \NNN trong chuỗi
  const before = text;
  text = text.replace(/\\x([0-9a-fA-F]{2})/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
  if (text !== before) notes.push('Đã giải escape \\xNN.');

  return { code: text, notes };
}

function escapeForQuote(s, q) {
  let out = s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
  if (q === '"') out = out.replace(/"/g, '\\"');
  if (q === "'") out = out.replace(/'/g, "\\'");
  if (q === '`') out = out.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  return out;
}

/* ------------------------------------------------------------ Phân tích --- */

const SUSPICIOUS = [
  { re: /\beval\s*\(/g, label: 'eval() — chạy code từ chuỗi' },
  { re: /\bnew\s+Function\s*\(/g, label: 'new Function() — chạy code từ chuỗi' },
  { re: /\batob\s*\(/g, label: 'atob() — giải base64' },
  { re: /\bfromCharCode\b/g, label: 'String.fromCharCode — giấu ký tự' },
  { re: /\\x[0-9a-fA-F]{2}/g, label: 'Escape \\xNN' },
  { re: /\b(fetch|XMLHttpRequest|WebSocket|sendBeacon)\b/g, label: 'Gọi mạng ra ngoài' },
  { re: /\b(child_process|require\s*\(\s*['"]child_process)/g, label: 'Chạy lệnh hệ thống' },
  { re: /\blocalStorage|\bcookie\b|\bdocument\.cookie/g, label: 'Đọc lưu trữ/cookie' },
  { re: /\bwhile\s*\(\s*(true|1)\s*\)/g, label: 'Vòng lặp vô hạn' },
  { re: /\bdebugger\b/g, label: 'debugger — chống gỡ lỗi' },
  { re: /\bFunction\.prototype|\bconstructor\s*\(/g, label: 'Truy cập constructor' },
];

function shannonEntropy(str) {
  if (!str.length) return 0;
  const freq = new Map();
  for (const ch of str) freq.set(ch, (freq.get(ch) || 0) + 1);
  let h = 0;
  for (const v of freq.values()) {
    const p = v / str.length;
    h -= p * Math.log2(p);
  }
  return h;
}

export function analyze(code, options = {}) {
  const lang = options.lang || detectLanguage(code);
  const tokens = tokenize(code, lang);
  const stats = {
    lang,
    chars: code.length,
    bytes: new TextEncoder().encode(code).length,
    lines: code.split('\n').length,
    nonEmptyLines: code.split('\n').filter((l) => l.trim()).length,
    comments: 0,
    commentChars: 0,
    strings: 0,
    stringChars: 0,
    identifiers: 0,
    uniqueIdentifiers: 0,
    entropy: 0,
    maxLineLength: 0,
  };
  const idents = new Set();
  let stringContent = '';
  for (const tk of tokens) {
    if (tk.t === 'comment') { stats.comments++; stats.commentChars += tk.v.length; }
    if (tk.t === 'string') { stats.strings++; stats.stringChars += tk.v.length; stringContent += tk.v; }
    if (tk.t === 'ident') { stats.identifiers++; idents.add(tk.v); }
  }
  stats.uniqueIdentifiers = idents.size;
  stats.entropy = Math.round(shannonEntropy(code.slice(0, 200000)) * 100) / 100;
  for (const line of code.split('\n')) stats.maxLineLength = Math.max(stats.maxLineLength, line.length);

  const findings = [];
  for (const s of SUSPICIOUS) {
    const m = code.match(s.re);
    if (m) findings.push({ label: s.label, count: m.length });
  }
  const longLines = stats.maxLineLength > 2000;
  const verdict = findings.length === 0 && !longLines ? 'bình thường'
    : findings.length >= 4 || longLines ? 'đáng ngờ cao' : 'cần xem lại';

  return {
    ...stats,
    findings,
    longLines,
    verdict,
    summary: `${stats.lines} dòng · ${stats.comments} chú thích · ${stats.strings} chuỗi · entropy ${stats.entropy}/8 · ${verdict}`,
  };
}

/* --------------------------------------------------------------- Điều phối --- */

export function applyReverseAction(action, code, options = {}) {
  const lang = options.lang || detectLanguage(code);
  switch (action) {
    case 'beautify':
      return { code: beautify(code, { lang }), note: 'Đã làm đẹp.', stats: analyze(code) };
    case 'minify': {
      const out = minify(code, { lang });
      return { code: out, note: `Rút gọn: ${code.length} → ${out.length} ký tự (−${Math.max(0, Math.round((1 - out.length / Math.max(1, code.length)) * 100))}%).` };
    }
    case 'strip':
      return { code: stripComments(code, { lang }), note: 'Đã bỏ chú thích.' };
    case 'strings': {
      const r = extractStrings(code, { lang });
      const table = '/* Bảng chuỗi */\nconst __S = [\n' + r.table.map((s) => '  ' + s + ',').join('\n') + '\n];\n\n';
      return { code: lang === 'javascript' ? table + r.code : r.code + '\n\n-- Bảng chuỗi:\n-- ' + r.table.join('\n-- '), note: `Đã tách ${r.table.length} chuỗi.` };
    }
    case 'rename': {
      const r = renameIdentifiers(code, { lang });
      return { code: r.code, note: r.note };
    }
    case 'unescape': {
      const r = unescapeCode(code);
      return { code: r.code, note: r.notes.join(' · ') || 'Không tìm thấy escape.' };
    }
    case 'decode': {
      const r = decodePayloads(code);
      return { code: r.code, note: r.notes.join(' · ') || 'Không tìm thấy dữ liệu mã hoá phổ biến.' };
    }
    case 'analyze': {
      const a = analyze(code, { lang });
      const lines = [
        `Ngôn ngữ đoán: ${a.lang}`,
        `Kích thước: ${a.chars} ký tự / ${a.bytes} byte · ${a.lines} dòng (${a.nonEmptyLines} dòng có nội dung)`,
        `Chú thích: ${a.comments} (${a.commentChars} ký tự) · Chuỗi: ${a.strings} (${a.stringChars} ký tự)`,
        `Định danh: ${a.identifiers} lần / ${a.uniqueIdentifiers} tên khác nhau`,
        `Entropy: ${a.entropy}/8 · Dòng dài nhất: ${a.maxLineLength} ký tự`,
        `Kết luận: ${a.verdict}`,
        '',
        a.findings.length ? 'Dấu hiệu:' : 'Không có dấu hiệu đáng ngờ quen thuộc.',
        ...a.findings.map((f) => `  • ${f.label} (${f.count} lần)`),
        '',
        'Ghi chú: đây là phân tích tĩnh, không chạy code.',
      ];
      return { code: lines.join('\n'), note: a.summary, isReport: true };
    }
    default:
      return { code, note: 'Không rõ thao tác.' };
  }
}
