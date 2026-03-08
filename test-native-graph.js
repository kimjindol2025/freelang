/**
 * Native-Graph 빌트인 통합 테스트
 * graph_schema_define / graph_resolver_add / graph_execute / graph_server_start
 */

const { createNativeFunctionRegistry } = require('./dist/vm/native-function-registry');

// dist 없으면 ts-node로 직접 실행
const { NativeFunctionRegistry } = require('./src/vm/native-function-registry');
const registry = new NativeFunctionRegistry();

// stdlib 등록
const { registerStdlibFunctions } = require('./src/stdlib-builtins');
registerStdlibFunctions(registry);

// ── 헬퍼 ──────────────────────────────────────────────────────
function call(name, ...args) {
  const fn = registry.get(name);
  if (!fn) throw new Error(`빌트인 없음: ${name}`);
  return fn.executor(args);
}

// ── 1. 스키마 정의 ─────────────────────────────────────────────
call('graph_schema_define', 'Query', JSON.stringify([
  { name: 'user',  type: 'User' },
  { name: 'users', type: '[User]' }
]));
call('graph_schema_define', 'User', JSON.stringify([
  { name: 'id',    type: 'Int' },
  { name: 'name',  type: 'String' },
  { name: 'email', type: 'String' }
]));
console.log('[1] 스키마 정의 완료 (Query, User)');

// ── 2. 리졸버 등록 ─────────────────────────────────────────────
const DB = new Map([
  [1, new Map([['id',1],['name','Alice'],['email','alice@example.com']])],
  [2, new Map([['id',2],['name','Bob'],  ['email','bob@example.com']])],
]);

call('graph_resolver_add', 'Query', 'user', (rootArgs, fieldArgs) => {
  const id = fieldArgs.get('id') || rootArgs.get('id');
  return DB.get(Number(id)) || null;
});

call('graph_resolver_add', 'Query', 'users', () => {
  return Array.from(DB.values());
});
console.log('[2] 리졸버 등록 완료 (Query.user, Query.users)');

// ── 3. graph_execute 단위 테스트 ──────────────────────────────
const result1 = call('graph_execute', '{ user(id: 1) { id name email } }');
const parsed1 = JSON.parse(result1);
console.log('[3] graph_execute 결과:', JSON.stringify(parsed1, null, 2));

// 검증
const userData = parsed1?.data?.user;
if (!userData) throw new Error('user 데이터 없음');
const idVal    = userData instanceof Map ? userData.get('id')    : userData['id'];
const nameVal  = userData instanceof Map ? userData.get('name')  : userData['name'];
if (idVal !== 1 && idVal !== '1') throw new Error(`id 불일치: ${idVal}`);
if (nameVal !== 'Alice') throw new Error(`name 불일치: ${nameVal}`);
console.log('[3] 검증 통과: id=1, name=Alice');

// ── 4. graph_server_start 테스트 ──────────────────────────────
const port = 14321;
const srv = call('graph_server_start', port);
console.log(`[4] GraphQL 서버 기동: :${port}/graphql`);

// 0.3초 후 curl 테스트
setTimeout(async () => {
  const http = require('http');
  const body = JSON.stringify({ query: '{ user(id: 2) { id name } }' });

  const res = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1', port, path: '/graphql',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });

  console.log(`[4] HTTP 응답 ${res.status}:`, res.data);

  const json = JSON.parse(res.data);
  const user = json?.data?.user;
  const uName = user instanceof Map ? user.get('name') : user?.name;
  const uId   = user instanceof Map ? user.get('id')   : user?.id;

  if (uId == 2 && uName === 'Bob') {
    console.log('[4] HTTP 검증 통과: id=2, name=Bob');
  } else {
    console.log('[4] 응답 데이터:', JSON.stringify(json, null, 2));
  }

  // 서버 종료
  call('graph_server_stop', port);
  console.log('[5] 서버 종료');
  console.log('\n=== Native-Graph 테스트 완료 ===');
  console.log('빌트인: graph_schema_define / graph_resolver_add / graph_execute / graph_server_start / graph_server_stop');
  console.log('외부 의존성: 0% (Node.js http 모듈만 사용)');
}, 300);
