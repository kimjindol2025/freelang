/**
 * Phase 4+: THROW 예외 발생
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
console.log('║    Phase 4+: THROW 예외 발생             ║');
console.log('╚═══════════════════════════════════════════╝');

// Test 1: 단순 THROW
test(
  'Test 1: 단순 THROW',
  `
ASYNC FUNC riskyOperation() {
  TRY {
    THROW "Something went wrong"
  } CATCH (err) {
    PRINT "Caught: " + err
    RETURN "recovered"
  }
}

SET result = AWAIT riskyOperation()
PRINT result
`
);

// Test 2: 조건부 THROW
test(
  'Test 2: 조건부 THROW',
  `
ASYNC FUNC divide(a, b) {
  IF b == 0 {
    THROW "Division by zero"
  }
  RETURN a / b
}

SET x = AWAIT divide(10, 2)
PRINT "OK: " + x

TRY {
  SET y = AWAIT divide(10, 0)
} CATCH (err) {
  PRINT "Caught: " + err
}
`
);

// Test 3: 중첩 THROW + 재발생
test(
  'Test 3: THROW 재발생',
  `
ASYNC FUNC inner() {
  THROW "Inner error"
}

ASYNC FUNC outer() {
  TRY {
    SET result = AWAIT inner()
  } CATCH (err) {
    PRINT "Re-throwing: " + err
    THROW "Wrapped: " + err
  }
}

TRY {
  SET result = AWAIT outer()
} CATCH (err) {
  PRINT "Final catch: " + err
}
`
);

console.log('\n╔═══════════════════════════════════════════╗');
console.log('║    THROW 테스트 완료!                    ║');
console.log('╚═══════════════════════════════════════════╝\n');
