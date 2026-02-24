# Phase 7 Step 3: Macro System - 계획서

**Status**: 📋 계획 단계
**Date**: February 18, 2026

---

## 개요

**Phase 7 Step 3**는 FreeLang의 **매크로 시스템(Macro System)**을 구현합니다.

매크로는 **컴파일 타임 메타프로그래밍**으로 코드를 생성하는 강력한 기능입니다. 이 단계에서는:
- **기본 매크로** - 간단한 코드 템플릿
- **패턴 매칭 매크로** - 패턴 기반 코드 생성
- **조건부 컴파일** - 조건에 따른 컴파일
- **매크로 위생성** - 변수 이름 충돌 방지
- **반복 매크로** - 반복 코드 생성

을 구현하여 **강력한 메타프로그래밍** 능력을 확보합니다.

---

## 배경

### 현재 상태 (제한사항)

```freelang
// 현재 불가능한 코드들
macro assert(condition, message) {
  if !condition {
    throw Error(message)
  }
}

macro repeat(n, body) {
  let i = 0
  while i < n {
    body
    i = i + 1
  }
}

// Conditional compilation 미지원
#if debug
  console.log("Debug mode")
#endif

// Code generation 미지원
macro derive(struct) {
  // Generate equality, hash, clone methods
}
```

### 목표 상태

위 코드들이 완벽하게 작동하도록 구현합니다.

---

## 구현 계획

### Step 3.1: 기본 매크로 시스템 (200 줄)

**파일**: `src/macro/macro-definition.ts` (신규)

#### 3.1.1 매크로 정의 인터페이스

```typescript
export interface MacroDefinition {
  kind: 'macro';
  name: string;
  parameters: MacroParameter[];  // Macro parameters
  body: MacroBody;                // Macro body (code template)
  isVariadic?: boolean;           // Accepts variable args
  scope?: MacroScope;             // Macro scope context
}

export interface MacroParameter {
  name: string;
  kind: 'expression' | 'statement' | 'pattern' | 'type';
  default?: string;
}

export interface MacroBody {
  type: 'literal' | 'pattern';
  content: string;
  tokens: MacroToken[];           // Tokenized for expansion
}

export interface MacroToken {
  type: 'literal' | 'variable' | 'nested-macro';
  value: string;
  parameterName?: string;  // Which parameter this refers to
}
```

#### 3.1.2 기본 매크로 파싱

```typescript
fn parseMacro(macroStr: string): MacroDefinition {
  // Parse: macro name(param1, param2, ...) { body }
  const nameMatch = macroStr.match(/macro\s+(\w+)/);
  const paramsMatch = macroStr.match(/\(([^)]*)\)/);
  const bodyMatch = macroStr.match(/{([\s\S]*)}/);

  return {
    kind: 'macro',
    name: nameMatch[1],
    parameters: parseParameters(paramsMatch[1]),
    body: parseBody(bodyMatch[1])
  };
}
```

#### 3.1.3 매크로 등록 및 호출

```typescript
export class MacroRegistry {
  private macros: Map<string, MacroDefinition> = new Map();

  fn register(definition: MacroDefinition): void {
    this.macros.set(definition.name, definition);
  }

  fn invoke(name: string, args: MacroArgument[]): string {
    const macro = this.macros.get(name);
    if (!macro) throw Error(`Unknown macro: ${name}`);
    return this.expandMacro(macro, args);
  }

  private fn expandMacro(macro: MacroDefinition, args: MacroArgument[]): string {
    // Substitute parameters in body
    let result = macro.body.content;

    for (let i = 0; i < macro.parameters.length; i++) {
      const param = macro.parameters[i];
      const arg = args[i];
      result = result.replaceAll(param.name, arg.value);
    }

    return result;
  }
}
```

---

### Step 3.2: 매크로 확장 (300 줄)

**파일**: `src/macro/macro-expansion.ts` (신규)

#### 3.2.1 AST 매크로 확장

```typescript
export interface MacroExpansionContext {
  macros: Map<string, MacroDefinition>;
  expandedNodes: Set<string>;  // Prevent infinite expansion
  depth: number;               // Track expansion depth
}

export class MacroExpander {
  fn expandMacrosInAST(ast: ASTNode, context: MacroExpansionContext): ASTNode {
    if (ast.type === 'macro-call') {
      return this.expandMacroCall(ast as MacroCallExpression, context);
    }

    if (ast.type === 'block-statement') {
      const block = ast as BlockStatement;
      return {
        ...block,
        statements: block.statements.map(stmt =>
          this.expandMacrosInAST(stmt, context)
        )
      };
    }

    if (ast.type === 'if-statement') {
      const ifStmt = ast as IfStatement;
      return {
        ...ifStmt,
        test: this.expandMacrosInAST(ifStmt.test, context),
        consequent: this.expandMacrosInAST(ifStmt.consequent, context),
        alternate: ifStmt.alternate
          ? this.expandMacrosInAST(ifStmt.alternate, context)
          : undefined
      };
    }

    return ast;
  }

  private fn expandMacroCall(
    call: MacroCallExpression,
    context: MacroExpansionContext
  ): ASTNode {
    const macro = context.macros.get(call.macroName);
    if (!macro) throw Error(`Unknown macro: ${call.macroName}`);

    // Prevent infinite recursion
    if (context.expandedNodes.has(call.macroName)) {
      throw Error(`Circular macro reference: ${call.macroName}`);
    }

    context.expandedNodes.add(call.macroName);

    // Expand macro with arguments
    const expanded = this.substituteMacro(macro, call.arguments, context);

    context.expandedNodes.delete(call.macroName);

    return expanded;
  }

  private fn substituteMacro(
    macro: MacroDefinition,
    args: MacroArgument[],
    context: MacroExpansionContext
  ): ASTNode {
    // Create substitution map
    const substitutions = new Map<string, MacroArgument>();

    for (let i = 0; i < macro.parameters.length; i++) {
      substitutions.set(macro.parameters[i].name, args[i]);
    }

    // Recursively expand body with substitutions
    return this.substituteInBody(macro.body, substitutions, context);
  }
}
```

#### 3.2.2 하이지닉 매크로 (Macro Hygiene)

```typescript
export class HygieneManager {
  private varCounter: number = 0;

  fn makeHygienic(ast: ASTNode, macroName: string): ASTNode {
    // Rename variables to avoid collisions
    // Example: x -> x__macro_1, y -> y__macro_1
    const suffix = `__macro_${this.varCounter++}`;

    return this.renameVariablesInAST(ast, suffix);
  }

  private fn renameVariablesInAST(ast: ASTNode, suffix: string): ASTNode {
    if (ast.type === 'identifier') {
      return {
        ...ast,
        name: (ast as IdentifierExpression).name + suffix
      };
    }

    if (ast.type === 'variable-declaration') {
      const decl = ast as VariableDeclaration;
      return {
        ...decl,
        name: decl.name + suffix,
        value: this.renameVariablesInAST(decl.value, suffix)
      };
    }

    if (ast.type === 'block-statement') {
      const block = ast as BlockStatement;
      return {
        ...block,
        statements: block.statements.map(stmt =>
          this.renameVariablesInAST(stmt, suffix)
        )
      };
    }

    return ast;
  }
}
```

---

### Step 3.3: 패턴 매칭 매크로 (250 줄)

**파일**: `src/macro/pattern-macros.ts` (신규)

#### 3.3.1 매크로 패턴 정의

```typescript
export interface PatternMacro extends MacroDefinition {
  kind: 'pattern-macro';
  patterns: MacroPattern[];  // Multiple patterns
}

export interface MacroPattern {
  pattern: PatternMatcher;    // Pattern to match
  replacement: string;        // Replacement template
  condition?: string;         // Optional condition
  guard?: (args: MacroArgument[]) => boolean;
}

export interface PatternMatcher {
  type: 'literal' | 'wildcard' | 'sequence' | 'alternative';
  value?: string;
  subPatterns?: PatternMatcher[];
}
```

#### 3.3.2 패턴 매칭 엔진

```typescript
export class PatternMatcher {
  fn match(
    input: ASTNode,
    pattern: PatternMatcher
  ): { matched: boolean; captures: Map<string, ASTNode> } {
    const captures = new Map<string, ASTNode>();

    if (pattern.type === 'literal') {
      // Match literal pattern
      const matched = this.matchLiteral(input, pattern.value!);
      return { matched, captures };
    }

    if (pattern.type === 'wildcard') {
      // Wildcard matches anything
      captures.set(pattern.value!, input);
      return { matched: true, captures };
    }

    if (pattern.type === 'sequence') {
      // Match sequence of patterns
      if (input.type !== 'block-statement') {
        return { matched: false, captures };
      }

      const block = input as BlockStatement;
      const result = this.matchSequence(
        block.statements,
        pattern.subPatterns || [],
        captures
      );

      return { matched: result.matched, captures: result.captures };
    }

    if (pattern.type === 'alternative') {
      // Try each alternative
      for (const subPattern of pattern.subPatterns || []) {
        const result = this.match(input, subPattern);
        if (result.matched) {
          return result;
        }
      }
      return { matched: false, captures };
    }

    return { matched: false, captures };
  }

  private fn matchLiteral(node: ASTNode, literal: string): boolean {
    // Match AST node against literal pattern
    return node.type === literal;
  }

  private fn matchSequence(
    nodes: ASTNode[],
    patterns: PatternMatcher[],
    captures: Map<string, ASTNode>
  ): { matched: boolean; captures: Map<string, ASTNode> } {
    if (nodes.length !== patterns.length) {
      return { matched: false, captures };
    }

    for (let i = 0; i < nodes.length; i++) {
      const result = this.match(nodes[i], patterns[i]);
      if (!result.matched) {
        return { matched: false, captures };
      }

      // Merge captures
      result.captures.forEach((value, key) => {
        captures.set(key, value);
      });
    }

    return { matched: true, captures };
  }
}
```

---

### Step 3.4: 조건부 컴파일 (150 줄)

**파일**: `src/macro/conditional-compilation.ts` (신규)

#### 3.4.1 조건부 컴파일 지시문

```typescript
export interface ConditionalDirective {
  type: 'if' | 'ifdef' | 'ifndef' | 'elif' | 'else' | 'endif';
  condition?: string;
  body?: ASTNode[];
}

export class ConditionalCompiler {
  private symbols: Map<string, boolean> = new Map();

  fn setSymbol(name: string, value: boolean): void {
    this.symbols.set(name, value);
  }

  fn processDirectives(
    ast: ASTNode[],
    symbols: Map<string, boolean>
  ): ASTNode[] {
    const result: ASTNode[] = [];

    for (let i = 0; i < ast.length; i++) {
      const node = ast[i];

      if (node.type === 'conditional-directive') {
        const directive = node as ConditionalDirective;

        if (directive.type === 'ifdef') {
          const isDefined = symbols.has(directive.condition!);
          if (isDefined) {
            result.push(...(directive.body || []));
          }
        }

        if (directive.type === 'ifndef') {
          const isDefined = symbols.has(directive.condition!);
          if (!isDefined) {
            result.push(...(directive.body || []));
          }
        }

        if (directive.type === 'if') {
          const value = this.evaluateCondition(directive.condition!, symbols);
          if (value) {
            result.push(...(directive.body || []));
          }
        }
      } else {
        result.push(node);
      }
    }

    return result;
  }

  private fn evaluateCondition(
    condition: string,
    symbols: Map<string, boolean>
  ): boolean {
    // Simple condition evaluation: debug, release, version checks
    if (condition === 'debug') {
      return symbols.get('debug') || false;
    }

    if (condition === 'release') {
      return symbols.get('release') || false;
    }

    // Check symbol defined
    if (condition.startsWith('defined(')) {
      const name = condition.slice(8, -1);
      return symbols.has(name);
    }

    return false;
  }
}
```

---

### Step 3.5: 매크로 라이브러리 (200 줄)

**파일**: `src/macro/macro-library.ts` (신규)

#### 3.5.1 표준 매크로 제공

```typescript
export const StandardMacros = {
  // assert(condition, message)
  assert: {
    kind: 'macro',
    name: 'assert',
    parameters: [
      { name: 'condition', kind: 'expression' },
      { name: 'message', kind: 'expression' }
    ],
    body: {
      type: 'literal',
      content: `
        if !(condition) {
          throw Error(message)
        }
      `
    }
  },

  // repeat(n, body)
  repeat: {
    kind: 'macro',
    name: 'repeat',
    parameters: [
      { name: 'n', kind: 'expression' },
      { name: 'body', kind: 'statement' }
    ],
    body: {
      type: 'literal',
      content: `
        let __i = 0
        while __i < n {
          body
          __i = __i + 1
        }
      `
    }
  },

  // times(n, callback)
  times: {
    kind: 'macro',
    name: 'times',
    parameters: [
      { name: 'n', kind: 'expression' },
      { name: 'callback', kind: 'expression' }
    ],
    body: {
      type: 'literal',
      content: `
        for let i in 0..n {
          callback(i)
        }
      `
    }
  },

  // trace(expr)
  trace: {
    kind: 'macro',
    name: 'trace',
    parameters: [
      { name: 'expr', kind: 'expression' }
    ],
    body: {
      type: 'literal',
      content: `
        (function() {
          let __value = expr
          console.log("trace:", __value)
          return __value
        }())
      `
    }
  }
};
```

---

### Step 3.6: 매크로 타입 체커 (150 줄)

**파일**: `src/macro/macro-type-checker.ts` (신규)

```typescript
export class MacroTypeChecker {
  fn validateMacroDefinition(macro: MacroDefinition): void {
    // Check macro name is valid
    if (!this.isValidName(macro.name)) {
      throw Error(`Invalid macro name: ${macro.name}`);
    }

    // Check parameters
    for (const param of macro.parameters) {
      this.validateParameter(param);
    }

    // Check body
    this.validateBody(macro.body);
  }

  fn validateMacroCall(call: MacroCallExpression, macro: MacroDefinition): void {
    // Check argument count
    const minArgs = macro.parameters.filter(p => !p.default).length;
    const maxArgs = macro.isVariadic ? Infinity : macro.parameters.length;

    if (call.arguments.length < minArgs || call.arguments.length > maxArgs) {
      throw Error(
        `Macro '${macro.name}' expects ${minArgs}-${maxArgs} arguments ` +
        `but got ${call.arguments.length}`
      );
    }

    // Check argument types
    for (let i = 0; i < call.arguments.length; i++) {
      const param = macro.parameters[i];
      const arg = call.arguments[i];

      if (param.kind === 'expression' && arg.type === 'statement') {
        throw Error(
          `Macro '${macro.name}' parameter ${i + 1} ` +
          `expects expression but got statement`
        );
      }
    }
  }

  private fn isValidName(name: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
  }

  private fn validateParameter(param: MacroParameter): void {
    if (!this.isValidName(param.name)) {
      throw Error(`Invalid parameter name: ${param.name}`);
    }

    const validKinds = ['expression', 'statement', 'pattern', 'type'];
    if (!validKinds.includes(param.kind)) {
      throw Error(`Invalid parameter kind: ${param.kind}`);
    }
  }

  private fn validateBody(body: MacroBody): void {
    if (body.type !== 'literal' && body.type !== 'pattern') {
      throw Error(`Invalid body type: ${body.type}`);
    }
  }
}
```

---

### Step 3.7: 종합 테스트 (500+ 줄)

**파일**: `test/phase-7-macro-system.test.ts` (신규)

**테스트 범위** (50+ 테스트):

1. **기본 매크로** (10)
   - 매크로 정의 및 파싱
   - 매크로 호출 및 확장
   - 매개변수 치환
   - 중첩 매크로 호출
   - 매크로 에러 처리

2. **매크로 확장** (10)
   - AST 노드에서 매크로 확장
   - 블록 문 확장
   - 조건문 확장
   - 무한 재귀 방지
   - 다중 확장

3. **패턴 매크로** (10)
   - 패턴 정의 및 파싱
   - 패턴 매칭
   - 와일드카드 매칭
   - 시퀀스 매칭
   - 대체 매칭

4. **조건부 컴파일** (10)
   - #ifdef 처리
   - #ifndef 처리
   - #if 조건 평가
   - 심볼 정의
   - 중첩 조건

5. **표준 매크로** (10)
   - assert 매크로
   - repeat 매크로
   - times 매크로
   - trace 매크로

---

## 파일 구조

```
v2-freelang-ai/
├── src/
│   └── macro/
│       ├── macro-definition.ts           (신규: 200 줄)
│       ├── macro-expansion.ts            (신규: 300 줄)
│       ├── pattern-macros.ts             (신규: 250 줄)
│       ├── conditional-compilation.ts    (신규: 150 줄)
│       ├── macro-library.ts              (신규: 200 줄)
│       └── macro-type-checker.ts         (신규: 150 줄)
├── test/
│   └── phase-7-macro-system.test.ts      (신규: 500+ 줄)
└── PHASE-7-STEP-3-PLAN.md                (이 파일)
```

---

## 예제

### Example 1: 기본 매크로

```freelang
macro assert(condition, message) {
  if !condition {
    throw Error(message)
  }
}

fn divide(a: number, b: number): number {
  assert(b != 0, "Division by zero")
  return a / b
}

divide(10, 2)   // ✅ OK
divide(10, 0)   // ❌ Throws: Division by zero
```

### Example 2: 반복 매크로

```freelang
macro repeat(n, body) {
  let i = 0
  while i < n {
    body
    i = i + 1
  }
}

repeat(3, {
  console.log("Hello!")
})
// Output:
// Hello!
// Hello!
// Hello!
```

### Example 3: 조건부 컴파일

```freelang
#ifdef debug
  fn logDebug(message: string) {
    console.log("[DEBUG]", message)
  }
#endif

#ifdef release
  fn logDebug(message: string) {
    // No-op in release
  }
#endif

logDebug("Debug message")
```

### Example 4: 패턴 매크로

```freelang
macro derive_debug(struct) {
  impl Display for struct {
    fn to_string(self): string {
      "struct_instance"
    }
  }
}

struct User {
  id: number
  name: string
}

derive_debug(User)  // Automatically generates Display impl
```

### Example 5: 매크로 위생성

```freelang
macro with_lock(lock, body) {
  lock.acquire()
  try {
    body
  } finally {
    lock.release()
  }
}

fn critical_section() {
  with_lock(myLock, {
    // Variables inside don't collide with external ones
    let x = 10
  })
}
```

---

## 구현 순서

1. **Step 3.1**: 기본 매크로 시스템 정의
2. **Step 3.2**: 매크로 확장 및 위생성
3. **Step 3.3**: 패턴 매칭 매크로
4. **Step 3.4**: 조건부 컴파일
5. **Step 3.5**: 매크로 라이브러리
6. **Step 3.6**: 매크로 타입 체커
7. **Step 3.7**: 종합 테스트 및 예제

---

## 검증 기준

✅ 기본 매크로 정의 및 호출 작동
✅ 매크로 확장 완벽 동작
✅ 위생성 보장 (변수 이름 충돌 방지)
✅ 패턴 매칭 매크로 작동
✅ 조건부 컴파일 지원
✅ 표준 매크로 라이브러리 제공
✅ 50+ 종합 테스트 통과
✅ 예제 코드 정상 작동

---

## 시간 추정

- **Step 3.1**: 1.5시간 (기본 매크로)
- **Step 3.2**: 2시간 (매크로 확장 및 위생성)
- **Step 3.3**: 1.5시간 (패턴 매칭)
- **Step 3.4**: 1시간 (조건부 컴파일)
- **Step 3.5**: 1.5시간 (매크로 라이브러리)
- **Step 3.6**: 1시간 (타입 체커)
- **Step 3.7**: 2시간 (테스트)

**총 예상 시간**: **10.5시간**

---

## Phase 7 전체 진행

Phase 7은 4개 단계로 구성:

1. ✅ **Step 1**: Async/Await (완료)
2. ✅ **Step 2**: Type System Enhancements (완료)
3. 📋 **Step 3**: Macro System (이 단계)
4. 📋 **Step 4**: Package Registry & Publishing

---

## 결론

Phase 7 Step 3는 FreeLang을 **강력한 메타프로그래밍** 능력으로 무장시킵니다.

매크로 시스템을 통해:
- 🔧 반복적인 코드 자동 생성
- 🛡️ 컴파일 타임 검증
- 📝 도메인 특화 언어(DSL) 구현
- ⚡ 성능 최적화 기회
- 🎯 코드 간결화

구현 후 FreeLang은 **최고 수준의 메타프로그래밍** 지원을 확보합니다.

---

*Generated February 18, 2026*
*FreeLang v2 - Phase 7 Step 3 Plan*
