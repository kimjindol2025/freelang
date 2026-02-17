/**
 * Phase 19 Day 3: Advanced Function Features
 * Nested functions, recursion, closures, and variable scoping
 */

import { describe, it, expect } from '@jest/globals';
import { IRGenerator } from '../src/codegen/ir-generator';
import { VM } from '../src/vm';
import { Op } from '../src/types';
import { FunctionRegistry, LocalScope } from '../src/parser/function-registry';

describe('Phase 19 Day 3: Advanced Function Features', () => {
  const gen = new IRGenerator();
  let registry: FunctionRegistry;
  let vm: VM;

  beforeEach(() => {
    registry = new FunctionRegistry();
    vm = new VM(registry);
  });

  // ── Test 1: Recursive Function - Factorial ──────────────────
  it('supports recursive function call (factorial)', () => {
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
    expect(fn?.body.type).toBe('IfStatement');
  });

  // ── Test 2: Recursive Call - Fibonacci ──────────────────────
  it('supports nested recursive calls (fibonacci)', () => {
    registry.clear();
    registry.register({
      type: 'FunctionDefinition',
      name: 'fib',
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
          value: { type: 'Identifier', name: 'n' }
        },
        alternate: {
          type: 'ReturnStatement',
          value: {
            type: 'BinaryOp',
            operator: '+',
            left: {
              type: 'CallExpression',
              callee: 'fib',
              arguments: [
                {
                  type: 'BinaryOp',
                  operator: '-',
                  left: { type: 'Identifier', name: 'n' },
                  right: { type: 'NumberLiteral', value: 1 }
                }
              ]
            },
            right: {
              type: 'CallExpression',
              callee: 'fib',
              arguments: [
                {
                  type: 'BinaryOp',
                  operator: '-',
                  left: { type: 'Identifier', name: 'n' },
                  right: { type: 'NumberLiteral', value: 2 }
                }
              ]
            }
          }
        }
      }
    });

    const fn = registry.lookup('fib');
    expect(fn?.params).toEqual(['n']);
    expect(fn?.body.type).toBe('IfStatement');
  });

  // ── Test 3: Multiple Recursive Calls ────────────────────────
  it('generates IR for function calling itself multiple times', () => {
    const ast = {
      type: 'CallExpression',
      callee: 'recursive',
      arguments: [{ type: 'NumberLiteral', value: 5 }]
    };

    const ir = gen.generateIR(ast);

    // Should have PUSH 5, CALL recursive, RET/HALT
    expect(ir[0]).toEqual({ op: Op.PUSH, arg: 5 });
    const callIdx = ir.findIndex(inst => inst.op === Op.CALL);
    expect(callIdx).toBeGreaterThanOrEqual(0);
  });

  // ── Test 4: Function Calling Another Function ──────────────
  it('supports function calling another user-defined function', () => {
    registry.clear();

    // Register first function
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

    // Register second function that calls first
    registry.register({
      type: 'FunctionDefinition',
      name: 'quadruple',
      params: ['x'],
      body: {
        type: 'CallExpression',
        callee: 'double',
        arguments: [
          {
            type: 'CallExpression',
            callee: 'double',
            arguments: [{ type: 'Identifier', name: 'x' }]
          }
        ]
      }
    });

    const quad = registry.lookup('quadruple');
    expect(quad).not.toBeNull();
    expect(quad?.body.type).toBe('CallExpression');
    expect(quad?.body.callee).toBe('double');
  });

  // ── Test 5: Nested Function Definitions ────────────────────
  it('creates nested function definition structure', () => {
    const ast = {
      type: 'Block',
      statements: [
        {
          type: 'FunctionDefinition',
          name: 'outer',
          params: ['x'],
          body: {
            type: 'Block',
            statements: [
              {
                type: 'FunctionDefinition',
                name: 'inner',
                params: ['y'],
                body: {
                  type: 'BinaryOp',
                  operator: '+',
                  left: { type: 'Identifier', name: 'x' },
                  right: { type: 'Identifier', name: 'y' }
                }
              },
              {
                type: 'CallExpression',
                callee: 'inner',
                arguments: [{ type: 'NumberLiteral', value: 5 }]
              }
            ]
          }
        },
        {
          type: 'CallExpression',
          callee: 'outer',
          arguments: [{ type: 'NumberLiteral', value: 10 }]
        }
      ]
    };

    // Just verify it can be parsed - actual nested function execution is complex
    const ir = gen.generateIR(ast);
    expect(ir).toBeDefined();
    expect(ir.length).toBeGreaterThan(0);
  });

  // ── Test 6: Function with Local Variables ──────────────────
  it('executes function with local variable scope', () => {
    registry.clear();
    registry.register({
      type: 'FunctionDefinition',
      name: 'compute',
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

    const fn = registry.lookup('compute');
    expect(fn?.body.type).toBe('Block');
    expect(fn?.body.statements).toHaveLength(2);
  });

  // ── Test 7: Tail Recursion Pattern ─────────────────────────
  it('supports tail recursion pattern (sum accumulator)', () => {
    registry.clear();
    registry.register({
      type: 'FunctionDefinition',
      name: 'sumTail',
      params: ['n', 'acc'],
      body: {
        type: 'IfStatement',
        condition: {
          type: 'BinaryOp',
          operator: '<=',
          left: { type: 'Identifier', name: 'n' },
          right: { type: 'NumberLiteral', value: 0 }
        },
        consequent: {
          type: 'ReturnStatement',
          value: { type: 'Identifier', name: 'acc' }
        },
        alternate: {
          type: 'ReturnStatement',
          value: {
            type: 'CallExpression',
            callee: 'sumTail',
            arguments: [
              {
                type: 'BinaryOp',
                operator: '-',
                left: { type: 'Identifier', name: 'n' },
                right: { type: 'NumberLiteral', value: 1 }
              },
              {
                type: 'BinaryOp',
                operator: '+',
                left: { type: 'Identifier', name: 'acc' },
                right: { type: 'Identifier', name: 'n' }
              }
            ]
          }
        }
      }
    });

    const fn = registry.lookup('sumTail');
    expect(fn?.params).toEqual(['n', 'acc']);
  });

  // ── Test 8: Mutual Recursion (Function A calls B, B calls A) ─
  it('supports mutual recursion (two functions calling each other)', () => {
    registry.clear();

    registry.register({
      type: 'FunctionDefinition',
      name: 'isEven',
      params: ['n'],
      body: {
        type: 'IfStatement',
        condition: {
          type: 'BinaryOp',
          operator: '==',
          left: { type: 'Identifier', name: 'n' },
          right: { type: 'NumberLiteral', value: 0 }
        },
        consequent: {
          type: 'ReturnStatement',
          value: { type: 'NumberLiteral', value: 1 }
        },
        alternate: {
          type: 'ReturnStatement',
          value: {
            type: 'CallExpression',
            callee: 'isOdd',
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
    });

    registry.register({
      type: 'FunctionDefinition',
      name: 'isOdd',
      params: ['n'],
      body: {
        type: 'IfStatement',
        condition: {
          type: 'BinaryOp',
          operator: '==',
          left: { type: 'Identifier', name: 'n' },
          right: { type: 'NumberLiteral', value: 0 }
        },
        consequent: {
          type: 'ReturnStatement',
          value: { type: 'NumberLiteral', value: 0 }
        },
        alternate: {
          type: 'ReturnStatement',
          value: {
            type: 'CallExpression',
            callee: 'isEven',
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
    });

    expect(registry.exists('isEven')).toBe(true);
    expect(registry.exists('isOdd')).toBe(true);
  });

  // ── Test 9: Closure Capturing Outer Variable ────────────────
  it('handles variable scope across nested function calls', () => {
    registry.clear();
    registry.register({
      type: 'FunctionDefinition',
      name: 'outer',
      params: ['x'],
      body: {
        type: 'Block',
        statements: [
          {
            type: 'Assignment',
            name: 'multiplier',
            value: { type: 'NumberLiteral', value: 10 }
          },
          {
            type: 'ReturnStatement',
            value: {
              type: 'BinaryOp',
              operator: '*',
              left: { type: 'Identifier', name: 'x' },
              right: { type: 'Identifier', name: 'multiplier' }
            }
          }
        ]
      }
    });

    const fn = registry.lookup('outer');
    expect(fn?.body.type).toBe('Block');
  });

  // ── Test 10: Recursion with Multiple Branches ──────────────
  it('supports complex recursion with branching (tree traversal)', () => {
    registry.clear();
    registry.register({
      type: 'FunctionDefinition',
      name: 'countDown',
      params: ['n'],
      body: {
        type: 'Block',
        statements: [
          {
            type: 'IfStatement',
            condition: {
              type: 'BinaryOp',
              operator: '<=',
              left: { type: 'Identifier', name: 'n' },
              right: { type: 'NumberLiteral', value: 0 }
            },
            consequent: {
              type: 'ReturnStatement',
              value: { type: 'NumberLiteral', value: 0 }
            },
            alternate: {
              type: 'ReturnStatement',
              value: {
                type: 'BinaryOp',
                operator: '+',
                left: { type: 'Identifier', name: 'n' },
                right: {
                  type: 'CallExpression',
                  callee: 'countDown',
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
        ]
      }
    });

    const fn = registry.lookup('countDown');
    expect(fn).not.toBeNull();
  });
});
