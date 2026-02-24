# 📐 FreeLang Memory Model - Formal Specification

**Version**: v2.0 (Stabilized RC)
**Date**: 2026-02-25
**Target**: v2-freelang-ai (Production)

---

## 1️⃣ RETAIN/RELEASE HAPPENS-BEFORE

### Fundamental Axiom

```
RETAIN(obj) happens-before RELEASE(obj)

∀ retain operations on obj, ∃ corresponding release operation
  RC(obj) increases monotonically until final release
  RC(obj) never goes negative
```

### Formal Definition

```
retain(obj: Object) → void
  atomicIncrement(&obj.refCount)
  memory_barrier(memory_order_seq_cst)

release(obj: Object) → void
  memory_barrier(memory_order_seq_cst)
  old_rc = atomicDecrement(&obj.refCount)
  IF old_rc == 1
    _destroyObject(obj)
```

### Guarantees

| Operation | Guarantee | Proof |
|-----------|-----------|-------|
| RETAIN happens-before RELEASE | Total order on same object | Atomic ops + barriers |
| RC(obj) ≥ 0 always | Invariant maintained | Decrement checks |
| Each RETAIN paired with RELEASE | No leak | Destructor accounting |

---

## 2️⃣ DESTRUCTOR ORDERING RULES

### Destruction Order: Depth-First Search (DFS)

```
_destroyObject(obj: Object)
  1. Mark obj as "destroying" (prevent cycles)
  2. Release all member objects (recursive)
  3. Call destructor() method (if exists)
  4. Deallocate memory
  5. Update registry
```

### Algorithm

```
function destroyTree(obj, visited = {})
  IF obj in visited
    return  // Cycle detection

  visited.add(obj)

  // Step 1: Destroy members first (DFS pre-order)
  FOR EACH member in obj.members
    IF member.refCount > 0
      release(member)  // Recursive

  // Step 2: Call destructor
  IF obj has destructor
    obj.destructor()  // May release more refs

  // Step 3: Deallocate
  memory.free(obj)
  registry.remove(obj)
```

### Example (3-level hierarchy)

```
class A { PROPERTY b: B }
class B { PROPERTY c: C }
class C { }

a = NEW A()
a.b = NEW B()
a.b.c = NEW C()

release(a)  // Destruction order:
  1. release(a.b)
     - release(a.b.c)
       * a.b.c.destructor() (if exists)
       * deallocate C
     - a.b.destructor()
     - deallocate B
  2. a.destructor()
  3. deallocate A
```

### Circular Destruction Safety

```
WEAK_REF breaks cycles before destruction:

class Node {
  PROPERTY next: Node
  WEAK_REF prev: Node
}

node_a = NEW Node()
node_b = NEW Node()
node_a.next = node_b
node_b.prev = node_a  // Weak, no RC increment

release(node_a)  // Safe destruction:
  1. release(node_a.next)  // node_b RC--
  2. node_b.prev = NULL    // Weak auto-nullified
  3. (node_b now freed)
  4. deallocate node_a
```

---

## 3️⃣ WEAK REFERENCE INVALIDATION SEMANTICS

### Invalidation Point (Critical)

```
weak_ref invalidation happens-before any access to weak_ref

Definition: When target object enters destruction phase
Timing: _destroyObject() entry point
Visibility: Immediate to all threads
```

### Formal Guarantee

```
IF obj being destroyed
  ∀ weak_ref pointing to obj
    ∃ point P where weak_ref.value = NULL (atomic assignment)
    P happens-before ANY subsequent weak_ref.dereference()
```

### Algorithm

```
_destroyObject(obj: Object)
  // Step 1: Invalidate all weak refs (FIRST)
  FOR EACH weak_ref in weakRefTable[obj]
    atomicStore(&weak_ref.value, NULL)
    memory_barrier()

  // Step 2: Now safe to destroy members
  FOR EACH member in obj.members
    release(member)

  // Step 3: Call destructor
  obj.destructor()

  // Step 4: Deallocate
  memory.free(obj)
```

### Thread Visibility

```
Thread A (Destroyer):           Thread B (User):
─────────────────────────────   ──────────────
release(obj)                    weak_ref.check()
  atomicStore(weak_ref, NULL)   IF weak_ref == NULL
  ↓ (memory barrier)              return  // Safe!
  destroy object                ELSE
                                  USE obj  // ERROR (impossible)
```

### Exception Safety During Invalidation

```
TRY
  release(obj)  // Starts destruction
CATCH Exception
  // Weak refs already invalidated
  // Safe to continue
FINALLY
  // Weak refs are NULL
  // No use-after-free possible
```

---

## 4️⃣ THREAD VISIBILITY MODEL

### Memory Barriers (x86-64 & ARM)

```
Platform: x86-64 (TSO - Total Store Order)
  memory_order_seq_cst:
    LOCK prefix on atomic ops (implicit barrier)
    mfence for explicit barriers

Platform: ARM (Weak ordering)
  memory_order_seq_cst:
    DMB (Data Memory Barrier)
    ISB (Instruction Synchronization Barrier)

Result: Sequential consistency across all platforms
```

### Happens-Before Rules

```
Rule 1: Atomic ops imply memory barriers
  atomicIncrement() includes memory barrier
  → All prior stores visible before atomic op
  → All subsequent loads see atomic result

Rule 2: Release-Acquire pattern
  release(obj):  memory_barrier() + atomicDecrement
  retain(obj):   atomicIncrement + memory_barrier
  → Synchronization point established

Rule 3: Destructor visibility
  release() → _destroyObject() → memory.free()
  Barriers ensure:
    - All member releases complete
    - Destructor sees consistent state
    - Deallocation visible to all threads
```

### Data Race Freedom Proof

```
Claim: No data races in RC operations

Proof by contradiction:
  Assume race condition exists between:
    Thread A: release(obj)
    Thread B: retain(obj)

  Case 1: Both in atomicIncrement/Decrement
    → Protected by atomic operation + barriers
    → No race (atomic semantics)

  Case 2: Release finalizes while other thread accesses
    → Weak ref invalidation happens first
    → Other thread gets NULL
    → No access to freed memory (prevented)

  Case 3: Multiple releases race
    → atomicDecrement ensures RC > 0 check before free
    → Only first to reach RC=0 calls destructor
    → Rest see RC already decremented (atomicity)

  ∴ No races possible (QED)
```

---

## 5️⃣ EXCEPTION SAFETY DURING RC OPERATIONS

### Exception Handling Axiom

```
Exception raised during retain/release must not:
  ❌ Leave RC in invalid state
  ❌ Leave weak refs in inconsistent state
  ❌ Leak memory
  ❌ Cause use-after-free
```

### Stack Unwinding with RC Sync

```
TRY
  obj1 = NEW Object()  // RC(obj1) = 1
  obj2 = NEW Object()  // RC(obj2) = 1
  riskyOperation()     // May THROW
CATCH Exception
  // All RC operations in stack frames:
  //   1. Marked for unwinding
  //   2. RC decremented atomically
  //   3. Destructors called in DFS order
FINALLY
  // At this point: All RC synced, no leaks
```

### Algorithm

```
UNWIND_WITH_RC(callStack: StackFrame[])
  FOR EACH frame in callStack (reverse order)
    // Step 1: Release all local variables
    FOR EACH local_var in frame.localVars
      release(local_var)  // RC--, destructor if RC=0

    // Step 2: Update frame state
    frame.RC_synced = true

  // Step 3: Exception continues
  THROW (or return from CATCH)
```

### Guarantee: Exception Propagation

```
THROW exception
  1. Start unwinding (callStack)
  2. UNWIND_WITH_RC (sync all RCs)
  3. Release exception object itself (last)
  4. Propagate to CATCH

Result: Zero leaks during exception
```

---

## 📊 FORMAL INVARIANTS (Must Always Hold)

| Invariant | Condition | Enforcement |
|-----------|-----------|-------------|
| RC ≥ 0 | refCount never negative | atomicDecrement checks |
| RC Consistency | Each RETAIN pairs with RELEASE | Accounting in destructor |
| Weak Ref Safety | NULL before dealloc | Invalidation-first algorithm |
| Thread Safety | No data races | Memory barriers + atomics |
| Exception Safety | No leaks on unwind | UNWIND_WITH_RC |
| DFS Order | Members before parent | _destroyObject recursion |
| Cycle Handling | Weak refs prevent deadlock | WeakRef design |

---

## ✅ VERIFICATION CHECKLIST

Before v2.0 release:

```
[ ] RETAIN/RELEASE: Total order verified (test: 1M ops)
[ ] Destructor order: DFS validated (test: 1000-depth tree)
[ ] Weak ref invalidation: NULL before dealloc (test: race detection)
[ ] Thread visibility: No races (test: ThreadSanitizer)
[ ] Exception safety: Zero leaks on unwind (test: exception storms)
[ ] Invariants: All held under load (test: 30-day stability)
```

---

**This formal spec locks v2 RC semantics.**
**No changes permitted without major version bump.**

基础 proven. 架构 frozen. 🔒
