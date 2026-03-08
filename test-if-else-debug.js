const fs = require('fs');
const { Lexer } = require('./dist/src/script-runner/lexer');
const { Parser } = require('./dist/src/script-runner/parser');

const code = fs.readFileSync('./test-if-else.fl', 'utf8');

try {
  const lexer = new Lexer(code);
  const { tokens, errors: lexErrors } = lexer.tokenize();
  if (lexErrors.length > 0) {
    console.error('Lex errors:', lexErrors);
    process.exit(1);
  }

  const parser = new Parser(tokens);
  const { program, errors } = parser.parse();
  if (errors.length > 0) {
    console.error('❌ Parser errors:', errors.length);
    errors.forEach(e => console.error('  -', e.message));
    process.exit(1);
  }

  console.log('✅ PASS');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
