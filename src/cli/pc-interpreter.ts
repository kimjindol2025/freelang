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
  private loopBodyExecutionCount: number[] = []; // v3.4: 루프 바디 실행 횟수 (조건 FALSE 제외)
  private breakFlag: boolean = false; // v3.6: break 플래그
  private continueFlag: boolean = false; // v3.6: continue 플래그
  private debugLog: string[] = [];
  private sourceAST: ASTNode | null = null; // 전체 AST 저장 (v3.2 Exit Boundary용)
  private indentLevel: number = 0; // v3.3: 들여쓰기 레벨
  private trackedVariables: Set<string> = new Set(); // v3.4: 추적할 변수 목록

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
          // 루프 첫 진입: 스택에 저장 (v3.4: 바디 실행 횟수 초기화)
          this.loopStack.push(this.pc);
          this.loopDepthStack.push(this.indentLevel);
          this.loopBodyExecutionCount.push(0); // v3.4: 바디 실행 횟수 (0부터 시작)
          this.indentLevel++;

          // v3.4: 조건에서 추적할 변수 추출
          const conditionVars = this.extractVariablesFromCondition(stmt.condition);
          this.log(`[WHILE] PC=${this.pc} (Loop Head, Depth=${this.loopDepthStack.length - 1})`);
          this.log(`[TRACKED] 조건 변수: ${conditionVars.join(', ')}`);
        } else {
          // 루프 재진입 (점프 백)
          const currentDepth = this.loopDepthStack.length - 1;
          const executionCount = this.loopBodyExecutionCount[currentDepth] || 0;

          this.log(`[WHILE] PC=${this.pc} (Loop Reenter, Depth=${currentDepth}, Execution #${executionCount + 1})`);
        }

        // 조건 평가 (v3.5: 복합 조건식 단계별 로깅)
        const currentExecutionNum = this.loopBodyExecutionCount[this.loopDepthStack.length - 1] || 0;
        let condition = this.eval(stmt.condition);

        // v3.5: 복합 조건식인 경우 단계별 평가 로깅
        if (stmt.condition.type === 'BinaryOp') {
          condition = this.evaluateConditionWithDetails(stmt.condition, currentExecutionNum + 1);
        } else {
          this.log(`[CONDITION] (${JSON.stringify(stmt.condition)}) = ${condition}`);
        }

        if (condition) {
          // TRUE: 루프 바디 실행 (v3.4: 메모리 스냅샷)
          const currentDepth = this.loopDepthStack.length - 1;
          this.loopBodyExecutionCount[currentDepth] = (this.loopBodyExecutionCount[currentDepth] || 0) + 1;
          const executionNum = this.loopBodyExecutionCount[currentDepth];
          const conditionVars = this.extractVariablesFromCondition(stmt.condition);

          this.log(`[BRANCH] TRUE → 루프 바디 실행`);

          // v3.4: 루프 시작 전 메모리 스냅샷
          if (conditionVars.length > 0) {
            this.captureMemorySnapshot('START', executionNum, conditionVars);
          }

          // 루프 바디 실행 (모든 문장을 eval()로 처리 - 중첩 루프 포함)
          if (stmt.body.type === 'BlockStatement') {
            for (const bodyStmt of stmt.body.statements) {
              this.eval(bodyStmt);
              // v3.6: break/continue 플래그 확인
              if (this.breakFlag || this.continueFlag) {
                this.log(`[FLAG CHECK] breakFlag=${this.breakFlag}, continueFlag=${this.continueFlag}`);
                break;
              }
            }
          } else {
            this.eval(stmt.body);
          }

          // v3.6: break 플래그 확인 - 루프 탈출
          if (this.breakFlag) {
            this.log(`[BREAK DETECTED] 루프 즉시 탈출`);
            const currentDepth = this.loopDepthStack.length - 1;
            const totalBodyExecutions = this.loopBodyExecutionCount[currentDepth] || 0;
            this.log(`[LOOP STATS] 루프 바디 실행: ${totalBodyExecutions}회`);

            // 루프 탈출: 스택에서 제거
            this.indentLevel--;
            this.loopDepthStack.pop();
            this.loopBodyExecutionCount.pop();
            this.loopStack.pop();

            // breakFlag 초기화
            this.breakFlag = false;

            return undefined; // 다음 문으로
          }

          // v3.6: continue 플래그 초기화 (루프 계속)
          if (this.continueFlag) {
            this.log(`[CONTINUE DETECTED] 루프 헤드로 복귀`);
            this.continueFlag = false;
          }

          // v3.4: 루프 종료 후 메모리 스냅샷 및 값 변경 추적
          if (conditionVars.length > 0) {
            this.captureMemorySnapshot('END', executionNum, conditionVars);
          }

          // 루프 바디 끝: PC를 WHILE 위치로 복원
          this.log(`[JUMP BACK] PC=${this.pc}로 복원 (Loop Head로 회귀)`);
          return this.pc; // 같은 PC로 다시 실행
        } else {
          // FALSE: 루프 탈출
          const currentDepth = this.loopDepthStack.length - 1;
          const totalBodyExecutions = this.loopBodyExecutionCount[currentDepth] || 0;

          this.log(`[BRANCH] FALSE → EXIT STRATEGY 시작 (Depth=${currentDepth})`);
          this.log(`[LOOP STATS] 루프 바디 실행: ${totalBodyExecutions}회`);
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
          this.loopBodyExecutionCount.pop(); // v3.4: 바디 실행 횟수 카운터 제거
          this.loopStack.pop();

          return undefined; // 다음 문으로
        }
      }

      case 'IfStatement': {
        this.log(`[IF] 조건 평가 시작`);
        const cond = this.eval(stmt.condition);
        this.log(`[IF] 조건 결과: ${cond}`);
        if (cond) {
          this.log(`[IF] TRUE 브랜치 실행`);
          this.eval(stmt.thenBranch);
          // v3.6: break/continue 플래그 확인
          if (this.breakFlag || this.continueFlag) {
            this.log(`[IF] breakFlag=${this.breakFlag}, continueFlag=${this.continueFlag} 발견 - 즉시 반환`);
          }
        } else if (stmt.elseBranch) {
          this.log(`[IF] FALSE 브랜치 실행`);
          this.eval(stmt.elseBranch);
          // v3.6: break/continue 플래그 확인
          if (this.breakFlag || this.continueFlag) {
            this.log(`[IF] breakFlag=${this.breakFlag}, continueFlag=${this.continueFlag} 발견 - 즉시 반환`);
          }
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
          // v3.6: break/continue 플래그 확인
          if (this.breakFlag || this.continueFlag) {
            break; // BlockStatement 평가 중단
          }
        }
        return blockResult;

      case 'IfStatement': {
        // v3.6: eval() 기반 IfStatement 처리 (nested 루프 내부용)
        this.log(`[IF-EVAL] 조건 평가 시작`);
        const cond = this.eval(node.condition);
        this.log(`[IF-EVAL] 조건 결과: ${cond}`);
        if (cond) {
          this.log(`[IF-EVAL] TRUE 브랜치 실행`);
          const thenResult = this.eval(node.thenBranch);
          if (this.breakFlag || this.continueFlag) {
            this.log(`[IF-EVAL] breakFlag=${this.breakFlag}, continueFlag=${this.continueFlag} 감지`);
          }
          return thenResult;
        } else if (node.elseBranch) {
          this.log(`[IF-EVAL] FALSE 브랜치 실행`);
          const elseResult = this.eval(node.elseBranch);
          if (this.breakFlag || this.continueFlag) {
            this.log(`[IF-EVAL] breakFlag=${this.breakFlag}, continueFlag=${this.continueFlag} 감지`);
          }
          return elseResult;
        }
        return null;
      }

      case 'WhileStatement': {
        // v3.3: 중첩 루프 처리 (eval 기반)
        this.indentLevel++;
        this.log(`[WHILE] Nested Loop (Depth=${this.indentLevel - 1})`);

        let result = null;
        while (this.eval(node.condition) && !this.breakFlag) {
          this.log(`    [CONDITION] = true`);
          this.continueFlag = false; // v3.6: continue 플래그 초기화
          result = this.eval(node.body);
          // v3.6: break는 루프 탈출, continue는 다음 회차로
          if (this.breakFlag) {
            this.log(`    [BREAK] 루프 탈출`);
            this.breakFlag = false;
            break;
          }
          if (this.continueFlag) {
            this.log(`    [CONTINUE] 다음 회차로`);
            this.continueFlag = false;
            // 루프의 조건 재평가로 자동 진행
          }
        }

        this.log(`[WHILE END] (Depth=${this.indentLevel - 1})`);
        this.indentLevel--;
        return result;
      }

      case 'BreakStatement': {
        // v3.6: break 문
        this.log(`[BREAK SIGNAL] break 감지`);
        this.breakFlag = true;
        return null;
      }

      case 'ContinueStatement': {
        // v3.6: continue 문
        this.log(`[CONTINUE SIGNAL] continue 감지`);
        this.continueFlag = true;
        return null;
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

  /**
   * v3.4: 메모리 스냅샷 (변수 상태 추적)
   * 루프 시작/종료 시 변수 값을 기록
   */
  private captureMemorySnapshot(phase: 'START' | 'END', iteration: number, vars: string[]): void {
    const snapshot = vars
      .map(v => `${v}:${JSON.stringify(this.variables.get(v))}`)
      .join(', ');
    this.log(`[SNAPSHOT] Iteration #${iteration} ${phase} - {${snapshot}}`);
  }

  /**
   * v3.4: 값 변경 추적
   */
  private trackValueChange(varName: string, oldValue: any, newValue: any, iteration: number): void {
    if (oldValue !== newValue) {
      this.log(`[VALUE CHANGE] ${varName}: ${JSON.stringify(oldValue)} → ${JSON.stringify(newValue)} (Iteration #${iteration})`);
    }
  }

  /**
   * v3.4: 조건에서 변수 이름 추출
   * 예: i <= 3 → ['i']
   */
  private extractVariablesFromCondition(condition: ASTNode): string[] {
    const vars = new Set<string>();

    const extractVars = (node: ASTNode): void => {
      if (!node) return;

      if (node.type === 'Identifier') {
        vars.add(node.name);
      } else if (node.type === 'BinaryOp') {
        extractVars(node.left);
        extractVars(node.right);
      } else if (node.type === 'UnaryOp') {
        extractVars(node.operand);
      }
    };

    extractVars(condition);
    return Array.from(vars);
  }

  /**
   * v3.5: 조건식의 계산 과정을 상세히 로깅
   * 복합 조건식: (i + j < limit) → "1 + 2 < 10 = 3 < 10 = true"
   */
  private evaluateConditionWithDetails(condition: ASTNode, iteration: number): any {
    const evaluateWithSteps = (node: ASTNode, depth: number = 0): { value: any; expression: string } => {
      if (!node) return { value: null, expression: 'null' };

      switch (node.type) {
        case 'NumberLiteral':
          return { value: node.value, expression: String(node.value) };

        case 'Identifier':
          const idValue = this.variables.get(node.name);
          return { value: idValue, expression: `${node.name}(${idValue})` };

        case 'BinaryOp': {
          const left = evaluateWithSteps(node.left, depth + 1);
          const right = evaluateWithSteps(node.right, depth + 1);
          const result = this.evalBinaryOp({
            ...node,
            left: { type: 'NumberLiteral', value: left.value },
            right: { type: 'NumberLiteral', value: right.value }
          });

          // 비교 연산자인 경우 결과를 boolean으로 표시
          const isBooleanOp = ['<', '>', '<=', '>=', '==', '!=', '&&', '||'].includes(node.operator);
          const resultExpr = isBooleanOp
            ? (result ? 'true' : 'false')
            : String(result);

          return {
            value: result,
            expression: `${left.expression} ${node.operator} ${right.expression} = ${resultExpr}`
          };
        }

        default:
          const val = this.eval(node);
          return { value: val, expression: JSON.stringify(val) };
      }
    };

    const result = evaluateWithSteps(condition);
    this.log(`[EVAL STEPS] Iteration #${iteration}: ${result.expression}`);
    return result.value;
  }
}
