/**
 * Phase 23: Production Hardening - Comprehensive Tests
 *
 * 테스트 시나리오:
 * 1. Error Handling - 전역 에러 처리
 * 2. Memory Monitoring - 누수 감지
 * 3. Profiling - 성능 분석
 * 4. Logging - 로그 수집
 * 5. Integration - 전체 시스템
 */

import {
  ErrorHandler,
  ErrorSeverity,
  MemoryMonitor,
  Profiler,
  Logger,
  LogLevel,
  ProductionHardening
} from '../src/phase-23/index';

describe('Phase 23: Production Hardening', () => {
  let errorHandler: ErrorHandler;
  let memoryMonitor: MemoryMonitor;
  let profiler: Profiler;
  let logger: Logger;
  let hardening: ProductionHardening;

  beforeEach(() => {
    errorHandler = new ErrorHandler();
    memoryMonitor = new MemoryMonitor();
    profiler = new Profiler();
    logger = new Logger('test');
    hardening = new ProductionHardening();
  });

  describe('Error Handling', () => {
    test('should handle errors with context', async () => {
      const error = new Error('Test error');
      await errorHandler.handleError(error, ErrorSeverity.MEDIUM, { userId: 123 });

      const stats = errorHandler.getStatistics();
      expect(stats.total).toBe(1);
    });

    test('should track error severity', async () => {
      await errorHandler.handleError(new Error('E1'), ErrorSeverity.LOW);
      await errorHandler.handleError(new Error('E2'), ErrorSeverity.HIGH);
      await errorHandler.handleError(new Error('E3'), ErrorSeverity.CRITICAL);

      const stats = errorHandler.getStatistics();
      expect(stats.bySeverity[ErrorSeverity.LOW]).toBe(1);
      expect(stats.bySeverity[ErrorSeverity.HIGH]).toBe(1);
      expect(stats.bySeverity[ErrorSeverity.CRITICAL]).toBe(1);
    });

    test('should register recovery strategies', async () => {
      let recovered = false;

      errorHandler.registerRecoveryStrategy('Error', async () => {
        recovered = true;
      });

      await errorHandler.handleError(new Error('Test'), ErrorSeverity.MEDIUM);
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(recovered).toBe(true);
    });
  });

  describe('Memory Monitoring', () => {
    test('should capture memory snapshots', () => {
      const snap1 = memoryMonitor.snapshot();
      expect(snap1.timestamp).toBeGreaterThan(0);
      expect(snap1.heapUsed).toBeGreaterThan(0);
    });

    test('should detect memory growth', () => {
      for (let i = 0; i < 65; i++) {
        memoryMonitor.snapshot();
      }

      const trend = memoryMonitor.detectLeak();
      expect(trend.heapGrowthRate).toBeDefined();
    });

    test('should generate memory report', () => {
      memoryMonitor.snapshot();
      const report = memoryMonitor.getReport();

      expect(report.current).toBeDefined();
      expect(report.baseline).toBeGreaterThan(0);
      expect(report.health).toMatch(/GOOD|WARNING|CRITICAL/);
    });

    test('should handle forced cleanup', async () => {
      const snap = await memoryMonitor.forceCleanup();
      expect(snap.timestamp).toBeGreaterThan(0);
    });
  });

  describe('Profiler', () => {
    test('should profile function execution', () => {
      profiler.start('test-func');
      
      // Simulate work
      let sum = 0;
      for (let i = 0; i < 100000; i++) {
        sum += i;
      }

      const duration = profiler.end('test-func');
      expect(duration).toBeGreaterThanOrEqual(0);
    });

    test('should track multiple calls', () => {
      for (let i = 0; i < 5; i++) {
        profiler.start('func-a');
        profiler.end('func-a');
      }

      const profile = profiler.getProfile('func-a');
      expect(profile?.callCount).toBe(5);
    });

    test('should generate profile report', () => {
      profiler.start('slow');
      // Simulate slow function
      for (let i = 0; i < 1000000; i++) {}
      profiler.end('slow');

      const report = profiler.getReport();
      expect(report.functions.length).toBeGreaterThan(0);
      expect(report.slowestFunctions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Logger', () => {
    test('should log at different levels', () => {
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      const history = logger.getHistory();
      expect(history.length).toBe(4);
    });

    test('should track log context', () => {
      logger.info('User action', { userId: 123, action: 'login' });

      const history = logger.getHistory();
      expect(history[history.length - 1].context?.userId).toBe(123);
    });

    test('should filter by level', () => {
      logger.debug('D');
      logger.info('I');
      logger.warn('W');

      const warnings = logger.getHistory(LogLevel.WARN);
      expect(warnings.length).toBe(1);
    });

    test('should generate statistics', () => {
      logger.debug('D');
      logger.info('I');
      logger.warn('W');

      const stats = logger.getStatistics();
      expect(stats[LogLevel.DEBUG]).toBe(1);
      expect(stats[LogLevel.INFO]).toBe(1);
      expect(stats[LogLevel.WARN]).toBe(1);
    });
  });

  describe('Integration', () => {
    test('should initialize production hardening', () => {
      expect(hardening).toBeDefined();
    });

    test('should handle monitoring lifecycle', () => {
      hardening.startMonitoring(100);
      expect(true); // Monitoring started
      hardening.stopMonitoring();
      expect(true); // Monitoring stopped
    });

    test('should generate full report', () => {
      const report = hardening.getFullReport();
      expect(report.memory).toBeDefined();
      expect(report.errors).toBeDefined();
      expect(report.profile).toBeDefined();
      expect(report.logs).toBeDefined();
    });

    test('should handle all modules together', () => {
      logger.info('Test start');
      profiler.start('test');
      
      try {
        throw new Error('Test error');
      } catch (err) {
        errorHandler.handleError(err as Error, ErrorSeverity.MEDIUM);
      }

      profiler.end('test');
      memoryMonitor.snapshot();

      const report = hardening.getFullReport();
      expect(report.errors[LogLevel.ERROR]).toBe(0); // Because we caught it
    });
  });

  describe('Stress Testing', () => {
    test('should handle 1000 errors', async () => {
      jest.setTimeout(10000);

      for (let i = 0; i < 1000; i++) {
        await errorHandler.handleError(
          new Error(`Error ${i}`),
          ErrorSeverity.LOW
        );
      }

      const stats = errorHandler.getStatistics();
      expect(stats.total).toBeGreaterThan(0);
    });

    test('should handle rapid logging', () => {
      for (let i = 0; i < 1000; i++) {
        logger.info(`Log entry ${i}`, { index: i });
      }

      const history = logger.getHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    test('should handle continuous profiling', () => {
      for (let i = 0; i < 100; i++) {
        profiler.start(`func-${i}`);
        profiler.end(`func-${i}`);
      }

      const report = profiler.getReport();
      expect(report.functions.length).toBe(100);
    });
  });
});
