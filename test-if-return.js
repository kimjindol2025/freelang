const { ProgramRunner } = require('./dist/cli/runner');

const code = `
fn test(arr) {
  if arr.length == 0 {
    return 0.0
  }
  let sorted = arr.sort()
  let idx = 1
  return sorted[idx]
}

let data = [3, 1, 2]
let x = test(data)
println("Got x")
`;

const runner = new ProgramRunner();
const result = runner.runString(code);
console.log('\nSuccess:', result.success);
console.log('Output:', result.output);
console.log('Error:', result.error);
