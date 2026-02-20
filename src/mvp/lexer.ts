/**
 * MVP Lexer - Tokenizer
 * FreeLang 소스 코드를 토큰으로 분해
 */

export enum TokenType {
  // Literals
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  IDENTIFIER = 'IDENTIFIER',

  // Keywords
  LET = 'LET',
  IF = 'IF',
  ELSE = 'ELSE',
  WHILE = 'WHILE',
  FOR = 'FOR',
  FN = 'FN',
  RETURN = 'RETURN',
  TRUE = 'TRUE',
  FALSE = 'FALSE',

  // Operators
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  STAR = 'STAR',
  SLASH = 'SLASH',
  PERCENT = 'PERCENT',
  ASSIGN = 'ASSIGN',
  EQ = 'EQ',
  NE = 'NE',
  LT = 'LT',
  LE = 'LE',
  GT = 'GT',
  GE = 'GE',
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACE = 'LBRACE',
  RBRACE = 'RBRACE',
  SEMICOLON = 'SEMICOLON',
  COMMA = 'COMMA',

  // Special
  EOF = 'EOF',
  NEWLINE = 'NEWLINE'
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  col: number;
}

export class Lexer {
  private input: string;
  private pos = 0;
  private line = 1;
  private col = 1;
  private tokens: Token[] = [];

  private keywords: Record<string, TokenType> = {
    let: TokenType.LET,
    if: TokenType.IF,
    else: TokenType.ELSE,
    while: TokenType.WHILE,
    for: TokenType.FOR,
    fn: TokenType.FN,
    return: TokenType.RETURN,
    true: TokenType.TRUE,
    false: TokenType.FALSE
  };

  constructor(input: string) {
    this.input = input;
  }

  /**
   * 현재 문자
   */
  private current(): string {
    return this.input[this.pos] || '';
  }

  /**
   * 다음 문자
   */
  private peek(): string {
    return this.input[this.pos + 1] || '';
  }

  /**
   * 다음으로 이동
   */
  private advance(): void {
    if (this.current() === '\n') {
      this.line++;
      this.col = 1;
    } else {
      this.col++;
    }
    this.pos++;
  }

  /**
   * 공백 스킵
   */
  private skipWhitespace(): void {
    while (this.current() && /[ \t\r]/.test(this.current())) {
      this.advance();
    }
  }

  /**
   * 주석 스킵
   */
  private skipComment(): void {
    if (this.current() === '/' && this.peek() === '/') {
      while (this.current() && this.current() !== '\n') {
        this.advance();
      }
    }
  }

  /**
   * 숫자 파싱
   */
  private readNumber(): Token {
    const start = this.pos;
    const line = this.line;
    const col = this.col;

    while (this.current() && /[0-9.]/.test(this.current())) {
      this.advance();
    }

    return {
      type: TokenType.NUMBER,
      value: this.input.slice(start, this.pos),
      line,
      col
    };
  }

  /**
   * 문자열 파싱
   */
  private readString(quote: string): Token {
    const line = this.line;
    const col = this.col;
    this.advance(); // skip opening quote

    let value = '';
    while (this.current() && this.current() !== quote) {
      if (this.current() === '\\') {
        this.advance();
        const char = this.current();
        value += char === 'n' ? '\n' : char;
        this.advance();
      } else {
        value += this.current();
        this.advance();
      }
    }

    this.advance(); // skip closing quote

    return {
      type: TokenType.STRING,
      value,
      line,
      col
    };
  }

  /**
   * 식별자/키워드 파싱
   */
  private readIdentifier(): Token {
    const start = this.pos;
    const line = this.line;
    const col = this.col;

    while (this.current() && /[a-zA-Z0-9_]/.test(this.current())) {
      this.advance();
    }

    const value = this.input.slice(start, this.pos);
    const type = this.keywords[value] || TokenType.IDENTIFIER;

    return { type, value, line, col };
  }

  /**
   * 토큰화
   */
  tokenize(): Token[] {
    while (this.pos < this.input.length) {
      this.skipWhitespace();
      this.skipComment();

      if (this.pos >= this.input.length) break;

      const line = this.line;
      const col = this.col;
      const char = this.current();

      if (char === '\n') {
        this.tokens.push({ type: TokenType.NEWLINE, value: '\n', line, col });
        this.advance();
      } else if (/[0-9]/.test(char)) {
        this.tokens.push(this.readNumber());
      } else if (char === '"' || char === "'") {
        this.tokens.push(this.readString(char));
      } else if (/[a-zA-Z_]/.test(char)) {
        this.tokens.push(this.readIdentifier());
      } else if (char === '+') {
        this.tokens.push({ type: TokenType.PLUS, value: '+', line, col });
        this.advance();
      } else if (char === '-') {
        this.tokens.push({ type: TokenType.MINUS, value: '-', line, col });
        this.advance();
      } else if (char === '*') {
        this.tokens.push({ type: TokenType.STAR, value: '*', line, col });
        this.advance();
      } else if (char === '/') {
        this.tokens.push({ type: TokenType.SLASH, value: '/', line, col });
        this.advance();
      } else if (char === '%') {
        this.tokens.push({ type: TokenType.PERCENT, value: '%', line, col });
        this.advance();
      } else if (char === '=') {
        if (this.peek() === '=') {
          this.tokens.push({ type: TokenType.EQ, value: '==', line, col });
          this.advance();
          this.advance();
        } else {
          this.tokens.push({ type: TokenType.ASSIGN, value: '=', line, col });
          this.advance();
        }
      } else if (char === '!' && this.peek() === '=') {
        this.tokens.push({ type: TokenType.NE, value: '!=', line, col });
        this.advance();
        this.advance();
      } else if (char === '<') {
        if (this.peek() === '=') {
          this.tokens.push({ type: TokenType.LE, value: '<=', line, col });
          this.advance();
          this.advance();
        } else {
          this.tokens.push({ type: TokenType.LT, value: '<', line, col });
          this.advance();
        }
      } else if (char === '>') {
        if (this.peek() === '=') {
          this.tokens.push({ type: TokenType.GE, value: '>=', line, col });
          this.advance();
          this.advance();
        } else {
          this.tokens.push({ type: TokenType.GT, value: '>', line, col });
          this.advance();
        }
      } else if (char === '(') {
        this.tokens.push({ type: TokenType.LPAREN, value: '(', line, col });
        this.advance();
      } else if (char === ')') {
        this.tokens.push({ type: TokenType.RPAREN, value: ')', line, col });
        this.advance();
      } else if (char === '{') {
        this.tokens.push({ type: TokenType.LBRACE, value: '{', line, col });
        this.advance();
      } else if (char === '}') {
        this.tokens.push({ type: TokenType.RBRACE, value: '}', line, col });
        this.advance();
      } else if (char === ';') {
        this.tokens.push({ type: TokenType.SEMICOLON, value: ';', line, col });
        this.advance();
      } else if (char === ',') {
        this.tokens.push({ type: TokenType.COMMA, value: ',', line, col });
        this.advance();
      } else {
        throw new Error(`Unknown character: ${char} at ${line}:${col}`);
      }
    }

    this.tokens.push({ type: TokenType.EOF, value: '', line: this.line, col: this.col });
    return this.tokens;
  }
}

export function lex(input: string): Token[] {
  return new Lexer(input).tokenize();
}
