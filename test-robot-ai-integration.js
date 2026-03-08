const fs = require('fs');
const { ProgramRunner } = require('./dist/cli/runner');

const robotAIFile = '/home/kimjin/Desktop/kim/robot-ai-project/software/robot_ai_operational.fl';

try {
  const code = fs.readFileSync(robotAIFile, 'utf-8');

  console.log('🤖 Robot AI Operational Test');
  console.log('════════════════════════════════════════\n');
  console.log(`📄 파일: ${robotAIFile}`);
  console.log(`📝 코드 라인 수: ${code.split('\n').length}`);
  console.log(`📊 파일 크기: ${code.length} bytes\n`);

  const runner = new ProgramRunner();

  // 프로그램 실행
  console.log('🚀 프로그램 실행 시작...\n');
  const startTime = Date.now();

  const result = runner.runString(code);

  const elapsed = Date.now() - startTime;

  if (result.error) {
    console.log('❌ 실행 오류:');
    console.log(result.error);
  } else {
    console.log('✅ 실행 성공!');
    console.log(`⏱️  실행 시간: ${elapsed}ms`);
    console.log(`📤 출력:\n${result.output}`);
  }

  // IR 분석
  const ir = runner.getIR(code);
  console.log(`\n📊 IR 생성 통계:`);
  console.log(`   - IR 명령어 수: ${ir.length}`);
  console.log(`   - 파싱 성공: ${'✅'}`);

} catch (err) {
  console.error('❌ 예외 발생:');
  console.error(err.message);
}
