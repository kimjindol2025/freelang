# Phase 16: Native Code Generation via Zig Compiler 🚀

## Overview

Extend FreeLang IR compilation from LLVM to Zig language, enabling native code generation with better cross-platform support and compile-time safety.

**Status**: 🟡 Development Planning (Ready to Start)
**Duration**: 9-10 days total
**Target**: v2.1.0 (with Zig backend)

---

## Architecture

### Current State (Phase 14)
```
FreeLang IR → LLVM IR → (Can't compile without LLVM toolchain)
```

### Phase 16 Target
```
FreeLang IR → Zig Code → (zig cc) → Native Binary
           ↓           ↓
         Human         Portable
         Readable      Everywhere
```

### Why Zig?

| Aspect | LLVM | Zig | Benefit |
|--------|------|-----|---------|
| **Code Gen** | IR-based | High-level → AST | More readable, debuggable |
| **Toolchain** | Complex | Self-contained | No external deps |
| **Compile** | LLVMC | zig cc | Cross-platform automatic |
| **Type Safety** | Limited | Excellent | Catch errors early |
| **Learning Curve** | Steep | Gentler | Faster development |

---

## Implementation Plan

### Phase 16-1: Zig Compiler Core (3-4 days, 250 LOC)

**File**: `src/compiler/zig-compiler.ts`

**Components**:

#### 1. IR to Zig AST Transformation
```typescript
interface ZigASTNode {
  type: 'decl' | 'expr' | 'stmt' | 'type';
  name?: string;
  body?: ZigASTNode[];
  value?: any;
}

class ZigCompiler {
  // Phase 14 IR → Phase 16 Zig AST
  transformIR(instrs: Inst[]): ZigASTNode[];

  // Specific transforms
  transformStack(instrs: Inst[]): ZigASTNode;     // Stack ops → Zig arrays
  transformCallGraph(funcs: Map<...>): ZigASTNode[]; // Functions
  transformTypes(types: TypeInfo[]): ZigASTNode[]; // Type decls
}
```

#### 2. Opcodes to Zig Statements
```typescript
Op.PUSH   → local var initialization
Op.POP    → discard/unused
Op.ADD    → + operator (with overflow checking)
Op.LOAD   → var access
Op.STORE  → var assignment
Op.CALL   → function call
Op.RET    → return statement
Op.JMP    → if/else or loop
```

#### 3. Memory Safety Layer
```typescript
// Zig has bounds checking by default
// FreeLang stack → Zig ArrayList<Value>
// Benefits: No segfaults, better debugging
```

**Tests**: phase-16-zig-compiler.test.ts (20 tests)
- Basic opcodes (5)
- Function calls (5)
- Type mapping (5)
- Edge cases (5)

---

### Phase 16-2: String Optimization (2-3 days, 120 LOC)

**File**: `src/codegen/string-optimization.ts`

**Problem**:
- FreeLang strings → Zig string literals (no optimization)
- String concatenation duplicates memory
- Pattern: `s1 + s2 + s3` → 3 allocations (Zig)

**Solution**:

```typescript
class StringOptimizer {
  // Detect string concatenation patterns
  detectConcatChain(expr: ZigASTNode[]): boolean;

  // Transform: s1 + s2 + s3 → StringBuilder pattern
  optimizeConcatenation(chain: ZigASTNode[]): ZigASTNode;

  // Intern string literals
  internStrings(nodes: ZigASTNode[]): ZigASTNode[];
}

// Example:
// Input:  a + b + c + d (4 allocations)
// Output: StringBuilder.append(a).append(b).append(c).append(d).build() (1 alloc)
```

**Benefit**:
- 60-80% string memory reduction
- 3-5x faster string operations
- Compatible with Zig's string handling

**Tests**: phase-16-string-optimization.test.ts (10 tests)
- Single concat (2)
- Chain concat (3)
- Mixed literals (2)
- Edge cases (3)

---

### Phase 16-3: Testing & Validation (2-3 days, 120 LOC + E2E)

**File**: `tests/phase-16-native.test.ts`

**Test Categories**:

#### 1. Compilation Tests (5)
```typescript
✓ Simple program compiles to Zig
✓ Functions compile correctly
✓ Type system maps correctly
✓ Memory safety checks included
✓ Optimizations applied
```

#### 2. Correctness Tests (5)
```typescript
✓ Zig output = expected behavior
✓ Stack operations equivalent
✓ Function calls match semantics
✓ Type conversions correct
✓ Edge cases handled
```

#### 3. Performance Tests (3)
```typescript
✓ Compile time < 500ms
✓ Generated code optimization check
✓ Memory usage reasonable
```

#### 4. Integration Tests (2)
```typescript
✓ End-to-end: FreeLang → Zig → Binary
✓ Binary execution matches VM result
```

**Expected Results**:
```
Tests:        15/15 passing (100%)
Compilation:  < 500ms per program
Generated:    < 2KB per 100 ops (minified Zig)
Correctness:  100% behavior match with Phase 4 VM
```

---

## Module Dependencies

### New Modules
- `src/compiler/zig-compiler.ts` - Core compiler
- `src/codegen/string-optimization.ts` - Optimization pass
- `tests/phase-16-native.test.ts` - Full test suite

### Existing Dependencies
- ✅ `src/types/` - Type definitions (reuse)
- ✅ `src/phase-14-llvm/` - ADCE, constant folding (adapt)
- ✅ `src/vm.ts` - VM for correctness verification

### External Dependencies
- ❌ **zig** compiler (optional, for actual compilation)
  - User can run: `zig cc compiled.zig`
  - We generate `.zig` files only

---

## Development Timeline

```
Phase 16-1: Zig Compiler (Days 1-4)
├─ Day 1: IR Transform Framework
├─ Day 2-3: Opcode Mapping
├─ Day 4: Function & Type Handling
└─ Testing: 20 tests

Phase 16-2: String Optimization (Days 5-7)
├─ Day 5: Pattern Detection
├─ Day 6: Optimization Pass
├─ Day 7: Edge Cases
└─ Testing: 10 tests

Phase 16-3: Integration (Days 8-10)
├─ Day 8: E2E Compilation Pipeline
├─ Day 9: Performance Testing
├─ Day 10: Documentation
└─ Testing: 5 integration tests
```

---

## Success Criteria

### Phase 16-1: Compiler
- ✅ All IR opcodes map to Zig
- ✅ Function calls work
- ✅ Types are correct
- ✅ 20/20 tests pass

### Phase 16-2: Optimization
- ✅ String concat optimized
- ✅ Memory usage reduced 60%+
- ✅ All 10 tests pass

### Phase 16-3: Integration
- ✅ 15/15 tests pass
- ✅ Generated Zig compiles with `zig cc`
- ✅ Binary execution matches VM
- ✅ Performance benchmarks acceptable

---

## Example: Sum Function

### FreeLang IR (Phase 4)
```
Header: fn sum(a: num[], size: num) -> num
Body:
  0: PUSH 0           // accumulator = 0
  1: STORE 0          // var[0] = 0
  2: PUSH 0           // i = 0
  3: STORE 1          // var[1] = 0
  4: LOAD 1           // i
  5: LOAD 2           // size
  6: LT                // i < size?
  7: JMP_NOT 15       // if not, exit loop
  8: LOAD 0           // load accumulator
  9: LOAD 0           // load array arg
  10: LOAD 1          // load i
  11: LOAD_ARRAY      // arr[i]
  12: ADD             // accumulator += arr[i]
  13: STORE 0         // save accumulator
  14: PUSH 1, INC_LOAD 1, JMP 4
  15: LOAD 0          // return accumulator
  16: RET
```

### Generated Zig Code (Phase 16)
```zig
pub fn sum(a: []f64, size: usize) f64 {
  var accumulator: f64 = 0.0;
  var i: usize = 0;

  while (i < size) {
    accumulator += a[i];
    i += 1;
  }

  return accumulator;
}
```

### Key Transformations
```typescript
// Phase 16-1 Compiler detects:
PUSH 0, STORE 0     → var accumulator: f64 = 0.0
LOAD, LT, JMP_NOT   → while (condition) { ... }
LOAD_ARRAY          → a[i] (with bounds checking)
RET                 → return value
```

---

## Known Limitations & Mitigations

| Limitation | Impact | Mitigation |
|-----------|--------|-----------|
| Zig syntax ≠ C exactly | User learns Zig | Comprehensive docs |
| No generics in generated code | Limited reuse | Monomorphization OK |
| Compile time overhead | Slow iteration | Cache intermediate .zig |
| Requires zig toolchain | Heavier dependency | Make optional, VM fallback |

---

## Integration with Phase 14-15

### Phase 14 (LLVM)
- ✅ Keep as-is (alternative backend)
- Phase 16 Zig = **simpler, more readable** alternative
- Can coexist: User picks `backend: 'llvm'` or `backend: 'zig'`

### Phase 15 (Dynamic Arrays)
- ✅ Use Zig's `ArrayList<T>` for dynamic arrays
- Natural fit with Zig's memory model
- Better integration than C

---

## Next Steps After Phase 16

### Phase 17: WebAssembly Backend
- FreeLang IR → WASM
- Browser execution
- 400 LOC estimated

### Phase 18: Profiling & Optimization
- Branch prediction hints
- Cache locality improvements
- Vectorization hints

### Phase 19: Debugging Symbols
- Source map generation
- Line number tracking
- Better error messages

---

## Files to Create

```
src/
├─ compiler/
│  └─ zig-compiler.ts (250 LOC)
├─ codegen/
│  └─ string-optimization.ts (120 LOC)
└─ (existing files reused)

tests/
├─ phase-16-zig-compiler.test.ts (20 tests)
├─ phase-16-string-optimization.test.ts (10 tests)
└─ phase-16-native.test.ts (15 integration tests)

docs/
└─ PHASE_16_ZIG_COMPILER.md (this file, updated with implementation details)
```

---

## Checklist for Start

- [ ] Phase 15 status verified (or worked around)
- [ ] Zig language basics understood (30 min read)
- [ ] Test infrastructure ready
- [ ] Code structure planned
- [ ] Types mapped from FreeLang to Zig
- [ ] Example programs prepared

**Ready to Start**: YES ✅

---

## Summary

Phase 16 adds a **practical native code backend** to FreeLang via Zig. This complements Phase 14 (LLVM) with a more readable, safer alternative.

**Deliverables**:
- 250 LOC Zig compiler
- 120 LOC string optimization
- 15 comprehensive tests
- Full integration with Phase 4 VM

**Expected Outcome**: FreeLang programs can compile to native code through Zig without external dependencies.

