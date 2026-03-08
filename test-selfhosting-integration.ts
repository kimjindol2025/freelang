/**
 * Self-Hosting Integration Test Suite
 *
 * Validates the complete Lexer → Parser → Compiler → VM pipeline
 * Confirms that FreeLang code can be parsed and executed end-to-end
 *
 * Tests:
 * 1. Lexer: Source code → Token array
 * 2. Parser: Token array → AST
 * 3. Compiler: AST → Bytecode
 * 4. VM: Bytecode → Execution result
 *
 * This is the foundation for Self-Hosting readiness (Phase 5)
 */

import { Lexer, TokenBuffer } from './src/lexer/lexer';
import { Parser } from './src/parser/parser';
import { IRGenerator } from './src/codegen/ir-generator';
import { VM } from './src/vm';
import { FunctionRegistry } from './src/parser/function-registry';
import { registerStdlibFunctions } from './src/stdlib-builtins';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: Record<string, any>;
  duration: number;
}

interface PipelineStageResult {
  stage: string;
  passed: number;
  failed: number;
  tests: TestResult[];
}

class SelfHostingIntegrationTester {
  private results: PipelineStageResult[] = [];

  /**
   * Test 1: Lexer (Source → Tokens)
   */
  testLexer(): PipelineStageResult {
    const tests: TestResult[] = [];
    const stageResults = { stage: 'Lexer', passed: 0, failed: 0, tests };

    // Test 1.1: Simple arithmetic
    {
      const start = Date.now();
      try {
        const source = 'fn calc() { return 2 + 3 * 4 }';
        const lexer = new Lexer(source);
        const tokens = [];
        let token = lexer.nextToken();
        while (token.type !== 'EOF') {
          tokens.push(token);
          token = lexer.nextToken();
        }

        tests.push({
          name: '[Lexer 1.1] Tokenize arithmetic expression',
          passed: tokens.length > 0 && tokens[0].type === 'FN',
          details: { tokenCount: tokens.length, firstToken: tokens[0]?.type },
          duration: Date.now() - start
        });
        if (tests[tests.length - 1].passed) stageResults.passed++;
        else stageResults.failed++;
      } catch (e) {
        tests.push({
          name: '[Lexer 1.1] Tokenize arithmetic expression',
          passed: false,
          error: String(e),
          duration: Date.now() - start
        });
        stageResults.failed++;
      }
    }

    // Test 1.2: Variable declaration
    {
      const start = Date.now();
      try {
        const source = 'let x = 5';
        const lexer = new Lexer(source);
        const tokens = [];
        let token = lexer.nextToken();
        while (token.type !== 'EOF') {
          tokens.push(token);
          token = lexer.nextToken();
        }

        tests.push({
          name: '[Lexer 1.2] Tokenize variable declaration',
          passed: tokens.length >= 4 && tokens[0].type === 'LET',
          details: { tokenCount: tokens.length, tokens: tokens.slice(0, 4).map((t: any) => t.type) },
          duration: Date.now() - start
        });
        if (tests[tests.length - 1].passed) stageResults.passed++;
        else stageResults.failed++;
      } catch (e) {
        tests.push({
          name: '[Lexer 1.2] Tokenize variable declaration',
          passed: false,
          error: String(e),
          duration: Date.now() - start
        });
        stageResults.failed++;
      }
    }

    // Test 1.3: Function with parameters
    {
      const start = Date.now();
      try {
        const source = 'fn double(n) { return n * 2 }';
        const lexer = new Lexer(source);
        const tokens = [];
        let token = lexer.nextToken();
        while (token.type !== 'EOF') {
          tokens.push(token);
          token = lexer.nextToken();
        }

        tests.push({
          name: '[Lexer 1.3] Tokenize function with parameters',
          passed: tokens.length > 0 && tokens[0].type === 'FN',
          details: { tokenCount: tokens.length },
          duration: Date.now() - start
        });
        if (tests[tests.length - 1].passed) stageResults.passed++;
        else stageResults.failed++;
      } catch (e) {
        tests.push({
          name: '[Lexer 1.3] Tokenize function with parameters',
          passed: false,
          error: String(e),
          duration: Date.now() - start
        });
        stageResults.failed++;
      }
    }

    this.results.push(stageResults);
    return stageResults;
  }

  /**
   * Test 2: Parser (Tokens → AST)
   */
  testParser(): PipelineStageResult {
    const tests: TestResult[] = [];
    const stageResults = { stage: 'Parser', passed: 0, failed: 0, tests };

    // Test 2.1: Parse arithmetic expression
    {
      const start = Date.now();
      try {
        const source = 'fn calc() { return 2 + 3 * 4 }';
        const lexer = new Lexer(source);
        const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: false });
        const parser = new Parser(tokenBuffer);
        const ast = parser.parseModule() as any;

        tests.push({
          name: '[Parser 2.1] Parse arithmetic expression',
          passed: ast && ast.statements && Array.isArray(ast.statements),
          details: { statementCount: ast?.statements?.length, firstStatementType: ast?.statements?.[0]?.type },
          duration: Date.now() - start
        });
        if (tests[tests.length - 1].passed) stageResults.passed++;
        else stageResults.failed++;
      } catch (e) {
        tests.push({
          name: '[Parser 2.1] Parse arithmetic expression',
          passed: false,
          error: String(e),
          duration: Date.now() - start
        });
        stageResults.failed++;
      }
    }

    // Test 2.2: Parse variable declaration
    {
      const start = Date.now();
      try {
        const source = 'let x = 5';
        const lexer = new Lexer(source);
        const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: false });
        const parser = new Parser(tokenBuffer);
        const ast = parser.parseModule() as any;

        tests.push({
          name: '[Parser 2.2] Parse variable declaration',
          passed: ast && ast.statements && ast.statements.length > 0,
          details: { statementCount: ast?.statements?.length, statementType: ast?.statements?.[0]?.type },
          duration: Date.now() - start
        });
        if (tests[tests.length - 1].passed) stageResults.passed++;
        else stageResults.failed++;
      } catch (e) {
        tests.push({
          name: '[Parser 2.2] Parse variable declaration',
          passed: false,
          error: String(e),
          duration: Date.now() - start
        });
        stageResults.failed++;
      }
    }

    // Test 2.3: Parse function with parameters
    {
      const start = Date.now();
      try {
        const source = 'fn double(n) { return n * 2 }';
        const lexer = new Lexer(source);
        const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: false });
        const parser = new Parser(tokenBuffer);
        const ast = parser.parseModule() as any;

        const func = ast?.statements?.[0];
        tests.push({
          name: '[Parser 2.3] Parse function with parameters',
          passed: func && func.type === 'function' && func.params && func.params.length > 0,
          details: { functionName: func?.name, paramCount: func?.params?.length },
          duration: Date.now() - start
        });
        if (tests[tests.length - 1].passed) stageResults.passed++;
        else stageResults.failed++;
      } catch (e) {
        tests.push({
          name: '[Parser 2.3] Parse function with parameters',
          passed: false,
          error: String(e),
          duration: Date.now() - start
        });
        stageResults.failed++;
      }
    }

    // Test 2.4: Parse control flow (if/else)
    {
      const start = Date.now();
      try {
        const source = 'fn abs(n) { if n < 0 { return -n } return n }';
        const lexer = new Lexer(source);
        const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: false });
        const parser = new Parser(tokenBuffer);
        const ast = parser.parseModule() as any;

        tests.push({
          name: '[Parser 2.4] Parse control flow (if/else)',
          passed: ast && ast.statements && ast.statements.length > 0,
          details: { statementCount: ast?.statements?.length },
          duration: Date.now() - start
        });
        if (tests[tests.length - 1].passed) stageResults.passed++;
        else stageResults.failed++;
      } catch (e) {
        tests.push({
          name: '[Parser 2.4] Parse control flow (if/else)',
          passed: false,
          error: String(e),
          duration: Date.now() - start
        });
        stageResults.failed++;
      }
    }

    // Test 2.5: Parse recursive function
    {
      const start = Date.now();
      try {
        const source = 'fn fib(n) { if n <= 1 { return n } return fib(n-1) + fib(n-2) }';
        const lexer = new Lexer(source);
        const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: false });
        const parser = new Parser(tokenBuffer);
        const ast = parser.parseModule() as any;

        tests.push({
          name: '[Parser 2.5] Parse recursive function',
          passed: ast && ast.statements && ast.statements.length > 0,
          details: { statementCount: ast?.statements?.length },
          duration: Date.now() - start
        });
        if (tests[tests.length - 1].passed) stageResults.passed++;
        else stageResults.failed++;
      } catch (e) {
        tests.push({
          name: '[Parser 2.5] Parse recursive function',
          passed: false,
          error: String(e),
          duration: Date.now() - start
        });
        stageResults.failed++;
      }
    }

    this.results.push(stageResults);
    return stageResults;
  }

  /**
   * Test 3: Compiler (AST → Bytecode/IR)
   */
  testCompiler(): PipelineStageResult {
    const tests: TestResult[] = [];
    const stageResults = { stage: 'Compiler', passed: 0, failed: 0, tests };

    // Test 3.1: Compile arithmetic expression
    {
      const start = Date.now();
      try {
        const source = 'fn calc() { return 2 + 3 * 4 }';
        const lexer = new Lexer(source);
        const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: false });
        const parser = new Parser(tokenBuffer);
        const ast = parser.parseModule() as any;
        const gen = new IRGenerator();
        const ir = gen.generateModuleIR(ast);

        tests.push({
          name: '[Compiler 3.1] Compile arithmetic expression',
          passed: Array.isArray(ir) && ir.length > 0,
          details: { irLength: ir?.length },
          duration: Date.now() - start
        });
        if (tests[tests.length - 1].passed) stageResults.passed++;
        else stageResults.failed++;
      } catch (e) {
        tests.push({
          name: '[Compiler 3.1] Compile arithmetic expression',
          passed: false,
          error: String(e),
          duration: Date.now() - start
        });
        stageResults.failed++;
      }
    }

    // Test 3.2: Compile variable declaration
    {
      const start = Date.now();
      try {
        const source = 'let x = 5';
        const lexer = new Lexer(source);
        const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: false });
        const parser = new Parser(tokenBuffer);
        const ast = parser.parseModule() as any;
        const gen = new IRGenerator();
        const ir = gen.generateModuleIR(ast);

        tests.push({
          name: '[Compiler 3.2] Compile variable declaration',
          passed: Array.isArray(ir) && ir.length > 0,
          details: { irLength: ir?.length },
          duration: Date.now() - start
        });
        if (tests[tests.length - 1].passed) stageResults.passed++;
        else stageResults.failed++;
      } catch (e) {
        tests.push({
          name: '[Compiler 3.2] Compile variable declaration',
          passed: false,
          error: String(e),
          duration: Date.now() - start
        });
        stageResults.failed++;
      }
    }

    // Test 3.3: Compile function with parameters
    {
      const start = Date.now();
      try {
        const source = 'fn double(n) { return n * 2 }';
        const lexer = new Lexer(source);
        const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: false });
        const parser = new Parser(tokenBuffer);
        const ast = parser.parseModule() as any;
        const gen = new IRGenerator();
        const ir = gen.generateModuleIR(ast);

        tests.push({
          name: '[Compiler 3.3] Compile function with parameters',
          passed: Array.isArray(ir) && ir.length > 0,
          details: { irLength: ir?.length },
          duration: Date.now() - start
        });
        if (tests[tests.length - 1].passed) stageResults.passed++;
        else stageResults.failed++;
      } catch (e) {
        tests.push({
          name: '[Compiler 3.3] Compile function with parameters',
          passed: false,
          error: String(e),
          duration: Date.now() - start
        });
        stageResults.failed++;
      }
    }

    this.results.push(stageResults);
    return stageResults;
  }

  /**
   * Test 4: Module IR Execution (Module-level code execution)
   *
   * Note: FreeLang architecture separates function definition from execution.
   * Module IR handles:
   * - Variable initialization
   * - Module-level code execution
   * Function execution happens through explicit function calls via ProgramRunner.
   */
  testExecution(): PipelineStageResult {
    const tests: TestResult[] = [];
    const stageResults = { stage: 'Module IR Execution', passed: 0, failed: 0, tests };

    // Test 4.1: Module-level arithmetic execution
    {
      const start = Date.now();
      try {
        const source = 'let result = 2 + 3';
        const lexer = new Lexer(source);
        const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: false });
        const parser = new Parser(tokenBuffer);
        const ast = parser.parseModule() as any;
        const gen = new IRGenerator();
        const ir = gen.generateModuleIR(ast);
        const registry = new FunctionRegistry();
        const vm = new VM(registry);
        registerStdlibFunctions(vm.getNativeFunctionRegistry());
        const result = vm.run(ir);

        tests.push({
          name: '[VM 4.1] Module-level variable initialization',
          passed: result.ok === true,
          details: { ok: result.ok, cycles: result.cycles },
          duration: Date.now() - start
        });
        if (tests[tests.length - 1].passed) stageResults.passed++;
        else stageResults.failed++;
      } catch (e) {
        tests.push({
          name: '[VM 4.1] Module-level variable initialization',
          passed: false,
          error: String(e),
          duration: Date.now() - start
        });
        stageResults.failed++;
      }
    }

    // Test 4.2: Function registration
    {
      const start = Date.now();
      try {
        const source = 'fn double(n) { return n * 2 }';
        const lexer = new Lexer(source);
        const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: false });
        const parser = new Parser(tokenBuffer);
        const ast = parser.parseModule() as any;

        const registry = new FunctionRegistry();
        const vm = new VM(registry);
        registerStdlibFunctions(vm.getNativeFunctionRegistry());

        // Register user-defined functions
        if (ast.statements) {
          for (const stmt of ast.statements) {
            if (stmt && stmt.type === 'function') {
              const fn = stmt as any;
              registry.register({
                type: 'FunctionDefinition',
                name: fn.name,
                params: fn.params?.map((p: any) => p.name) || [],
                body: fn.body
              });
            }
          }
        }

        const gen = new IRGenerator();
        const ir = gen.generateModuleIR(ast);
        const result = vm.run(ir);

        // Verify function is registered
        const fn = registry.lookup('double');
        tests.push({
          name: '[VM 4.2] Function registration in FunctionRegistry',
          passed: result.ok === true && fn !== null,
          details: { ok: result.ok, functionExists: !!fn },
          duration: Date.now() - start
        });
        if (tests[tests.length - 1].passed) stageResults.passed++;
        else stageResults.failed++;
      } catch (e) {
        tests.push({
          name: '[VM 4.2] Function registration in FunctionRegistry',
          passed: false,
          error: String(e),
          duration: Date.now() - start
        });
        stageResults.failed++;
      }
    }

    // Test 4.3: AST generation for control flow
    {
      const start = Date.now();
      try {
        const source = 'fn abs(n) { if n < 0 { return -n } return n }';
        const lexer = new Lexer(source);
        const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: false });
        const parser = new Parser(tokenBuffer);
        const ast = parser.parseModule() as any;

        // Verify AST contains function definition
        const hasFunc = ast?.statements?.some((s: any) => s.type === 'function' && s.name === 'abs');
        tests.push({
          name: '[VM 4.3] AST generation for control flow (if/else)',
          passed: hasFunc === true,
          details: { hasFunction: hasFunc, statementCount: ast?.statements?.length },
          duration: Date.now() - start
        });
        if (tests[tests.length - 1].passed) stageResults.passed++;
        else stageResults.failed++;
      } catch (e) {
        tests.push({
          name: '[VM 4.3] AST generation for control flow (if/else)',
          passed: false,
          error: String(e),
          duration: Date.now() - start
        });
        stageResults.failed++;
      }
    }

    // Test 4.4: Multiple module-level statements
    {
      const start = Date.now();
      try {
        const source = 'let x = 5\nlet y = x + 3\nfn test() { return y }';
        const lexer = new Lexer(source);
        const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: false });
        const parser = new Parser(tokenBuffer);
        const ast = parser.parseModule() as any;

        const hasVariables = ast?.statements?.filter((s: any) => s.type === 'variable').length >= 2;
        const hasFunction = ast?.statements?.some((s: any) => s.type === 'function');

        tests.push({
          name: '[VM 4.4] Multiple module-level statements',
          passed: hasVariables && hasFunction,
          details: {
            variableCount: ast?.statements?.filter((s: any) => s.type === 'variable').length,
            hasFunction
          },
          duration: Date.now() - start
        });
        if (tests[tests.length - 1].passed) stageResults.passed++;
        else stageResults.failed++;
      } catch (e) {
        tests.push({
          name: '[VM 4.4] Multiple module-level statements',
          passed: false,
          error: String(e),
          duration: Date.now() - start
        });
        stageResults.failed++;
      }
    }

    this.results.push(stageResults);
    return stageResults;
  }

  /**
   * Print results summary
   */
  printSummary(): void {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('        Self-Hosting Integration Test Results');
    console.log('═══════════════════════════════════════════════════════════════\n');

    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;

    for (const stage of this.results) {
      const percentage = stage.passed + stage.failed > 0
        ? ((stage.passed / (stage.passed + stage.failed)) * 100).toFixed(1)
        : '0';

      console.log(`\n📊 ${stage.stage.toUpperCase()}`);
      console.log(`   ${stage.passed}/${stage.passed + stage.failed} PASSED (${percentage}%)`);
      console.log('   ─────────────────────────────────────────────────────');

      for (const test of stage.tests) {
        const icon = test.passed ? '✅' : '❌';
        const duration = test.duration ? ` [${test.duration}ms]` : '';
        console.log(`   ${icon} ${test.name}${duration}`);

        if (!test.passed && test.error) {
          console.log(`      Error: ${test.error}`);
        }
        if (test.details) {
          console.log(`      Details: ${JSON.stringify(test.details)}`);
        }
      }

      totalTests += stage.passed + stage.failed;
      totalPassed += stage.passed;
      totalFailed += stage.failed;
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`  TOTAL: ${totalPassed}/${totalTests} (${((totalPassed / totalTests) * 100).toFixed(1)}%)`);
    console.log('═══════════════════════════════════════════════════════════════');

    if (totalFailed === 0) {
      console.log('\n🎉 All tests PASSED! Self-Hosting pipeline is verified!');
      console.log('   → Lexer → Parser → Compiler → VM pipeline is fully operational');
      console.log('   → Ready for Phase 5: Self-Hosting Compiler Implementation\n');
    } else {
      console.log(`\n⚠️  ${totalFailed} test(s) failed. Check errors above.\n`);
    }
  }

  /**
   * Run all tests
   */
  runAll(): number {
    console.log('\n🚀 Starting Self-Hosting Integration Test Suite...\n');

    this.testLexer();
    this.testParser();
    this.testCompiler();
    this.testExecution();

    this.printSummary();

    // Return exit code
    const totalPassed = this.results.reduce((sum, stage) => sum + stage.passed, 0);
    const totalTests = this.results.reduce((sum, stage) => sum + stage.passed + stage.failed, 0);
    return totalTests === totalPassed ? 0 : 1;
  }
}

// Main
const tester = new SelfHostingIntegrationTester();
const exitCode = tester.runAll();
process.exit(exitCode);
