const { ProgramRunner } = require('./dist/cli/runner');

const tests = [
  // 수학 함수
  { code: 'sqrt(16)', expected: 4 },
  { code: 'ceil(3.2)', expected: 4 },
  { code: 'floor(3.7)', expected: 3 },
  { code: 'round(3.5)', expected: 4 },
  { code: 'abs(-5)', expected: 5 },
  { code: 'min(3, 5, 2)', expected: 2 },
  { code: 'max(3, 5, 2)', expected: 5 },
  // 문자열 함수
  { code: 'upper("hello")', expected: 'HELLO' },
  { code: 'lower("WORLD")', expected: 'world' },
];

const runner = new ProgramRunner();
let passed = 0;
let failed = 0;

console.log('🧪 Phase A Function Tests\n');

tests.forEach((test, idx) => {
  try {
    const result = runner.runString(test.code);
    const output = result.output;
    const success = output === test.expected;
    
    if (success) {
      console.log(`✅ [${idx + 1}] ${test.code} → ${output}`);
      passed++;
    } else {
      console.log(`❌ [${idx + 1}] ${test.code} → ${output} (expected: ${test.expected})`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ [${idx + 1}] ${test.code} → ERROR: ${err.message}`);
    failed++;
  }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
