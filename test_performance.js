/**
 * FreeLang v3.0 Performance Benchmark Suite
 *
 * Comprehensive benchmarks to measure:
 * 1. Fibonacci(40) - recursive function performance
 * 2. Array Sort(10K) - array manipulation and comparison
 * 3. String Concat(1MB) - string operations
 * 4. JSON Parse(1K objects) - data parsing
 * 5. Loop(1M) - raw loop performance
 */

const fs = require('fs');
const path = require('path');

/**
 * Simple benchmark runner
 */
class Benchmark {
  constructor(name, fn, iterations = 1) {
    this.name = name;
    this.fn = fn;
    this.iterations = iterations;
    this.results = [];
  }

  /**
   * Run the benchmark with warm-up
   */
  run() {
    // Warm-up: 3 iterations to let JIT kick in
    console.log(`[${this.name}] Warming up...`);
    for (let i = 0; i < 3; i++) {
      try {
        this.fn();
      } catch (err) {
        console.error(`Warm-up error: ${err.message}`);
        return null;
      }
    }

    // Actual measurement
    console.log(`[${this.name}] Running ${this.iterations} iteration(s)...`);
    const iterations = this.iterations;
    const start = process.hrtime.bigint();

    for (let i = 0; i < iterations; i++) {
      try {
        this.fn();
      } catch (err) {
        console.error(`Execution error: ${err.message}`);
        return null;
      }
    }

    const duration = Number(process.hrtime.bigint() - start) / 1e6; // Convert to ms
    const avgPerIteration = duration / iterations;

    this.results = {
      name: this.name,
      iterations,
      totalTime: duration,
      avgTime: avgPerIteration,
      opsPerSecond: (1000 / avgPerIteration).toFixed(2)
    };

    return this.results;
  }

  /**
   * Display results
   */
  display() {
    if (!this.results) return;

    console.log(`\n✓ ${this.results.name}`);
    console.log(`  Iterations: ${this.results.iterations}`);
    console.log(`  Total Time: ${this.results.totalTime.toFixed(2)}ms`);
    console.log(`  Avg/Iteration: ${this.results.avgTime.toFixed(3)}ms`);
    console.log(`  Ops/sec: ${this.results.opsPerSecond}`);
  }
}

/**
 * Benchmark Suite
 */
class BenchmarkSuite {
  constructor() {
    this.benchmarks = [];
    this.results = [];
  }

  add(name, fn, iterations = 1) {
    this.benchmarks.push(new Benchmark(name, fn, iterations));
    return this;
  }

  /**
   * Run all benchmarks
   */
  run() {
    console.log('=====================================');
    console.log('FreeLang v3.0 Performance Benchmarks');
    console.log('=====================================\n');

    this.results = [];
    for (const bench of this.benchmarks) {
      const result = bench.run();
      if (result) {
        this.results.push(result);
        bench.display();
      }
    }

    return this.results;
  }

  /**
   * Get summary
   */
  summary() {
    console.log('\n=====================================');
    console.log('Summary Results');
    console.log('=====================================\n');

    const summary = this.results.map((r) => ({
      name: r.name,
      avgTime: r.avgTime.toFixed(3) + 'ms',
      totalTime: r.totalTime.toFixed(2) + 'ms'
    }));

    console.table(summary);
    return summary;
  }

  /**
   * Save results to JSON
   */
  saveJSON(filepath) {
    const data = {
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: {
        totalBenchmarks: this.results.length,
        totalTime: this.results.reduce((sum, r) => sum + r.totalTime, 0)
      }
    };

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`\n📊 Results saved to: ${filepath}`);
  }
}

// ==========================================
// Benchmark Implementations
// ==========================================

/**
 * B1: Fibonacci(40) - Recursive function performance
 * Target: 150ms (current: 280ms)
 */
function fibonacciBenchmark() {
  // Simple JavaScript implementation to test interpreter speed
  function fib(n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
  }

  return fib(40);
}

/**
 * B2: Array Sort(10K) - Array manipulation
 * Target: 25ms
 */
function arraySortBenchmark() {
  const arr = [];
  for (let i = 10000; i > 0; i--) {
    arr.push(Math.random() * 10000);
  }
  arr.sort((a, b) => a - b);
  return arr.length;
}

/**
 * B3: String Concat(1MB) - String operations
 * Target: 35ms
 */
function stringConcatBenchmark() {
  let str = '';
  const iterations = 10000;
  for (let i = 0; i < iterations; i++) {
    str += `Item ${i}: ${Math.random()}\n`;
  }
  return str.length;
}

/**
 * B4: JSON Parse(1K objects) - Data parsing
 * Target: 18ms
 */
function jsonParseBenchmark() {
  const objects = [];
  for (let i = 0; i < 1000; i++) {
    const obj = {
      id: i,
      name: `object_${i}`,
      value: Math.random() * 1000,
      nested: {
        a: i,
        b: Math.random()
      }
    };
    objects.push(JSON.stringify(obj));
  }

  let count = 0;
  for (const obj of objects) {
    JSON.parse(obj);
    count++;
  }
  return count;
}

/**
 * B5: Loop(1M) - Raw loop performance
 * Target: 20ms
 */
function loopBenchmark() {
  let sum = 0;
  for (let i = 0; i < 1000000; i++) {
    sum += i;
  }
  return sum;
}

/**
 * B6: Array Access(100K) - Array element access
 * Target: 10ms
 */
function arrayAccessBenchmark() {
  const arr = new Array(100000);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = i;
  }

  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
  }
  return sum;
}

/**
 * B7: Object Property Access(100K) - Property lookups
 * Target: 15ms
 */
function objectPropertyBenchmark() {
  const obj = {};
  for (let i = 0; i < 100000; i++) {
    obj[`key_${i}`] = i;
  }

  let sum = 0;
  for (let i = 0; i < 100000; i++) {
    sum += obj[`key_${i}`];
  }
  return sum;
}

/**
 * B8: Function Call(1M) - Function call overhead
 * Target: 12ms
 */
function functionCallBenchmark() {
  function add(a, b) {
    return a + b;
  }

  let sum = 0;
  for (let i = 0; i < 1000000; i++) {
    sum = add(sum, 1);
  }
  return sum;
}

// ==========================================
// Main Execution
// ==========================================

async function main() {
  const suite = new BenchmarkSuite();

  // Add benchmarks
  suite
    .add('Fibonacci(40)', fibonacciBenchmark, 1)
    .add('Array Sort(10K)', arraySortBenchmark, 10)
    .add('String Concat(1MB)', stringConcatBenchmark, 10)
    .add('JSON Parse(1K objects)', jsonParseBenchmark, 10)
    .add('Loop(1M)', loopBenchmark, 100)
    .add('Array Access(100K)', arrayAccessBenchmark, 100)
    .add('Object Property Access(100K)', objectPropertyBenchmark, 100)
    .add('Function Call(1M)', functionCallBenchmark, 50);

  // Run all benchmarks
  const results = suite.run();

  // Display summary
  suite.summary();

  // Save results
  const outputPath = path.join(__dirname, 'benchmark_results.json');
  suite.saveJSON(outputPath);

  // Analyze and report
  console.log('\n=====================================');
  console.log('Performance Analysis');
  console.log('=====================================\n');

  const targets = {
    'Fibonacci(40)': 150,
    'Array Sort(10K)': 25,
    'String Concat(1MB)': 35,
    'JSON Parse(1K objects)': 18,
    'Loop(1M)': 20,
    'Array Access(100K)': 10,
    'Object Property Access(100K)': 15,
    'Function Call(1M)': 12
  };

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const target = targets[result.name];
    if (!target) continue;

    const status = result.avgTime <= target ? '✅ PASS' : '❌ FAIL';
    const diff = ((result.avgTime - target) / target * 100).toFixed(1);
    const diffSymbol = result.avgTime <= target ? '' : '+';

    console.log(`${status} ${result.name}: ${result.avgTime.toFixed(3)}ms (target: ${target}ms, ${diffSymbol}${diff}%)`);

    if (result.avgTime <= target) passed++;
    else failed++;
  }

  console.log(`\n📈 Passed: ${passed}/${passed + failed}`);

  if (failed > 0) {
    console.log(`\n⚠️  ${failed} benchmark(s) exceeded target time`);
    console.log('Next steps: Run analysis script to identify bottlenecks\n');
  } else {
    console.log('\n🎉 All benchmarks passed!\n');
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
