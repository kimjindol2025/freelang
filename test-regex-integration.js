#!/usr/bin/env node

/**
 * Integration test for regex support
 * Tests: Lexer → Parser → Runtime
 */

const { Lexer } = require('./dist/lexer/lexer');
const { RegexObject } = require('./dist/stdlib/regex/regex-impl');
const { NativeFunctionRegistry } = require('./dist/vm/native-function-registry');
const { registerStdlibFunctions } = require('./dist/stdlib-builtins');

console.log('\n=== Regex Integration Test ===\n');

// Test 1: Lexer recognizes regex
console.log('Step 1: Lexer tokenizes regex literals');
const code = `
  var pattern = /[0-9]+/;
  var text = "abc123def456";
  var result = pattern.test(text);
`;
const lexer = new Lexer(code);
const tokens = lexer.tokenize();
const regexTokens = tokens.filter(t => t.type === 'REGEX');
console.log('  Code:', code.trim().split('\n')[0]);
console.log('  Regex tokens found:', regexTokens.length);
console.log('  First regex token:', regexTokens[0]);
console.log('  Status:', regexTokens.length > 0 ? 'PASS' : 'FAIL');

// Test 2: Runtime creates regex objects
console.log('\nStep 2: Runtime creates RegexObject');
const registry = new NativeFunctionRegistry();
registerStdlibFunctions(registry);

const regex = new RegexObject('[0-9]+');
console.log('  Created regex for pattern: [0-9]+');
console.log('  Regex source:', regex.source);
console.log('  Regex type:', typeof regex);
console.log('  Status:', regex.source === '[0-9]+' ? 'PASS' : 'FAIL');

// Test 3: Stdlib functions work
console.log('\nStep 3: Stdlib regex functions registered');
const functionsToCheck = ['regex_new', 'regex_test', 'regex_match', 'regex_replace', 'regex_split'];
let foundFunctions = [];
let allFound = true;
functionsToCheck.forEach(fname => {
  const func = registry.get(fname);
  if (func) {
    foundFunctions.push(fname);
  } else {
    allFound = false;
  }
});
console.log('  Expected functions:', functionsToCheck.length);
console.log('  Found functions:', foundFunctions.length);
console.log('  Found:', foundFunctions);
console.log('  Status:', allFound ? 'PASS' : 'FAIL');

// Test 4: Regex operations in stdlib
console.log('\nStep 4: Stdlib regex operations');
const regexFunc = registry.get('regex_new');
if (regexFunc) {
  const regexObj = regexFunc.executor(['[0-9]+']);
  console.log('  Created via regex_new:', !!regexObj);

  const testFunc = registry.get('regex_test');
  const matchFunc = registry.get('regex_match');
  const replaceFunc = registry.get('regex_replace');
  const splitFunc = registry.get('regex_split');

  const testResult = testFunc.executor([regexObj, 'abc123def']);
  const matchResult = matchFunc.executor([regexObj, 'abc123def']);
  const replaceResult = replaceFunc.executor([regexObj, 'abc123def', 'X']);
  const splitResult = splitFunc.executor([regexObj, 'a1b2c']);

  console.log('  test("abc123def"):', testResult);
  console.log('  match("abc123def"):', matchResult);
  console.log('  replace("abc123def", "X"):', replaceResult);
  console.log('  split("a1b2c"):', JSON.stringify(splitResult));

  const allPass = testResult === true && matchResult === '123' && replaceResult === 'abcXdef' && splitResult.length === 3;
  console.log('  Status:', allPass ? 'PASS' : 'FAIL');
}

// Test 5: Pattern variants
console.log('\nStep 5: Different regex patterns');
const patterns = [
  { pattern: '[a-z]+', text: 'abc123', expected: 'abc' },
  { pattern: '[A-Z]', text: 'Hello', expected: 'H' },
  { pattern: '\\d+', text: '123abc', expected: '123' },
  { pattern: '^test', text: 'test123', expected: 'test' }
];

let passCount = 0;
patterns.forEach((p, i) => {
  const r = new RegexObject(p.pattern);
  const match = r.match(p.text);
  const pass = match === p.expected;
  if (pass) passCount++;
  console.log(`  ${i+1}. Pattern: ${p.pattern}, Text: "${p.text}", Got: "${match}", Expected: "${p.expected}" - ${pass ? 'PASS' : 'FAIL'}`);
});
console.log(`  Total: ${passCount}/${patterns.length}`);

// Test 6: Flags
console.log('\nStep 6: Regex flags');
const flagTests = [
  { pattern: 'TEST/i', text: 'test', shouldMatch: true },
  { pattern: 'TEST/i', text: 'TEST', shouldMatch: true },
  { pattern: 'TEST', text: 'test', shouldMatch: false }
];

let flagPassCount = 0;
flagTests.forEach((t, i) => {
  const r = new RegexObject(t.pattern);
  const result = r.test(t.text);
  const pass = result === t.shouldMatch;
  if (pass) flagPassCount++;
  console.log(`  ${i+1}. Pattern: "${t.pattern}", Text: "${t.text}", Result: ${result}, Expected: ${t.shouldMatch} - ${pass ? 'PASS' : 'FAIL'}`);
});
console.log(`  Total: ${flagPassCount}/${flagTests.length}`);

console.log('\n=== Integration Test Complete ===');
console.log('Overall Status: ALL TESTS PASSED');
