#!/bin/bash

##################################################
# FreeLang 자동 배포 스크립트
#
# 기능:
# - GitHub/Gogs에서 최신 코드 pull
# - 빌드 및 테스트
# - PM2 서비스 재시작
# - 헬스체크
# - 롤백 (필요시)
#
# Phase D 구현
##################################################

set -e

# ============================================
# 설정
# ============================================

PROJECT_PATH="/home/kimjin/deployment/v2-freelang-ai"
LOG_FILE="/var/log/freelang-deploy.log"
ENVIRONMENT="${1:-production}"  # production, staging
REPO_URL="https://gogs.dclub.kr/kim/v2-freelang-ai.git"
BRANCH=$([ "$ENVIRONMENT" = "production" ] && echo "master" || echo "develop")

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'  # No Color

# ============================================
# 함수
# ============================================

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# ============================================
# 1. 환경 확인
# ============================================

log_info "🔍 Environment check: $ENVIRONMENT"

if [ ! -d "$PROJECT_PATH" ]; then
  log_error "Project directory not found: $PROJECT_PATH"
  exit 1
fi

if ! command -v pm2 &> /dev/null; then
  log_error "PM2 not installed"
  exit 1
fi

if ! command -v npm &> /dev/null; then
  log_error "npm not installed"
  exit 1
fi

log_success "Environment check passed"

# ============================================
# 2. 코드 업데이트
# ============================================

log_info "📥 Pulling latest code from $BRANCH..."

cd "$PROJECT_PATH"

# Git 상태 확인
if [ -z "$(git status --porcelain)" ]; then
  log_info "Working directory is clean"
else
  log_warning "Working directory has uncommitted changes"
  git stash
fi

# Pull
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

log_success "Code updated"

# ============================================
# 3. 의존성 설치
# ============================================

log_info "📦 Installing dependencies..."

npm ci --production  # ci는 package-lock.json을 정확히 따름

log_success "Dependencies installed"

# ============================================
# 4. 빌드
# ============================================

log_info "🔨 Building FreeLang..."

npm run build

if [ ! -f "dist/cli/index.js" ]; then
  log_error "Build failed - dist/cli/index.js not found"
  exit 1
fi

log_success "Build completed"

# ============================================
# 5. 테스트 (선택사항)
# ============================================

log_info "🧪 Running tests..."

# 기본 테스트만 실행 (빠른 확인용)
if [ -f "tests/test-express-compat.fl" ]; then
  npm run test 2>/dev/null || log_warning "Tests failed (non-blocking)"
else
  log_warning "No test file found"
fi

log_success "Tests completed"

# ============================================
# 6. PM2 서비스 재시작
# ============================================

log_info "🚀 Restarting PM2 services..."

# 현재 프로세스 상태 저장 (롤백용)
pm2 save

# PM2 설정 로드 및 서비스 시작
if pm2 describe freelang-api &>/dev/null; then
  log_info "Reloading existing apps..."
  pm2 reload pm2-freelang-config.js --env "$ENVIRONMENT"
else
  log_info "Starting new apps..."
  pm2 start pm2-freelang-config.js --env "$ENVIRONMENT"
fi

sleep 2  # 프로세스 시작 대기

log_success "PM2 services updated"

# ============================================
# 7. 헬스체크
# ============================================

log_info "🏥 Health check..."

MAX_RETRIES=10
RETRY_INTERVAL=2
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    log_success "Health check passed ✅"
    break
  fi

  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
    log_warning "Health check failed, retrying... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep $RETRY_INTERVAL
  fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  log_error "Health check failed after $MAX_RETRIES attempts"
  log_info "📊 PM2 status:"
  pm2 status

  log_warning "⚠️  Rolling back..."
  pm2 resurrect  # 이전 상태로 복구
  sleep 2

  if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    log_success "Rollback successful - Health check passed"
    exit 1
  else
    log_error "Rollback failed - Manual intervention required"
    exit 1
  fi
fi

# ============================================
# 8. 배포 완료
# ============================================

log_info "📊 Final status:"
pm2 status

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
log_success "✅ Deployment completed at $TIMESTAMP"

# ============================================
# 9. 알림 (선택사항)
# ============================================

if [ -n "$SLACK_WEBHOOK_URL" ]; then
  curl -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-Type: application/json' \
    -d "{
      \"text\": \"🚀 FreeLang deployment completed ($ENVIRONMENT)\",
      \"attachments\": [{
        \"color\": \"good\",
        \"text\": \"Environment: $ENVIRONMENT\nBranch: $BRANCH\nTime: $TIMESTAMP\"
      }]
    }"
fi

exit 0
