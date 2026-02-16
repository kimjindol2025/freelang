/**
 * Phase 2 Task 2.4: Suggestion Engine
 *
 * Integrates all Task 2.1-2.3 results to provide:
 * 1. Warnings about incomplete/ambiguous code
 * 2. Auto-fix suggestions with confidence scores
 * 3. Learning from user feedback
 * 4. Priority-based suggestion ordering
 *
 * Example:
 * ```freelang
 * fn process
 *   intent: "배열 처리"
 *   do
 *     sum = 0
 *     for item in arr
 *       sum = sum +      // ← incomplete
 *     // ← missing return
 * ↓
 * Warnings:
 *   1. INCOMPLETE_EXPR: "sum = sum +" → "sum = sum + 0" (92% confidence)
 *   2. MISSING_RETURN: Missing return for number → "return sum" (85% confidence)
 *   3. EMPTY_BLOCK: Empty loop body → "sum = stub(void)" (88% confidence)
 * ```
 */

/**
 * Warning type enumeration
 */
export enum WarningType {
  INCOMPLETE_EXPR = 'INCOMPLETE_EXPR',         // Incomplete expression
  INCOMPLETE_BODY = 'INCOMPLETE_BODY',         // Empty function body
  EMPTY_BLOCK = 'EMPTY_BLOCK',                 // Empty if/for/while block
  MISSING_RETURN = 'MISSING_RETURN',           // Missing return statement
  AMBIGUOUS_TYPE = 'AMBIGUOUS_TYPE',           // Type could be multiple types
  TYPE_MISMATCH = 'TYPE_MISMATCH',             // Type doesn't match expected
  UNUSED_VARIABLE = 'UNUSED_VARIABLE',         // Variable declared but not used
  POTENTIAL_BUG = 'POTENTIAL_BUG',             // Code smell / potential bug
  STYLE_ISSUE = 'STYLE_ISSUE',                 // Code style issue
}

/**
 * Severity level for warnings
 */
export enum SeverityLevel {
  CRITICAL = 'CRITICAL',     // Must fix before compilation
  ERROR = 'ERROR',           // Should fix
  WARNING = 'WARNING',       // May need attention
  INFO = 'INFO',             // Informational
}

/**
 * A compiled warning with suggestion
 */
export interface CompileWarning {
  type: WarningType;
  severity: SeverityLevel;
  line: number;
  column: number;
  message: string;
  code: string;                              // The problematic code
  suggestion: string;                        // What to do instead
  autoFixable: boolean;                      // Can be auto-fixed
  confidence: number;                        // Confidence 0.0-1.0
  priority: number;                          // Sort priority (1-10, 1=highest)
  reasoning: string;                         // Why this warning exists
  alternatives?: string[];                   // Other possible fixes
}

/**
 * Learning entry for feedback-based improvement
 */
export interface LearningEntry {
  timestamp: Date;
  warningType: WarningType;
  originalCode: string;
  suggestedFix: string;
  userAccepted: boolean;                    // Did user accept suggestion?
  userProvidedFix?: string;                 // Did user provide better fix?
  confidence: number;                       // Our initial confidence
  actualCorrectness: number;                // Was suggestion correct?
}

/**
 * Suggestion Engine - Analyzes code and provides warnings/fixes
 */
export class SuggestionEngine {
  private warnings: CompileWarning[] = [];
  private learningHistory: LearningEntry[] = [];
  private confidenceAdjustments: Map<string, number> = new Map();

  constructor() {
    this.loadLearningHistory();
  }

  /**
   * Main entry point: Analyze code and generate warnings/suggestions
   */
  public analyze(code: string, intent?: string): CompileWarning[] {
    this.warnings = [];

    // Pass 1: Incomplete expressions and syntax issues
    this.analyzeIncompleteness(code);

    // Pass 2: Type inference and type mismatches
    this.analyzeTypes(code, intent);

    // Pass 3: Logic issues and potential bugs
    this.analyzeLogic(code);

    // Pass 4: Style and best practices
    this.analyzeStyle(code);

    // Sort by priority
    this.warnings.sort((a, b) => a.priority - b.priority);

    return this.warnings;
  }

  /**
   * Detect incomplete expressions and syntax issues
   *
   * Patterns:
   * - Trailing operators: "x +"
   * - Unclosed parentheses: "foo("
   * - Empty blocks: "if x do"
   * - Missing return statements
   */
  private analyzeIncompleteness(code: string): void {
    const lines = code.split('\n');

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      const trimmed = line.trim();

      // Skip empty/comment lines
      if (!trimmed || trimmed.startsWith('//')) continue;

      // Check for trailing binary operators
      const trailingOpMatch = trimmed.match(/(\+|-|\*|\/|%|&&|\|\||==|!=)\s*$/);
      if (trailingOpMatch) {
        this.warnings.push({
          type: WarningType.INCOMPLETE_EXPR,
          severity: SeverityLevel.ERROR,
          line: lineIdx + 1,
          column: line.length,
          message: `Incomplete expression: operator "${trailingOpMatch[1]}" needs right operand`,
          code: trimmed,
          suggestion: `${trimmed} 0`,
          autoFixable: true,
          confidence: 0.92,
          priority: 2,
          reasoning: 'Binary operator at end of expression without right operand',
        });
      }

      // Check for unclosed parentheses
      const openParens = (line.match(/\(/g) || []).length;
      const closeParens = (line.match(/\)/g) || []).length;
      if (openParens > closeParens) {
        this.warnings.push({
          type: WarningType.INCOMPLETE_EXPR,
          severity: SeverityLevel.ERROR,
          line: lineIdx + 1,
          column: line.length,
          message: `Unclosed parenthesis (${openParens - closeParens} unmatched)`,
          code: trimmed,
          suggestion: trimmed + ')'.repeat(openParens - closeParens),
          autoFixable: true,
          confidence: 0.95,
          priority: 1,
          reasoning: 'Opening parenthesis without matching closing parenthesis',
        });
      }

      // Check for empty if/for/while blocks
      if (trimmed.match(/^(if|for|while)\s+.*\s+do\s*$/) ||
          (trimmed.match(/^(if|for|while)/) && lineIdx + 1 < lines.length &&
           lines[lineIdx + 1].trim() === '')) {
        this.warnings.push({
          type: WarningType.EMPTY_BLOCK,
          severity: SeverityLevel.WARNING,
          line: lineIdx + 1,
          column: line.length - 2,
          message: `Empty ${trimmed.split(/\s+/)[0]} block`,
          code: trimmed,
          suggestion: `${trimmed}\n  stub(void)`,
          autoFixable: true,
          confidence: 0.88,
          priority: 3,
          reasoning: 'Block statement has no body',
        });
      }
    }

    // Check for missing return statement in function
    const hasReturn = code.includes('return');
    if (!hasReturn && code.includes('output:')) {
      const outputMatch = code.match(/output:\s*(\w+)/);
      if (outputMatch) {
        const returnType = outputMatch[1];
        this.warnings.push({
          type: WarningType.MISSING_RETURN,
          severity: SeverityLevel.ERROR,
          line: code.split('\n').length,
          column: 0,
          message: `Missing return statement for output type "${returnType}"`,
          code: 'function body',
          suggestion: `return stub(${returnType})`,
          autoFixable: true,
          confidence: 0.90,
          priority: 2,
          reasoning: `Function declares output type "${returnType}" but no return statement`,
        });
      }
    }
  }

  /**
   * Detect type-related issues
   */
  private analyzeTypes(code: string, intent?: string): void {
    // Detect ambiguous types
    const ambiguousVars = this.findAmbiguousVariables(code);
    for (const [varName, types] of ambiguousVars) {
      if (types.length > 1) {
        this.warnings.push({
          type: WarningType.AMBIGUOUS_TYPE,
          severity: SeverityLevel.WARNING,
          line: 0, // Would need to track actual line
          column: 0,
          message: `Variable "${varName}" has ambiguous type (could be ${types.join(' or ')})`,
          code: varName,
          suggestion: `Declare explicit type: ${varName}: ${types[0]}`,
          autoFixable: false,
          confidence: 0.70,
          priority: 5,
          reasoning: 'Variable used with multiple incompatible types',
        });
      }
    }

    // Detect type mismatches
    const mismatches = this.findTypeMismatches(code);
    for (const mismatch of mismatches) {
      this.warnings.push({
        type: WarningType.TYPE_MISMATCH,
        severity: SeverityLevel.ERROR,
        line: mismatch.line,
        column: mismatch.column,
        message: mismatch.message,
        code: mismatch.code,
        suggestion: mismatch.suggestion,
        autoFixable: false,
        confidence: 0.75,
        priority: 3,
        reasoning: mismatch.reasoning,
      });
    }
  }

  /**
   * Detect logic issues and potential bugs
   */
  private analyzeLogic(code: string): void {
    // Detect infinite loops
    const infiniteLoops = code.match(/for\s+\w+\s+in\s+\w+\s+do(?:\n(?!\s*\w+\s*=)[^\n]*)*$/gm);
    if (infiniteLoops) {
      for (const loop of infiniteLoops) {
        if (!loop.includes('break') && !loop.includes('return')) {
          this.warnings.push({
            type: WarningType.POTENTIAL_BUG,
            severity: SeverityLevel.WARNING,
            line: 0,
            column: 0,
            message: 'Loop does not modify control variables (potential infinite loop)',
            code: loop,
            suggestion: 'Ensure loop has termination condition or modifies iterator',
            autoFixable: false,
            confidence: 0.60,
            priority: 4,
            reasoning: 'Loop variable not modified in loop body',
          });
        }
      }
    }

    // Detect unreachable code (after return)
    const lines = code.split('\n');
    let foundReturn = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('return')) {
        foundReturn = true;
      } else if (foundReturn && line && !line.startsWith('//')) {
        this.warnings.push({
          type: WarningType.POTENTIAL_BUG,
          severity: SeverityLevel.WARNING,
          line: i + 1,
          column: 0,
          message: 'Unreachable code after return statement',
          code: line,
          suggestion: 'Remove code after return or restructure logic',
          autoFixable: false,
          confidence: 0.95,
          priority: 4,
          reasoning: 'Code appears after return statement',
        });
        foundReturn = false; // Only warn once per return
      }
    }
  }

  /**
   * Analyze code style and best practices
   */
  private analyzeStyle(code: string): void {
    // Check for unused variables
    const declaredVars = new Set<string>();
    const usedVars = new Set<string>();

    const assignmentMatches = code.matchAll(/(\w+)\s*=/g);
    for (const match of assignmentMatches) {
      declaredVars.add(match[1]);
    }

    const usageMatches = code.matchAll(/(?<!=)\b([a-zA-Z_]\w*)\b(?!=)/g);
    for (const match of usageMatches) {
      usedVars.add(match[1]);
    }

    for (const variable of declaredVars) {
      if (!usedVars.has(variable) && variable !== 'result') {
        this.warnings.push({
          type: WarningType.UNUSED_VARIABLE,
          severity: SeverityLevel.INFO,
          line: 0,
          column: 0,
          message: `Variable "${variable}" declared but never used`,
          code: variable,
          suggestion: `Remove declaration of "${variable}"`,
          autoFixable: false,
          confidence: 0.80,
          priority: 7,
          reasoning: 'Variable is assigned but not used anywhere',
        });
      }
    }
  }

  /**
   * Determine if a warning can be auto-fixed
   */
  public canAutoFix(warning: CompileWarning): boolean {
    const autoFixableTypes = [
      WarningType.INCOMPLETE_EXPR,
      WarningType.INCOMPLETE_BODY,
      WarningType.EMPTY_BLOCK,
      WarningType.MISSING_RETURN,
    ];

    return warning.autoFixable && autoFixableTypes.includes(warning.type);
  }

  /**
   * Apply auto-fix to code
   */
  public applyAutoFix(code: string, warning: CompileWarning): string {
    if (!this.canAutoFix(warning)) {
      return code;
    }

    const lines = code.split('\n');
    if (warning.line > 0 && warning.line <= lines.length) {
      const targetLine = lines[warning.line - 1];
      lines[warning.line - 1] = targetLine.replace(warning.code, warning.suggestion);
    }

    return lines.join('\n');
  }

  /**
   * Record user feedback for learning
   */
  public recordFeedback(
    warningType: WarningType,
    originalCode: string,
    suggestedFix: string,
    userAccepted: boolean,
    userProvidedFix?: string
  ): void {
    const entry: LearningEntry = {
      timestamp: new Date(),
      warningType,
      originalCode,
      suggestedFix,
      userAccepted,
      userProvidedFix,
      confidence: 0.8, // Default
      actualCorrectness: userAccepted ? 1.0 : 0.0,
    };

    this.learningHistory.push(entry);
    this.updateConfidenceAdjustments(warningType);
  }

  /**
   * Get warnings of specific type
   */
  public getWarningsByType(type: WarningType): CompileWarning[] {
    return this.warnings.filter(w => w.type === type);
  }

  /**
   * Get warnings by severity
   */
  public getWarningsBySeverity(severity: SeverityLevel): CompileWarning[] {
    return this.warnings.filter(w => w.severity === severity);
  }

  /**
   * Get critical/error warnings only
   */
  public getCriticalIssues(): CompileWarning[] {
    return this.warnings.filter(
      w => w.severity === SeverityLevel.CRITICAL || w.severity === SeverityLevel.ERROR
    );
  }

  /**
   * Helper: Find variables with ambiguous types
   */
  private findAmbiguousVariables(code: string): Map<string, string[]> {
    const ambiguous = new Map<string, Set<string>>();

    // Track variable types
    const assignments = code.matchAll(/(\w+)\s*=\s*([^;\n]+)/g);
    for (const match of assignments) {
      const varName = match[1];
      const value = match[2].trim();

      let type = 'unknown';
      if (/^\d+(\.\d+)?$/.test(value)) type = 'number';
      else if (/^"[^"]*"$/.test(value)) type = 'string';
      else if (value === 'true' || value === 'false') type = 'bool';
      else if (value === '[]') type = 'array';

      if (!ambiguous.has(varName)) {
        ambiguous.set(varName, new Set());
      }
      ambiguous.get(varName)!.add(type);
    }

    // Convert to array
    const result = new Map<string, string[]>();
    for (const [varName, types] of ambiguous) {
      result.set(varName, Array.from(types));
    }

    return result;
  }

  /**
   * Helper: Find type mismatches
   */
  private findTypeMismatches(
    code: string
  ): Array<{ line: number; column: number; message: string; code: string; suggestion: string; reasoning: string }> {
    const mismatches: Array<{
      line: number;
      column: number;
      message: string;
      code: string;
      suggestion: string;
      reasoning: string;
    }> = [];

    // Example: Assignment type mismatch
    // In real implementation, this would be more sophisticated

    return mismatches;
  }

  /**
   * Load historical learning data
   */
  private loadLearningHistory(): void {
    // In real implementation, load from file/database
    // For now, initialize empty
  }

  /**
   * Update confidence based on feedback
   */
  private updateConfidenceAdjustments(warningType: WarningType): void {
    const entries = this.learningHistory.filter(e => e.warningType === warningType);
    if (entries.length > 0) {
      const correctCount = entries.filter(e => e.actualCorrectness > 0.5).length;
      const newConfidence = correctCount / entries.length;
      this.confidenceAdjustments.set(warningType, newConfidence);
    }
  }

  /**
   * Get learning statistics
   */
  public getLearningStats(): {
    totalEntries: number;
    acceptanceRate: number;
    adjustments: Map<string, number>;
  } {
    const acceptedCount = this.learningHistory.filter(e => e.userAccepted).length;
    const acceptanceRate = this.learningHistory.length > 0 ? acceptedCount / this.learningHistory.length : 0;

    return {
      totalEntries: this.learningHistory.length,
      acceptanceRate,
      adjustments: this.confidenceAdjustments,
    };
  }

  /**
   * Clear warnings
   */
  public clearWarnings(): void {
    this.warnings = [];
  }

  /**
   * Get all warnings
   */
  public getWarnings(): CompileWarning[] {
    return [...this.warnings];
  }

  /**
   * Get warning count
   */
  public getWarningCount(): number {
    return this.warnings.length;
  }
}

// Convenience function
export function createSuggestionEngine(): SuggestionEngine {
  return new SuggestionEngine();
}
