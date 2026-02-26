import { Parser } from './src/cli/parser';

const code = `ASYNC FUNC greet(n) {
  RETURN "Hello, " + n + "!"
}`;

const parser = new Parser();

// 파서 내부 상태 추적하기 위해 parse 메서드 감싸기
try {
  console.log('=== 파싱 시작 ===');
  const ast = parser.parse(code);
  console.log('✓ 파싱 성공');
  console.log(JSON.stringify(ast, null, 2));
} catch (error: any) {
  console.log(`✗ 에러: ${error.message}`);
  console.log(`스택:`);
  console.log(error.stack);
}
