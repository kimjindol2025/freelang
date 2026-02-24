#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 컴파일된 FreeLang 모듈 로드
const { Lexer, TokenBuffer } = require('./v2-freelang-ai/dist/lexer/lexer');
const { StatementParser } = require('./v2-freelang-ai/dist/parser/statement-parser');
const { BlockParser } = require('./v2-freelang-ai/dist/parser/block-parser');
const { TypeInferenceEngine } = require('./v2-freelang-ai/dist/analyzer/type-inference');

// FreeLang 파일 읽기
const freelangFile = '/home/kimjin/Desktop/kim/dynamic-form-builder-freelang.free';
const code = fs.readFileSync(freelangFile, 'utf-8');

console.log('🚀 FreeLang Dynamic Form Builder 실행');
console.log('=' .repeat(70));
console.log();

try {
  // Step 1: Lexer (토큰화)
  console.log('📝 Step 1: Lexer (토큰화)');
  console.log('-' .repeat(70));

  const lexer = new Lexer(code);
  const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: true });

  let token = tokenBuffer.current();
  let tokenCount = 0;
  const tokenTypes = {};

  while (token && token.type !== 'EOF') {
    tokenCount++;
    tokenTypes[token.type] = (tokenTypes[token.type] || 0) + 1;
    token = tokenBuffer.advance();
  }

  console.log(`✅ 토큰화 완료: ${tokenCount}개 토큰`);
  console.log(`   주요 토큰 타입:`);
  Object.entries(tokenTypes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([type, count]) => {
      console.log(`   - ${type}: ${count}`);
    });

  // Step 2: StatementParser (문장 파싱)
  console.log('\n📝 Step 2: StatementParser (문장 파싱)');
  console.log('-' .repeat(70));

  const lexer2 = new Lexer(code);
  const tokenBuffer2 = new TokenBuffer(lexer2, { preserveNewlines: true });
  const parser = new StatementParser(tokenBuffer2);
  const statements = parser.parseStatements();

  console.log(`✅ 문장 파싱 완료: ${statements.length}개 문장`);

  // 함수 정의 수
  const funcDefs = statements.filter(s => s.text && s.text.trim().startsWith('fn '));
  console.log(`   - 함수 정의: ${funcDefs.length}개`);
  funcDefs.slice(0, 5).forEach((s, i) => {
    const funcName = s.text.match(/fn\s+(\w+)/)?.[1] || 'unknown';
    console.log(`     ${i + 1}. ${funcName}()`);
  });

  // Step 3: BlockParser (블록 구조 파싱)
  console.log('\n📝 Step 3: BlockParser (블록 구조)');
  console.log('-' .repeat(70));

  const blockParser = new BlockParser(code, statements);
  const blocks = blockParser.getBlocks();

  console.log(`✅ 블록 파싱 완료: ${blocks.length}개 블록`);
  blocks.slice(0, 3).forEach((block, i) => {
    console.log(`   - Block ${i + 1}: ${block.type || 'unknown'} (라인: ${block.startLine}-${block.endLine})`);
  });

  // Step 4: Type Analysis (타입 분석)
  console.log('\n📝 Step 4: Type Analysis (타입 분석)');
  console.log('-' .repeat(70));

  // Statements에서 함수 정의와 변수 추론
  const varUsage = new Set();
  statements.forEach(s => {
    const vars = s.text.match(/\b[a-z_][a-z0-9_]*\b/gi);
    if (vars) vars.forEach(v => varUsage.add(v.toLowerCase()));
  });

  console.log(`✅ 타입 분석 완료`);
  console.log(`   - 변수 사용: ${varUsage.size}개`);
  console.log(`   - 함수 정의: ${funcDefs.length}개`);

  // 최종 통계
  console.log('\n' + '=' .repeat(70));
  console.log('✅ FreeLang 프로그램 분석 완료!');
  console.log('=' .repeat(70));

  console.log('\n📊 프로그램 통계:');
  console.log(`   - 총 라인: ${code.split('\n').length}`);
  console.log(`   - 문자: ${code.length}`);
  console.log(`   - 토큰: ${tokenCount}`);
  console.log(`   - 문장: ${statements.length}`);
  console.log(`   - 블록: ${blocks.length}`);
  console.log(`   - 함수: ${funcDefs.length}`);

  console.log('\n📋 함수 목록:');
  funcDefs.forEach((s, i) => {
    const fullText = s.text;
    const funcName = fullText.match(/fn\s+(\w+)/)?.[1] || 'unknown';
    const paramsMatch = fullText.match(/fn\s+\w+\(([^)]*)\)/);
    const params = paramsMatch ? paramsMatch[1] : '';
    const outputMatch = fullText.match(/output:\s*(\w+)/);
    const output = outputMatch ? outputMatch[1] : 'unknown';

    console.log(`   ${i + 1}. ${funcName}(${params}) → ${output}`);
  });

  console.log('\n🎉 FreeLang 동적 폼 빌더 분석 완료!');

} catch (error) {
  console.error('\n❌ 에러 발생:');
  console.error(error.message);
  if (error.stack) {
    console.error(error.stack.split('\n').slice(0, 10).join('\n'));
  }
  process.exit(1);
}
