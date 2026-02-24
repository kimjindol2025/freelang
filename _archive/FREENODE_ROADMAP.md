# 🚀 FreeNode (가칭) 구축 로드맵

## 비전

**Node.js = V8 + libuv**라는 성공 공식에서 영감을 받아:

**FreeNode = FreeLang + libuv**

우리는 FreeLang의 우아한 문법과 libuv의 강력한 비동기 I/O를 결합하여, **완전히 새로운 비동기 런타임 생태계**를 구축합니다.

---

## 📊 5단계 로드맵

### **Stage 1: 커뮤니케이션 최적화 (Phase 15 - 현재 진행 중)**

**목표**: 전송 효율 76% 향상

#### 핵심 기술
- **배칭 (Batching)**: 여러 이벤트를 한 번에 묶어 전송
- **압축 (Gzip)**: 전송 데이터 크기 감소
- **델타 업데이트 (Delta Sync)**: 변경분만 전송

#### 기대 성과
```
동일 대역폭에서 Node.js보다 4배 더 많은 클라이언트 수용
1Mbps: Node.js 50명 → FreeNode 200명
```

#### 구현 항목
- [ ] HTTP/2 Server Push 구현
- [ ] 메시지 배칭 엔진
- [ ] Gzip 압축 미들웨어
- [ ] 델타 업데이트 프로토콜

#### 증명 방법
```bash
wrk로 동시 연결 수 비교
- Node.js: X req/s
- FreeNode: 4X req/s (동일 대역폭)
```

---

### **Stage 2: FreeLang 비동기 표준 라이브러리 (Phase 16)**

**목표**: FreeLang에서 서버를 직접 작성 가능하게 함

#### 핵심 기술
- **libuv Native Binding**: FreeLang에서 C 라이브러리 직접 호출
- **프리랭 문법 기반 async/await**: 우리만의 비동기 제어 구문

#### 구현 모듈

##### 1. **net 모듈** (네트워킹)
```freelang
// FreeLang으로 서버 작성 예시
fn main() {
  let server = net.createServer(|conn| {
    conn.write("Hello\n")
  })
  server.listen(3000)
}
```

**구현 내용**:
- TCP/UDP 소켓 래핑
- DNS 해석
- 연결 풀 관리

##### 2. **fs 모듈** (파일 I/O)
```freelang
fn main() {
  fs.readFile("/path/to/file", |err, data| {
    if err { panic(err) }
    println(data)
  })
}
```

**구현 내용**:
- 비동기 파일 읽기/쓰기
- 디렉토리 순회
- 파일 감시 (watch)

##### 3. **timer 모듈** (타이머)
```freelang
fn main() {
  setTimeout(|| println("1초 후"), 1000)
  setInterval(|| println("반복"), 2000)
}
```

**구현 내용**:
- setTimeout / setInterval
- requestAnimationFrame (비유적)
- 고해상도 타이머

#### 기대 성과
```
Node.js 코드를 FreeLang으로 직접 변환 가능
동일 성능, 더 간단한 문법
```

---

### **Stage 3: KPM 생태계 확장 (Phase 17)**

**목표**: npm처럼 모든 코드를 재사용 가능하게 함

#### KPM (Kim Package Manager)

현재 상태:
- **패키지 수**: 9,640개
- **저장소**: /home/kimjin/kpm-registry/registry.json

확장 계획:
- **의존성 해석**: package.json → 자동 설치
- **버전 관리**: Semantic Versioning 지원
- **Gogs 연동**: 저장소 자동 등록

#### 구현 항목
- [ ] KPM CLI v2.0 (의존성 해석 엔진)
- [ ] package.json 파서
- [ ] 버전 충돌 해결 알고리즘
- [ ] 캐시 관리 시스템

#### KPM 사용 예시
```bash
# 패키지 설치
kpm install @freelang/http @freelang/fs

# 프로젝트 초기화
kpm init my-server
```

#### 기대 성과
```
9,640개 패키지를 모두 FreeLang에서 사용 가능
npm 에코시스템의 절반을 차지할 수 있음
```

---

### **Stage 4: 멀티 프로세스 클러스터링 (Phase 18)**

**목표**: CPU 모든 코어를 활용하는 엔터프라이즈급 안정성

#### 핵심 아키텍처

```
┌─────────────────────────────────┐
│     Master Process              │
│  (프로세스 관리, 로드 밸런싱)    │
└──┬────────────────────────────┬─┘
   │                            │
   ▼                            ▼
┌─────────────┐        ┌─────────────┐
│ Worker 1    │        │ Worker N    │
│ (코어 1)    │   ...  │ (코어 N)    │
└──────┬──────┘        └──────┬──────┘
       │                      │
       └──────────┬───────────┘
                  │
              ┌───▼────┐
              │ Shared │
              │ Memory │
              └────────┘
```

#### libuv 함수 활용
```c
// uv_spawn을 사용한 프로세스 생성
uv_process_t child_req;
uv_process_options_t options = {0};
options.file = "worker.js";
uv_spawn(loop, &child_req, &options);

// IPC를 통한 프로세스 간 통신
uv_write(req, stream, &buf, 1, NULL);
```

#### 구현 항목
- [ ] Master 프로세스 구현
- [ ] Worker 풀 관리
- [ ] IPC (Inter-Process Communication)
- [ ] Load Balancer (라운드 로빈)
- [ ] 자동 재시작 (크래시 감지)

#### 기대 성과
```
10ms 주기의 수집 작업을 수백 개 코어에 분산 처리
단일 코어 -> 16코어 = 16배 처리량
```

#### 사용 예시
```freelang
// cluster.js
fn main() {
  let cluster = require("cluster")

  if cluster.isMaster() {
    // 4개 워커 시작
    for i in 0..4 {
      cluster.fork()
    }
  } else {
    // 워커 프로세스 (실제 서버)
    let app = createApp()
    app.listen(3000)
  }
}
```

---

### **Stage 5: 통합 대시보드 & Self-Healing 시스템 (Phase 19-20)**

**목표**: pm2 없이도 스스로 살아나는 시스템

#### 아키텍처

```
┌──────────────────────────────────┐
│   FreeNode Runtime              │
│   (자가 치유 시스템)             │
├──────────────────────────────────┤
│ • Health Check (10초 주기)       │
│ • 프로세스 재시작 (자동)          │
│ • 메모리 모니터링                 │
│ • CPU throttling                │
└──────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│   TUI Monitor                    │
│   (실시간 대시보드)              │
├──────────────────────────────────┤
│ [운영] [메트릭] [로그] [알림]   │
│                                  │
│ RPS: 16,937 req/s ▁▂▃▄▅▆▇▇▆   │
│ MEM: 45MB / 512MB [████░░░░░░]  │
│ CPU: 75% [███████░░░░░░░░░░░░]  │
│                                  │
│ 🟢 Worker 1: OK                  │
│ 🟢 Worker 2: OK                  │
│ 🟡 Worker 3: Recovering...       │
│ 🟢 Worker 4: OK                  │
└──────────────────────────────────┘
```

#### 구현 항목

##### 1. **Health Check 시스템**
```c
// 10초마다 워커 상태 확인
while true {
  for each worker {
    if worker.is_dead() {
      worker.respawn()
      log("Worker restarted")
    }
  }
  sleep(10000)
}
```

##### 2. **메모리 모니터링**
```freelang
fn monitor() {
  loop {
    let mem = process.memoryUsage()
    if mem.heapUsed > threshold {
      gc.collect()
    }
    sleep(5000)
  }
}
```

##### 3. **TUI 대시보드 (FreeLang 구현)**
```freelang
// Terminal User Interface
fn renderDashboard(stats) {
  clear_screen()

  println("═══════════════ FreeNode Monitor ═══════════════")
  println("Uptime: 45d 3h 22m 15s")
  println("RPS: ${stats.rps} req/s")
  println("Memory: ${stats.memory}MB")
  println("")

  // 실시간 그래프
  renderGraph(stats.history)
}
```

#### 최종 목표

```
┌─────────────────────────────────────┐
│   Self-Healing FreeNode Runtime     │
│                                     │
│   • 프로세스 다운 -> 자동 재시작    │
│   • 메모리 누수 -> 자동 정리        │
│   • CPU 과부하 -> 자동 throttling  │
│   • 장애 -> 자동 로깅 & 알림       │
│                                     │
│   결과: PM2 불필요!               │
└─────────────────────────────────────┘
```

---

## 📈 단계별 성과 지표

| Phase | 단계명 | 핵심 성과 | 검증 방법 |
|-------|--------|---------|---------|
| 15 | Turbo-Stream | 전송량 76% 감소 | wrk 벤치마크 |
| 16 | Runtime Core | FreeLang으로 서버 작성 가능 | Node.js 코드 변환 테스트 |
| 17 | Gogs Eco | 9,640개 패키지 자동 관리 | KPM 설치 테스트 |
| 18 | Multi-Core | 16배 처리량 (16코어) | 분산 처리 벤치마크 |
| 19-20 | Self-Healing | 무중단 운영 | 30일 안정성 테스트 |

---

## 🎯 성공의 정의

```
FreeNode 1.0 완성의 조건:

✅ FreeLang으로 작성한 HTTP 서버가
✅ 16개 코어에서
✅ 100,000+ RPS를 처리하면서
✅ 메모리는 1GB 이하로 유지하고
✅ 30일 동안 자동 재시작 0회로 운영되는 상태
```

---

## 💾 기록의 중요성

**"기록이 증명이다"**

모든 단계가 Gogs에 저장됩니다:
- 커밋 로그: 각 단계의 진행 상황
- 이슈 트래킹: 해결된 문제들
- 벤치마크 리포트: 성과 측정
- 테스트 결과: 검증 내용

```bash
# Gogs 저장소
https://gogs.dclub.kr/kim/v2-freelang-ai.git

# 각 Phase별 태그
git tag phase-15-complete
git tag phase-16-complete
...
```

---

## 🚀 시작점

현재 우리가 만든 것들은 FreeNode의 **기반**입니다:

1. ✅ **Event Loop** (Phase 15의 기반)
   - select() 기반 비동기 I/O
   - Thread Pool로 블로킹 작업 분리

2. ✅ **HTTP Server** (Phase 16의 기반)
   - 정적 파일 서빙
   - Keep-Alive 연결 재사용

3. ✅ **wrk 벤치마크** (검증 도구)
   - 성능 측정 자동화
   - 지속적 모니터링

**다음**: Phase 15 커뮤니케이션 최적화 시작

---

## 📝 진행 상황

```
Phase 15 (현재)
├─ [x] Event Loop 기본 구현
├─ [x] HTTP Server 기본 구현
├─ [x] wrk 벤치마크 도구
├─ [ ] 배칭 엔진
├─ [ ] Gzip 압축
├─ [ ] 델타 업데이트 프로토콜
└─ [ ] 벤치마크 4배 달성

Phase 16 (다음)
├─ [ ] FreeLang-libuv Binding
├─ [ ] net 모듈
├─ [ ] fs 모듈
├─ [ ] timer 모듈
└─ [ ] 테스트 커버리지 100%
```

---

## 🎓 학습 가치

이 로드맵을 통해 우리는:

1. **리눅스 커널 깊이**: select/epoll, 프로세스, IPC
2. **C 프로그래밍 숙련도**: libuv, 메모리 관리
3. **분산 시스템**: 클러스터링, Load Balancing
4. **성능 최적화**: 벤치마킹, 프로파일링
5. **언어 설계**: FreeLang의 비동기 문법 정의

**최종 결과**: Node.js의 설계 원칙을 완전히 이해하고, 자신의 방식으로 재구현할 수 있는 능력

---

## 📞 다음 단계

1. 이 로드맵 리뷰 및 피드백
2. Phase 15의 상세 구현 계획 수립
3. 벤치마크 목표치 설정
4. 팀 구성 및 역할 분담

**목표**: 2026년 Q3까지 Phase 16 완성

---

**작성일**: 2026-02-17
**상태**: 🚀 Ready to Launch
**Gogs**: https://gogs.dclub.kr/kim/v2-freelang-ai.git
