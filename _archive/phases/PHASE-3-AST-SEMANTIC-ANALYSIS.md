# Phase 3: AST 기반 의미 분석 및 고급 타입 추론

**시작일**: 2026-02-17
**목표**: 키워드 매칭 폐기 → AST 의미 분석으로 타입 추론 정확도 70~80%
**기간**: 8주 (240시간)
**상태**: 🚀 **시작**

---

## 📋 Phase 2에서의 실패 분석

### Task 2.3 (IncompleteTypeInferenceEngine) 재평가

#### 주장 vs 현실

| 측면 | 주장 | 현실 | 정확도 |
|------|------|------|--------|
| **단순 패턴** | 50% | 키워드 사전 | 50% |
| **복잡한 코드** | 포함됨 | 테스트 안 함 | ~10% |
| **실제 사용** | 70~80% 추정 | 동전 던지기 수준 | **15%** |
| **근본 문제** | 지능형 추론 | 정규식 + 매칭 | ❌ |

#### 근본 원인
```
"배열" → array
"합" → number
"필터링" → array
```
= **정교한 사전일 뿐, 지능이 아님**

#### 위험성
```
fn process(arr) {
  if (complex_condition) {
    for (item in arr) {
      if (item.valid) {
        sum = sum + transform(item)
      }
    }
  }
}

현재: "배열", "합" 키워드만 찾음 → 대부분 못 찾음
목표: AST 파싱 → 모든 문맥 이해 → 90% 정확도
```

### 의사결정: 완전 재구축

❌ **점진적 개선**: 이미 구조적 문제 → 불가능
✅ **완전 재구축**: AST 의미 분석으로 새로 시작

---

## 🎯 Phase 3 목표

### Primary Goals
1. **타입 추론 정확도**: 15% → **70~80%**
2. **신뢰도 기반**: 매번 confidence score 제공
3. **정직한 평가**: 실제 측정값 공표
4. **복잡도 처리**: 중첩 루프, 조건문, 메서드 호출

### Success Criteria
```
fn complex_example
  do
    results = []
    for data in dataset
      if data.valid
        for item in data.items
          processed = transform(item)
          if processed > 0
            results.push(processed)
    return results

✅ 정확도 >= 85%
✅ 신뢰도 >= 0.80
✅ 모든 변수 타입 추론
✅ 제어 흐름 분석
```

---

## 🏗️ Architecture: 4 Stage 구성

### Stage 1: 의미 분석 엔진 (2주)
**목표**: AST 파싱 기반 변수 생명주기 추적

```
SemanticAnalyzer
├── analyzeVariableLifecycle()
│   ├── 할당 추적 (assignments)
│   ├── 사용 추적 (usages)
│   ├── 범위 종료 (scope exit)
│   └── 타입 추론 (inferred type)
├── analyzeMethodCalls()
│   ├── arr.push() → arr: array
│   ├── str.length → str: string
│   └── obj.method() → obj: object
├── analyzeOperations()
│   ├── x + y → both numeric
│   ├── arr[i] → arr: array, i: number
│   └── obj.prop → obj: object
└── analyzeControlFlow()
    ├── if/else 분기
    ├── for/while 반복
    └── 타입 불확실성 추적
```

**핵심 구현** (800 LOC):
- `src/analyzer/semantic-analyzer.ts`
- `src/analyzer/variable-tracker.ts`
- `src/analyzer/method-analyzer.ts`

### Stage 2: 컨텍스트 추적 시스템 (2주)
**목표**: 깊은 의존성 및 불확실성 관리

```
ContextTracker
├── scopeChain: Scope[]
│   ├── 전역 변수
│   ├── 함수 매개변수
│   ├── 블록 로컬 변수
│   └── 루프 변수
├── dependencyGraph: Map<var, var[]>
│   ├── x = 10
│   ├── y = x + 5 ← y depends on x
│   └── z = y * 2 ← z depends on y
├── typeUncertainty: Map<var, Type[]>
│   ├── if (cond) x = 10
│   ├── else x = "hi"
│   └── x: number | string (union)
└── confidenceScores: Map<var, 0.0-1.0>
    ├── explicit type: 0.95
    ├── method call: 0.85
    ├── arithmetic: 0.80
    └── inference: 0.50
```

**핵심 구현** (600 LOC):
- `src/analyzer/context-tracker.ts`
- `src/analyzer/scope-manager.ts`
- `src/analyzer/dependency-graph.ts`

### Stage 3: 고급 타입 추론 엔진 (3주)
**목표**: 통합 추론 및 신뢰도 계산

```
AdvancedTypeInferenceEngine
├── parse(): AST
├── analyzeSemantics(): SemanticInfo
├── trackContext(): ContextInfo
├── inferFunction(): FunctionSignature
├── calculateConfidence(): 0.0-1.0
├── explainReasoning(): string[]
└── suggestType(): TypeSuggestion[]

inferFunction(code: string): {
  signature: {
    name: string,
    inputs: Map<string, Type>,
    output: Type
  },
  confidence: 0.85,
  reasoning: [
    "변수 arr은 for-in 루프에서 iterable",
    "item은 array의 element",
    "sum = sum + item → numeric operation",
    "return sum → output type is number"
  ],
  fallback: null (신뢰도 높음)
}
```

**핵심 구현** (1000 LOC):
- `src/analyzer/advanced-type-inference.ts` (REWRITE)
- `src/analyzer/type-calculator.ts`

### Stage 4: 검증 및 테스트 (1주)
**목표**: 100+ 실제 코드로 검증

```
tests/phase-3-semantic-analysis.test.ts
├── Basic Variable Lifecycle (20 tests)
├── Method Call Inference (15 tests)
├── Control Flow Analysis (15 tests)
├── Complex Real-World Code (30 tests)
├── Type Conflict Detection (10 tests)
├── Confidence Scoring (10 tests)
└── Performance & Edge Cases (10 tests)

목표: 모든 테스트 통과 + 평균 정확도 75%+
```

---

## 🔍 핵심 알고리즘 예시

### 예시 1: 기본 변수 추적

```freelang
입력:
fn process
  do
    sum = 0
    for item in arr
      sum = sum + item
    return sum

분석:
1. sum = 0
   ├── 첫 할당 (literal: number)
   ├── 추론 타입: number
   └── 신뢰도: 0.95 (명시적)

2. for item in arr
   ├── arr은 iterable → array
   ├── item은 array의 요소 → unknown
   └── 신뢰도: 0.70

3. sum = sum + item
   ├── sum: number (이전)
   ├── item: unknown
   ├── +: numeric operator → item: number 강제
   ├── 추론: item → number
   └── 신뢰도: 0.80

4. return sum
   ├── sum: number (확정)
   └── return type: number (0.95)

결과:
input: arr (array, 0.70)
output: number (0.95)
평균 신뢰도: 0.85
```

### 예시 2: 메서드 호출 분석

```freelang
입력:
fn filter
  do
    results = []
    for item in items
      if item.active
        results.push(item)
    return results

분석:
1. results = []
   ├── 리터럴 배열
   ├── 타입: array (0.95)

2. for item in items
   ├── items: array (0.80)
   ├── item: array의 요소

3. item.active
   ├── .property 접근 → item: object
   ├── .active가 boolean이면 → bool or unknown

4. results.push(item)
   ├── .push() → results: array (확정)
   ├── item을 push → results: array<item>

5. return results
   ├── results: array

결과:
input: items (array, 0.80)
output: array (0.95)
신뢰도: 0.87
```

### 예시 3: 제어 흐름 분석

```freelang
입력:
fn conditional
  do
    x = 10
    if condition
      x = "hello"
    return x

분석:
1. x = 10 → x: number (0.95)

2. if 분기:
   ├── true 경로: x = "hello" → x: string
   ├── false 경로: x: number (이전)
   └── 병합: x: number | string (union)

3. 신뢰도 계산:
   ├── 단일 할당: 0.95
   ├── 조건부 변경: -0.40
   ├── 합산: 0.55 (낮음)

경고:
⚠️ x의 타입이 불확실함 (number | string)
제안: "x의 타입을 명시하거나 분기를 분리하세요"

신뢰도: 0.55 (fallback 제안 필요)
```

---

## 📊 정확도 목표

### Phase 2 vs Phase 3

| 범주 | Phase 2 (키워드) | Phase 3 (AST) | 개선 |
|------|------------------|--------------|------|
| **단순 패턴** | 50% | 95% | +45% |
| **메서드 호출** | 0% | 85% | +85% |
| **제어 흐름** | 0% | 75% | +75% |
| **복합 코드** | 5% | 70% | +65% |
| **평균** | **15%** | **75%** | +60% |

### 신뢰도 분포

```
Phase 3 목표:
80~100% (높은 신뢰도):  60% of inferences
60~80% (중간):         30% of inferences
<60% (낮음, fallback):  10% of inferences

= 사용자에게 reliable한 추론 제공
```

---

## 📈 구현 일정

| Week | Stage | 목표 | 산출물 |
|------|-------|------|--------|
| **1-2** | Stage 1 | SemanticAnalyzer | 800 LOC + 20 tests |
| **3-4** | Stage 2 | ContextTracker | 600 LOC + 15 tests |
| **5-7** | Stage 3 | TypeInferenceEngine | 1000 LOC + 30 tests |
| **8** | Stage 4 | 검증 | 100+ tests, 75%+ accuracy |

**총 코드**: ~3,400 LOC
**총 테스트**: 100+ 케이스
**정확도 목표**: 75% (정직한 측정)

---

## ⚠️ Task 2.3 폐기 선언

### 공식 상태

```markdown
## Task 2.3: IncompleteTypeInferenceEngine

**상태**: ❌ **폐기** (2026-02-17)

### 이유
1. 키워드 매칭 기반 → 지능 아님
2. 실제 정확도 15% (주장: 50%) → 거짓
3. 복잡도 증가시 빠르게 붕괴
4. 구조적으로 확장 불가능

### 제거 대상
- src/analyzer/incomplete-type-inference.ts
- tests/task-2-3-type-inference.test.ts
- TASK-2-3-COMPLETION-REPORT.md (내용 정정)

### 대체
Phase 3: AST 기반 의미 분석 엔진
- 목표: 70~80% 정확도 (정직한 측정)
- 기간: 8주
- 상태: 🚀 시작 (2026-02-17)
```

---

## 🛠️ Phase 3 Stage 1: 즉시 시작

### 파일 생성 목록
```
src/analyzer/
├── semantic-analyzer.ts          (NEW, 800 LOC) ← Stage 1
├── variable-tracker.ts           (NEW, 300 LOC) ← Stage 1
├── method-analyzer.ts            (NEW, 200 LOC) ← Stage 1
├── context-tracker.ts            (NEW, 600 LOC) ← Stage 2
├── scope-manager.ts              (NEW, 200 LOC) ← Stage 2
├── dependency-graph.ts           (NEW, 150 LOC) ← Stage 2
├── advanced-type-inference.ts    (REWRITE, 1000 LOC) ← Stage 3
└── type-calculator.ts            (NEW, 400 LOC) ← Stage 3

tests/
├── phase-3-semantic-analyzer.test.ts    (NEW, 600 LOC) ← Stage 1
└── phase-3-advanced-inference.test.ts   (NEW, 800 LOC) ← Stage 3+
```

### Stage 1 첫 주 목표
1. **SemanticAnalyzer 기본 구조** (200 LOC)
   - AST 파싱 기본 로직
   - 변수 할당 추적

2. **VariableTracker** (300 LOC)
   - 할당 → 사용 → 범위 종료 추적
   - 기본 타입 추론

3. **초기 테스트** (100 테스트)
   - 간단한 변수 추론
   - 기본 메서드 호출

4. **첫 커밋** ✅
   - "feat: Phase 3 Stage 1 - SemanticAnalyzer foundation"

---

## 📝 정직한 약속

### Phase 2에서 배운 교훈
❌ "50% 정확도" (거짓)
✅ "현재 15%, 목표 75%" (정직)

### Phase 3 약속
1. **매주 실제 측정**: 정확도를 테스트로 증명
2. **신뢰도 공표**: 각 추론마다 confidence score
3. **실패 인정**: 목표 미달시 명확히 선언
4. **사용자 피드백**: 부족한 부분 즉시 반영

---

## 🎯 Success Definition

**Phase 3 완료 기준**:
```
✅ 70~80% 정확도 (실측)
✅ 0.75+ 평균 신뢰도
✅ 100+ 테스트 통과
✅ 복잡한 코드 처리 가능
✅ 정직한 평가 공표
```

**다음 Phase**: Phase 4 (동적 타입 변환, 메타프로그래밍)

---

**작성**: 2026-02-17
**상태**: 🚀 시작
**진정성**: 매우 높음 (거짓 폐기, 정직한 재시작)
