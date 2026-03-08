const { ProgramRunner } = require('./dist/cli/runner');

const tests = [
  // JSON 함수 (3개)
  { code: 'json_stringify([1,2,3])', name: 'json_stringify' },
  { code: 'json_parse("[1,2,3]")', name: 'json_parse' },
  { code: 'json_pretty({"a":1,"b":2})', name: 'json_pretty' },

  // Base64/인코딩 (4개)
  { code: 'base64_encode("hello")', name: 'base64_encode' },
  { code: 'base64_decode("aGVsbG8=")', name: 'base64_decode' },
  { code: 'hex_encode("hello")', name: 'hex_encode' },
  { code: 'hex_decode("68656c6c6f")', name: 'hex_decode' },

  // 암호화 함수 (5개)
  { code: 'crypto_sha256("hello")', name: 'crypto_sha256' },
  { code: 'crypto_md5("hello")', name: 'crypto_md5' },
  { code: 'crypto_hmac("secret", "message", "sha256")', name: 'crypto_hmac' },
  { code: 'crypto_random_bytes(16)', name: 'crypto_random_bytes' },
  { code: 'crypto_uuid()', name: 'crypto_uuid' },
];

const runner = new ProgramRunner();
let passed = 0;
let failed = 0;

console.log('🧪 Phase C - JSON/인코딩/암호화 함수 테스트\n');

tests.forEach((test, idx) => {
  try {
    const result = runner.runString(test.code);
    if (!result.error) {
      const output = String(result.output);
      const displayOutput = output.length > 50 ? output.substring(0, 50) + '...' : output;
      console.log(`✅ [${idx + 1}] ${test.name}`);
      console.log(`   → ${displayOutput}`);
      passed++;
    } else {
      console.log(`❌ [${idx + 1}] ${test.name}`);
      console.log(`   Error: ${result.error.substring(0, 60)}`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ [${idx + 1}] ${test.name}`);
    console.log(`   Exception: ${err.message.substring(0, 60)}`);
    failed++;
  }
});

console.log(`\n📊 결과: ${passed} 통과, ${failed} 실패 (총 ${tests.length}개)`);
console.log(`✨ Phase C 완성도: ${Math.round((passed / tests.length) * 100)}%`);
