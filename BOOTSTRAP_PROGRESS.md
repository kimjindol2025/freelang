# 부트스트랩 검증 진행 상황

**날짜**: 2026-03-09  
**상태**: 42/61 파일 통과 (69%)

---

## ✅ 수정 완료

### Struct Constructor Syntax (2026-03-09 13:45 UTC+9)

**문제**: Parser가 `Type { field = value }` 문법 미지원

**해결**: parser.ts L504-517 수정
- `:` (struct literal) 대신 `=` (constructor call) 허용
- 두 가지 문법 모두 같은 struct_lit AST 노드 생성

**코드**:
```typescript
// 이전 (L509)
this.expect(TokenType.COLON, "expected ':' after field name");

// 수정됨 (L508-511)
if (!this.match(TokenType.COLON) && !this.match(TokenType.EQ)) {
  const tok = this.peek();
  this.error("expected ':' or '=' after field name", tok);
}
```

**빌드 상태**: ✅ 성공 (npm run build)

---

## ❌ 새로 발견된 차단 요소

### 1. Anonymous Struct Literal (5+ 파일)

**문제**: 
```freeLang
var emitter: any = { code: [], constants: [] }
// Error: unexpected token: {
```

**원인**: nud()에서 LBRACE를 처리하지 않음

**파일**:
- emitter.fl
- parser-json.fl
- test_struct_field_access.fl

**해결 방법**: nud()에 다음 추가
```typescript
// { field: value, ... } anonymous struct literal
if (tok.type === TokenType.LBRACE) {
  this.advance(); // {
  const fields: { name: string; value: Expr }[] = [];
  if (!this.check(TokenType.RBRACE)) {
    do {
      const name = this.expectIdent("field name");
      if (!this.match(TokenType.COLON) && !this.match(TokenType.EQ)) {
        const tok = this.peek();
        this.error("expected ':' or '=' after field name", tok);
      }
      const value = this.parseExpr(0);
      fields.push({ name, value });
    } while (this.match(TokenType.COMMA));
  }
  this.expect(TokenType.RBRACE, "expected '}'");
  // Return anonymous struct literal (no structName)
  return { 
    kind: "struct_lit", 
    structName: "", // or null, for anonymous
    fields, 
    line: tok.line, 
    col: tok.col 
  };
}
```

**영향**: 5+ 파일

---

### 2. If-Else Statement (2 파일)

**문제**:
```freeLang
if condition {
  ...
} else {
  ...
}
// Error: expected '{' after if condition (got ELSE: "else")
```

**원인**: If-else parsing에 문제

**파일**:
- lexer.fl (L95)
- simple-tokenizer.fl (L37)

**가능한 원인**:
- If expression vs if statement 혼동
- Else가 statement로 파싱되지 않음

---

## 📊 예상 결과

| 단계 | 변경 사항 | 결과 |
|------|---------|------|
| **현재** | - | 42/61 (69%) |
| **+Anonymous Struct** | nud()에 struct 파싱 추가 | 47/61 (77%) |
| **+If-Else Fix** | if-else parsing 수정 | 49/61 (80%) |
| **+Other Fixes** | 기타 문법 | 61/61 (100%) |

---

## 🎯 다음 우선순위

### Priority 1A: Anonymous Struct Literal (2시간)
- nud()에 struct literal 파싱 추가
- 파일 5개 즉시 해결 가능

### Priority 1B: If-Else Statement (1시간)
- If-else parsing 디버깅
- 파일 2개 해결 가능

### Priority 2: 기타 문법 이슈 (TBD)
- parser-stateless.fl (4 errors)
- test_all.fl, test_full.fl 등

---

## 📝 커밋 정보

**commit**: 1119cba  
**메시지**: "📋 Bootstrap 검증: Stage 1 현황 69% (42/61 파일)"

**수정 파일**:
- src/script-runner/parser.ts (L504-517: struct constructor)
- src/types.ts (중복 THROW 제거)
- src/codegen/ir-generator.ts (deprecated try-catch 제거)
- src/vm.ts (deprecated try-catch 제거)
- src/analyzer/optimization-detector.ts (opcode 매핑 업데이트)

