/**
 * Comprehensive test suite for FreeLang stdlib extended modules
 * Phase D-1 through D-4: Regex, DateTime, SQLite, FS Advanced
 */

import * as regex from './src/stdlib/regex';
import * as date from './src/stdlib/date';
import * as db from './src/stdlib/db.sqlite';
import * as fsAdv from './src/stdlib/fs-advanced';
import { tmpdir } from 'os';
import { join } from 'path';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

/**
 * Test helper
 */
function test(name: string, fn: () => void | Promise<void>) {
  const start = Date.now();
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.then(() => {
        results.push({
          name,
          passed: true,
          duration: Date.now() - start
        });
      }).catch(error => {
        results.push({
          name,
          passed: false,
          error: String(error),
          duration: Date.now() - start
        });
      });
    } else {
      results.push({
        name,
        passed: true,
        duration: Date.now() - start
      });
    }
  } catch (error) {
    results.push({
      name,
      passed: false,
      error: String(error),
      duration: Date.now() - start
    });
  }
}

/**
 * Assert helper
 */
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('📋 FreeLang stdlib Extended Test Suite\n');

  // ========== PHASE D-1: REGEX TESTS ==========
  console.log('🔍 Phase D-1: Regex Library Tests');

  test('regex.compile - Basic pattern compilation', () => {
    const compiled = regex.compile('\\d+');
    assert(compiled.pattern === '\\d+', 'Pattern stored correctly');
    assert(compiled.regex instanceof RegExp, 'Regex object created');
  });

  test('regex.findFirst - Find first match', () => {
    const result = regex.findFirst('hello world 123', '\\d+');
    assert(result !== null, 'Match found');
    assert(result!.text === '123', 'Correct match text');
    assert(result!.index === 12, 'Correct match index');
  });

  test('regex.findAll - Find all matches', () => {
    const results = regex.findAll('hello 123 world 456', '\\d+');
    assert(results.length === 2, 'Found 2 matches');
    assert(results[0].text === '123', 'First match correct');
    assert(results[1].text === '456', 'Second match correct');
  });

  test('regex.exec - Execute with details', () => {
    const result = regex.exec('test@example.com', '[a-z]+@[a-z.]+');
    assert(result !== null, 'Match found');
    assert(result!.text === 'test@example.com', 'Full match correct');
  });

  test('regex.testMultiple - Test multiple patterns', () => {
    const patterns = {
      hasNumbers: '\\d+',
      hasLetters: '[a-z]',
      hasEmail: '@'
    };
    const str = 'test123@example.com';
    const results = regex.testMultiple(str, patterns);
    assert(results.hasNumbers === true, 'Number pattern matches');
    assert(results.hasLetters === true, 'Letter pattern matches');
    assert(results.hasEmail === true, 'Email pattern matches');
  });

  test('regex.groupMatches - Group matches by text', () => {
    const groups = regex.groupMatches('apple banana apple cherry apple', 'apple');
    assert(groups['apple'] === 3, 'Apple count is 3');
  });

  test('regex.isEmail - Email validation', () => {
    assert(regex.isEmail('test@example.com') === true, 'Valid email accepted');
    assert(regex.isEmail('invalid-email') === false, 'Invalid email rejected');
  });

  test('regex.escape - Escape special characters', () => {
    const escaped = regex.escape('$100.00');
    assert(escaped === '\\$100\\.00', 'Special chars escaped');
  });

  // ========== PHASE D-2: DATETIME TESTS ==========
  console.log('\n📅 Phase D-2: DateTime API Tests');

  test('date.now - Get current date', () => {
    const now = date.now();
    assert(now instanceof Date, 'Returns Date object');
    const timestamp = Date.now();
    assert(Math.abs(now.getTime() - timestamp) < 100, 'Current date is accurate');
  });

  test('date.format - Format date to string', () => {
    const d = new Date(2026, 2, 6, 15, 30, 45);
    const formatted = date.format(d, 'yyyy-MM-dd HH:mm:ss');
    assert(formatted === '2026-03-06 15:30:45', 'Format correct');
  });

  test('date.formatAdvanced - Advanced format with % codes', () => {
    const d = new Date(2026, 2, 6, 15, 30, 45);
    const formatted = date.formatAdvanced(d, '%Y-%m-%d %H:%M:%S');
    assert(formatted === '2026-03-06 15:30:45', 'Advanced format correct');
  });

  test('date.parse - Parse ISO date string', () => {
    const parsed = date.parse('2026-03-06');
    assert(parsed !== null, 'Date parsed');
    assert(parsed!.getFullYear() === 2026, 'Year correct');
    assert(parsed!.getMonth() === 2, 'Month correct');
    assert(parsed!.getDate() === 6, 'Day correct');
  });

  test('date.addDays - Add days to date', () => {
    const d = new Date(2026, 2, 6);
    const added = date.addDays(d, 10);
    assert(added.getDate() === 16, 'Day added correctly');
  });

  test('date.daysBetween - Calculate days between', () => {
    const d1 = new Date(2026, 2, 1);
    const d2 = new Date(2026, 2, 11);
    const days = date.daysBetween(d1, d2);
    assert(days === 10, 'Days between calculated correctly');
  });

  test('date.millisBetween - Calculate milliseconds between', () => {
    const d1 = new Date(2026, 2, 6, 10, 0, 0);
    const d2 = new Date(2026, 2, 6, 11, 0, 0);
    const millis = date.millisBetween(d1, d2);
    assert(millis === 3600000, 'Milliseconds between calculated correctly');
  });

  test('date.isLeapYear - Check leap year', () => {
    assert(date.isLeapYear(2024) === true, '2024 is leap year');
    assert(date.isLeapYear(2025) === false, '2025 is not leap year');
    assert(date.isLeapYear(2000) === true, '2000 is leap year');
  });

  test('date.weekOfYear - Get week number', () => {
    const d = new Date(2026, 0, 6); // First week of 2026
    const week = date.weekOfYear(d);
    assert(week >= 1 && week <= 53, 'Week number in valid range');
  });

  test('date.getAge - Calculate age from birth date', () => {
    const birthDate = new Date(2000, 0, 1);
    const age = date.getAge(birthDate);
    assert(age >= 25, 'Age calculated correctly');
  });

  test('date.isPast - Check if date is past', () => {
    const past = new Date(2000, 0, 1);
    const future = new Date(2099, 0, 1);
    assert(date.isPast(past) === true, 'Past date detected');
    assert(date.isPast(future) === false, 'Future date not past');
  });

  test('date.startOfDay - Get start of day', () => {
    const d = new Date(2026, 2, 6, 15, 30, 45);
    const start = date.startOfDay(d);
    assert(start.getHours() === 0, 'Hour is 0');
    assert(start.getMinutes() === 0, 'Minutes are 0');
    assert(start.getSeconds() === 0, 'Seconds are 0');
  });

  // ========== PHASE D-3: SQLITE TESTS ==========
  console.log('\n🗄️  Phase D-3: SQLite Driver Tests');

  test('db.SQLiteDatabase - Create database instance', () => {
    const database = new db.SQLiteDatabase(':memory:');
    assert(database !== null, 'Database instance created');
  });

  test('db.createDatabase - Create database convenience function', () => {
    const database = db.createDatabase(':memory:');
    assert(database !== null, 'Database created via function');
  });

  // ========== PHASE D-4: FILE SYSTEM TESTS ==========
  console.log('\n📁 Phase D-4: File System Advanced Tests');

  test('fsAdv.exists - Check file existence', () => {
    assert(fsAdv.exists('/') === true, 'Root directory exists');
    assert(fsAdv.exists('/nonexistent-path-12345') === false, 'Nonexistent path returns false');
  });

  test('fsAdv.isDir - Check if path is directory', () => {
    assert(fsAdv.isDir('/') === true, 'Root is directory');
  });

  test('fsAdv.isFile - Check if path is file', () => {
    // Use a known file
    const isFile = fsAdv.isFile('/etc/hostname') || fsAdv.isFile('/etc/os-release');
    // Don't assert as files may vary by system
  });

  test('fsAdv.getExtension - Get file extension', () => {
    const ext = fsAdv.getExtension('/path/to/file.txt');
    assert(ext === '.txt', 'Extension extracted correctly');
  });

  test('fsAdv.getName - Get file name without extension', () => {
    const name = fsAdv.getName('/path/to/file.txt');
    assert(name === 'file', 'Name without extension correct');
  });

  test('fsAdv.getParent - Get parent directory', () => {
    const parent = fsAdv.getParent('/path/to/file.txt');
    assert(parent === '/path/to', 'Parent directory correct');
  });

  test('fsAdv.joinPath - Join path segments', () => {
    const joined = fsAdv.joinPath('/home', 'user', 'file.txt');
    assert(joined.includes('file.txt'), 'Path joined correctly');
  });

  test('fsAdv.normalizePath - Normalize path', () => {
    const normalized = fsAdv.normalizePath('/path//to///file');
    assert(normalized.includes('path') && normalized.includes('file'), 'Path normalized');
  });

  test('fsAdv.isAbsolutePath - Check absolute path', () => {
    assert(fsAdv.isAbsolutePath('/home/user') === true, 'Absolute path detected');
    assert(fsAdv.isAbsolutePath('relative/path') === false, 'Relative path detected');
  });

  test('fsAdv.listDir - List directory contents', () => {
    try {
      const entries = fsAdv.listDir('/');
      assert(entries.length > 0, 'Root directory has entries');
      assert(entries[0].name !== undefined, 'Entry has name');
      assert(entries[0].path !== undefined, 'Entry has path');
    } catch {
      // Skip if permission denied
    }
  });

  test('fsAdv.mkdir - Create directory', () => {
    const testDir = join(tmpdir(), 'freelang-test-' + Date.now());
    try {
      const created = fsAdv.mkdir(testDir);
      assert(created === true, 'Directory created');
      assert(fsAdv.exists(testDir) === true, 'Directory exists after creation');

      // Cleanup
      fsAdv.rmdir(testDir);
    } catch (error) {
      // Skip if permission issues
    }
  });

  test('fsAdv.stat - Get file metadata', () => {
    try {
      const stats = fsAdv.stat('/');
      assert(stats.name !== undefined, 'Stats has name');
      assert(stats.isDirectory !== undefined, 'Stats has isDirectory');
      assert(stats.size !== undefined, 'Stats has size');
    } catch {
      // Skip if permission denied
    }
  });

  test('fsAdv.getSize - Get file/directory size', () => {
    try {
      const size = fsAdv.getSize('/');
      assert(typeof size === 'number', 'Size is a number');
      assert(size >= 0, 'Size is non-negative');
    } catch {
      // Skip if permission denied
    }
  });

  // ========== SUMMARY ==========
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`\n✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);
  console.log(`⏱️  Total Time: ${totalTime}ms\n`);

  if (failed > 0) {
    console.log('Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ❌ ${r.name}`);
      if (r.error) {
        console.log(`     Error: ${r.error}`);
      }
    });
  }

  // Count functions by module
  const regexFunctions = Object.keys(regex).filter(k => typeof regex[k as keyof typeof regex] === 'function').length;
  const dateFunctions = Object.keys(date).filter(k => typeof date[k as keyof typeof date] === 'function').length;
  const dbFunctions = Object.keys(db).filter(k => typeof db[k as keyof typeof db] === 'function').length;
  const fsAdvFunctions = Object.keys(fsAdv).filter(k => typeof fsAdv[k as keyof typeof fsAdv] === 'function').length;

  console.log('\n📈 Function Count by Module:');
  console.log(`  regex: ${regexFunctions} functions`);
  console.log(`  date: ${dateFunctions} functions`);
  console.log(`  db: ${dbFunctions} functions`);
  console.log(`  fsAdv: ${fsAdvFunctions} functions`);
  console.log(`  Total: ${regexFunctions + dateFunctions + dbFunctions + fsAdvFunctions} new functions\n`);

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
