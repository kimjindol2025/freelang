# FreeLang v2 FFI C 라이브러리 - Phase 3 VM 통합

**작성일**: 2026-03-01
**상태**: 🔨 **시작 (25%)**
**목표**: FreeLang VM과 FFI C 라이브러리 완전 통합

---

## 📊 Phase 3 진행률

```
FFI 타입 바인딩:     ✅ 완료 (type-bindings.ts)
FFI 레지스트리:      ✅ 완료 (registry.ts)
콜백 브릿지:         ✅ 완료 (callback-bridge.ts)
모듈 로더:          ✅ 완료 (loader.ts)
VM 통합:            ⏳ 진행 중
문서화:             ✅ 진행 중
테스트:             ⏳ 예정
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 3 진도:       🔨 25%
```

---

## 📁 생성된 FFI 모듈

### 1️⃣ type-bindings.ts (545줄)

**목적**: C 타입과 FreeLang 타입의 매핑

**주요 내용**:
```typescript
// 원시 타입 및 포인터 정의
TYPE_BINDINGS: {
  'fl_stream_t': opaque pointer,
  'fl_ws_socket_t': opaque pointer,
  'int': 4 bytes,
  'size_t': 8 bytes,
  // ...
}

// FreeLang ↔ C 타입 변환
FREELANG_TYPE_MAP: {
  'stream': { cType: 'fl_stream_t*', ... },
  'websocket': { cType: 'fl_ws_socket_t*', ... },
  // ...
}

// 함수 시그니처
FFI_SIGNATURES: {
  'fl_stream_readable_create': { returnType: 'fl_stream_t*', ... },
  'fl_ws_send': { returnType: 'int', parameters: [...] },
  // ...
}
```

**제공 함수**:
- `getTypeSize()` - 타입 크기 조회
- `cTypeToFreeLang()` - C 타입 → FreeLang 변환
- `flTypeToCType()` - FreeLang 타입 → C 변환

---

### 2️⃣ registry.ts (378줄)

**목적**: FFI 함수 등록 및 메타데이터 관리

**주요 내용**:
```typescript
FFIRegistry {
  // 모듈 초기화 (6개: stream, ws, http, http2, event_loop, timer)
  modules: Map<string, FFIModuleConfig>

  // 함수 시그니처 등록
  functionMap: Map<string, FFIFunctionSignature>

  // 메서드
  loadModule(moduleName)
  loadAllModules()
  getFunctionSignature(funcName)
  getModuleFunctions(moduleName)
  isFunctionAvailable(funcName)
  getStats()
}
```

**사용법**:
```typescript
import { ffiRegistry, initializeFFI } from './src/ffi/registry';

// 초기화
initializeFFI();

// 함수 시그니처 조회
const sig = ffiRegistry.getFunctionSignature('fl_ws_send');

// 함수 사용 가능 확인
if (ffiRegistry.isFunctionAvailable('fl_ws_send')) {
  // ...
}
```

---

### 3️⃣ callback-bridge.ts (341줄)

**목적**: C 라이브러리 콜백을 FreeLang VM과 연결

**주요 내용**:
```typescript
CallbackQueue {
  queue: CallbackContext[]
  handlers: Map<string, CallbackHandler>

  registerHandler(eventType, handler)
  enqueue(context): callbackId
  processNext(): boolean
  processAll(): count
  size(): number
}

// 콜백 타입
'stream:data'
'ws:message', 'ws:open', 'ws:close', 'ws:error'
'http2:data', 'http2:frame'
'timer:tick'
```

**사용법**:
```typescript
import { globalCallbackQueue, initializeCallbackBridge } from './src/ffi/callback-bridge';

// 초기화
initializeCallbackBridge();

// C 라이브러리에서 콜백 호출
// → onWebSocketMessage(socketHandle, message)
// → globalCallbackQueue.enqueue(...)
// → FreeLang 핸들러 실행
```

---

### 4️⃣ loader.ts (202줄)

**목적**: FFI 모듈 로더 및 VM 통합

**주요 내용**:
```typescript
FFILoader {
  initialize(vmInstance): boolean
  processPendingCallbacks()
  getStatus()
}

setupFFI(vmInstance): boolean
handleFFICallbacks()
```

**사용법**:
```typescript
import { setupFFI, handleFFICallbacks } from './src/ffi/loader';

// VM 생성
const vm = createFreeLangVM();

// FFI 초기화
setupFFI(vm);

// 메인 루프
while (vm.isRunning()) {
  vm.executeNextInstruction();
  handleFFICallbacks();  // 콜백 처리
}
```

---

## 🔗 VM 통합 가이드

### Step 1: VM 초기화 시 FFI 설정

```typescript
// src/engine/vm.ts 또는 메인 파일
import { setupFFI, handleFFICallbacks } from './ffi/loader';

class FreeLangVM {
  constructor() {
    // ... VM 초기화 ...

    // FFI 초기화
    setupFFI(this);
  }

  run() {
    while (this.isRunning()) {
      // VM 명령 실행
      this.executeNextInstruction();

      // FFI 콜백 처리
      handleFFICallbacks();

      // 이벤트 루프
      this.processEvents();
    }
  }
}
```

### Step 2: FFI 함수를 FreeLang 스크립트에서 호출 가능하게

**현재 상태**: 타입스크립트 구조만 정의됨

**필요 작업**: VM의 함수 호출 메커니즘과 연결

```typescript
// src/ffi/loader.ts의 registerFFIFunctions() 확장

private registerFFIFunctions(vmInstance: any): void {
  const allModules = ffiRegistry.getAllModules();

  for (const [moduleName, config] of allModules) {
    for (const funcName of config.functions) {
      // VM에 native 함수로 등록
      vmInstance.registerNativeFunction(funcName, {
        module: moduleName,
        function: funcName,
        signature: ffiRegistry.getFunctionSignature(funcName),
        executor: (args: any[]) => {
          // C 함수 호출 로직
          return callCFunction(funcName, args);
        }
      });
    }
  }
}
```

### Step 3: FreeLang 스크립트 작성

```freelang
// examples/websocket.free
import {
  fl_ws_client_connect,
  fl_ws_send,
  fl_ws_on_message
} from "ws"

fun main() {
  println("=== WebSocket Client ===")

  // 연결 (handle: number)
  let ws = fl_ws_client_connect("ws://localhost:8080", fun() {
    println("✓ Connected")
  })

  // 메시지 수신
  fl_ws_on_message(ws, fun(msg) {
    println("📨 Received: " + msg)
  })

  // 메시지 전송
  fl_ws_send(ws, "Hello from FreeLang!")
}

main()
```

---

## 🔧 필요한 VM 수정사항

### 1. Native 함수 호출 메커니즘

**파일**: `src/engine/vm.ts` 또는 유사

```typescript
// Native 함수 레지스트리
private nativeFunctions: Map<string, NativeFunction> = new Map();

registerNativeFunction(name: string, func: NativeFunction) {
  this.nativeFunctions.set(name, func);
}

callNativeFunction(name: string, args: any[]): any {
  const func = this.nativeFunctions.get(name);
  if (!func) throw new Error(`Native function not found: ${name}`);
  return func.executor(args);
}
```

### 2. 콜백 실행 메커니즘

**파일**: `src/engine/vm.ts` 또는 유사

```typescript
// FreeLang 함수 (콜백) 실행
executeCallback(funcName: string, args: any[]): any {
  // 현재 스코프에서 함수 찾기
  const func = this.lookupFunction(funcName);
  if (!func) throw new Error(`Function not found: ${funcName}`);

  // 함수 호출
  return this.callFunction(func, args);
}
```

### 3. 이벤트 루프 통합

**파일**: `src/engine/vm.ts` 또는 유사

```typescript
run() {
  while (this.isRunning()) {
    // Instruction 실행
    this.step();

    // FFI 콜백 처리 (중요!)
    handleFFICallbacks();

    // 이벤트 체크
    this.checkEvents();
  }
}
```

---

## 🔄 데이터 흐름

### WebSocket 메시지 수신 예

```
1. C 코드 (ws.c)
   │
   ├─ uv_read_start() → ws_read_cb()
   │
   └─ onWebSocketMessage(socketHandle, message)
                          ↓
2. Callback Bridge
   │
   ├─ onWebSocketMessage() 호출
   │
   └─ globalCallbackQueue.enqueue({
        eventType: 'ws:message',
        data: message,
        functionName: 'ws_123_onmessage'
      })
                          ↓
3. FreeLang VM Main Loop
   │
   ├─ handleFFICallbacks()
   │
   └─ globalCallbackQueue.processNext()
        │
        └─ handler(ctx) 실행
             │
             └─ vm.executeCallback('ws_123_onmessage', [message])
                                      ↓
4. FreeLang Script
   │
   └─ fl_ws_on_message(ws, fun(msg) { ... })
        │
        └─ 사용자 함수 실행
```

---

## 📊 Phase 3 완료 기준

| 항목 | 현재 | 목표 |
|------|------|------|
| FFI 타입 바인딩 | ✅ | ✅ |
| FFI 레지스트리 | ✅ | ✅ |
| 콜백 브릿지 | ✅ | ✅ |
| 모듈 로더 | ✅ | ✅ |
| VM 함수 바인딩 | ⏳ | ✅ |
| 콜백 실행 메커니즘 | ⏳ | ✅ |
| 이벤트 루프 통합 | ⏳ | ✅ |
| FreeLang 스크립트 테스트 | ⏳ | ✅ |

---

## 🚀 다음 단계

### 1. VM 함수 바인딩 구현
- `vm.registerNativeFunction()` 구현
- `vm.callNativeFunction()` 구현
- FFI 함수를 VM에 자동 등록

### 2. 콜백 실행 메커니즘
- `vm.executeCallback()` 구현
- 콜백 큐와 VM 통합

### 3. 이벤트 루프 통합
- `handleFFICallbacks()` 메인 루프 호출
- C 라이브러리 이벤트 처리

### 4. 테스트 및 검증
- WebSocket 테스트 스크립트
- Stream 테스트 스크립트
- HTTP/2 테스트 스크립트

---

## 📈 전체 진도 업데이트

```
Phase 0: FFI C 구현         ████████████████████ 100% ✅
Phase 1: C 단위 테스트      ████████████████████ 100% ✅
Phase 2: nghttp2 활성화     ███░░░░░░░░░░░░░░░░░  60% 🔨
Phase 3: FreeLang VM 통합   █░░░░░░░░░░░░░░░░░░░  25% 🔨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total:                       ████░░░░░░░░░░░░░░░░  40%
```

---

## 💾 생성된 파일 목록

```
src/ffi/
├── index.ts (40줄) - 모듈 export
├── type-bindings.ts (545줄) - 타입 매핑
├── registry.ts (378줄) - FFI 레지스트리
├── callback-bridge.ts (341줄) - 콜백 브릿지
└── loader.ts (202줄) - 모듈 로더

합계: 1,506줄 (5개 파일)
```

---

**상태**: 🔨 Phase 3 시작 (기초 구조 완성)
**다음**: VM 함수 바인딩 구현 및 콜백 메커니즘 연결

