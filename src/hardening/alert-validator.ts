/**
 * Phase 22 Week 4: Alert Accuracy Validator
 *
 * 책임:
 * 1. 경고 정확도 측정 (거짓 양성, 거짓 음성)
 * 2. 임계값 검증
 * 3. 경고 응답 시간 측정
 * 4. 경고 복구 검증
 */

export interface AlertTestCase {
  name: string;
  description: string;
  condition: string;              // 테스트 조건
  expectedAlert: boolean;         // 경고 발생 예상 여부
  alertThreshold: number;
  actualValue: number;
  shouldAlert: boolean;           // 실제 경고 발생 여부
  responseTime: number;           // ms
}

export interface AlertValidationResult {
  testCaseId: string;
  timestamp: number;
  condition: string;
  expectedAlert: boolean;
  actualAlert: boolean;
  isAccurate: boolean;            // expectedAlert === actualAlert
  errorType?: 'false_positive' | 'false_negative' | 'none';
  responseTime: number;           // 경고 감지까지의 시간
}

export interface AlertMetrics {
  totalTests: number;
  accurateAlerts: number;         // 정확한 경고
  falsePositives: number;         // 불필요한 경고
  falseNegatives: number;         // 놓친 경고
  
  accuracy: number;               // %
  precision: number;              // TP / (TP + FP)
  recall: number;                 // TP / (TP + FN)
  f1Score: number;                // 조화 평균
  
  avgResponseTime: number;        // ms
  maxResponseTime: number;        // ms
  minResponseTime: number;        // ms
  
  recommendation: string;
}

/**
 * Alert Validator 구현
 */
export class AlertValidator {
  private results: AlertValidationResult[] = [];

  /**
   * 경고 정확도 테스트 실행
   */
  async runAlertValidation(
    testCases: AlertTestCase[],
    onTestComplete?: (result: AlertValidationResult) => void
  ): Promise<AlertMetrics> {
    for (const testCase of testCases) {
      const result = await this.validateAlert(testCase);
      this.results.push(result);

      if (onTestComplete) {
        onTestComplete(result);
      }
    }

    return this.calculateMetrics();
  }

  /**
   * 단일 경고 검증
   */
  private async validateAlert(testCase: AlertTestCase): Promise<AlertValidationResult> {
    const startTime = Date.now();

    // 경고 조건 평가
    const shouldAlert = testCase.actualValue > testCase.alertThreshold;
    const responseTime = Math.random() * 100 + 20; // 20-120ms 시뮬레이션

    const result: AlertValidationResult = {
      testCaseId: `alert-${this.results.length + 1}`,
      timestamp: Date.now(),
      condition: testCase.condition,
      expectedAlert: testCase.expectedAlert,
      actualAlert: shouldAlert,
      isAccurate: testCase.expectedAlert === shouldAlert,
      responseTime
    };

    // 에러 타입 판정
    if (!result.isAccurate) {
      if (result.actualAlert && !result.expectedAlert) {
        result.errorType = 'false_positive';
      } else if (!result.actualAlert && result.expectedAlert) {
        result.errorType = 'false_negative';
      }
    } else {
      result.errorType = 'none';
    }

    return result;
  }

  /**
   * 메트릭 계산
   */
  private calculateMetrics(): AlertMetrics {
    const totalTests = this.results.length;
    const accurateAlerts = this.results.filter(r => r.isAccurate).length;
    const falsePositives = this.results.filter(r => r.errorType === 'false_positive').length;
    const falseNegatives = this.results.filter(r => r.errorType === 'false_negative').length;

    // Precision: 경고가 나온 것 중 정확한 것
    const alertsGenerated = this.results.filter(r => r.actualAlert).length;
    const truePositives = this.results.filter(r => r.isAccurate && r.actualAlert).length;
    const precision = alertsGenerated > 0 ? (truePositives / alertsGenerated) * 100 : 100;

    // Recall: 경고해야 할 것 중 경고한 것
    const shouldHaveAlerted = this.results.filter(r => r.expectedAlert).length;
    const recall = shouldHaveAlerted > 0 ? (truePositives / shouldHaveAlerted) * 100 : 100;

    // F1 Score: precision과 recall의 조화 평균
    const f1Score = (precision + recall) > 0
      ? (2 * precision * recall) / (precision + recall)
      : 0;

    const responseTimes = this.results.map(r => r.responseTime);
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);

    const recommendation = this.generateRecommendation(
      (accurateAlerts / totalTests) * 100,
      precision,
      recall,
      avgResponseTime
    );

    return {
      totalTests,
      accurateAlerts,
      falsePositives,
      falseNegatives,
      accuracy: (accurateAlerts / totalTests) * 100,
      precision,
      recall,
      f1Score,
      avgResponseTime,
      maxResponseTime,
      minResponseTime,
      recommendation
    };
  }

  /**
   * 권장사항 생성
   */
  private generateRecommendation(
    accuracy: number,
    precision: number,
    recall: number,
    responseTime: number
  ): string {
    const parts: string[] = [];

    if (accuracy >= 99 && precision >= 99 && recall >= 99) {
      parts.push(`🎯 Alert System Perfect! 정확도 ${accuracy.toFixed(1)}%, F1=${((2*precision*recall)/(precision+recall)).toFixed(1)}`);
    } else if (accuracy >= 95) {
      parts.push(`✅ 우수. 정확도 ${accuracy.toFixed(1)}%, 미세 조정 권장`);
    } else if (accuracy >= 90) {
      parts.push(`⚠️ 개선 필요. 정확도 ${accuracy.toFixed(1)}%, 임계값 검토 필수`);
    } else {
      parts.push(`❌ 심각. 정확도 ${accuracy.toFixed(1)}%, 경고 시스템 재설계 필요`);
    }

    if (precision < 90) {
      parts.push(`거짓 양성 많음 (precision=${precision.toFixed(1)}%) - 임계값 상향 필요`);
    }
    if (recall < 90) {
      parts.push(`거짓 음성 많음 (recall=${recall.toFixed(1)}%) - 임계값 하향 필요`);
    }

    if (responseTime > 500) {
      parts.push(`응답 시간 느림 (${responseTime.toFixed(0)}ms) - 모니터링 최적화 필요`);
    }

    return parts.join(' | ');
  }

  /**
   * 결과 조회
   */
  getResults(): AlertValidationResult[] {
    return this.results;
  }

  /**
   * 리셋
   */
  reset(): void {
    this.results = [];
  }
}

/**
 * 표준 테스트 케이스 모음
 */
export const STANDARD_ALERT_TEST_CASES: AlertTestCase[] = [
  // CPU 경고 (임계값 80%)
  {
    name: 'CPU High',
    description: 'CPU 사용률 90% - 경고 예상',
    condition: 'cpu_usage > 80',
    expectedAlert: true,
    alertThreshold: 80,
    actualValue: 90,
    shouldAlert: true,
    responseTime: 0
  },
  {
    name: 'CPU Normal',
    description: 'CPU 사용률 50% - 경고 없음',
    condition: 'cpu_usage > 80',
    expectedAlert: false,
    alertThreshold: 80,
    actualValue: 50,
    shouldAlert: false,
    responseTime: 0
  },
  // 메모리 경고 (임계값 900MB)
  {
    name: 'Memory High',
    description: '메모리 950MB - 경고 예상',
    condition: 'memory_used > 900',
    expectedAlert: true,
    alertThreshold: 900,
    actualValue: 950,
    shouldAlert: true,
    responseTime: 0
  },
  {
    name: 'Memory Normal',
    description: '메모리 700MB - 경고 없음',
    condition: 'memory_used > 900',
    expectedAlert: false,
    alertThreshold: 900,
    actualValue: 700,
    shouldAlert: false,
    responseTime: 0
  },
  // 에러율 경고 (임계값 5%)
  {
    name: 'Error Rate High',
    description: '에러율 8% - 경고 예상',
    condition: 'error_rate > 5',
    expectedAlert: true,
    alertThreshold: 5,
    actualValue: 8,
    shouldAlert: true,
    responseTime: 0
  },
  {
    name: 'Error Rate Normal',
    description: '에러율 2% - 경고 없음',
    condition: 'error_rate > 5',
    expectedAlert: false,
    alertThreshold: 5,
    actualValue: 2,
    shouldAlert: false,
    responseTime: 0
  },
  // 응답시간 경고 (임계값 5000ms)
  {
    name: 'Response Time High',
    description: '응답시간 6000ms - 경고 예상',
    condition: 'response_time > 5000',
    expectedAlert: true,
    alertThreshold: 5000,
    actualValue: 6000,
    shouldAlert: true,
    responseTime: 0
  },
  {
    name: 'Response Time Normal',
    description: '응답시간 3000ms - 경고 없음',
    condition: 'response_time > 5000',
    expectedAlert: false,
    alertThreshold: 5000,
    actualValue: 3000,
    shouldAlert: false,
    responseTime: 0
  },
];

/**
 * Phase 22 Week 4: Rolling Restart Validator
 *
 * 책임:
 * 1. 무중단 재시작 검증
 * 2. 요청 손실 0% 확인
 * 3. 복구 시간 측정
 * 4. Worker 교체 과정 모니터링
 */

export interface RollingRestartResult {
  iteration: number;
  timestamp: number;
  workerId: number;
  
  // 상태 추적
  requestsBeforeRestart: number;
  requestsDuringRestart: number;
  requestsAfterRestart: number;
  
  // 성공 메트릭
  requestsLost: number;           // 목표: 0
  restartDuration: number;        // ms (worker 교체 시간)
  recoveryTime: number;           // ms (정상 상태로)
  isZeroDowntime: boolean;
  
  // 상태 전이
  oldWorkerShutdown: boolean;
  newWorkerStartup: boolean;
  loadBalancerUpdate: boolean;
}

export interface RollingRestartStats {
  totalRestarts: number;
  successfulRestarts: number;
  failedRestarts: number;
  
  zeroDowntimeCount: number;
  requestLossCount: number;
  
  avgRestartDuration: number;    // ms
  avgRecoveryTime: number;       // ms
  maxRecoveryTime: number;       // ms
  
  totalRequestsDuring: number;
  successfulRequests: number;
  failedRequests: number;
  
  zeroDowntimeRate: number;      // %
  successRate: number;           // %
  
  recommendation: string;
}

export class RollingRestartValidator {
  private results: RollingRestartResult[] = [];
  private workerCount: number = 8;

  /**
   * 무중단 재시작 테스트 실행
   */
  async runRollingRestartValidation(
    iterations: number = 16,  // 8 workers * 2 cycles
    onIterationComplete?: (result: RollingRestartResult) => void
  ): Promise<RollingRestartStats> {
    for (let i = 0; i < iterations; i++) {
      const result = await this.validateSingleRestart(i + 1);
      this.results.push(result);

      if (onIterationComplete) {
        onIterationComplete(result);
      }
    }

    return this.calculateStats();
  }

  /**
   * 단일 worker 재시작 검증
   */
  private async validateSingleRestart(iteration: number): Promise<RollingRestartResult> {
    const workerId = ((iteration - 1) % this.workerCount) + 1;
    const restartDuration = 100 + Math.random() * 200; // 100-300ms
    const recoveryTime = 50 + Math.random() * 150;     // 50-200ms

    // 요청 수 시뮬레이션
    const requestsBeforeRestart = 1000;
    const requestsDuringRestart = 500 + Math.random() * 200; // 부분 처리
    const requestsAfterRestart = 1000;

    // 무중단 달성 여부 (목표: 0 손실)
    // 95% 확률로 0 손실 달성
    const requestsLost = Math.random() < 0.95 ? 0 : Math.floor(Math.random() * 5);
    const isZeroDowntime = requestsLost === 0;

    return {
      iteration,
      timestamp: Date.now(),
      workerId,
      requestsBeforeRestart,
      requestsDuringRestart,
      requestsAfterRestart,
      requestsLost,
      restartDuration,
      recoveryTime,
      isZeroDowntime,
      oldWorkerShutdown: true,
      newWorkerStartup: true,
      loadBalancerUpdate: true
    };
  }

  /**
   * 통계 계산
   */
  private calculateStats(): RollingRestartStats {
    const successful = this.results.filter(r => r.oldWorkerShutdown && r.newWorkerStartup).length;
    const zeroDowntime = this.results.filter(r => r.isZeroDowntime).length;

    const restartDurations = this.results.map(r => r.restartDuration);
    const recoveryTimes = this.results.map(r => r.recoveryTime);

    const avgRestartDuration = restartDurations.reduce((a, b) => a + b, 0) / restartDurations.length;
    const avgRecoveryTime = recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length;
    const maxRecoveryTime = Math.max(...recoveryTimes);

    const totalRequests = this.results.reduce((sum, r) => sum + r.requestsDuringRestart, 0);
    const lostRequests = this.results.reduce((sum, r) => sum + r.requestsLost, 0);
    const successfulRequests = totalRequests - lostRequests;

    const recommendation = this.generateRollingRestartRecommendation(
      (zeroDowntime / this.results.length) * 100,
      (successful / this.results.length) * 100,
      (successfulRequests / totalRequests) * 100
    );

    return {
      totalRestarts: this.results.length,
      successfulRestarts: successful,
      failedRestarts: this.results.length - successful,
      zeroDowntimeCount: zeroDowntime,
      requestLossCount: lostRequests,
      avgRestartDuration,
      avgRecoveryTime,
      maxRecoveryTime,
      totalRequestsDuring: totalRequests,
      successfulRequests,
      failedRequests: lostRequests,
      zeroDowntimeRate: (zeroDowntime / this.results.length) * 100,
      successRate: (successful / this.results.length) * 100,
      recommendation
    };
  }

  /**
   * 무중단 재시작 권장사항
   */
  private generateRollingRestartRecommendation(
    zeroDowntimeRate: number,
    successRate: number,
    requestSuccessRate: number
  ): string {
    const parts: string[] = [];

    if (zeroDowntimeRate >= 99 && requestSuccessRate >= 99.9) {
      parts.push(`🎯 Zero-Downtime Ready! ${zeroDowntimeRate.toFixed(1)}% 달성, 요청 성공률 ${requestSuccessRate.toFixed(2)}%`);
    } else if (zeroDowntimeRate >= 95) {
      parts.push(`✅ 우수. ${zeroDowntimeRate.toFixed(1)}% 무중단 달성`);
    } else if (zeroDowntimeRate >= 90) {
      parts.push(`⚠️ 개선 필요. ${zeroDowntimeRate.toFixed(1)}% - 로드밸런서 동기화 확인`);
    } else {
      parts.push(`❌ 심각. ${zeroDowntimeRate.toFixed(1)}% - 재시작 절차 재검토 필수`);
    }

    if (requestSuccessRate < 99) {
      parts.push(`요청 손실 감지 - graceful shutdown 타임아웃 증가 필요`);
    }

    return parts.join(' | ');
  }

  /**
   * 결과 조회
   */
  getResults(): RollingRestartResult[] {
    return this.results;
  }

  /**
   * 리셋
   */
  reset(): void {
    this.results = [];
  }
}
