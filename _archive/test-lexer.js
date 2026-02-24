const { Lexer } = require('./dist/lexer/lexer');

const code = 'array<array<number>>';
const lexer = new Lexer(code);
const tokens = lexer.tokenize();

tokens.forEach(t => console.log(`${t.type}: ${t.value}`));
