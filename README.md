# FreeLang v2.7.0 — Zero-Dependency AI Compiler

![Version](https://img.shields.io/badge/version-2.7.0-blue.svg)
![Status](https://img.shields.io/badge/status-Production%20Ready-brightgreen.svg)
![Tests](https://img.shields.io/badge/tests-176%2F176%20%E2%9C%85-green.svg)
![Dependencies](https://img.shields.io/badge/external%20deps-0%25-brightgreen.svg)
![Self-Hosting](https://img.shields.io/badge/self--hosting-compiler.free-orange.svg)

FreeLang은 **자기 자신의 소스를 컴파일 및 린트할 수 있는** 제로 외부 의존성 AI 기반 프로그래밍 언어입니다.
Node.js / TypeScript 기반으로 구현되며, ESLint·Apollo Server·PM2 등 주요 외부 패키지를 모두 내부 엔진으로 대체했습니다.

---

## 핵심 원칙

| 원칙 | 내용 |
|------|------|
| **Zero-Dependency** | npm 외부 패키지 의존 없음. 모든 기능이 FreeLang 내장 |
| **Self-Hosting** | `compiler.free`가 FreeLang 컴파일러 자신을 컴파일 |
| **Self-Linting** | `@lint` 어노테이션으로 컴파일러 소스를 빌드 시점에 자동 검사 |
| **Replace Everything** | ESLint / Apollo / PM2 / Swagger / nodemailer 완전 대체 |

---

## 빠른 시작

```bash
git clone https://gogs.dclub.kr/kim/v2-freelang-ai.git
cd v2-freelang-ai
npm install
npm run build
npx ts-node src/cli/index.ts hello.free
```

### Hello World

```free
fn main() {
  println("Hello, FreeLang!")
}

main()
```

### Native-Linter 사용

```free
@lint(no_unused: error, shadowing_check: warn, strict_pointers: true)

fn compute(x: i64) -> i64 {
  let unused = 99   // ← 빌드 시 즉시 차단: [no_unused] 'unused' is never used
  return x * 2
}
```

```
[lint] main.free:4:2 ✘ [no_unused] 'unused' is declared but never used (variable)
[lint] main.free 1 error(s) — rules: no_unused, shadowing_check, strict_pointers
Error: [Lint-Gate] Build blocked by 1 error(s)
```

### 데이터베이스

```free
db_open("myapp.db")
db_exec("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)")
db_exec("INSERT INTO users (name) VALUES ('Alice')")
let users = db_query("SELECT * FROM users")
println(str(users))
```

---

## v2.7.0 신규 기능

### 1. Native-Linter — ESLint 완전 대체

`@lint(...)` 어노테이션으로 컴파일 시점에 코드 품질을 강제합니다.

```
src/linter/
├── lint-gate.ts          # 메인 엔진 (assertLintPassed → 빌드 차단)
└── rules/
    ├── no-unused.ts      # 미사용 변수/파라미터 감지
    ├── no-shadowing.ts   # 변수 섀도잉 감지 (스코프 체인 추적)
    └── strict-pointers.ts # 포인터 안전성 (malloc/free 짝 검사)
```

**지원 규칙**:

| 규칙 | 레벨 | 설명 |
|------|------|------|
| `no_unused` | `error` / `warn` / `off` | 선언 후 미사용 변수 감지 |
| `shadowing_check` | `error` / `warn` / `off` | 외부 스코프 변수 재선언 감지 |
| `strict_pointers` | `true` / `false` | `*type` 포인터 초기화·해제 강제 |

**셀프호스팅 증명**: `src/self-host/compiler.free`에 `@lint` 적용 → 컴파일러 자신의 코드를 자신의 린터로 검사.

### 2. Native-Graph — Apollo Server 완전 대체

외부 GraphQL 라이브러리 없이 FreeLang 내장 GraphQL 엔진.

```free
@schema("
  type Query {
    user(id: Int): User
  }
  type User {
    id: Int
    name: String
  }
")
fn resolve_user(id: i64) -> map {
  return db_one("SELECT * FROM users WHERE id = ?", id)
}
```

### 3. MOSS-Compressor — zlib 완전 대체

순수 FreeLang C 구현 DEFLATE + GZIP 압축 엔진.

```free
let compressed = compress_deflate(data)
let decompressed = decompress_inflate(compressed)
let gz = compress_gzip(data, filename: "output.gz")
```

---

## 아키텍처

### 컴파일 파이프라인

```
Source (.free)
    │
    ▼
┌─────────────┐
│   @lint     │  ← Native-Linter (빌드 시점 검사)
│  Lint-Gate  │
└─────────────┘
    │ pass
    ▼
Lexer → Tokens
    │
    ▼
Parser → AST
    │
    ▼
Type Checker
    │
    ▼
IR Generator
    │
    ▼
┌───────┬────────┬──────────┬──────┐
│  GCC  │  NASM  │ ELF 직접 │ WASM │
│(C코드)│(x86-64)│ (바이너리)│      │
└───────┴────────┴──────────┴──────┘
```

### 디렉토리 구조

```
src/
├── lexer/              # 토크나이저
├── parser/             # 파서 + AST
│   ├── parser.ts       # @lint 어노테이션 파싱 포함
│   └── ast.ts          # LintConfig 타입 포함
├── linter/             # Native-Linter (v2.7.0 신규)
│   ├── lint-gate.ts    # 메인 엔진
│   └── rules/
│       ├── no-unused.ts
│       ├── no-shadowing.ts
│       └── strict-pointers.ts
├── analyzer/           # 의미 분석 + 타입 추론 (40+ 모듈)
├── codegen/            # 코드 생성기 (C, NASM, WASM, LLVM)
├── compiler/           # 컴파일러 코어
├── stdlib/             # 표준 라이브러리
│   ├── insight-builtins.ts  # 실시간 모니터링 함수
│   └── ...
├── runtime/
│   └── insight-engine.ts    # Self-Monitoring 런타임
├── self-host/          # 셀프호스팅 .free 소스
│   ├── compiler.free   # @lint 적용 (셀프호스팅 증명)
│   ├── parser.free
│   └── lexer.free
├── vm.ts               # 가상 머신
└── stdlib-builtins.ts  # 빌트인 함수 1,333+개
```

---

## 언어 레퍼런스

### 기본 문법

```free
// 변수
let x = 10
let name: string = "FreeLang"

// 함수
fn add(a: i64, b: i64) -> i64 {
  return a + b
}

// 제어 흐름
if x > 5 {
  println("크다")
} else {
  println("작다")
}

for item in arr {
  println(item)
}

// 패턴 매칭
match value {
  0 => println("zero"),
  1 => println("one"),
  _ => println("other"),
}

// 비동기
async fn fetch(url: string) -> string {
  let res = await http_get(url)
  return res
}

// 예외 처리
try {
  let data = file_read("data.txt")
} catch err {
  println("에러: " + err)
} finally {
  println("완료")
}
```

### Native-Linter 어노테이션

```free
// 파일 최상단에 선언
@lint(no_unused: error, shadowing_check: warn, strict_pointers: true)

// 이후 모든 선언에 자동 적용
fn main() {
  let x = 1       // 사용하면 OK
  let y = 2       // 사용 안 하면 → error: 'y' is never used
  return x
}
```

### 표준 라이브러리 (1,333+ 함수)

```
수학:        sin, cos, sqrt, pow, log, round, ceil, floor, abs
문자열:      strlen, trim, split, join, replace, substr, indexOf
배열:        push, pop, map, filter, reduce, sort, slice, length
파일 I/O:   file_read, file_write, file_exists, file_delete, dir_list
네트워크:   http_get, http_post, tcp_listen, tcp_connect, ws_send
데이터베이스: db_open, db_query, db_exec, db_one, db_close
암호화:     sha256, md5, bcrypt, aes_encrypt, base64_encode
시간:       date_now, date_format, sleep, timestamp
압축:       compress_deflate, decompress_inflate, compress_gzip
모니터링:   @monitor, insight_cpu, insight_mem, insight_rps
```

---

## 외부 의존성 대체 현황

| 외부 패키지 | FreeLang 대체 | 상태 |
|-------------|--------------|------|
| `eslint` | Native-Linter (`@lint` 어노테이션) | ✅ 완료 |
| `apollo-server` / `graphql` | Native-Graph | ✅ 완료 |
| `pm2` / `cluster` | MOSS-Kernel-Runner | ✅ 완료 |
| `swagger-ui` / `express-openapi` | MOSS-Autodoc | ✅ 완료 |
| `nodemailer` | MOSS-Mail-Core (SMTP FSM) | ✅ 완료 |
| `zlib` / `pako` | MOSS-Compressor (DEFLATE+GZIP) | ✅ 완료 |
| `sharp` / `jimp` | Vector-Vision (SIMD 이미지 처리) | ✅ 완료 |
| `helmet` / `bcrypt` | MOSS-Security 내장 | ✅ 완료 |

---

## 빌드 및 테스트

```bash
# TypeScript 컴파일 (에러 0개 보장)
npm run build:ts

# 전체 테스트
npm test

# 린터 직접 실행
npx ts-node -e "
import { runLintGate, formatLintResult } from './src/linter/lint-gate';
// ...
"

# 특정 .free 파일 실행
npx ts-node src/cli/index.ts examples/hello.free
```

### 테스트 현황

```
단위 테스트:       88/88   ✅
통합 테스트:       45/45   ✅
성능 테스트:       12/12   ✅
E2E 테스트:        31/31   ✅
──────────────────────────────
총합:             176/176  ✅ (100%)
```

---

## 버전 이력

```
v2.0.0  기본 컴파일러, 50+ 함수
v2.1.0  Web Framework, 400+ 함수
v2.2.0  AI 자동화 (자가 최적화/치유/증식)
v2.3.0  성능 최적화 + DB 드라이버 (SQLite/MySQL/PostgreSQL/Redis)
v2.4.0  비동기(async/await), 패턴 매칭, Generic<T>
v2.5.0  SIMD 이미지 처리(Vector-Vision), MOSS-Style
v2.6.0  Level 3 DB 완성, KPM-Linker, MOSS-Kernel-Runner
v2.7.0  Native-Linter (ESLint 대체), Native-Graph (Apollo 대체),
        MOSS-Compressor (zlib 대체), Self-Monitoring Runtime
        외부 의존성 0% 달성
```

---

## 통계

```
총 코드:          15,600+ 줄
표준 함수:        1,333+ 개
린터 규칙:        3개 (no_unused / shadowing_check / strict_pointers)
대체된 npm 패키지: 8개
커밋:             460+개
외부 의존성:      0%
```

---

## 저장소

- **Gogs**: https://gogs.dclub.kr/kim/v2-freelang-ai
- **Issues**: https://gogs.dclub.kr/kim/v2-freelang-ai/issues

---

## 라이선스

MIT License © 2026

---

**현재 버전**: v2.7.0
**최종 업데이트**: 2026-03-08
**외부 의존성**: 0%
