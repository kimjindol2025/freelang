/**
 * Phase 3: ASYNC FUNC 함수 지원 테스트
 *
 * 기능:
 * - ASYNC FUNC로 비동기 함수 선언
 * - 비동기 함수는 Promise를 반환
 * - AWAIT로 Promise 기다리기
 * - 함수 내부에서 AWAIT 표현식 사용
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
    // execute는 Promise를 반환합니다
    (interpreter.execute(ast) as Promise<any>)
      .then((result: any) => {
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
console.log('║    Phase 3: ASYNC FUNC 함수 테스트      ║');
console.log('╚═══════════════════════════════════════════╝');

// Test 1: 간단한 ASYNC FUNC (값 반환)
test(
  'Test 1: 간단한 ASYNC FUNC',
  `
ASYNC FUNC greet(name) {
  RETURN "Hello, " + name + "!"
}

SET result = AWAIT greet("World")
PRINT result
`
);

// Test 2: ASYNC FUNC에서 AWAIT 사용
test(
  'Test 2: ASYNC FUNC에서 AWAIT 사용',
  `
ASYNC FUNC fetchUserData() {
  SET response = AWAIT httpGet("https://jsonplaceholder.typicode.com/users/1")
  RETURN response
}

SET userData = AWAIT fetchUserData()
PRINT userData
`
);

// Test 3: 동기 함수와 비동기 함수 혼합
test(
  'Test 3: 동기 함수와 비동기 함수 혼합',
  `
FUNC add(a, b) {
  RETURN a + b
}

ASYNC FUNC asyncAdd(a, b) {
  RETURN add(a, b)
}

SET syncResult = add(5, 3)
SET asyncResult = AWAIT asyncAdd(10, 20)
PRINT syncResult
PRINT asyncResult
`
);

// Test 4: 여러 AWAIT 호출
test(
  'Test 4: 여러 AWAIT 호출 (순차)',
  `
ASYNC FUNC fetchPost(postId) {
  SET post = AWAIT httpGet("https://jsonplaceholder.typicode.com/posts/" + postId)
  RETURN post
}

SET post1 = AWAIT fetchPost(1)
SET post2 = AWAIT fetchPost(2)
PRINT "Posts fetched"
`
);

console.log('\n╔═══════════════════════════════════════════╗');
console.log('║    Phase 3 테스트 완료!                  ║');
console.log('╚═══════════════════════════════════════════╝\n');
