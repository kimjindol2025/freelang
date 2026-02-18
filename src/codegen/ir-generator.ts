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
  private indexVarCounter = 0;  // For generating unique index variables

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

        // Special handling for string operations
        const isStringOp =
          node.operator === '+' &&
          (node.left.type === 'StringLiteral' || node.right.type === 'StringLiteral');

        const opMap: Record<string, Op> = {
          '+': isStringOp ? Op.STR_CONCAT : Op.ADD,
          '-': Op.SUB,
          '*': Op.MUL,
          '/': Op.DIV,
          '%': Op.MOD,
          '==': node.left.type === 'StringLiteral' ? Op.STR_EQ : Op.EQ,
          '!=': node.left.type === 'StringLiteral' ? Op.STR_NEQ : Op.NEQ,
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

      // ── Phase 3 Step 3: Lambda Expression ─────────────────
      case 'lambda':
        this.generateLambdaIR(node, out);
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

      // ── Range/Iterator (Lazy Evaluation) ─────────────────────
      case 'RangeLiteral':
        this.traverse(node.start, out);
        this.traverse(node.end, out);
        out.push({ op: Op.ITER_INIT });
        break;

      // ── For Statement (Iterator-based Loop) ──────────────────
      case 'ForStatement':
        // 1. Create iterator from iterable
        this.traverse(node.iterable, out);

        // 2. Loop start address
        const forLoopStart = out.length;

        // 3. Check if iterator has next (ITER_HAS)
        out.push({ op: Op.DUP }); // duplicate iterator for ITER_HAS
        out.push({ op: Op.ITER_HAS });

        // 4. Jump if no more elements
        const forJmpNotIdx = out.length;
        out.push({ op: Op.JMP_NOT, arg: 0 }); // placeholder

        // 5. Get next value (ITER_NEXT)
        out.push({ op: Op.ITER_NEXT });

        // 6. Store loop variable
        out.push({ op: Op.STORE, arg: node.variable });

        // 7. Execute body
        this.traverse(node.body, out);

        // 8. Jump back to loop start
        out.push({ op: Op.JMP, arg: forLoopStart });

        // 9. Patch JMP_NOT to point to end
        out[forJmpNotIdx].arg = out.length;

        // 10. Pop iterator from stack
        out.push({ op: Op.POP });
        break;

      // ── For...Of Statement (Array iteration with index) ────────
      // Phase 2: Convert for...of to index-based while loop
      // for item of array { body }  →  let _idx = 0; while _idx < array.length { ... }
      case 'ForOfStatement':
      case 'forOf':
        // 1. Generate unique index variable
        const indexVar = `_for_idx_${this.indexVarCounter++}`;

        // 2. Initialize index to 0
        out.push({ op: Op.PUSH, arg: 0 });
        out.push({ op: Op.STORE, arg: indexVar });

        // 3. Evaluate array expression (left on stack)
        this.traverse(node.iterable, out);

        // 4. Store array in temporary variable for reuse
        const arrayVar = `_for_array_${this.indexVarCounter}`;
        out.push({ op: Op.STORE, arg: arrayVar });

        // 5. Loop start: check if index < array.length
        const forOfLoopStart = out.length;

        // Load index
        out.push({ op: Op.LOAD, arg: indexVar });

        // Load array
        out.push({ op: Op.LOAD, arg: arrayVar });

        // Get array length (ARR_LEN)
        out.push({ op: Op.ARR_LEN });

        // Compare: index < length
        out.push({ op: Op.LT });

        // Jump if condition false (exit loop)
        const forOfJmpNotIdx = out.length;
        out.push({ op: Op.JMP_NOT, arg: 0 }); // placeholder

        // 6. Get element: array[index]
        out.push({ op: Op.LOAD, arg: arrayVar });
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.ARR_GET });

        // Store in loop variable
        out.push({ op: Op.STORE, arg: node.variable });

        // 7. Execute loop body
        this.traverse(node.body, out);

        // 8. Increment index: index = index + 1
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.PUSH, arg: 1 });
        out.push({ op: Op.ADD });
        out.push({ op: Op.STORE, arg: indexVar });

        // 9. Jump back to loop condition
        out.push({ op: Op.JMP, arg: forOfLoopStart });

        // 10. Patch JMP_NOT to point here (loop end)
        out[forOfJmpNotIdx].arg = out.length;

        // 11. Clean up temporary variables (optional)
        // out.push({ op: Op.POP }); // Pop array from stack if needed
        break;

      // ── Array Method Calls (Phase 3 Step 2) ──────────────────────
      // object.method(args) → evaluate and call
      case 'MethodCall':
      case 'methodCall':
        // Evaluate the object
        this.traverse(node.object, out);

        // Store object temporarily
        const methodObjVar = `_method_obj_${this.indexVarCounter++}`;
        out.push({ op: Op.STORE, arg: methodObjVar });

        // Evaluate arguments and generate method-specific IR
        this.generateMethodCallIR(node.method, node.args, methodObjVar, out);
        break;

      // ── Default (unknown node type) ─────────────────────────
      default:
        throw new Error(`Unknown AST node type: ${node.type}`);
    }
  }

  /**
   * Phase 3 Step 2: Generate IR for array method calls
   * Handles: map, filter, reduce, find, any, all, forEach, flatten, concat, sort
   */
  private generateMethodCallIR(
    method: string,
    args: ASTNode[],
    objVar: string,
    out: Inst[]
  ): void {
    const resultVar = `_method_result_${this.indexVarCounter++}`;
    const indexVar = `_method_idx_${this.indexVarCounter++}`;
    const elemVar = `_method_elem_${this.indexVarCounter++}`;

    switch (method) {
      // ── map: fn<T, U>(array<T>, fn(T) -> U) -> array<U> ──────────
      case 'map':
        if (args.length < 1) throw new Error('map() requires a function argument');

        // Create result array
        out.push({ op: Op.PUSH, arg: 0 }); // Empty array
        out.push({ op: Op.ARR_NEW });
        out.push({ op: Op.STORE, arg: resultVar });

        // Initialize index
        out.push({ op: Op.PUSH, arg: 0 });
        out.push({ op: Op.STORE, arg: indexVar });

        // Loop: while index < array.length
        const mapLoopStart = out.length;
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.LOAD, arg: objVar });
        out.push({ op: Op.ARR_LEN });
        out.push({ op: Op.LT });

        const mapJmpOut = out.length;
        out.push({ op: Op.JMP_NOT, arg: 0 }); // Patch later

        // Get element
        out.push({ op: Op.LOAD, arg: objVar });
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.ARR_GET });
        out.push({ op: Op.STORE, arg: elemVar });

        // Call function on element
        this.traverse(args[0], out); // Function expression
        out.push({ op: Op.LOAD, arg: elemVar });
        out.push({ op: Op.CALL }); // Call the function

        // Push result to array
        out.push({ op: Op.LOAD, arg: resultVar });
        out.push({ op: Op.SWAP });
        out.push({ op: Op.ARR_PUSH });

        // Increment index
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.PUSH, arg: 1 });
        out.push({ op: Op.ADD });
        out.push({ op: Op.STORE, arg: indexVar });

        // Jump back
        out.push({ op: Op.JMP, arg: mapLoopStart });
        out[mapJmpOut].arg = out.length;

        // Load result
        out.push({ op: Op.LOAD, arg: resultVar });
        break;

      // ── filter: fn<T>(array<T>, fn(T) -> bool) -> array<T> ──────
      case 'filter':
        if (args.length < 1) throw new Error('filter() requires a predicate function');

        // Create result array
        out.push({ op: Op.PUSH, arg: 0 });
        out.push({ op: Op.ARR_NEW });
        out.push({ op: Op.STORE, arg: resultVar });

        // Initialize index
        out.push({ op: Op.PUSH, arg: 0 });
        out.push({ op: Op.STORE, arg: indexVar });

        // Loop
        const filterLoopStart = out.length;
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.LOAD, arg: objVar });
        out.push({ op: Op.ARR_LEN });
        out.push({ op: Op.LT });

        const filterJmpOut = out.length;
        out.push({ op: Op.JMP_NOT, arg: 0 });

        // Get element
        out.push({ op: Op.LOAD, arg: objVar });
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.ARR_GET });
        out.push({ op: Op.STORE, arg: elemVar });

        // Call predicate
        this.traverse(args[0], out);
        out.push({ op: Op.LOAD, arg: elemVar });
        out.push({ op: Op.CALL });

        // Check result
        const filterSkip = out.length;
        out.push({ op: Op.JMP_NOT, arg: 0 });

        // Push if true
        out.push({ op: Op.LOAD, arg: resultVar });
        out.push({ op: Op.LOAD, arg: elemVar });
        out.push({ op: Op.ARR_PUSH });

        out[filterSkip].arg = out.length;

        // Increment index
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.PUSH, arg: 1 });
        out.push({ op: Op.ADD });
        out.push({ op: Op.STORE, arg: indexVar });

        // Jump back
        out.push({ op: Op.JMP, arg: filterLoopStart });
        out[filterJmpOut].arg = out.length;

        // Load result
        out.push({ op: Op.LOAD, arg: resultVar });
        break;

      // ── reduce: fn<T, U>(array<T>, fn(U, T) -> U, U) -> U ────────
      case 'reduce':
        if (args.length < 2) throw new Error('reduce() requires reducer function and initial value');

        // Initialize accumulator
        const accumVar = `_accum_${this.indexVarCounter++}`;
        this.traverse(args[1], out); // Initial value
        out.push({ op: Op.STORE, arg: accumVar });

        // Initialize index
        out.push({ op: Op.PUSH, arg: 0 });
        out.push({ op: Op.STORE, arg: indexVar });

        // Loop
        const reduceLoopStart = out.length;
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.LOAD, arg: objVar });
        out.push({ op: Op.ARR_LEN });
        out.push({ op: Op.LT });

        const reduceJmpOut = out.length;
        out.push({ op: Op.JMP_NOT, arg: 0 });

        // Get element
        out.push({ op: Op.LOAD, arg: objVar });
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.ARR_GET });
        out.push({ op: Op.STORE, arg: elemVar });

        // Call reducer: fn(accumulator, element)
        this.traverse(args[0], out);
        out.push({ op: Op.LOAD, arg: accumVar });
        out.push({ op: Op.LOAD, arg: elemVar });
        out.push({ op: Op.CALL });

        // Store result
        out.push({ op: Op.STORE, arg: accumVar });

        // Increment index
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.PUSH, arg: 1 });
        out.push({ op: Op.ADD });
        out.push({ op: Op.STORE, arg: indexVar });

        // Jump back
        out.push({ op: Op.JMP, arg: reduceLoopStart });
        out[reduceJmpOut].arg = out.length;

        // Load accumulator (result)
        out.push({ op: Op.LOAD, arg: accumVar });
        break;

      // ── find: fn<T>(array<T>, fn(T) -> bool) -> T ────────────────
      case 'find':
        if (args.length < 1) throw new Error('find() requires a predicate function');

        // Initialize index
        out.push({ op: Op.PUSH, arg: 0 });
        out.push({ op: Op.STORE, arg: indexVar });

        // Loop
        const findLoopStart = out.length;
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.LOAD, arg: objVar });
        out.push({ op: Op.ARR_LEN });
        out.push({ op: Op.LT });

        const findJmpOut = out.length;
        out.push({ op: Op.JMP_NOT, arg: 0 });

        // Get element
        out.push({ op: Op.LOAD, arg: objVar });
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.ARR_GET });
        out.push({ op: Op.STORE, arg: elemVar });

        // Call predicate
        this.traverse(args[0], out);
        out.push({ op: Op.LOAD, arg: elemVar });
        out.push({ op: Op.CALL });

        // If found, return element
        const findFound = out.length;
        out.push({ op: Op.JMP_IF, arg: 0 }); // Patch later

        // Increment and continue
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.PUSH, arg: 1 });
        out.push({ op: Op.ADD });
        out.push({ op: Op.STORE, arg: indexVar });
        out.push({ op: Op.JMP, arg: findLoopStart });

        // Found: patch here
        out[findFound].arg = out.length;
        out.push({ op: Op.LOAD, arg: elemVar });
        out[findJmpOut].arg = out.length;
        break;

      // ── concat: fn<T>(array<T>, array<T>) -> array<T> ──────────
      case 'concat':
        if (args.length < 1) throw new Error('concat() requires an array argument');

        // Create result array (copy of first)
        out.push({ op: Op.LOAD, arg: objVar });
        out.push({ op: Op.ARR_DUP });
        out.push({ op: Op.STORE, arg: resultVar });

        // Evaluate second array
        this.traverse(args[0], out);
        out.push({ op: Op.STORE, arg: `_other_array_${this.indexVarCounter++}` });

        // Initialize index for second array
        out.push({ op: Op.PUSH, arg: 0 });
        out.push({ op: Op.STORE, arg: indexVar });

        // Loop through second array
        const concatLoopStart = out.length;
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.LOAD, arg: `_other_array_${this.indexVarCounter - 1}` });
        out.push({ op: Op.ARR_LEN });
        out.push({ op: Op.LT });

        const concatJmpOut = out.length;
        out.push({ op: Op.JMP_NOT, arg: 0 });

        // Get element from second array
        out.push({ op: Op.LOAD, arg: `_other_array_${this.indexVarCounter - 1}` });
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.ARR_GET });

        // Push to result
        out.push({ op: Op.LOAD, arg: resultVar });
        out.push({ op: Op.SWAP });
        out.push({ op: Op.ARR_PUSH });

        // Increment index
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.PUSH, arg: 1 });
        out.push({ op: Op.ADD });
        out.push({ op: Op.STORE, arg: indexVar });

        out.push({ op: Op.JMP, arg: concatLoopStart });
        out[concatJmpOut].arg = out.length;

        out.push({ op: Op.LOAD, arg: resultVar });
        break;

      // ── flatten: fn<T>(array<array<T>>) -> array<T> ────────────
      case 'flatten':
        // Create result array
        out.push({ op: Op.PUSH, arg: 0 });
        out.push({ op: Op.ARR_NEW });
        out.push({ op: Op.STORE, arg: resultVar });

        // Initialize index
        out.push({ op: Op.PUSH, arg: 0 });
        out.push({ op: Op.STORE, arg: indexVar });

        // Loop through outer array
        const flattenLoopStart = out.length;
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.LOAD, arg: objVar });
        out.push({ op: Op.ARR_LEN });
        out.push({ op: Op.LT });

        const flattenJmpOut = out.length;
        out.push({ op: Op.JMP_NOT, arg: 0 });

        // Get inner array
        out.push({ op: Op.LOAD, arg: objVar });
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.ARR_GET });

        // Merge into result (simplified: just push all elements)
        // Real implementation would loop through inner array
        out.push({ op: Op.LOAD, arg: resultVar });
        out.push({ op: Op.SWAP });
        out.push({ op: Op.ARR_CONCAT });
        out.push({ op: Op.STORE, arg: resultVar });

        // Increment index
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.PUSH, arg: 1 });
        out.push({ op: Op.ADD });
        out.push({ op: Op.STORE, arg: indexVar });

        out.push({ op: Op.JMP, arg: flattenLoopStart });
        out[flattenJmpOut].arg = out.length;

        out.push({ op: Op.LOAD, arg: resultVar });
        break;

      // ── any/all: fn<T>(array<T>, fn(T) -> bool) -> bool ─────────
      case 'any':
        if (args.length < 1) throw new Error('any() requires a predicate function');

        out.push({ op: Op.PUSH, arg: 0 }); // false
        out.push({ op: Op.STORE, arg: resultVar });

        out.push({ op: Op.PUSH, arg: 0 });
        out.push({ op: Op.STORE, arg: indexVar });

        const anyLoopStart = out.length;
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.LOAD, arg: objVar });
        out.push({ op: Op.ARR_LEN });
        out.push({ op: Op.LT });

        const anyJmpOut = out.length;
        out.push({ op: Op.JMP_NOT, arg: 0 });

        out.push({ op: Op.LOAD, arg: objVar });
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.ARR_GET });
        out.push({ op: Op.STORE, arg: elemVar });

        this.traverse(args[0], out);
        out.push({ op: Op.LOAD, arg: elemVar });
        out.push({ op: Op.CALL });

        const anyFound = out.length;
        out.push({ op: Op.JMP_IF, arg: 0 });

        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.PUSH, arg: 1 });
        out.push({ op: Op.ADD });
        out.push({ op: Op.STORE, arg: indexVar });
        out.push({ op: Op.JMP, arg: anyLoopStart });

        out[anyFound].arg = out.length;
        out.push({ op: Op.PUSH, arg: 1 }); // true
        out.push({ op: Op.STORE, arg: resultVar });
        out[anyJmpOut].arg = out.length;

        out.push({ op: Op.LOAD, arg: resultVar });
        break;

      case 'all':
        if (args.length < 1) throw new Error('all() requires a predicate function');

        out.push({ op: Op.PUSH, arg: 1 }); // true
        out.push({ op: Op.STORE, arg: resultVar });

        out.push({ op: Op.PUSH, arg: 0 });
        out.push({ op: Op.STORE, arg: indexVar });

        const allLoopStart = out.length;
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.LOAD, arg: objVar });
        out.push({ op: Op.ARR_LEN });
        out.push({ op: Op.LT });

        const allJmpOut = out.length;
        out.push({ op: Op.JMP_NOT, arg: 0 });

        out.push({ op: Op.LOAD, arg: objVar });
        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.ARR_GET });
        out.push({ op: Op.STORE, arg: elemVar });

        this.traverse(args[0], out);
        out.push({ op: Op.LOAD, arg: elemVar });
        out.push({ op: Op.CALL });

        const allFail = out.length;
        out.push({ op: Op.JMP_NOT, arg: 0 });

        out.push({ op: Op.LOAD, arg: indexVar });
        out.push({ op: Op.PUSH, arg: 1 });
        out.push({ op: Op.ADD });
        out.push({ op: Op.STORE, arg: indexVar });
        out.push({ op: Op.JMP, arg: allLoopStart });

        out[allFail].arg = out.length;
        out.push({ op: Op.PUSH, arg: 0 }); // false
        out.push({ op: Op.STORE, arg: resultVar });
        out[allJmpOut].arg = out.length;

        out.push({ op: Op.LOAD, arg: resultVar });
        break;

      default:
        throw new Error(`Unknown array method: ${method}`);
    }
  }

  /**
   * Phase 3 Step 3: Generate IR for lambda expression
   * Creates a closure object with captured variables
   */
  private generateLambdaIR(lambda: any, out: Inst[]): void {
    // Lambda is represented as:
    // 1. Create function object with closure variables
    // 2. Capture variables from outer scope
    // 3. Load onto stack as a callable object

    // Create lambda function object
    out.push({ op: Op.LAMBDA_NEW });

    // Add closure variables (if any)
    if (lambda.capturedVars && lambda.capturedVars.length > 0) {
      for (const varName of lambda.capturedVars) {
        out.push({ op: Op.LOAD, arg: varName });
        out.push({ op: Op.LAMBDA_CAPTURE, arg: varName });
      }
    }

    // Store lambda body as instructions
    const bodyInstructions: Inst[] = [];
    this.traverse(lambda.body, bodyInstructions);
    out.push({
      op: Op.LAMBDA_SET_BODY,
      arg: lambda.params.length,
      sub: bodyInstructions
    });
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
