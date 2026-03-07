# FreeLang v3.0 Profiler - Quick Start Guide

**Purpose**: Comprehensive performance profiling and optimization guidance
**Created**: 2026-03-06

---

## Installation & Setup

### 1. Build the profiler
```bash
cd /home/kimjin/Desktop/kim/v2-freelang-ai
npm run build
```

This compiles:
- `src/profiler.ts` → `dist/profiler.js`
- `src/analyze.ts` → `dist/analyze.js`

### 2. Run benchmarks
```bash
node test_performance.js
```

Output: `benchmark_results.json`

---

## Basic Usage

### Example 1: Profile a Single Function

```typescript
import { FunctionProfiler } from './src/profiler';

const profiler = new FunctionProfiler();

function fibonacci(n: number): number {
  const ctx = profiler.start('fibonacci');

  const result = n <= 1 ? n : fibonacci(n - 1) + fibonacci(n - 2);

  profiler.end(ctx);
  return result;
}

// Run and generate report
fibonacci(40);
console.log(profiler.report(10));
```

**Output**:
```
=== Function Performance Report ===
Total functions profiled: 1
Top 10 slowest functions:

1. fibonacci
   Calls: 331000000
   Total: 280.45ms
   Avg: 0.000ms
   Min: 0.000ms
   Max: 0.001ms
   StdDev: 0.000ms
```

---

### Example 2: Track Memory Usage

```typescript
import { MemoryProfiler } from './src/profiler';

const memProfiler = new MemoryProfiler();

// Start of operation
memProfiler.snapshot('start');

// ... some code ...
let arr = new Array(1000000).fill(0);

// Mid-point
memProfiler.snapshot('after_allocation');

// Cleanup
arr = [];

// End
memProfiler.snapshot('end');

// Generate report
console.log(memProfiler.report());
```

**Output**:
```
=== Memory Profile Report ===
Total snapshots: 3

1. start
   Heap Used: 2.45MB
   RSS: 45.60MB
   External: 0.00MB

2. after_allocation
   Heap Used: 10.23MB
   RSS: 52.15MB
   External: 0.00MB
   Delta from prev: +7.78MB heap

3. end
   Heap Used: 3.12MB
   RSS: 46.80MB
   External: 0.00MB
```

---

### Example 3: Monitor Garbage Collection

```typescript
import { GCProfiler } from './src/profiler';

const gcProfiler = new GCProfiler();

// Record a GC event
const beforeHeap = 10 * 1024 * 1024; // 10MB
const afterHeap = 5 * 1024 * 1024;   // 5MB
gcProfiler.recordGC('markSweepCompact', 2.5, beforeHeap, afterHeap);

// Generate report
console.log(gcProfiler.report());
```

**Output**:
```
=== Garbage Collection Report ===
Total GC events: 1

markSweepCompact:
   Count: 1
   Total Duration: 2.50ms
   Avg Duration: 2.500ms

Total GC Time: 2.50ms
```

---

### Example 4: Unified Profiler

```typescript
import { UnifiedProfiler } from './src/profiler';

const profiler = new UnifiedProfiler();

// Start session
profiler.start();

// Profile function execution
const ctx = profiler.functionProfiler.start('myFunction');
// ... function code ...
profiler.functionProfiler.end(ctx);

// Take memory snapshot
profiler.memoryProfiler.snapshot('checkpoint_1');

// End session
profiler.end();

// Generate comprehensive report
console.log(profiler.report(10));

// Export as JSON
const data = profiler.toJSON();
console.log(JSON.stringify(data, null, 2));
```

---

## Performance Analysis

### Using the Analyzer

```typescript
import { UnifiedProfiler, createAnalyzer } from './src/profiler';
import { PerformanceAnalyzer } from './src/analyze';

const profiler = new UnifiedProfiler();
profiler.start();

// ... run code ...

profiler.end();

// Create analyzer
const analyzer = createAnalyzer(profiler);

// Get bottleneck analysis
const bottlenecks = analyzer.analyzeBottlenecks(10);

bottlenecks.forEach((b) => {
  console.log(`${b.rank}. ${b.functionName}`);
  console.log(`   Time: ${b.totalTime.toFixed(2)}ms (${b.percentage.toFixed(1)}%)`);
  console.log(`   Calls: ${b.callCount}`);
  console.log(`   Priority: ${b.priority}`);
  console.log(`   Recommendation: ${b.recommendation}`);
});
```

**Output Example**:
```
1. fibonacci
   Time: 280.45ms (87.1%)
   Calls: 331000000
   Priority: critical
   Recommendation: Consider memoization or caching for frequent small calls

2. array_sort
   Time: 35.20ms (10.9%)
   Calls: 10
   Priority: high
   Recommendation: Profile-guided optimization opportunity

3. string_concat
   Time: 2.15ms (0.7%)
   Calls: 10000
   Priority: low
   Recommendation: Memoization or caching opportunity
```

---

## Benchmark Suite

### Available Benchmarks

| Benchmark | Target | Purpose |
|-----------|--------|---------|
| Fibonacci(40) | <150ms | Recursive function performance |
| Array Sort(10K) | <25ms | Array manipulation |
| String Concat(1MB) | <35ms | String operations |
| JSON Parse(1K) | <18ms | Data parsing |
| Loop(1M) | <20ms | Raw loop performance |
| Array Access(100K) | <10ms | Element access overhead |
| Object Property(100K) | <15ms | Hash table lookup |
| Function Call(1M) | <12ms | Call overhead |

### Run Individual Benchmark

```bash
# Run all benchmarks
node test_performance.js

# Results saved to: benchmark_results.json
```

### Benchmark Results Format

```json
{
  "timestamp": "2026-03-06T10:30:45.123Z",
  "results": [
    {
      "name": "Fibonacci(40)",
      "iterations": 1,
      "totalTime": 280.45,
      "avgTime": 280.45,
      "opsPerSecond": "3.57"
    },
    {
      "name": "Array Sort(10K)",
      "iterations": 10,
      "totalTime": 450.23,
      "avgTime": 45.023,
      "opsPerSecond": "22.21"
    }
  ]
}
```

---

## Optimization Workflow

### Step 1: Establish Baseline
```bash
node test_performance.js
# Creates: benchmark_results.json
cp benchmark_results.json baseline.json
```

### Step 2: Profile Hot Paths
```typescript
const profiler = new UnifiedProfiler();
profiler.start();
fibonacci(40);  // Run code to optimize
profiler.end();

const analyzer = createAnalyzer(profiler);
analyzer.displayReport();
analyzer.saveReport('profile_fibonacci.json');
```

### Step 3: Implement Optimization
```typescript
// BEFORE: Slow recursive
function fib(n) {
  if (n <= 1) return n;
  return fib(n-1) + fib(n-2);  // 331M calls
}

// AFTER: With memoization
const memo = {};
function fib(n) {
  if (n in memo) return memo[n];
  if (n <= 1) return n;
  return memo[n] = fib(n-1) + fib(n-2);  // ~40 calls
}
```

### Step 4: Measure Improvement
```bash
node test_performance.js
# New results show improvement
```

### Step 5: Compare with Baseline
```typescript
const comparison = new PerformanceComparison();
comparison.loadBaseline('baseline.json');
comparison.setCurrent(newReport);
const improvements = comparison.compare();

console.log(`GC improvement: ${improvements.gcImprovementPercent}%`);
console.log(`Fibonacci improvement: ${improvements.topBottleneckImprovement.improvementPercent}%`);
```

---

## Common Patterns

### Pattern 1: High Call Frequency
**Symptom**: Function called >100K times with low avg time

**Root cause**: Overhead of function call mechanism

**Solution**: Inline or cache results

```typescript
// Before: 100K calls
for (let i = 0; i < 100000; i++) {
  result = expensive_check(arr[i]);
}

// After: Cache frequently called function
const memo = new Map();
function cached_check(val) {
  if (!memo.has(val)) {
    memo.set(val, expensive_check(val));
  }
  return memo.get(val);
}
for (let i = 0; i < 100000; i++) {
  result = cached_check(arr[i]);
}
```

### Pattern 2: Recursive Algorithm
**Symptom**: Single function with millions of calls

**Root cause**: Exponential recursion or deep call chains

**Solution**: Memoization or iteration

```typescript
// Before: Exponential recursion
function fib(n) {
  if (n <= 1) return n;
  return fib(n-1) + fib(n-2);
}

// After: Bottom-up DP
function fib(n) {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}
```

### Pattern 3: Tight Loop
**Symptom**: Many iterations with small operations

**Root cause**: Loop overhead repeated per iteration

**Solution**: Loop unrolling or vectorization

```typescript
// Before: 1M iterations
let sum = 0;
for (let i = 0; i < 1000000; i++) {
  sum += i;
}

// After: Unroll 4x
let sum = 0;
for (let i = 0; i < 1000000; i += 4) {
  sum += i + (i+1) + (i+2) + (i+3);
}
```

---

## Troubleshooting

### Issue 1: Profiler Overhead Too High

**Symptom**: Profiling adds >50% overhead

**Solution**: Disable in production code

```typescript
// Only enable for development
const profiler = new UnifiedProfiler(process.env.PROFILE === 'true');
```

### Issue 2: Memory Snapshot Differences Too Large

**Symptom**: Heap grew 100MB between snapshots

**Solution**: Check for memory leaks

```typescript
const snapshots = profiler.memoryProfiler.getSnapshots();
const delta = profiler.memoryProfiler.getDelta(0, snapshots.length - 1);

if (delta.heapUsedDelta > 50) {
  console.warn('Potential memory leak detected');
}
```

### Issue 3: GC Pause Times Too High

**Symptom**: GC taking >100ms

**Solution**: Reduce memory pressure

```typescript
// Before: Large allocations
const arrays = [];
for (let i = 0; i < 100000; i++) {
  arrays.push(new Array(1000));  // Allocate 100M+ objects
}

// After: Reuse objects
const reusable = new Array(1000);
for (let i = 0; i < 100000; i++) {
  // Reuse instead of allocate
}
```

---

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: Performance Tests
on: [push, pull_request]

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'

      - name: Install dependencies
        run: npm install

      - name: Run benchmarks
        run: node test_performance.js

      - name: Upload results
        uses: actions/upload-artifact@v2
        with:
          name: benchmark-results
          path: benchmark_results.json
```

---

## Best Practices

1. **Warm-up Before Measuring**
   ```typescript
   // JIT compilation takes time
   for (let i = 0; i < 3; i++) {
     fibonacci(40);
   }
   // Now measure
   ```

2. **Use High-Resolution Timers**
   ```typescript
   const start = process.hrtime.bigint();
   // ... code ...
   const duration = Number(process.hrtime.bigint() - start) / 1e6;
   ```

3. **Isolate Variables**
   ```typescript
   // Test each optimization separately
   // Don't combine multiple changes
   ```

4. **Run Multiple Iterations**
   ```typescript
   // Reduce noise from single runs
   for (let i = 0; i < 10; i++) {
     benchmark();
   }
   ```

5. **Monitor Memory & GC**
   ```typescript
   // Optimizations may trade memory for speed
   // Both metrics matter
   ```

---

## References

- **Profiler Source**: `src/profiler.ts`
- **Analyzer Source**: `src/analyze.ts`
- **Benchmarks**: `test_performance.js`
- **Baseline**: `baseline.json`
- **Strategy**: `OPTIMIZATION_STRATEGY.md`

---

**Last Updated**: 2026-03-06
**Version**: v1.0
**Status**: Production Ready
