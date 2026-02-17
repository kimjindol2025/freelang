/**
 * Stability Testing Framework
 * Measures performance, memory, and error handling
 */

import { ProgramRunner } from '../cli/runner';

export interface TestMetrics {
  totalPrograms: number;
  successCount: number;
  failureCount: number;
  errorCount: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  stdDev: number;
  memoryUsed: number;
  errorRates: {
    parseError: number;
    runtimeError: number;
    fileError: number;
  };
}

export interface ExecutionLog {
  program: string;
  success: boolean;
  executionTime: number;
  output?: unknown;
  error?: string;
}

/**
 * Stability tester for 1000-program stress test
 */
export class StabilityTester {
  private runner: ProgramRunner;
  private logs: ExecutionLog[] = [];
  private startMemory: number = 0;

  constructor() {
    this.runner = new ProgramRunner();
  }

  /**
   * Run single program and log results
   */
  private runSingleTest(program: string): ExecutionLog {
    try {
      const startTime = Date.now();
      const result = this.runner.runString(program);
      const executionTime = Date.now() - startTime;

      return {
        program,
        success: result.success,
        executionTime,
        output: result.output,
        error: result.error
      };
    } catch (error) {
      return {
        program,
        success: false,
        executionTime: 0,
        error: `Exception: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Run batch of programs
   */
  runTests(programs: string[]): TestMetrics {
    this.logs = [];
    this.startMemory = process.memoryUsage().heapUsed;

    // Run all programs
    for (const program of programs) {
      const log = this.runSingleTest(program);
      this.logs.push(log);
    }

    // Calculate metrics
    return this.calculateMetrics();
  }

  /**
   * Calculate comprehensive metrics
   */
  private calculateMetrics(): TestMetrics {
    const times = this.logs.map(log => log.executionTime);
    const totalTime = times.reduce((a, b) => a + b, 0);
    const avgTime = totalTime / this.logs.length;

    // Standard deviation
    const variance = times.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / this.logs.length;
    const stdDev = Math.sqrt(variance);

    // Error counts
    const successCount = this.logs.filter(log => log.success).length;
    const failureCount = this.logs.filter(log => !log.success && !log.error).length;
    const errorCount = this.logs.filter(log => !!log.error).length;

    // Error rates
    const errorRates = {
      parseError: this.logs.filter(log => log.error?.includes('Unable to parse')).length,
      runtimeError: this.logs.filter(log => log.error?.includes('VM Error')).length,
      fileError: this.logs.filter(log => log.error?.includes('File')).length
    };

    // Memory usage
    const endMemory = process.memoryUsage().heapUsed;
    const memoryUsed = (endMemory - this.startMemory) / 1024 / 1024; // Convert to MB

    return {
      totalPrograms: this.logs.length,
      successCount,
      failureCount,
      errorCount,
      totalTime,
      avgTime,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      stdDev,
      memoryUsed,
      errorRates
    };
  }

  /**
   * Get detailed logs
   */
  getLogs(): ExecutionLog[] {
    return this.logs;
  }

  /**
   * Get failed programs for analysis
   */
  getFailures(): ExecutionLog[] {
    return this.logs.filter(log => !log.success);
  }

  /**
   * Get error summary
   */
  getErrorSummary(): Record<string, number> {
    const summary: Record<string, string | number> = {};

    for (const log of this.logs) {
      if (log.error) {
        const errorType = log.error.split(':')[0] || 'Unknown';
        summary[errorType] = (summary[errorType] as number || 0) + 1;
      }
    }

    return summary as Record<string, number>;
  }

  /**
   * Format metrics for display
   */
  static formatMetrics(metrics: TestMetrics): string {
    return `
Phase 18 Day 7: Stability Test Results
===============================================

Program Count:  ${metrics.totalPrograms}
Success:        ${metrics.successCount} (${((metrics.successCount / metrics.totalPrograms) * 100).toFixed(2)}%)
Failures:       ${metrics.failureCount}
Errors:         ${metrics.errorCount}

Performance:
  Total Time:   ${metrics.totalTime.toFixed(2)}ms
  Avg Time:     ${metrics.avgTime.toFixed(4)}ms
  Min Time:     ${metrics.minTime.toFixed(4)}ms
  Max Time:     ${metrics.maxTime.toFixed(4)}ms
  Std Dev:      ${metrics.stdDev.toFixed(4)}ms

Memory Usage:   ${metrics.memoryUsed.toFixed(2)}MB

Error Breakdown:
  Parse Errors: ${metrics.errorRates.parseError}
  Runtime Errors: ${metrics.errorRates.runtimeError}
  File Errors:  ${metrics.errorRates.fileError}

===============================================
`;
  }
}
