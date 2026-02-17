# FreeLang 아키텍처

## 개요

```
┌─────────────────────────────────────┐
│         Master Process              │
│  • Event Loop (libuv)               │
│  • Load Balancer (Round-robin)      │
│  • Health Checker (10초)            │
│  • Self-Healer (13가지 조치)        │
│  • Alert Manager (Email/Slack)      │
└──────────┬──────────────────────────┘
           │ IPC (Unix Socket)
      ┌────┼────┬─────┬─────┐
      │    │    │     │     │
      ▼    ▼    ▼     ▼     ▼
    [W1][W2][W3][W4][W5][W6][W7][W8]
    
Worker Features:
• Shared-Nothing (메모리 격리)
• HTTP/HTTPS 처리
• 자동 재시작 (3초)
• Graceful shutdown
```

## 핵심 계층

### 1. Event Loop (libuv)
- select() 기반 I/O multiplexing
- Timer 관리
- File I/O 비동기화
- Network socket handling

### 2. Worker Model
- Master process: 로드 밸런싱, 모니터링
- Worker processes: 실제 요청 처리
- IPC: Unix domain socket

### 3. 모니터링 계층
- **Health Checker**: 10초 주기 스캔
  - CPU, Memory, Error Rate, Response Time
  - Worker 상태, 파일 디스크립터
- **Self-Healer**: 13가지 자동 조치
  - 메모리 정리, Worker 재시작
  - Circuit breaker, Rate limiting
- **Alert System**: Email, Slack 알림

### 4. 신뢰성 기능
- **Chaos Engineering**: 테스트된 복구
- **Long Soak**: 메모리 누수 검증
- **Network Chaos**: 네트워크 장애 복구
- **Alert Accuracy**: 100% 정확 경고

## 성능 특성

| 메트릭 | 값 |
|--------|-----|
| RPS | 60,000+ |
| p99 Latency | < 100ms |
| Memory/worker | 15-20MB |
| 무중단 재시작 | 99%+ |

---

자세한 내용은 [docs/](docs/) 참조
