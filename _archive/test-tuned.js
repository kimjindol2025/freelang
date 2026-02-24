#!/usr/bin/env node --max-old-space-size=4096 --trace-gc --expose-gc

// Node.js 성능 튜닝 플래그로 테스트 실행
const { spawnSync } = require('child_process');

console.log('🚀 V8 최적화 플래그 활성화:');
console.log('  --max-old-space-size=4096 (힙 4GB)');
console.log('  --trace-gc (GC 추적)');
console.log('  --expose-gc (수동 GC)');
console.log('');

// npm test 실행
const result = spawnSync('npm', ['test', '--', 'tests/performance-optimization.test.ts'], {
  stdio: 'inherit',
  cwd: __dirname
});

process.exit(result.status);
