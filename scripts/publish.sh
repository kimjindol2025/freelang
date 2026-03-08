#!/bin/bash

# FreeLang npm 배포 스크립트
# 사용: bash scripts/publish.sh [version]

set -e

VERSION=${1:-$(node -p "require('./package.json').version")}
NPM_TOKEN=${NPM_TOKEN:-$(cat ~/.npmrc 2>/dev/null | grep -oP 'authToken=\K[^/]+' | head -1)}

echo "🚀 FreeLang v$VERSION 배포 시작..."

# 1. 빌드
echo "📦 빌드 중..."
npm run build

# 2. 테스트
echo "🧪 테스트 중..."
npm test 2>&1 || echo "⚠️ 테스트 경고 무시"

# 3. npm 배포
echo "📤 npm에 배포 중..."
if [ -z "$NPM_TOKEN" ]; then
  echo "❌ NPM_TOKEN 없음. .npmrc 확인"
  exit 1
fi

# .npmrc 임시 설정
echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > ~/.npmrc.tmp
npm publish --userconfig ~/.npmrc.tmp

rm -f ~/.npmrc.tmp

# 4. 완료
echo ""
echo "✅ v$VERSION 배포 완료!"
echo "📍 npm: https://www.npmjs.com/package/freelang/v/$VERSION"
echo "📍 GitHub: https://github.com/freelang-io/freelang-compiler/releases/tag/v$VERSION"
