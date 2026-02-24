# Phase 18: VM-First Execution Strategy (최종 전략 문서)

**생성일**: 2026-02-18
**상태**: 결정 완료 → 구현 준비
**목표**: "분석 도구" → "실행 가능한 언어" 진입

---

## 📋 Executive Summary

### 현재 상태
- **Parser/Lexer**: 100% 완벽 (1,073 LOC)
- **Type System**: 70% (3개 추론 엔진)
- **Code Generation**: C/Zig/LLVM 생성 가능
- **VM**: 550 LOC, 43 opcode 완전 구현 ✅
- **실행**: ❌ 0% (IR 생성기 없음)

### 선택: A (VM-First)
```
이유:
1. VM이 이미 100% 구현됨
2. IR 생성만 추가하면 실행 가능
3. 검증 → 최적화 순서 (정석)
4. 예상: 3-4일
```

### 결과 (목표)
```
Day 1: 1 + 2 = 3 (첫 실행)
Day 4: 1000 program test (안정성)
Day 7: REPL + 성능 벤치 (완성)
```

---

## 🎯 전략 근거 (기술적 판단)

### 1️⃣ 현재 병목은 성능이 아니라 **실행 엔진 부재**

```
문제:
  Parser → AST → IR → (정지)

해결:
  IRGenerator 추가 (300 LOC)

결과:
  IR → VM.run() → 결과
```

### 2️⃣ VM은 이미 준비됨

```
현황:
  Op enum: 43개 모두 정의
  VM.exec(): 모든 opcode 구현
  VM.run(): 수행 루프 완성

필요:
  AST → Inst[] 변환 함수 (만들면 됨)
```

### 3️⃣ 검증 순서 (언어 개발 정석)

```
1. 실행 가능
   → 2. 안정성 검증
   → 3. 성능 최적화
   → 4. 네이티브 컴파일

현재: 1단계 전
목표: 1주일 안에 1단계 완료
```

### 4️⃣ 비용 대비 효과 최고

```
C transpile 경로:
  - gcc 설치 (복잡)
  - 컴파일 오류 처리 (시간 소비)
  - 바이너리 생성 (OS별 대응)
  예상: 2주

VM 경로:
  - IRGenerator만 구현 (300 LOC)
  - 즉시 실행 가능
  예상: 3-4일
```

---

## 📊 완전 분석 결과

### ✅ 있는 것 (60%)

| 컴포넌트 | 상태 | LOC | 작동 |
|---------|------|-----|------|
| Parser | ✅ | 1,073 | ✅ |
| Type System | ✅ | 1,200+ | ⚠️ partial |
| Codegen (C) | ✅ | 414 | ✅ (C만) |
| Codegen (Zig) | ✅ | 600 | ✅ (Zig만) |
| Codegen (LLVM) | ✅ | 400 | ✅ (IR만) |
| VM | ✅ | 550 | ❌ (미사용) |
| Runtime | ✅ | 800 | ✅ |
| CLI | ✅ | 302 | ✅ (분석만) |
| Testing | ✅ | 5,000+ | ✅ (4,170/4,225) |

### ❌ 없는 것 (40%)

| 기능 | 필요성 | 우선순위 |
|------|--------|---------|
| IRGenerator | 🔴 Critical | P0 |
| Program Execution | 🔴 Critical | P0 |
| C Auto-Compile | 🟠 High | P1 |
| REPL | 🟠 High | P1 |
| Generics | 🟡 Medium | P2 |
| Stdlib (TypeScript) | 🟠 High | P1 |

---

## 🔧 핵심 구현: IRGenerator

### 파일 위치
```
src/codegen/ir-generator.ts  (NEW - 300-400 LOC)
```

### 책임
```
입력:  AST (Parser에서 생성)
↓
처리: AST node → IR instruction 변환
  - Literal → PUSH
  - BinaryOp → PUSH, PUSH, ADD/SUB/etc
  - Assignment → PUSH, STORE
  - IfStatement → LOAD, JMP_NOT, ...
  - 등등 43개 opcode 매핑
↓
출력: Inst[] (VM이 실행)
```

### 주요 메소드

```typescript
class IRGenerator {
  // AST → IR[] 변환
  generateIR(ast: ASTNode): Inst[]

  // AST 노드별 처리
  private traverse(node: ASTNode, out: Inst[]): void

  // 프로그램 → AIIntent 변환
  buildIntent(fn: string, params: string[], ast: ASTNode): AIIntent
}
```

### 복잡도 분석

| 단계 | 난이도 | 시간 | 구현 전략 |
|------|--------|------|---------|
| Literal + Arithmetic | 🟢 | 30분 | switch문 + 맵 |
| 변수 (LOAD/STORE) | 🟢 | 30분 | Map<string, value> |
| Control (if/while) | 🟡 | 1h | JMP 주소 패칭 |
| 함수 (CALL/RET) | 🟡 | 1h | 콜스택 + frame |
| 배열 | 🟡 | 1h | ARR_NEW → ARR_PUSH |
| 문자열 | 🟢 | 30분 | STR_NEW 활용 |

**총 예상**: 3-4일 (집중 모드)

---

## 📅 7일 로드맵 (정확한 일정)

### Day 1-2: IRGenerator MVP (Literal + Arithmetic)

**목표**: 첫 실행 성공

```
구현:
  - IRGenerator 클래스
  - traverse() 기본 구조
  - Literal (NUMBER, STRING, BOOL)
  - BinaryOp (ADD, SUB, MUL, DIV)
  - UnaryOp (NEG, NOT)

테스트:
  - "1 + 2" → [PUSH 1, PUSH 2, ADD, HALT]
  - VM 실행 → 3

커밋:
  - "feat: Phase 18-1 - IRGenerator MVP"
```

### Day 3: 변수 + 제어흐름

**목표**: 조건문과 변수 작동

```
구현:
  - LOAD / STORE
  - IfStatement (JMP_NOT)
  - WhileStatement (JMP)

테스트:
  - "x = 5; if (x > 3) { x = x + 10 }" → 15
  - "y = 0; while (y < 3) { y = y + 1 }" → 3

커밋:
  - "feat: Phase 18-2 - Variables & Control Flow"
```

### Day 4: 함수 + 배열

**목표**: 배열과 함수 호출

```
구현:
  - CALL / RET
  - 콜스택 관리
  - ARR_NEW, ARR_PUSH, ARR_GET
  - ARR_SUM (배열 합계)

테스트:
  - "fn sum(arr) { ... return arr[0] + arr[1] }"
  - arr = [1, 2, 3]; sum(arr) → 6

커밋:
  - "feat: Phase 18-3 - Functions & Arrays"
```

### Day 5: 문자열 + 고급 기능

**목표**: 완전한 IR 생성

```
구현:
  - STR_NEW, STR_CONCAT, STR_LEN
  - Iterator (ITER_INIT, ITER_NEXT)
  - Sub-programs (ARR_MAP, ARR_FILTER)

테스트:
  - "s = "hello"; len(s)" → 5
  - "arr.map(x => x * 2)"

커밋:
  - "feat: Phase 18-4 - Strings & Iterators"
```

### Day 6: 통합 + CLI 수정

**목표**: 실제 파일 실행 가능

```
구현:
  - Codegen에 IR 생성 추가
  - CLI를 IR 실행으로 수정
  - exit code 반환 (성공/실패)

변경:
  - src/codegen/c-generator.ts: IRGenerator 통합
  - src/cli/index.ts: IR → VM 실행으로 변경
  - src/cli/batch.ts: 배치 파일 실행

테스트:
  - "freelang --batch program.free"
  - 파일 실행 → 결과 출력
  - exit code 검증

커밋:
  - "feat: Phase 18-5 - CLI Integration"
```

### Day 7: 안정성 + 성능

**목표**: 1000 프로그램 검증

```
구현:
  - 에러 처리 강화
  - 스택 오버플로우 방지
  - 무한 루프 타임아웃
  - 성능 벤치마크

테스트:
  - 1000 random programs 실행
  - 성능: <1ms per program
  - 메모리: <10MB max
  - 버그 수정

커밋:
  - "test: Phase 18-6 - Stability Testing"
  - "perf: Phase 18-7 - Optimization"
```

---

## 🧪 검증 체크리스트

### MVP (Day 1-2)

- [ ] IRGenerator 클래스 생성
- [ ] traverse() 메소드 구현
- [ ] Literal 처리 (PUSH)
- [ ] BinaryOp 처리 (+, -, *, /)
- [ ] 첫 VM 실행 성공
- [ ] 단위 테스트 10개 작성
- [ ] Gogs 커밋

### Phase 1 (Day 3-4)

- [ ] 변수 (LOAD/STORE) 작동
- [ ] if/while 문 작동
- [ ] 함수 호출 작동
- [ ] 배열 기본 작동
- [ ] 통합 테스트 50개
- [ ] 성능 벤치: <2ms per program

### Phase 2 (Day 5-7)

- [ ] 문자열 지원
- [ ] Iterator 지원
- [ ] CLI 완전 통합
- [ ] 1000 program test 통과
- [ ] 성능: <1ms per program
- [ ] Gogs 최종 커밋

---

## 🎬 최종 결과 (Day 7 예상)

### 실행 가능한 언어 진입

```bash
$ cat > hello.free << 'CODE'
x = 10
y = 20
z = x + y
print(z)
CODE

$ node dist/cli/index.js --batch hello.free
30

$ echo $?
0  # ← 성공 코드!
```

### 프로젝트 등급 변화

```
Before (현재):
  분석 도구 (0~49%)

After (Day 7):
  실행 가능한 언어 (80%+)
  ← "언어"로 인정받음
```

---

## 📊 리스크 분석

### 낮은 리스크 (진행 순조)

- ✅ VM 완전 구현됨
- ✅ Parser 검증됨
- ✅ AST 구조 명확
- ✅ 테스트 프레임워크 있음

### 중간 리스크 (주의)

- ⚠️ JMP 주소 패칭 (복잡도 높음)
- ⚠️ 콜스택 관리 (이해 필요)
- ⚠️ 에러 복구 (우아하게 처리)

### 완화 전략

```
1. JMP 문제: 먼저 간단한 if만 (JMP_NOT)
2. 콜스택: Day 4 마지막에 구현
3. 에러: Phase 2에서 강화 (처음엔 panic으로)
```

---

## 🔗 관련 문서

- **분석 보고서**: `/tmp/analysis.md` (원본)
- **Mapper 설계**: `/tmp/ir_to_vm_mapper.md` (원본)

---

## ✅ 최종 확인

### 동의 사항

- ✅ A (VM-First) 전략 선택
- ✅ 3-4일 예상 일정
- ✅ IRGenerator 구현 방식
- ✅ 7일 로드맵

### 시작 신호 대기

**"시작해"** 신호 주면:

1. `src/codegen/ir-generator.ts` 파일 생성
2. Day 1 코드 작성
3. 테스트 실행
4. 일일 진행 상황 추적

---

**Status**: 준비 완료 → 구현 대기

**목표**: 2026-02-25 (7일) 완료

**다음**: "시작해" 신호 주기
