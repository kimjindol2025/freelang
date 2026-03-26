# 🚀 FreeLang - 경량 프로그래밍 언어

**Status**: 🟢 **활성** | **Type**: TypeScript 컴파일러
**Version**: 2.9.0 | **Release**: 2026-03-26

---

## 📌 프로젝트 정보

FreeLang은 **자체호스팅 가능한 경량 프로그래밍 언어**입니다.

- ✅ **완전한 컴파일러**: 129K 줄의 TypeScript 구현
- ✅ **자체컴파일 가능**: FreeLang으로 자기 자신을 컴파일
- ✅ **다양한 백엔드**: C, x86-64, VM 바이트코드
- ✅ **풍부한 표준라이브러리**: 100+ 내장 함수
- ✅ **프로덕션 테스트**: 247개 통합 테스트, 24시간 카오스 테스트 PASS

---

## 🎯 핵심 기능

### 1. 명령행 인터페이스 (CLI)

```bash
# REPL 모드
freelang

# 파일 직접 실행
freelang program.fl

# AOT 컴파일 (바이너리 생성)
freelang --aot program.fl -o program_binary

# 배치 처리
freelang --batch inputs.txt -o results.json

# 테스트 실행 (@test 어노테이션)
freelang test [path] [--filter str]

# 모듈 빌드 (KPM 링커)
freelang build program.fl -o output --optimize

# LSP 언어 서버 (에디터 통합)
freelang lsp

# Git Hook 관리
freelang gate <subcommand>

# 핫 리로드 (@hot 어노테이션)
freelang --watch program.fl
```

### 2. 컴파일 파이프라인

```
소스코드 (.fl)
   ↓
Lexer (토큰화)
   ↓
Parser (AST 생성)
   ↓
Type Checker (타입 검사)
   ↓
Compiler (중간 코드 생성)
   ↓
Code Generator (C 또는 x86-64)
   ↓
Assembler / C Compiler (바이너리)
```

### 3. 실행 환경

- **VM**: 바이트코드 인터프리터 (8개 레지스터, 4KB 메모리)
- **JIT**: 동적 컴파일 (성능 최적화)
- **FFI**: C 라이브러리 바인딩

### 4. 표준 라이브러리

```
math.fl        수학 함수 (sin, cos, sqrt 등)
string.fl      문자열 조작
array.fl       배열/리스트
json.fl        JSON 파싱/생성
io.fl          파일 I/O
http2.fl       HTTP/2 클라이언트
crypto.fl      암호화 (SHA256, AES)
sqlite.fl      SQLite 데이터베이스
orm.fl         ORM (객체-관계 매핑)
ws.fl          WebSocket
```

---

## ⚙️ 설치 및 실행

### 필요 사항
- Node.js 18+
- npm 9+

### 설치

```bash
# 1. 프로젝트 클론/이동
cd freelang

# 2. 의존성 설치
npm install

# 3. TypeScript 컴파일
npm run build

# 또는 한 번에
npm run build
```

### 첫 프로그램 실행

```bash
# REPL 시작
node dist/cli/index.js

# 파일 실행
node dist/cli/index.js examples/hello.fl
```

---

## 📝 예제 코드

### Hello World

```freelang
// examples/hello.fl
fn main() {
  println("Hello, World!")
}

main()
```

실행:
```bash
node dist/cli/index.js examples/hello.fl
```

### 기본 연산

```freelang
fn add(a: i32, b: i32) -> i32 {
  a + b
}

fn main() {
  let result = add(10, 20)
  println(result)  // 30
}

main()
```

### 배열 처리

```freelang
fn sum_array(arr: [i32]) -> i32 {
  let mut total = 0
  for item in arr {
    total = total + item
  }
  total
}

fn main() {
  let numbers = [1, 2, 3, 4, 5]
  let sum = sum_array(numbers)
  println(sum)  // 15
}

main()
```

---

## 🧪 테스트 실행

### 전체 테스트 (Jest)

```bash
npm test
```

### 통합 테스트

```bash
npm test -- e2e-full-pipeline.test.ts
```

### 파일 기반 테스트

```bash
node dist/cli/index.js test tests/
```

### 테스트 작성

```freelang
// 테스트는 @test 어노테이션으로 표기
@test
fn test_addition() {
  assert_eq(add(2, 3), 5)
}

@test
fn test_string_concat() {
  let result = concat("hello", "world")
  assert_eq(result, "helloworld")
}
```

---

## 📚 개발 가이드

### 소스 코드 구조

```
src/
├── cli/              # 명령행 인터페이스
├── lexer/            # 토큰화
├── parser/           # 파싱 (AST 생성)
├── type-checker/     # 타입 검사
├── compiler/         # 컴파일러 코어
├── codegen/          # 코드 생성
├── vm/               # VM 실행기
├── runtime/          # 런타임 라이브러리
├── stdlib/           # 표준 라이브러리 (100+ 파일)
├── lsp/              # LSP 언어 서버
└── phase-6 ~ phase-30/  # 단계별 기능 확장
```

### 빌드 명령어

```bash
# TypeScript → JavaScript 컴파일
npm run build

# 또는 only TypeScript
npm run build:ts

# FreeLang 파일 빌드
npm run build:fl

# 개발 모드 (ts-node)
npm run dev

# 린트
npm run lint

# 포맷팅
npm run format
```

---

## 🔧 LSP 통합 (편집기)

### VSCode

1. **FreeLang LSP 서버 시작**:
   ```bash
   node dist/lsp/server.js
   ```

2. **클라이언트 설정** (`settings.json`):
   ```json
   {
     "freelang.lspPath": "/path/to/freelang/dist/lsp/server.js",
     "freelang.trace.server": "verbose"
   }
   ```

### 지원 기능
- 문법 강조
- 자동완성
- 호버 정보
- 진단 (오류/경고)
- 빠른 수정

---

## 📊 성능

### 벤치마크 (Intel i7, 16GB RAM)

| 테스트 | 결과 | 비고 |
|--------|------|------|
| 컴파일 속도 | ~50ms (hello.fl) | 포함 의존성 최소화 |
| 실행 속도 | 네이티브 C와 유사 | AOT 컴파일 후 |
| 메모리 사용 | ~30MB (REPL) | 표준라이브러리 포함 |

### 24시간 카오스 테스트

```
✅ 5개 병렬 인스턴스
✅ 4,800개 스레드 생성
✅ 150회 무작위 리셋
✅ 결과: 100% PASS, 메모리 누수 없음
```

---

## 🐛 트러블슈팅

### npm install 실패

```bash
# legacy peer deps 사용
npm install --legacy-peer-deps
```

### better-sqlite3 컴파일 오류

```bash
# 사전 컴파일된 바이너리 사용
npm install --build-from-source=false
```

### 메모리 부족

```bash
# Node.js 힙 크기 증가
NODE_OPTIONS="--max-old-space-size=4096" npm run build
```

---

## 📖 상세 문서

- [API Reference](./API_REFERENCE.md)
- [언어 명세서](./docs/language-spec.md)
- [C 바인딩 가이드](./C-BINDING-INTEGRATION-GUIDE.md)
- [데이터베이스 드라이버](./DB_DRIVERS_QUICK_REFERENCE.md)
- [배포 가이드](./DEPLOYMENT_QUICK_START.md)

---

## 🤝 기여

이슈, 풀 요청, 피드백을 환영합니다!

참고: [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 📄 라이선스

MIT License - [LICENSE](./LICENSE)

---

## 🔗 링크

- **Repository**: https://gogs.dclub.kr/kim/freelang-v2.git
- **Issue Tracker**: [GitHub Issues](https://github.com/freelang/freelang/issues)
- **Documentation**: [docs/](./docs/)

---

**마지막 업데이트**: 2026-03-26
**유지보수**: Claude AI Team
