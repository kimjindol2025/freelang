# Lexer API

## Overview

The Lexer module is responsible for **tokenization** - converting FreeLang source code into a stream of tokens. It implements a character-by-character scanner that recognizes keywords, operators, literals, and special symbols.

**Version**: v2.0.0
**Module**: `src/lexer`
**Key Files**:
- `lexer.ts` - Lexer implementation
- `token.ts` - Token types and definitions
- `zero-copy-tokenizer.ts` - Optimized tokenization (Phase 14)

---

## Core Classes

### Lexer

The main tokenization engine.

#### Constructor

```typescript
constructor(input: string)
```

**Parameters**:
- `input` (string): Source code to tokenize

**Example**:
```typescript
const lexer = new Lexer("fn main() { println(\"Hello\"); }");
```

---

#### Methods

##### `nextToken(): Token`

Returns the next token in the input stream.

**Returns**: `Token` - The next token

**Behavior**:
- Skips whitespace automatically
- Handles single-line (`//`) and multi-line (`/* */`) comments
- Tracks line and column numbers
- Returns `EOF` token when input is exhausted

**Example**:
```typescript
const lexer = new Lexer("let x = 42;");
const token1 = lexer.nextToken(); // { type: 'LET', value: 'let', line: 1, column: 0 }
const token2 = lexer.nextToken(); // { type: 'IDENT', value: 'x', line: 1, column: 4 }
const token3 = lexer.nextToken(); // { type: 'ASSIGN', value: '=', line: 1, column: 6 }
const token4 = lexer.nextToken(); // { type: 'NUMBER', value: '42', line: 1, column: 8 }
const token5 = lexer.nextToken(); // { type: 'SEMICOLON', value: ';', line: 1, column: 10 }
const token6 = lexer.nextToken(); // { type: 'EOF', value: '', line: 1, column: 11 }
```

---

##### `tokenize(): Token[]`

Tokenizes the entire input and returns all tokens as an array.

**Returns**: `Token[]` - Array of tokens (excluding newlines, ending with `EOF`)

**Behavior**:
- Skips `NEWLINE` tokens (use `tokenizeWithNewlines()` if you need them)
- Always includes `EOF` token at the end
- Consumes the entire input

**Example**:
```typescript
const lexer = new Lexer("fn add(a, b) { a + b }");
const tokens = lexer.tokenize();
// Output:
// [
//   { type: 'FN', value: 'fn', ... },
//   { type: 'IDENT', value: 'add', ... },
//   { type: 'LPAREN', value: '(', ... },
//   ...,
//   { type: 'EOF', value: '', ... }
// ]
```

---

##### `tokenizeWithNewlines(): Token[]`

Tokenizes the entire input while preserving `NEWLINE` tokens.

**Returns**: `Token[]` - Array of tokens (including newlines, ending with `EOF`)

**Use Case**: Used by the statement parser where newlines are significant as statement terminators (semicolon-optional parsing).

**Example**:
```typescript
const lexer = new Lexer("let x = 1\nlet y = 2");
const tokens = lexer.tokenizeWithNewlines();
// Output includes NEWLINE tokens between statements
```

---

## Interfaces

### Token

Represents a lexical token.

```typescript
interface Token {
  type: TokenType;    // Token category
  value: string;      // Token text
  line: number;       // 1-based line number
  column: number;     // 0-based column number
}
```

**Example**:
```typescript
const token: Token = {
  type: TokenType.IDENT,
  value: "myVariable",
  line: 5,
  column: 8
};
```

---

## Enums

### TokenType

Defines all possible token types supported by FreeLang.

#### Keywords (33 total)

| Token | Keyword | Purpose |
|-------|---------|---------|
| `FN` | `fn` | Function declaration |
| `LET` | `let` | Variable binding (mutable) |
| `CONST` | `const` | Constant binding |
| `IF` | `if` | Conditional statement |
| `ELSE` | `else` | Else clause |
| `MATCH` | `match` | Pattern matching |
| `FOR` | `for` | For loop |
| `WHILE` | `while` | While loop |
| `LOOP` | `loop` | Infinite loop |
| `BREAK` | `break` | Loop break |
| `CONTINUE` | `continue` | Loop continue |
| `RETURN` | `return` | Function return |
| `ASYNC` | `async` | Async function |
| `AWAIT` | `await` | Await expression |
| `IMPORT` | `import` | Module import |
| `EXPORT` | `export` | Module export |
| `FROM` | `from` | Import source (Phase 4) |
| `STRUCT` | `struct` | Struct definition |
| `ENUM` | `enum` | Enum definition |
| `TRAIT` | `trait` | Trait definition |
| `TYPE` | `type` | Type alias |
| `TRUE` | `true` | Boolean true |
| `FALSE` | `false` | Boolean false |
| `NULL` | `null` | Null value |
| `IN` | `in` | Membership test |
| `OF` | `of` | For-of loop (Phase 2) |
| `AS` | `as` | Type cast |
| `IS` | `is` | Type check |
| `PUB` | `pub` | Public visibility |
| `MUT` | `mut` | Mutable binding |
| `SELF` | `self` | Self reference |
| `SUPER` | `super` | Super reference |
| `IMPL` | `impl` | Impl block |
| `INPUT` | `input` | Intent input type (Phase 5) |
| `OUTPUT` | `output` | Intent output type (Phase 5) |
| `INTENT` | `intent` | Intent definition (Phase 5) |

#### Literals

| Token | Example | Purpose |
|-------|---------|---------|
| `IDENT` | `myVar`, `_private` | Identifiers |
| `NUMBER` | `42`, `3.14`, `0xFF` | Numeric literals |
| `STRING` | `"hello"` | String literals |
| `CHAR` | `'a'` | Character literals |

#### Operators

**Arithmetic**:
- `PLUS` (`+`), `MINUS` (`-`), `STAR` (`*`), `SLASH` (`/`), `PERCENT` (`%`), `POWER` (`**`)

**Comparison**:
- `EQ` (`==`), `NE` (`!=`), `LT` (`<`), `GT` (`>`), `LE` (`<=`), `GE` (`>=`)

**Logical**:
- `AND` (`&&`), `OR` (`||`), `NOT` (`!`)

**Bitwise**:
- `BIT_AND` (`&`), `BIT_OR` (`|`), `BIT_XOR` (`^`), `BIT_NOT` (`~`), `SHL` (`<<`), `SHR` (`>>`)

**Assignment**:
- `ASSIGN` (`=`), `PLUS_ASSIGN` (`+=`), `MINUS_ASSIGN` (`-=`), `STAR_ASSIGN` (`*=`), `SLASH_ASSIGN` (`/=`), `PERCENT_ASSIGN` (`%=`)

**Range**:
- `RANGE` (`..`), `RANGE_INC` (`..=`)

**Other**:
- `DOT` (`.`), `COLON_COLON` (`::`), `QUESTION` (`?`), `PIPE_GT` (`|>`)

#### Delimiters

| Token | Symbol | Purpose |
|-------|--------|---------|
| `LPAREN` | `(` | Left parenthesis |
| `RPAREN` | `)` | Right parenthesis |
| `LBRACKET` | `[` | Left bracket |
| `RBRACKET` | `]` | Right bracket |
| `LBRACE` | `{` | Left brace |
| `RBRACE` | `}` | Right brace |
| `COMMA` | `,` | Comma |
| `SEMICOLON` | `;` | Semicolon |
| `COLON` | `:` | Colon |
| `ARROW` | `->` | Arrow (return type) |
| `FAT_ARROW` | `=>` | Fat arrow (match arm) |
| `AT` | `@` | At symbol |
| `HASH` | `#` | Hash symbol |

#### Special

| Token | Purpose |
|-------|---------|
| `EOF` | End of file |
| `NEWLINE` | Newline character |
| `COMMENT` | Comment (rarely used directly) |
| `ILLEGAL` | Invalid token |

---

## Functions

### `isKeyword(str: string): boolean`

Checks if a string is a FreeLang keyword.

**Parameters**:
- `str` (string): String to check

**Returns**: `boolean` - True if the string is a keyword, false otherwise

**Example**:
```typescript
isKeyword("fn");      // true
isKeyword("let");     // true
isKeyword("myVar");   // false
```

---

### `getKeyword(str: string): TokenType`

Gets the token type for a keyword string.

**Parameters**:
- `str` (string): Keyword string

**Returns**: `TokenType` - Token type, or `IDENT` if not a keyword

**Example**:
```typescript
getKeyword("fn");    // TokenType.FN
getKeyword("if");    // TokenType.IF
getKeyword("foo");   // TokenType.IDENT
```

---

## Usage Examples

### Basic Tokenization

```typescript
import { Lexer } from './lexer';

const code = `
fn greet(name: string) {
  println("Hello, " + name);
}
`;

const lexer = new Lexer(code);
const tokens = lexer.tokenize();

tokens.forEach(token => {
  console.log(`${token.type}: ${token.value} (line ${token.line})`);
});
```

**Output**:
```
FN: fn (line 2)
IDENT: greet (line 2)
LPAREN: ( (line 2)
IDENT: name (line 2)
COLON: : (line 2)
IDENT: string (line 2)
RPAREN: ) (line 2)
LBRACE: { (line 2)
...
EOF:  (line 6)
```

---

### Token Filtering

```typescript
const lexer = new Lexer("let x = 42; // This is a comment");
const tokens = lexer.tokenize();

// Filter to get only identifiers and numbers
const values = tokens
  .filter(t => t.type === TokenType.IDENT || t.type === TokenType.NUMBER)
  .map(t => t.value);

console.log(values); // ["x", "42"]
```

---

### Error Handling

```typescript
const lexer = new Lexer("let x = @invalid;");
const tokens = lexer.tokenize();

const invalidTokens = tokens.filter(t => t.type === TokenType.ILLEGAL);
if (invalidTokens.length > 0) {
  console.error(`Syntax error at line ${invalidTokens[0].line}:${invalidTokens[0].column}`);
}
```

---

### Integration with Parser

```typescript
import { Lexer } from './lexer';
import { Parser } from './parser';

const source = "fn add(a, b) { a + b }";
const lexer = new Lexer(source);
const tokens = lexer.tokenize();
const ast = new Parser(tokens).parse();
```

---

## Performance Considerations

### Zero-Copy Tokenization (Phase 14)

For large files, use `ZeroCopyTokenizer` which stores token offsets instead of copying substrings:

```typescript
import { ZeroCopyTokenizer } from './zero-copy-tokenizer';

const lexer = new ZeroCopyTokenizer(largeSourceCode);
const tokens = lexer.tokenize();
// Memory efficient: 30% less memory for large files
```

---

## Error Scenarios

| Scenario | Behavior | Recovery |
|----------|----------|----------|
| Unterminated string | Continues until EOF, produces `ILLEGAL` token | Parser should error |
| Unterminated comment | Continues until EOF | Parser should error |
| Invalid character (e.g., `@`) | Produces `ILLEGAL` token | Parser should error |
| Empty input | Returns only `EOF` token | Valid (empty program) |

---

## Best Practices

1. **Always check for `ILLEGAL` tokens**: Invalid syntax should be caught before parsing
2. **Use `tokenizeWithNewlines()` for Python-like syntax**: When significant newlines are needed
3. **Preserve token positions**: Always keep `line` and `column` for error reporting
4. **Prefer `Lexer` for small files**: Simpler, easier to debug
5. **Use `ZeroCopyTokenizer` for large files**: More memory efficient

---

## Related Documentation

- [Parser API](./parser.md) - AST generation from tokens
- [Type System](./type-system.md) - Type information
- [Semantic Analyzer](./semantic-analyzer.md) - Scope and context analysis
- [Compiler Pipeline](../COMPILER-PIPELINE.md) - Overall compilation flow

---

**Last Updated**: 2026-02-18
**Status**: Production Ready (Phase 1)
**Test Coverage**: 38/38 tests passing ✅
