/**
 * Phase 23: Structured Logging System
 * Unified logging with context + severity levels
 *
 * 목표:
 * - 구조화된 로깅
 * - 다중 레벨 (DEBUG, INFO, WARN, ERROR, FATAL)
 * - Context 추적
 * - 파일/콘솔 출력
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  module: string;
  message: string;
  context?: Record<string, any>;
  stack?: string;
}

export class Logger {
  private entries: LogEntry[] = [];
  private maxEntries = 10000;
  private minLevel: LogLevel = LogLevel.DEBUG;
  private modules: Set<string> = new Set();

  constructor(private defaultModule: string = 'app') {
    this.modules.add(defaultModule);
  }

  /**
   * 로그 레벨명 -> LogLevel 변환
   */
  private getLevelName(level: LogLevel): string {
    const names: Record<LogLevel, string> = {
      [LogLevel.DEBUG]: 'DEBUG',
      [LogLevel.INFO]: 'INFO',
      [LogLevel.WARN]: 'WARN',
      [LogLevel.ERROR]: 'ERROR',
      [LogLevel.FATAL]: 'FATAL'
    };
    return names[level];
  }

  /**
   * 로그 기록
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    module?: string,
    error?: Error
  ): void {
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      module: module || this.defaultModule,
      message,
      context,
      stack: error?.stack
    };

    // 콘솔 출력
    const levelName = this.getLevelName(level);
    const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
    const timestamp = new Date(entry.timestamp).toISOString();

    console.log(`[${timestamp}] [${levelName}] [${entry.module}] ${message}${contextStr}`);

    if (error?.stack) {
      console.log(error.stack);
    }

    // 메모리에 저장
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
  }

  /**
   * Debug 로그
   */
  debug(message: string, context?: Record<string, any>, module?: string): void {
    this.log(LogLevel.DEBUG, message, context, module);
  }

  /**
   * Info 로그
   */
  info(message: string, context?: Record<string, any>, module?: string): void {
    this.log(LogLevel.INFO, message, context, module);
  }

  /**
   * Warning 로그
   */
  warn(message: string, context?: Record<string, any>, module?: string): void {
    this.log(LogLevel.WARN, message, context, module);
  }

  /**
   * Error 로그
   */
  error(message: string, err?: Error, context?: Record<string, any>, module?: string): void {
    this.log(LogLevel.ERROR, message, context, module, err);
  }

  /**
   * Fatal 로그
   */
  fatal(message: string, err?: Error, context?: Record<string, any>, module?: string): void {
    this.log(LogLevel.FATAL, message, context, module, err);
  }

  /**
   * 최소 로그 레벨 설정
   */
  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * 로그 이력 조회
   */
  getHistory(level?: LogLevel, limit?: number): LogEntry[] {
    let filtered = this.entries;

    if (level !== undefined) {
      filtered = filtered.filter(e => e.level >= level);
    }

    return limit ? filtered.slice(-limit) : filtered;
  }

  /**
   * 모듈별 로그 조회
   */
  getByModule(module: string, limit?: number): LogEntry[] {
    const filtered = this.entries.filter(e => e.module === module);
    return limit ? filtered.slice(-limit) : filtered;
  }

  /**
   * 통계
   */
  getStatistics(): Record<LogLevel, number> {
    const stats: Record<LogLevel, number> = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 0,
      [LogLevel.WARN]: 0,
      [LogLevel.ERROR]: 0,
      [LogLevel.FATAL]: 0
    };

    for (const entry of this.entries) {
      stats[entry.level]++;
    }

    return stats;
  }

  /**
   * 리셋
   */
  reset(): void {
    this.entries = [];
  }

  /**
   * 로그 파일 저장 (추후 구현)
   */
  async saveToFile(path: string): Promise<void> {
    // fs.writeFileSync(path, JSON.stringify(this.entries, null, 2));
    console.log(`[Logger] Would save ${this.entries.length} entries to ${path}`);
  }
}

export const logger = new Logger('freelang');

export default logger;
