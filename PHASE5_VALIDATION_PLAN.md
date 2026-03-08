# Phase 5 Function Validation Plan

**Status**: 🚀 Ready for Execution
**Target**: 100% Function Implementation Verification
**Date**: 2026-03-06

---

## Overview

Phase 5는 FreeLang v2의 **함수 기능(Function)** 완전 검증 단계입니다. 이 문서는 검증 범위, 테스트 전략, 그리고 성공 기준을 정의합니다.

---

## 📋 Test Categories (7가지)

### 1️⃣ 재귀 함수 (Recursive Functions)

**목표**: 함수 재귀 호출이 올바르게 작동하는지 검증

| Test | Expected | File |
|------|----------|------|
| fibonacci(10) | 55 | `examples/fibonacci.fl` |
| factorial(5) | 120 | `examples/factorial.fl` |
| ackermann(3,3) | 61 | `examples/ackermann.fl` |

**검증 기준**:
- 재귀 호출 스택이 올바르게 관리됨
- 기저 사례(base case) 판별 정상 작동
- 반환값이 정확하게 집계됨

---

### 2️⃣ 함수 인자 (Function Arguments)

**목표**: 다양한 수의 인자를 받는 함수들이 정상 작동하는지 검증

| Test | Args | Expected | File |
|------|------|----------|------|
| test_zero_args() | 0 | 42 | `examples/function_args.fl` |
| inc(10) | 1 | 11 | `examples/function_args.fl` |
| sum_three(1,2,3) | 3 | 6 | `examples/function_args.fl` |
| sum_five(1,2,3,4,5) | 5 | 15 | `examples/function_args.fl` |

**검증 기준**:
- 0개 인자: 함수 정의 및 호출 정상
- N개 인자: 모든 인자가 올바르게 전달됨
- 반환값이 정확함

---

### 3️⃣ 스코프 및 메모리 (Scope & Memory)

**목표**: 함수 내 로컬 변수가 격리되고, 전역 변수가 보존되는지 검증

| Test | Scope Type | Expected | File |
|------|-----------|----------|------|
| test_local_scope() | Local isolation | 15 | `examples/scope_test.fl` |
| modify_and_return() | Mutation | 25 | `examples/scope_test.fl` |
| nested_scope() | Nested block | 3 | `examples/scope_test.fl` |
| global_x | Global preservation | 100 | `examples/scope_test.fl` |

**검증 기준**:
- 함수 내 로컬 변수는 함수 외부에 영향을 주지 않음
- 전역 변수는 함수 호출 후에도 값이 변하지 않음
- 중첩 블록 내 변수 선언이 상위 스코프를 침범하지 않음

---

### 4️⃣ 깊은 재귀 (Deep Recursion)

**목표**: 깊이 50 이상의 재귀 호출이 스택 오버플로우 없이 작동하는지 검증

| Test | Depth | Expected |
|------|-------|----------|
| count_down(50) | 50 | 50 |

**검증 기준**:
- 깊이 50: 정상 작동
- 메모리 누수 없음
- 스택 프레임이 올바르게 관리됨

---

### 5️⃣ 엣지 케이스 (Edge Cases)

**목표**: 특수한 상황(중첩 함수, 다중 리턴 등)에서 함수가 정상 작동하는지 검증

| Test | Case | Expected | File |
|------|------|----------|------|
| outer() | Nested function | 60 | `examples/edge_cases.fl` |
| global_and_local() | Mixed scope | 15 | `examples/edge_cases.fl` |
| multiple_returns(-5) | Negative | -1 | `examples/edge_cases.fl` |
| multiple_returns(0) | Zero | 0 | `examples/edge_cases.fl` |
| multiple_returns(5) | Positive | 1 | `examples/edge_cases.fl` |

**검증 기준**:
- 중첩 함수(inner function) 정상 호출
- 전역 변수와 로컬 변수의 혼합 사용
- 다중 return 경로 모두 작동

---

## 🛠️ 검증 도구

### 실행 방법

```bash
# 모든 테스트 실행
npx ts-node scripts/phase5-validator.ts --all

# 특정 테스트만 실행
npx ts-node scripts/phase5-validator.ts fibonacci

# 보고서 생성
npx ts-node scripts/phase5-validator.ts --report

# Jest 테스트 실행
npm test -- tests/phase5-function-validation.test.ts
```

### 출력 형식

```
🧪 Phase 5 Function Validation Suite

✓ fibonacci                   [245ms]
✓ factorial                   [128ms]
✓ ackermann                   [512ms]
✓ function_args               [156ms]
✓ scope_test                  [189ms]
✓ recursion_depth             [234ms]
✓ edge_cases                  [267ms]

📊 Summary

Total Tests: 7
Passed: 7
Failed: 0
Errors: 0
Total Duration: 1731ms
Success Rate: 100.00%

✅ ALL TESTS PASSED - Phase 5 Complete!
```

---

## ✅ 성공 기준

### Level 1: 기본 통과 (Pass Criteria)

- [ ] 모든 재귀 함수 테스트 통과
- [ ] 모든 함수 인자 테스트 통과
- [ ] 스코프 격리 테스트 통과
- [ ] 깊은 재귀(depth 50) 정상 작동
- [ ] 엣지 케이스 모두 통과

**→ 최소 조건: 7/7 테스트 통과 (100%)**

### Level 2: 안정성 검증 (Stability Check)

- [ ] Valgrind 메모리 누수 검사 통과
- [ ] AddressSanitizer 메모리 오버플로우 감지 안 함
- [ ] 1000회 반복 실행 시 일관된 결과
- [ ] 최대 메모리 사용량 < 100MB

### Level 3: 성능 검증 (Performance Check)

- [ ] fibonacci(10): < 500ms
- [ ] factorial(5): < 100ms
- [ ] ackermann(3,3): < 1000ms
- [ ] 전체 테스트 세트: < 3초

---

## 📊 예상 결과

### 성공 시나리오 (모든 테스트 통과)

```
✅ Phase 5: Function Implementation Complete
- Recursive functions: ✓
- Function arguments: ✓
- Scope & memory: ✓
- Deep recursion: ✓
- Edge cases: ✓
Status: READY FOR LEVEL 4
```

### 실패 시나리오 (일부 테스트 실패)

각 실패 테스트에 대해:
1. 에러 메시지 상세 분석
2. 원인 파악 (파서, IR 생성기, VM 실행기 중 어디?)
3. 수정
4. 재테스트

---

## 📅 실행 계획

| Step | Task | Est. Time |
|------|------|-----------|
| 1 | 테스트 파일 생성 | 30분 |
| 2 | 검증 도구 개발 | 1시간 |
| 3 | 테스트 실행 & 디버깅 | 2시간 |
| 4 | 안정성 검증 | 1시간 |
| 5 | 성능 검증 | 30분 |
| 6 | 최종 보고서 작성 | 30분 |

**총 예상 시간**: 5시간

---

## 📝 최종 산출물

1. **테스트 파일들** (7개)
   - `examples/fibonacci.fl`
   - `examples/factorial.fl`
   - `examples/ackermann.fl`
   - `examples/function_args.fl`
   - `examples/scope_test.fl`
   - `examples/recursion_depth.fl`
   - `examples/edge_cases.fl`

2. **검증 도구**
   - `tests/phase5-function-validation.test.ts` (Jest 테스트)
   - `scripts/phase5-validator.ts` (CLI 도구)

3. **검증 보고서**
   - `PHASE5_VALIDATION_REPORT.json` (구조화된 결과)
   - `PHASE5_VALIDATION_REPORT.md` (마크다운 보고서)

4. **메모리 안정성 증명**
   - Valgrind 출력
   - AddressSanitizer 보고서

---

## 🎯 최종 목표

**Phase 5를 통해 다음을 확인한다:**

✅ FreeLang v2의 함수 기능이 완벽하게 작동하고 있음
✅ 재귀, 스코프, 메모리 관리가 모두 안정적임
✅ Level 3 달성을 위한 필수 조건 충족
✅ Level 4 진행 준비 완료

---

**Next Phase**: Level 4 (고급 기능: OOP, 모듈 시스템 등)
