/**
 * Object 생성 함수 테스트
 */

import { Parser } from './src/cli/parser';
import { SimpleInterpreter } from './src/cli/simple-interpreter-v2';

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
console.log('║      Object 생성 함수 테스트           ║');
console.log('╚════════════════════════════════════════╝');

// Test 1: 빈 객체 생성
test(
  'Test 1: Object() 함수로 빈 객체 생성',
  `
SET obj = Object()
PRINT obj
`
);

// Test 2: Dict() 함수 (별칭)
test(
  'Test 2: Dict() 함수로 빈 객체 생성',
  `
SET dict = Dict()
PRINT dict
`
);

// Test 3: 객체에 프로퍼티 추가
test(
  'Test 3: 객체 프로퍼티 추가',
  `
SET obj = Object()
SET obj.name = "John"
SET obj.age = 30
PRINT obj
`
);

// Test 4: buildQuery 테스트
test(
  'Test 4: buildQuery로 쿼리 생성',
  `
SET obj = Object()
SET obj.name = "John"
SET obj.age = 30
SET query = buildQuery(obj)
PRINT query
`
);

console.log('\n╔════════════════════════════════════════╗');
console.log('║      Object 생성 테스트 완료!          ║');
console.log('╚════════════════════════════════════════╝\n');
