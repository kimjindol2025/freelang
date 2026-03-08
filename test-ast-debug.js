const { Lexer } = require('./dist/lexer/lexer');
const { TokenBuffer } = require('./dist/lexer/token-buffer');
const { Parser } = require('./dist/parser/parser');

const code = `
fn test(x) {
  let y = x + 1
  println(y)
  return y
}
`;

const lexer = new Lexer(code);
const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: false });
const parser = new Parser(tokenBuffer);
const ast = parser.parseModule();

console.log('📋 AST 구조 분석\n');

if (ast.statements) {
  ast.statements.forEach(stmt => {
    if (stmt && stmt.type === 'function') {
      console.log(`함수: ${stmt.name}`);
      console.log(`  params: ${JSON.stringify(stmt.params?.map(p => p.name))}`);
      console.log(`  body 타입: ${stmt.body?.type}`);
      console.log(`  body 구조:`, JSON.stringify(stmt.body, null, 2).substring(0, 300));
    }
  });
}
