/**
 * Function Registry - Manages user-defined functions
 * Stores and retrieves function definitions
 */

export interface FunctionDefinition {
  type: string;  // 'FunctionDefinition' or any type string for flexibility
  name: string;
  params: string[];
  body: any;  // ASTNode
  returnType?: string;  // Optional: number, string, array
}

/**
 * Registry for user-defined functions
 * Handles storage, lookup, and validation
 */
export class FunctionRegistry {
  private functions: Map<string, FunctionDefinition> = new Map();
  private callHistory: Array<{ name: string; timestamp: number }> = [];

  /**
   * Register a function definition
   */
  register(def: FunctionDefinition): void {
    if (!def.name || !Array.isArray(def.params) || !def.body) {
      throw new Error('Invalid function definition');
    }

    // Check for duplicate (allow shadowing in Phase 19, warn only)
    if (this.functions.has(def.name)) {
      console.warn(`Function '${def.name}' is being redefined`);
    }

    this.functions.set(def.name, def);
  }

  /**
   * Look up a function by name
   */
  lookup(name: string): FunctionDefinition | null {
    return this.functions.get(name) || null;
  }

  /**
   * Check if function exists
   */
  exists(name: string): boolean {
    return this.functions.has(name);
  }

  /**
   * Get all functions
   */
  getAll(): FunctionDefinition[] {
    return Array.from(this.functions.values());
  }

  /**
   * Get function count
   */
  count(): number {
    return this.functions.size;
  }

  /**
   * Get function names
   */
  getNames(): string[] {
    return Array.from(this.functions.keys());
  }

  /**
   * Clear all functions
   */
  clear(): void {
    this.functions.clear();
    this.callHistory = [];
  }

  /**
   * Track function call (for debugging/analysis)
   */
  trackCall(name: string): void {
    this.callHistory.push({
      name,
      timestamp: Date.now()
    });
  }

  /**
   * Get call history
   */
  getCallHistory(): Array<{ name: string; timestamp: number }> {
    return [...this.callHistory];
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalFunctions: number;
    functionNames: string[];
    totalCalls: number;
    callsByFunction: Record<string, number>;
  } {
    const callsByFunction: Record<string, number> = {};

    for (const call of this.callHistory) {
      callsByFunction[call.name] = (callsByFunction[call.name] || 0) + 1;
    }

    return {
      totalFunctions: this.functions.size,
      functionNames: this.getNames(),
      totalCalls: this.callHistory.length,
      callsByFunction
    };
  }

  /**
   * Validate function definition
   */
  static validate(def: FunctionDefinition): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!def.name || typeof def.name !== 'string') {
      errors.push('Function must have a name (string)');
    }

    if (!Array.isArray(def.params)) {
      errors.push('Function params must be an array');
    }

    if (def.params.some(p => typeof p !== 'string')) {
      errors.push('All parameter names must be strings');
    }

    if (!def.body || typeof def.body !== 'object') {
      errors.push('Function must have a body (ASTNode)');
    }

    // Check for duplicate parameter names
    const paramSet = new Set(def.params);
    if (paramSet.size !== def.params.length) {
      errors.push('Function has duplicate parameter names');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * Local scope for function execution
 * Manages variables in function scope with parent chain
 */
export class LocalScope {
  private variables: Map<string, unknown> = new Map();

  constructor(
    private parent: LocalScope | null = null,
    parameters?: Map<string, unknown>
  ) {
    // Initialize with parameters if provided
    if (parameters) {
      this.variables = new Map(parameters);
    }
  }

  /**
   * Get variable value
   */
  get(name: string): unknown {
    if (this.variables.has(name)) {
      return this.variables.get(name);
    }

    // Look in parent scope
    if (this.parent) {
      return this.parent.get(name);
    }

    return undefined;
  }

  /**
   * Set variable in current scope
   */
  set(name: string, value: unknown): void {
    this.variables.set(name, value);
  }

  /**
   * Check if variable exists in this scope or parent
   */
  has(name: string): boolean {
    if (this.variables.has(name)) {
      return true;
    }

    if (this.parent) {
      return this.parent.has(name);
    }

    return false;
  }

  /**
   * Get all variables in this scope (not parent)
   */
  getLocal(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of this.variables.entries()) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Create child scope
   */
  createChild(parameters?: Map<string, unknown>): LocalScope {
    return new LocalScope(this, parameters);
  }

  /**
   * Get parent scope
   */
  getParent(): LocalScope | null {
    return this.parent;
  }
}
