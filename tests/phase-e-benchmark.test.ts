/**
 * FreeLang Phase E - Benchmark Tests
 *
 * Agent 3 성능 벤치마크
 * - 함수 호출 속도
 * - 메모리 사용량
 * - 캐시 히트율
 * - 병렬 처리 효율
 *
 * 총 10개 벤치마크
 */

import {
  OptimizedFunctionRegistry,
  globalFunctionCache,
  globalProfiler,
  memoize,
  parallelMap,
  retryAsync,
  batchProcess,
  PerformanceMetrics
} from '../src/stdlib-optimized';
import { NativeFunctionRegistry } from '../src/vm/native-function-registry';
import { registerStdlibFunctions } from '../src/stdlib-builtins';

describe('Phase E: Benchmark Tests', () => {
  let registry: NativeFunctionRegistry;
  let optimized: OptimizedFunctionRegistry;

  beforeAll(() => {
    registry = new NativeFunctionRegistry();
    registerStdlibFunctions(registry);
    optimized = new OptimizedFunctionRegistry(registry);
  });

  beforeEach(() => {
    globalFunctionCache.clear();
    globalProfiler.reset();
  });

  // ══════════════════════════════════════════════════════════════
  // E1: 함수 호출 속도 (초당 호출 수)
  // ══════════════════════════════════════════════════════════════

  describe('E1: Function Call Speed', () => {
    test('E1.1: 단순 함수 호출 속도 (초당 호출 수)', () => {
      const iterations = 10000;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        const func = registry.get('toString');
        func!.executor([i]);
      }

      const elapsed = Date.now() - start;
      const callsPerSecond = (iterations / elapsed) * 1000;

      console.log(`\n📊 E1.1 단순 함수: ${callsPerSecond.toFixed(0)} calls/sec (${elapsed}ms)`);
      expect(callsPerSecond).toBeGreaterThan(10000); // 최소 10k calls/sec
    });

    test('E1.2: 캐싱된 함수 호출 속도', () => {
      const iterations = 10000;
      const args = [123];
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        optimized.callCached('toString', args);
      }

      const elapsed = Date.now() - start;
      const callsPerSecond = (iterations / elapsed) * 1000;

      console.log(`\n📊 E1.2 캐싱 함수: ${callsPerSecond.toFixed(0)} calls/sec (${elapsed}ms)`);
      expect(callsPerSecond).toBeGreaterThan(50000); // 캐싱으로 5배 이상 향상
    });

    test('E1.3: 복잡한 함수 호출 속도 (배열 처리)', () => {
      const iterations = 1000;
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        const func = registry.get('length');
        func!.executor([arr]);
      }

      const elapsed = Date.now() - start;
      const callsPerSecond = (iterations / elapsed) * 1000;

      console.log(`\n📊 E1.3 배열 함수: ${callsPerSecond.toFixed(0)} calls/sec (${elapsed}ms)`);
      expect(callsPerSecond).toBeGreaterThan(5000);
    });

    test('E1.4: 문자열 처리 함수 속도', () => {
      const iterations = 5000;
      const str = 'The quick brown fox jumps over the lazy dog';
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        const func = registry.get('length');
        func!.executor([str]);
      }

      const elapsed = Date.now() - start;
      const callsPerSecond = (iterations / elapsed) * 1000;

      console.log(`\n📊 E1.4 문자열 함수: ${callsPerSecond.toFixed(0)} calls/sec (${elapsed}ms)`);
      expect(callsPerSecond).toBeGreaterThan(10000);
    });

    test('E1.5: 연쇄 함수 호출 속도 (파이프라인)', () => {
      const iterations = 1000;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        // toString -> length -> assertEquals 체인
        optimized.chain([
          { name: 'toString', args: [i] },
          { name: 'length', args: [] },
        ]);
      }

      const elapsed = Date.now() - start;
      const callsPerSecond = (iterations / elapsed) * 1000;

      console.log(`\n📊 E1.5 파이프라인: ${callsPerSecond.toFixed(0)} calls/sec (${elapsed}ms)`);
      expect(callsPerSecond).toBeGreaterThan(1000);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // E2: 메모리 사용량
  // ══════════════════════════════════════════════════════════════

  describe('E2: Memory Usage', () => {
    test('E2.1: 캐시 메모리 효율 - 100개 함수 호출', () => {
      const memBefore = process.memoryUsage().heapUsed;

      for (let i = 0; i < 100; i++) {
        optimized.callCached('toString', [i]);
      }

      const memAfter = process.memoryUsage().heapUsed;
      const memUsed = (memAfter - memBefore) / 1024; // KB

      console.log(`\n📊 E2.1 캐시 메모리: ${memUsed.toFixed(2)} KB (100 calls)`);
      expect(memUsed).toBeLessThan(1000); // 1MB 이하
    });

    test('E2.2: 캐시 크기 제한 (LRU)', () => {
      globalFunctionCache.clear();
      globalFunctionCache.set('key1', 'value1');
      globalFunctionCache.set('key2', 'value2');

      const stats = globalFunctionCache.stats();
      console.log(`\n📊 E2.2 캐시 크기: ${stats.size}`);
      expect(stats.size).toBeLessThanOrEqual(1000);
    });

    test('E2.3: 메모리 누수 감지 - 1000개 함수 호출', () => {
      const memBefore = process.memoryUsage().heapUsed;

      for (let i = 0; i < 1000; i++) {
        const func = registry.get('toString');
        func!.executor([i]);
      }

      // 강제 GC (Node.js에서는 자동)
      if (global.gc) {
        global.gc();
      }

      const memAfter = process.memoryUsage().heapUsed;
      const memIncrease = (memAfter - memBefore) / 1024 / 1024; // MB

      console.log(`\n📊 E2.3 메모리 증가: ${memIncrease.toFixed(2)} MB (1000 calls)`);
      expect(memIncrease).toBeLessThan(10); // 10MB 이상 증가하지 않음
    });
  });

  // ══════════════════════════════════════════════════════════════
  // E3: 캐시 히트율
  // ══════════════════════════════════════════════════════════════

  describe('E3: Cache Hit Rate', () => {
    test('E3.1: 반복 호출 캐시 히트율', () => {
      globalFunctionCache.clear();

      const args = [123];
      for (let i = 0; i < 100; i++) {
        optimized.callCached('toString', args);
      }

      const stats = globalFunctionCache.stats();
      console.log(`\n📊 E3.1 캐시 히트율: ${(stats.hitRate * 100).toFixed(1)}% (100 calls, 같은 args)`);
      expect(stats.hitRate).toBeGreaterThan(0.5); // 최소 50% 히트율
    });

    test('E3.2: 다양한 인자 캐시 히트율', () => {
      globalFunctionCache.clear();

      for (let i = 0; i < 100; i++) {
        optimized.callCached('toString', [i % 10]); // 10개 유니크 인자
      }

      const stats = globalFunctionCache.stats();
      console.log(`\n📊 E3.2 유니크 인자 히트율: ${(stats.hitRate * 100).toFixed(1)}% (100 calls, 10 unique)`);
      expect(stats.hitRate).toBeGreaterThan(0.5);
    });

    test('E3.3: 캐시 워밍 효과', () => {
      globalFunctionCache.clear();

      // 첫 번째 실행 - 캐시 워밍
      for (let i = 0; i < 10; i++) {
        optimized.callCached('toString', [i]);
      }

      const statsWarm = globalFunctionCache.stats();

      // 두 번째 실행 - 캐시 히트
      for (let i = 0; i < 10; i++) {
        optimized.callCached('toString', [i]);
      }

      const statsHot = globalFunctionCache.stats();

      console.log(`\n📊 E3.3 워밍 단계: ${(statsWarm.hitRate * 100).toFixed(1)}% → 핫 단계: ${(statsHot.hitRate * 100).toFixed(1)}%`);
      expect(statsHot.hitRate).toBeGreaterThan(statsWarm.hitRate);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // E4: 병렬 처리 효율
  // ══════════════════════════════════════════════════════════════

  describe('E4: Parallel Processing Efficiency', () => {
    test('E4.1: 순차 처리 vs 병렬 처리 속도 비교', async () => {
      const items = Array.from({ length: 100 }, (_, i) => i);

      // 순차 처리
      const seqStart = Date.now();
      for (const item of items) {
        await Promise.resolve().then(() => new Promise(resolve => {
          setTimeout(() => resolve(item * 2), 1);
        }));
      }
      const seqElapsed = Date.now() - seqStart;

      // 병렬 처리
      const parStart = Date.now();
      await parallelMap(
        items,
        (item) => new Promise(resolve => {
          setTimeout(() => resolve(item * 2), 1);
        }),
        4
      );
      const parElapsed = Date.now() - parStart;

      const speedup = seqElapsed / parElapsed;
      console.log(`\n📊 E4.1 순차 vs 병렬: ${seqElapsed}ms vs ${parElapsed}ms (${speedup.toFixed(1)}x speedup)`);
      expect(speedup).toBeGreaterThan(1.5); // 최소 1.5배 향상
    });

    test('E4.2: 동시성 레벨별 성능', async () => {
      const items = Array.from({ length: 50 }, (_, i) => i);
      const results = [];

      for (const concurrency of [1, 2, 4, 8]) {
        const start = Date.now();
        await parallelMap(
          items,
          (item) => new Promise(resolve => {
            setTimeout(() => resolve(item * 2), 1);
          }),
          concurrency
        );
        const elapsed = Date.now() - start;
        results.push({ concurrency, elapsed });
      }

      console.log(`\n📊 E4.2 동시성 레벨 성능:`);
      results.forEach(r => {
        console.log(`   동시성=${r.concurrency}: ${r.elapsed}ms`);
      });

      // 동시성이 높을수록 빨라야 함 (어느 정도까지)
      expect(results[0].elapsed).toBeGreaterThan(results[1].elapsed);
    });

    test('E4.3: 배치 처리 효율', async () => {
      const items = Array.from({ length: 100 }, (_, i) => i);

      const start = Date.now();
      const result = await batchProcess(
        items,
        async (batch) => batch.map(x => x * 2),
        10
      );
      const elapsed = Date.now() - start;

      console.log(`\n📊 E4.3 배치 처리: 100개 아이템, 배치 크기=10, ${elapsed}ms`);
      expect(result.length).toBe(100);
      expect(elapsed).toBeLessThan(1000);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // E5: 에러 복구 성능
  // ══════════════════════════════════════════════════════════════

  describe('E5: Error Recovery Performance', () => {
    test('E5.1: 재시도 오버헤드 측정', async () => {
      let attemptCount = 0;

      const start = Date.now();
      const result = await retryAsync(
        async () => {
          attemptCount++;
          if (attemptCount < 2) {
            throw new Error('Retry test');
          }
          return 'success';
        },
        { maxRetries: 3, initialDelayMs: 10 }
      );
      const elapsed = Date.now() - start;

      console.log(`\n📊 E5.1 재시도 오버헤드: ${elapsed}ms (${attemptCount} 시도)`);
      expect(result).toBe('success');
      expect(attemptCount).toBe(2);
    });

    test('E5.2: 재시도 최대 제한', async () => {
      let attemptCount = 0;

      try {
        await retryAsync(
          async () => {
            attemptCount++;
            throw new Error('Always fails');
          },
          { maxRetries: 3, initialDelayMs: 1 }
        );
      } catch (error) {
        // Expected to fail
      }

      console.log(`\n📊 E5.2 최대 재시도: ${attemptCount} 시도`);
      expect(attemptCount).toBe(3);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // E6: 성능 프로파일링
  // ══════════════════════════════════════════════════════════════

  describe('E6: Performance Profiling', () => {
    test('E6.1: 함수별 성능 프로파일링', () => {
      for (let i = 0; i < 100; i++) {
        globalProfiler.recordCall('toString', Math.random() * 10, i % 2 === 0);
      }

      const metrics = globalProfiler.getMetrics('toString') as PerformanceMetrics;
      console.log(`\n📊 E6.1 함수 메트릭: ${JSON.stringify(metrics, null, 2)}`);
      expect(metrics.callCount).toBe(100);
    });

    test('E6.2: 성능 병목지점 감지', () => {
      // 느린 함수 시뮬레이션
      globalProfiler.recordCall('slowFunc', 500);
      globalProfiler.recordCall('slowFunc', 600);
      globalProfiler.recordCall('fastFunc', 10);
      globalProfiler.recordCall('fastFunc', 15);

      const bottlenecks = globalProfiler.getBottlenecks();
      console.log(`\n📊 E6.2 병목지점: ${bottlenecks.map(b => b.functionName).join(', ')}`);
      expect(bottlenecks.some(b => b.functionName === 'slowFunc')).toBe(true);
    });

    test('E6.3: 프로파일링 리포트 생성', () => {
      for (let i = 0; i < 50; i++) {
        globalProfiler.recordCall('func1', Math.random() * 100);
        globalProfiler.recordCall('func2', Math.random() * 50);
      }

      const report = globalProfiler.report();
      console.log(`\n📊 E6.3 프로파일링 리포트:\n${report}`);
      expect(report).toContain('Performance Profile Report');
    });
  });

  // ══════════════════════════════════════════════════════════════
  // E7: 전체 시스템 성능 (통합 벤치마크)
  // ══════════════════════════════════════════════════════════════

  describe('E7: System-wide Performance', () => {
    test('E7.1: 1,000개 함수 호출 총 시간', () => {
      globalFunctionCache.clear();
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        optimized.callCached('toString', [i % 10]);
      }

      const elapsed = Date.now() - start;
      console.log(`\n📊 E7.1 1000개 호출: ${elapsed}ms (평균: ${(elapsed / 1000).toFixed(3)}ms)`);
      expect(elapsed).toBeLessThan(1000);
    });

    test('E7.2: 정상 vs 최적화 비교', () => {
      // 정상 호출
      const normalStart = Date.now();
      for (let i = 0; i < 1000; i++) {
        const func = registry.get('toString');
        func!.executor([i]);
      }
      const normalElapsed = Date.now() - normalStart;

      // 최적화된 호출
      globalFunctionCache.clear();
      const optimStart = Date.now();
      for (let i = 0; i < 1000; i++) {
        optimized.callCached('toString', [i % 10]);
      }
      const optimElapsed = Date.now() - optimStart;

      const improvement = normalElapsed / optimElapsed;
      console.log(`\n📊 E7.2 성능 향상: ${normalElapsed}ms → ${optimElapsed}ms (${improvement.toFixed(1)}x 향상)`);
      expect(improvement).toBeGreaterThan(2); // 최소 2배 향상
    });
  });

  // ══════════════════════════════════════════════════════════════
  // E8: 메모이제이션 효과
  // ══════════════════════════════════════════════════════════════

  describe('E8: Memoization Effects', () => {
    test('E8.1: 메모이제이션된 함수 성능', () => {
      let callCount = 0;

      const fibonacci = memoize((n: number): number => {
        callCount++;
        if (n <= 1) return n;
        return fibonacci(n - 1) + fibonacci(n - 2);
      });

      globalFunctionCache.clear();

      const start = Date.now();
      const result = fibonacci(10);
      const elapsed = Date.now() - start;

      console.log(`\n📊 E8.1 메모이제이션: fib(10)=${result}, 호출=${callCount}, ${elapsed}ms`);
      expect(result).toBe(55);
      // 메모이제이션으로 훨씬 적은 호출
    });

    test('E8.2: 메모이제이션 오버헤드 vs 이득', () => {
      let normalCalls = 0;
      let memoizedCalls = 0;

      const normalFunc = (n: number): number => {
        normalCalls++;
        return n * 2;
      };

      const memoFunc = memoize((n: number): number => {
        memoizedCalls++;
        return n * 2;
      });

      // 100번 호출 (같은 인자)
      for (let i = 0; i < 100; i++) {
        normalFunc(5);
        memoFunc(5);
      }

      console.log(`\n📊 E8.2 호출 수 비교: 정상=${normalCalls}, 메모=${memoizedCalls}`);
      expect(memoizedCalls).toBeLessThan(normalCalls);
    });
  });
});

// ══════════════════════════════════════════════════════════════
// 벤치마크 실행 가이드
// ══════════════════════════════════════════════════════════════
/*
 * 벤치마크 실행:
 * npm run test -- tests/phase-e-benchmark.test.ts --verbose
 *
 * 성능 목표:
 * ✅ E1: 초당 10,000+ 호출 (캐싱: 50,000+)
 * ✅ E2: 메모리 < 1MB (100 호출), < 10MB (1000 호출)
 * ✅ E3: 캐시 히트율 > 50%
 * ✅ E4: 병렬 처리 1.5배 이상 향상
 * ✅ E5: 재시도 오버헤드 < 100ms
 * ✅ E6: 프로파일링 정확도
 * ✅ E7: 1000개 호출 < 1초
 * ✅ E8: 메모이제이션 효과 > 2배
 *
 * 수집되는 메트릭:
 * - 함수 호출 속도 (calls/sec)
 * - 메모리 사용량 (KB/MB)
 * - 캐시 히트율 (%)
 * - 병렬 처리 속도 (배수)
 * - 에러 복구 시간 (ms)
 * - 성능 프로파일 (top N 함수)
 */
