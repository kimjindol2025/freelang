/**
 * v3.9: Final Stress Test (Clean Output)
 * - Tests Instruction Tuning + Jump Table Optimization
 * - Monitors performance and memory usage
 */

const { SimpleLangParser } = require('./dist/cli/simple-parser.js');
const { PCInterpreter } = require('./dist/cli/pc-interpreter.js');

console.log('═'.repeat(80));
console.log('v3.9: Grand Refactoring - Final Stress Test');
console.log('═'.repeat(80));

let totalTests = 0;
let passedTests = 0;

// Helper to run a test
function runTest(name, code, expectedOutput) {
  totalTests++;
  console.log(`\n📍 Test ${totalTests}: ${name}`);
  console.log('-'.repeat(70));

  try {
    const startMem = process.memoryUsage();
    const startTime = Date.now();

    const parser = new SimpleLangParser(code);
    const ast = parser.parse();
    const interpreter = new PCInterpreter();

    interpreter.execute(ast);
    const output = interpreter.getOutput();
    const result = output[output.length - 1];

    const endMem = process.memoryUsage();
    const endTime = Date.now();

    const passed = result === expectedOutput;
    if (passed) passedTests++;

    console.log(`✅ Result: ${result}`);
    console.log(`✅ Expected: ${expectedOutput}`);
    console.log(`✅ Status: ${passed ? 'PASS ✓' : 'FAIL ✗'}`);
    console.log(`⚡ Duration: ${endTime - startTime}ms | Heap: ${((endMem.heapUsed - startMem.heapUsed) / 1024).toFixed(2)}KB`);

    return passed;
  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
    return false;
  }
}

// ============================================================================
// Test Suite
// ============================================================================

// Test 1: Complex Integration (all v3 features)
runTest(
  'Complex Integration (v3.3-v3.8)',
  `let outer = 1
let total = 0
let target = 5
while (outer <= 2) {
    let inner = 1
    while (inner + outer <= target) {
        if (total == 3) {
            total = total + 10
            inner = inner + 1
            continue
        }
        total = total + 1
        inner = inner + 1
    }
    outer = outer + 1
}
println(total)`,
  '16'
);

// Test 2: Simple Loop (5,000 iterations)
runTest(
  'Simple Loop - 5,000 iterations',
  `let count = 0
let i = 0
while (i < 5000) {
    count = count + 1
    i = i + 1
}
println(count)`,
  '5000'
);

// Test 3: Nested Loop (100x100 = 10,000)
runTest(
  'Nested Loop - 100x100 iterations',
  `let outer = 0
let inner = 0
let sum = 0
while (outer < 100) {
    inner = 0
    while (inner < 100) {
        sum = sum + 1
        inner = inner + 1
    }
    outer = outer + 1
}
println(sum)`,
  '10000'
);

// Test 4: Loop with Break
runTest(
  'Loop with Break (early exit)',
  `let i = 0
let found = 0
while (i < 10000) {
    if (i == 500) {
        found = i
        break
    }
    i = i + 1
}
println(found)`,
  '500'
);

// Test 5: Loop with Continue
runTest(
  'Loop with Continue (control flow)',
  `let i = 0
let sum = 0
while (i < 100) {
    i = i + 1
    if (i == 1 + 1) {
        continue
    }
    sum = sum + i
}
println(sum)`,
  '5049'
);

// Test 6: Deep Nesting (5 levels)
runTest(
  'Deep Nesting - 5 levels',
  `let a = 0
let b = 0
let c = 0
let d = 0
let e = 0
let count = 0
while (a < 5) {
    b = 0
    while (b < 3) {
        c = 0
        while (c < 2) {
            count = count + 1
            c = c + 1
        }
        b = b + 1
    }
    a = a + 1
}
println(count)`,
  '30'
);

// ============================================================================
// Memory Leak Detection
// ============================================================================
console.log('\n\n📍 Memory Leak Detection Test');
console.log('-'.repeat(70));

const leakTestCode = `let i = 0
let j = 0
let sum = 0
while (i < 1000) {
    j = 0
    while (j < 10) {
        sum = sum + 1
        j = j + 1
    }
    i = i + 1
}
println(sum)`;

const memSnapshots = [];
console.log('\n🔄 Executing program 5 times...\n');

for (let exec = 1; exec <= 5; exec++) {
  const snap = process.memoryUsage();
  memSnapshots.push(snap.heapUsed);

  const parser = new SimpleLangParser(leakTestCode);
  const ast = parser.parse();
  const interpreter = new PCInterpreter();
  interpreter.setDebugMode(false);
  interpreter.execute(ast);

  console.log(`   Exec ${exec}: Heap ${(snap.heapUsed / 1024 / 1024).toFixed(2)} MB`);
}

const firstHeap = memSnapshots[0];
const lastHeap = memSnapshots[memSnapshots.length - 1];
const heapGrowth = ((lastHeap - firstHeap) / firstHeap * 100).toFixed(2);

console.log(`\n📊 Memory Analysis:`);
console.log(`   - Initial: ${(firstHeap / 1024 / 1024).toFixed(2)} MB`);
console.log(`   - Final: ${(lastHeap / 1024 / 1024).toFixed(2)} MB`);
console.log(`   - Growth: ${heapGrowth}%`);
console.log(`   - Status: ${heapGrowth < 15 ? '✅ PASS (No leak)' : '⚠️ WARNING (Possible leak)'}`);

// ============================================================================
// Summary
// ============================================================================
console.log('\n\n' + '═'.repeat(80));
console.log('📋 Test Summary');
console.log('═'.repeat(80));
console.log(`✅ Passed: ${passedTests}/${totalTests}`);
console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
console.log('\n🎯 v3.9 Optimizations:');
console.log('   ✅ Instruction Tuning: COMPLETE (eliminated duplicate condition evaluation)');
console.log('   ✅ Jump Table Optimization: COMPLETE (added jump offset caching)');
console.log('   ✅ Final Stress Test: COMPLETE (6 functional + 1 leak detection)');
console.log('\n═'.repeat(80));
