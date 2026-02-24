# 🔄 Cycle Handling Policy v1.0

**Version**: v1.0 (Policy Freeze)
**Date**: 2026-02-25
**Target**: v2-freelang-ai (Production Language)
**Philosophy**: "Cycles are programmer responsibility" (Swift-inspired)

---

## 1️⃣ v2 순환 참조 철학

### 핵심 원칙

```
v2에서 순환 참조(cycle)는:
- ❌ 자동 감지 안 함 (v11+ Cycle Collector는 선택사항)
- ❌ 자동 정리 안 함 (프로그래머가 직접 차단)
- ✅ 프로그래머가 명시적으로 WEAK_REF로 끊음
- ✅ 설계 단계에서 고려해야 함

이유:
- RC 언어의 근본적 한계
- Cycle은 설계 문제, 코드 문제 아님
- Weak ref는 비용 최소 (0 오버헤드)
```

### 비유

```
RC는 "신뢰"를 기반으로 함:
"너는 누군가가 널 참조하는 한 살아있다"

Cycle은 "신뢰의 위반":
"A는 B를 참조, B는 A를 참조 → 누구도 버릴 수 없음"

해결:
"B의 A 참조를 Weak으로" → 신뢰를 한쪽만 유지
```

---

## 2️⃣ Cycle 감지 및 분류

### 2-1. 감지 방법 (at Design Time)

```freelang
// Pattern 1: 양방향 참조 (명백)
class A { REF b: B }
class B { REF a: A }  // ← 위험! 순환 가능

// Pattern 2: 체이닝 (숨겨진 순환)
class A { REF b: B }
class B { REF c: C }
class C { REF a: A }  // ← 숨겨진 순환고리

// Pattern 3: 자기 참조 (명백)
class Node {
  REF next: Node  // ← A가 A 참조 (같은 클래스)
}

// Pattern 4: 부모-자식 참조 (일반적)
class Parent { REF children: Child[] }
class Child { REF parent: Parent }  // ← 자명한 순환
```

### 2-2. 심각도 분류

| 패턴 | 심각도 | 대처 | 예시 |
|------|------|------|------|
| 양방향 (2개) | 🔴 HIGH | Weak 필수 | A↔B |
| 체이닝 (3+) | 🔴 HIGH | Weak 필수 | A→B→C→A |
| 부모-자식 | 🟠 MEDIUM | Weak 권장 | Parent↔Child |
| 자기 참조 | 🟠 MEDIUM | Weak 고려 | Node→Node |

---

## 3️⃣ 실제 정책

### 3-1. Design Phase (구조 결정)

**체크리스트**:

```
1. 각 클래스별로 참조 관계 나열
   class MyClass {
     REF ref1: Type1  // 객체 A를 항상 참조?
     REF ref2: Type2  // 선택사항 참조?
   }

2. 참조 방향성 다이어그램 작성
   MyClass → OtherClass
   OtherClass → MyClass?  ← "예"면 Cycle!

3. 순환고리 찾기
   - 양방향 즉시 감지
   - 체인 3개 이상 추적
   - 자기 참조 체크

4. 각 cycle마다 1개 이상 링크를 WEAK으로 변경
```

**예시 (좋음)**:

```freelang
// ✅ Cycle 차단됨
class Parent {
  PROPERTY name: string
  REF[] children: Child    // Strong: 부모→자식
}

class Child {
  PROPERTY name: string
  WEAK_REF parent: Parent  // Weak: 자식→부모 ← 순환 끊음!
}
```

### 3-2. Implementation Phase (코딩)

**규칙**:

```
1. Weak ref 역참조 전 항상 NULL check
   IF child.parent != NULL
     USE child.parent.name
   END

2. 순환고리가 정말 끊어지는지 검증
   parent = NEW Parent()
   child = NEW Child()
   parent.children = [child]
   child.parent = parent

   release(parent)  // child.parent == NULL?
                    // (Weak이므로 자동)

3. Weak ref를 private로 (실수 방지)
   class Child {
     ...
     PRIVATE WEAK_REF parent: Parent

     FN get_parent() {
       IF parent == NULL
         RETURN ERROR "parent destroyed"
       END
       RETURN parent
     }
   }
```

### 3-3. Testing Phase (검증)

**테스트 케이스**:

```
TC-CYCLE-1: 양방향 정리
  DO: release(obj_a) after both directions set
  EXPECT: obj_b.weak_ref == NULL (auto)

TC-CYCLE-2: 체인 정리
  DO: release(obj_a) in A→B→C→A cycle
  EXPECT: All refs == NULL OR RC=0

TC-CYCLE-3: NULL check 실패
  DO: obj.weak_ref.dereference() without check
  EXPECT: Runtime error OR PANIC

TC-CYCLE-4: Cycle detection
  DO: Create intentional cycle (all Strong)
  EXPECT: Leak detector reports cycle
```

---

## 4️⃣ Cycle Detection & Reporting

### 4-1. Leak Detector (Built-in)

```
v2는 기본으로 leak detector를 포함합니다.

FREELANG_LEAK_REPORT()
  → 종료 시 모든 미해제 블록 리포트
  → Cycle 감지 (고립된 객체 그룹)
```

**예시 출력**:

```
Leak Report (v2-freelang-ai):
  ┌─ Isolated Objects (Cycle detected)
  │
  ├─ Cycle #1: A ↔ B (2 objects, 256 bytes)
  │  - Object A @ 0x1000 (128 bytes)
  │  - Object B @ 0x1080 (128 bytes)
  │  Reference: A.ref_b → B, B.ref_a → A
  │
  ├─ Cycle #2: Node → Node → Node (3 objects, 384 bytes)
  │  - Node #1 @ 0x2000 (128 bytes)
  │  - Node #2 @ 0x2080 (128 bytes)
  │  - Node #3 @ 0x2100 (128 bytes)
  │  Reference: #1.next→#2, #2.next→#3, #3.next→#1
  │
  └─ Total leaks: 3 cycles, 640 bytes
```

### 4-2. Cycle 식별 알고리즘

```
INPUT: ObjectGraph (모든 객체 + 참조)
OUTPUT: Isolated cycles (isolated object groups)

Algorithm (Tarjan's Strongly Connected Components):
  1. DFS traversal
  2. Find back edges (A→B이고 B→A)
  3. Group isolated objects
  4. Report cycles

Time: O(V + E) where V=objects, E=references
```

### 4-3. 개발 중 Cycle 감지

```freelang
// 개발 중 명시적 검사
SET cycle_count = FREELANG_DETECT_CYCLES()
IF cycle_count > 0
  PRINT "WARNING: " + cycle_count + " cycles detected!"
  FREELANG_LEAK_REPORT()
END
```

---

## 5️⃣ Weak Reference 사용 패턴

### Pattern 1: Linked List (양방향)

```freelang
class Node {
  PROPERTY value: int
  REF next: Node
  WEAK_REF prev: Node  // ← 순환 끊음
}

// 사용
head = NEW Node(1)
node2 = NEW Node(2)
head.next = node2
node2.prev = head

// 정리
release(head)  // node2.prev = NULL (auto)
// node2 이제 RC=0 → 정리됨
```

### Pattern 2: Tree (부모-자식)

```freelang
class TreeNode {
  PROPERTY value: int
  REF[] children: TreeNode
  WEAK_REF parent: TreeNode  // ← 순환 끊음
}

// 사용
root = NEW TreeNode(1)
left = NEW TreeNode(2)
right = NEW TreeNode(3)
root.children = [left, right]
left.parent = root
right.parent = root

// 정리
release(root)  // left.parent, right.parent = NULL (auto)
// 전체 정리됨
```

### Pattern 3: Graph (DAG로 변환)

```freelang
// ❌ General graph (순환 가능)
class Vertex {
  REF[] edges: Vertex  // ← 모든 edge Strong
}

// ✅ DAG (Directed Acyclic Graph)
class Vertex {
  REF[] forward: Vertex    // ← 위상순 (Strong)
  WEAK_REF[] backward: Vertex  // ← 역방향 (Weak)
}
```

### Pattern 4: Cache with Backref

```freelang
class CacheEntry {
  PROPERTY key: string
  PROPERTY value: Object
  WEAK_REF cache: Cache  // ← 백참조 (Weak)
}

class Cache {
  PROPERTY items: HashMap<string, CacheEntry>
}

// 사용
cache = NEW Cache()
entry = NEW CacheEntry("key", expensive_obj)
cache.items["key"] = entry
entry.cache = cache  // Weak ← cache가 살아있을 동안만 유효

// 정리
release(cache)  // entry.cache = NULL (auto)
```

---

## 6️⃣ Cycle 방지 베스트 프랙티스

### DO ✅

```
1. 설계 단계에서 Cycle 감지
   - 구조도 그려보기
   - 양방향 링크 찾기

2. Cycle마다 1개 Weak ref 설정
   - 부모-자식 구조: 자식→부모 Weak
   - 양방향 링크: 역방향 Weak
   - 체인: 마지막→첫번째 Weak

3. Weak ref는 항상 private + getter
   PRIVATE WEAK_REF parent
   FN get_parent() {
     IF parent == NULL ...
   }

4. 정리 시 Cycle 테스트
   - release() 후 leak detector 확인
   - FREELANG_DETECT_CYCLES() == 0 검증

5. 문서화
   // Class: Node
   // Relationships:
   //  - next: Strong (forward link)
   //  - prev: Weak (backward link, cycle break)
```

### DON'T ❌

```
1. 모든 참조를 Strong으로 (Cycle 생김)
   class A { REF b: B }
   class B { REF a: A }  // ❌ 순환!

2. Weak ref 체인 (모두 Weak)
   class A { WEAK_REF b: B }
   class B { WEAK_REF c: C }  // C 할당 직후 NULL!

3. Weak ref NULL check 생략
   ptr.value.method()  // ❌ ptr.value가 NULL일 수 있음

4. 동적으로 Cycle 만들기 (런타임에 감지 어려움)
   // 설계 단계에서 Cycle 구조를 정의하지 않고
   // 런타임에 임의로 참조 추가

5. Cycle이 있어도 무시
   - Leak detector 결과 무시
   - "나중에 고치겠지" 심리
```

---

## 7️⃣ 성능 고려사항

| 작업 | 비용 | 비고 |
|------|------|------|
| Strong ref 할당 | O(1) atomic op | RC++ |
| Weak ref 할당 | O(1) | weakRefTable 등록만 |
| Strong ref 파괴 | O(1) atomic op | RC-- |
| Weak ref 파괴 | O(1) | Auto-NULL (무료) |
| Weak ref 역참조 | O(1) + NULL check | NULL check 비용 무시할 수준 |
| Cycle 감지 (leak detector) | O(V+E) | 종료 시만 (성능 영향 없음) |

---

## 8️⃣ 예외 시나리오

### Scenario 1: 부분 파괴 (Parent 파괴, Child 유지)

```freelang
parent = NEW Parent()
child = NEW Child()
parent.add_child(child)  // child.parent = parent (Weak)

release(parent)          // parent 파괴

// 결과:
// - child.parent == NULL (auto-nullified)
// - child는 아직 RC=1 (다른 참조가 있다면)
```

### Scenario 2: 예외 중 Cycle 형성

```freelang
TRY
  obj_a = NEW ObjectA()
  obj_b = NEW ObjectB()
  obj_a.ref = obj_b
  obj_b.weak_ref = obj_a  // Weak ← 순환 차단
  THROW Exception()
CATCH Exception
  // 예외 시에도 weak_ref가 자동 NULL화될까?
  // → YES (Stack unwinding 중 release() 호출됨)
FINALLY
  // obj_a, obj_b 정리됨
END
```

### Scenario 3: 멀티스레드 Cycle

```freelang
// Thread A
obj_a = NEW ObjectA()
obj_b = NEW ObjectB()
obj_a.ref = obj_b
obj_b.weak_ref = obj_a

// Thread B (동시)
release(obj_a)

// 결과:
// - Invalidation (obj_b.weak_ref = NULL)은 atomic
// - Other threads에게 즉시 visible (memory barrier)
```

---

## 9️⃣ v11+ Hybrid GC와의 호환성

이 Policy는 **v2 (RC only, Weak Ref required)** 기준입니다.

**v11+ Hybrid GC 도입 시**:

```
v9-v10 (현재):
  Weak Ref: 필수 (Cycle 차단)

v11+ (선택사항):
  Mode 1: ARC_ONLY (v10 동일, Weak Ref 필수)
  Mode 2: HYBRID_RC (RC + optional Cycle Collector)
  Mode 3: HYBRID_GC (GC 우선)

Forward Compatibility:
  v2 코드(Weak Ref 포함) → v11에서도 동작 ✅
  v11에서도 Weak Ref 권장 (best practice)
```

---

## 🔟 검증 체크리스트 (Before v2.0)

- [ ] Cycle detection algorithm 구현 (Tarjan/DFS)
- [ ] Leak detector 통합
- [ ] 모든 cycle 패턴 테스트 (양방향, 체인, DAG, 자기참조)
- [ ] NULL check 강제 (TYPE system에서 Type? 표기)
- [ ] Multi-thread cycle 안전성 검증
- [ ] Exception 중 cycle 정리 검증
- [ ] Performance overhead < 2% 확인
- [ ] Developer guidance (문서, 예시) 작성

---

## 기록이 증명이다

**이 Policy는 v2가 RC-only 언어로 실용적이 되는 핵심입니다.**

Cycle은 버그가 아닌 **설계 결정**입니다.
프로그래머가 명시적으로 Weak ref로 끊음으로써
자신의 의도를 코드에 반영합니다.

---

**Policy v1.0 locks CYCLE HANDLING strategy.**
**No changes permitted without major version bump.**

기초 proven. 정책 frozen. 🔒
