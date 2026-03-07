#!/usr/bin/env node

/**
 * Phase 1 Test: Simple FreeLang program
 * Tests: fn (definition), let, if, while
 */

const { ProgramRunner } = require('./dist/cli/runner');

const testPrograms = [
  {
    name: 'Simple number',
    code: '5'
  },
  {
    name: 'String operation',
    code: '"hello" + " world"'
  },
  {
    name: 'Variable declaration',
    code: 'let x = 10; x + 5'
  },
  {
    name: 'If statement',
    code: 'let x = 5; if x > 3 { 100 } else { 200 }'
  },
  {
    name: 'While loop',
    code: 'let i = 0; let sum = 0; while i < 5 { sum = sum + i; i = i + 1; } sum'
  },
  {
    name: 'Function definition and call',
    code: 'fn add(a, b) { a + b } add(3, 4)'
  }
];

async function main() {
  console.log('🧪 Phase 1 Tests: Full Lexer→Parser Pipeline\n');

  const runner = new ProgramRunner();

  for (const test of testPrograms) {
    console.log(`▶ ${test.name}`);
    console.log(`  Code: ${test.code.substring(0, 60)}${test.code.length > 60 ? '...' : ''}`);

    const result = runner.runString(test.code);

    if (result.success) {
      console.log(`  ✅ Success: ${result.output}`);
    } else {
      console.log(`  ❌ Error: ${result.error}`);
    }
    console.log();
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
