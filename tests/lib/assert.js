'use strict';
/**
 * tests/lib/assert.js
 * Bộ khẳng định tối giản cho test suite. Cố tình KHÔNG dùng thư viện ngoài:
 * kết quả test phải tái lập được trên máy của bạn chỉ với `npm test`.
 *
 * Mỗi khẳng định thất bại ném AssertionError kèm `label` để runner gom lại.
 */

class AssertionError extends Error {
  constructor(message, label) {
    super(message);
    this.name = 'AssertionError';
    this.label = label;
  }
}

function fmt(value) {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'function') return '[function]';
  if (Array.isArray(value)) return `[array ${value.length}]`;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value).slice(0, 160);
    } catch {
      return '[object]';
    }
  }
  return String(value);
}

function fail(message, label) {
  throw new AssertionError(message, label);
}

function ok(value, label = 'ok') {
  if (!value) fail(`mong đợi giá trị truthy, nhận ${fmt(value)}`, label);
  return value;
}

function equal(actual, expected, label = 'equal') {
  if (actual !== expected) {
    fail(`mong đợi ${fmt(expected)}, nhận ${fmt(actual)}`, label);
  }
  return actual;
}

function notEqual(actual, unexpected, label = 'notEqual') {
  if (actual === unexpected) {
    fail(`không mong đợi ${fmt(unexpected)}`, label);
  }
  return actual;
}

function near(actual, expected, tolerance, label = 'near') {
  const a = Number(actual);
  const e = Number(expected);
  if (!Number.isFinite(a) || !Number.isFinite(e)) {
    fail(`mong đợi số, nhận actual=${fmt(actual)} expected=${fmt(expected)}`, label);
  }
  if (Math.abs(a - e) > tolerance) {
    fail(`mong đợi ${fmt(e)} ±${fmt(tolerance)}, nhận ${fmt(a)}`, label);
  }
  return a;
}

function lessThan(actual, limit, label = 'lessThan') {
  if (!(Number(actual) < Number(limit))) {
    fail(`mong đợi < ${fmt(limit)}, nhận ${fmt(actual)}`, label);
  }
  return actual;
}

function greaterThan(actual, limit, label = 'greaterThan') {
  if (!(Number(actual) > Number(limit))) {
    fail(`mong đợi > ${fmt(limit)}, nhận ${fmt(actual)}`, label);
  }
  return actual;
}

function inRange(actual, min, max, label = 'inRange') {
  const a = Number(actual);
  if (!(a >= min && a <= max)) {
    fail(`mong đợi trong [${fmt(min)}, ${fmt(max)}], nhận ${fmt(a)}`, label);
  }
  return a;
}

function deepEqual(actual, expected, label = 'deepEqual') {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) fail(`mong đợi ${b}, nhận ${a}`, label);
  return actual;
}

function matches(actual, pattern, label = 'matches') {
  if (!pattern.test(String(actual))) {
    fail(`mong đợi khớp ${pattern}, nhận ${fmt(actual)}`, label);
  }
  return actual;
}

/** Khẳng định hàm NÉM lỗi (dùng để kiểm tra chốt chặn an toàn). */
function throws(fn, label = 'throws') {
  let threw = false;
  let caught = null;
  try {
    fn();
  } catch (err) {
    threw = true;
    caught = err;
  }
  if (!threw) fail('mong đợi hàm ném lỗi nhưng nó chạy êm', label);
  return caught;
}

module.exports = {
  AssertionError, ok, equal, notEqual, near, lessThan, greaterThan,
  inRange, deepEqual, matches, throws, fmt, fail,
};
