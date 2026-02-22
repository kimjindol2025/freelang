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
  status: 'ALLOCATED' | 'FREED' | 'DOUBLE_FREE_DETECTED';
  freed_timestamp?: number;
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
      return this.smallObjectAllocator.allocate(size);
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
        status: 'ALLOCATED'
      };
      this.blockMetadata.set(blockId, metadata);
      this.addressToBlockId.set(bestAddr, blockId);
      // ───────────────────────────────────────────────────────────────────────

      this.log(`[ALLOC] Best-Fit Block #${blockId} size=${size}, found_block @ 0x${bestAddr.toString(16)}, block_size=${bestSize}, waste=${bestWaste}`);
      this.log(`[ALLOC] address=0x${bestAddr.toString(16)}, size=${size}`);
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
      status: 'ALLOCATED'
    };
    this.blockMetadata.set(blockId, metadata);
    this.addressToBlockId.set(newAddr, blockId);
    // ───────────────────────────────────────────────────────────────────────

    this.log(`[ALLOC] new_block Block #${blockId} size=${size} @ 0x${newAddr.toString(16)}`);
    this.log(`[ALLOC] address=0x${newAddr.toString(16)}, size=${size}`);
    this.nextFreeAddress += size;
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
      this.smallObjectAllocator.deallocate(poolSize, address);
      return;
    }
    // ──────────────────────────────────────────────────────────────────────────

    // ── v5.9.5: Leak Guard - Double-Free 감지 ────────────────────────────────
    const blockId = this.addressToBlockId.get(address);

    if (!blockId) {
      throw new Error(`[DOUBLE-FREE ERROR] 할당되지 않았거나 이미 해제된 주소 0x${address.toString(16)}`);
    }

    const metadata = this.blockMetadata.get(blockId)!;

    if (metadata.status === 'FREED') {
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
    this.allocatedBlocks.delete(address);
    this.freeBlocks.set(address, size);

    // ── v5.9.5: Leak Guard - 메타데이터 업데이트 ────────────────────────────
    metadata.status = 'FREED';
    metadata.freed_timestamp = Date.now();
    // addressToBlockId 유지 (Use-After-Free 감지 필요)
    // ──────────────────────────────────────────────────────────────────────────

    this.log(`[FREE] Block #${blockId} address=0x${address.toString(16)}, size=${size}`);

    // Coalescing: 인접한 빈 블록 병합
    this.coalesce();
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
   * 힙 메모리 읽기
   */
  read(address: number, offset: number): any {
    // ── v5.9.5: Use-After-Free 감지 ──────────────────────────
    const blockId = this.addressToBlockId.get(address);
    if (blockId) {
      const metadata = this.blockMetadata.get(blockId)!;
      if (metadata.status === 'FREED') {
        throw new Error(`[USE-AFTER-FREE ERROR] Block #${blockId}는 이미 해제됨. 해제된 메모리(0x${address.toString(16)})에 접근할 수 없습니다.`);
      }
    }
    // ────────────────────────────────────────────────────────

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
      if (metadata.status === 'FREED') {
        throw new Error(`[USE-AFTER-FREE ERROR] Block #${blockId}는 이미 해제됨. 해제된 메모리(0x${address.toString(16)})에 쓸 수 없습니다.`);
      }
    }
    // ────────────────────────────────────────────────────────

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

  // ── v4.6: VM Dispatch Optimization ───────────────────────────────────────
  // Call Site Cache: 동일 AST 호출 노드 → 함수 정의 직접 참조 (Map.get 반복 생략)
  private callSiteCache: WeakMap<ASTNode, { params: string[]; body: ASTNode }> = new WeakMap();
  // Inline Hint Cache: 함수명 → 인라인 가능 여부 (1회 분석 후 재사용)
  private inlineCache: Map<string, boolean> = new Map();
  // 함수별 호출 횟수 (Pipeline 모니터링)
  private callCountMap: Map<string, number> = new Map();
  private static readonly HOT_THRESHOLD = 100;
  // ──────────────────────────────────────────────────────────────────────────

  constructor() {
    // v5.9: HeapAllocator 초기화
    this.heapAllocator = new HeapAllocator((msg: string) => this.log(msg));

    this.variables.set('println', this.println.bind(this));

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
    // sizeof(structName) → 패딩 포함된 실제 구조체 크기
    this.variables.set('sizeof', (structName: string) => {
      if (!this.structTable.has(structName)) {
        throw new Error(`[SIZE ERROR] '${structName}' 구조체 미정의`);
      }

      const structDef = this.structTable.get(structName)!;
      const totalSize = structDef.totalSize;  // 패딩 포함됨

      this.log(`[SIZEOF] ${structName} = ${totalSize} bytes (padding included)`);
      return totalSize;
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

    while (this.pc < statements.length) {
      const stmt = statements[this.pc];
      const nextPC = this.executeStatement(stmt, statements);

      if (nextPC === undefined) {
        this.pc++;
      } else {
        this.pc = nextPC;
      }
    }

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
        this.functionTable.set(stmt.name, { params: stmt.params, body: stmt.body });
        this.log(`[FUNC DEF] '${stmt.name}' 등록 (params: [${stmt.params.join(', ')}])`);
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

    switch (node.type) {
      case 'NumberLiteral':
        return node.value;

      case 'StringLiteral':
        return node.value;

      case 'BooleanLiteral':
        return node.value;

      case 'Identifier':
        return this.variables.get(node.name);

      case 'VariableDeclaration': {
        const val = this.eval(node.value);
        this.variables.set(node.name, val);
        // v4.2: DELIVERY 추적 — 함수 호출 결과가 변수에 안착하는 순간
        if (node.value?.type === 'CallExpression') {
          const callee = node.value.callee?.name ?? '?';
          this.log(`[DELIVERY] '${callee}()' 반환값 ${val} → '${node.name}'`);
        }
        return val;
      }

      case 'Assignment': {
        const val = this.eval(node.value);
        this.variables.set(node.name, val);
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
        return elems;
      }

      case 'BinaryOp':
        return this.evalBinaryOp(node);

      case 'UnaryOp':
        return this.evalUnaryOp(node);

      case 'CallExpression':
        return this.evalCall(node);

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

        // v5.7: p1.field 형태 (단일 구조체)
        const obj = this.eval(node.object);
        if (!obj || obj.__type !== 'struct') throw new Error(`[MEMBER ERROR] 구조체가 아님`);
        const structDef = this.structTable.get(obj.__typeName);
        const fieldDef = structDef?.fields.find((f: any) => f.name === node.field);
        if (!fieldDef) throw new Error(`[MEMBER ERROR] '${obj.__typeName}'에 '${node.field}' 필드 없음`);
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
        if (!obj || obj.__type !== 'struct') throw new Error(`[MEMBER ERROR] ${objName}은 구조체가 아님`);
        const structDef = this.structTable.get(obj.__typeName);
        const fieldDef = structDef?.fields.find((f: any) => f.name === node.field);
        if (!fieldDef) throw new Error(`[MEMBER ERROR] '${obj.__typeName}'에 '${node.field}' 필드 없음`);
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

      case 'ReturnStatement': {
        // v4.0: RETURN — 값을 회수하고 returnFlag를 올림
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
        this.log(`[IF-EVAL] 조건 평가 시작`);
        const cond = this.eval(node.condition);
        this.log(`[IF-EVAL] 조건 결과: ${cond}`);
        if (cond) {
          this.log(`[IF-EVAL] TRUE 브랜치 실행`);
          const thenResult = this.eval(node.thenBranch);
          if (this.breakFlag || this.continueFlag) {
            this.log(`[IF-EVAL] breakFlag=${this.breakFlag}, continueFlag=${this.continueFlag} 감지`);
          }
          return thenResult;
        } else if (node.elseBranch) {
          this.log(`[IF-EVAL] FALSE 브랜치 실행`);
          const elseResult = this.eval(node.elseBranch);
          if (this.breakFlag || this.continueFlag) {
            this.log(`[IF-EVAL] breakFlag=${this.breakFlag}, continueFlag=${this.continueFlag} 감지`);
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

    this.log(`[CALL] '${name}(${args.join(', ')})' → Depth=${callDepth + 1}`);

    // ── 1. Return Address: 현재 스코프 전체를 Call Stack에 저장 ──────────
    const savedScope = new Map(this.variables);
    this.callStack.push({ savedScope, functionName: name, callDepth });

    // ── 2. v4.2 HANDOVER: 인자 → 매개변수 순서대로 바인딩 ─────────────────
    const localScope = new Map<string, any>();
    localScope.set('println', this.println.bind(this));

    this.log(`[HANDOVER] ${fn.params.length}개 인자 전달 시작`);
    for (let i = 0; i < fn.params.length; i++) {
      const paramName = fn.params[i];
      const argVal   = args[i] ?? null;
      localScope.set(paramName, argVal);
      this.log(`[HANDOVER] [${i}] 호출자 args[${i}]=${argVal} → 로컬 '${paramName}'`);
    }

    this.variables = localScope;
    this.indentLevel++;

    // ── 3. 함수 바디 실행 ────────────────────────────────────────────────
    for (const stmt of fn.body.statements) {
      this.eval(stmt);
      if (this.returnFlag) break; // RETURN 신호 감지 즉시 탈출
    }

    // ── 4. v4.2 LOCAL ISOLATION: 소멸할 로컬 변수 목록 기록 ──────────────
    const localVarNames = [...this.variables.keys()]
      .filter(k => k !== 'println');
    this.log(`[LOCAL ISOLATION] 소멸 예정 로컬 변수: [${localVarNames.join(', ')}]`);

    // ── 5. 반환값 회수 ────────────────────────────────────────────────────
    const retVal = this.returnValue ?? null;
    this.returnValue = undefined;
    this.returnFlag = false;
    this.log(`[RETURN COMPLETE] '${name}' 반환값: ${retVal}`);

    // ── 6. Call Stack Pop: 이전 스코프 복구 (Memory Cleanup) ─────────────
    this.indentLevel--;
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

    return retVal;
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
   * v5.9: 메모리 누수 감지 (프로그램 종료 시 호출)
   */
  public checkMemoryLeaks(): void {
    const leakedBlocks = this.heapAllocator.getAllocatedBlocks();
    if (leakedBlocks.length > 0) {
      this.log(`[LEAK WARNING] ${leakedBlocks.length}개 블록이 해제되지 않음`);
      let totalLeaked = 0;
      for (const block of leakedBlocks) {
        this.log(`  - 0x${block.address.toString(16)}: ${block.size} bytes`);
        totalLeaked += block.size;
      }
      this.log(`[LEAK TOTAL] ${totalLeaked} bytes 미해제`);
    } else {
      this.log(`[MEMORY OK] 메모리 누수 없음 ✅`);
    }
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
