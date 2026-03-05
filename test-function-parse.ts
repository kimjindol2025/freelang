import { Lexer, TokenBuffer } from './src/lexer/lexer';
import { Parser } from './src/parser/parser';

const source = `fn abs(n) {
  if n < 0 {
    return -n
  }
  return n
}`;
console.log('Source:', source);

const lexer = new Lexer(source);
const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: false });
const parser = new Parser(tokenBuffer);
const ast = parser.parseModule() as any;

console.log('Statements count:', ast.statements?.length);
console.log('First statement type:', ast.statements?.[0]?.type);
console.log('First statement:', JSON.stringify(ast.statements?.[0], null, 2).slice(0, 500));
