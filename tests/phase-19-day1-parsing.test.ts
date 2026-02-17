/**
 * Phase 19 Day 1: Function Definition Parsing
 * Parse fn keyword, function names, parameters, and bodies
 */

import { describe, it, expect } from '@jest/globals';
import { FunctionRegistry, LocalScope } from '../src/parser/function-registry';

describe('Phase 19 Day 1: Function Parsing', () => {
  // ── Test 1: Create Function Definition ──────────────────────
  it('creates function definition', () => {
    const def = {
      type: 'FunctionDefinition',
      name: 'add',
      params: ['a', 'b'],
      body: {
        type: 'BinaryOp',
        operator: '+',
        left: { type: 'Identifier', name: 'a' },
        right: { type: 'Identifier', name: 'b' }
      }
    };

    expect(def.name).toBe('add');
    expect(def.params).toEqual(['a', 'b']);
    expect(def.body.type).toBe('BinaryOp');
  });

  // ── Test 2: Register Function ───────────────────────────────
  it('registers function in registry', () => {
    const registry = new FunctionRegistry();
    const def = {
      type: 'FunctionDefinition',
      name: 'multiply',
      params: ['x', 'y'],
      body: {
        type: 'BinaryOp',
        operator: '*',
        left: { type: 'Identifier', name: 'x' },
        right: { type: 'Identifier', name: 'y' }
      }
    };

    registry.register(def);

    expect(registry.count()).toBe(1);
    expect(registry.exists('multiply')).toBe(true);
  });

  // ── Test 3: Lookup Function ────────────────────────────────
  it('looks up function by name', () => {
    const registry = new FunctionRegistry();
    const def = {
      type: 'FunctionDefinition',
      name: 'divide',
      params: ['a', 'b'],
      body: {
        type: 'BinaryOp',
        operator: '/',
        left: { type: 'Identifier', name: 'a' },
        right: { type: 'Identifier', name: 'b' }
      }
    };

    registry.register(def);
    const looked = registry.lookup('divide');

    expect(looked).not.toBeNull();
    expect(looked?.name).toBe('divide');
    expect(looked?.params).toEqual(['a', 'b']);
  });

  // ── Test 4: Function with Multiple Parameters ──────────────
  it('handles function with multiple parameters', () => {
    const registry = new FunctionRegistry();
    const def = {
      type: 'FunctionDefinition',
      name: 'sum3',
      params: ['x', 'y', 'z'],
      body: {
        type: 'BinaryOp',
        operator: '+',
        left: {
          type: 'BinaryOp',
          operator: '+',
          left: { type: 'Identifier', name: 'x' },
          right: { type: 'Identifier', name: 'y' }
        },
        right: { type: 'Identifier', name: 'z' }
      }
    };

    registry.register(def);
    const fn = registry.lookup('sum3');

    expect(fn?.params.length).toBe(3);
    expect(fn?.params).toContain('x');
    expect(fn?.params).toContain('y');
    expect(fn?.params).toContain('z');
  });

  // ── Test 5: Function with No Parameters ────────────────────
  it('handles function with no parameters', () => {
    const registry = new FunctionRegistry();
    const def = {
      type: 'FunctionDefinition',
      name: 'getPI',
      params: [],
      body: { type: 'NumberLiteral', value: 3.14159 }
    };

    registry.register(def);
    const fn = registry.lookup('getPI');

    expect(fn?.params.length).toBe(0);
  });

  // ── Test 6: Multiple Function Registrations ────────────────
  it('registers multiple functions', () => {
    const registry = new FunctionRegistry();

    registry.register({
      type: 'FunctionDefinition',
      name: 'add',
      params: ['a', 'b'],
      body: {
        type: 'BinaryOp',
        operator: '+',
        left: { type: 'Identifier', name: 'a' },
        right: { type: 'Identifier', name: 'b' }
      }
    });

    registry.register({
      type: 'FunctionDefinition',
      name: 'subtract',
      params: ['a', 'b'],
      body: {
        type: 'BinaryOp',
        operator: '-',
        left: { type: 'Identifier', name: 'a' },
        right: { type: 'Identifier', name: 'b' }
      }
    });

    expect(registry.count()).toBe(2);
    expect(registry.exists('add')).toBe(true);
    expect(registry.exists('subtract')).toBe(true);
  });

  // ── Test 7: Get All Functions ──────────────────────────────
  it('retrieves all registered functions', () => {
    const registry = new FunctionRegistry();

    registry.register({
      type: 'FunctionDefinition',
      name: 'fn1',
      params: [],
      body: { type: 'NumberLiteral', value: 1 }
    });

    registry.register({
      type: 'FunctionDefinition',
      name: 'fn2',
      params: [],
      body: { type: 'NumberLiteral', value: 2 }
    });

    const all = registry.getAll();
    expect(all.length).toBe(2);
    expect(all.map(f => f.name)).toEqual(['fn1', 'fn2']);
  });

  // ── Test 8: Function Name List ─────────────────────────────
  it('returns list of function names', () => {
    const registry = new FunctionRegistry();

    registry.register({
      type: 'FunctionDefinition',
      name: 'foo',
      params: [],
      body: { type: 'NumberLiteral', value: 1 }
    });

    registry.register({
      type: 'FunctionDefinition',
      name: 'bar',
      params: [],
      body: { type: 'NumberLiteral', value: 2 }
    });

    const names = registry.getNames();
    expect(names).toContain('foo');
    expect(names).toContain('bar');
    expect(names.length).toBe(2);
  });

  // ── Test 9: Function Definition Validation ─────────────────
  it('validates function definitions', () => {
    const validDef = {
      type: 'FunctionDefinition',
      name: 'valid',
      params: ['a', 'b'],
      body: { type: 'NumberLiteral', value: 1 }
    };

    const result = FunctionRegistry.validate(validDef);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  // ── Test 10: Validation Errors ─────────────────────────────
  it('detects validation errors', () => {
    const invalidDef = {
      type: 'FunctionDefinition',
      name: '',  // Missing name
      params: ['a', 'a'],  // Duplicate params
      body: null  // Missing body
    } as any;

    const result = FunctionRegistry.validate(invalidDef);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  // ── Test 11: Local Scope - Create ──────────────────────────
  it('creates local scope', () => {
    const scope = new LocalScope();
    expect(scope).toBeDefined();
  });

  // ── Test 12: Local Scope - Set and Get ─────────────────────
  it('stores and retrieves variables in scope', () => {
    const scope = new LocalScope();
    scope.set('x', 5);
    scope.set('y', 10);

    expect(scope.get('x')).toBe(5);
    expect(scope.get('y')).toBe(10);
  });

  // ── Test 13: Local Scope - Parent Chain ────────────────────
  it('looks up variables in parent scope', () => {
    const parent = new LocalScope();
    parent.set('x', 5);

    const child = parent.createChild();
    child.set('y', 10);

    expect(child.get('x')).toBe(5);  // From parent
    expect(child.get('y')).toBe(10); // From child
  });

  // ── Test 14: Local Scope - Parameter Initialization ────────
  it('initializes scope with parameters', () => {
    const params = new Map([
      ['a', 5],
      ['b', 3]
    ]);

    const scope = new LocalScope(null, params);

    expect(scope.get('a')).toBe(5);
    expect(scope.get('b')).toBe(3);
  });

  // ── Test 15: Function Call History ────────────────────────
  it('tracks function calls', () => {
    const registry = new FunctionRegistry();

    registry.register({
      type: 'FunctionDefinition',
      name: 'test',
      params: [],
      body: { type: 'NumberLiteral', value: 1 }
    });

    registry.trackCall('test');
    registry.trackCall('test');

    const history = registry.getCallHistory();
    expect(history.length).toBe(2);
    expect(history[0].name).toBe('test');
  });
});
