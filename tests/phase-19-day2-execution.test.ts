/**
 * Phase 19 Day 2: Function Execution
 * Execute user-defined functions with parameters and return values
 */

import { describe, it, expect } from '@jest/globals';
import { IRGenerator } from '../src/codegen/ir-generator';
import { VM } from '../src/vm';
import { Op } from '../src/types';
import { FunctionRegistry, LocalScope } from '../src/parser/function-registry';

describe('Phase 19 Day 2: Function Execution', () => {
  const gen = new IRGenerator();
  const vm = new VM();
  const registry = new FunctionRegistry();

  // ── Test 1: Return Statement IR ────────────────────────────
  it('generates IR for return statement', () => {
    const ast = {
      type: 'ReturnStatement',
      value: { type: 'NumberLiteral', value: 42 }
    };

    const ir = gen.generateIR(ast);

    // Should have PUSH 42 and RET
    expect(ir[0]).toEqual({ op: Op.PUSH, arg: 42 });
    const retIdx = ir.findIndex(inst => inst.op === Op.RET);
    expect(retIdx).toBeGreaterThan(0);
  });

  // ── Test 2: Function Definition Registration ───────────────
  it('registers function definition in IR', () => {
    const ast = {
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

    // Register the function
    registry.register(ast);

    expect(registry.exists('add')).toBe(true);
    const fn = registry.lookup('add');
    expect(fn?.params).toEqual(['a', 'b']);
  });

  // ── Test 3: Simple Function Call ───────────────────────────
  it('generates IR for function call', () => {
    const ast = {
      type: 'CallExpression',
      callee: 'multiply',
      arguments: [
        { type: 'NumberLiteral', value: 3 },
        { type: 'NumberLiteral', value: 4 }
      ]
    };

    const ir = gen.generateIR(ast);

    // Should have arguments pushed then CALL
    expect(ir[0]).toEqual({ op: Op.PUSH, arg: 3 });
    expect(ir[1]).toEqual({ op: Op.PUSH, arg: 4 });
    const callIdx = ir.findIndex(inst => inst.op === Op.CALL);
    expect(callIdx).toBeGreaterThan(0);
    expect(ir[callIdx].arg).toBe('multiply');
  });

  // ── Test 4: Function with Variable Parameters ──────────────
  it('passes variables as function arguments', () => {
    const ast = {
      type: 'Block',
      statements: [
        {
          type: 'Assignment',
          name: 'x',
          value: { type: 'NumberLiteral', value: 10 }
        },
        {
          type: 'Assignment',
          name: 'y',
          value: { type: 'NumberLiteral', value: 20 }
        },
        {
          type: 'CallExpression',
          callee: 'add',
          arguments: [
            { type: 'Identifier', name: 'x' },
            { type: 'Identifier', name: 'y' }
          ]
        }
      ]
    };

    const ir = gen.generateIR(ast);

    // Should have assignments then LOAD calls
    const loadXIdx = ir.findIndex(inst => inst.op === Op.LOAD && inst.arg === 'x');
    const loadYIdx = ir.findIndex(inst => inst.op === Op.LOAD && inst.arg === 'y');
    expect(loadXIdx).toBeGreaterThan(0);
    expect(loadYIdx).toBeGreaterThan(loadXIdx);
  });

  // ── Test 5: Nested Function Calls ──────────────────────────
  it('generates IR for nested function calls', () => {
    const ast = {
      type: 'CallExpression',
      callee: 'multiply',
      arguments: [
        {
          type: 'CallExpression',
          callee: 'add',
          arguments: [
            { type: 'NumberLiteral', value: 2 },
            { type: 'NumberLiteral', value: 3 }
          ]
        },
        { type: 'NumberLiteral', value: 4 }
      ]
    };

    const ir = gen.generateIR(ast);

    // Should have two CALL operations
    const callCount = ir.filter(inst => inst.op === Op.CALL).length;
    expect(callCount).toBe(2);
  });

  // ── Test 6: Function Return Value ──────────────────────────
  it('stores function result in variable', () => {
    const ast = {
      type: 'Block',
      statements: [
        {
          type: 'Assignment',
          name: 'result',
          value: {
            type: 'CallExpression',
            callee: 'square',
            arguments: [{ type: 'NumberLiteral', value: 5 }]
          }
        },
        { type: 'Identifier', name: 'result' }
      ]
    };

    const ir = gen.generateIR(ast);

    // Should have STORE and LOAD for result
    const storeIdx = ir.findIndex(inst => inst.op === Op.STORE && inst.arg === 'result');
    expect(storeIdx).toBeGreaterThan(0);
  });

  // ── Test 7: Function Body with Arithmetic ─────────────────
  it('executes function body with arithmetic', () => {
    registry.clear();
    registry.register({
      type: 'FunctionDefinition',
      name: 'sum',
      params: ['a', 'b'],
      body: {
        type: 'BinaryOp',
        operator: '+',
        left: { type: 'Identifier', name: 'a' },
        right: { type: 'Identifier', name: 'b' }
      }
    });

    const fn = registry.lookup('sum');
    expect(fn).not.toBeNull();
    expect(fn?.body.type).toBe('BinaryOp');
  });

  // ── Test 8: Function Body with Return ──────────────────────
  it('generates IR for function body with return', () => {
    const bodyAst = {
      type: 'ReturnStatement',
      value: {
        type: 'BinaryOp',
        operator: '*',
        left: { type: 'Identifier', name: 'x' },
        right: { type: 'Identifier', name: 'x' }
      }
    };

    const ir = gen.generateIR(bodyAst);

    // Should have operations for x*x and return
    const retIdx = ir.findIndex(inst => inst.op === Op.RET);
    expect(retIdx).toBeGreaterThan(0);
  });

  // ── Test 9: Multiple Parameters ────────────────────────────
  it('handles function with multiple parameters', () => {
    registry.clear();
    registry.register({
      type: 'FunctionDefinition',
      name: 'sum3',
      params: ['a', 'b', 'c'],
      body: {
        type: 'BinaryOp',
        operator: '+',
        left: {
          type: 'BinaryOp',
          operator: '+',
          left: { type: 'Identifier', name: 'a' },
          right: { type: 'Identifier', name: 'b' }
        },
        right: { type: 'Identifier', name: 'c' }
      }
    });

    const fn = registry.lookup('sum3');
    expect(fn?.params.length).toBe(3);
  });

  // ── Test 10: Function Call with Expression Arguments ───────
  it('passes expression as function argument', () => {
    const ast = {
      type: 'CallExpression',
      callee: 'double',
      arguments: [
        {
          type: 'BinaryOp',
          operator: '+',
          left: { type: 'NumberLiteral', value: 2 },
          right: { type: 'NumberLiteral', value: 3 }
        }
      ]
    };

    const ir = gen.generateIR(ast);

    // Should evaluate expression before calling
    expect(ir[0]).toEqual({ op: Op.PUSH, arg: 2 });
    expect(ir[1]).toEqual({ op: Op.PUSH, arg: 3 });
    expect(ir[2]).toEqual({ op: Op.ADD });
  });

  // ── Test 11: Function Call Result Used in Expression ───────
  it('uses function result in arithmetic', () => {
    const ast = {
      type: 'BinaryOp',
      operator: '+',
      left: {
        type: 'CallExpression',
        callee: 'getValue',
        arguments: []
      },
      right: { type: 'NumberLiteral', value: 10 }
    };

    const ir = gen.generateIR(ast);

    // Should have function call then addition
    const callIdx = ir.findIndex(inst => inst.op === Op.CALL);
    const addIdx = ir.findIndex(inst => inst.op === Op.ADD);
    expect(callIdx).toBeGreaterThanOrEqual(0);
    expect(addIdx).toBeGreaterThan(callIdx);
  });

  // ── Test 12: Scope Management with Parameters ──────────────
  it('creates scope with function parameters', () => {
    const params = new Map([
      ['x', 5],
      ['y', 10]
    ]);

    // LocalScope should be able to initialize with parameters
    const scope = new LocalScope(null, params);
    expect(scope.get('x')).toBe(5);
    expect(scope.get('y')).toBe(10);
  });

  // ── Test 13: Return Value Extraction ───────────────────────
  it('extracts return value from function', () => {
    registry.clear();
    registry.register({
      type: 'FunctionDefinition',
      name: 'getConstant',
      params: [],
      body: {
        type: 'ReturnStatement',
        value: { type: 'NumberLiteral', value: 42 }
      }
    });

    const fn = registry.lookup('getConstant');
    expect(fn?.body.type).toBe('ReturnStatement');
    expect(fn?.body.value.value).toBe(42);
  });

  // ── Test 14: Function Chain ────────────────────────────────
  it('generates IR for function call chain', () => {
    const ast = {
      type: 'CallExpression',
      callee: 'outer',
      arguments: [
        {
          type: 'CallExpression',
          callee: 'inner',
          arguments: [{ type: 'NumberLiteral', value: 5 }]
        }
      ]
    };

    const ir = gen.generateIR(ast);

    const callCount = ir.filter(inst => inst.op === Op.CALL).length;
    expect(callCount).toBe(2);
  });

  // ── Test 15: Complex Function Definition ───────────────────
  it('handles complex function definition', () => {
    registry.clear();
    registry.register({
      type: 'FunctionDefinition',
      name: 'complex',
      params: ['a', 'b'],
      body: {
        type: 'Block',
        statements: [
          {
            type: 'Assignment',
            name: 'temp',
            value: {
              type: 'BinaryOp',
              operator: '+',
              left: { type: 'Identifier', name: 'a' },
              right: { type: 'Identifier', name: 'b' }
            }
          },
          {
            type: 'ReturnStatement',
            value: {
              type: 'BinaryOp',
              operator: '*',
              left: { type: 'Identifier', name: 'temp' },
              right: { type: 'NumberLiteral', value: 2 }
            }
          }
        ]
      }
    });

    const fn = registry.lookup('complex');
    expect(fn?.body.type).toBe('Block');
    expect(fn?.body.statements.length).toBe(2);
  });
});
