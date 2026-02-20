/**
 * MVP Interpreter - AST 실행
 * Abstract Syntax Tree를 실행하여 프로그램 동작 수행
 */

import {
  Program,
  Statement,
  Expression,
  VariableDecl,
  IfStmt,
  WhileStmt,
  BlockStmt,
  ExprStmt,
  ReturnStmt,
  BinaryOp,
  UnaryOp,
  Literal,
  Identifier,
  CallExpr,
  AssignmentExpr
} from './parser';
import { loadV4StdlibFunctions } from './stdlib-loader';

class ReturnValue extends Error {
  constructor(public value: any) {
    super();
  }
}

export class Interpreter {
  private globalScope: Map<string, any> = new Map();
  private currentScope: Map<string, any> = this.globalScope;
  private scopes: Map<string, any>[] = [this.globalScope];

  constructor() {
    // 기본 내장 함수 (원본)
    this.globalScope.set('print', (...args: any[]) => {
      console.log(...args);
      return undefined;
    });

    this.globalScope.set('len', (val: any) => {
      if (typeof val === 'string') return val.length;
      if (Array.isArray(val)) return val.length;
      return 0;
    });

    this.globalScope.set('type', (val: any) => {
      if (val === null) return 'null';
      if (val === undefined) return 'undefined';
      if (Array.isArray(val)) return 'array';
      return typeof val;
    });

    this.globalScope.set('parseInt', (val: any) => {
      return parseInt(String(val), 10);
    });

    this.globalScope.set('parseFloat', (val: any) => {
      return parseFloat(String(val));
    });

    this.globalScope.set('toString', (val: any) => {
      return String(val);
    });

    // v4 stdlib 함수 로드 (100+ 함수)
    const stdlib = loadV4StdlibFunctions();
    for (const [name, fn] of Object.entries(stdlib)) {
      this.globalScope.set(name, fn);
    }
  }

  /**
   * 프로그램 실행
   */
  interpret(program: Program): any {
    try {
      this.executeBlock(program.statements);
      return undefined;
    } catch (error) {
      if (error instanceof ReturnValue) {
        return error.value;
      }
      throw error;
    }
  }

  /**
   * 블록 실행 (새 스코프)
   */
  private executeBlock(statements: Statement[]): any {
    // 새로운 빈 스코프 추가 (이전 scope 복사하지 않음)
    const newScope = new Map<string, any>();
    this.scopes.push(newScope);

    try {
      for (const stmt of statements) {
        this.executeStatement(stmt);
      }
    } finally {
      this.scopes.pop();
    }
  }

  /**
   * Statement 실행
   */
  private executeStatement(stmt: Statement): any {
    if (stmt.type === 'VariableDecl') {
      return this.executeVariableDecl(stmt as VariableDecl);
    } else if (stmt.type === 'IfStmt') {
      return this.executeIfStmt(stmt as IfStmt);
    } else if (stmt.type === 'WhileStmt') {
      return this.executeWhileStmt(stmt as WhileStmt);
    } else if (stmt.type === 'BlockStmt') {
      return this.executeBlock((stmt as BlockStmt).statements);
    } else if (stmt.type === 'ExprStmt') {
      return this.evaluateExpression((stmt as ExprStmt).expression);
    } else if (stmt.type === 'ReturnStmt') {
      const value = (stmt as ReturnStmt).value
        ? this.evaluateExpression((stmt as ReturnStmt).value)
        : undefined;
      throw new ReturnValue(value);
    }
  }

  /**
   * Variable Declaration 실행
   */
  private executeVariableDecl(stmt: VariableDecl): any {
    const value = this.evaluateExpression(stmt.value);
    this.currentScope.set(stmt.name, value);
    return value;
  }

  /**
   * If Statement 실행
   */
  private executeIfStmt(stmt: IfStmt): any {
    const condition = this.evaluateExpression(stmt.condition);
    if (this.isTruthy(condition)) {
      return this.executeStatement(stmt.consequent);
    } else if (stmt.alternate) {
      return this.executeStatement(stmt.alternate);
    }
  }

  /**
   * While Statement 실행
   */
  private executeWhileStmt(stmt: WhileStmt): any {
    while (this.isTruthy(this.evaluateExpression(stmt.condition))) {
      try {
        this.executeStatement(stmt.body);
      } catch (error) {
        if (error instanceof ReturnValue) {
          throw error;
        }
        throw error;
      }
    }
  }

  /**
   * Expression 평가
   */
  private evaluateExpression(expr: Expression): any {
    if (expr.type === 'Literal') {
      return (expr as Literal).value;
    } else if (expr.type === 'Identifier') {
      const name = (expr as Identifier).name;
      for (let i = this.scopes.length - 1; i >= 0; i--) {
        if (this.scopes[i].has(name)) {
          return this.scopes[i].get(name);
        }
      }
      throw new Error(`Undefined variable: ${name}`);
    } else if (expr.type === 'BinaryOp') {
      return this.evaluateBinaryOp(expr as BinaryOp);
    } else if (expr.type === 'UnaryOp') {
      return this.evaluateUnaryOp(expr as UnaryOp);
    } else if (expr.type === 'CallExpr') {
      return this.evaluateCallExpr(expr as CallExpr);
    } else if (expr.type === 'AssignmentExpr') {
      return this.evaluateAssignment(expr as AssignmentExpr);
    }
  }

  /**
   * Assignment 평가
   */
  private evaluateAssignment(expr: AssignmentExpr): any {
    const value = this.evaluateExpression(expr.value);
    const name = expr.target.name;

    // 현재 스코프에서 변수 찾기
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i].has(name)) {
        this.scopes[i].set(name, value);
        return value;
      }
    }

    throw new Error(`Undefined variable: ${name}`);
  }

  /**
   * Binary Operation 평가
   */
  private evaluateBinaryOp(expr: BinaryOp): any {
    const left = this.evaluateExpression(expr.left);
    const right = this.evaluateExpression(expr.right);

    switch (expr.operator) {
      case '+':
        return left + right;
      case '-':
        return left - right;
      case '*':
        return left * right;
      case '/':
        if (right === 0) throw new Error('Division by zero');
        return left / right;
      case '%':
        return left % right;
      case '==':
        return left == right;
      case '!=':
        return left != right;
      case '<':
        return left < right;
      case '<=':
        return left <= right;
      case '>':
        return left > right;
      case '>=':
        return left >= right;
      default:
        throw new Error(`Unknown operator: ${expr.operator}`);
    }
  }

  /**
   * Unary Operation 평가
   */
  private evaluateUnaryOp(expr: UnaryOp): any {
    const operand = this.evaluateExpression(expr.operand);

    switch (expr.operator) {
      case '-':
        return -operand;
      case '!':
        return !this.isTruthy(operand);
      default:
        throw new Error(`Unknown unary operator: ${expr.operator}`);
    }
  }

  /**
   * Function Call 평가
   */
  private evaluateCallExpr(expr: CallExpr): any {
    const funcName = expr.callee.name;
    const func = this.findVariable(funcName);

    if (typeof func !== 'function') {
      throw new Error(`${funcName} is not a function`);
    }

    const args = expr.arguments.map(arg => this.evaluateExpression(arg));
    return func(...args);
  }

  /**
   * 변수 검색 (스코프 체인)
   */
  private findVariable(name: string): any {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i].has(name)) {
        return this.scopes[i].get(name);
      }
    }
    throw new Error(`Undefined variable: ${name}`);
  }

  /**
   * Truthy 판정
   */
  private isTruthy(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.length > 0;
    return true;
  }
}

export function interpret(program: Program): any {
  return new Interpreter().interpret(program);
}
