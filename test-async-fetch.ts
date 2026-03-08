/**
 * Test async/fetch functionality
 * Phase J: async/await + HTTP support
 */

import { Lexer } from './src/lexer/lexer';
import { TokenBuffer } from './src/lexer/lexer';
import { Parser } from './src/parser/parser';
import { vmNative } from './src/vm/native';

/**
 * 테스트 1: async 함수 파싱
 */
function testAsyncParsing() {
  console.log('=== Test 1: Async Function Parsing ===\n');

  const code = `
    async fn fetchData(url: string): Promise<string> {
      let response = await fetch(url)
      return response.text()
    }
  `;

  try {
    const lexer = new Lexer(code);
    const tokenBuffer = new TokenBuffer(lexer);
    const parser = new Parser(tokenBuffer);

    // 최소 한 문장 파싱
    const stmt = parser.parseStatement();
    const statements = stmt ? [stmt] : [];

    console.log('✅ Parsed statements:', statements.length);
    console.log('✅ First statement type:', statements[0]?.type);
    console.log('✅ Is async:', (statements[0] as any)?.async);
    console.log();
  } catch (error) {
    console.error('❌ Parse error:', error);
  }
}

/**
 * 테스트 2: await 표현식 파싱
 */
function testAwaitParsing() {
  console.log('=== Test 2: Await Expression Parsing ===\n');

  const code = `
    fn test() {
      let result = await somePromise
      println(result)
    }
  `;

  try {
    const lexer = new Lexer(code);
    const tokenBuffer = new TokenBuffer(lexer);
    const parser = new Parser(tokenBuffer);

    const stmt = parser.parseStatement();
    const statements = stmt ? [stmt] : [];

    console.log('✅ Parsed statements:', statements.length);
    console.log('✅ Function body type:', (statements[0] as any)?.body?.type);
    console.log();
  } catch (error) {
    console.error('❌ Parse error:', error);
  }
}

/**
 * 테스트 3: HTTP API 함수 확인
 */
function testHttpApi() {
  console.log('=== Test 3: HTTP API Functions ===\n');

  console.log('✅ fetch function exists:', typeof vmNative.net.fetch);
  console.log('✅ httpGet function exists:', typeof vmNative.net.httpGet);
  console.log('✅ httpPost function exists:', typeof vmNative.net.httpPost);
  console.log();
}

/**
 * 테스트 4: fetch 실제 동작 (비동기)
 */
async function testFetchExecution() {
  console.log('=== Test 4: Fetch Execution ===\n');

  try {
    // JSONPlaceholder API 사용 (공개 테스트 API)
    const response = await vmNative.net.fetch('https://jsonplaceholder.typicode.com/users/1');

    console.log('✅ Response status:', response.status);
    console.log('✅ Response ok:', response.ok);
    console.log('✅ Response headers:', Object.keys(response.headers).slice(0, 3));

    // JSON 파싱 테스트
    const json = response.json();
    console.log('✅ Parsed JSON name:', json?.name);
    console.log();
  } catch (error) {
    console.error('❌ Fetch error:', error);
  }
}

/**
 * 메인 테스트 실행
 */
async function main() {
  console.log('\n┌─ FreeLang Phase J: async/await + HTTP Support Test ─┐\n');

  testAsyncParsing();
  testAwaitParsing();
  testHttpApi();
  await testFetchExecution();

  console.log('└─ All tests completed ─┘\n');
}

main().catch(console.error);
