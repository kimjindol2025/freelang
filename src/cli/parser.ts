/**
 * FreeLang v2 Parser
 *
 * 텍스트 → Token → AST 변환
 * 필수 기능만 포함 (간단한 인간 중심 언어)
 *
 * 지원:
 * - 변수 할당 (SET)
 * - 함수 정의 (FUNC) + 호출
 * - 제어 흐름 (IF/ELSE, WHILE, FOR)
 * - 클래스 정의 (CLASS)
 * - 반환 (RETURN)
 */

import { Lexer, Token, TokenType } from './lexer';

/**
 * AST 노드
 */
export interface ASTNode {
  type: string;
  [key: string]: any;
}

/**
 * Parser 클래스
 */
export class Parser {
  private lexer: Lexer;
  private tokens: Token[] = [];
  private pos = 0;

  constructor() {
    this.lexer = new Lexer();
  }

  /**
   * 메인 진입점: 텍스트 → AST
   */
  parse(code: string): ASTNode {
    // 1. 렉싱
    this.tokens = this.lexer.lex(code);
    this.pos = 0;

    // 2. 파싱
    const ast = this.parseProgram();

    return ast;
  }

  /**
   * 프로그램 파싱
   */
  private parseProgram(): ASTNode {
    const statements: ASTNode[] = [];

    while (!this.isEOF()) {
      const stmt = this.parseStatement();
      if (stmt) {
        statements.push(stmt);
      }
    }

    return { type: 'Program', statements };
  }

  /**
   * 문 파싱
   */
  private parseStatement(): ASTNode | null {
    if (this.isEOF()) return null;

    // IMPORT 모듈 로드: IMPORT math FROM "stdlib/math"
    if (this.match('KEYWORD', 'IMPORT')) {
      return this.parseImportStatement();
    }

    // SET 변수 할당: SET x = 10
    if (this.match('KEYWORD', 'SET')) {
      return this.parseSetStatement();
    }

    // IF 조건문: IF x > 5 { ... }
    if (this.match('KEYWORD', 'IF')) {
      return this.parseIfStatement();
    }

    // WHILE 루프: WHILE x < 10 { ... }
    if (this.match('KEYWORD', 'WHILE')) {
      return this.parseWhileStatement();
    }

    // FOR 루프: FOR i IN array { ... }
    if (this.match('KEYWORD', 'FOR')) {
      return this.parseForStatement();
    }

    // v10+: ASYNC FUNC 비동기 함수 정의
    if (this.match('KEYWORD', 'ASYNC')) {
      this.advance();
      const funcDecl = this.parseFunctionDeclaration();
      (funcDecl as any).isAsync = true;
      return funcDecl;
    }

    // FUNC 함수 정의: FUNC add(a, b) { ... }
    if (this.match('KEYWORD', 'FUNC')) {
      return this.parseFunctionDeclaration();
    }

    // FUNCTION 메서드 정의: FUNCTION methodName() { ... }
    if (this.match('KEYWORD', 'FUNCTION')) {
      return this.parseFunctionDeclaration();
    }

    // CLASS 클래스 정의: CLASS MyClass { ... }
    if (this.match('KEYWORD', 'CLASS')) {
      return this.parseClassDefinition();
    }

    // RETURN 반환: RETURN result
    if (this.match('KEYWORD', 'RETURN')) {
      return this.parseReturnStatement();
    }

    // PRINT/PRINTLN 출력: PRINT "message"
    if (this.match('KEYWORD', 'PRINT') || this.match('KEYWORD', 'PRINTLN')) {
      const isPrintln = this.current().value === 'PRINTLN';
      this.advance();
      const args: any[] = [];

      while (!this.check(TokenType.SEMICOLON) && !this.check(TokenType.RBRACE) && !this.isEOF()) {
        args.push(this.parseExpression());
        if (this.check(TokenType.COMMA)) {
          this.advance();
        } else {
          break;
        }
      }

      return {
        type: 'PrintStatement',
        isPrintln,
        args,
      };
    }

    // TRY/CATCH/FINALLY: TRY { ... } CATCH (e) { ... } FINALLY { ... }
    if (this.match('KEYWORD', 'TRY')) {
      return this.parseTryStatement();
    }

    // THROW 예외 발생: THROW "error message"
    if (this.match('KEYWORD', 'THROW')) {
      return this.parseThrowStatement();
    }

    // RETRY 재시도: RETRY maxAttempts=3, backoff=exponential, initialDelay=100 { ... }
    if (this.match('KEYWORD', 'RETRY')) {
      return this.parseRetryStatement();
    }

    // SEMAPHORE 동시성 제어: SEMAPHORE poolSize=3 { ... }
    if (this.match('KEYWORD', 'SEMAPHORE')) {
      return this.parseSemaphoreStatement();
    }

    // MUTEX 뮤텍스: MUTEX { ... }
    if (this.match('KEYWORD', 'MUTEX')) {
      return this.parseMutexStatement();
    }

    // STREAM 스트리밍: STREAM data { ... }
    if (this.match('KEYWORD', 'STREAM')) {
      return this.parseStreamStatement();
    }

    // PERF 성능 모니터링: PERF { ... }
    if (this.match('KEYWORD', 'PERF')) {
      return this.parsePerfStatement();
    }

    // LAZY 지연 평가: LAZY x = expensiveFunc()
    if (this.match('KEYWORD', 'LAZY')) {
      return this.parseLazyStatement();
    }

    // ASSERT 단언: ASSERT condition, "message"
    if (this.match('KEYWORD', 'ASSERT')) {
      return this.parseAssertStatement();
    }

    // DEBUG/INFO/WARN/ERROR 로깅: DEBUG "message", { data }
    if (this.match('KEYWORD', 'DEBUG') || this.match('KEYWORD', 'INFO') ||
        this.match('KEYWORD', 'WARN') || this.match('KEYWORD', 'ERROR')) {
      return this.parseLogStatement();
    }

    // HEALTH 헬스 체크: HEALTH { CHECK condition }
    if (this.match('KEYWORD', 'HEALTH')) {
      return this.parseHealthStatement();
    }

    // HASH 해시: HASH data, "SHA256"
    if (this.match('KEYWORD', 'HASH')) {
      return this.parseHashStatement();
    }

    // ENCRYPT 암호화: ENCRYPT data, key, "AES-256"
    if (this.match('KEYWORD', 'ENCRYPT')) {
      return this.parseEncryptStatement();
    }

    // DECRYPT 복호화: DECRYPT data, key, "AES-256"
    if (this.match('KEYWORD', 'DECRYPT')) {
      return this.parseDecryptStatement();
    }

    // SIGN 서명: SIGN message, privateKey, "RSA"
    if (this.match('KEYWORD', 'SIGN')) {
      return this.parseSignStatement();
    }

    // VERIFY 검증: VERIFY message, signature, publicKey, "RSA"
    if (this.match('KEYWORD', 'VERIFY')) {
      return this.parseVerifyStatement();
    }

    // KEYGEN 키 생성: KEYGEN "RSA", 2048
    if (this.match('KEYWORD', 'KEYGEN')) {
      return this.parseKeygenStatement();
    }

    // 그 외: 스킵
    this.advance();
    return null;
  }

  /**
   * IMPORT 문 파싱: IMPORT moduleName FROM "path"
   */
  private parseImportStatement(): ASTNode {
    this.expect('KEYWORD', 'IMPORT');
    const moduleName = this.expect(TokenType.IDENTIFIER).value;
    this.expect('KEYWORD', 'FROM');
    const modulePath = this.expect(TokenType.STRING).value;

    return {
      type: 'ImportStatement',
      moduleName,
      modulePath,
    };
  }

  /**
   * SET 문 파싱: SET var = expr
   */
  private parseSetStatement(): ASTNode {
    this.expect('KEYWORD', 'SET');
    const varName = this.expect(TokenType.IDENTIFIER).value;
    this.expect(TokenType.ASSIGN);
    const value = this.parseExpression();

    return {
      type: 'SetStatement',
      variable: varName,
      value: value,
    };
  }

  /**
   * IF 문 파싱: IF cond { ... } ELSE { ... }
   */
  private parseIfStatement(): ASTNode {
    this.expect('KEYWORD', 'IF');
    const condition = this.parseExpression();

    const thenBody = this.parseBlock();
    let elseBody: ASTNode[] = [];

    // ELSE 블록이 있으면 파싱
    if (this.match('KEYWORD', 'ELSE')) {
      this.advance();
      elseBody = this.parseBlock();
    }

    return {
      type: 'IfStatement',
      condition,
      thenBody,
      elseBody,
    };
  }

  /**
   * WHILE 루프 파싱: WHILE cond { ... }
   */
  private parseWhileStatement(): ASTNode {
    this.expect('KEYWORD', 'WHILE');
    const condition = this.parseExpression();
    const body = this.parseBlock();

    return {
      type: 'WhileStatement',
      condition,
      body,
    };
  }

  /**
   * FOR 루프 파싱: FOR var IN array { ... }
   */
  private parseForStatement(): ASTNode {
    this.expect('KEYWORD', 'FOR');
    const variable = this.expect(TokenType.IDENTIFIER).value;
    this.expect('KEYWORD', 'IN');
    const iterable = this.expect(TokenType.IDENTIFIER).value;

    const body = this.parseBlock();

    return {
      type: 'ForStatement',
      variable,
      iterable,
      body,
    };
  }

  /**
   * RETRY 재시도 파싱: RETRY maxAttempts=N, backoff=strategy, initialDelay=N { ... }
   *
   * @example
   * RETRY maxAttempts=3, backoff=exponential, initialDelay=100 {
   *   SET data = AWAIT httpGet(url)
   * }
   */
  private parseRetryStatement(): ASTNode {
    this.expect('KEYWORD', 'RETRY');

    // 재시도 옵션 파싱
    const options: any = {
      maxAttempts: 3,  // 기본값
      backoff: 'exponential',  // 기본값
      initialDelay: 100,  // 기본값 (ms)
    };

    // maxAttempts=3, backoff=exponential, initialDelay=100
    while (!this.check(TokenType.LBRACE) && !this.isEOF()) {
      const optionName = this.expect(TokenType.IDENTIFIER).value;
      this.expect(TokenType.ASSIGN);  // =
      const optionValue = this.parseExpression();

      if (optionValue.type === 'NumberLiteral') {
        options[optionName] = optionValue.value;
      } else if (optionValue.type === 'Identifier') {
        options[optionName] = optionValue.name;
      }

      if (this.check(TokenType.COMMA)) {
        this.advance();
      } else {
        break;
      }
    }

    const body = this.parseBlock();

    return {
      type: 'RetryStatement',
      maxAttempts: options.maxAttempts,
      backoff: options.backoff,  // 'linear' | 'exponential' | 'fixed'
      initialDelay: options.initialDelay,
      body,
    };
  }

  /**
   * SEMAPHORE 세마포어 파싱: SEMAPHORE poolSize=N { ... }
   *
   * @example
   * SEMAPHORE poolSize=3 {
   *   SET result = AWAIT someAsyncTask()
   * }
   */
  private parseSemaphoreStatement(): ASTNode {
    this.expect('KEYWORD', 'SEMAPHORE');

    // poolSize 옵션 파싱
    const options: any = {
      poolSize: 1,  // 기본값: 1개 슬롯
    };

    // poolSize=3
    if (this.check(TokenType.IDENTIFIER) && this.current().value === 'poolSize') {
      this.advance();
      this.expect(TokenType.ASSIGN);  // =
      const poolSizeExpr = this.parseExpression();

      if (poolSizeExpr.type === 'NumberLiteral') {
        options.poolSize = poolSizeExpr.value;
      }
    }

    const body = this.parseBlock();

    return {
      type: 'SemaphoreStatement',
      poolSize: options.poolSize,
      body,
    };
  }

  /**
   * MUTEX 뮤텍스 파싱: MUTEX { ... }
   *
   * @example
   * MUTEX {
   *   SET counter = counter + 1
   * }
   */
  private parseMutexStatement(): ASTNode {
    this.expect('KEYWORD', 'MUTEX');

    const body = this.parseBlock();

    return {
      type: 'MutexStatement',
      body,
    };
  }

  /**
   * STREAM 스트리밍 파싱: STREAM source { ... }
   *
   * @example
   * STREAM data {
   *   SET result = AWAIT process(chunk)
   * }
   */
  private parseStreamStatement(): ASTNode {
    this.expect('KEYWORD', 'STREAM');

    // 스트림 소스 파싱
    const source = this.expect(TokenType.IDENTIFIER).value;

    // 옵션 파싱 (선택사항)
    const options: any = {
      chunkSize: 10,  // 기본값
    };

    // chunkSize=... 파싱
    if (this.check(TokenType.IDENTIFIER) && this.current().value === 'chunkSize') {
      this.advance();
      this.expect(TokenType.ASSIGN);
      const sizeExpr = this.parseExpression();
      if (sizeExpr.type === 'NumberLiteral') {
        options.chunkSize = sizeExpr.value;
      }
    }

    const body = this.parseBlock();

    return {
      type: 'StreamStatement',
      source,
      chunkSize: options.chunkSize,
      body,
    };
  }

  /**
   * PERF 성능 모니터링 파싱: PERF { ... }
   *
   * @example
   * PERF {
   *   SET result = AWAIT heavyComputation()
   * }
   */
  private parsePerfStatement(): ASTNode {
    this.expect('KEYWORD', 'PERF');

    const body = this.parseBlock();

    return {
      type: 'PerfStatement',
      body,
    };
  }

  /**
   * LAZY 지연 평가 파싱: LAZY varName = expression
   *
   * @example
   * LAZY x = expensiveFunc()
   * PRINT x  // 이 시점에 계산됨
   */
  private parseLazyStatement(): ASTNode {
    this.expect('KEYWORD', 'LAZY');

    const varName = this.expect(TokenType.IDENTIFIER).value;
    this.expect(TokenType.ASSIGN);
    const value = this.parseExpression();

    return {
      type: 'LazyStatement',
      varName,
      value,
    };
  }

  /**
   * ASSERT 단언 파싱: ASSERT condition, "message"
   *
   * @example
   * ASSERT x > 0, "x must be positive"
   * ASSERT array.length > 0, "Empty array"
   */
  private parseAssertStatement(): ASTNode {
    this.expect('KEYWORD', 'ASSERT');

    // 조건 파싱
    const condition = this.parseExpression();

    // 메시지 파싱 (선택사항)
    let message = 'Assertion failed';
    if (this.check(TokenType.COMMA)) {
      this.advance();
      const msgExpr = this.parseExpression();
      if (msgExpr.type === 'StringLiteral') {
        message = msgExpr.value;
      }
    }

    return {
      type: 'AssertStatement',
      condition,
      message,
    };
  }

  /**
   * LOG 로깅 파싱: DEBUG/INFO/WARN/ERROR "message", { data }
   *
   * @example
   * DEBUG "Starting process"
   * INFO "Computation done", { result: 42 }
   * WARN "Memory high"
   * ERROR "Operation failed"
   */
  private parseLogStatement(): ASTNode {
    const levelToken = this.current();
    const level = levelToken.value.toLowerCase();  // debug, info, warn, error
    this.advance();

    // 메시지 파싱
    const message = this.parseExpression();

    // 데이터 파싱 (선택사항)
    let data = null;
    if (this.check(TokenType.COMMA)) {
      this.advance();
      data = this.parseExpression();
    }

    return {
      type: 'LogStatement',
      level,  // 'debug' | 'info' | 'warn' | 'error'
      message,
      data,
    };
  }

  /**
   * HEALTH 헬스 체크 파싱: HEALTH { CHECK condition }
   *
   * @example
   * HEALTH {
   *   CHECK x > 0
   *   CHECK array.length > 0
   * }
   */
  private parseHealthStatement(): ASTNode {
    this.expect('KEYWORD', 'HEALTH');

    const checks: any[] = [];

    this.expect(TokenType.LBRACE);

    while (!this.check(TokenType.RBRACE) && !this.isEOF()) {
      if (this.match('KEYWORD', 'CHECK')) {
        this.advance();
        const condition = this.parseExpression();
        checks.push({
          type: 'HealthCheck',
          condition,
        });
      }

      if (this.check(TokenType.SEMICOLON)) {
        this.advance();
      }
    }

    this.expect(TokenType.RBRACE);

    return {
      type: 'HealthStatement',
      checks,
    };
  }

  /**
   * FUNC 함수 정의: FUNC name(params) { body }
   */
  private parseFunctionDeclaration(): ASTNode {
    // FUNC 또는 FUNCTION 모두 처리
    if (this.match('KEYWORD', 'FUNCTION')) {
      this.advance();
    } else {
      this.expect('KEYWORD', 'FUNC');
    }

    const name = this.expect(TokenType.IDENTIFIER).value;
    this.expect(TokenType.LPAREN);

    // 파라미터 파싱
    const params: string[] = [];
    while (!this.check(TokenType.RPAREN)) {
      params.push(this.expect(TokenType.IDENTIFIER).value);

      if (this.check(TokenType.COMMA)) {
        this.advance();
      }
    }

    this.expect(TokenType.RPAREN);

    // 함수 본체 파싱
    const body = this.parseBlock();

    return {
      type: 'FunctionDeclaration',
      name,
      params,
      body,
    };
  }

  /**
   * CLASS 클래스 정의: CLASS Name { ... }
   */
  private parseClassDefinition(): ASTNode {
    this.expect('KEYWORD', 'CLASS');
    const className = this.expect(TokenType.IDENTIFIER).value;

    this.expect(TokenType.LBRACE);

    const members: string[] = [];
    const methods: ASTNode[] = [];

    while (!this.check(TokenType.RBRACE) && !this.isEOF()) {
      // FUNCTION 메서드 정의
      if (this.match('KEYWORD', 'FUNCTION')) {
        const method = this.parseFunctionDeclaration();
        methods.push(method);
      }
      // SET 멤버 변수 정의
      else if (this.match('KEYWORD', 'SET')) {
        const stmt = this.parseSetStatement();
        members.push((stmt as any).variable);
      } else {
        this.advance();
      }
    }

    this.expect(TokenType.RBRACE);

    return {
      type: 'ClassDefinition',
      name: className,
      members,
      methods,
    };
  }

  /**
   * RETURN 문 파싱: RETURN expr
   */
  private parseReturnStatement(): ASTNode {
    this.expect('KEYWORD', 'RETURN');
    const value = this.parseExpression();

    return {
      type: 'ReturnStatement',
      value,
    };
  }

  /**
   * TRY/CATCH/FINALLY 문 파싱
   */
  private parseTryStatement(): ASTNode {
    this.expect('KEYWORD', 'TRY');
    const tryBody = this.parseBlock();

    let catchVar: string | undefined;
    let catchBody: ASTNode[] = [];
    let finallyBody: ASTNode[] = [];

    // CATCH 블록
    if (this.match('KEYWORD', 'CATCH')) {
      this.advance();
      this.expect(TokenType.LPAREN);
      catchVar = this.expect(TokenType.IDENTIFIER).value;

      // 타입 정보가 있으면 스킵 (: ExceptionType)
      if (this.check(TokenType.COLON)) {
        this.advance();
        this.advance(); // 타입 스킵
      }

      this.expect(TokenType.RPAREN);
      catchBody = this.parseBlock();
    }

    // FINALLY 블록
    if (this.match('KEYWORD', 'FINALLY')) {
      this.advance();
      finallyBody = this.parseBlock();
    }

    return {
      type: 'TryStatement',
      tryBody,
      catchVar,
      catchBody,
      finallyBody,
    };
  }

  /**
   * THROW 문 파싱: THROW expr
   */
  private parseThrowStatement(): ASTNode {
    this.expect('KEYWORD', 'THROW');
    const value = this.parseExpression();

    return {
      type: 'ThrowStatement',
      value,
    };
  }

  /**
   * 블록 파싱: { ... }
   */
  private parseBlock(): ASTNode[] {
    this.expect(TokenType.LBRACE);

    const statements: ASTNode[] = [];

    while (!this.check(TokenType.RBRACE) && !this.isEOF()) {
      const stmt = this.parseStatement();
      if (stmt) {
        statements.push(stmt);
      }
    }

    this.expect(TokenType.RBRACE);

    return statements;
  }

  /**
   * 표현식 파싱: 간단한 산술, 논리식
   *
   * 지원:
   * - 리터럴: 123, "hello", true, false
   * - 변수: x, y
   * - 이항 연산자: +, -, *, /, <, >, ==, !=
   * - 함수 호출: func(a, b)
   * - 메서드 호출: obj.method(arg)
   * - NEW 표현식: NEW ClassName()
   */
  private parseExpression(): any {
    return this.parseBinaryOp();
  }

  /**
   * 이항 연산자 파싱 (우선순위 고려)
   */
  private parseBinaryOp(): any {
    let left = this.parseUnaryOp();

    while (this.checkOperator()) {
      const op = this.advance().value;
      const right = this.parseUnaryOp();
      left = {
        type: 'BinaryOp',
        operator: op,
        left,
        right,
      };
    }

    return left;
  }

  /**
   * 단항 연산자 파싱
   */
  private parseUnaryOp(): any {
    // v10+: AWAIT 표현식
    if (this.match('KEYWORD', 'AWAIT')) {
      this.advance();
      const expr = this.parseUnaryOp();
      return {
        type: 'AwaitExpression',
        argument: expr
      };
    }

    // NOT 연산
    if (this.match('KEYWORD', 'NOT') || (this.check(TokenType.OPERATOR) && this.current().value === '!')) {
      this.advance();
      const operand = this.parseUnaryOp();
      return {
        type: 'UnaryOp',
        operator: 'NOT',
        operand,
      };
    }

    // Unary minus (음수)
    if (this.current().value === '-' && this.check(TokenType.OPERATOR)) {
      this.advance();
      const operand = this.parseUnaryOp();
      return {
        type: 'UnaryOp',
        operator: '-',
        operand,
      };
    }

    return this.parsePrimary();
  }

  /**
   * 기본 표현식 파싱: 리터럴, 변수, 함수 호출 등
   */
  private parsePrimary(): any {
    // 리터럴
    if (this.check(TokenType.NUMBER)) {
      return { type: 'NumberLiteral', value: this.advance().value };
    }

    if (this.check(TokenType.STRING)) {
      return { type: 'StringLiteral', value: this.advance().value };
    }

    if (this.check(TokenType.BOOL)) {
      return { type: 'BoolLiteral', value: this.advance().value };
    }

    // TRUE/FALSE 불린 리터럴
    if (this.match('KEYWORD', 'TRUE')) {
      this.advance();
      return { type: 'BoolLiteral', value: true };
    }

    if (this.match('KEYWORD', 'FALSE')) {
      this.advance();
      return { type: 'BoolLiteral', value: false };
    }

    // NULL 리터럴
    if (this.match('KEYWORD', 'NULL')) {
      this.advance();
      return { type: 'NullLiteral', value: null };
    }

    // NEW 표현식: NEW ClassName()
    if (this.match('KEYWORD', 'NEW')) {
      this.advance();
      const className = this.expect(TokenType.IDENTIFIER).value;
      this.expect(TokenType.LPAREN);

      const args: any[] = [];
      while (!this.check(TokenType.RPAREN) && !this.isEOF()) {
        args.push(this.parseExpression());
        if (this.check(TokenType.COMMA)) {
          this.advance();
        }
      }

      this.expect(TokenType.RPAREN);

      return {
        type: 'NewExpr',
        className,
        args,
      };
    }

    // 식별자 (변수, 함수 호출, 메서드 호출)
    if (this.check(TokenType.IDENTIFIER)) {
      const name = this.advance().value;

      // 메서드 호출: obj.method(args)
      if (this.check(TokenType.DOT)) {
        this.advance();
        const methodName = this.expect(TokenType.IDENTIFIER).value;
        this.expect(TokenType.LPAREN);

        const args: any[] = [];
        while (!this.check(TokenType.RPAREN) && !this.isEOF()) {
          args.push(this.parseExpression());
          if (this.check(TokenType.COMMA)) {
            this.advance();
          }
        }

        this.expect(TokenType.RPAREN);

        return {
          type: 'MethodCallExpr',
          instance: name,
          methodName,
          args,
        };
      }

      // 함수 호출: func(args)
      if (this.check(TokenType.LPAREN)) {
        this.advance();

        const args: any[] = [];
        while (!this.check(TokenType.RPAREN) && !this.isEOF()) {
          args.push(this.parseExpression());
          if (this.check(TokenType.COMMA)) {
            this.advance();
          }
        }

        this.expect(TokenType.RPAREN);

        return {
          type: 'FunctionCallExpr',
          funcName: name,
          args,
        };
      }

      // 단순 식별자 (변수)
      return {
        type: 'Identifier',
        name,
      };
    }

    // 괄호 표현식: (expr)
    if (this.check(TokenType.LPAREN)) {
      this.advance();
      const expr = this.parseExpression();
      this.expect(TokenType.RPAREN);
      return expr;
    }

    // 배열: [1, 2, 3]
    if (this.check(TokenType.LBRACKET)) {
      return this.parseArray();
    }

    throw new Error(`Unexpected token: ${this.current().value}`);
  }

  /**
   * 배열 파싱: [1, 2, 3]
   */
  private parseArray(): ASTNode {
    this.expect(TokenType.LBRACKET);

    const elements: any[] = [];

    while (!this.check(TokenType.RBRACKET) && !this.isEOF()) {
      elements.push(this.parseExpression());

      if (this.check(TokenType.COMMA)) {
        this.advance();
      }
    }

    this.expect(TokenType.RBRACKET);

    return {
      type: 'ArrayLiteral',
      elements,
    };
  }

  /**
   * 연산자 체크
   */
  private checkOperator(): boolean {
    const token = this.current();
    if (token.type !== TokenType.OPERATOR) return false;

    const op = token.value;
    const operators = ['+', '-', '*', '/', '%', '<', '>', '<=', '>=', '==', '!=', '&&', '||', '&', '|', '^'];
    return operators.includes(op);
  }

  /**
   * 유틸리티
   */
  private current(): Token {
    return this.tokens[this.pos] || {
      type: TokenType.EOF,
      value: '',
      line: 0,
      column: 0,
      raw: ''
    };
  }

  private advance(): Token {
    const token = this.current();
    this.pos++;
    return token;
  }

  private check(type: TokenType | string): boolean {
    const token = this.current();
    if (typeof type === 'string') {
      return token.type === type;
    }
    return token.type === type;
  }

  private match(type: string, value?: string | string[]): boolean {
    const token = this.current();

    if (type === 'KEYWORD') {
      if (token.type !== TokenType.KEYWORD) return false;
      if (!value) return true;
      if (typeof value === 'string') return token.value === value;
      return value.includes(token.value);
    }

    if (type === 'OPERATOR') {
      return token.type === TokenType.OPERATOR;
    }

    return token.type === type;
  }

  private expect(type: TokenType | string, value?: string): Token {
    const token = this.current();

    if (typeof type === 'string') {
      if (!this.match(type, value)) {
        throw new Error(
          `Expected ${type}${value ? ` '${value}'` : ''}, got ${token.type} '${token.value}' at line ${token.line}`
        );
      }
    } else {
      if (token.type !== type) {
        throw new Error(
          `Expected ${type}, got ${token.type} '${token.value}' at line ${token.line}`
        );
      }
    }

    return this.advance();
  }

  /**
   * HASH 문 파싱: HASH data, "SHA256"
   */
  private parseHashStatement(): ASTNode {
    this.expect('KEYWORD', 'HASH');
    const data = this.parseExpression();
    this.expect(TokenType.COMMA);
    const algorithm = this.parseExpression();

    return {
      type: 'HashStatement',
      data,
      algorithm,
    };
  }

  /**
   * ENCRYPT 문 파싱: ENCRYPT data, key, "AES-256"
   */
  private parseEncryptStatement(): ASTNode {
    this.expect('KEYWORD', 'ENCRYPT');
    const data = this.parseExpression();
    this.expect(TokenType.COMMA);
    const key = this.parseExpression();
    this.expect(TokenType.COMMA);
    const algorithm = this.parseExpression();

    return {
      type: 'EncryptStatement',
      data,
      key,
      algorithm,
    };
  }

  /**
   * DECRYPT 문 파싱: DECRYPT data, key, "AES-256"
   */
  private parseDecryptStatement(): ASTNode {
    this.expect('KEYWORD', 'DECRYPT');
    const data = this.parseExpression();
    this.expect(TokenType.COMMA);
    const key = this.parseExpression();
    this.expect(TokenType.COMMA);
    const algorithm = this.parseExpression();

    return {
      type: 'DecryptStatement',
      data,
      key,
      algorithm,
    };
  }

  /**
   * SIGN 문 파싱: SIGN message, privateKey, "RSA"
   */
  private parseSignStatement(): ASTNode {
    this.expect('KEYWORD', 'SIGN');
    const message = this.parseExpression();
    this.expect(TokenType.COMMA);
    const privateKey = this.parseExpression();
    this.expect(TokenType.COMMA);
    const algorithm = this.parseExpression();

    return {
      type: 'SignStatement',
      message,
      privateKey,
      algorithm,
    };
  }

  /**
   * VERIFY 문 파싱: VERIFY message, signature, publicKey, "RSA"
   */
  private parseVerifyStatement(): ASTNode {
    this.expect('KEYWORD', 'VERIFY');
    const message = this.parseExpression();
    this.expect(TokenType.COMMA);
    const signature = this.parseExpression();
    this.expect(TokenType.COMMA);
    const publicKey = this.parseExpression();
    this.expect(TokenType.COMMA);
    const algorithm = this.parseExpression();

    return {
      type: 'VerifyStatement',
      message,
      signature,
      publicKey,
      algorithm,
    };
  }

  /**
   * KEYGEN 문 파싱: KEYGEN "RSA", 2048
   */
  private parseKeygenStatement(): ASTNode {
    this.expect('KEYWORD', 'KEYGEN');
    const algorithm = this.parseExpression();

    // 옵션: KEYGEN "algorithm", size
    let size: ASTNode | undefined = undefined;
    if (this.check(TokenType.COMMA)) {
      this.advance();
      size = this.parseExpression();
    }

    return {
      type: 'KeygenStatement',
      algorithm,
      size,
    };
  }

  private isEOF(): boolean {
    return this.current().type === TokenType.EOF;
  }
}
