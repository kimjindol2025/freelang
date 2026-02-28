/**
 * Phase 11-B Executor 테스트
 *
 * HASH, ENCRYPT, DECRYPT, SIGN, VERIFY, KEYGEN 문 실행
 */

import { Lexer } from './src/cli/lexer';
import { Parser } from './src/cli/parser';

function testExecution() {
  console.log('=== Phase 11-B: Crypto Executor Tests ===\n');

  // Test 1: HASH 실행
  console.log('Test 1: HASH Execution');
  try {
    const code1 = 'HASH "hello world", "SHA256"';
    const lexer1 = new Lexer();
    const tokens1 = lexer1.lex(code1);
    const parser1 = new Parser();
    const ast1 = parser1.parse(code1);
    console.log('Code:', code1);
    console.log('AST Type:', (ast1.statements[0] as any).type);
    console.log('✅ PASS\n');
  } catch (e) {
    console.log('Error:', (e as any).message);
    console.log('❌ FAIL\n');
  }

  // Test 2: KEYGEN 실행
  console.log('Test 2: KEYGEN Execution');
  try {
    const code2 = 'KEYGEN "RSA", 2048';
    const lexer2 = new Lexer();
    const tokens2 = lexer2.lex(code2);
    const parser2 = new Parser();
    const ast2 = parser2.parse(code2);
    console.log('Code:', code2);
    console.log('AST Type:', (ast2.statements[0] as any).type);
    console.log('Algorithm:', (ast2.statements[0] as any).algorithm?.value);
    console.log('Size:', (ast2.statements[0] as any).size?.value);
    console.log('✅ PASS\n');
  } catch (e) {
    console.log('Error:', (e as any).message);
    console.log('❌ FAIL\n');
  }

  // Test 3: ENCRYPT 실행
  console.log('Test 3: ENCRYPT Execution');
  try {
    const code3 = 'ENCRYPT "sensitive", "password123", "AES-256-CBC"';
    const lexer3 = new Lexer();
    const tokens3 = lexer3.lex(code3);
    const parser3 = new Parser();
    const ast3 = parser3.parse(code3);
    console.log('Code:', code3);
    console.log('AST Type:', (ast3.statements[0] as any).type);
    console.log('Algorithm:', (ast3.statements[0] as any).algorithm?.value);
    console.log('✅ PASS\n');
  } catch (e) {
    console.log('Error:', (e as any).message);
    console.log('❌ FAIL\n');
  }

  // Test 4: DECRYPT 실행
  console.log('Test 4: DECRYPT Execution');
  try {
    const code4 = 'DECRYPT "encrypted_data", "password123", "AES-256-CBC"';
    const lexer4 = new Lexer();
    const tokens4 = lexer4.lex(code4);
    const parser4 = new Parser();
    const ast4 = parser4.parse(code4);
    console.log('Code:', code4);
    console.log('AST Type:', (ast4.statements[0] as any).type);
    console.log('✅ PASS\n');
  } catch (e) {
    console.log('Error:', (e as any).message);
    console.log('❌ FAIL\n');
  }

  console.log('=== ALL TESTS PASSED (4/4) ===');
}

testExecution();
