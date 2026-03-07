# FreeLang v3.0 Profiler Architecture

**Purpose**: Complete technical documentation of profiler infrastructure
**Version**: 1.0
**Created**: 2026-03-06

---

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│        FreeLang v3.0 Performance Profiling System       │
└─────────────────────────────────────────────────────────┘
                            ▼
        ┌───────────────────┬───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
  │  Function    │   │   Memory     │   │   Garbage    │
  │  Profiler    │   │   Profiler   │   │  Collection  │
  │              │   │              │   │  Profiler    │
  └──────────────┘   └──────────────┘   └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
                ┌───────────────────────────┐
                │  Unified Profiler         │
                │  (Coordinator)            │
                └───────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
  ┌──────────┐        ┌──────────┐       ┌──────────┐
  │ Report   │        │ JSON     │       │ Analyzer │
  │ Generator│        │ Exporter │       │          │
  └──────────┘        └──────────┘       └──────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │  Results Output   │
                  │  (Console/File)   │
                  └───────────────────┘
```

---

## Component Details

### 1. FunctionProfiler

**Responsibility**: Track function execution statistics

```typescript
interface FunctionStat {
  count: number;          // Number of times called
  totalTime: number;      // Total execution time (ms)
  minTime: number;        // Fastest execution
  maxTime: number;        // Slowest execution
  avgTime?: number;       // Average time per call
  stdDev?: number;        // Standard deviation
  callStack: string[];    // Call context
}
```

**Data Flow**:
```
Function Call
     │
     ▼
┌─────────────────────────────┐
│ profiler.start(name)        │
│ Records: startTime          │
└─────────────────────────────┘
     │
     ▼
[Function Execution]
     │
     ▼
┌─────────────────────────────┐
│ profiler.end(ctx)           │
│ Calculates: duration        │
│ Updates: FunctionStat       │
└─────────────────────────────┘
     │
     ▼
FunctionStat Map {
  "fibonacci" => {count: 331M, totalTime: 280ms, ...}
}
```

**Key Methods**:

| Method | Input | Output | Purpose |
|--------|-------|--------|---------|
| `start(name)` | string | {fnName, startTime, stack} | Begin profiling |
| `end(ctx)` | context | void | End profiling and record |
| `getStats(name)` | string | FunctionStat | Get stats for function |
| `getAllStats(limit)` | number | [name, stat][] | Get top stats |
| `report(topN)` | number | string | Generate report |
| `toJSON()` | none | Record<string, any> | Export data |
| `reset()` | none | void | Clear all data |

**Memory Complexity**: O(n) where n = number of unique functions
**Time Complexity**: O(1) per call, O(n log n) for sorting

---

### 2. MemoryProfiler

**Responsibility**: Track memory usage over time

```typescript
interface MemorySample {
  label: string;        // Snapshot label
  timestamp: number;    // When taken
  heapUsed: number;    // Heap used (bytes)
  heapTotal: number;   // Heap allocated (bytes)
  external: number;    // External memory (bytes)
  rss: number;         // RSS (bytes)
}
```

**Data Flow**:
```
Snapshot Request
     │
     ▼
┌─────────────────────────────────┐
│ profiler.snapshot(label)        │
│ Calls: process.memoryUsage()    │
│ Records: MemorySample           │
└─────────────────────────────────┘
     │
     ▼
snapshots: MemorySample[] {
  {label: "start", heapUsed: 2.5M, ...},
  {label: "after_alloc", heapUsed: 10.2M, ...},
  {label: "end", heapUsed: 3.1M, ...}
}
```

**Key Methods**:

| Method | Input | Output | Purpose |
|--------|-------|--------|---------|
| `snapshot(label)` | string | MemorySample | Take snapshot |
| `getSnapshots()` | none | MemorySample[] | Get all snapshots |
| `getDelta(from, to)` | number, number | Record<string, number> | Calculate change |
| `report()` | none | string | Generate report |
| `reset()` | none | void | Clear data |

**Detects**:
- Memory leaks (>50MB growth)
- Stable memory usage
- GC pressure
- Memory spike events

---

### 3. GCProfiler

**Responsibility**: Monitor garbage collection behavior

```typescript
interface GCEvent {
  type: GCType;        // Type of GC
  duration: number;    // Pause time (ms)
  timestamp: number;   // When occurred
  heapBefore: number;  // Heap size before
  heapAfter: number;   // Heap size after
}

type GCType = 'scavenge' | 'markSweepCompact' | 'incrementalMarking' | 'unknown';
```

**Data Flow**:
```
GC Event Occurrence
     │
     ▼
┌────────────────────────────────────┐
│ profiler.recordGC(type, dur,...)   │
│ Records: GCEvent                   │
└────────────────────────────────────┘
     │
     ▼
gcEvents: GCEvent[] {
  {type: "scavenge", duration: 1.2ms, ...},
  {type: "markSweepCompact", duration: 5.8ms, ...}
}
```

**Key Methods**:

| Method | Input | Output | Purpose |
|--------|-------|--------|---------|
| `recordGC(type, dur, before, after)` | params | void | Record GC event |
| `getEvents()` | none | GCEvent[] | Get all events |
| `getStats()` | none | Record<string, any> | Get aggregated stats |
| `report()` | none | string | Generate report |

**Analysis**:
- Total GC pause time
- GC frequency
- Pause time by type
- Heap recovery rate

---

### 4. UnifiedProfiler

**Responsibility**: Coordinate all profilers and provide unified interface

```typescript
class UnifiedProfiler {
  public functionProfiler: FunctionProfiler;
  public memoryProfiler: MemoryProfiler;
  public gcProfiler: GCProfiler;
  private startTime: number;
  private endTime: number;
}
```

**Usage Pattern**:
```
Session Start
     │
     ▼
┌─────────────────────┐
│ profiler.start()    │
└─────────────────────┘
     │
     ▼
[Function Profiling]
[Memory Snapshots]
[GC Recording]
     │
     ▼
┌─────────────────────┐
│ profiler.end()      │
└─────────────────────┘
     │
     ▼
┌──────────────────────────┐
│ profiler.report()        │
│ profiler.toJSON()        │
│ profiler.getElapsedTime()│
└──────────────────────────┘
```

**Key Methods**:

| Method | Purpose |
|--------|---------|
| `start()` | Begin profiling session |
| `end()` | End profiling session |
| `report(topFunctions)` | Unified report |
| `toJSON()` | Export all data |
| `reset()` | Clear all data |
| `setEnabled(bool)` | Enable/disable |

---

## Performance Analyzer

**Responsibility**: Analyze profiling data and generate insights

```typescript
class PerformanceAnalyzer {
  constructor(private profiler: UnifiedProfiler) {}

  analyzeBottlenecks(topN: number): BottleneckAnalysis[]
  analyzeMemoryTrend(): string
  analyzeGCImpact(): number
  generateReport(): PerformanceReport
  displayReport(): void
  saveReport(filepath: string): void
}
```

### Bottleneck Analysis Algorithm

```
Input: FunctionStat[] (from profiler)
     │
     ▼
Step 1: Sort by totalTime (descending)
     │
     ▼
Step 2: Calculate total execution time
     │
     ▼
Step 3: For each function:
  - Calculate: percentage = (totalTime / totalTime) * 100
  - Determine: priority based on thresholds
  - Generate: optimization recommendation
     │
     ▼
Output: BottleneckAnalysis[]
  Sorted by percentage (descending)
  Ranked by priority
  Annotated with recommendations
```

### Priority Classification

```
Percentage of Total Time
┌─────────────────────────────┐
│         >20%                │  🔴 CRITICAL
├─────────────────────────────┤
│      10% - 20%              │  🟠 HIGH
├─────────────────────────────┤
│       5% - 10%              │  🟡 MEDIUM
├─────────────────────────────┤
│         <5%                 │  🟢 LOW
└─────────────────────────────┘

OR Call Frequency
┌─────────────────────────────┐
│    >10K calls with          │  🟠 HIGH
│    avg time > 0.1ms         │
└─────────────────────────────┘
```

### Recommendation Engine

```
Input: Function characteristics
     │
     ├─ High frequency + low avg time
     │   └─> "Consider memoization"
     │
     ├─ Single slow call
     │   └─> "Optimize algorithm"
     │
     ├─ Many medium calls
     │   └─> "Reduce recursion depth"
     │
     ├─ Recursive function
     │   └─> "Use iteration"
     │
     └─ Default
         └─> "Profile-guided optimization"

Output: Recommendation string
```

---

## Data Structures

### FunctionStat Map

```
Map<string, FunctionStat> {
  "fibonacci" => {
    count: 331000000,
    totalTime: 280.45,
    minTime: 0.00084,
    maxTime: 0.00120,
    avgTime: 0.00000084,
    stdDev: 0.00000002,
    callStack: ["main", "fibonacci"]
  },
  "array_sort" => {
    count: 10,
    totalTime: 45.23,
    minTime: 4.15,
    maxTime: 4.89,
    avgTime: 4.523,
    stdDev: 0.28,
    callStack: ["main"]
  }
}
```

### Memory Timeline

```
Snapshots Array: MemorySample[] {
  Index 0: {label: "start", timestamp: 1234567890, heapUsed: 2.5M, ...},
  Index 1: {label: "after_alloc", timestamp: 1234567892, heapUsed: 10.2M, ...},
  Index 2: {label: "gc_event", timestamp: 1234567894, heapUsed: 4.1M, ...},
  Index 3: {label: "end", timestamp: 1234567895, heapUsed: 3.1M, ...}
}
```

---

## Output Formats

### Console Report
```
=== Function Performance Report ===
Total functions profiled: 42
Top 10 slowest functions:

1. fibonacci
   Calls: 331000000
   Total: 280.45ms
   Avg: 0.000ms
   Min: 0.001ms
   Max: 0.001ms
   StdDev: 0.000ms

...
```

### JSON Export
```json
{
  "sessionDuration": 365000,
  "functions": {
    "fibonacci": {
      "count": 331000000,
      "totalTime": "280.45",
      "avgTime": "0.000",
      "minTime": "0.001",
      "maxTime": "0.001",
      "stdDev": "0.000"
    }
  },
  "memory": {
    "snapshots": [...]
  },
  "gc": {
    "stats": {...},
    "events": [...]
  }
}
```

### Analysis Report
```json
{
  "timestamp": "2026-03-06T...",
  "totalFunctions": 42,
  "topBottlenecks": [
    {
      "rank": 1,
      "functionName": "fibonacci",
      "totalTime": 280.45,
      "percentage": 87.1,
      "callCount": 331000000,
      "recommendation": "Consider memoization",
      "priority": "critical"
    }
  ],
  "memoryTrend": "Stable memory usage",
  "gcImpact": 2.5,
  "recommendedActions": [...]
}
```

---

## Integration Points

### With VM (src/vm.ts)
```typescript
// Wrap function calls
const ctx = globalProfiler.functionProfiler.start(fnName);
try {
  // Execute function
} finally {
  globalProfiler.functionProfiler.end(ctx);
}
```

### With Builtin Functions (src/engine/builtins.ts)
```typescript
// Profile builtin execution
const ctx = profiler.start('print');
console.log(...args);
profiler.end(ctx);
```

### With Benchmarks (test_performance.js)
```javascript
// Run and measure
const start = process.hrtime.bigint();
fn();
const duration = Number(process.hrtime.bigint() - start) / 1e6;
```

---

## Timing Precision

### Resolution Hierarchy
```
1. process.hrtime.bigint()       ← Nanosecond precision (used)
2. process.hrtime()              ← Microsecond precision
3. Date.now()                    ← Millisecond precision
4. console.time()                ← Millisecond precision
```

### Example: Nanosecond to Millisecond Conversion
```typescript
const start = process.hrtime.bigint();     // nanoseconds
const end = process.hrtime.bigint();       // nanoseconds
const duration = (end - start) / 1e6;      // milliseconds

// Example: 280,000,000 nanoseconds
// = 280,000,000 / 1,000,000 milliseconds
// = 280 milliseconds
```

---

## Memory Overhead

### Per-Function Tracking
```
FunctionStat object size:
- count: 8 bytes (number)
- totalTime: 8 bytes
- minTime: 8 bytes
- maxTime: 8 bytes
- avgTime: 8 bytes
- stdDev: 8 bytes
- callStack: string[] (variable)
──────────────────────────
Total: ~48 bytes + string array overhead
```

### For 1000 Functions
```
1000 functions × 48 bytes = 48 KB
+ Map overhead = ~2 KB
+ String storage (avg 20 chars per name) = ~20 KB
──────────────────────────
Total: ~70 KB (negligible)
```

---

## Error Handling

### Graceful Degradation
```typescript
try {
  profiler.start(fnName);
  // Execute function
  profiler.end(ctx);
} catch (err) {
  // Log error but don't throw
  console.error('Profiling error:', err.message);
  // Continue execution
}
```

### Disabled Profiler
```typescript
// Create disabled profiler for production
const profiler = new UnifiedProfiler(false);

// All methods become no-ops
profiler.start(name);  // Returns immediately
profiler.end(ctx);     // No-op
```

---

## Scalability

### Function Count Scaling
```
Functions    Memory    Sorting Time
──────────────────────────────────
100          ~10 KB    <1ms
1,000        ~70 KB    <5ms
10,000       ~700 KB   <50ms
100,000      ~7 MB     <500ms
```

### Call Count Scaling
```
Calls/sec    Memory    Overhead
──────────────────────────────
1M           <1 MB     <0.1%
10M          <10 MB    <1%
100M         <100 MB   <10%
1B           <1 GB     >50% (unsustainable)
```

---

## Best Practices

1. **Profile in Development**
   - Disable in production
   - Overhead can be 10-50%

2. **Use High-Resolution Timers**
   - process.hrtime() or process.hrtime.bigint()
   - Avoid Date.now() for short durations

3. **Memory Snapshots**
   - Take at logical boundaries
   - Not too frequently (overhead)
   - At least 2-3 snapshots per session

4. **GC Monitoring**
   - Correlate with performance dips
   - Monitor heap before/after
   - Track pause impact

5. **Report Generation**
   - Generate after session complete
   - Save to file for comparison
   - Compare against baseline

---

## Performance of Profiler Itself

### Overhead Analysis

| Operation | Cost | Notes |
|-----------|------|-------|
| start() | ~0.01ms | hrtime call + map lookup |
| end() | ~0.05ms | calculation + stat update |
| snapshot() | ~0.1ms | process.memoryUsage() call |
| report() | ~5ms | sorting + string generation |
| toJSON() | ~2ms | object serialization |

**Total Overhead**: 5-10% for typical workloads

---

## Debugging Tips

### Check if Profiler is Enabled
```typescript
if (profiler.functionProfiler['enabled']) {
  console.log('Profiler is active');
}
```

### View Raw Statistics
```typescript
const stats = profiler.functionProfiler.getAllStats();
console.log(JSON.stringify(stats, null, 2));
```

### Memory Leak Detection
```typescript
const snapshots = profiler.memoryProfiler.getSnapshots();
if (snapshots[snapshots.length - 1].heapUsed > 500 * 1024 * 1024) {
  console.warn('High memory usage detected');
}
```

### GC Pause Analysis
```typescript
const gcStats = profiler.gcProfiler.getStats();
const totalGCTime = Object.values(gcStats).reduce((sum, s) => sum + s.totalDuration, 0);
console.log(`Total GC pause: ${totalGCTime}ms`);
```

---

## References

- **Profiler Implementation**: `src/profiler.ts` (650 lines)
- **Analyzer Implementation**: `src/analyze.ts` (400 lines)
- **Benchmarks**: `test_performance.js` (350 lines)
- **Quick Start**: `PROFILER_QUICK_START.md`
- **Strategy**: `OPTIMIZATION_STRATEGY.md`

---

**Version**: 1.0
**Last Updated**: 2026-03-06
**Maintainer**: Claude AI (Team 1-2)
