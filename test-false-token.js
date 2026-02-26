const { Lexer } = require('./src/cli/lexer');

const code = 'RETURN FALSE';

const lexer = new Lexer();
const tokens = lexer.lex(code);

tokens.forEach((t, i) => {
  console.log(`${i}: ${t.type.padEnd(15)} = ${JSON.stringify(t.value)}`);
});
