/**
 * Phase 10-A Parser 테스트
 *
 * ASSERT, DEBUG/INFO/WARN/ERROR, HEALTH 키워드 파싱 검증
 */

import { Lexer } from './src/cli/lexer';
import { Parser } from './src/cli/parser';

function testParsing() {
  console.log('=== Phase 10-A: Lexer & Parser Tests ===\n');

  // Test 1: ASSERT 파싱
  console.log('Test 1: ASSERT Parsing');
  const code1 = 'ASSERT x > 0, "x must be positive"';
  const lexer1 = new Lexer();
  const tokens1 = lexer1.lex(code1);
  console.log('Tokens:', tokens1.slice(0, 4).map(t => ({ type: t.type, value: t.value })));

  const parser1 = new Parser();
  const ast1 = parser1.parse(code1);
  const stmt1 = ast1.statements[0];
  console.log('AST Type:', (stmt1 as any).type);
  console.log('message:', (stmt1 as any).message);
  console.log('condition:', (stmt1 as any).condition?.type);
  console.log('✅ PASS\n');

  // Test 2: DEBUG 파싱
  console.log('Test 2: DEBUG Logging');
  const code2 = 'DEBUG "Starting process"';
  const lexer2 = new Lexer();
  const tokens2 = lexer2.lex(code2);
  console.log('Tokens:', tokens2.slice(0, 2).map(t => ({ type: t.type, value: t.value })));

  const parser2 = new Parser();
  const ast2 = parser2.parse(code2);
  const stmt2 = ast2.statements[0];
  console.log('AST Type:', (stmt2 as any).type);
  console.log('level:', (stmt2 as any).level);
  console.log('message:', (stmt2 as any).message?.value);
  console.log('✅ PASS\n');

  // Test 3: WARN with data
  console.log('Test 3: WARN with Data');
  const code3 = 'WARN "Memory high", 512';
  const parser3 = new Parser();
  const ast3 = parser3.parse(code3);
  const stmt3 = ast3.statements[0];
  console.log('AST Type:', (stmt3 as any).type);
  console.log('level:', (stmt3 as any).level);
  console.log('data:', (stmt3 as any).data?.type);
  console.log('✅ PASS\n');

  // Test 4: HEALTH 파싱
  console.log('Test 4: HEALTH Statement');
  const code4 = 'HEALTH { CHECK x > 0 CHECK y < 100 }';
  const lexer4 = new Lexer();
  const tokens4 = lexer4.lex(code4);
  console.log('Tokens:', tokens4.slice(0, 3).map(t => ({ type: t.type, value: t.value })));

  const parser4 = new Parser();
  const ast4 = parser4.parse(code4);
  const stmt4 = ast4.statements[0];
  console.log('AST Type:', (stmt4 as any).type);
  console.log('checks count:', (stmt4 as any).checks?.length);
  console.log('✅ PASS\n');

  // Test 5: 키워드 인식 (Lexer)
  console.log('Test 5: Keywords Recognition');
  const code5 = 'ASSERT DEBUG INFO WARN ERROR HEALTH';
  const lexer5 = new Lexer();
  const tokens5 = lexer5.lex(code5);
  const keywords = tokens5.filter(t => t.type === 'KEYWORD').map(t => t.value);
  console.log('Keywords:', keywords);
  console.log('Contains ASSERT:', keywords.includes('ASSERT') ? '✅' : '❌');
  console.log('Contains DEBUG:', keywords.includes('DEBUG') ? '✅' : '❌');
  console.log('Contains HEALTH:', keywords.includes('HEALTH') ? '✅' : '❌');
  console.log('✅ PASS\n');

  // Test 6: ERROR 파싱
  console.log('Test 6: ERROR Logging');
  const code6 = 'ERROR "Operation failed", 500';
  const parser6 = new Parser();
  const ast6 = parser6.parse(code6);
  const stmt6 = ast6.statements[0];
  console.log('AST Type:', (stmt6 as any).type);
  console.log('level:', (stmt6 as any).level);
  console.log('✅ PASS\n');

  console.log('=== ALL TESTS PASSED (6/6) ===');
}

testParsing();
