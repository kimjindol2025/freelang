/**
 * PM2 FreeLang 앱 설정
 *
 * FreeLang 애플리케이션을 PM2로 관리
 * - 자동 재시작
 * - 모니터링
 * - 로그 수집
 * - 배포 스크립트
 *
 * Phase D 구현
 */

module.exports = {
  // ============================================
  // 애플리케이션 정의
  // ============================================
  apps: [
    {
      // REST API 서버
      name: "freelang-api",
      script: "./dist/cli/index.js",
      args: "run ./examples/rest-api-server.fl",
      instances: "max",           // CPU 코어 수만큼 프로세스 생성
      exec_mode: "cluster",       // 클러스터 모드
      watch: true,                // 파일 변경시 자동 재시작
      ignore_watch: [
        "node_modules",
        "logs",
        "dist"
      ],
      max_memory_restart: "500M",  // 메모리 초과시 재시작
      error_file: "./logs/api-error.log",
      out_file: "./logs/api-out.log",
      log_file: "./logs/api-combined.log",
      time_format: "YYYY-MM-DD HH:mm:ss Z",
      env: {
        NODE_ENV: "development",
        PORT: 3000
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000
      }
    },

    {
      // ORM + 데이터베이스 관리
      name: "freelang-db-manager",
      script: "./dist/cli/index.js",
      args: "run ./examples/orm-basic.fl",
      instances: 1,               // 싱글 모드 (DB 접근)
      exec_mode: "fork",
      watch: false,               // DB 관리 도구는 자동 재시작 비활성화
      max_memory_restart: "300M",
      error_file: "./logs/db-error.log",
      out_file: "./logs/db-out.log",
      env: {
        NODE_ENV: "development",
        DATABASE_URL: "sqlite://./data.db"
      }
    }
  ],

  // ============================================
  // 배포 설정
  // ============================================
  deploy: {
    production: {
      user: "kimjin",
      host: "192.168.45.232",     // 232 서버
      port: 2222,
      ref: "origin/master",
      repo: "https://gogs.dclub.kr/kim/v2-freelang-ai.git",
      path: "/home/kimjin/deployment/v2-freelang-ai",
      key_path: "/home/kimjin/.ssh/id_rsa",

      // Pre-deployment 검사
      "pre-deploy": "echo '🚀 Pre-deployment checks started'",

      // 배포 후 실행
      "post-deploy": `
        npm install &&
        npm run build &&
        pm2 reload ecosystem.config.js --env production &&
        echo '✅ Deployment completed'
      `,

      // 롤백 명령어
      "post-rollback": "npm install && npm run build && pm2 restart all"
    },

    staging: {
      user: "kim",
      host: "192.168.45.73",      // 73 서버
      port: 22,
      ref: "origin/develop",
      repo: "https://gogs.dclub.kr/kim/v2-freelang-ai.git",
      path: "/home/kim/staging/v2-freelang-ai",

      "post-deploy": "npm install && npm run build && pm2 restart all --env staging"
    }
  },

  // ============================================
  // 고급 옵션
  // ============================================
  watch: false,
  ignore_watch: ["[\\/\\\\]\\.", "node_modules"],
  max_memory_restart: "500M",
  kill_timeout: 5000,
  listen_timeout: 3000,
  shutdown_with_message: true
};
