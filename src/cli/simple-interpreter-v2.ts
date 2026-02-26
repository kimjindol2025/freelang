/**
 * FreeLang v2 Simple Interpreter
 *
 * AST를 직접 실행하는 트리 워크 인터프리터
 * 필수 기능: 변수, 함수, 제어 흐름
 */

import { ASTNode } from './parser';

/**
 * 로깅 인프라
 * 로그 레벨별로 관리 (DEBUG는 환경변수로 제어)
 */
class Logger {
  private debugEnabled: boolean = process.env.DEBUG_INTERPRETER === 'true';

  private logOutput(level: 'DEBUG' | 'TRACE' | 'WARN' | 'ERROR', msg: string, data?: any) {
    if (level === 'DEBUG' && !this.debugEnabled) return;
    if (level === 'TRACE' && !this.debugEnabled) return;

    const timestamp = new Date().toISOString().slice(11, 23);
    const prefix = `[${timestamp}] [${level}]`;

    if (data !== undefined) {
      console.log(`${prefix} ${msg}`, data);
    } else {
      console.log(`${prefix} ${msg}`);
    }
  }

  debug(msg: string, data?: any) {
    this.logOutput('DEBUG', msg, data);
  }

  trace(msg: string, data?: any) {
    this.logOutput('TRACE', msg, data);
  }

  warn(msg: string, data?: any) {
    this.logOutput('WARN', msg, data);
  }

  error(msg: string, error?: any) {
    if (error instanceof Error) {
      console.error(`[ERROR] ${msg}`, error.message, error.stack);
    } else {
      console.error(`[ERROR] ${msg}`, error);
    }
  }
}

/**
 * 실행 컨텍스트
 *
 * 변수, 함수, 클래스, 모듈을 관리하는 스코프
 * - variables: 현재 스코프의 변수 저장소 (Map으로 명시적 존재 확인 필요)
 * - functions: 전역 함수 레지스트리 (읽기 전용, 모든 스코프에서 공유)
 * - classes: 전역 클래스 레지스트리 (읽기 전용)
 * - modules: IMPORT된 모듈 저장소
 * - returnValue: 현재 함수의 반환값 (RETURN 문에 의해 설정)
 * - shouldReturn: 함수 반환 플래그 (콜 스택 언와인딩 신호)
 * - logger: 디버깅 로그 출력
 */
interface ExecutionContext {
  variables: Map<string, any>;
  functions: Map<string, any>;  // ASTNode & { isAsync?: boolean }
  classes: Map<string, ASTNode>;
  modules: Map<string, any>;  // IMPORT된 모듈 저장
  returnValue?: any;
  shouldReturn: boolean;
  logger?: Logger;
}

/**
 * 간단한 인터프리터
 *
 * AST를 직접 실행하는 트리 워크 인터프리터
 * - globalContext: 모든 변수/함수/클래스 저장
 * - logger: 디버깅 로그 출력
 * - expressionHandlers: Expression 타입별 핸들러 맵 (handler pattern)
 */
export class SimpleInterpreter {
  private logger: Logger = new Logger();

  private globalContext: ExecutionContext = {
    variables: new Map(),
    functions: new Map(),
    classes: new Map(),
    modules: new Map(),
    shouldReturn: false,
    logger: new Logger(),
  };

  /**
   * 프로그램 실행 (비동기)
   *
   * @param ast - 파싱된 AST (Program 노드)
   * @returns 프로그램 실행 결과
   *
   * @example
   * const parser = new Parser();
   * const ast = parser.parse('PRINT "Hello"');
   * const result = await interpreter.execute(ast);
   */
  async execute(ast: ASTNode): Promise<any> {
    this.logger.debug('Executing program', { stmtCount: ast.statements?.length || 0 });
    return await this.executeProgram(ast, this.globalContext);
  }

  /**
   * 프로그램 실행 (비동기)
   */
  private async executeProgram(node: ASTNode, context: ExecutionContext): Promise<any> {
    if (node.type !== 'Program') {
      return await this.executeNode(node, context);
    }

    let result: any = undefined;

    for (const stmt of node.statements) {
      result = await this.executeNode(stmt, context);

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
   * 노드 실행 (디스패치, 비동기)
   */
  private async executeNode(node: ASTNode, context: ExecutionContext): Promise<any> {
    if (!node) return undefined;

    switch (node.type) {
      case 'ImportStatement':
        return await this.executeImport(node, context);

      case 'SetStatement':
        return await this.executeSet(node, context);

      case 'IfStatement':
        return await this.executeIf(node, context);

      case 'WhileStatement':
        return await this.executeWhile(node, context);

      case 'ForStatement':
        return await this.executeFor(node, context);

      case 'FunctionDeclaration':
        // 함수 정의는 처리하지 않음 (executeProgram에서 등록)
        return undefined;

      case 'ClassDefinition':
        // 클래스 정의는 처리하지 않음 (executeProgram에서 등록)
        return undefined;

      case 'ReturnStatement':
        return await this.executeReturn(node, context);

      case 'PrintStatement':
        return await this.executePrint(node, context);

      case 'TryStatement':
        return await this.executeTry(node, context);

      case 'ThrowStatement':
        return await this.executeThrow(node, context);

      default:
        return await this.evaluateExpression(node, context);
    }
  }

  /**
   * SET 문 실행 (비동기)
   *
   * 변수에 값을 할당합니다.
   * - 우변 표현식을 평가
   * - 좌변 변수에 결과값 저장
   * - 현재 스코프 컨텍스트의 variables Map에만 저장 (로컬 스코프)
   *
   * @param node - SetStatement 노드 { type: 'SetStatement', variable: 'x', value: {...} }
   * @param context - 실행 컨텍스트 (현재 스코프)
   * @returns 할당된 값
   *
   * @example
   * // SET x = 10 + 5
   * await executeSet(
   *   { type: 'SetStatement', variable: 'x', value: { type: 'BinaryOp', ... } },
   *   context
   * );
   * // context.variables.get('x') === 15
   *
   * // SET result = AWAIT delay(500)
   * // 비동기 값도 정상 처리 (Promise resolve 후 저장)
   */
  private async executeSet(node: ASTNode, context: ExecutionContext): Promise<any> {
    const logger = context.logger || this.logger;
    const varName = node.variable;

    logger.debug('executeSet', { variable: varName, valueType: node.value?.type });

    const value = await this.evaluateExpression(node.value, context);

    logger.trace('executeSet evaluated', { variable: varName, value, type: typeof value });

    context.variables.set(varName, value);

    logger.debug('executeSet stored', { variable: varName, scopeVars: Array.from(context.variables.keys()) });

    return value;
  }

  /**
   * IF 문 실행 (비동기)
   */
  private async executeIf(node: ASTNode, context: ExecutionContext): Promise<any> {
    const condition = await this.evaluateExpression(node.condition, context);

    if (this.isTruthy(condition)) {
      for (const stmt of node.thenBody) {
        await this.executeNode(stmt, context);
        if (context.shouldReturn) break;
      }
    } else {
      for (const stmt of node.elseBody) {
        await this.executeNode(stmt, context);
        if (context.shouldReturn) break;
      }
    }

    return undefined;
  }

  /**
   * WHILE 루프 실행 (비동기)
   */
  private async executeWhile(node: ASTNode, context: ExecutionContext): Promise<any> {
    let result: any = undefined;

    while (this.isTruthy(await this.evaluateExpression(node.condition, context))) {
      for (const stmt of node.body) {
        result = await this.executeNode(stmt, context);
        if (context.shouldReturn) break;
      }

      if (context.shouldReturn) break;
    }

    return result;
  }

  /**
   * FOR 루프 실행: FOR var IN iterable (비동기)
   */
  private async executeFor(node: ASTNode, context: ExecutionContext): Promise<any> {
    const iterable = context.variables.get(node.iterable);

    if (!Array.isArray(iterable)) {
      throw new Error(`${node.iterable} is not an array`);
    }

    let result: any = undefined;

    for (const value of iterable) {
      context.variables.set(node.variable, value);

      for (const stmt of node.body) {
        result = await this.executeNode(stmt, context);
        if (context.shouldReturn) break;
      }

      if (context.shouldReturn) break;
    }

    return result;
  }

  /**
   * RETURN 문 실행 (비동기)
   *
   * 함수에서 값을 반환합니다.
   * - RETURN 표현식을 평가
   * - 반환값을 context.returnValue에 저장
   * - shouldReturn 플래그 설정하여 콜 스택 언와인딩 신호
   * - 콜 스택이 이 플래그를 감지하면 함수 내 루프 중단
   *
   * @param node - ReturnStatement 노드 { type: 'ReturnStatement', value: {...} }
   * @param context - 현재 함수의 컨텍스트
   * @returns 반환 값
   *
   * @example
   * // RETURN x + y
   * await executeReturn(
   *   { type: 'ReturnStatement', value: { type: 'BinaryOp', ... } },
   *   context
   * );
   * // context.returnValue = x+y
   * // context.shouldReturn = true  (플래그 설정)
   *
   * // RETURN AWAIT promise
   * // 비동기 값도 정상 처리
   *
   * ⚠️ Context 격리 주의:
   * - ASYNC FUNC에서는 localContext 사용
   * - localContext.shouldReturn = true로 인해 함수 루프 중단
   * - 함수가 반환되면 globalContext로 복귀
   */
  private async executeReturn(node: ASTNode, context: ExecutionContext): Promise<any> {
    const logger = context.logger || this.logger;

    logger.debug('executeReturn', { valueType: node.value?.type, scopeVars: Array.from(context.variables.keys()) });

    const value = await this.evaluateExpression(node.value, context);

    logger.trace('executeReturn evaluated', { value, type: typeof value });

    context.returnValue = value;
    context.shouldReturn = true;

    logger.debug('executeReturn flagged', { shouldReturn: true, returnValue: value });

    return value;
  }

  /**
   * PRINT 문 실행 (비동기)
   */
  private async executePrint(node: ASTNode, context: ExecutionContext): Promise<any> {
    const values = await Promise.all(node.args.map((arg: any) => this.evaluateExpression(arg, context)));
    const output = values.map((v: any) => {
      // 객체인 경우 JSON 형식으로 표시
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        return JSON.stringify(v);
      }
      // 배열인 경우 JSON 형식으로 표시
      if (Array.isArray(v)) {
        return JSON.stringify(v);
      }
      // 기본값: 문자열로 변환
      return String(v);
    }).join(' ');
    console.log(output);
    return undefined;
  }

  /**
   * TRY 문 실행 (비동기)
   */
  private async executeTry(node: ASTNode, context: ExecutionContext): Promise<any> {
    try {
      // TRY 블록 실행
      for (const stmt of node.tryBody) {
        await this.executeNode(stmt, context);
        if (context.shouldReturn) break;
      }
    } catch (error: any) {
      // CATCH 블록 실행
      if (node.catchBody && node.catchVar) {
        // 예외 변수를 컨텍스트에 바인딩 (문자열로 저장)
        const exceptionName = node.catchVar;
        const exceptionMsg = error instanceof Error ? error.message : String(error);
        context.variables.set(exceptionName, exceptionMsg);

        for (const stmt of node.catchBody) {
          await this.executeNode(stmt, context);
          if (context.shouldReturn) break;
        }
      } else {
        throw error;
      }
    } finally {
      // FINALLY 블록 실행 (있으면)
      if (node.finallyBody) {
        for (const stmt of node.finallyBody) {
          await this.executeNode(stmt, context);
          if (context.shouldReturn) break;
        }
      }
    }

    return undefined;
  }

  /**
   * THROW 문 실행 (예외 발생)
   */
  private async executeThrow(node: ASTNode, context: ExecutionContext): Promise<any> {
    const value = await this.evaluateExpression(node.value, context);
    const errorMessage = typeof value === 'string' ? value : JSON.stringify(value);
    throw new Error(errorMessage);
  }

  /**
   * 표현식 평가 (Handler Pattern)
   *
   * 각 expression 타입별로 별도 메서드에서 처리
   * - AwaitExpression: evaluateAwaitExpression
   * - Identifier: evaluateIdentifier
   * - BinaryOp: evaluateBinaryOp (기존)
   * - FunctionCallExpr: evaluateFunctionCall
   * - 등등
   *
   * @param expr - 평가할 expression 노드
   * @param context - 실행 컨텍스트 (변수 스코프)
   * @returns 표현식 평가 결과
   *
   * @throws {Error} 정의되지 않은 변수 또는 알 수 없는 expression 타입
   *
   * @example
   * // Identifier 평가
   * const value = await evaluateExpression({ type: 'Identifier', name: 'x' }, ctx);
   *
   * // BinaryOp 평가
   * const result = await evaluateExpression(
   *   { type: 'BinaryOp', operator: '+', left: {type:'NumberLiteral',value:10}, right: {...} },
   *   ctx
   * );
   */
  private async evaluateExpression(expr: any, context: ExecutionContext): Promise<any> {
    if (!expr) return undefined;

    const exprType = expr.type;
    const logger = context.logger || this.logger;

    // Handler pattern: expression 타입별 처리
    switch (exprType) {
      case 'AwaitExpression':
        return this.evaluateAwaitExpression(expr, context);

      case 'NumberLiteral':
      case 'StringLiteral':
      case 'BoolLiteral':
        return this.evaluateLiteral(expr, context);

      case 'Identifier':
        return this.evaluateIdentifier(expr, context);

      case 'ArrayLiteral':
        return this.evaluateArrayLiteral(expr, context);

      case 'BinaryOp':
        return this.evaluateBinaryOp(expr, context);

      case 'UnaryOp':
        return this.evaluateUnaryOp(expr, context);

      case 'FunctionCallExpr':
        return this.callFunction(expr.funcName, expr.args, context);

      case 'MethodCallExpr':
        return this.callMethod(expr.instance, expr.methodName, expr.args, context);

      case 'NewExpr':
        return this.createObject(expr.className, expr.args, context);

      default:
        logger.warn(`Unknown expression type: ${exprType}`, { expr });
        return undefined;
    }
  }

  /**
   * AWAIT 표현식 평가
   * Promise를 await하여 결과 반환
   *
   * @param expr - AwaitExpression 노드 { type: 'AwaitExpression', argument: ... }
   * @param context - 실행 컨텍스트
   * @returns await된 값
   */
  private async evaluateAwaitExpression(expr: any, context: ExecutionContext): Promise<any> {
    const promise = await this.evaluateExpression(expr.argument, context);
    if (promise instanceof Promise) {
      return await promise;
    }
    return promise;
  }

  /**
   * 리터럴 평가 (Number, String, Bool)
   *
   * @param expr - 리터럴 노드
   * @param context - 실행 컨텍스트 (사용 안 함)
   * @returns 리터럴 값
   */
  private evaluateLiteral(expr: any, context: ExecutionContext): any {
    return expr.value;
  }

  /**
   * 식별자(변수) 평가
   * 변수가 정의되었는지 확인하고 값 반환
   *
   * @param expr - Identifier 노드 { type: 'Identifier', name: 'varName' }
   * @param context - 실행 컨텍스트
   * @returns 변수의 값
   *
   * @throws {Error} 변수가 정의되지 않은 경우
   *
   * @example
   * // x = 10인 경우
   * const value = await evaluateIdentifier({ type: 'Identifier', name: 'x' }, ctx);
   * // value === 10
   *
   * // y가 정의되지 않은 경우
   * const value = await evaluateIdentifier({ type: 'Identifier', name: 'y' }, ctx);
   * // throws Error: "Undefined variable: y (available: x)"
   */
  private evaluateIdentifier(expr: any, context: ExecutionContext): any {
    const varName = expr.name;

    // ✅ Map.has()로 변수 존재 여부 확인 (undefined 값과 구분)
    if (!context.variables.has(varName)) {
      const available = Array.from(context.variables.keys()).join(', ');
      const availMsg = available ? ` (available: ${available})` : ' (no variables defined)';
      throw new Error(`Undefined variable: ${varName}${availMsg}`);
    }

    return context.variables.get(varName);
  }

  /**
   * 배열 리터럴 평가
   * 모든 요소를 병렬로 평가
   *
   * @param expr - ArrayLiteral 노드 { type: 'ArrayLiteral', elements: [...] }
   * @param context - 실행 컨텍스트
   * @returns 평가된 배열
   */
  private async evaluateArrayLiteral(expr: any, context: ExecutionContext): Promise<any[]> {
    return await Promise.all(
      expr.elements.map((e: any) => this.evaluateExpression(e, context))
    );
  }

  /**
   * 이항 연산 평가 (비동기)
   */
  private async evaluateBinaryOp(expr: any, context: ExecutionContext): Promise<any> {
    const left = await this.evaluateExpression(expr.left, context);
    const right = await this.evaluateExpression(expr.right, context);

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
   * 단항 연산 평가 (비동기)
   */
  private async evaluateUnaryOp(expr: any, context: ExecutionContext): Promise<any> {
    const operand = await this.evaluateExpression(expr.operand, context);

    if (expr.operator === 'NOT' || expr.operator === '!') {
      return !this.isTruthy(operand);
    }

    if (expr.operator === '-') {
      return -operand;
    }

    throw new Error(`Unknown unary operator: ${expr.operator}`);
  }

  /**
   * 함수 호출 (비동기)
   */
  private async callFunction(funcName: string, args: any[], context: ExecutionContext): Promise<any> {
    // 내장 함수
    if (funcName === 'print' || funcName === 'println') {
      const values = args.map(arg => this.evaluateExpression(arg, context));
      console.log(...values);
      return undefined;
    }

    if (funcName === 'len') {
      const arr = await this.evaluateExpression(args[0], context);
      return Array.isArray(arr) ? arr.length : String(arr).length;
    }

    // 수학 함수들
    if (funcName === 'floor') {
      const n = await this.evaluateExpression(args[0], context);
      return Math.floor(n);
    }

    if (funcName === 'ceil') {
      const n = await this.evaluateExpression(args[0], context);
      return Math.ceil(n);
    }

    if (funcName === 'round') {
      const n = await this.evaluateExpression(args[0], context);
      return Math.round(n);
    }

    // 문자열 함수들
    if (funcName === 'upper') {
      const str = String(await this.evaluateExpression(args[0], context));
      return str.toUpperCase();
    }

    if (funcName === 'lower') {
      const str = String(await this.evaluateExpression(args[0], context));
      return str.toLowerCase();
    }

    if (funcName === 'length') {
      const str = String(await this.evaluateExpression(args[0], context));
      return str.length;
    }

    if (funcName === 'trim') {
      const str = String(await this.evaluateExpression(args[0], context));
      return str.trim();
    }

    if (funcName === 'contains') {
      const str = String(await this.evaluateExpression(args[0], context));
      const search = String(await this.evaluateExpression(args[1], context));
      return str.includes(search);
    }

    if (funcName === 'substr') {
      const str = String(await this.evaluateExpression(args[0], context));
      const start = await this.evaluateExpression(args[1], context);
      const len = await this.evaluateExpression(args[2], context);
      return str.substr(start, len);
    }

    if (funcName === 'replace') {
      const str = String(await this.evaluateExpression(args[0], context));
      const search = String(await this.evaluateExpression(args[1], context));
      const replacement = String(await this.evaluateExpression(args[2], context));
      // Replace all occurrences using regex with global flag
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      return str.replace(regex, replacement);
    }

    if (funcName === 'split') {
      const str = String(await this.evaluateExpression(args[0], context));
      const delimiter = String(await this.evaluateExpression(args[1], context));
      return str.split(delimiter);
    }

    // 배열 함수들
    if (funcName === 'push') {
      const arr = await this.evaluateExpression(args[0], context);
      const item = await this.evaluateExpression(args[1], context);
      if (Array.isArray(arr)) {
        arr.push(item);
        return arr;
      }
      throw new Error(`push: first argument must be an array`);
    }

    if (funcName === 'pop') {
      const arr = await this.evaluateExpression(args[0], context);
      if (Array.isArray(arr)) {
        return arr.pop();
      }
      throw new Error(`pop: first argument must be an array`);
    }

    if (funcName === 'shift') {
      const arr = await this.evaluateExpression(args[0], context);
      if (Array.isArray(arr)) {
        return arr.shift();
      }
      throw new Error(`shift: first argument must be an array`);
    }

    if (funcName === 'unshift') {
      const arr = await this.evaluateExpression(args[0], context);
      const item = await this.evaluateExpression(args[1], context);
      if (Array.isArray(arr)) {
        arr.unshift(item);
        return arr;
      }
      throw new Error(`unshift: first argument must be an array`);
    }

    if (funcName === 'join') {
      const arr = await this.evaluateExpression(args[0], context);
      const delimiter = String(await this.evaluateExpression(args[1], context));
      if (Array.isArray(arr)) {
        return arr.join(delimiter);
      }
      throw new Error(`join: first argument must be an array`);
    }

    if (funcName === 'reverse') {
      const arr = await this.evaluateExpression(args[0], context);
      if (Array.isArray(arr)) {
        return arr.reverse();
      }
      throw new Error(`reverse: first argument must be an array`);
    }

    // JSON 함수들
    if (funcName === 'stringify') {
      const obj = await this.evaluateExpression(args[0], context);
      return JSON.stringify(obj);
    }

    if (funcName === 'parse') {
      const jsonStr = String(await this.evaluateExpression(args[0], context));
      try {
        return JSON.parse(jsonStr);
      } catch (e) {
        throw new Error(`JSON parse error: ${e}`);
      }
    }

    if (funcName === 'isValid') {
      const jsonStr = String(await this.evaluateExpression(args[0], context));
      try {
        JSON.parse(jsonStr);
        return true;
      } catch {
        return false;
      }
    }

    // Object 함수들
    if (funcName === 'keys') {
      const obj = await this.evaluateExpression(args[0], context);
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        return Object.keys(obj);
      }
      return [];
    }

    if (funcName === 'values') {
      const obj = await this.evaluateExpression(args[0], context);
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        return Object.values(obj);
      }
      return [];
    }

    if (funcName === 'entries') {
      const obj = await this.evaluateExpression(args[0], context);
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        return Object.entries(obj).map(([k, v]) => [k, v]);
      }
      return [];
    }

    if (funcName === 'merge') {
      const obj1 = await this.evaluateExpression(args[0], context);
      const obj2 = await this.evaluateExpression(args[1], context);
      return Object.assign({}, obj1, obj2);
    }

    if (funcName === 'clone') {
      const obj = await this.evaluateExpression(args[0], context);
      return JSON.parse(JSON.stringify(obj));
    }

    if (funcName === 'isEmpty') {
      const obj = await this.evaluateExpression(args[0], context);
      if (Array.isArray(obj)) {
        return obj.length === 0;
      }
      if (obj && typeof obj === 'object') {
        return Object.keys(obj).length === 0;
      }
      return String(obj).length === 0;
    }

    // Validation 함수들
    if (funcName === 'isString') {
      const val = await this.evaluateExpression(args[0], context);
      return typeof val === 'string';
    }

    if (funcName === 'isNumber') {
      const val = await this.evaluateExpression(args[0], context);
      return typeof val === 'number' && !isNaN(val);
    }

    if (funcName === 'isArray') {
      const val = await this.evaluateExpression(args[0], context);
      return Array.isArray(val);
    }

    if (funcName === 'isObject') {
      const val = await this.evaluateExpression(args[0], context);
      return val !== null && typeof val === 'object' && !Array.isArray(val);
    }

    if (funcName === 'isBoolean') {
      const val = await this.evaluateExpression(args[0], context);
      return typeof val === 'boolean';
    }

    if (funcName === 'isNull') {
      const val = await this.evaluateExpression(args[0], context);
      return val === null || val === undefined;
    }

    if (funcName === 'isDefined') {
      const val = await this.evaluateExpression(args[0], context);
      return val !== undefined && val !== null;
    }

    // DateTime 함수들
    if (funcName === 'now') {
      return Date.now();
    }

    if (funcName === 'timestamp') {
      return Math.floor(Date.now() / 1000);
    }

    if (funcName === 'getDay') {
      const date = new Date(await this.evaluateExpression(args[0], context));
      return date.getDay();
    }

    if (funcName === 'getMonth') {
      const date = new Date(await this.evaluateExpression(args[0], context));
      return date.getMonth() + 1; // JavaScript months are 0-indexed
    }

    if (funcName === 'getYear') {
      const date = new Date(await this.evaluateExpression(args[0], context));
      return date.getFullYear();
    }

    // Utils 함수들
    if (funcName === 'random') {
      return Math.random();
    }

    if (funcName === 'min') {
      const a = await this.evaluateExpression(args[0], context);
      const b = await this.evaluateExpression(args[1], context);
      return Math.min(a, b);
    }

    if (funcName === 'max') {
      const a = await this.evaluateExpression(args[0], context);
      const b = await this.evaluateExpression(args[1], context);
      return Math.max(a, b);
    }

    if (funcName === 'abs') {
      const n = await this.evaluateExpression(args[0], context);
      return Math.abs(n);
    }

    // Object 생성 및 관리 함수들
    if (funcName === 'Object') {
      // 빈 객체 생성
      return {};
    }

    if (funcName === 'Dict') {
      // 빈 객체 생성 (Object의 별칭)
      return {};
    }

    if (funcName === 'put') {
      // 객체에 key-value 쌍 추가: put(obj, key, value)
      const obj = await this.evaluateExpression(args[0], context);
      const key = String(await this.evaluateExpression(args[1], context));
      const value = await this.evaluateExpression(args[2], context);
      if (typeof obj === 'object' && obj !== null) {
        (obj as any)[key] = value;
        return obj;
      }
      throw new Error('put() requires an object as first argument');
    }

    if (funcName === 'get') {
      // 객체에서 값 읽기: get(obj, key)
      const obj = await this.evaluateExpression(args[0], context);
      const key = String(await this.evaluateExpression(args[1], context));
      if (typeof obj === 'object' && obj !== null) {
        return (obj as any)[key];
      }
      throw new Error('get() requires an object as first argument');
    }

    if (funcName === 'keys') {
      // 객체의 모든 키 반환: keys(obj)
      const obj = await this.evaluateExpression(args[0], context);
      if (typeof obj === 'object' && obj !== null) {
        return Object.keys(obj);
      }
      return [];
    }

    if (funcName === 'values') {
      // 객체의 모든 값 반환: values(obj)
      const obj = await this.evaluateExpression(args[0], context);
      if (typeof obj === 'object' && obj !== null) {
        return Object.values(obj);
      }
      return [];
    }

    if (funcName === 'type') {
      const val = await this.evaluateExpression(args[0], context);
      if (val === null) return 'null';
      if (Array.isArray(val)) return 'array';
      return typeof val;
    }

    // FileSystem 함수들
    if (funcName === 'exists') {
      const fs = require('fs');
      const path = String(await this.evaluateExpression(args[0], context));
      return fs.existsSync(path);
    }

    if (funcName === 'readFile') {
      const fs = require('fs');
      const path = String(await this.evaluateExpression(args[0], context));
      try {
        return fs.readFileSync(path, 'utf-8');
      } catch (e) {
        throw new Error(`Failed to read file: ${path}`);
      }
    }

    if (funcName === 'writeFile') {
      const fs = require('fs');
      const path = String(await this.evaluateExpression(args[0], context));
      const content = String(await this.evaluateExpression(args[1], context));
      try {
        fs.writeFileSync(path, content, 'utf-8');
        return true;
      } catch (e) {
        throw new Error(`Failed to write file: ${path}`);
      }
    }

    if (funcName === 'appendFile') {
      const fs = require('fs');
      const path = String(await this.evaluateExpression(args[0], context));
      const content = String(await this.evaluateExpression(args[1], context));
      try {
        fs.appendFileSync(path, content, 'utf-8');
        return true;
      } catch (e) {
        throw new Error(`Failed to append to file: ${path}`);
      }
    }

    if (funcName === 'deleteFile') {
      const fs = require('fs');
      const path = String(await this.evaluateExpression(args[0], context));
      try {
        fs.unlinkSync(path);
        return true;
      } catch (e) {
        throw new Error(`Failed to delete file: ${path}`);
      }
    }

    if (funcName === 'mkdir') {
      const fs = require('fs');
      const path = String(await this.evaluateExpression(args[0], context));
      try {
        if (!fs.existsSync(path)) {
          fs.mkdirSync(path, { recursive: true });
        }
        return true;
      } catch (e) {
        throw new Error(`Failed to create directory: ${path}`);
      }
    }

    if (funcName === 'listDir') {
      const fs = require('fs');
      const path = String(await this.evaluateExpression(args[0], context));
      try {
        return fs.readdirSync(path);
      } catch (e) {
        throw new Error(`Failed to list directory: ${path}`);
      }
    }

    // Regex 함수들
    if (funcName === 'test') {
      const pattern = String(await this.evaluateExpression(args[0], context));
      const str = String(await this.evaluateExpression(args[1], context));
      try {
        const regex = new RegExp(pattern);
        return regex.test(str);
      } catch (e) {
        throw new Error(`Invalid regex pattern: ${pattern}`);
      }
    }

    if (funcName === 'match') {
      const pattern = String(await this.evaluateExpression(args[0], context));
      const str = String(await this.evaluateExpression(args[1], context));
      try {
        const regex = new RegExp(pattern);
        const result = str.match(regex);
        return result ? result[0] : null;
      } catch (e) {
        throw new Error(`Invalid regex pattern: ${pattern}`);
      }
    }

    if (funcName === 'matchAll') {
      const pattern = String(await this.evaluateExpression(args[0], context));
      const str = String(await this.evaluateExpression(args[1], context));
      try {
        const regex = new RegExp(pattern, 'g');
        const matches: string[] = [];
        let match;
        while ((match = regex.exec(str)) !== null) {
          matches.push(match[0]);
        }
        return matches;
      } catch (e) {
        throw new Error(`Invalid regex pattern: ${pattern}`);
      }
    }

    if (funcName === 'regexReplace') {
      const pattern = String(await this.evaluateExpression(args[0], context));
      const str = String(await this.evaluateExpression(args[1], context));
      const replacement = String(await this.evaluateExpression(args[2], context));
      try {
        const regex = new RegExp(pattern);
        return str.replace(regex, replacement);
      } catch (e) {
        throw new Error(`Invalid regex pattern: ${pattern}`);
      }
    }

    if (funcName === 'regexReplaceAll') {
      const pattern = String(await this.evaluateExpression(args[0], context));
      const str = String(await this.evaluateExpression(args[1], context));
      const replacement = String(await this.evaluateExpression(args[2], context));
      try {
        const regex = new RegExp(pattern, 'g');
        return str.replace(regex, replacement);
      } catch (e) {
        throw new Error(`Invalid regex pattern: ${pattern}`);
      }
    }

    if (funcName === 'regexSplit') {
      const pattern = String(await this.evaluateExpression(args[0], context));
      const str = String(await this.evaluateExpression(args[1], context));
      try {
        const regex = new RegExp(pattern);
        return str.split(regex);
      } catch (e) {
        throw new Error(`Invalid regex pattern: ${pattern}`);
      }
    }

    // HTTP 함수들 - Promise 반환
    if (funcName === 'httpGet') {
      const url = String(await this.evaluateExpression(args[0], context));
      return new Promise((resolve, reject) => {
        try {
          const https = require('https');
          const http = require('http');

          const protocol = url.startsWith('https') ? https : http;
          let data = '';

          const request = protocol.get(url, (response: any) => {
            response.on('data', (chunk: any) => { data += chunk; });
            response.on('end', () => {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                // JSON 파싱 실패 시 원본 문자열 반환
                resolve(data);
              }
            });
          });

          request.on('error', (e: any) => {
            reject(new Error(`HTTP GET failed: ${e.message}`));
          });
        } catch (e: any) {
          reject(new Error(`HTTP GET error: ${e.message}`));
        }
      });
    }

    if (funcName === 'httpPost') {
      const url = String(await this.evaluateExpression(args[0], context));
      const data = String(await this.evaluateExpression(args[1], context));

      return new Promise((resolve, reject) => {
        try {
          const https = require('https');
          const http = require('http');
          const urlModule = require('url');

          const protocol = url.startsWith('https') ? https : http;
          const parsedUrl = new URL(url);

          const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': data.length,
            },
          };

          let responseData = '';
          const request = protocol.request(options, (response: any) => {
            response.on('data', (chunk: any) => { responseData += chunk; });
            response.on('end', () => {
              try {
                resolve(JSON.parse(responseData));
              } catch (e) {
                resolve(responseData);
              }
            });
          });

          request.on('error', (e: any) => {
            reject(new Error(`HTTP POST failed: ${e.message}`));
          });

          request.write(data);
          request.end();
        } catch (e: any) {
          reject(new Error(`HTTP POST error: ${e.message}`));
        }
      });
    }

    // Promise.all - 모든 Promise를 동시에 대기
    if (funcName === 'Promise.all') {
      const promises = await this.evaluateExpression(args[0], context);
      if (!Array.isArray(promises)) {
        throw new Error('Promise.all requires an array argument');
      }
      try {
        const results = await Promise.all(promises);
        return results;
      } catch (error: any) {
        throw new Error(`Promise.all failed: ${error.message}`);
      }
    }

    // Promise.race - 가장 먼저 완료된 Promise 반환
    if (funcName === 'Promise.race') {
      const promises = await this.evaluateExpression(args[0], context);
      if (!Array.isArray(promises)) {
        throw new Error('Promise.race requires an array argument');
      }
      try {
        const result = await Promise.race(promises);
        return result;
      } catch (error: any) {
        throw new Error(`Promise.race failed: ${error.message}`);
      }
    }

    // Promise.resolve - 값을 resolved Promise로 변환
    if (funcName === 'Promise.resolve') {
      const value = await this.evaluateExpression(args[0], context);
      return Promise.resolve(value);
    }

    // Promise.reject - rejected Promise 생성
    if (funcName === 'Promise.reject') {
      const reason = args[0] ? await this.evaluateExpression(args[0], context) : 'Promise rejected';
      return Promise.reject(new Error(String(reason)));
    }

    // delay/setTimeout - 지정된 시간 후 완료되는 Promise
    if (funcName === 'delay' || funcName === 'setTimeout') {
      const ms = await this.evaluateExpression(args[0], context);
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(undefined);
        }, Number(ms));
      });
    }

    if (funcName === 'encodeURL') {
      const str = String(await this.evaluateExpression(args[0], context));
      return encodeURIComponent(str);
    }

    if (funcName === 'decodeURL') {
      const str = String(await this.evaluateExpression(args[0], context));
      return decodeURIComponent(str);
    }

    if (funcName === 'buildQuery') {
      const params = await this.evaluateExpression(args[0], context);
      if (typeof params !== 'object' || params === null) {
        return '';
      }
      const pairs = [];
      for (const [key, value] of Object.entries(params)) {
        pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
      }
      return pairs.join('&');
    }

    if (funcName === 'parseQuery') {
      const queryStr = String(await this.evaluateExpression(args[0], context));
      const result: any = {};
      if (queryStr.trim() === '') {
        return result;
      }
      const pairs = queryStr.split('&');
      for (const pair of pairs) {
        const [key, value] = pair.split('=');
        if (key) {
          result[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
        }
      }
      return result;
    }

    // 사용자 정의 함수
    const funcDef = context.functions.get(funcName);
    if (!funcDef) {
      throw new Error(`Undefined function: ${funcName}`);
    }

    // v10+: ASYNC FUNC 지원
    // 비동기 함수이면 Promise로 감싸기
    if (funcDef.isAsync) {
      return this.executeAsyncFunction(funcDef, args, context);
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
      const argValue = await this.evaluateExpression(args[i], context);
      localContext.variables.set(paramName, argValue);
    }

    // 함수 본체 실행
    for (const stmt of funcDef.body) {
      await this.executeNode(stmt, localContext);
      if (localContext.shouldReturn) {
        return localContext.returnValue;
      }
    }

    return undefined;
  }

  /**
   * 비동기 함수 실행 (ASYNC FUNC)
   *
   * Promise를 반환하여 AWAIT과 함께 사용
   *
   * 📋 Context 격리 계약:
   * ┌─────────────────────────────────────────────────────────────────┐
   * │ localContext는 함수의 로컬 스코프를 나타냅니다.                │
   * │ - variables: 새로운 Map (글로벌 변수는 복사 X, 로컬 변수만)     │
   * │ - functions: 글로벌 레지스트리 공유 (읽기 전용)               │
   * │ - classes: 글로벌 레지스트리 공유 (읽기 전용)                 │
   * │ - modules: 글로벌 모듈 저장소 공유                             │
   * │ - shouldReturn: 함수 반환 플래그                               │
   * │ - logger: 디버깅 로거                                          │
   * │                                                                │
   * │ ✅ 올바른 흐름:                                                 │
   * │ 1. 인자 평가 ← 외부 context 사용 (글로벌 변수 접근)           │
   * │ 2. 로컬 스코프 생성 ← 빈 variables Map                        │
   * │ 3. 파라미터 바인딩 ← localContext에만 저장                     │
   * │ 4. 함수 본체 실행 ← 항상 localContext 사용                     │
   * │ 5. RETURN 처리 ← localContext.returnValue 반환                 │
   * └─────────────────────────────────────────────────────────────────┘
   *
   * @param funcDef - 함수 정의 { name, params, body, isAsync }
   * @param args - 함수 호출 인자 (unevaluated expressions)
   * @param context - 함수 호출 시점의 컨텍스트 (글로벌)
   * @returns Promise<반환값>
   *
   * @throws {Error} 함수 본체 실행 중 에러 발생 시
   *
   * @example
   * // ASYNC FUNC wait() { SET x = AWAIT delay(500); RETURN x; }
   * // 호출: AWAIT wait()
   * const promise = executeAsyncFunction(waitFuncDef, [], globalContext);
   * const result = await promise;  // result = undefined (delay returns undefined)
   */
  private executeAsyncFunction(funcDef: any, args: any[], context: ExecutionContext): Promise<any> {
    return (async () => {
      const logger = context.logger || this.logger;

      logger.debug('executeAsyncFunction', { funcName: funcDef.name, argCount: args.length });

      // ✅ 새 로컬 컨텍스트 생성 (비어있는 상태로 시작)
      const localContext: ExecutionContext = {
        variables: new Map(),  // ← 비어있음! 글로벌 변수 복사 X
        functions: context.functions,  // ← 글로벌 함수 레지스트리 공유
        classes: context.classes,  // ← 글로벌 클래스 레지스트리 공유
        modules: context.modules,  // ← 모듈 저장소 공유
        shouldReturn: false,
        logger,  // ← 로거 할당
      };

      logger.debug('executeAsyncFunction localContext created', { localVars: 'empty' });

      // 파라미터 바인딩
      // ✅ 인자는 외부 context(글로벌)로 평가하지만,
      //    결과는 localContext(함수 로컬)에 저장
      for (let i = 0; i < funcDef.params.length; i++) {
        const paramName = funcDef.params[i];
        const argValue = await this.evaluateExpression(args[i], context);  // ← 외부 context
        localContext.variables.set(paramName, argValue);  // ← 로컬에 저장
        logger.trace('executeAsyncFunction param bound', { paramName, value: argValue });
      }

      logger.debug('executeAsyncFunction params bound', { params: funcDef.params, localVars: Array.from(localContext.variables.keys()) });

      // 함수 본체 실행
      // ✅ 항상 localContext 사용 (모든 변수는 로컬 스코프에서만 접근)
      for (const stmt of funcDef.body) {
        await this.executeNode(stmt, localContext);  // ← localContext만 사용
        if (localContext.shouldReturn) {
          logger.debug('executeAsyncFunction returning', { returnValue: localContext.returnValue });
          return localContext.returnValue;
        }
      }

      logger.debug('executeAsyncFunction completed', { implicitReturn: undefined });
      return undefined;
    })();
  }

  /**
   * 메서드 호출 (또는 모듈 함수 호출)
   * 예: math.sqrt(16) 또는 obj.method()
   */
  private async callMethod(instanceName: string, methodName: string, args: any[], context: ExecutionContext): Promise<any> {
    // Promise 정적 메서드 처리
    if (instanceName === 'Promise') {
      if (methodName === 'all') {
        const promises = await this.evaluateExpression(args[0], context);
        if (!Array.isArray(promises)) {
          throw new Error('Promise.all requires an array argument');
        }
        try {
          const results = await Promise.all(promises);
          return results;
        } catch (error: any) {
          throw new Error(`Promise.all failed: ${error.message}`);
        }
      }

      if (methodName === 'race') {
        const promises = await this.evaluateExpression(args[0], context);
        if (!Array.isArray(promises)) {
          throw new Error('Promise.race requires an array argument');
        }
        try {
          const result = await Promise.race(promises);
          return result;
        } catch (error: any) {
          throw new Error(`Promise.race failed: ${error.message}`);
        }
      }

      if (methodName === 'resolve') {
        const value = await this.evaluateExpression(args[0], context);
        return Promise.resolve(value);
      }

      if (methodName === 'reject') {
        const reason = args[0] ? await this.evaluateExpression(args[0], context) : 'Promise rejected';
        return Promise.reject(new Error(String(reason)));
      }

      throw new Error(`Unknown Promise method: ${methodName}`);
    }

    // 먼저 모듈에서 찾기
    const module = context.modules.get(instanceName);
    if (module && module[methodName]) {
      // 모듈의 함수 호출
      const evalArgs = await Promise.all(args.map(arg => this.evaluateExpression(arg, context)));
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
  private async createObject(className: string, _args: any[], context: ExecutionContext): Promise<any> {
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
  private async executeImport(node: ASTNode, context: ExecutionContext): Promise<any> {
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
  private async loadModule(modulePath: string, moduleName: string): Promise<any> {
    try {
      const fs = require('fs');

      // 특별 모듈 처리: regex (네이밍 충돌 방지)
      if (moduleName === 'regex') {
        return {
          test: (pattern: string, str: string) => {
            try {
              const regex = new RegExp(pattern);
              return regex.test(str);
            } catch (e) {
              throw new Error(`Invalid regex pattern: ${pattern}`);
            }
          },
          match: (pattern: string, str: string) => {
            try {
              const regex = new RegExp(pattern);
              const result = str.match(regex);
              return result ? result[0] : null;
            } catch (e) {
              throw new Error(`Invalid regex pattern: ${pattern}`);
            }
          },
          matchAll: (pattern: string, str: string) => {
            try {
              const regex = new RegExp(pattern, 'g');
              const result = str.match(regex);
              return result || [];
            } catch (e) {
              throw new Error(`Invalid regex pattern: ${pattern}`);
            }
          },
          regexReplace: (pattern: string, str: string, replacement: string) => {
            try {
              const regex = new RegExp(pattern);
              return str.replace(regex, replacement);
            } catch (e) {
              throw new Error(`Invalid regex pattern: ${pattern}`);
            }
          },
          regexReplaceAll: (pattern: string, str: string, replacement: string) => {
            try {
              const regex = new RegExp(pattern, 'g');
              return str.replace(regex, replacement);
            } catch (e) {
              throw new Error(`Invalid regex pattern: ${pattern}`);
            }
          },
          regexSplit: (pattern: string, str: string) => {
            try {
              const regex = new RegExp(pattern);
              return str.split(regex);
            } catch (e) {
              throw new Error(`Invalid regex pattern: ${pattern}`);
            }
          }
        };
      }

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
