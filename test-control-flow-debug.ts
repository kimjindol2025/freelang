import { Lexer, TokenBuffer } from './src/lexer/lexer';
import { Parser } from './src/parser/parser';

const source = 'fn abs(n) { if n < 0 { return -n } return n }';
console.log('Source:', source);

const lexer = new Lexer(source);
const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: false });
const parser = new Parser(tokenBuffer);
const ast = parser.parseModule() as any;

console.log('Statements:');
for (const stmt of ast.statements || []) {
  console.log('  -', JSON.stringify(stmt, null, 2));
}
