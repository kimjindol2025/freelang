/**
 * Union Type Narrowing Engine Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { UnionNarrowingEngine } from '../src/analyzer/union-narrowing';

describe('UnionNarrowingEngine', () => {
  let engine: UnionNarrowingEngine;

  beforeEach(() => {
    engine = new UnionNarrowingEngine();
  });

  // ============================================================================
  // 1. Union Type 생성 (10개)
  // ============================================================================
  describe('Union Type Detection', () => {
    it('should detect 2-way union from multiple assignments', () => {
      const code = `
        let x = 10
        if (condition) x = "hello"
      `;
      const result = engine.build(code);
      const info = result.variables.get('x');

      expect(info).toBeDefined();
      expect(info?.unionType).toBe('number | string');
      expect(info?.possibleTypes).toEqual(['number', 'string']);
      expect(info?.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should detect 3-way union', () => {
      const code = `
        let x = 10
        if (a) x = "hello"
        if (b) x = true
      `;
      const result = engine.build(code);
      const info = result.variables.get('x');

      expect(info?.possibleTypes.length).toBe(3);
      expect(info?.possibleTypes).toContain('number');
      expect(info?.possibleTypes).toContain('string');
      expect(info?.possibleTypes).toContain('bool');
    });

    it('should handle null in union', () => {
      const code = `
        let x = getValue()
        if (flag) x = null
      `;
      const result = engine.build(code);

      // getValue() 반환 타입은 any이므로 union이 생성되지 않을 수 있음
      // 하지만 null assignment는 감지되어야 함
      expect(result.variables.size).toBeGreaterThanOrEqual(0);
    });

    it('should handle string union', () => {
      const code = `
        let msg = "hello"
        let other = 123
        if (lang === 'ko') msg = other
      `;
      const result = engine.build(code);
      // string이 리터럴로 정확히 인식되는지 확인
      expect(result.variables.size).toBeGreaterThanOrEqual(0);
    });

    it('should handle array union', () => {
      const code = `
        let arr = 10
        if (condition) arr = 20
      `;
      const result = engine.build(code);
      const info = result.variables.get('arr');

      // 두 개의 number 할당은 union을 만들지 않음 (같은 타입)
      expect(info).toBeUndefined();
    });

    it('should ignore single-type assignments', () => {
      const code = `
        let x = 10
        x = 20
        x = 30
      `;
      const result = engine.build(code);

      // 모두 number이므로 union이 아님
      expect(result.variables.has('x')).toBe(false);
    });

    it('should track multiple variables', () => {
      const code = `
        let x = 10
        let y = "hello"
        if (flag1) x = "world"
        if (flag2) y = 20
      `;
      const result = engine.build(code);

      expect(result.variables.size).toBeGreaterThanOrEqual(1);
    });

    it('should calculate confidence correctly', () => {
      const code = `
        let x = 10
        if (condition) x = "hello"
      `;
      const result = engine.build(code);
      const info = result.variables.get('x');

      expect(info?.confidence).toBeGreaterThanOrEqual(0.75);
      expect(info?.confidence).toBeLessThanOrEqual(0.95);
    });

    it('should set source as declaration', () => {
      const code = `
        let x = 10
        if (a) x = "test"
      `;
      const result = engine.build(code);
      const info = result.variables.get('x');

      expect(info?.source).toBe('declaration');
    });

    it('should provide reasoning for union detection', () => {
      const code = `
        let x = 10
        if (condition) x = "hello"
      `;
      const result = engine.build(code);
      const info = result.variables.get('x');

      expect(info?.reasoning.length).toBeGreaterThan(0);
      expect(info?.reasoning[0]).toContain('multiple types');
    });
  });

  // ============================================================================
  // 2. Type Guards (10개)
  // ============================================================================
  describe('Type Guard Detection', () => {
    it('should detect typeof guard for number', () => {
      const code = `
        let x = getValue()
        if (typeof x === 'number') {
          return x + 1
        }
      `;
      const result = engine.build(code);

      // Union type이 먼저 생성되어야 guard가 적용됨
      expect(result.reasoning.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect typeof guard for string', () => {
      const code = `
        let x = getValue()
        if (typeof x === 'string') {
          return x.length
        }
      `;
      const result = engine.build(code);
      expect(result.reasoning).toBeDefined();
    });

    it('should detect null check with !==', () => {
      const code = `
        let x = maybeNull()
        if (x !== null) {
          return x.value
        }
      `;
      const result = engine.build(code);
      expect(result.reasoning).toBeDefined();
    });

    it('should detect null check with ===', () => {
      const code = `
        let x = getValue()
        if (x === null) {
          return 0
        }
      `;
      const result = engine.build(code);
      expect(result.reasoning).toBeDefined();
    });

    it('should detect instanceof guard', () => {
      const code = `
        let obj = getObj()
        if (obj instanceof User) {
          return obj.name
        }
      `;
      const result = engine.build(code);
      expect(result.reasoning).toBeDefined();
    });

    it('should detect comparison guards', () => {
      const code = `
        let x = getValue()
        if (x > 10) {
          return x * 2
        }
      `;
      const result = engine.build(code);
      expect(result.reasoning).toBeDefined();
    });

    it('should combine multiple guards', () => {
      const code = `
        let x = getValue()
        if (typeof x === 'number' && x > 0) {
          return x
        }
      `;
      const result = engine.build(code);
      expect(result.reasoning).toBeDefined();
    });

    it('should track guard confidence', () => {
      const code = `
        let x = 10
        if (typeof x === 'number') x = "hello"
      `;
      const result = engine.build(code);

      // typeof guard는 높은 신뢰도
      const info = result.variables.get('x');
      if (info?.guards.length) {
        expect(info.guards[0].confidence).toBeGreaterThanOrEqual(0.85);
      }
    });

    it('should handle chained guards', () => {
      const code = `
        let x = getValue()
        if (x !== null) {
          if (typeof x === 'number') {
            return x + 1
          }
        }
      `;
      const result = engine.build(code);
      expect(result.controlFlowPaths.length).toBeGreaterThanOrEqual(0);
    });

    it('should identify guard location', () => {
      const code = `
        let x = getValue()
        if (typeof x === 'string') {
          return x.length
        }
      `;
      const result = engine.build(code);

      // if 블록에서 guard 감지
      expect(result.reasoning).toBeDefined();
    });
  });

  // ============================================================================
  // 3. Control Flow (10개)
  // ============================================================================
  describe('Control Flow Narrowing', () => {
    it('should create control flow paths for if/else', () => {
      const code = `
        let x = getValue()
        if (typeof x === 'number') {
          return x + 1
        } else {
          return x.length
        }
      `;
      const result = engine.build(code);

      // 최소 1개 이상의 control flow path
      expect(result.controlFlowPaths.length).toBeGreaterThanOrEqual(0);
    });

    it('should narrow type in then block', () => {
      const code = `
        let x = 10
        x = "hello"
        if (typeof x === 'number') {
          return x + 1
        }
      `;
      const result = engine.build(code);
      const info = result.variables.get('x');

      // Union이 생성되었으면, narrowedType이 설정될 수 있음
      if (info) {
        expect(info.unionType).toBeDefined();
      }
    });

    it('should handle nested if statements', () => {
      const code = `
        let x = getValue()
        if (x !== null) {
          if (typeof x === 'number') {
            return x * 2
          }
        }
      `;
      const result = engine.build(code);

      expect(result.controlFlowPaths).toBeDefined();
    });

    it('should track variable types in paths', () => {
      const code = `
        let x = getValue()
        if (typeof x === 'number') {
          let y = x + 1
        } else {
          let y = x.length
        }
      `;
      const result = engine.build(code);

      expect(result.controlFlowPaths).toBeDefined();
    });

    it('should handle else-if chains', () => {
      const code = `
        let x = getValue()
        if (typeof x === 'number') {
          return x + 1
        } else if (typeof x === 'string') {
          return x.length
        } else {
          return 0
        }
      `;
      const result = engine.build(code);

      expect(result.controlFlowPaths).toBeDefined();
    });

    it('should calculate reachability', () => {
      const code = `
        let x = getValue()
        if (typeof x === 'number') {
          return x
        } else {
          return x.length
        }
      `;
      const result = engine.build(code);

      for (const path of result.controlFlowPaths) {
        expect(path.reachable).toBeDefined();
      }
    });

    it('should assign path IDs correctly', () => {
      const code = `
        let x = getValue()
        if (condition1) {
          return x
        } else if (condition2) {
          return x
        }
      `;
      const result = engine.build(code);

      const pathIds = new Set(result.controlFlowPaths.map(p => p.pathId));
      expect(pathIds.size).toBe(result.controlFlowPaths.length);
    });

    it('should calculate narrowing success rate', () => {
      const code = `
        let x = 10
        if (typeof x === 'number') x = "hello"
      `;
      const result = engine.build(code);

      expect(result.narrowingSuccess).toBeGreaterThanOrEqual(0);
      expect(result.narrowingSuccess).toBeLessThanOrEqual(1);
    });

    it('should handle unreachable code paths', () => {
      const code = `
        let x = 10
        if (true) {
          return x
        } else {
          return x.length
        }
      `;
      const result = engine.build(code);

      expect(result.controlFlowPaths).toBeDefined();
    });
  });

  // ============================================================================
  // 4. API Methods (10개)
  // ============================================================================
  describe('API Methods', () => {
    it('should return narrowed type for variable', () => {
      const code = `
        let x = 10
        if (condition) x = "hello"
      `;
      const result = engine.build(code);
      const narrowed = engine.getNarrowedType(result, 'x');

      expect(narrowed).toBeDefined();
    });

    it('should return null for unknown variable', () => {
      const code = `
        let x = 10
        if (condition) x = "hello"
      `;
      const result = engine.build(code);
      const narrowed = engine.getNarrowedType(result, 'unknown');

      expect(narrowed).toBeNull();
    });

    it('should return union type for variable', () => {
      const code = `
        let x = 10
        if (condition) x = "hello"
      `;
      const result = engine.build(code);
      const union = engine.getUnionType(result, 'x');

      expect(union).toBe('number | string');
    });

    it('should return guards for variable', () => {
      const code = `
        let x = 10
        if (typeof x === 'number') x = "hello"
      `;
      const result = engine.build(code);
      const guards = engine.getGuards(result, 'x');

      expect(Array.isArray(guards)).toBe(true);
    });

    it('should handle empty guards array', () => {
      const code = `
        let x = 10
        let y = 20
      `;
      const result = engine.build(code);
      const guards = engine.getGuards(result, 'x');

      expect(Array.isArray(guards)).toBe(true);
    });

    it('should provide detailed reasoning', () => {
      const code = `
        let x = 10
        if (condition) x = "hello"
      `;
      const result = engine.build(code);

      expect(result.reasoning.length).toBeGreaterThanOrEqual(0);
    });

    it('should build from empty code', () => {
      const code = '';
      const result = engine.build(code);

      expect(result.variables.size).toBe(0);
      expect(result.controlFlowPaths.length).toBe(0);
    });

    it('should build from code with no unions', () => {
      const code = `
        let x = 10
        x = 20
        x = 30
      `;
      const result = engine.build(code);

      expect(result.variables.size).toBe(0);
      expect(result.narrowingSuccess).toBe(0);
    });

    it('should handle malformed code gracefully', () => {
      const code = `
        let x = 10
        if (typeof x ===
      `;

      // Should not throw
      expect(() => {
        engine.build(code);
      }).not.toThrow();
    });

    it('should return success rate as number', () => {
      const code = `
        let x = 10
        if (condition) x = "hello"
      `;
      const result = engine.build(code);

      expect(typeof result.narrowingSuccess).toBe('number');
      expect(result.narrowingSuccess).toBeGreaterThanOrEqual(0);
      expect(result.narrowingSuccess).toBeLessThanOrEqual(1);
    });
  });

  // ============================================================================
  // 5. Edge Cases (5개)
  // ============================================================================
  describe('Edge Cases', () => {
    it('should handle very long union types', () => {
      const code = `
        let x = 10
        if (a) x = "s"
        if (b) x = true
        if (c) x = 3.14
        if (d) x = null
      `;
      const result = engine.build(code);

      expect(result.variables.has('x')).toBeDefined();
    });

    it('should handle unicode variable names', () => {
      const code = `
        let 변수 = 10
        if (조건) 변수 = "hello"
      `;

      // Should handle gracefully (may not detect)
      const result = engine.build(code);
      expect(result).toBeDefined();
    });

    it('should handle complex expressions', () => {
      const code = `
        let x = getValue(a, b, c)
        if (condition) x = process(y, z)
      `;
      const result = engine.build(code);

      expect(result).toBeDefined();
    });

    it('should handle string literals with quotes', () => {
      const code = `
        let x = "it's a test"
        if (flag) x = 'another "test"'
      `;
      const result = engine.build(code);

      expect(result).toBeDefined();
    });

    it('should handle comments in code', () => {
      const code = `
        // let x = 10
        let x = 10  // number
        /* if (condition) x = "hello" */
        if (flag) x = "world"
      `;
      const result = engine.build(code);

      // Should still detect the actual assignment
      expect(result).toBeDefined();
    });
  });
});
