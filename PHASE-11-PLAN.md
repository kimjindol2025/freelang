# Phase 11: Cryptography Module (암호화 모듈)

## 🎯 목표

블록체인 및 금융 코인에 필수적인 암호화 기능 구현

---

## 📊 구현 계획

### 1️⃣ Hash Functions (해시 함수)

**개념**: 임의 길이 데이터 → 고정 길이 해시값

```
HASH data, "SHA256" → "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3"
HASH data, "MD5"    → "5d41402abc4b2a76b9719d911017c592"
HASH data, "SHA1"   → "356a192b7913b04c54574d18c28d46e6395428ab"
```

**메커니즘**:
- SHA256, SHA1, MD5 해시 알고리즘
- 데이터 무결성 검증
- 블록헤더 해싱

### 2️⃣ Symmetric Encryption (대칭 암호화)

**개념**: 동일 키로 암호화/복호화

```
ENCRYPT "sensitive data", "myPassword", "AES-256" → "encrypted_hex"
DECRYPT "encrypted_hex", "myPassword", "AES-256" → "sensitive data"
```

**메커니즘**:
- AES-128, AES-192, AES-256 (CBC, ECB, GCM 모드)
- IV (Initialization Vector) 자동 생성
- PKCS7 패딩

### 3️⃣ Digital Signatures (전자 서명)

**개념**: 메시지 진위성 및 부인 거절 불가능성 보장

```
SIGN message, privateKey, "RSA" → signature
VERIFY message, signature, publicKey, "RSA" → true/false
```

**메커니즘**:
- RSA-2048, RSA-4096
- ECDSA (타원곡선)
- 서명 생성 및 검증

### 4️⃣ Key Management (키 관리)

**개념**: 암호화 키 생성 및 저장

```
KEYGEN "RSA", 2048 → { publicKey, privateKey }
KEYGEN "ECDSA" → { publicKey, privateKey }
```

**메커니즘**:
- PEM 형식 키 저장
- 키 쌍 생성
- 키 로드/저장

---

## 🔧 구현 단계

### Phase 11-A: Lexer & Parser

**Lexer**:
- `HASH` 키워드
- `ENCRYPT`, `DECRYPT` 키워드
- `SIGN`, `VERIFY` 키워드
- `KEYGEN` 키워드

**Parser**:
- `parseHashStatement()`: HASH data, "algorithm"
- `parseEncryptStatement()`: ENCRYPT data, key, "algorithm"
- `parseDecryptStatement()`: DECRYPT data, key, "algorithm"
- `parseSignStatement()`: SIGN message, privateKey, "algorithm"
- `parseVerifyStatement()`: VERIFY message, signature, publicKey, "algorithm"
- `parseKeygenStatement()`: KEYGEN "algorithm", size

**AST Node Types**:
```typescript
type CryptoStatement =
  | HashStatement
  | EncryptStatement
  | DecryptStatement
  | SignStatement
  | VerifyStatement
  | KeygenStatement
```

### Phase 11-B: Runtime Implementation

**Built-in Functions**:
```typescript
// Hash
crypto.createHash(algorithm).update(data).digest('hex')

// Symmetric Encryption
crypto.createCipher() / createDecipher()

// Digital Signatures
crypto.createSign() / createVerify()

// Key Generation
crypto.generateKeyPairSync()
```

**Interpreter Methods**:
```typescript
executeHash(node, context)
executeEncrypt(node, context)
executeDecrypt(node, context)
executeSign(node, context)
executeVerify(node, context)
executeKeygen(node, context)
```

---

## 🧪 테스트 케이스

### Test 1: SHA256 Hashing
```freelang
SET hash = HASH "hello world", "SHA256"
PRINT hash  // a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3
```

### Test 2: AES Encryption
```freelang
SET encrypted = ENCRYPT "secret", "password123", "AES-256"
SET decrypted = DECRYPT encrypted, "password123", "AES-256"
ASSERT decrypted == "secret", "Decryption failed"
```

### Test 3: RSA Signatures
```freelang
SET keys = KEYGEN "RSA", 2048
SET message = "financial transaction"
SET signature = SIGN message, keys.privateKey, "RSA"
ASSERT VERIFY message, signature, keys.publicKey, "RSA", "Invalid signature"
```

### Test 4: Multiple Hash Algorithms
```freelang
SET data = "blockchain"
SET sha256 = HASH data, "SHA256"
SET sha1 = HASH data, "SHA1"
SET md5 = HASH data, "MD5"
ASSERT sha256 != sha1, "Different algorithms produce different hashes"
```

---

## 📈 성공 기준

### Phase 11-A: Lexer & Parser
- ✅ HASH, ENCRYPT, DECRYPT, SIGN, VERIFY, KEYGEN 키워드 인식
- ✅ CryptoStatement AST 생성
- ✅ 파싱 테스트 6/6 통과

### Phase 11-B: Runtime
- ✅ crypto 모듈 적분 (Node.js)
- ✅ 모든 암호화 함수 구현
- ✅ 실행 테스트 4/4 통과

**전체 테스트**: 10/10 통과

---

## 📝 구현 전략

### 1. Node.js Crypto Module 활용

```typescript
import * as crypto from 'crypto';

// SHA256 해싱
const hash = crypto.createHash('sha256')
  .update('hello')
  .digest('hex');

// AES 암호화
const cipher = crypto.createCipher('aes-256-cbc', password);
let encrypted = cipher.update(data, 'utf8', 'hex');
encrypted += cipher.final('hex');

// RSA 서명
const sign = crypto.createSign('RSA-SHA256');
sign.update(message);
const signature = sign.sign(privateKey, 'hex');
```

### 2. ExecutionContext 확장

```typescript
interface ExecutionContext {
  // ...existing fields...
  cryptoKeys?: Map<string, KeyPair>;  // 키 저장소
  cryptoHashes?: Map<string, string>;  // 해시 캐시
}

interface KeyPair {
  publicKey: string;
  privateKey: string;
  algorithm: string;
}
```

### 3. Error Handling

```typescript
class CryptoError extends Error {
  constructor(message: string) {
    super(`CryptoError: ${message}`);
  }
}
```

---

## 🚀 예상 소요 시간

| 단계 | 예상 시간 |
|------|---------:|
| Phase 11-A (Lexer/Parser) | 30분 |
| Phase 11-B (Runtime) | 1시간 |
| 테스트 & 검증 | 30분 |
| **총 소요** | **2시간** |

---

## 📚 참고 자료

- **Node.js Crypto**: https://nodejs.org/api/crypto.html
- **RSA**: https://en.wikipedia.org/wiki/RSA_(cryptosystem)
- **AES**: https://en.wikipedia.org/wiki/Advanced_Encryption_Standard
- **ECDSA**: https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm

---

## 🔗 관련 Phase

- Phase 7: Retry Logic ✅
- Phase 8: Semaphore/Mutex ✅
- Phase 9: Streaming & Performance ✅
- Phase 10: Production Hardening ✅
- **Phase 11: Cryptography Module** ← 현재
- Phase 12: Blockchain Core (다음)
- Phase 13: Smart Contracts
- Phase 14: Exchange API

---

## 💡 금융 코인 로드맵

```
Phase 11 (Crypto)
    ↓
Phase 12 (Blockchain)
    ↓
Phase 13 (Smart Contracts)
    ↓
Phase 14 (Exchange API)
    ↓
금융 코인 v1.0 완성! 🚀
```
