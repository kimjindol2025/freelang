/**
 * Phase 23: Performance Profiler
 * Function-level performance tracking
 *
 * 목표:
 * - 함수별 실행시간 추적
 * - 병목 지점 식별
 * - CPU 프로파일링
 */

export interface FunctionProfile {
  name: string;
  callCount: number;
  totalTime: number; // milliseconds
  minTime: number;
  maxTime: number;
  averageTime: number;
  lastCallTime: number;
}

export interface ProfileReport {
  functions: FunctionProfile[];
  totalTime: number;
  slowestFunctions: FunctionProfile[];
  mostCalledFunctions: FunctionProfile[];
}

export class Profiler {
  private profiles: Map<string, FunctionProfile> = new Map();
  private activeCallStack: Map<string, number> = new Map();
  private enabled = true;

  /**
   * 함수 프로파일링 시작
   */
  start(functionName: string): void {
    if (!this.enabled) return;

    this.activeCallStack.set(functionName, Date.now());
  }

  /**
   * 함수 프로파일링 종료
   */
  end(functionName: string): number {
    if (!this.enabled) return 0;

    const startTime = this.activeCallStack.get(functionName);
    if (!startTime) return 0;

    const duration = Date.now() - startTime;
    this.activeCallStack.delete(functionName);

    // 프로필 업데이트
    if (!this.profiles.has(functionName)) {
      this.profiles.set(functionName, {
        name: functionName,
        callCount: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        averageTime: 0,
        lastCallTime: 0
      });
    }

    const profile = this.profiles.get(functionName)!;
    profile.callCount++;
    profile.totalTime += duration;
    profile.minTime = Math.min(profile.minTime, duration);
    profile.maxTime = Math.max(profile.maxTime, duration);
    profile.averageTime = profile.totalTime / profile.callCount;
    profile.lastCallTime = duration;

    return duration;
  }

  /**
   * Decorator: 함수를 자동으로 프로파일링
   */
  profile(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const functionName = `${target.constructor.name}.${propertyKey}`;
      this.profiler.start(functionName);
      try {
        const result = originalMethod.apply(this, args);
        this.profiler.end(functionName);
        return result;
      } catch (err) {
        this.profiler.end(functionName);
        throw err;
      }
    };

    return descriptor;
  }

  /**
   * 프로파일 리포트
   */
  getReport(): ProfileReport {
    const functions = Array.from(this.profiles.values());
    const totalTime = functions.reduce((sum, f) => sum + f.totalTime, 0);

    const slowestFunctions = [...functions].sort((a, b) => b.averageTime - a.averageTime).slice(0, 10);
    const mostCalledFunctions = [...functions].sort((a, b) => b.callCount - a.callCount).slice(0, 10);

    return {
      functions,
      totalTime,
      slowestFunctions,
      mostCalledFunctions
    };
  }

  /**
   * 함수별 프로필 조회
   */
  getProfile(functionName: string): FunctionProfile | undefined {
    return this.profiles.get(functionName);
  }

  /**
   * 프로파일링 활성화/비활성화
   */
  enable(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 리셋
   */
  reset(): void {
    this.profiles.clear();
    this.activeCallStack.clear();
  }

  /**
   * 상세 리포트 출력
   */
  printReport(): void {
    const report = this.getReport();

    console.log('\n========== PROFILER REPORT ==========');
    console.log(`Total time: ${report.totalTime.toFixed(2)}ms\n`);

    console.log('TOP 10 SLOWEST FUNCTIONS:');
    report.slowestFunctions.forEach((fn, i) => {
      console.log(
        `  ${i + 1}. ${fn.name} | avg: ${fn.averageTime.toFixed(3)}ms | calls: ${fn.callCount} | total: ${fn.totalTime.toFixed(2)}ms`
      );
    });

    console.log('\nTOP 10 MOST CALLED FUNCTIONS:');
    report.mostCalledFunctions.forEach((fn, i) => {
      console.log(
        `  ${i + 1}. ${fn.name} | calls: ${fn.callCount} | avg: ${fn.averageTime.toFixed(3)}ms | total: ${fn.totalTime.toFixed(2)}ms`
      );
    });

    console.log('=====================================\n');
  }
}

export const profiler = new Profiler();

export default profiler;
