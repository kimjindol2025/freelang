const { ProgramRunner } = require('./dist/cli/runner');

const code = `
fn filterDistance(measurements) {
  if measurements.length == 0 {
    return 0.0
  }
  let sorted = measurements.sort()
  return sorted
}

let data = [10.0, 11.0, 12.0]
let result = filterDistance(data)
println("Result: " + str(result))
`;

const runner = new ProgramRunner();
const result = runner.runString(code);
console.log('\nSuccess:', result.success);
console.log('Output:', result.output);
console.log('Error:', result.error);
