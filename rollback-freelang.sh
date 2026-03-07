#!/bin/bash

# ============================================
# FreeLang 자동 롤백 스크립트
# ============================================
# 배포 실패 시 이전 버전으로 자동 복구
# ============================================

set -e

echo "=================================================="
echo "🔄 FreeLang Automatic Rollback"
echo "=================================================="
echo ""

ROLLBACK_TIME=$(date '+%Y-%m-%d %H:%M:%S')
ROLLBACK_LOG="rollback-$ROLLBACK_TIME.log"

# ============================================
# 1. 이전 커밋으로 복귀
# ============================================

echo "🔙 Step 1: Reverting to previous commit..."

if ! git status > /dev/null 2>&1; then
  echo "❌ Not a git repository"
  exit 1
fi

# 현재 커밋 저장
CURRENT_COMMIT=$(git rev-parse --short HEAD)
echo "Current commit: $CURRENT_COMMIT" | tee -a $ROLLBACK_LOG

# 이전 커밋으로 복귀
if ! git reset --hard HEAD~1; then
  echo "❌ Failed to reset git commit"
  exit 1
fi

PREVIOUS_COMMIT=$(git rev-parse --short HEAD)
echo "✅ Reverted to: $PREVIOUS_COMMIT" | tee -a $ROLLBACK_LOG
echo ""

# ============================================
# 2. 의존성 재설치
# ============================================

echo "📦 Step 2: Reinstalling dependencies..."

if ! npm ci --no-optional; then
  echo "⚠️  npm ci failed, continuing..."
fi

echo "✅ Dependencies installed" | tee -a $ROLLBACK_LOG
echo ""

# ============================================
# 3. 빌드 다시 실행
# ============================================

echo "🔨 Step 3: Rebuilding..."

if ! npm run build; then
  echo "❌ Build failed"
  exit 1
fi

echo "✅ Build completed" | tee -a $ROLLBACK_LOG
echo ""

# ============================================
# 4. PM2 재시작
# ============================================

echo "🚀 Step 4: Restarting PM2..."

if command -v pm2 &> /dev/null; then
  pm2 reload freelang-api --wait-ready --listen-timeout 5000
  echo "✅ PM2 restarted" | tee -a $ROLLBACK_LOG
else
  echo "⚠️  PM2 not installed, skipping..."
fi
echo ""

# ============================================
# 5. 헬스 체크
# ============================================

echo "🏥 Step 5: Health check..."

HEALTH_CHECK_ATTEMPTS=10
HEALTH_CHECK_INTERVAL=3
HEALTH_CHECK_SUCCESS=false

for i in $(seq 1 $HEALTH_CHECK_ATTEMPTS); do
  echo "Health check attempt $i/$HEALTH_CHECK_ATTEMPTS..."

  if curl -f http://localhost:3000/health 2>/dev/null; then
    echo "✅ Health check passed"
    HEALTH_CHECK_SUCCESS=true
    break
  fi

  if [ $i -lt $HEALTH_CHECK_ATTEMPTS ]; then
    echo "⏳ Waiting ${HEALTH_CHECK_INTERVAL}s before retry..."
    sleep $HEALTH_CHECK_INTERVAL
  fi
done

echo ""

# ============================================
# 결과 보고
# ============================================

echo "=================================================="
if [ "$HEALTH_CHECK_SUCCESS" = true ]; then
  echo "✅ ROLLBACK SUCCESSFUL"
  echo "=================================================="
  echo ""
  echo "📝 Rollback Summary:"
  echo "  Reverted from: $CURRENT_COMMIT"
  echo "  Reverted to:   $PREVIOUS_COMMIT"
  echo "  Time:          $ROLLBACK_TIME"
  echo "  Status:        ✅ Success"
  echo ""
  echo "✅ Previous version is now running"
  echo ""
else
  echo "⚠️  ROLLBACK INCOMPLETE"
  echo "=================================================="
  echo ""
  echo "⚠️  Health check failed during rollback"
  echo "Manual intervention may be required"
  echo ""
  echo "📝 Rollback Info:"
  echo "  Reverted from: $CURRENT_COMMIT"
  echo "  Reverted to:   $PREVIOUS_COMMIT"
  echo "  Time:          $ROLLBACK_TIME"
  echo ""
  echo "Manual Recovery Steps:"
  echo "  1. ssh to server"
  echo "  2. cd $(pwd)"
  echo "  3. git log --oneline | head -5"
  echo "  4. npm install"
  echo "  5. npm run build"
  echo "  6. pm2 restart freelang-api"
  echo "  7. curl http://localhost:3000/health"
  echo ""
fi

echo "Log saved to: $ROLLBACK_LOG"
echo ""
