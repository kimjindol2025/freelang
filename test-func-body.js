const { ProgramRunner } = require('./dist/cli/runner');

const tests = [
  {
    code: `fn simple() { return 42 } simple()`,
    name: 'Simple function'
  },
  {
    code: `fn withPrint() { println("test"); return 99 } withPrint()`,
    name: 'Function with println'
  },
  {
    code: `fn withVar() { let x = 10; return x } withVar()`,
    name: 'Function with variable'
  },
  {
    code: `fn withVarAndPrint() { let x = 10; println(x); return x } withVarAndPrint()`,
    name: 'Function with var + println'
  },
];

const runner = new ProgramRunner();

tests.forEach((test, idx) => {
  const result = runner.runString(test.code);
  console.log(`[${idx + 1}] ${test.name}`);
  console.log(`    Result: ${result.output}, Error: ${result.error ? result.error.substring(0, 40) : 'none'}`);
});
