/**
 * FreeLang v2 전체 파이프라인 테스트
 * Lexer → Parser → Interpreter
 */

import { Parser } from './parser';
import { SimpleInterpreter } from './simple-interpreter-v2';

function test(name: string, code: string) {
  console.log(`\n✅ ${name}`);
  console.log(`코드:\n${code}`);
  console.log('---');

  try {
    const parser = new Parser();
    const ast = parser.parse(code);

    const interpreter = new SimpleInterpreter();
    const result = interpreter.execute(ast);

    if (result !== undefined) {
      console.log(`결과: ${result}`);
    }
  } catch (error: any) {
    console.log(`❌ 에러: ${error.message}`);
  }
}

console.log('╔════════════════════════════════════════╗');
console.log('║   FreeLang v2 전체 파이프라인 테스트   ║');
console.log('╚════════════════════════════════════════╝');

// Test 1: Hello World
test(
  'Test 1: 단순 출력',
  `
SET x = 10
SET y = 20
FUNC add(a, b) {
  SET result = a + b
  RETURN result
}
`
);

// Test 2: 변수 + 연산
test(
  'Test 2: 변수 할당과 산술',
  `
SET x = 10
SET y = 20
SET z = x + y
`
);

// Test 3: 함수 정의 + 호출
test(
  'Test 3: 함수 정의 및 호출',
  `
FUNC greet(name) {
  PRINT name
  RETURN name
}
`
);

// Test 4: IF 조건문
test(
  'Test 4: IF 조건문',
  `
SET x = 15
IF x > 10 {
  SET result = 1
} ELSE {
  SET result = 0
}
`
);

// Test 5: WHILE 루프
test(
  'Test 5: WHILE 루프',
  `
SET i = 0
SET sum = 0
WHILE i < 5 {
  SET sum = sum + i
  SET i = i + 1
}
`
);

// Test 6: 배열
test(
  'Test 6: 배열 생성',
  `
SET arr = [1, 2, 3, 4, 5]
`
);

// Test 7: FOR 루프
test(
  'Test 7: FOR 루프',
  `
SET arr = [1, 2, 3]
FOR x IN arr {
  PRINT x
}
`
);

// Test 8: 복잡한 표현식
test(
  'Test 8: 복잡한 산술식',
  `
SET x = 10
SET y = 20
SET z = x + y * 2
PRINT z
`
);

console.log('\n╔════════════════════════════════════════╗');
console.log('║         모든 테스트 완료!              ║');
console.log('╚════════════════════════════════════════╝\n');
