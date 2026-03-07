/**
 * Module System Integration Test
 *
 * 테스트 항목:
 * 1. Parser: export fn 파싱
 * 2. Parser: import { name } from path 파싱
 * 3. ModuleResolver: 모듈 경로 해석
 * 4. ModuleResolver: 모듈 로드 및 파싱
 * 5. ModuleResolver: export 심볼 추출
 * 6. 순환 의존성 감지
 * 7. 캐싱 작동
 */

import * as path from 'path';
import { Lexer } from './src/lexer/lexer';
import { TokenBuffer } from './src/lexer/lexer';
import { Parser } from './src/parser/parser';
import { ModuleResolver } from './src/module/module-resolver';
import {
  ImportStatement,
  ExportStatement,
  Module
} from './src/parser/ast';

// Test utilities
const TESTS_DIR = __dirname;
const MATH_MODULE = path.join(TESTS_DIR, 'math.fl');
const STRING_UTILS_MODULE = path.join(TESTS_DIR, 'string-utils.fl');
const MAIN_MODULE = path.join(TESTS_DIR, 'main-module-test.fl');

/**
 * Test 1: Parse export function
 */
function testParseExportFunction() {
  console.log('\n=== Test 1: Parse export fn ===');

  const code = `
export fn add(a: number, b: number) -> number {
  return a + b;
}
  `;

  const lexer = new Lexer(code);
  const tokens = new TokenBuffer(lexer);
  const parser = new Parser(tokens);

  try {
    const module = parser.parseModule();

    const exportStmts = module.exports;
    console.log(`✓ Parsed ${exportStmts.length} export statement(s)`);

    if (exportStmts.length > 0) {
      const exportStmt = exportStmts[0] as ExportStatement;
      if ('name' in exportStmt.declaration) {
        console.log(`✓ Function name: ${(exportStmt.declaration as any).name}`);
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error('✗ Parse error:', error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Test 2: Parse import statement
 */
function testParseImportStatement() {
  console.log('\n=== Test 2: Parse import statement ===');

  const code = `
import { add, multiply, PI } from "./math";
import { concat, length } from "./string-utils";
  `;

  const lexer = new Lexer(code);
  const tokens = new TokenBuffer(lexer);
  const parser = new Parser(tokens);

  try {
    const module = parser.parseModule();

    const importStmts = module.imports;
    console.log(`✓ Parsed ${importStmts.length} import statement(s)`);

    for (let i = 0; i < importStmts.length; i++) {
      const importStmt = importStmts[i] as ImportStatement;
      console.log(`  [${i}] from: "${importStmt.from}"`);
      console.log(`      imports: ${importStmt.imports.map(s => s.name).join(', ')}`);
    }

    return importStmts.length === 2;
  } catch (error) {
    console.error('✗ Parse error:', error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Test 3: ModuleResolver - resolve module path
 */
function testResolveModulePath() {
  console.log('\n=== Test 3: Resolve module path ===');

  const resolver = new ModuleResolver();

  try {
    // Relative path (relative to fromFile)
    const result1 = resolver.resolveModulePath(MAIN_MODULE, './math');
    console.log(`✓ Relative path: "./math" → "${result1}"`);

    const expected = path.join(path.dirname(MAIN_MODULE), 'math');
    const matches = result1.includes('math');

    return matches;
  } catch (error) {
    console.error('✗ Resolve error:', error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Test 4: ModuleResolver - load module
 */
function testLoadModule() {
  console.log('\n=== Test 4: Load module ===');

  const resolver = new ModuleResolver();

  try {
    const module = resolver.loadModule(MATH_MODULE);

    console.log(`✓ Loaded module: ${path.basename(module.path)}`);
    console.log(`  Imports: ${module.imports.length}`);
    console.log(`  Exports: ${module.exports.length}`);

    return module.exports.length > 0;
  } catch (error) {
    console.error('✗ Load error:', error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Test 5: ModuleResolver - extract export symbols
 */
function testExtractExports() {
  console.log('\n=== Test 5: Extract export symbols ===');

  const resolver = new ModuleResolver();

  try {
    const module = resolver.loadModule(MATH_MODULE);
    const exports = resolver.getExports(module);

    console.log(`✓ Found ${exports.length} export symbol(s):`);
    for (const sym of exports) {
      console.log(`  - ${sym.name} (${sym.type})`);
    }

    const hasAdd = exports.some(s => s.name === 'add');
    const hasMultiply = exports.some(s => s.name === 'multiply');
    const hasPI = exports.some(s => s.name === 'PI');

    return hasAdd && hasMultiply && hasPI;
  } catch (error) {
    console.error('✗ Extract error:', error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Test 6: ModuleResolver - caching
 */
function testModuleCaching() {
  console.log('\n=== Test 6: Module caching ===');

  const resolver = new ModuleResolver();

  try {
    // Load same module twice
    const module1 = resolver.loadModule(MATH_MODULE);
    const cacheSize1 = resolver.getCacheSize();
    console.log(`✓ Cache size after 1st load: ${cacheSize1}`);

    const module2 = resolver.loadModule(MATH_MODULE);
    const cacheSize2 = resolver.getCacheSize();
    console.log(`✓ Cache size after 2nd load: ${cacheSize2}`);

    // Cache should not grow (same module)
    console.log(`✓ Module instances are same: ${module1.path === module2.path}`);

    return cacheSize1 === cacheSize2;
  } catch (error) {
    console.error('✗ Cache error:', error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Test 7: Circular dependency detection
 */
function testCircularDependencyDetection() {
  console.log('\n=== Test 7: Circular dependency detection ===');

  // Create test files for circular dependency
  const fs = require('fs');
  const testDir = path.join(TESTS_DIR, 'test-circular');

  try {
    // Create temporary test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Create circular dependency: a -> b -> a
    const fileA = path.join(testDir, 'a.fl');
    const fileB = path.join(testDir, 'b.fl');

    fs.writeFileSync(fileA, 'import { funcB } from "./b";\nexport fn funcA() -> number { return 1; }');
    fs.writeFileSync(fileB, 'import { funcA } from "./a";\nexport fn funcB() -> number { return 2; }');

    const resolver = new ModuleResolver();

    try {
      // This should throw circular dependency error
      resolver.loadModule(fileA);
      console.log('✗ Should have detected circular dependency');
      return false;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('circular') || msg.includes('순환')) {
        console.log(`✓ Detected circular dependency: "${msg.substring(0, 50)}..."`);
        return true;
      } else {
        console.log(`✗ Wrong error: ${msg}`);
        return false;
      }
    }
  } catch (error) {
    console.error('✗ Test setup error:', error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Test 8: Load and verify multiple modules
 */
function testLoadMultipleModules() {
  console.log('\n=== Test 8: Load multiple modules ===');

  const resolver = new ModuleResolver();

  try {
    const mathModule = resolver.loadModule(MATH_MODULE);
    const stringModule = resolver.loadModule(STRING_UTILS_MODULE);

    const mathExports = resolver.getExports(mathModule);
    const stringExports = resolver.getExports(stringModule);

    console.log(`✓ math.fl exports: ${mathExports.map(e => e.name).join(', ')}`);
    console.log(`✓ string-utils.fl exports: ${stringExports.map(e => e.name).join(', ')}`);

    const cacheSize = resolver.getCacheSize();
    console.log(`✓ Cache contains ${cacheSize} modules`);

    return cacheSize === 2;
  } catch (error) {
    console.error('✗ Load error:', error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Main test runner
 */
function runAllTests() {
  console.log('═══════════════════════════════════════════');
  console.log('    FreeLang Module System Integration Test');
  console.log('═══════════════════════════════════════════');

  const results: { name: string; passed: boolean }[] = [];

  results.push({ name: 'Test 1: Parse export fn', passed: testParseExportFunction() });
  results.push({ name: 'Test 2: Parse import statement', passed: testParseImportStatement() });
  results.push({ name: 'Test 3: Resolve module path', passed: testResolveModulePath() });
  results.push({ name: 'Test 4: Load module', passed: testLoadModule() });
  results.push({ name: 'Test 5: Extract exports', passed: testExtractExports() });
  results.push({ name: 'Test 6: Module caching', passed: testModuleCaching() });
  results.push({ name: 'Test 7: Circular dependency', passed: testCircularDependencyDetection() });
  results.push({ name: 'Test 8: Load multiple modules', passed: testLoadMultipleModules() });

  // Summary
  console.log('\n═══════════════════════════════════════════');
  console.log('                   SUMMARY');
  console.log('═══════════════════════════════════════════');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  for (const result of results) {
    const status = result.passed ? '✓' : '✗';
    console.log(`${status} ${result.name}`);
  }

  console.log('═══════════════════════════════════════════');
  console.log(`Result: ${passed}/${total} tests passed`);
  console.log('═══════════════════════════════════════════\n');

  return passed === total;
}

// Run tests
const success = runAllTests();
process.exit(success ? 0 : 1);
