/**
 * Module System Debug
 *
 * 문제를 파악하기 위한 상세한 디버깅 테스트
 */

import * as path from 'path';
import { Lexer } from './src/lexer/lexer';
import { TokenBuffer } from './src/lexer/lexer';
import { Parser } from './src/parser/parser';
import { ModuleResolver } from './src/module/module-resolver';

const TEST_DIR = __dirname;

/**
 * Debug 1: Parse E variable export
 */
function debugEVariableExport() {
  console.log('\n=== Debug 1: Parse E variable export ===');

  const code = `export let E: number = 2.71828;`;

  const lexer = new Lexer(code);
  const tokens = new TokenBuffer(lexer);
  const parser = new Parser(tokens);

  try {
    const module = parser.parseModule();

    console.log(`Exports: ${module.exports.length}`);
    for (const exp of module.exports) {
      console.log(`  Type: ${exp.type}`);
      if ('name' in exp.declaration) {
        console.log(`  Declaration name: ${(exp.declaration as any).name}`);
      }
      if (exp.declaration.type === 'variable') {
        const varDecl = exp.declaration as any;
        console.log(`  Variable name: ${varDecl.name}`);
        console.log(`  Variable type: ${varDecl.varType}`);
        console.log(`  Variable value: ${JSON.stringify(varDecl.value)}`);
      }
    }
  } catch (error) {
    console.error('✗ Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Debug 2: Verify math.fl parsing
 */
function debugMathFileParsing() {
  console.log('\n=== Debug 2: Parse math.fl ===');

  const MATH_FILE = path.join(TEST_DIR, 'math.fl');
  const resolver = new ModuleResolver();

  try {
    const module = resolver.loadModule(MATH_FILE);

    console.log(`Module: ${path.basename(module.path)}`);
    console.log(`Imports: ${module.imports.length}`);
    console.log(`Exports: ${module.exports.length}`);

    console.log('\nExported symbols:');
    for (const exp of module.exports) {
      const decl = exp.declaration;
      if ('name' in decl) {
        const name = (decl as any).name;
        const type = decl.type;
        console.log(`  - ${name} (${type})`);
      }
    }
  } catch (error) {
    console.error('✗ Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Debug 3: Parse import from string-utils
 */
function debugImportParsing() {
  console.log('\n=== Debug 3: Parse imports ===');

  const code = `
import { add, multiply, PI } from "./math";
import { concat, length } from "./string-utils";
`;

  const lexer = new Lexer(code);
  const tokens = new TokenBuffer(lexer);
  const parser = new Parser(tokens);

  try {
    const module = parser.parseModule();

    console.log(`Imports: ${module.imports.length}`);
    for (let i = 0; i < module.imports.length; i++) {
      const imp = module.imports[i];
      console.log(`  [${i}] from: "${imp.from}"`);
      console.log(`      imports:`);
      for (const spec of imp.imports) {
        console.log(`        - ${spec.name}${spec.alias ? ` as ${spec.alias}` : ''}`);
      }
    }
  } catch (error) {
    console.error('✗ Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Debug 4: Module path resolution with .fl extension
 */
function debugModulePathResolution() {
  console.log('\n=== Debug 4: Module path resolution ===');

  const MAIN_FILE = path.join(TEST_DIR, 'main-module-test.fl');
  const resolver = new ModuleResolver();

  try {
    // Test different path resolutions
    const paths = [
      { input: './math', desc: 'Relative path ./math' },
      { input: './math.fl', desc: 'Relative path ./math.fl' },
      { input: './string-utils', desc: 'Relative path ./string-utils' },
    ];

    for (const { input, desc } of paths) {
      try {
        const resolved = resolver.resolveModulePath(MAIN_FILE, input);
        console.log(`✓ ${desc} → ${resolved}`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.log(`✗ ${desc} → Error: ${msg.substring(0, 50)}...`);
      }
    }
  } catch (error) {
    console.error('✗ Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Debug 5: Check main-module-test.fl imports
 */
function debugMainFileImports() {
  console.log('\n=== Debug 5: main-module-test.fl imports ===');

  const MAIN_FILE = path.join(TEST_DIR, 'main-module-test.fl');
  const resolver = new ModuleResolver();

  try {
    const module = resolver.loadModule(MAIN_FILE);

    console.log(`Module: ${path.basename(module.path)}`);
    console.log(`Imports found: ${module.imports.length}`);

    for (let i = 0; i < module.imports.length; i++) {
      const imp = module.imports[i];
      console.log(`\n  [${i}] from: "${imp.from}"`);
      console.log(`      imports: ${imp.imports.map(s => s.name).join(', ')}`);

      // Try to resolve the path
      try {
        const resolved = resolver.resolveModulePath(module.path, imp.from);
        console.log(`      resolved to: ${resolved}`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.log(`      resolution error: ${msg.substring(0, 50)}...`);
      }
    }
  } catch (error) {
    console.error('✗ Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Debug 6: Token stream for string-utils import
 */
function debugTokenStream() {
  console.log('\n=== Debug 6: Token stream for string-utils import ===');

  const code = `import { concat, length } from "./string-utils";`;
  const lexer = new Lexer(code);
  const tokens = new TokenBuffer(lexer);

  try {
    console.log('Tokens:');
    let count = 0;
    while (tokens.current().type !== 'EOF' && count < 20) {
      const token = tokens.current();
      console.log(`  [${count}] ${token.type}: "${token.value}"`);
      tokens.advance();
      count++;
    }
  } catch (error) {
    console.error('✗ Error:', error instanceof Error ? error.message : error);
  }
}

/**
 * Run all debug tests
 */
function runDebugTests() {
  console.log('═══════════════════════════════════════════');
  console.log('    FreeLang Module System Debug Tests');
  console.log('═══════════════════════════════════════════');

  debugEVariableExport();
  debugMathFileParsing();
  debugImportParsing();
  debugModulePathResolution();
  debugMainFileImports();
  debugTokenStream();

  console.log('\n═══════════════════════════════════════════');
}

runDebugTests();
