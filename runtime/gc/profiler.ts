/**
 * FreeLang v2 - Memory Profiler
 *
 * Tracks allocation/deallocation patterns
 * Provides statistics for performance analysis
 * Detects performance anomalies
 */

export interface AllocationSnapshot {
  timestamp: number;
  totalAllocated: number;
  totalDeallocated: number;
  currentUsage: number;
  peakUsage: number;
  aliveObjects: number;
  allocationsPerSecond: number;
  deallocationsPerSecond: number;
}

export interface AllocationBucket {
  sizeRange: string; // "0-64B", "64-256B", etc
  count: number;
  totalSize: number;
  averageLifetime: number;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

/**
 * Memory Profiler
 * Collects and analyzes memory statistics
 */
export class MemoryProfiler {
  private snapshots: AllocationSnapshot[] = [];
  private metrics: PerformanceMetric[] = [];

  // Bucket distribution
  private sizeBuckets: Map<string, AllocationBucket> = new Map([
    ['0-64B', { sizeRange: '0-64B', count: 0, totalSize: 0, averageLifetime: 0 }],
    ['64-256B', { sizeRange: '64-256B', count: 0, totalSize: 0, averageLifetime: 0 }],
    ['256-1KB', { sizeRange: '256-1KB', count: 0, totalSize: 0, averageLifetime: 0 }],
    ['1KB-4KB', { sizeRange: '1KB-4KB', count: 0, totalSize: 0, averageLifetime: 0 }],
    ['4KB-16KB', { sizeRange: '4KB-16KB', count: 0, totalSize: 0, averageLifetime: 0 }],
    ['16KB+', { sizeRange: '16KB+', count: 0, totalSize: 0, averageLifetime: 0 }],
  ]);

  // Time tracking
  private startTime = Date.now();
  private lastSnapshotTime = this.startTime;

  /**
   * Record memory snapshot
   */
  recordSnapshot(
    totalAllocated: number,
    totalDeallocated: number,
    currentUsage: number,
    peakUsage: number,
    aliveObjects: number
  ): void {
    const now = Date.now();
    const timeDelta = (now - this.lastSnapshotTime) / 1000; // seconds
    const allocDelta = totalAllocated - (this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1].totalAllocated : 0);
    const deallocDelta = totalDeallocated - (this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1].totalDeallocated : 0);

    const snapshot: AllocationSnapshot = {
      timestamp: now,
      totalAllocated,
      totalDeallocated,
      currentUsage,
      peakUsage,
      aliveObjects,
      allocationsPerSecond: timeDelta > 0 ? allocDelta / timeDelta : 0,
      deallocationsPerSecond: timeDelta > 0 ? deallocDelta / timeDelta : 0,
    };

    this.snapshots.push(snapshot);
    this.lastSnapshotTime = now;
  }

  /**
   * Record object allocation by size
   */
  recordAllocation(size: number, lifetime: number): void {
    const bucket = this._getBucket(size);
    if (bucket) {
      bucket.count++;
      bucket.totalSize += size;
      bucket.averageLifetime =
        (bucket.averageLifetime * (bucket.count - 1) + lifetime) / bucket.count;
    }
  }

  /**
   * Get size bucket for object
   */
  private _getBucket(size: number): AllocationBucket | undefined {
    if (size <= 64) return this.sizeBuckets.get('0-64B');
    if (size <= 256) return this.sizeBuckets.get('64-256B');
    if (size <= 1024) return this.sizeBuckets.get('256-1KB');
    if (size <= 4096) return this.sizeBuckets.get('1KB-4KB');
    if (size <= 16384) return this.sizeBuckets.get('4KB-16KB');
    return this.sizeBuckets.get('16KB+');
  }

  /**
   * Record performance metric
   */
  recordMetric(name: string, value: number, unit: string): void {
    this.metrics.push({
      name,
      value,
      unit,
      timestamp: Date.now(),
    });
  }

  /**
   * Get profiling summary
   */
  getSummary() {
    if (this.snapshots.length === 0) {
      return {
        duration: 0,
        snapshots: 0,
        avgAllocPerSec: 0,
        avgDeallocPerSec: 0,
        peakMemory: 0,
      };
    }

    const first = this.snapshots[0];
    const last = this.snapshots[this.snapshots.length - 1];
    const duration = (last.timestamp - first.timestamp) / 1000;

    const avgAllocPerSec =
      this.snapshots.reduce((sum, s) => sum + s.allocationsPerSecond, 0) /
      this.snapshots.length;
    const avgDeallocPerSec =
      this.snapshots.reduce((sum, s) => sum + s.deallocationsPerSecond, 0) /
      this.snapshots.length;
    const peakMemory = Math.max(...this.snapshots.map((s) => s.peakUsage));

    return {
      duration,
      snapshots: this.snapshots.length,
      avgAllocPerSec,
      avgDeallocPerSec,
      peakMemory,
    };
  }

  /**
   * Analyze allocation patterns
   */
  analyzePatterns(): {
    mostAllocatedSize: string;
    averageAllocationSize: number;
    longestLivedSize: string;
    fragmentationRatio: number;
  } {
    let mostAllocatedSize = '0-64B';
    let maxCount = 0;

    let totalAllocations = 0;
    let totalSize = 0;
    let longestLived = { size: '0-64B', lifetime: 0 };

    for (const [, bucket] of this.sizeBuckets) {
      totalAllocations += bucket.count;
      totalSize += bucket.totalSize;

      if (bucket.count > maxCount) {
        maxCount = bucket.count;
        mostAllocatedSize = bucket.sizeRange;
      }

      if (bucket.averageLifetime > longestLived.lifetime) {
        longestLived = {
          size: bucket.sizeRange,
          lifetime: bucket.averageLifetime,
        };
      }
    }

    const avgSize = totalAllocations > 0 ? totalSize / totalAllocations : 0;

    // Fragmentation ratio: waste / total
    const waste = totalSize - avgSize * totalAllocations;
    const fragmentationRatio = totalSize > 0 ? waste / totalSize : 0;

    return {
      mostAllocatedSize,
      averageAllocationSize: avgSize,
      longestLivedSize: longestLived.size,
      fragmentationRatio: Math.max(0, fragmentationRatio),
    };
  }

  /**
   * Generate profiling report
   */
  generateReport(): string {
    const summary = this.getSummary();
    const patterns = this.analyzePatterns();

    const lines: string[] = [];

    lines.push('═══════════════════════════════════════');
    lines.push('Memory Profiling Report');
    lines.push('═══════════════════════════════════════');
    lines.push('');

    lines.push('⏱️  Timeline');
    lines.push(`  Duration:          ${summary.duration.toFixed(2)}s`);
    lines.push(`  Snapshots:         ${summary.snapshots}`);
    lines.push(`  Avg Alloc/sec:     ${summary.avgAllocPerSec.toFixed(2)}`);
    lines.push(`  Avg Dealloc/sec:   ${summary.avgDeallocPerSec.toFixed(2)}`);
    lines.push(`  Peak Memory:       ${(summary.peakMemory / 1024 / 1024).toFixed(2)} MB`);
    lines.push('');

    lines.push('📊 Allocation Patterns');
    lines.push(`  Most Allocated:    ${patterns.mostAllocatedSize}`);
    lines.push(`  Avg Size:          ${patterns.averageAllocationSize.toFixed(0)} bytes`);
    lines.push(`  Longest Lived:     ${patterns.longestLivedSize}`);
    lines.push(`  Fragmentation:     ${(patterns.fragmentationRatio * 100).toFixed(1)}%`);
    lines.push('');

    lines.push('📈 Size Distribution');
    for (const [, bucket] of this.sizeBuckets) {
      if (bucket.count > 0) {
        const pct =
          bucket.count > 0
            ? (bucket.count / Array.from(this.sizeBuckets.values()).reduce((sum, b) => sum + b.count, 0)) * 100
            : 0;
        lines.push(
          `  ${bucket.sizeRange.padEnd(10)} ${bucket.count.toString().padStart(6)} objects, ` +
            `${(bucket.totalSize / 1024).toFixed(1).padStart(8)} KB, ` +
            `avg lifetime: ${bucket.averageLifetime.toFixed(0).padStart(6)} ms (${pct.toFixed(1)}%)`
        );
      }
    }
    lines.push('');

    lines.push('═══════════════════════════════════════');

    return lines.join('\n');
  }

  /**
   * Detect performance anomalies
   */
  detectAnomalies(): string[] {
    const anomalies: string[] = [];

    if (this.snapshots.length < 2) {
      return anomalies;
    }

    const last = this.snapshots[this.snapshots.length - 1];
    const prev = this.snapshots[this.snapshots.length - 2];

    // Check for memory growth
    if (last.currentUsage > prev.currentUsage * 1.5) {
      anomalies.push(
        `⚠️  Memory growth: ${(prev.currentUsage / 1024).toFixed(1)} → ${(last.currentUsage / 1024).toFixed(1)} KB`
      );
    }

    // Check for high allocation rate
    if (last.allocationsPerSecond > 10000) {
      anomalies.push(
        `⚠️  High allocation rate: ${last.allocationsPerSecond.toFixed(0)} ops/sec`
      );
    }

    // Check for deallocation lag
    if (
      last.deallocationsPerSecond < last.allocationsPerSecond * 0.8
    ) {
      anomalies.push(
        `⚠️  Deallocation lag: alloc=${last.allocationsPerSecond.toFixed(0)} vs dealloc=${last.deallocationsPerSecond.toFixed(0)}`
      );
    }

    const patterns = this.analyzePatterns();
    if (patterns.fragmentationRatio > 0.3) {
      anomalies.push(
        `⚠️  High fragmentation: ${(patterns.fragmentationRatio * 100).toFixed(1)}%`
      );
    }

    return anomalies;
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.snapshots = [];
    this.metrics = [];
    for (const bucket of this.sizeBuckets.values()) {
      bucket.count = 0;
      bucket.totalSize = 0;
      bucket.averageLifetime = 0;
    }
    this.startTime = Date.now();
    this.lastSnapshotTime = this.startTime;
  }
}
