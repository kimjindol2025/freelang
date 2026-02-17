/**
 * Phase 22 Week 2: Long Soak Test Monitor
 *
 * 책임:
 * 1. 72-168시간 지속 운영 모니터링
 * 2. 메모리 누수 감지 (선형 증가 추세)
 * 3. 파일 디스크립터 누수 감지
 * 4. 성능 저하 추세 감지
 * 5. 주기적 리포트 생성 (매 6시간)
 */

export interface SoakMetric {
  timestamp: number;
  uptime: number;        // ms
  memoryUsed: number;    // MB
  memoryRss: number;     // MB
  heapUsed: number;      // MB
  heapTotal: number;     // MB
  fdCount: number;       // File descriptors (추정)
  cpuUser: number;       // ms
  cpuSystem: number;     // ms
  requestCount: number;
  errorCount: number;
  gcCount: number;
}

export interface SoakTrend {
  metric: string;
  startValue: number;
  currentValue: number;
  change: number;         // 절대 변화
  changePercent: number;  // 변화율 %
  perHour: number;        // 시간당 변화
  isLeaking: boolean;     // 누수 의심 (선형 증가)
  leakRate: number;       // MB/hour or FD/hour
}

export interface SoakReport {
  sessionId: string;
  startTime: number;
  endTime: number;
  duration: number;       // ms
  durationHours: number;
  memoryTrend: SoakTrend;
  fdTrend: SoakTrend;
  performanceTrend: SoakTrend;
  cpuTrend: SoakTrend;
  summary: string;
  recommendation: string;
}

/**
 * Soak Monitor 구현
 */
export class SoakMonitor {
  private metrics: SoakMetric[] = [];
  private startTime: number = 0;
  private sessionId: string = '';
  private lastGcTime: number = 0;
  private gcCount: number = 0;

  constructor() {
    this.sessionId = `soak-${Date.now()}`;
    this.startTime = Date.now();

    // GC 이벤트 감시 (v8 모듈)
    try {
      const v8 = require('v8');
      const gc = require('gc'); // node --expose-gc
      // GC 콜백 설정 (구현 예정)
    } catch (e) {
      // V8 GC 모니터링 불가
    }
  }

  /**
   * 주기적 메트릭 수집 (10초마다)
   */
  collectMetric(): SoakMetric {
    const mem = process.memoryUsage();
    const now = Date.now();

    const metric: SoakMetric = {
      timestamp: now,
      uptime: now - this.startTime,
      memoryUsed: mem.heapUsed / 1024 / 1024,
      memoryRss: mem.rss / 1024 / 1024,
      heapUsed: mem.heapUsed / 1024 / 1024,
      heapTotal: mem.heapTotal / 1024 / 1024,
      fdCount: this.estimateFdCount(),
      cpuUser: process.cpuUsage().user / 1000,    // ms → ms
      cpuSystem: process.cpuUsage().system / 1000, // ms → ms
      requestCount: 0,  // 외부에서 주입
      errorCount: 0,    // 외부에서 주입
      gcCount: this.gcCount
    };

    this.metrics.push(metric);
    return metric;
  }

  /**
   * 파일 디스크립터 개수 추정
   * 실제 구현: /proc/self/fd 크기 또는 lsof 실행
   */
  private estimateFdCount(): number {
    try {
      const fs = require('fs');
      const path = '/proc/self/fd';
      if (fs.existsSync(path)) {
        return fs.readdirSync(path).length;
      }
    } catch (e) {
      // /proc 미지원 시스템
    }
    return 0;
  }

  /**
   * 메트릭 업데이트 (외부 소스: request/error count)
   */
  updateMetric(requestCount: number, errorCount: number): void {
    if (this.metrics.length === 0) return;

    const latest = this.metrics[this.metrics.length - 1];
    latest.requestCount = requestCount;
    latest.errorCount = errorCount;
  }

  /**
   * 누수 감지: 선형 회귀 + R² 계산
   */
  private detectLeak(values: number[], threshold: number = 0.5): {
    leaking: boolean;
    rate: number;
    r2: number;
  } {
    if (values.length < 10) {
      return { leaking: false, rate: 0, r2: 0 };
    }

    // 선형 회귀: y = a + b*x
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = values.reduce((sum, yi) => sum + yi * yi, 0);

    const b = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const a = (sumY - b * sumX) / n;

    // R² (결정 계수)
    const avgY = sumY / n;
    const ssTotal = values.reduce((sum, yi) => sum + Math.pow(yi - avgY, 2), 0);
    const ssResidual = values.reduce((sum, yi, i) => {
      const predicted = a + b * i;
      return sum + Math.pow(yi - predicted, 2);
    }, 0);
    const r2 = 1 - (ssResidual / ssTotal);

    // 누수 판정: R² > threshold AND b > 0 (증가 추세)
    const leaking = r2 > threshold && b > 0;

    return { leaking, rate: b, r2 };
  }

  /**
   * 6시간 리포트 생성
   */
  generateReport(): SoakReport {
    const now = Date.now();
    const duration = now - this.startTime;
    const durationHours = duration / 3600000;

    // 최근 6시간 데이터 필터링
    const sixHoursAgo = now - 6 * 3600000;
    const recentMetrics = this.metrics.filter(m => m.timestamp >= sixHoursAgo);

    // 추세 계산
    const memoryValues = recentMetrics.map(m => m.memoryUsed);
    const fdValues = recentMetrics.map(m => m.fdCount).filter(v => v > 0); // /proc 미지원 시 제외
    const cpuValues = recentMetrics.map(m => m.cpuUser + m.cpuSystem);

    // 응답 시간 계산 (request/error 기반)
    const avgRps = recentMetrics.length > 0
      ? recentMetrics[recentMetrics.length - 1].requestCount / (duration / 1000)
      : 0;

    const memoryTrend = this.getTrend('memory', memoryValues);
    const fdTrend = fdValues.length > 0 ? this.getTrend('fd', fdValues) : {
      metric: 'fd',
      startValue: 0,
      currentValue: 0,
      change: 0,
      changePercent: 0,
      perHour: 0,
      isLeaking: false,
      leakRate: 0
    };
    const cpuTrend = this.getTrend('cpu', cpuValues);
    const perfTrend = this.getTrend('performance', [avgRps]); // 단순화

    const summary = this.generateSummary(durationHours, memoryTrend, fdTrend, cpuTrend);
    const recommendation = this.generateRecommendation(memoryTrend, fdTrend);

    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      endTime: now,
      duration,
      durationHours,
      memoryTrend,
      fdTrend,
      performanceTrend: perfTrend,
      cpuTrend,
      summary,
      recommendation
    };
  }

  /**
   * 단일 메트릭 추세 계산
   */
  private getTrend(
    metricName: string,
    values: number[]
  ): SoakTrend {
    if (values.length < 2) {
      return {
        metric: metricName,
        startValue: values[0] || 0,
        currentValue: values[values.length - 1] || 0,
        change: 0,
        changePercent: 0,
        perHour: 0,
        isLeaking: false,
        leakRate: 0
      };
    }

    const start = values[0];
    const current = values[values.length - 1];
    const change = current - start;
    const changePercent = start > 0 ? (change / start) * 100 : 0;

    // 시간당 변화 (6시간 샘플 기준)
    const perHour = change / 6;

    // 누수 감지
    const { leaking, rate } = this.detectLeak(values, 0.5);

    return {
      metric: metricName,
      startValue: start,
      currentValue: current,
      change,
      changePercent,
      perHour,
      isLeaking: leaking,
      leakRate: rate
    };
  }

  /**
   * 요약 생성
   */
  private generateSummary(
    durationHours: number,
    memoryTrend: SoakTrend,
    fdTrend: SoakTrend,
    cpuTrend: SoakTrend
  ): string {
    const parts: string[] = [];

    parts.push(`📊 Soak Test Report (${durationHours.toFixed(1)}h)`);

    // 메모리
    if (memoryTrend.isLeaking) {
      parts.push(
        `🚨 메모리 누수 감지: ${memoryTrend.change.toFixed(1)}MB (${memoryTrend.changePercent.toFixed(1)}%), ` +
        `누수율: ${memoryTrend.leakRate.toFixed(2)}MB/h`
      );
    } else {
      parts.push(
        `✅ 메모리 안정: ${memoryTrend.changePercent.toFixed(1)}% 변화, ` +
        `현재: ${memoryTrend.currentValue.toFixed(1)}MB`
      );
    }

    // FD
    if (fdTrend.isLeaking && fdTrend.currentValue > 0) {
      parts.push(
        `🚨 파일 디스크립터 누수 감지: ${fdTrend.change.toFixed(0)}개, ` +
        `누수율: ${fdTrend.leakRate.toFixed(1)}FD/h`
      );
    } else if (fdTrend.currentValue > 0) {
      parts.push(`✅ FD 안정: ${fdTrend.currentValue.toFixed(0)}개`);
    }

    // CPU
    if (cpuTrend.changePercent > 20) {
      parts.push(`⚠️ CPU 사용량 증가: ${cpuTrend.changePercent.toFixed(1)}%`);
    } else {
      parts.push(`✅ CPU 안정: ${cpuTrend.changePercent.toFixed(1)}% 변화`);
    }

    return parts.join(' | ');
  }

  /**
   * 권장사항 생성
   */
  private generateRecommendation(
    memoryTrend: SoakTrend,
    fdTrend: SoakTrend
  ): string {
    const recommendations: string[] = [];

    if (memoryTrend.isLeaking) {
      recommendations.push(
        `🔴 메모리 누수 발생 (${memoryTrend.leakRate.toFixed(2)}MB/h). ` +
        `대조: 힙 스냅샷 분석, 타이머 정리, 이벤트 리스너 제거 검증`
      );
    }

    if (fdTrend.isLeaking && fdTrend.currentValue > 0) {
      recommendations.push(
        `🔴 파일 디스크립터 누수 (${fdTrend.leakRate.toFixed(1)}FD/h). ` +
        `대조: 스트림 종료 여부, 소켓 정리 검증`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(`✅ 안정 상태 유지. 추가 테스트 진행 가능 (> 168h 권장).`);
    }

    return recommendations.join(' | ');
  }

  /**
   * 메트릭 조회
   */
  getMetrics(): SoakMetric[] {
    return this.metrics;
  }

  /**
   * 최근 N개 메트릭
   */
  getRecentMetrics(count: number = 100): SoakMetric[] {
    return this.metrics.slice(-count);
  }

  /**
   * 리셋
   */
  reset(): void {
    this.metrics = [];
    this.startTime = Date.now();
    this.sessionId = `soak-${Date.now()}`;
    this.gcCount = 0;
  }
}
