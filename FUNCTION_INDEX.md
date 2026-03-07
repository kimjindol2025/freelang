# Phase F: 함수 인덱스 (115개)

## MySQL Driver (30개)

### 연결 관리 (3개)
1. `mysql_connect(host, port, user, password, database) -> MySQLConnection`
2. `mysql_is_connected(conn) -> bool`
3. `mysql_close(conn) -> void`

### CRUD 작업 (5개)
4. `mysql_query(conn, sql, params) -> MySQLResult`
5. `mysql_exec(conn, sql, params) -> MySQLResult`
6. `mysql_one(conn, sql, params) -> map`
7. `mysql_all(conn, sql, params) -> array`
8. `mysql_count(conn, table, where, params) -> int`

### 트랜잭션 (3개)
9. `mysql_begin(conn) -> bool`
10. `mysql_commit(conn) -> bool`
11. `mysql_rollback(conn) -> bool`

### 테이블 관리 (7개)
12. `mysql_create_table(conn, table, schema) -> bool`
13. `mysql_drop_table(conn, table) -> bool`
14. `mysql_truncate_table(conn, table) -> bool`
15. `mysql_table_exists(conn, table) -> bool`
16. `mysql_add_column(conn, table, column, dataType) -> bool`
17. `mysql_drop_column(conn, table, column) -> bool`
18. `mysql_info(conn) -> map`

### 마이그레이션 (4개)
19. `mysql_init_migrations(conn) -> bool`
20. `mysql_get_migrations(conn) -> array`
21. `mysql_record_migration(conn, name, batch) -> bool`
22. `mysql_rollback_migration(conn, name) -> bool`

### 연결 풀 (3개)
23. `mysql_pool_create(..., maxConnections) -> MySQLConnectionPool`
24. `mysql_pool_get(pool) -> MySQLConnection`
25. `mysql_pool_release(pool, conn) -> void`

---

## PostgreSQL Driver (35개)

### 연결 관리 (4개)
26. `pg_connect(host, port, user, password, database) -> PostgreSQLConnection`
27. `pg_connect_url(url) -> PostgreSQLConnection`
28. `pg_is_connected(conn) -> bool`
29. `pg_close(conn) -> void`

### CRUD 작업 (5개)
30. `pg_query(conn, sql, params) -> PostgreSQLResult`
31. `pg_exec(conn, sql, params) -> PostgreSQLResult`
32. `pg_one(conn, sql, params) -> map`
33. `pg_all(conn, sql, params) -> array`
34. `pg_count(conn, table, where, params) -> int`

### 트랜잭션 (5개)
35. `pg_begin(conn) -> bool`
36. `pg_commit(conn) -> bool`
37. `pg_rollback(conn) -> bool`
38. `pg_savepoint(conn, name) -> bool`
39. `pg_rollback_to_savepoint(conn, name) -> bool`

### 테이블 관리 (8개)
40. `pg_create_table(conn, table, schema) -> bool`
41. `pg_drop_table(conn, table) -> bool`
42. `pg_truncate_table(conn, table) -> bool`
43. `pg_table_exists(conn, table) -> bool`
44. `pg_list_tables(conn) -> array`
45. `pg_table_columns(conn, table) -> array`
46. `pg_set_schema(conn, schema) -> bool`
47. `pg_info(conn) -> map`

### 인덱스 관리 (2개)
48. `pg_create_index(conn, indexName, table, column) -> bool`
49. `pg_drop_index(conn, indexName) -> bool`

### 마이그레이션 (4개)
50. `pg_init_migrations(conn) -> bool`
51. `pg_get_migrations(conn) -> array`
52. `pg_record_migration(conn, name, batch) -> bool`
53. `pg_rollback_migration(conn, name) -> bool`

### 연결 풀 (3개)
54. `pg_pool_create(..., maxConnections) -> PostgreSQLConnectionPool`
55. `pg_pool_get(pool) -> PostgreSQLConnection`
56. `pg_pool_release(pool, conn) -> void`

---

## Redis Driver (50개)

### 연결 관리 (5개)
57. `redis_connect(host, port) -> RedisConnection`
58. `redis_connect_auth(host, port, password) -> RedisConnection`
59. `redis_select_db(conn, db) -> bool`
60. `redis_ping(conn) -> bool`
61. `redis_close(conn) -> void`

### String 작업 (10개)
62. `redis_get(conn, key) -> string`
63. `redis_set(conn, key, value) -> bool`
64. `redis_set_ex(conn, key, value, seconds) -> bool`
65. `redis_getdel(conn, key) -> string`
66. `redis_exists(conn, key) -> bool`
67. `redis_del(conn, key) -> bool`
68. `redis_del_multiple(conn, keys) -> int`
69. `redis_expire(conn, key, seconds) -> bool`
70. `redis_ttl(conn, key) -> int`
71. `redis_persist(conn, key) -> bool`

### Counter 작업 (4개)
72. `redis_incr(conn, key) -> int`
73. `redis_incrby(conn, key, value) -> int`
74. `redis_decr(conn, key) -> int`
75. `redis_decrby(conn, key, value) -> int`

### Hash 작업 (6개)
76. `redis_hset(conn, key, field, value) -> bool`
77. `redis_hget(conn, key, field) -> string`
78. `redis_hgetall(conn, key) -> map`
79. `redis_hdel(conn, key, field) -> bool`
80. `redis_hexists(conn, key, field) -> bool`
81. `redis_hlen(conn, key) -> int`

### List 작업 (6개)
82. `redis_lpush(conn, key, value) -> int`
83. `redis_rpush(conn, key, value) -> int`
84. `redis_lpop(conn, key) -> string`
85. `redis_rpop(conn, key) -> string`
86. `redis_llen(conn, key) -> int`
87. `redis_lrange(conn, key, start, stop) -> array`

### Set 작업 (5개)
88. `redis_sadd(conn, key, member) -> bool`
89. `redis_srem(conn, key, member) -> bool`
90. `redis_smembers(conn, key) -> array`
91. `redis_sismember(conn, key, member) -> bool`
92. `redis_scard(conn, key) -> int`

### Sorted Set 작업 (4개)
93. `redis_zadd(conn, key, score, member) -> bool`
94. `redis_zrange(conn, key, start, stop) -> array`
95. `redis_zrem(conn, key, member) -> bool`
96. `redis_zcard(conn, key) -> int`

### DB 관리 (5개)
97. `redis_flushdb(conn) -> bool`
98. `redis_flushall(conn) -> bool`
99. `redis_keys(conn, pattern) -> array`
100. `redis_scan(conn, cursor) -> map`
101. `redis_info(conn) -> map`

### 연결 풀 (3개)
102. `redis_pool_create(host, port, maxConnections) -> RedisConnectionPool`
103. `redis_pool_get(pool) -> RedisConnection`
104. `redis_pool_release(pool, conn) -> void`

---

## ORM 통합 (15개 추가)

### 데이터베이스 연결 (7개)
105. `mysql(host, port, user, password, database) -> Connection`
106. `postgresql(host, port, user, password, database) -> Connection`
107. `postgresql_url(url) -> Connection`
108. `redis(host, port) -> Connection`
109. `redis_auth(host, port, password) -> Connection`
110. `close(conn) -> void`
111. `ping(conn) -> bool`

### 연결 풀 (3개)
112. `mysql_pool(..., maxConnections) -> Connection`
113. `postgresql_pool(..., maxConnections) -> Connection`
114. `redis_pool(host, port, maxConnections) -> Connection`

### 통합 쿼리 (1개)
115. `execute_query(conn, sql, params) -> QueryResult`

---

## 요약

| 카테고리 | MySQL | PostgreSQL | Redis | ORM | 합계 |
|---------|--------|-----------|--------|-----|------|
| 연결 관리 | 3 | 4 | 5 | 7 | 19 |
| CRUD | 5 | 5 | - | - | 10 |
| 트랜잭션 | 3 | 5 | - | - | 8 |
| 데이터 구조 | - | - | 25 | - | 25 |
| 테이블/DB 관리 | 7 | 10 | - | - | 17 |
| 인덱스 | - | 2 | - | - | 2 |
| 마이그레이션 | 4 | 4 | - | - | 8 |
| 연결 풀 | 3 | 3 | 3 | 3 | 12 |
| 통합/기타 | - | - | - | 8 | 8 |
| **총계** | 30 | 35 | 50 | 15 | **115** |

---

## 구조체 (9개)

### MySQL
1. `MySQLConnection`
2. `MySQLConnectionPool`
3. `MySQLResult`

### PostgreSQL
4. `PostgreSQLConnection`
5. `PostgreSQLConnectionPool`
6. `PostgreSQLResult`

### Redis
7. `RedisConnection`
8. `RedisConnectionPool`
9. `RedisResult`

---

**Generated**: 2026-03-06
**Total Functions**: 115
**Total Structs**: 9
**Status**: ✅ Complete
