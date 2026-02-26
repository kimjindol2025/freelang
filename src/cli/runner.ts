/**
 * FreeLang v2 Runner
 *
 * .free 파일을 읽어서 Lexer → Parser → Interpreter로 실행
 * 간단한 인간 중심 언어
 */

import fs from 'fs';
import path from 'path';
import { Parser } from './parser';
import { SimpleInterpreter } from './simple-interpreter-v2';

/**
 * FreeLang 파일 실행
 */
export function runFile(filePath: string): void {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ 파일을 찾을 수 없습니다: ${filePath}`);
    process.exit(1);
  }

  try {
    const code = fs.readFileSync(absolutePath, 'utf-8');

    console.log(`\n▶️  FreeLang v2 Interpreter\n`);
    console.log(`📄 파일: ${filePath}`);
    console.log(`════════════════════════════════════════\n`);

    const parser = new Parser();
    const ast = parser.parse(code);

    const interpreter = new SimpleInterpreter();
    interpreter.execute(ast);

    console.log(`\n════════════════════════════════════════`);
    console.log(`✅ 실행 완료\n`);
  } catch (error: any) {
    console.error(`\n❌ 실행 오류: ${error.message}\n`);
    process.exit(1);
  }
}

/**
 * 코드 문자열로 실행
 */
export function runString(code: string): void {
  try {
    const parser = new Parser();
    const ast = parser.parse(code);

    const interpreter = new SimpleInterpreter();
    interpreter.execute(ast);
  } catch (error: any) {
    console.error(`❌ 실행 오류: ${error.message}`);
    process.exit(1);
  }
}

/**
 * 명령줄 실행
 */
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
╔════════════════════════════════════════╗
║   FreeLang v2 - 간단한 인간 중심 언어  ║
╚════════════════════════════════════════╝

사용법: freelang <file.free>

예시:
  freelang hello.free
  freelang factorial.free
  freelang fibonacci.free
    `);
    process.exit(0);
  }

  runFile(args[0]);
}
