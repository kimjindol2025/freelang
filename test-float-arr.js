const { ProgramRunner } = require('./dist/cli/runner');

const code = `
fn test(arr) {
  let sorted = arr.sort()
  let mid = sorted.length / 2
  println("mid=" + str(mid))
  return sorted[mid]
}

let data = [10.0, 11.0, 12.0, 13.0, 14.0]
let x = test(data)
println("x=" + str(x))
`;

const runner = new ProgramRunner();
const result = runner.runString(code);
console.log('\nSuccess:', result.success);
console.log('Output:', result.output);
console.log('Error:', result.error);
