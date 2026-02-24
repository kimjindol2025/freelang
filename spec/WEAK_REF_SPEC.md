# 📌 WEAK_REF Specification v1.0

**Version**: v1.0 (Semantic Freeze)
**Date**: 2026-02-25
**Target**: v2-freelang-ai (Production Language)
**Author**: Claude Code (Semantic Formalization Phase)

---

## 1️⃣ WEAK_REF 핵심 정의

```
WEAK_REF<T>는 Strong Reference와 달리:
- RC(Reference Count)를 증가시키지 않음 (비소유 참조)
- 대상 객체 파괴 시 자동으로 NULL이 됨 (auto-nullification)
- 순환 참조를 방지하기 위해 프로그래머가 명시적으로 지정
- 역할: Strong 링크 1개 이상을 끊어서 순환고리 해제
```

### 선언 문법

```freelang
class Node {
  PROPERTY value: int
  REF next: Node         // Strong: RC 관리
  WEAK_REF prev: Node    // Weak: RC 미관리
}
```

**Type System 영향**:
- Strong reference: Type는 Object, RC 책임
- Weak reference: Type은 Object?, NULL 가능성
- 혼합 사용 필수 (일부는 Strong, 일부는 Weak)

---

## 2️⃣ WEAK_REF 생명주기

### Phase 1: 할당 (Initialization)

```
Node A ──REF──> Node B (RC++ for B, RC=1)
Node B ──WEAK──> Node A (NO RC change, RC=1)

Result: RC(A)=1, RC(B)=1 (순환 ✓)
```

**불변식**:
- RC는 Strong 링크 개수만 반영
- Weak 링크는 RC에 영향 없음
- Weak 할당 = O(1) (RC 연산 없음)

### Phase 2: 역참조 (Dereference)

```
IF weak_ref != NULL
  USE weak_ref.value     // 안전 (객체 살아있음)
ELSE
  // 대상이 파괴됨 (RC=0)
```

**Guarantee**:
- weak_ref가 NULL이 아니면 역참조 안전
- NULL 가능성은 프로그래머 책임

### Phase 3: 파괴 (Destruction)

**파괴 순서 (CRITICAL)**:

```
release(A)
  1. A의 Strong 링크 파괴
     - release(A.next) → RC(B)--

  2. A.prev (Weak) 자동 처리
     → 대상 B에서 A.prev를 찾아 NULL로 설정
     → atomic assignment

  3. A 자신 파괴
     → deallocate(A)
```

**Key Invariant**: Weak ref는 대상 파괴 BEFORE deallocate 단계에서 NULL

---

## 3️⃣ 순환 참조 차단 패턴

### Pattern 1: 양방향 Linked List

```freelang
class Node {
  PROPERTY value: int
  REF next: Node        // 순방향 (Strong)
  WEAK_REF prev: Node   // 역방향 (Weak) ← 순환 끊음
}

node_a = NEW Node(10)
node_b = NEW Node(20)
node_a.next = node_b    // RC(B)=1
node_b.prev = node_a    // RC(A)=1 (unchanged)

release(node_a)         // node_b.prev=NULL (auto)
// node_b 이제 RC=0 → 자동 파괴
```

**결과**: 순환 없음 ✅

### Pattern 2: 부모-자식 트리

```freelang
class TreeNode {
  PROPERTY value: int
  REF[] children: TreeNode  // 부모→자식 Strong
  WEAK_REF parent: TreeNode // 자식→부모 Weak
}

root = NEW TreeNode(1)
child = NEW TreeNode(2)
root.children[0] = child    // RC(child)=1
child.parent = root         // RC(root)=1

release(root)               // child.parent=NULL (auto)
// 전체 트리 정리됨
```

**결과**: 모든 차일드 RC=0 되면 정리됨 ✅

### Pattern 3: 캐시 + 역참조

```freelang
class Cache {
  PROPERTY items: HashMap<String, Object>
}

item = NEW Object(expensive_data)
cache.items["key"] = item      // RC(item)=1

// 나중에 item이 cache 내 자신의 위치 참조하고 싶음:
weak_backref = WEAK_REF<Cache> // item → cache (Weak)
item.owner = weak_backref      // NO RC change

// item release해도 cache 안됨 (Weak이므로)
// cache release 시 item.owner=NULL (auto)
```

---

## 4️⃣ 구현 요구사항 (for Runtime)

### 4-1. Weak Reference 저장소

```typescript
weakRefTable: Map<ObjectId, WeakRefList>
  // ObjectId → 이 객체를 가리키는 모든 WeakRef[]

class WeakRef<T> {
  targetId: ObjectId
  storageLocation: &WeakRef  // 저장 위치 (메모리 주소)
  isValid: boolean           // NULL 여부 표시
}
```

**불변식**:
- 모든 Weak ref는 weakRefTable에 등록됨
- 대상 파괴 시 weakRefTable[targetId] 조회 → 모두 NULL화

### 4-2. Invalidation Algorithm

```
_destroyObject(obj: Object)
  // Step 1: Weak refs FIRST (즉시 NULL화)
  FOR EACH weak_ref in weakRefTable[obj.id]
    atomic_store(&weak_ref.value, NULL)
    weak_ref.isValid = false

  weakRefTable.delete(obj.id)

  // Step 2: Strong links (RC 관리)
  FOR EACH strong_member in obj.members
    release(strong_member)

  // Step 3: Destructor call
  obj.destructor()

  // Step 4: Deallocate
  deallocate(obj)
```

**Key**: Invalidation (Step 1)이 Strong link release (Step 2)보다 먼저

### 4-3. Thread Safety

```
Thread A (Destroyer):          Thread B (User):
─────────────────────────────  ──────────────
release(obj)                   weak_ref.check()
  atomicStore(wr.value, NULL)  IF weak_ref == NULL
  ↓ memory_barrier             return  // SAFE!
  destroy object               ELSE
                                 use obj // ERROR impossible
```

**Guarantee**:
- Memory barrier는 Invalidation → 다른 스레드 visibility 보증
- Thread B가 NULL check 통과하면 해당 객체는 아직 유효함

---

## 5️⃣ 사용 규칙 (Best Practices)

### DO ✅

```
1. 순환고리 하나당 1개 이상 Weak ref 사용
   // ❌ 나쁨: 모두 Strong
   A.ref = B; B.ref = A;  // 순환!

   // ✅ 좋음: 하나는 Weak
   A.ref = B; B.weak_ref = A;  // 안전!

2. 양방향 링크는 역방향을 Weak으로
   // node.next (Strong) + node.prev (Weak)

3. 부모-자식 관계는 부모→자식 Strong, 자식→부모 Weak
   // parent.children[] (Strong) + child.parent (Weak)

4. NULL check 필수
   IF item.owner != NULL
     USE item.owner
   END

5. Weak ref 제로 비용 (RC 미관리)
   // 추가 오버헤드 없음, storage만 필요
```

### DON'T ❌

```
1. 모든 참조를 Weak으로
   // 아무도 Strong을 안 하면 RC=0 → 즉시 파괴

2. Weak ref 체이닝
   // obj.weak1.weak2.weak3
   // weak1 파괴되면 weak2, weak3도 무효

3. Weak ref 역참조 전 NULL check 생략
   ptr.value  // NULL일 수 있음!

4. Weak ref와 Strong ref 섞어서 같은 링크 사용
   // 2개 참조가 같은 객체를 가리킬 때
   // 하나는 Strong, 하나는 Weak ← 불가능 (설계상)
   // 대신: 링크 선택 (Strong 또는 Weak, 일관성 필수)
```

---

## 6️⃣ NULL 체크 패턴

### Safe Pattern

```freelang
// Pattern 1: 간단 체크
IF node.prev != NULL
  PRINT node.prev.value
END

// Pattern 2: 대체값
parent_value = (item.parent != NULL) ? item.parent.id : -1

// Pattern 3: 리턴 조건
IF data.owner == NULL
  RETURN ERROR "owner was destroyed"
END
USE data.owner

// Pattern 4: 방어적 복사
IF weak_ref != NULL
  local_copy = weak_ref  // Weak 복사 (여전히 Weak)
  // local_copy 사용 안전 (같은 lifecycle)
END
```

### Unsafe Pattern ❌

```freelang
// ❌ 체크 없음
PRINT item.owner.id

// ❌ TOCTOU (Time-Of-Check-Time-Of-Use) 경쟁
IF item.owner != NULL
  // 여기서 다른 스레드가 item.owner를 파괴할 수 있음!
  // (약한 보호만 됨, fully thread-safe는 아님)
  USE item.owner
END

// ❌ 무한 역참조
current = node.prev  // Weak
WHILE current != NULL
  current = current.prev  // Weak chain (위험!)
END
```

---

## 7️⃣ 메모리 모델 영향

| 항목 | Strong Ref | Weak Ref |
|------|-----------|---------|
| RC 증가 | ✅ | ❌ |
| RC 감소 | ✅ | ❌ |
| Auto-NULL | ❌ | ✅ |
| 저장소 크기 | 8B (pointer) | 16B (ptr + valid flag) |
| Dereference 비용 | O(1) | O(1) |
| NULL check 필요 | ❌ | ✅ |
| 순환 참조 | 가능 (주의) | 불가 (단점 해결) |

---

## 8️⃣ 예외 안전성 (Exception Safety)

### Guarantee: Weak ref는 예외 중에도 NULL 가능성

```freelang
TRY
  THROW SomeException()  // 정리 시작
CATCH SomeException
  // 이 시점에서 weak_ref.owner가 이미 NULL일 수 있음
  IF weak_ref.owner != NULL
    USE weak_ref.owner
  END
FINALLY
  // Cleanup 보장됨 (FINALLY 블록)
END
```

**원칙**: Weak ref 신뢰하지 말고, 항상 NULL check

---

## 9️⃣ v2 Cycle Detector와의 연계

이 Weak Ref Spec은 **순환을 프로그래머가 방지**하는 모델입니다.
v11+ Hybrid GC에서 Cycle Collector가 추가되면:

```
v9-v10 (v2):  Weak Ref 필수 (수동 순환 차단)
v11+ (선택):  Cycle Collector (자동) + Weak Ref 선택사항
```

현재 v2는 **Weak Ref only** 전략입니다.

---

## 🔟 검증 체크리스트 (Before v2.0 Release)

- [ ] Weak ref 할당/파괴 메커니즘 구현
- [ ] Auto-nullification (invalidation) 구현
- [ ] weakRefTable 관리
- [ ] Thread-safe atomic ops 사용
- [ ] NULL check 강제 (타입 시스템에서 `Type?` 표기)
- [ ] 메모리 배리어 (release-acquire semantics)
- [ ] 예외 중 weak ref 무효화 테스트
- [ ] 순환고리 정말 끊어지는지 검증 (RC 측정)
- [ ] Performance: weak ref 오버헤드 < 5%

---

## 기록이 증명이다

**이 Spec은 v2 정체성의 핵심입니다.**
Weak reference 없이는 RC-only 언어로서 실용성이 없습니다.

---

**Specification v1.0 locks WEAK_REF semantics.**
**No changes permitted without major version bump.**

기초 proven. 아키텍처 frozen. 🔒
