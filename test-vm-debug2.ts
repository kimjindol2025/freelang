import { Lexer, TokenBuffer } from './src/lexer/lexer';
import { Parser } from './src/parser/parser';
import { IRGenerator } from './src/codegen/ir-generator';
import { VM } from './src/vm';
import { FunctionRegistry } from './src/parser/function-registry';
import { registerStdlibFunctions } from './src/stdlib-builtins';

// Try explicit main execution
const source = `
let x = 5
fn add(a, b) { return a + b }
fn main() { return add(x, 3) }
`;

console.log('Source:', source);

const lexer = new Lexer(source);
const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: false });
const parser = new Parser(tokenBuffer);
const ast = parser.parseModule() as any;

const gen = new IRGenerator();
const ir = gen.generateModuleIR(ast);
console.log('IR length:', ir.length);
console.log('IR:', ir.map((i: any) => `Op${i.op}${i.arg ? `(${i.arg})` : ''}`).join(', '));

const registry = new FunctionRegistry();
const vm = new VM(registry);
registerStdlibFunctions(vm.getNativeFunctionRegistry());

// Register functions
if (ast.statements) {
  for (const stmt of ast.statements) {
    if (stmt && stmt.type === 'function') {
      const fn = stmt as any;
      registry.register({
        type: 'FunctionDefinition',
        name: fn.name,
        params: fn.params?.map((p: any) => p.name) || [],
        body: fn.body
      });
      console.log('Registered function:', fn.name);
    }
  }
}

const result = vm.run(ir);
console.log('Result:', result);

// Try calling main directly
console.log('\n--- Calling main() ---');
const callMainIR = [
  { op: 42, arg: 'main' },  // Op.CALL
  { op: 95 }  // Op.HALT
];
const result2 = vm.run(callMainIR);
console.log('Result2:', result2);
