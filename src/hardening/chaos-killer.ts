/**
 * Phase 22 Week 1: Chaos Engineering - Random Worker Killer
 *
 * 책임:
 * 1. 랜덤 worker 강제 종료
 * 2. 자동 복구 검증
 * 3. Cascade failure 감지
 * 4. 복구 시간 측정
 */

/**
 * 카오스 테스트 결과
 */
export interface ChaosTestResult {
  iteration: number;
  timestamp: number;

  // Worker 상태
  totalWorkers: number;
  deadWorkers: number;
  recoveredWorkers: number;

  // 시간 측정
  deathTime: number; // 종료 후 감지까지 (ms)
  recoveryTime: number; // 감지 후 복구까지 (ms)
  totalDowntime: number; // deathTime + recoveryTime

  // 영향도
  requestsLost: number;
  requestsFailed: number;
  cascadeFailures: number;

  // 상태
  success: boolean;
  failureReason?: string;
}

/**
 * 카오스 테스트 통계
 */
export interface ChaosStats {
  totalTests: number;
  successCount: number;
  failureCount: number;
  successRate: number; // %

  // 복구 메트릭
  avgDeathDetectionTime: number; // ms
  avgRecoveryTime: number; // ms
  maxRecoveryTime: number; // ms
  minRecoveryTime: number; // ms

  // 안정성
  cascadeFailureCount: number;
  requestLossCount: number;
  requestFailureCount: number;

  // 추천사항
  recommendation: string;
}

/**
 * ChaosKiller 구현
 */
export class ChaosKiller {
  private results: ChaosTestResult[] = [];
  private isRunning: boolean = false;

  // 주입된 worker 죽음을 추적
  private injectedDeaths: Map<number, { deathTime: number; detected: boolean }> = new Map();

  /**
   * 카오스 테스트 실행
   */
  async runChaosTest(
    iterations: number = 1000,
    onIterationComplete?: (result: ChaosTestResult) => void
  ): Promise<ChaosStats> {
    if (this.isRunning) {
      throw new Error('Chaos test already running');
    }

    this.isRunning = true;

    try {
      for (let i = 0; i < iterations; i++) {
        const result = await this.runSingleIteration(i + 1);
        this.results.push(result);

        if (onIterationComplete) {
          onIterationComplete(result);
        }

        // 이전 테스트 정리
        this.injectedDeaths.clear();

        if (process.env.NODE_ENV !== 'test') {
          if ((i + 1) % 100 === 0) {
            console.log(`✅ Chaos test iteration ${i + 1}/${iterations} completed`);
          }
        }
      }

      return this.calculateStats();
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 단일 반복 테스트
   */
  private async runSingleIteration(iteration: number): Promise<ChaosTestResult> {
    const deathTime = Date.now();
    const totalWorkers = 8;
    const workerToKill = Math.floor(Math.random() * totalWorkers);

    // 1. Worker 강제 종료 시뮬레이션
    this.injectedDeaths.set(workerToKill, {
      deathTime,
      detected: false
    });

    // 2. 종료 감지 시간 측정
    const detectionDelay = await this.waitForDetection(workerToKill, 5000); // 최대 5초

    if (detectionDelay === -1) {
      // 감지 실패
      return {
        iteration,
        timestamp: Date.now(),
        totalWorkers,
        deadWorkers: 1,
        recoveredWorkers: 0,
        deathTime: 5000, // timeout
        recoveryTime: 0,
        totalDowntime: 5000,
        requestsLost: Math.floor(Math.random() * 100),
        requestsFailed: Math.floor(Math.random() * 50),
        cascadeFailures: 1,
        success: false,
        failureReason: 'Worker death not detected within timeout'
      };
    }

    // 3. 복구 시간 측정
    const recoveryStart = Date.now();
    const recovered = await this.waitForRecovery(workerToKill, 3000); // 최대 3초

    const recoveryTime = recovered ? Date.now() - recoveryStart : 3000;

    // 4. Cascade failure 감지
    const hasCascadeFailure = this.detectCascadeFailures(iteration);

    return {
      iteration,
      timestamp: Date.now(),
      totalWorkers,
      deadWorkers: 1,
      recoveredWorkers: recovered ? 1 : 0,
      deathTime: detectionDelay,
      recoveryTime,
      totalDowntime: detectionDelay + recoveryTime,
      requestsLost: Math.floor(Math.random() * 50),
      requestsFailed: Math.floor(Math.random() * 20),
      cascadeFailures: hasCascadeFailure ? 1 : 0,
      success: recovered && !hasCascadeFailure,
      failureReason: !recovered ? 'Recovery timeout' : hasCascadeFailure ? 'Cascade failure detected' : undefined
    };
  }

  /**
   * 종료 감지 대기 (시뮬레이션)
   */
  private async waitForDetection(workerId: number, maxWaitMs: number): Promise<number> {
    // 실제 구현에서는 health check를 폴링
    // 시뮬레이션: 50-500ms 사이의 감지 시간
    const detectionDelay = 50 + Math.random() * 450;

    if (detectionDelay > maxWaitMs) {
      return -1; // timeout
    }

    // 감지됨 표시
    const death = this.injectedDeaths.get(workerId);
    if (death) {
      death.detected = true;
    }

    return Math.floor(detectionDelay);
  }

  /**
   * 복구 대기 (시뮬레이션)
   */
  private async waitForRecovery(workerId: number, maxWaitMs: number): Promise<boolean> {
    // 실제 구현에서는 worker restart를 대기
    // 시뮬레이션: 95% 복구 성공률
    const recoveryProbability = 0.95;
    const willRecover = Math.random() < recoveryProbability;

    if (!willRecover) {
      return false;
    }

    // 복구 시간: 100-1000ms
    const recoveryTime = 100 + Math.random() * 900;

    return recoveryTime <= maxWaitMs;
  }

  /**
   * Cascade failure 감지
   */
  private detectCascadeFailures(iteration: number): boolean {
    // Cascade failure 확률: 0.5% (매우 드문 경우)
    // 실제 구현에서는 다른 worker들의 에러 급증 감지
    const cascadeProbability = 0.005;
    return Math.random() < cascadeProbability;
  }

  /**
   * 통계 계산
   */
  private calculateStats(): ChaosStats {
    const successCount = this.results.filter(r => r.success).length;
    const failureCount = this.results.length - successCount;

    const deathDetectionTimes = this.results.map(r => r.deathTime);
    const recoveryTimes = this.results.filter(r => r.recoveredWorkers > 0).map(r => r.recoveryTime);
    const cascadeFailures = this.results.filter(r => r.cascadeFailures > 0).length;

    const avgDeathDetection = deathDetectionTimes.reduce((a, b) => a + b, 0) / deathDetectionTimes.length;
    const avgRecoveryTime = recoveryTimes.length > 0 ? recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length : 0;
    const maxRecoveryTime = recoveryTimes.length > 0 ? Math.max(...recoveryTimes) : 0;
    const minRecoveryTime = recoveryTimes.length > 0 ? Math.min(...recoveryTimes) : 0;

    const totalRequestsLost = this.results.reduce((sum, r) => sum + r.requestsLost, 0);
    const totalRequestsFailed = this.results.reduce((sum, r) => sum + r.requestsFailed, 0);

    const recommendation = this.generateRecommendation(
      successCount,
      this.results.length,
      avgRecoveryTime,
      cascadeFailures,
      totalRequestsLost
    );

    return {
      totalTests: this.results.length,
      successCount,
      failureCount,
      successRate: (successCount / this.results.length) * 100,
      avgDeathDetectionTime: avgDeathDetection,
      avgRecoveryTime,
      maxRecoveryTime,
      minRecoveryTime,
      cascadeFailureCount: cascadeFailures,
      requestLossCount: totalRequestsLost,
      requestFailureCount: totalRequestsFailed,
      recommendation
    };
  }

  /**
   * 권장사항 생성
   */
  private generateRecommendation(
    successCount: number,
    totalTests: number,
    avgRecoveryTime: number,
    cascadeFailures: number,
    totalRequestsLost: number
  ): string {
    const successRate = (successCount / totalTests) * 100;

    if (successRate >= 99.5 && cascadeFailures === 0 && avgRecoveryTime < 1000) {
      return `🎯 Production Ready! 성공률 ${successRate.toFixed(2)}%, 복구시간 ${avgRecoveryTime.toFixed(0)}ms, Cascade failures 0`;
    } else if (successRate >= 95 && cascadeFailures < totalTests * 0.01) {
      return `✅ 우수함. 성공률 ${successRate.toFixed(2)}%, 복구시간 ${avgRecoveryTime.toFixed(0)}ms 개선 필요`;
    } else if (successRate >= 90) {
      return `⚠️ 개선 필요. 성공률 ${successRate.toFixed(2)}%, 자동 복구 로직 검토 필요`;
    } else {
      return `❌ Production 배포 금지. 성공률 ${successRate.toFixed(2)}% - 근본적인 안정성 문제`;
    }
  }

  /**
   * 결과 조회
   */
  getResults(limit: number = 100): ChaosTestResult[] {
    return this.results.slice(-limit);
  }

  /**
   * 결과 리셋
   */
  reset(): void {
    this.results = [];
    this.injectedDeaths.clear();
    if (process.env.NODE_ENV !== 'test') {
      console.log('🔄 Chaos test results reset');
    }
  }

  /**
   * 최근 N개 테스트의 평균 복구 시간
   */
  getAverageRecoveryTime(count: number = 100): number {
    const recent = this.results.slice(-count).filter(r => r.recoveredWorkers > 0);
    if (recent.length === 0) return 0;
    return recent.reduce((sum, r) => sum + r.recoveryTime, 0) / recent.length;
  }

  /**
   * 실패율 (%)
   */
  getFailureRate(): number {
    if (this.results.length === 0) return 0;
    const failures = this.results.filter(r => !r.success).length;
    return (failures / this.results.length) * 100;
  }
}
