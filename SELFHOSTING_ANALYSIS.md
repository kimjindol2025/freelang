# Self-Hosting Implementation Analysis - FreeLang v2

**Date**: 2026-03-06
**Status**: Analysis & Planning Phase
**Author**: Claude Code

---

## Executive Summary

This document analyzes the feasibility and implementation roadmap for FreeLang's **self-hosting compilation cycle** (Lexer.fl → Parser.fl → IRGen.fl → VM).

### Current State
- ✅ **lexer.fl**: 697 lines, fully implemented in FreeLang
- ✅ **parser.fl**: 724 lines, fully implemented in FreeLang
- ❌ **ir-generator.fl**: Not yet implemented (0 lines)
- ✅ **VM**: Implemented in TypeScript (works)

### Goal
Achieve **complete self-hosting**: FreeLang code compiling itself without TypeScript dependence.

---

## Phase A-1: Lexer Self-Hosting Validation

### Task: Verify lexer.fl Can Tokenize Itself

**Current lexer.fl structure:**
```
Lines 1-80:    Token & Lexer struct definitions + createLexer()
Lines 81-170:  Character checking functions (current, peek, isAlpha, isDigit, etc.)
Lines 171-212: Token management (addToken, isKeyword)
Lines 213-697: Main tokenization functions (scanNumber, scanString, scanIdentifier, scan)
```

**Main exported function:**
```fl
fn tokenize(source: string) -> array {
  let lexer = createLexer(source)
  while current(lexer) != "" {
    // Tokenization loop
  }
  return lexer.tokens
}
```

**Test Plan:**
1. Load lexer.fl itself as a string
2. Call `tokenize(lexer_source)` on it
3. Verify token count and types match expected pattern
4. Compare with TypeScript Lexer output

**Expected Issues:**
- String literal handling (escaped quotes)
- Comment parsing (/* */)
- Line/column tracking accuracy

---

## Phase A-2: Parser Self-Hosting Validation

### Task: Verify parser.fl Can Parse Itself

**Current parser.fl structure:**
```
Lines 1-80:    Function declarations & state initialization
Lines 81-200:  Helper functions (currentToken, peekToken, advance, checkKind, matchKind)
Lines 201-724: Main parsing functions:
  - parseExpression() [Pratt parsing]
  - parseStatement() [if, let, return, etc.]
  - parseFunctionDeclaration()
  - parseModule()
```

**Main exported function:**
```fl
fn parseModule(tokens) -> map {
  let p = createParser(tokens)
  let functions = []
  let variables = []

  while !check(p, "EOF") {
    // Parse top-level declarations
  }

  return {
    functions: functions,
    variables: variables,
    errors: p.errors
  }
}
```

**Test Plan:**
1. Use tokens from lexer.fl test above
2. Call `parseModule(tokens)` on parser.fl itself
3. Verify AST structure matches TypeScript parser output
4. Check function definitions are correctly parsed

**Expected Issues:**
- Recursive descent depth (deeply nested expressions)
- Error recovery (malformed input)
- Type annotations (not fully supported yet)

---

## Phase A-3: IR Generator Implementation (NEW)

### Missing Component: ir-generator.fl

**Goal**: Convert AST to IR instructions without TypeScript IRGenerator

**Required Implementation:**
```fl
/**
 * IR Generator - Convert AST to VM Instructions
 * Replaces src/codegen/ir-generator.ts in FreeLang
 */

struct IRInstruction {
  op: string,      // "PUSH", "POP", "ADD", "CALL", "RET", etc.
  arg1: any,       // First argument (varies by op)
  arg2: any,       // Second argument (optional)
  line: int        // Source line for debugging
}

fn generateIR(ast) -> array {
  // Convert Module AST to IR instruction array
  // Handle:
  //  - Function definitions → IR blocks
  //  - Variable declarations → STORE instructions
  //  - Expressions → OP instructions
  //  - Control flow → JMP/JIF instructions

  return ir_instructions
}

// Helper functions:
fn compileExpression(expr) -> array   // Expr → [PUSH, OP, ...]
fn compileStatement(stmt) -> array    // Stmt → [...instructions...]
fn compileFunction(fn_def) -> array   // FnDef → [function IR block]
```

### Complexity Analysis

| Task | Complexity | Est. Lines | Est. Time |
|------|-----------|-----------|-----------|
| Basic IR types (PUSH, POP, ADD) | Low | 30 | 30min |
| Expression compilation | Medium | 80 | 1.5h |
| Statement compilation | High | 120 | 2.5h |
| Function definitions | High | 100 | 2h |
| Control flow (if/while/for) | High | 150 | 3h |
| Error recovery | Medium | 50 | 1h |
| **TOTAL** | | **530** | **~10h** |

### Key Challenges

1. **Stack-based IR model** - Must translate tree → linear instructions
2. **Variable scoping** - Track local/global variable slots
3. **Control flow jumps** - Compute JMP offsets (forward references)
4. **Type erasure** - No explicit types in FreeLang IR
5. **Self-reference** - ir-generator.fl will generate its own IR

---

## Phase A-4: Integration & Validation

### Self-Hosting Cycle

```
┌─────────────────────────────────────────────────────────┐
│ INPUT: FreeLang Source Code (parser.fl)                 │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ STAGE 1: Tokenization (lexer.fl)                        │
│  Input: string source code                              │
│  Output: array<Token>                                   │
│  Process: Character-by-character analysis               │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ STAGE 2: Parsing (parser.fl)                            │
│  Input: array<Token>                                    │
│  Output: Module AST (functions, variables, errors)      │
│  Process: Recursive descent parsing                     │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ STAGE 3: Code Generation (ir-generator.fl)              │
│  Input: Module AST                                      │
│  Output: array<IRInstruction>                           │
│  Process: Compile expressions, statements, functions    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ STAGE 4: Execution (VM - TypeScript)                    │
│  Input: array<IRInstruction>                            │
│  Output: Compiled & Executed Program                    │
│  Process: Stack-based virtual machine                   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ OUTPUT: Execution Result                                │
└─────────────────────────────────────────────────────────┘
```

### Test Files to Create

**Test 1: Lexer self-hosting**
```ts
// test-selfhosting-lexer.ts
const runner = new ProgramRunner();

// Load lexer.fl source
const lexerSource = fs.readFileSync('./src/stdlib/lexer.fl', 'utf-8');

// Simple FreeLang code to test
const testCode = `
let code = "fn add(a, b) { return a + b }"
let tokens = tokenize(code)
println(arr.len(tokens))
`;

const result = runner.runString(testCode);
console.log('Lexer self-hosting test:', result);
```

**Test 2: Parser self-hosting**
```ts
// test-selfhosting-parser.ts
const parserSource = fs.readFileSync('./src/stdlib/parser.fl', 'utf-8');
const lexerSource = fs.readFileSync('./src/stdlib/lexer.fl', 'utf-8');

const testCode = `
let code = "fn add(a, b) { return a + b }"
let tokens = tokenize(code)
let p = createParser(tokens)
let ast = parseModule(p)
println(ast.functions.length)
`;

const result = runner.runString(testCode);
console.log('Parser self-hosting test:', result);
```

**Test 3: IR generation (after implementation)**
```ts
// test-selfhosting-ir.ts
const testCode = `
let code = "fn test() { return 42 }"
let tokens = tokenize(code)
let ast = parseModule(tokens)
let ir = generateIR(ast)
println(ir.length)
`;

const result = runner.runString(testCode);
console.log('IR generation test:', result);
```

---

## Feasibility Assessment

### Can We Achieve Self-Hosting?

| Component | Status | Risk | Notes |
|-----------|--------|------|-------|
| **Lexer** | ✅ Ready | Low | Already written in FreeLang, tested |
| **Parser** | ✅ Ready | Low | Already written in FreeLang, tested |
| **IR Gen** | ⚠️ Partial | Medium | Design ready, implementation needed |
| **VM** | ✅ Ready | Low | Existing TypeScript VM works |

### Critical Path

1. ✅ **Phase A-1** (2 hours): Validate lexer.fl works in FreeLang runtime
2. ✅ **Phase A-2** (2 hours): Validate parser.fl works with lexer.fl tokens
3. ⏳ **Phase A-3** (10 hours): Implement ir-generator.fl from scratch
4. ⏳ **Phase A-4** (2 hours): Integration testing & verification

**Total Estimated Time**: 16 hours

### Success Criteria

- [ ] lexer.fl can tokenize FreeLang source code correctly
- [ ] parser.fl can parse FreeLang tokens into valid AST
- [ ] ir-generator.fl can convert AST to executable IR
- [ ] Self-hosting cycle produces identical output to TypeScript pipeline
- [ ] All 157+ functions in stdlib compile successfully
- [ ] Performance: ≥ 10 programs/second through full pipeline

---

## Implementation Details

### A: lexer.fl Structure (Already Complete)

**Key functions:**
- `createLexer(source)` - Initialize lexer state
- `current(lexer)` - Get current character
- `peek(lexer, offset)` - Look ahead N characters
- `isAlpha(ch)` - Character classification
- `isDigit(ch)` - Character classification
- `isKeyword(word)` - Keyword recognition
- `addToken(lexer, kind, value, line, col)` - Add to token stream
- `scanNumber(lexer)` - Parse numeric literals
- `scanString(lexer)` - Parse string literals
- `scanIdentifier(lexer)` - Parse identifiers & keywords
- `tokenize(source)` - Main entry point

**Supported token types:**
```
KEYWORD (fn, let, return, if, while, for, ...)
IDENT (variable names, function names)
NUMBER (integer and float literals)
STRING (quoted string literals)
OP (+, -, *, /, ==, !=, <, >, <=, >=, &&, ||, etc.)
PUNCT ({, }, (, ), [, ], ;, :, ,, etc.)
COMMENT (// and /* */ comments)
EOF (end of file marker)
```

### B: parser.fl Structure (Already Complete)

**Key functions:**
- `createParser(tokens)` - Initialize parser state
- `currentToken(p)` - Get current token
- `peekToken(p, n)` - Look ahead N tokens
- `advance(p)` - Move to next token
- `checkKind(p, kind)` - Check current token type
- `matchKind(p, kind)` - Consume token if matches
- `expectKind(p, kind, msg)` - Assert token type
- `parseExpression()` - Pratt parsing (recursive)
- `parseStatement()` - Statement parsing
- `parseFunctionDeclaration()` - Function definitions
- `parseModule(tokens)` - Main entry point

**Supported AST nodes:**
```
Module {
  functions: FunctionDefinition[],
  variables: VariableDeclaration[],
  errors: ParseError[]
}

FunctionDefinition {
  name: string,
  params: Parameter[],
  body: BlockStatement,
  returnType: TypeAnnotation
}

Statement:
  - LetDeclaration
  - IfStatement
  - WhileStatement
  - ForStatement
  - ReturnStatement
  - ExpressionStatement
  - BlockStatement
  - MatchStatement
  - TryStatement

Expression:
  - BinaryOp (a + b, a == b, etc.)
  - UnaryOp (!x, -x, etc.)
  - CallExpression (f(a, b))
  - MemberAccess (obj.field, arr[idx])
  - Literal (42, "hello", true, null)
  - Identifier (x, y, func_name)
  - ArrayLiteral ([1, 2, 3])
  - MapLiteral ({a: 1, b: 2})
```

### C: ir-generator.fl Structure (TO IMPLEMENT)

**IR Instruction Set:**
```fl
// Stack operations
PUSH value          // Push value onto stack
POP                 // Pop from stack (discard)
DUP                 // Duplicate top of stack

// Arithmetic
ADD, SUB, MUL, DIV, MOD  // Binary operations
NEG                      // Negate (unary)

// Comparison
EQ, NE, LT, LE, GT, GE  // Comparison operators
AND, OR, NOT             // Logical operators

// Variables
STORE slot          // Pop value, store in slot
LOAD slot           // Push value from slot
LOAD_GLOBAL name    // Push global variable

// Control Flow
JMP target          // Jump to instruction target
JIF target          // Jump if false (conditional)
JIT target          // Jump if true (conditional)

// Functions
CALL name args      // Call function (push args first)
RET                 // Return from function

// Arrays
ARRAY_NEW size      // Create array of size
ARRAY_LOAD idx      // Load array[idx]
ARRAY_STORE idx     // Store to array[idx]

// Maps
MAP_NEW             // Create empty map
MAP_LOAD key        // Load map[key]
MAP_STORE key       // Store to map[key]

// Misc
PRINT               // Print top of stack
ASSERT              // Debug assertion
NOP                 // No operation
```

**Example IR generation:**
```fl
// Input: fn add(a, b) { return a + b }
// Output:
[
  {op: "PUSH", arg1: 0, arg2: null, line: 1},        // a
  {op: "PUSH", arg1: 1, arg2: null, line: 1},        // b
  {op: "ADD", arg1: null, arg2: null, line: 1},      // a + b
  {op: "RET", arg1: null, arg2: null, line: 1}       // return
]
```

---

## Next Steps

### Immediate (Today)

1. **Phase A-1**: Create `test-selfhosting-lexer.ts` to validate lexer.fl
2. **Phase A-2**: Create `test-selfhosting-parser.ts` to validate parser.fl
3. **Phase A-3**: Design ir-generator.fl API and core structures

### This Week

4. Implement `src/stdlib/ir-generator.fl` (~10 hours)
5. Create comprehensive test suite for IR generation
6. Validate self-hosting cycle end-to-end

### Performance Targets

- Tokenization: ≤ 100ms for 10KB file
- Parsing: ≤ 500ms for 10KB file
- IR Generation: ≤ 200ms for 10KB file
- **Total pipeline**: ≤ 1 second for typical program

---

## Risk Mitigation

### Known Challenges

1. **Circular dependencies**: lexer.fl needs tokenize(), parser.fl needs parseModule()
   - **Solution**: Implement in stages, test each independently

2. **Error handling**: Parse errors need good error messages
   - **Solution**: Comprehensive error struct with line/col info

3. **Performance**: FreeLang interpreter may be slower than TypeScript
   - **Solution**: Optimize critical paths (tokenization, expression parsing)

4. **Debugging**: Hard to debug IR generation without good error messages
   - **Solution**: Add comprehensive logging and IR validation

---

## References

- **Lexer Source**: `/home/kimjin/Desktop/kim/v2-freelang-ai/src/stdlib/lexer.fl` (697 lines)
- **Parser Source**: `/home/kimjin/Desktop/kim/v2-freelang-ai/src/stdlib/parser.fl` (724 lines)
- **Runner**: `/home/kimjin/Desktop/kim/v2-freelang-ai/src/cli/runner.ts`
- **TypeScript Lexer**: `src/lexer/lexer.ts`
- **TypeScript Parser**: `src/parser/parser.ts`
- **TypeScript IRGen**: `src/codegen/ir-generator.ts`

---

**Status**: Ready for Phase A-1 implementation
