# Type System Enhancement - Implementation Guide

**Status**: Ready for Development
**Target**: 6-7 hours
**Phases**: B-1, B-2, B-3 (Testing included)

---

## Quick Start Checklist

```bash
# 1. Read main analysis
cat TYPE_SYSTEM_ENHANCEMENT_ANALYSIS.md

# 2. Start Phase B-1
# [ ] Extend parser for <T, U> syntax
# [ ] Add TypeEnvironment class
# [ ] Implement constraint solving
# [ ] Test generic function calls

# 3. Continue Phase B-2
# [ ] Add union type parsing (|)
# [ ] Add discriminated union parsing
# [ ] Implement union compatibility checking
# [ ] Test match expression narrowing

# 4. Continue Phase B-3
# [ ] Add variable type validation
# [ ] Add function argument validation
# [ ] Create error formatter
# [ ] Test error messages

# 5. Testing & Integration
# [ ] Run full test suite (15+ tests)
# [ ] Check for regressions
# [ ] Create final commit
```

---

## Phase B-1: Generic<T> Integration

### 1.1: Extend Parser - parseTypeParams()

**File**: `/src/parser/parser.ts`

**Add after `parseType()` method** (~line 1500):

```typescript
/**
 * Parse type parameters: <T>, <T, U>, <T extends number>
 * Used in: fn foo<T>(x: T) -> T { ... }
 */
private parseTypeParams(): TypeParameter[] | undefined {
  if (!this.check(TokenType.LT)) {
    return undefined;
  }

  this.advance(); // consume '<'
  const params: TypeParameter[] = [];

  while (!this.check(TokenType.GT)) {
    // Parse type parameter name (T, U, K, V)
    const nameToken = this.expect(TokenType.IDENT, 'Expected type parameter name');
    const name = nameToken.value as string;

    // Optional: T extends Constraint
    let constraint: TypeAnnotation | undefined;
    if (this.match(TokenType.EXTENDS)) {
      constraint = this.parseType();  // Reuse existing parseType
    }

    params.push({ name, constraint });

    // Check for more parameters
    if (!this.match(TokenType.COMMA)) {
      break;
    }
  }

  this.expect(TokenType.GT, 'Expected > after type parameters');

  return params.length > 0 ? params : undefined;
}
```

**Update `parseFunctionDeclaration()`** (~line 1200):

Find this section:
```typescript
private parseFunctionDeclaration(): FunctionStatement {
  this.expect(TokenType.FN, 'Expected fn');
  const name = this.expect(TokenType.IDENT).value as string;

  // ADD TYPE PARAMS PARSING HERE:
  const typeParams = this.parseTypeParams();  // NEW LINE

  const { params, ...rest } = this.parseParameters();
  // ... rest of function

  return {
    type: 'function',
    name,
    typeParams,  // ADD THIS FIELD
    params,
    ...rest
  };
}
```

### 1.2: Add TypeParameter to AST

**File**: `/src/parser/ast.ts`

**Add this interface** (if not already present):

```typescript
/**
 * Type parameter with optional constraint
 * Examples:
 *   T
 *   T extends number
 *   K extends string | number
 */
export interface TypeParameter {
  name: string;
  constraint?: TypeAnnotation;
}

// Update FunctionStatement to include typeParams:
export interface FunctionStatement {
  type: 'function';
  name: string;
  typeParams?: TypeParameter[];  // ADD THIS LINE
  params: Parameter[];
  returnType?: TypeAnnotation;
  body: BlockStatement;
}
```

### 1.3: Type Checker - TypeEnvironment Class

**File**: `/src/analyzer/type-checker.ts`

**Add this class before FunctionTypeChecker**:

```typescript
/**
 * Type Environment: Maps type variables to concrete types
 * Example:
 *   env.bind('T', 'int')
 *   env.substitute('array<T>') → 'array<int>'
 */
export class TypeEnvironment {
  private bindings: Map<string, string> = new Map();
  private constraints: Map<string, TypeConstraint[]> = new Map();
  private substitutionCache: Map<string, string> = new Map();

  /**
   * Bind a type variable to a concrete type
   */
  bind(typeVar: string, concreteType: string): void {
    this.bindings.set(typeVar, concreteType);
    this.substitutionCache.clear(); // Invalidate cache
  }

  /**
   * Look up a type variable binding
   */
  lookup(typeVar: string): string | undefined {
    return this.bindings.get(typeVar);
  }

  /**
   * Substitute type variables in a type string
   *
   * Examples:
   *   substitute('T') with T->int → 'int'
   *   substitute('array<T>') with T->int → 'array<int>'
   *   substitute('fn(T, U) -> V') with T->int, U->string, V->bool → 'fn(int, string) -> bool'
   */
  substitute(type: string): string {
    // Check cache first
    if (this.substitutionCache.has(type)) {
      return this.substitutionCache.get(type)!;
    }

    let result = type;

    // Replace each type variable
    for (const [typeVar, concreteType] of this.bindings) {
      // Use word boundary to avoid partial matches (T vs TS)
      const regex = new RegExp(`\\b${typeVar}\\b`, 'g');
      result = result.replace(regex, concreteType);
    }

    // Cache result
    this.substitutionCache.set(type, result);

    return result;
  }

  /**
   * Add a constraint on a type variable
   * Example: T extends number (T must be number or subtype)
   */
  addConstraint(typeVar: string, constraint: TypeConstraint): void {
    if (!this.constraints.has(typeVar)) {
      this.constraints.set(typeVar, []);
    }
    this.constraints.get(typeVar)!.push(constraint);
  }

  /**
   * Check if all constraints are satisfied
   */
  solveConstraints(): boolean {
    for (const [typeVar, constraints] of this.constraints) {
      const binding = this.bindings.get(typeVar);

      // If variable is unbound and has constraints, fail
      if (!binding && constraints.length > 0) {
        return false;
      }

      // Check each constraint
      for (const constraint of constraints) {
        if (!this.isConstraintSatisfied(binding || 'unknown', constraint)) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Check if a type satisfies a constraint
   */
  private isConstraintSatisfied(type: string, constraint: TypeConstraint): boolean {
    if (constraint.operator === 'extends') {
      // T extends number: type must be number or subtype
      return this.isSubtypeOf(type, constraint.bound);
    }

    if (constraint.operator === 'super') {
      // T super number: type must be supertype
      return this.isSupertypeOf(type, constraint.bound);
    }

    return true;
  }

  /**
   * Subtyping relation
   * Examples:
   *   int <: number ✓
   *   string <: any ✓
   *   boolean <: int ✗
   */
  private isSubtypeOf(type: string, superType: string): boolean {
    if (type === superType) return true;

    // Subtyping rules
    const subtypeMap: Record<string, string[]> = {
      'int': ['number', 'any'],
      'number': ['any'],
      'string': ['any'],
      'boolean': ['any'],
      'array': ['any'],
      'null': ['any']
    };

    return (subtypeMap[type] || []).includes(superType);
  }

  /**
   * Supertyping relation
   */
  private isSupertypeOf(type: string, subType: string): boolean {
    return this.isSubtypeOf(subType, type);
  }

  /**
   * Merge another environment (for union types)
   */
  merge(other: TypeEnvironment): TypeEnvironment {
    const merged = new TypeEnvironment();
    for (const [k, v] of this.bindings) {
      merged.bind(k, v);
    }
    for (const [k, v] of other.bindings) {
      merged.bind(k, v);
    }
    return merged;
  }

  /**
   * Create a child environment (for nested scopes)
   */
  child(): TypeEnvironment {
    const child = new TypeEnvironment();
    // Inherit parent bindings
    for (const [k, v] of this.bindings) {
      child.bind(k, v);
    }
    return child;
  }
}
```

### 1.4: Generic Function Checking

**File**: `/src/analyzer/type-checker.ts`

**Add this method to FunctionTypeChecker class**:

```typescript
/**
 * Check generic function call
 *
 * Example:
 *   fn identity<T>(x: T) -> T { return x }
 *   identity<int>(42)  // T bound to int
 *
 * Steps:
 *   1. Create type environment
 *   2. Bind type arguments to type parameters
 *   3. Substitute type parameters in param/return types
 *   4. Check argument types against substituted param types
 *   5. Solve constraints
 */
checkGenericFunctionCall(
  funcName: string,
  typeArgs: string[],  // [int, string]
  argTypes: string[],  // Types of actual arguments
  genericFuncType: GenericFunctionType
): TypeCheckResult {
  // Step 1: Create environment
  const env = new TypeEnvironment();

  // Step 2: Bind type arguments
  if (typeArgs.length !== genericFuncType.typeVars.length) {
    return {
      compatible: false,
      message: `Function '${funcName}' expects ${genericFuncType.typeVars.length} type arguments, got ${typeArgs.length}`,
      details: {
        expected: `${genericFuncType.typeVars.length} type args`,
        received: `${typeArgs.length} type args`
      }
    };
  }

  for (let i = 0; i < genericFuncType.typeVars.length; i++) {
    const typeVar = genericFuncType.typeVars[i];
    const concreteType = typeArgs[i];
    env.bind(typeVar, concreteType);
  }

  // Step 3 & 4: Substitute and check parameter types
  const paramNames = Object.keys(genericFuncType.params);

  if (argTypes.length !== paramNames.length) {
    return {
      compatible: false,
      message: `Function '${funcName}' expects ${paramNames.length} arguments, got ${argTypes.length}`
    };
  }

  for (let i = 0; i < paramNames.length; i++) {
    const paramName = paramNames[i];
    const paramType = genericFuncType.params[paramName];
    const substitutedType = env.substitute(paramType);
    const providedType = argTypes[i];

    if (!TypeParser.areTypesCompatible(substitutedType, providedType)) {
      return {
        compatible: false,
        message: `Parameter '${paramName}' type mismatch in generic function '${funcName}'`,
        details: {
          paramName,
          paramIndex: i,
          expected: substitutedType,
          received: providedType
        }
      };
    }
  }

  // Step 5: Solve constraints
  if (!env.solveConstraints()) {
    return {
      compatible: false,
      message: `Type constraints not satisfied for '${funcName}'`
    };
  }

  return {
    compatible: true,
    message: 'Generic function call is type-safe'
  };
}

/**
 * Infer type arguments from function call arguments
 *
 * Example:
 *   fn identity<T>(x: T) -> T { ... }
 *   identity(42)  // Infer: T = int (no explicit <int>)
 */
inferTypeArguments(
  argTypes: string[],
  paramTypes: Record<string, string>,
  typeVars: string[]
): string[] {
  const inferred: string[] = [];
  const bindings = new Map<string, string>();

  const paramNames = Object.keys(paramTypes);

  // Simple inference: match parameters left to right
  for (let i = 0; i < Math.min(argTypes.length, paramNames.length); i++) {
    const paramType = paramTypes[paramNames[i]];
    const argType = argTypes[i];

    // If param type is a type variable, bind it
    if (typeVars.includes(paramType)) {
      bindings.set(paramType, argType);
    }
  }

  // Collect inferred types in order
  for (const typeVar of typeVars) {
    inferred.push(bindings.get(typeVar) || 'unknown');
  }

  return inferred;
}
```

---

## Phase B-2: Union & Discriminated Union Types

### 2.1: Parser - Union Type Parsing

**File**: `/src/parser/parser.ts`

**Update `parseType()` method** (~line 1400):

Replace or enhance the existing parseType method:

```typescript
/**
 * Parse type annotation, including union types
 *
 * Examples:
 *   int
 *   string
 *   array<int>
 *   string | number        ← UNION
 *   string | number | bool ← UNION
 */
private parseType(): TypeAnnotation {
  // Parse first type
  let type = this.parseBasicType();

  // Check for union operator |
  if (this.match(TokenType.PIPE)) {
    const members: TypeAnnotation[] = [type];

    // Parse additional union members
    while (true) {
      members.push(this.parseBasicType());

      if (!this.match(TokenType.PIPE)) {
        break;
      }
    }

    return {
      type: 'union',
      members
    };
  }

  return type;
}

/**
 * Parse basic (non-union) type
 * Examples: int, string, array<T>, fn(int) -> string
 */
private parseBasicType(): TypeAnnotation {
  // Get primary type (identifier or keyword)
  let typeStr = '';

  if (this.check(TokenType.IDENT)) {
    typeStr = this.advance().value as string;
  } else if (this.check(TokenType.ARRAY)) {
    typeStr = this.advance().value as string;
  } else if (this.check(TokenType.FN)) {
    // Function type: fn(ParamTypes) -> ReturnType
    return this.parseFunctionType();
  } else {
    throw new ParseError(
      this.current().line,
      this.current().column,
      'Expected type annotation'
    );
  }

  // Check for generic parameters: array<T>, Option<T>
  if (this.match(TokenType.LT)) {
    typeStr += '<';

    while (!this.check(TokenType.GT)) {
      typeStr += this.parseBasicType();

      if (this.match(TokenType.COMMA)) {
        typeStr += ', ';
      } else {
        break;
      }
    }

    this.expect(TokenType.GT);
    typeStr += '>';
  }

  return typeStr;
}

/**
 * Parse function type: fn(int, string) -> bool
 */
private parseFunctionType(): TypeAnnotation {
  this.expect(TokenType.FN);
  this.expect(TokenType.LPAREN);

  const paramTypes: TypeAnnotation[] = [];

  while (!this.check(TokenType.RPAREN)) {
    paramTypes.push(this.parseType());

    if (!this.match(TokenType.COMMA)) {
      break;
    }
  }

  this.expect(TokenType.RPAREN);
  this.expect(TokenType.ARROW);

  const returnType = this.parseType();

  return `fn(${paramTypes.join(', ')}) -> ${returnType}`;
}
```

### 2.2: Parser - Discriminated Union Pattern Matching

**File**: `/src/parser/parser.ts`

**Add this method** (for match expression enhancements):

```typescript
/**
 * Parse match expression with pattern narrowing support
 *
 * Example:
 *   match result {
 *     Success(value) => println(value),
 *     Error(msg) => println(msg)
 *   }
 */
private parseMatchExpression(): MatchExpression {
  this.expect(TokenType.MATCH);
  const subject = this.parseExpression();

  this.expect(TokenType.LBRACE);

  const arms: MatchArm[] = [];

  while (!this.check(TokenType.RBRACE)) {
    // Parse pattern
    const pattern = this.parsePattern();

    this.expect(TokenType.ARROW);

    // Parse body
    const body = this.parseExpression();

    arms.push({ pattern, body });

    // Optional comma
    this.match(TokenType.COMMA);
  }

  this.expect(TokenType.RBRACE);

  return {
    type: 'match',
    subject,
    arms
  };
}

/**
 * Parse patterns for match expressions
 *
 * Patterns:
 *   42              → literal pattern
 *   x               → variable pattern
 *   _               → wildcard pattern
 *   Success(v)      → struct pattern (discriminated union)
 *   [a, b, c]       → array pattern
 */
private parsePattern(): Pattern {
  // Check for wildcard
  if (this.match(TokenType.UNDERSCORE)) {
    return {
      type: 'wildcard'
    };
  }

  // Check for literal
  if (this.check(TokenType.NUMBER) || this.check(TokenType.STRING) || this.check(TokenType.TRUE) || this.check(TokenType.FALSE)) {
    const literal = this.advance();
    return {
      type: 'literal',
      value: literal.value as string | number | boolean,
      valueType: this.inferLiteralType(literal)
    };
  }

  // Check for identifier (variable or struct pattern)
  if (this.check(TokenType.IDENT)) {
    const name = this.advance().value as string;

    // Check for struct pattern: Success(v) or Error(msg)
    if (this.match(TokenType.LPAREN)) {
      const fields: Array<{ name: string; pattern: Pattern }> = [];

      while (!this.check(TokenType.RPAREN)) {
        // Could be: Success(v) → single field
        // Or: { kind: 'success', value: v }
        const fieldName = this.check(TokenType.IDENT)
          ? (this.advance().value as string)
          : `_${fields.length}`;  // Auto-generated field name

        if (this.match(TokenType.COLON)) {
          const fieldPattern = this.parsePattern();
          fields.push({ name: fieldName, pattern: fieldPattern });
        } else {
          // Positional argument: Success(v) binds to first field
          fields.push({ name: fieldName, pattern: { type: 'variable', name: fieldName } });
        }

        if (!this.match(TokenType.COMMA)) break;
      }

      this.expect(TokenType.RPAREN);

      return {
        type: 'struct',
        name,
        fields
      };
    }

    // Check for array pattern: [a, b, c]
    if (this.match(TokenType.LBRACKET)) {
      const elements: Pattern[] = [];

      while (!this.check(TokenType.RBRACKET)) {
        elements.push(this.parsePattern());

        if (!this.match(TokenType.COMMA)) break;
      }

      this.expect(TokenType.RBRACKET);

      return {
        type: 'array',
        elements
      };
    }

    // Simple variable pattern
    return {
      type: 'variable',
      name
    };
  }

  // Check for array pattern starting with [
  if (this.match(TokenType.LBRACKET)) {
    const elements: Pattern[] = [];

    while (!this.check(TokenType.RBRACKET)) {
      elements.push(this.parsePattern());

      if (!this.match(TokenType.COMMA)) break;
    }

    this.expect(TokenType.RBRACKET);

    return {
      type: 'array',
      elements
    };
  }

  throw new ParseError(
    this.current().line,
    this.current().column,
    'Expected pattern'
  );
}

private inferLiteralType(token: Token): 'number' | 'string' | 'bool' {
  if (token.type === TokenType.NUMBER) return 'number';
  if (token.type === TokenType.STRING) return 'string';
  return 'bool';
}
```

### 2.3: Type Checker - Union Compatibility

**File**: `/src/analyzer/type-checker.ts`

**Add these methods to FunctionTypeChecker**:

```typescript
/**
 * Check if a type is compatible with a union type
 *
 * Example:
 *   valueType = 'string'
 *   unionType = { type: 'union', members: ['string', 'number'] }
 *   Result: compatible (string is a member)
 */
checkUnionTypeCompatibility(
  valueType: string,
  unionType: UnionType
): TypeCheckResult {
  // Check if value type matches any union member
  for (const member of unionType.members) {
    const memberStr = typeof member === 'string' ? member : JSON.stringify(member);

    if (TypeParser.areTypesCompatible(valueType, memberStr)) {
      return {
        compatible: true,
        message: `Type '${valueType}' is assignable to union`,
        details: {
          expected: unionType.members.map(m => typeof m === 'string' ? m : JSON.stringify(m)).join(' | ')
        }
      };
    }
  }

  return {
    compatible: false,
    message: `Type '${valueType}' is not assignable to union`,
    details: {
      expected: unionType.members.map(m => typeof m === 'string' ? m : JSON.stringify(m)).join(' | '),
      received: valueType
    }
  };
}

/**
 * Narrow a union type based on pattern matching
 *
 * Example:
 *   type Result = Success(int) | Error(string)
 *   match result {
 *     Success(v) => v has type int
 *     Error(msg) => msg has type string
 *   }
 */
narrowUnionType(
  valueType: string | UnionType | DiscriminatedUnion,
  pattern: Pattern,
  arm: MatchArm
): TypeNarrowingResult {
  if (typeof valueType === 'string') {
    // Not a union, no narrowing needed
    return {
      compatible: true,
      narrowedType: valueType,
      bindings: {}
    };
  }

  if ('type' in valueType && valueType.type === 'union') {
    // Union type: match pattern against members
    const unionType = valueType as UnionType;

    if (pattern.type === 'literal') {
      // match x { 42 => ... }
      const literalPattern = pattern as LiteralPattern;

      for (const member of unionType.members) {
        const memberStr = typeof member === 'string' ? member : JSON.stringify(member);
        const literalType = typeof literalPattern.value === 'number' ? 'number' : 'string';

        if (memberStr === literalType) {
          return {
            compatible: true,
            narrowedType: memberStr,
            bindings: {}
          };
        }
      }

      return {
        compatible: false,
        narrowedType: 'never',
        bindings: {},
        error: {
          compatible: false,
          message: `Pattern does not match union type`
        }
      };
    }

    if (pattern.type === 'variable') {
      // match result { x => ... } - x has the full union type
      const varPattern = pattern as VariablePattern;
      return {
        compatible: true,
        narrowedType: valueType as any,
        bindings: {
          [varPattern.name]: unionType
        }
      };
    }
  }

  if ('type' in valueType && valueType.type === 'discriminated-union') {
    // Discriminated union: match pattern against discriminant values
    const discUnion = valueType as DiscriminatedUnion;

    if (pattern.type === 'struct') {
      // match result { Success(v) => ... }
      const structPattern = pattern as StructPattern;

      // Check if pattern name matches a union member
      if (discUnion.members[structPattern.name]) {
        const narrowedType = discUnion.members[structPattern.name];
        const bindings: Record<string, any> = {};

        // Bind fields from pattern
        for (const field of structPattern.fields) {
          if (field.pattern.type === 'variable') {
            const varPattern = field.pattern as VariablePattern;
            bindings[varPattern.name] = field.name;  // Field type would be looked up
          }
        }

        return {
          compatible: true,
          narrowedType,
          bindings
        };
      }

      return {
        compatible: false,
        narrowedType: 'never',
        bindings: {},
        error: {
          compatible: false,
          message: `Pattern '${structPattern.name}' not found in discriminated union`
        }
      };
    }
  }

  return {
    compatible: true,
    narrowedType: valueType as any,
    bindings: {}
  };
}

interface TypeNarrowingResult {
  compatible: boolean;
  narrowedType: string | UnionType | DiscriminatedUnion;
  bindings: Record<string, any>;
  error?: TypeCheckResult;
}
```

---

## Phase B-3: Type Validation & Error Handling

### 3.1: Strict Type Checking

**File**: `/src/analyzer/type-checker.ts`

**Add this method to FunctionTypeChecker**:

```typescript
/**
 * Check variable declaration type
 *
 * Examples:
 *   let x: int = 42      → compatible
 *   let x: int = "hello" → ERROR
 */
checkVariableDeclaration(
  varName: string,
  declaredType: TypeAnnotation | undefined,
  inferredType: string
): TypeCheckResult {
  // If no explicit type, inference-only mode
  if (!declaredType) {
    return {
      compatible: true,
      message: `Type inferred as '${inferredType}'`,
      details: {
        paramName: varName
      }
    };
  }

  // Convert declared type to string for comparison
  const declaredStr = this.typeToString(declaredType);

  // Strict compatibility check
  if (!TypeParser.areTypesCompatible(declaredStr, inferredType)) {
    return {
      compatible: false,
      message: `Type mismatch in variable declaration '${varName}'`,
      details: {
        paramName: varName,
        expected: declaredStr,
        received: inferredType
      }
    };
  }

  return {
    compatible: true,
    message: `Type annotation verified`
  };
}

/**
 * Convert TypeAnnotation to string representation
 *
 * Examples:
 *   'int' → 'int'
 *   { type: 'union', members: ['string', 'number'] } → 'string | number'
 */
private typeToString(type: TypeAnnotation): string {
  if (typeof type === 'string') {
    return type;
  }

  if ('type' in type) {
    if (type.type === 'union') {
      const unionType = type as UnionType;
      return unionType.members
        .map(m => this.typeToString(m))
        .join(' | ');
    }

    if (type.type === 'discriminated-union') {
      const discUnion = type as DiscriminatedUnion;
      return Object.keys(discUnion.members)
        .map(k => `${k}<...>`)
        .join(' | ');
    }
  }

  return 'unknown';
}

/**
 * Check function call argument types
 *
 * Returns array of TypeCheckResult, one per argument
 */
checkFunctionArguments(
  funcName: string,
  providedArgs: Array<{ expr: Expression; type: string }>,
  expectedParams: Parameter[]
): TypeCheckResult[] {
  const results: TypeCheckResult[] = [];

  // Check argument count
  if (providedArgs.length !== expectedParams.length) {
    results.push({
      compatible: false,
      message: `Function '${funcName}' expects ${expectedParams.length} arguments, got ${providedArgs.length}`
    });
    return results;
  }

  // Check each argument
  for (let i = 0; i < expectedParams.length; i++) {
    const param = expectedParams[i];
    const arg = providedArgs[i];

    // Skip if parameter has no type annotation
    if (!param.type) {
      results.push({ compatible: true, message: 'OK' });
      continue;
    }

    const paramTypeStr = this.typeToString(param.type);

    // Check type compatibility
    if (!TypeParser.areTypesCompatible(paramTypeStr, arg.type)) {
      results.push({
        compatible: false,
        message: `Argument ${i} type mismatch in function '${funcName}'`,
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

### 3.2: Error Formatter & Suggestions

**File**: `/src/analyzer/type-checker.ts`

**Add this class**:

```typescript
/**
 * Format type errors with helpful suggestions
 */
export class TypeErrorFormatter {
  /**
   * Format a type check error into a readable message
   *
   * Includes:
   *   - Line/column information
   *   - Expected vs. received types
   *   - Contextual code snippet
   *   - Helpful suggestions for fixing
   */
  static formatTypeError(
    error: TypeCheckResult,
    context: {
      functionName?: string;
      line?: number;
      column?: number;
      code?: string;
      varName?: string;
    }
  ): string {
    let message = '';

    // 1. Location header
    if (context.line && context.column) {
      message += `[${context.line}:${context.column}] `;
    }

    // 2. Context (function or variable)
    if (context.functionName) {
      message += `In function '${context.functionName}': `;
    } else if (context.varName) {
      message += `In variable '${context.varName}': `;
    }

    // 3. Main error message
    message += error.message;

    // 4. Expected vs. Received
    if (error.details) {
      message += '\n\n  Details:';

      if (error.details.expected) {
        message += `\n    Expected: ${error.details.expected}`;
      }

      if (error.details.received) {
        message += `\n    Received: ${error.details.received}`;
      }

      if (error.details.paramName) {
        message += `\n    Parameter: ${error.details.paramName}`;
      }
    }

    // 5. Code snippet
    if (context.code) {
      message += `\n\n  Code:\n    ${context.code}`;
    }

    // 6. Helpful suggestions
    const suggestions = this.generateSuggestions(error, context);
    if (suggestions.length > 0) {
      message += '\n\n  Suggestions:';
      suggestions.forEach(s => message += `\n    • ${s}`);
    }

    return message;
  }

  /**
   * Generate helpful suggestions based on type mismatch
   */
  private static generateSuggestions(
    error: TypeCheckResult,
    context: { functionName?: string; varName?: string }
  ): string[] {
    const suggestions: string[] = [];

    if (!error.details) {
      return suggestions;
    }

    const expected = error.details.expected?.toLowerCase();
    const received = error.details.received?.toLowerCase();

    if (!expected || !received) {
      return suggestions;
    }

    // String to number conversions
    if (expected === 'number' && received === 'string') {
      suggestions.push('Cast string to number: parseInt(value) or parseFloat(value)');
      suggestions.push('Example: let x: int = parseInt("42")');
    }

    // Number to string conversions
    if (expected === 'string' && received === 'number') {
      suggestions.push('Cast number to string: str(value)');
      suggestions.push('Example: let x: string = str(42)');
    }

    // Boolean conversions
    if (expected === 'boolean' && received === 'string') {
      suggestions.push('Check truthiness or convert explicitly');
      suggestions.push('Example: if value == "true" { ... }');
    }

    // Union type suggestion
    if (expected?.includes('|')) {
      suggestions.push(`Use one of the union members: ${expected}`);
    }

    // Generic type instantiation
    if (expected?.includes('<') && !received?.includes('<')) {
      suggestions.push(`Specify type parameter(s) for: ${expected}`);
      suggestions.push('Example: let arr: array<int> = [1, 2, 3]');
    }

    // Array type mismatch
    if (expected?.startsWith('array') && !received?.startsWith('array')) {
      suggestions.push(`Expected array, but received ${received}`);
      suggestions.push('Create an array: let arr = [...]');
    }

    // Generic function
    if (error.message.includes('type argument')) {
      suggestions.push('Specify all type arguments when calling generic functions');
      suggestions.push('Example: identity<int>(42)');
    }

    return suggestions;
  }

  /**
   * Generate error report for multiple errors
   */
  static generateErrorReport(
    errors: Array<{
      error: TypeCheckResult;
      context: any;
    }>
  ): string {
    let report = `\n╔═══════════════════════════════════════════╗\n`;
    report += `║  Type Check Errors (${errors.length})  \n`;
    report += `╚═══════════════════════════════════════════╝\n\n`;

    for (let i = 0; i < errors.length; i++) {
      report += `Error ${i + 1}:\n`;
      report += this.formatTypeError(errors[i].error, errors[i].context);
      report += '\n\n' + '─'.repeat(40) + '\n\n';
    }

    return report;
  }
}
```

**Update exports** in `/src/analyzer/type-checker.ts`:
```typescript
export { TypeErrorFormatter, TypeEnvironment };
```

---

## Phase B-4: Testing

See the comprehensive test file in the main analysis document (`TYPE_SYSTEM_ENHANCEMENT_ANALYSIS.md` section B-4).

Create file `/test/type-system.test.ts` with all 15+ test cases.

---

## Integration Checklist

After implementing all phases:

```bash
# 1. Verify no TypeScript compilation errors
npx tsc --noEmit

# 2. Run existing tests (should all pass)
npm test

# 3. Run new type system tests
npm test -- type-system.test.ts

# 4. Check test coverage
npm run coverage

# 5. Verify performance impact
npm run benchmark

# 6. Create final commit
git add -A
git commit -m "feat: Type System 강화 - Generics + Union Types + Validation"
```

---

## Quick Reference

### Type Annotations
```
int, string, boolean, number, array<T>, fn(T) -> U
```

### Generic Syntax
```
fn identity<T>(x: T) -> T { return x }
fn map<T,U>(arr: array<T>, fn: (T)->U) -> array<U> { ... }
fn pair<A,B>(a: A, b: B) -> array<A|B> { ... }
```

### Union Types
```
let x: int | string = 42
let result: Success<T> | Error<E> = divide(10, 2)
```

### Discriminated Union Pattern
```
type Result<T, E> = Success<T> | Error<E>

match result {
  Success(v) => println(v),
  Error(msg) => println("Error: " + msg)
}
```

---

## Support & Debugging

If stuck, check:
1. AST types in `/src/parser/ast.ts`
2. Type parser in `/src/cli/type-parser.ts`
3. Type checker in `/src/analyzer/type-checker.ts`
4. Union types in `/src/type-system/union-types.ts`
5. Parser in `/src/parser/parser.ts`

Good luck! 🚀
