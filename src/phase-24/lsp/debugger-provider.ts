/**
 * Phase 24: LSP Debugger Provider
 * Implements Debug Adapter Protocol for FreeLang
 *
 * 기능:
 * - Breakpoint 관리
 * - Stack trace 추적
 * - Variable inspection
 * - Step over/into/out
 */

import { EventEmitter } from 'events';

export enum DebugEventType {
  STOPPED = 'stopped',
  CONTINUED = 'continued',
  THREAD = 'thread',
  OUTPUT = 'output',
  BREAKPOINT = 'breakpoint',
  MODULE = 'module',
  PROCESS = 'process'
}

export enum StoppedReason {
  STEP = 'step',
  BREAKPOINT = 'breakpoint',
  EXCEPTION = 'exception',
  PAUSE = 'pause',
  ENTRY = 'entry',
  GOTO = 'goto',
  FUNCTION_BREAKPOINT = 'function breakpoint',
  DATA_BREAKPOINT = 'data breakpoint',
  INSTRUCTION_BREAKPOINT = 'instruction breakpoint'
}

export interface Breakpoint {
  id: number;
  source: string;
  line: number;
  column?: number;
  verified: boolean;
  message?: string;
  condition?: string;
  hitCondition?: string;
}

export interface StackFrame {
  id: number;
  name: string;
  source: string;
  line: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  moduleId?: string | number;
  presentationHint?: 'normal' | 'label' | 'subtle';
}

export interface Variable {
  name: string;
  value: string;
  type?: string;
  variablesReference?: number;
  presentationHint?: {
    kind?: 'property' | 'method' | 'class' | 'data' | 'event';
    visibility?: 'public' | 'private' | 'protected' | 'internal';
  };
}

export class DebuggerProvider extends EventEmitter {
  private breakpoints: Map<string, Breakpoint[]> = new Map();
  private breakpointId = 0;
  private threads: Map<number, any> = new Map();
  private stackFrames: StackFrame[] = [];
  private variables: Map<number, Variable[]> = new Map();
  private isRunning = false;

  constructor() {
    super();
  }

  /**
   * 디버그 세션 시작
   */
  initialize(): void {
    this.isRunning = true;
    this.emit(DebugEventType.PROCESS, { startMethod: 'launch', isLocalProcess: true });
  }

  /**
   * Breakpoint 설정
   */
  setBreakpoints(source: string, lines: number[]): Breakpoint[] {
    const breakpoints: Breakpoint[] = [];

    for (const line of lines) {
      const bp: Breakpoint = {
        id: ++this.breakpointId,
        source,
        line,
        verified: true
      };
      breakpoints.push(bp);

      if (!this.breakpoints.has(source)) {
        this.breakpoints.set(source, []);
      }
      this.breakpoints.get(source)!.push(bp);
    }

    this.emit(DebugEventType.BREAKPOINT, { reason: 'new', breakpoint: breakpoints[0] });
    return breakpoints;
  }

  /**
   * Breakpoint 제거
   */
  removeBreakpoints(source: string, lines: number[]): void {
    const bps = this.breakpoints.get(source) || [];
    this.breakpoints.set(source, bps.filter(bp => !lines.includes(bp.line)));
  }

  /**
   * Breakpoint 조건 설정
   */
  setConditionalBreakpoint(source: string, line: number, condition: string): Breakpoint {
    const bps = this.breakpoints.get(source) || [];
    const bp = bps.find(b => b.line === line);

    if (bp) {
      bp.condition = condition;
    }

    return bp!;
  }

  /**
   * 실행 중단 (breakpoint 또는 pause)
   */
  stop(reason: StoppedReason, threadId: number = 1): void {
    this.isRunning = false;
    this.emit(DebugEventType.STOPPED, {
      reason,
      threadId,
      allThreadsStopped: true
    });
  }

  /**
   * 실행 재개
   */
  continue(threadId: number = 1): void {
    this.isRunning = true;
    this.emit(DebugEventType.CONTINUED, { threadId, allThreadsContinued: true });
  }

  /**
   * Step over
   */
  stepOver(threadId: number = 1): void {
    this.stop(StoppedReason.STEP, threadId);
  }

  /**
   * Step into
   */
  stepInto(threadId: number = 1): void {
    this.stop(StoppedReason.STEP, threadId);
  }

  /**
   * Step out
   */
  stepOut(threadId: number = 1): void {
    this.stop(StoppedReason.STEP, threadId);
  }

  /**
   * Stack trace 조회
   */
  getStackTrace(threadId: number = 1, startFrame: number = 0, levels: number = 20): StackFrame[] {
    return this.stackFrames.slice(startFrame, startFrame + levels);
  }

  /**
   * Stack frame 추가
   */
  addStackFrame(frame: StackFrame): void {
    this.stackFrames.push(frame);
  }

  /**
   * 변수 조회
   */
  getVariables(variablesReference: number): Variable[] {
    return this.variables.get(variablesReference) || [];
  }

  /**
   * 변수 설정
   */
  setVariable(name: string, value: string, variablesReference: number): Variable {
    const vars = this.variables.get(variablesReference) || [];
    let variable = vars.find(v => v.name === name);

    if (!variable) {
      variable = { name, value };
      vars.push(variable);
      this.variables.set(variablesReference, vars);
    } else {
      variable.value = value;
    }

    return variable;
  }

  /**
   * 디버그 세션 종료
   */
  terminate(): void {
    this.isRunning = false;
    this.breakpoints.clear();
    this.threads.clear();
    this.stackFrames = [];
    this.variables.clear();
  }

  /**
   * 상태 조회
   */
  getState() {
    return {
      isRunning: this.isRunning,
      breakpointCount: Array.from(this.breakpoints.values()).reduce((sum, bps) => sum + bps.length, 0),
      stackDepth: this.stackFrames.length,
      variableCount: this.variables.size
    };
  }
}

export const debugger = new DebuggerProvider();

export default debugger;
