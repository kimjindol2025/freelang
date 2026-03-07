const { ProgramRunner } = require('./dist/cli/runner');
const fs = require('fs');

const code = fs.readFileSync('/home/kimjin/Desktop/kim/robot-ai-project/software/robot_ai_operational.fl', 'utf-8');

const runner = new ProgramRunner();
const result = runner.runString(code);
console.log('\nSuccess:', result.success);
console.log('Output:', result.output);
if (result.error) {
  console.log('Error:', result.error);
}
