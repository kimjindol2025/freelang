#!/usr/bin/env node

/**
 * Phase 2 Debug: Function registration
 */

const { ProgramRunner } = require('./dist/cli/runner');

const code = `fn add(a, b) {
  a + b
}

add(3, 4)`;

console.log('🐛 Phase 2 Debug: Function Registration\n');
console.log('Code:');
console.log(code);
console.log('\n');

const runner = new ProgramRunner();

console.log('📋 FunctionRegistry before execution:');
const registry = runner.getRegistry();
console.log('Functions:', registry.getNames());
console.log('Count:', registry.count());
console.log();

const result = runner.runString(code);

console.log('📊 Result:');
console.log(`Success: ${result.success}`);
console.log(`Error: ${result.error}`);
console.log(`Output: ${result.output}`);

console.log('\n📋 FunctionRegistry after execution:');
console.log('Functions:', registry.getNames());
console.log('Count:', registry.count());
