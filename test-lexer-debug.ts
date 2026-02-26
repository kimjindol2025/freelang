import { Lexer } from './src/cli/lexer';

const code = `ASYNC FUNC greet(n) {
  RETURN "Hello, " + n + "!"
}`;

const lexer = new Lexer();
const tokens = lexer.lex(code);

console.log('=== 토큰 목록 ===');
tokens.forEach((t: any, i: number) => {
  console.log(`${i}: type=${t.type}, value="${t.value}"`);
});

// RETURN 문부터 시작
console.log('\n=== RETURN 이후 토큰 ===');
const returnIdx = tokens.findIndex((t: any) => t.value === 'RETURN');
tokens.slice(returnIdx, returnIdx + 10).forEach((t: any, i: number) => {
  console.log(`${returnIdx + i}: type=${t.type}, value="${t.value}"`);
});
