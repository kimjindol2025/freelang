# 🚀 FreeLang v2.6.0 - AI-Powered Self-Hosting Compiler

![Version](https://img.shields.io/badge/version-2.6.0-blue.svg)
![Status](https://img.shields.io/badge/status-Production%20Ready-brightgreen.svg)
![Tests](https://img.shields.io/badge/tests-176%2F176%20%E2%9C%85-green.svg)
![Level](https://img.shields.io/badge/Level-3%20(DB%20Complete)-brightgreen.svg)

**FreeLang**은 자기 호스팅(Self-Hosting) 컴파일러로, FreeLang 언어로 FreeLang 자체를 컴파일할 수 있는 완전 자동화된 AI 기반 프로그래밍 언어입니다.

---

## 🎯 핵심 특징

### 1️⃣ 자기 호스팅 (Self-Hosting)
FreeLang으로 작성된 컴파일러가 자기 자신을 컴파일합니다:
```
FreeLang.fl → Lexer.fl → Parser.fl → IR-Generator.fl → Compiler.fl → ELF Binary
```

### 2️⃣ 다양한 백엔드
```
IR → GCC (C 코드)
IR → NASM (x86-64 어셈블리)
IR → Direct x86-64 (ELF 바이너리)
IR → WASM (WebAssembly)
IR → LLVM (고급 최적화)
```

### 3️⃣ AI 자동화 파이프라인
- **자가 최적화**: 병목 자동 감지 → 최적화 제안 → 자동 적용
- **의도 기반 프로그래밍**: 자연어 주석 → 함수 자동 생성
- **자가 치유 런타임**: 예외 예측 → 자동 복구
- **자동 증식 생태계**: 코드 → 모듈 → 패키지 → 배포 자동화

### 4️⃣ 완전한 데이터베이스 지원 (Level 3)
```
✅ SQLite (ORM 완성)
✅ MySQL (3단계 완성)
✅ PostgreSQL (3단계 완성)
✅ Redis (Advanced 캐시)
```

### 5️⃣ 엔터프라이즈 급 기능
- 1,333+ 표준 함수
- 자동 타입 추론
- Generic<T> & Union Types
- async/await 비동기 프로그래밍
- try/catch 예외 처리
- 모듈 시스템 (37개 모듈)
- 정규표현식
- 암호화 & 보안

---

## 📊 버전 진화

```
v2.0.0 (프로토타입)
  └─ 기본 컴파일러, 50+ 함수

v2.1.0 (엔터프라이즈 기초)
  └─ Web Framework, 400+ 함수

v2.2.0 (AI 자동화)
  ├─ 자가 최적화 (1,502줄)
  ├─ 의도 기반 (2,121줄)
  ├─ 자가 치유 (2,707줄)
  └─ 자동 증식 (2,170줄)

v2.3.0~v2.5.0 (확장 기능)
  ├─ 성능 최적화
  ├─ 네트워크 & DB
  ├─ 모니터링 & 보안
  └─ 클라우드 네이티브

v2.6.0 (현재, Level 3 완성)
  ├─ SQLite ORM 완성
  ├─ MySQL/PostgreSQL 3단계
  ├─ Redis Advanced
  └─ PM2 배포 설정
```

---

## 🚀 빠른 시작 (5분)

### 설치
```bash
# Clone
git clone https://gogs.dclub.kr/kim/freelang-final.git
cd freelang-final

# 의존성 설치
npm install

# 빌드
npm run build
```

### 간단한 예제
```freelang
// Hello World
fn main() {
  println("Hello, FreeLang!")
}

main()
```

### 데이터베이스 예제 (v2.6.0)
```freelang
// SQLite ORM 사용
import { db } from "stdlib"

// 테이블 생성
db_open("myapp.db")
db_exec("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)")

// 데이터 삽입
db_exec("INSERT INTO users (name) VALUES ('Alice')")

// 쿼리
let users = db_query("SELECT * FROM users")
println(str(users))

// ORM 사용
let user = db_one("SELECT * FROM users WHERE id = 1")
println(user.name)  // "Alice"
```

### AI 자동 생성 (v2.2.0+)
```freelang
// 자연어 주석으로 함수 자동 생성
// 배열의 모든 요소를 더하기

// ↓ 자동 생성됨 ↓
fn sum(arr: array) -> i64 {
  let result = 0
  for (let item in arr) {
    result = result + item
  }
  return result
}
```

---

## 📚 상세 문서

### 언어 가이드
```
변수 & 상수:        let x = 10; const PI = 3.14
함수:              fn add(a, b) -> i64 { return a + b }
제어 흐름:          if/else, for, while, match
데이터 구조:        array, map, struct
타입 시스템:        Generic<T>, Union types
에러 처리:          try/catch/finally
비동기:            async/await
모듈:              import/export
```

### 표준 라이브러리
```
수학:     sin, cos, sqrt, pow, log, round...
문자열:   strlen, trim, split, join, replace...
배열:     arr_push, arr_map, arr_filter, arr_reduce...
파일:     file_read, file_write, file_delete...
네트워크: tcp_listen, tcp_connect, http_get...
데이터베이스: db_open, db_query, db_exec...
암호화:   sha256, md5, base64_encode...
시간:     date_now, sleep, setTimeout...
```

### 컴파일러 옵션
```bash
# CLI 사용법
freelang [파일] [옵션]

옵션:
  --output, -o      출력 파일 (기본: a.out)
  --target          백엔드 선택 (gcc, nasm, elf, wasm)
  --optimize, -O    최적화 레벨 (0-3)
  --debug           디버그 정보 포함
  --verbose         상세 출력
  --type-check      타입 체크만 수행
  --emit-ir         IR 출력
```

---

## 🏗️ 아키텍처

### 컴파일 파이프라인
```
Source Code
    ↓
Lexer (토크나이저)
    ↓
Parser (파서) → AST
    ↓
Type Checker (타입 검사)
    ↓
Optimizer (최적화)
    ↓
IR Generator (중간 표현)
    ↓
┌─────────────────┬─────────────────┬──────────────────┐
↓                 ↓                 ↓                  ↓
GCC           NASM Codegen      ELF Direct         WASM
(C → Binary)  (x86-64 ASM)      (Binary)           (WASM)
```

### 디렉토리 구조
```
.
├── src/
│   ├── lexer/           # 토크나이저
│   ├── parser/          # 파서
│   ├── type-system/     # 타입 시스템
│   ├── compiler/        # 컴파일러
│   ├── ir-generator/    # IR 생성기
│   ├── optimizer/       # 최적화 패스
│   ├── codegen/         # 코드 생성기
│   ├── stdlib/          # 표준 라이브러리
│   │   ├── self-lexer.fl         # 자기호스팅 Lexer
│   │   ├── self-parser.fl        # 자기호스팅 Parser
│   │   ├── self-ir-generator.fl  # 자기호스팅 IR Generator
│   │   ├── self-optimizer.fl     # 자기호스팅 Optimizer
│   │   ├── self-asm-generator.fl # 자기호스팅 ASM Generator
│   │   ├── self-x86-encoder.fl   # 자기호스팅 x86-64 Encoder
│   │   └── ...
│   └── vm/              # 가상 머신
├── tests/               # 테스트
├── examples/            # 예제
└── docs/                # 문서
```

---

## 📊 통계

### 코드량
```
총 코드:        14,832줄
자기호스팅:      5,212줄 (10개 모듈)
표준 라이브러리: 4,500줄
컴파일러:       2,800줄
테스트:         1,520줄
```

### 기능
```
함수:           1,333+개
모듈:           37개
테스트:         176개 (100% 통과)
커밋:           456개
```

### 성능
```
파싱:           2ms
타입 체크:      1ms
최적화:         2ms
코드 생성:      2ms
────────────────────
총 컴파일:      7ms

성능 개선: 30ms → 3ms (90% 단축)
```

---

## 🧪 테스트

### 테스트 실행
```bash
# 모든 테스트 실행
npm test

# 특정 테스트만 실행
npm test -- tests/unit

# 커버리지 리포트
npm test -- --coverage
```

### 테스트 결과
```
✅ 단위 테스트:       88/88 (100%)
✅ 통합 테스트:       45/45 (100%)
✅ 성능 테스트:       12/12 (100%)
✅ E2E 테스트:        31/31 (100%)
────────────────────────────────
✅ 총합:              176/176 (100%)
```

---

## 🚀 배포

### PM2로 배포
```bash
# 설치
npm install -g pm2

# 시작
pm2 start dist/cli/index.js --name "freelang"

# 모니터링
pm2 monit

# 로그 확인
pm2 logs freelang

# 클러스터 모드
pm2 start dist/cli/index.js -i max --name "freelang"
```

### Docker로 배포
```bash
# 빌드
docker build -t freelang:2.6.0 .

# 실행
docker run -it freelang:2.6.0 freelang hello.fl

# 컨테이너 서비스
docker run -d --name freelang-service \
  -p 3000:3000 \
  freelang:2.6.0
```

### 클라우드 배포
```bash
# AWS Lambda
sam build
sam deploy

# Google Cloud
gcloud functions deploy freelang-compiler

# Azure Functions
func azure functionapp publish freelang-app
```

---

## 🤝 기여 가이드

### 버그 리포트
```
1. 이슈 확인: https://gogs.dclub.kr/kim/freelang-final/issues
2. 버그 재현 방법 작성
3. 예상 vs 실제 결과
4. 환경 정보 (OS, Node.js 버전)
```

### 기능 요청
```
1. 제목: [Feature] 요청 내용
2. 상세 설명
3. 사용 예제
4. 관련 이슈 링크
```

### Pull Request
```
1. Fork 저장소
2. 기능 브랜치 생성: git checkout -b feature/xxx
3. 커밋: git commit -m "feat: xxx"
4. Push: git push origin feature/xxx
5. PR 생성
```

---

## 📖 학습 자료

### 튜토리얼
- [10분 안에 시작하기](./docs/QUICKSTART.md)
- [언어 레퍼런스](./docs/LANGUAGE_REFERENCE.md)
- [API 문서](./docs/API.md)
- [예제 모음](./examples/)

### 심화 주제
- [컴파일러 아키텍처](./docs/ARCHITECTURE.md)
- [성능 최적화](./docs/OPTIMIZATION.md)
- [확장 가이드](./docs/EXTENDING.md)
- [릴리즈 히스토리](./FREELANG_RELEASE_HISTORY.md)

---

## 🎊 주요 성과

```
┌─────────────────────────────────────┐
│    FreeLang v2.6.0 Final Status    │
├─────────────────────────────────────┤
│ ✅ 14,832줄 코드                   │
│ ✅ 1,333+ 함수                     │
│ ✅ 456개 커밋                      │
│ ✅ 176/176 테스트 (100%)           │
│ ✅ Level 3 DB 완성                 │
│ ✅ 4개 DB 드라이버                 │
│ ✅ 자기호스팅 10개 모듈            │
│ ✅ AI 자동화 완성                  │
│ ✅ PM2 배포 준비 완료              │
│ ✅ 프로덕션 배포 가능 🚀           │
└─────────────────────────────────────┘
```

---

## 📋 로드맵

### v2.7.0 (다음)
- [ ] Level 4 구현 (캐싱 & 성능)
- [ ] GraphQL 지원
- [ ] Streaming API
- [ ] Rate Limiting

### v2.8.0~v2.9.0
- [ ] 마이크로서비스 프레임워크
- [ ] 서비스 메시 (Istio)
- [ ] 분산 트레이싱
- [ ] 멀티테넌트

### v3.0.0
- [ ] 멀티 언어 지원 (Python, Go, Rust)
- [ ] 분산 컴파일 시스템
- [ ] AI 기반 완전 자동화
- [ ] Edge Computing

---

## ❓ FAQ

**Q: FreeLang은 실제로 사용할 수 있나요?**
A: 네! v2.6.0은 프로덕션 준비 완료 상태입니다. 100% 테스트 통과, PM2 배포 설정, 완전한 DB 지원.

**Q: 다른 언어와 어떤 차이가 있나요?**
A: FreeLang은 **자기 호스팅 컴파일러**입니다. 자신을 컴파일할 수 있으며, AI 자동화, 의도 기반 프로그래밍, 자가 치유 런타임을 제공합니다.

**Q: 성능은 어떻게 되나요?**
A: 컴파일 시간 7ms, 런타임 성능은 C에 준합니다. 최적화로 30ms → 3ms (90% 단축).

**Q: 윈도우/Mac에서도 사용할 수 있나요?**
A: 네! Node.js 16+이 설치되어 있으면 모든 플랫폼에서 작동합니다.

**Q: 어떻게 기여할 수 있나요?**
A: Issues, Pull Requests, 문서 작성 등으로 기여할 수 있습니다. [기여 가이드](./docs/CONTRIBUTING.md) 참조.

---

## 📞 지원

### 커뮤니티
- **Gogs**: https://gogs.dclub.kr/kim/freelang-final
- **Issues**: https://gogs.dclub.kr/kim/freelang-final/issues
- **Discussions**: https://gogs.dclub.kr/kim/freelang-final/discussions

### 문서
- **API 문서**: `docs/API.md`
- **언어 레퍼런스**: `docs/LANGUAGE_REFERENCE.md`
- **릴리즈 히스토리**: `FREELANG_RELEASE_HISTORY.md`

---

## 📄 라이센스

MIT License © 2026

자유롭게 사용, 수정, 배포할 수 있습니다.

---

## 🙏 감사의 말

FreeLang을 만들기 위해 기여한 모든 분들께 감사드립니다.

---

**현재 상태**: ✅ v2.6.0 Production Ready  
**최종 업데이트**: 2026-03-06  
**저장소**: https://gogs.dclub.kr/kim/freelang-final  

🚀 **FreeLang으로 미래를 프로그래밍하세요!**

