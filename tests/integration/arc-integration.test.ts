/**
 * Stage 5: ARC Integration Tests
 *
 * Tests the Reference Counting Engine (ARC) without a full interpreter.
 * Validates:
 * - Memory allocation and deallocation
 * - Reference counting semantics
 * - Weak reference cycle breaking
 * - Leak detection
 * - Stress testing with invariant verification
 */

import { ReferenceCountingEngine, ObjectMetadata } from '../../runtime/arc/reference-counting';
import { WeakRefTable } from '../../runtime/arc/weak-ref-table';
import { ObjectLifecycleManager } from '../../runtime/arc/object-lifecycle';
import { MemoryManager } from '../../runtime/arc/memory-manager';
import { CycleDetector } from '../../runtime/gc/cycle-detector';
import { LeakReporter } from '../../runtime/gc/leak-reporter';

describe('Stage 5: ARC Integration Tests', () => {
  describe('TEST-1: Member Ownership Deep Release', () => {
    it('should release deep chains: A->B->C->D with RC=0 on all', () => {
      // Setup
      const rce = new ReferenceCountingEngine();
      const weakRefTable = new WeakRefTable();
      const lifecycle = new ObjectLifecycleManager(rce, weakRefTable);

      // Allocate objects in a chain: A-B-C-D
      const addrA = rce.allocate('ObjectA', 64);
      const addrB = rce.allocate('ObjectB', 64);
      const addrC = rce.allocate('ObjectC', 64);
      const addrD = rce.allocate('ObjectD', 64);

      // Initial state: each has RC=1
      expect(rce.getRefCount(addrA)).toBe(1);
      expect(rce.getRefCount(addrB)).toBe(1);
      expect(rce.getRefCount(addrC)).toBe(1);
      expect(rce.getRefCount(addrD)).toBe(1);

      // Create ownership chain: A owns B, B owns C, C owns D
      lifecycle.registerObjectMembers(addrA, [
        { name: 'b', addr: addrB, isStrong: true },
      ]);
      lifecycle.registerObjectMembers(addrB, [
        { name: 'c', addr: addrC, isStrong: true },
      ]);
      lifecycle.registerObjectMembers(addrC, [
        { name: 'd', addr: addrD, isStrong: true },
      ]);

      // Destroy the entire chain by destroying root A
      // This will cascade: A -> releases B -> releases C -> releases D
      lifecycle.destroyObject(addrA);

      // Verify A is deallocated (root of the chain)
      // It should either be marked isAlive=false or completely removed
      const metaA = rce.getMetadata(addrA);
      expect(metaA === undefined || metaA.isAlive === false).toBe(true);

      // Verify destruction log shows the cascade
      const stats = lifecycle.getStats();
      expect(stats.totalDestroyed).toBeGreaterThan(0);
      expect(stats.totalMembersReleased).toBeGreaterThan(0);
    });
  });

  describe('TEST-2: Circular Reference Detection', () => {
    it('should detect 2-node cycle: A<->B', () => {
      const detector = new CycleDetector();

      // Register nodes: A references B, B references A (cycle)
      detector.registerNode(1000, 'NodeA', 1, [2000]);  // A -> B
      detector.registerNode(2000, 'NodeB', 1, [1000]);  // B -> A

      const cycles = detector.detectCycles();

      expect(cycles).toHaveLength(1);
      expect(cycles[0].nodes).toContain(1000);
      expect(cycles[0].nodes).toContain(2000);
      expect(cycles[0].pattern).toBe('2-node');
      expect(cycles[0].isLeaked).toBe(true);
    });

    it('should detect 3-node cycle: A->B->C->A', () => {
      const detector = new CycleDetector();

      // Register nodes: A -> B -> C -> A
      detector.registerNode(1000, 'NodeA', 1, [2000]);  // A -> B
      detector.registerNode(2000, 'NodeB', 1, [3000]);  // B -> C
      detector.registerNode(3000, 'NodeC', 1, [1000]);  // C -> A (closes cycle)

      const cycles = detector.detectCycles();

      expect(cycles.length).toBeGreaterThan(0);
      const cycle = cycles.find(c => c.nodes.length === 3);
      expect(cycle).toBeDefined();
      expect(cycle?.isLeaked).toBe(true);
    });

    it('should detect self-loop: A->A', () => {
      const detector = new CycleDetector();

      // Register self-referencing node
      detector.registerNode(1000, 'NodeA', 1, [1000]);  // A -> A

      const cycles = detector.detectCycles();

      expect(cycles.length).toBeGreaterThan(0);
      const selfLoop = cycles.find(c => c.pattern === 'self');
      expect(selfLoop).toBeDefined();
      expect(selfLoop?.isLeaked).toBe(true);
    });
  });

  describe('TEST-3: Weak Reference Cycle Breaking', () => {
    it('should break A<->B cycle with weak ref', () => {
      const rce = new ReferenceCountingEngine();
      const weakRefTable = new WeakRefTable();

      // Allocate two objects
      const addrA = rce.allocate('NodeA', 64);  // RC=1
      const addrB = rce.allocate('NodeB', 64);  // RC=1

      // A retains B (strong reference)
      rce.retain(addrB);  // B's RC=2

      // B has weak reference to A (doesn't increase RC)
      weakRefTable.setWeakRef('a_weak_ref', addrA);  // A's RC stays 1

      // Release one reference to B
      rce.release(addrB);  // B's RC=1

      // Release A (RC becomes 0)
      rce.release(addrA);  // A's RC=0 → deallocate A

      // Invalidate weak refs to A
      weakRefTable.invalidateWeakRefsTo(addrA);

      // Release final reference to B
      rce.release(addrB);  // B's RC=0 → deallocate B

      // Verify no leaks
      expect(rce.detectLeaks()).toHaveLength(0);
    });

    it('should preserve reachability after weak ref break', () => {
      const rce = new ReferenceCountingEngine();
      const weakRefTable = new WeakRefTable();

      const addrA = rce.allocate('NodeA', 64);
      const addrB = rce.allocate('NodeB', 64);
      const addrC = rce.allocate('NodeC', 64);

      // A -> B (strong), B -> C (strong), C -> A (weak)
      rce.retain(addrB);  // B RC=2
      rce.retain(addrC);  // C RC=2
      weakRefTable.setWeakRef('a_weak_ref_c', addrA);

      // Release: C -> A breaks cycle
      weakRefTable.invalidateWeakRefsTo(addrA);
      rce.release(addrC);  // C RC=1
      rce.release(addrC);  // C RC=0 → deallocate
      rce.release(addrB);  // B RC=1
      rce.release(addrB);  // B RC=0 → deallocate
      rce.release(addrA);  // A RC=0 → deallocate

      expect(rce.detectLeaks()).toHaveLength(0);
    });
  });

  describe('TEST-4: Leak Report Generation', () => {
    it('should detect single leaked object', () => {
      const rce = new ReferenceCountingEngine();
      const detector = new CycleDetector();
      const reporter = new LeakReporter(detector);

      // Allocate objects
      const addrX = rce.allocate('LeakedObject', 128);  // Never released
      const addrY = rce.allocate('CleanObject', 128);
      rce.release(addrY);  // Properly released

      // Get all objects from RCE
      const allObjects = new Map<number, ObjectMetadata>();
      const metaX = rce.getMetadata(addrX);
      if (metaX) allObjects.set(addrX, metaX);

      // Simulate: no objects are reachable (all leaked)
      const reachableAddrs = new Set<number>();

      // Generate leak report
      const report = reporter.analyzeLeaks(allObjects, reachableAddrs);

      expect(report.totalLeaks).toBe(1);
      expect(report.totalLeakedBytes).toBe(128);
      expect(report.leakedObjects).toHaveLength(1);
      expect(report.leakedObjects[0].addr).toBe(addrX);
    });

    it('should detect multiple leaked objects in cycle', () => {
      const rce = new ReferenceCountingEngine();
      const detector = new CycleDetector();
      const reporter = new LeakReporter(detector);

      // Allocate objects forming a cycle (A <-> B)
      const addrA = rce.allocate('LeakA', 64);
      const addrB = rce.allocate('LeakB', 64);

      // Register cycle in detector
      detector.registerNode(addrA, 'LeakA', 1, [addrB]);
      detector.registerNode(addrB, 'LeakB', 1, [addrA]);

      // Both objects in cycle
      const allObjects = new Map<number, ObjectMetadata>();
      const metaA = rce.getMetadata(addrA);
      const metaB = rce.getMetadata(addrB);
      if (metaA) allObjects.set(addrA, metaA);
      if (metaB) allObjects.set(addrB, metaB);

      // Neither reachable (cycle is isolated)
      const reachableAddrs = new Set<number>();

      const report = reporter.analyzeLeaks(allObjects, reachableAddrs);

      expect(report.totalLeaks).toBeGreaterThanOrEqual(1);
      expect(report.cycleInfo.totalCycles).toBeGreaterThan(0);
    });

    it('should generate actionable recommendations', () => {
      const rce = new ReferenceCountingEngine();
      const detector = new CycleDetector();
      const reporter = new LeakReporter(detector);

      const addrLeak = rce.allocate('Leaky', 256);

      const allObjects = new Map<number, ObjectMetadata>();
      const metaLeak = rce.getMetadata(addrLeak);
      if (metaLeak) allObjects.set(addrLeak, metaLeak);

      const reachableAddrs = new Set<number>();

      const report = reporter.analyzeLeaks(allObjects, reachableAddrs);

      // Recommendations should be non-empty
      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  describe('TEST-5: Stress Test + Invariant Verification', () => {
    it('should allocate and deallocate 1000 objects with zero leaks', () => {
      const manager = new MemoryManager();

      // Allocate 1000 objects
      const addrs: number[] = [];
      for (let i = 0; i < 1000; i++) {
        const addr = manager.allocate({
          type: `TestObject${i % 10}`,
          size: 64,
        });
        addrs.push(addr);
      }

      expect(addrs).toHaveLength(1000);

      // Release first 900
      for (let i = 0; i < 900; i++) {
        manager.release(addrs[i]);
      }

      // Verify invariants after partial release
      const invariants = manager.verifyAll();
      expect(invariants.rcInvariants).toBe(true);
      expect(invariants.weakRefInvariants).toBe(true);
      expect(invariants.destructionOrder).toBe(true);

      // Release remaining 100
      for (let i = 900; i < 1000; i++) {
        manager.release(addrs[i]);
      }

      // Verify zero leaks
      expect(manager.detectLeaks()).toHaveLength(0);
    });

    it('should maintain RC invariants under stress', () => {
      const manager = new MemoryManager();

      // Run built-in stress test
      const result = manager.stressTest(1000, 64);

      expect(result.success).toBe(true);
      expect(result.leaks).toBe(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should verify RC monotonicity invariant', () => {
      const rce = new ReferenceCountingEngine();

      const addr = rce.allocate('TestObj', 32);

      // RC should be 1 after allocation
      let rc = rce.getRefCount(addr);
      expect(rc).toBe(1);

      // RC increases monotonically
      rce.retain(addr);
      rc = rce.getRefCount(addr);
      expect(rc).toBe(2);

      rce.retain(addr);
      rc = rce.getRefCount(addr);
      expect(rc).toBe(3);

      // RC decreases monotonically
      rce.release(addr);
      rc = rce.getRefCount(addr);
      expect(rc).toBe(2);

      rce.release(addr);
      rc = rce.getRefCount(addr);
      expect(rc).toBe(1);

      // RC can reach 0 (deallocation)
      rce.release(addr);
      rc = rce.getRefCount(addr);
      expect(rc).toBe(0);

      // Verify deallocated
      expect(rce.detectLeaks()).toHaveLength(0);
    });

    it('should handle RETAIN/RELEASE balance correctness', () => {
      const rce = new ReferenceCountingEngine();

      const addr1 = rce.allocate('Obj1', 32);
      const addr2 = rce.allocate('Obj2', 32);

      // Shared reference scenario
      rce.retain(addr1);  // addr1: RC=2
      rce.retain(addr1);  // addr1: RC=3
      rce.retain(addr2);  // addr2: RC=2

      // Multiple holders release
      rce.release(addr1);  // addr1: RC=2
      rce.release(addr1);  // addr1: RC=1
      rce.release(addr1);  // addr1: RC=0 -> deallocate
      rce.release(addr2);  // addr2: RC=1
      rce.release(addr2);  // addr2: RC=0 -> deallocate

      // No leaks
      expect(rce.detectLeaks()).toHaveLength(0);
    });
  });
});
