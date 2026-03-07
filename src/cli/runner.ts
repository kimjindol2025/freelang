/**
 * FreeLang CLI Runner
 * Reads program file, compiles to IR, executes on VM
 *
 * Phase 1: Full Lexer-Parser-IRGen-VM Pipeline Connected
 * Replaces regex-based FunctionParser with full AST parser
 */

import * as fs from 'fs';
import * as path from 'path';
import { Lexer } from '../lexer/lexer';
import { TokenBuffer } from '../lexer/lexer';
import { Parser } from '../parser/parser';
import { IRGenerator } from '../codegen/ir-generator';
import { VM } from '../vm';
import { FunctionRegistry } from '../parser/function-registry';
import { Inst, VMResult } from '../types';
import { optimizeIR } from '../phase-14-llvm';
import { registerStdlibFunctions } from '../stdlib-builtins';
import { registerSQLiteNativeFunctions } from '../stdlib/sqlite-native';
import { registerTCPFunctions } from '../stdlib/net/tcp-native';
import { registerSystemExtendedFunctions } from '../stdlib-system-extended';
import { registerFsExtendedFunctions } from '../stdlib-fs-extended';
import { registerTeamDFunctions } from '../stdlib-team-d-http-db';

export interface RunResult {
  success: boolean;
  output?: unknown;
  error?: string;
  exitCode: number;
  executionTime: number;
}

/**
 * Compile and run a FreeLang program
 */
export class ProgramRunner {
  private gen: IRGenerator;
  private vm: VM;
  private registry: FunctionRegistry;

  constructor(registry?: FunctionRegistry) {
    this.registry = registry || new FunctionRegistry();
    this.gen = new IRGenerator();
    this.vm = new VM(this.registry);
    // Phase 26: VM has already set itself in native registry during construction
    // Register all stdlib functions from Phase A-H after VM creation
    registerStdlibFunctions(this.vm.getNativeFunctionRegistry());
    // Phase H: Register SQLite native functions
    registerSQLiteNativeFunctions(this.vm.getNativeFunctionRegistry());
    // Phase 3 Level 3: Register TCP native functions (net module)
    registerTCPFunctions(this.vm.getNativeFunctionRegistry());
    // Phase C: Register system extended functions (event, logging, scheduler, cache, validation, config)
    registerSystemExtendedFunctions(this.vm.getNativeFunctionRegistry());
    // Phase D: Register file system extended functions (dir_walk, file_stat, etc)
    registerFsExtendedFunctions(this.vm.getNativeFunctionRegistry());
    // Team D: Register HTTP/DB/Cache/Redis functions (24 libraries, 120+ functions)
    registerTeamDFunctions(this.vm.getNativeFunctionRegistry());
  }

  /**
   * Get the function registry (for accessing registered functions)
   */
  getRegistry(): FunctionRegistry {
    return this.registry;
  }

  /**
   * Run program from string
   * Phase 1: Full Lexer→Parser pipeline
   * Phase 2: Function registration before execution
   */
  runString(source: string): RunResult {
    const startTime = Date.now();

    try {
      // 1. Tokenize: Lexer → TokenBuffer
      const lexer = new Lexer(source);
      const tokenBuffer = new TokenBuffer(lexer, { preserveNewlines: false });

      // 2. Parse: TokenBuffer → Module AST (supports fn/let/if/while/for)
      const parser = new Parser(tokenBuffer);
      const module = parser.parseModule() as any;

      // 2.5. Phase 2: Register user-defined functions before execution
      // Extract FunctionStatements from module.statements and register them
      // DEBUG: Log module structure (disabled)
      // console.log('[DEBUG] Module statements:', module.statements?.map((s: any) => ({ type: s.type, name: s.name })));

      if (module.statements) {
        for (const stmt of module.statements) {
          if (stmt && stmt.type === 'function') {
            const fn = stmt as any; // FunctionStatement
            // Register function in FunctionRegistry with params and body
            this.registry.register({
              type: 'FunctionDefinition',
              name: fn.name,
              params: fn.params?.map((p: any) => p.name) || [],  // Extract param names
              body: fn.body,  // BlockStatement
              annotations: fn.annotations || []  // Self-Monitoring Kernel: @monitor 등
            });
          }
        }
      }

      // 3. Generate IR: Module → IR instructions
      const ir = this.gen.generateModuleIR(module);

      // 3.5. Optimize IR: Apply LLVM optimizations (ADCE, Constant Folding, Inlining)
      // Temporarily disabled for debugging
      // const { optimized } = optimizeIR(ir);

      // 4. Execute: Optimized IR → VM results
      const result = this.vm.run(ir); // Use unoptimized for now

      const executionTime = Date.now() - startTime;

      return {
        success: result.ok,
        output: result.value,
        error: result.error ? `VM Error: ${result.error.detail}` : undefined,
        exitCode: result.ok ? 0 : 1,
        executionTime
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        error: `Compilation Error: ${error instanceof Error ? error.message : String(error)}`,
        exitCode: 2,
        executionTime
      };
    }
  }

  /**
   * Phase 2: Preload imported modules recursively
   * Extracts import statements and loads them first to register functions
   */
  private preloadImports(filePath: string, loadedFiles = new Set<string>(), isMainFile = true): void {
    try {
      // Avoid circular imports
      const absolutePath = path.resolve(filePath);
      if (loadedFiles.has(absolutePath)) {
        return;
      }
      loadedFiles.add(absolutePath);

      // Check file exists
      if (!fs.existsSync(filePath)) {
        return;
      }

      // Read file
      const source = fs.readFileSync(filePath, 'utf-8');

      // Extract import statements: import "path/to/module"
      const importPattern = /import\s+["']([^"']+)["']/g;
      let match;
      const importedFiles: string[] = [];

      while ((match = importPattern.exec(source)) !== null) {
        const importPath = match[1];
        // Resolve relative to current file
        const resolvedPath = path.resolve(path.dirname(filePath), importPath);
        // Add .fl extension if missing
        const fullPath = resolvedPath.endsWith('.fl') ? resolvedPath : resolvedPath + '.fl';

        if (fs.existsSync(fullPath)) {
          importedFiles.push(fullPath);
        }
      }

      // Recursively preload imported files first
      for (const importedFile of importedFiles) {
        this.preloadImports(importedFile, loadedFiles, false);
      }

      // Only run imported modules to register functions, NOT the main file
      // (The main file will be run separately in runFile)
      if (!isMainFile) {
        const result = this.runString(source);
        if (!result.success && result.error) {
          // Log import loading error but don't fail
          console.warn(`⚠️ Warning loading import ${filePath}: ${result.error}`);
        }
      }
    } catch (error) {
      // Silent fail on import loading
      console.warn(`⚠️ Warning preloading ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Run program from file
   */
  runFile(filePath: string): RunResult {
    const startTime = Date.now();

    try {
      // 1. Check file exists
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: `File not found: ${filePath}`,
          exitCode: 3,
          executionTime: Date.now() - startTime
        };
      }

      // Phase 2: Preload all imported modules first (for function registration)
      this.preloadImports(filePath);

      // 2. Read file
      const source = fs.readFileSync(filePath, 'utf-8');

      // 3. Run program
      return this.runString(source);
    } catch (error) {
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        error: `File Error: ${error instanceof Error ? error.message : String(error)}`,
        exitCode: 3,
        executionTime
      };
    }
  }

  /**
   * Get IR for a program (for debugging)
   */
  getIR(source: string): Inst[] {
    try {
      // Tokenize → Parse → Generate IR
      const lexer = new Lexer(source);
      const tokenBuffer = new TokenBuffer(lexer);
      const parser = new Parser(tokenBuffer);
      const module = parser.parseModule() as any;
      return this.gen.generateModuleIR(module);
    } catch (error) {
      throw new Error(`IR Generation Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
