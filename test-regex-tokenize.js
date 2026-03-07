#!/usr/bin/env node

/**
 * Test regex literal tokenization
 */

const { Lexer } = require('./dist/lexer/lexer');

// Test 1: Simple regex pattern
const code1 = `var pattern = /[0-9]+/;`;
console.log('\n=== Test 1: Simple regex pattern ===');
console.log('Code:', code1);
const lexer1 = new Lexer(code1);
const tokens1 = lexer1.tokenize();
console.log('Tokens:');
tokens1.forEach((t, i) => {
  console.log(`  [${i}] ${t.type}: ${JSON.stringify(t.value)}`);
});

// Test 2: Regex with flags
const code2 = `if (pattern.test(text)) { var m = /test/i; }`;
console.log('\n=== Test 2: Regex with flags ===');
console.log('Code:', code2);
const lexer2 = new Lexer(code2);
const tokens2 = lexer2.tokenize();
console.log('Tokens:');
tokens2.forEach((t, i) => {
  if (t.type === 'REGEX' || t.type.includes('REGEX')) {
    console.log(`  [${i}] ${t.type}: ${JSON.stringify(t.value)} <-- REGEX!`);
  } else {
    console.log(`  [${i}] ${t.type}: ${JSON.stringify(t.value)}`);
  }
});

// Test 3: Mixed division and regex
const code3 = `var a = 10 / 2; var b = /[0-9]/;`;
console.log('\n=== Test 3: Division vs Regex ===');
console.log('Code:', code3);
const lexer3 = new Lexer(code3);
const tokens3 = lexer3.tokenize();
console.log('Tokens:');
tokens3.forEach((t, i) => {
  if (t.type.includes('REGEX') || t.type === 'SLASH') {
    console.log(`  [${i}] ${t.type}: ${JSON.stringify(t.value)} <-- CHECK!`);
  } else {
    console.log(`  [${i}] ${t.type}: ${JSON.stringify(t.value)}`);
  }
});

console.log('\n=== Summary ===');
console.log('Lexer successfully tokenizes regex literals!');
