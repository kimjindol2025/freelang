# Phase E-G 병렬 실행 계획

## Phase E: 네트워크 함수 (HTTP, WebSocket)

### 목표: 20+ 네트워크 함수

**Agent E-1: HTTP 고급 기능**
- fetch(url, options): Promise<Response>
- fetch_json(url): Promise<any>
- http_stream_get(url, callback): Promise
- http_timeout(ms): 설정
- http_retry(count): 자동 재시도
- http_gzip(): 압축 지원
- http_auth_basic(user, pass): 인증
- http_auth_bearer(token): Bearer 토큰
- http_proxy(url): 프록시 설정
- http_cookies(): 쿠키 관리

**Agent E-2: WebSocket 함수**
- ws_connect(url): Promise<WebSocket>
- ws_send(ws, data): void
- ws_receive(ws): Promise<any>
- ws_on(ws, event, callback): void
- ws_close(ws): void
- ws_is_open(ws): bool
- ws_ping(ws): void
- ws_pong(ws): void
- ws_binary(ws, data): void
- ws_heartbeat(ws, interval): void

---

## Phase F: 데이터베이스 드라이버

### 목표: 3개 DB 드라이버 (30+ 함수)

**Agent F-1: SQLite 드라이버**
- db_open_sqlite(path): Database
- db_execute(db, query): Result
- db_query(db, sql, params): Array<Row>
- db_query_one(db, sql, params): Row | null
- db_insert(db, table, data): i32
- db_update(db, table, where, data): i32
- db_delete(db, table, where): i32
- db_transaction(db, fn): any
- db_close(db): void
- db_backup(db, path): void

**Agent F-2: PostgreSQL 드라이버**
- pg_connect(config): Database
- pg_query(db, sql, params): Promise<Array<Row>>
- pg_query_one(db, sql, params): Promise<Row | null>
- pg_insert(db, table, data): Promise<i32>
- pg_update(db, table, where, data): Promise<i32>
- pg_delete(db, table, where): Promise<i32>
- pg_pool_create(config): Pool
- pg_pool_query(pool, sql): Promise<Array<Row>>
- pg_transaction(db, fn): Promise<any>
- pg_close(db): Promise<void>

**Agent F-3: MySQL 드라이버 + ORM**
- mysql_connect(config): Database
- mysql_query(db, sql, params): Promise<Array<Row>>
- mysql_insert_bulk(db, table, rows): Promise<Array<i32>>
- mysql_create_table(db, table, schema): Promise<void>
- mysql_drop_table(db, table): Promise<void>
- mysql_migrate(db, migrations): Promise<void>
- orm_define(name, schema): Model
- orm_find(model, where): Promise<Array<any>>
- orm_create(model, data): Promise<any>
- orm_update(model, id, data): Promise<any>

---

## Phase G: 완전 자체호스팅 (FreeLang으로 컴파일러 작성)

### 목표: FreeLang Lexer 자체작성 (bootstrap)

**Agent G-1: FreeLang Lexer (FreeLang으로 작성)**
- Character class detection (isAlpha, isDigit, etc.)
- Token type definitions
- Lexer state machine
- Token generation
- Error handling
- Position tracking (line, column)

**구현 대상:**
```
freelang-final/src/compiler/lexer-freeLang.fl (500줄)
- FreeLang으로 작성된 토크나이저
- 원본 lexer.fl과 호환
- 자체호스팅의 증거
```

---

## 실행 전략

### Round 1: 병렬 (3개 에이전트)
- E-1, E-2: 동시 (독립적)
- F-1, F-2, F-3: 동시 (일부 중복)
- G-1: 독립적 진행

### 예상 산출물
- **Phase E**: 20+ 함수 (stdlib-builtins.ts에 추가)
- **Phase F**: 30+ 함수 (db-drivers.ts 신규 파일)
- **Phase G**: 500줄 FreeLang 코드 (lexer-freeLang.fl)

### 예상 기간
- Phase E: 1-2시간
- Phase F: 2-3시간
- Phase G: 3-4시간

### 최종 목표
- **총 함수**: 201 + 20 + 30 = 251개
- **자체호스팅**: FreeLang이 자신의 Lexer를 작성
- **완전성**: 네트워크 + DB + 완전 자체호스팅

---

## 진행 상황 추적

- [ ] Phase E-1: HTTP 함수 (10개)
- [ ] Phase E-2: WebSocket 함수 (10개)
- [ ] Phase F-1: SQLite 드라이버 (10개)
- [ ] Phase F-2: PostgreSQL 드라이버 (10개)
- [ ] Phase F-3: MySQL + ORM (10개)
- [ ] Phase G-1: FreeLang Lexer (500줄)
- [ ] 통합 테스트
- [ ] 최종 커밋

