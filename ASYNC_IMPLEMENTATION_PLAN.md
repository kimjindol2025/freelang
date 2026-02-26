# Async/Await 구현 계획

## 현재 완료사항
✅ Lexer: ASYNC, AWAIT 키워드 추가
✅ Parser: ASYNC FUNC 문법 처리
✅ Parser: AWAIT 표현식 처리

## 남은 작업 - Interpreter 비동기 처리

### 전략 1: Shallow Async (현재 선택)
- **장점**: 빠르고 간단
- **단점**: 모든 함수가 비동기여야 함
- **구현**: execute() → async execute(), executeNode() → async

### 전략 2: Promise 래핑
- **장점**: 기존 코드 최소 수정
- **단점**: 복잡한 Promise 체인
- **구현**: HTTP만 Promise로, 나머지는 동기

### 선택: 전략 1 (Shallow Async)
- executeProgram, executeNode, evaluateExpression 모두 async
- AWAIT 표현식에서 Promise를 기다림
- HTTP 함수가 Promise 반환

## 상세 구현

### 1. ExecutionContext 수정
```typescript
interface ExecutionContext {
  variables: Map<string, any>;
  functions: Map<string, ASTNode & { isAsync?: boolean }>;
  classes: Map<string, ASTNode>;
  modules: Map<string, any>;
  returnValue?: any;
  shouldReturn: boolean;
  // ↓ 추가
  isAsyncContext?: boolean;
}
```

### 2. executeNode 비동기화
```typescript
private async executeNode(node: ASTNode, context: ExecutionContext): Promise<any> {
  switch (node.type) {
    case 'AwaitExpression':
      return await this.evaluateExpression(node.argument, context);
    // ...
  }
}
```

### 3. HTTP 함수 Promise 반환
```typescript
if (funcName === 'httpGet') {
  const url = String(...);
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}
```

### 4. 함수 호출 처리
```typescript
if (funcDef.isAsync) {
  // Promise로 감싸기
  const promise = executeAsyncFunction(...);
  return promise; // Caller가 AWAIT로 처리
}
```

## 테스트 시나리오
```freeLang
ASYNC FUNC fetchData() {
  RETURN AWAIT httpGet("https://api.example.com/data")
}

SET result = AWAIT fetchData()
PRINT result
```

## 주의사항
- 일단 ASYNC/AWAIT 없이 기존 코드는 동기로 작동해야 함
- ASYNC 함수만 비동기 처리
- execute() 진입점만 Promise 기반

## 예상 이슈
1. 모든 함수가 Promise를 반환할 수 있음
2. 비동기 함수와 동기 함수의 호출 규칙 다름
3. 에러 처리 (try-catch with async)
