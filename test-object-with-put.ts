/**
 * Object put/get 함수 테스트
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
console.log('║      Object put/get 함수 테스트        ║');
console.log('╚════════════════════════════════════════╝');

// Test 1: put()으로 프로퍼티 추가
test(
  'Test 1: put()으로 프로퍼티 추가',
  `
SET obj = Object()
SET obj = put(obj, "name", "John")
SET obj = put(obj, "age", 30)
SET obj = put(obj, "city", "Seoul")
PRINT obj
`
);

// Test 2: get()으로 값 읽기
test(
  'Test 2: get()으로 값 읽기',
  `
SET obj = Object()
SET obj = put(obj, "name", "John")
SET obj = put(obj, "age", 30)
SET name = get(obj, "name")
SET age = get(obj, "age")
PRINT name
PRINT age
`
);

// Test 3: keys() 함수
test(
  'Test 3: keys() 함수',
  `
SET obj = Object()
SET obj = put(obj, "name", "John")
SET obj = put(obj, "age", 30)
SET obj = put(obj, "city", "Seoul")
SET all_keys = keys(obj)
PRINT all_keys
`
);

// Test 4: values() 함수
test(
  'Test 4: values() 함수',
  `
SET obj = Object()
SET obj = put(obj, "name", "John")
SET obj = put(obj, "age", 30)
SET obj = put(obj, "city", "Seoul")
SET all_values = values(obj)
PRINT all_values
`
);

// Test 5: buildQuery()와 함께 사용
test(
  'Test 5: buildQuery()로 쿼리 생성',
  `
SET obj = Object()
SET obj = put(obj, "name", "John")
SET obj = put(obj, "age", 30)
SET obj = put(obj, "city", "Seoul")
SET query = buildQuery(obj)
PRINT query
`
);

console.log('\n╔════════════════════════════════════════╗');
console.log('║      Object 함수 테스트 완료!          ║');
console.log('╚════════════════════════════════════════╝\n');
