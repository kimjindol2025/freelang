# Task B: Implementation Checklist

**Status**: Ready for Development
**Target Completion**: 6-7 hours
**Phases**: B-1, B-2, B-3, B-4

---

## Pre-Implementation

- [ ] Read `TYPE_SYSTEM_ENHANCEMENT_ANALYSIS.md` (30 min)
- [ ] Read `TYPE_SYSTEM_IMPLEMENTATION_GUIDE.md` (15 min)
- [ ] Review quick reference: `TASK_B_QUICK_REFERENCE.md` (5 min)
- [ ] Verify existing test suite runs: `npm test`
- [ ] Check current maturity level: 3.0
- [ ] Set up IDE with TypeScript support
- [ ] Create feature branch: `git checkout -b feat/type-system-enhancement`

**Subtotal**: 50 min + verification

---

## Phase B-1: Generic<T> Integration (90 min)

### 1.1 Parser - parseTypeParams() (50 min)

**File**: `/src/parser/parser.ts`

- [ ] Add `parseTypeParams()` method (~40 lines)
  - [ ] Check for `<` token
  - [ ] Parse type parameter names (T, U, K, etc.)
  - [ ] Handle optional `extends` constraints
  - [ ] Parse comma-separated list
  - [ ] Expect closing `>`

- [ ] Verify method compiles without errors
- [ ] Test with simple input: `<T>`
- [ ] Test with constraints: `<T extends number>`
- [ ] Test with multiple: `<T, U, V>`

**Checklist**:
```
[ ] Method added
[ ] Compiles
[ ] Simple test passes
[ ] Constraint test passes
[ ] Multiple params test passes
```

**Time**: 50 min

---

### 1.2 AST Update (10 min)

**File**: `/src/parser/ast.ts`

- [ ] Add `TypeParameter` interface
  ```typescript
  export interface TypeParameter {
    name: string;
    constraint?: TypeAnnotation;
  }
  ```
- [ ] Update `FunctionStatement` with `typeParams?: TypeParameter[]` field
- [ ] Verify type definitions compile

**Checklist**:
```
[ ] TypeParameter interface added
[ ] FunctionStatement updated
[ ] Compiles without errors
```

**Time**: 10 min

---

### 1.3 Type Checker - TypeEnvironment (30 min)

**File**: `/src/analyzer/type-checker.ts`

- [ ] Add `TypeEnvironment` class (~120 lines)
  - [ ] `bind(typeVar: string, concreteType: string)` method
  - [ ] `lookup(typeVar: string)` method
  - [ ] `substitute(type: string)` method with caching
  - [ ] `addConstraint()` method
  - [ ] `solveConstraints()` method
  - [ ] Subtyping rules: `isSubtypeOf()`, `isSupertypeOf()`

- [ ] Test TypeEnvironment:
  ```typescript
  const env = new TypeEnvironment();
  env.bind('T', 'int');
  expect(env.substitute('array<T>')).toBe('array<int>');
  ```

**Checklist**:
```
[ ] TypeEnvironment class added
[ ] All methods implemented
[ ] Substitution tests pass
[ ] Constraint solving tests pass
[ ] Subtyping rules work
```

**Time**: 30 min

---

### 1.4 Generic Function Checking (10 min)

**File**: `/src/analyzer/type-checker.ts`

- [ ] Add `checkGenericFunctionCall()` method to `FunctionTypeChecker`
  - [ ] Create type environment
  - [ ] Bind type arguments
  - [ ] Substitute parameter types
  - [ ] Check argument compatibility
  - [ ] Solve constraints

- [ ] Add `inferTypeArguments()` method (optional, for implicit inference)

**Checklist**:
```
[ ] checkGenericFunctionCall() added
[ ] Type substitution verified
[ ] Argument checking works
[ ] Constraint solving verified
[ ] inferTypeArguments() optional
```

**Time**: 10 min

---

### Phase B-1 Summary

**Total Time**: 90 min

**Verification**:
```bash
npx tsc --noEmit              # Should compile
npm test                      # Existing tests pass
```

**Expected**: ✅ Generic<T> parsing and type checking working

---

## Phase B-2: Union & Discriminated Union (90 min)

### 2.1 Parser - Union Type Parsing (40 min)

**File**: `/src/parser/parser.ts`

- [ ] Update `parseType()` method
  - [ ] Parse basic type
  - [ ] Check for `|` operator
  - [ ] Parse union members
  - [ ] Return `{ type: 'union', members: [...] }`

- [ ] Create `parseBasicType()` helper method
  - [ ] Handle identifiers
  - [ ] Handle generics: `array<T>`
  - [ ] Handle function types: `fn(...) -> ...`

- [ ] Test union parsing:
  ```
  string | number
  int | string | boolean
  array<int> | null
  ```

**Checklist**:
```
[ ] parseType() enhanced
[ ] parseBasicType() added
[ ] Simple union parses
[ ] Multiple union parses
[ ] Generic union parses
[ ] Compiles without errors
```

**Time**: 40 min

---

### 2.2 Parser - Discriminated Union & Patterns (25 min)

**File**: `/src/parser/parser.ts`

- [ ] Add `parsePattern()` method (~60 lines)
  - [ ] Wildcard pattern: `_`
  - [ ] Literal pattern: `42`, `"hello"`
  - [ ] Variable pattern: `x`
  - [ ] Struct pattern: `Success(v)`, `Error(msg)`
  - [ ] Array pattern: `[a, b, c]`

- [ ] Add `parseFunctionType()` helper
  - [ ] Parse parameter types
  - [ ] Parse return type

- [ ] Test pattern matching:
  ```
  Success(value) => ...
  Error(msg) => ...
  [a, b] => ...
  ```

**Checklist**:
```
[ ] parsePattern() added
[ ] Wildcard works
[ ] Literal works
[ ] Variable works
[ ] Struct pattern works
[ ] Array pattern works
[ ] Compiles
```

**Time**: 25 min

---

### 2.3 Type Checker - Union Compatibility (15 min)

**File**: `/src/analyzer/type-checker.ts`

- [ ] Add `checkUnionTypeCompatibility()` method
  - [ ] Check if value type in union members
  - [ ] Return compatibility result

- [ ] Add `narrowUnionType()` method
  - [ ] Narrow union based on pattern
  - [ ] Bind variables from pattern

**Checklist**:
```
[ ] checkUnionTypeCompatibility() works
[ ] narrowUnionType() works
[ ] Type narrowing verified
[ ] Pattern binding works
[ ] Compiles
```

**Time**: 15 min

---

### 2.4 Type Checker - Pattern Matching (10 min)

**File**: `/src/analyzer/type-checker.ts`

- [ ] Add `checkPatternMatchArm()` method
  - [ ] Verify pattern matches value type
  - [ ] Bind variables from pattern
  - [ ] Return narrowed type

**Checklist**:
```
[ ] checkPatternMatchArm() works
[ ] Pattern verification works
[ ] Variable binding works
[ ] Compiles
```

**Time**: 10 min

---

### Phase B-2 Summary

**Total Time**: 90 min

**Verification**:
```bash
npx tsc --noEmit
npm test
```

**Expected**: ✅ Union and discriminated union types fully supported

---

## Phase B-3: Type Validation Strengthening (120 min)

### 3.1 Type Checker - Strict Checking (45 min)

**File**: `/src/analyzer/type-checker.ts`

- [ ] Add `checkVariableDeclaration()` method
  - [ ] Handle undefined type (inference mode)
  - [ ] Handle declared type
  - [ ] Check compatibility
  - [ ] Return detailed error

- [ ] Add `typeToString()` helper
  - [ ] Handle basic types: `'int'`
  - [ ] Handle union: `'string | number'`
  - [ ] Handle generic: `'array<int>'`

- [ ] Add `checkFunctionArguments()` method
  - [ ] Check argument count
  - [ ] Check each argument type
  - [ ] Return array of results

**Checklist**:
```
[ ] checkVariableDeclaration() works
[ ] typeToString() handles all types
[ ] Type mismatch detected
[ ] checkFunctionArguments() works
[ ] Arg count mismatch detected
[ ] Arg type mismatch detected
[ ] Compiles
```

**Time**: 45 min

---

### 3.2 Error Formatter & Suggestions (45 min)

**File**: `/src/analyzer/type-checker.ts`

- [ ] Add `TypeErrorFormatter` class (~100 lines)
  - [ ] `formatTypeError()` method
    - [ ] Location info [line:col]
    - [ ] Context (function/variable)
    - [ ] Main error message
    - [ ] Expected vs Received details
    - [ ] Code snippet
    - [ ] Suggestions

  - [ ] `generateSuggestions()` method
    - [ ] String to number: `parseInt()`
    - [ ] Number to string: `str()`
    - [ ] Generic instantiation
    - [ ] Array type suggestions
    - [ ] Union member suggestions

  - [ ] `generateErrorReport()` method
    - [ ] Format multiple errors
    - [ ] Pretty print

**Checklist**:
```
[ ] TypeErrorFormatter class added
[ ] formatTypeError() works
[ ] Location formatting works
[ ] Details section works
[ ] Code snippet works
[ ] generateSuggestions() works
[ ] String->number suggestion works
[ ] Number->string suggestion works
[ ] Generic suggestion works
[ ] Error report format works
[ ] Compiles
```

**Time**: 45 min

---

### 3.3 Constraint Checking (30 min)

**File**: `/src/analyzer/type-checker.ts`

- [ ] Add `ConstraintChecker` class (~50 lines)
  - [ ] `addConstraint()` method
  - [ ] `checkConstraint()` method
  - [ ] `isSubtypeOf()` method
  - [ ] `isSupertypeOf()` method

- [ ] Test constraints:
  ```
  T extends number
  T super string
  ```

**Checklist**:
```
[ ] ConstraintChecker added
[ ] addConstraint() works
[ ] checkConstraint() works
[ ] extends constraint works
[ ] super constraint works
[ ] Compiles
```

**Time**: 30 min

---

### Phase B-3 Summary

**Total Time**: 120 min

**Verification**:
```bash
npx tsc --noEmit
npm test
```

**Expected**: ✅ Type validation with helpful error messages

---

## Phase B-4: Testing & Integration (60 min)

### 4.1 Test Suite Creation (40 min)

**File**: `/test/type-system.test.ts` (NEW)

Create comprehensive test suite with:

**B-1 Tests (Generics)** - 5 tests
- [ ] Parse `fn<T>(x: T) -> T`
- [ ] Parse `fn<T,U>(...)`
- [ ] Generic function call checking
- [ ] Type mismatch detection
- [ ] Constraint satisfaction

**B-2 Tests (Union)** - 5 tests
- [ ] Parse `string | number`
- [ ] Union type compatibility ✓
- [ ] Union type incompatibility ✗
- [ ] Discriminated union parsing
- [ ] Pattern match narrowing

**B-3 Tests (Validation)** - 5 tests
- [ ] Variable type mismatch
- [ ] Type annotation verification
- [ ] Function argument mismatch
- [ ] Error message formatting
- [ ] Type suggestions

**Checklist**:
```
[ ] All 15 tests written
[ ] All tests pass
[ ] Coverage > 80%
[ ] No regressions
```

**Time**: 40 min

---

### 4.2 Integration & Verification (20 min)

- [ ] Run all tests: `npm test`
- [ ] Check no regressions
- [ ] Verify coverage: `npm run coverage`
- [ ] Check performance impact (< 5%)
- [ ] Manual testing of examples

**Checklist**:
```
[ ] All tests pass
[ ] No regressions
[ ] Coverage > 80%
[ ] Performance OK
[ ] Examples work
```

**Time**: 20 min

---

### Phase B-4 Summary

**Total Time**: 60 min

**Expected**: ✅ 15+ tests passing, full coverage

---

## Final Commit

### Before Commit
- [ ] `npx tsc --noEmit` - No errors
- [ ] `npm test` - All tests pass
- [ ] `npm run coverage` - Coverage adequate
- [ ] Code review: Self-check for quality
- [ ] No console.log() left in code

### Commit Message
```
feat: Type System 강화 - Generics + Union Types + Validation

Features:
- B-1: Generic<T> parser integration (fn<T>(x:T)->T)
- B-2: Union & discriminated union types (Result<T,E>)
- B-3: Type validation strengthening (strict checking)
- B-4: Comprehensive test suite (15+ tests)

Changes:
- /src/parser/parser.ts: +150 lines (parseTypeParams, parseType, parsePattern)
- /src/analyzer/type-checker.ts: +400 lines (TypeEnvironment, error formatter)
- /src/parser/ast.ts: +30 lines (TypeParameter interface)
- /test/type-system.test.ts: +400 lines (test suite)

Maturity: 3.0 → 3.5 (+20%)
Tests: 15/15 passing
Coverage: >80%
Performance: +0% (no regression)

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

**Checklist**:
```
[ ] All criteria met
[ ] Commit message written
[ ] Ready to push
```

---

## Time Summary

| Phase | Time |
|-------|------|
| Pre-Implementation | 50 min |
| B-1: Generics | 90 min |
| B-2: Union Types | 90 min |
| B-3: Validation | 120 min |
| B-4: Testing | 60 min |
| **Total** | **410 min (~6.8 hours)** |

---

## Quick Navigation

- **Analysis**: `TYPE_SYSTEM_ENHANCEMENT_ANALYSIS.md`
- **Implementation**: `TYPE_SYSTEM_IMPLEMENTATION_GUIDE.md`
- **Reference**: `TASK_B_QUICK_REFERENCE.md`
- **Summary**: `TASK_B_SUMMARY.md`
- **This**: `TASK_B_IMPLEMENTATION_CHECKLIST.md`

---

## Success Criteria (Final Check)

### All Must Pass
- [ ] Generic<T> functions parse and typecheck
- [ ] Union types work with pattern matching
- [ ] Discriminated unions narrow correctly
- [ ] Type validation catches errors
- [ ] Error messages have suggestions
- [ ] 15+ tests pass
- [ ] No regressions
- [ ] Performance < 5% impact
- [ ] Code quality verified

### Expected Result
```
Maturity: 3.0 → 3.5 ✅
Type Safety: Enhanced ✅
Developer Experience: Improved ✅
Performance: Maintained ✅
Test Coverage: >80% ✅
```

---

## Pro Tips

1. **Start early with Phase B-1** - It's the foundation
2. **Test after each method** - Don't accumulate errors
3. **Reference QUICK_REFERENCE.md** - It has all code templates
4. **Use test-driven approach** - Write tests first
5. **Keep TypeScript strict** - Catch errors early
6. **Document as you go** - Comments help

---

**Let's ship it! 🚀**

Last Updated: 2026-03-06
