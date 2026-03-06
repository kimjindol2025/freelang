/**
 * Phase 15: Logging & Error Handling
 * 로깅 시스템 및 에러 처리 (Tier 1, Priority 95)
 */

import { registerBuiltinFunction } from './cli/function-registry';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// logger: 로깅 시스템
// ============================================

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: Record<string, any>;
  stack?: string;
}

interface LoggerConfig {
  level?: LogLevel;
  format?: string;
  file?: string;
  console?: boolean;
  maxSize?: number;
  maxFiles?: number;
}

class Logger {
  private config: LoggerConfig;
  private entries: LogEntry[] = [];
  private levelMap: Record<LogLevel, string> = {
    [LogLevel.DEBUG]: 'DEBUG',
    [LogLevel.INFO]: 'INFO',
    [LogLevel.WARN]: 'WARN',
    [LogLevel.ERROR]: 'ERROR',
    [LogLevel.FATAL]: 'FATAL',
  };

  constructor(config: LoggerConfig = {}) {
    this.config = {
      level: config.level ?? LogLevel.INFO,
      format: config.format ?? '[${timestamp}] ${level}: ${message}',
      console: config.console ?? true,
      maxSize: config.maxSize ?? 10 * 1024 * 1024, // 10MB
      maxFiles: config.maxFiles ?? 5,
      ...config,
    };
  }

  private formatMessage(level: LogLevel, message: string, context?: Record<string, any>): string {
    let formatted = this.config.format!
      .replace('${timestamp}', new Date().toISOString())
      .replace('${level}', this.levelMap[level])
      .replace('${message}', message);

    if (context) {
      formatted += ' ' + JSON.stringify(context);
    }

    return formatted;
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    if (level < this.config.level!) return;

    const formatted = this.formatMessage(level, message, context);

    // Store entry
    this.entries.push({
      timestamp: new Date().toISOString(),
      level: this.levelMap[level],
      message,
      context,
    });

    // Console output
    if (this.config.console) {
      console.log(formatted);
    }

    // File output
    if (this.config.file) {
      try {
        fs.appendFileSync(this.config.file, formatted + '\n', 'utf-8');
      } catch (e) {
        // Ignore file write errors
      }
    }
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: Record<string, any>, stack?: string): void {
    this.log(LogLevel.ERROR, message, context);
    if (stack) {
      this.entries[this.entries.length - 1].stack = stack;
    }
  }

  fatal(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.FATAL, message, context);
  }

  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
  }
}

// ============================================
// error-handler: 에러 처리
// ============================================

interface ErrorContext {
  code?: string;
  status?: number;
  cause?: Error;
  context?: Record<string, any>;
}

class AppError extends Error {
  code: string;
  status: number;
  context?: Record<string, any>;

  constructor(message: string, config: ErrorContext = {}) {
    super(message);
    this.code = config.code ?? 'UNKNOWN_ERROR';
    this.status = config.status ?? 500;
    this.context = config.context;
    this.name = 'AppError';
  }
}

class ErrorHandler {
  private logger: Logger | null = null;
  private errorListeners: Array<(error: AppError) => void> = [];

  setLogger(logger: Logger): void {
    this.logger = logger;
  }

  catch(error: Error | string, config: ErrorContext = {}): AppError {
    const appError = error instanceof AppError ? error : new AppError(String(error), config);

    if (this.logger) {
      this.logger.error(appError.message, appError.context, appError.stack);
    }

    // Call listeners
    for (const listener of this.errorListeners) {
      try {
        listener(appError);
      } catch (e) {
        // Ignore listener errors
      }
    }

    return appError;
  }

  handle(error: Error | string, config: ErrorContext = {}): AppError {
    return this.catch(error, config);
  }

  wrap<T>(fn: () => T, config: ErrorContext = {}): T | null {
    try {
      return fn();
    } catch (error) {
      this.catch(error as Error, config);
      return null;
    }
  }

  async wrapAsync<T>(fn: () => Promise<T>, config: ErrorContext = {}): Promise<T | null> {
    try {
      return await fn();
    } catch (error) {
      this.catch(error as Error, config);
      return null;
    }
  }

  on(listener: (error: AppError) => void): void {
    this.errorListeners.push(listener);
  }

  off(listener: (error: AppError) => void): void {
    const idx = this.errorListeners.indexOf(listener);
    if (idx > -1) {
      this.errorListeners.splice(idx, 1);
    }
  }
}

// ============================================
// Register builtin functions
// ============================================

const loggerInstances = new Map<string, Logger>();
const errorHandlerInstance = new ErrorHandler();

registerBuiltinFunction('logger_create', (config: any = {}) => {
  const logger = new Logger(config);
  const id = `logger_${Date.now()}_${Math.random()}`;
  loggerInstances.set(id, logger);
  return id;
});

registerBuiltinFunction('logger_debug', (loggerId: string, message: string, context?: any) => {
  const logger = loggerInstances.get(loggerId);
  if (logger) logger.debug(message, context);
});

registerBuiltinFunction('logger_info', (loggerId: string, message: string, context?: any) => {
  const logger = loggerInstances.get(loggerId);
  if (logger) logger.info(message, context);
});

registerBuiltinFunction('logger_warn', (loggerId: string, message: string, context?: any) => {
  const logger = loggerInstances.get(loggerId);
  if (logger) logger.warn(message, context);
});

registerBuiltinFunction('logger_error', (loggerId: string, message: string, context?: any) => {
  const logger = loggerInstances.get(loggerId);
  if (logger) logger.error(message, context);
});

registerBuiltinFunction('logger_fatal', (loggerId: string, message: string, context?: any) => {
  const logger = loggerInstances.get(loggerId);
  if (logger) logger.fatal(message, context);
});

registerBuiltinFunction('logger_entries', (loggerId: string) => {
  const logger = loggerInstances.get(loggerId);
  return logger ? logger.getEntries() : [];
});

registerBuiltinFunction('error_handler_catch', (error: any, config: any = {}) => {
  return errorHandlerInstance.catch(error, config);
});

registerBuiltinFunction('error_handler_wrap', (fn: any, config: any = {}) => {
  if (typeof fn !== 'function') {
    return errorHandlerInstance.catch('Invalid function', config);
  }
  return errorHandlerInstance.wrap(fn, config);
});

export { Logger, ErrorHandler, AppError, LogLevel };
