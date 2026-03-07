# FreeLang v2.6.0 배포 가이드

## 📋 개요

FreeLang v2.6.0은 프로덕션급 프로그래밍 언어 런타임입니다.
- **버전**: 2.6.0
- **레벨**: 3 (완전 구현)
- **완성도**: 95%
- **상태**: Stable

## 🚀 빠른 배포

### 1단계: 저장소 클론

```bash
git clone https://gogs.dclub.kr/kim/v2-freelang-ai.git
cd v2-freelang-ai
```

### 2단계: 의존성 설치 및 빌드

```bash
npm install
npm run build
```

### 3단계: PM2로 배포

```bash
# PM2 설치 (이미 설치되어 있으면 건너뛰기)
npm install -g pm2

# FreeLang 시작
pm2 start ecosystem.config.js --env production

# 상태 확인
pm2 status

# 로그 확인
pm2 logs freelang-v2
```

### 4단계: 서비스 자동 시작 설정

```bash
pm2 startup
pm2 save
```

## 📊 배포 정보

| 항목 | 값 |
|------|-----|
| **앱 이름** | freelang-v2 |
| **포트** | 35600 |
| **환경** | production |
| **메모리 제한** | 512MB |
| **자동 재시작** | 활성화 |
| **헬스 타임아웃** | 3초 |

## 🔍 상태 확인

### PM2 상태 확인

```bash
pm2 status
pm2 show freelang-v2
```

### 로그 확인

```bash
# 실시간 로그
pm2 logs freelang-v2

# 마지막 100줄
pm2 logs freelang-v2 --lines 100

# 에러 로그만
pm2 logs freelang-v2 --err
```

### 헬스 체크

```bash
# 프로세스 체크
curl http://localhost:35600/health || echo "서비스 미실행"

# PM2 체크
pm2 ping
```

## 🔧 운영 명령어

### 시작/중지/재시작

```bash
# 시작
pm2 start freelang-v2

# 중지
pm2 stop freelang-v2

# 재시작
pm2 restart freelang-v2

# 삭제
pm2 delete freelang-v2
```

### 버전 업그레이드

```bash
# 1. 코드 업데이트
git pull origin master

# 2. 재빌드
npm install
npm run build

# 3. 재시작
pm2 restart freelang-v2

# 4. 상태 확인
pm2 status
```

### 로그 정리

```bash
# PM2 로그 초기화
pm2 flush

# 로그 파일 확인
ls -lh /var/log/pm2/
```

## 📈 성능 모니터링

### 실시간 모니터링

```bash
# PM2 모니터 활성화
pm2 monit
```

### 메모리/CPU 추적

```bash
# PM2 상태 확인 (메모리/CPU 포함)
pm2 status

# 자세한 정보
pm2 show freelang-v2
```

## 🚨 문제 해결

### 포트 이미 사용 중

```bash
# 포트 사용 중인 프로세스 확인
lsof -i :35600

# 프로세스 종료
kill -9 <PID>

# 다른 포트로 변경
# ecosystem.config.js에서 PORT 수정 후 재시작
```

### 메모리 부족

```bash
# 메모리 제한 확인
pm2 show freelang-v2 | grep max_memory

# 메모리 증가 필요시
# ecosystem.config.js에서 max_memory_restart 수정
```

### 자동 재시작 반복

```bash
# 최근 재시작 이유 확인
pm2 logs freelang-v2 --err

# 환경 변수 확인
pm2 env freelang-v2
```

## 📋 체크리스트

배포 전 확인사항:

- [ ] Node.js 18+ 설치 확인
- [ ] npm 의존성 설치 완료
- [ ] TypeScript 빌드 성공
- [ ] dist/ 디렉토리 생성됨
- [ ] PM2 설치됨
- [ ] ecosystem.config.js 확인됨
- [ ] 포트 35600 사용 가능
- [ ] 권한 설정 확인

배포 후 확인사항:

- [ ] `pm2 status` 실행 중 확인
- [ ] 로그 파일 생성됨
- [ ] 헬스 체크 응답
- [ ] 메모리 사용량 정상 (512MB 이하)
- [ ] CPU 사용량 정상 (< 5%)
- [ ] 자동 재시작 설정됨

## 🔄 지속적 배포 (CI/CD)

### GitHub Actions 예시

```yaml
name: Deploy FreeLang v2.6

on:
  push:
    branches: [ master ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - name: Deploy to production
        run: |
          npm install -g pm2
          pm2 connect
          pm2 start ecosystem.config.js --env production
```

## 📞 지원

- **저장소**: https://gogs.dclub.kr/kim/v2-freelang-ai
- **이슈**: https://gogs.dclub.kr/kim/v2-freelang-ai/issues
- **버전**: v2.6.0
- **레벨**: 3

## 📝 변경 이력

### v2.6.0 (2026-03-06)
- Level 3 완전 구현
- Float 타입 지원
- TCP 네트워크 지원
- JIT Hotspot Detection
- AOT 컴파일
- LLVM 최적화 파이프라인

---

**마지막 업데이트**: 2026-03-06
**상태**: 🟢 Production Ready
