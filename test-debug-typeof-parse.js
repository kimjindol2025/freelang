const { Lexer } = require('./dist/lexer/lexer');
const { TokenBuffer } = require('./dist/lexer/token-buffer');
const { Parser } = require('./dist/parser/parser');

const code = `
let x = 5
println(typeof x)
`;

const lexer = new Lexer(code);
const tokens = lexer.tokenize();
console.log('=== Tokens ===');
tokens.slice(0, 20).forEach(t => console.log(`  ${t.type}: ${t.value}`));

const buffer = new TokenBuffer(tokens);
const parser = new Parser(buffer);
const ast = parser.parseModule();
console.log('\n=== AST ===');
console.log(JSON.stringify(ast, null, 2).slice(0, 1000));
