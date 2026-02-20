/**
 * Phase 23: Production Hardening - Main Index
 *
 * 4가지 핵심 모듈 통합:
 * 1. Error Handling - 전역 예외 처리
 * 2. Memory Check - 메모리 누수 감지
 * 3. Profiler - 성능 분석
 * 4. Logger - 구조화된 로깅
 */

export * from './error-handling';
export * from './memory-check';
export * from './profiler';
export * from './logger';

import { globalErrorHandler } from './error-handling';
import { memoryMonitor } from './memory-check';
import { profiler } from './profiler';
import { logger, LogLevel } from './logger';

/**
 * Production Hardening 시스템 초기화
 */
export class ProductionHardening {
  private monitoringInterval?: NodeJS.Timer;

  constructor() {
    logger.info('Production Hardening initialized');
  }

  /**
   * 모니터링 시작 (주기적 체크)
   */
  startMonitoring(intervalMs: number = 60000): void {
    logger.info(`Monitoring started (interval: ${intervalMs}ms)`);

    this.monitoringInterval = setInterval(() => {
      // 메모리 체크
      const memReport = memoryMonitor.getReport();

      if (memReport.health === 'CRITICAL') {
        logger.warn('Memory usage CRITICAL', memReport);
        // 강제 정리 시도
        memoryMonitor.forceCleanup();
      } else if (memReport.health === 'WARNING') {
        logger.info('Memory usage WARNING', memReport);
      }

      // 에러 통계
      const errStats = globalErrorHandler.getStatistics();
      if (errStats.CRITICAL > 0 || errStats.HIGH > 0) {
        logger.warn('Error statistics', errStats);
      }
    }, intervalMs);
  }

  /**
   * 모니터링 중지
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      logger.info('Monitoring stopped');
    }
  }

  /**
   * 전체 상태 리포트
   */
  getFullReport() {
    return {
      memory: memoryMonitor.getReport(),
      errors: globalErrorHandler.getStatistics(),
      profile: profiler.getReport(),
      logs: logger.getStatistics()
    };
  }

  /**
   * 상세 리포트 출력
   */
  printReport(): void {
    const report = this.getFullReport();

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  PRODUCTION HARDENING - FULL REPORT   ║');
    console.log('╚════════════════════════════════════════╝\n');

    // Memory Report
    console.log('📊 MEMORY STATUS:');
    console.log(`   Health: ${report.memory.health}`);
    console.log(`   Heap Used: ${(report.memory.current.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Growth: ${(report.memory.growth / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Leaking: ${report.memory.trend.isLeaking ? 'YES' : 'NO'}\n`);

    // Error Report
    console.log('⚠️  ERROR STATUS:');
    console.log(`   DEBUG: ${report.errors[0]}`);
    console.log(`   INFO: ${report.errors[1]}`);
    console.log(`   WARN: ${report.errors[2]}`);
    console.log(`   ERROR: ${report.errors[3]}`);
    console.log(`   FATAL: ${report.errors[4]}\n`);

    // Profile Report
    console.log('⚡ PERFORMANCE:');
    console.log(`   Total Time: ${report.profile.totalTime.toFixed(2)}ms`);
    console.log(`   Functions Tracked: ${report.profile.functions.length}`);
    console.log(`   Slowest: ${report.profile.slowestFunctions[0]?.name || 'N/A'}\n`);

    // Log Report
    console.log('📝 LOGGING:');
    console.log(`   Total Entries: ${Object.values(report.logs).reduce((a, b) => a + b, 0)}\n`);
  }
}

export const hardening = new ProductionHardening();

export default hardening;
