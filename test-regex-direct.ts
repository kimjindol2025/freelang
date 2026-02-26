/**
 * Regex Library Direct Test
 */

import { Parser } from './src/cli/parser';
import { SimpleInterpreter } from './src/cli/simple-interpreter-v2';

function testRegex(name: string, code: string) {
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
console.log('║      Regex Library 직접 테스트         ║');
console.log('╚════════════════════════════════════════╝');

// Test 1: test() - 패턴 매칭
testRegex(
  'Test 1: 패턴 매칭 (regex.test)',
  `
IMPORT regex FROM "stdlib/regex"
SET has_digits = regex.test("[0-9]+", "abc123def")
PRINT has_digits
`
);

// Test 2: match() - 첫 매치
testRegex(
  'Test 2: 첫 매치 (regex.match)',
  `
IMPORT regex FROM "stdlib/regex"
SET first = regex.match("[0-9]+", "abc123def456")
PRINT first
`
);

// Test 3: matchAll() - 모든 매치
testRegex(
  'Test 3: 모든 매치 (regex.matchAll)',
  `
IMPORT regex FROM "stdlib/regex"
SET all = regex.matchAll("[0-9]+", "abc123def456ghi789")
PRINT all
`
);

// Test 4: regexReplace() - 첫 번째만 치환
testRegex(
  'Test 4: 첫 치환 (regex.regexReplace)',
  `
IMPORT regex FROM "stdlib/regex"
SET replaced = regex.regexReplace("[0-9]+", "abc123def456", "X")
PRINT replaced
`
);

// Test 5: regexReplaceAll() - 모두 치환
testRegex(
  'Test 5: 모두 치환 (regex.regexReplaceAll)',
  `
IMPORT regex FROM "stdlib/regex"
SET replaced_all = regex.regexReplaceAll("[0-9]+", "abc123def456ghi789", "X")
PRINT replaced_all
`
);

// Test 6: regexSplit() - 분할
testRegex(
  'Test 6: 분할 (regex.regexSplit)',
  `
IMPORT regex FROM "stdlib/regex"
SET parts = regex.regexSplit("[0-9]+", "abc123def456ghi789")
PRINT parts
`
);

console.log('\n╔════════════════════════════════════════╗');
console.log('║      Regex 라이브러리 테스트 완료!      ║');
console.log('╚════════════════════════════════════════╝\n');
