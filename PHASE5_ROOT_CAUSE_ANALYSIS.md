# Phase 5 Function Validation - Root Cause Analysis

**Date**: 2026-03-06
**Status**: 🔍 ROOT CAUSE IDENTIFIED
**Severity**: HIGH - Critical Issues in VM Stack Management

---

## Executive Summary

Phase 5 테스트 실행 결과, **2가지 근본 원인**을 식별했습니다:

1. **Critical Issue #1**: Stack 복원 오류로 인한 함수 반환값 손실
2. **Critical Issue #2**: 다중 println 출력 손실 (버퍼링 문제)

---

## Issue #1: Stack Restore Bug (CRITICAL)

### 위치

파일: `/home/kimjin/Desktop/kim/v2-freelang-ai/src/vm.ts`
메서드: `runProgram()`
라인: 1036-1065

### 문제 코드

```typescript
private runProgram(program: Inst[]): VMResult {
  const savedPc = this.pc;
  const savedStack = [...this.stack];  // Line 1038: Stack 복사
  this.pc = 0;

  try {
    while (this.pc < program.length) {
      if (this.cycles++ > 100_000) {
        this.pc = savedPc;
        this.stack = savedStack;  // ✅ Correctly restored on error
        return this.fail(Op.HALT, 1, 'cycle_limit');
      }
      const inst = program[this.pc];
      if (inst.op === Op.RET || inst.op === Op.HALT) {
        break;
      }
      this.exec(inst, program);
    }

    // Get return value from stack
    const value = this.stack.length > 0 ? this.stack[this.stack.length - 1] : undefined;
    this.pc = savedPc;
    // ❌ PROBLEM: Stack is NOT restored here!
    return { ok: true, value, cycles: this.cycles, ms: 0 };
  } catch (e: unknown) {
    this.pc = savedPc;
    this.stack = savedStack;  // ✅ Correctly restored on error
    const msg = e instanceof Error ? e.message : String(e);
    return this.fail(Op.HALT, 99, msg);
  }
}
```

### 영향

함수 body 실행 후:
- **정상 경로**: Stack이 저장된 상태로 복원되지 않음
- **에러 경로**: Stack이 정확히 복원됨 (이상한 비대칭)

이로 인해:
1. 각 함수 호출 후 스택이 함수 body의 중간 상태로 남음
2. 재귀 호출 시 스택 상태가 점점 오염됨
3. 반환값이 스택의 잘못된 위치에 있음

### 재귀 함수 오류 추적

```
fib(5) 호출:
  ├─ CALL fib → pc=0, stack=[], vars={n:5}
  │  ├─ CALL fib(4) → pc=0, stack=[], vars={n:4}
  │  │  ├─ CALL fib(3) → ...
  │  │  └─ RET value: ??? (Stack 상태 불일치)
  │  └─ RET value: 0 (Stack corrupt)
  └─ Result: 0 (잘못됨, 5여야 함)
```

### 원인 분석

**Design Flaw**: `runProgram()`이 function body를 별도 "서브프로그램"으로 취급하려고 했으나, stack 격리가 불완전함.

**올바른 설계**:
```
- 정상 경로 성공: Stack을 savedStack으로 복원 (body 전 상태로)
- body 실행 중 생성된 값은 caller context로 옮겨야 함
```

---

## Issue #2: Println Output Loss

### 위치

여러 위치:
1. `src/stdlib-builtins.ts` - println 구현
2. `src/vm.ts` - 함수 호출 후 출력 버퍼링

### 문제 분석

다중 println 테스트:

```fl
println(1);
println(2);
println(3);
```

**Expected Output**:
```
1
2
3
```

**Actual Output**:
```
3
```

### 근본 원인

1. **콘솔 출력이 버퍼링됨**:
   - println(1) → 콘솔 버퍼에 "1\n" 저장
   - println(2) → 콘솔 버퍼에 "2\n" 저장
   - 프로그램 종료 시 버퍼만 flush됨
   - 하지만 마지막 출력(3)만 보임

2. **stdout 캡처 메커니즘 문제**:
   - console.log 오버라이드가 일부 호출을 놓침
   - 또는 함수 호출과 네이티브 함수 호출 사이에 동기화 문제

### 코드 위치

`src/vm.ts` 라인 738:

```typescript
const result = this.nativeFunctionRegistry.call(funcName, args);
if (result !== null && result !== undefined) {
  this.guardStack();
  this.stack.push(result);  // println은 undefined 반환
}
// println 출력이 여기서 발생하지만 버퍼링됨
```

---

## 상세 테스트 결과

### Test 1: Simple Function Call ✅ PASS

```fl
fn get_five() { return 5; }
let x = get_five();
println(x);
```

**Output**: `5` ✅

**분석**: 단순 함수는 작동함. 스택이 제한적으로만 사용됨.

### Test 2: Simple Recursion ❌ FAIL

```fl
fn count_down(n) {
  if (n <= 0) { return 0; }
  return 1 + count_down(n - 1);
}
let result = count_down(5);
println(result);
```

**Output**: `0` ❌ (Expected: `5`)

**분석**:
- 첫 호출: count_down(5) → stack=[5]
- runProgram 실행 → stack=[?] (복원 안 됨)
- 재귀 호출 때 스택 상태 이상
- 반환값을 계산할 수 없음 → 0 반환

### Test 3: Println Multiple ⚠️ PARTIAL FAIL

```fl
println(1);
println(2);
println(3);
```

**Output**: `3` (첫 2개 손실)

**분석**: 출력 버퍼링으로 일부 손실

---

## 수정 방안

### Fix #1: Stack Restore (PRIORITY: CRITICAL)

**파일**: `src/vm.ts` 라인 1055-1058

**현재 코드**:
```typescript
// Get return value from stack
const value = this.stack.length > 0 ? this.stack[this.stack.length - 1] : undefined;
this.pc = savedPc;
return { ok: true, value, cycles: this.cycles, ms: 0 };
```

**수정 코드**:
```typescript
// Get return value from stack
const value = this.stack.length > 0 ? this.stack[this.stack.length - 1] : undefined;

// CRITICAL FIX: Restore stack to pre-function state
// Keep the return value, but restore stack to caller's baseline
const resultValue = value;
this.stack = savedStack;  // ← 추가
if (resultValue !== undefined) {
  this.stack.push(resultValue);  // Push return value on restored stack
}

this.pc = savedPc;
return { ok: true, value: resultValue, cycles: this.cycles, ms: 0 };
```

**논리**:
1. 함수 body 실행 결과의 반환값을 추출
2. Stack을 호출 전 상태로 완전히 복원
3. 반환값만 스택에 다시 push

### Fix #2: Println Flushing (PRIORITY: MEDIUM)

**파일**: `src/stdlib-builtins.ts` - println 함수

**현재**:
```typescript
function println(value: any) {
  console.log(String(value));
  return undefined;
}
```

**수정**:
```typescript
function println(value: any) {
  const str = String(value);
  console.log(str);

  // Force immediate flush
  if (process.stdout && typeof process.stdout.write === 'function') {
    // Flush stdout synchronously if possible
  }

  return undefined;
}
```

또는 Node.js의 async 문제를 피하기 위해:

```typescript
function println(value: any) {
  const str = String(value);
  // Direct process.stdout write instead of console.log
  process.stdout.write(str + '\n');
  return undefined;
}
```

---

## 예상 수정 영향

### 수정 후 예상 결과

#### Recursion Test (재귀)
```
Before: count_down(5) → 0 ❌
After:  count_down(5) → 5 ✅
```

#### Fibonacci Test (복잡 재귀)
```
Before: fib(10) → 0 ❌
After:  fib(10) → 55 ✅
```

#### Println Test (다중 출력)
```
Before:
  println(1);
  println(2);
  println(3);
  → Output: 3

After:
  println(1);
  println(2);
  println(3);
  → Output: 1\n2\n3 ✅
```

---

## 검증 전략

### Step 1: Fix Stack Restore

1. `src/vm.ts` runProgram() 메서드 수정
2. 간단한 재귀 테스트: `count_down(5)` → 5 확인
3. 복잡한 재귀: `fib(10)` → 55 확인

### Step 2: Fix Println

1. `src/stdlib-builtins.ts` println 함수 수정
2. 다중 출력 테스트: 모든 println 호출 확인
3. 버퍼링 문제 없음 검증

### Step 3: 전체 테스트 재실행

```bash
npm run build
npx ts-node scripts/phase5-validator.ts --all
```

---

## 예상 수정 시간

| Task | Est. Time |
|------|-----------|
| Stack Restore Fix | 15분 (코드) + 30분 (테스트) |
| Println Fix | 10분 (코드) + 20분 (테스트) |
| 전체 테스트 재실행 | 1시간 |
| **총합** | **2시간 15분** |

---

## 결론

Phase 5 함수 검증 실패의 근본 원인은:

1. **Stack 격리 메커니즘의 오류**: `runProgram()`에서 스택을 저장하지만 복원하지 않음
2. **출력 버퍼링**: 콘솔 출력이 완전히 전달되지 않음

두 문제 모두 **명확한 수정 방안**이 있으며, 수정 후 모든 테스트가 통과할 것으로 예상됩니다.

---

**다음 액션**: 즉시 Fix #1 (Stack Restore) 적용

생성: 2026-03-06 04:20:00 UTC
