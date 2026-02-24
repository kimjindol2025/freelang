# FreeLang Standard Library Roadmap (50 Modules)

**Mission**: 기록이 증명이다. 50개 모듈을 하나씩 feat: stdlib/[name] 커밋으로 Gogs에 쌓을 때, 프리랭은 세상에 없던 강력한 기록 전용 언어가 됩니다.

**Current Status**: Phase 1-25 완료 (13,311 LOC Enterprise Platform)
**Next**: Phase 26~ → 50개 stdlib 모듈 체계적 구축

---

## 📋 50 Modules Classification

### 1. Core & Runtime (기초 체계) - 11개

| # | Module | Status | Note |
|----|--------|--------|------|
| 1 | **sys** | ⬜ | CPU/메모리 시스템 자원 정보 |
| 2 | **env** | ⬜ | 환경 변수 및 실행 경로 관리 |
| 3 | **proc** | ⬜ | 자식 프로세스 생성 제어 (uv_spawn) |
| 4 | **thread** | ⬜ | 워커 스레드 및 병렬 처리 |
| 5 | **timer** | ⬜ | 정밀 타이머 및 인터벌 (uv_timer) |
| 6 | **event** | ⬜ | 커스텀 이벤트 이미터 |
| 7 | **debug** | ⬜ | 스택 트레이스 및 힙 덤프 |
| 8 | **reflect** | ⬜ | 런타임 타입 검사 및 객체 조사 |
| 9 | **console** | ⬜ | 표준 입출력 및 터미널 제어 |
| 10 | **module** | 🟨 | 모듈 로딩 (부분 구현) |
| 11 | (Reserved) | - | - |

### 2. Network (네트워크 & 통신) - 9개

| # | Module | Status | Note |
|----|--------|--------|------|
| 12 | **net** | ✅ | TCP 소켓 서버/클라이언트 (Phase 16) |
| 13 | **udp** | ⬜ | UDP 데이터그램 통신 |
| 14 | **http** | ⬜ | HTTP/1.1 프로토콜 엔진 |
| 15 | **http2** | ⬜ | 고성능 멀티플렉싱 지원 |
| 16 | **ws** | ⬜ | 웹소켓 양방향 통신 |
| 17 | **dns** | ⬜ | 비동기 도메인 이름 해소 |
| 18 | **tls** | ⬜ | SSL/TLS 보안 연결 |
| 19 | **url** | ⬜ | URL 파싱 및 쿼리 스트링 처리 |
| 20 | **fetch** | ⬜ | 고수준 HTTP 클라이언트 API |
| 21 | **grpc** | ⬜ | 원격 프로시저 호출 지원 |

### 3. File System & Storage (저장소) - 10개

| # | Module | Status | Note |
|----|--------|--------|------|
| 22 | **fs** | ⬜ | 비동기 파일 읽기/쓰기/감시 (uv_fs) |
| 23 | **path** | ⬜ | 파일 경로 조작 및 정규화 |
| 24 | **stream** | ⬜ | 대용량 데이터 스트리밍 처리 |
| 25 | **db.sqlite** | ⬜ | SQLite WAL 모드 기본 내장 |
| 26 | **db.redis** | ✅ | Mini-hiredis 비동기 클라이언트 (Phase 18) |
| 27 | **archive** | ⬜ | ZIP/TAR 압축 및 해제 |
| 28 | **buffer** | ⬜ | 이진 데이터 바이너리 처리 |
| 29 | **kv** | ⬜ | 메모리 내 키-값 저장소 |
| 30 | **cache** | 🟨 | LRU 기반 메모리 캐시 (부분 구현) |
| 31 | **temp** | ⬜ | 임시 파일 및 디렉토리 관리 |

### 4. Security & Cryptography (보안) - 5개

| # | Module | Status | Note |
|----|--------|--------|------|
| 32 | **hash** | 🟨 | SHA256, MD5 (부분: Phase 23) |
| 33 | **crypto** | ✅ | AES/RSA 암호화 (Phase 23) |
| 34 | **jwt** | ✅ | JSON Web Token (Phase 23) |
| 35 | **otp** | ⬜ | 2단계 인증 TOTP |
| 36 | **uuid** | ⬜ | 고유 식별자 생성 (UUID/ULID) |

### 5. Data Processing (데이터 처리) - 10개

| # | Module | Status | Note |
|----|--------|--------|------|
| 37 | **json** | ⬜ | 초고속 JSON 파싱 (SIMD 최적화) |
| 38 | **xml** | ⬜ | XML 데이터 처리 |
| 39 | **csv** | ⬜ | 로그 데이터용 CSV 파서 |
| 40 | **yaml** | ⬜ | 설정 파일용 YAML 처리 |
| 41 | **regexp** | ⬜ | 정규표현식 엔진 |
| 42 | **math** | ✅ | 고정밀 수학 연산 (Phase 11) |
| 43 | **date** | ⬜ | 타임존 지원 날짜/시간 처리 |
| 44 | **encoding** | ⬜ | Base64, Hex 등 인코딩 |
| 45 | **struct** | ⬜ | C 구조체 매핑 및 바이너리 패킹 |
| 46 | **diff** | ⬜ | 데이터 델타(차이) 계산 (Phase 15용) |

### 6. Utility & Monitoring (유틸리티) - 5개

| # | Module | Status | Note |
|----|--------|--------|------|
| 47 | **log** | ✅ | 레벨별 로깅 (Phase 22) |
| 48 | **bench** | ⬜ | 성능 측정 마이크로 벤치마크 |
| 49 | **validate** | ⬜ | 데이터 유효성 검증 |
| 50 | **ansicolor** | ⬜ | TUI용 터미널 색상 제어 |
| 51 | **stats** | ⬜ | 통계 데이터 계산 및 분석 |

---

## 📊 Implementation Status

**Legend**: ✅ = 완료 | 🟨 = 부분 구현 | ⬜ = 미구현

### Completed (5 modules)
- ✅ net (Phase 16)
- ✅ db.redis (Phase 18)
- ✅ crypto (Phase 23)
- ✅ jwt (Phase 23)
- ✅ math (Phase 11)
- ✅ log (Phase 22)

### Partial (3 modules)
- 🟨 module (부분 구현)
- 🟨 cache (부분 구현)
- 🟨 hash (부분 구현)

### To Implement (42 modules)
- Core & Runtime: 10개
- Network: 9개
- File System & Storage: 9개
- Security & Cryptography: 2개
- Data Processing: 9개
- Utility & Monitoring: 3개

---

## 🎯 Phase 26~ Implementation Strategy

### Phase 26: Core & Runtime Fundamentals (6 modules)
```
Phase 26-1: sys, env (System & Environment)
Phase 26-2: proc, thread (Process & Parallelism)
Phase 26-3: timer, event (Async primitives)
```

### Phase 27: Network Essentials (5 modules)
```
Phase 27-1: udp, dns (Basic network)
Phase 27-2: http, fetch (HTTP client/server)
Phase 27-3: ws, tls (Advanced networking)
```

### Phase 28: File System & Storage (5 modules)
```
Phase 28-1: fs, path (File operations)
Phase 28-2: db.sqlite, buffer (Data storage)
Phase 28-3: stream, archive (Data handling)
```

### Phase 29: Security Completion (3 modules)
```
Phase 29-1: hash (Complete SHA/MD5)
Phase 29-2: otp, uuid (Auth & Identity)
```

### Phase 30: Data Processing (7 modules)
```
Phase 30-1: json, xml, csv (Data formats)
Phase 30-2: yaml, regexp, encoding (Processing)
Phase 30-3: date, struct, diff (Utilities)
```

### Phase 31: Utility Suite (4 modules)
```
Phase 31-1: bench, validate (Testing)
Phase 31-2: ansicolor, stats (Monitoring)
```

---

## 📝 Commit Strategy

**Each module = 1 commit**

```bash
# Phase 26-1 Example
git commit -m "feat: stdlib/sys - System resource information (CPU, memory, uptime)"
git commit -m "feat: stdlib/env - Environment variables and execution paths"

# Phase 26-2 Example
git commit -m "feat: stdlib/proc - Child process creation via uv_spawn"
git commit -m "feat: stdlib/thread - Worker threads and parallel processing"

# ... 50 commits total
```

**Guestbook Entry** (per module)
```
"✅ Phase 26-1: sys module complete. System resource monitoring (CPU, memory, uptime).
250 LOC. Gogs: [hash]. Cumulative: Phase 16-26."
```

---

## 🏆 Final Vision

When all 50 modules are complete:

```
Phases 1-11:   13,311 LOC Enterprise Platform
  ↓
Phases 26-31:  15,000+ LOC Standard Library (50 modules)
  ↓
Total:         28,000+ LOC Production-Ready Language
  ↓
Record:        50+ feat: stdlib/* commits on Gogs
  ↓
Proof:         "기록이 증명이다" - 각 커밋이 살아있는 증거
  ↓
Result:        세상에 없던 강력한 기록 전용 언어 🎉
```

---

**Last Updated**: 2026-02-17
**Status**: Roadmap finalized, ready for Phase 26 execution
**Commit**: Ready to create 50 feat: stdlib/* commits
