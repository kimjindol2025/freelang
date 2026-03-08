const { ProgramRunner } = require('./dist/cli/runner');

const tests = [
  { code: 'let x = (5)', name: 'Simple paren' },
  { code: 'let x = (5 + 3)', name: 'Expr in paren' },
  { code: 'for v in [1,2,3] { let x = (v) }', name: 'For + paren' },
  { code: 'let s = 0; for v in [1,2,3] { let x = (v); s = s + x }; s', name: 'For + paren + use' },
  { code: 'let arr = [1,2,3]; let variance_sum = 0; for val in arr { let diff = (val - 2); variance_sum = variance_sum + (diff * diff) }; variance_sum', name: 'Complex (robot AI)' },
];

const runner = new ProgramRunner();
let passed = 0;
let failed = 0;

console.log('🧪 Parser Bug Fix Tests\n');

tests.forEach((test, idx) => {
  try {
    const result = runner.runString(test.code);
    const ir = runner.getIR(test.code);
    
    if (!result.error) {
      console.log(`✅ [${idx + 1}] ${test.name}`);
      console.log(`   Result: ${result.output}, IR length: ${ir.length}`);
      passed++;
    } else {
      console.log(`❌ [${idx + 1}] ${test.name}`);
      console.log(`   Error: ${result.error.substring(0, 50)}, IR length: ${ir.length}`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ [${idx + 1}] ${test.name}`);
    console.log(`   Exception: ${err.message.substring(0, 50)}`);
    failed++;
  }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
