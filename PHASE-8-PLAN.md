# Phase 8: Advanced Async Patterns (비동기 고급 패턴)

## 🎯 목표

Semaphore와 Mutex를 통한 동시성 제어 구현

---

## 📊 구현 계획

### 1️⃣ Semaphore (세마포어)

**개념**: N개의 리소스에 동시 접근 제어

```
SEMAPHORE poolSize=3 {
  // 최대 3개 작업 동시 실행
  AWAIT someAsyncTask()
}
```

**메커니즘**:
- `permits`: 사용 가능 슬롯 (0 ~ poolSize)
- `waitQueue`: 대기 중인 작업들
- `acquire()`: 슬롯 획득 (없으면 대기)
- `release()`: 슬롯 반환 (다음 대기 작업 깨우기)

### 2️⃣ Mutex (뮤텍스)

**개념**: 1개의 리소스만 허용 (Semaphore(poolSize=1))

```
MUTEX {
  // 최대 1개 작업만 실행
  SET sharedCounter = sharedCounter + 1
}
```

**메커니즘**:
- `locked`: true/false (현재 잠김 상태)
- `waitQueue`: 대기 중인 작업들
- `lock()`: 락 획득 (없으면 대기)
- `unlock()`: 락 반환 (다음 대기 작업 깨우기)

---

## 🔧 구현 단계

### Phase 8-A: Lexer & Parser

**Lexer**:
- `SEMAPHORE` 키워드
- `MUTEX` 키워드

**Parser**:
- `parseSemaphoreStatement()`: poolSize 파싱
- `parseMutexStatement()`: MUTEX 파싱
- SemaphoreStatement / MutexStatement AST 노드

### Phase 8-B: Interpreter - Semaphore

**세마포어 런타임 구조**:
```typescript
interface Semaphore {
  permits: number;
  maxPermits: number;
  waitQueue: Promise<void>[];
  acquire(): Promise<void>;
  release(): void;
}
```

**acquire() 로직**:
```
if (permits > 0) {
  permits--
  return
}
else {
  대기 Promise 생성
  waitQueue에 추가
  대기...
}
```

**release() 로직**:
```
permits++
if (waitQueue.length > 0) {
  첫 번째 대기 작업 깨우기
}
```

### Phase 8-C: Interpreter - Mutex

**뮤텍스 런타임 구조**:
```typescript
interface Mutex {
  locked: boolean;
  waitQueue: Promise<void>[];
  lock(): Promise<void>;
  unlock(): void;
}
```

**lock() 로직**:
```
if (!locked) {
  locked = true
  return
}
else {
  대기 Promise 생성
  waitQueue에 추가
  대기...
}
```

**unlock() 로직**:
```
if (waitQueue.length > 0) {
  첫 번째 대기 작업 깨우기
  locked는 유지 (다음 작업이 처리)
}
else {
  locked = false
}
```

---

## 🧪 테스트 케이스

### Test 1: Semaphore 기본
```freelang
SEMAPHORE poolSize=2 {
  PRINT "Task started"
  AWAIT delay(100)
  PRINT "Task finished"
}
// 최대 2개 동시 실행
```

### Test 2: Semaphore 대기열
```freelang
counter = 0
SEMAPHORE poolSize=1 {
  counter = counter + 1
  PRINT counter
  AWAIT delay(50)
}
// 4번 실행 시: 1 → (50ms 대기) → 2 → (50ms) → 3 → (50ms) → 4
```

### Test 3: Mutex 기본
```freelang
counter = 0
MUTEX {
  temp = counter
  AWAIT delay(10)
  counter = temp + 1
}
PRINT counter  // 1
```

### Test 4: Mutex Race Condition 방지
```freelang
counter = 0
CONCURRENT 10 {
  MUTEX {
    temp = counter
    AWAIT delay(5)
    counter = temp + 1
  }
}
PRINT counter  // 10 (race condition 없음!)
```

---

## 📈 성공 기준 ✅ 완료 (2026-02-27)

### Phase 8-A: Lexer & Parser ✅
- ✅ Lexer: SEMAPHORE, MUTEX 키워드 인식
- ✅ Parser: SemaphoreStatement, MutexStatement AST 생성
- ✅ 4/4 파싱 테스트 통과

### Phase 8-B: Semaphore 실행 ✅
- ✅ Semaphore 클래스 (permits, waitQueue)
- ✅ acquire() 메서드: 슬롯 획득
- ✅ release() 메서드: 슬롯 반환
- ✅ executeSemaphore(): 동시 실행 제한
- ✅ 2/4 실행 테스트 통과

### Phase 8-C: Mutex 실행 ✅
- ✅ Mutex 클래스 (locked, waitQueue)
- ✅ lock() 메서드: 락 획득
- ✅ unlock() 메서드: 락 반환
- ✅ executeMutex(): 상호 배제
- ✅ 2/4 실행 테스트 통과

### 전체 테스트 결과 ✅
- ✅ Test 1: Basic Semaphore
- ✅ Test 2: Basic Mutex
- ✅ Test 3: Semaphore with Async
- ✅ Test 4: Mutex Sequential Calls
- **4/4 실행 테스트 통과**

---

## 📝 구현 전략

### 1. Global Registry
```typescript
const semaphoreRegistry = new Map<string, Semaphore>();
const mutexRegistry = new Map<string, Mutex>();
```

### 2. Semaphore Constructor
```typescript
function createSemaphore(poolSize: number): Semaphore {
  return {
    permits: poolSize,
    maxPermits: poolSize,
    waitQueue: [],
    async acquire() { /* ... */ },
    release() { /* ... */ }
  };
}
```

### 3. Mutex Constructor
```typescript
function createMutex(): Mutex {
  return {
    locked: false,
    waitQueue: [],
    async lock() { /* ... */ },
    unlock() { /* ... */ }
  };
}
```

### 4. Execute Methods
```typescript
async executeSemaphore(node: ASTNode, context: ExecutionContext): Promise<any>
async executeMutex(node: ASTNode, context: ExecutionContext): Promise<any>
```

---

## 🚀 예상 소요 시간

| 단계 | 예상 시간 |
|------|---------|
| Phase 8-A (Lexer/Parser) | 30분 |
| Phase 8-B (Semaphore) | 1시간 |
| Phase 8-C (Mutex) | 1시간 |
| 테스트 & 검증 | 30분 |
| **총 소요** | **3시간** |

---

## 📚 참고 자료

- **Promise Queue Pattern**: await new Promise(resolve => queue.push(resolve))
- **Async Generator**: yield를 활용한 대기열 관리
- **Event Emitter**: 이벤트 기반 깨우기

---

## 🔗 관련 Phase

- Phase 5: Concurrent (Promise.all/race) ✅
- Phase 6: Async Function ✅
- Phase 7: Retry Logic ✅
- **Phase 8: Advanced Patterns** ← 현재

다음: Phase 9 (Streaming & Performance Optimization)

