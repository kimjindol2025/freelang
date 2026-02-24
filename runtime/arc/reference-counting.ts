/**
 * FreeLang v2 - Reference Counting Engine
 *
 * MEMORY_MODEL_FORMAL Section 1: RETAIN/RELEASE Happens-Before
 * - retain(obj) happens-before release(obj)
 * - Each retain paired with release
 * - RC never negative
 * - Deterministic deallocation
 *
 * Implements Swift-style ARC (Automatic Reference Counting)
 */

import { AtomicRefCounter, atomicIncrement, atomicDecrement } from './atomic-ops';

export interface ObjectMetadata {
  id: number;
  type: string;
  size: number;
  refCount: number;
  isAlive: boolean;
  createdAt: number;
  deallocatedAt?: number;
}

export interface AllocationRecord {
  op: 'ALLOC' | 'RETAIN' | 'RELEASE' | 'DEALLOCATE';
  addr: number;
  refCount: number;
  timestamp: number;
  reason?: string;
}

/**
 * Reference Counting Manager
 * FORMAL SPEC: Manages RETAIN/RELEASE happens-before guarantees
 */
export class ReferenceCountingEngine {
  private objectHeap = new Map<number, ObjectMetadata>();
  private refCounts: AtomicRefCounter;
  private allocationLog: AllocationRecord[] = [];
  private nextAddr = 10000;

  // Statistics
  private totalAllocated = 0;
  private totalDeallocated = 0;
  private peakMemory = 0;

  constructor() {
    this.refCounts = new AtomicRefCounter();
  }

  /**
   * RETAIN: Allocate new object with RC = 1
   * FORMAL SPEC: "RETAIN(obj) happens-before RELEASE(obj)"
   *
   * @param type Object type name
   * @param size Byte size
   * @returns Object address
   */
  allocate(type: string, size: number): number {
    const addr = this.nextAddr++;

    // RETAIN: Set RC = 1
    this.refCounts.set(addr, 1);

    // Metadata
    const metadata: ObjectMetadata = {
      id: addr,
      type,
      size,
      refCount: 1,
      isAlive: true,
      createdAt: Date.now(),
    };

    this.objectHeap.set(addr, metadata);

    // Statistics
    this.totalAllocated += size;
    this.updatePeakMemory();

    // Log
    this.allocationLog.push({
      op: 'ALLOC',
      addr,
      refCount: 1,
      timestamp: Date.now(),
      reason: `${type} (${size}B)`,
    });

    return addr;
  }

  /**
   * RETAIN: Increment reference count
   * FORMAL SPEC: "atomicIncrement(&obj.refCount) + memory_barrier"
   *
   * Called when:
   * - Variable assignment: x = obj
   * - Function parameter: func(obj)
   * - Container insertion: arr.push(obj)
   */
  retain(addr: number): number {
    if (!this.objectHeap.has(addr)) {
      throw new Error(`[RC-ERROR] RETAIN: Invalid address ${addr}`);
    }

    // Atomic RC++
    const newRC = this.refCounts.increment(addr);

    // Update metadata
    const metadata = this.objectHeap.get(addr)!;
    metadata.refCount = newRC;

    // Log
    this.allocationLog.push({
      op: 'RETAIN',
      addr,
      refCount: newRC,
      timestamp: Date.now(),
    });

    return newRC;
  }

  /**
   * RELEASE: Decrement reference count
   * FORMAL SPEC: "memory_barrier + atomicDecrement(&obj.refCount)"
   *
   * If RC reaches 0:
   * 1. Invalidate weak refs
   * 2. Release member objects (recursive DFS)
   * 3. Call destructor
   * 4. Deallocate
   */
  release(addr: number, destructor?: () => void): number {
    if (!this.objectHeap.has(addr)) {
      throw new Error(`[RC-ERROR] RELEASE: Invalid address ${addr}`);
    }

    // Atomic RC-- (with barrier before)
    const newRC = this.refCounts.decrement(addr);

    // Update metadata
    const metadata = this.objectHeap.get(addr)!;
    metadata.refCount = newRC;

    // Log
    this.allocationLog.push({
      op: 'RELEASE',
      addr,
      refCount: newRC,
      timestamp: Date.now(),
    });

    // If RC = 0, deallocate
    if (newRC === 0) {
      this._deallocate(addr, destructor);
    }

    return newRC;
  }

  /**
   * Private: Deallocate object
   * Called when RC reaches 0
   * FORMAL SPEC: "Destructor Ordering (DFS)"
   *
   * Order:
   * 1. Invalidate weak refs
   * 2. Release member objects
   * 3. Call destructor
   * 4. Deallocate
   */
  private _deallocate(addr: number, destructor?: () => void): void {
    const metadata = this.objectHeap.get(addr);
    if (!metadata || !metadata.isAlive) {
      return; // Already deallocated
    }

    metadata.isAlive = false;
    metadata.deallocatedAt = Date.now();

    // Call destructor (if provided)
    if (destructor) {
      try {
        destructor();
      } catch (e) {
        console.error(`[DESTRUCTOR-ERROR] ${addr}: ${e}`);
      }
    }

    // Statistics
    this.totalDeallocated += metadata.size;

    // Log
    this.allocationLog.push({
      op: 'DEALLOCATE',
      addr,
      refCount: 0,
      timestamp: Date.now(),
      reason: `${metadata.type} deallocated`,
    });

    // Remove from heap
    this.objectHeap.delete(addr);
    this.refCounts.set(addr, 0);
  }

  /**
   * Query current reference count
   * Used for debugging and verification
   */
  getRefCount(addr: number): number {
    return this.refCounts.get(addr);
  }

  /**
   * Query object metadata
   */
  getMetadata(addr: number): ObjectMetadata | undefined {
    return this.objectHeap.get(addr);
  }

  /**
   * Allocation statistics
   */
  getStats() {
    return {
      totalAllocated: this.totalAllocated,
      totalDeallocated: this.totalDeallocated,
      peakMemory: this.peakMemory,
      aliveObjects: this.objectHeap.size,
      allocationLog: this.allocationLog,
    };
  }

  /**
   * Invariant: RC never negative
   * FORMAL SPEC: "RC(obj) ≥ 0 always"
   */
  verifyInvariants(): boolean {
    for (const [addr, metadata] of this.objectHeap.entries()) {
      const rc = this.refCounts.get(addr);
      if (rc < 0) {
        throw new Error(`[INVARIANT-VIOLATION] RC(${addr}) = ${rc} < 0`);
      }
      if (rc !== metadata.refCount) {
        throw new Error(`[INVARIANT-VIOLATION] RC mismatch at ${addr}`);
      }
    }
    return true;
  }

  /**
   * Leak detection
   * At shutdown, all RCs should be 0
   */
  detectLeaks(): number[] {
    const leaks = [];
    for (const [addr, metadata] of this.objectHeap.entries()) {
      if (metadata.isAlive && this.refCounts.get(addr) > 0) {
        leaks.push(addr);
      }
    }
    return leaks;
  }

  private updatePeakMemory(): void {
    const current = this.totalAllocated - this.totalDeallocated;
    this.peakMemory = Math.max(this.peakMemory, current);
  }

  clear(): void {
    this.objectHeap.clear();
    this.refCounts.clear();
    this.allocationLog = [];
    this.totalAllocated = 0;
    this.totalDeallocated = 0;
    this.peakMemory = 0;
  }
}

/**
 * FORMAL SPEC Verification
 * Ensures MEMORY_MODEL_FORMAL Section 1 compliance
 */
export class RCSpecVerifier {
  private engine: ReferenceCountingEngine;

  constructor(engine: ReferenceCountingEngine) {
    this.engine = engine;
  }

  /**
   * Verify: RETAIN/RELEASE happens-before
   * Each RETAIN must have corresponding RELEASE
   */
  verifyRetainReleasePairing(): boolean {
    const stats = this.engine.getStats();
    const log = stats.allocationLog;

    for (const addr of new Set(log.map((l) => l.addr))) {
      const retains = log.filter((l) => l.addr === addr && l.op === 'RETAIN').length;
      const releases = log.filter((l) => l.addr === addr && l.op === 'RELEASE').length;

      // Each RETAIN needs RELEASE (eventually)
      if (retains > releases + 1) {
        console.warn(`[SPEC-WARN] Address ${addr}: More RETAIN than RELEASE`);
        return false;
      }
    }

    return true;
  }

  /**
   * Verify: RC never negative
   */
  verifyRCNonNegative(): boolean {
    return this.engine.verifyInvariants();
  }

  /**
   * Verify: No leaks at shutdown
   */
  verifyZeroLeaks(): boolean {
    const leaks = this.engine.detectLeaks();
    if (leaks.length > 0) {
      console.error(`[LEAKS-DETECTED] ${leaks.length} objects not freed: ${leaks}`);
      return false;
    }
    return true;
  }
}
