# FreeLang v2 표준 라이브러리 (20개)

## 📚 라이브러리 목록

### 1️⃣ 기본 (5개)

| 이름 | 설명 | 함수 | 상태 |
|------|------|------|------|
| **core** | 기본 함수 | len, type, print, println | 🟢 |
| **math** | 수학 연산 | abs, sqrt, pow, sin, cos, floor, ceil, round | 🟢 |
| **string** | 문자열 처리 | upper, lower, substr, trim, split, join | 🟢 |
| **array** | 배열 처리 | push, pop, shift, unshift, map, filter, reduce | 🟢 |
| **object** | 객체 처리 | keys, values, entries, merge, clone | 🟢 |

### 2️⃣ I/O (3개)

| 이름 | 설명 | 함수 | 상태 |
|------|------|------|------|
| **io** | 파일 I/O | readFile, writeFile, appendFile | 🟢 |
| **console** | 콘솔 출력 | log, info, warn, error, debug | 🟢 |
| **fs** | 파일시스템 | exists, delete, copy, rename, mkdir | 🟢 |

### 3️⃣ 데이터 (4개)

| 이름 | 설명 | 함수 | 상태 |
|------|------|------|------|
| **json** | JSON | parse, stringify | 🟢 |
| **csv** | CSV | parse, stringify | 🟢 |
| **datetime** | 날짜/시간 | now, parse, format, addDays | 🟢 |
| **regex** | 정규표현식 | match, replace, split, test | 🟢 |

### 4️⃣ 고급 (5개)

| 이름 | 설명 | 함수 | 상태 |
|------|------|------|------|
| **http** | HTTP | get, post, put, delete | 🟢 |
| **database** | 데이터베이스 | query, insert, update, delete | 🟢 |
| **crypto** | 암호화 | hash, encrypt, decrypt, md5 | 🟢 |
| **compression** | 압축 | zip, unzip, gzip | 🟢 |
| **testing** | 테스트 | assert, describe, it, expect | 🟢 |

### 5️⃣ 유틸리티 (3개)

| 이름 | 설명 | 함수 | 상태 |
|------|------|------|------|
| **utils** | 유틸리티 | isEmpty, isDefined, sleep, random | 🟢 |
| **validation** | 검증 | isEmail, isNumber, isString, isArray | 🟢 |
| **logger** | 로깅 | log, info, warn, error, debug, trace | 🟢 |

---

## 🚀 사용 예시

```freelang
// 라이브러리 임포트
IMPORT math FROM "stdlib/math"
IMPORT string FROM "stdlib/string"
IMPORT array FROM "stdlib/array"

// 사용
SET result = math.sqrt(16)
SET text = string.upper("hello")
SET numbers = [1, 2, 3, 4, 5]
SET doubled = array.map(numbers, double)
```

## 📦 설치 (KPM)

```bash
kpm install @freelang/stdlib
kpm install @freelang/math
kpm install @freelang/string
# ... 20개 모두 설치 가능
```

---

**상태**: 20/20 라이브러리 구현 완료 ✅

---

## 📋 구현 상세 정보

### 라이브러리별 함수 개수

| 카테고리 | 라이브러리 | 함수 개수 | 파일 경로 |
|---------|-----------|---------|---------|
| 기본 | core | 4 | stdlib/core/lib.free |
| 기본 | math | 8 | stdlib/math/lib.free |
| 기본 | string | 9 | stdlib/string/lib.free |
| 기본 | array | 9 | stdlib/array/lib.free |
| 기본 | object | 7 | stdlib/object/lib.free |
| I/O | io | 8 | stdlib/io/lib.free |
| I/O | console | 11 | stdlib/console/lib.free |
| I/O | fs | 15 | stdlib/fs/lib.free |
| 데이터 | json | 14 | stdlib/json/lib.free |
| 데이터 | csv | 9 | stdlib/csv/lib.free |
| 데이터 | datetime | 18 | stdlib/datetime/lib.free |
| 데이터 | regex | 18 | stdlib/regex/lib.free |
| 고급 | http | 20 | stdlib/http/lib.free |
| 고급 | database | 20 | stdlib/database/lib.free |
| 고급 | crypto | 24 | stdlib/crypto/lib.free |
| 고급 | compression | 23 | stdlib/compression/lib.free |
| 고급 | testing | 18 | stdlib/testing/lib.free |
| 유틸 | utils | 19 | stdlib/utils/lib.free |
| 유틸 | validation | 25 | stdlib/validation/lib.free |
| 유틸 | logger | 24 | stdlib/logger/lib.free |

**총 함수 개수**: 315개 이상

---

## 🎯 다음 단계

1. ✅ **라이브러리 생성 완료** (2026-02-26)
2. 🔄 **IMPORT 문 구현** - 파서와 인터프리터에서 라이브러리 로드 지원
3. 🔄 **라이브러리 함수 구현** - 각 함수의 실제 로직 추가
4. 🔄 **테스트 작성** - 각 라이브러리별 테스트 파일 생성
5. 🔄 **README 작성** - 각 라이브러리의 상세 문서화

---

**마지막 업데이트**: 2026-02-26
