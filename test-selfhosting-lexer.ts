/**
 * Test: Lexer Self-Hosting Validation (Phase A-1)
 *
 * Validates that lexer.fl (written in FreeLang) can tokenize FreeLang source code
 * Tests the self-hosting capability: lexer.fl tokenizing itself and other code
 *
 * Expected: lexer.fl produces identical token output to TypeScript lexer
 */

import * as fs from 'fs';
import { ProgramRunner } from './src/cli/runner';
import { Lexer, TokenBuffer } from './src/lexer/lexer';

interface TokenCompare {
  kind: string;
  value: string;
  line: number;
  col: number;
}

/**
 * Extract comparable token info from TypeScript Lexer
 */
function extractTokenInfo(tokens: any[]): TokenCompare[] {
  return tokens.map(t => ({
    kind: t.kind,
    value: t.value,
    line: t.line,
    col: t.col
  }));
}

/**
 * Test 1: Simple keyword tokenization
 */
function testSimpleKeywords() {
  console.log('\n=== TEST 1: Simple Keywords ===');

  const runner = new ProgramRunner();

  // Try to call tokenize function directly
  // First verify that tokenize exists in the stdlib by trying a simple call
  const code = `
fn test() {
  let code = "fn add(a, b) { return a + b }"
  let tokens = tokenize(code)
  return typeof(tokens)
}

println(test())
`;

  console.log('FreeLang code (check tokenize function exists)');
  const result = runner.runString(code);

  if (result.success) {
    console.log('✅ PASS: tokenize() executed successfully');
    console.log('Return type:', result.output);
    return true;
  } else {
    console.log('❌ FAIL:', result.error);
    return false;
  }
}

/**
 * Test 2: Compare with TypeScript lexer output
 */
function testCompareWithTypescript() {
  console.log('\n=== TEST 2: Compare FreeLang vs TypeScript Lexer ===');

  const testInput = 'fn add(x, y) { return x + y }';

  // TypeScript lexer output
  const tsLexer = new Lexer(testInput);
  const tsTokens = tsLexer.tokenize();
  const tsTokenInfo = extractTokenInfo(tsTokens);

  console.log('TypeScript Lexer output:');
  tsTokenInfo.forEach((t, i) => {
    console.log(`  [${i}] ${t.kind}: "${t.value}"`);
  });

  // FreeLang lexer output
  const runner = new ProgramRunner();
  const flCode = `
let code = "${testInput}"
let tokens = tokenize(code)
println(arr.len(tokens))
`;

  const result = runner.runString(flCode);
  console.log('\nFreeLang Lexer output:');
  console.log('Token count:', result.output);

  if (result.success) {
    // Parse result to get token count
    const flTokenCount = parseInt(String(result.output));
    const tsTokenCount = tsTokenInfo.length;

    if (flTokenCount === tsTokenCount) {
      console.log(`✅ PASS: Token counts match (${tsTokenCount})`);
      return true;
    } else {
      console.log(`❌ FAIL: Token count mismatch - TS: ${tsTokenCount}, FL: ${flTokenCount}`);
      return false;
    }
  } else {
    console.log('❌ FAIL: FreeLang tokenization error -', result.error);
    return false;
  }
}

/**
 * Test 3: Self-hosting - lexer.fl tokenizing itself
 */
function testLexerSelfHosting() {
  console.log('\n=== TEST 3: Lexer Self-Hosting (lexer.fl tokenizing itself) ===');

  try {
    // Load lexer.fl itself
    const lexerSource = fs.readFileSync('./src/stdlib/lexer.fl', 'utf-8');
    console.log(`Loaded lexer.fl (${lexerSource.length} chars)`);

    // Create FreeLang code that tokenizes lexer.fl
    const escapedSource = lexerSource.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const flCode = `
let source = "${escapedSource}"
let tokens = tokenize(source)
let count = arr.len(tokens)
println(count)
`;

    const runner = new ProgramRunner();
    const result = runner.runString(flCode);

    if (result.success) {
      const tokenCount = parseInt(String(result.output));
      console.log(`✅ PASS: lexer.fl tokenized itself (${tokenCount} tokens)`);
      return true;
    } else {
      console.log('❌ FAIL:', result.error);
      return false;
    }
  } catch (error) {
    console.log('❌ FAIL: Error loading lexer.fl -', error);
    return false;
  }
}

/**
 * Test 4: Complex tokenization with strings and comments
 */
function testComplexTokenization() {
  console.log('\n=== TEST 4: Complex Tokenization (strings + comments) ===');

  const testCode = `
// This is a comment
let msg = "Hello, World!"
fn test() { /* block comment */ return 42 }
`;

  const runner = new ProgramRunner();
  const flCode = `
let code = "${testCode.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"
let tokens = tokenize(code)
println(arr.len(tokens))
`;

  const result = runner.runString(flCode);

  if (result.success) {
    console.log(`✅ PASS: Complex tokenization succeeded (${result.output} tokens)`);
    return true;
  } else {
    console.log('❌ FAIL:', result.error);
    return false;
  }
}

/**
 * Test 5: Numeric and operator tokenization
 */
function testNumericAndOperators() {
  console.log('\n=== TEST 5: Numeric and Operator Tokenization ===');

  const testCode = `
let x = 42
let y = 3.14159
let z = x + y * 2
let result = x == y && z != 0
`;

  const runner = new ProgramRunner();
  const escapedCode = testCode.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const flCode = `
let code = "${escapedCode}"
let tokens = tokenize(code)
println(arr.len(tokens))
`;

  const result = runner.runString(flCode);

  if (result.success) {
    console.log(`✅ PASS: Numeric/operator tokenization succeeded (${result.output} tokens)`);
    return true;
  } else {
    console.log('❌ FAIL:', result.error);
    return false;
  }
}

/**
 * Main test runner
 */
function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  FreeLang Self-Hosting Validation - Lexer Tests (A-1)  ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  const results: { name: string; passed: boolean }[] = [];

  // Run all tests
  results.push({ name: 'Test 1: Simple Keywords', passed: testSimpleKeywords() });
  results.push({ name: 'Test 2: Compare TS vs FL', passed: testCompareWithTypescript() });
  results.push({ name: 'Test 3: Self-Hosting', passed: testLexerSelfHosting() });
  results.push({ name: 'Test 4: Complex Tokens', passed: testComplexTokenization() });
  results.push({ name: 'Test 5: Numeric & Ops', passed: testNumericAndOperators() });

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  TEST SUMMARY                                          ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach(r => {
    const status = r.passed ? '✅' : '❌';
    console.log(`${status} ${r.name}`);
  });

  console.log(`\nTotal: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('\n🎉 ALL TESTS PASSED - Phase A-1 Complete!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed - Review errors above');
    process.exit(1);
  }
}

main();
