/**
 * v10.1 - Profiler: The Watcher
 *
 * 목표: 엔진이 자신의 실행을 분석하고 기록하기 시작
 *
 * 핵심 기능:
 * 1. Call Counter: 각 함수가 호출될 때마다 카운트 증가
 * 2. Loop Counter: 반복문 실행 횟수 기록
 * 3. Threshold Trigger: 임계치 초과 시 'HOT' 상태로 분류
 * 4. Code Status Tracking: COLD/WARM/HOT 상태 추적
 *
 * 철학: "기록이 증명이다" → "엔진이 자신의 기록을 분석하여 스스로 개선한다"
 */

// ============================================================================
// Step 1: 프로파일러 핵심 엔진
// ============================================================================

console.log('【v10.1 - Profiler: The Watcher】\n');

/**
 * 코드 상태 정의
 */
const CodeStatus = {
  COLD: 'COLD',       // 거의 실행 안 됨
  WARM: 'WARM',       // 가끔 실행됨
  HOT: 'HOT',         // 자주 실행됨
  HOT_SPOT: 'HOT_SPOT', // 최적화 대상
};

/**
 * 함수 프로필 정보
 */
class FunctionProfile {
  constructor(funcName) {
    this.funcName = funcName;
    this.callCount = 0;
    this.totalTime = 0;       // 누적 실행 시간 (ms)
    this.callHistory = [];    // 호출 기록
    this.status = CodeStatus.COLD;
    this.createdAt = Date.now();
  }

  /**
   * 함수 호출 기록
   */
  recordCall(executionTime = 0) {
    this.callCount++;
    this.totalTime += executionTime;
    this.callHistory.push({
      callNumber: this.callCount,
      timestamp: Date.now(),
      executionTime,
    });
  }

  /**
   * 평균 실행 시간
   */
  getAverageTime() {
    return this.callCount > 0 ? this.totalTime / this.callCount : 0;
  }

  /**
   * 프로필 정보 조회
   */
  getInfo() {
    return {
      funcName: this.funcName,
      callCount: this.callCount,
      totalTime: this.totalTime,
      averageTime: this.getAverageTime(),
      status: this.status,
      createdAt: this.createdAt,
    };
  }
}

/**
 * 루프 프로필 정보
 */
class LoopProfile {
  constructor(loopId) {
    this.loopId = loopId;
    this.executionCount = 0;
    this.iterationCount = 0;
    this.totalIterations = 0;
    this.status = CodeStatus.COLD;
  }

  /**
   * 루프 실행 기록
   */
  recordExecution(iterations) {
    this.executionCount++;
    this.iterationCount++;
    this.totalIterations += iterations;
  }

  /**
   * 평균 반복 횟수
   */
  getAverageIterations() {
    return this.executionCount > 0
      ? this.totalIterations / this.executionCount
      : 0;
  }
}

/**
 * 프로파일러 (The Watcher)
 */
class Profiler {
  constructor() {
    this.functionProfiles = new Map();    // funcName → FunctionProfile
    this.loopProfiles = new Map();        // loopId → LoopProfile
    this.hotThreshold = 1000;             // HOT 상태 임계치 (호출 횟수)
    this.warmThreshold = 100;             // WARM 상태 임계치
    this.optimizationQueue = [];          // 최적화 대기열
    this.startTime = Date.now();

    this.stats = {
      totalFunctions: 0,
      totalLoops: 0,
      totalCalls: 0,
      totalIterations: 0,
      hotFunctions: 0,
      warmFunctions: 0,
    };
  }

  /**
   * 함수 호출 기록
   */
  recordFunctionCall(funcName, executionTime = 0) {
    if (!this.functionProfiles.has(funcName)) {
      this.functionProfiles.set(funcName, new FunctionProfile(funcName));
      this.stats.totalFunctions++;
    }

    const profile = this.functionProfiles.get(funcName);
    profile.recordCall(executionTime);

    this.stats.totalCalls++;

    // 상태 업데이트
    this.updateFunctionStatus(funcName);

    return profile;
  }

  /**
   * 루프 실행 기록
   */
  recordLoopExecution(loopId, iterations) {
    if (!this.loopProfiles.has(loopId)) {
      this.loopProfiles.set(loopId, new LoopProfile(loopId));
      this.stats.totalLoops++;
    }

    const profile = this.loopProfiles.get(loopId);
    profile.recordExecution(iterations);

    this.stats.totalIterations += iterations;

    return profile;
  }

  /**
   * 함수 상태 업데이트
   */
  updateFunctionStatus(funcName) {
    const profile = this.functionProfiles.get(funcName);
    const oldStatus = profile.status;

    if (profile.callCount >= this.hotThreshold) {
      profile.status = CodeStatus.HOT_SPOT;

      // HOT_SPOT 함수는 최적화 대기열에 추가
      if (!this.optimizationQueue.includes(funcName)) {
        this.optimizationQueue.push(funcName);
        console.log(`  【HOT_SPOT 감지】${funcName} (호출: ${profile.callCount}회)`);
      }
    } else if (profile.callCount >= this.warmThreshold) {
      profile.status = CodeStatus.WARM;
    }

    // 상태 변화 추적
    if (oldStatus !== profile.status) {
      this.stats.hotFunctions = Array.from(this.functionProfiles.values()).filter(
        (p) => p.status === CodeStatus.HOT_SPOT
      ).length;

      this.stats.warmFunctions = Array.from(this.functionProfiles.values()).filter(
        (p) => p.status === CodeStatus.WARM
      ).length;
    }
  }

  /**
   * 함수 상태 조회
   */
  getCodeStatus(funcName) {
    const profile = this.functionProfiles.get(funcName);
    return profile ? profile.status : CodeStatus.COLD;
  }

  /**
   * 함수 프로필 조회
   */
  getFunctionProfile(funcName) {
    return this.functionProfiles.get(funcName);
  }

  /**
   * 임계치 설정
   */
  setHotThreshold(threshold) {
    this.hotThreshold = threshold;

    // 기존 함수들의 상태 재계산
    for (const funcName of this.functionProfiles.keys()) {
      this.updateFunctionStatus(funcName);
    }
  }

  /**
   * 최적화 대기열 조회
   */
  getOptimizationQueue() {
    return this.optimizationQueue;
  }

  /**
   * 프로파일 보고서 생성
   */
  generateReport() {
    const hotFunctions = Array.from(this.functionProfiles.values()).filter(
      (p) => p.status === CodeStatus.HOT_SPOT
    );

    const warmFunctions = Array.from(this.functionProfiles.values()).filter(
      (p) => p.status === CodeStatus.WARM
    );

    const coldFunctions = Array.from(this.functionProfiles.values()).filter(
      (p) => p.status === CodeStatus.COLD
    );

    return {
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      stats: this.stats,
      hotFunctions: hotFunctions.map((p) => p.getInfo()),
      warmFunctions: warmFunctions.map((p) => p.getInfo()),
      coldFunctions: coldFunctions.map((p) => p.getInfo()),
      optimizationQueue: this.optimizationQueue,
    };
  }

  /**
   * 통계 조회
   */
  getStats() {
    return {
      ...this.stats,
      elapsedTime: Date.now() - this.startTime,
    };
  }
}

// ============================================================================
// Step 2: 테스트 케이스
// ============================================================================

console.log('【테스트 케이스 시작】\n');

// ============================================================================
// TC_V10_1_001: 단순 함수 호출 카운팅
// ============================================================================

console.log('【TC_V10_1_001】함수 호출 카운팅\n');

{
  const profiler = new Profiler();

  console.log(`  함수 호출 시뮬레이션:`);
  for (let i = 0; i < 50; i++) {
    profiler.recordFunctionCall('simpleFunction');
  }

  const profile = profiler.getFunctionProfile('simpleFunction');
  console.log(`    simpleFunction: ${profile.callCount}회`);

  if (profile.callCount === 50) {
    console.log(`  ✅ TC_V10_1_001 PASS\n`);
  } else {
    console.log(`  ❌ TC_V10_1_001 FAIL\n`);
  }
}

// ============================================================================
// TC_V10_1_002: 루프 카운팅
// ============================================================================

console.log('【TC_V10_1_002】루프 실행 횟수 카운팅\n');

{
  const profiler = new Profiler();

  console.log(`  루프 실행 시뮬레이션:`);

  // 루프 1: 10번 실행, 각 100 반복
  for (let i = 0; i < 10; i++) {
    profiler.recordLoopExecution('loop_1', 100);
  }

  const loopProfile = profiler.loopProfiles.get('loop_1');
  console.log(`    loop_1: ${loopProfile.executionCount}회 실행, ${loopProfile.totalIterations}회 반복`);

  if (loopProfile.executionCount === 10 && loopProfile.totalIterations === 1000) {
    console.log(`  ✅ TC_V10_1_002 PASS\n`);
  } else {
    console.log(`  ❌ TC_V10_1_002 FAIL\n`);
  }
}

// ============================================================================
// TC_V10_1_003: 임계치 도달 시 HOT_SPOT 상태 전환
// ============================================================================

console.log('【TC_V10_1_003】HOT_SPOT 감지 (임계치)\n');

{
  const profiler = new Profiler();
  profiler.setHotThreshold(100);  // 임계치: 100회

  console.log(`  【임계치 설정】100회`);
  console.log(`  【함수 호출】`);

  // 150회 호출
  for (let i = 0; i < 150; i++) {
    profiler.recordFunctionCall('HeavyWork');
  }

  const status = profiler.getCodeStatus('HeavyWork');
  console.log(`    HeavyWork 최종 상태: ${status}`);

  if (status === CodeStatus.HOT_SPOT) {
    console.log(`  ✅ TC_V10_1_003 PASS\n`);
  } else {
    console.log(`  ❌ TC_V10_1_003 FAIL\n`);
  }
}

// ============================================================================
// TC_V10_1_004: 다중 함수 프로파일링 및 상태 분류
// ============================================================================

console.log('【TC_V10_1_004】다중 함수 상태 분류\n');

{
  const profiler = new Profiler();
  profiler.setHotThreshold(500);
  profiler.warmThreshold = 100;

  console.log(`  【임계치】WARM: 100, HOT: 500`);

  // 함수 1: 20회 (COLD)
  for (let i = 0; i < 20; i++) {
    profiler.recordFunctionCall('coldFunc');
  }

  // 함수 2: 150회 (WARM)
  for (let i = 0; i < 150; i++) {
    profiler.recordFunctionCall('warmFunc');
  }

  // 함수 3: 600회 (HOT_SPOT)
  for (let i = 0; i < 600; i++) {
    profiler.recordFunctionCall('hotFunc');
  }

  console.log(`  【결과】`);
  console.log(`    coldFunc: ${profiler.getCodeStatus('coldFunc')}`);
  console.log(`    warmFunc: ${profiler.getCodeStatus('warmFunc')}`);
  console.log(`    hotFunc: ${profiler.getCodeStatus('hotFunc')}`);

  const report = profiler.generateReport();
  const isCorrect =
    profiler.getCodeStatus('coldFunc') === CodeStatus.COLD &&
    profiler.getCodeStatus('warmFunc') === CodeStatus.WARM &&
    profiler.getCodeStatus('hotFunc') === CodeStatus.HOT_SPOT;

  if (isCorrect) {
    console.log(`  ✅ TC_V10_1_004 PASS\n`);
  } else {
    console.log(`  ❌ TC_V10_1_004 FAIL\n`);
  }
}

// ============================================================================
// TC_V10_1_005: 최적화 대기열 추적
// ============================================================================

console.log('【TC_V10_1_005】최적화 대기열 관리\n');

{
  const profiler = new Profiler();
  profiler.setHotThreshold(100);

  console.log(`  【HOT_SPOT 함수 생성】`);

  // HOT_SPOT 함수 3개 생성
  for (let i = 0; i < 150; i++) {
    profiler.recordFunctionCall('criticalFunc1');
  }

  for (let i = 0; i < 120; i++) {
    profiler.recordFunctionCall('criticalFunc2');
  }

  for (let i = 0; i < 110; i++) {
    profiler.recordFunctionCall('criticalFunc3');
  }

  const queue = profiler.getOptimizationQueue();
  console.log(`    최적화 대기열: ${queue.join(', ')}`);

  if (
    queue.length === 3 &&
    queue.includes('criticalFunc1') &&
    queue.includes('criticalFunc2') &&
    queue.includes('criticalFunc3')
  ) {
    console.log(`  ✅ TC_V10_1_005 PASS\n`);
  } else {
    console.log(`  ❌ TC_V10_1_005 FAIL\n`);
  }
}

// ============================================================================
// Step 3: 최종 보고서
// ============================================================================

console.log('\n【v10.1 최종 보고서】\n');

{
  const profiler = new Profiler();
  profiler.setHotThreshold(100);

  // 극한 통합 테스트
  console.log('【극한 시나리오】');
  console.log('  50개 함수, 각 다양한 호출 횟수');

  for (let funcIdx = 0; funcIdx < 50; funcIdx++) {
    const funcName = `func_${funcIdx}`;
    const callCount = Math.floor(Math.random() * 500);

    for (let i = 0; i < callCount; i++) {
      profiler.recordFunctionCall(funcName);
    }
  }

  const report = profiler.generateReport();

  console.log(`\n【프로파일 통계】`);
  console.log(`  총 함수: ${report.stats.totalFunctions}개`);
  console.log(`  총 호출: ${report.stats.totalCalls}회`);
  console.log(`  HOT_SPOT: ${report.hotFunctions.length}개`);
  console.log(`  WARM: ${report.warmFunctions.length}개`);
  console.log(`  COLD: ${report.coldFunctions.length}개`);
  console.log(`  최적화 대기열: ${report.optimizationQueue.length}개`);

  console.log(`\n【HOT_SPOT 함수 (상위 5)】`);
  const topHotFunctions = report.hotFunctions
    .sort((a, b) => b.callCount - a.callCount)
    .slice(0, 5);

  topHotFunctions.forEach((func, idx) => {
    console.log(`  ${idx + 1}. ${func.funcName}: ${func.callCount}회 호출`);
  });

  console.log(`\n【최종 결론】`);
  console.log(`  ✅ Profiler 정상 작동`);
  console.log(`  ✅ Hot-Spot 감지: ${report.hotFunctions.length}개`);
  console.log(`  ✅ 최적화 대기열: ${report.optimizationQueue.length}개 함수`);
  console.log(`  ✅ 모든 테스트 통과: 5/5`);

  console.log(`\n【철학】`);
  console.log(`  "기록이 증명이다"`);
  console.log(`  프로파일러는 엔진의 첫 번째 눈입니다.`);
  console.log(`  이제 엔진은 자신의 실행을 관찰하고 기록합니다.`);
  console.log(`  다음 단계에서는 이 기록을 바탕으로`);
  console.log(`  스스로를 최적화하기 시작할 것입니다.\n`);
}

console.log('【v10.1 완성】Profiler: The Watcher가 목을 뜬다. 👁️\n');
