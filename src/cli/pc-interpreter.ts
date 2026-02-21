/**
 * PC (Program Counter) 기반 Interpreter - v3.1
 *
 * while 루프의 "되돌아가는 행동" 구현
 * - PC: 현재 실행 중인 statement의 인덱스
 * - Loop Head: WHILE 시작 위치 저장
 * - Loop Tail: 닫는 괄호 탐색 및 워프
 */

export interface ASTNode {
  type: string;
  [key: string]: any;
}

export class PCInterpreter {
  private variables: Map<string, any> = new Map();
  private output: string[] = [];
  private pc: number = 0; // Program Counter
  private loopStack: number[] = []; // WHILE 시작 위치 스택
  private debugLog: string[] = [];

  constructor() {
    this.variables.set('println', this.println.bind(this));
  }

  /**
   * 프로그램 실행 (PC 기반)
   */
  public execute(ast: ASTNode): any {
    if (!ast) return null;

    // Program 노드 처리
    if (ast.type === 'Program') {
      return this.executeProgram(ast.statements);
    }

    // 단일 statement
    return this.executeProgram([ast]);
  }

  /**
   * Statement 배열을 PC로 순회 실행
   */
  private executeProgram(statements: ASTNode[]): any {
    this.pc = 0;

    while (this.pc < statements.length) {
      const stmt = statements[this.pc];
      const nextPC = this.executeStatement(stmt, statements);

      if (nextPC === undefined) {
        this.pc++;
      } else {
        this.pc = nextPC;
      }
    }

    return null;
  }

  /**
   * 개별 Statement 실행
   * 반환값: undefined (다음 문) or number (특정 PC로 이동)
   */
  private executeStatement(stmt: ASTNode, statements: ASTNode[]): number | undefined {
    switch (stmt.type) {
      case 'VariableDeclaration': {
        const val = this.eval(stmt.value);
        this.variables.set(stmt.name, val);
        return undefined; // 다음 문으로
      }

      case 'Assignment': {
        const val = this.eval(stmt.value);
        this.variables.set(stmt.name, val);
        return undefined;
      }

      case 'WhileStatement': {
        // [LOG] WHILE 발견
        this.log(`[WHILE] PC=${this.pc} (Loop Head)`);

        // 조건 평가
        const condition = this.eval(stmt.condition);
        this.log(`[CONDITION] (${JSON.stringify(stmt.condition)}) = ${condition}`);

        if (condition) {
          // TRUE: 루프 바디 실행
          this.log(`[BRANCH] TRUE → 루프 바디 실행`);

          // 루프 바디 실행
          if (stmt.body.type === 'BlockStatement') {
            for (const bodyStmt of stmt.body.statements) {
              this.eval(bodyStmt);
            }
          } else {
            this.eval(stmt.body);
          }

          // 루프 바디 끝: PC를 WHILE 위치로 복원
          this.log(`[JUMP BACK] PC를 ${this.pc}로 복원 (Loop Head로 회귀)`);
          return this.pc; // 같은 PC로 다시 실행
        } else {
          // FALSE: 루프 탈출
          this.log(`[BRANCH] FALSE → 루프 탈출 (다음 문으로)`);
          return undefined; // 다음 문으로
        }
      }

      case 'IfStatement': {
        const cond = this.eval(stmt.condition);
        if (cond) {
          this.eval(stmt.thenBranch);
        } else if (stmt.elseBranch) {
          this.eval(stmt.elseBranch);
        }
        return undefined;
      }

      default: {
        this.eval(stmt);
        return undefined;
      }
    }
  }

  /**
   * AST 평가 (원래의 eval 로직)
   */
  private eval(node: ASTNode): any {
    if (!node) return null;

    switch (node.type) {
      case 'NumberLiteral':
        return node.value;

      case 'StringLiteral':
        return node.value;

      case 'BooleanLiteral':
        return node.value;

      case 'Identifier':
        return this.variables.get(node.name);

      case 'VariableDeclaration': {
        const val = this.eval(node.value);
        this.variables.set(node.name, val);
        return val;
      }

      case 'Assignment': {
        const val = this.eval(node.value);
        this.variables.set(node.name, val);
        return val;
      }

      case 'ArrayLiteral':
        return node.elements.map((e: ASTNode) => this.eval(e));

      case 'BinaryOp':
        return this.evalBinaryOp(node);

      case 'UnaryOp':
        return this.evalUnaryOp(node);

      case 'CallExpression':
        return this.evalCall(node);

      case 'IndexExpression':
        const obj = this.eval(node.object);
        const idx = this.eval(node.index);
        if (Array.isArray(obj)) {
          return obj[idx];
        }
        throw new Error(`Cannot index non-array value`);

      case 'BlockStatement':
        let blockResult = null;
        for (const stmt of node.statements) {
          blockResult = this.eval(stmt);
        }
        return blockResult;

      default:
        return null;
    }
  }

  /**
   * 이항 연산
   */
  private evalBinaryOp(node: ASTNode): any {
    const left = this.eval(node.left);
    const right = this.eval(node.right);
    const op = node.operator;

    if (op === '+') return left + right;
    if (op === '-') return left - right;
    if (op === '*') return left * right;
    if (op === '/') return Math.floor(left / right);
    if (op === '%') return left % right;

    if (op === '==') return left === right ? 1 : 0;
    if (op === '!=') return left !== right ? 1 : 0;
    if (op === '<') return left < right ? 1 : 0;
    if (op === '>') return left > right ? 1 : 0;
    if (op === '<=') return left <= right ? 1 : 0;
    if (op === '>=') return left >= right ? 1 : 0;

    if (op === '&&') return left && right;
    if (op === '||') return left || right;

    throw new Error(`Unknown operator: ${op}`);
  }

  /**
   * 단항 연산
   */
  private evalUnaryOp(node: ASTNode): any {
    const operand = this.eval(node.operand);
    const op = node.operator;

    if (op === '-') return -operand;
    if (op === '!') return !operand ? 1 : 0;

    throw new Error(`Unknown unary operator: ${op}`);
  }

  /**
   * 함수 호출
   */
  private evalCall(node: ASTNode): any {
    let calleeName: string;

    if (node.callee.type === 'Identifier') {
      calleeName = node.callee.name;
    } else {
      throw new Error('Only identifier function calls supported');
    }

    const args = node.arguments.map((a: ASTNode) => this.eval(a));
    const func = this.variables.get(calleeName);

    if (typeof func === 'function') {
      return func(...args);
    }

    throw new Error(`${calleeName} is not a function`);
  }

  /**
   * 내장 함수: println
   */
  private println(...args: any[]): any {
    const output = args.map(arg => {
      if (Array.isArray(arg)) {
        return '[' + arg.join(', ') + ']';
      }
      return String(arg);
    }).join(' ');

    this.output.push(output);
    return null;
  }

  /**
   * 출력 결과
   */
  public getOutput(): string {
    if (this.output.length === 0) return '';
    const last = this.output[this.output.length - 1];
    this.output.pop();
    return last;
  }

  /**
   * 디버그 로그
   */
  private log(msg: string): void {
    this.debugLog.push(msg);
    console.error(msg); // stderr로 출력 (결과와 분리)
  }

  /**
   * 모든 로그 반환
   */
  public getLogs(): string[] {
    return this.debugLog;
  }
}
