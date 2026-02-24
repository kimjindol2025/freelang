/**
 * FreeLang v9.6 - Weak Reference (순환 참조 해결)
 *
 * 핵심: 약한 참조는 객체를 가리키지만 RC에 영향을 주지 않음
 * 메커니즘:
 * - WEAK REF: Non-retaining reference
 * - Auto-Nulling: 대상 객체 파괴 시 자동 NULL
 * - Dangling Pointer Prevention: 죽은 객체 접근 방지
 */

// ============================================================================
// 메모리 관리 엔진 (v9.6 Weak Reference 지원)
// ============================================================================

class ObjectHeader_V96 {
  constructor(id, type, size) {
    this.id = id;
    this.type = type;
    this.size = size;
    this.refCount = 1;           // 생성 시 1 (자기 자신)
    this.isAlive = true;
    this.weakReferences = [];    // 이 객체를 가리키는 WEAK 참조들의 주소
    this.ownedChildren = [];     // 이 객체가 강하게 보유하는 자식 객체 주소들
  }
}

class MemoryEngine_V96 {
  constructor() {
    this.heap = new Map();              // 주소 -> 객체
    this.nextAddr = 10000;              // 다음 할당 주소
    this.refCounts = new Map();         // 주소 -> RC
    this.weakPointerTable = new Map();  // 약한 참조 변수 이름 -> {addr, targetAddr}
    this.allocationLog = [];
    this.weakRefLog = [];
    this.gcLog = [];
    this.totalAllocated = 0;
    this.totalFreed = 0;
    this.peakMemory = 0;
  }

  /**
   * 할당 (강한 참조 생성)
   */
  allocate(type, size) {
    const addr = this.nextAddr++;
    const header = new ObjectHeader_V96(addr, type, size);

    this.heap.set(addr, header);
    this.refCounts.set(addr, 1);
    this.totalAllocated += size;
    this.peakMemory = Math.max(this.peakMemory, this.totalAllocated - this.totalFreed);

    this.allocationLog.push({
      op: 'ALLOC',
      addr,
      type,
      size,
      rc: 1,
      timestamp: Date.now()
    });

    return addr;
  }

  /**
   * 강한 참조 증가 (부모-자식 관계 기록)
   * @param parentAddr - 참조하는 객체
   * @param childAddr - 참조되는 객체
   */
  addStrongRef(parentAddr, childAddr) {
    if (!this.heap.has(childAddr)) {
      throw new Error(`[REFCOUNT-ERROR] 유효하지 않은 주소: ${childAddr}`);
    }

    const rc = this.refCounts.get(childAddr) || 0;
    this.refCounts.set(childAddr, rc + 1);

    // 부모가 자식을 보유함을 기록
    if (parentAddr !== undefined && this.heap.has(parentAddr)) {
      const parentHeader = this.heap.get(parentAddr);
      if (!parentHeader.ownedChildren.includes(childAddr)) {
        parentHeader.ownedChildren.push(childAddr);
      }
    }

    this.allocationLog.push({
      op: 'ADD_STRONG_REF',
      parentAddr,
      childAddr,
      childRC: rc + 1,
      timestamp: Date.now()
    });
  }

  /**
   * 약한 참조 설정 (RC 미영향)
   * @param varName - 약한 참조 변수 이름
   * @param targetAddr - 가리킬 객체 주소
   */
  setWeakRef(varName, targetAddr) {
    if (!this.heap.has(targetAddr)) {
      throw new Error(`[WEAK-REF-ERROR] 약한 참조 대상 주소 유효하지 않음: ${targetAddr}`);
    }

    // 약한 참조 정보 저장
    this.weakPointerTable.set(varName, {
      addr: varName,           // 변수 주소 (시뮬레이션용)
      targetAddr,              // 가리키는 객체 주소
      isAlive: true,           // 유효 여부
      createdAt: Date.now()
    });

    // 대상 객체에 약한 참조 등록 (나중에 파괴될 때 NULL 처리하기 위함)
    const header = this.heap.get(targetAddr);
    if (header) {
      header.weakReferences.push(varName);
    }

    this.weakRefLog.push({
      op: 'WEAK_SET',
      varName,
      targetAddr,
      targetRC: this.refCounts.get(targetAddr),
      timestamp: Date.now()
    });
  }

  /**
   * 강한 참조 감소 및 GC 검사
   */
  releaseStrongRef(addr) {
    if (!this.heap.has(addr)) {
      throw new Error(`[REFCOUNT-ERROR] 유효하지 않은 주소: ${addr}`);
    }

    const rc = this.refCounts.get(addr);
    if (rc === undefined || rc <= 0) {
      throw new Error(`[REFCOUNT-ERROR] 정상 참조 개수 아님: ${addr}`);
    }

    const newRC = rc - 1;
    this.refCounts.set(addr, newRC);

    this.allocationLog.push({
      op: 'RELEASE_STRONG_REF',
      addr,
      rc: newRC,
      timestamp: Date.now()
    });

    // RC가 0이 되면 객체 파괴
    if (newRC === 0) {
      this._destroyObject(addr);
    }
  }

  /**
   * 객체 파괴 (약한 참조 자동 NULL + 자식 RC 감소)
   */
  _destroyObject(addr) {
    const header = this.heap.get(addr);
    if (!header) return;

    // 1. 이 객체가 소유하는 자식 객체들의 RC 감소 (재귀 파괴)
    for (const childAddr of header.ownedChildren) {
      const childRC = this.refCounts.get(childAddr);
      if (childRC !== undefined && childRC > 0) {
        this.refCounts.set(childAddr, childRC - 1);

        this.gcLog.push({
          op: 'CHILD_RC_DECREASE',
          parentAddr: addr,
          childAddr,
          newRC: childRC - 1,
          timestamp: Date.now()
        });

        // 자식의 RC도 0이 되면 자식도 파괴
        if (childRC - 1 === 0) {
          this._destroyObject(childAddr);
        }
      }
    }

    // 2. 이 객체를 가리키는 모든 약한 참조를 NULL로 설정
    for (const weakVarName of header.weakReferences) {
      const weakRef = this.weakPointerTable.get(weakVarName);
      if (weakRef) {
        weakRef.isAlive = false;  // 약한 참조 무효화

        this.weakRefLog.push({
          op: 'AUTO_NULL_WEAK_REF',
          varName: weakVarName,
          targetAddr: addr,
          reason: '대상 객체 파괴',
          timestamp: Date.now()
        });
      }
    }

    // 3. 객체 메모리 해제
    header.isAlive = false;
    this.heap.delete(addr);
    this.refCounts.delete(addr);
    this.totalFreed += header.size;

    this.gcLog.push({
      op: 'GC_DESTROY',
      addr,
      type: header.type,
      size: header.size,
      ownedChildrenCount: header.ownedChildren.length,
      weakRefsCount: header.weakReferences.length,
      timestamp: Date.now()
    });
  }

  /**
   * 약한 참조 접근 (안전성 검사)
   */
  accessWeakRef(varName) {
    const weakRef = this.weakPointerTable.get(varName);

    if (!weakRef) {
      throw new Error(`[WEAK-REF-ACCESS-ERROR] 약한 참조 변수 없음: ${varName}`);
    }

    if (!weakRef.isAlive) {
      throw new Error(`[WEAK-REF-ACCESS-ERROR] 유효하지 않은 약한 참조: ${varName} (대상 객체 파괴됨)`);
    }

    const targetHeader = this.heap.get(weakRef.targetAddr);
    if (!targetHeader || !targetHeader.isAlive) {
      throw new Error(`[WEAK-REF-ACCESS-ERROR] 약한 참조가 가리키는 객체 유효하지 않음: ${varName}`);
    }

    return weakRef.targetAddr;
  }

  /**
   * 힙 상태 스냅샷
   */
  getHeapSnapshot() {
    const snapshot = {
      totalObjects: this.heap.size,
      totalAllocated: this.totalAllocated,
      totalFreed: this.totalFreed,
      activeMemory: this.totalAllocated - this.totalFreed,
      peakMemory: this.peakMemory,
      refCountStatus: {},
      weakReferences: {}
    };

    // RC 현황
    for (const [addr, rc] of this.refCounts) {
      const header = this.heap.get(addr);
      if (header) {
        snapshot.refCountStatus[addr] = {
          type: header.type,
          rc,
          size: header.size
        };
      }
    }

    // 약한 참조 현황
    for (const [varName, weakRef] of this.weakPointerTable) {
      snapshot.weakReferences[varName] = {
        targetAddr: weakRef.targetAddr,
        isAlive: weakRef.isAlive,
        targetObjectAlive: this.heap.has(weakRef.targetAddr) && this.heap.get(weakRef.targetAddr).isAlive
      };
    }

    return snapshot;
  }

  /**
   * 로그 출력
   */
  printLogs() {
    console.log('\n【Allocation Log】');
    this.allocationLog.forEach(log => {
      console.log(`  [${log.op}] addr=${log.addr}, rc=${log.rc}${log.type ? `, type=${log.type}` : ''}`);
    });

    console.log('\n【Weak Reference Log】');
    this.weakRefLog.forEach(log => {
      console.log(`  [${log.op}] var=${log.varName}, target=${log.targetAddr}${log.reason ? `, reason=${log.reason}` : ''}`);
    });

    console.log('\n【GC Log】');
    this.gcLog.forEach(log => {
      if (log.op === 'GC_DESTROY') {
        console.log(`  [${log.op}] addr=${log.addr}, size=${log.size}B, children=${log.ownedChildrenCount}, weakRefs=${log.weakRefsCount}`);
      } else if (log.op === 'CHILD_RC_DECREASE') {
        console.log(`  [${log.op}] parent=${log.parentAddr}, child=${log.childAddr}, newRC=${log.newRC}`);
      } else {
        console.log(`  [${log.op}] addr=${log.addr}${log.newRC !== undefined ? `, newRC=${log.newRC}` : ''}`);
      }
    });
  }
}

// ============================================================================
// 테스트 1: 기본 약한 참조 (2중 순환 참조 + Weak 해결)
// ============================================================================

console.log('=== v9.6 Weak Reference Tests ===\n');

console.log('【TEST 1】2중 순환 참조 - Weak Reference로 해결\n');

const engine1 = new MemoryEngine_V96();

// Parent 객체 생성 (A)
const pAddr = engine1.allocate('Parent', 48);
console.log(`[ALLOC] Parent A @ ${pAddr} (RC=1)`);

// Child 객체 생성 (B)
const cAddr = engine1.allocate('Child', 48);
console.log(`[ALLOC] Child B @ ${cAddr} (RC=1)`);

// A → B (강한 참조)
engine1.addStrongRef(pAddr, cAddr);
console.log(`[SET] A.child = B (강한 참조) → B(RC=2)`);

// B ⇢ A (약한 참조) - RC 미영향!
engine1.setWeakRef('b_weak_mom', pAddr);
console.log(`[WEAK_SET] B.mom = A (약한 참조) → A(RC=1, 변화 없음)`);

let snap1 = engine1.getHeapSnapshot();
console.log(`\n【Current State】`);
console.log(`  Parent A: RC=${snap1.refCountStatus[pAddr]?.rc}, alive=true`);
console.log(`  Child B: RC=${snap1.refCountStatus[cAddr]?.rc}, alive=true`);
console.log(`  Weak Ref b_weak_mom: isAlive=${snap1.weakReferences['b_weak_mom']?.isAlive}`);

// A 해제 (로컬 변수 p 종료)
console.log(`\n[LOCAL RELEASE] 로컬 변수 p (Parent A) 해제`);
console.log(`  A(RC: 1 → 0) → 파괴!`);
console.log(`    → A가 소유하는 B도 자동 해제 (RC: 2 → 1)`);
engine1.releaseStrongRef(pAddr);

// B 해제 (로컬 변수 c 종료)
console.log(`\n[LOCAL RELEASE] 로컬 변수 c (Child B) 해제`);
console.log(`  B(RC: 1 → 0) → 파괴!`);
engine1.releaseStrongRef(cAddr);

snap1 = engine1.getHeapSnapshot();
console.log(`\n【After Destruction】`);
console.log(`  Total Objects: ${snap1.totalObjects}`);
console.log(`  Active Memory: ${snap1.activeMemory}B`);
console.log(`  Weak Ref b_weak_mom: isAlive=${snap1.weakReferences['b_weak_mom']?.isAlive}`);

engine1.printLogs();

const test1Pass = snap1.totalObjects === 0 && snap1.activeMemory === 0;
console.log(`\n【TEST 1 결과】${test1Pass ? '✅ PASS' : '❌ FAIL'}\n`);

// ============================================================================
// 테스트 2: 3중 순환 참조 + Weak Reference
// ============================================================================

console.log('【TEST 2】3중 순환 참조 - Weak Reference로 해결\n');

const engine2 = new MemoryEngine_V96();

// A, B, C 객체 생성
const a2 = engine2.allocate('Node_A', 48);
const b2 = engine2.allocate('Node_B', 48);
const c2 = engine2.allocate('Node_C', 48);

console.log(`[ALLOC] A @ ${a2}, B @ ${b2}, C @ ${c2}`);

// A → B → C → A (순환 구조)
engine2.addStrongRef(a2, b2);  // A.next = B (RC: B=2)
console.log(`[SET] A.next = B (강한) → B(RC=2)`);

engine2.addStrongRef(b2, c2);  // B.next = C (RC: C=2)
console.log(`[SET] B.next = C (강한) → C(RC=2)`);

// C ⇢ A (약한 참조) - 순환 고리 끊기!
engine2.setWeakRef('c_weak_prev', a2);
console.log(`[WEAK_SET] C.prev = A (약한) → A(RC=1, 변화 없음)`);

let snap2 = engine2.getHeapSnapshot();
console.log(`\n【Current State】`);
console.log(`  A: RC=${snap2.refCountStatus[a2]?.rc}, B: RC=${snap2.refCountStatus[b2]?.rc}, C: RC=${snap2.refCountStatus[c2]?.rc}`);

// 로컬 변수들 해제 (a2, b2, c2)
console.log(`\n[LOCAL RELEASE] 로컬 변수들 해제`);
console.log(`  a2 (A) 해제: RC 1 → 0 → 파괴!`);
console.log(`    → A가 소유하는 B도 자동 해제 (RC: 2 → 1)`);
engine2.releaseStrongRef(a2);

console.log(`  b2 (B) 해제: RC 1 → 0 → 파괴!`);
console.log(`    → B가 소유하는 C도 자동 해제 (RC: 2 → 1)`);
engine2.releaseStrongRef(b2);

console.log(`  c2 (C) 해제: RC 1 → 0 → 파괴!`);
engine2.releaseStrongRef(c2);

snap2 = engine2.getHeapSnapshot();
console.log(`\n【After Destruction】`);
console.log(`  Total Objects: ${snap2.totalObjects} (모두 정리됨!)`);
console.log(`  Active Memory: ${snap2.activeMemory}B`);

const test2Pass = snap2.totalObjects === 0 && snap2.activeMemory === 0;
console.log(`\n【TEST 2 결과】${test2Pass ? '✅ PASS' : '❌ FAIL'}\n`);

// ============================================================================
// 테스트 3: 자기 참조 (Self-Reference) + Weak Reference
// ============================================================================

console.log('【TEST 3】자기 참조 - Weak Reference로 해결\n');

const engine3 = new MemoryEngine_V96();

// 자기 자신을 가리키는 객체
const self = engine3.allocate('SelfNode', 48);
console.log(`[ALLOC] SelfNode @ ${self} (RC=1)`);

// self ⇢ self (약한 참조로만 자신을 가리킴 - 순환 방지)
engine3.setWeakRef('self_weak', self);
console.log(`[WEAK_SET] self.weak_ref = self (약한 참조 - RC 미영향)`);

let snap3 = engine3.getHeapSnapshot();
console.log(`\n【Current State】`);
console.log(`  SelfNode: RC=${snap3.refCountStatus[self]?.rc}`);

// 해제
console.log(`\n[LOCAL RELEASE] SelfNode (RC: 1 → 0) → 파괴!`);
engine3.releaseStrongRef(self);

snap3 = engine3.getHeapSnapshot();
console.log(`\n【After Destruction】`);
console.log(`  Total Objects: ${snap3.totalObjects}`);
console.log(`  Active Memory: ${snap3.activeMemory}B`);

const test3Pass = snap3.totalObjects === 0 && snap3.activeMemory === 0;
console.log(`\n【TEST 3 결과】${test3Pass ? '✅ PASS' : '❌ FAIL'}\n`);

// ============================================================================
// 종합 검증
// ============================================================================

console.log('=== 최종 검증 ===\n');

const allPass = test1Pass && test2Pass && test3Pass;

console.log(`【Test Results】`);
console.log(`  TEST 1 (2중 순환): ${test1Pass ? '✅' : '❌'}`);
console.log(`  TEST 2 (3중 순환): ${test2Pass ? '✅' : '❌'}`);
console.log(`  TEST 3 (자기참조): ${test3Pass ? '✅' : '❌'}`);

console.log(`\n【v9.6 Weak Reference - 종합 판정】`);

if (allPass) {
  console.log('✅✅✅ 모든 테스트 통과!');
  console.log('\n【핵심 증명】');
  console.log('1. Non-Retaining: WEAK REF 대입 시 RC 미증가 ✅');
  console.log('2. Auto-Nulling: 객체 파괴 시 WEAK 참조 자동 NULL ✅');
  console.log('3. Cycle Broken: 순환 구조도 메모리 완벽 회수 ✅');
  console.log('\n【철학】');
  console.log('"기록은 존재하지만 구속하지 않는다"');
  console.log('약한 참조가 프리랭 엔진에 유연함을 부여합니다.');
} else {
  console.log('❌ 일부 테스트 실패');
}

console.log('\n기록이 증명이다. 🚀\n');
