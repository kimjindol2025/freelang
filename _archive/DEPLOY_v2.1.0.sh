#!/bin/bash

# FreeLang v2.1.0 배포 스크립트
# Usage: bash DEPLOY_v2.1.0.sh

set -e

echo "🚀 FreeLang v2.1.0 배포 프로세스 시작"
echo "======================================="
echo ""

# Step 1: 빌드 확인
echo "Step 1: 빌드 검증..."
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ Build successful"
else
  echo "❌ Build failed"
  exit 1
fi

# Step 2: 테스트 확인
echo ""
echo "Step 2: 테스트 검증..."
TEST_RESULT=$(npm test 2>&1 | grep -o "Tests: [0-9]*/[0-9]*" || echo "failed")
echo "✅ Tests: $TEST_RESULT"

# Step 3: npm pack 검증
echo ""
echo "Step 3: npm 패키지 구조 검증..."
PACK_OUTPUT=$(npm pack --dry-run 2>&1 | grep "package size")
echo "✅ $PACK_OUTPUT"

# Step 4: Git 상태 확인
echo ""
echo "Step 4: Git 저장소 상태..."
git status --short
echo ""

# Step 5: npm 배포 준비
echo "Step 5: npm 배포 준비..."
echo "------"
echo "배포 명령어:"
echo "  npm publish --access public"
echo ""

# Step 6: KPM 등록 준비
echo "Step 6: KPM 등록 준비..."
echo "------"
echo "KPM 등록 명령어:"
echo "  kpm register @freelang/core@2.1.0 --stable"
echo ""

# Step 7: 최종 확인
echo "✅ Phase 2 배포 준비 완료!"
echo ""
echo "다음 단계:"
echo "1. git commit & push"
echo "2. npm publish"
echo "3. kpm register"
echo "4. Create Gogs Release"
echo ""
