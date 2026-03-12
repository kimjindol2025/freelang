# Code Generator (Phase 7)

FreeLang IR을 x86-64 어셈블리로 변환합니다.

## 사용법

```free
import CodeGenerator from './codegen.free'

// IR 로드
let ir = {
  instructions: [
    { opcode: "PUSH", arg: 42 },
    { opcode: "ADD", arg1: "rax", arg2: "rbx" },
    { opcode: "RET" }
  ]
}

// Code 생성
let asm = CodeGenerator.generate(ir)
println(asm)

// 출력:
// push 42
// add rax, rbx
// ret
```

## Opcode 지원 (Week 1)

### 스택 연산
- `PUSH value` - 값을 스택에 푸시
- `POP register` - 스택에서 레지스터로 팝

### 산술 연산
- `ADD src, dst` - 더하기
- `SUB src, dst` - 빼기
- `MUL src, dst` - 곱하기
- `DIV src, dst` - 나누기

### 메모리 연산
- `LOAD addr` - 메모리에서 값 로드
- `STORE addr` - 메모리에 값 저장

### 제어 흐름
- `CALL function` - 함수 호출
- `RET` - 함수 반환

## 구현 세부사항

### Register Allocator
- 16개 x86-64 범용 레지스터 관리
- Caller-saved / Callee-saved 분류
- 스택 spill 처리

### Stack Frame Manager
- Function prologue: `push rbp; mov rbp, rsp`
- Function epilogue: `mov rsp, rbp; pop rbp; ret`
- Red zone 고려 (RSP-128 안전)

### ABI Compliance
System V AMD64 ABI 준수:
- 첫 6개 정수 인자: rdi, rsi, rdx, rcx, r8, r9
- 반환값: rax
- 64비트 정렬

## 테스트

```bash
npm test -- codegen.test.ts
```

## Week 1 진행 상황

### ✅ 완료 항목 (Day 1-7)

**Day 1: 기본 설계**
- 프로젝트 구조 (SPEC.md, README.md)
- CodeGenerator 구현 (450줄)
- x86-64 Backend (280줄)
- 기본 테스트 (20개)

**Day 2-3: 고급 구현**
- Conditional jumps: JNE, JLE, JGE 추가
- 논리 연산: XOR, AND, OR
- CMP/MOV 명령어
- Peephole 최적화 (push/pop → mov)
- 테스트 확장 (20→30개)

**Day 4-5: x86-64 Backend 확장**
- 시프트 연산 (shl, shr, sar, rol, ror)
- 부호 확장 (movsx, movzx, cdq)
- 교환 (xchg)
- 바이트/워드 연산 (movb, movw)
- LEA, pause, clflush 지원
- Opcode 테이블: 30→40개

**Day 6-7: E2E 통합 테스트**
- integration_tests.free (10개 E2E 테스트)
- 함수 정의/호출
- 조건부 분기
- 루프
- System V ABI 호출 규약
- 메모리 연산
- Factorial 함수 (재귀 예시)

### 📊 코드 통계
- codegen.free: 650줄
- x86_64.free: 450줄
- tests.free: 500줄
- integration_tests.free: 300줄
- **총: ~1,900줄**
- **테스트: 30개 unit + 10개 E2E = 40개**

## 다음 단계 (Week 2 onwards)
- [ ] Phase 8: Assembler (ASM → machine code)
- [ ] Phase 9: Linker (machine code → ELF binary)
- [ ] Performance optimization (jump tables, etc)
- [ ] Exception handling improvement
