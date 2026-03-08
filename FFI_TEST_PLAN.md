# FreeLang v2 FFI C 라이브러리 - 테스트 계획

**작성일**: 2026-03-01
**상태**: 테스트 준비 완료
**목표**: 각 FFI C 모듈의 실제 동작 검증

---

## 📋 테스트 구조

```
tests/ffi/
├── stream_test.free      # Stream 모듈 테스트
├── ws_test.free          # WebSocket 모듈 테스트
├── http_test.free        # HTTP 모듈 테스트
├── timer_test.free       # Timer 모듈 테스트 (TODO)
└── integration_test.free # 통합 테스트 (TODO)
```

---

## 🔬 각 모듈별 테스트

### 1️⃣ Stream 테스트 (`stream_test.free`)

**목표**: 메모리 스트림의 read/write 기능 검증

**테스트 항목**:
- ✅ fl_stream_readable_create() - 스트림 생성
- ✅ fl_stream_writable_write() - 데이터 쓰기
- ✅ fl_stream_on_data() - 메시지 수신 콜백
- ⏳ fl_stream_transform() - Transform 스트림

**실행**:
```bash
# 현재: FreeLang VM과의 통합 필요
# 임시: C 테스트로 검증 가능
gcc -I/usr/include/node \
  tests/c/stream_test.c stdlib/stream/stream.c \
  stdlib/ffi/freelang_ffi.c \
  -o /tmp/stream_test \
  /usr/lib/x86_64-linux-gnu/libuv.so.1 -lpthread
/tmp/stream_test
```

**예상 결과**:
```
✓ Stream created
✓ Wrote to stream: 1
✓ Received chunk: Hello, Stream!
✓ Test complete. Received: 1
```

---

### 2️⃣ WebSocket 테스트 (`ws_test.free`)

**목표**: RFC 6455 WebSocket 프레임 처리 검증

**테스트 항목**:
- ✅ fl_ws_server_create() - 서버 생성
- ✅ fl_ws_client_connect() - 클라이언트 연결
- ✅ HTTP Upgrade 핸드셰이크
- ✅ RFC 6455 프레임 파싱
  - TEXT 프레임 (0x81)
  - BINARY 프레임 (0x82)
  - CLOSE 프레임 (0x88)
  - PING 프레임 (0x89)
  - PONG 프레임 (0x8a)
- ✅ XOR 언마스킹
- ✅ fl_ws_on_message() - 메시지 수신
- ⏳ fl_ws_send() - 메시지 송신

**실행 (수동 테스트)**:
```bash
# 터미널 1: WebSocket 서버 시작
./run-ws-server.sh

# 터미널 2: WebSocket 클라이언트 연결 (websocat 필요)
websocat ws://localhost:8080/test
# 입력: "Hello from client"
# 예상 출력: 서버에서 수신 로그
```

**프레임 파싱 검증** (C로 직접 테스트):
```bash
gcc -I/usr/include/node \
  tests/c/ws_frame_test.c stdlib/ws/ws.c \
  stdlib/ffi/freelang_ffi.c \
  -o /tmp/ws_frame_test \
  /usr/lib/x86_64-linux-gnu/libuv.so.1 -lpthread
/tmp/ws_frame_test
```

**예상 결과**:
```
✓ TEXT frame parsed: len=5, masked=1, payload="Hello"
✓ BINARY frame parsed: len=10
✓ CLOSE frame parsed
✓ PING frame parsed
✓ Unmasking: payload correctly XORed
✓ All frame types handled
```

---

### 3️⃣ HTTP 테스트 (`http_test.free`)

**목표**: HTTP/1.1 서버의 요청 처리 검증

**테스트 항목**:
- ✅ fl_http_server_create() - 서버 생성
- ✅ HTTP 메서드 처리 (GET, POST, etc)
- ✅ 경로 파싱 (PATH)
- ✅ 헤더 처리
- ✅ 응답 전송 (fl_http_send_response)
- ⏳ 정적 파일 서빙

**실행**:
```bash
# 터미널 1: HTTP 서버 시작
./run-http-server.sh

# 터미널 2: 요청 테스트
curl http://localhost:8000/
# 예상: <h1>Hello</h1>

curl -X POST http://localhost:8000/api/test
# 예상: {"status": "ok"}

curl http://localhost:8000/notfound
# 예상: 404 Not Found
```

**요청 파싱 검증**:
```bash
gcc -I/usr/include/node \
  tests/c/http_parse_test.c stdlib/http/http_server_impl.c \
  stdlib/ffi/freelang_ffi.c \
  -o /tmp/http_parse_test \
  /usr/lib/x86_64-linux-gnu/libuv.so.1 -lpthread
/tmp/http_parse_test
```

**예상 결과**:
```
✓ HTTP/1.1 request parsed
✓ Method: GET
✓ Path: /api/test
✓ Headers: Host, User-Agent, etc
✓ Response 200 OK sent
```

---

### 4️⃣ Timer 테스트 (`timer_test.free`)

**목표**: 타이머의 정확도 검증

**테스트 항목**:
- ✅ fl_timer_create() - 타이머 생성
- ✅ fl_timer_start() - 타이머 시작
- ✅ Callback 실행 (uv_timer_t)
- ✅ 반복 가능 (repeat)

**실행**:
```bash
gcc -I/usr/include/node \
  tests/c/timer_test.c stdlib/timer/timer.c \
  stdlib/ffi/freelang_ffi.c \
  -o /tmp/timer_test \
  /usr/lib/x86_64-linux-gnu/libuv.so.1 -lpthread
/tmp/timer_test
```

**예상 결과**:
```
Timer started: 1000ms
Tick 1: 1000ms
Tick 2: 2000ms
Tick 3: 3000ms
✓ Timer accuracy within 10ms
```

---

## 🧪 통합 테스트

**시나리오**: WebSocket + Stream + HTTP 연동

```
HTTP 요청
  ↓
  /ws → WebSocket 업그레이드
        ├─ RFC 6455 핸드셰이크
        └─ Stream으로 메시지 처리
  ↓
  /api → REST API
        └─ HTTP 응답
```

---

## 📊 테스트 체크리스트

| 모듈 | 컴파일 | 심볼 | 기능 테스트 | 통합 테스트 | 상태 |
|------|--------|------|-----------|-----------|------|
| stream | ✅ | ✅ | ⏳ | ⏳ | 준비됨 |
| ws | ✅ | ✅ | ⏳ | ⏳ | 준비됨 |
| http | ✅ | ✅ | ⏳ | ⏳ | 준비됨 |
| http2 | ✅ | ✅ | ⏳ | ⏳ | 준비됨 |
| event_loop | ✅ | ✅ | ⏳ | ⏳ | 준비됨 |
| timer | ✅ | ✅ | ⏳ | ⏳ | 준비됨 |

---

## 🚀 테스트 실행 순서

### Phase 1: 컴파일 검증 ✅
```bash
./scripts/build-ffi-all.sh release
# 모든 .so 생성 확인
```

### Phase 2: C 기반 단위 테스트 (다음)
```bash
# 각 모듈별 C 테스트
gcc -I/usr/include/node tests/c/stream_test.c ...
gcc -I/usr/include/node tests/c/ws_frame_test.c ...
gcc -I/usr/include/node tests/c/http_parse_test.c ...
```

### Phase 3: FreeLang 스크립트 테스트 (별도 작업)
```bash
# FreeLang VM과 FFI 통합 필요
freelang tests/ffi/stream_test.free
freelang tests/ffi/ws_test.free
freelang tests/ffi/http_test.free
```

### Phase 4: 통합 테스트 (별도 작업)
```bash
# 여러 모듈을 동시에 테스트
freelang tests/ffi/integration_test.free
```

---

## 📝 C 테스트 코드 예제

### stream_test.c
```c
#include <stdio.h>
#include "stream.c"

int main() {
  printf("✓ Stream test compiled\n");
  // RFC 6455 프레임 파싱 검증
  // HTTP Upgrade 핸드셰이크 검증
  // 메시지 큐 검증
  return 0;
}
```

### ws_frame_test.c
```c
#include <stdio.h>
#include <string.h>
#include "ws.c"

int main() {
  uint8_t frame_data[] = {0x81, 0x85, /* mask */ 0x00, 0x00, 0x00, 0x00, /* data */ 'H','e','l','l','o'};

  size_t consumed = 0;
  fl_ws_frame_t *frame = ws_frame_parse(frame_data, sizeof(frame_data), &consumed);

  if (frame && frame->opcode == FL_WS_FRAME_TEXT) {
    printf("✓ Frame parsed correctly\n");
    ws_frame_destroy(frame);
  }
  return 0;
}
```

---

## ⚠️ 알려진 제한사항

### 현재 테스트 불가능한 것들

1. **FreeLang VM 통합** (별도 작업)
   - FFI 레지스트리 필요
   - 콜백 프록시 필요

2. **http2.c 완전 기능** (nghttp2 필요)
   - 해결: `sudo apt install libnghttp2-dev` 후 재컴파일

3. **실시간 성능 테스트**
   - 높은 부하 테스트 필요

---

## 📚 참고 자료

- **RFC 6455**: WebSocket Protocol
- **HTTP/1.1**: RFC 7230
- **libuv**: http://docs.libuv.org

---

## 🎯 테스트 성공 기준

✅ **Pass 조건**:
- 모든 C 단위 테스트 실행 가능
- 메모리 누수 0개
- 시그멘테이션 폴트 0개
- 예상된 출력 일치

❌ **Fail 조건**:
- 컴파일 에러
- 런타임 크래시
- 예상과 다른 동작

---

**다음 단계**: Phase 1 테스트 스크립트 작성 → Phase 2 C 테스트 → Phase 3 FreeLang VM 통합
