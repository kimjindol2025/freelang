import { Parser } from './src/cli/parser';

const code = `
SET requests = [httpGet("url1"), httpGet("url2")]
SET results = AWAIT Promise.all(requests)
`;

try {
  const parser = new Parser();
  const ast = parser.parse(code);
  console.log(JSON.stringify(ast, null, 2).slice(0, 1000));
} catch (error: any) {
  console.log(`에러: ${error.message}`);
}
