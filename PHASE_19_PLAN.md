# Phase 19: User-Defined Functions - Implementation Plan

**Duration**: 4 days
**Goal**: Enable `fn` keyword for function definitions
**Status**: Starting 2026-02-18

---

## Overview

Phase 18 implemented basic function calls (CALL opcode), but functions had to be built-in or pre-registered. Phase 19 adds support for user-defined functions with proper definitions, parameters, and return values.

---

## Day 1: Function Definition Parsing

### Goals
- Parse `fn` keyword
- Extract function name and parameters
- Parse function body
- Build function table

### Implementation

**AST Node Addition**:
```typescript
interface FunctionDefinition {
  type: 'FunctionDefinition';
  name: string;
  params: string[];
  body: ASTNode;  // Block or single expression
}
```

**Parser Changes**:
```typescript
case 'fn':
  // fn add(a, b) { return a + b }
  // Parse: keyword, name, params, body
```

**IR Generation**:
```typescript
case 'FunctionDefinition':
  // Store function definition (not generate IR directly)
  // Generate IR for function body
```

**Function Registry**:
```typescript
class FunctionRegistry {
  register(name: string, def: FunctionDefinition): void
  lookup(name: string): FunctionDefinition | null
  getAll(): FunctionDefinition[]
}
```

### Tests (8-10)
1. Parse simple function definition
2. Parse function with multiple parameters
3. Parse function with nested expressions
4. Register function in registry
5. Lookup function by name
6. Store function body correctly
7. Handle duplicate function names
8. Parse return statement
9. Parse function with if/else in body
10. Parse function with loops

---

## Day 2: Function Execution

### Goals
- Execute defined functions
- Handle parameter passing
- Manage local variable scope
- Support return statements

### Implementation

**Parameter Handling**:
```typescript
// When calling: add(5, 3)
// 1. Push arguments to stack
// 2. Create local scope with params
// 3. Execute body
// 4. Extract return value
```

**Local Scope Management**:
```typescript
class LocalScope {
  parent: LocalScope | null
  variables: Map<string, unknown>

  get(name: string): unknown
  set(name: string, value: unknown): void
}
```

**Return Statement**:
```typescript
interface ReturnStatement {
  type: 'ReturnStatement';
  value: ASTNode;
}

// IR: RETURN (pops from stack as return value)
```

**VM Modifications**:
```typescript
// In VM.run():
case Op.CALL:
  // Look up function definition
  // Push local scope
  // Create parameters from arguments
  // Execute function body
  // Pop scope and return value
```

### Tests (8-10)
1. Call simple function with no params
2. Call function with parameters
3. Function returns correct value
4. Function with multiple parameters
5. Function modifies local variables
6. Nested function calls
7. Function with if statement in body
8. Function with loop in body
9. Return statement extracts value
10. Function with arithmetic in return

---

## Day 3: Advanced Features

### Goals
- Support nested function definitions
- Enable recursion
- Optional: closures

### Implementation

**Nested Functions**:
```typescript
// fn outer() {
//   fn inner() { return 5 }
//   return inner()
// }
```

**Recursion Support**:
```typescript
// fn factorial(n) {
//   if (n <= 1) { return 1 }
//   return n * factorial(n - 1)
// }
```

**Scope Chain**:
```typescript
// Global scope → Function scope → Nested function scope
// Variable lookup walks chain upward
```

### Tests (8-10)
1. Define nested function
2. Call nested function
3. Closure captures outer variables
4. Recursive factorial function
5. Recursive fibonacci
6. Tail recursion (if optimized)
7. Multiple nested levels
8. Shadowing outer variables
9. Recursion with arrays
10. Recursion with strings

---

## Day 4: Integration & Testing

### Goals
- Full integration with Phase 18
- Comprehensive test suite
- Performance benchmarking
- Error handling

### Implementation

**Integration Points**:
- CLI: `freelang run file.free` with function definitions
- Parser: Handle `fn` in program text
- Generator: Support function definitions
- VM: Execute user-defined functions
- Tests: 15+ comprehensive tests

**Error Cases**:
- Undefined function call → Error
- Wrong number of arguments → Error
- Duplicate function definition → Warning or error
- Recursion depth exceeded → Stack error

### Tests (15+)
1. Full program with function definitions
2. Multiple functions in one program
3. Call function before definition (error)
4. Call undefined function (error)
5. Function with wrong arg count (error)
6. Function name same as built-in (shadowing)
7. Chain of function calls
8. Recursive functions
9. Functions modifying global state
10. Functions with all feature types
11. Program with mixed functions and direct code
12. Function definitions in program
13. CLI execution with functions
14. Performance: 100 function definitions
15. Stability: 1000 programs with functions

---

## Architecture

### Function Definition Flow

```
Source Code
    ↓
Parser (parseProgram)
    ↓
FunctionDefinitions (collected)
    ↓
FunctionRegistry (stored)
    ↓
Program Execution (with functions available)
    ↓
CALL opcode → Look up function → Execute
```

### IR for Function Definition

```typescript
// fn add(a, b) { return a + b }
// IR:
[
  { op: Op.FUNC_DEF, arg: { name: 'add', params: ['a', 'b'], body: [...] } },
  // Rest of program
]
```

Or simpler: Don't generate IR for function definitions, just register them.

### Execution Model

```
Global scope (variables and functions)
  ↓
Function call CALL "add"
  ↓
Push arguments [3, 5]
  ↓
Create local scope { a: 3, b: 5 }
  ↓
Execute function body (BinaryOp a + b)
  ↓
Return value (8)
  ↓
Pop local scope
  ↓
Continue execution
```

---

## Files to Create/Modify

### New Files
- `src/parser/function-registry.ts` - FunctionRegistry class
- `src/parser/function-parser.ts` - parseFunction()
- `tests/phase-19-day1-parsing.test.ts` - Function parsing tests
- `tests/phase-19-day2-execution.test.ts` - Function execution tests
- `tests/phase-19-day3-advanced.test.ts` - Advanced features
- `tests/phase-19-day4-integration.test.ts` - Integration tests

### Modified Files
- `src/codegen/ir-generator.ts` - Add FunctionDefinition case
- `src/vm.ts` - Add CALL handling for user functions
- `src/types.ts` - Add function-related types
- `src/cli/runner.ts` - Parse and register functions
- `tests/phase-18.test.ts` - Ensure compatibility

---

## Success Criteria

- [ ] 40+ tests passing (Day 1-4)
- [ ] User-defined functions working
- [ ] Parameter passing correct
- [ ] Return values correct
- [ ] Recursion working
- [ ] No Phase 18 regression
- [ ] Performance <10ms for function calls
- [ ] Full documentation

---

## Timeline

| Day | Focus | Tests | Hours |
|-----|-------|-------|-------|
| 1 | Function parsing | 10 | 3 |
| 2 | Function execution | 10 | 3 |
| 3 | Advanced features | 10 | 3 |
| 4 | Integration & test | 15 | 3 |
| **Total** | **Full feature** | **45** | **12** |

---

## Next Phase (Phase 20)

**Potential enhancements after Phase 19**:
1. Type annotations (fn add(a: number, b: number): number)
2. Function overloading
3. Higher-order functions (functions as parameters)
4. Arrow functions (short syntax)
5. Default parameters
6. Variadic functions
7. Anonymous functions
8. Lambda expressions

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Scope management bugs | Comprehensive tests for nested scopes |
| Stack overflow from recursion | Add recursion depth limit |
| Parameter passing errors | Detailed test cases for various argument types |
| Phase 18 regression | Run all Phase 18 tests after each change |
| Performance degradation | Benchmark function calls |
| Parser conflicts | Clear fn syntax, avoid ambiguity |

---

## Notes

- Keep Phase 18 compatibility (all 115 tests must still pass)
- Functions are first-class (can be stored in variables in future)
- No closures in Phase 19 (can add in Phase 20)
- Simple parameter passing (positional, not keyword)
- Single return value (not tuple unpacking)
