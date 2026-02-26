# FreeLang v2 표준 라이브러리 (stdlib)

FreeLang v2의 표준 라이브러리 모음입니다. 20개의 라이브러리로 구성되어 있으며, 기본 기능부터 고급 기능까지 모두 포함합니다.

## 📚 라이브러리 카테고리

### 1️⃣ 기본 라이브러리 (Core Libraries) - 5개

프로그램의 기본이 되는 필수 라이브러리입니다.

#### `core` - 기본 함수
- `len(arr)` - 배열/문자열 길이
- `type(value)` - 값의 타입 반환
- `print(msg)` - 메시지 출력
- `println(msg)` - 메시지 출력 (줄바꿈 포함)

#### `math` - 수학 연산
- `abs(n)` - 절댓값
- `pow(base, exp)` - 거듭제곱
- `sqrt(n)` - 제곱근
- `floor(n)`, `ceil(n)`, `round(n)` - 올림/내림/반올림
- `min(a, b)`, `max(a, b)` - 최소값/최대값

#### `string` - 문자열 처리
- `upper(str)`, `lower(str)` - 대문자/소문자 변환
- `trim(str)` - 공백 제거
- `length(str)` - 문자열 길이
- `substr(str, start, len)` - 부분 문자열
- `split(str, delimiter)` - 문자열 분할
- `join(arr, delimiter)` - 배열을 문자열로 결합
- `contains(str, search)` - 포함 여부 확인
- `replace(str, search, replacement)` - 문자열 치환

#### `array` - 배열 처리
- `push(arr, item)` - 끝에 요소 추가
- `pop(arr)` - 끝에서 요소 제거
- `shift(arr)` - 처음에서 요소 제거
- `unshift(arr, item)` - 처음에 요소 추가
- `map(arr, fn)` - 배열 변환
- `filter(arr, fn)` - 배열 필터링
- `reduce(arr, fn, initial)` - 배열 축약
- `includes(arr, item)` - 요소 포함 여부
- `reverse(arr)` - 배열 역순

#### `object` - 객체 처리
- `keys(obj)` - 객체의 키 배열
- `values(obj)` - 객체의 값 배열
- `entries(obj)` - 객체의 [키, 값] 쌍 배열
- `merge(obj1, obj2)` - 객체 병합
- `clone(obj)` - 객체 복사
- `hasKey(obj, key)` - 키 존재 여부
- `isEmpty(obj)` - 빈 객체 여부

---

### 2️⃣ I/O 라이브러리 (Input/Output) - 3개

파일과 콘솔 입출력을 담당합니다.

#### `io` - 입출력 기본
- `readInput(prompt)` - 사용자 입력 받기
- `readLine()` - 한 줄 읽기
- `writeOutput(text)` - 출력
- `flush()` - 버퍼 비우기
- `readFromString(str, delimiter)` - 문자열 분할
- `writeToString(arr, delimiter)` - 배열을 문자열로 변환
- `getInputSize(input)` - 입력 크기
- `truncateOutput(text, maxLength)` - 출력 크기 제한

#### `console` - 콘솔 출력
- `log(msg)` - 일반 로그
- `info(msg)` - 정보 로그
- `warn(msg)` - 경고 로그
- `error(msg)` - 에러 로그
- `debug(msg)` - 디버그 로그
- `trace(msg)` - 추적 로그
- `clear()` - 콘솔 초기화
- `getTime()` - 현재 시간
- `beep()` - 경고음
- `setColor(r, g, b)` - 색상 설정
- `resetColor()` - 색상 초기화

#### `fs` - 파일 시스템
- `exists(path)` - 파일 존재 여부
- `readFile(path)` - 파일 읽기
- `writeFile(path, content)` - 파일 쓰기
- `appendFile(path, content)` - 파일에 추가
- `deleteFile(path)` - 파일 삭제
- `copyFile(source, destination)` - 파일 복사
- `renameFile(oldPath, newPath)` - 파일 이름 변경
- `mkdir(path)` - 디렉토리 생성
- `rmdir(path)` - 디렉토리 삭제
- `listDir(path)` - 디렉토리 목록
- `isFile(path)`, `isDirectory(path)` - 파일/디렉토리 판단
- `getFileSize(path)` - 파일 크기
- `getModTime(path)` - 수정 시간
- `getAbsPath(path)` - 절대 경로

---

### 3️⃣ 데이터 라이브러리 (Data Processing) - 4개

데이터 형식 처리 및 변환을 담당합니다.

#### `json` - JSON 처리
- `parse(jsonStr)` - JSON 문자열 파싱
- `stringify(obj)` - 객체를 JSON 문자열로 변환
- `parseArray(jsonArr)` - JSON 배열 파싱
- `stringifyArray(arr)` - 배열을 JSON 문자열로 변환
- `isValid(jsonStr)` - JSON 유효성 검사
- `getPath(obj, path)` - 경로로 값 조회
- `setPath(obj, path, value)` - 경로로 값 설정
- `deletePath(obj, path)` - 경로로 값 삭제
- `merge(obj1, obj2)` - JSON 객체 병합
- `clone(obj)` - JSON 객체 복사
- `keys(obj)`, `values(obj)` - 객체 키/값 조회
- `isEmpty(obj)` - 빈 객체 여부

#### `csv` - CSV 처리
- `parse(csvStr)` - CSV 문자열 파싱
- `parseWithHeader(csvStr)` - 헤더 포함 파싱
- `stringify(data)` - CSV 문자열로 변환
- `escapeField(field)` - 필드 이스케이핑
- `unescapeField(field)` - 필드 언스케이핑
- `getColumn(data, columnIndex)` - 열 조회
- `getRow(data, rowIndex)` - 행 조회
- `transpose(data)` - 행열 변환

#### `datetime` - 날짜/시간 처리
- `now()` - 현재 시간
- `timestamp()` - 타임스탬프
- `parse(dateStr)` - 날짜 문자열 파싱
- `format(timestamp, format)` - 날짜 형식화
- `year(ts)`, `month(ts)`, `day(ts)`, `hour(ts)`, `minute(ts)`, `second(ts)` - 각 요소 추출
- `addDays(ts, days)`, `addHours(ts, hours)`, `addMinutes(ts, minutes)`, `addSeconds(ts, seconds)` - 시간 계산
- `diffDays(ts1, ts2)`, `diffHours(ts1, ts2)` - 시간 차이
- `isLeapYear(year)` - 윤년 판단
- `daysInMonth(year, month)` - 월의 날짜 수
- `getWeekday(ts)` - 요일
- `getWeekNumber(ts)` - 주차

#### `regex` - 정규표현식
- `test(pattern, str)` - 패턴 매치 테스트
- `match(pattern, str)` - 첫 매치 찾기
- `matchAll(pattern, str)` - 모든 매치 찾기
- `replace(pattern, str, replacement)` - 첫 번째 교체
- `replaceAll(pattern, str, replacement)` - 모두 교체
- `split(pattern, str)` - 패턴으로 분할
- `exec(pattern, str)` - 상세 실행
- `isValid(pattern)` - 패턴 유효성
- `escape(str)` - 특수 문자 이스케이핑
- `flags(pattern)` - 패턴 플래그
- `source(pattern)` - 패턴 소스
- `createPattern(pattern)` - 패턴 생성
- `createPatternWithFlags(pattern, flags)` - 플래그와 함께 패턴 생성
- `matchCount(pattern, str)` - 매치 개수
- `findFirst(pattern, str)` - 첫 매치
- `findLast(pattern, str)` - 마지막 매치

---

### 4️⃣ 고급 라이브러리 (Advanced) - 5개

네트워크, 데이터베이스, 보안 등 고급 기능을 제공합니다.

#### `http` - HTTP 클라이언트
- `get(url)`, `post(url, data)`, `put(url, data)`, `delete(url)`, `patch(url, data)`, `head(url)` - HTTP 메서드
- `request(method, url, options)` - 일반 요청
- `setHeader(name, value)` - 헤더 설정
- `getHeader(response, name)` - 헤더 조회
- `getStatus(response)` - 상태 코드
- `getBody(response)` - 응답 본문
- `parseJSON(response)` - JSON 파싱
- `setTimeout(ms)` - 타임아웃 설정
- `setMaxRetries(count)` - 재시도 설정
- `encodeURL(str)`, `decodeURL(str)` - URL 인코딩/디코딩
- `buildQuery(params)` - 쿼리 문자열 생성
- `parseQuery(queryStr)` - 쿼리 문자열 파싱

#### `database` - 데이터베이스
- `connect(connectionString)` - 연결
- `disconnect(connection)` - 연결 해제
- `query(connection, sql)` - 쿼리 실행
- `queryOne(connection, sql)` - 단일 행 조회
- `insert(connection, table, data)` - 삽입
- `update(connection, table, data, where)` - 업데이트
- `delete(connection, table, where)` - 삭제
- `beginTransaction(connection)` - 트랜잭션 시작
- `commit(connection)` - 커밋
- `rollback(connection)` - 롤백
- `prepare(connection, sql)` - 준비 명령문
- `bind(stmt, index, value)` - 바인드
- `execute(stmt)` - 실행
- `close(stmt)` - 종료
- `getLastId(connection)` - 마지막 ID
- `getRowCount(connection)` - 행 개수
- `getColumnNames(connection, table)` - 열 이름
- `createTable(connection, table, schema)` - 테이블 생성
- `dropTable(connection, table)` - 테이블 삭제
- `escape(connection, str)` - SQL 이스케이핑

#### `crypto` - 암호화
- `md5(str)`, `sha1(str)`, `sha256(str)`, `sha512(str)` - 해시 함수
- `hash(algorithm, str)` - 일반 해시
- `hmac(algorithm, message, key)` - HMAC
- `encrypt(algorithm, plaintext, key)` - 암호화
- `decrypt(algorithm, ciphertext, key)` - 복호화
- `encryptAES(plaintext, key)`, `decryptAES(ciphertext, key)` - AES
- `generateKey(length)` - 키 생성
- `randomBytes(length)` - 난수 바이트
- `randomString(length)` - 난수 문자열
- `randomInt(min, max)` - 난수 정수
- `bcryptHash(password, rounds)` - Bcrypt 해시
- `bcryptCompare(password, hash)` - Bcrypt 비교
- `base64Encode(str)`, `base64Decode(str)` - Base64
- `hexEncode(str)`, `hexDecode(str)` - 16진수
- `urlEncode(str)`, `urlDecode(str)` - URL 인코딩

#### `compression` - 압축
- `compress(data)`, `decompress(data)` - 일반 압축
- `gzip(data)`, `gunzip(data)` - GZIP
- `deflate(data)`, `inflate(data)` - DEFLATE
- `zipFiles(files, outputPath)` - ZIP 파일 생성
- `unzipFile(zipPath, outputPath)` - ZIP 추출
- `tarFiles(files, outputPath)` - TAR 파일 생성
- `untarFile(tarPath, outputPath)` - TAR 추출
- `brotliCompress(data)`, `brotliDecompress(data)` - Brotli
- `lz4Compress(data)`, `lz4Decompress(data)` - LZ4
- `getCompressionRatio(original, compressed)` - 압축률
- `getCompressedSize(data)` - 압축 크기
- `getOriginalSize(data)` - 원본 크기
- `canCompress(data)` - 압축 가능 여부
- `listFiles(zipPath)` - ZIP 파일 목록
- `extractFile(zipPath, fileName, outputPath)` - 특정 파일 추출

#### `testing` - 테스트
- `describe(name, callback)` - 테스트 그룹
- `it(name, callback)` - 테스트 케이스
- `beforeEach(callback)` - 각 테스트 전
- `afterEach(callback)` - 각 테스트 후
- `before(callback)` - 그룹 시작 전
- `after(callback)` - 그룹 종료 후
- `assert(condition, message)` - 기본 단언
- `assertEqual(actual, expected, message)` - 동등성 검사
- `assertNotEqual(actual, expected, message)` - 부등성 검사
- `assertTrue(value, message)`, `assertFalse(value, message)` - 참/거짓
- `assertNull(value, message)`, `assertNotNull(value, message)` - NULL 검사
- `assertThrows(callback, message)` - 예외 발생 검사
- `assertDoesNotThrow(callback, message)` - 예외 미발생 검사
- `skip(name)` - 테스트 스킵
- `only(name)` - 특정 테스트만 실행
- `run()` - 테스트 실행
- `getSummary()` - 결과 요약
- `getResults()` - 상세 결과

---

### 5️⃣ 유틸리티 라이브러리 (Utilities) - 3개

실용적인 도구 모음입니다.

#### `utils` - 유틸리티 함수
- `isEmpty(value)` - 비어있는지 확인
- `isDefined(value)` - 정의되었는지 확인
- `isArray(value)`, `isObject(value)`, `isString(value)`, `isNumber(value)`, `isBoolean(value)` - 타입 검사
- `sleep(ms)` - 대기
- `random()` - 0~1 난수
- `randomInt(min, max)` - 범위 내 난수
- `randomChoice(arr)` - 배열에서 임의 선택
- `shuffle(arr)` - 배열 섞기
- `unique(arr)` - 중복 제거
- `flatten(arr)` - 평탄화
- `groupBy(arr, keyFunc)` - 그룹핑
- `memoize(func)` - 메모이제이션

#### `validation` - 검증
- `isEmail(str)` - 이메일 형식
- `isPhone(str)` - 전화번호 형식
- `isURL(str)` - URL 형식
- `isIPAddress(str)` - IP 주소 형식
- `isUUID(str)` - UUID 형식
- `isJSON(str)` - JSON 형식
- `isInteger(value)`, `isFloat(value)` - 숫자 타입
- `isPositive(value)`, `isNegative(value)` - 부호 검사
- `isEven(value)`, `isOdd(value)` - 짝수/홀수
- `isBetween(value, min, max)` - 범위 검사
- `isLengthBetween(str, min, max)` - 길이 범위
- `isAlphanumeric(str)` - 영숫자
- `isAlphabetic(str)` - 문자만
- `isNumeric(str)` - 숫자만
- `hasSpecialChars(str)` - 특수문자 포함
- `isStrongPassword(str)` - 강한 비밀번호
- `validate(obj, schema)` - 스키마 검증

#### `logger` - 로깅
- `createLogger(name)` - 로거 생성
- `log(logger, level, message)` - 로그 기록
- `debug(logger, message)`, `info(logger, message)`, `warn(logger, message)`, `error(logger, message)`, `fatal(logger, message)`, `trace(logger, message)` - 레벨별 로깅
- `setLevel(logger, level)` - 로그 레벨 설정
- `getLevel(logger)` - 로그 레벨 조회
- `addHandler(logger, handler)` - 핸들러 추가
- `removeHandler(logger, handler)` - 핸들러 제거
- `setFormatter(logger, format)` - 포맷 설정
- `getFormatter(logger)` - 포맷 조회
- `flush(logger)` - 버퍼 비우기
- `close(logger)` - 로거 종료
- `logWithContext(logger, level, message, context)` - 컨텍스트 로깅
- `logException(logger, exception)` - 예외 로깅
- `setOutput(logger, outputPath)` - 출력 경로 설정
- `getOutput(logger)` - 출력 경로 조회
- `setMaxSize(logger, size)` - 최대 크기 설정
- `rotate(logger)` - 로그 회전

---

## 🚀 사용 방법

### 라이브러리 임포트 (예정)

```freelang
IMPORT math FROM "stdlib/math"
IMPORT string FROM "stdlib/string"
IMPORT array FROM "stdlib/array"
```

### 기본 사용 예시

```freelang
// 문자열 처리
SET text = "hello world"
SET upper_text = upper(text)
PRINT upper_text

// 배열 처리
SET arr = [1, 2, 3, 4, 5]
SET sum = reduce(arr, add, 0)
PRINT sum

// 수학 연산
SET result = sqrt(16)
PRINT result
```

---

## 📖 각 라이브러리별 상세 문서

- [core - 기본 함수](./core/README.md)
- [math - 수학 연산](./math/README.md)
- [string - 문자열 처리](./string/README.md)
- [array - 배열 처리](./array/README.md)
- [object - 객체 처리](./object/README.md)
- [io - 입출력](./io/README.md)
- [console - 콘솔](./console/README.md)
- [fs - 파일 시스템](./fs/README.md)
- [json - JSON](./json/README.md)
- [csv - CSV](./csv/README.md)
- [datetime - 날짜/시간](./datetime/README.md)
- [regex - 정규표현식](./regex/README.md)
- [http - HTTP](./http/README.md)
- [database - 데이터베이스](./database/README.md)
- [crypto - 암호화](./crypto/README.md)
- [compression - 압축](./compression/README.md)
- [testing - 테스트](./testing/README.md)
- [utils - 유틸리티](./utils/README.md)
- [validation - 검증](./validation/README.md)
- [logger - 로깅](./logger/README.md)

---

## 📊 통계

| 항목 | 값 |
|------|-----|
| 총 라이브러리 | 20개 |
| 총 함수 | 315개+ |
| 기본 라이브러리 | 5개 (37개 함수) |
| I/O 라이브러리 | 3개 (34개 함수) |
| 데이터 라이브러리 | 4개 (59개 함수) |
| 고급 라이브러리 | 5개 (105개 함수) |
| 유틸리티 라이브러리 | 3개 (68개 함수) |

---

**최종 업데이트**: 2026-02-26
**버전**: 1.0.0
**상태**: ✅ 20/20 라이브러리 완성
