/**
 * Proof-Tester v1.0 - FreeLang Built-in Test Engine
 *
 * "Jest를 사용하는 것은 검사관을 외부에서 고용하는 것이지만,
 *  Proof-Tester를 내장하는 것은 언어 자체가 스스로의 무결성을 증명하게 만드는 것이다."
 *
 * Features:
 * - @test 어노테이션 감지 (함수 레벨)
 * - @test.skip / @test.only 지원
 * - 내장 assert 함수 (assert, assert_eq, assert_ne, assert_true, assert_false)
 * - 파일/디렉토리 단위 테스트 실행
 * - 조건부 컴파일: test 모드에서만 @test 함수 실행
 * - 결과 리포팅 (passed/failed/skipped + 실행 시간)
 */

import * as fs from 'fs';
import * as path from 'path';
import { ProgramRunner } from './runner';

// ============================================
// 1. Types
// ============================================

export interface TestCase {
  name: string;
  file: string;
  line: number;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  modifier?: 'skip' | 'only';
}

export interface TestSuite {
  file: string;
  tests: TestCase[];
  duration: number;
}

export interface TestReport {
  suites: TestSuite[];
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  timestamp: string;
}

// ============================================
// 2. @test 어노테이션 파서
// ============================================

interface ParsedTestFunction {
  name: string;
  line: number;
  body: string;
  modifier?: 'skip' | 'only';
}

/**
 * FreeLang 소스에서 @test 어노테이션된 함수를 추출
 *
 * 지원 패턴:
 *   @test
 *   fn test_something() { ... }
 *
 *   @test.skip
 *   fn test_wip() { ... }
 *
 *   @test.only
 *   fn test_focus() { ... }
 */
function extractTestFunctions(source: string): ParsedTestFunction[] {
  const tests: ParsedTestFunction[] = [];
  const lines = source.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    // @test, @test.skip, @test.only 감지
    let modifier: 'skip' | 'only' | undefined;
    if (trimmed === '@test') {
      modifier = undefined;
    } else if (trimmed === '@test.skip') {
      modifier = 'skip';
    } else if (trimmed === '@test.only') {
      modifier = 'only';
    } else {
      continue;
    }

    // 다음 줄에서 fn 정의 찾기
    let fnLine = i + 1;
    while (fnLine < lines.length && lines[fnLine].trim() === '') {
      fnLine++;
    }

    if (fnLine >= lines.length) continue;

    const fnMatch = lines[fnLine].match(/^\s*fn\s+(\w+)\s*\(/);
    if (!fnMatch) continue;

    const fnName = fnMatch[1];

    // 함수 본문 추출 (중괄호 매칭)
    let braceCount = 0;
    let bodyStart = -1;
    let bodyEnd = -1;

    for (let j = fnLine; j < lines.length; j++) {
      for (const ch of lines[j]) {
        if (ch === '{') {
          if (braceCount === 0) bodyStart = j;
          braceCount++;
        } else if (ch === '}') {
          braceCount--;
          if (braceCount === 0) {
            bodyEnd = j;
            break;
          }
        }
      }
      if (bodyEnd >= 0) break;
    }

    if (bodyStart >= 0 && bodyEnd >= 0) {
      // @test 라인부터 함수 끝까지 추출 (어노테이션은 제외, fn 정의부터)
      const fnBody = lines.slice(fnLine, bodyEnd + 1).join('\n');
      tests.push({
        name: fnName,
        line: fnLine + 1, // 1-based
        body: fnBody,
        modifier
      });

      i = bodyEnd; // 다음 반복을 위해 건너뜀
    }
  }

  return tests;
}

/**
 * @test 함수가 아닌 코드 (헬퍼 함수, import, 상수 등) 추출
 * 테스트 실행 시 컨텍스트로 사용
 */
function extractNonTestCode(source: string): string {
  const lines = source.split('\n');
  const result: string[] = [];
  let skipUntil = -1;

  for (let i = 0; i < lines.length; i++) {
    if (i <= skipUntil) continue;

    const trimmed = lines[i].trim();

    // @test 블록 시작이면 건너뛰기
    if (trimmed === '@test' || trimmed === '@test.skip' || trimmed === '@test.only') {
      // 다음 fn의 끝을 찾아서 건너뛰기
      let fnLine = i + 1;
      while (fnLine < lines.length && lines[fnLine].trim() === '') fnLine++;

      if (fnLine < lines.length && lines[fnLine].trim().startsWith('fn ')) {
        let braceCount = 0;
        for (let j = fnLine; j < lines.length; j++) {
          for (const ch of lines[j]) {
            if (ch === '{') braceCount++;
            else if (ch === '}') braceCount--;
          }
          if (braceCount === 0 && j > fnLine) {
            skipUntil = j;
            break;
          }
        }
      }
      continue;
    }

    result.push(lines[i]);
  }

  return result.join('\n');
}

// ============================================
// 3. 내장 Assert 주입 (FreeLang 코드)
// ============================================

// NOTE: FreeLang v2 VM bug: `!variable` causes undef_var.
// Workaround: use `variable == false` instead of `!variable`
const PROOF_TESTER_STDLIB = `
fn assert(cond, message) {
  if (cond == false) {
    print("__PROOF_FAIL:" + message)
  }
}

fn assert_eq(actual, expected, message) {
  if (actual == expected) {
    let x = 0
  } else {
    print("__PROOF_FAIL:Expected " + string(expected) + ", got " + string(actual) + " - " + message)
  }
}

fn assert_ne(actual, expected, message) {
  if (actual == expected) {
    print("__PROOF_FAIL:Expected not equal to " + string(expected) + " - " + message)
  }
}

fn assert_true(val, message) {
  if (val == false) {
    print("__PROOF_FAIL:" + message)
  }
}

fn assert_false(val, message) {
  if (val == true) {
    print("__PROOF_FAIL:" + message)
  }
}

fn assert_gt(a, b, message) {
  if (a > b) {
    let x = 0
  } else {
    print("__PROOF_FAIL:Expected " + string(a) + " > " + string(b) + " - " + message)
  }
}

fn assert_lt(a, b, message) {
  if (a < b) {
    let x = 0
  } else {
    print("__PROOF_FAIL:Expected " + string(a) + " < " + string(b) + " - " + message)
  }
}
`;

// ============================================
// 4. 테스트 실행 엔진
// ============================================

export class ProofTester {
  private report: TestReport;
  private verbose: boolean;

  constructor(options?: { verbose?: boolean }) {
    this.verbose = options?.verbose ?? false;
    this.report = {
      suites: [],
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * .fl 파일에서 @test 함수를 찾아 실행
   */
  runFile(filePath: string): TestSuite {
    const absPath = path.resolve(filePath);

    if (!fs.existsSync(absPath)) {
      throw new Error(`File not found: ${absPath}`);
    }

    const source = fs.readFileSync(absPath, 'utf-8');
    const testFns = extractTestFunctions(source);

    if (testFns.length === 0) {
      return { file: absPath, tests: [], duration: 0 };
    }

    // @test.only가 있으면 only만 실행
    const hasOnly = testFns.some(t => t.modifier === 'only');

    const nonTestCode = extractNonTestCode(source);
    const suiteStart = Date.now();
    const suite: TestSuite = { file: absPath, tests: [], duration: 0 };

    console.log(`\n  ${path.relative(process.cwd(), absPath)}`);

    for (const testFn of testFns) {
      // skip 처리
      if (testFn.modifier === 'skip') {
        const tc: TestCase = {
          name: testFn.name,
          file: absPath,
          line: testFn.line,
          status: 'skipped',
          duration: 0,
          modifier: 'skip'
        };
        suite.tests.push(tc);
        console.log(`    - ${testFn.name} (skipped)`);
        continue;
      }

      // only 모드에서 only가 아닌 것은 skip
      if (hasOnly && testFn.modifier !== 'only') {
        const tc: TestCase = {
          name: testFn.name,
          file: absPath,
          line: testFn.line,
          status: 'skipped',
          duration: 0
        };
        suite.tests.push(tc);
        console.log(`    - ${testFn.name} (skipped)`);
        continue;
      }

      // 테스트 실행
      const tc = this.executeTest(testFn, nonTestCode, absPath);
      suite.tests.push(tc);

      if (tc.status === 'passed') {
        console.log(`    + ${tc.name} (${tc.duration}ms)`);
      } else {
        console.log(`    x ${tc.name} (${tc.duration}ms)`);
        if (tc.error) {
          console.log(`      Error: ${tc.error}`);
        }
      }
    }

    suite.duration = Date.now() - suiteStart;
    this.report.suites.push(suite);

    return suite;
  }

  /**
   * 개별 @test 함수 실행
   */
  private executeTest(testFn: ParsedTestFunction, context: string, file: string): TestCase {
    const start = Date.now();

    // 실행할 전체 소스 조합: stdlib + context + test함수 + 호출
    const fullSource = [
      PROOF_TESTER_STDLIB,
      context,
      testFn.body,
      `\n${testFn.name}()`,  // 테스트 함수 호출
    ].join('\n');

    try {
      // stdout 캡처: print()가 process.stdout.write를 사용
      const capturedOutput: string[] = [];
      const originalWrite = process.stdout.write;
      process.stdout.write = function(chunk: any, ...rest: any[]): boolean {
        capturedOutput.push(String(chunk));
        return true;
      } as any;

      const runner = new ProgramRunner();
      const result = runner.runString(fullSource);

      // stdout 복원
      process.stdout.write = originalWrite;

      const duration = Date.now() - start;
      const allOutput = capturedOutput.join('') + '\n' + String(result.output || '');

      if (!result.success) {
        return {
          name: testFn.name,
          file,
          line: testFn.line,
          status: 'failed',
          duration,
          error: result.error,
          modifier: testFn.modifier
        };
      }

      // 캡처된 출력에서 __PROOF_FAIL 마커 감지
      const failures = allOutput.split('__PROOF_FAIL:').slice(1);

      if (failures.length > 0) {
        const messages = failures.map(f => f.split('\n')[0].trim()).filter(Boolean);
        return {
          name: testFn.name,
          file,
          line: testFn.line,
          status: 'failed',
          duration,
          error: `${failures.length} assertion(s) failed: ${messages[0]}`,
          modifier: testFn.modifier
        };
      }

      return {
        name: testFn.name,
        file,
        line: testFn.line,
        status: 'passed',
        duration,
        modifier: testFn.modifier
      };
    } catch (error) {
      return {
        name: testFn.name,
        file,
        line: testFn.line,
        status: 'failed',
        duration: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
        modifier: testFn.modifier
      };
    }
  }

  /**
   * 디렉토리에서 모든 .fl 테스트 파일 탐색 및 실행
   */
  runDirectory(dirPath: string, pattern?: string): TestReport {
    const absDir = path.resolve(dirPath);
    const testFiles = this.findTestFiles(absDir, pattern);

    if (testFiles.length === 0) {
      console.log('\nNo test files found.');
      return this.report;
    }

    const totalStart = Date.now();
    console.log(`\nProof-Tester v1.0`);
    console.log(`Found ${testFiles.length} test file(s)\n`);

    for (const file of testFiles) {
      const suite = this.runFile(file);

      for (const tc of suite.tests) {
        this.report.total++;
        if (tc.status === 'passed') this.report.passed++;
        else if (tc.status === 'failed') this.report.failed++;
        else if (tc.status === 'skipped') this.report.skipped++;
      }
    }

    this.report.duration = Date.now() - totalStart;
    this.printReport();

    return this.report;
  }

  /**
   * 단일 파일 실행 후 리포트
   */
  runSingle(filePath: string): TestReport {
    const totalStart = Date.now();
    console.log(`\nProof-Tester v1.0`);

    const suite = this.runFile(filePath);

    for (const tc of suite.tests) {
      this.report.total++;
      if (tc.status === 'passed') this.report.passed++;
      else if (tc.status === 'failed') this.report.failed++;
      else if (tc.status === 'skipped') this.report.skipped++;
    }

    this.report.duration = Date.now() - totalStart;
    this.printReport();

    return this.report;
  }

  /**
   * 테스트 파일 탐색
   * 규칙: 파일명에 test가 포함되거나, @test 어노테이션이 있는 .fl 파일
   */
  private findTestFiles(dir: string, pattern?: string): string[] {
    const files: string[] = [];

    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // node_modules, .git 등 제외
        if (['node_modules', '.git', 'dist', 'build'].includes(entry.name)) continue;
        files.push(...this.findTestFiles(fullPath, pattern));
      } else if (entry.isFile() && entry.name.endsWith('.fl')) {
        // 패턴 필터
        if (pattern && !entry.name.includes(pattern)) continue;

        // 파일에 @test 어노테이션이 있는지 확인
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          if (content.includes('@test')) {
            files.push(fullPath);
          }
        } catch {
          // 읽기 실패 시 무시
        }
      }
    }

    return files;
  }

  /**
   * 최종 리포트 출력
   */
  private printReport(): void {
    console.log('\n' + '='.repeat(60));
    console.log('  Proof-Tester Report');
    console.log('='.repeat(60));
    console.log(`  Total:   ${this.report.total}`);
    console.log(`  Passed:  ${this.report.passed}`);
    console.log(`  Failed:  ${this.report.failed}`);
    console.log(`  Skipped: ${this.report.skipped}`);
    console.log(`  Time:    ${this.report.duration}ms`);
    console.log('='.repeat(60));

    if (this.report.failed > 0) {
      console.log('\nFailed tests:');
      for (const suite of this.report.suites) {
        for (const tc of suite.tests) {
          if (tc.status === 'failed') {
            console.log(`  x ${tc.file}:${tc.line} - ${tc.name}`);
            if (tc.error) console.log(`    ${tc.error}`);
          }
        }
      }
    }

    if (this.report.failed === 0 && this.report.total > 0) {
      console.log('\nAll tests passed. Proof confirmed.');
    }

    console.log('');
  }

  /**
   * JSON 형태로 리포트 반환
   */
  getReport(): TestReport {
    return this.report;
  }
}
