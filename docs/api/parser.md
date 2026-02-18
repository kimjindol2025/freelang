# Parser API

## Overview

The Parser module converts a stream of tokens into an Abstract Syntax Tree (AST). It implements a recursive descent parser that can parse both the minimal `.free` format and full FreeLang syntax.

**Version**: v2.0.0
**Module**: `src/parser`
**Key Files**:
- `parser.ts` - Main parser implementation
- `ast.ts` - AST type definitions
- `ast-types.ts` - Extended AST types
- `one-pass-parser.ts` - Optimized single-pass parsing (Phase 14)

---

## Core Classes

### Parser

The main syntax analyzer that produces AST from tokens.

#### Constructor

```typescript
constructor(tokens: TokenBuffer)
```

**Parameters**:
- `tokens` (TokenBuffer): Token stream from the Lexer

**Example**:
```typescript
import { Lexer } from '../lexer/lexer';
import { Parser } from './parser';

const source = "fn add(a, b) { a + b }";
const lexer = new Lexer(source);
const tokens = lexer.tokenize();
const parser = new Parser(tokens);
```

---

#### Methods

##### `parse(): MinimalFunctionAST`

Parses a complete FreeLang function declaration in the minimal `.free` format.

**Returns**: `MinimalFunctionAST` - The parsed function AST

**Supported Formats**:
```
@minimal (optional decorator)
fn <name>
input [: ] <type>
output [: ] <type>
intent [: ] "<description>"
```

**Features**:
- Optional `fn` keyword (Phase 5 Stage 3)
- Optional colons after `input`, `output`, `intent` (Phase 5 Task 3)
- Optional `intent` field
- Support for complex type syntax (`array<number>`, `map<string, bool>`, etc.)

**Example**:
```typescript
const source = `
@minimal
fn sum
input: array<number>
output: number
intent: "Calculate array sum"
`;

const lexer = new Lexer(source);
const parser = new Parser(lexer.tokenize());
const ast = parser.parse();

// Result:
// {
//   decorator: 'minimal',
//   fnName: 'sum',
//   inputType: 'array<number>',
//   outputType: 'number',
//   intent: 'Calculate array sum'
// }
```

---

##### `parseExpression(): Expression`

Parses a single expression with operator precedence.

**Returns**: `Expression` - The parsed expression

**Supported Expression Types**:
- Literals: `42`, `"hello"`, `true`, `false`
- Identifiers: `x`, `myVar`, `_private`
- Binary operations: `a + b`, `x * 2`, `a && b`
- Function calls: `foo()`, `bar(x, y)`
- Array literals: `[1, 2, 3]`
- Member access: `obj.field`
- Pattern matching: `match x { case => ... }`
- Lambda expressions: `|x| x + 1` (Phase 3)

**Example**:
```typescript
const lexer = new Lexer("a + b * 2");
const parser = new Parser(lexer.tokenize());
const expr = parser.parseExpression();

// Result: {
//   type: 'binary',
//   operator: '+',
//   left: { type: 'identifier', name: 'a' },
//   right: {
//     type: 'binary',
//     operator: '*',
//     left: { type: 'identifier', name: 'b' },
//     right: { type: 'literal', value: 2, dataType: 'number' }
//   }
// }
```

---

##### `parseStatement(): Statement`

Parses a single statement (assignments, control flow, declarations, etc.).

**Returns**: `Statement` - The parsed statement

**Supported Statement Types**:
- Variable declarations: `let x = 5;`
- Assignments: `x = 10;`
- If statements: `if (x > 0) { ... } else { ... }`
- For loops: `for i in 0..10 { ... }`
- For-of loops: `for x of array { ... }` (Phase 2)
- While loops: `while (x > 0) { ... }`
- Return statements: `return x + 1;`
- Block statements: `{ ... }`
- Expression statements: `foo();`
- Import statements: `import { foo } from "./module";` (Phase 4)
- Export statements: `export fn bar() { ... }` (Phase 4)

**Example**:
```typescript
const lexer = new Lexer("let x = 42;");
const parser = new Parser(lexer.tokenize());
const stmt = parser.parseStatement();

// Result: {
//   type: 'variable',
//   name: 'x',
//   value: { type: 'literal', value: 42, dataType: 'number' }
// }
```

---

## Interfaces

### MinimalFunctionAST

Represents a parsed function in the `.free` format.

```typescript
interface MinimalFunctionAST {
  decorator?: 'minimal';           // @minimal decorator
  fnName: string;                  // Function name
  inputType: string;               // Input type signature
  outputType: string;              // Output type signature
  intent?: string;                 // Function intent/description
  reason?: string;                 // Additional explanation
  body?: string;                   // Function body (Phase 5 Task 4)
  source?: {                        // Source location
    line: number;
    column: number;
  };
}
```

**Example**:
```typescript
const ast: MinimalFunctionAST = {
  decorator: 'minimal',
  fnName: 'filterPositive',
  inputType: 'array<number>',
  outputType: 'array<number>',
  intent: 'Filter array to keep only positive numbers',
  source: { line: 1, column: 0 }
};
```

---

### Expression

Union type for all expression nodes.

```typescript
type Expression =
  | LiteralExpression
  | IdentifierExpression
  | BinaryOpExpression
  | CallExpression
  | ArrayExpression
  | MemberExpression
  | MatchExpression
  | LambdaExpression;
```

#### LiteralExpression

```typescript
interface LiteralExpression {
  type: 'literal';
  value: string | number | boolean;
  dataType: 'number' | 'string' | 'bool';
}
```

#### IdentifierExpression

```typescript
interface IdentifierExpression {
  type: 'identifier';
  name: string;
}
```

#### BinaryOpExpression

```typescript
interface BinaryOpExpression {
  type: 'binary';
  operator: '+' | '-' | '*' | '/' | '%' | '==' | '!=' | '>' | '<' | '>=' | '<=';
  left: Expression;
  right: Expression;
}
```

#### CallExpression

```typescript
interface CallExpression {
  type: 'call';
  callee: string;
  arguments: Expression[];
}
```

#### ArrayExpression

```typescript
interface ArrayExpression {
  type: 'array';
  elements: Expression[];
}
```

#### MemberExpression

```typescript
interface MemberExpression {
  type: 'member';
  object: Expression;
  property: string;
}
```

#### LambdaExpression (Phase 3)

```typescript
interface LambdaExpression {
  type: 'lambda';
  params: Parameter[];              // Parameter names
  paramTypes?: string[];            // Optional parameter types
  body: Expression;                 // Function body
  returnType?: string;              // Optional return type
  capturedVars?: string[];          // Closure-captured variables
}
```

---

### Statement

Union type for all statement nodes.

```typescript
type Statement =
  | ExpressionStatement
  | VariableDeclaration
  | IfStatement
  | ForStatement
  | ForOfStatement
  | WhileStatement
  | ReturnStatement
  | BlockStatement
  | ImportStatement
  | ExportStatement
  | FunctionStatement;
```

#### VariableDeclaration

```typescript
interface VariableDeclaration {
  type: 'variable';
  name: string;
  value: Expression;
  isMutable?: boolean;
}
```

#### IfStatement

```typescript
interface IfStatement {
  type: 'if';
  condition: Expression;
  consequent: BlockStatement;
  alternate?: BlockStatement | IfStatement;
}
```

#### ForStatement

```typescript
interface ForStatement {
  type: 'for';
  variable: string;
  start: Expression;
  end: Expression;
  body: BlockStatement;
}
```

#### ForOfStatement (Phase 2)

```typescript
interface ForOfStatement {
  type: 'for-of';
  variable: string;
  iterable: Expression;
  body: BlockStatement;
}
```

#### WhileStatement

```typescript
interface WhileStatement {
  type: 'while';
  condition: Expression;
  body: BlockStatement;
}
```

#### ReturnStatement

```typescript
interface ReturnStatement {
  type: 'return';
  value?: Expression;
}
```

#### BlockStatement

```typescript
interface BlockStatement {
  type: 'block';
  statements: Statement[];
}
```

#### ImportStatement (Phase 4)

```typescript
interface ImportStatement {
  type: 'import';
  imports: ImportSpecifier[];
  from: string;
  isNamespace?: boolean;
  namespace?: string;
}
```

#### ExportStatement (Phase 4)

```typescript
interface ExportStatement {
  type: 'export';
  declaration: FunctionStatement | VariableDeclaration;
}
```

---

## Classes & Types

### ParseError

Error thrown during parsing.

```typescript
class ParseError extends Error {
  constructor(line: number, column: number, message: string)
}
```

**Example**:
```typescript
try {
  const lexer = new Lexer("fn foo input");
  const parser = new Parser(lexer.tokenize());
  parser.parse();
} catch (error) {
  if (error instanceof ParseError) {
    console.error(`Parse error at ${error.line}:${error.column}: ${error.message}`);
  }
}
```

---

## Usage Examples

### Parsing a Simple Function

```typescript
import { Lexer } from '../lexer/lexer';
import { Parser } from './parser';

const source = `
fn sum
input: array<number>
output: number
intent: "Sum all elements"
`;

const lexer = new Lexer(source);
const tokens = lexer.tokenize();
const parser = new Parser(tokens);
const ast = parser.parse();

console.log(ast.fnName);       // "sum"
console.log(ast.inputType);    // "array<number>"
console.log(ast.outputType);   // "number"
console.log(ast.intent);       // "Sum all elements"
```

---

### Parsing Expressions

```typescript
const lexer = new Lexer("x + y * 2");
const tokens = lexer.tokenize();
const parser = new Parser(tokens);
const expr = parser.parseExpression();

// The parser respects operator precedence:
// Multiplication is evaluated before addition
```

---

### Parsing Complete Program

```typescript
const lexer = new Lexer(`
let x = 10;
if (x > 5) {
  println("Greater");
} else {
  println("Less");
}
`);

const tokens = lexer.tokenize();
const parser = new Parser(tokens);

// Parse multiple statements
const statements = [];
while (tokens.current().type !== TokenType.EOF) {
  statements.push(parser.parseStatement());
}
```

---

### Error Handling

```typescript
import { ParseError } from './ast';

try {
  const source = "fn sum input"; // Missing type
  const lexer = new Lexer(source);
  const parser = new Parser(lexer.tokenize());
  parser.parse();
} catch (error) {
  if (error instanceof ParseError) {
    console.error(`Parse error at line ${error.line}, column ${error.column}`);
    console.error(error.message);
  }
}
```

---

## Operator Precedence

The parser follows this operator precedence (highest to lowest):

1. **Primary**: Literals, identifiers, parenthesized expressions, member access
2. **Call**: Function calls, array indexing
3. **Unary**: Logical NOT (`!`), bitwise NOT (`~`), unary minus (`-`)
4. **Power**: `**`
5. **Multiplicative**: `*`, `/`, `%`
6. **Additive**: `+`, `-`
7. **Bitwise Shift**: `<<`, `>>`
8. **Relational**: `<`, `>`, `<=`, `>=`
9. **Equality**: `==`, `!=`
10. **Bitwise AND**: `&`
11. **Bitwise XOR**: `^`
12. **Bitwise OR**: `|`
13. **Logical AND**: `&&`
14. **Logical OR**: `||`
15. **Assignment**: `=`, `+=`, `-=`, `*=`, `/=`, `%=`

---

## Special Features

### Optional `fn` Keyword (Phase 5)

The parser can infer function structure even without the `fn` keyword:

```
# Traditional (fn keyword required)
fn add
input: number
output: number

# New (Phase 5 Stage 3) - fn keyword optional
add
input: number
output: number
```

---

### Optional Colons (Phase 5)

Colons after `input`, `output`, and `intent` are optional:

```
# Traditional
input: array<number>
output: number
intent: "description"

# New (Phase 5 Task 3)
input array<number>
output number
intent "description"
```

---

### Type Inference (Phase 5)

Types can be partially omitted and inferred:

```
# Full type specification
fn sort
input: array<T>
output: array<T>

# Partial inference (not yet supported, Phase 5 Task 2)
fn process
input: ???
output: ???
```

---

## Performance Considerations

### One-Pass Parsing (Phase 14)

For better performance on large files, use `OnePassParser`:

```typescript
import { OnePassParser } from './one-pass-parser';

const source = largeSourceFile;
const parser = new OnePassParser(source);
const ast = parser.parse();
// Single pass through tokens (no backtracking)
```

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `Expected "fn" keyword or valid function structure` | Missing `fn` or function signature | Add `fn` keyword or type specification |
| `Expected function name` | No identifier after `fn` | Add function name |
| `Expected input type` | Missing input type | Add `input: <type>` |
| `Expected output type` | Missing output type | Add `output: <type>` |
| `Unexpected token` | Invalid syntax | Check token sequence |

---

## Best Practices

1. **Always handle ParseError**: Parser can throw `ParseError` for invalid syntax
2. **Validate tokens first**: Use lexer to ensure valid tokens before parsing
3. **Preserve AST positions**: Keep `line` and `column` for error reporting
4. **Use semantic analyzer after parsing**: Parser produces syntactic structure, not semantic meaning
5. **Test with edge cases**: Empty inputs, deeply nested expressions, large files

---

## Related Documentation

- [Lexer API](./lexer.md) - Token generation
- [Type System](./type-system.md) - Type information
- [Semantic Analyzer](./semantic-analyzer.md) - Semantic analysis post-parsing
- [Compiler Pipeline](../COMPILER-PIPELINE.md) - Complete compilation flow

---

**Last Updated**: 2026-02-18
**Status**: Production Ready (Phase 1-2)
**Test Coverage**: 1,942+ tests passing ✅
