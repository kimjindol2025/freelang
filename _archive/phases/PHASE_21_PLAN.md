# Phase 21: Type Annotations for Functions - Implementation Plan

**Duration**: 4 days
**Goal**: Add optional type annotations to function definitions
**Status**: Starting 2026-02-18

---

## Overview

Phase 20 implemented user-defined functions. Phase 21 extends functions with **optional type annotations**, enabling:
- Type information in function signatures
- Type validation during function calls
- Better IDE support and documentation
- Optional (not enforced) - maintains AI-First flexibility

**Current State**: Functions work, no type information
**Target State**: Functions support optional type annotations

---

## Day 1: Type Annotation Parser

### Goals
- Parse type annotations in function definitions
- Extract parameter types and return types
- Build TypedFunction representation
- Support optional type syntax

### Implementation

**Enhanced Function Syntax**:

```
fn name(param1: type1, param2: type2): returnType { body }

Examples:
fn add(a: number, b: number): number { return a + b }
fn greet(name: string): string { return "Hello, " + name }
fn process(items: array<number>): number { return items }
fn identity(x): x { return x }  // Optional types
```

**Supported Types**:
- `number` - numeric type
- `string` - string type
- `boolean` - boolean type
- `array<T>` - array of T
- `any` - dynamic/unknown type
- Omitted - inferred or any

**Parser Changes** (`src/cli/parser.ts` extension):

```typescript
interface TypedFunction extends ParsedFunction {
  paramTypes: Record<string, string>;  // param name -> type
  returnType?: string;                  // return type
}

function parseTypeAnnotations(source: string): TypedFunction[] {
  // Extract type info from function signatures
  // Pattern: fn name(param: type): type { ... }
}
```

### Tests (8-10)

1. Parse function with single parameter type
2. Parse function with multiple parameter types
3. Parse function with return type
4. Parse function with mixed typed/untyped parameters
5. Parse function without types (backward compat)
6. Parse array type annotations
7. Parse any/dynamic types
8. Handle whitespace in type annotations
9. Extract all parameter types
10. Extract return types correctly

---

## Day 2: Type Registry & Validation

### Goals
- Store type information in FunctionRegistry
- Validate types during function registration
- Implement TypeChecker for validation
- Report type mismatches

### Implementation

**TypeRegistry Enhancement**:

```typescript
class FunctionRegistry {
  getTypes(name: string): FunctionTypes | null
  validateCall(name: string, argTypes: string[]): boolean
  getSignature(name: string): string  // "fn add(number, number): number"
}

interface FunctionTypes {
  params: Record<string, string>;
  returnType?: string;
}
```

**Type Checker**:

```typescript
class FunctionTypeChecker {
  checkFunctionCall(funcName: string, argTypes: string[]): TypeCheckResult
  checkAssignment(paramType: string, argType: string): boolean
  inferType(value: any): string
}
```

**Type Compatibility**:

```
number ←→ number (exact)
string ←→ string (exact)
array<T> ←→ array<T> (exact)
any ←→ any (always compatible)
T ←→ any (implicit conversion)
any ←→ T (implicit conversion)
```

### Tests (8-10)

1. Store function with types in registry
2. Retrieve type information
3. Validate compatible types
4. Detect incompatible types
5. Handle missing type information
6. Support type inference for literals
7. Check array types
8. Validate parameter counts match
9. Generate function signatures
10. Track type errors

---

## Day 3: Integration & Type-Safe Execution

### Goals
- Integrate type checking into VM execution
- Generate type warnings/errors
- Runtime type validation
- Support mixed typed/untyped code

### Implementation

**Type-Safe CALL Opcode**:

```typescript
// In VM.ts, enhance CALL handler
case Op.CALL: {
  const funcName = inst.arg as string;

  // Check function exists
  const fn = this.functionRegistry?.lookup(funcName);
  if (!fn) throw new Error('function_not_found');

  // NEW: Validate types if available
  if (this.functionRegistry?.hasTypes(funcName)) {
    const types = this.functionRegistry.getTypes(funcName);
    const argTypes = this.inferStackTypes(fn.params.length);

    const checkResult = this.checkTypeCompatibility(
      funcName,
      argTypes,
      types
    );

    if (!checkResult.compatible) {
      console.warn(`Type warning: ${checkResult.message}`);
      // Continue anyway (warnings, not errors)
    }
  }

  // Execute function (unchanged)
  // ...
}
```

**Type Inference for Primitives**:

```typescript
function inferType(value: any): string {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'boolean') return 'boolean';
  if (Array.isArray(value)) return 'array<any>';
  return 'any';
}
```

### Tests (15-20)

1. Execute typed function call with correct types
2. Execute typed function with implicit conversions
3. Warn on type mismatch (non-fatal)
4. Handle mixed typed/untyped calls
5. Infer types from literals
6. Check array element types
7. Validate multiple parameters
8. Handle optional type annotations
9. Support 'any' type
10. Track type warnings
11. Function with return type validation
12. Multiple function type checking
13. Recursive function type validation
14. Type inference accuracy
15. Performance with type checking

---

## Day 4: Real-World Examples & Documentation

### Goals
- Demonstrate type annotations in practice
- Real-world type examples
- Performance validation
- Complete documentation

### Implementation

**Example Programs**:

```freelang
// Typed calculator
fn add(a: number, b: number): number { return a + b }
fn multiply(x: number, y: number): number { return x * y }
fn divide(a: number, b: number): number { return a / b }

// Typed string utilities
fn uppercase(s: string): string { return s }
fn contains(text: string, substring: string): boolean { return text }
fn replace(s: string, old: string, new: string): string { return s }

// Typed array functions
fn sum(arr: array<number>): number { return arr }
fn length(arr: array<any>): number { return arr }
fn map(arr: array<number>, fn): array<number> { return arr }

// Mixed types
fn process(id: number, name: string, data: any): string {
  return "processed"
}

// Type inference
fn identity(x) { return x }  // Works with any type
```

**Type Documentation**:

```typescript
interface TypeAnnotationSpec {
  syntax: "fn name(param: type): returnType { ... }";
  paramTypes: string[];  // "number", "string", "array<T>"
  returnType?: string;   // optional
  inference: boolean;    // supports type inference
  warnings: boolean;     // type mismatches = warnings, not errors
}
```

### Tests (15-20)

1. Calculator with full type annotations
2. String utilities with types
3. Array functions with generic types
4. Mixed typed/untyped parameters
5. Type inference for complex expressions
6. Performance: 1000 typed calls
7. Type checking overhead
8. Large typed function libraries
9. Type compatibility matrix
10. Real-world program patterns
11. Type warnings on mismatch
12. Documentation generation
13. Type error messages
14. Backward compatibility (no types)
15. Future extensibility

---

## Critical Implementation Files

### New Files
- `src/cli/type-parser.ts` - Type annotation parser
- `src/analyzer/type-checker.ts` - Type validation
- `tests/phase-21-day1-type-parser.test.ts` - Day 1 tests
- `tests/phase-21-day2-type-validation.test.ts` - Day 2 tests
- `tests/phase-21-day3-type-execution.test.ts` - Day 3 tests
- `tests/phase-21-day4-type-examples.test.ts` - Day 4 tests

### Modified Files
- `src/cli/parser.ts` - Integrate type parser
- `src/parser/function-registry.ts` - Add type storage
- `src/vm.ts` - Add type checking to CALL
- `src/types.ts` - New type definitions

### Reference Files
- `PHASE_21_PLAN.md` - This document
- `PHASE_20_COMPLETE.md` - Previous phase

---

## Testing Strategy

### Test Organization

```
Phase 21 Tests (60+ total)
├─ Day 1: Type Parser (10 tests)
│  └─ Parse type annotations
├─ Day 2: Type Validation (10 tests)
│  └─ Validate type compatibility
├─ Day 3: Type Execution (20 tests)
│  └─ Runtime type checking
└─ Day 4: Examples (20 tests)
   └─ Real-world programs
```

### Test Examples

**Day 1 - Parser Test**:
```typescript
it('parses function with type annotations', () => {
  const source = `fn add(a: number, b: number): number { return a + b }`;
  const parsed = parseTypeAnnotations(source);

  expect(parsed[0].paramTypes).toEqual({ a: 'number', b: 'number' });
  expect(parsed[0].returnType).toBe('number');
});
```

**Day 2 - Validation Test**:
```typescript
it('validates type compatibility', () => {
  const checker = new FunctionTypeChecker();
  const result = checker.checkCall('add', ['number', 'number']);

  expect(result.compatible).toBe(true);
});
```

**Day 3 - Execution Test**:
```typescript
it('executes typed function with validation', () => {
  const runner = new ProgramRunner();
  const source = `fn add(a: number, b: number): number { return a + b }`;

  const result = runner.runString(source);
  expect(result.success).toBe(true);
});
```

**Day 4 - Example Test**:
```typescript
it('handles real-world typed program', () => {
  const source = `
    fn add(a: number, b: number): number { return a + b }
    fn multiply(x: number, y: number): number { return x * y }
  `;

  const parsed = parseTypeAnnotations(source);
  expect(parsed).toHaveLength(2);
});
```

---

## Syntax Definition

### Type Annotation Syntax

```
fn <name>(<param>: <type>, ...): <type> { <body> }

Types:
  - number: numeric type
  - string: string type
  - boolean: boolean type
  - array<T>: array of type T
  - any: dynamic/unknown type

Examples:
fn add(a: number, b: number): number { return a + b }
fn greet(name: string): string { return "Hello, " + name }
fn process(data: any): any { return data }
fn sumArray(arr: array<number>): number { return arr }
fn mixed(id: number, name: string): any { return name }
```

### Backward Compatibility

```
fn add(a, b) { return a + b }  // Still works (no types)
fn add(a: number, b: number): number { ... }  // New (with types)
```

---

## Error Handling

### Type Checking Warnings

```
Type warning: Expected number, got string
Type warning: Function 'add' expects 2 arguments, got 1
Type warning: Return type string, got number
```

Note: Warnings, not errors. Execution continues.

---

## Success Criteria

- [ ] 10+ parser tests passing (Day 1)
- [ ] 10+ validation tests passing (Day 2)
- [ ] 20+ execution tests passing (Day 3)
- [ ] 20+ example tests passing (Day 4)
- [ ] Total: 60+ tests passing
- [ ] No Phase 20 regressions
- [ ] Real-world typed programs work
- [ ] Type inference accurate
- [ ] Performance acceptable
- [ ] Full documentation provided
- [ ] Backward compatible with untyped code

---

## Timeline

| Day | Focus | Tests | Hours |
|-----|-------|-------|-------|
| 1 | Type parser | 10 | 3 |
| 2 | Type validation | 10 | 3 |
| 3 | Type execution | 20 | 4 |
| 4 | Examples & docs | 20 | 4 |
| **Total** | **Type system** | **60+** | **14** |

---

## Risk Mitigation

| Risk | Mitigation |
|------|--------------|
| Parser complexity | Start simple, extend gradually |
| Type inference errors | Conservative inference (infer to 'any') |
| Performance overhead | Profile before optimizing |
| Backward compatibility | Support untyped functions fully |
| Type mismatch handling | Warnings, not errors |

---

## Deliverables

1. ✅ Type annotation parser
2. ✅ Type registry integration
3. ✅ Type checking engine
4. ✅ 60+ comprehensive tests
5. ✅ Real-world example programs
6. ✅ Performance benchmarks
7. ✅ Full documentation
8. ✅ No regressions (Phase 20 tests)

---

## Next Phase (Phase 22)

After Phase 21, potential enhancements:
- Default parameters: `fn greet(name, greeting = "Hello")`
- Variadic functions: `fn sum(...numbers)`
- Arrow functions: `let double = (x) => x * 2`
- Closures: Full variable capture
- Method syntax: `obj.method()`
- Function overloading

---

**Status**: Phase 21 Plan Complete
**Next**: Day 1 Implementation (Type Parser)
