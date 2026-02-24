# Phase 1: AI-First 문법 자유도 (2026-02-16 ~ 2026-02-28)

## 🎯 목표
AI가 쉽게 코드를 작성할 수 있는 최대 자유도의 문법

## ✨ 구현 기능

### 1. 세미콜론 선택적
```freelang
// 기존 (필수)
fn sum
input: array<number>
output: number;

// Phase 1 (선택적)
fn sum
input: array<number>
output: number
```

### 2. 중괄호 선택적 (들여쓰기 기반)
```freelang
// 기존 (선택적)
fn sum(a, b) { a + b }

// Phase 1 (들여쓰기)
fn sum(a, b)
  a + b

// 멀티라인
fn calculate(x, y)
  temp = x * 2
  result = temp + y
  result
```

### 3. 타입 추론 강화
```freelang
// 명시적 타입 없이도 가능
fn double(x)
  x * 2

fn merge(arr1, arr2)
  arr1 + arr2
```

## 📋 Task 분해

### Task 1.1: 세미콜론 제거 파서 (3일)
- Lexer: 세미콜론을 statement separator에서 제외
- Parser: 세미콜론 생략 처리
- Test: 15개 테스트

### Task 1.2: 들여쓰기 기반 블록 (4일)
- IndentationAnalyzer 구현
- BlockParser: 들여쓰기로 블록 인식
- BodyAnalyzer 강화
- Test: 20개 테스트

### Task 1.3: 타입 추론 강화 (3일)
- TypeInferenceEngine 개선
- 리턴값 타입 자동 추론
- 함수 매개변수 타입 추론
- Test: 15개 테스트

### Task 1.4: 통합 테스트 (2일)
- E2E 파이프라인 테스트
- 실제 .free 코드 실행
- 성능 검증

## 📊 성과 기준

| 지표 | 목표 |
|------|------|
| 테스트 통과율 | 95% 이상 |
| 파싱 성능 | < 2ms |
| 코드 복잡도 | 기존 대비 +20% 이내 |

## 🚀 구현 순서

1. Task 1.1 (세미콜론) 
2. Task 1.2 (들여쓰기)
3. Task 1.3 (타입 추론)
4. Task 1.4 (통합 테스트)

---

**시작일**: 2026-02-16
**목표 완료일**: 2026-02-28
**개발 기간**: 12일
