/**
 * FreeLang v2 - Smart Pointers
 *
 * RAII Pattern (Resource Acquisition Is Initialization)
 * Automatic memory management through:
 * - UniquePtr: Exclusive ownership (non-copyable, movable)
 * - SharedPtr: Shared ownership (copyable, RC-based)
 * - WeakPtr: Non-owning reference (cycle-breaking)
 */

export interface PtrMetadata {
  id: number;              // Unique pointer ID
  addr: number;            // Object address
  type: string;            // Object type
  size: number;            // Object size
  createdAt: number;       // Creation timestamp
  lastModified?: number;   // Last modification
}

/**
 * UniquePtr - Exclusive Ownership
 * - Only one owner at a time
 * - Non-copyable: cannot create independent references
 * - Movable: can transfer ownership with move()
 * - On destruction: deallocate automatically
 *
 * Usage:
 *   let ptr1 = new UniquePtr(addr, metadata);
 *   let ptr2 = ptr1.move();  // ptr1 becomes invalid, ptr2 takes ownership
 *   // ptr2 destroyed → automatic deallocation
 */
export class UniquePtr {
  private addr: number;
  private metadata: PtrMetadata;
  private isValid: boolean;

  constructor(addr: number, metadata: PtrMetadata) {
    this.addr = addr;
    this.metadata = metadata;
    this.isValid = true;
  }

  /**
   * Get raw address (valid if not moved)
   */
  get(): number {
    if (!this.isValid) {
      throw new Error('[UNIQUE-PTR] Use after move');
    }
    return this.addr;
  }

  /**
   * Transfer ownership to new UniquePtr
   * This pointer becomes invalid
   */
  move(): UniquePtr {
    if (!this.isValid) {
      throw new Error('[UNIQUE-PTR] Move from invalid pointer');
    }

    const newPtr = new UniquePtr(this.addr, this.metadata);
    this.isValid = false; // Invalidate original
    return newPtr;
  }

  /**
   * Release ownership (manual cleanup)
   * Returns address and invalidates pointer
   */
  release(): number {
    if (!this.isValid) {
      throw new Error('[UNIQUE-PTR] Release from invalid pointer');
    }

    const addr = this.addr;
    this.isValid = false;
    return addr;
  }

  /**
   * Reset to point to new address
   * (Deallocates old address if applicable)
   */
  reset(addr: number, metadata: PtrMetadata): void {
    // Note: In real implementation, would call dealloc on old addr
    this.addr = addr;
    this.metadata = metadata;
    this.isValid = true;
  }

  /**
   * Check if valid (not moved)
   */
  isAlive(): boolean {
    return this.isValid;
  }

  /**
   * Destructor - called when garbage collected
   * Deallocates object if still owned
   */
  destroy(): void {
    if (this.isValid) {
      // Deallocate: in real impl, calls ReferenceCountingEngine.deallocate()
      this.isValid = false;
    }
  }
}

/**
 * SharedPtr - Shared Ownership with Reference Counting
 * - Multiple owners of same object
 * - Copyable: creates reference with RC++
 * - On destruction: RC--, deallocate if RC reaches 0
 * - Exception-safe: RAII guarantees cleanup
 *
 * Usage:
 *   let ptr1 = new SharedPtr(addr, metadata);
 *   let ptr2 = ptr1.copy();  // RC++ (shared ownership)
 *   // ptr1 destroyed → RC--, object survives
 *   // ptr2 destroyed → RC--, deallocate (RC=0)
 */
export class SharedPtr {
  private addr: number;
  private metadata: PtrMetadata;
  private rcEngine: Map<number, number>; // Simulated RC storage: Map<addr, refCount>

  private static globalRcEngine = new Map<number, number>();

  constructor(addr: number, metadata: PtrMetadata, rcEngine?: Map<number, number>) {
    this.addr = addr;
    this.metadata = metadata;
    this.rcEngine = rcEngine || SharedPtr.globalRcEngine;

    // Retain (RC++)
    const currentRC = this.rcEngine.get(addr) || 0;
    this.rcEngine.set(addr, currentRC + 1);
  }

  /**
   * Get global RC engine for use in WeakPtr
   */
  static getGlobalRcEngine(): Map<number, number> {
    return SharedPtr.globalRcEngine;
  }

  /**
   * Get raw address
   */
  get(): number {
    return this.addr;
  }

  /**
   * Copy pointer (shared ownership)
   * RC++ for both old and new ownership
   */
  copy(): SharedPtr {
    return new SharedPtr(this.addr, this.metadata, this.rcEngine);
  }

  /**
   * Get reference count
   */
  getRefCount(): number {
    return this.rcEngine.get(this.addr) || 0;
  }

  /**
   * Destructor - Release ownership
   * RC--, deallocate if RC reaches 0
   */
  destroy(): void {
    const currentRC = this.rcEngine.get(this.addr) || 1;
    const newRC = Math.max(0, currentRC - 1);

    if (newRC === 0) {
      // Deallocate: in real impl, calls dealloc
      this.rcEngine.delete(this.addr);
    } else {
      this.rcEngine.set(this.addr, newRC);
    }
  }

  /**
   * Check if only owner (RC = 1)
   */
  isUnique(): boolean {
    return this.getRefCount() === 1;
  }
}

/**
 * WeakPtr - Non-owning Reference
 * - Does NOT increment RC
 * - Automatically becomes NULL when target destroyed
 * - Used to break cycles (A ↔ B: A=Strong, B=Weak)
 * - Safe dereference: must check for NULL
 *
 * Usage:
 *   let strongPtr = new SharedPtr(addr, metadata);
 *   let weakPtr = new WeakPtr(addr);
 *   // strongPtr destroyed → RC--, but WeakPtr still exists
 *   // Accessing weakPtr returns NULL (auto-invalidated)
 */
export class WeakPtr {
  private addr: number;
  private metadata: PtrMetadata;
  private isAlive: boolean;
  private rcEngine: Map<number, number>;

  private static NULL_PTR = 0xDEADBEEF;

  constructor(addr: number, metadata: PtrMetadata, rcEngine?: Map<number, number>) {
    this.addr = addr;
    this.metadata = metadata;
    this.isAlive = true;
    this.rcEngine = rcEngine || SharedPtr.getGlobalRcEngine();

    // NOTE: No RC increment (non-owning)
  }

  /**
   * Dereference weak pointer
   * Returns address if target alive, NULL (0xDEADBEEF) if invalidated
   *
   * Caller must check:
   *   const addr = weakPtr.lock();
   *   if (addr !== WeakPtr.NULL) {
   *     use(addr);
   *   }
   */
  lock(): number {
    if (!this.isAlive) {
      return WeakPtr.NULL_PTR; // NULL marker
    }

    // Check if target still exists (RC > 0)
    const rc = this.rcEngine.get(this.addr) || 0;
    if (rc === 0) {
      // Target deallocated
      this.isAlive = false;
      return WeakPtr.NULL_PTR;
    }

    return this.addr;
  }

  /**
   * Auto-invalidation when target destroyed
   * Called by SharedPtr.destroy() when RC reaches 0
   */
  invalidate(): void {
    this.isAlive = false;
  }

  /**
   * Check if target is still alive
   */
  isExpired(): boolean {
    if (!this.isAlive) {
      return true;
    }

    const rc = this.rcEngine.get(this.addr) || 0;
    return rc === 0;
  }

  /**
   * Get metadata (for debugging)
   */
  getMetadata(): PtrMetadata {
    return this.metadata;
  }
}

/**
 * Smart Pointer Container - Manages collection of smart ptrs
 * Ensures RAII semantics for collections
 */
export class SmartPtrContainer {
  private uniquePtrs: UniquePtr[] = [];
  private sharedPtrs: SharedPtr[] = [];
  private weakPtrs: WeakPtr[] = [];

  /**
   * Add unique pointer to container
   */
  addUnique(ptr: UniquePtr): void {
    this.uniquePtrs.push(ptr);
  }

  /**
   * Add shared pointer to container
   */
  addShared(ptr: SharedPtr): void {
    this.sharedPtrs.push(ptr);
  }

  /**
   * Add weak pointer to container
   */
  addWeak(ptr: WeakPtr): void {
    this.weakPtrs.push(ptr);
  }

  /**
   * Clear all pointers (triggers destructors)
   */
  clear(): void {
    // Destroy in reverse order (LIFO)
    for (let i = this.weakPtrs.length - 1; i >= 0; i--) {
      this.weakPtrs[i].invalidate();
    }
    for (let i = this.sharedPtrs.length - 1; i >= 0; i--) {
      this.sharedPtrs[i].destroy();
    }
    for (let i = this.uniquePtrs.length - 1; i >= 0; i--) {
      this.uniquePtrs[i].destroy();
    }

    this.uniquePtrs = [];
    this.sharedPtrs = [];
    this.weakPtrs = [];
  }

  /**
   * Statistics
   */
  getStats() {
    return {
      uniquePtrs: this.uniquePtrs.length,
      sharedPtrs: this.sharedPtrs.length,
      weakPtrs: this.weakPtrs.length,
      totalPtrs: this.uniquePtrs.length + this.sharedPtrs.length + this.weakPtrs.length,
    };
  }
}

/**
 * Smart Pointer Factory
 * Simplifies pointer creation with metadata
 */
export class SmartPtrFactory {
  private nextId = 1000;

  /**
   * Create UniquePtr with auto-generated metadata
   */
  createUnique(addr: number, type: string, size: number): UniquePtr {
    const metadata: PtrMetadata = {
      id: this.nextId++,
      addr,
      type,
      size,
      createdAt: Date.now(),
    };
    return new UniquePtr(addr, metadata);
  }

  /**
   * Create SharedPtr with auto-generated metadata
   */
  createShared(
    addr: number,
    type: string,
    size: number,
    rcEngine?: Map<number, number>
  ): SharedPtr {
    const metadata: PtrMetadata = {
      id: this.nextId++,
      addr,
      type,
      size,
      createdAt: Date.now(),
    };
    return new SharedPtr(addr, metadata, rcEngine);
  }

  /**
   * Create WeakPtr from SharedPtr
   */
  createWeak(sharedPtr: SharedPtr, type: string): WeakPtr {
    const metadata: PtrMetadata = {
      id: this.nextId++,
      addr: sharedPtr.get(),
      type,
      size: 0,
      createdAt: Date.now(),
    };
    return new WeakPtr(sharedPtr.get(), metadata);
  }
}
