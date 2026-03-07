# DB Drivers Quick Reference

## MySQL

### 연결 & 종료
```freeLang
let conn = mysql("localhost", 3306, "user", "pass", "db")
mysql_close(conn.mysqlConn)
```

### 기본 CRUD
```freeLang
// INSERT
mysql_exec(conn.mysqlConn, "INSERT INTO users (name) VALUES (?)", ["Alice"])

// SELECT
mysql_query(conn.mysqlConn, "SELECT * FROM users", [])
mysql_one(conn.mysqlConn, "SELECT * FROM users WHERE id=?", [1])

// UPDATE
mysql_exec(conn.mysqlConn, "UPDATE users SET name=? WHERE id=?", ["Bob", 1])

// DELETE
mysql_exec(conn.mysqlConn, "DELETE FROM users WHERE id=?", [1])
```

### 테이블 관리
```freeLang
mysql_create_table(conn.mysqlConn, "users", "id INT PRIMARY KEY, name VARCHAR(255)")
mysql_drop_table(conn.mysqlConn, "users")
mysql_table_exists(conn.mysqlConn, "users")
```

### 트랜잭션
```freeLang
mysql_begin(conn.mysqlConn)
mysql_exec(conn.mysqlConn, "INSERT ...", [])
mysql_commit(conn.mysqlConn)
// 또는 mysql_rollback(conn.mysqlConn)
```

### 연결 풀
```freeLang
let pool = mysql_pool_create("localhost", 3306, "user", "pass", "db", 10)
let conn = mysql_pool_get(pool)
mysql_pool_release(pool, conn)
```

---

## PostgreSQL

### 연결 & 종료
```freeLang
let conn = postgresql("localhost", 5432, "user", "pass", "db")
// 또는
let conn = postgresql_url("postgresql://user:pass@localhost/db")
pg_close(conn.pgConn)
```

### 기본 CRUD
```freeLang
// INSERT
pg_exec(conn.pgConn, "INSERT INTO users (name) VALUES ($1)", ["Alice"])

// SELECT
pg_query(conn.pgConn, "SELECT * FROM users", [])
pg_one(conn.pgConn, "SELECT * FROM users WHERE id=$1", [1])

// UPDATE
pg_exec(conn.pgConn, "UPDATE users SET name=$1 WHERE id=$2", ["Bob", 1])

// DELETE
pg_exec(conn.pgConn, "DELETE FROM users WHERE id=$1", [1])
```

### 테이블 관리
```freeLang
pg_create_table(conn.pgConn, "users", "id SERIAL PRIMARY KEY, name VARCHAR(255)")
pg_drop_table(conn.pgConn, "users")
pg_list_tables(conn.pgConn)
pg_table_columns(conn.pgConn, "users")
```

### 인덱스
```freeLang
pg_create_index(conn.pgConn, "idx_users_email", "users", "email")
pg_drop_index(conn.pgConn, "idx_users_email")
```

### 트랜잭션 + 세이브포인트
```freeLang
pg_begin(conn.pgConn)
pg_savepoint(conn.pgConn, "sp1")
pg_exec(conn.pgConn, "INSERT ...", [])

// 문제 발생 시
pg_rollback_to_savepoint(conn.pgConn, "sp1")

// 최종 결정
pg_commit(conn.pgConn)
// 또는 pg_rollback(conn.pgConn)
```

### 연결 풀
```freeLang
let pool = pg_pool_create("localhost", 5432, "user", "pass", "db", 10)
let conn = pg_pool_get(pool)
pg_pool_release(pool, conn)
```

---

## Redis

### 연결 & 종료
```freeLang
let cache = redis("127.0.0.1", 6379)
// 또는 (인증 필요 시)
let cache = redis_auth("127.0.0.1", 6379, "password")

redis_close(cache.redisConn)
```

### String (키-값)
```freeLang
// SET/GET
redis_set(cache.redisConn, "key", "value")
let val = redis_get(cache.redisConn, "key")

// SET with TTL (10초)
redis_set_ex(cache.redisConn, "session:123", "active", 10)

// EXISTS/DEL
redis_exists(cache.redisConn, "key")
redis_del(cache.redisConn, "key")

// EXPIRE/TTL
redis_expire(cache.redisConn, "key", 60)       // 60초 TTL 설정
let ttl = redis_ttl(cache.redisConn, "key")   // 남은 시간
redis_persist(cache.redisConn, "key")         // TTL 제거
```

### Counter
```freeLang
redis_incr(cache.redisConn, "counter")        // +1
redis_incrby(cache.redisConn, "counter", 5)   // +5
redis_decr(cache.redisConn, "counter")        // -1
redis_decrby(cache.redisConn, "counter", 3)   // -3
```

### Hash (객체)
```freeLang
// HSET/HGET
redis_hset(cache.redisConn, "user:1", "name", "Alice")
redis_hset(cache.redisConn, "user:1", "email", "alice@example.com")
let name = redis_hget(cache.redisConn, "user:1", "name")

// HGETALL (전체)
let user = redis_hgetall(cache.redisConn, "user:1")

// HLEN/HEXISTS/HDEL
redis_hlen(cache.redisConn, "user:1")
redis_hexists(cache.redisConn, "user:1", "name")
redis_hdel(cache.redisConn, "user:1", "email")
```

### List (큐)
```freeLang
// LPUSH/RPUSH (추가)
redis_lpush(cache.redisConn, "queue", "task1")  // 앞에 추가
redis_rpush(cache.redisConn, "queue", "task2")  // 뒤에 추가

// LPOP/RPOP (제거)
let task1 = redis_lpop(cache.redisConn, "queue")  // 앞에서 제거
let task2 = redis_rpop(cache.redisConn, "queue")  // 뒤에서 제거

// LLEN/LRANGE
redis_llen(cache.redisConn, "queue")
let tasks = redis_lrange(cache.redisConn, "queue", 0, 9)
```

### Set (중복 없는 모음)
```freeLang
// SADD/SREM
redis_sadd(cache.redisConn, "followers:alice", "bob")
redis_sadd(cache.redisConn, "followers:alice", "charlie")
redis_srem(cache.redisConn, "followers:alice", "bob")

// SMEMBERS/SISMEMBER/SCARD
let followers = redis_smembers(cache.redisConn, "followers:alice")
redis_sismember(cache.redisConn, "followers:alice", "bob")
redis_scard(cache.redisConn, "followers:alice")
```

### Sorted Set (점수 기반 순위)
```freeLang
// ZADD (멤버 추가)
redis_zadd(cache.redisConn, "leaderboard", 100, "alice")
redis_zadd(cache.redisConn, "leaderboard", 150, "bob")
redis_zadd(cache.redisConn, "leaderboard", 200, "charlie")

// ZRANGE (범위 조회) - 낮은 점수부터
let top3 = redis_zrange(cache.redisConn, "leaderboard", 0, 2)

// ZCARD/ZREM
redis_zcard(cache.redisConn, "leaderboard")
redis_zrem(cache.redisConn, "leaderboard", "alice")
```

### 기타
```freeLang
// KEYS (패턴으로 검색)
let keys = redis_keys(cache.redisConn, "user:*")

// DB 선택 (0-15)
redis_select_db(cache.redisConn, 1)

// PING (연결 확인)
redis_ping(cache.redisConn)

// INFO (서버 정보)
let info = redis_info(cache.redisConn)

// FLUSHDB (현재 DB 비우기)
redis_flushdb(cache.redisConn)
redis_flushall(cache.redisConn)  // 모든 DB 비우기
```

### 연결 풀
```freeLang
let pool = redis_pool_create("127.0.0.1", 6379, 10)
let conn = redis_pool_get(pool)
redis_pool_release(pool, conn)
```

---

## ORM 통합 쿼리 빌더 (SQL DB만)

```freeLang
import { mysql, select, where, insert, update, delete, all, first } from "../src/stdlib/orm"

// 연결
let conn = mysql("localhost", 3306, "user", "pass", "db")

// SELECT 빌더
let query = select(conn, "users") as builder
where(builder, "age > ?", 20)
where(builder, "status = ?", "active")
let users = all(builder)

// INSERT
let result = insert(conn, "users", { name: "Alice", age: 25 })

// UPDATE
let upd = update(conn, "users", { status: "inactive" })
where(upd, "age < ?", 18)
execute_update_where(upd)

// DELETE
let del = delete(conn, "users")
where(del, "status = ?", "deleted")
execute_delete_where(del)

// 첫 행만
let first_user = first(select(conn, "users"))
```

---

## 데이터 타입 대응

### MySQL → FreeLang
```
INT          → int
VARCHAR      → string
TEXT         → string
BOOLEAN      → bool
DATETIME     → string
JSON         → map
```

### PostgreSQL → FreeLang
```
INTEGER      → int
VARCHAR      → string
TEXT         → string
BOOLEAN      → bool
TIMESTAMP    → string
JSONB        → map
```

### Redis → FreeLang
```
string       → string
hash         → map
list         → array
set          → array
zset         → array (+ scores)
```

---

## 에러 처리

```freeLang
// MySQL
let result = mysql_query(conn.mysqlConn, "SELECT ...", [])
if !result.success {
  println("Error:", result.error)
}

// PostgreSQL
let result = pg_query(conn.pgConn, "SELECT ...", [])
if !result.success {
  println("Error:", result.error)
}

// Redis
let val = redis_get(conn.redisConn, "key")
if val == "" {
  println("Key not found or empty")
}
```

---

## 성능 팁

1. **연결 풀 사용** - 단일 연결보다 성능 우수
2. **배치 처리** - 여러 쿼리를 한 번에
3. **인덱스** - PostgreSQL에서 자주 사용되는 컬럼에
4. **Redis 캐싱** - DB 조회 결과를 캐시
5. **트랜잭션** - 복잡한 작업은 트랜잭션으로 묶기

---

## 예제 파일

- MySQL: `/examples/mysql-example.fl`
- PostgreSQL: `/examples/postgresql-example.fl`
- Redis: `/examples/redis-example.fl`

각 예제는 기본적인 사용법을 포함하고 있습니다.

---

**Generated**: 2026-03-06
**FreeLang v2 - Phase F**
