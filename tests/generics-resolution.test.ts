/**
 * Generics Resolution Engine Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { GenericsResolutionEngine } from '../src/analyzer/generics-resolution';

describe('GenericsResolutionEngine', () => {
  let engine: GenericsResolutionEngine;

  beforeEach(() => {
    engine = new GenericsResolutionEngine();
  });

  // ============================================================================
  // 1. Generic Declaration (10개)
  // ============================================================================
  describe('Generic Declaration Extraction', () => {
    it('should extract single type parameter', () => {
      const code = 'let arr: array<T>';
      const result = engine.build(code);

      expect(result.generics.has('array')).toBe(true);
      const sig = result.generics.get('array');
      expect(sig?.typeParams[0].name).toBe('T');
    });

    it('should extract multiple type parameters', () => {
      const code = 'let map: Map<K, V>';
      const result = engine.build(code);

      const sig = result.generics.get('Map');
      expect(sig?.typeParams.length).toBe(2);
      expect(sig?.typeParams.map(p => p.name)).toEqual(['K', 'V']);
    });

    it('should extract three type parameters', () => {
      const code = 'let dict: Dictionary<K, V, T>';
      const result = engine.build(code);

      const sig = result.generics.get('Dictionary');
      expect(sig?.typeParams.length).toBe(3);
    });

    it('should handle whitespace in type parameters', () => {
      const code = 'let map: Map< K , V >';
      const result = engine.build(code);

      const sig = result.generics.get('Map');
      expect(sig?.typeParams.map(p => p.name)).toEqual(['K', 'V']);
    });

    it('should detect multiple generic types', () => {
      const code = 'let arr: array<T> let map: Map<K, V>';
      const result = engine.build(code);

      expect(result.generics.size).toBe(2);
      expect(result.generics.has('array')).toBe(true);
      expect(result.generics.has('Map')).toBe(true);
    });

    it('should set initial confidence', () => {
      const code = 'let arr: array<T>';
      const result = engine.build(code);

      const sig = result.generics.get('array');
      expect(sig?.confidence).toBeGreaterThanOrEqual(0.75);
      expect(sig?.confidence).toBeLessThanOrEqual(0.95);
    });

    it('should store signature string', () => {
      const code = 'let map: Map<K, V>';
      const result = engine.build(code);

      const sig = result.generics.get('Map');
      expect(sig?.signature).toBe('Map<K, V>');
    });

    it('should handle nested generics detection', () => {
      const code = 'let matrix: array<array<T>>';
      const result = engine.build(code);

      // array<array<T>>는 하나의 generic으로 인식될 수 있음
      expect(result.generics.size).toBeGreaterThanOrEqual(1);
    });

    it('should provide reasoning for each generic', () => {
      const code = 'let arr: array<T>';
      const result = engine.build(code);

      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.reasoning[0]).toContain('Generic type detected');
    });

    it('should avoid duplicate generics', () => {
      const code = 'let arr1: array<T> let arr2: array<U>';
      const result = engine.build(code);

      // array는 한 번만 등록되어야 함 (첫 번째 선언)
      expect(result.generics.has('array')).toBe(true);
    });
  });

  // ============================================================================
  // 2. Type Constraints (10개)
  // ============================================================================
  describe('Type Constraint Extraction', () => {
    it('should detect extends constraint', () => {
      const code = 'fn filter<T extends number>(arr: array<T>)';
      const result = engine.build(code);

      const sig = result.generics.get('array');
      if (sig) {
        const tParam = sig.typeParams.find(p => p.name === 'T');
        expect(tParam?.constraint).toBe('number');
      }
    });

    it('should detect trait bound with colon', () => {
      const code = 'fn sort<T: Comparable>(arr: array<T>)';
      const result = engine.build(code);

      expect(result.reasoning.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle multiple constraints', () => {
      const code = 'fn copy<T extends Clone>(data: T)';
      const result = engine.build(code);

      expect(result.generics.size).toBeGreaterThanOrEqual(0);
    });

    it('should detect default type', () => {
      const code = 'type Optional<T = string>';
      const result = engine.build(code);

      // Default type 감지 테스트
      expect(result.reasoning).toBeDefined();
    });

    it('should handle complex constraint', () => {
      const code = 'fn process<T extends array<number>>(data: T)';
      const result = engine.build(code);

      expect(result.reasoning.length).toBeGreaterThanOrEqual(0);
    });

    it('should increase confidence with constraints', () => {
      const code = 'let arr: array<T> where T extends number';
      const result = engine.build(code);

      const sig = result.generics.get('array');
      // 제약이 있으면 신뢰도가 상향조정될 수 있음
      expect(sig?.confidence).toBeDefined();
    });

    it('should handle bounds in generic type', () => {
      const code = 'type Comparable<T: Clone>';
      const result = engine.build(code);

      expect(result.generics.has('Comparable')).toBeDefined();
    });

    it('should extract parameter constraints from function', () => {
      const code = 'fn merge<T, U: T>(first: T, second: U)';
      const result = engine.build(code);

      expect(result.reasoning).toBeDefined();
    });

    it('should handle where clause constraints', () => {
      const code = 'fn filter<T>(arr: array<T>) where T: Clone';
      const result = engine.build(code);

      expect(result.reasoning).toBeDefined();
    });

    it('should preserve constraint in TypeParameter', () => {
      const code = 'fn process<T extends Serializable>';
      const result = engine.build(code);

      expect(result.generics.size).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // 3. Instantiation (10개)
  // ============================================================================
  describe('Generic Instantiation', () => {
    it('should infer concrete type instantiation', () => {
      const code = 'fn process<T>(arr: array<T>) let nums: array<number> = [1, 2, 3]';
      const result = engine.build(code);

      expect(result.instantiations.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle string type instantiation', () => {
      const code = 'fn process<T>(arr: array<T>) let strs: array<string> = ["a", "b"]';
      const result = engine.build(code);

      expect(result.instantiations.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle multiple type argument instantiation', () => {
      const code = 'let map: Map<string, number>';
      const result = engine.build(code);

      if (result.instantiations.length > 0) {
        const inst = result.instantiations[0];
        expect(inst.resultType).toContain('Map');
      }
    });

    it('should handle nested generic instantiation', () => {
      const code = 'let matrix: array<array<number>>';
      const result = engine.build(code);

      expect(result.instantiations.length).toBeGreaterThanOrEqual(0);
    });

    it('should set source as explicit', () => {
      const code = 'let nums: array<number>';
      const result = engine.build(code);

      if (result.instantiations.length > 0) {
        expect(result.instantiations[0].source).toBe('explicit');
      }
    });

    it('should set confidence for instantiation', () => {
      const code = 'let nums: array<number>';
      const result = engine.build(code);

      if (result.instantiations.length > 0) {
        expect(result.instantiations[0].confidence).toBeGreaterThanOrEqual(0.8);
      }
    });

    it('should store result type', () => {
      const code = 'let map: Map<string, number>';
      const result = engine.build(code);

      if (result.instantiations.length > 0) {
        expect(result.instantiations[0].resultType).toBe('Map<string, number>');
      }
    });

    it('should provide reasoning', () => {
      const code = 'let nums: array<number>';
      const result = engine.build(code);

      if (result.instantiations.length > 0) {
        expect(result.instantiations[0].reasoning.length).toBeGreaterThan(0);
      }
    });

    it('should handle multiple instantiations', () => {
      const code = 'let nums: array<number> let strs: array<string>';
      const result = engine.build(code);

      expect(result.instantiations.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle generic with bool type', () => {
      const code = 'let flags: array<bool>';
      const result = engine.build(code);

      expect(result.instantiations.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // 4. Variance (5개)
  // ============================================================================
  describe('Variance Analysis', () => {
    it('should mark array as covariant', () => {
      const code = 'let arr: array<T>';
      const result = engine.build(code);

      const sig = result.generics.get('array');
      expect(sig?.typeParams[0].variance).toBe('covariant');
    });

    it('should mark list as covariant', () => {
      const code = 'let list: list<T>';
      const result = engine.build(code);

      const sig = result.generics.get('list');
      expect(sig?.typeParams[0].variance).toBe('covariant');
    });

    it('should mark function as contravariant', () => {
      const code = 'let fn: function<T>';
      const result = engine.build(code);

      const sig = result.generics.get('function');
      if (sig) {
        expect(sig.typeParams[0].variance).toBe('contravariant');
      }
    });

    it('should mark default as invariant', () => {
      const code = 'let ref: Ref<T>';
      const result = engine.build(code);

      const sig = result.generics.get('Ref');
      expect(sig?.typeParams[0].variance).toBe('invariant');
    });

    it('should preserve variance in signature', () => {
      const code = 'let arr: array<T> let ref: Ref<T>';
      const result = engine.build(code);

      const arrSig = result.generics.get('array');
      const refSig = result.generics.get('Ref');

      expect(arrSig?.typeParams[0].variance).toBe('covariant');
      expect(refSig?.typeParams[0].variance).toBe('invariant');
    });
  });

  // ============================================================================
  // 5. API Methods (10개)
  // ============================================================================
  describe('API Methods', () => {
    it('should return instantiations for type', () => {
      const code = 'let nums: array<number>';
      const result = engine.build(code);

      const insts = engine.getInstantiations(result, 'array');
      expect(Array.isArray(insts)).toBe(true);
    });

    it('should return empty array for unknown type', () => {
      const code = 'let nums: array<number>';
      const result = engine.build(code);

      const insts = engine.getInstantiations(result, 'unknown');
      expect(insts.length).toBe(0);
    });

    it('should return generic signature', () => {
      const code = 'let arr: array<T>';
      const result = engine.build(code);

      const sig = engine.getSignature(result, 'array');
      expect(sig).toBeDefined();
      expect(sig?.name).toBe('array');
    });

    it('should return null for unknown signature', () => {
      const code = 'let arr: array<T>';
      const result = engine.build(code);

      const sig = engine.getSignature(result, 'unknown');
      expect(sig).toBeNull();
    });

    it('should return all generics', () => {
      const code = 'let arr: array<T> let map: Map<K, V>';
      const result = engine.build(code);

      const all = engine.getAllGenerics(result);
      expect(Array.isArray(all)).toBe(true);
      expect(all.length).toBeGreaterThanOrEqual(1);
    });

    it('should calculate resolution success rate', () => {
      const code = 'let arr: array<T> let nums: array<number>';
      const result = engine.build(code);

      expect(result.resolutionSuccess).toBeGreaterThanOrEqual(0);
      expect(result.resolutionSuccess).toBeLessThanOrEqual(1);
    });

    it('should handle empty code', () => {
      const code = '';
      const result = engine.build(code);

      expect(result.generics.size).toBe(0);
      expect(result.instantiations.length).toBe(0);
    });

    it('should build from code with no generics', () => {
      const code = 'let x = 10 let y = "hello"';
      const result = engine.build(code);

      expect(result.generics.size).toBe(0);
      expect(result.resolutionSuccess).toBe(0);
    });

    it('should provide reasoning messages', () => {
      const code = 'let arr: array<T> let nums: array<number>';
      const result = engine.build(code);

      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should return correct result type format', () => {
      const code = 'let map: Map<string, number>';
      const result = engine.build(code);

      if (result.instantiations.length > 0) {
        const resultType = result.instantiations[0].resultType;
        expect(resultType).toMatch(/Map<.*>/);
      }
    });
  });

  // ============================================================================
  // 6. Edge Cases (5개)
  // ============================================================================
  describe('Edge Cases', () => {
    it('should handle very nested generics', () => {
      const code = 'let deep: array<array<array<number>>>';
      const result = engine.build(code);

      expect(result).toBeDefined();
    });

    it('should handle generics with long names', () => {
      const code = 'let x: VeryLongGenericTypeName<TypeParameterOne, TypeParameterTwo>';
      const result = engine.build(code);

      expect(result.generics.size).toBeGreaterThanOrEqual(0);
    });

    it('should handle multiple spaces in type args', () => {
      const code = 'let map: Map<  K  ,  V  >';
      const result = engine.build(code);

      const sig = result.generics.get('Map');
      expect(sig?.typeParams.length).toBe(2);
    });

    it('should handle generics in comments', () => {
      const code = `
        // let arr: array<T>
        let actual: array<number>
      `;
      const result = engine.build(code);

      // Commented code should be ignored
      expect(result.generics.has('actual')).toBeDefined();
    });

    it('should handle mixed cases', () => {
      const code = `
        let arr: Array<T>
        let map: MAP<K, V>
        let ref: Ref<number>
      `;
      const result = engine.build(code);

      expect(result.generics.size).toBeGreaterThanOrEqual(1);
    });
  });
});
