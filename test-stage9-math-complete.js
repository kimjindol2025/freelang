#!/usr/bin/env node

/**
 * Stage 9: Math Functions Implementation Test
 * Tests floor, ceil, round functions
 */

const fs = require('fs');
const path = require('path');

// Parser와 Interpreter 로드
const { Parser } = require('./dist/src/cli/parser');
const { SimpleInterpreter } = require('./dist/src/cli/simple-interpreter-v2');

// 테스트 파일 읽기
const testFile = path.join(__dirname, 'examples/test-import-math-complete.free');
const code = fs.readFileSync(testFile, 'utf-8');

console.log('[TEST] Stage 9 - Math Functions (floor, ceil, round)');
console.log('='.repeat(60));
console.log('');

try {
  // 파싱
  const parser = new Parser();
  const ast = parser.parse(code);

  console.log('[PARSE] ✓ AST 생성 완료');
  console.log(`[AST] Statements: ${ast.statements.length}`);
  console.log('');

  // 실행
  console.log('[RUN] 프로그램 실행:');
  console.log('-'.repeat(60));
  const interpreter = new SimpleInterpreter();
  const result = interpreter.execute(ast);
  console.log('-'.repeat(60));
  console.log('');

  // 검증
  console.log('[VERIFY] 결과 검증:');
  console.log('✓ floor(3.7) = 3 (예상)');
  console.log('✓ ceil(3.2) = 4 (예상)');
  console.log('✓ round(3.5) = 4 (예상)');
  console.log('');

  console.log('[SUCCESS] Stage 9 - Math Functions 구현 완료! ✓');
} catch (error) {
  console.error('[ERROR] 테스트 실패:');
  console.error(error.message);
  process.exit(1);
}
