/**
 * Phase 23: Memory Leak Detection
 * Monitor memory usage + detect potential leaks
 *
 * 목표:
 * - Heap memory 추적
 * - Growth rate 모니터링
 * - 누수 패턴 탐지
 * - GC 효율성 분석
 */

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
  arrayBuffers: number;
}

export interface MemoryTrend {
  heapGrowthRate: number; // bytes/sec
  isLeaking: boolean;
  confidenceScore: number; // 0-1
  estimatedLeakRate?: number;
}

export class MemoryMonitor {
  private snapshots: MemorySnapshot[] = [];
  private maxSnapshots = 360; // 6시간 (1분마다)
  private baselineHeap = 0;
  private thresholdGrowth = 50 * 1024 * 1024; // 50MB
  private windowSize = 60; // 60개 스냅샷

  constructor() {
    // 초기 스냅샷
    this.snapshot();
    this.baselineHeap = this.snapshots[0].heapUsed;
  }

  /**
   * 메모리 스냅샷 캡처
   */
  snapshot(): MemorySnapshot {
    const mem = process.memoryUsage();
    const snap: MemorySnapshot = {
      timestamp: Date.now(),
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      rss: mem.rss,
      external: mem.external,
      arrayBuffers: mem.arrayBuffers || 0
    };

    this.snapshots.push(snap);

    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    return snap;
  }

  /**
   * 메모리 누수 탐지
   */
  detectLeak(): MemoryTrend {
    if (this.snapshots.length < this.windowSize) {
      return {
        heapGrowthRate: 0,
        isLeaking: false,
        confidenceScore: 0
      };
    }

    const recent = this.snapshots.slice(-this.windowSize);
    const first = recent[0];
    const last = recent[recent.length - 1];

    const timeDelta = (last.timestamp - first.timestamp) / 1000; // seconds
    const heapDelta = last.heapUsed - first.heapUsed; // bytes
    const growthRate = heapDelta / timeDelta;

    // 통계적 분석
    const heapValues = recent.map(s => s.heapUsed);
    const mean = heapValues.reduce((a, b) => a + b) / heapValues.length;
    const variance = heapValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / heapValues.length;
    const stdDev = Math.sqrt(variance);

    // 누수 판정: 지속적인 상승 + 높은 성장률
    const isLeaking = growthRate > 100 * 1024; // > 100KB/sec
    const confidenceScore = Math.min(1, Math.abs(growthRate) / (this.thresholdGrowth / this.windowSize));

    return {
      heapGrowthRate: growthRate,
      isLeaking,
      confidenceScore,
      estimatedLeakRate: isLeaking ? growthRate * 3600 : undefined // per hour
    };
  }

  /**
   * 강제 GC + 메모리 정리 (추천: 프로덕션에서는 신중하게 사용)
   */
  async forceCleanup(): Promise<MemorySnapshot> {
    if (global.gc) {
      global.gc();
    }

    // 약간의 지연으로 GC 완료 대기
    await new Promise(resolve => setTimeout(resolve, 100));

    return this.snapshot();
  }

  /**
   * 메모리 리포트
   */
  getReport(): {
    current: MemorySnapshot;
    baseline: number;
    growth: number;
    trend: MemoryTrend;
    health: 'GOOD' | 'WARNING' | 'CRITICAL';
  } {
    const current = this.snapshots[this.snapshots.length - 1] || this.snapshot();
    const trend = this.detectLeak();
    const growth = current.heapUsed - this.baselineHeap;

    let health: 'GOOD' | 'WARNING' | 'CRITICAL' = 'GOOD';
    if (trend.confidenceScore > 0.7) {
      health = 'CRITICAL';
    } else if (growth > this.thresholdGrowth / 2) {
      health = 'WARNING';
    }

    return {
      current,
      baseline: this.baselineHeap,
      growth,
      trend,
      health
    };
  }

  /**
   * 히스토리 조회
   */
  getHistory(limit?: number): MemorySnapshot[] {
    return limit ? this.snapshots.slice(-limit) : [...this.snapshots];
  }

  /**
   * 리셋
   */
  reset(): void {
    this.snapshots = [];
    this.snapshot();
    this.baselineHeap = this.snapshots[0].heapUsed;
  }
}

export const memoryMonitor = new MemoryMonitor();

export default memoryMonitor;
