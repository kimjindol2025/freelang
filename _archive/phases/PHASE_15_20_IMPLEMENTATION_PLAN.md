# FreeNode Phase 15-20 통합 구현 계획

**프로젝트**: v2-freelang-ai (FreeNode Runtime)
**기간**: 12-16주 (2026-02-17 ~ 2026-05-26)
**목표**: Production-ready FreeLang Runtime with Multi-Core, Self-Healing, KPM Ecosystem

---

## Context (배경 및 목적)

FreeNode는 **FreeLang + libuv**를 결합하여 Node.js와 유사한 비동기 런타임을 구축하는 프로젝트입니다. 현재 Phase 12까지 완료되었으며, Phase 15-20을 통해 완전한 Production 런타임을 완성합니다.

### 현재 상황

**완성도 분석** (2026-02-17):
- **Phase 15 (Turbo-Stream)**: 70% - Event Loop, HTTP Server, wrk, 배칭, 압축 완성
- **Phase 16 (Runtime Core)**: 30% - stdlib 스켈레톤만, **FFI가 핵심 병목**
- **Phase 17 (KPM Eco)**: 60% - 845개 패키지, 의존성 해석 필요
- **Phase 18 (Multi-Core)**: 5% - 설계만, uv_spawn/IPC 미구현
- **Phase 19-20 (Self-Healing)**: 40% - 웹 대시보드 완성, TUI 미구현

### 재사용 가능 자산

1. **stdlib/http/event_loop.c** - select() 기반 Event Loop + Thread Pool
2. **stdlib/http/http_server_impl.c** - Keep-Alive HTTP 서버
3. **stdlib/http/wrk.c** - 벤치마킹 도구 (16,937 req/s)
4. **src/dashboard/message-batcher.ts** - 50% 대역폭 절감
5. **src/dashboard/compression-layer.ts** - 30-40% 추가 절감
6. **845개 KPM 패키지** - 재사용 가능한 생태계

### 핵심 도전 과제

1. **FFI 메커니즘** (Phase 16) - FreeLang → C 함수 호출 가능하게
2. **libuv 완전 통합** (Phase 16) - net/fs/timer 모듈 구현
3. **멀티 프로세스** (Phase 18) - uv_spawn, IPC, 로드 밸런싱
4. **TUI 대시보드** (Phase 19-20) - FreeLang으로 ncurses 기반 구현
5. **KPM 의존성 해석** (Phase 17) - npm 수준 의존성 관리

---

## 전체 로드맵 (12-16주)

### Week 1-2: Phase 16 Foundation (FFI 핵심)

**목표**: FreeLang ↔ C 양방향 통신 구축

**작업**:
- **Week 1**: FFI Architecture Design + dlopen Implementation
  - [ ] `stdlib/ffi/freelang_ffi.c` 수정 (+500 LOC)
  - [ ] dlopen/dlsym 동적 로딩 구현
  - [ ] C → FreeLang 콜백 큐 구현
  - [ ] Handle Registry 확장 (256 → 1024)

- **Week 2**: libuv net/fs/timer wrapping + async/await bridge
  - [ ] `stdlib/timer/timer.c` 생성 (300 LOC)
  - [ ] `src/runtime/promise-bridge.ts` 생성 (200 LOC)
  - [ ] async/await → Promise 변환 메커니즘
  - [ ] 테스트 40개+ 통과

**마일스톤**: FreeLang에서 `setTimeout()` 동작, C 함수 호출 가능

---

### Week 3-4: Phase 16 Runtime Core (stdlib 완성)

**목표**: FreeLang stdlib 모듈 완전 구현

**작업**:
- **Week 3**: fs (파일 시스템), net (TCP/UDP 소켓)
  - [ ] `stdlib/fs/fs.c` 생성 (800 LOC)
  - [ ] `stdlib/net/net.c` 생성 (1000 LOC)
  - [ ] FreeLang 인터페이스 노출 (`index.free`)

- **Week 4**: timer, process, async/await 통합
  - [ ] `stdlib/process/spawn.c` 스켈레톤 (200 LOC)
  - [ ] async/await 통합 테스트 30개+
  - [ ] Node.js 코드 변환 테스트

**마일스톤**: `.free` 파일이 Node.js 수준 I/O 수행

**검증**:
```freelang
// 동작해야 함
async fn main() {
  let content = await fs.readFile("/tmp/test.txt");
  println(content);
}
```

---

### Week 5-6: Phase 17 KPM Ecosystem (의존성 해석)

**목표**: npm 수준 패키지 관리 (845개 패키지)

**작업**:
- **Week 5**: package.json parser, Semantic Versioning, 의존성 그래프
  - [ ] `src/kpm/package-parser.ts` 생성 (200 LOC)
  - [ ] `src/kpm/semver.ts` 생성 (300 LOC)
  - [ ] `src/kpm/dependency-resolver.ts` 생성 (500 LOC)

- **Week 6**: 자동 설치, 캐싱, 충돌 해결
  - [ ] `src/kpm/installer.ts` 생성 (400 LOC)
  - [ ] 순환 의존성 감지 (Tarjan's algorithm)
  - [ ] 845개 패키지 호환성 테스트

**마일스톤**: `kpm install express` 동작, 의존성 자동 해석

**검증**:
```bash
kpm install express
# → 13개 의존성 자동 설치
# → kim_modules/express/ 생성
```

---

### Week 7-8: Phase 15 Turbo-Stream (HTTP/2 최적화)

**목표**: 16,937 req/s → 67,748 req/s (4배)

**작업**:
- **Week 7**: HTTP/2 Server Push, 델타 업데이트
  - [ ] `stdlib/http/http2_server.c` 생성 (800 LOC)
  - [ ] `stdlib/http/http2_push.c` 생성 (400 LOC)
  - [ ] `src/dashboard/delta-encoder.ts` 생성 (300 LOC)
  - [ ] nghttp2 라이브러리 통합

- **Week 8**: 벤치마크 4배 달성, wrk 검증
  - [ ] wrk 스트레스 테스트 (500 connections)
  - [ ] 델타 업데이트 50% 추가 절감 검증
  - [ ] 성능 프로파일링

**마일스톤**: wrk 벤치마크 ≥ 60,000 req/s

**검증**:
```bash
wrk -t 8 -c 500 -d 30s http://localhost:8080/
# 목표: 60,000+ req/s
```

---

### Week 9-10: Phase 18 Multi-Core (프로세스 병렬화)

**목표**: Master/Worker 아키텍처, 8 CPU 코어 완전 활용

**작업**:
- **Week 9**: uv_spawn, IPC 프로토콜 설계
  - [ ] `stdlib/process/spawn.c` 완성 (600 LOC)
  - [ ] `stdlib/process/ipc.c` 생성 (800 LOC)
  - [ ] IPC 메시지 포맷 정의 (Binary Protocol)

- **Week 10**: 로드 밸런싱, 자동 재시작
  - [ ] `src/runtime/load-balancer.ts` 생성 (300 LOC)
  - [ ] `src/runtime/process-manager.ts` 생성 (500 LOC)
  - [ ] Round-robin 로드 밸런싱 구현
  - [ ] Worker 자동 재시작 로직

**마일스톤**: 8 worker 동시 실행, 자동 failover

**검증**:
```bash
freelang --workers=8 server.free
# → 8개 프로세스 생성
# → Worker 1개 강제 종료 시 자동 재시작
```

---

### Week 11-12: Phase 19-20 Self-Healing (TUI + 자가치유)

**목표**: 30일 무인 운영

**작업**:
- **Week 11**: TUI Dashboard (ncurses), Health Check
  - [ ] `src/tui/dashboard.c` 생성 (1000 LOC)
  - [ ] `src/monitoring/health-checker.ts` 생성 (400 LOC)
  - [ ] ncurses 기반 실시간 UI
  - [ ] CPU/Memory/Worker 상태 모니터링

- **Week 12**: Self-Healing 로직, 30일 스트레스 테스트 시작
  - [ ] `src/monitoring/self-healer.ts` 생성 (500 LOC)
  - [ ] 자동 복구 임계값 설정 (CPU 80%, Memory 900MB)
  - [ ] 30일 테스트 시작 (백그라운드)

**마일스톤**: TUI 동작, 자동 복구 검증

**검증**:
```bash
freelang --mode=production --workers=8 --self-healing=true
# → TUI 표시
# → CPU 80% 초과 시 Worker 추가
# → Worker 다운 시 자동 재시작
```

---

### Week 13-16 (Optional): 검증 및 최적화

**목표**: Production 안정화

**작업**:
- **Week 13-14**: 통합 테스트, 성능 프로파일링
  - [ ] 통합 테스트 100개+ 작성 및 통과
  - [ ] Valgrind로 메모리 누수 검사
  - [ ] perf로 성능 프로파일링

- **Week 15-16**: 문서화, 30일 테스트 모니터링
  - [ ] API 문서 작성
  - [ ] 튜토리얼 작성 (Getting Started)
  - [ ] 30일 테스트 완료 및 결과 분석

**마일스톤**: Production-ready 선언 (가동률 99.9%)

---

## Phase별 상세 구현 전략

### Phase 15: Turbo-Stream (HTTP/2 최적화) - 70% → 100%

#### 1. HTTP/2 Server Push

**파일**: `stdlib/http/http2_server.c` (NEW, 800 LOC)

```c
#include <nghttp2/nghttp2.h>

typedef struct {
  nghttp2_session *session;
  int stream_id;
  uv_tcp_t *tcp_handle;
} http2_session_t;

// Server Push 구현
int http2_push_promise(http2_session_t *sess, const char *path) {
  nghttp2_nv nva[] = {
    MAKE_NV(":method", "GET"),
    MAKE_NV(":path", path),
    MAKE_NV(":scheme", "https"),
  };

  return nghttp2_submit_push_promise(sess->session,
    NGHTTP2_FLAG_NONE, sess->stream_id, nva, 3, NULL);
}
```

**재사용 자산**:
- `http_server_impl.c`: Keep-Alive 로직
- `event_loop.c`: I/O multiplexing

---

#### 2. 델타 업데이트

**파일**: `src/dashboard/delta-encoder.ts` (NEW, 300 LOC)

```typescript
interface DeltaUpdate {
  prev: any;
  current: any;
  delta: { [key: string]: any };
}

export class DeltaEncoder {
  computeDelta(prev: object, current: object): object {
    const delta: any = {};

    for (const key in current) {
      if (current[key] !== prev[key]) {
        delta[key] = current[key];
      }
    }

    return delta;
  }

  applyDelta(base: object, delta: object): object {
    return { ...base, ...delta };
  }
}
```

**통합**:
```typescript
// message-batcher.ts와 통합
const encoder = new DeltaEncoder();
const delta = encoder.computeDelta(prevState, currentState);
const compressed = await compressionLayer.compress(JSON.stringify(delta));
```

---

#### 3. 성공 기준

- [ ] HTTP/2 Server Push 동작
- [ ] 델타 업데이트 50% 추가 절감
- [ ] wrk 벤치마크 ≥ 60,000 req/s (현재: 16,937 req/s)

---

### Phase 16: Runtime Core (FFI + libuv stdlib) - 30% → 100%

#### 핵심 과제: FFI 아키텍처

**선택**: **dlopen (동적 로딩)** ✅

**이유**:
- 유연성: 런타임에 라이브러리 로드
- 확장성: 새 C 라이브러리 추가 용이
- 디버깅: 모듈별 독립 테스트

**파일**: `stdlib/ffi/freelang_ffi.c` (수정, +500 LOC)

```c
#include <dlfcn.h>

typedef struct {
  void *handle;
  void (*fn_ptr)(void);
  int callback_id;
} fl_ffi_binding_t;

// FreeLang → C 호출
void* fl_ffi_load_library(const char *path) {
  return dlopen(path, RTLD_LAZY);
}

void* fl_ffi_get_function(void *lib, const char *name) {
  return dlsym(lib, name);
}

// C → FreeLang 콜백 (VM 연동)
extern void vm_execute_callback(int callback_id, void *args);
```

---

#### libuv 통합: Timer 모듈

**파일**: `stdlib/timer/timer.c` (NEW, 300 LOC)

```c
#include <uv.h>
#include "../ffi/freelang_ffi.h"

typedef struct {
  uv_timer_t handle;
  int callback_id;
  fl_event_context_t *ctx;
} fl_timer_t;

int fl_timer_start(int timeout_ms, int callback_id) {
  fl_timer_t *timer = malloc(sizeof(*timer));
  timer->callback_id = callback_id;

  uv_timer_init(ctx->uv_loop, &timer->handle);
  uv_timer_start(&timer->handle, timer_callback, timeout_ms, 0);

  return timer->handle.data; // timer ID
}

void timer_callback(uv_timer_t *handle) {
  fl_timer_t *timer = (fl_timer_t*)handle->data;
  // VM 콜백 실행
  freelang_enqueue_callback(timer->ctx, timer->callback_id, NULL);
}
```

**FreeLang 인터페이스**: `stdlib/timer/index.free`

```freelang
import @ffi "timer.so"

fn setTimeout(callback: fn() -> void, delay: number) -> number {
  native timer_start(delay, callback)
}

fn setInterval(callback: fn() -> void, interval: number) -> number {
  native timer_start(interval, callback, repeat: true)
}
```

---

#### libuv 통합: File System 모듈

**파일**: `stdlib/fs/fs.c` (NEW, 800 LOC)

```c
#include <uv.h>

typedef struct {
  uv_fs_t req;
  int callback_id;
  fl_event_context_t *ctx;
} fl_fs_request_t;

// 비동기 파일 읽기
void fl_fs_read_async(const char *path, int callback_id) {
  fl_fs_request_t *req = malloc(sizeof(*req));
  req->callback_id = callback_id;
  req->req.data = req;

  uv_fs_open(ctx->uv_loop, &req->req, path, O_RDONLY, 0, fs_open_callback);
}

void fs_open_callback(uv_fs_t *req) {
  fl_fs_request_t *fl_req = (fl_fs_request_t*)req->data;

  if (req->result < 0) {
    // 에러 콜백
    freelang_enqueue_callback_error(fl_req->ctx, fl_req->callback_id,
      uv_strerror(req->result));
  } else {
    // 파일 읽기
    int fd = req->result;
    uv_fs_read(ctx->uv_loop, &fl_req->req, fd, ..., fs_read_callback);
  }
}
```

**FreeLang 인터페이스**: `stdlib/fs/index.free`

```freelang
import @ffi "fs.so"

async fn readFile(path: string) -> string {
  return await native fs_read_async(path)
}

async fn writeFile(path: string, content: string) -> void {
  await native fs_write_async(path, content)
}
```

---

#### async/await → Promise 변환

**파일**: `src/runtime/promise-bridge.ts` (NEW, 200 LOC)

```typescript
export class PromiseBridge {
  private pendingCallbacks = new Map<number, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }>();

  // C 콜백 등록
  registerCallback(callbackId: number): Promise<any> {
    return new Promise((resolve, reject) => {
      this.pendingCallbacks.set(callbackId, { resolve, reject });
    });
  }

  // C → VM 콜백 실행
  executeCallback(callbackId: number, result: any, error: any) {
    const handlers = this.pendingCallbacks.get(callbackId);
    if (handlers) {
      if (error) handlers.reject(error);
      else handlers.resolve(result);
      this.pendingCallbacks.delete(callbackId);
    }
  }
}
```

---

#### 성공 기준

- [ ] FFI 호출 성공률 100%
- [ ] `setTimeout()` 동작
- [ ] `readFile()` 비동기 파일 읽기 동작
- [ ] TCP 서버 생성 및 연결 수락
- [ ] async/await 통합 테스트 30개+ 통과

---

### Phase 17: KPM Ecosystem (의존성 해석) - 60% → 100%

#### 1. package.json 파서

**파일**: `src/kpm/package-parser.ts` (NEW, 200 LOC)

```typescript
export interface PackageJson {
  name: string;
  version: string;
  dependencies?: { [key: string]: string };
  devDependencies?: { [key: string]: string };
  main?: string;
}

export class PackageParser {
  parse(jsonPath: string): PackageJson {
    const content = fs.readFileSync(jsonPath, 'utf-8');
    return JSON.parse(content);
  }
}
```

---

#### 2. Semantic Versioning

**파일**: `src/kpm/semver.ts` (NEW, 300 LOC)

```typescript
export class SemVer {
  major: number;
  minor: number;
  patch: number;

  static parse(version: string): SemVer {
    const [major, minor, patch] = version.split('.').map(Number);
    return new SemVer(major, minor, patch);
  }

  satisfies(range: string): boolean {
    // "^1.2.3": 1.x.x (major 고정)
    // "~1.2.3": 1.2.x (minor 고정)
    // ">=1.0.0": 1.0.0 이상
  }
}
```

---

#### 3. 의존성 해석 (DFS)

**파일**: `src/kpm/dependency-resolver.ts` (NEW, 500 LOC)

```typescript
export interface DependencyNode {
  name: string;
  version: string;
  dependencies: DependencyNode[];
}

export class DependencyResolver {
  async resolve(packageName: string): Promise<DependencyNode> {
    const visited = new Set<string>();
    return this.resolveDFS(packageName, visited);
  }

  private async resolveDFS(pkg: string, visited: Set<string>): Promise<DependencyNode> {
    if (visited.has(pkg)) {
      throw new Error(`Circular dependency detected: ${pkg}`);
    }

    visited.add(pkg);
    const packageJson = await this.getPackageJson(pkg);
    const children = [];

    for (const [name, version] of Object.entries(packageJson.dependencies || {})) {
      const resolved = await this.resolveDFS(name, visited);
      children.push(resolved);
    }

    visited.delete(pkg);
    return { name: pkg, version: packageJson.version, dependencies: children };
  }
}
```

---

#### 4. 자동 설치

**파일**: `src/kpm/installer.ts` (NEW, 400 LOC)

```typescript
export class KpmInstaller {
  async install(packageName: string, version?: string) {
    // 1. 의존성 해석
    const depTree = await this.resolver.resolve(packageName);

    // 2. Post-order traversal로 설치 (의존성 먼저)
    await this.installTree(depTree);
  }

  private async installTree(node: DependencyNode) {
    // 자식 먼저 설치
    for (const child of node.dependencies) {
      await this.installTree(child);
    }

    // 본인 설치
    await this.installOne(node.name, node.version);
  }
}
```

---

#### 성공 기준

- [ ] `kpm install express` 동작
- [ ] 의존성 자동 해석 (13개 패키지)
- [ ] 버전 충돌 해결
- [ ] 순환 의존성 감지 및 에러

---

### Phase 18: Multi-Core (프로세스 병렬화) - 5% → 100%

#### 1. uv_spawn (Worker 생성)

**파일**: `stdlib/process/spawn.c` (NEW, 600 LOC)

```c
#include <uv.h>

typedef struct {
  uv_process_t handle;
  uv_process_options_t options;
  int worker_id;
} fl_worker_t;

// Worker 프로세스 생성
int fl_spawn_worker(const char *script, int worker_id) {
  fl_worker_t *worker = malloc(sizeof(*worker));

  char* args[3];
  args[0] = "freelang";
  args[1] = (char*)script;
  args[2] = NULL;

  worker->options.file = args[0];
  worker->options.args = args;
  worker->options.exit_cb = on_exit;

  uv_spawn(uv_default_loop(), &worker->handle, &worker->options);
  return worker_id;
}

// Worker 종료 콜백
void on_exit(uv_process_t *req, int64_t exit_status, int term_signal) {
  fl_worker_t *worker = (fl_worker_t*)req->data;
  printf("Worker %d exited (status %lld)\n", worker->worker_id, exit_status);

  // 자동 재시작 로직
  if (exit_status != 0) {
    fl_spawn_worker(worker->script, worker->worker_id);
  }
}
```

---

#### 2. IPC 프로토콜 (Unix Domain Socket)

**파일**: `stdlib/process/ipc.c` (NEW, 800 LOC)

```c
typedef struct {
  uint32_t type;      // MSG_REQUEST, MSG_RESPONSE, MSG_BROADCAST
  uint32_t seq;       // 시퀀스 번호
  uint32_t length;    // 페이로드 크기
  char payload[0];    // 가변 길이
} ipc_message_t;

// IPC 채널 생성
int fl_ipc_create_channel() {
  uv_pipe_t *pipe = malloc(sizeof(*pipe));
  uv_pipe_init(uv_default_loop(), pipe, 1);
  uv_pipe_bind(pipe, "/tmp/freelang-ipc.sock");
  uv_listen((uv_stream_t*)pipe, 128, on_ipc_connection);
}

// 메시지 송신
void fl_ipc_send(uv_pipe_t *pipe, uint32_t type, const char *payload, size_t len) {
  ipc_message_t *msg = malloc(sizeof(*msg) + len);
  msg->type = type;
  msg->seq = next_seq++;
  msg->length = len;
  memcpy(msg->payload, payload, len);

  uv_buf_t buf = uv_buf_init((char*)msg, sizeof(*msg) + len);
  uv_write(&req, (uv_stream_t*)pipe, &buf, 1, on_write_complete);
}
```

**메시지 포맷**:
```
+--------+--------+--------+----------------+
| Type   | Seq    | Length | Payload        |
| 4bytes | 4bytes | 4bytes | Variable       |
+--------+--------+--------+----------------+

Type:
- 0x01: REQUEST (Master → Worker)
- 0x02: RESPONSE (Worker → Master)
- 0x03: BROADCAST (Master → All Workers)
- 0x04: HEARTBEAT (양방향)
```

---

#### 3. 로드 밸런싱 (Round-robin)

**파일**: `src/runtime/load-balancer.ts` (NEW, 300 LOC)

```typescript
export class LoadBalancer {
  private workers: Worker[] = [];
  private currentIndex = 0;

  // Round-robin
  selectWorker(): Worker {
    const worker = this.workers[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.workers.length;
    return worker;
  }

  // Least Connections (대안)
  selectLeastBusy(): Worker {
    return this.workers.reduce((min, w) =>
      w.activeConnections < min.activeConnections ? w : min
    );
  }
}
```

---

#### 4. 자동 재시작

**파일**: `src/runtime/process-manager.ts` (NEW, 500 LOC)

```typescript
export class ProcessManager {
  async restartWorker(workerId: number) {
    console.log(`Restarting worker ${workerId}...`);

    // 1. 새 Worker 생성
    const newWorker = await this.spawnWorker(workerId);

    // 2. Health Check 대기 (최대 5초)
    await this.waitForReady(newWorker, 5000);

    // 3. 기존 Worker 종료
    await this.terminateWorker(workerId);

    // 4. 교체
    this.workers[workerId] = newWorker;
  }

  private async waitForReady(worker: Worker, timeout: number): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await this.pingWorker(worker.id)) {
        return;
      }
      await sleep(100);
    }
    throw new Error(`Worker ${worker.id} not ready after ${timeout}ms`);
  }
}
```

---

#### 성공 기준

- [ ] 8 worker 동시 실행
- [ ] IPC 메시지 송수신 (손실률 0%)
- [ ] Round-robin 로드 밸런싱
- [ ] Worker 자동 재시작 (크래시 시)

---

### Phase 19-20: Self-Healing (TUI + 자가치유) - 40% → 100%

#### 1. TUI Dashboard (ncurses)

**파일**: `src/tui/dashboard.c` (NEW, 1000 LOC)

```c
#include <ncurses.h>

typedef struct {
  WINDOW *stats_win;
  WINDOW *workers_win;
  WINDOW *logs_win;
} tui_dashboard_t;

void tui_init() {
  initscr();
  cbreak();
  noecho();
  keypad(stdscr, TRUE);
  curs_set(0);

  // 색상 초기화
  start_color();
  init_pair(1, COLOR_GREEN, COLOR_BLACK);  // OK
  init_pair(2, COLOR_YELLOW, COLOR_BLACK); // Warning
  init_pair(3, COLOR_RED, COLOR_BLACK);    // Error
}

void tui_render(tui_dashboard_t *tui, stats_t *stats) {
  // 상단: 시스템 통계
  box(tui->stats_win, 0, 0);
  mvwprintw(tui->stats_win, 0, 2, "[ System Stats ]");
  mvwprintw(tui->stats_win, 1, 2, "CPU: %.1f%% | Memory: %ldMB | RPS: %d",
            stats->cpu_usage, stats->memory_mb, stats->rps);

  // 중앙: Worker 상태
  box(tui->workers_win, 0, 0);
  mvwprintw(tui->workers_win, 0, 2, "[ Workers ]");
  for (int i = 0; i < stats->num_workers; i++) {
    int color = stats->workers[i].status == OK ? 1 :
                stats->workers[i].status == DEGRADED ? 2 : 3;
    wattron(tui->workers_win, COLOR_PAIR(color));
    mvwprintw(tui->workers_win, i+1, 2, "Worker %d: %s (%d req/s)",
              i, status_str(stats->workers[i].status), stats->workers[i].rps);
    wattroff(tui->workers_win, COLOR_PAIR(color));
  }

  // 하단: 로그
  box(tui->logs_win, 0, 0);
  mvwprintw(tui->logs_win, 0, 2, "[ Logs ]");
  for (int i = 0; i < MAX_LOGS; i++) {
    mvwprintw(tui->logs_win, i+1, 2, "%s", logs[i]);
  }

  wrefresh(tui->stats_win);
  wrefresh(tui->workers_win);
  wrefresh(tui->logs_win);
}
```

---

#### 2. Health Check

**파일**: `src/monitoring/health-checker.ts` (NEW, 400 LOC)

```typescript
export interface HealthStatus {
  cpu: number;           // 0-100
  memory: number;        // MB
  workerStatus: { [id: number]: 'ok' | 'degraded' | 'down' };
  errorRate: number;     // errors/sec
  responseTime: number;  // ms (p95)
}

export class HealthChecker {
  async check(): Promise<HealthStatus> {
    const cpu = await this.getCpuUsage();
    const memory = process.memoryUsage().heapUsed / 1024 / 1024;
    const workers = await this.checkWorkers();
    const errorRate = this.metrics.getErrorRate();
    const responseTime = this.metrics.getP95ResponseTime();

    return { cpu, memory, workerStatus: workers, errorRate, responseTime };
  }

  private async checkWorkers(): Promise<{ [id: number]: string }> {
    const statuses = {};
    for (const worker of this.workers) {
      const ping = await this.pingWorker(worker.id);
      statuses[worker.id] = ping < 100 ? 'ok' :
                            ping < 1000 ? 'degraded' : 'down';
    }
    return statuses;
  }
}
```

---

#### 3. Self-Healing 로직

**파일**: `src/monitoring/self-healer.ts` (NEW, 500 LOC)

```typescript
export class SelfHealer {
  private thresholds = {
    cpu: 80,              // % (80% 초과 시 스케일 아웃)
    memory: 900,          // MB (900MB 초과 시 메모리 정리)
    errorRate: 5,         // errors/sec (5 초과 시 재시작)
    responseTime: 5000    // ms (5초 초과 시 경고)
  };

  async heal(health: HealthStatus) {
    // 1. CPU 과부하 → Worker 추가
    if (health.cpu > this.thresholds.cpu) {
      console.log('CPU 과부하 감지, Worker 추가 중...');
      await this.scaleOut();
    }

    // 2. 메모리 부족 → GC 강제 실행
    if (health.memory > this.thresholds.memory) {
      console.log('메모리 부족, GC 실행 중...');
      global.gc();
    }

    // 3. 에러율 높음 → Worker 재시작
    if (health.errorRate > this.thresholds.errorRate) {
      console.log('에러율 높음, Worker 재시작 중...');
      await this.restartWorkers();
    }

    // 4. Worker 다운 → 자동 재시작
    for (const [id, status] of Object.entries(health.workerStatus)) {
      if (status === 'down') {
        console.log(`Worker ${id} 다운 감지, 재시작 중...`);
        await this.processManager.restartWorker(Number(id));
      }
    }
  }
}
```

---

#### 4. 30일 스트레스 테스트

```bash
# 백그라운드 실행
nohup freelang --mode=production --workers=8 \
  --self-healing=true --tui=false \
  > /var/log/freelang-30day.log 2>&1 &

# 모니터링 스크립트
while true; do
  curl -s http://localhost:8080/health >> /var/log/freelang-health.log
  sleep 60
done
```

---

#### 성공 기준

- [ ] TUI 실시간 표시 (< 100ms 반응)
- [ ] Health Check 정확도 95%+
- [ ] 자동 복구 성공률 90%+
- [ ] 30일 중 가동률 99.9%+

---

## 핵심 파일별 작업 내용

### 수정할 파일

**stdlib/ffi/freelang_ffi.c** (+500 LOC)
- dlopen/dlsym 추가
- C → FreeLang 콜백 큐 구현
- Handle Registry 확장 (256 → 1024)

**stdlib/http/http_server_impl.c** (+300 LOC)
- HTTP/2 지원 (nghttp2 연동)
- Server Push 추가

**src/dashboard/message-batcher.ts** (+100 LOC)
- 델타 업데이트 통합

---

### 생성할 파일

**Phase 16 (FFI + libuv)**:
```
stdlib/timer/timer.c (300 LOC)
stdlib/fs/fs.c (800 LOC)
stdlib/net/net.c (1000 LOC)
stdlib/process/spawn.c (600 LOC)
stdlib/process/ipc.c (800 LOC)
src/runtime/promise-bridge.ts (200 LOC)
```

**Phase 17 (KPM)**:
```
src/kpm/package-parser.ts (200 LOC)
src/kpm/semver.ts (300 LOC)
src/kpm/dependency-resolver.ts (500 LOC)
src/kpm/installer.ts (400 LOC)
```

**Phase 18 (Multi-Core)**:
```
src/runtime/load-balancer.ts (300 LOC)
src/runtime/process-manager.ts (500 LOC)
```

**Phase 19-20 (Self-Healing)**:
```
src/tui/dashboard.c (1000 LOC)
src/monitoring/health-checker.ts (400 LOC)
src/monitoring/self-healer.ts (500 LOC)
```

**Phase 15 (Turbo-Stream)**:
```
stdlib/http/http2_server.c (800 LOC)
stdlib/http/http2_push.c (400 LOC)
src/dashboard/delta-encoder.ts (300 LOC)
```

---

## 기술적 설계 결정

### 1. FFI 아키텍처: dlopen (동적 로딩) ✅

**이유**:
- 유연성: 런타임에 라이브러리 로드
- 확장성: 새 C 라이브러리 추가 용이
- 디버깅: 모듈별 독립 테스트

**Trade-off**: 성능은 static linking보다 ~5% 느리지만 허용 범위

---

### 2. 비동기 콜백 → Promise 변환: Promise Bridge Pattern

```
FreeLang async/await
    ↓
Promise Bridge (TypeScript)
    ↓
Callback Queue (C)
    ↓
libuv Event Loop
    ↓
Callback Execution
    ↓
Promise Bridge (resolve/reject)
    ↓
FreeLang await 반환
```

---

### 3. IPC 프로토콜: Unix Domain Socket + Binary Protocol

**포맷**:
```
[Type:4][Seq:4][Length:4][Payload:Variable]
```

**장점**:
- 효율: TCP보다 30% 빠름 (로컬 통신)
- 신뢰성: 순서 보장
- 확장성: 다양한 메시지 타입 지원

---

### 4. TUI 라이브러리: ncurses ✅

**이유**:
- 표준: 모든 Unix 시스템 기본 설치
- 안정성: 40년 역사
- 문서화: 풍부한 예제

---

### 5. 의존성 해석: npm-style DFS

```typescript
// Depth-First Search + Version Hoisting
function resolve(pkg: string, depth = 0): DependencyNode {
  const deps = getPackageJson(pkg).dependencies;
  const children = [];

  for (const [name, version] of Object.entries(deps)) {
    const resolved = resolveVersion(name, version);
    children.push(resolve(resolved, depth + 1));
  }

  return { name: pkg, children };
}
```

**순환 의존성 감지**: Tarjan's Strongly Connected Components

---

## 검증 방법

### Phase별 성공 기준 (정량적)

**Phase 15**: Turbo-Stream
- [ ] wrk 벤치마크 ≥ 60,000 req/s (현재: 16,937)
- [ ] HTTP/2 Server Push 동작 확인
- [ ] 델타 업데이트 50% 추가 절감

**Phase 16**: Runtime Core
- [ ] FFI 호출 성공률 100%
- [ ] async/await 통합 테스트 통과
- [ ] stdlib 모듈 100% 동작 (fs, net, timer)

**Phase 17**: KPM Ecosystem
- [ ] 845개 패키지 정상 설치
- [ ] 의존성 해석 성공률 100%
- [ ] 버전 충돌 자동 해결

**Phase 18**: Multi-Core
- [ ] 8 worker 동시 실행
- [ ] IPC 메시지 손실률 0%
- [ ] 자동 재시작 성공률 ≥ 90%

**Phase 19-20**: Self-Healing
- [ ] 30일 가동률 ≥ 99.9%
- [ ] 자동 복구 성공률 ≥ 90%
- [ ] TUI 반응 시간 < 100ms

---

### 테스트 시나리오

**1. FFI 통합 테스트**
```typescript
describe('Phase 16: FFI', () => {
  test('FreeLang → C 함수 호출', () => {
    const result = ffi.call('add', [1, 2]);
    expect(result).toBe(3);
  });

  test('C → FreeLang 콜백', async () => {
    const promise = ffi.callAsync('setTimeout', [() => 'done', 1000]);
    const result = await promise;
    expect(result).toBe('done');
  });
});
```

**2. KPM 의존성 테스트**
```typescript
describe('Phase 17: KPM', () => {
  test('패키지 설치', async () => {
    await kpm.install('express');
    expect(fs.existsSync('kim_modules/express')).toBe(true);
  });

  test('의존성 자동 해석', async () => {
    const deps = await resolver.resolve('express');
    expect(deps.dependencies.length).toBeGreaterThan(10);
  });
});
```

**3. Multi-Core 테스트**
```typescript
describe('Phase 18: Multi-Core', () => {
  test('8 worker 생성', async () => {
    const manager = new ProcessManager(8);
    await manager.start();
    expect(manager.workers.length).toBe(8);
  });

  test('IPC 메시지 송수신', async () => {
    const response = await ipc.send({ type: 'PING' });
    expect(response.type).toBe('PONG');
  });
});
```

---

### 벤치마크 목표치

**HTTP Server**:
```
현재 (Phase 15 70%): 16,937 req/s
목표 (Phase 15 100%): 67,748 req/s (4배)

측정: wrk -t 8 -c 500 -d 30s http://localhost:8080/
```

**Memory**:
```
현재: ~100MB (idle)
목표: <150MB (8 workers)

측정: ps aux | grep freelang
```

**Startup Time**:
```
현재: ~2초
목표: <1초

측정: time freelang server.free
```

---

## 리스크 관리

### Phase별 기술적 리스크

**Phase 16: FFI**
- **리스크**: C ↔ FreeLang 타입 변환 복잡도
- **대안**: 제한된 타입만 지원 (number, string, array)
- **차단 요소**: libuv 미설치 → `apt install libuv1-dev`

**Phase 17: KPM**
- **리스크**: 845개 패키지 중 일부 호환성 문제
- **대안**: 호환성 목록 관리, Fallback 메커니즘
- **차단 요소**: Registry 속도 저하 → CDN 도입

**Phase 18: Multi-Core**
- **리스크**: IPC 메시지 손실
- **대안**: ACK 기반 재전송 메커니즘
- **차단 요소**: uv_spawn 버그 → 안정 버전 libuv 사용

**Phase 19-20: Self-Healing**
- **리스크**: 오판으로 인한 불필요한 재시작
- **대안**: 임계값 튜닝, 다단계 확인
- **차단 요소**: ncurses 버전 충돌 → Docker 환경 표준화

---

## Week별 체크리스트

### Week 1-2: Phase 16 Foundation
- [ ] dlopen FFI 구현 완료
- [ ] C → FreeLang 콜백 동작
- [ ] libuv timer 통합
- [ ] async/await 기본 동작
- [ ] 테스트 40개+ 통과

### Week 3-4: Phase 16 stdlib
- [ ] fs 모듈 완성 (readFile, writeFile, etc.)
- [ ] net 모듈 완성 (TCP Server, Client)
- [ ] FreeLang 인터페이스 노출
- [ ] 통합 테스트 30개+ 통과

### Week 5-6: Phase 17 KPM
- [ ] package.json 파서
- [ ] Semantic Versioning 구현
- [ ] 의존성 해석 알고리즘
- [ ] `kpm install` 동작
- [ ] 845개 패키지 테스트

### Week 7-8: Phase 15 Turbo-Stream
- [ ] HTTP/2 Server Push 구현
- [ ] 델타 업데이트 통합
- [ ] wrk 벤치마크 4배 달성
- [ ] 성능 테스트 10개+ 통과

### Week 9-10: Phase 18 Multi-Core
- [ ] uv_spawn Worker 생성
- [ ] IPC 프로토콜 구현
- [ ] Round-robin 로드 밸런싱
- [ ] 자동 재시작 로직
- [ ] 8 worker 스트레스 테스트

### Week 11-12: Phase 19-20 Self-Healing
- [ ] ncurses TUI 구현
- [ ] Health Check 완성
- [ ] Self-Healing 로직
- [ ] 30일 테스트 시작
- [ ] 문서화 완료

### Week 13-16: 검증 및 최적화
- [ ] 통합 테스트 100개+ 통과
- [ ] 성능 프로파일링 완료
- [ ] 30일 테스트 완료 (가동률 99.9%)
- [ ] Production 릴리즈

---

## 최종 목표

이 12-16주 계획을 통해 FreeNode를 완성합니다:

```
✅ FreeLang으로 작성한 HTTP 서버가
✅ 16개 코어에서
✅ 100,000+ RPS를 처리하면서
✅ 메모리는 1GB 이하로 유지하고
✅ 30일 동안 자동 재시작 0회로 운영되는 상태
```

**"기록이 증명이다"** - 모든 구현은 Gogs에 커밋됩니다.
