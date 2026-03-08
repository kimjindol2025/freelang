#!/usr/bin/env node

/**
 * Phase 1 Test: Direct ProgramRunner test
 * Tests the new Lexer→Parser pipeline
 */

const fs = require('fs');
const path = require('path');
const { ProgramRunner } = require('./dist/cli/runner');

async function main() {
  console.log('🧪 Phase 1 Test: Lexer→Parser Pipeline\n');

  // Read robot_ai_operational.fl
  const filePath = '/home/kimjin/Desktop/kim/robot-ai-project/software/robot_ai_operational.fl';
  console.log(`📂 Reading: ${filePath}\n`);
  const source = fs.readFileSync(filePath, 'utf-8');

  // Create runner
  const runner = new ProgramRunner();

  // Run
  console.log('⏳ Parsing and executing...\n');
  const result = runner.runString(source);

  console.log('📊 Result:');
  console.log(`  Success: ${result.success}`);
  console.log(`  Exit Code: ${result.exitCode}`);
  console.log(`  Execution Time: ${result.executionTime}ms`);

  if (result.error) {
    console.log(`  ❌ Error: ${result.error}`);
  } else {
    console.log(`  ✅ Output: ${result.output}`);
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
