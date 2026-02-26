const path = require('path');
const { Parser } = require('./src/cli/parser');

const code = 'IMPORT math FROM "stdlib/math"';

try {
  const parser = new Parser();
  const ast = parser.parse(code);
  console.log('Parse successful!');
  console.log(JSON.stringify(ast, null, 2));
} catch (e) {
  console.error('Parse error:', e.message);
  console.error('Stack:', e.stack);
}
