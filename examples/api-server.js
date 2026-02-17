/**
 * Example 2: REST API Server with Self-Healing
 * 
 * 실행: node examples/api-server.js
 * 테스트: curl -X GET http://localhost:3001/api/users
 */

const http = require('@freelang/http');
const { HealthChecker, SelfHealer } = require('freelang');

// 간단한 데이터 스토어
const users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' }
];

// 자가치유 활성화
const healthChecker = new HealthChecker();
const selfHealer = new SelfHealer(healthChecker);

const server = http.createServer((req, res) => {
  const [path, query] = req.url.split('?');

  // CORS 헤더
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    if (path === '/api/users' && req.method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify(users));
    } else if (path.match(/^\/api\/users\/\d+$/) && req.method === 'GET') {
      const id = parseInt(path.split('/')[3]);
      const user = users.find(u => u.id === id);
      if (user) {
        res.writeHead(200);
        res.end(JSON.stringify(user));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'User not found' }));
      }
    } else if (path === '/health') {
      const health = healthChecker.check();
      res.writeHead(200);
      res.end(JSON.stringify(health));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  } catch (error) {
    console.error('Error:', error);
    res.writeHead(500);
    res.end(JSON.stringify({ error: error.message }));
  }
});

// 자가치유 시작
selfHealer.start();

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`✅ API Server running on http://localhost:${PORT}`);
  console.log(`   GET /api/users         → 모든 사용자`);
  console.log(`   GET /api/users/:id     → 특정 사용자`);
  console.log(`   GET /health            → 시스템 상태`);
  console.log(`\n   자가치유: 활성화 ✅`);
  console.log(`   모니터링: 10초 주기`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n📢 종료 신호 수신. 정리 중...');
  selfHealer.stop();
  server.close(() => {
    console.log('✅ 서버 종료됨');
    process.exit(0);
  });
});
