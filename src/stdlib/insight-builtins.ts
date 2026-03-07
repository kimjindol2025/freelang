/**
 * FreeLang v2 - Insight Builtin Functions
 *
 * @monitor 어노테이션이 붙은 함수에 컴파일러가 자동 주입하는 빌트인.
 * VM의 CALL 명령어를 통해 호출됨.
 *
 * 등록 함수 목록 (9개):
 *   insight_enter(fnName)         - 함수 진입 기록
 *   insight_exit(fnName)          - 함수 종료 + 측정
 *   insight_report()              - 터미널 리포트 출력
 *   insight_json()                - JSON 리포트 반환 (string)
 *   insight_start_dashboard(port) - 내장 HTTP 대시보드 시작
 *   insight_stop_dashboard()      - 대시보드 중지
 *   insight_enable()              - 모니터링 활성화
 *   insight_disable()             - 모니터링 비활성화
 *   insight_send_gogs(url, token) - Gogs에 리포트 전송
 */

import { NativeFunctionRegistry } from '../vm/native-function-registry';
import { InsightEngine } from '../runtime/insight-engine';

export function registerInsightFunctions(registry: NativeFunctionRegistry): void {
  const engine = InsightEngine.instance;

  registry.register({
    name: 'insight_enter',
    module: 'insight',
    executor: (args) => {
      engine.enter(String(args[0] ?? 'unknown'));
      return null;
    }
  });

  registry.register({
    name: 'insight_exit',
    module: 'insight',
    executor: (args) => {
      engine.exit(String(args[0] ?? 'unknown'));
      return null;
    }
  });

  registry.register({
    name: 'insight_report',
    module: 'insight',
    executor: (_args) => {
      engine.printReport();
      return null;
    }
  });

  registry.register({
    name: 'insight_json',
    module: 'insight',
    executor: (_args) => {
      return JSON.stringify(engine.toJSON(), null, 2);
    }
  });

  registry.register({
    name: 'insight_start_dashboard',
    module: 'insight',
    executor: (args) => {
      const port = typeof args[0] === 'number' ? args[0] : 9999;
      engine.startDashboard(port);
      return port;
    }
  });

  registry.register({
    name: 'insight_stop_dashboard',
    module: 'insight',
    executor: (_args) => {
      engine.stopDashboard();
      return null;
    }
  });

  registry.register({
    name: 'insight_enable',
    module: 'insight',
    executor: (_args) => {
      engine.enable();
      return null;
    }
  });

  registry.register({
    name: 'insight_disable',
    module: 'insight',
    executor: (_args) => {
      engine.disable();
      return null;
    }
  });

  registry.register({
    name: 'insight_send_gogs',
    module: 'insight',
    executor: (args) => {
      const url   = String(args[0] ?? '');
      const token = String(args[1] ?? '');
      if (!url) return 'error:no_url';
      engine.sendToGogs(url, token).catch(() => {});
      return 'sent';
    }
  });
}
