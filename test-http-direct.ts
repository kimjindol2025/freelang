/**
 * HTTP Library Direct Test
 */

import { Parser } from './src/cli/parser';
import { SimpleInterpreter } from './src/cli/simple-interpreter-v2';

function testHTTP(name: string, code: string) {
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
console.log('║      HTTP Library 직접 테스트         ║');
console.log('╚════════════════════════════════════════╝');

// Test 1: encodeURL
testHTTP(
  'Test 1: URL 인코딩',
  `
SET encoded = encodeURL("hello world & special")
PRINT encoded
`
);

// Test 2: decodeURL
testHTTP(
  'Test 2: URL 디코딩',
  `
SET decoded = decodeURL("hello%20world%20%26%20special")
PRINT decoded
`
);

// Test 3: buildQuery (객체에서 쿼리 문자열 생성)
testHTTP(
  'Test 3: 쿼리 문자열 생성',
  `
SET query = buildQuery({})
PRINT query
`
);

// Test 4: parseQuery (쿼리 문자열 파싱)
testHTTP(
  'Test 4: 쿼리 문자열 파싱',
  `
SET parsed = parseQuery("name=John&age=30")
PRINT parsed
`
);

console.log('\n╔════════════════════════════════════════╗');
console.log('║      HTTP 라이브러리 테스트 완료!      ║');
console.log('╚════════════════════════════════════════╝\n');
