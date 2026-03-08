# IR Generator Implementation Guide (Phase A-3)

**Objective**: Implement `ir-generator.fl` - FreeLang-to-FreeLang compiler for self-hosting

**Status**: ⏳ READY FOR IMPLEMENTATION
**Estimated Time**: 10-12 hours
**Lines of Code**: 500-600 lines

---

## Overview

The IR (Intermediate Representation) Generator converts the AST (Abstract Syntax Tree) from the parser into a sequence of VM instructions that can be executed by the FreeLang Virtual Machine.

### Input
```
Module AST {
  functions: [FunctionDef, ...],
  variables: [VarDef, ...],
  errors: [ParseError, ...]
}
```

### Output
```
array<IRInstruction> [
  {op: "PUSH", arg1: 42, arg2: null, line: 1},
  {op: "STORE", arg1: 0, arg2: null, line: 1},
  {op: "PUSH", arg1: 0, arg2: null, line: 2},
  {op: "RET", arg1: null, arg2: null, line: 3}
]
```

---

## IR Instruction Set (Complete)

### 1. Stack Operations (3 instructions)

```
PUSH <value>         // Push constant onto stack
  arg1: literal value (number, string, boolean)
  arg2: null

POP                  // Discard top of stack
  arg1: null
  arg2: null

DUP                  // Duplicate top of stack
  arg1: null
  arg2: null
```

### 2. Arithmetic Operations (5 instructions)

```
ADD                  // Stack: [a, b] → [a+b]
SUB                  // Stack: [a, b] → [a-b]
MUL                  // Stack: [a, b] → [a*b]
DIV                  // Stack: [a, b] → [a/b]
MOD                  // Stack: [a, b] → [a%b]
NEG                  // Stack: [a] → [-a]
```

### 3. Comparison Operations (6 instructions)

```
EQ                   // Stack: [a, b] → [a==b]
NE                   // Stack: [a, b] → [a!=b]
LT                   // Stack: [a, b] → [a<b]
LE                   // Stack: [a, b] → [a<=b]
GT                   // Stack: [a, b] → [a>b]
GE                   // Stack: [a, b] → [a>=b]
```

### 4. Logical Operations (3 instructions)

```
AND                  // Stack: [a, b] → [a&&b]
OR                   // Stack: [a, b] → [a||b]
NOT                  // Stack: [a] → [!a]
```

### 5. Variable Operations (3 instructions)

```
STORE <slot>         // Pop value, store in local variable slot
  arg1: slot index (0, 1, 2, ...)
  arg2: null

LOAD <slot>          // Push value from local variable slot
  arg1: slot index
  arg2: null

LOAD_GLOBAL <name>   // Push global variable value
  arg1: variable name (string)
  arg2: null
```

### 6. Control Flow (3 instructions)

```
JMP <target>         // Jump to instruction at offset
  arg1: instruction offset
  arg2: null

JIF <target>         // Jump if top of stack is false
  arg1: instruction offset
  arg2: null

JIT <target>         // Jump if top of stack is true
  arg1: instruction offset
  arg2: null
```

### 7. Function Operations (2 instructions)

```
CALL <name> <argc>   // Call function with N arguments
  arg1: function name (string)
  arg2: argument count (number)

RET                  // Return from function
  arg1: null
  arg2: null
```

### 8. Array Operations (3 instructions)

```
ARRAY_NEW <size>     // Create array of size
  arg1: array size
  arg2: null

ARRAY_LOAD <idx>     // Load array[idx]
  arg1: index offset on stack
  arg2: null

ARRAY_STORE <idx>    // Store to array[idx]
  arg1: index offset on stack
  arg2: null
```

### 9. Map Operations (3 instructions)

```
MAP_NEW              // Create empty map
  arg1: null
  arg2: null

MAP_LOAD <key>       // Load map[key]
  arg1: key (string or expression)
  arg2: null

MAP_STORE <key>      // Store to map[key]
  arg1: key (string or expression)
  arg2: null
```

### 10. Miscellaneous (3 instructions)

```
PRINT                // Print top of stack (for debugging)
  arg1: null
  arg2: null

ASSERT               // Debug assertion
  arg1: null
  arg2: null

NOP                  // No operation (placeholder)
  arg1: null
  arg2: null
```

---

## Implementation Strategy

### Step 1: Basic Structure (100 lines)

```fl
/**
 * IR Generator - Convert AST to VM Instructions
 * Replaces src/codegen/ir-generator.ts in FreeLang
 */

struct IRInstruction {
  op: string,        // "PUSH", "ADD", "CALL", etc.
  arg1: any,         // First argument (varies by op)
  arg2: any,         // Second argument (optional)
  line: int          // Source line for debugging
}

// Global compilation context
struct CompileContext {
  ir: array,         // IR instructions array
  localSlots: map,   // Variable name → slot index
  slotIndex: int,    // Next available slot
  line: int          // Current source line
}

fn createContext() -> CompileContext {
  return {
    ir: [],
    localSlots: {},
    slotIndex: 0,
    line: 1
  }
}

// Helper: Add IR instruction
fn emit(ctx: CompileContext, op: string, arg1: any, arg2: any, line: int) -> null {
  let instr = {
    op: op,
    arg1: arg1,
    arg2: arg2,
    line: line
  }
  arr.push(ctx.ir, instr)
  return null
}

// Main entry point
fn generateIR(ast) -> array {
  let ctx = createContext()

  // Process top-level declarations
  if ast.variables {
    // Compile variable declarations
  }

  if ast.functions {
    // Compile function definitions
  }

  return ctx.ir
}
```

### Step 2: Expression Compilation (150 lines)

```fl
fn compileExpression(ctx, expr) -> null {
  if expr.type == "Literal" {
    // PUSH <value>
    emit(ctx, "PUSH", expr.value, null, expr.line)
  }
  else if expr.type == "Identifier" {
    // LOAD <slot> or LOAD_GLOBAL <name>
    let slot = map.get(ctx.localSlots, expr.name)
    if slot != null {
      emit(ctx, "LOAD", slot, null, expr.line)
    } else {
      emit(ctx, "LOAD_GLOBAL", expr.name, null, expr.line)
    }
  }
  else if expr.type == "BinaryOp" {
    // Left operand
    compileExpression(ctx, expr.left)
    // Right operand
    compileExpression(ctx, expr.right)
    // Operation
    let opMap = {
      "+": "ADD",
      "-": "SUB",
      "*": "MUL",
      "/": "DIV",
      "%": "MOD",
      "==": "EQ",
      "!=": "NE",
      "<": "LT",
      "<=": "LE",
      ">": "GT",
      ">=": "GE",
      "&&": "AND",
      "||": "OR"
    }
    let op = map.get(opMap, expr.op)
    if op {
      emit(ctx, op, null, null, expr.line)
    }
  }
  else if expr.type == "UnaryOp" {
    // Operand
    compileExpression(ctx, expr.operand)
    // Operation
    if expr.op == "-" {
      emit(ctx, "NEG", null, null, expr.line)
    }
    else if expr.op == "!" {
      emit(ctx, "NOT", null, null, expr.line)
    }
  }
  else if expr.type == "CallExpression" {
    // Compile arguments
    let argCount = 0
    if expr.args {
      for arg in expr.args {
        compileExpression(ctx, arg)
        argCount = argCount + 1
      }
    }
    // Call function
    emit(ctx, "CALL", expr.callee.name, argCount, expr.line)
  }
  else if expr.type == "ArrayLiteral" {
    // Create array
    let size = 0
    if expr.elements {
      size = arr.len(expr.elements)
    }
    emit(ctx, "ARRAY_NEW", size, null, expr.line)
    // TODO: Initialize elements
  }
  else if expr.type == "MapLiteral" {
    // Create map
    emit(ctx, "MAP_NEW", null, null, expr.line)
    // TODO: Initialize entries
  }

  return null
}
```

### Step 3: Statement Compilation (150 lines)

```fl
fn compileStatement(ctx, stmt) -> null {
  if stmt.type == "LetDeclaration" {
    // Assign slot
    let slot = ctx.slotIndex
    ctx.slotIndex = ctx.slotIndex + 1
    map.set(ctx.localSlots, stmt.name, slot)

    // Compile initializer expression
    if stmt.init {
      compileExpression(ctx, stmt.init)
    } else {
      emit(ctx, "PUSH", null, null, stmt.line)
    }

    // Store to slot
    emit(ctx, "STORE", slot, null, stmt.line)
  }
  else if stmt.type == "IfStatement" {
    // Compile condition
    compileExpression(ctx, stmt.condition)

    // Jump to else if condition is false
    let jifIndex = arr.len(ctx.ir)
    emit(ctx, "JIF", 0, null, stmt.line)  // Placeholder offset

    // Compile then block
    compileBlock(ctx, stmt.then)

    // Patch JIF target
    let thenLen = arr.len(ctx.ir)
    ctx.ir[jifIndex].arg1 = thenLen

    // Compile else block if present
    if stmt.else {
      compileBlock(ctx, stmt.else)
    }
  }
  else if stmt.type == "WhileStatement" {
    // Loop start position
    let loopStart = arr.len(ctx.ir)

    // Compile condition
    compileExpression(ctx, stmt.condition)

    // Jump out if false
    let jifIndex = arr.len(ctx.ir)
    emit(ctx, "JIF", 0, null, stmt.line)  // Placeholder

    // Compile body
    compileBlock(ctx, stmt.body)

    // Jump back to loop start
    emit(ctx, "JMP", loopStart, null, stmt.line)

    // Patch JIF target
    ctx.ir[jifIndex].arg1 = arr.len(ctx.ir)
  }
  else if stmt.type == "ReturnStatement" {
    // Compile return value
    if stmt.value {
      compileExpression(ctx, stmt.value)
    } else {
      emit(ctx, "PUSH", null, null, stmt.line)
    }

    // Return
    emit(ctx, "RET", null, null, stmt.line)
  }
  else if stmt.type == "ExpressionStatement" {
    // Compile expression
    compileExpression(ctx, stmt.expression)
    // Pop result (not used)
    emit(ctx, "POP", null, null, stmt.line)
  }
  else if stmt.type == "BlockStatement" {
    // Compile each statement
    compileBlock(ctx, stmt)
  }

  return null
}

fn compileBlock(ctx, block) -> null {
  if block.statements {
    for stmt in block.statements {
      compileStatement(ctx, stmt)
    }
  }
  return null
}
```

### Step 4: Function Compilation (100 lines)

```fl
fn compileFunction(ctx, fn_def) -> null {
  // Save function start position
  let fnStart = arr.len(ctx.ir)

  // Create new context for function scope
  let fnCtx = {
    ir: ctx.ir,
    localSlots: {},
    slotIndex: 0,
    line: fn_def.line
  }

  // Add parameters as local variables
  if fn_def.params {
    for param in fn_def.params {
      let slot = fnCtx.slotIndex
      fnCtx.slotIndex = fnCtx.slotIndex + 1
      map.set(fnCtx.localSlots, param.name, slot)
    }
  }

  // Compile function body
  compileBlock(fnCtx, fn_def.body)

  // If no return statement, add implicit return
  let lastInstr = ctx.ir[arr.len(ctx.ir) - 1]
  if lastInstr.op != "RET" {
    emit(fnCtx, "PUSH", null, null, fn_def.line)
    emit(fnCtx, "RET", null, null, fn_def.line)
  }

  return null
}
```

### Step 5: Module Compilation (50 lines)

```fl
fn generateIR(ast) -> array {
  let ctx = createContext()

  // Compile global variables
  if ast.variables {
    for varDecl in ast.variables {
      compileStatement(ctx, varDecl)
    }
  }

  // Compile functions
  if ast.functions {
    for fnDef in ast.functions {
      compileFunction(ctx, fnDef)
    }
  }

  // Add EOF marker
  emit(ctx, "NOP", null, null, 0)

  return ctx.ir
}
```

---

## Testing Strategy

### Unit Tests (for each component)

```fl
// test-ir-literals.fl
fn testLiterals() {
  let source = "let x = 42"
  let tokens = tokenize(source)
  let ast = parseModule(tokens)
  let ir = generateIR(ast)

  // First instruction should be PUSH 42
  if ir[0].op == "PUSH" && ir[0].arg1 == 42 {
    return true
  }
  return false
}

// test-ir-binary-ops.fl
fn testBinaryOp() {
  let source = "let y = 10 + 5"
  let tokens = tokenize(source)
  let ast = parseModule(tokens)
  let ir = generateIR(ast)

  // Should contain: PUSH 10, PUSH 5, ADD, STORE 0
  let hasAdd = false
  for instr in ir {
    if instr.op == "ADD" {
      hasAdd = true
    }
  }
  return hasAdd
}

// test-ir-functions.fl
fn testFunctions() {
  let source = "fn double(x) { return x * 2 }"
  let tokens = tokenize(source)
  let ast = parseModule(tokens)
  let ir = generateIR(ast)

  // Should contain MUL and RET instructions
  let hasRet = false
  for instr in ir {
    if instr.op == "RET" {
      hasRet = true
    }
  }
  return hasRet
}
```

### Integration Tests

```fl
// test-ir-complete-cycle.fl
fn testCompleteCycle() {
  // Parse this code:
  let code = "
    fn add(a, b) {
      return a + b
    }
    println(add(3, 4))
  "

  // Compile it:
  let tokens = tokenize(code)
  let ast = parseModule(tokens)
  let ir = generateIR(ast)

  // Verify IR properties:
  // - Contains CALL "add" 2
  // - Contains RET
  // - Length > 10

  return arr.len(ir) > 10
}
```

---

## Implementation Checklist

### Phase 1: Core Structure (2 hours)

- [ ] Define IRInstruction struct
- [ ] Define CompileContext struct
- [ ] Implement createContext()
- [ ] Implement emit() helper
- [ ] Write basic test harness

### Phase 2: Expression Compilation (3 hours)

- [ ] Implement compileExpression() skeleton
- [ ] Handle Literal expressions (PUSH)
- [ ] Handle Identifier expressions (LOAD/LOAD_GLOBAL)
- [ ] Handle BinaryOp expressions (operation dispatch)
- [ ] Handle UnaryOp expressions (NEG, NOT)
- [ ] Handle CallExpression (CALL with argc)
- [ ] Write expression tests

### Phase 3: Statement Compilation (3 hours)

- [ ] Implement compileStatement() skeleton
- [ ] Handle LetDeclaration (slot allocation, STORE)
- [ ] Handle IfStatement (JIF, control flow)
- [ ] Handle WhileStatement (loop jumps)
- [ ] Handle ReturnStatement (RET)
- [ ] Handle ExpressionStatement (POP)
- [ ] Handle BlockStatement (iterate statements)
- [ ] Write statement tests

### Phase 4: Function Compilation (2 hours)

- [ ] Implement compileFunction()
- [ ] Handle parameter slots
- [ ] Handle function body compilation
- [ ] Add implicit return
- [ ] Write function tests

### Phase 5: Integration (1.5 hours)

- [ ] Implement generateIR() entry point
- [ ] Handle global variables
- [ ] Handle function collection
- [ ] Write integration tests
- [ ] Performance testing

### Phase 6: Documentation & Cleanup (0.5 hours)

- [ ] Add comprehensive comments
- [ ] Document edge cases
- [ ] Create API documentation
- [ ] Add error messages

---

## Example Compilation

### Input FreeLang Code

```fl
fn fib(n) {
  if n <= 1 {
    return n
  } else {
    return fib(n - 1) + fib(n - 2)
  }
}
```

### Generated IR Instructions

```
[
  {op: "LOAD", arg1: 0, arg2: null, line: 2},        // n
  {op: "PUSH", arg1: 1, arg2: null, line: 2},         // 1
  {op: "LE", arg1: null, arg2: null, line: 2},        // n <= 1
  {op: "JIF", arg1: 10, arg2: null, line: 2},         // jump to else
  {op: "LOAD", arg1: 0, arg2: null, line: 3},         // n
  {op: "RET", arg1: null, arg2: null, line: 3},       // return n
  {op: "LOAD", arg1: 0, arg2: null, line: 5},         // n
  {op: "PUSH", arg1: 1, arg2: null, line: 5},         // 1
  {op: "SUB", arg1: null, arg2: null, line: 5},       // n-1
  {op: "CALL", arg1: "fib", arg2: 1, line: 5},       // fib(n-1)
  {op: "LOAD", arg1: 0, arg2: null, line: 6},         // n
  {op: "PUSH", arg1: 2, arg2: null, line: 6},         // 2
  {op: "SUB", arg1: null, arg2: null, line: 6},       // n-2
  {op: "CALL", arg1: "fib", arg2: 1, line: 6},       // fib(n-2)
  {op: "ADD", arg1: null, arg2: null, line: 6},       // add results
  {op: "RET", arg1: null, arg2: null, line: 6}        // return
]
```

---

## Performance Targets

| Phase | Target | Metric |
|-------|--------|--------|
| 1 | < 50ms | For 100-line function |
| 2 | < 100ms | For 1000-line module |
| 3 | < 1s | For 10000-line codebase |

---

## References

- **AST Types**: See `parser.fl` lines 1-100 (AST node definitions)
- **VM Instruction Execution**: See `src/vm/instruction-dispatcher.ts` (how IR executes)
- **IRGenerator (TypeScript)**: `src/codegen/ir-generator.ts` (reference implementation)

---

## Next Steps

1. ✅ Complete this guide
2. ⏳ Implement ir-generator.fl following this guide
3. ⏳ Write comprehensive test suite
4. ⏳ Validate against TypeScript IRGenerator output
5. ⏳ Integrate into self-hosting cycle

---

**Status**: Ready for Implementation
**Complexity**: Medium (stack-based code generation)
**Effort**: 10-12 hours
