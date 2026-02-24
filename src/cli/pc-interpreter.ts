/**
 * PC (Program Counter) 기반 Interpreter - v3.1
 *
 * while 루프의 "되돌아가는 행동" 구현
 * - PC: 현재 실행 중인 statement의 인덱스
 * - Loop Head: WHILE 시작 위치 저장
 * - Loop Tail: 닫는 괄호 탐색 및 워프
 */

// v3.7: Safety Guard 상수
const MAX_SAFE_ITERATION = 1_000_000; // 최대 안전 반복 횟수
const ITERATION_WARNING_THRESHOLD = 500_000; // 경고 임계값

export interface ASTNode {
  type: string;
  [key: string]: any;
}

/**
 * v5.9.6: PoolBucket — 고정 크기 메모리 풀
 * Slab Allocation 기반의 소형 객체 고속 할당
 */
class PoolBucket {
  size: number;
  bucketId: number;
  freeList: number[] = [];
  allocatedCount: number = 0;
  totalCapacity: number;

  constructor(size: number, bucketId: number, capacity: number) {
    this.size = size;
    this.bucketId = bucketId;
    this.totalCapacity = capacity;
    this.initializePool();
  }

  private initializePool(): void {
    const baseAddr = 0xC000 + this.bucketId * 0x100000;
    for (let i = 0; i < this.totalCapacity; i++) {
      const addr = baseAddr + (i * this.size);
      this.freeList.push(addr);
    }
  }

  allocate(): number {
    if (this.freeList.length === 0) {
      throw new Error(`[POOL ERROR] ${this.size}-byte pool 고갈`);
    }
    this.allocatedCount++;
    return this.freeList.pop()!;  // O(1)
  }

  deallocate(address: number): void {
    this.allocatedCount--;
    this.freeList.push(address);
  }

  getUtilization(): number {
    return (this.allocatedCount / this.totalCapacity) * 100;
  }
}

/**
 * v5.9.6: SmallObjectAllocator — 소형 객체 전용 할당기
 * 8, 16, 32바이트 풀을 관리하여 O(1) 할당
 */
class SmallObjectAllocator {
  pools: Map<number, PoolBucket> = new Map();
  POOL_SIZES = [8, 16, 32];
  BUCKET_CAPACITY = 1024;
  log: (msg: string) => void;

  constructor(log: (msg: string) => void) {
    this.log = log;
    this.pools.set(8, new PoolBucket(8, 0, this.BUCKET_CAPACITY));
    this.pools.set(16, new PoolBucket(16, 1, this.BUCKET_CAPACITY));
    this.pools.set(32, new PoolBucket(32, 2, this.BUCKET_CAPACITY));
  }

  canAllocate(size: number): boolean {
    return this.POOL_SIZES.includes(size);
  }

  allocate(size: number): number {
    const bucket = this.pools.get(size);
    if (!bucket) throw new Error(`[POOL ERROR] ${size}-byte pool 없음`);

    const address = bucket.allocate();
    this.log(`[POOL ALLOC] ${size}-byte pool, addr=0x${address.toString(16)}, util=${bucket.getUtilization().toFixed(1)}%`);
    return address;
  }

  deallocate(size: number, address: number): void {
    const bucket = this.pools.get(size);
    if (!bucket) throw new Error(`[POOL ERROR] ${size}-byte pool 없음`);

    bucket.deallocate(address);
    this.log(`[POOL FREE] ${size}-byte pool, addr=0x${address.toString(16)}, util=${bucket.getUtilization().toFixed(1)}%`);
  }

  getStats(): { size: number; allocated: number; utilization: number }[] {
    return Array.from(this.pools.values()).map(b => ({
      size: b.size,
      allocated: b.allocatedCount,
      utilization: b.getUtilization()
    }));
  }

  isPoolAddress(address: number): boolean {
    return address >= 0xC000 && address < 0xC300000;
  }

  getPoolSizeForAddress(address: number): number {
    if (address >= 0xC000 && address < 0xC100000) return 8;
    if (address >= 0xC100000 && address < 0xC200000) return 16;
    if (address >= 0xC200000 && address < 0xC300000) return 32;
    throw new Error(`[POOL ERROR] 풀 주소 범위 초과: 0x${address.toString(16)}`);
  }
}

/**
 * v5.9.5: HeapAllocator — 동적 메모리 할당 관리자
 * Best-Fit 알고리즘 + Coalescing + Leak Guard
 * 메모리 누수 추적, Double-Free 감지, Use-After-Free 보호
 */

interface BlockMetadata {
  blockId: number;
  address: number;
  size: number;
  timestamp: number;
  lineNumber: number;
  status: 'ALLOCATED' | 'FREED' | 'DOUBLE_FREE_DETECTED' | 'ZAPPED';
  freed_timestamp?: number;
  // ── v5.9.7: Canary (매직 넘버) ──────────────────────────────────
  canary_front: number;  // 블록 앞 경계 매직 넘버 (0xDEADBEEF)
  canary_back: number;   // 블록 뒤 경계 매직 넘버 (0xCAFEBABE)
  // ─────────────────────────────────────────────────────────────────
  // ── v5.9.8: Zapping (Tombstone) ──────────────────────────────────
  is_zapped: boolean;    // 메모리가 0xDEADBEEF로 채워졌는지 표시
  zapped_timestamp?: number;
  // ─────────────────────────────────────────────────────────────────
}

class HeapAllocator {
  private freeBlocks: Map<number, number> = new Map();  // address → size (가용 블록)
  private allocatedBlocks: Map<number, number> = new Map();  // address → size (사용 중 블록)
  private heapMemory: Map<number, any> = new Map();  // 절대 주소 → 값
  private nextFreeAddress: number = 0x8000;  // 힙 시작 주소
  private log: (msg: string) => void;  // 로깅 콜백
  private readonly MIN_BLOCK_SIZE: number = 4;  // v5.9.4: 최소 블록 크기
  private readonly FRAGMENTATION_THRESHOLD: number = 0.3;  // v5.9.4: 30% 이상 시 경고

  // ── v5.9.5: Leak Guard ───────────────────────────────────────────────────
  private blockMetadata: Map<number, BlockMetadata> = new Map();  // blockId → metadata
  private blockIdCounter: number = 1;
  private addressToBlockId: Map<number, number> = new Map();  // address → blockId
  // ──────────────────────────────────────────────────────────────────────────

  // ── v5.9.6: Fast Pool Strategy ────────────────────────────────────────────
  private smallObjectAllocator: SmallObjectAllocator;
  // ──────────────────────────────────────────────────────────────────────────

  // ── v5.9.7: Chaos Stress Test & Heap Destruction Defense ─────────────────
  private readonly CANARY_FRONT: number = 0xDEADBEEF;  // 블록 앞 매직 넘버
  private readonly CANARY_BACK: number = 0xCAFEBABE;   // 블록 뒤 매직 넘버
  private invariantCheckCount: number = 0;             // 무결성 검사 횟수
  private canaryViolationCount: number = 0;            // Canary 침범 횟수
  // ──────────────────────────────────────────────────────────────────────────

  // ── v5.9.8: Dangling Pointer Guard & Access Privilege ──────────────────
  private readonly ZAPPING_VALUE: number = 0xDEADBEEF; // Zapping 값 (동일)
  private zappedAddresses: Set<number> = new Set();    // 이미 Zapped된 주소 추적
  private zappingCount: number = 0;                    // Zapping 실행 횟수
  // ────────────────────────────────────────────────────────────────────────

  // ── v5.9.9: Stack-Heap Bridge & Recursion Readiness ────────────────────
  private frameOwnership: Map<number, Set<number>> = new Map();  // 깊이별 할당
  private currentStackDepth: number = 0;               // 현재 스택 깊이
  // ────────────────────────────────────────────────────────────────────

  constructor(logCallback: (msg: string) => void) {
    this.log = logCallback;
    // v5.9.6: SmallObjectAllocator 초기화
    this.smallObjectAllocator = new SmallObjectAllocator(logCallback);
  }

  /**
   * v5.9.4: Best-Fit 할당 알고리즘
   * 요청한 크기와 가장 유사한 빈 공간을 선택 (First-Fit 개선)
   */
  allocate(size: number): number {
    if (size <= 0) throw new Error('[ALLOC ERROR] 크기는 양수여야 합니다');

    // ── v5.9.6: Dispatcher Logic ─────────────────────────────────────────────
    // 소형 객체는 풀에서 할당 (O(1))
    if (this.smallObjectAllocator.canAllocate(size)) {
      const poolAddr = this.smallObjectAllocator.allocate(size);

      // ── v5.9.7: Pool 할당도 metadata 기록 ──────────────────────────────────
      const blockId = this.blockIdCounter++;
      const metadata: BlockMetadata = {
        blockId,
        address: poolAddr,
        size,
        timestamp: Date.now(),
        lineNumber: 0,
        status: 'ALLOCATED',
        canary_front: this.CANARY_FRONT,
        canary_back: this.CANARY_BACK,
        is_zapped: false
      };
      this.blockMetadata.set(blockId, metadata);
      this.addressToBlockId.set(poolAddr, blockId);
      // ─────────────────────────────────────────────────────────────────────

      // ── v5.9.7: Invariant Checker ─────────────────────────────────────────
      this.verifyHeapInvariant();
      // ──────────────────────────────────────────────────────────────────────

      // ── v5.9.9: Frame Ownership Tracking ──────────────────────────────────
      if (!this.frameOwnership.has(this.currentStackDepth)) {
        this.frameOwnership.set(this.currentStackDepth, new Set());
      }
      this.frameOwnership.get(this.currentStackDepth)!.add(poolAddr);
      // ───────────────────────────────────────────────────────────────────────

      return poolAddr;
    }
    // ──────────────────────────────────────────────────────────────────────────

    // 1. Best-Fit: 요청한 크기와 가장 가까운 빈 블록 찾기
    let bestAddr: number | null = null;
    let bestSize: number = Infinity;
    let bestWaste: number = Infinity;  // 낭비량 최소화

    for (const [addr, blockSize] of this.freeBlocks) {
      if (blockSize >= size) {
        const waste = blockSize - size;
        // 더 작은 블록이거나, 같은 크기면 주소가 작은 것 선택
        if (waste < bestWaste || (waste === bestWaste && addr < bestAddr!)) {
          bestAddr = addr;
          bestSize = blockSize;
          bestWaste = waste;
        }
      }
    }

    if (bestAddr !== null) {
      const remainder = bestSize - size;
      this.freeBlocks.delete(bestAddr);
      this.allocatedBlocks.set(bestAddr, size);

      // v5.9.4: Block Splitting - 나머지가 최소 크기보다 크면 자유 블록으로 복구
      if (remainder > this.MIN_BLOCK_SIZE) {
        this.freeBlocks.set(bestAddr + size, remainder);
        this.log(`[SPLIT] 블록 분할: 0x${bestAddr.toString(16)}(${bestSize}) → 할당=${size}, 여유=${remainder}`);
      }

      // ── v5.9.5: Leak Guard - 메타데이터 기록 ────────────────────────────
      const blockId = this.blockIdCounter++;
      const metadata: BlockMetadata = {
        blockId,
        address: bestAddr,
        size,
        timestamp: Date.now(),
        lineNumber: 0,
        status: 'ALLOCATED',
        // ── v5.9.7: Canary (매직 넘버) ────────────────────────────────
        canary_front: this.CANARY_FRONT,
        canary_back: this.CANARY_BACK,
        // ────────────────────────────────────────────────────────────────
        // ── v5.9.8: Zapping (Tombstone) ────────────────────────────────
        is_zapped: false
        // ────────────────────────────────────────────────────────────────
      };
      this.blockMetadata.set(blockId, metadata);
      this.addressToBlockId.set(bestAddr, blockId);
      // ───────────────────────────────────────────────────────────────────────

      this.log(`[ALLOC] Best-Fit Block #${blockId} size=${size}, found_block @ 0x${bestAddr.toString(16)}, block_size=${bestSize}, waste=${bestWaste}`);
      this.log(`[ALLOC] address=0x${bestAddr.toString(16)}, size=${size}`);
      // ── v5.9.7: Invariant Checker ─────────────────────────────────────────
      this.verifyHeapInvariant();
      // ──────────────────────────────────────────────────────────────────────
      return bestAddr;
    }

    // 2. 없으면 새로 할당
    const newAddr = this.nextFreeAddress;
    this.allocatedBlocks.set(newAddr, size);

    // ── v5.9.5: Leak Guard - 메타데이터 기록 ────────────────────────────
    const blockId = this.blockIdCounter++;
    const metadata: BlockMetadata = {
      blockId,
      address: newAddr,
      size,
      timestamp: Date.now(),
      lineNumber: 0,
      status: 'ALLOCATED',
      // ── v5.9.7: Canary (매직 넘버) ────────────────────────────────
      canary_front: this.CANARY_FRONT,
      canary_back: this.CANARY_BACK,
      // ────────────────────────────────────────────────────────────────
      // ── v5.9.8: Zapping (Tombstone) ────────────────────────────────
      is_zapped: false
      // ────────────────────────────────────────────────────────────────
    };
    this.blockMetadata.set(blockId, metadata);
    this.addressToBlockId.set(newAddr, blockId);
    // ───────────────────────────────────────────────────────────────────────

    this.log(`[ALLOC] new_block Block #${blockId} size=${size} @ 0x${newAddr.toString(16)}`);
    this.log(`[ALLOC] address=0x${newAddr.toString(16)}, size=${size}`);
    this.nextFreeAddress += size;
    // ── v5.9.7: Invariant Checker ─────────────────────────────────────────
    this.verifyHeapInvariant();
    // ──────────────────────────────────────────────────────────────────────

    // ── v5.9.9: Frame Ownership Tracking ──────────────────────────────────
    if (!this.frameOwnership.has(this.currentStackDepth)) {
      this.frameOwnership.set(this.currentStackDepth, new Set());
    }
    this.frameOwnership.get(this.currentStackDepth)!.add(newAddr);
    // ───────────────────────────────────────────────────────────────────────

    return newAddr;
  }

  /**
   * 메모리 해제 (Coalescing 포함)
   */
  deallocate(address: number): void {
    // ── v5.9.6: Pool Recycling ───────────────────────────────────────────────
    // 풀 주소면 SmallObjectAllocator에 반환
    if (this.smallObjectAllocator.isPoolAddress(address)) {
      const poolSize = this.smallObjectAllocator.getPoolSizeForAddress(address);

      // ── v5.9.8: Zapping (Pool도 Tombstone으로 무효화) ───────────────────────
      for (let i = 0; i < poolSize; i++) {
        this.heapMemory.set(address + i, this.ZAPPING_VALUE);
      }
      this.zappedAddresses.add(address);
      this.zappingCount++;
      // ────────────────────────────────────────────────────────────────────

      // ── v5.9.7: Pool metadata 업데이트 ────────────────────────────────────
      const blockId = this.addressToBlockId.get(address);
      if (blockId) {
        const metadata = this.blockMetadata.get(blockId)!;
        if (metadata.status === 'FREED' || metadata.status === 'ZAPPED') {
          throw new Error(`[DOUBLE-FREE ERROR] Block #${blockId}는 이미 해제됨 (원래 해제: ${metadata.freed_timestamp})`);
        }
        metadata.status = 'ZAPPED';
        metadata.is_zapped = true;
        metadata.zapped_timestamp = Date.now();
        metadata.freed_timestamp = Date.now();
        this.log(`[ZAPPING] Block #${blockId} @ 0x${address.toString(16)}, size=${poolSize}, count=${this.zappingCount}`);
        this.log(`[FREE] Block #${blockId} (POOL) address=0x${address.toString(16)}, size=${poolSize}`);
      }
      // ────────────────────────────────────────────────────────────────────

      this.smallObjectAllocator.deallocate(poolSize, address);

      // ── v5.9.7: Invariant Checker ─────────────────────────────────────────
      this.verifyHeapInvariant();
      // ──────────────────────────────────────────────────────────────────────

      return;
    }
    // ──────────────────────────────────────────────────────────────────────────

    // ── v5.9.5: Leak Guard - Double-Free 감지 ────────────────────────────────
    const blockId = this.addressToBlockId.get(address);

    if (!blockId) {
      throw new Error(`[DOUBLE-FREE ERROR] 할당되지 않았거나 이미 해제된 주소 0x${address.toString(16)}`);
    }

    const metadata = this.blockMetadata.get(blockId)!;

    if (metadata.status === 'FREED' || metadata.status === 'ZAPPED') {
      throw new Error(`[DOUBLE-FREE ERROR] Block #${blockId}는 이미 해제됨 (원래 해제: ${metadata.freed_timestamp})`);
    }

    if (metadata.status === 'DOUBLE_FREE_DETECTED') {
      throw new Error(`[ZOMBIE BLOCK] Block #${blockId}는 이미 좀비 블록으로 마킹됨`);
    }
    // ──────────────────────────────────────────────────────────────────────────

    if (!this.allocatedBlocks.has(address)) {
      throw new Error(`[FREE ERROR] 할당되지 않은 주소 0x${address.toString(16)}`);
    }

    const size = this.allocatedBlocks.get(address)!;

    // ── v5.9.8: Zapping (Tombstone) - 메모리 무효화 ────────────────────────
    for (let i = 0; i < size; i++) {
      this.heapMemory.set(address + i, this.ZAPPING_VALUE);
    }
    this.zappedAddresses.add(address);
    this.zappingCount++;
    this.log(`[ZAPPING] Block #${blockId} @ 0x${address.toString(16)}, size=${size}, count=${this.zappingCount}`);
    // ────────────────────────────────────────────────────────────────────────

    this.allocatedBlocks.delete(address);
    this.freeBlocks.set(address, size);

    // ── v5.9.5: Leak Guard - 메타데이터 업데이트 ────────────────────────────
    metadata.status = 'ZAPPED';  // v5.9.8: FREED → ZAPPED로 변경
    metadata.is_zapped = true;
    metadata.zapped_timestamp = Date.now();
    metadata.freed_timestamp = Date.now();
    // addressToBlockId 유지 (Use-After-Free 감지 필요)
    // ──────────────────────────────────────────────────────────────────────────

    this.log(`[FREE] Block #${blockId} address=0x${address.toString(16)}, size=${size}`);

    // Coalescing: 인접한 빈 블록 병합
    this.coalesce();

    // ── v5.9.7: Invariant Checker ─────────────────────────────────────────
    this.verifyHeapInvariant();
    // ──────────────────────────────────────────────────────────────────────

    // ── v5.9.9: Frame Ownership Cleanup ──────────────────────────────────
    if (this.frameOwnership.has(this.currentStackDepth)) {
      this.frameOwnership.get(this.currentStackDepth)!.delete(address);
    }
    // ──────────────────────────────────────────────────────────────────────
  }

  /**
   * 인접한 빈 블록 병합 (단편화 방지)
   */
  private coalesce(): void {
    const addrs = Array.from(this.freeBlocks.keys()).sort((a, b) => a - b);

    for (let i = 0; i < addrs.length - 1; i++) {
      const addr1 = addrs[i];
      const size1 = this.freeBlocks.get(addr1)!;
      const addr2 = addrs[i + 1];
      const size2 = this.freeBlocks.get(addr2)!;

      // addr1과 addr2가 인접하면 병합
      if (addr1 + size1 === addr2) {
        this.freeBlocks.delete(addr2);
        this.freeBlocks.set(addr1, size1 + size2);
        this.log(`[COALESCE] 블록 병합: 0x${addr1.toString(16)}(${size1}) + 0x${addr2.toString(16)}(${size2}) → 0x${addr1.toString(16)}(${size1 + size2})`);
        // 재귀적으로 다시 시도 (3개 이상 연속 병합 가능)
        this.coalesce();
        return;
      }
    }
  }

  /**
   * ── v5.9.7: Invariant Checker ─────────────────────────────────────────────
   * 매 할당/해제 후 힙 구조의 논리적 무결성 검증
   * 1. Free List 연결이 끊기지 않았는지 확인
   * 2. Allocated/Free 블록 간 겹침 확인
   * 3. Canary 값 검증 (경계 침범 감지)
   */
  private verifyHeapInvariant(): void {
    this.invariantCheckCount++;

    // 1. Free List 체인 검증
    const freeAddrs = Array.from(this.freeBlocks.keys()).sort((a, b) => a - b);
    for (let i = 0; i < freeAddrs.length - 1; i++) {
      const addr1 = freeAddrs[i];
      const size1 = this.freeBlocks.get(addr1)!;
      const addr2 = freeAddrs[i + 1];
      if (addr1 + size1 > addr2) {
        throw new Error(`[HEAP CORRUPTION] Free List 체인 끊김: 0x${addr1.toString(16)}(${size1}) + 0x${addr2.toString(16)} 겹침`);
      }
    }

    // 2. Allocated/Free 겹침 검증
    const allocAddrs = Array.from(this.allocatedBlocks.keys()).sort((a, b) => a - b);
    for (const allocAddr of allocAddrs) {
      const allocSize = this.allocatedBlocks.get(allocAddr)!;
      for (const freeAddr of freeAddrs) {
        const freeSize = this.freeBlocks.get(freeAddr)!;
        if ((allocAddr < freeAddr + freeSize && allocAddr + allocSize > freeAddr)) {
          throw new Error(`[HEAP CORRUPTION] Allocated와 Free 블록 겹침: 0x${allocAddr.toString(16)}(${allocSize}) ↔ 0x${freeAddr.toString(16)}(${freeSize})`);
        }
      }
    }

    // 3. Canary 값 검증 (모든 할당된 블록)
    for (const [blockId, metadata] of this.blockMetadata) {
      if (metadata.status === 'ALLOCATED') {
        // Canary 저장 위치에서 값 읽기
        const canaryFrontAddr = metadata.address;
        const canaryBackAddr = metadata.address + metadata.size - 1;

        // Canary는 heapMemory에 별도로 저장되지 않지만, metadata에서 확인
        if (metadata.canary_front !== this.CANARY_FRONT) {
          this.canaryViolationCount++;
          throw new Error(`[CANARY VIOLATION] Block #${blockId} 앞 경계 침범: 0x${metadata.canary_front.toString(16)} (expected 0x${this.CANARY_FRONT.toString(16)})`);
        }
        if (metadata.canary_back !== this.CANARY_BACK) {
          this.canaryViolationCount++;
          throw new Error(`[CANARY VIOLATION] Block #${blockId} 뒤 경계 침범: 0x${metadata.canary_back.toString(16)} (expected 0x${this.CANARY_BACK.toString(16)})`);
        }
      }
    }

    this.log(`[INVARIANT] Check #${this.invariantCheckCount} passed (Free blocks: ${freeAddrs.length}, Allocated: ${allocAddrs.length}, Violations: ${this.canaryViolationCount})`);
  }

  /**
   * ── v5.9.7: Overflow Trap ─────────────────────────────────────────────────
   * 쓰기 시 할당된 크기를 초과하면 즉시 감지
   */
  private checkBufferOverflow(address: number, offset: number): void {
    const blockId = this.addressToBlockId.get(address);
    if (!blockId) return;

    const metadata = this.blockMetadata.get(blockId)!;
    if (metadata.status !== 'ALLOCATED') return;

    // offset이 할당된 크기를 초과하는지 확인
    if (offset >= metadata.size) {
      throw new Error(`[BUFFER OVERFLOW] Block #${blockId} 범위 초과: offset=${offset} >= size=${metadata.size} @ 0x${address.toString(16)}`);
    }
  }

  /**
   * 힙 메모리 읽기
   */
  read(address: number, offset: number): any {
    // ── v5.9.5: Use-After-Free 감지 ──────────────────────────
    const blockId = this.addressToBlockId.get(address);
    if (blockId) {
      const metadata = this.blockMetadata.get(blockId)!;
      if (metadata.status === 'FREED' || metadata.status === 'ZAPPED') {
        throw new Error(`[USE-AFTER-FREE ERROR] Block #${blockId}는 이미 해제됨 (Zapped). 해제된 메모리(0x${address.toString(16)})에 접근할 수 없습니다.`);
      }
    }
    // ────────────────────────────────────────────────────────

    // ── v5.9.8: Safe Dereference - Dangling Pointer 추가 검증 ──────────
    if (blockId) {
      const metadata = this.blockMetadata.get(blockId)!;
      if (metadata.is_zapped) {
        throw new Error(`[DANGLING POINTER] Block #${blockId}는 Zapped됨. Dangling 포인터 접근 감지 (Address: 0x${address.toString(16)})`);
      }
    }
    // ────────────────────────────────────────────────────────────────────

    // ── v5.9.7: Overflow Trap ───────────────────────────────────────────────
    this.checkBufferOverflow(address, offset);
    // ──────────────────────────────────────────────────────────────────────────

    // ── v5.9.6: 풀 주소는 범위 체크 스킵 ──────────────────────────────────
    if (!this.smallObjectAllocator.isPoolAddress(address)) {
      // 일반 Heap 주소: allocatedBlocks 확인
      let isValid = false;
      for (const [allocAddr, allocSize] of this.allocatedBlocks) {
        if (address >= allocAddr && address < allocAddr + allocSize) {
          if (offset >= 0 && offset < allocSize - (address - allocAddr)) {
            isValid = true;
            break;
          }
        }
      }

      if (!isValid && address !== 0) {
        // address=0은 null pointer로 허용
        throw new Error(`[BOUNDARY VIOLATION] 주소 0x${address.toString(16)} + offset=${offset} 범위 초과`);
      }
    }
    // ──────────────────────────────────────────────────────────────────────────

    const absoluteAddr = address + offset;
    const value = this.heapMemory.get(absoluteAddr) ?? 0;
    this.log(`[HEAP READ] @0x${address.toString(16)}+${offset} = ${value}`);
    return value;
  }

  /**
   * 힙 메모리 쓰기
   */
  write(address: number, offset: number, value: any): void {
    // ── v5.9.5: Use-After-Free 감지 ──────────────────────────
    const blockId = this.addressToBlockId.get(address);
    if (blockId) {
      const metadata = this.blockMetadata.get(blockId)!;
      if (metadata.status === 'FREED' || metadata.status === 'ZAPPED') {
        throw new Error(`[USE-AFTER-FREE ERROR] Block #${blockId}는 이미 해제됨 (Zapped). 해제된 메모리(0x${address.toString(16)})에 쓸 수 없습니다.`);
      }
    }
    // ────────────────────────────────────────────────────────

    // ── v5.9.8: Safe Dereference - Dangling Pointer 추가 검증 ──────────
    if (blockId) {
      const metadata = this.blockMetadata.get(blockId)!;
      if (metadata.is_zapped) {
        throw new Error(`[DANGLING POINTER] Block #${blockId}는 Zapped됨. Dangling 포인터 쓰기 감지 (Address: 0x${address.toString(16)})`);
      }
    }
    // ────────────────────────────────────────────────────────────────────

    // ── v5.9.7: Overflow Trap ───────────────────────────────────────────────
    this.checkBufferOverflow(address, offset);
    // ──────────────────────────────────────────────────────────────────────────

    // ── v5.9.6: 풀 주소는 범위 체크 스킵 ──────────────────────────────────
    if (!this.smallObjectAllocator.isPoolAddress(address)) {
      // 일반 Heap 주소: allocatedBlocks 확인
      let isValid = false;
      for (const [allocAddr, allocSize] of this.allocatedBlocks) {
        if (address >= allocAddr && address < allocAddr + allocSize) {
          if (offset >= 0 && offset < allocSize - (address - allocAddr)) {
            isValid = true;
            break;
          }
        }
      }

      if (!isValid && address !== 0) {
        throw new Error(`[BOUNDARY VIOLATION] 주소 0x${address.toString(16)} + offset=${offset} 범위 초과`);
      }
    }
    // ──────────────────────────────────────────────────────────────────────────

    const absoluteAddr = address + offset;
    this.heapMemory.set(absoluteAddr, value);
    this.log(`[HEAP WRITE] @0x${address.toString(16)}+${offset} = ${value}`);
  }

  /**
   * 할당된 모든 블록 목록 (메모리 누수 감지용)
   */
  getAllocatedBlocks(): Array<{ address: number; size: number }> {
    return Array.from(this.allocatedBlocks.entries()).map(([addr, size]) => ({ address: addr, size }));
  }

  /**
   * v5.9.4: 단편화 비율 계산 (0~1, 0=완벽, 1=최악)
   * 자유 블록의 개수와 크기 분포를 고려하여 계산
   */
  getFragmentationRatio(): number {
    if (this.freeBlocks.size === 0) return 0;  // 자유 블록 없음 = 단편화 없음

    let totalFreeSize = 0;
    const blockSizes: number[] = [];

    for (const size of this.freeBlocks.values()) {
      totalFreeSize += size;
      blockSizes.push(size);
    }

    if (totalFreeSize === 0) return 0;

    // 단편화 지수 = (블록 개수 - 1) * 블록당 평균 낭비도
    // 작은 블록이 많을수록 단편화 높음
    blockSizes.sort((a, b) => a - b);
    let fragmentationScore = 0;

    for (let i = 0; i < blockSizes.length - 1; i++) {
      // 인접하지 않은 블록은 단편화로 계산
      fragmentationScore += 1.0 / blockSizes[i];
    }

    const fragmentation = Math.min(1.0, fragmentationScore / (totalFreeSize / 10));
    return fragmentation;
  }

  /**
   * v5.9.4: 힙 통계 반환
   */
  getHeapStats(): {
    allocatedSize: number;
    freeSize: number;
    freeBlockCount: number;
    fragmentation: number;
    heapHealth: number;
  } {
    let allocatedSize = 0;
    for (const size of this.allocatedBlocks.values()) {
      allocatedSize += size;
    }

    let freeSize = 0;
    for (const size of this.freeBlocks.values()) {
      freeSize += size;
    }

    const fragmentation = this.getFragmentationRatio();
    const totalHeapSize = allocatedSize + freeSize;
    const heapHealth = totalHeapSize > 0 ? (100 * (1 - fragmentation)) : 100;

    this.log(`[HEAP STATS] allocated=${allocatedSize}, free=${freeSize}, blocks=${this.freeBlocks.size}, fragmentation=${fragmentation.toFixed(3)}, health=${heapHealth.toFixed(1)}%`);

    return {
      allocatedSize,
      freeSize,
      freeBlockCount: this.freeBlocks.size,
      fragmentation,
      heapHealth,
    };
  }

  /**
   * v5.9.5: 메모리 누수 리포트 생성 (프로그램 종료 시 호출)
   */
  generateLeakReport(): string {
    let report = '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    report += '[LEAK REPORT] 프로그램 종료 메모리 감시\n';
    report += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

    let totalLeaked = 0;
    const startTime = Math.min(...Array.from(this.blockMetadata.values()).map(m => m.timestamp));

    // 미해제 블록 찾기
    const leakedBlocks = Array.from(this.blockMetadata.values())
      .filter(m => m.status === 'ALLOCATED')
      .sort((a, b) => a.blockId - b.blockId);

    if (leakedBlocks.length === 0) {
      report += '✅ 메모리 누수 없음. 모든 메모리가 올바르게 해제되었습니다.\n';
    } else {
      report += `❌ [누수 감지] ${leakedBlocks.length}개 블록이 해제되지 않음\n\n`;

      for (const block of leakedBlocks) {
        const elapsed = block.timestamp - startTime;
        totalLeaked += block.size;

        report += `  Block #${block.blockId}: ${block.size} bytes @ 0x${block.address.toString(16)}\n`;
        report += `    할당 시간: ${block.timestamp}ms\n`;
        report += `    경과 시간: ${elapsed}ms\n`;
        report += `    소스 라인: ${block.lineNumber}\n`;
        report += `    상태: ${block.status}\n\n`;
      }

      report += `📊 통계:\n`;
      report += `  • 누수 블록: ${leakedBlocks.length}개\n`;
      report += `  • 누수량: ${totalLeaked} bytes\n`;
      report += `  • 총 할당량: ${Array.from(this.blockMetadata.values()).reduce((sum, m) => sum + m.size, 0)} bytes\n`;
    }

    report += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

    return report;
  }
}

/**
 * v5.9.5: MemoryPool — 사전 할당 메모리 풀 관리
 * 고정 크기 블록 할당/해제로 단편화 완전 제거
 */
class MemoryPool {
  poolId: number;
  totalSize: number;
  baseAddress: number;
  allocatedBlocks: Map<number, number> = new Map();  // address → size
  freeBlocks: Map<number, number> = new Map();       // address → size
  createdAt: number;

  constructor(poolId: number, totalSize: number, baseAddress: number) {
    this.poolId = poolId;
    this.totalSize = totalSize;
    this.baseAddress = baseAddress;
    this.createdAt = Date.now();
    // 초기: 전체 크기를 1개 자유 블록으로 설정
    this.freeBlocks.set(baseAddress, totalSize);
  }
}

// ── v8.1: Handler Stack & Exception Handling Foundation ──────────────────────
/**
 * HandlerFrame: TRY/CATCH 피난처 정보 저장 구조
 * 예외 발생 시 여기로 점프할 수 있도록 필요한 모든 메타데이터 기록
 */
// ── v8.2: Context Snapshot (레지스터 상태 저장) ───────────────────────────
interface ContextSnapshot {
  savedSP: number;      // TRY 진입 시점의 Stack Pointer (callStack.length)
  savedFP: number;      // TRY 진입 시점의 Frame Pointer
  savedPC: number;      // TRY 진입 시점의 Program Counter
  timestamp: number;    // 스냅샷 생성 타임스탐프
}

interface HandlerFrame {
  returnAddress: number;      // PC: CATCH 블록 시작 주소
  stackPointer: number;       // SP: TRY 진입 시점의 데이터 스택 깊이
  framePointer: number;       // FP: 현재 함수의 지역 변수 시작 지점
  catchBlockPC: number;       // CATCH 블록의 bytecode PC
  tryStartPC?: number;        // TRY 블록 시작 PC (로깅용)
  exceptionVarName?: string;  // 예외 변수명 (선택사항)
  snapshot?: ContextSnapshot; // v8.2: 컨텍스트 스냅샷 (레지스터 상태)
  exceptionObject?: any;      // v8.5: 던져진 Exception 객체 (또는 기타 값)
  // v8.7: FINALLY 블록 지연 제어 (Deferred Control)
  finallyBlock?: any;         // FINALLY 블록 (BlockStatement)
  pendingReturn?: any;        // 보류된 RETURN 값
  pendingException?: any;     // 보류된 THROW 예외
  hasPendingControl?: boolean; // 보류된 제어가 있는지 플래그
}
// ────────────────────────────────────────────────────────────────────────────

export class PCInterpreter {
  private variables: Map<string, any> = new Map();
  private output: string[] = [];
  private pc: number = 0; // Program Counter
  private loopStack: number[] = []; // WHILE 시작 위치 스택 (v3.3)
  private loopDepthStack: number[] = []; // 루프 깊이 스택 (v3.3 Nested Loop)
  private loopBodyExecutionCount: number[] = []; // v3.4: 루프 바디 실행 횟수 (조건 FALSE 제외)
  private loopIterationCounter: number[] = []; // v3.7: 각 루프의 총 반복 횟수 (nested support)
  private loopPreExecutionSnapshot: Map<string, Map<string, any>>[] = []; // v3.8: 루프 진입 전 메모리 스냅샷 (depth별)
  private loopControlVariables: Set<string>[] = []; // v3.8: 루프 제어 변수 (i, j 등) - 변경 허용
  private breakFlag: boolean = false; // v3.6: break 플래그
  private continueFlag: boolean = false; // v3.6: continue 플래그
  private debugLog: string[] = [];
  private sourceAST: ASTNode | null = null; // 전체 AST 저장 (v3.2 Exit Boundary용)
  private indentLevel: number = 0; // v3.3: 들여쓰기 레벨
  private trackedVariables: Set<string> = new Set(); // v3.4: 추적할 변수 목록
  private globalIterationCount: number = 0; // v3.7: 전체 프로그램 반복 횟수
  private jumpOffsetCache: Map<number, number> = new Map(); // v3.9: Jump Table - 루프 점프 목적지 캐시

  // ── v8.8: Exception Chaining & Handler Re-entrancy ──────────────────────────
  private currentlyHandlingException: any = null;  // v8.8: 현재 처리 중인 예외 추적

  // ── v4.0: 함수 시스템 ─────────────────────────────────────────────────────
  private functionTable: Map<string, { params: string[]; body: ASTNode }> = new Map();
  //   함수 이름 → { 매개변수 목록, 바디 블록 }

  // ── v5.7: 구조체 시스템 ─────────────────────────────────────────────────────
  private structTable: Map<string, {
    fields: { name: string; typeName: string; size: number; offset: number; padding: number }[];
    totalSize: number;
  }> = new Map();

  // ── v5.9: 동적 메모리 할당 시스템 ─────────────────────────────────────────────
  private heapAllocator: HeapAllocator;

  // ── v5.9.5: Memory Pool Management ──────────────────────────────────────
  private memoryPools: Map<number, MemoryPool> = new Map();  // poolId → MemoryPool
  private poolCounter: number = 0;                           // 풀 고유 ID 카운터
  private readonly POOL_BASE_OFFSET = 0xA000;                // 풀 시작 주소
  private readonly POOL_SPACING = 0x10000;                   // 풀 간 주소 간격
  // ────────────────────────────────────────────────────────────────────────

  private callStack: Array<{
    savedScope: Map<string, any>; // 호출 전 변수 환경 전체
    functionName: string;         // 어느 함수 안에 있는지 (디버그용)
    callDepth: number;            // 호출 깊이 (v4.1 중첩 추적)
  }> = [];

  private returnValue: any = undefined; // 함수가 돌려주는 값
  private returnFlag: boolean = false;  // RETURN 신호

  // ── v5.9.9: Stack-Heap Bridge & Recursion Readiness ────────────────────
  private frameOwnership: Map<number, Set<number>> = new Map();  // 깊이별 할당
  private currentStackDepth: number = 0;               // 현재 스택 깊이
  // ────────────────────────────────────────────────────────────────────

  // ── v6.0: Recursion Genesis - 재귀의 기원 ─────────────────────────────────
  private readonly MAX_RECURSION_DEPTH: number = 1000;  // 무한 재귀 방지
  private recursionDepth: number = 0;                    // 현재 재귀 깊이
  // ────────────────────────────────────────────────────────────────────────

  // ── v6.1 → v6.2: Stack Frame Isolation & Recursive Type Inference ──────────
  private typeSignatureTable: Map<string, {
    paramCount: number;
    returnType: string | null;   // null = 아직 미확정
    callCount: number;
    is_analyzing: boolean;       // v6.2: 현재 분석 중 (재귀 감지)
    typeCheckCount: number;      // v6.2: 타입 검증 성공 횟수
  }> = new Map();
  // ────────────────────────────────────────────────────────────────────────

  // ── v6.3: Tail Call Optimization (TCO) ────────────────────────────────────
  private tcoFlag: boolean = false;
  private tcoCallArgs: any[] = [];
  // ────────────────────────────────────────────────────────────────────────

  // ── v7.0: Class Table (struct + methods) ─────────────────────────────────
  private classTable: Map<string, {
    fields: { name: string; typeName: string; size: number; offset: number; padding: number }[];
    totalSize: number;
    methods: Map<string, { params: string[]; body: ASTNode }>;
    superClass?: string | null;  // v7.4: 부모 클래스 추적 (access control용)
  }> = new Map();
  // ────────────────────────────────────────────────────────────────────────

  // ── v7.2: vTable Registry (Virtual Method Table) + 정적 주소 ──────────────────────────
  private vTableRegistry: Map<string, {
    __staticAddress: string;             // v7.2: 정적 vTable 주소 (0xVT100, 0xVT200...)
    methods: string[];                   // 인덱스 → 함수 전체 이름 ('ClassName::methodName')
    index: Map<string, number>;          // 메서드 이름 → 인덱스
    superClass: string | null;
  }> = new Map();
  private vTableAddressCounter: number = 0x100;  // v7.2: vTable 정적 주소 카운터
  // ────────────────────────────────────────────────────────────────────────

  // ── v7.3: Interface Registry (계약 강제) ──────────────────────────────
  private interfaceTable: Map<string, {
    __methods: string[];  // 메서드 이름 배열 (순서 = vTable 인덱스)
    __slots: Map<string, number>;  // 메서드명 → 슬롯 인덱스
  }> = new Map();
  // ────────────────────────────────────────────────────────────────────────

  // ── v4.6: VM Dispatch Optimization ───────────────────────────────────────
  // Call Site Cache: 동일 AST 호출 노드 → 함수 정의 직접 참조 (Map.get 반복 생략)
  private callSiteCache: WeakMap<ASTNode, { params: string[]; body: ASTNode }> = new WeakMap();
  // Inline Hint Cache: 함수명 → 인라인 가능 여부 (1회 분석 후 재사용)
  private inlineCache: Map<string, boolean> = new Map();
  // 함수별 호출 횟수 (Pipeline 모니터링)
  private callCountMap: Map<string, number> = new Map();
  private static readonly HOT_THRESHOLD = 100;
  // ──────────────────────────────────────────────────────────────────────────

  // ── v7.4: 접근 제어 (Access Control) ──────────────────────────────────────
  private currentClassContext: string | null = null;  // 현재 실행 중인 클래스 (메서드 내부 추적)
  // ──────────────────────────────────────────────────────────────────────────

  // ── v7.5: 객체 생명주기 관리 (OOP Integrity & GC Readiness) ──────────────────
  private instanceTracker: Map<string, {
    className: string;
    refCount: number;
    address: string;
    createdAt: number;  // 생성 시 깊이
    size: number;
  }> = new Map();

  private objectIdCounter: number = 0;  // 객체 고유 ID
  // ──────────────────────────────────────────────────────────────────────────

  // ── v8.1: Handler Stack & Exception Handling Foundation ──────────────────
  private handlerStack: HandlerFrame[] = [];  // TRY/CATCH 핸들러 스택
  private readonly MAX_HANDLER_DEPTH: number = 100;  // 최대 중첩 깊이
  // ────────────────────────────────────────────────────────────────────────

  constructor() {
    // v5.9: HeapAllocator 초기화
    this.heapAllocator = new HeapAllocator((msg: string) => this.log(msg));

    this.variables.set('println', this.println.bind(this));

    // v6.1: check(condition) — 어서션 기반 무결성 검증
    this.variables.set('check', (cond: boolean) => {
      if (!cond) {
        this.log(`[CHECK FAILED] 무결성 검증 실패`);
        throw new Error(`[CHECK FAILED] assertion failed`);
      }
      this.log(`[CHECK OK] 무결성 검증 성공`);
      return true;
    });

    // v8.1: __GET_HANDLER_COUNT() — 현재 핸들러 스택 깊이 조회
    this.variables.set('__GET_HANDLER_COUNT', () => {
      const depth = this.handlerStack.length;
      this.log(`[HANDLER QUERY] 핸들러 스택 깊이: ${depth}`);
      return depth;
    });

    // v8.1: __GET_STACK_DEPTH() — 현재 콜스택 깊이 조회 (스택 복원 검증용)
    this.variables.set('__GET_STACK_DEPTH', () => {
      const depth = this.callStack.length;
      this.log(`[STACK QUERY] 콜스택 깊이: ${depth}`);
      return depth;
    });

    // v8.2: __GET_HANDLER_SP() — 현재 핸들러의 스냅샷 SP 조회
    this.variables.set('__GET_HANDLER_SP', () => {
      if (this.handlerStack.length === 0) {
        this.log(`[HANDLER SP QUERY] 활성 핸들러 없음, SP: undefined`);
        return undefined;
      }
      const currentHandler = this.handlerStack[this.handlerStack.length - 1];
      const savedSP = currentHandler.snapshot?.savedSP ?? undefined;
      this.log(`[HANDLER SP QUERY] 스냅샷 SP: ${savedSP}`);
      return savedSP;
    });

    // v8.2: __GET_HANDLER_FP() — 현재 핸들러의 스냅샷 FP 조회
    this.variables.set('__GET_HANDLER_FP', () => {
      if (this.handlerStack.length === 0) {
        this.log(`[HANDLER FP QUERY] 활성 핸들러 없음, FP: undefined`);
        return undefined;
      }
      const currentHandler = this.handlerStack[this.handlerStack.length - 1];
      const savedFP = currentHandler.snapshot?.savedFP ?? undefined;
      this.log(`[HANDLER FP QUERY] 스냅샷 FP: ${savedFP}`);
      return savedFP;
    });

    // v8.2: __GET_FP() — 현재 Frame Pointer (기본값 0)
    this.variables.set('__GET_FP', () => {
      const fp = 0; // 현재는 전역 FP 사용, 나중에 함수 호출 스택으로 확장 가능
      this.log(`[FP QUERY] 현재 FP: ${fp}`);
      return fp;
    });

    // v5.0: arr_new(n) — n개 슬롯을 0으로 초기화한 배열 반환
    this.variables.set('arr_new', (size: number) => {
      const arr = new Array(Math.max(0, size)).fill(0);
      this.log(`[ARRAY ALLOC] arr_new(${size}) → ${size}개 슬롯 확보 (Base+0 ~ Base+${size - 1}), 모두 0 초기화`);
      // v5.3: Metadata Header — 배열 크기를 헤더 영역에 기록 (경계 보호의 기준)
      this.log(`[HEADER WRITE] Base-1: size=${size} 기록 완료 (Metadata Header 영역)`);
      return arr;
    });

    // v5.2: arr_copy(src, dst) — 블록 Deep Copy (원소 값 전체 복제, 참조 독립)
    this.variables.set('arr_copy', (src: any[], dst: any[]) => {
      if (!Array.isArray(src)) throw new Error('[COPY ERROR] 원본이 배열이 아닙니다');
      if (!Array.isArray(dst)) throw new Error('[COPY ERROR] 대상이 배열이 아닙니다');

      const srcLen = src.length;
      const dstLen = dst.length;
      const transferLen = Math.min(srcLen, dstLen);

      this.log(`[BLOCK COPY] 블록 복사 시작: source(${srcLen}개) → target(${dstLen}개)`);
      this.log(`[MEMORY MIGRATE] Deep Copy 모드 — 원본과 독립된 새 값 공간에 복제`);

      for (let i = 0; i < transferLen; i++) {
        const prev = dst[i];
        dst[i] = src[i];
        this.log(`[BLOCK COPY] Base+${i}: ${prev} → ${src[i]}`);
      }

      this.log(`[BLOCK INTEGRITY] 전송 완료: ${transferLen}/${srcLen} 원소 — 누락 없음 ✅`);
      this.log(`[DEEP COPY] 독립성 확보 — source 수정 시 target 영향 없음 (원시값 복사)`);
      this.log(`[GC RELEASE] 구형 target 슬롯 참조 해제 완료 (Garbage Collected)`);

      return dst;
    });

    // v5.2: arr_resize(arr, newSize) — 배열 크기 조정 + 기존 데이터 이관
    this.variables.set('arr_resize', (arr: any[], newSize: number) => {
      if (!Array.isArray(arr)) throw new Error('[RESIZE ERROR] 배열이 아닙니다');
      if (newSize < 0) throw new Error('[RESIZE ERROR] 크기는 0 이상이어야 합니다');

      const oldLen = arr.length;
      const migrateLen = Math.min(oldLen, newSize);

      this.log(`[MEMORY MIGRATE] arr_resize: ${oldLen}개 → ${newSize}개 슬롯 이관 시작`);
      this.log(`[ARRAY ALLOC] 신규 공간 확보: ${newSize}개 슬롯 (모두 0 초기화)`);

      const newArr = new Array(newSize).fill(0);
      for (let i = 0; i < migrateLen; i++) {
        newArr[i] = arr[i];
        this.log(`[BLOCK COPY] Base+${i}: ${arr[i]} (이관)`);
      }

      this.log(`[BLOCK INTEGRITY] 이관 완료: ${migrateLen}/${oldLen} 원소 보존 ✅`);
      this.log(`[GC RELEASE] 구형 배열 (크기 ${oldLen}) 참조 해제 — Garbage Collected`);
      // v5.3: 신규 배열 Metadata Header 갱신
      this.log(`[HEADER WRITE] Base-1: size=${newSize} 갱신 완료 (Resize 후 새 Metadata Header)`);

      return newArr;
    });

    // v5.4: matrix_new(rows, cols) — 다차원 배열 (2D matrix) 생성
    this.variables.set('matrix_new', (rows: number, cols: number) => {
      const total = rows * cols;
      const mat = { __type: 'matrix', rows, cols, data: new Array(total).fill(0) };
      this.log(`[MATRIX ALLOC] matrix_new(${rows}, ${cols}) → ${total}개 슬롯 (Row-Major Order)`);
      this.log(`[HEADER WRITE] rows=${rows}, cols=${cols}, stride=${cols} 기록 완료 (2D Metadata Header)`);
      this.log(`[LINEARITY] 선형 주소 범위: Base+0 ~ Base+${total - 1}`);
      return mat;
    });

    // v5.4: matrix_set(mat, row, col, val) — 행렬 원소 쓰기
    this.variables.set('matrix_set', (mat: any, row: number, col: number, val: number) => {
      if (!mat || mat.__type !== 'matrix') throw new Error('[MATRIX ERROR] 행렬이 아닙니다');
      this.log(`[HEADER READ] rows=${mat.rows}, cols=${mat.cols}, stride=${mat.cols} 조회`);

      // 각 차원 독립 검사 (Bound Overlap 방지)
      if (row < 0 || row >= mat.rows) {
        this.log(`[BOUNDARY VIOLATION] row=${row} ≥ rows ${mat.rows} — 행 범위 초과!`);
        this.log(`[VIOLATION LOG] 위반 위치: row[${row}], 허용 범위: [0, ${mat.rows-1}], 쓰기`);
        throw new Error(`[INDEX OUT OF BOUNDS] row ${row} 가 범위 [0, ${mat.rows-1}] 를 벗어남`);
      }
      if (col < 0 || col >= mat.cols) {
        this.log(`[BOUNDARY VIOLATION] col=${col} ≥ cols ${mat.cols} — 열 범위 초과!`);
        this.log(`[VIOLATION LOG] 위반 위치: col[${col}], 허용 범위: [0, ${mat.cols-1}], 쓰기`);
        throw new Error(`[INDEX OUT OF BOUNDS] col ${col} 가 범위 [0, ${mat.cols-1}] 를 벗어남`);
      }

      const addr = row * mat.cols + col;
      this.log(`[ROW-MAJOR] matrix[${row}][${col}] → linear[${addr}] (공식: ${row}*${mat.cols}+${col}=${addr})`);
      const prev = mat.data[addr];
      mat.data[addr] = val;
      this.log(`[INDEX WRITE] linear[${addr}]: ${prev} → ${val}`);
      return null;
    });

    // v5.4: matrix_get(mat, row, col) — 행렬 원소 읽기
    this.variables.set('matrix_get', (mat: any, row: number, col: number) => {
      if (!mat || mat.__type !== 'matrix') throw new Error('[MATRIX ERROR] 행렬이 아닙니다');
      this.log(`[HEADER READ] rows=${mat.rows}, cols=${mat.cols}, stride=${mat.cols} 조회`);

      if (row < 0 || row >= mat.rows) {
        this.log(`[BOUNDARY VIOLATION] row=${row} ≥ rows ${mat.rows} — 행 범위 초과!`);
        this.log(`[VIOLATION LOG] 위반 위치: row[${row}], 허용 범위: [0, ${mat.rows-1}], 읽기`);
        throw new Error(`[INDEX OUT OF BOUNDS] row ${row} 가 범위 [0, ${mat.rows-1}] 를 벗어남`);
      }
      if (col < 0 || col >= mat.cols) {
        this.log(`[BOUNDARY VIOLATION] col=${col} ≥ cols ${mat.cols} — 열 범위 초과!`);
        this.log(`[VIOLATION LOG] 위반 위치: col[${col}], 허용 범위: [0, ${mat.cols-1}], 읽기`);
        throw new Error(`[INDEX OUT OF BOUNDS] col ${col} 가 범위 [0, ${mat.cols-1}] 를 벗어남`);
      }

      const addr = row * mat.cols + col;
      this.log(`[ROW-MAJOR] matrix[${row}][${col}] → linear[${addr}] (공식: ${row}*${mat.cols}+${col}=${addr})`);
      const val = mat.data[addr];
      this.log(`[INDEX READ] linear[${addr}] = ${val}`);
      return val;
    });

    // v5.8: arr_struct_new(count, structType) — 구조체 배열 생성 (Stride 기반)
    this.variables.set('arr_struct_new', (count: number, structTypeName: string) => {
      if (!this.structTable.has(structTypeName)) {
        throw new Error(`[STRUCT ERROR] '${structTypeName}' 구조체가 정의되지 않았습니다`);
      }
      const structDef = this.structTable.get(structTypeName)!;
      const stride = structDef.totalSize;
      const totalBytes = count * stride;

      // 1D 플래튼화: 모든 필드를 선형 배열로
      const data = new Array(totalBytes).fill(0);

      const allocIdx = this.variables.size;
      const baseAddr = `0x${(0x4000 + allocIdx * 0x100).toString(16).padStart(4, '0')}`;

      const structArray: any = {
        __type: 'struct_array',
        __typeName: structTypeName,
        __stride: stride,
        __structDef: structDef,
        __baseAddr: baseAddr,
        __count: count,
        __data: data
      };

      this.log(`[STRUCT ARRAY ALLOC] ${structTypeName}[${count}] @ ${baseAddr} (stride=${stride}, total=${totalBytes} bytes)`);
      this.log(`[MEMORY FLATTENING] 구조체 배열을 1D 선형 메모리로 취급 (${count}개 × ${stride} bytes)`);

      return structArray;
    });

    // ── v5.9: 동적 메모리 할당 함수들 ──────────────────────────────────────────
    // alloc(size) → address
    this.variables.set('alloc', (size: number) => {
      const address = this.heapAllocator.allocate(size);
      return address;
    });

    // free(address) → void
    this.variables.set('free', (address: number) => {
      this.heapAllocator.deallocate(address);
    });

    // get_at(address, offset) → value
    this.variables.set('get_at', (address: number, offset: number) => {
      const value = this.heapAllocator.read(address, offset);
      return value;
    });

    // set_at(address, offset, value) → void
    this.variables.set('set_at', (address: number, offset: number, value: any) => {
      this.heapAllocator.write(address, offset, value);
    });

    // ── v5.9.5: Memory Pool Management ──────────────────────────────────────────
    // create_pool(size) → poolObject
    this.variables.set('create_pool', (size: number) => {
      if (size <= 0) throw new Error('[POOL ERROR] 크기는 양수여야 합니다');

      const poolId = this.poolCounter++;
      const baseAddr = this.POOL_BASE_OFFSET + poolId * this.POOL_SPACING;

      const pool = new MemoryPool(poolId, size, baseAddr);
      this.memoryPools.set(poolId, pool);

      this.log(`[POOL CREATE] ID=${poolId}, size=${size}, base=0x${baseAddr.toString(16)}`);
      return pool;
    });

    // pool_alloc(pool, size) → address
    this.variables.set('pool_alloc', (pool: MemoryPool, size: number) => {
      if (!(pool instanceof MemoryPool)) {
        throw new Error('[POOL ERROR] 첫 인자는 Pool 객체여야 합니다');
      }
      if (size <= 0) throw new Error('[POOL ERROR] 크기는 양수여야 합니다');

      // Best-Fit 검색
      let bestAddr: number | null = null;
      let bestSize: number = Infinity;
      let bestWaste: number = Infinity;

      for (const [addr, blockSize] of pool.freeBlocks) {
        if (blockSize >= size) {
          const waste = blockSize - size;
          if (waste < bestWaste) {
            bestAddr = addr;
            bestSize = blockSize;
            bestWaste = waste;
          }
        }
      }

      if (bestAddr === null) {
        throw new Error(`[POOL ERROR] Pool ID=${pool.poolId} 공간 부족 (요청=${size}, 가용=${Array.from(pool.freeBlocks.values()).reduce((a, b) => a + b, 0)})`);
      }

      // 할당
      const remainder = bestSize - size;
      pool.freeBlocks.delete(bestAddr);
      pool.allocatedBlocks.set(bestAddr, size);

      // Block Splitting (4 bytes 이상만)
      if (remainder > 4) {
        pool.freeBlocks.set(bestAddr + size, remainder);
      }

      this.log(`[POOL ALLOC] Pool=${pool.poolId}, addr=0x${bestAddr.toString(16)}, size=${size}, waste=${bestWaste}`);
      return bestAddr;
    });

    // pool_free(pool, address) → void
    this.variables.set('pool_free', (pool: MemoryPool, address: number) => {
      if (!(pool instanceof MemoryPool)) {
        throw new Error('[POOL ERROR] 첫 인자는 Pool 객체여야 합니다');
      }
      if (!pool.allocatedBlocks.has(address)) {
        throw new Error(`[POOL ERROR] Pool ID=${pool.poolId}: 할당되지 않은 주소 0x${address.toString(16)}`);
      }

      const size = pool.allocatedBlocks.get(address)!;
      pool.allocatedBlocks.delete(address);
      pool.freeBlocks.set(address, size);

      this.log(`[POOL FREE] Pool=${pool.poolId}, addr=0x${address.toString(16)}, size=${size}`);

      // Coalescing
      this.pool_coalesce(pool);
    });

    // destroy_pool(pool) → void
    this.variables.set('destroy_pool', (pool: MemoryPool) => {
      if (!(pool instanceof MemoryPool)) {
        throw new Error('[POOL ERROR] 인자는 Pool 객체여야 합니다');
      }

      const poolId = pool.poolId;

      // 미해제 블록 경고
      if (pool.allocatedBlocks.size > 0) {
        this.log(`[POOL WARN] Pool=${poolId}: ${pool.allocatedBlocks.size}개 블록 미해제`);
      }

      this.memoryPools.delete(poolId);
      this.log(`[POOL DESTROY] ID=${poolId}`);
    });
    // ────────────────────────────────────────────────────────────────────────────

    // ── v5.9.2: 데이터 정렬(Data Alignment) ──────────────────────────────────
    // v7.1: sizeof(structName | className) → 패딩 포함된 실제 크기
    this.variables.set('sizeof', (typeName: string) => {
      let def = this.structTable.get(typeName) || this.classTable.get(typeName);
      if (!def) {
        throw new Error(`[SIZE ERROR] '${typeName}' 구조체/클래스 미정의`);
      }

      const totalSize = def.totalSize;  // 패딩 포함됨

      this.log(`[SIZEOF] ${typeName} = ${totalSize} bytes (padding included)`);
      return totalSize;
    });

    // v8.5: 내장 Exception 클래스 등록
    this.initializeBuiltinExceptionClass();
  }

  /**
   * v8.5: 내장 Exception 클래스 초기화
   * 엔진 시작 시 자동으로 Exception 클래스를 등록
   */
  private initializeBuiltinExceptionClass(): void {
    const exceptionClassName = 'Exception';

    // Exception 클래스 필드 정의
    const exceptionFields = [
      { name: 'Message', typeName: 'String', size: 4, offset: 0, padding: 0 },
      { name: 'Code', typeName: 'Integer', size: 4, offset: 4, padding: 0 },
      { name: 'Timestamp', typeName: 'String', size: 4, offset: 8, padding: 0 },
      { name: 'Location', typeName: 'String', size: 4, offset: 12, padding: 0 },
      { name: 'Cause', typeName: 'Object', size: 4, offset: 16, padding: 0 }  // v8.8: Exception Chaining
    ];

    const totalSize = 20; // 5 필드 × 4바이트 (v8.8: Cause 필드 추가)

    // 1. classTable에 Exception 등록
    this.classTable.set(exceptionClassName, {
      fields: exceptionFields,
      totalSize: totalSize,
      methods: new Map()  // 기본 메서드 없음 (GetTrace() 등은 나중에)
    });

    // 2. structTable에도 등록 (Exception 객체의 메모리 레이아웃을 위해)
    this.structTable.set(exceptionClassName, {
      fields: exceptionFields,
      totalSize: totalSize
    });

    // 3. vTableRegistry에 등록
    const vTableAddress = `0xVT${this.vTableAddressCounter.toString(16).padStart(3, '0')}`;
    this.vTableAddressCounter++;

    this.vTableRegistry.set(exceptionClassName, {
      __staticAddress: vTableAddress,
      methods: [],
      index: new Map(),
      superClass: null
    });

    this.log(`[BUILTIN CLASS] Exception 클래스 등록 완료`);
    this.log(`  → 필드: Message(4B), Code(4B), Timestamp(4B), Location(4B), Cause(4B)`);
    this.log(`  → 총 크기: ${totalSize}B`);

    // v8.8: get_cause 내장 함수
    this.variables.set('get_cause', (exceptionObj: any) => {
      if (!exceptionObj || exceptionObj.__type !== 'object') return 0;
      return exceptionObj.Cause ?? 0;
    });
  }

  /**
   * v5.9.5: Pool Coalescing - 메모리 풀 내 인접 블록 병합
   */
  private pool_coalesce(pool: MemoryPool): void {
    const addrs = Array.from(pool.freeBlocks.keys()).sort((a, b) => a - b);

    for (let i = 0; i < addrs.length - 1; i++) {
      const addr1 = addrs[i];
      const size1 = pool.freeBlocks.get(addr1)!;
      const addr2 = addrs[i + 1];
      const size2 = pool.freeBlocks.get(addr2)!;

      // 인접 블록 병합
      if (addr1 + size1 === addr2) {
        pool.freeBlocks.delete(addr2);
        pool.freeBlocks.set(addr1, size1 + size2);
        this.log(`[POOL COALESCE] Pool=${pool.poolId}, 0x${addr1.toString(16)}(${size1}) + 0x${addr2.toString(16)}(${size2}) → 0x${addr1.toString(16)}(${size1 + size2})`);
        this.pool_coalesce(pool);  // 재귀
        return;
      }
    }
  }

  /**
   * v3.9: Jump Table Optimization - 루프 점프 오프셋 캐시
   */
  private cacheJumpOffset(loopPC: number, destinationPC: number): void {
    this.jumpOffsetCache.set(loopPC, destinationPC);
    this.log(`[JUMP TABLE] Cached jump: PC=${loopPC} → PC=${destinationPC}`);
  }

  /**
   * v3.9: Jump Table Optimization - 캐시된 점프 목적지 조회
   */
  private getJumpDestination(loopPC: number): number | undefined {
    const cached = this.jumpOffsetCache.get(loopPC);
    if (cached !== undefined) {
      this.log(`[JUMP TABLE] Cache hit: PC=${loopPC} → PC=${cached}`);
    }
    return cached;
  }

  /**
   * v3.9: Jump Table Optimization - 캐시 초기화 (프로그램 재실행 시)
   */
  private clearJumpOffsetCache(): void {
    this.jumpOffsetCache.clear();
    this.log(`[JUMP TABLE] Cache cleared`);
  }

  /**
   * v5.7: 타입 크기 계산
   */
  private getTypeSize(typeName: string): number {
    const sizes: Record<string, number> = {
      'Integer': 4, 'Float': 4, 'Long': 8, 'Short': 2, 'Byte': 1,
    };
    return sizes[typeName] ?? 4;
  }

  /**
   * v8.6: 상속 계층을 고려한 타입 검사
   * - exceptionObject.__class와 expectedType을 비교
   * - 상속 계층을 따라 올라가며 일치 여부 확인
   */
  private isInstanceOf(exceptionObject: any, expectedType: string): boolean {
    if (!exceptionObject || !expectedType) return false;

    const exceptionClass = exceptionObject.__class;
    if (!exceptionClass) return false;

    // 1. 정확한 타입 일치
    if (exceptionClass === expectedType) {
      this.log(`[TYPE MATCH] ${exceptionClass} == ${expectedType}`);
      return true;
    }

    // 2. 상속 계층 탐색 (부모 클래스 확인)
    let currentClass = exceptionClass;
    const visited = new Set<string>();

    while (currentClass && !visited.has(currentClass)) {
      visited.add(currentClass);

      const classDef = this.classTable.get(currentClass);
      if (!classDef) {
        // 클래스 정의를 찾을 수 없으면 Exception 기본 클래스 확인
        if (currentClass === 'Exception' && expectedType === 'Exception') {
          return true;
        }
        break;
      }

      // 현재 클래스에서 foundMatch 플래그 확인
      if (currentClass === expectedType) {
        this.log(`[TYPE MATCH] 상속 계층: ${exceptionClass} → ${currentClass} == ${expectedType}`);
        return true;
      }

      // 부모 클래스로 이동 (vTableRegistry에서 superClass 정보 조회)
      const vTable = this.vTableRegistry.get(currentClass);
      currentClass = vTable?.superClass ?? null;
    }

    // 일치하지 않음
    this.log(`[TYPE MISMATCH] ${exceptionClass} does not match ${expectedType}`);
    return false;
  }

  /**
   * 프로그램 실행 (PC 기반)
   */
  public execute(ast: ASTNode): any {
    if (!ast) return null;

    // Program 노드 처리
    if (ast.type === 'Program') {
      return this.executeProgram(ast.statements);
    }

    // 단일 statement
    return this.executeProgram([ast]);
  }

  /**
   * Statement 배열을 PC로 순회 실행
   */
  private executeProgram(statements: ASTNode[]): any {
    this.pc = 0;
    this.sourceAST = { type: 'Program', statements }; // v3.2: AST 저장
    this.clearJumpOffsetCache(); // v3.9: Jump Table 초기화
    // v4.6: 최적화 캐시 초기화 (재실행 시 오래된 캐시 방지)
    this.inlineCache.clear();
    this.callCountMap.clear();

    // ── v6.1: Forward Declaration (Pass 1) ────────────────────────────────────
    // 실행 전에 모든 함수 정의를 먼저 등록하여 호출 순서와 무관하게 동작
    for (const stmt of statements) {
      if (stmt && stmt.type === 'FunctionDeclaration') {
        this.functionTable.set(stmt.name, { params: stmt.params, body: stmt.body });
        this.typeSignatureTable.set(stmt.name, {
          paramCount: stmt.params.length,
          returnType: null,  // 아직 미확정
          callCount: 0,
          is_analyzing: false,   // v6.2: 초기값
          typeCheckCount: 0      // v6.2: 타입 체크 카운터
        });
        this.log(`[FORWARD DECL] '${stmt.name}' 사전 등록 (params: ${stmt.params.length}개)`);
      }
      // v7.0: ClassDeclaration도 Forward Declaration 처리
      else if (stmt && stmt.type === 'ClassDeclaration') {
        this.eval(stmt);  // ClassDeclaration 처리 (structTable + methodTable 등록)
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    // ── Pass 2: 실제 실행 ──────────────────────────────────────────────────
    while (this.pc < statements.length) {
      const stmt = statements[this.pc];
      const nextPC = this.executeStatement(stmt, statements);

      if (nextPC === undefined) {
        this.pc++;
      } else {
        this.pc = nextPC;
      }
    }

    // ── v6.2: Symbol Table 최종 상태 요약 ────────────────────────────────────
    for (const [fname, sigInfo] of this.typeSignatureTable.entries()) {
      if (sigInfo.callCount > 0) {
        this.log(`[SYMBOL TABLE] '${fname}' 최종타입: ${sigInfo.returnType}, 호출수: ${sigInfo.callCount}, 타입체크: ${sigInfo.typeCheckCount}`);
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    // ── v5.9.5: 프로그램 종료 시 누수 리포트 출력 ───────────
    const leakReport = this.heapAllocator.generateLeakReport();
    console.log(leakReport);
    // ────────────────────────────────────────────────────────

    return null;
  }

  /**
   * 개별 Statement 실행
   * 반환값: undefined (다음 문) or number (특정 PC로 이동)
   */
  private executeStatement(stmt: ASTNode, statements: ASTNode[]): number | undefined {
    switch (stmt.type) {
      case 'VariableDeclaration': {
        const val = this.eval(stmt.value);
        this.variables.set(stmt.name, val);
        // v4.2: DELIVERY 추적 (최상위 문에서도)
        if (stmt.value?.type === 'CallExpression') {
          const callee = stmt.value.callee?.name ?? '?';
          this.log(`[DELIVERY] '${callee}()' 반환값 ${val} → '${stmt.name}'`);
        }
        return undefined; // 다음 문으로
      }

      case 'Assignment': {
        const val = this.eval(stmt.value);
        this.variables.set(stmt.name, val);
        // v4.2: DELIVERY 추적 (최상위 문에서도)
        if (stmt.value?.type === 'CallExpression') {
          const callee = stmt.value.callee?.name ?? '?';
          this.log(`[DELIVERY] '${callee}()' 반환값 ${val} → '${stmt.name}'`);
        }
        return undefined;
      }

      // v4.0: 함수 정의 — 실행 없이 Function Table에 등록만
      case 'FunctionDeclaration': {
        // v6.1: 이미 Forward Declaration에서 등록되었는지 확인
        if (!this.typeSignatureTable.has(stmt.name)) {
          // 동적 함수 정의 (executeProgram의 Forward Declaration 단계를 건너뜀)
          this.functionTable.set(stmt.name, { params: stmt.params, body: stmt.body });
          this.typeSignatureTable.set(stmt.name, {
            paramCount: stmt.params.length,
            returnType: null,
            callCount: 0,
            is_analyzing: false,   // v6.2
            typeCheckCount: 0      // v6.2
          });
          this.log(`[FUNC DEF] '${stmt.name}' 등록 (params: [${stmt.params.join(', ')}])`);
        } else {
          this.log(`[FUNC DEF] '${stmt.name}' 이미 등록됨 (Forward Declaration)`);
        }
        return undefined;
      }

      // v5.7: 구조체 정의
      case 'StructDeclaration': {
        const fieldsWithLayout: any[] = [];
        let currentOffset = 0;
        let maxAlignment = 1;  // 구조체 전체 정렬 단위 추적
        for (const f of stmt.fields) {
          const size = this.getTypeSize(f.typeName);
          const alignment = size;
          maxAlignment = Math.max(maxAlignment, alignment);  // 최대 정렬값 갱신
          const padding = (alignment - currentOffset % alignment) % alignment;
          const offset = currentOffset + padding;
          fieldsWithLayout.push({ name: f.name, typeName: f.typeName, size, offset, padding });
          this.log(`[FIELD LAYOUT] ${f.name}(${f.typeName}, ${size} bytes): offset=${offset}, padding=${padding}`);
          currentOffset = offset + size;
        }
        // v5.9.3: Tail Padding 계산 (배열 연속성을 위한 정렬)
        const tailPadding = (maxAlignment - currentOffset % maxAlignment) % maxAlignment;
        const totalSize = currentOffset + tailPadding;
        if (tailPadding > 0) {
          this.log(`[TAIL PADDING] 추가 ${tailPadding} bytes (다음 구조체 정렬을 위해)`);
        }
        this.structTable.set(stmt.name, { fields: fieldsWithLayout, totalSize });
        this.log(`[STRUCT DEF] ${stmt.name}: ${fieldsWithLayout.length}개 필드, ${totalSize} bytes total (tail padding included)`);
        return undefined;
      }

      // v7.3: InterfaceDeclaration 처리
      case 'InterfaceDeclaration': {
        const interfaceName = (stmt as any).name;
        const methods = (stmt as any).methods;
        const methodNames = methods.map((m: any) => m.name);
        const methodSlots = new Map<string, number>();

        for (let i = 0; i < methodNames.length; i++) {
          methodSlots.set(methodNames[i], i);
          this.log(`[INTERFACE SLOT] ${interfaceName}.${methodNames[i]} → [${i}]`);
        }

        this.interfaceTable.set(interfaceName, {
          __methods: methodNames,
          __slots: methodSlots
        });
        this.log(`[INTERFACE DEF] '${interfaceName}' 계약 등록 (${methodNames.length}개 메서드)`);
        return undefined;
      }

      // v7.1: ClassDeclaration 처리 (상속 + vTable)
      case 'ClassDeclaration': {
        const className = (stmt as any).name;
        const superClass = (stmt as any).superClass ?? null;

        // v7.1: 필드 레이아웃 (부모 필드 먼저, 자식 필드 이어붙임)
        const fieldsWithLayout: any[] = [];
        let currentOffset = 0;
        let maxAlignment = 1;

        // 부모 필드 복사 (오프셋 그대로 유지)
        if (superClass) {
          const parentDef = this.classTable.get(superClass);
          if (!parentDef) throw new Error(`[INHERIT ERROR] 부모 클래스 '${superClass}' 미정의`);
          for (const f of parentDef.fields) {
            fieldsWithLayout.push({ ...f });
            currentOffset = f.offset + f.size;
            maxAlignment = Math.max(maxAlignment, f.size);
          }
        }

        // 자식 고유 필드 추가
        for (const f of (stmt as any).fields) {
          const size = this.getTypeSize(f.typeName);
          const alignment = size;
          maxAlignment = Math.max(maxAlignment, alignment);
          const padding = (alignment - currentOffset % alignment) % alignment;
          const offset = currentOffset + padding;
          fieldsWithLayout.push({ name: f.name, typeName: f.typeName, size, offset, padding });
          currentOffset = offset + size;
        }

        const tailPadding = (maxAlignment - currentOffset % maxAlignment) % maxAlignment;
        const totalSize = currentOffset + tailPadding;
        this.structTable.set(className, { fields: fieldsWithLayout, totalSize });

        // v7.1: vTable 구성 (부모 vTable 복사 후 자식 메서드로 교체)
        const parentVTable = superClass ? this.vTableRegistry.get(superClass) : null;
        const vTableMethods: string[] = parentVTable ? [...parentVTable.methods] : [];
        const vTableIndex: Map<string, number> = new Map(parentVTable ? parentVTable.index : []);

        const methodMap = new Map<string, { params: string[]; body: ASTNode }>();
        for (const method of (stmt as any).methods) {
          const fullName = `${className}::${method.name}`;
          const params = ['self', ...method.params];
          this.functionTable.set(fullName, { params, body: method.body });
          methodMap.set(method.name, { params, body: method.body });

          if (vTableIndex.has(method.name)) {
            // 오버라이딩: 기존 인덱스 자리에 새 함수 이름으로 교체
            const idx = vTableIndex.get(method.name)!;
            vTableMethods[idx] = fullName;
            this.log(`[vTABLE OVERRIDE] [${idx}] ${method.name} → ${fullName}`);
          } else {
            // 신규 메서드: vTable 끝에 추가
            const idx = vTableMethods.length;
            vTableMethods.push(fullName);
            vTableIndex.set(method.name, idx);
            this.log(`[vTABLE ADD] [${idx}] ${method.name} → ${fullName}`);
          }
        }

        // v7.3: 인터페이스 계약 검증 (implements)
        const interfaces = (stmt as any).interfaces ?? [];
        for (const ifaceName of interfaces) {
          const iface = this.interfaceTable.get(ifaceName);
          if (!iface) throw new Error(`[CONTRACT ERROR] 인터페이스 '${ifaceName}' 미정의`);

          // 각 인터페이스 메서드가 구현되었는지 검증
          for (const requiredMethod of iface.__methods) {
            if (!methodMap.has(requiredMethod)) {
              throw new Error(`[CONTRACT VIOLATION] 클래스 '${className}'는 인터페이스 '${ifaceName}'의 메서드 '${requiredMethod}'을(를) 구현해야 함`);
            }
          }
          this.log(`[CONTRACT CHECK] '${className}' implements '${ifaceName}' ✅`);
        }

        // v7.2: vTable 정적 주소 할당
        const vTableStaticAddr = `0xVT${this.vTableAddressCounter.toString(16).padStart(3, '0')}`;
        this.vTableAddressCounter += 0x100;

        this.vTableRegistry.set(className, {
          __staticAddress: vTableStaticAddr,
          methods: vTableMethods,
          index: vTableIndex,
          superClass
        });
        this.classTable.set(className, { fields: fieldsWithLayout, totalSize, methods: methodMap });
        this.log(`[CLASS DEF] '${className}' (super: ${superClass ?? 'none'}, ${fieldsWithLayout.length}필드, ${totalSize}bytes, vTable@${vTableStaticAddr})`);
        return undefined;
      }

      // ── v8.1: Exception Handling ────────────────────────────────────────
      case 'TryStatement': {
        // v8.6: catchBlocks 배열 또는 catchBlock 호환성 처리
        const hasCatchBlock = (stmt as any).catchBlocks || (stmt as any).catchBlock;
        const handler: HandlerFrame = {
          returnAddress: hasCatchBlock ? 0 : -1,
          stackPointer: this.callStack.length,
          framePointer: 0,
          catchBlockPC: 0,
          tryStartPC: this.pc,
          exceptionVarName: stmt.exceptionVar,
          // v8.7: FINALLY 블록 저장 (Jump Suspension을 위해)
          finallyBlock: (stmt as any).finallyBlock
        };

        // PUSH_HANDLER: 핸들러 스택에 추가
        if (this.handlerStack.length >= this.MAX_HANDLER_DEPTH) {
          throw new Error(`[HANDLER ERROR] 핸들러 스택 오버플로우 (depth > ${this.MAX_HANDLER_DEPTH})`);
        }

        this.handlerStack.push(handler);
        this.log(`[PUSH_HANDLER] TRY 진입 (depth=${this.handlerStack.length})`);
        this.log(`  → SP=${handler.stackPointer}, FP=${handler.framePointer}`);

        // ── v8.2: SAVE_CONTEXT (컨텍스트 스냅샷 저장) ──────────────────────
        const snapshot: ContextSnapshot = {
          savedSP: this.callStack.length,  // TRY 진입 시의 SP
          savedFP: 0,                       // 현재는 기본값 0
          savedPC: this.pc,                 // 현재 PC
          timestamp: Date.now()
        };
        this.handlerStack[this.handlerStack.length - 1].snapshot = snapshot;
        this.log(`[SAVE_CONTEXT] 스냅샷 저장`);
        this.log(`  → savedSP=${snapshot.savedSP}, savedFP=${snapshot.savedFP}, savedPC=${snapshot.savedPC}`);
        // ────────────────────────────────────────────────────────────────────

        try {
          // TRY 블록 실행
          for (const tryStmt of stmt.tryBlock.statements) {
            this.eval(tryStmt);
          }

          // 정상 종료: POP_HANDLER
          this.handlerStack.pop();
          this.log(`[POP_HANDLER] TRY 정상 종료 (depth=${this.handlerStack.length})`);

          // v8.7: FINALLY 실행 (정상 경로)
          if ((stmt as any).finallyBlock) {
            this.log(`[ENTER_FINALLY] FINALLY 블록 진입 (정상 종료 경로)`);
            // v8.8: FINALLY 예외를 우선 전파
            try {
              for (const finallyStmt of (stmt as any).finallyBlock.statements) {
                this.eval(finallyStmt);
              }
              this.log(`[EXIT_FINALLY] FINALLY 블록 완료`);
            } catch (finallyErr: any) {
              this.log(`[FINALLY EXCEPTION] FINALLY에서 새 예외 발생 → 우선 전파`);
              throw finallyErr;
            }
          }

        } catch (e: any) {
          // ── v8.2: RESTORE_CONTEXT (컨텍스트 복구) ────────────────────────
          const currentHandler = this.handlerStack[this.handlerStack.length - 1];
          const savedSP = currentHandler?.snapshot?.savedSP ?? 0;
          const savedFP = currentHandler?.snapshot?.savedFP ?? 0;

          this.log(`[RESTORE_CONTEXT] 스냅샷 복구`);
          this.log(`  → 저장된 SP: ${savedSP}, 저장된 FP: ${savedFP}`);
          // ────────────────────────────────────────────────────────────────

          // 예외 발생: CATCH 블록으로 이동
          const savedStackPointer = this.handlerStack[this.handlerStack.length - 1]?.stackPointer || 0;

          // 스택 언와인딩: 콜스택을 저장된 포인트로 복원
          while (this.callStack.length > savedStackPointer) {
            this.callStack.pop();
          }

          this.log(`[EXCEPTION CAUGHT] 스택 언와인드 (SP: ${this.callStack.length + (this.callStack.pop() ? 1 : 0)} → ${savedStackPointer})`);

          // v8.5: 예외 객체 또는 메시지 바인딩
          let exceptionValue: any = { __type: 'exception', message: e.message || String(e) };

          // 핸들러에 저장된 Exception 객체가 있으면 그것을 사용
          if (handler && handler.exceptionObject) {
            exceptionValue = handler.exceptionObject;
            this.log(`[BIND EXCEPTION] 예외 객체 = Exception(${exceptionValue.__class || 'Unknown'})`);
          } else {
            this.log(`[BIND EXCEPTION] 예외 = "${e.message || String(e)}" (메시지)`);
          }

          // 핸들러 팝
          this.handlerStack.pop();

          // v8.6: 다형 CATCH - catchBlocks 배열 순회
          const catchBlocks = stmt.catchBlocks || [stmt.catchBlock]; // 하위호환성
          let catchExecuted = false;

          for (const catchBlock of catchBlocks) {
            const exceptionType = (catchBlock as any).exceptionType;
            const exceptionVar = (catchBlock as any).exceptionVar || stmt.exceptionVar;
            const body = (catchBlock as any).body;

            // 타입 필터링: exceptionType이 지정되었으면 isInstanceOf 체크
            if (exceptionType) {
              if (!this.isInstanceOf(exceptionValue, exceptionType)) {
                this.log(`[CATCH SKIP] 타입 불일치: ${exceptionValue.__class || 'Unknown'} ≠ ${exceptionType}`);
                continue; // 다음 CATCH 블록으로
              }
              this.log(`[CATCH MATCH] 타입 일치: ${exceptionValue.__class || 'Unknown'} = ${exceptionType}`);
            } else {
              this.log(`[CATCH MATCH] 타입 필터 없음 (모든 예외 처리)`);
            }

            // v8.8: Exception Chaining - 현재 처리 중인 예외 등록
            const prevHandlingException = this.currentlyHandlingException;
            this.currentlyHandlingException = exceptionValue;
            this.log(`[ENTER_CATCH] 현재 처리 중 예외 등록 (체인 추적 시작)`);

            // 예외 변수 바인딩
            if (exceptionVar) {
              this.variables.set(exceptionVar, exceptionValue);
              this.log(`[BIND EXCEPTION] ${exceptionVar} = Exception(${exceptionValue.__class || 'Unknown'})`);
            }

            // 매칭된 CATCH 블록 실행
            for (const catchStmt of body.statements) {
              this.eval(catchStmt);
            }

            // v8.8: 이전 예외 상태 복구
            this.currentlyHandlingException = prevHandlingException;
            this.log(`[EXIT_CATCH] 예외 상태 복구 (체인 추적 종료)`);

            this.log(`[CATCH COMPLETE] 예외 처리 완료 (${exceptionType || 'default'})`);
            catchExecuted = true;
            break; // 첫 번째 일치 블록만 실행
          }

          // v8.7: FINALLY 실행 (예외 처리 경로 - 재전파 전) - executeStatement 버전
          if ((stmt as any).finallyBlock) {
            this.log(`[ENTER_FINALLY] FINALLY 블록 진입 (예외 처리 경로)`);
            // v8.8: FINALLY 예외를 우선 전파
            try {
              for (const finallyStmt of (stmt as any).finallyBlock.statements) {
                this.eval(finallyStmt);
              }
              this.log(`[EXIT_FINALLY] FINALLY 블록 완료`);
            } catch (finallyErr: any) {
              this.log(`[FINALLY EXCEPTION] FINALLY에서 새 예외 발생 → 우선 전파`);
              throw finallyErr;
            }
          }

          // 일치하는 CATCH 블록이 없으면 예외 재던지기 (FINALLY 후)
          if (!catchExecuted) {
            this.log(`[CATCH UNMATCHED] 일치하는 CATCH 블록 없음 → 예외 재전파`);
            throw e;
          }
        }

        return undefined;
      }

      case 'ThrowStatement': {
        // ── v8.3: Non-local Jump (PC 강제 변경) ──────────────────────────
        // THROW 실행 시 다음:
        // 1. 핸들러 스택 확인
        // 2. PC를 핸들러 PC로 변경 (현재 코드 건너뜀)
        // 3. exception 기록 후 throw (외부 catch로 명령어 완전 중단)

        if (this.handlerStack.length === 0) {
          let message = 'Exception';
          if (stmt.expression && stmt.expression.type === 'CallExpression') {
            if (stmt.expression.arguments && stmt.expression.arguments.length > 0) {
              message = this.eval(stmt.expression.arguments[0]);
            }
          }
          this.log(`[PANIC_NO_HANDLER] throw 실행 중 활성 핸들러 없음 (message: "${message}")`);
          throw new Error(`[PANIC] No active handler for throw: ${message}`);
        }

        // 핸들러에서 복구 PC 읽기
        const handler = this.handlerStack[this.handlerStack.length - 1];
        const jumpPC = handler.snapshot?.savedPC;

        // v8.5: 예외 객체 처리
        // THROW는 Exception 객체를 인자로 받음
        let exceptionObject: any = null;
        let message = 'Exception';

        if (stmt.expression) {
          // 표현식 평가 (Exception 객체 또는 문자열)
          exceptionObject = this.eval(stmt.expression);

          // 객체인지 문자열인지 확인
          if (exceptionObject && typeof exceptionObject === 'object' && exceptionObject.__type === 'object') {
            // Exception 객체 (v8.5)
            message = exceptionObject.Message || 'Exception';
            this.log(`[THROW] 예외 발생: ${exceptionObject.__class}(Message="${message}", Code=${exceptionObject.Code})`);
          } else if (typeof exceptionObject === 'string') {
            // 문자열 메시지 (v8.3 호환)
            message = exceptionObject;
            this.log(`[THROW] 예외 발생: "${message}"`);
          } else {
            // 기타 (숫자 등)
            message = String(exceptionObject);
            this.log(`[THROW] 예외 발생: ${message}`);
          }
        }

        // v8.8: Exception Chaining - 현재 처리 중인 예외가 있으면 Cause로 연결
        if (exceptionObject && exceptionObject.__type === 'object' && this.currentlyHandlingException) {
          exceptionObject.Cause = this.currentlyHandlingException;
          const causeMsg = this.currentlyHandlingException.Message || '(unknown)';
          this.log(`[EXCEPTION CHAIN] SET_CAUSE: "${exceptionObject.Message}" ← "${causeMsg}"`);
        }

        // v8.5: 예외 객체를 핸들러에 저장 (CATCH 블록에서 접근 가능하게)
        handler.exceptionObject = exceptionObject;

        // v8.4: 스택 언와인딩 (Stack Unwinding)
        // PC를 변경하기 전에 중간에 쌓인 프레임들을 모두 파괴
        const targetSP = handler.snapshot?.savedSP ?? 0;
        this.unwindStack(targetSP);

        // PC 강제 변경 (현재 PC를 건너뛰고 CATCH 블록으로 점프)
        this.log(`[PC_REDIRECT] PC 변경: ${this.pc} → ${jumpPC} (핸들러로 점프)`);
        this.pc = jumpPC!; // ← 핵심! PC를 저장된 주소로 변경

        throw new Error(message); // ← 이 예외는 외부 try-catch에서 처리 (eval 중단)
      }
      // ────────────────────────────────────────────────────────────────

      case 'WhileStatement': {
        // v3.3: 루프 시작/재진입 시 처리
        const isFirstEntry = !this.loopStack.includes(this.pc);

        if (isFirstEntry) {
          // 루프 첫 진입: 스택에 저장 (v3.4: 바디 실행 횟수 초기화)
          this.loopStack.push(this.pc);
          this.loopDepthStack.push(this.indentLevel);
          this.loopBodyExecutionCount.push(0); // v3.4: 바디 실행 횟수 (0부터 시작)
          this.loopIterationCounter.push(0); // v3.7: 각 루프의 iteration 카운터 초기화
          this.indentLevel++;

          // v3.4: 조건에서 추적할 변수 추출
          const conditionVars = this.extractVariablesFromCondition(stmt.condition);

          // v3.8: 메모리 상태 보호 시작
          const loopControlVars = this.identifyLoopControlVariables(stmt.condition);
          const preExecutionSnapshot = this.captureFullMemorySnapshot();
          this.loopPreExecutionSnapshot.push(preExecutionSnapshot);
          this.loopControlVariables.push(loopControlVars);

          this.log(`[WHILE] PC=${this.pc} (Loop Head, Depth=${this.loopDepthStack.length - 1})`);
          this.log(`[TRACKED] 조건 변수: ${conditionVars.join(', ')}`);
          this.log(`[SAFETY GUARD] v3.7 활성화 (MAX_SAFE: ${MAX_SAFE_ITERATION.toLocaleString()}, WARN: ${ITERATION_WARNING_THRESHOLD.toLocaleString()})`);
          this.log(`[MEMORY INTEGRITY] v3.8 활성화 - Capture pre-loop state (${preExecutionSnapshot.size} variables)`);
        } else {
          // 루프 재진입 (점프 백)
          const currentDepth = this.loopDepthStack.length - 1;
          const executionCount = this.loopBodyExecutionCount[currentDepth] || 0;

          // v3.9: Jump Table Optimization - 캐시된 점프 확인
          const cachedDestination = this.getJumpDestination(this.pc);

          this.log(`[WHILE] PC=${this.pc} (Loop Reenter, Depth=${currentDepth}, Execution #${executionCount + 1})`);
        }

        // v3.9: Instruction Tuning - 중복 평가 제거
        const currentExecutionNum = this.loopBodyExecutionCount[this.loopDepthStack.length - 1] || 0;

        // 조건 평가 (한 번만!)
        let condition: any;
        if (stmt.condition.type === 'BinaryOp') {
          // v3.5: 복합 조건식은 상세 로깅과 함께 평가
          condition = this.evaluateConditionWithDetails(stmt.condition, currentExecutionNum + 1);
        } else {
          // 단순 조건식은 빠른 평가
          condition = this.eval(stmt.condition);
          this.log(`[CONDITION] (${JSON.stringify(stmt.condition)}) = ${condition}`);
        }

        if (condition) {
          // TRUE: 루프 바디 실행 (v3.4: 메모리 스냅샷)
          const currentDepth = this.loopDepthStack.length - 1;
          this.loopBodyExecutionCount[currentDepth] = (this.loopBodyExecutionCount[currentDepth] || 0) + 1;
          const executionNum = this.loopBodyExecutionCount[currentDepth];
          const conditionVars = this.extractVariablesFromCondition(stmt.condition);

          // v3.7: Safety Guard - 반복 횟수 증가 및 체크
          this.loopIterationCounter[currentDepth] = (this.loopIterationCounter[currentDepth] || 0) + 1;
          this.globalIterationCount++;

          const currentLoopIterations = this.loopIterationCounter[currentDepth];

          // 경고 임계값 체크
          if (currentLoopIterations === ITERATION_WARNING_THRESHOLD) {
            this.log(`[WARN] Safety Guard: Loop ${this.pc} reached warning threshold (${ITERATION_WARNING_THRESHOLD.toLocaleString()} iterations)`);
          }

          // 최대 반복 횟수 체크
          if (currentLoopIterations > MAX_SAFE_ITERATION) {
            this.log(`[PANIC] Safety Guard: MAXIMUM ITERATION EXCEEDED!`);
            this.log(`[PANIC] Loop PC=${this.pc}, Depth=${currentDepth}, Iterations=${currentLoopIterations.toLocaleString()}`);
            this.log(`[PANIC] Global iteration count: ${this.globalIterationCount.toLocaleString()}`);
            this.log(`[PANIC] Forced execution halt to prevent infinite loop`);

            // 안전 종료: 스택 정리
            this.indentLevel--;
            this.loopDepthStack.pop();
            this.loopBodyExecutionCount.pop();
            this.loopIterationCounter.pop();
            this.loopStack.pop();

            throw new Error(`[PANIC] Infinite loop detected! Max iterations (${MAX_SAFE_ITERATION.toLocaleString()}) exceeded at loop PC=${this.pc}`);
          }

          this.log(`[BRANCH] TRUE → 루프 바디 실행 [Iteration: ${currentLoopIterations.toLocaleString()}/${MAX_SAFE_ITERATION.toLocaleString()}]`);

          // v3.4: 루프 시작 전 메모리 스냅샷
          if (conditionVars.length > 0) {
            this.captureMemorySnapshot('START', executionNum, conditionVars);
          }

          // 루프 바디 실행 (모든 문장을 eval()로 처리 - 중첩 루프 포함)
          if (stmt.body.type === 'BlockStatement') {
            for (const bodyStmt of stmt.body.statements) {
              this.eval(bodyStmt);
              // v3.6: break/continue 플래그 확인
              if (this.breakFlag || this.continueFlag) {
                this.log(`[FLAG CHECK] breakFlag=${this.breakFlag}, continueFlag=${this.continueFlag}`);
                break;
              }
            }
          } else {
            this.eval(stmt.body);
          }

          // v3.6: break 플래그 확인 - 루프 탈출
          if (this.breakFlag) {
            this.log(`[BREAK DETECTED] 루프 즉시 탈출`);
            const currentDepth = this.loopDepthStack.length - 1;
            const totalBodyExecutions = this.loopBodyExecutionCount[currentDepth] || 0;
            const totalIterations = this.loopIterationCounter[currentDepth] || 0; // v3.7
            this.log(`[LOOP STATS] 루프 바디 실행: ${totalBodyExecutions}회`);
            this.log(`[SAFETY GUARD] Break exit - Total iterations: ${totalIterations.toLocaleString()}/${MAX_SAFE_ITERATION.toLocaleString()}`); // v3.7

            // v3.8: 메모리 무결성 검증 (break 탈출 시에도)
            const preSnapshot = this.loopPreExecutionSnapshot[currentDepth];
            const postSnapshot = this.captureFullMemorySnapshot();
            const controlVars = this.loopControlVariables[currentDepth];

            if (preSnapshot && controlVars) {
              this.detectMemoryContamination(preSnapshot, postSnapshot, controlVars, currentDepth);
            }

            // 루프 탈출: 스택에서 제거
            this.indentLevel--;
            this.loopDepthStack.pop();
            this.loopBodyExecutionCount.pop();
            this.loopIterationCounter.pop(); // v3.7: 반복 횟수 카운터 제거
            this.loopPreExecutionSnapshot.pop(); // v3.8: 메모리 스냅샷 제거
            this.loopControlVariables.pop(); // v3.8: 루프 제어 변수 제거
            this.loopStack.pop();

            // breakFlag 초기화
            this.breakFlag = false;

            return undefined; // 다음 문으로
          }

          // v3.6: continue 플래그 초기화 (루프 계속)
          if (this.continueFlag) {
            this.log(`[CONTINUE DETECTED] 루프 헤드로 복귀`);
            this.continueFlag = false;
          }

          // v3.4: 루프 종료 후 메모리 스냅샷 및 값 변경 추적
          if (conditionVars.length > 0) {
            this.captureMemorySnapshot('END', executionNum, conditionVars);
          }

          // 루프 바디 끝: PC를 WHILE 위치로 복원
          this.log(`[JUMP BACK] PC=${this.pc}로 복원 (Loop Head로 회귀)`);
          // v3.9: Jump Table Optimization - 루프 점프 캐시
          this.cacheJumpOffset(this.pc, this.pc);
          return this.pc; // 같은 PC로 다시 실행
        } else {
          // FALSE: 루프 탈출
          const currentDepth = this.loopDepthStack.length - 1;
          const totalBodyExecutions = this.loopBodyExecutionCount[currentDepth] || 0;
          const totalIterations = this.loopIterationCounter[currentDepth] || 0; // v3.7: 안전 종료

          this.log(`[BRANCH] FALSE → EXIT STRATEGY 시작 (Depth=${currentDepth})`);
          this.log(`[LOOP STATS] 루프 바디 실행: ${totalBodyExecutions}회`);
          this.log(`[SAFETY GUARD] Safe exit - Total iterations: ${totalIterations.toLocaleString()}/${MAX_SAFE_ITERATION.toLocaleString()}`); // v3.7
          this.log(`[SKIPPING] 루프 바디 전체 건너뜀 (Block: ${JSON.stringify(stmt.body.type)})`);

          if (stmt.body.type === 'BlockStatement') {
            const bodyStmtCount = stmt.body.statements.length;
            this.log(`[EXIT BOUNDARY] 루프 바디: ${bodyStmtCount}개 문장 스킵 확인`);
            this.findExitBoundary(stmt, statements);
          }

          this.log(`[EXIT] 다음 PC(${this.pc + 1})로 점프 (Loop 탈출 완료)`);

          // v3.8: 메모리 무결성 검증
          const preSnapshot = this.loopPreExecutionSnapshot[currentDepth];
          const postSnapshot = this.captureFullMemorySnapshot();
          const controlVars = this.loopControlVariables[currentDepth];

          if (preSnapshot && controlVars) {
            this.detectMemoryContamination(preSnapshot, postSnapshot, controlVars, currentDepth);
          }

          // 루프 탈출: 스택에서 제거
          this.indentLevel--;
          this.loopDepthStack.pop();
          this.loopBodyExecutionCount.pop(); // v3.4: 바디 실행 횟수 카운터 제거
          this.loopIterationCounter.pop(); // v3.7: 반복 횟수 카운터 제거
          this.loopPreExecutionSnapshot.pop(); // v3.8: 메모리 스냅샷 제거
          this.loopControlVariables.pop(); // v3.8: 루프 제어 변수 제거
          this.loopStack.pop();

          return undefined; // 다음 문으로
        }
      }

      case 'IfStatement': {
        this.log(`[IF] 조건 평가 시작`);
        const cond = this.eval(stmt.condition);
        this.log(`[IF] 조건 결과: ${cond}`);
        if (cond) {
          this.log(`[IF] TRUE 브랜치 실행`);
          this.eval(stmt.thenBranch);
          // v3.6: break/continue 플래그 확인
          if (this.breakFlag || this.continueFlag) {
            this.log(`[IF] breakFlag=${this.breakFlag}, continueFlag=${this.continueFlag} 발견 - 즉시 반환`);
          }
        } else if (stmt.elseBranch) {
          this.log(`[IF] FALSE 브랜치 실행`);
          this.eval(stmt.elseBranch);
          // v3.6: break/continue 플래그 확인
          if (this.breakFlag || this.continueFlag) {
            this.log(`[IF] breakFlag=${this.breakFlag}, continueFlag=${this.continueFlag} 발견 - 즉시 반환`);
          }
        }
        return undefined;
      }

      default: {
        this.eval(stmt);
        return undefined;
      }
    }
  }

  /**
   * AST 평가 (원래의 eval 로직)
   */
  private eval(node: ASTNode): any {
    if (!node) return null;

    // v7.0: Program 타입 처리 (Forward Declaration Pass 포함)
    if (node.type === 'Program') {
      const statements = (node as any).statements || [];
      // Pass 1: Forward Declaration (함수 & 클래스 미리 등록)
      for (const stmt of statements) {
        if (stmt && stmt.type === 'FunctionDeclaration') {
          this.functionTable.set(stmt.name, { params: stmt.params, body: stmt.body });
          this.typeSignatureTable.set(stmt.name, {
            paramCount: stmt.params.length,
            returnType: null,
            callCount: 0,
            is_analyzing: false,
            typeCheckCount: 0
          });
          this.log(`[FORWARD DECL] '${stmt.name}' 사전 등록 (params: ${stmt.params.length}개)`);
        } else if (stmt && stmt.type === 'ClassDeclaration') {
          this.eval(stmt);
        }
      }
      // Pass 2: 실제 실행
      let result: any = null;
      for (const stmt of statements) {
        result = this.eval(stmt);
      }
      return result;
    }

    switch (node.type) {
      case 'NumberLiteral':
        return node.value;

      case 'StringLiteral':
        return node.value;

      case 'BooleanLiteral':
        return node.value;

      case 'NullLiteral':
        return null;

      case 'Identifier':
        return this.variables.get(node.name);

      case 'VariableDeclaration': {
        const val = this.eval(node.value);
        const varName = node.name;

        // v7.5 Phase 2: 초기값이 객체면 RefCount 추적 (Acquire)
        // 주의: NewExpression이 이미 refCount=1로 초기화하므로,
        // 변수 선언 시점에서는 refCount를 더 증가시키지 않음
        // (객체의 첫 소유권을 얻는 것이므로)

        this.variables.set(varName, val);
        // v4.2: DELIVERY 추적 — 함수 호출 결과가 변수에 안착하는 순간
        if (node.value?.type === 'CallExpression') {
          const callee = node.value.callee?.name ?? '?';
          this.log(`[DELIVERY] '${callee}()' 반환값 ${val} → '${node.name}'`);
        }
        return val;
      }

      case 'Assignment': {
        const val = this.eval(node.value);
        const varName = node.name;

        // v7.5 Phase 2: Reference Acquire/Release
        // Step 1: 이전 값이 객체면 Release (refCount--)
        const oldValue = this.variables.get(varName);
        if (oldValue && typeof oldValue === 'object' && oldValue.__refCount !== undefined) {
          oldValue.__refCount--;
          this.log(`[REFCOUNT RELEASE] ${oldValue.__class} @ ${oldValue.__objectId}, RefCount: ${oldValue.__refCount + 1} → ${oldValue.__refCount}`);

          // 자동 소멸 (refCount == 0일 때)
          if (oldValue.__refCount === 0) {
            this.callDestructor(oldValue);
            const objectKey = `${oldValue.__class}@${oldValue.__baseAddr}`;
            this.instanceTracker.delete(objectKey);
            this.log(`[MEMORY FREE] ${oldValue.__class} @ ${oldValue.__objectId} 자동 해제됨`);
          }
        }

        // Step 2: 새로운 값이 객체면 Acquire (refCount++)
        if (val && typeof val === 'object' && val.__refCount !== undefined) {
          val.__refCount++;
          this.log(`[REFCOUNT ACQUIRE] ${val.__class} @ ${val.__objectId}, RefCount: ${val.__refCount - 1} → ${val.__refCount}`);
        }

        // Step 3: 변수에 새 값 할당
        this.variables.set(varName, val);

        // v4.2: DELIVERY 추적
        if (node.value?.type === 'CallExpression') {
          const callee = node.value.callee?.name ?? '?';
          this.log(`[DELIVERY] '${callee}()' 반환값 ${val} → '${node.name}'`);
        }
        return val;
      }

      case 'IndexAssignment': {
        // v5.0: 배열 인덱스 쓰기 — Bounds Check + 주소 계산 + 기록
        const arr = this.eval(node.object);
        const idx = this.eval(node.index);
        const val = this.eval(node.value);
        if (!Array.isArray(arr)) {
          throw new Error(`[INDEX ERROR] 배열이 아닌 변수에 인덱스 할당 불가`);
        }
        // v5.1: 변수 인덱스 감지 — Dynamic Indexing (런타임 주소 계산)
        if (node.index.type === 'Identifier') {
          this.log(`[DYNAMIC INDEX] '${node.index.name}' = ${idx} → 런타임 주소 계산`);
        }
        // v5.3: Header-based Access Validation — 헤더 조회 후 유효 범위 확인
        this.log(`[HEADER READ] Base-1: size=${arr.length} 조회 → 유효 범위 [0, ${arr.length - 1}]`);
        this.log(`[BOUNDS CHECK] 인덱스 ${idx} vs 배열 크기 ${arr.length}`);
        if (idx < 0 || idx >= arr.length) {
          // v5.3: Violation Handling — 정밀 침범 기록
          this.log(`[BOUNDARY VIOLATION] 인덱스 ${idx} ≥ size ${arr.length} — 허가된 영역 침범 감지!`);
          this.log(`[VIOLATION LOG] 위반 위치: [${idx}], 허용 범위: [0, ${arr.length - 1}], 위반 시도: ${val} 쓰기`);
          throw new Error(`[INDEX OUT OF BOUNDS] 인덱스 ${idx} 가 범위 [0, ${arr.length - 1}] 를 벗어남`);
        }
        const prev = arr[idx];
        arr[idx] = val;
        this.log(`[INDEX WRITE] Base+${idx}×1: ${prev} → ${val} (데이터 오염 0%)`);
        return val;
      }

      case 'ArrayLiteral': {
        // v5.0: 리터럴 배열 생성 — 연속 메모리 할당 로그
        const elems = node.elements.map((e: ASTNode) => this.eval(e));
        this.log(`[ARRAY ALLOC] 리터럴 크기 ${elems.length} → [${elems.join(', ')}]`);
        // v5.3: Metadata Header
        this.log(`[HEADER WRITE] Base-1: size=${elems.length} 기록 완료 (Metadata Header 영역)`);
        // v8.3: 배열에 __type 메타데이터 추가 (메서드 호출 지원)
        const arrObj = elems as any;
        arrObj.__type = 'array';
        return arrObj;
      }

      case 'BinaryOp':
        return this.evalBinaryOp(node);

      case 'UnaryOp':
        return this.evalUnaryOp(node);

      case 'CallExpression':
        return this.evalCall(node);

      // v7.2: NEW 표현식 (new ClassName()) + vPtr 족보 기입
      case 'NewExpression': {
        const newExpr = node as any;
        const className = newExpr.className;
        const classDef = this.classTable.get(className);
        if (!classDef) throw new Error(`[CLASS ERROR] 클래스 '${className}' 미정의`);

        // v7.5: RefCount 필드 추가 (객체 메모리 구조 확장)
        const instance: any = {
          __type: 'object',
          __class: className,
          __typeName: className,
          __refCount: 1,  // v7.5: Reference Count (초기값 1)
          __objectId: ++this.objectIdCounter  // v7.5: 고유 ID
        };
        for (const field of classDef.fields) {
          instance[field.name] = 0;  // 필드 0 초기화
        }
        // 0x6000 영역: 클래스 인스턴스 전용 (struct 0x2000, struct배열 0x4000과 구분)
        const allocIdx = this.variables.size;
        const baseAddr = `0x${(0x6000 + allocIdx * 0x10).toString(16).padStart(4, '0')}`;
        instance.__baseAddr = baseAddr;

        // v7.2: vPtr 족보 기입 (vTable 정적 주소)
        const vTable = this.vTableRegistry.get(className);
        instance.__vPtr = vTable ?? null;

        // v7.5: Instance Tracker에 등록 (모든 살아있는 객체 추적)
        const objectKey = `${className}@${baseAddr}`;
        this.instanceTracker.set(objectKey, {
          className,
          refCount: 1,
          address: baseAddr,
          createdAt: this.callStack.length,
          size: classDef.totalSize
        });

        // v7.2: 물리적 메모리처럼 명시
        const vTableAddr = vTable?.__staticAddress ?? 'null';
        this.log(`[CLASS ALLOC] new ${className}() @ ${baseAddr}`);
        this.log(`  → HEAP[${baseAddr}+0] = ${vTableAddr}  // vPtr 족보 기입 (메서드 테이블 주소)`);
        this.log(`  → HEAP[${baseAddr}+4] = ${instance.__refCount}  // v7.5: RefCount (객체 참조 카운트)`);
        this.log(`  → FIELDS: ${classDef.fields.map((f: any) => `${f.name}@[${baseAddr}+${f.offset + 8}]`).join(', ')}`);
        this.log(`  → TOTAL SIZE: ${classDef.totalSize + 8} bytes (vPtr+RefCount+fields)`);
        this.log(`[REFCOUNT] ${className}#${instance.__objectId} RefCount=1 (신규 생성)`);

        return instance;
      }

      case 'IndexExpression': {
        // v5.0: 인덱스 읽기 — Bounds Check + 주소 계산
        const obj = this.eval(node.object);
        const idx = this.eval(node.index);
        if (!Array.isArray(obj)) {
          throw new Error(`[INDEX ERROR] 배열이 아닌 값에 인덱스 접근 불가`);
        }
        // v5.1: 변수 인덱스 감지 — Dynamic Indexing (런타임 주소 계산)
        if (node.index.type === 'Identifier') {
          this.log(`[DYNAMIC INDEX] '${node.index.name}' = ${idx} → 런타임 주소 계산`);
        }
        // v5.3: Header-based Access Validation
        this.log(`[HEADER READ] Base-1: size=${obj.length} 조회 → 유효 범위 [0, ${obj.length - 1}]`);
        this.log(`[BOUNDS CHECK] 인덱스 ${idx} vs 배열 크기 ${obj.length}`);
        if (idx < 0 || idx >= obj.length) {
          // v5.3: Violation Handling
          this.log(`[BOUNDARY VIOLATION] 인덱스 ${idx} ≥ size ${obj.length} — 허가된 영역 침범 감지!`);
          this.log(`[VIOLATION LOG] 위반 위치: [${idx}], 허용 범위: [0, ${obj.length - 1}], 위반 시도: 읽기`);
          throw new Error(`[INDEX OUT OF BOUNDS] 인덱스 ${idx} 가 범위 [0, ${obj.length - 1}] 를 벗어남`);
        }
        const val = obj[idx];
        this.log(`[INDEX READ ] Base+${idx}×1 = ${val}`);
        return val;
      }

      // v5.7/v5.8: 구조체 멤버 읽기 (단일 구조체 또는 구조체 배열)
      case 'MemberExpression': {
        // v5.8: army[i].field 형태 처리
        if (node.object.type === 'IndexExpression') {
          const arrExpr = node.object;
          const arrObj = this.eval(arrExpr.object);

          if (arrObj && arrObj.__type === 'struct_array') {
            const idx = this.eval(arrExpr.index);
            const structDef = arrObj.__structDef;
            const fieldDef = structDef.fields.find((f: any) => f.name === node.field);

            if (!fieldDef) throw new Error(`[MEMBER ERROR] '${arrObj.__typeName}'에 '${node.field}' 필드 없음`);
            if (idx < 0 || idx >= arrObj.__count) {
              this.log(`[BOUNDARY VIOLATION] 인덱스 ${idx} ≥ count ${arrObj.__count}`);
              throw new Error(`[INDEX OUT OF BOUNDS] 구조체 배열 인덱스 ${idx} 가 범위를 벗어남`);
            }

            const stride = arrObj.__stride;
            const fieldOffset = fieldDef.offset;
            const linearIdx = idx * stride + fieldOffset;
            const value = arrObj.__data[linearIdx];

            const arrName = arrExpr.object.name;
            const elemAddr = parseInt(arrObj.__baseAddr, 16) + (idx * stride);
            const fieldAddr = `0x${(elemAddr + fieldOffset).toString(16).padStart(4, '0')}`;

            this.log(`[STRIDE INDEX] ${arrName}[${idx}].${node.field} → Base(${arrObj.__baseAddr}) + ${idx}×${stride} + ${fieldOffset}`);
            this.log(`[STRIDE ACCESS] ${arrName}[${idx}].${node.field} → linear_idx=${linearIdx} → ${fieldAddr} → ${value}`);

            return value;
          }
        }

        // v5.7: p1.field 형태 (단일 구조체 또는 v7.0 object)
        const obj = this.eval(node.object);

        // v8.3: 배열 속성 접근 (length, etc)
        if (obj && obj.__type === 'array') {
          const value = obj[node.field];
          this.log(`[ARRAY PROPERTY] ${node.object.name}.${node.field} → ${value}`);
          return value;
        }

        if (!obj || (obj.__type !== 'struct' && obj.__type !== 'object')) throw new Error(`[MEMBER ERROR] 구조체나 객체가 아님`);

        // v8.5: 메타 필드 먼저 확인 (__class, __type, __typeName, __baseAddr, __vPtr 등)
        if (node.field in obj) {
          const value = obj[node.field];
          this.log(`[MEMBER ACCESS] ${node.object.name}.${node.field} → ${value}`);
          return value;
        }

        const structDef = this.structTable.get(obj.__typeName);
        const fieldDef = structDef?.fields.find((f: any) => f.name === node.field);
        if (!fieldDef) throw new Error(`[MEMBER ERROR] '${obj.__typeName}'에 '${node.field}' 필드 없음`);

        // v7.4: 접근 제어 검증 (필드가 정의된 클래스 기준)
        const fieldAccess = (fieldDef as any).access || 'public';  // 기본값: public
        const definedInClass = (fieldDef as any).definedIn || obj.__typeName;  // v7.4: 정의된 클래스
        this.validateMemberAccess(fieldAccess, definedInClass, node.field);

        const value = obj[node.field];
        this.log(`[MEMBER ACCESS] ${node.object.name}.${node.field} → offset=${fieldDef.offset} → ${value}`);
        return value;
      }

      // v5.7/v5.8: 구조체 멤버 쓰기 (단일 구조체 또는 구조체 배열)
      case 'MemberAssignment': {
        // v5.8: army[i].field = value 형태 처리
        if (node.object.type === 'IndexExpression') {
          const arrExpr = node.object;
          const arrObj = this.eval(arrExpr.object);

          if (arrObj && arrObj.__type === 'struct_array') {
            const idx = this.eval(arrExpr.index);
            const structDef = arrObj.__structDef;
            const fieldDef = structDef.fields.find((f: any) => f.name === node.field);

            if (!fieldDef) throw new Error(`[MEMBER ERROR] '${arrObj.__typeName}'에 '${node.field}' 필드 없음`);
            if (idx < 0 || idx >= arrObj.__count) {
              this.log(`[BOUNDARY VIOLATION] 인덱스 ${idx} ≥ count ${arrObj.__count}`);
              throw new Error(`[INDEX OUT OF BOUNDS] 구조체 배열 인덱스 ${idx} 가 범위를 벗어남`);
            }

            const stride = arrObj.__stride;
            const fieldOffset = fieldDef.offset;
            const linearIdx = idx * stride + fieldOffset;
            const value = this.eval(node.value);

            arrObj.__data[linearIdx] = value;
            const elemAddr = parseInt(arrObj.__baseAddr, 16) + (idx * stride);
            const fieldAddr = `0x${(elemAddr + fieldOffset).toString(16).padStart(4, '0')}`;

            const arrName = arrExpr.object.name;
            this.log(`[STRIDE INDEX] ${arrName}[${idx}].${node.field} → Base(${arrObj.__baseAddr}) + ${idx}×${stride} + ${fieldOffset}`);
            this.log(`[STRIDE WRITE] ${arrName}[${idx}].${node.field} = ${value} → linear_idx=${linearIdx} → ${fieldAddr}`);

            return value;
          }
        }

        // v5.7: p1.field = value 형태 (단일 구조체)
        const objName = node.object.name ?? node.object.object?.name;
        const obj = this.variables.get(objName);
        if (!obj || (obj.__type !== 'struct' && obj.__type !== 'object')) throw new Error(`[MEMBER ERROR] ${objName}은 구조체나 객체가 아님`);
        const structDef = this.structTable.get(obj.__typeName);
        const fieldDef = structDef?.fields.find((f: any) => f.name === node.field);
        if (!fieldDef) throw new Error(`[MEMBER ERROR] '${obj.__typeName}'에 '${node.field}' 필드 없음`);

        // v7.4: 접근 제어 검증 (필드가 정의된 클래스 기준)
        const fieldAccess = (fieldDef as any).access || 'public';  // 기본값: public
        const definedInClass = (fieldDef as any).definedIn || obj.__typeName;  // v7.4: 정의된 클래스
        this.validateMemberAccess(fieldAccess, definedInClass, node.field);

        const value = this.eval(node.value);
        obj[node.field] = value;
        const fieldAddr = `0x${(parseInt(obj.__baseAddr, 16) + fieldDef.offset).toString(16).padStart(4, '0')}`;
        this.log(`[MEMBER WRITE] ${objName}.${node.field} = ${value} → offset=${fieldDef.offset} → ${fieldAddr}`);
        return value;
      }

      case 'FunctionDeclaration': {
        // v4.0: eval() 내에서 함수 정의 만나면 등록만 (실행 안 함)
        this.functionTable.set(node.name, { params: node.params, body: node.body });
        this.log(`[FUNC DEF] '${node.name}' 등록 (params: [${node.params.join(', ')}])`);
        return null;
      }

      // v7.3: InterfaceDeclaration 처리
      case 'InterfaceDeclaration': {
        const interfaceName = (node as any).name;
        const methods = (node as any).methods;
        const methodNames = methods.map((m: any) => m.name);
        const methodSlots = new Map<string, number>();

        for (let i = 0; i < methodNames.length; i++) {
          methodSlots.set(methodNames[i], i);
          this.log(`[INTERFACE SLOT] ${interfaceName}.${methodNames[i]} → [${i}]`);
        }

        this.interfaceTable.set(interfaceName, {
          __methods: methodNames,
          __slots: methodSlots
        });
        this.log(`[INTERFACE DEF] '${interfaceName}' 계약 등록 (${methodNames.length}개 메서드)`);
        return null;
      }

      // v7.0: ClassDeclaration 처리 (eval 메서드)
      case 'ClassDeclaration': {
        const className = (node as any).name;
        const superClass = (node as any).superClass ?? null;

        // v7.1: 필드 레이아웃 (부모 필드 먼저, 자식 필드 이어붙임)
        const fieldsWithLayout: any[] = [];
        let currentOffset = 0;
        let maxAlignment = 1;

        // 부모 필드 복사 (오프셋 그대로 유지)
        if (superClass) {
          const parentDef = this.classTable.get(superClass);
          if (!parentDef) throw new Error(`[INHERIT ERROR] 부모 클래스 '${superClass}' 미정의`);
          for (const f of parentDef.fields) {
            // v7.4: definedIn 정보 유지 (필드가 정의된 원본 클래스)
            fieldsWithLayout.push({ ...f, definedIn: (f as any).definedIn || superClass });
            currentOffset = f.offset + f.size;
            maxAlignment = Math.max(maxAlignment, f.size);
          }
        }

        // 자식 고유 필드 추가
        for (const f of (node as any).fields) {
          const size = this.getTypeSize(f.typeName);
          const alignment = size;
          maxAlignment = Math.max(maxAlignment, alignment);
          const padding = (alignment - currentOffset % alignment) % alignment;
          const offset = currentOffset + padding;
          // v7.4: access 속성 포함, definedIn 설정 (현재 클래스에서 정의됨)
          fieldsWithLayout.push({ name: f.name, typeName: f.typeName, size, offset, padding, access: f.access || 'public', definedIn: className });
          currentOffset = offset + size;
        }

        const tailPadding = (maxAlignment - currentOffset % maxAlignment) % maxAlignment;
        const totalSize = currentOffset + tailPadding;
        this.structTable.set(className, { fields: fieldsWithLayout, totalSize });

        // v7.1: vTable 구성 (부모 vTable 복사 후 자식 메서드로 교체)
        const parentVTable = superClass ? this.vTableRegistry.get(superClass) : null;
        const vTableMethods: string[] = parentVTable ? [...parentVTable.methods] : [];
        const vTableIndex: Map<string, number> = new Map(parentVTable ? parentVTable.index : []);

        const methodMap = new Map<string, { params: string[]; body: ASTNode }>();
        for (const method of (node as any).methods) {
          const fullName = `${className}::${method.name}`;
          const params = ['self', ...method.params];
          this.functionTable.set(fullName, { params, body: method.body });
          methodMap.set(method.name, { params, body: method.body });

          if (vTableIndex.has(method.name)) {
            // 오버라이딩: 기존 인덱스 자리에 새 함수 이름으로 교체
            const idx = vTableIndex.get(method.name)!;
            vTableMethods[idx] = fullName;
            this.log(`[vTABLE OVERRIDE] [${idx}] ${method.name} → ${fullName}`);
          } else {
            // 신규 메서드: vTable 끝에 추가
            const idx = vTableMethods.length;
            vTableMethods.push(fullName);
            vTableIndex.set(method.name, idx);
            this.log(`[vTABLE ADD] [${idx}] ${method.name} → ${fullName}`);
          }
        }

        // v7.3: 인터페이스 계약 검증 (implements)
        const interfaces = (node as any).interfaces ?? [];
        for (const ifaceName of interfaces) {
          const iface = this.interfaceTable.get(ifaceName);
          if (!iface) throw new Error(`[CONTRACT ERROR] 인터페이스 '${ifaceName}' 미정의`);

          // 각 인터페이스 메서드가 구현되었는지 검증
          for (const requiredMethod of iface.__methods) {
            if (!methodMap.has(requiredMethod)) {
              throw new Error(`[CONTRACT VIOLATION] 클래스 '${className}'는 인터페이스 '${ifaceName}'의 메서드 '${requiredMethod}'을(를) 구현해야 함`);
            }
          }
          this.log(`[CONTRACT CHECK] '${className}' implements '${ifaceName}' ✅`);
        }

        // v7.2: vTable 정적 주소 할당
        const vTableStaticAddr = `0xVT${this.vTableAddressCounter.toString(16).padStart(3, '0')}`;
        this.vTableAddressCounter += 0x100;

        this.vTableRegistry.set(className, {
          __staticAddress: vTableStaticAddr,
          methods: vTableMethods,
          index: vTableIndex,
          superClass
        });
        // v7.4: superClass를 classTable에도 추가 (access control 검증용)
        this.classTable.set(className, { fields: fieldsWithLayout, totalSize, methods: methodMap, superClass });
        this.log(`[CLASS DEF] '${className}' (super: ${superClass ?? 'none'}, ${fieldsWithLayout.length}필드, ${totalSize}bytes, vTable@${vTableStaticAddr})`);
        return null;
      }

      case 'ReturnStatement': {
        // v6.3: TCO - 꼬리 호출 감지 (callExpression이고 현재 함수 자신을 호출)
        if (
          node.value &&
          node.value.type === 'CallExpression' &&
          node.value.callee?.type === 'Identifier' &&
          this.callStack.length > 0 &&
          node.value.callee.name === this.callStack[this.callStack.length - 1].functionName
        ) {
          const tcoArgs = node.value.arguments.map((a: ASTNode) => this.eval(a));
          this.tcoFlag = true;
          this.tcoCallArgs = tcoArgs;
          this.returnFlag = true;
          this.log(`[TCO DETECTED] '${node.value.callee.name}' 꼬리 호출 감지, args=[${tcoArgs.join(', ')}]`);
          return undefined;
        }
        // 일반 반환
        const retVal = node.value ? this.eval(node.value) : null;
        this.returnValue = retVal;
        this.returnFlag = true;
        this.log(`[RETURN] 반환값: ${retVal}`);
        return retVal;
      }

      case 'BlockStatement': {
        let blockResult = null;
        for (const stmt of node.statements) {
          blockResult = this.eval(stmt);
          // v3.6: break/continue / v4.0: return 플래그 확인
          if (this.breakFlag || this.continueFlag || this.returnFlag) {
            break; // BlockStatement 평가 중단
          }
        }
        return blockResult;
      }

      case 'IfStatement': {
        // v3.6: eval() 기반 IfStatement 처리 (nested 루프 내부용)
        // v6.0: returnFlag 확인 추가 (재귀 함수의 기저 사례 처리)
        this.log(`[IF-EVAL] 조건 평가 시작`);
        const cond = this.eval(node.condition);
        this.log(`[IF-EVAL] 조건 결과: ${cond}`);
        if (cond) {
          this.log(`[IF-EVAL] TRUE 브랜치 실행`);
          const thenResult = this.eval(node.thenBranch);
          if (this.breakFlag || this.continueFlag || this.returnFlag) {
            this.log(`[IF-EVAL] breakFlag=${this.breakFlag}, continueFlag=${this.continueFlag}, returnFlag=${this.returnFlag} 감지`);
          }
          return thenResult;
        } else if (node.elseBranch) {
          this.log(`[IF-EVAL] FALSE 브랜치 실행`);
          const elseResult = this.eval(node.elseBranch);
          if (this.breakFlag || this.continueFlag || this.returnFlag) {
            this.log(`[IF-EVAL] breakFlag=${this.breakFlag}, continueFlag=${this.continueFlag}, returnFlag=${this.returnFlag} 감지`);
          }
          return elseResult;
        }
        return null;
      }

      case 'WhileStatement': {
        // v3.3: 중첩 루프 처리 (eval 기반)
        this.indentLevel++;
        const nestedLoopDepth = this.indentLevel - 1;
        this.log(`[WHILE] Nested Loop (Depth=${nestedLoopDepth})`);
        this.log(`[SAFETY GUARD] v3.7 활성화 (MAX_SAFE: ${MAX_SAFE_ITERATION.toLocaleString()}, WARN: ${ITERATION_WARNING_THRESHOLD.toLocaleString()})`);

        // v3.8: 중첩 루프의 메모리 상태 보호
        const nestedLoopControlVars = this.identifyLoopControlVariables(node.condition);
        const nestedPreSnapshot = this.captureFullMemorySnapshot();

        this.log(`[MEMORY INTEGRITY] v3.8 활성화 - Capture pre-nested-loop state (${nestedPreSnapshot.size} variables)`);

        let result = null;
        let nestedIterationCount = 0; // v3.7: 중첩 루프 반복 횟수

        while (this.eval(node.condition) && !this.breakFlag && !this.returnFlag) {
          // v3.7: Safety Guard - nested 루프 반복 횟수 증가 및 체크
          nestedIterationCount++;
          this.globalIterationCount++;

          // 경고 임계값 체크
          if (nestedIterationCount === ITERATION_WARNING_THRESHOLD) {
            this.log(`[WARN] Safety Guard: Nested loop (depth=${nestedLoopDepth}) reached warning threshold (${ITERATION_WARNING_THRESHOLD.toLocaleString()} iterations)`);
          }

          // 최대 반복 횟수 체크
          if (nestedIterationCount > MAX_SAFE_ITERATION) {
            this.log(`[PANIC] Safety Guard: MAXIMUM ITERATION EXCEEDED (nested)!`);
            this.log(`[PANIC] Nested Loop Depth=${nestedLoopDepth}, Iterations=${nestedIterationCount.toLocaleString()}`);
            this.log(`[PANIC] Global iteration count: ${this.globalIterationCount.toLocaleString()}`);
            this.log(`[PANIC] Forced execution halt to prevent infinite loop`);
            this.indentLevel--;
            throw new Error(`[PANIC] Infinite nested loop detected! Max iterations (${MAX_SAFE_ITERATION.toLocaleString()}) exceeded at depth=${nestedLoopDepth}`);
          }

          this.log(`    [CONDITION] = true [Iteration: ${nestedIterationCount.toLocaleString()}/${MAX_SAFE_ITERATION.toLocaleString()}]`);
          this.continueFlag = false; // v3.6: continue 플래그 초기화
          result = this.eval(node.body);
          // v3.6: break는 루프 탈출, continue는 다음 회차로
          if (this.breakFlag) {
            this.log(`    [BREAK] 루프 탈출`);
            this.breakFlag = false;
            break;
          }
          if (this.continueFlag) {
            this.log(`    [CONTINUE] 다음 회차로`);
            this.continueFlag = false;
            // 루프의 조건 재평가로 자동 진행
          }
        }

        // v3.8: 중첩 루프 메모리 무결성 검증
        const nestedPostSnapshot = this.captureFullMemorySnapshot();
        this.detectMemoryContamination(nestedPreSnapshot, nestedPostSnapshot, nestedLoopControlVars, nestedLoopDepth);

        this.log(`[WHILE END] (Depth=${nestedLoopDepth}) - Safe exit: ${nestedIterationCount.toLocaleString()} iterations`);
        this.indentLevel--;
        return result;
      }

      case 'BreakStatement': {
        // v3.6: break 문
        this.log(`[BREAK SIGNAL] break 감지`);
        this.breakFlag = true;
        return null;
      }

      // ── v8.1: Exception Handling (eval용) ────────────────────────────────────
      case 'TryStatement': {
        // v8.6: catchBlocks 배열 또는 catchBlock 호환성 처리
        const hasCatchBlock = (node as any).catchBlocks || (node as any).catchBlock;
        const handler: HandlerFrame = {
          returnAddress: hasCatchBlock ? 0 : -1,
          stackPointer: this.callStack.length,
          framePointer: 0,
          catchBlockPC: 0,
          tryStartPC: this.pc,
          exceptionVarName: (node as any).exceptionVar,
          // v8.7: FINALLY 블록 저장 (Jump Suspension을 위해)
          finallyBlock: (node as any).finallyBlock
        };

        // PUSH_HANDLER: 핸들러 스택에 추가
        if (this.handlerStack.length >= this.MAX_HANDLER_DEPTH) {
          throw new Error(`[HANDLER ERROR] 핸들러 스택 오버플로우 (depth > ${this.MAX_HANDLER_DEPTH})`);
        }

        this.handlerStack.push(handler);
        this.log(`[PUSH_HANDLER] TRY 진입 (depth=${this.handlerStack.length})`);
        this.log(`  → SP=${handler.stackPointer}, FP=${handler.framePointer}`);

        // ── v8.2: SAVE_CONTEXT (컨텍스트 스냅샷 저장) ──────────────────────
        const snapshot: ContextSnapshot = {
          savedSP: this.callStack.length,  // TRY 진입 시의 SP
          savedFP: 0,                       // 현재는 기본값 0
          savedPC: this.pc,                 // 현재 PC
          timestamp: Date.now()
        };
        this.handlerStack[this.handlerStack.length - 1].snapshot = snapshot;
        this.log(`[SAVE_CONTEXT] 스냅샷 저장`);
        this.log(`  → savedSP=${snapshot.savedSP}, savedFP=${snapshot.savedFP}, savedPC=${snapshot.savedPC}`);
        // ────────────────────────────────────────────────────────────────────

        try {
          // TRY 블록 실행
          for (const tryStmt of (node as any).tryBlock.statements) {
            this.eval(tryStmt);
          }

          // 정상 종료: POP_HANDLER
          this.handlerStack.pop();
          this.log(`[POP_HANDLER] TRY 정상 종료 (depth=${this.handlerStack.length})`);

          // v8.7: FINALLY 실행 (정상 경로)
          if ((node as any).finallyBlock) {
            this.log(`[ENTER_FINALLY] FINALLY 블록 진입 (정상 종료 경로)`);
            // v8.8: FINALLY 예외를 우선 전파
            try {
              for (const finallyStmt of (node as any).finallyBlock.statements) {
                this.eval(finallyStmt);
              }
              this.log(`[EXIT_FINALLY] FINALLY 블록 완료`);
            } catch (finallyErr: any) {
              this.log(`[FINALLY EXCEPTION] FINALLY에서 새 예외 발생 → 우선 전파`);
              throw finallyErr;
            }
          }

        } catch (e: any) {
          // ── v8.2: RESTORE_CONTEXT (컨텍스트 복구) ────────────────────────
          const currentHandler = this.handlerStack[this.handlerStack.length - 1];
          const savedSP = currentHandler?.snapshot?.savedSP ?? 0;
          const savedFP = currentHandler?.snapshot?.savedFP ?? 0;

          this.log(`[RESTORE_CONTEXT] 스냅샷 복구`);
          this.log(`  → 저장된 SP: ${savedSP}, 저장된 FP: ${savedFP}`);
          // ────────────────────────────────────────────────────────────────

          // 예외 발생: CATCH 블록으로 이동
          const savedStackPointer = this.handlerStack[this.handlerStack.length - 1]?.stackPointer || 0;

          // 스택 언와인딩: 콜스택을 저장된 포인트로 복원
          while (this.callStack.length > savedStackPointer) {
            this.callStack.pop();
          }

          this.log(`[EXCEPTION CAUGHT] 스택 언와인드 (SP: ${this.callStack.length + (this.callStack.pop() ? 1 : 0)} → ${savedStackPointer})`);

          // v8.5: 예외 객체 또는 메시지 바인딩
          let exceptionValue: any = { __type: 'exception', message: e.message || String(e) };

          // 핸들러에 저장된 Exception 객체가 있으면 그것을 사용
          if (currentHandler && currentHandler.exceptionObject) {
            exceptionValue = currentHandler.exceptionObject;
            this.log(`[BIND EXCEPTION] 예외 객체 = Exception(${exceptionValue.__class || 'Unknown'})`);
          } else {
            this.log(`[BIND EXCEPTION] 예외 = "${e.message || String(e)}" (메시지)`);
          }

          // 핸들러 팝
          this.handlerStack.pop();

          // v8.6: 다형 CATCH - catchBlocks 배열 순회
          const catchBlocks = (node as any).catchBlocks || [(node as any).catchBlock]; // 하위호환성
          let catchExecuted = false;

          for (const catchBlock of catchBlocks) {
            const exceptionType = (catchBlock as any).exceptionType;
            const exceptionVar = (catchBlock as any).exceptionVar || (node as any).exceptionVar;
            const body = (catchBlock as any).body;

            // 타입 필터링: exceptionType이 지정되었으면 isInstanceOf 체크
            if (exceptionType) {
              if (!this.isInstanceOf(exceptionValue, exceptionType)) {
                this.log(`[CATCH SKIP] 타입 불일치: ${exceptionValue.__class || 'Unknown'} ≠ ${exceptionType}`);
                continue; // 다음 CATCH 블록으로
              }
              this.log(`[CATCH MATCH] 타입 일치: ${exceptionValue.__class || 'Unknown'} = ${exceptionType}`);
            } else {
              this.log(`[CATCH MATCH] 타입 필터 없음 (모든 예외 처리)`);
            }

            // v8.8: Exception Chaining - 현재 처리 중인 예외 등록
            const prevHandlingException = this.currentlyHandlingException;
            this.currentlyHandlingException = exceptionValue;
            this.log(`[ENTER_CATCH] 현재 처리 중 예외 등록 (체인 추적 시작)`);

            // 예외 변수 바인딩
            if (exceptionVar) {
              this.variables.set(exceptionVar, exceptionValue);
              this.log(`[BIND EXCEPTION] ${exceptionVar} = Exception(${exceptionValue.__class || 'Unknown'})`);
            }

            // 매칭된 CATCH 블록 실행
            for (const catchStmt of body.statements) {
              this.eval(catchStmt);
            }

            // v8.8: 이전 예외 상태 복구
            this.currentlyHandlingException = prevHandlingException;
            this.log(`[EXIT_CATCH] 예외 상태 복구 (체인 추적 종료)`);

            this.log(`[CATCH COMPLETE] 예외 처리 완료 (${exceptionType || 'default'})`);
            catchExecuted = true;
            break; // 첫 번째 일치 블록만 실행
          }

          // v8.7: FINALLY 실행 (예외 처리 경로 - 재전파 전) - eval 버전
          if ((node as any).finallyBlock) {
            this.log(`[ENTER_FINALLY] FINALLY 블록 진입 (예외 처리 경로)`);
            // v8.8: FINALLY 예외를 우선 전파
            try {
              for (const finallyStmt of (node as any).finallyBlock.statements) {
                this.eval(finallyStmt);
              }
              this.log(`[EXIT_FINALLY] FINALLY 블록 완료`);
            } catch (finallyErr: any) {
              this.log(`[FINALLY EXCEPTION] FINALLY에서 새 예외 발생 → 우선 전파`);
              throw finallyErr;
            }
          }

          // 일치하는 CATCH 블록이 없으면 예외 재던지기 (FINALLY 후)
          if (!catchExecuted) {
            this.log(`[CATCH UNMATCHED] 일치하는 CATCH 블록 없음 → 예외 재전파`);
            throw e;
          }
        }

        return undefined;
      }

      case 'ThrowStatement': {
        // ── v8.3: Non-local Jump (PC 강제 변경) ──────────────────────────
        if (this.handlerStack.length === 0) {
          let message = 'Exception';
          if ((node as any).expression && (node as any).expression.type === 'CallExpression') {
            if ((node as any).expression.arguments && (node as any).expression.arguments.length > 0) {
              message = this.eval((node as any).expression.arguments[0]);
            }
          }
          this.log(`[PANIC_NO_HANDLER] throw 실행 중 활성 핸들러 없음 (message: "${message}")`);
          throw new Error(`[PANIC] No active handler for throw: ${message}`);
        }

        // 핸들러에서 복구 PC 읽기
        const handler = this.handlerStack[this.handlerStack.length - 1];
        const jumpPC = handler.snapshot?.savedPC;

        // v8.5: 예외 객체 처리
        // THROW는 Exception 객체를 인자로 받음
        let exceptionObject: any = null;
        let message = 'Exception';

        if ((node as any).expression) {
          // 표현식 평가 (Exception 객체 또는 문자열)
          exceptionObject = this.eval((node as any).expression);

          // 객체인지 문자열인지 확인
          if (exceptionObject && typeof exceptionObject === 'object' && exceptionObject.__type === 'object') {
            // Exception 객체 (v8.5)
            message = exceptionObject.Message || 'Exception';
            this.log(`[THROW] 예외 발생: ${exceptionObject.__class}(Message="${message}", Code=${exceptionObject.Code})`);
          } else if (typeof exceptionObject === 'string') {
            // 문자열 메시지 (v8.3 호환)
            message = exceptionObject;
            this.log(`[THROW] 예외 발생: "${message}"`);
          } else {
            // 기타 (숫자 등)
            message = String(exceptionObject);
            this.log(`[THROW] 예외 발생: ${message}`);
          }
        }

        // v8.8: Exception Chaining - 현재 처리 중인 예외가 있으면 Cause로 연결
        if (exceptionObject && exceptionObject.__type === 'object' && this.currentlyHandlingException) {
          exceptionObject.Cause = this.currentlyHandlingException;
          const causeMsg = this.currentlyHandlingException.Message || '(unknown)';
          this.log(`[EXCEPTION CHAIN] SET_CAUSE: "${exceptionObject.Message}" ← "${causeMsg}"`);
        }

        // v8.5: 예외 객체를 핸들러에 저장 (CATCH 블록에서 접근 가능하게)
        handler.exceptionObject = exceptionObject;

        // v8.4: 스택 언와인딩 (Stack Unwinding)
        // PC를 변경하기 전에 중간에 쌓인 프레임들을 모두 파괴
        const targetSP = handler.snapshot?.savedSP ?? 0;
        this.unwindStack(targetSP);

        // PC 강제 변경 (현재 PC를 건너뛰고 CATCH 블록으로 점프)
        this.log(`[PC_REDIRECT] PC 변경: ${this.pc} → ${jumpPC} (핸들러로 점프)`);
        this.pc = jumpPC!; // ← 핵심! PC를 저장된 주소로 변경

        throw new Error(message); // ← 이 예외는 외부 try-catch에서 처리 (eval 중단)
      }
      // ────────────────────────────────────────────────────────────────────────

      case 'ContinueStatement': {
        // v3.6: continue 문
        this.log(`[CONTINUE SIGNAL] continue 감지`);
        this.continueFlag = true;
        return null;
      }

      default:
        return null;
    }
  }

  /**
   * 이항 연산
   */
  private evalBinaryOp(node: ASTNode): any {
    const left = this.eval(node.left);
    const right = this.eval(node.right);
    const op = node.operator;

    // v5.6: 포인터 산술 (Pointer Arithmetic)
    if (op === '+') {
      if (left && typeof left === 'object' && left.__type === 'address') {
        // 포인터 + 정수: offset 증가, 새 주소 계산
        const newOffset = left.offset + right;
        const newAddr = this.getSymbolAddress(left.varName, newOffset);
        this.log(`[PTR ARITH] ${left.address} + ${right} → offset=${newOffset} → ${newAddr}`);
        this.log(`[SCALING] ${right} × 4 bytes = +${right * 4} bytes (Type-Aware)`);
        return { __type: 'address', varName: left.varName, address: newAddr, offset: newOffset };
      }
      return left + right;
    }

    if (op === '-') {
      if (left && typeof left === 'object' && left.__type === 'address') {
        if (right && typeof right === 'object' && right.__type === 'address') {
          // 포인터 - 포인터: 원소 간 거리 계산
          const distance = left.offset - right.offset;
          this.log(`[PTR DIST] ${left.address} - ${right.address} = ${distance} elements`);
          return distance;
        }
        // 포인터 - 정수: offset 감소
        const newOffset = left.offset - right;
        const newAddr = this.getSymbolAddress(left.varName, newOffset);
        this.log(`[PTR ARITH] ${left.address} - ${right} → offset=${newOffset} → ${newAddr}`);
        this.log(`[SCALING] ${right} × 4 bytes = -${right * 4} bytes (Type-Aware)`);
        return { __type: 'address', varName: left.varName, address: newAddr, offset: newOffset };
      }
      return left - right;
    }

    if (op === '*') return left * right;
    if (op === '/') return Math.floor(left / right);
    if (op === '%') return left % right;

    if (op === '==') return left === right ? 1 : 0;
    if (op === '!=') return left !== right ? 1 : 0;
    if (op === '<') return left < right ? 1 : 0;
    if (op === '>') return left > right ? 1 : 0;
    if (op === '<=') return left <= right ? 1 : 0;
    if (op === '>=') return left >= right ? 1 : 0;

    if (op === '&&') return left && right;
    if (op === '||') return left || right;

    throw new Error(`Unknown operator: ${op}`);
  }

  /**
   * 단항 연산
   */
  /**
   * v5.5: 심볼 테이블에서 변수의 메모리 주소 계산
   */
  private getSymbolAddress(varName: string, elemOffset: number = 0): string {
    const varNames = [...this.variables.keys()];
    const index = varNames.indexOf(varName);
    if (index === -1) {
      throw new Error(`[SYMBOL ERROR] 변수 '${varName}'를 찾을 수 없음`);
    }
    const baseOffset = index * 4; // 각 변수는 4바이트 (32-bit)
    // v5.6: 배열 원소 주소 = 기본 주소 + elemOffset * 4
    const totalOffset = baseOffset + elemOffset * 4;
    return `0x${(0x1000 + totalOffset).toString(16).padStart(4, '0')}`;
  }

  /**
   * ── v7.4: 접근 제어 검증 메서드 ──────────────────────────────────────
   * 현재 실행 컨텍스트에서 특정 필드에 접근할 수 있는지 확인
   * @param access: 필드의 접근 레벨 ('private', 'protected', 'public')
   * @param targetClass: 필드가 속한 클래스명
   * @returns: 접근 가능하면 true, 불가능하면 throw
   */
  private validateMemberAccess(access: string, targetClass: string, memberName: string): boolean {
    // public은 항상 접근 가능
    if (access === 'public') {
      return true;
    }

    // private: 같은 클래스 내부(메서드)에서만 접근 가능
    if (access === 'private') {
      if (this.currentClassContext === targetClass) {
        this.log(`[ACCESS OK] private ${targetClass}.${memberName} - 클래스 내부 접근`);
        return true;
      }
      this.log(`[ACCESS DENIED] private ${targetClass}.${memberName} - 외부 접근 시도`);
      throw new Error(`[ACCESS VIOLATION] private 필드 '${memberName}'에 외부에서 접근할 수 없습니다 (현재: ${this.currentClassContext || 'global'}, 대상: ${targetClass})`);
    }

    // protected: 같은 클래스, 자식 클래스, 또는 부모 클래스에서 접근 가능
    if (access === 'protected') {
      if (!this.currentClassContext) {
        this.log(`[ACCESS DENIED] protected ${targetClass}.${memberName} - 전역 스코프에서 접근`);
        throw new Error(`[ACCESS VIOLATION] protected 필드 '${memberName}'에 전역 스코프에서 접근할 수 없습니다`);
      }

      // 1. 같은 클래스
      if (this.currentClassContext === targetClass) {
        this.log(`[ACCESS OK] protected ${targetClass}.${memberName} - 클래스 내부 접근`);
        return true;
      }

      // 2. 현재 클래스가 target의 자식인지 확인 (현재의 부모 체인에 target이 있는가)
      let currentClass: string | null = this.currentClassContext;
      while (currentClass) {
        const classInfo = this.classTable.get(currentClass);
        if (!classInfo) break;
        const superClass = (classInfo as any).superClass;
        if (superClass === targetClass) {
          this.log(`[ACCESS OK] protected ${targetClass}.${memberName} - 자식 클래스 접근`);
          return true;
        }
        currentClass = superClass;
      }

      // 3. target이 현재 클래스의 자식인지 확인 (target의 부모 체인에 현재가 있는가)
      let targetClassPtr: string | null = targetClass;
      while (targetClassPtr) {
        const classInfo = this.classTable.get(targetClassPtr);
        if (!classInfo) break;
        const superClass = (classInfo as any).superClass;
        if (superClass === this.currentClassContext) {
          this.log(`[ACCESS OK] protected ${targetClass}.${memberName} - 부모 클래스 메서드에서 자식 필드 접근`);
          return true;
        }
        targetClassPtr = superClass;
      }

      this.log(`[ACCESS DENIED] protected ${targetClass}.${memberName} - 무관한 클래스 접근`);
      throw new Error(`[ACCESS VIOLATION] protected 필드 '${memberName}'에 무관한 클래스에서 접근할 수 없습니다 (현재: ${this.currentClassContext}, 대상: ${targetClass})`);
    }

    return false;
  }

  private evalUnaryOp(node: ASTNode): any {
    const op = node.operator;

    // v5.5/v5.6/v5.7: Address-of (&) — 변수, 배열 원소, 구조체 멤버의 메모리 주소 반환
    if (op === '&') {
      if (node.operand.type === 'Identifier') {
        // v5.5: 단순 변수 주소
        const varName = node.operand.name;
        const addr = this.getSymbolAddress(varName, 0);
        this.log(`[ADDRESS-OF] &${varName} → ${addr}`);
        return { __type: 'address', varName, address: addr, offset: 0 };
      } else if (node.operand.type === 'IndexExpression') {
        // v5.6: 배열 원소 주소 — offset 포함
        const arrName = node.operand.object.name;
        const idx = this.eval(node.operand.index);
        const addr = this.getSymbolAddress(arrName, idx);
        this.log(`[ADDRESS-OF] &${arrName}[${idx}] → ${addr} (Base + ${idx}*4)`);
        return { __type: 'address', varName: arrName, address: addr, offset: idx };
      } else if (node.operand.type === 'MemberExpression') {
        // v5.7: 구조체 멤버 주소
        const objName = node.operand.object.name;
        const field = node.operand.field;
        const obj = this.variables.get(objName);
        if (!obj || obj.__type !== 'struct') throw new Error(`[REF ERROR] ${objName}은 구조체가 아님`);
        const structDef = this.structTable.get(obj.__typeName);
        const fieldDef = structDef?.fields.find((f: any) => f.name === field);
        if (!fieldDef) throw new Error(`[REF ERROR] 필드 '${field}' 없음`);
        const fieldIdx = structDef!.fields.indexOf(fieldDef);
        const fieldAddr = `0x${(parseInt(obj.__baseAddr, 16) + fieldDef.offset).toString(16).padStart(4, '0')}`;
        this.log(`[ADDRESS-OF] &${objName}.${field} → ${fieldAddr} (Base ${obj.__baseAddr} + ${fieldDef.offset} bytes, field=${field}, index=${fieldIdx})`);
        return { __type: 'address', varName: objName, field, address: fieldAddr, offset: fieldIdx };
      } else {
        throw new Error('[REF ERROR] & 연산자는 변수에만 사용 가능');
      }
    }

    // v5.5/v5.6/v5.7: Dereference (*) — 주소가 가리키는 값 반환
    if (op === '*') {
      const ref = this.eval(node.operand);
      if (!ref || typeof ref !== 'object' || ref.__type !== 'address') {
        throw new Error('[DEREF ERROR] * 연산자는 주소에만 사용 가능');
      }
      const target = this.variables.get(ref.varName);
      let value: any;

      // v5.7: 구조체 멤버 역참조
      if (ref.field != null) {
        const structInst = this.variables.get(ref.varName);
        if (!structInst || structInst.__type !== 'struct') throw new Error(`[DEREF ERROR] 구조체가 아님`);
        const value2 = structInst[ref.field];
        this.log(`[DEREFERENCE] *${ref.address} → ${ref.varName}.${ref.field} = ${value2}`);
        return value2;
      }

      if (Array.isArray(target)) {
        // v5.6: 배열 원소 접근 (offset 사용)
        const elemIdx = ref.offset ?? 0;
        if (elemIdx < 0 || elemIdx >= target.length) {
          this.log(`[BOUNDARY VIOLATION] 포인터 offset=${elemIdx} ≥ size ${target.length}`);
          throw new Error(`[INDEX OUT OF BOUNDS] 포인터 인덱스 ${elemIdx} 가 범위를 벗어남`);
        }
        value = target[elemIdx];
        this.log(`[DEREFERENCE] *${ref.address} → ${ref.varName}[${elemIdx}] = ${value}`);
      } else {
        // v5.5: 변수 값 반환
        value = target;
        this.log(`[DEREFERENCE] *${ref.address} → ${ref.varName} = ${value}`);
      }
      return value;
    }

    // 기존 연산자
    const operand = this.eval(node.operand);
    if (op === '-') return -operand;
    if (op === '!') return !operand ? 1 : 0;

    throw new Error(`Unknown unary operator: ${op}`);
  }

  /**
   * 함수 호출 (v4.0 기반 / v4.6: Call Site Cache + Pipeline 최적화)
   */
  private evalCall(node: ASTNode): any {
    let calleeName: string;

    // v7.2: 메서드 호출 감지 (callee가 MemberExpression) + 간접 호출 공식
    if (node.callee.type === 'MemberExpression') {
      const obj = this.eval(node.callee.object);
      const methodName = node.callee.field;

      // v8.3: 배열 메서드 지원 (push, pop, shift, unshift 등)
      if (obj && obj.__type === 'array') {
        const argValues = node.arguments.map((a: ASTNode) => this.eval(a));

        if (methodName === 'push') {
          obj.push(...argValues);
          this.log(`[ARRAY METHOD] push(${argValues.join(', ')}) - 배열에 요소 추가`);
          return obj[obj.length - 1];
        } else if (methodName === 'pop') {
          const val = obj.pop();
          this.log(`[ARRAY METHOD] pop() - 반환: ${val}`);
          return val;
        } else if (methodName === 'shift') {
          const val = obj.shift();
          this.log(`[ARRAY METHOD] shift() - 반환: ${val}`);
          return val;
        } else if (methodName === 'unshift') {
          obj.unshift(...argValues);
          this.log(`[ARRAY METHOD] unshift(${argValues.join(', ')}) - 배열 앞에 요소 추가`);
          return obj.length;
        } else if (methodName === 'length') {
          return obj.length;
        }
      }

      if (obj && (obj.__type === 'object' || obj.__type === 'struct')) {
        const vTable = obj.__vPtr;

        // v7.2: 간접 호출 공식 (*(*(obj+0) + MethodIndex × 4))
        if (vTable && vTable.index.has(methodName)) {
          const methodIndex = vTable.index.get(methodName)!;
          const fullName = vTable.methods[methodIndex];
          const argValues = node.arguments.map((a: ASTNode) => this.eval(a));

          // v7.2: 간접 참조 공식 단계별 로깅
          const objAddr = obj.__baseAddr;
          const vTableAddr = vTable.__staticAddress;
          const methodOffset = methodIndex * 4;  // 각 메서드 포인터는 4바이트

          this.log(`[INDIRECT CALL] ${obj.__class}.${methodName}() - 간접 호출 공식 분해:`);
          this.log(`  STEP 1: vPtr = *(${objAddr}+0) = ${vTableAddr}`);
          this.log(`  STEP 2: methodAddr = *(${vTableAddr}+${methodOffset}) = &${fullName}`);
          this.log(`  STEP 3: methodIndex[${methodName}] = ${methodIndex}`);
          this.log(`  TARGET: CALL &${fullName}(${obj.__class} self, args)`);

          return this.callUserFunction(fullName, [obj, ...argValues]);
        }

        // Fallback: vTable 미구성 케이스 (구조체 등)
        const className = obj.__class || obj.__typeName;
        const fullName = `${className}::${methodName}`;
        if (this.functionTable.has(fullName)) {
          const argValues = node.arguments.map((a: ASTNode) => this.eval(a));
          this.log(`[METHOD CALL] ${className}.${methodName}(${argValues.join(', ')}) → ${fullName}(self, ${argValues.join(', ')})`);
          return this.callUserFunction(fullName, [obj, ...argValues]);
        }
      }
    }

    if (node.callee.type === 'Identifier') {
      calleeName = node.callee.name;
    } else {
      throw new Error('Only identifier function calls supported');
    }

    // v5.8: arr_struct_new(count, StructType) — 구조체 이름을 문자열로 처리
    if (calleeName === 'arr_struct_new') {
      if (node.arguments.length < 2) {
        throw new Error('[STRUCT ERROR] arr_struct_new은 최소 2개 인자 필요');
      }
      const count = this.eval(node.arguments[0]);
      // 두 번째 인자가 Identifier면 구조체 이름 추출
      let structTypeName: string;
      if (node.arguments[1].type === 'Identifier') {
        structTypeName = node.arguments[1].name;
      } else {
        structTypeName = this.eval(node.arguments[1]);
      }
      const func = this.variables.get('arr_struct_new');
      if (typeof func === 'function') {
        return func(count, structTypeName);
      }
    }

    // v5.9.2: sizeof(StructType) — 구조체 이름을 문자열로 처리
    if (calleeName === 'sizeof') {
      if (node.arguments.length < 1) {
        throw new Error('[SIZE ERROR] sizeof는 최소 1개 인자 필요');
      }
      let structTypeName: string;
      if (node.arguments[0].type === 'Identifier') {
        structTypeName = node.arguments[0].name;
      } else {
        structTypeName = this.eval(node.arguments[0]);
      }
      const func = this.variables.get('sizeof');
      if (typeof func === 'function') {
        return func(structTypeName);
      }
    }

    // 인자 평가 (호출 전 — 현재 스코프에서)
    const args = node.arguments.map((a: ASTNode) => this.eval(a));

    // v5.7: 구조체 인스턴스 생성
    if (this.structTable.has(calleeName)) {
      const structDef = this.structTable.get(calleeName)!;
      const instance: any = { __type: 'struct', __typeName: calleeName };
      for (const field of structDef.fields) {
        instance[field.name] = 0;
      }
      // 가상 기본 주소: 0x2000 영역 (배열 0x1xxx와 구분)
      const allocIdx = this.variables.size;
      const baseAddr = `0x${(0x2000 + allocIdx * 0x10).toString(16).padStart(4, '0')}`;
      instance.__baseAddr = baseAddr;
      this.log(`[STRUCT ALLOC] ${calleeName}() @ ${baseAddr} (${structDef.totalSize} bytes)`);
      return instance;
    }

    // v4.6: Call Site Cache — AST 노드 동일성 기반 직접 참조
    let cachedFn = this.callSiteCache.get(node);
    if (!cachedFn && this.functionTable.has(calleeName)) {
      cachedFn = this.functionTable.get(calleeName)!;
      this.callSiteCache.set(node, cachedFn);
      this.log(`[CALL SITE CACHE] '${calleeName}' 등록 — 이후 Map.get 생략`);
    }

    if (cachedFn) {
      // v4.6: 호출 횟수 추적 (Pipeline Metrics)
      const count = (this.callCountMap.get(calleeName) ?? 0) + 1;
      this.callCountMap.set(calleeName, count);
      if (count === PCInterpreter.HOT_THRESHOLD) {
        this.log(`[PIPELINE] '${calleeName}' HOT 함수 진입 (${count}회) — 최적화 경로 활성화`);
      }

      // v4.6: Inline Hinting — 단순 함수 Fast Path (스코프 생성 생략)
      if (this.isInlinable(calleeName)) {
        // 첫 2회 + 1000회마다 로그 (10,000 호출 시 스팸 방지)
        if (count <= 2 || count % 1000 === 0) {
          this.log(`[PIPELINE] INLINE #${count}: '${calleeName}(${args.join(', ')})' → 직접 실행`);
        }
        return this.callInline(calleeName, args, cachedFn);
      }

      return this.callUserFunction(calleeName, args);
    }

    // 내장 함수 (println 등)
    const func = this.variables.get(calleeName);
    if (typeof func === 'function') {
      return func(...args);
    }

    throw new Error(`'${calleeName}' 는 함수가 아니거나 정의되지 않았습니다`);
  }

  /**
   * v4.6: Inline Hint Detection — 단순 순수 함수 인라인 가능 여부 판단
   * 조건: 바디가 단일 ReturnStatement이며 중첩 호출이 없음
   */
  private isInlinable(name: string): boolean {
    if (this.inlineCache.has(name)) return this.inlineCache.get(name)!;
    const fn = this.functionTable.get(name)!;
    const stmts = fn.body.statements;
    let result: boolean;
    if (stmts.length !== 1 || stmts[0].type !== 'ReturnStatement') {
      result = false; // 다중 문장 or 비-return → 인라인 불가
    } else {
      result = !this.astContainsCall(stmts[0].value); // 중첩 호출 없어야 가능
    }
    this.inlineCache.set(name, result);
    this.log(`[INLINE HINT] '${name}' 분석 → ${result ? '✅ 인라인 가능 (단일 return, 중첩 호출 없음)' : '❌ 풀 호출 필요'}`);
    return result;
  }

  /**
   * v4.6: AST 서브트리에 CallExpression 포함 여부 재귀 검사
   */
  private astContainsCall(node: ASTNode | null): boolean {
    if (!node || typeof node !== 'object') return false;
    if (node.type === 'CallExpression') return true;
    for (const key of Object.keys(node)) {
      if (key === 'type') continue;
      const val = node[key];
      if (Array.isArray(val)) {
        if (val.some((v: any) => this.astContainsCall(v))) return true;
      } else if (val && typeof val === 'object' && val.type) {
        if (this.astContainsCall(val)) return true;
      }
    }
    return false;
  }

  /**
   * v4.6: Fast Inline Call — 스코프 전환 없이 현재 스코프에서 직접 실행
   * 매개변수를 임시로 주입 후 return 표현식만 평가 (new Map() 생성 없음)
   */
  private callInline(name: string, args: any[], fn: { params: string[]; body: ASTNode }): any {
    // 현재 스코프에서 param 이름 충돌 방지: 기존 값 보존 후 교체
    const saved = new Map<string, any>();
    for (let i = 0; i < fn.params.length; i++) {
      const k = fn.params[i];
      saved.set(k, this.variables.get(k)); // undefined 포함 저장
      this.variables.set(k, args[i] ?? null);
    }
    // Return 표현식만 직접 평가 (스택 프레임 없음)
    const retVal = this.eval(fn.body.statements[0].value);
    // 기존 값 복구
    for (const [k, v] of saved) {
      if (v === undefined) this.variables.delete(k);
      else this.variables.set(k, v);
    }
    return retVal;
  }

  /**
   * v4.0: 사용자 정의 함수 실행 (Call Stack + Scope 격리)
   * v4.1: 중첩 호출 지원 (재귀적으로 안전)
   * v4.2: 데이터 핸드오버 무결성 로깅 추가
   */
  private callUserFunction(name: string, args: any[]): any {
    const fn = this.functionTable.get(name)!;
    const callDepth = this.callStack.length;

    // ── v5.9.9: Stack Depth Management ───────────────────────────────────
    this.currentStackDepth++;
    // ──────────────────────────────────────────────────────────────────────

    // ── v6.0: Recursion Depth Guard ──────────────────────────────────────
    // v6.3: TCO 루프 전에 1회만 증가 (다시 증가하지 않음)
    this.recursionDepth++;
    if (this.recursionDepth > this.MAX_RECURSION_DEPTH) {
      this.recursionDepth--;
      this.currentStackDepth--;
      throw new Error(`[STACK OVERFLOW] 재귀 깊이 ${this.MAX_RECURSION_DEPTH} 초과`);
    }
    // ──────────────────────────────────────────────────────────────────────

    this.log(`[CALL] '${name}(${args.join(', ')})' → Depth=${callDepth + 1}, RecursionDepth=${this.recursionDepth}`);

    // ── v7.4: 메서드 호출 시 currentClassContext 설정 ──────────────────
    const previousContext = this.currentClassContext;
    const isMethodCall = name.includes('::');
    if (isMethodCall) {
      const className = name.split('::')[0];
      this.currentClassContext = className;
      this.log(`[CLASS CONTEXT] 진입: ${className} (메서드: ${name.split('::')[1]})`);
    }
    // ──────────────────────────────────────────────────────────────────────

    // ── 1. Return Address: 현재 스코프 전체를 Call Stack에 저장 ──────────
    const savedScope = new Map(this.variables);
    this.callStack.push({ savedScope, functionName: name, callDepth });

    // ── v6.2: Recursive Type Inference - is_analyzing 설정 (루프 전 1회) ────
    const sig = this.typeSignatureTable.get(name);
    if (sig) {
      if (sig.is_analyzing) {
        // 재귀 호출 감지: 이미 분석 중인 함수를 다시 호출
        this.log(`[RECURSIVE TYPE] '${name}' 재귀 호출 감지 (depth=${callDepth}), placeholder 추론 사용`);
        if (sig.returnType !== null) {
          this.log(`[RECURSIVE TYPE] '${name}' → 확정 타입 '${sig.returnType}' 적용`);
        }
      } else {
        sig.is_analyzing = true;
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    let currentArgs = args;
    let jumpCount = 0;  // TCO 점프 카운트 (로컬 변수)
    let retVal: any = null;

    // ── v6.3: TCO while(true) 루프 - 꼬리 호출 반복 ────────────────────────
    while (true) {
      // ── 2. v4.2 HANDOVER: 인자 → 매개변수 순서대로 바인딩 ───────────────
      const localScope = new Map<string, any>();
      localScope.set('println', this.println.bind(this));
      localScope.set('check', this.variables.get('check'));

      this.log(`[HANDOVER] ${fn.params.length}개 인자 전달 시작`);
      for (let i = 0; i < fn.params.length; i++) {
        const paramName = fn.params[i];
        const argVal   = currentArgs[i] ?? null;
        localScope.set(paramName, argVal);
        this.log(`[HANDOVER] [${i}] 호출자 args[${i}]=${argVal} → 로컬 '${paramName}'`);
      }

      // v7.5: globalScope에서 override된 함수들을 localScope에 복사
      // (println, check 등이 globalScope에서 override되었을 수 있음)
      const globalPrintln = this.variables.get('println');
      if (typeof globalPrintln === 'function') {
        localScope.set('println', globalPrintln);
      }

      this.variables = localScope;
      this.indentLevel++;

      // ── v6.1: Frame Integrity Logging - 진입 ────────────────────────────────
      const frameVarNames = [...localScope.keys()].join(', ');
      this.log(`[FRAME ENTER] '${name}' depth=${callDepth}, vars=[${frameVarNames}]`);
      // ────────────────────────────────────────────────────────────────────────

      // ── 3. 함수 바디 실행 ────────────────────────────────────────────────
      this.returnFlag = false;
      this.tcoFlag = false;
      for (const stmt of fn.body.statements) {
        this.eval(stmt);
        if (this.returnFlag) break; // RETURN 신호 감지 즉시 탈출
      }

      // ── v6.3: TCO 신호 확인 (tcoFlag 설정 여부) ─────────────────────────
      if (this.tcoFlag) {
        jumpCount++;
        currentArgs = this.tcoCallArgs;
        this.tcoFlag = false;
        this.returnFlag = false;
        this.log(`[TCO JUMP #${jumpCount}] '${name}' args=[${currentArgs.join(', ')}]`);
        this.indentLevel--;  // 현재 반복 종료
        continue;  // 새 스택 프레임 없이 다음 반복으로 점프!
      }

      // 일반 반환 (TCO 아님)
      retVal = this.returnValue ?? null;
      this.returnValue = undefined;
      this.indentLevel--;
      break;
    }
    // ────────────────────────────────────────────────────────────────────────

    // ── 4. v4.2 LOCAL ISOLATION: 소멸할 로컬 변수 목록 기록 ──────────────
    const localVarNames = [...this.variables.keys()]
      .filter(k => k !== 'println');
    this.log(`[LOCAL ISOLATION] 소멸 예정 로컬 변수: [${localVarNames.join(', ')}]`);

    // ── 5. 반환값 회수 ────────────────────────────────────────────────────
    this.log(`[RETURN COMPLETE] '${name}' 반환값: ${retVal}`);

    // ── v6.1 → v6.2: Type Signature Tracking & Recursive Type Validation ─────
    const retType = retVal === null ? 'null' : typeof retVal;
    const sigFinal = this.typeSignatureTable.get(name);
    if (sigFinal) {
      sigFinal.callCount++;
      if (jumpCount === 0) {  // TCO 함수가 아닐 때만 타입 체크 수행
        sigFinal.typeCheckCount++;
        if (sigFinal.returnType === null) {
          sigFinal.returnType = retType;
          this.log(`[TYPE LOCK] '${name}' 반환 타입 확정: ${retType} (check #${sigFinal.typeCheckCount})`);
        } else if (sigFinal.returnType !== retType) {
          this.log(`[TYPE WARN] '${name}' 반환 타입 불일치: 기대=${sigFinal.returnType}, 실제=${retType}`);
        } else {
          this.log(`[TYPE CHECK] '${name}' 타입 검증 성공: ${retType} (check #${sigFinal.typeCheckCount})`);
        }
      }
      sigFinal.is_analyzing = false;  // v6.2: 분석 완료
    }
    // ────────────────────────────────────────────────────────────────────

    // ── 6. Call Stack Pop: 이전 스코프 복구 (Memory Cleanup) ─────────────
    const frame = this.callStack.pop()!;
    this.variables = frame.savedScope;

    // v4.2: 로컬 변수 소멸 확인
    // savedScope에 없었던 로컬 변수(함수가 새로 만든 것)만 검사 — 이름 충돌 오탐 방지
    const addedByFunc = localVarNames.filter(k => !frame.savedScope.has(k));
    const leaked      = addedByFunc.filter(k => this.variables.has(k));
    if (leaked.length === 0) {
      this.log(`[LOCAL ISOLATION] ✅ 소멸 완료 — 외부 스코프 오염 없음`);
    } else {
      this.log(`[LOCAL ISOLATION] ⚠️  누수 감지: [${leaked.join(', ')}]`);
    }

    this.log(`[SCOPE RESTORED] depth=${callDepth}, 복구된 외부 변수: ${this.variables.size - 1}개`);

    // ── v6.1: Frame Integrity Logging - 퇴출 ────────────────────────────────
    this.log(`[FRAME EXIT] '${name}' depth=${callDepth}${jumpCount > 0 ? ` [TCO DONE: ${jumpCount} jumps]` : ''}, retVal=${retVal}`);
    // ────────────────────────────────────────────────────────────────────────

    // ── v5.9.9: Stack Depth Management (함수 퇴장) ──────────────────────
    this.currentStackDepth--;
    // ──────────────────────────────────────────────────────────────────────

    // ── v6.0: Recursion Depth Decrement ──────────────────────────────────
    this.recursionDepth--;
    // ──────────────────────────────────────────────────────────────────────

    // ── v7.4: currentClassContext 복원 ──────────────────────────────────
    if (isMethodCall) {
      this.currentClassContext = previousContext;
      this.log(`[CLASS CONTEXT] 퇴출: 이전 컨텍스트로 복원 (${previousContext || 'global'})`);
    }
    // ──────────────────────────────────────────────────────────────────────

    return retVal;
  }

  /**
   * v8.4: 스택 언와인딩 (Stack Unwinding)
   * THROW 시점과 CATCH 도착점 사이의 스택 프레임을 역순으로 파괴하면서
   * 각 프레임의 savedScope로 변수를 복원한다 (Scope Restoration)
   */
  private unwindStack(targetSP: number): void {
    const initialDepth = this.callStack.length;
    const gap = initialDepth - targetSP;

    if (gap <= 0) {
      this.log(`[UNWIND STACK] SP는 이미 목표 상태 (현재: ${initialDepth}, 목표: ${targetSP})`);
      return;
    }

    this.log(`[UNWIND STACK] 스택 언와인딩 시작`);
    this.log(`  → 현재 깊이: ${initialDepth}, 목표: ${targetSP}`);
    this.log(`  → 파괴할 프레임: ${gap}개`);

    // Phase 1: 프레임 역순 파괴
    for (let i = 0; i < gap; i++) {
      const frame = this.callStack.pop();
      if (!frame) break;

      this.log(`[FRAME POPPED] [${initialDepth - i}] ${frame.functionName}`);

      // Phase 2: 변수 범위 복원 (Scope Restoration)
      // 이 프레임 진입 전의 상태(savedScope)로 변수들을 되돌린다
      // 이는 함수 호출에서 정상 복귀하는 것과 동일한 효과
      if (frame.savedScope) {
        frame.savedScope.forEach((value: any, varName: string) => {
          // savedScope에 있던 변수는 그 값으로 복원
          this.variables.set(varName, value);
          this.log(`  [VARIABLE RESTORE] '${varName}' ← ${value} (프레임 진입 전 상태로 복구)`);
        });
      }
    }

    const finalDepth = this.callStack.length;
    this.log(`[UNWIND COMPLETE] SP: ${initialDepth} → ${finalDepth} (${gap}개 프레임 파괴 및 범위 복구)`);

    // Phase 3: SP 최종 검증
    if (finalDepth !== targetSP) {
      this.log(`[UNWIND WARNING] 최종 깊이 불일치: ${finalDepth} ≠ ${targetSP}`);
    }
  }

  /**
   * 내장 함수: println
   */
  private println(...args: any[]): any {
    const output = args.map(arg => {
      if (Array.isArray(arg)) {
        return '[' + arg.join(', ') + ']';
      }
      return String(arg);
    }).join(' ');

    this.output.push(output);
    return null;
  }

  /**
   * 출력 결과
   */
  public getOutput(): string {
    if (this.output.length === 0) return '';
    const last = this.output[this.output.length - 1];
    this.output.pop();
    return last;
  }

  /**
   * 디버그 로그 (v3.3: 들여쓰기 지원)
   */
  private log(msg: string): void {
    const indent = '    '.repeat(this.indentLevel);
    const formattedMsg = indent + msg;
    this.debugLog.push(formattedMsg);
    console.error(formattedMsg); // stderr로 출력 (결과와 분리)
  }

  /**
   * 모든 로그 반환
   */
  public getLogs(): string[] {
    return this.debugLog;
  }

  /**
   * v7.5 Phase 3: Destructor 체인 호출 (Deep Inheritance Support)
   * refCount == 0이 되었을 때 자동으로 호출되어 정리 작업 수행
   * 상속 체인을 따라 자식부터 부모까지 모든 Destructor 호출
   */
  private callDestructor(obj: any): void {
    this.callDestructorChain(obj);
  }

  /**
   * v7.5 Phase 3: Destructor 체인 재귀 호출
   * 자식부터 시작 → 부모까지 모든 Finalize 호출
   */
  private callDestructorChain(obj: any, currentClassName?: string, depth: number = 0): void {
    const className = currentClassName || obj.__class;
    const indent = '  '.repeat(depth);

    // 1단계: 현재 클래스의 Finalize 호출
    const destructorName = `${className}::Finalize`;
    const destructorName2 = `${className}::~${className}`;

    if (this.functionTable.has(destructorName)) {
      this.log(`${indent}[FINALIZE] ${className}::Finalize() 호출 시작`);
      try {
        const prevContext = this.currentClassContext;
        this.currentClassContext = className;
        this.callUserFunction(destructorName, [obj]);
        this.currentClassContext = prevContext;
        this.log(`${indent}[FINALIZE] ${className}::Finalize() 호출 완료`);
      } catch (e) {
        this.log(`${indent}[FINALIZE ERROR] ${className}::Finalize() 실행 중 오류: ${e}`);
      }
    } else if (this.functionTable.has(destructorName2)) {
      this.log(`${indent}[FINALIZE] ${className}::~${className}() 호출 시작`);
      try {
        const prevContext = this.currentClassContext;
        this.currentClassContext = className;
        this.callUserFunction(destructorName2, [obj]);
        this.currentClassContext = prevContext;
        this.log(`${indent}[FINALIZE] ${className}::~${className}() 호출 완료`);
      } catch (e) {
        this.log(`${indent}[FINALIZE ERROR] ${className}::~${className}() 실행 중 오류: ${e}`);
      }
    }

    // 2단계: 부모 클래스의 Finalize 재귀 호출
    const classDef = this.classTable.get(className);
    if (classDef && classDef.superClass) {
      const superClass = classDef.superClass;
      this.log(`${indent}[FINALIZE CHAIN] ${className} → ${superClass} (부모 소멸자 호출)`);
      this.callDestructorChain(obj, superClass, depth + 1);
    } else if (currentClassName) {
      // 최상위 부모에 도달했을 때만 로그
      this.log(`${indent}[FINALIZE COMPLETE] 소멸자 체인 완료 (최상위 클래스: ${className})`);
    }
  }

  /**
   * v7.5 Phase 4: 메모리 누수 감지 (고급)
   * 프로그램 종료 시 호출되어 누수 여부 및 상세 정보 출력
   */
  public checkMemoryLeaks(): void {
    this.log(`\n${'='.repeat(70)}`);
    this.log(`[MEMORY AUDIT] v7.5 Phase 4: Memory Leak Detection`);
    this.log(`${'='.repeat(70)}`);

    // 1. Heap 메모리 누수 검사
    const leakedBlocks = this.heapAllocator.getAllocatedBlocks();
    let heapLeaked = 0;
    if (leakedBlocks.length > 0) {
      this.log(`\n[HEAP LEAK] ${leakedBlocks.length}개 블록이 해제되지 않음:`);
      for (const block of leakedBlocks) {
        const addr = `0x${block.address.toString(16).padStart(4, '0')}`;
        this.log(`  ❌ ${addr}: ${block.size.toString().padStart(4)} bytes`);
        heapLeaked += block.size;
      }
      this.log(`[HEAP TOTAL] ${heapLeaked} bytes 미해제`);
    } else {
      this.log(`\n[HEAP OK] Heap 메모리 누수 없음 ✅`);
    }

    // 2. Instance Tracker 검사 (v7.5 객체 생명주기)
    let instanceLeaked = 0;
    let totalRefCount = 0;
    if (this.instanceTracker.size > 0) {
      this.log(`\n[INSTANCE LEAK] ${this.instanceTracker.size}개 객체가 해제되지 않음:`);
      for (const [key, info] of this.instanceTracker) {
        this.log(`  ❌ ${key}`);
        this.log(`     RefCount=${info.refCount}, Size=${info.size} bytes, CreatedAt=depth${info.createdAt}`);
        instanceLeaked += info.size;
        totalRefCount += info.refCount;
      }
      this.log(`[INSTANCE TOTAL] ${instanceLeaked} bytes (RefCount 합계: ${totalRefCount})`);
    } else {
      this.log(`\n[INSTANCE OK] 모든 객체 정리됨 ✅`);
    }

    // 3. 종합 평가
    this.log(`\n${'─'.repeat(70)}`);
    const heapOK = leakedBlocks.length === 0;
    const instanceOK = this.instanceTracker.size === 0;

    if (heapOK && instanceOK) {
      this.log(`[OOP INTEGRITY] ✅ v7.5 객체 생명주기 완결성 검증 SUCCESS`);
      this.log(`               모든 객체가 안전하게 해제됨 (Destructor 체인 완료)`);
    } else {
      this.log(`[OOP INTEGRITY] ❌ 메모리 누수 감지`);
      if (!heapOK) {
        this.log(`  - Heap: ${heapLeaked} bytes 미해제`);
      }
      if (!instanceOK) {
        this.log(`  - Objects: ${this.instanceTracker.size}개 미소멸`);
      }
    }
    this.log(`${'='.repeat(70)}\n`);
  }

  /**
   * v3.2: Exit Boundary 탐색
   * 루프 바디의 블록 구조를 분석하여 정확한 끝 위치 계산
   */
  private findExitBoundary(stmt: ASTNode, statements: ASTNode[]): number {
    // BlockStatement 내 문장 개수로 스킵 범위 계산
    if (stmt.type === 'WhileStatement' && stmt.body.type === 'BlockStatement') {
      const bodyStmts = stmt.body.statements;
      // 다음 PC = 현재 PC + 1
      // (현재는 WhileStatement가 하나의 statement이므로)
      this.log(`[BOUNDARY SCAN] 블록 내 ${bodyStmts.length}개 statement 분석 완료`);
      return this.pc + 1; // 루프 다음 statement
    }
    return this.pc + 1;
  }

  /**
   * v3.4: 메모리 스냅샷 (변수 상태 추적)
   * 루프 시작/종료 시 변수 값을 기록
   */
  private captureMemorySnapshot(phase: 'START' | 'END', iteration: number, vars: string[]): void {
    const snapshot = vars
      .map(v => `${v}:${JSON.stringify(this.variables.get(v))}`)
      .join(', ');
    this.log(`[SNAPSHOT] Iteration #${iteration} ${phase} - {${snapshot}}`);
  }

  /**
   * v3.4: 값 변경 추적
   */
  private trackValueChange(varName: string, oldValue: any, newValue: any, iteration: number): void {
    if (oldValue !== newValue) {
      this.log(`[VALUE CHANGE] ${varName}: ${JSON.stringify(oldValue)} → ${JSON.stringify(newValue)} (Iteration #${iteration})`);
    }
  }

  /**
   * v3.4: 조건에서 변수 이름 추출
   * 예: i <= 3 → ['i']
   */
  private extractVariablesFromCondition(condition: ASTNode): string[] {
    const vars = new Set<string>();

    const extractVars = (node: ASTNode): void => {
      if (!node) return;

      if (node.type === 'Identifier') {
        vars.add(node.name);
      } else if (node.type === 'BinaryOp') {
        extractVars(node.left);
        extractVars(node.right);
      } else if (node.type === 'UnaryOp') {
        extractVars(node.operand);
      }
    };

    extractVars(condition);
    return Array.from(vars);
  }

  /**
   * v3.5: 조건식의 계산 과정을 상세히 로깅
   * 복합 조건식: (i + j < limit) → "1 + 2 < 10 = 3 < 10 = true"
   */
  private evaluateConditionWithDetails(condition: ASTNode, iteration: number): any {
    const evaluateWithSteps = (node: ASTNode, depth: number = 0): { value: any; expression: string } => {
      if (!node) return { value: null, expression: 'null' };

      switch (node.type) {
        case 'NumberLiteral':
          return { value: node.value, expression: String(node.value) };

        case 'Identifier':
          const idValue = this.variables.get(node.name);
          return { value: idValue, expression: `${node.name}(${idValue})` };

        case 'BinaryOp': {
          const left = evaluateWithSteps(node.left, depth + 1);
          const right = evaluateWithSteps(node.right, depth + 1);
          const result = this.evalBinaryOp({
            ...node,
            left: { type: 'NumberLiteral', value: left.value },
            right: { type: 'NumberLiteral', value: right.value }
          });

          // 비교 연산자인 경우 결과를 boolean으로 표시
          const isBooleanOp = ['<', '>', '<=', '>=', '==', '!=', '&&', '||'].includes(node.operator);
          const resultExpr = isBooleanOp
            ? (result ? 'true' : 'false')
            : String(result);

          return {
            value: result,
            expression: `${left.expression} ${node.operator} ${right.expression} = ${resultExpr}`
          };
        }

        default:
          const val = this.eval(node);
          return { value: val, expression: JSON.stringify(val) };
      }
    };

    const result = evaluateWithSteps(condition);
    this.log(`[EVAL STEPS] Iteration #${iteration}: ${result.expression}`);
    return result.value;
  }

  /**
   * v3.8: 전체 메모리 상태 스냅샷 (모든 변수)
   * 루프 진입 전 상태를 저장하여 나중에 비교
   */
  private captureFullMemorySnapshot(): Map<string, any> {
    const snapshot = new Map<string, any>();

    for (const [key, value] of this.variables) {
      // 함수 타입 제외 (println, arr_new 등 내장 함수)
      if (typeof value === 'function') continue;
      // v5.0: 배열은 slice()로 얕은 복사 (요소가 원시값이므로 충분)
      if (Array.isArray(value)) {
        snapshot.set(key, value.slice());
      } else if (value && typeof value === 'object' && value.__type === 'matrix') {
        // v5.4: matrix 딥 카피
        snapshot.set(key, { ...value, data: value.data.slice() });
      } else if (value && typeof value === 'object' && value.__type === 'address') {
        // v5.5: address 객체 (참조)는 그대로 복사 (자신은 불변)
        snapshot.set(key, { ...value });
      } else {
        snapshot.set(key, value);
      }
    }

    return snapshot;
  }

  /**
   * v3.8: 루프 제어 변수 추출 및 저장
   * 루프 조건에서 나타나는 변수들은 "허용된 변경"으로 취급
   */
  private identifyLoopControlVariables(condition: ASTNode): Set<string> {
    const controlVars = new Set<string>();

    const extract = (node: ASTNode): void => {
      if (!node) return;

      if (node.type === 'Identifier') {
        controlVars.add(node.name);
      } else if (node.type === 'BinaryOp') {
        extract(node.left);
        extract(node.right);
      } else if (node.type === 'UnaryOp') {
        extract(node.operand);
      }
    };

    extract(condition);
    return controlVars;
  }

  /**
   * v3.8: 메모리 상태 비교 및 오염 감지
   * 루프 전후의 메모리를 비교하여 의도하지 않은 변경 감지
   */
  private detectMemoryContamination(
    beforeSnapshot: Map<string, any>,
    afterSnapshot: Map<string, any>,
    controlVariables: Set<string>,
    loopDepth: number
  ): void {
    const changes: { varName: string; before: any; after: any }[] = [];
    const contaminations: { varName: string; before: any; after: any }[] = [];

    // 모든 현재 변수 확인
    for (const [varName, afterValue] of afterSnapshot) {
      const beforeValue = beforeSnapshot.get(varName);

      if (beforeValue === undefined) {
        // 새로 추가된 변수 (문제 없음)
        changes.push({ varName, before: undefined, after: afterValue });
      } else if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
        // 값이 변경됨
        if (controlVariables.has(varName)) {
          // 루프 제어 변수: 허용됨
          changes.push({ varName, before: beforeValue, after: afterValue });
        } else if (Array.isArray(afterValue) || Array.isArray(beforeValue)) {
          // v5.1: 배열은 인덱스 쓰기로 원소 변경이 허용된 작업 → 오염 아님
          changes.push({ varName, before: beforeValue, after: afterValue });
        } else if (
          (afterValue && typeof afterValue === 'object' && afterValue.__type === 'matrix') ||
          (beforeValue && typeof beforeValue === 'object' && beforeValue.__type === 'matrix')
        ) {
          // v5.4: matrix 내부 변경은 허용됨
          changes.push({ varName, before: beforeValue, after: afterValue });
        } else if (
          (afterValue && typeof afterValue === 'object' && afterValue.__type === 'address') ||
          (beforeValue && typeof beforeValue === 'object' && beforeValue.__type === 'address')
        ) {
          // v5.5: address (참조) 초기화/변경은 허용됨
          changes.push({ varName, before: beforeValue, after: afterValue });
        } else {
          // 루프 제어 변수 아님: 오염!
          contaminations.push({ varName, before: beforeValue, after: afterValue });
        }
      }
    }

    // 로그 출력
    if (changes.length > 0) {
      const changeLog = changes
        .map(c => `${c.varName}: ${JSON.stringify(c.before)} → ${JSON.stringify(c.after)}`)
        .join(', ');
      this.log(`[STATE CHANGE] Depth=${loopDepth} - Permitted: {${changeLog}}`);
    }

    // 오염 감지!
    if (contaminations.length > 0) {
      const contaminationLog = contaminations
        .map(c => `${c.varName}: ${JSON.stringify(c.before)} → ${JSON.stringify(c.after)}`)
        .join(', ');
      this.log(`[CONTAMINATION ALERT] Depth=${loopDepth} - ILLEGAL CHANGES DETECTED: {${contaminationLog}}`);
      this.log(`[MEMORY INTEGRITY] ⚠️  Loop modified unexpected memory region!`);
    } else {
      this.log(`[MEMORY INTEGRITY] ✅ Memory isolation verified (Depth=${loopDepth})`);
    }
  }
}
