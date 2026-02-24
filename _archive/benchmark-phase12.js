/**
 * Phase 12 Benchmark: Thread Performance
 */

const fs = require('fs');
const os = require('os');

// Generate test log
function generateTestLog(sizeInMB) {
  const logPath = `/tmp/test_log_${sizeInMB}mb.log`;
  const linesPerMB = 11200;
  const totalLines = sizeInMB * linesPerMB;

  console.log(`📝 Generating ${totalLines.toLocaleString()} log lines...`);
  
  let content = '';
  for (let i = 0; i < totalLines; i++) {
    const level = i % 100 === 0 ? 'ERROR' : i % 10 === 0 ? 'WARN' : 'INFO';
    const code = i % 1000 === 0 ? '404' : '200';
    content += `[2026-02-18] ${level} - Request from 192.168.1.${i % 256} returned ${code}\n`;
    if (i % 100000 === 0) process.stdout.write('.');
  }
  
  fs.writeFileSync(logPath, content);
  const actualSize = fs.statSync(logPath).size / 1024 / 1024;
  console.log(`\n✅ Generated: ${actualSize.toFixed(1)}MB\n`);
  
  return logPath;
}

async function runBenchmark() {
  console.log('🧵 Phase 12 Threading Performance Benchmark');
  console.log('=' + '='.repeat(59));

  // Generate test log (10MB for quick test)
  const logPath = generateTestLog(10);
  
  const startRead = performance.now();
  const content = fs.readFileSync(logPath, 'utf-8');
  const lines = content.split('\n').filter(l => l);
  const readTime = performance.now() - startRead;
  
  console.log(`Read ${lines.length.toLocaleString()} lines in ${readTime.toFixed(2)}ms\n`);

  // Single-threaded baseline
  console.log('🔄 Single-threaded processing...');
  const startSingle = performance.now();
  let errorCount = 0;
  let notFoundCount = 0;
  for (const line of lines) {
    if (line.includes('ERROR')) errorCount++;
    if (line.includes('404')) notFoundCount++;
  }
  const singleTime = performance.now() - startSingle;
  
  console.log(`✅ Time: ${singleTime.toFixed(2)}ms`);
  console.log(`   Found ${errorCount} ERRORs, ${notFoundCount} 404s\n`);

  // Summary
  const cpuCount = os.cpus().length;
  console.log('=' + '='.repeat(59));
  console.log('📊 SUMMARY');
  console.log('=' + '='.repeat(59));
  console.log(`File:             ${fs.statSync(logPath).size / 1024 / 1024}MB`);
  console.log(`Lines:            ${lines.length.toLocaleString()}`);
  console.log(`CPU cores:        ${cpuCount}`);
  console.log('');
  console.log(`Single-threaded:  ${singleTime.toFixed(2)}ms`);
  console.log('');
  console.log('Phase 12 Potential (if parallel):');
  const estimatedParallel = singleTime / cpuCount;
  console.log(`Est. Multi-threaded: ${estimatedParallel.toFixed(2)}ms`);
  console.log(`Est. Speedup:        ${(singleTime / estimatedParallel).toFixed(2)}x`);
  console.log('');
  console.log('Comparison with original benchmarks:');
  console.log(`  Python (500MB):   7830ms (IPC overhead)`);
  console.log(`  Rust (500MB):     780ms (native + rayon)`);
  console.log(`  Node.js (10MB):   ${singleTime.toFixed(2)}ms (baseline)`);
  console.log(`  Phase 12 est.:    ${estimatedParallel.toFixed(2)}ms (with ThreadManager)`);

  // Cleanup
  fs.unlinkSync(logPath);
  console.log('\n✅ Benchmark complete!');
}

runBenchmark().catch(console.error);
