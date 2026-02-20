/**
 * Phase 24: IDE Integration - Comprehensive Tests
 *
 * 테스트:
 * 1. Debugger Provider
 * 2. Profiler UI
 * 3. VS Code Extension
 * 4. Integration
 */

import {
  DebuggerProvider,
  StoppedReason,
  ProfilerUI,
  VSCodeExtension,
  IDEIntegration
} from '../src/phase-24/index';

describe('Phase 24: IDE Integration', () => {
  describe('Debugger Provider', () => {
    let debugger: DebuggerProvider;

    beforeEach(() => {
      debugger = new DebuggerProvider();
    });

    test('should initialize debugger', () => {
      debugger.initialize();
      const state = debugger.getState();
      expect(state.isRunning).toBe(true);
    });

    test('should set breakpoints', () => {
      const bps = debugger.setBreakpoints('test.free', [10, 20, 30]);
      expect(bps.length).toBe(3);
      expect(bps[0].verified).toBe(true);
    });

    test('should remove breakpoints', () => {
      debugger.setBreakpoints('test.free', [10, 20]);
      debugger.removeBreakpoints('test.free', [10]);
      
      const state = debugger.getState();
      expect(state.breakpointCount).toBe(1);
    });

    test('should set conditional breakpoint', () => {
      debugger.setBreakpoints('test.free', [10]);
      const bp = debugger.setConditionalBreakpoint('test.free', 10, 'x > 5');
      expect(bp.condition).toBe('x > 5');
    });

    test('should handle stepping', () => {
      debugger.initialize();
      debugger.stepOver();
      const state = debugger.getState();
      expect(state.isRunning).toBe(false);
    });

    test('should manage stack frames', () => {
      debugger.addStackFrame({
        id: 1,
        name: 'main',
        source: 'test.free',
        line: 10
      });

      const frames = debugger.getStackTrace(1, 0, 10);
      expect(frames.length).toBe(1);
    });

    test('should manage variables', () => {
      debugger.setVariable('x', '42', 1);
      const vars = debugger.getVariables(1);
      expect(vars[0].value).toBe('42');
    });
  });

  describe('Profiler UI', () => {
    let profilerUI: ProfilerUI;

    beforeEach(() => {
      profilerUI = new ProfilerUI();
    });

    test('should show/hide UI', () => {
      profilerUI.show();
      expect(profilerUI.getState().isVisible).toBe(true);
      
      profilerUI.hide();
      expect(profilerUI.getState().isVisible).toBe(false);
    });

    test('should update performance metrics', () => {
      profilerUI.updatePerformanceMetrics([
        {
          functionName: 'func1',
          duration: 100,
          callCount: 5,
          averageTime: 20,
          percentage: 50
        }
      ]);

      expect(profilerUI.getState().metricsCount).toBe(1);
    });

    test('should track memory timeline', () => {
      profilerUI.updateMemoryTimeline({
        timestamp: Date.now(),
        heapUsed: 50000000,
        heapTotal: 100000000,
        external: 1000000
      });

      expect(profilerUI.getState().memoryPoints).toBe(1);
    });

    test('should generate flame graph', () => {
      profilerUI.updatePerformanceMetrics([
        {
          functionName: 'test',
          duration: 50,
          callCount: 1,
          averageTime: 50,
          percentage: 100
        }
      ]);

      const graph = profilerUI.generateFlameGraph();
      expect(graph).toContain('<svg');
      expect(graph).toContain('test');
    });

    test('should export data', () => {
      profilerUI.updatePerformanceMetrics([
        {
          functionName: 'fn',
          duration: 10,
          callCount: 1,
          averageTime: 10,
          percentage: 100
        }
      ]);

      const json = profilerUI.export('json');
      expect(json).toContain('metrics');

      const csv = profilerUI.export('csv');
      expect(csv).toContain('fn,10');

      const html = profilerUI.export('html');
      expect(html).toContain('<!DOCTYPE html');
    });
  });

  describe('VS Code Extension', () => {
    let extension: VSCodeExtension;

    beforeEach(() => {
      extension = new VSCodeExtension();
    });

    test('should activate extension', () => {
      extension.activate();
      const state = extension.getState();
      expect(state.activated).toBe(true);
    });

    test('should register commands', () => {
      extension.activate();
      const state = extension.getState();
      expect(state.commandCount).toBeGreaterThan(0);
    });

    test('should provide completions', () => {
      const completions = extension.provideCompletions('', { line: 0, char: 0 });
      expect(completions.length).toBeGreaterThan(0);
      expect(completions).toContain('fn');
      expect(completions).toContain('let');
    });

    test('should provide hover information', () => {
      const hover = extension.provideHover('', { line: 0, char: 0 });
      expect(hover).toBeTruthy();
    });

    test('should provide definition', () => {
      const def = extension.provideDefinition('', { line: 0, char: 0 });
      expect(def).toBeDefined();
      expect(def.uri).toBeTruthy();
    });

    test('should manage config', () => {
      const config = extension.getConfig();
      expect(config.enabled).toBe(true);

      extension.updateConfig({ debugMode: true });
      expect(extension.getConfig().debugMode).toBe(true);
    });

    test('should deactivate extension', () => {
      extension.activate();
      extension.deactivate();
      expect(extension.getState().activated).toBe(false);
    });
  });

  describe('IDE Integration', () => {
    let ide: IDEIntegration;

    beforeEach(() => {
      ide = new IDEIntegration();
    });

    test('should initialize all components', () => {
      expect(ide.debugger).toBeDefined();
      expect(ide.profilerUI).toBeDefined();
      expect(ide.extension).toBeDefined();
    });

    test('should activate IDE', () => {
      ide.activate();
      const status = ide.getStatus();
      expect(status.extension.activated).toBe(true);
    });

    test('should provide full status', () => {
      const status = ide.getStatus();
      expect(status.extension).toBeDefined();
      expect(status.debugger).toBeDefined();
      expect(status.profilerUI).toBeDefined();
    });

    test('should deactivate IDE', () => {
      ide.activate();
      ide.deactivate();
      const status = ide.getStatus();
      expect(status.extension.activated).toBe(false);
    });
  });

  describe('Integration Workflow', () => {
    test('should handle complete debugging session', () => {
      const ide = new IDEIntegration();
      
      // 1. IDE 활성화
      ide.activate();
      
      // 2. 디버거 초기화
      ide.debugger.initialize();
      
      // 3. Breakpoint 설정
      ide.debugger.setBreakpoints('main.free', [10, 20]);
      
      // 4. 실행 시작
      ide.debugger.continue();
      
      // 5. Profiler UI 표시
      ide.profilerUI.show();
      
      // 6. 성능 메트릭 업데이트
      ide.profilerUI.updatePerformanceMetrics([
        {
          functionName: 'main',
          duration: 100,
          callCount: 1,
          averageTime: 100,
          percentage: 100
        }
      ]);
      
      const status = ide.getStatus();
      expect(status.debugger.isRunning).toBe(true);
      expect(status.profilerUI.isVisible).toBe(true);
      
      // 7. IDE 종료
      ide.deactivate();
    });
  });
});
