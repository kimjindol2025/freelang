const { ProgramRunner } = require('./dist/cli/runner');

// 더 간단한 테스트
const simpleTests = [
  {
    code: `let x = 5; println(x); x`,
    name: 'Module-level var + println'
  },
  {
    code: `fn test() { let x = 5; return x } test()`,
    name: 'Function var return'
  },
  {
    code: `fn test() { let x = 5; println(x); return x } test()`,
    name: 'Function var + println + return'
  },
];

const runner = new ProgramRunner();

simpleTests.forEach((test, idx) => {
  const result = runner.runString(test.code);
  console.log(`[${idx + 1}] ${test.name}`);
  console.log(`    Result: ${result.output}`);
  if (result.error) console.log(`    Error: ${result.error.substring(0, 50)}`);
});
