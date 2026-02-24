# 🔧 IMPLEMENTATION_RULES.md v1.0

**Version**: v1.0 (Integration Policy)
**Date**: 2026-02-25
**Target**: v2 Runtime from v9 Prototype
**Mandate**: "From formal semantics to production code"

---

## 1️⃣ 개요: v9 → v2 코드 통합

### 상황

```
v9 (Prototype):
  ├─ v9.0 SmartPointers (UniquePtr, SharedPtr, WeakPtr)
  ├─ v9.4 Member Ownership & Deep Release
  ├─ v9.5 Circular Reference Detection
  ├─ v9.6 Weak Reference Implementation
  └─ v9.13 Extreme Stress Testing ✅ Complete

v2 (Production):
  ├─ MEMORY_MODEL_FORMAL.md (형식 의미론)
  ├─ WEAK_REF_SPEC.md (Weak 참조 시맨틱)
  ├─ CYCLE_HANDLING_POLICY.md (순환 정책)
  └─ (지금부터) ARC runtime 구현
```

### 목표

```
v9의 증명된 알고리즘을 v2 스펙에 맞게 통합
- MEMORY_MODEL_FORMAL의 형식 보증 유지
- WEAK_REF_SPEC의 시맨틱 준수
- CYCLE_HANDLING_POLICY의 정책 반영
- v2 프로덕션 품질 달성
```

---

## 2️⃣ 통합 체크리스트 (5단계)

### Stage 1: 코드 분석 (Understand v9)

**목표**: v9 코드의 핵심 알고리즘 파악

**작업**:

```
1. v9.0 SmartPointers 읽기
   ├─ UniquePtr: exclusive ownership
   ├─ SharedPtr: reference counting 메커니즘
   └─ WeakPtr: invalidation 로직

2. v9.4 Member Ownership 읽기
   ├─ destroy() 메서드 패턴
   └─ 재귀적 정리 (DFS order)

3. v9.5 Circular Reference Detection 읽기
   ├─ Cycle 감지 알고리즘
   └─ Isolated object groups

4. v9.6 Weak Reference 읽기
   ├─ weakRefTable 관리
   ├─ Auto-nullification (invalidation)
   └─ Thread-safe 구현

검증:
  [ ] 각 v9 단계의 테스트 실행
  [ ] 모든 증명 재현 (5/5, 3/3, 3/3 tests)
  [ ] 코드 이해도 70% 이상
```

**성공 기준**:
- v9.0~v9.6 모든 테스트 PASS
- 알고리즘 설명 가능 (음성 기록)

### Stage 2: 스펙 매핑 (Align with FORMAL Model)

**목표**: v9 코드가 MEMORY_MODEL_FORMAL을 만족하는지 검증

**검증 항목**:

```
MEMORY_MODEL_FORMAL Section 1: RETAIN/RELEASE Happens-Before
  ✓ v9.0 SharedPtr::retain() 호출 순서
  ✓ v9.0 SharedPtr::release() 호출 순서
  ✓ Atomicity (CAS operations)
  → Formal Spec 만족?

MEMORY_MODEL_FORMAL Section 2: Destructor Ordering (DFS)
  ✓ v9.4 destroy() 순서
  ✓ Member release 전 순회
  ✓ _destroyObject() 재귀
  → 정확히 DFS인가? (depth-first traversal)

MEMORY_MODEL_FORMAL Section 3: Weak Ref Invalidation
  ✓ v9.6 weakRefTable 갱신
  ✓ Auto-NULL 타이밍
  ✓ NULL before dealloc?
  → Invalidation point 정확?

MEMORY_MODEL_FORMAL Section 4: Thread Visibility
  ✓ Memory barriers (x86 TSO vs ARM)
  ✓ atomicIncrement/Decrement
  ✓ happens-before edges
  → Sequential consistency 달성?

MEMORY_MODEL_FORMAL Section 5: Exception Safety
  ✓ Stack unwinding with RC sync
  ✓ UNWIND_WITH_RC algorithm
  ✓ Exception 중 leaks?
  → Exception safe level 3 달성?
```

**Pass/Fail Criteria**:
- 모든 섹션에서 formal spec과 alignment ✓
- Contradiction 없음
- Performance guarantee 유지

### Stage 3: 정책 적용 (Apply CYCLE_HANDLING_POLICY)

**목표**: v9 구현이 v2 cycle 정책을 자동으로 강제하는지 확인

**검증 항목**:

```
CYCLE_HANDLING_POLICY 요구사항:

1. Cycle 감지
   v9.5: Circular Reference Detection 있나?
   → Tarjan algorithm 또는 DFS-based?
   → 종료 시 leak report?

2. Weak ref 필수화
   v9.6: WEAK_REF 타입 강제?
   → Type system에서 strongRef vs weakRef 구분?
   → NULL check 필수?

3. Auto-nullification
   v9.6: weakRefTable invalidation?
   → Destruction 시 즉시 NULL?
   → Before deallocate?

4. Developer guidance
   v9 코드에 cycle break 예시?
   → 문서, 테스트, 커멘트?

Check:
  [ ] v9.5 cycle detection 재현
  [ ] v9.6 weakRef auto-NULL 검증
  [ ] 모든 v9 테스트가 cycle 안전?
```

**Success Criteria**:
- v9 코드가 cycle handling 정책 구현
- Policy exception 없음

### Stage 4: 코드 검증 (Code Quality)

**목표**: v9 코드가 production quality를 만족하는지 검증

**검증 항목**:

```
1. Type Safety
   [ ] TypeScript strict mode
   [ ] No any types (최소화)
   [ ] Generics 정확
   [ ] Exception types 명시

2. Memory Safety
   [ ] Buffer overflow 방지
   [ ] Use-after-free 방지 (test coverage)
   [ ] Double-free 방지
   [ ] Information leak 방지

3. Performance
   [ ] RC ops = O(1)
   [ ] Weak ref = O(1)
   [ ] Cycle detection = O(V+E)
   [ ] Memory overhead < 5%

4. Testing
   [ ] Unit tests 70%+ coverage
   [ ] Integration tests (exception, threading)
   [ ] Stress tests (1M+ allocs)
   [ ] Leak tests (valgrind, addresssan)

5. Documentation
   [ ] 각 함수 주석
   [ ] Algorithm 설명
   [ ] 예시 코드
   [ ] Edge case 문서화

6. Error Handling
   [ ] Panic/crash 없음
   [ ] Graceful degradation
   [ ] Error messages 명확
```

**Acceptance Criteria**:
- Static analysis: 0 errors (eslint, type-check)
- Test coverage: > 80%
- Memory tests: 0 leaks (valgrind, asan)
- Performance: baseline 대비 < 10% slower

### Stage 5: 통합 테스트 (Integration Test)

**목표**: v9 코드 + v2 스펙이 함께 작동하는지 검증

**테스트 시나리오**:

```
INTEGRATION_TEST_1: Basic RC
  Setup:
    obj1 = NEW Object()
    obj2 = NEW Object()
    obj1.ref = obj2  (Strong)

  Test:
    Release obj1 → obj2 RC--? (Yes)
    Release obj2 → deallocate? (Yes)
    RC all zero? (Yes)

  Expected: PASS ✓

INTEGRATION_TEST_2: Weak Ref Auto-NULL
  Setup:
    obj_a = NEW A()
    obj_b = NEW B()
    obj_a.ref = obj_b       (Strong)
    obj_b.weak_ref = obj_a  (Weak)

  Test:
    Release obj_a
    → obj_b.weak_ref == NULL? (auto)

  Expected: PASS ✓

INTEGRATION_TEST_3: Cycle Break
  Setup:
    obj_a = NEW A()
    obj_b = NEW B()
    obj_a.ref = obj_b       (Strong)
    obj_b.ref = obj_a       (Strong) ← Cycle!
    obj_b.weak_ref = obj_a  (Weak) ← Break cycle

  Test:
    Release obj_a
    → obj_b.ref = obj_a    (still valid? No, RC=0)
    → But obj_b.weak_ref = NULL (auto)
    → obj_b RC=0? (Yes, no cycle)

  Expected: PASS ✓

INTEGRATION_TEST_4: Exception + RC Sync
  Setup:
    TRY
      obj = NEW Object()
      risky_operation()  → throws
    CATCH
      obj RC--? (during unwinding)

  Test:
    obj deallocated?

  Expected: PASS ✓, ZERO leaks

INTEGRATION_TEST_5: Stress (1M allocs)
  Test:
    1M allocations + deallocations
    Random strong/weak references
    Check: ZERO leaks, consistent RC

  Expected: PASS ✓, < 5 seconds
```

**Success Criteria**:
- All 5 integration tests PASS
- ZERO memory leaks (valgrind)
- Performance: Baseline ±10%

---

## 3️⃣ 코드 조직 구조

### Runtime Directory

```
spec/
├── CORE_SPEC_v1.0.md           (Type System + ISA + Exceptions)
├── MEMORY_MODEL_FORMAL.md      (Formal semantics)
├── WEAK_REF_SPEC.md            (Weak ref semantics)
├── CYCLE_HANDLING_POLICY.md    (Cycle policy)
└── IMPLEMENTATION_RULES.md     (이 파일)

runtime/
├── arc/
│   ├── atomic-ops.ts           (atomic ++/--)
│   ├── smart-pointers.ts       (UniquePtr, SharedPtr, WeakPtr)
│   ├── reference-counting.ts   (RC management)
│   ├── weak-ref-table.ts       (weakRefTable)
│   ├── invalidation.ts         (auto-nullification)
│   ├── memory-manager.ts       (allocation/deallocation)
│   └── object-lifecycle.ts     (creation → destruction)
│
└── gc/
    ├── cycle-detector.ts       (Tarjan algorithm)
    ├── leak-reporter.ts        (FREELANG_LEAK_REPORT)
    └── profiler.ts             (memory statistics)

tests/
├── unit/
│   ├── atomic-ops.test.ts
│   ├── smart-pointers.test.ts
│   ├── weak-refs.test.ts
│   └── cycle-detection.test.ts
│
├── integration/
│   ├── basic-rc.test.ts
│   ├── weak-ref-auto-null.test.ts
│   ├── cycle-break.test.ts
│   ├── exception-rc-sync.test.ts
│   └── stress-1m-allocs.test.ts
│
└── system/
    ├── memory-safety.test.ts   (valgrind, asan)
    ├── thread-safety.test.ts   (tsan)
    └── performance.bench.ts    (1M ops/sec)
```

---

## 4️⃣ 통합 체크리스트 (Before v2.0 Release)

### Code Review Checklist

```
Formal Semantics Compliance:
  ☐ RETAIN/RELEASE happens-before 구현
  ☐ Destructor DFS ordering
  ☐ Weak ref invalidation (NULL before dealloc)
  ☐ Thread visibility model
  ☐ Exception safety

Policy Compliance:
  ☐ Cycle detection (leak detector)
  ☐ Weak ref required (type system)
  ☐ Auto-nullification working
  ☐ Developer guidance (docs)

Code Quality:
  ☐ TypeScript strict mode pass
  ☐ ESLint: 0 errors
  ☐ Test coverage > 80%
  ☐ Memory tests: 0 leaks
  ☐ Performance: ±10% baseline

Integration Tests:
  ☐ INTEGRATION_TEST_1: Basic RC
  ☐ INTEGRATION_TEST_2: Weak Ref Auto-NULL
  ☐ INTEGRATION_TEST_3: Cycle Break
  ☐ INTEGRATION_TEST_4: Exception + RC Sync
  ☐ INTEGRATION_TEST_5: Stress (1M allocs)

Documentation:
  ☐ Function-level comments
  ☐ Algorithm explanations
  ☐ Example code
  ☐ Edge cases documented
  ☐ Developer guide (getting started)
```

### Sign-Off Criteria

```
✅ All formal semantics verified
✅ All policies enforced
✅ All tests pass (unit + integration + system)
✅ 0 memory leaks (valgrind, asan)
✅ 0 data races (tsan)
✅ Performance targets met (1M ops/sec)
✅ Documentation complete
→ v2-freelang-ai ready for v2.0 release
```

---

## 5️⃣ Risk Mitigation

### Known Risks

| Risk | Mitigation | Owner |
|------|-----------|-------|
| RC atomicity failure | ThreadSanitizer testing | Implementation |
| Weak ref still valid after dealloc | Valgrind + custom patrol | Implementation |
| Exception + RC leak | Comprehensive exception tests | Testing |
| Performance regression | Benchmark baseline + CI | Testing |
| Cycle detection false positives | Review algorithm + unit tests | Implementation |

---

## 6️⃣ Success Criteria (v2.0 Release)

```
🔴 MUST HAVE:
  ✅ MEMORY_MODEL_FORMAL compliance (100%)
  ✅ WEAK_REF_SPEC compliance (100%)
  ✅ CYCLE_HANDLING_POLICY compliance (100%)
  ✅ 0 memory leaks (verified)
  ✅ 0 data races (verified)
  ✅ All tests pass (unit + integration + stress)
  ✅ Type safety (strict TypeScript)
  ✅ Exception safety (level 3)

🟠 SHOULD HAVE:
  ✅ > 80% test coverage
  ✅ Performance: 1M+ RC ops/sec
  ✅ Complete documentation
  ✅ Developer guide + examples

🟢 NICE TO HAVE:
  ✅ Performance: 10M+ RC ops/sec
  ✅ 90%+ test coverage
  ✅ IDE integration
```

---

## 기록이 증명이다

**이 Integration Rules은 v9 증명 → v2 프로덕션 변환의 로드맵입니다.**

1단계: v9 코드 이해 (알고리즘 이해)
2단계: 스펙 매핑 (형식 검증)
3단계: 정책 적용 (제약 조건)
4단계: 코드 검증 (품질)
5단계: 통합 테스트 (증명)

이 5단계를 모두 통과하면 v2는 진정한 **프로덕션 RC 언어**가 됩니다.

---

**Rules v1.0 locks INTEGRATION strategy.**
**No changes permitted without community consensus.**

기초 proven. 길 제시됨. 🔒
