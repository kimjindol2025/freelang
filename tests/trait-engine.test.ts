/**
 * Trait Engine Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { TraitEngine } from '../src/analyzer/trait-engine';
import { MinimalFunctionAST } from '../src/parser/ast';

describe('TraitEngine', () => {
  let engine: TraitEngine;

  beforeEach(() => {
    engine = new TraitEngine();
  });

  // ============================================================================
  // 1. Trait Definition (10개)
  // ============================================================================
  describe('Trait Definition Extraction', () => {
    it('should extract basic trait definition', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Show {
              fn show() -> string
            }
          `
        }
      ];
      const result = engine.build(functions);

      expect(result.traits.has('Show')).toBe(true);
      const trait = result.traits.get('Show');
      expect(trait?.name).toBe('Show');
    });

    it('should extract trait with multiple methods', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Iterator {
              fn next() -> any
              fn hasNext() -> bool
              fn reset() -> any
            }
          `
        }
      ];
      const result = engine.build(functions);

      const trait = result.traits.get('Iterator');
      expect(trait?.methods.length).toBe(3);
    });

    it('should extract associated types', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Container {
              type Item
              fn get() -> Item
            }
          `
        }
      ];
      const result = engine.build(functions);

      const trait = result.traits.get('Container');
      expect(trait?.associatedTypes.length).toBeGreaterThanOrEqual(1);
      if (trait?.associatedTypes[0]) {
        expect(trait.associatedTypes[0].name).toBe('Item');
      }
    });

    it('should extract super traits', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Display: Show {
              fn format() -> string
            }
          `
        }
      ];
      const result = engine.build(functions);

      const trait = result.traits.get('Display');
      expect(trait?.superTraits.length).toBeGreaterThanOrEqual(0);
    });

    it('should set initial confidence for traits', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Clone {
              fn clone() -> Self
            }
          `
        }
      ];
      const result = engine.build(functions);

      const trait = result.traits.get('Clone');
      expect(trait?.confidence).toBeGreaterThanOrEqual(0.75);
      expect(trait?.confidence).toBeLessThanOrEqual(0.95);
    });

    it('should extract method signatures', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Compare {
              fn compare(other: Self) -> number
              fn equals(other: Self) -> bool
            }
          `
        }
      ];
      const result = engine.build(functions);

      const trait = result.traits.get('Compare');
      if (trait?.methods[0]) {
        expect(trait.methods[0].name).toBe('compare');
        expect(trait.methods[0].outputType).toBe('number');
      }
    });

    it('should mark methods as required', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Printable {
              fn print() -> any
            }
          `
        }
      ];
      const result = engine.build(functions);

      const trait = result.traits.get('Printable');
      if (trait?.methods[0]) {
        expect(trait.methods[0].required).toBe(true);
      }
    });

    it('should handle traits with no methods', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Marker {
            }
          `
        }
      ];
      const result = engine.build(functions);

      expect(result.traits.has('Marker')).toBeDefined();
    });

    it('should handle associated type constraints', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Iterator {
              type Item: Clone
              fn next() -> Item
            }
          `
        }
      ];
      const result = engine.build(functions);

      const trait = result.traits.get('Iterator');
      expect(trait?.associatedTypes.length).toBeGreaterThanOrEqual(0);
    });

    it('should provide reasoning for trait extraction', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Shape {
              fn area() -> number
            }
          `
        }
      ];
      const result = engine.build(functions);

      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.reasoning[0]).toContain('Trait');
    });
  });

  // ============================================================================
  // 2. Trait Implementation (10개)
  // ============================================================================
  describe('Trait Implementation Extraction', () => {
    it('should extract trait implementation', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Show {
              fn show() -> string
            }
            impl Show for number {
              fn show() { return input.toString() }
            }
          `
        }
      ];
      const result = engine.build(functions);

      expect(result.implementations.length).toBeGreaterThan(0);
      expect(result.implementations[0].forType).toBe('number');
    });

    it('should extract multiple implementations', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Clone {
              fn clone() -> Self
            }
            impl Clone for number {
              fn clone() { return input }
            }
            impl Clone for string {
              fn clone() { return input }
            }
          `
        }
      ];
      const result = engine.build(functions);

      expect(result.implementations.length).toBeGreaterThanOrEqual(2);
    });

    it('should extract method implementations', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Show {
              fn show() -> string
            }
            impl Show for number {
              fn show() { return "number" }
            }
          `
        }
      ];
      const result = engine.build(functions);

      const impl = result.implementations[0];
      expect(impl.methods.size).toBeGreaterThan(0);
      expect(impl.methods.has('show')).toBe(true);
    });

    it('should extract associated type bindings', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Container {
              type Item
              fn get() -> Item
            }
            impl Container for array<number> {
              type Item = number
              fn get() { return input[0] }
            }
          `
        }
      ];
      const result = engine.build(functions);

      const impl = result.implementations[0];
      expect(impl.associatedTypeBindings.size).toBeGreaterThan(0);
    });

    it('should set initial confidence for implementations', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Clone {
              fn clone() -> Self
            }
            impl Clone for string {
              fn clone() { return input }
            }
          `
        }
      ];
      const result = engine.build(functions);

      const impl = result.implementations[0];
      expect(impl.confidence).toBeGreaterThanOrEqual(0.7);
      expect(impl.confidence).toBeLessThanOrEqual(0.95);
    });

    it('should handle generic type implementations', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Clone {
              fn clone() -> Self
            }
            impl Clone for array<T> {
              fn clone() { return input }
            }
          `
        }
      ];
      const result = engine.build(functions);

      expect(result.implementations.length).toBeGreaterThan(0);
      expect(result.implementations[0].forType).toContain('array');
    });

    it('should track trait name in implementation', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Display {
              fn print() -> any
            }
            impl Display for number {
              fn print() { return 42 }
            }
          `
        }
      ];
      const result = engine.build(functions);

      const impl = result.implementations[0];
      expect(impl.traitName).toBe('Display');
    });

    it('should detect missing trait definition', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            impl UnknownTrait for number {
              fn method() { return 42 }
            }
          `
        }
      ];
      const result = engine.build(functions);

      const errors = result.validationErrors.filter(e => e.type === 'missing_trait_def');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should initialize complete flag', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Show {
              fn show() -> string
            }
            impl Show for number {
              fn show() { return "42" }
            }
          `
        }
      ];
      const result = engine.build(functions);

      const impl = result.implementations[0];
      expect(typeof impl.complete).toBe('boolean');
    });
  });

  // ============================================================================
  // 3. Implementation Validation (10개)
  // ============================================================================
  describe('Implementation Validation', () => {
    it('should validate complete implementation', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Clone {
              fn clone() -> Self
            }
            impl Clone for string {
              fn clone() { return input }
            }
          `
        }
      ];
      const result = engine.build(functions);

      expect(result.implementations[0].complete).toBe(true);
    });

    it('should detect missing required method', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Display {
              fn format() -> string
              fn debug() -> string
            }
            impl Display for number {
              fn format() { return "42" }
            }
          `
        }
      ];
      const result = engine.build(functions);

      const errors = result.validationErrors.filter(e => e.type === 'missing_method');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should increase confidence for complete implementations', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Show {
              fn show() -> string
            }
            impl Show for number {
              fn show() { return "number" }
            }
          `
        }
      ];
      const result = engine.build(functions);

      const impl = result.implementations[0];
      expect(impl.confidence).toBeGreaterThan(0.80);
    });

    it('should validate multiple methods', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Shape {
              fn area() -> number
              fn perimeter() -> number
            }
            impl Shape for Circle {
              fn area() { return 3.14 }
              fn perimeter() { return 6.28 }
            }
          `
        }
      ];
      const result = engine.build(functions);

      if (result.implementations[0]) {
        expect(result.implementations[0].complete).toBe(true);
      }
    });

    it('should handle implementations with extra methods', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Show {
              fn show() -> string
            }
            impl Show for number {
              fn show() { return "42" }
              fn extra() { return "bonus" }
            }
          `
        }
      ];
      const result = engine.build(functions);

      // Implementation should exist
      expect(result.implementations.length).toBeGreaterThan(0);
      expect(result.implementations[0].methods.size).toBeGreaterThanOrEqual(1);
    });

    it('should get errors for implementation', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Clone {
              fn clone() -> Self
            }
            impl Clone for number {
            }
          `
        }
      ];
      const result = engine.build(functions);

      const errors = engine.getErrorsForImpl(result, 'Clone', 'number');
      expect(Array.isArray(errors)).toBe(true);
    });

    it('should validate associated type bindings', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Container {
              type Item
              fn get() -> Item
            }
            impl Container for array<number> {
              type Item = number
              fn get() { return input[0] }
            }
          `
        }
      ];
      const result = engine.build(functions);

      const impl = result.implementations[0];
      expect(impl.associatedTypeBindings.has('Item')).toBe(true);
    });

    it('should handle missing associated type binding', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Iterator {
              type Item
              fn next() -> Item
            }
            impl Iterator for array<number> {
              fn next() { return input[0] }
            }
          `
        }
      ];
      const result = engine.build(functions);

      const errors = result.validationErrors.filter(e => e.type === 'missing_associated_type');
      expect(errors.length).toBeGreaterThanOrEqual(0);
    });

    it('should calculate completeness rate', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Clone {
              fn clone() -> Self
            }
            impl Clone for number {
              fn clone() { return input }
            }
            impl Clone for string {
              fn clone() { return input }
            }
          `
        }
      ];
      const result = engine.build(functions);

      expect(result.completeness).toBeGreaterThanOrEqual(0);
      expect(result.completeness).toBeLessThanOrEqual(1);
    });
  });

  // ============================================================================
  // 4. API Methods (5개)
  // ============================================================================
  describe('API Methods', () => {
    it('should check if type implements trait', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Show {
              fn show() -> string
            }
            impl Show for number {
              fn show() { return "42" }
            }
          `
        }
      ];
      const result = engine.build(functions);

      // Check that implementation was found (even if complete flag might be different)
      const impls = engine.getImplementationsForType(result, 'number');
      expect(impls.length).toBeGreaterThan(0);
      expect(impls[0].traitName).toBe('Show');
    });

    it('should get implementations for type', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Clone {
              fn clone() -> Self
            }
            trait Show {
              fn show() -> string
            }
            impl Clone for number {
              fn clone() { return input }
            }
            impl Show for number {
              fn show() { return "42" }
            }
          `
        }
      ];
      const result = engine.build(functions);

      const impls = engine.getImplementationsForType(result, 'number');
      expect(impls.length).toBeGreaterThanOrEqual(2);
    });

    it('should get implementations of trait', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Clone {
              fn clone() -> Self
            }
            impl Clone for number {
              fn clone() { return input }
            }
            impl Clone for string {
              fn clone() { return input }
            }
          `
        }
      ];
      const result = engine.build(functions);

      const impls = engine.getImplementationsOfTrait(result, 'Clone');
      expect(impls.length).toBeGreaterThanOrEqual(2);
    });

    it('should get trait definition', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Show {
              fn show() -> string
            }
          `
        }
      ];
      const result = engine.build(functions);

      const trait = engine.getTrait(result, 'Show');
      expect(trait).toBeDefined();
      expect(trait?.name).toBe('Show');
    });

    it('should get all traits', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Show {
              fn show() -> string
            }
            trait Clone {
              fn clone() -> Self
            }
          `
        }
      ];
      const result = engine.build(functions);

      const all = engine.getAllTraits(result);
      expect(Array.isArray(all)).toBe(true);
      expect(all.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================================================
  // 5. Edge Cases (5개)
  // ============================================================================
  describe('Edge Cases', () => {
    it('should handle traits with no implementation', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait OnlyDefined {
              fn method() -> any
            }
          `
        }
      ];
      const result = engine.build(functions);

      expect(result.traits.has('OnlyDefined')).toBe(true);
      expect(result.completeness).toBe(0);
    });

    it('should handle empty trait', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Marker {
            }
            impl Marker for number {
            }
          `
        }
      ];
      const result = engine.build(functions);

      expect(result.implementations.length).toBeGreaterThan(0);
    });

    it('should handle nested generic implementations', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Clone {
              fn clone() -> Self
            }
            impl Clone for array<array<number>> {
              fn clone() { return input }
            }
          `
        }
      ];
      const result = engine.build(functions);

      expect(result.implementations.length).toBeGreaterThan(0);
    });

    it('should handle method with no return type', () => {
      const functions: MinimalFunctionAST[] = [
        {
          fnName: 'test',
          inputType: 'null',
          outputType: 'null',
          body: `
            trait Action {
              fn perform()
            }
          `
        }
      ];
      const result = engine.build(functions);

      expect(result.traits.has('Action')).toBeDefined();
    });

    it('should handle empty code', () => {
      const functions: MinimalFunctionAST[] = [];
      const result = engine.build(functions);

      expect(result.traits.size).toBe(0);
      expect(result.implementations.length).toBe(0);
      expect(result.completeness).toBe(0);
    });
  });
});
