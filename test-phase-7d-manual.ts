/**
 * Phase 7-D: Manual Test for Closure Integration
 * Direct test without Jest framework
 */

import { VM } from './src/vm';
import { FunctionRegistry } from './src/parser/function-registry';

async function runTests() {
  console.log('\n======================================================================');
  console.log('  Phase 7-D: Stdlib Integration with Closures');
  console.log('======================================================================\n');

  const registry = new FunctionRegistry();
  const vm = new VM(registry);

  let passCount = 0;
  let failCount = 0;

  // ========== TEST 1: arr_map with closure ==========
  {
    const testName = 'arr_map with closure: double numbers';
    try {
      const closure: any = {
        type: 'lambda',
        params: ['x'],
        paramTypes: ['number'],
        body: {
          type: 'binary',
          operator: '*',
          left: { type: 'identifier', name: 'x' },
          right: { type: 'literal', value: 2 }
        },
        capturedVars: []
      };

      const vmRegistry = vm.getNativeFunctionRegistry();
      const result = vmRegistry.call('arr_map', [[1, 2, 3, 4, 5], closure]);

      if (JSON.stringify(result) === JSON.stringify([2, 4, 6, 8, 10])) {
        console.log(`✅ [1/8] ${testName}`);
        console.log(`        Result: ${JSON.stringify(result)}`);
        passCount++;
      } else {
        console.log(`❌ [1/8] ${testName}`);
        console.log(`        Expected: [2, 4, 6, 8, 10]`);
        console.log(`        Got: ${JSON.stringify(result)}`);
        failCount++;
      }
    } catch (e) {
      console.log(`❌ [1/8] ${testName}`);
      console.log(`        Error: ${e instanceof Error ? e.message : String(e)}`);
      failCount++;
    }
  }

  // ========== TEST 2: arr_filter with closure ==========
  {
    const testName = 'arr_filter with closure: even numbers';
    try {
      const closure: any = {
        type: 'lambda',
        params: ['x'],
        paramTypes: ['number'],
        body: {
          type: 'binary',
          operator: '==',
          left: {
            type: 'binary',
            operator: '%',
            left: { type: 'identifier', name: 'x' },
            right: { type: 'literal', value: 2 }
          },
          right: { type: 'literal', value: 0 }
        },
        capturedVars: []
      };

      const vmRegistry = vm.getNativeFunctionRegistry();
      const result = vmRegistry.call('arr_filter', [[1, 2, 3, 4, 5], closure]);

      if (JSON.stringify(result) === JSON.stringify([2, 4])) {
        console.log(`✅ [2/8] ${testName}`);
        console.log(`        Result: ${JSON.stringify(result)}`);
        passCount++;
      } else {
        console.log(`❌ [2/8] ${testName}`);
        console.log(`        Expected: [2, 4]`);
        console.log(`        Got: ${JSON.stringify(result)}`);
        failCount++;
      }
    } catch (e) {
      console.log(`❌ [2/8] ${testName}`);
      console.log(`        Error: ${e instanceof Error ? e.message : String(e)}`);
      failCount++;
    }
  }

  // ========== TEST 3: arr_reduce with closure ==========
  {
    const testName = 'arr_reduce with closure: sum numbers';
    try {
      const closure: any = {
        type: 'lambda',
        params: ['acc', 'x'],
        paramTypes: ['number', 'number'],
        body: {
          type: 'binary',
          operator: '+',
          left: { type: 'identifier', name: 'acc' },
          right: { type: 'identifier', name: 'x' }
        },
        capturedVars: []
      };

      const vmRegistry = vm.getNativeFunctionRegistry();
      const result = vmRegistry.call('arr_reduce', [[1, 2, 3, 4, 5], closure, 0]);

      if (result === 15) {
        console.log(`✅ [3/8] ${testName}`);
        console.log(`        Result: ${result}`);
        passCount++;
      } else {
        console.log(`❌ [3/8] ${testName}`);
        console.log(`        Expected: 15`);
        console.log(`        Got: ${result}`);
        failCount++;
      }
    } catch (e) {
      console.log(`❌ [3/8] ${testName}`);
      console.log(`        Error: ${e instanceof Error ? e.message : String(e)}`);
      failCount++;
    }
  }

  // ========== TEST 4: arr_find with closure ==========
  {
    const testName = 'arr_find with closure: find > 3';
    try {
      const closure: any = {
        type: 'lambda',
        params: ['x'],
        body: {
          type: 'binary',
          operator: '>',
          left: { type: 'identifier', name: 'x' },
          right: { type: 'literal', value: 3 }
        },
        capturedVars: []
      };

      const vmRegistry = vm.getNativeFunctionRegistry();
      const result = vmRegistry.call('arr_find', [[1, 2, 3, 4, 5], closure]);

      if (result === 4) {
        console.log(`✅ [4/8] ${testName}`);
        console.log(`        Result: ${result}`);
        passCount++;
      } else {
        console.log(`❌ [4/8] ${testName}`);
        console.log(`        Expected: 4`);
        console.log(`        Got: ${result}`);
        failCount++;
      }
    } catch (e) {
      console.log(`❌ [4/8] ${testName}`);
      console.log(`        Error: ${e instanceof Error ? e.message : String(e)}`);
      failCount++;
    }
  }

  // ========== TEST 5: arr_some with closure ==========
  {
    const testName = 'arr_some with closure: any > 3';
    try {
      const closure: any = {
        type: 'lambda',
        params: ['x'],
        body: {
          type: 'binary',
          operator: '>',
          left: { type: 'identifier', name: 'x' },
          right: { type: 'literal', value: 3 }
        },
        capturedVars: []
      };

      const vmRegistry = vm.getNativeFunctionRegistry();
      const result = vmRegistry.call('arr_some', [[1, 2, 3, 4, 5], closure]);

      if (result === true) {
        console.log(`✅ [5/8] ${testName}`);
        console.log(`        Result: ${result}`);
        passCount++;
      } else {
        console.log(`❌ [5/8] ${testName}`);
        console.log(`        Expected: true`);
        console.log(`        Got: ${result}`);
        failCount++;
      }
    } catch (e) {
      console.log(`❌ [5/8] ${testName}`);
      console.log(`        Error: ${e instanceof Error ? e.message : String(e)}`);
      failCount++;
    }
  }

  // ========== TEST 6: arr_every with closure ==========
  {
    const testName = 'arr_every with closure: all > 0';
    try {
      const closure: any = {
        type: 'lambda',
        params: ['x'],
        body: {
          type: 'binary',
          operator: '>',
          left: { type: 'identifier', name: 'x' },
          right: { type: 'literal', value: 0 }
        },
        capturedVars: []
      };

      const vmRegistry = vm.getNativeFunctionRegistry();
      const result = vmRegistry.call('arr_every', [[1, 2, 3, 4, 5], closure]);

      if (result === true) {
        console.log(`✅ [6/8] ${testName}`);
        console.log(`        Result: ${result}`);
        passCount++;
      } else {
        console.log(`❌ [6/8] ${testName}`);
        console.log(`        Expected: true`);
        console.log(`        Got: ${result}`);
        failCount++;
      }
    } catch (e) {
      console.log(`❌ [6/8] ${testName}`);
      console.log(`        Error: ${e instanceof Error ? e.message : String(e)}`);
      failCount++;
    }
  }

  // ========== TEST 7: Nested map+reduce ==========
  {
    const testName = 'Nested: map(*2) then reduce(sum)';
    try {
      const mapClosure: any = {
        type: 'lambda',
        params: ['x'],
        body: {
          type: 'binary',
          operator: '*',
          left: { type: 'identifier', name: 'x' },
          right: { type: 'literal', value: 2 }
        },
        capturedVars: []
      };

      const reduceClosure: any = {
        type: 'lambda',
        params: ['acc', 'x'],
        body: {
          type: 'binary',
          operator: '+',
          left: { type: 'identifier', name: 'acc' },
          right: { type: 'identifier', name: 'x' }
        },
        capturedVars: []
      };

      const vmRegistry = vm.getNativeFunctionRegistry();
      const mapped = vmRegistry.call('arr_map', [[1, 2, 3, 4, 5], mapClosure]);
      const result = vmRegistry.call('arr_reduce', [mapped, reduceClosure, 0]);

      if (result === 30) {
        console.log(`✅ [7/8] ${testName}`);
        console.log(`        Result: ${result}`);
        passCount++;
      } else {
        console.log(`❌ [7/8] ${testName}`);
        console.log(`        Expected: 30`);
        console.log(`        Got: ${result}`);
        failCount++;
      }
    } catch (e) {
      console.log(`❌ [7/8] ${testName}`);
      console.log(`        Error: ${e instanceof Error ? e.message : String(e)}`);
      failCount++;
    }
  }

  // ========== TEST 8: callClosure method ==========
  {
    const testName = 'VM.callClosure method works';
    try {
      const closure: any = {
        type: 'lambda',
        params: ['a', 'b'],
        paramTypes: ['number', 'number'],
        body: {
          type: 'binary',
          operator: '+',
          left: { type: 'identifier', name: 'a' },
          right: { type: 'identifier', name: 'b' }
        },
        capturedVars: []
      };

      const result = vm.callClosure(closure, [3, 4]);

      if (result === 7) {
        console.log(`✅ [8/8] ${testName}`);
        console.log(`        Result: ${result}`);
        passCount++;
      } else {
        console.log(`❌ [8/8] ${testName}`);
        console.log(`        Expected: 7`);
        console.log(`        Got: ${result}`);
        failCount++;
      }
    } catch (e) {
      console.log(`❌ [8/8] ${testName}`);
      console.log(`        Error: ${e instanceof Error ? e.message : String(e)}`);
      failCount++;
    }
  }

  // ========== Summary ==========
  console.log('\n======================================================================');
  console.log(`  📊 Test Results: ${passCount} passed, ${failCount} failed\n`);

  if (failCount === 0) {
    console.log('  ✅ Phase 7-D Implementation Complete!');
    console.log('  All closure integration tests passed.\n');
  } else {
    console.log(`  ⚠️  ${failCount} test(s) failed. Please review.\n`);
  }

  console.log('======================================================================\n');

  process.exit(failCount > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error('Test execution error:', e);
  process.exit(1);
});
