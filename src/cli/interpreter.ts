/**
 * Simple Interpreter - AST 직접 실행
 */

export interface ASTNode {
  type: string;
  [key: string]: any;
}

export class SimpleInterpreter {
  private variables: Map<string, any> = new Map();
  private output: string[] = [];

  constructor() {
    // 내장 함수들
    this.variables.set('println', this.println.bind(this));
  }

  /**
   * AST 실행
   */
  public execute(ast: ASTNode): any {
    return this.eval(ast);
  }

  /**
   * 출력 결과 (마지막 항목만)
   */
  public getOutput(): string {
    if (this.output.length === 0) return '';
    const last = this.output[this.output.length - 1];
    this.output.pop(); // 꺼낸 후 제거
    return last;
  }

  /**
   * 평가 함수
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

      case 'ArrayLiteral':
        return node.elements.map((e: ASTNode) => this.eval(e));

      case 'BinaryOp':
        return this.evalBinaryOp(node);

      case 'UnaryOp':
        return this.evalUnaryOp(node);

      case 'CallExpression':
        return this.evalCall(node);

      case 'VariableDeclaration':
        const val = this.eval(node.value);
        this.variables.set(node.name, val);
        return val;

      case 'IfStatement':
        const cond = this.eval(node.condition);
        if (cond) {
          return this.eval(node.thenBranch);
        } else if (node.elseBranch) {
          return this.eval(node.elseBranch);
        }
        return null;

      case 'WhileStatement':
        let result = null;
        while (this.eval(node.condition)) {
          result = this.eval(node.body);
        }
        return result;

      case 'BlockStatement':
        let blockResult = null;
        for (const stmt of node.statements) {
          blockResult = this.eval(stmt);
        }
        return blockResult;

      default:
        throw new Error(`Unknown AST node type: ${node.type}`);
    }
  }

  /**
   * 이항 연산
   */
  private evalBinaryOp(node: ASTNode): any {
    const left = this.eval(node.left);
    const right = this.eval(node.right);
    const op = node.operator;

    // 산술
    if (op === '+') return left + right;
    if (op === '-') return left - right;
    if (op === '*') return left * right;
    if (op === '/') return Math.floor(left / right);
    if (op === '%') return left % right;

    // 비교
    if (op === '==') return left === right ? 1 : 0;
    if (op === '!=') return left !== right ? 1 : 0;
    if (op === '<') return left < right ? 1 : 0;
    if (op === '>') return left > right ? 1 : 0;
    if (op === '<=') return left <= right ? 1 : 0;
    if (op === '>=') return left >= right ? 1 : 0;

    // 논리
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
}
