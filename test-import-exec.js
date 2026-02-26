const { Parser } = require('./src/cli/parser');
const { SimpleInterpreter } = require('./src/cli/simple-interpreter-v2');
const fs = require('fs');

const code = 'IMPORT math FROM "stdlib/math"';

try {
  const parser = new Parser();
  const ast = parser.parse(code);
  console.log('Parse successful');
  
  const interpreter = new SimpleInterpreter();
  interpreter.execute(ast);
  console.log('Execution successful');
} catch (e) {
  console.error('Error:', e.message);
  console.error('Stack:', e.stack?.split('\n').slice(0, 3).join('\n'));
}
