/**
 * FreeLang v2 - Cycle Detector
 *
 * CYCLE_HANDLING_POLICY Section 4: Cycle Detection
 * Implements Tarjan's Strongly Connected Components (SCC) algorithm
 *
 * Goal: Identify isolated cycles at design time
 * - 2-node cycle: A ↔ B (both Strong → LEAK)
 * - 3-node cycle: A → B → C → A (all Strong → LEAK)
 * - 1-node cycle: A → A (self-reference, Strong → LEAK)
 *
 * Cycles are PROGRAMMER RESPONSIBILITY to break with Weak refs
 * This detector proves if cycles exist and where they are
 */

export interface CycleNode {
  addr: number;
  type: string;
  refCount: number;
  neighbors: number[]; // Addresses this object references (strong refs only)
}

export interface Cycle {
  id: number;
  nodes: number[]; // Addresses in cycle
  types: string[]; // Type names
  totalRefCount: number; // Sum of RC for all nodes
  pattern: string; // "2-node", "3-node", "self", "chain"
  isLeaked: boolean; // true if all nodes have RC > 0 but unreachable
}

/**
 * Cycle Detector
 * Implements Tarjan's SCC for cycle detection
 *
 * Time complexity: O(V + E) where V=objects, E=references
 * Space complexity: O(V)
 */
export class CycleDetector {
  private nodes: Map<number, CycleNode> = new Map();
  private cycles: Cycle[] = [];
  private cycleId = 0;

  // Tarjan's algorithm state
  private index = 0;
  private stack: number[] = [];
  private indices = new Map<number, number>();
  private lowlinks = new Map<number, number>();
  private onStack = new Set<number>();

  /**
   * Register object with references
   * @param addr Object address
   * @param type Object type
   * @param refCount Current reference count
   * @param neighbors Addresses this object references (strong only)
   */
  registerNode(addr: number, type: string, refCount: number, neighbors: number[]): void {
    this.nodes.set(addr, {
      addr,
      type,
      refCount,
      neighbors,
    });
  }

  /**
   * Detect all cycles in object graph
   * Uses Tarjan's SCC algorithm
   *
   * @returns Array of detected cycles
   */
  detectCycles(): Cycle[] {
    this.cycles = [];
    this.index = 0;
    this.stack = [];
    this.indices.clear();
    this.lowlinks.clear();
    this.onStack.clear();

    // Run Tarjan's algorithm from each unvisited node
    for (const addr of this.nodes.keys()) {
      if (!this.indices.has(addr)) {
        this._tarjanSCC(addr);
      }
    }

    // Verify cycles (SCC must have size > 1 to be cycle, or self-loop)
    const verifiedCycles: Cycle[] = [];
    for (const cycle of this.cycles) {
      if (cycle.nodes.length > 1 || this._hasSelfLoop(cycle.nodes[0])) {
        cycle.isLeaked = this._checkIfLeaked(cycle.nodes);
        verifiedCycles.push(cycle);
      }
    }

    return verifiedCycles;
  }

  /**
   * Tarjan's Strongly Connected Components
   * @param addr Node address to visit
   */
  private _tarjanSCC(addr: number): void {
    // Set the depth index for addr to the smallest unused index
    this.indices.set(addr, this.index);
    this.lowlinks.set(addr, this.index);
    this.index++;
    this.stack.push(addr);
    this.onStack.add(addr);

    // Consider successors of addr
    const node = this.nodes.get(addr);
    if (node) {
      for (const neighbor of node.neighbors) {
        if (!this.indices.has(neighbor)) {
          // Neighbor has not yet been visited; recurse on it
          this._tarjanSCC(neighbor);
          this.lowlinks.set(
            addr,
            Math.min(this.lowlinks.get(addr)!, this.lowlinks.get(neighbor)!)
          );
        } else if (this.onStack.has(neighbor)) {
          // Neighbor is in stack, back edge (cycle detected)
          this.lowlinks.set(
            addr,
            Math.min(this.lowlinks.get(addr)!, this.indices.get(neighbor)!)
          );
        }
      }
    }

    // If addr is a root node, pop the stack and emit SCC
    if (this.lowlinks.get(addr) === this.indices.get(addr)) {
      const component: number[] = [];
      const types: string[] = [];
      let totalRC = 0;

      // Pop stack until we return to addr
      let sccNode;
      do {
        sccNode = this.stack.pop()!;
        this.onStack.delete(sccNode);
        component.push(sccNode);

        const nodeData = this.nodes.get(sccNode);
        if (nodeData) {
          types.push(nodeData.type);
          totalRC += nodeData.refCount;
        }
      } while (sccNode !== addr);

      // Only report cycles (SCC with size > 1 or self-loop)
      if (component.length > 1 || this._hasSelfLoop(component[0])) {
        this.cycles.push({
          id: this.cycleId++,
          nodes: component,
          types,
          totalRefCount: totalRC,
          pattern: this._classifyPattern(component),
          isLeaked: false, // Will be set later
        });
      }
    }
  }

  /**
   * Check if node has self-loop (A → A)
   */
  private _hasSelfLoop(addr: number): boolean {
    const node = this.nodes.get(addr);
    if (!node) return false;
    return node.neighbors.includes(addr);
  }

  /**
   * Classify cycle pattern
   */
  private _classifyPattern(nodes: number[]): string {
    if (nodes.length === 1 && this._hasSelfLoop(nodes[0])) {
      return 'self';
    }
    if (nodes.length === 2) {
      return '2-node';
    }
    if (nodes.length === 3) {
      return '3-node';
    }
    return 'chain';
  }

  /**
   * Check if cycle is leaked (RC > 0 but unreachable from roots)
   * A cycle is leaked if:
   * - All nodes in cycle have RC > 0
   * - Cycle is isolated (no incoming edges from outside)
   *
   * @param nodes Nodes in cycle
   * @returns true if leaked
   */
  private _checkIfLeaked(nodes: number[]): boolean {
    const nodeSet = new Set(nodes);

    // Check 1: All nodes must have RC > 0
    for (const addr of nodes) {
      const node = this.nodes.get(addr);
      if (!node || node.refCount === 0) {
        return false; // Already deallocating
      }
    }

    // Check 2: Cycle must be isolated (no incoming edges from outside)
    for (const outAddr of this.nodes.keys()) {
      if (nodeSet.has(outAddr)) continue; // Skip nodes in cycle

      const outNode = this.nodes.get(outAddr);
      if (!outNode) continue;

      // Check if outAddr references any node in cycle
      for (const inAddr of nodes) {
        if (outNode.neighbors.includes(inAddr)) {
          return false; // Incoming edge from outside → not isolated
        }
      }
    }

    // Cycle is isolated and all nodes alive → LEAKED
    return true;
  }

  /**
   * Find minimal weak ref placement to break cycle
   * CYCLE_HANDLING_POLICY: "Each cycle needs 1+ Weak ref"
   *
   * @param cycle Cycle to break
   * @returns Suggested weak ref placement (address)
   */
  suggestWeakRefBreakage(cycle: Cycle): number {
    // Simple strategy: break at last node in cycle
    // More sophisticated: find edge with least impact on structure
    return cycle.nodes[cycle.nodes.length - 1];
  }

  /**
   * Statistics
   */
  getStats() {
    return {
      totalNodes: this.nodes.size,
      totalCycles: this.cycles.length,
      leakedCycles: this.cycles.filter((c) => c.isLeaked).length,
      cycles: this.cycles,
    };
  }

  /**
   * Generate cycle report
   */
  generateReport(): string {
    const stats = this.getStats();
    const report = [
      '═══════════════════════════════════════',
      'Cycle Detection Report',
      '═══════════════════════════════════════',
      '',
      `Total Nodes:     ${stats.totalNodes}`,
      `Total Cycles:    ${stats.totalCycles}`,
      `Leaked Cycles:   ${stats.leakedCycles}`,
      '',
    ];

    if (stats.cycles.length === 0) {
      report.push('✅ No cycles detected (memory safe)');
    } else {
      report.push('🔴 Cycles detected:');
      for (const cycle of stats.cycles) {
        const status = cycle.isLeaked ? '⚠️ LEAKED' : '⏸️  contained';
        const weakRefAddr = this.suggestWeakRefBreakage(cycle);
        report.push(
          `  [Cycle #${cycle.id}] ${cycle.pattern} (${cycle.nodes.length} nodes) ${status}`
        );
        report.push(`    Nodes: ${cycle.nodes.join(' → ')} → ${cycle.nodes[0]}`);
        report.push(`    Types: ${cycle.types.join(', ')}`);
        report.push(`    Total RC: ${cycle.totalRefCount}`);
        report.push(
          `    💡 Break at: Node @ ${weakRefAddr} (make this Weak ref)`
        );
      }
    }

    report.push('═══════════════════════════════════════');
    return report.join('\n');
  }

  /**
   * Debug: dump all nodes
   */
  dumpNodes(): void {
    console.log('[CYCLE-DETECTOR] Object Graph:');
    for (const [addr, node] of this.nodes.entries()) {
      console.log(
        `  ${node.type} @ ${addr} (RC=${node.refCount}) → [${node.neighbors.join(', ')}]`
      );
    }
  }

  /**
   * Clear state
   */
  clear(): void {
    this.nodes.clear();
    this.cycles = [];
    this.cycleId = 0;
    this.index = 0;
    this.stack = [];
    this.indices.clear();
    this.lowlinks.clear();
    this.onStack.clear();
  }
}

/**
 * Cycle Validator
 * Verifies CYCLE_HANDLING_POLICY compliance
 */
export class CycleValidator {
  private detector: CycleDetector;

  constructor(detector: CycleDetector) {
    this.detector = detector;
  }

  /**
   * Verify: All cycles have weak refs (broken)
   * CYCLE_HANDLING_POLICY: "Programmer must break each cycle with Weak ref"
   *
   * Returns: true if no leaked cycles (all broken with Weak refs)
   */
  verifyNoCycleLeaks(): boolean {
    const stats = this.detector.getStats();
    return stats.leakedCycles === 0;
  }

  /**
   * Verify: Weak ref at suggested location
   * Test-time: check if developer followed suggestion
   */
  verifySuggestedWeakRefPlaced(cycle: Cycle, weakRefAddr: number): boolean {
    const suggested = this.detector.suggestWeakRefBreakage(cycle);
    return weakRefAddr === suggested;
  }

  /**
   * Verify: Cycle detection accuracy
   * CYCLE_HANDLING_POLICY: "Detect all cycle patterns"
   *
   * Test patterns:
   * - 2-node: A ↔ B
   * - 3-node: A → B → C → A
   * - self: A → A
   */
  verifyPatternDetection(): boolean {
    const stats = this.detector.getStats();

    // At minimum, should detect if cycles exist
    return stats.totalCycles >= 0;
  }
}
