/* =============================================================================
 * AIA Secure Script — loader Luau (chạy trong game)
 * -----------------------------------------------------------------------------
 * Sinh ra một script Luau tự chứa:
 *   1. tải "tệp khoá" (32 byte, base64) từ link đã xuất bản,
 *   2. giải mã AES-256-GCM ngay trong game (thuần Luau, dùng bit32),
 *   3. kiểm tra tag GCM trước khi chạy,
 *   4. `loadstring` và chạy script gốc.
 *
 * Toàn bộ thuật toán AES/GHASH ở dưới được kiểm thử đối chiếu với WebCrypto
 * của Node (xem tests/run-lua.mjs): 6/6 ca khớp cả bản rõ và tag.
 * Không cần thư viện ngoài, không gọi dịch vụ lạ.
 * ========================================================================== */

/** Thư viện giải mã thuần Luau (AES-256-GCM + base64). */
export const LUA_RUNTIME = `
local bit = bit32
if not bit then error('AIA: thiếu bit32') end
local bxor, band, bor, lshift, rshift = bit.bxor, bit.band, bit.bor, bit.lshift, bit.rshift

local SBOX = {}
do
  local s = "637c777bf26b6fc53001672bfed7ab76ca82c97dfa5947f0add4a2af9ca472c0b7fd9326363ff7cc34a5e5f171d8311504c723c31896059a071280e2eb27b27509832c1a1b6e5aa0523bd6b329e32f8453d100ed20fcb15b6acbbe394a4c58cfd0efaafb434d338545f9027f503c9fa851a3408f929d38f5bcb6da2110fff3d2cd0c13ec5f974417c4a77e3d645d197360814fdc222a908846eeb814de5e0bdbe0323a0a4906245cc2d3ac629195e479e7c8376d8dd54ea96c56f4ea657aae08ba78252e1ca6b4c6e8dd741f4bbd8b8a703eb5664803f60e613557b986c11d9ee1f8981169d98e949b1e87e9ce5528df8ca1890dbfe6426841992d0fb054bb16"
  for i = 1, 256 do SBOX[i] = tonumber(s:sub(i*2-1, i*2), 16) end
end

local function xtime(a)
  a = band(a, 0xff)
  local hi = band(a, 0x80)
  a = band(lshift(a, 1), 0xff)
  if hi ~= 0 then a = bxor(a, 0x1b) end
  return a
end

local function gmul(a, b)
  local p = 0
  for i = 1, 8 do
    if band(b, 1) == 1 then p = bxor(p, a) end
    local hi = band(a, 0x80)
    a = band(lshift(a, 1), 0xff)
    if hi ~= 0 then a = bxor(a, 0x1b) end
    b = rshift(b, 1)
  end
  return band(p, 0xff)
end

local MUL2, MUL3 = {}, {}
for i = 0, 255 do
  local hi = band(i, 0x80)
  local d = band(lshift(i, 1), 0xff)
  if hi ~= 0 then d = bxor(d, 0x1b) end
  MUL2[i] = d
  MUL3[i] = bxor(d, i)
end

local function expand_key(key)
  local w = {}
  for i = 0, 7 do
    w[i] = { key[i*4+1], key[i*4+2], key[i*4+3], key[i*4+4] }
  end
  local rcon = 1
  for i = 8, 59 do
    local t = { w[i-1][1], w[i-1][2], w[i-1][3], w[i-1][4] }
    if i % 8 == 0 then
      t = { bxor(SBOX[t[2]+1], rcon), SBOX[t[3]+1], SBOX[t[4]+1], SBOX[t[1]+1] }
      rcon = xtime(rcon)
    elseif i % 8 == 4 then
      t = { SBOX[t[1]+1], SBOX[t[2]+1], SBOX[t[3]+1], SBOX[t[4]+1] }
    end
    local p = w[i-8]
    w[i] = { bxor(p[1],t[1]), bxor(p[2],t[2]), bxor(p[3],t[3]), bxor(p[4],t[4]) }
  end
  return w
end

local function encrypt_block(w, s)
  for c = 0, 3 do
    local k = w[c]
    for r = 0, 3 do s[c*4+r+1] = bxor(s[c*4+r+1], k[r+1]) end
  end
  for round = 1, 14 do
    for i = 1, 16 do s[i] = SBOX[s[i]+1] end
    local t = {}
    for c = 0, 3 do
      for r = 0, 3 do
        t[c*4+r+1] = s[((c + r) % 4)*4 + r + 1]
      end
    end
    for i = 1, 16 do s[i] = t[i] end
    if round < 14 then
      for c = 0, 3 do
        local a0, a1, a2, a3 = s[c*4+1], s[c*4+2], s[c*4+3], s[c*4+4]
        local m0, m1, m2, m3 = MUL2[a0], MUL2[a1], MUL2[a2], MUL2[a3]
        local n0, n1, n2, n3 = MUL3[a0], MUL3[a1], MUL3[a2], MUL3[a3]
        s[c*4+1] = bxor(m0, n1, a2, a3)
        s[c*4+2] = bxor(a0, m1, n2, a3)
        s[c*4+3] = bxor(a0, a1, m2, n3)
        s[c*4+4] = bxor(n0, a1, a2, m3)
      end
    end
    for c = 0, 3 do
      local k = w[round*4 + c]
      for r = 0, 3 do s[c*4+r+1] = bxor(s[c*4+r+1], k[r+1]) end
    end
  end
  return s
end

local function bytes_to_words(b)
  return {
    bxor(lshift(b[1],24), lshift(b[2],16), lshift(b[3],8), b[4]),
    bxor(lshift(b[5],24), lshift(b[6],16), lshift(b[7],8), b[8]),
    bxor(lshift(b[9],24), lshift(b[10],16), lshift(b[11],8), b[12]),
    bxor(lshift(b[13],24), lshift(b[14],16), lshift(b[15],8), b[16]),
  }
end

local function words_to_bytes(w)
  return {
    band(rshift(w[1],24),0xff), band(rshift(w[1],16),0xff), band(rshift(w[1],8),0xff), band(w[1],0xff),
    band(rshift(w[2],24),0xff), band(rshift(w[2],16),0xff), band(rshift(w[2],8),0xff), band(w[2],0xff),
    band(rshift(w[3],24),0xff), band(rshift(w[3],16),0xff), band(rshift(w[3],8),0xff), band(w[3],0xff),
    band(rshift(w[4],24),0xff), band(rshift(w[4],16),0xff), band(rshift(w[4],8),0xff), band(w[4],0xff),
  }
end

local function gf_mul(X, Y)
  local Z = {0,0,0,0}
  local V = {Y[1],Y[2],Y[3],Y[4]}
  for i = 0, 127 do
    local word = math.floor(i/32) + 1
    if band(rshift(X[word], 31 - (i % 32)), 1) == 1 then
      Z[1], Z[2], Z[3], Z[4] = bxor(Z[1],V[1]), bxor(Z[2],V[2]), bxor(Z[3],V[3]), bxor(Z[4],V[4])
    end
    local lsb = band(V[4], 1)
    V[4] = bor(rshift(V[4],1), lshift(band(V[3],1),31))
    V[3] = bor(rshift(V[3],1), lshift(band(V[2],1),31))
    V[2] = bor(rshift(V[2],1), lshift(band(V[1],1),31))
    V[1] = rshift(V[1],1)
    if lsb == 1 then V[1] = bxor(V[1], 0xe1000000) end
  end
  return Z
end

local function aes_gcm_decrypt(key, nonce, ct)
  local w = expand_key(key)
  -- H = E(0^128)
  local H = bytes_to_words(encrypt_block(w, {0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0}))
  -- J0 = nonce || 00000001
  local j0 = {nonce[1],nonce[2],nonce[3],nonce[4],nonce[5],nonce[6],nonce[7],nonce[8],nonce[9],nonce[10],nonce[11],nonce[12],0,0,0,1}
  local S = {0,0,0,0}
  local n = #ct
  local out = {}
  local pos = 1
  local counter = 2
  while pos <= n do
    local blk = { 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0 }
    for i = 1, 16 do
      local j = pos + i - 1
      if j <= n then blk[i] = ct[j] end
    end
    -- GHASH ciphertext block
    local Y = bytes_to_words(blk)
    S = gf_mul({bxor(S[1],Y[1]), bxor(S[2],Y[2]), bxor(S[3],Y[3]), bxor(S[4],Y[4])}, H)
    -- CTR keystream
    local ctr = {nonce[1],nonce[2],nonce[3],nonce[4],nonce[5],nonce[6],nonce[7],nonce[8],nonce[9],nonce[10],nonce[11],nonce[12],
                 band(rshift(counter,24),0xff), band(rshift(counter,16),0xff), band(rshift(counter,8),0xff), band(counter,0xff)}
    local ks = encrypt_block(w, ctr)
    for i = 1, 16 do
      local j = pos + i - 1
      if j <= n then out[#out+1] = bxor(ct[j], ks[i]) end
    end
    pos = pos + 16
    counter = counter + 1
  end
  -- length block: AAD len 0, ct len in bits
  local lenw = { 0, 0, band(math.floor(n*8 / 4294967296), 0xffffffff), band(n*8, 0xffffffff) }
  S = gf_mul({bxor(S[1],lenw[1]), bxor(S[2],lenw[2]), bxor(S[3],lenw[3]), bxor(S[4],lenw[4])}, H)
  local tag = encrypt_block(w, j0)
  local tw = bytes_to_words(tag)
  local tagw = {bxor(tw[1],S[1]), bxor(tw[2],S[2]), bxor(tw[3],S[3]), bxor(tw[4],S[4])}
  return out, words_to_bytes(tagw)
end



local unpackfn = table.unpack or unpack
local function bytes_to_string(t)
  local n = #t
  local parts = {}
  local i = 1
  while i <= n do
    local j = i + 127
    if j > n then j = n end
    local args = {}
    for k = i, j do args[#args + 1] = t[k] end
    parts[#parts + 1] = string.char(unpackfn(args))
    i = j + 1
  end
  return table.concat(parts)
end

local B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
local B64MAP = {}
for i = 1, #B64 do B64MAP[B64:sub(i, i)] = i - 1 end

local function b64decode(s)
  s = s:gsub('[^A-Za-z0-9%+/=]', '')
  local out = {}
  local i = 1
  while i <= #s do
    local n1 = B64MAP[s:sub(i, i)]
    local n2 = B64MAP[s:sub(i + 1, i + 1)]
    local n3 = B64MAP[s:sub(i + 2, i + 2)]
    local n4 = B64MAP[s:sub(i + 3, i + 3)]
    if n1 and n2 then
      out[#out + 1] = n1 * 4 + math.floor(n2 / 16)
      if n3 then
        out[#out + 1] = (n2 % 16) * 16 + math.floor(n3 / 4)
        if n4 then
          out[#out + 1] = (n3 % 4) * 64 + n4
        end
      end
    end
    i = i + 4
  end
  return out
end
`;

const B64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function b64EncodeAscii(text) {
  const s = String(text == null ? '' : text);
  let out = '';
  for (let i = 0; i < s.length; i += 3) {
    const a = s.charCodeAt(i) & 0xff;
    const b = i + 1 < s.length ? s.charCodeAt(i + 1) & 0xff : 0;
    const c = i + 2 < s.length ? s.charCodeAt(i + 2) & 0xff : 0;
    out += B64_ALPHABET[a >> 2];
    out += B64_ALPHABET[((a & 3) << 4) | (b >> 4)];
    out += i + 1 < s.length ? B64_ALPHABET[((b & 15) << 2) | (c >> 6)] : '=';
    out += i + 2 < s.length ? B64_ALPHABET[c & 63] : '=';
  }
  return out;
}

function chunks(str, size) {
  const out = [];
  const s = String(str == null ? '' : str);
  for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size));
  return out.length ? out : [''];
}

function luaArray(list) {
  return '{ ' + list.map((s) => JSON.stringify(s)).join(', ') + ' }';
}

/**
 * Sinh script Luau hoàn chỉnh để dán vào game.
 *
 * @param {object} opts
 * @param {string} opts.cipherB64  bản mã (base64, KHÔNG gồm 16 byte tag)
 * @param {string} opts.nonceB64   12 byte nonce (base64)
 * @param {string} opts.tagHex     16 byte tag GCM (hex) để kiểm tra toàn vẹn
 * @param {string} [opts.keyUrl]   link tệp khoá (base64 key) đã xuất bản
 * @param {string} [opts.embeddedKeyB64] khoá nhúng sẵn trong tệp (base64 32 byte).
 *        Có khoá nhúng thì loader KHÔNG cần mạng, KHÔNG cần host tệp khoá — nhưng
 *        ai có tệp .lua cũng giải mã được. Chỉ dùng khi tiện lợi quan trọng hơn bảo mật.
 * @param {string} [opts.suffix]   hậu tố ngẫu nhiên cho tên biến
 * @returns {string} mã Luau
 */
export function buildLuaLoader({ cipherB64, nonceB64, tagHex, keyUrl, embeddedKeyB64, suffix } = {}) {
  const embedded = embeddedKeyB64 ? String(embeddedKeyB64).trim() : '';
  // '' là hợp lệ cho bản mã của một script rỗng (AES-GCM mã hoá chuỗi 0 byte).
  if (cipherB64 == null || nonceB64 == null || tagHex == null) {
    throw new Error('buildLuaLoader: thiếu cipherB64 / nonceB64 / tagHex');
  }
  if (!embedded && !keyUrl) {
    throw new Error('buildLuaLoader: cần keyUrl hoặc embeddedKeyB64');
  }
  if (embedded && embedded.length % 4 !== 0) {
    throw new Error('buildLuaLoader: embeddedKeyB64 không phải base64 hợp lệ');
  }
  const tag = String(suffix || Math.random().toString(36).slice(2, 8));
  const n = (name) => '_' + name + tag;
  const urlChunks = luaArray(chunks(b64EncodeAscii(keyUrl || ''), 53));
  const dataChunks = luaArray(chunks(String(cipherB64), 397));
  // Khoá nhúng bị cắt thành mảnh 8 ký tự: ai mở tệp cũng KHÔNG đọc được khoá như một
  // chuỗi liền (vẫn ghép lại được khi chạy — đây là che giấu, không phải bảo mật).
  const embChunks = embedded ? luaArray(chunks(embedded, 8)) : null;

  return [
    LUA_RUNTIME.trim(),
    '',
    'local ' + n('u') + ' = ' + urlChunks,
    'local ' + n('d') + ' = ' + dataChunks,
    ...(embChunks ? ['local ' + n('emb') + ' = ' + embChunks] : []),
    // --- Tìm biến toàn cục: getgenv() → getfenv(0) → _G. ---
    // Roblox KHÔNG đặt `game`/`warn`… vào bảng _G (Luau sandbox: _G chỉ là bảng chia sẻ
    // giữa các script), nên chỉ đọc _G là hỏng trong game thật. fengari thì _G = môi trường
    // toàn cục nên test cũ vẫn "xanh" — đó chính là lỗi đã làm script không chạy trong Delta.
    'local function ' + n('g') + '(name)',
    '  local ok, v = pcall(function() return getgenv()[name] end)',
    '  if ok and v ~= nil then return v end',
    '  ok, v = pcall(function() return getfenv(0)[name] end)',
    '  if ok and v ~= nil then return v end',
    '  ok, v = pcall(function() return _G[name] end)',
    '  if ok then return v end',
    '  return nil',
    'end',
    'local function ' + n('t') + '(fn, ...)',
    '  local ok, res = pcall(fn, ...)',
    '  if ok then return res end',
    '  return nil',
    'end',
    // Báo lỗi qua warn/print để người dùng THẤY lý do (executor hay nuốt lỗi im lặng).
    'local function ' + n('bad') + '(msg)',
    "  local w = " + n('g') + "('warn')",
    "  if type(w) ~= 'function' then w = " + n('t') + '(function() return warn end) end',
    "  if type(w) == 'function' then pcall(w, msg) end",
    '  pcall(function() print(msg) end)',
    '  error(msg, 0)',
    'end',
    // Tải HTTP: thử lần lượt mọi hàm mà executor có thể cung cấp.
    'local function ' + n('f') + '(url)',
    "  local gm = " + n('g') + "('game')",
    "  if gm == nil then gm = " + n('t') + '(function() return game end) end',
    "  if type(gm) == 'table' or type(gm) == 'userdata' then",
    '    local b = ' + n('t') + '(function() return gm:HttpGet(url) end)',
    "    if type(b) == 'string' and #b > 0 then return b end",
    '    b = ' + n('t') + '(function() return gm:HttpGetAsync(url) end)',
    "    if type(b) == 'string' and #b > 0 then return b end",
    '  end',
    '  local list = {}',
    '  local seen = {}',
    "  local add = function(fn)",
    "    if type(fn) == 'function' and not seen[fn] then seen[fn] = true; list[#list + 1] = fn end",
    '  end',
    // 1) tên theo UNC/executor, dò trực tiếp trong env (không phụ thuộc _G hay getfenv)
    '  add(' + n('g') + "('request'))",
    '  add(' + n('t') + '(function() return request end))',
    '  add(' + n('g') + "('http_request'))",
    '  add(' + n('t') + '(function() return http_request end))',
    '  add(' + n('t') + '(function() return syn and syn.request end))',
    '  add(' + n('t') + '(function() return http and http.request end))',
    '  add(' + n('t') + '(function() return fluxus and fluxus.request end))',
    '  add(' + n('g') + "('HttpGet'))",
    '  add(' + n('t') + '(function() return HttpGet end))',
    // 2) bảng toàn cục của executor (getgenv())
    '  local genv = ' + n('t') + '(function() return getgenv() end)',
    "  if type(genv) == 'table' then",
    '    add(genv.request)',
    '    add(genv.http_request)',
    '    add(genv.HttpGet)',
    "    if type(genv.syn) == 'table' then add(genv.syn.request) end",
    '  end',
    "  local reason = 'khong co ham tai HTTP nao dung duoc (game:HttpGet / request)'",
    '  for i = 1, #list do',
    "    local res = " + n('t') + "(list[i], { Url = url, Method = 'GET' })",
    "    if type(res) == 'table' then",
    '      local body = res.Body or res.body',
    '      local code = tonumber(res.StatusCode or res.Status or res.status)',
    "      if type(body) == 'string' and #body > 0 then",
    '        if code and code >= 400 then',
    "          reason = 'HTTP ' .. tostring(code)",
    '        else',
    '          return body',
    '        end',
    '      end',
    "    elseif type(res) == 'string' and #res > 0 then",
    '      return res',
    '    end',
    '  end',
    '  return nil, reason',
    'end',
    ...(embChunks
      ? [
          // Chế độ nhúng: khoá nằm ngay trong tệp, không gọi mạng.
          'local ' + n('k') + ' = b64decode(table.concat(' + n('emb') + '))',
        ]
      : [
          'local ' + n('kurl') + ' = bytes_to_string(b64decode(table.concat(' + n('u') + ')))',
          'local ' + n('body') + ', ' + n('why') + ' = ' + n('f') + '(' + n('kurl') + ')',
          'if not ' + n('body') + ' or #' + n('body') + ' == 0 then',
          "  " + n('bad') + "('AIA: khong tai duoc khoa: ' .. " + n('kurl') + " .. ' (' .. tostring(" + n('why') + ') .. \')\')',
          'end',
          // Bắt lỗi dán nhầm "link công khai" (trang trắng HTML) thay vì link tệp khoá.
          'local ' + n('head') + ' = string.lower(string.sub(' + n('body') + ', 1, 400))',
          "if string.find(" + n('head') + ", '<!doctype', 1, true) or string.find(" + n('head') + ", '<html', 1, true) then",
          "  " + n('bad') + "('AIA: link khoa tra ve trang web (HTML) chu khong phai tep khoa - kiem tra lai link da xuat ban')",
          'end',
          'local ' + n('k') + ' = b64decode(' + n('body') + ')',
        ]),
    'if #' + n('k') + ' ~= 32 then',
    "  " + n('bad') + "('AIA: tep khoa sai (' .. tostring(#" + n('k') + ") .. ' byte, can 32) - link tep khoa khong dung')",
    'end',
    "local " + n('n') + " = b64decode('" + String(nonceB64) + "')",
    'local ' + n('c') + ' = b64decode(table.concat(' + n('d') + '))',
    'local ' + n('p') + ', ' + n('t2') + ' = aes_gcm_decrypt(' + n('k') + ', ' + n('n') + ', ' + n('c') + ')',
    "local " + n('w') + " = '" + String(tagHex).toLowerCase() + "'",
    'local ' + n('h') + ' = {}',
    'for i = 1, #' + n('t2') + ' do ' + n('h') + "[i] = string.format('%02x', " + n('t2') + '[i]) end',
    'if table.concat(' + n('h') + ') ~= ' + n('w') + " then " + n('bad') + "('AIA: sai khoa (tag GCM khong khop)') end",
    'local ' + n('s') + ' = bytes_to_string(' + n('p') + ')',
    'local ' + n('l') + ' = ' + n('g') + "('loadstring')",
    "if type(" + n('l') + ") ~= 'function' then " + n('l') + ' = ' + n('t') + '(function() return loadstring end) end',
    "if type(" + n('l') + ") ~= 'function' then " + n('l') + ' = ' + n('g') + "('load') end",
    "if type(" + n('l') + ") ~= 'function' then " + n('l') + ' = ' + n('t') + '(function() return load end) end',
    "if type(" + n('l') + ") ~= 'function' then " + n('bad') + "('AIA: executor khong ho tro loadstring') end",
    'local ' + n('x') + ', ' + n('e') + ' = ' + n('l') + '(' + n('s') + ", '=aia')",
    "if type(" + n('x') + ") ~= 'function' then " + n('bad') + "('AIA: khong bien dich duoc: ' .. tostring(" + n('e') + ')) end',
    n('x') + '()',
    '',
  ].join('\n');
}

export { B64_ALPHABET };
