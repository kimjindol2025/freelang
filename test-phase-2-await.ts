/**
 * Phase 2: AWAIT 표현식 처리 테스트
 *
 * Phase 1에서 완성:
 * - Lexer: ASYNC, AWAIT 키워드
 * - Parser: AwaitExpression AST 생성
 * - Interpreter: Promise-based HTTP 함수
 *
 * Phase 2에서 구현:
 * - executeProgram -> async
 * - executeNode -> async (모든 곳에서 await)
 * - evaluateExpression -> async + AwaitExpression 처리
 * - 모든 함수 호출에 await 추가
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
    // 이제 execute는 Promise를 반환합니다
    (interpreter.execute(ast) as Promise<any>)
      .then((result: any) => {
        if (result !== undefined) {
          console.log(`결과: ${JSON.stringify(result)}`);
        }
        console.log('✓ 성공\n');
      })
      .catch((error: any) => {
        console.log(`❌ 에러: ${error.message}\n`);
      });
  } catch (error: any) {
    console.log(`❌ 파싱 에러: ${error.message}\n`);
  }
}

console.log('╔═══════════════════════════════════════════╗');
console.log('║   Phase 2: AWAIT 표현식 처리 테스트     ║');
console.log('╚═══════════════════════════════════════════╝');

// Test 1: 간단한 AWAIT (모의 Promise)
test(
  'Test 1: 간단한 Promise 기다리기',
  `
SET result = AWAIT Promise(10)
PRINT result
`
);

// Test 2: httpGet과 함께 AWAIT 사용 (실제 HTTP)
test(
  'Test 2: httpGet AWAIT (JSON Placeholder API)',
  `
SET response = AWAIT httpGet("https://jsonplaceholder.typicode.com/posts/1")
PRINT response
`
);

// Test 3: httpPost와 함께 AWAIT 사용
test(
  'Test 3: httpPost AWAIT',
  `
SET postData = Object()
SET postData = put(postData, "title", "Test Post")
SET postData = put(postData, "body", "This is a test")
SET postData = put(postData, "userId", 1)
SET response = AWAIT httpPost("https://jsonplaceholder.typicode.com/posts", postData)
PRINT response
`
);

console.log('\n╔═══════════════════════════════════════════╗');
console.log('║     Phase 2 테스트 완료!                 ║');
console.log('╚═══════════════════════════════════════════╝\n');
