/**
 * Phase 4: Error Handling with Async Functions
 *
 * 기능:
 * - ASYNC FUNC 내에서 TRY/CATCH/FINALLY 지원
 * - Promise rejection 처리
 * - 에러 전파 및 복구
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
console.log('║  Phase 4: Error Handling (Async)        ║');
console.log('╚═══════════════════════════════════════════╝');

// Test 1: ASYNC FUNC에서 TRY/CATCH 기본
test(
  'Test 1: ASYNC FUNC 내 TRY/CATCH',
  `
ASYNC FUNC safeFetch(url) {
  TRY {
    SET response = AWAIT httpGet(url)
    RETURN response
  } CATCH (err) {
    PRINT "Error caught"
    RETURN NULL
  }
}

SET result = AWAIT safeFetch("https://invalid-url-12345.com")
PRINT "Result"
`
);

// Test 2: ASYNC FUNC에서 TRY/FINALLY
test(
  'Test 2: ASYNC FUNC 내 TRY/FINALLY (정리)',
  `
ASYNC FUNC fetchWithCleanup() {
  TRY {
    PRINT "Starting"
    SET data = AWAIT httpGet("https://jsonplaceholder.typicode.com/users/1")
    PRINT "Fetch ok"
    RETURN data
  } FINALLY {
    PRINT "Cleanup"
  }
}

SET userData = AWAIT fetchWithCleanup()
PRINT "Done"
`
);

// Test 3: CATCH에서 값 반환
test(
  'Test 3: CATCH 블록에서 대체값 반환',
  `
ASYNC FUNC safeGet(url) {
  TRY {
    RETURN AWAIT httpGet(url)
  } CATCH (e) {
    RETURN "default"
  }
}

SET result1 = AWAIT safeGet("https://jsonplaceholder.typicode.com/users/1")
PRINT "Got data"

SET result2 = AWAIT safeGet("https://invalid.com")
PRINT "Got default"
`
);

// Test 4: TRY/CATCH/FINALLY 모두
test(
  'Test 4: TRY/CATCH/FINALLY 완벽한 조합',
  `
ASYNC FUNC fullExample() {
  TRY {
    PRINT "Try block"
    RETURN AWAIT httpGet("https://jsonplaceholder.typicode.com/users/1")
  } CATCH (err) {
    PRINT "Catch block"
    RETURN NULL
  } FINALLY {
    PRINT "Finally block"
  }
}

SET result = AWAIT fullExample()
PRINT "Complete"
`
);

console.log('\n╔═══════════════════════════════════════════╗');
console.log('║    Phase 4 테스트 완료!                  ║');
console.log('╚═══════════════════════════════════════════╝\n');
