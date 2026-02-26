/**
 * FreeLang 객체 생성 방법 테스트
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
console.log('║      FreeLang 객체 생성 방법 테스트    ║');
console.log('╚════════════════════════════════════════╝');

// Test 1: 빈 객체
test(
  'Test 1: 빈 객체 리터럴 (불가능)',
  `
SET obj = {}
PRINT obj
`
);

// Test 2: 객체에 프로퍼티 추가
test(
  'Test 2: 동적 프로퍼티 추가 시도',
  `
SET obj = {}
SET obj.name = "John"
PRINT obj
`
);

console.log('\n╔════════════════════════════════════════╗');
console.log('║      객체 생성 테스트 완료!             ║');
console.log('╚════════════════════════════════════════╝\n');
