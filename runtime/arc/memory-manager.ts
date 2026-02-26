/**
 * FreeLang v2 - Memory Manager
 *
 * Unified memory management system integrating:
 * 1. Atomic Reference Counting (atomic-ops.ts)
 * 2. Reference Counting Engine (reference-counting.ts)
 * 3. Weak Reference Table (weak-ref-table.ts)
 * 4. Object Lifecycle (object-lifecycle.ts)
 * 5. Smart Pointers (smart-pointers.ts)
 *
 * Provides:
 * - High-level allocation/deallocation API
 * - Memory statistics and profiling
 * - Leak detection and reporting
 * - Exception safety guarantees
 */

import { ReferenceCountingEngine, ObjectMetadata } from './reference-counting';
import { WeakRefTable } from './weak-ref-table';
import { ObjectLifecycleManager, MemberField } from './object-lifecycle';
import { SmartPtrFactory } from './smart-pointers';

export interface AllocationRequest {
  type: string;
  size: number;
  members?: MemberField[];
  destructor?: () => void;
}

export interface MemoryStats {
  totalAllocated: number;
  totalDeallocated: number;
  currentUsage: number;
  peakUsage: number;
  aliveObjects: number;
  totalAllocations: number;
  totalDeallocations: number;
  averageLifetime: number; // milliseconds
  leakedBytes: number;
  leakedObjects: string[]; // Type names of leaked objects
}

export interface AllocationRecord {
  addr: number;
  type: string;
  size: number;
  allocatedAt: number;
  deallocatedAt?: number;
  lifetime?: number; // milliseconds
  isLeaked?: boolean;
}

/**
 * Memory Manager
 * Unified interface for all memory management operations
 */
export class MemoryManager {
  private rcEngine: ReferenceCountingEngine;
  private weakRefTable: WeakRefTable;
  private lifecycleManager: ObjectLifecycleManager;
  private smartPtrFactory: SmartPtrFactory;

  // Memory tracking
  private allocationRecords = new Map<number, AllocationRecord>();
  private currentMemoryUsage = 0;
  private peakMemoryUsage = 0;
  private totalBytesAllocated = 0;
  private totalBytesDeallocated = 0;

  // Configuration
  private enableProfiling = true;

  constructor() {
    this.rcEngine = new ReferenceCountingEngine();
    this.weakRefTable = new WeakRefTable();
    this.lifecycleManager = new ObjectLifecycleManager(
      this.rcEngine,
      this.weakRefTable
    );
    this.smartPtrFactory = new SmartPtrFactory();
  }

  /**
   * Allocate new object with automatic management
   *
   * @param request Allocation request (type, size, members, destructor)
   * @returns Object address
   */
  allocate(request: AllocationRequest): number {
    // Phase 1: RC engine allocation (RC = 1)
    const addr = this.rcEngine.allocate(request.type, request.size);

    // Phase 2: Register members (lifecycle management)
    if (request.members) {
      this.lifecycleManager.registerObjectMembers(addr, request.members);
    }

    // Phase 3: Track allocation
    if (this.enableProfiling) {
      const record: AllocationRecord = {
        addr,
        type: request.type,
        size: request.size,
        allocatedAt: Date.now(),
      };
      this.allocationRecords.set(addr, record);
      this.currentMemoryUsage += request.size;
      this.totalBytesAllocated += request.size;

      // Update peak
      if (this.currentMemoryUsage > this.peakMemoryUsage) {
        this.peakMemoryUsage = this.currentMemoryUsage;
      }
    }

    return addr;
  }

  /**
   * Retain (RC++)
   * Called when:
   * - Variable assignment: x = obj
   * - Function parameter: func(obj)
   * - Container insertion: arr.push(obj)
   */
  retain(addr: number): number {
    return this.rcEngine.retain(addr);
  }

  /**
   * Release (RC--)
   * If RC reaches 0, triggers full destruction:
   * 1. Release all member objects (DFS)
   * 2. Invalidate weak refs
   * 3. Call destructor
   * 4. Deallocate
   */
  release(addr: number, destructor?: () => void): number {
    const newRC = this.rcEngine.release(addr, destructor);

    // Track deallocation
    if (newRC === 0 && this.enableProfiling) {
      const record = this.allocationRecords.get(addr);
      if (record) {
        record.deallocatedAt = Date.now();
        record.lifetime = record.deallocatedAt - record.allocatedAt;
        this.currentMemoryUsage -= record.size;
        this.totalBytesDeallocated += record.size;
      }
    }

    return newRC;
  }

  /**
   * Create weak reference (non-owning)
   * RC unchanged
   *
   * Used for cycle breaking:
   *   Parent has strong ref to Child
   *   Child has weak ref to Parent (breaks cycle)
   */
  setWeakRef(varName: string, targetAddr: number): boolean {
    return this.weakRefTable.setWeakRef(varName, targetAddr);
  }

  /**
   * Dereference weak reference (with NULL safety)
   * Returns NULL marker if target destroyed
   */
  dereferenceWeakRef(varName: string): number {
    return this.weakRefTable.dereferenceWeakRef(varName);
  }

  /**
   * Get current reference count
   */
  getRefCount(addr: number): number {
    return this.rcEngine.getRefCount(addr);
  }

  /**
   * Get object metadata
   */
  getMetadata(addr: number): ObjectMetadata | undefined {
    return this.rcEngine.getMetadata(addr);
  }

  /**
   * Verify memory invariants
   * MEMORY_MODEL_FORMAL Section 1: RC never negative
   */
  verifyInvariants(): boolean {
    return this.rcEngine.verifyInvariants();
  }

  /**
   * Detect memory leaks
   * Returns array of leaked object addresses
   */
  detectLeaks(): number[] {
    return this.rcEngine.detectLeaks();
  }

  /**
   * Comprehensive memory statistics
   */
  getStats(): MemoryStats {
    const leaks = this.detectLeaks();
    let leakedBytes = 0;
    const leakedTypes: string[] = [];

    for (const addr of leaks) {
      const metadata = this.rcEngine.getMetadata(addr);
      if (metadata) {
        leakedBytes += metadata.size;
        if (!leakedTypes.includes(metadata.type)) {
          leakedTypes.push(metadata.type);
        }
      }
    }

    // Calculate average lifetime
    let totalLifetime = 0;
    let count = 0;
    for (const record of this.allocationRecords.values()) {
      if (record.lifetime) {
        totalLifetime += record.lifetime;
        count++;
      }
    }
    const averageLifetime = count > 0 ? totalLifetime / count : 0;

    return {
      totalAllocated: this.totalBytesAllocated,
      totalDeallocated: this.totalBytesDeallocated,
      currentUsage: this.currentMemoryUsage,
      peakUsage: this.peakMemoryUsage,
      aliveObjects: this.rcEngine.getStats().aliveObjects,
      totalAllocations: this.allocationRecords.size,
      totalDeallocations: Array.from(this.allocationRecords.values()).filter(
        (r) => r.deallocatedAt
      ).length,
      averageLifetime,
      leakedBytes,
      leakedObjects: leakedTypes,
    };
  }

  /**
   * Generate comprehensive memory report
   */
  generateReport(): string {
    const stats = this.getStats();
    const leaks = this.detectLeaks();

    const report = [
      '═══════════════════════════════════════',
      'FreeLang v2 Memory Management Report',
      '═══════════════════════════════════════',
      '',
      '📊 Memory Usage:',
      `  Total Allocated:    ${stats.totalAllocated} bytes`,
      `  Total Deallocated:  ${stats.totalDeallocated} bytes`,
      `  Current Usage:      ${stats.currentUsage} bytes`,
      `  Peak Usage:         ${stats.peakUsage} bytes`,
      `  Efficiency:         ${((stats.totalDeallocated / stats.totalAllocated) * 100).toFixed(2)}%`,
      '',
      '📈 Object Statistics:',
      `  Alive Objects:      ${stats.aliveObjects}`,
      `  Total Allocations:  ${stats.totalAllocations}`,
      `  Total Deallocations: ${stats.totalDeallocations}`,
      `  Average Lifetime:   ${stats.averageLifetime.toFixed(2)} ms`,
      '',
      '⚠️  Leak Detection:',
      `  Leaked Bytes:       ${stats.leakedBytes} bytes`,
      `  Leaked Objects:     ${leaks.length}`,
      `  Leaked Types:       ${stats.leakedObjects.join(', ') || 'None'}`,
      '',
    ];

    if (leaks.length > 0) {
      report.push('🔴 Leaked Objects:');
      for (const addr of leaks) {
        const metadata = this.rcEngine.getMetadata(addr);
        if (metadata) {
          report.push(`  - ${metadata.type} @ ${addr} (${metadata.size}B, RC=${metadata.refCount})`);
        }
      }
      report.push('');
    }

    report.push('═══════════════════════════════════════');

    return report.join('\n');
  }

  /**
   * Stress test: allocate/deallocate large number of objects
   *
   * @param count Number of allocations
   * @param size Size of each allocation
   * @returns Test results
   */
  stressTest(count: number, size: number): {
    duration: number;
    success: boolean;
    leaks: number;
  } {
    const startTime = Date.now();

    try {
      const addrs: number[] = [];

      // Allocate
      for (let i = 0; i < count; i++) {
        const addr = this.allocate({
          type: `StressTest_${i % 10}`,
          size,
        });
        addrs.push(addr);
      }

      // Deallocate
      for (const addr of addrs) {
        this.release(addr);
      }

      const duration = Date.now() - startTime;
      const leaks = this.detectLeaks().length;

      return {
        duration,
        success: leaks === 0,
        leaks,
      };
    } catch (error) {
      console.error('[STRESS-TEST] Error:', error);
      return {
        duration: Date.now() - startTime,
        success: false,
        leaks: -1,
      };
    }
  }

  /**
   * Verify all systems
   * Runs all invariant checks
   */
  verifyAll(): {
    rcInvariants: boolean;
    weakRefInvariants: boolean;
    destructionOrder: boolean;
    leaksDetected: number;
  } {
    return {
      rcInvariants: this.rcEngine.verifyInvariants(),
      weakRefInvariants: this.weakRefTable.verifyWeakRefInvariants(),
      destructionOrder: this.lifecycleManager.verifyDestructionOrder(),
      leaksDetected: this.detectLeaks().length,
    };
  }

  /**
   * Clean shutdown
   * Deallocate all remaining objects
   */
  shutdown(): void {
    console.log('[MEMORY-MGR] Initiating shutdown...');

    // Report leaks before shutdown
    const leaks = this.detectLeaks();
    if (leaks.length > 0) {
      console.warn(`[MEMORY-MGR] ⚠️  ${leaks.length} leaks detected before shutdown`);
    }

    // Clear all components
    this.rcEngine.clear();
    this.weakRefTable.clear();
    this.lifecycleManager.clear();
    this.allocationRecords.clear();
    this.currentMemoryUsage = 0;

    console.log('[MEMORY-MGR] Shutdown complete');
  }

  /**
   * Dump all state (debugging)
   */
  dump(): void {
    console.log(this.generateReport());
    this.weakRefTable.dumpWeakRefs();
    this.lifecycleManager.dumpDestructionLog();
  }

  /**
   * Enable/disable profiling
   */
  setProfiling(enabled: boolean): void {
    this.enableProfiling = enabled;
  }


  /**
   * Get internal engines (for advanced usage)
   */
  getEngines() {
    return {
      rcEngine: this.rcEngine,
      weakRefTable: this.weakRefTable,
      lifecycleManager: this.lifecycleManager,
      smartPtrFactory: this.smartPtrFactory,
    };
  }
}

/**
 * Memory Manager Singleton
 * Global instance for simplified API
 */
let globalMemoryManager: MemoryManager | null = null;

export function getMemoryManager(): MemoryManager {
  if (!globalMemoryManager) {
    globalMemoryManager = new MemoryManager();
  }
  return globalMemoryManager;
}

export function resetMemoryManager(): void {
  if (globalMemoryManager) {
    globalMemoryManager.shutdown();
  }
  globalMemoryManager = null;
}

/**
 * Helper functions (global API)
 */
export function allocate(type: string, size: number): number {
  return getMemoryManager().allocate({ type, size });
}

export function retain(addr: number): number {
  return getMemoryManager().retain(addr);
}

export function release(addr: number): number {
  return getMemoryManager().release(addr);
}

export function getRefCount(addr: number): number {
  return getMemoryManager().getRefCount(addr);
}

export function setWeakRef(varName: string, targetAddr: number): boolean {
  return getMemoryManager().setWeakRef(varName, targetAddr);
}

export function dereferenceWeakRef(varName: string): number {
  return getMemoryManager().dereferenceWeakRef(varName);
}

export function detectLeaks(): number[] {
  return getMemoryManager().detectLeaks();
}

export function getStats(): MemoryStats {
  return getMemoryManager().getStats();
}

export function generateReport(): string {
  return getMemoryManager().generateReport();
}
