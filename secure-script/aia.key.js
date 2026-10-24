/*!
 * AIA Secure Script — KEY SCRIPT DÙNG CHUNG
 * ---------------------------------------------------------------------------
 * Tạo lúc   : cố định (dùng cho mọi lần mã hoá)
 * Key ID    : f9bc0bb6b9f6511b
 * Link key  : ./aia.key.js
 * Ghi chú   : khoá dùng chung cố định của site — 1 link cho mọi lần mã hoá và mọi người
 *
 * Dùng được cho MỌI tệp .aia được mã hoá ở chế độ "khoá dùng chung" với cùng
 * key script này. Cần thêm MẬT KHẨU đã đặt lúc mã hoá.
 * KHÔNG gửi tệp này cho người không tin cậy nếu không đặt mật khẩu.
 */
(function (global) {
  'use strict';

  var SHARED = {
    v: 1,
    keyId: "f9bc0bb6b9f6511b",
    masterKey: "3iTQtRO77gZrpJ27ZOQTyJDmQ4HjhguTY7YnG+CEYI4=",
    keyUrl: "./aia.key.js",
  };

  var MAGIC = new Uint8Array([0x41, 0x49, 0x41, 0x53, 0x43, 0x52, 0x31, 0x0a]);
  var VERSION = 1;
  var TAG = 16;

  function utf8(s) { return new TextEncoder().encode(s); }
  function hex(u8) { var s = ''; for (var i = 0; i < u8.length; i++) s += ('0' + u8[i].toString(16)).slice(-2); return s; }
  function u8(hexStr) { var o = new Uint8Array(hexStr.length / 2); for (var i = 0; i < o.length; i++) o[i] = parseInt(hexStr.substr(i * 2, 2), 16); return o; }
  function b64d(s) { var b = atob(s), o = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) o[i] = b.charCodeAt(i); return o; }

  async function derive(pass, header) {
    var material = JSON.stringify([1, header.time.raw, header.time.unixMs, header.keyUrl, pass || '', SHARED.masterKey]);
    var base = await crypto.subtle.importKey('raw', utf8(material), 'PBKDF2', false, ['deriveBits']);
    var bits = new Uint8Array(await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: b64d(header.kdf.salt), iterations: header.kdf.iterations, hash: 'SHA-256' }, base, 256));
    var kid = hex(new Uint8Array(await crypto.subtle.digest('SHA-256', bits)).slice(0, 8));
    return { key: await crypto.subtle.importKey('raw', bits, { name: 'AES-GCM' }, false, ['decrypt']), kid: kid, bits: bits };
  }

  function aadFor(index, last, total, headerHash) {
    var digest = headerHash ? u8(headerHash) : null;
    var a = new Uint8Array(digest ? 50 : 18), dv = new DataView(a.buffer);
    a.set(MAGIC, 0); a[8] = VERSION;
    dv.setUint32(9, index >>> 0, false);
    a[13] = last ? 1 : 0;
    dv.setUint32(14, total >>> 0, false);
    if (digest) a.set(digest, 18);
    return a;
  }

  function iv(prefix, i) {
    var v = new Uint8Array(12);
    v.set(prefix, 0);
    new DataView(v.buffer).setUint32(8, i >>> 0, false);
    return v;
  }

  async function sha256Hex(text) {
    return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', utf8(text))));
  }

  function Reader(stream) { this.r = stream.getReader(); this.buf = new Uint8Array(0); this.done = false; }
  Reader.prototype._pull = async function () {
    if (this.done) return false;
    var r = await this.r.read();
    if (r.done) { this.done = true; return false; }
    if (!r.value || !r.value.length) return true;
    var merged = new Uint8Array(this.buf.length + r.value.length);
    merged.set(this.buf, 0); merged.set(r.value, this.buf.length);
    this.buf = merged;
    return true;
  };
  Reader.prototype.exact = async function (n) {
    while (this.buf.length < n) if (!(await this._pull())) throw new Error('Tệp .aia bị cắt cụt.');
    var o = this.buf.subarray(0, n); this.buf = this.buf.subarray(n); return o;
  };
  Reader.prototype.more = async function () { if (this.buf.length) return true; return await this._pull(); };

  async function loadStream(options) {
    if (options.source) return options.source;
    if (!options.url) throw new Error('Cần options.url hoặc options.source');
    var res = await fetch(options.url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Không tải được ' + options.url + ' (HTTP ' + res.status + ')');
    return res.body;
  }

  async function verifyHeader(header) {
    if (!header.headerHash) return;
    var clone = {};
    for (var k in header) if (Object.prototype.hasOwnProperty.call(header, k)) clone[k] = header[k];
    clone.headerHash = new Array(65).join('0');
    delete clone.keyWrap;
    delete clone.encryptionSeconds;
    var actual = await sha256Hex(JSON.stringify(clone));
    if (actual !== header.headerHash) throw new Error('Header của tệp .aia đã bị sửa (SHA-256 không khớp).');
  }

  async function open(options) {
    options = options || {};
    if (!SHARED.masterKey) throw new Error('Key script chung này không có khoá gốc.');
    var stream = await loadStream(options);
    var r = new Reader(stream);
    var prefix = await r.exact(12);
    var len = new DataView(prefix.buffer, prefix.byteOffset + 8, 4).getUint32(0, true);
    var header = JSON.parse(new TextDecoder().decode(await r.exact(len)));
    if (header.format !== 'AIA1') throw new Error('Không phải tệp .aia.');
    await verifyHeader(header);
    if (header.keyWrapIn !== 'shared-key-script') {
      throw new Error('Tệp này không được mã hoá ở chế độ khoá dùng chung — hãy dùng key script riêng của nó.');
    }
    if (header.expiry && Date.now() > Date.parse(header.expiry)) {
      throw new Error('Bản mã đã hết hạn dùng.');
    }
    var info = await derive(options.passphrase || '', header);
    if (SHARED.keyId && info.kid && header.kdf.kid !== info.kid) throw new Error('Sai mật khẩu.');
    if (header.sharedKeyId) {
      var myId = hex(new Uint8Array(await crypto.subtle.digest('SHA-256', utf8(SHARED.masterKey))).slice(0, 8));
      if (myId !== header.sharedKeyId) throw new Error('Key script chung không khớp bản mã này.');
    }

    // mở khoá tệp
    var kw = header.keyWrap;
    if (!kw) throw new Error('Bản mã thiếu keyWrap.');
    var wrapAad = utf8(JSON.stringify(['AIA1-WRAP', header.id, header.time.raw, header.time.unixMs, header.keyUrl, header.headerHash || '']));
    var fileKeyRaw;
    try {
      fileKeyRaw = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: b64d(kw.iv), additionalData: wrapAad, tagLength: 128 }, info.key, b64d(kw.ct));
    } catch (e) {
      throw new Error('Không mở được khoá tệp — sai mật khẩu hoặc key script không đúng.');
    }
    var dataKey = await crypto.subtle.importKey('raw', fileKeyRaw, { name: 'AES-GCM' }, false, ['decrypt']);

    var ivPrefix = b64d(header.chunk.ivPrefix);
    var size = header.file.size, cs = header.chunk.size, total = header.chunk.total;
    var parts = [], done = 0;
    for (var i = 0; i < total; i++) {
      var plainLen = Math.min(cs, size - i * cs);
      var enc = await r.exact(plainLen + TAG);
      var pt;
      try {
        pt = new Uint8Array(await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: iv(ivPrefix, i), additionalData: aadFor(i, i === total - 1, total, header.headerHash), tagLength: 128 },
          dataKey, enc));
      } catch (e) {
        throw new Error('Không giải mã được khối #' + i + ' — tệp đã bị sửa hoặc sai khoá.');
      }
      parts.push(pt); done += pt.length;
      if (options.onProgress) options.onProgress(done, size);
    }
    if (await r.more()) throw new Error('Tệp có dữ liệu thừa sau khối cuối.');
    var out = new Uint8Array(done), off = 0;
    for (var j = 0; j < parts.length; j++) { out.set(parts[j], off); off += parts[j].length; }
    return { bytes: out, header: header };
  }

  async function run(options) {
    options = options || {};
    var res = await open(options);
    var code = new TextDecoder().decode(res.bytes);
    if (options.download) {
      var blob = new Blob([res.bytes], { type: 'application/octet-stream' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = res.header.file.name || 'decrypted.bin';
      document.body.appendChild(a); a.click(); a.remove();
      return res;
    }
    var head = "var L=function(t){return function(){var a=[].slice.call(arguments).map(function(x){try{return typeof x==='object'?JSON.stringify(x):String(x)}catch(e){return String(x)}});postMessage({type:'log',level:t,args:a})}};" +
      "self.console={log:L('log'),info:L('info'),warn:L('warn'),error:L('error'),debug:L('log')};" +
      "self.addEventListener('error',function(e){postMessage({type:'error',message:String(e.message||e)})});" +
      "self.addEventListener('unhandledrejection',function(e){postMessage({type:'error',message:String(e.reason)})});try{";
    var tail = "}catch(e){postMessage({type:'error',message:String(e&&(e.stack||e.message)||e)});}postMessage({type:'done'});";
    var worker = new Worker(URL.createObjectURL(new Blob([head + code + tail], { type: 'text/javascript' })));
    if (options.onLog || options.onError || options.onDone) {
      worker.onmessage = function (ev) {
        var d = ev.data || {};
        if (d.type === 'log' && options.onLog) options.onLog(d.level, d.args);
        else if (d.type === 'error' && options.onError) options.onError(d.message);
        else if (d.type === 'done' && options.onDone) options.onDone();
      };
    }
    return { bytes: res.bytes, header: res.header, worker: worker };
  }

  function b64u(s2) {
    var t = String(s2 || '').replace(/-/g, '+').replace(/_/g, '/');
    while (t.length % 4) t += '=';
    return b64d(t);
  }

  /**
   * Mở token link (AIALNK1.…) → { url, keyUrl, createdAt }.
   * options.passphrase: mật khẩu đã dùng lúc mã hoá link (nếu có).
   */
  async function openLink(token, options) {
    options = options || {};
    if (!SHARED.masterKey) throw new Error('Key script chung này không có khoá gốc.');
    var s = String(token || '').trim();
    if (s.slice(0, 8).toUpperCase() === 'AIALNK1.') s = s.slice(8);
    s = s.replace(/[^A-Za-z0-9_-]+/g, '');
    if (!s) throw new Error('Thiếu token link.');
    var raw;
    try { raw = b64u(s); } catch (e) { throw new Error('Token link không hợp lệ.'); }
    if (raw.length < 30) throw new Error('Token link bị cắt cụt.');
    var hlen = (raw[0] << 8) | raw[1];
    if (!hlen || 2 + hlen + 28 > raw.length) throw new Error('Token link không hợp lệ.');
    var header;
    try { header = JSON.parse(new TextDecoder().decode(raw.subarray(2, 2 + hlen))); }
    catch (e) { throw new Error('Token link không hợp lệ.'); }
    if (!header || !header.t || !header.x || !header.u || !header.s || !header.n) {
      throw new Error('Token link thiếu thông tin khoá.');
    }
    var iv = raw.subarray(2 + hlen, 2 + hlen + 12);
    var ct = raw.subarray(2 + hlen + 12);
    var iterations = Number(header.n);
    if (!isFinite(iterations) || iterations < 1000 || iterations > 5000000) {
      throw new Error('Token link có số vòng KDF không hợp lệ.');
    }
    var salt;
    try { salt = b64d(header.s); } catch (e) { throw new Error('Token link có salt hỏng.'); }
    if (salt.length < 8) throw new Error('Token link có salt hỏng.');
    var material = JSON.stringify([1, header.t, header.x, header.u, options.passphrase || '', SHARED.masterKey]);
    var base = await crypto.subtle.importKey('raw', utf8(material), 'PBKDF2', false, ['deriveBits']);
    var bits = new Uint8Array(await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' }, base, 256));
    var kid = hex(new Uint8Array(await crypto.subtle.digest('SHA-256', bits)).slice(0, 8));
    if (header.k && header.k !== kid) throw new Error('Sai mật khẩu hoặc sai key script.');
    var key = await crypto.subtle.importKey('raw', bits, { name: 'AES-GCM' }, false, ['decrypt']);
    var aad = utf8(JSON.stringify(['AIA-LINK1', header.t, header.u]));
    var pt;
    try {
      pt = new Uint8Array(await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv, additionalData: aad, tagLength: 128 }, key, ct));
    } catch (e) {
      throw new Error('Không mở được link: sai mật khẩu, sai key script hoặc token đã bị sửa.');
    }
    var obj = JSON.parse(new TextDecoder().decode(pt));
    if (!obj || !obj.u) throw new Error('Nội dung token hỏng.');
    return { url: String(obj.u), keyUrl: header.u, createdAt: header.t };
  }

  var API = {
    version: '1.1.0',
    kind: 'shared',
    masterKey: SHARED.masterKey,
    keyId: SHARED.keyId,
    keyUrl: SHARED.keyUrl,
    open: open,
    openLink: openLink,
    run: run,
    generateInfo: function () { return { keyMode: 'shared', keyUrl: SHARED.keyUrl, sharedKeyId: SHARED.keyId }; },
  };

  global.AIA_KEY = API;
  global.AIA_UNLOCK_SHARED = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
