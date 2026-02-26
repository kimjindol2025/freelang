const path = require('path');
const { Lexer } = require('./src/cli/lexer');

const code = 'IMPORT math FROM "stdlib/math"';

const lexer = new Lexer();
const tokens = lexer.lex(code);

console.log('Tokens for:', code);
tokens.forEach((t, i) => {
  console.log(`${i}: ${t.type.padEnd(15)} = ${JSON.stringify(t.value)}`);
});
