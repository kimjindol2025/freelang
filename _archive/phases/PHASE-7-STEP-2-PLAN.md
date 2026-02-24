# Phase 7 Step 2: Type System Enhancements - 계획서

**Status**: 📋 계획 단계
**Date**: February 18, 2026

---

## 개요

**Phase 7 Step 2**는 FreeLang의 **타입 시스템**을 고도화합니다.

현재 FreeLang은 기본 타입 지원이 있습니다. 이 단계에서는:
- **Union Types** - 여러 타입을 조합
- **Type Guards** - 런타임에 타입 확인
- **Advanced Generics** - 더 강력한 제네릭
- **Type Inference** - 스마트한 타입 추론

을 구현하여 **TypeScript 수준의 타입 안정성**을 달성합니다.

---

## 배경

### 현재 상태 (제한사항)

```freelang
// 현재 불가능한 코드들
fn process(value: string | number): number {
  // Union type 미지원
}

fn isString(value: unknown): boolean {
  // Type guard 미지원
  return typeof value === 'string'
}

fn map<T, U extends T>(items: T[]): U[] {
  // Constrained generics 미지원
}
```

### 목표 상태

위 코드들이 완벽하게 작동하도록 구현합니다.

---

## 구현 계획

### Step 2.1: Union Types 강화 (150 줄)

**파일**: `src/type-system/union-types.ts` (신규)

#### 2.1.1 Union Type 정의

```typescript
export interface UnionType {
  type: 'union';
  members: TypeAnnotation[];  // string | number | boolean
  discriminant?: string;      // 'kind' for discriminated unions
}

export interface DiscriminatedUnion {
  kind: 'discriminated-union';
  members: {
    [discriminantValue: string]: TypeAnnotation;
  };
}
```

#### 2.1.2 Union Type 파싱

```typescript
fn parseUnionType(typeStr: string): UnionType {
  const members = typeStr.split('|').map(t => parseType(t.trim()));
  return {
    type: 'union',
    members
  };
}
```

#### 2.1.3 Union Type 검증

```typescript
fn isAssignableToUnion(valueType: TypeAnnotation, unionType: UnionType): boolean {
  return unionType.members.some(member => isAssignable(valueType, member));
}

fn narrowUnion(unionType: UnionType, condition: Condition): TypeAnnotation {
  // Type narrowing: string | number -> string (after typeof check)
}
```

#### 2.1.4 Discriminated Unions

```freelang
// 예제
type Result =
  | { kind: 'success'; value: string }
  | { kind: 'error'; error: string }

fn handle(result: Result) {
  match result.kind {
    'success' => console.log(result.value)  // narrowed to first type
    'error' => console.log(result.error)    // narrowed to second type
  }
}
```

---

### Step 2.2: Type Guards (200 줄)

**파일**: `src/type-system/type-guards.ts` (신규)

#### 2.2.1 Built-in Type Guards

```typescript
export interface TypeGuard {
  kind: 'type-guard';
  variable: string;
  targetType: TypeAnnotation;
  condition: GuardCondition;
}

export type GuardCondition =
  | { type: 'typeof'; operator: string }      // typeof x === 'string'
  | { type: 'instanceof'; class: string }     // x instanceof User
  | { type: 'property'; property: string }    // x.kind === 'success'
  | { type: 'custom'; predicate: string }     // isUser(x)
```

#### 2.2.2 Type Refinement

```typescript
fn refineType(
  originalType: UnionType,
  guard: TypeGuard
): TypeAnnotation {
  // If originalType is string | number and guard is typeof x === 'string'
  // Return 'string' (narrowed)
}
```

#### 2.2.3 Custom Type Predicates

```freelang
// FreeLang example
fn isUser(value: unknown): boolean is User {
  return typeof value === 'object' && 'id' in value && 'name' in value
}

fn process(data: unknown) {
  if isUser(data) {
    console.log(data.name)  // data is narrowed to User
  }
}
```

#### 2.2.4 Property Refinement

```typescript
fn refineByProperty(
  type: TypeAnnotation,
  propertyName: string,
  value: any
): TypeAnnotation {
  // If type is { kind: 'success'; value: string } | { kind: 'error'; error: string }
  // And propertyName is 'kind' with value 'success'
  // Return { kind: 'success'; value: string }
}
```

---

### Step 2.3: Advanced Generics (250 줄)

**파일**: `src/type-system/advanced-generics.ts` (신규)

#### 2.3.1 Generic Constraints

```typescript
export interface ConstrainedGeneric {
  type: 'generic';
  name: string;
  constraint?: TypeAnnotation;  // T extends Serializable
  default?: TypeAnnotation;     // T = string
}
```

#### 2.3.2 Conditional Types

```typescript
export interface ConditionalType {
  type: 'conditional';
  check: TypeAnnotation;          // T
  extends: TypeAnnotation;        // string
  trueType: TypeAnnotation;       // 'string'
  falseType: TypeAnnotation;      // 'other'
}

// Usage: T extends string ? 'string' : 'other'
```

#### 2.3.3 Mapped Types

```typescript
export interface MappedType {
  type: 'mapped';
  key: string;                    // K in keyof T
  source: TypeAnnotation;         // T
  value: TypeAnnotation;          // T[K]
}

// Usage: { [K in keyof T]: T[K] | null }
```

#### 2.3.4 Generic Inference

```typescript
fn inferGenericType(
  callType: FunctionType,
  argumentTypes: TypeAnnotation[]
): Map<string, TypeAnnotation> {
  // For fn map<T, U>(arr: T[], fn: (x: T) => U): U[]
  // Called with ([1,2,3], x => x.toString())
  // Infer: T = number, U = string
}
```

---

### Step 2.4: Type Inference 개선 (200 줄)

**파일**: `src/type-system/advanced-inference.ts` (신규)

#### 2.4.1 Contextual Typing

```typescript
fn inferFromContext(
  expression: Expression,
  contextType: TypeAnnotation
): TypeAnnotation {
  // If context is (x: string) => number
  // And expression is x => x.length
  // Infer: x is string, return type is number
}
```

#### 2.4.2 Function Parameter Inference

```typescript
fn inferFunctionParameters(
  functionExpr: FunctionExpression,
  expectedType: FunctionType
): ParameterType[] {
  // Parameters can omit types if function is assigned to typed variable
  // let fn: (x: string, y: number) => boolean = (x, y) => ...
  // x and y types are inferred from context
}
```

#### 2.4.3 Return Type Inference

```typescript
fn inferReturnType(
  functionBody: BlockStatement,
  explicitReturnType?: TypeAnnotation
): TypeAnnotation {
  // Infer from all return statements in function body
  if (explicitReturnType) return explicitReturnType;

  const returnTypes = extractReturnTypes(functionBody);
  return unionOfTypes(returnTypes);
}
```

#### 2.4.4 Complex Expression Inference

```typescript
fn inferExpressionType(
  expr: Expression,
  context?: TypeAnnotation
): TypeAnnotation {
  // Handle:
  // - Array literals: [1, 2, 3] -> number[]
  // - Object literals: { x: 1, y: 'hello' } -> { x: number, y: string }
  // - Conditional: x ? a : b -> union of types
  // - Function calls with generics
}
```

---

### Step 2.5: Type Checker 확장 (200 줄)

**파일**: `src/type-checker/enhanced-type-checker.ts` (신규)

```typescript
export class EnhancedTypeChecker {
  // Union type checking
  checkUnionType(value: TypeAnnotation, union: UnionType): boolean

  // Type guard application
  applyTypeGuard(type: TypeAnnotation, guard: TypeGuard): TypeAnnotation

  // Generic constraint checking
  checkGenericConstraint(
    typeArg: TypeAnnotation,
    constraint: TypeAnnotation
  ): boolean

  // Conditional type evaluation
  evaluateConditionalType(
    conditional: ConditionalType,
    typeContext: Map<string, TypeAnnotation>
  ): TypeAnnotation

  // Mapped type construction
  buildMappedType(
    mapped: MappedType,
    sourceType: TypeAnnotation
  ): TypeAnnotation

  // Advanced inference
  inferComplexType(expr: Expression, context?: TypeAnnotation): TypeAnnotation
}
```

---

### Step 2.6: 종합 테스트 (400+ 줄)

**파일**: `test/phase-7-type-system.test.ts` (신규)

**테스트 범위** (60+ 테스트):

1. **Union Types** (15)
   - Union type 정의 및 파싱
   - Union 할당 가능성
   - Union type narrowing
   - Discriminated unions
   - Union 에러 처리

2. **Type Guards** (15)
   - typeof guards
   - instanceof guards
   - Custom predicates
   - Type refinement
   - Multiple guards

3. **Generics** (15)
   - Generic constraints
   - Conditional types
   - Mapped types
   - Generic variance
   - Generic defaults

4. **Type Inference** (15)
   - Contextual typing
   - Parameter inference
   - Return type inference
   - Complex expressions
   - Generic inference

---

## 파일 구조

```
v2-freelang-ai/
├── src/
│   └── type-system/
│       ├── union-types.ts              (신규: 150 줄)
│       ├── type-guards.ts              (신규: 200 줄)
│       ├── advanced-generics.ts        (신규: 250 줄)
│       └── advanced-inference.ts       (신규: 200 줄)
├── src/type-checker/
│   └── enhanced-type-checker.ts        (신규: 200 줄)
├── test/
│   └── phase-7-type-system.test.ts     (신규: 400+ 줄)
└── PHASE-7-STEP-2-PLAN.md              (이 파일)
```

---

## 예제

### Example 1: Union Types

```freelang
fn process(value: string | number): string {
  match typeof value {
    'string' => return value
    'number' => return value.toString()
  }
}

let result1 = process("hello")      // OK
let result2 = process(42)           // OK
let result3 = process(true)         // Error!
```

### Example 2: Type Guards

```freelang
fn isString(value: unknown): boolean is string {
  return typeof value === 'string'
}

fn process(value: string | number) {
  if isString(value) {
    console.log(value.length)  // value narrowed to string
  } else {
    console.log(value.toFixed(2))  // value narrowed to number
  }
}
```

### Example 3: Advanced Generics

```freelang
fn map<T, U extends T>(items: T[], transform: (x: T) => U): U[] {
  return items.map(transform)
}

let nums = [1, 2, 3]
let strings = map(nums, x => x.toString())  // U inferred as string
```

### Example 4: Type Inference

```freelang
// Types are inferred from context
let fn: (x: string, y: number) => boolean = (x, y) => {
  // x: string, y: number inferred automatically
  return x.length > y
}

// Array types inferred from elements
let arr = [1, 2, 3]  // arr: number[]
let mixed = [1, "hello", true]  // mixed: (number | string | boolean)[]
```

### Example 5: Discriminated Unions

```freelang
type Response<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; error: string }

fn handle<T>(response: Response<T>) {
  if response.status == 'success' {
    console.log(response.data)  // response narrowed
  } else {
    console.log(response.error)  // response narrowed
  }
}
```

---

## 구현 순서

1. **Step 2.1**: Union Types 정의 및 파싱
2. **Step 2.2**: Type Guards 시스템
3. **Step 2.3**: Advanced Generics
4. **Step 2.4**: Type Inference 개선
5. **Step 2.5**: Type Checker 확장
6. **Step 2.6**: 종합 테스트 및 예제

---

## 검증 기준

✅ Union Types 완벽 지원
✅ Type Guards 동작
✅ Constrained Generics 작동
✅ Conditional Types 평가
✅ Advanced Type Inference 동작
✅ 60+ 종합 테스트 통과
✅ 예제 코드 정상 작동

---

## 시간 추정

- **Step 2.1**: 1.5시간 (Union Types)
- **Step 2.2**: 1.5시간 (Type Guards)
- **Step 2.3**: 1.5시간 (Advanced Generics)
- **Step 2.4**: 1시간 (Type Inference)
- **Step 2.5**: 1시간 (Type Checker)
- **Step 2.6**: 1.5시간 (테스트)

**총 예상 시간**: **8시간**

---

## Phase 7 전체 진행

Phase 7은 4개 단계로 구성:

1. ✅ **Step 1**: Async/Await (완료)
2. 📋 **Step 2**: Type System Enhancements (이 단계)
3. 📋 **Step 3**: Macro System
4. 📋 **Step 4**: Package Registry & Publishing

---

## 결론

Phase 7 Step 2는 FreeLang을 **TypeScript 수준의 타입 시스템**으로 만듭니다.

Union Types, Type Guards, Advanced Generics, 향상된 Type Inference를 통해:
- ✨ 매우 정확한 타입 체킹
- 📚 복잡한 타입 표현 가능
- 🚀 스마트한 타입 추론
- 🔄 유연한 제네릭 시스템

구현 후 FreeLang은 **최신 프로그래밍 언어 수준의 타입 안정성**을 확보합니다.

---

*Generated February 18, 2026*
*FreeLang v2 - Phase 7 Step 2 Plan*
