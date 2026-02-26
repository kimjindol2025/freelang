import { Parser } from './src/cli/parser';

const code1 = `
FUNC add(a, b) {
  RETURN a + b
}
`;

const code2 = `
ASYNC FUNC add(a, b) {
  RETURN a + b
}
`;

console.log("=== Test 1: 동기 함수 ===");
try {
  const parser = new Parser();
  const ast = parser.parse(code1);
  console.log("✓ 파싱 성공");
} catch (error: any) {
  console.log(`✗ 에러: ${error.message}`);
}

console.log("\n=== Test 2: 비동기 함수 ===");
try {
  const parser = new Parser();
  const ast = parser.parse(code2);
  console.log("✓ 파싱 성공");
} catch (error: any) {
  console.log(`✗ 에러: ${error.message}`);
}
