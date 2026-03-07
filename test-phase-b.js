const { ProgramRunner } = require('./dist/cli/runner');

const tests = [
  // Map functions
  { code: 'map_new()', name: 'map_new' },
  
  // File functions
  { code: 'file_exists("/tmp")', name: 'file_exists' },
  
  // OS functions  
  { code: 'os_platform()', name: 'os_platform' },
  { code: 'os_arch()', name: 'os_arch' },
  { code: 'os_time()', name: 'os_time' },
  { code: 'os_cwd()', name: 'os_cwd' },
  
  // Array functions
  { code: 'arr_some([1,2,3], fn(x) { return x > 2 })', name: 'arr_some' },
  { code: 'arr_index_of([1,2,3], 2)', name: 'arr_index_of' },
];

const runner = new ProgramRunner();
let passed = 0;
let failed = 0;

console.log('🧪 Phase B Function Tests\n');

tests.forEach((test, idx) => {
  try {
    const result = runner.runString(test.code);
    if (!result.error) {
      console.log(`✅ [${idx + 1}] ${test.name}: ${result.output}`);
      passed++;
    } else {
      console.log(`❌ [${idx + 1}] ${test.name}: ${result.error.substring(0, 50)}`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ [${idx + 1}] ${test.name}: ${err.message.substring(0, 50)}`);
    failed++;
  }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
