const { ProgramRunner } = require('./dist/cli/runner');

const tests = [
  // 테스트 함수 (2개)
  { code: 'assert(true, "should pass")', name: 'assert(true)' },
  { code: 'expect(5, 5)', name: 'expect(5,5)' },

  // 디버깅 함수 (4개)
  { code: 'debug_inspect([1,2,3])', name: 'debug_inspect' },
  { code: 'debug_stack_trace()', name: 'debug_stack_trace' },
  { code: 'debug_time("test")', name: 'debug_time' },
  { code: 'debug_time_end("test")', name: 'debug_time_end' },

  // 리플렉션 함수 (4개)
  { code: 'reflect_type_of([1,2,3])', name: 'reflect_type_of(array)' },
  { code: 'reflect_type_of(5)', name: 'reflect_type_of(number)' },
  { code: 'reflect_type_of("hello")', name: 'reflect_type_of(string)' },
  { code: 'reflect_type_of(null)', name: 'reflect_type_of(null)' },
];

const runner = new ProgramRunner();
let passed = 0;
let failed = 0;

console.log('🧪 Phase D - 테스트/디버깅/리플렉션 함수 테스트\n');

tests.forEach((test, idx) => {
  try {
    const result = runner.runString(test.code);
    if (!result.error) {
      const output = String(result.output);
      const displayOutput = output.length > 50 ? output.substring(0, 50) + '...' : output;
      console.log(`✅ [${idx + 1}] ${test.name}`);
      console.log(`   → ${displayOutput || '(void)'}`);
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
console.log(`✨ Phase D 완성도: ${Math.round((passed / tests.length) * 100)}%`);
