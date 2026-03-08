const { ProgramRunner } = require('./dist/cli/runner');

const runner = new ProgramRunner();

const codes = [
  `let x = 5; println(x)`,  // Module level
  `fn test() { println(5) } test()`,  // Function with literal
  `fn test() { let x = 5; println(5) } test()`,  // Function with var but literal arg
  `fn test() { let x = 5; println(x) } test()`,  // Function with var + var arg
];

codes.forEach((code, idx) => {
  const ir = runner.getIR(code);
  console.log(`[${idx + 1}] IR 길이: ${ir.length}`);
  console.log(`    Code: ${code.substring(0, 50)}`);
  if (ir.length < 20) {
    console.log(`    IR: ${JSON.stringify(ir).substring(0, 100)}`);
  }
  console.log();
});
