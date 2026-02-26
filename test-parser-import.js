const { Lexer } = require('./dist/cli/lexer');
const { Parser } = require('./dist/cli/parser');

const code = `IMPORT math FROM "stdlib/math"`;

const lexer = new Lexer();
const tokens = lexer.lex(code);

console.log('Tokens:');
tokens.forEach(t => {
  console.log(`  ${t.type}: ${JSON.stringify(t.value)}`);
});

try {
  const parser = new Parser();
  const ast = parser.parse(code);
  console.log('\nAST:');
  console.log(JSON.stringify(ast, null, 2));
} catch (e) {
  console.error('Parse error:', e.message);
}
