#!/usr/bin/env node

/**
 * Phase 2: Test function return values
 */

const { ProgramRunner } = require('./dist/cli/runner');

const tests = [
  { name: 'Simple return', code: 'fn add(a, b) { return a + b } add(3, 4)' },
  { name: 'Implicit return', code: 'fn add(a, b) { a + b } add(3, 4)' },
  { name: 'Function with expression', code: 'fn mul(x, y) { x * y } mul(5, 6)' },
  { name: 'Function with variables', code: 'fn compute(n) { let x = n * 2; x + 1 } compute(10)' }
];

console.log('🧪 Phase 2: Function Return Values\n');

const runner = new ProgramRunner();

for (const test of tests) {
  console.log(`▶ ${test.name}`);
  console.log(`  Code: ${test.code.substring(0, 70)}${test.code.length > 70 ? '...' : ''}`);

  const result = runner.runString(test.code);

  if (result.success || !result.error.includes('Error')) {
    console.log(`  ✅ Result: ${result.output}`);
  } else {
    console.log(`  ❌ Error: ${result.error}`);
  }
  console.log();
}
