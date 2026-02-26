#!/usr/bin/env node

/**
 * v8.9: System Exception Mapping 검증
 * 엔진이 시스템 트랩을 자동으로 감지
 */

const { PCInterpreter } = require('./dist/cli/pc-interpreter');

let passCount = 0;
let failCount = 0;

function test(name, code, expectException = false) {
  try {
    console.log(`\n【${name}】`);
    const interpreter = new PCInterpreter();
    const result = interpreter.run(code);
    if (expectException) {
      console.log(`  ❌ FAIL: 예외 예상, 하지만 성공`);
      failCount++;
    } else {
      console.log(`  ✅ PASS`);
      passCount++;
    }
  } catch (err) {
    if (expectException) {
      console.log(`  ✅ PASS (예외 감지)`);
      passCount++;
    } else {
      console.log(`  ❌ FAIL: ${err.message.substring(0, 60)}`);
      failCount++;
    }
  }
}

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║     v8.9: System Exception Mapping Verification Tests     ║');
console.log('╚════════════════════════════════════════════════════════════╝');

// TC_V8_9_001: ArithmeticException - 0 나눗셈
test(
  'TC_V8_9_001: ArithmeticException - 0으로 나눗셈',
  `
  try {
    let a = 10;
    let b = 0;
    let c = a / b;
  } catch (e: ArithmeticException) {
    println("caught");
  }
  `
);

// TC_V8_9_002: ArithmeticException - 0으로 나머지
test(
  'TC_V8_9_002: ArithmeticException - 0으로 나머지',
  `
  try {
    let x = 10;
    let y = x % 0;
  } catch (e: ArithmeticException) {
    println("caught");
  }
  `
);

// TC_V8_9_003: NullReferenceException - NULL 멤버 접근
test(
  'TC_V8_9_003: NullReferenceException - NULL 멤버 접근',
  `
  try {
    let n = 0;
    let f = n.field;
  } catch (e: NullReferenceException) {
    println("caught");
  }
  `
);

// TC_V8_9_004: StackOverflowException - 재귀 초과
test(
  'TC_V8_9_004: StackOverflowException - 재귀 깊이 초과',
  `
  fn deep() {
    deep();
  }
  
  try {
    deep();
  } catch (e: StackOverflowException) {
    println("caught");
  }
  `
);

// TC_V8_9_005: Polymorphic Catch - Exception으로 모두 포획
test(
  'TC_V8_9_005: Polymorphic Catch - Exception base class',
  `
  try {
    let x = 100 / 0;
  } catch (e: Exception) {
    println("caught");
  }
  `
);

// TC_V8_9_006: 핸들러 없는 예외
test(
  'TC_V8_9_006: No handler - 시스템 에러로 전파',
  `
  let a = 10 / 0;
  `,
  true  // 예외 예상
);

// 회귀: v8.8 Exception Chaining
test(
  'Regression: v8.8 Exception Chaining',
  `
  try {
    try {
      throw new Exception();
    } catch (e: Exception) {
      println("inner");
    }
  } catch (e: Exception) {
    println("outer");
  }
  `
);

// 회귀: v8.7 FINALLY
test(
  'Regression: v8.7 FINALLY + Exception',
  `
  try {
    try {
      let x = 5 / 0;
    } finally {
      println("finally");
    }
  } catch (e: ArithmeticException) {
    println("caught");
  }
  `
);

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log(`║  Results: ${passCount + failCount}/8 TESTS | PASS: ${passCount} | FAIL: ${failCount}${
  failCount === 0 ? ' ✅' : ''
}                   ║`);
console.log('╚════════════════════════════════════════════════════════════╝\n');

process.exit(failCount > 0 ? 1 : 0);
