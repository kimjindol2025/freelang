const { ProgramRunner } = require('./dist/cli/runner');

const code = `
println("Start")
println("End")
`;

const runner = new ProgramRunner();
const result = runner.runString(code);
console.log('\nSuccess:', result.success);
console.log('Output:', result.output);
console.log('Error:', result.error);
