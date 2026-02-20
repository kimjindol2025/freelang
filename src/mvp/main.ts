/**
 * MVP Main - 진입점
 * Lexer → Parser → Interpreter 파이프라인
 */

import * as fs from 'fs';
import * as path from 'path';
import { lex } from './lexer';
import { parse } from './parser';
import { interpret } from './interpreter';

/**
 * 파일 실행
 */
export function runFile(filePath: string): void {
  try {
    const source = fs.readFileSync(filePath, 'utf-8');
    runCode(source);
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      console.error(`Error: File not found: ${filePath}`);
    } else {
      console.error(`Error: ${(error as Error).message}`);
    }
    process.exit(1);
  }
}

/**
 * 코드 실행
 */
export function runCode(source: string): void {
  try {
    // 1. 렉싱
    const tokens = lex(source);

    // 2. 파싱
    const program = parse(tokens);

    // 3. 인터프리팅
    interpret(program);
  } catch (error) {
    console.error(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

/**
 * REPL (Read-Eval-Print Loop)
 */
export function startRepl(): void {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('FreeLang MVP REPL');
  console.log('Type "exit" to quit, "help" for help\n');

  const prompt = () => {
    rl.question('> ', (input: string) => {
      if (input.trim() === 'exit') {
        rl.close();
        return;
      }
      if (input.trim() === 'help') {
        console.log(`
FreeLang MVP Commands:
  exit                 - Exit REPL
  help                 - Show this help

Supported Features:
  - Variable declaration: let x = 5;
  - Arithmetic: +, -, *, /, %
  - Comparison: ==, !=, <, <=, >, >=
  - Control flow: if/else, while
  - Function calls: print(x)
  - Built-ins: print, len, type, parseInt, parseFloat, toString
        `);
        prompt();
        return;
      }

      try {
        runCode(input);
      } catch (error) {
        console.error(`Error: ${(error as Error).message}`);
      }
      prompt();
    });
  };

  prompt();
}

// CLI 실행
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    // REPL 모드
    startRepl();
  } else if (args[0] === '--repl' || args[0] === '-r') {
    // 명시적 REPL 모드
    startRepl();
  } else {
    // 파일 실행
    runFile(args[0]);
  }
}
