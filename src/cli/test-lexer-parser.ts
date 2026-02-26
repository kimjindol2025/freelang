/**
 * Lexer + Parser 통합 테스트
 * 간단한 FreeLang 코드를 파싱하는지 확인
 */

import { Parser } from './parser';

function testBasic() {
  console.log('\n=== Lexer + Parser 통합 테스트 ===\n');

  // Test 1: 변수 할당
  console.log('✅ Test 1: 변수 할당');
  const code1 = `SET x = 10`;
  const parser1 = new Parser();
  const ast1 = parser1.parse(code1);
  console.log('코드:', code1);
  console.log('AST:', JSON.stringify(ast1, null, 2));

  // Test 2: 함수 정의
  console.log('\n✅ Test 2: 함수 정의');
  const code2 = `FUNC add(a, b) {
    SET result = a + b
    RETURN result
  }`;
  const parser2 = new Parser();
  const ast2 = parser2.parse(code2);
  console.log('코드:', code2);
  console.log('AST:', JSON.stringify(ast2, null, 2));

  // Test 3: IF 조건문
  console.log('\n✅ Test 3: IF 조건문');
  const code3 = `IF x > 10 {
    SET y = 100
  } ELSE {
    SET y = 50
  }`;
  const parser3 = new Parser();
  const ast3 = parser3.parse(code3);
  console.log('코드:', code3);
  console.log('AST:', JSON.stringify(ast3, null, 2));

  // Test 4: WHILE 루프
  console.log('\n✅ Test 4: WHILE 루프');
  const code4 = `WHILE i < 10 {
    SET i = i + 1
  }`;
  const parser4 = new Parser();
  const ast4 = parser4.parse(code4);
  console.log('코드:', code4);
  console.log('AST:', JSON.stringify(ast4, null, 2));

  // Test 5: CLASS 정의
  console.log('\n✅ Test 5: CLASS 정의');
  const code5 = `CLASS Dog {
    FUNCTION bark() {
      PRINT "Woof"
    }
  }`;
  const parser5 = new Parser();
  const ast5 = parser5.parse(code5);
  console.log('코드:', code5);
  console.log('AST:', JSON.stringify(ast5, null, 2));

  console.log('\n=== 모든 테스트 통과! ===\n');
}

testBasic();
