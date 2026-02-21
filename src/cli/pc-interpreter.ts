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
  private loopStack: number[] = []; // WHILE 시작 위치 스택 (v3.3)
  private loopDepthStack: number[] = []; // 루프 깊이 스택 (v3.3 Nested Loop)
  private debugLog: string[] = [];
  private sourceAST: ASTNode | null = null; // 전체 AST 저장 (v3.2 Exit Boundary용)
  private indentLevel: number = 0; // v3.3: 들여쓰기 레벨

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
    this.sourceAST = { type: 'Program', statements }; // v3.2: AST 저장

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
        // v3.3: 루프 시작/재진입 시 처리
        const isFirstEntry = !this.loopStack.includes(this.pc);

        if (isFirstEntry) {
          // 루프 첫 진입: 스택에 저장
          this.loopStack.push(this.pc);
          this.loopDepthStack.push(this.indentLevel);
          this.indentLevel++;
          this.log(`[WHILE] PC=${this.pc} (Loop Head, Depth=${this.loopDepthStack.length - 1})`);
        } else {
          // 루프 재진입 (점프 백)
          this.log(`[WHILE] PC=${this.pc} (Loop Reenter, Depth=${this.loopDepthStack.length - 1})`);
        }

        // 조건 평가
        const condition = this.eval(stmt.condition);
        this.log(`[CONDITION] (${JSON.stringify(stmt.condition)}) = ${condition}`);

        if (condition) {
          // TRUE: 루프 바디 실행
          this.log(`[BRANCH] TRUE → 루프 바디 실행`);

          // 루프 바디 실행 (모든 문장을 eval()로 처리 - 중첩 루프 포함)
          if (stmt.body.type === 'BlockStatement') {
            for (const bodyStmt of stmt.body.statements) {
              // v3.3: 중첩 루프도 eval()로 재귀 처리
              // (중첩 루프는 다른 statement 배열에 있으므로)
              this.eval(bodyStmt);
            }
          } else {
            this.eval(stmt.body);
          }

          // 루프 바디 끝: PC를 WHILE 위치로 복원 (최상위 루프만)
          this.log(`[JUMP BACK] PC=${this.pc}로 복원 (Loop Head로 회귀)`);
          return this.pc; // 같은 PC로 다시 실행
        } else {
          // FALSE: 루프 탈출
          this.log(`[BRANCH] FALSE → EXIT STRATEGY 시작 (Depth=${this.loopDepthStack.length - 1})`);
          this.log(`[SKIPPING] 루프 바디 전체 건너뜀 (Block: ${JSON.stringify(stmt.body.type)})`);

          if (stmt.body.type === 'BlockStatement') {
            const bodyStmtCount = stmt.body.statements.length;
            this.log(`[EXIT BOUNDARY] 루프 바디: ${bodyStmtCount}개 문장 스킵 확인`);
            this.findExitBoundary(stmt, statements);
          }

          this.log(`[EXIT] 다음 PC(${this.pc + 1})로 점프 (Loop 탈출 완료)`);

          // 루프 탈출: 스택에서 제거
          this.indentLevel--;
          this.loopDepthStack.pop();
          this.loopStack.pop();

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

      case 'WhileStatement': {
        // v3.3: 중첩 루프 처리 (eval 기반)
        this.indentLevel++;
        this.log(`[WHILE] Nested Loop (Depth=${this.indentLevel - 1})`);

        let result = null;
        while (this.eval(node.condition)) {
          this.log(`    [CONDITION] = true`);
          result = this.eval(node.body);
        }

        this.log(`[WHILE END] (Depth=${this.indentLevel - 1})`);
        this.indentLevel--;
        return result;
      }

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
   * 디버그 로그 (v3.3: 들여쓰기 지원)
   */
  private log(msg: string): void {
    const indent = '    '.repeat(this.indentLevel);
    const formattedMsg = indent + msg;
    this.debugLog.push(formattedMsg);
    console.error(formattedMsg); // stderr로 출력 (결과와 분리)
  }

  /**
   * 모든 로그 반환
   */
  public getLogs(): string[] {
    return this.debugLog;
  }

  /**
   * v3.2: Exit Boundary 탐색
   * 루프 바디의 블록 구조를 분석하여 정확한 끝 위치 계산
   */
  private findExitBoundary(stmt: ASTNode, statements: ASTNode[]): number {
    // BlockStatement 내 문장 개수로 스킵 범위 계산
    if (stmt.type === 'WhileStatement' && stmt.body.type === 'BlockStatement') {
      const bodyStmts = stmt.body.statements;
      // 다음 PC = 현재 PC + 1
      // (현재는 WhileStatement가 하나의 statement이므로)
      this.log(`[BOUNDARY SCAN] 블록 내 ${bodyStmts.length}개 statement 분석 완료`);
      return this.pc + 1; // 루프 다음 statement
    }
    return this.pc + 1;
  }
}
