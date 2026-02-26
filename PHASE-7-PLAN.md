# Phase 7: Retry Logic (재시도 패턴)

## ✅ 완료 (2026-02-27)

### 1. Lexer 업데이트 ✅
- [x] RETRY keyword 추가 (lexer.ts:102)

### 2. Parser 업데이트 ✅
- [x] parseRetryStatement() 메서드 구현 (parser.ts:266-303)
- [x] RetryStatement AST 노드 생성
- [x] 파싱 테스트 통과

### 3. Interpreter 구현 ✅
- [x] executeRetry() 메서드 (simple-interpreter-v2.ts:444-510)
- [x] 재시도 전략: LINEAR, EXPONENTIAL, FIXED
- [x] 재시도 로직 (성공/실패 처리)
- [x] Logger 통합 (DEBUG_INTERPRETER=true로 추적 가능)
- [x] 4/4 테스트 케이스 통과

## 📋 구현 전략

### RetryStatement 실행 흐름

```
RETRY maxAttempts=3, backoff=exponential, initialDelay=100 {
  SET data = AWAIT httpGet(url)  // 실패할 수 있는 작업
}
```

1. **시도 1**: initialDelay 없이 바로 실행
   - 성공 → 종료
   - 실패 → 대기

2. **시도 2**: initialDelay (100ms) 대기 후 재시도
   - 지수 백오프면: 다음은 200ms
   - 성공 → 종료
   - 실패 → 대기

3. **시도 3**: 200ms 대기 후 재시도
   - 성공 → 종료
   - 실패 → 에러 발생 (maxAttempts 초과)

### 재시도 전략

- **LINEAR**: 100ms, 200ms, 300ms, 400ms (선형)
- **EXPONENTIAL**: 100ms, 200ms, 400ms, 800ms (2배씩)
- **FIXED**: 100ms, 100ms, 100ms, 100ms (고정)

## 🧪 테스트 케이스

### Test 1: 기본 재시도 (첫 시도 성공)
```
RETRY maxAttempts=3, backoff=exponential, initialDelay=100 {
  SET data = "success"
}
PRINT data  // "success"
```
**기대**: 첫 번째 시도에서 성공

### Test 2: 실패 후 성공
```
callCount = 0

RETRY maxAttempts=3, backoff=exponential, initialDelay=50 {
  callCount = callCount + 1
  IF callCount < 2 {
    THROW "Network error"
  }
  SET data = "success"
}
PRINT callCount  // 2 (두 번 시도함)
```
**기대**: 첫 번째 실패, 두 번째 성공

### Test 3: 최대 재시도 초과
```
RETRY maxAttempts=2, backoff=exponential, initialDelay=50 {
  THROW "Always fails"
}
```
**기대**: 2번 시도 후 에러 발생

### Test 4: 재시도 통계
```
RETRY maxAttempts=3, backoff=exponential, initialDelay=50 {
  ... 작업 ...
}
PRINT retry_attempts     // 1~3
PRINT retry_last_delay   // 마지막 대기 시간
```

## 📝 구현 순서

1. **executeRetryStatement** 메서드 (기본 구조)
2. **delay 함수 활용** (이미 구현됨)
3. **재시도 전략 계산** (delayMs 계산)
4. **통계 수집** (선택사항)
5. **테스트 작성 및 검증**

## 🎯 성공 기준

- ✅ 파싱 테스트: RetryStatement 생성
- ✅ 단위 테스트: executeRetryStatement 메서드
- ✅ 통합 테스트: 실제 RETRY 문 실행
- ✅ Edge case: maxAttempts=1, backoff="fixed"

## 📚 참고 자료

- delay() 함수: src/cli/simple-interpreter-v2.ts (1027번)
- executeWhile: 제어 흐름 참고용
- Logger: DEBUG_INTERPRETER=true로 추적

---

**예상 소요 시간**: 2-3시간
**난이도**: ⭐⭐⭐ (중간)
**핵심**: 비동기 재시도 + 지수 백오프 계산
