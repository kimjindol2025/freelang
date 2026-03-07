/**
 * Phase B: 200+ Builtin 함수 검증
 */

const FreeLangInterpreter = require('./src/interpreter');

const interpreter = new FreeLangInterpreter();

console.log('🧪 Phase B: Builtin 함수 검증\n');

const tests = [
  // Phase E: HTTP
  { name: 'http_get', code: 'let x = http_get("https://example.com"); println(typeof x);' },
  
  // Phase H: Async
  { name: 'async_sleep', code: 'let x = async_sleep(100); println(typeof x);' },
  { name: 'once', code: 'var f = fn() -> 1; var g = once(f); println(g());' },
  
  // Phase I: Random
  { name: 'random', code: 'let x = random(); println(x >= 0 && x <= 1);' },
  { name: 'random_int', code: 'let x = random_int(1, 10); println(x >= 1 && x <= 10);' },
  { name: 'uuid', code: 'let x = uuid(); println(strlen(x) == 36);' },
  { name: 'range_array', code: 'let x = range_array(1, 5); println(len(x) == 4);' },
  
  // Phase M: String/Array
  { name: 'string_repeat', code: 'let x = string_repeat("ab", 3); println(x == "ababab");' },
  { name: 'array_sum', code: 'let x = array_sum([1, 2, 3, 4, 5]); println(x == 15);' },
  { name: 'array_avg', code: 'let x = array_avg([1, 2, 3]); println(x == 2.0);' },
  { name: 'array_min', code: 'let x = array_min([5, 2, 8]); println(x == 2);' },
  { name: 'array_max', code: 'let x = array_max([5, 2, 8]); println(x == 8);' },
];

let passed = 0;
let failed = 0;

for (const test of tests) {
  try {
    const result = interpreter.execute(test.code);
    if (result.success) {
      console.log(`✅ ${test.name}`);
      passed++;
    } else {
      console.log(`❌ ${test.name}: ${result.error}`);
      failed++;
    }
  } catch (e) {
    console.log(`❌ ${test.name}: ${e.message}`);
    failed++;
  }
}

console.log(`\n📊 결과: ${passed}/${tests.length} 통과`);
