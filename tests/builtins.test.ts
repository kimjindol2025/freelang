import {
  BUILTINS,
  getBuiltinType,
  getBuiltinImpl,
  getBuiltinC,
  getBuiltinNames,
  isBuiltin,
  validateBuiltins,
} from '../src/engine/builtins';

describe('Builtin Registry', () => {
  test('validation passes', () => {
    const result = validateBuiltins();
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  test('all builtins have required fields', () => {
    for (const [name, spec] of Object.entries(BUILTINS)) {
      expect(spec.name).toBe(name);
      expect(spec.params).toBeDefined();
      expect(spec.return_type).toBeDefined();
      expect(spec.c_name).toBeDefined();
      expect(Array.isArray(spec.headers)).toBe(true);
    }
  });

  test('getBuiltinType: sum', () => {
    const type = getBuiltinType('sum');
    expect(type).not.toBeNull();
    expect(type!.params[0].name).toBe('arr');
    expect(type!.params[0].type).toBe('array<number>');
    expect(type!.return_type).toBe('number');
  });

  test('getBuiltinType: sqrt', () => {
    const type = getBuiltinType('sqrt');
    expect(type!.params[0].name).toBe('x');
    expect(type!.return_type).toBe('number');
  });

  test('getBuiltinImpl: sum works', () => {
    const impl = getBuiltinImpl('sum');
    expect(impl).not.toBeNull();
    expect(impl!([1, 2, 3, 4, 5])).toBe(15);
  });

  test('getBuiltinImpl: average works', () => {
    const impl = getBuiltinImpl('average');
    expect(impl!([10, 20, 30])).toBe(20);
  });

  test('getBuiltinImpl: max works', () => {
    const impl = getBuiltinImpl('max');
    expect(impl!([3, 7, 2, 9, 1])).toBe(9);
  });

  test('getBuiltinImpl: min works', () => {
    const impl = getBuiltinImpl('min');
    expect(impl!([5, 2, 8, 1, 9])).toBe(1);
  });

  test('getBuiltinImpl: sqrt works', () => {
    const impl = getBuiltinImpl('sqrt');
    expect(impl!(16)).toBe(4);
  });

  test('getBuiltinC: sum', () => {
    const c = getBuiltinC('sum');
    expect(c!.c_name).toBe('sum_array');
    expect(c!.headers).toContain('stdlib.h');
  });

  test('getBuiltinC: sqrt', () => {
    const c = getBuiltinC('sqrt');
    expect(c!.c_name).toBe('sqrt');
    expect(c!.headers).toContain('math.h');
  });

  test('getBuiltinNames returns all builtins', () => {
    const names = getBuiltinNames();
    expect(names.length).toBeGreaterThan(10);
    expect(names).toContain('sum');
    expect(names).toContain('average');
    expect(names).toContain('sqrt');
  });

  test('isBuiltin recognizes builtins', () => {
    expect(isBuiltin('sum')).toBe(true);
    expect(isBuiltin('sqrt')).toBe(true);
    expect(isBuiltin('unknown_func')).toBe(false);
  });

  test('multiple builtins work', () => {
    const sum_impl = getBuiltinImpl('sum');
    const avg_impl = getBuiltinImpl('average');
    const max_impl = getBuiltinImpl('max');

    const data = [10, 20, 30, 40];
    expect(sum_impl!(data)).toBe(100);
    expect(avg_impl!(data)).toBe(25);
    expect(max_impl!(data)).toBe(40);
  });

  test('builtin headers are consistent', () => {
    // All array ops should have stdlib.h
    for (const op of ['sum', 'average', 'max', 'min', 'count', 'length']) {
      const c = getBuiltinC(op);
      expect(c!.headers).toContain('stdlib.h');
    }

    // All math ops should have math.h
    for (const op of ['sqrt', 'abs', 'floor', 'ceil', 'round']) {
      const c = getBuiltinC(op);
      expect(c!.headers).toContain('math.h');
    }
  });
});
