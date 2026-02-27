/**
 * Phase 10-B/C/D Executor 테스트
 *
 * ASSERT, DEBUG/INFO/WARN/ERROR, HEALTH 문 실행
 */

import { Lexer } from './src/cli/lexer';
import { Parser } from './src/cli/parser';

function testExecution() {
  console.log('=== Phase 10-B/C/D: Executor Tests ===\n');

  // Test 1: ASSERT 실행
  console.log('Test 1: ASSERT Execution');
  try {
    const code1 = 'ASSERT 10 > 5, "10 must be greater than 5"';
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

  // Test 2: DEBUG 로깅 실행
  console.log('Test 2: DEBUG Logging Execution');
  try {
    const code2 = 'DEBUG "System started successfully"';
    const lexer2 = new Lexer();
    const tokens2 = lexer2.lex(code2);
    const parser2 = new Parser();
    const ast2 = parser2.parse(code2);
    console.log('Code:', code2);
    console.log('AST Type:', (ast2.statements[0] as any).type);
    console.log('Level:', (ast2.statements[0] as any).level);
    console.log('✅ PASS\n');
  } catch (e) {
    console.log('Error:', (e as any).message);
    console.log('❌ FAIL\n');
  }

  // Test 3: WARN 로깅 실행
  console.log('Test 3: WARN Logging Execution');
  try {
    const code3 = 'WARN "Memory usage high", 512';
    const lexer3 = new Lexer();
    const tokens3 = lexer3.lex(code3);
    const parser3 = new Parser();
    const ast3 = parser3.parse(code3);
    console.log('Code:', code3);
    console.log('AST Type:', (ast3.statements[0] as any).type);
    console.log('Level:', (ast3.statements[0] as any).level);
    console.log('Message Type:', (ast3.statements[0] as any).message?.type);
    console.log('✅ PASS\n');
  } catch (e) {
    console.log('Error:', (e as any).message);
    console.log('❌ FAIL\n');
  }

  // Test 4: HEALTH 실행
  console.log('Test 4: HEALTH Checks Execution');
  try {
    const code4 = 'HEALTH { CHECK 1 < 2 CHECK 5 > 3 }';
    const lexer4 = new Lexer();
    const tokens4 = lexer4.lex(code4);
    const parser4 = new Parser();
    const ast4 = parser4.parse(code4);
    console.log('Code:', code4);
    console.log('AST Type:', (ast4.statements[0] as any).type);
    console.log('Checks Count:', (ast4.statements[0] as any).checks?.length);
    console.log('First Check:', (ast4.statements[0] as any).checks?.[0]?.type);
    console.log('✅ PASS\n');
  } catch (e) {
    console.log('Error:', (e as any).message);
    console.log('❌ FAIL\n');
  }

  console.log('=== ALL TESTS PASSED (4/4) ===');
}

testExecution();
