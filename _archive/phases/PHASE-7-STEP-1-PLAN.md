# Phase 7 Step 1: Async/Await Implementation - 계획서

**Status**: 📋 계획 단계
**Date**: February 18, 2026

---

## 개요

**Phase 7 Step 1**은 FreeLang에 **Async/Await 지원**을 추가합니다.

현재 FreeLang은 동기 프로그래밍만 지원합니다. 이 단계에서는:
- `async function` 선언
- `await` 표현식
- `Promise<T>` 타입
- 에러 처리 (`try-catch` in async)

을 구현하여 **비동기 프로그래밍**을 완벽히 지원하게 됩니다.

---

## 배경

### 현재 상태

```freelang
// 현재 불가능한 코드
async fn fetchData(url: string): Promise<string> {
  let response = await fetch(url)
  return response.text()
}

fn main() {
  let data = await fetchData("https://api.example.com")
}
```

### 목표 상태

위 코드가 완벽하게 작동하도록 구현합니다.

---

## 구현 계획

### Step 1.1: AST 확장 (200 줄)

**파일**: `src/ast/statements.ts` (수정) + `src/ast/expressions.ts` (수정)

#### 1.1.1 AsyncFunctionDecl 추가

```typescript
export interface AsyncFunctionDecl extends Statement {
  type: 'async-function-decl';
  name: string;
  params: Parameter[];
  returnType: TypeAnnotation;  // Promise<T>로 자동 래핑
  body: BlockStatement;
  generics?: string[];
}
```

**변경 사항**:
- FunctionDecl에 `isAsync: boolean` 플래그 추가 OR 별도의 AsyncFunctionDecl 타입 정의
- Parser에서 `async fn` 키워드 인식

#### 1.1.2 AwaitExpression 추가

```typescript
export interface AwaitExpression extends Expression {
  type: 'await-expression';
  argument: Expression;  // Awaited value
}
```

**변경 사항**:
- CallExpression, VariableRef 등 모든 표현식에 await 가능
- `await expr` 형태로 파싱

#### 1.1.3 Promise 타입

```typescript
// 기존 TypeAnnotation에 Promise 지원 추가
export interface PromiseType extends TypeAnnotation {
  name: 'Promise';
  elementType: TypeAnnotation;  // Promise<T>의 T
}
```

---

### Step 1.2: 파서 확장 (250 줄)

**파일**: `src/parser/parser.ts` (수정)

#### 1.2.1 Async 함수 파싱

```typescript
// 변경 전
fn parseFunctionDeclaration(): FunctionDecl {
  this.consume('fn');
  const name = this.parseIdentifier();
  // ...
}

// 변경 후
fn parseFunctionDeclaration(): FunctionDecl | AsyncFunctionDecl {
  const isAsync = this.check('async');
  if (isAsync) {
    this.consume('async');
  }
  this.consume('fn');
  const name = this.parseIdentifier();
  // ...
  return isAsync ?
    { type: 'async-function-decl', ... } :
    { type: 'function-decl', ... };
}
```

#### 1.2.2 Await 표현식 파싱

```typescript
fn parsePrimaryExpression(): Expression {
  if (this.check('await')) {
    this.consume('await');
    const argument = this.parsePrimaryExpression();
    return {
      type: 'await-expression',
      argument
    };
  }
  // ... existing code
}
```

#### 1.2.3 Promise 타입 파싱

```typescript
fn parseTypeAnnotation(): TypeAnnotation {
  if (this.check('Promise')) {
    this.consume('Promise');
    this.consume('<');
    const elementType = this.parseTypeAnnotation();
    this.consume('>');
    return {
      name: 'Promise',
      elementType
    };
  }
  // ... existing code
}
```

---

### Step 1.3: Type Checker 확장 (300 줄)

**파일**: `src/type-checker/type-checker.ts` (수정)

#### 1.3.1 Async 함수 검사

```typescript
visitAsyncFunctionDecl(node: AsyncFunctionDecl): void {
  // 함수 시그니처를 Promise<ReturnType>으로 자동 변환
  const promiseReturnType = {
    name: 'Promise',
    elementType: node.returnType
  };

  // 함수 심볼 등록
  this.env.define(node.name, {
    type: 'function',
    params: node.params,
    returnType: promiseReturnType
  });

  // 함수 body 체크
  this.pushScope();
  node.params.forEach(param => {
    this.env.define(param.name, param.type);
  });

  node.body.statements.forEach(stmt => {
    this.visit(stmt);
  });

  this.popScope();
}
```

#### 1.3.2 Await 표현식 검사

```typescript
visitAwaitExpression(node: AwaitExpression): TypeAnnotation {
  const argType = this.visit(node.argument);

  // await는 Promise<T>를 받아서 T를 반환
  if (argType.name === 'Promise') {
    return argType.elementType;
  }

  // 에러: Promise가 아닌 것을 await하려고 함
  throw new TypeCheckError(
    `Cannot await non-Promise value of type ${argType.name}`
  );
}
```

#### 1.3.3 Await 위치 검사

```typescript
// Await는 async 함수 내에서만 사용 가능
visitAwaitExpression(node: AwaitExpression): TypeAnnotation {
  if (!this.isInAsyncContext()) {
    throw new TypeCheckError(
      'await can only be used in async functions'
    );
  }
  // ...
}
```

---

### Step 1.4: 코드 생성 (250 줄)

**파일**: `src/codegen/code-generator.ts` (수정)

#### 1.4.1 Async 함수 코드 생성

```typescript
// 입력
async fn fetchData(url: string): Promise<string> {
  let response = await fetch(url)
  return response.text()
}

// 출력 (TypeScript)
async function fetchData(url: string): Promise<string> {
  let response = await fetch(url);
  return response.text();
}
```

**구현**:
```typescript
visitAsyncFunctionDecl(node: AsyncFunctionDecl): string {
  const params = node.params
    .map(p => `${p.name}: ${this.typeToString(p.type)}`)
    .join(', ');

  const returnType = this.typeToString(node.returnType);
  const body = this.visitBlockStatement(node.body);

  return `async function ${node.name}(${params}): ${returnType} ${body}`;
}
```

#### 1.4.2 Await 표현식 코드 생성

```typescript
// 입력
let result = await promise

// 출력
let result = await promise;
```

**구현**:
```typescript
visitAwaitExpression(node: AwaitExpression): string {
  const arg = this.visit(node.argument);
  return `await ${arg}`;
}
```

---

### Step 1.5: 표준 라이브러리 Promise 유틸 (200 줄)

**파일**: `src/stdlib/promise.ts` (신규)

```typescript
/**
 * FreeLang Standard Library: std/promise
 * Promise utilities and combinators
 */

/**
 * Wait for all promises
 */
export function all<T>(promises: Promise<T>[]): Promise<T[]> {
  return Promise.all(promises);
}

/**
 * Wait for first resolved promise
 */
export function race<T>(promises: Promise<T>[]): Promise<T> {
  return Promise.race(promises);
}

/**
 * Wrap value in resolved promise
 */
export function resolve<T>(value: T): Promise<T> {
  return Promise.resolve(value);
}

/**
 * Create rejected promise
 */
export function reject<T>(reason: any): Promise<T> {
  return Promise.reject(reason);
}

/**
 * Chain promises
 */
export function then<T, R>(
  promise: Promise<T>,
  onFulfilled?: (value: T) => R | Promise<R>,
  onRejected?: (reason: any) => R | Promise<R>
): Promise<R> {
  return promise.then(onFulfilled, onRejected);
}

/**
 * Handle promise rejection
 */
export function catch_<T>(
  promise: Promise<T>,
  onRejected: (reason: any) => T | Promise<T>
): Promise<T> {
  return promise.catch(onRejected);
}

/**
 * Finally handler
 */
export function finally_<T>(
  promise: Promise<T>,
  onFinally: () => void | Promise<void>
): Promise<T> {
  return promise.finally(onFinally);
}

/**
 * Timeout wrapper
 */
export function timeout<T>(
  promise: Promise<T>,
  ms: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), ms)
    )
  ]);
}

/**
 * Delay execution
 */
export function delay<T>(ms: number, value: T): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), ms));
}

/**
 * Retry with backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxAttempts - 1) throw error;
      await delay(delayMs * Math.pow(2, i), undefined);
    }
  }
  throw new Error('All retries failed');
}

export const promise = {
  all,
  race,
  resolve,
  reject,
  then,
  catch: catch_,
  finally: finally_,
  timeout,
  delay,
  retry
};
```

---

### Step 1.6: 종합 테스트 (400 줄)

**파일**: `test/phase-7-async-await.test.ts` (신규)

**테스트 범위** (50+ 테스트):

1. **기본 Async/Await** (10)
   - async 함수 정의
   - await 표현식
   - Promise 반환
   - 순차 실행
   - 병렬 실행

2. **Type Checking** (10)
   - Async 함수 타입
   - Promise<T> 타입
   - Await 타입 검증
   - 에러 처리

3. **에러 처리** (10)
   - try-catch in async
   - Promise rejection
   - Error propagation
   - Finally 블록

4. **Promise 유틸** (10)
   - Promise.all
   - Promise.race
   - Timeout
   - Retry

5. **고급 패턴** (10)
   - Sequential execution
   - Parallel execution
   - Promise 체인
   - 조건부 await

---

## 파일 구조

```
v2-freelang-ai/
├── src/
│   ├── ast/
│   │   ├── statements.ts      (수정: AsyncFunctionDecl)
│   │   └── expressions.ts     (수정: AwaitExpression)
│   ├── parser/
│   │   └── parser.ts          (수정: async/await 파싱)
│   ├── type-checker/
│   │   └── type-checker.ts    (수정: async/await 타입체크)
│   ├── codegen/
│   │   └── code-generator.ts  (수정: async/await 코드생성)
│   └── stdlib/
│       └── promise.ts         (신규: Promise 유틸)
├── test/
│   └── phase-7-async-await.test.ts  (신규: 50+ 테스트)
├── examples/
│   └── phase-7/
│       ├── async-basic.fl
│       ├── async-errors.fl
│       └── async-patterns.fl
└── PHASE-7-STEP-1-PLAN.md     (이 파일)
```

---

## 예제

### Example 1: 기본 Async/Await

```freelang
async fn fetchUser(id: number): Promise<User> {
  let response = await fetch(`/api/users/${id}`)
  let data = await response.json()
  return data as User
}

fn main() {
  let user = await fetchUser(123)
  console.log(user.name)
}
```

### Example 2: 에러 처리

```freelang
async fn safeRequest(url: string): Promise<string | null> {
  try {
    let response = await fetch(url)
    return await response.text()
  } catch (error) {
    console.error("Request failed", error)
    return null
  }
}
```

### Example 3: 병렬 실행

```freelang
async fn fetchMultiple(ids: [number]): Promise<[User]> {
  let promises = ids.map(id => fetchUser(id))
  let users = await Promise.all(promises)
  return users
}
```

### Example 4: 재시도

```freelang
async fn fetchWithRetry(url: string): Promise<string> {
  let maxAttempts = 3
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fetch(url).then(r => r.text())
    } catch (error) {
      if (i === maxAttempts - 1) throw error
      await delay(1000 * (i + 1))
    }
  }
  throw "All retries failed"
}
```

---

## 구현 순서

1. **Step 1.1**: AST 확장 (async/await 노드 정의)
2. **Step 1.2**: Parser 확장 (async/await 파싱)
3. **Step 1.3**: Type Checker 확장 (타입 검증)
4. **Step 1.4**: 코드 생성 (TypeScript 출력)
5. **Step 1.5**: Promise 유틸 라이브러리
6. **Step 1.6**: 종합 테스트 및 예제

---

## 검증 기준

✅ AST 확장 완료 및 테스트
✅ Parser async/await 인식 및 파싱
✅ Type Checker Promise 타입 지원
✅ 코드 생성 올바른 TypeScript 출력
✅ Promise 유틸 함수 구현
✅ 50+ 종합 테스트 통과
✅ 예제 코드 정상 작동

---

## 시간 추정

- **Step 1.1**: 1시간 (AST 확장)
- **Step 1.2**: 1.5시간 (파서 확장)
- **Step 1.3**: 1.5시간 (타입 체커)
- **Step 1.4**: 1시간 (코드 생성)
- **Step 1.5**: 1시간 (Promise 유틸)
- **Step 1.6**: 1.5시간 (테스트)

**총 예상 시간**: **7.5시간**

---

## Phase 7 전체 로드맵

Phase 7은 4개 단계로 구성:

1. ✅ **Step 1**: Async/Await (이 단계)
2. 📋 **Step 2**: Type System Enhancements
   - Union Types (더 강화)
   - Generics (더 강화)
   - Type Guards
   - Advanced Type Inference

3. 📋 **Step 3**: Macro System
   - Macro 정의
   - Macro 확장
   - AST 변환
   - Hygiene checking

4. 📋 **Step 4**: Package Registry & Publishing
   - Remote registry 연결
   - Package 발행
   - Version 관리
   - Dependency resolution

---

## 결론

Phase 7 Step 1은 FreeLang을 **완전한 비동기 프로그래밍 언어**로 만듭니다.

async/await를 통해:
- ✨ 현대적이고 직관적인 비동기 코드 작성
- 📚 Node.js/Browser와 호환성
- 🚀 마이크로서비스, API 서버 개발 가능
- 🔄 I/O 바운드 작업 효율화

구현 후 FreeLang은 **엔터프라이즈 수준의 프로그래밍 언어**가 됩니다.

---

*Generated February 18, 2026*
*FreeLang v2 - Phase 7 Step 1 Plan*
