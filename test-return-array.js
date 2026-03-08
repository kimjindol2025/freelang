const { ProgramRunner } = require('./dist/cli/runner');

const code = `
fn processArray(arr) {
  let result = arr.sort()
  return result
}

let data = [3, 1, 2]
let output = processArray(data)
println("Output: " + str(output))
`;

const runner = new ProgramRunner();
const result = runner.runString(code);
console.log('\nSuccess:', result.success);
console.log('Output:', result.output);
console.log('Error:', result.error);
