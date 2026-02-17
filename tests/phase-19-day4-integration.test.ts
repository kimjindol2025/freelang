/**
 * Phase 19 Day 4: Integration & End-to-End Testing
 * IR generation, registry management, and function integration
 */

import { describe, it, expect } from '@jest/globals';
import { IRGenerator } from '../src/codegen/ir-generator';
import { VM } from '../src/vm';
import { Op } from '../src/types';
import { FunctionRegistry } from '../src/parser/function-registry';

describe('Phase 19 Day 4: Function Integration & End-to-End', () => {
  let registry: FunctionRegistry;
  let gen: IRGenerator;
  let vm: VM;

  beforeEach(() => {
    registry = new FunctionRegistry();
    gen = new IRGenerator();
    vm = new VM(registry);
  });

  // ── Test 1: Program with Function Definition ──────────────────
  it('generates IR for program with function definition', () => {
    registry.clear();
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

    const programAst = {
      type: 'Block',
      statements: [
        {
          type: 'CallExpression',
          callee: 'add',
          arguments: [
            { type: 'NumberLiteral', value: 5 },
            { type: 'NumberLiteral', value: 3 }
          ]
        }
      ]
    };

    const ir = gen.generateIR(programAst);

    // Should have PUSH 5, PUSH 3, CALL add, HALT
    expect(ir[0]).toEqual({ op: Op.PUSH, arg: 5 });
    expect(ir[1]).toEqual({ op: Op.PUSH, arg: 3 });
    const callIdx = ir.findIndex(inst => inst.op === Op.CALL);
    expect(callIdx).toBeGreaterThanOrEqual(0);
    expect(ir[callIdx].arg).toBe('add');
  });

  // ── Test 2: Multiple Functions IR Generation ───────────────────
  it('generates correct IR for multiple function calls', () => {
    registry.clear();
    registry.register({
      type: 'FunctionDefinition',
      name: 'double',
      params: ['x'],
      body: {
        type: 'BinaryOp',
        operator: '*',
        left: { type: 'Identifier', name: 'x' },
        right: { type: 'NumberLiteral', value: 2 }
      }
    });

    registry.register({
      type: 'FunctionDefinition',
      name: 'triple',
      params: ['x'],
      body: {
        type: 'BinaryOp',
        operator: '*',
        left: { type: 'Identifier', name: 'x' },
        right: { type: 'NumberLiteral', value: 3 }
      }
    });

    const programAst = {
      type: 'Block',
      statements: [
        {
          type: 'CallExpression',
          callee: 'double',
          arguments: [{ type: 'NumberLiteral', value: 4 }]
        },
        {
          type: 'CallExpression',
          callee: 'triple',
          arguments: [{ type: 'NumberLiteral', value: 4 }]
        }
      ]
    };

    const ir = gen.generateIR(programAst);

    // Should have two CALL instructions
    const callCount = ir.filter(inst => inst.op === Op.CALL).length;
    expect(callCount).toBe(2);

    const callIndices = ir
      .map((inst, idx) => (inst.op === Op.CALL ? idx : -1))
      .filter(idx => idx !== -1);

    expect(ir[callIndices[0]].arg).toBe('double');
    expect(ir[callIndices[1]].arg).toBe('triple');
  });

  // ── Test 3: Function Registry with Multiple Definitions ────────
  it('stores and retrieves multiple function definitions', () => {
    registry.clear();

    const definitions = [
      { name: 'add', params: ['a', 'b'] },
      { name: 'subtract', params: ['a', 'b'] },
      { name: 'multiply', params: ['a', 'b'] },
      { name: 'divide', params: ['a', 'b'] }
    ];

    definitions.forEach(def => {
      registry.register({
        type: 'FunctionDefinition',
        name: def.name,
        params: def.params,
        body: {
          type: 'BinaryOp',
          operator: '+',
          left: { type: 'Identifier', name: 'a' },
          right: { type: 'Identifier', name: 'b' }
        }
      });
    });

    expect(registry.count()).toBe(4);
    definitions.forEach(def => {
      expect(registry.exists(def.name)).toBe(true);
    });
  });

  // ── Test 4: Recursive Function IR ──────────────────────────────
  it('generates IR for recursive function definition', () => {
    registry.clear();
    registry.register({
      type: 'FunctionDefinition',
      name: 'factorial',
      params: ['n'],
      body: {
        type: 'IfStatement',
        condition: {
          type: 'BinaryOp',
          operator: '<=',
          left: { type: 'Identifier', name: 'n' },
          right: { type: 'NumberLiteral', value: 1 }
        },
        consequent: {
          type: 'ReturnStatement',
          value: { type: 'NumberLiteral', value: 1 }
        },
        alternate: {
          type: 'ReturnStatement',
          value: {
            type: 'BinaryOp',
            operator: '*',
            left: { type: 'Identifier', name: 'n' },
            right: {
              type: 'CallExpression',
              callee: 'factorial',
              arguments: [
                {
                  type: 'BinaryOp',
                  operator: '-',
                  left: { type: 'Identifier', name: 'n' },
                  right: { type: 'NumberLiteral', value: 1 }
                }
              ]
            }
          }
        }
      }
    });

    const fn = registry.lookup('factorial');
    expect(fn).not.toBeNull();
    expect(fn?.name).toBe('factorial');

    // Generate IR for a call to factorial
    const ast = {
      type: 'CallExpression',
      callee: 'factorial',
      arguments: [{ type: 'NumberLiteral', value: 5 }]
    };

    const ir = gen.generateIR(ast);
    const callIdx = ir.findIndex(inst => inst.op === Op.CALL);
    expect(callIdx).toBeGreaterThanOrEqual(0);
  });

  // ── Test 5: Nested Function Calls IR ───────────────────────────
  it('generates correct IR for nested function calls', () => {
    registry.clear();
    registry.register({
      type: 'FunctionDefinition',
      name: 'f1',
      params: ['x'],
      body: { type: 'Identifier', name: 'x' }
    });

    registry.register({
      type: 'FunctionDefinition',
      name: 'f2',
      params: ['x'],
      body: { type: 'Identifier', name: 'x' }
    });

    // f1(f2(5))
    const ast = {
      type: 'CallExpression',
      callee: 'f1',
      arguments: [
        {
          type: 'CallExpression',
          callee: 'f2',
          arguments: [{ type: 'NumberLiteral', value: 5 }]
        }
      ]
    };

    const ir = gen.generateIR(ast);

    // Should have 2 CALL instructions (f2 then f1)
    const callCount = ir.filter(inst => inst.op === Op.CALL).length;
    expect(callCount).toBe(2);
  });

  // ── Test 6: Function Call Tracking ─────────────────────────────
  it('tracks function calls in registry statistics', () => {
    registry.clear();
    registry.register({
      type: 'FunctionDefinition',
      name: 'test',
      params: ['x'],
      body: { type: 'Identifier', name: 'x' }
    });

    registry.trackCall('test');
    registry.trackCall('test');
    registry.trackCall('test');

    const stats = registry.getStats();
    expect(stats.callsByFunction['test']).toBe(3);
    expect(stats.totalCalls).toBe(3);
  });

  // ── Test 7: Function Composition ───────────────────────────────
  it('generates IR for function composition pattern', () => {
    registry.clear();
    registry.register({
      type: 'FunctionDefinition',
      name: 'inc',
      params: ['x'],
      body: {
        type: 'BinaryOp',
        operator: '+',
        left: { type: 'Identifier', name: 'x' },
        right: { type: 'NumberLiteral', value: 1 }
      }
    });

    // inc(inc(inc(5)))
    const ast = {
      type: 'CallExpression',
      callee: 'inc',
      arguments: [
        {
          type: 'CallExpression',
          callee: 'inc',
          arguments: [
            {
              type: 'CallExpression',
              callee: 'inc',
              arguments: [{ type: 'NumberLiteral', value: 5 }]
            }
          ]
        }
      ]
    };

    const ir = gen.generateIR(ast);

    // 3 CALL inc operations
    const callCount = ir.filter(inst => inst.op === Op.CALL && inst.arg === 'inc').length;
    expect(callCount).toBe(3);
  });

  // ── Test 8: String Operations in Functions ─────────────────────
  it('generates IR for function with string operations', () => {
    registry.clear();
    registry.register({
      type: 'FunctionDefinition',
      name: 'greet',
      params: ['name'],
      body: {
        type: 'BinaryOp',
        operator: '+',
        left: { type: 'StringLiteral', value: 'Hello, ' },
        right: { type: 'Identifier', name: 'name' }
      }
    });

    const ast = {
      type: 'CallExpression',
      callee: 'greet',
      arguments: [{ type: 'StringLiteral', value: 'World' }]
    };

    const ir = gen.generateIR(ast);

    // Should have STR_NEW, STR_NEW, STR_CONCAT (or similar)
    const strOps = ir.filter(inst =>
      [Op.STR_NEW, Op.STR_CONCAT].includes(inst.op)
    );
    expect(strOps.length).toBeGreaterThan(0);
  });

  // ── Test 9: Complex Program Structure ──────────────────────────
  it('handles complex program with mixed operations', () => {
    registry.clear();

    registry.register({
      type: 'FunctionDefinition',
      name: 'max',
      params: ['a', 'b'],
      body: {
        type: 'IfStatement',
        condition: {
          type: 'BinaryOp',
          operator: '>',
          left: { type: 'Identifier', name: 'a' },
          right: { type: 'Identifier', name: 'b' }
        },
        consequent: {
          type: 'ReturnStatement',
          value: { type: 'Identifier', name: 'a' }
        },
        alternate: {
          type: 'ReturnStatement',
          value: { type: 'Identifier', name: 'b' }
        }
      }
    });

    const programAst = {
      type: 'Block',
      statements: [
        {
          type: 'CallExpression',
          callee: 'max',
          arguments: [
            { type: 'NumberLiteral', value: 10 },
            { type: 'NumberLiteral', value: 20 }
          ]
        }
      ]
    };

    const ir = gen.generateIR(programAst);
    expect(ir.length).toBeGreaterThan(0);

    const callIdx = ir.findIndex(inst => inst.op === Op.CALL);
    expect(callIdx).toBeGreaterThanOrEqual(0);
  });

  // ── Test 10: Empty Program with Functions ──────────────────────
  it('handles empty program with registered functions', () => {
    registry.clear();

    for (let i = 0; i < 10; i++) {
      registry.register({
        type: 'FunctionDefinition',
        name: `func${i}`,
        params: ['x'],
        body: { type: 'Identifier', name: 'x' }
      });
    }

    expect(registry.count()).toBe(10);
    expect(registry.getNames().length).toBe(10);
  });

  // ── Test 11: Function with Multiple Parameter Types ──────────
  it('generates IR for functions with various parameter counts', () => {
    registry.clear();

    registry.register({
      type: 'FunctionDefinition',
      name: 'unary',
      params: ['a'],
      body: { type: 'Identifier', name: 'a' }
    });

    registry.register({
      type: 'FunctionDefinition',
      name: 'binary',
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
      name: 'ternary',
      params: ['a', 'b', 'c'],
      body: {
        type: 'BinaryOp',
        operator: '+',
        left: { type: 'Identifier', name: 'a' },
        right: {
          type: 'BinaryOp',
          operator: '+',
          left: { type: 'Identifier', name: 'b' },
          right: { type: 'Identifier', name: 'c' }
        }
      }
    });

    expect(registry.lookup('unary')?.params.length).toBe(1);
    expect(registry.lookup('binary')?.params.length).toBe(2);
    expect(registry.lookup('ternary')?.params.length).toBe(3);
  });

  // ── Test 12: Function Return Type Tracking ─────────────────────
  it('preserves optional return type information', () => {
    registry.clear();

    registry.register({
      type: 'FunctionDefinition',
      name: 'getNumber',
      params: [],
      body: { type: 'NumberLiteral', value: 42 },
      returnType: 'number'
    });

    registry.register({
      type: 'FunctionDefinition',
      name: 'getString',
      params: [],
      body: { type: 'StringLiteral', value: 'hello' },
      returnType: 'string'
    });

    const numFn = registry.lookup('getNumber');
    const strFn = registry.lookup('getString');

    expect(numFn?.returnType).toBe('number');
    expect(strFn?.returnType).toBe('string');
  });

  // ── Test 13: Registry Clear and Reset ──────────────────────────
  it('properly clears and resets function registry', () => {
    registry.clear();

    registry.register({
      type: 'FunctionDefinition',
      name: 'fn1',
      params: [],
      body: { type: 'NumberLiteral', value: 1 }
    });

    expect(registry.count()).toBe(1);

    registry.clear();

    expect(registry.count()).toBe(0);
    expect(registry.exists('fn1')).toBe(false);
  });

  // ── Test 14: Performance - Large Function Registry ────────────
  it('handles large function registry efficiently', () => {
    registry.clear();

    const startTime = performance.now();

    // Register 100 functions
    for (let i = 0; i < 100; i++) {
      registry.register({
        type: 'FunctionDefinition',
        name: `func${i}`,
        params: ['x'],
        body: {
          type: 'BinaryOp',
          operator: '+',
          left: { type: 'Identifier', name: 'x' },
          right: { type: 'NumberLiteral', value: i }
        }
      });
    }

    // Lookup functions
    for (let i = 0; i < 100; i += 10) {
      const fn = registry.lookup(`func${i}`);
      expect(fn).not.toBeNull();
    }

    const duration = performance.now() - startTime;

    expect(registry.count()).toBe(100);
    expect(duration).toBeLessThan(500); // Should be very fast
  });

  // ── Test 15: Full Integration - Registry + Generator + VM ──────
  it('integrates registry, generator, and VM for function support', () => {
    registry.clear();

    // Register functions
    registry.register({
      type: 'FunctionDefinition',
      name: 'helper',
      params: ['x'],
      body: {
        type: 'BinaryOp',
        operator: '*',
        left: { type: 'Identifier', name: 'x' },
        right: { type: 'NumberLiteral', value: 2 }
      }
    });

    // Generate IR
    const ast = {
      type: 'CallExpression',
      callee: 'helper',
      arguments: [{ type: 'NumberLiteral', value: 5 }]
    };

    const ir = gen.generateIR(ast);

    // VM has the registry
    expect(vm['functionRegistry']).toBe(registry);

    // Verify IR is properly formed
    const callIdx = ir.findIndex(inst => inst.op === Op.CALL);
    expect(callIdx).toBeGreaterThanOrEqual(0);
    expect(registry.exists('helper')).toBe(true);
  });
});
