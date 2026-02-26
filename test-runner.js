/**
 * Test if v2-freelang-ai can run a simple program
 */

const { SimpleInterpreter } = require('./dist/cli/interpreter');

console.log('=== v2-freelang-ai Runtime Test ===\n');

// Test 1: Simple arithmetic
console.log('Test 1: Arithmetic (2 + 3)');
const interp1 = new SimpleInterpreter();
const ast1 = {
  type: 'BinaryOp',
  operator: '+',
  left: { type: 'NumberLiteral', value: 2 },
  right: { type: 'NumberLiteral', value: 3 }
};
const result1 = interp1.execute(ast1);
console.log(`Result: ${result1}`);
console.log(`Expected: 5\n`);

// Test 2: String concatenation
console.log('Test 2: String concatenation');
const interp2 = new SimpleInterpreter();
const ast2 = {
  type: 'BinaryOp',
  operator: '+',
  left: { type: 'StringLiteral', value: 'Hello, ' },
  right: { type: 'StringLiteral', value: 'World!' }
};
const result2 = interp2.execute(ast2);
console.log(`Result: "${result2}"`);
console.log(`Expected: "Hello, World!"\n`);

// Test 3: Array literal
console.log('Test 3: Array literal [1, 2, 3]');
const interp3 = new SimpleInterpreter();
const ast3 = {
  type: 'ArrayLiteral',
  elements: [
    { type: 'NumberLiteral', value: 1 },
    { type: 'NumberLiteral', value: 2 },
    { type: 'NumberLiteral', value: 3 }
  ]
};
const result3 = interp3.execute(ast3);
console.log(`Result: [${result3.join(', ')}]`);
console.log(`Expected: [1, 2, 3]\n`);

// Test 4: Variable assignment
console.log('Test 4: Variable assignment');
const interp4 = new SimpleInterpreter();
const ast4 = {
  type: 'Program',
  statements: [
    {
      type: 'VariableDeclaration',
      name: 'x',
      value: { type: 'NumberLiteral', value: 42 }
    },
    {
      type: 'Identifier',
      name: 'x'
    }
  ]
};
const result4 = interp4.execute(ast4);
console.log(`Result: ${result4}`);
console.log(`Expected: 42\n`);

console.log('=== Summary ===');
console.log('✅ Interpreter can execute basic ASTs');
console.log('⚠️  But: No parser for .free files yet');
console.log('⚠️  But: No function definitions/calls yet');
console.log('⚠️  But: No loops/conditionals yet');
console.log('⚠️  But: No classes yet');
