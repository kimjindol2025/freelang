# MyOS_Lib - FreeLang 자주독립 아키텍처 헌장

**작성일**: 2026-03-01
**상태**: 📋 **Architecture Design Charter**
**목표**: "언어가 우리를 위해 일하게 만드는 것" - 표준 라이브러리 의존성 완전 제거

---

## 🎯 자주독립(Self-Hosting Independence) 선언

**현재 상태**: FreeLang은 C, Go, Python, Node.js 위에서 동작
**목표 상태**: FreeLang 자신을 컴파일할 수 있는 **"자주 컴파일 가능한 언어"** 달성

### 단계별 독립
```
1단계: ✅ 언어 다중화 (2026-02-21 완료)
   └─ Node.js, Zig, C에서 동일 API

2단계: ✅ 인터페이스 정의 (2026-03-01 완료)
   └─ FFI 시스템 + 양방향 통신 + 프로덕션 준비

3단계: 🔨 기반 기술 독립 (시작)
   ├─ MyOS_Lib: Zero-Dependency 기술 스택
   ├─ Raw System 호출로 표준 라이브러리 대체
   └─ 모든 것을 처음부터 구현

4단계: (예정) FreeLang → C 자체 컴파일러
   └─ "FreeLang이 FreeLang을 컴파일한다"
```

---

## 🏗️ 3대 설계 원칙 상세화

### 원칙 1️⃣: 표준 라이브러리 최소화 (Zero-Dependency)

**현재 의존성 (금지)**
```c
#include <stdio.h>      // ❌ printf
#include <stdlib.h>     // ❌ malloc, free
#include <string.h>     // ❌ strlen, strcpy
#include <unistd.h>     // ❌ read, write
```

**대체 메커니즘 (필수)**
```c
// Raw System Call (x86-64 Linux)
syscall(SYS_write, fd, buf, count);      // write(2)
syscall(SYS_mmap, addr, len, ...);       // mmap(2)
syscall(SYS_munmap, addr, len);          // munmap(2)
syscall(SYS_open, pathname, flags, ...); // open(2)
syscall(SYS_close, fd);                  // close(2)
```

**의미**:
- OS와 직접 대화 (libc 중간 계층 제거)
- 메모리 할당 → 커널이 아닌 우리가 통제
- 이식성 → 각 OS의 syscall은 다르지만, 우리의 추상화는 동일

---

### 원칙 2️⃣: 나만의 데이터 추상화 (Custom Primitive)

**구현할 자료구조** (C 표준 없음)

#### 1. Dynamic Array (가변 배열)
```c
typedef struct {
    void *data;        // 메모리 버퍼
    size_t capacity;   // 할당된 크기
    size_t size;       // 현재 사용 크기
    size_t element_size; // 각 요소 크기
} MyArray;

// 기본 연산
MyArray* myarray_new(size_t element_size);
void myarray_push(MyArray *arr, void *element);
void* myarray_get(MyArray *arr, size_t index);
void myarray_free(MyArray *arr);
```

#### 2. String Engine (안전한 문자열)
```c
typedef struct {
    char *buffer;      // 동적 할당 버퍼
    size_t length;     // 실제 길이
    size_t capacity;   // 최대 용량
    bool is_static;    // 스택 할당 여부
} MyString;

// 특징: 버퍼 오버플로우 불가능
//       자동 메모리 관리
//       UTF-8 네이티브 지원
```

#### 3. Hash Map (딕셔너리)
```c
typedef struct {
    MyString *keys[HASH_SIZE];
    void *values[HASH_SIZE];
    size_t count;
} MyHashMap;

// 해시 함수: Jenkins One-At-A-Time (표준 라이브러리 없이 구현)
uint32_t mystring_hash(MyString *str);
```

#### 4. Linked List (연결 리스트)
```c
typedef struct MyListNode {
    void *data;
    struct MyListNode *next;
} MyListNode;

typedef struct {
    MyListNode *head;
    size_t size;
} MyLinkedList;
```

**의미**:
- 메모리 구조를 완벽하게 통제
- 언어마다 다른 자료구조 대신 우리의 표준 정의
- 이식성: C → Zig → Go → FreeLang 모두에서 동일하게 사용 가능

---

### 원칙 3️⃣: 인터페이스 중심 설계 (Protocol First)

**통신 규격 정의** (바이너리 직렬화)

#### MyOS_Lib Protocol v1.0

```
【Header】
Byte 0-3:   Magic Number (0x4D59004F = "MY\0O")
Byte 4:     Protocol Version (1)
Byte 5-6:   Flags (Reserved, Compression, Encryption)
Byte 7-10:  Payload Length (big-endian)

【Payload】
Type ID (1 byte):
  0x01 = MyArray
  0x02 = MyString
  0x03 = MyHashMap
  0x04 = MyLinkedList
  0x05 = Raw Bytes

Data (variable length)

【Checksum】
Byte -4 to -1: CRC32 (데이터 무결성)
```

**예시: MyString 직렬화**
```
Header:    4D59004F 01 00 00000020
Type:      02 (MyString)
Length:    00000008
Data:      "Hello\0" (6 bytes + padding)
Checksum:  XXXXXXXX
```

**의미**:
- JSON/XML 같은 무거운 포맷 대신 바이너리 규격
- 모든 언어에서 parse 가능 (규격만 있으면)
- 성능: 직렬화/역직렬화가 매우 빠름
- 보안: 서명(Signature) 추가 가능

---

## 📦 MyOS_Lib 모듈 구조

```
myos-lib/
├── include/
│   ├── myos_types.h           # 기본 타입 정의
│   ├── myos_memory.h          # 메모리 관리
│   ├── myos_string.h          # 문자열 엔진
│   ├── myos_array.h           # 동적 배열
│   ├── myos_hashmap.h         # 해시맵
│   ├── myos_list.h            # 연결 리스트
│   ├── myos_io.h              # 입출력 (Raw Syscall)
│   ├── myos_log.h             # 로깅 시스템
│   ├── myos_protocol.h        # 직렬화 규격
│   └── myos.h                 # 메인 헤더
│
├── src/
│   ├── memory.c               # Memory Manager
│   ├── string.c               # String Engine
│   ├── array.c                # Dynamic Array
│   ├── hashmap.c              # Hash Map
│   ├── list.c                 # Linked List
│   ├── io.c                   # Raw Syscall Wrapper
│   ├── log.c                  # Log Provider
│   ├── protocol.c             # Serialization
│   ├── crc32.c                # CRC32 체크섬
│   └── hash.c                 # Jenkins Hash
│
├── arch/
│   ├── x86_64/
│   │   ├── syscall.c          # x86-64 syscall (asm)
│   │   └── memory_page.c      # 페이지 관리
│   ├── arm64/
│   │   └── syscall.c          # ARM64 syscall
│   └── riscv64/
│       └── syscall.c          # RISC-V syscall
│
├── tests/
│   ├── test_memory.c
│   ├── test_string.c
│   ├── test_array.c
│   ├── test_hashmap.c
│   ├── test_protocol.c
│   └── test_integration.c
│
├── Makefile                   # Zero-Dependency 빌드
└── README.md                  # 아키텍처 설명
```

---

## 🔧 Phase 8: MyOS_Lib 구현 로드맵

### Phase 8.1: 메모리 관리 (Memory Manager)

**목표**: `malloc` 없이 힙 관리

```c
// myos_memory.h 인터페이스
typedef struct {
    void *heap_start;     // 힙 시작 주소
    void *heap_end;       // 힙 끝 주소
    size_t heap_size;     // 힙 크기
    // Internal: 할당된 블록의 메타데이터
} MyMemoryAllocator;

// API
MyMemoryAllocator* myos_memory_init(size_t heap_size);
void* myos_malloc(MyMemoryAllocator *alloc, size_t size);
void myos_free(MyMemoryAllocator *alloc, void *ptr);
void myos_memory_dump(MyMemoryAllocator *alloc); // 디버그
```

**구현 전략**:
1. `mmap` syscall로 커널에서 메모리 페이지 요청
2. First-Fit / Best-Fit 알고리즘으로 할당
3. 메타데이터: 블록 시작 주소에 크기 저장
4. Free List로 해제된 영역 추적

**테스트 항목**:
- 기본 할당/해제
- 메모리 누수 감지
- 단편화(Fragmentation) 관리
- 재할당(Realloc)

---

### Phase 8.2: 문자열 엔진 (String Engine)

**목표**: 버퍼 오버플로우 불가능한 문자열

```c
// myos_string.h
MyString* myos_string_new(const char *cstr);
MyString* myos_string_new_static(const char *static_buf, size_t len);
void myos_string_append(MyString *str, const char *suffix);
MyString* myos_string_substring(MyString *str, size_t start, size_t len);
int myos_string_compare(MyString *s1, MyString *s2);
void myos_string_free(MyString *str);

// UTF-8 지원
size_t myos_string_len_utf8(MyString *str); // 문자 개수 (바이트 아님)
MyString* myos_string_upper(MyString *str);
MyString* myos_string_lower(MyString *str);
```

**특징**:
- `memcpy`, `strcpy` 사용 금지 (대신 바이트 단위 복사)
- 자동 null-termination
- 동적 크기 조정

---

### Phase 8.3: 동적 배열 (Dynamic Array)

**목표**: 타입 안전한 가변 배열

```c
// myos_array.h
MyArray* myos_array_new(size_t element_size);
void myos_array_push(MyArray *arr, void *element);
void* myos_array_at(MyArray *arr, size_t index);
void myos_array_remove(MyArray *arr, size_t index);
void myos_array_insert(MyArray *arr, size_t index, void *element);
size_t myos_array_size(MyArray *arr);
```

**성장 전략**: Doubling (1 → 2 → 4 → 8 ...)

---

### Phase 8.4: 해시맵 (Hash Map)

**목표**: O(1) 조회 성능의 딕셔너리

```c
// myos_hashmap.h
MyHashMap* myos_hashmap_new(size_t capacity);
void myos_hashmap_set(MyHashMap *map, MyString *key, void *value);
void* myos_hashmap_get(MyHashMap *map, MyString *key);
bool myos_hashmap_has(MyHashMap *map, MyString *key);
void myos_hashmap_remove(MyHashMap *map, MyString *key);
```

**충돌 처리**: Chaining (연결 리스트)

---

### Phase 8.5: 입출력 (IO System)

**목표**: Raw Syscall을 래핑한 파일/콘솔 I/O

```c
// myos_io.h - syscall 직접 래핑
int myos_write(int fd, const void *buf, size_t count);
int myos_read(int fd, void *buf, size_t count);
int myos_open(const char *path, int flags, int mode);
int myos_close(int fd);
int myos_seek(int fd, long offset, int whence);

// 고수준 API
void myos_printf(const char *fmt, ...);  // 자체 구현
void myos_puts(const char *str);         // 자체 구현
```

**특징**:
- `printf` 구현하지 않음 (varargs 복잡)
- `myos_puts` + `myos_string_format`으로 대체

---

### Phase 8.6: 로깅 (Log Provider)

**목표**: 표준 출력 없이 파일/커널 로그에 기록

```c
// myos_log.h
typedef enum {
    MYOS_LOG_DEBUG,
    MYOS_LOG_INFO,
    MYOS_LOG_WARN,
    MYOS_LOG_ERROR,
    MYOS_LOG_FATAL
} MyOSLogLevel;

void myos_log_init(const char *logfile);
void myos_log(MyOSLogLevel level, const char *msg);
void myos_log_close();
```

---

### Phase 8.7: 직렬화 프로토콜 (Serialization)

**목표**: MyOS_Lib Protocol v1.0 구현

```c
// myos_protocol.h
MyBuffer* myos_serialize_string(MyString *str);
MyString* myos_deserialize_string(MyBuffer *buf);
MyBuffer* myos_serialize_array(MyArray *arr);
MyArray* myos_deserialize_array(MyBuffer *buf);
```

---

## 📊 구현 일정

| Phase | 내용 | 목표 | 예상 기간 |
|-------|------|------|----------|
| 8.1 | Memory Manager | Zero malloc | 2-3일 |
| 8.2 | String Engine | Zero strcpy | 2-3일 |
| 8.3 | Dynamic Array | 타입 안전 | 1-2일 |
| 8.4 | Hash Map | O(1) 조회 | 2일 |
| 8.5 | IO System | Raw Syscall | 1-2일 |
| 8.6 | Log Provider | 커널 로그 | 1일 |
| 8.7 | Serialization | 바이너리 규격 | 2-3일 |
| 8.8 | 통합 테스트 | 모두 함께 | 2-3일 |
| 8.9 | Gogs 저장 | 기록=증명 | 1일 |

**총 예상 기간**: 14-24일

---

## 🎯 성공 지표

### 구현 완료 기준
```
✅ stdio.h 포함 안 함
✅ stdlib.h 포함 안 함
✅ string.h 포함 안 함
✅ 모든 메모리 할당이 mmap 기반
✅ 모든 I/O가 syscall 기반
✅ 모든 데이터구조 직접 구현
```

### 성능 기준
```
✅ Memory: 페이지 낭비 < 20%
✅ String: strlen 없이 O(1) 길이 조회
✅ Array: O(1) 조회, O(1) 추가 (amortized)
✅ HashMap: 평균 O(1), 최악 O(n)
```

### 이식성 기준
```
✅ x86-64 Linux: 완전 지원
✅ ARM64 Linux: syscall 변경으로 지원
✅ Zig로 재구현 가능 (프로토콜 표준화)
✅ Go로 재구현 가능 (프로토콜 표준화)
```

---

## 💾 Gogs 저장 전략

**저장소 구조**
```
MyOS_Lib (새 저장소)
├── master 브랜치
│   └── Phase 8 구현 (step by step)
├── docs/
│   ├── ARCHITECTURE.md (이 문서)
│   ├── PROTOCOL_SPEC.md (직렬화 규격)
│   └── SYSCALL_REFERENCE.md (syscall 매뉴얼)
└── 각 Phase 완료 후 커밋
```

**커밋 패턴**
```
feat: Phase 8.1 Memory Manager 구현 완료
  - mmap 기반 힙 할당
  - First-Fit 알고리즘
  - 10개 테스트 모두 통과

feat: Phase 8.2 String Engine 구현 완료
  - UTF-8 네이티브
  - 버퍼 오버플로우 불가능
  - 12개 테스트 모두 통과
```

---

## 🚀 최종 비전

### Phase 8 완료 후 상태
```
【MyOS_Lib 완성】
  ✅ 표준 라이브러리 의존성 0
  ✅ 모든 기본 자료구조 자체 구현
  ✅ 모든 I/O가 Raw Syscall
  ✅ 바이너리 프로토콜로 언어 간 통신

【다음 도전】
  Phase 9: MyOS_Lib을 Zig에서 재구현
  Phase 10: MyOS_Lib을 Go에서 재구현
  Phase 11: FreeLang 컴파일러가 MyOS_Lib을 사용
  Phase 12: "FreeLang이 FreeLang을 컴파일"
```

---

## 📜 헌장 선언

**"언어가 우리를 위해 일하게 만드는 것"**

이 헌장을 통해 우리는:

1. **C 표준 라이브러리의 탈피** → 정말 필요한 것만 구현
2. **데이터 통제의 회복** → 메모리와 구조를 완벽히 이해
3. **언어 독립성의 달성** → 어떤 언어에서도 우리의 규격 사용 가능
4. **진정한 자주독립** → FreeLang이 자신을 컴파일할 수 있는 시점

을 향해 나아갑니다.

**"기록이 증명이다"** - 모든 과정을 Gogs에 저장하며, 각 Phase마다 방명록에 기록합니다.

---

**작성자**: Claude (Desktop-kim)
**작성일**: 2026-03-01
**다음 단계**: Phase 8.1 - Memory Manager 구현 시작
