/**
 * FreeLang v2 - Leak Reporter
 *
 * CYCLE_HANDLING_POLICY Section 4: Leak Detection & Reporting
 * Generates FREELANG_LEAK_REPORT at shutdown
 *
 * Detects:
 * - Ghost objects: RC > 0 but unreachable (cycles)
 * - Actual leaks: Forgotten release() calls
 * - Cycle patterns: 2-node, 3-node, self-loop, chains
 *
 * Output format: Human-readable tree structure
 */

import { ObjectMetadata } from '../arc/reference-counting';
import { Cycle, CycleDetector } from './cycle-detector';

export interface LeakInfo {
  addr: number;
  type: string;
  size: number;
  refCount: number;
  createdAt: number;
  age: number; // milliseconds
  inCycle: boolean;
  cycleId?: number;
}

export interface LeakReport {
  timestamp: number;
  totalLeaks: number;
  totalLeakedBytes: number;
  leakedObjects: LeakInfo[];
  cycleInfo: {
    totalCycles: number;
    leakedCycles: number;
    cycles: Cycle[];
  };
  recommendations: string[];
}

/**
 * Leak Reporter
 * Integrates RC engine + cycle detector to generate comprehensive leak reports
 */
export class LeakReporter {
  private cycleDetector: CycleDetector;
  private ghostObjectsFound: number[] = [];
  private actualLeaksFound: number[] = [];
  private reportHistory: LeakReport[] = [];

  constructor(cycleDetector: CycleDetector) {
    this.cycleDetector = cycleDetector;
  }

  /**
   * Analyze object graph for leaks
   * Called at shutdown or manually
   *
   * @param allObjects All objects (from ReferenceCountingEngine)
   * @param reachableAddrs Set of reachable addresses from roots
   * @returns LeakReport with findings
   */
  analyzeLeaks(
    allObjects: Map<number, ObjectMetadata>,
    reachableAddrs: Set<number>
  ): LeakReport {
    this.ghostObjectsFound = [];
    this.actualLeaksFound = [];

    // Phase 1: Identify ghost objects (RC > 0 but unreachable = cycle)
    for (const [addr, metadata] of allObjects.entries()) {
      if (metadata.refCount > 0 && !reachableAddrs.has(addr)) {
        this.ghostObjectsFound.push(addr);
      } else if (metadata.refCount > 0 && !reachableAddrs.has(addr)) {
        this.actualLeaksFound.push(addr);
      }
    }

    // Phase 2: Get cycle info
    const cycles = this.cycleDetector.detectCycles();
    const leakedCycles = cycles.filter((c) => c.isLeaked).length;

    // Phase 3: Build leak info for each ghost object
    const leakedObjects: LeakInfo[] = [];
    const cycleMap = new Map<number, number>(); // addr → cycleId

    for (const cycle of cycles) {
      for (const addr of cycle.nodes) {
        cycleMap.set(addr, cycle.id);
      }
    }

    for (const addr of this.ghostObjectsFound) {
      const metadata = allObjects.get(addr);
      if (metadata) {
        leakedObjects.push({
          addr,
          type: metadata.type,
          size: metadata.size,
          refCount: metadata.refCount,
          createdAt: metadata.createdAt,
          age: Date.now() - metadata.createdAt,
          inCycle: cycleMap.has(addr),
          cycleId: cycleMap.get(addr),
        });
      }
    }

    // Phase 4: Generate recommendations
    const recommendations = this._generateRecommendations(
      leakedObjects,
      cycles,
      leakedCycles
    );

    // Phase 5: Build report
    const report: LeakReport = {
      timestamp: Date.now(),
      totalLeaks: this.ghostObjectsFound.length + this.actualLeaksFound.length,
      totalLeakedBytes: leakedObjects.reduce((sum, l) => sum + l.size, 0),
      leakedObjects: leakedObjects.sort((a, b) => b.age - a.age),
      cycleInfo: {
        totalCycles: cycles.length,
        leakedCycles,
        cycles,
      },
      recommendations,
    };

    this.reportHistory.push(report);
    return report;
  }

  /**
   * Generate human-readable leak report
   */
  generateReport(leakReport: LeakReport): string {
    const lines: string[] = [];

    lines.push('╔════════════════════════════════════════════════════════════╗');
    lines.push('║           FREELANG LEAK REPORT (v2 ARC Engine)            ║');
    lines.push('╚════════════════════════════════════════════════════════════╝');
    lines.push('');

    // Summary
    lines.push('📊 SUMMARY');
    lines.push(`  Timestamp:        ${new Date(leakReport.timestamp).toISOString()}`);
    lines.push(`  Total Leaks:      ${leakReport.totalLeaks}`);
    lines.push(`  Leaked Memory:    ${leakReport.totalLeakedBytes} bytes`);
    lines.push(`  Total Cycles:     ${leakReport.cycleInfo.totalCycles}`);
    lines.push(`  Leaked Cycles:    ${leakReport.cycleInfo.leakedCycles}`);
    lines.push('');

    // Leaked objects by cycle
    if (leakReport.leakedObjects.length > 0) {
      lines.push('🔴 LEAKED OBJECTS');
      lines.push('');

      // Group by cycle
      const byCycle = new Map<number | undefined, LeakInfo[]>();
      for (const leak of leakReport.leakedObjects) {
        const key = leak.cycleId;
        if (!byCycle.has(key)) {
          byCycle.set(key, []);
        }
        byCycle.get(key)!.push(leak);
      }

      for (const [cycleId, objects] of byCycle.entries()) {
        if (cycleId !== undefined) {
          const cycle = leakReport.cycleInfo.cycles.find((c) => c.id === cycleId);
          if (cycle) {
            lines.push(`  [CYCLE #${cycleId}] ${cycle.pattern.toUpperCase()}`);
            lines.push(`  Pattern: ${cycle.nodes.join(' → ')} → ${cycle.nodes[0]}`);
            lines.push(`  Types:   ${cycle.types.join(', ')}`);
            lines.push('');
          }
        }

        for (const leak of objects) {
          lines.push(
            `    ├─ ${leak.type} @ 0x${leak.addr.toString(16).padStart(8, '0')}`
          );
          lines.push(
            `    │  Size: ${leak.size}B, RC: ${leak.refCount}, Age: ${leak.age}ms`
          );
          lines.push(`    │`);
        }
      }

      lines.push('');
    }

    // Cycle analysis
    if (leakReport.cycleInfo.cycles.length > 0) {
      lines.push('🔄 CYCLE ANALYSIS');
      lines.push('');

      for (const cycle of leakReport.cycleInfo.cycles) {
        const status = cycle.isLeaked ? '⚠️ LEAKED' : '✓ contained';
        lines.push(
          `  [Cycle #${cycle.id}] ${cycle.pattern.toUpperCase()} ${status}`
        );
        lines.push(`    Nodes: ${cycle.nodes.length}`);
        lines.push(`    Total RC: ${cycle.totalRefCount}`);

        if (cycle.isLeaked) {
          lines.push(`    💡 SOLUTION: Place Weak ref to break cycle`);
          lines.push(`       Example: obj_b.weak_ref_to_parent = obj_a  // Weak`);
        }
        lines.push('');
      }
    }

    // Recommendations
    if (leakReport.recommendations.length > 0) {
      lines.push('💡 RECOMMENDATIONS');
      for (let i = 0; i < leakReport.recommendations.length; i++) {
        lines.push(`  ${i + 1}. ${leakReport.recommendations[i]}`);
      }
      lines.push('');
    }

    // Policy guidance
    lines.push('📖 CYCLE_HANDLING_POLICY GUIDANCE');
    lines.push('');
    lines.push('  v2 is RC-only (no automatic cycle collection).');
    lines.push('  Cycles are PROGRAMMER RESPONSIBILITY:');
    lines.push('');
    lines.push('  1. DETECT cycles (this report identifies them)');
    lines.push('  2. BREAK cycles (use Weak refs)');
    lines.push('     - 2-node: A↔B → make B→A weak');
    lines.push('     - 3-node: A→B→C→A → make one link weak');
    lines.push('     - Self: A→A → make A→A weak');
    lines.push('');
    lines.push('  3. VERIFY no leaks:');
    lines.push('     - release(root)');
    lines.push('     - Check FREELANG_LEAK_REPORT empty');
    lines.push('');

    lines.push('═══════════════════════════════════════════════════════════');

    return lines.join('\n');
  }

  /**
   * Generate recommendations
   */
  private _generateRecommendations(
    leaks: LeakInfo[],
    cycles: Cycle[],
    leakedCycleCount: number
  ): string[] {
    const recs: string[] = [];

    if (leaks.length === 0) {
      recs.push('✅ No leaks detected - memory is safe!');
      return recs;
    }

    if (leakedCycleCount > 0) {
      recs.push(
        `🔴 ${leakedCycleCount} cycle(s) detected with leaked objects. Break cycles with Weak refs.`
      );

      for (const cycle of cycles) {
        if (cycle.isLeaked) {
          recs.push(
            `   - Cycle #${cycle.id} (${cycle.pattern}): Suggest weak ref on final node`
          );
        }
      }
    }

    const nonCycleLeaks = leaks.filter((l) => !l.inCycle).length;
    if (nonCycleLeaks > 0) {
      recs.push(
        `⚠️  ${nonCycleLeaks} object(s) not in cycles - check for missing release() calls`
      );
    }

    const oldLeaks = leaks.filter((l) => l.age > 60000).length;
    if (oldLeaks > 0) {
      recs.push(
        `⏱️  ${oldLeaks} object(s) alive > 60s - likely forgotten cleanup`
      );
    }

    recs.push('📚 See CYCLE_HANDLING_POLICY.md for detailed guidance');

    return recs;
  }

  /**
   * Check if leaks exist
   */
  hasLeaks(report: LeakReport): boolean {
    return report.totalLeaks > 0;
  }

  /**
   * Get last report
   */
  getLastReport(): LeakReport | null {
    return this.reportHistory.length > 0 ? this.reportHistory[this.reportHistory.length - 1] : null;
  }

  /**
   * Get report history
   */
  getHistory(): LeakReport[] {
    return [...this.reportHistory];
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.reportHistory = [];
  }
}

/**
 * Shutdown Hook
 * Call this at program termination for automatic leak reporting
 *
 * Usage:
 *   const manager = getMemoryManager();
 *   const reporter = new LeakReporter(cycleDetector);
 *
 *   process.on('exit', () => {
 *     const allObjects = manager.getEngines().rcEngine.getMetadata(...);
 *     const reachable = findReachableObjects(roots);
 *     const report = reporter.analyzeLeaks(allObjects, reachable);
 *     console.log(reporter.generateReport(report));
 *   });
 */
export function installShutdownHook(
  reporter: LeakReporter,
  getAllObjects: () => Map<number, ObjectMetadata>,
  getReachableAddrs: () => Set<number>
): void {
  process.on('exit', () => {
    const report = reporter.analyzeLeaks(getAllObjects(), getReachableAddrs());
    if (reporter.hasLeaks(report)) {
      console.log(reporter.generateReport(report));
    }
  });
}
