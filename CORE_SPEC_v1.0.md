# FreeLang Core Specification v1.0 - FREEZE

**상태**: 🔴 **FROZEN** (2026-02-25)
**버전**: v10.3 기반
**유효기간**: v11.0 ~ v19.99 (v20 이전 모든 버전)

이 문서는 FreeLang의 핵심 아키텍처를 고정합니다.
**변경 불가. 위반 시 아키텍처 붕괴 위험.**

---

## 1️⃣ 타입 시스템 (FROZEN)

### 1.1 기본 타입 (Primitive Types)

```
Integer     : 32-bit signed integer (-2^31 ~ 2^31-1)
Float       : IEEE 754 64-bit floating point
Boolean     : true / false
String      : UTF-8 immutable string
Null        : null (단일 값)
Undefined   : undefined (단일 값, 초기화 미완료)
```

### 1.2 복합 타입 (Composite Types)

```
Array<T>           : 1D 동적 배열 (크기 변동 가능)
Struct{f1, f2...}  : 고정 멤버 구조체 (메모리 정렬)
Object             : 메타 필드(__class, __type, __baseAddr) + 필드
Ref<T>             : 주소 참조 (포인터)
```

### 1.3 OOP 타입 (Class-based)

```
Class {
  fields: Map<name, type>
  methods: Map<name, signature>
  __vTable: virtual table
  __baseAddr: heap address
}

Inheritance:
  - Single inheritance only
  - vTableRegistry tracks superClass
  - isInstanceOf() walks superClass chain
```

### 1.4 Exception 타입

```
Exception                (base)
  ├─ ArithmeticException (division by zero, modulo by zero)
  ├─ NullReferenceException (null.member access)
  └─ StackOverflowException (recursion depth exceeded)

Status: v8.9에서 3개 시스템 예외 고정
        v9.x에서 4개 필드 고정 (Message, Code, Timestamp, Location, Cause, Trace)
```

### 1.5 타입 추론 규칙

```
1. Literal inference:
   123 → Integer
   1.5 → Float
   "text" → String
   true → Boolean

2. Operation inference:
   Integer + Integer → Integer
   Integer + Float → Float
   String + anything → String (concatenation)

3. Assignment inference:
   let x = 5 → x: Integer
   let y = x + 1.5 → y: Float

4. Function return:
   fn foo() { return x } → return type = type of x
```

---

## 2️⃣ 메모리 모델 (FROZEN)

### 2.1 메모리 레이아웃

```
┌─────────────────┐
│   Stack         │  0x0000 ~ 0x1FFF (8KB, local vars, function frames)
├─────────────────┤
│   Struct Pool   │  0x2000 ~ 0x3FFF (8KB, single structs)
├─────────────────┤
│   Array Pool    │  0x0000 ~ 0x1FFF (8KB, dynamic arrays)
├─────────────────┤
│   Struct Array  │  0x4000 ~ 0x7FFF (16KB, array of structs)
├─────────────────┤
│   Heap (Dynamic)│  0x8000 ~ 0xFFFF (32KB, alloc/free)
├─────────────────┤
│   Metadata      │  vTable, classTable, structTable, shapeRegistry
└─────────────────┘
```

### 2.2 메모리 관리 전략

#### 2.2.1 Reference Counting (RC) - CONFIRMED

```
Status: v9.6-v9.10 구현 완료

Mechanism:
  refCount: integer field in object header (after vPtr)
  - NewExpression: refCount = 1
  - Assignment: old.refCount--, new.refCount++
  - refCount == 0: Destructor 호출

Destructor Chain:
  - callDestructorChain(currentClassName)
  - 상속 체인 따라 Child → Parent → GrandParent 순서

Atomic Operations (v9.9):
  - atomic_increment(refCount)
  - atomic_decrement(refCount)
  - compare_and_swap(old, new)
```

#### 2.2.2 메모리 누수 방지

```
Weak References (v9.6):
  - weakRefTable: Map<objectAddr, Set<varName>>
  - 순환 참조 방지
  - 객체 파괴 시 weak refs NULL 처리

Instance Tracker:
  - 모든 객체 생명주기 추적
  - checkMemoryLeaks() 최종 감사
```

### 2.3 스택 관리

```
Call Stack:
  - callStack: Array<value>
  - SP (Stack Pointer): current height
  - FP (Frame Pointer): current function frame

Function Call:
  1. Push parameters
  2. Create frame (savedScope)
  3. Execute body
  4. Pop frame
  5. Return value

Exception Unwinding (v8.4):
  - THROW 발생 시 SP/FP 정렬
  - 중간 프레임들 역순 파괴
  - unwindStack() 정리
```

---

## 3️⃣ 바이트코드 ISA (FROZEN)

### 3.1 지원 명령어 세트

```
【Arithmetic】
  ADD, SUB, MUL, DIV, MOD, NEG

【Comparison】
  EQ, NE, LT, LE, GT, GE

【Logical】
  AND, OR, NOT

【Memory】
  LOAD_CONST, LOAD_VAR, STORE_VAR
  LOAD_MEMBER, STORE_MEMBER
  LOAD_ARRAY, STORE_ARRAY

【Control Flow】
  JUMP, JUMP_IF_FALSE, JUMP_IF_TRUE
  RETURN

【Function】
  CALL, CALL_USER_FUNC
  PUSH_ARG

【Exception】
  TRY, CATCH, FINALLY
  THROW
  PUSH_HANDLER, POP_HANDLER

【Object】
  NEW, INSTANCEOF, TYPEOF
  CALL_METHOD

【Performance】
  INLINE_CACHE_SLOT
  JIT_ENTRY_POINT
```

### 3.2 바이트코드 구조 (예약됨)

```
각 명령어: [opcode (1B)] [operands (variable)]

미사용: v20부터 더 이상 추가 금지
        확장 필요시 별도 ISA v2.0 설계
```

---

## 4️⃣ Exception Hierarchy (FROZEN)

### 4.1 Exception 클래스 구조

```
Exception (base class, v8.5)
  ├─ ArithmeticException (v8.9)
  │   └─ For: division by zero, modulo by zero
  │
  ├─ NullReferenceException (v8.9)
  │   └─ For: null.member access, invalid ref
  │
  └─ StackOverflowException (v8.9)
      └─ For: recursion depth > MAX_RECURSION_DEPTH (1000)
```

### 4.2 Exception 필드 (v8.10 FINAL)

```
Object header:
  [vPtr (4B)] [refCount (4B)]

Exception fields (6개, 총 24B):
  Message (4B)    : string describe of error
  Code (4B)       : error code (-1 for system, 0+ for user)
  Timestamp (4B)  : creation time (ms)
  Location (4B)   : where exception occurred
  Cause (4B)      : chained exception (v8.8)
  Trace (4B)      : stack trace (v8.10)
```

### 4.3 Try-Catch-Finally (v8.7 FINAL)

```
Syntax:
  try {
    // protected code
  } catch (e: ExceptionType) {
    // handler
  } catch (e: OtherType) {
    // fallback
  } finally {
    // cleanup (v8.7, ALWAYS executed)
  }

Rules (IMMUTABLE):
  1. try-finally: CATCH 없이 FINALLY만 가능 (v8.7)
  2. try-catch: CATCH만 가능
  3. Polymorphic CATCH: 다중 타입 지원 (v8.6)
  4. FINALLY: try/catch 완료 후 반드시 실행
  5. Exception propagation: FINALLY 후 재전파
```

---

## 5️⃣ OOP 아키텍처 (FROZEN)

### 5.1 클래스 정의

```
class MyClass {
  field1: Integer
  field2: String

  fn method1() { ... }
  fn method2(param) { ... }
}

Constraints:
  - Single inheritance only
  - Virtual methods (dynamic dispatch)
  - Constructor: default (all fields 0-initialized)
  - No custom constructor
```

### 5.2 메모리 레이아웃

```
Object Instance:
  [vPtr: 4B] [refCount: 4B] [field1: 4B] [field2: N B] [...]

vTable:
  - __staticAddress: 주소
  - methods: 메서드 함수 배열
  - index: 메서드명 → 인덱스 맵
  - superClass: 부모 클래스명

Inheritance Chain:
  Child → Parent → GrandParent → ... → Object
  (isInstanceOf() 탐색 대상)
```

### 5.3 접근 제어 (v7.4 FINAL)

```
현재 상태: 모든 멤버 public
          메서드는 클래스 내에서만 'this' 접근 가능

제약:
  - private/protected/public 키워드 미지원
  - v20부터 추가 가능 (새 ISA 필요)
```

---

## 6️⃣ 성능 최적화 (FROZEN)

### 6.1 Hot-Spot Detection (v10.1)

```
Threshold: 100 function calls
Classification:
  - NORMAL: call count < 100
  - HOT_SPOT: call count >= 100

Loop Tracking:
  - globalLoopExecutionCount: 모든 루프 반복 누적
  - __GET_LOOP_EXECUTION_COUNT()로 조회
```

### 6.2 Inline Caching (v10.2)

```
Call Site Cache:
  - 호출부마다 독립 캐시 슬롯
  - Shape: className:fieldName1:fieldName2:...
  - Monomorphic: 같은 타입 반복 → cached method address
  - Polymorphic: 다른 타입 → polymorphicEntries 추가

Hit Rate:
  - 100% 목표 (동일 타입 반복 호출)
```

### 6.3 JIT Compilation (v10.3)

```
Status: Template-based specialization

Mechanism:
  __JIT_COMPILE(functionName)
  - Template JIT 코드 생성
  - jitCompilationTable 저장
  - 이후 호출: JIT_OPTIMIZED 코드 실행

Limitation:
  - JavaScript 샌드박스 내에서만 작동
  - 진정한 기계어 컴파일 불가
  - 성능 개선: 1-3배 (현실적)
```

---

## 7️⃣ 런타임 기능 (FROZEN)

### 7.1 내장 함수 (Built-in Functions)

```
【I/O】
  println(value)        : 출력

【메모리】
  alloc(size)          : 힙 메모리 할당
  free(address)        : 메모리 해제
  get_at(addr, offset) : 힙 읽기
  set_at(addr, offset) : 힙 쓰기

【배열】
  arr_new(size)
  arr_copy(src, dst)
  arr_resize(arr, newSize)
  arr_struct_new(count, StructType)

【구조체】
  _STRUCT_DEF(name, fields)

【타입】
  typeof(value)

【성능】
  __GET_TICK_PRECISE()           : 나노초 타이머
  __GET_CODE_STATUS(funcName)    : HOT_SPOT 분류
  __GET_INLINE_CACHE_STATS()     : 캐시 통계
  __CACHE_SHAPE(object)          : Shape 등록
  __JIT_COMPILE(funcName)        : JIT 컴파일
  __GET_CODE_TYPE(funcName)      : 코드 타입 조회
  __GET_JIT_STATS()              : JIT 통계

【메모리 감시】
  __GET_HEAP_USAGE()
  __GET_RC(object)
```

### 7.2 예약된 함수 (v20+)

```
未実装:
  - get_cause(exception)   (v8.8 설계, v20에서 구현)
  - get_trace(exception)   (v8.10 설계, v20에서 구현)
  - 나머지 고급 기능들
```

---

## 8️⃣ 제약사항 (UNCHANGEABLE)

### 8.1 언어 제약

```
❌ 불가능한 것들 (v20 이전):
  - Generics <T>
  - Trait/Interface
  - Pattern matching
  - Lambda/Closure
  - private/protected 접근 제어
  - Multiple inheritance
  - Custom constructor
  - Operator overloading
  - Module system
```

### 8.2 성능 제약

```
Max Recursion Depth: 1000
Max Handler Stack: 100
Max Loop Iterations: 1,000,000 (safety guard v3.7)
Max String Length: unlimited
Max Array Size: unlimited
Max Object Count: unlimited (RC only limits)
```

### 8.3 메모리 제약

```
Total Heap: 0x8000 ~ 0xFFFF (32KB, expandable)
Stack: 0x0000 ~ 0x1FFF (8KB)
Struct Pool: 0x2000 ~ 0x3FFF (8KB)
Array Pool: 0x0000 ~ 0x1FFF (8KB)

⚠️ 이 레이아웃은 고정.
   v20부터 변경하려면 메모리 모델 v2.0 필요.
```

---

## 9️⃣ 버전 정책

### 9.1 v11-v19: Core Enhancement (Backward Compatible)

```
v11.0: Garbage Collection (RC 위에 Mark-Sweep 추가)
v12.0: Advanced JIT (Method JIT, loop unrolling)
v13.0: Enhanced type system (더 정밀한 타입)
...
v19.x: Final enhancement before breaking change
```

**조건**: v1.0 Core Spec 위반 금지

### 9.2 v20.0: Breaking Change (새 ISA)

```
허용 사항:
  ✅ 새로운 타입 추가 (Generic, Trait, 등)
  ✅ 새로운 바이트코드 (ISA v2.0)
  ✅ 메모리 모델 v2.0
  ✅ Exception hierarchy 확장

조건: v1.0과 호환성 완전 단절 선언 필요
```

---

## 🔟 아키텍처 붕괴 방지

### 10.1 위반 사례들 (하면 안 되는 것)

```
❌ "조금 타입 시스템 수정": v12부터 컴파일러 복잡도 폭증
❌ "메모리 레이아웃 변경": 기존 객체 접근 오류
❌ "바이트코드 중간 삽입": v15에서 인코더 혼란
❌ "Exception 필드 추가": v18에서 호환성 깨짐

결과: v20 근처에서 아키텍처 완전 붕괴
```

### 10.2 Spec Freeze 이점

```
✅ v11-19 개발자: 안정적 기초 위에서 개발
✅ 컴파일러: 최적화 대상 명확 (ISA 고정)
✅ 커뮤니티: 호환 라이브러리 작성 가능
✅ 마이그레이션: v20 계획 충분히 세울 수 있음
```

---

## 승인

| 항목 | 상태 | 서명 | 일시 |
|------|------|------|------|
| Spec Freeze | ✅ 승인 | Claude (v10.3) | 2026-02-25 |
| 타입 시스템 | ✅ 확정 | - | - |
| 메모리 모델 | ✅ RC Only | - | - |
| ISA 고정 | ✅ v1.0 | - | - |
| Exception 계층 | ✅ 3개 | - | - |

---

**이 문서는 v11.0부터 v19.99까지 유효합니다.**
**v20에서만 새로운 스펙이 허용됩니다.**

**변경 금지. 위반 시 아키텍처 붕괴.**

🔴 **FROZEN** 🔴
