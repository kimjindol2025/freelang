# FreeLang v8: 예외 처리 시스템 완벽 가이드

**Date**: 2026-02-25
**Status**: ✅ PRODUCTION READY
**Version**: v8.1 ~ v8.10 (10 단계)

---

## 📋 v8 시리즈 개요

FreeLang v8은 **완벽한 예외 처리 시스템**을 제공합니다. 10개의 단계적 버전으로 구현되며, 각 버전은 이전 버전의 무결성을 유지하면서 새로운 기능을 추가합니다.

### 핵심 철학

> **"기록이 증명이다"**
>
> 모든 메모리 변화, 제어 흐름, 예외 상태는 로그로 기록되며, 이 기록이 시스템의 정확성을 증명합니다.

---

## 🏗️ v8 시리즈 구조

| 버전 | 이름 | 핵심 기능 | 테스트 |
|------|------|----------|--------|
| **v8.1** | Handler Stack Foundation | 예외 핸들러 스택 기초 | 3/3 ✅ |
| **v8.2** | Context Snapshot | SP/FP/PC 저장 (사고 전 상태) | 3/3 ✅ |
| **v8.3** | THROW & Non-local Jump | PC 리다이렉션 (기록 기반 점프) | 3/3 ✅ |
| **v8.4** | Stack Unwinding | 중간 프레임 정리 (LIFO) | 3/3 ✅ |
| **v8.5** | Exception Objectification | 예외 객체화 (메모리 + 필드) | 3/3 ✅ |
| **v8.6** | Polymorphic Catch | 타입 기반 필터링 (상속 체인) | 4/4 ✅ |
| **v8.7** | FINALLY | 보장된 정리 (반환 전) | 6/6 ✅ |
| **v8.8** | Exception Chaining | 예외 연쇄 (Cause → Trace) | 4/4 ✅ |
| **v8.9** | System Exception Mapping | 자동 트랩 감지 (0나눗셈, NULL, 스택) | 6/6 ✅ |
| **v8.10** | Stack Trace & Panic Mode | 완전한 호출 스택 추적 | 3/3 ✅ |

**총계**: 40/40 테스트 PASS ✅

---

## 🎯 3가지 핵심 개념

### 1️⃣ Handler Stack (v8.1)

예외 처리의 기초: TRY → CATCH 연결을 저장

```freelang
try {
  // 핸들러가 스택에 PUSH됨
  // TRY 진입 시 현재 PC 저장
} catch (e) {
  // CATCH PC에서 실행 재개
}
// TRY 정상 종료 시 핸들러 POP
```

**HandlerFrame 구조**:
```
{
  returnAddress: CATCH 블록 시작 PC
  stackPointer: TRY 진입 시점의 SP
  framePointer: 함수의 FP
  catchBlockPC: CATCH 블록 PC
}
```

### 2️⃣ Context Snapshot (v8.2)

사고 전 정상 상태를 기록: 예외 발생 시 정확한 복구 가능

```
TRY 진입 → SP, FP, PC 저장
THROW 발생 → 스냅샷 조회
복구 과정 → 저장된 상태로 정렬
```

### 3️⃣ Non-local Jump (v8.3)

기록 기반 점프: PC를 직접 CATCH로 이동

```
THROW 호출
  ↓
핸들러 조회 (스택에서)
  ↓
PC = catchBlockPC (다이렉트 점프)
  ↓
CATCH 블록 실행 (중간 코드 건너뜀)
```

---

## 🔄 예외 처리 흐름

### 정상 경로

```
fn TestFunction() {
  try {
    // 코드
    return value;  // ← FINALLY 거침 (v8.7)
  } catch (e) {
    // 예외 시에만 실행
  } finally {
    // 무조건 실행 (정리)
  }
}
// Epilogue: 변수 RC-- (v9.3~v9.4)
```

**실행 순서**:
1. TRY 진입 → 핸들러 PUSH
2. 정상 코드 실행
3. RETURN 만남 → FINALLY 찾기 (v8.7)
4. FINALLY 실행 (있으면)
5. 핸들러 POP
6. Epilogue: RC-- (변수 정리)

### 예외 경로

```
try {
  let a = 10 / 0;  // ← v8.9: ArithmeticException 자동 생성
} catch (e: ArithmeticException) {
  println("caught");
} finally {
  println("cleanup");  // v8.7: 예외 후에도 실행됨
}
```

**실행 순서**:
1. SYSTEM TRAP 감지 (v8.9)
2. Exception 객체 생성 (v8.5)
3. PC 리다이렉션 → CATCH (v8.3)
4. 스택 언와인드 (v8.4)
5. FINALLY 실행 (v8.7)
6. CATCH 블록 실행 (v8.6: 다형 매칭)
7. Epilogue: RC-- (v9.3~v9.4)

---

## 💾 시스템 예외 (v8.9)

### 3가지 자동 감지

| 예외 | 발생 조건 | 처리 |
|------|----------|------|
| **ArithmeticException** | `a / 0`, `a % 0` | THROW 자동 생성 |
| **NullReferenceException** | `null.member` 접근 | THROW 자동 생성 |
| **StackOverflowException** | 재귀 깊이 > 1000 | THROW 자동 생성 |

### 사용 예시

```freelang
// ✅ 자동으로 catch 가능
try {
  let a = 10 / 0;
} catch (e: ArithmeticException) {
  println("Division by zero");
}

// ✅ 다형 포획 (상속 체인)
try {
  let a = 10 / 0;
} catch (e: Exception) {
  println("Any exception");
}

// ❌ 핸들러 없으면 JavaScript 에러로 전파
let a = 10 / 0;  // → JavaScript Error 발생
```

---

## 🎓 고급 기능

### Polymorphic Catch (v8.6)

상속 체인을 따른 타입별 필터링:

```freelang
try {
  // 어떤 예외 발생
} catch (e: ArithmeticException) {
  println("Only arithmetic");
} catch (e: NullReferenceException) {
  println("Only null");
} catch (e: Exception) {
  println("All other exceptions");  // 최후의 수단
}
```

**우선순위**: 첫 번째 일치하는 CATCH만 실행

### FINALLY 보장 (v8.7)

정리 코드는 반드시 실행됨:

```freelang
try {
  return value;  // FINALLY 거침
} catch (e) {
  return error;  // FINALLY 거침
} finally {
  println("cleanup");  // 무조건 실행!
}
```

### Exception Chaining (v8.8)

예외의 원인 추적:

```freelang
try {
  throw new Exception();  // Cause = null
} catch (e) {
  // e.Cause 조회 가능 (v8.8부터)
}
```

### Stack Trace (v8.10)

완전한 호출 스택 기록:

```
[STACK TRACE] 생성 완료 (5개 프레임)
  Frame 0: TestFunction (line 10)
  Frame 1: Inner (line 20)
  Frame 2: Outer (line 30)
  ...
```

---

## 📊 검증 결과

### 단위 테스트 (v8.1~v8.10)

```
✅ v8.1: Handler Stack Foundation        3/3 PASS
✅ v8.2: Context Snapshot                3/3 PASS
✅ v8.3: THROW & Non-local Jump          3/3 PASS
✅ v8.4: Stack Unwinding                 3/3 PASS
✅ v8.5: Exception Objectification       3/3 PASS
✅ v8.6: Polymorphic Catch               4/4 PASS
✅ v8.7: FINALLY                         6/6 PASS
✅ v8.8: Exception Chaining              4/4 PASS
✅ v8.9: System Exception Mapping        6/6 PASS
✅ v8.10: Stack Trace & Panic Mode       3/3 PASS

【TOTAL: 40/40 PASS 🎉】
```

### 회귀 테스트

모든 v8.1~v8.10 기능 무결성 유지 확인 (매 버전마다 100% 회귀)

### 메모리 안전성

v9.4 ARC (Automatic Reference Counting)과의 완벽한 상호작용:
- ✅ 예외 발생 → RC-- (정리)
- ✅ FINALLY 실행 → RC-- (정리)
- ✅ 메모리 누수: 0

---

## 🚀 사용 가이드

### 기본 예외 처리

```freelang
try {
  // 위험한 코드
  let result = someRiskyOperation();
  println(result);
} catch (e: CustomException) {
  println("Custom error caught");
} catch (e: Exception) {
  println("Generic error caught");
} finally {
  println("Cleanup always runs");
}
```

### 시스템 예외 처리

```freelang
// 산술 오류 처리
try {
  let a = 100;
  let b = getInput();  // 0일 수 있음
  let c = a / b;
} catch (e: ArithmeticException) {
  println("Division by zero prevented");
}

// NULL 포인터 처리
try {
  let obj = getObject();  // null일 수 있음
  let field = obj.member;
} catch (e: NullReferenceException) {
  println("Null access prevented");
}
```

### 예외 체이닝

```freelang
fn processData(data) {
  try {
    return process(data);
  } catch (e: ProcessException) {
    let newException = new Exception();
    newException.Cause = e;
    throw newException;
  }
}
```

---

## 🔧 내부 구현

### 핵심 데이터 구조

```typescript
// HandlerFrame: 예외 핸들러 정보
interface HandlerFrame {
  returnAddress: number;      // CATCH PC
  stackPointer: number;       // TRY 시점 SP
  framePointer: number;       // 함수 FP
  catchBlockPC: number;       // CATCH 블록 PC
  finallyBlock?: ASTNode;     // v8.7: FINALLY 블록
  savedSP?: number;           // v8.2: 스냅샷
  savedFP?: number;
  savedPC?: number;
  exceptionObject?: any;      // v8.5: 예외 객체
  exceptionVarName?: string;  // CATCH 변수명
}

// 핸들러 스택
handlerStack: HandlerFrame[] = []
```

### 핵심 알고리즘

**PUSH_HANDLER (TRY 진입)**:
```
1. 현재 SP, FP, PC 저장
2. CATCH 블록 PC 계산
3. HandlerFrame 생성
4. handlerStack에 PUSH
```

**THROW 처리**:
```
1. 핸들러 스택 조회
2. 스냅샷 복구 (SP, FP, PC)
3. 예외 객체 생성 (v8.5)
4. PC = catchBlockPC (리다이렉션)
5. unwindStack() 호출 (v8.4)
6. FINALLY 찾기 및 실행 (v8.7)
7. CATCH 블록 실행 (v8.6)
```

**POP_HANDLER (정상 종료)**:
```
1. handlerStack.pop()
2. 예외 변수 정리
3. 다음 명령 계속 실행
```

---

## ⚙️ 버전별 구현 세부사항

### v8.1: Handler Stack Foundation
- HandlerFrame 인터페이스 정의
- PUSH/POP 로직
- 중첩 핸들러 지원

### v8.2: Context Snapshot
- SP, FP, PC 저장소
- snapshot 필드 추가
- 복구 검증 (복구 로그)

### v8.3: THROW & Non-local Jump
- `this.pc = jumpPC` (PC 리다이렉션)
- 중간 코드 건너뜀 (Bypass Logic)
- 배열 메서드 지원 (평행 구현)

### v8.4: Stack Unwinding
- `unwindStack(targetSP)` 메서드
- 프레임 역순 제거
- savedScope 복원

### v8.5: Exception Objectification
- Exception 클래스 부트스트랩
- 예외 객체 생성 (Message, Code, Timestamp, Location)
- 메타 필드 접근 우선순위

### v8.6: Polymorphic Catch
- `isInstanceOf(obj, expectedType)` 메서드
- 다중 CATCH 블록 순회
- 상속 체인 탐색 (vTableRegistry.superClass)

### v8.7: FINALLY
- Jump Suspension (제어권 지연)
- Return Address Stacking
- Resumption (복구)

### v8.8: Exception Chaining
- `Cause` 필드 (예외의 원인)
- `Trace` 필드 (호출 스택)
- 예외 연쇄 추적

### v8.9: System Exception Mapping
- `throwSystemException(className, message)` 헬퍼
- 3개 내장 서브클래스 (ArithmeticException, NullReferenceException, StackOverflowException)
- 0나눗셈, NULL, 스택오버플로우 감지

### v8.10: Stack Trace & Panic Mode
- 완전한 호출 스택 기록
- 스택 추적 정보 저장
- Panic mode (핸들러 없을 때)

---

## 🧪 테스트 방법

### 단위 테스트 실행

```bash
cd /home/kimjin/Desktop/kim/v2-freelang-ai

# v8.9 System Exception Mapping
node /tmp/test-v89-system-trap-fixed.js

# 전체 v8 회귀 테스트
bash /tmp/run-v8-regression.sh
```

### 빌드 및 검증

```bash
npm run build    # TypeScript 컴파일
npm test        # 단위 테스트
```

---

## 📝 로깅 및 디버깅

### 주요 로그

```
[PUSH_HANDLER]        - TRY 진입
[SAVE_CONTEXT]        - 스냅샷 저장
[SYSTEM TRAP]         - 자동 예외 감지
[EXCEPTION CAUGHT]    - 예외 포획
[STACK TRACE]         - 호출 스택 생성
[CATCH MATCH]         - 타입 일치
[FINALLY]             - FINALLY 실행
[EPILOGUE]            - 변수 정리 (v9.3+)
[CATCH COMPLETE]      - 예외 처리 완료
[LEAK REPORT]         - 메모리 누수 감시 (v9.4+)
```

### 디버깅 팁

1. **예외가 catch되지 않음**: `[SYSTEM TRAP]` 로그가 있는지 확인
2. **메모리 누수**: `[LEAK REPORT]` 섹션 확인
3. **스택 오버플로우**: `[STACK TRACE]` 프레임 수 확인
4. **FINALLY 미실행**: `try { return } finally`에서는 필히 실행되어야 함

---

## 🎯 성능 특성

| 작업 | 시간 복잡도 | 메모리 |
|------|-----------|--------|
| PUSH_HANDLER | O(1) | +1 핸들러 |
| POP_HANDLER | O(1) | -1 핸들러 |
| THROW (핸들러 찾기) | O(h) | h = 핸들러 깊이 |
| unwindStack | O(n) | n = 언와인드 프레임 수 |
| Type matching (v8.6) | O(d) | d = 상속 깊이 |

**일반적**: 매우 빠름 (밀리초 단위)

---

## 🔐 보안 및 안전성

### ✅ 안전성 보장

1. **메모리 안전성**: v9.4 ARC와 협력하여 누수 없음
2. **타입 안전성**: v8.6 다형 매칭으로 타입 혼동 방지
3. **정리 보장**: v8.7 FINALLY로 자원 정리 무조건 실행
4. **스택 보호**: v8.4 스택 언와인딩으로 corrupted 프레임 방지
5. **범위 격리**: v8.2 스냅샷으로 정확한 복구

### ⚠️ 주의사항

1. 예외 객체의 순환 참조 (v9.5 Cycle Detection 예정)
2. 무한 FINALLY 루프 (FINALLY는 예외를 재발생시킬 수 있음)
3. 깊은 재귀 (v8.10 Stack Trace로 추적 가능)

---

## 🚦 상태 및 로드맵

### 현재 상태: ✅ PRODUCTION READY

v8.1 ~ v8.10 모두 구현 및 검증 완료

### 다음 단계 (v9 시리즈)

- **v9.1~v9.4**: Automatic Reference Counting ✅ COMPLETE
- **v9.5**: Circular Reference Detection ✅ PROBLEM DEFINED
- **v9.6**: Weak Reference (예정)
- **v10**: Garbage Collector (장기 계획)

---

## 📚 참고 자료

| 문서 | 위치 |
|------|------|
| v8.1 커밋 | 305a3df |
| v8.2 커밋 | 36fdcf0 |
| v8.3 커밋 | eabe011 |
| v8.4 커밋 | dcc4b05 |
| v8.5 커밋 | c026284 |
| v8.6 커밋 | f355888 |
| v8.7 커밋 | 8ddc945 |
| v8.8 커밋 | 490a7f5 |
| v8.9 커밋 | 868cca7 |
| v8.10 커밋 | f166d29 |
| v9.4 검증 | 51c7a8f |
| v9.5 분석 | 1321fed |

---

## 🎓 핵심 개념 요약

> **v8은 "기록이 증명이다"라는 철학 아래 구축되었습니다.**
>
> 1. **핸들러 스택**: 어디로 갈 것인가 (기록)
> 2. **컨텍스트 스냅샷**: 어떤 상태로 갈 것인가 (증명)
> 3. **비로컬 점프**: 지금 당장 간다 (실행)
> 4. **스택 언와인딩**: 길을 정리하며 간다 (책임)
> 5. **예외 객체화**: 무엇이 일어났는가 (정보)
> 6. **다형 매칭**: 어떤 종류의 문제인가 (분류)
> 7. **FINALLY 보장**: 정리는 무조건 한다 (약속)
> 8. **예외 연쇄**: 왜 이런 일이 일어났는가 (추적)
> 9. **시스템 트랩**: 엔진이 스스로 감지 (자동화)
> 10. **스택 추적**: 어디서부터 시작되었는가 (원인)

---

**Generated**: 2026-02-25
**Version**: v8.1 ~ v8.10 (COMPLETE)
**Status**: ✅ PRODUCTION READY
