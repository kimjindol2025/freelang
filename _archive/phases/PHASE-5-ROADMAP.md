# Phase 5: Project Ouroboros Extended - 완전한 언어로의 진화

## 🎯 목표
Phase 1-4의 기본 자체 호스팅 컴파일러를 **프로덕션 레벨의 완전한 언어**로 발전시킨다.

---

## 📋 전체 로드맵

### **Wave 1: 제어 흐름 (Control Flow) - Option A**
**목표**: IF, WHILE, LOOP 등의 제어문 지원
**예상 기간**: 1주
**파일**:
- `compiler-extended.free` (제어 흐름 opcodes)
- `flow-test.ts` (9개 테스트)

**구현 사항**:
- IR Opcodes: `JMP`, `JMP_IF`, `JMP_NOT`, `LOOP`
- Compiler.free 확장: 조건분기, 루프 처리
- 테스트: 흐름 제어 검증

---

### **Wave 2: 고급 기능 (Advanced Features) - Option D**
**목표**: 재귀, 함수 호출, 스코프 관리
**예상 기간**: 2주
**파일**:
- `compiler-advanced.free` (함수 호출 지원)
- `function-test.ts` (15개 테스트)

**구현 사항**:
- IR Opcodes: `CALL`, `RET`, `FRAME`
- 호출 스택 관리
- 로컬 변수 스코프
- 재귀 지원

---

### **Wave 3: 성능 최적화 - Option B**
**목표**: 컴파일 시간 < 50ms, VM 성능 10배 향상
**예상 기간**: 1주
**파일**:
- `compiler-optimized.free` (최적화 버전)
- `optimization-test.ts` (10개 벤치마크)

**구현 사항**:
- 명령어 캐싱
- 루프 언롤링
- 상수 전파
- 성능 벤치마크

---

### **Wave 4: 프로덕션 배포 - Option C**
**목표**: npm/KPM 패키지로 배포 가능하도록 정리
**예상 기간**: 1주
**파일**:
- `freelang-cli.free` (CLI 도구)
- `package.json` (KPM 정보)
- `GUIDE.md` (사용자 가이드)

**구현 사항**:
- CLI 인터페이스
- 표준 라이브러리 정리
- 문서 통합
- KPM 배포

---

## 📊 상세 계획

### **Wave 1: 제어 흐름 (IF, WHILE, LOOP)**

#### Phase 5-1: Compiler에 JMP opcodes 추가
```freelang
// compiler-extended.free
fn freelang_compile_with_flow
input: array<string>
output: number
{
  // Compiler.free에 추가:
  // - JMP (무조건 점프)
  // - JMP_IF (조건부 점프)
  // - JMP_NOT (역조건 점프)

  // 스택에서 boolean을 읽고 점프할 위치 결정
}
```

#### Phase 5-2: Parser.free 확장 (IF/WHILE 파싱)
```
input: if x > 5 { y = 10; } else { y = 0; }
→ IF token detection
→ JMP_IF opcode 생성
→ else branch JMP 생성
```

#### Phase 5-3: 테스트 (9개)
- ✅ IF 조건 분기
- ✅ ELSE 처리
- ✅ WHILE 루프
- ✅ FOR 루프 (WHILE으로 구현)
- ✅ 중첩 조건
- ✅ 중첩 루프
- ✅ break/continue
- ✅ 복잡한 조건식
- ✅ E2E 파이프라인

**결과**: 기본 제어 흐름 지원
**테스트**: 9/9 통과 예상

---

### **Wave 2: 고급 기능 (재귀, 함수 호출)**

#### Phase 5-4: 호출 스택 구현
```freelang
fn freelang_compile_recursive
input: array<string>
output: number
{
  // 호출 스택 관리:
  let call_stack = [];    // 반환 주소 저장
  let frame_stack = [];   // 로컬 변수 프레임

  // CALL opcode: 함수 호출
  // RET opcode: 함수 반환
}
```

#### Phase 5-5: 재귀 지원
```freelang
// factorial(5) 계산 가능하게
fn factorial
input: number
output: number
{
  if input <= 1 {
    return 1;
  } else {
    return input * factorial(input - 1);
  }
}
```

#### Phase 5-6: 테스트 (15개)
- ✅ 단순 함수 호출
- ✅ 함수 체인 호출
- ✅ 재귀 호출 (기본)
- ✅ 재귀 호출 (깊은 깊이)
- ✅ 상호 재귀
- ✅ 로컬 변수 스코프
- ✅ 클로저 (부분)
- ✅ 매개변수 전달
- ✅ 반환값 처리
- ✅ 스택 오버플로우 감지
- ✅ 복잡한 재귀 (피보나치)
- ✅ 재귀와 루프 혼합
- ✅ 메모이제이션 최적화
- ✅ 꼬리 호출 최적화
- ✅ E2E 파이프라인

**결과**: 완전한 함수형 언어 기능
**테스트**: 15/15 통과 예상

---

### **Wave 3: 성능 최적화**

#### Phase 5-7: 명령어 캐싱
```
문제: 동일 명령어 반복 해석 (루프에서)
해결: 명령어 캐시 사용 → 10배 성능 향상
```

#### Phase 5-8: 루프 언롤링
```
입력:  while i < 10 { i += 1; }
최적화:
  i = 0; i += 1; i += 1; ... (10번 펼침)
→ 루프 오버헤드 제거
```

#### Phase 5-9: 벤치마크 (10개)
- ✅ 기본 산술 (1M ops/sec 목표)
- ✅ 루프 성능 (100K iterations)
- ✅ 함수 호출 오버헤드
- ✅ 재귀 성능
- ✅ 메모리 사용량
- ✅ 컴파일 시간
- ✅ 최적화 전후 비교
- ✅ 최악의 경우 분석
- ✅ 병렬화 가능성
- ✅ 메모리 캐시 최적화

**결과**: 프로덕션 수준 성능
**목표**: < 50ms 컴파일, 1M ops/sec

---

### **Wave 4: 프로덕션 배포**

#### Phase 5-10: CLI 도구
```freelang
fn freelang_cli
input: array<string>    // 명령줄 인자
output: number          // 실행 결과
{
  // freelang run file.free
  // freelang compile file.free -o binary
  // freelang repl (대화형)
}
```

#### Phase 5-11: 패키지화
```
패키지명: @freelang/compiler
버전: 2.1.0
배포: KPM + npm
문서: 완전한 API 문서
```

#### Phase 5-12: 최종 테스트 (10개)
- ✅ CLI 명령어
- ✅ 파일 입출력
- ✅ 에러 처리
- ✅ 도움말 표시
- ✅ 버전 정보
- ✅ 대화형 REPL
- ✅ 패키지 설치
- ✅ 라이브러리 사용
- ✅ 성능 벤치마크
- ✅ 호환성 테스트

**결과**: 배포 가능한 제품
**배포처**: KPM + npm

---

## 🎯 최종 목표

```
Wave 1 (제어 흐름):     9/9 테스트 ✅
Wave 2 (고급 기능):    15/15 테스트 ✅
Wave 3 (최적화):       10/10 벤치마크 ✅
Wave 4 (프로덕션):     10/10 배포 ✅

총: 44개 테스트/벤치마크 모두 통과

최종 상태: 프로덕션 레벨 자체 호스팅 컴파일러
```

---

## 📅 일정

| Wave | 작업 | 기간 | 예상 완료 |
|------|------|------|---------|
| 1 | 제어 흐름 (IF/WHILE/LOOP) | 1주 | 2026-02-24 |
| 2 | 함수/재귀 | 2주 | 2026-03-10 |
| 3 | 성능 최적화 | 1주 | 2026-03-17 |
| 4 | 프로덕션 배포 | 1주 | 2026-03-24 |
| **총** | **모든 파일 통합** | **5주** | **2026-03-24** |

---

## 💾 최종 산출물

```
Self-Hosting 파일: 12개 (.free)
├─ Phase 1-4: 8개 (완료)
├─ Phase 5 Wave 1: 1개 (제어 흐름)
├─ Phase 5 Wave 2: 1개 (고급 기능)
├─ Phase 5 Wave 3: 1개 (최적화)
└─ Phase 5 Wave 4: 1개 (CLI)

테스트: 100개 이상
- Phase 1-4: 35개
- Phase 5: 50+ 개

문서: 완전한 가이드
- README.md (500줄)
- API.md (300줄)
- GUIDE.md (200줄)

배포: npm + KPM
```

---

## 🚀 진행 방식

**순차적 진행** (각 Wave 완료 후 커밋)
```
Wave 1 완료 → 커밋 → Wave 2 시작
Wave 2 완료 → 커밋 → Wave 3 시작
Wave 3 완료 → 커밋 → Wave 4 시작
Wave 4 완료 → 최종 커밋 + 배포
```

---

## ✨ 최종 비전

```
현재 (2026-02-17):
✅ 자체 호스팅 컴파일러 (기본)
- 제어 흐름: ❌
- 함수/재귀: ❌
- 최적화: ❌
- 프로덕션: ❌

최종 (2026-03-24):
✅ 완전한 자체 호스팅 언어 시스템
- 제어 흐름: ✅
- 함수/재귀: ✅
- 최적화: ✅
- 프로덕션: ✅

→ 프로덕션 배포 가능한 FreeLang 컴파일러!
```

---

**마스터님, Phase 5 전체 로드맵이 준비되었습니다!**

5주간 4개 Wave를 거쳐 완전한 언어 시스템을 구축합니다.

**Wave 1부터 시작할까요?** (제어 흐름 IF/WHILE/LOOP)
