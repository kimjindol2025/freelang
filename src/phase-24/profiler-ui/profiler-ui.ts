/**
 * Phase 24: Profiler UI
 * VS Code WebView for performance visualization
 *
 * 기능:
 * - Real-time profiling data
 * - Flame graph visualization
 * - Memory timeline
 * - CPU breakdown
 */

import { EventEmitter } from 'events';

export interface UIData {
  type: 'performance' | 'memory' | 'cpu' | 'timeline';
  timestamp: number;
  data: Record<string, any>;
}

export interface PerformanceMetric {
  functionName: string;
  duration: number; // ms
  callCount: number;
  averageTime: number;
  percentage: number;
}

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
}

export class ProfilerUI extends EventEmitter {
  private performanceMetrics: PerformanceMetric[] = [];
  private memoryTimeline: MemorySnapshot[] = [];
  private uiDataBuffer: UIData[] = [];
  private isVisible = false;

  constructor() {
    super();
  }

  /**
   * UI 표시
   */
  show(): void {
    this.isVisible = true;
    this.emit('show', { message: 'Profiler UI shown' });
  }

  /**
   * UI 숨김
   */
  hide(): void {
    this.isVisible = false;
  }

  /**
   * 성능 데이터 업데이트
   */
  updatePerformanceMetrics(metrics: PerformanceMetric[]): void {
    this.performanceMetrics = metrics;

    // UI 데이터로 변환
    const uiData: UIData = {
      type: 'performance',
      timestamp: Date.now(),
      data: {
        metrics,
        totalTime: metrics.reduce((sum, m) => sum + m.duration, 0),
        topFunctions: metrics.slice(0, 10)
      }
    };

    this.addUIData(uiData);
  }

  /**
   * 메모리 타임라인 업데이트
   */
  updateMemoryTimeline(snapshot: MemorySnapshot): void {
    this.memoryTimeline.push(snapshot);

    // 최근 60개 스냅샷만 유지
    if (this.memoryTimeline.length > 60) {
      this.memoryTimeline.shift();
    }

    const uiData: UIData = {
      type: 'memory',
      timestamp: snapshot.timestamp,
      data: {
        current: snapshot,
        timeline: this.memoryTimeline,
        trend: this.calculateMemoryTrend()
      }
    };

    this.addUIData(uiData);
  }

  /**
   * CPU 분석 데이터
   */
  updateCPUMetrics(userTime: number, systemTime: number, totalTime: number): void {
    const uiData: UIData = {
      type: 'cpu',
      timestamp: Date.now(),
      data: {
        userTime,
        systemTime,
        totalTime,
        userPercent: (userTime / totalTime) * 100,
        systemPercent: (systemTime / totalTime) * 100,
        idlePercent: ((totalTime - userTime - systemTime) / totalTime) * 100
      }
    };

    this.addUIData(uiData);
  }

  /**
   * UI 데이터 추가
   */
  private addUIData(data: UIData): void {
    this.uiDataBuffer.push(data);

    // 버퍼 크기 제한
    if (this.uiDataBuffer.length > 1000) {
      this.uiDataBuffer.shift();
    }

    // 실시간 업데이트 이벤트
    if (this.isVisible) {
      this.emit('update', data);
    }
  }

  /**
   * 메모리 트렌드 계산
   */
  private calculateMemoryTrend(): {
    growing: boolean;
    growthRate: number;
  } {
    if (this.memoryTimeline.length < 2) {
      return { growing: false, growthRate: 0 };
    }

    const recent = this.memoryTimeline.slice(-10);
    const first = recent[0].heapUsed;
    const last = recent[recent.length - 1].heapUsed;
    const growthRate = ((last - first) / first) * 100;

    return {
      growing: growthRate > 0,
      growthRate
    };
  }

  /**
   * Flame graph 데이터 생성
   */
  generateFlameGraph(): string {
    const metrics = this.performanceMetrics.sort((a, b) => b.duration - a.duration);

    let svg = `<svg width="1000" height="${metrics.length * 30}" xmlns="http://www.w3.org/2000/svg">`;

    metrics.forEach((metric, index) => {
      const width = (metric.duration / 1000) * 900; // 최대 900px
      const y = index * 30;
      const color = `hsl(${(index * 360) / metrics.length}, 70%, 60%)`;

      svg += `
        <rect x="50" y="${y}" width="${width}" height="25" fill="${color}" stroke="black" stroke-width="1"/>
        <text x="55" y="${y + 17}" font-size="12">${metric.functionName} (${metric.duration.toFixed(2)}ms)</text>
      `;
    });

    svg += '</svg>';
    return svg;
  }

  /**
   * HTML 리포트 생성
   */
  generateHTMLReport(): string {
    const flame = this.generateFlameGraph();
    const memoryData = this.memoryTimeline.map(m => `${m.heapUsed / 1024 / 1024}`).join(',');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>FreeLang Profiler Report</title>
        <style>
          body { font-family: monospace; margin: 20px; }
          .section { margin-bottom: 30px; border: 1px solid #ccc; padding: 10px; }
          h2 { background: #f0f0f0; padding: 5px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #e0e0e0; }
        </style>
      </head>
      <body>
        <h1>FreeLang Performance Report</h1>

        <div class="section">
          <h2>Flame Graph</h2>
          ${flame}
        </div>

        <div class="section">
          <h2>Performance Metrics</h2>
          <table>
            <tr><th>Function</th><th>Duration (ms)</th><th>Calls</th><th>Avg (ms)</th><th>%</th></tr>
            ${this.performanceMetrics
              .slice(0, 20)
              .map(
                m =>
                  `<tr><td>${m.functionName}</td><td>${m.duration.toFixed(2)}</td><td>${m.callCount}</td><td>${m.averageTime.toFixed(3)}</td><td>${m.percentage.toFixed(1)}%</td></tr>`
              )
              .join('')}
          </table>
        </div>

        <div class="section">
          <h2>Memory Timeline</h2>
          <canvas id="memoryChart" width="800" height="400"></canvas>
          <script>
            const data = [${memoryData}];
            // Chart implementation would go here
          </script>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * 데이터 export
   */
  export(format: 'json' | 'html' | 'csv'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(
          {
            metrics: this.performanceMetrics,
            memory: this.memoryTimeline
          },
          null,
          2
        );
      case 'html':
        return this.generateHTMLReport();
      case 'csv':
        return this.performanceMetrics
          .map(m => `${m.functionName},${m.duration},${m.callCount},${m.averageTime}`)
          .join('\n');
      default:
        return '';
    }
  }

  /**
   * 상태 조회
   */
  getState() {
    return {
      isVisible: this.isVisible,
      metricsCount: this.performanceMetrics.length,
      memoryPoints: this.memoryTimeline.length,
      bufferSize: this.uiDataBuffer.length
    };
  }
}

export const profilerUI = new ProfilerUI();

export default profilerUI;
