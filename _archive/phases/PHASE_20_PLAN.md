# Phase 20: Parser & CLI Integration - Implementation Plan

**Duration**: 4 days
**Goal**: Make user-defined functions usable via CLI and text-based programs
**Status**: Starting 2026-02-18

---

## Overview

Phase 19 implemented the runtime system for user-defined functions. Phase 20 integrates this into the parser and CLI, enabling real programs to define and use functions via text.

**Current State**: Functions work via API but require manual AST construction
**Target State**: Functions work via text files and CLI commands

---

## Day 1: Function Parser Implementation

### Goals
- Parse `fn` keyword and function definitions
- Extract function name, parameters, and body
- Build AST nodes for FunctionDefinition
- Register functions during program parsing

### Implementation

**Parser Changes** (`src/cli/runner.ts` extensions):

```typescript
interface ProgramAST {
  type: 'Program';
  functionDefs: FunctionDefinition[];
  statements: ASTNode[];
}

function parseProgram(source: string): ProgramAST {
  // 1. Parse function definitions
  const functionDefs = parseFunctionDefinitions(source);

  // 2. Parse statements
  const statements = parseStatements(source);

  return { type: 'Program', functionDefs, statements };
}

function parseFunctionDefinitions(source: string): FunctionDefinition[] {
  const fnRegex = /fn\s+(\w+)\s*\((.*?)\)\s*\{(.*?)\}(?=\n|fn|$)/gms;
  const functions: FunctionDefinition[] = [];

  let match;
  while ((match = fnRegex.exec(source)) !== null) {
    const name = match[1];
    const params = match[2]
      .split(',')
      .map(p => p.trim())
      .filter(p => p);
    const body = match[3];

    functions.push({
      type: 'FunctionDefinition',
      name,
      params,
      body: parseExpression(body) // Will be expression or block
    });
  }

  return functions;
}
```

**Supported Syntax**:

```
fn add(a, b) {
  return a + b
}

fn factorial(n) {
  if n <= 1 {
    return 1
  }
  return n * factorial(n - 1)
}

fn greet(name) {
  return "Hello, " + name
}
```

### Tests (8-10)

1. Parse simple function definition
2. Parse function with multiple parameters
3. Parse function with return statement
4. Parse recursive function definition
5. Parse function with if/else body
6. Parse function with loop body
7. Parse multiple functions in one program
8. Parse mixed functions and statements
9. Extract function names and parameters correctly
10. Handle nested braces in function bodies

---

## Day 2: CLI Integration

### Goals
- Update CLI to handle functions
- Register functions during program loading
- Execute functions via CLI
- Support function calls in programs

### Implementation

**CLI Changes** (`src/cli/cli.ts`):

```typescript
async function runFile(filepath: string): Promise<VMResult> {
  const source = fs.readFileSync(filepath, 'utf-8');
  const program = parseProgram(source);

  // Register all function definitions
  const registry = new FunctionRegistry();
  for (const fn of program.functionDefs) {
    registry.register(fn);
  }

  // Generate IR for statements
  const gen = new IRGenerator();
  const ir: Inst[] = [];

  for (const stmt of program.statements) {
    const stmtIR = gen.generateIR(stmt);
    ir.push(...stmtIR.slice(0, -1)); // Remove HALT from each
  }
  ir.push({ op: Op.HALT });

  // Execute
  const vm = new VM(registry);
  return vm.run(ir);
}
```

**CLI Examples**:

```bash
# Run program with functions
freelang run program.free

# Evaluate expression
freelang eval "add(5, 3)"  # with functions pre-defined

# Show IR
freelang ir program.free

# Help
freelang help
```

### Tests (8-10)

1. CLI run with simple function
2. CLI run with multiple functions
3. CLI eval with function calls
4. CLI shows correct output
5. CLI handles function errors
6. CLI shows proper error messages
7. CLI ir shows function calls
8. CLI help mentions functions
9. Program with functions and direct statements
10. Error handling for undefined functions

---

## Day 3: End-to-End Program Execution

### Goals
- Full program execution with functions
- Mixed statements and function calls
- Real-world program patterns
- Comprehensive testing

### Implementation

**Example Programs**:

```freelang
# Program 1: Simple calculation
fn multiply(a, b) {
  return a * b
}

result = multiply(5, 3)
print(result)

# Program 2: Fibonacci
fn fib(n) {
  if n <= 1 {
    return n
  }
  return fib(n - 1) + fib(n - 2)
}

x = fib(10)
print(x)

# Program 3: String manipulation
fn makeGreeting(first, last) {
  return first + " " + last
}

greeting = makeGreeting("Hello", "World")
print(greeting)
```

### Tests (15-20)

1. Execute program with function definition
2. Execute program with function call
3. Multiple functions in one program
4. Recursive function execution
5. Function with control flow
6. Function with string operations
7. Function returning to variable
8. Using function result in expression
9. Multiple function calls in sequence
10. Nested function calls
11. Function modifying variables
12. Function with loop
13. Function with array operations
14. Error on undefined function
15. Function call before definition (valid if defined)
16. Duplicate function names (last wins)
17. Function with no parameters
18. Function with many parameters
19. Function with complex body
20. Real-world pattern programs

---

## Day 4: Performance & Real-World Examples

### Goals
- Benchmark function performance
- Real-world example programs
- Performance validation
- Documentation

### Implementation

**Performance Tests** (5-10):

```typescript
describe('Phase 20 Day 4: Performance', () => {
  it('executes 1000 function calls efficiently', () => {
    const program = `
      fn inc(x) { return x + 1 }
      result = 0
      for i in range(1, 1000) {
        result = inc(result)
      }
      result
    `;

    const start = performance.now();
    const result = execute(program);
    const duration = performance.now() - start;

    expect(result.value).toBe(999);
    expect(duration).toBeLessThan(500); // < 500ms
  });
});
```

**Real-World Examples** (5-10):

1. **Calculator**: Add, subtract, multiply, divide functions
2. **Statistics**: Mean, median, standard deviation
3. **String Processing**: Trim, uppercase, reverse
4. **Recursion**: Factorial, fibonacci, quick sort simulation
5. **Data Processing**: Sum array, filter array, transform

### Tests (15-20)

1. Performance: 1000 function calls < 500ms
2. Performance: 100 recursive calls < 100ms
3. Performance: Large program (50 functions)
4. Real-world: Calculator program
5. Real-world: Statistics functions
6. Real-world: String manipulation
7. Real-world: Array processing
8. Complex recursion pattern
9. Deep function nesting (10+ levels)
10. Mixed statement and function execution
11. Function reuse (same function called multiple times)
12. Function with side effects (variable modification)
13. Long running program with functions
14. Program with control flow and functions
15. Documentation example: complete program
16. Benchmark: function call overhead
17. Benchmark: recursive vs iterative
18. Stress test: many functions
19. Stress test: deep recursion (1000+ levels)
20. Stress test: large program

---

## Critical Implementation Files

### New Files
- Parser module or extension in `src/cli/parser.ts`
- Phase 20 test files:
  - `tests/phase-20-day1-parser.test.ts`
  - `tests/phase-20-day2-cli.test.ts`
  - `tests/phase-20-day3-e2e.test.ts`
  - `tests/phase-20-day4-performance.test.ts`

### Modified Files
- `src/cli/runner.ts`: Add parseProgram() function
- `src/cli/cli.ts`: Update run() and eval() commands
- `bin/freelang.ts`: CLI entry point updates

### Reference Files
- `src/codegen/ir-generator.ts`: No changes needed
- `src/vm.ts`: No changes needed
- `src/parser/function-registry.ts`: No changes needed

---

## Testing Strategy

### Test Organization

```
Phase 20 Tests (60+ total)
├─ Day 1: Parser (10 tests)
│  └─ Function definition parsing
├─ Day 2: CLI (10 tests)
│  └─ Command handling with functions
├─ Day 3: E2E (20 tests)
│  └─ Full program execution
└─ Day 4: Performance (20 tests)
   └─ Benchmarks and examples
```

### Test Examples

**Day 1 - Parser Test**:
```typescript
it('parses function definition', () => {
  const source = `fn add(a, b) { return a + b }`;
  const ast = parseProgram(source);

  expect(ast.functionDefs).toHaveLength(1);
  expect(ast.functionDefs[0].name).toBe('add');
  expect(ast.functionDefs[0].params).toEqual(['a', 'b']);
});
```

**Day 2 - CLI Test**:
```typescript
it('runs file with function definition', async () => {
  const result = await cli.run(['run', 'test.free']);
  expect(result.ok).toBe(true);
  expect(result.value).toBe(8); // add(5, 3)
});
```

**Day 3 - E2E Test**:
```typescript
it('executes program with function', () => {
  const program = `fn double(x) { return x * 2 }\nresult = double(5)`;
  const result = execute(program);
  expect(result.value).toBe(10);
});
```

**Day 4 - Performance Test**:
```typescript
it('handles 1000 function calls efficiently', () => {
  const program = `fn inc(x) { return x + 1 }\n...`;
  const start = performance.now();
  execute(program);
  expect(performance.now() - start).toBeLessThan(500);
});
```

---

## Syntax Definition

### Function Definition Syntax

```
fn <name>(<params>) {
  <body>
}

Where:
- <name>: identifier (letters, digits, underscore)
- <params>: comma-separated identifiers (or empty)
- <body>: one or more statements/expressions
```

### Examples

```
fn add(a, b) { return a + b }

fn factorial(n) {
  if n <= 1 { return 1 }
  return n * factorial(n - 1)
}

fn greet(name) {
  return "Hello, " + name
}

fn getValue() {
  return 42
}
```

### Parsing Rules

1. `fn` keyword must start a definition
2. Function name must be valid identifier
3. Parameters are optional
4. Body can be single expression or block
5. Curly braces required for body
6. Return statement optional (last expression is return)

---

## Error Handling

### Parser Errors
- Missing function name
- Invalid parameter list
- Mismatched braces
- Invalid function body

### Runtime Errors
- Undefined function call
- Wrong number of arguments
- Recursion depth exceeded (MAX_CYCLES)

### Error Messages

```
SyntaxError: Invalid function name at line 1
SyntaxError: Expected '{' in function definition at line 2
RuntimeError: Undefined function 'foo' at statement 5
RuntimeError: Expected 2 arguments, got 1 for function 'add'
```

---

## Success Criteria

- [ ] 10+ parser tests passing (Day 1)
- [ ] 10+ CLI tests passing (Day 2)
- [ ] 20+ E2E tests passing (Day 3)
- [ ] 20+ performance tests passing (Day 4)
- [ ] Total: 60+ tests passing
- [ ] No Phase 18/19 regressions
- [ ] Real-world programs execute correctly
- [ ] Performance < 1ms per function call
- [ ] Full documentation provided
- [ ] CLI help mentions functions

---

## Timeline

| Day | Focus | Tests | Hours |
|-----|-------|-------|-------|
| 1 | Parser implementation | 10 | 3 |
| 2 | CLI integration | 10 | 3 |
| 3 | End-to-end testing | 20 | 4 |
| 4 | Performance & examples | 20 | 4 |
| **Total** | **Full CLI support** | **60** | **14** |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Parser complexity | Start simple, use regex + state machine |
| CLI integration issues | Test each command separately |
| Performance regression | Benchmark early and often |
| Syntax conflicts | Clear BNF grammar defined upfront |
| Backward compatibility | Keep existing functions working |
| Recursion depth limits | Document MAX_CYCLES limit |

---

## Deliverables

1. ✅ Function parser (supports `fn` keyword)
2. ✅ Updated CLI commands
3. ✅ 60+ comprehensive tests
4. ✅ Real-world example programs
5. ✅ Performance benchmarks
6. ✅ Full documentation
7. ✅ No regressions (Phase 18/19 tests)

---

## Next Phase (Phase 21)

After Phase 20, potential enhancements:
- Type annotations: `fn add(a: number, b: number): number`
- Default parameters: `fn greet(name, greeting = "Hello")`
- Variadic functions: `fn sum(...numbers)`
- Anonymous functions: `let double = fn(x) { return x * 2 }`
- Arrow functions: `let add = (a, b) => a + b`
- Function overloading
- Higher-order functions
- Method syntax

---

**Status**: Phase 20 Plan Complete
**Next**: Day 1 Implementation (Parser)
