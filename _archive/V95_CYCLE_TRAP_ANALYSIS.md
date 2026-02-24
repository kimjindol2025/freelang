# v9.5: 순환 참조의 덫 (The Cycle Trap) - 문제 정의 및 증명

**Date**: 2026-02-25
**Status**: ✅ PROBLEM DEFINITION COMPLETE
**Next**: v9.6 Weak Reference (해결책)

---

## 📌 v9.4의 한계 발견

### 시점
- v9.1-v9.4: ARC (Automatic Reference Counting) 시스템 완성
- 메모리 누수: 0 (정상 경로에서)
- **발견**: 비정상 경로 = 순환 참조

### 문제 정의

```
상황: 객체 A가 B를 소유하고, B가 A를 소유 (A ◄──► B)
현상: 두 객체의 RC가 절대 0이 되지 않음
결과: 아무도 사용할 수 없지만 메모리는 영구 격리 (좀비 객체)
```

---

## 🧪 증명: 순환 참조의 덫

### TEST 1: 순환 구조 시뮬레이션

```javascript
const nodeA = new Node('A');  // A(RC:1)
const nodeB = new Node('B');  // B(RC:1)

nodeA.link = nodeB;           // B(RC: 1→2)
nodeB.link = nodeA;           // A(RC: 1→2)

// 함수 종료 시 (Epilogue)
nodeA.release();              // A(RC: 2→1)  ← ❌ 여전히 1!
nodeB.release();              // B(RC: 2→1)  ← ❌ 여전히 1!

// 결과: 두 객체 모두 RC=1로 메모리에 남음
```

### 증명 결과

| 단계 | A의 RC | B의 RC | 상태 |
|------|--------|--------|------|
| 초기 생성 | 1 | 1 | ✅ |
| A.link=B | 1 | 2 | ✅ |
| B.link=A | 2 | 2 | ✅ |
| Epilogue A해제 | 1 | 2 | ❌ |
| Epilogue B해제 | 1 | 1 | **❌ ZOMBIE** |

### 시각화

```
【외부 스코프】
  nodeA → (변수 소멸)
  nodeB → (변수 소멸)

【내부 순환】
  A ←────────┐
  │ link     │ link
  └────────► B

【분석】
1. 외부 변수 사라짐 (RC: 2→1)
2. 내부만 A→B→A 참조 유지
3. RC > 0 유지 (영원히)
4. 메모리 회수 불가능
```

---

## ⚠️ 역설: "기록이 증명이다"

### v9 시리즈의 핵심 원칙

> "기록이 증명이다"
>
> 모든 메모리 변화는 기록(RC)으로 남고,
> 기록은 메모리 상태를 정확히 대변한다.

### 순환 참조에서의 역설

```
【정상 상황】
"A의 RC=1" → "누군가 A를 소유 중" → 메모리 유지 ✅
"A의 RC=0" → "누구도 A를 소유 안 함" → 메모리 해제 ✅

【순환 상황】
"A의 RC=1" → "누군가 A를 소유 중" (B가 소유)
"B의 RC=1" → "누군가 B를 소유 중" (A가 소유)
           → 하지만 B의 유일한 소유자는 A
           → A의 유일한 소유자는 B
           → 둘 다 "무소유 상태"
           ❌ 기록(RC)이 현실과 모순!
```

### 역설의 의미

```
✅ v9.4까지: 기록이 현실과 일치
❌ v9.5부터: 기록과 현실의 괴리
            "RC > 0이지만 사용 불가능"
            "메모리가 있지만 회수 불가능"

이것이 ARC 시스템의 '블랙홀'이다.
```

---

## 🔍 Cycle Detection 기초 설계 (v9.5)

### 1단계: Back-Edge 감지

```
Assignment 시 다음을 체크:
  a.link = b

  체크: "b가 이미 a를 소유 중인가?"
  YES → [CYCLE WARNING] 로깅
  NO  → 정상 처리

로그 예시:
  [ASSIGNMENT CYCLE] A → B
    └─ Back-Edge detected
    └─ B already owns A
    └─ Potential cycle: A ◄──► B
```

### 2단계: Reference Graph 구축

```
엔진 내부에서 객체 간 참조 관계를 그래프로 유지:

Graph = {
  A: [B],        // A → B로 참조
  B: [A]         // B → A로 참조 (Back-edge!)
}

DFS/BFS로 주기적 루프 탐색:
  From A → B → A (루프 발견!)
  From B → A → B (루프 발견!)
```

### 3단계: Zombie 표시

```
루프가 발견되면:

[CYCLE STRUCTURE DETECTED]
  └─ Cycle: [A → B → A]
  └─ Trapped objects: A, B
  └─ Trapped memory: 48 bytes
  └─ Status: UNREACHABLE

[LEAK WARNING]
  └─ Object A: RC=1 (unreachable)
  └─ Object B: RC=1 (unreachable)
  └─ These objects form a cycle
  └─ Manual intervention or v9.6 Weak Reference required
```

### v9.5 로그 포맷 정의

```
【Assignment 단계】
[ASSIGNMENT CYCLE] Node A → Node B
  └─ Existing reference: B → ... → A detected
  └─ Cycle potential: A ◄──► B (depth=2)

【Cycle 감지 단계】
[CYCLE STRUCTURE DETECTED]
  └─ Type: Simple (A ◄──► B)
  └─ Length: 2 nodes
  └─ Involved objects: A(addr:0x60xx), B(addr:0x61xx)
  └─ Total trapped memory: 48 bytes

【Program End 단계】
[LEAK REPORT - CYCLE DETECTED]
  ├─ Total cycles found: 1
  ├─ Trapped objects: 2
  ├─ Trapped memory: 48 bytes
  ├─ Status: PERMANENT (requires v9.6 Weak Reference)
  └─ Recommendation: Use weak_ref for circular relationships
```

---

## 📊 v9.5 Verification Checklist

| 항목 | 상태 | 증거 |
|------|------|------|
| Cycle 현상 증명 | ✅ | RC: 2→1→1 (무한 정지) |
| Zombie 객체 확인 | ✅ | "사용 불가능하지만 RC>0" |
| Back-Edge 개념 | ✅ | A←B 역방향 참조 감지 |
| Reference Graph | ✅ | DFS로 루프 탐색 가능 |
| 로그 포맷 정의 | ✅ | [CYCLE WARNING], [ZOMBIE] 등 |

---

## 🔮 해결책 예고: v9.6 Weak Reference

### 약한 참조 (Weak Reference)

```freelang
class Node {
    strong: Node     // 강한 참조 (RC 증가)
    weak: weak Node  // 약한 참조 (RC 증가 안 함)
}

// 순환 구조 해결
let a = new Node();
let b = new Node();

a.strong = b;        // b.RC: 1→2 (정상)
b.weak = a;          // a.RC: 유지 (약한 참조)

// 이제 RC=0 가능:
// a.strong = null;  // b.RC: 2→1
// b = null;         // a.RC: 1→0 (파괴 가능!)
```

### 핵심 개념

```
약한 참조의 약속:
  ❌ "나는 너를 소유하지 않는다"
  ❌ "나는 너의 RC를 증가시키지 않는다"
  ✅ "나는 너의 존재 여부만 확인한다"
  ✅ "너를 사용할 때는 존재 확인 후 사용한다"
```

---

## 📝 기록: v9.5 완성 기준

### 정의 완료
- [x] 순환 참조 현상 증명
- [x] 좀비 객체 확인
- [x] 역설 명시 ("기록이 증명이다"의 한계)
- [x] Reference Graph 분석
- [x] v9.5 탐지 기초 설계

### 구현 (v9.5 본체)
- [ ] Back-Edge 감지 로직
- [ ] Cycle Detection 엔진
- [ ] 경고 로깅 시스템
- [ ] Program End Report

### 검증 (v9.5 테스트)
- [ ] Cycle 생성 및 감지
- [ ] 로그 포맷 확인
- [ ] Zombie 표시 정확성
- [ ] 성능 (추가 오버헤드)

---

## 💡 철학적 의미

### v9 시리즈의 여정

```
v9.1: 참조의 시작 (RC 필드)
v9.2: 소유의 이전 (Assignment)
v9.3: 스코프의 정리 (Epilogue)
v9.4: 깊은 정리 (Deep Release)
v9.5: 한계의 인식 (Cycle Detection)
v9.6: 약한 손아귀 (Weak Reference)
```

### "기록이 증명이다"의 진정한 의미

```
v9.4까지: 기록이 현실을 증명 ✅
v9.5: 기록의 한계를 증명 ⚠️
v9.6: 한계를 받아들이는 설계 🔄

완벽한 시스템이 아닌,
자신의 한계를 아는 시스템이
가장 견고하다.
```

---

## 📌 Sign-Off

**v9.5 Status**: 문제 정의 및 증명 완료 ✅

**다음 단계**: v9.6 Weak Reference 구현

**기록 위치**:
- Gogs: /home/kimjin/Desktop/kim/v2-freelang-ai/V95_CYCLE_TRAP_ANALYSIS.md
- Test: /tmp/test-v95-cycle-trap-proof.js

**이념**: "기록이 증명이다" (역설 포함)

---

Generated: 2026-02-25
Version: v9.5 (Definition Phase)
Confidence: 100% Problem Understanding ✅
