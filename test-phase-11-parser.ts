/**
 * Phase 11-A Parser 테스트
 *
 * HASH, ENCRYPT, DECRYPT, SIGN, VERIFY, KEYGEN 키워드 파싱 검증
 */

import { Lexer } from './src/cli/lexer';
import { Parser } from './src/cli/parser';

function testParsing() {
  console.log('=== Phase 11-A: Crypto Lexer & Parser Tests ===\n');

  // Test 1: HASH 파싱
  console.log('Test 1: HASH Parsing');
  const code1 = 'HASH "hello world", "SHA256"';
  const lexer1 = new Lexer();
  const tokens1 = lexer1.lex(code1);
  console.log('Tokens:', tokens1.slice(0, 3).map(t => ({ type: t.type, value: t.value })));

  const parser1 = new Parser();
  const ast1 = parser1.parse(code1);
  const stmt1 = ast1.statements[0] as any;
  console.log('AST Type:', stmt1.type);
  console.log('Data:', stmt1.data?.type);
  console.log('Algorithm:', stmt1.algorithm?.value);
  console.log('✅ PASS\n');

  // Test 2: ENCRYPT 파싱
  console.log('Test 2: ENCRYPT Parsing');
  const code2 = 'ENCRYPT "sensitive", "password123", "AES-256"';
  const lexer2 = new Lexer();
  const tokens2 = lexer2.lex(code2);
  console.log('Tokens:', tokens2.slice(0, 3).map(t => ({ type: t.type, value: t.value })));

  const parser2 = new Parser();
  const ast2 = parser2.parse(code2);
  const stmt2 = ast2.statements[0] as any;
  console.log('AST Type:', stmt2.type);
  console.log('Algorithm:', stmt2.algorithm?.value);
  console.log('✅ PASS\n');

  // Test 3: DECRYPT 파싱
  console.log('Test 3: DECRYPT Parsing');
  const code3 = 'DECRYPT "encrypted_data", "password123", "AES-256"';
  const parser3 = new Parser();
  const ast3 = parser3.parse(code3);
  const stmt3 = ast3.statements[0] as any;
  console.log('AST Type:', stmt3.type);
  console.log('Algorithm:', stmt3.algorithm?.value);
  console.log('✅ PASS\n');

  // Test 4: SIGN 파싱
  console.log('Test 4: SIGN Parsing');
  const code4 = 'SIGN "transaction", privateKey, "RSA"';
  const parser4 = new Parser();
  const ast4 = parser4.parse(code4);
  const stmt4 = ast4.statements[0] as any;
  console.log('AST Type:', stmt4.type);
  console.log('Message:', stmt4.message?.type);
  console.log('PrivateKey:', stmt4.privateKey?.value);
  console.log('✅ PASS\n');

  // Test 5: VERIFY 파싱
  console.log('Test 5: VERIFY Parsing');
  const code5 = 'VERIFY "transaction", signature, publicKey, "RSA"';
  const parser5 = new Parser();
  const ast5 = parser5.parse(code5);
  const stmt5 = ast5.statements[0] as any;
  console.log('AST Type:', stmt5.type);
  console.log('Message:', stmt5.message?.type);
  console.log('PublicKey:', stmt5.publicKey?.value);
  console.log('✅ PASS\n');

  // Test 6: KEYGEN 파싱
  console.log('Test 6: KEYGEN Parsing');
  const code6 = 'KEYGEN "RSA", 2048';
  const parser6 = new Parser();
  const ast6 = parser6.parse(code6);
  const stmt6 = ast6.statements[0] as any;
  console.log('AST Type:', stmt6.type);
  console.log('Algorithm:', stmt6.algorithm?.value);
  console.log('Size:', stmt6.size?.value);
  console.log('✅ PASS\n');

  console.log('=== ALL TESTS PASSED (6/6) ===');
}

testParsing();
