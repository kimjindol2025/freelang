const { ProgramRunner } = require('./dist/cli/runner');

const code = `
fn test() {
  let arr = [10, 20, 30]
  let idx = 1
  return arr[idx]
}

let x = test()
println("Got x")
`;

const runner = new ProgramRunner();
const result = runner.runString(code);
console.log('\nSuccess:', result.success);
console.log('Output:', result.output);
console.log('Error:', result.error);
