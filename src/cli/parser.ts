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
    // NOT 연산
    if (this.match('KEYWORD', 'NOT') || this.current().value === '!') {
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

  private isEOF(): boolean {
    return this.current().type === TokenType.EOF;
  }
}
