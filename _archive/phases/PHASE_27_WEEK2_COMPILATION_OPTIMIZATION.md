# Phase 27 Week 2: Compilation Time Optimization (현실적 목표 수정)

**기간**: 2026-02-26 ~ 2026-03-05
**현황**: 컴파일 시간 12.5s (목표: <100ms)
**필요한 개선**: **125배** ⚠️ 매우 도전적

---

## ⚠️ 현실성 평가

### 현재 상태

```
컴파일 시간: 12.5초
├─ TypeScript 컴파일: ~8-9s
├─ 타입 검사: ~2-3s
└─ 출력 생성: ~1-2s

에러: 20+ TypeScript 호환성 문제
```

### 목표 재검토

| 목표 | 원래 | 수정 | 현실성 |
|------|------|------|--------|
| <100ms | 125배 개선 | 불가능 | ❌ |
| <1s | 12배 개선 | 가능 | ✅ |
| <2s | 6배 개선 | 실현 가능 | ✅ |

---

## 📋 Week 2 수정된 계획

### Phase 1: Build System 개선 (3-5배 개선)

**목표**: 12.5s → 4-5s

#### Task 1: 증분 빌드 (Incremental Build)

```bash
# tsc --incremental 활성화
npx tsc --incremental --build tsconfig.json
# 첫 빌드: 12.5s
# 후속 빌드: 1-2s (90% 개선)
```

**구현**:
- `tsconfig.json` 수정
- `incremental: true` 설정
- `.tsbuildinfo` 파일 추가

#### Task 2: 병렬 컴파일 (Parallel Compilation)

```typescript
// 파일을 그룹으로 분할
Group A: phase-1 to phase-6 (Worker 1)
Group B: phase-7 to phase-12 (Worker 2)
Group C: phase-13 to phase-18 (Worker 3)
Group D: phase-19 to phase-24 (Worker 4)

동시 컴파일 → 3-4배 가속
```

#### Task 3: 선택적 컴파일 (Selective Compilation)

```bash
# 필요한 Phase만 컴파일
npm run build:core    # 핵심 모듈만 (2-3초)
npm run build:full    # 전체 (12.5초)
```

---

### Phase 2: 타입 검사 최적화 (추가 2-3배)

**목표**: 4-5s → 2-3s

#### Task 1: 타입 검사 병렬화

```typescript
// TypeScript 3.4+ skipLibCheck
skipLibCheck: true  // node_modules 생략

// 이미 컴파일된 파일 스킵
noEmitOnError: false  // 에러 있어도 출력
```

#### Task 2: 캐싱 도입

```bash
# 의존성 캐싱
npm i --cache-dir .build-cache

# Webpack/Vite 캐시
cache: {
  type: 'filesystem'
}
```

---

## 🎯 주간 목표 (현실적)

### Week 2 최종 목표

```
현재: 12.5s
├─ Task 1 (증분 빌드): 12.5s → 5s
├─ Task 2 (병렬): 5s → 2.5s
└─ Task 3 (캐싱): 2.5s → 1.5s

최종: <2s ✅ (약 8배 개선)
```

### 달성 가능성

| 개선 | 난이도 | 예상 효과 | 상태 |
|------|--------|----------|------|
| 증분 빌드 | 쉬움 | 4배 | 📋 |
| 병렬 컴파일 | 중간 | 3배 | 📋 |
| 선택적 컴파일 | 중간 | 2배 | 📋 |
| 캐싱 | 어려움 | 2배 | 📋 |
| **누적** | - | **~8배** | - |

---

## 🔧 구현 순서

### Day 1-2: TypeScript 에러 수정

```bash
# 에러 분류
1. 타입 불일치 (12개) → 10분
2. 누락된 export (5개) → 5분
3. 구조 호환성 (3개) → 30분
= ~1시간
```

### Day 3-4: 증분 빌드

```json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo"
  }
}
```

**효과**:
```
첫 빌드: 12.5s
두번째: 1.5s (-88%)
```

### Day 5-6: 병렬 컬 & 캐싱

```bash
npm run build:parallel  # Worker 기반
npm run build:cached    # Webpack cache
```

### Day 7: 최종 검증

```bash
npm run build          # 전체 빌드
npm run build:clean    # 클린 빌드
npm run build:watch    # Watch 모드
```

---

## 📊 예상 결과

### 빌드 시간 비교

```
현재 (기본):
├─ Clean: 12.5s
└─ 2nd run: 12.5s

수정 후 (최적화):
├─ Clean: 2-3s (증분 + 캐시)
├─ 2nd run: 500ms (증분만)
└─ 부분 수정: 200-300ms (변경 파일만)
```

---

## ⚠️ 주의사항

### 1. 컴파일 vs 런타임

```
목표 100ms는 컴파일 시간만
실제 필요:
- 컴파일: <2s ✅
- 번들링: <5s
- 런타임 로딩: <1s
```

### 2. 트레이드오프

- `skipLibCheck: true` → 타입 안정성 ↓
- 병렬 컴파일 → 메모리 사용 ↑
- 캐싱 → 저장소 사용 ↑

---

## 🎓 배운 점

### 비현실적인 목표 문제

**원래 목표**: 컴파일 <100ms (-95%)
**현실**: 기술적으로 불가능
  - TypeScript 기반 프로젝트의 한계
  - 12.5s → 100ms는 완전한 재구현 필요 (Go/Rust)

**수정 목표**: 컴파일 <2s (-84%)
**근거**:
- 증분 빌드: -88%
- 캐싱: -50%
- 병렬화: -70%

---

## ✅ 최종 체크리스트

- [ ] TypeScript 에러 20개 수정
- [ ] 증분 빌드 설정 (tsc --incremental)
- [ ] 병렬 컴파일 스크립트 작성
- [ ] 캐싱 설정 (.tsbuildinfo)
- [ ] 선택적 빌드 명령어 추가
- [ ] 최종 검증: 12.5s → <2s

---

## 🚀 다음 Phase (Week 3)

### 로딩 시간 최적화 (<1s)

```
목표: <1초 로딩 시간

전략:
1. Code Splitting (파일 분할)
2. Lazy Loading (필요 시 로드)
3. Tree Shaking (불필요한 코드 제거)
4. Minification (코드 축소)
```

---

**상태**: 📋 계획 수정 완료
**현실적 목표**: 컴파일 12.5s → <2s (약 8배 개선)
**다음**: TypeScript 에러 수정 + 증분 빌드 구현

