const { Parser } = require('./src/cli/parser');
const fs = require('fs');

const code = fs.readFileSync('stdlib/math/lib.free', 'utf-8');

try {
  const parser = new Parser();
  const ast = parser.parse(code);
  console.log('Parse successful!');
  console.log(`Parsed ${ast.statements.length} statements`);
  ast.statements.slice(0, 2).forEach(stmt => {
    console.log(`- ${stmt.type}: ${stmt.name || stmt.variable}`);
  });
} catch (e) {
  console.error('Parse error:', e.message);
  console.error('At position:', e.stack?.split('\n')[1]);
}
