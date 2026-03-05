# Task B: Quick Reference Card

**Print this out!** Quick lookup while coding.

---

## Phase B-1: Generics

### What to Parse
```
fn identity<T>(x: T) -> T
fn map<T, U>(arr: array<T>, fn: (T) -> U) -> array<U>
fn pair<A, B>(a: A, b: B) -> (A, B)
```

### Key Class: TypeEnvironment
```typescript
const env = new TypeEnvironment();
env.bind('T', 'int');
env.substitute('array<T>') // → 'array<int>'
env.addConstraint('T', { operator: 'extends', bound: 'number' })
env.solveConstraints() // → true/false
```

### Parser Method to Add
```typescript
parseTypeParams(): TypeParameter[] | undefined {
  if (!this.check(TokenType.LT)) return undefined;
  this.advance(); // <
  const params: TypeParameter[] = [];
  while (!this.check(TokenType.GT)) {
    const name = this.advance().value;
    let constraint;
    if (this.match(TokenType.EXTENDS)) {
      constraint = this.parseType();
    }
    params.push({ name, constraint });
    if (!this.match(TokenType.COMMA)) break;
  }
  this.expect(TokenType.GT);
  return params;
}
```

### Type Checker Method to Add
```typescript
checkGenericFunctionCall(
  funcName: string,
  typeArgs: string[],      // ['int', 'string']
  argTypes: string[],      // Types of arguments
  genericFuncType: GenericFunctionType
): TypeCheckResult {
  const env = new TypeEnvironment();

  // Bind type args
  for (let i = 0; i < genericFuncType.typeVars.length; i++) {
    env.bind(genericFuncType.typeVars[i], typeArgs[i]);
  }

  // Check args
  const paramNames = Object.keys(genericFuncType.params);
  for (let i = 0; i < paramNames.length; i++) {
    const paramType = genericFuncType.params[paramNames[i]];
    const subst = env.substitute(paramType);
    if (!TypeParser.areTypesCompatible(subst, argTypes[i])) {
      return { compatible: false, message: 'Mismatch' };
    }
  }

  return env.solveConstraints()
    ? { compatible: true, message: 'OK' }
    : { compatible: false, message: 'Constraint failed' };
}
```

---

## Phase B-2: Union Types

### What to Parse
```
string | number
int | string | boolean
Success<T> | Error<E>
```

### Parser Enhancement
```typescript
parseType(): TypeAnnotation {
  let type = this.parseBasicType();

  if (this.match(TokenType.PIPE)) {
    const members = [type];
    while (true) {
      members.push(this.parseBasicType());
      if (!this.match(TokenType.PIPE)) break;
    }
    return { type: 'union', members };
  }

  return type;
}
```

### Type Checker Method to Add
```typescript
checkUnionTypeCompatibility(
  valueType: string,
  unionType: UnionType
): TypeCheckResult {
  for (const member of unionType.members) {
    const memberStr = typeof member === 'string' ? member : JSON.stringify(member);
    if (TypeParser.areTypesCompatible(valueType, memberStr)) {
      return { compatible: true, message: 'OK' };
    }
  }
  return {
    compatible: false,
    message: `Type '${valueType}' not in union`,
    details: { expected: unionType.members.join(' | ') }
  };
}
```

### Pattern Matching
```typescript
parsePattern(): Pattern {
  if (this.match(TokenType.UNDERSCORE)) {
    return { type: 'wildcard' };
  }

  if (this.check(TokenType.NUMBER) || this.check(TokenType.STRING)) {
    const val = this.advance();
    return { type: 'literal', value: val.value };
  }

  if (this.check(TokenType.IDENT)) {
    const name = this.advance().value;

    // Struct pattern: Success(v)
    if (this.match(TokenType.LPAREN)) {
      const fields = [];
      while (!this.check(TokenType.RPAREN)) {
        const fieldName = this.check(TokenType.IDENT) ? this.advance().value : '';
        const fieldPattern = this.parsePattern();
        fields.push({ name: fieldName, pattern: fieldPattern });
        if (!this.match(TokenType.COMMA)) break;
      }
      this.expect(TokenType.RPAREN);
      return { type: 'struct', name, fields };
    }

    return { type: 'variable', name };
  }

  throw new ParseError(...);
}
```

---

## Phase B-3: Validation

### Variable Declaration Checking
```typescript
checkVariableDeclaration(
  varName: string,
  declaredType: TypeAnnotation | undefined,
  inferredType: string
): TypeCheckResult {
  if (!declaredType) {
    return { compatible: true, message: 'OK' };
  }

  const declaredStr = this.typeToString(declaredType);

  if (!TypeParser.areTypesCompatible(declaredStr, inferredType)) {
    return {
      compatible: false,
      message: `Type mismatch in '${varName}'`,
      details: { expected: declaredStr, received: inferredType }
    };
  }

  return { compatible: true, message: 'OK' };
}
```

### Function Argument Checking
```typescript
checkFunctionArguments(
  funcName: string,
  providedArgs: Array<{ expr: Expression; type: string }>,
  expectedParams: Parameter[]
): TypeCheckResult[] {
  const results: TypeCheckResult[] = [];

  if (providedArgs.length !== expectedParams.length) {
    results.push({
      compatible: false,
      message: `Expected ${expectedParams.length} args, got ${providedArgs.length}`
    });
    return results;
  }

  for (let i = 0; i < expectedParams.length; i++) {
    const param = expectedParams[i];
    const arg = providedArgs[i];

    if (!param.type) {
      results.push({ compatible: true, message: 'OK' });
      continue;
    }

    const paramTypeStr = this.typeToString(param.type);

    if (!TypeParser.areTypesCompatible(paramTypeStr, arg.type)) {
      results.push({
        compatible: false,
        message: `Arg ${i} type mismatch`,
        details: {
          paramName: param.name,
          paramIndex: i,
          expected: paramTypeStr,
          received: arg.type
        }
      });
    } else {
      results.push({ compatible: true, message: 'OK' });
    }
  }

  return results;
}
```

### Error Formatting
```typescript
static formatTypeError(error: TypeCheckResult, context: any): string {
  let msg = '';

  if (context.line && context.column) {
    msg += `[${context.line}:${context.column}] `;
  }

  msg += error.message;

  if (error.details) {
    msg += '\n\n  Details:';
    if (error.details.expected) msg += `\n    Expected: ${error.details.expected}`;
    if (error.details.received) msg += `\n    Received: ${error.details.received}`;
  }

  const suggestions = this.generateSuggestions(error, context);
  if (suggestions.length > 0) {
    msg += '\n\n  Suggestions:';
    suggestions.forEach(s => msg += `\n    • ${s}`);
  }

  return msg;
}
```

---

## Testing Template

```typescript
describe('Phase B-1: Generics', () => {
  it('should parse fn<T>(x: T) -> T', () => {
    const code = `fn identity<T>(x: T) -> T { return x }`;
    const ast = parseCode(code);
    expect(ast.functions[0].typeParams).toBeDefined();
    expect(ast.functions[0].typeParams?.[0].name).toBe('T');
  });

  it('should check generic function call', () => {
    const checker = new FunctionTypeChecker();
    const result = checker.checkGenericFunctionCall(
      'identity',
      ['int'],
      ['int'],
      { typeVars: ['T'], params: { x: 'T' }, returnType: 'T' }
    );
    expect(result.compatible).toBe(true);
  });
});

describe('Phase B-2: Union', () => {
  it('should parse union type string | number', () => {
    const code = `fn f(x: string | number) {}`;
    const ast = parseCode(code);
    expect(ast.functions[0].params[0].type.type).toBe('union');
  });

  it('should check union compatibility', () => {
    const checker = new FunctionTypeChecker();
    const result = checker.checkUnionTypeCompatibility(
      'string',
      { type: 'union', members: ['string', 'number'] }
    );
    expect(result.compatible).toBe(true);
  });
});

describe('Phase B-3: Validation', () => {
  it('should detect type mismatch: let x: int = "hello"', () => {
    const checker = new FunctionTypeChecker();
    const result = checker.checkVariableDeclaration('x', 'int', 'string');
    expect(result.compatible).toBe(false);
    expect(result.details?.expected).toBe('int');
  });
});
```

---

## Common Patterns

### Type Variable Substitution
```
Input:  T, array<T>, fn(T, U) -> V
Bindings: T->int, U->string, V->bool
Output: int, array<int>, fn(int, string) -> bool
```

### Type Narrowing in Match
```
type Result = Success(int) | Error(string)
match result {
  Success(v) => typeof v === int
  Error(msg) => typeof msg === string
}
```

### Union Compatibility
```
valueType: string
unionType: string | number
Compatible: YES (string is member)

valueType: boolean
unionType: string | number
Compatible: NO (boolean not in union)
```

---

## File Locations

| Component | File |
|-----------|------|
| Parser | `/src/parser/parser.ts` |
| AST | `/src/parser/ast.ts` |
| Type Checker | `/src/analyzer/type-checker.ts` |
| Type Parser | `/src/cli/type-parser.ts` |
| Union Types | `/src/type-system/union-types.ts` |
| Tests | `/test/type-system.test.ts` |

---

## Commands

```bash
# Compile check
npx tsc --noEmit

# Run existing tests
npm test

# Run new type tests
npm test -- type-system.test.ts

# Coverage
npm run coverage

# Format
npm run lint --fix
```

---

## Error Message Template

```
[line:column] In function 'funcName':
  Type mismatch in variable 'varName'

  Details:
    Expected: int
    Received: string
    Parameter: paramName

  Code:
    let x: int = "hello"

  Suggestions:
    • Cast string to number: parseInt(value)
    • Example: let x: int = parseInt("42")
```

---

## Key Classes

| Class | Purpose | Key Methods |
|-------|---------|-------------|
| `TypeEnvironment` | Manage type bindings | `bind()`, `substitute()`, `solveConstraints()` |
| `FunctionTypeChecker` | Check types | `checkGenericFunctionCall()`, `checkUnionTypeCompatibility()` |
| `TypeErrorFormatter` | Format errors | `formatTypeError()`, `generateSuggestions()` |
| `UnionTypeParser` | Parse unions | `parseUnionType()`, `parseDiscriminatedUnion()` |

---

**Keep this handy while coding!** ✨
