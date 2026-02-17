# Phase 5 Stage 3.2: Full Variable Type Inference

**Date**: 2026-02-17
**Status**: 🚀 Starting Implementation
**Goal**: Enable type inference for variables in function bodies (confidence-based)

---

## Overview

Stage 3.2 extends the type inference system to work with **variable declarations in function bodies**. Currently, types must be explicitly written. With Stage 3.2, developers can omit types and let the system infer them based on assignments and usage patterns.

### Key Innovation

**Confidence-based type omission**:
```freelang
# Before Stage 3.2
fn process_array
  input: arr
  do
    total: number = 0           # Type required
    for item in arr             # Type required
      total = total + item
    return total

# After Stage 3.2
fn process_array
  input: arr
  do
    total = 0                   # Type inferred as number (confidence: 0.95)
    for item in arr             # Type inferred from arr type
      total = total + item
    return total
```

---

## Current State Analysis

### What Works (Phase 5 Stage 1-2)

✅ **AdvancedTypeInferenceEngine** can infer:
- Literal assignments (`x = 5` → number)
- Method calls (`arr.push()` → array)
- Operations (`a + b` → numeric)
- Control flow (if/else branches)
- Transitive inference (`y = x`, x is number → y is number)
- Function call return types

✅ **AIFirstTypeInferenceEngine** combines 6 sources:
- Semantic analysis (0.30 weight)
- Function names (0.20)
- Variable names (0.20)
- Comments (0.10)
- Context (0.10)
- Domain (0.10)

### What's Missing

❌ **Variable inference in function bodies**:
- Parser accepts types but doesn't infer when omitted
- No confidence scoring at point of variable declaration
- No feedback mechanism for variable types
- No body analysis integration

---

## Implementation Strategy

### Phase 3.2.1: Variable Inference Integration (Week 1)

**Goal**: Use AdvancedTypeInferenceEngine to infer variable types in body

#### Step 1: Extend BodyAnalyzer

**File**: `src/analyzer/body-analyzer.ts` (modify existing)

Add method: `inferVariableTypes(body: string): Map<string, VariableTypeInfo>`

```typescript
interface VariableTypeInfo {
  name: string;
  inferredType: string;          // Inferred type (or empty)
  confidence: number;             // 0.0-1.0
  source: string;                 // 'assignment', 'method', 'operation', etc
  reasoning: string[];            // Why this type
  recommendation: string;         // User guidance
}
```

**Logic**:
1. Parse body using regex patterns (conservative)
2. Extract variable declarations: `let x = 5`, `let arr = []`, etc.
3. Use AdvancedTypeInferenceEngine to infer type for each
4. Return Map of variable → VariableTypeInfo

#### Step 2: Modify CodeGenerator

**File**: `src/codegen/code-generator.ts` (modify)

When generating variable declarations:
```typescript
// Current (always output explicit type)
let total: number = 0;

// New (output comment with confidence)
let total = 0;  // Inferred: number (95% confidence)
```

#### Step 3: Create Variable Type Recommendation

**File**: `src/analyzer/variable-type-recommender.ts` (NEW, 120 LOC)

Provides recommendations:
```typescript
class VariableTypeRecommender {
  recommendOmitType(info: VariableTypeInfo): boolean {
    // Return true if confidence >= 0.70
    return info.confidence >= 0.70;
  }

  generateComment(info: VariableTypeInfo): string {
    return `// Inferred: ${info.inferredType} (${Math.round(info.confidence * 100)}%)`;
  }
}
```

---

### Phase 3.2.2: Parser Integration (Week 1)

**Goal**: Update parser to accept variables without explicit types

#### Step 1: Extend parseVariableDeclaration()

**File**: `src/parser/parser.ts` (or create `src/parser/statement-parser.ts` extension)

Current behavior (required type):
```
let x: number = 5
```

New behavior (optional type):
```
let x = 5  # Type will be inferred
```

**Implementation**:
```typescript
private parseVariableDeclaration(): VariableDeclaration {
  this.expect(TokenType.LET);
  const name = this.expect(TokenType.IDENT);

  // Phase 3.2: Optional type
  let type: string | undefined;
  if (this.match(TokenType.COLON)) {
    type = this.parseType();
  }
  // If type omitted, will be inferred later

  this.expect(TokenType.ASSIGN);
  const value = this.parseExpression();

  return { name, type, value };  // type can be undefined
}
```

#### Step 2: Body Parser Updates

**File**: `src/parser/block-parser.ts` (modify)

When parsing function body:
```typescript
// After parsing body string, attempt to infer variable types
if (this.body) {
  this.inferredVariableTypes = this.inferVariableTypes(this.body);
}
```

---

### Phase 3.2.3: E2E Integration (Week 2)

**Goal**: Full pipeline from code to type inference

#### Data Flow

```
.free Code
  ↓
Parser (parse variable declarations with optional types)
  ↓
AdvancedTypeInferenceEngine (infer types from body)
  ↓
VariableTypeRecommender (decide whether to output type)
  ↓
CodeGenerator (output with/without explicit type)
  ↓
Final Code
```

#### Integration Points

1. **Parser** → **BodyAnalyzer**: Body string for analysis
2. **BodyAnalyzer** → **AdvancedTypeInferenceEngine**: Infer types
3. **AdvancedTypeInferenceEngine** → **VariableTypeRecommender**: Get recommendation
4. **VariableTypeRecommender** → **CodeGenerator**: Type explicit or commented

---

## Test Coverage Plan

### Test Categories (20 tests total)

#### Category 1: Literal Type Inference (4 tests)
```freelang
# Number
total = 0                          # Inferred: number
total = 3.14                       # Inferred: number
x = 5 + 10                         # Inferred: number

# String
msg = "hello"                      # Inferred: string
name = "Alice"                     # Inferred: string

# Array
items = []                         # Inferred: array<unknown>
arr = [1, 2, 3]                    # Inferred: array<number>

# Boolean
flag = true                        # Inferred: boolean
```

**Tests**: 4
- Literal number inference
- Literal string inference
- Literal array inference
- Literal boolean inference

#### Category 2: Operation-Based Inference (3 tests)
```freelang
x = 5
y = 10
z = x + y                          # Inferred: number

s = "hello"
t = " world"
result = s + t                     # Inferred: string

arr = [1, 2]
total = arr[0] + 10                # Inferred: number
```

**Tests**: 3
- Arithmetic operation type inference
- String concatenation type inference
- Array element operation inference

#### Category 3: Method Call Inference (3 tests)
```freelang
arr = []
arr.push(5)                        # arr: array<unknown>

str = "text"
len = str.length                   # Inferred: number

nums = [1, 2, 3]
result = nums.map(...)             # Inferred: array<unknown>
```

**Tests**: 3
- Array method detection
- String method detection
- Array transformation method detection

#### Category 4: Control Flow Inference (3 tests)
```freelang
if (condition)
  x = 5
else
  x = 10
# x: number (both branches same type)

if (condition)
  y = "text"
else
  y = 42
# y: unknown (branches differ)
```

**Tests**: 3
- Same type in both branches
- Different types in branches
- Type narrowing in conditionals

#### Category 5: Loop Variable Inference (3 tests)
```freelang
for i in 0..10
  total = total + i                # i: number (from range)

for item in arr
  process(item)                    # item: inferred from arr type

arr2 = []
for x in arr2
  x = x * 2                        # x: number (from assignment)
```

**Tests**: 3
- Range iteration variable type
- Array iteration variable type
- Loop variable type refinement

#### Category 6: Transitive/Chain Inference (2 tests)
```freelang
x = 5
y = x
z = y                              # All are number

arr = []
arr2 = arr
arr3 = arr2                        # All are array
```

**Tests**: 2
- Multi-hop transitive inference
- Array type propagation

#### Category 7: Confidence Scoring (2 tests)
```freelang
x = 5          # Confidence: 0.95 (literal, clear)
y = func()     # Confidence: 0.60 (function result, uncertain)
z = x or y     # Confidence: 0.50 (conditional, union possible)
```

**Tests**: 2
- High-confidence literal inference
- Low-confidence function result inference

---

## File Structure

### New Files (3 files, ~270 LOC)

1. **src/analyzer/variable-type-recommender.ts** (120 LOC)
   - `VariableTypeRecommender` class
   - `recommendOmitType(info): boolean`
   - `generateComment(info): string`
   - `shouldShowConfidence(confidence): boolean`

2. **tests/phase-5-stage-3-2-variable-inference.test.ts** (150 LOC, 20 tests)
   - All test categories listed above
   - Real-world examples
   - Edge cases

### Modified Files (3 files, ~150 LOC)

1. **src/parser/parser.ts** (~50 LOC)
   - Make variable type optional in declaration
   - Update parseVariableDeclaration()
   - Add inferredVariableTypes field

2. **src/analyzer/body-analyzer.ts** (~60 LOC)
   - Add inferVariableTypes() method
   - Integrate AdvancedTypeInferenceEngine
   - Return VariableTypeInfo map

3. **src/codegen/code-generator.ts** (~40 LOC)
   - Output inferred type as comment
   - Respect VariableTypeRecommender
   - Add confidence indicators

---

## Success Criteria

✅ All 20 new tests passing
✅ Backward compatibility: all existing tests still pass
✅ Confidence scoring accurate (±5% vs measured)
✅ Variable types correctly inferred in function bodies
✅ Comments show confidence and reasoning
✅ Performance: <3ms per function (small overhead for inference)

---

## Example: Before & After

### Before Stage 3.2
```freelang
fn process_data
  input: arr
  output: number
  intent: "Calculate sum of array"
  do
    total: number = 0              # Type explicitly required
    for item in arr                # Type explicitly required
      total = total + item
    return total
```

### After Stage 3.2
```freelang
fn process_data
  input: arr
  output: number
  intent: "Calculate sum of array"
  do
    total = 0                      # Type inferred from literal (95%)
    for item in arr                # Type inferred from arr (85%)
      total = total + item
    return total
```

**Generated Comment** (if --show-confidence flag):
```freelang
fn process_data
  input: arr
  output: number
  intent: "Calculate sum of array"
  do
    total = 0                      // Inferred: number (95% confidence)
    for item in arr                // Inferred from arr type (85%)
      total = total + item
    return total
```

---

## Integration with Stage 2 Semantic Analysis

**Synergy**: Stage 3.2 uses Stage 2's semantic analysis results

```
AIFirstTypeInferenceEngine (Stage 2)
  ↓ (infer function signature)
AdvancedTypeInferenceEngine (Stage 1)
  ↓ (infer variable types in body)
VariableTypeRecommender (Stage 3.2 NEW)
  ↓ (decide type omission)
CodeGenerator
  ↓
Final optimized code
```

---

## Risk Mitigation

### Risk 1: Incorrect Type Inference
**Mitigation**: Show confidence score, allow users to verify
- High confidence (≥0.80): safe to omit type
- Medium confidence (0.60-0.79): show in comment
- Low confidence (<0.60): require explicit type

### Risk 2: Performance Degradation
**Mitigation**: Cache inference results
- Memoize AdvancedTypeInferenceEngine results
- Lazy evaluation for body analysis
- Target: <3ms overhead per function

### Risk 3: Conflicting Type Inference
**Mitigation**: Precedence order
1. Explicit type annotation (highest priority)
2. VariableTypeRecommender suggestion
3. Default to unknown (conservative)

---

## Next Steps (Implementation Order)

### Day 1: Foundation
- [ ] Create VariableTypeRecommender class
- [ ] Add inferVariableTypes() to BodyAnalyzer
- [ ] Write 10 unit tests (pass 1)

### Day 2: Parser Integration
- [ ] Modify parseVariableDeclaration() for optional types
- [ ] Update block-parser to infer types
- [ ] Write 10 more unit tests (pass 2)

### Day 3: E2E & Polish
- [ ] Update CodeGenerator for type comments
- [ ] E2E integration tests
- [ ] Documentation and examples

---

## Acceptance Criteria

- [ ] All 20 new tests passing (100%)
- [ ] All 1,852 existing tests still passing
- [ ] Confidence scores ±5% accuracy
- [ ] Variable types correctly inferred
- [ ] No performance regression
- [ ] Code well-documented
- [ ] Examples in README updated

---

## Notes

- Stage 3.2 is **optional enhancement**, not required for Phase 5 completion
- Can skip to Stage 3.3 (Skeleton Functions) if needed
- Confidence thresholds (0.70) are conservative and can be tuned based on user feedback
- Type omission is **opt-in** - explicit types always work
