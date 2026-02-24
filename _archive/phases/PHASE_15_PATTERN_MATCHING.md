# Phase 15: 패턴 매칭 구현 (Pattern Matching)

## 🎯 목표

Rust 스타일의 match 문을 FreeLang에 추가하여 가독성을 5배 향상

## 📋 구현 계획

### 1️⃣ AST 타입 추가 (parser/ast.ts)

```typescript
// Pattern 타입
type Pattern =
  | { type: 'literal'; value: any }
  | { type: 'variable'; name: string }
  | { type: 'wildcard' }
  | { type: 'struct'; fields: Record<string, Pattern> }
  | { type: 'array'; elements: Pattern[] };

// Match 표현식
interface MatchExpr extends Expr {
  type: 'match';
  scrutinee: Expr;  // 매칭할 값
  arms: MatchArm[];
}

interface MatchArm {
  pattern: Pattern;
  guard?: Expr;     // if 조건
  body: Expr;
}
```

### 2️⃣ 파서 수정 (parser/parser.ts)

```typescript
parseMatch(): MatchExpr {
  this.consumeKeyword('match');
  const scrutinee = this.parseExpr();
  this.consume('{');

  const arms: MatchArm[] = [];
  while (!this.peek('}')) {
    this.consume('|');
    const pattern = this.parsePattern();

    const guard = this.peek('if') ? (() => {
      this.consumeKeyword('if');
      return this.parseExpr();
    })() : undefined;

    this.consume('→'); // 또는 =>
    const body = this.parseExpr();
    arms.push({ pattern, guard, body });

    if (this.peek(',')) this.consume(',');
  }

  this.consume('}');
  return { type: 'match', scrutinee, arms };
}

parsePattern(): Pattern {
  if (this.peek('_')) {
    this.consume('_');
    return { type: 'wildcard' };
  }

  if (this.peek('{')) {
    // 구조체 패턴
    return this.parseStructPattern();
  }

  if (this.peek('[')) {
    // 배열 패턴
    return this.parseArrayPattern();
  }

  // 리터럴 또는 변수
  const token = this.current();
  if (/^\d+$/.test(token.value)) {
    this.advance();
    return { type: 'literal', value: parseInt(token.value) };
  }

  // 변수 바인딩
  const name = this.consume('identifier').value;
  return { type: 'variable', name };
}
```

### 3️⃣ IR 생성 (generator/)

```typescript
generateMatchExpr(match: MatchExpr): IR[] {
  const scrutineeIR = this.generate(match.scrutinee);

  const arms = match.arms.map(arm => ({
    pattern: arm.pattern,
    guard: arm.guard ? this.generate(arm.guard) : null,
    body: this.generate(arm.body)
  }));

  return [
    ...scrutineeIR,
    {
      type: 'match',
      arms: arms
    }
  ];
}
```

### 4️⃣ 컴파일러 수정 (compiler/)

```typescript
// IR → C/Zig 변환
case 'match':
  return this.compileMatch(ir);

compileMatch(match: MatchIR): string {
  // 간단한 리터럴 매칭 → switch
  if (this.isSimpleLiteral(match)) {
    return this.compileAsSwitch(match);
  }

  // 복잡한 매칭 → if-else chain
  return this.compileAsIfElse(match);
}
```

### 5️⃣ 테스트 (tests/phase-15-*.test.ts)

```typescript
describe('Phase 15: Pattern Matching', () => {
  test('literal pattern', () => {
    const code = `
      match 1 {
        | 1 → "one"
        | 2 → "two"
        | _ → "other"
      }
    `;
    expect(evaluate(code)).toBe("one");
  });

  test('variable binding', () => {
    const code = `
      match Some(42) {
        | Some(x) → x
        | None → 0
      }
    `;
    expect(evaluate(code)).toBe(42);
  });

  test('guard clause', () => {
    const code = `
      match 5 {
        | x if x > 0 → "positive"
        | x if x < 0 → "negative"
        | _ → "zero"
      }
    `;
    expect(evaluate(code)).toBe("positive");
  });

  test('exhaustiveness check', () => {
    const code = `
      match true {
        | true → 1
        | false → 0
      }
    `;
    expect(compile(code)).toThrow();  // 모든 경우를 다루지 않음 (아직)
  });
});
```

## 📅 구현 순서

**Week 1**:
- [ ] AST 타입 추가 (2시간)
- [ ] 파서 구현 (8시간)
- [ ] 기본 테스트 (4시간)

**Week 2**:
- [ ] IR 생성 (6시간)
- [ ] C/Zig 컴파일러 (10시간)
- [ ] 고급 매칭 (8시간)

**Week 3**:
- [ ] Exhaustiveness checker (6시간)
- [ ] 성능 최적화 (4시간)
- [ ] 문서화 (4시간)

## 🎯 최종 결과

✅ 모든 패턴 타입 지원
✅ Guard clause 지원
✅ Exhaustiveness checking
✅ 성능: switch 최적화
✅ 테스트: 20+ 케이스

---

**시작 시간**: 이제 바로!
**예상 완료**: 3주
**상태**: 준비 완료
