const { ProgramRunner } = require('./dist/cli/runner');

const tests = [
  { code: 'let x = 5; x', name: '기본 변수' },
  { code: 'fn add(a, b) { return a + b } add(3, 4)', name: '함수 호출' },
  { code: 'let sensor = {"distance": 100.5}; sensor["distance"]', name: '딕셔너리' },
  { code: 'let data = [1.0, 2.0, 3.0]; data[0]', name: '배열' },
  { code: 'let s = "hello"; s', name: '문자열' },
];

const runner = new ProgramRunner();
let passed = 0;
let failed = 0;

console.log('🧪 로봇 AI 기본 기능 테스트\n');

tests.forEach((test, idx) => {
  try {
    const result = runner.runString(test.code);
    const ir = runner.getIR(test.code);

    if (!result.error) {
      console.log(`✅ [${idx + 1}] ${test.name}`);
      console.log(`   결과: ${result.output}, IR: ${ir.length}개`);
      passed++;
    } else {
      console.log(`❌ [${idx + 1}] ${test.name}`);
      console.log(`   에러: ${result.error.substring(0, 60)}`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ [${idx + 1}] ${test.name}`);
    console.log(`   예외: ${err.message.substring(0, 60)}`);
    failed++;
  }
});

console.log(`\n📊 결과: ${passed} 통과, ${failed} 실패`);

// 로봇 AI 파일 직접 파싱 확인
console.log('\n🤖 로봇 AI 파일 파싱 분석');
const fs = require('fs');
const code = fs.readFileSync('/home/kimjin/Desktop/kim/robot-ai-project/software/robot_ai_operational.fl', 'utf-8');
const ir = runner.getIR(code);
console.log(`   - 코드 라인 수: ${code.split('\n').length}`);
console.log(`   - 파일 크기: ${code.length} bytes`);
console.log(`   - 생성된 IR 명령어: ${ir.length}`);
console.log(`   - 함수 정의 수: ${(code.match(/^fn /gm) || []).length}`);
console.log(`   - 상태: IR이 작아 보임 (함수 본문이 IR로 변환되지 않은 것 같음)`);
