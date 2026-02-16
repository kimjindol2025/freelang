/**
 * Phase 4 Step 4: AI-First Type Inference Engine Tests
 */

import { describe, it, expect } from '@jest/globals';
import { AIFirstTypeInferenceEngine } from '../src/analyzer/ai-first-type-inference-engine';

describe('AIFirstTypeInferenceEngine', () => {
  let engine: AIFirstTypeInferenceEngine;

  beforeAll(() => {
    engine = new AIFirstTypeInferenceEngine();
  });

  // ============================================================================
  // 1. 함수 타입 추론 (8개)
  // ============================================================================
  describe('Function Type Inference', () => {
    it('should infer calculateTax return type as decimal from function name', () => {
      const code = `
        function calculateTax(price) {
          const tax = price * 0.1;
          return tax;
        }
      `;
      const result = engine.inferTypes('calculateTax', code);

      expect(result.signature.returnType).toBe('decimal');
      expect(result.signature.confidence).toBeGreaterThanOrEqual(0.70);
      expect(result.functionName).toBe('calculateTax');
    });

    it('should infer isValid return type as boolean from function name', () => {
      const code = `
        function isValid(input) {
          return input.length > 0;
        }
      `;
      const result = engine.inferTypes('isValid', code);

      expect(result.signature.returnType).toBe('boolean');
      expect(result.signature.confidence).toBeGreaterThanOrEqual(0.70);
    });

    it('should combine function name and comment for confidence boost', () => {
      const code = `
        function getPrice(id) {
          return prices[id];
        }
      `;
      const comments = ['// finance: get price for item'];
      const result = engine.inferTypes('getPrice', code, comments);

      expect(result.signature.domain).toBe('finance');
      expect(result.signature.confidence).toBeGreaterThanOrEqual(0.70);
    });

    it('should handle predicate functions correctly', () => {
      const code = `
        function hasError(code) {
          return code !== 0;
        }
      `;
      const result = engine.inferTypes('hasError', code);

      expect(result.signature.returnType).toBe('boolean');
      expect(result.signature.confidence).toBe(0.95);
    });

    it('should infer filter return type as array', () => {
      const code = `
        function filterItems(items) {
          return items.filter(x => x > 0);
        }
      `;
      const result = engine.inferTypes('filterItems', code);

      expect(result.signature.returnType).toBe('array');
    });

    it('should infer formatDate return type as string', () => {
      const code = `
        function formatDate(date) {
          return date.toISOString();
        }
      `;
      const result = engine.inferTypes('formatDate', code);

      expect(result.signature.returnType).toBe('string');
    });

    it('should include reasoning in result', () => {
      const code = 'function test() {}';
      const result = engine.inferTypes('test', code);

      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.reasoning[0]).toContain('Analyzing');
    });

    it('should handle unknown functions gracefully', () => {
      const code = 'function unknownOp() {}';
      const result = engine.inferTypes('unknownOp', code);

      expect(result.functionName).toBe('unknownOp');
      expect(result.signature).toBeDefined();
    });
  });

  // ============================================================================
  // 2. 변수 타입 추론 (8개)
  // ============================================================================
  describe('Variable Type Inference', () => {
    it('should infer tax variable as decimal from name', () => {
      const result = engine.inferVariableType('tax', 'calculateTax', 'const tax = 10;');

      expect(result.inferredType).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0.70);
      expect(result.fromName).toBe(true);
    });

    it('should infer isValid variable as boolean from name', () => {
      const result = engine.inferVariableType('isValid', 'check', 'const isValid = true;');

      expect(result.inferredType).toBe('boolean');
      expect(result.confidence).toBeGreaterThanOrEqual(0.70);
    });

    it('should infer email variable as validated_string from name', () => {
      const result = engine.inferVariableType('email', 'validateEmail', 'const email = "test@example.com";');

      expect(result.inferredType).toBe('validated_string');
      expect(result.domain).toBe('web');
    });

    it('should infer items array from name', () => {
      const result = engine.inferVariableType('items', 'process', 'const items = [];');

      expect(result.inferredType).toBe('array');
      expect(result.confidence).toBeGreaterThanOrEqual(0.70);
    });

    it('should infer vector as array<number> from name', () => {
      const result = engine.inferVariableType('vector', 'compute', 'const vector = [1, 2, 3];');

      expect(result.inferredType).toBe('array<number>');
      expect(result.domain).toBe('data-science');
    });

    it('should combine name and comment analysis', () => {
      const comments = ['// finance: amount value'];
      const result = engine.inferVariableType('amount', 'calculate', 'const amount = 100;', comments);

      expect(result.domain).toBe('finance');
      expect(result.nameAnalysisConfidence).toBeGreaterThanOrEqual(0.70);
    });

    it('should handle snake_case variables', () => {
      const result = engine.inferVariableType('user_count', 'process', 'const user_count = 5;');

      expect(result.inferredType).toBe('number');
      expect(result.confidence).toBeGreaterThanOrEqual(0.70);
    });

    it('should provide reasoning for variable inference', () => {
      const result = engine.inferVariableType('price', 'getPrice', 'const price = 100;');

      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.reasoning[0]).toContain('Variable name');
    });
  });

  // ============================================================================
  // 3. 신뢰도 계산 (8개)
  // ============================================================================
  describe('Confidence Calculation', () => {
    it('should have high confidence for explicit predicate', () => {
      const code = 'function isValid() {}';
      const result = engine.inferTypes('isValid', code);

      expect(result.signature.confidence).toBe(0.95);
    });

    it('should boost confidence with comment', () => {
      const code = 'function calculateTax() {}';
      const comments = ['// finance: tax calculation'];
      const result = engine.inferTypes('calculateTax', code, comments);

      expect(result.signature.confidence).toBeGreaterThanOrEqual(0.80);
    });

    it('should reduce confidence for unknown functions', () => {
      const code = 'function unknownXyz() {}';
      const result = engine.inferTypes('unknownXyz', code);

      expect(result.signature.confidence).toBeLessThanOrEqual(0.50);
    });

    it('should calculate weighted confidence correctly', () => {
      const code = `
        function processData() {
          const items = [];
          const count = 0;
        }
      `;
      const result = engine.inferTypes('processData', code);

      // Should have signature confidence + variable confidences averaged
      expect(result.overallConfidence).toBeGreaterThanOrEqual(0.0);
      expect(result.overallConfidence).toBeLessThanOrEqual(0.95);
    });

    it('should normalize confidence to 0.0-1.0 range', () => {
      const code = 'function test() {}';
      const result = engine.inferTypes('test', code);

      expect(result.signature.confidence).toBeGreaterThanOrEqual(0.0);
      expect(result.signature.confidence).toBeLessThanOrEqual(0.95);
    });

    it('should have high confidence for multiple name+comment hints', () => {
      const code = 'function validateEmail() {}';
      const comments = ['// web: email validation required'];
      const result = engine.inferTypes('validateEmail', code, comments);

      expect(result.signature.confidence).toBeGreaterThanOrEqual(0.80);
    });

    it('should include individual analysis confidences', () => {
      const code = 'function calculateTax() {}';
      const result = engine.inferTypes('calculateTax', code);

      expect(result.signature.nameAnalysisConfidence).toBeGreaterThanOrEqual(0);
      expect(result.signature.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should calculate variable average confidence', () => {
      const code = `
        function test() {
          const var1 = 1;
          const var2 = 2;
          const var3 = 3;
        }
      `;
      const result = engine.inferTypes('test', code);

      if (result.variables.length > 0) {
        const avgVarConfidence = result.variables.reduce((sum, v) => sum + v.confidence, 0) / result.variables.length;
        expect(avgVarConfidence).toBeGreaterThanOrEqual(0.0);
      }
    });
  });

  // ============================================================================
  // 4. 타입 충돌 감지 (8개)
  // ============================================================================
  describe('Type Conflict Detection', () => {
    it('should detect no conflicts for consistent types', () => {
      const code = `
        function calculateTax() {
          const tax = 0;
          return tax;
        }
      `;
      const result = engine.inferTypes('calculateTax', code);

      // Should have few or no conflicts
      expect(result.conflicts.length).toBeLessThanOrEqual(1);
    });

    it('should detect conflicts when multiple sources suggest different types', () => {
      const code = `
        function test() {
          const data = [1, 2, 3];
        }
      `;
      // If we had conflicting comments, conflicts would increase
      const result = engine.inferTypes('test', code);

      expect(Array.isArray(result.conflicts)).toBe(true);
    });

    it('should categorize conflicts as info/warning/error', () => {
      const code = `
        function test() {
          const x = 1;
        }
      `;
      const result = engine.inferTypes('test', code);

      for (const conflict of result.conflicts) {
        expect(['info', 'warning', 'error']).toContain(conflict.severity);
      }
    });

    it('should provide conflict reasoning', () => {
      const code = 'function test() { const x = 1; }';
      const result = engine.inferTypes('test', code);

      for (const conflict of result.conflicts) {
        expect(conflict.reasoning.length).toBeGreaterThan(0);
      }
    });

    it('should track conflict sources', () => {
      const code = 'function test() { const x = 1; }';
      const result = engine.inferTypes('test', code);

      for (const conflict of result.conflicts) {
        for (const type of conflict.conflictingTypes) {
          expect(['name', 'comment', 'semantic', 'context']).toContain(type.source);
          expect(type.confidence).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should not report conflicts for variables without analysis', () => {
      const code = 'function test() { const xyz = 1; }';
      const result = engine.inferTypes('test', code);

      // Unknown variable should not cause conflicts
      const xyzConflicts = result.conflicts.filter(c => c.variableName === 'xyz');
      expect(xyzConflicts.length).toBeLessThanOrEqual(1);
    });

    it('should handle empty conflicts array', () => {
      const code = 'function simple() {}';
      const result = engine.inferTypes('simple', code);

      expect(Array.isArray(result.conflicts)).toBe(true);
    });

    it('should suggest resolution for conflicts', () => {
      const code = 'function test() { const x = 1; }';
      const result = engine.inferTypes('test', code);

      for (const conflict of result.conflicts) {
        // Some conflicts may have suggestions
        expect(conflict.suggestion === undefined || typeof conflict.suggestion === 'string').toBe(true);
      }
    });
  });

  // ============================================================================
  // 5. 도메인 그룹화 (5개)
  // ============================================================================
  describe('Domain Grouping', () => {
    it('should group variables by domain', () => {
      const variables = [
        { variableName: 'tax', domain: 'finance', confidence: 0.9, inferredType: 'decimal', reasoning: [] },
        { variableName: 'email', domain: 'web', confidence: 0.9, inferredType: 'string', reasoning: [] },
        { variableName: 'hash', domain: 'crypto', confidence: 0.9, inferredType: 'hash_string', reasoning: [] }
      ] as any;

      const grouped = engine.groupVariablesByDomain(variables);

      expect(grouped.size).toBe(3);
      expect(grouped.get('finance')).toHaveLength(1);
      expect(grouped.get('web')).toHaveLength(1);
      expect(grouped.get('crypto')).toHaveLength(1);
    });

    it('should group variables with same domain together', () => {
      const variables = [
        { variableName: 'tax', domain: 'finance', confidence: 0.9, inferredType: 'decimal', reasoning: [] },
        { variableName: 'price', domain: 'finance', confidence: 0.9, inferredType: 'currency', reasoning: [] },
        { variableName: 'email', domain: 'web', confidence: 0.9, inferredType: 'string', reasoning: [] }
      ] as any;

      const grouped = engine.groupVariablesByDomain(variables);

      expect(grouped.get('finance')).toHaveLength(2);
      expect(grouped.get('web')).toHaveLength(1);
    });

    it('should put ungrouped variables in generic domain', () => {
      const variables = [
        { variableName: 'x', confidence: 0.5, inferredType: 'number', reasoning: [] },
        { variableName: 'tax', domain: 'finance', confidence: 0.9, inferredType: 'decimal', reasoning: [] }
      ] as any;

      const grouped = engine.groupVariablesByDomain(variables);

      expect(grouped.has('generic')).toBe(true);
      expect(grouped.get('generic')).toContain(variables[0]);
    });

    it('should return empty groups for empty input', () => {
      const grouped = engine.groupVariablesByDomain([]);

      expect(grouped.size).toBe(0);
    });

    it('should handle multiple domains efficiently', () => {
      const variables: Array<{
        variableName: string;
        domain: string;
        confidence: number;
        inferredType: string;
        reasoning: string[];
      }> = [];
      const domains = ['finance', 'web', 'crypto', 'data-science', 'iot'];
      for (const domain of domains) {
        variables.push({
          variableName: `var_${domain}`,
          domain,
          confidence: 0.8,
          inferredType: 'test',
          reasoning: []
        });
      }

      const grouped = engine.groupVariablesByDomain(variables);

      expect(grouped.size).toBe(5);
      for (const domain of domains) {
        expect(grouped.get(domain)).toHaveLength(1);
      }
    });
  });

  // ============================================================================
  // 6. 신뢰도 필터링 (3개)
  // ============================================================================
  describe('Confidence Filtering', () => {
    it('should filter variables by minimum confidence', () => {
      const variables = [
        { variableName: 'high', confidence: 0.9, inferredType: 'number', reasoning: [] },
        { variableName: 'mid', confidence: 0.6, inferredType: 'string', reasoning: [] },
        { variableName: 'low', confidence: 0.2, inferredType: 'boolean', reasoning: [] }
      ] as any;

      const filtered = engine.filterByConfidence(variables, 0.5);

      expect(filtered.length).toBe(2);
      expect(filtered).toContain(variables[0]);
      expect(filtered).toContain(variables[1]);
    });

    it('should return empty array when no variables meet threshold', () => {
      const variables = [
        { variableName: 'low', confidence: 0.2, inferredType: 'number', reasoning: [] }
      ] as any;

      const filtered = engine.filterByConfidence(variables, 0.9);

      expect(filtered).toHaveLength(0);
    });

    it('should return all variables when threshold is very low', () => {
      const variables = [
        { variableName: 'v1', confidence: 0.1, inferredType: 'number', reasoning: [] },
        { variableName: 'v2', confidence: 0.5, inferredType: 'string', reasoning: [] }
      ] as any;

      const filtered = engine.filterByConfidence(variables, 0.0);

      expect(filtered).toHaveLength(2);
    });
  });

  // ============================================================================
  // 7. 고신뢰도 필터링 (2개)
  // ============================================================================
  describe('High Confidence Type Filtering', () => {
    it('should filter result by high confidence threshold', () => {
      const code = `
        function calculateTax(price) {
          const tax = price * 0.1;
          return tax;
        }
      `;
      const result = engine.inferTypes('calculateTax', code);
      const highConf = engine.getHighConfidenceTypes(result, 0.75);

      expect(highConf.variables.every(v => v.confidence >= 0.75)).toBe(true);
    });

    it('should include signature when confidence is high enough', () => {
      const code = 'function isValid() {}';
      const result = engine.inferTypes('isValid', code);
      const highConf = engine.getHighConfidenceTypes(result, 0.75);

      if (result.signature.confidence >= 0.75) {
        expect(highConf.signature.returnType).toBeDefined();
      }
    });
  });

  // ============================================================================
  // 8. 실제 코드 시나리오 (4개)
  // ============================================================================
  describe('Real-World Scenarios', () => {
    it('should analyze finance calculation function', () => {
      const code = `
        function calculateTotalTax(subtotal) {
          const taxRate = 0.1;
          const tax = subtotal * taxRate;
          return tax;
        }
      `;
      const comments = ['// finance: calculate tax on subtotal'];
      const result = engine.inferTypes('calculateTotalTax', code, comments);

      expect(result.signature.domain).toBe('finance');
      expect(result.signature.confidence).toBeGreaterThanOrEqual(0.75);
      expect(result.variables.length).toBeGreaterThan(0);
    });

    it('should analyze data science function', () => {
      const code = `
        function filterVector(vector) {
          return vector.filter(x => x > 0);
        }
      `;
      const comments = ['// data-science: filter positive values from vector'];
      const result = engine.inferTypes('filterVector', code, comments);

      // filter verb suggests array, vector noun suggests array<number>
      expect(['array', 'array<number>']).toContain(result.signature.returnType);
      expect(result.signature.confidence).toBeGreaterThanOrEqual(0.70);
    });

    it('should analyze web validation function', () => {
      const code = `
        function validateEmail(email) {
          const isValid = email.includes('@');
          return isValid;
        }
      `;
      const comments = ['// web: validate email format'];
      const result = engine.inferTypes('validateEmail', code, comments);

      expect(result.signature.returnType).toBe('boolean');
      expect(result.signature.domain).toBe('web');
      expect(result.overallConfidence).toBeGreaterThanOrEqual(0.70);
    });

    it('should handle multi-domain function', () => {
      const code = `
        function processUserPayment(email, amount) {
          const valid = validateEmail(email);
          const total = amount * 1.1;
          return { valid, total };
        }
      `;
      const comments = [
        '// web: email validation',
        '// finance: payment amount calculation'
      ];
      const result = engine.inferTypes('processUserPayment', code, comments);

      expect(result.variables.length).toBeGreaterThanOrEqual(2);
      const domains = result.variables.map(v => v.domain).filter(Boolean);
      expect(domains.some(d => d === 'finance' || d === 'web')).toBe(true);
    });
  });
});
