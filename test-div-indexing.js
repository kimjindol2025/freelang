const { ProgramRunner } = require('./dist/cli/runner');

const code = `
fn test(arr) {
  let sorted = arr.sort()
  let idx = sorted.length / 2
  return sorted[idx]
}

let data = [10, 11, 12, 13, 14]
let x = test(data)
println("x=" + str(x))
`;

const runner = new ProgramRunner();
const result = runner.runString(code);
console.log('\nSuccess:', result.success);
console.log('Output:', result.output);
console.log('Error:', result.error);
