const { Parser } = require('./src/cli/parser');
const { SimpleInterpreter } = require('./src/cli/simple-interpreter-v2');
const fs = require('fs');

const code = fs.readFileSync('examples/test-import-math.free', 'utf-8');

console.log('Code to parse:');
console.log('─────────────');
console.log(code);
console.log('─────────────');

try {
  const parser = new Parser();
  const ast = parser.parse(code);
  console.log('\n✓ Parse successful');
  console.log(`  ${ast.statements.length} statements`);
  
  const interpreter = new SimpleInterpreter();
  interpreter.execute(ast);
  console.log('\n✓ Execution successful');
} catch (e) {
  console.error('\n✗ Error:', e.message);
  if (e.stack) {
    const lines = e.stack.split('\n');
    console.error('Stack trace:');
    lines.slice(0, 5).forEach(line => console.error('  ' + line));
  }
}
