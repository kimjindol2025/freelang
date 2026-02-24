/**
 * SimpleLangParser - 기본 프로그래밍 언어 파서
 *
 * 지원 기능:
 * - println(expr) - 출력
 * - let x = expr; - 변수 선언
 * - 산술연산: +, -, *, /, %
 * - 비교연산: ==, !=, <, >, <=, >=
 */

import { Lexer } from '../lexer/lexer';
import { Token, TokenType } from '../lexer/token';

export interface ASTNode {
  type: string;
  [key: string]: any;
}

export class SimpleLangParser {
  private tokens: Token[] = [];
  private pos: number = 0;

  constructor(code: string) {
    const lexer = new Lexer(code);
    const allTokens = lexer.tokenize();
    // EOF, NEWLINE, COMMENT 제외
    this.tokens = allTokens.filter(t => t.type !== TokenType.EOF && t.type !== TokenType.NEWLINE && t.type !== TokenType.COMMENT);
  }

  /**
   * 메인 파싱 함수
   */
  parse(): ASTNode | null {
    return this.parseProgram();
  }

  /**
   * 프로그램 파싱 (모든 문장 수집)
   */
  private parseProgram(): ASTNode | null {
    const statements: ASTNode[] = [];

    while (!this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) {
        statements.push(stmt);
      }
    }

    if (statements.length === 0) {
      return null;
    }

    if (statements.length === 1) {
      return statements[0];
    }

    // 여러 문장: 별도로 처리
    return {
      type: 'Program',
      statements
    };
  }

  /**
   * 문장 파싱
   */
  private parseStatement(): ASTNode | null {
    // let 변수 선언
    if (this.matchType(TokenType.LET)) {
      return this.parseVariableDeclaration();
    }

    // v4.0: fn 함수 정의
    if (this.matchType(TokenType.FN)) {
      return this.parseFunctionDeclaration();
    }

    // v4.0: return 문
    if (this.matchType(TokenType.RETURN)) {
      return this.parseReturnStatement();
    }

    // if 조건문
    if (this.matchType(TokenType.IF)) {
      return this.parseIfStatement();
    }

    // while 루프
    if (this.matchType(TokenType.WHILE)) {
      return this.parseWhileStatement();
    }

    // v7.0: class 클래스 정의
    if (this.matchType(TokenType.CLASS)) {
      return this.parseClassDeclaration();
    }

    // v7.3: interface 인터페이스 정의
    if (this.matchType(TokenType.INTERFACE)) {
      return this.parseInterfaceDeclaration();
    }

    // v5.7: struct 구조체 정의
    if (this.matchType(TokenType.STRUCT)) {
      return this.parseStructDeclaration();
    }

    // v3.6: break 문
    if (this.matchType(TokenType.BREAK)) {
      this.matchType(TokenType.SEMICOLON); // ; 선택사항
      return {
        type: 'BreakStatement'
      };
    }

    // v3.6: continue 문
    if (this.matchType(TokenType.CONTINUE)) {
      this.matchType(TokenType.SEMICOLON); // ; 선택사항
      return {
        type: 'ContinueStatement'
      };
    }

    // v8.1: try-catch 문
    if (this.matchType(TokenType.TRY)) {
      return this.parseTryStatement();
    }

    // v8.1: throw 문
    if (this.matchType(TokenType.THROW)) {
      return this.parseThrowStatement();
    }

    // 표현식 문장 (println, 함수 호출 등)
    return this.parseExpressionStatement();
  }

  /**
   * v4.0: 함수 정의 파싱
   * fn add(a, b) { ... }
   */
  private parseFunctionDeclaration(): ASTNode {
    // 함수 이름
    const nameToken = this.current();
    if (!nameToken || nameToken.type !== TokenType.IDENT) {
      throw new Error('함수 이름 필요');
    }
    const name = nameToken.value;
    this.advance();

    // 매개변수 목록: (a, b, ...)
    if (!this.matchType(TokenType.LPAREN)) {
      throw new Error('( 필요');
    }

    const params: string[] = [];
    if (!this.checkType(TokenType.RPAREN)) {
      const firstParam = this.current();
      if (firstParam && firstParam.type === TokenType.IDENT) {
        params.push(firstParam.value);
        this.advance();
      }
      while (this.matchType(TokenType.COMMA)) {
        const param = this.current();
        if (param && param.type === TokenType.IDENT) {
          params.push(param.value);
          this.advance();
        }
      }
    }

    if (!this.matchType(TokenType.RPAREN)) {
      throw new Error(') 필요');
    }

    // 함수 바디
    const body = this.parseBlock();

    return {
      type: 'FunctionDeclaration',
      name,
      params,
      body
    };
  }

  /**
   * v4.0: return 문 파싱
   * return expr;
   */
  private parseReturnStatement(): ASTNode {
    // return; (값 없이) or return expr;
    if (this.checkType(TokenType.RBRACE) || this.isAtEnd()) {
      return { type: 'ReturnStatement', value: null };
    }

    const value = this.parseExpression();
    this.matchType(TokenType.SEMICOLON);

    return {
      type: 'ReturnStatement',
      value
    };
  }

  /**
   * 변수 선언: let x = expr;
   */
  private parseVariableDeclaration(): ASTNode {
    const nameToken = this.current();
    if (!nameToken || nameToken.type !== TokenType.IDENT) {
      throw new Error('변수 이름 필요');
    }
    const name = nameToken.value;
    this.advance();

    if (!this.matchType(TokenType.ASSIGN)) {
      throw new Error('= 필요');
    }

    const value = this.parseExpression();
    this.matchType(TokenType.SEMICOLON); // ; 선택사항

    return {
      type: 'VariableDeclaration',
      name,
      value
    };
  }

  /**
   * if 조건문: if (cond) { ... } else { ... }
   */
  private parseIfStatement(): ASTNode {
    if (!this.matchType(TokenType.LPAREN)) {
      throw new Error('( 필요');
    }
    const condition = this.parseExpression();
    if (!this.matchType(TokenType.RPAREN)) {
      throw new Error(') 필요');
    }

    const thenBranch = this.parseBlock();
    let elseBranch = null;

    if (this.matchType(TokenType.ELSE)) {
      if (this.current()?.type === TokenType.IF) {
        elseBranch = this.parseIfStatement();
      } else {
        elseBranch = this.parseBlock();
      }
    }

    return {
      type: 'IfStatement',
      condition,
      thenBranch,
      elseBranch
    };
  }

  /**
   * while 루프: while (cond) { ... }
   */
  private parseWhileStatement(): ASTNode {
    if (!this.matchType(TokenType.LPAREN)) {
      throw new Error('( 필요');
    }
    const condition = this.parseExpression();
    if (!this.matchType(TokenType.RPAREN)) {
      throw new Error(') 필요');
    }
    const body = this.parseBlock();

    return {
      type: 'WhileStatement',
      condition,
      body
    };
  }

  /**
   * v8.1: try-catch 문
   * try { ... } catch (e) { ... }
   */
  private parseTryStatement(): ASTNode {
    // try 블록
    const tryBlock = this.parseBlock();

    // v8.6: 여러 catch 블록 파싱
    const catchBlocks: any[] = [];

    while (this.checkType(TokenType.CATCH)) {
      this.advance(); // CATCH 스킵

      if (!this.matchType(TokenType.LPAREN)) {
        throw new Error('( 필요');
      }

      const exceptionVarToken = this.current();
      if (!exceptionVarToken || exceptionVarToken.type !== TokenType.IDENT) {
        throw new Error('예외 변수명 필요');
      }
      const exceptionVar = exceptionVarToken.value;
      this.advance();

      // v8.6: (e: Type) 형식 파싱 (타입 필터)
      let exceptionType: string | undefined = undefined;
      if (this.checkType(TokenType.COLON)) {
        this.advance(); // : 스킵
        const typeToken = this.current();
        if (!typeToken || typeToken.type !== TokenType.IDENT) {
          throw new Error('타입명 필요');
        }
        exceptionType = typeToken.value;
        this.advance();
      }

      if (!this.matchType(TokenType.RPAREN)) {
        throw new Error(') 필요');
      }

      const body = this.parseBlock();

      catchBlocks.push({
        type: 'CatchBlock',
        exceptionType,
        exceptionVar,
        body
      });
    }

    // v8.7: finally 블록 (선택사항)
    let finallyBlock: ASTNode | undefined = undefined;
    if (this.checkType(TokenType.FINALLY)) {
      this.advance(); // FINALLY 스킵
      finallyBlock = this.parseBlock();
    }

    // catch 블록과 finally 블록 중 최소 1개 필수
    if (catchBlocks.length === 0 && !finallyBlock) {
      throw new Error('catch 또는 finally 블록 필요');
    }

    return {
      type: 'TryStatement',
      tryBlock,
      catchBlocks,
      finallyBlock
    };
  }

  /**
   * v8.1: throw 문
   * throw new Exception(message)
   */
  private parseThrowStatement(): ASTNode {
    const expr = this.parseExpression();
    this.matchType(TokenType.SEMICOLON);

    return {
      type: 'ThrowStatement',
      expression: expr
    };
  }

  /**
   * 블록: { ... }
   */
  private parseBlock(): ASTNode {
    if (!this.matchType(TokenType.LBRACE)) {
      throw new Error('{ 필요');
    }
    const statements: ASTNode[] = [];

    while (!this.checkType(TokenType.RBRACE) && !this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) {
        statements.push(stmt);
      }
    }

    if (!this.matchType(TokenType.RBRACE)) {
      throw new Error('} 필요');
    }

    return {
      type: 'BlockStatement',
      statements
    };
  }

  /**
   * v5.7: 구조체 선언
   * struct Player { ID (Integer), Level (Integer), HP (Float) }
   */
  private parseStructDeclaration(): ASTNode {
    const nameToken = this.current();
    if (!nameToken || nameToken.type !== TokenType.IDENT) {
      throw new Error('구조체 이름 필요');
    }
    const name = nameToken.value;
    this.advance();

    if (!this.matchType(TokenType.LBRACE)) {
      throw new Error('{ 필요');
    }

    const fields: { name: string; typeName: string }[] = [];
    while (!this.checkType(TokenType.RBRACE) && !this.isAtEnd()) {
      const fieldNameToken = this.current();
      if (!fieldNameToken || fieldNameToken.type !== TokenType.IDENT) {
        break;
      }
      const fieldName = fieldNameToken.value;
      this.advance();

      let typeName = 'Integer';
      if (this.matchType(TokenType.LPAREN)) {
        const typeToken = this.current();
        if (typeToken && typeToken.type === TokenType.IDENT) {
          typeName = typeToken.value;
          this.advance();
        }
        this.matchType(TokenType.RPAREN);
      }
      this.matchType(TokenType.COMMA);
      fields.push({ name: fieldName, typeName });
    }

    if (!this.matchType(TokenType.RBRACE)) {
      throw new Error('} 필요');
    }

    return { type: 'StructDeclaration', name, fields };
  }

  /**
   * v7.0: class 클래스 정의
   * 문법: class ClassName { fields... method name(params) { body } }
   */
  private parseClassDeclaration(): ASTNode {
    const name = this.current().value;
    this.advance();  // 클래스 이름 소비

    // v7.1: extends 상속
    let superClass: string | null = null;
    if (this.matchType(TokenType.EXTENDS)) {
      superClass = this.current().value;
      this.advance();
    }

    // v7.3: implements 인터페이스 구현
    const interfaces: string[] = [];
    if (this.matchType(TokenType.IMPLEMENTS)) {
      interfaces.push(this.current().value);
      this.advance();
      while (this.matchType(TokenType.COMMA)) {
        interfaces.push(this.current().value);
        this.advance();
      }
    }

    if (!this.matchType(TokenType.LBRACE)) {
      throw new Error("'{' 필요");
    }

    const fields: any[] = [];
    const methods: any[] = [];

    while (!this.checkType(TokenType.RBRACE) && !this.isAtEnd()) {
      // v7.4: 접근 제어자 파싱
      let access = 'public';  // 기본값: public
      if (this.matchType(TokenType.PRIVATE)) {
        access = 'private';
      } else if (this.matchType(TokenType.PROTECTED)) {
        access = 'protected';
      } else if (this.matchType(TokenType.PUBLIC)) {
        access = 'public';
      }

      if (this.matchType(TokenType.METHOD) || this.matchType(TokenType.FN)) {
        // v7.0+: method name(params) { body } 또는 FUNCTION name(params) { body }
        const method = this.parseMethodDeclaration();
        (method as any).access = access;  // v7.4: 메서드에 접근 제어자 추가
        methods.push(method);
      } else if (this.checkType(TokenType.REF)) {
        // v7.0+: 참조 필드 - REF fieldName
        this.advance(); // REF 토큰 소비
        if (!this.checkType(TokenType.IDENT)) {
          throw new Error("필드명 필요 (REF 다음)");
        }
        const fieldName = this.current().value;
        this.advance();
        fields.push({ name: fieldName, typeName: 'Ref', access, isRef: true });
        if (this.matchType(TokenType.COMMA)) {} // optional comma
      } else if (this.checkType(TokenType.IDENT)) {
        // 필드: fieldName (TypeName) 형식 (struct와 동일)
        const fieldName = this.current().value;
        this.advance();
        let typeName = 'Integer';
        if (this.matchType(TokenType.LPAREN)) {
          typeName = this.current().value;
          this.advance();
          if (!this.matchType(TokenType.RPAREN)) {
            throw new Error("')' 필요");
          }
        }
        if (this.matchType(TokenType.COMMA)) {} // optional comma
        fields.push({ name: fieldName, typeName, access });  // v7.4: 필드에 접근 제어자 추가
      } else {
        this.advance(); // 예상치 못한 토큰 스킵
      }
    }

    if (!this.matchType(TokenType.RBRACE)) {
      throw new Error("'}' 필요");
    }
    return { type: 'ClassDeclaration', name, superClass, interfaces, fields, methods };
  }

  /**
   * v7.0: 메서드 선언
   * 문법: method name(param1 Type1, param2 Type2) { body }
   */
  private parseMethodDeclaration(): ASTNode {
    const name = this.current().value;
    this.advance();  // 메서드 이름 소비

    // 파라미터
    if (!this.matchType(TokenType.LPAREN)) {
      throw new Error("'(' 필요");
    }
    const params: string[] = [];
    while (!this.checkType(TokenType.RPAREN) && !this.isAtEnd()) {
      // v7.4: paramName Type 형식 파싱 (Type 스킵)
      const paramName = this.current().value;
      params.push(paramName);
      this.advance();  // 파라미터 이름 소비

      // 타입 정보 건너뛰기 (선택사항)
      if (this.checkType(TokenType.IDENT) && !this.checkType(TokenType.COMMA) && !this.checkType(TokenType.RPAREN)) {
        this.advance();  // Type 소비
      }

      if (!this.matchType(TokenType.COMMA)) break;
    }
    if (!this.matchType(TokenType.RPAREN)) {
      throw new Error("')' 필요");
    }

    const body = this.parseBlock();
    return { type: 'MethodDeclaration', name, params, body };
  }

  /**
   * v7.3: 인터페이스 선언
   * interface Shape { method GetArea() }
   */
  private parseInterfaceDeclaration(): ASTNode {
    const name = this.current().value;
    this.advance();  // 인터페이스 이름 소비

    if (!this.matchType(TokenType.LBRACE)) {
      throw new Error("'{' 필요");
    }

    const methods: any[] = [];

    while (!this.checkType(TokenType.RBRACE) && !this.isAtEnd()) {
      if (this.matchType(TokenType.METHOD)) {
        // v7.3: interface method는 구현체 없음 (abstract)
        const methodName = this.current().value;
        this.advance();

        if (!this.matchType(TokenType.LPAREN)) {
          throw new Error("'(' 필요");
        }
        const params: string[] = [];
        while (!this.checkType(TokenType.RPAREN) && !this.isAtEnd()) {
          params.push(this.current().value);
          this.advance();
          if (!this.matchType(TokenType.COMMA)) break;
        }
        if (!this.matchType(TokenType.RPAREN)) {
          throw new Error("')' 필요");
        }

        // 인터페이스 메서드는 구현체 없음
        methods.push({ name: methodName, params, body: null });
      } else {
        this.advance(); // 예상치 못한 토큰 스킵
      }
    }

    if (!this.matchType(TokenType.RBRACE)) {
      throw new Error("'}' 필요");
    }
    return { type: 'InterfaceDeclaration', name, methods };
  }

  /**
   * 표현식 또는 할당 문장
   */
  private parseExpressionStatement(): ASTNode {
    const expr = this.parseExpression();

    // 할당 연산 (x = expr  or  arr[i] = expr  or  p1.ID = expr)
    if (this.matchType(TokenType.ASSIGN)) {
      const value = this.parseExpression();
      this.matchType(TokenType.SEMICOLON); // ; 선택사항

      if (expr.type === 'Identifier') {
        return { type: 'Assignment', name: expr.name, value };
      }

      // v5.0: 인덱스 할당 — list[0] = 10
      if (expr.type === 'IndexExpression') {
        return {
          type: 'IndexAssignment',
          object: expr.object,  // 배열 식별자
          index: expr.index,    // 인덱스 식
          value                 // 대입 값
        };
      }

      // v5.7: 구조체 멤버 할당 — p1.ID = 101
      if (expr.type === 'MemberExpression') {
        return {
          type: 'MemberAssignment',
          object: expr.object,
          field: expr.field,
          value
        };
      }

      throw new Error('할당 좌변은 변수명 또는 배열 인덱스여야 합니다');
    }

    this.matchType(TokenType.SEMICOLON); // ; 선택사항
    return expr;
  }

  /**
   * 표현식 파싱 (우선순위 고려)
   */
  private parseExpression(): ASTNode {
    return this.parseLogicalOr();
  }

  /**
   * || 연산
   */
  private parseLogicalOr(): ASTNode {
    let expr = this.parseLogicalAnd();

    while (this.matchType(TokenType.OR)) {
      const right = this.parseLogicalAnd();
      expr = {
        type: 'BinaryOp',
        operator: '||',
        left: expr,
        right
      };
    }

    return expr;
  }

  /**
   * && 연산
   */
  private parseLogicalAnd(): ASTNode {
    let expr = this.parseEquality();

    while (this.matchType(TokenType.AND)) {
      const right = this.parseEquality();
      expr = {
        type: 'BinaryOp',
        operator: '&&',
        left: expr,
        right
      };
    }

    return expr;
  }

  /**
   * 비교 연산: ==, !=
   */
  private parseEquality(): ASTNode {
    let expr = this.parseComparison();

    while (this.matchAnyType([TokenType.EQ, TokenType.NE])) {
      const op = this.previous().value;
      const right = this.parseComparison();
      expr = {
        type: 'BinaryOp',
        operator: op,
        left: expr,
        right
      };
    }

    return expr;
  }

  /**
   * 대소 비교: <, >, <=, >=
   */
  private parseComparison(): ASTNode {
    let expr = this.parseAdditive();

    while (this.matchAnyType([TokenType.LT, TokenType.GT, TokenType.LE, TokenType.GE])) {
      const op = this.previous().value;
      const right = this.parseAdditive();
      expr = {
        type: 'BinaryOp',
        operator: op,
        left: expr,
        right
      };
    }

    return expr;
  }

  /**
   * 덧셈/뺄셈
   */
  private parseAdditive(): ASTNode {
    let expr = this.parseMultiplicative();

    while (this.matchAnyType([TokenType.PLUS, TokenType.MINUS])) {
      const op = this.previous().value;
      const right = this.parseMultiplicative();
      expr = {
        type: 'BinaryOp',
        operator: op,
        left: expr,
        right
      };
    }

    return expr;
  }

  /**
   * 곱셈/나눗셈/나머지
   */
  private parseMultiplicative(): ASTNode {
    let expr = this.parseUnary();

    while (this.matchAnyType([TokenType.STAR, TokenType.SLASH, TokenType.PERCENT])) {
      const op = this.previous().value;
      const right = this.parseUnary();
      expr = {
        type: 'BinaryOp',
        operator: op,
        left: expr,
        right
      };
    }

    return expr;
  }

  /**
   * 단항 연산: -, !, &, *
   * v5.5: & (address-of), * (dereference) 추가
   */
  private parseUnary(): ASTNode {
    if (this.matchAnyType([TokenType.MINUS, TokenType.NOT, TokenType.BIT_AND, TokenType.STAR])) {
      const op = this.previous().value;
      const expr = this.parseUnary();
      return {
        type: 'UnaryOp',
        operator: op,
        operand: expr
      };
    }

    return this.parsePostfix();
  }

  /**
   * 후위 연산: 함수 호출, 배열 인덱싱, 구조체 멤버 접근
   */
  private parsePostfix(): ASTNode {
    let expr = this.parsePrimary();

    while (true) {
      if (this.matchType(TokenType.LPAREN)) {
        // 함수 호출
        const args = this.parseArguments();
        if (!this.matchType(TokenType.RPAREN)) {
          throw new Error(') 필요');
        }
        expr = {
          type: 'CallExpression',
          callee: expr,
          arguments: args
        };
      } else if (this.matchType(TokenType.LBRACKET)) {
        // 배열 인덱싱
        const index = this.parseExpression();
        if (!this.matchType(TokenType.RBRACKET)) {
          throw new Error('] 필요');
        }
        expr = {
          type: 'IndexExpression',
          object: expr,
          index
        };
      } else if (this.matchType(TokenType.DOT)) {
        // v5.7: 구조체 멤버 접근
        const fieldToken = this.current();
        if (!fieldToken || fieldToken.type !== TokenType.IDENT) {
          throw new Error('멤버 이름 필요');
        }
        const field = fieldToken.value;
        this.advance();
        expr = { type: 'MemberExpression', object: expr, field };
      } else {
        break;
      }
    }

    return expr;
  }

  /**
   * 기본 식
   */
  private parsePrimary(): ASTNode {
    const token = this.current();

    if (!token) {
      throw new Error('예상치 못한 종료');
    }

    // 숫자
    if (this.matchType(TokenType.NUMBER)) {
      return {
        type: 'NumberLiteral',
        value: parseFloat(this.previous().value)
      };
    }

    // 문자열
    if (this.matchType(TokenType.STRING)) {
      const text = this.previous().value;
      return {
        type: 'StringLiteral',
        value: text
      };
    }

    // true/false
    if (this.matchType(TokenType.TRUE)) {
      return {
        type: 'BooleanLiteral',
        value: true
      };
    }

    if (this.matchType(TokenType.FALSE)) {
      return {
        type: 'BooleanLiteral',
        value: false
      };
    }

    // v7.5: null 리터럴
    if (this.matchType(TokenType.NULL)) {
      return {
        type: 'NullLiteral',
        value: null
      };
    }

    // v7.0: NEW 표현식 (new ClassName())
    if (this.matchType(TokenType.NEW)) {
      const className = this.current().value;
      this.advance();  // 클래스 이름 소비
      if (!this.matchType(TokenType.LPAREN)) {
        throw new Error("'(' 필요");
      }
      const args = this.parseArguments();
      if (!this.matchType(TokenType.RPAREN)) {
        throw new Error("')' 필요");
      }
      return {
        type: 'NewExpression',
        className,
        arguments: args
      };
    }

    // v7.0: self 키워드
    if (this.matchType(TokenType.SELF)) {
      return {
        type: 'Identifier',
        name: 'self'
      };
    }

    // v7.1: super 키워드
    if (this.matchType(TokenType.SUPER)) {
      return {
        type: 'Identifier',
        name: 'super'
      };
    }

    // 식별자 또는 함수 호출
    if (this.matchType(TokenType.IDENT)) {
      const name = this.previous().value;

      // 함수 호출 (println, etc)
      if (this.checkType(TokenType.LPAREN)) {
        this.advance();
        const args = this.parseArguments();
        if (!this.matchType(TokenType.RPAREN)) {
          throw new Error(') 필요');
        }
        return {
          type: 'CallExpression',
          callee: {
            type: 'Identifier',
            name
          },
          arguments: args
        };
      }

      return {
        type: 'Identifier',
        name
      };
    }

    // 배열
    if (this.matchType(TokenType.LBRACKET)) {
      const elements: ASTNode[] = [];

      if (!this.checkType(TokenType.RBRACKET)) {
        do {
          elements.push(this.parseExpression());
        } while (this.matchType(TokenType.COMMA));
      }

      if (!this.matchType(TokenType.RBRACKET)) {
        throw new Error('] 필요');
      }

      return {
        type: 'ArrayLiteral',
        elements
      };
    }

    // 괄호
    if (this.matchType(TokenType.LPAREN)) {
      const expr = this.parseExpression();
      if (!this.matchType(TokenType.RPAREN)) {
        throw new Error(') 필요');
      }
      return expr;
    }

    throw new Error(`예상치 못한 토큰: ${token.value}`);
  }

  /**
   * 함수 인자 파싱
   */
  private parseArguments(): ASTNode[] {
    const args: ASTNode[] = [];

    if (!this.checkType(TokenType.RPAREN)) {
      do {
        args.push(this.parseExpression());
      } while (this.matchType(TokenType.COMMA));
    }

    return args;
  }

  // ========== 유틸리티 메서드 ==========

  private current(): Token | null {
    return this.pos < this.tokens.length ? this.tokens[this.pos] : null;
  }

  private previous(): Token {
    return this.tokens[this.pos - 1];
  }

  private isAtEnd(): boolean {
    return this.current() === null;
  }

  private checkType(type: TokenType): boolean {
    const token = this.current();
    return token ? token.type === type : false;
  }

  private matchType(type: TokenType): boolean {
    if (this.checkType(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private matchAnyType(types: TokenType[]): boolean {
    for (const type of types) {
      if (this.checkType(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private advance(): void {
    if (!this.isAtEnd()) {
      this.pos++;
    }
  }
}
