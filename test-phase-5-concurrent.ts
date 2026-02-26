/**
 * Phase 5: Concurrent Execution
 *
 * 기능:
 * - Promise.all() - 모든 Promise를 동시에 대기
 * - Promise.race() - 가장 빠른 Promise 반환
 * - Promise.resolve() - 값을 Promise로 변환
 * - Promise.reject() - 거부 Promise 생성
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
console.log('║  Phase 5: Concurrent Execution          ║');
console.log('╚═══════════════════════════════════════════╝');

// Test 1: Promise.all - 여러 HTTP 요청 동시 실행
test(
  'Test 1: Promise.all (동시 HTTP 요청)',
  `
ASYNC FUNC fetchMultipleUsers() {
  SET urls = [
    "https://jsonplaceholder.typicode.com/users/1",
    "https://jsonplaceholder.typicode.com/users/2"
  ]
  
  SET requests = [
    httpGet(urls[0]),
    httpGet(urls[1])
  ]
  
  SET results = AWAIT Promise.all(requests)
  PRINT "Got 2 users"
  RETURN results
}

SET users = AWAIT fetchMultipleUsers()
PRINT "Complete"
`
);

// Test 2: Promise.race - 빠른 응답 먼저
test(
  'Test 2: Promise.race (가장 빠른 응답)',
  `
ASYNC FUNC fastestUser() {
  SET requests = [
    httpGet("https://jsonplaceholder.typicode.com/users/1"),
    httpGet("https://jsonplaceholder.typicode.com/users/2"),
    httpGet("https://jsonplaceholder.typicode.com/users/3")
  ]
  
  SET winner = AWAIT Promise.race(requests)
  PRINT "First response received"
  RETURN winner
}

SET result = AWAIT fastestUser()
PRINT "Race complete"
`
);

// Test 3: Promise.resolve - 즉시 완료되는 Promise
test(
  'Test 3: Promise.resolve (값 → Promise)',
  `
ASYNC FUNC immediate() {
  SET prom = AWAIT Promise.resolve("instant")
  RETURN prom
}

SET value = AWAIT immediate()
PRINT value
`
);

// Test 4: 혼합 - 빠른 요청들만 선택
test(
  'Test 4: 혼합 패턴 (Promise.all + filtering)',
  `
ASYNC FUNC fetchAndFilter() {
  SET ids = [1, 2, 3, 4, 5]
  
  SET requests = [
    httpGet("https://jsonplaceholder.typicode.com/users/1"),
    httpGet("https://jsonplaceholder.typicode.com/users/2"),
    httpGet("https://jsonplaceholder.typicode.com/users/3")
  ]
  
  SET data = AWAIT Promise.all(requests)
  PRINT "Got all 3 users concurrently"
  RETURN data
}

SET result = AWAIT fetchAndFilter()
PRINT "Done"
`
);

console.log('\n╔═══════════════════════════════════════════╗');
console.log('║    Phase 5 테스트 완료!                  ║');
console.log('╚═══════════════════════════════════════════╝\n');
