/**
 * FreeLang v2 Simple Interpreter
 *
 * AST를 직접 실행하는 트리 워크 인터프리터
 * 필수 기능: 변수, 함수, 제어 흐름
 */

import { ASTNode } from './parser';

/**
 * 실행 컨텍스트
 */
interface ExecutionContext {
  variables: Map<string, any>;
  functions: Map<string, ASTNode>;
  classes: Map<string, ASTNode>;
  modules: Map<string, any>;  // IMPORT된 모듈 저장
  returnValue?: any;
  shouldReturn: boolean;
}

/**
 * 간단한 인터프리터
 */
export class SimpleInterpreter {
  private globalContext: ExecutionContext = {
    variables: new Map(),
    functions: new Map(),
    classes: new Map(),
    modules: new Map(),
    shouldReturn: false,
  };

  /**
   * 프로그램 실행
   */
  execute(ast: ASTNode): any {
    return this.executeProgram(ast, this.globalContext);
  }

  /**
   * 프로그램 실행
   */
  private executeProgram(node: ASTNode, context: ExecutionContext): any {
    if (node.type !== 'Program') {
      return this.executeNode(node, context);
    }

    let result: any = undefined;

    for (const stmt of node.statements) {
      result = this.executeNode(stmt, context);

      // 함수 정의는 결과 반환 안 함
      if (stmt.type === 'FunctionDeclaration') {
        context.functions.set(stmt.name, stmt);
      } else if (stmt.type === 'ClassDefinition') {
        context.classes.set(stmt.name, stmt);
      }

      // RETURN이 발생하면 종료
      if (context.shouldReturn) {
        break;
      }
    }

    return result;
  }

  /**
   * 노드 실행 (디스패치)
   */
  private executeNode(node: ASTNode, context: ExecutionContext): any {
    if (!node) return undefined;

    switch (node.type) {
      case 'ImportStatement':
        return this.executeImport(node, context);

      case 'SetStatement':
        return this.executeSet(node, context);

      case 'IfStatement':
        return this.executeIf(node, context);

      case 'WhileStatement':
        return this.executeWhile(node, context);

      case 'ForStatement':
        return this.executeFor(node, context);

      case 'FunctionDeclaration':
        // 함수 정의는 처리하지 않음 (executeProgram에서 등록)
        return undefined;

      case 'ClassDefinition':
        // 클래스 정의는 처리하지 않음 (executeProgram에서 등록)
        return undefined;

      case 'ReturnStatement':
        return this.executeReturn(node, context);

      case 'PrintStatement':
        return this.executePrint(node, context);

      case 'TryStatement':
        return this.executeTry(node, context);

      default:
        return this.evaluateExpression(node, context);
    }
  }

  /**
   * SET 문 실행
   */
  private executeSet(node: ASTNode, context: ExecutionContext): any {
    const value = this.evaluateExpression(node.value, context);
    context.variables.set(node.variable, value);
    return value;
  }

  /**
   * IF 문 실행
   */
  private executeIf(node: ASTNode, context: ExecutionContext): any {
    const condition = this.evaluateExpression(node.condition, context);

    if (this.isTruthy(condition)) {
      for (const stmt of node.thenBody) {
        this.executeNode(stmt, context);
        if (context.shouldReturn) break;
      }
    } else {
      for (const stmt of node.elseBody) {
        this.executeNode(stmt, context);
        if (context.shouldReturn) break;
      }
    }

    return undefined;
  }

  /**
   * WHILE 루프 실행
   */
  private executeWhile(node: ASTNode, context: ExecutionContext): any {
    let result: any = undefined;

    while (this.isTruthy(this.evaluateExpression(node.condition, context))) {
      for (const stmt of node.body) {
        result = this.executeNode(stmt, context);
        if (context.shouldReturn) break;
      }

      if (context.shouldReturn) break;
    }

    return result;
  }

  /**
   * FOR 루프 실행: FOR var IN iterable
   */
  private executeFor(node: ASTNode, context: ExecutionContext): any {
    const iterable = context.variables.get(node.iterable);

    if (!Array.isArray(iterable)) {
      throw new Error(`${node.iterable} is not an array`);
    }

    let result: any = undefined;

    for (const value of iterable) {
      context.variables.set(node.variable, value);

      for (const stmt of node.body) {
        result = this.executeNode(stmt, context);
        if (context.shouldReturn) break;
      }

      if (context.shouldReturn) break;
    }

    return result;
  }

  /**
   * RETURN 문 실행
   */
  private executeReturn(node: ASTNode, context: ExecutionContext): any {
    const value = this.evaluateExpression(node.value, context);
    context.returnValue = value;
    context.shouldReturn = true;
    return value;
  }

  /**
   * PRINT 문 실행
   */
  private executePrint(node: ASTNode, context: ExecutionContext): any {
    const values = node.args.map((arg: any) => this.evaluateExpression(arg, context));
    const output = values.map((v: any) => String(v)).join(' ');
    console.log(output);
    return undefined;
  }

  /**
   * TRY 문 실행
   */
  private executeTry(node: ASTNode, context: ExecutionContext): any {
    try {
      // TRY 블록 실행
      for (const stmt of node.tryBody) {
        this.executeNode(stmt, context);
        if (context.shouldReturn) break;
      }
    } catch (error: any) {
      // CATCH 블록 실행
      if (node.catchBody && node.catchVar) {
        // 예외 변수를 컨텍스트에 바인딩
        const exceptionName = node.catchVar;
        const exceptionMsg = error instanceof Error ? error.message : String(error);
        context.variables.set(exceptionName, { type: 'Exception', message: exceptionMsg });

        for (const stmt of node.catchBody) {
          this.executeNode(stmt, context);
          if (context.shouldReturn) break;
        }
      } else {
        throw error;
      }
    } finally {
      // FINALLY 블록 실행 (있으면)
      if (node.finallyBody) {
        for (const stmt of node.finallyBody) {
          this.executeNode(stmt, context);
          if (context.shouldReturn) break;
        }
      }
    }

    return undefined;
  }

  /**
   * 표현식 평가
   */
  private evaluateExpression(expr: any, context: ExecutionContext): any {
    if (!expr) return undefined;

    // 리터럴
    if (expr.type === 'NumberLiteral') {
      return expr.value;
    }

    if (expr.type === 'StringLiteral') {
      return expr.value;
    }

    if (expr.type === 'BoolLiteral') {
      return expr.value;
    }

    // 식별자
    if (expr.type === 'Identifier') {
      const value = context.variables.get(expr.name);
      if (value === undefined) {
        throw new Error(`Undefined variable: ${expr.name}`);
      }
      return value;
    }

    // 배열 리터럴
    if (expr.type === 'ArrayLiteral') {
      return expr.elements.map((e: any) => this.evaluateExpression(e, context));
    }

    // 이항 연산
    if (expr.type === 'BinaryOp') {
      return this.evaluateBinaryOp(expr, context);
    }

    // 단항 연산
    if (expr.type === 'UnaryOp') {
      return this.evaluateUnaryOp(expr, context);
    }

    // 함수 호출
    if (expr.type === 'FunctionCallExpr') {
      return this.callFunction(expr.funcName, expr.args, context);
    }

    // 메서드 호출
    if (expr.type === 'MethodCallExpr') {
      return this.callMethod(expr.instance, expr.methodName, expr.args, context);
    }

    // NEW 표현식
    if (expr.type === 'NewExpr') {
      return this.createObject(expr.className, expr.args, context);
    }

    return undefined;
  }

  /**
   * 이항 연산 평가
   */
  private evaluateBinaryOp(expr: any, context: ExecutionContext): any {
    const left = this.evaluateExpression(expr.left, context);
    const right = this.evaluateExpression(expr.right, context);

    const op = expr.operator;

    // 산술
    if (op === '+') {
      if (typeof left === 'string' || typeof right === 'string') {
        return String(left) + String(right);
      }
      return left + right;
    }
    if (op === '-') return left - right;
    if (op === '*') return left * right;
    if (op === '/') {
      // v8.9: ArithmeticException 감지
      if (right === 0) {
        throw new Error(`ArithmeticException: Division by Zero`);
      }
      return left / right;
    }
    if (op === '%') {
      // v8.9: ArithmeticException 감지
      if (right === 0) {
        throw new Error(`ArithmeticException: Modulo by Zero`);
      }
      return left % right;
    }

    // 비교
    if (op === '<') return left < right;
    if (op === '>') return left > right;
    if (op === '<=') return left <= right;
    if (op === '>=') return left >= right;
    if (op === '==') return left === right;
    if (op === '!=') return left !== right;

    // 논리
    if (op === '&&') return left && right;
    if (op === '||') return left || right;

    // 비트
    if (op === '&') return left & right;
    if (op === '|') return left | right;
    if (op === '^') return left ^ right;

    throw new Error(`Unknown operator: ${op}`);
  }

  /**
   * 단항 연산 평가
   */
  private evaluateUnaryOp(expr: any, context: ExecutionContext): any {
    const operand = this.evaluateExpression(expr.operand, context);

    if (expr.operator === 'NOT' || expr.operator === '!') {
      return !this.isTruthy(operand);
    }

    if (expr.operator === '-') {
      return -operand;
    }

    throw new Error(`Unknown unary operator: ${expr.operator}`);
  }

  /**
   * 함수 호출
   */
  private callFunction(funcName: string, args: any[], context: ExecutionContext): any {
    // 내장 함수
    if (funcName === 'print' || funcName === 'println') {
      const values = args.map(arg => this.evaluateExpression(arg, context));
      console.log(...values);
      return undefined;
    }

    if (funcName === 'len') {
      const arr = this.evaluateExpression(args[0], context);
      return Array.isArray(arr) ? arr.length : String(arr).length;
    }

    // 수학 함수들
    if (funcName === 'floor') {
      const n = this.evaluateExpression(args[0], context);
      return Math.floor(n);
    }

    if (funcName === 'ceil') {
      const n = this.evaluateExpression(args[0], context);
      return Math.ceil(n);
    }

    if (funcName === 'round') {
      const n = this.evaluateExpression(args[0], context);
      return Math.round(n);
    }

    // 사용자 정의 함수
    const funcDef = context.functions.get(funcName);
    if (!funcDef) {
      throw new Error(`Undefined function: ${funcName}`);
    }

    // 새 컨텍스트 생성
    const localContext: ExecutionContext = {
      variables: new Map(context.variables),
      functions: context.functions,
      classes: context.classes,
      modules: context.modules,
      shouldReturn: false,
    };

    // 파라미터 바인딩
    for (let i = 0; i < funcDef.params.length; i++) {
      const paramName = funcDef.params[i];
      const argValue = this.evaluateExpression(args[i], context);
      localContext.variables.set(paramName, argValue);
    }

    // 함수 본체 실행
    for (const stmt of funcDef.body) {
      this.executeNode(stmt, localContext);
      if (localContext.shouldReturn) {
        return localContext.returnValue;
      }
    }

    return undefined;
  }

  /**
   * 메서드 호출 (또는 모듈 함수 호출)
   * 예: math.sqrt(16) 또는 obj.method()
   */
  private callMethod(instanceName: string, methodName: string, args: any[], context: ExecutionContext): any {
    // 먼저 모듈에서 찾기
    const module = context.modules.get(instanceName);
    if (module && module[methodName]) {
      // 모듈의 함수 호출
      const evalArgs = args.map(arg => this.evaluateExpression(arg, context));
      return module[methodName](...evalArgs);
    }

    // 모듈이 아니면 일반 인스턴스 메서드로 처리
    const instance = context.variables.get(instanceName);
    if (!instance) {
      throw new Error(`Undefined instance or module: ${instanceName}`);
    }

    // 현재는 인스턴스 메서드 미지원
    throw new Error(`Instance method calls not yet fully supported: ${methodName}`);
  }

  /**
   * 객체 생성 (NEW)
   */
  private createObject(className: string, _args: any[], context: ExecutionContext): any {
    const classDef = context.classes.get(className);
    if (!classDef) {
      throw new Error(`Undefined class: ${className}`);
    }

    // 간단한 구현: 객체는 아직 지원하지 않음
    return { __className: className };
  }

  /**
   * IMPORT 문 실행: IMPORT moduleName FROM "path"
   */
  private executeImport(node: ASTNode, context: ExecutionContext): any {
    const moduleName = node.moduleName;
    const modulePath = node.modulePath;

    try {
      // 모듈 경로 정규화 (예: "stdlib/math" → 실제 파일 경로)
      const normalizedPath = this.resolveModulePath(modulePath);

      // 모듈 로드 (스텁: 현재는 빈 객체 반환)
      const module = this.loadModule(normalizedPath, moduleName);

      // 컨텍스트에 모듈 저장
      context.modules.set(moduleName, module);

      console.log(`[IMPORT] 모듈 로드: ${moduleName} from ${modulePath}`);
      return undefined;
    } catch (error: any) {
      throw new Error(`Failed to import ${moduleName} from ${modulePath}: ${error.message}`);
    }
  }

  /**
   * 모듈 경로 해석
   */
  private resolveModulePath(modulePath: string): string {
    // 경로 정규화: "stdlib/math" → /absolute/path/stdlib/math/lib.free
    const path = require('path');
    const projectRoot = '/home/kimjin/Desktop/kim/v2-freelang-ai';
    return path.join(projectRoot, modulePath, 'lib.free');
  }

  /**
   * 모듈 로드
   */
  private loadModule(modulePath: string, moduleName: string): any {
    try {
      const fs = require('fs');

      // 파일 존재 확인
      if (!fs.existsSync(modulePath)) {
        throw new Error(`Module file not found: ${modulePath}`);
      }

      // 파일 읽기
      const code = fs.readFileSync(modulePath, 'utf-8');

      // 모듈 코드 파싱 및 실행
      const { Parser } = require('./parser');
      const parser = new Parser();
      const ast = parser.parse(code);

      // 모듈 컨텍스트 생성
      const moduleContext: ExecutionContext = {
        variables: new Map(),
        functions: new Map(),
        classes: new Map(),
        modules: new Map(),
        shouldReturn: false,
      };

      // 모듈 실행 (함수와 클래스만 등록)
      this.executeProgram(ast, moduleContext);

      // 모듈 객체 생성 (함수들을 프로퍼티로 가짐)
      const moduleObj: any = {};
      for (const [funcName] of moduleContext.functions) {
        // 함수 래퍼 생성 (이미 평가된 인자를 직접 받음)
        moduleObj[funcName] = (...evalArgs: any[]) => {
          const funcDef = moduleContext.functions.get(funcName);
          if (!funcDef) {
            throw new Error(`Undefined function: ${funcName}`);
          }

          // 새 컨텍스트 생성
          const callContext: ExecutionContext = {
            variables: new Map(moduleContext.variables),
            functions: moduleContext.functions,
            classes: moduleContext.classes,
            modules: moduleContext.modules,
            shouldReturn: false,
          };

          // 파라미터 바인딩 (이미 평가된 값)
          for (let i = 0; i < funcDef.params.length; i++) {
            const paramName = funcDef.params[i];
            callContext.variables.set(paramName, evalArgs[i]);
          }

          // 함수 본체 실행
          for (const stmt of funcDef.body) {
            this.executeNode(stmt, callContext);
            if (callContext.shouldReturn) {
              return callContext.returnValue;
            }
          }

          return undefined;
        };
      }

      console.log(`  → ${moduleName}: ${moduleContext.functions.size}개 함수 로드됨`);
      return moduleObj;
    } catch (error: any) {
      throw new Error(`Failed to load module from ${modulePath}: ${error.message}`);
    }
  }

  /**
   * 참/거짓 판정
   */
  private isTruthy(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (value === false) return false;
    if (value === 0) return false;
    if (value === '') return false;
    return true;
  }
}
