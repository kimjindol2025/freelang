# 기여 가이드

FreeLang에 기여해주셔서 감사합니다! 🙏

## 코드 기여

### 1. 이슈 확인
```bash
# 기존 이슈 확인
# https://github.com/freelang/freelang/issues

# 새 이슈 작성
# 버그: ISSUE_TEMPLATE/bug_report.md 사용
# 기능: ISSUE_TEMPLATE/feature_request.md 사용
```

### 2. Fork & Clone
```bash
git clone https://github.com/YOUR_USERNAME/freelang.git
cd freelang
npm install
```

### 3. 브랜치 생성
```bash
# 기능 추가
git checkout -b feature/my-feature

# 버그 수정
git checkout -b fix/my-bug

# 문서
git checkout -b docs/my-docs
```

### 4. 코드 작성 및 테스트
```bash
npm run build
npm test

# 모든 110 테스트가 통과해야 함!
```

### 5. 커밋 및 PR
```bash
git add .
git commit -m "feat: Add my feature"
git push origin feature/my-feature

# GitHub에서 PR 생성
```

## 코드 스타일

### TypeScript
```typescript
// 강타입 필수
function greet(name: string): string {
  return `Hello, ${name}!`;
}

// JSDoc 주석
/**
 * 사용자 인증
 * @param username 사용자명
 * @param password 비밀번호
 * @returns 인증 토큰 또는 null
 */
function authenticate(username: string, password: string): string | null {
  // ...
}
```

### 테스트
```typescript
describe('Feature', () => {
  it('should do X', async () => {
    // Arrange
    const input = createInput();

    // Act
    const result = await myFunction(input);

    // Assert
    expect(result).toBeDefined();
  });
});
```

## PR 체크리스트

- [ ] 테스트 모두 통과 (110/110)
- [ ] 새 테스트 추가됨 (기능당 3+ 테스트)
- [ ] JSDoc 주석 추가됨
- [ ] TypeScript 타입 완성
- [ ] 문서 업데이트됨
- [ ] Commit 메시지 명확함

## 행동 강령

CODE_OF_CONDUCT.md를 참조하세요.

## 보안

보안 취약점을 발견하셨나요? security@freelang.dev로 신고해주세요.

---

**감사합니다! 🚀**
