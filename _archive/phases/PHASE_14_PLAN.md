# Phase 14: Real-time WebSocket Updates (Optional)

**Status**: Planning
**Duration**: 4-5 days
**Goal**: Replace 60-second polling with instant WebSocket updates
**Benefit**: User experience improvement + Server load reduction

---

## 1. Current State (Phase 13 완료)

### Dashboard 현재 방식
```javascript
// public/dashboard.html - 매 60초마다 전체 데이터 리로드
function loadData() {
  // API 호출 (7개 엔드포인트 병렬)
  // 데이터 처리
  // DOM 업데이트 + Chart.js 재렌더링
  // 다시 60초 대기...
}

setInterval(loadData, 60000);
```

### 문제점
- ❌ 60초 레이턴시: 최대 59초 지연
- ❌ 불필요한 폴링: 데이터 변화 없어도 요청
- ❌ 서버 부하: 초당 전체 클라이언트 요청
- ❌ 네트워크 대역폭: 초당 7개 API × N 클라이언트
- ❌ 배터리 소모: 모바일에서 지속 요청

---

## 2. Phase 14 아키텍처

### WebSocket 통신 구조
```
Client (브라우저)
    ↓ WebSocket 연결
Server (Node.js/Express)
    ├─ /ws (WebSocket 핸들러)
    ├─ PhaseUpdater (변경 감지)
    └─ Broadcaster (모든 클라이언트에 전송)

Events:
- "stats" (10초): 통계 업데이트
- "trends" (60초): 신뢰도 추이
- "confidence-report" (변화 시): 보고서
- "top-movers" (변화 시): 상위 변동
- "categories" (변화 시): 카테고리
```

### 폴백 전략 (WebSocket 미지원)
```javascript
if (WebSocket 미지원) {
  console.warn('WebSocket unavailable, fallback to polling');
  setInterval(loadData, 60000); // 기존 폴링 유지
}
```

---

## 3. Implementation Plan (4-5 days)

### Day 1: WebSocket 기반 구조 (4h)
**파일**: `src/dashboard/websocket-server.ts`

```typescript
import WebSocket from 'ws';
import express from 'express';

class DashboardWebSocketServer {
  private wss: WebSocket.Server;
  private clients: Set<WebSocket> = new Set();
  private lastData: DashboardData = {};
  private updateInterval: NodeJS.Timeout;

  constructor(server: http.Server) {
    this.wss = new WebSocket.Server({ server, path: '/ws' });
    this.setupHandlers();
    this.startUpdateLoop();
  }

  private setupHandlers() {
    this.wss.on('connection', (ws) => {
      this.clients.add(ws);

      // 초기 데이터 전송
      ws.send(JSON.stringify({
        type: 'initial',
        data: this.lastData
      }));

      ws.on('close', () => {
        this.clients.delete(ws);
      });
    });
  }

  private startUpdateLoop() {
    this.updateInterval = setInterval(async () => {
      const newData = await this.fetchDashboardData();

      // 변화 감지
      if (this.hasChanged(this.lastData, newData)) {
        this.broadcast({
          type: 'update',
          timestamp: Date.now(),
          data: newData
        });
        this.lastData = newData;
      }
    }, 10000); // 10초마다 확인
  }

  private broadcast(message: any) {
    this.clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }
}
```

**LOC**: 180
**성과**: WebSocket 서버 기본 구조 완성

---

### Day 2: Client-side WebSocket (4h)
**파일**: `public/dashboard.html` (수정)

```javascript
class DashboardWebSocketClient {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('✅ WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'initial') {
        this.handleInitialData(message.data);
      } else if (message.type === 'update') {
        this.handleUpdate(message.data);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.fallbackToPolling();
    };

    this.ws.onclose = () => {
      console.warn('WebSocket disconnected, attempting reconnect...');
      this.attemptReconnect();
    };
  }

  handleUpdate(data) {
    // DOM 부분 업데이트 (전체 리로드 대신)
    if (data.stats) updateStatsDOM(data.stats);
    if (data.trends) updateConfidenceTrends(data.trends);
    if (data.report) updateConfidenceHeatmap(data.report);
    if (data.movers) updateTopMoversChart(data.movers);
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
      setTimeout(() => this.connect(), delay);
      this.reconnectAttempts++;
    } else {
      this.fallbackToPolling();
    }
  }

  fallbackToPolling() {
    console.warn('Max reconnect attempts reached, using polling');
    setInterval(loadData, 60000);
  }
}

// 시작
const wsClient = new DashboardWebSocketClient();
wsClient.connect();
```

**LOC**: 120
**성과**: 클라이언트 WebSocket 구현 + 자동 재연결

---

### Day 3: 데이터 변화 감지 (3h)
**파일**: `src/dashboard/data-change-detector.ts`

```typescript
class DataChangeDetector {
  // 상태 비교 최적화
  hasChanged(oldData: DashboardData, newData: DashboardData): boolean {
    return (
      this.statsChanged(oldData.stats, newData.stats) ||
      this.trendsChanged(oldData.trends, newData.trends) ||
      this.reportChanged(oldData.report, newData.report) ||
      this.moversChanged(oldData.movers, newData.movers)
    );
  }

  // 각 섹션별 감지
  private statsChanged(old: any, new: any): boolean {
    if (!old || !new) return true;
    return old.total_patterns !== new.total_patterns ||
           old.avg_confidence !== new.avg_confidence;
  }

  // 세부 구현...
}
```

**LOC**: 100
**성과**: 효율적인 변화 감지 알고리즘

---

### Day 4: 테스트 + 성능 검증 (4h)
**파일**: `tests/phase-14-websocket.test.ts`

```typescript
describe('Phase 14: WebSocket Real-time Updates', () => {
  test('should establish WebSocket connection', async () => {
    // 연결 테스트
  });

  test('should send initial data on connect', async () => {
    // 초기 데이터 전송 검증
  });

  test('should broadcast updates to all clients', async () => {
    // 브로드캐스트 테스트
  });

  test('should fallback to polling on WebSocket failure', async () => {
    // 폴백 메커니즘 검증
  });

  test('should handle reconnection with exponential backoff', async () => {
    // 자동 재연결 테스트
  });

  test('performance: update latency <100ms', async () => {
    // 지연 시간 < 100ms 검증
  });

  test('performance: memory overhead <10MB', async () => {
    // 메모리 오버헤드 검증
  });
});
```

**테스트**: 8개
**성과**: 모든 시나리오 검증

---

### Day 5: 문서화 + 배포 준비 (3h)
**파일**: `PHASE_14_COMPLETION_REPORT.md`

```markdown
# Phase 14: Real-time WebSocket Updates - Completion Report

## Summary
✅ WebSocket 서버/클라이언트 완성
✅ 자동 재연결 + 폴백 메커니즘
✅ 8개 단위 테스트 통과
✅ 지연 시간 <100ms 달성
✅ 메모리 오버헤드 <5MB

## Performance Improvement
- 이전: 60초 폴링 (최대 59초 지연)
- 현재: 실시간 WebSocket (평균 50ms 지연)
- 개선율: **1,180배 빠름** ⚡

## Backward Compatibility
- ✅ WebSocket 미지원 브라우저: 자동 폴링 폴백
- ✅ 기존 API 엔드포인트: 그대로 유지
- ✅ Phase 12/13 차트: 그대로 동작
```

---

## 4. 성공 기준

- ✅ WebSocket 연결 성공률 >99%
- ✅ 업데이트 지연 <100ms
- ✅ 8/8 테스트 통과
- ✅ 메모리 오버헤드 <5MB per connection
- ✅ 폴백 메커니즘 동작
- ✅ 모든 브라우저 호환 (IE11 제외)

---

## 5. 예상 결과

### 사용자 경험
```
Before (Phase 13):
- 데이터 변화 → 59초 대기 → UI 업데이트 😞

After (Phase 14):
- 데이터 변화 → 50ms 내 UI 업데이트 ⚡
```

### 서버 부하
```
Before: 100 clients × 7 API/min = 700 req/min
After: 100 clients × 0.1 API/min = 10 req/min (-98.6%)
```

### 대역폭
```
Before: 100 clients × 50KB/min = 5MB/min
After: 100 clients × 5KB/min = 500KB/min (-90%)
```

---

## 6. 파일 변경 요약

| 파일 | 변경 | 내용 |
|------|------|------|
| `src/dashboard/websocket-server.ts` | NEW | WebSocket 서버 (180 LOC) |
| `public/dashboard.html` | MODIFY | WebSocket 클라이언트 (120 LOC) |
| `src/dashboard/data-change-detector.ts` | NEW | 변화 감지 (100 LOC) |
| `tests/phase-14-websocket.test.ts` | NEW | 8개 테스트 (300+ LOC) |
| `PHASE_14_COMPLETION_REPORT.md` | NEW | 완료 보고서 |

**총 추가 LOC**: ~700

---

## 7. 타임라인

| Day | Task | Expected LOC | Duration |
|-----|------|-------------|----------|
| 1 | WebSocket Server | 180 | 4h |
| 2 | Client Integration | 120 | 4h |
| 3 | Change Detection | 100 | 3h |
| 4 | Testing | 300+ | 4h |
| 5 | Documentation | 200+ | 3h |
| **Total** | | **~700** | **18h** |

---

## 8. 다음 단계

### Phase 14 완료 후
1. ✅ npm publish → v2.2.0
2. ✅ KPM 등록
3. ✅ 공식 문서 (영문)

### 향후 (Phase 15+)
- Phase 15: Advanced Analytics (시계열 분석, 이상 탐지)
- Phase 16: Enterprise Features (RBAC, 감사 로깅)
- Phase 17: Distributed System (멀티 대시보드, 클러스터)

---

**Status**: Ready to Start ✅
**Next Command**: "Phase 14 시작해"

