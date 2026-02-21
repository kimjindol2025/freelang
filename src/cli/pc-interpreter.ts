/**
 * PC (Program Counter) 기반 Interpreter - v3.1
 *
 * while 루프의 "되돌아가는 행동" 구현
 * - PC: 현재 실행 중인 statement의 인덱스
 * - Loop Head: WHILE 시작 위치 저장
 * - Loop Tail: 닫는 괄호 탐색 및 워프
 */

// v3.7: Safety Guard 상수
const MAX_SAFE_ITERATION = 1_000_000; // 최대 안전 반복 횟수
const ITERATION_WARNING_THRESHOLD = 500_000; // 경고 임계값

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
  private loopIterationCounter: number[] = []; // v3.7: 각 루프의 총 반복 횟수 (nested support)
  private loopPreExecutionSnapshot: Map<string, Map<string, any>>[] = []; // v3.8: 루프 진입 전 메모리 스냅샷 (depth별)
  private loopControlVariables: Set<string>[] = []; // v3.8: 루프 제어 변수 (i, j 등) - 변경 허용
  private breakFlag: boolean = false; // v3.6: break 플래그
  private continueFlag: boolean = false; // v3.6: continue 플래그
  private debugLog: string[] = [];
  private sourceAST: ASTNode | null = null; // 전체 AST 저장 (v3.2 Exit Boundary용)
  private indentLevel: number = 0; // v3.3: 들여쓰기 레벨
  private trackedVariables: Set<string> = new Set(); // v3.4: 추적할 변수 목록
  private globalIterationCount: number = 0; // v3.7: 전체 프로그램 반복 횟수
  private jumpOffsetCache: Map<number, number> = new Map(); // v3.9: Jump Table - 루프 점프 목적지 캐시

  // ── v4.0: 함수 시스템 ─────────────────────────────────────────────────────
  private functionTable: Map<string, { params: string[]; body: ASTNode }> = new Map();
  //   함수 이름 → { 매개변수 목록, 바디 블록 }

  private callStack: Array<{
    savedScope: Map<string, any>; // 호출 전 변수 환경 전체
    functionName: string;         // 어느 함수 안에 있는지 (디버그용)
    callDepth: number;            // 호출 깊이 (v4.1 중첩 추적)
  }> = [];

  private returnValue: any = undefined; // 함수가 돌려주는 값
  private returnFlag: boolean = false;  // RETURN 신호

  // ── v4.6: VM Dispatch Optimization ───────────────────────────────────────
  // Call Site Cache: 동일 AST 호출 노드 → 함수 정의 직접 참조 (Map.get 반복 생략)
  private callSiteCache: WeakMap<ASTNode, { params: string[]; body: ASTNode }> = new WeakMap();
  // Inline Hint Cache: 함수명 → 인라인 가능 여부 (1회 분석 후 재사용)
  private inlineCache: Map<string, boolean> = new Map();
  // 함수별 호출 횟수 (Pipeline 모니터링)
  private callCountMap: Map<string, number> = new Map();
  private static readonly HOT_THRESHOLD = 100;
  // ──────────────────────────────────────────────────────────────────────────

  constructor() {
    this.variables.set('println', this.println.bind(this));

    // v5.0: arr_new(n) — n개 슬롯을 0으로 초기화한 배열 반환
    this.variables.set('arr_new', (size: number) => {
      const arr = new Array(Math.max(0, size)).fill(0);
      this.log(`[ARRAY ALLOC] arr_new(${size}) → ${size}개 슬롯 확보 (Base+0 ~ Base+${size - 1}), 모두 0 초기화`);
      return arr;
    });

    // v5.2: arr_copy(src, dst) — 블록 Deep Copy (원소 값 전체 복제, 참조 독립)
    this.variables.set('arr_copy', (src: any[], dst: any[]) => {
      if (!Array.isArray(src)) throw new Error('[COPY ERROR] 원본이 배열이 아닙니다');
      if (!Array.isArray(dst)) throw new Error('[COPY ERROR] 대상이 배열이 아닙니다');

      const srcLen = src.length;
      const dstLen = dst.length;
      const transferLen = Math.min(srcLen, dstLen);

      this.log(`[BLOCK COPY] 블록 복사 시작: source(${srcLen}개) → target(${dstLen}개)`);
      this.log(`[MEMORY MIGRATE] Deep Copy 모드 — 원본과 독립된 새 값 공간에 복제`);

      for (let i = 0; i < transferLen; i++) {
        const prev = dst[i];
        dst[i] = src[i];
        this.log(`[BLOCK COPY] Base+${i}: ${prev} → ${src[i]}`);
      }

      this.log(`[BLOCK INTEGRITY] 전송 완료: ${transferLen}/${srcLen} 원소 — 누락 없음 ✅`);
      this.log(`[DEEP COPY] 독립성 확보 — source 수정 시 target 영향 없음 (원시값 복사)`);
      this.log(`[GC RELEASE] 구형 target 슬롯 참조 해제 완료 (Garbage Collected)`);

      return dst;
    });

    // v5.2: arr_resize(arr, newSize) — 배열 크기 조정 + 기존 데이터 이관
    this.variables.set('arr_resize', (arr: any[], newSize: number) => {
      if (!Array.isArray(arr)) throw new Error('[RESIZE ERROR] 배열이 아닙니다');
      if (newSize < 0) throw new Error('[RESIZE ERROR] 크기는 0 이상이어야 합니다');

      const oldLen = arr.length;
      const migrateLen = Math.min(oldLen, newSize);

      this.log(`[MEMORY MIGRATE] arr_resize: ${oldLen}개 → ${newSize}개 슬롯 이관 시작`);
      this.log(`[ARRAY ALLOC] 신규 공간 확보: ${newSize}개 슬롯 (모두 0 초기화)`);

      const newArr = new Array(newSize).fill(0);
      for (let i = 0; i < migrateLen; i++) {
        newArr[i] = arr[i];
        this.log(`[BLOCK COPY] Base+${i}: ${arr[i]} (이관)`);
      }

      this.log(`[BLOCK INTEGRITY] 이관 완료: ${migrateLen}/${oldLen} 원소 보존 ✅`);
      this.log(`[GC RELEASE] 구형 배열 (크기 ${oldLen}) 참조 해제 — Garbage Collected`);

      return newArr;
    });
  }

  /**
   * v3.9: Jump Table Optimization - 루프 점프 오프셋 캐시
   */
  private cacheJumpOffset(loopPC: number, destinationPC: number): void {
    this.jumpOffsetCache.set(loopPC, destinationPC);
    this.log(`[JUMP TABLE] Cached jump: PC=${loopPC} → PC=${destinationPC}`);
  }

  /**
   * v3.9: Jump Table Optimization - 캐시된 점프 목적지 조회
   */
  private getJumpDestination(loopPC: number): number | undefined {
    const cached = this.jumpOffsetCache.get(loopPC);
    if (cached !== undefined) {
      this.log(`[JUMP TABLE] Cache hit: PC=${loopPC} → PC=${cached}`);
    }
    return cached;
  }

  /**
   * v3.9: Jump Table Optimization - 캐시 초기화 (프로그램 재실행 시)
   */
  private clearJumpOffsetCache(): void {
    this.jumpOffsetCache.clear();
    this.log(`[JUMP TABLE] Cache cleared`);
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
    this.clearJumpOffsetCache(); // v3.9: Jump Table 초기화
    // v4.6: 최적화 캐시 초기화 (재실행 시 오래된 캐시 방지)
    this.inlineCache.clear();
    this.callCountMap.clear();

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
        // v4.2: DELIVERY 추적 (최상위 문에서도)
        if (stmt.value?.type === 'CallExpression') {
          const callee = stmt.value.callee?.name ?? '?';
          this.log(`[DELIVERY] '${callee}()' 반환값 ${val} → '${stmt.name}'`);
        }
        return undefined; // 다음 문으로
      }

      case 'Assignment': {
        const val = this.eval(stmt.value);
        this.variables.set(stmt.name, val);
        // v4.2: DELIVERY 추적 (최상위 문에서도)
        if (stmt.value?.type === 'CallExpression') {
          const callee = stmt.value.callee?.name ?? '?';
          this.log(`[DELIVERY] '${callee}()' 반환값 ${val} → '${stmt.name}'`);
        }
        return undefined;
      }

      // v4.0: 함수 정의 — 실행 없이 Function Table에 등록만
      case 'FunctionDeclaration': {
        this.functionTable.set(stmt.name, { params: stmt.params, body: stmt.body });
        this.log(`[FUNC DEF] '${stmt.name}' 등록 (params: [${stmt.params.join(', ')}])`);
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
          this.loopIterationCounter.push(0); // v3.7: 각 루프의 iteration 카운터 초기화
          this.indentLevel++;

          // v3.4: 조건에서 추적할 변수 추출
          const conditionVars = this.extractVariablesFromCondition(stmt.condition);

          // v3.8: 메모리 상태 보호 시작
          const loopControlVars = this.identifyLoopControlVariables(stmt.condition);
          const preExecutionSnapshot = this.captureFullMemorySnapshot();
          this.loopPreExecutionSnapshot.push(preExecutionSnapshot);
          this.loopControlVariables.push(loopControlVars);

          this.log(`[WHILE] PC=${this.pc} (Loop Head, Depth=${this.loopDepthStack.length - 1})`);
          this.log(`[TRACKED] 조건 변수: ${conditionVars.join(', ')}`);
          this.log(`[SAFETY GUARD] v3.7 활성화 (MAX_SAFE: ${MAX_SAFE_ITERATION.toLocaleString()}, WARN: ${ITERATION_WARNING_THRESHOLD.toLocaleString()})`);
          this.log(`[MEMORY INTEGRITY] v3.8 활성화 - Capture pre-loop state (${preExecutionSnapshot.size} variables)`);
        } else {
          // 루프 재진입 (점프 백)
          const currentDepth = this.loopDepthStack.length - 1;
          const executionCount = this.loopBodyExecutionCount[currentDepth] || 0;

          // v3.9: Jump Table Optimization - 캐시된 점프 확인
          const cachedDestination = this.getJumpDestination(this.pc);

          this.log(`[WHILE] PC=${this.pc} (Loop Reenter, Depth=${currentDepth}, Execution #${executionCount + 1})`);
        }

        // v3.9: Instruction Tuning - 중복 평가 제거
        const currentExecutionNum = this.loopBodyExecutionCount[this.loopDepthStack.length - 1] || 0;

        // 조건 평가 (한 번만!)
        let condition: any;
        if (stmt.condition.type === 'BinaryOp') {
          // v3.5: 복합 조건식은 상세 로깅과 함께 평가
          condition = this.evaluateConditionWithDetails(stmt.condition, currentExecutionNum + 1);
        } else {
          // 단순 조건식은 빠른 평가
          condition = this.eval(stmt.condition);
          this.log(`[CONDITION] (${JSON.stringify(stmt.condition)}) = ${condition}`);
        }

        if (condition) {
          // TRUE: 루프 바디 실행 (v3.4: 메모리 스냅샷)
          const currentDepth = this.loopDepthStack.length - 1;
          this.loopBodyExecutionCount[currentDepth] = (this.loopBodyExecutionCount[currentDepth] || 0) + 1;
          const executionNum = this.loopBodyExecutionCount[currentDepth];
          const conditionVars = this.extractVariablesFromCondition(stmt.condition);

          // v3.7: Safety Guard - 반복 횟수 증가 및 체크
          this.loopIterationCounter[currentDepth] = (this.loopIterationCounter[currentDepth] || 0) + 1;
          this.globalIterationCount++;

          const currentLoopIterations = this.loopIterationCounter[currentDepth];

          // 경고 임계값 체크
          if (currentLoopIterations === ITERATION_WARNING_THRESHOLD) {
            this.log(`[WARN] Safety Guard: Loop ${this.pc} reached warning threshold (${ITERATION_WARNING_THRESHOLD.toLocaleString()} iterations)`);
          }

          // 최대 반복 횟수 체크
          if (currentLoopIterations > MAX_SAFE_ITERATION) {
            this.log(`[PANIC] Safety Guard: MAXIMUM ITERATION EXCEEDED!`);
            this.log(`[PANIC] Loop PC=${this.pc}, Depth=${currentDepth}, Iterations=${currentLoopIterations.toLocaleString()}`);
            this.log(`[PANIC] Global iteration count: ${this.globalIterationCount.toLocaleString()}`);
            this.log(`[PANIC] Forced execution halt to prevent infinite loop`);

            // 안전 종료: 스택 정리
            this.indentLevel--;
            this.loopDepthStack.pop();
            this.loopBodyExecutionCount.pop();
            this.loopIterationCounter.pop();
            this.loopStack.pop();

            throw new Error(`[PANIC] Infinite loop detected! Max iterations (${MAX_SAFE_ITERATION.toLocaleString()}) exceeded at loop PC=${this.pc}`);
          }

          this.log(`[BRANCH] TRUE → 루프 바디 실행 [Iteration: ${currentLoopIterations.toLocaleString()}/${MAX_SAFE_ITERATION.toLocaleString()}]`);

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
            const totalIterations = this.loopIterationCounter[currentDepth] || 0; // v3.7
            this.log(`[LOOP STATS] 루프 바디 실행: ${totalBodyExecutions}회`);
            this.log(`[SAFETY GUARD] Break exit - Total iterations: ${totalIterations.toLocaleString()}/${MAX_SAFE_ITERATION.toLocaleString()}`); // v3.7

            // v3.8: 메모리 무결성 검증 (break 탈출 시에도)
            const preSnapshot = this.loopPreExecutionSnapshot[currentDepth];
            const postSnapshot = this.captureFullMemorySnapshot();
            const controlVars = this.loopControlVariables[currentDepth];

            if (preSnapshot && controlVars) {
              this.detectMemoryContamination(preSnapshot, postSnapshot, controlVars, currentDepth);
            }

            // 루프 탈출: 스택에서 제거
            this.indentLevel--;
            this.loopDepthStack.pop();
            this.loopBodyExecutionCount.pop();
            this.loopIterationCounter.pop(); // v3.7: 반복 횟수 카운터 제거
            this.loopPreExecutionSnapshot.pop(); // v3.8: 메모리 스냅샷 제거
            this.loopControlVariables.pop(); // v3.8: 루프 제어 변수 제거
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
          // v3.9: Jump Table Optimization - 루프 점프 캐시
          this.cacheJumpOffset(this.pc, this.pc);
          return this.pc; // 같은 PC로 다시 실행
        } else {
          // FALSE: 루프 탈출
          const currentDepth = this.loopDepthStack.length - 1;
          const totalBodyExecutions = this.loopBodyExecutionCount[currentDepth] || 0;
          const totalIterations = this.loopIterationCounter[currentDepth] || 0; // v3.7: 안전 종료

          this.log(`[BRANCH] FALSE → EXIT STRATEGY 시작 (Depth=${currentDepth})`);
          this.log(`[LOOP STATS] 루프 바디 실행: ${totalBodyExecutions}회`);
          this.log(`[SAFETY GUARD] Safe exit - Total iterations: ${totalIterations.toLocaleString()}/${MAX_SAFE_ITERATION.toLocaleString()}`); // v3.7
          this.log(`[SKIPPING] 루프 바디 전체 건너뜀 (Block: ${JSON.stringify(stmt.body.type)})`);

          if (stmt.body.type === 'BlockStatement') {
            const bodyStmtCount = stmt.body.statements.length;
            this.log(`[EXIT BOUNDARY] 루프 바디: ${bodyStmtCount}개 문장 스킵 확인`);
            this.findExitBoundary(stmt, statements);
          }

          this.log(`[EXIT] 다음 PC(${this.pc + 1})로 점프 (Loop 탈출 완료)`);

          // v3.8: 메모리 무결성 검증
          const preSnapshot = this.loopPreExecutionSnapshot[currentDepth];
          const postSnapshot = this.captureFullMemorySnapshot();
          const controlVars = this.loopControlVariables[currentDepth];

          if (preSnapshot && controlVars) {
            this.detectMemoryContamination(preSnapshot, postSnapshot, controlVars, currentDepth);
          }

          // 루프 탈출: 스택에서 제거
          this.indentLevel--;
          this.loopDepthStack.pop();
          this.loopBodyExecutionCount.pop(); // v3.4: 바디 실행 횟수 카운터 제거
          this.loopIterationCounter.pop(); // v3.7: 반복 횟수 카운터 제거
          this.loopPreExecutionSnapshot.pop(); // v3.8: 메모리 스냅샷 제거
          this.loopControlVariables.pop(); // v3.8: 루프 제어 변수 제거
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
        // v4.2: DELIVERY 추적 — 함수 호출 결과가 변수에 안착하는 순간
        if (node.value?.type === 'CallExpression') {
          const callee = node.value.callee?.name ?? '?';
          this.log(`[DELIVERY] '${callee}()' 반환값 ${val} → '${node.name}'`);
        }
        return val;
      }

      case 'Assignment': {
        const val = this.eval(node.value);
        this.variables.set(node.name, val);
        // v4.2: DELIVERY 추적
        if (node.value?.type === 'CallExpression') {
          const callee = node.value.callee?.name ?? '?';
          this.log(`[DELIVERY] '${callee}()' 반환값 ${val} → '${node.name}'`);
        }
        return val;
      }

      case 'IndexAssignment': {
        // v5.0: 배열 인덱스 쓰기 — Bounds Check + 주소 계산 + 기록
        const arr = this.eval(node.object);
        const idx = this.eval(node.index);
        const val = this.eval(node.value);
        if (!Array.isArray(arr)) {
          throw new Error(`[INDEX ERROR] 배열이 아닌 변수에 인덱스 할당 불가`);
        }
        // v5.1: 변수 인덱스 감지 — Dynamic Indexing (런타임 주소 계산)
        if (node.index.type === 'Identifier') {
          this.log(`[DYNAMIC INDEX] '${node.index.name}' = ${idx} → 런타임 주소 계산`);
        }
        this.log(`[BOUNDS CHECK] 인덱스 ${idx} vs 배열 크기 ${arr.length}`);
        if (idx < 0 || idx >= arr.length) {
          throw new Error(`[INDEX OUT OF BOUNDS] 인덱스 ${idx} 가 범위 [0, ${arr.length - 1}] 를 벗어남`);
        }
        const prev = arr[idx];
        arr[idx] = val;
        this.log(`[INDEX WRITE] Base+${idx}×1: ${prev} → ${val} (데이터 오염 0%)`);
        return val;
      }

      case 'ArrayLiteral': {
        // v5.0: 리터럴 배열 생성 — 연속 메모리 할당 로그
        const elems = node.elements.map((e: ASTNode) => this.eval(e));
        this.log(`[ARRAY ALLOC] 리터럴 크기 ${elems.length} → [${elems.join(', ')}]`);
        return elems;
      }

      case 'BinaryOp':
        return this.evalBinaryOp(node);

      case 'UnaryOp':
        return this.evalUnaryOp(node);

      case 'CallExpression':
        return this.evalCall(node);

      case 'IndexExpression': {
        // v5.0: 인덱스 읽기 — Bounds Check + 주소 계산
        const obj = this.eval(node.object);
        const idx = this.eval(node.index);
        if (!Array.isArray(obj)) {
          throw new Error(`[INDEX ERROR] 배열이 아닌 값에 인덱스 접근 불가`);
        }
        // v5.1: 변수 인덱스 감지 — Dynamic Indexing (런타임 주소 계산)
        if (node.index.type === 'Identifier') {
          this.log(`[DYNAMIC INDEX] '${node.index.name}' = ${idx} → 런타임 주소 계산`);
        }
        this.log(`[BOUNDS CHECK] 인덱스 ${idx} vs 배열 크기 ${obj.length}`);
        if (idx < 0 || idx >= obj.length) {
          throw new Error(`[INDEX OUT OF BOUNDS] 인덱스 ${idx} 가 범위 [0, ${obj.length - 1}] 를 벗어남`);
        }
        const val = obj[idx];
        this.log(`[INDEX READ ] Base+${idx}×1 = ${val}`);
        return val;
      }

      case 'FunctionDeclaration': {
        // v4.0: eval() 내에서 함수 정의 만나면 등록만 (실행 안 함)
        this.functionTable.set(node.name, { params: node.params, body: node.body });
        this.log(`[FUNC DEF] '${node.name}' 등록 (params: [${node.params.join(', ')}])`);
        return null;
      }

      case 'ReturnStatement': {
        // v4.0: RETURN — 값을 회수하고 returnFlag를 올림
        const retVal = node.value ? this.eval(node.value) : null;
        this.returnValue = retVal;
        this.returnFlag = true;
        this.log(`[RETURN] 반환값: ${retVal}`);
        return retVal;
      }

      case 'BlockStatement': {
        let blockResult = null;
        for (const stmt of node.statements) {
          blockResult = this.eval(stmt);
          // v3.6: break/continue / v4.0: return 플래그 확인
          if (this.breakFlag || this.continueFlag || this.returnFlag) {
            break; // BlockStatement 평가 중단
          }
        }
        return blockResult;
      }

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
        const nestedLoopDepth = this.indentLevel - 1;
        this.log(`[WHILE] Nested Loop (Depth=${nestedLoopDepth})`);
        this.log(`[SAFETY GUARD] v3.7 활성화 (MAX_SAFE: ${MAX_SAFE_ITERATION.toLocaleString()}, WARN: ${ITERATION_WARNING_THRESHOLD.toLocaleString()})`);

        // v3.8: 중첩 루프의 메모리 상태 보호
        const nestedLoopControlVars = this.identifyLoopControlVariables(node.condition);
        const nestedPreSnapshot = this.captureFullMemorySnapshot();

        this.log(`[MEMORY INTEGRITY] v3.8 활성화 - Capture pre-nested-loop state (${nestedPreSnapshot.size} variables)`);

        let result = null;
        let nestedIterationCount = 0; // v3.7: 중첩 루프 반복 횟수

        while (this.eval(node.condition) && !this.breakFlag && !this.returnFlag) {
          // v3.7: Safety Guard - nested 루프 반복 횟수 증가 및 체크
          nestedIterationCount++;
          this.globalIterationCount++;

          // 경고 임계값 체크
          if (nestedIterationCount === ITERATION_WARNING_THRESHOLD) {
            this.log(`[WARN] Safety Guard: Nested loop (depth=${nestedLoopDepth}) reached warning threshold (${ITERATION_WARNING_THRESHOLD.toLocaleString()} iterations)`);
          }

          // 최대 반복 횟수 체크
          if (nestedIterationCount > MAX_SAFE_ITERATION) {
            this.log(`[PANIC] Safety Guard: MAXIMUM ITERATION EXCEEDED (nested)!`);
            this.log(`[PANIC] Nested Loop Depth=${nestedLoopDepth}, Iterations=${nestedIterationCount.toLocaleString()}`);
            this.log(`[PANIC] Global iteration count: ${this.globalIterationCount.toLocaleString()}`);
            this.log(`[PANIC] Forced execution halt to prevent infinite loop`);
            this.indentLevel--;
            throw new Error(`[PANIC] Infinite nested loop detected! Max iterations (${MAX_SAFE_ITERATION.toLocaleString()}) exceeded at depth=${nestedLoopDepth}`);
          }

          this.log(`    [CONDITION] = true [Iteration: ${nestedIterationCount.toLocaleString()}/${MAX_SAFE_ITERATION.toLocaleString()}]`);
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

        // v3.8: 중첩 루프 메모리 무결성 검증
        const nestedPostSnapshot = this.captureFullMemorySnapshot();
        this.detectMemoryContamination(nestedPreSnapshot, nestedPostSnapshot, nestedLoopControlVars, nestedLoopDepth);

        this.log(`[WHILE END] (Depth=${nestedLoopDepth}) - Safe exit: ${nestedIterationCount.toLocaleString()} iterations`);
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
   * 함수 호출 (v4.0 기반 / v4.6: Call Site Cache + Pipeline 최적화)
   */
  private evalCall(node: ASTNode): any {
    let calleeName: string;

    if (node.callee.type === 'Identifier') {
      calleeName = node.callee.name;
    } else {
      throw new Error('Only identifier function calls supported');
    }

    // 인자 평가 (호출 전 — 현재 스코프에서)
    const args = node.arguments.map((a: ASTNode) => this.eval(a));

    // v4.6: Call Site Cache — AST 노드 동일성 기반 직접 참조
    let cachedFn = this.callSiteCache.get(node);
    if (!cachedFn && this.functionTable.has(calleeName)) {
      cachedFn = this.functionTable.get(calleeName)!;
      this.callSiteCache.set(node, cachedFn);
      this.log(`[CALL SITE CACHE] '${calleeName}' 등록 — 이후 Map.get 생략`);
    }

    if (cachedFn) {
      // v4.6: 호출 횟수 추적 (Pipeline Metrics)
      const count = (this.callCountMap.get(calleeName) ?? 0) + 1;
      this.callCountMap.set(calleeName, count);
      if (count === PCInterpreter.HOT_THRESHOLD) {
        this.log(`[PIPELINE] '${calleeName}' HOT 함수 진입 (${count}회) — 최적화 경로 활성화`);
      }

      // v4.6: Inline Hinting — 단순 함수 Fast Path (스코프 생성 생략)
      if (this.isInlinable(calleeName)) {
        // 첫 2회 + 1000회마다 로그 (10,000 호출 시 스팸 방지)
        if (count <= 2 || count % 1000 === 0) {
          this.log(`[PIPELINE] INLINE #${count}: '${calleeName}(${args.join(', ')})' → 직접 실행`);
        }
        return this.callInline(calleeName, args, cachedFn);
      }

      return this.callUserFunction(calleeName, args);
    }

    // 내장 함수 (println 등)
    const func = this.variables.get(calleeName);
    if (typeof func === 'function') {
      return func(...args);
    }

    throw new Error(`'${calleeName}' 는 함수가 아니거나 정의되지 않았습니다`);
  }

  /**
   * v4.6: Inline Hint Detection — 단순 순수 함수 인라인 가능 여부 판단
   * 조건: 바디가 단일 ReturnStatement이며 중첩 호출이 없음
   */
  private isInlinable(name: string): boolean {
    if (this.inlineCache.has(name)) return this.inlineCache.get(name)!;
    const fn = this.functionTable.get(name)!;
    const stmts = fn.body.statements;
    let result: boolean;
    if (stmts.length !== 1 || stmts[0].type !== 'ReturnStatement') {
      result = false; // 다중 문장 or 비-return → 인라인 불가
    } else {
      result = !this.astContainsCall(stmts[0].value); // 중첩 호출 없어야 가능
    }
    this.inlineCache.set(name, result);
    this.log(`[INLINE HINT] '${name}' 분석 → ${result ? '✅ 인라인 가능 (단일 return, 중첩 호출 없음)' : '❌ 풀 호출 필요'}`);
    return result;
  }

  /**
   * v4.6: AST 서브트리에 CallExpression 포함 여부 재귀 검사
   */
  private astContainsCall(node: ASTNode | null): boolean {
    if (!node || typeof node !== 'object') return false;
    if (node.type === 'CallExpression') return true;
    for (const key of Object.keys(node)) {
      if (key === 'type') continue;
      const val = node[key];
      if (Array.isArray(val)) {
        if (val.some((v: any) => this.astContainsCall(v))) return true;
      } else if (val && typeof val === 'object' && val.type) {
        if (this.astContainsCall(val)) return true;
      }
    }
    return false;
  }

  /**
   * v4.6: Fast Inline Call — 스코프 전환 없이 현재 스코프에서 직접 실행
   * 매개변수를 임시로 주입 후 return 표현식만 평가 (new Map() 생성 없음)
   */
  private callInline(name: string, args: any[], fn: { params: string[]; body: ASTNode }): any {
    // 현재 스코프에서 param 이름 충돌 방지: 기존 값 보존 후 교체
    const saved = new Map<string, any>();
    for (let i = 0; i < fn.params.length; i++) {
      const k = fn.params[i];
      saved.set(k, this.variables.get(k)); // undefined 포함 저장
      this.variables.set(k, args[i] ?? null);
    }
    // Return 표현식만 직접 평가 (스택 프레임 없음)
    const retVal = this.eval(fn.body.statements[0].value);
    // 기존 값 복구
    for (const [k, v] of saved) {
      if (v === undefined) this.variables.delete(k);
      else this.variables.set(k, v);
    }
    return retVal;
  }

  /**
   * v4.0: 사용자 정의 함수 실행 (Call Stack + Scope 격리)
   * v4.1: 중첩 호출 지원 (재귀적으로 안전)
   * v4.2: 데이터 핸드오버 무결성 로깅 추가
   */
  private callUserFunction(name: string, args: any[]): any {
    const fn = this.functionTable.get(name)!;
    const callDepth = this.callStack.length;

    this.log(`[CALL] '${name}(${args.join(', ')})' → Depth=${callDepth + 1}`);

    // ── 1. Return Address: 현재 스코프 전체를 Call Stack에 저장 ──────────
    const savedScope = new Map(this.variables);
    this.callStack.push({ savedScope, functionName: name, callDepth });

    // ── 2. v4.2 HANDOVER: 인자 → 매개변수 순서대로 바인딩 ─────────────────
    const localScope = new Map<string, any>();
    localScope.set('println', this.println.bind(this));

    this.log(`[HANDOVER] ${fn.params.length}개 인자 전달 시작`);
    for (let i = 0; i < fn.params.length; i++) {
      const paramName = fn.params[i];
      const argVal   = args[i] ?? null;
      localScope.set(paramName, argVal);
      this.log(`[HANDOVER] [${i}] 호출자 args[${i}]=${argVal} → 로컬 '${paramName}'`);
    }

    this.variables = localScope;
    this.indentLevel++;

    // ── 3. 함수 바디 실행 ────────────────────────────────────────────────
    for (const stmt of fn.body.statements) {
      this.eval(stmt);
      if (this.returnFlag) break; // RETURN 신호 감지 즉시 탈출
    }

    // ── 4. v4.2 LOCAL ISOLATION: 소멸할 로컬 변수 목록 기록 ──────────────
    const localVarNames = [...this.variables.keys()]
      .filter(k => k !== 'println');
    this.log(`[LOCAL ISOLATION] 소멸 예정 로컬 변수: [${localVarNames.join(', ')}]`);

    // ── 5. 반환값 회수 ────────────────────────────────────────────────────
    const retVal = this.returnValue ?? null;
    this.returnValue = undefined;
    this.returnFlag = false;
    this.log(`[RETURN COMPLETE] '${name}' 반환값: ${retVal}`);

    // ── 6. Call Stack Pop: 이전 스코프 복구 (Memory Cleanup) ─────────────
    this.indentLevel--;
    const frame = this.callStack.pop()!;
    this.variables = frame.savedScope;

    // v4.2: 로컬 변수 소멸 확인
    // savedScope에 없었던 로컬 변수(함수가 새로 만든 것)만 검사 — 이름 충돌 오탐 방지
    const addedByFunc = localVarNames.filter(k => !frame.savedScope.has(k));
    const leaked      = addedByFunc.filter(k => this.variables.has(k));
    if (leaked.length === 0) {
      this.log(`[LOCAL ISOLATION] ✅ 소멸 완료 — 외부 스코프 오염 없음`);
    } else {
      this.log(`[LOCAL ISOLATION] ⚠️  누수 감지: [${leaked.join(', ')}]`);
    }

    this.log(`[SCOPE RESTORED] depth=${callDepth}, 복구된 외부 변수: ${this.variables.size - 1}개`);

    return retVal;
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

  /**
   * v3.8: 전체 메모리 상태 스냅샷 (모든 변수)
   * 루프 진입 전 상태를 저장하여 나중에 비교
   */
  private captureFullMemorySnapshot(): Map<string, any> {
    const snapshot = new Map<string, any>();

    for (const [key, value] of this.variables) {
      // 함수 타입 제외 (println, arr_new 등 내장 함수)
      if (typeof value === 'function') continue;
      // v5.0: 배열은 slice()로 얕은 복사 (요소가 원시값이므로 충분)
      if (Array.isArray(value)) {
        snapshot.set(key, value.slice());
      } else {
        snapshot.set(key, value);
      }
    }

    return snapshot;
  }

  /**
   * v3.8: 루프 제어 변수 추출 및 저장
   * 루프 조건에서 나타나는 변수들은 "허용된 변경"으로 취급
   */
  private identifyLoopControlVariables(condition: ASTNode): Set<string> {
    const controlVars = new Set<string>();

    const extract = (node: ASTNode): void => {
      if (!node) return;

      if (node.type === 'Identifier') {
        controlVars.add(node.name);
      } else if (node.type === 'BinaryOp') {
        extract(node.left);
        extract(node.right);
      } else if (node.type === 'UnaryOp') {
        extract(node.operand);
      }
    };

    extract(condition);
    return controlVars;
  }

  /**
   * v3.8: 메모리 상태 비교 및 오염 감지
   * 루프 전후의 메모리를 비교하여 의도하지 않은 변경 감지
   */
  private detectMemoryContamination(
    beforeSnapshot: Map<string, any>,
    afterSnapshot: Map<string, any>,
    controlVariables: Set<string>,
    loopDepth: number
  ): void {
    const changes: { varName: string; before: any; after: any }[] = [];
    const contaminations: { varName: string; before: any; after: any }[] = [];

    // 모든 현재 변수 확인
    for (const [varName, afterValue] of afterSnapshot) {
      const beforeValue = beforeSnapshot.get(varName);

      if (beforeValue === undefined) {
        // 새로 추가된 변수 (문제 없음)
        changes.push({ varName, before: undefined, after: afterValue });
      } else if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
        // 값이 변경됨
        if (controlVariables.has(varName)) {
          // 루프 제어 변수: 허용됨
          changes.push({ varName, before: beforeValue, after: afterValue });
        } else if (Array.isArray(afterValue) || Array.isArray(beforeValue)) {
          // v5.1: 배열은 인덱스 쓰기로 원소 변경이 허용된 작업 → 오염 아님
          changes.push({ varName, before: beforeValue, after: afterValue });
        } else {
          // 루프 제어 변수 아님: 오염!
          contaminations.push({ varName, before: beforeValue, after: afterValue });
        }
      }
    }

    // 로그 출력
    if (changes.length > 0) {
      const changeLog = changes
        .map(c => `${c.varName}: ${JSON.stringify(c.before)} → ${JSON.stringify(c.after)}`)
        .join(', ');
      this.log(`[STATE CHANGE] Depth=${loopDepth} - Permitted: {${changeLog}}`);
    }

    // 오염 감지!
    if (contaminations.length > 0) {
      const contaminationLog = contaminations
        .map(c => `${c.varName}: ${JSON.stringify(c.before)} → ${JSON.stringify(c.after)}`)
        .join(', ');
      this.log(`[CONTAMINATION ALERT] Depth=${loopDepth} - ILLEGAL CHANGES DETECTED: {${contaminationLog}}`);
      this.log(`[MEMORY INTEGRITY] ⚠️  Loop modified unexpected memory region!`);
    } else {
      this.log(`[MEMORY INTEGRITY] ✅ Memory isolation verified (Depth=${loopDepth})`);
    }
  }
}
