/**
 * Module System - Final Comprehensive Test
 *
 * 모듈 시스템의 모든 기능을 통합 테스트합니다:
 * 1. Parser: export/import 구문 파싱
 * 2. ModuleResolver: 모듈 로드 및 캐싱
 * 3. Symbol extraction: 함수/변수 내보내기
 * 4. Path resolution: 상대/절대 경로 해석
 * 5. Module dependencies: 의존성 그래프
 * 6. Real-world usage: 실제 모듈 로드 및 사용
 */

import * as path from 'path';
import * as fs from 'fs';
import { Lexer } from './src/lexer/lexer';
import { TokenBuffer } from './src/lexer/lexer';
import { Parser } from './src/parser/parser';
import { ModuleResolver, ExportSymbol } from './src/module/module-resolver';
import { ImportStatement, ExportStatement, Module } from './src/parser/ast';

const TEST_DIR = __dirname;

// ============================================
// Helper functions
// ============================================

function formatResult(passed: boolean, message: string): string {
  return passed ? `✓ ${message}` : `✗ ${message}`;
}

function testSection(title: string): void {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  ${title}`);
  console.log(`${'='.repeat(50)}`);
}

// ============================================
// Test Suite 1: Parser Tests
// ============================================

function testParserExportFunction(): boolean {
  const code = `export fn greet(name: string) -> string {
  return "Hello, " + name;
}`;

  try {
    const lexer = new Lexer(code);
    const tokens = new TokenBuffer(lexer);
    const parser = new Parser(tokens);
    const mod = parser.parseModule();

    const hasExport = mod.exports.length > 0;
    const fnName = hasExport ? (mod.exports[0].declaration as any).name : '';

    console.log(formatResult(hasExport && fnName === 'greet', 'Parse export function'));
    return hasExport && fnName === 'greet';
  } catch (error) {
    console.log(formatResult(false, 'Parse export function'));
    return false;
  }
}

function testParserExportVariable(): boolean {
  const code = `export let MAX_SIZE: number = 100;
export let VERSION: string = "1.0.0";`;

  try {
    const lexer = new Lexer(code);
    const tokens = new TokenBuffer(lexer);
    const parser = new Parser(tokens);
    const mod = parser.parseModule();

    const hasExports = mod.exports.length === 2;
    const hasMax = mod.exports.some(e => (e.declaration as any).name === 'MAX_SIZE');
    const hasVersion = mod.exports.some(e => (e.declaration as any).name === 'VERSION');

    console.log(formatResult(hasExports && hasMax && hasVersion, 'Parse multiple export variables'));
    return hasExports && hasMax && hasVersion;
  } catch (error) {
    console.log(formatResult(false, 'Parse multiple export variables'));
    return false;
  }
}

function testParserImportNamed(): boolean {
  const code = `import { add, subtract, PI } from "./math";`;

  try {
    const lexer = new Lexer(code);
    const tokens = new TokenBuffer(lexer);
    const parser = new Parser(tokens);
    const mod = parser.parseModule();

    const hasImport = mod.imports.length > 0;
    const imp = mod.imports[0];
    const hasCorrectNames =
      imp.imports.some(i => i.name === 'add') &&
      imp.imports.some(i => i.name === 'subtract') &&
      imp.imports.some(i => i.name === 'PI');
    const fromPath = imp.from === './math';

    console.log(formatResult(hasImport && hasCorrectNames && fromPath, 'Parse named imports'));
    return hasImport && hasCorrectNames && fromPath;
  } catch (error) {
    console.log(formatResult(false, 'Parse named imports'));
    return false;
  }
}

function testParserImportMultiple(): boolean {
  const code = `import { add } from "./math";
import { concat } from "./string";
import { fetch } from "./http";`;

  try {
    const lexer = new Lexer(code);
    const tokens = new TokenBuffer(lexer);
    const parser = new Parser(tokens);
    const mod = parser.parseModule();

    const hasThreeImports = mod.imports.length === 3;
    const paths = mod.imports.map(i => i.from);
    const hasCorrectPaths =
      paths.includes('./math') &&
      paths.includes('./string') &&
      paths.includes('./http');

    console.log(formatResult(hasThreeImports && hasCorrectPaths, 'Parse multiple imports'));
    return hasThreeImports && hasCorrectPaths;
  } catch (error) {
    console.log(formatResult(false, 'Parse multiple imports'));
    return false;
  }
}

// ============================================
// Test Suite 2: ModuleResolver Tests
// ============================================

function testModuleLoading(): boolean {
  const resolver = new ModuleResolver();

  try {
    const mathFile = path.join(TEST_DIR, 'math.fl');
    const mod = resolver.loadModule(mathFile);

    const isLoaded = mod.path !== '';
    const hasExports = mod.exports.length > 0;

    console.log(formatResult(isLoaded && hasExports, 'Load math module'));
    return isLoaded && hasExports;
  } catch (error) {
    console.log(formatResult(false, 'Load math module'));
    return false;
  }
}

function testPathResolution(): boolean {
  const resolver = new ModuleResolver();
  const mainFile = path.join(TEST_DIR, 'main-module-test.fl');

  try {
    // Test relative path without .fl extension
    const resolved1 = resolver.resolveModulePath(mainFile, './math');
    const has1 = resolved1.includes('math');

    // Test relative path with .fl extension
    const resolved2 = resolver.resolveModulePath(mainFile, './math.fl');
    const has2 = resolved2.includes('math');

    // Both should resolve to the same file
    const mathExists = fs.existsSync(resolved1) || fs.existsSync(resolved2);

    console.log(formatResult(has1 && has2 && mathExists, 'Resolve module paths'));
    return has1 && has2 && mathExists;
  } catch (error) {
    console.log(formatResult(false, 'Resolve module paths'));
    return false;
  }
}

function testModuleCaching(): boolean {
  const resolver = new ModuleResolver();
  const mathFile = path.join(TEST_DIR, 'math.fl');

  try {
    const mod1 = resolver.loadModule(mathFile);
    const cache1 = resolver.getCacheSize();

    const mod2 = resolver.loadModule(mathFile);
    const cache2 = resolver.getCacheSize();

    const sameModule = mod1.path === mod2.path;
    const cacheUnchanged = cache1 === cache2;

    console.log(formatResult(sameModule && cacheUnchanged, 'Module caching works'));
    return sameModule && cacheUnchanged;
  } catch (error) {
    console.log(formatResult(false, 'Module caching works'));
    return false;
  }
}

// ============================================
// Test Suite 3: Symbol Extraction Tests
// ============================================

function testExtractFunctionExports(): boolean {
  const resolver = new ModuleResolver();
  const mathFile = path.join(TEST_DIR, 'math.fl');

  try {
    const mod = resolver.loadModule(mathFile);
    const exports = resolver.getExports(mod);

    const hasFunctions = exports.filter(e => e.type === 'function').length > 0;
    const hasAdd = exports.some(e => e.name === 'add');
    const hasMultiply = exports.some(e => e.name === 'multiply');

    console.log(formatResult(hasFunctions && hasAdd && hasMultiply, 'Extract function exports'));
    return hasFunctions && hasAdd && hasMultiply;
  } catch (error) {
    console.log(formatResult(false, 'Extract function exports'));
    return false;
  }
}

function testExtractVariableExports(): boolean {
  const resolver = new ModuleResolver();
  const mathFile = path.join(TEST_DIR, 'math.fl');

  try {
    const mod = resolver.loadModule(mathFile);
    const exports = resolver.getExports(mod);

    const hasVariables = exports.filter(e => e.type === 'variable').length > 0;
    const hasPI = exports.some(e => e.name === 'PI');
    const hasE = exports.some(e => e.name === 'E');

    console.log(formatResult(hasVariables && hasPI && hasE, 'Extract variable exports'));
    return hasVariables && hasPI && hasE;
  } catch (error) {
    console.log(formatResult(false, 'Extract variable exports'));
    return false;
  }
}

function testExportSymbolsMap(): boolean {
  const resolver = new ModuleResolver();
  const mathFile = path.join(TEST_DIR, 'math.fl');

  try {
    const mod = resolver.loadModule(mathFile);
    const exportsMap = resolver.getExportsAsMap(mod);

    const hasMap = exportsMap.size > 0;
    const hasAdd = exportsMap.has('add');
    const hasPI = exportsMap.has('PI');

    console.log(formatResult(hasMap && hasAdd && hasPI, 'Export symbols as map'));
    return hasMap && hasAdd && hasPI;
  } catch (error) {
    console.log(formatResult(false, 'Export symbols as map'));
    return false;
  }
}

// ============================================
// Test Suite 4: Real-World Usage Tests
// ============================================

function testLoadMultipleModules(): boolean {
  const resolver = new ModuleResolver();
  const mathFile = path.join(TEST_DIR, 'math.fl');
  const stringFile = path.join(TEST_DIR, 'string-utils.fl');

  try {
    const mathMod = resolver.loadModule(mathFile);
    const stringMod = resolver.loadModule(stringFile);

    const cacheSize = resolver.getCacheSize();
    const bothLoaded = mathMod.path !== '' && stringMod.path !== '';

    console.log(formatResult(cacheSize === 2 && bothLoaded, 'Load multiple modules'));
    return cacheSize === 2 && bothLoaded;
  } catch (error) {
    console.log(formatResult(false, 'Load multiple modules'));
    return false;
  }
}

function testModuleDependencies(): boolean {
  const resolver = new ModuleResolver();
  const mainFile = path.join(TEST_DIR, 'main-module-test.fl');

  try {
    const mainMod = resolver.loadModule(mainFile);
    const dependencies = resolver.getDependencies(mainMod);

    const hasDependencies = dependencies.length > 0;

    console.log(formatResult(hasDependencies, 'Detect module dependencies'));
    return hasDependencies;
  } catch (error) {
    console.log(formatResult(false, 'Detect module dependencies'));
    return false;
  }
}

function testImportExportIntegration(): boolean {
  const resolver = new ModuleResolver();
  const mainFile = path.join(TEST_DIR, 'main-module-test.fl');

  try {
    const mainMod = resolver.loadModule(mainFile);

    // Check imports
    const hasImports = mainMod.imports.length > 0;
    const mathImport = mainMod.imports.find(i => i.from.includes('math'));
    const stringImport = mainMod.imports.find(i => i.from.includes('string'));

    // Check that imported symbols match exported symbols
    if (mathImport && stringImport) {
      const mathFile = path.join(TEST_DIR, 'math.fl');
      const stringFile = path.join(TEST_DIR, 'string-utils.fl');

      const mathMod = resolver.loadModule(mathFile);
      const stringMod = resolver.loadModule(stringFile);

      const mathExports = resolver.getExportsAsMap(mathMod);
      const stringExports = resolver.getExportsAsMap(stringMod);

      // Verify imported symbols exist in exports
      const mathImportsValid = mathImport.imports.every(i => mathExports.has(i.name));
      const stringImportsValid = stringImport.imports.every(i => stringExports.has(i.name));

      console.log(formatResult(mathImportsValid && stringImportsValid, 'Import/Export integration'));
      return mathImportsValid && stringImportsValid;
    }

    return false;
  } catch (error) {
    console.log(formatResult(false, 'Import/Export integration'));
    return false;
  }
}

// ============================================
// Main Test Runner
// ============================================

function runAllTests() {
  console.log('\n' + '═'.repeat(50));
  console.log('  FreeLang Module System - Final Comprehensive Test');
  console.log('═'.repeat(50));

  const results: { section: string; passed: boolean }[] = [];

  // Parser Tests
  testSection('Parser Tests');
  results.push({ section: 'Parser: Export function', passed: testParserExportFunction() });
  results.push({ section: 'Parser: Export variables', passed: testParserExportVariable() });
  results.push({ section: 'Parser: Named imports', passed: testParserImportNamed() });
  results.push({ section: 'Parser: Multiple imports', passed: testParserImportMultiple() });

  // ModuleResolver Tests
  testSection('ModuleResolver Tests');
  results.push({ section: 'ModuleResolver: Load module', passed: testModuleLoading() });
  results.push({ section: 'ModuleResolver: Path resolution', passed: testPathResolution() });
  results.push({ section: 'ModuleResolver: Caching', passed: testModuleCaching() });

  // Symbol Extraction Tests
  testSection('Symbol Extraction Tests');
  results.push({ section: 'Symbol: Function exports', passed: testExtractFunctionExports() });
  results.push({ section: 'Symbol: Variable exports', passed: testExtractVariableExports() });
  results.push({ section: 'Symbol: Export map', passed: testExportSymbolsMap() });

  // Real-World Usage Tests
  testSection('Real-World Usage Tests');
  results.push({ section: 'Usage: Multiple modules', passed: testLoadMultipleModules() });
  results.push({ section: 'Usage: Dependencies', passed: testModuleDependencies() });
  results.push({ section: 'Usage: Import/Export integration', passed: testImportExportIntegration() });

  // Summary
  testSection('SUMMARY');
  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  for (const result of results) {
    const status = result.passed ? '✓' : '✗';
    console.log(`${status} ${result.section}`);
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Result: ${passed}/${total} tests passed (${Math.round((passed/total)*100)}%)`);
  console.log(`${'='.repeat(50)}\n`);

  return passed === total;
}

// Run tests
const success = runAllTests();
process.exit(success ? 0 : 1);
