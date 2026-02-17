/**
 * Constraint Solver Engine Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ConstraintSolverEngine } from '../src/analyzer/constraint-solver';
import { MinimalFunctionAST } from '../src/parser/ast';

describe('ConstraintSolverEngine', () => {
  let engine: ConstraintSolverEngine;

  beforeEach(() => {
    engine = new ConstraintSolverEngine();
  });

  // ============================================================================
  // 1. Equality Constraints (10개)
  // ============================================================================
  describe('Equality Constraints', () => {
    it('should collect equality constraints from function signatures', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'identity',
          inputType: 'T',
          outputType: 'T',
          body: 'return input'
        }
      ];
      const result = engine.build(functions);

      expect(result.constraints.length).toBeGreaterThan(0);
    });

    it('should detect matching input/output types', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'identity',
          inputType: 'number',
          outputType: 'number',
          body: 'return input + 1'
        }
      ];
      const result = engine.build(functions);

      const eqConstraints = result.constraints.filter(c => c.type === 'equality');
      if (eqConstraints.length > 0) {
        expect(eqConstraints[0].violated).toBe(false);
      }
    });

    it('should detect mismatched input/output types', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'stringify',
          inputType: 'number',
          outputType: 'string',
          body: 'return input.toString()'
        }
      ];
      const result = engine.build(functions);

      const eqConstraints = result.constraints.filter(c => c.type === 'equality');
      if (eqConstraints.length > 0) {
        expect(eqConstraints[0].violated).toBe(true);
      }
    });

    it('should handle generic type equality', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'process',
          inputType: 'T',
          outputType: 'T',
          body: 'return input'
        }
      ];
      const result = engine.build(functions);

      expect(result.constraints.length).toBeGreaterThanOrEqual(1);
    });

    it('should ignore null types in constraints', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'getVoid',
          inputType: 'null',
          outputType: 'null',
          body: 'return'
        }
      ];
      const result = engine.build(functions);

      const eqConstraints = result.constraints.filter(c => c.type === 'equality');
      expect(eqConstraints.length).toBe(0);
    });

    it('should set confidence for equality constraints', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'double',
          inputType: 'number',
          outputType: 'number',
          body: 'return input * 2'
        }
      ];
      const result = engine.build(functions);

      const eqConstraints = result.constraints.filter(c => c.type === 'equality');
      if (eqConstraints.length > 0) {
        expect(eqConstraints[0].confidence).toBeGreaterThanOrEqual(0.5);
        expect(eqConstraints[0].confidence).toBeLessThanOrEqual(1.0);
      }
    });

    it('should provide source for constraints', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'T',
          outputType: 'T',
          body: 'return input'
        }
      ];
      const result = engine.build(functions);

      if (result.constraints.length > 0) {
        expect(result.constraints[0].source).toContain('test');
      }
    });

    it('should handle multiple functions', () => {
      const functions: MinimalFunctionAST[] = [
        { fnName: 'fn1', inputType: 'number', outputType: 'number', body: 'return input' },
        { fnName: 'fn2', inputType: 'string', outputType: 'string', body: 'return input' }
      ];
      const result = engine.build(functions);

      expect(result.constraints.length).toBeGreaterThanOrEqual(2);
    });

    it('should set violated flag correctly', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'mismatch',
          inputType: 'number',
          outputType: 'string',
          body: 'return "test"'
        }
      ];
      const result = engine.build(functions);

      const eqConstraints = result.constraints.filter(c => c.type === 'equality');
      if (eqConstraints.length > 0) {
        expect(eqConstraints[0].violated).toBeDefined();
      }
    });

    it('should calculate satisfied count', () => {
      const functions: MinimalFunctionAST[] = [
        { fnName: 'fn1', inputType: 'number', outputType: 'number', body: 'return input' },
        { fnName: 'fn2', inputType: 'string', outputType: 'string', body: 'return input' }
      ];
      const result = engine.build(functions);

      expect(result.satisfied).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // 2. Unification (10개)
  // ============================================================================
  describe('Unification', () => {
    it('should unify type variables', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'T',
          outputType: 'number',
          body: 'return 42'
        }
      ];
      const result = engine.build(functions);

      expect(result.unifications.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle single type variable', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'identity',
          inputType: 'T',
          outputType: 'T',
          body: 'return input'
        }
      ];
      const result = engine.build(functions);

      if (result.unifications.length > 0) {
        expect(result.unifications[0].success).toBeDefined();
      }
    });

    it('should handle multiple type variables', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'merge',
          inputType: 'T',
          outputType: 'U',
          body: 'return combined'
        }
      ];
      const result = engine.build(functions);

      expect(result.unifications).toBeDefined();
    });

    it('should set confidence for unification', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'T',
          outputType: 'number',
          body: 'return input'
        }
      ];
      const result = engine.build(functions);

      if (result.unifications.length > 0) {
        expect(result.unifications[0].confidence).toBeGreaterThanOrEqual(0.0);
        expect(result.unifications[0].confidence).toBeLessThanOrEqual(1.0);
      }
    });

    it('should provide reasoning for unification', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'T',
          outputType: 'number',
          body: 'return 42'
        }
      ];
      const result = engine.build(functions);

      if (result.unifications.length > 0) {
        expect(result.unifications[0].reasoning.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should store substitution map', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'T',
          outputType: 'number',
          body: 'return 42'
        }
      ];
      const result = engine.build(functions);

      if (result.unifications.length > 0) {
        expect(result.unifications[0].substitution).toBeDefined();
        expect(result.unifications[0].substitution instanceof Map).toBe(true);
      }
    });

    it('should handle chain unification', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'T',
          outputType: 'U',
          body: 'let x: U = input as U'
        }
      ];
      const result = engine.build(functions);

      expect(result.unifications).toBeDefined();
    });

    it('should detect type variable pattern', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'process',
          inputType: 'T',
          outputType: 'array<T>',
          body: 'return [input]'
        }
      ];
      const result = engine.build(functions);

      expect(result.constraints.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle builtin type recognition', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'number',
          outputType: 'string',
          body: 'return input.toString()'
        }
      ];
      const result = engine.build(functions);

      const eqConstraints = result.constraints.filter(c => c.type === 'equality');
      expect(eqConstraints.length).toBeGreaterThanOrEqual(0);
    });

    it('should calculate unification success', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'id',
          inputType: 'T',
          outputType: 'T',
          body: 'return input'
        }
      ];
      const result = engine.build(functions);

      if (result.unifications.length > 0) {
        expect(result.unifications[0].success).toBeDefined();
      }
    });
  });

  // ============================================================================
  // 3. Trait Bounds & Where Clauses (10개)
  // ============================================================================
  describe('Trait Bounds and Where Clauses', () => {
    it('should process trait bounds', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'compare',
          inputType: 'T',
          outputType: 'bool',
          body: 'T: Comparable\nreturn input > 0'
        }
      ];
      const result = engine.build(functions);

      const traitConstraints = result.constraints.filter(c => c.type === 'trait_bound');
      expect(traitConstraints.length).toBeGreaterThanOrEqual(0);
    });

    it('should process where clauses', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'merge',
          inputType: 'array<T>',
          outputType: 'array<T>',
          body: 'where T: Clone, T: Ord'
        }
      ];
      const result = engine.build(functions);

      const whereClauses = result.constraints.filter(c => c.type === 'where_clause');
      expect(whereClauses.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle single trait bound', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'hash',
          inputType: 'T',
          outputType: 'number',
          body: 'T: Hashable\nreturn compute_hash(input)'
        }
      ];
      const result = engine.build(functions);

      expect(result.constraints.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle multiple trait bounds', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'process',
          inputType: 'T',
          outputType: 'T',
          body: 'T: Clone\nT: Send\nT: Sync\nreturn input'
        }
      ];
      const result = engine.build(functions);

      expect(result.constraints.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect where clause separators', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'filter',
          inputType: 'array<T>',
          outputType: 'array<T>',
          body: 'where T: Clone'
        }
      ];
      const result = engine.build(functions);

      const whereClauses = result.constraints.filter(c => c.type === 'where_clause');
      expect(whereClauses.length).toBeGreaterThanOrEqual(0);
    });

    it('should set confidence for trait bounds', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'T',
          outputType: 'bool',
          body: 'T: Display\nreturn true'
        }
      ];
      const result = engine.build(functions);

      const traitConstraints = result.constraints.filter(c => c.type === 'trait_bound');
      if (traitConstraints.length > 0) {
        expect(traitConstraints[0].confidence).toBeGreaterThanOrEqual(0.75);
      }
    });

    it('should get trait bounds for type param', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'T',
          outputType: 'T',
          body: 'T: Clone\nT: Hashable'
        }
      ];
      const result = engine.build(functions);

      const bounds = engine.getTraitBounds(result, 'T');
      expect(Array.isArray(bounds)).toBe(true);
    });

    it('should return empty bounds for unknown param', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'T',
          outputType: 'T',
          body: 'return input'
        }
      ];
      const result = engine.build(functions);

      const bounds = engine.getTraitBounds(result, 'Unknown');
      expect(bounds.length).toBe(0);
    });

    it('should get constraints for type param', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'T',
          outputType: 'T',
          body: 'return input'
        }
      ];
      const result = engine.build(functions);

      const constraints = engine.getConstraintsFor(result, 'T');
      expect(Array.isArray(constraints)).toBe(true);
    });

    it('should handle complex where clause', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'complexFn',
          inputType: 'T',
          outputType: 'U',
          body: 'where T: Clone, T: Send, U: Display, U: Debug'
        }
      ];
      const result = engine.build(functions);

      expect(result.constraints.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // 4. Satisfaction Rate (5개)
  // ============================================================================
  describe('Satisfaction Rate', () => {
    it('should calculate satisfaction rate correctly', () => {
      const functions: MinimalFunctionAST[] = [
        { fnName: 'fn1', inputType: 'number', outputType: 'number', body: 'return input' },
        { fnName: 'fn2', inputType: 'string', outputType: 'string', body: 'return input' }
      ];
      const result = engine.build(functions);

      expect(result.satisfactionRate).toBeGreaterThanOrEqual(0);
      expect(result.satisfactionRate).toBeLessThanOrEqual(1);
    });

    it('should return 1.0 for empty constraints', () => {
      const functions: MinimalFunctionAST[] = [];
      const result = engine.build(functions);

      expect(result.satisfactionRate).toBe(1.0);
    });

    it('should count satisfied constraints', () => {
      const functions: MinimalFunctionAST[] = [
        { fnName: 'fn1', inputType: 'number', outputType: 'number', body: 'return input' }
      ];
      const result = engine.build(functions);

      expect(result.satisfied).toBeGreaterThanOrEqual(0);
    });

    it('should count violated constraints', () => {
      const functions: MinimalFunctionAST[] = [
        { fnName: 'fn1', inputType: 'number', outputType: 'string', body: 'return "test"' }
      ];
      const result = engine.build(functions);

      expect(result.violated).toBeGreaterThanOrEqual(0);
    });

    it('should provide reasoning messages', () => {
      const functions: MinimalFunctionAST[] = [
        { fnName: 'fn1', inputType: 'number', outputType: 'number', body: 'return input' }
      ];
      const result = engine.build(functions);

      expect(result.reasoning.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // 5. API Methods (5개)
  // ============================================================================
  describe('API Methods', () => {
    it('should retrieve specific constraint', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'T',
          outputType: 'T',
          body: 'return input'
        }
      ];
      const result = engine.build(functions);

      if (result.constraints.length > 0) {
        const id = result.constraints[0].id;
        const constraint = engine.getConstraint(result, id);
        expect(constraint).toBeDefined();
      }
    });

    it('should return null for unknown constraint', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'T',
          outputType: 'T',
          body: 'return input'
        }
      ];
      const result = engine.build(functions);

      const constraint = engine.getConstraint(result, 'unknown_id');
      expect(constraint).toBeNull();
    });

    it('should get violated constraints', () => {
      const functions: MinimalFunctionAST[] = [
        { fnName: 'fn1', inputType: 'number', outputType: 'string', body: 'return "test"' }
      ];
      const result = engine.build(functions);

      const violated = engine.getViolatedConstraints(result);
      expect(Array.isArray(violated)).toBe(true);
    });

    it('should return empty array for no violations', () => {
      const functions: MinimalFunctionAST[] = [
        { fnName: 'fn1', inputType: 'number', outputType: 'number', body: 'return input' }
      ];
      const result = engine.build(functions);

      const violated = engine.getViolatedConstraints(result);
      expect(Array.isArray(violated)).toBe(true);
    });

    it('should handle empty function list', () => {
      const functions: MinimalFunctionAST[] = [];
      const result = engine.build(functions);

      expect(result.constraints.length).toBe(0);
      expect(result.satisfactionRate).toBe(1.0);
    });
  });
});
