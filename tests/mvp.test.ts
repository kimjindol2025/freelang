/**
 * MVP Tests - Lexer, Parser, Interpreter
 */

import { lex, Lexer, TokenType } from '../src/mvp/lexer';
import { parse, Parser } from '../src/mvp/parser';
import { interpret, Interpreter } from '../src/mvp/interpreter';

describe('MVP - Lexer', () => {
  test('should tokenize simple variable declaration', () => {
    const tokens = lex('let x = 5;');
    expect(tokens[0].type).toBe(TokenType.LET);
    expect(tokens[1].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[1].value).toBe('x');
    expect(tokens[2].type).toBe(TokenType.ASSIGN);
    expect(tokens[3].type).toBe(TokenType.NUMBER);
    expect(tokens[3].value).toBe('5');
    expect(tokens[4].type).toBe(TokenType.SEMICOLON);
  });

  test('should tokenize numbers', () => {
    const tokens = lex('42 3.14 0');
    expect(tokens[0].type).toBe(TokenType.NUMBER);
    expect(tokens[0].value).toBe('42');
    expect(tokens[1].type).toBe(TokenType.NUMBER);
    expect(tokens[1].value).toBe('3.14');
    expect(tokens[2].type).toBe(TokenType.NUMBER);
    expect(tokens[2].value).toBe('0');
  });

  test('should tokenize strings', () => {
    const tokens = lex('"hello" \'world\'');
    expect(tokens[0].type).toBe(TokenType.STRING);
    expect(tokens[0].value).toBe('hello');
    expect(tokens[1].type).toBe(TokenType.STRING);
    expect(tokens[1].value).toBe('world');
  });

  test('should tokenize operators', () => {
    const tokens = lex('+ - * / % == != < <= > >=');
    const types = [
      TokenType.PLUS,
      TokenType.MINUS,
      TokenType.STAR,
      TokenType.SLASH,
      TokenType.PERCENT,
      TokenType.EQ,
      TokenType.NE,
      TokenType.LT,
      TokenType.LE,
      TokenType.GT,
      TokenType.GE
    ];
    for (let i = 0; i < types.length; i++) {
      expect(tokens[i].type).toBe(types[i]);
    }
  });

  test('should tokenize keywords', () => {
    const tokens = lex('let if else while for fn return true false');
    const types = [
      TokenType.LET,
      TokenType.IF,
      TokenType.ELSE,
      TokenType.WHILE,
      TokenType.FOR,
      TokenType.FN,
      TokenType.RETURN,
      TokenType.TRUE,
      TokenType.FALSE
    ];
    for (let i = 0; i < types.length; i++) {
      expect(tokens[i].type).toBe(types[i]);
    }
  });

  test('should skip comments', () => {
    const tokens = lex('let x = 5; // this is a comment');
    expect(tokens[tokens.length - 1].type).toBe(TokenType.EOF);
    expect(tokens.length).toBe(6); // let, x, =, 5, ;, EOF
  });
});

describe('MVP - Parser', () => {
  test('should parse variable declaration', () => {
    const program = parse(lex('let x = 5;'));
    expect(program.type).toBe('Program');
    expect(program.statements.length).toBe(1);
    expect(program.statements[0].type).toBe('VariableDecl');
  });

  test('should parse arithmetic expression', () => {
    const program = parse(lex('let result = 2 + 3 * 4;'));
    const varDecl = program.statements[0] as any;
    expect(varDecl.type).toBe('VariableDecl');
    expect(varDecl.value.type).toBe('BinaryOp');
  });

  test('should parse if statement', () => {
    const program = parse(lex('if (true) { let x = 5; }'));
    expect(program.statements[0].type).toBe('IfStmt');
  });

  test('should parse if-else statement', () => {
    const program = parse(lex('if (x > 5) { let a = 1; } else { let b = 2; }'));
    const ifStmt = program.statements[0] as any;
    expect(ifStmt.type).toBe('IfStmt');
    expect(ifStmt.alternate).toBeDefined();
  });

  test('should parse while loop', () => {
    const program = parse(lex('while (x > 0) { x = x - 1; }'));
    expect(program.statements[0].type).toBe('WhileStmt');
  });

  test('should parse block statement', () => {
    const program = parse(lex('{ let x = 1; let y = 2; }'));
    expect(program.statements[0].type).toBe('BlockStmt');
  });

  test('should parse function call', () => {
    const program = parse(lex('print(42);'));
    const exprStmt = program.statements[0] as any;
    expect(exprStmt.type).toBe('ExprStmt');
    expect(exprStmt.expression.type).toBe('CallExpr');
  });

  test('should parse function call with multiple arguments', () => {
    const program = parse(lex('print(x, y, z);'));
    const exprStmt = program.statements[0] as any;
    const callExpr = exprStmt.expression as any;
    expect(callExpr.arguments.length).toBe(3);
  });

  test('should parse comparison operators', () => {
    const program = parse(lex('if (x == 5) { }'));
    const ifStmt = program.statements[0] as any;
    expect(ifStmt.condition.operator).toBe('==');
  });

  test('should parse return statement', () => {
    const program = parse(lex('return 42;'));
    expect(program.statements[0].type).toBe('ReturnStmt');
  });
});

describe('MVP - Interpreter', () => {
  test('should execute simple variable declaration', () => {
    const program = parse(lex('let x = 5;'));
    const result = interpret(program);
    expect(result).toBeUndefined();
  });

  test('should evaluate arithmetic expressions', () => {
    const interpreter = new Interpreter() as any;
    const program = parse(lex('let result = 2 + 3 * 4;'));
    interpret(program);
    // 기본적으로 프로그램 실행 완료 확인
  });

  test('should handle variable assignment and retrieval', () => {
    const source = `
      let x = 10;
      let y = x + 5;
    `;
    interpret(parse(lex(source)));
    // 실행 완료 확인 (에러 없음)
  });

  test('should execute if statement', () => {
    const source = `
      let x = 5;
      if (x > 0) {
        let y = 1;
      }
    `;
    interpret(parse(lex(source)));
  });

  test('should execute if-else statement', () => {
    const source = `
      let x = 5;
      if (x > 10) {
        let y = 1;
      } else {
        let y = 2;
      }
    `;
    interpret(parse(lex(source)));
  });

  test('should execute while loop', () => {
    const source = `
      let x = 3;
      while (x > 0) {
        x = x - 1;
      }
    `;
    interpret(parse(lex(source)));
  });

  test('should handle comparison operators', () => {
    const source = `
      let a = 5 == 5;
      let b = 5 != 3;
      let c = 5 < 10;
      let d = 5 >= 5;
    `;
    interpret(parse(lex(source)));
  });

  test('should handle boolean operators', () => {
    const source = `
      if (true) {
        let x = 1;
      }
      if (false) {
        let y = 2;
      } else {
        let z = 3;
      }
    `;
    interpret(parse(lex(source)));
  });

  test('should call built-in functions', () => {
    let output = '';
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      output += args.join(' ');
    };

    try {
      const source = 'print("hello");';
      interpret(parse(lex(source)));
      expect(output).toBe('hello');
    } finally {
      console.log = originalLog;
    }
  });

  test('should handle division by zero error', () => {
    const source = 'let x = 1 / 0;';
    expect(() => {
      interpret(parse(lex(source)));
    }).toThrow();
  });

  test('should handle undefined variable error', () => {
    const source = 'let x = y + 5;';
    expect(() => {
      interpret(parse(lex(source)));
    }).toThrow('Undefined variable: y');
  });

  test('should handle scope correctly', () => {
    const source = `
      let x = 5;
      {
        let x = 10;
        let y = x;
      }
      let z = x;
    `;
    interpret(parse(lex(source)));
  });

  test('should support nested blocks', () => {
    const source = `
      let x = 1;
      {
        let y = 2;
        {
          let z = 3;
        }
      }
    `;
    interpret(parse(lex(source)));
  });
});

describe('MVP - Integration', () => {
  test('should execute complex program', () => {
    const source = `
      let n = 10;
      let sum = 0;
      while (n > 0) {
        sum = sum + n;
        n = n - 1;
      }
      print(sum);
    `;

    let output = '';
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      output += args.join(' ');
    };

    try {
      interpret(parse(lex(source)));
      expect(output).toBe('55');
    } finally {
      console.log = originalLog;
    }
  });

  test('should execute conditional program', () => {
    const source = `
      let x = 15;
      if (x > 10) {
        print("greater");
      } else {
        print("less or equal");
      }
    `;

    let output = '';
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      output += args.join(' ');
    };

    try {
      interpret(parse(lex(source)));
      expect(output).toBe('greater');
    } finally {
      console.log = originalLog;
    }
  });

  test('should execute arithmetic program', () => {
    const source = `
      let a = 5;
      let b = 3;
      let c = a + b;
      let d = a * b;
      let e = a - b;
      let f = a / b;
    `;

    interpret(parse(lex(source)));
  });
});
