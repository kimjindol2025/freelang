/**
 * Phase 24: IDE Integration Complete - Main Index
 *
 * 3가지 핵심 모듈:
 * 1. Debugger Provider - DAP (Debug Adapter Protocol)
 * 2. Profiler UI - Performance visualization
 * 3. VS Code Extension - Complete IDE integration
 */

export * from './lsp/debugger-provider';
export * from './profiler-ui/profiler-ui';
export * from './vscode-extension';

import { DebuggerProvider } from './lsp/debugger-provider';
import { ProfilerUI } from './profiler-ui/profiler-ui';
import { VSCodeExtension } from './vscode-extension';

/**
 * IDE Integration 시스템 초기화
 */
export class IDEIntegration {
  debugger: DebuggerProvider;
  profilerUI: ProfilerUI;
  extension: VSCodeExtension;

  constructor() {
    this.debugger = new DebuggerProvider();
    this.profilerUI = new ProfilerUI();
    this.extension = new VSCodeExtension({
      version: '1.0.0',
      debugMode: false,
      profilerEnabled: true
    });

    this.setupIntegration();
  }

  /**
   * IDE 통합 설정
   */
  private setupIntegration(): void {
    // Debugger와 Profiler 연동
    this.debugger.on('stopped', () => {
      // 중단시 Profiler UI 업데이트
      this.profilerUI.show();
    });

    // Extension과 Debugger 연동
    this.extension.on('command-registered', (cmd) => {
      if (cmd.id === 'freelang.debug') {
        this.debugger.initialize();
      }
    });
  }

  /**
   * IDE 활성화
   */
  activate(): void {
    this.extension.activate();
    console.log('IDE Integration activated');
  }

  /**
   * IDE 비활성화
   */
  deactivate(): void {
    this.extension.deactivate();
    this.debugger.terminate();
    this.profilerUI.hide();
    console.log('IDE Integration deactivated');
  }

  /**
   * 전체 상태 리포트
   */
  getStatus() {
    return {
      extension: this.extension.getState(),
      debugger: this.debugger.getState(),
      profilerUI: this.profilerUI.getState()
    };
  }
}

export const ideIntegration = new IDEIntegration();

export default ideIntegration;
