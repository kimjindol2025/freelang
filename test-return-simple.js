const { ProgramRunner } = require('./dist/cli/runner');

const code = `
fn add(a, b) {
  return a + b
}

let result = add(3, 4)
println("Result: " + str(result))
`;

const runner = new ProgramRunner();
const result = runner.runString(code);
console.log('\nSuccess:', result.success);
console.log('Output:', result.output);
console.log('Error:', result.error);
