import { Parser } from './src/cli/parser';

const code = `
ASYNC FUNC greet(name) {
  RETURN "Hello, " + name + "!"
}
`;

try {
  const parser = new Parser();
  const ast = parser.parse(code);
  console.log(JSON.stringify(ast, null, 2));
} catch (error: any) {
  console.log(`❌ 파싱 에러: ${error.message}`);
  console.log(error.stack);
}
