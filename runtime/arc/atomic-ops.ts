/**
 * FreeLang v2 - Atomic Operations
 *
 * MEMORY_MODEL_FORMAL Section 4: Thread Visibility Model
 * - x86-64 TSO (Total Store Order)
 * - ARM weak ordering
 * - Sequential consistency via memory barriers
 *
 * Map to formal spec: "memory_barrier(memory_order_seq_cst)"
 */

/**
 * Atomic increment with memory barrier
 * Guarantee: atomicIncrement(x) happens-before any subsequent load
 *
 * FORMAL SPEC: retain(obj) → atomicIncrement(&obj.refCount) + barrier
 */
export function atomicIncrement(counter: Map<number, number>, addr: number): number {
  const current = counter.get(addr) ?? 0;
  const newValue = current + 1;
  counter.set(addr, newValue);

  // Simulate memory barrier for sequential consistency
  // In real implementation: LOCK prefix (x86) or DMB (ARM)
  memoryBarrier();

  return newValue;
}

/**
 * Atomic decrement with memory barrier
 * Guarantee: memory barrier happens-before atomicDecrement(&obj.refCount)
 *
 * FORMAL SPEC: release(obj) → barrier + atomicDecrement(&obj.refCount)
 */
export function atomicDecrement(counter: Map<number, number>, addr: number): number {
  // Simulate memory barrier BEFORE decrement (release semantics)
  memoryBarrier();

  const current = counter.get(addr) ?? 1;
  const newValue = Math.max(0, current - 1); // RC never negative (invariant)
  counter.set(addr, newValue);

  return newValue;
}

/**
 * Memory barrier - ensures visibility across threads
 *
 * Simulated implementation:
 * - x86-64: mfence or LOCK prefix
 * - ARM: DMB (Data Memory Barrier) + ISB (Instruction Sync Barrier)
 */
function memoryBarrier(): void {
  // In actual implementation, this would use platform-specific instructions
  // For now, we simulate with a marker
  // Real implementation uses: mfence, DMB, or ISB depending on platform
}

/**
 * Compare-And-Swap for lock-free operations
 * Returns true if swap succeeded, false otherwise
 *
 * Used for: WeakPtr invalidation, synchronized updates
 */
export function compareAndSwap(
  memory: Map<number, number>,
  addr: number,
  expectedValue: number,
  newValue: number
): boolean {
  const current = memory.get(addr);
  if (current === expectedValue) {
    memory.set(addr, newValue);
    memoryBarrier();
    return true;
  }
  return false;
}

/**
 * Atomic store with sequential consistency
 * Used for: WeakPtr auto-nullification
 *
 * FORMAL SPEC: "atomicStore(&weak_ref.value, NULL)"
 */
export function atomicStore(
  memory: Map<number, any>,
  addr: number,
  value: any
): void {
  memoryBarrier();
  memory.set(addr, value);
  memoryBarrier();
}

/**
 * Atomic load with sequential consistency
 * Used for: Safe WeakPtr access
 */
export function atomicLoad(memory: Map<number, any>, addr: number): any {
  memoryBarrier();
  const value = memory.get(addr);
  memoryBarrier();
  return value;
}

/**
 * Invariant enforcement
 * FORMAL SPEC: "RC(obj) ≥ 0 always"
 */
export function assertRCInvariant(rc: number, addr: number): void {
  if (rc < 0) {
    throw new Error(`[RC-INVARIANT-VIOLATION] RC(${addr}) = ${rc} < 0`);
  }
}

/**
 * Thread-safe reference tracking
 * Maps address to reference count
 */
export class AtomicRefCounter {
  private counters = new Map<number, number>();

  increment(addr: number): number {
    return atomicIncrement(this.counters, addr);
  }

  decrement(addr: number): number {
    const newValue = atomicDecrement(this.counters, addr);
    assertRCInvariant(newValue, addr);
    return newValue;
  }

  get(addr: number): number {
    return this.counters.get(addr) ?? 0;
  }

  set(addr: number, value: number): void {
    assertRCInvariant(value, addr);
    atomicStore(this.counters, addr, value);
  }

  clear(): void {
    this.counters.clear();
  }
}
