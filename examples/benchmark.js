/**
 * Example 3: Performance Benchmark
 * 
 * 실행: node examples/benchmark.js
 * 자신의 시스템에서 벤치마크 측정
 */

const { BenchmarkRunner } = require('freelang');

const benchmark = new BenchmarkRunner();

(async () => {
  console.log('📊 FreeLang Performance Benchmark');
  console.log('═══════════════════════════════════\n');

  // 테스트 1: 기본 성능
  console.log('⏱️  테스트 1: 기본 성능 (5초, 1000 RPS)');
  const metrics1 = await benchmark.runBenchmark(5, 1000);
  console.log(`   RPS: ${metrics1.requestsPerSecond.toFixed(0)}`);
  console.log(`   Avg Latency: ${metrics1.avgLatency.toFixed(2)}ms`);
  console.log(`   P99 Latency: ${metrics1.p99Latency.toFixed(2)}ms\n`);

  // 테스트 2: 고부하
  console.log('⏱️  테스트 2: 고부하 (5초, 5000 RPS)');
  const metrics2 = await benchmark.runBenchmark(5, 5000);
  console.log(`   RPS: ${metrics2.requestsPerSecond.toFixed(0)}`);
  console.log(`   Avg Latency: ${metrics2.avgLatency.toFixed(2)}ms`);
  console.log(`   P99 Latency: ${metrics2.p99Latency.toFixed(2)}ms\n`);

  // 비교
  console.log('📈 성능 비교');
  benchmark.setBaseline(metrics1);
  const comparison = benchmark.compareWithBaseline(metrics2);
  if (comparison) {
    console.log(`   RPS 변화: ${comparison.rpsChange.toFixed(1)}%`);
    console.log(`   Latency 변화: ${comparison.latencyChange.toFixed(1)}%`);
    console.log(`   평가: ${comparison.performanceRating}`);
  }

  console.log('\n✅ 벤치마크 완료!');
})();
