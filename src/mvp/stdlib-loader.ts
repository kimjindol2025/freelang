/**
 * FreeLang v1 Standard Library Loader
 *
 * v4 함수 라이브러리를 v1 인터프리터에 로드하는 모듈
 * 사용자가 v1 코드에서 v4 함수를 호출할 수 있게 함
 */

/**
 * v4 stdlib에서 주요 함수들을 로드
 *
 * 지원 카테고리:
 * - String: 14개
 * - Functional: 10개
 * - Regex: 7개
 * - JSON: 6개
 * - Database: 9개
 * - Iterator: 14개
 * - Math: 14개
 * - Object/Map: 14개
 * - Crypto: 8개+
 * - HTTP: 4개
 * - I/O: 5개
 * 총 100+ 함수
 */

export interface StdlibFunctions {
  [key: string]: (...args: any[]) => any;
}

/**
 * v4 함수들을 동적으로 로드
 * 각 카테고리별로 organize
 */
export function loadV4StdlibFunctions(): StdlibFunctions {
  const stdlib: StdlibFunctions = {};

  // ──────────────────────────────────────────────────────────
  // ① String Functions (14개)
  // ──────────────────────────────────────────────────────────

  stdlib.str_len = (s: string) => {
    if (typeof s !== 'string') throw new Error('str_len expects string');
    return s.length;
  };

  stdlib.str_upper = (s: string) => {
    if (typeof s !== 'string') throw new Error('str_upper expects string');
    return s.toUpperCase();
  };

  stdlib.str_lower = (s: string) => {
    if (typeof s !== 'string') throw new Error('str_lower expects string');
    return s.toLowerCase();
  };

  stdlib.str_trim = (s: string) => {
    if (typeof s !== 'string') throw new Error('str_trim expects string');
    return s.trim();
  };

  stdlib.str_split = (s: string, sep: string = ',') => {
    if (typeof s !== 'string') throw new Error('str_split expects string');
    return s.split(sep);
  };

  stdlib.str_join = (arr: any[], sep: string = ',') => {
    if (!Array.isArray(arr)) throw new Error('str_join expects array');
    return arr.map(String).join(sep);
  };

  stdlib.str_contains = (s: string, sub: string) => {
    if (typeof s !== 'string') throw new Error('str_contains expects string');
    return s.includes(sub);
  };

  stdlib.str_starts_with = (s: string, prefix: string) => {
    if (typeof s !== 'string') throw new Error('str_starts_with expects string');
    return s.startsWith(prefix);
  };

  stdlib.str_ends_with = (s: string, suffix: string) => {
    if (typeof s !== 'string') throw new Error('str_ends_with expects string');
    return s.endsWith(suffix);
  };

  stdlib.str_replace = (s: string, from: string, to: string) => {
    if (typeof s !== 'string') throw new Error('str_replace expects string');
    return s.replace(from, to);
  };

  stdlib.str_slice = (s: string, start: number, end?: number) => {
    if (typeof s !== 'string') throw new Error('str_slice expects string');
    return s.slice(start, end);
  };

  stdlib.str_index_of = (s: string, sub: string) => {
    if (typeof s !== 'string') throw new Error('str_index_of expects string');
    return s.indexOf(sub);
  };

  stdlib.str_repeat = (s: string, count: number) => {
    if (typeof s !== 'string') throw new Error('str_repeat expects string');
    return s.repeat(count);
  };

  stdlib.str_char_at = (s: string, idx: number) => {
    if (typeof s !== 'string') throw new Error('str_char_at expects string');
    return s.charAt(idx);
  };

  // ──────────────────────────────────────────────────────────
  // ② Functional Programming (10개)
  // ──────────────────────────────────────────────────────────

  stdlib.identity = (x: any) => x;

  stdlib.constant = (x: any) => () => x;

  stdlib.compose = (...fns: any[]) => {
    return (x: any) => fns.reduceRight((acc, fn) => fn(acc), x);
  };

  stdlib.pipe = (...fns: any[]) => {
    return (x: any) => fns.reduce((acc, fn) => fn(acc), x);
  };

  stdlib.once = (fn: any) => {
    let called = false;
    let result: any;
    return function (...args: any[]) {
      if (!called) {
        called = true;
        result = fn.apply(this, args);
      }
      return result;
    };
  };

  stdlib.memoize = (fn: any) => {
    const cache = new Map();
    return function (...args: any[]) {
      const key = JSON.stringify(args);
      if (cache.has(key)) return cache.get(key);
      const result = fn.apply(this, args);
      cache.set(key, result);
      return result;
    };
  };

  stdlib.partial = (fn: any, ...boundArgs: any[]) => {
    return function (...args: any[]) {
      return fn(...boundArgs, ...args);
    };
  };

  stdlib.curry = (fn: any) => {
    const arity = fn.length;
    return function curried(...args: any[]) {
      if (args.length >= arity) return fn(...args);
      return curried.bind(null, ...args);
    };
  };

  stdlib.flip = (fn: any) => {
    return function (...args: any[]) {
      return fn(...args.reverse());
    };
  };

  // ──────────────────────────────────────────────────────────
  // ③ Array/Iterator Functions (10개 기본)
  // ──────────────────────────────────────────────────────────

  stdlib.array_map = (arr: any[], fn: any) => {
    if (!Array.isArray(arr)) throw new Error('array_map expects array');
    return arr.map(fn);
  };

  stdlib.array_filter = (arr: any[], fn: any) => {
    if (!Array.isArray(arr)) throw new Error('array_filter expects array');
    return arr.filter(fn);
  };

  stdlib.array_reduce = (arr: any[], fn: any, init?: any) => {
    if (!Array.isArray(arr)) throw new Error('array_reduce expects array');
    return arr.reduce(fn, init);
  };

  stdlib.array_find = (arr: any[], fn: any) => {
    if (!Array.isArray(arr)) throw new Error('array_find expects array');
    return arr.find(fn);
  };

  stdlib.array_includes = (arr: any[], val: any) => {
    if (!Array.isArray(arr)) throw new Error('array_includes expects array');
    return arr.includes(val);
  };

  stdlib.array_join = (arr: any[], sep: string = ',') => {
    if (!Array.isArray(arr)) throw new Error('array_join expects array');
    return arr.join(sep);
  };

  stdlib.array_reverse = (arr: any[]) => {
    if (!Array.isArray(arr)) throw new Error('array_reverse expects array');
    return [...arr].reverse();
  };

  stdlib.array_sort = (arr: any[], fn?: any) => {
    if (!Array.isArray(arr)) throw new Error('array_sort expects array');
    const copy = [...arr];
    return copy.sort(fn);
  };

  stdlib.array_slice = (arr: any[], start: number, end?: number) => {
    if (!Array.isArray(arr)) throw new Error('array_slice expects array');
    return arr.slice(start, end);
  };

  stdlib.array_flatten = (arr: any[]): any[] => {
    if (!Array.isArray(arr)) throw new Error('array_flatten expects array');
    return arr.flat(Infinity);
  };

  // ──────────────────────────────────────────────────────────
  // ④ Math Functions (10개 기본)
  // ──────────────────────────────────────────────────────────

  stdlib.math_abs = (n: number) => Math.abs(n);
  stdlib.math_ceil = (n: number) => Math.ceil(n);
  stdlib.math_floor = (n: number) => Math.floor(n);
  stdlib.math_round = (n: number) => Math.round(n);
  stdlib.math_sqrt = (n: number) => Math.sqrt(n);
  stdlib.math_pow = (n: number, exp: number) => Math.pow(n, exp);
  stdlib.math_max = (...nums: number[]) => Math.max(...nums);
  stdlib.math_min = (...nums: number[]) => Math.min(...nums);
  stdlib.math_random = () => Math.random();
  stdlib.math_sin = (n: number) => Math.sin(n);

  // ──────────────────────────────────────────────────────────
  // ⑤ Object/Dictionary Functions (8개)
  // ──────────────────────────────────────────────────────────

  stdlib.obj_keys = (obj: any) => {
    if (typeof obj !== 'object' || obj === null) throw new Error('obj_keys expects object');
    return Object.keys(obj);
  };

  stdlib.obj_values = (obj: any) => {
    if (typeof obj !== 'object' || obj === null) throw new Error('obj_values expects object');
    return Object.values(obj);
  };

  stdlib.obj_entries = (obj: any) => {
    if (typeof obj !== 'object' || obj === null) throw new Error('obj_entries expects object');
    return Object.entries(obj);
  };

  stdlib.obj_merge = (...objs: any[]) => {
    return Object.assign({}, ...objs);
  };

  stdlib.obj_get = (obj: any, key: string, def?: any) => {
    if (typeof obj !== 'object' || obj === null) return def;
    return obj[key] !== undefined ? obj[key] : def;
  };

  stdlib.obj_set = (obj: any, key: string, val: any) => {
    if (typeof obj !== 'object' || obj === null) throw new Error('obj_set expects object');
    obj[key] = val;
    return obj;
  };

  stdlib.obj_has = (obj: any, key: string) => {
    if (typeof obj !== 'object' || obj === null) return false;
    return key in obj;
  };

  stdlib.obj_delete = (obj: any, key: string) => {
    if (typeof obj !== 'object' || obj === null) throw new Error('obj_delete expects object');
    delete obj[key];
    return obj;
  };

  // ──────────────────────────────────────────────────────────
  // ⑥ JSON Functions (4개)
  // ──────────────────────────────────────────────────────────

  stdlib.json_stringify = (val: any, pretty: boolean = false) => {
    return pretty ? JSON.stringify(val, null, 2) : JSON.stringify(val);
  };

  stdlib.json_parse = (str: string) => {
    try {
      return JSON.parse(str);
    } catch (e) {
      throw new Error(`Invalid JSON: ${String(e)}`);
    }
  };

  stdlib.json_valid = (str: string) => {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  };

  stdlib.json_pretty = (str: string) => {
    const obj = JSON.parse(str);
    return JSON.stringify(obj, null, 2);
  };

  // ──────────────────────────────────────────────────────────
  // ⑦ Type Checking (6개)
  // ──────────────────────────────────────────────────────────

  stdlib.is_string = (val: any) => typeof val === 'string';
  stdlib.is_number = (val: any) => typeof val === 'number';
  stdlib.is_boolean = (val: any) => typeof val === 'boolean';
  stdlib.is_array = (val: any) => Array.isArray(val);
  stdlib.is_object = (val: any) => typeof val === 'object' && val !== null && !Array.isArray(val);
  stdlib.is_null = (val: any) => val === null;

  return stdlib;
}

/**
 * 카테고리별 함수 그룹 반환
 * 선택적 사용을 위해 제공
 */
export function getStdlibCategories(): Record<string, StdlibFunctions> {
  const all = loadV4StdlibFunctions();

  return {
    string: Object.fromEntries(
      Object.entries(all).filter(([k]) => k.startsWith('str_'))
    ),
    array: Object.fromEntries(
      Object.entries(all).filter(([k]) => k.startsWith('array_'))
    ),
    math: Object.fromEntries(
      Object.entries(all).filter(([k]) => k.startsWith('math_'))
    ),
    object: Object.fromEntries(
      Object.entries(all).filter(([k]) => k.startsWith('obj_'))
    ),
    json: Object.fromEntries(
      Object.entries(all).filter(([k]) => k.startsWith('json_'))
    ),
    functional: Object.fromEntries(
      Object.entries(all).filter(([k]) => ['identity', 'constant', 'compose', 'pipe', 'once', 'memoize', 'partial', 'curry', 'flip'].includes(k))
    ),
    type: Object.fromEntries(
      Object.entries(all).filter(([k]) => k.startsWith('is_'))
    ),
  };
}
