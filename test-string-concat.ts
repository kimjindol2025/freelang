import { Parser } from './src/cli/parser';

const code = `
ASYNC FUNC greet(n) {
  RETURN "Hello, " + n + "!"
}
`;

try {
  const parser = new Parser();
  const ast = parser.parse(code);
  console.log("✓ 파싱 성공");
  console.log(JSON.stringify(ast.statements[0], null, 2).slice(0, 500));
} catch (error: any) {
  console.log(`✗ 에러: ${error.message}`);
}
