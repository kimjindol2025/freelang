/**
 * MVP Parser - AST Generator
 * 토큰을 Abstract Syntax Tree로 변환
 */

import { Token, TokenType } from './lexer';

export interface ASTNode {
  type: string;
}

export interface Program extends ASTNode {
  type: 'Program';
  statements: Statement[];
}

export type Statement = VariableDecl | IfStmt | WhileStmt | ExprStmt | BlockStmt | ReturnStmt;

export interface VariableDecl extends ASTNode {
  type: 'VariableDecl';
  name: string;
  value: Expression;
}

export interface IfStmt extends ASTNode {
  type: 'IfStmt';
  condition: Expression;
  consequent: Statement;
  alternate?: Statement;
}

export interface WhileStmt extends ASTNode {
  type: 'WhileStmt';
  condition: Expression;
  body: Statement;
}

export interface BlockStmt extends ASTNode {
  type: 'BlockStmt';
  statements: Statement[];
}

export interface ExprStmt extends ASTNode {
  type: 'ExprStmt';
  expression: Expression;
}

export interface ReturnStmt extends ASTNode {
  type: 'ReturnStmt';
  value?: Expression;
}

export type Expression =
  | BinaryOp
  | UnaryOp
  | Literal
  | Identifier
  | CallExpr
  | AssignmentExpr;

export interface AssignmentExpr extends ASTNode {
  type: 'AssignmentExpr';
  target: Identifier;
  value: Expression;
}

export interface BinaryOp extends ASTNode {
  type: 'BinaryOp';
  operator: string;
  left: Expression;
  right: Expression;
}

export interface UnaryOp extends ASTNode {
  type: 'UnaryOp';
  operator: string;
  operand: Expression;
}

export interface Literal extends ASTNode {
  type: 'Literal';
  value: string | number | boolean;
}

export interface Identifier extends ASTNode {
  type: 'Identifier';
  name: string;
}

export interface CallExpr extends ASTNode {
  type: 'CallExpr';
  callee: Identifier;
  arguments: Expression[];
}

export class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens.filter(t => t.type !== TokenType.NEWLINE);
  }

  /**
   * 현재 토큰
   */
  private current(): Token {
    return this.tokens[this.pos] || { type: TokenType.EOF, value: '', line: 0, col: 0 };
  }

  /**
   * 다음 토큰
   */
  private peek(): Token {
    return this.tokens[this.pos + 1] || { type: TokenType.EOF, value: '', line: 0, col: 0 };
  }

  /**
   * 토큰 매칭 및 이동
   */
  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.current().type === type) {
        this.pos++;
        return true;
      }
    }
    return false;
  }

  /**
   * 토큰 필수 확인
   */
  private expect(type: TokenType): Token {
    if (this.current().type !== type) {
      throw new Error(`Expected ${type} but got ${this.current().type}`);
    }
    const token = this.current();
    this.pos++;
    return token;
  }

  /**
   * 프로그램 파싱
   */
  parse(): Program {
    const statements: Statement[] = [];

    while (this.current().type !== TokenType.EOF) {
      statements.push(this.parseStatement());
    }

    return { type: 'Program', statements };
  }

  /**
   * Statement 파싱
   */
  private parseStatement(): Statement {
    if (this.current().type === TokenType.LET) {
      return this.parseVariableDecl();
    } else if (this.current().type === TokenType.IF) {
      return this.parseIfStmt();
    } else if (this.current().type === TokenType.WHILE) {
      return this.parseWhileStmt();
    } else if (this.current().type === TokenType.LBRACE) {
      return this.parseBlockStmt();
    } else if (this.current().type === TokenType.RETURN) {
      return this.parseReturnStmt();
    }

    return this.parseExprStmt();
  }

  /**
   * Variable Declaration 파싱
   */
  private parseVariableDecl(): VariableDecl {
    this.expect(TokenType.LET);
    const name = this.expect(TokenType.IDENTIFIER).value;
    this.expect(TokenType.ASSIGN);
    const value = this.parseExpression();
    this.match(TokenType.SEMICOLON);

    return { type: 'VariableDecl', name, value };
  }

  /**
   * If Statement 파싱
   */
  private parseIfStmt(): IfStmt {
    this.expect(TokenType.IF);
    this.expect(TokenType.LPAREN);
    const condition = this.parseExpression();
    this.expect(TokenType.RPAREN);

    const consequent = this.parseStatement();
    let alternate: Statement | undefined;

    if (this.match(TokenType.ELSE)) {
      alternate = this.parseStatement();
    }

    return { type: 'IfStmt', condition, consequent, alternate };
  }

  /**
   * While Statement 파싱
   */
  private parseWhileStmt(): WhileStmt {
    this.expect(TokenType.WHILE);
    this.expect(TokenType.LPAREN);
    const condition = this.parseExpression();
    this.expect(TokenType.RPAREN);

    const body = this.parseStatement();

    return { type: 'WhileStmt', condition, body };
  }

  /**
   * Block Statement 파싱
   */
  private parseBlockStmt(): BlockStmt {
    this.expect(TokenType.LBRACE);
    const statements: Statement[] = [];

    while (this.current().type !== TokenType.RBRACE && this.current().type !== TokenType.EOF) {
      statements.push(this.parseStatement());
    }

    this.expect(TokenType.RBRACE);

    return { type: 'BlockStmt', statements };
  }

  /**
   * Return Statement 파싱
   */
  private parseReturnStmt(): ReturnStmt {
    this.expect(TokenType.RETURN);
    let value: Expression | undefined;

    if (
      this.current().type !== TokenType.SEMICOLON &&
      this.current().type !== TokenType.RBRACE &&
      this.current().type !== TokenType.EOF
    ) {
      value = this.parseExpression();
    }

    this.match(TokenType.SEMICOLON);

    return { type: 'ReturnStmt', value };
  }

  /**
   * Expression Statement 파싱
   */
  private parseExprStmt(): ExprStmt {
    const expression = this.parseExpression();
    this.match(TokenType.SEMICOLON);

    return { type: 'ExprStmt', expression };
  }

  /**
   * Expression 파싱 (Assignment 포함)
   */
  private parseExpression(): Expression {
    return this.parseAssignment();
  }

  /**
   * Assignment 파싱
   */
  private parseAssignment(): Expression {
    let expr = this.parseComparison();

    if (this.current().type === TokenType.ASSIGN && expr.type === 'Identifier') {
      const target = expr as Identifier;
      this.pos++;
      const value = this.parseAssignment(); // 오른쪽 결합성
      return { type: 'AssignmentExpr', target, value };
    }

    return expr;
  }

  /**
   * Comparison 파싱
   */
  private parseComparison(): Expression {
    let expr = this.parseAdditive();

    while (this.match(TokenType.EQ, TokenType.NE, TokenType.LT, TokenType.LE, TokenType.GT, TokenType.GE)) {
      const operator = this.tokens[this.pos - 1].value;
      const right = this.parseAdditive();
      expr = { type: 'BinaryOp', operator, left: expr, right };
    }

    return expr;
  }

  /**
   * Additive 파싱
   */
  private parseAdditive(): Expression {
    let expr = this.parseMultiplicative();

    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.tokens[this.pos - 1].value;
      const right = this.parseMultiplicative();
      expr = { type: 'BinaryOp', operator, left: expr, right };
    }

    return expr;
  }

  /**
   * Multiplicative 파싱
   */
  private parseMultiplicative(): Expression {
    let expr = this.parsePrimary();

    while (this.match(TokenType.STAR, TokenType.SLASH, TokenType.PERCENT)) {
      const operator = this.tokens[this.pos - 1].value;
      const right = this.parsePrimary();
      expr = { type: 'BinaryOp', operator, left: expr, right };
    }

    return expr;
  }

  /**
   * Primary 파싱
   */
  private parsePrimary(): Expression {
    // Literal
    if (this.current().type === TokenType.NUMBER) {
      const value = parseFloat(this.current().value);
      this.pos++;
      return { type: 'Literal', value };
    }

    if (this.current().type === TokenType.STRING) {
      const value = this.current().value;
      this.pos++;
      return { type: 'Literal', value };
    }

    if (this.current().type === TokenType.TRUE) {
      this.pos++;
      return { type: 'Literal', value: true };
    }

    if (this.current().type === TokenType.FALSE) {
      this.pos++;
      return { type: 'Literal', value: false };
    }

    // Identifier or Call
    if (this.current().type === TokenType.IDENTIFIER) {
      const name = this.current().value;
      this.pos++;

      if (this.current().type === TokenType.LPAREN) {
        this.expect(TokenType.LPAREN);
        const args: Expression[] = [];

        if (this.current().type !== TokenType.RPAREN) {
          args.push(this.parseExpression());

          while (this.match(TokenType.COMMA)) {
            args.push(this.parseExpression());
          }
        }

        this.expect(TokenType.RPAREN);

        return { type: 'CallExpr', callee: { type: 'Identifier', name }, arguments: args };
      }

      return { type: 'Identifier', name };
    }

    // Parenthesized expression
    if (this.match(TokenType.LPAREN)) {
      const expr = this.parseExpression();
      this.expect(TokenType.RPAREN);
      return expr;
    }

    throw new Error(`Unexpected token: ${this.current().value}`);
  }
}

export function parse(tokens: Token[]): Program {
  return new Parser(tokens).parse();
}
