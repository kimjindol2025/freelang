/**
 * Example 1: Simple HTTP Server
 * 
 * 실행: node examples/http-server.js
 * 테스트: curl http://localhost:3000
 */

const http = require('@freelang/http');

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello FreeLang! 🚀\n');
  } else if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found\n');
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`   GET /         → Hello message`);
  console.log(`   GET /health   → JSON status`);
  console.log(`\n   curl http://localhost:${PORT}`);
});
