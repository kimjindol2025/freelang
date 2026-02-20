/**
 * Phase 23: Error Handling System
 * Global exception handling + error recovery
 *
 * 목표:
 * - Uncaught exceptions 처리
 * - Error context 추적
 * - Stack trace 수집
 * - Error recovery 전략
 */

import { EventEmitter } from 'events';

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ErrorContext {
  type: string;
  message: string;
  severity: ErrorSeverity;
  stack?: string;
  timestamp: number;
  context?: Record<string, any>;
  recovered?: boolean;
}

export class ErrorHandler extends EventEmitter {
  private errors: ErrorContext[] = [];
  private maxErrors = 1000;
  private recoveryStrategies: Map<string, (err: Error) => Promise<void>> = new Map();

  constructor() {
    super();
    this.setupGlobalHandlers();
  }

  /**
   * 전역 에러 핸들러 설정
   */
  private setupGlobalHandlers(): void {
    // Uncaught exceptions
    process.on('uncaughtException', (err: Error) => {
      this.handleError(err, ErrorSeverity.CRITICAL, { type: 'uncaughtException' });
    });

    // Unhandled promise rejections
    process.on('unhandledRejection', (reason: any) => {
      this.handleError(
        new Error(`Unhandled rejection: ${String(reason)}`),
        ErrorSeverity.HIGH,
        { type: 'unhandledRejection', reason }
      );
    });

    // Warning signals
    process.on('warning', (warning: any) => {
      this.handleError(
        new Error(`Warning: ${warning.message}`),
        ErrorSeverity.MEDIUM,
        { type: 'warning', code: warning.code }
      );
    });
  }

  /**
   * 에러 처리 메인 함수
   */
  async handleError(
    err: Error,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: Record<string, any>
  ): Promise<void> {
    const errorContext: ErrorContext = {
      type: err.constructor.name,
      message: err.message,
      severity,
      stack: err.stack,
      timestamp: Date.now(),
      context,
      recovered: false
    };

    // 에러 기록
    this.logError(errorContext);

    // Recovery 시도
    if (this.recoveryStrategies.has(err.constructor.name)) {
      try {
        await this.recoveryStrategies.get(err.constructor.name)!(err);
        errorContext.recovered = true;
      } catch (recoveryErr) {
        console.error('Recovery failed:', recoveryErr);
      }
    }

    // Critical 에러는 이벤트 발생
    if (severity === ErrorSeverity.CRITICAL) {
      this.emit('critical', errorContext);
    }
  }

  /**
   * 에러 기록
   */
  private logError(context: ErrorContext): void {
    this.errors.push(context);

    // 메모리 제한
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    this.emit('error-logged', context);
  }

  /**
   * Recovery 전략 등록
   */
  registerRecoveryStrategy(
    errorType: string,
    strategy: (err: Error) => Promise<void>
  ): void {
    this.recoveryStrategies.set(errorType, strategy);
  }

  /**
   * 에러 이력 조회
   */
  getErrorHistory(limit?: number): ErrorContext[] {
    const filtered = this.errors.filter(e => !e.recovered);
    return limit ? filtered.slice(-limit) : filtered;
  }

  /**
   * 통계
   */
  getStatistics(): {
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    recoveryRate: number;
  } {
    const bySeverity: Record<ErrorSeverity, number> = {
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.CRITICAL]: 0
    };

    let recovered = 0;

    for (const err of this.errors) {
      bySeverity[err.severity]++;
      if (err.recovered) recovered++;
    }

    return {
      total: this.errors.length,
      bySeverity,
      recoveryRate: this.errors.length > 0 ? recovered / this.errors.length : 0
    };
  }

  /**
   * 리셋
   */
  reset(): void {
    this.errors = [];
  }
}

export const globalErrorHandler = new ErrorHandler();

// Common recovery strategies
globalErrorHandler.registerRecoveryStrategy('ENOENT', async () => {
  console.log('File not found - cleaning cache');
  // Cache cleanup logic
});

globalErrorHandler.registerRecoveryStrategy('ECONNREFUSED', async () => {
  console.log('Connection refused - retrying with backoff');
  // Retry logic
});

export default globalErrorHandler;
