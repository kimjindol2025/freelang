const { ProgramRunner } = require('./dist/cli/runner');

const code = `
let x = 5
println(typeof x)
`;

const runner = new ProgramRunner();
const result = runner.runString(code);
console.log('Success:', result.success);
console.log('Output:', result.output);
console.log('Error:', result.error);
