'use strict';
/**
 * tools/luau-to-lua.js
 *
 * Bộ bóc chú thích kiểu Luau (type annotations) để mã nguồn Luau có thể
 * chạy trên Lua 5.3 (fengari) phục vụ KIỂM THỬ.
 *
 * Đây là công cụ kiểm thử, KHÔNG phải một bản dịch: nó chỉ xoá type
 * annotation, không sinh ra logic mới. File dist/ dành cho Roblox vẫn là
 * Luau nguyên bản (xem tools/build.js).
 *
 * Cách hoạt động: tokenize (nhận diện comment/chuỗi/số), rồi xoá annotation
 * ở 3 vị trí hợp lệ của Luau:
 *   1. local x: T = ...
 *   2. tham số  function f(a: T, b: U)
 *   3. kiểu trả về  function f(...): R   (kể cả tuple "(A, B)")
 */

const KEYWORDS = new Set([
  'and','break','do','else','elseif','end','false','for','function','goto','if',
  'in','local','nil','not','or','repeat','return','then','true','until','while',
  'continue','self',
]);

function isIdentStart(c) { return /[A-Za-z_]/.test(c); }
function isIdentChar(c) { return /[A-Za-z0-9_]/.test(c); }
function isDigit(c) { return c >= '0' && c <= '9'; }

/**
 * Token hoá, trả về mảng { type, value, index }.
 * type: 'ws' | 'comment' | 'string' | 'number' | 'ident' | 'keyword' | 'punct'
 */
function tokenize(src) {
  const tokens = [];
  let i = 0;
  const push = (type, value) => { const start = i; i += value.length; tokens.push({ type, value, index: start }); };

  while (i < src.length) {
    const c = src[i];
    const next2 = src.substr(i, 2);

    // comment: --[[ ... ]] hoặc -- ... \n
    if (next2 === '--') {
      if (src.substr(i, 4) === '--[[') {
        const close = src.indexOf(']]', i + 4);
        const endIdx = close === -1 ? src.length : close + 2;
        push('comment', src.slice(i, endIdx));
      } else {
        const nl = src.indexOf('\n', i);
        const endIdx = nl === -1 ? src.length : nl;
        push('comment', src.slice(i, endIdx));
      }
      continue;
    }

    // long string [[ ... ]]
    if (c === '[') {
      const m = /^\[(=*)\[/.exec(src.substr(i, 16));
      if (m) {
        const closeTag = ']' + m[1] + ']';
        const close = src.indexOf(closeTag, i + m[0].length);
        const endIdx = close === -1 ? src.length : close + closeTag.length;
        push('string', src.slice(i, endIdx));
        continue;
      }
    }

    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < src.length) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === c) { j += 1; break; }
        if (src[j] === '\n') break;
        j += 1;
      }
      push('string', src.slice(i, j));
      continue;
    }

    if (isDigit(c) || (c === '.' && isDigit(src[i + 1]))) {
      const m = /^(0[xX][0-9a-fA-F]+|(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?)/.exec(src.substr(i));
      push('number', m[0]);
      continue;
    }

    if (isIdentStart(c)) {
      let j = i;
      while (j < src.length && isIdentChar(src[j])) j += 1;
      const word = src.slice(i, j);
      push(KEYWORDS.has(word) ? 'keyword' : 'ident', word);
      continue;
    }

    if (/\s/.test(c)) {
      let j = i;
      while (j < src.length && /\s/.test(src[j])) j += 1;
      push('ws', src.slice(i, j));
      continue;
    }

    // toán tử 3 ký tự rồi 2 ký tự rồi 1 ký tự
    const three = src.substr(i, 3);
    if (three === '...' || three === ':::') { push('punct', three); continue; }
    const two = next2;
    // '..' phải nằm trong danh sách 2 ký tự, nếu không nó bị tách thành
    // '.' + '.' và toán tử gán ghép '..=' sẽ không được nhận diện.
    if (['==','~=','<=','>=','..','::','//','<<','>>','->'].includes(two)) { push('punct', two); continue; }
    push('punct', c);
  }
  return tokens;
}

/** Bỏ qua một biểu thức kiểu, trả về token kế tiếp (không tiêu thụ nó). */
function skipType(tokens, pos) {
  let p = pos;
  let afterArrow = false;
  const isTypeValue = (t) => t && ((t.type === 'ident' || t.type === 'keyword') && t.value !== 'end' && t.value !== 'then');

  for (;;) {
    while (p < tokens.length && tokens[p].type === 'ws') p += 1;
    const t = tokens[p];
    if (!t) return p;

    if (t.type === 'punct' && t.value === '(') {           // kiểu hàm / tuple
      // Bỏ qua dấu '(' mở (depth coi như đã = 1), rồi cân bằng tới dấu ')' khớp.
      p += 1;
      let depth = 1;
      while (p < tokens.length && depth > 0) {
        const tk = tokens[p];
        if (tk.type === 'punct' && tk.value === '(') depth += 1;
        else if (tk.type === 'punct' && tk.value === ')') { depth -= 1; if (depth === 0) { p += 1; break; } }
        p += 1;
      }
    } else if (t.type === 'punct' && t.value === '{') {    // kiểu bảng
      p += 1;
      let depth = 1;
      while (p < tokens.length && depth > 0) {
        const tk = tokens[p];
        if (tk.type === 'punct' && tk.value === '{') depth += 1;
        else if (tk.type === 'punct' && tk.value === '}') { depth -= 1; if (depth === 0) { p += 1; break; } }
        p += 1;
      }
    } else if (t.type === 'punct' && t.value === '...') {
      p += 1;
    } else if (t.type === 'punct' && t.value === '->') {
      // function type:  A -> B  (B có thể là tuple "(X, Y)")
      p += 1;
      afterArrow = true;
      continue;
    } else if (isTypeValue(t)) {
      p += 1;
      // tên đầy đủ: A.B.C
      for (;;) {
        const q = p + 1;
        if (tokens[p] && tokens[p].type === 'punct' && tokens[p].value === '.'
            && tokens[q] && tokens[q].type === 'ident') { p = q + 1; } else break;
      }
      // generic / mảng: T<U>, {T}
      for (;;) {
        if (tokens[p] && tokens[p].type === 'punct' && tokens[p].value === '<') {
          p += 1;
          let depth = 1;
          while (p < tokens.length && depth > 0) {
            const tk = tokens[p];
            if (tk.type === 'punct' && tk.value === '<') depth += 1;
            else if (tk.type === 'punct' && tk.value === '>') { depth -= 1; if (depth === 0) { p += 1; break; } }
            p += 1;
          }
        } else if (tokens[p] && tokens[p].type === 'punct' && tokens[p].value === '{'
                   && tokens[p + 1] && tokens[p + 1].type === 'punct' && tokens[p + 1].value === '}') {
          p += 2;
        } else break;
      }
    } else {
      return p;
    }

    // Nhìn qua khoảng trắng: '->' (function type), '|' (union), '?' (optional)
    // đều có thể đứng sau một khoảng trắng. Không được return ngay tại ws.
    let q = p;
    while (q < tokens.length && tokens[q].type === 'ws') q += 1;
    const nt = tokens[q];
    if (afterArrow) {
      afterArrow = false;
      p = q;
      continue;
    }
    if (nt && nt.type === 'punct' && nt.value === '->') {
      p = q + 1;
      afterArrow = true;
      continue;
    }
    if (nt && nt.type === 'punct' && (nt.value === '|' || nt.value === '?')) { p = q + 1; continue; }
    return p;
  }
}

/**
 * Bóc toàn bộ type annotation.
 * Trả về { code, removed } — removed là số annotation đã xoá (để log).
 */
function stripTypes(src) {
  const tokens = tokenize(src);
  const cut = new Array(src.length).fill(false);
  let removed = 0;

  // Đánh dấu: token ')' này có đóng một cặp ngoặc từng chứa ':' hay không.
  const stack = [];
  let prev = null;              // token "có nghĩa" gần nhất (không ws/comment)
  let prev2 = null;

  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i];
    if (t.type === 'ws' || t.type === 'comment') continue;

    if (t.type === 'punct' && t.value === '(') {
      stack.push({ sawColon: false });
    } else if (t.type === 'punct' && t.value === ')') {
      const entry = stack.pop();
      if (entry && entry.sawColon) {
        // kiểu trả về: ')' rồi ':' rồi type
        let p = i + 1;
        while (p < tokens.length && tokens[p].type === 'ws') p += 1;
        if (tokens[p] && tokens[p].type === 'punct' && tokens[p].value === ':') {
          const end = skipType(tokens, p + 1);
          if (end > p + 1) {
            const last = tokens[end - 1];
            for (let k = tokens[p].index; k < last.index + last.value.length; k += 1) cut[k] = true;
            removed += 1;
          }
        }
      }
    } else if (t.type === 'punct' && t.value === ':') {
      const after = tokens[i + 1];
      if (after && after.type === 'punct' && after.value === ':') {
        // toán tử '::' — bỏ qua (i sẽ tự đi tới token ':' thứ hai)
      } else {
        // Chỉ coi là METHOD CALL khi có đúng dạng  <biểu thức>:<tên>(
        // Dấu hiệu quyết định: method call KHÔNG có khoảng trắng giữa ':' và
        // tên hàm (obj:go()), còn annotation thì có (callback: () -> ()).
        // Quy ước này đúng cho toàn bộ mã nguồn của dự án và được ghi rõ
        // trong docs/ARCHITECTURE.md.
        const after2 = tokens[i + 2];
        const noSpaceBeforeName = after !== undefined && after.index === t.index + t.value.length;
        // Lưu ý: tokenizer xếp `self` vào loại keyword, không phải ident.
        // Thiếu nhánh này là nguyên nhân `self:Method()` bị xoá mất `:Method`.
        const prevIsValue = prev !== null
          && (prev.type === 'ident'
            || (prev.type === 'keyword' && prev.value === 'self')
            || (prev.type === 'punct' && (prev.value === ')' || prev.value === ']')));
        const isMethodCall = prevIsValue
          && after !== undefined && after.type === 'ident'
          && after2 !== undefined && after2.type === 'punct' && after2.value === '('
          && noSpaceBeforeName;
        if (!isMethodCall) {
          const end = skipType(tokens, i + 1);
          if (end > i + 1) {
            const last = tokens[end - 1];
            for (let k = t.index; k < last.index + last.value.length; k += 1) cut[k] = true;
            removed += 1;
          }
        }
      }
      if (stack.length) stack[stack.length - 1].sawColon = true;
    } else if (t.type === 'punct' && (t.value === ',' || t.value === '=') ) {
      // dấu phẩy / gán: không phải annotation, nhưng ',' trong param list vẫn giữ cờ sawColon
    }

    prev2 = prev;
    prev = t;
  }

  void prev2;
  // Thay vùng annotation bằng khoảng trắng (KHÔNG xoá hẳn) để offset ký tự
  // của mọi token còn lại không đổi — bước rewrite toán tử gán chạy sau đó
  // vẫn nhìn thấy đúng vị trí.
  let out = '';
  for (let i = 0; i < src.length; i += 1) {
    if (cut[i]) out += src[i] === '\n' ? '\n' : ' ';
    else out += src[i];
  }
  return { code: out, removed };
}

/**
 * Biến đổi CƠ HỌC toán tử gán ghép của Luau (+=, -=, ..= ...) về Lua 5.3.
 *   a.b[k] += expr   ->   a.b[k] = a.b[k] + (expr)
 * Không đổi ngữ nghĩa; chỉ đổi cú pháp để Lua 5.3 đọc được.
 * Trả về { code, count }.
 */
const COMPOUND_OPS = { '+': '+', '-': '-', '*': '*', '/': '/', '%': '%', '^': '^', '..': '..' };
const LHS_STOP = new Set([
  'local', 'then', 'do', 'else', 'elseif', 'repeat', 'return', '=', ';', ',', '(', '{',
  'and', 'or', 'not', '#', 'function', 'in', 'while', 'until', 'end',
]);

/**
 * Tìm điểm kết thúc của MỘT biểu thức bắt đầu tại `start`.
 * Dừng ở dấu phẩy, ngoặc đóng, hoặc từ khoá kết thúc câu lệnh.
 * Trả về chỉ số token ngay SAU token cuối của biểu thức.
 */
const BLOCK_STOP_KEYWORDS = new Set(['then', 'do', 'end', 'else', 'elseif', 'until', 'in', 'return']);

function findExpressionEnd(tokens, start) {
  let k = start;
  let depth = 0;
  let sawValue = false;

  while (k < tokens.length) {
    const tk = tokens[k];
    if (tk.type === 'ws' || tk.type === 'comment') {
      // ws chứa xuống dòng và ta đã thấy giá trị -> biểu thức kết thúc
      if (sawValue && depth === 0 && tk.value.includes('\n')) return k;
      k += 1;
      continue;
    }
    if (tk.type === 'keyword') {
      if (depth === 0 && sawValue && BLOCK_STOP_KEYWORDS.has(tk.value)) return k;
      if (depth === 0 && !sawValue && BLOCK_STOP_KEYWORDS.has(tk.value)) return k;
      sawValue = true;
      k += 1;
      continue;
    }
    if (tk.type === 'punct') {
      if (tk.value === '(' || tk.value === '[' || tk.value === '{') { depth += 1; sawValue = true; k += 1; continue; }
      if (tk.value === ')' || tk.value === ']' || tk.value === '}') {
        if (depth === 0) return k;
        depth -= 1; sawValue = true; k += 1; continue;
      }
      if (depth === 0 && (tk.value === ',' || tk.value === ';')) return k;
      sawValue = true;
      k += 1;
      continue;
    }
    sawValue = true;
    k += 1;
  }
  return sawValue ? k : start;
}

function rewriteCompoundAssignments(src) {
  const tokens = tokenize(src);
  let out = '';
  let count = 0;
  let i = 0;
  let pendingFrom = 0;   // offset ký tự kế tiếp sẽ được chép nguyên văn vào out
  let floorIndex = 0;    // chặn dưới cho quét ngược: không lùi vào vùng đã rewrite

  while (i < tokens.length) {
    const t = tokens[i];
    const nxt = tokens[i + 1];
    const isOpEquals = t.type === 'punct' && nxt && nxt.type === 'punct' && nxt.value === '=';
    const isCompound = isOpEquals && (Object.prototype.hasOwnProperty.call(COMPOUND_OPS, t.value) || t.value === '-');

    if (!isCompound) {
      i += 1;
      continue;
    }

    // Quét ngược để tìm vế trái: một chuỗi suffix dạng  a.b[k]
    // Dừng ngay khi gặp token không thể nối tiếp (từ khoá, dấu gán, dấu phẩy,
    // toán tử số học...). Nếu chưa thấy "giá trị" nào thì không phải gán ghép.
    let j = i - 1;
    let depth = 0;
    let sawValue = false;
    let start = -1;

    while (j >= 0) {
      const tk = tokens[j];
      if (tk.index < floorIndex) break;
      if (tk.type === 'ws' || tk.type === 'comment') {
        // Đã thu được giá trị rồi thì khoảng trắng là RANH GIỚI câu lệnh:
        // vế trái của `x = read += 1` không được tràn sang dòng trên.
        if (sawValue) break;
        j -= 1;
        continue;
      }

      if (tk.type === 'punct' && (tk.value === ']' || tk.value === ')')) {
        depth += 1; sawValue = true; start = tk.index; j -= 1; continue;
      }
      if (tk.type === 'punct' && (tk.value === '[' || tk.value === '(')) {
        if (depth === 0) break;
        depth -= 1; start = tk.index; j -= 1; continue;
      }
      if (depth > 0) { start = tk.index; j -= 1; continue; }

      if (tk.type === 'ident' || (tk.type === 'keyword' && tk.value === 'self')) {
        sawValue = true; start = tk.index; j -= 1; continue;
      }
      if (tk.type === 'punct' && (tk.value === '.' || tk.value === ':')) { start = tk.index; j -= 1; continue; }

      // number / string: chỉ hợp lệ nếu CHƯA có giá trị nào trước đó
      if ((tk.type === 'number' || tk.type === 'string') && !sawValue) { sawValue = true; start = tk.index; j -= 1; continue; }

      // Đã có giá trị mà gặp token không thể nối tiếp (dấu '=', toán tử,
      // dấu phẩy, từ khoá câu lệnh...) -> đây là ranh giới câu lệnh trước.
      // QUAN TRỌNG: không được để `start` tụt về token này, nếu không vế phải
      // của câu trước sẽ bị hút vào vế trái (lỗi đã gặp: "read = x / read + 1").
      if (sawValue) break;

      break;
    }

    if (!sawValue || start === -1 || start < floorIndex) {
      i += 1;
      continue;
    }

    const lhs = src.slice(start, t.index).replace(/\s+$/, '');
    const op = COMPOUND_OPS[t.value] || t.value;

    const rhsStart = i + 2;
    const rhsEnd = findExpressionEnd(tokens, rhsStart);
    if (rhsEnd <= rhsStart) {
      i += 1;
      continue;
    }
    let rhsLast = rhsEnd - 1;
    while (rhsLast >= rhsStart && (tokens[rhsLast].type === 'ws' || tokens[rhsLast].type === 'comment')) rhsLast -= 1;
    if (rhsLast < rhsStart) {
      i += 1;
      continue;
    }
    const rhs = src.slice(tokens[rhsStart].index, tokens[rhsLast].index + tokens[rhsLast].value.length);

    out += src.slice(pendingFrom, start);
    out += `${lhs} = ${lhs} ${op} (${rhs})`;
    count += 1;
    pendingFrom = tokens[rhsLast].index + tokens[rhsLast].value.length;
    floorIndex = pendingFrom;
    i = rhsEnd;
  }

  out += src.slice(pendingFrom);
  return { code: out, count };
}

module.exports = { stripTypes, tokenize, rewriteCompoundAssignments };


/**
 * Luau cho phép  `for k, v in <bảng> do`  như dạng viết tắt của ipairs.
 * Lua 5.3 thì KHÔNG: for-in bắt buộc phải là một expression list
 * (iterator, state, control). Nên harness cần bọc ipairs() quanh biểu thức.
 *
 *   for _, x in t do        ->  for _, x in ipairs(t) do
 *   for i, v in pairs(t) do ->  giữ nguyên
 *
 * Đây là biến đổi NGỮ NGHĨA TƯƠNG ĐƯƠNG theo tài liệu Luau, và CHỈ dùng
 * cho harness. Bản dist gửi Roblox giữ nguyên cú pháp Luau gốc.
 */
const ITERATOR_FUNCS = new Set(['pairs', 'ipairs', 'next']);

/*
 * Biểu thức sau `in` có phải MỘT LỜI GỌI HÀM không?
 *
 * Luau generalized iteration chấp nhận hai dạng:
 *   for k, v in bang       -> dùng next, TỨC LÀ pairs  -> phải bọc pairs(...)
 *   for x in string.gmatch(s, ...) -> biểu thức LÀ iterator -> KHÔNG ĐƯỢC bọc
 *
 * Nếu bọc dạng thứ hai thành `pairs(gmatch(...))` thì Lua 5.3 nhận một hàm ở chỗ
 * cần một bảng, và báo "bad argument #1 to 'for iterator' (table expected, got
 * function)". Đây là lỗi thật đã làm tools/gen-docs05.js sập.
 *
 * Cách nhận biết: token có nghĩa CUỐI CÙNG của biểu thức là `)`, và token ngay
 * trước cặp ngoặc đó là một cái tên (ident) / `)` / `]` / chuỗi — tức là dạng
 * gọi hàm, không phải một biểu thức trong ngoặc đơn thuần.
 */
function expressionIsCall(tokens, from, to) {
  let last = to - 1;
  while (last > from && (tokens[last].type === 'ws' || tokens[last].type === 'comment')) last -= 1;
  if (!tokens[last] || tokens[last].type !== 'punct' || tokens[last].value !== ')') return false;

  // Tìm `(` khớp với `)` cuối cùng
  let depth = 0;
  let open = -1;
  for (let i = last; i >= from; i -= 1) {
    const tk = tokens[i];
    if (tk.type !== 'punct') continue;
    if (tk.value === ')') depth += 1;
    else if (tk.value === '(') {
      depth -= 1;
      if (depth === 0) { open = i; break; }
    }
  }
  if (open === -1) return false;

  let p = open - 1;
  while (p >= from && (tokens[p].type === 'ws' || tokens[p].type === 'comment')) p -= 1;
  if (p < from) return false;
  const pre = tokens[p];
  if (pre.type === 'ident') return true;                       // gmatch(...)
  if (pre.type === 'string' || pre.type === 'number') return true;  // ("x")(...)
  if (pre.type === 'punct' && (pre.value === ')' || pre.value === ']')) return true;
  return false;
}

function wrapForInWithIpairs(src) {
  const tokens = tokenize(src);
  const inserts = [];   // { index, text }
  let count = 0;

  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i];
    if (!(t.type === 'keyword' && t.value === 'for')) continue;

    /*
     * Tìm 'in' cùng cấp (không nằm trong ngoặc).
     *
     * QUAN TRỌNG: phải DỪNG khi gặp 'do' ở cấp 0. Nếu không, một vòng
     * `for g = 1, 30 do ... end` (dạng số, không có 'in') sẽ khiến bộ quét
     * vượt sang vòng generalized-for KẾ TIẾP và bọc biểu thức của vòng đó.
     * Vòng kế tiếp lại được xử lý lần nữa -> bọc HAI LẦN thành
     * `pairs(pairs(x))`, và Lua báo "table expected, got function".
     * Đây là lỗi thật đã làm Methods.CountByGroup() sập.
     */
    let j = i + 1;
    let depth = 0;
    let inIndex = -1;
    while (j < tokens.length) {
      const tk = tokens[j];
      if (tk.type === 'punct') {
        if (tk.value === '(' || tk.value === '[' || tk.value === '{') depth += 1;
        else if (tk.value === ')' || tk.value === ']' || tk.value === '}') depth -= 1;
        else if (tk.value === ',' && depth === 0) { j += 1; continue; }
      }
      if (depth === 0 && tk.type === 'keyword' && tk.value === 'do') break;  // for dạng số
      if (depth === 0 && tk.type === 'keyword' && tk.value === 'in') { inIndex = j; break; }
      j += 1;
    }
    if (inIndex === -1) continue;

    // Tìm 'do' kết thúc phần expression list
    let k = inIndex + 1;
    depth = 0;
    let doIndex = -1;
    while (k < tokens.length) {
      const tk = tokens[k];
      if (tk.type === 'punct') {
        if (tk.value === '(' || tk.value === '[' || tk.value === '{') depth += 1;
        else if (tk.value === ')' || tk.value === ']' || tk.value === '}') depth -= 1;
      }
      if (depth === 0 && tk.type === 'keyword' && tk.value === 'do') { doIndex = k; break; }
      k += 1;
    }
    if (doIndex === -1) continue;

    // Biểu thức đầu tiên sau 'in'
    let e = inIndex + 1;
    while (e < doIndex && (tokens[e].type === 'ws' || tokens[e].type === 'comment')) e += 1;
    if (e >= doIndex) continue;

    // `next` là iterator hợp lệ của Lua 5.3 (dạng  for k,v in next, t do)
    // -> tuyệt đối không bọc ipairs, sẽ đổi ngữ nghĩa.
    const first = tokens[e];
    if (first.type === 'ident' && first.value === 'next') continue;

    /*
     * Biểu thức là một lời gọi hàm -> nó ĐÃ trả về iterator, bọc thêm pairs()
     * sẽ phá nó. Bao gồm pairs/ipairs/next, string.gmatch, next(t), và bất kỳ
     * hàm tự định nghĩa nào trả về iterator.
     */
    if (expressionIsCall(tokens, e, doIndex)) continue;

    // Tìm token cuối của expression list (token ngay trước 'do')
    let last = doIndex - 1;
    while (last > e && (tokens[last].type === 'ws' || tokens[last].type === 'comment')) last -= 1;

    // Luau generalized iteration (`for k, v in t do`) dùng `next`, tức ngữ
    // nghĩa CỦA PAIRS — không phải ipairs. Dùng ipairs sẽ duyệt 0 phần tử
    // trên bảng khoá chuỗi (ví dụ bảng props của Widget.New), làm mất sạch
    // property. Đây là lỗi thật đã khiến GUI không nhận Name/AnchorPoint.
    inserts.push({ index: tokens[e].index, text: 'pairs(' });
    inserts.push({
      index: tokens[last].index + tokens[last].value.length,
      text: ')',
    });
    count += 1;
  }

  if (count === 0) return { code: src, count: 0 };

  inserts.sort((a, b) => b.index - a.index);   // chèn từ cuối lên để không lệch offset
  let out = src;
  for (const item of inserts) {
    out = out.slice(0, item.index) + item.text + out.slice(item.index);
  }
  return { code: out, count };
}

module.exports.wrapForInWithIpairs = wrapForInWithIpairs;
