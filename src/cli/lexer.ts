/**
 * FreeLang Lexer (어휘 분석기)
 * v3에서 포팅: 텍스트 → 토큰 변환
 *
 * 특징:
 * - 고급 토큰 인식
 * - 문자열/주석 처리
 * - 에러 위치 추적
 */

/**
 * 토큰 타입
 */
export enum TokenType {
  // 리터럴
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  BOOL = 'BOOL',

  // 식별자 & 키워드
  IDENTIFIER = 'IDENTIFIER',
  KEYWORD = 'KEYWORD',

  // 연산자
  OPERATOR = 'OPERATOR',
  ARROW = 'ARROW', // ->
  COLON = 'COLON', // :
  COMMA = 'COMMA',
  DOT = 'DOT',
  ASSIGN = 'ASSIGN', // =

  // 괄호
  LPAREN = 'LPAREN', // (
  RPAREN = 'RPAREN', // )
  LBRACKET = 'LBRACKET', // [
  RBRACKET = 'RBRACKET', // ]
  LBRACE = 'LBRACE', // {
  RBRACE = 'RBRACE', // }

  // 특수
  SEMICOLON = 'SEMICOLON', // ;
  NEWLINE = 'NEWLINE',
  INDENT = 'INDENT',
  DEDENT = 'DEDENT',
  EOF = 'EOF',
  COMMENT = 'COMMENT',
}

/**
 * 토큰
 */
export interface Token {
  type: TokenType;
  value: any;
  line: number;
  column: number;
  raw: string; // 원본 텍스트
}

/**
 * 키워드 맵
 */
const KEYWORDS = new Set([
  // 모듈 시스템
  'IMPORT',
  'FROM',
  'EXPORT',

  // 제어 흐름
  'IF',
  'ELSE',
  'FOR',
  'IN',
  'WHILE',
  'BREAK',
  'CONTINUE',

  // 함수
  'FUNC',
  'FUNCTION',  // 메서드 정의 (CLASS 내)
  'RETURN',
  'CALL',
  'ASYNC',     // 비동기 함수
  'AWAIT',     // 비동기 대기

  // v2 메모리 관리
  'SET',
  'CLASS',
  'REF',
  'NEW',
  'RELEASE',
  'DESTROY',
  'EXTENDS',

  // 에러 처리
  'TRY',
  'CATCH',
  'THROW',
  'FINALLY',

  // 기타
  'AND',
  'OR',
  'NOT',
  'TRUE',
  'FALSE',
  'NULL',
  'PRINT',
  'PRINTLN',
]);

/**
 * Lexer
 */
export class Lexer {
  private text: string = '';
  private pos = 0;
  private line = 1;
  private column = 1;
  private tokens: Token[] = [];

  /**
   * 렉싱
   */
  lex(text: string): Token[] {
    this.text = text;
    this.pos = 0;
    this.line = 1;
    this.column = 1;
    this.tokens = [];

    while (this.pos < this.text.length) {
      this.skipWhitespace();

      if (this.pos >= this.text.length) break;

      const char = this.text[this.pos];

      // 주석
      if (char === '/' && this.peek() === '/') {
        this.skipComment();
        continue;
      }

      // 문자열
      if (char === '"' || char === "'") {
        this.readString();
        continue;
      }

      // 숫자
      if (this.isDigit(char)) {
        this.readNumber();
        continue;
      }

      // 식별자/키워드
      if (this.isIdStart(char)) {
        this.readIdentifierOrKeyword();
        continue;
      }

      // 연산자 & 기호
      if (!this.readOperator()) {
        throw new Error(
          `Unexpected character '${char}' at line ${this.line}, column ${this.column}`
        );
      }
    }

    this.tokens.push({ type: TokenType.EOF, value: '', line: this.line, column: this.column, raw: '' });
    return this.tokens;
  }

  /**
   * 공백 스킵
   */
  private skipWhitespace(): void {
    while (this.pos < this.text.length && /\s/.test(this.text[this.pos])) {
      if (this.text[this.pos] === '\n') {
        this.line++;
        this.column = 1;
      } else {
        this.column++;
      }
      this.pos++;
    }
  }

  /**
   * 주석 스킵
   */
  private skipComment(): void {
    while (this.pos < this.text.length && this.text[this.pos] !== '\n') {
      this.pos++;
    }
  }

  /**
   * 문자열 읽기
   */
  private readString(): void {
    const quote = this.text[this.pos];
    const startLine = this.line;
    const startCol = this.column;
    let value = '';

    this.pos++; // 시작 따옴표
    this.column++;

    while (this.pos < this.text.length && this.text[this.pos] !== quote) {
      if (this.text[this.pos] === '\\' && this.pos + 1 < this.text.length) {
        // 이스케이프 시퀀스
        const next = this.text[this.pos + 1];
        switch (next) {
          case 'n':
            value += '\n';
            break;
          case 't':
            value += '\t';
            break;
          case '\\':
            value += '\\';
            break;
          case '"':
            value += '"';
            break;
          case "'":
            value += "'";
            break;
          default:
            value += next;
        }
        this.pos += 2;
        this.column += 2;
      } else {
        value += this.text[this.pos];
        if (this.text[this.pos] === '\n') {
          this.line++;
          this.column = 1;
        } else {
          this.column++;
        }
        this.pos++;
      }
    }

    if (this.pos >= this.text.length) {
      throw new Error(`Unterminated string at line ${startLine}, column ${startCol}`);
    }

    this.pos++; // 끝 따옴표
    this.column++;

    this.tokens.push({
      type: TokenType.STRING,
      value,
      line: startLine,
      column: startCol,
      raw: quote + value + quote,
    });
  }

  /**
   * 숫자 읽기
   */
  private readNumber(): void {
    const startLine = this.line;
    const startCol = this.column;
    let value = '';

    // 정수부
    while (this.pos < this.text.length && this.isDigit(this.text[this.pos])) {
      value += this.text[this.pos];
      this.pos++;
      this.column++;
    }

    // 소수부
    if (this.pos < this.text.length && this.text[this.pos] === '.') {
      value += '.';
      this.pos++;
      this.column++;

      while (this.pos < this.text.length && this.isDigit(this.text[this.pos])) {
        value += this.text[this.pos];
        this.pos++;
        this.column++;
      }
    }

    this.tokens.push({
      type: TokenType.NUMBER,
      value: parseFloat(value),
      line: startLine,
      column: startCol,
      raw: value,
    });
  }

  /**
   * 식별자/키워드 읽기
   */
  private readIdentifierOrKeyword(): void {
    const startLine = this.line;
    const startCol = this.column;
    let value = '';

    while (
      this.pos < this.text.length &&
      this.isIdChar(this.text[this.pos])
    ) {
      value += this.text[this.pos];
      this.pos++;
      this.column++;
    }

    // 키워드인지 확인
    if (KEYWORDS.has(value)) {
      this.tokens.push({
        type: TokenType.KEYWORD,
        value,
        line: startLine,
        column: startCol,
        raw: value,
      });
    } else if (value === 'true' || value === 'false') {
      this.tokens.push({
        type: TokenType.BOOL,
        value: value === 'true',
        line: startLine,
        column: startCol,
        raw: value,
      });
    } else {
      this.tokens.push({
        type: TokenType.IDENTIFIER,
        value,
        line: startLine,
        column: startCol,
        raw: value,
      });
    }
  }

  /**
   * 연산자 & 기호 읽기
   */
  private readOperator(): boolean {
    const startLine = this.line;
    const startCol = this.column;
    const char = this.text[this.pos];

    // 2글자 연산자
    if (this.pos + 1 < this.text.length) {
      const twoChar = char + this.text[this.pos + 1];
      if (twoChar === '->') {
        this.tokens.push({
          type: TokenType.ARROW,
          value: '->',
          line: startLine,
          column: startCol,
          raw: '->',
        });
        this.pos += 2;
        this.column += 2;
        return true;
      }
      if (['==', '!=', '<=', '>=', '++', '--'].includes(twoChar)) {
        this.tokens.push({
          type: TokenType.OPERATOR,
          value: twoChar,
          line: startLine,
          column: startCol,
          raw: twoChar,
        });
        this.pos += 2;
        this.column += 2;
        return true;
      }
    }

    // 1글자
    switch (char) {
      case '(':
        this.tokens.push({
          type: TokenType.LPAREN,
          value: '(',
          line: startLine,
          column: startCol,
          raw: '(',
        });
        break;
      case ')':
        this.tokens.push({
          type: TokenType.RPAREN,
          value: ')',
          line: startLine,
          column: startCol,
          raw: ')',
        });
        break;
      case '[':
        this.tokens.push({
          type: TokenType.LBRACKET,
          value: '[',
          line: startLine,
          column: startCol,
          raw: '[',
        });
        break;
      case ']':
        this.tokens.push({
          type: TokenType.RBRACKET,
          value: ']',
          line: startLine,
          column: startCol,
          raw: ']',
        });
        break;
      case '{':
        this.tokens.push({
          type: TokenType.LBRACE,
          value: '{',
          line: startLine,
          column: startCol,
          raw: '{',
        });
        break;
      case '}':
        this.tokens.push({
          type: TokenType.RBRACE,
          value: '}',
          line: startLine,
          column: startCol,
          raw: '}',
        });
        break;
      case ':':
        this.tokens.push({
          type: TokenType.COLON,
          value: ':',
          line: startLine,
          column: startCol,
          raw: ':',
        });
        break;
      case ',':
        this.tokens.push({
          type: TokenType.COMMA,
          value: ',',
          line: startLine,
          column: startCol,
          raw: ',',
        });
        break;
      case ';':
        this.tokens.push({
          type: TokenType.SEMICOLON,
          value: ';',
          line: startLine,
          column: startCol,
          raw: ';',
        });
        break;
      case '.':
        this.tokens.push({
          type: TokenType.DOT,
          value: '.',
          line: startLine,
          column: startCol,
          raw: '.',
        });
        break;
      case '=':
        this.tokens.push({
          type: TokenType.ASSIGN,
          value: '=',
          line: startLine,
          column: startCol,
          raw: '=',
        });
        break;
      case '+':
      case '-':
      case '*':
      case '/':
      case '%':
      case '<':
      case '>':
      case '&':
      case '|':
      case '^':
      case '!':
      case '~':
      case '?':
        this.tokens.push({
          type: TokenType.OPERATOR,
          value: char,
          line: startLine,
          column: startCol,
          raw: char,
        });
        break;
      default:
        return false;
    }

    this.pos++;
    this.column++;
    return true;
  }

  /**
   * 유틸리티
   */
  private isDigit(ch: string): boolean {
    return /\d/.test(ch);
  }

  private isIdStart(ch: string): boolean {
    return /[a-zA-Z_]/.test(ch);
  }

  private isIdChar(ch: string): boolean {
    return /[a-zA-Z0-9_]/.test(ch);
  }

  private peek(): string {
    return this.pos + 1 < this.text.length ? this.text[this.pos + 1] : '';
  }
}
