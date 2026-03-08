const { Lexer } = require('./dist/lexer/lexer');
const { TokenBuffer } = require('./dist/lexer/lexer');
const { Parser } = require('./dist/parser/parser');
const { IRGenerator } = require('./dist/codegen/ir-generator');

const code = `
println("Start")
println("End")
`;

const lexer = new Lexer(code);
const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: false });
const parser = new Parser(tokenBuffer);
const ast = parser.parseModule();

console.log('\n=== AST ===');
console.log('Statements:', ast.statements?.length);

const gen = new IRGenerator();
const ir = gen.generateModuleIR(ast);

console.log('\n=== IR Instructions ===');
ir.forEach((inst, idx) => {
  const opNames = {1: 'PUSH', 2: 'POP', 0x53: 'CALL', 0x54: 'RET', 0x5F: 'HALT'};
  const opName = opNames[inst.op] || `Op(${inst.op})`;
  console.log(`[${idx}] ${opName} ${inst.arg !== undefined ? inst.arg : ''}`);
});
