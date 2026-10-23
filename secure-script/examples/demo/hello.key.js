/*!
 * AIA Secure Script — KEY SCRIPT (tệp khoá)
 * ---------------------------------------------------------------------------
 * Thời gian tạo : 2026-10-23 16:57:40.986 (raw 20261023165740986, unixMs 1792774660986)
 * Tệp gốc       : hello.js — 549 byte — ngôn ngữ javascript
 * Link key      : ./hello.key.js
 * Tệp dữ liệu   : hello.aia
 * KDF           : PBKDF2-HMAC-SHA256, 600000 vòng, salt FqX8TJNw…
 *
 * Script này KHÔNG chứa bản rõ của code. Nó chứa tham số dẫn xuất khoá + bộ giải mã.
 * Nếu bản mã ở chế độ "bắt buộc key script", khoá tệp (đã bọc) chỉ nằm trong tệp này:
 * thiếu nó thì không thể giải mã dù biết mật khẩu và đọc được header.
 * Cần mật khẩu (nếu lúc mã hoá có đặt) để mở tệp .aia.
 */
(function (global) {
  'use strict';

  var META = /*<AIA:META>*/{
  "format": "AIA1",
  "v": 1,
  "id": "31fee04e7c345f09",
  "createdAt": "2026-10-23T16:57:40.986Z",
  "time": {
    "raw": "20261023165740986",
    "readable": "2026-10-23 16:57:40.986",
    "year": 2026,
    "month": 10,
    "day": 23,
    "hour": 16,
    "minute": 57,
    "second": 40,
    "ms": 986,
    "unixMs": 1792774660986,
    "iso": "2026-10-23T16:57:40.986Z",
    "timezoneOffset": 0
  },
  "keyUrl": "./hello.key.js",
  "alg": "AES-256-GCM",
  "kdf": {
    "name": "PBKDF2-HMAC-SHA256",
    "iterations": 600000,
    "salt": "FqX8TJNw2tWp8UVtmugtwg==",
    "kid": "6412f3a153227ec7"
  },
  "chunk": {
    "size": 1048576,
    "total": 1,
    "ivPrefix": "ZGlmLNFk7mM=",
    "tagBytes": 16
  },
  "file": {
    "name": "hello.js",
    "type": "",
    "size": 549,
    "sha256": "9499d78820a99718e6479fe6b793369e5c23bd84bb7680ca713e3b25c5bbcfa2",
    "lang": "javascript"
  },
  "payload": {
    "file": "hello.aia"
  },
  "expiry": null,
  "note": "gói demo công khai",
  "keyWrapIn": "key-script",
  "encryptionSeconds": 0,
  "keyWrap": {
    "alg": "AES-256-GCM",
    "iv": "a6KQaA8CGVQwG7wM",
    "ct": "+JSPKu6EJmXltW44rx4m/JJek9/EN7un+EohB920u4HDcbWSGiQsTMbfuXV/mIsh"
  }
}/*</AIA:META>*/;
  var EMBEDDED_PASS = null; // null = không nhúng (an toàn hơn)

  var MAGIC = new Uint8Array([0x41, 0x49, 0x41, 0x53, 0x43, 0x52, 0x31, 0x0a]);
  var VERSION = 1;
  var TAG_BYTES = 16;

  var selfUrl = (function () {
    if (typeof document !== 'undefined' && document.currentScript && document.currentScript.src) return document.currentScript.src;
    if (typeof location !== 'undefined') return location.href;
    return '';
  })();

  var payloadUrl = (function () {
    var f = (META.payload && META.payload.file) || 'payload.aia.bin';
    try { return new URL(f, selfUrl || 'http://localhost/').href; } catch (e) { return f; }
  })();

  function b64d(s) {
    var bin = atob(s), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function hex(u8) {
    var s = '';
    for (var i = 0; i < u8.length; i++) s += ('0' + u8[i].toString(16)).slice(-2);
    return s;
  }
  function utf8(s) { return new TextEncoder().encode(s); }
  function aad(i, last, total) {
    var a = new Uint8Array(18), dv = new DataView(a.buffer);
    a.set(MAGIC, 0);
    a[8] = VERSION;
    dv.setUint32(9, i >>> 0, false);
    a[13] = last ? 1 : 0;
    dv.setUint32(14, total >>> 0, false);
    return a;
  }
  function iv(prefix, i) {
    var v = new Uint8Array(12);
    v.set(prefix, 0);
    new DataView(v.buffer).setUint32(8, i >>> 0, false);
    return v;
  }
  function wrapAad() {
    return utf8(JSON.stringify(['AIA1-WRAP', META.id, META.time.raw, META.time.unixMs, META.keyUrl]));
  }

  async function openFileKey(wrapKey) {
    var kw = META.keyWrap;
    if (!kw) throw new Error('Key script thiếu khoá tệp — tệp này có thể đã bị sửa hoặc không phải key script gốc.');
    try {
      var raw = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: b64d(kw.iv), additionalData: wrapAad(), tagLength: 128 },
        wrapKey,
        b64d(kw.ct),
      );
      return await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['decrypt']);
    } catch (e) {
      throw new Error('Không mở được khoá tệp trong key script — key script không khớp tệp .aia.');
    }
  }

  async function derive(pass) {
    var material = JSON.stringify([1, META.time.raw, META.time.unixMs, META.keyUrl, pass || '']);
    var base = await crypto.subtle.importKey('raw', utf8(material), 'PBKDF2', false, ['deriveBits']);
    var bits = new Uint8Array(await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: b64d(META.kdf.salt), iterations: META.kdf.iterations, hash: 'SHA-256' }, base, 256));
    var kid = hex(new Uint8Array(await crypto.subtle.digest('SHA-256', bits)).slice(0, 8));
    var key = await crypto.subtle.importKey('raw', bits, { name: 'AES-GCM' }, false, ['decrypt']);
    return { key: key, kid: kid };
  }

  function Reader(stream) {
    this.reader = stream.getReader();
    this.buf = new Uint8Array(0);
    this.done = false;
  }
  Reader.prototype._pull = async function () {
    if (this.done) return false;
    var r = await this.reader.read();
    if (r.done) { this.done = true; return false; }
    var v = r.value;
    if (!v || v.length === 0) return true;
    if (this.buf.length) {
      var merged = new Uint8Array(this.buf.length + v.length);
      merged.set(this.buf, 0); merged.set(v, this.buf.length);
      this.buf = merged;
    } else {
      this.buf = v;
    }
    return true;
  };
  Reader.prototype.exact = async function (n) {
    while (this.buf.length < n) {
      var ok = await this._pull();
      if (!ok) throw new Error('Tệp .aia bị cắt cụt (cần ' + n + ' byte).');
    }
    var out = this.buf.subarray(0, n);
    this.buf = this.buf.subarray(n);
    return out;
  };
  Reader.prototype.more = async function () {
    if (this.buf.length) return true;
    return await this._pull();
  };

  async function fetchReader(onBytes) {
    var res = await fetch(payloadUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error('Không tải được tệp dữ liệu: ' + payloadUrl + ' (HTTP ' + res.status + ')');
    var total = Number(res.headers.get('content-length')) || 0;
    var reader = res.body.getReader();
    var loaded = 0;
    var wrapped = new ReadableStream({
      async pull(c) {
        var r = await reader.read();
        if (r.done) { c.close(); return; }
        loaded += r.value.length;
        if (onBytes) onBytes(loaded, total);
        c.enqueue(r.value);
      },
    });
    return wrapped;
  }

  async function decrypt(options) {
    options = options || {};
    if (AIA.checkExpiry()) {
      throw new Error('Bản mã đã hết hạn dùng từ ' + new Date(META.expiry).toLocaleString());
    }
    var pass = options.passphrase != null ? options.passphrase : (EMBEDDED_PASS || '');
    var t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    var info = await derive(pass);
    if (META.kdf.kid && info.kid !== META.kdf.kid) {
      throw new Error('Sai mật khẩu (hoặc header đã bị sửa).');
    }
    var dataKey = info.key;
    if (META.keyWrap) {
      dataKey = await openFileKey(info.key);
    } else if (META.keyWrapIn === 'key-script') {
      throw new Error('Key script thiếu khoá tệp — dùng lại key script gốc đã phát hành cùng tệp .aia.');
    }
    var stream = options.source ? options.source : await fetchReader(options.onFetchProgress);
    var reader = new Reader(stream);
    var prefix = await reader.exact(12);
    var len = new DataView(prefix.buffer, prefix.byteOffset + 8, 4).getUint32(0, true);
    var headerBytes = await reader.exact(len);
    var header = JSON.parse(new TextDecoder().decode(headerBytes));
    if (header.id !== META.id) throw new Error('Key script không khớp với tệp dữ liệu (id khác nhau).');

    var ivPrefix = b64d(META.chunk.ivPrefix);
    var size = META.file.size, cs = META.chunk.size, total = META.chunk.total;
    var parts = [], done = 0;
    for (var i = 0; i < total; i++) {
      var plainLen = Math.min(cs, size - i * cs);
      var enc = await reader.exact(plainLen + TAG_BYTES);
      try {
        var pt = new Uint8Array(await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: iv(ivPrefix, i), additionalData: aad(i, i === total - 1, total), tagLength: 128 },
          dataKey, enc));
      } catch (e) {
        throw new Error('Không giải mã được khối #' + i + ': sai mật khẩu hoặc tệp đã bị sửa.');
      }
      parts.push(pt);
      done += pt.length;
      if (options.onProgress) options.onProgress(done, size);
    }
    if (await reader.more()) throw new Error('Tệp có dữ liệu thừa sau khối cuối.');
    var out = new Uint8Array(done), off = 0;
    for (var k = 0; k < parts.length; k++) { out.set(parts[k], off); off += parts[k].length; }
    AIA.lastDecryptMs = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
    return out;
  }

  function checkExpiry() {
    if (!META.expiry) return false;
    var t = Date.parse(META.expiry);
    return Number.isFinite(t) && Date.now() > t;
  }

  function decode(bytes) { return new TextDecoder().decode(bytes); }

  // Script chạy trong Web Worker: không treo trang, không truy cập được DOM.
  // Code được bọc try/catch và tự báo "done" sau khi chạy hết phần đồng bộ.
  var HEAD_WORKER =
    "var __aiaLog=function(t){return function(){var a=[].slice.call(arguments).map(function(x){" +
    "try{return typeof x==='object'?JSON.stringify(x):String(x)}catch(e){return String(x)}});" +
    "postMessage({type:'log',level:t,args:a})}};" +
    "self.console={log:__aiaLog('log'),info:__aiaLog('info'),warn:__aiaLog('warn')," +
    "error:__aiaLog('error'),debug:__aiaLog('log')};" +
    "self.addEventListener('error',function(e){postMessage({type:'error',message:String(e.message||e)})});" +
    "self.addEventListener('unhandledrejection',function(e){postMessage({type:'error',message:String(e.reason)})});" +
    "try{";
  var TAIL_WORKER =
    "}catch(__aiaErr){postMessage({type:'error',message:String(__aiaErr&&(__aiaErr.stack||__aiaErr.message)||__aiaErr)});}" +
    "postMessage({type:'done'});";

  function runInWorker(code, handlers) {
    handlers = handlers || {};
    var blob = new Blob([HEAD_WORKER + code + TAIL_WORKER], { type: 'text/javascript' });
    var url = URL.createObjectURL(blob);
    var worker = new Worker(url);
    worker.__aiaUrl = url;
    worker.onmessage = function (ev) {
      var d = ev.data || {};
      if (d.type === 'log') { if (handlers.onLog) handlers.onLog(d.level, d.args); }
      else if (d.type === 'error') { if (handlers.onError) handlers.onError(d.message); }
      else if (d.type === 'done') { if (handlers.onDone) handlers.onDone(); }
    };
    worker.onerror = function (e) {
      if (handlers.onError) handlers.onError(e.message || 'Lỗi runtime trong worker');
      AIA.stopCurrent();
    };
    return worker;
  }

  var currentWorker = null;

  var AIA = {
    version: '1.0.0',
    meta: META,
    payloadUrl: payloadUrl,
    keyScriptUrl: selfUrl,
    checkExpiry: checkExpiry,
    decrypt: decrypt,
    decode: decode,
    runInWorker: function (code, handlers) {
      AIA.stopCurrent();
      var w = runInWorker(code, handlers);
      currentWorker = w;
      // Worker đã nạp xong blob nên có thể thu hồi URL ngay.
      setTimeout(function () { try { URL.revokeObjectURL(w.__aiaUrl); } catch (e) {} }, 0);
      return w;
    },
    stopCurrent: function () {
      if (currentWorker) {
        try { currentWorker.terminate(); } catch (e) {}
        try { URL.revokeObjectURL(currentWorker.__aiaUrl); } catch (e) {}
        currentWorker = null;
      }
    },
    hasEmbeddedPassphrase: !!EMBEDDED_PASS,
    /** Giải mã + chạy (chỉ với JavaScript/TypeScript). */
    run: async function (options) {
      options = options || {};
      var bytes = await decrypt(options);
      var code = decode(bytes);
      if (!options.execute) return { code: code, bytes: bytes };
      if (options.mode === 'main') {
        var type = (options.type === 'module' || options.module) ? 'module' : 'text/javascript';
        var blob = new Blob([code], { type: type });
        var u = URL.createObjectURL(blob);
        var s = document.createElement('script');
        if (type === 'module') s.type = 'module';
        s.src = u;
        s.onload = function () { URL.revokeObjectURL(u); if (options.onDone) options.onDone(); };
        s.onerror = function () { if (options.onError) options.onError('Lỗi khi chạy script'); };
        document.head.appendChild(s);
        return { code: code, bytes: bytes };
      }
      var worker = AIA.runInWorker(code, options);
      return { code: code, bytes: bytes, worker: worker };
    },
    /** Tải bản rõ về máy. */
    download: async function (options) {
      options = options || {};
      var bytes = await decrypt(options);
      var name = options.fileName || META.file.name || 'decrypted.bin';
      var blob = new Blob([bytes], { type: 'application/octet-stream' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      return bytes;
    },
  };

  global.AIA_UNLOCK = AIA;
  if (typeof module !== 'undefined' && module.exports) module.exports = AIA;

  // Tự chạy: <script src="x.key.js" data-auto-run="1" data-pass="..."></script>
  if (typeof document !== 'undefined' && document.currentScript && document.currentScript.dataset.autoRun === '1') {
    var cs = document.currentScript;
    AIA.run({
      passphrase: cs.dataset.pass != null ? cs.dataset.pass : undefined,
      execute: true,
      mode: cs.dataset.mode || 'worker',
      onLog: function (level, args) { (console[level] || console.log).apply(console, args); },
      onError: function (m) { console.error('[AIA]', m); },
    }).catch(function (e) { console.error('[AIA] Không chạy được:', e && e.message ? e.message : e); });
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
