const { ProgramRunner } = require('./dist/cli/runner');

const code = `
fn test(x) {
  let y = x + 1
  println("Inside test: x=" + str(x) + ", y=" + str(y))
  return y
}

println("Before call")
let result = test(5)
println("After call, result=" + str(result))
result
`;

const runner = new ProgramRunner();
console.log('🔍 함수 호출 디버깅\n');

const result = runner.runString(code);
console.log('실행 결과:');
console.log('  Success:', result.success);
console.log('  Output:', result.output);
if (result.error) console.log('  Error:', result.error);

// 함수 레지스트리 확인
const registry = runner.getRegistry();
console.log('\n📋 함수 레지스트리:');
const funcs = registry.listFunctions ? registry.listFunctions() : [];
console.log('  등록된 함수:', funcs.length);
if (funcs.length > 0) {
  funcs.slice(0, 5).forEach(f => console.log(`    - ${f.name} (params: ${f.params.join(', ')})`));
}
