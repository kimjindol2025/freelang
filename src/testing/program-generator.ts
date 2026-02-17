/**
 * Random Program Generator for Stress Testing
 * Generates valid FreeLang programs for stability verification
 */

/**
 * Program generators for different complexity levels
 */
export class ProgramGenerator {
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }

  /**
   * Seeded random number generator (deterministic)
   */
  private random(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  /**
   * Random integer in range [min, max]
   */
  private randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /**
   * Generate simple number (Level 1)
   */
  generateSimpleNumber(): string {
    const num = this.randomInt(1, 100);
    return num.toString();
  }

  /**
   * Generate simple arithmetic (Level 2)
   */
  generateArithmetic(): string {
    const operators = ['+', '-', '*', '/'];
    const op = operators[this.randomInt(0, 3)];
    const a = this.randomInt(1, 50);
    const b = this.randomInt(1, 50);
    return `${a} ${op} ${b}`;
  }

  /**
   * Generate nested arithmetic (Level 3)
   */
  generateNested(): string {
    const operators = ['+', '-', '*', '/'];
    const op1 = operators[this.randomInt(0, 3)];
    const op2 = operators[this.randomInt(0, 3)];
    const a = this.randomInt(1, 20);
    const b = this.randomInt(1, 20);
    const c = this.randomInt(1, 20);

    // 50% chance for left or right nesting
    if (this.random() > 0.5) {
      return `(${a} ${op1} ${b}) ${op2} ${c}`;
    } else {
      return `${a} ${op1} (${b} ${op2} ${c})`;
    }
  }

  /**
   * Generate string literal (Level 2)
   */
  generateStringLiteral(): string {
    const strings = [
      'hello',
      'world',
      'test',
      'freelang',
      'ai',
      'code',
      'programming',
      'language'
    ];
    const str = strings[this.randomInt(0, strings.length - 1)];
    return `"${str}"`;
  }

  /**
   * Generate string concatenation (Level 3)
   */
  generateStringConcat(): string {
    const str1 = ['hello', 'world', 'test'][this.randomInt(0, 2)];
    const str2 = ['world', 'code', 'lang'][this.randomInt(0, 2)];
    return `"${str1}" + " " + "${str2}"`;
  }

  /**
   * Generate complex expression (Level 4)
   */
  generateComplex(): string {
    const types = ['number', 'arithmetic', 'nested', 'string'];
    const type = types[this.randomInt(0, types.length - 1)];

    switch (type) {
      case 'number':
        return this.generateSimpleNumber();
      case 'arithmetic':
        return this.generateArithmetic();
      case 'nested':
        return this.generateNested();
      case 'string':
        return this.random() > 0.5 ? this.generateStringLiteral() : this.generateStringConcat();
      default:
        return this.generateSimpleNumber();
    }
  }

  /**
   * Generate batch of programs at specified difficulty
   */
  generateBatch(count: number, difficulty: 'simple' | 'medium' | 'complex'): string[] {
    const programs: string[] = [];

    for (let i = 0; i < count; i++) {
      let program: string;

      switch (difficulty) {
        case 'simple':
          program = this.random() > 0.5
            ? this.generateSimpleNumber()
            : this.generateStringLiteral();
          break;

        case 'medium':
          const medium = [
            () => this.generateArithmetic(),
            () => this.generateStringLiteral(),
            () => this.generateSimpleNumber()
          ];
          program = medium[this.randomInt(0, 2)]();
          break;

        case 'complex':
          const complex = [
            () => this.generateNested(),
            () => this.generateStringConcat(),
            () => this.generateArithmetic(),
            () => this.generateComplex()
          ];
          program = complex[this.randomInt(0, 3)]();
          break;

        default:
          program = this.generateSimpleNumber();
      }

      programs.push(program);
    }

    return programs;
  }

  /**
   * Generate single program by difficulty
   */
  generate(difficulty: 'simple' | 'medium' | 'complex' = 'medium'): string {
    return this.generateBatch(1, difficulty)[0];
  }
}

/**
 * Test suite generator
 */
export class TestSuiteGenerator {
  /**
   * Generate comprehensive test suite (1000 programs)
   */
  static generateStressSuite(seed: number = 42): string[] {
    const gen = new ProgramGenerator(seed);
    const programs: string[] = [];

    // 300 simple programs
    programs.push(...gen.generateBatch(300, 'simple'));

    // 400 medium programs
    programs.push(...gen.generateBatch(400, 'medium'));

    // 300 complex programs
    programs.push(...gen.generateBatch(300, 'complex'));

    return programs;
  }

  /**
   * Generate categorized test suite for analysis
   */
  static generateCategorizedSuite(): Map<string, string[]> {
    const gen = new ProgramGenerator(42);
    const suite = new Map<string, string[]>();

    suite.set('numbers', gen.generateBatch(100, 'simple'));
    suite.set('strings', gen.generateBatch(100, 'simple'));
    suite.set('arithmetic', gen.generateBatch(200, 'medium'));
    suite.set('nested', gen.generateBatch(200, 'complex'));
    suite.set('mixed', gen.generateBatch(400, 'complex'));

    return suite;
  }
}
