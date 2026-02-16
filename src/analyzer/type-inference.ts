/**
 * Phase 1 Task 1.3: Type Inference Engine
 *
 * Automatically infers types for:
 * - Function parameters
 * - Return values
 * - Variable assignments
 * - Expressions
 *
 * Features:
 * - Pattern-based inference (e.g., arr[0] = number → arr is array<number>)
 * - Operation-based inference (number + number = number)
 * - Context-based inference (for i in 0..10 → i is number)
 * - Nested type inference (array<array<number>>)
 */

export interface TypeInfo {
  name: string; // Variable or parameter name
  type: string; // Inferred type (number, string, bool, array, etc.)
  confidence: number; // 0.0 ~ 1.0 confidence level
  source: 'explicit' | 'inferred' | 'context'; // How type was determined
  examples?: unknown[]; // Example values seen
}

export interface InferenceContext {
  variables: Map<string, TypeInfo>;
  functions: Map<string, { params: TypeInfo[]; returns: string }>;
  loopVariables: Map<string, string>; // for i in 0..10 → i:number
}

export class TypeInferenceEngine {
  private context: InferenceContext;
  private typePatterns: Map<string, string[]> = new Map();

  constructor() {
    this.context = {
      variables: new Map(),
      functions: new Map(),
      loopVariables: new Map(),
    };
    this.initializePatterns();
  }

  /**
   * Initialize type pattern rules
   */
  private initializePatterns(): void {
    // Numbers
    this.typePatterns.set('number', [
      '\\d+(\\.\\d+)?',           // 42, 3.14
      '(number|int|float)',       // type keywords
      '(sum|count|length)',       // common number functions
      '(\\+|-|\\*|/|%)',          // arithmetic ops
    ]);

    // Strings
    this.typePatterns.set('string', [
      '"[^"]*"',                  // "hello"
      "'[^']*'",                  // 'world'
      '(string|str)',             // type keywords
      '(concat|substring|split)', // string functions
    ]);

    // Booleans
    this.typePatterns.set('bool', [
      '(true|false)',             // literal booleans
      '(bool|boolean)',           // type keywords
      '(&&|\\|\\||!)',            // logical ops
      '(>|<|==|!=|>=|<=)',        // comparison ops
    ]);

    // Arrays
    this.typePatterns.set('array', [
      '\\[.*\\]',                 // [1, 2, 3]
      '(array|list|vec)',         // type keywords
      '\\.(map|filter|reduce)',   // array methods
      '(for .* in)',              // for loops → array
    ]);
  }

  /**
   * Infer type from code tokens
   */
  public inferFromTokens(tokens: string[]): TypeInfo[] {
    const inferred: TypeInfo[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // Look for assignment: var = value
      if (i + 2 < tokens.length && tokens[i + 1] === '=') {
        const varName = token;
        const value = tokens[i + 2];
        const type = this.inferTypeFromValue(value);

        if (type) {
          inferred.push({
            name: varName,
            type,
            confidence: 0.8,
            source: 'inferred',
          });
        }
      }

      // Look for type annotations: var: type
      if (i + 2 < tokens.length && tokens[i + 1] === ':') {
        const varName = token;
        const type = tokens[i + 2];

        inferred.push({
          name: varName,
          type,
          confidence: 1.0,
          source: 'explicit',
        });
      }

      // Look for for loops: for var in range (must be at least 4 tokens away)
      if (token === 'for' && i + 3 < tokens.length) {
        if (tokens[i + 2] === 'in') {
          const loopVar = tokens[i + 1];
          this.context.loopVariables.set(loopVar, 'number');

          inferred.push({
            name: loopVar,
            type: 'number',
            confidence: 1.0,
            source: 'context',
          });
        }
      }
    }

    return inferred;
  }

  /**
   * Infer type from a value string
   */
  private inferTypeFromValue(value: string): string | null {
    // Check each type pattern
    for (const [type, patterns] of this.typePatterns) {
      for (const pattern of patterns) {
        const regex = new RegExp(pattern);
        if (regex.test(value)) {
          return type;
        }
      }
    }

    return null;
  }

  /**
   * Infer return type from function body
   *
   * Strategies:
   * - Look for "return" statements
   * - Analyze last expression
   * - Check operation results
   */
  public inferReturnType(body: string): string {
    const lines = body.split('\n');

    // Strategy 1: Look for explicit return type
    for (const line of lines) {
      const returnMatch = line.match(/return\s+(.+)/);
      if (returnMatch) {
        const value = returnMatch[1].trim();
        // Check for array methods in return value
        if (value.includes('.map') || value.includes('.filter')) {
          return 'array';
        }
        // Check for comparison operators first (before inferTypeFromValue)
        if (value.includes('>') || value.includes('<') || value.includes('==') || value.includes('!=')) {
          return 'bool';
        }
        // Check if return value is a variable
        const type = this.inferTypeFromValue(value);
        if (type) return type;
      }
    }

    // Strategy 2: Array methods (.map, .filter, etc.) return arrays
    if (body.includes('.map') || body.includes('.filter') || body.includes('.reduce')) {
      return 'array';
    }

    // Strategy 2b: String methods
    if (body.includes('concat') || body.includes('substring')) {
      return 'string';
    }

    // Strategy 2c: Arithmetic operations
    if (body.includes('+') || body.includes('-') || body.includes('*') || body.includes('/')) {
      return 'number';
    }

    // Strategy 2d: Boolean operations (check after arithmetic to avoid false matches)
    // Logical AND/OR return booleans
    if (body.includes('&&') || body.includes('||')) {
      return 'bool';
    }

    // Comparison operators in explicit return statements
    for (const line of lines) {
      if (line.includes('return')) {
        // Check for comparison operators: > < >= <= == !=
        if (line.includes('>') || line.includes('<') || line.includes('==') || line.includes('!=')) {
          return 'bool';
        }
      }
    }

    // Strategy 3: Look for array operations
    if (body.includes('[') || body.includes('.push') || body.includes('.length')) {
      return 'array';
    }

    // Default: assume number (most common in loops/arithmetic)
    return 'number';
  }

  /**
   * Infer parameter types from function usage
   *
   * Analyzes how parameters are used:
   * - arr[0] → arr is array
   * - x + 5 → x is number
   * - str.length → str is string
   */
  public inferParamTypes(paramNames: string[], body: string): Map<string, string> {
    const types = new Map<string, string>();

    for (const param of paramNames) {
      let inferredType = 'number'; // default

      // Check for array access: param[...]
      if (new RegExp(`${param}\\[`).test(body)) {
        inferredType = 'array';
      }

      // Check for arithmetic: param +/- /*/÷ ...
      if (new RegExp(`${param}\\s*[+\\-*/]`).test(body)) {
        inferredType = 'number';
      }

      // Check for string methods: param.length, param.substring, etc.
      if (new RegExp(`${param}\\.(length|substring|concat|split)`).test(body)) {
        inferredType = 'string';
      }

      // Check for array methods: param.map, param.filter, etc.
      if (new RegExp(`${param}\\.(map|filter|reduce|forEach)`).test(body)) {
        inferredType = 'array';
      }

      // Check for boolean operations
      if (new RegExp(`${param}\\s*(&&|\\|\\||!|==|!=|>|<)`).test(body)) {
        if (inferredType === 'number') {
          // Comparison of numbers
          inferredType = 'number';
        } else if (new RegExp(`${param}\\s*(&&|\\|\\||!)`).test(body)) {
          // Logical operation → boolean
          inferredType = 'bool';
        }
      }

      types.set(param, inferredType);
    }

    return types;
  }

  /**
   * Infer type of an expression
   *
   * Handles:
   * - Binary operations: number + number = number
   * - Array operations: array.map = array
   * - Function calls: parseInt("123") = number
   */
  public inferExpressionType(expr: string): string {
    // Array literals: [1, 2, 3]
    if (expr.startsWith('[') && expr.endsWith(']')) {
      return 'array';
    }

    // String literals: "hello" or 'world'
    if ((expr.startsWith('"') && expr.endsWith('"')) ||
        (expr.startsWith("'") && expr.endsWith("'"))) {
      return 'string';
    }

    // Boolean literals
    if (expr === 'true' || expr === 'false') {
      return 'bool';
    }

    // Number literals
    if (/^\d+(\.\d+)?$/.test(expr)) {
      return 'number';
    }

    // Array methods return arrays
    if (expr.includes('.map') || expr.includes('.filter') || expr.includes('.slice')) {
      return 'array';
    }

    // String methods
    if (expr.includes('.substring') || expr.includes('.concat') || expr.includes('.split')) {
      return 'string';
    }

    // Function call results
    if (expr.includes('parseInt')) return 'number';
    if (expr.includes('Math.')) return 'number';
    if (expr.includes('JSON.parse')) return 'object';

    // Arithmetic expressions
    if (/[+\-*/%]/.test(expr) && !expr.includes('.')) {
      return 'number';
    }

    // Comparison expressions return boolean
    if (/[><=!]=?/.test(expr)) {
      return 'bool';
    }

    // Logical expressions
    if (/&&|\|\||!/.test(expr)) {
      return 'bool';
    }

    // Default: unknown
    return 'any';
  }

  /**
   * Register a function with inferred signature
   */
  public registerFunction(
    name: string,
    params: TypeInfo[],
    returnType: string
  ): void {
    this.context.functions.set(name, {
      params,
      returns: returnType,
    });
  }

  /**
   * Get inference context
   */
  public getContext(): InferenceContext {
    return this.context;
  }

  /**
   * Reset context
   */
  public reset(): void {
    this.context = {
      variables: new Map(),
      functions: new Map(),
      loopVariables: new Map(),
    };
  }

  /**
   * Generate type annotation from inferred types
   */
  public generateTypeAnnotation(
    varName: string,
    type: string,
    confidence: number
  ): string {
    if (confidence >= 0.9) {
      return `${varName}: ${type}`;
    } else if (confidence >= 0.7) {
      return `${varName}: ${type} // inferred`;
    } else {
      return `${varName}: ${type}? // uncertain`;
    }
  }

  /**
   * Merge type information from multiple sources
   */
  public mergeTypes(...types: string[]): string {
    // If all types are the same, return that type
    if (new Set(types).size === 1) {
      return types[0];
    }

    // If mixed, return union type
    return types.join(' | ');
  }
}
