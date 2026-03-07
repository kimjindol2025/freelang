const { ProgramRunner } = require('./dist/cli/runner');

const code = `
fn test(arr) {
  let len = arr.length
  println("len=" + str(len))
  return len
}

let data = [10, 11, 12]
let x = test(data)
println("x=" + str(x))
`;

const runner = new ProgramRunner();
const result = runner.runString(code);
console.log('\nSuccess:', result.success);
console.log('Output:', result.output);
console.log('Error:', result.error);
