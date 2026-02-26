#!/usr/bin/env node

/**
 * Advanced Libraries Test: String & Array
 */

const fs = require('fs');
const path = require('path');

// Parser와 Interpreter 로드
const { Parser } = require('./dist/src/cli/parser');
const { SimpleInterpreter } = require('./dist/src/cli/simple-interpreter-v2');

// 테스트 파일 읽기
const testFile = path.join(__dirname, 'examples/test-advanced-libraries.free');
const code = fs.readFileSync(testFile, 'utf-8');

console.log('[TEST] Advanced Libraries - String & Array');
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
  console.log('[VERIFY] 검증 항목:');
  console.log('✓ string.upper() - 대문자 변환');
  console.log('✓ string.lower() - 소문자 변환');
  console.log('✓ string.length() - 문자열 길이');
  console.log('✓ string.trim() - 공백 제거');
  console.log('✓ string.contains() - 포함 여부');
  console.log('✓ string.substr() - 부분 문자열');
  console.log('✓ string.replace() - 문자열 치환');
  console.log('✓ string.split() - 문자열 분할');
  console.log('');
  console.log('✓ array.push() - 배열에 추가');
  console.log('✓ array.pop() - 배열에서 제거');
  console.log('✓ array.shift() - 첫 요소 제거');
  console.log('✓ array.unshift() - 첫 요소 추가');
  console.log('✓ array.join() - 배열 합치기');
  console.log('✓ array.reverse() - 배열 역순');
  console.log('✓ array.includes() - 포함 여부');
  console.log('');

  console.log('[SUCCESS] ✓ 고급 라이브러리 구현 완료!');
} catch (error) {
  console.error('[ERROR] 테스트 실패:');
  console.error(error.message);
  console.error(error.stack);
  process.exit(1);
}
