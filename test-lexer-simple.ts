/**
 * Simple test for self-lexer.fl
 * 
 * This tests if the lexer can be parsed and basic functions work
 */

import { Interpreter } from './src/interpreter/interpreter';
import { Parser } from './src/parser/parser';
import { Lexer } from './src/lexer/lexer';
import * as fs from 'fs';
import * as path from 'path';

// Read the self-lexer.fl file
const lexerPath = path.join(__dirname, 'src/stdlib/self-lexer.fl');
const lexerCode = fs.readFileSync(lexerPath, 'utf-8');

// Read a test FreeLang code
const testCode = `
fn add(a, b) { return a + b }
let x = 42
if (x > 0) {
  println(x)
}
`;

console.log('═══════════════════════════════════════');
console.log('  Self-Lexer Test Suite');
console.log('═══════════════════════════════════════\n');

try {
  // Create interpreter
  const interpreter = new Interpreter();
  
  // Load the self-lexer library
  console.log('1️⃣  Loading self-lexer.fl...');
  const lexerFileCode = `
${lexerCode}

// Test tokenize
let test_code = "fn add(a, b) { return a + b }"
let tokens = tokenize(test_code)
println("✅ Tokens generated:")
printTokens(tokens)
`;

  const lexer = new Lexer(lexerFileCode);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();
  
  console.log('✓ Lexer loaded successfully');
  console.log(`✓ Generated ${tokens.length} tokens\n`);

  // Execute the lexer
  console.log('2️⃣  Executing self-lexer...');
  const result = interpreter.execute(ast);
  console.log('✓ Self-lexer executed successfully\n');

  console.log('═══════════════════════════════════════');
  console.log('  ✅ All Tests Passed');
  console.log('═══════════════════════════════════════');

} catch (error) {
  console.error('❌ Test Failed:', error);
  process.exit(1);
}
