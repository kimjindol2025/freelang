# Team F 함수 참고서

모든 110개 함수의 상세 레퍼런스입니다.

---

## 📚 목차

1. [hash](#hash) - 해시 함수 (5개)
2. [aes](#aes) - 암호화 (5개)
3. [hmac](#hmac) - 메시지 인증 (5개)
4. [jwt-utils](#jwt-utils) - JWT 토큰 (5개)
5. [argon2](#argon2) - 패스워드 해싱 (4개)
6. [scrypt](#scrypt) - KDF (3개)
7. [sign](#sign) - 디지털 서명 (4개)
8. [random-bytes](#random-bytes) - 난수 생성 (5개)
9. [process](#process) - 프로세스 (6개)
10. [signal](#signal) - 신호 처리 (4개)
11. [memory](#memory) - 메모리 정보 (4개)
12. [cpu](#cpu) - CPU 정보 (4개)
13. [disk](#disk) - 디스크 정보 (4개)
14. [network-iface](#network-iface) - 네트워크 (4개)
15. [locale](#locale) - 로케일 (3개)
16. [currency](#currency) - 통화 (4개)
17. [units](#units) - 단위 변환 (5개)
18. [color](#color) - 색상 (5개)
19. [qrcode](#qrcode) - QR 코드 (3개)
20. [encoding-ext](#encoding-ext) - 인코딩 (5개)
21. [zlib](#zlib) - 압축 (4개)
22. [password](#password) - 패스워드 (6개)

---

## 1. hash

### hash_md5(data: string) → string
MD5 해시 생성 (32자 16진수)
```freelang
let h = hash_md5("hello world");
// "5eb63bbbe01eeed093cb22bb8f5acdc3"
```

### hash_sha1(data: string) → string
SHA-1 해시 생성 (40자 16진수)
```freelang
let h = hash_sha1("hello world");
// "2aae6c35c94fcfb415dbe95f408b9ce91ee846ed"
```

### hash_sha256(data: string) → string
SHA-256 해시 생성 (64자 16진수)
```freelang
let h = hash_sha256("hello world");
// "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
```

### hash_sha512(data: string) → string
SHA-512 해시 생성 (128자 16진수)
```freelang
let h = hash_sha512("hello world");
// "309ecc489c12d6eb4cc40f50c902f2b4d0ed77ee511a7c7a9bcd3ca86d4cd86f989dd35bc5ff499670da34255b45b0cfd830e81f605dcf7dc5542e93ae9cd76f"
```

### hash_blake2b(data: string, salt?: string) → string
BLAKE2B 해시 생성 (Node.js 14+)
```freelang
let h = hash_blake2b("hello", "salt123");
```

---

## 2. aes

### aes_create_key(length?: number) → string
AES 키 생성 (16/24/32 바이트)
```freelang
let key = aes_create_key(32);  // 32 바이트 = 256비트
```

### aes_encrypt(plaintext: string, key: string, iv?: string) → object
AES-256-CBC 암호화
```freelang
let key = aes_create_key(32);
let result = aes_encrypt("secret message", key);
// {ciphertext: "...", iv: "...", algorithm: "aes-256-cbc"}
```

### aes_decrypt(ciphertext: string, key: string, iv: string) → string | null
AES-256-CBC 복호화
```freelang
let decrypted = aes_decrypt(result.ciphertext, key, result.iv);
// "secret message"
```

### aes_encrypt_gcm(plaintext: string, key: string, aad?: string) → object
AES-256-GCM 암호화 (인증 포함)
```freelang
let result = aes_encrypt_gcm("secure data", key);
// {ciphertext: "...", iv: "...", authTag: "...", algorithm: "aes-256-gcm"}
```

### aes_decrypt_gcm(ciphertext: string, key: string, iv: string, authTag: string) → string | null
AES-256-GCM 복호화
```freelang
let decrypted = aes_decrypt_gcm(result.ciphertext, key, result.iv, result.authTag);
```

---

## 3. hmac

### hmac_sha256(message: string, key: string) → string
HMAC-SHA256 생성
```freelang
let sig = hmac_sha256("message", "secret_key");
// "43d6e6c9c46bbb7b4fe6f7f8c8f8e0b0..."
```

### hmac_sha512(message: string, key: string) → string
HMAC-SHA512 생성
```freelang
let sig = hmac_sha512("message", "secret_key");
```

### hmac_verify(message: string, key: string, signature: string) → boolean
HMAC 검증 (timing-safe)
```freelang
let valid = hmac_verify("message", "secret_key", sig);
// true
```

### hmac_create(message: string, key: string, algorithm?: string) → string
커스텀 알고리즘 HMAC
```freelang
let sig = hmac_create("message", "key", "sha512");
```

### hmac_base64(message: string, key: string) → string
Base64 인코딩 HMAC
```freelang
let sig = hmac_base64("message", "key");
// "Ba5sFo...="
```

---

## 4. jwt-utils

### jwt_sign(payload: object, secret: string, options?: object) → string
JWT 토큰 생성
```freelang
let token = jwt_sign(
  {"user_id": 123, "username": "alice"},
  "secret_key",
  {"expiresIn": 3600}
);
// "eyJhbGc...Cg=="
```

### jwt_verify(token: string, secret: string) → object | null
JWT 검증
```freelang
let payload = jwt_verify(token, "secret_key");
if (payload != null) {
  print("User ID:", payload.user_id);
}
```

### jwt_decode(token: string, verify?: boolean) → object
JWT 디코딩 (서명 검증 없음)
```freelang
let decoded = jwt_decode(token);
// {header: {...}, payload: {...}, valid: true}
```

### jwt_refresh(token: string, secret: string, expiresIn?: number) → string | null
JWT 갱신
```freelang
let newToken = jwt_refresh(token, "secret", 7200);
```

### jwt_extract_claim(token: string, claimName: string) → any
특정 클레임 추출
```freelang
let userId = jwt_extract_claim(token, "user_id");
```

---

## 5. argon2

### argon2_hash(password: string, saltRounds?: number) → object
패스워드 해싱 (PBKDF2)
```freelang
let hash = argon2_hash("myPassword123", 10);
// {hash: "...", salt: "...", algorithm: "pbkdf2-sha512", iterations: 100000}
```

### argon2_verify(password: string, stored: object) → boolean
패스워드 검증
```freelang
let valid = argon2_verify("myPassword123", hash);
```

### argon2_default_options() → object
기본 옵션 조회
```freelang
let opts = argon2_default_options();
// {time: 3, memory: 4096, parallelism: 1, type: "id"}
```

### argon2_needs_rehash(hash: object, options?: object) → boolean
재해싱 필요 여부
```freelang
let needsRehash = argon2_needs_rehash(hash, {iterations: 150000});
```

---

## 6. scrypt

### scrypt_derive(password: string, salt: string, keylen?: number, n?: number, r?: number, p?: number) → string | null
키 파생 함수
```freelang
let key = scrypt_derive("password", "salt123", 32, 16384, 8, 1);
// 32바이트 키 생성
```

### scrypt_verify(password: string, stored: object) → boolean
Scrypt 검증
```freelang
let valid = scrypt_verify("password", stored);
```

### scrypt_hash(password: string) → object
저장용 Scrypt 해싱
```freelang
let hash = scrypt_hash("password");
// {hash: "...", salt: "...", N: 16384, r: 8, p: 1}
```

---

## 7. sign

### sign_generate_keypair(algorithm?: string) → object
RSA/EC 키 쌍 생성
```freelang
let keypair = sign_generate_keypair("rsa");  // 또는 "ec"
// {privateKey: "-----BEGIN...", publicKey: "-----BEGIN...", algorithm: "rsa"}
```

### sign_message(message: string, privateKey: string) → string | null
메시지 서명
```freelang
let signature = sign_message("hello world", keypair.privateKey);
```

### sign_verify(message: string, signature: string, publicKey: string) → boolean
서명 검증
```freelang
let valid = sign_verify("hello world", signature, keypair.publicKey);
// true
```

### sign_sign_file(filepath: string, privateKey: string) → string | null
파일 서명
```freelang
let fileSig = sign_sign_file("/path/to/file", keypair.privateKey);
```

---

## 8. random-bytes

### random_bytes(length?: number) → string
무작위 바이트 생성 (16진수)
```freelang
let randomData = random_bytes(32);
// "a1b2c3d4e5f6..."
```

### random_hex(length?: number) → string
16진수 무작위 문자열
```freelang
let hex = random_hex(16);
```

### random_base64(length?: number) → string
Base64 무작위 문자열
```freelang
let b64 = random_base64(32);
```

### random_uuid(version?: number) → string
UUID 생성 (v4)
```freelang
let uuid = random_uuid(4);
// "f47ac10b-58cc-4372-a567-0e02b2c3d479"
```

### random_string(length?: number, charset?: string) → string
커스텀 문자셋 무작위 문자열
```freelang
let code = random_string(6, "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
// "ABC123"
```

---

## 9. process

### proc_pid() → number
현재 프로세스 ID
```freelang
let pid = proc_pid();
// 12345
```

### proc_uptime() → number
프로세스 실행 시간 (초)
```freelang
let uptime = proc_uptime();
// 120.5
```

### proc_exec(command: string, options?: object) → object
명령어 동기 실행
```freelang
let result = proc_exec("echo 'hello'");
// {stdout: "hello\n", stderr: "", exitCode: 0}
```

### proc_spawn(command: string, args?: array) → object
프로세스 비동기 생성
```freelang
let proc = proc_spawn("node", ["script.js"]);
// {processId: "proc_...", pid: 12346}
```

### proc_kill(processId: string, signal?: string) → boolean
프로세스 종료
```freelang
let killed = proc_kill(proc.processId, "SIGTERM");
```

### proc_get_output(processId: string) → object | null
프로세스 출력 조회
```freelang
let output = proc_get_output(proc.processId);
// {stdout: "...", stderr: "", exitCode: 0, closed: true}
```

---

## 10. signal

### signal_register(signalName: string, handler: function) → boolean
신호 핸들러 등록
```freelang
signal_register("SIGTERM", fn(sig) {
  print("Received signal:", sig);
});
```

### signal_remove(signalName: string) → boolean
신호 핸들러 제거
```freelang
signal_remove("SIGTERM");
```

### signal_send(pid: number, signal?: string) → boolean
프로세스에 신호 전송
```freelang
signal_send(12345, "SIGTERM");
```

### signal_list() → array
지원 신호 목록
```freelang
let signals = signal_list();
// ["SIGHUP", "SIGINT", "SIGQUIT", ...]
```

---

## 11. memory

### mem_usage() → object
프로세스 메모리 사용량 (MB)
```freelang
let mem = mem_usage();
// {rss: 50, heapTotal: 40, heapUsed: 25, external: 2, arrayBuffers: 1}
```

### mem_total() → number
전체 시스템 메모리 (MB)
```freelang
let total = mem_total();
// 8192
```

### mem_free() → number
사용 가능 메모리 (MB)
```freelang
let free = mem_free();
// 2048
```

### mem_percent_used() → number
메모리 사용률 (%)
```freelang
let percent = mem_percent_used();
// 75.0
```

---

## 12. cpu

### cpu_count() → number
CPU 코어 수
```freelang
let cores = cpu_count();
// 8
```

### cpu_model() → string
CPU 모델명
```freelang
let model = cpu_model();
// "Intel(R) Core(TM) i7-9700K"
```

### cpu_usage() → object
CPU 사용 시간 (마이크로초)
```freelang
let usage = cpu_usage();
// {user: 1000, system: 500}
```

### cpu_speed() → number
CPU 주파수 (MHz)
```freelang
let speed = cpu_speed();
// 3600
```

---

## 13. disk

### disk_total(path?: string) → number
전체 디스크 용량 (GB)
```freelang
let total = disk_total("/");
// 500
```

### disk_used(path?: string) → number
사용한 디스크 용량 (GB)
```freelang
let used = disk_used("/");
// 300
```

### disk_free(path?: string) → number
남은 디스크 용량 (GB)
```freelang
let free = disk_free("/");
// 200
```

### disk_percent_used(path?: string) → number
디스크 사용률 (%)
```freelang
let percent = disk_percent_used("/");
// 60
```

---

## 14. network-iface

### net_interfaces() → array
네트워크 인터페이스 목록
```freelang
let ifaces = net_interfaces();
// ["lo", "eth0", "wlan0"]
```

### net_ip_v4(ifaceName?: string) → string | null
IPv4 주소
```freelang
let ipv4 = net_ip_v4("eth0");
// "192.168.1.100"
```

### net_ip_v6(ifaceName?: string) → string | null
IPv6 주소
```freelang
let ipv6 = net_ip_v6("eth0");
// "fe80::1"
```

### net_mac_address(ifaceName?: string) → string | null
MAC 주소
```freelang
let mac = net_mac_address("eth0");
// "00:11:22:33:44:55"
```

---

## 15. locale

### locale_current() → string
현재 로케일
```freelang
let locale = locale_current();
// "en_US.UTF-8"
```

### locale_set(locale: string) → boolean
로케일 설정
```freelang
locale_set("ko_KR.UTF-8");
```

### locale_format_number(num: number, locale?: string) → string
로케일 기반 숫자 포맷
```freelang
let formatted = locale_format_number(1234.56, "en-US");
// "1,234.56"
let formatted_kr = locale_format_number(1234.56, "ko-KR");
// "1,234.56"
```

---

## 16. currency

### currency_format(amount: number, currency: string, locale?: string) → string
통화 포맷
```freelang
let formatted = currency_format(1234.56, "USD");
// "$1,234.56"
let formatted_kr = currency_format(1234.56, "KRW");
// "₩1,235"
```

### currency_convert(amount: number, fromCurrency: string, toCurrency: string, rate: number) → number
환율 변환
```freelang
let inEuros = currency_convert(100, "USD", "EUR", 0.92);
// 92.0
```

### currency_list() → array
지원 통화 목록
```freelang
let currencies = currency_list();
// ["USD", "EUR", "JPY", "GBP", ...]
```

### currency_exchange_rates() → object
환율 테이블
```freelang
let rates = currency_exchange_rates();
// {USD: 1.0, EUR: 0.92, JPY: 149.5, ...}
```

---

## 17. units

### units_length(value: number, from: string, to: string) → number
길이 단위 변환
```freelang
let meters = units_length(100, "cm", "m");
// 1.0
let miles = units_length(1, "km", "mi");
// 0.6214
```
**지원 단위**: mm, cm, m, km, in, ft, yd, mi

### units_weight(value: number, from: string, to: string) → number
무게 단위 변환
```freelang
let kg = units_weight(2.2, "lb", "kg");
// 1.0
```
**지원 단위**: mg, g, kg, oz, lb, ton

### units_temperature(value: number, from: string, to: string) → number
온도 변환
```freelang
let celsius = units_temperature(32, "F", "C");
// 0.0
let kelvin = units_temperature(0, "C", "K");
// 273.15
```
**지원 단위**: C (Celsius), F (Fahrenheit), K (Kelvin)

### units_volume(value: number, from: string, to: string) → number
부피 단위 변환
```freelang
let liters = units_volume(1, "gal", "l");
// 3.785
```
**지원 단위**: ml, l, gal, pt, cup, fl_oz

### units_area(value: number, from: string, to: string) → number
면적 단위 변환
```freelang
let sqMeters = units_area(100, "ft2", "m2");
// 9.29
```
**지원 단위**: mm2, cm2, m2, km2, in2, ft2, mi2

---

## 18. color

### color_hex_to_rgb(hex: string) → object
HEX → RGB 변환
```freelang
let rgb = color_hex_to_rgb("#FF5733");
// {r: 255, g: 87, b: 51}
```

### color_rgb_to_hex(r: number, g: number, b: number) → string
RGB → HEX 변환
```freelang
let hex = color_rgb_to_hex(255, 87, 51);
// "#FF5733"
```

### color_lighten(hex: string, ratio: number) → string
색상 밝게 (0-1)
```freelang
let lighter = color_lighten("#333333", 0.3);
// "#565656"
```

### color_darken(hex: string, ratio: number) → string
색상 어둡게 (0-1)
```freelang
let darker = color_darken("#FFFFFF", 0.3);
// "#B2B2B2"
```

### color_invert(hex: string) → string
색상 반전
```freelang
let inverted = color_invert("#FF5733");
// "#00A8CC"
```

---

## 19. qrcode

### qrcode_create(data: string, options?: object) → object
QR 코드 생성
```freelang
let qr = qrcode_create("https://example.com");
// {data: "https://example.com", size: 21, ...}
```

### qrcode_generate_url(data: string, size?: number) → string
QR 코드 URL (외부 API)
```freelang
let url = qrcode_generate_url("https://example.com", 200);
// "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=..."
```

### qrcode_encode(data: string) → string
Base64 인코딩
```freelang
let encoded = qrcode_encode("hello");
// "aGVsbG8="
```

---

## 20. encoding-ext

### encoding_base64_encode(str: string) → string
Base64 인코딩
```freelang
let encoded = encoding_base64_encode("hello world");
// "aGVsbG8gd29ybGQ="
```

### encoding_base64_decode(str: string) → string
Base64 디코딩
```freelang
let decoded = encoding_base64_decode("aGVsbG8gd29ybGQ=");
// "hello world"
```

### encoding_base64url_encode(str: string) → string
Base64URL 인코딩
```freelang
let encoded = encoding_base64url_encode("hello");
// "aGVsbG8"
```

### encoding_hex_encode(str: string) → string
16진수 인코딩
```freelang
let hex = encoding_hex_encode("hello");
// "68656c6c6f"
```

### encoding_hex_decode(str: string) → string
16진수 디코딩
```freelang
let decoded = encoding_hex_decode("68656c6c6f");
// "hello"
```

---

## 21. zlib

### zlib_compress(data: string) → string
DEFLATE 압축 (Base64)
```freelang
let compressed = zlib_compress("hello world hello world");
// "eJwrKs4vyEkvLLEoq8xLL8nPSUsBAOMCGR0="
```

### zlib_decompress(data: string) → string | null
DEFLATE 압축 해제
```freelang
let decompressed = zlib_decompress(compressed);
// "hello world hello world"
```

### zlib_gzip_compress(data: string) → string
GZIP 압축 (Base64)
```freelang
let gzipped = zlib_gzip_compress("large data");
// "H4sIAPz...=="
```

### zlib_gzip_decompress(data: string) → string | null
GZIP 압축 해제
```freelang
let ungzipped = zlib_gzip_decompress(gzipped);
// "large data"
```

---

## 22. password

### password_hash(password: string) → object
패스워드 해싱
```freelang
let hash = password_hash("MySecurePass123!");
// {hash: "...", salt: "...", algorithm: "pbkdf2-sha512", iterations: 100000}
```

### password_verify(password: string, stored: object) → boolean
패스워드 검증
```freelang
let valid = password_verify("MySecurePass123!", hash);
// true
```

### password_generate(length?: number, options?: object) → string
무작위 패스워드 생성
```freelang
let pwd = password_generate(16);
// "aB3cDeFgHiJkLmNo"
let pwd_no_sym = password_generate(16, {symbols: false});
// "aB3cDeFgHiJkLmNo"
```

### password_strength(password: string) → object
패스워드 강도 분석
```freelang
let strength = password_strength("SecurePass123!");
// {strength: 90, level: "strong", feedback: []}
let weak = password_strength("password");
// {strength: 20, level: "weak", feedback: ["너무 짧음", "대문자 필요", ...]}
```

### password_is_common(password: string) → boolean
일반 패스워드 판별
```freelang
let isCommon = password_is_common("password");
// true
let isCommon = password_is_common("SecurePass123!");
// false
```

---

## 🎯 빠른 참고

### 자주 사용하는 조합

#### 사용자 인증
```freelang
// 가입 시
let passwordHash = password_hash(userPassword);
db.insert("users", {username: username, password_hash: passwordHash.hash, password_salt: passwordHash.salt});

// 로그인 시
let stored = db.findOne("users", {username: username});
let valid = password_verify(inputPassword, {hash: stored.password_hash, salt: stored.password_salt, iterations: 100000});
```

#### API 토큰 발급
```freelang
let token = jwt_sign(
  {user_id: userId, role: "user"},
  API_SECRET,
  {expiresIn: 3600}  // 1시간
);
```

#### 데이터 암호화 저장
```freelang
let encrypted = aes_encrypt(sensitiveData, encryptionKey);
db.update("data", {
  id: id,
  ciphertext: encrypted.ciphertext,
  iv: encrypted.iv
});

// 복호화
let row = db.findOne("data", {id: id});
let original = aes_decrypt(row.ciphertext, encryptionKey, row.iv);
```

#### 파일 무결성 확인
```freelang
// 저장 시
let fileHash = hash_sha256(fileContent);
db.insert("files", {name: name, hash: fileHash});

// 검증 시
let currentHash = hash_sha256(fileContent);
let isValid = (currentHash == fileHash);
```

---

**마지막 업데이트**: 2026-03-06
**버전**: 1.0
