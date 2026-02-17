/**
 * Phase 18: IR Generator
 * Transforms AST → IR instruction array for VM execution
 *
 * Day 1-2 MVP: Literals + Arithmetic operations
 */

import { Inst, Op, AIIntent } from '../types';

export interface ASTNode {
  type: string;
  [key: string]: any;
}

export class IRGenerator {
  /**
   * AST → IR instructions
   * Example: BinaryOp('+', 1, 2) → [PUSH 1, PUSH 2, ADD, HALT]
   */
  generateIR(ast: ASTNode): Inst[] {
    const instructions: Inst[] = [];

    if (!ast) {
      instructions.push({ op: Op.PUSH, arg: 0 });
      instructions.push({ op: Op.HALT });
      return instructions;
    }

    this.traverse(ast, instructions);
    instructions.push({ op: Op.HALT });
    return instructions;
  }

  /**
   * Recursive traverse of AST nodes
   */
  private traverse(node: ASTNode, out: Inst[]): void {
    if (!node) return;

    switch (node.type) {
      // ── Literals ────────────────────────────────────────────
      case 'NumberLiteral':
      case 'number':
        out.push({ op: Op.PUSH, arg: node.value });
        break;

      case 'StringLiteral':
      case 'string':
        out.push({ op: Op.STR_NEW, arg: node.value });
        break;

      case 'BoolLiteral':
      case 'boolean':
        out.push({ op: Op.PUSH, arg: node.value ? 1 : 0 });
        break;

      // ── Binary Operations ───────────────────────────────────
      case 'BinaryOp':
        this.traverse(node.left, out);
        this.traverse(node.right, out);

        const opMap: Record<string, Op> = {
          '+': Op.ADD,
          '-': Op.SUB,
          '*': Op.MUL,
          '/': Op.DIV,
          '%': Op.MOD,
          '==': Op.EQ,
          '!=': Op.NEQ,
          '<': Op.LT,
          '>': Op.GT,
          '<=': Op.LTE,
          '>=': Op.GTE,
          '&&': Op.AND,
          '||': Op.OR,
        };

        const op = opMap[node.operator];
        if (op !== undefined) {
          out.push({ op });
        } else {
          throw new Error(`Unknown binary operator: ${node.operator}`);
        }
        break;

      // ── Unary Operations ────────────────────────────────────
      case 'UnaryOp':
        this.traverse(node.operand, out);
        if (node.operator === '-') {
          out.push({ op: Op.NEG });
        } else if (node.operator === '!') {
          out.push({ op: Op.NOT });
        } else {
          throw new Error(`Unknown unary operator: ${node.operator}`);
        }
        break;

      // ── Variables ───────────────────────────────────────────
      case 'Identifier':
        out.push({ op: Op.LOAD, arg: node.name });
        break;

      case 'Assignment':
        this.traverse(node.value, out);
        out.push({ op: Op.STORE, arg: node.name });
        break;

      // ── Block (multiple statements) ─────────────────────────
      case 'Block':
        if (node.statements && Array.isArray(node.statements)) {
          for (const stmt of node.statements) {
            this.traverse(stmt, out);
          }
        }
        break;

      // ── Control Flow (Basic) ────────────────────────────────
      case 'IfStatement':
        this.traverse(node.condition, out);
        const ifJmpIdx = out.length;
        out.push({ op: Op.JMP_NOT, arg: 0 }); // placeholder for false jump

        // Execute consequent (true branch)
        this.traverse(node.consequent, out);

        // If we have an else block, we need to jump over it after the consequent
        let elseJmpIdx = -1;
        if (node.alternate) {
          elseJmpIdx = out.length;
          out.push({ op: Op.JMP, arg: 0 }); // placeholder for end jump
        }

        // Patch the JMP_NOT to point to here (else block or end)
        out[ifJmpIdx].arg = out.length;

        // Execute alternate (else branch) if present
        if (node.alternate) {
          this.traverse(node.alternate, out);
          // Patch the final JMP to point to here (after else)
          out[elseJmpIdx].arg = out.length;
        }
        break;

      case 'WhileStatement':
        const loopStart = out.length;
        this.traverse(node.condition, out);
        const whileJmpIdx = out.length;
        out.push({ op: Op.JMP_NOT, arg: 0 }); // placeholder

        this.traverse(node.body, out);
        out.push({ op: Op.JMP, arg: loopStart });
        out[whileJmpIdx].arg = out.length; // patch jump target
        break;

      // ── Array Operations ────────────────────────────────────
      case 'ArrayLiteral':
        out.push({ op: Op.ARR_NEW });
        if (node.elements && Array.isArray(node.elements)) {
          for (const elem of node.elements) {
            this.traverse(elem, out);
            out.push({ op: Op.ARR_PUSH });
          }
        }
        break;

      case 'IndexAccess':
        this.traverse(node.array, out);
        this.traverse(node.index, out);
        out.push({ op: Op.ARR_GET });
        break;

      // ── Function Call ───────────────────────────────────────
      case 'CallExpression':
        if (node.arguments && Array.isArray(node.arguments)) {
          for (const arg of node.arguments) {
            this.traverse(arg, out);
          }
        }
        out.push({ op: Op.CALL, arg: node.callee, sub: [] });
        break;

      // ── Default (unknown node type) ─────────────────────────
      default:
        throw new Error(`Unknown AST node type: ${node.type}`);
    }
  }

  /**
   * Build AIIntent from AST (used by compiler pipeline)
   */
  buildIntent(functionName: string, params: string[], ast: ASTNode): AIIntent {
    const instructions = this.generateIR(ast);

    return {
      fn: functionName,
      params: params.map(name => ({ name, type: 'number' })),
      ret: 'number',
      body: instructions,
      meta: { generated_at: Date.now() }
    };
  }
}
