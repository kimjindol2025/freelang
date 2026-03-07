#!/usr/bin/env node

/**
 * Test regex runtime evaluation
 */

const { RegexObject } = require('./dist/stdlib/regex/regex-impl');

console.log('\n=== Regex Runtime Tests ===\n');

// Test 1: test()
console.log('Test 1: regex.test()');
const regex1 = new RegexObject('[0-9]+');
console.log('  Pattern: [0-9]+');
console.log('  Text: "abc123def"');
console.log('  Result:', regex1.test('abc123def'));
console.log('  Expected: true');
console.log('  Status:', regex1.test('abc123def') === true ? 'PASS' : 'FAIL');

// Test 2: match()
console.log('\nTest 2: regex.match()');
const regex2 = new RegexObject('[0-9]+');
console.log('  Pattern: [0-9]+');
console.log('  Text: "abc123def456"');
const match = regex2.match('abc123def456');
console.log('  Result:', JSON.stringify(match));
console.log('  Expected: "123"');
console.log('  Status:', match === '123' ? 'PASS' : 'FAIL');

// Test 3: replace()
console.log('\nTest 3: regex.replace()');
const regex3 = new RegexObject('[0-9]+');
console.log('  Pattern: [0-9]+');
console.log('  Text: "abc123def456"');
console.log('  Replacement: "X"');
const replaced = regex3.replace('abc123def456', 'X');
console.log('  Result:', JSON.stringify(replaced));
console.log('  Expected: "abcXdef456"');
console.log('  Status:', replaced === 'abcXdef456' ? 'PASS' : 'FAIL');

// Test 4: split()
console.log('\nTest 4: regex.split()');
const regex4 = new RegexObject('[0-9]');
console.log('  Pattern: [0-9]');
console.log('  Text: "a1b2c3"');
const parts = regex4.split('a1b2c3');
console.log('  Result:', JSON.stringify(parts));
console.log('  Expected: ["a","b","c",""]');
console.log('  Status:', JSON.stringify(parts) === JSON.stringify(['a', 'b', 'c', '']) ? 'PASS' : 'FAIL');

// Test 5: flags
console.log('\nTest 5: regex.test() with flags');
const regex5 = new RegexObject('HELLO/i');
console.log('  Pattern: HELLO/i (case insensitive)');
console.log('  Text: "hello world"');
console.log('  Result:', regex5.test('hello world'));
console.log('  Expected: true');
console.log('  Status:', regex5.test('hello world') === true ? 'PASS' : 'FAIL');

// Test 6: exec()
console.log('\nTest 6: regex.exec()');
const regex6 = new RegexObject('[0-9]+');
console.log('  Pattern: [0-9]+');
console.log('  Text: "abc123def"');
const exec = regex6.exec('abc123def');
console.log('  Result:', JSON.stringify(exec));
console.log('  First match:', exec && exec[0]);
console.log('  Status:', exec && exec[0] === '123' ? 'PASS' : 'FAIL');

console.log('\n=== All Runtime Tests Complete ===\n');
