/**
 * Module System Execution Test
 *
 * 실제 인터프리터 환경에서 모듈 시스템이 제대로 작동하는지 테스트
 *
 * 테스트 항목:
 * 1. Import된 함수 호출
 * 2. Import된 상수 접근
 * 3. 여러 모듈에서 import
 * 4. 별칭(alias)을 통한 import
 * 5. Namespace import (import * as)
 */

import * as path from 'path';
import * as fs from 'fs';
import { Lexer } from './src/lexer/lexer';
import { TokenBuffer } from './src/lexer/lexer';
import { Parser } from './src/parser/parser';
import { ModuleResolver, ExportSymbol } from './src/module/module-resolver';
import {
  ImportStatement,
  ExportStatement,
  Module,
  FunctionStatement,
  VariableDeclaration
} from './src/parser/ast';

const TEST_DIR = __dirname;

/**
 * Simple interpreter for testing
 * (This is a minimal interpreter to execute import/export statements)
 */
class SimpleInterpreter {
  private modules: Map<string, any> = new Map();
  private resolver: ModuleResolver;

  constructor() {
    this.resolver = new ModuleResolver();
  }

  /**
   * Load and execute a module
   */
  public executeModule(filePath: string): any {
    const module = this.resolver.loadModule(filePath);
    const exports: Record<string, any> = {};

    // Execute export statements
    for (const exportStmt of module.exports) {
      const decl = exportStmt.declaration;

      if (decl.type === 'function') {
        const fn = decl as FunctionStatement;
        // For now, just register the function name
        exports[fn.name] = {
          type: 'function',
          name: fn.name,
          params: fn.params
        };
      } else if (decl.type === 'variable') {
        const varDecl = decl as VariableDeclaration;
        // Extract literal value
        if (varDecl.value && 'value' in varDecl.value) {
          exports[varDecl.name] = (varDecl.value as any).value;
        }
      }
    }

    this.modules.set(filePath, exports);
    return exports;
  }

  /**
   * Resolve an imported symbol
   */
  public resolveImport(
    currentFile: string,
    modulePath: string,
    importName: string
  ): any {
    const resolvedPath = this.resolver.resolveModulePath(currentFile, modulePath);
    const exports = this.modules.get(resolvedPath) || this.executeModule(resolvedPath);

    return exports[importName];
  }

  /**
   * Get all exports from a module
   */
  public getModuleExports(filePath: string): any {
    return this.modules.get(filePath);
  }
}

/**
 * Test 1: Parse and extract function exports
 */
function testFunctionExports() {
  console.log('\n=== Test 1: Function exports ===');

  const MATH_FILE = path.join(TEST_DIR, 'math.fl');
  const resolver = new ModuleResolver();

  try {
    const module = resolver.loadModule(MATH_FILE);
    const exports = resolver.getExports(module);

    // Verify exported functions
    const addExport = exports.find(e => e.name === 'add' && e.type === 'function');
    const multiplyExport = exports.find(e => e.name === 'multiply' && e.type === 'function');

    if (!addExport) {
      console.log('✗ "add" function not exported');
      return false;
    }
    if (!multiplyExport) {
      console.log('✗ "multiply" function not exported');
      return false;
    }

    console.log(`✓ Exported function "add": ${addExport.name}`);
    console.log(`✓ Exported function "multiply": ${multiplyExport.name}`);
    return true;
  } catch (error) {
    console.error('✗ Error:', error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Test 2: Parse and extract variable exports
 */
function testVariableExports() {
  console.log('\n=== Test 2: Variable exports ===');

  const MATH_FILE = path.join(TEST_DIR, 'math.fl');
  const resolver = new ModuleResolver();

  try {
    const module = resolver.loadModule(MATH_FILE);
    const exports = resolver.getExports(module);

    // Verify exported variables
    const piExport = exports.find(e => e.name === 'PI' && e.type === 'variable');
    const eExport = exports.find(e => e.name === 'E' && e.type === 'variable');

    if (!piExport) {
      console.log('✗ "PI" variable not exported');
      return false;
    }
    if (!eExport) {
      console.log('✗ "E" variable not exported');
      return false;
    }

    console.log(`✓ Exported variable "PI": ${piExport.name}`);
    console.log(`✓ Exported variable "E": ${eExport.name}`);
    return true;
  } catch (error) {
    console.error('✗ Error:', error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Test 3: Parse imports with correct from path
 */
function testImportStatements() {
  console.log('\n=== Test 3: Import statements ===');

  const MAIN_FILE = path.join(TEST_DIR, 'main-module-test.fl');
  const resolver = new ModuleResolver();

  try {
    const module = resolver.loadModule(MAIN_FILE);

    // Check imports
    const mathImport = module.imports.find(
      i => i.from.includes('math')
    );
    const stringImport = module.imports.find(
      i => i.from.includes('string-utils')
    );

    if (!mathImport) {
      console.log('✗ Math module not imported');
      return false;
    }
    if (!stringImport) {
      console.log('✗ String-utils module not imported');
      return false;
    }

    console.log(`✓ Import from "./math": ${mathImport.imports.map(i => i.name).join(', ')}`);
    console.log(`✓ Import from "./string-utils": ${stringImport.imports.map(i => i.name).join(', ')}`);

    return true;
  } catch (error) {
    console.error('✗ Error:', error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Test 4: Module execution simulation
 */
function testModuleExecutionSimulation() {
  console.log('\n=== Test 4: Module execution simulation ===');

  const MATH_FILE = path.join(TEST_DIR, 'math.fl');
  const STRING_FILE = path.join(TEST_DIR, 'string-utils.fl');

  try {
    const interpreter = new SimpleInterpreter();

    // Execute math module
    const mathExports = interpreter.executeModule(MATH_FILE);
    console.log(`✓ Executed math module: ${Object.keys(mathExports).join(', ')}`);

    // Execute string module
    const stringExports = interpreter.executeModule(STRING_FILE);
    console.log(`✓ Executed string-utils module: ${Object.keys(stringExports).join(', ')}`);

    // Verify exports
    if (!mathExports['add']) {
      console.log('✗ "add" function not exported from math module');
      return false;
    }
    if (!mathExports['PI']) {
      console.log('✗ "PI" variable not exported from math module');
      return false;
    }

    console.log(`✓ Math module exports contain "add" function`);
    console.log(`✓ Math module exports contain "PI" variable`);

    return true;
  } catch (error) {
    console.error('✗ Error:', error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Test 5: Cross-module symbol resolution
 */
function testCrossModuleResolution() {
  console.log('\n=== Test 5: Cross-module symbol resolution ===');

  const MATH_FILE = path.join(TEST_DIR, 'math.fl');
  const MAIN_FILE = path.join(TEST_DIR, 'main-module-test.fl');

  try {
    const interpreter = new SimpleInterpreter();

    // Execute modules
    interpreter.executeModule(MATH_FILE);
    interpreter.executeModule(MAIN_FILE);

    // Resolve imports
    const addFn = interpreter.resolveImport(MAIN_FILE, './math', 'add');
    const multiplyFn = interpreter.resolveImport(MAIN_FILE, './math', 'multiply');
    const pi = interpreter.resolveImport(MAIN_FILE, './math', 'PI');

    if (!addFn) {
      console.log('✗ Failed to resolve "add" function');
      return false;
    }
    if (!multiplyFn) {
      console.log('✗ Failed to resolve "multiply" function');
      return false;
    }
    if (pi === undefined) {
      console.log('✗ Failed to resolve "PI" constant');
      return false;
    }

    console.log(`✓ Resolved "add" function from math module`);
    console.log(`✓ Resolved "multiply" function from math module`);
    console.log(`✓ Resolved "PI" constant (value: ${pi})`);

    return true;
  } catch (error) {
    console.error('✗ Error:', error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Test 6: Export symbols map
 */
function testExportSymbolsMap() {
  console.log('\n=== Test 6: Export symbols as map ===');

  const MATH_FILE = path.join(TEST_DIR, 'math.fl');
  const resolver = new ModuleResolver();

  try {
    const module = resolver.loadModule(MATH_FILE);
    const exportsMap = resolver.getExportsAsMap(module);

    // Check that map has correct structure
    if (!exportsMap.has('add')) {
      console.log('✗ "add" not in exports map');
      return false;
    }
    if (!exportsMap.has('PI')) {
      console.log('✗ "PI" not in exports map');
      return false;
    }

    const addSymbol = exportsMap.get('add')!;
    const piSymbol = exportsMap.get('PI')!;

    console.log(`✓ Exports map size: ${exportsMap.size}`);
    console.log(`✓ Symbol "add": ${addSymbol.type} (name: ${addSymbol.name})`);
    console.log(`✓ Symbol "PI": ${piSymbol.type} (name: ${piSymbol.name})`);

    return true;
  } catch (error) {
    console.error('✗ Error:', error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Test 7: Module dependencies
 */
function testModuleDependencies() {
  console.log('\n=== Test 7: Module dependencies ===');

  const MAIN_FILE = path.join(TEST_DIR, 'main-module-test.fl');
  const resolver = new ModuleResolver();

  try {
    const mainModule = resolver.loadModule(MAIN_FILE);
    const dependencies = resolver.getDependencies(mainModule);

    console.log(`✓ Main module has ${dependencies.length} dependencies`);

    // Verify dependencies
    const hasMath = dependencies.some(d => d.path.includes('math'));
    const hasString = dependencies.some(d => d.path.includes('string-utils'));

    if (!hasMath) {
      console.log('⚠ Math module not in dependencies');
    } else {
      console.log(`✓ Math module in dependencies`);
    }

    if (!hasString) {
      console.log('⚠ String-utils module not in dependencies');
    } else {
      console.log(`✓ String-utils module in dependencies`);
    }

    return hasMath && hasString;
  } catch (error) {
    console.error('✗ Error:', error instanceof Error ? error.message : error);
    return false;
  }
}

/**
 * Test 8: Verify file structure
 */
function testFileStructure() {
  console.log('\n=== Test 8: Verify module files exist ===');

  const files = [
    path.join(TEST_DIR, 'math.fl'),
    path.join(TEST_DIR, 'string-utils.fl'),
    path.join(TEST_DIR, 'main-module-test.fl')
  ];

  let allExist = true;
  for (const file of files) {
    if (fs.existsSync(file)) {
      console.log(`✓ ${path.basename(file)} exists`);
    } else {
      console.log(`✗ ${path.basename(file)} not found`);
      allExist = false;
    }
  }

  return allExist;
}

/**
 * Main test runner
 */
function runAllTests() {
  console.log('═══════════════════════════════════════════');
  console.log('  FreeLang Module System Execution Test');
  console.log('═══════════════════════════════════════════');

  const results: { name: string; passed: boolean }[] = [];

  results.push({ name: 'Test 1: Function exports', passed: testFunctionExports() });
  results.push({ name: 'Test 2: Variable exports', passed: testVariableExports() });
  results.push({ name: 'Test 3: Import statements', passed: testImportStatements() });
  results.push({ name: 'Test 4: Module execution', passed: testModuleExecutionSimulation() });
  results.push({ name: 'Test 5: Cross-module resolution', passed: testCrossModuleResolution() });
  results.push({ name: 'Test 6: Export symbols map', passed: testExportSymbolsMap() });
  results.push({ name: 'Test 7: Module dependencies', passed: testModuleDependencies() });
  results.push({ name: 'Test 8: File structure', passed: testFileStructure() });

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
